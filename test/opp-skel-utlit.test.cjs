// Próf: app-skelin á S26 (útlitslota 17.11.2026, Öpp-villur 8, 10, 15 og Rekstrarfélaga-hausinn).
//   node --test test/opp-skel-utlit.test.cjs
// Mælt í vafra (980×1940, ?simikrom=2.38) áður en þetta var lagað — prófin halda lagfæringunum á sínum stað:
//   · 8  — milli iframe-síðna stóð ramminn 0,85–1,8 s í stærð fyrri síðu (333 sá lykilinn aðeins í 700 ms vaktinni);
//   · 10 — Bílstjóri sem flipi byrjaði 50 px frá toppi en hausinn nær 124 px niður;
//   · 15 — mobilenav stimplaði 86 px fyllingu í appham á meðan 314 stimplar mælda haushæð;
//   · Rekstrarfélög á 360–412 px — titilhólfið (inline min-width:0) minnkaði og leitin lagðist yfir titilinn.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const les = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('261 goPage: síðustærð metin strax eftir að flipaljósið er komið á (ekki beðið eftir 700 ms vaktinni)', () => {
  const s = les('js/patches/261-app-profiles.js');
  const i = s.indexOf('function goPage(k) {');
  const lok = s.indexOf('\n  }\n', i);
  const fall = s.slice(i, lok);
  const ljos = fall.indexOf("b.classList.toggle('on', b.dataset.k === k)");
  const meta = fall.indexOf('AppPageZoom.endurmeta()');
  assert.ok(ljos > 0, 'flipaljósið fannst ekki í goPage');
  assert.ok(meta > ljos, 'endurmeta verður að koma Á EFTIR flipaljósinu — 333 les lykilinn af ._app-tab.on');
});

test('219 Bílstjóri sem flipi: efri brún er mæld haushæð, ekki fast 50 px', () => {
  const s = les('js/patches/219-bilstjori.js');
  assert.ok(!/#\$\{VIEW_ID\}\{top:50px!important\}/.test(s), 'fast top:50px á Bílstjóranum er komið aftur');
  assert.ok(!/_bs-sheet\{top:50px!important/.test(s), 'fast top:50px á spjaldinu er komið aftur');
  assert.ok(/top:var\(--bs-hdrh,50px\)!important/.test(s), 'top á að lesa --bs-hdrh');
  assert.ok(/setProperty\('--bs-hdrh'/.test(s) && /getElementById\('_app-hdr'\)/.test(s), 'maelaNav verður að mæla #_app-hdr og setja --bs-hdrh');
});

test('mobilenav: í appham sama fylling og 314 (mæld haushæð), aldrei 86 px Sími-borðans', () => {
  const s = les('js/mobilenav.js');
  assert.ok(/appHam \? \(window\.__appHdrPad \|\| '48px'\) : \(window\.__peBannerPad \|\| '86px'\)/.test(s));
  const p314 = les('js/patches/314-simi-compact-layer.js');
  assert.ok(/app \? \(window\.__appHdrPad \|\| '48px'\) : \(window\.__peBannerPad \|\| '86px'\)/.test(p314), '314 og mobilenav verða að nota sömu tölu');
});

test('339 Rekstrarfélög: titilhólfið heldur breidd sinni og leitin gefur eftir', () => {
  const s = les('js/patches/339-rekstrar-bruna-thjonusta-simi.js');
  assert.ok(/\.rf-phead>div:not\(\.rf-search\)' \+ P\)\s*\+ '\{flex:0 0 auto!important;min-width:auto!important\}'/.test(s));
  assert.ok(/flex:0 1 220px!important;min-width:112px!important/.test(s), 'leitin verður að geta farið niður í 112 px (360 px skjár)');
});

test('339 Rekstrarfélög í appham: titillinn er dökkur (efsti hluti sýnarinnar er ljósgrár í appinu, hvítt mældist 2,09:1)', () => {
  const s = les('js/patches/339-rekstrar-bruna-thjonusta-simi.js');
  assert.ok(/A \+ RF \+ ' \.rf-ptitle' \+ P \+ '\{color:#141822!important\}'/.test(s));
});

test('261 hamarinn: ℹ-skýringartakki Kröfu yfirlits (._ky-sky) er undanþeginn — annars 22×42 px sporaskja', () => {
  const s = les('js/patches/261-app-profiles.js');
  assert.ok(/body\.appmode #view-krofu-yfirlit \._ky-exp,body\.appmode #view-krofu-yfirlit \._ky-sky\{min-height:0 !important/.test(s));
});

test('útgáfumerki hækkuð á breyttu skránum (annars situr gamla útgáfan í skyndiminni)', () => {
  const h = les('index.html');
  for (const f of ['js/patches/219-bilstjori.js', 'js/patches/261-app-profiles.js', 'js/patches/333-app-page-zoom.js', 'js/mobilenav.js', 'js/patches/339-rekstrar-bruna-thjonusta-simi.js']) {
    const m = new RegExp(f.replace(/[.\/-]/g, (c) => '\\' + c) + '\\?v=(\\d{8})').exec(h);
    assert.ok(m && m[1] >= '20261117', f + ' ber gamalt útgáfumerki');
  }
});
