#!/usr/bin/env node
/**
 * VÖRÐUR: lestur sem er ekki skoðaður og leiðir svo til INNSETNINGAR.
 *
 * Af hverju (mælt 18.09.2026, fundið í þremur skrám á einu kvöldi):
 *
 *     const r = await sb.from('uttaeki').select('*').eq('serial', s);
 *     if (!r.data || !r.data.length) {
 *       await sb.from('uttaeki').insert({ serial: s, ... });     // NÝTT TÆKI
 *     }
 *
 * Bregðist fyrirspurnin — RLS, netglitch, 500, rangur dálkur — er `r.data` `null`.
 * Kóðinn les það sem „tækið er ekki til" og býr til ANNAÐ EINTAK af tæki sem var
 * þegar í skránni. Enginn sér villu; talan hækkar bara.
 *
 * Þetta er hættulegra en óskoðað SKRIF, því:
 *   · skrif sem mistekst skilur ekkert eftir sig — hér verður til RÖNG RÖÐ;
 *   · `audit-oskodud-skrif.cjs` sér þetta ALLS EKKI (hún leitar að skrifum);
 *   · og reglan í þessu húsi er skýr: „Tæki eru FJÖLDI — eina hættan er
 *     tvítalning" (docs/minnisatriði). Tvítekið tæki er tvítekin lína á reikningi.
 *
 * Fundið 18.09.2026 og lagfært: 142-sale-editor.js:877 (tvítekin verkbeiðni,
 * `-V1/-V2` lögð ofan á þær sem voru til), 210-vertid-mottaka.js:539 og
 * js/settigeymslu.js:45 (bæði tvítekið tæki).
 *
 * AÐFERÐIN og takmörk hennar, sagðar hreint út:
 *   Leitað er að `await ....select(` þar sem `.error` er hvergi lesin innan
 *   sama falls, og `insert(`/`upsert(` kemur innan 25 lína á eftir í grein sem
 *   hangir á tómleika lestrarins. Þetta finnur ekki allt og getur flaggað
 *   saklausum kóða. Listinn er til yfirferðar, ekki dómur.
 *
 * Fall: exit 1 ef talan fer YFIR skrallið.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const MOPPUR = ['js', 'js/patches', 'netlify/functions'];

/** Grein sem hangir á því að lesturinn hafi skilað engu. */
const TOMLEIKI = /if\s*\(\s*!|\.length\s*(===|==)\s*0|!\s*\w+\.data|\.data\s*(===|==)\s*null|\?\s*\.\s*length|\|\|\s*\[\]\s*\)\.length/;
const INNSETNING = /\.(insert|upsert)\s*\(/;

const fundid = [];

for (const m of MOPPUR) {
  let skrar;
  try { skrar = fs.readdirSync(path.join(ROT, m)); } catch (_) { continue; }

  for (const f of skrar) {
    if (!/\.(js|cjs)$/.test(f)) continue;
    const rel = m + '/' + f;
    let t;
    try { t = fs.readFileSync(path.join(ROT, m, f), 'utf8'); } catch (_) { continue; }
    const L = t.split('\n');

    L.forEach((lina, i) => {
      const hrein = lina.trim();
      if (hrein.startsWith('//') || hrein.startsWith('*')) return;
      if (!/await\s+[^;]*\.from\(/.test(hrein) || !/\.select\s*\(|\.single\s*\(/.test(hrein)) return;

      // Hvaða breyta heldur á niðurstöðunni?
      const mB = /(?:const|let|var)\s*(?:\{\s*([^}]*)\}|([A-Za-z_$][\w$]*))\s*=\s*await/.exec(hrein);
      if (!mB) return;
      const afbygging = mB[1];                       // const { data, error } = await …
      const breyta = mB[2];

      // Var `.error` lesin? Leitað í 30 línum á eftir (og í afbyggingunni sjálfri).
      const eftir = L.slice(i, i + 30).join('\n');
      if (afbygging && /\berror\b/.test(afbygging)) return;        // tekin út — talin lesin
      if (breyta && new RegExp('\\b' + breyta.replace(/\$/g, '\\$') + '\\s*\\.\\s*error\\b').test(eftir)) return;
      if (/\bif\s*\(\s*error\b|\bthrow\s+error\b/.test(eftir)) return;

      // Leiðir tómleiki lestrarins til innsetningar innan 25 lína?
      const svid = L.slice(i + 1, i + 26);
      let sasTomleika = false;
      for (let k = 0; k < svid.length; k++) {
        const s = svid[k];
        // 18.09.2026: athugasemdir voru taldar með og fjórar af tíu fyrstu
        // niðurstöðunum voru skýringartextar sem innihéldu orðið `.insert(`.
        // Vörður sem bendir á athugasemd eyðir tíma mannsins sem les hann.
        const sh = s.trim();
        if (sh.startsWith('//') || sh.startsWith('*') || sh.startsWith('/*')) continue;
        if (TOMLEIKI.test(s)) sasTomleika = true;
        if (sasTomleika && INNSETNING.test(s)) {
          fundid.push({
            rel, nr: i + 1,
            innsetning: i + 2 + k,
            lestur: hrein.slice(0, 88),
            skrif: s.trim().slice(0, 80),
          });
          break;
        }
      }
    });
  }
}

/* ── SKRALL ────────────────────────────────────────────────────────────────
 * Þrjú fundust og voru lagfærð 18.09.2026. Talan hér er mæld staða eftir það.
 * Hún má aðeins LÆKKA og markmiðið er 0. Nýtt tilvik fellir vörðinn strax, því hvert þeirra er
 * mögulegt tvítekið tæki eða tvítekin verkbeiðni — þ.e. tvítekin reikningslína.
 */
const EFTIR = 7;

for (const x of fundid) {
  console.log('  ' + x.rel + ':' + x.nr);
  console.log('      lestur     ' + x.lestur);
  console.log('      innsetning :' + x.innsetning + '  ' + x.skrif);
}
if (fundid.length) {
  console.log('\n  Lagfæring: lestu `.error` og STÖÐVAÐU — `null` má aldrei lesast sem „ekki til".');
  console.log("    const r = await sb.from('x').select('*').eq('serial', s);");
  console.log('    if (r && r.error) throw r.error;            // annars býrðu til tvítekning');
  console.log('');
}

if (fundid.length > EFTIR) {
  console.log('❌ ' + fundid.length + ' lestrar sem geta leitt til TVÍTEKNINGAR ('
    + (fundid.length - EFTIR) + ' fleiri en skrallið leyfir). Misheppnuð fyrirspurn lítur út eins og „ekki til".');
  process.exit(1);
}
if (fundid.length < EFTIR) {
  console.log('🟡 ' + fundid.length + ' eftir (voru ' + EFTIR + ') — lækkaðu EFTIR í ' + fundid.length + '.');
  process.exit(0);
}
// 18.09.2026: fyrri útgáfa prentaði „✅ Enginn óskoðaður lestur" um leið og talan
// stóð í stað — líka þegar hún stóð í sjö. Það er nákvæmlega falska græna hakið
// sem allt þetta verk snýst um. Grænt á aðeins við þegar talan er NÚLL.
if (!fundid.length) {
  console.log('✅ Enginn óskoðaður lestur leiðir til innsetningar — tvítekning getur ekki orðið til þannig.');
  process.exit(0);
}
console.log('🟡 EKKI GRÆNT — ' + fundid.length + ' óskoðaðir lestrar geta enn leitt til tvítekningar; '
  + 'ekkert nýtt bættist við. Hver þeirra er möguleg tvítekin lína á reikningi.');
process.exit(0);
