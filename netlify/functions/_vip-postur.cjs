// _vip-postur.cjs — VIP-vaktlistinn: hrein rökfræði (engin I/O). Lota 8, 17.11.2026.
//
// Agnar 17.11.2026: „vantar kannski að geta sett ákveðin fyrirtæki í vip watchlist svo við getum svarað bara innan klst,
// <fjögur félög nefnd með nafni>, og kannski einhverja fleiri mikilvæga“. (Hvaða félög: fyrirtaeki.vip — gögn, ekki kóði.)
//
// ÞRJÚ SKREF, öll hér svo þau prófist án gagnagrunns (test/vip-postur.test.cjs):
//   1. byggjaVisi(vipRadir, tengilidir) — félög (eitt á kennitölu) og hvaða netföng / lén / kennitölur vísa á þau.
//      Heimildir: fyrirtaeki.netfang á VIP-röðunum + charlize_contacts (approved) á kennitölum þeirra.
//      Almenn lén (gmail, hotmail …) og okkar eigin lén eru ALDREI lén félags — þá pöruðust ótengdir sendendur.
//   2. para(skeyti, visir) — sendandi → félag: nákvæmt netfang → lén → kennitala í efni/texta. NAFN ER EKKI NOTAÐ
//      (birgir sem nefnir „Center Hótel“ í reikningi er ekki VIP-póstur — klukkustundarloforðið þynnist út).
//      REKSTRARFÉLÖG: póstur af léni rekstrarfélagsins er VIP þótt staðurinn sem hann fjallar um hafi annan greiðanda — lénið
//      vísar á félagið sem sendir, ekki á greiðandann.
//   3. thraedir(postar, samhengi, visir, nu) — sama „ósvarað“-regla og Tölvupóstar (448 byggjaThraedi):
//      svar í Sent á eftir síðasta innkomna skeyti, „svarað“-skráning (reikninga_postur_activity), svarad_at á málinu,
//      málið lokað EFTIR síðasta skeyti, 🟢 Lokið-merki eða falið → klukkan stöðvast. Að auki (hólf án thread_id, t.d.
//      slokkvitaeki@ í M365): hvaða sendi póstur sem er til sendandans eftir móttöku telst svar. Sú viðbót getur
//      aðeins SLÖKKT klukku, aldrei kveikt — „ósvarað“ er aðeins satt ef ekkert svar finnst.
//   klukka(mottekid, nu, svartimi) — mínútur frá móttöku og litur: grænt < 2/3 svartíma, gult < svartími, rautt eftir það
//   (sjálfgefið 60 mín. → gult eftir 40, rautt eftir 60).
'use strict';

const ALMENN_LEN = /^(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|me|mac|simnet|internet|visir|msn|aol|proton|protonmail)\./i;
const OKKAR_LEN = /^(eldklar\.is|brunaholf\.is)$/i;
const STARFSMENN = ['aggisigurds@gmail.com', 'anninn76@gmail.com', 'brynjar.oryggislausnir@gmail.com'];
const OKKAR_KT = ['6005080400', '5204172300'];
// Sömu reglur og 448 (sjálfvirkt / reikningur frá birgi) — sést ekki sem „bíður svars“ þar, svo ekki heldur hér.
const SJALFV_RE = /no-?reply|noreply|donotreply|mailer-daemon|postmaster|notification|newsletter|nyhetsbrev|frettabref/i;
const SJALFV_EFNI = /^(Delivery Status Notification|Undeliverable|Mail delivery failed|Automatic reply|Sjálfvirkt svar|Out of office)/i;
const BIRGI_RE = /sölureikning|^\s*reikningur\s+(nr|númer|\d)|^\s*reikningur frá |reikningur \S+ frá |hefur sent þér reikning|móttekið rafrænt skjal|greiðsluseð|reikningsyfirlit|^\s*reikningur f(yrir)?\.? vinnu/i;
const OKKAR_NAFN = /sl[öo]kkvit[æa]ki|brunah[óo]lf|eldklar|600508-?0400/i;
const SVAR_EFNI = /^\s*(re|sv|svar|aw)\s*:/i;
const AUGL_MERKI = /^CATEGORY_(PROMOTIONS|SOCIAL)$/;
const LOKID = '🟢 Lokið';
const GMAIL_HOLF = ['eldklar@eldklar.is', 'bokhald@eldklar.is'];

const ts = (s) => { const n = Date.parse(s || ''); return isFinite(n) ? n : 0; };
const lag = (s) => String(s || '').toLowerCase().trim();
const len = (e) => { const i = lag(e).lastIndexOf('@'); return i < 0 ? '' : lag(e).slice(i + 1); };
const ktD = (s) => String(s || '').replace(/\D/g, '');
const netfongUr = (s) => (String(s || '').toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || []);
const fraOkkur = (e) => { const s = lag(e); return OKKAR_LEN.test(len(s)) || STARFSMENN.indexOf(s) >= 0; };
const almennt = (d) => !d || ALMENN_LEN.test(d) || OKKAR_LEN.test(d);
// Sami þráðarlykill og 448 (svo borðið finni þráðinn í Tölvupóstum): thread_id, annars sendandi|efni án Re:/Fwd:.
const efniLykill = (s) => String(s || '').replace(/^\s*((re|sv|fwd?|fw|vs|aw)\s*:\s*)+/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
const thradLykill = (m) => m.thread_id || (lag(m.sender_email) + '|' + (efniLykill(m.subject) || m.message_id || m.id));

// Birtingarheiti félags: sameiginlegt upphaf nafnanna („Félag - X“, „Félag - Y“ → „Félag“).
function felagsHeiti(nofn) {
  const l = nofn.filter(Boolean);
  if (!l.length) return '';
  if (l.length === 1) return l[0];
  let p = l[0];
  l.forEach((n) => { let i = 0; while (i < p.length && i < n.length && p[i].toLowerCase() === n[i].toLowerCase()) i++; p = p.slice(0, i); });
  // Endi upphafið inni í orði („Dekk, D“ úr „Dekk, Dalvegur“ og „Dekk, Dekkjalager“) er klippt aftur að síðasta orðabili.
  if (l.some((n) => n.length > p.length && /[\p{L}\p{N}]/u.test(n[p.length]) && /[\p{L}\p{N}]$/u.test(p))) p = p.replace(/[\p{L}\p{N}]+$/u, '');
  p = p.replace(/[\s,\-–(]+$/, '').trim();
  return p.length >= 4 ? p : l[0];
}

function byggjaVisi(vipRadir, tengilidir) {
  const felog = new Map();            // kt (eða 'id:<id>') → félag
  const netfang = new Map(), lenMap = new Map(), ktMap = new Map();
  (vipRadir || []).filter((r) => r && r.vip !== false).sort((a, b) => a.id - b.id).forEach((r) => {
    const k = ktD(r.kennitala).length === 10 ? ktD(r.kennitala) : 'id:' + r.id;
    if (!felog.has(k)) felog.set(k, { lykill: k, kt: ktD(r.kennitala) || null, radir: [], nofn: [], svartimi: 60, coId: r.id });
    const f = felog.get(k);
    f.radir.push(r.id); f.nofn.push(r.nafn);
    const sv = Number(r.vip_svartimi_min);
    if (f.radir.length === 1) f.svartimi = sv > 0 ? sv : 60; else if (sv > 0) f.svartimi = Math.min(f.svartimi, sv);
    netfongUr(r.netfang).forEach((e) => { if (!fraOkkur(e) && !netfang.has(e)) netfang.set(e, { f, coId: r.id }); });
  });
  felog.forEach((f) => { f.nafn = felagsHeiti(f.nofn); if (f.kt) ktMap.set(f.kt, f); });
  // Lén úr eigin netföngum VIP-raðanna ganga fyrir; lén úr tengiliðum fylla aðeins í það sem vantar.
  netfang.forEach((v, e) => { const d = len(e); if (!almennt(d) && !lenMap.has(d)) lenMap.set(d, v.f); });
  (tengilidir || []).forEach((t) => {
    const f = ktMap.get(ktD(t.kennitala));
    if (!f || (t.status && t.status !== 'approved')) return;
    const e = lag(t.netfang);
    if (e && !fraOkkur(e) && !netfang.has(e)) netfang.set(e, { f, coId: f.coId });
    const d = lag(t.len) || len(e);
    if (!almennt(d) && !lenMap.has(d)) lenMap.set(d, f);
  });
  return { felog: [...felog.values()], netfang, len: lenMap, kt: ktMap };
}

function para(m, visir) {
  if (!m || !visir) return null;
  const e = lag(m.sender_email);
  if (!e || fraOkkur(e)) return null;
  const n = visir.netfang.get(e);
  if (n) return { felag: n.f, coId: n.coId, hvernig: 'netfang' };
  const d = len(e);
  if (!almennt(d) && visir.len.has(d)) { const f = visir.len.get(d); return { felag: f, coId: f.coId, hvernig: 'lén' }; }
  const texti = (m.subject || '') + ' ' + (m.body_preview || m.snippet || '');
  const re = /\b(\d{6})-?(\d{4})\b/g; let x;
  while ((x = re.exec(texti))) {
    const k = x[1] + x[2];
    if (OKKAR_KT.indexOf(k) >= 0) continue;
    const f = visir.kt.get(k);
    if (f) return { felag: f, coId: f.coId, hvernig: 'kennitala' };
  }
  return null;
}

function klukka(mottekid, nu, svartimi) {
  const sv = Number(svartimi) > 0 ? Number(svartimi) : 60;
  const min = Math.max(0, Math.floor(((nu instanceof Date ? nu.getTime() : Number(nu) || Date.now()) - ts(mottekid)) / 60000));
  const litur = min >= sv ? 'rautt' : min >= Math.round(sv * 2 / 3) ? 'gult' : 'graent';
  return { min, litur, svartimi: sv };
}
// „23 mín.“ · „1 klst. 5 mín.“ · „3 d.“ — sama form á borðinu og í prófunum.
function lengd(min) {
  if (min < 60) return min + ' mín.';
  if (min < 24 * 60) { const h = Math.floor(min / 60), r = min % 60; return h + ' klst.' + (r ? ' ' + r + ' mín.' : ''); }
  return Math.floor(min / 1440) + ' d.';
}

// postar: email_digest-raðir (öll hólf, INBOX + SENT). samhengi: { activity:Set(message_id), falid:Set(message_id), mal:Map(digest_id→mál) }.
function thraedir(postar, samhengi, visir, nu) {
  const ctx = samhengi || {};
  const activity = ctx.activity || new Set(), falid = ctx.falid || new Set(), malMap = ctx.mal || new Map();
  const vakt = new Set((ctx.holf || GMAIL_HOLF.concat(['slokkvitaeki@brunaholf.is'])).map(lag));
  const sendir = (postar || []).filter((x) => x.folder === 'SENT');
  const hopar = new Map();
  (postar || []).forEach((m) => {
    if (!vakt.has(lag(m.account))) return;
    const k = thradLykill(m);
    if (!hopar.has(k)) hopar.set(k, []);
    hopar.get(k).push(m);
  });
  const ut = [];
  hopar.forEach((msgs, k) => {
    msgs.sort((a, b) => ts(a.received_at) - ts(b.received_at));
    const inn = msgs.filter((x) => x.folder !== 'SENT');
    if (!inn.length) return;
    let vip = null, vipSk = null;
    for (let i = inn.length - 1; i >= 0 && !vip; i--) { vip = para(inn[i], visir); if (vip) vipSk = inn[i]; }
    if (!vip) return;
    const sidastaInn = inn[inn.length - 1];
    const fra = lag(sidastaInn.sender_email), mt = ts(sidastaInn.received_at);
    const sentEftir = msgs.some((x) => x.folder === 'SENT' && ts(x.received_at) > mt);
    // Hólf án thread_id (M365): sendur póstur til sendandans eftir móttöku, úr hvaða hólfi okkar sem er.
    const sentTilHans = !!fra && sendir.some((x) => ts(x.received_at) > mt && netfongUr(x.to_addresses).indexOf(fra) >= 0);
    let mal = null; for (let i = inn.length - 1; i >= 0 && !mal; i--) mal = malMap.get(String(inn[i].id)) || null;
    const svarad = sentEftir || sentTilHans || activity.has(sidastaInn.message_id) || !!(mal && mal.svarad_at && ts(mal.svarad_at) > mt);
    const lab = Array.isArray(sidastaInn.labels) ? sidastaInn.labels : [];
    const lokid = msgs.some((x) => (x.labels || []).indexOf(LOKID) >= 0);
    const malLokad = !!(mal && mal.status === 'lokad' && ts(mal.updated_at) >= mt);
    const fal = inn.every((x) => falid.has(x.message_id));
    const efni = String(sidastaInn.subject || '');
    const sjalfvirkt = SJALFV_RE.test(fra) || SJALFV_EFNI.test(efni);
    const auglysing = lab.some((l) => AUGL_MERKI.test(l));
    const reikningur = !mal && !SVAR_EFNI.test(efni) && BIRGI_RE.test(efni) && !OKKAR_NAFN.test(efni);
    const bidur = !svarad && !lokid && !malLokad && !fal && !sjalfvirkt && !auglysing && !reikningur;
    const kl = klukka(sidastaInn.received_at, nu, vip.felag.svartimi);
    // Hólf sem lesarinn segir fast (eða Sent-mappa ólesin): ekki hægt að fullyrða „ósvarað“ — klukkan stendur, merkt óvíst.
    const ovisst = (ctx.ovisst && ctx.ovisst[lag(sidastaInn.account)]) || null;
    ut.push({
      ovisst,
      k, bidur, svarad, account: lag(sidastaInn.account), gmail: GMAIL_HOLF.indexOf(lag(sidastaInn.account)) >= 0,
      felag: vip.felag.nafn, felagKt: vip.felag.kt, coId: vip.coId, hvernig: vip.hvernig + (vipSk !== sidastaInn ? ' (þráður)' : ''),
      svartimi: vip.felag.svartimi, mottekid: sidastaInn.received_at, min: kl.min, litur: kl.litur,
      fra_nafn: sidastaInn.sender_name || sidastaInn.sender_email || '', fra: sidastaInn.sender_email || '',
      efni: efni || '(ekkert efni)', snippet: String(sidastaInn.snippet || sidastaInn.body_preview || '').replace(/\s+/g, ' ').slice(0, 180),
      digest_id: sidastaInn.id, message_id: sidastaInn.message_id || null, thread_id: sidastaInn.thread_id || null,
      mal_id: mal ? mal.id : null, fjoldi: msgs.length,
    });
  });
  // Ósvarað efst, elsta (rauðasta) fyrst; svo nýlega svarað.
  ut.sort((a, b) => (b.bidur - a.bidur) || (a.bidur ? ts(a.mottekid) - ts(b.mottekid) : ts(b.mottekid) - ts(a.mottekid)));
  return ut;
}

module.exports = { byggjaVisi, para, thraedir, klukka, lengd, felagsHeiti, thradLykill, efniLykill, netfongUr, fraOkkur, GMAIL_HOLF };
