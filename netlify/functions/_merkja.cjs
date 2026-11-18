// _merkja.cjs — „MERKJA OG KEYRA“ á Þjónustuborðinu (lota 14, 17.11.2026).
//
// Agnar 17.11.2026 (Þjónustuborðið „skelfilega takmarkað sem vinnuborð … bara upplýsingaskjár“; „Nenni varla að kópera
// texta inn í nýtt session. Útskýra allt áður en ég get unnið það“): lítið merki á hverri línu → gluggi með hökum
// Já · Nei · Keyra · Snooze · Veit ekki · Rannsaka betur · Setja comment · Yfirfara. Hann merkir, ýtir á ▶ Keyra og
// vinnan fer af stað án þess að hann útskýri neitt.
//
// FLÆÐIÐ (afgreidsla.cjs ber vafrann hingað — engin ný API-leið):
//   vista      merki á línu (nýtt merki leysir eldra af hólmi, stada 'tekid_af', engu eytt). Snooze krefst due_at.
//   keyra      allt sem er merkt fer í röð: „Veit ekki“ og „Rannsaka betur“ FREMST (verðmætustu merkin — beiðni um
//              vinnu, ekki eyða). Hvert atriði fær agent úr leiðarvísinum (_merkja-leid.cjs) og fer SÖMU leið og
//              „✦ Biddu Claude“ (492f): einnota nonce á röðinni + bakgrunnsfallið adalmal-claude-background.
//   vinnaMerki bakgrunnsfallið: gögnin (CL.safna) → Claude (CL.kalla, með agent-skrá + merki) → staðfesting
//              (CL.stadfesta) → ÓÐINN metur (metaSkil): marktækt → „tilbúið verk“ í afgreidsla (Agnar ýtir tvisvar),
//              annars vantar_svar MEÐ ÁSTÆÐU. Hálfsvar telst ALDREI klárað. Úrskurðurinn skráist í odin_urskurdir.
//   Nei        engin vinna: ákvörðunin skráð hjá Charlize (agentarnir leggja það ekki til aftur) → klárað.
// EKKERT fer út: enginn póstur, krafa, reikningur, SMS né hlekkur. Póstsvar verður drög í Afgreiðslu sem Agnar sendir.
'use strict';

const P = require('./_portal.cjs');
const CL = require('./_adalmal-claude.cjs');
const LEID = require('./_merkja-leid.cjs');
const PSV = require('./_postsvar-rod.cjs');

const BORD = 'thjonustubord';
// 18.11.2026 — ÞjónustuVerkstæðið (190): SAMA vél, önnur lína. Agnar: „bætt þarna inn á þjónustuverkstæði síðunni, tengingu,
// til að hjálpa mér að útkljá þau mál“. Þar er línan FÉLAG (fyrirtaeki_id), ekki mál. Borðin eru aðskilin (bord), svo ▶ Keyra
// á öðru sendir aldrei merki hins. Óþekkt borð → Þjónustuborðið (519 sendir ekkert borð og á að haldast óbreytt).
const BORD_VERKST = 'verkstaedi';
const bordAf = (b) => (String(b == null ? '' : b) === BORD_VERKST ? BORD_VERKST : BORD);
const erFelagslina = (m) => !!(m && m.bord === BORD_VERKST);
const MAX_ALDUR_MS = 15 * 60 * 1000;
const HAMARK_UMFERD = 6;                  // atriði sem fara í eina umferð; hin bíða næstu (röðin ræður hverjum)
// Föst keyrsla (óháð rýni 17.11.2026, #2): vinnaMerki byrjar ekki eftir MAX_ALDUR_MS og Claude-kallið hefur 4 mín. þak, svo
// röð sem stendur enn í i_keyrslu 20 mín. eftir ræsingu er dauð (fallið drepið / síðasta PATCH brást). Hún telst þá
// vantar_svar — annars læsir EIN föst röð ▶ Keyra og merkingu á línunni að eilífu.
const FAST_MS = MAX_ALDUR_MS + 5 * 60 * 1000;
const SNOOZE_HAMARK_DAGAR = 366;

// forgangur: lægra = fremst. agent: fer til agents í keyrslu.
const MERKI = {
  veit_ekki: { heiti: 'Veit ekki', takn: '?', forgangur: 10, agent: true,
    fyrirmaeli: 'Agnar merkti VEIT EKKI: hann veit ekki hvað þetta mál er eða hvað á að gera við það. Útskýrðu í 2–3 setningum hvað málið snýst um samkvæmt gögnunum, hvað er búið og hvað vantar — og leggðu til EITT næsta skref.' },
  rannsaka: { heiti: 'Rannsaka betur', takn: '🔎', forgangur: 10, agent: true,
    fyrirmaeli: 'Agnar merkti RANNSAKA BETUR: kafaðu dýpra í gögnin. Hvað er staðfest, hvað stangast á, hvað vantar? Stattu aðeins á því sem gögnin sýna og leggðu til eitt skref ef gögnin bera það.' },
  yfirfara: { heiti: 'Yfirfara', takn: '✓?', forgangur: 30, agent: true,
    fyrirmaeli: 'Agnar merkti YFIRFARA: farðu yfir hvort málið stenst. Er forsendan enn sönn (greitt? svarað? búið?), er það rétt skráð? Segðu hvort hægt sé að loka því og hvers vegna, með heimildum.' },
  comment: { heiti: 'Athugasemd', takn: '💬', forgangur: 35, agent: true, fyrirmaeli: 'Agnar skrifaði athugasemd við málið — farðu eftir henni.' },
  keyra: { heiti: 'Keyra', takn: '▶', forgangur: 40, agent: true,
    fyrirmaeli: 'Agnar merkti KEYRA: vinndu málið áfram. Finndu næsta skref samkvæmt gögnunum og undirbúðu það sem tillögu (verk eða drög að svari).' },
  ja: { heiti: 'Já', takn: '✓', forgangur: 45, agent: true,
    fyrirmaeli: 'Agnar merkti JÁ: hann samþykkir næsta skref sem málið leggur til. Undirbúðu framkvæmdina sem tillögu (verk eða drög að svari) — ekkert fer út án hans.' },
  nei: { heiti: 'Nei', takn: '✕', forgangur: 60, agent: false },
  snooze: { heiti: 'Snooze', takn: '💤', forgangur: 90, agent: false },
};
const STODUR = ['merkt', 'i_keyrslu', 'klarad', 'vantar_svar', 'blundar', 'tekid_af'];
const VIRKAR = ['merkt', 'i_keyrslu', 'blundar'];

/* ── Hrein rökfræði (prófuð í test/merkja-keyra.test.cjs) ─────────────────────────────────────────────────────── */

// Snooze: dagsetning SKYLDA. „YYYY-MM-DD“ → kl. 08:00 (UTC = Ísland) þann dag. Verður að vera í framtíðinni og innan árs.
function snoozeDags(due, nu = new Date()) {
  const s = String(due == null ? '' : due).trim();
  if (!s) throw villa('Snooze þarf dagsetningu — annars hverfur atriðið.');
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T08:00:00Z') : new Date(s);
  if (isNaN(d)) throw villa('Ógild dagsetning á snooze.');
  if (d.getTime() <= nu.getTime()) throw villa('Snooze-dagsetningin er liðin — veldu dag fram í tímann.');
  if (d.getTime() - nu.getTime() > SNOOZE_HAMARK_DAGAR * 864e5) throw villa('Snooze má mest vera eitt ár.');
  return d.toISOString();
}
// Er snooze-ið runnið út (atriðið komið aftur)?
const snoozeBuid = (m, nu = new Date()) => !!(m && m.stada === 'blundar' && m.due_at && Date.parse(m.due_at) <= nu.getTime());

const erFost = (m, nu = new Date()) => !!(m && m.stada === 'i_keyrslu' && Date.parse(m.keyrt_at || (m.claude && m.claude.at) || 0) < nu.getTime() - FAST_MS);
const FAST_ASTAEDA = 'Agentinn skilaði engu innan 20 mín. (keyrslan rofnaði) — merktu línuna aftur til að senda hana í nýja umferð.';

// Röðin: forgangur (Veit ekki / Rannsaka betur fremst), svo elsta merkið fyrst. Stöðug.
function rodun(listi) {
  return (listi || []).map((m, i) => ({ m, i })).sort((a, b) =>
    (forgangurAf(a.m) - forgangurAf(b.m)) || (Date.parse(a.m.merkt_at || 0) - Date.parse(b.m.merkt_at || 0)) || (a.i - b.i)).map((x) => x.m);
}
const forgangurAf = (m) => (MERKI[m && m.merki] ? MERKI[m.merki].forgangur : 99);

// Teljarinn efst á borðinu: merkt · í keyrslu · klárað · vantar svör (+ blundar). Klárað/vantar svör telja SÍÐUSTU umferð,
// svo hann sjái stöðu umferðarinnar í einni línu. `buin` = síðasta umferð er búin (ekkert í keyrslu) — kveikir ljósið.
function teljari(listi, nu = new Date()) {
  const L = (listi || []).filter((m) => m && m.stada !== 'tekid_af').map((m) => (erFost(m, nu) ? Object.assign({}, m, { stada: 'vantar_svar' }) : m));
  const umferdir = [...new Set(L.filter((m) => m.umferd).sort((a, b) => Date.parse(b.keyrt_at || 0) - Date.parse(a.keyrt_at || 0)).map((m) => m.umferd))];
  const sidasta = umferdir[0] || null;
  const iU = sidasta ? L.filter((m) => m.umferd === sidasta) : [];
  const t = {
    merkt: L.filter((m) => m.stada === 'merkt').length,
    i_keyrslu: L.filter((m) => m.stada === 'i_keyrslu').length,
    klarad: iU.filter((m) => m.stada === 'klarad').length,
    vantar_svar: iU.filter((m) => m.stada === 'vantar_svar').length,
    blundar: L.filter((m) => m.stada === 'blundar' && !snoozeBuid(m, nu)).length,
    snooze_buid: L.filter((m) => snoozeBuid(m, nu)).length,
    umferd: sidasta,
  };
  t.buin = !!(sidasta && iU.length && !iU.some((m) => m.stada === 'i_keyrslu'));
  t.lokid_at = t.buin ? iU.map((m) => m.lokid_at).filter(Boolean).sort().pop() || null : null;
  return t;
}

// Fyrirmæli til agentsins: merkið + athugasemd Agnars (valfrjáls).
function fyrirmaeliFyrir(m) {
  const d = MERKI[m.merki] || MERKI.keyra;
  const ath = String(m.athugasemd || '').trim();
  return ((d.fyrirmaeli || '') + (ath ? '\nATHUGASEMD AGNARS: ' + ath : '')).trim().slice(0, 1500);
}

// ÓÐINN METUR SKILIN: er svarið marktækt? Hálfsvar er aldrei klárað — það verður vantar_svar með ástæðu.
//   marktækt + tillaga 'verk' / 'tolvupostur'  → tilbúið verk (verk á Verkefnalistann / póstdrög í Afgreiðslu)
//   marktækt + heimild í Afgreiðslu/Verkefnalista (A…/V…) → „þegar á einum stað“ (visun), ekkert nýtt búið til
//   marktækt útskýring (Veit ekki / Rannsaka / Yfirfara, ≥ 2 staðfestar staðreyndir) → tilbúið verk „Lesið“
function metaSkil(c, merki) {
  if (!c || c.stada === 'villa') return { marktaekt: false, astaeda: 'Agentinn skilaði villu: ' + String((c && c.villa) || 'óþekkt').slice(0, 200) };
  if (c.stada !== 'tilbuid') return { marktaekt: false, astaeda: 'Agentinn kláraði ekki' };
  const st = Array.isArray(c.stadreyndir) ? c.stadreyndir.filter((s) => s && s.texti && Array.isArray(s.heimildir) && s.heimildir.length) : [];
  const svar = String(c.svar || '').trim();
  const om = (Array.isArray(c.omaelt) ? c.omaelt : []).filter(Boolean);
  const omTexti = om.length ? ' Vantar: ' + om.slice(0, 2).join(' · ') : '';
  if (!st.length) return { marktaekt: false, astaeda: 'Agentinn fann ekkert í gögnunum sem styður svar.' + omTexti };
  if ((Number(c.hent) || 0) >= 3 && (Number(c.hent) || 0) > st.length) return { marktaekt: false, astaeda: 'Flestar staðhæfingar agentsins höfðu enga heimild og var hent.' + omTexti };
  const t = c.tillaga || {};
  if (t.tegund === 'verk' && t.titill && t.lysing) return { marktaekt: true, tegund: 'verk' };
  if (t.tegund === 'tolvupostur' && t.texti && t.post) return { marktaekt: true, tegund: 'tolvupostur' };
  const heim = st.flatMap((s) => s.heimildir);
  if (heim.some((h) => /^[AV]\d+$/.test(h)) && svar.length >= 20) return { marktaekt: true, tegund: 'visun' };
  if (['veit_ekki', 'rannsaka', 'yfirfara'].includes(merki) && st.length >= 2 && svar.length >= 40) return { marktaekt: true, tegund: 'utskyring' };
  return { marktaekt: false, astaeda: 'Hálfsvar: engin aðgerð og of lítið staðfest til að telja sem klárað.' + (svar ? ' Agentinn sagði: „' + svar.slice(0, 160) + '“' : '') + omTexti };
}

// Það sem vafrinn fær — aldrei nonce, aldrei hrá gögn agentsins.
function synilegt(m0) {
  const m = erFost(m0) ? Object.assign({}, m0, { stada: 'vantar_svar', astaeda: FAST_ASTAEDA }) : m0;
  const c = m.claude || {};
  const n = m.nidurstada || {};
  return { id: m.id, bord: m.bord || BORD, lina: m.lina, mal_id: m.mal_id, fyrirtaeki_id: m.fyrirtaeki_id || null, mal_titill: m.mal_titill, merki: m.merki, heiti: (MERKI[m.merki] || {}).heiti || m.merki,
    athugasemd: m.athugasemd || null, due_at: m.due_at || null, stada: m.stada, snooze_buid: snoozeBuid(m), forgangur: m.forgangur,
    umferd: m.umferd || null, agent: m.agent || null, gat: !!(m.agent_leid && m.agent_leid.gat), merkt_at: m.merkt_at, keyrt_at: m.keyrt_at || null,
    lokid_at: m.lokid_at || null, astaeda: m.astaeda || null, afgreidsla_id: m.afgreidsla_id || null,
    svar: n.svar || null, tegund: n.tegund || null, villa: c.stada === 'villa' ? (c.villa || null) : null };
}

/* ── Gagnagrunnurinn ───────────────────────────────────────────────────────────────────────────────────── */
function villa(m, kodi = 400) { return Object.assign(new Error(m), { kodi }); }
async function sbJson(r) { if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 160)}`); return r.json(); }
const lesa = (qs) => P.sbGet(qs).then(sbJson);
const breyta = (qs, body) => P.sbPatch(qs, Object.assign({ updated_at: new Date().toISOString() }, body)).then(sbJson);
const baeta = (t, body) => P.sbPost(t, body).then(sbJson);
const linaAf = (malId) => 'mal:' + Number(malId);
const linaFelags = (id) => 'fyrirtaeki:' + Number(id);

// Tiltekt: fastar keyrslur þessa notanda → vantar_svar (skráð í grunninn). Keyrð í upphafi listi/vista/keyra; bili hún
// telja teljari() og synilegt() fasta röð samt sem vantar_svar, svo ekkert læsist.
async function tiltekt(hver, nu = new Date(), bord = BORD) {
  const mork = new Date(nu.getTime() - FAST_MS).toISOString();
  return breyta(`bord_merkingar?bord=eq.${bord}&merkt_af=eq.${encodeURIComponent(hver)}&stada=eq.i_keyrslu&keyrt_at=lt.${encodeURIComponent('"' + mork + '"')}`,
    { stada: 'vantar_svar', astaeda: FAST_ASTAEDA, lokid_at: nu.toISOString() }).catch(() => []);
}

// Merkingar sem vafrinn sýnir: virkar + niðurstöður síðustu 3 daga. Ein á línu (sú nýjasta).
async function listi(hver, bord = BORD) {
  bord = bordAf(bord);
  await tiltekt(hver, new Date(), bord);
  const fra = new Date(Date.now() - 3 * 864e5).toISOString();
  const r = await lesa(`bord_merkingar?select=*&bord=eq.${bord}&merkt_af=eq.${encodeURIComponent(hver)}&stada=neq.tekid_af` +
    `&or=(stada.in.(merkt,i_keyrslu,blundar),updated_at.gte.${encodeURIComponent('"' + fra + '"')})&order=updated_at.desc&limit=400`);
  const sedar = new Set(), ut = [];
  for (const m of r) { if (sedar.has(m.lina)) continue; sedar.add(m.lina); ut.push(m); }
  return ut;
}

// Merki á línu. merki=null tekur merkið af (stada 'tekid_af' — engu eytt).
async function vista(b, hver, nu = new Date()) {
  // Verkstæðið: línan er félag (b.fyrirtaeki_id). Þjónustuborðið: mál (b.mal_id) — óbreytt.
  const bord = bordAf(b.bord), felag = bord === BORD_VERKST;
  const mid = Number(felag ? b.fyrirtaeki_id : b.mal_id);
  if (!Number.isInteger(mid) || mid <= 0) throw villa('Línan er ekki rétt tilgreind');
  const merki = b.merki == null || b.merki === '' ? null : String(b.merki);
  if (merki && !MERKI[merki]) throw villa('Óþekkt merki');
  const ath = String(b.athugasemd || '').trim().slice(0, 1500);
  if (merki === 'comment' && !ath) throw villa('Athugasemdin er tóm');
  const due = merki === 'snooze' ? snoozeDags(b.due_at, nu) : null;
  const lina = felag ? linaFelags(mid) : linaAf(mid);
  await tiltekt(hver, nu, bord);
  const eldri = await lesa(`bord_merkingar?select=id,stada,keyrt_at,claude&bord=eq.${bord}&lina=eq.${encodeURIComponent(lina)}&merkt_af=eq.${encodeURIComponent(hver)}&stada=in.(${VIRKAR.join(',')})&limit=5`);
  // Lesið í gegnum tiltektarsýnina: föst keyrsla læsir ekki línuna þótt tiltekt hafi brugðist (hún er felld hér beint).
  if (eldri.some((x) => x.stada === 'i_keyrslu' && !erFost(x, nu))) throw villa('Agent er að vinna í þessari línu — niðurstaðan birtist hér.', 409);
  for (const x of eldri.filter((y) => erFost(y, nu))) await breyta(`bord_merkingar?id=eq.${x.id}&stada=eq.i_keyrslu`, { stada: 'vantar_svar', astaeda: FAST_ASTAEDA, lokid_at: nu.toISOString() });
  let mal = null;
  if (merki && felag) {
    const f = (await lesa(`fyrirtaeki?select=id,nafn,deleted_at&id=eq.${mid}&limit=1`))[0];
    if (!f || f.deleted_at) throw villa('Félagið fannst ekki', 404);
    mal = { title: f.nafn };
  } else if (merki) {
    mal = (await lesa(`thjonustubeidni?select=id,title,status,deleted_at&id=eq.${mid}&limit=1`))[0];
    if (!mal || mal.deleted_at) throw villa('Málið fannst ekki', 404);
  }
  for (const x of eldri) await breyta(`bord_merkingar?id=eq.${x.id}&stada=in.(merkt,blundar)`, { stada: 'tekid_af' });
  if (!merki) return null;
  const ny = await baeta('bord_merkingar', Object.assign({ bord, lina, mal_id: felag ? null : mid, mal_titill: String(mal.title || '').slice(0, 200), merki, athugasemd: ath || null,
    due_at: due, merkt_af: hver, merkt_at: nu.toISOString(), stada: merki === 'snooze' ? 'blundar' : 'merkt', forgangur: MERKI[merki].forgangur },
    felag ? { fyrirtaeki_id: mid } : {}));
  return ny[0];
}

// Charlize: Nei verður ákvörðun sem agentarnir lesa (sama og Aðalmál 492: „Ekki leggja þetta til aftur“).
async function charlizeNei(m, hver) {
  const r = await baeta('charlize_knowledge', { scope: 'baedi', topic: 'akvardanir-agnars',
    fact: ((erFelagslina(m) ? 'Agnar merkti NEI við fyrirtæki #' + m.fyrirtaeki_id + ' á ÞjónustuVerkstæðinu (' : 'Agnar merkti NEI við mál #' + m.mal_id + ' á Þjónustuborðinu (') + new Date().toISOString().slice(0, 10) + '): „' + (m.mal_titill || '') + '“' +
      (m.athugasemd ? ' — Athugasemd Agnars: ' + m.athugasemd : '') + ' — Ekki leggja þetta til aftur nema ný staðreynd komi fram (ákvörðun stendur).').slice(0, 1800),
    detail: ('Heimild: bord_merkingar #' + m.id + ' (Merkja og keyra) · ' + (erFelagslina(m) ? 'fyrirtaeki #' + m.fyrirtaeki_id : 'thjonustubeidni #' + m.mal_id) + ' · skráð af ' + hver).slice(0, 2000),
    source: 'agnar', confidence: 'confirmed', status: 'active', agent: 'claude-code' });
  return r[0] && r[0].id;
}

// ▶ KEYRA — allt sem er merkt fer í röð. Skilar { umferd, sent, bida, nei }.
async function keyra(hver, { kveikja, hamark = HAMARK_UMFERD, leidOpt = {}, nu = new Date(), bord = BORD } = {}) {
  if (typeof kveikja !== 'function') throw new Error('kveikja vantar');
  bord = bordAf(bord);
  await tiltekt(hver, nu, bord);
  const merkt = rodun(await lesa(`bord_merkingar?select=*&bord=eq.${bord}&merkt_af=eq.${encodeURIComponent(hver)}&stada=eq.merkt&order=forgangur.asc,merkt_at.asc&limit=200`));
  if (!merkt.length) return { umferd: null, sent: 0, bida: 0, nei: 0, skilabod: 'Ekkert er merkt.' };
  const umferd = 'u' + nu.getTime().toString(36);
  const nuIso = nu.toISOString();
  const agentVerk = merkt.filter((m) => MERKI[m.merki] && MERKI[m.merki].agent);
  // Óháð rýni 17.11.2026 (#3): raðbundnar netferðir (~3 á atriði × 10) fóru yfir ~10 s þak Netlify — Agnar hefði séð
  // „fór ekki af stað“ þótt verkin væru farin. Nú: málin í EINNI fyrirspurn, leiðarvísirinn einu sinni, atriðin samhliða.
  const valin = agentVerk.slice(0, hamark);
  const malIds = [...new Set(valin.map((m) => Number(m.mal_id)).filter((x) => Number.isInteger(x) && x > 0))];
  const [malar, leidG] = await Promise.all([
    malIds.length ? lesa(`thjonustubeidni?select=id,title,type,summary,customer_nafn,status&id=in.(${malIds.join(',')})`).catch(() => []) : [],
    (leidOpt.g ? Promise.resolve(leidOpt.g) : LEID.saekja(leidOpt)).then((g) => ({ g }), (e) => ({ villa: String((e && e.message) || e).slice(0, 120) })),
  ]);
  // Endurrýni 17.11.2026: hvert atriði ber sína eigin villu — eitt sem kastar (PATCH, leiðarvísir, Charlize) fellir ALDREI
  // umferðina, því hin eru þegar farin af stað. Talið er það sem fór raunverulega af stað.
  const neiNidur = await Promise.all(merkt.filter((x) => x.merki === 'nei').map(async (m) => {
    let tekin = [];
    try { tekin = await breyta(`bord_merkingar?id=eq.${m.id}&stada=eq.merkt`, { stada: 'i_keyrslu', umferd, keyrt_at: nuIso }); } catch (_) { return 0; }   // stendur merkt → næsta umferð
    if (!tekin.length) return 0;
    try {
      const cid = await charlizeNei(m, hver);
      await breyta(`bord_merkingar?id=eq.${m.id}`, { stada: 'klarad', lokid_at: new Date().toISOString(), agent: 'charlize',
        nidurstada: { tegund: 'akvordun', svar: 'Nei skráð hjá Charlize (#' + cid + ') — agentarnir leggja þetta ekki til aftur.', charlize_id: cid },
        odin_mat: { marktaekt: true, astaeda: 'Ákvörðun Agnars — engin vinna', at: new Date().toISOString() } });
      return 1;
    } catch (e) {
      await breyta(`bord_merkingar?id=eq.${m.id}`, { stada: 'vantar_svar', astaeda: 'Náði ekki að skrá Nei: ' + String((e && e.message) || e).slice(0, 160), lokid_at: new Date().toISOString() }).catch(() => {});
      return 0;
    }
  }));
  const sentNidur = await Promise.all(valin.map(async (m) => {
    const mal = malar.find((x) => Number(x.id) === Number(m.mal_id));
    // Félag á verkstæðinu: síðuheitið fer í textann, svo leiðarvísirinn rétti keflið EIGANDA síðunnar (boðhlaupsreglan).
    const texti = erFelagslina(m)
      ? ['ÞjónustuVerkstæði', 'Úttekt ársins — ársskoðun slökkvitækja: úttektarskýrsla og reikningur', m.mal_titill || '', m.athugasemd || ''].filter(Boolean).join('\n')
      : [mal && mal.type, mal && mal.title, mal && mal.customer_nafn, mal && mal.summary, m.mal_titill || '', m.athugasemd || ''].filter(Boolean).join('\n');
    const vara = (v) => ({ agent: LEID.VARA, stig: 0, ord: [], gat: true, villa: v });
    let leid;
    try { leid = leidG.g ? await LEID.leid(texti, Object.assign({}, leidOpt, { g: leidG.g })) : vara('Leiðarvísirinn svaraði ekki: ' + leidG.villa); }
    catch (e) { leid = vara('Leiðarvísirinn brást á þessu atriði: ' + String((e && e.message) || e).slice(0, 120)); }   // jarvis heldur keflinu
    const nonce = CL.nyNonce();
    let tekin = [];
    try {
      tekin = await breyta(`bord_merkingar?id=eq.${m.id}&stada=eq.merkt`, { stada: 'i_keyrslu', umferd, keyrt_at: nuIso, agent: leid.agent,
        agent_leid: { stig: leid.stig, ord: leid.ord, gat: leid.gat, adrir: leid.adrir || [], villa: leid.villa || null },
        claude: { stada: 'i_vinnslu', nonce, at: nuIso, af: hver, persona: { emoji: leid.emoji, lysing: leid.lysing, serhaefing: leid.serhaefing, aldrei: leid.aldrei } } });
    } catch (_) { return 0; }   // PATCH brást: stendur merkt og fer í næstu umferð
    if (!tekin.length) return 0;
    try { await kveikja(m.id, nonce); return 1; }
    catch (e) {
      await breyta(`bord_merkingar?id=eq.${m.id}`, { stada: 'vantar_svar', astaeda: 'Náði ekki að ræsa agentinn: ' + String((e && e.message) || e).slice(0, 160), lokid_at: new Date().toISOString() }).catch(() => {});
      return 0;
    }
  }));
  const sent = sentNidur.reduce((a, b) => a + b, 0), nei = neiNidur.reduce((a, b) => a + b, 0);
  const bida = Math.max(0, agentVerk.length - hamark);
  return { umferd, sent, bida, nei, skilabod: (sent ? sent + ' atriði farin til agenta' : 'Ekkert fór til agenta') + (nei ? ' · ' + nei + ' Nei skráð' : '') + (bida ? ' · ' + bida + ' bíða næstu umferðar' : '') + '.' };
}

/* ── BAKGRUNNSFALLIÐ — sama vél og „Biddu Claude“ ─────────────────────────────────────────────────────── */
const fmtD = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return isNaN(d) ? '' : p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };
function kerfiAuki(m, persona) {
  const p = persona || {};
  const heiti = (MERKI[m.merki] || {}).heiti || m.merki;
  return [erFelagslina(m)
    ? 'Í ÞETTA SINN: atriðið er FÉLAG Á ÞJÓNUSTUVERKSTÆÐINU (fyrirtæki #' + m.fyrirtaeki_id + '), ekki vikuyfirlit. Verkstæðið heldur utan um ÚTTEKT ÁRSINS ' +
      '(ársskoðun slökkvitækja) hjá hverju félagi í þjónustu: farið á staðinn → tækjalisti → úttekt → skýrsla → send → reikningur. Agnar merkti félagið „' + heiti +
      '“ og ýtti á Keyra. Svaraðu um ÞETTA félag og ÞENNAN stað: er úttekt ársins gerð, er skýrslan til, er reikningurinn sendur og greiddur — og hvað vantar. ' +
      'Gögnin U… (verkstæðisstaða, skjöl, sölur, tæki), K… (skjöl) og S… (sölur) eru mæld beint fyrir þennan stað. Færsla merkt ÓMÆLT þýðir að sóknin brást, ' +
      'EKKI að ekkert sé til. Skoðunardagur tækja er vísbending, aldrei staðfesting ein og sér. Leggðu ALDREI til að merkja „búið“ nema skýrsla EÐA reikningur ársins sé í gögnunum.'
    : 'Í ÞETTA SINN: atriðið er LÍNA Á ÞJÓNUSTUBORÐINU (mál #' + m.mal_id + '), ekki vikuyfirlit. Agnar merkti hana „' + heiti + '“ og ýtti á Keyra.',
    'ÞÚ VINNUR SEM AGENTINN ' + (p.emoji ? p.emoji + ' ' : '') + (m.agent || LEID.VARA) + (p.lysing ? ' — ' + p.lysing : '') + '.',
    (p.serhaefing && p.serhaefing.length ? 'SÉRHÆFING: ' + p.serhaefing.join(' · ') : ''),
    (p.aldrei && p.aldrei.length ? 'ALDREI: ' + p.aldrei.join(' · ') : ''),
    'Finnirðu ekkert marktækt í gögnunum, segðu það hreint út í `omaelt` og veldu "ekkert" — hálfsvar telst ekki klárað.'].filter(Boolean).join('\n');
}
function lysingVerks(m, c) {
  const heimLina = (c.stadreyndir || []).map((s) => '• ' + s.texti + ' [' + s.heimildir.map((id) => (c.heimildir[id] || {}).lysing || id).join(' · ') + ']').join('\n');
  return [c.svar, heimLina ? 'STAÐREYNDIR:\n' + heimLina : '', (c.omaelt || []).length ? 'ÓMÆLT: ' + c.omaelt.join(' · ') : ''].filter(Boolean).join('\n\n');
}
async function tilbuidVerk(m, c, mat, hver) {
  const heiti = (MERKI[m.merki] || {}).heiti || m.merki;
  const felag = erFelagslina(m);
  const malRef = felag ? 'ÞjónustuVerkstæði · fyrirtæki #' + m.fyrirtaeki_id : 'Þjónustuborð · mál #' + m.mal_id;
  const afh = (c.stadreyndir || []).slice(0, 6).map((s) => { const o = s.heimildir.map((id) => c.heimildir[id]).find((x) => x && x.opna); return Object.assign({ texti: s.texti, heimild: s.heimildir.map((id) => (c.heimildir[id] || {}).lysing || id).join(' · ') }, o ? { opna: o.opna } : {}); });
  afh.unshift({ texti: 'Agentinn ' + (m.agent || LEID.VARA) + ' vann þetta af merkinu „' + heiti + '“ (Merkja og keyra). Óðinn mat svarið marktækt.', heimild: malRef + ' · merking #' + m.id });
  if (mat.tegund === 'tolvupostur') {
    // Drög í Afgreiðslu. athuga() (afgreidsla.cjs) keyrir þegar verkið er sýnt og aftur fyrir sendingu — Agnar sendir.
    const r = await PSV.bua(c.tillaga, afh, 'merkja');
    return r && r.id;
  }
  const t = c.tillaga || {};
  const erVerk = mat.tegund === 'verk';
  const lysing = lysingVerks(m, c);
  const ny = await baeta('afgreidsla', { lykill: 'merki:' + m.id + ':' + (m.umferd || 'u'), tegund: 'verk',
    titill: ((erVerk ? t.titill : heiti + ': ' + (m.mal_titill || (felag ? 'fyrirtæki #' + m.fyrirtaeki_id : 'mál #' + m.mal_id)))).slice(0, 200),
    takki: erVerk ? 'Setja á Verkefnalistann' : 'Lesið — loka',
    hvad_gerist: erVerk ? 'Verkið fer á Verkefnalistann (' + (m.agent || 'claude-code') + ' vinnur það). Ekkert fer út.' : 'Merkt lesið. Ekkert annað gerist og ekkert fer út.',
    af_hverju: afh, virdi_kr: null, forgangur: (MERKI[m.merki] || {}).forgangur || 40, created_by: 'merkja', stada: 'tilbuid',
    gogn: Object.assign({ lysing: erVerk ? t.lysing + '\n\n' + lysing : lysing, merking_id: m.id, mal_id: m.mal_id }, felag ? { fyrirtaeki_id: m.fyrirtaeki_id } : {},
      erVerk ? { verkefnalisti: { title: t.titill, description: (t.lysing + '\n\n' + lysing + '\n\nAgnar merkti „' + heiti + '“ á ' + malRef + ' (' + fmtD(m.merkt_at) + ', ' + hver + '). Heimild: bord_merkingar #' + m.id + '.').slice(0, 4000),
        category: 'allt', assigned_agent: m.agent || 'claude-code', vefur: 'slokkvitaeki', priority: 2 } } : {}) });
  return ny[0] && ny[0].id;
}
async function odinSkra(m, mat, c, afgreidslaId) {
  try {
    const r = await baeta('odin_urskurdir', { tegund: 'verkefni', mal_tafla: 'bord_merkingar', mal_id: String(m.id), titill: String(m.mal_titill || '').slice(0, 200),
      urskurdur: mat.marktaekt ? 'undirbua_afgreidslu' : 'til_agnars', gert: true, lota: 'merkja-og-keyra',
      rokstudningur: (mat.marktaekt ? 'Marktækt (' + mat.tegund + ')' + (afgreidslaId ? ' → Afgreiðsla #' + afgreidslaId : '') : mat.astaeda).slice(0, 600),
      sonnun: { agent: m.agent, merki: m.merki, stadreyndir: (c && c.stadreyndir || []).length, hent: (c && c.hent) || 0, tillaga: c && c.tillaga ? c.tillaga.tegund : null, omaelt: (c && c.omaelt || []).slice(0, 3) } });
    return r[0] && r[0].id;
  } catch (_) { return null; }
}

async function vinnaMerki(id, nonce) {
  const m = (await lesa(`bord_merkingar?select=*&id=eq.${Number(id)}&limit=1`))[0];
  const c0 = m && m.claude;
  if (!m || m.stada !== 'i_keyrslu' || !c0 || c0.nonce !== nonce || c0.stada !== 'i_vinnslu' || Date.now() - Date.parse(c0.at) > MAX_ALDUR_MS) return { ok: false, astaeda: 'engin gild beiðni' };
  // Skilyrt á nonce OG i_keyrslu: tiltekt (FAST_MS) sem hefur merkt röðina dauða víkur ekki fyrir síðbúnu svari.
  const skrifa = (body) => breyta(`bord_merkingar?id=eq.${m.id}&stada=eq.i_keyrslu&claude->>nonce=eq.${encodeURIComponent(nonce)}`, body);
  let c;
  try {
    let s;
    if (erFelagslina(m)) {
      // Félag á ÞjónustuVerkstæðinu: gögnin eru mæld fyrir ÞENNAN stað (CL.uttektargogn) — verkstæðisstaða, skjöl, sölur, tæki.
      const f = (await lesa(`fyrirtaeki?select=id,nafn,kennitala,heimilisfang,netfang,er_i_thjonustu,deleted_at&id=eq.${Number(m.fyrirtaeki_id)}&limit=1`))[0];
      if (!f || f.deleted_at) throw new Error('Félagið fannst ekki lengur');
      const texti = ['Úttekt ársins (ársskoðun slökkvitækja) — ' + f.nafn, m.athugasemd || ''].filter(Boolean).join('\n');
      s = await CL.safna({ texti, hluti_heiti: 'ÞjónustuVerkstæði' }, { id: null, title: 'ÞjónustuVerkstæði · ' + f.nafn }, fyrirmaeliFyrir(m), { fyrirtaeki: f });
    } else {
      const mal = (await lesa(`thjonustubeidni?select=id,title,status,summary,notes,customer_nafn,type,deleted_at,archived_at&id=eq.${Number(m.mal_id)}&limit=1`))[0];
      if (!mal || mal.deleted_at) throw new Error('Málið fannst ekki lengur');
      // Lokað EÐA í geymslu telst lokað (sama og 492f / afgreidsla.cjs) — ekkert Claude-kall.
      if (mal.status === 'lokad' || mal.archived_at) throw new Error('Málinu var lokað eða það sett í geymslu áður en agentinn komst að — ekkert unnið');
      const texti = [mal.title, mal.customer_nafn, mal.summary, String(mal.notes || '').slice(0, 2500)].filter(Boolean).join('\n');
      s = await CL.safna({ texti, hluti_heiti: 'Þjónustuborð' }, mal, fyrirmaeliFyrir(m));
    }
    const k = await CL.kalla(s.gogn, { kerfiAuki: kerfiAuki(m, c0.persona) });
    const v = await CL.stadfesta(k.svar, s);
    c = Object.assign({ stada: 'tilbuid', nonce, at: c0.at, lokid_at: new Date().toISOString(), model: k.model, fjoldi_gagna: s.gogn.gogn.length }, v);
  } catch (e) {
    c = { stada: 'villa', nonce, at: c0.at, villa: String((e && e.message) || e).slice(0, 300), lokid_at: new Date().toISOString() };
  }
  // Endurrýni 17.11.2026: tilbúið verk og úrskurður verða AÐEINS til ef röðin er enn lifandi (i_keyrslu + sama nonce).
  // Annars (tiltekt merkti hana dauða) varð til munaðarlaust verk í afgreidsla sem línan vissi ekki af.
  const lifir = await breyta(`bord_merkingar?id=eq.${m.id}&stada=eq.i_keyrslu&claude->>nonce=eq.${encodeURIComponent(nonce)}`, {}).then((r) => r.length > 0, () => false);
  if (!lifir) return { ok: false, astaeda: 'röðin var ekki lengur í keyrslu (tiltekt eða ný merking) — ekkert búið til' };
  // ÓÐINN
  const mat = metaSkil(c, m.merki);
  let afgId = null;
  if (mat.marktaekt && mat.tegund !== 'visun') {
    try { afgId = await tilbuidVerk(m, c, mat, c0.af || 'Agnar'); }
    catch (e) { mat.marktaekt = false; mat.astaeda = 'Svarið var marktækt en tilbúna verkið varð ekki til: ' + String((e && e.message) || e).slice(0, 160); }
  }
  const uid = await odinSkra(m, mat, c, afgId);
  const nidurstada = { tegund: mat.marktaekt ? mat.tegund : null, svar: String(c.svar || c.villa || '').slice(0, 900), tillaga: c.tillaga ? c.tillaga.tegund : null,
    stadreyndir: (c.stadreyndir || []).length, omaelt: (c.omaelt || []).slice(0, 4) };
  const claudeVista = Object.assign({}, c, { persona: c0.persona });
  const skrifad = await skrifa({ stada: mat.marktaekt ? 'klarad' : 'vantar_svar', lokid_at: new Date().toISOString(), afgreidsla_id: afgId, claude: claudeVista, nidurstada,
    astaeda: mat.marktaekt ? null : mat.astaeda, odin_mat: { marktaekt: mat.marktaekt, tegund: mat.tegund || null, astaeda: mat.astaeda || null, urskurdur_id: uid, at: new Date().toISOString() } })
    .then((r) => r.length > 0, () => false);
  if (!skrifad) {
    // Röðin dó á milli (sjaldgæft: tiltekt á sömu sekúndu). Verk og úrskurður víkja — merkt, engu eytt.
    const nuIso = new Date().toISOString();
    if (afgId) await breyta(`afgreidsla?id=eq.${afgId}&stada=eq.tilbuid`, { stada: 'urelt', astaeda: 'Merkingin #' + m.id + ' var ekki lengur í keyrslu þegar svarið kom — merktu línuna aftur' }).catch(() => {});
    if (uid) await breyta(`odin_urskurdir?id=eq.${uid}`, { afturkallad_at: nuIso, afturkallad_af: 'merkja (röðin dauð)' }).catch(() => {});
    return { ok: false, astaeda: 'röðin dó áður en skilin skráðust — verk og úrskurður merkt úrelt', afgreidsla_id: null };
  }
  return { ok: true, marktaekt: mat.marktaekt, afgreidsla_id: afgId };
}

module.exports = { MERKI, STODUR, BORD, BORD_VERKST, bordAf, erFelagslina, linaFelags, HAMARK_UMFERD, FAST_MS, erFost, tiltekt, snoozeDags, snoozeBuid, rodun, teljari, fyrirmaeliFyrir, metaSkil, synilegt, kerfiAuki,
  listi, vista, keyra, vinnaMerki, linaAf };
