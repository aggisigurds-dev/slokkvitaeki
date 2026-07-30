/* === SIDEBAR CUSTOMIZER v1 ===
 *
 * Lets the user reorder the side-panel manually. Stores the chosen order in
 * AppSettings.sidebar_order (flat array of label-substring strings, with the
 * literal "__SEP__" entry standing in for a separator). AppSettings.sidebar_
 * hidden stores labels the user wants hidden entirely.
 *
 * Trigger: a small "⚙️ Aðlaga hliðarstiku" button injected at the bottom of
 * the side-nav. Public API window.SidebarCustomizer.open() — patches that
 * want their own settings entry can link directly.
 *
 * Reorder UX: each row in the modal carries ▲ ▼ buttons + a visibility
 * checkbox + a "+ Skil" button to insert a separator after that row. Save
 * persists to AppSettings, which patch 68 listens for to re-render the nav.
 */
(() => {
  if (window.__sidebarCustomizerInstalled) return;
  window.__sidebarCustomizerInstalled = true;

  const SEP = '__SEP__';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function btnText(b) {
    // RAW label incl. any badge text — kept identical to patch 68's btnText so
    // the '#label' fallback navId matches on both sides (buttons without a
    // data-view). Do NOT strip badges here.
    return String(b.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function btnLabel(b) {
    // DISPLAY label: drop the live badge/count node (e.g. "Afgreiðsla 65" →
    // "Afgreiðsla", "Þjónustutæki 3293" → "Þjónustutæki") and the leading emoji
    // so the editor row reads clean. Display-only — never used for the saved id.
    let t;
    try {
      const c = b.cloneNode(true);
      c.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n => n.remove());
      t = String(c.textContent || '').replace(/\s+/g, ' ').trim();
    } catch (_) { t = btnText(b); }
    t = t.replace(/^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/u, '').trim();
    t = t.replace(/\s+\d+$/, '').trim();   // strip a trailing badge number not in a badge node
    return t || btnText(b);
  }
  // Stable id — must match patch 68's navId(): data-view (preferred) else a
  // '#'-prefixed normalised full label. We persist this (not the label) so the
  // saved order survives label/emoji edits and never collides across tabs.
  function navId(b) {
    const dv = b.getAttribute && b.getAttribute('data-view');
    if (dv) return dv;
    return '#' + String(b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // Read the ACTUAL visual order the user sees. 2026-07-01: patch 68 v2 positions
  // nav buttons with CSS `order` and NEVER moves DOM nodes — so `nav.children`
  // order is just injection order, unrelated to what's on screen. Rebasing that
  // against the saved order (old approach) drifted further still: buttons not in
  // the saved list got tail-appended here, but patch 68 heals them into their
  // canonical slot — so the editor listed a different order than the real rail.
  // Now we sort by the effective CSS `order` value (that IS the on-screen order)
  // and rebuild the group separators from patch 68's `.nav-grp-start` marks, so
  // the editor mirrors the sidebar exactly.
  function readCurrentOrder() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) return { items: [], all: [] };
    const hiddenRaw = (window.AppSettings && AppSettings.path && AppSettings.path('sidebar_hidden')) || [];
    const btns = Array.from(nav.querySelectorAll('.vnav-btn'))
      .filter(el => !el.classList.contains('_sc-launcher'));
    const seen = new Set();
    const entries = [];
    let anyPlaced = false;
    btns.forEach((el, domIdx) => {
      const id = navId(el);
      if (seen.has(id)) return;          // dedupe re-cloned/duplicate buttons
      seen.add(id);
      const label = btnLabel(el);
      if (!label) return;
      let ord = parseFloat(el.style.order || (window.getComputedStyle(el).order));
      if (Number.isFinite(ord) && ord > 0) anyPlaced = true;
      // Unplaced/hidden (order 0) → park at the tail in DOM order so nothing is
      // lost and hidden items are reachable to re-enable.
      if (!Number.isFinite(ord) || ord <= 0) ord = 1e6 + domIdx;
      const hidden = el.style.display === 'none' || hiddenRaw.some(h => String(h) === id);
      entries.push({ id, label, hidden, ord, domIdx, grpStart: el.classList.contains('nav-grp-start') });
    });
    // If patch 68 hasn't placed anything yet (very early open), fall back to DOM
    // order so we still show a sane list instead of everything in the tail.
    entries.sort((a, b) => (anyPlaced ? (a.ord - b.ord) : (a.domIdx - b.domIdx)) || a.domIdx - b.domIdx);
    const items = [];
    const all = [];
    entries.forEach((e, i) => {
      if (anyPlaced && e.grpStart && items.length) items.push({ type: 'sep' });
      const it = { type: 'item', id: e.id, label: e.label, hidden: e.hidden };
      items.push(it);
      all.push({ type: 'item', id: e.id, label: e.label, hidden: e.hidden });
    });
    return { items, all };
  }

  let _state = { items: [] };

  function open() {
    document.getElementById('_sc-modal')?.remove();
    const snap = readCurrentOrder();
    _state.items = snap.items;
    const dlg = document.createElement('div');
    dlg.id = '_sc-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100070;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;padding:18px;font-family:inherit';
    dlg.innerHTML = '' +
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);' +
        'width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 60px);' +
        'display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h2 style="margin:0;font-size:16px;font-weight:700">🎨 Aðlaga hliðarstiku</h2>' +
            '<div style="font-size:11px;color:#cbd5e1;margin-top:2px">Færðu liði upp/niður · faldu þá sem þú þarft ekki · „+ Lína" setur daufa flokkunar-línu</div>' +
          '</div>' +
          '<button id="_sc-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:16px;line-height:1">✕</button>' +
        '</div>' +
        '<div id="_sc-list" style="flex:1;overflow-y:auto;padding:10px 14px;background:#f8fafc"></div>' +
        '<div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:space-between;background:#fff;flex-wrap:wrap">' +
          '<button id="_sc-reset" type="button" style="padding:8px 14px;border:1px solid #cbd5e1;background:#fff;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;color:#475569">↺ Sjálfgefið</button>' +
          '<div style="display:flex;gap:6px">' +
            '<button id="_sc-cancel" type="button" style="padding:8px 14px;border:1px solid #cbd5e1;background:#fff;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;color:#475569">Hætta við</button>' +
            '<button id="_sc-save" type="button" style="padding:8px 16px;border:none;background:#16a34a;color:#fff;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700">💾 Vista röð</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });
    dlg.querySelector('#_sc-x').addEventListener('click', () => dlg.remove());
    dlg.querySelector('#_sc-cancel').addEventListener('click', () => dlg.remove());
    dlg.querySelector('#_sc-save').addEventListener('click', save);
    dlg.querySelector('#_sc-reset').addEventListener('click', resetDefaults);
    wireListDelegation(dlg.querySelector('#_sc-list'));
    renderList();
  }

  function renderList() {
    const root = document.getElementById('_sc-list');
    if (!root) return;
    root.innerHTML = _state.items.map((it, i) => {
      if (it.type === 'sep') {
        return '<div data-i="' + i + '" style="margin:4px 0;padding:6px 10px;background:#dbe2ea;border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:8px">' +
          '<span style="font-size:11px;font-weight:800;color:#1e293b;letter-spacing:.04em;text-transform:uppercase">— Dauf lína —</span>' +
          '<span style="display:flex;gap:4px">' +
            '<button class="_sc-up"   data-i="' + i + '" type="button" title="Færa upp" style="background:#fff;border:1px solid #cbd5e1;border-radius:5px;width:26px;height:24px;cursor:pointer;font-size:11px">▲</button>' +
            '<button class="_sc-down" data-i="' + i + '" type="button" title="Færa niður" style="background:#fff;border:1px solid #cbd5e1;border-radius:5px;width:26px;height:24px;cursor:pointer;font-size:11px">▼</button>' +
            '<button class="_sc-rm"   data-i="' + i + '" type="button" title="Fjarlægja skil" style="background:#fff;border:1px solid #fecaca;color:#dc2626;border-radius:5px;width:26px;height:24px;cursor:pointer;font-size:13px;line-height:1">×</button>' +
          '</span>' +
        '</div>';
      }
      // Hidden rows: keep the label FULLY readable (no opacity — that was the
      // "near-invisible" bug). Signal hidden via a muted background + a strike
      // through the label + a readable muted ink, so it still passes contrast.
      const dim = it.hidden;
      const rowBg = dim ? '#eef2f6' : '#fff';
      const rowBd = dim ? '#cbd5e1' : '#e2e8f0';
      const labelInk = dim ? '#475569' : '#0f172a';
      const strike = dim ? ';text-decoration:line-through;text-decoration-color:#94a3b8' : '';
      return '<div data-i="' + i + '" style="padding:8px 10px;background:' + rowBg + ';border:1px solid ' + rowBd + ';border-radius:7px;margin-bottom:5px;display:flex;align-items:center;justify-content:space-between;gap:8px">' +
        '<label style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer;font-size:13px;color:' + labelInk + '">' +
          '<input class="_sc-vis" data-i="' + i + '" type="checkbox" ' + (it.hidden ? '' : 'checked') + ' style="width:16px;height:16px;cursor:pointer">' +
          '<span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' + strike + '">' + esc(it.label) + '</span>' +
        '</label>' +
        '<span style="display:flex;gap:4px">' +
          '<button class="_sc-up"   data-i="' + i + '" type="button" title="Færa upp" style="background:#fff;border:1px solid #cbd5e1;border-radius:5px;width:26px;height:24px;cursor:pointer;font-size:11px">▲</button>' +
          '<button class="_sc-down" data-i="' + i + '" type="button" title="Færa niður" style="background:#fff;border:1px solid #cbd5e1;border-radius:5px;width:26px;height:24px;cursor:pointer;font-size:11px">▼</button>' +
          '<button class="_sc-sep"  data-i="' + i + '" type="button" title="Bæta við daufri línu fyrir neðan — flokkar valmyndina" style="background:#fff;border:1px solid #cbd5e1;color:#64748b;border-radius:5px;height:24px;padding:0 7px;cursor:pointer;font-size:11px;font-weight:600">+ Lína</button>' +
        '</span>' +
      '</div>';
    }).join('');
    // Row controls are handled by ONE delegated listener wired in open() — see
    // wireListDelegation(). Re-attaching per-row listeners here on every ▲▼ was
    // the reorder lag (N rows × 5 listeners rebuilt each click); now renderList
    // is a pure innerHTML swap so moves are instant.
  }
  // Delegated handlers for the row ▲ ▼ + Lína/× buttons and the visibility
  // checkbox. Attached once per modal open on the persistent #_sc-list element,
  // so every subsequent renderList() innerHTML rebuild is covered automatically.
  function wireListDelegation(listEl) {
    listEl.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button[data-i]');
      if (!b || !listEl.contains(b)) return;
      const i = +b.dataset.i;
      if (b.classList.contains('_sc-up')) moveItem(i, -1);
      else if (b.classList.contains('_sc-down')) moveItem(i, 1);
      else if (b.classList.contains('_sc-sep')) insertSepAfter(i);
      else if (b.classList.contains('_sc-rm')) removeItem(i);
    });
    listEl.addEventListener('change', e => {
      const cb = e.target.closest && e.target.closest('input._sc-vis[data-i]');
      if (!cb || !listEl.contains(cb)) return;
      _state.items[+cb.dataset.i].hidden = !cb.checked;
      renderList();
    });
  }
  function moveItem(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= _state.items.length) return;
    const tmp = _state.items[i];
    _state.items[i] = _state.items[j];
    _state.items[j] = tmp;
    renderList();
  }
  function insertSepAfter(i) {
    _state.items.splice(i + 1, 0, { type: 'sep' });
    renderList();
  }
  function removeItem(i) {
    _state.items.splice(i, 1);
    renderList();
  }

  async function save() {
    if (!window.AppSettings || !AppSettings.save) {
      alert('AppSettings ekki tilbúið'); return;
    }
    // Persist STABLE IDS (data-view), not labels — patch 68 matches by id, so
    // the order survives label edits and never collapses tabs. Tabs that load
    // after this snapshot simply aren't listed and flow to the tail (visible).
    const order = _state.items.map(it => it.type === 'sep' ? SEP : it.id);
    const hidden = _state.items.filter(it => it.type === 'item' && it.hidden).map(it => it.id);
    const ok = await AppSettings.save({ sidebar_order: order, sidebar_hidden: hidden });
    if (!ok) { alert('Vista mistókst'); return; }
    if (window.Toast && Toast.show) Toast.show('✓ Röð vistuð');
    document.getElementById('_sc-modal')?.remove();
    if (window.SidebarReorder && SidebarReorder.scheduleReorder) {
      const nav = document.querySelector('nav.view-nav, .view-nav');
      if (nav) nav.querySelectorAll('.vnav-btn').forEach(b => { b.style.display = ''; });
      SidebarReorder.scheduleReorder();
    }
  }
  async function resetDefaults() {
    if (!window.AppSettings || !AppSettings.save) return;
    if (!confirm('Endurstilla á sjálfgefna röð?')) return;
    // 2026-07-30: `sidebar_order: null` fellur á `Array.isArray`-prófi lesarans
    // (patch 68) sem dettur þá í localStorage-skyndiminnið `sb_order_cache` —
    // sem var aldrei hreinsað. Endurstillingin sagði ✓ en gamla röðin kom aftur
    // við endurhleðslu. Skrifum tómt fylki OG hreinsum skyndiminnið.
    try { localStorage.removeItem('sb_order_cache'); } catch (_) {}
    const ok = await AppSettings.save({ sidebar_order: [], sidebar_hidden: [] });
    if (!ok) { alert('Vista mistókst'); return; }
    if (window.Toast && Toast.show) Toast.show('✓ Endurstillt');
    document.getElementById('_sc-modal')?.remove();
    if (window.SidebarReorder && SidebarReorder.scheduleReorder) {
      const nav = document.querySelector('nav.view-nav, .view-nav');
      if (nav) nav.querySelectorAll('.vnav-btn').forEach(b => { b.style.display = ''; });
      SidebarReorder.scheduleReorder();
    }
  }

  // ── Inject launcher button at the bottom of the sidebar ────────────────
  function injectLauncher() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectLauncher, 800); return; }
    if (nav.querySelector('._sc-launcher')) return;
    const sample = nav.querySelector('.vnav-btn');
    const btn = document.createElement('button');
    btn.className = ((sample && sample.className) || 'vnav-btn').replace(/\bactive\b/g, '').trim() + ' _sc-launcher';
    btn.innerHTML = '<span style="margin-right:6px">🎨</span>Aðlaga hliðarstiku';
    btn.style.opacity = '0.72';
    btn.style.fontSize = '11.5px';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      open();
    });
    nav.appendChild(btn);
  }
  injectLauncher();
  setTimeout(injectLauncher, 1500);

  window.SidebarCustomizer = { open };
  console.log('[patch-171] sidebar customizer ready');
})();
/* === END SIDEBAR CUSTOMIZER === */
