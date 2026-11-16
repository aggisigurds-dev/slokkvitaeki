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
//   POST /api/afgreidsla { id, adgerd:'framkvaema', prufa:true }  → athuganir + hlið gmail-send prófað ({prufa:true}), EKKERT sent
//   POST /api/afgreidsla { id, adgerd:'athugasemd', texti }        → athugasemd Agnars á verkið (vistuð, lesin til baka)
//   Hvert af_hverju-atriði getur borið `opna` → skjárinn fær `slod` {url, texti} á skjalið sjálft (sjá leysaTilvisanir).
//
// AÐALMÁL (16.11.2026, Agnar: „gera þetta aðalatriða borðið þitt eitthvað interactive, ég get ekki gert rassgat þarna eða
// látið þig vita svörin eða svarað póstum"). Borðið (js/patches/492-adalmal.js) notar SÖMU vél:
//   GET  /api/afgreidsla?adalmal=1587            → það sama + adalmal[] (svör/ákvarðanir á atriðum þessara mála)
//   POST /api/afgreidsla { adgerd:'adalmal', mal_id, hluti, nr, texti, gerd, svar?, akvordun?, athugasemd? }
//        gerd 'svar'          (spurning)  → svarið til Charlize + verk á Verkefnalistann: „vinna úr svari Agnars"
//        gerd 'akvordun'      ja | nei    → ákvörðunin til Charlize (agentarnir lesa hana; Nei = ekki leggja til aftur)
//                             seinna      → atriðið hverfur af borðinu í SEINNA_DAGAR daga (ekki ákvörðun, ekki Charlize)
//                             engin       → ákvörðun tekin til baka (Charlize-færslan víkur)
//        gerd 'verkefnalisti'             → atriðið á Verkefnalistann (Claude vinnur verkið)
//        gerd 'athugasemd'                → athugasemd á atriðið, án ákvörðunar (tóm hreinsar)
//   Ein röð í afgreidsla á hvert atriði (tegund 'adalmal', lykill adalmal:<mál>-<hluti>-<nr>, sama sæti og ✓-lykillinn):
//   einkvæmur lykill = ákvörðun stendur; saga í nidurstada.saga; birtist í Sögu Afgreiðslunnar.
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

// Tóki fyrir póstsendinguna þjóna á milli. 16.11.2026: myntaður í hub-adgangar.cjs með session_secret úr sameiginlega
// grunninum — þjónustulykillinn (fyrri útgáfa hér) er ólíkur á vefjunum og brunaholf hafnaði honum í loftinu.
const posturToki = () => HUB.posturToki();

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

/* ── TILVÍSANIR SEM OPNAST (16.11.2026, Agnar: „ef þú ert að vísa í skýrslur eða reikninga, heimilaðu mér að geta opnað
 * þá til að staðfesta"). Röð getur borið `opna` á hverju af_hverju-atriði: {tegund:'skjal'|'sala'|'post'|'payday'|'mal', …}.
 * Þjónninn breytir því í slóð á SKJALIÐ SJÁLFT — sömu leiðir og appið notar annars staðar:
 *   skjal  → customer_documents: opinber Storage-slóð, annars Drive-umboð brunaholf /api/skjal (175/190 docUrl)
 *   sala   → reikningurinn sem PDF (customer_documents reikningur með sama R-númeri), annars #sale/<R-nr> (235)
 *   post   → pósturinn í Gmail (448 gmailSlod: authuser + #all/<thread>), aðeins Gmail-hólf
 *   payday → Brunahólf: /api/payday-invoice-pdf?tilvisun=; Slökkvitæki: reikningurinn úr customer_documents
 *   mal    → Þjónustuborðsmálið (opnast í appinu; slóðin ein opnar borðið)
 * Finnist skjalið ekki fær atriðið ENGA slóð — aldrei slóð sem gæti opnað rangt skjal. */
const SB_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const GMAIL = /^(eldklar|bokhald)@eldklar\.is$|^brunaholfehf@gmail\.com$/i;
function geymsluSlod(sp) {
  const s = String(sp || '').replace(/^\/+/, ''), i = s.indexOf('/');
  if (i < 1 || !SB_URL) return '';
  return SB_URL + '/storage/v1/object/public/' + s.slice(0, i) + '/' + s.slice(i + 1).split('/').map(encodeURIComponent).join('/');
}
const skjalSlod = (d) => geymsluSlod(d && d.storage_path) ||
  (d && d.drive_file_id && String(d.drive_file_id).indexOf('sb:') !== 0 ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(d.drive_file_id) : '');
const gmailSlod = (account, thread) => (GMAIL.test(String(account || '')) && thread
  ? 'https://mail.google.com/mail/u/?authuser=' + encodeURIComponent(String(account).toLowerCase()) + '#all/' + encodeURIComponent(thread) : '');
const DOC_HEITI = { reikningur: 'Reikningurinn (PDF)', uttektarskyrsla: 'Úttektarskýrslan (PDF)', brunakerfi: 'Brunakerfisskýrslan (PDF)', samningur: 'Samningurinn (PDF)' };
const tolur = (a) => [...new Set(a.map(Number).filter((x) => Number.isInteger(x) && x > 0))];

// Leysir allar tilvísanir einnar raðar í EINNI umferð (fá köll). Skilar fall: ref → { url, texti } | null.
async function leysaTilvisanir(refs) {
  const R = refs.filter((r) => r && typeof r === 'object');
  const ids = (t) => tolur(R.filter((r) => r.tegund === t).map((r) => r.id));
  const [skjol, solur, postar, mal] = await Promise.all([
    ids('skjal').length ? lesa(`customer_documents?select=id,doc_type,storage_path,drive_file_id,invoice_number&id=in.(${ids('skjal').join(',')})`).catch(() => []) : [],
    ids('sala').length ? lesa(`solur?select=id,num&id=in.(${ids('sala').join(',')})`).catch(() => []) : [],
    ids('post').length ? lesa(`email_digest?select=id,account,thread_id&id=in.(${ids('post').join(',')})`).catch(() => []) : [],
    ids('mal').length ? lesa(`thjonustubeidni?select=id,status,deleted_at,archived_at&id=in.(${ids('mal').join(',')})`).catch(() => []) : [],
  ]);
  const rnr = [...new Set(solur.map((s) => s.num).concat(R.filter((r) => r.tegund === 'payday' && r.felag === 'slokkvitaeki').map((r) => String(r.numer || '')))
    .filter((x) => /^[RK]-\d{3,8}$/.test(x)))];
  const reikn = rnr.length ? await lesa(`customer_documents?select=id,invoice_number,storage_path,drive_file_id,is_duplicate&doc_type=eq.reikningur&invoice_number=in.(${rnr.join(',')})&order=id.desc`).catch(() => []) : [];
  const reiknPdf = (nr) => { const d = reikn.find((x) => x.invoice_number === nr && !x.is_duplicate) || reikn.find((x) => x.invoice_number === nr); return d ? skjalSlod(d) : ''; };
  return (r) => {
    if (!r || typeof r !== 'object') return null;
    if (r.tegund === 'skjal') { const d = skjol.find((x) => x.id === Number(r.id)); const u = d && skjalSlod(d); return u ? { url: u, texti: DOC_HEITI[d.doc_type] || 'Skjalið (PDF)' } : null; }
    if (r.tegund === 'sala') {
      const s = solur.find((x) => x.id === Number(r.id)); if (!s || !s.num) return null;
      const pdf = reiknPdf(s.num);
      return pdf ? { url: pdf, texti: 'Reikningur ' + s.num + ' (PDF)' } : { url: '/#sale/' + encodeURIComponent(s.num), texti: 'Salan ' + s.num + ' í appinu' };
    }
    if (r.tegund === 'post') { const p = postar.find((x) => x.id === Number(r.id)); const u = p && gmailSlod(p.account, p.thread_id); return u ? { url: u, texti: 'Pósturinn í Gmail' } : null; }
    if (r.tegund === 'payday') {
      const nr = String(r.numer || '').trim(); if (!nr) return null;
      if (r.felag === 'brunaholf' && /^\d{1,7}$/.test(nr)) return { url: 'https://brunaholf.netlify.app/api/payday-invoice-pdf?tilvisun=' + encodeURIComponent(nr), texti: 'Payday-reikningur ' + nr + ' (PDF)' };
      if (r.felag === 'slokkvitaeki') { const u = reiknPdf(nr); return u ? { url: u, texti: 'Reikningur ' + nr + ' (PDF)' } : null; }
      return null;
    }
    // Aðeins OPIÐ mál fær slóð — lokað mál sést ekki á borðinu og tengillinn lofaði þá einhverju sem gerist ekki.
    if (r.tegund === 'mal' && mal.some((x) => x.id === Number(r.id) && x.status !== 'lokad' && !x.deleted_at && !x.archived_at)) return { url: '/?mal=' + Number(r.id) + '#bord', texti: 'Mál #' + Number(r.id) + ' á Þjónustuborði', mal_id: Number(r.id) };
    return null;
  };
}

// R-númer í texta aðalmálanna → reikningurinn sjálfur. Aðeins það sem FINNST verður tengill:
//   R-NNNNNN (6 stafir) = Slökkvitæki → reikningurinn í customer_documents (PDF)
//   R-NNN    (3–4 stafir) = Brunahólf  → Payday-PDF (invoices.tilvisun með payday_uuid, brunaholf /api/payday-invoice-pdf)
async function reikningsTenglar(malIds) {
  const mal = await lesa(`thjonustubeidni?select=notes&id=in.(${tolur(malIds).join(',')})`);
  const nr = [...new Set(mal.map((m) => String(m.notes || '').match(/\bR-\d{3,6}\b/g) || []).flat())].slice(0, 200);
  const slokk = nr.filter((x) => /^R-\d{6}$/.test(x)), bru = nr.filter((x) => /^R-\d{3,4}$/.test(x)).map((x) => x.slice(2));
  const [docs, inv] = await Promise.all([
    slokk.length ? lesa(`customer_documents?select=invoice_number,storage_path,drive_file_id,is_duplicate&doc_type=eq.reikningur&invoice_number=in.(${slokk.join(',')})&order=id.desc`) : [],
    bru.length ? lesa(`invoices?select=tilvisun&source=eq.payday&payday_uuid=not.is.null&tilvisun=in.(${bru.join(',')})`) : [],
  ]);
  const ut = {};
  for (const n of slokk) {
    const d = docs.find((x) => x.invoice_number === n && !x.is_duplicate) || docs.find((x) => x.invoice_number === n);
    const u = d && skjalSlod(d);
    if (u) ut[n] = { url: u, texti: 'Reikningur ' + n + ' (PDF)' };
  }
  for (const t of new Set(inv.map((x) => String(x.tilvisun)))) ut['R-' + t] = { url: 'https://brunaholf.netlify.app/api/payday-invoice-pdf?tilvisun=' + encodeURIComponent(t), texti: 'Payday-reikningur ' + t + ' (PDF, Brunahólf)' };
  return ut;
}

// Það sem skjárinn fær — ekkert úr gögnunum sem skjárinn þarf ekki.
async function synilegt(row) {
  const ath = await athuga(row);
  const g = row.gogn || {};
  const rok = Array.isArray(row.af_hverju) ? row.af_hverju : [];
  // Sjálfgefnar tilvísanir: pósturinn sem er svarað og salan sem krafan er fyrir — þær eru alltaf í gögnunum sjálfum.
  const sjalfgefid = [];
  if (row.tegund === 'tolvupostur' && g.svar_vid && g.svar_vid.digest_id) sjalfgefid.push({ tegund: 'post', id: g.svar_vid.digest_id });
  if (row.tegund === 'krafa' && g.sale_id) sjalfgefid.push({ tegund: 'sala', id: g.sale_id });
  const leysa = await leysaTilvisanir(rok.map((x) => x && x.opna).concat(sjalfgefid)).catch(() => () => null);
  const o = { id: row.id, tegund: row.tegund, titill: row.titill, takki: row.takki, hvad_gerist: row.hvad_gerist,
    af_hverju: rok.map((x) => { const s = x && x.opna ? leysa(x.opna) : null; return s ? Object.assign({}, x, { slod: s }) : x; }),
    virdi_kr: row.virdi_kr, created_at: row.created_at, created_by: row.created_by,
    athugasemd: row.athugasemd || null, athugasemd_af: row.athugasemd_af || null, athugasemd_at: row.athugasemd_at || null, ...ath };
  if (row.tegund === 'tolvupostur') {
    o.post = { account: g.account, to: g.to || [], cc: g.cc || [], subject: g.subject || '', texti: g.texti || '', vidhengi: (g.vidhengi || []).map((v) => v.filename) };
    o.svar_vid = g.svar_vid ? { fra: g.svar_vid.fra || '', dags: String(g.svar_vid.received_at || '').slice(0, 16).replace('T', ' '), efni: g.svar_vid.efni || '', texti: String(g.svar_vid.texti || '').slice(0, 1500),
      slod: (g.svar_vid.digest_id && leysa({ tegund: 'post', id: g.svar_vid.digest_id })) || (gmailSlod(g.account, g.svar_vid.thread_id) ? { url: gmailSlod(g.account, g.svar_vid.thread_id), texti: 'Pósturinn í Gmail' } : null) } : null;
  } else if (row.tegund === 'simtal') {
    o.simtal = { hverjum: g.hverjum || '', simi: g.simi || '', handrit: g.handrit || '' };
  } else if (row.tegund === 'verk') {
    o.verk = { lysing: g.lysing || '' };
  } else if (row.tegund === 'krafa') {
    o.krafa = { sale_id: g.sale_id, r_numer: g.r_numer || '', slod: g.sale_id ? leysa({ tegund: 'sala', id: g.sale_id }) : null };
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
  const r = await fetch(GMAIL_SEND, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-postur-toki': await posturToki() }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error || j.ok === false) throw new Error('Pósturinn fór ekki: ' + (j.message || j.error || ('HTTP ' + r.status)));
  return { messageId: j.id || j.messageId || null, threaded: j.threaded != null ? !!j.threaded : null, account: body.account, to: body.to };
}

// Prófar hlið gmail-send með sama tóka og raunsendingin. Aðeins { prufa, account } fer — engir viðtakendur, ekkert efni —
// svo jafnvel þótt gmail-send hunsaði prufa-merkið hefði það ekkert til að senda.
async function prufaSending(g) {
  const r = await fetch(GMAIL_SEND, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-postur-toki': await posturToki() },
    body: JSON.stringify({ prufa: true, account: String(g.account || '').toLowerCase() }), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok && j.prufa === true && j.sent === false, via: j.via || null, villa: r.ok ? null : String(j.error || j.message || '').slice(0, 200) || null };
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
      if (body.prufa) {
        // Prufa nær alla leið að sendingunni: sama tóki, sama hlið á gmail-send — en sendir EKKERT ({prufa:true}).
        const hlid = await prufaSending(row.gogn).catch((e) => ({ ok: false, villa: String((e && e.message) || e).slice(0, 200) }));
        await skila('tilbuid');
        return P.json(200, { ok: !!hlid.ok, prufa: true, athuganir: ath.athuganir, gmail_send: hlid, myndi_senda: { to: row.gogn.to, from: row.gogn.account, subject: row.gogn.subject } });
      }
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

/* ── AÐALMÁL — svör, ákvarðanir og Verkefnalistinn á atriðum vikuyfirlitsins ───────────────────────────────── */
const AM_HLUTAR = { a: 'Fundir og frestir', c: 'Það sem skiptir mestu', b: 'Hvað gerðist', sp: 'Spurningar', ath: 'Leiðrétt', x: 'Annað' };
const AM_AKV = { ja: 'Já', nei: 'Nei', seinna: 'Seinna', engin: 'Engin ákvörðun' };
const SEINNA_DAGAR = 3;
const LAS_UTRUNNINN_MS = 2 * 60 * 1000;   // lás sem situr lengur (fall dó í miðju) má taka yfir
const normT = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const p2 = (n) => String(n).padStart(2, '0');
const dagsIs = (d) => p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear();
const amLykill = (mid, h, nr) => 'adalmal:' + mid + '-' + h + '-' + nr;

function synilegtAdalmal(r) {
  const n = r.nidurstada || {}, g = r.gogn || {};
  return { lykill: r.lykill, id: r.id, mal_id: g.mal_id, hluti: g.hluti, nr: g.nr, texti: g.texti || '',
    svar: n.svar || null, svar_at: n.svar_at || null, svar_af: n.svar_af || null,
    akvordun: n.akvordun || null, akvordun_at: n.akvordun_at || null, akvordun_af: n.akvordun_af || null, seinna_til: n.seinna_til || null,
    athugasemd_agnars: n.athugasemd_agnars || null,
    verkefnalisti_id: n.verkefnalisti_id || null, verkefnalisti_titill: n.verkefnalisti_titill || null, verkefnalisti_at: n.verkefnalisti_at || null,
    charlize_id: n.akv_charlize_id || n.svar_charlize_id || null, stada: r.stada, updated_at: r.updated_at };
}

// Charlize: þar lesa agentarnir ákvarðanir áður en þeir vinna (v_charlize_active, MINNISBOK). Eldri færsla um sama atriði
// víkur (superseded_by) svo aðeins nýjasta ákvörðunin stendur — en AÐEINS eftir að allt annað tókst (sjá `eftir` í adalmal).
async function charlizeSkra(fact, detail) {
  const r = await P.sbPost('charlize_knowledge', { scope: 'baedi', topic: 'akvardanir-agnars', fact: String(fact).slice(0, 1800), detail: String(detail).slice(0, 2000),
    source: 'agnar', confidence: 'confirmed', status: 'active', agent: 'claude-code' }).then(sbJson);
  const id = r[0] && r[0].id;
  if (!id) throw new Error('Charlize skilaði engu auðkenni');
  return id;
}
const charlizeVikja = (id, nytt) => P.sbPatch(`charlize_knowledge?id=eq.${Number(id)}&status=eq.active`,
  { status: 'superseded', superseded_by: nytt || null, updated_at: new Date().toISOString() }).then(sbJson).catch(() => []);
const charlizeOgilda = (id) => P.sbPatch(`charlize_knowledge?id=eq.${Number(id)}`, { status: 'wrong', updated_at: new Date().toISOString() }).then(sbJson).catch(() => []);

async function verkefnalistiStofna(title, description) {
  const ny = await P.sbPost('verkefnalisti', { title: String(title).slice(0, 200), description: String(description).slice(0, 4000), status: 'beidni',
    category: 'allt', assigned_agent: 'claude-code', vefur: 'sameiginlegt', priority: 2 }).then(sbJson);
  if (!ny[0] || !ny[0].id) throw new Error('Verkefnalistinn skilaði engri röð');
  return ny[0];
}
const verkefnalistiLesa = (id) => (id ? lesa(`verkefnalisti?select=id,title,status&id=eq.${encodeURIComponent(id)}&limit=1`).then((x) => x[0] || null) : Promise.resolve(null));

async function adalmal(b, event) {
  const mid = Number(b.mal_id), nr = Number(b.nr), h = String(b.hluti || ''), gerd = String(b.gerd || '');
  if (!Number.isInteger(mid) || mid <= 0 || !Number.isInteger(nr) || nr < 0 || nr > 500 || !/^[a-z]{1,4}$/.test(h)) return P.json(400, { error: 'Atriðið er ekki rétt tilgreint' });
  if (!['svar', 'akvordun', 'verkefnalisti', 'athugasemd'].includes(gerd)) return P.json(400, { error: 'Óþekkt aðgerð á Aðalmálum' });
  if (gerd === 'svar' && h !== 'sp') return P.json(400, { error: 'Svar á aðeins við spurningar' });
  if (gerd === 'akvordun' && !AM_AKV[b.akvordun]) return P.json(400, { error: 'Ákvörðun er já, nei eða seinna' });
  const texti = String(b.texti || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (texti.length < 3) return P.json(400, { error: 'Texti atriðisins vantar' });
  const svar = String(b.svar || '').trim().slice(0, 4000);
  if (gerd === 'svar' && !svar) return P.json(400, { error: 'Svarið er tómt' });
  const ath = String(b.athugasemd || '').trim().slice(0, 1000);

  // Málið verður að vera opið aðalmál og atriðið að standa í textanum NÚNA — annars gæti svarið lent á röngu atriði.
  const m = (await lesa(`thjonustubeidni?select=id,title,notes,status,tags,deleted_at,archived_at&id=eq.${mid}&limit=1`))[0];
  if (!m || m.deleted_at || m.archived_at || m.status === 'lokad' || !(Array.isArray(m.tags) && m.tags.includes('adalmal'))) {
    return P.json(409, { error: 'Aðalmálið #' + mid + ' er ekki lengur opið — ekkert var skráð.' });
  }
  if (!normT(m.notes).includes(normT(texti).slice(0, 80))) {
    return P.json(409, { error: 'Atriðið stendur ekki lengur svona í yfirlitinu — sæktu borðið aftur. Ekkert var skráð.' });
  }

  const hver = await notandi(event);
  const lyk = amLykill(mid, h, nr);
  const nu = new Date(), nuIso = nu.toISOString(), dags = dagsIs(nu);
  const gogn = { mal_id: mid, hluti: h, nr, texti, mal_titill: String(m.title || '').slice(0, 200) };

  // Lás: ein aðgerð í einu á hvert atriði (tvísmellur / tvær vélar). Ný röð fæðist læst.
  let row = null;
  const ny = await P.sbPost('afgreidsla', { lykill: lyk, tegund: 'adalmal', titill: ((h === 'sp' ? 'Spurning: ' : '') + texti).slice(0, 200), takki: '—',
    hvad_gerist: '—', gogn, stada: 'i_vinnslu', created_by: 'adalmal', nidurstada: {} });
  if (ny.ok) row = (await ny.json())[0];
  else if (ny.status !== 409) throw new Error(`Supabase ${ny.status}: ${(await ny.text()).slice(0, 160)}`);
  else {
    const takmork = new Date(Date.now() - LAS_UTRUNNINN_MS).toISOString();
    const tekin = await breyta(`afgreidsla?lykill=eq.${encodeURIComponent(lyk)}&or=(stada.eq.framkvaemt,and(stada.eq.i_vinnslu,updated_at.lt.${encodeURIComponent('"' + takmork + '"')}))`, { stada: 'i_vinnslu' });
    if (!tekin.length) return P.json(409, { error: 'Annað smell á sama atriði er í vinnslu — augnablik.' });
    row = tekin[0];
  }
  const n = Object.assign({}, row.nidurstada || {});
  const fyrri = JSON.parse(JSON.stringify(n));
  const opna = (extra) => breyta(`afgreidsla?id=eq.${row.id}`, Object.assign({ stada: 'framkvaemt' }, extra || {}));
  const malRef = 'Aðalmál #' + mid + ' (' + (AM_HLUTAR[h] || h) + ', atriði ' + (nr + 1) + ')';
  const heimild = 'Heimild: thjonustubeidni #' + mid + ' („' + gogn.mal_titill + '") · afgreidsla ' + lyk;
  let takki = '', hvad = '', skilabod = '';
  const nyCid = [];     // Charlize-færslur sem urðu til í þessu kalli — ógildar ef eitthvað bregst á eftir
  const eftir = [];     // eldri Charlize-færslur sem víkja — aðeins þegar röðin hefur verið skrifuð
  const nyVl = [];      // verk sem urðu til í þessu kalli — sleppt ef eitthvað bregst á eftir
  try {
    if (gerd === 'svar') {
      const cid = await charlizeSkra('Agnar svaraði spurningu á ' + malRef + ' ' + dags + ': „' + texti + '" — SVAR: ' + svar, heimild + ' · skráð af ' + hver);
      nyCid.push(cid);
      if (n.svar_charlize_id) eftir.push([n.svar_charlize_id, cid]);
      const desc = 'Agnar svaraði á Aðalmálum ' + dags + ' (' + hver + ').\n\nSPURNINGIN: ' + texti + '\n\nSVARIÐ: ' + svar +
        '\n\nVinna úr svarinu: gera það sem það segir, sannreyna gegn frumheimild og skrá niðurstöðuna. Svarið er líka í Charlize #' + cid + '.\n' + heimild + '.';
      // Svarið er verk fyrir OKKUR (CLAUDE.md: Verkefnalistinn = það sem bíður okkar). Breytt svar uppfærir opna verkið.
      let vl = await verkefnalistiLesa(n.verkefnalisti_id);
      if (vl && (vl.status === 'beidni' || vl.status === 'i_vinnu')) {
        await P.sbPatch(`verkefnalisti?id=eq.${encodeURIComponent(vl.id)}`, { description: (desc + '\n\n(Svari breytt ' + dags + ')').slice(0, 4000), updated_at: nuIso }).then(sbJson);
      } else {
        vl = await verkefnalistiStofna('Svar Agnars: ' + texti.slice(0, 160), desc);
        nyVl.push(vl.id);
        n.verkefnalisti_at = nuIso;
      }
      Object.assign(n, { svar, svar_at: nuIso, svar_af: hver, svar_charlize_id: cid, verkefnalisti_id: vl.id, verkefnalisti_titill: String(vl.title || '').slice(0, 200), athugasemd: 'Svar: ' + svar.slice(0, 200) });
      takki = 'Senda svar til Claude'; hvad = 'Svarið skráð hjá Charlize (#' + cid + ') og sett á Verkefnalistann';
      skilabod = 'Svarið er vistað og komið til Claude: Charlize #' + cid + ' og verk á Verkefnalistanum.';
    } else if (gerd === 'akvordun') {
      const v = b.akvordun;
      if (v === 'seinna' || v === 'engin') {
        if (n.akv_charlize_id) eftir.push([n.akv_charlize_id, null]);
        const til = v === 'seinna' ? new Date(nu.getTime() + SEINNA_DAGAR * 864e5) : null;
        Object.assign(n, { akvordun: v === 'seinna' ? 'seinna' : null, akvordun_at: nuIso, akvordun_af: hver, akv_charlize_id: null,
          seinna_til: til ? til.toISOString().slice(0, 10) : null, athugasemd: v === 'seinna' ? 'Seinna — kemur aftur ' + dagsIs(til) : 'Ákvörðun tekin til baka' });
        takki = AM_AKV[v]; hvad = v === 'seinna' ? 'Atriðið hverfur af borðinu til ' + dagsIs(til) : 'Fyrri ákvörðun tekin til baka';
        skilabod = v === 'seinna' ? 'Seinna: atriðið kemur aftur á borðið ' + dagsIs(til) + '.' : 'Ákvörðunin var tekin til baka.';
      } else {
        const cid = await charlizeSkra('Agnar ákvað ' + (v === 'ja' ? 'JÁ' : 'NEI') + ' við atriði á ' + malRef + ' ' + dags + ': „' + texti + '"' +
          (ath ? ' — Athugasemd Agnars: ' + ath : '') + (v === 'nei' ? ' — Ekki leggja þetta til aftur nema ný staðreynd komi fram (ákvörðun stendur).' : ''),
          heimild + ' · skráð af ' + hver);
        nyCid.push(cid);
        if (n.akv_charlize_id) eftir.push([n.akv_charlize_id, cid]);
        Object.assign(n, { akvordun: v, akvordun_at: nuIso, akvordun_af: hver, akv_charlize_id: cid, seinna_til: null,
          athugasemd: (v === 'ja' ? 'Já' : 'Nei') + (ath ? ': ' + ath.slice(0, 160) : '') });
        takki = AM_AKV[v]; hvad = 'Ákvörðunin skráð hjá Charlize (#' + cid + ')';
        skilabod = 'Skráð: ' + AM_AKV[v] + '. Charlize #' + cid + ' — agentarnir lesa það áður en þeir vinna' + (v === 'nei' ? ' og leggja þetta ekki til aftur.' : '.');
      }
    } else if (gerd === 'athugasemd') {
      // Athugasemd ein og sér (engin ákvörðun, ekki Charlize) — tómur texti hreinsar.
      n.athugasemd_agnars = ath || null; n.athugasemd = ath ? 'Athugasemd: ' + ath.slice(0, 160) : 'Athugasemd hreinsuð';
      takki = 'Vista athugasemd'; hvad = ath ? 'Athugasemd vistuð' : 'Athugasemd hreinsuð';
      skilabod = ath ? 'Athugasemdin er vistuð á atriðinu.' : 'Athugasemdin var hreinsuð.';
    } else {
      let vl = await verkefnalistiLesa(n.verkefnalisti_id);
      if (vl) {
        skilabod = 'Þetta er þegar á Verkefnalistanum (' + (vl.status || '?') + ').';
      } else {
        vl = await verkefnalistiStofna('Aðalmál #' + mid + ': ' + texti.slice(0, 160),
          'Agnar setti þetta á Verkefnalistann af Aðalmálum ' + dags + ' (' + hver + ').\n\nATRIÐIÐ (' + (AM_HLUTAR[h] || h) + '): ' + texti +
          (ath ? '\n\nATHUGASEMD AGNARS: ' + ath : '') + '\n\n' + heimild + '.');
        nyVl.push(vl.id);
        Object.assign(n, { verkefnalisti_id: vl.id, verkefnalisti_titill: String(vl.title || '').slice(0, 200), verkefnalisti_at: nuIso });
        skilabod = 'Komið á Verkefnalistann — Claude vinnur verkið.';
      }
      n.athugasemd = 'Á Verkefnalistann';
      takki = 'Á Verkefnalistann'; hvad = 'Atriðið sett á Verkefnalistann';
    }
    if (ath && gerd !== 'athugasemd') n.athugasemd_agnars = ath;
    const saga = Array.isArray(fyrri.saga) ? fyrri.saga.slice(-29) : [];
    saga.push({ at: nuIso, af: hver, gerd, gildi: gerd === 'svar' ? svar.slice(0, 300) : gerd === 'akvordun' ? b.akvordun : gerd === 'athugasemd' ? ath.slice(0, 300) : n.verkefnalisti_id });
    n.saga = saga;
    const lokid = await opna({ nidurstada: n, takki, hvad_gerist: hvad, gogn, titill: ((h === 'sp' ? 'Spurning: ' : '') + texti).slice(0, 200),
      framkvaemt_at: nuIso, framkvaemt_af: hver });
    for (const [gamla, nytt] of eftir) await charlizeVikja(gamla, nytt);
    return P.json(200, { ok: true, skilabod, atridi: synilegtAdalmal(lokid[0]) });
  } catch (e) {
    // Fyrri staða atriðisins stendur: ný Charlize-færsla úr þessu kalli er ógilt, eldri færslur standa óbreyttar.
    // Ný röð sem fékk aldrei neitt er skilin eftir tóm (nidurstada {} — sést ekki á borðinu).
    for (const cid of nyCid) await charlizeOgilda(cid);
    for (const id of nyVl) await P.sbPatch(`verkefnalisti?id=eq.${encodeURIComponent(id)}`, { status: 'sleppt', claude_notes: 'Stofnað af Aðalmálum en skráningin brást í sama kalli — ekki vinna.' }).catch(() => {});
    await opna({ nidurstada: fyrri }).catch(() => {});
    return P.json(502, { error: 'Ekki skráð: ' + String((e && e.message) || e).slice(0, 240) });
  }
}

function synilegtSaga(r) {
  return { id: r.id, tegund: r.tegund, titill: r.titill, takki: r.takki, stada: r.stada, astaeda: r.astaeda, nidurstada: r.nidurstada,
    framkvaemt_at: r.framkvaemt_at, framkvaemt_af: r.framkvaemt_af, updated_at: r.updated_at, athugasemd: r.athugasemd || null };
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
      const svar = { tilbuin, saga: saga.map(synilegtSaga), throskuldur: THROSKULDUR_KR };
      // Aðalmál-borðið (492) biður líka um svör og ákvarðanir á atriðum opnu málanna sinna.
      const qs = (event.queryStringParameters || {});
      if (qs.adalmal != null) {
        const ids = String(qs.adalmal).split(',').map(Number).filter((x) => Number.isInteger(x) && x > 0).slice(0, 10);
        const am = ids.length ? await lesa(`afgreidsla?select=*&tegund=eq.adalmal&gogn->>mal_id=in.(${ids.join(',')})&order=updated_at.desc&limit=500`) : [];
        svar.adalmal = am.filter((r) => r.nidurstada && Object.keys(r.nidurstada).length).map(synilegtAdalmal);
        svar.tilvisanir = ids.length ? await reikningsTenglar(ids).catch(() => ({})) : {};
      }
      return P.json(200, svar);
    } catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
  }
  if (event.httpMethod !== 'POST') return P.json(405, { error: 'GET eða POST' });

  let b; try { b = JSON.parse(event.body || '{}'); } catch (_) { return P.json(400, { error: 'Ógilt JSON' }); }
  if (b.adgerd === 'adalmal') {
    try { return await adalmal(b, event); } catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
  }
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
    // Athugasemd Agnars á verkið (16.11.2026: „sett athugasemd"). Vistast á röðina í hvaða stöðu sem er, lesin til baka;
    // Tony og lotur lesa hana (`select … from afgreidsla where athugasemd is not null`). Tómur texti hreinsar.
    if (b.adgerd === 'athugasemd') {
      const hver = await notandi(event);
      const t = String(b.texti || '').trim().slice(0, 2000);
      const r = await breyta(`afgreidsla?id=eq.${id}`, { athugasemd: t || null, athugasemd_af: t ? hver : null, athugasemd_at: t ? new Date().toISOString() : null });
      if (!r.length) return P.json(404, { error: 'Verkið fannst ekki' });
      return P.json(200, { ok: true, athugasemd: r[0].athugasemd, athugasemd_af: r[0].athugasemd_af, athugasemd_at: r[0].athugasemd_at });
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
module.exports._prufaSending = prufaSending;
module.exports._amLykill = amLykill;
