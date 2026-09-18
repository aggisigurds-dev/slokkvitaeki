#!/usr/bin/env node
/**
 * VÖRÐUR: `DB.sb` má ekki grípa við HLEÐSLU — hann er `null` þá.
 *
 * Staðreyndin er skjalfest í kóðanum sjálfum (`03-vidsk-revamp.js:10`):
 *   „DB.sb is null at script-load time; it's set inside DB.init() on DOMContentLoaded"
 *
 * Pappar hlaðast með `defer` og keyra strax. `DB.init()` keyrir seinna. Þess vegna:
 *
 *     const sb = window.DB && window.DB.sb;      // ALLTAF null
 *     if (!sb) return;                           // → pappinn slekkur á sér
 *
 * ...og heil sýn hverfur án þess að nokkur villa sjáist. Þetta gerðist 18.09.2026:
 * fyrsta tilraun mín til að laga `02-vidsk-tab.js` setti `const sb = DB.sb` við
 * hleðslu; hliðið fyrir neðan slökkti á öllum pappanum og #vidskiptavinir hvarf
 * ALVEG. Mælt í viðmótinu og leiðrétt samstundis.
 *
 * Systurgildran, líka mæld sama kvöld: `const sb = window.supabase || ...` grípur
 * SAFNIÐ, ekki biðlarann — sjá `tools/audit-supabase-safn.cjs`.
 *
 * RÉTT MYNSTUR (68 pappar nota það):
 *     const sb = () => (window.DB && window.DB.sb) || null;   // metið við KALL
 *     …
 *     const r = await sb().from('x')…
 *
 * Fall: exit 1.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const MOPPUR = ['js', 'js/patches'];

const fundid = [];

for (const m of MOPPUR) {
  let skrar;
  try { skrar = fs.readdirSync(path.join(ROT, m)); } catch (_) { continue; }

  for (const f of skrar) {
    if (!f.endsWith('.js')) continue;
    const rel = m + '/' + f;
    if (/^js\/(db|config)\.js$/.test(rel)) continue;              // þar BÝR biðlarinn
    let t;
    try { t = fs.readFileSync(path.join(ROT, m, f), 'utf8'); } catch (_) { continue; }
    const L = t.split('\n');

    L.forEach((lina, i) => {
      const hrein = lina.trim();
      if (hrein.startsWith('//') || hrein.startsWith('*')) return;

      // Úthlutun sem grípur biðlarann sem GILDI (ekki fall).
      // 18.09.2026: fyrri útgáfa notaði `\s*(?!\(\))` — regex-vélin bakkaði yfir
      // bilið og neikvæða framsýnin missti af `() =>`. Vörðurinn flaggaði þá
      // RÉTTU útfærslunni. Hægri hliðin er því tekin út fyrst og skoðuð sér.
      const mm = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?\s*$/.exec(hrein);
      if (!mm) return;
      const breyta = mm[1];
      const haegri = mm[2].trim();
      if (/^(\(\s*\)|function\b|async\b|[A-Za-z_$][\w$]*\s*=>)/.test(haegri)) return;   // fall — metið við kall
      if (!/\bDB\s*&&\s*(?:window\.)?DB\.sb\b|^(?:window\.)?DB\.sb\b/.test(haegri)) return;

      // Er þetta á ytra þrepi pappans (ekki inni í falli)? Inndráttur segir það:
      // innan IIFE er hann 2 bil; inni í falli er hann 4+.
      const inndrattur = lina.length - lina.replace(/^\s*/, '').length;
      if (inndrattur > 3) return;                                  // inni í falli — í lagi

      // Er breytan svo notuð sem biðlari?
      const notud = new RegExp('(^|[^\\w$.])' + breyta.replace(/\$/g, '\\$')
        + '\\s*\\.\\s*(from|storage|rpc|channel)\\b').test(t);
      if (!notud) return;

      fundid.push({
        rel, nr: i + 1, breyta,
        txt: hrein.slice(0, 92),
        // Slekkur pappinn á sér út af þessu?
        hlid: new RegExp('if\\s*\\(\\s*!\\s*' + breyta.replace(/\$/g, '\\$') + '\\s*\\)[^\\n]*return').test(t),
      });
    });
  }
}

if (!fundid.length) {
  console.log('✅ Enginn pappi grípur DB.sb við hleðslu — allir sækja hann við kall.');
  process.exit(0);
}

console.log('❌ ' + fundid.length + ' staðir grípa biðlarann við HLEÐSLU (hann er null þá):');
for (const x of fundid) {
  console.log('   ' + x.rel + ':' + x.nr + '   `' + x.breyta + '`'
    + (x.hlid ? '   ⚠ og pappinn slekkur á sér: `if (!' + x.breyta + ') return`' : ''));
  console.log('        ' + x.txt);
}
console.log('\n   DB.init() keyrir á DOMContentLoaded — pappar keyra á undan honum.');
console.log('   Rétt:  const ' + fundid[0].breyta + ' = () => (window.DB && window.DB.sb) || null;');
console.log('          … await ' + fundid[0].breyta + '().from(…)');
process.exit(1);
