/* 416 — Ársskoðun á dökku spjaldi, eins og spjald J (25.09.2026, Agnar: „put your background in there · widen the
 *   main area a bit so it matches yours · try to replicate the layout").
 *
 *   Aðeins CSS. 153-umgjörðin (#ars-main > div[max-width:1720px]) verður .sida úr mockinu: dökkt kol (#1d1f24 → #30333a),
 *   1 px svartur rammi, 14 px horn, 22/24/24 fylling, djúpur skuggi — og breikkar úr 1720 í 2000 px. Sýnin sjálf heldur
 *   stálbakgrunninum (mockið: body #aeb4be). Blekið sem stóð dökkt á ljósu (Staðirnir-hausinn, samantektin, síðuflettingin,
 *   undirlínan) fær ljósa tóna mocksins; spjöldin, strimillinn, síustikan og taflan eiga sitt útlit þegar.
 *
 *   Aðeins borðtölva (min-width:901px) í Brunastáli, ekki app-hamur.
 */
(function () {
  'use strict';
  var S = 'html[data-thm-preset="brunastal"] body #view-arsskodun ';
  var F = ':not(#_p416a):not(#_p416b):not(#_p416c):not(#_p416d):not(#_p416e):not(#_p416f)';
  var MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace';
  var SANS = '"IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif';
  function blek(css) { return css.replace(/(^|;)color:([^;!]+)(?=;|$)/g, '$1color:$2!important'); }
  function r(sel, css) { return sel.split(',').map(function (x) { return S + x.trim() + F; }).join(',') + '{' + blek(css) + '}'; }
  var W = '#ars-main > div[style*="max-width:1720px"]';
  var SV = S.replace(/\s+$/, '');
  var SW = 'html.ars-wide-table[data-thm-preset="brunastal"] body #view-arsskodun ';   // síminn í Skjár/Tafla (331)
  function vitt(inni) { return inni.split(S).join(SW).split(S.replace(/\s+$/, '')).join(SW.replace(/\s+$/, '')); }
  var rules = [
    // spjaldið: .sida úr mockinu, breiðara (1720 → 2000)
    // 25.09 síðar (Agnar: „skip the light grey background, use only yours full wide"): sýnin sjálf er kolið, efnið nær út í kanta
    SV + F + '{background-color:#25272c!important;background-image:linear-gradient(180deg,#1d1f24 0%,#30333a 320px,#2a2c31 100%)!important}',
    r('.main-panel', 'padding-left:0!important;padding-right:0!important;padding-top:0!important;max-width:none!important'),
    r(W, 'max-width:none!important;margin:0!important;padding:18px 24px 30px!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;box-sizing:border-box'),
    // hausinn: yfirlína, titill og undirlína í ljósu (mock .haus)
    r(W + ' > div:first-child', 'color:#c9d0da;padding-right:118px!important;box-sizing:border-box'),   // Bílstjóri (414) situr í hægri kantinum
    r(W + ' > div:first-child h1', 'color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
    r(W + ' > div:first-child ._ars-sub,' + W + ' > div:first-child ._ars-stimpill', 'color:#c9d0da'),
    r(W + ' > div:first-child ._ars-sub b', 'color:#fff'),
    // Staðirnir-hausinn (394 .arsm-sec): h2 hvítt með skugga, talningin ljós
    r('.arsm-sec h2', 'color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6)'),
    r('.arsm-sec > span', 'color:#c9d0da'),
    r('.arsm-sec > span b', 'color:#fff'),
    // samantektin neðst og síðuflettingin: ljóst blek á dökku
    r('._ars-summary', 'color:#c9d0da;background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:10px'),
    r('._ars-summary div', 'color:#c9d0da'),
    r('._tfoot', 'color:#c9d0da'),
    r('._tfoot > span', 'color:#aeb6c4'),
    // línur sem 394/153 draga á ljósum grunni verða að sjást á dökku
    r('._ars-morow', 'color:#c9d0da'),
  ];
  var inni = rules.join('\n');
  var css = '@media (min-width:901px){' + inni + '}\n' + vitt(inni) + '\n';

  var st = document.getElementById('_ars-sida-416-css');
  if (!st) { st = document.createElement('style'); st.id = '_ars-sida-416-css'; document.head.appendChild(st); }
  st.textContent = css;
})();
