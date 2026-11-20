#!/usr/bin/env node
/*
 * endurspilun-skyrsla-solu.cjs — keyrir ALLAR úttektar-/vinnublaðssölur ársins (sendar og ósendar) gegnum GAMLA
 * skýrsluvalið (findReportPdf í payday-push fyrir 17.11.2026, frosið afrit hér að neðan) og NÝJU regluna
 * (netlify/functions/_skyrsla-solu.cjs velja + bera, eins og payday-push notar hana) og sýnir HVERN mun.
 *
 * Af hverju (óháð rýni 17.11.2026): fyrsta útgáfa nýju reglunnar valdi Drive-viðhengi (ekki sækjanlegt) og sleppti
 * þá skjalaröð ársins — 4 sendar sölur hefðu farið út án skýrslu. Þessi skrifta sýnir svart á hvítu að eini munurinn
 * sé sá sem ætlaður er: sölur þar sem staðurinn sjálfur skipti um kt OG nafn stöðvast (með „senda samt").
 *
 * Úttakið: aðeins R-númer, sölu-id, staður-id og flokkur munar — aldrei kt eða nöfn (CI/logg geta verið opinber).
 * Keyrsla: node tools/endurspilun-skyrsla-solu.cjs [--ar=2026] [--json]
 * Read-only. Publishable-lykill (sami og audit-afslattur-hopur).
 */
'use strict';
const path = require('path');
const SS = require(path.join(__dirname, '..', 'netlify', 'functions', '_skyrsla-solu.cjs'));
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const AR = (process.argv.find((a) => a.startsWith('--ar=')) || '--ar=' + new Date().getFullYear()).split('=')[1];

// ── GAMLA valið, frosið (payday-push findReportPdf fyrir 0d902321) ─────────────────────────────────
function gamlaValid(sale, list, docsFyrirAr) {
  const year = String(new Date(sale.created_at).getFullYear());
  const annadKerfi = (a) => /brunakerfi|brunavi[ðd]v[öo]run|sl[öo]kkvikerfi/i.test(String((a && a.name) || ''));
  let p = null;
  if (Array.isArray(list)) {
    const hit = list.find((a) => a && a.kind === 'skyrsla' && !annadKerfi(a) && String(a.year || '') === year)
      || list.find((a) => a && a.kind === 'skyrsla' && !annadKerfi(a));
    if (hit && hit.path) p = hit.path;
  }
  if (!p) { const cd = docsFyrirAr; if (cd && cd.storage_path) p = cd.storage_path; }
  return p;
}
const slod = (p) => (p ? String(p).replace(/^\/?(?:samningar\/)+/, '') : null);

async function get(s) {
  const ut = [];
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/${s}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${fra}-${fra + 999}` } });
    if (!r.ok && r.status !== 206) throw new Error(s.split('?')[0] + ' HTTP ' + r.status);
    const h = await r.json(); if (!Array.isArray(h)) return h;
    ut.push(...h); if (h.length < 1000) return ut;
  }
}
const inn = (ids) => 'in.(' + [...new Set(ids.filter((x) => x != null))].join(',') + ')';

(async () => {
  const solur = await get('solur?select=id,num,customer_id,customer_kt,customer_nafn,customer_base_id,created_at,linur,krafa_note,source,dk_invoice_id,krafa_sent_at,invoiced_at' +
    '&status=eq.final&is_credit=is.false&hidden=not.is.true&source=in.(uttekt,vinnublad)&customer_id=not.is.null' +
    '&created_at=gte.' + AR + '-01-01&created_at=lt.' + (+AR + 1) + '-01-01&order=id');
  const kredit = new Set((await get('solur?select=credit_of&is_credit=is.true&credit_of=not.is.null')).map((k) => String(k.credit_of)));
  const st = await get('app_settings?id=eq.1&select=att:settings->company_attachments,vb:settings->vidbot_uttekt');
  const att = (st && st[0] && st[0].att) || {}, vb = (st && st[0] && st[0].vb) || {};
  if (Object.keys(att).length < 50) { console.log('VILLA: of fá viðhengi lásust (' + Object.keys(att).length + ') — RLS/lykill?'); process.exit(1); }
  const coIds = solur.map((s) => s.customer_id), baseIds = solur.map((s) => s.customer_base_id);
  const [stadir, greidendur, facts, skjol] = await Promise.all([
    get('fyrirtaeki?select=id,nafn,kennitala,skyrsla_med_krofu&id=' + inn(coIds)),
    get('customers_base?select=id,nafn,kennitala&id=' + inn(baseIds)),
    get('arsskodun_report_facts?select=fyrirtaeki_id,total_devices,report_year,parsed_at&fyrirtaeki_id=' + inn(coIds)),
    get('customer_documents?select=fyrirtaeki_id,notes,year,doc_date,storage_path,created_at&doc_type=in.(uttektarskyrsla,uttektarsk%C3%BDrsla)&storage_path=not.is.null&fyrirtaeki_id=' + inn(coIds) + '&order=created_at.desc'),
  ]);
  const S = new Map(stadir.map((r) => [String(r.id), r])), B = new Map(greidendur.map((r) => [String(r.id), r]));

  const ut = { ar: AR, alls: 0, sendar: 0, eins: 0, stodvast: [], munur: [], sleppt_stillt_an_skyrslu: 0 };
  for (const s of solur) {
    const site = S.get(String(s.customer_id)) || null;
    if (site && site.skyrsla_med_krofu === false) { ut.sleppt_stillt_an_skyrslu++; continue; }
    ut.alls++; const send = !!(s.dk_invoice_id || s.invoiced_at || s.krafa_sent_at); if (send) ut.sendar++;
    const arS = String(new Date(s.created_at).getFullYear());
    const list = att[String(s.customer_id)];
    const d = skjol.find((x) => String(x.fyrirtaeki_id) === String(s.customer_id) && String(x.year) === arS) || null;
    const skjal = d ? { name: d.notes || '', storage_path: d.storage_path, year: String(d.year), doc_date: d.doc_date, uppruni: 'skjal' } : null;
    const f = facts.find((x) => String(x.fyrirtaeki_id) === String(s.customer_id) && String(x.report_year) === arS) || null;
    const lst = vb[String(s.customer_id)] && vb[String(s.customer_id)].sala_nums;
    const erVb = /^Viðbótarúttekt við /.test(String(s.krafa_note || '')) || (Array.isArray(lst) && lst.map(String).indexOf(String(s.num)) >= 0);

    const gamla = slod(gamlaValid(s, list, d));
    const nySk = SS.velja(s, Array.isArray(list) ? list : [], site, skjal);
    const ny = slod(nySk && (nySk.path || nySk.storage_path));
    const r = SS.bera(s, nySk, { site, base: B.get(String(s.customer_base_id)) || null, facts: f, vidbot: erVb });
    const merki = s.num + ' (sala ' + s.id + ', staður #' + s.customer_id + (send ? ', send' : ', ÓSEND') + (kredit.has(String(s.id)) ? ', kreditfærð' : '') + ')';
    if (r.stodvar && nySk) ut.stodvast.push(merki + ' — ' + r.misraemi.filter((m) => m.stodvar).map((m) => m.svid).join('+'));
    if (gamla === ny) { if (!(r.stodvar && nySk)) ut.eins++; continue; }
    const flokkur = !gamla ? 'gamla: engin skýrsla → ný: skýrsla' : !ny ? 'gamla: skýrsla → ný: ENGIN' : 'önnur skýrsla';
    ut.munur.push(merki + ' — ' + flokkur + (nySk && nySk.uppruni === 'skjal' ? ' (ný úr skjalaröð ársins)' : ''));
  }
  if (process.argv.includes('--json')) { console.log(JSON.stringify(ut, null, 1)); return; }
  console.log('Endurspilun ' + AR + ': ' + ut.alls + ' úttektar-/vinnublaðssölur (' + ut.sendar + ' sendar) · sama skýrsla og áður: ' + ut.eins +
    ' · staðir stilltir án skýrslu: ' + ut.sleppt_stillt_an_skyrslu);
  console.log('Stöðvast með nýju reglunni (' + ut.stodvast.length + '):'); ut.stodvast.forEach((x) => console.log('  ⛔ ' + x));
  console.log('Önnur skýrsla en áður (' + ut.munur.length + '):'); ut.munur.forEach((x) => console.log('  ≠ ' + x));
})().catch((e) => { console.log('VILLA: ' + String((e && e.message) || e)); process.exit(1); });
