#!/usr/bin/env node
/**
 * VÖRÐUR: GREINING FASTEIGNAR (451) — sýndarfyrirtækið skrifar aldrei, og síðan skrifar aðeins sín tvö skrif.
 *
 * „Greining fasteignar" opnar raunverulega fyrirtækjaprófílinn fyrir sýndarfyrirtæki (auðkenni -987654321). Prófílpappar
 * skrifa við opnun og við smelli (mælt 09.10.2026: app_settings_merge co_bygging_mynd, geymsla verkbord-files/bygging/<id>/,
 * banner_note, uttaeki …). Eina vörnin sem nær þeim ÖLLUM er js/sydarvordur.js, hlaðin á undan supabase-js-biðlaranum.
 * Þessi vörður sér til þess að hún standi — og að síðan sjálf fari ekki aðrar leiðir:
 *   1. sydarvordur.js er hlaðin í index.html Á UNDAN rest-samnyting.js og db.js (supabase-js grípur fetch við createClient)
 *   2. vörðurinn vefur fetch, XMLHttpRequest og sendBeacon og stöðvar allt sem ber 987654321 — og 451 notar SAMA auðkenni
 *   3. 451 skrifar AÐEINS: fasteign_greining (tegund 'eign') og automation_triggers (workflow 'bygging-ocr') — aldrei
 *      teikning_bord (Teikning á eina skrifleið: TeiknVistun 375), aldrei fyrirtaeki / uttaeki / stadur_*
 *   4. Kaupskrá HMS er hvergi notuð (Agnar hefur ekki farið yfir skilmálana) og engar OSM-kortaflísar
 *   5. töflur 451 bera data-_pm-status-done (00-legacy setur annars tækja-fellilista í hverja töflu með „Staða"-haus)
 *   6. heimildaskráin (js/data/greining-heimildir.json) er gilt JSON og hvert auðkenni sem síðan les er í henni
 * Les aðeins kóðann (ekkert net, engir lyklar).
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const les = (p) => fs.readFileSync(path.join(rot, p), 'utf8');
const villur = [];
const krefst = (ok, t) => { if (!ok) villur.push(t); };

const idx = les('index.html');
const iV = idx.indexOf('/js/sydarvordur.js'), iR = idx.indexOf('/js/rest-samnyting.js'), iD = idx.indexOf('/js/db.js');
krefst(iV > 0, 'index.html: js/sydarvordur.js er ekki hlaðin');
krefst(iV > 0 && iR > 0 && iV < iR && iV < iD, 'index.html: sydarvordur.js verður að koma Á UNDAN rest-samnyting.js og db.js (supabase-js grípur fetch við createClient)');
krefst(/<script src="\/js\/sydarvordur\.js[^"]*"><\/script>/.test(idx), 'index.html: sydarvordur.js má hvorki vera defer né async — hún verður að keyra áður en db.js býr til biðlarann');
krefst(idx.includes('/js/patches/451-greining-fasteignar.js'), 'index.html: 451-greining-fasteignar.js er ekki hlaðin');

const v = les('js/sydarvordur.js');
krefst(/var ID = -987654321;/.test(v) && /var TAKN = \/\(\?:\^\|\[\^0-9\.\]\)987654321\(\?!\[0-9\]\)\/;/.test(v), 'sydarvordur.js: auðkennið -987654321 / mynstrið (heil tala 987654321, aldrei brot úr kommutölu) vantar');
// mynstrið sjálft prófað: grípur auðkennið í öllum myndum, aldrei brot úr kommutölu (vistun teikningar með þúsundum talna)
try {
  const T = new RegExp(v.match(/var TAKN = \/(.+)\/;/)[1]);
  const ja = ['/rest/v1/fyrirtaeki?id=eq.-987654321', '{"p":{"-987654321":1}}', '/storage/v1/object/x/bygging/-987654321/a.jpg', '{"fyrirtaeki_id":-987654321}', '%2D987654321'];
  const nei = ['{"x":0.1987654321}', '[10.987654321,2]', '9876543210', '1987654321'];
  krefst(ja.every((s) => T.test(s)), 'sydarvordur.js: mynstrið missir af auðkenninu í einhverri mynd');
  krefst(!nei.some((s) => T.test(s)), 'sydarvordur.js: mynstrið grípur brot úr kommutölu / lengri tölu — lögmæt vistun gæti stöðvast');
} catch (e) { villur.push('sydarvordur.js: mynstrið er ekki prófanlegt (' + e.message + ')'); }
krefst(/window\.fetch = function/.test(v), 'sydarvordur.js: vefur ekki window.fetch');
krefst(/XP\.send = function/.test(v), 'sydarvordur.js: vefur ekki XMLHttpRequest.send');
krefst(/navigator\.sendBeacon = function/.test(v), 'sydarvordur.js: vefur ekki navigator.sendBeacon');
krefst(/status: 403/.test(v), 'sydarvordur.js: stöðvað skrif á að fá 403-svar (supabase-js skilar því sem .error)');

const g = les('js/patches/451-greining-fasteignar.js');
krefst(/const SYND = \(window\.Sydarvordur && Sydarvordur\.ID\) \|\| -987654321;/.test(g), '451: SYND verður að vera auðkenni sýndarvarðarins (Sydarvordur.ID)');
// skrif 451: aðeins þessi tvö
const skrif = [...g.matchAll(/\.from\('([a-z_]+)'\)\s*\.(insert|upsert|update|delete)\(/g)].map((m) => m[1] + '.' + m[2]);
const leyfd = new Set(['fasteign_greining.upsert', 'automation_triggers.insert']);
const ologleg = skrif.filter((s) => !leyfd.has(s));
krefst(!ologleg.length, '451: óleyfð skrif — ' + ologleg.join(', ') + ' (aðeins fasteign_greining.upsert og automation_triggers.insert)');
krefst(/upsert\(\{ lykill: lyk, tegund: 'eign'/.test(g), '451: skyndiminnisröðin verður að vera tegund \'eign\' (RLS leyfir vafranum ekki annað)');
krefst(/insert\(\{ workflow: 'bygging-ocr', status: 'bida'/.test(g), '451: OCR-beiðnin verður að vera workflow \'bygging-ocr\' með status \'bida\'');
krefst(!/teikning_bord'\)\s*\.(insert|upsert|update)/.test(g), '451: skrifar í teikning_bord — eina skrifleiðin er TeiknVistun (375)');
krefst(/TeiknBord\.finnaAlltHusid\(\)/.test(g), '451: „Setja í Teikningu" á að nota Finna allt húsið (383) — ekkert vistast fyrr en Vista í Teikningu');
krefst(/TeiknSaekja\.finna\(SYND\)/.test(g), '451: teikningaleitin á að vera 374 (TeiknSaekja.finna) — ekki afrit af henni');
krefst(/TeikningaForskodun\.opna\([^)]*, null,/.test(g), '451: forskoðun (384) á að opnast ÁN félags (annars opnar „Opna í TurboPaint" borð fyrir sýndarauðkennið)');
// 7. forskoðun teikninga (09.10.2026): smámyndir latt (IntersectionObserver), mest 2 PDF-teikningar í einu, PDF af SÖMU rót
//    (teikn-pdf — söfn Kópavogs/Garðabæjar/Hafnarfjarðar senda enga CORS-hausa) og hæðagreining 374 (TeiknSaekja.flokka)
krefst(/HAMARK: 2 \}/.test(g) && /FSK\.virk < FSK\.HAMARK/.test(g), '451: forskoðunin verður að takmarka samtímis PDF-teikningar (FSK.HAMARK: 2)');
krefst(/new IntersectionObserver\(/.test(g) && /FSK\.io\.observe\(el\)/.test(g), '451: smámyndir eiga að hlaðast latt — aðeins þær sem sjást (IntersectionObserver)');
krefst(/fetch\(PDFF \+ '\?url=' \+ encodeURIComponent\(slod\)/.test(g), '451: PDF-forskoðun á að sækja skjalið um teikn-pdf (sama rót) — beint úr safninu stoppar CORS');
krefst(/TeiknSaekja\.flokka\(/.test(g), '451: flokkun blaða og hæða á að vera 374 TeiknSaekja.flokka (sama og „Finna allt húsið“) — ekki eigin afrit');
krefst(!/data-gr-a="pdfhaed"|PDF-teikning — smelltu til að birta/.test(g), '451: „PDF — smelltu til að birta“-reitir eru aflagðir; PDF-hæðir teiknast latt');
// 8. Greining → prófíllinn (452, 09.10.2026): „Færa í prófíl", „Greining"-takkinn og „Stofna sem viðskiptavin"
//    · ALDREI yfirskrift á fylltum reit: hver reitur lesinn aftur rétt fyrir skrif (tomtNu) og handval tegundar líka
//    · ein skrifleið í reitina: 363 vistaReit (sama og prófíllinn) — 452 snertir enga töflu beint
//    · stofnun AÐEINS um „Nýtt fyrirtæki" (Companies.submitNew); þjónusta um stjórntæki kerfanna (280 / 147 / 385)
const f452 = les('js/patches/452-greining-faera.js');
const k452 = f452.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/[^\n'"]*$/gm, '');
krefst(idx.includes('/js/patches/452-greining-faera.js'), 'index.html: 452-greining-faera.js er ekki hlaðin');
krefst(!/\.(insert|upsert|update|delete)\(/.test(k452), '452: bein skrif í töflu — öll skrif fara um vistunarleiðir prófílsins (363 vistaReit, 449a leidrettaTegund) og stofnleið appsins');
krefst(!/AppSettings\.save\(/.test(k452) && !/arsskodun_customers|brunakerfi_customers/.test(k452) && !/from\('slokkvikerfi'\)/.test(k452), '452: þjónustuskráning framhjá kerfunum — notaðu stjórntæki þeirra (280 Setja í þjónustu, 147 Bæta við fyrirtæki, 385 Nýtt kerfi)');
krefst(/if \(!tomtNu\(coId, a\.reitur\)\) \{[^\n]*continue; \}\s*const ok = await B\.vistaReit\(coId, a\.reitur, a\.gildi\);/.test(f452), '452: vistaReit verður að koma beint á eftir endurlestri reitsins (tomtNu) — fylltur reitur má aldrei yfirskrifast');
krefst((k452.match(/vistaReit\(/g) || []).length === 1, '452: vistaReit má aðeins kalla á EINUM stað (í skrifa(), á eftir tomtNu-vörninni)');
krefst(/if \(f\.flokkun\.tegund_handval\) \{[^\n]*continue; \}\s*await Flokkun\.leidrettaTegund\(coId, a\.gildi\);/.test(f452), '452: tegund rekstrar má aðeins vistast þegar ekkert handval er til (lesið aftur rétt fyrir skrif)');
krefst(/await Companies\.submitNew\(\)/.test(f452) && !/from\('fyrirtaeki'\)/.test(k452), '452: stofnun á AÐEINS að fara um „Nýtt fyrirtæki" (Companies.openNew + Companies.submitNew)');
krefst(/const lagleg = \(coId\) => \+coId > 0 && \+coId !== SYND/.test(f452), '452: vörn gegn sýndarfyrirtækinu (lagleg) vantar');
const f363 = les('js/patches/363-banner-upplysingar.js');
krefst(/window\.BannerUpplysingar = \{[^}]*vistaReit[^}]*vistaUppruna/.test(f363), '363: vistaReit/vistaUppruna verða að vera opin fyrir 452 (ein skrifleið í reitina)');
krefst(/const LYKILL_UPPRUNI = 'banner_upplysingar_uppruni';/.test(f363) && /patch\[LYKILL_UPPRUNI\]\[String\(coId\)\]\[reitur\] = u;/.test(f363), '363: uppruni sjálfsóttra gilda á sinn eigin lykil (banner_upplysingar_uppruni), aldrei ofan í reitina');
// 5. töflur
const toflur = (g.match(/<table /g) || []).length, merktar = (g.match(/<table data-_pm-status-done="1"/g) || []).length;
krefst(toflur === merktar, '451: ' + (toflur - merktar) + ' tafla án data-_pm-status-done (00-legacy setur þá tækja-fellilista sem skrifar uttaeki.status)');
// 4. kaupskrá og kortaflísar
for (const f of ['js/patches/451-greining-fasteignar.js', 'netlify/functions/bygging-uppl.js', 'netlify/functions/fasteign-opin.js']) {
  const s = les(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  krefst(!/kaupskra\.csv|LESID_ALLT\.hus|seldar_einingar|FEPILOG|hms\/kaupskra/i.test(s), f + ': Kaupskrá HMS er notuð í kóða — má ekki fyrr en Agnar hefur farið yfir skilmálana');
  krefst(!/tile\.openstreetmap\.org|tiles\.wmflabs|basemaps\.cartocdn/.test(s), f + ': OSM/CARTO-kortaflísar (lokaðar á appið) — Esri eins og restin');
}
// 6. heimildaskráin
let heim = null;
try { heim = JSON.parse(les('js/data/greining-heimildir.json')); } catch (e) { villur.push('js/data/greining-heimildir.json: ógilt JSON (' + e.message + ')'); }
if (heim) {
  const ids = new Set((heim.heimildir || []).map((x) => x.id));
  const notud = [...g.matchAll(/case '([a-z0-9-]+)':/g)].map((m) => m[1]).filter((x) => !/^(saeki|komid|villa)$/.test(x));
  const vantar = notud.filter((x) => !ids.has(x));
  krefst(!vantar.length, 'greining-heimildir.json: auðkenni sem síðan les en vantar í skrána — ' + vantar.join(', '));
  const lyklar = (heim.heimildir || []).filter((x) => /lykil/.test(x.stada || '') && !(x.lykill_fer && x.lykill_fer !== '—'));
  krefst(!lyklar.length, 'greining-heimildir.json: heimild sem þarf lykil en segir ekki hvert hann fer — ' + lyklar.map((x) => x.id).join(', '));
}

if (villur.length) { console.log('RED  GREINING — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('GREINING GRÆNT — sýndarvörður á undan biðlaranum, 451 skrifar aðeins skyndiminni + OCR-beiðni, engin kaupskrá, töflur varðar, heimildaskrá gild (' + (heim.heimildir || []).length + ' heimildir).');
process.exit(0);
