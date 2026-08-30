#!/usr/bin/env node
'use strict';
/**
 * Slökkvitækjaþjónusta and brunakerfisþjónusta stay independent on the same
 * house. Center Hótel is in BOTH — that is allowed. What is not allowed:
 * filling slökk year ticks from sidasta_ar, painting Brunak. Já from
 * er_i_thjonustu, counting a brunakerfi invoice as úttekt, or merging the
 * 11 hotels into one fyrirtaeki.
 */
const fs = require('fs');
const path = require('path');
const GY = require('../netlify/functions/_gatt-years.cjs');

const root = path.join(__dirname, '..');
const portal = fs.readFileSync(path.join(root, 'gatt/portal.js'), 'utf8');
const gatt = fs.readFileSync(path.join(root, 'netlify/functions/gatt.js'), 'utf8');
const src175 = fs.readFileSync(path.join(root, 'js/patches/175-rekstrarfelog.js'), 'utf8');
const src190 = fs.readFileSync(path.join(root, 'js/patches/190-thjonustu-verkstaedi.js'), 'utf8');

function fail(msg) {
  console.log('RED: ' + msg);
  process.exit(1);
}

// ── helper unit tests ──────────────────────────────────────────────────────
const midgardur = GY.yearsFromDocs({ ar_slokk: ['2023', '2024', '2026'], ar_bru: ['2022', '2024', '2025'] });
if (midgardur[2][0] !== 'no') fail('Miðgarður 2025 slökk must be no (no úttektarskýrsla that year).');
if (midgardur[3][0] !== 'ok') fail('Miðgarður 2026 slökk must be ok.');
if (midgardur[3][1] !== 'no') fail('Miðgarður 2026 brunakerfi must be no.');
if (midgardur[2][1] !== 'ok') fail('Miðgarður 2025 brunakerfi must be ok.');

const plaza = GY.yearsFromDocs({ ar_slokk: ['2023', '2024', '2025'], ar_bru: ['2024', '2025'] });
if (plaza[3][0] !== 'no') fail('Plaza 2026 slökk filled forward — must stay no without a 2026 report.');
if (plaza[3][1] !== 'no') fail('Plaza 2026 brunakerfi must be no.');

const arnar = GY.yearsFromDocs({ ar_slokk: ['2022', '2024', '2025'], ar_bru: ['2024', '2025', '2026'] });
if (arnar[3][0] !== 'no') fail('Arnarhvoll 2026 slökk must be no (brunakerfi report is not an úttekt).');
if (arnar[3][1] !== 'ok') fail('Arnarhvoll 2026 brunakerfi must be ok.');

const hlad = GY.yearsFromDocs({ ar_slokk: [], ar_bru: [] });
if (hlad.some((p) => p[0] === 'ok' || p[1] === 'ok')) fail('Hlaðvarpinn with no docs must not tick either service.');

if (GY.bruInService({ '195': { inspect_month: 9 } }, 195) !== true) fail('bruInService must read numeric fid on the map.');
if (GY.bruInService({ '195': { inspect_month: 9 } }, 1750) !== false) fail('Hlaðvarpinn must not inherit a sister\'s brunakerfi flag.');
if (GY.isUttektInvoiceTeg('brunakerfi') !== false) fail('R-108001 brunakerfi must not count as úttekt.');
if (GY.isUttektInvoiceTeg('bud') !== false) fail('búð invoice must not count as úttekt.');
if (GY.isUttektInvoiceTeg('ovisst') !== true) fail('ovisst must fail-open as úttekt (Hamraborg 7).');
if (GY.isUttektInvoiceTeg('') !== true) fail('untagged invoice must fail-open as úttekt.');

const sibling = [{ fyrirtaeki_id: 198, invoice_number: 'R-000670' }, { fyrirtaeki_id: 195 }];
if (GY.pickDocForSite(sibling, 1750) != null) fail('pickDocForSite must not fall back to arr[0] for a sister-less house.');
if (GY.pickDocForSite(sibling, 195).fyrirtaeki_id !== 195) fail('pickDocForSite must return THIS site\'s row.');
if (GY.pickDocForSite([{ fyrirtaeki_id: null, invoice_number: 'R-1' }], 9, { sitesOnBase: 1 }).invoice_number !== 'R-1') {
  fail('unique-kt orphan (no fid, one site) must still match (fail-open).');
}
if (GY.pickDocForSite([{ fyrirtaeki_id: null, invoice_number: 'R-1' }], 9, { sitesOnBase: 11 }) != null) {
  fail('shared-base orphan must not paint all 11 Center Hotel houses.');
}

// ── source guards ──────────────────────────────────────────────────────────
if (!/require\('\.\/_gatt-years\.cjs'\)/.test(gatt)) fail('gatt.js no longer loads _gatt-years.');
if (!/ar_slokk:/.test(gatt)) fail('gatt.js no longer emits ar_slokk per site.');
if (!/bru_i_thjonustu:/.test(gatt)) fail('gatt.js no longer emits bru_i_thjonustu.');
if (!/brunakerfi_customers/.test(gatt)) fail('gatt.js no longer reads brunakerfi_customers for the Brunak. column.');
if (!/onBoard/.test(gatt)) fail('gatt.js no longer filters the portal to houses in either service.');

if (!/br: !!b\.bru_i_thjonustu/.test(portal)) fail('portal Brunak. column still uses i_thjonustu (slökk in-service).');
if (/Number\(y\) <= cur/.test(portal)) fail('portal still fills slökk ticks forward from sidasta_ar.');
if (!/ar_slokk/.test(portal)) fail('portal yearsFromStatus no longer reads ar_slokk.');
if (!/Kerfi:/.test(portal) || !/Tæki:/.test(portal)) fail('portal next-inspection no longer splits Tæki vs Kerfi.');

if (/x\.inService \|\| Object\.keys\(x\.years/.test(src175)) {
  fail('175 hero still counts a brunakerfi PDF as membership — stray docs would add a 10th Center Hotel fire system.');
}
if (!/bruInSvc\) nBruSvc\+\+/.test(src175)) {
  fail('175 footer still counts bHasData as brunakerfisþjónusta.');
}
if (!/er_i_thjonustu/.test(src175)) fail('175 live sites no longer carry er_i_thjonustu — Þverholt 14 would look like a hotel.');
if (!/ekki í slökkþjónustu/.test(src175)) fail('175 no longer labels out-of-slökk sites (Þverholt 14).');

if (/\|\| arr\[0\]/.test(src190)) fail('190 pick fell back to arr[0] — sibling bleed on Center Hótel / Heimaleiga.');
if (!/isUttektInvoiceTeg/.test(src190)) fail('190 no longer filters brunakerfi invoices off the slökk board.');
if (!/_pdByCo/.test(src190)) fail('190 Payday pill is no longer per fyrirtaeki_id.');

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

async function pageAll(pathAndQuery) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` }
    });
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    out.push(...b);
    if (b.length < 1000) break;
  }
  return out;
}

(async () => {
  const center = await pageAll('fyrirtaeki?kennitala=eq.450905-1430&deleted_at=is.null&select=id,nafn,er_i_thjonustu,stadur_nr');
  if (center.length < 11) fail(`Center Hótel has ${center.length} sites — expected 11. Do not merge the hotels.`);
  const ids = new Set(center.map((x) => x.id));
  if (ids.size !== center.length) fail('Center Hótel duplicate fyrirtaeki.id — sites were folded.');

  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th');
  const need = [
    [195, 'arnarhvoll'],
    [197, 'grandi'],
    [1750, 'hladvarp'],
    [196, 'klopp'],
    [201, 'laugavegur'],
    [192, 'midgard'],
    [193, 'plaza'],
    [198, 'skjaldbreid'],
    [199, 'thingholt'],
    [200, 'apart'],
    [1627, 'thverholt'],
  ];
  need.forEach((pair) => {
    const row = center.find((x) => x.id === pair[0]);
    if (!row) fail('Center Hótel missing fid ' + pair[0] + ' (' + pair[1] + ') — do not merge.');
    if (fold(row.nafn).indexOf(pair[1]) < 0) {
      fail('fid ' + pair[0] + ' renamed away from ' + pair[1] + ': ' + row.nafn);
    }
  });
  const thver = center.find((x) => x.id === 1627);
  if (thver && thver.er_i_thjonustu !== false) {
    fail('Þverholt 14 is back in slökk service — it is the booking office, not a hotel.');
  }

  const docs = await pageAll('customer_documents?fyrirtaeki_id=in.(195,197,1750,196,201,192,193,198,199,200,1627)&doc_type=in.(uttektarskyrsla,brunakerfi)&is_duplicate=eq.false&select=fyrirtaeki_id,doc_type,year');
  function years(fid, type) {
    return docs.filter((d) => d.fyrirtaeki_id === fid && d.doc_type === type && d.year != null).map((d) => String(d.year));
  }
  const plazaTicks = GY.yearsFromDocs({ ar_slokk: years(193, 'uttektarskyrsla'), ar_bru: years(193, 'brunakerfi') });
  if (plazaTicks[3][0] !== 'no') fail('Live Plaza has no 2026 úttektarskýrsla — gátt must not tick slökk \'26.');
  const arnarTicks = GY.yearsFromDocs({ ar_slokk: years(195, 'uttektarskyrsla'), ar_bru: years(195, 'brunakerfi') });
  if (arnarTicks[3][0] !== 'no') fail('Live Arnarhvoll 2026 slökk tick would steal the brunakerfi report.');
  if (arnarTicks[3][1] !== 'ok') fail('Live Arnarhvoll 2026 brunakerfi report missing from ar_bru.');
  const hladDocs = years(1750, 'brunakerfi').concat(years(1750, 'uttektarskyrsla'));
  if (hladDocs.length) fail('Hlaðvarpinn unexpectedly has service docs — check before treating it as empty.');

  const grandiInv = await pageAll('customer_documents?fyrirtaeki_id=eq.197&doc_type=eq.reikningur&year=eq.2026&select=invoice_number,vidskiptategund');
  const r108 = grandiInv.find((d) => /108001/.test(String(d.invoice_number || '')));
  if (r108 && GY.isUttektInvoiceTeg(r108.vidskiptategund)) {
    fail('Grandi R-108001 is tagged such that 190 would count it as úttekt.');
  }

  console.log('Center Hótel sites: ' + center.length + ' (ids ' + center.map((x) => x.id).sort((a, b) => a - b).join(',') + ')');
  console.log('Plaza 2026 slökk tick: ' + plazaTicks[3][0] + ' · Arnarhvoll 2026: sl=' + arnarTicks[3][0] + ' br=' + arnarTicks[3][1]);
  console.log('GREEN: slökk and brunakerfi stay independent per fyrirtaeki_id (11 Center Hotel houses, not one mesh).');
})().catch((e) => fail(String((e && e.message) || e)));
