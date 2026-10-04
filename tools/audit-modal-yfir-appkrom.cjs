#!/usr/bin/env node
'use strict';
/* MODAL YFIR APP-KRÓMI — skjalagluggi sem ekki er hægt að loka er verri en enginn.
 *
 * Af hverju hann er til (04.10.2026): Agnar opnaði reikning í Brunakerfi-APPINU og
 * komst ekki út — „Þetta gerðist í öpp. Brunakerfi appinu … það frýs og þarf að fara
 * alveg út úr appinu." Síðan fraus ekki; hún svaraði alla leið og engar villur komu.
 * Yfirlagið `#_bkc-docview` var á z-index 100050 en app-hausinn `#_app-hdr` er á
 * 2147481001, svo HAUSINN LÁ OFAN Á ✕ Loka. Mælt með `document.elementsFromPoint`
 * á lokunartakkanum: `#_app-hdr` kom efst, takkinn þar undir. Reikningurinn sást en
 * varð ekki lokað — eina útleiðin var að drepa appið.
 *
 * Sami galli var í Ársskoðunar-glugganum (199 openInvoiceOverlay), nákvæmlega sama tala.
 *
 * REGLAN: fullskjás-yfirlag sem á að liggja YFIR app-króminu verður að bera hærri
 * z-index en #_app-hdr / #_app-nav. Rautt frá fyrsta broti.
 *
 * Keyrsla: node tools/audit-modal-yfir-appkrom.cjs
 * Static — þarf hvorki net né lykla.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const les = p => { try { return fs.readFileSync(path.join(rot, p), 'utf8'); } catch (_) { return ''; } };

// App-krómið sjálft — vörðurinn les töluna úr 261 svo hann úreldist ekki þegjandi.
const app = les('js/patches/261-app-profiles.js');
const mHdr = app.match(/#_app-hdr\{[^}]*z-index:(\d+)/);
const mNav = app.match(/#_app-nav\{[^}]*z-index:(\d+)/);
const kromZ = Math.max(mHdr ? +mHdr[1] : 0, mNav ? +mNav[1] : 0);

const villur = [];
if (!kromZ) villur.push('261: fann ekki z-index á #_app-hdr/#_app-nav — vörðurinn getur ekki dæmt');

// Gluggarnir sem VERÐA að liggja yfir króminu.
const MODALAR = [
  { skra: 'js/patches/274-brunakerfi-fyrirtaeki.js', auðk: '_bkc-docview',  heiti: 'Skjalagluggi brunakerfis-spjaldsins' },
  { skra: 'js/patches/199-doc-year-grid.js',         auðk: '_sk-inv-ov',    heiti: 'Reikningsgluggi Ársskoðunar' },
];

MODALAR.forEach(m => {
  const s = les(m.skra);
  if (!s) { villur.push(m.skra + ': skráin fannst ekki'); return; }
  if (s.indexOf(m.auðk) < 0) { villur.push(m.skra + ': ' + m.auðk + ' fannst ekki — hefur glugginn verið endurnefndur?'); return; }
  // z-index í cssText-línunni sem setur position:fixed;inset:0
  const re = /position:fixed;inset:0;z-index:(\d+)/g;
  let f, haesta = 0, fann = false;
  while ((f = re.exec(s))) { fann = true; haesta = Math.max(haesta, +f[1]); }
  if (!fann) { villur.push(m.skra + ': fann enga „position:fixed;inset:0;z-index:" línu'); return; }
  if (haesta <= kromZ) {
    villur.push(m.heiti + ' (' + m.skra + '): z-index ' + haesta + ' er UNDIR app-króminu (' + kromZ + ') — ' +
                'app-hausinn leggst á ✕ Loka og notandinn kemst ekki út.');
  }
});

console.log('MODAL YFIR APP-KRÓMI — app-króm á z-index ' + (kromZ || '?'));
if (!villur.length) {
  console.log('✅ GRÆNT: ' + MODALAR.length + ' skjalagluggar liggja yfir app-króminu og má loka í app-ham.');
  process.exit(0);
}
villur.forEach(v => console.log('  ❌ ' + v));
console.log('\nRED: ' + villur.length + ' atriði. Modal sem er undir #_app-hdr er ekki hægt að loka í appinu.');
process.exit(1);
