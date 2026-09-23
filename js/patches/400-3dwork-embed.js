/* === 3DWORK (400) — merkja/CAD-bekkurinn í Slökkvitæki ====================
 *
 * 3dwork (STL/mesh-bekkur fyrir CO2-merki + prentun) býr á
 * kjarni-3dwork.vercel.app. Þessi síða setur hann inn í appið:
 * hliðarstika „🛠️ 3dwork" + #3dwork iframe, í Slökkvitæki-skelinni.
 *
 * Sama mynstur og 342 (TurboPaint): lazy-loadar iframe við fyrstu opnun,
 * nav-hnappur lifir sidebar-endurbyggingu, #3dwork djúptengill.
 * ========================================================================== */
(() => {
  if (window.__threeDWorkNav) return;
  window.__threeDWorkNav = true;

  const VIEW_ID = 'view-3dwork';
  const NAV_KEY = '3dwork';
  const NAV_LABEL = '🛠️ 3dwork';
  const SRC = 'https://kjarni-3dwork.vercel.app/3dwork';

  function injectCSS() {
    if (document.getElementById('tdw-nav-css')) return;
    const s = document.createElement('style');
    s.id = 'tdw-nav-css';
    s.textContent =
      '#' + VIEW_ID + '{position:relative;height:100%;min-height:0}' +
      '#' + VIEW_ID + ' .tdw-frame-wrap{position:absolute;inset:0;display:flex;flex-direction:column;background:#0f1117}' +
      '#' + VIEW_ID + ' iframe{flex:1;width:100%;border:0;background:#0f1117}';
    document.head.appendChild(s);
  }

  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.querySelector('[id^="view-"]');
    if (!sample || !sample.parentElement) return;
    injectCSS();
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.innerHTML =
      '<div class="tdw-frame-wrap">' +
        '<iframe title="3dwork" allow="clipboard-read; clipboard-write; fullscreen"></iframe>' +
      '</div>';
    sample.parentElement.appendChild(v);
  }

  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach((el) => {
      el.style.display = 'none';
      el.classList.remove('active');
    });
    const v = document.getElementById(VIEW_ID);
    if (!v) return;
    v.style.display = 'block';
    v.classList.add('active');
    const ifr = v.querySelector('iframe');
    if (ifr && ifr.getAttribute('data-src') !== SRC) {
      ifr.src = SRC;
      ifr.setAttribute('data-src', SRC);
    }
    document.querySelectorAll('.vnav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === NAV_KEY);
    });
    try {
      if (location.hash !== '#' + NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY);
    } catch (_) {}
  }

  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 600); return; }
    const tpl = nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 600); return; }
    let btn = nav.querySelector('[data-view="' + NAV_KEY + '"]');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
      btn.setAttribute('data-view', NAV_KEY);
      btn.innerHTML = NAV_LABEL;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.App && App.switchView) App.switchView(NAV_KEY);
        else show();
      });
    }
    // Sit next to TurboPaint, the other embedded kjarni app.
    const after = nav.querySelector('[data-view="turbopaint"]')
      || nav.querySelector('[data-view="sala"]')
      || tpl;
    if (after && after.nextSibling !== btn) {
      after.parentNode.insertBefore(btn, after.nextSibling);
    } else if (!btn.parentNode) {
      nav.appendChild(btn);
    }
  }

  function patchSwitchView() {
    if (!window.App || window.App._tdwSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const mine = document.getElementById(VIEW_ID);
      if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      return orig.apply(this, arguments);
    };
    window.App._tdwSwitchPatched = true;
  }

  function openFromHash() {
    const slug = (location.hash || '').replace(/^#/, '');
    if (slug === NAV_KEY) {
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    }
  }

  function boot() {
    injectNav();
    patchSwitchView();
    ensureView();
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    setTimeout(() => { injectNav(); patchSwitchView(); }, 1600);
    console.log('[patch-400] 3dwork-síða tilbúin (#3dwork)');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.ThreeDWork = { open: show };
})();
