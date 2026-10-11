/* 458 — Spjöldin á Brunakerfis- og Slökkvikerfis skoðun með húsmynd (11.10.2026, Agnar: „Mátt setja spjaldavalið
 *       líka á brunakerfi skoðun" · „En hafa samt lista default á báðum stöðum").
 *
 *   385 á þegar rofann „▦ Tafla / ☰ Spjöld" og teiknar ._sk-card í spjaldaham (klasinn _sk-spjold á sýninni). Sá
 *   hamur var smíðaður fyrir síma (stórt letur, engin mynd). Hér fá spjöldin sama útlit og Ársskoðun (457): húsmyndin
 *   efst, skoðunarmánuðurinn efst t.v. (sami valgluggi og áður — breyting vistast eins), staðan + Í vinnslu-hakið
 *   neðst t.h. á myndinni, svo nafn, heimilisfang, kerfi, ár + skref + verð og nótan. 4–5 spjöld á breidd.
 *
 *   Aðeins CSS ofan á markup 385 + eitt stílblað með --spj-mynd per fyrirtæki (data-fid). Engin teikning, enginn
 *   hnútur 385 snertur. Myndaslóðin kemur úr 457 (SpjaldMynd.slod: co_bygging_mynd, smækkuð í 720 px).
 *   Aðeins tölva: í app-ham / síma heldur 385 stóru spjöldunum sínum.
 */
(function () {
  'use strict';
  if (window.__skodunSpjold458) return;
  window.__skodunSpjold458 = true;

  var VIEWS = ['view-brunaskra', 'view-slokkvikerfi'];
  var F = ':not(#_p458a):not(#_p458b):not(#_p458c):not(#_p458d):not(#_p458e):not(#_p458f):not(#_p458g):not(#_p458h)';
  var MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace';
  var SANS = '"IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var HUS = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6b717c" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 21V6l7.5-3 7.5 3v15"/><path d="M2.5 21h19"/><path d="M8.5 9h2M13.5 9h2M8.5 13h2M13.5 13h2M10.5 21v-4h3v4"/></svg>') + '")';
  var SKYGGING = 'linear-gradient(180deg,rgba(8,8,10,.5) 0%,rgba(8,8,10,0) 32%,rgba(8,8,10,0) 68%,rgba(8,8,10,.42) 100%)';

  // Forskeyti: tölva, spjaldahamur. Hver liður fær gervi-auðkennin (392/385 skrifa !important með sínum).
  function r(sel, css) {
    var out = [];
    VIEWS.forEach(function (v) {
      sel.split(',').forEach(function (x) {
        x = x.trim();
        var i = x.indexOf('::');
        var P = 'html:not([data-viewmode="mobile"]) body:not(.appmode) #' + v + '._sk-spjold ';
        out.push(i < 0 ? P + x + F : P + x.slice(0, i) + F + x.slice(i));
      });
    });
    return out.join(',') + '{' + css.split(';').filter(Boolean).map(function (d) { return /!important\s*$/.test(d) ? d : d + '!important'; }).join(';') + '}';
  }

  function css() {
    if (document.getElementById('_skodun-spjold-css')) return;
    var C = '._sk-cards ._sk-card';
    var R = [
      r('._sk-cards', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:14px;align-items:stretch;margin-left:0;margin-right:0'),
      r(C, 'display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:150px auto auto 1fr;position:relative;padding:0 12px 12px;margin:0;' +
        'background:#fff;border:1px solid #000;border-radius:12px;overflow:hidden;cursor:pointer;' +
        'box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12)'),
      r(C + ':hover', 'box-shadow:0 0 0 1px #000,0 18px 40px -12px rgba(10,14,22,.55),0 2px 6px rgba(10,14,22,.14)'),
      r(C + '.ur', 'opacity:.62'),
      // myndin (gervistak í röð 1) — sama uppskrift og 457
      r(C + '::before', 'content:"";display:block;grid-row:1;grid-column:1;margin:0 -12px;border-bottom:1px solid #000;' +
        'background-color:#1c1d21;background-image:' + SKYGGING + ',var(--spj-mynd,' + HUS + '),' + METAL + ';' +
        'background-size:100% 100%,var(--spj-str,52px 52px),100% 100%;background-position:center,center,center;background-repeat:no-repeat'),
      r(C + ':has(._sk-st--late)::before', 'border-bottom:3px solid #b0201b'),
      r(C + ' ._sk-cardhd', 'display:contents'),
      // staðan + Í vinnslu-hakið neðst t.h. á myndinni
      r(C + ' ._sk-cardhd > ._sk-stcell', 'grid-row:1;grid-column:1;justify-self:end;align-self:end;margin:0 0 8px;display:inline-flex;align-items:center;gap:5px;z-index:1'),
      r(C + ' ._sk-st', 'font-size:11px;min-height:24px;padding:3px 9px;white-space:nowrap;max-width:none;text-align:left;box-shadow:0 2px 8px rgba(0,0,0,.35)'),
      r(C + ' ._sk-vchk', 'box-shadow:0 2px 8px rgba(0,0,0,.35)'),
      // skoðunarmánuðurinn efst t.v. á myndinni — sami <select> og áður, nú sem dökk pilla
      r(C + ' ._sk-cardhd + ._sk-cardlina', 'grid-row:1;grid-column:1;justify-self:start;align-self:start;margin:9px 0 0;height:25px;padding:0 3px 0 5px;gap:3px;flex-wrap:nowrap;z-index:1;' +
        'border-radius:99px;background:rgba(12,12,14,.78);box-shadow:0 2px 8px rgba(0,0,0,.35);position:static'),
      // merkið „Skoðun" víkur svo mánuður og „síðast" komist bæði fyrir á ~250 px spjaldi (valglugginn segir sig sjálfur)
      r(C + ' ._sk-cardhd + ._sk-cardlina > label', 'display:none'),
      r(C + ' ._sk-cardhd + ._sk-cardlina > select._sk-man', 'field-sizing:content;min-width:0;max-width:130px;width:auto;height:23px;min-height:0;margin:0;padding:0 4px;border:0;border-radius:99px;' +
        'background:transparent;color:#fff;font:700 11px/1 ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;box-shadow:none;cursor:pointer'),
      r(C + ' ._sk-cardhd + ._sk-cardlina > select._sk-man option', 'color:#11141c;background:#fff;text-transform:none'),
      // „síðast dd.mm.áá" efst t.h. á myndinni (absolute miðað við spjaldið — pillan má því ekki bera síu/backdrop)
      r(C + ' ._sk-cardhd + ._sk-cardlina > ._sk-cardsidast', 'display:block;position:absolute;top:10px;right:10px;z-index:1;padding:5px 8px;border-radius:99px;' +
        'background:rgba(12,12,14,.6);color:#d9dee6;font:600 9px/1 ' + MONO + ';letter-spacing:.04em;white-space:nowrap'),
      // nafn, heimilisfang, kerfi
      r(C + ' ._sk-cardnafn', 'grid-row:2;grid-column:1;display:flex;flex-direction:column;gap:2px;min-width:0;padding-top:11px;font-family:' + SANS),
      r(C + ' ._sk-co', 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal;' +
        'font:800 16px/1.15 ' + DISPLAY + ';font-variant-numeric:lining-nums;letter-spacing:-.01em;color:#11141c'),
      r(C + ' ._sk-kerfi', 'margin:2px 0 0;font:500 11px/1.35 ' + MONO + ';color:#2b313c;white-space:normal'),
      r(C + ' ._sk-kerfi + ._sk-kerfi', 'color:#5b6472'),
      // ár, síðast, skref, einingar, verð
      r(C + ' ._sk-cardlina + ._sk-cardlina', 'grid-row:3;grid-column:1;display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:10px 0 0'),
      r(C + ' ._sk-yr', 'width:34px;height:22px;font-size:11px'),
      r(C + ' ._sk-skref i', 'width:24px;height:22px;font-size:9px'),
      r(C + ' ._sk-cardlina + ._sk-cardlina > ._sk-sp', 'display:none'),
      r(C + ' ._sk-vantar,' + C + ' ._sk-mono', 'font-size:11.5px;white-space:nowrap'),
      // nótan — röðin fyllir afganginn (1fr) svo spjöldin jafnist; reiturinn heldur eigin hæð
      r(C + ' > ._sk-notacell', 'grid-row:4;grid-column:1;align-self:start;margin:10px 0 0'),
      r(C + ' textarea._sk-nota', 'min-height:34px;padding:5px 8px;font:400 11.5px/1.4 ' + SANS + ';border:1px dashed rgba(20,24,34,.18);border-radius:6px;background:#fbfcfd'),
      r(C + ' ._sk-notast', 'font-size:10px;min-height:0'),
    ];
    var s = document.createElement('style');
    s.id = '_skodun-spjold-css';
    s.textContent = '@media (min-width:901px){\n' + R.join('\n') + '\n}';
    document.head.appendChild(s);
  }

  // Myndablaðið: ein regla per fyrirtæki með mynd. Óháð teikningu 385 (data-fid er fast á hverju spjaldi).
  var _sig = '';
  function myndir() {
    var slod = window.SpjaldMynd && SpjaldMynd.slod;
    if (!slod) return;
    var map = {};
    try { map = (window.AppSettings && AppSettings.path && AppSettings.path('co_bygging_mynd')) || {}; } catch (_) {}
    var reglur = [];
    Object.keys(map).forEach(function (id) {
      var m = map[id], u = m && !m.engin ? slod(m.url) : '';
      if (u && /^\d+$/.test(id)) reglur.push('._sk-cards ._sk-card[data-fid="' + id + '"]{--spj-mynd:url("' + u + '");--spj-str:cover}');
    });
    var texti = reglur.join('\n'), sig = reglur.length + ':' + texti.length;
    if (sig === _sig) return;
    _sig = sig;
    var st = document.getElementById('_skodun-spjold-myndir');
    if (!st) { st = document.createElement('style'); st.id = '_skodun-spjold-myndir'; document.head.appendChild(st); }
    st.textContent = texti;
  }

  css();
  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('[data-utlit="spjold"]')) { try { myndir(); } catch (_) {} } }, true);
  [1500, 5000, 15000].forEach(function (t) { setTimeout(function () { try { myndir(); } catch (_) {} }, t); });
})();
