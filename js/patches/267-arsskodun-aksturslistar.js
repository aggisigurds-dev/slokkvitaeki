/* === ARSSKODUN AKSTURSLISTAR v1 ===
 *
 * Surfaces the Aksturslistar (driving-lists) feature on the office
 * "Fyrirtæki í Þjónustu" (Ársskoðun) page. The assignment already exists
 * in Bílstjóri (patch 219, company sheet) writing
 * `arsskodun_customers[id].akstur` (0=enginn / 1 / 2 / 3) via AppSettings —
 * this patch adds the SAME assignment on the office side so a per-employee
 * driving plan can be built from the desktop list too. Same store → office
 * and driver stay in sync.
 *
 * UI:
 *   • A "🚚 Aksturslistar" toggle button sits right next to the
 *     "🗺️ Sýna kort" button (patch 155's toolbar row).
 *   • Clicking opens a light panel below the toolbar: searchable list of the
 *     in-service companies, each with 4 chips (Enginn / Akstur 1 blár /
 *     Akstur 2 grænn / Akstur 3 grænblár). A filter row (Allir / 1 / 2 / 3 /
 *     Óflokkað) + a live count summary make list-building fast.
 *   • Companies already on a list get a small coloured 🚗N badge on their
 *     row/card in the main table (visible at a glance, no panel needed).
 *
 * Data: writes `arsskodun_customers[id].akstur` via AppSettings.save
 *   (deep-merge — never deletes other keys; 0 = removed from all lists).
 *   Reads the company list from window.Arsskodun._cache.list.
 *
 * Exposed: window.ArsAkstur = { toggle, isOpen, render, version }
 */
(() => {
  if (window.__arsAksturInstalled) return;
  window.__arsAksturInstalled = true;

  // Same colours + labels as Bílstjóri (patch 219 AKSTUR).
  const AKSTUR = {
    1: { label: 'Akstur 1', dot: '#1d4ed8', bg: '#eff6ff', bd: '#bfdbfe' }, // blár
    2: { label: 'Akstur 2', dot: '#1a7f4b', bg: '#edfaf3', bd: '#a7e8c5' }, // grænn
    3: { label: 'Akstur 3', dot: '#0e7490', bg: '#ecfeff', bd: '#a5f3fc' }  // grænblár
  };
  const LS_VISIBLE = 'ars_akstur_visible';

  let _search = '';
  let _filter = 'all';   // 'all' | '1' | '2' | '3' | 'none'
  let _decorating = false;

  const isVisible  = () => localStorage.getItem(LS_VISIBLE) === '1';
  const setVisible = v => localStorage.setItem(LS_VISIBLE, v ? '1' : '0');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const arsAll = () => (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {};
  function aksturOf(id) {
    const a = arsAll()[String(id)];
    const v = +((a || {}).akstur) || 0;
    return (v >= 1 && v <= 3) ? v : 0;
  }
  async function saveAkstur(coId, v) {
    if (!window.AppSettings || !AppSettings.save) return false;
    try {
      const ok = await AppSettings.save({ arsskodun_customers: { [String(coId)]: { akstur: v } } });
      // keep local cache coherent so the main-table badge updates immediately
      const c = window.Arsskodun && window.Arsskodun._cache && window.Arsskodun._cache.byId && window.Arsskodun._cache.byId[coId];
      if (c) { c._ars = c._ars || {}; c._ars.akstur = v; }
      return ok !== false;
    } catch (_) { return false; }
  }

  function inServiceList() {
    const list = (window.Arsskodun && window.Arsskodun._cache && window.Arsskodun._cache.list) || [];
    return list.filter(c => c && (c.er_i_thjonustu === true || (c._ars && c._ars.equipment)));
  }

  function toast(msg) {
    if (window.Toast && Toast.show) return Toast.show(msg);
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);z-index:99999;max-width:360px;text-align:center';
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ── Panel render ────────────────────────────────────────────────────
  function renderPanel() {
    const body = document.getElementById('_arsak-body');
    if (!body) return;
    const all = inServiceList();
    const counts = { 1: 0, 2: 0, 3: 0, none: 0 };
    all.forEach(c => { const v = aksturOf(c.id); if (v) counts[v]++; else counts.none++; });

    const q = _search.trim().toLowerCase();
    let rows = all.filter(c => {
      const v = aksturOf(c.id);
      if (_filter === 'none' && v !== 0) return false;
      if (_filter === '1' && v !== 1) return false;
      if (_filter === '2' && v !== 2) return false;
      if (_filter === '3' && v !== 3) return false;
      if (!q) return true;
      return (c.nafn || '').toLowerCase().includes(q) ||
             (c.heimilisfang || '').toLowerCase().includes(q) ||
             String(c.kennitala || '').replace(/\D/g,'').includes(q.replace(/\D/g,''));
    });
    // assigned first (by list), then unassigned; alpha within
    rows.sort((a, b) => {
      const av = aksturOf(a.id), bv = aksturOf(b.id);
      const ao = av || 9, bo = bv || 9;
      return (ao - bo) || String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is');
    });

    const sumHtml =
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;font-size:11.5px">' +
      [['all','Allir ' + all.length, '#334155'],
       ['1', '🚗 ' + AKSTUR[1].label + ' · ' + counts[1], AKSTUR[1].dot],
       ['2', '🚗 ' + AKSTUR[2].label + ' · ' + counts[2], AKSTUR[2].dot],
       ['3', '🚗 ' + AKSTUR[3].label + ' · ' + counts[3], AKSTUR[3].dot],
       ['none', 'Óflokkað · ' + counts.none, '#94a3b8']]
      .map(([k, lab, col]) => {
        const on = _filter === k;
        return '<button type="button" class="_arsak-filter" data-f="' + k + '" style="padding:5px 11px;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700;border:1px solid ' + (on ? col : '#cbd5e1') + ';background:' + (on ? col : '#fff') + ';color:' + (on ? '#fff' : col) + '">' + esc(lab) + '</button>';
      }).join('') + '</div>';

    const rowsHtml = rows.length ? rows.map(c => {
      const v = aksturOf(c.id);
      const chips = [0, 1, 2, 3].map(n => {
        const a = AKSTUR[n];
        const on = v === n;
        const lab = n === 0 ? 'Enginn' : String(n);
        const col = n === 0 ? '#64748b' : a.dot;
        return '<button type="button" class="_arsak-set" data-co="' + c.id + '" data-ak="' + n + '" ' +
          'style="min-width:' + (n === 0 ? '58px' : '38px') + ';height:32px;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;' +
          'border:1px solid ' + (on ? col : '#d7dde6') + ';background:' + (on ? col : '#fff') + ';color:' + (on ? '#fff' : col) + '">' +
          (n === 0 ? lab : '🚗' + lab) + '</button>';
      }).join('');
      return '<div class="_arsak-row" style="display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid #eef2f7">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:600;font-size:13px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.nafn || '') + '</div>' +
          '<div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.heimilisfang || '—') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:5px;flex:none">' + chips + '</div>' +
      '</div>';
    }).join('') : '<div style="padding:24px 8px;text-align:center;color:#94a3b8;font-size:13px">Engin fyrirtæki fundust.</div>';

    body.innerHTML = sumHtml +
      '<div style="max-height:52vh;overflow:auto;-webkit-overflow-scrolling:touch">' + rowsHtml + '</div>';

    body.querySelectorAll('._arsak-filter').forEach(b => b.addEventListener('click', () => { _filter = b.dataset.f; renderPanel(); }));
    body.querySelectorAll('._arsak-set').forEach(b => b.addEventListener('click', async () => {
      const coId = +b.dataset.co, v = +b.dataset.ak || 0;
      b.disabled = true;
      const ok = await saveAkstur(coId, v);
      toast(ok ? (v ? '🚗 Settur í Akstur ' + v : '↩︎ Tekinn af aksturslista') : '⚠ Villa við vistun');
      renderPanel();
      decorate(true);
    }));
  }

  function ensurePanel() {
    if (document.getElementById('_arsak-panel')) return;
    const wrap = document.getElementById('_arsmap-wrapper');
    const anchor = wrap || (document.getElementById('ars-main') || {}).firstElementChild;
    const panel = document.createElement('div');
    panel.id = '_arsak-panel';
    panel.style.cssText = 'display:' + (isVisible() ? 'block' : 'none') + ';margin:0 0 14px 0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px -8px rgba(15,23,42,.25)';
    panel.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#f8fafc,#eef2f7);border-bottom:1px solid #e2e8f0">' +
        '<div style="font-weight:800;font-size:13.5px;color:#0f172a">🚚 Aksturslistar</div>' +
        '<div style="font-size:11px;color:#94a3b8">Raða fyrirtækjum á akstursleiðir (samstillist við Bílstjóra)</div>' +
        '<button id="_arsak-close" type="button" style="margin-left:auto;border:0;background:transparent;font-size:18px;cursor:pointer;color:#64748b;line-height:1">✕</button>' +
      '</div>' +
      '<div style="padding:12px 14px">' +
        '<input id="_arsak-search" type="search" placeholder="🔍 Leita í nafni, kt eða heimilisfangi…" ' +
          'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;font-size:13px;color:#0f172a;outline:none;margin-bottom:11px"/>' +
        '<div id="_arsak-body"></div>' +
      '</div>';
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    } else {
      const main = document.getElementById('ars-main');
      if (main) main.insertBefore(panel, main.firstChild);
    }
    const si = document.getElementById('_arsak-search');
    if (si) { si.value = _search; si.addEventListener('input', () => { _search = si.value; renderPanel(); }); }
    const cb = document.getElementById('_arsak-close');
    if (cb) cb.addEventListener('click', () => toggle(false));
    renderPanel();
  }

  function toggle(open) {
    if (open === undefined) open = !isVisible();
    setVisible(open);
    ensurePanel();
    const panel = document.getElementById('_arsak-panel');
    const btn = document.getElementById('_arsak-toggle');
    if (panel) panel.style.display = open ? 'block' : 'none';
    if (btn) btn.style.background = open ? '#eef2ff' : '#fff';
    if (open) { renderPanel(); const p = document.getElementById('_arsak-panel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }

  // ── Toggle button, placed next to "🗺️ Sýna kort" ─────────────────────
  function injectButton() {
    const mapBtn = document.getElementById('_arsmap-toggle');
    // Prefer sitting in the same flex row as the map toggle.
    if (mapBtn && mapBtn.parentNode) {
      if (document.getElementById('_arsak-toggle')) return true;
      const b = makeBtn();
      mapBtn.parentNode.insertBefore(b, mapBtn);   // to the LEFT of Sýna kort
      return true;
    }
    // Fallback: no map wrapper yet — drop our own right-aligned row at the
    // top of ars-main so the feature is still reachable.
    const main = document.getElementById('ars-main');
    if (!main) return false;
    if (document.getElementById('_arsak-toggle')) return true;
    // Only build a standalone row if the map wrapper truly isn't coming.
    return false;
  }
  function makeBtn() {
    const b = document.createElement('button');
    b.id = '_arsak-toggle';
    b.type = 'button';
    b.textContent = '🚚 Aksturslistar';
    b.style.cssText = 'padding:5px 12px;border:1px solid #cbd5e1;background:' + (isVisible() ? '#eef2ff' : '#fff') + ';color:#0f172a;border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600;margin-right:8px';
    b.addEventListener('click', () => toggle());
    return b;
  }

  // ── Row/card badges on the main table (visible at a glance) ──────────
  function decorate(force) {
    if (_decorating) return;
    const main = document.getElementById('ars-main');
    if (!main) return;
    _decorating = true;
    try {
      main.querySelectorAll('[data-co-id]').forEach(el => {
        const id = parseInt(el.dataset.coId, 10);
        if (!id) return;
        const v = aksturOf(id);
        const prev = el.getAttribute('data-ak-badge') || '0';
        if (!force && String(v) === prev) return;
        el.setAttribute('data-ak-badge', String(v));
        // remove any existing badge
        const old = el.querySelector('._arsak-badge');
        if (old) old.remove();
        if (!v) return;
        const a = AKSTUR[v];
        const badge = document.createElement('span');
        badge.className = '_arsak-badge';
        badge.title = a.label;
        badge.textContent = '🚗' + v;
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:800;color:#fff;background:' + a.dot + ';border-radius:6px;padding:1px 6px;margin-left:6px;vertical-align:middle';
        // place inside the first cell (row) or at the card header
        const host = el.matches('._ars-card')
          ? el.querySelector('div') || el
          : (el.querySelector('td strong') && el.querySelector('td strong').parentNode) || el.querySelector('td') || el;
        if (host) host.appendChild(badge);
      });
    } finally { _decorating = false; }
  }

  // ── Watch ars-main: keep button + badges alive across re-renders ─────
  function watch() {
    const main = document.getElementById('ars-main');
    if (!main) { setTimeout(watch, 500); return; }
    injectButton();
    ensurePanel();
    decorate(true);
    let t = null;
    new MutationObserver(() => {
      if (_decorating) return;
      if (!document.getElementById('_arsak-toggle')) injectButton();
      if (!document.getElementById('_arsak-panel')) { ensurePanel(); }
      clearTimeout(t);
      t = setTimeout(() => decorate(false), 120);
    }).observe(main, { childList: true, subtree: true });
    // AppSettings cross-device changes → refresh badges + panel
    if (window.AppSettings && AppSettings.onChange) {
      AppSettings.onChange(() => { decorate(true); if (isVisible()) renderPanel(); });
    }
  }

  function boot() {
    const t = () => {
      if (document.getElementById('ars-main')) { watch(); return; }
      setTimeout(t, 500);
    };
    t();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.ArsAkstur = { toggle, isOpen: isVisible, render: renderPanel, version: 'v1' };
  console.log('[ars-aksturslistar] v1 installed');
})();
/* === END ARSSKODUN AKSTURSLISTAR === */
