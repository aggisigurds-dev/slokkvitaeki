#!/usr/bin/env node
/**
 * VÖRÐUR: byggingin verður að skila sourcemap-i fyrir hvern búnt.
 *
 * Af hverju (mælt 17.09.2026): `villur`-taflan hefur safnað villum úr raunverulegri
 * notkun síðan 31.07. 75 þeirra eru óleystar. Nærri allar segja
 *
 *     TypeError: w.from is not a function
 *         at I (.../js/_bundle-2.295f69cd26.js:343:7899)
 *
 * — raunveruleg villa, endurtekur sig, og NEFNIR HVORKI SKRÁ NÉ LÍNU. Tveggja
 * mánaða villusöfnun skilaði engri lagfæringu af þeirri einu ástæðu.
 *
 * Kortin gera `tools/varpa-villu.cjs` kleift að segja `js/patches/00-legacy.js:732`
 * í staðinn. Detti `--sourcemap` út úr byggingunni verður allt ólæsilegt aftur —
 * þögult, því ekkert annað bilar. Þess vegna er þessi vörður til.
 *
 * Tvennt er athugað:
 *   1. build-dist.js BIÐUR um kort (og með `external`, svo frumkóðinn sé ekki
 *      auglýstur í vafranum).
 *   2. Sé dist/ til: hver búntur á sér .map við hliðina.
 *
 * Fall: exit 1.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const kvartanir = [];

/* ── 1. Byggingin sjálf ───────────────────────────────────────────────────── */
let bd = '';
try { bd = fs.readFileSync(path.join(ROT, 'build-dist.js'), 'utf8'); }
catch (_) { kvartanir.push('build-dist.js finnst ekki'); }

if (bd) {
  const esbuildLinur = bd.split('\n').filter((l) => l.includes('esbuild') && l.includes('--minify'));
  if (!esbuildLinur.length) {
    kvartanir.push('fann enga esbuild-þjöppun í build-dist.js — hefur byggingin breyst?');
  } else if (!/--sourcemap/.test(bd)) {
    kvartanir.push('build-dist.js þjappar ÁN --sourcemap. Hver villuskýrsla verður ólæsileg '
      + '(„_bundle-2.abc.js:343:7899" og ekkert annað).');
  } else if (!/--sourcemap=external/.test(bd)) {
    kvartanir.push('kort eru búin til en ekki `external` — þá fylgir `//# sourceMappingURL` '
      + 'með og allur frumkóðinn er auglýstur hverjum sem opnar devtools.');
  }
  if (/--sources-content=false/.test(bd)) {
    kvartanir.push('--sources-content=false: samsteypan er skrifuð yfir af þjöppuðu skránni, '
      + 'svo án innfellds frumtexta hefur kortið ekkert til að vísa í.');
  }
}

/* ── 2. Afraksturinn, sé hann til ─────────────────────────────────────────── */
const distJs = path.join(ROT, 'dist', 'js');
let bunturSkodadir = 0;
if (fs.existsSync(distJs)) {
  const buntar = fs.readdirSync(distJs).filter((f) => /^_bundle-\d+\.[0-9a-f]+\.js$/.test(f));
  for (const b of buntar) {
    bunturSkodadir++;
    if (!fs.existsSync(path.join(distJs, b + '.map'))) kvartanir.push('dist/js/' + b + ' er án korts');
  }
  if (buntar.length && !kvartanir.length) {
    // Kortið verður líka að BERA frumtextann, annars er ekkert hægt að varpa.
    const fyrsta = JSON.parse(fs.readFileSync(path.join(distJs, buntar[0] + '.map'), 'utf8'));
    const innihald = (fyrsta.sourcesContent || [])[0];
    if (!innihald || innihald.length < 500) {
      kvartanir.push('dist/js/' + buntar[0] + '.map ber engan frumtexta — vörpun ómöguleg');
    } else if (!/\/\* (js|netlify)\//.test(innihald)) {
      kvartanir.push('samsteypan ber ekki lengur `/* skrá */` merkin — varpa-villu.cjs getur '
        + 'ekki nefnt pappann sem villan kom úr');
    }
  }
}

if (kvartanir.length) {
  console.log('❌ Sourcemap-vörður fellur:');
  kvartanir.forEach((k) => console.log('   · ' + k));
  console.log('\n   Afleiðing: villuskýrslur úr raunnotkun verða ólæsilegar aftur.');
  process.exit(1);
}

console.log('✅ Sourcemap í lagi — byggingin skilar externum kortum með frumtexta'
  + (bunturSkodadir ? ' (' + bunturSkodadir + ' búntar í dist/ skoðaðir)' : ' (dist/ ekki byggt hér)')
  + '; villur má varpa með tools/varpa-villu.cjs.');
