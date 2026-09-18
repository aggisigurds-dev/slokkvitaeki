#!/usr/bin/env node
/**
 * VÖRÐUR: `window.supabase` má aldrei vera notað sem BIÐLARI.
 *
 * CLAUDE.md segir það beint: „`window.supabase` is the LIBRARY. The client is
 * created via `window.supabase.createClient(...)`." Safnið á `createClient` —
 * það á EKKI `.from`, `.storage` né `.rpc`.
 *
 * ÞETTA BEIT — og það tók þrjár vikur að sjá það (mælt 18.09.2026):
 *
 *   js/patches/02-vidsk-tab.js:10   const sb = window.supabase || window.sb;
 *
 * Ekkert í kerfinu skrifar biðlarann ofan í `window.supabase`, svo `sb` var
 * ALLTAF safnið. `loadData()` féll á „sb.from is not a function" í hvert sinn sem
 * #vidskiptavinir var opnað — listinn hlóðst aldrei úr `vidskiptavinir`-töflunni.
 *
 * Tvennt faldi það:
 *   · villuvaktin sendir sömu villu EINU SINNI per lotu, svo teljarinn sagði 6
 *     tilvik síðan 28.08 — sem las eins og fátítt hnökur, ekki stöðug bilun;
 *   · í þjappaða búntinum hét hún „w.from is not a function" og nefndi hvorki
 *     skrá né línu (sjá tools/varpa-villu.cjs, sem lagar þá hlið).
 *
 * RÉTTA KEÐJAN, sem 68 aðrir pappar nota:
 *     const sb = (window.DB && window.DB.sb) || null;
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
    let t;
    try { t = fs.readFileSync(path.join(ROT, m, f), 'utf8'); } catch (_) { continue; }

    t.split('\n').forEach((lina, i) => {
      const hrein = lina.trim();
      if (hrein.startsWith('//') || hrein.startsWith('*')) return;

      // 1. Beint kall á safnið sem biðlara.
      if (/window\.supabase\s*\.\s*(from|storage|rpc|channel)\b/.test(hrein)) {
        fundid.push({ rel, nr: i + 1, hvad: 'window.supabase notað sem biðlari', txt: hrein.slice(0, 92) });
        return;
      }

      // 2. Safnið sett í breytu sem er svo notuð sem biðlari. Aðeins flaggað
      //    þegar `window.supabase` stendur Á UNDAN `DB.sb` í varakeðjunni eða
      //    DB.sb er alls ekki með — þá getur safnið unnið kapphlaupið.
      const m2 = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*window\.supabase[^;\n]*)/.exec(hrein);
      if (!m2) return;
      const hoegri = m2[2];
      if (/createClient/.test(hoegri)) return;                 // rétt notkun
      const iDb = hoegri.indexOf('DB.sb');
      const iSafn = hoegri.indexOf('window.supabase');
      if (iDb >= 0 && iDb < iSafn) return;                     // DB.sb vinnur alltaf
      fundid.push({
        rel, nr: i + 1,
        hvad: '`' + m2[1] + '` getur orðið SAFNIÐ (það á ekki .from)',
        txt: hrein.slice(0, 92),
      });
    });
  }
}

if (!fundid.length) {
  console.log('✅ Enginn staður notar window.supabase sem biðlara — safnið og biðlarinn eru aðgreind.');
  process.exit(0);
}

console.log('❌ ' + fundid.length + ' staðir þar sem SAFNIÐ getur endað sem biðlari:');
fundid.forEach((x) => {
  console.log('   ' + x.rel + ':' + x.nr + '  — ' + x.hvad);
  console.log('        ' + x.txt);
});
console.log('\n   Þetta bilar sem „x.from is not a function" og er nær ólæsilegt í þjöppuðum búnti.');
console.log('   Rétt: const sb = (window.DB && window.DB.sb) || null;');
process.exit(1);
