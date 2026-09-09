#!/usr/bin/env node
'use strict';
/* GREIÐSLUMÁTI — greitt_med og paid_method geyma KÓÐA, aldrei birtingartexta.
 *
 * Af hverju þessi vörður er til (09.09.2026): Agnar sagði "kúnni kemur inn, set í
 * greitt síðar, og þegar hann sækir að hann sé settur í reikning — þá finnst
 * stundum þeir hverfa". Þeir hurfu ekki úr gagnagrunninum. Þeir hurfu úr LISTANUM.
 *
 * ROT: js/pos.js checkout() bjó til breytu sem hét pmLabel og skrifaði hana beint
 * í greitt_med. Tvær greinar skiluðu kóða ('reikningur','greitt_sidar') og tvær
 * birtingartexta ('Kort','Pening') — hálfkláruð umbreyting. Niðurstaðan:
 *
 *   greitt_med   kort 253 · Kort 105 · reidufe 55 · Pening 15
 *   paid_method  Kort 123 · Pening 12 · Reiðufé 2
 *
 * Hver sía sem leitaði að 'kort' sleppti 105 sölum. Verst: gáttin í
 * 121-pickup-checkout.js:831 hefur lágstafa-hvítlista, svo sala merkt 'Kort' féll
 * á honum og tækið fékk ekki að fara út. Tveir staðir höfðu þegar plástrað í
 * kringum þetta (121:827 og 61-command-center:11) í stað þess að laga upprunann.
 *
 * LAGAÐ 09.09.2026: pos.js skrifar nú kóða (pmGildi), birting fer um
 * Counter._payLabel(), og 120 + 137 raðir voru samræmdar.
 *
 * ENGIN GRUNNLÍNA. Fast gildasett — nýtt gildi utan þess er villa, ekki skuld.
 * Bætist við löglegur greiðslumáti? Þá er hann settur hér OG í Counter._payLabel
 * (js/modal.js) OG í hvítlistann í 121-pickup-checkout.js:831. Allir þrír.
 *
 * Keyrsla:  node tools/audit-greidslumati.cjs
 * Read-only. Notar publishable-lykilinn úr js/config.js (RLS).
 */
const fs = require('fs');
const path = require('path');

// Kóðarnir sem mega standa í dálkunum. Lágstafir, engir broddstafir.
const GILD_GREITT_MED = ['kort', 'reidufe', 'reikningur', 'greitt_sidar'];
// paid_method leyfir auk þess uppgjörsleiðir sem eiga sér ekki greiðslumáta.
const GILD_PAID_METHOD = GILD_GREITT_MED.concat(
  ['greitt_sidar_pickup', 'kreditfaersla', 'inneign', 'millifaersla']);

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

(async () => {
  const radir = [];
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(URL_ + '/rest/v1/solur?select=num,greitt_med,paid_method&order=id.asc', {
      headers: { ...H, Range: `${fra}-${fra + 999}` }
    });
    if (!r.ok) throw new Error('solur -> ' + r.status);
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    radir.push(...b);
    if (b.length < 1000) break;
  }

  const villur = [];
  const talning = new Map();

  for (const s of radir) {
    for (const [dalkur, gild] of [['greitt_med', GILD_GREITT_MED], ['paid_method', GILD_PAID_METHOD]]) {
      const g = s[dalkur];
      if (g == null || g === '') continue;
      // kreditfaert_R-000123 ber sölunúmer með sér — leyft sem forskeyti.
      if (gild.includes(g) || /^kreditfaert_/.test(g)) continue;
      const lykill = dalkur + ' = ' + JSON.stringify(g);
      talning.set(lykill, (talning.get(lykill) || 0) + 1);
      if (villur.length < 8) villur.push(`   ${s.num}  ${lykill}`);
    }
  }

  if (talning.size) {
    villur.forEach(v => console.log(v));
    const samantekt = [...talning.entries()].sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`).join(' · ');
    fail(`Ógild greiðslumáta-gildi: ${samantekt}. ` +
      'Dálkurinn geymir kóða — birtingartexti á heima í Counter._payLabel(). ' +
      'Sjá js/pos.js checkout().');
  }

  const dreifing = new Map();
  for (const s of radir) if (s.greitt_med) dreifing.set(s.greitt_med, (dreifing.get(s.greitt_med) || 0) + 1);
  const syn = [...dreifing.entries()].sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`).join(' · ');
  console.log(`✅ GRÆNT greiðslumáti: ${radir.length} sölur, öll gildi á kóðaformi — ${syn}`);
})().catch(e => fail(e.message));
