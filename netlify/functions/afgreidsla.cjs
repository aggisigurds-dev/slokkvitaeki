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
//        gerd 'claude' (fyrirmaeli?)      → „Biddu Claude": bakgrunnsfallið adalmal-claude-background skrifar nidurstada.claude
//        gerd 'claude_samthykkja'         → tillaga Claude → verk á Verkefnalistann, eða póstsvar í Afgreiðslu (Agnar sendir þaðan)
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

require('./_bh-toki.cjs'); // lota 13: köll á föll Brunahólfs fá tíma-tóka (x-hub-toki)
const crypto = require('crypto');
const P = require('./_portal.cjs');
const H = require('./_radgjafinn-hlid.cjs');
const V = require('./_vip-postur.cjs');   // sama VIP-pörun og VIP-vaktin (513) — netfang, lén, kt; aldrei eftir nafni
const HUB = require('./hub-adgangar.cjs');
const CL = require('./_adalmal-claude.cjs');
const M = require('./_merkja.cjs');
const PSV = require('./_postsvar-rod.cjs');   // póstsvar Claude → röð í afgreidsla (sameiginlegt með 519)      // 519 Merkja og keyra — merki á línum Þjónustuborðsins (sama Biddu Claude-vél)
const DYR = require('./_afgreidsla-dyr.cjs');   // 18.11.2026: dyr á hverjum lið — beint á staðinn þar sem verkið er unnið
const SAM = require('./_afgreidsla-sameina.cjs');   // tegund 'sameina' (Verkefnavaktin) — hrein rökfræði, prófanleg sér
const FERSK = require('./_afgreidsla-ferskleiki.cjs');   // 27.11.2026: verk/símtöl endurmæld við hverja opnun

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

// 17.11.2026 (Agnar: „ennþá vitlaus kennitala á bölv reikningnum“): Afgreiðsla #55 tengdi á PDF GAMLA reikningsins sem
// „Reikningur R-… (PDF)“ — kreditfærðan, á gömlu kennitölunni. Kreditfærður reikningur er nú merktur í tenglinum (opnast enn,
// engu eytt). Sama regla og alls staðar: 517 ReikningurSolu.kreditMap (solur credit_of / kredit_a).
const RS = require('./_reikningur-solu.cjs');
async function kreditFyrir(nums) {
  const n = [...new Set((nums || []).filter((x) => /^R-\d{6}$/.test(String(x || ''))))];
  if (!n.length) return {};
  try {
    const solur = await lesa(`solur?select=id,num,samtals&num=in.(${n.join(',')})`);
    const ids = solur.map((x) => x.id).filter((x) => x != null);
    const ors = [`kredit_a.in.(${n.join(',')})`].concat(ids.length ? [`credit_of.in.(${ids.join(',')})`] : []);
    const kn = await lesa(`solur?select=num,credit_of,kredit_a,status,is_credit,samtals&is_credit=eq.true&or=(${ors.join(',')})`);
    return RS.kreditStada(kn, solur);   // óháð rýni 17.11 (2): fullt kredit ≠ hlutakredit
  } catch (_) { return {}; }
}
// km = kreditStada: fullt kredit → „gildir ekki"; hlutakredit → reikningurinn gildir, kreditið nefnt.
const kr_ = (n) => Math.round(Number(n) || 0).toLocaleString('de-DE');
const reiknTexti = (nr, km) => {
  const e = km && km[nr];
  if (!e) return 'Reikningur ' + nr + ' (PDF)';
  return e.full ? 'Reikningur ' + nr + ' (PDF) — KREDITFÆRÐUR með ' + e.notur.join(', ') + ', gildir ekki'
    : 'Reikningur ' + nr + ' (PDF) — kreditað að hluta (−' + kr_(e.kreditad) + ' kr, ' + e.notur.join(', ') + ')';
};
const kreditNr = (km, nr) => (km && km[nr] && km[nr].full) ? km[nr].notur.join(', ') : null;
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

// ── Viðtakendur (kóðarýni 17.11.2026) ─────────────────────────────────────────────────────────────────────────────────
// Hvert netfang í to/cc verður að eiga UPPRUNA: (a) í pósti (sendandi eða viðtakandi skeytis í email_digest), (b) í
// fyrirtækjaskrá, (c) samþykktur tengiliður, eða (d) skráð heimild á verkinu sjálfu (`gogn.heimildir_netfanga`
// { netfang: 'hvaðan' }, t.d. vefur félagsins) — sýnd orðrétt. Ágiskun (`gogn.agiskun`) stendur RAUÐ þar til innskráður
// stjórnandi staðfestir hana (`adgerd:'agiskun', val:'stadfesta'`) eða tekur netfangið út (`val:'fjarlaegja'`); þá fer
// pósturinn án þess. Netfang án uppruna sem er EKKI merkt ágiskun stöðvar líka — það var gatið sem rýnin fann.
const erSvar = (sv) => !!(sv && (sv.message_id || sv.thread_id || sv.digest_id));
const vidtakendur = (g) => [...new Set([].concat(g.to || [], g.cc || []).map(addr).filter(Boolean))];
async function upprunaNetfangs(e) {
  const k = encodeURIComponent(e);
  const [p, f, t] = await Promise.all([
    lesa(`email_digest?select=id&or=(sender_email.ilike.${k},to_addresses.ilike.*${k}*)&limit=1`),
    lesa(`fyrirtaeki?select=id&deleted_at=is.null&netfang=ilike.*${k}*&limit=1`),
    lesa(`charlize_contacts?select=id&netfang=ilike.${k}&status=eq.approved&limit=1`),
  ]);
  return p.length ? 'í pósti' : f.length ? 'í fyrirtækjaskrá' : t.length ? 'samþykktur tengiliður' : null;
}
let _uppruni = upprunaNetfangs;   // prófin skipta um (module.exports._setjaUppruna) — enginn gagnagrunnur í prófum
async function vidtakendaAthuganir(g) {
  const ut = [];
  const vidt = vidtakendur(g);
  const agiskun = new Set([].concat(g.agiskun || []).map(addr).filter(Boolean));
  const stadfest = new Map([].concat(g.agiskun_stadfest || []).map((x) => [addr(x && x.netfang), x]).filter((x) => x[0]));
  const heimildir = {}; Object.entries(g.heimildir_netfanga || {}).forEach(([k, v]) => { if (addr(k)) heimildir[addr(k)] = String(v || '').slice(0, 200); });
  const thekkt = [];
  for (const e of vidt) {
    if (agiskun.has(e)) {
      const s = stadfest.get(e);
      ut.push(s ? { texti: 'Ágiskað netfang staðfest af ' + (s.af || '?') + ' ' + String(s.at || '').slice(0, 16).replace('T', ' ') + ': ' + e, ok: true }
        : { texti: '⚠ ÁGISKUN, óstaðfest: ' + e + ' — staðfestu netfangið eða taktu það út áður en sent er', ok: false, agiskun: e });
      continue;
    }
    if (heimildir[e]) { ut.push({ texti: e + ' — heimild skráð á verkið: ' + heimildir[e], ok: true }); continue; }
    let u = null, villa = false;
    try { u = await _uppruni(e); } catch (_) { villa = true; }
    if (u) thekkt.push(e + ' (' + u + ')');
    else ut.push({ texti: villa ? 'Náði ekki að fletta upp ' + e + ' — ekkert sent' : e + ': hvorki í pósti, fyrirtækjaskrá né tengiliðaskrá og ekki merkt ágiskun — ekkert sent fyrr en uppruni er skráður', ok: false });
  }
  if (thekkt.length) ut.unshift({ texti: 'Viðtakendur með uppruna: ' + thekkt.join(', '), ok: true });
  return ut;
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
    // 16.11.2026: aldrei svar á sjálfvirkt netfang (noreply, fréttabréf) — prufa fann það gerast.
    if ([].concat(g.to || []).some((t) => CL.erSjalfvirkt(addr(t)))) a.push({ texti: 'Viðtakandi er sjálfvirkt netfang (noreply/fréttabréf) — því er ekki svarað', ok: false });
    if (sv.thread_id && sv.received_at) {
      // Regla 1: er komið nýrra skeyti í þráðinn (frá hvorum sem er)?
      const nyrri = await lesa(`email_digest?select=id,received_at,folder,sender_email&thread_id=eq.${encodeURIComponent(sv.thread_id)}` +
        `&received_at=gt.${encodeURIComponent(sv.received_at)}&order=received_at.desc&limit=5`);
      const fra_okkur = nyrri.filter((x) => /sent/i.test(String(x.folder || '')));
      if (nyrri.length) urelt = fra_okkur.length ? 'Þráðnum hefur þegar verið svarað (' + String(fra_okkur[0].received_at).slice(0, 16).replace('T', ' ') + ')'
        : 'Nýtt skeyti kom í þráðinn ' + String(nyrri[0].received_at).slice(0, 16).replace('T', ' ') + ' — svarið á ekki lengur við';
      a.push({ texti: urelt || 'Ekkert nýrra skeyti í þræðinum — þú svarar því nýjasta', ok: !urelt });
    } else if (g.nytt === true && !erSvar(sv)) {
      // 17.11.2026: NÝR póstur, ekki svar (t.d. skýrsla til félags sem hefur aldrei skrifað okkur).
      // Enginn þráður til að bera saman við; verkið verður að bera `nytt: true` berum orðum, annars gildir reglan að neðan.
      a.push({ texti: 'Nýr póstur — ekki svar í þræði, svo „nýjasta skeytið“ á ekki við', ok: true });
    } else if (g.nytt === true) {
      // Kóðarýni 17.11.2026: `nytt` mátti ekki opna leið framhjá reglu 1 fyrir póst sem er í raun SVAR (svar_vid sett,
      // sendingin setur inReplyTo) en vantar þráðinn. Annaðhvort hreinn nýr póstur (ekkert svar_vid) eða svar með þræði.
      a.push({ texti: 'Merkt sem nýr póstur en ber svar við skeyti (svar_vid) án þráðar — ekki hægt að staðfesta að svarið sé við nýjasta skeytið. Ekkert sent.', ok: false });
    } else {
      a.push({ texti: 'Þráður óþekktur — ekki hægt að staðfesta að svarið sé við nýjasta skeytið', ok: false });
    }
    a.push(...await vidtakendaAthuganir(g));
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
  } else if (row.tegund === 'sameina') {
    const s = await SAM.sameinaAthuganir(row.gogn || {}, lesa);
    for (const x of s.a) a.push(x);
    if (s.urelt) urelt = s.urelt;
  } else if (row.tegund === 'verk' || row.tegund === 'simtal') {
    // 27.11.2026: Dagsverk og símtöl endurmæld við hverja opnun (drög farin? reikningur greiddur? aldur) — sjá _afgreidsla-ferskleiki.
    const s = await FERSK.athugaFerskleika(row, lesa).catch(() => ({ a: [], urelt: null }));
    for (const x of s.a) a.push(x);
    if (s.urelt) urelt = s.urelt;
  }
  // Sérflokkarnir (Dagsverk, Bókanir) eru handvaldir af Agnari, ekki raðað eftir virði — þröskuldurinn á ekki við þá
  // (rýni 19.11.2026: dagsverk með lága upphæð fékk óvirkan takka og 409 við framkvæmd).
  if (row.virdi_kr != null && kr(row.virdi_kr) < THROSKULDUR_KR && row.tegund !== 'krafa' && row.tegund !== 'sameina' && !SERFLOKKAR.includes((row.gogn || {}).flokkur)) {
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
  const [reikn, km] = rnr.length ? await Promise.all([
    lesa(`customer_documents?select=id,invoice_number,storage_path,drive_file_id,is_duplicate&doc_type=eq.reikningur&invoice_number=in.(${rnr.join(',')})&order=id.desc`).catch(() => []),
    kreditFyrir(rnr)]) : [[], {}];
  const reiknPdf = (nr) => { const d = reikn.find((x) => x.invoice_number === nr && !x.is_duplicate) || reikn.find((x) => x.invoice_number === nr); return d ? skjalSlod(d) : ''; };
  return (r) => {
    if (!r || typeof r !== 'object') return null;
    if (r.tegund === 'skjal') { const d = skjol.find((x) => x.id === Number(r.id)); const u = d && skjalSlod(d); return u ? { url: u, texti: DOC_HEITI[d.doc_type] || 'Skjalið (PDF)' } : null; }
    if (r.tegund === 'sala') {
      const s = solur.find((x) => x.id === Number(r.id)); if (!s || !s.num) return null;
      const pdf = reiknPdf(s.num);
      return pdf ? { url: pdf, texti: reiknTexti(s.num, km), kreditfaert: kreditNr(km, s.num) } : { url: '/#sale/' + encodeURIComponent(s.num), texti: 'Salan ' + s.num + ' í appinu' + (kreditNr(km, s.num) ? ' — KREDITFÆRÐ með ' + kreditNr(km, s.num) : '') };
    }
    if (r.tegund === 'post') { const p = postar.find((x) => x.id === Number(r.id)); const u = p && gmailSlod(p.account, p.thread_id); return u ? { url: u, texti: 'Pósturinn í Gmail' } : null; }
    if (r.tegund === 'payday') {
      const nr = String(r.numer || '').trim(); if (!nr) return null;
      if (r.felag === 'brunaholf' && /^\d{1,7}$/.test(nr)) return { url: 'https://brunaholf.netlify.app/api/payday-invoice-pdf?tilvisun=' + encodeURIComponent(nr), texti: 'Payday-reikningur ' + nr + ' (PDF)' };
      if (r.felag === 'slokkvitaeki') { const u = reiknPdf(nr); return u ? { url: u, texti: reiknTexti(nr, km), kreditfaert: kreditNr(km, nr) } : null; }
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
  const [docs, inv, km] = await Promise.all([
    slokk.length ? lesa(`customer_documents?select=invoice_number,storage_path,drive_file_id,is_duplicate&doc_type=eq.reikningur&invoice_number=in.(${slokk.join(',')})&order=id.desc`) : [],
    bru.length ? lesa(`invoices?select=tilvisun&source=eq.payday&payday_uuid=not.is.null&tilvisun=in.(${bru.join(',')})`) : [],
    kreditFyrir(slokk),
  ]);
  const ut = {};
  for (const n of slokk) {
    const d = docs.find((x) => x.invoice_number === n && !x.is_duplicate) || docs.find((x) => x.invoice_number === n);
    const u = d && skjalSlod(d);
    if (u) ut[n] = { url: u, texti: reiknTexti(n, km), kreditfaert: kreditNr(km, n) };
  }
  for (const t of new Set(inv.map((x) => String(x.tilvisun)))) ut['R-' + t] = { url: 'https://brunaholf.netlify.app/api/payday-invoice-pdf?tilvisun=' + encodeURIComponent(t), texti: 'Payday-reikningur ' + t + ' (PDF, Brunahólf)' };
  return ut;
}

// Það sem skjárinn fær — ekkert úr gögnunum sem skjárinn þarf ekki.
// VIP (17.11.2026, símasíðan 515): á verkið við félag á VIP-vaktinni? Pósturinn: viðtakendur (to, cc) paraðir eins og
// VIP-vaktin parar sendanda; önnur verk: kennitala í gögnunum. Skilar aðeins félagsheiti og leið — aldrei tengiliðum.
function vipFyrir(g, tegund, visir) {
  if (!visir || !g) return null;
  if (tegund === 'tolvupostur') {
    for (const a of [].concat(g.to || [], g.cc || [])) {
      const p = V.para({ sender_email: a }, visir);
      if (p && p.felag) return { felag: p.felag.nafn, hvernig: p.hvernig };
    }
  }
  const kt = String(g.kennitala || g.kt || '').replace(/\D/g, '');
  const f = kt.length === 10 && visir.kt ? visir.kt.get(kt) : null;
  return f ? { felag: f.nafn, hvernig: 'kennitala' } : null;
}
async function vipVisir() {
  const radir = await lesa('fyrirtaeki?select=id,nafn,kennitala,netfang,vip,vip_svartimi_min&vip=eq.true&deleted_at=is.null&order=id');
  const kts = [...new Set(radir.map((r) => String(r.kennitala || '').replace(/\D/g, '')).filter((k) => k.length === 10))];
  const ktForm = kts.flatMap((k) => [k, k.slice(0, 6) + '-' + k.slice(6)]);
  const tengl = ktForm.length ? await lesa('charlize_contacts?select=kennitala,netfang,len,status&kennitala=in.(' + ktForm.map(encodeURIComponent).join(',') + ')') : [];
  return V.byggjaVisi(radir, tengl);
}

// V = niðurstaða DYR.saekja fyrir ALLA liðina (ein umferð í GET). Vanti hana (stakt verk eftir vistun) er flett upp fyrir þennan eina.
/* Keyrir fn á hverju staki, mest n í einu, og skilar niðurstöðunum Í SÖMU RÖÐ. Kasti eitt, kastar heildin (eins og áður). */
async function iHopum(listi, n, fn) {
  const ut = new Array(listi.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, listi.length) }, async () => { while (i < listi.length) { const k = i++; ut[k] = await fn(listi[k]); } }));
  return ut;
}
// Sérflokkar (19.11.2026): liðir með gogn.flokkur úr þessum lista eiga eigin ham í viðmótinu (511/515/afgreidsla.html) og eru
// sóttir sér. Ekkert annað gildi úr gogn (sem agentar skrifa) verður flokkur.
const SERFLOKKAR = ['dagsverk', 'bokun'];
const SER_THAK = 60;   // þak á HVERN sérflokk fyrir sig

async function synilegt(row, visir, V) {
  const ath = await athuga(row);
  const g = row.gogn || {};
  const rok = Array.isArray(row.af_hverju) ? row.af_hverju : [];
  // Sjálfgefnar tilvísanir: pósturinn sem er svarað og salan sem krafan er fyrir — þær eru alltaf í gögnunum sjálfum.
  const sjalfgefid = [];
  if (row.tegund === 'tolvupostur' && g.svar_vid && g.svar_vid.digest_id) sjalfgefid.push({ tegund: 'post', id: g.svar_vid.digest_id });
  if (row.tegund === 'krafa' && g.sale_id) sjalfgefid.push({ tegund: 'sala', id: g.sale_id });
  const leysa = await leysaTilvisanir(rok.map((x) => x && x.opna).concat(sjalfgefid)).catch(() => () => null);
  const o = { id: row.id, tegund: row.tegund, flokkur: SERFLOKKAR.includes(g.flokkur) ? g.flokkur : null, titill: row.titill, takki: row.takki, hvad_gerist: row.hvad_gerist,
    af_hverju: rok.map((x) => { const s = x && x.opna ? leysa(x.opna) : null; return s ? Object.assign({}, x, { slod: s }) : x; }),
    virdi_kr: row.virdi_kr, created_at: row.created_at, created_by: row.created_by,
    forgangur: row.forgangur == null ? null : Number(row.forgangur), vip: vipFyrir(g, row.tegund, visir),
    athugasemd: row.athugasemd || null, athugasemd_af: row.athugasemd_af || null, athugasemd_at: row.athugasemd_at || null, ...ath };
  // Dyr: takkar sem opna málið, reikninginn, félagið eða hringja — bregðist uppflettingin kemur liðurinn samt, án dyra.
  try { Object.assign(o, DYR.dyrFyrir(row, V || await DYR.saekja([row], lesa).catch(() => null))); } catch (_) { o.dyr = []; o.listi = []; }
  if (row.tegund === 'tolvupostur') {
    o.post = { account: g.account, to: g.to || [], cc: g.cc || [], subject: g.subject || '', texti: g.texti || '', vidhengi: (g.vidhengi || []).filter(Boolean).map((v) => v.filename),
      // 18.11.2026 (Agnar: „sýnt þarna í svarinu skjalið svo ég geti alltaf opnað það og staðfest“): sama skjal og
      // sendingin sækir, sem tengill. `vidhengi` (nöfnin ein) stendur áfram fyrir eldri sýnir.
      vidhengi_opna: (g.vidhengi || []).filter(Boolean).map(vidhengiSyn) };
    o.svar_vid = g.svar_vid ? { fra: g.svar_vid.fra || '', dags: String(g.svar_vid.received_at || '').slice(0, 16).replace('T', ' '), efni: g.svar_vid.efni || '', texti: String(g.svar_vid.texti || '').slice(0, 1500),
      slod: (g.svar_vid.digest_id && leysa({ tegund: 'post', id: g.svar_vid.digest_id })) || (gmailSlod(g.account, g.svar_vid.thread_id) ? { url: gmailSlod(g.account, g.svar_vid.thread_id), texti: 'Pósturinn í Gmail' } : null) } : null;
  } else if (row.tegund === 'simtal') {
    o.simtal = { hverjum: g.hverjum || '', simi: g.simi || '', handrit: g.handrit || '' };
  } else if (row.tegund === 'verk') {
    o.verk = { lysing: g.lysing || '' };
  } else if (row.tegund === 'krafa') {
    o.krafa = { sale_id: g.sale_id, r_numer: g.r_numer || '', slod: g.sale_id ? leysa({ tegund: 'sala', id: g.sale_id }) : null };
  } else if (row.tegund === 'sameina') {
    o.sameina = SAM.synilegt(g);
  }
  return o;
}

// Slóðin sem opnar NÁKVÆMLEGA skjalið sem gmail-send hengir við: `url` (opin slóð, t.d. Supabase Storage) eða
// `driveId` (Drive-skrá). `content` (base64, teiknað í vafra) á enga slóð → null og nafnið birtist eitt.
// Slóðin kemur úr gogn.vidhengi, sem agentar skrifa, og endar í href hjá Agnari sem sér aðeins skráarheitið.
// Því fær AÐEINS https-slóð á traustan hýsil tengil (eigin Supabase-geymsla, Drive, vefirnir tveir) — aldrei
// javascript:, data:, //annar-vefur, notandi@hýsill né óþekktur vefur (rýni 18.11.2026: vefveiðaflötur).
const TRAUSTIR_HYSLAR = (() => {
  const h = new Set(['drive.google.com', 'docs.google.com', 'slokkvitaeki.netlify.app', 'brunaholf.netlify.app']);
  try { h.add(new URL(process.env.SUPABASE_URL).host.toLowerCase()); } catch (_) { /* env vantar (próf) */ }
  return h;
})();
function hysillAf(url) {
  try { const u = new URL(String(url)); return (u.username || u.password) ? null : u.host.toLowerCase(); } catch (_) { return null; }
}
function vidhengiSlod(v) {
  if (!v) return null;
  if (typeof v.url === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(v.url)) { const h = hysillAf(v.url); return h && TRAUSTIR_HYSLAR.has(h) ? v.url : null; }
  if (v.driveId != null && /^[\w-]{10,}$/.test(String(v.driveId))) return 'https://drive.google.com/file/d/' + String(v.driveId) + '/view';
  return null;
}
// Það sem sýnin fær: nafn + slóð. Slóð á ÓÞEKKTAN vef fær ekki tengil heldur viðvörun með nafni vefsins, svo það
// óvenjulega sjáist í stað þess að felast á bak við skráarheiti. (Sendingin sjálf er óbreytt — hún les g.vidhengi.)
function vidhengiSyn(v) {
  const nafn = (v && v.filename) || 'skjal';
  const url = vidhengiSlod(v);
  if (url || !v || typeof v.url !== 'string' || !v.url) return { nafn, url };
  return { nafn: nafn + ' — ⚠ slóð á ' + (hysillAf(v.url) || 'óþekktan vef') + ', opnast ekki héðan', url: null };
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
      const ny = await P.sbPost('verkefnalisti', { title: String(v.title || row.titill).slice(0, 200), description: '[AGNAR] ' + String(v.description || '').slice(0, 3980),
        status: 'beidni', category: v.category || 'villa', assigned_agent: v.assigned_agent || 'claude-code', vefur: v.vefur || 'slokkvitaeki', priority: v.priority || 2 }).then(sbJson);
      nidurstada = { verkefnalisti_id: ny[0] && ny[0].id, athugasemd: 'Sett á Verkefnalistann' };
    } else if (row.tegund === 'sameina') {
      // „Sameina og birta": skrifar beiðni í automation_triggers. Watcher á vélinni keyrir verkefna-sameina.js
      // (rebase á nýjasta master/main, prófin aftur, sameina, ýta með [deploy], staðfesta með build.json, verk -> klarad).
      // EKKERT er sameinað hér — aðeins beiðnin búin til. Árekstur / fallin próf -> ekkert sameinað, verk aftur í beidni.
      if (body.prufa) { await skila('tilbuid'); return P.json(200, { ok: true, prufa: true, athuganir: ath.athuganir }); }
      const ny = await P.sbPost('automation_triggers', SAM.triggerBody(row.gogn, hver, id)).then(sbJson);
      nidurstada = { trigger_id: ny[0] && ny[0].id, athugasemd: 'Sameining sett í gang — rebase á nýjasta ' + SAM.adalgrein((row.gogn || {}).vefur) + ', prófin aftur, sameina ef allt stenst.' };
    } else {
      // Símtal: niðurstaðan er athugasemd Agnars — úr kallinu, annars sú sem hann vistaði á verkið (492e).
      nidurstada = { athugasemd: String(body.athugasemd || row.athugasemd || '').slice(0, 500) || null };
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
    charlize_id: n.akv_charlize_id || n.svar_charlize_id || null, stada: r.stada, updated_at: r.updated_at,
    // „Biddu Claude": allt nema einnota nonce (heimild bakgrunnsfallsins á aldrei að fara til vafrans).
    claude: n.claude ? Object.fromEntries(Object.entries(n.claude).filter(([k]) => k !== 'nonce')) : null };
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

const kyrrt = (m) => Object.assign(new Error(m), { kodi: 409 });
// Rofi „Biddu Claude" (app_kv adalmal_claude {virkt}). AF þar til raunverulegt Opus-kall hefur staðist í loftinu — lykillinn
// er ekki aðgengilegur utan Netlify, svo það kall er ekki hægt að prófa annars staðar. ADALMAL_CLAUDE_VIRKT=1 í prófun.
const claudeVirkt = () => (process.env.ADALMAL_CLAUDE_VIRKT === '1' ? Promise.resolve(true)
  : lesa('app_kv?select=value&key=eq.adalmal_claude&limit=1').then((x) => !!(x[0] && x[0].value && x[0].value.virkt)).catch(() => false));   // höfnun sem breytir engu (409), ekki bilun
// Ræsir „Biddu Claude" í bakgrunni. Staðbundin prófun (ADALMAL_CLAUDE_INNI=1) keyrir vinnuna í sama ferli án þess að bíða.
async function kveikjaClaude(lykill, nonce) {
  if (process.env.ADALMAL_CLAUDE_INNI === '1') { CL.vinna(lykill, nonce).catch(() => {}); return; }
  const grunnur = String(process.env.URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
  const r = await fetch(grunnur + '/.netlify/functions/adalmal-claude-background', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lykill, nonce }), signal: AbortSignal.timeout(8000) });
  if (r.status !== 202 && r.status !== 200) throw new Error('bakgrunnsfallið svaraði ' + r.status);
}

// Póstsvar Claude → „tilbúið verk“ í Afgreiðslu (Agnar sendir þaðan með rauða takkanum, eftir sömu athuganir og allt annað).
// Sameiginlegt: „Biddu Claude“ (claude_samthykkja á Aðalmálum) og Merkja og keyra (_merkja.cjs, eftir mat Óðins).
// Kastar kyrrt(…) ef pósturinn sendist ekki héðan eða drögin standast ekki athuganir — ekkert verður til þá (úrelt röð).
async function postsvarAfgreidsla(t, afh, createdBy) {
  const nyRod = await PSV.bua(t, afh, createdBy);
  const ath2 = await athuga(nyRod);
  if (!ath2.ok) {
    await breyta(`afgreidsla?id=eq.${nyRod.id}`, { stada: 'urelt', astaeda: ath2.urelt || ('Athugun stóðst ekki: ' + ath2.athuganir.filter((a) => !a.ok).map((a) => a.texti).join('; ')).slice(0, 300) });
    throw kyrrt('Póstsvarið stenst ekki athuganir: ' + (ath2.urelt || ath2.athuganir.filter((a) => !a.ok).map((a) => a.texti).join('; ')));
  }
  return nyRod.id;
}

// 519 Merkja og keyra: ræsir SAMA bakgrunnsfall og „Biddu Claude“ með { merki_id, nonce }. Staðbundið (ADALMAL_CLAUDE_INNI=1)
// keyrir vinnan í sama ferli án þess að bíða — eins og kveikjaClaude.
async function kveikjaMerki(id, nonce) {
  if (process.env.ADALMAL_CLAUDE_INNI === '1') { M.vinnaMerki(id, nonce).catch(() => {}); return; }
  const grunnur = String(process.env.URL || 'https://slokkvitaeki.netlify.app').replace(/\/+$/, '');
  const r = await fetch(grunnur + '/.netlify/functions/adalmal-claude-background', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merki_id: id, nonce }), signal: AbortSignal.timeout(8000) });
  if (r.status !== 202 && r.status !== 200) throw new Error('bakgrunnsfallið svaraði ' + r.status);
}
// POST { adgerd:'merkja', mal_id, merki|null, athugasemd?, due_at? }  → merki á línu (null tekur það af)
//   18.11.2026 — ÞjónustuVerkstæðið (190): { …, bord:'verkstaedi', fyrirtaeki_id } í stað mal_id; GET ?merkingar=1&bord=verkstaedi;
//   { adgerd:'merkja_keyra', bord:'verkstaedi' }. Borðin eru aðskilin: án `bord` gildir Þjónustuborðið (519 óbreytt).
// POST { adgerd:'merkja_keyra' }                                      → allt merkt í röð til agenta (Veit ekki/Rannsaka fremst)
// GET  ?merkingar=1                                                   → { merkingar[], teljari, claude_virkt }
// notandi() sem bregst skilar 'óþekkt' — merking má þá ALDREI vistast (hún lenti undir merkt_af='óþekkt' og sæist aldrei).
const OTHEKKT = () => P.json(503, { error: 'Náði ekki að staðfesta hver þú ert — ekkert var skráð. Reyndu aftur eftir augnablik.' });
async function merkingarSvar(hver, extra, bord) {
  if (!hver || hver === 'óþekkt') return OTHEKKT();
  const l = await M.listi(hver, M.bordAf(bord));
  return P.json(200, Object.assign({ ok: true, merkingar: l.map(M.synilegt), teljari: M.teljari(l), claude_virkt: await claudeVirkt() }, extra || {}));
}
async function merkja(b, event) {
  const hver = await notandi(event);
  if (!hver || hver === 'óþekkt') return OTHEKKT();
  try {
    if (b.adgerd === 'merkja') {
      const m = await M.vista(b, hver);
      return await merkingarSvar(hver, { merking: m ? M.synilegt(m) : null }, b.bord);
    }
    // Keyra notar SAMA rofa og „Biddu Claude“ (app_kv adalmal_claude) — ekkert fer til Claude meðan hann er af.
    if (!(await claudeVirkt())) return P.json(409, { error: 'Agentarnir eru ekki komnir í gagnið (rofinn „Biddu Claude“ er af) — ekkert var keyrt.' });
    const r = await M.keyra(hver, { kveikja: kveikjaMerki, bord: M.bordAf(b.bord) });
    return await merkingarSvar(hver, { keyrsla: r }, b.bord);
  } catch (e) {
    if (e && e.kodi) return P.json(e.kodi, { error: e.message });
    return P.json(500, { error: String((e && e.message) || e).slice(0, 300) });
  }
}

async function verkefnalistiStofna(title, description) {
  // [AGNAR]-merkið: kranvörnin (sql/kranvorn.sql, 21.11.2026) hleypir aðeins verki á
  // Verkefnalistann sem er skráð villa, tengist markmiði eða kemur af því AGNAR ýtti á
  // takkann. Afgreiðslan er sá takki, svo merkið fer fremst í description.
  const ny = await P.sbPost('verkefnalisti', { title: String(title).slice(0, 200), description: '[AGNAR] ' + String(description).slice(0, 3980), status: 'beidni',
    category: 'allt', assigned_agent: 'claude-code', vefur: 'sameiginlegt', priority: 2 }).then(sbJson);
  if (!ny[0] || !ny[0].id) throw new Error('Verkefnalistinn skilaði engri röð');
  return ny[0];
}
const verkefnalistiLesa = (id) => (id ? lesa(`verkefnalisti?select=id,title,status&id=eq.${encodeURIComponent(id)}&limit=1`).then((x) => x[0] || null) : Promise.resolve(null));

async function adalmal(b, event) {
  const mid = Number(b.mal_id), nr = Number(b.nr), h = String(b.hluti || ''), gerd = String(b.gerd || '');
  if (!Number.isInteger(mid) || mid <= 0 || !Number.isInteger(nr) || nr < 0 || nr > 500 || !/^[a-z]{1,4}$/.test(h)) return P.json(400, { error: 'Atriðið er ekki rétt tilgreint' });
  if (!['svar', 'akvordun', 'verkefnalisti', 'athugasemd', 'claude', 'claude_samthykkja'].includes(gerd)) return P.json(400, { error: 'Óþekkt aðgerð á Aðalmálum' });
  if (gerd === 'svar' && h !== 'sp') return P.json(400, { error: 'Svar á aðeins við spurningar' });
  if (gerd === 'akvordun' && !AM_AKV[b.akvordun]) return P.json(400, { error: 'Ákvörðun er já, nei eða seinna' });
  const texti = String(b.texti || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (texti.length < 3) return P.json(400, { error: 'Texti atriðisins vantar' });
  const svar = String(b.svar || '').trim().slice(0, 4000);
  if (gerd === 'svar' && !svar) return P.json(400, { error: 'Svarið er tómt' });
  const ath = String(b.athugasemd || '').trim().slice(0, 1000);
  // Rofinn fyrst — ekkert skráð (engin röð, enginn lás) meðan „Biddu Claude" er ekki komið í gagnið.
  if (gerd === 'claude' && !(await claudeVirkt())) return P.json(409, { error: '„Biddu Claude" er ekki komið í gagnið enn.' });

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
  let claudeNonce = null;
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
    } else if (gerd === 'claude') {
      // „Biddu Claude" (16.11.2026): beiðnin er skráð á röðina með einnota nonce; bakgrunnsfallið vinnur hana og skrifar
      // nidurstada.claude. Ein beiðni í einu á hvert atriði (eldri en 5 mín. í vinnslu telst dauð).
      const c0 = n.claude;
      if (c0 && c0.stada === 'i_vinnslu' && Date.now() - Date.parse(c0.at) < 5 * 60 * 1000) throw kyrrt('Claude er þegar að vinna í þessu atriði — svarið birtist hér.');
      claudeNonce = CL.nyNonce();
      n.claude = { stada: 'i_vinnslu', nonce: claudeNonce, fyrirmaeli: String(b.fyrirmaeli || '').trim().slice(0, 1500), at: nuIso, af: hver };
      n.athugasemd = 'Beðið um tillögu frá Claude';
      takki = 'Biðja Claude'; hvad = 'Claude beðinn um tillögu';
      skilabod = 'Claude er að vinna — svarið birtist hér eftir hálfa til eina mínútu.';
    } else if (gerd === 'claude_samthykkja') {
      // Einn takki: tillaga Claude verður að verki á Verkefnalistanum, eða að póstsvari í Afgreiðslu (þaðan sendir Agnar
      // sjálfur með rauða takkanum, eftir sömu athuganir og allt annað). Ekkert fer út héðan.
      const c0 = n.claude, t = c0 && c0.tillaga;
      if (!c0 || c0.stada !== 'tilbuid' || !t || t.tegund === 'ekkert') throw kyrrt('Engin tillaga frá Claude bíður samþykkis');
      if (c0.samthykkt) throw kyrrt('Tillagan hefur þegar verið samþykkt');
      const heimLina = (c0.stadreyndir || []).map((s) => '• ' + s.texti + ' [' + s.heimildir.map((id) => (c0.heimildir[id] || {}).lysing || id).join(' · ') + ']').join('\n');
      let samthykkt;
      if (t.tegund === 'verk') {
        const vl = await verkefnalistiStofna(t.titill, t.lysing + '\n\nSTAÐREYNDIR (Claude, ' + dagsIs(new Date(c0.lokid_at || nuIso)) + '):\n' + heimLina +
          (c0.fyrirmaeli ? '\n\nFYRIRMÆLI AGNARS: ' + c0.fyrirmaeli : '') + '\n\nAgnar samþykkti tillöguna á Aðalmálum ' + dags + ' (' + hver + '). ' + heimild + '.');
        nyVl.push(vl.id);
        samthykkt = { at: nuIso, af: hver, verkefnalisti_id: vl.id };
        skilabod = 'Komið á Verkefnalistann: „' + t.titill + '".';
      } else {
        const afh = [{ texti: 'Claude skrifaði drögin að beiðni þinni á Aðalmálum' + (c0.fyrirmaeli ? ' („' + c0.fyrirmaeli.slice(0, 160) + '“)' : '') + '. Lestu þau og breyttu áður en þú sendir.', heimild: 'Biddu Claude · ' + malRef + ' · ' + dags }]
          .concat((c0.stadreyndir || []).slice(0, 5).map((s) => { const o = s.heimildir.map((id) => c0.heimildir[id]).find((x) => x && x.opna); return Object.assign({ texti: s.texti, heimild: s.heimildir.map((id) => (c0.heimildir[id] || {}).lysing || id).join(' · ') }, o ? { opna: o.opna } : {}); }));
        const afgId = await postsvarAfgreidsla(t, afh, 'claude');
        samthykkt = { at: nuIso, af: hver, afgreidsla_id: afgId };
        skilabod = 'Svarið er komið í „Tilbúið til afgreiðslu" — lestu það og sendu með rauða takkanum.';
      }
      n.claude = Object.assign({}, c0, { samthykkt });
      n.athugasemd = 'Tillaga Claude samþykkt';
      takki = t.tegund === 'verk' ? 'Setja á Verkefnalistann' : 'Setja svarið í Afgreiðslu'; hvad = 'Tillaga Claude samþykkt';
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
    saga.push({ at: nuIso, af: hver, gerd, gildi: gerd === 'svar' ? svar.slice(0, 300) : gerd === 'akvordun' ? b.akvordun : gerd === 'athugasemd' ? ath.slice(0, 300)
      : gerd === 'claude' ? String(b.fyrirmaeli || '').slice(0, 300) : gerd === 'claude_samthykkja' ? (n.claude.samthykkt || null) : n.verkefnalisti_id });
    n.saga = saga;
    const lokid = await opna({ nidurstada: n, takki, hvad_gerist: hvad, gogn, titill: ((h === 'sp' ? 'Spurning: ' : '') + texti).slice(0, 200),
      framkvaemt_at: nuIso, framkvaemt_af: hver });
    for (const [gamla, nytt] of eftir) await charlizeVikja(gamla, nytt);
    let ut = lokid[0];
    if (gerd === 'claude') {
      // Ræsa bakgrunnsfallið. Bregðist það er beiðnin merkt villa strax, svo borðið bíði ekki eftir svari sem kemur aldrei.
      try { await kveikjaClaude(lyk, claudeNonce); }
      catch (ke) {
        const nn = Object.assign({}, n, { claude: Object.assign({}, n.claude, { stada: 'villa', villa: 'Náði ekki að ræsa Claude: ' + String((ke && ke.message) || ke).slice(0, 200), lokid_at: new Date().toISOString() }) });
        ut = (await breyta(`afgreidsla?id=eq.${row.id}`, { nidurstada: nn }))[0] || ut;
        skilabod = 'Náði ekki að ræsa Claude — reyndu aftur.';
      }
    }
    return P.json(200, { ok: true, skilabod, atridi: synilegtAdalmal(ut) });
  } catch (e) {
    if (e && e.kodi === 409) { await opna({ nidurstada: fyrri }).catch(() => {}); return P.json(409, { error: e.message }); }
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
    // 519: merkingarnar einar (teljarinn kannar þær á nokkurra sekúndna fresti meðan umferð er í keyrslu) — án tilbúnu verkanna.
    const qs0 = event.queryStringParameters || {};
    if (qs0.merkingar != null && qs0.adalmal == null) {
      try { return await merkingarSvar(await notandi(event), null, qs0.bord); } catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
    }
    try {
      const [onnur, serRadir, saga] = await Promise.all([
        lesa('afgreidsla?select=*&stada=eq.tilbuid&or=(gogn->>flokkur.is.null,gogn->>flokkur.not.in.(' + SERFLOKKAR.join(',') + '))&order=forgangur.asc,created_at.asc&limit=50'),
        // Hver sérflokkur hefur SITT þak (rýni 19.11.2026): deildu þeir einu þaki gátu bókanir ýtt nýjum dagsverkum út þegjandi.
        Promise.all(SERFLOKKAR.map((f) => lesa('afgreidsla?select=*&stada=eq.tilbuid&gogn->>flokkur=eq.' + f + '&order=forgangur.asc,created_at.asc&limit=' + SER_THAK))),
        lesa('afgreidsla?select=*&stada=neq.tilbuid&order=updated_at.desc&limit=40'),
      ]);
      // 19.11.2026: sérflokkarnir (Dagsverk, Bókanir) AFTAST í svarinu, hin verkin fremst í sömu röð og áður; viðmótið
      // skilur þá að. (Aftast, svo sá sem les listann ósíaðan fái venjulegu verkin fyrst — rýni 19.11.)
      const tilb = onnur.concat([].concat(...serRadir));
      const tilbuin = [];
      const visir = await vipVisir().catch(() => null);   // VIP-merkið bregst → verkin koma samt, án merkis
      // 18.11.2026: liðirnir voru unnir EINN Í EINU (50 liðir × athuganir og tilvísanir = 13 s; Agnar: „Afgreiðslan virkar
      // ekki“). Nú átta samhliða, í sömu röð, og dyr allra liða eru sóttar í einni umferð.
      const V = await DYR.saekja(tilb, lesa).catch(() => null);
      const syn = await iHopum(tilb, 16, (r) => synilegt(r, visir, V));   // 16 samhliða: allt að 170 liðir (50 + 60 á hvorn sérflokk)
      for (let k = 0; k < tilb.length; k++) {
        const r = tilb[k], s = syn[k];
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
        // Heimildir Claude fá slóð á skjalið sjálft, eins og aðrar tilvísanir (ein umferð fyrir öll atriðin).
        const clRefs = svar.adalmal.flatMap((x) => (x.claude && x.claude.heimildir ? Object.values(x.claude.heimildir).map((h) => h && h.opna).filter(Boolean) : []));
        if (clRefs.length) {
          const leysa = await leysaTilvisanir(clRefs).catch(() => () => null);
          for (const x of svar.adalmal) for (const h of Object.values((x.claude && x.claude.heimildir) || {})) if (h && h.opna) { const sl = leysa(h.opna); if (sl) h.slod = sl; }
        }
        svar.claude_virkt = await claudeVirkt();
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
  if (b.adgerd === 'merkja' || b.adgerd === 'merkja_keyra') return merkja(b, event);
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
    // Ágiskað netfang (kóðarýni 17.11.2026): staðfesta það, eða taka það úr to/cc og senda án þess. Hver og hvenær skráð.
    if (b.adgerd === 'agiskun') {
      const r = (await lesa(`afgreidsla?select=*&id=eq.${id}&stada=eq.tilbuid&limit=1`))[0];
      if (!r) return P.json(409, { error: 'Verkið er ekki lengur opið' });
      if (r.tegund !== 'tolvupostur') return P.json(400, { error: 'Aðeins tölvupóstur hefur viðtakendur' });
      const e = addr(b.netfang), g0 = r.gogn || {};
      const ag = [].concat(g0.agiskun || []).map(addr).filter(Boolean);
      if (!e || ag.indexOf(e) < 0) return P.json(400, { error: 'Netfangið er ekki merkt ágiskun á þessu verki' });
      const hver = await notandi(event), nu = new Date().toISOString();
      const gogn = Object.assign({}, g0);
      if (b.val === 'stadfesta') {
        gogn.agiskun_stadfest = [].concat(g0.agiskun_stadfest || []).filter((x) => addr(x && x.netfang) !== e).concat([{ netfang: e, af: hver, at: nu }]);
      } else if (b.val === 'fjarlaegja') {
        gogn.to = [].concat(g0.to || []).filter((x) => addr(x) !== e);
        gogn.cc = [].concat(g0.cc || []).filter((x) => addr(x) !== e);
        gogn.agiskun = ag.filter((x) => x !== e);
        gogn.agiskun_fjarlaegt = [].concat(g0.agiskun_fjarlaegt || []).concat([{ netfang: e, af: hver, at: nu }]);
      } else return P.json(400, { error: 'val: stadfesta eða fjarlaegja' });
      await breyta(`afgreidsla?id=eq.${id}&stada=eq.tilbuid`, { gogn });
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
      const astaeda = String(b.astaeda || (b.varanlegt ? 'Ekki þess virði' : 'Sleppt')).slice(0, 300);
      // 'sameina': „Hafna" þýðir ekki „kemur aldrei aftur" heldur „aftur í vinnu" — athugasemd Agnars fer í
      // verkefnalisti.feedback og verkið aftur í `beidni` (sama og „↶ Aftur í vinnu"). Vaktin les feedback fyrst næst.
      const r0 = (await lesa(`afgreidsla?select=tegund,gogn&id=eq.${id}&stada=eq.tilbuid&limit=1`))[0];
      if (!r0) return P.json(409, { error: 'Verkið er ekki lengur opið' });
      let stada = b.varanlegt ? 'ekki_thess_virdi' : 'sleppt', astaedaRod = astaeda;
      if (r0.tegund === 'sameina' && r0.gogn && r0.gogn.verk_id) {
        const vid = r0.gogn.verk_id;
        const cur = (await lesa(`verkefnalisti?select=feedback,status&id=eq.${encodeURIComponent(vid)}&limit=1`))[0];
        if (cur && cur.status !== 'klarad') {
          const hf = SAM.hafnaFeedback(cur, astaeda, hver, new Date());
          await breyta(`verkefnalisti?id=eq.${encodeURIComponent(vid)}`, hf.patch);
        }
        stada = 'sleppt'; astaedaRod = 'Hafnað — aftur í vinnu: ' + astaeda;
      }
      const r = await breyta(`afgreidsla?id=eq.${id}&stada=eq.tilbuid`, { stada, astaeda: astaedaRod.slice(0, 300), framkvaemt_at: new Date().toISOString(), framkvaemt_af: hver });
      if (!r.length) return P.json(409, { error: 'Verkið er ekki lengur opið' });
      return P.json(200, { ok: true, verk: synilegtSaga(r[0]) });
    }
    return P.json(400, { error: 'Óþekkt aðgerð' });
  } catch (e) { return P.json(500, { error: String((e && e.message) || e).slice(0, 300) }); }
};

module.exports.THROSKULDUR_KR = THROSKULDUR_KR;
module.exports._athuga = athuga;
module.exports._setjaUppruna = (fn) => { _uppruni = fn || upprunaNetfangs; };
module.exports._posturToki = posturToki;
module.exports._prufaSending = prufaSending;
module.exports._amLykill = amLykill;
module.exports._synilegtAdalmal = synilegtAdalmal;
module.exports._sameina = SAM;
module.exports._vipFyrir = vipFyrir;   // tegund 'sameina' (Verkefnavaktin)
module.exports._leysaTilvisanir = leysaTilvisanir;
module.exports._merkja = merkja;   // 17.11.2026: prófin (kreditfærður reikningur merktur)
module.exports._vidhengiSlod = vidhengiSlod;   // 18.11.2026: viðhengi sem tengill í svarinu
module.exports._vidhengiSyn = vidhengiSyn;
