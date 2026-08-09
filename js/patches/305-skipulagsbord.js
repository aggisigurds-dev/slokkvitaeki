/* === SKIPULAGSBORD — 12-rúða skipulagsgriðin (2026-08-09) ===
 *
 * Situr undir dagskráræmunni (#303) í Þjónustuborði (#231).
 * 12 rúður (3 raðir × 4 dálkar) — spjöld með fyrirtækjanafni og stuttri
 * lýsingu úr Þjónustuborðinu sem hægt er að draga á milli rúða og yfir í
 * dagskráræmuna til að bóka í ákveðinn dag.
 *
 * FLÆÐI:
 *   • „📋 Skipulag" á Þjónustuborðs-spjaldi → bæta við á borðið.
 *   • Smella á spjald → hoppa niður á málið í borðinu (verkbord-select event).
 *   • Draga á milli rúða → endurraða.
 *   • Draga yfir dagskrárrúðu → opna dagskrá-glugga forútfylltan; spjald
 *     hverfur af borðinu þegar verk er vistað.
 *   • Litaðir punktar á neðanverðu spjaldi = tegund verks; smella til að velja.
 *   • Markmið (t.d. 5 af 12) sýnir framgang — stillanlegt + / −.
 *
 * GÖGN: AppSettings.path('skipulagsbord.cards')
 *   Spjald: { id, slot, verkbord_id, name, title, type }
 *   type = 0-4 (index í TYPES) eða null
 *
 * API: window.Skipulagsbord = { mount, addFromRow }
 */
(() => {
  if (window.__skipulagsbord) return;
  window.__skipulagsbord = true;

  const SLOT_ID = 'vb-skipulag';
  const SLOTS   = 12;
  const COLS    = 4;

  // Tegund verks — sama listi og í 303-vikudagskra og 231-verkbord
  const TYPES = [
    ['Árskoðun',   '#c3271c'],
    ['Hleðsla',    '#b8770e'],
    ['Uppsetning', '#2c6e9e'],
    ['Verkstæði',  '#5b6470'],
    ['Annað',      '#8a8f98']
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[skipulagsbord]', m); }

  // ── State ──────────────────────────────────────────────────────────────────
  const state = { cards: [], goal: 5, collapsed: false };
  let _drag = null;         // id of card being dragged from the board
  let _pendingRemove = null; // card id to remove after calendar save

  // ── Storage ────────────────────────────────────────────────────────────────
  function readData() {
    const v = window.AppSettings && AppSettings.path ? AppSettings.path('skipulagsbord') : null;
    if (v && Array.isArray(v.cards)) return v;
    // fallback: also check old key name
    const v2 = window.AppSettings && AppSettings.path ? AppSettings.path('skipulagsborg') : null;
    if (v2 && Array.isArray(v2.cards)) return v2;
    try {
      const ls = JSON.parse(localStorage.getItem('bh_sb') || '{}');
      return { cards: Array.isArray(ls.cards) ? ls.cards : [], goal: ls.goal || 5 };
    } catch (_) { return { cards: [], goal: 5 }; }
  }
  async function persist() {
    const data = { cards: state.cards, goal: state.goal };
    render();
    if (window.AppSettings && AppSettings.save) await AppSettings.save({ skipulagsbord: data });
    try { localStorage.setItem('bh_sb', JSON.stringify(data)); } catch (_) {}
  }
  function newId() { return 'sb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function firstFreeSlot() {
    const used = new Set(state.cards.map(c => c.slot));
    for (let i = 0; i < SLOTS; i++) if (!used.has(i)) return i;
    return state.cards.length % SLOTS;
  }

  // Try to detect a TYPES index from row tags/merki
  function detectType(row) {
    const merki = row.merki || row.tags || '';
    for (let i = 0; i < TYPES.length; i++) {
      if (String(merki).indexOf(TYPES[i][0]) !== -1) return i;
    }
    return null;
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('sb-css')) return;
    const s = document.createElement('style');
    s.id = 'sb-css';
    s.textContent = `
      #${SLOT_ID} .sb-slot {
        min-height:74px; border:1.5px dashed #d3d6db; border-radius:11px;
        box-sizing:border-box; transition:border-color .12s, background .12s;
      }
      #${SLOT_ID} .sb-slot.sb-over, #${SLOT_ID} .sb-slot.sb-empty:hover {
        border-color:#2563eb; background:rgba(37,99,235,.06);
      }
      #${SLOT_ID} .sb-slot.sb-empty { cursor:pointer; }
      #${SLOT_ID} .sb-card {
        width:100%; min-height:70px; box-sizing:border-box;
        padding:8px 8px 7px; border-radius:9px;
        background:#fff; border:1px solid #e2e5ea;
        box-shadow:0 1px 4px rgba(0,0,0,.07);
        cursor:grab; display:flex; flex-direction:column; gap:4px;
        transition:box-shadow .12s, transform .1s; user-select:none;
      }
      #${SLOT_ID} .sb-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.14); }
      #${SLOT_ID} .sb-card.sb-dragging { opacity:.35; transform:scale(.96); cursor:grabbing; }
      #${SLOT_ID} .sb-x {
        opacity:0; border:none; background:none; cursor:pointer;
        font-size:12px; color:#9aa0aa; padding:0; line-height:1;
        transition:opacity .1s, color .1s; flex:none;
      }
      #${SLOT_ID} .sb-card:hover .sb-x { opacity:1; }
      #${SLOT_ID} .sb-x:hover { color:#dc2626; }
      #${SLOT_ID} .sb-type-dot {
        display:inline-block; border-radius:50%; cursor:pointer; flex:none;
        transition:transform .1s, box-shadow .1s;
      }
      #${SLOT_ID} .sb-type-dot:hover { transform:scale(1.25); }
      .sb-cal-over {
        border-color:#2563eb !important; outline:2px solid #2563eb;
        outline-offset:-2px; background:rgba(37,99,235,.09) !important;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Live row lookup ────────────────────────────────────────────────────────
  function liveRow(card) {
    try {
      if (window.VerkbordLiveItems) {
        const r = VerkbordLiveItems().find(x => String(x.id) === String(card.verkbord_id));
        if (r) return r;
      }
    } catch (_) {}
    return { customer_nafn: card.name, title: card.title, id: card.verkbord_id };
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function typeDotRow(card) {
    return '<div style="display:flex;align-items:center;gap:4px;margin-top:auto;padding-top:5px;flex-wrap:nowrap">' +
      TYPES.map(function (t, i) {
        const sel = card.type === i;
        const sz  = sel ? '11' : '9';
        return '<span class="sb-type-dot" ' +
          'data-sb-type-cid="' + esc(card.id) + '" data-sb-type-i="' + i + '" ' +
          'title="' + esc(t[0]) + '" ' +
          'style="width:' + sz + 'px;height:' + sz + 'px;background:' + t[1] + ';' +
          (sel ? 'box-shadow:0 0 0 1.5px #fff,0 0 0 3px ' + t[1] + ';opacity:1;' : 'opacity:.55;') +
          '"></span>';
      }).join('') +
      '<span style="font-size:9.5px;color:#94a3b8;margin-left:3px;pointer-events:none;overflow:hidden;' +
        'text-overflow:ellipsis;white-space:nowrap;flex:1">' +
        (card.type != null ? esc(TYPES[card.type][0]) : '') +
      '</span>' +
    '</div>';
  }

  function slotHTML(i) {
    const card = state.cards.find(c => c.slot === i);
    if (!card) {
      return '<div class="sb-slot sb-empty" data-sb-slot="' + i + '" title="Tóm rúða">' +
        '<div style="height:100%;display:flex;align-items:center;justify-content:center;' +
          'color:#d3d6da;font-size:18px;font-weight:300;padding:16px 0;pointer-events:none">+</div>' +
        '</div>';
    }
    const row   = liveRow(card);
    const name  = row.customer_nafn || card.name || '—';
    const title = row.title || card.title || '';
    const tc    = card.type != null ? TYPES[card.type][1] : '#d3d6db';

    return '<div class="sb-slot" data-sb-slot="' + i + '">' +
      '<div class="sb-card" draggable="true" data-sb-card="' + esc(card.id) + '" ' +
        'data-sb-vid="' + esc(card.verkbord_id) + '" title="Smella til að opna málið hér að neðan">' +
        // Header: dot + name + delete
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px">' +
          '<div style="display:flex;align-items:center;gap:5px;overflow:hidden;flex:1;min-width:0">' +
            '<span style="width:9px;height:9px;border-radius:50%;background:' + tc + ';flex:none;' +
              'margin-top:1px;transition:background .15s"></span>' +
            '<span style="font-size:11.5px;font-weight:800;color:#1a1c22;overflow:hidden;' +
              'text-overflow:ellipsis;white-space:nowrap;line-height:1.3">' + esc(name) + '</span>' +
          '</div>' +
          '<button class="sb-x" data-sb-del="' + esc(card.id) + '" title="Fjarlægja">✕</button>' +
        '</div>' +
        // Title
        (title
          ? '<div style="font-size:10.5px;color:#6b7280;line-height:1.4;overflow:hidden;' +
              'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' +
              esc(title) + '</div>'
          : '') +
        // Type picker dots
        typeDotRow(card) +
      '</div></div>';
  }

  function render() {
    const el = document.getElementById(SLOT_ID);
    if (!el) return;
    injectCSS();
    const onBoard = state.cards.length;
    const goalN   = state.goal || 5;

    if (state.collapsed) {
      el.innerHTML =
        '<div style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);' +
          'margin-bottom:16px;overflow:hidden">' +
          '<div data-sb="toggle" style="display:flex;align-items:center;justify-content:space-between;' +
            'gap:12px;background:linear-gradient(180deg,#2e3037,#17181c 55%,#0c0d10);' +
            'padding:7px 12px;cursor:pointer">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span style="font-size:11px;font-weight:800;letter-spacing:1.4px;' +
                'background:linear-gradient(180deg,#96c2a4,#4a8563 45%,#1e4631);' +
                '-webkit-background-clip:text;background-clip:text;color:transparent">SKIPULAGSBORD</span>' +
              '<span style="font-size:12px;color:#9aa0aa">' + onBoard + ' / ' + goalN + ' spjöld</span>' +
            '</div>' +
            '<span style="font-size:12px;color:#9aa0aa;font-weight:700">▼ Víkka</span>' +
          '</div>' +
        '</div>';
      return;
    }

    const slots = [];
    for (let i = 0; i < SLOTS; i++) slots.push(slotHTML(i));

    el.innerHTML =
      '<div style="background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);' +
        'overflow:hidden;margin-bottom:16px;color:#16181d">' +
        // Dökki haus
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;' +
          'flex-wrap:wrap;background:linear-gradient(180deg,#2e3037,#17181c 55%,#0c0d10);' +
          'padding:8px 12px;border-bottom:1px solid #2a2c33">' +
          '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">' +
            '<span style="font-size:11px;font-weight:800;letter-spacing:1.4px;' +
              'background:linear-gradient(180deg,#96c2a4,#4a8563 45%,#1e4631);' +
              '-webkit-background-clip:text;background-clip:text;color:transparent">SKIPULAGSBORD</span>' +
            '<span style="font-size:13px;color:#9aa0aa">Dragðu spjöld á dagskrárrúður</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="display:flex;align-items:center;gap:5px">' +
              '<span style="font-size:11px;color:#9aa0aa">Markmið:</span>' +
              '<span style="font-family:ui-monospace,monospace;font-size:14px;font-weight:800;color:#fff">' +
                onBoard + ' / ' + goalN + '</span>' +
              '<button data-sb="goal-minus" title="Minnka markmið" ' +
                'style="width:22px;height:22px;border:1px solid #3a3d45;border-radius:6px;' +
                'background:#23252c;color:#9aa0aa;cursor:pointer;font-size:13px;font-family:inherit;padding:0">−</button>' +
              '<button data-sb="goal-plus" title="Auka markmið" ' +
                'style="width:22px;height:22px;border:1px solid #3a3d45;border-radius:6px;' +
                'background:#23252c;color:#9aa0aa;cursor:pointer;font-size:13px;font-family:inherit;padding:0">+</button>' +
            '</div>' +
            '<button data-sb="toggle" style="height:26px;padding:0 10px;border:1px solid #3a3d45;' +
              'border-radius:8px;background:#23252c;color:#9aa0aa;cursor:pointer;' +
              'font-family:inherit;font-size:11px;font-weight:700">▲ Fela</button>' +
          '</div>' +
        '</div>' +
        // Grid
        '<div style="padding:10px 12px 12px">' +
          '<div style="display:grid;grid-template-columns:repeat(' + COLS + ',minmax(0,1fr));gap:8px">' +
            slots.join('') +
          '</div>' +
          (onBoard === 0
            ? '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px 0 2px">' +
                'Veldu mál í Þjónustuborðinu og smelltu á <b>📋 Skipulag</b> til að bæta við.</div>'
            : '') +
        '</div>' +
      '</div>';

    wireDrag();
  }

  // ── Drag within board ──────────────────────────────────────────────────────
  function wireDrag() {
    const el = document.getElementById(SLOT_ID);
    if (!el) return;

    el.querySelectorAll('.sb-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        _drag = card.getAttribute('data-sb-card');
        card.classList.add('sb-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'sb:' + _drag);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('sb-dragging');
        _drag = null;
        document.querySelectorAll('.sb-cal-over').forEach(c => c.classList.remove('sb-cal-over'));
      });
    });

    el.querySelectorAll('.sb-slot').forEach(slot => {
      slot.addEventListener('dragover', e => {
        if (!_drag && !window._vdCalDrag) return;
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        slot.classList.add('sb-over');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('sb-over'));
      slot.addEventListener('drop', e => {
        e.preventDefault(); slot.classList.remove('sb-over');
        const toSlot = Number(slot.getAttribute('data-sb-slot'));

        // Dagskrá-verk dregið af dagskrá → spjald á borðið
        if (window._vdCalDrag) {
          const job = window._vdCalDrag;
          window._vdCalDrag = null;
          const typeIdx = TYPES.findIndex(t => t[0] === job.type);
          const targetSlot = state.cards.find(c => c.slot === toSlot) ? firstFreeSlot() : toSlot;
          state.cards.push({ id: newId(), slot: targetSlot, verkbord_id: null,
            name: job.name, title: job.note || '', type: typeIdx >= 0 ? typeIdx : null });
          persist();
          if (window.Vikudagskra && Vikudagskra.removeJob) Vikudagskra.removeJob(job.id);
          return;
        }

        // Spjald flutt milli rúða á borðinu
        if (!_drag) return;
        const from = state.cards.find(c => c.id === _drag);
        if (!from) return;
        const occ = state.cards.find(c => c.slot === toSlot && c.id !== _drag);
        state.cards = state.cards.map(c => {
          if (c.id === _drag) return Object.assign({}, c, { slot: toSlot });
          if (occ && c.id === occ.id) return Object.assign({}, c, { slot: from.slot });
          return c;
        });
        persist();
      });
    });
  }

  // ── Drag to calendar day ───────────────────────────────────────────────────
  document.addEventListener('dragover', e => {
    if (!_drag) return;
    const cell = e.target.closest('[data-vd="day"][data-vd-date]');
    if (!cell) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    cell.classList.add('sb-cal-over');
  });
  document.addEventListener('dragleave', e => {
    const cell = e.target.closest('[data-vd="day"][data-vd-date]');
    if (cell) cell.classList.remove('sb-cal-over');
  });
  document.addEventListener('drop', e => {
    const cell = e.target.closest('[data-vd="day"][data-vd-date]');
    if (!cell || !_drag) return;
    e.preventDefault(); cell.classList.remove('sb-cal-over');
    const date = cell.getAttribute('data-vd-date');
    const card = state.cards.find(c => c.id === _drag);
    if (!card || !date) return;
    _pendingRemove = card.id;
    if (window.Vikudagskra && Vikudagskra.open) {
      Vikudagskra.open(date);
      setTimeout(() => {
        const n = document.getElementById('vd-name');
        if (n) { n.value = card.name; n.setAttribute('data-original', card.name); n.select(); }
        const nt = document.getElementById('vd-note');
        if (nt && card.title) { nt.value = card.title; nt.setAttribute('data-original', card.title); }
      }, 60);
    }
  });

  // When calendar saves → remove the pending card from board
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-vd="save"]');
    if (!btn || !_pendingRemove) return;
    const id = _pendingRemove;
    _pendingRemove = null;
    setTimeout(() => {
      state.cards = state.cards.filter(c => c.id !== id);
      persist();
    }, 200);
  }, true);

  // ── Board click events ─────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const el = document.getElementById(SLOT_ID);
    if (!el || !el.contains(e.target)) return;

    // Type dot picker
    const typeDot = e.target.closest('[data-sb-type-cid]');
    if (typeDot) {
      e.stopPropagation();
      const cid = typeDot.getAttribute('data-sb-type-cid');
      const ti  = Number(typeDot.getAttribute('data-sb-type-i'));
      const card = state.cards.find(c => c.id === cid);
      if (!card) return;
      card.type = (card.type === ti) ? null : ti; // click same → deselect
      persist();
      return;
    }

    // Delete button
    const delBtn = e.target.closest('[data-sb-del]');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.getAttribute('data-sb-del');
      state.cards = state.cards.filter(c => c.id !== id);
      persist();
      return;
    }

    // Board control buttons
    const ctrl = e.target.closest('[data-sb]');
    if (ctrl) {
      const act = ctrl.getAttribute('data-sb');
      if (act === 'toggle')     { state.collapsed = !state.collapsed; render(); return; }
      if (act === 'goal-plus')  { state.goal = Math.min(state.goal + 1, 12); persist(); return; }
      if (act === 'goal-minus') { state.goal = Math.max(state.goal - 1, 1);  persist(); return; }
    }

    // Card click → jump to item in board
    const card = e.target.closest('[data-sb-card]');
    if (card && !e.target.closest('[data-sb-del]') && !e.target.closest('[data-sb-type-cid]')) {
      const vid = card.getAttribute('data-sb-vid');
      if (!vid) return;
      window.dispatchEvent(new CustomEvent('verkbord-select', { detail: { id: Number(vid) } }));
    }
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  function addFromRow(row) {
    if (!row) return;
    if (state.cards.find(c => String(c.verkbord_id) === String(row.id))) {
      toast('📋 Þetta mál er nú þegar á skipulagsbordinu');
      return;
    }
    if (state.collapsed) { state.collapsed = false; }
    const slot = firstFreeSlot();
    state.cards.push({
      id: newId(),
      slot,
      verkbord_id: row.id,
      name:  row.customer_nafn || '',
      title: row.title || '',
      type:  detectType(row)
    });
    persist();
    toast('📋 Bætt á skipulagsbord');
  }

  function mount() {
    if (!document.getElementById(SLOT_ID)) return;
    const data = readData();
    state.cards = data.cards || [];
    state.goal  = data.goal  || 5;
    render();
  }

  if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(mount);

  window.Skipulagsbord = { mount, addFromRow };

  mount();
  window.addEventListener('load', mount);

  console.log('[skipulagsbord] installed');
})();
