/* === KÚNNASÍÐAN Í BRUNASTÁLI C (426) — 30.09.2026 ==========================================
 *
 * Agnar 30.09 (docs/BEIDNIR.md B40): „Kúnna síða er alveg ömurlega ljót — laga litina og breiddina, svo það sé í
 * samræmi við fyrirtæki í þjónustu." Síðan er 158 (#view-vidsk-detail, opnast með „Opna kúnna-síðu" úr Allir
 * viðskiptavinir). 158 teiknar með innlínustílum og þema-breytum (var(--surface) …) í 980 px dálki; blái hausinn og
 * bláa aðgerðabandið komu úr eldra þema. Hér er CSS EITT með !important undir #view-vidsk-detail — ENGIN breyting
 * á 158, öll ídenti/klasar/hlustarar (_vd-*, 264/127) standa.
 *
 * Brunastál C eins og 402/414/425: full breidd, málmhaus með hnoðum og Playfair-nafni, aðgerðaband í málmi með
 * silfurtökkum, spjöldin hvítar línur með MONO-merki, plötur í stað pilla, grænn = SAEKJA, takkar 4 px.
 * ============================================================================================ */
(function () {
  'use strict';
  if (window.__kunni426) return;
  window.__kunni426 = true;

  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var TABLE_HEAD = 'linear-gradient(180deg,#2b2f37,#15171c)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  var GULL = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';
  var BSTAL = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  var RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  var INNER_PLATE = 'background-color:#eef1f6;background-image:linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px)';
  var LINE = 'background:#fff;border:0;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
  var MERKI = 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250';
  var TS = 'text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)';
  var SILVER_BTN = 'background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530;text-shadow:none;border-radius:4px;font-family:' + SANS + ';font-weight:600';
  var METAL_BTN_CSS = 'background:' + METAL_BTN + ';border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.4);border-radius:4px;font-family:' + SANS + ';font-weight:600';
  var GREEN_BTN = 'background:' + SAEKJA + ';border:1px solid rgba(52,168,98,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);text-shadow:0 1px 1px rgba(0,0,0,.55);border-radius:4px;font-family:' + SANS + ';font-weight:700';
  var RED_BTN = 'background:' + BSTAL + ';border:1px solid rgba(190,32,28,.55);color:#fff;box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);text-shadow:0 1px 1px rgba(0,0,0,.55);border-radius:4px;font-family:' + SANS + ';font-weight:700';
  var INP = 'background:#eef1f6;color:#141822;border:1px solid rgba(20,24,34,.14);border-radius:4px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font-family:' + SANS;
  var CHIP = 'display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-shadow:none;white-space:nowrap';
  var CHIP_GREEN = 'background:' + SAEKJA + ';border-color:rgba(52,168,98,.55);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55)';
  var CHIP_GOLD = 'background:' + GULL + ';border-color:rgba(190,150,60,.5);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5)';
  var CHIP_DARK = 'background:' + METAL_BTN + ';border-color:#000;color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.4)';

  var S = 'html[data-thm-preset="brunastal"] body #view-vidsk-detail ';
  var F = ':not(#_p426a):not(#_p426b):not(#_p426c):not(#_p426d)';
  function imp(css) { return css.split(';').map(function (d) { d = d.trim(); if (!d) return ''; return /!important$/.test(d) ? d : d + '!important'; }).filter(Boolean).join(';'); }
  function r(sel, css) { return sel.split(',').map(function (s) { var m = s.trim().match(/^(.*?)(::?(?:before|after))$/); return S + (m ? m[1] + F + m[2] : s.trim() + F); }).join(',') + '{' + imp(css) + '}'; }
  var HN_L = 'content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);left:9px;top:50%;margin-top:-3px;pointer-events:none';
  var HN_R = 'content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);right:9px;top:50%;margin-top:-3px;pointer-events:none';

  var WRAP = '#_vd-main > div';
  var HAUS = WRAP + ' > div[style*="border-radius:14px"]';                 // kúnnaspjaldið (nafn, kt, heimilisfang …)
  var BAND = WRAP + ' > div:has(> #_vd-action-report)';                     // aðgerðabandið (Úttektarskýrsla · Teikning · Opna fyrirtækisíðu)
  var KORT = WRAP + ' div[style*="border-radius:12px"][style*="var(--surface)"]';   // spjöldin (þjónustur, verð, fyrri viðskipti, skjöl, tæki, athugasemdir)

  var rules = [
    r('#_vd-main', 'max-width:none;padding:0;font-family:' + SANS),
    r(WRAP, 'max-width:none;padding:14px 18px 60px'),
    // ── efsta röðin ──
    r('#_vd-back', SILVER_BTN + ';height:36px;padding:0 14px;font-size:12.5px'),
    r('#_vd-complete-visit', GREEN_BTN + ';height:38px;padding:0 18px;font-size:13.5px'),
    r('#_vd-delete', SILVER_BTN + ';height:36px;padding:0 14px;font-size:12.5px'),
    r('#_vd-delete[style*="var(--red)"]', 'color:#b42318'),
    r(WRAP + ' > div:first-child > div > div[style*="font-size:11px"]', 'font-family:' + MONO + ';color:#d5dbe6'),
    // ── aðgerðabandið: málmur með hnoðum, silfurtakkar ──
    r(BAND, 'position:relative;background:' + METAL + ';border:1px solid #000;border-radius:8px;padding:8px 26px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 6px 14px -8px rgba(0,0,0,.6);gap:8px;margin-bottom:12px'),
    r(BAND + '::before', HN_L), r(BAND + '::after', HN_R),
    r(BAND + ' > button', SILVER_BTN + ';height:34px;padding:0 14px;font-size:12.5px;display:inline-flex;align-items:center;gap:6px'),
    // ── kúnnaspjaldið: málmhaus, Playfair-nafn, MONO-kt, hnoð ──
    r(HAUS, 'position:relative;background:' + METAL + ';background-color:#0a0a0c;border:1px solid #000;border-radius:10px;padding:18px 28px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);color:#fff;margin-bottom:12px'),
    r(HAUS + '::before', HN_L.replace('top:50%;margin-top:-3px', 'top:9px;margin-top:0')), r(HAUS + '::after', HN_R.replace('top:50%;margin-top:-3px', 'top:9px;margin-top:0')),
    r(HAUS + ' h1', 'font-family:' + DISPLAY + ';font-size:26px;font-weight:800;color:#fff;letter-spacing:-.01em;' + TS),
    r(HAUS + ' h1 + div', 'font-family:' + MONO + ';font-size:12px;color:#d5dbe6;letter-spacing:.04em'),
    r(HAUS + ' > div:first-child > div:first-child', 'border-radius:6px;background:' + GULL + ';border:1px solid rgba(190,150,60,.5);color:#fff;font-family:' + DISPLAY + ';font-size:24px;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 14px -4px rgba(211,171,78,.6);text-shadow:0 1px 1px rgba(0,0,0,.5)'),
    r(HAUS + ' > div:last-child', 'gap:10px;margin-top:14px'),
    r(HAUS + ' > div:last-child > div', 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:8px 12px;min-width:0'),
    r(HAUS + ' > div:last-child > div > span:first-child', 'font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a9b1bf'),
    r(HAUS + ' > div:last-child > div > span:last-child', 'color:#fff;font-weight:600;font-size:13px'),
    // ── spjöldin: hvítar línur, engin lituð vinstri rönd, MONO-merki ──
    r(KORT, LINE + ';border-left:0;padding:14px 16px;margin-bottom:12px'),
    r(KORT + ' > div:first-child > div[style*="font-size:14px"]', MERKI + ';font-size:11.5px'),
    r(KORT + ' h3', MERKI + ';font-size:11.5px'),
    r(KORT + ' h3 span', 'font-family:' + MONO + ';text-transform:none;letter-spacing:0;color:#6b7483'),
    r(KORT + ' div[style*="text-transform:uppercase"][style*="font-size:10px"]', MERKI + ';font-size:9.5px;color:#6b7483'),
    // plötur í stað pilla
    r(KORT + ' span[style*="border-radius:99px"]', CHIP),
    r(KORT + ' span[style*="var(--grn-bg)"]', CHIP_GREEN),
    r(KORT + ' span[style*="var(--blu-bg)"]', CHIP_DARK),
    r(KORT + ' span[style*="var(--amb-bg)"]', CHIP_GOLD),
    r(KORT + ' span[style*="var(--red-bg)"]', 'background:' + BSTAL + ';border-color:rgba(190,32,28,.55);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55)'),
    r(KORT + ' ._vd-month-btn', CHIP + ';cursor:pointer;height:22px'),
    r(KORT + ' ._vd-month-btn[style*="#2563e"]', CHIP_DARK),
    // litlu reitirnir (tæki á samningi, skoðunarmánuður) og innri kassar
    r(KORT + ' div[style*="var(--surface2)"]', INNER_PLATE + ';border:1px solid rgba(20,24,34,.12);border-radius:6px'),
    r(KORT + ' div[style*="var(--surface2)"] span[style*="font-weight:800"]', 'font-family:' + MONO),
    r(KORT + ' div[style*="var(--amb-bg)"]', 'background:rgba(211,171,78,.14);border:1px solid rgba(190,150,60,.45);border-radius:6px;color:#5a3f07'),
    r(WRAP + ' > div[style*="var(--amb-bg)"]', 'background:rgba(211,171,78,.14);border:1px dashed rgba(190,150,60,.55);border-radius:6px;color:#5a3f07'),
    // takkar
    r(KORT + ' ._vd-toggle[style*="color:#fff"]', METAL_BTN_CSS + ';height:34px;font-size:12px'),
    r(KORT + ' ._vd-toggle:not([style*="color:#fff"])', SILVER_BTN + ';height:34px;font-size:12px;color:#b42318'),
    r(KORT + ' ._vd-open-ars,' + KORT + ' ._vd-open-bru', GREEN_BTN + ';height:34px;font-size:12px'),
    r(KORT + ' #_vd-hreyf,' + KORT + ' #_vd-hreyf-nav,' + KORT + ' ._vd-open-field,' + KORT + ' ._vd-cpr-pick,' + KORT + ' #_vd-hreyf-more', SILVER_BTN + ';height:32px;padding:0 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px'),
    r(KORT + ' #_vd-disc-save', GREEN_BTN + ';height:32px;padding:0 14px;font-size:12.5px'),
    r(KORT + ' ._vd-cpr-add', METAL_BTN_CSS + ';height:32px;padding:0 14px;font-size:12.5px'),
    r(KORT + ' ._vd-cpr-del', SILVER_BTN + ';color:#b42318'),
    r(KORT + ' input[type="text"],' + KORT + ' input[type="number"],' + KORT + ' textarea', INP),
    r(KORT + ' input[type="number"]', 'font-family:' + MONO + ';font-weight:700'),
    r(KORT + ' input:focus,' + KORT + ' textarea:focus', 'outline:2px solid rgba(20,24,34,.5);outline-offset:-1px;background:#fff'),
    r(KORT + ' span[style*="var(--grn)"][style*="font-size:13px"],' + KORT + ' span[style*="var(--brand)"][style*="font-size:13px"]', MERKI + ';font-size:11px'),
    // töflur: þemað (230) setur .view table{display:block} — harðir table-resetar eins og í 274/386, svo hausinn nái yfir alla breiddina
    r(KORT + ' table', 'display:table;width:100%;border-collapse:collapse;border-radius:0;background:transparent'),
    r(KORT + ' thead', 'display:table-header-group'), r(KORT + ' tbody', 'display:table-row-group'), r(KORT + ' tr', 'display:table-row'), r(KORT + ' th,' + KORT + ' td', 'display:table-cell'),
    // töflur: málmhaus, MONO
    r(KORT + ' thead', 'background:' + TABLE_HEAD),
    r(KORT + ' thead tr', 'background:' + TABLE_HEAD + ';color:#eef1f4'),
    r(KORT + ' th', 'font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#eef1f4;border-bottom:1px solid #000;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
    r(KORT + ' td', 'color:#1f2530;border-bottom:1px solid rgba(20,24,34,.08)'),
    r(KORT + ' td[style*="monospace"],' + KORT + ' td[style*="tabular-nums"]', 'font-family:' + MONO),
    r(KORT + ' div[style*="border-radius:8px"][style*="overflow:hidden"]', 'border:1px solid rgba(20,24,34,.14);border-radius:6px'),
    // neðsti textinn
    r(WRAP + ' > div:last-child[style*="text-align:center"]', 'font-family:' + MONO + ';color:#d5dbe6;letter-spacing:.06em')
  ];
  var st = document.createElement('style');
  st.id = 'bstal-426';
  st.textContent = rules.join('\n');
  document.head.appendChild(st);
})();
/* === END 426 === */
