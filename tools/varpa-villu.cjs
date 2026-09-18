#!/usr/bin/env node
/**
 * VARPA VILLU — breytir þjappaðri stöðu í skrá og línu sem hægt er að opna.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * VANDAMÁLIÐ (mælt 17.09.2026): `villur`-taflan geymir 75 óleystar villur úr
 * raunverulegri notkun. Nærri allar segja eitthvað á borð við
 *
 *     TypeError: w.from is not a function
 *         at I (https://slokkvitaeki.netlify.app/js/_bundle-2.295f69cd26.js:343:7899)
 *
 * sem nefnir hvorki skrá né línu. Villan er raunveruleg og endurtekur sig — en
 * hún er ólæsileg, svo enginn getur lagað hana. Það er ástæðan fyrir því að
 * tveggja mánaða villusöfnun hefur ekki skilað einni lagfæringu.
 *
 * HVERS VEGNA SOURCEMAP EITT DUGAR EKKI: vafrar beita korti á DevTools-gluggann
 * en ALDREI á strenginn `error.stack`. Það sem villuvaktin sendir á þjóninn er
 * því áfram þjappað, hversu góð sem kortin eru. Vörpunin verður að gerast hér.
 *
 * TVÖ SKREF, því búnturinn er samsteypa:
 *   1. kortið varpar þjappaðri stöðu  →  línu í samsteypunni
 *   2. samsteypan ber merki `/* js/patches/157-....js *␝/` fyrir hverja skrá,
 *      svo næsta merki á undan þeirri línu nefnir pappann — og mismunurinn
 *      gefur línuna INNAN hans.
 *
 * NOTKUN
 *     node tools/varpa-villu.cjs "_bundle-2.295f69cd26.js:343:7899"
 *     node tools/varpa-villu.cjs --stafli "<allur stack-strengurinn>"
 *     node tools/varpa-villu.cjs --villur          # sækir óleystar úr Supabase
 *
 * Kortin eru sótt af lifandi síðunni ef þau finnast ekki í dist/. Búnturinn
 * lifir aðeins fram að næstu byggingu, svo villur eru varpaðar meðan þær eru
 * ferskar — eldri en það er ekki hægt að varpa, og það er sagt hreint út.
 */
const { SourceMap } = require('node:module');
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const LIFANDI = 'https://slokkvitaeki.netlify.app';

/** Sækir kort — fyrst úr dist/, svo af lifandi síðunni. */
async function saekjaKort(skra) {
  const heima = path.join(ROT, 'dist', 'js', skra + '.map');
  if (fs.existsSync(heima)) {
    return { kort: JSON.parse(fs.readFileSync(heima, 'utf8')), hvadan: 'dist/' };
  }
  const slod = LIFANDI + '/js/' + skra + '.map';
  const r = await fetch(slod);
  if (!r.ok) return { kort: null, hvadan: slod + ' → ' + r.status };
  return { kort: await r.json(), hvadan: 'lifandi síða' };
}

/** Finnur hvaða papp lína í samsteypunni tilheyrir, út frá /* rel *␝/ merkjunum. */
function pappiVidLinu(samsteypa, lina) {
  const L = samsteypa.split('\n');
  let merki = null, merkiLina = 0;
  for (let i = 0; i < Math.min(lina, L.length); i++) {
    const m = /^\/\* ((?:js|netlify)\/[^\s*]+) \*\/$/.exec(L[i].trim());
    if (m) { merki = m[1]; merkiLina = i + 1; }
  }
  return merki ? { skra: merki, lina: lina - merkiLina } : null;
}

async function varpa(skra, lina, dalkur) {
  const { kort, hvadan } = await saekjaKort(skra);
  if (!kort) {
    return { villa: 'Ekkert kort fyrir ' + skra + ' (' + hvadan + '). '
      + 'Búnturinn hefur líklega verið leystur af hólmi með nýrri byggingu — '
      + 'eldri villur en síðasta bygging er ekki hægt að varpa.' };
  }
  const sm = new SourceMap(kort);
  const f = sm.findEntry(lina - 1, dalkur);          // 0-vísað hjá Node
  if (!f || f.originalLine == null) {
    return { villa: 'Kortið nær ekki yfir ' + lina + ':' + dalkur };
  }
  const samsteypa = (kort.sourcesContent || [])[0] || '';
  const p = samsteypa ? pappiVidLinu(samsteypa, f.originalLine + 1) : null;
  const L = samsteypa.split('\n');
  return {
    hvadan,
    samsteypulina: f.originalLine + 1,
    skra: p ? p.skra : (kort.sources || [])[0] || '?',
    lina: p ? p.lina : f.originalLine + 1,
    texti: (L[f.originalLine] || '').trim().slice(0, 120),
  };
}

function stodurUr(texti) {
  const ut = [];
  const re = /_bundle-(\d+)\.([0-9a-f]{6,})\.js:(\d+):(\d+)/g;
  let m;
  while ((m = re.exec(texti)) !== null) {
    ut.push({ skra: '_bundle-' + m[1] + '.' + m[2] + '.js', lina: +m[3], dalkur: +m[4] });
  }
  return ut;
}

(async () => {
  const rok = process.argv.slice(2);
  if (!rok.length) {
    console.log('notkun: node tools/varpa-villu.cjs "_bundle-2.abc123.js:343:7899"');
    console.log('        node tools/varpa-villu.cjs --stafli "<stack>"');
    process.exit(2);
  }
  const texti = rok[0] === '--stafli' ? rok.slice(1).join(' ') : rok.join(' ');
  const stodur = stodurUr(texti);
  if (!stodur.length) {
    console.log('Fann enga búnt-stöðu í textanum. Dæmi um form: _bundle-2.295f69cd26.js:343:7899');
    process.exit(2);
  }
  for (const s of stodur) {
    const r = await varpa(s.skra, s.lina, s.dalkur);
    if (r.villa) { console.log('  ✗ ' + s.skra + ':' + s.lina + ':' + s.dalkur + '  — ' + r.villa); continue; }
    console.log('  ' + s.skra + ':' + s.lina + ':' + s.dalkur);
    console.log('      → ' + r.skra + ':' + r.lina + '   (' + r.hvadan + ')');
    if (r.texti) console.log('        ' + r.texti);
  }
})();
