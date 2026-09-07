#!/usr/bin/env node
/* SKRÁIR LESNA REIKNINGA Í uttekt_reikningur_facts.
 *
 * Inntak: úttak `tools/lesa-reikninga-drive.cjs`.
 * Sjálfgefið ÞURRKEYRSLA — `--keyra` skrifar.
 *
 * VARÚÐARREGLUR (erfðar úr tools/setja-inn-vantandi-2025.cjs, allar lærðar af
 * skaða):
 *   * Lykillinn er REIKNINGSNÚMERIÐ úr PDF-inu. Reikningur sem er þegar til
 *     með sama númeri er ALDREI skrifaður aftur — Drive-afritin ((2)/(3)) og
 *     þær 301 raðir sem fyrir voru mega ekki tvítakast.
 *   * Aðeins ÚTTEKTIR (lína „Skýrslugerð og vottun"). Búðarsölur eiga ekki
 *     heima í tríó-samanburðinum.
 *   * fyrirtaeki_id er leyst af KENNITÖLU. Beri kennitalan marga staði er
 *     röðin EKKI skrifuð blint — hún fer í „óleyst" og bíður staðarvals, því
 *     skjal á röngum stað er verri villa en skjal sem vantar.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const KEYRA = process.argv.includes('--keyra');

async function allar(slod) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(URL_ + '/rest/v1/' + slod + (slod.includes('?') ? '&' : '?') +
      'limit=1000&offset=' + from, { headers: H });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 200));
    const d = await r.json();
    if (!d.length) break;
    out = out.concat(d); if (d.length < 1000) break; from += 1000;
  }
  return out;
}

(async () => {
  const inn = process.argv[2];
  if (!inn) { console.error('Notkun: node tools/skra-reikninga-facts.cjs <lesnir.json> [--keyra]'); process.exit(1); }
  const raw = fs.readFileSync(inn, 'utf8');
  const lesnir = JSON.parse(raw.slice(raw.indexOf('[')));

  const [co, fyrir] = await Promise.all([
    allar('fyrirtaeki?select=id,nafn,kennitala&deleta=is.null'.replace('deleta', 'deleted_at')),
    allar('uttekt_reikningur_facts?select=invoice_number'),
  ]);
  const tilNu = new Set(fyrir.map(x => String(x.invoice_number || '').trim()));

  const perKt = new Map();
  co.forEach(c => {
    const kt = String(c.kennitala || '').replace(/-/g, '');
    if (!kt) return;
    if (!perKt.has(kt)) perKt.set(kt, []);
    perKt.get(kt).push(c);
  });

  const einstakir = new Map();
  lesnir.forEach(x => {
    if (x.villa || !x.uttekt || !x.nr || !x.kt || !x.dags) return;
    if (!einstakir.has(x.nr)) einstakir.set(x.nr, x);
  });

  const skrifa = [], oleyst = [], tilStadar = [], engarLinur = [];
  einstakir.forEach(x => {
    if (tilNu.has(x.nr)) { tilStadar.push(x); return; }
    /* 0 tæki er ekki mæling heldur gloppa: annaðhvort gjaldareikningur (akstur,
       skýrslugerð) eða PDF-snið sem línulesarinn nær ekki. Röð með núlli myndi
       birtast sem frávik í tríóinu og ljúga upp á reikninginn. */
    if (!x.total_devices) { engarLinur.push(x); return; }
    const kt = x.kt.replace(/-/g, '');
    const stadir = perKt.get(kt) || [];
    if (stadir.length !== 1) { oleyst.push({ x, stadir: stadir.length }); return; }
    skrifa.push({
      fyrirtaeki_id: stadir[0].id,
      invoice_number: x.nr,
      invoice_date: x.dags,
      invoice_year: +x.dags.slice(0, 4),
      total_devices: x.total_devices,
      equipment: x.linur.filter(l => l.tegund)
        .reduce((a, l) => (a[l.tegund] = (a[l.tegund] || 0) + l.fjoldi, a), {}),
      heimild: 'drive-lestur-20260907',
    });
  });

  console.log('\nSKRÁNING Í uttekt_reikningur_facts' + (KEYRA ? '  [KEYRSLA]' : '  [ÞURRKEYRSLA]'));
  console.log('  einstakir úttektarreikningar lesnir : ' + einstakir.size);
  console.log('  þegar til (sama reikningsnúmer)     : ' + tilStadar.length);
  console.log("  óleyst (kennitala ber marga staði)  : " + oleyst.length);
  console.log("  engar tækjalínur (sleppt)           : " + engarLinur.length);
  console.log('  TIL SKRÁNINGAR                      : ' + skrifa.length);
  const arSund = {};
  skrifa.forEach(s => { arSund[s.invoice_year] = (arSund[s.invoice_year] || 0) + 1; });
  console.log('  eftir ári: ' + JSON.stringify(arSund));

  if (!KEYRA) {
    console.log('\n  Sýnishorn (5 fyrstu):');
    skrifa.slice(0, 5).forEach(s => console.log('    ' + s.invoice_number + '  ' + s.invoice_date +
      '  fid ' + s.fyrirtaeki_id + '  ' + s.total_devices + ' tæki  ' + JSON.stringify(s.equipment)));
    console.log('\n  Keyrðu með --keyra til að skrifa.\n');
    return;
  }

  let ok = 0, villur = 0;
  for (let i = 0; i < skrifa.length; i += 100) {
    const bunki = skrifa.slice(i, i + 100);
    const r = await fetch(URL_ + '/rest/v1/uttekt_reikningur_facts', {
      method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify(bunki),
    });
    if (r.ok) ok += bunki.length;
    else { villur += bunki.length; console.error('  villa: ' + r.status + ' ' + (await r.text()).slice(0, 200)); }
  }
  console.log('\n  skrifað: ' + ok + '   villur: ' + villur + '\n');
})();
