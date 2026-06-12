/* === COMPANY DETAIL SETTLE VEIL v1 ===
 *
 * Todoist „Overlapping loads": fyrirtækjasíðan sýndi „margar útgáfur" í
 * ~3 sek við opnun — grunntaflan teiknast fyrst og síðan endurmála nokkrir
 * patchar hana hver í sinni umferð (Áætlað dálkur 131, Í vinnslu 191,
 * Umfylling í legacy, Teikning 300ms, memo-box, verðlistar …) á tímurum.
 *
 * Þetta lagar EINKENNIÐ án þess að hrófla við umferðunum sjálfum: þegar
 * Companies.openDetail keyrir leggst létt „Hleður…" slæða yfir
 * #companies-main og lyftist EINU SINNI þegar DOM-ið hefur verið kjurrt í
 * 450ms (eða í síðasta lagi eftir 3,5 sek). Notandinn sér eina kláraða
 * útgáfu í stað samsetningarinnar. One-shot: periodísk smá-mutations
 * (tagZeros o.fl.) endurvekja ekki slæðuna.
 *
 * Full sameining á render-flæðinu í eina umferð er áfram sérverkefni —
 * þessi patch er brúin þangað til.
 */
(() => {
  if (window.__coDetailSettleInstalled) return;
  window.__coDetailSettleInstalled = true;

  const QUIET_MS = 450;   // svona lengi þarf DOM-ið að vera kjurrt
  const CAP_MS   = 3500;  // aldrei lengur en þetta — slæðan lyftist alltaf

  function veil() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const old = document.getElementById('_co-settle-veil');
    if (old) old.remove();
    if (getComputedStyle(main).position === 'static') main.style.position = 'relative';

    const ov = document.createElement('div');
    ov.id = '_co-settle-veil';
    ov.style.cssText = 'position:absolute;inset:0;background:rgba(248,250,252,.96);z-index:60;' +
      'display:flex;align-items:flex-start;justify-content:center;padding-top:90px;' +
      'color:#94a3b8;font:13px system-ui,sans-serif;transition:opacity .25s ease';
    ov.innerHTML = '<div style="display:flex;align-items:center;gap:9px">' +
      '<div style="width:16px;height:16px;border:2px solid #cbd5e1;border-top-color:#475569;border-radius:50%;animation:_cosv .7s linear infinite"></div>' +
      'Hleður…</div>';
    if (!document.getElementById('_cosv-anim')) {
      const st = document.createElement('style');
      st.id = '_cosv-anim';
      st.textContent = '@keyframes _cosv{to{transform:rotate(360deg)}}';
      document.head.appendChild(st);
    }
    main.appendChild(ov);

    let t = null, done = false;
    const mo = new MutationObserver(() => {
      if (done) return;
      // Renderers sem endursetja innerHTML þurrka slæðuna út — setjum hana
      // strax aftur svo samsetningin haldist hulin.
      if (!ov.isConnected) main.appendChild(ov);
      arm();
    });
    function lift() {
      if (done) return;
      done = true;
      try { mo.disconnect(); } catch (_) {}
      ov.style.opacity = '0';
      setTimeout(() => { try { ov.remove(); } catch (_) {} }, 280);
    }
    function arm() { clearTimeout(t); t = setTimeout(lift, QUIET_MS); }
    mo.observe(main, { childList: true, subtree: true });
    arm();
    setTimeout(lift, CAP_MS);
  }

  function hook() {
    const C = window.Companies;
    if (!C || typeof C.openDetail !== 'function') return false;
    if (C.openDetail._settleVeil) return true;
    const orig = C.openDetail;
    const wrapped = function (id) {
      const r = orig.apply(this, arguments);
      try { veil(); } catch (_) {}
      return r;
    };
    wrapped._settleVeil = true;
    // Patch 163 hefur breytt openDetail í accessor sem stimplar flögg á
    // nýjar úthlutanir — venjuleg úthlutun virkar í gegnum setterinn.
    C.openDetail = wrapped;
    return true;
  }

  let tries = 0;
  (function tryHook() {
    if (hook()) { console.log('[co-settle-veil] installed'); return; }
    if (++tries < 40) setTimeout(tryHook, 400);
  })();
})();
/* === END COMPANY DETAIL SETTLE VEIL === */
