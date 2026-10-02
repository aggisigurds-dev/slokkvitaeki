#!/usr/bin/env node
/**
 * VÖRÐUR: EI-30/60 lesist á öllum snúningum og sem ábendingar, ekki eldveggir.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '../js/patches/434-teikning-takn.js'), 'utf8');
const box = { module: { exports: {} }, exports: {}, console };
box.module.exports = box.exports;
vm.runInNewContext(src, box);
const ei = box.module.exports;
const villur = [];
const krefst = (ok, msg) => { if (!ok) villur.push(msg); };

krefst(typeof ei.parseFirewallRating === 'function', '434 skilar parseFirewallRating');

krefst(ei.parseFirewallRating('EI-30') && ei.parseFirewallRating('EI-30').minutes === 30, 'EI-30');
krefst(ei.parseFirewallRating('EI-60') && ei.parseFirewallRating('EI-60').minutes === 60, 'EI-60');
krefst(ei.parseFirewallRating('EI60') && ei.parseFirewallRating('EI60').label === 'EI-60', 'EI60 án bandstriks');
krefst(ei.parseFirewallRating('E1-30') && ei.parseFirewallRating('E1-30').minutes === 30, 'OCR E1→EI');
krefst(ei.parseFirewallRating('EI-CS-30') && ei.parseFirewallRating('EI-CS-30').smoke, 'EI-CS-30');
krefst(!ei.parseFirewallRating('AREIM-120'), 'AREIM má ekki teljast EI');
krefst(!ei.parseFirewallRating('EI-90'), 'EI-90 er ekki okkar flokkur');
krefst(!ei.parseFirewallRating('EI-120'), 'EI-120 er ekki okkar flokkur');

const w = { x: 10, y: 20, width: 30, height: 12 };
const r0 = ei.snuaHnit(w, 0, 200, 100);
const r90 = ei.snuaHnit(w, 90, 200, 100);
const r180 = ei.snuaHnit(w, 180, 200, 100);
const r270 = ei.snuaHnit(w, 270, 200, 100);
krefst(r0.x === 10 && r0.y === 20 && !r0.vertical, '0°');
krefst(r90.vertical && r90.x === 20 && r90.y === 100 - 40, '90°: ' + JSON.stringify(r90));
krefst(!r180.vertical && r180.x === 200 - 40 && r180.y === 100 - 32, '180°: ' + JSON.stringify(r180));
krefst(r270.vertical && r270.x === 200 - 32 && r270.y === 10, '270°: ' + JSON.stringify(r270));

const hits = ei.collectFirewallHits([
  { text: 'EI', x: 0, y: 10, width: 10, height: 8, confidence: 80, vertical: false, horn: 0 },
  { text: '60', x: 12, y: 10, width: 12, height: 8, confidence: 82, vertical: false, horn: 0 }
]);
krefst(hits.some(h => h.rating && h.rating.minutes === 60), 'EI + 60 sameinast: ' + JSON.stringify(hits.map(h => h.rating)));

const medfram = ei.collectFirewallHits([
  { text: 'EI-30', x: 40, y: 80, width: 28, height: 8, confidence: 90, vertical: false, horn: Math.PI / 5 }
]);
krefst(medfram.some(h => h.rating && h.rating.minutes === 30 && Math.abs(h.horn - Math.PI / 5) < 0.01), 'EI meðfram vegg (horn)');

if (villur.length) {
  console.log('TEIKNING-EI RAUDT — ' + villur.length + ' vantar:');
  villur.forEach(v => console.log('  · ' + v));
  process.exit(1);
}
console.log('TEIKNING-EI GRÆNT — EI-30/60 á 0/90/180/270 og meðfram vegg, engir AREIM/90/120.');
process.exit(0);
