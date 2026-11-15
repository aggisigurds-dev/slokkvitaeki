// afgreidsla.cjs — AFGREIÐSLA (15.11.2026): forunnin verk sem Agnar framkvæmir með EINUM takka.
//
// Agnar 15.11.2026: „forunnið það sem þú getur inn á þjónustuborð … svara, senda tölvupóst, forskrifa, breyta skjölum,
// og allt sem þarf svo ég geti í raun bara ýtt á staðfesta eða senda". Og um gamla kerfið: „heillengi að átta mig á hvað
// samþykkja þýðir, ekki nægilegar sannanir eða rök … rennur svo mikið saman. Treysti því ekki." — „Samþykkja" á borðinu
// framkvæmir ekkert (368:801 skiptir aðeins um merki). HÉR framkvæmir takkinn það sem á honum stendur, strax.
//
//   GET  /api/afgreidsla                       → { tilbuin[], saga[], throskuldur }  (athuganir keyrðar NÚNA)
//   POST /api/afgreidsla { id, adgerd:'framkvaema', texti? }   → sendir póstinn / kröfuna, eða merkir símtal/verk lokið
//   POST /api/afgreidsla { id, adgerd:'vista', texti }          → vistar breyttan texta (tölvupóstur)
//   POST /api/afgreidsla { id, adgerd:'seinna' }                → aftast í röðina (ekki ákvörðun)
//   POST /api/afgreidsla { id, adgerd:'sleppa', varanlegt?, astaeda? } → ákvörðun: kemur aldrei aftur á sama lykli
//
// REGLURNAR ÞRJÁR (Agnar 15.11.2026: „aðeins eftir að svara skilaboð úr miðjum samskiptum og mörg samskipti komin eftir
// það … skiptir um skoðun fram og til baka … setur í forgang eitthvað sem skiptir engu máli"):
//   1. AÐEINS NÝJASTA SKEYTIÐ — svar fer aðeins ef ekkert skeyti hefur bæst í þráðinn síðan. Athugað við birtingu OG
//      aftur rétt áður en sent er; úrelt verk fær stada 'urelt' og hverfur.
//   2. ÁKVÖRÐUN STENDUR — `lykill` er einkvæmur í töflunni: sent / sleppt / ekki þess virði kemur aldrei aftur.
//   3. ÞESS VIRÐI — verk undir THROSKULDUR_KR fara aldrei fyrir Agnar (virdi_kr skráð á hvert peningaverk).
//
// HLIÐ: aðeins innskráður stjórnandi (sama hlið og Ráðgjafinn: _radgjafinn-hlid.cjs). Lás: framkvæmd tekur röðina skilyrt
// tilbuid → i_vinnslu áður en nokkuð fer út, svo tvísmellur sendir aldrei tvisvar. Pósthólf: aðeins eldklar@ og bokhald@.

const crypto = require('crypto');
const P = require('./_portal.cjs');
const H = require('./_radgjafinn-hlid.cjs');
const HUB = require('./hub-adgangar.cjs');

const THROSKULDUR_KR = 10000;
const POSTHOLF = /^(eldklar|bokhald)@eldklar\.is$/i;
const GMAIL_SEND = 'https://brunaholf.netlify.app/api/gmail-send';
const EYDA = /\[[^\]\n]{1,60}\]/;                 // ófyllt eyða í texta: [DAGUR 1], [nafn] …
const POSTHOLF_ALDUR_KLST = 6;                      // pósthólfið þarf að hafa verið lesið nýlega til að „ósvarað" standist
const SENDANDI = 'Brunahólf slökkvitæki ehf';       // sama nafn og AppMail (254)

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tilHtml = (t) => esc(t).replace(/\r/g, '').split('\n').join('<br>');
const addr = (s) => { const m = String(s || '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/); return m ? m[0].toLowerCase() : ''; };
const kr = (n) => Math.round(Number(n) || 0);

async function sbJson(r) { if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 160)}`); return r.json(); }
const lesa = (qs) => P.sbGet(qs).then(sbJson);
const breyta = (qs, body) => P.sbPatch(qs, Object.assign({ updated_at: new Date().toISOString() }, body)).then(sbJson);

// Tóki fyrir póstsendinguna þjóna á milli (sami samningur og lokun gmail-send á að virða: HMAC af þjónustulyklinum).
function posturToki(ms = Date.now()) {
  const m = Math.floor(ms / 60000);
  return m + '.' + crypto.createHmac('sha256', String(P.SUPABASE_KEY || '')).update('postur-senda|' + m).digest('hex');
}

async function notandi(event) {
  try {
    const h = (event && event.headers) || {};
    const r = await HUB.handler({ httpMethod: 'GET', queryStringParameters: {}, headers: { host: 'slokkvitaeki.netlify.app', cookie: h.cookie || h.Cookie || '' } });
    const s = r && r.statusCode === 200 ? JSON.parse(r.body) : null;
    return (s && s.user && (s.user.nn || s.user.nafn)) || 'óþekkt';
  } catch (_) { return 'óþekkt'; }
}

/* ── ATHUGANIR — keyrðar þegar spjaldið er sýnt OG aftur rétt fyrir framkvæmd ─────────────────────────────── */
// Les pósthólfið NÚNA (innhólf + sendur póstur, 3 dagar) — sama og Tölvupóstar (448:379) gera rétt áður en sent er.
async function lesaPostholf(account) {
  const k = (f) => fetch('https://brunaholf.netlify.app/api/gmail-ingest?account=' + encodeURIComponent(account) + '&days=3' + f, { signal: AbortSignal.timeout(12000) })
    .then((r) => r.ok).catch(() => false);
  const [inn, ut] = await Promise.all([k(''), k('&folder=sent')]);
  return inn && ut;
}

async function athuga(row, { lesaNu = false } = {}) {
  const g = row.gogn || {};
  const a = [];   // { texti, ok }
  let urelt = null;
  if (row.tegund === 'tolvupostur') {
    const sv = g.svar_vid || {};
    // Við framkvæmd er pósthólfið lesið FYRST, svo „ekkert nýrra skeyti" standist á nýjustu gögnum.
    const lesid = lesaNu && POSTHOLF.test(String(g.account || '')) ? await lesaPostholf(String(g.account)) : null;
    a.push({ texti: 'Sent frá ' + (g.account || '?') + ' (pósthólf félagsins)', ok: POSTHOLF.test(String(g.account || '')) });
    const texti = String(g.texti || '');
    const eyda = texti.match(EYDA);
    a.push({ texti: eyda ? 'Eyða ófyllt í textanum: ' + eyda[0] : 'Engar ófylltar eyður í textanum', ok: !eyda });
    a.push({ texti: 'Viðtakandi: ' + [].concat(g.to || []).join(', '), ok: [].concat(g.to || []).some((t) => addr(t)) });
    if (sv.thread_id && sv.received_at) {
      // Regla 1: er komið nýrra skeyti í þráðinn (frá hvorum sem er)?
      const nyrri = await lesa(`email_digest?select=id,received_at,folder,sender_email&thread_id=eq.${encodeURIComponent(sv.thread_id)}` +
        `&received_at=gt.${encodeURIComponent(sv.received_at)}&order=received_at.desc&limit=5`);
      const fra_okkur = nyrri.filter((x) => /sent/i.test(String(x.folder || '')));
      if (nyrri.length) urelt = fra_okkur.length ? 'Þráðnum hefur þegar verið svarað (' + String(fra_okkur[0].received_at).slice(0, 16).replace('T', ' ') + ')'
        : 'Nýtt skeyti kom í þráðinn ' + String(nyrri[0].received_at).slice(0, 16).replace('T', ' ') + ' — svarið á ekki lengur við';
      a.push({ texti: urelt || 'Ekkert nýrra skeyti í þræðinum — þú svarar því nýjasta', ok: !urelt });
    } else {
      a.push({ texti: 'Þráður óþekktur — ekki hægt að staðfesta að svarið sé við nýjasta skeytið', ok: false });
    }
    // Er pósthólfið nýlesið? Annars getur „ósvarað" verið rangt.
    if (lesaNu) {
      a.push({ texti: lesid ? 'Pósthólfið lesið núna, rétt áður en sent er' : 'Náði ekki að lesa pósthólfið núna — ekkert sent', ok: !!lesid });
    } else {
      const sid = await lesa(`email_digest?select=fetched_at&account=eq.${encodeURIComponent(String(g.account || ''))}&order=fetched_at.desc&limit=1`).catch(() => []);
      const kl = sid[0] && sid[0].fetched_at;
      const aldur = kl ? (Date.now() - Date.parse(kl)) / 36e5 : null;
      const ferskt = aldur != null && aldur <= POSTHOLF_ALDUR_KLST;
      // Upplýsing, ekki fyrirstaða: framkvæmdin les hólfið sjálf og stöðvar ef nýrra skeyti er komið.
      a.push({ texti: (kl ? 'Pósthólfið lesið síðast ' + String(kl).slice(0, 16).replace('T', ' ') : 'Óvíst hvenær pósthólfið var lesið') +
        (ferskt ? '' : ' — það verður lesið aftur rétt áður en sent er'), ok: true });
    }
  } else if (row.tegund === 'krafa') {
    const s = (await lesa(`solur?select=id,status,is_credit,hidden,krafa_sent_at,dk_invoice_id,paid_at,samtals,customer_nafn&id=eq.${Number(g.sale_id)}&limit=1`))[0];
    if (!s) { a.push({ texti: 'Salan finnst ekki', ok: false }); }
    else {
      a.push({ texti: 'Krafan hefur ekki verið send', ok: !s.krafa_sent_at && !s.dk_invoice_id });
      a.push({ texti: 'Ógreitt', ok: !s.paid_at });
      a.push({ texti: 'Ekki ógilt, ekki kredit, ekki falið', ok: s.status !== 'void' && !s.is_credit && !s.hidden });
      a.push({ texti: 'Upphæð ' + kr(s.samtals).toLocaleString('is-IS') + ' kr á ' + (s.customer_nafn || '?'), ok: kr(s.samtals) > 0 });
      if (s.krafa_sent_at || s.dk_invoice_id || s.paid_at) urelt = s.paid_at ? 'Salan er þegar greidd' : 'Krafan hefur þegar verið send';
    }
  }
  if (row.virdi_kr != null && kr(row.virdi_kr) < THROSKULDUR_KR && row.tegund !== 'krafa') {
    a.push({ texti: 'Undir þröskuldi (' + THROSKULDUR_KR.toLocaleString('is-IS') + ' kr) — ekki þess virði', ok: false });
  }
  return { athuganir: a, ok: !urelt && a.every((x) => x.ok), urelt };
}

// Það sem skjárinn fær — ekkert úr gögnunum sem skjárinn þarf ekki.
async function synilegt(row) {
  const ath = await athuga(row);
  const g = row.gogn || {};
  const o = { id: row.id, tegund: row.tegund, titill: row.titill, takki: row.takki, hvad_gerist: row.hvad_gerist, af_hverju: row.af_hverju || [],
    virdi_kr: row.virdi_kr, created_at: row.created_at, created_by: row.created_by, ...ath };
  if (row.tegund === 'tolvupostur') {
    o.post = { account: g.account, to: g.to || [], cc: g.cc || [], subject: g.subject || '', texti: g.texti || '', vidhengi: (g.vidhengi || []).map((v) => v.filename) };
    o.svar_vid = g.svar_vid ? { fra: g.svar_vid.fra || '', dags: String(g.svar_vid.received_at || '').slice(0, 16).replace('T', ' '), efni: g.svar_vid.efni || '', texti: String(g.svar_vid.texti || '').slice(0, 1500) } : null;
  } else if (row.tegund === 'simtal') {
    o.simtal = { hverjum: g.hverjum || '', simi: g.simi || '', handrit: g.handrit || '' };
  } else if (row.tegund === 'verk') {
    o.verk = { lysing: g.lysing || '' };
  } else if (row.tegund === 'krafa') {
    o.krafa = { sale_id: g.sale_id, r_numer: g.r_numer || '' };
  }
  return o;
}

/* ── FRAMKVÆMD ──────────────────────────────────────────────────────────────────────────────────────────── */
async function sendaPost(g) {
  const body = {
    account: String(g.account).toLowerCase(),
    from: SENDANDI + ' <' + String(g.account).toLowerCase() + '>',
    to: [].concat(g.to || []), cc: g.cc && g.cc.length ? g.cc : undefined,
    subject: g.subject, html: tilHtml(g.texti),
    attachments: g.vidhengi || [],
    inReplyTo: (g.svar_vid && g.svar_vid.message_id) || undefined,
  };
  const r = await fetch(GMAIL_SEND, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-postur-toki': posturToki() }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error || j.ok === false) throw new Error('Pósturinn fór ekki: ' + (j.message || j.error || ('HTTP ' + r.status)));
  return { messageId: j.id || j.messageId || null, threaded: j.threaded != null ? !!j.threaded : null, account: body.account, to: body.to };
}

async function sendaKrofu(g, event) {
  const PP = require('./payday-push.cjs');
  const h = Object.assign({}, (event && event.headers) || {});
  if (process.env.EDGE_SHARED_KEY) h['x-eldklar-key'] = process.env.EDGE_SHARED_KEY;
  const r = await PP.handler({ httpMethod: 'POST', headers: h, queryStringParameters: {}, body: JSON.stringify({ sale_id: Number(g.sale_id), mode: 'send', attach_report: !!g.attach_report }) });
  let j = {}; try { j = JSON.parse(r.body || '{}'); } catch (_) {}
  if (r.statusCode >= 300 || j.error) throw new Error('Krafan fór ekki: ' + (j.message || j.error || ('HTTP ' + r.statusCode)));
  return { payday: j.invoice_number || j.payday_invoice_id || j.id || null, svar: String(j.message || 'send').slice(0, 200) };
}

async function framkvaema(id, body, event) {
  // Lás: aðeins EIN framkvæmd — tilbuid → i_vinnslu skilyrt.
  const tekin = await breyta(`afgreidsla?id=eq.${id}&stada=eq.tilbuid`, { stada: 'i_vinnslu' });
  if (!tekin.length) return P.json(409, { error: 'Þetta verk er þegar afgreitt eða í vinnslu.' });
  let row = tekin[0];
  const skila = (stada, extra) => breyta(`afgreidsla?id=eq.${id}`, Object.assign({ stada }, extra || {}));
  try {
    if (row.tegund === 'tolvupostur' && typeof body.texti === 'string' && body.texti.trim() && body.texti !== row.gogn.texti) {
      row.gogn = Object.assign({}, row.gogn, { texti: body.texti });
      await breyta(`afgreidsla?id=eq.${id}`, { gogn: row.gogn });
    }
    const ath = await athuga(row, { lesaNu: true });
    if (!ath.ok) {
      if (ath.urelt) { await skila('urelt', { astaeda: ath.urelt }); return P.json(409, { error: ath.urelt, urelt: true, athuganir: ath.athuganir }); }
      await skila('tilbuid');
      return P.json(409, { error: 'Athugun stóðst ekki — ekkert var sent.', athuganir: ath.athuganir });
    }
    const hver = await notandi(event);
    let nidurstada;
    if (row.tegund === 'tolvupostur') {
      if (body.prufa) { await skila('tilbuid'); return P.json(200, { ok: true, prufa: true, athuganir: ath.athuganir, myndi_senda: { to: row.gogn.to, from: row.gogn.account, subject: row.gogn.subject } }); }
      nidurstada = await sendaPost(row.gogn);
      if (row.gogn.mal_id) await breyta(`thjonustubeidni?id=eq.${Number(row.gogn.mal_id)}`, { svarad_at: new Date().toISOString() }).catch(() => {});
    } else if (row.tegund === 'krafa') {
      if (body.prufa) { await skila('tilbuid'); return P.json(200, { ok: true, prufa: true, athuganir: ath.athuganir }); }
      nidurstada = await sendaKrofu(row.gogn, event);
    } else if (row.tegund === 'verk' && row.gogn.verkefnalisti) {
      // Verk fer á Verkefnalistann (grunnregla agentanna: „aldrei laga framhjá listanum").
      const v = row.gogn.verkefnalisti;
      const ny = await P.sbPost('verkefnalisti', { title: String(v.title || row.titill).slice(0, 200), description: String(v.description || '').slice(0, 4000),
        status: 'beidni', category: v.category || 'villa', assigned_agent: v.assigned_agent || 'claude-code', vefur: v.vefur || 'slokkvitaeki', priority: v.priority || 2 }).then(sbJson);
      nidurstada = { verkefnalisti_id: ny[0] && ny[0].id, athugasemd: 'Sett á Verkefnalistann' };
    } else {
      nidurstada = { athugasemd: String(body.athugasemd || '').slice(0, 500) || null };
    }
    const lokid = await skila('framkvaemt', { framkvaemt_at: new Date().toISOString(), framkvaemt_af: hver, nidurstada });
    return P.json(200, { ok: true, verk: await synilegtSaga(lokid[0]) });
  } catch (e) {
    const villa = String((e && e.message) || e).slice(0, 300);
    await skila('villa', { astaeda: villa }).catch(() => {});
    return P.json(502, { error: villa });
  }
}

function synilegtSaga(r) {
  return { id: r.id, tegund: r.tegund, titill: r.titill, takki: r.takki, stada: r.stada, astaeda: r.astaeda, nidurstada: r.nidurstada,
    framkvaemt_at: r.framkvaemt_at, framkvaemt_af: r.framkvaemt_af, updated_at: r.updated_at };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(500, { error: 'Supabase env vantar' });
  const g = await H.hlid(event); if (g) return g;   // aðeins innskráður stjórnandi

  if (event.httpMethod === 'GET') {
    try {
      const [tilb, saga] = await Promise.all([
        lesa('afgreidsla?select=*&stada=eq.tilbuid&order=forgangur.asc,created_at.asc&limit=50'),
        lesa('afgreidsla?select=*&stada=neq.tilbuid&order=updated_at.desc&limit=40'),
      ]);
      const tilbuin = [];
      for (const r of tilb) {
        const s = await synilegt(r);
        if (s.urelt) { await breyta(`afgreidsla?id=eq.${r.id}&stada=eq.tilbuid`, { stada: 'urelt', astaeda: s.urelt }).catch(() => {}); continue; }
        tilbuin.push(s);
      }
      return P.json(200, { tilbuin, saga: saga.map(synilegtSaga), throskuldur: THROSKULDUR_KR });
    } catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
  }
  if (event.httpMethod !== 'POST') return P.json(405, { error: 'GET eða POST' });

  let b; try { b = JSON.parse(event.body || '{}'); } catch (_) { return P.json(400, { error: 'Ógilt JSON' }); }
  const id = Number(b.id);
  if (!Number.isInteger(id) || id <= 0) return P.json(400, { error: 'id vantar' });
  try {
    if (b.adgerd === 'framkvaema') return await framkvaema(id, b, event);
    if (b.adgerd === 'vista') {
      const r = (await lesa(`afgreidsla?select=*&id=eq.${id}&stada=eq.tilbuid&limit=1`))[0];
      if (!r) return P.json(409, { error: 'Verkið er ekki lengur opið' });
      if (r.tegund !== 'tolvupostur') return P.json(400, { error: 'Aðeins texti tölvupósts er vistaður' });
      const gogn = Object.assign({}, r.gogn, { texti: String(b.texti || '').slice(0, 20000) });
      await breyta(`afgreidsla?id=eq.${id}`, { gogn });
      return P.json(200, { ok: true, verk: await synilegt(Object.assign(r, { gogn })) });
    }
    if (b.adgerd === 'seinna') {
      const r = (await lesa(`afgreidsla?select=forgangur&id=eq.${id}&stada=eq.tilbuid&limit=1`))[0];
      if (!r) return P.json(409, { error: 'Verkið er ekki lengur opið' });
      await breyta(`afgreidsla?id=eq.${id}`, { forgangur: Math.min(100000, (r.forgangur || 50) + 100) });
      return P.json(200, { ok: true });
    }
    if (b.adgerd === 'sleppa') {
      const hver = await notandi(event);
      const r = await breyta(`afgreidsla?id=eq.${id}&stada=eq.tilbuid`, { stada: b.varanlegt ? 'ekki_thess_virdi' : 'sleppt',
        astaeda: String(b.astaeda || (b.varanlegt ? 'Ekki þess virði' : 'Sleppt')).slice(0, 300), framkvaemt_at: new Date().toISOString(), framkvaemt_af: hver });
      if (!r.length) return P.json(409, { error: 'Verkið er ekki lengur opið' });
      return P.json(200, { ok: true, verk: synilegtSaga(r[0]) });
    }
    return P.json(400, { error: 'Óþekkt aðgerð' });
  } catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
};

module.exports.THROSKULDUR_KR = THROSKULDUR_KR;
module.exports._athuga = athuga;
module.exports._posturToki = posturToki;
