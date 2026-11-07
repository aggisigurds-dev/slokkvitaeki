#!/usr/bin/env node
'use strict';
/* Verkferlis-yfirlitið úr skipanalínu — SAMA fall og /api/combo-yfirlit (07.11.2026).
 *
 *   node tools/combo-yfirlit.cjs                 # allt, læsilegt
 *   node tools/combo-yfirlit.cjs --json          # hrátt JSON
 *   node tools/combo-yfirlit.cjs --flokkur krofur
 *   node tools/combo-yfirlit.cjs --skrifa        # uppfærir málið á Þjónustuborði Agnars
 *
 * Af hverju sama fall og ekki ný mæling: tvö mælikerfi um sama hlutinn stangast alltaf
 * á að lokum. Þetta tól er VIÐMÓT, ekki mæling — það les netlify/functions/combo-yfirlit.cjs.
 * Lyklarnir eru lesnir úr C:\Users\Slokkvitaeki\luna-bridge\.env og eru ALDREI prentaðir.
 */
const fs = require('fs');
const path = require('path');

const ENV = path.join(process.env.USERPROFILE || process.env.HOME || '', 'luna-bridge', '.env');
try {
  fs.readFileSync(ENV, 'utf8').split(/\r?\n/).forEach((l) => {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (_) { /* umhverfið getur verið sett utanfrá */ }

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('RED: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY vantar (leitaði í ' + ENV + ')');
  process.exit(1);
}
// _portal.cjs krefst JWT_SECRET fyrir envReady(); dbReady() þarf hann ekki, en modúllinn
// les hann við load — settu staðgengil svo lesturinn falli ekki. Hann er aldrei notaður hér.
process.env.PORTAL_JWT_SECRET = process.env.PORTAL_JWT_SECRET || 'cli-ekki-notad';

const fn = require(path.join(__dirname, '..', 'netlify', 'functions', 'combo-yfirlit.cjs'));

const arg = (n, sj) => { const i = process.argv.indexOf('--' + n); return i > -1 ? (process.argv[i + 1] || '1') : sj; };
const hefur = (n) => process.argv.includes('--' + n);

const kr = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';

(async () => {
  const qs = {};
  if (arg('flokkur')) qs.flokkur = arg('flokkur');
  if (hefur('skrifa')) qs.skrifa = '1';
  qs.radir = arg('radir', '5');
  const r = await fn.handler({ httpMethod: 'GET', queryStringParameters: qs });
  const j = JSON.parse(r.body);
  if (hefur('json')) { console.log(JSON.stringify(j, null, 2)); return; }
  if (!j.ok) { console.log('RED: ' + (j.error || 'óþekkt villa')); process.exitCode = 1; return; }

  const s = j.samantekt;
  console.log('VERKFERLIS-YFIRLIT — mælt ' + j.maelt_kl.replace('T', ' ').slice(0, 16) + ' (' + j.ms + ' ms)');
  console.log('  ' + s.maelt + ' mælingar · ' + s.nytt_fra_grunnlinu + ' yfir grunnlínu · '
    + s.omaelt + ' ÓMÆLDAR' + (s.omaelt ? ' (' + s.omaeldir_lyklar.join(', ') + ')' : ''));
  let fl = null;
  j.linur.forEach((l) => {
    if (l.flokkur !== fl) { fl = l.flokkur; console.log('\n[' + fl.toUpperCase() + ']'); }
    if (l.merki === 'OMAELT') { console.log('   ? ' + l.heiti + ': ÓMÆLT' + (l.villa ? ' — ' + l.villa : '')); return; }
    console.log('   ' + (l.nytt > 0 ? '✗' : '✓') + ' ' + l.heiti + ': ' + l.tala + ' (þak ' + l.thak + ')'
      + (l.nytt > 0 ? '  ← ' + l.nytt + ' NÝ' : '')
      + (l.peningur ? '  ' + kr(l.peningur) + (l.peningur_allt ? '' : ' af ' + l.peningur_af + ' röðum') : ''));
  });
  const d = j.dagskra || {};
  console.log('\n[DAGSKRÁ] ' + (d.merki === 'MAELT' ? (d.naestu_dagar || []).length + ' bókaðir dagar framundan' : 'ÓMÆLD — ' + d.skyring));
  (d.naestu_dagar || []).forEach((x) => console.log('   ' + x.dags + ' · ' + x.hver + ': ' + x.texti.replace(/\s*\n\s*/g, ' / ')));
  if (d.checklistar_opnir) console.log('   opnir checklistar: ' + d.checklistar_opnir.length + ' atriði');
  if (j.bord) console.log('\n[BORÐ] mál #' + j.bord.mal_id + ' — ' + j.bord.adgerd);
})().catch((e) => { console.log('RED: ' + e.message); process.exitCode = 1; });
