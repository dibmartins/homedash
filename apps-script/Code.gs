/**
 * Painel da Família — Google Apps Script
 *
 * Lê Google Agenda, Google Tasks, uma planilha (compras, cardápio, lembretes)
 * e fotos (álbum compartilhado do Google Fotos ou pasta do Drive) e devolve
 * JSON para o painel. Instalação: veja o LEIA-ME.md.
 *
 * Requer o serviço avançado "Google Tasks API" (Serviços > + > Tasks API)
 * se algum perfil usar taskLists.
 */

// Troque por uma sequência aleatória. O painel envia o mesmo valor em ?token=
const TOKEN = 'troque-este-segredo';

// ID da planilha "Painel da Família" (o trecho entre /d/ e /edit na URL).
// Abas esperadas: "Compras", "Cardápio", "Lembretes". Veja o LEIA-ME.md.
const SHEET_ID = '';

// Um perfil por painel. Use ?pessoa=<chave> na URL do painel.
//  calendars: IDs das agendas (Configurações da agenda > "Integrar agenda" > ID).
//             As agendas das outras pessoas precisam estar compartilhadas com a conta
//             que roda este script. 'primary' = sua agenda principal.
//  colors:    cor opcional por agenda (senão usa a cor do Google Agenda).
//  taskLists: nomes de listas do Google Tasks DESTA conta (lembretes de voz do Google Assistente caem em "Minhas tarefas").
//  sheetReminders: nome usado na coluna "Pessoa" da aba Lembretes (linhas com "Todos" aparecem para todos).
//  shopping / menu: mostrar compras e cardápio da planilha.
//  photos: { album: 'link do álbum compartilhado do Google Fotos' } ou { folder: 'ID da pasta no Drive' }.
//          Vídeos do álbum tocam sozinhos, sem som, no fundo da tela.
//  spotify: mostrar o card "Tocando agora" (veja a seção Spotify no README).
// Troque as chaves e os nomes pelos da sua casa na SUA cópia do script (não no repositório).
const PROFILES = {
  familia: {
    name: '',
    calendars: ['primary'],
    taskLists: ['Minhas tarefas'],
    sheetReminders: 'Todos',
    shopping: true,
    menu: true,
    photos: { album: '' },
    spotify: true,
  },
  pessoa1: {
    name: 'Pessoa 1',
    calendars: ['primary'],
    taskLists: ['Minhas tarefas'],
    sheetReminders: 'Pessoa 1',
    shopping: true,
    menu: true,
    photos: { album: '' },
    spotify: true,
  },
  pessoa2: {
    name: 'Pessoa 2',
    calendars: [/* 'email-da-pessoa2@gmail.com' */],
    taskLists: [],
    sheetReminders: 'Pessoa 2',
    shopping: true,
    menu: true,
    photos: { album: '' },
  },
  pessoa3: {
    name: 'Pessoa 3',
    calendars: [/* 'email-da-pessoa3@gmail.com' */],
    taskLists: [],
    sheetReminders: 'Pessoa 3',
    shopping: false,
    menu: true,
    photos: { album: '' },
  },
};

const CACHE_SECONDS = 120;

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
  const sheet = SHEET_ID ? safe('planilha', () => SpreadsheetApp.openById(SHEET_ID), null) : null;
  const body = JSON.stringify({
    name: profile.name,
    events: safe('agenda', () => getEvents_(profile, days), []),
    reminders: safe('lembretes', () => getReminders_(profile, sheet), []),
    shopping: profile.shopping ? safe('compras', () => getShopping_(sheet), []) : null,
    menu: profile.menu ? safe('cardápio', () => getMenu_(sheet), []) : null,
    photos: safe('fotos', () => getPhotos_(profile.photos || {}), []),
    spotify: !!(profile.spotify && spotifyConfigured_()),
    warnings: warnings,
    updated: new Date().toISOString(),
  });
  try { cache.put(cacheKey, body, CACHE_SECONDS); } catch (err) { /* resposta grande demais para o cache */ }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
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

// ---------------- Lembretes ----------------
function getReminders_(profile, sheet) {
  const items = [];

  if (profile.taskLists && profile.taskLists.length) {
    if (typeof Tasks === 'undefined') throw new Error('adicione o serviço "Google Tasks API" e publique uma nova versão');
    const lists = Tasks.Tasklists.list({ maxResults: 100 }).items || [];
    lists.filter(l => profile.taskLists.indexOf(l.title) !== -1).forEach(l => {
      let pageToken;
      do {
        const res = Tasks.Tasks.list(l.id, { showCompleted: false, showHidden: false, maxResults: 100, pageToken: pageToken });
        (res.items || []).forEach(t => {
          if (t.status !== 'completed' && t.title) items.push({ title: t.title, due: t.due || null });
        });
        pageToken = res.nextPageToken;
      } while (pageToken);
    });
  }

  if (sheet && profile.sheetReminders) {
    rows_(sheet, 'Lembretes').forEach(r => {
      // colunas: Lembrete | Pessoa | Data | Feito
      const who = String(r[1] || 'Todos').trim();
      if (isDone_(r[3]) || !r[0]) return;
      if (who !== profile.sheetReminders && who !== 'Todos') return;
      items.push({ title: String(r[0]), due: r[2] instanceof Date ? isoDate_(r[2]) : null });
    });
  }

  return items.sort((a, b) => {
    if (a.due && b.due) return a.due < b.due ? -1 : 1;
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });
}

// ---------------- Compras e cardápio (planilha) ----------------
function getShopping_(sheet) {
  if (!sheet) return [];
  // colunas: Item | Comprado (caixa de seleção)
  return rows_(sheet, 'Compras').filter(r => r[0] && !isDone_(r[1])).map(r => ({ title: String(r[0]) }));
}

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
    const ck = 'album-' + Utilities.base64Encode(cfg.album).slice(0, 200);
    const hit = cache.get(ck);
    if (hit) return JSON.parse(hit);
    // Lê o álbum compartilhado (link "photos.app.goo.gl/..."). Não é uma API oficial:
    // se o Google mudar a página, use uma pasta do Drive.
    const html = UrlFetchApp.fetch(cfg.album, { followRedirects: true, muteHttpExceptions: true }).getContentText();
    const re = /\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[^"]+)",\s*(\d+),\s*(\d+)/g;
    const seen = {}, urls = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      if (seen[m[1]]) continue;
      seen[m[1]] = true;
      urls.push(m[1]);
    }
    const videos = videoSet_(urls);
    // o painel troca o sufixo pelo tamanho real da tela; vídeos usam "=dv" (o arquivo do vídeo)
    const out = urls.map(u => videos[u] ? { url: u + '=w1920-h1080', video: u + '=dv' } : { url: u + '=w1920-h1080' });
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

// ---------------- utilitários ----------------
function rows_(sheet, name) {
  const tab = sheet.getSheetByName(name);
  if (!tab || tab.getLastRow() < 2) return [];
  return tab.getRange(2, 1, tab.getLastRow() - 1, Math.max(tab.getLastColumn(), 4)).getValues();
}
function isDone_(v) { return v === true || /^(sim|x|ok|feito|true)$/i.test(String(v).trim()); }
// mesmo formato do Google Tasks: só a data, à meia-noite UTC
function isoDate_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') + 'T00:00:00.000Z'; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/** Rode no editor para autorizar e conferir o que cada perfil vai mostrar. */
function teste() {
  Object.keys(PROFILES).forEach(k => {
    const r = doGet({ parameter: { token: TOKEN, pessoa: k } }).getContent();
    Logger.log(k + ': ' + r.slice(0, 2000));
  });
}
