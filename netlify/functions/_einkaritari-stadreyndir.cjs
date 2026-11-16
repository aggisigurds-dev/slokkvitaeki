// _einkaritari-stadreyndir.cjs — staðreyndir Einkaritarans (16.11.2026)
//
// Hrein söfnunarföll sem lesa gögn úr Supabase. Ekkert er skrifað, ekkert net-kall
// annað en á gagnagrunninn. Prófanleg: öll söfnunarföll taka { nu, dagar } sem viðfang.
//
// ARKITEKTÚRA: sama mynstur og _radgjafinn.cjs — sb(), sbOll(), lesaKv(), skrifaKv(),
// reyna(), hylja(). Einkaritarinn les ÖNNUR gögn en Ráðgjafinn: Ráðgjafinn les pósthólf
// og skrifar ráð; Einkaritarinn les fjármálin, dagatalið og vikuna í tölum.
//
// LAGFÆRT 16.11.2026 kl. 18 (Agnar: „ennþá drasl ómælt … lagaðu þetta … ég get ekki ýtt eða gert neitt þarna"):
// fyrsta útgáfan fór óprófuð í loftið. Mælt á raungögnum sama dag:
//   · þrjár fyrirspurnir vísuðu í dálka sem eru ekki til (invoices.customer_nafn, fyrirtaeki.i_thjonustu,
//     v_charlize_active.updated_at) → áminningar, nýir í þjónustu og vikan voru ÓMÆLD;
//   · samningar() síaði v_krafa_ogreidd og invoices á dálkum customers_base og GLEYPTI villuna (.catch(() => []))
//     → „0 kr, ekkert á bið" hjá Center Hotels þótt 4 kröfur / 1,2 m.kr. væru á bið. Villa er nú ÓMÆLT, aldrei 0;
//   · „opin mál" voru síuð á lokid_at í stað status → fjögur LOKUÐ Heimaleigumál voru talin opin;
//   · AI-tillögur (tags ai:*) voru taldar upp sem mál — þær eru tillögur, ekki staðreyndir, og fara ekki með;
//   · v_uttektarplan á hvorki fyrirtaeki_nafn, naesta_skodan né stöðuna a_fresti → talning eftir stöðu í staðinn.
// Nýtt: afgreidsla() og adalmal() — forunnin verk og sannreynda topp 10 listann, svo atriðin vísi á stað þar
// sem Agnar getur FRAMKVÆMT (takki í 506), ekki bara lesið.
// Vörður: test/einkaritari.test.cjs hafnar óþekktum dálki eins og PostgREST (42703).

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
const kr = (n) => Math.round(Number(n) || 0);
const ms = (e) => String((e && e.message) || e).slice(0, 200);

function hylja(t) {
  if (!t) return '';
  return String(t)
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[netfang]')
    .replace(/IS\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/gi, '[IBAN]')
    .replace(/\d{4}-\d{2}-\d{6}/g, '[bankareikningur]')
    .replace(/\b\d{6}-?\d{4}\b/g, (m) => /^(19|20)\d{2}/.test(m) ? m : '[kt]')
    .replace(/\b[5-9]\d{2}\s?\d{4}\b/g, '[simi]');
}

// `base` síar customers_base (greiðendur hópsins); `leit` er notað í ilike á mál og Charlize.
const HOPAR = [
  { id: 'heimaleiga', nafn: 'Heimaleiga', st: 'H', base: 'rekstrarfelag=eq.Heimaleiga', charlize: 'heimaleig' },
  { id: 'center', nafn: 'Center Hotels', st: 'C', base: 'or=(kennitala.eq.450905-1430,kennitala.eq.4509051430)', charlize: 'center hot' },
];

// Opið mál á Þjónustuborði = ekki eytt, ekki í geymslu og staðan ekki 'lokad' (lokid_at er EKKI fyllt á öllum lokuðum málum).
const OPID = 'deleted_at=is.null&archived_at=is.null&status=neq.lokad';
// AI-tillögur (ai-uppfaerslur: tags ai:tillaga, ai:nytt_mal …) eru tillögur, ekki staðreyndir — mæling Natalie 15.11.2026.
const erAiTillaga = (m) => (m.tags || []).some((t) => /^ai:/.test(String(t))) || /^AI-tillaga/i.test(String(m.title || ''));

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
// Brunahólf: eftir ÚTGÁFUDEGI (invoices.utgafudagur). Reikningur án útgáfudags er ekki talinn — gjalddagi er ekki
// útgáfudagur, og að telja eftir honum taldi eldri reikninga sem „senda í vikunni".
async function sendar(dagar, nu) {
  const fra = new Date(nu - dagar * 864e5);
  const [sl, bh] = await Promise.all([
    sb(`solur?select=samtals,status,is_credit&krafa_sent_at=gte.${iso(fra)}&status=neq.void&is_credit=is.false&order=id.asc&limit=1000`),
    sb(`invoices?select=upphaed_total,utgafudagur&source=eq.payday&status=in.(PAID,SENT)&utgafudagur=gte.${iso(fra).slice(0, 10)}&order=id.asc&limit=1000`),
  ]);
  const slS = { fjoldi: sl.length, kr: sl.reduce((a, r) => a + kr(r.samtals), 0) };
  const bhS = { fjoldi: bh.length, kr: bh.reduce((a, r) => a + kr(r.upphaed_total), 0) };
  return { slokkvitaeki: slS, brunaholf: bhS, samtals: { fjoldi: slS.fjoldi + bhS.fjoldi, kr: slS.kr + bhS.kr } };
}

/* ── 3. NÝIR Í ÞJÓNUSTU ───────────────────────────────────────────────────────── */
async function nyirIThjonustu(dagar, nu) {
  const fra = new Date(nu - dagar * 864e5);
  const r = await sb(`fyrirtaeki?select=id,nafn,created_at&er_i_thjonustu=is.true&deleted_at=is.null&created_at=gte.${iso(fra)}&order=created_at.desc&limit=50`);
  return r.map((x) => ({ id: x.id, nafn: hylja(x.nafn), dags: String(x.created_at).slice(0, 10) }));
}

/* ── 4. SAMNINGAR — Heimaleiga og Center Hotels ────────────────────────────────── */
// Kröfur úr v_krafa_ogreidd (EIN skilgreining — sama sýn og 489, combo-yfirlit og Tony) eftir greiðendum hópsins.
// Greiðslur þessara hópa eru í `solur` (Slökkvitæki), ekki `invoices` (Brunahólf).
// Bregðist hópur er hann merktur ómældur — aldrei „0 kr" (fyrsta útgáfan gleypti villuna og sýndi núll).
async function samningar() {
  const ut = {};
  for (const h of HOPAR) {
    try {
      const base = await sb(`customers_base?select=id&${h.base}&limit=200`);
      const ids = base.map((b) => b.id).filter(Boolean);
      if (!ids.length) { ut[h.id] = { nafn: h.nafn, omaelt: 'enginn greiðandi fannst í customers_base' }; continue; }
      const inn = `in.(${ids.join(',')})`;
      const leit = encodeURIComponent(h.charlize);
      const [krofur, greidsla, bordsmal, charlize_r] = await Promise.all([
        sb(`v_krafa_ogreidd?select=id,samtals,dagar,flokkur&customer_base_id=${inn}&order=id.asc&limit=1000`),
        sb(`solur?select=num,samtals,paid_at&customer_base_id=${inn}&paid_at=not.is.null&status=neq.void&is_credit=not.is.true&order=paid_at.desc&limit=1`),
        sb(`thjonustubeidni?select=id,title,created_at,tags&${OPID}&or=(customer_base_id.${inn},customer_nafn.ilike.*${leit}*,title.ilike.*${leit}*)&order=created_at.desc&limit=40`),
        sb(`v_charlize_active?select=id,fact,scope&scope=in.(baedi,slokkvitaeki)&fact=ilike.*${leit}*&order=created_at.desc&limit=5`),
      ]);
      const virkt = krofur.filter((x) => x.flokkur === 'innheimta');
      const bid = krofur.filter((x) => x.flokkur === 'a_bid');
      const mal = bordsmal.filter((m) => !erAiTillaga(m));
      ut[h.id] = {
        nafn: h.nafn,
        greidendur: ids.length,
        ogreitt: { fjoldi: virkt.length, kr: virkt.reduce((a, x) => a + kr(x.samtals), 0), elsta_dagar: virkt.reduce((a, x) => Math.max(a, Number(x.dagar) || 0), 0) },
        a_bid: { fjoldi: bid.length, kr: bid.reduce((a, x) => a + kr(x.samtals), 0), skyring: bid.length ? 'Á BIÐ að ákvörðun Agnars (⏸) — ekki innheimtumál.' : null },
        sidasta_greidsla: greidsla.length ? { num: greidsla[0].num, kr: kr(greidsla[0].samtals), dags: String(greidsla[0].paid_at).slice(0, 10) } : { engin: true },
        opin_mal: mal.slice(0, 6).map((m) => ({ mal_id: m.id, titill: hylja(String(m.title || '').slice(0, 120)), stofnad: String(m.created_at).slice(0, 10) })),
        ai_tillogur_sleppt: bordsmal.length - mal.length,
        charlize: charlize_r.slice(0, 3).map((c) => hylja(String(c.fact || '').slice(0, 200))),
      };
    } catch (e) {
      ut[h.id] = { nafn: h.nafn, omaelt: ms(e) };
    }
  }
  return ut;
}

/* ── 5. ÁMINNINGAR ─────────────────────────────────────────────────────────────── */
// Eindagar: ógreiddir Brunahólfs-reikningar (Payday SENT) með eindaga síðustu 60 daga eða næstu 7. Eldri en 60 daga eru
// taldir SÉR (fjöldi og summa): þeir eru flestir áragamlir (2022–2024) og ekki áminning dagsins.
async function aminningar(dagar, nu) {
  const d = (n) => iso(new Date(+new Date(nu) + n * 864e5)).slice(0, 10);
  const idag = d(0), fra60 = d(-60), til7 = d(7);
  const forgSia = encodeURIComponent('(tags.cs.["forgangsmal"],tags.cs.["skilabod"])');
  const [forgm, eindAllt, eldriAllt, plan, meta] = await Promise.all([
    sb(`thjonustubeidni?select=id,title,summary,customer_nafn,created_at,tags&${OPID}&or=${forgSia}&order=created_at.desc&limit=12`),
    sb(`invoices?select=tilvisun,customer_name,upphaed_total,gjalddagi,eindagi&source=eq.payday&status=eq.SENT&eindagi=gte.${fra60}&eindagi=lte.${til7}&order=eindagi.asc&limit=60`),
    sb(`invoices?select=tilvisun,upphaed_total&source=eq.payday&status=eq.SENT&eindagi=lt.${fra60}&limit=1000`),
    sbOll('v_uttektarplan?select=stada'),
    // Kröfuyfirlitið (brunaholf) merkir reikning greiddan samkvæmt BANKA eða falinn í krofur_yfirlit_meta þegar Payday
    // er á eftir (t.d. #378 Landspítali greiddur með millifærslu 30.10.2026 — Payday segir enn SENT). Sama regla hér:
    // án hennar yrði greiddur reikningur að áminningu.
    sb('krofur_yfirlit_meta?select=inv_key,paid,hidden&inv_key=like.payday%7C*&or=(paid.is.true,hidden.is.true)&limit=2000'),
  ]);
  const utan = new Set(meta.map((m) => String(m.inv_key)));
  const lifandi = (r) => !utan.has('payday|' + r.tilvisun);
  const eind = eindAllt.filter(lifandi), eldri = eldriAllt.filter(lifandi);
  const greittSkvBanka = eindAllt.length - eind.length;

  let dagskra = [];
  try {
    const CY = require('./combo-yfirlit.cjs');
    const g = CY.dagskra ? await CY.dagskra(dagar) : null;
    // CY.dagskra skilar HLUT ({ naestu_dagar, checklistar_opnir … }) — 506 þarf lista.
    dagskra = ((g && g.naestu_dagar) || []).map((x) => ({ dags: x.dags, hver: x.hver, titill: hylja(String(x.texti || '').slice(0, 180)) }));
  } catch (_) { /* dagskráin er aukaatriði — fellir ekki áminningarnar */ }

  const t = {};
  for (const r of plan) t[r.stada] = (t[r.stada] || 0) + 1;
  return {
    dagskra,
    eindagar: eind.map((r) => ({
      tilvisun: r.tilvisun, nafn: hylja(r.customer_name), kr: kr(r.upphaed_total), eindagi: r.eindagi,
      dagar_fram_yfir: r.eindagi ? Math.max(0, Math.round((Date.parse(idag) - Date.parse(r.eindagi)) / 864e5)) : null,
    })),
    eindagar_eldri_en_60d: { fjoldi: eldri.length, kr: eldri.reduce((a, r) => a + kr(r.upphaed_total), 0),
      skyring: 'Payday segir ógreitt, eindagi meira en 60 dögum liðinn — gömul mál, ekki áminning dagsins.' },
    eindagar_merkt_greitt_eda_falid: greittSkvBanka,
    forgangsmal: forgm.filter((m) => !erAiTillaga(m)).map((m) => ({
      mal_id: m.id,
      titill: hylja(String(m.title || '').slice(0, 160)),
      hvers_vegna: hylja(String(m.summary || '').slice(0, 240)),
      vidskiptavinur: m.customer_nafn || null,
      tegund: (m.tags || []).includes('forgangsmal') ? 'forgangsmal' : 'skilabod',
    })),
    uttektir: { utrunnid: t.utrunnid || 0, thessi_manudur: t.thessi_manudur || 0 },
  };
}

/* ── 6. VIKAN — hvað gerðist ───────────────────────────────────────────────────── */
async function vikunnar(dagar, nu) {
  const fra = new Date(nu - dagar * 864e5);
  const fra_iso = iso(fra);
  const [ny_mal, lokud_mal, vl_klarad, charlize_nytt, villur] = await Promise.all([
    sb(`thjonustubeidni?select=id&deleted_at=is.null&created_at=gte.${fra_iso}&limit=1000`).then((r) => r.length),
    sb(`thjonustubeidni?select=id&lokid_at=gte.${fra_iso}&limit=1000`).then((r) => r.length),
    sb(`verkefnalisti?select=id&status=eq.klarad&updated_at=gte.${fra_iso}&limit=1000`).then((r) => r.length),
    sb(`v_charlize_active?select=id&created_at=gte.${fra_iso}&limit=1000`).then((r) => r.length),
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

/* ── 7. AFGREIÐSLA — forunnin verk sem Agnar framkvæmir með einum takka (/afgreidsla.html) ── */
async function afgreidsla() {
  const r = await sb('afgreidsla?select=id,tegund,titill,virdi_kr&stada=eq.tilbuid&order=id.asc&limit=40');
  // virdi_kr á verki er ÁÆTLUN þess sem forvann það (t.d. tímar × taxti sem Agnar á eftir að ákveða) — nafnið segir það.
  return r.map((x) => ({ afgreidsla_id: x.id, tegund: x.tegund, titill: hylja(String(x.titill || '').slice(0, 160)), aaetlad_virdi_kr: x.virdi_kr == null ? null : kr(x.virdi_kr) }));
}

/* ── 8. AÐALMÁL — sannreyndi topp 10 listinn (mál merkt adalmal, kafli „C · …" með númeruðum línum) ── */
async function adalmal() {
  const sia = encodeURIComponent('["adalmal"]');
  const r = await sb(`thjonustubeidni?select=id,title,notes,created_at&${OPID}&tags=cs.${sia}&order=created_at.desc&limit=1`);
  if (!r.length) return { engin: true };
  const m = r[0], atridi = [];
  let iC = false;
  for (const raw of String(m.notes || '').split(/\r?\n/)) {
    const l = raw.trim(); if (!l) continue;
    if (/^[A-F]\s*[·•–-]\s*/.test(l)) { iC = /^C\b/.test(l); continue; }
    if (/^—\s*\S/.test(l) || /^spurningar/i.test(l)) { iC = false; continue; }
    const mm = iC && l.match(/^(\d{1,2})[.)]\s*(.+)$/);
    if (mm) atridi.push({ nr: Number(mm[1]), texti: hylja(mm[2].slice(0, 420)) });
  }
  return { mal_id: m.id, titill: hylja(String(m.title || '').slice(0, 160)), stofnad: String(m.created_at).slice(0, 10), atridi: atridi.slice(0, 10) };
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
    afgreidsla: null,
    adalmal: null,
    omaelt: [],
  };

  const reyna = async (hluti, fn) => {
    try { return await fn(); }
    catch (e) { f.omaelt.push({ hluti, villa: ms(e) }); return null; }
  };

  await Promise.all([
    reyna('greitt', () => greitt(dagar, t)).then((r) => { f.greitt = r; }),
    reyna('sendar', () => sendar(dagar, t)).then((r) => { f.sendar = r; }),
    reyna('nyir_i_thjonustu', () => nyirIThjonustu(dagar, t)).then((r) => { f.nyir_i_thjonustu = r; }),
    reyna('samningar', () => samningar()).then((r) => { f.samningar = r; }),
    reyna('aminningar', () => aminningar(dagar, t)).then((r) => { f.aminningar = r; }),
    reyna('vikunnar', () => vikunnar(dagar, t)).then((r) => { f.vikunnar = r; }),
    reyna('afgreidsla', () => afgreidsla()).then((r) => { f.afgreidsla = r; }),
    reyna('adalmal', () => adalmal()).then((r) => { f.adalmal = r; }),
  ]);
  // Hópur sem brást inni í samningar() er líka ómældur — skráð svo fóturinn og vörðurinn sjái það.
  for (const h of HOPAR) {
    const s = f.samningar && f.samningar[h.id];
    if (s && s.omaelt) f.omaelt.push({ hluti: 'samningar:' + h.id, villa: s.omaelt });
  }

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

module.exports = { safna, greitt, sendar, nyirIThjonustu, samningar, aminningar, vikunnar, afgreidsla, adalmal,
  LYKILL, GOGN_LYKILL, lesaKv, skrifaKv, hylja, skra, HOPAR, OPID, erAiTillaga };
