#!/usr/bin/env node
/**
 * VÖRÐUR: „Skjöl félagsins" á Rekstrarfélögum (175) — upphlaðið skjal verður að vera OPNANLEGT.
 *
 * Agnar 09.10.2026: hlóð samantekt reykskynjara upp á Center Hótel („+ Hlaða upp" → CompanyAttachments.upload,
 * lykill 'rf:Center Hótel'). Skjalið birtist sem nafn en ekkert var hægt að gera við það: listinn sýndi „opna"
 * AÐEINS fyrir drive_url/url, og upphlaðið skjal ber eingöngu `path` í samningar-fötunni. Mælt á framleiðslu
 * (Playwright, Rekstrarfélög → Center Hótel): 0 opna-hlekkir á 1 upphlöðnu skjali; eftir lagfæringu 1 hlekkur
 * og forskoðunin skilar 200 image/png.
 *
 * Vörðurinn KEYRIR raunverulega línusmiðinn úr 175 (ekki bara textaleit) á tveimur gervi-skjölum:
 *   · upphlaðið (aðeins path)  → verður að fá ._rf_docopen með data-doc-id
 *   · Drive-tengill (drive_url) → verður áfram að fá <a href=…>
 * og athugar að smellur á ._rf_docopen sé tengdur við CompanyAttachments.openPreview.
 * Les aðeins kóðann (ekkert net, engir lyklar).
 */
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'js/patches/175-rekstrarfelog.js'), 'utf8').replace(/\r/g, '');
const villur = [];

const upphaf = s.indexOf('var docHtml=docs.length? docs.map(function(d){');
const endir = upphaf < 0 ? -1 : s.indexOf("}).join('')", upphaf);
if (upphaf < 0 || endir < 0) {
  villur.push('175: fann ekki línusmið „Skjöl félagsins" (var docHtml=docs.length? docs.map(…))');
} else {
  const kodi = s.slice(upphaf + 'var docHtml=docs.length? docs.map('.length, endir + 1); // function(d){ … }
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let smidur = null;
  try { smidur = new Function('esc', 'return (' + kodi + ');')(esc); } catch (e) { villur.push('175: línusmiðurinn þáttaðist ekki: ' + e.message); }
  if (smidur) {
    const upp = smidur({ id: 'a_1_test', name: 'samantekt.png', path: 'company_attachments/rf_Center_H_tel/1_samantekt.png' });
    if (!/class="_rf_docopen"/.test(upp) || !/data-doc-id="a_1_test"/.test(upp)) villur.push('175: upphlaðið skjal (aðeins path) fær engan opna-takka (._rf_docopen + data-doc-id)');
    const drv = smidur({ id: 'drv_1', name: 'samningur.pdf', drive_url: 'https://drive.google.com/file/d/X/view' });
    if (!/<a href="https:\/\/drive\.google\.com\/file\/d\/X\/view"/.test(drv)) villur.push('175: Drive-tengill missti <a href> „opna"');
    const tomt = smidur({ id: 'm_1', name: 'skráning án skjals' });
    if (/_rf_docopen|<a /.test(tomt)) villur.push('175: skráning án skjals á ekki að fá opna-takka');
  }
}
const vir = s.indexOf("closest('._rf_docopen')");
if (vir < 0) villur.push('175: enginn smellhlustari á ._rf_docopen');
else if (!/CompanyAttachments\.openPreview\(d\)/.test(s.slice(vir, vir + 600))) villur.push('175: smellur á ._rf_docopen kallar ekki á CompanyAttachments.openPreview');

if (villur.length) { console.log('RED  RF-SKJÖL-OPNA — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('RF-SKJÖL-OPNA GRÆNT — upphlaðið skjal félagsins fær „opna" sem opnar forskoðun; Drive-tenglar óbreyttir.');
process.exit(0);
