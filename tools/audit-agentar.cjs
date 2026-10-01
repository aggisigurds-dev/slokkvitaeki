#!/usr/bin/env node
/* Öryggisnet — agentarnir mega ekki vísa í horfnar skrár né dragast aftur úr
 * því sem þeir gæta (2026-09-30).
 *
 * Agnar: „reyna kannski að tvinna agentana betur inn í verklagið svo það sé
 * oftar uppfært þá og þeir notaðir."
 *
 * HVERS VEGNA ÞETTA SKIPTIR MÁLI
 *   Agent sem segir þér að lesa `js/field.js` þegar sú skrá er löngu horfin er
 *   VERRI en enginn agent — hann sendir þig í ranga átt með fullvissu. Og
 *   netvörðurinn, sem á að kveða upp „óhætt að ýta", var 29.09 á eftir á ÖLLUM
 *   átta skrám sem hann gætir. Þá gætir hann kerfis sem er ekki lengur til.
 *
 *   Í þessu repói festist aðeins það sem netið vaktar. Þess vegna er
 *   ferskleiki agentanna hér, ekki í tilmælum.
 *
 * PRÓFAR
 *   A  DAUÐUR VÍSIR — agent nefnir skrá sem er ekki til.  → RAUTT, alltaf.
 *   B  ÚRELTUR — agent-skráin hefur ekki verið snert þótt MARGAR skrár sem hún
 *      vísar í hafi breyst.                                → RAUTT yfir þröskuldi.
 *
 * LAGFÆRING
 *   node tools/agent.cjs --skra "<lærdómur>" --agent <nafn>
 *   skrifar dagsettan lærdóm neðst í agent-skrána og telst þá snerting.
 *
 * Aðeins lestur. Ekkert net.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const AGDIR = path.join(ROOT, '.claude', 'agents');

// Hversu margar breyttar skrár þarf til að agent teljist úreltur.
const THROSKULDUR = 6;

// Agentar sem mega vera úreltir um sinn (tæmdu listann þegar þeir eru uppfærðir).
const THEKKT_URELT = {};

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

const git = (a) => { try { return execSync('git ' + a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) { return ''; } };
const commitTs = (rel) => { const s = git(`log -1 --format=%ct -- "${rel}"`); return s ? +s * 1000 : 0; };
const dags = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '—');

// Slóðir sem agent-skrá getur vísað í. Aðeins raunverulegar kóðaslóðir —
// ekki hvaða orð sem er sem inniheldur skástrik.
const VISAR = /(js\/patches\/[0-9A-Za-z_\-.]+\.js|netlify\/functions\/[0-9A-Za-z_\-.]+\.(?:js|cjs)|js\/[0-9A-Za-z_\-.]+\.js|docs\/[0-9A-Za-z_\-.]+\.md|tools\/[0-9A-Za-z_\-.]+\.(?:cjs|js))/g;

// Systur-repóið. Agentarnir þjóna báðum öppunum og vísa réttilega í skrár
// þar — `netlify/functions/company-mail.js` er í Brunahólfi, ekki hér.
// CI klónar það í ../brunaholf (sjá .github/workflows/audit.yml) því
// Actions hefur ekki möppuna við hliðina eins og vélarnar fjórar.
// Ekki inn í tréð — þá telur audit-vafrastada Brunahólf með hér.
function finnaSystur() {
  const frambod = [
    process.env.BRUNAHOLF_ROOT,
    path.join(ROOT, '..', 'brunaholf'),
    path.join(ROOT, '.sister', 'brunaholf'),
  ].filter(Boolean);
  return frambod.find((p) => fs.existsSync(path.join(p, 'docs'))) || frambod[1];
}
const SYSTIR = finnaSystur();

// Agent sem SEGIR að skrá sé horfin er að leiðrétta, ekki að villa um. `kort`
// byrjar á „js/field.js er EKKI til" — það er staðreyndin sjálf og má ekki
// falla. Vörður sem kallar úlfur verður hunsaður, og þá er hann verri en enginn.
const NEITUN = /(er\s+EKKI\s+til|er\s+ekki\s+til|ekki\s+lengur|komst\s+ekki\s+að\s+ýta|finnst\s+ekki|var\s+fjarlæg|hefur\s+verið\s+fjarlæg|horfin)/i;

function fyrirfinnst(v, txt) {
  if (fs.existsSync(path.join(ROOT, v))) return true;
  if (fs.existsSync(path.join(SYSTIR, v))) return true;          // í Brunahólfi
  // Nefnd í sömu málsgrein og neitun? Þá er hún skjalfest sem horfin.
  const i = txt.indexOf(v);
  if (i >= 0 && NEITUN.test(txt.slice(Math.max(0, i - 260), i + 260))) return true;
  return false;
}

if (!fs.existsSync(AGDIR)) {
  console.log('✅ GRÆNT agentar: engin .claude/agents mappa — ekkert að verja.');
  process.exit(0);
}

const skrar = fs.readdirSync(AGDIR).filter((f) => f.endsWith('.md'));
if (!skrar.length) {
  console.log('✅ GRÆNT agentar: engar agent-skrár.');
  process.exit(0);
}

const daudir = [];
const urelt = [];
const lina = [];

for (const f of skrar) {
  const rel = '.claude/agents/' + f;
  const txt = fs.readFileSync(path.join(AGDIR, f), 'utf8');
  const nafn = f.replace(/\.md$/, '');
  const agTs = commitTs(rel);
  const visad = [...new Set(txt.match(VISAR) || [])];

  const vantar = visad.filter((v) => !fyrirfinnst(v, txt));
  if (vantar.length) daudir.push({ nafn, vantar });

  const lifandi = visad.filter((v) => fs.existsSync(path.join(ROOT, v)));   // ferskleiki aðeins á okkar eigin skrám
  const breytt = lifandi.filter((v) => commitTs(v) > agTs);
  if (breytt.length >= THROSKULDUR && !THEKKT_URELT[nafn]) {
    urelt.push({ nafn, agTs, breytt: breytt.length, af: lifandi.length });
  }
  lina.push(`   ${nafn.padEnd(16)} uppf ${dags(agTs)} · vísar í ${String(visad.length).padStart(3)} · breytt síðan ${String(breytt.length).padStart(3)}`);
}

console.log(lina.join('\n'));

if (daudir.length) {
  console.log('   DAUÐIR VÍSAR:');
  daudir.forEach((d) => console.log('     ✗ ' + d.nafn + ' → ' + d.vantar.join(', ')));
  fail(daudir.reduce((s, d) => s + d.vantar.length, 0) + ' dauðir vísar í ' + daudir.length +
    ' agent(um) — þeir senda þig í skrár sem eru ekki til (hvorki hér né í Brunahólfi, og ' +
    'hvergi sagt að þær séu horfnar). Lagaðu slóðina, eða skrifaðu berum orðum að skráin sé ekki til.');
}

if (urelt.length) {
  console.log('   ÚRELTIR:');
  urelt.forEach((u) => console.log('     ⚠ ' + u.nafn + ' (uppf ' + dags(u.agTs) + ') — ' +
    u.breytt + ' af ' + u.af + ' skrám sem hann gætir hafa breyst síðan'));
  fail(urelt.length + ' agent(ar) eru komnir ' + THROSKULDUR + '+ skrám aftur úr því sem þeir gæta. ' +
    'Uppfærðu með `node tools/agent.cjs --skra "..." --agent <nafn>`.');
}

console.log('✅ GRÆNT agentar: ' + skrar.length + ' agentar · engir dauðir vísar · enginn ' +
  THROSKULDUR + '+ skrám á eftir.');
