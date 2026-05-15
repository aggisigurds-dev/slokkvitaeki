/* === TODO BOARD v1 ===
   Customisable Kanban-style todo board accessible from the top of the
   sidebar. Highly editable:
     • Columns user-defined (rename, reorder, add/remove)
     • Cards click-to-edit inline: title + body + attachments
     • Drag cards between columns
     • Attachments: file picker, drag-and-drop, paste-image,
       and 📸 screenshot capture with on-canvas crop
     • Data stored in app_settings.settings.todo (synced)
     • Files stored in Supabase Storage bucket "samningar" under
       prefix "todos/<column_id>/<card_id>/<filename>"

   API (window.TodoBoard):
     open(), close(), toggle()

   Boot:
     • Adds a yellow "📋 Verkefni" button at the very top of the sidebar
     • Auto-creates 3 default columns on first run: Að gera / Í vinnslu / Klárað */
(() => {
  if (window.__todoBoardInstalled) return;
  window.__todoBoardInstalled = true;

  const BUCKET = 'samningar';
  const STORAGE_KEY = 'todo';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + ' ' +
           String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function fmtSize(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
    return (b/(1024*1024)).toFixed(1) + ' MB';
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  function defaultData() {
    return {
      columns: [
        { id: uid(), title: 'Að gera',  color: '#dbeafe', cards: [] },
        { id: uid(), title: 'Í vinnslu', color: '#fef3c7', cards: [] },
        { id: uid(), title: 'Klárað',   color: '#dcfce7', cards: [] }
      ],
      updated_at: new Date().toISOString()
    };
  }

  function load() {
    const s = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || null;
    if (!s || !Array.isArray(s.columns) || !s.columns.length) return defaultData();
    return s;
  }
  async function save(data) {
    data.updated_at = new Date().toISOString();
    if (!window.AppSettings || !window.AppSettings.save) return false;
    return await window.AppSettings.save({ [STORAGE_KEY]: data });
  }

  let _data = null;
  let _panel = null;
  let _expandedCard = null; // {colId, cardId}

  // ── Sidebar launcher ─────────────────────────────────────────────────────
  function injectSidebarBtn() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebarBtn, 600); return; }
    if (nav.querySelector('._tb-nav-btn')) return;
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    if (!allBtns.length) { setTimeout(injectSidebarBtn, 600); return; }
    // 2026-05-15: Place right below "Verkdagbók" instead of at the very top.
    const tpl = allBtns[0];
    const verkdagbokBtn = allBtns.find(b => /verkdagb[oó]k/i.test(b.textContent || ''));
    const anchor = verkdagbokBtn || tpl;
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g,'').trim() + ' _tb-nav-btn';
    btn.style.cssText = 'background:linear-gradient(135deg,#f59e0b,#d97706) !important;color:#fff !important;font-weight:700;border:none !important;position:relative';
    btn.innerHTML = '<span style="margin-right:6px">📋</span>Verkefni <span class="_tb-count" style="display:none;margin-left:6px;background:#fff;color:#92400e;font-size:10px;font-weight:800;padding:1px 7px;border-radius:99px"></span>';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(); });
    // Insert AFTER the anchor (Verkdagbók) — i.e. before its nextSibling
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    refreshBadge();
  }

  function refreshBadge() {
    const b = document.querySelector('._tb-count');
    if (!b || !_data) return;
    // Count cards in non-done columns (heuristic: not the last one if titled Klárað)
    let n = 0;
    _data.columns.forEach(c => {
      if (/klárað|done|lokið/i.test(c.title || '')) return;
      n += (c.cards || []).length;
    });
    b.textContent = String(n);
    b.style.display = n > 0 ? 'inline-block' : 'none';
  }

  // ── Open / close panel ───────────────────────────────────────────────────
  // 2026-05-15: Panel docks alongside the sidebar instead of fullscreen-
  // modal, so the user keeps the nav clickable and can flip between
  // Verkefni and other views. Sidebar width is measured at open time so
  // the panel always lines up with whatever layout the user has.
  function sidebarRightEdge() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) return 0;
    const r = nav.getBoundingClientRect();
    return Math.max(0, r.right);
  }
  function mainContentTop() {
    // Slot just under the top banner if one is visible; otherwise top of viewport
    const banner = document.querySelector('.banner, .app-banner, header.banner, [class*="banner"][style*="banner"]');
    return 0;
  }

  async function open() {
    _data = load();
    closePanel();
    const leftPx = sidebarRightEdge();
    const topPx = mainContentTop();
    _panel = document.createElement('div');
    _panel.id = '_tb-panel';
    _panel.style.cssText = 'position:fixed;left:' + leftPx + 'px;right:0;top:' + topPx + 'px;bottom:0;z-index:100020;background:#f1f5f9;display:flex;flex-direction:column;overflow:hidden;font-family:inherit;border-left:1px solid #e2e8f0;box-shadow:-4px 0 14px rgba(0,0,0,0.06)';
    _panel.innerHTML = `
      <div style="padding:12px 22px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-shrink:0">
        <div>
          <h2 style="margin:0;font-size:18px;font-weight:800">📋 Verkefnaspjald</h2>
          <div style="font-size:11px;color:#fef3c7;margin-top:2px">Skjótar nótur, skjáskot, viðhengi · samstillt milli tækja</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="_tb-add-col" type="button" style="padding:8px 14px;background:#fff;color:#92400e;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">+ Nýr dálkur</button>
          <button id="_tb-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:18px;width:34px;height:34px;border-radius:7px;cursor:pointer;line-height:1" title="Loka">✕</button>
        </div>
      </div>
      <div id="_tb-board" style="flex:1;overflow-x:auto;overflow-y:hidden;padding:14px 22px;background:#f1f5f9"></div>`;
    document.body.appendChild(_panel);
    document.addEventListener('keydown', escHandler);
    _panel.querySelector('#_tb-x').addEventListener('click', closePanel);
    _panel.querySelector('#_tb-add-col').addEventListener('click', addColumn);
    // Auto-close when the user clicks any OTHER sidebar nav button — so the
    // Verkefni panel doesn't sit on top of the next view they switched to.
    document.addEventListener('click', sidebarOtherClick, true);
    // Keep panel aligned if sidebar resizes (window resize, sidebar collapse)
    window.addEventListener('resize', realign);
    renderBoard();
  }
  function realign() {
    if (!_panel) return;
    _panel.style.left = sidebarRightEdge() + 'px';
  }
  function sidebarOtherClick(e) {
    const btn = e.target && e.target.closest && e.target.closest('.vnav-btn, [data-view]');
    if (!btn) return;
    // If the click was on the Verkefni button itself, ignore (it'll just re-open)
    if (btn.classList && btn.classList.contains('_tb-nav-btn')) return;
    if (/verkefni/i.test(btn.textContent || '')) return;
    // Any other nav click → close the panel so the next view is visible
    closePanel();
  }
  function escHandler(e) { if (e.key === 'Escape' && !_expandedCard) closePanel(); }
  function closePanel() {
    document.removeEventListener('keydown', escHandler);
    document.removeEventListener('click', sidebarOtherClick, true);
    window.removeEventListener('resize', realign);
    _panel?.remove(); _panel = null; _expandedCard = null;
    refreshBadge();
  }
  function toggle() { _panel ? closePanel() : open(); }

  // ── Render board ─────────────────────────────────────────────────────────
  function renderBoard() {
    const board = _panel?.querySelector('#_tb-board');
    if (!board) return;
    board.innerHTML = '<div style="display:flex;gap:14px;align-items:flex-start;min-height:0;height:100%;padding-bottom:14px"></div>';
    const wrap = board.firstChild;
    _data.columns.forEach((col, ci) => {
      const colEl = document.createElement('div');
      colEl.className = '_tb-col';
      colEl.dataset.colId = col.id;
      colEl.style.cssText = 'min-width:320px;max-width:340px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;display:flex;flex-direction:column;max-height:100%;overflow:hidden;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.04)';
      const cardsHTML = (col.cards || []).map(c => renderCard(col, c)).join('');
      colEl.innerHTML = `
        <div style="padding:10px 13px;background:${esc(col.color || '#dbeafe')};display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;cursor:pointer" class="_tb-col-hd">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
            <span style="font-size:14px;cursor:grab" title="Færa dálk" class="_tb-col-grab">⋮⋮</span>
            <input class="_tb-col-title" value="${esc(col.title)}" placeholder="Heiti dálks" style="flex:1;background:transparent;border:none;font:inherit;font-weight:700;color:#0f172a;font-size:14px;outline:none;padding:2px 4px;border-radius:4px">
            <span style="font-size:10px;color:#64748b;background:rgba(255,255,255,0.7);padding:1px 7px;border-radius:99px;font-weight:700">${(col.cards||[]).length}</span>
          </div>
          <button class="_tb-col-del" type="button" title="Eyða dálk" style="background:transparent;border:none;color:#64748b;cursor:pointer;font-size:14px;padding:2px 6px">✕</button>
        </div>
        <div class="_tb-cards" style="flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px">${cardsHTML}</div>
        <div style="padding:8px 10px;border-top:1px solid #f1f5f9">
          <button class="_tb-add-card" type="button" style="width:100%;padding:7px 10px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;color:#475569">+ Bæta við korti</button>
        </div>
      `;
      wrap.appendChild(colEl);
      wireColumn(colEl, col);
    });
    // If a card was expanded before re-render, re-expand it
    if (_expandedCard) {
      const ce = wrap.querySelector('._tb-card[data-card-id="' + _expandedCard.cardId + '"]');
      if (ce) expandCard(ce, _expandedCard.colId, _expandedCard.cardId);
    }
  }

  function renderCard(col, card) {
    const atts = (card.attachments || []);
    const thumbs = atts.slice(0, 4).map(a => {
      if (a.type && a.type.startsWith('image/') && a.url) {
        return '<div style="width:28px;height:28px;border-radius:4px;border:1px solid #e2e8f0;background:#fff center/cover no-repeat url(\'' + esc(a.url) + '\')"></div>';
      }
      return '<div style="width:28px;height:28px;border-radius:4px;border:1px solid #e2e8f0;background:#f8fafc;display:flex;align-items:center;justify-content:center;font-size:13px">📎</div>';
    }).join('');
    return `
      <div class="_tb-card" data-card-id="${esc(card.id)}" data-col-id="${esc(col.id)}" draggable="true"
        style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:9px 11px;cursor:pointer;transition:all .15s;box-shadow:0 1px 2px rgba(0,0,0,0.04)">
        <div style="font-weight:600;color:#0f172a;font-size:13px;line-height:1.35;word-break:break-word">${esc(card.title || '(nafnlaust)')}</div>
        ${card.body ? '<div style="font-size:11.5px;color:#64748b;margin-top:3px;line-height:1.3;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(card.body) + '</div>' : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
          <div style="display:flex;gap:3px">${thumbs}${atts.length>4 ? '<span style="font-size:10px;color:#64748b;align-self:center;margin-left:4px">+' + (atts.length-4) + '</span>' : ''}</div>
          <span style="font-size:9.5px;color:#94a3b8">${esc(fmtDate(card.updated_at || card.created_at))}</span>
        </div>
      </div>`;
  }

  // ── Column events ────────────────────────────────────────────────────────
  function wireColumn(colEl, col) {
    // Title rename
    const titleInp = colEl.querySelector('._tb-col-title');
    titleInp.addEventListener('change', async () => {
      col.title = titleInp.value.trim() || col.title;
      await save(_data);
    });
    // Delete column
    colEl.querySelector('._tb-col-del').addEventListener('click', async () => {
      if ((col.cards || []).length && !window.confirm('Eyða dálkinum "' + col.title + '" og ' + col.cards.length + ' kort?')) return;
      _data.columns = _data.columns.filter(c => c.id !== col.id);
      await save(_data);
      renderBoard();
    });
    // Add card
    colEl.querySelector('._tb-add-card').addEventListener('click', async () => {
      const card = { id: uid(), title: '', body: '', attachments: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      col.cards = col.cards || [];
      col.cards.unshift(card);
      await save(_data);
      renderBoard();
      // Expand right away so user can type
      const ce = _panel.querySelector('._tb-card[data-card-id="' + card.id + '"]');
      if (ce) expandCard(ce, col.id, card.id);
    });
    // Wire each card
    colEl.querySelectorAll('._tb-card').forEach(ce => wireCard(ce));
    // Allow drop INTO this column's cards container
    const cardsBox = colEl.querySelector('._tb-cards');
    cardsBox.addEventListener('dragover', e => { e.preventDefault(); cardsBox.style.background = '#fef9c3'; });
    cardsBox.addEventListener('dragleave', () => { cardsBox.style.background = ''; });
    cardsBox.addEventListener('drop', async e => {
      e.preventDefault();
      cardsBox.style.background = '';
      const cardId = e.dataTransfer.getData('text/card-id');
      const fromCol = e.dataTransfer.getData('text/col-id');
      if (!cardId) return; // could be a file drop — handled separately below
      if (fromCol === col.id) return; // same column, no-op for v1
      moveCardToColumn(cardId, fromCol, col.id);
    });
  }

  function moveCardToColumn(cardId, fromColId, toColId) {
    const from = _data.columns.find(c => c.id === fromColId);
    const to   = _data.columns.find(c => c.id === toColId);
    if (!from || !to) return;
    const idx = from.cards.findIndex(c => c.id === cardId);
    if (idx < 0) return;
    const card = from.cards.splice(idx, 1)[0];
    card.updated_at = new Date().toISOString();
    to.cards.unshift(card);
    save(_data).then(renderBoard);
  }

  // ── Card events + expanded editor ────────────────────────────────────────
  function wireCard(ce) {
    const cardId = ce.dataset.cardId;
    const colId  = ce.dataset.colId;
    ce.addEventListener('click', () => expandCard(ce, colId, cardId));
    ce.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/card-id', cardId);
      e.dataTransfer.setData('text/col-id', colId);
      e.dataTransfer.effectAllowed = 'move';
      ce.style.opacity = '0.4';
    });
    ce.addEventListener('dragend', () => { ce.style.opacity = ''; });
  }

  function expandCard(cardEl, colId, cardId) {
    const col = _data.columns.find(c => c.id === colId);
    const card = col && col.cards.find(c => c.id === cardId);
    if (!card) return;
    _expandedCard = { colId, cardId };
    // Build editor inline below
    const editor = document.createElement('div');
    editor.className = '_tb-editor';
    editor.style.cssText = 'margin-top:6px;background:#fff;border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;box-shadow:0 4px 14px rgba(0,0,0,0.08)';
    editor.innerHTML = `
      <input class="_tbe-title" placeholder="Titill" value="${esc(card.title || '')}"
        style="width:100%;font-weight:700;font-size:14px;color:#0f172a;border:1px solid #e2e8f0;border-radius:6px;padding:7px 9px;box-sizing:border-box;outline:none">
      <textarea class="_tbe-body" placeholder="Lýsing, nótur, krækjur, athugasemdir…"
        style="width:100%;margin-top:6px;min-height:80px;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;font:inherit;font-size:12.5px;color:#0f172a;resize:vertical;box-sizing:border-box;outline:none">${esc(card.body || '')}</textarea>
      <div class="_tbe-atts" style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:5px"></div>
      <div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:5px;align-items:center">
        <button class="_tbe-file" type="button" style="padding:5px 10px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;color:#475569">📎 Skrá</button>
        <button class="_tbe-shot" type="button" style="padding:5px 10px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;color:#475569">📸 Skjáskot</button>
        <div style="font-size:10.5px;color:#94a3b8;margin-left:6px">eða dragðu skrár hingað · líma mynd ✓</div>
        <div style="flex:1"></div>
        <button class="_tbe-del" type="button" style="padding:5px 10px;background:#fff;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;color:#dc2626">🗑 Eyða</button>
        <button class="_tbe-close" type="button" style="padding:5px 12px;background:#16a34a;border:none;color:#fff;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">✓ Loka</button>
      </div>
      <input type="file" class="_tbe-fileinp" hidden multiple>
    `;
    cardEl.insertAdjacentElement('afterend', editor);
    cardEl.style.opacity = '0.4';
    cardEl.style.pointerEvents = 'none';

    const titleInp = editor.querySelector('._tbe-title');
    const bodyInp  = editor.querySelector('._tbe-body');
    const attsBox  = editor.querySelector('._tbe-atts');
    const fileBtn  = editor.querySelector('._tbe-file');
    const fileInp  = editor.querySelector('._tbe-fileinp');
    const shotBtn  = editor.querySelector('._tbe-shot');
    const delBtn   = editor.querySelector('._tbe-del');
    const closeBtn = editor.querySelector('._tbe-close');

    titleInp.focus();
    if (!card.title) titleInp.select(); else titleInp.setSelectionRange(titleInp.value.length, titleInp.value.length);

    function renderAtts() {
      attsBox.innerHTML = (card.attachments || []).map((a, i) => {
        const isImg = a.type && a.type.startsWith('image/');
        const inner = isImg && a.url
          ? '<div style="width:100%;height:60px;background:#f8fafc center/cover no-repeat url(\'' + esc(a.url) + '\');border-radius:5px"></div>'
          : '<div style="width:100%;height:60px;background:#f8fafc;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:20px">📎</div>';
        return '<div class="_tbe-att" data-i="' + i + '" style="position:relative;border:1px solid #e2e8f0;border-radius:6px;padding:3px;cursor:pointer" title="' + esc(a.name || '') + ' · ' + esc(fmtSize(a.size)) + '">'
          + inner
          + '<div style="font-size:9.5px;color:#475569;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(a.name || '') + '</div>'
          + '<button data-rm="' + i + '" type="button" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#dc2626;color:#fff;border:none;font-size:11px;cursor:pointer;line-height:1">×</button>'
          + '</div>';
      }).join('');
      attsBox.querySelectorAll('._tbe-att').forEach(el => {
        el.addEventListener('click', e => {
          if (e.target.dataset.rm != null) return; // remove button
          const a = card.attachments[+el.dataset.i];
          if (a && a.url) window.open(a.url, '_blank');
        });
      });
      attsBox.querySelectorAll('button[data-rm]').forEach(b => {
        b.addEventListener('click', async e => {
          e.stopPropagation();
          const i = +b.dataset.rm;
          if (!window.confirm('Eyða viðhenginu?')) return;
          card.attachments.splice(i, 1);
          card.updated_at = new Date().toISOString();
          await save(_data);
          renderAtts();
          // Also re-render the underlying card thumbnail
          renderBoard();
        });
      });
    }
    renderAtts();

    // Auto-save title/body on blur
    let saveTimer;
    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        card.title = titleInp.value;
        card.body  = bodyInp.value;
        card.updated_at = new Date().toISOString();
        await save(_data);
      }, 600);
    }
    titleInp.addEventListener('input', scheduleSave);
    bodyInp.addEventListener('input', scheduleSave);

    // File upload via picker
    fileBtn.addEventListener('click', () => fileInp.click());
    fileInp.addEventListener('change', async e => {
      const files = Array.from(e.target.files || []);
      for (const f of files) await uploadFile(card, f);
      renderAtts();
      renderBoard();
    });

    // Drag-and-drop files onto editor
    editor.addEventListener('dragover', e => { e.preventDefault(); editor.style.borderColor = '#16a34a'; });
    editor.addEventListener('dragleave', () => { editor.style.borderColor = '#f59e0b'; });
    editor.addEventListener('drop', async e => {
      e.preventDefault();
      editor.style.borderColor = '#f59e0b';
      const files = Array.from(e.dataTransfer.files || []);
      if (!files.length) return;
      for (const f of files) await uploadFile(card, f);
      renderAtts();
      renderBoard();
    });

    // Paste image directly (Ctrl+V on the textarea/title)
    function handlePaste(e) {
      const items = (e.clipboardData || {}).items || [];
      for (const it of items) {
        if (it.kind === 'file') {
          const f = it.getAsFile();
          if (f && f.type.startsWith('image/')) {
            e.preventDefault();
            uploadFile(card, f).then(() => { renderAtts(); renderBoard(); });
            return;
          }
        }
      }
    }
    titleInp.addEventListener('paste', handlePaste);
    bodyInp.addEventListener('paste', handlePaste);

    // Screenshot
    shotBtn.addEventListener('click', () => takeScreenshot(card, () => { renderAtts(); renderBoard(); }));

    // Delete card
    delBtn.addEventListener('click', async () => {
      if (!window.confirm('Eyða kortinu?')) return;
      col.cards = col.cards.filter(c => c.id !== card.id);
      _expandedCard = null;
      await save(_data);
      renderBoard();
    });

    // Close
    closeBtn.addEventListener('click', async () => {
      clearTimeout(saveTimer);
      card.title = titleInp.value;
      card.body  = bodyInp.value;
      card.updated_at = new Date().toISOString();
      _expandedCard = null;
      await save(_data);
      renderBoard();
    });
  }

  // ── Upload a file to Supabase storage ────────────────────────────────────
  async function uploadFile(card, file) {
    if (!file) return;
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const path = 'todos/' + (card.id || 'misc') + '/' + Date.now() + '_' + safeName;
    try {
      const up = await SB.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (up.error) throw up.error;
      const signed = await SB.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365); // 1y url
      const url = signed.data && signed.data.signedUrl;
      const att = {
        id: uid(),
        name: file.name,
        path: path,
        type: file.type,
        size: file.size,
        url: url || '',
        uploaded_at: new Date().toISOString()
      };
      card.attachments = card.attachments || [];
      card.attachments.push(att);
      card.updated_at = new Date().toISOString();
      await save(_data);
    } catch (e) {
      console.warn('[todo-board] upload failed:', e);
      alert('Vista mistókst: ' + (e.message || e));
    }
  }

  // ── Screenshot + crop ────────────────────────────────────────────────────
  async function takeScreenshot(card, onDone) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert('Vafrinn styður ekki skjáskot (getDisplayMedia). Reyndu Chrome eða Edge.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' }, audio: false });
    } catch (e) {
      // User cancelled or denied
      return;
    }
    const video = document.createElement('video');
    video.srcObject = stream;
    video.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
    document.body.appendChild(video);
    await video.play();
    // Wait one frame so dimensions are known
    await new Promise(r => requestAnimationFrame(r));
    const w = video.videoWidth || 1920;
    const h = video.videoHeight || 1080;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    // Stop the stream right away
    stream.getTracks().forEach(t => t.stop());
    video.remove();
    // Open crop UI
    openCropDialog(canvas, async blob => {
      if (!blob) return;
      const file = new File([blob], 'skjaskot_' + Date.now() + '.png', { type: 'image/png' });
      await uploadFile(card, file);
      if (onDone) onDone();
    });
  }

  function openCropDialog(sourceCanvas, onSave) {
    document.getElementById('_tb-crop')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_tb-crop';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;font-family:inherit';
    dlg.innerHTML = `
      <div style="color:#fff;font-size:14px;margin-bottom:10px;text-align:center">
        Dragðu til að klippa svæðið sem þú vilt vista · ESC til að hætta við
      </div>
      <div id="_tb-crop-wrap" style="position:relative;display:inline-block;border:1px solid #475569;box-shadow:0 10px 40px rgba(0,0,0,0.5);background:#000;max-width:96vw;max-height:80vh;overflow:hidden">
        <canvas id="_tb-crop-canvas" style="display:block;max-width:96vw;max-height:80vh;cursor:crosshair;background:#000"></canvas>
        <div id="_tb-crop-rect" style="position:absolute;border:2px dashed #f59e0b;background:rgba(245,158,11,0.15);pointer-events:none;display:none"></div>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px">
        <button id="_tb-crop-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>
        <button id="_tb-crop-full" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Vista allt skjáskot</button>
        <button id="_tb-crop-save" type="button" disabled style="padding:9px 18px;border:none;border-radius:8px;background:#16a34a;color:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:700;opacity:.5">✓ Vista valið</button>
      </div>`;
    document.body.appendChild(dlg);
    const canvas = dlg.querySelector('#_tb-crop-canvas');
    const wrap = dlg.querySelector('#_tb-crop-wrap');
    const rectEl = dlg.querySelector('#_tb-crop-rect');
    const sw = sourceCanvas.width, sh = sourceCanvas.height;
    // Fit canvas inside max display area
    const maxW = Math.min(window.innerWidth * 0.96, 1600);
    const maxH = Math.min(window.innerHeight * 0.80, 1000);
    const scale = Math.min(maxW / sw, maxH / sh, 1);
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    canvas.getContext('2d').drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

    let dragging = false, sx = 0, sy = 0, ex = 0, ey = 0;
    function updRect() {
      const x = Math.min(sx, ex), y = Math.min(sy, ey);
      const w = Math.abs(ex - sx), h = Math.abs(ey - sy);
      rectEl.style.left = x + 'px';
      rectEl.style.top = y + 'px';
      rectEl.style.width = w + 'px';
      rectEl.style.height = h + 'px';
      rectEl.style.display = (w > 4 && h > 4) ? 'block' : 'none';
      const saveBtn = dlg.querySelector('#_tb-crop-save');
      const ok = w > 4 && h > 4;
      saveBtn.disabled = !ok;
      saveBtn.style.opacity = ok ? '1' : '0.5';
    }
    canvas.addEventListener('mousedown', e => {
      const r = canvas.getBoundingClientRect();
      sx = e.clientX - r.left; sy = e.clientY - r.top;
      ex = sx; ey = sy;
      dragging = true;
      updRect();
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      const r = canvas.getBoundingClientRect();
      ex = Math.max(0, Math.min(canvas.width, e.clientX - r.left));
      ey = Math.max(0, Math.min(canvas.height, e.clientY - r.top));
      updRect();
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    function closeCrop() { dlg.remove(); }
    dlg.querySelector('#_tb-crop-cancel').addEventListener('click', () => { onSave(null); closeCrop(); });
    document.addEventListener('keydown', function k(e) {
      if (e.key === 'Escape' && document.body.contains(dlg)) {
        e.preventDefault();
        onSave(null); closeCrop();
        document.removeEventListener('keydown', k);
      }
    });
    dlg.querySelector('#_tb-crop-full').addEventListener('click', () => {
      sourceCanvas.toBlob(b => { onSave(b); closeCrop(); }, 'image/png');
    });
    dlg.querySelector('#_tb-crop-save').addEventListener('click', () => {
      const x = Math.round(Math.min(sx, ex) / scale);
      const y = Math.round(Math.min(sy, ey) / scale);
      const w = Math.round(Math.abs(ex - sx) / scale);
      const h = Math.round(Math.abs(ey - sy) / scale);
      if (w < 5 || h < 5) return;
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      out.getContext('2d').drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
      out.toBlob(b => { onSave(b); closeCrop(); }, 'image/png');
    });
  }

  // ── Add column ───────────────────────────────────────────────────────────
  async function addColumn() {
    const palette = ['#dbeafe','#fef3c7','#dcfce7','#fce7f3','#e9d5ff','#fee2e2','#cffafe'];
    const used = new Set(_data.columns.map(c => c.color));
    const color = palette.find(p => !used.has(p)) || palette[Math.floor(Math.random()*palette.length)];
    _data.columns.push({ id: uid(), title: 'Nýr dálkur', color, cards: [] });
    await save(_data);
    renderBoard();
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  injectSidebarBtn();
  setTimeout(injectSidebarBtn, 1500);
  if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.AppSettings.onChange(() => { _data = load(); refreshBadge(); });
  }
  // Initial badge load
  _data = load();
  refreshBadge();

  // Public API
  window.TodoBoard = { open, close: closePanel, toggle };
  console.log('[patch-145] todo-board installed — window.TodoBoard.open()');
})();
/* === END TODO BOARD === */
