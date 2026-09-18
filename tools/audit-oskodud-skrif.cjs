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
    const L = t.split('\n');
    L.forEach((lina, i) => {
      if (!BERT.test(lina)) return;
      // Bundin niðurstaða eða meðhöndlun í sömu línu telst lesin.
      if (/=\s*await|\.then\(|\.catch\(|return\s+await/.test(lina)) return;
      // 17.09.2026: keðjan má liggja á fleiri en einni línu —
      //     await SB.from('fyrirtaeki')
      //       .update({ ... })
      // Fyrri útgáfa krafðist þess að .from( og skrifsögnin væru á SÖMU línu og
      // sá því ekki tvö slík (js/modal.js, 157-allir-vidskiptavinir.js).
      const svid = SKRIF.test(lina) ? lina : L.slice(i + 1, i + 5).join(' ');
      if (!SKRIF.test(svid)) return;
      if (svid !== lina && /=\s*await|\.then\(|\.catch\(/.test(svid)) return;
      fundid.push({ rel, nr: i + 1, txt: lina.trim().replace(/\s+/g, ' ').slice(0, 96) });
    });
  }
}

/* ── SKRALLIÐ ────────────────────────────────────────────────────────────────
 * Talan hér að neðan er MÆLD staða 17.09.2026, ekki ásættanleg staða.
 *
 * Af hverju hún er ekki 0: þegar vörðurinn var skrifaður fundust 55 slík skrif.
 * Níu voru lagfærð samdægurs af mér (peningalínurnar: afsláttur á rekstrarfélag í
 * fjórum patchum, „Marka sem rukkað" á þjónustusamning, ferðavistun, samþykkt
 * úttektar, AI-fjöldasamþykki), og 94 til viðbótar sama kvöld í fjórum samhliða
 * lotum yfir 84 skrár. 2 standa eftir.
 *
 * Talan er SKRALL, ekki lækkuð krafa. Munurinn:
 *   · vörðurinn prentar alltaf ALLA listann — hann segir aldrei „OK";
 *   · hann fellur við hverja NÝJA slíka línu;
 *   · talan má aðeins LÆKKA, aldrei hækka. Þegar hún nær 0 er skrallið tekið út.
 *
 * Til að vinna hana niður: taktu efstu skrána á listanum, bindu niðurstöðuna,
 * lestu `.error`, og lækkaðu töluna hér um það sem þú lagaðir.
 */
const EFTIR = 2;

const eftirSkra = {};
fundid.forEach((x) => { (eftirSkra[x.rel] = eftirSkra[x.rel] || []).push(x); });
const radad = Object.entries(eftirSkra).sort((a, b) => b[1].length - a[1].length);

// Listinn FYRST — dómurinn SÍÐAST. audit-all.cjs sýnir SÍÐUSTU prentuðu línuna sem
// samantekt varðarins. Stæði lagfæringarábendingin þar læsi netið "All green" þótt
// óskoðuð skrif stæðu eftir — nákvæmlega falska græna hakið sem á að hverfa.
for (const [rel, l] of radad) {
  console.log('  ' + rel + '  (' + l.length + ')');
  l.forEach((x) => console.log('      :' + x.nr + '  ' + x.txt));
}
console.log('');
console.log('Lagfæring: bind niðurstöðuna og lestu .error —');
console.log("  const r = await sb.from('x').update(y).eq('id', id);");
console.log('  if (r && r.error) throw r.error;');
console.log('');

if (fundid.length > EFTIR) {
  console.log('❌ ' + fundid.length + ' óskoðuð skrif — ' + (fundid.length - EFTIR)
    + ' FLEIRI en skrallið leyfir. Nýtt skrif sem les ekki niðurstöðu sína og mistekst því þögult.');
} else if (fundid.length < EFTIR) {
  console.log('🟡 ' + fundid.length + ' óskoðuð skrif eftir (voru ' + EFTIR
    + ') — lækkaðu EFTIR í ' + fundid.length + ' í þessari skrá svo skrallið haldi.');
} else {
  console.log('🟡 EKKI GRÆNT — ' + fundid.length + ' óskoðuð skrif standa eftir; ekkert nýtt bættist við. Hvert þeirra getur mistekist þögult.');
}
process.exit(fundid.length > EFTIR ? 1 : 0);
