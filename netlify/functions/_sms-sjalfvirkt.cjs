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
 * Tvísendingarvörn (kúnni má ALDREI fá SMS tvisvar):
 *   · sms_saga (status 'sent') per job_id + handvirk SMS-saga `sms_aminningar_log` ráða sendingarfjölda og tíma
 *   · aldrei nýtt SMS innan 20 klst frá síðasta (hindrar tvíkeyrslu sama dag)
 *   · hámark 10 sendingar per keyrslu
 *   · eitt verk getur aðeins verið einu sinni í hverri keyrslu
 *   · saga er skráð STRAX eftir hverja sendingu; mistakist skráning er stoppað (ekki haldið áfram blint)
 *
 * SJÁLFGILDI textanna eru afrit af SJALFGILDI í js/patches/33-sms-reminder.js — audit-sms-sjalfvirkt.cjs
 * ber þau saman svo þau reki ekki í sundur.
 */
'use strict';

const HAMARK_PER_KEYRSLU = 10;
const BIL_LAGMARK_KLST = 20;
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
async function sbGet(slod) {
  const { url, h } = sb();
  const r = await fetch(url + '/rest/v1/' + slod, { headers: h, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Supabase ' + r.status + ' á ' + slod.split('?')[0]);
  return r.json();
}

function normalizePhone(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/[\s\-().]/g, '');
  if (p.startsWith('00354')) return '+' + p.slice(2);
  if (!p.startsWith('+')) {
    if (p.length === 7) return '+354' + p;
    if (p.length === 10 && p.startsWith('354')) return '+' + p;
    return '+354' + p;
  }
  return p;
}
const gildurSimi = (p) => /^\+\d{7,15}$/.test(p);
const heiltala = (v, d, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const dagar = (iso, nu) => { const t = Date.parse(iso); return isNaN(t) ? null : (nu - t) / 86400000; };

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

  const verk = await sbGet('verkbeidnir?status=eq.ready&eytt_at=is.null&select=id,num,customer,phone,dropoff&order=dropoff.asc&limit=500');
  const ids = verk.map(v => v.id);
  const saga = ids.length
    ? await sbGet('sms_saga?status=eq.sent&job_id=in.(' + ids.join(',') + ')&select=job_id,created_at&limit=2000')
    : [];
  const perVerk = {};
  saga.forEach(r => {
    const o = perVerk[r.job_id] || (perVerk[r.job_id] = { n: 0, sidast: null });
    o.n++;
    if (!o.sidast || Date.parse(r.created_at) > Date.parse(o.sidast)) o.sidast = r.created_at;
  });
  // Handvirk SMS (sms:-hlekkur í símann) telst sending: fjöldi 1 ef engin saga, og tíminn telur í bilið.
  Object.keys(handvirk).forEach(k => {
    const t = handvirk[k];
    if (typeof t !== 'string' || isNaN(Date.parse(t))) return;
    const o = perVerk[k] || (perVerk[k] = { n: 0, sidast: null });
    if (o.n === 0) o.n = 1;
    if (!o.sidast || Date.parse(t) > Date.parse(o.sidast)) o.sidast = t;
  });

  const aaetlad = [], sleppt = [];
  verk.forEach(v => {
    const simi_ = normalizePhone(v.phone);
    const lysing = { id: v.id, num: v.num, nafn: v.customer, til: simi_, dagarFraMottoku: null };
    const aldur = v.dropoff ? dagar(v.dropoff + 'T00:00:00Z', nu) : null;
    lysing.dagarFraMottoku = aldur == null ? null : Math.floor(aldur);
    if (!gildurSimi(simi_)) return sleppt.push({ ...lysing, astaeda: 'ógilt símanúmer' });
    if (aldur == null) return sleppt.push({ ...lysing, astaeda: 'engin móttökudagsetning' });
    if (aldur > st.ekkiEldraEnDagar) return sleppt.push({ ...lysing, astaeda: 'eldra en ' + st.ekkiEldraEnDagar + ' dagar — sleppt' });
    const s = perVerk[v.id] || { n: 0, sidast: null };
    const klstSidan = s.sidast ? dagar(s.sidast, nu) * 24 : null;
    if (klstSidan != null && klstSidan < BIL_LAGMARK_KLST) return sleppt.push({ ...lysing, astaeda: 'SMS sent fyrir minna en ' + BIL_LAGMARK_KLST + ' klst' });
    if (s.n === 0) {
      if (aldur >= st.fyrstaEftirDogum) {
        aaetlad.push({ ...lysing, tegund: 'tilbuid', texti: fylla(textiTilbuid, v, simi), hvers: 'fyrsta skilaboð' });
      } else sleppt.push({ ...lysing, astaeda: 'fyrsta skilaboð eftir ' + st.fyrstaEftirDogum + ' daga (á ' + Math.max(0, Math.ceil(st.fyrstaEftirDogum - aldur)) + ' d eftir)' });
      return;
    }
    const endurtekningarBunar = s.n - 1;
    if (st.endurtakaDaga <= 0) return sleppt.push({ ...lysing, astaeda: 'endurtekning slökkt' });
    if (endurtekningarBunar >= st.hamarksEndurtekningar) return sleppt.push({ ...lysing, astaeda: 'hámarki endurtekninga náð (' + st.hamarksEndurtekningar + ')' });
    const dSidan = dagar(s.sidast, nu);
    if (dSidan >= st.endurtakaDaga) {
      aaetlad.push({ ...lysing, tegund: 'osott', texti: fylla(textiOsott, v, simi), hvers: 'áminning nr. ' + (endurtekningarBunar + 1) });
    } else sleppt.push({ ...lysing, astaeda: 'næsta áminning eftir ' + Math.ceil(st.endurtakaDaga - dSidan) + ' d' });
  });

  return { stillingar: st, aaetlad, sleppt, hamarkPerKeyrslu: HAMARK_PER_KEYRSLU, athugad: verk.length };
}

async function sendaTwilio(til, texti) {
  const sid = (process.env.TWILIO_SID || '').trim(), token = (process.env.TWILIO_TOKEN || '').trim(), from = (process.env.TWILIO_FROM || '').trim();
  if (!sid || !token || !from) return { ok: false, villa: 'Twilio ekki stillt á þjóni' };
  const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(sid) + '/Messages.json', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(sid + ':' + token).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: til, From: from, Body: texti }),
    signal: AbortSignal.timeout(15000)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, villa: (j && j.message) || ('Twilio villa ' + r.status) };
  return { ok: true, sid: j.sid || null };
}
async function skraSogu(rod) {
  const { url, h } = sb();
  const r = await fetch(url + '/rest/v1/sms_saga', { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(rod), signal: AbortSignal.timeout(5000) });
  return r.ok;
}

// commit=false (sjálfgefið): forskoðun, ekkert sent. commit=true: sendir EF kveikt er á.
async function keyra(opt) {
  opt = opt || {};
  const a = await aaetlun(opt.nu);
  const ut = { ...a, commit: !!opt.commit, send: [], mistokst: [], stodvad: null };
  if (!opt.commit) return ut;
  if (!a.stillingar.virkt) { ut.stodvad = 'sjálfvirk sending er slökkt í stillingum'; return ut; }
  for (const v of a.aaetlad.slice(0, HAMARK_PER_KEYRSLU)) {
    const t = await sendaTwilio(v.til, v.texti);
    if (!t.ok) {
      try { await skraSogu({ tegund: v.tegund, til: v.til, nafn: v.nafn || null, texti: v.texti, job_id: v.id, status: 'failed', villa: String(t.villa).slice(0, 300), uppruni: 'sjalfvirkt' }); } catch (_) {}
      ut.mistokst.push({ id: v.id, villa: t.villa });
      if (/ekki stillt/i.test(t.villa)) { ut.stodvad = t.villa; break; }
      continue;
    }
    let skrad = false;
    try { skrad = await skraSogu({ tegund: v.tegund, til: v.til, nafn: v.nafn || null, texti: v.texti, job_id: v.id, status: 'sent', twilio_sid: t.sid, uppruni: 'sjalfvirkt' }); } catch (_) {}
    ut.send.push({ id: v.id, nafn: v.nafn, tegund: v.tegund });
    if (!skrad) { ut.stodvad = 'saga vistaðist ekki eftir sendingu — stöðvað til að koma í veg fyrir tvísendingu'; break; }
  }
  return ut;
}

module.exports = { keyra, aaetlun, stillingar, normalizePhone, HAMARK_PER_KEYRSLU, BIL_LAGMARK_KLST, SJALFGILDI, SJALFGILDI_TILBUID, SJALFGILDI_STILLINGAR };
