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

/* ── SKOÐAÐ OG DÆMT SAKLAUST ───────────────────────────────────────────────
 * Ber tala segir aðeins „þrjú eitthvað". Þessir þrír voru hver um sig lesnir og
 * dæmdir — og ástæðan stendur hér svo enginn rannsaki þá aftur. Detti staður út
 * af listanum (kóðinn breytist) fellur vörðurinn og krefst nýs dóms.
 */
const SAKLAUST = {
  'js/patches/178-beidnir.js': 'bæði skrifin eru .upsert(..., { onConflict: "email_id" }) '
    + 'á einkvæman lykil — brostinn lestur getur ekki búið til aðra röð, aðeins látið '
    + 'merki líta ómerkt út þar til síðan er endurhlaðin. Bæði lesa .error (17.09.2026).',
  'js/patches/270-report-facts-sync.js': 'lestrarnir fara gegnum `saekja()`, sem KASTAR nú '
    + 'á r.error (:230, lagað 18.09.2026 — þar stóð `break` sem skilaði tómum lista og lét '
    + 'computePlan búa til nýtt tæki fyrir HVERT tæki í skýrslunni). Skanninn sér ekki '
    + 'inn í umgjörðina og flaggar því kallstöðunum.',
};

const oskyrt = fundid.filter((x) => !SAKLAUST[x.rel]);
const skyrt = fundid.filter((x) => SAKLAUST[x.rel]);

/* Skrallið telur AÐEINS það sem enginn hefur dæmt. Markmiðið er 0. */
const EFTIR = 0;

if (skyrt.length) {
  console.log('  Skoðað og dæmt saklaust (' + skyrt.length + '):');
  const seen = new Set();
  for (const x of skyrt) {
    console.log('    · ' + x.rel + ':' + x.nr);
    if (!seen.has(x.rel)) { seen.add(x.rel); console.log('      ' + SAKLAUST[x.rel]); }
  }
  console.log('');
}
for (const x of oskyrt) {
  console.log('  ' + x.rel + ':' + x.nr);
  console.log('      lestur     ' + x.lestur);
  console.log('      innsetning :' + x.innsetning + '  ' + x.skrif);
}
if (oskyrt.length) {
  console.log('\n  Lagfæring: lestu `.error` og STÖÐVAÐU — `null` má aldrei lesast sem „ekki til".');
  console.log("    const r = await sb.from('x').select('*').eq('serial', s);");
  console.log('    if (r && r.error) throw r.error;            // annars býrðu til tvítekning');
  console.log('');
}

if (oskyrt.length > EFTIR) {
  console.log('\u274C ' + oskyrt.length + ' \u00f3d\u00e6mdir lestrar sem geta leitt til TV\u00cdTEKNINGAR.');
  console.log('   Misheppnu\u00f0 fyrirspurn l\u00edtur \u00fat eins og \u201eekki til\u201c \u2014 og \u00fe\u00e1 ver\u00f0ur til r\u00f6ng r\u00f6\u00f0.');
  process.exit(1);
}
if (!oskyrt.length) {
  console.log('\u2705 Enginn \u00f3d\u00e6mdur lestur lei\u00f0ir til innsetningar'
    + (skyrt.length ? ' (' + skyrt.length + ' sko\u00f0a\u00f0ir og d\u00e6mdir saklausir, sj\u00e1 a\u00f0 ofan).' : '.'));
  process.exit(0);
}
console.log('\ud83d\udfe1 EKKI GR\u00c6NT \u2014 ' + oskyrt.length + ' \u00f3d\u00e6mdir lestrar standa eftir.');
process.exit(0);
