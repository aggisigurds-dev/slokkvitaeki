#!/usr/bin/env node
/* Vörður — sjálfheilun botnstiku appanna setur SAMA display og CSS-ið (lota 9, 17.11.2026, Öpp-villa 12).
 *
 * Það sem gerðist: startShellGuard í 261-app-profiles.js lífgar stikuna (#_app-nav) við á 1,5 s fresti ef hún er
 * falin — en setti display:'grid' þótt stikan sé hönnuð sem flex-lína (CSS #_app-nav{…display:flex…}). Án
 * grid-dálka staflast hnapparnir lóðrétt og stikan þekur hálfan skjáinn.
 *
 * RAUTT ef display-gildið sem sjálfheilunin setur á nav (og á hdr) er annað en display í CSS-reglu sama elements.
 * Statískur: les aðeins kóðann.
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/patches/261-app-profiles.js'), 'utf8');
const brot = [];

function cssDisplay(id) {
  const m = new RegExp("'#" + id + "\\{([^}]*)\\}'").exec(src);
  if (!m) return null;
  const d = /(?:^|;)display:([a-z-]+)/.exec(m[1]);
  return d ? d[1] : null;
}
function heilunDisplay(breyta) {
  const m = new RegExp("getComputedStyle\\(" + breyta + "\\)\\.display === 'none'\\)\\s*" + breyta + "\\.style\\.display = '([a-z-]+)'").exec(src);
  return m ? m[1] : null;
}

for (const [id, breyta] of [['_app-nav', 'nav'], ['_app-hdr', 'hdr']]) {
  const css = cssDisplay(id);
  const heil = heilunDisplay(breyta);
  if (!css) { brot.push('fann ekki CSS-reglu #' + id + ' með display — vörðurinn þarf að uppfærast með kóðanum'); continue; }
  if (!heil) { brot.push('fann ekki sjálfheilun ' + breyta + '.style.display í startShellGuard — vörðurinn þarf að uppfærast'); continue; }
  if (css !== heil) brot.push('#' + id + ': CSS segir display:' + css + ' en sjálfheilunin setur ' + heil + ' — stikan brotnar þegar hún er lífguð við');
}

if (brot.length) {
  console.log('❌ audit-app-botnstika: ' + brot.length + ' brot');
  brot.forEach(b => console.log('   • ' + b));
  process.exit(1);
}
console.log('✅ audit-app-botnstika: sjálfheilun botnstiku og hauss setur sama display og CSS-ið (flex)');
