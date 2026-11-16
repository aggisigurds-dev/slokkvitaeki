// _einkaritari-stadreyndir.cjs — staðreyndir Einkaritarans (16.11.2026)
//
// Hrein söfnunarföll sem lesa gögn úr Supabase. Ekkert er skrifað, ekkert net-kall
// annað en á gagnagrunninn. Prófanleg: öll söfnunarföll taka { nu, dagar } sem viðfang.
//
// ARKITEKTÚRA: sama mynstur og _radgjafinn.cjs — sb(), sbOll(), lesaKv(), skrifaKv(),
// reyna(), hylja(). Einkaritarinn les ÖNNUR gögn en Ráðgjafinn: Ráðgjafinn les pósthólf
// og skrifar ráð; Einkaritarinn les fjármálin, dagatalið og vikuna í tölum.

'use strict';

const LYKILL = 'einkaritari';
const GOGN_LYKILL = 'einkaritari_gogn';

/* ── Supabase helpers ───────────────────────────────────────────────────────────── */
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`SB ${r.status} ${path.split('?')[0]}: ${(await r.text()).slice(0, 120)}`);
  return r.json();
}

async function sbOll(path) {
  const ut = [];
  for (let off = 0; off < 50000; off += 1000) {
    const r = await sb(`${path}&limit=1000&offset=${off}`);
    ut.push(...r);
    if (r.length < 1000) break;
  }
  return ut;
}

async function lesaKv(key) {
  const r = await sb(`app_kv?key=eq.${encodeURIComponent(key)}&select=value&limit=1`);
  return r.length ? r[0].value : null;
}

async function skrifaKv(key, value) {
  const r = await fetch(`${SB_URL}/rest/v1/app_kv?on_conflict=key`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`KV write ${r.status}: ${(await r.text()).slice(0, 120)}`);
}

/* ── Hjálpar ────────────────────────────────────────────────────────────────────── */
const iso = (d) => (d instanceof Date ? d : new Date(d)).toISOString();
const dagsIs = (s) => { const d = new Date(s); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const kr = (n) => Math.round(Number(n) || 0);

function hylja(t) {
  if (!t) return '';
  return String(t)
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[netfang]')
    .replace(/IS\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/gi, '[IBAN]')
    .replace(/\d{4}-\d{2}-\d{6}/g, '[bankareikningur]')
    .replace(/\b\d{6}-?\d{4}\b/g, (m) => /^(19|20)\d{2}/.test(m) ? m : '[kt]')
    .replace(/\b[5-9]\d{2}\s?\d{4}\b/g, '[simi]');
}

const HOPAR = [
  { id: 'heimaleiga', nafn: 'Heimaleiga', st: 'H', base: 'rekstrarfelag=eq.Heimaleiga', charlize: 'heimaleig' },
  { id: 'center', nafn: 'Center Hotels', st: 'C', base: 'or=(kennitala.eq.450905-1430,kennitala.eq.4509051430)', charlize: 'center hot' },
];

/* ── 1. GREITT — greiddar kröfur beggja félaga ──────────────────────────────────── */
// Sama skilgreining og greittVikan í _radgjafinn.cjs en samanburður við fyrri viku.
async function greitt(dagar, nu) {
  const fra = new Date(nu - dagar * 864e5);
  const fyrri_fra = new Date(fra - dagar * 864e5);
  const [sl, sl_fyrri, bh, bh_fyrri] = await Promise.all([
    sb(`solur?select=samtals,status,is_credit,greitt_med&paid_at=gte.${iso(fra)}&order=id.asc&limit=1000`),
    sb(`solur?select=samtals,status,is_credit,greitt_med&paid_at=gte.${iso(fyrri_fra)}&paid_at=lt.${iso(fra)}&order=id.asc&limit=1000`),
    sb(`invoices?select=upphaed_total&source=eq.payday&status=eq.PAID&greidsla_date=gte.${iso(fra).slice(0, 10)}&order=id.asc&limit=1000`),
    sb(`invoices?select=upphaed_total&source=eq.payday&status=eq.PAID&greidsla_date=gte.${iso(fyrri_fra).slice(0, 10)}&greidsla_date=lt.${iso(fra).slice(0, 10)}&order=id.asc&limit=1000`),
  ]);
  const sia = (r) => r.filter((x) => x.greitt_med === 'reikningur' && x.status !== 'void' && !x.is_credit);
  const slg = sia(sl), slg_f = sia(sl_fyrri);
  const sum = (a) => a.reduce((t, x) => t + kr(x.samtals || x.upphaed_total), 0);
  return {
    slokkvitaeki: { fjoldi: slg.length, kr: sum(slg), fyrri_fjoldi: slg_f.length, fyrri_kr: sum(slg_f) },
    brunaholf: { fjoldi: bh.length, kr: sum(bh), fyrri_fjoldi: bh_fyrri.length, fyrri_kr: sum(bh_fyrri) },
    samtals: { fjoldi: slg.length + bh.length, kr: sum(slg) + sum(bh), fyrri_fjoldi: slg_f.length + bh_fyrri.length, fyrri_kr: sum(slg_f) + sum(bh_fyrri) },
  };
}

/* ── 2. SENDAR KRÖFUR ──────────────────────────────────────────────────────────── */
async function sendar(dagar, nu) {
  const fra = new Date(nu - dagar * 864e5);
  const [sl, bh] = await Promise.all([
    sb(`solur?select=samtals,status,is_credit&krafa_sent_at=gte.${iso(fra)}&status=neq.void&is_credit=is.false&order=id.asc&limit=1000`),
    sb(`invoices?select=upphaed_total,utgafudagur,gjalddagi&source=eq.payday&status=in.(PAID,SENT)&gjalddagi=gte.${iso(fra).slice(0, 10)}&order=id.asc&limit=1000`),
  ]);
  const bh_sia = bh.filter((r) => {
    const dags = r.utgafudagur || r.gjalddagi;
    return dags && dags >= iso(fra).slice(0, 10);
  });
  return {
    slokkvitaeki: { fjoldi: sl.length, kr: sl.reduce((a, r) => a + kr(r.samtals), 0) },
    brunaholf: { fjoldi: bh_sia.length, kr: bh_sia.reduce((a, r) => a + kr(r.upphaed_total), 0) },
  };
}

/* ── 3. NÝIR Í ÞJÓNUSTU ───────────────────────────────────────────────────────── */
async function nyirIThjonustu(dagar, nu) {
  const fra = new Date(nu - dagar * 864e5);
  const r = await sb(`fyrirtaeki?select=id,nafn,created_at&i_thjonustu=eq.true&created_at=gte.${iso(fra)}&order=created_at.desc&limit=50`);
  return r.map((x) => ({ id: x.id, nafn: hylja(x.nafn), dags: String(x.created_at).slice(0, 10) }));
}

/* ── 4. SAMNINGAR — Heimaleiga og Center Hotels ────────────────────────────────── */
async function samningar(nu) {
  const ut = {};
  for (const h of HOPAR) {
    const [ogreitt_r, sidasta_greidsla, bordsmal, charlize_r] = await Promise.all([
      sb(`v_krafa_ogreidd?select=id,samtals,dagar,flokkur&${h.base.replace('rekstrarfelag=eq.', 'rekstrarfelag=eq.')}&order=id.asc&limit=100`).catch(() => []),
      sb(`invoices?select=upphaed_total,greidsla_date&source=eq.payday&status=eq.PAID&${h.base}&order=greidsla_date.desc&limit=1`).catch(() => []),
      sb(`thjonustubeidni?select=id,title,summary,created_at&deleted_at=is.null&archived_at=is.null&lokid_at=is.null&${h.base.includes('kennitala') ? 'customer_kt=eq.450905-1430' : `customer_nafn=ilike.*${h.nafn}*`}&order=created_at.desc&limit=10`).catch(() => []),
      sb(`v_charlize_active?select=id,fact,scope&scope=in.(baedi,slokkvitaeki)&fact=ilike.*${encodeURIComponent(h.charlize)}*&order=updated_at.desc&limit=5`).catch(() => []),
    ]);
    const virkt = ogreitt_r.filter((x) => x.flokkur === 'innheimta');
    const bid = ogreitt_r.filter((x) => x.flokkur === 'a_bid');
    ut[h.id] = {
      nafn: h.nafn,
      ogreitt: { fjoldi: virkt.length, kr: virkt.reduce((a, x) => a + kr(x.samtals), 0), elsta_dagar: virkt.reduce((a, x) => Math.max(a, Number(x.dagar) || 0), 0) },
      a_bid: { fjoldi: bid.length, kr: bid.reduce((a, x) => a + kr(x.samtals), 0) },
      sidasta_greidsla: sidasta_greidsla.length ? { kr: kr(sidasta_greidsla[0].upphaed_total), dags: String(sidasta_greidsla[0].greidsla_date).slice(0, 10) } : null,
      opin_mal: bordsmal.slice(0, 5).map((m) => ({ titill: hylja(String(m.title || '').slice(0, 120)), stofnad: String(m.created_at).slice(0, 10) })),
      charlize: charlize_r.slice(0, 3).map((c) => hylja(String(c.fact || '').slice(0, 200))),
    };
  }
  return ut;
}

/* ── 5. ÁMINNINGAR ─────────────────────────────────────────────────────────────── */
async function aminningar(dagar, nu) {
  const fra_dags = iso(new Date(nu)).slice(0, 10);
  const [forgm, eindagar_r, fresti_r] = await Promise.all([
    sb(`thjonustubeidni?select=id,title,summary,customer_nafn,created_at,tags&deleted_at=is.null&archived_at=is.null&lokid_at=is.null&or=(tags.cs.["forgangsmal"],tags.cs.["skilabod"])&order=created_at.desc&limit=12`),
    sb(`invoices?select=tilvisun,customer_nafn,upphaed_total,gjalddagi&source=eq.payday&status=eq.SENT&gjalddagi=lt.${fra_dags}&order=gjalddagi.asc&limit=30`),
    sb(`v_uttektarplan?select=fyrirtaeki_nafn,stada,naesta_skodan&stada=eq.a_fresti&order=naesta_skodan.asc&limit=20`).catch(() => []),
  ]);

  let dagskra_gild = null;
  try {
    const CY = require('./combo-yfirlit.cjs');
    if (CY.dagskra) dagskra_gild = await CY.dagskra(dagar);
  } catch (_) { /* dagskra vantar */ }

  return {
    dagskra: dagskra_gild,
    eindagar: eindagar_r.map((r) => ({
      tilvisun: r.tilvisun, nafn: hylja(r.customer_nafn), kr: kr(r.upphaed_total), gjalddagi: r.gjalddagi,
    })),
    forgangsmal: forgm.map((m) => ({
      titill: hylja(String(m.title || '').slice(0, 160)),
      hvers_vegna: hylja(String(m.summary || '').slice(0, 240)),
      vidskiptavinur: m.customer_nafn || null,
      tegund: (m.tags || []).includes('forgangsmal') ? 'forgangsmal' : 'skilabod',
    })),
    a_fresti: fresti_r.map((r) => ({ nafn: hylja(r.fyrirtaeki_nafn), naesta_skodan: r.naesta_skodan })),
  };
}

/* ── 6. VIKAN — hvað gerðist ───────────────────────────────────────────────────── */
async function vikunnar(dagar, nu) {
  const fra = new Date(nu - dagar * 864e5);
  const fra_iso = iso(fra);
  const [ny_mal, lokud_mal, vl_klarad, charlize_nytt, villur] = await Promise.all([
    sb(`thjonustubeidni?select=id&deleted_at=is.null&created_at=gte.${fra_iso}&limit=500`).then((r) => r.length),
    sb(`thjonustubeidni?select=id&lokid_at=gte.${fra_iso}&limit=500`).then((r) => r.length),
    sb(`verkefnalisti?select=id&status=eq.klarad&updated_at=gte.${fra_iso}&limit=500`).then((r) => r.length),
    sb(`v_charlize_active?select=id&updated_at=gte.${fra_iso}&limit=500`).then((r) => r.length),
    sb(`automation_runs?select=job_name,status,detail&status=eq.error&started_at=gte.${fra_iso}&order=started_at.desc&limit=100`),
  ]);
  const villa_flokkur = {};
  for (const v of villur) { villa_flokkur[v.job_name] = (villa_flokkur[v.job_name] || 0) + 1; }
  return {
    ny_bordsmal: ny_mal,
    lokud_bordsmal: lokud_mal,
    verkefnalisti_klarad: vl_klarad,
    nyjar_stadreyndir: charlize_nytt,
    villur: Object.entries(villa_flokkur).map(([nafn, fjoldi]) => ({ nafn, fjoldi })).sort((a, b) => b.fjoldi - a.fjoldi),
  };
}

/* ── SAFNA — aðalfallið ────────────────────────────────────────────────────────── */
async function safna({ nu = new Date(), dagar = 7 } = {}) {
  const t = new Date(nu);
  const vikudagar = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'];
  const f = {
    dags: iso(t).slice(0, 10),
    vikudagur: vikudagar[t.getUTCDay()],
    dagar,
    greitt: null,
    sendar: null,
    nyir_i_thjonustu: null,
    samningar: null,
    aminningar: null,
    vikunnar: null,
    omaelt: [],
  };

  const reyna = async (hluti, fn) => {
    try { return await fn(); }
    catch (e) { f.omaelt.push({ hluti, villa: String((e && e.message) || e).slice(0, 200) }); return null; }
  };

  await Promise.all([
    reyna('greitt', () => greitt(dagar, t)).then((r) => { f.greitt = r; }),
    reyna('sendar', () => sendar(dagar, t)).then((r) => { f.sendar = r; }),
    reyna('nyir_i_thjonustu', () => nyirIThjonustu(dagar, t)).then((r) => { f.nyir_i_thjonustu = r; }),
    reyna('samningar', () => samningar(t)).then((r) => { f.samningar = r; }),
    reyna('aminningar', () => aminningar(dagar, t)).then((r) => { f.aminningar = r; }),
    reyna('vikunnar', () => vikunnar(dagar, t)).then((r) => { f.vikunnar = r; }),
  ]);

  return f;
}

/* ── Skráning í automation_runs ─────────────────────────────────────────────────── */
async function skra(status, started_at, detail) {
  try {
    await fetch(`${SB_URL}/rest/v1/automation_runs`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ job_name: 'einkaritari', status, source: 'netlify', started_at, finished_at: new Date().toISOString(), detail: String(detail).slice(0, 500) }),
    });
  } catch (_) { /* skráin má aldrei fella aðgerðina */ }
}

module.exports = { safna, greitt, sendar, nyirIThjonustu, samningar, aminningar, vikunnar,
  LYKILL, GOGN_LYKILL, lesaKv, skrifaKv, hylja, skra, HOPAR };
