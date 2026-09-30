/* === ALLIR VIÐSKIPTAVINIR Í BRUNASTÁLI C (425) — 30.09.2026 ==========================================
 *
 * Agnar 30.09 (docs/BEIDNIR.md B39): „taka alla síðuna af Allir Viðskiptavinir og setja hana í svipað þema og
 * Fyrirtæki í þjónustu, nema ekki með súluritinu. en halda í bili öllum tökkum."
 *
 * 157 teiknar síðuna (innerHTML) og fékk hér þrjár litlar markup-breytingar: talningarhólfin fjögur eru nú
 * stálspjöld með skornum hornum og hnoðum eins og í 414 (gull-hetja, grænt Í þjónustu, stál Með tæki, rautt
 * Án netfangs) og klasa-krókar á síuraðirnar (.b425-sia / .b425-xsia) og tækjastikuna (.b425-tools). Allt annað
 * er CSS hér: samfelldar silfurræmur í stað lausra pilla (sama og 418), silfur-/málm-/grænir takkar 4 px,
 * innfelldur leitarreitur, hvítar línur í kortasýn. ENGINN takki, ídenti eða hlustari snertur — 157 á þá áfram.
 * Ekkert súlurit (mánaðarstrimillinn úr 414 kemur ekki hér, sbr. beiðnina).
 * ============================================================================================ */
(function () {
  'use strict';
  if (window.__allir425) return;
  window.__allir425 = true;

  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  var STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px)';
  var INNI = STRIPE + ',' + METAL;
  var INNI_RAUTT = STRIPE + ',linear-gradient(145deg,#130506 0%,#331214 26%,#4a1a1d 50%,#240b0d 74%,#0e0405 100%)';
  var INNI_GRAENT = STRIPE + ',linear-gradient(145deg,#06120a 0%,#132a1c 26%,#1b3a26 50%,#0e2216 74%,#050b07 100%)';
  var R_STAL = 'linear-gradient(145deg,#0a0a0c 0%,#4a4e57 20%,#1d1f24 45%,#6a6f79 62%,#15161a 85%,#0a0a0c 100%)';
  var R_GULL = 'linear-gradient(145deg,#3d2b05 0%,#d3ab4e 20%,#ffe9b0 35%,#a67f22 52%,#ffe9b0 68%,#d3ab4e 82%,#3d2b05 100%)';
  var R_GRAENT = 'linear-gradient(145deg,#010d05 0%,#0e5a2e 25%,#16783f 50%,#0e5a2e 75%,#010f06 100%)';
  var R_RAUTT = 'linear-gradient(145deg,#0d0102 0%,#380506 18%,#6c0d10 38%,#971515 50%,#6c0d10 62%,#380506 82%,#0d0102 100%)';
  var GR = 'linear-gradient(180deg,#63b88c 0%,#1f6f42 35%,#0c3d22 60%,#1a5a35 100%)';
  var GU = 'linear-gradient(180deg,#e2c67a 0%,#9c7c2c 35%,#5c4412 60%,#8c6c24 100%)';
  var RA = 'linear-gradient(180deg,#d97878 0%,#8a2020 35%,#4a0d0d 60%,#7a1a1a 100%)';
  var ST = 'linear-gradient(180deg,#8a919c 0%,#454a55 35%,#26292f 60%,#3a3f49 100%)';
  var BL = 'linear-gradient(180deg,#8fb4ff 0%,#3d68c9 35%,#1a3570 60%,#2c4f9c 100%)';
  var RIVET_STAL = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  var RIVET_GULL = 'radial-gradient(circle at 40% 35%,#fff3c4 0%,#f0a83c 45%,#7a4a08 100%)';
  var RIVET_GRAENT = 'radial-gradient(circle at 40% 35%,#d8ffe6 0%,#23a35a 45%,#073a1d 100%)';
  var RIVET_RAUTT = 'radial-gradient(circle at 40% 35%,#ffd6d0 0%,#e25555 45%,#5a0a0a 100%)';
  var SILVER_BTN = 'background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530;text-shadow:none';
  var METAL_BTN_CSS = 'background:' + METAL_BTN + ';border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.4)';
  var GREEN_BTN = 'background:' + SAEKJA + ';border:1px solid rgba(52,168,98,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);text-shadow:0 1px 1px rgba(0,0,0,.55)';
  var INP = 'background:#eef1f6;color:#141822;border:1px solid rgba(20,24,34,.14);border-radius:6px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)';

  var S = 'html[data-thm-preset="brunastal"] body #view-allir-vidsk ';
  var F = ':not(#_p425a):not(#_p425b):not(#_p425c):not(#_p425d)';
  function imp(css) { return css.split(';').map(function (d) { d = d.trim(); if (!d) return ''; return /!important$/.test(d) ? d : d + '!important'; }).filter(Boolean).join(';'); }
  function r(sel, css) { return sel.split(',').map(function (s) { var m = s.trim().match(/^(.*?)(::?(?:before|after))$/); return S + (m ? m[1] + F + m[2] : s.trim() + F); }).join(',') + '{' + imp(css) + '}'; }
  function rammi(cls, frame, inni, hn, glod) {
    return [
      r('.b425-k.' + cls, 'background:' + frame + ';background-color:#0a0a0c;padding:2px;position:relative;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px));filter:drop-shadow(0 14px 24px rgba(10,14,22,.45))'),
      r('.b425-k.' + cls + ' > .b425-i', 'position:relative;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));color:#fff;background-image:' + inni + ';background-color:#0a0a0c;padding:14px 18px 14px;display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box;min-height:132px'),
      r('.b425-k.' + cls + ' .hn', 'background:' + hn + ';box-shadow:' + glod)
    ].join('\n');
  }

  var rules = [
    // hausinn: yfirlína í MONO eins og „ÁRSSKOÐUN" á Fyrirtæki í þjónustu; leitarreiturinn innfelldur
    r('.page-title h1', 'font-family:' + DISPLAY + ';font-weight:800;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
    r('.page-title__icon', 'display:none'),
    r('.page-title p', 'font-family:' + MONO + ';font-size:12px;color:#d5dbe6'),
    r('#_av-search', INP + ';height:38px;width:300px;font-family:' + SANS + ';font-size:13.5px;font-weight:500'),
    r('#_av-search:focus', 'outline:2px solid rgba(255,255,255,.55);outline-offset:-1px;background:#fff'),
    // ── talningarspjöldin (hönnun 414) ──
    r('.b425-grid', 'display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:12px;align-items:stretch;margin:0 0 14px;font-family:' + SANS),
    rammi('gull', R_GULL, INNI, RIVET_GULL, '0 0 6px 1px rgba(240,168,60,.7)'),
    rammi('graent', R_GRAENT, INNI_GRAENT, RIVET_GRAENT, '0 0 6px 1px rgba(35,163,90,.6)'),
    rammi('rautt', R_RAUTT, INNI_RAUTT, RIVET_RAUTT, '0 0 6px 1px rgba(226,85,85,.6)'),
    rammi('stal', R_STAL, INNI, RIVET_STAL, '0 1px 1px rgba(0,0,0,.7)'),
    r('.b425-k', 'cursor:pointer;transition:filter .12s'),
    r('.b425-k:hover', 'filter:drop-shadow(0 14px 24px rgba(10,14,22,.45)) brightness(1.12)'),
    r('.b425-k .hn', 'position:absolute;width:6px;height:6px;border-radius:50%;z-index:1;pointer-events:none'),
    r('.b425-i::before', 'content:"";position:absolute;left:0;right:0;top:0;height:3px;pointer-events:none'),
    r('.b425-k.gull > .b425-i::before', 'background:linear-gradient(90deg,#3d2b05,#ffe9b0 50%,#3d2b05)'),
    r('.b425-k.graent > .b425-i::before', 'background:linear-gradient(90deg,#06331a,#7fe0a8 50%,#06331a)'),
    r('.b425-k.rautt > .b425-i::before', 'background:linear-gradient(90deg,#380506,#ff9d95 50%,#380506)'),
    r('.b425-k.stal > .b425-i::before', 'background:linear-gradient(90deg,#3b3f46,#e2e6ec 50%,#3b3f46)'),
    r('.b425-m', 'display:flex;align-items:center;gap:9px;white-space:nowrap;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#d9dee6;min-width:0'),
    r('.b425-m .led', 'width:7px;height:7px;border-radius:50%;flex:none'),
    r('.b425-k.gull .led', 'background:#e0a93e;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 10px rgba(246,181,69,.85)'),
    r('.b425-k.graent .led', 'background:#3cc47c;box-shadow:0 0 0 3px rgba(60,196,124,.16),0 0 10px rgba(60,196,124,.8)'),
    r('.b425-k.rautt .led', 'background:#f0584c;box-shadow:0 0 0 3px rgba(240,88,76,.18),0 0 10px rgba(240,88,76,.85)'),
    r('.b425-k.stal .led', 'background:#8f98a8'),
    r('.b425-t', 'font-family:' + DISPLAY + ';font-size:44px;font-weight:800;line-height:1;letter-spacing:-.02em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);white-space:nowrap'),
    r('.b425-t small', 'font-size:16px;font-weight:700;color:#d9dee6;margin-left:6px;letter-spacing:0;font-family:' + DISPLAY),
    r('.b425-k.gull .b425-t', 'color:#f3d98a;text-shadow:0 0 18px rgba(230,190,90,.35),0 1px 0 rgba(0,0,0,.7)'),
    r('.b425-k.gull .b425-t small', 'color:#d3ab4e'),
    r('.b425-s', 'height:9px;border-radius:5px;background:#131316;box-shadow:inset 0 1px 2px rgba(0,0,0,.7);display:flex;overflow:hidden;gap:2px;flex:none'),
    r('.b425-s.stor', 'height:12px;border-radius:4px'),
    r('.b425-s span', 'height:100%;display:block;box-shadow:inset 0 1px 0 rgba(255,255,255,.16)'),
    r('.b425-s .gr', 'background:' + GR), r('.b425-s .gu', 'background:' + GU), r('.b425-s .ra', 'background:' + RA), r('.b425-s .st', 'background:' + ST), r('.b425-s .bl', 'background:' + BL),
    r('.b425-l', 'display:flex;flex-wrap:wrap;gap:6px 16px;font-family:' + MONO + ';font-size:11.5px;color:#d5dbe6;align-items:center;min-width:0'),
    r('.b425-l i', 'width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:6px;vertical-align:-1px;border:1px solid rgba(0,0,0,.4)'),
    r('.b425-l b', 'color:#fff;font-weight:700'), r('.b425-l small', 'color:#8e97a6;margin-left:5px;font-size:11px'),
    r('.b425-l .gr', 'background:#1f6f42'), r('.b425-l .gu', 'background:#9c7c2c'), r('.b425-l .ra', 'background:#8a2020'), r('.b425-l .st', 'background:#8f98a8'), r('.b425-l .bl', 'background:#3d68c9'),
    // ── tækjastikan: Kort/Listi = silfurskipting, Nýr = grænn, hjálpartexti MONO ──
    r('.b425-tools', 'margin-bottom:12px'),
    r('.b425-seg', 'border:1px solid rgba(20,24,34,.16);border-radius:6px;padding:0;gap:0;background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);overflow:hidden'),
    r('.b425-seg ._av-vm', 'border-radius:0;height:36px;padding:0 14px;font-family:' + SANS + ';font-size:13px;font-weight:600;color:#1f2530;background:transparent;border:0'),
    r('.b425-seg ._av-vm + ._av-vm', 'border-left:1px solid rgba(20,24,34,.14)'),
    r('.b425-seg ._av-vm[style*="#08080a"]', 'background:' + METAL_BTN + ';color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.4)'),
    r('#_av-new-cust', GREEN_BTN + ';border-radius:6px;height:38px;padding:0 16px;font-family:' + SANS + ';font-size:13px;font-weight:700'),
    r('.b425-tools > div:last-child:not(:first-child)', 'font-family:' + MONO + ';font-size:11px;color:#d5dbe6'),
    // ── síuræmurnar: samfelldar silfurræmur (418), virkur liður málmur; talan undir heitinu ──
    r('.b425-sia', 'display:inline-flex;width:max-content;max-width:100%;gap:0;margin:0 0 8px;background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);border-radius:9px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);flex-wrap:nowrap'),
    r('.b425-sia ._av-ft', 'height:44px;padding:0 16px;border:0;border-radius:0;background:transparent;box-shadow:none;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1f2530;line-height:1.1;white-space:nowrap'),
    r('.b425-sia ._av-ft + ._av-ft', 'border-left:1px solid rgba(20,24,34,.14)'),
    r('.b425-sia ._av-ft span', 'font-family:' + MONO + ';font-size:11px;font-weight:700;color:#6b7483;margin:0;padding:0;background:transparent'),
    r('.b425-sia ._av-ft[style*="#08080a"]', 'background:' + METAL + ';color:#fff'),
    r('.b425-sia ._av-ft[style*="#08080a"] span', 'color:#d5dbe6'),
    r('.b425-xsia', 'display:flex;flex-wrap:wrap;gap:4px;margin:0 0 16px;align-items:center'),
    r('.b425-xsia .b425-lbl', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#d5dbe6;padding-right:6px'),
    r('.b425-xsia ._av-xft', 'height:28px;padding:0 10px;border-radius:4px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#1f2530;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;display:inline-flex;align-items:center;gap:5px;white-space:nowrap'),
    r('.b425-xsia ._av-xft span', 'font-family:' + MONO + ';color:#6b7483;font-weight:700;margin:0;background:transparent;padding:0'),
    r('.b425-xsia ._av-xft[style*="#eef3ff"]', 'background:' + METAL_BTN + ';border-color:#000;color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.4)'),
    r('.b425-xsia ._av-xft[style*="#eef3ff"] span', 'color:#d5dbe6'),
    r('#_av-clear-x', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#ff9d95;background:transparent;border:0'),
    r('#_av-selmode', SILVER_BTN + ';border-radius:4px;height:28px;padding:0 12px;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-left:auto'),
    r('#_av-selmode[style*="#08080a"]', METAL_BTN_CSS + ';border-radius:4px'),
    // fjöldavals-stikan
    r('.b425-xsia + div[style*="#eef3ff"]', 'background:#eef1f6;background-image:linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px);border:1px solid rgba(20,24,34,.12);border-radius:6px'),
    r('.b425-xsia + div[style*="#eef3ff"] > span', 'font-family:' + MONO + ';color:#1f2530'),
    r('.b425-xsia + div[style*="#eef3ff"] button', SILVER_BTN + ';border-radius:4px;font-family:' + SANS + ';font-weight:600'),
    // ── kortasýnin: hvítar línur á plötu ──
    r('._av-card', 'background:#fff;border:0;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)'),
    r('._av-card:hover', 'box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.3),0 6px 14px rgba(10,14,22,.18)'),
    r('._av-card > div:first-child > div:first-child', 'font-family:' + SANS + ';color:#141822'),
    r('._av-card > div:first-child > div:last-child:not(:first-child)', 'font-family:' + MONO + ';color:#6b7483'),
    r('._av-toggle', 'border-radius:3px;font-family:' + MONO + ';letter-spacing:.04em;text-transform:uppercase;font-size:9.5px'),
    // ── listinn: síðuflettir og takkar í stíl ──
    r('._pager button', SILVER_BTN + ';border-radius:4px;font-family:' + SANS + ';font-weight:600'),
    r('.data-table-wrap', 'border-radius:10px;border:1px solid #000;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3)'),
    r('#view-allir-vidsk > .thm > .app-page > .app-main > div:last-child', 'color:#d5dbe6'),
    r('#view-allir-vidsk > .thm > .app-page > .app-main > div:last-child strong', 'color:#fff')
  ];
  var st = document.createElement('style');
  st.id = 'bstal-425';
  st.textContent = rules.join('\n');
  document.head.appendChild(st);
})();
/* === END 425 === */
