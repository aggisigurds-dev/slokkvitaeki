#!/usr/bin/env node
/*
 * endurspilun-reikningur-pdf.cjs — gamla valið á reiknings-PDF á móti nýju reglunni (517), á ÖLLUM sölum ársins.  17.11.2026
 *
 * Read-only. Spurningarnar (stjórnlotan 17.11):
 *   1. Hve margar sölur bera PDF-afrit sem stemmir ekki við söluna (R-númer / kt / upphæð) — sendar og ósendar?
 *   2. Kreditfærðir reikningar með PDF-afrit: gamla kóðanum voru þeir ómerktir alls staðar; nýju merktir.
 *   3. Fyrirtækjaspjaldið (199): parið (document_pairs) hélt „fyrsta reikningi ársins" — hve mörg pör sýndu kreditfærðan
 *      reikning sem reikning ársins, og hve mörg þeirra fá gildan reikning í staðinn (einn gildur til) / bíða?
 *   4. Tölvupóstur (254): gamla valið („fyrsta viðhengi sem ber R-númerið í nafninu") á móti nýja (aðeins afrit sem
 *      stemmir; annars teiknað úr sölunni; kreditfærður → ekkert).
 * Úttak: tölur + R-númer/auðkenni — aldrei kennitala né nafn.  Keyrsla: node tools/endurspilun-reikningur-pdf.cjs [ár]
 */
'use strict';
const path = require('path');
const RS = require(path.join(__dirname, '..', 'netlify', 'functions', '_reikningur-solu.cjs'));
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const AR = Number(process.argv[2]) || new Date().getFullYear();

async function get(slod) {
  const ut = [];
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/${slod}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${fra}-${fra + 999}` } });
    if (!r.ok && r.status !== 206) throw new Error(slod.split('?')[0] + ' HTTP ' + r.status);
    const h = await r.json(); if (!Array.isArray(h)) return h; ut.push(...h); if (h.length < 1000) return ut;
  }
}

(async () => {
  const [solur, kredit, st, docs, pairs] = await Promise.all([
    get(`solur?select=id,num,customer_id,customer_kt,customer_nafn,samtals,greitt_med,krafa_sent_at,invoiced_at,dk_invoice_id,status,is_credit&created_at=gte.${AR}-01-01&created_at=lt.${AR + 1}-01-01&order=id`),
    get('solur?select=num,credit_of,kredit_a,status,is_credit,samtals&is_credit=is.true'),
    get('app_settings?id=eq.1&select=att:settings->company_attachments'),
    get(`customer_documents?select=id,invoice_number,storage_path,drive_file_id,amount,is_duplicate,doc_type,fyrirtaeki_id,year,vidskiptategund,notes&doc_type=eq.reikningur&year=eq.${AR}`),
    get(`document_pairs?select=id,year,fyrirtaeki_id,invoice_doc_id,service_type&year=eq.${AR}`),
  ]);
  const att = (st && st[0] && st[0].att) || {};
  if (Object.keys(att).length < 50 || !solur.length) { console.log('RED: of lítið las (RLS/lykill?)'); process.exit(1); }
  const alls = solur.filter((s) => s.status === 'final' && !s.is_credit);
  const km = RS.kreditMap(kredit, solur);
  const docsByNr = new Map(); docs.forEach((d) => { const k = String(d.invoice_number || ''); (docsByNr.get(k) || docsByNr.set(k, []).get(k)).push(d); });
  const sendur = (s) => !!(s.krafa_sent_at || s.invoiced_at || s.dk_invoice_id);

  // 1 + 4
  const t = { med_pdf: 0, kt: { send: [], osend: [] }, rnum: { send: [], osend: [] }, upphaed: { send: [], osend: [] }, kredit_med_pdf: [], post_gamalt_rangt: [], post_breytist: [] };
  for (const s of alls) {
    const vid = att[String(s.customer_id)] || [];
    const sk = docsByNr.get(String(s.num)) || [];
    const pdf = RS.velja(s, vid, sk);
    if (pdf) t.med_pdf++;
    const kr = km[s.num] || null;
    if (kr && pdf) t.kredit_med_pdf.push(s.num + '→' + kr);
    if (!pdf || kr) {
      // 254 gamla: kreditfærður reikningur fór í póst með vistuðu afriti; nýja: ekkert PDF
      const gamaltK = vid.find((a) => a && a.kind === 'reikningur' && a.name && a.name.indexOf(s.num) >= 0);
      if (kr && gamaltK) t.post_breytist.push(s.num + ' (kreditfærður)');
      continue;
    }
    const d = RS.bera(s, pdf, {});
    for (const m of d.misraemi) if (t[m.svid] && t[m.svid].send) t[m.svid][sendur(s) ? 'send' : 'osend'].push(s.num);
    const gamalt = vid.find((a) => a && a.kind === 'reikningur' && a.name && a.name.indexOf(s.num) >= 0) || null;   // 254 fyrir 17.11
    const nyttNotar = d.stemmir && pdf.uppruni === 'vidhengi' ? pdf : null;                         // 254 eftir: annars teiknað úr sölunni
    if (gamalt) {
      const gd = RS.bera(s, gamalt, {});
      if (!gd.stemmir) t.post_gamalt_rangt.push(s.num);
      if (!nyttNotar || nyttNotar.id !== gamalt.id) t.post_breytist.push(s.num);
    }
  }
  // 3 — pör
  const docById = new Map(docs.map((d) => [String(d.id), d]));
  const parK = [];
  for (const p of pairs) {
    const d = docById.get(String(p.invoice_doc_id)); if (!d || !km[d.invoice_number]) continue;
    const gild = new Set();
    docs.forEach((x) => { if (String(x.fyrirtaeki_id) === String(p.fyrirtaeki_id) && !x.is_duplicate && x.invoice_number && !km[x.invoice_number] && !/\((CANCELLED|CREDIT|AFTURK|KREDIT)\)/i.test(String(x.notes || '')) && !['bud', 'brunakerfi', 'slokkvikerfi', 'vatnsudakerfi'].includes(String(x.vidskiptategund || '').toLowerCase())) gild.add(x.invoice_number); });
    (att[String(p.fyrirtaeki_id)] || []).forEach((a) => { const m = /R-\d{6}/.exec(String(a.name || '')); if (a.kind === 'reikningur' && !a.leyst_af && String(a.year) === String(AR) && m && !km[m[0]]) gild.add(m[0]); });
    parK.push({ par: p.id, stadur: p.fyrirtaeki_id, gamall: d.invoice_number, kredit: km[d.invoice_number], gildir: [...gild] });
  }
  const skipt = parK.filter((x) => x.gildir.length === 1), bida = parK.filter((x) => x.gildir.length === 0), tvir = parK.filter((x) => x.gildir.length > 1);

  const L = (a) => a.length + (a.length ? ' (' + a.slice(0, 12).join(', ') + (a.length > 12 ? ', …' : '') + ')' : '');
  console.log(`Endurspilun reiknings-PDF ${AR} — ${alls.length} lokasölur (ekki kredit), ${t.med_pdf} með PDF-afrit.`);
  console.log(`1. PDF-afrit sem stemmir ekki við söluna:`);
  console.log(`   kt önnur:      sendar ${L(t.kt.send)} · ósendar ${L(t.kt.osend)}`);
  console.log(`   R-númer annað: sendar ${L(t.rnum.send)} · ósendar ${L(t.rnum.osend)}`);
  console.log(`   upphæð víkur:  sendar ${L(t.upphaed.send)} · ósendar ${L(t.upphaed.osend)}`);
  console.log(`2. Kreditfærðir reikningar með PDF-afrit (áður ómerktir, nú „kreditfært"): ${L(t.kredit_med_pdf)}`);
  console.log(`3. Pör sem héldu kreditfærðum reikningi sem reikningi ársins: ${parK.length} — fá gildan í staðinn: ${skipt.length}` +
    (skipt.length ? ' (' + skipt.map((x) => '#' + x.par + ' ' + x.gamall + '→' + x.gildir[0]).join(', ') + ')' : '') +
    ` · bíða nýs reiknings: ${bida.length}` + (bida.length ? ' (' + bida.map((x) => '#' + x.par + ' ' + x.gamall).join(', ') + ')' : '') +
    ` · tvíræð (velja handvirkt): ${tvir.length}` + (tvir.length ? ' (' + tvir.map((x) => '#' + x.par + ' ' + x.gamall + '→' + x.gildir.join('/')).join(', ') + ')' : ''));
  console.log(`4. Tölvupóstur (254): gamla valið hefði sent afrit sem stemmir ekki: ${L(t.post_gamalt_rangt)}; PDF sem breytist með nýju reglunni: ${L(t.post_breytist)}`);
})().catch((e) => { console.log('RED: ' + String((e && e.message) || e).slice(0, 120)); process.exit(1); });
