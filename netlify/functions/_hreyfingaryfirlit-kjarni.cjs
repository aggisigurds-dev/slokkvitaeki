'use strict';
/* _hreyfingaryfirlit-kjarni.cjs — VIÐSKIPTAHREYFINGAR PER KENNITÖLU (greiðanda)
 *
 * Agnar 11.09.2026: „Hafa þær bara kennitölubundnar, ekki niðurnjörfað á locations
 * heimilisföng" → EITT yfirlit per kennitölu, aldrei per stað eða heimilisfang.
 *
 *   reikna(gogn, { fra, til, stolpi, idag }) → { haus, linur, samantekt, arslok, osent, athugasemdir }
 *       HREINN útreikningur, engin I/O. Prófaður: node tools/_test-hreyfingaryfirlit.cjs
 *   saekja(kt10, sbGet, { siduStaerd })      → gogn
 *       sækir allt sem reikna() þarf. sbGet(slod, fra, til) er innspýtt og skilar fylki
 *       (PostgREST + Range-haus) — svo prófið getur keyrt sömu sóknaráætlun án nets.
 *
 * ── TVÖ TÍMABIL ─────────────────────────────────────────────────────────────
 * 1. STÓLPI (fyrri eigendur), bókin til 07.05.2026.
 *    stolpi_hreyfingar er bókin sjálf; opnunarstaða = SUM(upphaed) fyrir upphafsdag.
 *    stolpi_reikningar er staða hvers reiknings → Eftirstöðvar = opid_upphaed.
 *    Greiðslur sem bárust í banka 0528-26-006005 eftir að bókin lokaði eru EKKI í
 *    stolpi_hreyfingar; þær sitja á stolpi_reikningar með samsvorun 'banki_0528:…' og
 *    verða að þremur línum á greitt_dags:
 *       + kostnaður/vextir  = greitt_upphaed − round(höfuðstóll)
 *       − greiðsla          = greitt_upphaed               (Reikningsnúmer = krafa_nr)
 *       − „Lækkun kröfu"    = upphaed − round(0,8 × upphaed)  aðeins við 80%, obekraeft:true
 *    þar sem höfuðstóll = hlutfall × upphaed. Hver slíkur reikningur endar í 0.
 *    Lækkunin er ÓSTAÐFEST (Agnar hefur ekki sagt hvort 20% voru afsláttur) — hún er
 *    alltaf sýnd og nefnd í „Upplýsingar til bókara", aldrei falin.
 *
 * 2. APPIÐ (frá maí 2026): solur + payday_invoices_slokk (spegill Payday).
 *    • Aðeins reikningsviðskipti: greitt_med='reikningur' og status='final'.
 *    • Kennitalan: sé reikningurinn til í Payday ræður Payday-kennitalan (krafan fór
 *      þangað). Annars customer_kt, customers_base.kennitala eða fyrirtaeki.kennitala.
 *      Kreditfærsla án kennitölu erfir móðursöluna (credit_of).
 *    • ALDREI SENT = EKKI Á YFIRLITI: Payday DRAFT, eða hvorki dk_invoice_id né
 *      krafa_sent_at. Slíkt fer í `osent` (innri reitur sem prentast ekki).
 *    • Pörun sala↔Payday er á payday_id = dk_invoice_id, ALDREI á reference einu
 *      (ógiltur reikningur og kreditreikningur hans deila reference).
 *    • Kreditreikningar koma á yfirlitið sem Payday CREDIT-raðir. Kredit í appinu sem
 *      fór aldrei í Payday náði aldrei til viðskiptavinar → `osent`.
 *    • CANCELLED reikningur fær ENGA greiðslulínu (solur.paid_at þar er dagsetning
 *      kreditreikningsins) — kreditreikningurinn jafnar hann.
 *    • Greiðsla: paid_date úr Payday, annars solur.paid_at (ekki við CANCELLED).
 *    • Payday-reikningur á þessa kennitölu sem á sér enga hæfa sölu (sala ógild/drög í
 *      appinu, eða aðeins til í Payday) er tekinn með — viðskiptavinurinn fékk hann — og
 *      nefndur í `athugasemdir`.
 *
 * ── STÓLPA-HAMUR ────────────────────────────────────────────────────────────
 *   'opid' (sjálfgefið): Stólpa-reikningar eins og skráð var; opnir standa opnir.
 *   'fyrri_eigandi':     lína „Uppgjör við fyrri eigendur" 07.05.2026 lokar opinni
 *                        Stólpa-stöðu, Eftirstöðvar Stólpa-reikninga verða 0 og Stólpa-
 *                        færslur eftir 07.05.2026 (bankagreiðslur) sýnast ekki — staðan
 *                        heldur áfram aðeins með færslum appsins.
 *
 * Nafn er ALDREI lykill (sjá minnið „Nafn sem lykill"). `solur_nafn` eru sölur á nafni
 * viðskiptavinar sem bera enga kennitölu; þær fara AÐEINS í `osent` merktar tenging:'nafn'
 * til athugunar — aldrei á yfirlitið og aldrei í útreikning.
 */

const YFIRTAKA = '2026-05-07';
const WALKIN = '9999999999';
const BANKI = 'banki_0528';
const MERKI = '/img/logo.png?v=20260520b';

// ── smáföll ──────────────────────────────────────────────────────────────────
const ktHreint = v => String(v == null ? '' : v).replace(/\D/g, '');
const ktBandstrik = kt => (kt && kt.length === 10 ? kt.slice(0, 6) + '-' + kt.slice(6) : String(kt || ''));
const tala = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const rundun = x => Math.sign(x) * Math.round(Math.abs(x));        // eins og round() í Postgres
const upp = v => String(v == null ? '' : v).toUpperCase();
const summa = arr => arr.reduce((a, l) => a + tala(l.upphaed), 0);
const erKredit = s => s.is_credit === true || tala(s.samtals) < 0;

function dagur(v) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v == null ? '' : v));
  return m ? m[1] : null;
}
function gildDags(v) {
  if (typeof v !== 'string' || v.length !== 10) return null;
  const d = dagur(v);
  if (!d) return null;
  const t = new Date(d + 'T00:00:00Z');
  return !isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d ? d : null;
}
const isDags = iso => (iso ? iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4) : '');
function kr(n) {
  const r = Math.round(tala(n));
  return (r < 0 ? '-' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function hlutfallTexti(x) {
  return Number.isInteger(x) ? String(x) : String(Number(x.toFixed(2))).replace('.', ',');
}
function berSaman(a, b) {
  const x = a._r, y = b._r;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i], q = y[i];
    if (p === q) continue;
    if (p == null) return -1;
    if (q == null) return 1;
    if (typeof p === 'number' && typeof q === 'number') return p - q;
    return String(p) < String(q) ? -1 : 1;
  }
  return 0;
}

// ── nafn og heimilisfang í haus ─────────────────────────────────────────────
// customers_base getur borið brotna CSV-skiptingu (dæmi 540319-1540: nafn „Einhella 4
// (Atlas verktakar", heimilisfang „ehf) 221 Hafnarfjirði, …"). Ójafnir svigar = brotið.
function gildurTexti(t) {
  const s = String(t == null ? '' : t).trim();
  if (!s) return false;
  return (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length;
}
function veljaNafn(g, KT) {
  const cb = (g.customers_base || []).filter(c => ktHreint(c.kennitala) === KT && gildurTexti(c.nafn));
  if (cb.length) return { nafn: String(cb[0].nafn).trim(), heimild: 'customers_base' };
  // annars nýjasta nafn úr gögnunum
  const kand = [];
  (g.payday || []).forEach(p => {
    if (ktHreint(p.kt) === KT && gildurTexti(p.customer_name)) kand.push({ nafn: String(p.customer_name).trim(), dags: dagur(p.created_date) || '', heimild: 'payday' });
  });
  (g.stolpi_hreyfingar || []).forEach(h => {
    if (gildurTexti(h.nafn)) kand.push({ nafn: String(h.nafn).trim(), dags: dagur(h.dags) || '', heimild: 'stolpi' });
  });
  const lifandi = (g.fyrirtaeki || []).filter(f => ktHreint(f.kennitala) === KT && !f.deleted_at && gildurTexti(f.nafn));
  if (lifandi.length === 1) kand.push({ nafn: String(lifandi[0].nafn).trim(), dags: '', heimild: 'fyrirtaeki' });
  kand.sort((a, b) => (a.dags < b.dags ? 1 : a.dags > b.dags ? -1 : 0));
  return kand[0] ? { nafn: kand[0].nafn, heimild: kand[0].heimild } : { nafn: '', heimild: '' };
}
function veljaHeimilisfang(g, KT) {
  const cb = (g.customers_base || []).filter(c => ktHreint(c.kennitala) === KT && gildurTexti(c.heimilisfang));
  if (cb.length) return String(cb[0].heimilisfang).trim();
  // Staðar-heimilisfang AÐEINS ef kennitalan á nákvæmlega einn lifandi stað — annars autt
  // (rekstrarfélag með marga staði á ekki að fá heimilisfang eins þeirra).
  const lifandi = (g.fyrirtaeki || []).filter(f => ktHreint(f.kennitala) === KT && !f.deleted_at);
  if (lifandi.length === 1 && gildurTexti(lifandi[0].heimilisfang)) return String(lifandi[0].heimilisfang).trim();
  return '';
}
function skiptaHeimilisfangi(hf) {
  const s = String(hf == null ? '' : hf).trim();
  if (!s) return { gata: '', postnr: '' };
  let m = /^(.*?),\s*(\d{3}\s+[^,\d].*)$/.exec(s);
  if (m) return { gata: m[1].trim(), postnr: m[2].trim() };
  m = /^(.*?)\s+(\d{3}\s+[^\d].*)$/.exec(s);
  if (m) return { gata: m[1].trim(), postnr: m[2].trim() };
  return { gata: s, postnr: '' };
}
// Kjarni nafns fyrir nafna-vísbendingu (ilike). Of stuttur kjarni = engin leit.
function nafnKjarni(nafn) {
  let s = String(nafn == null ? '' : nafn).toLowerCase().replace(/[(),*"\\%_.:]/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+(ehf|hf|sf|slf|ses|hses|svf|ohf|bs)$/, '').trim();
  return s.length >= 5 ? s : '';
}

// ── Stólpa-vörpun ────────────────────────────────────────────────────────────
const STOLPI = {
  reikningur:          { texti: nr => ('Reikningur ' + nr).trim(),       skyring: 'Reikningur', flokkur: 'reikningar', nr: 'reikn', gjalddagi: true, eftir: true },
  kredit:              { texti: nr => ('Kreditreikningur ' + nr).trim(), skyring: 'Kredit',     flokkur: 'reikningar', nr: 'reikn', gjalddagi: true, eftir: true },
  greidd_krafa:        { texti: () => 'Greiðsla',           skyring: 'Greiðsla',  flokkur: 'greidslur', nr: 'krafa' },
  greiddur_reikningur: { texti: () => 'Greiðsla',           skyring: 'Greiðsla',  flokkur: 'greidslur', nr: 'reikn' },
  innheimtukostnadur:  { texti: () => 'Innheimtukostnaður', skyring: 'Kostnaður', flokkur: 'vextir',    nr: 'krafa' },
  drattarvextir:       { texti: () => 'Dráttarvextir',      skyring: 'Vextir',    flokkur: 'vextir',    nr: 'krafa' },
  greiddir_vextir:     { texti: () => 'Greiddir vextir',    skyring: 'Greiðsla',  flokkur: 'greidslur', nr: '' },
  annad:               { texti: null,                       skyring: 'Annað',     flokkur: 'annad',     nr: '' },
};

// ═════════════════════════════════════════════════════════════════════════════
function reikna(gogn, stillingar) {
  const g = gogn || {};
  const st = stillingar || {};
  const KT = ktHreint(g.kt10);
  const idag = gildDags(st.idag) || new Date().toISOString().slice(0, 10);   // Ísland = UTC
  const til = gildDags(st.til) || idag;
  const fra = gildDags(st.fra) || (Number(til.slice(0, 4)) - 1) + '-01-01';
  const hamur = st.stolpi === 'fyrri_eigandi' ? 'fyrri_eigandi' : 'opid';
  const athugasemdir = [];
  const osent = [];

  // ── 1. Stólpi ──────────────────────────────────────────────────────────────
  const hreyf = g.stolpi_hreyfingar || [];
  const reiknMap = new Map((g.stolpi_reikningar || []).map(r => [String(r.reikn_nr), r]));
  const stolpi = [];
  for (const h of hreyf) {
    if (h.tegund === 'opnunarlina') continue;                      // 0 kr, birtist ekki
    const T = STOLPI[h.tegund] || STOLPI.annad;
    const nr = T.nr === 'reikn' ? String(h.reikn_nr || '') : T.nr === 'krafa' ? String(h.krafa_nr || '') : '';
    const r = h.reikn_nr != null ? reiknMap.get(String(h.reikn_nr)) : null;
    const d = dagur(h.dags);
    stolpi.push({
      dags: d,
      texti: T.texti ? T.texti(nr) : String(h.texti || ''),
      gjalddagi: T.gjalddagi ? dagur(h.eindagi) : null,
      skyring: T.skyring,
      nr,
      upphaed: tala(h.upphaed),
      eftirstodvar: T.eftir ? (hamur === 'fyrri_eigandi' ? 0 : (r ? tala(r.opid_upphaed) : null)) : null,
      flokkur: T.flokkur,
      uppruni: 'stolpi',
      _r: [d, 0, tala(h.runa), tala(h.id)],
    });
  }

  // Greiðslur í banka 0528 eftir lokun bókarinnar
  const krofurIBok = new Set(hreyf.filter(h => h.krafa_nr).map(h => String(h.krafa_nr)));
  const reikningarIBok = new Set(hreyf.filter(h => h.tegund === 'reikningur' && h.reikn_nr != null).map(h => String(h.reikn_nr)));
  const laekkunarHlutfoll = new Set();
  for (const r of g.stolpi_reikningar || []) {
    const sv = String(r.samsvorun || '');
    if (sv.indexOf(BANKI) !== 0) continue;
    const gd = dagur(r.greitt_dags);
    const gu = tala(r.greitt_upphaed);
    const u = tala(r.upphaed);
    if (!gd || !gu) {
      athugasemdir.push(`Stólpa-reikningur ${r.reikn_nr} er merktur greiddur í banka en greiðsludag eða upphæð vantar — engin greiðslulína.`);
      continue;
    }
    if (!reikningarIBok.has(String(r.reikn_nr))) {
      athugasemdir.push(`Stólpa-reikningur ${r.reikn_nr}: bankagreiðsla ${kr(gu)} kr ${isDags(gd)} en reikningurinn er ekki í Stólpa-bókinni — greiðslu sleppt.`);
      continue;
    }
    if (r.krafa_nr && krofurIBok.has(String(r.krafa_nr))) {
      athugasemdir.push(`Stólpa-reikningur ${r.reikn_nr}: krafa ${r.krafa_nr} er þegar í Stólpa-bókinni — bankagreiðslu sleppt svo hún tvíteljist ekki.`);
      continue;
    }
    const m = /:(\d+(?:[.,]\d+)?)\s*%/.exec(sv);
    const pct = m ? Number(m[1].replace(',', '.')) : 100;
    const hofudstoll = rundun(u * pct / 100);
    const kostn = gu - hofudstoll;
    const nrK = String(r.krafa_nr || r.reikn_nr || '');
    const rn = tala(r.reikn_nr);
    if (kostn !== 0) {
      stolpi.push({ dags: gd, texti: /\+\s*vextir/.test(sv) ? 'Innheimtukostnaður og vextir' : 'Innheimtukostnaður', gjalddagi: null, skyring: 'Kostnaður', nr: nrK, upphaed: kostn, eftirstodvar: null, flokkur: 'vextir', uppruni: 'banki', _r: [gd, 1, rn, 0] });
    }
    stolpi.push({ dags: gd, texti: 'Greiðsla', gjalddagi: null, skyring: 'Greiðsla', nr: nrK, upphaed: -gu, eftirstodvar: null, flokkur: 'greidslur', uppruni: 'banki', _r: [gd, 1, rn, 1] });
    if (pct < 100 && u - hofudstoll !== 0) {
      const lp = hlutfallTexti(100 - pct);
      laekkunarHlutfoll.add(lp);
      stolpi.push({ dags: gd, texti: `Lækkun kröfu (${lp}%)`, gjalddagi: null, skyring: 'Lækkun', nr: String(r.reikn_nr), upphaed: -(u - hofudstoll), eftirstodvar: null, flokkur: 'laekkun', obekraeft: true, uppruni: 'banki', _r: [gd, 1, rn, 2] });
    }
  }

  const stolpiAlls = summa(stolpi);
  const stolpiVidYfirtoku = summa(stolpi.filter(l => l.dags <= YFIRTAKA));
  const opnirStolpa = (g.stolpi_reikningar || []).filter(r => tala(r.opid_upphaed) !== 0)
    .map(r => ({ reikn_nr: String(r.reikn_nr), dags: dagur(r.dags), upphaed: tala(r.upphaed), opid: tala(r.opid_upphaed) }))
    .sort((a, b) => (a.dags < b.dags ? -1 : a.dags > b.dags ? 1 : 0));
  const opidAlls = opnirStolpa.reduce((a, r) => a + r.opid, 0);
  if (stolpi.length && Math.round(stolpiAlls - opidAlls) !== 0) {
    athugasemdir.push(`Stólpa-færslur standa í ${kr(stolpiAlls)} kr en opnir Stólpa-reikningar (opid_upphaed) eru ${kr(opidAlls)} kr — mismunur ${kr(stolpiAlls - opidAlls)} kr.`);
  }

  let stolpiLinur = stolpi;
  if (hamur === 'fyrri_eigandi') {
    const eftirYfirtoku = stolpi.filter(l => l.dags > YFIRTAKA);
    if (eftirYfirtoku.length) {
      athugasemdir.push(`Hamur „fyrri eigendur": ${eftirYfirtoku.length} Stólpa-færslur eftir 07.05.2026 (samtals ${kr(summa(eftirYfirtoku))} kr) eru ekki á yfirlitinu.`);
    }
    stolpiLinur = stolpi.filter(l => l.dags <= YFIRTAKA);
    const S = summa(stolpiLinur);
    if (Math.round(S) !== 0) {
      stolpiLinur.push({ dags: YFIRTAKA, texti: 'Uppgjör við fyrri eigendur', gjalddagi: null, skyring: 'Uppgjör', nr: '', upphaed: -S, eftirstodvar: null, flokkur: 'uppgjor', uppruni: 'stolpi', _r: [YFIRTAKA, 2, 0, 0] });
    }
  }

  // ── 2. Appið ───────────────────────────────────────────────────────────────
  const pdById = new Map();
  (g.payday || []).forEach(p => { if (p && p.payday_id) pdById.set(String(p.payday_id), p); });
  const solurMap = new Map();
  (g.solur || []).forEach(s => { if (s && s.id != null) solurMap.set(String(s.id), s); });
  const solurRadir = [...solurMap.values()].sort((a, b) => tala(a.id) - tala(b.id));
  const pdAf = s => (s && s.dk_invoice_id ? pdById.get(String(s.dk_invoice_id)) || null : null);
  const eiginKt = s => [...new Set([s.customer_kt, s.cb_kt, s.fy_kt].map(ktHreint).filter(k => k.length === 10 && k !== WALKIN))];
  const haefur = s => s.greitt_med === 'reikningur' && s.status === 'final';
  function tilheyrir(s, dypt) {
    const p = pdAf(s);
    const pk = p ? ktHreint(p.kt) : '';
    if (pk) return pk === KT;                                       // Payday ræður
    if (eiginKt(s).indexOf(KT) >= 0) return true;
    if (!dypt && s.credit_of != null) {                             // kredit erfir móðurina
      const m = solurMap.get(String(s.credit_of));
      if (m) return tilheyrir(m, 1);
    }
    return false;
  }
  function erSent(s) {
    const p = pdAf(s);
    if (p) return upp(p.status) !== 'DRAFT';
    return !!(s.dk_invoice_id || s.krafa_sent_at);
  }

  const app = [];
  const notadPd = new Set();
  const tengdKredit = new Set();

  function baetaReikningi(s, p) {
    const status = p ? upp(p.status) : '';
    const upph = p ? tala(p.amount_total) : tala(s.samtals);
    const d = (p && dagur(p.created_date)) || (s && dagur(s.invoiced_at || s.krafa_sent_at || s.created_at));
    const nr = p && p.number ? String(p.number) : (s ? String(s.num || '') : '');
    const num = s ? (s.num || null) : ((p && p.reference) || null);
    let greitt = null;
    if (status === 'PAID') greitt = dagur(p.paid_date) || (s ? dagur(s.paid_at) : null);
    else if ((status === 'SENT' || !p) && s && s.paid_at) greitt = dagur(s.paid_at);
    const nrTala = tala(nr);
    app.push({
      dags: d, texti: ('Reikningur ' + nr + (num && num !== nr ? ' · ' + num : '')).trim(),
      gjalddagi: p ? dagur(p.due_date) : null, skyring: 'Reikningur', nr, upphaed: upph,
      eftirstodvar: status === 'CANCELLED' || greitt ? 0 : upph,
      flokkur: 'reikningar', uppruni: p ? 'payday' : 'app', num, payday_status: status || null,
      _r: [d, 3, 0, nrTala],
    });
    if (greitt) {
      app.push({ dags: greitt, texti: 'Greiðsla', gjalddagi: null, skyring: 'Greiðsla', nr, upphaed: -upph, eftirstodvar: null, flokkur: 'greidslur', uppruni: status === 'PAID' ? 'payday' : 'app', num, _r: [greitt, 3, 2, nrTala] });
    }
    if (s && p && Math.abs(tala(s.samtals) - upph) >= 1) {
      athugasemdir.push(`${s.num}: ${kr(s.samtals)} kr í appinu en ${kr(upph)} kr í Payday (reikningur ${nr}) — yfirlitið notar Payday-upphæðina.`);
    }
  }

  // 2a. Reikningar (jákvæðar sölur)
  for (const s of solurRadir) {
    if (erKredit(s) || !haefur(s)) continue;
    const p = pdAf(s);
    const pk = p ? ktHreint(p.kt) : '';
    const eigin = eiginKt(s);
    if (!tilheyrir(s, 0)) {
      if (p && pk && pk !== KT && eigin.indexOf(KT) >= 0) {
        athugasemdir.push(`${s.num} ber kennitölu ${ktBandstrik(KT)} í appinu en var gefinn út á ${ktBandstrik(pk)} í Payday (reikningur ${p.number || '—'}) — ekki á þessu yfirliti.`);
      }
      continue;
    }
    if (p) notadPd.add(String(p.payday_id));
    if (p && pk === KT && eigin.length && eigin.indexOf(KT) < 0) {
      athugasemdir.push(`${s.num} ber kennitölu ${eigin.map(ktBandstrik).join(' / ')} í appinu en var gefinn út á þessa kennitölu í Payday (reikningur ${p.number || '—'}).`);
    }
    const status = p ? upp(p.status) : '';
    if (status === 'DRAFT') {
      osent.push({ num: s.num, dags: dagur(p.created_date) || dagur(s.created_at), upphaed: tala(p.amount_total), astaeda: 'Drög í Payday (DRAFT) — aldrei send viðskiptavini', tenging: 'kt', par: null });
      continue;
    }
    if (!p && !s.dk_invoice_id && !s.krafa_sent_at) {
      osent.push({ num: s.num, dags: dagur(s.created_at), upphaed: tala(s.samtals), astaeda: 'Aldrei sent — hvorki í Payday né krafa send', tenging: 'kt', par: null });
      continue;
    }
    if (status === 'CREDIT') continue;                              // afgreitt með kreditreikningum
    if (s.dk_invoice_id && !p) {
      athugasemdir.push(`${s.num}: Payday-færslan finnst ekki í Payday-speglinum — upphæð og greiðsla úr appinu.`);
    }
    baetaReikningi(s, p);
  }

  // 2b. Kreditreikningar úr Payday (CREDIT á þessa kennitölu)
  const kreditPd = (g.payday || []).filter(p => upp(p.status) === 'CREDIT' && ktHreint(p.kt) === KT)
    .sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')) || tala(a.number) - tala(b.number));
  for (const c of kreditPd) {
    notadPd.add(String(c.payday_id));
    const upph = -Math.abs(tala(c.amount_total));
    let sk = solurRadir.find(s => String(s.dk_invoice_id || '') === String(c.payday_id));
    if (!sk) {
      sk = solurRadir.find(s => erKredit(s) && !tengdKredit.has(String(s.id)) && !s.dk_invoice_id && s.credit_of != null &&
        (solurMap.get(String(s.credit_of)) || {}).num === c.reference &&
        Math.abs(Math.abs(tala(s.samtals)) - Math.abs(upph)) < 2);
    }
    if (sk) tengdKredit.add(String(sk.id));
    const d = dagur(c.created_date);
    const nr = String(c.number || (sk && sk.num) || '');
    app.push({
      dags: d, texti: ('Kreditreikningur ' + nr + (c.reference ? ' · vegna ' + c.reference : '')).trim(),
      gjalddagi: null, skyring: 'Kredit', nr, upphaed: upph, eftirstodvar: 0,
      flokkur: 'reikningar', uppruni: 'payday', num: sk ? sk.num : null, tilvisun: c.reference || null,
      _r: [d, 3, 1, tala(nr)],
    });
  }

  // 2c. Kreditfærslur í appinu sem pöruðust ekki við Payday CREDIT
  for (const s of solurRadir) {
    if (!erKredit(s) || !haefur(s) || tengdKredit.has(String(s.id))) continue;
    if (!tilheyrir(s, 0)) continue;
    const m = s.credit_of != null ? solurMap.get(String(s.credit_of)) : null;
    const p = pdAf(s);
    if (p) {
      const status = upp(p.status);
      if (status === 'DRAFT') {
        osent.push({ num: s.num, dags: dagur(p.created_date) || dagur(s.created_at), upphaed: tala(p.amount_total), astaeda: 'Kreditreikningur í drögum í Payday (DRAFT)', tenging: 'kt', par: m ? m.num : null });
      } else {
        athugasemdir.push(`${s.num}: kreditfærsla með Payday-stöðu ${status || '—'} — ekki á yfirliti, skoða handvirkt.`);
      }
      continue;
    }
    if (m && haefur(m) && !m.dk_invoice_id && m.krafa_sent_at) {
      // móðirin var send án Payday — kreditið fylgir henni á yfirlitið
      const d = dagur(s.created_at);
      app.push({ dags: d, texti: 'Kreditreikningur ' + s.num + ' · vegna ' + m.num, gjalddagi: null, skyring: 'Kredit', nr: String(s.num || ''), upphaed: tala(s.samtals), eftirstodvar: 0, flokkur: 'reikningar', uppruni: 'app', num: s.num, tilvisun: m.num, _r: [d, 3, 1, 0] });
      continue;
    }
    osent.push({
      num: s.num, dags: dagur(s.created_at), upphaed: tala(s.samtals),
      astaeda: m ? (erSent(m) ? `Kreditreikningur á ${m.num} fór aldrei í Payday` : `Kredit á ósendan reikning ${m.num}`) : 'Kreditfærsla án upprunareiknings — aldrei send',
      tenging: 'kt', par: m ? m.num : null,
    });
  }

  // 2d. Payday-reikningar á þessa kennitölu sem eiga sér enga hæfa sölu
  for (const p of g.payday || []) {
    if (ktHreint(p.kt) !== KT || notadPd.has(String(p.payday_id))) continue;
    const status = upp(p.status);
    const s = solurRadir.find(x => String(x.dk_invoice_id || '') === String(p.payday_id)) || null;
    if (status === 'DRAFT') {
      osent.push({ num: (s && s.num) || p.reference || '—', dags: dagur(p.created_date), upphaed: tala(p.amount_total), astaeda: s ? `Drög í Payday (DRAFT); salan er „${s.status}" í appinu` : 'Drög í Payday (DRAFT) án sölu í appinu', tenging: 'kt', par: null });
      continue;
    }
    if (['SENT', 'PAID', 'CANCELLED'].indexOf(status) < 0) continue;
    athugasemdir.push(s
      ? `${s.num} er „${s.status}"${s.greitt_med !== 'reikningur' ? ' (' + s.greitt_med + ')' : ''} í appinu en reikningur ${p.number || '—'} er ${status} í Payday — tekinn með á yfirlitið.`
      : `Reikningur ${p.number || '—'}${p.reference ? ' (' + p.reference + ')' : ''} er aðeins í Payday (${status}) — tekinn með á yfirlitið.`);
    baetaReikningi(s, p);
  }

  // 2e. Nafna-vísbendingar (engin kennitala á sölunni) — AÐEINS til athugunar
  const visbendingar = (g.solur_nafn || []).filter(s => s && haefur(s) && !solurMap.has(String(s.id)) && !eiginKt(s).length);
  const visbMap = new Map(visbendingar.map(s => [String(s.id), s]));
  visbendingar.sort((a, b) => tala(a.id) - tala(b.id)).forEach(s => {
    const m = s.credit_of != null ? (visbMap.get(String(s.credit_of)) || solurMap.get(String(s.credit_of))) : null;
    const kt = ktHreint(s.customer_kt);
    const sent = !!(s.dk_invoice_id || s.krafa_sent_at);
    osent.push({
      num: s.num, dags: dagur(s.created_at), upphaed: tala(s.samtals),
      astaeda: (erKredit(s) ? (m ? `Kredit á ${m.num}` : 'Kreditfærsla') : 'Sala') +
        ` á nafni viðskiptavinar, ${kt ? 'kt ' + ktBandstrik(kt) : 'engin kennitala'}` + (sent ? ' — ATH merkt send' : ' — aldrei send'),
      tenging: 'nafn', par: erKredit(s) && m ? m.num : null,
    });
  });

  // ── 3. Samsetning ──────────────────────────────────────────────────────────
  const allar = stolpiLinur.concat(app).filter(l => l.dags).sort(berSaman);
  const byrjun = summa(allar.filter(l => l.dags < fra));
  const tima = allar.filter(l => l.dags >= fra && l.dags <= til);

  const arslokDagar = [];
  for (let y = Number(fra.slice(0, 4)); y <= Number(til.slice(0, 4)); y++) {
    const d = y + '-12-31';
    if (d >= fra && d < til) arslokDagar.push(d);
  }
  const hreint = l => { const o = Object.assign({}, l); delete o._r; return o; };
  const linur = [{ tegund: 'byrjun', dags: fra, texti: 'Byrjunarstaða', stada: byrjun }];
  const arslok = [];
  let stada = byrjun;
  let ai = 0;
  const arsLina = d => {
    arslok.push({ ar: Number(d.slice(0, 4)), dags: d, stada });
    linur.push({ tegund: 'arslok', dags: d, texti: 'Staða ' + isDags(d), stada });
  };
  for (const l of tima) {
    while (ai < arslokDagar.length && l.dags > arslokDagar[ai]) arsLina(arslokDagar[ai++]);
    stada += l.upphaed;
    linur.push(Object.assign(hreint(l), { tegund: 'faersla', stada }));
  }
  while (ai < arslokDagar.length) arsLina(arslokDagar[ai++]);
  linur.push({ tegund: 'lok', dags: til, texti: 'Lokastaða', stada });

  const flokkar = { reikningar: 0, greidslur: 0, vextir: 0, laekkun: 0, uppgjor: 0, annad: 0 };
  for (const l of tima) flokkar[l.flokkur] = (flokkar[l.flokkur] || 0) + l.upphaed;
  const flokkaSumma = Object.keys(flokkar).reduce((a, k) => a + flokkar[k], 0);

  const snertir = allar.filter(l => l.dags <= til);
  let bokari = 'Færslur til 07.05.2026 eru úr bókhaldskerfi fyrri eigenda (Stólpa); síðari færslur úr Payday.';
  if (snertir.some(l => l.uppruni === 'banki')) {
    bokari += ' Greiðslur Stólpa-krafna sem bárust eftir lokun bókarinnar eru skráðar eftir bankayfirliti reiknings 0528-26-006005.';
  }
  const laekkanir = snertir.filter(l => l.obekraeft);
  if (laekkanir.length) {
    const hl = [...new Set(laekkanir.map(l => (/\(([^)]+)\)/.exec(l.texti) || [])[1]).filter(Boolean))].join(' / ');
    bokari += ` „Lækkun kröfu (${hl})" er skráð eins og krafan var innheimt en hefur ekki verið staðfest.`;
  }
  if (hamur === 'fyrri_eigandi') bokari += ' Opin Stólpa-staða 07.05.2026 er gerð upp við fyrri eigendur.';

  const b = g.branding || {};
  const nafnV = veljaNafn(g, KT);
  const hf = skiptaHeimilisfangi(veljaHeimilisfang(g, KT));
  const haus = {
    kt: ktBandstrik(KT),
    nafn: nafnV.nafn,
    nafn_heimild: nafnV.heimild,
    gata: hf.gata,
    postnr_baer: hf.postnr,
    fra, til, dags: idag, stolpi: hamur,
    titill: `Viðskiptahreyfingar ${isDags(fra)} - ${isDags(til)}`,
    utgefandi: {
      nafn: gildurTexti(b.company_name) ? String(b.company_name).trim() : 'Slökkvitæki ehf.',
      kennitala: b.kennitala || '600508-0400',
      heimilisfang: [b.address1, b.address2].filter(Boolean).join(', ') || 'Helluhrauni 10, 220 Hafnarfirði',
      simi: b.phone || '565-4080',
      netfang: b.email || 'eldklar@eldklar.is',
      // Sama merki og reikningarnir (SlokkLogo.getUrl() → branding.logo_url, oftast í Supabase
      // Storage). data:-slóðir (hlaðið upp í Stillingum) eru ekki sendar í JSON — þá sjálfgefið.
      merki: typeof b.logo_url === 'string' && b.logo_url.length < 500 && (/^\/[^/]/.test(b.logo_url) || /^https:\/\//.test(b.logo_url)) ? b.logo_url : MERKI,
    },
    bokari,
  };

  osent.sort((a, b2) => (a.tenging === b2.tenging ? 0 : a.tenging === 'kt' ? -1 : 1) ||
    String(a.dags || '').localeCompare(String(b2.dags || '')) || String(a.num || '').localeCompare(String(b2.num || '')));

  return {
    haus,
    linur,
    samantekt: Object.assign({ byrjunarstada: byrjun }, flokkar, {
      lokastada: stada,
      fjoldi_faerslna: tima.length,
      stemmir: Math.round(byrjun + flokkaSumma - stada) === 0,
      stolpi: { stada_vid_yfirtoku: stolpiVidYfirtoku, stada_alls: stolpiAlls, opnir_reikningar: opnirStolpa, opid_alls: opidAlls },
    }),
    arslok,
    osent,
    athugasemdir,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Sókn — ein keyrsla per yfirlit (engin endurtekning, engin vöktun).
const DALKAR = {
  stolpi_hreyfingar: 'id,nafn,dags,eindagi,texti,runa,upphaed,tegund,reikn_nr,krafa_nr',
  stolpi_reikningar: 'reikn_nr,tegund,dags,eindagi,upphaed,stada,opid_upphaed,greitt_dags,greitt_upphaed,krafa_nr,samsvorun',
  customers_base: 'id,kennitala,nafn,heimilisfang',
  fyrirtaeki: 'id,nafn,kennitala,heimilisfang,deleted_at',
  payday: 'id,payday_id,number,kt,customer_name,amount_total,created_date,due_date,paid_date,status,reference',
  solur: 'id,num,customer_nafn,customer_kt,customer_id,customer_base_id,samtals,greitt_med,status,is_credit,credit_of,created_at,paid_at,krafa_sent_at,invoiced_at,dk_invoice_id,cb:customers_base(kennitala),fy:fyrirtaeki(kennitala)',
};
function slod(tafla, params) {
  return tafla + '?' + Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
}
async function allt(sbGet, s, siduStaerd) {
  const ut = [];
  for (let fra = 0; ; fra += siduStaerd) {
    const radir = await sbGet(s, fra, fra + siduStaerd - 1);
    if (!Array.isArray(radir)) throw new Error('Óvænt svar frá ' + s.split('?')[0]);
    for (const r of radir) ut.push(r);
    if (radir.length < siduStaerd) break;
  }
  return ut;
}
function bitar(arr, n) {
  const ut = [];
  for (let i = 0; i < arr.length; i += n) ut.push(arr.slice(i, i + n));
  return ut;
}
function flatSolu(s) {
  const r = Object.assign({}, s);
  r.cb_kt = s.cb ? s.cb.kennitala : (s.cb_kt != null ? s.cb_kt : null);
  r.fy_kt = s.fy ? s.fy.kennitala : (s.fy_kt != null ? s.fy_kt : null);
  delete r.cb;
  delete r.fy;
  return r;
}

async function saekja(kt10, sbGet, valkostir) {
  const v = valkostir || {};
  const N = v.siduStaerd || 1000;
  const KT = ktHreint(kt10);
  const ktd = ktBandstrik(KT);
  const inKt = `in.(${ktd},${KT})`;

  const [stolpi_hreyfingar, stolpi_reikningar, customers_base, fyrirtaeki, paydayKt, branding] = await Promise.all([
    allt(sbGet, slod('stolpi_hreyfingar', { select: DALKAR.stolpi_hreyfingar, kt10: 'eq.' + KT, order: 'id.asc' }), N),
    allt(sbGet, slod('stolpi_reikningar', { select: DALKAR.stolpi_reikningar, kt10: 'eq.' + KT, order: 'reikn_nr.asc' }), N),
    allt(sbGet, slod('customers_base', { select: DALKAR.customers_base, kennitala: inKt, order: 'id.asc' }), N),
    allt(sbGet, slod('fyrirtaeki', { select: DALKAR.fyrirtaeki, kennitala: inKt, order: 'id.asc' }), N),
    allt(sbGet, slod('payday_invoices_slokk', { select: DALKAR.payday, kt: `in.(${KT},${ktd})`, order: 'id.asc' }), N),
    Promise.resolve()
      .then(() => sbGet(slod('app_settings', { select: 'branding:settings->branding', id: 'eq.1' }), 0, 0))
      .then(r => (Array.isArray(r) && r[0] && r[0].branding) || null)
      .catch(() => null),
  ]);

  const solur = new Map();
  const baeta = radir => radir.forEach(s => { const f = flatSolu(s); solur.set(String(f.id), f); });
  const ollIBitum = (listi, staerd, smida) => Promise.all(bitar(listi, staerd).map(b => allt(sbGet, smida(b), N)));

  // a) sölur á kennitölunni: customer_kt, customers_base eða fyrirtaeki
  const ors = [`customer_kt.${inKt}`];
  const cbIds = customers_base.map(c => c.id).filter(x => x != null);
  const fyIds = fyrirtaeki.map(f => f.id).filter(x => x != null);
  if (cbIds.length) ors.push(`customer_base_id.in.(${cbIds.join(',')})`);
  if (fyIds.length) ors.push(`customer_id.in.(${fyIds.join(',')})`);
  baeta(await allt(sbGet, slod('solur', { select: DALKAR.solur, or: `(${ors.join(',')})`, order: 'id.asc' }), N));

  // b) sölur sem Payday gaf út á kennitöluna (salan sjálf getur borið aðra kt)
  const dkIHendi = new Set([...solur.values()].map(s => String(s.dk_invoice_id || '')).filter(Boolean));
  const pdAnSolu = paydayKt.map(p => String(p.payday_id || '')).filter(id => id && !dkIHendi.has(id));
  (await ollIBitum(pdAnSolu, 40, b => slod('solur', { select: DALKAR.solur, dk_invoice_id: `in.(${b.join(',')})`, order: 'id.asc' }))).forEach(baeta);

  // c) kreditfærslur sem vísa á þessar sölur, og d) móðursölur sem vantar
  (await ollIBitum([...solur.keys()], 80, b => slod('solur', { select: DALKAR.solur, credit_of: `in.(${b.join(',')})`, order: 'id.asc' }))).forEach(baeta);
  const modur = [...new Set([...solur.values()].map(s => s.credit_of).filter(x => x != null).map(String))].filter(id => !solur.has(id));
  (await ollIBitum(modur, 80, b => slod('solur', { select: DALKAR.solur, id: `in.(${b.join(',')})`, order: 'id.asc' }))).forEach(baeta);

  // e) Payday-raðir sala sem Payday skráði á aðra kennitölu
  const pdIHendi = new Set(paydayKt.map(p => String(p.payday_id)));
  const pdVantar = [...new Set([...solur.values()].map(s => String(s.dk_invoice_id || '')).filter(id => id && !pdIHendi.has(id)))];
  const pdAukar = [].concat(...(await ollIBitum(pdVantar, 40, b => slod('payday_invoices_slokk', { select: DALKAR.payday, payday_id: `in.(${b.join(',')})`, order: 'id.asc' }))));

  const gogn = {
    kt10: KT, stolpi_hreyfingar, stolpi_reikningar, customers_base, fyrirtaeki,
    payday: paydayKt.concat(pdAukar), solur: [...solur.values()], solur_nafn: [], branding,
  };

  // f) nafna-vísbending: sölur á nafninu sem bera enga kennitölu (aðeins til athugunar)
  if (v.nafnVisbending !== false) {
    const kjarni = nafnKjarni(veljaNafn(gogn, KT).nafn);
    if (kjarni) {
      const radir = await allt(sbGet, slod('solur', {
        select: DALKAR.solur, customer_nafn: `ilike.*${kjarni}*`, greitt_med: 'eq.reikningur', status: 'eq.final',
        or: '(customer_kt.is.null,customer_kt.in.("",999999-9999))', order: 'id.asc',
      }), N);
      gogn.solur_nafn = radir.map(flatSolu).filter(s => !solur.has(String(s.id)));
    }
  }
  return gogn;
}

module.exports = {
  reikna, saekja,
  ktHreint, ktBandstrik, gildDags, isDags, kr, nafnKjarni, veljaNafn, skiptaHeimilisfangi,
  YFIRTAKA, WALKIN, DALKAR,
};
