/* === COLUMN DRAG (Stílstjóri viðbót) ========================================
 * „↔ Dálkar" — dragðu dálkabreiddir í töflum sjálf(ur) (ósk Agnars 2026-08-26).
 *
 * Hnappurinn birtist í Stílstjóra-toolbarnum (262 endurteiknar hann — observer
 * setur hnappinn aftur inn). Þegar kveikt: grip-lína birtist á hægri brún hvers
 * dálkhauss í töflum virku síðunnar (töflur með <colgroup>). Drag skrifar
 * breiddina á <col> gegnum eigin style-blað með hárri sértækni svo hún vinnur
 * á 314-prósentunum í Sími-ham líka.
 *
 * Vistun: localStorage `slokk_coldrag_v1` — PER TÆKI (síminn þinn getur haft
 * aðrar breiddir en tölvan). „↺ breiddir" núllstillir virku síðuna.
 * Ekkert hér snertir gögn eða ._yr útlit — bara col-width.
 * ========================================================================== */
(() => {
  if (window.__colDrag319) return;
  window.__colDrag319 = true;

  const LS = 'slokk_coldrag_v1';
  const SHEET = '_coldrag-css';
  let on = false;
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (_) { store = {}; }

  const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch (_) {} };

  function viewIdOf(el) { const v = el && el.closest ? el.closest('.view') : null; return v && v.id ? v.id : null; }
  function tableKey(t) {
    const vid = viewIdOf(t); if (!vid) return null;
    const cls = t.id ? ('#' + t.id) : (t.classList[0] ? ('.' + t.classList[0]) : '');
    return vid + '|' + (cls || 'table');
  }
  // ── style-blaðið: vistaðar breiddir → CSS sem vinnur á 314 ────────────────
  function applyCss() {
    let s = document.getElementById(SHEET);
    if (!s) { s = document.createElement('style'); s.id = SHEET; (document.head || document.documentElement).appendChild(s); }
    let css = '';
    for (const key in store) {
      const widths = store[key]; const keys = Object.keys(widths || {});
      if (!keys.length) continue;
      const [vid, cls] = key.split('|');
      const base = 'html #' + vid + ' ' + (cls === 'table' ? 'table' : (cls[0] === '#' ? 'table' + cls : 'table' + cls));
      css += base + '{table-layout:fixed!important;width:100%!important}\n';
      keys.forEach(n => { css += base + ' col:nth-child(' + n + '){width:' + widths[n] + 'px!important}\n'; });
    }
    s.textContent = css;
    if (s.parentNode) s.parentNode.appendChild(s);   // sitja síðast → vinna 314
  }

  // ── grip-línurnar ─────────────────────────────────────────────────────────
  function clearHandles() { document.querySelectorAll('._cd-handle').forEach(h => h.remove()); }
  function buildHandles() {
    clearHandles();
    if (!on) return;
    const view = document.querySelector('.view.active'); if (!view) return;
    view.querySelectorAll('table').forEach(t => {
      if (!t.querySelector('colgroup col')) return;
      const key = tableKey(t); if (!key) return;
      const ths = Array.prototype.slice.call(t.querySelectorAll('thead th'));
      ths.forEach((th, i) => {
        if (th.offsetParent === null) return;              // falinn dálkur
        if (i === ths.length - 1) return;                  // síðasta brún = tafla-brún
        th.style.position = 'relative';
        const h = document.createElement('div');
        h.className = '_cd-handle';
        h.style.cssText = 'position:absolute;top:0;right:-7px;width:14px;height:100%;cursor:col-resize;z-index:50;touch-action:none;';
        h.innerHTML = '<div style="position:absolute;top:0;bottom:0;left:6px;width:2px;background:#3b82f6;opacity:.55;border-radius:1px"></div>';
        h.addEventListener('pointerdown', ev => startDrag(ev, t, key, i + 1, th));
        th.appendChild(h);
      });
    });
  }

  function startDrag(ev, table, key, colN, th) {
    ev.preventDefault(); ev.stopPropagation();
    const startX = ev.clientX;
    const startW = th.getBoundingClientRect().width;
    const col = table.querySelectorAll('colgroup col')[colN - 1];
    const move = e => {
      const w = Math.max(24, Math.min(Math.round(startW + (e.clientX - startX)), Math.round(window.innerWidth * 0.9)));
      (store[key] = store[key] || {})[colN] = w;
      if (col) col.style.width = w + 'px';               // lifandi svörun
      applyCss();
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      save();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  // ── takkarnir í Stílstjóra-toolbar ───────────────────────────────────────
  function ensureButtons() {
    const bar = document.querySelector('.pe-toolbar');
    if (!bar) { if (on) { on = false; clearHandles(); } return; }
    if (!bar.querySelector('#pe-coldrag')) {
      const b = document.createElement('button');
      b.id = 'pe-coldrag'; b.type = 'button'; b.className = 'pe-btn' + (on ? ' on' : '');
      b.textContent = '↔ Dálkar';
      b.title = 'Dragðu dálkabreiddir í töflum beint — vistast á þessu tæki';
      b.addEventListener('click', e => { e.preventDefault(); on = !on; b.classList.toggle('on', on); buildHandles(); syncReset(bar); });
      bar.appendChild(b);
    } else {
      bar.querySelector('#pe-coldrag').classList.toggle('on', on);
    }
    syncReset(bar);
  }
  function syncReset(bar) {
    let r = bar.querySelector('#pe-coldrag-reset');
    if (!on) { if (r) r.remove(); return; }
    if (!r) {
      r = document.createElement('button');
      r.id = 'pe-coldrag-reset'; r.type = 'button'; r.className = 'pe-btn';
      r.textContent = '↺ breiddir';
      r.title = 'Núllstilla dregnar dálkabreiddir á þessari síðu';
      r.addEventListener('click', e => {
        e.preventDefault();
        const view = document.querySelector('.view.active'); const vid = view && view.id;
        if (!vid) return;
        Object.keys(store).forEach(k => { if (k.indexOf(vid + '|') === 0) delete store[k]; });
        save(); applyCss();
        document.querySelectorAll('#' + vid + ' colgroup col').forEach(c => c.style.removeProperty('width'));
        buildHandles();
      });
      bar.appendChild(r);
    }
  }

  // Töflur endurteiknast (gagna-hleðsla) — grip-línur og CSS koma aftur.
  let t = null;
  const kick = () => { clearTimeout(t); t = setTimeout(() => { ensureButtons(); if (on) buildHandles(); applyCss(); }, 250); };
  const isOurs = n => n && n.nodeType === 1 && n.classList && n.classList.contains('_cd-handle');
  new MutationObserver(muts => {
    // Eigin grip-línu-mutations kveikja EKKI endursmíði — annars eilífðar-hringur.
    let foreign = false;
    for (const m of muts) {
      for (const n of m.addedNodes) if (!isOurs(n)) { foreign = true; break; }
      if (!foreign) for (const n of m.removedNodes) if (!isOurs(n)) { foreign = true; break; }
      if (foreign) break;
    }
    if (foreign) kick();
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', kick);
  document.addEventListener('slokk-viewmode', kick);
  applyCss();
  setInterval(applyCss, 8000);   // sitja síðast þó önnur blöð endur-appendist
  console.log('[patch-319] column drag ready');
})();
/* === END COLUMN DRAG === */
