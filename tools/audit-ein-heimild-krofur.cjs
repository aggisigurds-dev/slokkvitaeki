#!/usr/bin/env node
/* Öryggisnet — EIN HEIMILD UM ÞAÐ HVORT KRAFA ER SEND (Agnar, 07.11.2026):
 *   „búinn að þurfa að þurfa að greina svo margt oft sama hlutinn."
 *
 * Þennan dag fann ég út að sama spurningin — „hvaða kröfur eru ósendar?" — var
 * svarað á tvo vegu með ólíkum tölum: ný sýn sagði 9 raðir / 662.759 kr., en
 * Vinnusamantektin (489) sagði 23 / 2,5 m.kr. Báðar voru réttar; þær mældu bara
 * ekki það sama (14 af 23 bera kreditnótu, einn er staðgreiðsla). Munurinn kostar
 * EKKI rangt svar — hann kostar það að Agnar þarf að greina muninn sjálfur í hvert
 * skipti sem hann sér tvær tölur. Það er þreytan sem hann lýsti.
 *
 * Skilyrðið sem skilgreinir „ósend krafa" er samsett úr ÞREMUR merkjum:
 *     greitt_med='reikningur'  ·  krafa_sent_at  ·  dk_invoice_id
 * Hver skrá sem notar öll þrjú er sjálfstæð útfærsla á sömu reglu og getur rekið
 * í sundur við hinar þegar reglan breytist. Við mælingu 07.11.2026 voru þær ELLEFU.
 *
 * Þessi vörður REFACTORAR EKKI þær ellefu — það væri áhættusamt og utan tilefnis.
 * Hann FRYSTIR fjöldann: tólfta útfærslan fer rauð og á að lesa sýnina í staðinn:
 *     v_krafa_ekki_send         — breiða talan, SÖMU skilyrði og 489 (23 · 2,5 m.kr.)
 *     v_krafa_ekki_send_adgerd  — sá hluti sem má raunverulega senda (9 · 662.759 kr.)
 * Báðar bera `comment on view` með gildrunum. Sjá minni feedback_maelingin_er_lika_til.
 *
 * STATÍSKUR: enginn gagnagrunnur, ekkert net. Keyrir á sekúndubroti.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ── GRUNNLÍNA (mæld 07.11.2026) ────────────────────────────────────────────────
// Ellefu skrár sem fyrir eru nota öll þrjú merkin. Þær eru NAFNGREINDAR svo
// vörðurinn sjái muninn á „ný útfærsla bættist við" og „ein var endurnefnd".
const BASELINE_DAGS = '07.11.2026';
const LEYFDAR = [
  'slokkvitaeki/js/patches/142-sale-editor.js',
  'slokkvitaeki/js/patches/166-krofu-yfirlit.js',
  'slokkvitaeki/js/patches/190-thjonustu-verkstaedi.js',
  'slokkvitaeki/js/patches/197-bokhald-yfirferd.js',
  'slokkvitaeki/js/patches/368-thjonustubord5.js',
  'slokkvitaeki/js/patches/369-krofu-vinnugluggi.js',
  'slokkvitaeki/js/patches/386-slokkvikerfi-skyrsla.js',
  'slokkvitaeki/js/patches/420-stjornstod-samstilling.js',
  'slokkvitaeki/js/patches/430-verkspjald.js',
  'slokkvitaeki/js/patches/489-vinnusamantekt.js',
  'brunaholf/netlify/functions/fjarmal-yfirlit.js',
];

const ROT = path.join(__dirname, '..');                 // …/slokkvitaeki
const HEIMA = path.join(ROT, '..');                     // …/ (bæði repóin)
const MOPPUR = [
  ['slokkvitaeki', path.join(ROT, 'js')],
  ['slokkvitaeki', path.join(ROT, 'gatt')],
  ['brunaholf', path.join(HEIMA, 'brunaholf', 'js')],
  ['brunaholf', path.join(HEIMA, 'brunaholf', 'netlify', 'functions')],
];

function skrar(dir) {
  const ut = [];
  if (!fs.existsSync(dir)) return ut;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) ut.push(...skrar(p));
    else if (f.name.endsWith('.js')) ut.push(p);
  }
  return ut;
}

const fundnar = [];
for (const [repo, dir] of MOPPUR) {
  for (const p of skrar(dir)) {
    const t = fs.readFileSync(p, 'utf8');
    if (t.includes('krafa_sent_at') && t.includes('dk_invoice_id') && t.includes('greitt_med')) {
      fundnar.push(repo + '/' + path.relative(path.join(HEIMA, repo), p).split(path.sep).join('/'));
    }
  }
}
fundnar.sort();

const nyjar = fundnar.filter((f) => !LEYFDAR.includes(f));
const horfnar = LEYFDAR.filter((f) => !fundnar.includes(f));

if (nyjar.length) {
  console.log('RED: ' + nyjar.length + ' NÝ sjálfstæð útfærsla á „er krafan send?" frá ' + BASELINE_DAGS
    + ' (grunnlína ' + LEYFDAR.length + ', nú ' + fundnar.length + ')');
  nyjar.forEach((f) => console.log('   • ' + f));
  console.log('HVAÐ Á AÐ GERA: lestu sýnina í stað þess að endurreikna regluna —');
  console.log('   v_krafa_ekki_send (breiða talan, sömu skilyrði og 489) eða');
  console.log('   v_krafa_ekki_send_adgerd (það sem má raunverulega senda).');
  console.log('   Sé ný útfærsla óhjákvæmileg: bættu skránni í LEYFDAR hér og segðu AF HVERJU.');
  process.exitCode = 1;
} else {
  console.log('OK — ' + fundnar.length + ' þekktar útfærslur á „er krafan send?" (grunnlína '
    + LEYFDAR.length + ' frá ' + BASELINE_DAGS + '); engin ný.'
    + (horfnar.length ? ' ATH: ' + horfnar.length + ' úr grunnlínunni finnast ekki lengur ('
      + horfnar.join(', ') + ') — uppfærðu LEYFDAR.' : ''));
}
