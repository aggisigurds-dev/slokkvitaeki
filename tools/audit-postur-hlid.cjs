#!/usr/bin/env node
/* audit-postur-hlid — póstsending appsins fer ALLTAF um /api/postur-senda, sem krefst innskráningar (15.11.2026).
 *
 * Póstþjónninn er brunaholf /api/gmail-send. Hann svaraði öllum án innskráningar: hver sem er gat sent póst sem
 * eldklar@/bokhald@ og látið senda sér skrár úr Drive-inu. Agnar 15.11.2026: „Já, smíða" — „aðeins innskráðir geti
 * sent". gmail-send krefst nú innskráningar á Brunahólfi eða tíma-tóka (x-postur-toki). Þessi vörður sér um
 * Slökkvitæki-hliðina:
 *   1. enginn vafrakóði kallar beint á brunaholf.netlify.app/api/gmail-send (yrði 401 — og opnaði leiðina aftur ef
 *      einhver „lagaði" það með því að opna gmail-send);
 *   2. postur-senda.cjs krefst innskráningar appsins (await krefjastStarfsmanns) ÁÐUR en það kallar áfram, og sendir tókann;
 *   3. 254 (AppMail) og Rýmingaráætlun nota /api/postur-senda;
 *   4. brúin í 254 tekur aðeins við skeytum frá brunaholf.netlify.app sem koma úr iframe í appinu;
 *   5. þjónn sem kallar á gmail-send (hub-adgangar.cjs) sendir tókann í sama kalli.
 * Systurhliðin (brunaholf/gmail-send.js) er skoðuð ef repo-ið er við höndina — ⚠ en ekki rautt, því sú mappa getur
 * verið á eftir origin; brunaholf prófar hliðið sjálft í tools/test-gmail-send-hlid.cjs.
 * Les aðeins kóðann (ekkert net, engir lyklar) — keyrir líka í `audit-all --static`.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const les = (r) => fs.readFileSync(path.join(ROT, r), 'utf8');
const anAths = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, ' ')).replace(/^[ \t]*\/\/.*$/gm, '');
const villur = [];
const vidvaranir = [];

// 1. enginn vafrakóði á beina slóð
function ganga(dir, ut) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '_attic', 'docs', 'tools', 'netlify', '.claude', 'graphify-out'].includes(n.name)) continue;
    const p = path.join(dir, n.name);
    if (n.isDirectory()) ganga(p, ut);
    else if (/\.(js|html|mjs)$/.test(n.name)) ut.push(p);
  }
  return ut;
}
const BEIN = /brunaholf\.netlify\.app\/api\/gmail-send/;
for (const f of ganga(ROT, [])) {
  const t = anAths(fs.readFileSync(f, 'utf8'));
  if (BEIN.test(t)) villur.push(`${path.relative(ROT, f)}: kallar beint á brunaholf /api/gmail-send — notaðu /api/postur-senda (eða AppMail.send)`);
}

// 2. millifallið
const ps = anAths(les('netlify/functions/postur-senda.cjs'));
const iHlid = ps.search(/await\s+H\.krefjastStarfsmanns\s*\(\s*event\s*\)/);
const iFetch = ps.search(/await\s+fetch\s*\(/);
if (iHlid < 0) villur.push('postur-senda.cjs: krefst ekki innskráningar (await H.krefjastStarfsmanns(event)) — hver sem er gæti sent póst');
else if (iFetch >= 0 && iFetch < iHlid) villur.push('postur-senda.cjs: kallar á póstþjóninn ÁÐUR en innskráning er staðfest');
if (!/if\s*\(\s*g\s*\)\s*return\s+g/.test(ps)) villur.push('postur-senda.cjs: niðurstöðu hliðsins er ekki skilað (if (g) return g)');
if (!/\[HAUS\]\s*:\s*posturToki\(\)/.test(ps)) villur.push('postur-senda.cjs: tókinn (x-postur-toki) fer ekki með — gmail-send svarar 401');

// 3. kallendur
const s254 = les('js/patches/254-receipt-sender.js');
if (!/const\s+GMAIL_SEND_API\s*=\s*'\/api\/postur-senda'/.test(s254)) villur.push('254: GMAIL_SEND_API er ekki /api/postur-senda');
const ryming = les('rymingaraetlun/index.html');
if (!/const\s+GMAIL_SEND_API\s*=\s*'\/api\/postur-senda'/.test(ryming)) villur.push('rymingaraetlun: GMAIL_SEND_API er ekki /api/postur-senda');

// 4. brúin
const bru = (/window\.addEventListener\('message'[\s\S]*?postur-senda-svar[\s\S]*?\}\);/.exec(s254) || [''])[0];
if (!bru) villur.push('254: brúin fyrir innfelldar Brunahólfs-síður fannst ekki (postur-senda-svar)');
else {
  if (!/e\.origin\s*!==\s*BH_ORIGIN\)\s*return/.test(bru)) villur.push('254 brú: athugar ekki uppruna skeytis (e.origin !== BH_ORIGIN)');
  if (!/contentWindow\s*===\s*e\.source/.test(bru)) villur.push('254 brú: athugar ekki að skeytið komi úr iframe í appinu');
  if (!/BH_ORIGIN\s*=\s*'https:\/\/brunaholf\.netlify\.app'/.test(s254)) villur.push('254 brú: BH_ORIGIN er ekki brunaholf.netlify.app');
}

// 5. þjónn sem kallar á gmail-send
const hub = anAths(les('netlify/functions/hub-adgangar.cjs'));
const kall = (/fetch\(MAIL_ORIGIN \+ '\/api\/gmail-send'[\s\S]{0,200}/.exec(hub) || [''])[0];
if (!kall) vidvaranir.push('hub-adgangar.cjs: fann ekki gmail-send kallið — uppfærðu vörðinn');
else if (!/\[POSTUR_HAUS\]\s*:\s*posturToki\(\)/.test(kall)) villur.push('hub-adgangar.cjs: aðgangspóstur fer án tóka — gmail-send svarar 401');

// systurhliðin
const sib = path.join(ROT, '..', 'brunaholf', 'netlify', 'functions', 'gmail-send.js');
if (fs.existsSync(sib)) {
  const g = anAths(fs.readFileSync(sib, 'utf8'));
  const iG = g.search(/const\s+g\s*=\s*await\s+hlid\(event\)/), iGet = g.search(/httpMethod\s*===\s*'GET'/);
  if (iG < 0 || !/erGildurToki/.test(g)) vidvaranir.push('brunaholf/gmail-send.js: hliðið sést ekki — opið, eða brunaholf-mappan á eftir origin (git pull)');
  else if (iGet >= 0 && iGet < iG) vidvaranir.push('brunaholf/gmail-send.js: GET svarað áður en hliðið er spurt');
}

for (const v of vidvaranir) console.log('   ⚠ ' + v);
if (villur.length) {
  console.log(`RED: ${villur.length} brot á póstleið appsins`);
  for (const v of villur) console.log('   • ' + v);
  process.exit(1);
}
console.log('✅ GRÆNT póstleið: allur póstur appsins fer um /api/postur-senda (innskráning + tóki); brúin tekur aðeins við úr Brunahólfs-iframe.');
