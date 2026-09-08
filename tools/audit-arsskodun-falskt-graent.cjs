#!/usr/bin/env node
'use strict';
/* FALSKT GRÆNT Á ÁRSSKOÐUN — „Skoðað <ár>" án nokkurrar sönnunar.
 *
 * Af hverju þessi vörður er til (08.09.2026): Austurberg 2, húsfélag (fid 499) bar
 * `last_year_inspected: 2026` og `steps_2026: {uttekt, skyrsla}` — grænt merki á
 * borðinu — en félagið átti enga sölu, engan reikning og enga skýrslu síðan
 * janúar 2021. Stimpillinn kom af úttektarskýrslu sem tilheyrði ÖÐRU húsfélagi
 * (Austurberg 2-4-6, fid 291) og hafði verið tengd á rangan stað.
 *
 * Grænt merki er loforð: „það var farið á staðinn". Sé það rangt fer bílstjórinn
 * ekki, kúnninn er órukkaður og enginn tekur eftir fyrr en ári síðar.
 *
 * HVAÐ TELST SÖNNUN (nóg að EITT haldi):
 *   1. `arsskodun_report_facts.report_year` = árið
 *   2. `customer_documents` úttektarskýrsla með `year` = árið
 *   3. `v_uttekt_ar` fyrir árið (skýrsla EÐA úttektarreikningur)
 *   4. `document_pairs.status = 'klarad'` fyrir árið
 *   5. MANNLEG skráning: `steps_<ár>.uttekt === true` — starfsmaður merkti að
 *      úttektin sjálf væri gerð. Pappírinn getur vantað; heimsóknin stendur.
 *
 * Merking ÁN nokkurs af þessu fimm er óútskýrð og telst hér.
 *
 * BASELINE 6 (mælt 08.09.2026): AFL Starfsgreinafélag (901, steps segir
 * uttekt:false), Bílaverk (674), Granítsteinar (153), Húsf. v/bílageymslu (118)
 * — þau þrjú bera aðeins `reikningur:true` en enginn reikningur er til í
 * kerfinu — og Rekagrandi 5 (727) og Zsazsa Hár 23 (1402) sem bera engin steps.
 * Þau eru þekkt og bíða Agnars. RAUTT ef talan HÆKKAR.
 */
const fs = require('fs');
const path = require('path');

const BASELINE = 6;
const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

async function sb(slod) {
  const r = await fetch(URL_ + '/rest/v1/' + slod, { headers: H });
  if (!r.ok) throw new Error(slod.slice(0, 60) + ' -> ' + r.status);
  return r.json();
}
async function allar(q) {
  let ut = [], f = 0;
  for (;;) {
    const d = await sb(q + (q.indexOf('?') >= 0 ? '&' : '?') + 'offset=' + f + '&limit=1000');
    if (!d.length) break;
    ut = ut.concat(d);
    if (d.length < 1000) break;
    f += 1000;
  }
  return ut;
}

(async () => {
  const AR = new Date().getFullYear();
  const [stillingar, co, facts, docs, va, pairs] = await Promise.all([
    sb('app_settings?select=settings&id=eq.1'),
    allar('fyrirtaeki?select=id,nafn,er_i_thjonustu&deleted_at=is.null'),
    allar('arsskodun_report_facts?select=fyrirtaeki_id,report_year'),
    allar('customer_documents?select=fyrirtaeki_id,year&doc_type=eq.uttektarskyrsla&year=eq.' + AR),
    allar('v_uttekt_ar?select=fyrirtaeki_id,ar&ar=eq.' + AR),
    allar('document_pairs?select=fyrirtaeki_id,year,status&year=eq.' + AR),
  ]);

  const ars = (stillingar[0] && stillingar[0].settings && stillingar[0].settings.arsskodun_customers) || {};
  const N = new Map(co.map(c => [c.id, c]));
  const sonn = new Set();
  facts.forEach(f => { if (+f.report_year === AR && f.fyrirtaeki_id != null) sonn.add(+f.fyrirtaeki_id); });
  docs.forEach(d => { if (d.fyrirtaeki_id != null) sonn.add(+d.fyrirtaeki_id); });
  va.forEach(x => { if (x.fyrirtaeki_id != null) sonn.add(+x.fyrirtaeki_id); });
  pairs.forEach(p => { if (p.fyrirtaeki_id != null && p.status === 'klarad') sonn.add(+p.fyrirtaeki_id); });

  const oskyrt = [];
  Object.keys(ars).forEach(k => {
    const a = ars[k];
    if (!a || +a.last_year_inspected !== AR) return;
    const c = N.get(+k);
    if (!c || c.er_i_thjonustu !== true) return;      // sofandi skráning málar ekkert borð
    if (sonn.has(+k)) return;
    const steps = a['steps_' + AR] || {};
    if (steps.uttekt === true) return;                // mannleg skráning: heimsóknin stendur
    oskyrt.push({ id: +k, nafn: c.nafn, steps: JSON.stringify(steps) });
  });

  oskyrt.sort((a, b) => String(a.nafn).localeCompare(String(b.nafn), 'is'));
  oskyrt.slice(0, 12).forEach(x => console.log('     #' + x.id + ' ' + String(x.nafn).slice(0, 42) + '  steps ' + x.steps));

  if (oskyrt.length > BASELINE) {
    fail(oskyrt.length + ' félög merkt „Skoðað ' + AR + '" án nokkurrar sönnunar (baseline ' + BASELINE
      + '). Nýtt falskt grænt — merkingin lofar heimsókn sem ekkert styður.');
  }
  console.log('OK — ' + oskyrt.length + ' óútskýrð „Skoðað ' + AR + '" (<= baseline ' + BASELINE
    + '); ekkert nýtt falskt grænt.');
})().catch(e => fail('audit sprakk: ' + e.message));
