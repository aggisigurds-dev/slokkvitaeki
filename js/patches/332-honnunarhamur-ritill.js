/* === HÖNNUNARHAMUR RITILL Á SÍMA (332) =====================================
 *
 * Agnar 2026-08-29: á RAUNVERULEGUM síma opnaðist Hönnunarhamur aðeins sem
 * „Útlit · litir og letur" (letur + 5 litir). Ritillinn (símarammi, sleðar,
 * Sími/Tafla/Skjár, forskoðun) var læstur á bak við isPhone / 390px hlið.
 *
 * Þessi pappi bætir Litir | Ritill flöngum ofan á 318. Litir er litasheetið.
 * Ritill opnar 320-símarammann í STAFLAÐRI sýn (forskoðun ofan, sleðar neðan)
 * svo Agnar komist í raunverulega ritilinn á 390px.
 *
 * Snertir ekki 153/187-reikning og ekki 187-töflu/zoom-pappa.
 * ========================================================================== */
(() => {
  if (window.__hhRitill332) return;
  window.__hhRitill332 = true;

  const IN_DEVFRAME = !!(new URLSearchParams(location.search).get('devframe'));
  if (IN_DEVFRAME) return;

  function isNativePhone() {
    try {
      if (document.documentElement.classList.contains('slokk-phone-dev')) return true;
      return window.innerWidth <= 430 && window.parent === window;
    } catch (_) { return false; }
  }

  function toast(m) {
    try { if (window.Toast && Toast.show) { Toast.show(m); return; } } catch (_) {}
  }

  function injectCss() {
    if (document.getElementById('_hh331-css')) return;
    const s = document.createElement('style');
    s.id = '_hh331-css';
    s.textContent = [
      '#_hh331-tabs{display:flex;gap:6px;padding:8px 12px 4px;flex:none;align-items:stretch}',
      '#_hh331-tabs button{flex:1;min-height:40px;padding:8px 10px;border-radius:8px;cursor:pointer;',
        'font:600 13px "IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;border:1px solid #3a3f47;',
        'background:#0e1013;color:#c8cfd8}',
      '#_hh331-tabs button.on{background:#5980a6;border-color:#5980a6;color:#fff}',
      '#_hh331-open{flex:none;min-height:40px}',
      'html._hh331-phone #_hh-panel:not(._hh-frame){max-height:38vh}',
      'html._hh331-phone #view-arsskodun.view.active{padding-bottom:0}',
      /* Staflaður rammi: stærri snertifletir + pinch-zoom á forskoðun. */
      '#_devframe-overlay._df-phone button,#_devframe-overlay._df-phone a{min-height:40px;min-width:40px}',
      '#_devframe-overlay._df-phone #_devframe-stage{touch-action:pan-x pan-y pinch-zoom;-webkit-overflow-scrolling:touch}',
      '#_devframe-overlay._df-phone #_devframe-editor{overflow:auto;-webkit-overflow-scrolling:touch}',
      '#_devframe-overlay._df-phone #_hh-panel._hh-frame{max-height:none}',
      /* 262 má ekki hylja 318-sleðana í ritils-slotinu á síma — Agnar er að */
      /* stilla Ársskoðun, ekki mála stök. Stílstjóri er valinn með takka.     */
      '#_devframe-overlay._df-phone #_devframe-editor #_pe-panel{display:none!important}',
      '#_devframe-overlay._df-phone #_devframe-editor._hh331-stil #_pe-panel{display:block!important}',
      '#_devframe-overlay._df-phone #_devframe-editor._hh331-stil #_hh-panel{display:none!important}',
      '#_hh331-vm{display:flex;flex-wrap:wrap;gap:6px;padding:4px 12px 8px;flex:none}',
      '#_hh331-vm button{min-height:40px;padding:8px 12px;border-radius:8px;cursor:pointer;',
        'font:600 12.5px "IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;border:1px solid #3a3f47;',
        'background:#0e1013;color:#c8cfd8}',
      '#_hh331-vm button.on{background:#fff;border-color:#fff;color:#0f1117}'
    ].join('');
    document.head.appendChild(s);
  }

  function framed() {
    return !!document.getElementById('_devframe-overlay');
  }

  function setTab(tab) {
    const p = document.getElementById('_hh-panel');
    if (!p) return;
    p.setAttribute('data-hh331-tab', tab);
    p.querySelectorAll('#_hh331-tabs button').forEach(b => {
      b.classList.toggle('on', b.getAttribute('data-hh331') === tab);
    });
    if (tab === 'ritill') openRitill(p);
    else showLitir(p);
  }

  function showLitir(p) {
    p.removeAttribute('data-hh-all');
    const body = p.querySelector('#_hh-body');
    if (body) body.style.display = '';
    const vm = p.querySelector('#_hh331-vm');
    if (vm) vm.style.display = framed() ? 'none' : '';
    const host = document.getElementById('_devframe-editor');
    if (host) host.classList.remove('_hh331-stil');
    if (framed()) {
      /* Litir inni í ramma: litasheet 318, ekki loka forskoðun. */
      p.setAttribute('data-hh-all', '');
    } else {
      document.documentElement.classList.add('_hh331-phone');
    }
  }

  function openRitill(p) {
    p.setAttribute('data-hh-all', '1');
    const df = window.SlokkDevFrame;
    if (!framed()) {
      if (df && typeof df.open === 'function') {
        df.open('simi');
        return;
      }
      toast('Símarammi ekki tiltækur');
    }
    const host = document.getElementById('_devframe-editor');
    if (host) host.classList.remove('_hh331-stil');
    const vm = ensureVm(p);
    if (vm) vm.style.display = '';
    syncVm();
  }

  function ensureVm(p) {
    let vm = p.querySelector('#_hh331-vm');
    if (vm) return vm;
    vm = document.createElement('div');
    vm.id = '_hh331-vm';
    vm.innerHTML =
      '<button type="button" data-hh331-vm="mobile">Sími</button>'
      + '<button type="button" data-hh331-vm="table">Tafla</button>'
      + '<button type="button" data-hh331-vm="desktop">Skjár</button>'
      + '<button type="button" id="_hh331-stil" title="Opna Stílstjóra">Stílstjóri</button>';
    const tabs = p.querySelector('#_hh331-tabs');
    if (tabs && tabs.nextSibling) p.insertBefore(vm, tabs.nextSibling);
    else {
      const body = p.querySelector('#_hh-body');
      p.insertBefore(vm, body);
    }
    vm.querySelectorAll('[data-hh331-vm]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        applyVm(b.getAttribute('data-hh331-vm'));
      });
    });
    const stil = vm.querySelector('#_hh331-stil');
    if (stil) stil.addEventListener('click', e => {
      e.preventDefault();
      const host = document.getElementById('_devframe-editor');
      if (host) host.classList.toggle('_hh331-stil');
      if (host && host.classList.contains('_hh331-stil') && window.PageEditor && PageEditor.open) {
        PageEditor.open();
      }
    });
    return vm;
  }

  function applyVm(mode) {
    const df = window.SlokkDevFrame;
    if (df && typeof df.open === 'function') {
      if (mode === 'mobile') df.open('simi');
      else if (mode === 'table') df.open('tafla');
      else {
        df.close();
        try { if (window.SlokkViewMode && SlokkViewMode.apply) SlokkViewMode.apply('desktop', true); } catch (_) {}
      }
      return;
    }
    try { if (window.SlokkViewMode && SlokkViewMode.apply) SlokkViewMode.apply(mode, true); } catch (_) {}
    syncVm();
  }

  function syncVm() {
    const vm = document.getElementById('_hh331-vm');
    if (!vm) return;
    let cur = 'mobile';
    try {
      const d = window.SlokkDevFrame && SlokkDevFrame.device && SlokkDevFrame.device();
      if (d === 'tafla' || d === 'taflaL') cur = 'table';
      else if (d === 'simi' || d === 'simiL') cur = 'mobile';
      else if (!framed()) {
        const m = document.documentElement.dataset.viewmode;
        if (m === 'table' || m === 'desktop' || m === 'mobile') cur = m;
      }
    } catch (_) {}
    vm.querySelectorAll('[data-hh331-vm]').forEach(b => {
      b.classList.toggle('on', b.getAttribute('data-hh331-vm') === cur);
    });
  }

  function enhance(p) {
    if (!p) return;
    if (!isNativePhone() && !framed()) return;
    injectCss();
    document.documentElement.classList.add('_hh331-phone');
    if (p.dataset.hh331 !== '1') {
      p.dataset.hh331 = '1';
      if (!p.querySelector('#_hh331-tabs')) {
        const tabs = document.createElement('div');
        tabs.id = '_hh331-tabs';
        tabs.innerHTML =
          '<button type="button" data-hh331="litir">Litir</button>'
          + '<button type="button" data-hh331="ritill">Ritill</button>';
        const hd = p.querySelector('#_hh-hd');
        if (hd && hd.nextSibling) p.insertBefore(tabs, hd.nextSibling);
        else p.insertBefore(tabs, p.firstChild);
        tabs.querySelectorAll('button').forEach(b => {
          b.addEventListener('click', e => {
            e.preventDefault();
            setTab(b.getAttribute('data-hh331'));
          });
        });
      }
    }
    const start = framed()
      ? (p.getAttribute('data-hh331-tab') || 'ritill')
      : (p.getAttribute('data-hh331-tab') || 'litir');
    if (framed()) p.setAttribute('data-hh-all', '1');
    p.querySelectorAll('#_hh331-tabs button').forEach(b => {
      b.classList.toggle('on', b.getAttribute('data-hh331') === start);
    });
    p.setAttribute('data-hh331-tab', start);
    if (start === 'ritill' || framed()) {
      ensureVm(p);
      syncVm();
    }
  }

  function stackPhoneOverlay() {
    const overlay = document.getElementById('_devframe-overlay');
    if (!overlay || !isNativePhone()) return;
    injectCss();
    overlay.classList.add('_df-phone');
    const row = overlay.querySelector('#_devframe-row');
    if (row) {
      row.style.flexDirection = 'column';
      row.style.overflow = 'auto';
    }
    const editor = overlay.querySelector('#_devframe-editor');
    if (editor) {
      editor.style.flex = '0 0 42vh';
      editor.style.height = '42vh';
      editor.style.width = '100%';
      editor.style.maxWidth = 'none';
      editor.style.minWidth = '0';
      editor.style.maxHeight = '42vh';
      editor.style.order = '2';
      editor.style.overflow = 'auto';
    }
    let stage = overlay.querySelector('#_devframe-stage');
    const scaler = overlay.querySelector('#_devframe-row > [style*="transform"], #_devframe-stage > div');
    if (!stage && row) {
      const kids = Array.prototype.slice.call(row.children);
      const scEl = kids.find(el => el.id !== '_devframe-editor');
      if (scEl) {
        stage = document.createElement('div');
        stage.id = '_devframe-stage';
        stage.style.cssText = 'flex:1 1 auto;min-width:0;min-height:0;overflow:auto;touch-action:pan-x pan-y pinch-zoom;-webkit-overflow-scrolling:touch;display:flex;justify-content:center;align-items:flex-start;order:1';
        row.insertBefore(stage, scEl);
        stage.appendChild(scEl);
      }
    } else if (stage) {
      stage.style.order = '1';
      stage.style.flex = '1 1 auto';
      stage.style.minHeight = '0';
      stage.style.overflow = 'auto';
      stage.style.touchAction = 'pan-x pan-y pinch-zoom';
    }
    const dk = overlay.querySelector('#_df-dock');
    if (dk) dk.style.display = 'none';
    const ifr = overlay.querySelector('#_devframe-stage iframe, #_devframe-row iframe');
    const scEl = overlay.querySelector('#_devframe-stage > div') || scaler;
    if (ifr && scEl) {
      const w = parseFloat(ifr.style.width) || 390;
      const h = parseFloat(ifr.style.height) || 844;
      const availW = Math.max(160, window.innerWidth - 24);
      const availH = Math.max(140, window.innerHeight * 0.50);
      const sc = Math.min(1, availW / (w + 24), availH / (h + 24));
      scEl.style.transform = 'scale(' + sc + ')';
      scEl.style.transformOrigin = 'top center';
    }
  }

  function wrapOpna() {
    const H = window.Honnunarhamur;
    if (!H || typeof H.opna !== 'function' || H.__hh332wrap) return;
    H.__hh332wrap = true;
    const orig = H.opna;
    H.opna = function () {
      const r = orig.apply(this, arguments);
      setTimeout(scan, 0);
      setTimeout(scan, 80);
      return r;
    };
  }

  function scan() {
    if (IN_DEVFRAME) return;
    wrapOpna();
    if (framed()) stackPhoneOverlay();
    const p = document.getElementById('_hh-panel');
    if (p) enhance(p);
    else if (!framed()) document.documentElement.classList.remove('_hh331-phone');
  }

  new MutationObserver(() => {
    /* Trailing throttle — Ársskoðun stimplar DOM stöðugt, svo
       clearTimeout-á-hverjum-mut myndi aldrei keyra scan. */
    if (window.__hh331T) return;
    window.__hh331T = setTimeout(() => { window.__hh331T = null; scan(); }, 40);
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest && e.target.closest('#_hh-toggle');
    if (t) setTimeout(scan, 30);
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();

  window.HonnunarhamurRitill = { open: () => {
    if (window.Honnunarhamur && Honnunarhamur.opna) Honnunarhamur.opna();
    setTimeout(() => {
      const p = document.getElementById('_hh-panel');
      if (p) { enhance(p); setTab('ritill'); }
    }, 50);
  }, version: 'v1' };
  console.log('[patch-332] honnunarhamur ritill ready');
})();
