/* === ÁRSSKOÐUN: SÍMI LÆSILEGT + SKJÁR Á RAUNSÍMA MEÐ ZOOM (331) =============
 *
 * Agnar 2026-08-29: heimilisfang á Skjár/síma braut sig í EINN STAF per línu
 * („208 Lundi 9, 200 Kópavogi" → 20 / 8 / Lu / n / di …). Skjár-rofinn í
 * borðanum sat oft í x=433, utan 390px skjás. Hann vildi (a) lesanlegt Sími
 * og (b) „just in case" fulla skjáborðstöflu á RAUNSÍMANUM með pinch-zoom
 * og skruni.
 *
 * Þessi pappi:
 *   1. Sími|Tafla|Skjár rofi INNI Á Ársskoðun (sticky, alltaf á 390px).
 *   2. localStorage.arsskodun_viewmode = sími|tafla|skjár — helst eftir reload.
 *      153 les þetta á undan html[data-viewmode], svo appmode getur ekki
 *      þvingað mrows til baka.
 *   3. Skjár/Tafla á coarse/þröngum glugga = FULLSÍÐU skjáborðstafla
 *      (100vw, min-width ~1100px, overflow auto á báðum ásum, pinch-zoom).
 *   4. Viewport-meta leyfir zoom í Skjár/Tafla; Sími fær fyrra viewport til baka.
 *   5. Drepa break-all / overflow-wrap:anywhere á heimilisfangi.
 *   6. Hönnunarhamur má ekki éta allan símann — max 32vh.
 *
 * 153/187-reikningur er ÓSNERT. 320/318 rammi er ekki forsenda — þetta gildir
 * á alvöru síma. Aldrei isPhone→card.
 * ========================================================================== */
(() => {
  if (window.__arsPhoneSkjar331) return;
  window.__arsPhoneSkjar331 = true;

  const LS = 'arsskodun_viewmode';
  const STYLE_ID = 'ars-phone-skjar-331';
  const BAR_ID = '_ars-sjon';
  const VIEW_ID = 'view-arsskodun';
  const P = ':not(#_p331a):not(#_p331b):not(#_p331c)';
  const ZOOM = 'width=device-width, initial-scale=1, minimum-scale=0.25, maximum-scale=5, user-scalable=yes, viewport-fit=cover';
  const MAP = {
    simi: 'mobile', mobile: 'mobile',
    tafla: 'table', table: 'table',
    skjar: 'desktop', desktop: 'desktop'
  };
  const STORE = { mobile: 'sími', table: 'tafla', desktop: 'skjár' };

  function fold(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function parse(raw) {
    const k = fold(raw);
    return MAP[k] || null;
  }
  function readStored() {
    try { return parse(localStorage.getItem(LS)); } catch (_) { return null; }
  }
  function writeStored(mode) {
    try { localStorage.setItem(LS, STORE[mode] || 'sími'); } catch (_) {}
  }
  function get() {
    const stored = readStored();
    if (stored) return stored;
    const m = document.documentElement.dataset.viewmode;
    return (m === 'mobile' || m === 'table' || m === 'desktop') ? m : 'mobile';
  }
  function isPhoneLike() {
    try {
      if (typeof window.SlokkIsPhoneDevice === 'function' && window.SlokkIsPhoneDevice()) return true;
    } catch (_) {}
    try {
      const short = Math.min(screen.width || 0, screen.height || 0);
      if (short > 0 && short <= 500) return true;
      if ((navigator.maxTouchPoints || 0) > 1 && short > 0 && short <= 700) return true;
    } catch (_) {}
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
      if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return true;
    } catch (_) {}
    return (window.innerWidth || 0) <= 900;
  }
  function arsActive() {
    const v = document.getElementById(VIEW_ID);
    return !!(v && v.classList.contains('active') && v.style.display !== 'none');
  }
  function wantsWide(mode) {
    return mode === 'desktop' || mode === 'table';
  }

  /* ── Viewport: pinch-zoom í Skjár/Tafla, fyrra gildi í Sími ─────────────── */
  let _vpSaved = null;
  function vpEl() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.setAttribute('name', 'viewport');
      (document.head || document.documentElement).appendChild(vp);
    }
    return vp;
  }
  function enableZoom() {
    const vp = vpEl();
    const cur = vp.getAttribute('content') || '';
    if (cur !== ZOOM) {
      if (_vpSaved == null) _vpSaved = cur;
      vp.setAttribute('content', ZOOM);
    }
  }
  function restoreZoom() {
    const vp = vpEl();
    if (_vpSaved != null) {
      vp.setAttribute('content', _vpSaved);
      _vpSaved = null;
      return;
    }
    /* Sími á raunsíma: 166 lockPhoneViewport án user-scalable=no. */
    try {
      if (typeof window.SlokkIsPhoneDevice === 'function' && window.SlokkIsPhoneDevice()) {
        const short = Math.min(screen.width || 0, screen.height || 0);
        if (short >= 320 && short <= 700) {
          vp.setAttribute('content', 'width=' + short + ', initial-scale=1, viewport-fit=cover');
          return;
        }
      }
    } catch (_) {}
    vp.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
  }
  function syncViewport(mode) {
    if (!arsActive()) { restoreZoom(); return; }
    if (wantsWide(mode) && isPhoneLike()) enableZoom();
    else restoreZoom();
  }

  function stampHtml(mode) {
    try {
      document.documentElement.dataset.arsSjon = mode;
      document.documentElement.classList.toggle('ars-wide-table', wantsWide(mode) && isPhoneLike());
    } catch (_) {}
  }

  function paintBar(mode) {
    const bar = document.getElementById(BAR_ID);
    if (!bar) return;
    bar.querySelectorAll('[data-ars-sjon]').forEach(b => {
      const on = parse(b.getAttribute('data-ars-sjon')) === mode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setMode(mode, rerender) {
    mode = parse(mode) || 'mobile';
    writeStored(mode);
    stampHtml(mode);
    paintBar(mode);
    syncViewport(mode);
    /* Á síma breytum við EKKI html[data-viewmode]: 166/mobilenav myndu
       þá sýna skjáborðs-hliðarstiku (220px) og klemma töfluna. Chrome-ið
       helst síma; innihaldið er tafla vegna arsskodun_viewmode. */
    try {
      if (!isPhoneLike() && window.SlokkViewMode && typeof window.SlokkViewMode.apply === 'function') {
        window.SlokkViewMode.apply(mode, false);
      }
    } catch (_) {}
    if (rerender !== false) {
      try {
        if (window.Arsskodun && typeof window.Arsskodun.render === 'function') {
          window.Arsskodun.render();
        }
      } catch (_) {}
    }
  }

  /* ── Sticky Sími | Tafla | Skjár á sjálfri síðunni ─────────────────────── */
  function buildBar() {
    const wrap = document.createElement('div');
    wrap.id = BAR_ID;
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Sýn: Sími, Tafla eða Skjár');
    wrap.innerHTML =
      '<button type="button" data-ars-sjon="sími" title="Sími — listi sem passar á símann">Sími</button>' +
      '<button type="button" data-ars-sjon="tafla" title="Tafla — þétt skjáborðstafla, pinch-zoom og skrun">Tafla</button>' +
      '<button type="button" data-ars-sjon="skjár" title="Skjár — full skjáborðstafla, pinch-zoom og skrun">Skjár</button>';
    wrap.querySelectorAll('[data-ars-sjon]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        setMode(b.getAttribute('data-ars-sjon'), true);
      });
    });
    return wrap;
  }
  function ensureBar() {
    const v = document.getElementById(VIEW_ID);
    if (!v) return;
    let bar = document.getElementById(BAR_ID);
    if (!bar) bar = buildBar();
    const main = v.querySelector('#ars-main');
    if (bar.parentNode !== v || (main && bar.nextElementSibling !== main && bar !== v.firstElementChild)) {
      v.insertBefore(bar, main || v.firstChild);
    }
    paintBar(get());
  }

  function css() {
    const V = '#view-arsskodun#view-arsskodun ';
    const W = 'html.ars-wide-table ';
    return [
      /* Rofi — falinn á breiðum músarskjá (borðinn dugar). Sýnilegur á síma. */
      '#' + BAR_ID + '{display:none;position:sticky;top:0;z-index:40;align-items:stretch;gap:0;'
        + 'margin:0;padding:6px 8px;background:var(--ars-grunnur,#f0eeea);'
        + 'border-bottom:1px solid var(--ars-rammi,#e3e1dc);box-sizing:border-box}',
      'html.slokk-phone-dev #' + BAR_ID + ',html.ars-wide-table #' + BAR_ID
        + '{display:flex!important}',
      '@media (max-width:900px){#' + BAR_ID + '{display:flex!important}}',
      '@media (pointer:coarse){#' + BAR_ID + '{display:flex!important}}',
      '#' + BAR_ID + '>button{flex:1;min-height:40px;margin:0;padding:8px 6px;border:1px solid #cfd4dc;'
        + 'background:#fff;color:#334155;font:inherit;font-size:13px;font-weight:700;cursor:pointer;'
        + 'touch-action:manipulation}',
      '#' + BAR_ID + '>button:first-child{border-radius:9px 0 0 9px}',
      '#' + BAR_ID + '>button:last-child{border-radius:0 9px 9px 0}',
      '#' + BAR_ID + '>button+button{border-left:0}',
      '#' + BAR_ID + '>button.on{background:#1d4ed8;border-color:#1d4ed8;color:#fff}',

      /* Heimili: ALDREI staf-per-línu. */
      V + '._addr' + P + ',' + V + '._ars-ca' + P + ',' + V + '._arsm-addr' + P + ','
        + V + '._co' + P + ',' + V + '._ars-addrcell' + P
        + '{overflow-wrap:break-word!important;word-break:normal!important;hyphens:manual;'
        + 'white-space:normal!important;writing-mode:horizontal-tb!important}',
      V + '._ars-addrcell' + P + '{min-width:180px!important;width:auto!important}',
      V + '._arsm-name' + P + '{overflow:visible!important;min-width:var(--ars-nafn-dalkur,190px)!important}',

      /* Skjár/Tafla á síma: full síða, taflan má ekki krammast í 1ch.
         328 setur overflow-y:hidden + overflow-x:clip á síma-viewmode — við
         höldum data-viewmode=mobile á raunsíma (hliðarstika), svo þessar
         reglur verða að slá 328. */
      W + '#view-arsskodun' + P + ','
        + W + '#view-arsskodun.view.active' + P + ','
        + 'html.ars-wide-table[data-viewmode="mobile"] #view-arsskodun' + P
        + '{width:100vw!important;max-width:100vw!important;margin-left:0!important;'
        + 'padding-left:0!important;padding-right:0!important;box-sizing:border-box!important;'
        + '--sidebar-w:0px;overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + 'touch-action:pan-x pan-y pinch-zoom!important}',
      W + '#view-arsskodun #ars-main' + P + ','
        + W + '#view-arsskodun #ars-main.main-panel' + P
        + '{width:100%!important;max-width:none!important;overflow:visible!important}',
      W + '#view-arsskodun ._ars-tblscroll' + P + ','
        + W + '#view-arsskodun .data-table-scroll' + P + ','
        + W + '#view-arsskodun .data-table-wrap' + P + ','
        + 'html.ars-wide-table[data-viewmode="mobile"] #view-arsskodun ._ars-tblscroll' + P + ','
        + 'html.ars-wide-table[data-viewmode="mobile"] #view-arsskodun .data-table-scroll' + P
        + '{width:100%!important;max-width:100vw!important;min-width:0!important;'
        + 'max-height:calc(100dvh - 140px)!important;height:calc(100dvh - 140px)!important;'
        + 'overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + '-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom!important;'
        + 'overscroll-behavior:contain}',
      W + '#view-arsskodun table.data-table' + P + ','
        + W + '#view-arsskodun ._ars-tblscroll>table' + P
        + '{display:table!important;min-width:1100px!important;width:max-content!important;'
        + 'max-width:none!important;table-layout:fixed!important;overflow:visible!important}',
      W + '#view-arsskodun table.data-table th' + P + ','
        + W + '#view-arsskodun table.data-table td' + P
        + '{word-break:normal!important;overflow-wrap:break-word!important;'
        + 'white-space:normal!important}',
      W + '#view-arsskodun ._ars-addrcell' + P
        + '{min-width:180px!important;max-width:none!important}',
      'html.ars-wide-table,html.ars-wide-table body{overflow-x:auto!important;touch-action:pan-x pan-y pinch-zoom}',
      /* Sími-listi: nafndálkur má ekki krammast (330 max-width:100% + min-width:0). */
      V + '._arsm-row' + P + '{width:max-content!important}',
      V + '._arsm-name' + P
        + '{width:var(--ars-nafn-dalkur,190px)!important;max-width:var(--ars-nafn-dalkur,190px)!important}',

      /* Hönnunarhamur: ekki éta allan símann svo listinn sjáist áfram. */
      'html.slokk-phone-dev #_hh-panel,#_hh-panel' + P
        + '{max-height:32vh!important}',
      '@media (max-width:900px){#_hh-panel{max-height:32vh!important}}',
      'html[data-viewmode="mobile"] #pe-panel:not(.pe-framed),'
        + 'body.appmode #pe-panel:not(.pe-framed)'
        + '{max-height:32vh!important}'
    ].join('\n');
  }

  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css();
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }

  function applyNow(rerender) {
    const mode = get();
    stampHtml(mode);
    ensureBar();
    paintBar(mode);
    syncViewport(mode);
    if (rerender) {
      try {
        if (window.Arsskodun && typeof window.Arsskodun.render === 'function' && arsActive()) {
          window.Arsskodun.render();
        }
      } catch (_) {}
    }
  }

  /* Banner-rofinn: samstilla LS aðeins þegar notandi velur sjálfur og
     appmode er ekki að þvinga mobile. */
  document.addEventListener('slokk-viewmode', ev => {
    const inApp = !!(document.body && document.body.classList.contains('appmode'));
    const detail = ev && ev.detail;
    if (!inApp && parse(detail)) {
      writeStored(parse(detail));
    }
    applyNow(false);
  });

  ['hashchange', 'popstate', 'pageshow'].forEach(ev =>
    window.addEventListener(ev, () => setTimeout(() => applyNow(false), 0)));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyNow(false);
  });

  mountCss();
  function boot() {
    mountCss();
    applyNow(false);
    ensureBar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [400, 1200, 3000].forEach(ms => setTimeout(boot, ms));

  new MutationObserver(() => {
    clearTimeout(window.__ars331t);
    window.__ars331t = setTimeout(() => { ensureBar(); stampHtml(get()); }, 200);
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.ArsSjon = { get, set: setMode, enableZoom, restoreZoom, version: '331' };
  console.log('[patch-331] arsskodun phone skjar/zoom');
})();
/* === END ÁRSSKOÐUN SÍMI/SKJÁR ZOOM === */
