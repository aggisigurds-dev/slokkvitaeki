#!/usr/bin/env node
'use strict';
/* SÖLUSTAÐA — sala fær aðeins stöðugildi sem taflan leyfir.
 *
 * Af hverju hann er til (30.09.2026): Agnar smellti á „Stofna drög" undir
 * brunakerfi og fékk
 *     new row for relation "solur" violates check constraint "solur_status_check"
 * Taflan leyfir AÐEINS 'drog' · 'final' · 'void' (solur_status_check). Patch 291
 * skrifaði enska orðið 'draft'. Mælt sama dag: 847 raðir 'final', 51 'drog',
 * 50 'void' og NÚLL 'draft' — leiðin hafði aldrei virkað, frá því hún var smíðuð.
 * Villan var sýnileg notandanum (þess vegna fannst hún) en ekkert í kerfinu
 * stöðvaði hana við ritun.
 *
 * Hin hliðin er hljóðlátari og verri: LESTUR á röngu gildi skilar engri villu,
 * bara tómu svari. 291 bar líka `inv.status === 'draft' ? 'drög'` — merki sem gat
 * aldrei kviknað. Vörðurinn dæmir því bæði skrif og lestur.
 *
 * REGLAN: hvert stöðugildi sem kóðinn skrifar á eða les úr `solur.status` sem
 * BEINN STRENGUR verður að vera í KANON. Rautt frá fyrsta broti — engin grunnlína.
 *
 * Tvær leitir, því sölu-röðin er ekki alltaf byggð við hliðina á `.from('solur')`:
 *   A) hlutur sem ber BÆÐI `greitt_med:` og `status: '…'` — það er sölu-röð, hvar
 *      sem hún er smíðuð (þannig slapp 291 undan nálægðarleit).
 *   B) `status` innan NALAEGD lína frá `.from('solur')` — .insert/.update/.eq/.neq.
 *
 * Takmörk: grípur aðeins gildi skrifuð sem strengur beint í kallinu. Staða sem er
 * sett saman í breytu annars staðar sést ekki.
 *
 * Keyrsla: node tools/audit-solu-stada.cjs [mappa]
 * Static — þarf hvorki net né lykla.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const maelt = process.argv[2] ? [path.resolve(process.argv[2])]
  : [path.join(rot, 'js'), path.join(rot, 'netlify', 'functions')];

// solur_status_check, lesið af töflunni 30.09.2026:
//   CHECK ((status = ANY (ARRAY['drog'::text, 'final'::text, 'void'::text])))
const KANON = ['drog', 'final', 'void'];
const NALAEGD = 12;   // línur frá .from('solur') sem teljast sama kallið

function skrar(d, ut) {
  let poki = [];
  try { poki = fs.readdirSync(d, { withFileTypes: true }); } catch (_) { return ut; }
  for (const f of poki) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (!/^(node_modules|dist|\.git)$/.test(f.name)) skrar(p, ut); }
    else if (/\.(js|cjs|mjs)$/.test(f.name)) ut.push(p);
  }
  return ut;
}

const brot = [];
let skodadar = 0, gild = 0;

for (const rotmappa of maelt) {
  for (const p of skrar(rotmappa, [])) {
    const texti = fs.readFileSync(p, 'utf8');
    if (!/solur|greitt_med/.test(texti)) continue;
    skodadar++;
    const linur = texti.split(/\r?\n/);

    // Hvaða línur teljast „innan sölukalls"? (leit B)
    // Glugginn STÖÐVAST við næsta .from( — annars teygði hann sig yfir í kall á
    // aðra töflu. Mælt 30.09.2026: án þess gaf hann þrjú fölsk merki
    // (verkbeidnir 'collected' í 197, tilbod 'sent' í 48) af því að þær raðir
    // stóðu innan tólf lína frá .from('solur').
    const naerri = new Set();
    linur.forEach((l, i) => {
      if (!/\.from\(\s*['"]solur['"]\s*\)/.test(l)) return;
      for (let j = i; j < Math.min(linur.length, i + NALAEGD); j++) {
        if (j > i && /\.from\(/.test(linur[j])) break;
        naerri.add(j);
      }
    });

    linur.forEach((l, i) => {
      // Athugasemdalínur eru ekki kóði — þær mega nefna 'draft' til að útskýra hann.
      const kodi = l.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (!kodi.trim()) return;

      const fundin = [];
      // A) sölu-röð: greitt_med + status í sama hlut (leitum í glugga, ekki bara línu)
      const gluggi = linur.slice(Math.max(0, i - 4), i + 5).join('\n');
      const erSoluRod = /greitt_med\s*:/.test(gluggi);
      // Hlutur sem er SMÍÐAÐUR og síðan sendur: `patch = { status: 'X' }` stendur á
      // undan `.from('tafla').update(patch)`. Hann tilheyrir því NÆSTA .from( á eftir
      // sér — ekki því sem stóð á undan. Mælt 30.09.2026: án þessa eignaði
      // vörðurinn 197:259 (verkbeidnir 'collected') sölunni í 197:248.
      let naestaTafla = null;
      for (let j = i; j < Math.min(linur.length, i + NALAEGD); j++) {
        const f = linur[j].match(/\.from\(\s*['"]([^'"]+)['"]\s*\)/);
        if (f) { naestaTafla = f[1]; break; }
      }
      let m;
      const reStatus = /status\s*:\s*(['"])([^'"]*)\1/g;
      while ((m = reStatus.exec(kodi))) if (erSoluRod || naestaTafla === 'solur') fundin.push(m[2]);
      // B) .eq('status','X') / .neq(...) innan sölukalls
      const reEq = /\.(?:eq|neq|in)\(\s*['"]status['"]\s*,\s*(['"])([^'"]*)\1/g;
      while ((m = reEq.exec(kodi))) if (naerri.has(i)) fundin.push(m[2]);

      fundin.forEach(raw => {
        // PostgREST-sía ber virkjann með sér ('eq.final', 'in.(drog,final)') —
        // hún er jafn gild og berstrípað gildi og má ekki teljast brot.
        const v = String(raw).replace(/^(?:eq|neq|gt|gte|lt|lte|like|ilike|is|not)\./, '');
        if (/^in\.\(/.test(raw)) {
          const oll = raw.replace(/^in\.\(|\)$/g, '').split(',').map(x => x.trim().replace(/^["']|["']$/g, ''));
          if (oll.every(x => KANON.includes(x))) { gild++; return; }
        }
        if (KANON.includes(v)) { gild++; return; }
        brot.push({ skra: path.relative(rot, p), lina: i + 1, gildi: v, texti: kodi.trim().slice(0, 110) });
      });
    });
  }
}

console.log('SÖLUSTAÐA — leyfð gildi: ' + KANON.join(' · '));
console.log('  ' + skodadar + ' skrár skoðaðar · ' + gild + ' gild stöðugildi í kóða\n');

if (!brot.length) {
  console.log('✅ GRÆNT sölustaða: hvert stöðugildi sem kóðinn skrifar eða les úr solur.status er í kanónunni.');
  process.exit(0);
}

brot.forEach(b => {
  console.log('  ❌ ' + b.skra + ':' + b.lina + '  → \'' + b.gildi + '\'');
  console.log('       ' + b.texti);
});
console.log('\nRED: ' + brot.length + ' stöðugildi sem solur_status_check hafnar (eða lestur sem finnur aldrei neitt).');
console.log('Lagfæring: notaðu ' + KANON.join(' / ') + '. Skrif fellur á skilyrðinu; lestur þegir og skilar tómu.');
process.exit(1);
