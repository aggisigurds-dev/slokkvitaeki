/* SJÁLFVIRK SMS-ÁMINNING — kjarni (19.10.2026).
 *
 * Notað af tveimur föllum:
 *   sms-sjalfvirkt.js       GET  /api/sms-sjalfvirkt  → FORSKOÐUN: hverjir fengju skilaboð núna. SKRIFAR ALDREI, sendir ALDREI.
 *   sms-sjalfvirkt-cron.cjs  tímasett kl. 10:00 → keyrir með { commit: true } — sendir AÐEINS ef kveikt er á
 *                            sjálfvirkni í stillingum OG Twilio er stillt á þjóni.
 *
 * Stillingar (AppSettings, á þjóni, eins á öllum vélum): `stillingar.sms.sjalfvirkt`
 *   virkt                   bool    — SJÁLFGEFIÐ SLÖKKT
 *   fyrstaEftirDogum        heiltala — fyrsta skilaboð N dögum eftir að tæki kom inn (dropoff)
 *   endurtakaDaga           heiltala — endurtaka á N daga fresti, 0 = aldrei
 *   hamarksEndurtekningar   heiltala — mest N endurtekningar á hvert verk
 *   ekkiEldraEnDagar        heiltala — sleppa verkum sem komu inn fyrir meira en N dögum (hindrar skriðu á gömul verk)
 *
 * Hvaða verk: verkbeidnir.status = 'ready', með gilt símanúmer, ekki eytt.
 *
 * TVÍSENDINGARVÖRN (kúnni má ALDREI fá SMS tvisvar) — yfirlestur 19.10.2026 fann fjögur göt sem eru nú lokuð:
 *   1. EITT SMS Á SÍMANÚMER: kúnni með mörg tilbúin verk fær ekki eitt SMS á verk. Í hverri keyrslu fær hvert númer
 *      mest eitt skilaboð (elsta verkið), og SMS á númerið (hvaða verk sem er) innan bilsins telst með.
 *   2. FAIL-CLOSED þegar svar nær þaki (1000 raðir) — þá vantar raðir hljóðlaust og verk litu út fyrir að vera ósend.
 *   3. „PENDING" Á UNDAN SENDINGU: röð með status 'pending' er skrifuð ÁÐUR en Twilio er kallað og uppfærð á eftir.
 *      Sagan telur pending sem sent, svo óvíst útkoma (tímamörk, hrun milli sendingar og skráningar) leiðir aldrei
 *      til endursendingar. Óvíst = ekki endursent.
 *   4. ATÓMÍSKT CLAIM: einkvæmur lykill (job_id, UTC-dagur) á sjálfvirkum röðum — tvær samhliða keyrslur geta ekki
 *      báðar sent á sama verk sama dag (önnur fær 409 og sleppir).
 *   Ofan á: endurathugað (status, eytt, sími) rétt fyrir hverja sendingu; aldrei nýtt SMS innan 20 klst; mest 10
 *   SENDINGAR og 25 TILRAUNIR per keyrslu; verk með 3 misheppnuðar tilraunir er sleppt (engin hamering á biluð númer);
 *   númer sem er ekki 7 stafa íslenskt eða +landsnúmer er hafnað.
 *
 * SJÁLFGILDI textanna eru afrit af SJALFGILDI í js/patches/33-sms-reminder.js — audit-sms-sjalfvirkt.cjs
 * ber þau saman svo þau reki ekki í sundur.
 */
'use strict';

const HAMARK_PER_KEYRSLU = 10;
const HAMARK_TILRAUNA = 25;
const BIL_LAGMARK_KLST = 20;
const MISHEPPNAD_HAMARK = 3;
const RADA_THAK = 1000;     // PostgREST skilar mest svo mörgum — nái svar þakinu vantar raðir
const SJALFGILDI = {
  osott: 'Góðan dag {nafn}! Slökkvitæki ehf hér. Tæki þitt (verk #{num}) bíður enn eftir þér. Vinsamlegast sæktu það sem fyrst. Sími: {phone}.'
};
const SJALFGILDI_TILBUID = 'Góðan dag {nafn}! Slökkvitæki ehf hér. Tæki þitt (verk #{num}) er tilbúið til afhendingar. ' +
  'Vinsamlegast sæktu það eins fljótt og auðið er. Sími: {phone}.';
const SJALFGILDI_STILLINGAR = { virkt: false, fyrstaEftirDogum: 2, endurtakaDaga: 7, hamarksEndurtekningar: 3, ekkiEldraEnDagar: 30 };

function sb() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY vantar');
  return { url, h: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' } };
}
async function sbGet(slod, thak) {
  const { url, h } = sb();
  const r = await fetch(url + '/rest/v1/' + slod, { headers: h, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Supabase ' + r.status + ' á ' + slod.split('?')[0]);
  const rod = await r.json();
  // FAIL-CLOSED: nái svar þakinu vantar líklega raðir → stöðva frekar en að álykta að verk sé ósent.
  if (Array.isArray(rod) && rod.length >= (thak || RADA_THAK)) throw new Error('svar frá ' + slod.split('?')[0] + ' náði þaki (' + rod.length + ' raðir) — stöðvað');
  return rod;
}

// Strangari en vafrahliðin: aðeins 7 stafa íslenskt númer, 354+7 stafir eða +landsnúmer. Allt annað er hafnað ('').
function normalizePhone(raw) {
  if (!raw) return '';
  const p = String(raw).replace(/[\s\-().]/g, '');
  if (/^00354\d{7}$/.test(p)) return '+' + p.slice(2);
  if (/^354\d{7}$/.test(p)) return '+' + p;
  if (/^\d{7}$/.test(p)) return '+354' + p;
  if (/^\+\d{8,15}$/.test(p)) return p;
  return '';
}
const gildurSimi = (p) => /^\+\d{8,15}$/.test(p);
const heiltala = (v, d, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const dagar = (iso, nu) => { const t = Date.parse(iso); return isNaN(t) ? null : (nu - t) / 86400000; };
const nyrri = (a, b) => (!a || Date.parse(b) > Date.parse(a)) ? b : a;

function stillingar(s) {
  const o = (s && typeof s === 'object') ? s : {};
  return {
    virkt: o.virkt === true,
    fyrstaEftirDogum: heiltala(o.fyrstaEftirDogum, SJALFGILDI_STILLINGAR.fyrstaEftirDogum, 0, 60),
    endurtakaDaga: heiltala(o.endurtakaDaga, SJALFGILDI_STILLINGAR.endurtakaDaga, 0, 90),
    hamarksEndurtekningar: heiltala(o.hamarksEndurtekningar, SJALFGILDI_STILLINGAR.hamarksEndurtekningar, 0, 10),
    ekkiEldraEnDagar: heiltala(o.ekkiEldraEnDagar, SJALFGILDI_STILLINGAR.ekkiEldraEnDagar, 1, 365)
  };
}

function fylla(snid, verk, simiFyrirtaekis) {
  return String(snid || '')
    .replace(/{nafn}/g, verk.customer || '')
    .replace(/{num}/g, verk.num || String(verk.id))
    .replace(/{phone}/g, simiFyrirtaekis || '');
}

async function lesaStillingar() {
  const r = await sbGet('app_settings?id=eq.1&select=sj:settings->stillingar->sms->sjalfvirkt,tg:settings->stillingar->sms->tegundir,snid:settings->stillingar->sms->snid,simi:settings->stillingar->sms->simi,log:settings->sms_aminningar_log');
  return (r && r[0]) || {};
}

// Reiknar áætlun. Skrifar ekkert. nu = ms (til prófana).
async function aaetlun(nu) {
  nu = nu || Date.now();
  const raw = await lesaStillingar();
  const st = stillingar(raw.sj);
  const tg = (raw.tg && typeof raw.tg === 'object') ? raw.tg : {};
  const textiTilbuid = (typeof raw.snid === 'string' && raw.snid.trim()) ? raw.snid : SJALFGILDI_TILBUID;
  const textiOsott = (tg.osott && typeof tg.osott.texti === 'string' && tg.osott.texti.trim()) ? tg.osott.texti : SJALFGILDI.osott;
  const simi = typeof raw.simi === 'string' ? raw.simi : '';
  const handvirk = (raw.log && typeof raw.log === 'object' && !Array.isArray(raw.log)) ? raw.log : {};

  const verk = await sbGet('verkbeidnir?status=eq.ready&eytt_at=is.null&select=id,num,customer,phone,dropoff&order=dropoff.asc&limit=' + RADA_THAK, RADA_THAK);
  const ids = verk.map(v => v.id);
  const numer = [...new Set(verk.map(v => normalizePhone(v.phone)).filter(gildurSimi))];
  // Saga per verk (sent + pending telst sent; failed talin sér) OG per símanúmer (hvaða verk sem er).
  const sagaVerk = ids.length
    ? await sbGet('sms_saga?status=in.(sent,pending,failed)&job_id=in.(' + ids.join(',') + ')&select=job_id,til,status,created_at&order=created_at.desc&limit=' + RADA_THAK)
    : [];
  const sagaNumer = numer.length
    ? await sbGet('sms_saga?status=in.(sent,pending)&til=in.(' + numer.map(n => '"' + n.replace('+', '%2B') + '"').join(',') + ')&select=til,created_at&order=created_at.desc&limit=' + RADA_THAK)
    : [];
  const perVerk = {}, bilad = {}, perNumer = {};
  sagaVerk.forEach(r => {
    const o = perVerk[r.job_id] || (perVerk[r.job_id] = { n: 0, sidast: null, misheppnad: 0 });
    if (r.status === 'failed') { o.misheppnad++; return; }
    o.n++; o.sidast = nyrri(o.sidast, r.created_at);
  });
  sagaNumer.forEach(r => { perNumer[r.til] = nyrri(perNumer[r.til], r.created_at); });
  // Handvirk SMS (sms:-hlekkur í símann) telst sending: fjöldi 1 ef engin saga, og tíminn telur í bilið.
  Object.keys(handvirk).forEach(k => {
    const t = handvirk[k];
    if (typeof t !== 'string' || isNaN(Date.parse(t))) return;
    const o = perVerk[k] || (perVerk[k] = { n: 0, sidast: null, misheppnad: 0 });
    if (o.n === 0) o.n = 1;
    o.sidast = nyrri(o.sidast, t);
  });

  const aaetlad = [], sleppt = [];
  const numerIKeyrslu = {};
  verk.forEach(v => {
    const til = normalizePhone(v.phone);
    const lysing = { id: v.id, num: v.num, nafn: v.customer, til, dagarFraMottoku: null };
    const aldur = v.dropoff ? dagar(v.dropoff + 'T00:00:00Z', nu) : null;
    lysing.dagarFraMottoku = aldur == null ? null : Math.floor(aldur);
    if (!gildurSimi(til)) return sleppt.push({ ...lysing, til: String(v.phone || ''), astaeda: 'ógilt símanúmer' });
    if (aldur == null) return sleppt.push({ ...lysing, astaeda: 'engin móttökudagsetning' });
    if (aldur > st.ekkiEldraEnDagar) return sleppt.push({ ...lysing, astaeda: 'eldra en ' + st.ekkiEldraEnDagar + ' dagar — sleppt' });
    const s = perVerk[v.id] || { n: 0, sidast: null, misheppnad: 0 };
    if (s.misheppnad >= MISHEPPNAD_HAMARK) return sleppt.push({ ...lysing, astaeda: s.misheppnad + ' misheppnaðar tilraunir — sleppt (athuga númerið)' });
    // Síðasta SMS á þetta verk EÐA á númerið (hvaða verk sem er) — nýrra ræður.
    const sidastNumer = perNumer[til] || null;
    const sidastAllt = (s.sidast && sidastNumer) ? nyrri(s.sidast, sidastNumer) : (s.sidast || sidastNumer);
    const klstSidan = sidastAllt ? dagar(sidastAllt, nu) * 24 : null;
    if (klstSidan != null && klstSidan < BIL_LAGMARK_KLST) return sleppt.push({ ...lysing, astaeda: 'SMS sent á númerið fyrir minna en ' + BIL_LAGMARK_KLST + ' klst' });
    if (numerIKeyrslu[til]) return sleppt.push({ ...lysing, astaeda: 'annað tæki sama númers fær skilaboð í þessari keyrslu (eitt SMS á númer)' });

    if (s.n === 0) {
      if (aldur < st.fyrstaEftirDogum) return sleppt.push({ ...lysing, astaeda: 'fyrsta skilaboð eftir ' + st.fyrstaEftirDogum + ' daga (á ' + Math.max(0, Math.ceil(st.fyrstaEftirDogum - aldur)) + ' d eftir)' });
      // Annað tæki sama númers fékk SMS nýlega (innan endurtekningarbils) → ekki annað „tilbúið" ofan í það.
      if (sidastNumer && st.endurtakaDaga > 0 && dagar(sidastNumer, nu) < st.endurtakaDaga - 0.15) {
        return sleppt.push({ ...lysing, astaeda: 'númerið fékk SMS fyrir ' + Math.floor(dagar(sidastNumer, nu)) + ' d (annað tæki) — bíður' });
      }
      numerIKeyrslu[til] = true;
      return aaetlad.push({ ...lysing, tegund: 'tilbuid', texti: fylla(textiTilbuid, v, simi), hvers: 'fyrsta skilaboð' });
    }
    const endurtekningarBunar = s.n - 1;
    if (st.endurtakaDaga <= 0) return sleppt.push({ ...lysing, astaeda: 'endurtekning slökkt' });
    if (endurtekningarBunar >= st.hamarksEndurtekningar) return sleppt.push({ ...lysing, astaeda: 'hámarki endurtekninga náð (' + st.hamarksEndurtekningar + ')' });
    const dSidan = dagar(sidastAllt, nu);
    // 0,15 d (~3,5 klst) svigrúm: keyrsla sem hefst mínútum fyrr en í gær frestar ekki um heilan dag.
    if (dSidan >= st.endurtakaDaga - 0.15) {
      numerIKeyrslu[til] = true;
      aaetlad.push({ ...lysing, tegund: 'osott', texti: fylla(textiOsott, v, simi), hvers: 'áminning nr. ' + (endurtekningarBunar + 1) });
    } else sleppt.push({ ...lysing, astaeda: 'næsta áminning eftir ' + Math.ceil(st.endurtakaDaga - dSidan) + ' d' });
  });

  return { stillingar: st, aaetlad, sleppt, hamarkPerKeyrslu: HAMARK_PER_KEYRSLU, athugad: verk.length };
}

async function sendaTwilio(til, texti) {
  const sid = (process.env.TWILIO_SID || '').trim(), token = (process.env.TWILIO_TOKEN || '').trim(), from = (process.env.TWILIO_FROM || '').trim();
  if (!sid || !token || !from) return { ok: false, villa: 'Twilio ekki stillt á þjóni', afdrattarlaust: true };
  try {
    const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(sid) + '/Messages.json', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(sid + ':' + token).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: til, From: from, Body: texti }),
      signal: AbortSignal.timeout(15000)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, villa: (j && j.message) || ('Twilio villa ' + r.status), afdrattarlaust: r.status >= 400 && r.status < 500 };
    return { ok: true, sid: j.sid || null };
  } catch (e) {
    // Tímamörk/netvilla: Twilio KANN að hafa tekið við skeytinu → ÓVÍST. Ekki endursent (röðin er áfram 'pending').
    return { ok: false, villa: 'óvíst: ' + String((e && e.message) || e), ovist: true };
  }
}

// Claim: skrifar 'pending' röð ÁÐUR en sent er. Einkvæmi lykillinn (job_id, UTC-dagur) skilar 409 ef önnur keyrsla
// er þegar búin að taka verkið í dag. Skilar { id } eða { claimad: true } (einhver annar á það) eða kastar.
async function takaVerk(v) {
  const { url, h } = sb();
  const r = await fetch(url + '/rest/v1/sms_saga', {
    method: 'POST', headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ tegund: v.tegund, til: v.til, nafn: v.nafn || null, texti: v.texti, job_id: v.id, status: 'pending', uppruni: 'sjalfvirkt' }),
    signal: AbortSignal.timeout(5000)
  });
  if (r.status === 409) return { claimad: true };
  if (!r.ok) throw new Error('claim mistókst: Supabase ' + r.status);
  const j = await r.json().catch(() => null);
  const id = Array.isArray(j) && j[0] && j[0].id;
  if (!id) throw new Error('claim skilaði engu auðkenni');
  return { id };
}
async function uppfaeraRod(id, patch) {
  const { url, h } = sb();
  const r = await fetch(url + '/rest/v1/sms_saga?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(patch), signal: AbortSignal.timeout(5000) });
  return r.ok;
}
// Endurathugun rétt fyrir sendingu: er verkið enn 'ready', ekki eytt, með sama síma?
async function enntGilt(v) {
  const r = await sbGet('verkbeidnir?id=eq.' + encodeURIComponent(v.id) + '&status=eq.ready&eytt_at=is.null&select=id,phone', 50);
  return !!(r && r[0] && normalizePhone(r[0].phone) === v.til);
}

// commit=false (sjálfgefið): forskoðun, ekkert sent. commit=true: sendir EF kveikt er á.
async function keyra(opt) {
  opt = opt || {};
  const a = await aaetlun(opt.nu);
  const ut = { ...a, commit: !!opt.commit, send: [], mistokst: [], sleppt2: [], stodvad: null };
  if (!opt.commit) return ut;
  if (!a.stillingar.virkt) { ut.stodvad = 'sjálfvirk sending er slökkt í stillingum'; return ut; }
  let tilraunir = 0;
  for (const v of a.aaetlad) {
    if (ut.send.length >= HAMARK_PER_KEYRSLU || tilraunir >= HAMARK_TILRAUNA) break;
    tilraunir++;
    let claim;
    try { claim = await takaVerk(v); } catch (e) { ut.stodvad = String((e && e.message) || e); break; }   // gat ekki skráð → ekki senda
    if (claim.claimad) { ut.sleppt2.push({ id: v.id, astaeda: 'önnur keyrsla tók verkið' }); continue; }
    let gilt = false;
    try { gilt = await enntGilt(v); } catch (_) { gilt = false; }
    if (!gilt) {
      await uppfaeraRod(claim.id, { status: 'failed', villa: 'verk ekki lengur tilbúið / númer breytt — ekki sent' }).catch(() => {});
      ut.sleppt2.push({ id: v.id, astaeda: 'verk ekki lengur tilbúið' });
      continue;
    }
    const t = await sendaTwilio(v.til, v.texti);
    if (t.ok) {
      const skrad = await uppfaeraRod(claim.id, { status: 'sent', twilio_sid: t.sid }).catch(() => false);
      ut.send.push({ id: v.id, nafn: v.nafn, tegund: v.tegund });
      // Röðin er þegar 'pending' (telst sent) svo tvísending er útilokuð; stöðva samt svo bilun sjáist.
      if (!skrad) { ut.stodvad = 'staða vistaðist ekki eftir sendingu (röðin er áfram pending og telst send) — stöðvað'; break; }
    } else if (t.ovist) {
      // Óvíst: röðin helst 'pending' → telst send → aldrei endursend. Stöðva keyrsluna og láta vita.
      ut.mistokst.push({ id: v.id, villa: t.villa });
      ut.stodvad = t.villa + ' — röðin er áfram pending (verður ekki endursend)';
      break;
    } else {
      await uppfaeraRod(claim.id, { status: 'failed', villa: String(t.villa).slice(0, 300) }).catch(() => {});
      ut.mistokst.push({ id: v.id, villa: t.villa });
      if (/ekki stillt/i.test(t.villa)) { ut.stodvad = t.villa; break; }
    }
  }
  return ut;
}

module.exports = { keyra, aaetlun, stillingar, normalizePhone, HAMARK_PER_KEYRSLU, HAMARK_TILRAUNA, BIL_LAGMARK_KLST, SJALFGILDI, SJALFGILDI_TILBUID, SJALFGILDI_STILLINGAR };
