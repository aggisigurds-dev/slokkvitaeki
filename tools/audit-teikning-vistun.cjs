#!/usr/bin/env node
/**
 * VÖRÐUR: VISTUN TEIKNINGA SKRIFAR EKKI YFIR AÐRAR VÉLAR (375 TeiknVistun.skrifa)
 *
 * Agnar 05.10.2026: „eru einhverjir gallar eftir í kerfinu …" → „Mátt laga það sem þú getur". Eitt af því sem stóð
 * eftir: þrír staðir skrifuðu ALLA röðina í teikning_bord (hæðir, skurð, merki) úr minni vafrans án þess að líta á
 * þjóninn — Vista (375), hver færsla merkis (433) og „Opna í TurboPaint" (383). Gluggi sem stóð opinn í símanum
 * skrifaði því þegjandi yfir það sem önnur vél hafði gert á meðan (skurð, nýja hæð, merki á sömu hæð). Reglan
 * SAMSTILLT MILLI VÉLA (CLAUDE.md) á við: fjórar tölvur og sími vinna í sömu gögnum.
 *
 * Nú fer allt um TeiknVistun.skrifa(): röðin er lesin fersk rétt fyrir skrif og SAMEINUÐ hafi einhver annar skrifað
 * síðan þessi vafri sá hana síðast. Sameiningin (sameinaVidFerska) er hrein gagnavinnsla og er PRÓFUÐ HÉR á tilbúnum
 * gögnum — sex tilvik — auk þess sem leitað er að því að enginn skrifi framhjá henni.
 * Les aðeins kóðann (ekkert net, engir lyklar).
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const les = p => fs.readFileSync(path.join(rot, p), 'utf8').replace(/\r/g, '');
const s375 = les('js/patches/375-teikning-vistun.js'), s433 = les('js/patches/433-teikning-merking.js'), s383 = les('js/patches/383-teikning-hreinsa-3d.js');
const villur = [];
const krefst = (src, re, skilabod) => { if (!re.test(src)) villur.push(skilabod); };
const bannar = (src, re, skilabod) => { if (re.test(src)) villur.push(skilabod); };

let sam = null;
try {
  const a = s375.indexOf('  var _sed = {};'), b = s375.indexOf('  function uppfaeraRitil(');
  if (a < 0 || b < 0 || b < a) throw new Error('fann ekki sameinaVidFerska í 375');
  sam = new Function(s375.slice(a, b) + '; return sameinaVidFerska;')();
} catch (e) { villur.push('375: sameinaVidFerska hleðst ekki sjálfstætt (' + e.message + ') — hún verður að vera hrein gagnavinnsla'); }

const M = (id, x, y) => ({ unitId: id, x, y });
const H = (id, mynd, merki, auka) => Object.assign({ id, nafn: id, image_url: mynd, markers: merki }, auka || {});
const lyklar = h => (h.markers || []).map(m => String(m.unitId)).sort().join(',');
if (sam) {
  // 1 · önnur vél breytti SKURÐI, þessi vafri færði merki → skurður þjónsins stendur, staða merkisins héðan
  {
    const sed = { ids: ['a'], merki: { a: ['1', '2'] } };
    const minar = [H('a', 'm1', [M(1, 500, 500), M(2, 20, 20)], { skurdur: { x: 0, y: 0, w: 100, h: 100 } })];
    const ferskar = [H('a', 'm1', [M(1, 10, 10), M(2, 20, 20)], { skurdur: { x: 5, y: 5, w: 50, h: 50 }, syn: { a: true, fest: true } })];
    const ut = sam(minar, ferskar, sed);
    if (ut.length !== 1 || ut[0].skurdur.w !== 50 || !ut[0].syn || !ut[0].syn.fest) villur.push('sameining 1: skurður og fest útlit sem önnur vél vistaði verða að standa, fékk ' + JSON.stringify(ut[0] && ut[0].skurdur));
    else if (ut[0].markers.find(m => m.unitId === 1).x !== 500) villur.push('sameining 1: merki sem var fært HÉR verður að halda nýju stöðunni');
  }
  // 2 · önnur vél BÆTTI merki við sömu hæð (3), og merki 2 var EYTT hér → 3 helst, 2 kemur ekki aftur
  {
    const sed = { ids: ['a'], merki: { a: ['1', '2'] } };
    const ut = sam([H('a', 'm1', [M(1, 10, 10)])], [H('a', 'm1', [M(1, 10, 10), M(2, 20, 20), M(3, 30, 30)])], sed);
    if (lyklar(ut[0]) !== '1,3') villur.push('sameining 2: merki sem önnur vél bætti við á að haldast og merki sem var eytt hér má ekki koma aftur — fékk ' + lyklar(ut[0]));
  }
  // 3 · önnur vél bætti við HÆÐ (c); hæð b var EYTT hér → c helst, b kemur ekki aftur
  {
    const sed = { ids: ['a', 'b'], merki: { a: [], b: [] } };
    const ut = sam([H('a', 'm1', [])], [H('a', 'm1', []), H('b', 'm2', []), H('c', 'm3', [M(9, 1, 1)])], sed);
    if (ut.map(h => h.id).join(',') !== 'a,c') villur.push('sameining 3: hæð sem önnur vél bætti við á að haldast og hæð sem var eytt hér má ekki koma aftur — fékk ' + ut.map(h => h.id).join(','));
  }
  // 4 · tæki 7 var fært HÉR af hæð a á hæð b; þjónninn á það enn á a → aðeins á b (tæki er á einni hæð)
  {
    const sed = { ids: ['a', 'b'], merki: { a: ['7'], b: [] } };
    const ut = sam([H('a', 'm1', []), H('b', 'm2', [M(7, 5, 5)])], [H('a', 'm1', [M(7, 1, 1)]), H('b', 'm2', [])], sed);
    if (lyklar(ut[0]) !== '' || lyklar(ut[1]) !== '7') villur.push('sameining 4: tæki sem var fært á aðra hæð hér má ekki birtast á báðum — a: „' + lyklar(ut[0]) + '", b: „' + lyklar(ut[1]) + '"');
  }
  // 5 · þessi vafri sá röðina ALDREI (sed = null) og á gervihæð með öðru auðkenni en sömu mynd → engin aukahæð verður til
  {
    const ut = sam([H('gervi', 'm1', [M(1, 9, 9)])], [H('a', 'm1', [M(2, 2, 2)], { skurdur: { x: 1, y: 1, w: 9, h: 9 } }), H('b', 'm2', [])], null);
    if (ut.length !== 2 || ut[0].id !== 'a' || lyklar(ut[0]) !== '1,2' || !ut[0].skurdur) villur.push('sameining 5: gervihæð með sömu mynd á að renna saman við hæð þjónsins (engin aukahæð, engin hæð núlluð) — fékk ' + ut.map(h => h.id + ':' + lyklar(h)).join(' | '));
  }
  // 6 · NÝ mynd á hæðinni hér → hæðin héðan stendur óbreytt (skurður þjónsins átti við gömlu myndina)
  {
    const sed = { ids: ['a'], merki: { a: [] } };
    const ut = sam([H('a', 'ny', [M(1, 1, 1)])], [H('a', 'gomul', [M(5, 5, 5)], { skurdur: { x: 1, y: 1, w: 9, h: 9 } })], sed);
    if (ut.length !== 1 || ut[0].image_url !== 'ny' || ut[0].skurdur || lyklar(ut[0]) !== '1') villur.push('sameining 6: hæð sem fékk nýja mynd hér má ekki erfa skurð eða merki gömlu myndarinnar');
  }
  // engin fersk röð → það sem er hér fer óbreytt
  if (sam([H('a', 'm1', [])], [], null).length !== 1) villur.push('sameining: án ferskrar raðar á röðin héðan að fara óbreytt');
}

// Enginn skrifar framhjá skrifa(): eina upsert-kallið á töfluna í 375 er inni í skrifa(), og 433 / 383 nota það.
krefst(s375, /if \(f && Array\.isArray\(f\.haedir\) && f\.haedir\.length && \(!s \|\| timi\(f\.updated_at\) !== s\.t\)\) \{\s+row\.haedir = sameinaVidFerska\(row\.haedir, f\.haedir, s\);/, '375: skrifa() verður að lesa röðina ferska og sameina þegar einhver annar hefur skrifað síðan þessi vafri sá hana');
krefst(s375, /skrifa\(cid, row\)\.then\(function \(r\) \{/, '375: Vista (serverUpsert) verður að fara um skrifa()');
krefst(s375, /sja\(cid, row\.updated_at, row\.haedir\);\s+var plan = FloorPlan\.plans\[cid\]/, '375: sókn raðarinnar verður að skrá hvað þessi vafri sá (sja) — annars er ekkert til að bera saman við');
krefst(s375, /if \(sameinad\) uppfaeraRitil\(cid, row\);/, '375: eftir sameinuð skrif verður ritillinn að fá niðurstöðuna — annars byggja næstu skrif á úreltu minni og skrifa yfir');
if ((s375.match(/\.upsert\(/g) || []).length !== 1) villur.push('375: aðeins EITT upsert-kall má vera í skránni (inni í skrifa) — fann ' + (s375.match(/\.upsert\(/g) || []).length);
krefst(s433, /window\.TeiknVistun && TeiknVistun\.skrifa\s+\? TeiknVistun\.skrifa\(cid, row\)/, '433: færsla merkis verður að vistast um TeiknVistun.skrifa (sameinað við ferska röð)');
krefst(s383, /window\.TeiknVistun && TeiknVistun\.skrifa\s+\? await TeiknVistun\.skrifa\(cid, rodin\)/, '383: „Opna í TurboPaint" verður að vista um TeiknVistun.skrifa');
krefst(s383, /TeiknVistun\.sja\(cid, uppf, nyjar\)/, '383: sjálfvistun stillinga verður að láta 375 vita að þessi vafri skrifaði röðina (sja) — annars sameinar næsta merkjavistun að óþörfu');

// TEIKNINGARBORÐINN Á PRÓFÍLNUM (newfeatures _coFpInject, 109, floorplanfix) — sama regla um þjóninn: borðinn má ekki
// ráðast af minni vafrans, hann fylgir skurði hæðarinnar, og myndin er ekki sótt meðan hann er falinn.
const sNf = les('js/newfeatures.js'), s109 = les('js/patches/109-floorplan-banner.js'), sFix = les('js/floorplanfix.js'), s434 = les('js/patches/434-teikning-takn.js');
krefst(sNf, /if \(!fp\.imageUrl\) \{ _coFpSaekja\(id\); return; \}/, 'newfeatures: án teikningar í minni vafrans verður borðinn að sækja röðina á þjóninn (annars vantar hann á hverju nýju tæki)');
krefst(sNf, /if \(synilegt\(\)\) hlada\(\);\s+else \{\s+_coFpVakt = new MutationObserver/, 'newfeatures: mynd borðans má aðeins sækja þegar hann sést (var sótt og teiknuð í 6000 dílum við hverja opnun prófíls)');
krefst(sNf, /cv\.dataset\.fpX0 = String\(sx \/ f\); cv\.dataset\.fpY0 = String\(sy \/ f\); cv\.dataset\.fpKv = String\(kvS \* f\);/, 'newfeatures: borðinn verður að fylgja skurði fyrstu hæðar og segja 109 / floorplanfix hvernig díl-merki varpast');
krefst(sNf, /var kvS = Math\.min\(1, 3000 \/ Math\.max\(sw, sh\)\);/, 'newfeatures: strigi borðans má mest vera 3000 dílar á lengri hlið');
krefst(s109, /const xR = dill \? \(\(mk\.x - fpX0\) \* fpKv\) \/ natW : mk\.x;/, '109: punktar borðans verða að nota vörpun strigans (skurður + smækkun)');
krefst(sFix, /if\(x > 1 \|\| y > 1\)\{ mx = \(x - fpX0\) \* fpKv; my = \(y - fpY0\) \* fpKv; \}/, 'floorplanfix: merki á striga borðans verða að nota vörpun strigans');
krefst(sFix, /canvas\.dataset\.fpfixCoid !== String\(currentCoId\) && canvas\.dataset\.fpfixMarked\)\{/, 'floorplanfix: data-fpfix-marked má ekki skrifa (sama gildi) á 600 ms fresti');
// TÆKJAMERKIN (434): hvítur kútur á málmplötu með borða í lit tegundar — Agnar 05.10.2026.
krefst(s434, /lettvatn: \{ bg: '#e11d2e', fg: '#fff', band: '#14b8a6' \},\s+duft: \{ bg: '#e11d2e', fg: '#fff', band: '#2563eb' \},\s+co2: \{ bg: '#e11d2e', fg: '#fff', band: '#111827', horn: true \},/, '434: slökkvitækin eiga að bera borða í lit tegundar (léttvatn sægrænt, duft blátt, CO₂ svart með trekt)');
krefst(s434, /teiknaGlyff\(ctx, glyffId, litur\.fg, litur\.outline, litur\);/, '434: táknið verður að fá litina (borða / trekt) — annars eru öll slökkvitæki eins');
if (villur.length) { console.log('RED  TEIKNING-VISTUN — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('TEIKNING-VISTUN GRÆNT — öll skrif á teikning_bord fara um eina leið sem les röðina ferska og sameinar (6 tilvik prófuð); borðinn á prófílnum kemur af þjóninum, skorinn.');
process.exit(0);
