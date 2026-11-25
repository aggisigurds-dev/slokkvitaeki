// _rekstur-yfirlit.cjs — „Hvernig gengur reksturinn?“ (22.11.2026, beiðni Agnars: „ég hef ekki hugmynd hvernig reksturinn gengur“).
// Hrein föll, ekkert net. Notað af rekstur-yfirlit.cjs; birtist efst í Tekjur í beinni (512-tekjur-beint.js).
//
// Hvort félag sér (ALDREI lögð saman), sex heilir mánuðir á undan + líðandi mánuður til dags, án VSK, þrjár tölur á mánuði:
//   UNNIÐ        Slökkvitæki: skoðanir eftir skoðunarmánuði + verkstæði eftir klart_at + verslun (_unnid-sl.cjs, regla Agnars 21.–22.11).
//                Brunahólf: tímaskýrsla × taxti + göt eftir Done-degi (brunaholf _rekstur.js, sama og „Unnið“ í Rekstrarskýrslunni).
//   REIKNINGSFÆRT = hvenær reikningur var SENDUR/gefinn út (ekki hvenær verkið var unnið):
//                Slökkvitæki: Payday-reikningar (payday_invoices_slokk PAID+SENT) eftir created_date + verslun (kort/reiðufé) á söludegi;
//                Brunahólf: Payday-reikningar (invoices PAID+SENT) eftir útgáfudegi (_tekjur.cjs brunaholfManudir).
//   GREITT       hvenær peningarnir komu: Payday paid_date / greidsla_date + verslun eftir paid_at + (BH) reikningar merktir greiddir í
//                Kröfu yfirliti (SENT, innan 120 daga frá útgáfu).
//   ÓGEFIÐ ÚT = unnið − reikningsfært (mánuður fyrir mánuð og uppsafnað yfir mánuðina sem eru maeldir): vinna sem er unnin en reikningur
//                hefur ekki verið sendur — eða var sendur í síðari mánuði. Neikvætt = reikningar fyrri vinnu sendir í þessum mánuði.
// Slökkvitæki fór í Payday 30.06.2026: Reikningsfært og Greitt eru ÓMÆLD fyrir júní og fyrr (sagt með ástæðu), aldrei 0.
// Kreditnótur miðast við dagsetningu frumsölunnar (Agnar 22.11.2026) — _unnid-sl.cjs og búðarhlutinn hér.
'use strict';

const T = require('./_tekjur.cjs');
const U = require('./_unnid-sl.cjs');

const PAYDAY_SL_FRA = '2026-07';          // fyrsti fulli Payday-mánuður Slökkvitækis
const INNHEIMTA_FRA = '2026-06-30';       // sami gluggi á báðum félögum (Payday hjá SL frá 30.06.2026)
const MAN_NOFN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
const DAGUR_MS = 86400000;

const kr = (n) => Math.round(Number(n) || 0);
const dagur = (x) => String(x || '').slice(0, 10);
const manNafn = (m) => MAN_NOFN[Number(String(m).slice(5, 7)) - 1] || m;

// 'YYYY-MM' sjö mánuðir: sex á undan + líðandi (elstur fyrst).
function sjoManudir(nuIso) {
  const m = T.manudur(nuIso);
  const ut = [m];
  for (let i = 0; i < 6; i++) ut.unshift(T.fyrriMan(ut[0]));
  return ut;
}
// Vinnudagar (mán–fös) í mánuði og hversu margir eru liðnir til og með deginum í dag. Frídagar ekki dregnir frá (athugasemd í svarinu).
function vinnudagar(man, nuIso) {
  const y = Number(man.slice(0, 4)), mo = Number(man.slice(5, 7)) - 1;
  const idag = dagur(nuIso);
  let alls = 0, lidnir = 0;
  for (let d = new Date(Date.UTC(y, mo, 1)); d.getUTCMonth() === mo; d = new Date(d.getTime() + DAGUR_MS)) {
    const vd = d.getUTCDay();
    if (vd === 0 || vd === 6) continue;
    alls++;
    if (d.toISOString().slice(0, 10) <= idag) lidnir++;
  }
  return { lidnir, alls };
}

// ── Innheimta úr Payday-röðum Slökkvitækis (payday_invoices_slokk) ──────────────────────────────────────────────────────────────
// innheimtuhlutfall = greitt ÷ (greitt + gjaldfallið ógreitt) · greiðsluhraði = miðgildi daga frá útgáfu til greiðslu (greitt síðustu 90 d).
// Sama skilgreining og Payday-mælaborðið (staðfest 22.11: 21.465.433 ÷ (21.465.433 + 1.376.001) = 94 %; miðgildi 10 dagar).
function ogreittOgInnheimta(rows, idag, fra) {
  const ut = { fra, greitt_kr: 0, greitt_n: 0, sent_kr: 0, sent_m_vsk: 0, sent_n: 0, gjaldfallid_kr: 0, gjaldfallid_n: 0, yfir45_kr: 0, yfir45_n: 0 };
  const hradi = [];
  const t0 = Date.parse(idag);
  const fyrir90 = new Date(t0 - 90 * DAGUR_MS).toISOString().slice(0, 10), fyrir45 = new Date(t0 - 45 * DAGUR_MS).toISOString().slice(0, 10);
  for (const r of rows || []) {
    const cd = dagur(r.created_date);
    if (!cd || cd < fra) continue;
    const ex = Number(r.amount_ex) || 0;
    if (r.status === 'PAID') {
      ut.greitt_kr += ex; ut.greitt_n++;
      const pd = dagur(r.paid_date);
      if (pd && pd >= fyrir90 && pd <= idag) { const dm = Math.round((Date.parse(pd) - Date.parse(cd)) / DAGUR_MS); if (dm >= 0) hradi.push(dm); }
    } else if (r.status === 'SENT') {
      ut.sent_kr += ex; ut.sent_m_vsk += Number(r.amount_total) || 0; ut.sent_n++;
      const dd = dagur(r.due_date);
      if (dd && dd < idag) { ut.gjaldfallid_kr += ex; ut.gjaldfallid_n++; if (dd < fyrir45) { ut.yfir45_kr += ex; ut.yfir45_n++; } }
    }
  }
  const nefnari = ut.greitt_kr + ut.gjaldfallid_kr;
  ut.hlutfall = nefnari > 0 ? Math.round((1000 * ut.greitt_kr) / nefnari) / 10 : null;
  hradi.sort((a, b) => a - b);
  ut.hradi_n = hradi.length;
  ut.hradi_midgildi = hradi.length ? (hradi.length % 2 ? hradi[(hradi.length - 1) / 2] : (hradi[hradi.length / 2 - 1] + hradi[hradi.length / 2]) / 2) : null;
  for (const k of ['greitt_kr', 'sent_kr', 'sent_m_vsk', 'gjaldfallid_kr', 'yfir45_kr']) ut[k] = kr(ut[k]);
  return ut;
}

// ── Ein skýr setning + áætlun ────────────────────────────────────────────────────────────────────────────────────────────────────
function mkr(n) {
  const a = Math.abs(n);
  const s = a >= 1e6 ? (a / 1e6).toFixed(2).replace('.', ',') + ' m' : String(Math.round(a)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
  return (n < 0 ? '−' : '') + s;
}
// o = { man, unnid, fyrri_man, fyrri, vd:{lidnir, alls} }. Engin túlkun: aðeins tölur, hlutföll og (merkt) áætlun. Aldrei „í lagi“.
function manadarSetning(o) {
  const nm = manNafn(o.man), fm = manNafn(o.fyrri_man);
  if (o.unnid == null) return { setning: `${nm.charAt(0).toUpperCase() + nm.slice(1)} til dags: unnið ómælt — ${o.omaelt || 'gögn vantar'}.`, aaetlun: null, hlutfall_fyrri: null, hlutfall_manadar: null };
  const vd = o.vd || { lidnir: 0, alls: 0 };
  const pctMan = vd.alls > 0 ? Math.round((100 * vd.lidnir) / vd.alls) : null;
  const pctFyrri = o.fyrri != null && o.fyrri > 0 ? Math.round((100 * o.unnid) / o.fyrri) : null;
  const Nm = nm.charAt(0).toUpperCase() + nm.slice(1);
  const inni = [];
  if (pctFyrri != null) inni.push(`${pctFyrri} % af ${fm}-heild (${mkr(o.fyrri)})`);
  if (pctMan != null) inni.push(`${pctMan} % mánaðarins er liðinn (${vd.lidnir} af ${vd.alls} vinnudögum)`);
  const s = `${Nm} til dags: unnið ${mkr(o.unnid)}` + (inni.length ? ' — ' + inni.join(' og ') : '') + '.';
  let aaetlun = null;
  if (vd.lidnir >= 3 && vd.alls > 0) {
    const kr2 = kr((o.unnid * vd.alls) / vd.lidnir);
    const p = o.fyrri != null && o.fyrri > 0 ? Math.round((100 * kr2) / o.fyrri) : null;
    aaetlun = { kr: kr2, hlutfall_fyrri: p, texti: `ÁÆTLUN (línuleg, ekki spá): sömu vinnudagar áfram → mánuðurinn endar í um ${mkr(kr2)}` + (p != null ? ` (${p} % af ${fm}-heild)` : '') + '.' };
  }
  return { setning: s, aaetlun, hlutfall_fyrri: pctFyrri, hlutfall_manadar: pctMan };
}

// ── Mánaðaröð Slökkvitækis ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// g = { solur (final, með greitt_med/paid_at/is_credit), voidIds, frumsolur, skyrslur, verkbeidnir, verklidir, payday }
function reksturSl(g, nuIso) {
  const mans = sjoManudir(nuIso);
  const un = U.unnidManudir(g, nuIso);
  // verslun (kort/reiðufé): reikningsfært á söludegi, greitt á paid_at||created_at; kreditnóta fylgir frumsölunni (Agnar 22.11.2026)
  const dagar = new Map();
  for (const f of g.frumsolur || []) dagar.set(String(f.id), f);
  for (const r of g.solur || []) dagar.set(String(r.id), r);
  const bud = {};
  const b = (m) => (bud[m] = bud[m] || { rf: 0, gr: 0 });
  for (const r of T.slokkvitaekiGildar(g.solur, g.voidIds)) {
    const fs = r.credit_of != null ? dagar.get(String(r.credit_of)) : null;
    const src = fs || r;
    const gm = fs && fs.greitt_med != null ? fs.greitt_med : r.greitt_med;        // greiðslumáti FRUMSÖLUNNAR ræður (rýni 22.11)
    if (gm !== 'kort' && gm !== 'reidufe') continue;
    const upph = Number(r.upphaed_an_vsk) || 0;
    const m1 = T.manudur(src.created_at), m2 = T.manudur(src.paid_at || src.created_at);
    if (m1) b(m1).rf += upph;
    if (m2) b(m2).gr += upph;
  }
  const paydayOk = Array.isArray(g.payday);          // null = lesturinn brást/skilaði engu → ómælt, ekki „bara verslun“
  const pay = { rf: {}, gr: {} };
  for (const r of g.payday || []) {
    const ex = Number(r.amount_ex) || 0;
    if (r.status === 'PAID' || r.status === 'SENT') { const m = T.manudur(r.created_date); if (m) pay.rf[m] = (pay.rf[m] || 0) + ex; }
    if (r.status === 'PAID' && r.paid_date) { const m = T.manudur(r.paid_date); if (m) pay.gr[m] = (pay.gr[m] || 0) + ex; }
  }
  const man = mans.map((m) => {
    const sam = U.manudSamantekt(un.man[m]);
    const unnid = kr(sam.samtals.kr);
    const e = { man: m, unnid, mat: { an_skyrslu_kr: sam.skodanir.an_skyrslu_kr, aaetlad_kr: sam.verkstaedi.aaetlad_kr } };
    if (m < PAYDAY_SL_FRA || !paydayOk) {
      const astaeda = m < PAYDAY_SL_FRA ? 'Slökkvitæki fór í Payday 30.06.2026 — reikningar fyrir þann tíma eru ekki í þessum gögnum' : (g.paydayOmaelt || 'Payday-lesturinn skilaði engu');
      return { ...e, reikningsfaert: null, greitt: null, ogefid: null, omaelt: astaeda };
    }
    const bb = bud[m] || { rf: 0, gr: 0 };
    const rf = kr((pay.rf[m] || 0) + bb.rf), gr = kr((pay.gr[m] || 0) + bb.gr);
    const r = { ...e, reikningsfaert: rf, greitt: gr, ogefid: unnid - rf, hlutar: { rf_payday: kr(pay.rf[m] || 0), rf_verslun: kr(bb.rf), gr_payday: kr(pay.gr[m] || 0), gr_verslun: kr(bb.gr) } };
    // Fyrsti Payday-mánuðurinn ber reikninga fyrir VINNU ÚR JÚNÍ (Payday hófst 30.06): munurinn segir ekkert um „ógefið út“ — ómældur (rýni 22.11).
    if (m === PAYDAY_SL_FRA) { r.ogefid = null; r.ogefid_omaelt = 'júlí ber reikninga fyrir vinnu úr júní (Payday hófst 30.06) — munurinn á unnið og reikningsfært segir ekkert hér'; }
    return r;
  });
  // 22.11.2026 (fasi 3c): samtala líðandi mánaðar í hlutum (skoðanir · verkstæði · verslun · samtals + fjöldi tækja) fyrir „Samtals“-flísina á Yfirsýnarrönd.
  // Sama samantekt og man[].unnid (samtals.kr === man[last].unnid), svo flísin og „Hvernig gengur reksturinn?“ geta aldrei sýnt tvær tölur fyrir sama mánuð.
  const nuM = mans[mans.length - 1], sm = U.manudSamantekt(un.man[nuM]), tk = sm.samtals.taeki;
  const unnid_manudur = { man: nuM, skodanir: kr(sm.skodanir.kr), verkstaedi: kr(sm.verkstaedi.kr), verslun: kr(sm.verslun.kr), samtals: kr(sm.samtals.kr),
    taeki: (tk.yfirferd || 0) + (tk.hledsla || 0) + (tk.nytt || 0),
    // Sundurliðunin sem samtalan er lögð saman úr (Agnar 25.11.2026: yfirfarin, hlaðin, seld). ATH: summan er LÍNUfjöldi —
    // tæki sem er bæði yfirfarið og hlaðið telst í báðum. nytt = ný slökkvitæki úr úttektum OG búð; nytt_bud = þar af búð.
    taeki_sund: { yfirferd: tk.yfirferd || 0, hledsla: tk.hledsla || 0, nytt: tk.nytt || 0,
      nytt_bud: (sm.verslun && sm.verslun.taeki && sm.verslun.taeki.nytt) || 0 } };
  return { man, kredit_an_frumsolu: un.annad.kredit_an_frumsolu, un_annad: un.annad, unnid_manudur };
}

// ── Mánaðaröð Brunahólfs ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// bhMan = svar rekstur-manudir.js .man (sjö tímabil, eftir fra) eða null (ómælt); invoices = Payday-raðir (brunaholfManudir)
function reksturBh(bhMan, reikningsfaertRadir, nuIso, omaeltAstaeda, rfOmaelt) {
  const mans = sjoManudir(nuIso);
  const rfOk = Array.isArray(reikningsfaertRadir) && reikningsfaertRadir.length > 0;
  const rf = T.brunaholfManudir(rfOk ? reikningsfaertRadir : []);
  const eftirMan = new Map((bhMan || []).map((x) => [String(x.fra).slice(0, 7), x]));
  const man = mans.map((m) => {
    const x = eftirMan.get(m);
    const reikn = rfOk ? kr(rf[m] || 0) : null;
    const rfAstaeda = rfOk ? null : (rfOmaelt || 'reikningalesturinn skilaði engu');
    if (!x) return { man: m, unnid: null, reikningsfaert: reikn, greitt: null, ogefid: null, omaelt: omaeltAstaeda || 'Rekstrarskýrsla Brunahólfs náðist ekki' };
    const e = { man: m, unnid: kr(x.unnid), reikningsfaert: reikn, greitt: kr(x.greitt), ogefid: reikn == null ? null : kr(x.unnid) - reikn, hlutar: { tima: x.unnid_hlutar && x.unnid_hlutar.tima, landspitali: x.unnid_hlutar && x.unnid_hlutar.landspitali, heklureitur: x.unnid_hlutar && x.unnid_hlutar.heklureitur } };
    if (rfAstaeda) e.omaelt = rfAstaeda;
    return e;
  });
  return { man };
}

// Skilgreiningarnar sem birtast í ⓘ — ein heimild, prófuð (engin ný regla falin í viðmótinu).
const SKILGREINING = {
  unnid: 'UNNIÐ er verkið sem var unnið í mánuðinum, hvenær sem reikningurinn er sendur. Slökkvitæki: skoðanir (ársþjónusta, brunakerfi, slökkvikerfi) í mánuði skoðunarinnar, verkstæði þegar tækið er klárt og sent í afgreiðslu, og verslun. Brunahólf: stimplaðir tímar × taxti verkstaðar + kláruð göt (áætlun, eins og Rekstrarskýrslan).',
  reikningsfaert: 'REIKNINGSFÆRT er það sem var SENT út í mánuðinum (Payday-reikningar eftir útgáfudegi; Slökkvitæki að viðbættri verslun á söludegi) — þetta er talan sem Payday-mælaborðið sýnir.',
  greitt: 'GREITT er það sem kom inn í mánuðinum (Payday-greiðsludagur; verslun eftir greiðsludegi; Brunahólf að viðbættum reikningum sem eru skráðir greiddir í Kröfu yfirliti innan 120 daga frá útgáfu).',
  ogefid: 'ÓGEFIÐ ÚT er unnið að frádregnu reikningsfærðu í mánuðinum — flæði, ekki staða: neikvætt þýðir að reikningar fyrir fyrri vinnu voru sendir í mánuðinum. Staðan núna (unnið en ekki sent) er „Ósent núna“ fyrir neðan.',
  innheimtuhlutfall: 'INNHEIMTUHLUTFALL = greitt ÷ (greitt + gjaldfallið ógreitt), á reikningum útgefnum frá 30.06.2026, án vsk. Gjaldfallið = sent, ógreitt og gjalddagi liðinn. 94 % þýðir að af því sem er fallið í gjalddaga eða greitt er 94 % greitt.',
  greidsluhradi: 'GREIÐSLUHRAÐI = miðgildi daga frá útgáfu reiknings til greiðslu, á reikningum greiddum síðustu 90 daga. Helmingur reikninga er greiddur á skemmri tíma.',
  setning: 'Hlutföllin eru unnið til dags ÷ heildarunnið í síðasta mánuði, og liðnir vinnudagar (mán–fös, frídagar ekki dregnir frá) ÷ vinnudagar mánaðarins. ÁÆTLUNIN er línulegur framreikningur á sömu vinnudögum — ekki spá og ekki fullyrðing um að allt sé í lagi.',
  hagnadur: 'HAGNAÐUR er ómældur þar til launakostnaður og annar kostnaður á mánuði eru skráðir (smelltu á Hagnaður-flísina).',
};

module.exports = { PAYDAY_SL_FRA, INNHEIMTA_FRA, SKILGREINING, sjoManudir, vinnudagar, ogreittOgInnheimta, manadarSetning, reksturSl, reksturBh, mkr, manNafn };
