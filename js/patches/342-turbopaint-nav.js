/* === TURBOPAINT (342) — teikningar úr Slökkvitæki ==========================
 *
 * TurboPaint (heimilisfangaleit + TIF/PDF á borð) býr á kjarni.vercel.app.
 * Landnr var tekið af Sölu (325); þessi síða setur teikningarnar aftur inn
 * í appið: hliðarstika „📐 Teikningar" + #turbopaint iframe.
 *
 * /kjarni og /kjarni/turbopaint á þessum hýsli 302-a á Vercel (netlify.toml)
 * svo bókamerki virka. Hér inni höldum við notandanum í Slökkvitæki-skel.
 * ========================================================================== */
(() => {
  if (window.__turbopaintNav) return;
  window.__turbopaintNav = true;

  const VIEW_ID = 'view-turbopaint';
  const NAV_KEY = 'turbopaint';
  const NAV_LABEL = '📐 Teikningar';
  const SRC = 'https://kjarni.vercel.app/kjarni/turbopaint';

  function injectCSS() {
    if (document.getElementById('tp-nav-css')) return;
    const s = document.createElement('style');
    s.id = 'tp-nav-css';
    s.textContent =
      '#' + VIEW_ID + '{position:relative;height:100%;min-height:0}' +
      '#' + VIEW_ID + ' .tp-frame-wrap{position:absolute;inset:0;display:flex;flex-direction:column;background:#0f1117}' +
      '#' + VIEW_ID + ' .tp-frame-bar{flex:none;display:flex;align-items:center;gap:10px;padding:8px 12px;background:#1a1d2e;color:#e7e5e4;font:12.5px/1.3 "Space Grotesk",system-ui,sans-serif}' +
      '#' + VIEW_ID + ' .tp-frame-bar a{color:#fdba74;font-weight:700;text-decoration:none}' +
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
      '<div class="tp-frame-wrap">' +
        '<iframe title="TurboPaint" allow="clipboard-read; clipboard-write"></iframe>' +
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
    // Daily use: sit next to Sala (landnr/teikningar used to live there),
    // not at the bottom of a long sidebar.
    const after = nav.querySelector('[data-view="sala"]')
      || nav.querySelector('[data-view="thjonustubord"]')
      || tpl;
    if (after && after.nextSibling !== btn) {
      after.parentNode.insertBefore(btn, after.nextSibling);
    } else if (!btn.parentNode) {
      nav.appendChild(btn);
    }
  }

  function patchSwitchView() {
    if (!window.App || window.App._tpSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const mine = document.getElementById(VIEW_ID);
      if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      return orig.apply(this, arguments);
    };
    window.App._tpSwitchPatched = true;
  }

  function openFromHash() {
    const slug = (location.hash || '').replace(/^#/, '');
    if (slug === NAV_KEY || slug === 'kjarni' || slug === 'kjarni/turbopaint') {
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
    console.log('[patch-342] TurboPaint-síða tilbúin (#turbopaint)');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
