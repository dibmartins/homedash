/**
 * Painel da Família — Google Apps Script
 *
 * Lê Google Agenda, o cardápio de uma planilha e fotos (álbum compartilhado do
 * Google Fotos ou pasta do Drive) e devolve JSON para o painel. Veja o README.
 */

// Troque por uma sequência aleatória. O painel envia o mesmo valor em ?token=
const TOKEN = 'troque-este-segredo';

// ID da planilha "Painel da Família" (o trecho entre /d/ e /edit na URL).
// Só a aba "Cardápio" é usada (colunas Dia | Almoço | Jantar). Vazio = sem cardápio.
const SHEET_ID = '';

// Um perfil por painel. Use ?pessoa=<chave> na URL do painel.
//  calendars: IDs das agendas (Configurações da agenda > "Integrar agenda" > ID).
//             As agendas das outras pessoas precisam estar compartilhadas com a conta
//             que roda este script. 'primary' = sua agenda principal.
//  colors:    cor opcional por agenda (senão usa a cor do Google Agenda).
//  menu:      mostrar o cardápio da planilha.
//  photos: { album: 'link do álbum compartilhado do Google Fotos' } ou { folder: 'ID da pasta no Drive' }.
//          Vídeos do álbum tocam sozinhos, sem som, no fundo da tela.
//  spotify: mostrar o card "Tocando agora" (veja a seção Spotify no README).
//  news:    sites para a barra de notícias do rodapé, ex.: ['g1.globo.com', { site: 'https://site.com/feed/', name: 'Site' }].
//           Vazio = sem barra. As manchetes dos sites aparecem misturadas, em ordem aleatória.
//  lixo:    lembrete de colocar o lixo para fora, ex.: { dias: ['segunda', 'sexta'], hora: '07:30' }.
//           Aparece na véspera a partir das 17h (mude com vespera: '18:00') e some 30 min depois da
//           hora da coleta (mude com ate: '08:30'). Sem "lixo", o lembrete não aparece.
// Troque as chaves e os nomes pelos da sua casa na SUA cópia do script (não no repositório).
const PROFILES = {
  familia: {
    name: '',
    calendars: ['primary'],
    menu: true,
    photos: { album: '' },
    news: [],
    spotify: true,
  },
  pessoa1: {
    name: 'Pessoa 1',
    calendars: ['primary'],
    menu: true,
    photos: { album: '' },
    news: [],
    spotify: true,
  },
  pessoa2: {
    name: 'Pessoa 2',
    calendars: [/* 'email-da-pessoa2@gmail.com' */],
    menu: true,
    photos: { album: '' },
    news: [],
  },
  pessoa3: {
    name: 'Pessoa 3',
    calendars: [/* 'email-da-pessoa3@gmail.com' */],
    menu: true,
    photos: { album: '' },
    news: [],
  },
};

const CACHE_SECONDS = 120;

// Evangelho do dia (liturgia diária), de um serviço gratuito (github.com/Dancrf/liturgia-diaria).
// Aparece num card que reveza com a agenda e o cardápio. Vazio = sem o evangelho.
const GOSPEL_API = 'https://liturgia.up.railway.app/v2/';

// Filmes em cartaz de um cinema, com horários, gênero, duração, classificação e cartaz, lidos do AdoroCinema.
// code: o trecho do endereço da programação do cinema no AdoroCinema, ex.:
//       adorocinema.com/programacao/cinema-X0000/  ->  code: 'X0000'.  Vazio = sem filmes.
// name: texto ao lado de "Em cartaz", ex.: 'No Cinema do Centro'.
// A tela de filmes aparece no lugar de uma foto de vez em quando. Para desligar num perfil, use cinema: false nele.
const CINEMA = { code: '', name: '' };

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (TOKEN === 'troque-este-segredo' || TOKEN.length < 24) return json_({ error: 'defina um TOKEN longo no script' });

  // retorno da autorização do Spotify (vem do Spotify, sem o token do painel; protegido pelo "state")
  if (p.code && p.state) return spotifyCallback_(p);

  if (p.token !== TOKEN) return json_({ error: 'token inválido' });

  if (p.spotify === 'login') return spotifyLoginPage_();
  if (p.spotify === 'now') return json_({ spotify: spotifyNowPlaying_() });

  if (p.foto) {
    // só entrega fotos das pastas configuradas, nunca outros arquivos do Drive
    if (!allowedPhotoIds_()[p.foto]) return json_({ error: 'foto não permitida' });
    return json_({ dataUrl: drivePhotoDataUrl_(p.foto, p.w) });
  }

  const key = String(p.pessoa || 'familia').toLowerCase();
  const profile = PROFILES[key];
  if (!profile) return json_({ error: 'perfil desconhecido: ' + key });

  const days = Math.min(Math.max(parseInt(p.days, 10) || 5, 1), 14);
  const cache = CacheService.getScriptCache();
  const cacheKey = 'painel-' + key + '-' + days;
  const cached = cache.get(cacheKey);
  if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);

  // Cada parte é lida separadamente: se uma falhar, as outras continuam aparecendo
  // e o motivo vai em "warnings" (visível no rodapé do painel).
  const warnings = [];
  const safe = (label, fn, fallback) => {
    try { return fn(); } catch (err) { warnings.push(label + ': ' + err.message); return fallback; }
  };
  const sheet = SHEET_ID && profile.menu ? safe('planilha', () => SpreadsheetApp.openById(SHEET_ID), null) : null;
  const body = JSON.stringify({
    name: profile.name,
    events: safe('agenda', () => getEvents_(profile, days), []),
    menu: profile.menu ? safe('cardápio', () => getMenu_(sheet), []) : null,
    photos: safe('fotos', () => getPhotos_(profile.photos || {}), []),
    spotify: !!(profile.spotify && spotifyConfigured_()),
    news: (profile.news && profile.news.length) ? safe('notícias', () => getNews_(profile.news), []) : [],
    trash: profile.lixo || null,
    gospel: GOSPEL_API ? safe('evangelho', getGospel_, null) : null,
    cinema: CINEMA.code && profile.cinema !== false ? safe('cinema', getCinema_, null) : null,
    warnings: warnings,
    updated: new Date().toISOString(),
  });
  try { cache.put(cacheKey, body, CACHE_SECONDS); } catch (err) { /* resposta grande demais para o cache */ }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ---------------- Evangelho do dia ----------------
// Busca uma vez e guarda por 6 horas. "date" deixa o painel esconder o card se o dia virar.
function getGospel_() {
  const tz = Session.getScriptTimeZone(), now = new Date();
  const fmt = p => Utilities.formatDate(now, tz, p);
  const key = 'evangelho-' + fmt('yyyyMMdd');
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const url = GOSPEL_API + '?dia=' + fmt('dd') + '&mes=' + fmt('MM') + '&ano=' + fmt('yyyy');
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() === 404) return null; // sem liturgia para hoje
  if (res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
  const j = JSON.parse(res.getContentText());
  const ev = j.leituras && j.leituras.evangelho && j.leituras.evangelho[0];
  if (!ev || !ev.texto) return null;
  const out = { ref: ev.referencia || '', day: j.liturgia || '', text: cleanGospel_(ev.texto), date: fmt('yyyy-MM-dd') };
  try { cache.put(key, JSON.stringify(out), 6 * 3600); } catch (err) {}
  return out;
}

// Tira os números dos versículos, que vêm grudados no texto ("disse: 1“O Reino...").
function cleanGospel_(t) {
  return String(t).replace(/(^|[\s“"‘'(—–-])\d{1,3}(?=[^\s\d.,;:)])/g, '$1').replace(/\s+/g, ' ').trim();
}

// Execute esta função no editor para conferir o evangelho de hoje (Ver > Registros).
function testeEvangelho() {
  CacheService.getScriptCache().remove('evangelho-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd'));
  Logger.log(JSON.stringify(getGospel_(), null, 2));
}

// ---------------- Cinema: filmes em cartaz ----------------
// Busca a programação de hoje e de amanhã (para a noite, depois da última sessão) e guarda por 3 horas.
function getCinema_() {
  const tz = Session.getScriptTimeZone(), now = new Date();
  const key = cinemaKey_();
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const movies = {}, order = [];
  [0, 1].forEach(off => {
    const day = Utilities.formatDate(new Date(now.getTime() + off * 86400000), tz, 'yyyy-MM-dd');
    cinemaDay_(day, off === 0).forEach(r => cinemaAdd_(movies, order, r));
  });
  order.forEach(id => delete movies[id].brazilian);
  const out = { name: CINEMA.name || '', movies: order.map(id => movies[id]) };
  try { cache.put(key, JSON.stringify(out), out.movies.length ? 3 * 3600 : 600); } catch (err) {}
  return out;
}

// muda a cada 3 horas, para os horários do dia não ficarem velhos
function cinemaKey_() {
  const tz = Session.getScriptTimeZone(), now = new Date();
  return 'cinema-' + CINEMA.code + '-' + Utilities.formatDate(now, tz, 'yyyyMMdd') + '-' + Math.floor(+Utilities.formatDate(now, tz, 'H') / 3);
}

// Uma página de programação por dia (às vezes mais de uma, quando há muitos filmes).
function cinemaDay_(day, strict) {
  const base = 'https://www.adorocinema.com/_/showtimes/theater-' + encodeURIComponent(CINEMA.code) + '/d-' + day + '/';
  const opts = { muteHttpExceptions: true, followRedirects: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (painel)', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } };
  let results = [], page = 1, pages = 1;
  do {
    const res = UrlFetchApp.fetch(base + (page > 1 ? 'p-' + page + '/' : ''), opts);
    const code = res.getResponseCode();
    if (code !== 200) { if (strict && page === 1) throw new Error('programação HTTP ' + code); break; }
    let j;
    try { j = JSON.parse(res.getContentText()); } catch (err) { if (strict && page === 1) throw new Error('programação em formato inesperado'); break; }
    results = results.concat(j.results || []);
    pages = (j.pagination && (j.pagination.totalPages || j.pagination.pages)) || 1;
  } while (++page <= pages && page <= 5);
  return results;
}

function cinemaAdd_(movies, order, r) {
  const mv = r.movie || r.film || {};
  const title = mv.title || mv.originalTitle;
  if (!title) return;
  const id = String(mv.internalId || mv.id || title);
  let m = movies[id];
  if (!m) {
    const countries = JSON.stringify(mv.countries || mv.nationalities || mv.nationality || '');
    m = movies[id] = {
      title: title,
      genres: (mv.genres || []).map(g => typeof g === 'string' ? g : (g.translate || g.name || g.tag || '')).filter(String),
      runtime: cinemaRuntime_(mv.runtime),
      rating: cinemaRating_(JSON.stringify(r)),
      poster: cinemaPoster_(mv.poster),
      synopsis: decodeHtml_(String(mv.synopsisFull || mv.synopsis || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim().slice(0, 400),
      brazilian: /Brasil|Brazil|"BR"/i.test(countries),
      sessions: [],
    };
    order.push(id);
  }
  const st = r.showtimes || {};
  Object.keys(st).forEach(k => (Array.isArray(st[k]) ? st[k] : []).forEach(s => {
    const at = String(s.startsAt || s.startDate || '').slice(0, 16);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(at)) return;
    const ver = String(s.diffusionVersion || k).toUpperCase();
    const v = /DUB/.test(ver) ? 'DUB' : (m.brazilian || /LOCAL/.test(ver) ? 'NAC' : 'LEG');
    const f = /3D/i.test(JSON.stringify(s.projection || s.format || '') + ' ' + JSON.stringify(s.experience || '')) ? '3D' : '';
    if (!m.sessions.some(x => x.at === at + ':00' && x.v === v)) m.sessions.push({ at: at + ':00', v: v, f: f });
  }));
}

// "1h 45min", "105 min", 6300 (segundos) ou 105 (minutos) -> 105
function cinemaRuntime_(rt) {
  if (rt == null || rt === '') return 0;
  if (typeof rt === 'number') return rt > 400 ? Math.round(rt / 60) : rt;
  const s = String(rt), h = s.match(/(\d+)\s*h/i), m = s.match(/(\d+)\s*min/i);
  if (h || m) return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : (n > 400 ? Math.round(n / 60) : n);
}

// classificação indicativa: "Não recomendado para menores de 12 anos" -> '12'; "Livre" -> 'L'
function cinemaRating_(text) {
  const m = text.match(/menores de (\d{1,2}) anos/i);
  if (m) return m[1];
  if (/livre para todos|"livre"|classifica[çc][ãa]o livre/i.test(text)) return 'L';
  return '';
}

// pede o cartaz num tamanho bom para TV (o original pode ser enorme)
function cinemaPoster_(p) {
  const url = p && (p.url || p.href) || (typeof p === 'string' ? p : '');
  if (!url) return '';
  return url.replace(/^\/\//, 'https://').replace(/(acsta\.net\/)(?:[a-z]_\d+_\d+\/)?/, '$1c_310_420/');
}

// Execute no editor para conferir os filmes de hoje e de amanhã (Ver > Registros).
function testeCinema() {
  if (!CINEMA.code) return Logger.log('preencha CINEMA.code no começo do script');
  const tz = Session.getScriptTimeZone(), day = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const url = 'https://www.adorocinema.com/_/showtimes/theater-' + CINEMA.code + '/d-' + day + '/';
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (painel)', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
  Logger.log('HTTP ' + res.getResponseCode() + ' · início da resposta: ' + res.getContentText().slice(0, 1500));
  CacheService.getScriptCache().remove(cinemaKey_());
  const c = getCinema_();
  Logger.log(c.movies.length + ' filmes');
  c.movies.forEach(m => Logger.log(m.title + ' | ' + m.genres.join(', ') + ' | ' + m.runtime + ' min | ' + (m.rating || '?') +
    ' | ' + m.sessions.map(s => s.at.slice(5, 16).replace('T', ' ') + ' ' + s.v + (s.f ? ' ' + s.f : '')).join(', ') + ' | ' + (m.poster ? 'com cartaz' : 'sem cartaz')));
}

// ---------------- Agenda ----------------
function getEvents_(profile, days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const out = [];
  (profile.calendars || []).forEach(id => {
    const cal = id === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id);
    if (!cal) return;
    const color = (profile.colors && profile.colors[id]) || cal.getColor();
    cal.getEvents(start, end).forEach(ev => {
      try { if (ev.getMyStatus() === CalendarApp.GuestStatus.NO) return; } catch (err) {}
      const allDay = ev.isAllDayEvent();
      // eventos marcados como "Particular" no Google Agenda aparecem só como "Ocupado"
      let isPrivate = false;
      try { isPrivate = ev.getVisibility() === CalendarApp.Visibility.PRIVATE; } catch (err) {}
      out.push({
        title: isPrivate ? 'Ocupado' : (ev.getTitle() || '(sem título)'),
        start: (allDay ? ev.getAllDayStartDate() : ev.getStartTime()).toISOString(),
        end: (allDay ? ev.getAllDayEndDate() : ev.getEndTime()).toISOString(),
        allDay: allDay,
        color: color,
      });
    });
  });
  // remove duplicados (mesmo evento em duas agendas)
  const seen = {};
  return out
    .filter(e => { const k = e.title + e.start; if (seen[k]) return false; seen[k] = true; return true; })
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

// ---------------- Cardápio (planilha) ----------------
function getMenu_(sheet) {
  if (!sheet) return [];
  const WD = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, 'sáb': 6 };
  // colunas: Dia (seg, ter, ... ) | Almoço | Jantar
  return rows_(sheet, 'Cardápio').map(r => {
    const k = String(r[0] || '').trim().toLowerCase().slice(0, 3);
    return { weekday: WD[k], almoco: String(r[1] || ''), jantar: String(r[2] || '') };
  }).filter(m => m.weekday !== undefined);
}

// ---------------- Fotos ----------------
function getPhotos_(cfg) {
  const cache = CacheService.getScriptCache();
  if (cfg.album) {
    const ck = 'album-v3-' + Utilities.base64Encode(cfg.album).slice(0, 200);
    const hit = cache.get(ck);
    if (hit) return JSON.parse(hit);
    // Lê o álbum compartilhado (link "photos.app.goo.gl/..."). Não é uma API oficial:
    // se o Google mudar a página, use uma pasta do Drive.
    const html = UrlFetchApp.fetch(cfg.album, { followRedirects: true, muteHttpExceptions: true }).getContentText();
    const items = albumItems_(html);
    const videos = videoSet_(items.map(it => it.url));
    // o painel troca o sufixo pelo tamanho real da tela; vídeos usam "=dv" (o arquivo do vídeo).
    // w/h dizem se a foto é em pé (o painel junta duas fotos em pé); t é a data, quando o álbum informa.
    const out = items.map(it => {
      const o = { url: it.url + '=w1920-h1080', w: it.w, h: it.h };
      if (it.t) o.t = it.t;
      if (videos[it.url]) o.video = it.url + '=dv';
      return o;
    });
    try { cache.put(ck, JSON.stringify(out), 6 * 3600); } catch (err) {}
    return out;
  }
  if (cfg.folder) {
    const out = [];
    const files = DriveApp.getFolderById(cfg.folder).getFiles();
    while (files.hasNext() && out.length < 300) {
      const f = files.next();
      if (/^image\//.test(f.getMimeType())) out.push({ id: f.getId() });
    }
    return out;
  }
  return [];
}

// Itens do álbum compartilhado: endereço, largura, altura e, se aparecer logo depois, a data (ms).
function albumItems_(html) {
  const re = /\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[^"]+)",\s*(\d+),\s*(\d+)/g;
  const dateRe = /^(?:[^\[\]]|\[[^\[\]]*\])*\]\s*,\s*"?(1\d{12})\b/;
  const seen = {}, out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    if (seen[m[1]]) continue;
    seen[m[1]] = true;
    const it = { url: m[1], w: +m[2], h: +m[3] };
    const d = dateRe.exec(html.substr(re.lastIndex, 600));
    if (d) it.t = +d[1];
    out.push(it);
  }
  return out;
}

function allowedPhotoIds_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('fotos-permitidas');
  if (hit) return JSON.parse(hit);
  const ids = {};
  Object.keys(PROFILES).forEach(k => {
    const cfg = PROFILES[k].photos || {};
    if (cfg.folder) getPhotos_({ folder: cfg.folder }).forEach(f => { ids[f.id] = true; });
  });
  try { cache.put('fotos-permitidas', JSON.stringify(ids), 600); } catch (err) {}
  return ids;
}

// Foto do Drive reduzida para a TV, devolvida como data URL (a pasta pode continuar privada).
function drivePhotoDataUrl_(id, w) {
  const width = Math.min(Math.max(parseInt(w, 10) || 1920, 640), 3840);
  const cache = CacheService.getScriptCache();
  const hit = cache.get('foto-' + width + '-' + id);
  if (hit) return hit;
  const url = 'https://drive.google.com/thumbnail?sz=w' + width + '&id=' + encodeURIComponent(id);
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  const blob = res.getBlob();
  const dataUrl = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  try { cache.put('foto-' + width + '-' + id, dataUrl, 6 * 3600); } catch (err) { /* maior que 100 KB */ }
  return dataUrl;
}

// Vídeos do álbum aparecem na página como uma imagem (o primeiro quadro). Para saber
// quais são vídeos, pede o sufixo "=dv" (download do vídeo): para vídeos o Google
// responde com video/*; para fotos, não. Só o primeiro byte é baixado.
function videoSet_(urls) {
  const videos = {};
  for (let i = 0; i < urls.length; i += 50) {
    const chunk = urls.slice(i, i + 50);
    let responses;
    try {
      responses = UrlFetchApp.fetchAll(chunk.map(u => ({
        url: u + '=dv', headers: { Range: 'bytes=0-0' }, followRedirects: true, muteHttpExceptions: true,
      })));
    } catch (err) {
      return videos; // se a verificação falhar, trata tudo como foto
    }
    responses.forEach((r, j) => {
      const type = String(r.getHeaders()['Content-Type'] || r.getHeaders()['content-type'] || '');
      const isVideo = r.getResponseCode() < 400 && /^video\//i.test(type);
      if (isVideo) videos[chunk[j]] = true;
    });
  }
  return videos;
}

// ---------------- Spotify ("Tocando agora") ----------------
// Em Configurações do projeto > Propriedades do script, crie SPOTIFY_CLIENT_ID e
// SPOTIFY_CLIENT_SECRET. O SPOTIFY_REFRESH_TOKEN é gravado sozinho ao autorizar.
const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state';

function spotifyProps_() { return PropertiesService.getScriptProperties(); }
function spotifyConfigured_() {
  const pr = spotifyProps_();
  return !!(pr.getProperty('SPOTIFY_CLIENT_ID') && pr.getProperty('SPOTIFY_CLIENT_SECRET') && pr.getProperty('SPOTIFY_REFRESH_TOKEN'));
}
function spotifyRedirectUri_() { return ScriptApp.getService().getUrl(); }

function spotifyLoginPage_() {
  const pr = spotifyProps_();
  const clientId = pr.getProperty('SPOTIFY_CLIENT_ID');
  if (!clientId || !pr.getProperty('SPOTIFY_CLIENT_SECRET')) {
    return HtmlService.createHtmlOutput('<p>Crie as propriedades SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no script antes de autorizar.</p>');
  }
  const state = Utilities.getUuid();
  CacheService.getScriptCache().put('spotify-state-' + state, '1', 600);
  const url = 'https://accounts.spotify.com/authorize?response_type=code' +
    '&client_id=' + encodeURIComponent(clientId) +
    '&scope=' + encodeURIComponent(SPOTIFY_SCOPES) +
    '&redirect_uri=' + encodeURIComponent(spotifyRedirectUri_()) +
    '&state=' + encodeURIComponent(state);
  return HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;max-width:640px">' +
    '<h2>Conectar o Spotify ao painel</h2>' +
    '<p>No painel de desenvolvedores do Spotify, a Redirect URI do app precisa ser exatamente:</p>' +
    '<p><code style="word-break:break-all">' + spotifyRedirectUri_() + '</code></p>' +
    '<p><a href="' + url + '" target="_top" style="font-size:18px">Autorizar o Spotify</a> (o link vale por 10 minutos)</p>' +
    '</div>');
}

function spotifyCallback_(p) {
  const cache = CacheService.getScriptCache();
  if (!cache.get('spotify-state-' + p.state)) return HtmlService.createHtmlOutput('<p>Link expirado. Abra a página de autorização de novo.</p>');
  cache.remove('spotify-state-' + p.state);
  const res = spotifyTokenRequest_({ grant_type: 'authorization_code', code: p.code, redirect_uri: spotifyRedirectUri_() });
  if (!res.refresh_token) return HtmlService.createHtmlOutput('<p>O Spotify não autorizou: ' + (res.error_description || res.error || 'erro desconhecido') + '</p>');
  spotifyProps_().setProperty('SPOTIFY_REFRESH_TOKEN', res.refresh_token);
  cache.put('spotify-access', res.access_token, Math.max(60, (res.expires_in || 3600) - 300));
  return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;font-size:18px">Spotify conectado. Pode fechar esta página.</p>');
}

function spotifyTokenRequest_(payload) {
  const pr = spotifyProps_();
  const basic = Utilities.base64Encode(pr.getProperty('SPOTIFY_CLIENT_ID') + ':' + pr.getProperty('SPOTIFY_CLIENT_SECRET'));
  const r = UrlFetchApp.fetch('https://accounts.spotify.com/api/token', {
    method: 'post', payload: payload, headers: { Authorization: 'Basic ' + basic }, muteHttpExceptions: true,
  });
  try { return JSON.parse(r.getContentText()); } catch (err) { return { error: 'resposta inválida (' + r.getResponseCode() + ')' }; }
}

function spotifyAccessToken_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('spotify-access');
  if (hit) return hit;
  const refresh = spotifyProps_().getProperty('SPOTIFY_REFRESH_TOKEN');
  if (!refresh) return null;
  const res = spotifyTokenRequest_({ grant_type: 'refresh_token', refresh_token: refresh });
  if (!res.access_token) return null;
  if (res.refresh_token) spotifyProps_().setProperty('SPOTIFY_REFRESH_TOKEN', res.refresh_token);
  cache.put('spotify-access', res.access_token, Math.max(60, (res.expires_in || 3600) - 300));
  return res.access_token;
}

// O que está tocando agora (ou null). Guardado 10 s no cache para as TVs dividirem a consulta.
function spotifyNowPlaying_() {
  if (!spotifyConfigured_()) return null;
  const cache = CacheService.getScriptCache();
  const hit = cache.get('spotify-now');
  if (hit) return JSON.parse(hit);
  const token = spotifyAccessToken_();
  if (!token) return null;
  const r = UrlFetchApp.fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode', {
    headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
  });
  let now = null;
  if (r.getResponseCode() === 200) {
    const d = JSON.parse(r.getContentText());
    const it = d.item;
    if (it) {
      const images = (it.album && it.album.images) || (it.show && it.show.images) || it.images || [];
      now = {
        playing: !!d.is_playing,
        title: it.name,
        artist: it.artists ? it.artists.map(a => a.name).join(', ') : (it.show ? it.show.name : ''),
        album: it.album ? it.album.name : '',
        image: images.length ? images[0].url : null,
        progressMs: d.progress_ms || 0,
        durationMs: it.duration_ms || 0,
        fetchedAt: Date.now(),
      };
    }
  } else if (r.getResponseCode() === 401) {
    cache.remove('spotify-access');
  }
  cache.put('spotify-now', JSON.stringify(now), 10);
  return now;
}

// ---------------- Notícias (barra do rodapé) ----------------
// Para cada site: usa o feed RSS/Atom que o próprio site anuncia; se não achar,
// busca as manchetes do site no Google Notícias. Guardado 30 minutos no cache.
function getNews_(sites) {
  const cache = CacheService.getScriptCache();
  const out = [];
  sites.forEach(s => {
    const cfg = typeof s === 'string' ? { site: s } : s;
    if (!cfg || !cfg.site) return;
    const ck = 'news-' + Utilities.base64Encode(cfg.site).slice(0, 200);
    let titles;
    const hit = cache.get(ck);
    if (hit) titles = JSON.parse(hit);
    else {
      try { titles = newsTitles_(cfg.site); } catch (err) { titles = []; }
      try { cache.put(ck, JSON.stringify(titles), titles.length ? 1800 : 300); } catch (err) {}
    }
    const name = cfg.name || newsSourceName_(cfg.site);
    titles.slice(0, cfg.max || 15).forEach(t => out.push({ title: t, source: name }));
  });
  return out;
}

function newsTitles_(site) {
  const url = /^https?:\/\//i.test(site) ? site : 'https://' + site;
  const opts = { followRedirects: true, muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (painel)' } };
  const body = UrlFetchApp.fetch(url, opts).getContentText();
  let titles = [];
  if (/<(rss|feed|rdf:RDF)[\s>]/i.test(body.slice(0, 2000))) {
    titles = feedTitles_(body);
  } else {
    // feed anunciado na página: <link rel="alternate" type="application/rss+xml" href="...">
    const links = body.match(/<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]*>/gi) || [];
    for (let i = 0; i < links.length && !titles.length; i++) {
      const href = (links[i].match(/href=["']([^"']+)["']/i) || [])[1];
      if (!href) continue;
      const feedUrl = /^https?:/i.test(href) ? href : (href.indexOf('//') === 0 ? 'https:' + href : url.replace(/^(https?:\/\/[^\/]+).*$/i, '$1') + (href[0] === '/' ? '' : '/') + href);
      try { titles = feedTitles_(UrlFetchApp.fetch(decodeHtml_(feedUrl), opts).getContentText()); } catch (err) {}
    }
  }
  if (!titles.length) {
    const host = url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const gn = 'https://news.google.com/rss/search?q=' + encodeURIComponent('site:' + host + ' when:2d') + '&hl=pt-BR&gl=BR&ceid=BR:pt-419';
    // o Google Notícias termina cada título com " - Nome do site"
    titles = feedTitles_(UrlFetchApp.fetch(gn, opts).getContentText()).map(t => t.replace(/\s+-\s+[^-]+$/, ''));
  }
  const seen = {};
  return titles.filter(t => t && !seen[t] && (seen[t] = true));
}

function feedTitles_(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) || [];
  return blocks.map(b => {
    const m = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m) return '';
    const t = m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
    return decodeHtml_(t.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  }).filter(Boolean);
}

function decodeHtml_(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

// "https://www.exemplo.com.br/feed" -> "exemplo"
function newsSourceName_(site) {
  const host = String(site).replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '');
  return host.split('.')[0];
}

// ---------------- utilitários ----------------
function rows_(sheet, name) {
  const tab = sheet.getSheetByName(name);
  if (!tab || tab.getLastRow() < 2) return [];
  return tab.getRange(2, 1, tab.getLastRow() - 1, Math.max(tab.getLastColumn(), 4)).getValues();
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/** Rode no editor para autorizar e conferir o que cada perfil vai mostrar. */
function teste() {
  Object.keys(PROFILES).forEach(k => {
    const r = doGet({ parameter: { token: TOKEN, pessoa: k } }).getContent();
    Logger.log(k + ': ' + r.slice(0, 2000));
  });
}

/** Rode no editor para ver quantos vídeos o script encontrou no álbum e o que o Google responde. */
function testeVideos() {
  const cfg = PROFILES.familia.photos || {};
  if (!cfg.album) return Logger.log('nenhum álbum configurado no perfil familia');
  const html = UrlFetchApp.fetch(cfg.album, { followRedirects: true, muteHttpExceptions: true }).getContentText();
  const items = albumItems_(html), urls = items.map(it => it.url);
  const videos = videoSet_(urls);
  Logger.log('itens no álbum: ' + urls.length + ' · vídeos encontrados: ' + Object.keys(videos).length +
    ' · fotos em pé: ' + items.filter(it => it.h > it.w * 1.1).length + ' · com data: ' + items.filter(it => it.t).length);
  urls.slice(0, 15).forEach(u => {
    const r = UrlFetchApp.fetch(u + '=dv', { headers: { Range: 'bytes=0-0' }, followRedirects: true, muteHttpExceptions: true });
    const h = r.getHeaders();
    Logger.log(r.getResponseCode() + ' ' + (h['Content-Type'] || h['content-type'] || '?') + (videos[u] ? '  <- vídeo' : ''));
  });
}
