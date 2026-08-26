#!/usr/bin/env node
/* Audit: Rekstrarfélög month-only next-inspection + dotted notes + Sími toggle. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  ✓ ' + name);
  else { console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); failed++; }
}

const MONTHS_IS_SHORT = ['Jan','Feb','Mar','Apr','Maí','Jún','Júl','Ágú','Sep','Okt','Nóv','Des'];
function monthLabel(date){
  if(!date) return '—';
  var s=String(date), mm=0;
  var p=s.match(/^(\d{4})-(\d{1,2})/);
  if(p) mm=+p[2];
  else {
    var d=new Date(s);
    if(!isNaN(+d)) mm=d.getMonth()+1;
  }
  return (mm>=1 && mm<=12) ? MONTHS_IS_SHORT[mm-1] : '—';
}

console.log('monthLabel()');
ok('Ágú from 2026-08-01', monthLabel('2026-08-01') === 'Ágú');
ok('Jan from 2027-01-15', monthLabel('2027-01-15') === 'Jan');
ok('Des from 2026-12', monthLabel('2026-12-01') === 'Des');
ok('dash for null', monthLabel(null) === '—');
ok('dash for empty', monthLabel('') === '—');

const rf = fs.readFileSync(path.join(root, 'js/patches/175-rekstrarfelog.js'), 'utf8');
const ars = fs.readFileSync(path.join(root, 'js/patches/153-arsskodun.js'), 'utf8');
const ky = fs.readFileSync(path.join(root, 'js/patches/166-krofu-yfirlit.js'), 'utf8');

console.log('175 Rekstrarfélög');
ok('monthLabel helper present', /function monthLabel\(date\)/.test(rf));
ok('nextPill uses monthLabel', /monthLabel\(date\)/.test(rf) && /rf-next--overdue/.test(rf));
ok('does not dump full date in overdue pill', !/rf-next--overdue.{0,40}esc\(date\)/.test(rf));
ok('dotted rf-plannote beats 245', /rf-plannote\[type="text"\]\{[^}]*border-bottom:1px dotted/.test(rf));
ok('rf-plannote min-width:0', /rf-plannote\{[^}]*min-width:0/.test(rf));
ok('rf-tbl stays display:table on Sími', /table\.rf-tbl\{display:table!important/.test(rf));
ok('did not restyle ._yr gradients', !/\._yr\{[^}]*background:/.test(rf));

console.log('153 Ársskoðun');
ok('dotted _note', /\._note[^}]*border-bottom:1px dotted/.test(ars));
ok('under-name note on Sími', /_ars-note-under/.test(ars));
ok('plan_note storage kept', /plan_note/.test(ars));

console.log('166 viewmode');
ok('toggle sits in .bb-face', /#bstal-banner \.bb-face/.test(ky) && /insertBefore\(t, rightwrap\)/.test(ky));
ok('Sími segment forced visible in Skjár', /data-viewmode="desktop"\] \.ky-vm-seg\[data-vm="mobile"\]/.test(ky));

if (failed) { console.log('\nFAILED: ' + failed); process.exit(1); }
console.log('\nOK');
