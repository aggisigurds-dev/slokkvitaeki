#!/usr/bin/env node
'use strict';
/* VINNUGLUGGI KRAFNA SENDIR ALDREI NEITT — og DRAFT í Payday telst ekki sent (11.09.2026).
 *
 * Agnar: „ég kanski bara ýti á takka sem stendur 'Tilbúið í vinnslu', læt þig vita, þú keyrir vinnsluna
 * í gegn svo hún endi bara ósend inn á kröfuyfirlit.... ég þá athuga skýrsluna, reikninginn, og sendi af
 * stað" — og „sem síðar get ég látið gera sjálfvirkt". Einmitt þess vegna er þessi vörður til: lotan sem
 * gerir vinnsluna sjálfvirka má ekki lauma sendingu inn í gluggann. Lokasending er ALLTAF Agnars.
 *
 * FULLYRÐINGAR um js/patches/369-krofu-vinnugluggi.js (athugasemdir strippaðar, strengir halda sér):
 *   1. Engin fetch / XMLHttpRequest / sendBeacon / .rpc( og engin /api/-slóð — glugginn kallar hvorki á
 *      payday-push, gmail-send né nokkurt annað fall.
 *   2. Skrif (.insert / .update / .upsert) eru AÐEINS á krofu_verkferli.
 *   3. Aldrei .delete( — mál er „sleppt", ekki eytt, svo sagan lifir.
 *   4. Engin localStorage / sessionStorage — staða málsins býr á þjóninum (SAMSTILLT-reglan).
 * … og um js/patches/368-thjonustubord5.js:
 *   5. saekjaKrofur parar á payday_id (ekki reference) og telur DRAFT í Payday EKKI sem sent.
 *
 * Les aðeins kóða — ekkert net. GRUNNLÍNA = 0.
 * Prófun á vörðinn sjálfan:  node tools/audit-krofu-vinnugluggi.cjs --skra369 <slóð> --skra368 <slóð>
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const SKRA369 = arg('--skra369') || path.join(ROT, 'js', 'patches', '369-krofu-vinnugluggi.js');
const SKRA368 = arg('--skra368') || path.join(ROT, 'js', 'patches', '368-thjonustubord5.js');

// Strippar athugasemdir en heldur strengjum og línunúmerum (sama ástandsvél og audit-daudar-siur).
function strippa(src) {
  let ut = '', i = 0, st = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (st === 0) {
      if (c === '/' && d === '/') { st = 1; ut += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { st = 2; ut += '  '; i += 2; continue; }
      if (c === "'") st = 3; else if (c === '"') st = 4; else if (c === '`') st = 5;
      ut += c; i++; continue;
    }
    if (st === 1) { if (c === '\n') { st = 0; ut += c; } else ut += ' '; i++; continue; }
    if (st === 2) { if (c === '*' && d === '/') { st = 0; ut += '  '; i += 2; } else { ut += (c === '\n' ? '\n' : ' '); i++; } continue; }
    ut += c;
    if (c === '\\') { ut += (src[i + 1] || ''); i += 2; continue; }
    if ((st === 3 && c === "'") || (st === 4 && c === '"') || (st === 5 && c === '`')) st = 0;
    i++;
  }
  return ut;
}
const lina = (src, idx) => src.slice(0, idx).split('\n').length;

const brot = [];
if (!fs.existsSync(SKRA369)) brot.push('369-krofu-vinnugluggi.js fannst ekki (' + SKRA369 + ')');
else {
  const src = strippa(fs.readFileSync(SKRA369, 'utf8'));
  // 1 · engar netleiðir framhjá Supabase-biðlaranum
  for (const [re, hvad] of [[/\bfetch\s*\(/g, 'fetch('], [/XMLHttpRequest/g, 'XMLHttpRequest'], [/sendBeacon/g, 'sendBeacon'], [/\.rpc\s*\(/g, '.rpc('], [/\/api\//g, '/api/-slóð']]) {
    let m;
    while ((m = re.exec(src)) !== null) brot.push('369:' + lina(src, m.index) + ' notar ' + hvad + ' — glugginn má hvorki senda né kalla á föll.');
  }
  // 2 · skrif aðeins á krofu_verkferli
  const skrif = /\.(insert|update|upsert)\s*\(/g;
  let m;
  while ((m = skrif.exec(src)) !== null) {
    const fyrir = src.slice(Math.max(0, m.index - 600), m.index);
    const froms = [...fyrir.matchAll(/\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g)];
    const sidasta = froms.length ? froms[froms.length - 1] : null;
    const milli = sidasta ? fyrir.slice(sidasta.index + sidasta[0].length) : '';
    if (!sidasta || /;/.test(milli)) brot.push('369:' + lina(src, m.index) + ' .' + m[1] + '( án .from(\'krofu_verkferli\') í sömu setningu.');
    else if (sidasta[1] !== 'krofu_verkferli') brot.push('369:' + lina(src, m.index) + ' skrifar á ' + sidasta[1] + ' — eina leyfða skrifleiðin er krofu_verkferli.');
  }
  // 3 · aldrei eytt
  const eyda = /\.delete\s*\(/g;
  while ((m = eyda.exec(src)) !== null) brot.push('369:' + lina(src, m.index) + ' .delete( — mál er sleppt, aldrei eytt.');
  // 4 · engin vafra-staða
  const vafri = /\b(localStorage|sessionStorage)\b/g;
  while ((m = vafri.exec(src)) !== null) brot.push('369:' + lina(src, m.index) + ' ' + m[1] + ' — staða málsins á heima á þjóninum.');
}

if (!fs.existsSync(SKRA368)) brot.push('368-thjonustubord5.js fannst ekki (' + SKRA368 + ')');
else {
  const src = strippa(fs.readFileSync(SKRA368, 'utf8'));
  const i = src.indexOf('async function saekjaKrofur(');
  if (i < 0) brot.push('368: saekjaKrofur fannst ekki.');
  else {
    let j = src.indexOf('{', i), djupt = 0, byrjun = j;
    for (; j < src.length; j++) { if (src[j] === '{') djupt++; else if (src[j] === '}') { djupt--; if (!djupt) break; } }
    const likami = src.slice(byrjun, j);
    if (!/\.in\(\s*'payday_id'/.test(likami)) brot.push('368 saekjaKrofur parar ekki á payday_id = dk_invoice_id.');
    if (/\.in\(\s*'reference'/.test(likami)) brot.push('368 saekjaKrofur parar á reference — ógildur reikningur og kreditreikningur hans deila reference.');
    if (!/status\s*===\s*'DRAFT'/.test(likami) || !/&&\s*!drog/.test(likami)) brot.push('368 saekjaKrofur telur DRAFT í Payday sem sent (13 sölur, 446.805 kr mældust 11.09.2026).');
  }
}

if (brot.length) {
  brot.slice(0, 20).forEach(b => console.log('   ' + b));
  console.log('RED: ' + brot.length + ' brot — vinnugluggi krafna má aldrei senda, skrifa utan krofu_verkferli, eyða, geyma stöðu í vafra, né telja Payday-drög send.');
  process.exit(1);
}
console.log('✅ GRÆNT vinnugluggi krafna: engin sending, skrif aðeins á krofu_verkferli, ekkert eytt, engin vafra-staða; 368 telur DRAFT ekki sent');
