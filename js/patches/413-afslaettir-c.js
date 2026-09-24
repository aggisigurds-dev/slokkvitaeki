/* === AFSLÆTTIR OG VERÐ — í útliti C (413) — 24.09.2026 ===
 *
 * Agnar 24.09 (mynd 10/11: lifandi vs. spjald C): „Geturðu reynt að klára að gera nákvæma eftirmynd af þessu."
 * Afsláttarkassinn (._afsl-box · 307, með 296 hópum, 255 sjálfvirku % og 113 tilboðsverðum) verður eins og á
 * spjaldi C:
 *
 *   dökkur haus · LED „Afslættir og verð" · „0 % sjálfvirkur afsláttur" stórt · „Efsta virka þrepið ræður verðinu
 *                 í Sölu: Tilboðsverð › Hópur › Sjálfvirkt %"
 *   þrjú spjöld  · Afsláttarhópur · Sjálfvirkur afsláttur · Tilboðsverð — hvert með dökkum haus (heiti + stöðuplata)
 *                 og hvítum búk
 *   Tilboðsverð  · kaflaband + skráningarröð + tafla, full breidd undir spjöldunum (þegar opið)
 *
 * AÐFERÐ: engir hnútar færðir (307/113 teikna sín hólf sjálf). ._afsl-box er þriggja dálka grind; ._afsl-grid,
 * ._afsl-wide og ._cpr-section eru display:contents svo hólfin þrjú (._ahop-section · ._cad-section · ._cpr-toggle)
 * lenda hlið við hlið og opni Tilboðsverðs-búkurinn spannar alla breiddina. JS speglar aðeins prósentuna í hausinn og
 * stöðuplöturnar (Enginn / 0 % / engin) — litlir hnútar sem eru endurgerðir þegar eigendurnir teikna upp á nýtt.
 * Aðeins tölva í Brunastáli (sama gildissvið og 402/404/411/412).
 */
(function () {
  'use strict';
  if (window.__afsl413) return;
  window.__afsl413 = true;

  var S = 'html[data-thm-preset="brunastal"]:not([data-viewmode="mobile"]):not(.slokk-phone-dev) body:not(.appmode) #companies-main:has(.co-banner) ';
  var F = ':not(#_p413a):not(#_p413b):not(#_p413c):not(#_p413d):not(#_p413e):not(#_p413f)';
  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var STAL = '#e2e6ec';
  var STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  var LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
  var REITUR = 'background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);padding:0 12px;font-size:13px;color:#141822;min-height:40px;box-sizing:border-box;font-family:' + SANS;
  var SILVER_BTN = 'background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530';
  var METAL_BTN = 'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4';
  var RED_BTN = 'background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);border:1px solid rgba(190,32,28,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(0,0,0,.45)';
  var HAUS = 'position:relative;background:' + METAL + ';padding:5px 16px 5px 20px;min-height:46px;box-sizing:border-box;color:#fff;display:flex;align-items:center;gap:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000';
  var RIVET = 'content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)';
  var PLATA = 'display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap;margin-left:auto';
  var SPJALD = 'background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);display:flex;flex-direction:column;overflow:hidden;padding:0;min-width:0';

  function r(sel, css) { return sel.split(',').map(function (s) { var m = s.trim().match(/^(.*?)(::?(?:before|after))$/); return S + (m ? m[1] + F + m[2] : s.trim() + F); }).join(',') + '{' + css + '}'; }
  function imp(css) { return css.split(';').filter(Boolean).map(function (d) { return /!important/.test(d) ? d : d + '!important'; }).join(';'); }
  var HOP = '._ahop-section', CAD = '._cad-section', CPR = '._cpr-section';
  var css = [
    // ── grindin: hausinn spannar, hólfin þrjú hlið við hlið, Tilboðsverðs-búkurinn full breidd ──
    r('._afsl-box', 'display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;padding:0 12px 16px!important;background:' + STAL + '!important;background-image:' + STAL_IMG + '!important;border:1px solid #000!important;border-radius:14px!important;overflow:hidden!important;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3)!important;align-items:start!important'),
    r('._afsl-grid,._afsl-wide,' + CPR, 'display:contents!important'),
    r('._afsl-slot-hop,._afsl-slot-pct', 'display:contents!important'),
    // hausinn
    r('._afsl-head', 'grid-column:1 / -1!important;margin:0 -12px 2px!important;padding:14px 18px 12px!important;border-radius:0!important;background:' + METAL + '!important;border-bottom:1px solid #000!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px 24px!important;position:relative'),
    r('._afsl-title', 'order:0;flex:1 1 100%;font-family:' + MONO + '!important;font-size:11.5px!important;font-weight:700!important;letter-spacing:.2em!important;text-transform:uppercase!important;color:#d9dee6!important;display:flex!important;align-items:center!important;gap:9px!important'),
    r('._afsl-title::before', 'content:"";width:8px;height:8px;border-radius:50%;background:#8f98a8;display:inline-block'),
    r('._afsl-head .b413-tala', 'order:1;display:flex;align-items:baseline;gap:8px;font-family:' + DISPLAY + '!important;font-size:38px!important;font-weight:800!important;line-height:1!important;letter-spacing:-.02em!important;color:#fff!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
    r('._afsl-head .b413-tala > span', 'font-family:' + DISPLAY + '!important;font-size:38px!important;font-weight:800!important;line-height:1!important;letter-spacing:-.02em!important;color:#fff!important'),
    r('._afsl-head .b413-tala small', 'font-family:' + DISPLAY + '!important;font-size:16px!important;font-weight:700!important;color:#d9dee6!important;letter-spacing:-.005em!important'),
    r('._afsl-head > span:nth-child(2)', 'order:2;font-family:' + MONO + '!important;font-size:11.5px!important;color:#d5dbe6!important;margin-left:8px!important'),
    r('._afsl-head > span:nth-child(2)::after', 'content:":"'),
    r('._afsl-ladder', 'order:3;display:inline-flex!important;align-items:center!important;gap:6px!important'),
    r('._afsl-step', 'all:unset!important;font-family:' + MONO + '!important;font-size:11.5px!important;font-weight:700!important;color:#fff!important;white-space:nowrap!important'),
    r('._afsl-arrow', 'font-family:' + MONO + '!important;color:#8e97a6!important'),
    // ── spjöldin þrjú ──
    r(HOP + ',' + CAD, imp(SPJALD)),
    r(HOP + ' > div,' + CAD + ' > div', 'display:flex!important;flex-direction:column!important;gap:0!important;padding:0!important;border:0!important;box-shadow:none!important;background:transparent!important'),
    r(HOP + ' > div > span:first-child,' + CAD + ' > div > span:first-child', imp(HAUS) + ';font-family:' + SANS + '!important;font-size:15px!important;font-weight:600!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important;margin:0!important'),
    r(HOP + ' > div > span:first-child::before,' + CAD + ' > div > span:first-child::before', RIVET + ';left:7px'),
    r(HOP + ' > div > span:first-child::after,' + CAD + ' > div > span:first-child::after', RIVET + ';right:7px'),
    r(HOP + ' > div > span:first-child svg', 'display:none!important'),
    r(HOP + ' .b413-plata,' + CAD + ' .b413-plata,' + CPR + ' .b413-plata', PLATA),
    r(HOP + ' > div > span:nth-child(2),' + CAD + ' > div > span:nth-child(2)', 'order:3;margin:0 10px 10px!important;min-height:32px!important;display:flex!important;align-items:center!important;padding:0 10px!important;font-family:' + SANS + '!important;font-size:12px!important;color:#6b7483!important;' + LINE),
    r(HOP + ' > div > span:nth-child(3),' + CAD + ' > div > span:nth-child(3)', 'order:2;margin:10px 10px 6px!important;display:flex!important;align-items:center!important;gap:8px!important'),
    r(HOP + ' select', imp(LINE) + ';flex:1 1 auto!important;min-height:38px!important;border:0!important;padding:0 10px!important;font-family:' + SANS + '!important;font-size:13px!important;color:#1f2530!important'),
    r(HOP + ' button,' + CAD + ' button,' + CPR + ' ._cpr-add', imp(SILVER_BTN) + ';height:36px!important;padding:0 12px!important;border-radius:9px!important;font-family:' + SANS + '!important;font-size:12.5px!important;font-weight:600!important;white-space:nowrap!important'),
    r(CAD + ' input', imp(REITUR) + ';width:88px!important;min-height:38px!important;height:38px!important;font-family:' + MONO + '!important;text-align:right!important'),
    r(CAD + ' > div > span:nth-child(3) > span', 'font-family:' + MONO + '!important;font-size:12px!important;color:#3a4250!important'),
    r(CAD + ' ._cad-save', imp(METAL_BTN) + ';margin-left:auto!important'),
    // Tilboðsverð — þriðja spjaldið er rofinn sjálfur; búkurinn full breidd fyrir neðan
    r(CPR + ' ._cpr-toggle', 'all:unset!important;' + imp(SPJALD) + ';cursor:pointer!important;grid-column:3!important;grid-row:2!important;display:flex!important;flex-wrap:wrap!important;align-content:flex-start!important;font-family:' + SANS + '!important'),
    r(CPR + ' ._cpr-toggle > span:nth-child(2)', 'flex:1 1 auto!important;order:0;' + imp(HAUS) + ';font-size:15px!important;font-weight:600!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important;padding-right:110px!important'),
    r(CPR + ' ._cpr-toggle > span:nth-child(2)::before', RIVET + ';left:7px'),
    r(CPR + ' ._cpr-toggle > span:nth-child(2)::after', RIVET + ';right:7px'),
    r(CPR + ' ._cpr-toggle > span:nth-child(3)', 'order:1;position:absolute!important;right:16px!important;top:12px!important;' + PLATA),
    r(CPR + ' ._cpr-toggle > span:first-child', 'order:2;flex:none!important;margin:10px 0 0 10px!important;font-family:' + MONO + '!important;font-size:11px!important;color:#8e97a6!important;transition:transform .12s'),
    r(CPR + ' ._cpr-toggle[aria-expanded="true"] > span:first-child', 'transform:rotate(90deg)'),
    r(CPR + ' ._cpr-toggle > span:nth-child(4)', 'order:3;flex:1 1 auto!important;margin:10px 10px 10px 4px!important;min-height:32px!important;display:flex!important;align-items:center!important;padding:0 10px!important;font-family:' + SANS + '!important;font-size:12px!important;color:#6b7483!important;' + LINE),
    r(CPR + ' ._cpr-toggle', 'position:relative!important'),
    r(CPR + ' > div:nth-child(2)', 'grid-column:1 / -1!important;grid-row:3!important;display:flex!important;flex-direction:column!important;gap:10px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important'),
    r(CPR + ' > div:nth-child(2)::before', 'content:"Tilboðsverð";position:relative;display:flex;align-items:center;min-height:40px;padding:0 16px 0 20px;border:1px solid #000;border-radius:6px;background:' + METAL + ';color:#eef1f4;font-family:' + DISPLAY + ';font-size:18px;font-weight:800;letter-spacing:-.01em;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 6px 14px -8px rgba(0,0,0,.6)'),
    r(CPR + ' > div:nth-child(2) > div:first-child > div:first-child', 'display:flex!important;gap:8px!important;align-items:flex-end!important;flex-wrap:nowrap!important'),
    r(CPR + ' > div:nth-child(2) > div:first-child > div:first-child > div', 'flex:3 1 0!important;display:flex!important;gap:6px!important;min-width:0!important'),
    r(CPR + ' #_cpr-name,' + CPR + ' #_cpr-price,' + CPR + ' #_cpr-vsk,' + CPR + ' #_cpr-notes', imp(REITUR) + ';height:40px!important;min-width:0!important'),
    r(CPR + ' #_cpr-name', 'flex:1 1 auto!important'), r(CPR + ' #_cpr-price', 'flex:1.2 1 0!important;font-family:' + MONO + '!important;text-align:right!important'), r(CPR + ' #_cpr-vsk', 'width:80px!important;flex:none!important;font-family:' + MONO + '!important;text-align:right!important'), r(CPR + ' #_cpr-notes', 'flex:2 1 0!important'),
    r(CPR + ' ._cpr-pick', imp(SILVER_BTN) + ';height:40px!important;width:40px!important;padding:0!important;border-radius:8px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:none!important'),
    r(CPR + ' ._cpr-add', imp(RED_BTN) + ';height:40px!important;padding:0 16px 0 12px!important;border-radius:10px!important;font-weight:700!important;flex:none!important'),
    r(CPR + ' > div:nth-child(2) > div:first-child > div:last-child', 'font-family:' + MONO + '!important;font-size:11.5px!important;color:#525b6b!important;margin:2px 0 0!important'),
    r(CPR + ' > div:nth-child(2) > div:nth-child(2) > div:first-child', 'display:none!important'),
    r(CPR + ' table', 'width:100%!important;border-collapse:separate!important;border-spacing:0!important;background:#fff!important;border-radius:8px!important;overflow:hidden!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)!important;font-size:12.5px!important'),
    r(CPR + ' table th', 'background:' + METAL + '!important;color:#eef1f4!important;font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.12em!important;text-transform:uppercase!important;text-align:left!important;padding:0 10px!important;height:34px!important;border-bottom:1px solid #000!important'),
    r(CPR + ' table td', 'padding:8px 10px!important;border-bottom:1px solid #edf0f4!important;vertical-align:middle!important;color:#1f2530!important;background:#fff!important'),
    r(CPR + ' table td[colspan]', 'text-align:center!important;color:#525b6b!important;font-style:italic!important;padding:16px!important')
  ].join('\n');
  var st = document.createElement('style'); st.id = 'afsl-413'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  function scope() {
    var h = document.documentElement;
    return h.getAttribute('data-thm-preset') === 'brunastal' && h.getAttribute('data-viewmode') !== 'mobile' && !h.classList.contains('slokk-phone-dev') && !(document.body && document.body.classList.contains('appmode'));
  }
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function plata(host, text) {
    if (!host) return;
    var p = host.querySelector(':scope > .b413-plata');
    if (!p) { p = document.createElement('span'); p.className = 'b413-plata'; host.appendChild(p); }
    if (p.textContent !== text) p.textContent = text;
  }
  function spegla() {
    var box = document.querySelector('._afsl-box'); if (!box) return;
    var head = box.querySelector('._afsl-head');
    var inp = box.querySelector('._cad-inp');
    var pct = inp ? (String(inp.value || '').trim() || '0') : '0';
    if (head) {
      var t = head.querySelector('.b413-tala');
      if (!t) { t = document.createElement('div'); t.className = 'b413-tala'; t.innerHTML = '<span></span><small>% sjálfvirkur afsláttur</small>'; head.appendChild(t); }
      var sp = t.querySelector('span'); if (sp && sp.textContent !== pct) sp.textContent = pct;
    }
    var sel = box.querySelector('._ahop-sel');
    var hopT = 'Enginn';
    if (sel && sel.selectedIndex >= 0) { var o = sel.options[sel.selectedIndex]; var v = txt(o); if (sel.value && !/enginn/i.test(v)) hopT = v.slice(0, 22); }
    plata(box.querySelector('._ahop-section > div > span:first-child'), hopT);
    plata(box.querySelector('._cad-section > div > span:first-child'), pct + ' %');
    var tg = box.querySelector('._cpr-toggle');
    if (tg) { var e3 = tg.querySelector(':scope > span:nth-child(3)'); if (e3 && !e3.classList.contains('b413-plata-innri')) e3.classList.add('b413-plata-innri'); /* aðeins þegar vantar — classList.add skráir mutation þótt klasinn sé til (mælt 24.09: 65 tikk/s lykkja) */ }
  }
  var timer = null;
  function tick() { if (!scope()) return; try { spegla(); } catch (e) { console.error('[413]', e); } }
  function schedule() { if (schedule.inni) return; schedule.inni = true; try { tick(); } finally { schedule.inni = false; } }   // 24.09.2026: vaktin (252) skilar sér í rAF, FYRIR málun — setTimeout héðan lenti EFTIR málun og hrái ramminn sást sem hopp (mælt: 224-listinn 601 → 741 px, valstikan 205 → 154 px). Sama tif, engin millistaða.
  (function watch() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 500); return; }
    new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t && t.closest && t.closest('.b413-tala,.b413-plata,.b413-plata-innri')) continue; schedule(); return; } }).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'class'] });
    main.addEventListener('input', schedule, true); main.addEventListener('change', schedule, true);
    tick();
  })();
  setInterval(tick, 1500);
})();
