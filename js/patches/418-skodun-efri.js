/* 418 — Brunakerfis skoðun (#brunaskra) og Slökkvikerfis skoðun (#slokkvikerfi) í sama útliti og Ársskoðun (414/415/416)
 *   — 25.09.2026, Agnar: „settu þessa heroboxxes á brunakerfis skoðun og slökkvikerfisskoðun · kanski bara líka alveg að
 *   töflunni · með mánaðar súluritinu · svo þessar 3 síður séu bara mjög líkar".
 *
 *   Báðar síður eru EINN íhlutur (385 Thjonustuskra, 388 fóðrar brunakerfi; 392 gefur þeim Miðakerfis-útlit). Hér er sama
 *   aðferð og í 414: LESIÐ úr því sem 385 teiknar (._sk-kpis tölurnar, síuflísarnar, mánaðarflísarnar) og teiknuð eigin
 *   hólf (.b418-top) á undan ._sk-kpis — fjögur stálspjöld með skornum hornum og hnoðum (gull-hetja, grænt Skoðað, dökkrautt
 *   Fram yfir, stál Órukkað) og mánaða-strimill með dökkmálms-súlum. Gömlu KPI-hólfin og mánaðaröðin eru falin með CSS;
 *   smellir á strimilinn kalla á upprunalegu mánaðarflísarnar. Hausinn, stöðusían, leitin og taflan halda hnútum sínum og
 *   fá aðeins CSS: dökkur grunnur út í kanta (416), hvítur Playfair-titill, silfurflísar á dökku, töfluhólf með svörtum
 *   ramma (415). Enginn hnútur 385 er snertur, færður eða skrifað í.
 *
 *   Hopp: hólfin teiknast í sama tifi og 385 (MutationObserver á ._sk-root), innerHTML aðeins skipt þegar strengurinn
 *   breytist, fastar hæðir (flísar 50, skýring 44, strimill 17 + 92). Aðeins borðtölva (min-width:901px) í Brunastáli.
 *
 *   HT-2.10 — 02.10.2026 (hönnunin: https://claude.ai/artifact/9frzxk9JbTbojriNh25DjQ): síurnar og leitin eins og á
 *   Fyrirtæki í þjónustu. Röðin: spjöldin · stöðustikan + „Fleiri síur" + leitin sem fyllir línuna · virkar síur ·
 *   strimillinn · „Kerfin" · taflan. Póstnúmerið og „Fela þau sem eru úr þjónustu" fóru inn í „Fleiri síur" (okkar reitir
 *   stilla upprunalegu reitina, sem eiga ástandið áfram). Bilið milli Fyrirtækis og Nótu er farið (colgroup), og letrið í
 *   töflunni er það sama og á Ársskoðun (394). Enn er enginn hnútur 385 færður — röðin er `order` í flex-rót.
 */
(function () {
  'use strict';
  if (window.__skodunEfri418) return;
  window.__skodunEfri418 = true;

  var VIEWS = ['view-brunaskra', 'view-slokkvikerfi'];
  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
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
  var DARK = 'linear-gradient(180deg,#7a8190 0%,#454a55 35%,#26292f 60%,#3a3f49 100%)';
  var GOLDBAR = 'linear-gradient(180deg,#ffe9b0 0%,#d3ab4e 40%,#7a5608 60%,#a67f22 100%)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var RIVET = { stal: 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)', gull: 'radial-gradient(circle at 40% 35%,#fff3c4 0%,#f0a83c 45%,#7a4a08 100%)', graent: 'radial-gradient(circle at 40% 35%,#d8ffe6 0%,#23a35a 45%,#073a1d 100%)', rautt: 'radial-gradient(circle at 40% 35%,#ffd6d0 0%,#e25555 45%,#5a0a0a 100%)' };
  var GLOD = { stal: '0 1px 1px rgba(0,0,0,.7)', gull: '0 0 6px 1px rgba(240,168,60,.7)', graent: '0 0 6px 1px rgba(35,163,90,.6)', rautt: '0 0 6px 1px rgba(226,85,85,.6)' };
  var TOPP = { gull: 'linear-gradient(90deg,#3d2b05,#ffe9b0 50%,#3d2b05)', graent: 'linear-gradient(90deg,#06331a,#7fe0a8 50%,#06331a)', rautt: 'linear-gradient(90deg,#380506,#ff9d95 50%,#380506)', stal: 'linear-gradient(90deg,#3b3f46,#e2e6ec 50%,#3b3f46)' };
  var HN = '<span class="hn" style="top:9px;left:9px" aria-hidden="true"></span><span class="hn" style="top:9px;right:26px" aria-hidden="true"></span><span class="hn" style="bottom:9px;left:26px" aria-hidden="true"></span><span class="hn" style="bottom:9px;right:9px" aria-hidden="true"></span>';

  var F = ':not(#_p418a):not(#_p418b):not(#_p418c):not(#_p418d):not(#_p418e):not(#_p418f)';
  function blek(css) { return css.replace(/(^|;)color:([^;!]+)(?=;|$)/g, '$1color:$2!important'); }
  // ein regla fyrir báðar sýnirnar; `sel` með '::before/::after' fær gervi-auðkennin á undan
  function r(sel, css) {
    return VIEWS.map(function (id) {
      return sel.split(',').map(function (s) { var m = s.trim().match(/^(.*?)(::?(?:before|after))$/); var S = 'html[data-thm-preset="brunastal"] body #' + id + ' '; return S + (m ? m[1] + F + m[2] : s.trim() + F); }).join(',');
    }).join(',') + '{' + blek(css) + '}';
  }
  function rv(sel, css) { return VIEWS.map(function (id) { return 'html[data-thm-preset="brunastal"] body #' + id + sel + F; }).join(',') + '{' + blek(css) + '}'; }
  function rammi(cls, frame, inni) {
    return [
      r('.b418-k.' + cls, 'background:' + frame + ';background-color:#0a0a0c;padding:2px;position:relative;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px));filter:drop-shadow(0 14px 24px rgba(10,14,22,.45));min-width:0'),
      r('.b418-k.' + cls + ' > .b418-i', 'position:relative;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));color:#fff;background-image:' + inni + ';background-color:#0a0a0c;padding:14px 18px 14px;display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box'),
      r('.b418-k.' + cls + ' > .b418-i::before', 'content:"";position:absolute;left:0;right:0;top:0;height:3px;background:' + TOPP[cls] + ';pointer-events:none'),
      r('.b418-k.' + cls + ' .hn', 'background:' + RIVET[cls] + ';box-shadow:' + GLOD[cls])
    ].join('\n');
  }

  var rules = [
    // ── síðan: kolið út í kanta (416), hausinn án málmbands, sub-lína ─────────────────────────────────────────────
    rv('', 'background-color:#25272c!important;background-image:linear-gradient(180deg,#1d1f24 0%,#30333a 320px,#2a2c31 100%)!important'),
    r('.main-panel', 'padding:0!important;max-width:none!important'),
    r('._sk-root', 'max-width:none!important;margin:0!important;padding:18px 24px 30px!important;background:transparent!important;background-image:none!important;border:0!important;border-radius:0!important;box-shadow:none!important'),
    r('._sk-root::after', 'color:#8e97a6;border-top:1px solid rgba(255,255,255,.1);margin:12px 0 0;padding-top:10px;font-family:' + MONO + ';font-size:10.5px'),
    r('._sk-hd', 'background:transparent!important;border:0!important;padding:0 0 4px!important;margin:0 0 4px!important;box-shadow:none!important;position:relative;flex-wrap:wrap;align-items:center!important;gap:10px!important;padding-top:16px!important'),
    r('._sk-hd::before', 'content:"Skoðanir";position:absolute;left:0;top:0;width:auto;height:auto;border-radius:0;background:none;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#a9b1bf'),
    r('._sk-hd::after', 'content:none'),
    r('._sk-hd h1', 'font-family:' + DISPLAY + '!important;font-size:28px!important;font-weight:800!important;letter-spacing:-.01em!important;line-height:1.05!important;color:#fff;background:transparent!important;padding:0!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
    r('._sk-hd h1 small', 'font-family:' + MONO + '!important;font-size:12px!important;letter-spacing:.16em!important;color:#d3ab4e;margin-left:8px'),
    r('._sk-hd ._sk-btn', 'height:36px!important;border-radius:9px!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14)!important;color:#1f2530;font:600 13px ' + SANS + '!important;padding:0 14px!important'),
    r('._sk-hd ._sk-btn.on', 'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;border-color:#000!important;color:#fff'),
    r('._sk-hd ._sk-btn._sk-pri', 'background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)!important;border-color:rgba(190,32,28,.55)!important;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
    // gömlu hólfin falin þegar okkar eru komin (385 skrifar þau áfram — við lesum úr þeim)
    rv('.b418-on ._sk-kpis', 'display:none!important'),
    rv('.b418-on ._sk-sia + ._sk-sia:not(:has(._sk-inp))', 'display:none!important'),
    // ── okkar hólf ────────────────────────────────────────────────────────────────────────────────────────────
    r('.b418-top', 'display:flex;flex-direction:column;gap:12px;margin:0 0 14px;font-family:' + SANS),
    r('.b418-undir', 'font-family:' + MONO + ';font-size:11.5px;color:#c9d0da;margin:-2px 0 6px'),
    r('.b418-undir b', 'color:#fff'),
    r('.b418-grid', 'display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:12px;align-items:stretch'),
    rammi('gull', R_GULL, INNI), rammi('graent', R_GRAENT, INNI_GRAENT), rammi('rautt', R_RAUTT, INNI_RAUTT), rammi('stal', R_STAL, INNI),
    r('.b418-k .hn', 'position:absolute;width:6px;height:6px;border-radius:50%;z-index:1;pointer-events:none'),
    r('.b418-m', 'display:flex;align-items:center;gap:9px;white-space:nowrap;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#d9dee6;min-width:0'),
    r('.b418-m .led', 'width:7px;height:7px;border-radius:50%;flex:none'),
    r('.b418-k.gull .led', 'background:#e0a93e;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 10px rgba(246,181,69,.85)'),
    r('.b418-k.graent .led', 'background:#3cc47c;box-shadow:0 0 0 3px rgba(60,196,124,.16),0 0 10px rgba(60,196,124,.8)'),
    r('.b418-k.rautt .led', 'background:#f0584c;box-shadow:0 0 0 3px rgba(240,88,76,.18),0 0 10px rgba(240,88,76,.85)'),
    r('.b418-k.stal .led', 'background:#e0a93e;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 10px rgba(246,181,69,.85)'),
    r('.b418-p', 'display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid #000;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.14);font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#eef1f4;white-space:nowrap;flex:none'),
    r('.b418-p.ghost', 'background:transparent;border:1px solid rgba(255,255,255,.3);color:#e9edf3;box-shadow:none'),
    r('.b418-t', 'font-family:' + DISPLAY + ';font-size:44px;font-weight:800;line-height:1;letter-spacing:-.02em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);white-space:nowrap'),
    r('.b418-t small', 'font-size:16px;font-weight:700;color:#d9dee6;margin-left:6px;letter-spacing:0'),
    r('.b418-t.gull', 'color:#f3d98a;text-shadow:0 0 18px rgba(230,190,90,.35),0 1px 0 rgba(0,0,0,.7)'),
    r('.b418-t.gull small', 'color:#d3ab4e'),
    r('.b418-s', 'height:9px;border-radius:5px;background:#131316;box-shadow:inset 0 1px 2px rgba(0,0,0,.7);display:flex;overflow:hidden;gap:2px;flex:none'),
    r('.b418-s.stor', 'height:12px;border-radius:4px'),
    r('.b418-s span', 'height:100%;display:block;box-shadow:inset 0 1px 0 rgba(255,255,255,.16)'),
    r('.b418-s .gr', 'background:' + GR), r('.b418-s .gu', 'background:' + GU), r('.b418-s .ra', 'background:' + RA), r('.b418-s .st', 'background:' + ST),
    r('.b418-l', 'display:flex;flex-wrap:wrap;gap:6px 16px;font-family:' + MONO + ';font-size:11.5px;color:#d5dbe6;align-items:center;min-width:0'),
    r('.b418-k.gull .b418-l', 'flex-direction:column;align-items:flex-start;gap:6px;flex-wrap:nowrap'),
    r('.b418-k:not(.gull) .b418-l', 'min-height:44px;align-content:flex-start'),
    r('.b418-l i', 'width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:6px;vertical-align:-1px;border:1px solid rgba(0,0,0,.4)'),
    r('.b418-l b', 'color:#fff;font-weight:700'), r('.b418-l small', 'color:#8e97a6;margin-left:5px;font-size:11px'),
    r('.b418-l .gr', 'background:#1f6f42'), r('.b418-l .gu', 'background:#9c7c2c'), r('.b418-l .st', 'background:#8f98a8'), r('.b418-l .ra', 'background:#8a2020'),
    r('.b418-tikk', 'display:flex;flex-direction:column;gap:5px;min-height:60px'),
    r('.b418-tikk .r', 'display:grid;grid-template-columns:104px minmax(0,1fr) 34px;gap:8px;align-items:center;font-family:' + MONO + ';font-size:11px;color:#d5dbe6'),
    r('.b418-tikk .r b', 'color:#fff;text-align:right;font-weight:700'),
    r('.b418-tikk .bar', 'height:5px;border-radius:3px;background:#131316;box-shadow:inset 0 1px 2px rgba(0,0,0,.7)'),
    r('.b418-tikk .bar span', 'display:block;height:100%;border-radius:3px'),
    r('.b418-tikk .bar .ra', 'background:linear-gradient(90deg,#c95050,#6c1414)'), r('.b418-tikk .bar .gu', 'background:linear-gradient(90deg,#d8b866,#7a5a18)'), r('.b418-tikk .bar .st', 'background:linear-gradient(90deg,#8a919c,#3e434c)'),
    r('.b418-f3', 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px'),
    r('.b418-f', 'display:flex;flex-direction:column;justify-content:center;gap:2px;height:50px;box-sizing:border-box;padding:6px 10px;border-radius:6px!important;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)!important;box-shadow:none!important;min-width:0;overflow:hidden'),
    r('.b418-f .l,.b418-f .v', 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block'),
    r('.b418-f .l', 'font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a9b1bf'),
    r('.b418-f .v', 'font-family:' + MONO + '!important;font-size:13px;font-weight:700;color:#fff'),
    r('.b418-f .v small', 'font-size:10.5px;font-weight:400;color:#a9b1bf;margin-left:3px'),
    // strimillinn
    r('.b418-strim', 'background:' + METAL + ';background-color:#0a0a0c;border:1px solid #000;border-radius:10px;padding:12px 16px 10px;display:flex;flex-direction:column;gap:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)'),
    r('.b418-strim .hd', 'height:17px;display:flex;align-items:center;gap:10px;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#e9cf85'),
    r('.b418-strim .hd .dl', 'width:7px;height:7px;background:#e0a93e;transform:rotate(45deg);display:inline-block;flex:none'),
    r('.b418-strim .hd .r', 'margin-left:auto;color:#d5dbe6;letter-spacing:.04em;text-transform:none;font-weight:400;font-size:11.5px'),
    r('.b418-strim .hd .r b', 'color:#fff;font-weight:700'),
    r('.b418-man', 'display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:6px;align-items:end;height:92px'),
    r('.b418-man button', 'all:unset;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;height:100%;cursor:pointer;min-width:0;box-sizing:border-box;padding:0!important;min-height:0!important;font-size:10px!important;line-height:1!important'),
    r('.b418-man button i', 'display:block;width:100%;border-radius:3px 3px 0 0;background:' + DARK + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.5);transition:filter .12s'),
    r('.b418-man button:hover i', 'filter:brightness(1.15)'),
    r('.b418-man button.nu i', 'background:' + GOLDBAR + ';box-shadow:0 0 12px rgba(230,190,90,.5),inset 0 1px 0 rgba(255,255,255,.5)'),
    r('.b418-man button.on i', 'box-shadow:0 0 0 2px #f3d98a,0 0 14px rgba(230,190,90,.5),inset 0 1px 0 rgba(255,255,255,.3)'),
    r('.b418-man button.tom i', 'opacity:.35'),
    r('.b418-man button.all i', 'background:transparent;border:1px dashed rgba(255,255,255,.35);box-shadow:none;box-sizing:border-box'),
    r('.b418-man button em', 'font-family:' + MONO + ';font-size:10px;font-weight:700;font-style:normal;color:#d5dbe6;letter-spacing:.04em;white-space:nowrap;line-height:15px'),
    r('.b418-man button u', 'font-family:' + MONO + ';font-size:10px;color:#8e97a6;text-decoration:none;line-height:15px'),
    r('.b418-man button.nu em,.b418-man button.on em', 'color:#f3d98a'),
    r('.b418-man button.nu u,.b418-man button.on u', 'color:#e9cf85'),
    r('.b418-man button:focus-visible', 'outline:2px solid #f3d98a;outline-offset:2px;border-radius:3px'),
    // ── stöðusían og leitin (385 hnútar) á dökku: silfurflísar, valin flís í málmi — eins og síustikan á Ársskoðun ──
    r('._sk-sia', 'background:transparent!important;box-shadow:none!important;margin:0 0 10px!important;padding:0!important;border-radius:0!important;gap:6px!important'),
    r('._sk-sia::before', 'content:none!important'),
    r('._sk-chip', 'height:36px!important;padding:0 14px!important;border-radius:9px!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14)!important;color:#1f2530;font:600 13px ' + SANS + '!important'),
    r('._sk-chip b', 'background:#eceff4!important;color:#1f2530;height:18px;min-width:18px;padding:0 5px;border-radius:5px;font-family:' + MONO + '!important;font-size:11px!important'),
    r('._sk-chip.on', 'background:' + METAL + '!important;border-color:#000!important;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
    r('._sk-chip.on b', 'background:rgba(255,255,255,.16)!important;color:#fff'),
    r('._sk-sia:has(._sk-inp)', 'margin-bottom:14px!important'),
    // 30.09.2026 (Agnar: „breyta ávölu ljósu tökkunum frekar eins og er í fyrirtæki í þjónustu“): stöðuröðin er EIN samfelld
    // silfurstika (sömu flísar, engin bil, skil á milli), valið í málmi, talan undir heitinu — eins og síustikan á Ársskoðun.
    // 02.10.2026 (HT-2.10): hornin 3px og skugginn undir eins og síustikan á Fyrirtæki í þjónustu (394) — sama stika á öllum þremur síðum.
    r('._sk-kpis + ._sk-sia', 'display:inline-flex!important;width:max-content;max-width:100%;gap:0!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.22)!important;border-radius:3px!important;overflow:hidden;box-shadow:0 6px 16px -12px rgba(0,0,0,.5)!important'),
    r('._sk-kpis + ._sk-sia ._sk-chip', 'height:44px!important;padding:0 17px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;line-height:1.15;color:#3a4250;font:600 12.5px ' + SANS + '!important;white-space:nowrap'),
    r('._sk-kpis + ._sk-sia ._sk-chip + ._sk-chip', 'border-left:1px solid rgba(20,24,34,.14)!important'),
    r('._sk-kpis + ._sk-sia ._sk-chip:not(.on):hover', 'background:rgba(20,24,34,.06)!important'),
    r('._sk-kpis + ._sk-sia ._sk-chip b', 'height:auto;min-width:0;padding:0;margin:0!important;background:transparent!important;color:#5b6472!important;font:700 11.5px ' + MONO + '!important'),
    r('._sk-kpis + ._sk-sia ._sk-chip.on', 'background:' + INNI + '!important;color:#fff;font-weight:700!important;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
    r('._sk-kpis + ._sk-sia ._sk-chip.on b', 'color:rgba(255,255,255,.78)!important'),
    r('._sk-kpis + ._sk-sia ._sk-chip[data-st="fram"]:not(.on) b', 'color:#b42318!important'),
    r('._sk-kpis + ._sk-sia ._sk-chip[data-st="orukkad"]:not(.on) b', 'color:#7a4f06!important'),
    r('._sk-kpis + ._sk-sia ._sk-chip[data-st="buid"]:not(.on) b', 'color:#0b6b3a!important'),
    r('._sk-sia:has(._sk-inp) select._sk-inp', 'background:' + SILVER + '!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;font-weight:600!important;max-width:180px'),
    r('._sk-inp', 'height:38px!important;border-radius:9px!important;background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;color:#1f2530;font:400 13px ' + SANS + '!important'),
    r('#_sk-leit', 'flex:1;min-width:260px'),
    // ── HT-2.10 (02.10.2026, Agnar: „so it will look like that — the filters and the search bars"): sama röð og á
    //    Fyrirtæki í þjónustu — spjöldin · stöðustikan + „Fleiri síur" + leitin í einni línu · virkar síur · strimillinn ·
    //    hlutahausinn „Kerfin" · taflan. ENGINN hnútur 385 er færður: ._sk-root verður flex-röð og hver hluti fær `order`;
    //    leitarröðin og okkar hólf eru `display:contents` svo leitarreiturinn og okkar hlutar raðast beint í rótina.
    //    Póstnúmerið og „Fela þau sem eru úr þjónustu" eru FALIN hér og stjórnast úr „Fleiri síur" (okkar reitir smella á
    //    upprunalegu reitina, sem eiga ástandið áfram). Allt bundið við .b418-on — falli hólfið út stendur gamla röðin.
    rv('.b418-on ._sk-root', 'display:flex!important;flex-wrap:wrap!important;align-items:center!important;column-gap:10px!important;row-gap:0!important'),
    rv('.b418-on ._sk-root > *', 'flex:0 0 100%;min-width:0;order:20'),
    r('._sk-root::after', 'order:99;flex:0 0 100%'),
    rv('.b418-on ._sk-hd', 'order:1'),
    rv('.b418-on ._sk-villa', 'order:2'),
    rv('.b418-on .b418-top', 'display:contents!important'),
    // okkar hlutar eru börn .b418-top (display:contents), ekki bein börn rótarinnar — `> *` nær ekki til þeirra
    rv('.b418-on .b418-undir', 'order:3;flex:0 0 100%;min-width:0'),
    rv('.b418-on .b418-grid', 'order:4;flex:0 0 100%;min-width:0;margin:0 0 14px'),
    rv('.b418-on ._sk-kpis + ._sk-sia', 'order:5;flex:0 0 auto!important;margin:0 0 10px!important'),
    rv('.b418-on .b418-fleiri', 'order:6;flex:0 0 auto!important;margin:0 0 10px'),
    rv('.b418-on ._sk-sia:has(._sk-inp)', 'display:contents!important'),
    rv('.b418-on #_sk-leit', 'order:7;flex:1 1 220px!important;min-width:180px!important;max-width:none!important;height:44px!important;margin:0 0 10px!important;padding:0 14px!important;border-radius:3px!important;border:1px solid rgba(20,24,34,.18)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.14)!important'),
    rv('.b418-on #_sk-postnr', 'display:none!important'),
    rv('.b418-on ._sk-sia:has(._sk-inp) > ._sk-lbl', 'display:none!important'),
    rv('.b418-on ._sk-sia:has(._sk-inp) > ._sk-sp', 'display:none!important'),
    rv('.b418-on .b418-tags', 'order:8;flex:0 0 100%;min-width:0;margin:0 0 10px'),
    rv('.b418-on .b418-strim', 'order:9;flex:0 0 100%;min-width:0;margin:0 0 14px'),
    rv('.b418-on .b418-sec', 'order:10;flex:0 0 100%;min-width:0'),
    // „Fleiri síur" — takki og hólf eins og .arsm-more/.arsm-menu í 394
    r('.b418-fleiri', 'position:relative;display:inline-flex'),
    r('.b418-fleiri > button', 'height:44px!important;display:inline-flex!important;align-items:center;gap:8px;padding:0 13px!important;margin:0!important;border:1px solid rgba(20,24,34,.16)!important;border-radius:3px!important;background:' + SILVER + '!important;background-image:' + SILVER + '!important;box-shadow:none!important;color:#3a4250;text-shadow:none!important;font:600 12.5px ' + SANS + '!important;cursor:pointer'),
    r('.b418-fleiri > button:hover', 'background:linear-gradient(180deg,#fff 0%,#eaedf2 100%)!important'),
    r('.b418-fleiri > button b', 'display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:2px;background:' + R_RAUTT + ';color:#fff;font:700 10px ' + MONO),
    r('.b418-fleiri > button svg', 'width:12px;height:12px;flex:none'),
    r('.b418-menu', 'position:absolute;top:50px;left:0;z-index:60;width:300px;box-sizing:border-box;display:flex;flex-direction:column;gap:4px;padding:10px;background:#fff;border:1px solid rgba(20,24,34,.14);border-radius:3px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5);color:#1f2530'),
    r('.b418-menu[hidden]', 'display:none'),
    r('.b418-menu .ml', 'padding:4px 2px;font:700 10px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#5b6472'),
    r('.b418-menu select', 'height:40px!important;width:100%!important;max-width:none!important;box-sizing:border-box;padding:0 10px!important;margin:0!important;border:1px solid rgba(20,24,34,.16)!important;border-radius:3px!important;background:' + SILVER + '!important;box-shadow:none!important;color:#1f2530;font:600 13px ' + SANS + '!important'),
    r('.b418-menu .skil', 'height:1px;margin:6px 0;background:#edf0f4'),
    r('.b418-menu label.chk', 'display:flex;align-items:center;gap:10px;min-height:40px;padding:0 4px;margin:0;color:#1f2530;font:500 13px ' + SANS + '!important;cursor:pointer'),
    r('.b418-menu label.chk input', 'width:16px;height:16px;margin:0;accent-color:#971515;flex:none'),
    r('.b418-tags', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap'),
    r('.b418-tags > i', 'font:700 10.5px/1 ' + MONO + ';font-style:normal;letter-spacing:.14em;text-transform:uppercase;color:#c9d0da'),
    r('.b418-tag', 'display:inline-flex!important;align-items:center;gap:7px;height:28px!important;padding:0 10px 0 0!important;margin:0!important;overflow:hidden;border:1px solid rgba(20,24,34,.16)!important;border-radius:3px!important;background:' + SILVER + '!important;background-image:' + SILVER + '!important;box-shadow:none!important;color:#3a4250;text-shadow:none!important;font:600 11.5px ' + SANS + '!important;cursor:pointer'),
    r('.b418-tag > span', 'align-self:stretch;width:4px;background:linear-gradient(180deg,#ff9d95 0%,#e25555 40%,#971515 60%,#b52020 100%)'),
    r('.b418-tag svg', 'width:11px;height:11px;flex:none'),
    r('.b418-sec', 'display:flex;align-items:baseline;gap:12px;margin:4px 2px 8px'),
    r('.b418-sec h2', 'margin:0!important;padding:0!important;border:0!important;background:none!important;font:800 24px/1.1 ' + DISPLAY + '!important;letter-spacing:-.02em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6)'),
    r('.b418-sec span', 'font:500 11.5px/1.4 ' + MONO + ';color:#c9d0da'),
    // Bilið í töflunni (krossað yfir 02.10): 392 gaf Fyrirtæki-dálknum `width:auto`, svo hann gleypti allt aukaplássið og
    // Nótan byrjaði hálfa leið yfir töfluna. Fyrirtækið fær fasta breidd og Nótan aukaplássið — textinn byrjar strax á eftir.
    r('table._sk-tbl colgroup col:nth-child(2)', 'width:250px!important'),
    r('table._sk-tbl colgroup col:nth-child(3)', 'width:auto!important'),
    // Letrið í töflunni (Agnar 02.10.2026: „finnst fontin eitthvað óskýr og dull … í töflunni") — sama sett á öllum þremur
    // síðunum (Ársskoðun: 394). Nöfn í Playfair 16.5/700 með réttum tölustöfum (Playfair er sjálfgefið með gamaldags
    // tölustöfum, 0 líktist litlu o), kt og heimilisfang í Mono 500 dekkra, póstnúmer blátt #1d5bbf feitt (6,1:1 á hvítu),
    // mánuður í Mono hástöfum með breiðu stafabili. Þykktirnar eru hlaðnar í FONT-hlekknum hér neðst — engin fölsuð feitletrun.
    // font-variant-numeric þarf !important: `font:`-styttingin með !important núllstillir hana annars (mælt: „normal")
    r('table._sk-tbl ._sk-co', 'font:700 16.5px/1.2 ' + DISPLAY + '!important;font-variant-numeric:lining-nums!important;letter-spacing:0;color:#11141c'),
    r('table._sk-tbl ._sk-kt', 'font:500 11px/1.4 ' + MONO + '!important;color:#3a4250'),
    r('table._sk-tbl ._sk-addr', 'font:500 11.5px/1.35 ' + MONO + '!important;color:#1f2530'),
    r('table._sk-tbl ._sk-post', 'font:700 12.5px ' + MONO + '!important;color:#1d5bbf'),
    r('table._sk-tbl select._sk-man', 'font:700 11px ' + MONO + '!important;text-transform:uppercase;letter-spacing:.14em;color:#1f2530'),
    r('._sk-lbl', 'color:#c9d0da;font:500 12.5px ' + SANS + '!important'),
    r('._sk-sia ._sk-sp + ._sk-lbl', 'background:' + SILVER + '!important;color:#1f2530;border:1px solid rgba(20,24,34,.12)!important;height:24px;padding:0 9px;border-radius:3px;font-family:' + MONO + '!important;font-size:11px!important;font-weight:700!important'),
    // ── taflan: hólfið eins og 415 ──
    r('._sk-tblwrap', 'border:1px solid #000!important;border-radius:10px!important;box-shadow:0 18px 40px -12px rgba(10,14,22,.6)!important;background:#fff!important;overflow-x:auto'),
    r('table._sk-tbl th', 'height:38px!important;font-family:' + MONO + '!important;font-size:10px!important;font-weight:700!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:#d9dee6;border-bottom:1px solid #000!important'),
    r('table._sk-tbl tbody td', 'height:58px!important;border-top:1px solid #edf0f4!important;color:#1f2530;vertical-align:middle!important'),
    r('table._sk-tbl tbody tr._sk-row:nth-child(odd) td', 'background:#fafbfd'),
    r('table._sk-tbl tbody tr._sk-row:hover td', 'background:#f3f5f9!important')
  ];
  var css = '@media (min-width:901px){' + rules.join('\n') + '}';
  var st = document.getElementById('_skodun-efri-418-css');
  if (!st) { st = document.createElement('style'); st.id = '_skodun-efri-418-css'; document.head.appendChild(st); }
  st.textContent = css;
  // Þykktirnar sem reglurnar nota (Playfair 700/800, Mono 500/700, Plex 600/700). index.html hleður aðeins Playfair 600/700
  // og Mono 400/500 — vafrinn falsar þá 800 og Mono 700 og smátt letur verður loðið. Einn hlekkur, deildur með 394.
  if (!document.getElementById('_bstal-c-font')) {
    var fl = document.createElement('link'); fl.id = '_bstal-c-font'; fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
    document.head.appendChild(fl);
  }

  // ── lestur ────────────────────────────────────────────────────────────────────────────────────────────────────
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function heil(s) { var m = String(s || '').match(/\d[\d.]*/); return m ? parseInt(m[0].replace(/\./g, ''), 10) : NaN; }
  function isk(n) { return isFinite(n) ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function w(a, b) { return (isFinite(a) && isFinite(b) && b > 0) ? Math.max(0, Math.min(100, a / b * 100)).toFixed(1) + '%' : '0%'; }
  var MAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Maí', 'Jún', 'Júl', 'Ágú', 'Sep', 'Okt', 'Nóv', 'Des'];

  function lesa(root) {
    var kpis = Array.prototype.slice.call(root.querySelectorAll('._sk-kpis ._sk-kpi')).map(function (k) { return { l: txt(k.querySelector('small')).toLowerCase(), n: heil(txt(k.querySelector('b'))) }; });
    if (!kpis.length) return null;
    var kpi = function (re) { var k = kpis.find(function (x) { return re.test(x.l); }); return k ? k.n : NaN; };
    var sior = root.querySelectorAll('._sk-sia');
    var chips = function (row) { return row ? Array.prototype.slice.call(row.querySelectorAll('._sk-chip')).map(function (c) { var b = c.querySelector('b'); var nafn = txt(c).replace(txt(b), '').trim(); return { nafn: nafn, n: heil(txt(b)), on: c.classList.contains('on'), tom: c.classList.contains('tom'), el: c }; }) : []; };
    var stada = chips(sior[0]);
    var man = chips(sior[1]).filter(function (c) { return !/mánuð/i.test(c.nafn) || /^Allir/i.test(c.nafn); });
    var chip = function (re) { var c = stada.find(function (x) { return re.test(x.nafn); }); return c ? c.n : NaN; };
    var h1 = root.querySelector('._sk-hd h1');
    var ar = (txt(h1 && h1.querySelector('small')).match(/\d{4}/) || [String(new Date().getFullYear())])[0];
    var taln = txt(root.querySelector('._sk-sia ._sk-sp + ._sk-lbl'));
    // Aukasíurnar sem „Fleiri síur" sýnir — LESNAR úr reitum 385, sem eiga ástandið (state.postnr / state.felaUr)
    var pnSel = root.querySelector('#_sk-postnr'), felaChk = root.querySelector('#_sk-fela');
    var sa = root.querySelector('table._sk-tbl th ._sk-sa');
    return {
      postnr: pnSel ? pnSel.value : '', pnOpts: pnSel ? Array.prototype.map.call(pnSel.options, function (o) { return [o.value, txt(o)]; }) : [],
      fela: !!(felaChk && felaChk.checked), harFela: !!felaChk,
      rodun: sa ? txt(sa.parentNode).replace(txt(sa), '').trim().toLowerCase() : '',
      ar: ar, taln: taln,
      kerfi: kpi(/kerfi í þjónustu/), skodad: kpi(/^skoðað \d{4}/), framYfir: kpi(/gjalddaga|fram yfir/), orukkad: kpi(/órukkað/), verdVantar: kpi(/verð vantar/),
      cFram: chip(/^fram yfir/i), cMan: chip(/^þessi mánuður/i), cVinnslu: chip(/^í vinnslu/i), cOrukkad: chip(/^órukkað/i), cFramundan: chip(/^framundan/i), cBuid: chip(/^búið/i),
      man: man
    };
  }

  // ── teikning ──────────────────────────────────────────────────────────────────────────────────────────────────
  var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var KROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="#5b6472" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var opid = {};   // er „Fleiri síur" opið, per sýn — í breytu, ekki DOM-klasa (endurteikning þurrkar klasa)
  // „Fleiri síur", virkar síur og hlutahausinn. Röðin á skjánum kemur úr `order` í CSS, ekki úr röð hnútanna.
  function sius(d, id) {
    var virkar = [];
    if (d.postnr) virkar.push({ k: 'postnr', l: 'Póstnúmer ' + d.postnr });
    if (d.fela) virkar.push({ k: 'fela', l: 'Úr þjónustu falin' });
    var o = !!opid[id];
    var fleiri = '<div class="b418-fleiri">' +
      '<button type="button" data-b418="fleiri" aria-haspopup="true" aria-expanded="' + o + '">Fleiri síur' + (virkar.length ? '<b>' + virkar.length + '</b>' : '') + CHEV + '</button>' +
      '<div class="b418-menu" role="dialog" aria-label="Fleiri síur"' + (o ? '' : ' hidden') + '>' +
        (d.pnOpts.length ? '<label class="ml" for="_b418-pn-' + id + '">Póstnúmer</label><select id="_b418-pn-' + id + '" data-b418="postnr">' +
          d.pnOpts.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (p[0] === d.postnr ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select>' : '') +
        (d.harFela ? '<div class="skil" aria-hidden="true"></div><label class="chk"><input type="checkbox" data-b418="fela"' + (d.fela ? ' checked' : '') + '>Fela þau sem eru úr þjónustu</label>' : '') +
      '</div></div>';
    var tags = virkar.length ? '<div class="b418-tags"><i>Virkar síur</i>' + virkar.map(function (t) {
      return '<button type="button" class="b418-tag" data-b418="tag" data-tag="' + t.k + '" aria-label="Taka af: ' + esc(t.l) + '"><span aria-hidden="true"></span>' + esc(t.l) + KROSS + '</button>';
    }).join('') + '</div>' : '';
    var sec = '<div class="b418-sec"><h2>Kerfin</h2><span>' + esc(d.taln || '') + ' í þessari síu' + (d.rodun ? ' · raðað eftir ' + esc(d.rodun) : '') + '</span></div>';
    return fleiri + tags + sec;
  }

  function html(d) {
    var eftir = (isFinite(d.kerfi) && isFinite(d.skodad)) ? d.kerfi - d.skodad : NaN;
    var pct = (isFinite(d.kerfi) && d.kerfi > 0 && isFinite(d.skodad)) ? Math.round(d.skodad / d.kerfi * 100) : NaN;
    var tikkMax = Math.max(1, d.cFram || 0, d.cMan || 0, d.cFramundan || 0);
    var nuM = new Date().getMonth();
    var manFl = d.man.filter(function (m) { return !/^Allir/i.test(m.nafn); });
    var maxH = Math.max(1, Math.max.apply(null, manFl.map(function (m) { return isFinite(m.n) ? m.n : 0; })));
    var medMan = manFl.reduce(function (a, m) { return a + (isFinite(m.n) ? m.n : 0); }, 0);
    var nu = manFl[nuM];
    var grid = '' +
      '<div class="b418-undir"><b>' + isk(d.kerfi) + '</b> kerfi í þjónustu · <b>' + isk(d.skodad) + '</b> skoðuð ' + esc(d.ar) + ' · <b>' + isk(d.framYfir) + '</b> á gjalddaga eða fram yfir — árið gert upp kerfi fyrir kerfi</div>' +
      '<div class="b418-grid">' +
        // Hetjan: kerfi í þjónustu
        '<div class="b418-k gull"><div class="b418-i">' + HN +
          '<div class="b418-m"><span class="led" aria-hidden="true"></span>Kerfi í þjónustu ' + esc(d.ar) + '<span class="b418-p">' + isk(d.kerfi) + ' kerfi</span>' + (d.taln ? '<span class="b418-p ghost" style="margin-left:auto">' + esc(d.taln) + '</span>' : '') + '</div>' +
          '<div style="display:flex;align-items:flex-end;gap:14px;min-width:0"><div class="b418-t gull">' + isk(d.kerfi) + '<small>kerfi</small></div>' +
            '<span class="b418-l" style="padding-bottom:5px"><span><i class="gr" aria-hidden="true"></i>Skoðað <b>' + isk(d.skodad) + '</b><small>' + (isFinite(pct) ? pct + '%' : '—') + '</small></span><span><i class="gu" aria-hidden="true"></i>Eftir <b>' + isk(eftir) + '</b><small>' + (isFinite(d.framYfir) ? isk(d.framYfir) + ' fram yfir' : '') + '</small></span></span></div>' +
          '<div class="b418-s stor" role="img" aria-label="' + (isFinite(pct) ? pct + '% skoðað' : '') + '"><span class="gr" style="width:' + w(d.skodad, d.kerfi) + '"></span><span class="gu" style="width:' + w(eftir, d.kerfi) + '"></span></div>' +
          '<div class="b418-f3">' +
            '<div class="b418-f"><span class="l">Þessi mánuður</span><span class="v">' + isk(d.cMan) + '<small>kerfi</small></span></div>' +
            '<div class="b418-f"><span class="l">Framundan</span><span class="v">' + isk(d.cFramundan) + '<small>kerfi</small></span></div>' +
            '<div class="b418-f"><span class="l">Búið</span><span class="v">' + isk(d.cBuid) + '<small>kerfi</small></span></div>' +
          '</div>' +
        '</div></div>' +
        // Skoðað
        '<div class="b418-k graent"><div class="b418-i">' + HN +
          '<div class="b418-m"><span class="led" aria-hidden="true"></span>Skoðað ' + esc(d.ar) + '</div>' +
          '<div class="b418-t">' + isk(d.skodad) + '<small>kerfi</small></div>' +
          '<div class="b418-s" role="img" aria-label="' + (isFinite(pct) ? pct + '% af kerfum' : '') + '"><span class="gr" style="width:' + w(d.skodad, d.kerfi) + '"></span></div>' +
          '<div class="b418-l"><span><b>' + (isFinite(pct) ? pct + '%' : '—') + '</b> af kerfum</span>' + (isFinite(d.cVinnslu) ? '<span><b>' + isk(d.cVinnslu) + '</b> í vinnslu<small>skýrsla eftir</small></span>' : '') + '</div>' +
        '</div></div>' +
        // Á gjalddaga / fram yfir
        '<div class="b418-k rautt"><div class="b418-i">' + HN +
          '<div class="b418-m"><span class="led" aria-hidden="true"></span>Á gjalddaga · fram yfir</div>' +
          '<div class="b418-t">' + isk(d.framYfir) + '<small>kerfi</small></div>' +
          '<div class="b418-tikk">' +
            '<div class="r"><span>Fram yfir</span><div class="bar"><span class="ra" style="width:' + w(d.cFram, tikkMax) + '"></span></div><b>' + isk(d.cFram) + '</b></div>' +
            '<div class="r"><span>Þessi mánuður</span><div class="bar"><span class="gu" style="width:' + w(d.cMan, tikkMax) + '"></span></div><b>' + isk(d.cMan) + '</b></div>' +
            '<div class="r"><span>Framundan</span><div class="bar"><span class="st" style="width:' + w(d.cFramundan, tikkMax) + '"></span></div><b>' + isk(d.cFramundan) + '</b></div>' +
          '</div>' +
        '</div></div>' +
        // Skoðað en órukkað
        '<div class="b418-k stal"><div class="b418-i">' + HN +
          '<div class="b418-m"><span class="led" aria-hidden="true"></span>Skoðað en órukkað</div>' +
          '<div class="b418-t">' + isk(d.orukkad) + '<small>kerfi</small></div>' +
          '<div class="b418-s" role="img" aria-label="' + (isFinite(d.orukkad) && isFinite(d.skodad) ? isk(d.orukkad) + ' af ' + isk(d.skodad) + ' skoðuðum' : '') + '"><span class="gu" style="width:' + w(d.orukkad, d.skodad) + '"></span><span class="gr" style="width:' + w((d.skodad || 0) - (d.orukkad || 0), d.skodad) + '"></span></div>' +
          '<div class="b418-l"><span><i class="gu" aria-hidden="true"></i><b>' + isk(d.orukkad) + '</b> órukkað</span><span><i class="gr" aria-hidden="true"></i><b>' + isk(isFinite(d.skodad) && isFinite(d.orukkad) ? d.skodad - d.orukkad : NaN) + '</b> rukkað</span>' + (isFinite(d.verdVantar) ? '<span class="b418-p ghost" style="height:20px;font-size:10px">' + isk(d.verdVantar) + ' verð vantar</span>' : '') + '</div>' +
        '</div></div>' +
      '</div>';
    var strim = '<div class="b418-strim">' +
      '<div class="hd"><span class="dl" aria-hidden="true"></span>Skoðunarmánuður · ' + esc(d.ar) +
        (d.man.length ? '<span class="r"><b>' + isk(medMan) + '</b> með mánuð' + (nu ? ' · ' + esc(nu.nafn) + ' <b>' + isk(isFinite(nu.n) ? nu.n : 0) + '</b> í dag' : '') + '</span>' : '') + '</div>' +
      '<div class="b418-man" role="group" aria-label="Skoðunarmánuður">' + d.man.map(function (m, i) {
        var all = /^Allir/i.test(m.nafn);
        var idx = MAN.indexOf(m.nafn);
        var cls = (all ? 'all' : '') + (m.on ? ' on' : '') + (!all && idx === nuM ? ' nu' : '') + (m.tom ? ' tom' : '');
        var h = all ? 56 : Math.max(6, Math.round((isFinite(m.n) ? m.n : 0) / maxH * 52));
        return '<button type="button" class="' + cls.trim() + '" data-b418="man" data-i="' + i + '" aria-pressed="' + (m.on ? 'true' : 'false') + '" title="' + esc(m.nafn) + (isFinite(m.n) ? ' · ' + isk(m.n) : '') + '"><i style="height:' + h + 'px"></i><em>' + esc(all ? 'Allir' : m.nafn) + '</em><u>' + (all ? isk(medMan) : (isFinite(m.n) ? isk(m.n) : '·')) + '</u></button>';
      }).join('') + '</div>' +
    '</div>';
    return grid + strim;
  }

  // ── tik ──────────────────────────────────────────────────────────────────────────────────────────────────────
  var sidast = {};
  function scope() { var h = document.documentElement; return h.getAttribute('data-thm-preset') === 'brunastal' && innerWidth >= 901; }
  function smellur(e) {
    var root = e.target.closest('._sk-root'); if (!root) return;
    var fl = e.target.closest('[data-b418="fleiri"]');
    if (fl) { var v = fl.closest('[id^="view-"]'); if (v) { opid[v.id] = !opid[v.id]; schedule(); } return; }
    var tg = e.target.closest('[data-b418="tag"]');
    if (tg) { if (tg.dataset.tag === 'postnr') setjaPostnr(root, ''); else if (tg.dataset.tag === 'fela') setjaFela(root, false); return; }
    var b = e.target.closest('[data-b418="man"]'); if (!b) return;
    var d = lesa(root); var m = d && d.man[+b.dataset.i]; if (m && m.el) m.el.click();
  }
  // Okkar reitir í „Fleiri síur" eiga ekkert ástand: þeir stilla upprunalegu reitina og senda sama atburð og 385 hlustar á.
  function setjaPostnr(root, val) { var s = root.querySelector('#_sk-postnr'); if (!s || s.value === val) return; s.value = val; s.dispatchEvent(new Event('change', { bubbles: true })); }
  function setjaFela(root, val) { var c = root.querySelector('#_sk-fela'); if (c && c.checked !== val) c.click(); }
  function breyting(e) {
    var t = e.target, k = t && t.getAttribute && t.getAttribute('data-b418'); if (!k) return;
    var root = t.closest('._sk-root'); if (!root) return;
    if (k === 'postnr') setjaPostnr(root, t.value); else if (k === 'fela') setjaFela(root, t.checked);
  }
  function lokaOllu() { var breytt = false; Object.keys(opid).forEach(function (k) { if (opid[k]) { opid[k] = false; breytt = true; } }); return breytt; }
  window.__b418dbg = { tick: 0, mo: 0, made: 0, early: [] };
  function tickView(id) {
    window.__b418dbg.tick++;
    var view = document.getElementById(id); if (!view) return;
    var root = view.querySelector('._sk-root'); if (!root) return;
    var kpis = root.querySelector('._sk-kpis');
    if (!scope() || !kpis) { window.__b418dbg.early.push(id + ':' + (kpis ? 'scope' : 'kpis')); if (view.classList.contains('b418-on')) view.classList.remove('b418-on'); var g = root.querySelector('.b418-top'); if (g) g.remove(); sidast[id] = ''; return; }
    // hólfin teiknast STRAX með „—" þegar 385 hefur teiknað KPI-hólfin en tölurnar eru ókomnar — mældist annars 390 ms
    // gat (kpis 98 px sýnileg, svo okkar 380) og taflan hoppaði 482 → 718
    var d = lesa(root); if (!d) return;
    var out = html(d) + sius(d, id);
    var top = root.querySelector('.b418-top');
    // 26.09.2026: 385 endurteiknar ._sk-root við hverja heimsókn og hólfið okkar hverfur með — nýtt hólf er TÓMT, svo
    // minnið um síðasta streng má ekki segja „óbreytt" (mælt: .b418-top 0 px á annarri heimsókn, spjöldin komu seint/aldrei).
    if (!top) { sidast[id] = ''; window.__b418dbg.made++; top = document.createElement('div'); top.className = 'b418-top'; top.setAttribute('data-s409-skip', '1'); top.addEventListener('click', smellur); top.addEventListener('change', breyting); }
    if (top.nextElementSibling !== kpis || top.parentNode !== kpis.parentNode) kpis.parentNode.insertBefore(top, kpis);
    if (out !== sidast[id]) {
      // fókusinn fylgir takkanum sem var ýtt á (t.d. „Fleiri síur") yfir endurteikninguna — annars hoppar hann út á síðuna
      var ae = document.activeElement, fk = null;
      if (ae && top.contains(ae) && ae.getAttribute('data-b418')) fk = '[data-b418="' + ae.getAttribute('data-b418') + '"]' + (ae.getAttribute('data-i') != null ? '[data-i="' + ae.getAttribute('data-i') + '"]' : '');
      top.innerHTML = out; sidast[id] = out;
      if (fk) { var nf = top.querySelector(fk); if (nf) nf.focus(); }
    }
    // aðeins þegar vantar — classList.add á klasa sem er til skráir samt breytingu og vekur vaktina (lykkja)
    if (!view.classList.contains('b418-on')) view.classList.add('b418-on');
  }
  function tick() { for (var i = 0; i < VIEWS.length; i++) { try { tickView(VIEWS[i]); } catch (e) { try { console.warn('[418] tick féll', VIEWS[i], e && e.message); } catch (_) {} } } }
  function schedule() { if (schedule.inni) return; schedule.inni = true; try { tick(); } finally { schedule.inni = false; } }
  // Sýnirnar tvær eru EKKI í index.html — 385 býr þær til þegar farið er á síðuna. Vaktin er því sett á hverja sýn um leið
  // og hún birtist (mælt: vakt sem sett var við DOMContentLoaded fann enga sýn, mo=0, og hólfin komu aðeins með 2 s púlsinum).
  var vaktad = {};
  function vakta() {
    VIEWS.forEach(function (id) {
      if (vaktad[id]) return;
      var v = document.getElementById(id); if (!v) return;
      try {
        // 26.09.2026 (hopp við flakk, 0,02): inngjafaða vaktin (252) skilaði sér ramma of seint — gömlu KPI-hólfin 385
        // sáust í einn ramma áður en .b418-top tók við. Óinngjafaða vaktin keyrir í sama verki, fyrir málun.
        new (window.__NativeMutationObserver || MutationObserver)(function (ms) { window.__b418dbg.mo++; for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t && t.closest && t.closest('.b418-top')) continue; schedule(); return; } }).observe(v, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
        vaktad[id] = true;
      } catch (_) {}
    });
  }
  function byrja() {
    vakta();
    // „Fleiri síur" lokast við smell utan þess og með Escape (fókusinn fer þá aftur á takkann)
    // !isTrusted: setjaFela() smellir á upprunalega hakið utan hólfsins — sá smellur má ekki loka því (mælt: lokaðist við hak)
    document.addEventListener('click', function (e) { if (!e.isTrusted || (e.target.closest && e.target.closest('.b418-fleiri'))) return; if (lokaOllu()) schedule(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var ae = document.activeElement, inni = ae && ae.closest && ae.closest('.b418-fleiri');
      var syn = inni ? inni.closest('[id^="view-"]') : null;
      if (!lokaOllu()) return;
      schedule();
      // hólfið var endurteiknað — takkinn er nýr hnútur, sóttur aftur
      if (syn) { var b = syn.querySelector('[data-b418="fleiri"]'); if (b) b.focus(); }
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', function () { vakta(); schedule(); });
    setInterval(function () { if (document.hidden) return; vakta(); schedule(); }, 2000);
    try { new MutationObserver(function () { if (VIEWS.some(function (id) { return !vaktad[id]; })) { vakta(); schedule(); } }).observe(document.body, { childList: true }); } catch (_) {}
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', byrja); else byrja();
})();
