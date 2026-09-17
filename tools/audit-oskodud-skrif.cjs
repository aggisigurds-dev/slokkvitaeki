#!/usr/bin/env node
/**
 * VÖRÐUR: skrif í gagnagrunn þar sem niðurstaðan er ekki lesin.
 *
 * Af hverju þessi vörður er til (17.09.2026, orð Agnars):
 *   „takkinn gerir ekki það sem hann segist gera. Þetta hefur verid gegnumgangandi
 *    rugl fra upphafi"
 *
 * Kjarni málsins er staðreynd um supabase-js: `.update()`, `.insert()`, `.upsert()`
 * og `.delete()` KASTA ALDREI. Villan kemur til baka í `.error`. Þess vegna gerir
 * try/catch í kringum þau EKKERT — og kóði sem skrifar svona:
 *
 *     await sb.from('fyrirtaeki').update({ afslattur_pct: v }).in('kennitala', kts);
 *     msg.textContent = '✓ Vistað';
 *
 * ...segir „✓ Vistað" hvort sem skrifið komst inn eða ekki. Notandinn fær staðfestingu
 * á einhverju sem gerðist aldrei, og uppgötvar það löngu seinna — oftast á reikningi.
 *
 * REGLAN sem þessi vörður ver:
 *   Ekkert skrif má standa sem BERT `await`-stak. Annaðhvort er niðurstaðan bundin
 *   við breytu (og `.error` lesin), eða `.then/.catch` meðhöndlar hana.
 *
 * Fall: exit 1 ef nokkurt bert skrif finnst.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const MOPPUR = ['js', 'js/patches', 'netlify/functions'];

// Bert skrif: lína sem BYRJAR á `await` (engin úthlutun, engin return/if) og
// endar á `;`, með .from(...).<skrifaðgerð>( einhvers staðar í sér.
const BERT = /^\s*await\s+[A-Za-z_$][\w$.]*\s*(?:\(\s*\))?\s*\.from\(/;
const SKRIF = /\.(update|insert|upsert|delete)\s*\(/;

const fundid = [];
for (const m of MOPPUR) {
  const d = path.join(ROT, m);
  let skrar;
  try { skrar = fs.readdirSync(d); } catch (_) { continue; }
  for (const f of skrar) {
    if (!f.endsWith('.js') && !f.endsWith('.cjs')) continue;
    const rel = m + '/' + f;
    let t;
    try { t = fs.readFileSync(path.join(d, f), 'utf8'); } catch (_) { continue; }
    t.split('\n').forEach((lina, i) => {
      if (!BERT.test(lina) || !SKRIF.test(lina)) return;
      // Bundin niðurstaða eða meðhöndlun í sömu línu telst lesin.
      if (/=\s*await|\.then\(|\.catch\(|return\s+await/.test(lina)) return;
      fundid.push({ rel, nr: i + 1, txt: lina.trim().replace(/\s+/g, ' ').slice(0, 96) });
    });
  }
}

if (!fundid.length) {
  console.log('✅ OK — engin bert skrif; hvert skrif les niðurstöðu sína.');
  process.exit(0);
}

console.log('❌ ' + fundid.length + ' skrif í gagnagrunn þar sem niðurstaðan er ALDREI lesin.');
console.log('   supabase-js kastar ekki — þessi geta öll mistekist þögul.\n');
const eftirSkra = {};
fundid.forEach((x) => { (eftirSkra[x.rel] = eftirSkra[x.rel] || []).push(x); });
for (const [rel, l] of Object.entries(eftirSkra).sort((a, b) => b[1].length - a[1].length)) {
  console.log('  ' + rel + '  (' + l.length + ')');
  l.forEach((x) => console.log('      :' + x.nr + '  ' + x.txt));
}
console.log('\nLagfæring: bind niðurstöðuna og lestu .error —');
console.log("  const r = await sb.from('x').update(y).eq('id', id);");
console.log('  if (r && r.error) throw r.error;');
process.exit(1);
