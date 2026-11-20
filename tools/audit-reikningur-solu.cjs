#!/usr/bin/env node
/*
 * audit-reikningur-solu.cjs — PDF-afrit reiknings á að stemma við SÖLUNA, og kreditfærður reikningur má aldrei vera
 * „reikningur ársins".  17.11.2026
 *
 * Agnar 17.11.2026 (skjámynd): „það er ennþá vitlaus kennitala á bölv reikningnum“. Það sem opnaðist var PDF-afrit
 * kreditfærða reikningsins á gömlu kennitölunni: parið (document_pairs, fyrsti reikningur ársins á staðnum) hélt honum
 * eftir að nýr var gerður. Þessi vörður sýnir það DAGINN sem það gerist.
 *
 * DÓMURINN er ekki skrifaður hér: hann er js/patches/517-reikningur-solu.js (velja + bera + kreditMap) — sama skrá og
 * vafrinn keyrir (þjónsafritið netlify/functions/_reikningur-solu.cjs er eins, test/reikningur-pdf-fylgir-solu.test.cjs).
 *
 *   RAUTT  ósend reikningssala (greitt_med reikningur) ber PDF-afrit á ANNARRI kt eða ÖÐRU R-númeri en salan.
 *          Lagfæring: Kröfu yfirlit → Senda kröfu → „🧾 Endurgera PDF-afrit úr sölunni" (eða breyta sölunni í ritlinum —
 *          517 endurgerir sjálfkrafa). Gamla afritið er merkt leyst af hólmi, engu eytt.
 *   ⚠      ósend: upphæð afritsins víkur frá sölunni, eða ekkert afrit (482 varðhundurinn býr það til);
 *          pör (document_pairs) sem benda á kreditfærðan reikning — fyrirtækjaspjaldið (199) sýnir þá gildan reikning
 *          og skiptir sjálft þegar einn gildur er til; annars bíður parið þess að nýr reikningur verði til.
 *
 * Úttakið fer í opinber CI-logg: aðeins auðkenni (R-númer, sala, staður) — aldrei kennitala né nafn.
 * Keyrsla:  node tools/audit-reikningur-solu.cjs  (--profa: sjálfpróf án nets). Read-only. Publishable-lykill.
 */
'use strict';
const path = require('path');
const RS = require(path.join(__dirname, '..', 'netlify', 'functions', '_reikningur-solu.cjs'));

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const SVID = { kt: 'PDF-afritið er á aðra kennitölu en salan', rnum: 'PDF-afritið er annar reikningur (R-númer)', upphaed: 'upphæð PDF-afritsins víkur frá sölunni',
  nafn: 'nafnið á PDF-afritinu víkur frá sölunni', vantar: 'ekkert PDF-afrit vistað', kredit: 'reikningurinn er kreditfærður' };

function daema(sale, vidhengi, skjol, kredit) {
  const pdf = RS.velja(sale, vidhengi || [], skjol || []);
  const d = RS.bera(sale, pdf, { kredit: kredit || null });
  const merki = sale.num + ' (sala ' + sale.id + ', staður #' + sale.customer_id + ')';
  return {
    rautt: d.misraemi.filter((m) => m.stodvar).map((m) => merki + ': ' + (SVID[m.svid] || m.svid)),
    gult: d.misraemi.filter((m) => !m.stodvar && m.svid !== 'nafn').map((m) => merki + ': ' + (SVID[m.svid] || m.svid)),
  };
}

if (process.argv.includes('--profa')) {
  const sala = { id: 1, num: 'R-900001', customer_id: 9, customer_kt: '691299-0079', customer_nafn: 'Nýja félagið ehf', samtals: 1000 };
  const a = (kt, nafn) => ({ id: 'x', kind: 'reikningur', path: 'company_attachments/9/1.pdf', name: nafn + ' - ' + kt + ' - 2026 - R-900001 - #9.pdf' });
  const villur = [];
  if (daema(sala, [a('691299-0079', 'Nýja félagið ehf')], []).rautt.length) villur.push('rétt afrit dæmdist rautt');
  const g = daema(sala, [a('681299-0099', 'Gamla félagið ehf')], []);
  if (!(g.rautt.length === 1 && /kennitölu/.test(g.rautt[0]) && !/681299|Gamla/.test(g.rautt.join(' ')))) villur.push('afrit á gamalli kt varð ekki rautt (eða kúnnagögn í úttaki): ' + JSON.stringify(g));
  if (!daema(sala, [], []).gult.length) villur.push('ekkert afrit varð ekki ⚠');
  if (villur.length) { console.log('RED sjálfspróf: ' + villur.join(' · ')); process.exit(1); }
  console.log('✅ sjálfspróf: rétt afrit → grænt · gömul kt → rautt (án kúnnagagna) · ekkert afrit → ⚠.');
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

(async () => {
  const nu = new Date().getFullYear();
  let solur, kredit, st, docs, pairs;
  try {
    [solur, kredit, st] = await Promise.all([
      get('solur?select=id,num,customer_id,customer_kt,customer_nafn,samtals,created_at,status,krafa_sent_at,invoiced_at,dk_invoice_id' +
        '&status=eq.final&is_credit=is.false&hidden=not.is.true&greitt_med=eq.reikningur&customer_id=not.is.null&created_at=gte.' + (nu - 1) + '-01-01&order=id'),
      get('solur?select=num,credit_of,kredit_a,status,is_credit,samtals&is_credit=is.true'),
      get('app_settings?id=eq.1&select=att:settings->company_attachments'),
    ]);
    [docs, pairs] = await Promise.all([
      get('customer_documents?select=id,invoice_number,storage_path,amount,is_duplicate,doc_type&doc_type=eq.reikningur&year=gte.' + (nu - 1)),
      get('document_pairs?select=id,year,fyrirtaeki_id,invoice_doc_id&invoice_doc_id=not.is.null&year=gte.' + (nu - 1)),
    ]);
  } catch (e) {
    console.log('RED: náði ekki í gögn (' + String((e && e.message) || e).slice(0, 80) + ') — vörðurinn getur ekki dæmt.');
    process.exit(1);
  }
  const att = (st && st[0] && st[0].att) || {};
  if (Object.keys(att).length < 50) { console.log('RED: aðeins ' + Object.keys(att).length + ' staðir með viðhengi lásust — RLS, þak eða lykill? Vörðurinn getur ekki dæmt.'); process.exit(1); }
  if (!solur.length) { console.log('RED: engar reikningssölur lásust — RLS eða lykill?'); process.exit(1); }
  const km = RS.kreditMap(kredit, solur);
  const docsByNr = new Map();
  docs.forEach((d) => { const k = String(d.invoice_number || ''); if (!docsByNr.has(k)) docsByNr.set(k, []); docsByNr.get(k).push(d); });

  const osendar = solur.filter((s) => !km[s.num] && !s.krafa_sent_at && !s.invoiced_at && !s.dk_invoice_id);
  const rautt = [], gult = [];
  for (const s of osendar) {
    const r = daema(s, att[String(s.customer_id)] || [], docsByNr.get(String(s.num)) || []);
    rautt.push(...r.rautt); gult.push(...r.gult);
  }
  // Pör sem benda á kreditfærðan reikning (fyrirtækjaspjaldið sýnti hann áður sem reikning ársins)
  const docNr = new Map(docs.map((d) => [String(d.id), String(d.invoice_number || '')]));
  const parKredit = pairs.filter((p) => { const n = docNr.get(String(p.invoice_doc_id)); return n && km[n]; });
  parKredit.forEach((p) => gult.push('par #' + p.id + ' (' + p.year + ', staður #' + p.fyrirtaeki_id + '): reikningur parsins ' + docNr.get(String(p.invoice_doc_id)) + ' er kreditfærður með ' + km[docNr.get(String(p.invoice_doc_id))]));

  gult.forEach((g) => console.log('  ⚠ ' + g));
  if (rautt.length) {
    console.log('RED: ' + rautt.length + ' atriði — ósend reikningssala ber PDF-afrit sem stemmir ekki við hana (' + osendar.length + ' ósendar dæmdar):');
    rautt.forEach((x) => console.log('  ✖ ' + x));
    console.log('  Lagfæring: Kröfu yfirlit → Senda kröfu → „🧾 Endurgera PDF-afrit úr sölunni". Gamla afritið er merkt leyst af hólmi.');
    process.exit(1);
  }
  console.log('✅ GRÆNT reikningur fylgir sölu: ' + osendar.length + ' ósendar reikningssölur — PDF-afritið stemmir við söluna (R-númer, kt)' + (gult.length ? ' · ' + gult.length + ' ⚠' : '') + '.');
  process.exit(0);
})();
