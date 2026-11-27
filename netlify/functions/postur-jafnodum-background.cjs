// postur-jafnodum-background.cjs — JAFNÓÐUM (26.11.2026).
//
// Agnar 26.11.2026: „nýjustu postana jafnóðum … tilbúið spjald sem ég sendi úr símanum."
// Nýr póstur sem bíður svars → Claude semur drög → „Tilbúið verk"-spjald í Afgreiðslu (515/511). HÉR ER EKKERT SENT:
// spjaldið er drög sem Agnar sendir sjálfur með rauða takkanum, eftir sömu athuganir og allt annað (afgreidsla.cjs athuga()).
//
// Þetta er AÐEINS sjálfvirka smíðin á spjaldinu. Allt hitt er þegar til og óbreytt:
//   • drögin        → /api/postur-reply (Sonnet, rétt íslenska, finnur aldrei upp tölur). Innri tóki (x-sl-toki) í stað köku.
//   • svar-vörnin    → afgreidsla.cjs athuga() Regla 1: er komið NÝRRA skeyti í þráðinn (líka frá öðrum starfsmanni)?
//                      Við skönnun HÉR er það forsíað (sleppt ef sent-skeyti er nýrra en pósturinn) svo ekki fari AI-kall í
//                      þráð sem einhver svaraði þegar. Lendir svar á milli smíði og sýningar merkir GET spjaldið 'urelt'.
//
// HVAÐA PÓSTUR (mælt 26.11.2026): is_question er HÁVÆRT — það merkir svartan-föstudag-pósta, kannanir og kerfistilkynningar
// sem „spurningar". Því er reglan ÞRENGRI en „spurning sem bíður": aðeins póstur í SAMTALI SEM VIÐ EIGUM — til er eldra
// SENT-skeyti frá okkur í sama þræði (`sendum_adur`) og ekkert nýrra svar. Það merki (raunveruleg þátttaka okkar, ekki
// efnislínan) skildi hreint að kúnnann frá markaðspóstinum í mælingunni: Benna/PMT inn, allir fjórir auglýsingapóstar úti.
// Splunkunýtt erindi frá félagi sem hefur aldrei skrifað fær EKKI sjálfvirkt spjald — Agnar svarar því handvirkt (óbreytt).
//   • tvítökuvörnin  → _postsvar-rod.bua: einkvæmur lykill 'svar:<message_id>' (409 → sleppt).
//   • sendingin      → 515 rauði takkinn → afgreidsla.cjs framkvaema → sendaPost.
//
// ÞAK (lærdómur 26.11: ekki búa til nýtt flóð): mest NY_I_KEYRSLU ný spjöld á keyrslu, og aldrei meira en THAK_OPIN opin
// jafnóðum-spjöld í einu. Aðeins eldklar@/bokhald@eldklar.is (Gmail-þráður til); is_question=true; síðustu DAGAR daga.
'use strict';

const P = require('./_portal.cjs');
const PSV = require('./_postsvar-rod.cjs');        // bua(t, afh, createdBy) → röð í afgreidsla (dedup + pósthólf-/þráðar-krafa)
const CL = require('./_adalmal-claude.cjs');        // erSjalfvirkt(netfang)
const HUB = require('./hub-adgangar.cjs');          // innriHausar() → { 'x-sl-toki': <tóki> } fyrir /api/postur-reply

const POSTHOLF = /^(eldklar|bokhald)@eldklar\.is$/i;
const DAGAR = 14;              // hversu langt aftur er leitað að ósvöruðum spurningum
const NY_I_KEYRSLU = 5;        // mest ný spjöld á hverja keyrslu (þak á AI-köllum líka)
const THAK_OPIN = 20;          // aldrei fleiri en þetta opin jafnóðum-spjöld í einu (12 → 20, 27.11.2026: fleiri raunpóstar fá drög)
const CREATED_BY = 'claude-jafnodum';

const p2 = (n) => String(n).padStart(2, '0');
const dagsIs = (d) => { const x = new Date(d); return p2(x.getDate()) + '.' + p2(x.getMonth() + 1) + '.' + x.getFullYear(); };
const dagsTimi = (d) => { const x = new Date(d); return dagsIs(x) + ' ' + p2(x.getHours()) + ':' + p2(x.getMinutes()); };
const grunnur = () => String(process.env.URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');

async function sbJson(r) { if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 160)}`); return r.json(); }
const lesa = (qs) => P.sbGet(qs).then(sbJson);
const q = (s) => encodeURIComponent(String(s));

// Finnur ný skeyti sem bíða svars og eiga EKKERT opið spjald og EKKERT nýrra svar í þræðinum. Les aðeins — engin skrif.
// Skilar { budget, opin, candidates:[…], sleppt:{ sjalfvirkt, svarad, spjald } }.
async function skanna(budget = NY_I_KEYRSLU) {
  // Hve mörg jafnóðum-spjöld eru þegar opin? Þakið er á heildinni, ekki bara þessari keyrslu.
  const opnir = await lesa(`afgreidsla?select=id&created_by=eq.${q(CREATED_BY)}&stada=eq.tilbuid`);
  const opin = opnir.length;
  const budgetRaun = Math.max(0, Math.min(Number(budget) || 0, THAK_OPIN - opin));

  // Nýjustu innkomnu póstarnir í pósthólfum félagsins, með þráð og message_id.
  // 27.11.2026 (Agnar: „Ég vil geta svarað nýjum póstum samdægurs og fengið hjálp við það. Hættið að fela það"): is_question
  // er EKKI lengur skilyrði. Mælt 27.11: Guðmundur (Völuteigur 29), gjaldkeri Eignaumsjónar og „RE: Reikningur" frá Hrauni
  // voru allir is_question=false og fengu engin drög. Nú ræður SENDANDINN: þekktur kúnni/tengiliður (kunnugur) EÐA
  // samtal sem við eigum. is_question gildir aðeins um samtal við óþekktan sendanda.
  const raw = await lesa(
    `email_digest?select=id,message_id,account,folder,sender_name,sender_email,subject,snippet,body_preview,received_at,thread_id,is_question` +
    `&account=ilike.*@eldklar.is&folder=not.ilike.*sent*&thread_id=not.is.null&message_id=not.is.null` +
    `&received_at=gt.${q(new Date(Date.now() - DAGAR * 864e5).toISOString())}` +
    `&order=received_at.desc&limit=80`);
  const postar = raw.filter((e) => POSTHOLF.test(String(e.account || '')));

  const sleppt = { sjalfvirkt: 0, svarad: 0, ekki_i_samtali: 0, spjald: 0, innanhuss: 0, reikningur_til_okkar: 0 };
  const virkir = postar.filter((e) => {
    const s = CL.erSjalfvirkt(e.sender_email); if (s) { sleppt.sjalfvirkt++; return false; }
    if (EIGIN_LEN.test(String(e.sender_email || ''))) { sleppt.innanhuss++; return false; }
    if (REIKNINGUR_TIL_OKKAR.test(String(e.subject || ''))) { sleppt.reikningur_til_okkar++; return false; }
    return true;
  });
  if (!virkir.length) return { budget: budgetRaun, opin, candidates: [], sleppt };

  // Öll SENT-skeyti okkar í þessum þráðum (frá okkur EÐA öðrum starfsmanni). Ein fyrirspurn fyrir alla þræði.
  const threads = [...new Set(virkir.map((e) => e.thread_id))];
  const sent = threads.length
    ? await lesa(`email_digest?select=thread_id,received_at&thread_id=in.(${threads.map(q).join(',')})&folder=ilike.*sent*`)
    : [];
  const sentEftirThraedi = {};
  for (const s of sent) { (sentEftirThraedi[s.thread_id] || (sentEftirThraedi[s.thread_id] = [])).push(s.received_at); }

  // Á spjald þegar (eða var afgreitt)? Einkvæmur lykill 'svar:<message_id>'. Ein fyrirspurn fyrir alla.
  const lyklar = virkir.map((e) => 'svar:' + e.message_id);
  const til = lyklar.length
    ? await lesa(`afgreidsla?select=lykill&lykill=in.(${lyklar.map(q).join(',')})`)
    : [];
  const erSpjald = new Set(til.map((x) => x.lykill));

  const candidates = [];
  const kunnCache = {};
  for (const e of virkir) {
    if (candidates.length >= budgetRaun) break;
    const ts = sentEftirThraedi[e.thread_id] || [];
    if (ts.some((x) => x > e.received_at)) { sleppt.svarad++; continue; }        // einhver svaraði þegar nýrra en þessum — ekkert spjald
    if (erSpjald.has('svar:' + e.message_id)) { sleppt.spjald++; continue; }
    const samtal = ts.some((x) => x <= e.received_at);
    const nf = String(e.sender_email || '').toLowerCase();
    if (!(nf in kunnCache)) kunnCache[nf] = await kunnugur(nf);
    // Þekktur sendandi → alltaf drög. Óþekktur → aðeins í samtali sem við eigum og sé það spurning (fyrri regla).
    if (!kunnCache[nf] && !(samtal && e.is_question === true)) { sleppt.ekki_i_samtali++; continue; }
    candidates.push(e);
  }
  return { budget: budgetRaun, opin, candidates, sleppt };
}

const EIGIN_LEN = /@(eldklar\.is|brunaholf\.is)$/i;                       // innanhússpóstur (áframsendingar starfsmanna)
const REIKNINGUR_TIL_OKKAR = /^(reikningur frá|.*sölureikningur\s+s-\d)/i;     // reikningar birgja TIL okkar — ekki svarað

// 27.11.2026: er sendandinn þekktur? Netfangið í fyrirtækjaskrá, samþykktur tengiliður, eða við höfum SENT á það áður.
// Aðeins nákvæmt netfang (aldrei lén — gmail.com o.fl. myndu hleypa öllum inn). Les aðeins.
async function kunnugur(netfang) {
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(netfang)) return false;
  const k = q(netfang);
  try {
    const [f, t, s] = await Promise.all([
      lesa(`fyrirtaeki?select=id&deleted_at=is.null&netfang=ilike.*${k}*&limit=1`),
      lesa(`charlize_contacts?select=id&netfang=ilike.${k}&status=eq.approved&limit=1`),   // pending = sjálfvirk lén-pörun (markaðspóstur, birgjar)
      lesa(`email_digest?select=id&folder=ilike.*sent*&to_addresses=ilike.*${k}*&limit=1`),
    ]);
    return !!(f.length || t.length || s.length);
  } catch (_) { return false; }
}

// Léttur kúnna-uppfletting: fyrirtæki með þetta netfang skráð. Aðeins nafn + kt (postur-reply notar það, finnur ekki upp neitt).
async function kunni(netfang) {
  try {
    const f = await lesa(`fyrirtaeki?select=nafn,kennitala&deleted_at=is.null&netfang=ilike.*${q(netfang)}*&limit=1`);
    return f[0] ? { name: f[0].nafn || '', kt: f[0].kennitala || '' } : null;
  } catch (_) { return null; }
}

// 27.11.2026 (Agnar: „heimsk svör, engin hjálp"): drögin fengu `invoices: []` og gátu því aðeins skrifað „við skoðum
// málið" — Bílabúð Benna spurði um reikning á kt. 520402-2410 með eindaga 2/12, og R-001367 (78.750 kr, krafa send
// 24.11) stóð í grunninum. Nú fylgja reikningar á kennitölurnar sem nefndar eru í póstinum (og kt sendanda) með.
const KT_RE = /\b(\d{6})-?(\d{4})\b/g;
function ktIPosti(e) {
  const t = [e.subject, e.body_preview, e.snippet].filter(Boolean).join('\n');
  return [...new Set([...t.matchAll(KT_RE)].map((m) => m[1] + '-' + m[2]))].slice(0, 4);
}
async function reikningarFyrir(kts) {
  if (!kts.length) return [];
  try {
    const fra = new Date(Date.now() - 400 * 864e5).toISOString();
    const s = await lesa(`solur?select=num,created_at,samtals,paid_at,krafa_sent_at,customer_nafn,status,is_credit` +
      `&customer_kt=in.(${kts.map(q).join(',')})&created_at=gt.${q(fra)}&status=eq.final&order=created_at.desc&limit=12`);
    return s.filter((x) => !x.is_credit && x.num).map((x) => ({
      num: x.num, date: dagsIs(x.created_at), samtals: x.samtals, paid: !!x.paid_at,
      sent: x.krafa_sent_at ? dagsIs(x.krafa_sent_at) : null, nafn: x.customer_nafn || '',
    }));
  } catch (_) { return []; }
}

// Semja drög með sömu vél og „Reikninga-póstur" (/api/postur-reply) — innri tóki í stað köku. Skilar { subject, body, summary }.
async function semjaDrog(e) {
  const hausar = Object.assign({ 'Content-Type': 'application/json' }, await HUB.innriHausar());
  const customer = await kunni(e.sender_email);
  const kts = ktIPosti(e);
  if (customer && customer.kt && !kts.includes(customer.kt)) kts.push(customer.kt);
  const r = await fetch(grunnur() + '/api/postur-reply', {
    method: 'POST', headers: hausar, signal: AbortSignal.timeout(22000),
    body: JSON.stringify({
      email: { sender_name: e.sender_name || '', sender_email: e.sender_email || '', subject: e.subject || '', body: e.body_preview || e.snippet || '' },
      customer, invoices: await reikningarFyrir(kts),
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j || !String(j.body || '').trim()) throw new Error('postur-reply: ' + (j && (j.error || j.detail) || ('HTTP ' + r.status)));
  return { subject: j.subject || '', body: String(j.body), summary: j.summary || '' };
}

function afHverju(e, summary) {
  return [
    { texti: 'Claude samdi þessi drög sjálfkrafa úr nýjum pósti sem beið svars — lestu og lagaðu áður en þú sendir. Ekkert fer fyrr en þú ýtir á rauða takkann.', heimild: 'postur-jafnodum · ' + dagsIs(Date.now()) },
    { texti: 'Pósturinn: „' + (e.subject || '(efnislaust)') + '" frá ' + (e.sender_name || e.sender_email || '?') + ', ' + dagsTimi(e.received_at), heimild: 'email_digest #' + e.id, opna: { tegund: 'post', id: e.id } },
  ].concat(summary ? [{ texti: 'Erindi: ' + summary, heimild: 'Claude' }] : []);
}

// Keyrsla: semur drög og býr til spjald fyrir hvern frambjóðanda. Hvert skref sér um sig — ein bilun stöðvar ekki hin.
async function vinna({ budget = NY_I_KEYRSLU } = {}) {
  const s = await skanna(budget);
  const bjo_til = [], villur = [];
  for (const e of s.candidates) {
    try {
      const drog = await semjaDrog(e);
      const id = await PSV.bua({ tegund: 'tolvupostur', texti: drog.body, post: { digest_id: e.id } }, afHverju(e, drog.summary), CREATED_BY);
      bjo_til.push({ afgreidsla_id: id, digest_id: e.id, fra: e.sender_email, efni: e.subject });
    } catch (err) {
      if (err && err.kodi === 409) { s.sleppt.spjald++; continue; }   // varð til hjá annarri keyrslu á milli — allt í lagi
      const vm = String((err && err.message) || err).slice(0, 200);
      try { console.error('postur-jafnodum: digest #' + e.id + ' brást — ' + vm); } catch (_) {}
      villur.push({ digest_id: e.id, villa: vm });
    }
  }
  return { opin_fyrir: s.opin, budget: s.budget, skodad: s.candidates.length, bjo_til, sleppt: s.sleppt, villur };
}

// Bakgrunnsfall: ræst af cron (postur-jafnodum-cron) eða handvirkt (postur-jafnodum?keyra=1). Skilar 202 strax; 15 mín. þak.
exports.handler = async () => {
  try {
    const r = await vinna({ budget: NY_I_KEYRSLU });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ ok: true }, r)) };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: String((e && e.message) || e).slice(0, 300) }) };
  }
};

module.exports.skanna = skanna;
module.exports.vinna = vinna;
module.exports._semjaDrog = semjaDrog;
module.exports.THAK_OPIN = THAK_OPIN;
module.exports.NY_I_KEYRSLU = NY_I_KEYRSLU;
module.exports.CREATED_BY = CREATED_BY;
