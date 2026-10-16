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
 * TVEIR HAMIR (16.10.2026)
 *   node tools/audit-agentar.cjs
 *     Vörðurinn eins og áður: agentar ÞESSA repós, GRÆNT/RAUTT, exit 1 við bilun.
 *     Hluti af tools/audit-all.cjs — dómurinn er óbreyttur.
 *
 *   node tools/audit-agentar.cjs --json <slóð>
 *     Skýrsla, ekki dómur: BÆÐI repó (slokkvitaeki + brunaholf), agentar OG skills,
 *     eitt atriði per skrá — nafn, heim, síðasta git-commit (ekki mtime: auto-sync
 *     pull breytir mtime á 15 mín fresti), fjöldi commit-a, hvað hann gætir, hvað
 *     hefur breyst síðan, dauðir vísar, HUD-sæti úr docs/AGENTASKRA.md og merki.
 *     J.A.R.V.I.S. (brunaholf/jarvis.html, Sérfræðinga-spjaldið) les skrána.
 *     Keyrt daglega úr auto-sync-brunaholf.ps1 (OneDrive/ClaudeMemory).
 *     Exit 0 — skýrslan fellir engan; vörðurinn gerir það.
 *
 *     JSON-ið er ÁKVEÐIÐ AF GIT-SÖGUNNI, ekki af klukkunni: enginn „keyrt"-stimpill.
 *     Þá skrifa tvær vélar sama innihald og wip-commit (→ morgunbirting, 15 krítur)
 *     verður aðeins til þegar eitthvað raunverulegt breyttist. Eina undantekningin
 *     er ⚪-merkið (30+ dagar ósnert), sem flýtur yfir á afmælisdeginum.
 *
 * Sama próf og tools/agent.cjs — þau mega ekki verða ósammála.
 * Aðeins lestur (nema --json skrifi eina skrá). Ekkert net.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Hversu margar breyttar skrár þarf til að agent teljist úreltur.
const THROSKULDUR = 6;

// Agentar sem mega vera úreltir um sinn (tæmdu listann þegar þeir eru uppfærðir).
const THEKKT_URELT = {};

// Dagar ósnertur áður en 🟢 verður ⚪ (aðeins í --json skýrslunni).
const OSNERT_DAGAR = 30;

// Innflutt skills (hönnunarpakkar o.fl.) — ekki okkar, ekki talin.
const INNFLUTT_SKILL = /^(design-|mobile-|graphic-design$|grill-me$|brief-to-tasks$|information-architecture$|frontend-design$|sleek-design-mobile-apps$)/;

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

// Git-köll per repó, með skyndiminni — JSON-hamurinn spyr um ~400 skrár.
const _gitCache = new Map();
function gitI(cwd, a) {
  const k = cwd + '\u0000' + a;
  if (_gitCache.has(k)) return _gitCache.get(k);
  let s = '';
  try { s = execSync('git ' + a, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) { s = ''; }
  _gitCache.set(k, s);
  return s;
}
// Öll commit-tímamerki skrárinnar, nýjast fyrst. [] = aldrei committuð.
const commitLog = (cwd, rel) => gitI(cwd, `log --format=%ct -- "${rel}"`).split('\n').filter(Boolean).map((s) => +s * 1000);
const commitTsI = (cwd, rel) => { const l = commitLog(cwd, rel); return l.length ? l[0] : 0; };
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

// Sniðmáts-slóð („js/patches/NNN-name.js" í add-feature) er leiðbeining, ekki vísir.
const SNIDMAT = /\bNNN\b|<[^>]+>/;

function fyrirfinnstI(heima, hin, v, txt) {
  if (SNIDMAT.test(v)) return true;
  if (fs.existsSync(path.join(heima, v))) return true;
  if (hin && fs.existsSync(path.join(hin, v))) return true;          // í hinu repóinu
  // Nefnd í sömu málsgrein og neitun? Þá er hún skjalfest sem horfin.
  const i = txt.indexOf(v);
  if (i >= 0 && NEITUN.test(txt.slice(Math.max(0, i - 260), i + 260))) return true;
  return false;
}

// EITT próf fyrir eina skrá — bæði hamir og tools/agent.cjs byggja á sama mati.
//   heima = repó skrárinnar (ferskleiki mælist aðeins á skrám þar),
//   hin   = systur-repóið (vísir þangað er lifandi, en ekki talinn með í „breytt").
function skoda(heima, hin, rel) {
  const txt = fs.readFileSync(path.join(heima, rel), 'utf8');
  const log = commitLog(heima, rel);
  const agTs = log.length ? log[0] : 0;
  const visad = [...new Set(txt.match(VISAR) || [])];
  const vantar = visad.filter((v) => !fyrirfinnstI(heima, hin, v, txt));
  const lifandi = visad.filter((v) => fs.existsSync(path.join(heima, v)));
  const breytt = lifandi.filter((v) => commitTsI(heima, v) > agTs);
  // description: getur verið ein lína, eða YAML-blokk (`>` / `|`) — þá er textinn á næstu inndregnu línum.
  let lysing = ((txt.match(/^description:\s*(.*)$/m) || [])[1] || '').replace(/^["']|["']$/g, '').trim();
  if (/^[>|][-+]?$/.test(lysing)) {
    const eftir = txt.slice(txt.search(/^description:/m)).split('\n').slice(1);
    const linur = [];
    for (const l of eftir) { if (/^\s+\S/.test(l)) linur.push(l.trim()); else break; }
    lysing = linur.join(' ').trim();
  }
  return { txt, agTs, skrif: log.length, visad, vantar, lifandi, breytt, lysing };
}

// ── --json: skýrsla yfir bæði repó ────────────────────────────────────────
function jsonHamur(ut) {
  const REPO = [
    { heim: 'slokkvitaeki', rot: ROOT, hin: SYSTIR },
    { heim: 'brunaholf', rot: SYSTIR, hin: ROOT },
  ].filter((r) => r.rot && fs.existsSync(path.join(r.rot, '.git')));

  // HUD-sætin: „| `jarvis` | 🎩 Jarvis | …" í docs/AGENTASKRA.md (bæði repó, slokk bætir Columbo við).
  const roster = {};
  for (const r of REPO) {
    const p = path.join(r.rot, 'docs', 'AGENTASKRA.md');
    if (!fs.existsSync(p)) continue;
    const kafli = fs.readFileSync(p, 'utf8').split(/^## /m).find((k) => /^\d+ agentar/.test(k)) || '';
    for (const l of kafli.split('\n')) {
      const m = l.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/);
      if (!m || roster[m[1]]) continue;
      const saeti = m[2].replace(/\*/g, '').trim();
      if (/ekkert sæti/i.test(saeti)) { roster[m[1]] = null; continue; }
      const sp = saeti.indexOf(' ');
      roster[m[1]] = sp > 0 ? { emoji: saeti.slice(0, sp), hud: saeti.slice(sp + 1).trim() } : { emoji: '', hud: saeti };
    }
  }

  const idag = Date.now();
  const merki = (s) => {
    if (s.vantar.length || s.breytt.length >= THROSKULDUR) return '🔴';
    if (s.breytt.length) return '🟡';
    if (!s.agTs || idag - s.agTs >= OSNERT_DAGAR * 86400000) return '⚪';
    return '🟢';
  };

  const atridi = [];
  for (const r of REPO) {
    const agdir = path.join(r.rot, '.claude', 'agents');
    const skdir = path.join(r.rot, '.claude', 'skills');
    const skrar = [];
    if (fs.existsSync(agdir)) fs.readdirSync(agdir).filter((f) => f.endsWith('.md')).sort()
      .forEach((f) => skrar.push({ tegund: 'agent', nafn: f.replace(/\.md$/, ''), rel: '.claude/agents/' + f }));
    if (fs.existsSync(skdir)) fs.readdirSync(skdir).sort()
      .filter((d) => !INNFLUTT_SKILL.test(d) && fs.existsSync(path.join(skdir, d, 'SKILL.md')))
      .forEach((d) => skrar.push({ tegund: 'skill', nafn: d, rel: '.claude/skills/' + d + '/SKILL.md' }));
    for (const s of skrar) {
      const m = skoda(r.rot, r.hin, s.rel);
      const ro = s.tegund === 'agent' ? roster[s.nafn] : null;
      atridi.push({
        nafn: s.nafn, tegund: s.tegund, heim: r.heim, slod: s.rel,
        hud: ro ? ro.hud : null, emoji: ro ? ro.emoji : null,
        sidast: m.agTs ? dags(m.agTs) : null, skrif: m.skrif,
        gaetir: m.visad.length, breytt: m.breytt.length, daudir: m.vantar,
        merki: merki(m), lysing: m.lysing.slice(0, 160),
      });
    }
  }

  const nyjast = atridi.reduce((a, b) => (b.sidast && b.sidast > a ? b.sidast : a), '');
  const skra = {
    utgafa: 1, nyjast, throskuldur: THROSKULDUR, osnert_dagar: OSNERT_DAGAR,
    uppspretta: 'slokkvitaeki/tools/audit-agentar.cjs --json',
    atridi,
  };
  fs.mkdirSync(path.dirname(ut), { recursive: true });
  fs.writeFileSync(ut, JSON.stringify(skra, null, 1) + '\n', 'utf8');

  const tel = {};
  atridi.forEach((a) => { tel[a.merki] = (tel[a.merki] || 0) + 1; });
  atridi.forEach((a) => console.log(
    `   ${a.merki} ${a.tegund === 'skill' ? 'skill ' : 'agent '}${(a.heim === 'brunaholf' ? 'bh ' : 'sl ')}${a.nafn.padEnd(24)} ` +
    `${a.sidast || '—'} · ${String(a.skrif).padStart(2)} skrif · gætir ${String(a.gaetir).padStart(3)} · breytt ${String(a.breytt).padStart(2)}` +
    (a.daudir.length ? ' · DAUÐIR: ' + a.daudir.join(', ') : '')));
  console.log(`agentar-stada: ${atridi.length} atriði (${atridi.filter((a) => a.tegund === 'agent').length} agentar · ` +
    `${atridi.filter((a) => a.tegund === 'skill').length} skills) → ${ut} · ` +
    ['🟢', '🟡', '🔴', '⚪'].map((m) => m + (tel[m] || 0)).join(' '));
  process.exit(0);
}

const argv = process.argv.slice(2);
const ji = argv.indexOf('--json');
if (ji >= 0) {
  const ut = argv[ji + 1];
  if (!ut) { console.error('Vantar slóð: --json <slóð>'); process.exit(2); }
  jsonHamur(path.resolve(ut));
}

// ── Vörðurinn (óbreyttur dómur) ───────────────────────────────────────────
const AGDIR = path.join(ROOT, '.claude', 'agents');

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
  const nafn = f.replace(/\.md$/, '');
  const { agTs, visad, vantar, lifandi, breytt } = skoda(ROOT, SYSTIR, rel);

  if (vantar.length) daudir.push({ nafn, vantar });
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
