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
// 26.11.2026 (Agnar: „Geturðu látið þetta yfirlit líka vera á borðinu hjá Bjarndísi“): Bjarndís (id 6, Admin) bætist við.
const LEYFT = ['Agnar', 'Annþór', 'Bjarndís', 'Lota'];   // fornöfn í notendaskránni (hub_adgangar): Agnar Sigurðsson, Annþór Kristján Karlsson, Lota (Claude)
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
  const ogr = [], osentL = [];
  // sama mengi og samtala Kröfu yfirlits: hvorki faldar né kláraðar (done) kröfur
  (t1.debtors || []).forEach(db => (db.invoices || []).forEach(i => { if (!i.hidden && !i.done) ogr.push(i); }));
  (t2.debtors || []).forEach(db => (db.invoices || []).forEach(i => { if (!i.hidden && !i.done) osentL.push(i); }));
  // Kröfulistinn sem glugginn í röndinni sýnir (Agnar 25.11.2026: „sjá alla ógreiddu kröfurnar") — sömu raðir og summan.
  const radir = (l, tegund) => l.slice().sort((a, b) => kr(b.amount) - kr(a.amount))
    .map(i => ({ nr: i.tilvisun ? 'R-' + i.tilvisun : '', kunni: i.customer || '', kr: kr(i.amount), dagar: dagarFra(i.gjalddagi), tegund }));
  // Aldur = dagar frá gjalddaga reiknings (sama og aldursskipting fullu yfirsýnarinnar).
  const eldri = ogr.filter(i => (dagarFra(i.gjalddagi) || 0) > 45);
  const medNr = ogr.filter(i => i.tilvisun && !i.bidur_porun);
  const staerst = (medNr.length ? medNr : ogr.filter(i => !i.bidur_porun)).slice().sort((a, b) => kr(b.amount) - kr(a.amount))[0] || null;
  return {
    osent: { n: Number(t2.n) || 0, kr: kr(t2.total), reikn: radir(osentL, 'osent') },
    ogreitt: { n: Number(t1.n) || 0, kr: kr(t1.total), reikn: radir(ogr, 'ogreitt') },
    eldri45: { n: eldri.length, kr: summa(eldri, i => i.amount), reikn: eldri.map(i => ({ nr: 'R-' + (i.tilvisun || ''), kunni: i.customer || '', kr: kr(i.amount), dagar: dagarFra(i.gjalddagi) })) },
    staerst: staerst ? { nr: 'R-' + (staerst.tilvisun || ''), kunni: staerst.customer || '', kr: kr(staerst.amount) } : null,
    likleg_greidd: d.likely_paid ? { n: Number(d.likely_paid.n) || 0, kr: kr(d.likely_paid.kr) } : null,
  };
}

// „Tími eftir" Kröfu yfirlits (CG-03): óinnheimtir Tímavera-tímar × taxti m. vsk og Landspítala-viðbót. Reiknað Í VAFRANUM á
// Kröfu yfirliti (computeTier3) og skráð í cg_entries eftir hverja FULLA hleðslu síðunnar. Röndin les sömu tölu þaðan (Agnar
// 25.11.2026: „Þessar tölur eru ekki í samræmi þarna" — röndin sýndi ekki Tími eftir, svo BH stemmdi ekki við „Samtals í pípunni").
// CG-gildi Kröfu yfirlitanna: BH (CG-01 ógreitt · CG-02 ósent · CG-03 tími eftir · CG-04 samtals) og SL (CG-S01 ógreitt ·
// CG-S02 ósent). Síðurnar skrá þau eftir hverja FULLA hleðslu. Þau eru bæði heimild „Tími eftir" og viðmið SAMRÆMISVARÐARINS.
const CG_IDS = ['CG-01', 'CG-02', 'CG-03', 'CG-04', 'CG-S01', 'CG-S02'];
async function cgSidna() {
  const r = await sb('cg_entries?select=id,value,updated_at&id=in.(' + CG_IDS.join(',') + ')');
  const m = {};
  (r || []).forEach(x => { if (x.value != null && x.updated_at) m[x.id] = { v: kr(x.value), t: x.updated_at }; });
  return m;
}
const aldurKlst = t => Math.round((Date.now() - Date.parse(t)) / 36e5 * 10) / 10;
function timiEftirBh(cg) {
  const t = cg && cg['CG-03'];
  if (!t) return { omaelt: 'Kröfu yfirlit hefur ekki skráð „Tími eftir"' };
  return { kr: t.v, uppfaert: t.t, aldur_klst: aldurKlst(t.t) };
}
// SAMRÆMISVÖRÐUR (Agnar 25.11.2026: „vill að þetta sé allt hárréttar tölur þarna og alltaf syncanlegar"): hver krafa-tala
// röndarinnar borin við töluna sem Kröfu yfirlit sjálft sýndi síðast. ±1 kr = námundun. Síðutalan getur verið eldri en gögnin
// (skráð við síðustu opnun) — aldurinn fylgir svo „víkur" á gamalli tölu lesist rétt.
function samraemi(cg, kbh, ksl, te) {
  const ok2 = x => x && !x.omaelt;
  const lid = [
    ['BH ógreitt', 'CG-01', ok2(kbh) ? kbh.ogreitt.kr : null],
    ['BH ósent', 'CG-02', ok2(kbh) ? kbh.osent.kr : null],
    ['BH samtals í pípunni', 'CG-04', ok2(kbh) && ok2(te) ? kbh.ogreitt.kr + kbh.osent.kr + te.kr : null],
    ['SL ógreitt', 'CG-S01', ok2(ksl) ? ksl.ogreitt.kr : null],
    ['SL ósent', 'CG-S02', ok2(ksl) ? ksl.osent.kr : null],
  ];
  return lid.map(([nafn, id, rond]) => {
    const s = cg && cg[id];
    if (rond == null || !s) return { nafn, id, rond, sida: s ? s.v : null, stada: 'omaelt' };
    const munur = rond - s.v;
    return { nafn, id, rond, sida: s.v, munur, sida_uppfaert: s.t, sida_aldur_klst: aldurKlst(s.t), stada: Math.abs(munur) <= 1 ? 'stemmir' : 'vikur' };
  });
}

// KRÖFUR SL — SAMA REGLA OG KRÖFU YFIRLIT SLÖKKVITÆKJA (166 loadAll, CG-S01/CG-S02). Agnar 25.11.2026: „slökkvitækjatölurnar hjá
// þér eru ekki rétt reiknaðar". Áður las röndin kröfusýnirnar (aðeins kröfur sendar í banka, flokkur „innheimta") og sýndi 3,43 m
// á móti 4,87 m á Kröfu yfirliti. Nú, línu fyrir línu eins og 166:
//   sölur greiddar með reikningi og ógreiddar (paid_at tómt), hvorki kreditnóta né kreditfærð sala;
//   ógreitt (CG-S01) = með dk_invoice_id og Payday-spegillinn telur EKKI drög;  ósent (CG-S02) = ekki ógild, ekkert sendimerki.
// Mælt 25.11 í SQL eftir þessari reglu: 51 · 4.639.884 og 7 · 229.178 = Kröfu yfirlit upp á krónu.
// Á bið (v_krafa_ogreidd flokkur a_bid) er MERKT á röðunum, ekki dregið frá — Kröfu yfirlit telur þær með í ógreiddu.
const sumNakv = (l, f) => Math.round(l.reduce((a, r) => a + (Number(f(r)) || 0), 0));   // eins og síðan: summa fyrst, námundað einu sinni
async function krofurSl() {
  const rows0 = await sbOll('solur?select=id,num,customer_nafn,samtals,status,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,is_credit,credit_of&greitt_med=eq.reikningur&paid_at=is.null&order=created_at.asc,id.asc');
  const kreditfaerdar = new Set(rows0.filter(s => s.is_credit && s.credit_of != null).map(s => String(s.credit_of)));
  const rows = rows0.filter(s => !s.is_credit && !kreditfaerdar.has(String(s.id)));
  const medPayday = rows.filter(s => s.dk_invoice_id);
  const drog = new Set(); let spegillOk = true;
  try {
    const ids = [...new Set(medPayday.map(s => String(s.dk_invoice_id)))];
    for (let i = 0; i < ids.length; i += 100) {
      const listi = ids.slice(i, i + 100).map(x => '"' + x.replace(/["\\]/g, '') + '"').join(',');
      (await sb('payday_invoices_slokk?select=payday_id,status&payday_id=in.(' + encodeURIComponent(listi) + ')') || [])
        .forEach(p => { if (String(p.status || '').toUpperCase() === 'DRAFT') drog.add(String(p.payday_id)); });
    }
  } catch (e) { spegillOk = false; drog.clear(); }   // eins og 166: bregðist spegillinn telst allt í Payday ógreitt
  const ogreidd = medPayday.filter(s => !drog.has(String(s.dk_invoice_id)));
  const osent = rows.filter(s => s.status !== 'void' && !s.krafa_sent_at && !s.invoiced_at && !s.dk_invoice_id);
  let bidNum = new Set();
  try { bidNum = new Set((await sbOll('v_krafa_ogreidd?select=num&flokkur=eq.a_bid&order=num.asc')).map(r => String(r.num))); } catch (_) {}
  const dagar = s => dagarFra(s.created_at);
  const eldri = ogreidd.filter(s => (dagar(s) || 0) > 45);
  const bid = ogreidd.filter(s => bidNum.has(String(s.num)));
  // Kröfulistinn sem glugginn í röndinni sýnir — sömu raðir og summan, stærst fyrst.
  const radir = (l, tegund) => l.slice().sort((a, b) => kr(b.samtals) - kr(a.samtals))
    .map(s => ({ nr: s.num ? String(s.num) : '', kunni: s.customer_nafn || '', kr: kr(s.samtals), dagar: dagar(s), tegund, ...(bidNum.has(String(s.num)) ? { a_bid: true } : {}) }));
  return {
    osent: { n: osent.length, kr: sumNakv(osent, s => s.samtals), reikn: radir(osent, 'osent') },
    ogreitt: { n: ogreidd.length, kr: sumNakv(ogreidd, s => s.samtals), reikn: radir(ogreidd, 'ogreitt') },
    eldri45: { n: eldri.length, kr: sumNakv(eldri, s => s.samtals) },
    a_bid: { n: bid.length, kr: sumNakv(bid, s => s.samtals) },          // hluti af ógreiddu, ekki viðbót
    drog_payday: { n: medPayday.length - ogreidd.length, kr: sumNakv(medPayday.filter(s => drog.has(String(s.dk_invoice_id))), s => s.samtals) },
    spegill_ok: spegillOk,
  };
}

async function osott() {
  // Aldur ósótts miðast við hvenær tækið varð KLÁRT (klart_at, stimplað af kveikju 21.11.2026), ekki innlögn; eldri raðir án
  // stimpils (óþekkt) halda gamla mælikvarðanum: innlögn/skráning.
  const l = await sbOll('verkbeidnir?select=id,verd,dropoff,created_at,klart_at&status=eq.ready&eytt_at=is.null&order=id.asc');
  const aldur = l.map(r => dagarFra(r.klart_at || r.dropoff || r.created_at)).filter(x => x != null);
  // 25.11.2026 (sannreynt: flísin hét „Ósótt tæki" en taldi VERKBEIÐNIR — 60 á móti 61 tækjum): tækin talin eins og
  // Rekstrarskýrslan gerir (_rekstur.js: eitt tæki = ein lifandi verklidur-röð á verkbeiðninni).
  let taekiN = null;
  try {
    const ids = l.map(r => r.id);
    let n = 0;
    for (let i = 0; i < ids.length; i += 150) {
      const lidir = await sbOll('verklidur?select=job_id,status&eytt_at=is.null&job_id=in.(' + ids.slice(i, i + 150).join(',') + ')&order=job_id.asc');
      n += lidir.filter(x => String(x.status || '') !== 'eytt').length;
    }
    taekiN = n;
  } catch (_) {}
  return { n: l.length, taeki_n: taekiN, kr: summa(l, r => r.verd), elst_dagar: aldur.length ? Math.max(...aldur) : null, yfir30: aldur.filter(x => x > 30).length };
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

// TEYA-KORTAUPPGJÖR (Agnar 25.11.2026: „reyna finna út teya korta inngreiðslurnar … annaðhvort tengjast vef teya.is eða lesa úr
// póstum"). Teya sendir eitt uppgjör á virkan dag frá reporting@teya.com á bokhald@eldklar.is („Uppgjörsskýrslan þín frá Teya",
// PDF með), og meginmálið ber dag og heildarupphæð: „uppgjörsyfirlit fyrir 2026-11-25 … Heildarupphæð Staða ISK 30.751 Greitt".
// email_digest geymir þann texta, svo hér er lesið úr honum — engin innskráning á teya.is. teya_faerslur (færsla fyrir færslu) er
// tóm (mælt 25.11.2026). Nóvember til 25.: Teya 16 uppgjör 460.966 kr · kortasölur í búð 453.287 kr — Teya er staðfesting á
// kortapeningnum, EKKI viðbót: búðin (sl_bud) telur sömu krónurnar þegar.
const TEYA_DAGS = /uppgj[öo]rsyfirlit fyrir (\d{4}-\d{2}-\d{2})/i;
const TEYA_KR = /Heildarupph[æa]e?[ðd]\s+Sta[ðd]a\s+ISK\s+(-?[\d.]+)/i;
async function teyaUppgjor(fra) {
  const r = await sbOll(`email_digest?select=message_id,received_at,body_preview,snippet&sender_email=ilike.*teya*&subject=ilike.Uppgj*&received_at=gte.${fra}T00:00:00Z&order=received_at.desc,id.desc`);
  const eftirDegi = new Map();
  r.forEach(x => {
    const txt = String(x.body_preview || '') + ' ' + String(x.snippet || '');
    const d = (TEYA_DAGS.exec(txt) || [])[1], k = (TEYA_KR.exec(txt) || [])[1];
    if (!d || k == null || eftirDegi.has(d)) return;   // nýjasti pósturinn um daginn ræður (raðað received_at desc)
    eftirDegi.set(d, { dags: d, kr: kr(String(k).replace(/\./g, '')), barst: x.received_at });
  });
  return [...eftirDegi.values()].sort((a, b) => (a.dags < b.dags ? 1 : -1));
}

// SÍÐUSTU INNGREIÐSLUR (Agnar 25.11.2026: „setja inn sirka 5 seinustu inngreiðslur"): Payday SL greitt, greiðslur Brunahólfs
// (sama heimild og „Síðast greitt"), nýjast fyrst eftir greiðsludegi. Teya-uppgjörin voru hér fyrst en Agnar 25.11.2026: „Mátt
// sleppa að sýna teya inngreiðslurnar inní síðustu inngreiðslur" — Teya stendur aðeins sem mánaðartala (greittInn). Hver heimild
// sér; bregðist ein stendur hún í `omaelt` og hin birtist.
async function sidustuInn() {
  const N = 6, listi = [], omaelt = [];
  const [slp, bhr] = await Promise.all([
    sb(`payday_invoices_slokk?select=number,customer_name,amount_total,paid_date&status=eq.PAID&paid_date=not.is.null&order=paid_date.desc,number.desc&limit=${N}`).catch(e => { omaelt.push('Payday SL'); return []; }),
    fetch(`${BH}/api/krofu-greidslur?n=${N}`, { headers: await bhHausar() }).then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status)))).catch(() => { omaelt.push('Greiðslur BH'); return null; }),
  ]);
  (slp || []).forEach(x => listi.push({ felag: 'SL', teg: 'payday', nr: 'R-' + (x.number || ''), kunni: x.customer_name || '', kr: kr(x.amount_total), dags: dagur(x.paid_date) }));
  ((bhr && Array.isArray(bhr.rows)) ? bhr.rows : []).forEach(x => listi.push({ felag: 'BH', teg: 'payday', nr: 'R-' + (x.tilvisun || ''), kunni: x.customer_name || '', kr: kr(x.upphaed_total), dags: dagur(x.greidsla_date) }));
  listi.sort((a, b) => (a.dags === b.dags ? b.kr - a.kr : (a.dags < b.dags ? 1 : -1)));
  return { listi: listi.slice(0, 5), omaelt };
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
    sl_payday: 0, sl_bud: 0, sl_kort: 0, bh_payday: 0, bh_hand: 0, bh_hand_reikn: [], teya: null, teya_n: 0,
  }));
  const fra0 = manudir[0].fra;
  const [slp, bud, voidR, bhp, hand, tey] = await Promise.all([
    sbOll(`payday_invoices_slokk?select=id,paid_date,amount_total&status=eq.PAID&paid_date=gte.${fra0}&order=id.asc`),
    sbOll(`solur?select=id,credit_of,samtals,paid_at,created_at,greitt_med&status=eq.final&greitt_med=in.(kort,reidufe)&or=(paid_at.gte.${fra0},created_at.gte.${fra0})&order=id.asc`),
    sbOll('solur?select=id&status=eq.void&order=id.asc'),
    sbOll(`invoices?select=id,greidsla_date,upphaed_total&source=eq.payday&status=eq.PAID&greidsla_date=gte.${fra0}&order=id.asc`),
    sbOll(`krofur_yfirlit_meta?select=inv_key,paid_at&paid=eq.true&paid_at=gte.${fra0}T00:00:00Z&order=inv_key.asc`),
    teyaUppgjor(fra0).catch(e => { console.error('[yfirsyn] Teya', String(e && e.message || e).slice(0, 160)); return null; }),
  ]);
  const iMan = (d, f) => { const m = manudir.find(x => d >= x.fra && d <= x.til); if (m) f(m); };
  slp.forEach(r => iMan(dagur(r.paid_date), m => { m.sl_payday += kr(r.amount_total); }));
  const voidIds = new Set(voidR.map(r => Number(r.id)));
  // Kreditnóta á DAG FRUMSÖLUNNAR (Agnar 22.11.2026: „0 fellur bara út“): paid_at||created_at frumsölunnar. Frumsala sem er ekki í lestrinum
  // (nóta í þessum mánuði á sölu úr eldri mánuði) er sótt sér; finnist hún ekki heldur nótan eigin degi.
  const frumDagur = new Map(bud.map(r => [Number(r.id), r.paid_at || r.created_at]));
  const vantar = [...new Set(bud.filter(r => r.credit_of != null && !frumDagur.has(Number(r.credit_of)) && !voidIds.has(Number(r.credit_of))).map(r => Number(r.credit_of)).filter(n => Number.isInteger(n) && n > 0))];
  for (let i = 0; i < vantar.length; i += 150) {
    try { (await sbOll(`solur?select=id,paid_at,created_at&id=in.(${vantar.slice(i, i + 150).join(',')})&order=id.asc`)).forEach(r => frumDagur.set(Number(r.id), r.paid_at || r.created_at)); } catch (e) { /* nótan heldur eigin degi */ }
  }
  bud.forEach(r => {
    if (r.credit_of != null && voidIds.has(Number(r.credit_of))) return;
    const d = r.credit_of != null && frumDagur.get(Number(r.credit_of)) ? frumDagur.get(Number(r.credit_of)) : (r.paid_at || r.created_at);
    iMan(dagur(d), m => { m.sl_bud += kr(r.samtals); if (r.greitt_med === 'kort') m.sl_kort += kr(r.samtals); });
  });
  // Teya: til samanburðar við kortasölur búðarinnar (sl_kort) — ekki lagt við `alls`.
  if (Array.isArray(tey)) { manudir.forEach(m => { m.teya = 0; }); tey.forEach(t => iMan(t.dags, m => { m.teya += t.kr; m.teya_n++; })); }
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
  return { manudir, regla: 'Með vsk: Payday SL + búð SL (kort/reiðufé) + Payday BH + BH merkt greitt í Kröfu yfirliti · Teya = uppgjör úr pósti til samanburðar, ekki lagt við' };
}

// Tekjur hvers mánaðar ársins, hvort félag sér (Agnar 25.11.2026: „tekjur per mánuð allt árið heild. Stacked slökkvitæki + brunahólf").
// SÖMU reglur og Tekjur í beinni (_tekjur.cjs, engin ný regla), en MEÐ VSK (Agnar 25.11.2026: „Geturðu haft allar tölur með vsk“) — raunupphæðir
// reikninganna, ekki × 1,24: solur.samtals, invoices.upphaed_total og upphæð Stólpa eins og hún stendur:
//   SL = solur final eftir söludegi, kreditnóta á mánuð frumsölunnar (slokkvitaekiManudirFrumsala) — solur hefst 04.05.2026 (yfirtakan).
//        Mánuðirnir á undan eru reikningar fyrri eiganda (stolpi_reikningar, upphæð MEÐ vsk, tekin eins og hún er), aðeins dags < 04.05.2026 svo
//        ekkert telst tvisvar. Merkt `stolpi` per mánuð svo röndin geti sýnt það sér.
//   BH = Payday-reikningar PAID/SENT, upphæð m. vsk (upphaed_total), eftir útgáfudegi (brunaholfManudir) — REIKNINGSFÆRT, ekki „unnið“.
const T = require('./_tekjur.cjs');
const YFIRTAKA = '2026-05-04';
// FYRRA ÁR til samanburðar (Agnar 25.11.2026: „Já gaman að sjá að þetta sé allt að vaxa“): sömu reglur á árið á undan, hver mánuður
// (`fyrra`) og allt árið (`fyrra_alls`). Vöxturinn miðast við SAMA TÍMABIL (`fyrra_til_dags`: 1. jan til sama dags í fyrra) — heilu
// mánuðirnir úr mánaðartölunum, líðandi mánuður dag fyrir dag eftir dagsetningu raðar (kreditnóta á eigin degi innan þess mánaðar).
async function tekjurAr() {
  const ar = idag().slice(0, 4), fyrraAr = String(+ar - 1), fra = `${fyrraAr}-01-01`;
  const [sl, voidIds, bh, st] = await Promise.all([
    sbOll(`solur?select=id,status,credit_of,is_credit,samtals,created_at&status=eq.final&created_at=gte.${fra}&order=id.asc`),
    sbOll('solur?select=id&status=eq.void&order=id.asc').then(r => r.map(x => x.id)),
    sbOll(`invoices?select=status,source,upphaed_total,gjalddagi,utgafudagur&source=eq.payday&status=in.(PAID,SENT)&or=(utgafudagur.gte.${fra},and(utgafudagur.is.null,gjalddagi.gte.${fra}))&order=id.asc`),
    fra < YFIRTAKA ? sbOll(`stolpi_reikningar?select=reikn_nr,tegund,dags,upphaed&dags=gte.${fra}&dags=lt.${YFIRTAKA}&order=reikn_nr.asc,tegund.asc,dags.asc`) : Promise.resolve([]),
  ]);
  if (!bh.length) return { omaelt: 'reikningalestur Brunahólfs skilaði engu' };
  const hef = new Set(sl.map(r => String(r.id))), voidSet = new Set(voidIds.map(String));
  const vantar = [...new Set(sl.filter(r => r.credit_of != null && !hef.has(String(r.credit_of)) && !voidSet.has(String(r.credit_of))).map(r => Number(r.credit_of)).filter(n => Number.isInteger(n) && n > 0))];
  const frum = [];
  for (let i = 0; i < vantar.length; i += 150) { try { frum.push(...await sbOll(`solur?select=id,created_at&id=in.(${vantar.slice(i, i + 150).join(',')})&order=id.asc`)); } catch (e) { /* nótan heldur eigin mánuði */ } }
  const slMan = T.slokkvitaekiManudirFrumsala(sl.map(r => ({ ...r, upphaed_an_vsk: r.samtals })), voidIds, frum).man;
  const bhMan = T.brunaholfManudir(bh.map(r => ({ ...r, hofudstoll: r.upphaed_total })));
  const stMan = {};
  st.forEach(r => { const m = String(r.dags || '').slice(0, 7); if (m) stMan[m] = (stMan[m] || 0) + (Number(r.upphaed) || 0); });   // upphæð Stólpa er MEÐ vsk
  const nuM = idag().slice(0, 7);
  const manudir = [];
  const fyrraM = i => { const m = `${fyrraAr}-${String(i).padStart(2, '0')}`; const fs_ = kr(stMan[m] || 0) + kr(slMan[m] || 0), fb = kr(bhMan[m] || 0); return { fyrra_sl: fs_, fyrra_bh: fb, fyrra: fs_ + fb }; };
  for (let i = 1; i <= 12; i++) {
    const m = `${ar}-${String(i).padStart(2, '0')}`;
    if (m > nuM) { manudir.push({ man: m, framtid: true, ...fyrraM(i) }); continue; }
    const stolpi = kr(stMan[m] || 0), solur = kr(slMan[m] || 0);
    manudir.push({ man: m, sl: stolpi + solur, stolpi, bh: kr(bhMan[m] || 0), til_dags: m === nuM, ...fyrraM(i) });
  }
  // fyrra ár til sama dags: heilir mánuðir á undan + líðandi mánuður í fyrra dag fyrir dag
  const nuMan = +nuM.slice(5, 7), sami = fyrraAr + idag().slice(4), manFra = `${fyrraAr}-${nuM.slice(5, 7)}-01`;
  const iBili = d => { const x = String(d || '').slice(0, 10); return x >= manFra && x <= sami; };
  let fyrraTilDags = manudir.filter(x => +x.man.slice(5, 7) < nuMan).reduce((a, x) => a + x.fyrra, 0);
  // Brunahólf eitt (Agnar 26.11.2026: „hafa þarna 2025 bara Brunahólf og síðan prósentu af síðan bæði Slökkvitæki og Brunahólf 2026 …
  // til að sýna okkar fyrirtækja stækkun sem við eigum“) — Slökkvitæki var ekki okkar 2025 (yfirtaka 04.05.2026; tekjur þess þá = Stólpi).
  let fyrraBhTilDags = manudir.filter(x => +x.man.slice(5, 7) < nuMan).reduce((a, x) => a + x.fyrra_bh, 0);
  const voidS = new Set(voidIds.map(String));
  sl.forEach(r => { if (iBili(r.created_at) && !(r.credit_of != null && voidS.has(String(r.credit_of)))) fyrraTilDags += Number(r.samtals) || 0; });
  st.forEach(r => { if (iBili(r.dags)) fyrraTilDags += Number(r.upphaed) || 0; });
  bh.forEach(r => { if (iBili(r.utgafudagur || r.gjalddagi)) { const u = Number(r.upphaed_total) || 0; fyrraTilDags += u; fyrraBhTilDags += u; } });
  const alls = manudir.reduce((a, x) => a + (x.sl || 0) + (x.bh || 0), 0);
  return { ar, fyrra_ar: fyrraAr, fyrra_alls: manudir.reduce((a, x) => a + x.fyrra, 0), fyrra_til_dags: kr(fyrraTilDags), fyrra_bh_alls: manudir.reduce((a, x) => a + x.fyrra_bh, 0), fyrra_bh_til_dags: kr(fyrraBhTilDags), fyrra_til: sami, manudir, alls, sl_alls: manudir.reduce((a, x) => a + (x.sl || 0), 0), bh_alls: manudir.reduce((a, x) => a + (x.bh || 0), 0),
    vsk: true,
    regla: 'MEÐ VSK, sömu reglur og Tekjur í beinni. SL: sölur eftir söludegi (samtals m. vsk), kreditnóta á mánuð frumsölunnar; fyrir 04.05.2026 reikningar Stólpa (fyrri eiganda). BH: Payday-reikningar greiddir eða sendir, upphæð m. vsk, eftir útgáfudegi (reikningsfært).' };
}

// Mánuðurinn í tölum (Agnar 25.11.2026: „Hve margar skýrslur gerðar í þessum mánuði ársskoðun og brunaskoðun … hve margir reikningar
// sendir og upphæð send fyrir slökkvitæki og síðan brunahólf"):
//   Ársskoðun  = úttektarskýrslur appsins (customer_documents uttektarskyrsla/app, ekki afrit) eftir dagsetningu skýrslunnar — sama og Rekstrarskýrslan.
//   Brunaskoðun = brunakerfi_skyrslur eftir dagsetningu skýrslunnar (data.meta.dags): klárar (final) og í drögum sér.
//   Reikningar SL = Payday SL (payday_invoices_slokk) stofnaðir í mánuðinum, greiddir eða sendir (CANCELLED/CREDIT ekki).
//   Reikningar BH = Payday BH (invoices) útgefnir í mánuðinum, greiddir eða sendir. Upphæð án og með vsk.
async function manudurinn() {
  const fra = idag().slice(0, 8) + '01';
  const [utt, bk, slr, bhr] = await Promise.all([
    sbOll(`customer_documents?select=id,is_duplicate&doc_type=eq.uttektarskyrsla&source=eq.app&doc_date=gte.${fra}&order=id.asc`),
    sbOll('brunakerfi_skyrslur?select=id,status,dags:data->meta->>dags&order=id.asc'),
    sbOll(`payday_invoices_slokk?select=id,amount_ex,amount_total&status=in.(PAID,SENT)&created_date=gte.${fra}&order=id.asc`),
    sbOll(`invoices?select=id,hofudstoll,upphaed_total&source=eq.payday&status=in.(PAID,SENT)&utgafudagur=gte.${fra}&order=id.asc`),
  ]);
  const bkM = bk.filter(r => String(r.dags || '') >= fra && String(r.dags || '') <= idag());
  return {
    fra, til: idag(),
    arsskodun: utt.filter(r => r.is_duplicate !== true).length,
    brunaskodun: bkM.filter(r => r.status === 'final').length, brunaskodun_drog: bkM.filter(r => r.status !== 'final').length,
    reikn_sl: { n: slr.length, an_vsk: summa(slr, r => r.amount_ex), m_vsk: summa(slr, r => r.amount_total) },
    reikn_bh: { n: bhr.length, an_vsk: summa(bhr, r => r.hofudstoll), m_vsk: summa(bhr, r => r.upphaed_total) },
  };
}

// Mæting í dag LIFANDI (Agnar 25.11.2026: „Geturðu ekki bara tengst þessu … þarna kemur allavega hvað margir eru mættir í dag“ og
// „eins og þarna eru 7 mættir og 1 veikur, væri fínt að sjá það“): sama heimild og Mæting · verkstaðir — brunaholf
// /api/timavera-dagar, sem sækir OPNAR stimplanir beint úr Tímaveru-API (timavera-pull geymir aðeins frágengnar færslur, þess vegna
// sýndi röndin „0 í dag“). Veikur = stimplaður á veikindaverkefni í dag („!!! Brunahólf Veikindi / Sick Leave“ og „… Veikindi
// Barns …“ — einu fjarvistaverkefnin í timavera_entries, mælt 25.11); mættir = hinir. Aðeins fjöldi, aldrei nöfn (heilsufar).
const VEIKINDI = /veikind|sick/i;
async function maetingLifandi() {
  const r = await fetch(`${BH}/api/timavera-dagar?days=2`, { headers: await bhHausar() });
  if (!r.ok) throw new Error(`timavera-dagar svaraði ${r.status}`);
  const d = await r.json();
  const dagar = Array.isArray(d && d.days) ? d.days : [];
  return { dagur: iso => dagar.find(x => x && x.date === iso) || null, live: (d && d.live) || {} };
}
const flokkaDag = (dg) => {
  const staff = (dg && Array.isArray(dg.staff)) ? dg.staff : [];
  const veikir = staff.filter(e => (e.projects || []).some(p => VEIKINDI.test(String(p.project || '')))).length;
  return { alls: staff.length, veikir, maettir: staff.length - veikir, inni: Number(dg && dg.open_count) || 0, klst: dg ? Number(dg.total_hours) || 0 : 0 };
};

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
  // Lifandi mæting (sjá maetingLifandi). Bregðist hún — eða nær Tímaveru-API ekki (live.ok false) — stendur talning frágenginna
  // færslna, merkt lifandi:false svo röndin segi „skráðir“ en ekki „mættir“. Aldrei 0 í stað ómælds.
  let lif = null, lifVilla = null;
  try { lif = await maetingLifandi(); } catch (e) { lifVilla = String(e && e.message || e).slice(0, 160); console.error('[yfirsyn] mæting', lifVilla); }
  const lifandi = !!(lif && lif.live && lif.live.ok);
  const idagF = lifandi ? flokkaDag(lif.dagur(d0)) : null;
  const igaerF = lif ? lif.dagur(d1) : null;
  return {
    idag: idagF ? idagF.alls : telja(d0), igaer: igaerF ? flokkaDag(igaerF).alls : telja(d1), vikudagur: vd,
    lifandi, maettir: idagF ? idagF.maettir : null, veikir: idagF ? idagF.veikir : null, inni: idagF ? idagF.inni : null,
    klst_idag: idagF ? Math.round(idagF.klst * 10) / 10 : null, lifandi_villa: lifandi ? null : (lifVilla || (lif && lif.live && lif.live.error) || 'Tímavera svaraði ekki'),
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
  if (!LEYFT.includes(fornafn)) return P.json(403, { error: 'Yfirsýnin er aðeins fyrir Agnar, Annþór og Bjarndísi', bannad: true });
  const [rek, kbh, ksl, os, ssl, sbh, mt, gi, cg, inn, tar, man] = await Promise.all([
    mael('Rekstrarskýrslan', () => rekstur(event)),
    mael('Kröfu yfirlit Brunahólfs', krofurBh),
    mael('Kröfur Slökkvitækja', krofurSl),
    mael('Verkbeiðnir', osott),
    mael('Payday SL', sidastSl),
    mael('Greiðslur Brunahólfs', sidastBh),
    mael('Tímavera', timavera),
    mael('Greiðslur', greittInn),
    mael('CG-gildi Kröfu yfirlita', cgSidna),
    mael('Síðustu inngreiðslur', sidustuInn),
    mael('Tekjur ársins', tekjurAr),
    mael('Mánuðurinn', manudurinn),
  ]);
  if (gi && !gi.omaelt) gi.sidustu = inn;
  const cgOk = cg && !cg.omaelt ? cg : null;
  const te = cgOk ? timiEftirBh(cgOk) : { omaelt: 'CG-gildi Kröfu yfirlita náðust ekki' };
  return P.json(200, { rekstur: rek, krofur: { sl: ksl, bh: kbh, timi_eftir: te }, osott: os, sidast: { sl: ssl, bh: sbh }, timavera: mt, greitt: gi, tekjur_ar: tar, manudurinn: man,
    samraemi: cgOk ? samraemi(cgOk, kbh, ksl, te) : null, maelt_at: new Date().toISOString() });
};
