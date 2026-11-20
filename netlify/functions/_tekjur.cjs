// _tekjur.cjs — EIN skilgreining á tekjum hvors félags (lota 4 „Fjármál í beinni", 17.11.2026).
// Notað af tekjur-beint.cjs (flísarnar á Tekjum og Bókhaldi) og _radgjafinn.cjs (markmiðsröndin). Hreinar reglur, ekkert net.
//
// SLÖKKVITÆKI — solur, status=final, upphaed_an_vsk (án VSK, eftir afslátt), eftir created_at-mánuði.
//   • Kreditnótur eru neikvæðar og DRAGAST FRÁ í sínum mánuði.
//   • Bakfærðar (void) sölur og drög teljast ALDREI.
//   • Kreditnóta sem vísar á BAKFÆRÐA sölu telst ekki heldur: upprunasalan er þegar úti, annars dregst sama salan frá
//     tvisvar. Mælt 17.11.2026: 4 slíkar nótur, −372.711 kr án VSK (gagnavilla — salan bæði bakfærð og kreditfærð).
//   • solur hefst 04.05.2026 (yfirtakan). Eldri mánuðir eru í stolpi_reikningar (fyrri eigandi) og teljast hér ÓMÆLDIR.
// BRUNAHÓLF — Payday-reikningar (invoices, source=payday), status PAID eða SENT, hofudstoll (án VSK), eftir ÚTGÁFUDEGI.
//   • CANCELLED og CREDIT jafnast út í Payday (jafnmargar raðir, sama upphæð) og teljast hvorugar.
//   • Útgáfudagur, ekki gjalddagi: septemberverk sem er reikningsfært 30.09 er septembertekja þótt gjalddaginn sé í október
//     (VSK-tímabil fylgir útgáfudegi). Gjalddagi er aðeins varaleið þar sem útgáfudag vantar (7 af 395 röðum, allar fyrir 2026).
//   • NLSH: Payday-reikningurinn er 95 % — 5 % öryggisfé er haldið eftir og telst ekki fyrr en það er reikningsfært.
// Félögin eru ALDREI lögð saman hér. Hvert þeirra er sér röð á skjánum.
'use strict';

const SL_FRA = '2026-05';
const kr = (n) => Math.round(Number(n) || 0);
const manudur = (s) => String(s || '').slice(0, 7);

function slokkvitaekiGildar(rows, voidIds) {
  const v = new Set((voidIds || []).map(String));
  return (rows || []).filter((r) => r && r.status === 'final' && !(r.credit_of != null && v.has(String(r.credit_of))));
}

// → { 'YYYY-MM': kr } án VSK
function slokkvitaekiManudir(rows, voidIds) {
  const ut = {};
  for (const r of slokkvitaekiGildar(rows, voidIds)) {
    const m = manudur(r.created_at);
    if (!m) continue;
    ut[m] = (ut[m] || 0) + (Number(r.upphaed_an_vsk) || 0);
  }
  return ut;
}

const BH_STODUR = new Set(['PAID', 'SENT']);
const bhDags = (r) => r.utgafudagur || r.gjalddagi || null;
function brunaholfManudir(rows) {
  const ut = {};
  for (const r of rows || []) {
    if (!r || (r.source && r.source !== 'payday') || (r.status && !BH_STODUR.has(r.status))) continue;
    const m = manudur(bhDags(r));
    if (!m) continue;
    ut[m] = (ut[m] || 0) + (Number(r.hofudstoll) || 0);
  }
  return ut;
}

const summa = (man, fra, til) => Object.keys(man).filter((m) => m >= fra && m <= til).reduce((a, m) => a + man[m], 0);
function fyrriMan(m) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mm - 2, 1));
  return d.toISOString().slice(0, 7);
}

// Mánuður til dags, ár til dags og síðasti heili mánuður. `fraMan` = fyrsti mælanlegi mánuður (Slökkvitæki: 2026-05).
function tolur(man, nuIso, fraMan) {
  const m = manudur(nuIso), ar = m.slice(0, 4), fm = fyrriMan(m);
  const arFra = fraMan && fraMan > ar + '-01' ? fraMan : ar + '-01';
  return {
    manudur: m,
    manudur_til_dags: kr(summa(man, m, m)),
    fyrri_manudur: fraMan && fm < fraMan ? null : kr(summa(man, fm, fm)),
    fyrri_man: fm,
    ar_til_dags: kr(summa(man, arFra, m)),
    ar_fra: arFra,
  };
}

// Framlegð vöru — aðeins línur sem bera product_id með skráðu kostnaðarverði (vorur.kostnadarverd > 0).
// Línuverð er fyrir söluafslátt (afsláttur á sölu liggur ekki í línum), svo talan er efri mörk. Kreditnótur sleppt.
function framlegdVoru(rows, kostnadarverd) {
  const k = kostnadarverd || {};
  let alls = 0, medK = 0, kostn = 0;
  for (const r of rows || []) {
    if (!r || r.status !== 'final' || r.credit_of != null) continue;
    for (const l of Array.isArray(r.linur) ? r.linur : []) {
      const q = l.qty != null ? Number(l.qty) || 0 : 1, p = Number(l.unit_price_ex_vat) || 0, v = q * p;
      alls += v;
      const kv = l.product_id != null ? Number(k[String(l.product_id)]) || 0 : 0;
      if (kv > 0) { medK += v; kostn += q * kv; }
    }
  }
  return {
    sala_alls: kr(alls), sala_med_kostnadarverd: kr(medK), kostnadarverd: kr(kostn),
    framlegd: kr(medK - kostn), thak_pct: alls > 0 ? Math.round((1000 * medK) / alls) / 10 : null,
  };
}

// Hagnaður = tekjur síðasta heila mánaðar − launakostnaður − annar kostnaður (tölur Agnars úr bókhaldi).
// Vanti aðra hvora forsenduna er hagnaður ÓMÆLDUR (null) — aldrei 0 og aldrei giskaður.
const FORSENDUR = { laun: 'launakostnaður á mánuði (með launatengdum gjöldum)', annar: 'annar kostnaður á mánuði (innkaup, leiga, bílar, tryggingar …)' };
function hagnadur(tekjurMan, f) {
  const fs = f || {};
  const gilt = (x) => x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x)) && Number(x) >= 0;
  const vantar = Object.keys(FORSENDUR).filter((k) => !gilt(fs[k]));
  if (tekjurMan == null) vantar.unshift('tekjur síðasta mánaðar');
  if (vantar.length) return { kr: null, vantar: vantar.map((k) => FORSENDUR[k] || k) };
  return { kr: kr(tekjurMan - Number(fs.laun) - Number(fs.annar)), vantar: [], forsendur: { laun: kr(fs.laun), annar: kr(fs.annar) }, skrad: fs.skrad || null };
}

module.exports = { SL_FRA, kr, manudur, slokkvitaekiGildar, slokkvitaekiManudir, brunaholfManudir, tolur, fyrriMan, framlegdVoru, hagnadur, FORSENDUR };
