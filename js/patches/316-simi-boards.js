/* SIMI BOARDS + ÖPP SHELL — hub boards, launcher, app chrome (bord-flettur).
 *
 * Joker’s shared compact (314, when present) owns density / 50px scoping /
 * Verkborð+Afgreiðsla stacks. This file is routing + app-shell + the boards
 * 314 does not cover. All rules are additive; 261 is not edited so a parallel
 * session cannot wipe the shell compact by reverting app-profiles.
 *
 * Covers:
 *   • Banner Sími (html[data-viewmode=mobile]) + hamburger (html.slokk-phone-nav)
 *   • Öpp: ?app= and /app/<key>/ → body.appmode[data-app] + viewmode=mobile
 *   • Compact launcher (#view-opp) and bottom nav (#_app-nav) — 261 still
 *     ships min-height:120px tabs; we shrink them here for EVERY app
 *   • Stack: Bakendi · Aksturslisti · Verkdagbók · Skipulagsborð · Bílstjóri hub
 *
 * Out of scope: Plaza ._yr look-A, theme-scoped.css, deploy.js, 261 forms.
 */
(() => {
  if (window.__simiBoardsInstalled) return;
  window.__simiBoardsInstalled = true;

  const STYLE_ID = 'simi-boards-css';
  const M = 'html[data-viewmode="mobile"] ';
  const P = 'html.slokk-phone-nav ';
  const A = 'body.appmode ';

  function trio(sel) { return M + sel + ',' + P + sel + ',' + A + sel; }

  const css = [
    // ── Öpp launcher: full-bleed stacked cards (☰ already pads .view 60px) ─
    trio('#view-opp') + '{min-height:0}',
    trio('#view-opp .op-main') + '{max-width:none;padding:80px 12px 28px;box-sizing:border-box}',
    trio('#view-opp .op-h1') + '{font-size:22px}',
    trio('#view-opp .op-sub') + '{margin:0 0 12px;font-size:12.5px}',
    trio('#view-opp .op-card') + '{padding:12px;margin:0 0 10px;border-radius:14px}',
    trio('#view-opp .op-ic') + '{width:40px;height:40px;font-size:22px;border-radius:11px}',
    trio('#view-opp .op-nm') + '{font-size:16px}',
    trio('#view-opp .op-acts') + '{gap:6px;margin:10px 0 0;flex-wrap:wrap}',
    trio('#view-opp .op-btn') +
      '{padding:8px 12px;min-height:40px!important;font-size:13px!important}',
    trio('#view-opp .op-pg') + '{padding:8px 8px;min-height:40px;font-size:14px}',
    trio('#view-opp .op-pgsum') + '{min-height:40px;padding:8px 4px}',

    // ── Öpp chrome: 261 header is 50px + two fat labels; nav was 120px ────
    A + '#_app-hdr{height:44px;padding:0 8px;gap:6px}',
    A + '#_app-hdr .nm{font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    A + '#_app-hdr button{height:32px;min-height:32px;padding:0 8px;font-size:12px}',
    A + '#_app-hdr #_app-pages,' + A + '#_app-hdr #_app-inst2' +
      '{max-width:40px;overflow:hidden;white-space:nowrap;padding:0 6px;font-size:16px}',
    A + '.view.active{padding-top:48px!important}',
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode .view.active:not(#view-field):not(#view-counter):not(#view-workshop)' +
      '{padding-top:48px!important}',

    // ── Öpp bottom nav: 261 still paints min-height:120px ──────────────────
    A + '#_app-nav{padding:4px 6px calc(4px + env(safe-area-inset-bottom,0px))!important;gap:4px}',
    A + '#_app-nav button{flex:1 0 64px;min-width:64px;min-height:52px!important;padding:4px 3px!important;font-size:11px!important;gap:2px!important;border-radius:10px}',
    A + '#_app-nav button .e{font-size:18px!important}',
    A + '.view.active{padding-bottom:calc(68px + env(safe-area-inset-bottom,0px))!important}',
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode .view.active:not(#view-field):not(#view-counter):not(#view-workshop)' +
      '{padding-bottom:calc(68px + env(safe-area-inset-bottom,0px))!important}',
    A + '#_app-frame{top:44px!important;bottom:64px!important}',
    'body.appmode.appmode-nonav .view.active{padding-bottom:24px!important}',

    // ── Bakendi ────────────────────────────────────────────────────────────
    trio('#view-bakendi .bk-wrap') + '{padding:12px 10px 72px;max-width:none}',
    trio('#view-bakendi .bk-tabs') +
      '{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:2px}',
    trio('#view-bakendi .bk-tab') + '{flex:none;white-space:nowrap;min-height:44px}',
    trio('#view-bakendi .bk-health') + '{grid-template-columns:1fr!important}',
    trio('#view-bakendi .bk-grid') + '{grid-template-columns:1fr 1fr!important;gap:8px}',
    trio('#view-bakendi .bk-top') + '{flex-wrap:wrap;gap:8px}',

    // ── Aksturslisti ───────────────────────────────────────────────────────
    trio('#view-aksturslisti [style*="max-width:1000px"]') +
      '{max-width:none!important;padding:12px 10px 48px!important}',
    trio('#view-aksturslisti [style*="flex:1 1 220px"]') +
      '{flex:1 1 100%!important;min-width:0!important;max-width:100%!important}',
    trio('#view-aksturslisti [style*="flex:1 1 160px"]') +
      '{flex:1 1 100%!important;min-width:0!important}',
    trio('#view-aksturslisti #_al-map') + '{height:220px!important}',

    // ── Verkdagbók (media-query stacks miss Sími-on-wide-window) ───────────
    trio('#view-verkdagbok .vd-meta-row') + '{grid-template-columns:1fr!important}',
    trio('#view-verkdagbok .vd-card') + '{grid-template-columns:auto 1fr!important}',
    trio('#view-verkdagbok .vd-actions') +
      '{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;gap:6px;padding-top:8px}',
    trio('#view-verkdagbok .vd-actions button') + '{flex:1 1 auto;min-height:40px}',
    trio('#view-verkdagbok .vd-eq-row') + ',' + trio('#view-verkdagbok .vd-eq-head') +
      '{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) 40px 40px!important}',

    // ── Skipulagsborð — 4 desktop cells clip on 390px ──────────────────────
    trio('#vb-skipulag .sb-grid') + '{grid-template-columns:1fr 1fr!important;gap:6px}',
    trio('#vb-skipulag .sb-slot') + '{min-height:72px}',

    // ── Bílstjóri hub overlay ──────────────────────────────────────────────
    trio('#view-bilstjori') +
      '{margin-left:0!important;width:100%!important;max-width:100%!important;left:0!important}',
    'body.bs-active #_mnav_btn,body.bs-active #_mnav_bd{display:none!important}',

    // ── Brunakerfi yfirlit (Öpp home): 261 50px hammer on filter chips ─────
    trio('#view-brunakerfi-yfirlit ._bky-filter') + ',' +
    trio('#view-brunakerfi-yfirlit ._bky-month') + ',' +
    trio('#view-brunakerfi-yfirlit ._bky-viewbtn') +
      '{min-height:36px!important;padding-top:6px!important;padding-bottom:6px!important;font-size:13px!important}',
    trio('#view-brunakerfi-yfirlit [style*="max-width:1280px"]') +
      '{max-width:none!important;padding:12px 10px 48px!important}',
    trio('#view-brunakerfi-yfirlit [style*="display:flex;gap:12px;flex-wrap:wrap"]') +
      '{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}'
  ].join('\n');

  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css;
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }
  mountCss();

  // ?app=<key> (legacy) and /app/<key>/ (PWA) — same ACTIVE as patch 261.
  const APP_KEYS = { fjarmal: 1, verkefni: 1, brunaholf: 1, brunakerfi: 1, boss: 1, bilstjori: 1 };
  function activeAppKey() {
    try {
      const pm = (location.pathname || '').match(/^\/app\/([a-z]+)\/?/);
      const v = pm ? pm[1] : new URLSearchParams(location.search).get('app');
      return (v && APP_KEYS[v]) ? v : null;
    } catch (_) { return null; }
  }
  function markAppMode() {
    const key = activeAppKey();
    if (!key) return;
    try {
      document.body.classList.add('appmode');
      document.body.setAttribute('data-app', key);
      document.documentElement.dataset.viewmode = 'mobile';
      document.dispatchEvent(new CustomEvent('slokk-viewmode', { detail: 'mobile' }));
    } catch (_) {}
  }
  if (document.body) markAppMode();
  else document.addEventListener('DOMContentLoaded', markAppMode);
  // 261 buildShell adds .appmode later — stamp data-app when it lands.
  const mo = new MutationObserver(function () {
    if (document.body && document.body.classList.contains('appmode')) {
      const key = activeAppKey();
      if (key && document.body.getAttribute('data-app') !== key) document.body.setAttribute('data-app', key);
    }
  });
  try { mo.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] }); } catch (_) {}
  document.addEventListener('slokk-viewmode', mountCss);

  // #opp: 261 creates #view-opp lazily in viewEl(). 218 applyHash bails when
  // the node is missing (~1.9s window), then sala.js / 154 land on #sala.
  // Stub the view immediately so 218 can switchView, and re-assert the
  // launcher for 12s (same window as 261's app-home lock). No pushState —
  // 277 already turns replaceState into back entries after user gestures.
  function stubOppView() {
    if (document.getElementById('view-opp')) return;
    const v = document.createElement('div');
    v.id = 'view-opp';
    v.className = 'view';
    const anchor = document.getElementById('view-counter') || document.querySelector('.view');
    if (anchor && anchor.parentNode) anchor.parentNode.appendChild(v);
    else (document.body || document.documentElement).appendChild(v);
  }
  function hashIsOpp() {
    try { return (location.hash || '').replace(/^#/, '') === 'opp'; } catch (_) { return false; }
  }
  const wantOpp = hashIsOpp();
  let oppUser = false;
  ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(function (evt) {
    window.addEventListener(evt, function () { oppUser = true; }, { capture: true, passive: true });
  });
  function openOpp() {
    stubOppView();
    try {
      if (window.AppProfiles && typeof AppProfiles.open === 'function') AppProfiles.open();
      else if (window.App && typeof App.switchView === 'function') App.switchView('opp');
      if (!hashIsOpp()) history.replaceState(null, '', '#opp');
    } catch (_) {}
  }
  function oppIsActive() {
    const v = document.getElementById('view-opp');
    return !!(v && v.classList.contains('active') && hashIsOpp());
  }
  function holdOpp() {
    if (!wantOpp) return;
    stubOppView();
    const until = Date.now() + 12000;
    (function tick() {
      if (oppUser) return;
      if (Date.now() > until) return;
      if (!oppIsActive()) openOpp();
      setTimeout(tick, 200);
    })();
  }
  window.addEventListener('hashchange', function () {
    if (hashIsOpp()) openOpp();
  });
  stubOppView();
  if (document.body) holdOpp();
  else document.addEventListener('DOMContentLoaded', holdOpp);

  window.SimiBoards = { installed: true, activeAppKey: activeAppKey, mountCss: mountCss, openOpp: openOpp };
})();
