#!/usr/bin/env node
'use strict';
/**
 * Þjónustuvefur — Akstur og Skýrslugerð í Sérkjör koma úr verðskránni (app_settings.slokk_visit_defaults), sama heimild og
 * úttektin (09.11.2026, Agnar: „hafa alment samkvæmt verðskrá, nema þegar samið er um annað").
 *
 *   node tools/test-gatt-serkjor.cjs
 */
const fs = require('fs');
const path = require('path');
const { aksturSkyrsla, SVD_KODI } = require('../netlify/functions/_gatt-serkjor.cjs');

const root = path.join(__dirname, '..');
let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
const af = (l, fl) => l.filter((x) => x.flokkur === fl)[0];

// vorur-línurnar sem gáttin las verðið af áður (3.500 / 3.500) — nú aðeins fyrir vara_id og vsk
const VORUR = [
  { id: 136, nafn: 'Akstur', flokkur: 'Vinna og akstur', verd_an_vsk: '3500', vsk_prosenta: '24' },
  { id: 148, nafn: 'Skýrslugerð og vottun.', flokkur: 'Vinna og akstur', verd_an_vsk: '3500', vsk_prosenta: '24' },
  { id: 135, nafn: 'Uppsetning', flokkur: 'Vinna og akstur', verd_an_vsk: '2350', vsk_prosenta: '24' },
  { id: 177, nafn: 'Skýrslugerð brunakerfis', flokkur: 'Þjónusta', verd_an_vsk: '8000', vsk_prosenta: '24' },
];

// 1) ekkert vistað á þjóni → sjálfgildi úttektarinnar, EKKI vorur-verðið
let l = aksturSkyrsla(undefined, VORUR);
ok('tvær línur: skýrsla + akstur', l.length === 2 && af(l, 'skyrsla') && af(l, 'akstur'));
ok('Akstur án stillingar = 3.600 (ekki 3.500 úr vorur)', af(l, 'akstur').v.verd_an_vsk === 3600);
ok('Skýrslugerð án stillingar = 5.600 (ekki 3.500 úr vorur)', af(l, 'skyrsla').v.verd_an_vsk === 5600);
ok('heiti sjálfgefin „Akstur" / „Skýrslugerð"', af(l, 'akstur').v.nafn === 'Akstur' && af(l, 'skyrsla').v.nafn === 'Skýrslugerð');
ok('vara_id fundið úr vorur (136 / 148) — aðeins „Skýrslugerð…" í flokknum Vinna og akstur, ekki Þjónusta-línan 177', af(l, 'akstur').v.id === 136 && af(l, 'skyrsla').v.id === 148);
ok('flokkur línunnar fyrir baeta()/ROD er skyrsla / akstur', af(l, 'skyrsla').flokkur === 'skyrsla' && af(l, 'akstur').flokkur === 'akstur');

// 2) verð og heiti vistuð á þjóni ráða
l = aksturSkyrsla({ akstur: 3900, skyrslugerd: '6100', akstur_heiti: '  Akstur   (útkall) ', skyrslugerd_heiti: 'Skýrslugerð og vottun' }, VORUR);
ok('Akstur úr þjóni (tala)', af(l, 'akstur').v.verd_an_vsk === 3900);
ok('Skýrslugerð úr þjóni (strengur → tala)', af(l, 'skyrsla').v.verd_an_vsk === 6100);
ok('heiti úr þjóni, bil felld saman', af(l, 'akstur').v.nafn === 'Akstur (útkall)' && af(l, 'skyrsla').v.nafn === 'Skýrslugerð og vottun');

// 3) rusl á þjóni fellur á sjálfgildin — aldrei NaN / neikvætt / tómt heiti
l = aksturSkyrsla({ akstur: 'abc', skyrslugerd: -5, akstur_heiti: '   ', skyrslugerd_heiti: 42 }, VORUR);
ok('óleyfilegt verð → sjálfgildi', af(l, 'akstur').v.verd_an_vsk === 3600 && af(l, 'skyrsla').v.verd_an_vsk === 5600);
ok('tómt/ótextaheiti → sjálfgefið heiti', af(l, 'akstur').v.nafn === 'Akstur' && af(l, 'skyrsla').v.nafn === 'Skýrslugerð');
l = aksturSkyrsla({ akstur: 0 }, VORUR);
ok('0 er leyfilegt verð (línan hverfur þá í baeta: fulltAn = 0)', af(l, 'akstur').v.verd_an_vsk === 0);
l = aksturSkyrsla({ akstur: null, skyrslugerd: '' }, VORUR);
ok('null / tómt = sjálfgildi', af(l, 'akstur').v.verd_an_vsk === 3600 && af(l, 'skyrsla').v.verd_an_vsk === 5600);

// 4) vorur-línurnar horfnar / endurnefndar → gáttin missir EKKI línurnar (áður fóru þær þegjandi)
l = aksturSkyrsla({ akstur: 3700 }, []);
ok('án vorur-lína: línurnar eru samt til', l.length === 2 && af(l, 'akstur').v.verd_an_vsk === 3700);
ok('án vorur-lína: vara_id null, vsk 24', af(l, 'akstur').v.id === null && af(l, 'akstur').v.vsk_prosenta === 24);
l = aksturSkyrsla({}, [{ id: 7, nafn: 'Akstur', flokkur: 'Þjónusta', verd_an_vsk: '1', vsk_prosenta: '11' }]);
ok('vorur-lína í röngum flokki er ekki notuð', af(l, 'akstur').v.id === null);
l = aksturSkyrsla({}, [{ id: 8, nafn: 'Akstur', flokkur: 'Vinna og akstur', vsk_prosenta: '11' }]);
ok('vsk-hlutfall vorur-línunnar fylgir', af(l, 'akstur').v.vsk_prosenta === 11);

// 5) sjálfgildin í gáttinni = sjálfgildin í 129 og 410 (annars rukkar gáttin annað en úttektin þegar ekkert er vistað)
const s129 = fs.readFileSync(path.join(root, 'js/patches/129-company-total-cost.js'), 'utf8');
const s410 = fs.readFileSync(path.join(root, 'js/patches/410-thjonustu-tengingar.js'), 'utf8');
const m129 = /window\.SlokkVisitDefaults\s*=\s*window\.SlokkVisitDefaults\s*\|\|\s*\{\s*akstur:\s*(\d+),\s*driveQty:\s*\d+,\s*skyrslugerd:\s*(\d+)\s*\}/.exec(s129);
ok('129 ber sjálfgildin (finnast í kóða)', !!m129);
ok('SVD_KODI í gáttinni = 129 (akstur)', m129 && Number(m129[1]) === SVD_KODI.akstur, m129 && ('129: ' + m129[1]));
ok('SVD_KODI í gáttinni = 129 (skyrslugerd)', m129 && Number(m129[2]) === SVD_KODI.skyrslugerd, m129 && ('129: ' + m129[2]));
const m410 = /var SVD_KODI\s*=\s*\{\s*akstur:\s*(\d+),\s*driveQty:\s*\d+,\s*skyrslugerd:\s*(\d+)\s*\}/.exec(s410);
ok('SVD_KODI í 410 = gáttin', m410 && Number(m410[1]) === SVD_KODI.akstur && Number(m410[2]) === SVD_KODI.skyrslugerd);

// 6) gatt.cjs notar fallið og les gamla vorur-verðið EKKI lengur fyrir þessar tvær línur
const gatt = fs.readFileSync(path.join(root, 'netlify/functions/gatt.cjs'), 'utf8');
ok('gatt.cjs kallar SVD.aksturSkyrsla með svdMap', /SVD\.aksturSkyrsla\(svdMap, vorur\)/.test(gatt));
ok('gatt.cjs les slokk_visit_defaults úr app_settings-svarinu', /svdMap\s*=\s*\(row && row\.settings && row\.settings\.slokk_visit_defaults\)/.test(gatt));
ok('gamla leiðin (leggja(\'akstur\'/\'skyrsla\' úr vorur-línu) er horfin', !/leggja\('(akstur|skyrsla)'/.test(gatt));
ok('samningsverð leggst áfram ofan á (cfg[x.flokkur] → kjorVerd)', /kjorVerd\(fast\(cfg\[x\.flokkur\]\), x\.v\)/.test(gatt));

console.log(failed ? '\n' + failed + ' FAILED' : '\nAll passed');
process.exit(failed ? 1 : 0);
