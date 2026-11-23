/* 524 — sími: fljótandi takkar mega ekki liggja á aðaltökkum, kanban staflast.
 *
 * Mælt 23.11.2026 (390 px): „Spyrja sérfræðing“, EN, spjall og myndavél sitja
 * neðst (z-index þúsundir) ofan á föstum „ÁFRAM“-stiku sölu (#pos-checkout,
 * z-index 60). Patch 329 lyfti QR upp fyrir stikuna, en 366 skrifar bottom
 * aftur í 12 px með inline !important. Hér er hæð föstrar botnstiku mæld og
 * staflinn settur fyrir ofan hana.
 *
 * Afgreiðslu-kanban: 78 staflar dálkum undir 900 px, en 340 þvingar
 * min-width 680 px og þrjá 220 px dálka, svo á 390 px gægist „Í VINN…“ út
 * fyrir skjáinn. Undir 700 px staflast dálkarnir.
 *
 * Aðeins ≤768 / ≤700. Borðtölva ósnert. 153/187 ósnert.
 */
(function () {
  'use strict';
  if (window.__simiAdgerdir524) return;
  window.__simiAdgerdir524 = true;

  var CSS = [
    '@media (max-width:700px){',
    'html body #view-counter#view-counter#view-counter > div[style*="grid-template-columns"],',
    'html body #view-counter#view-counter#view-counter [data-pe-kanban]{',
    'grid-template-columns:1fr !important;min-width:0 !important;width:100% !important;',
    'max-width:100% !important;overflow-x:hidden !important;height:auto !important;',
    'max-height:none !important}',
    'html body #view-counter#view-counter#view-counter .cw-col{min-width:0 !important;width:100% !important}',
    '}',
    '@media (max-width:768px){',
    'html body #view-field.active .field-col{max-height:70vh !important;overflow-y:auto !important}',
    'html body #view-field.active #_mis-list{max-height:70vh;overflow-y:auto}',
    '}'
  ].join('');

  var st = document.createElement('style');
  st.id = '_simi-adgerdir-524';
  st.textContent = CSS;
  document.head.appendChild(st);

  var SNERT = [];
  function snerta(el) {
    if (SNERT.indexOf(el) < 0) SNERT.push(el);
  }
  function hreinsa() {
    SNERT.forEach(function (el) {
      ['bottom', 'top', 'left', 'right', 'transform', 'max-width', 'position'].forEach(function (p) {
        el.style.removeProperty(p);
      });
    });
    SNERT = [];
  }

  function stikaHaed() {
    var ids = ['pos-checkout', '_app-nav'];
    var h = 0;
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el || !el.isConnected) continue;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
      var r = el.getBoundingClientRect();
      if (r.height < 8 || r.width < window.innerWidth * 0.6) continue;
      if (r.bottom < window.innerHeight - 8) continue;
      h = Math.max(h, Math.round(r.height));
    }
    return h;
  }

  function synilegt(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  var KANBAN = [];
  function staflaKanban() {
    var nodes = document.querySelectorAll('#view-counter [data-pe-kanban], #view-counter > div[style*="grid-template-columns"], #view-counter .cw-col');
    if (window.innerWidth > 700) {
      KANBAN.forEach(function (el) {
        ['grid-template-columns', 'min-width', 'width', 'max-width', 'overflow-x', 'height', 'padding-bottom', 'box-sizing'].forEach(function (p) {
          el.style.removeProperty(p);
        });
      });
      KANBAN = [];
      return;
    }
    // 340 skrifar min-width:680px !important aftur á blaðinu (t=1200). Inline
    // !important vinnur það, svo dálkarnir staflast á mjórri skjá.
    nodes.forEach(function (el) {
      if (KANBAN.indexOf(el) < 0) KANBAN.push(el);
      el.style.setProperty('min-width', '0', 'important');
      el.style.setProperty('width', '100%', 'important');
      el.style.setProperty('max-width', '100%', 'important');
      if (el.classList.contains('cw-col')) {
        el.style.setProperty('padding-bottom', '132px', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');
        return;
      }
      el.style.setProperty('grid-template-columns', '1fr', 'important');
      el.style.setProperty('overflow-x', 'hidden', 'important');
      el.style.setProperty('height', 'auto', 'important');
    });
  }

  function lyfta() {
    staflaKanban();
    if (window.innerWidth > 768) { hreinsa(); return; }
    var h = stikaHaed();
    var grunn = h + 12;
    var haegri = ['#qr-fab', '#_ad-fab'];
    var b = grunn;
    haegri.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!synilegt(el)) return;
      snerta(el);
      el.style.setProperty('position', 'fixed', 'important');
      el.style.setProperty('right', '12px', 'important');
      el.style.setProperty('left', 'auto', 'important');
      el.style.setProperty('top', 'auto', 'important');
      el.style.setProperty('bottom', b + 'px', 'important');
      b += (el.offsetHeight || 52) + 8;
    });
    var en = document.getElementById('_slokk_langbtn');
    var vinstri = grunn;
    if (synilegt(en)) {
      snerta(en);
      en.style.setProperty('position', 'fixed', 'important');
      en.style.setProperty('left', '12px', 'important');
      en.style.setProperty('right', 'auto', 'important');
      en.style.setProperty('top', 'auto', 'important');
      en.style.setProperty('transform', 'none', 'important');
      en.style.setProperty('bottom', vinstri + 'px', 'important');
      vinstri += (en.offsetHeight || 44) + 8;
    }
    var sa = document.querySelector('.sa494');
    if (synilegt(sa)) {
      snerta(sa);
      sa.style.setProperty('left', '12px', 'important');
      sa.style.setProperty('right', 'auto', 'important');
      sa.style.setProperty('top', 'auto', 'important');
      sa.style.setProperty('bottom', vinstri + 'px', 'important');
      sa.style.setProperty('max-width', 'calc(100% - 84px)', 'important');
    }
  }

  var t = null;
  function seinkad() { clearTimeout(t); t = setTimeout(lyfta, 80); }
  window.addEventListener('resize', seinkad);
  window.addEventListener('hashchange', seinkad);
  document.addEventListener('view-shown', seinkad);
  if (document.body) {
    try { new MutationObserver(seinkad).observe(document.body, { childList: true, subtree: true }); } catch (_) {}
  }
  seinkad();
  setInterval(lyfta, 1000);

  function merkja() {
    var active = document.querySelector('.view.active');
    document.querySelectorAll('.view').forEach(function (v) {
      if (v === active) v.setAttribute('role', 'main');
      else if (v.getAttribute('role') === 'main') v.removeAttribute('role');
    });
  }
  document.addEventListener('view-shown', merkja);
  document.addEventListener('DOMContentLoaded', merkja);
  setTimeout(merkja, 600);
  setTimeout(merkja, 2000);
})();
