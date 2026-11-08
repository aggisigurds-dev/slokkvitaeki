#!/usr/bin/env node
'use strict';
/* Öryggisnet — VERKEFNALISTINN MÁ AÐEINS BERA SJÖ FLOKKA (08.11.2026).
 *
 * Agnar: „maður reyna að klára meira af honum og flokka hann."
 *
 * MÆLT ÁÐUR EN FLOKKAÐ VAR: 100 opin verk báru ÁTJÁN ólík flokksheiti fyrir svona sjö hugtök —
 * `gagnaheilbrigdi` OG `gagnaheilb`, `kodi` OG `frontend` OG `utlit`, `customer` á ensku, og
 * ruslakistan `allt` með tólf verkum. Flokkur sem þýðir allt þýðir ekkert.
 *
 * Þetta er þriðji dálkurinn í sama kerfi sem fer svona: `thjonustubeidni.priority` ber tólf
 * ritmyndir fyrir fimm hugtök OG ENGINN LES HANN, og `uttaeki.custody_status` ber sjö gildi í
 * tveimur stafsetningum. Frjáls textadálkur sem enginn vaktar fyllist alltaf.
 *
 * KANÓNAN ER EKKI MÍN — HÚN ER ÞEGAR TIL. Fyrsta útgáfa þessa varðar mældi gegn sjö flokkum
 * sem ÉG fann upp og sagði að 68 af 100 væru rangir. Það var rangt hjá mér: `CAT_LABELS` í
 * brunaholf/verkefnalisti.html skilgreinir flokkana, síðan hópar og síar eftir þeim og teiknar
 * `.cat-<lykill>` merki fyrir hvern. Að finna upp aðra kanónu hefði búið til nákvæmlega þá
 * tvöföldun sem vörðurinn á að hindra.
 *
 * KANON hér er því afrit af CAT_LABELS. Bætist flokkur þar þarf hann líka hingað — og öfugt.
 *
 * TVENNT SEM MÆLDIST RANGT GAGNVART RAUNVERULEGU KANÓNUNNI (08.11.2026):
 *   • 24 verk báru `villa`, sem var EKKI í CAT_LABELS — merkið birtist ómerkt og datt úr
 *     síunni. LEYST 08.11.2026: `villa` bættist í CAT_LABELS og fékk .cat-villa reglu.
 *   • `gagnaheilb` (2), `postur` (1), `taeki` (1), `verk` (1) eru stafsetningarslys eða ný heiti.
 *   • `allt` (12) er í kanónunni en segir ekkert — það er sjálfgefna gildið í API-inu
 *     (netlify/functions/verkefnalisti.js: category: body.category ? … : 'allt'), svo hvert verk
 *     sem er stofnað án flokks lendir þar. Rótin er sjálfgefna gildið, ekki fólkið.
 *
 * Vörðurinn er STATÍSKUR gagnvart kóða en les listann; hann skrifar aldrei.
 */
const fs = require('fs');
const path = require('path');

// Afrit af CAT_LABELS í brunaholf/verkefnalisti.html (lesið 08.11.2026).
const KANON = ['allt', 'utlit', 'customer', 'skjol', 'reikning', 'bakendi', 'oryggi',
               'vefryni', 'listi', 'sala', 'utkall', 'gagnaheilbrigdi', 'frontend',
               'kodi', 'kerfi', 'villa'];
// `allt` er í kanónunni en er ruslakista — talin sérstaklega, ekki sem villa.
const RUSLAKISTA = 'allt';

const CFG = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
const nad = (re) => { const m = re.exec(CFG); return m ? m[1] : null; };
const URL_ = nad(/SUPABASE_URL\s*=\s*['"]([^'"]+)/);
const KEY = nad(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/);
if (!URL_ || !KEY) { console.log('RED: fann ekki SUPABASE_URL/KEY í js/config.js'); process.exit(1); }

(async () => {
  const r = await fetch(URL_ + '/rest/v1/verkefnalisti?select=id,title,category,status'
    + '&status=in.(beidni,i_yfirferd)&limit=1000',
    { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  if (!r.ok) { console.log('RED: verkefnalisti svaraði ekki (HTTP ' + r.status + ') — ÓMÆLT, ekki grænt.'); process.exit(1); }
  const verk = await r.json();
  if (!Array.isArray(verk) || !verk.length) {
    console.log('RED: engin opin verk lásust — tómt svar er ekki staðreynd.');
    process.exit(1);
  }

  const utan = new Map();
  let anFlokks = 0;
  verk.forEach((v) => {
    const f = String(v.category || '').trim();
    if (!f) { anFlokks++; return; }
    if (KANON.includes(f)) return;
    if (!utan.has(f)) utan.set(f, []);
    utan.get(f).push(String(v.id).slice(0, 8));
  });

  const notadir = KANON.filter((k) => verk.some((v) => v.category === k));
  console.log('   ' + verk.length + ' opin verk · '
    + notadir.map((k) => k + ' ' + verk.filter((v) => v.category === k).length).join(' · '));
  const iRusli = verk.filter((v) => v.category === RUSLAKISTA).length;
  if (iRusli) console.log('   ⚠ ' + iRusli + ' verk í „allt" — flokkur sem segir ekkert. '
    + 'Rótin er sjálfgefna gildið í netlify/functions/verkefnalisti.js.');

  if (utan.size || anFlokks) {
    [...utan.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([f, ids]) =>
      console.log('   ✗ „' + f + '" — ' + ids.length + ' verk: ' + ids.slice(0, 6).join(', ')
        + (ids.length > 6 ? ' …' : '')));
    if (anFlokks) console.log('   ✗ án flokks: ' + anFlokks + ' verk');
    console.log('RED: ' + ([...utan.values()].reduce((a, x) => a + x.length, 0) + anFlokks)
      + ' verk bera flokk utan kanónunnar.');
    console.log('KANÓNAN (CAT_LABELS í brunaholf/verkefnalisti.html): ' + KANON.join(' · '));
    console.log('HVAÐ ÞAÐ ÞÝÐIR: síðan hópar og síar eftir flokki og teiknar .cat-<lykill> merki. '
      + 'Flokkur sem er ekki í CAT_LABELS birtist ómerktur og dettur úr síunni. Veldu úr '
      + 'kanónunni — eða bættu flokknum við BÆÐI CAT_LABELS (með CSS-reglu) OG KANON hér.');
    process.exitCode = 1;
  } else {
    console.log('✅ GRÆNT verkefni-flokkar: öll ' + verk.length + ' opin verk bera flokk úr kanónunni.');
  }
})().catch((e) => { console.log('RED: audit-verkefni-flokkar sprakk: ' + e.message); process.exitCode = 1; });
