#!/usr/bin/env node
/* VÖRÐUR — nýjar og ómerktar Þjónustugáttir eiga að opnast í Premium-útlitinu.
 *
 * Geymd theme-gildi mega áfram velja önnur þemu. Vörðurinn læsir aðeins öllum
 * sjálfgefnum leiðum svo ný gátt, demo, opin gátt og innskráning reki ekki í sundur.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['gatt/index.html', /<html\b[^>]*\bdata-theme="premium"/, 'HTML-skel'],
  ['gatt/portal.js', /account:\s*\{\s*name:\s*'Center Hótel',\s*theme:\s*'premium'/, 'demo'],
  ['gatt/portal.js', /data\.account\.theme\)\s*\|\|\s*'premium'/, 'framendi'],
  ['gatt-admin/admin.js', /t\.k\s*===\s*'premium'/, 'stjórnborð'],
  ['netlify/functions/gatt-admin.cjs', /display_name:\s*name,\s*theme:\s*'premium'/, 'ný gátt'],
  ['netlify/functions/gatt-status.cjs', /theme:\s*u\.theme\s*\|\|\s*'premium'/, 'opin gátt'],
  ['netlify/functions/gatt.cjs', /\(session\s*&&\s*session\.theme\)\s*\|\|\s*'premium'/, 'gagnasvar'],
  ['netlify/functions/gatt-login.cjs', /u\.theme\s*\|\|\s*'premium'/, 'starfsmannshlekkur'],
  ['netlify/functions/gatt-login.cjs', /\(felag\s*&&\s*felag\.theme\)\s*\|\|\s*'premium'/, 'félagsnotandi'],
  ['netlify/functions/gatt-login.cjs', /user\.theme\s*\|\|\s*'premium'/, 'aðalnotandi'],
  ['gatt/premium-reference.css', /\.premium-topbar\{\s*position:fixed;[\s\S]*?height:38px;/, 'sameiginleg toppslá'],
  ['gatt/premium-reference.css', /#portal header\{\s*position:fixed!important;[\s\S]*?width:126px!important;/, 'hliðarslá'],
  ['gatt/premium-reference.css', /header nav a\.tab\.hidden\{display:none!important\}/, 'faldir heimildaflipar'],
  ['gatt/premium-reference.css', /#portal main\{width:calc\(100% - 126px\)!important;margin-left:126px!important;/, 'meginmál við hliðarslá'],
  ['gatt/premium-reference.css', /#portal header\{position:fixed!important;[\s\S]*?width:110px!important;/, 'hliðarslá á milliskjá'],
  ['gatt/premium-reference.css', /#portal header\{position:fixed!important;[\s\S]*?width:88px!important;/, 'hliðarslá í síma'],
  ['gatt/premium-polish-v2.css', /#portal a\.pdf\{min-width:44px!important;min-height:44px!important\}/, 'nav-snertiflötur'],
  ['gatt/premium-polish-v2.css', /#portal textarea\{min-height:44px!important;font-size:16px!important\}/, 'innsláttarreitir'],
  ['gatt/premium-polish-v2.css', /\.premium-hero\{height:150px!important;min-height:150px!important\}/, 'þéttur símahaus'],
  ['gatt/index.html', /data-dr-tab="brunavarnir"[\s\S]*data-dr-tab="teikningar"[\s\S]*data-dr-tab="verkefni"[\s\S]*data-dr-tab="skodanir"[\s\S]*data-dr-tab="skjol"[\s\S]*data-dr-tab="reikningar"/, 'sex eignaundirsíður'],
  ['gatt/portal.js', /function drVeljaTab\(tab\)/, 'eignaundirsíðustýring'],
  ['gatt/portal.js', /function drMerkja\(\)/, 'eignagagnaflokkun'],
  ['gatt/portal.js', /b\.eign[\s\S]*mynd[\s\S]*--premium-account-photo/, 'byggingarmynd úr gáttargögnum'],
  ['gatt/premium-hero.css', /background-image:var\(--premium-account-photo,none\)/, 'engin lagerbyggingarmynd'],
  ['gatt/index.html', /class="sidebar-flame"[\s\S]*brunaicon\.png/, 'eldmerki í hliðarslá'],
  ['gatt/index.html', /premium-hero\.css\?v=20261106s/, 'myndhauss-CSS útgáfumerki'],
  ['gatt/index.html', /premium-reference\.css\?v=20261106s/, 'grunn-CSS útgáfumerki'],
  ['gatt/index.html', /premium-polish-v2\.css\?v=20261106s/, 'fínstillingar-CSS útgáfumerki'],
  ['gatt/index.html', /portal\.js\?v=20261106s/, 'gáttar-JS útgáfumerki'],
  ['gatt/portal.js', /midgardur\.jpg/, 'eigin húsmynd Center Hótels'],
  ['gatt/premium-reference.css', /premium-view-photo,[\s\S]*inset:0/, 'húsmynd yfir allan haus'],
  ['gatt/index.html', /premium-hero-flame[\s\S]*brunaicon\.png/, 'eldmerki ofan á húsi'],
  ['gatt/index.html', /id="v-skilabod"[\s\S]*premium-view-hero[\s\S]*skil-layout/, 'skilaboðahaus'],
  ['gatt/portal.js', /function renderSkKpis\(/, 'skýrslu-KPI'],
  ['gatt/portal.js', /className = 'dr-hopp'/, 'eignasíðu-undirsíður'],
  ['gatt-admin/index.html', /admin\.js\?v=20261106bi/, 'stjórnborðs-JS útgáfumerki'],
];

const errors = [];
for (const [file, pattern, label] of checks) {
  if (!pattern.test(read(file))) errors.push(label + ' (' + file + ')');
}

if (errors.length) {
  console.error('❌ Premium er ekki sjálfgefið á öllum leiðum: ' + errors.join(' · '));
  process.exit(1);
}
console.log('✅ Premium er sjálfgefið í Þjónustugátt — ' + checks.length + ' leiðir samhljóða.');
