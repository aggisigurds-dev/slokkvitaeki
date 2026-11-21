// yfirsyn.cjs — Yfirsýnarröndin efst á Þjónustuborði Agnars og Annþórs (21.11.2026).
//
// Agnar: „Master yfirsýn banner … lykiltölur úr slökkvitæki og brunahólf, að maður gæti eiginlega séð stöðuna",
// síðan „velja einhverjar mikilvægari og sleppa öðrum". Hönnunin: canvas „Yfirsýn · burstaður navy-málmur".
//
//   GET /api/yfirsyn  → { rekstur, krofur{sl,bh}, osott, sidast{sl,bh}, maeting, maelt_at }
//
// Aðeins STJÓRNANDI (rola Admin): tekjur beggja félaga — sama hlið og tekjur-beint. Óinnskráður 401, önnur rola 403.
// AÐEINS LESTUR. Engar nýjar reglur hér: hver tala kemur úr þeirri heimild sem hún býr í, óbreytt —
//   • rekstur: Rekstrarskýrsla Brunahólfs (/api/rekstrarskyrsla, reglurnar í brunaholf _rekstur.js). Hún krefst
//     hub_user-kökunnar; sama undirritaða kakan gildir á báðum vefjum, svo kaka kallandans er send áfram (ekkert annað).
//   • kröfur BH: Kröfu yfirlit Brunahólfs (tier2 = ósent, tier1 = ógreitt) — sama tala og Kröfu yfirlit sýnir.
//   • kröfur SL: v_krafa_ekki_send_adgerd (ósent) og v_krafa_ogreidd (flokkur innheimta = ógreitt, a_bid = á bið).
//   • ósótt: verkbeidnir status=ready (ekki eyddar) · síðast greitt SL: payday_invoices_slokk PAID.
//   • mæting: tímaskráningar í Tímaveru í dag og í gær (fjöldi starfsmanna).
// Náist heimild ekki er hún `{ omaelt: ástæða }` — aldrei 0 (röndin sýnir þá „ómælt" með ástæðunni).
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const HUB = require('./hub-adgangar.cjs');

const BH = (process.env.BRUNAHOLF_URL || 'https://brunaholf.netlify.app').replace(/\/$/, '');
const DAGUR = 86400000;
const LEYFT = ['Agnar', 'Annþór', 'Lota'];   // fornöfn í notendaskránni (hub_adgangar): Agnar Sigurðsson, Annþór Kristján Karlsson, Lota (Claude)
// Föll Brunahólfs sem verða lokuð óinnskráðum (lota 13): þjónninn sendir tóka eins og tekjur-beint gerir.
async function bhHausar() {
  const headers = { accept: 'application/json' };
  if (typeof HUB.hubApiToki === 'function') {
    const toki = await HUB.hubApiToki().catch(() => '');
    if (toki) headers[HUB.HUB_TOKI_HAUS || 'x-hub-toki'] = toki;
  }
  return headers;
}

async function sb(slod) {
  const r = await fetch(`${P.SUPABASE_URL}/rest/v1/${slod}`, {
    headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': 'application/json' },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${slod.split('?')[0]}: ${t.slice(0, 160)}`);
  return t ? JSON.parse(t) : null;
}
async function sbOll(slod) {
  const ut = [];
  for (let off = 0; off < 50000; off += 1000) {
    const r = await sb(`${slod}&limit=1000&offset=${off}`);
    ut.push(...r);
    if (r.length < 1000) break;
  }
  return ut;
}
const kr = v => Math.round(Number(v) || 0);
const summa = (l, f) => l.reduce((a, r) => a + kr(f(r)), 0);
const idag = () => new Date().toISOString().slice(0, 10);
const dagarFra = d => (d ? Math.floor((Date.parse(idag()) - Date.parse(String(d).slice(0, 10))) / DAGUR) : null);
// Hver heimild sér: villa í einni fellir ekki hinar.
async function mael(nafn, f) {
  try { return await f(); } catch (e) { console.error('[yfirsyn]', nafn, String(e && e.message || e).slice(0, 200)); return { omaelt: `${nafn} náðist ekki` }; }
}

// Rekstrarskýrslan: kaka kallandans send áfram — aðeins hub_user, ekkert annað.
async function rekstur(event) {
  const hra = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  const m = /(?:^|;\s*)hub_user=([^;]+)/.exec(String(hra));
  if (!m) return { omaelt: 'innskráning vantar' };
  const r = await fetch(`${BH}/api/rekstrarskyrsla`, { headers: { cookie: `hub_user=${m[1]}`, accept: 'application/json' } });
  if (!r.ok) return { omaelt: `Rekstrarskýrslan svaraði ${r.status}` };
  const d = await r.json();
  const { timabil, sl, bh, badir, rod, samanburdur, ferskleiki, sott } = d || {};
  if (!badir || !Array.isArray(timabil)) return { omaelt: 'Rekstrarskýrslan: óvænt snið' };
  return { timabil, sl, bh, badir, rod, samanburdur, ferskleiki, sott };
}

// Kröfu yfirlit Brunahólfs — sama kall og tekjur-beint (x-hub-toki ef til).
async function krofurBh() {
  const r = await fetch(`${BH}/api/krofu-yfirlit-bru`, { headers: await bhHausar() });
  if (!r.ok) return { omaelt: `Kröfu yfirlit Brunahólfs svaraði ${r.status}` };
  const d = await r.json();
  const t1 = d && d.tier1, t2 = d && d.tier2;
  if (!t1 || !t2) return { omaelt: 'Kröfu yfirlit Brunahólfs: óvænt snið' };
  const ogr = [];
  // sama mengi og samtala Kröfu yfirlits: hvorki faldar né kláraðar (done) kröfur
  (t1.debtors || []).forEach(db => (db.invoices || []).forEach(i => { if (!i.hidden && !i.done) ogr.push(i); }));
  // Aldur = dagar frá gjalddaga reiknings (sama og aldursskipting fullu yfirsýnarinnar).
  const eldri = ogr.filter(i => (dagarFra(i.gjalddagi) || 0) > 45);
  const staerst = ogr.slice().sort((a, b) => kr(b.amount) - kr(a.amount))[0] || null;
  return {
    osent: { n: Number(t2.n) || 0, kr: kr(t2.total) },
    ogreitt: { n: Number(t1.n) || 0, kr: kr(t1.total) },
    eldri45: { n: eldri.length, kr: summa(eldri, i => i.amount), reikn: eldri.map(i => ({ nr: 'R-' + (i.tilvisun || ''), kunni: i.customer || '', kr: kr(i.amount), dagar: dagarFra(i.gjalddagi) })) },
    staerst: staerst ? { nr: 'R-' + (staerst.tilvisun || ''), kunni: staerst.customer || '', kr: kr(staerst.amount) } : null,
    likleg_greidd: d.likely_paid ? { n: Number(d.likely_paid.n) || 0, kr: kr(d.likely_paid.kr) } : null,
  };
}

async function krofurSl() {
  const [osent, ogreidd] = await Promise.all([
    sbOll('v_krafa_ekki_send_adgerd?select=num,samtals,dagar&order=num.asc'),
    sbOll('v_krafa_ogreidd?select=id,samtals,dagar,flokkur&flokkur=in.(innheimta,a_bid)&order=id.asc'),
  ]);
  const inn = ogreidd.filter(r => r.flokkur === 'innheimta'), bid = ogreidd.filter(r => r.flokkur === 'a_bid');
  const eldri = inn.filter(r => (Number(r.dagar) || 0) > 45);
  return {
    osent: { n: osent.length, kr: summa(osent, r => r.samtals) },
    ogreitt: { n: inn.length, kr: summa(inn, r => r.samtals) },
    eldri45: { n: eldri.length, kr: summa(eldri, r => r.samtals) },
    a_bid: { n: bid.length, kr: summa(bid, r => r.samtals) },
  };
}

async function osott() {
  const l = await sbOll('verkbeidnir?select=id,verd,dropoff,created_at&status=eq.ready&eytt_at=is.null&order=id.asc');
  const aldur = l.map(r => dagarFra(r.dropoff || r.created_at)).filter(x => x != null);
  return { n: l.length, kr: summa(l, r => r.verd), elst_dagar: aldur.length ? Math.max(...aldur) : null, yfir30: aldur.filter(x => x > 30).length };
}

async function sidastSl() {
  const r = await sb('payday_invoices_slokk?select=number,customer_name,amount_total,paid_date&status=eq.PAID&paid_date=not.is.null&order=paid_date.desc,number.desc&limit=1');
  const x = r && r[0];
  return x ? { nr: 'R-' + (x.number || ''), kunni: x.customer_name || '', kr: kr(x.amount_total), dags: x.paid_date } : { omaelt: 'engin greiðsla fannst' };
}
async function sidastBh() {
  const r = await fetch(`${BH}/api/krofu-greidslur?n=1`, { headers: await bhHausar() });
  if (!r.ok) return { omaelt: `Greiðslur Brunahólfs svöruðu ${r.status}` };
  const d = await r.json();
  const x = d && Array.isArray(d.rows) ? d.rows[0] : null;   // { tilvisun, customer_name, upphaed_total, greidsla_date }
  if (!x) return { omaelt: 'engin greiðsla fannst' };
  return { nr: 'R-' + (x.tilvisun || ''), kunni: x.customer_name || '', kr: kr(x.upphaed_total), dags: x.greidsla_date || null };
}

// GREITT INN, M. VSK — peningarnir sem komu inn, mánuður fyrir mánuð (þessi mánuður til dagsins + þrír heilir á undan).
// Rekstrarskýrslan (badir.inn) er ÁN vsk og telur aðeins Payday; Agnar 21.11: „held [talan] sé eitthvað skrítið" —
// yfirferð sama kvöld: nóvember 6,75 m án vsk = 8,37 m með vsk, og október vantaði 4,11 m sem voru merktir greiddir
// handvirkt í Kröfu yfirliti (R-378 Landspítali, R-372 Mosfellsbær). Hér: sömu mengi og rekstrarskýrslan
// (_rekstur.js: Payday SL PAID eftir paid_date · búð = lokaðar sölur greiddar með korti/reiðufé eftir paid_at||created_at,
// án raða sem vísa á ógilda sölu · Payday BH PAID eftir greidsla_date) — en upphæð MEÐ vsk, og BH-reikningar sem eru
// merktir greiddir í Kröfu yfirliti (krofur_yfirlit_meta.paid) en Payday telur ekki greidda bætast við á paid_at.
const iso = d => d.toISOString().slice(0, 10);
const dagur = x => String(x || '').slice(0, 10);
async function greittInn() {
  const nu = new Date(), y = nu.getUTCFullYear(), mo = nu.getUTCMonth();
  const manudir = [3, 2, 1, 0].map(k => ({
    fra: iso(new Date(Date.UTC(y, mo - k, 1))),
    til: k === 0 ? idag() : iso(new Date(Date.UTC(y, mo - k + 1, 0))),
    sl_payday: 0, sl_bud: 0, bh_payday: 0, bh_hand: 0, bh_hand_reikn: [],
  }));
  const fra0 = manudir[0].fra;
  const [slp, bud, voidR, bhp, hand] = await Promise.all([
    sbOll(`payday_invoices_slokk?select=id,paid_date,amount_total&status=eq.PAID&paid_date=gte.${fra0}&order=id.asc`),
    sbOll(`solur?select=id,credit_of,samtals,paid_at,created_at&status=eq.final&greitt_med=in.(kort,reidufe)&or=(paid_at.gte.${fra0},created_at.gte.${fra0})&order=id.asc`),
    sbOll('solur?select=id&status=eq.void&order=id.asc'),
    sbOll(`invoices?select=id,greidsla_date,upphaed_total&source=eq.payday&status=eq.PAID&greidsla_date=gte.${fra0}&order=id.asc`),
    sbOll(`krofur_yfirlit_meta?select=inv_key,paid_at&paid=eq.true&paid_at=gte.${fra0}T00:00:00Z&order=inv_key.asc`),
  ]);
  const iMan = (d, f) => { const m = manudir.find(x => d >= x.fra && d <= x.til); if (m) f(m); };
  slp.forEach(r => iMan(dagur(r.paid_date), m => { m.sl_payday += kr(r.amount_total); }));
  const voidIds = new Set(voidR.map(r => Number(r.id)));
  bud.forEach(r => { if (r.credit_of != null && voidIds.has(Number(r.credit_of))) return; iMan(dagur(r.paid_at || r.created_at), m => { m.sl_bud += kr(r.samtals); }); });
  bhp.forEach(r => iMan(dagur(r.greidsla_date), m => { m.bh_payday += kr(r.upphaed_total); }));
  // aðeins tölustafir: Payday-tilvísun er númer, og þá getur ekkert úr lyklinum brotið PostgREST-fyrirspurnina
  const handKeys = hand.map(h => ({ tilv: (/^payday\|(\d{1,12})$/.exec(h.inv_key || '') || [])[1], paid_at: h.paid_at })).filter(h => h.tilv);
  if (handKeys.length) {
    const inv = await sbOll(`invoices?select=id,tilvisun,upphaed_total,status,utgafudagur&source=eq.payday&tilvisun=in.(${handKeys.map(h => h.tilv).join(',')})&order=id.asc`);
    const eftirTilv = new Map(inv.map(i => [String(i.tilvisun), i]));
    handKeys.forEach(h => {
      const i = eftirTilv.get(String(h.tilv));
      // Aðeins SENT (PAID er þegar talinn í Payday; CANCELLED/CREDIT var aldrei greiðsla) og merktur innan 120 daga frá
      // útgáfu — sama regla og rekstrarskýrsla Brunahólfs (rýni 21.11: tiltekt 06.07.2026 merkti 7 reikninga frá
      // 2022–25 greidda í einu; sá smellur er ekki innborgun þann dag).
      if (!i || i.status !== 'SENT' || !i.utgafudagur || !(kr(i.upphaed_total) > 0)) return;
      const dagar = (Date.parse(dagur(h.paid_at)) - Date.parse(dagur(i.utgafudagur))) / 86400000;
      if (!(dagar >= 0 && dagar <= 120)) return;
      iMan(dagur(h.paid_at), m => { m.bh_hand += kr(i.upphaed_total); m.bh_hand_reikn.push('R-' + h.tilv); });
    });
  }
  manudir.forEach(m => { m.alls = m.sl_payday + m.sl_bud + m.bh_payday + m.bh_hand; });
  return { manudir, regla: 'Með vsk: Payday SL + búð SL (kort/reiðufé) + Payday BH + BH merkt greitt í Kröfu yfirliti' };
}

// Mæting (fjöldi starfsmanna í dag og í gær) og ALLIR skráðir tímar vikunnar og síðustu viku (mán–sun). Rekstrarskýrslan
// ber aðeins rukkanlega tíma (bh.klst); heildin kemur beint úr Tímaveru, sama tafla.
async function timavera() {
  const d0 = idag(), t0 = Date.parse(d0);
  const vd = (new Date(t0).getUTCDay() + 6) % 7;                 // mán = 0
  const man = new Date(t0 - vd * DAGUR).toISOString().slice(0, 10);
  const fmMan = new Date(t0 - (vd + 7) * DAGUR).toISOString().slice(0, 10);
  const d1 = new Date(t0 - DAGUR).toISOString().slice(0, 10);
  const sun = new Date(Date.parse(man) - DAGUR).toISOString().slice(0, 10);   // síðasti dagur síðustu viku
  const l = await sbOll(`timavera_entries?select=id,date,employee,hours&date=gte.${fmMan}&date=lte.${d0}&order=id.asc`);
  const telja = d => new Set(l.filter(r => r.date === d && r.employee).map(r => r.employee)).size;
  const klst = (fra, til) => Math.round(l.filter(r => r.date >= fra && r.date <= til).reduce((a, r) => a + (Number(r.hours) || 0), 0) * 10) / 10;
  const starfsm = (fra, til) => new Set(l.filter(r => r.date >= fra && r.date <= til && r.employee).map(r => r.employee)).size;
  // Samanburður við SÖMU vikudaga í fyrri viku (rýni 21.11: mán–dagsins í dag á móti allri síðustu viku sýndi ~▼90 % á
  // mánudögum). Heil síðasta vika fylgir líka (svika_oll).
  const samaTil = new Date(Date.parse(fmMan) + vd * DAGUR).toISOString().slice(0, 10);
  return {
    idag: telja(d0), igaer: telja(d1), vikudagur: vd,
    vika: { fra: man, til: d0, klst: klst(man, d0), starfsmenn: starfsm(man, d0) },
    svika: { fra: fmMan, til: samaTil, klst: klst(fmMan, samaTil) },
    svika_oll: { fra: fmMan, til: sun, klst: klst(fmMan, sun) },
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'Aðeins GET' });
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const hver = await H.stjornandi(event);
  if (hver.villa) return hver.villa;
  // Röndin er Agnars og Annþórs (beiðni Agnars) — sá sem er INNSKRÁÐUR ræður, ekki „Ég er"-valið á tölvunni (rýni 21.11:
  // annar stjórnandi við vél Agnars sæi annars allt). Lota (Claude) er prófunaraðgangur lotunnar (uid 10, Admin).
  const fornafn = String(hver.nafn || '').trim().split(/\s+/)[0];
  if (!LEYFT.includes(fornafn)) return P.json(403, { error: 'Yfirsýnin er aðeins fyrir Agnar og Annþór', bannad: true });
  const [rek, kbh, ksl, os, ssl, sbh, mt, gi] = await Promise.all([
    mael('Rekstrarskýrslan', () => rekstur(event)),
    mael('Kröfu yfirlit Brunahólfs', krofurBh),
    mael('Kröfur Slökkvitækja', krofurSl),
    mael('Verkbeiðnir', osott),
    mael('Payday SL', sidastSl),
    mael('Greiðslur Brunahólfs', sidastBh),
    mael('Tímavera', timavera),
    mael('Greiðslur', greittInn),
  ]);
  return P.json(200, { rekstur: rek, krofur: { sl: ksl, bh: kbh }, osott: os, sidast: { sl: ssl, bh: sbh }, timavera: mt, greitt: gi, maelt_at: new Date().toISOString() });
};
