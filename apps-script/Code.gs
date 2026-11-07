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
//             As agendas da Mariana e do Antônio precisam estar compartilhadas com a conta
//             que roda este script. 'primary' = sua agenda principal.
//  colors:    cor opcional por agenda (senão usa a cor do Google Agenda).
//  taskLists: nomes de listas do Google Tasks DESTA conta (lembretes do Nest Mini caem em "Minhas tarefas").
//  sheetReminders: nome usado na coluna "Pessoa" da aba Lembretes (linhas com "Todos" aparecem para todos).
//  shopping / menu: mostrar compras e cardápio da planilha.
//  photos: { album: 'link do álbum compartilhado do Google Fotos' } ou { folder: 'ID da pasta no Drive' }.
const PROFILES = {
  familia: {
    name: '',
    calendars: ['primary'],
    taskLists: ['Minhas tarefas'],
    sheetReminders: 'Todos',
    shopping: true,
    menu: true,
    photos: { album: '' },
  },
  diego: {
    name: 'Diego',
    calendars: ['primary'],
    taskLists: ['Minhas tarefas'],
    sheetReminders: 'Diego',
    shopping: true,
    menu: true,
    photos: { album: '' },
  },
  mariana: {
    name: 'Mariana',
    calendars: [/* 'mariana@gmail.com' */],
    taskLists: [],
    sheetReminders: 'Mariana',
    shopping: true,
    menu: true,
    photos: { album: '' },
  },
  antonio: {
    name: 'Antônio',
    calendars: [/* 'antonio@gmail.com' */],
    taskLists: [],
    sheetReminders: 'Antônio',
    shopping: false,
    menu: true,
    photos: { album: '' },
  },
};

const CACHE_SECONDS = 120;

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (TOKEN === 'troque-este-segredo' || TOKEN.length < 24) return json_({ error: 'defina um TOKEN longo no script' });
  if (p.token !== TOKEN) return json_({ error: 'token inválido' });

  if (p.foto) {
    // só entrega fotos das pastas configuradas, nunca outros arquivos do Drive
    if (!allowedPhotoIds_()[p.foto]) return json_({ error: 'foto não permitida' });
    return json_({ dataUrl: drivePhotoDataUrl_(p.foto) });
  }

  const key = String(p.pessoa || 'familia').toLowerCase();
  const profile = PROFILES[key];
  if (!profile) return json_({ error: 'perfil desconhecido: ' + key });

  const days = Math.min(Math.max(parseInt(p.days, 10) || 5, 1), 14);
  const cache = CacheService.getScriptCache();
  const cacheKey = 'painel-' + key + '-' + days;
  const cached = cache.get(cacheKey);
  if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);

  const sheet = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : null;
  const body = JSON.stringify({
    name: profile.name,
    events: getEvents_(profile, days),
    reminders: getReminders_(profile, sheet),
    shopping: profile.shopping ? getShopping_(sheet) : null,
    menu: profile.menu ? getMenu_(sheet) : null,
    photos: getPhotos_(profile.photos || {}),
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
    const seen = {}, out = [];
    let m;
    while ((m = re.exec(html)) !== null) {
      if (seen[m[1]]) continue;
      seen[m[1]] = true;
      out.push({ url: m[1] + '=w1280-h800' });
    }
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
function drivePhotoDataUrl_(id) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('foto-' + id);
  if (hit) return hit;
  const url = 'https://drive.google.com/thumbnail?sz=w1280&id=' + encodeURIComponent(id);
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  const blob = res.getBlob();
  const dataUrl = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  try { cache.put('foto-' + id, dataUrl, 6 * 3600); } catch (err) { /* maior que 100 KB */ }
  return dataUrl;
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
