#!/usr/bin/env node
/*
 * audit-skyrsla-solu.cjs — ÓSEND sala má ekki bera úttektarskýrslu sem stemmir ekki við hana.  17.11.2026
 *
 * Agnar 17.11.2026: „[kúnni] er ennþá með ranga skýrslu“ og svo „Mátt reyna laga þetta svo það sé ekki
 * alltaf vesen.“ Reikningur endurgerður á nýja kennitölu hélt gömlu skýrslunni (gamalt nafn, gömul kt). Það sást fyrst
 * þegar kúnninn hefði fengið hana. Þessi vörður sýnir það DAGINN sem það gerist: ósend úttektar-/vinnublaðssala þar sem
 * skýrslan sem myndi fylgja kröfunni stemmir ekki við söluna → RAUTT, með R-númeri og ástæðu.
 *
 * DÓMURINN er ekki skrifaður hér: hann er netlify/functions/_skyrsla-solu.cjs (velja + bera) — SAMA fall og payday-push
 * notar þegar krafan er send og sendiskjárinn sýnir. Breytist reglan, breytist hún alls staðar í einu.
 *
 *   RAUTT  skýrslan er um ANNAN stað — bæði kt og nafn önnur en sölunnar og staðarins, eða #staður annar (sendingin
 *          stöðvast nema staðfest sé), eða salan er með fleiri tæki en skýrslan (tækjum bætt við
 *          án nýrrar skýrslu — tölur skýrslunnar aðeins notaðar ef þær eru úr ÞESSARI skýrslu).
 *   ⚠      kt EÐA nafn eitt og sér (nýr greiðandi á stað, rekstrarfélag, leiðrétt kt, nafnabreyting), skýrsla annars árs,
 *          eða viðbótarsala sem bíður nýrrar skýrslu (488 — hliðið í payday-push stöðvar hana).
 *
 * Mengið: status final, ekki kredit, ekki falin, ekki kreditfærð (credit_of), engin sendimerki (dk_invoice_id,
 * invoiced_at, krafa_sent_at), source uttekt/vinnublad, ár sölunnar = í ár eða í fyrra. Staður sem vill EKKI skýrslu
 * með kröfu (skyrsla_med_krofu=false) er sleppt.
 *
 * Gildran „tómt svar úr RLS" (MAELINGAR.md): lesist engin skýrsluviðhengi (company_attachments) er það RAUTT, ekki grænt.
 *
 * Lagfæring þegar rautt: opna staðinn → „Búa til úttektarskýrslu" (eða „📄 Búa til nýja skýrslu" í sendiglugganum) —
 * nýja skýrslan fær nafn og kt sölunnar, sú gamla er merkt leyst af hólmi (engu eytt).
 *
 * Keyrsla:  node tools/audit-skyrsla-solu.cjs        (--profa: sjálfpróf án nets)
 * Read-only. Publishable-lykill (sami og audit-afslattur-hopur).
 */
'use strict';
const path = require('path');
const SS = require(path.join(__dirname, '..', 'netlify', 'functions', '_skyrsla-solu.cjs'));

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

// Úttakið fer í opinber CI-logg (repóið er opið): aðeins auðkenni (R-númer, sala, staður) og HVAÐ stemmir ekki —
// aldrei kennitala eða nafn kúnna. Gildin sjálf sjást í sendiglugganum (166) og í payday-push-svarinu.
const SVID = { kt: 'kennitala skýrslunnar er önnur en sölunnar og staðarins', nafn: 'nafnið á skýrslunni er annað en á sölunni og staðnum',
  stadur: 'skýrslan er um annan stað', ar: 'skýrslan er frá öðru ári en salan', vidbot: 'viðbótarsala bíður nýrrar skýrslu (eldri en viðbótin)' };
const lysaMis = (m) => m.svid === 'taeki' ? 'salan er með ' + m.sala + ' tæki en skýrslan ' + m.skyrsla + ' (tækjum bætt við án nýrrar skýrslu)' : (SVID[m.svid] || m.svid);

// Dómurinn yfir einni sölu → { rautt: [texti], gult: [texti] }
function daema(g) {
  const sk = SS.velja(g.sale, g.vidhengi || [], g.site, g.skjal || null);
  const r = SS.bera(g.sale, sk, { site: g.site, base: g.base, facts: g.facts, vidbot: !!g.vidbot });
  const merki = (g.sale.num || ('#' + g.sale.id)) + ' (sala ' + g.sale.id + ', staður #' + g.sale.customer_id + ')';
  const rautt = r.misraemi.filter((m) => m.stodvar || m.svid === 'taeki').map((m) => merki + ': ' + lysaMis(m));
  // kt EÐA nafn eitt og sér (nýr greiðandi, leiðrétt kt, rekstrarfélag, nafnabreyting) er ⚠, ekki rautt — stjórnlotan 17.11.2026.
  const gult = r.misraemi.filter((m) => !m.stodvar && m.svid !== 'taeki' && m.svid !== 'engin').map((m) => merki + ': ' + lysaMis(m) + (m.svid === 'kt' || m.svid === 'nafn' ? ' (hitt stemmir — líklega sami staður)' : ''));
  return { rautt, gult, skyrsla: r.lysing && r.lysing.nafn };
}

if (process.argv.includes('--profa')) {
  const ar = String(new Date().getFullYear());
  const sala = { id: 1, num: 'R-PROF-1', customer_id: 9, customer_kt: '691299-0079', customer_nafn: 'Nýja félagið ehf', created_at: new Date().toISOString(),
    linur: [{ qty: 2, desc: 'Yfirferð · Léttvatnstæki 6L. yfirferð' }] };
  const sk = (kt, nafn, ms) => ({ id: 'a' + ms, kind: 'skyrsla', year: ar, uploaded_at: new Date(ms).toISOString(), path: 'company_attachments/9/' + ms + '_x.pdf',
    name: nafn + ' - Gata 1 - ' + kt + ' - ' + ar + ' - október - úttektarskýrsla - #9.pdf' });
  const site = { nafn: 'Nýja félagið ehf', kennitala: '691299-0079' };
  const hreint = daema({ sale: sala, site, vidhengi: [sk('691299-0079', 'Nýja félagið ehf', Date.now() - 864e5)] });
  const gamla = daema({ sale: sala, site, vidhengi: [sk('681299-0099', 'Gamla félagið ehf', Date.now() - 40 * 864e5)] });
  const leyst = daema({ sale: sala, site, vidhengi: [Object.assign(sk('681299-0099', 'Gamla félagið ehf', Date.now() - 40 * 864e5), { leyst_af: 'x' }),
    sk('691299-0079', 'Nýja félagið ehf', Date.now() - 60e3)] });
  const taeki = daema({ sale: Object.assign({}, sala, { linur: [{ qty: 5, desc: 'Yfirferð · Léttvatnstæki 6L. yfirferð' }] }), site,
    vidhengi: [sk('691299-0079', 'Nýja félagið ehf', Date.now() - 864e5)],
    facts: { total_devices: 2, report_year: +ar, parsed_at: new Date().toISOString() } });
  const villur = [];
  if (hreint.rautt.length) villur.push('hreint mengi dæmdist rautt: ' + hreint.rautt.join(' | '));
  if (!(gamla.rautt.length === 2 && /kennitala/.test(gamla.rautt[0]) && /nafnið/.test(gamla.rautt[1]) && !/681299|Gamla/.test(gamla.rautt.join(' ')))) villur.push('gömul skýrsla á annarri kt/nafni varð ekki rauð: ' + JSON.stringify(gamla));
  if (leyst.rautt.length) villur.push('skýrsla leyst af hólmi dæmdist samt: ' + leyst.rautt.join(' | '));
  if (!(taeki.rautt.length === 1 && /5 tæki en skýrslan 2/.test(taeki.rautt[0]))) villur.push('fleiri tæki en í skýrslu varð ekki rautt: ' + JSON.stringify(taeki));
  // Nýr greiðandi á SAMA stað (nafn stemmir, kt fyrri greiðanda) — rekstrarfélag/greiðandaskipti: ⚠, ekki rautt.
  const greidandi = daema({ sale: sala, site, vidhengi: [sk('681299-0099', 'Nýja félagið', Date.now() - 864e5)] });
  if (greidandi.rautt.length || !greidandi.gult.length) villur.push('nýr greiðandi á sama stað varð rautt eða þögult: ' + JSON.stringify(greidandi));
  if (villur.length) { console.log('RED sjálfspróf: ' + villur.join(' · ')); process.exit(1); }
  console.log('✅ sjálfspróf: rétt skýrsla → grænt · gömul kt+nafn → 2 rauð (án kúnnagagna í úttaki) · leyst af hólmi → grænt · 5 tæki á móti 2 → rautt · nýr greiðandi á sama stað → ⚠ ekki rautt.');
  process.exit(0);
}

async function get(slod) {
  const ut = [];
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/${slod}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${fra}-${fra + 999}` } });
    if (!r.ok && r.status !== 206) throw new Error(slod.split('?')[0] + ' HTTP ' + r.status);
    const hluti = await r.json();
    if (!Array.isArray(hluti)) return hluti;
    ut.push(...hluti);
    if (hluti.length < 1000) return ut;
  }
}
const inn = (ids) => 'in.(' + [...new Set(ids.filter((x) => x != null))].join(',') + ')';

(async () => {
  const nu = new Date().getFullYear();
  let solur, kredit, st;
  try {
    solur = await get('solur?select=id,num,customer_id,customer_kt,customer_nafn,customer_base_id,created_at,linur,krafa_note,source' +
      '&status=eq.final&is_credit=is.false&hidden=not.is.true&dk_invoice_id=is.null&invoiced_at=is.null&krafa_sent_at=is.null' +
      '&source=in.(uttekt,vinnublad)&customer_id=not.is.null&created_at=gte.' + (nu - 1) + '-01-01&order=id');
    kredit = await get('solur?select=credit_of&is_credit=is.true&credit_of=not.is.null');
    st = await get('app_settings?id=eq.1&select=att:settings->company_attachments,vb:settings->vidbot_uttekt');
  } catch (e) {
    console.log('RED: náði ekki í gögn (' + String((e && e.message) || e).slice(0, 80) + ') — vörðurinn getur ekki dæmt.');
    process.exit(1);
  }
  const att = (st && st[0] && st[0].att) || {};
  const vb = (st && st[0] && st[0].vb) || {};
  if (Object.keys(att).length < 50) {
    console.log('RED: aðeins ' + Object.keys(att).length + ' staðir með viðhengi lásust (hundruð eru til) — RLS, þak eða lykill? Vörðurinn getur ekki dæmt.');
    process.exit(1);
  }
  const kreditud = new Set(kredit.map((k) => String(k.credit_of)));
  const osendar = solur.filter((s) => !kreditud.has(String(s.id)));
  if (!osendar.length) { console.log('✅ GRÆNT skýrsla fylgir sölu: engin ósend úttektarsala til að dæma.'); process.exit(0); }

  const coIds = osendar.map((s) => s.customer_id), baseIds = osendar.map((s) => s.customer_base_id);
  const [stadir, greidendur, facts, skjol] = await Promise.all([
    get('fyrirtaeki?select=id,nafn,kennitala,skyrsla_med_krofu&id=' + inn(coIds)),
    baseIds.some((x) => x != null) ? get('customers_base?select=id,nafn,kennitala&id=' + inn(baseIds)) : [],
    get('arsskodun_report_facts?select=fyrirtaeki_id,total_devices,report_year,parsed_at&fyrirtaeki_id=' + inn(coIds)),
    get('customer_documents?select=fyrirtaeki_id,notes,year,doc_date,storage_path,created_at&doc_type=in.(uttektarskyrsla,uttektarsk%C3%BDrsla)&storage_path=not.is.null&fyrirtaeki_id=' + inn(coIds) + '&order=created_at.desc'),
  ]).catch((e) => { console.log('RED: náði ekki í staði/greiðendur/tölur (' + String((e && e.message) || e).slice(0, 80) + ')'); process.exit(1); });
  const eftirId = (rows, k) => { const m = new Map(); (rows || []).forEach((r) => { if (!m.has(String(r[k]))) m.set(String(r[k]), r); }); return m; };
  const S = eftirId(stadir, 'id'), B = eftirId(greidendur, 'id');

  const rautt = [], gult = [];
  let dæmdar = 0;
  for (const s of osendar) {
    const site = S.get(String(s.customer_id)) || null;
    if (site && site.skyrsla_med_krofu === false) continue;
    const arS = String(new Date(s.created_at).getFullYear());
    const vidhengi = att[String(s.customer_id)] || [];
    const f = (facts || []).find((x) => String(x.fyrirtaeki_id) === String(s.customer_id) && String(x.report_year) === arS) || null;
    const d = (skjol || []).find((x) => String(x.fyrirtaeki_id) === String(s.customer_id) && String(x.year) === arS);
    const skjal = d ? { name: d.notes || '', storage_path: d.storage_path, year: String(d.year), doc_date: d.doc_date, uppruni: 'skjal' } : null;
    const lst = vb[String(s.customer_id)] && vb[String(s.customer_id)].sala_nums;
    const erVb = /^Viðbótarúttekt við /.test(String(s.krafa_note || '')) || (Array.isArray(lst) && lst.map(String).indexOf(String(s.num)) >= 0);
    const r = daema({ sale: s, site, base: B.get(String(s.customer_base_id)) || null, facts: f, vidhengi, skjal, vidbot: erVb });
    dæmdar++;
    rautt.push(...r.rautt); gult.push(...r.gult);
  }
  gult.forEach((g) => console.log('  ⚠ ' + g));
  if (rautt.length) {
    console.log('RED: ' + rautt.length + ' atriði — ósend sala ber skýrslu sem stemmir ekki við hana (' + dæmdar + ' ósendar úttektarsölur dæmdar):');
    rautt.forEach((x) => console.log('  ✖ ' + x));
    console.log('  Lagfæring: opna staðinn → „Búa til úttektarskýrslu" (eða „📄 Búa til nýja skýrslu" í sendiglugganum). Ný skýrsla fær nafn og kt sölunnar; sú gamla er merkt leyst af hólmi.');
    process.exit(1);
  }
  console.log('✅ GRÆNT skýrsla fylgir sölu: ' + dæmdar + ' ósendar úttektarsölur — skýrslan stemmir við söluna (kt, nafn, staður, tæki)' + (gult.length ? ' · ' + gult.length + ' ⚠' : '') + '.');
  process.exit(0);
})();
