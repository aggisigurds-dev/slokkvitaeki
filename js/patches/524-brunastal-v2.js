/* === BRUNASTÁL V2 — bakgrunnur í Stílstjóra (22.11.2026) ===
 *
 * Agnar: bakgrunnur á einum stað, í Stílstjóranum, ekki deploya.
 * C|V2-rofi í Sýn-röndinni var rangur staður og sást/virkaði ekki.
 *
 * Einn staður: Stílstjóri → Bakgrunnar → „V2 Brunastál".
 * 262 addBg + bakgrunnur málar `.view` svo 230/245 hylja hann ekki.
 */
(() => {
  if (window.BrunastalV2) return;

  const NAFN = 'V2 Brunastál';
  const CSS = 'url(/img/bstal-v2/stal.jpg) center/cover no-repeat #071018';

  function skra() {
    try {
      if (window.PageEditor && typeof PageEditor.addBg === 'function') {
        PageEditor.addBg(NAFN, CSS);
      }
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', skra);
  else skra();

  window.BrunastalV2 = { skra, NAFN, CSS };
})();
