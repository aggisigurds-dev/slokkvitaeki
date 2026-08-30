/* === SÍMI/SKJÁR + ZOOM: SMÁTT CHROME (334) =================================
 *
 * Agnar 2026-08-30: Sími | Tafla | Skjár og hard − / % / + / 1:1 voru
 * „toooo f bigg" á Android. Hvítu pilla-takkarnir huldu borðann og átu
 * toppinn á hverri síðu (75% / 62% / 30% zoom).
 *
 * Orsakir (óbreyttar í 331/333):
 *   1. 261 `body.appmode .view button` → 50px + padding 12px !important
 *      blés Ársskoðunar-rofanum (#_ars-sjon) upp.
 *   2. 333 setur inverse CSS-zoom á #_app-zoom (1/scale) svo takkarnir
 *      haldist þrýstanlegir. Á Android er position:fixed UTAN html-zoom,
 *      svo 30% → zoom 3.33 á borðanum = risapillur yfir hamborgaranum.
 *
 * Þessi pappi snertir AÐEINS sjónræna stærð. Engin 153/187-reikningur.
 * Engin zoom-gildi, localStorage né skrun-rök frá 331/333.
 * ========================================================================== */
(() => {
  if (window.__simiSkjarZoomCompact334) return;
  window.__simiSkjarZoomCompact334 = true;

  const STYLE_ID = 'simi-skjar-zoom-compact-334';
  const P = ':not(#_p334a):not(#_p334b):not(#_p334c)';

  function css() {
    return [
      /* ── Ársskoðun Sími | Tafla | Skjár: þéttur segmented, ~30px ───────── */
      '#_ars-sjon#_ars-sjon' + P + ',' +
      'body.appmode #view-arsskodun #_ars-sjon' + P + ',' +
      'html[data-viewmode="mobile"] #view-arsskodun #_ars-sjon' + P +
        '{flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px;' +
         'padding:3px 148px 3px 6px;margin:0;min-height:0;' +
         'box-sizing:border-box}',
      '#_ars-sjon#_ars-sjon ._ars-sjon-modes' + P +
        '{flex:1 1 auto;min-width:0;align-items:stretch}',
      '#_ars-sjon#_ars-sjon ._ars-sjon-modes>button' + P + ',' +
      'body.appmode #view-arsskodun #_ars-sjon ._ars-sjon-modes>button' + P + ',' +
      'html[data-viewmode="mobile"] #view-arsskodun #_ars-sjon button' + P + ',' +
      'body.appmode #view-arsskodun#view-arsskodun #_ars-sjon button' + P +
        '{flex:1;min-height:30px!important;height:30px!important;max-height:32px;' +
         'margin:0;padding:0 8px!important;padding-top:0!important;padding-bottom:0!important;' +
         'font-size:12px!important;font-weight:700;line-height:30px!important;' +
         'border-radius:0;box-sizing:border-box}',
      '#_ars-sjon#_ars-sjon ._ars-sjon-modes>button:first-child' + P +
        '{border-radius:7px 0 0 7px}',
      '#_ars-sjon#_ars-sjon ._ars-sjon-modes>button:last-child' + P +
        '{border-radius:0 7px 7px 0}',
      '#_ars-sjon#_ars-sjon ._ars-sjon-zoom' + P +
        '{flex:1 1 100%;gap:4px;min-height:0}',
      '#_ars-sjon#_ars-sjon ._ars-sjon-zoom>button' + P + ',' +
      'body.appmode #view-arsskodun #_ars-sjon ._ars-sjon-zoom>button' + P +
        '{min-height:28px!important;height:28px!important;max-height:32px;' +
         'min-width:0;padding:0 10px!important;padding-top:0!important;padding-bottom:0!important;' +
         'font-size:12px!important;line-height:28px!important;border-radius:7px}',

      /* ── Hard − / % / + / 1:1: mjó stika, ekki risapillur yfir borða ─────
         zoom:1 !important drepur inverse-zoom 333 (inline án !important). */
      '#_app-zoom#_app-zoom' + P +
        '{zoom:1!important;top:calc(env(safe-area-inset-top,0px) + 56px);right:6px;' +
         'left:auto;height:30px;min-height:30px;max-height:32px;' +
         'display:flex;align-items:center;gap:2px;padding:1px;' +
         'border-radius:8px;box-shadow:0 2px 8px -4px rgba(15,23,42,.35);' +
         'background:rgba(255,255,255,.96);box-sizing:border-box}',
      '#_app-zoom#_app-zoom>button' + P +
        '{flex:0 0 auto;min-width:28px!important;width:28px;min-height:28px!important;height:28px!important;' +
         'max-height:28px;margin:0;padding:0!important;padding-top:0!important;padding-bottom:0!important;' +
         'border-radius:6px;font:700 14px/28px system-ui,sans-serif;box-sizing:border-box}',
      '#_app-zoom#_app-zoom>button#_app-zoom-reset' + P +
        '{min-width:30px!important;width:auto;padding:0 5px!important;font-size:10px!important;line-height:28px}',
      '#_app-zoom#_app-zoom #_app-zoom-pct' + P +
        '{flex:0 0 auto;min-width:28px;font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace}',

      /* Skjáborð 1440: fela nema zoom ≠ 1 (sama og 333). Ekki stækka. */
      '@media (min-width:1100px) and (pointer:fine){' +
        '#_app-zoom#_app-zoom:not(.on){display:none!important}' +
        '#_ars-sjon#_ars-sjon{padding-right:6px}' +
      '}'
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

  /* 333 skrifar inline zoom á borðann í hvert sinn. CSS !important vinnur,
     en við núllstillum líka svo getBoundingClientRect sé ekki villandi. */
  function pinZoomChrome() {
    const bar = document.getElementById('_app-zoom');
    if (!bar) return;
    try { bar.style.zoom = '1'; } catch (_) {}
  }

  function wrapApply() {
    try {
      const api = window.AppPageZoom;
      if (!api || typeof api.set !== 'function' || api.set.__compact334) return false;
      const orig = api.set;
      function wrapped() {
        const r = orig.apply(this, arguments);
        pinZoomChrome();
        return r;
      }
      wrapped.__compact334 = true;
      api.set = wrapped;
      return true;
    } catch (_) { return false; }
  }

  function boot() {
    mountCss();
    pinZoomChrome();
    wrapApply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [200, 800, 2000].forEach(ms => setTimeout(boot, ms));

  document.addEventListener('click', ev => {
    const t = ev && ev.target;
    if (t && t.closest && t.closest('#_app-zoom')) {
      setTimeout(pinZoomChrome, 0);
      setTimeout(pinZoomChrome, 40);
    }
  }, true);

  window.SimiSkjarZoomCompact = { version: '334' };
  console.log('[patch-334] simi/skjar zoom compact chrome');
})();
/* === END SÍMI/SKJÁR ZOOM COMPACT === */
