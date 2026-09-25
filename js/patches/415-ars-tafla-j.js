/* 415 — Staðirnir-taflan á Ársskoðun í Brunastál C, eftir hönnunarspjaldi J (25.09.2026).
 *
 *   Aðeins CSS. Taflan er 153 (renderTable → table.data-table í ._ars-tblscroll), 394 færir hana í sitt hólf (.thm),
 *   187/267 sprauta inn dálkum og 313 litar blek. Hér er ekkert teiknað og enginn hnútur snertur — reglurnar leggja
 *   útlit spjaldsins yfir það sem er: ramma og skugga á töfluhólfið, 38 px málmhaus með .14em stöfum, 58 px raðir með
 *   sebra, nafn 13/700 með kt í mono, ferðanóta tvær línur, heimilisfang í mono með grátt póstnúmer, tækjatölur og
 *   silfur-flís á akstursreitnum. Ársplötur, mánuður, staða og forgangur halda sínu (153/394 eiga þau útlit þegar).
 *
 *   Aðeins borðtölva (min-width:901px) í Brunastáli, ekki app-hamur — síminn heldur 331/382.
 */
(function () {
  'use strict';
  var S = 'html[data-thm-preset="brunastal"] body #view-arsskodun ';
  var F = ':not(#_p415a):not(#_p415b):not(#_p415c):not(#_p415d):not(#_p415e):not(#_p415f)';
  var MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace';
  var SANS = '"IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  function blek(css) { return css.replace(/(^|;)color:([^;!]+)(?=;|$)/g, '$1color:$2!important'); }
  function r(sel, css) { return sel.split(',').map(function (x) { return S + x.trim() + F; }).join(',') + '{' + blek(css) + '}'; }
  var T = '._ars-tblscroll table.data-table ';
  var SW = 'html.ars-wide-table[data-thm-preset="brunastal"] body #view-arsskodun ';   // síminn í Skjár/Tafla (331)
  function vitt(inni) { return inni.split(S).join(SW).split(S.replace(/\s+$/, '')).join(SW.replace(/\s+$/, '')); }
  // 25.09: sími í Sími-ham (331 html.ars-simi-phone) leggur út ~980 px — borðtölvublokkin gildir ekki þar.
  var SP = 'html[data-thm-preset="brunastal"]:not(.ars-simi-phone) body #view-arsskodun ';
  function simalaus(inni) { return inni.split(S).join(SP).split(S.replace(/\s+$/, '')).join(SP.replace(/\s+$/, '')); }
  var rules = [
    // töfluhólfið: svartur rammi, 10 px horn, djúpur skuggi — lárétta skrunið helst
    r('._ars-tblscroll', 'border:1px solid #000!important;border-radius:10px!important;box-shadow:0 18px 40px -12px rgba(10,14,22,.6)!important;background:#fff!important;overflow-x:auto;overflow-y:hidden'),
    // haus: 38 px, mono 10/700, .14em, ljóst blek á málmi
    r(T + 'thead th', 'height:38px!important;padding:0 12px!important;font-family:' + MONO + '!important;font-size:10px!important;font-weight:700!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:#d9dee6;white-space:nowrap!important;border-bottom:1px solid #000!important'),
    r(T + 'thead th .sort-ar', 'color:#8e97a6;margin-left:4px'),
    // raðir: 58 px, sebra, lína á milli
    r(T + 'tbody td', 'height:58px!important;padding:6px 8px!important;border-top:1px solid #edf0f4!important;font-size:12.5px!important;color:#1f2530;vertical-align:middle!important;background:#fff'),
    r(T + 'tbody tr._ars-row:nth-child(odd) td', 'background:#fafbfd'),
    r(T + 'tbody tr._ars-row:hover td', 'background:#f3f5f9'),
    // fyrirtæki: nafn 13/700, kt mono 10.5 grátt
    r(T + '._co', 'font-family:' + SANS + ';font-weight:700!important;font-size:13px!important;color:#11141c;line-height:1.2'),
    r(T + '._kt', 'font-family:' + MONO + '!important;font-size:10.5px!important;color:#6b7483;font-weight:400'),
    // ferðanóta: tvær línur, mjúkt blek
    r(T + '._ars-nota3', '-webkit-line-clamp:2!important;font:400 11.5px/1.35 ' + SANS + '!important;color:#525b6b'),
    // heimilisfang: mono 11.5, póstnúmer grátt á undan
    r(T + '._addr', 'font-family:' + MONO + '!important;font-size:11.5px!important;color:#1f2530;line-height:1.35!important'),
    r(T + '._post', 'color:#6b7483;font-weight:400!important;margin-right:4px!important'),
    // mánuður: mono 12
    r(T + '._mo', 'font-family:' + MONO + '!important;font-size:12px!important;color:#1f2530'),
    // tæki: mono 12/700 með 9 px merki
    r(T + '._devs b', 'font-family:' + MONO + '!important;font-size:12px!important;font-weight:700!important;color:#1f2530'),
    r(T + '._devs i', 'font-family:' + MONO + '!important;font-size:9px!important;font-weight:700!important;letter-spacing:.1em!important;color:#8a93a3;text-transform:uppercase'),
    r(T + '._devs div + div', 'border-left:0!important'),
    r(T + '._devs div', 'padding:0 6px!important'),
    // akstur án lista: silfur-flís (litaðir listar 1/2/3 halda sínum lit frá 267)
    r(T + '._arsak-chip[data-ak="0"]', 'background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;border-radius:6px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12)!important;height:26px!important;color:#3a4250;opacity:1!important'),
    // staða: platan fyllir reitinn, 24 px, 3 px horn eins og á spjaldinu
    r(T + '._st', 'min-height:24px!important;height:24px;border-radius:3px!important;font:700 11px/1 ' + SANS + '!important;padding:0 9px!important'),
    // ♻️-reiturinn og ✉ þrengri svo textadálkarnir fái plássið
    r(T + 'thead th:last-child,' + T + 'tbody td:last-child', 'width:44px!important;padding-left:4px!important;padding-right:4px!important'),
  ];
  var inni = rules.join('\n');
  var css = '@media (min-width:901px){' + simalaus(inni) + '}\n' + vitt(inni) + '\n';

  var st = document.getElementById('_ars-tafla-415-css');
  if (!st) { st = document.createElement('style'); st.id = '_ars-tafla-415-css'; document.head.appendChild(st); }
  st.textContent = css;
})();
