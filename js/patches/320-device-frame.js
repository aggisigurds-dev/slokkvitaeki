/* === DEVICE FRAME (Stílstjóri viðbót) =======================================
 * 📱 Símarammi / 📲 Spjaldrammi — appið opnast í iframe í ALVÖRU hlutföllum
 * (390×844 / 834×1112) svo allar @media-reglur og layout svara eins og á
 * tækinu (ósk Agnars 2026-08-26). Sama mynstur og brunaholf js/viewmode.js.
 *
 * Rammaða eintakið keyrir ?devframe=simi|tafla:
 *   - localStorage er SHIMMAÐ fyrir slokk_viewmode (get skilar ramma-ham,
 *     set hunsað) svo ramminn þvingar Sími/Tafla án þess að KRUKKA í
 *     raunverulegu sýnar-vali tækisins.
 *   - Stílstjórinn virkar INNI í rammanum — breytingar vistast í AppSettings
 *     og gilda alls staðar. ↻ endurhleður rammann.
 *   - Rammar sig ekki aftur (takkarnir birtast ekki í barni).
 * ========================================================================== */
(() => {
  if (window.__devFrame320) return;
  window.__devFrame320 = true;

  const params = new URLSearchParams(location.search);
  const CHILD_MODE = params.get('devframe');   // 'simi' | 'tafla' | null

  /* ── BARNIÐ: þvinga sýn án þess að vista ─────────────────────────────── */
  if (CHILD_MODE) {
    const vm = CHILD_MODE === 'tafla' ? 'table' : 'mobile';
    try {
      const realGet = Storage.prototype.getItem, realSet = Storage.prototype.setItem;
      Storage.prototype.getItem = function (k) { return k === 'slokk_viewmode' ? vm : realGet.call(this, k); };
      Storage.prototype.setItem = function (k, v) { if (k === 'slokk_viewmode') return; return realSet.call(this, k, v); };
    } catch (_) {}
    const enforce = () => {
      try {
        if (document.documentElement.dataset.viewmode !== vm) {
          if (window.SlokkViewMode && SlokkViewMode.apply) SlokkViewMode.apply(vm, true);
          else document.documentElement.dataset.viewmode = vm;
        }
      } catch (_) {}
    };
    enforce();
    [300, 900, 2000, 4500].forEach(ms => setTimeout(enforce, ms));
    document.addEventListener('DOMContentLoaded', enforce);
    return;   // ekkert ramma-UI í barninu
  }

  /* ── FORELDRIÐ: takkar í Stílstjóra-toolbar + ramminn ────────────────── */
  const DEVICES = {
    simi:  { label: '📱 Sími',        w: 390, h: 844,  radius: 34 },
    tafla: { label: '📲 Spjaldtölva', w: 834, h: 1112, radius: 22 },
  };
  let overlay = null, iframe = null, curDev = null;

  function frameUrl(devKey) {
    const u = new URL(location.href);
    u.searchParams.set('devframe', devKey);
    return u.toString();
  }
  function close() {
    if (overlay) overlay.remove();
    overlay = null; iframe = null; curDev = null;
    syncButtons();
  }
  function refresh() {
    if (iframe && curDev) { try { iframe.src = frameUrl(curDev); } catch (_) {} }
  }
  function open(devKey) {
    const d = DEVICES[devKey]; if (!d) return;
    close();
    curDev = devKey;
    overlay = document.createElement('div');
    overlay.id = '_devframe-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99980;background:rgba(8,10,14,.86);display:flex;flex-direction:column;align-items:center;padding:10px 8px;overflow:auto';
    const bh = 46;                                   // toolbar-hæð
    const availH = Math.max(280, window.innerHeight - bh - 26);
    const availW = Math.max(280, window.innerWidth - 24);
    const scale = Math.min(1, availH / (d.h + 24), availW / (d.w + 24));
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;flex:none';
    bar.innerHTML =
      Object.keys(DEVICES).map(k =>
        '<button data-dev="' + k + '" style="all:unset;cursor:pointer;font:700 12.5px \'Space Grotesk\',sans-serif;color:' + (k === devKey ? '#0f1117' : '#e5e9f0') + ';background:' + (k === devKey ? '#fff' : 'rgba(255,255,255,.12)') + ';padding:8px 14px;border-radius:9px">' + DEVICES[k].label + ' · ' + DEVICES[k].w + '×' + DEVICES[k].h + '</button>').join('') +
      '<span style="font:12px \'Space Mono\',monospace;color:#9aa3b2">' + Math.round(scale * 100) + '%</span>' +
      '<button id="_df-refresh" style="all:unset;cursor:pointer;font:700 12.5px sans-serif;color:#e5e9f0;background:rgba(255,255,255,.12);padding:8px 12px;border-radius:9px" title="Endurhlaða rammann (sækir nýjustu stíla)">↻</button>' +
      '<button id="_df-close" style="all:unset;cursor:pointer;font:700 12.5px sans-serif;color:#fff;background:#c9403a;padding:8px 14px;border-radius:9px">✕ Loka</button>';
    const scaler = document.createElement('div');
    scaler.style.cssText = 'flex:none;transform:scale(' + scale + ');transform-origin:top center';
    const bezel = document.createElement('div');
    bezel.style.cssText = 'padding:12px;background:linear-gradient(160deg,#2b2f36,#101216);border-radius:' + (d.radius + 12) + 'px;box-shadow:0 24px 70px -20px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.14)';
    iframe = document.createElement('iframe');
    iframe.src = frameUrl(devKey);
    iframe.style.cssText = 'display:block;width:' + d.w + 'px;height:' + d.h + 'px;border:0;border-radius:' + d.radius + 'px;background:#fff';
    bezel.appendChild(iframe);
    scaler.appendChild(bezel);
    overlay.appendChild(bar);
    overlay.appendChild(scaler);
    document.body.appendChild(overlay);
    bar.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(b.dataset.dev); }));
    bar.querySelector('#_df-refresh').addEventListener('click', e => { e.preventDefault(); refresh(); });
    bar.querySelector('#_df-close').addEventListener('click', e => { e.preventDefault(); close(); });
    syncButtons();
    try { if (window.Toast && Toast.show) Toast.show('Ábending: opnaðu 🎨 INNI í rammanum til að stíla í alvöru hlutföllum'); } catch (_) {}
  }

  /* Takkar í Stílstjóra-toolbar (sama endursmíðunar-mynstur og 319). */
  function syncButtons() {
    const bar = document.querySelector('.pe-toolbar');
    if (!bar) return;
    Object.keys(DEVICES).forEach(k => {
      const id = 'pe-devframe-' + k;
      let b = bar.querySelector('#' + id);
      if (!b) {
        b = document.createElement('button');
        b.id = id; b.type = 'button'; b.className = 'pe-btn';
        b.textContent = DEVICES[k].label;
        b.title = 'Opna appið í ' + DEVICES[k].label + '-ramma í alvöru hlutföllum (' + DEVICES[k].w + '×' + DEVICES[k].h + ')';
        b.addEventListener('click', e => { e.preventDefault(); (curDev === k) ? close() : open(k); });
        bar.appendChild(b);
      }
      b.classList.toggle('on', curDev === k);
    });
  }

  let t = null;
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n && n.nodeType === 1 && (n.id === '_devframe-overlay' || (n.closest && n.closest('#_devframe-overlay')))) return;
    }
    clearTimeout(t); t = setTimeout(syncButtons, 250);
  }).observe(document.body, { childList: true, subtree: true });
  syncButtons();

  window.SlokkDevFrame = { open, close, refresh };
  console.log('[patch-320] device frame ready');
})();
/* === END DEVICE FRAME === */
