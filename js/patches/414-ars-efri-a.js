/* === ÁRSSKOÐUN · EFRI HLUTINN Í ÚTLITI A (414) — 25.09.2026 ===
 *
 * Agnar 25.09 (strigaspjöld H og J, „100% nákvæmt"): efri hluti Ársskoðunar — spjöldin fjögur (Virði · Búið · Eftir · Fjöldi)
 * og mánaðastrimillinn — í Brunastáli C með lánum úr Jarvis: rammi í lit merkingarinnar, tvö skorin horn, glóð í hnoðum,
 * LED-merki, Playfair-tala, súlur í dökkum málmi. Í gær kostaði það heilan dag að klæða gamalt markup með CSS ofan á tvo aðra
 * pappa (402–413). Þess vegna er farin ÖNNUR LEIÐ hér:
 *
 *   • 414 TEIKNAR SJÁLFUR efri hlutann (.b414-top) úr tölunum sem 153 og 394 hafa þegar reiknað og skrifað í sín (falin) hólf:
 *     ._kpi-n / ._kpi-s / .bstal-hero / .arsm-raun / .arsm-strip .arsm-b. Ekkert er reiknað upp á nýtt, engin ný sókn.
 *   • Gömlu spjöldin (._ars-statgrid) og strimillinn (.arsm-strip) eru FALIN með CSS, ekki fjarlægð — 394 heldur áfram að
 *     lesa og skrifa þau eins og áður, og 153 endurteiknar þau við hverja síu. Smellir á mínum súlum/tökkum kalla á
 *     upprunalegu takkana (.click()), svo síurnar, kortið og ↻ virka nákvæmlega eins.
 *   • Tikkið keyrir í SAMA tifi og 153 teiknar ('ars:render') og í rAF-tifi vaktarinnar (252) — fyrir málun. Efnið er
 *     aðeins endurskrifað þegar tölurnar breytast (strengur borinn saman), svo ekkert blikkar við síusmell.
 *   • Bílstjóra-flipinn (317) fær málmútlit og situr í hausröðinni hægra megin (position:absolute, ekki færður);
 *     Hönnunarhamur (318) er falinn á þessum stað (opnast áfram með sínum lykli).
 *
 * Gildissvið: tölva í Brunastáli, ≥ 901 px — sími/appham ósnert (þar gilda 331/382).
 */
(function () {
  'use strict';
  if (window.__arsEfri414) return;
  window.__arsEfri414 = true;

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
  var DIMBAR = 'linear-gradient(180deg,#a8aeb9 0%,#6b7381 40%,#3c424d 60%,#525a67 100%)';
  var SILVER_BTN = 'background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530';
  var METAL_BTN = 'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4';
  var RIVET_STAL = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  var RIVET_GULL = 'radial-gradient(circle at 40% 35%,#fff3c4 0%,#f0a83c 45%,#7a4a08 100%)';
  var RIVET_GRAENT = 'radial-gradient(circle at 40% 35%,#d8ffe6 0%,#23a35a 45%,#073a1d 100%)';
  var RIVET_RAUTT = 'radial-gradient(circle at 40% 35%,#ffd6d0 0%,#e25555 45%,#5a0a0a 100%)';

  var S = 'html[data-thm-preset="brunastal"] body #view-arsskodun ';
  var F = ':not(#_p414a):not(#_p414b):not(#_p414c):not(#_p414d):not(#_p414e):not(#_p414f)';
  var SV = S.replace(/\s+$/, '');   // sýnin sjálf: #view-arsskodun.b414-on …
  function rv(sel, css) { return sel.split(',').map(function (x) { return SV + x.trim() + F; }).join(',') + '{' + blek(css) + '}'; }
  // blek-reglur: bstal-polish-css setur `small{color:…!important}` — hvert `color:` hjá okkur fær sama þunga
  function blek(css) { return css.replace(/(^|;)color:([^;!]+)(?=;|$)/g, '$1color:$2!important'); }
  function r(sel, css) { return sel.split(',').map(function (s) { var m = s.trim().match(/^(.*?)(::?(?:before|after))$/); return S + (m ? m[1] + F + m[2] : s.trim() + F); }).join(',') + '{' + blek(css) + '}'; }
  // rammi með tveimur skornum hornum: ytra lag (litur rammans) + innra lag (spjaldið), bæði klippt — og ská-línurnar sem
  // klippingin tekur af eru málaðar sem hallandi gradient-lög í hornunum tveimur
  // Umgjörðin (25.09.2026, Agnar: „mikill gæðamunur í hero-boxunum, border-svæðið"): nákvæmlega .sk/.inni/.hn úr spjaldi J —
  // ramminn er padding 2 px með málmgradient, skorið 18 px að utan og 16 px að innan (skáflöturinn sýnir rammann sjálfan),
  // ENGAR teiknaðar skálínur, hnoðin eru hnútar (.hn) með box-shadow-glóð í lit spjaldsins, og 3 px ljósrönd efst (::before).
  function rammi(cls, frame, inni) {
    return [
      r('.b414-k.' + cls, 'background:' + frame + ';background-color:#0a0a0c;padding:2px;position:relative;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px));filter:drop-shadow(0 14px 24px rgba(10,14,22,.45));min-width:0'),
      r('.b414-k.' + cls + ' > .b414-i', 'position:relative;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));color:#fff;background-image:' + inni + ';background-color:#0a0a0c;padding:14px 18px 14px;display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box'),
      r('.b414-k.' + cls + ' > .b414-i::before', 'content:"";position:absolute;left:0;right:0;top:0;height:3px;background:' + toppLina(cls) + ';pointer-events:none'),
      r('.b414-k.' + cls + ' .hn', 'background:' + hnod(cls) + ';box-shadow:' + hnodGlod(cls))
    ].join('\n');
  }
  function toppLina(cls) { return cls === 'gull' ? 'linear-gradient(90deg,#3d2b05,#ffe9b0 50%,#3d2b05)' : cls === 'graent' ? 'linear-gradient(90deg,#06331a,#7fe0a8 50%,#06331a)' : cls === 'rautt' ? 'linear-gradient(90deg,#380506,#ff9d95 50%,#380506)' : 'linear-gradient(90deg,#3b3f46,#e2e6ec 50%,#3b3f46)'; }
  function hnod(cls) { return cls === 'gull' ? RIVET_GULL : cls === 'graent' ? RIVET_GRAENT : cls === 'rautt' ? RIVET_RAUTT : RIVET_STAL; }
  function hnodGlod(cls) { return cls === 'gull' ? '0 0 6px 1px rgba(240,168,60,.7)' : cls === 'graent' ? '0 0 6px 1px rgba(35,163,90,.6)' : cls === 'rautt' ? '0 0 6px 1px rgba(226,85,85,.6)' : '0 1px 1px rgba(0,0,0,.7)'; }
  var HN = '<span class="hn" style="top:9px;left:9px" aria-hidden="true"></span><span class="hn" style="top:9px;right:26px" aria-hidden="true"></span><span class="hn" style="bottom:9px;left:26px" aria-hidden="true"></span><span class="hn" style="bottom:9px;right:9px" aria-hidden="true"></span>';

  var SW = 'html.ars-wide-table[data-thm-preset="brunastal"] body #view-arsskodun ';   // síminn í Skjár/Tafla (331)
  function vitt(inni) { return inni.split(S).join(SW).split(S.replace(/\s+$/, '')).join(SW.replace(/\s+$/, '')); }
  // 25.09 (Agnar: „lagað app símahaminn"): sími í Sími-ham (331 html.ars-simi-phone) leggur út ~980 px í Tölvusíðu-ham,
  // svo @media (min-width:901px) tók borðtölvuútlitið og kreisti það á símann. Borðtölvublokkin gildir því ekki þar.
  var SP = 'html[data-thm-preset="brunastal"]:not(.ars-simi-phone) body #view-arsskodun ';
  function simalaus(inni) { return inni.split(S).join(SP).split(S.replace(/\s+$/, '')).join(SP.replace(/\s+$/, '')); }
  var rules = [
    // gömlu hólfin falin — 394 og 153 skrifa þau áfram, við lesum úr þeim
    rv('.b414-on ._ars-statgrid', 'display:none!important'),
    rv('.b414-on .arsm-strip', 'display:none!important'),
    rv('.b414-on #_hh-toggle', 'display:none!important'),
    // umgjörðin okkar
    r('.b414-top', 'display:flex;flex-direction:column;gap:12px;margin:0 0 14px;font-family:' + SANS),
    r('.b414-grid', 'display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:12px;align-items:stretch'),
    rammi('gull', R_GULL, INNI),
    rammi('graent', R_GRAENT, INNI_GRAENT),
    rammi('rautt', R_RAUTT, INNI_RAUTT),
    rammi('stal', R_STAL, INNI),
    r('.b414-k .hn', 'position:absolute;width:6px;height:6px;border-radius:50%;z-index:1;pointer-events:none'),
    // rönd efst í lit merkingarinnar
    r('.b414-i::before', 'content:"";position:absolute;left:0;right:0;top:0;height:3px'),
    r('.b414-k.gull > .b414-i::before', 'background:linear-gradient(90deg,#3d2b05,#ffe9b0 50%,#3d2b05)'),
    r('.b414-k.graent > .b414-i::before', 'background:linear-gradient(90deg,#06331a,#7fe0a8 50%,#06331a)'),
    r('.b414-k.rautt > .b414-i::before', 'background:linear-gradient(90deg,#380506,#ff9d95 50%,#380506)'),
    r('.b414-k.stal > .b414-i::before', 'background:linear-gradient(90deg,#3b3f46,#e2e6ec 50%,#3b3f46)'),
    // merki með LED
    r('.b414-m', 'display:flex;align-items:center;gap:9px;white-space:nowrap;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#d9dee6;min-width:0'),
    r('.b414-m .led', 'width:7px;height:7px;border-radius:50%;flex:none'),
    r('.b414-k.gull .led', 'background:#e0a93e;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 10px rgba(246,181,69,.85)'),
    r('.b414-k.graent .led', 'background:#3cc47c;box-shadow:0 0 0 3px rgba(60,196,124,.16),0 0 10px rgba(60,196,124,.8)'),
    r('.b414-k.rautt .led', 'background:#f0584c;box-shadow:0 0 0 3px rgba(240,88,76,.18),0 0 10px rgba(240,88,76,.85)'),
    r('.b414-k.stal .led', 'background:#8f98a8'),
    // plötur
    r('.b414-p', 'display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid #000;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.14);font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#eef1f4;white-space:nowrap;flex:none'),
    r('.b414-p.ghost', 'background:transparent;border:1px solid rgba(255,255,255,.3);color:#e9edf3;box-shadow:none'),
    r('.b414-p.ghost.gull', 'border-color:rgba(211,171,78,.7);color:#f3d98a;letter-spacing:.1em'),
    r('.b414-p.gull', 'background:linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%);border-color:rgba(190,150,60,.5);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
    // talan
    r('.b414-t', 'font-family:' + DISPLAY + ';font-size:44px;font-weight:800;line-height:1;letter-spacing:-.02em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);white-space:nowrap'),
    r('.b414-t small', 'font-size:16px;font-weight:700;color:#d9dee6;margin-left:6px;letter-spacing:0'),
    r('.b414-t.gull', 'color:#f3d98a;text-shadow:0 0 18px rgba(230,190,90,.35),0 1px 0 rgba(0,0,0,.7)'),
    r('.b414-t.gull small', 'color:#d3ab4e'),
    // súlur
    r('.b414-s', 'height:9px;border-radius:5px;background:#131316;box-shadow:inset 0 1px 2px rgba(0,0,0,.7);display:flex;overflow:hidden;gap:2px;flex:none'),
    r('.b414-s.stor', 'height:12px;border-radius:4px'),
    r('.b414-s span', 'height:100%;display:block;box-shadow:inset 0 1px 0 rgba(255,255,255,.16)'),
    r('.b414-s .gr', 'background:' + GR), r('.b414-s .gu', 'background:' + GU), r('.b414-s .ra', 'background:' + RA), r('.b414-s .st', 'background:' + ST),
    // skýring
    r('.b414-l', 'display:flex;flex-wrap:wrap;gap:6px 16px;font-family:' + MONO + ';font-size:11.5px;color:#d5dbe6;align-items:center;min-width:0'),
    r('.b414-l i', 'width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:6px;vertical-align:-1px;border:1px solid rgba(0,0,0,.4)'),
    // fastar hæðir skýringa: hetjan alltaf tvær raðir (mældist 46→44→46 við leturskipti á 1896 px), litlu spjöldin 44 px (17→43 þegar „án tækja"-platan kemur seinna)
    r('.b414-k.gull .b414-l', 'flex-direction:column;align-items:flex-start;gap:6px;flex-wrap:nowrap'),
    r('.b414-k:not(.gull) .b414-l', 'min-height:44px;align-content:flex-start'),
    r('.b414-l b', 'color:#fff;font-weight:700'), r('.b414-l small', 'color:#8e97a6;margin-left:5px;font-size:11px'),
    r('.b414-l .gr', 'background:#1f6f42'), r('.b414-l .gu', 'background:#9c7c2c'), r('.b414-l .st', 'background:#8f98a8'),
    // litlu súlurnar (Eftir)
    r('.b414-tikk', 'display:flex;flex-direction:column;gap:5px;min-height:60px'),
    r('.b414-tikk .r', 'display:grid;grid-template-columns:92px minmax(0,1fr) 34px;gap:8px;align-items:center;font-family:' + MONO + ';font-size:11px;color:#d5dbe6'),
    r('.b414-tikk .r b', 'color:#fff;text-align:right;font-weight:700'),
    r('.b414-tikk .bar', 'height:5px;border-radius:3px;background:#131316;box-shadow:inset 0 1px 2px rgba(0,0,0,.7)'),
    r('.b414-tikk .bar span', 'display:block;height:100%;border-radius:3px'),
    r('.b414-tikk .bar .ra', 'background:linear-gradient(90deg,#c95050,#6c1414)'), r('.b414-tikk .bar .gu', 'background:linear-gradient(90deg,#d8b866,#7a5a18)'), r('.b414-tikk .bar .st', 'background:linear-gradient(90deg,#8a919c,#3e434c)'),
    // flísar (Virði)
    r('.b414-f3', 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px'),
    r('.b414-f', 'display:flex;flex-direction:column;justify-content:center;gap:2px;height:50px;box-sizing:border-box;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);min-width:0;overflow:hidden'),
    r('.b414-f .l,.b414-f .v', 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block'),
    r('.b414-f .l', 'font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a9b1bf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
    r('.b414-f .v', 'font-family:' + MONO + ';font-size:13px;font-weight:700;color:#fff;white-space:nowrap'),
    r('.b414-f .v small', 'font-size:10.5px;font-weight:400;color:#a9b1bf;margin-left:3px'),
    // ↻ (kallar á #_ars-virdi-refresh)
    r('.b414-refresh', imp(SILVER_BTN) + ';width:26px;height:22px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;font-family:' + SANS + ';padding:0;flex:none'),
    // strimillinn
    r('.b414-strim', 'background:' + METAL + ';background-color:#0a0a0c;border:1px solid #000;border-radius:10px;padding:12px 16px 10px;display:flex;flex-direction:column;gap:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)'),
    r('.b414-strim .hd', 'height:17px;display:flex;align-items:center;gap:10px;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#e9cf85'),
    r('.b414-strim .hd .dl', 'width:7px;height:7px;background:#e0a93e;transform:rotate(45deg);display:inline-block;flex:none'),
    r('.b414-strim .hd .r', 'margin-left:auto;color:#d5dbe6;letter-spacing:.04em;text-transform:none;font-weight:400;font-size:11.5px'),
    r('.b414-strim .hd .r b', 'color:#fff;font-weight:700'),
    r('.b414-man', 'display:grid;grid-template-columns:repeat(15,minmax(0,1fr));gap:6px;align-items:end;height:92px'),
    r('.b414-man button', 'all:unset;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;height:100%;cursor:pointer;min-width:0;box-sizing:border-box'),
    r('.b414-man button i', 'display:block;width:100%;border-radius:3px 3px 0 0;background:' + DARK + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.5);transition:filter .12s'),
    r('.b414-man button:hover i', 'filter:brightness(1.15)'),
    r('.b414-man button.nu i', 'background:' + GOLDBAR + ';box-shadow:0 0 12px rgba(230,190,90,.5),inset 0 1px 0 rgba(255,255,255,.5)'),
    r('.b414-man button.on i', 'box-shadow:0 0 0 2px #f3d98a,0 0 14px rgba(230,190,90,.5),inset 0 1px 0 rgba(255,255,255,.3)'),
    r('.b414-man button.skuld i', 'background:' + DIMBAR),
    r('.b414-man button.all i', 'background:transparent;border:1px dashed rgba(255,255,255,.35);box-shadow:none;box-sizing:border-box'),
    r('.b414-man button em', 'font-family:' + MONO + ';font-size:10px;font-weight:700;font-style:normal;color:#d5dbe6;letter-spacing:.04em;white-space:nowrap;line-height:15px'),
    r('.b414-man button u', 'font-family:' + MONO + ';font-size:10px;color:#8e97a6;text-decoration:none;line-height:15px'),
    r('.b414-man button.nu em,.b414-man button.on em', 'color:#f3d98a'),
    r('.b414-man button.nu u,.b414-man button.on u', 'color:#e9cf85'),
    r('.b414-man button:focus-visible', 'outline:2px solid #f3d98a;outline-offset:2px;border-radius:3px'),
    // Bílstjóra-flipinn (317): situr í hausröðinni hægra megin sem málmtakki — ekki færður, aðeins staðsettur
    rv('.b414-on', 'position:relative'),
    rv('.b414-on #_bil-toggle', imp(METAL_BTN) + ';position:absolute!important;right:var(--b414-bil-r,14px)!important;top:var(--b414-bil,181px)!important;height:36px!important;padding:0 14px!important;border-radius:9px!important;font-family:' + SANS + '!important;font-size:13px!important;font-weight:600!important;display:inline-flex!important;align-items:center!important;gap:8px!important;margin:0!important;z-index:3;float:none!important'),
    // 213 (theme-inspection) merkir flísar sem „spjöld" (.thm-stat: hvítur rammi, 13 px horn) og tölur sem .thm-statnum (Plex Sans)
    r('.b414-f.thm-stat', 'border:1px solid rgba(255,255,255,.1)!important;border-radius:6px!important;box-shadow:none!important'),
    r('.b414-top .thm-statnum', 'font-family:' + MONO + '!important;letter-spacing:0!important'),
    // app-hamur (261 þvingar .view button{font-size:17px;padding:12px;min-height:50px}) — takkarnir okkar halda stærð
    r('.b414-man button', 'padding:0!important;min-height:0!important;font-size:10px!important;line-height:1!important'),
    r('.b414-refresh', 'padding:0!important;min-height:22px!important;font-size:13px!important;line-height:1!important'),
  ];
  var inni = rules.join('\n');
  var css = '@media (min-width:901px){' + simalaus(inni) + '}\n' + vitt(inni) + '\n' + [
    '@media (max-width:1720px){' + S + '.b414-p.ghost.raun' + F + '{display:none}}',
    '@media (max-width:1400px){' + S + '.b414-m > .b414-p:not(.raun)' + F + '{display:none}}'
  ].join('\n');
  function imp(s) { return s.split(';').filter(Boolean).map(function (d) { return /!important/.test(d) ? d : d + '!important'; }).join(';'); }
  if (!document.getElementById('ars-efri-414')) { var st = document.createElement('style'); st.id = 'ars-efri-414'; st.textContent = css; (document.head || document.documentElement).appendChild(st); }

  // ── lestur úr földu hólfunum ──────────────────────────────────────────────
  // 25.09 (Agnar: appið í Skjár + Tölvusíðu-hamur á síma): gildir á breiðum glugga OG í Skjár/Tafla á símanum (331 html.ars-wide-table);
  // Sími-hamurinn (mrows, 412 px án ars-wide-table) heldur sínu. Appmode/phone-dev útiloka ekki lengur — CSS-ið sér um símabreiddina (417).
  function scope() { var h = document.documentElement; return h.getAttribute('data-thm-preset') === 'brunastal' && !h.classList.contains('ars-simi-phone') && (innerWidth >= 901 || h.classList.contains('ars-wide-table')); }
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function tala(s) { var m = String(s || '').replace(/ /g, ' ').match(/-?\d[\d.]*(?:,\d+)?/); if (!m) return NaN; return parseFloat(m[0].replace(/\./g, '').replace(',', '.')); }
  function heil(s) { var m = String(s || '').match(/\d[\d.]*/); return m ? parseInt(m[0].replace(/\./g, ''), 10) : NaN; }
  function isk(n) { return isFinite(n) ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—'; }
  function mkr(n) { return isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1).replace('.', ',') : '—'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function lesa(root) {
    var g = root.querySelector('._ars-statgrid'); if (!g) return null;
    var hero = g.querySelector('.bstal-hero'); if (!hero) return null;
    var hk = hero.children;
    // „29,9M" + „m.kr" → 29,9 m.kr ; „þar af 18,6M búið · 123 raunreiknuð"
    var totalTxt = hk[1] ? txt(hk[1]).replace(/m\.?kr/i, '') : '';
    var total = tala(totalTxt);                           // í milljónum þegar „M", í þúsundum þegar „þ"
    var eining = /M/.test(totalTxt) ? 'm.kr' : (/þ/.test(totalTxt) ? 'þ.kr' : 'kr');
    var buidTxt = hk[2] ? txt(hk[2]) : '';
    var buidM = tala((buidTxt.match(/þar af\s*([\d.,]+\s*[Mþ]?)/) || [])[1] || '');
    var raun = heil(txt(hero.querySelector('.arsm-raun')) || (buidTxt.match(/(\d[\d.]*)\s*raunreiknu/) || [])[1]);
    var fjoldi = heil(txt(g.querySelector('._kpi--hlut ._kpi-n')));
    var hlutS = txt(g.querySelector('._kpi--hlut ._kpi-s'));         // síað: „77 raðir í töflunni · af 636 á borðinu"
    var radir = /raðir í töflunni/.test(hlutS) ? heil(hlutS) : NaN;
    var fjoldiAf = heil((hlutS.match(/af\s+(\d[\d.]*)\s+á borðinu/) || [])[1]);
    // hetjan: „Búið 18,6 m.kr · 366 staðir / Eftir 11,3 m.kr · 262 staðir" — staðatölur virðisins eru ÓSÍAÐAR
    var ht = txt(hero);
    var buidStadir = heil((ht.match(/Búið[^·]*·\s*(\d[\d.]*)\s*staði/) || [])[1]);
    var eftirStadir = heil((ht.match(/Eftir[^·]*·\s*(\d[\d.]*)\s*staði/) || [])[1]);
    var buid = heil(txt(g.querySelector('._kpi--graent ._kpi-n')));
    var eftir = heil(txt(g.querySelector('._kpi--rautt ._kpi-n')));
    var gs = txt(g.querySelector('._kpi--graent ._kpi-s'));        // „58% af borðinu · 375 með 2026-skýrslu skjalfesta" | síað: „79% af borðinu · af 366 á borðinu"
    var medSkyrslu = heil((gs.match(/(\d[\d.]*)\s+með\s+\S*\s*skýrslu/) || [])[1]);
    var buidAf = heil((gs.match(/af\s+(\d[\d.]*)\s+á borðinu/) || [])[1]);
    var rs = txt(g.querySelector('._kpi--rautt ._kpi-s'));         // „95 komin á tíma · 6 án mánaðar · 161 eiga mánuð framundan"
    var komin = heil((rs.match(/(\d[\d.]*)\s+komin/) || [])[1]);          // merkin ráða, ekki staðan í setningunni
    var anMan = heil((rs.match(/(\d[\d.]*)\s+án mánaðar/) || [])[1]);
    var framundan = heil((rs.match(/(\d[\d.]*)\s+eiga mánuð/) || [])[1]);
    var eftirAf = heil((rs.match(/af\s+(\d[\d.]*)\s+á borðinu/) || [])[1]);
    if (!isFinite(framundan) && !isFinite(eftirAf) && isFinite(eftir) && isFinite(komin) && isFinite(anMan)) framundan = eftir - komin - anMan;
    var hs = Array.prototype.slice.call(g.querySelectorAll('._kpi--hlut ._kpi-s'));
    var sum = hs.find(function (e) { return /\+/.test(txt(e)); });
    var st = sum ? (txt(sum).match(/\d[\d.]*/g) || []).map(function (x) { return parseInt(x.replace(/\./g, ''), 10); }) : [];
    var ovist = st.length >= 3 ? st[2] : NaN;
    var anTaekja = heil(txt(g.querySelector('.arsm-hlut-extra')));
    var sub = txt(root.querySelector('._ars-sub'));
    var medTaeki = heil((sub.match(/(\d[\d.]*)\s*með skráð/) || [])[1]);
    // strimillinn 394
    var strip = root.querySelector('.arsm-strip');
    var man = strip ? Array.prototype.slice.call(strip.querySelectorAll('.arsm-b')).map(function (b) {
      return { nafn: txt(b.querySelector('em')), n: heil(txt(b.querySelector('u'))), h: parseFloat((b.querySelector('i') || {}).style ? b.querySelector('i').style.height : '') || 0, cls: b.className.replace('arsm-b', '').trim(), el: b };
    }) : [];
    var ar = (txt(strip && strip.querySelector('.arsm-head b')).match(/\d{4}/) || [String(new Date().getFullYear())])[0];
    return { buidAf: buidAf, eftirAf: eftirAf, radir: radir, fjoldiAf: fjoldiAf, buidStadir: buidStadir, eftirStadir: eftirStadir, siad: isFinite(fjoldiAf) || isFinite(buidAf) || isFinite(eftirAf), total: total, eining: eining, buidM: buidM, eftirM: (isFinite(total) && isFinite(buidM)) ? total - buidM : NaN, raun: raun, fjoldi: fjoldi, buid: buid, eftir: eftir, medSkyrslu: medSkyrslu, komin: komin, anMan: anMan, framundan: framundan, ovist: ovist, anTaekja: anTaekja, medTaeki: medTaeki, man: man, ar: ar, curYear: ar };
  }

  // ── teikning ─────────────────────────────────────────────────────────────
  function html(d) {
    var pctBuid = (isFinite(d.buidM) && isFinite(d.total) && d.total > 0) ? Math.round(d.buidM / d.total * 100) : NaN;
    var pctBord = (isFinite(d.buid) && isFinite(d.fjoldi) && d.fjoldi > 0) ? Math.round(d.buid / d.fjoldi * 100) : NaN;
    var stadir = isFinite(d.medTaeki) ? d.medTaeki : d.fjoldi;
    var medal = (isFinite(d.total) && isFinite(stadir) && stadir > 0) ? (d.eining === 'm.kr' ? d.total * 1e6 / stadir : d.eining === 'þ.kr' ? d.total * 1e3 / stadir : d.total / stadir) : NaN;
    var nu = d.man.find(function (m) { return /is-nu/.test(m.cls); });
    var medMan = d.man.filter(function (m) { return !/is-skuld|is-all|is-tom/.test(m.cls); }).reduce(function (a, m) { return a + (isFinite(m.n) ? m.n : 0); }, 0);
    var anMan2 = (d.man.find(function (m) { return /is-tom/.test(m.cls); }) || {}).n;
    var gleymt = (d.man.find(function (m) { return /is-skuld/.test(m.cls); }) || {}).n;
    var maxH = d.man.reduce(function (a, m) { return Math.max(a, m.h); }, 0) || 1;
    var eftirMax = Math.max(1, isFinite(d.eftir) ? d.eftir : 1);
    var w = function (n, of) { return isFinite(n) && isFinite(of) && of > 0 ? Math.max(0, Math.min(100, n / of * 100)).toFixed(1) + '%' : '0%'; };
    return { grid: '' +
      '<div class="b414-grid">' +
        // Virði
        '<div class="b414-k gull"><div class="b414-i">' + HN +
          '<div class="b414-m"><span class="led" aria-hidden="true"></span>Virði ársþjónustu ' + esc(d.ar) +
            (isFinite(stadir) ? '<span class="b414-p">' + isk(stadir) + ' staðir</span>' : '') +
            (isFinite(d.raun) ? '<span class="b414-p ghost raun" style="margin-left:auto">' + isk(d.raun) + ' raunreiknuð</span>' : '<span style="margin-left:auto"></span>') +
            '<button type="button" class="b414-refresh" data-b414="refresh" title="Endurreikna út frá reiknivélinni inni í fyrirtækjunum — keyrist aðeins þegar ýtt er á hana">↻</button>' +
          '</div>' +
          '<div style="display:flex;align-items:flex-end;gap:14px;min-width:0">' +
            '<div class="b414-t gull">' + esc(mkr(d.total)) + '<small>' + esc(d.eining) + '</small></div>' +
            '<span class="b414-l" style="padding-bottom:5px"><span><i class="gr" aria-hidden="true"></i>Búið <b>' + esc(mkr(d.buidM)) + ' ' + esc(d.eining) + '</b><small>' + isk(isFinite(d.buidStadir) ? d.buidStadir : d.buid) + ' staðir</small></span><span><i class="gu" aria-hidden="true"></i>Eftir <b>' + esc(mkr(d.eftirM)) + ' ' + esc(d.eining) + '</b><small>' + isk(isFinite(d.eftirStadir) ? d.eftirStadir : d.eftir) + ' staðir</small></span></span>' +
          '</div>' +
          '<div class="b414-s stor" role="img" aria-label="' + (isFinite(pctBuid) ? pctBuid + '% af virðinu búið' : '') + '"><span class="gr" style="width:' + w(d.buidM, d.total) + '"></span><span class="gu" style="width:' + w(d.eftirM, d.total) + '"></span></div>' +
          '<div class="b414-f3">' +
            '<div class="b414-f"><span class="l">Meðalstaður</span><span class="v">' + isk(medal) + '<small>kr</small></span></div>' +
            '<div class="b414-f"><span class="l">' + esc(nu ? nu.nafn : 'Mánuðurinn') + '</span><span class="v">' + (nu && isFinite(nu.n) ? isk(nu.n) + ' staðir' : '—') + '</span></div>' +
            '<div class="b414-f"><span class="l">Áætlað · raun</span><span class="v">' + (isFinite(stadir) && isFinite(d.raun) ? isk(stadir - d.raun) + ' · ' + isk(d.raun) : '—') + '</span></div>' +
          '</div>' +
        '</div></div>' +
        // Búið
        '<div class="b414-k graent"><div class="b414-i">' + HN +
          '<div class="b414-m"><span class="led" aria-hidden="true"></span>Búið ' + esc(d.ar) + '</div>' +
          '<div class="b414-t">' + isk(d.buid) + '<small>staðir</small></div>' +
          '<div class="b414-s" role="img" aria-label="' + (isFinite(pctBord) ? pctBord + '% af borðinu' : '') + '"><span class="gr" style="width:' + w(d.buid, d.fjoldi) + '"></span></div>' +
          '<div class="b414-l"><span><b>' + (isFinite(pctBord) ? pctBord + '%' : '—') + '</b> af borðinu</span>' + (isFinite(d.medSkyrslu) ? '<span><b>' + isk(d.medSkyrslu) + '</b> með ' + esc(d.ar) + '-skýrslu<small>skjalfesta</small></span>' : (isFinite(d.buidAf) ? '<span>af <b>' + isk(d.buidAf) + '</b> á borðinu</span>' : '')) + '</div>' +
        '</div></div>' +
        // Eftir
        '<div class="b414-k rautt"><div class="b414-i">' + HN +
          '<div class="b414-m"><span class="led" aria-hidden="true"></span>Eftir ' + esc(d.ar) + '</div>' +
          '<div class="b414-t">' + isk(d.eftir) + '<small>staðir</small></div>' +
          '<div class="b414-tikk">' +
            '<div class="r"><span>Komin á tíma</span><div class="bar"><span class="ra" style="width:' + w(d.komin, eftirMax) + '"></span></div><b>' + isk(d.komin) + '</b></div>' +
            (isFinite(d.anMan) ? '<div class="r"><span>Án mánaðar</span><div class="bar"><span class="st" style="width:' + w(d.anMan, eftirMax) + '"></span></div><b>' + isk(d.anMan) + '</b></div>' : '') +
            (isFinite(d.framundan) ? '<div class="r"><span>Framundan</span><div class="bar"><span class="gu" style="width:' + w(d.framundan, eftirMax) + '"></span></div><b>' + isk(d.framundan) + '</b></div>' : '') +
            (isFinite(d.eftirAf) ? '<div class="r"><span>Af borðinu</span><div class="bar"><span class="st" style="width:' + w(d.eftir, d.eftirAf) + '"></span></div><b>' + isk(d.eftirAf) + '</b></div>' : '') +
          '</div>' +
        '</div></div>' +
        // Fjöldi
        '<div class="b414-k stal"><div class="b414-i">' + HN +
          '<div class="b414-m"><span class="led" aria-hidden="true"></span>Fjöldi</div>' +
          '<div class="b414-t">' + isk(d.fjoldi) + '<small>' + (isFinite(d.radir) ? 'í töflunni' : 'á borðinu') + '</small></div>' +
          '<div class="b414-s" role="img" aria-label="' + isk(d.buid) + ' búið, ' + isk(d.eftir) + ' eftir, ' + isk(d.ovist) + ' óvíst"><span class="gr" style="width:' + w(d.buid, d.fjoldi) + '"></span><span class="gu" style="width:' + w(d.eftir, d.fjoldi) + '"></span><span class="st" style="width:' + w(d.ovist, d.fjoldi) + '"></span></div>' +
          '<div class="b414-l"><span><i class="gr" aria-hidden="true"></i><b>' + isk(d.buid) + '</b> búið</span><span><i class="gu" aria-hidden="true"></i><b>' + isk(d.eftir) + '</b> eftir</span>' + (isFinite(d.ovist) ? '<span><i class="st" aria-hidden="true"></i><b>' + isk(d.ovist) + '</b> óvíst</span>' : '') + (isFinite(d.fjoldiAf) ? '<span class="b414-p ghost" style="height:20px;font-size:10px">af ' + isk(d.fjoldiAf) + ' á borðinu</span>' : (isFinite(d.anTaekja) ? '<span class="b414-p ghost" style="height:20px;font-size:10px">' + isk(d.anTaekja) + ' án tækja</span>' : '')) + '</div>' +
        '</div></div>' +
      '</div>', strim:
      // strimillinn (smellir kalla á .arsm-b takkana sem 394 á)
      '<div class="b414-strim' + (d.man.length ? '' : ' b414-strim--bid') + '">' +
        '<div class="hd"><span class="dl" aria-hidden="true"></span>Skoðunarmánuður · ' + esc(d.ar) +
          (!d.man.length ? '' : '<span class="r"><b>' + isk(medMan) + '</b> með mánuð' + (isFinite(anMan2) ? ' · <b>' + isk(anMan2) + '</b> án mánaðar' : '') + (isFinite(gleymt) ? ' · <b>' + isk(gleymt) + '</b> gleymt' : '') + (nu ? ' · ' + esc(nu.nafn) + ' <b>' + isk(nu.n) + '</b> í dag' : '') + '</span>') + '</div>' +
        '<div class="b414-man" role="group" aria-label="Skoðunarmánuður">' + d.man.map(function (m, i) {
          var cls = (/is-nu/.test(m.cls) ? ' nu' : '') + (/is-on/.test(m.cls) ? ' on' : '') + (/is-skuld/.test(m.cls) ? ' skuld' : '') + (/is-all/.test(m.cls) ? ' all' : '');
          var h = Math.max(6, Math.round(m.h / maxH * 52));
          return '<button type="button" class="' + cls.trim() + '" data-b414="man" data-i="' + i + '" aria-pressed="' + (/is-on/.test(m.cls) ? 'true' : 'false') + '" title="' + esc(m.nafn) + ' · ' + isk(m.n) + '"><i style="height:' + h + 'px"></i><em>' + esc(m.nafn) + '</em><u>' + isk(m.n) + '</u></button>';
        }).join('') + '</div>' +
      '</div>' };
  }

  var sidast = { grid: '', strim: '' };
  function smellur(e) {
    var main = document.getElementById('ars-main');
    var b = e.target.closest('[data-b414]'); if (!b || !main) return;
    if (b.dataset.b414 === 'refresh') { var o = document.getElementById('_ars-virdi-refresh'); if (o) o.click(); return; }
    if (b.dataset.b414 === 'man') { var m = (lesa(main) || { man: [] }).man[+b.dataset.i]; if (m && m.el) m.el.click(); }
  }
  // okkar hnútur stendur á undan `fyrir` — búinn til einu sinni, færður aðeins ef 153 teiknaði nýjan nágranna
  function hnutur(main, cls, fyrir) {
    var sel = '.' + cls.split(' ').join('.');
    var n = main.querySelector(sel);
    if (!n) { n = document.createElement('div'); n.className = cls; n.setAttribute('data-s409-skip', '1'); n.addEventListener('click', smellur); }
    if (n.nextElementSibling !== fyrir || n.parentNode !== fyrir.parentNode) fyrir.parentNode.insertBefore(n, fyrir);
    return n;
  }
  function tick() {
    var view = document.getElementById('view-arsskodun'); if (!view) return;
    var main = document.getElementById('ars-main'); if (!main) return;
    if (!scope()) { view.classList.remove('b414-on'); Array.prototype.slice.call(main.querySelectorAll('.b414-top')).forEach(function (n) { n.remove(); }); sidast = { grid: '', strim: '' }; return; }
    var grid = main.querySelector('._ars-statgrid');
    if (!grid || !grid.querySelector('.bstal-hero') || !grid.querySelector('._kpi--rautt ._kpi-n')) { return; }   // 153 ekki búin — bíða næstu teikningar
    var d = lesa(main); if (!d || !isFinite(d.fjoldi)) return;
    var out = html(d);
    var top = hnutur(main, 'b414-top', grid);                                    // grindin: fyrir framan ._ars-statgrid
    var morow = main.querySelector('._ars-morow');
    var strim = morow ? hnutur(main, 'b414-top b414-top--strim', morow) : null;  // strimillinn: fyrir framan ._ars-morow (eftir síustikunni)
    if (out.grid !== sidast.grid) { top.innerHTML = out.grid; sidast.grid = out.grid; }
    if (strim && out.strim !== sidast.strim) { strim.innerHTML = out.strim; sidast.strim = out.strim; }
    view.classList.add('b414-on');
    // Bílstjóri í haus-röðina hægra megin (sama lína og Prenta lista) — mælt aðeins þegar hausinn hefur færst
    try {
      var haus = main.firstElementChild && main.firstElementChild.firstElementChild;
      if (haus && haus !== top) {
        // brotin haus-röð (sími, 417): takkinn efst í hægri kantinum, ekki í miðju 200 px hárrar raðar
        var hausH = haus.offsetHeight;
        var y = Math.round(haus.getBoundingClientRect().top - view.getBoundingClientRect().top + (hausH > 96 ? 6 : (hausH - 36) / 2));
        if (y >= 0 && String(y) !== view.dataset.b414bil) { view.dataset.b414bil = String(y); view.style.setProperty('--b414-bil', y + 'px'); }
        var rx = Math.round(view.getBoundingClientRect().right - haus.getBoundingClientRect().right);   // hægri brún haus-raðarinnar (spjaldið 416 er mjórra en sýnin)
        if (rx >= 0 && String(rx) !== view.dataset.b414bilr) { view.dataset.b414bilr = String(rx); view.style.setProperty('--b414-bil-r', rx + 'px'); }
      }
    } catch (_) {}
  }
  function schedule() { if (schedule.inni) return; schedule.inni = true; try { tick(); } catch (e) { console.error('[414]', e); } finally { schedule.inni = false; } }
  document.addEventListener('ars:render', schedule);
  (function watch() {
    var v = document.getElementById('view-arsskodun');
    if (!v) { setTimeout(watch, 700); return; }
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t && t.closest && t.closest('.b414-top')) continue; schedule(); return; }
    }).observe(v, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
    schedule();
  })();
  setInterval(schedule, 2000);
  window.addEventListener('resize', schedule);
})();
