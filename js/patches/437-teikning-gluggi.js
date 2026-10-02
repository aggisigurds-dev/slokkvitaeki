/* === TEIKNING: STÆRRI GLUGGI, TEIKNINGIN FÆR SKJÁINN (437) =================
 *
 * Agnar 02.10.2026: teikningin nýttist illa — „örugglega bara á sirka 20% af
 * heildarskjánum". Má stækka heildargluggann alveg vel.
 *
 * Rótin er ekki myndin sjálf. #modal-floorplan ER bakgrunnurinn
 * (.modal.open { inset:0; align-items:center }) og börnin .modal-hd/.bd/.ft
 * eru læst á 560 px (app.css). 383 sleppir 560 með width:auto, en þá
 * skreppur spjaldið að innihaldinu. FloorPlan.open setur 92vw/1200px á
 * bakgrunninn — inset:0 hunsaði það. Hér fyllir spjaldið næstum skjáinn
 * og teikningin (#fp-main) fær restina; tækjaræman þrengist, hún hverfur ekki.
 * ========================================================================== */
(() => {
  if (window.TeiknGluggi) return;

  const CSS =
    '#modal-floorplan.modal.open{padding:10px!important;align-items:stretch!important;justify-content:stretch!important}' +
    '#modal-floorplan.modal.open>.modal-hd,#modal-floorplan.modal.open>.modal-bd,#modal-floorplan.modal.open>.modal-ft' +
      '{width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}' +
    '#modal-floorplan.modal.open>.modal-hd{padding:8px 14px!important;flex:0 0 auto!important;min-height:0!important}' +
    '#modal-floorplan.modal.open>.modal-hd h2+div{display:none!important}' +
    '#modal-floorplan.modal.open>.modal-bd{flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow:hidden!important;display:flex!important}' +
    '#modal-floorplan.modal.open>.modal-ft{padding:8px 14px!important;flex:0 0 auto!important}' +
    '#modal-floorplan:not(.fp-simi) #fp-main{flex:1 1 auto!important;min-width:0!important;min-height:0!important}' +
    '#modal-floorplan:not(.fp-simi) #fp-panel{width:168px!important;flex:0 0 168px!important;max-width:168px!important}' +
    '#modal-floorplan.fp-simi{padding:0!important}' +
    '#modal-floorplan #fp-canvas{max-width:100%;max-height:100%}';

  function still() {
    let st = document.getElementById('fp-gluggi-css');
    if (!st) {
      st = document.createElement('style');
      st.id = 'fp-gluggi-css';
    }
    if (st.textContent !== CSS) st.textContent = CSS;
    if (st.parentNode !== document.head || st !== document.head.lastElementChild) document.head.appendChild(st);
  }

  function setImp(el, prop, val) {
    if (!el) return;
    el.style.setProperty(prop, val, 'important');
  }

  function beita() {
    const m = document.getElementById('modal-floorplan');
    if (!m || !m.isConnected) return false;
    still();
    const simi = m.classList.contains('fp-simi');
    setImp(m, 'inset', '0');
    setImp(m, 'width', 'auto');
    setImp(m, 'max-width', 'none');
    setImp(m, 'height', 'auto');
    setImp(m, 'max-height', 'none');
    setImp(m, 'padding', simi ? '0' : '10px');
    setImp(m, 'align-items', 'stretch');
    setImp(m, 'justify-content', 'stretch');
    setImp(m, 'display', 'flex');
    setImp(m, 'flex-direction', 'column');
    setImp(m, 'box-sizing', 'border-box');

    const hd = m.querySelector(':scope > .modal-hd');
    const bd = m.querySelector(':scope > .modal-bd');
    const ft = m.querySelector(':scope > .modal-ft');
    [hd, bd, ft].forEach(el => {
      setImp(el, 'width', '100%');
      setImp(el, 'max-width', 'none');
      setImp(el, 'margin', '0');
      setImp(el, 'box-sizing', 'border-box');
    });
    setImp(hd, 'flex', '0 0 auto');
    if (!simi) setImp(hd, 'padding', '8px 14px');
    setImp(bd, 'flex', '1 1 auto');
    setImp(bd, 'min-height', '0');
    setImp(bd, 'max-height', 'none');
    setImp(bd, 'overflow', 'hidden');
    setImp(bd, 'display', 'flex');
    setImp(ft, 'flex', '0 0 auto');
    if (!simi) setImp(ft, 'padding', '8px 14px');

    const main = m.querySelector('#fp-main');
    const panel = m.querySelector('#fp-panel');
    setImp(main, 'flex', '1 1 auto');
    setImp(main, 'min-width', '0');
    setImp(main, 'min-height', '0');
    if (panel && !simi) {
      setImp(panel, 'width', '168px');
      setImp(panel, 'flex', '0 0 168px');
      setImp(panel, 'max-width', '168px');
    }
    vaktStaerd(main);
    return true;
  }

  function teiknaAftur() {
    try {
      const F = window.FloorPlan;
      if (F && F.bgImage && typeof F._renderCanvas === 'function') F._renderCanvas();
    } catch (_) {}
  }

  function vaktStaerd(main) {
    if (!main || main._t437ro || typeof ResizeObserver === 'undefined') return;
    main._t437ro = 1;
    const ro = new ResizeObserver(() => { teiknaAftur(); });
    ro.observe(main);
  }

  function tikk() {
    const m = document.getElementById('modal-floorplan');
    if (!m || !m.isConnected) return;
    if (m.style.display === 'none' && !m.classList.contains('open')) return;
    beita();
    requestAnimationFrame(teiknaAftur);
  }

  function tikkOgTeikna() {
    tikk();
    requestAnimationFrame(teiknaAftur);
  }

  still();
  tikkOgTeikna();
  if (!document.documentElement._t437obs) {
    document.documentElement._t437obs = 1;
    new MutationObserver(() => { try { tikk(); } catch (_) {} }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }
  window.addEventListener('resize', () => { try { tikkOgTeikna(); } catch (_) {} });

  window.TeiknGluggi = { beita, tikk, still };
})();
