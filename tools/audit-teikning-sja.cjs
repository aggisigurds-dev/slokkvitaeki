#!/usr/bin/env node
/**
 * VÖRÐUR: skýrari grunnmynd og stærri merki á FloorPlan — án gæða-vals,
 * án nýrra hamra, án EI-stimpla og án veggja-uppfinningar.
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const villur = [];
const krefst = (src, re, msg) => { if (!re.test(src)) villur.push(msg); };
const html = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
const p436 = fs.readFileSync(path.join(rot, 'js/patches/436-teikning-sja.js'), 'utf8');
const p383 = fs.readFileSync(path.join(rot, 'js/patches/383-teikning-hreinsa-3d.js'), 'utf8');
const p434 = fs.readFileSync(path.join(rot, 'js/patches/434-teikning-takn.js'), 'utf8');
const p433 = fs.readFileSync(path.join(rot, 'js/patches/433-teikning-merking.js'), 'utf8');
const nf = fs.readFileSync(path.join(rot, 'js/newfeatures.js'), 'utf8');

krefst(html, /436-teikning-sja\.js\?v=20261002(c|stjorn)/, 'index.html: 436 vantar');
krefst(html, /383-teikning-hreinsa-3d\.js\?v=(20261002(sja|eyda|att|staerd|gaedi|eitt|stjorn|gra|draugur|hus|lod|her|veg|lot)|20261105a)/, 'index.html: 383 sja-cache');
krefst(html, /434-teikning-takn\.js\?v=20261002(sja|eyda|gaedi|stjorn)/, 'index.html: 434 sja-cache');
krefst(html, /newfeatures\.js\?v=20261002sja/, 'index.html: newfeatures sja-cache');
if (/435-teikning-gaedi/.test(p436)) villur.push('436 má ekki hlaða 435 gæði-vali');
if (/fp-gaedi/.test(p436)) villur.push('436 má ekki bæta gæði-hnöppum á gluggann');
krefst(p436, /brightness\(0\.82\).*contrast\(1\.55\)/, '436 vantar filter sem dökkvar fölgráar CAD-línur');
krefst(p436, /function stimpilPx/, '436 vantar stimpilPx');
// 02.11.2026: áður „≥ 32 px“ (fast 32–56 — of stórt á stórum teikningum, Nýbýlavegur). Nú miðað við húsið, lágmark 18 px (læsilegt á síma).
krefst(p436, /STIMPIL_MIN = 18/, 'stimplar þurfa lágmark 18 px (læsilegt á síma)');
krefst(p436, /function taknPx/, '436 vantar taknPx');
krefst(p436, /26 \/ sc/, 'tákn eiga að vera ~26 skjápunktar');
krefst(p436, /TeiknGaedi\.bindSrc/, '436 _loadImg á að láta gæði ráða þegar 435 er til');
krefst(p436, /teikn-pdf/, '436 á að teikna vigur-PDF innvortis (Full gæði án vals)');
krefst(p436, /imageUrl: url/, '436 má ekki vista blob-slóð í teikning_bord');
krefst(p436, /bindSrc/, '436 vantar bindSrc');
krefst(p383, /globalAlpha = 0\.85/, '383 má ekki deyfa blaðið niður í 0.3');
krefst(p383, /TeiknSja\.stimpilPx|TeiknMerking\.stimpilPx|Math\.max\(32/, '383 yfirlag á að teikna stimpla ≥ 32 px');
krefst(p383, /TeiknSja\.bindSrc/, '383 á að nota bindSrc svo PDF verði skýrt');
krefst(p434, /shadowColor/, '434 tákn þurfa svartan ramma svo þau lesist á ljósri teikningu');
krefst(p434, /TeiknSja\.taknPx|26 \/ sc/, '434 tæki eiga að fylgja skjástærð');
krefst(p433, /gripPx|bd = 28/, '433 grip á merki of lítið fyrir stærri stimpla');
krefst(nf, /TeiknSja\.punkturPx|14\/sc/, 'newfeatures rauði punkturinn á að vera ~14 skjápunktar');
if (/kind === 'firewall'|stimpla eldvegg/i.test(p436)) villur.push('436 má ekki stimpla EI/eldveggi');
if (/v\.a = true/.test(p436)) villur.push('436 má ekki kveikja Skýrari veggir sjálfkrafa');

function stimpilPx(crWidth, husHlutfall) {   // afrit af 436 (STIMPIL_DEILIR 48, MIN 18, MAX 40)
  const w = Number(crWidth) || 0;
  if (!(w > 0)) return 16;
  const f = husHlutfall > 0 && husHlutfall <= 1 ? husHlutfall : 1;
  return Math.max(18, Math.min(40, Math.round(w * f / 48)));
}
function taknPx(cw, sc) {
  const a = Math.round((Number(cw) || 0) / 70);
  const b = (sc > 0 && isFinite(sc)) ? Math.round(26 / sc) : 26;
  return Math.max(22, a, b);
}
if (stimpilPx(360) < 18) villur.push('sími 360 px: stimpill undir 18 px');
if (stimpilPx(1200) > 30) villur.push('skjáborð 1200 px: stimpill yfir 30 px (á að vera ~1/48 af breidd hússins)');
const sc = 360 / 6006;
if (taknPx(6006, sc) * sc < 24) villur.push('sími: tæki undir 24 skjápunktum (' + (taknPx(6006, sc) * sc).toFixed(1) + ')');

if (villur.length) {
  console.log('TEIKNING-SJA RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-SJA GRÆNT — contrast, PDF innvortis, stimplar ≥18 px og miðaðir við húsið, engir gæða-hnappar.');
process.exit(0);
