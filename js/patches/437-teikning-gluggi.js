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
 * og teikningin (#fp-main) fær restina. Tækjaræman byrjar á 168 px; draga má
 * vinstri brúnina svo merkin ráðist í fleiri dálka. Sími er óbreyttur.
 * ========================================================================== */
(() => {
  if (window.TeiknGluggi) return;

  const LS = 'fp_panel_breidd';
  const SJALF = 168;
  const MIN = 148;
  const MAX = 520;

  const CSS =
    '#modal-floorplan.modal.open{padding:10px!important;align-items:stretch!important;justify-content:stretch!important}' +
    '#modal-floorplan.modal.open>.modal-hd,#modal-floorplan.modal.open>.modal-bd,#modal-floorplan.modal.open>.modal-ft' +
      '{width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}' +
    '#modal-floorplan.modal.open>.modal-hd{padding:8px 14px!important;flex:0 0 auto!important;min-height:0!important}' +
    '#modal-floorplan.modal.open>.modal-hd h2+div{display:none!important}' +
    '#modal-floorplan.modal.open>.modal-bd{flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow:hidden!important;display:flex!important}' +
    '#modal-floorplan.modal.open>.modal-ft{padding:8px 14px!important;flex:0 0 auto!important}' +
    '#modal-floorplan:not(.fp-simi) #fp-main{flex:1 1 auto!important;min-width:0!important;min-height:0!important}' +
    '#modal-floorplan:not(.fp-simi) #fp-panel{position:relative;width:var(--fp-panel,168px)!important;flex:0 0 var(--fp-panel,168px)!important;max-width:var(--fp-panel,168px)!important}' +
    '#fp-panel-drag{position:absolute;left:0;top:0;bottom:0;width:10px;cursor:col-resize;z-index:6;touch-action:none}' +
    '#fp-panel-drag::after{content:"";position:absolute;left:3px;top:50%;width:2px;height:42px;margin-top:-21px;border-radius:1px;background:rgba(255,255,255,.38)}' +
    '#fp-panel-drag:hover::after,#modal-floorplan.fp-panel-drag #fp-panel-drag::after{background:#c9a54a}' +
    '#modal-floorplan.fp-simi{padding:0!important}' +
    '#modal-floorplan.fp-simi #fp-panel-drag{display:none!important}' +
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

  function lesaBreidd() {
    try {
      const n = parseInt(localStorage.getItem(LS), 10);
      if (n >= MIN && n <= MAX) return n;
    } catch (_) {}
    return SJALF;
  }

  function klemma(n, modal) {
    const raw = modal ? Math.round(modal.getBoundingClientRect().width * 0.46) : MAX;
    const cap = Math.max(MIN, Math.min(MAX, raw || MAX));
    const v = Math.round(Number(n) || SJALF);
    return Math.max(MIN, Math.min(cap, v));
  }

  function setjaBreidd(px, vista) {
    const m = document.getElementById('modal-floorplan');
    if (!m || m.classList.contains('fp-simi')) return 0;
    const w = klemma(px, m);
    m.style.setProperty('--fp-panel', w + 'px');
    const panel = m.querySelector('#fp-panel');
    if (panel) {
      setImp(panel, 'width', w + 'px');
      setImp(panel, 'flex', '0 0 ' + w + 'px');
      setImp(panel, 'max-width', w + 'px');
    }
    if (vista) {
      try { localStorage.setItem(LS, String(w)); } catch (_) {}
    }
    return w;
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
      setjaBreidd(lesaBreidd(), false);
      handfang(panel);
    }
    if (panel && simi) {
      panel.style.removeProperty('width');
      panel.style.removeProperty('flex');
      panel.style.removeProperty('max-width');
    }
    vaktStaerd(main);
    return true;
  }

  function handfang(panel) {
    if (!panel || panel.querySelector('#fp-panel-drag')) return;
    const h = document.createElement('div');
    h.id = 'fp-panel-drag';
    h.title = 'Draga til að breyta breidd ræmunnar · tvísmella til að byrja upp á 168 px';
    h.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const m = document.getElementById('modal-floorplan');
      if (!m || m.classList.contains('fp-simi')) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = panel.getBoundingClientRect().width;
      m.classList.add('fp-panel-drag');
      const faera = ev => {
        setjaBreidd(startW + (startX - ev.clientX), false);
        teiknaAftur();
      };
      const loka = () => {
        m.classList.remove('fp-panel-drag');
        document.removeEventListener('pointermove', faera, true);
        document.removeEventListener('pointerup', loka, true);
        document.removeEventListener('pointercancel', loka, true);
        setjaBreidd(panel.getBoundingClientRect().width, true);
        teiknaAftur();
      };
      document.addEventListener('pointermove', faera, true);
      document.addEventListener('pointerup', loka, true);
      document.addEventListener('pointercancel', loka, true);
      try { h.setPointerCapture(e.pointerId); } catch (_) {}
    });
    h.addEventListener('dblclick', e => {
      e.preventDefault();
      setjaBreidd(SJALF, true);
      teiknaAftur();
    });
    panel.appendChild(h);
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

  window.TeiknGluggi = { beita, tikk, still, setjaBreidd, lesaBreidd, klemma, SJALF, MIN, MAX };
})();
