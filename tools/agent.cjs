#!/usr/bin/env node
/* Agent-stýribókin — lestu hvaða agentar eru til, og SKRIFAÐU í þá.
 *
 * Agnar 30.09.2026: „reyna kannski að tvinna agentana betur inn í verklagið svo
 * það sé oftar uppfært þá og þeir notaðir."
 *
 * Systir `tools/minni.cjs`. Sama hugsun: uppfærsla sem tekur eina skipun gerist;
 * uppfærsla sem krefst þess að opna skrá, finna réttan kafla og orða hann
 * gerist ekki. Vörðurinn `tools/audit-agentar.cjs` fellur þegar agent vísar í
 * horfna skrá eða dregst aftur úr því sem hann gætir.
 *
 *   node tools/agent.cjs                      # listi + hversu ferskir
 *   node tools/agent.cjs <nafn>               # hvað agentinn gætir
 *   node tools/agent.cjs --skra "<lærdómur>" --agent <nafn> [--skrar "a.js,b.js"]
 *
 * --skra bætir dagsettri línu neðst í „## Lærdómur"-kaflann (býr hann til ef
 * hann vantar). Það telst snerting á skránni, svo vörðurinn róast — en aðeins
 * af því að eitthvað RAUNVERULEGT var skrifað.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const AGDIR = path.join(ROOT, '.claude', 'agents');
const VISAR = /(js\/patches\/[0-9A-Za-z_\-.]+\.js|netlify\/functions\/[0-9A-Za-z_\-.]+\.js|js\/[0-9A-Za-z_\-.]+\.js|docs\/[0-9A-Za-z_\-.]+\.md|tools\/[0-9A-Za-z_\-.]+\.(cjs|js))/g;

// Sama próf og tools/audit-agentar.cjs — annars kallar annað tólið úlfur þar
// sem hitt þegir, og þá hættir fólk að trúa báðum.
const SYSTIR = path.join(ROOT, '..', 'brunaholf');
const NEITUN = /(er\s+EKKI\s+til|er\s+ekki\s+til|ekki\s+lengur|komst\s+ekki\s+að\s+ýta|finnst\s+ekki|var\s+fjarlæg|hefur\s+verið\s+fjarlæg|horfin)/i;
function fyrirfinnst(v, txt) {
  if (fs.existsSync(path.join(ROOT, v))) return true;
  if (fs.existsSync(path.join(SYSTIR, v))) return true;
  const i = txt.indexOf(v);
  return i >= 0 && NEITUN.test(txt.slice(Math.max(0, i - 260), i + 260));
}

const git = (a) => { try { return execSync('git ' + a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) { return ''; } };
const commitTs = (rel) => { const s = git(`log -1 --format=%ct -- "${rel}"`); return s ? +s * 1000 : 0; };
const dags = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '—');
const idag = () => new Date().toISOString().slice(0, 10).split('-').reverse().join('.');

const arg = process.argv.slice(2);
const flagg = (n) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : null; };

if (!fs.existsSync(AGDIR)) { console.error('Engin .claude/agents mappa.'); process.exit(1); }
const allir = fs.readdirSync(AGDIR).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

function lesa(nafn) {
  const p = path.join(AGDIR, nafn + '.md');
  if (!fs.existsSync(p)) { console.error('Enginn agent: ' + nafn + '\nTil: ' + allir.join(', ')); process.exit(1); }
  return { p, rel: '.claude/agents/' + nafn + '.md', txt: fs.readFileSync(p, 'utf8') };
}

// ── SKRIFA ────────────────────────────────────────────────────────────────
if (arg.includes('--skra')) {
  const laerdomur = flagg('--skra');
  const nafn = flagg('--agent');
  if (!laerdomur || !nafn) {
    console.error('Vantar: --skra "<lærdómur>" --agent <nafn>\nTil: ' + allir.join(', '));
    process.exit(1);
  }
  const { p, txt } = lesa(nafn);
  const aukaSkrar = (flagg('--skrar') || '').split(',').map((s) => s.trim()).filter(Boolean);

  // Vara við áður en skrifað er í agent sem vísar á horfna skrá — þá er
  // lærdómurinn líklega um einmitt það.
  const vantar = [...new Set(txt.match(VISAR) || [])].filter((v) => !fyrirfinnst(v, txt));

  let ny = txt.replace(/\s*$/, '\n');
  const HAUS = '\n## Lærdómur\n';
  if (!/\n## Lærdómur\n/.test(ny)) ny += HAUS;
  ny += '\n- **' + idag() + '** — ' + laerdomur.trim() +
    (aukaSkrar.length ? ' (' + aukaSkrar.join(', ') + ')' : '') + '\n';

  fs.writeFileSync(p, ny, 'utf8');
  console.log('✍  Skráð í ' + nafn + ': ' + laerdomur.trim().slice(0, 70));
  if (vantar.length) {
    console.log('⚠  ATH — ' + nafn + ' vísar enn í skrár sem eru ekki til: ' + vantar.join(', '));
    console.log('   Vörðurinn fellur á því þar til slóðin er lagfærð eða tekin út.');
  }
  process.exit(0);
}

// ── EINN AGENT ────────────────────────────────────────────────────────────
if (arg[0] && !arg[0].startsWith('--')) {
  const nafn = arg[0];
  const { rel, txt } = lesa(nafn);
  const agTs = commitTs(rel);
  const visad = [...new Set(txt.match(VISAR) || [])];
  const lysing = (txt.match(/^description:\s*(.+)$/m) || [])[1] || '';
  console.log('# ' + nafn + '  (uppf ' + dags(agTs) + ')\n');
  console.log(lysing.slice(0, 400) + '\n');
  console.log('Gætir ' + visad.length + ' skráa:');
  visad.forEach((v) => {
    const til = fyrirfinnst(v, txt);
    const t = til ? commitTs(v) : 0;
    console.log('  ' + (til ? (t > agTs ? '⚠' : '·') : '✗') + ' ' + v.padEnd(46) + (til ? dags(t) : 'ER EKKI TIL'));
  });
  process.exit(0);
}

// ── LISTI ─────────────────────────────────────────────────────────────────
console.log('# Agentar (' + allir.length + ')\n');
console.log('  ⚠ = skrá hefur breyst síðan agentinn var uppfærður · ✗ = skráin er ekki til\n');
for (const nafn of allir) {
  const { rel, txt } = lesa(nafn);
  const agTs = commitTs(rel);
  const visad = [...new Set(txt.match(VISAR) || [])];
  const vantar = visad.filter((v) => !fyrirfinnst(v, txt));
  const breytt = visad.filter((v) => fs.existsSync(path.join(ROOT, v)) && commitTs(v) > agTs);
  console.log(
    '  ' + (vantar.length ? '✗' : breytt.length ? '⚠' : '·') + ' ' +
    nafn.padEnd(16) + ' uppf ' + dags(agTs) +
    ' · gætir ' + String(visad.length).padStart(3) +
    (breytt.length ? ' · ' + breytt.length + ' breyttar' : '') +
    (vantar.length ? ' · ' + vantar.length + ' DAUÐAR' : '')
  );
}
console.log('\n  node tools/agent.cjs <nafn>                          # hvað hann gætir');
console.log('  node tools/agent.cjs --skra "..." --agent <nafn>     # skrifa lærdóm');
