/* === 469 — „🏷 Verðlisti" á Vörur og þjónusta (14.10.2026) =====================================================
 *
 * Agnar 14.10.2026 (skjáskot af Brunakerfis skoðun með Verðlista-takkann hringaðan): „Geturðu látið verðlistann
 * með tengingum hjá brunakerfi skoðun vera sýnilegan líka inn á vörur og þjónusta síðunni efst til hægri" — og um
 * gluggann sem er þar fyrir (410 „Brunak. verð"): „Það er eitthvað þar. En get ekki breytt neinu þar."
 *
 * 410-glugginn sýnir hvaða búnaðarlínu hver liður telur en er lesglugginn. Ritillinn sem takkinn í Brunakerfis
 * skoðun (274 #_bkc-vlist) og yfirlitið (273 #_bks-vl-btn) opna er BrunakerfiSkyrsla.openPriceEditor — þar má breyta
 * heitum, verðum og tengingum (link) og listinn vistast í app_settings fyrir allar vélar. Þessi pappi setur SAMA takka
 * lengst til hægri í verkfæraröð síðuhaussins á Vörur og þjónusta.
 *
 * vorur.js teiknar síðuna með innerHTML (renderView) — takkinn er settur inn aftur í hvert sinn sem röðin birtist án
 * hans, í sama rAF-tifi og vaktin sér breytinguna (fyrir málun). vorur.js á röðina; þessi pappi á aðeins takkann.
 */
(() => {
  'use strict';
  if (window.VorurVerdlisti) return;
  const ID = '_vv-verdlisti';
  function setja() {
    const v = document.getElementById('view-vorur'); if (!v) return;
    const rod = v.querySelector('.page-title__tools'); if (!rod || rod.querySelector('#' + ID)) return;
    const b = document.createElement('button');
    b.id = ID; b.type = 'button'; b.className = 'vorur-teng';
    b.title = 'Verðlisti brunakerfis-skoðana — sami ritill og í Brunakerfis skoðun: heiti, verð og tengingar við vörulínur, vistast fyrir allar vélar';
    b.style.cssText = 'background:#fff;color:#334155;border:1px solid #cbd5e1;padding:9px 13px;border-radius:9px;font-family:\'Space Grotesk\',system-ui,sans-serif;font-weight:700;cursor:pointer;font-size:12.5px;display:inline-flex;align-items:center;gap:6px';
    b.textContent = '🏷 Verðlisti';
    b.addEventListener('click', () => {
      if (window.BrunakerfiSkyrsla && BrunakerfiSkyrsla.openPriceEditor) BrunakerfiSkyrsla.openPriceEditor(null);
      else if (window.Toast && Toast.show) Toast.show('Verðlistaritillinn (273) er ekki hlaðinn');
    });
    rod.appendChild(b);
  }
  function schedule() { if (schedule.q) return; schedule.q = true; requestAnimationFrame(() => { schedule.q = false; try { setja(); } catch (e) { console.error('[469]', e); } }); }
  // Vaktin er á body, ekki á #view-vorur: vorur.js/00-legacy geta búið hnútinn til á ný (mælt 14.10: vakt á gamla
  // hnútnum sá aldrei teikninguna — setja() handvirkt virkaði). Púls á 1,5 s er öryggisnetið (ódýr: hættir strax sé takkinn til).
  (function watch() {
    if (!document.body) { setTimeout(watch, 200); return; }
    new MutationObserver(ms => { for (const m of ms) { const t = m.target; if (t && t.closest && t.closest('#' + ID)) continue; schedule(); return; } }).observe(document.body, { childList: true, subtree: true });
    setja();
  })();
  setInterval(() => { if (!document.hidden) { try { setja(); } catch (_) {} } }, 1500);
  window.VorurVerdlisti = { setja };
})();
