/* === AÐSTOÐAR-SPJALD — 🤖 í banner-i + watchlist v1 (238) ====================
 *
 * Fasi 1B af „Aðstoðarmaður"-vísíón (Agnar 2026-06-29).
 *
 * Lítill 🤖 takki birtist í Brunastál-bannernum rétt fyrir klukkuna. Smella
 * opnar lítið spjald með:
 *   1. Toggle „Sýna dots [👁]" — felur/sýnir customer-brief dotana (patch 237)
 *   2. „🔔 Mín watchlist" — listi af punktum sem Agnar hefur skráð
 *   3. „➕ Bæta við punkti" — form með 4 flokk-chip-um:
 *      🔔 Áminning · 🎯 Mynstur · ⚖️ Regla · 🐛 Bug
 *      + titill (alltaf) + valkv. lýsing + valkv. target (kt/sendandi)
 *   4. Hver lista-röð: kafla-merki + titill + 🗑 eyða
 *
 * Geymsla: localStorage `adstod_watchlist_v1` (array af items með id+created_at).
 * Síðar (Fasi 3): sync í Supabase `adstod_rules`/`adstod_tips` + AI les þá í
 * daglegri yfirferð.
 *
 * Insertion: leitar að `.bb-clockbox` í banner og setur 🤖 takkann sem
 * systkini RIGHT BEFORE clockboxinu. Mutation observer endurtekur insertion
 * þegar banner er endurbyggt (brunastal toggle, view-skipti).
 *
 * Engin AI-call ennþá — bara safnar gögnum. Public API:
 *   window.AdstodHub = { open(), close(), addWatch(item), listWatch(),
 *                        removeWatch(id), exportJSON() }
 * ========================================================================== */
(() => {
  if (window.__adstodBannerInstalled) return;
  window.__adstodBannerInstalled = true;

  const WATCH_KEY = 'adstod_watchlist_v1';
  const PANEL_ID = '_ad-panel';
  const BTN_ID = '_ad-aibtn';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function newId() { return 'w_' + Math.random().toString(36).slice(2, 9); }
  function nowISO() { return new Date().toISOString(); }
  function loadWatch() {
    try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '[]') || []; }
    catch (_) { return []; }
  }
  function saveWatch(list) {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(list)); } catch (_) {}
  }

  // Detect what the user is currently looking at so we can pre-link the punkt.
  // Tries (in order): open company detail · open sale · active view slug · null.
  function getCurrentContext() {
    // 1. Visible company detail with [data-co-id]
    const allCoEls = document.querySelectorAll('[data-co-id]');
    for (const el of allCoEls) {
      // Skip elements inside hidden views
      let p = el; let hidden = false;
      while (p && p !== document.body) {
        if (p.style && p.style.display === 'none') { hidden = true; break; }
        if (p.classList && (p.classList.contains('view') || p.id && p.id.indexOf('view-') === 0)) {
          if (p.style.display === 'none' || !p.offsetParent) hidden = true;
          break;
        }
        p = p.parentNode;
      }
      if (hidden) continue;
      // Prefer detail-modal/panel hosts (not list rows)
      const isDetail = el.classList && (el.classList.contains('detail') || el.id && el.id.indexOf('detail') >= 0);
      if (!isDetail && !el.closest('.detail, .modal, [class*="detail"]')) continue;
      const id = el.getAttribute('data-co-id');
      if (!id || !/^\d+$/.test(id)) continue;
      let name = '';
      try {
        const co = window.Companies && Companies.list && Companies.list.find(c => String(c.id) === id);
        if (co) name = co.nafn || '';
      } catch (_) {}
      return { kind: 'customer', id, name: name || ('Fyrirtæki ' + id) };
    }
    // 2. Active view slug from URL hash
    const slug = (location.hash || '').replace(/^#/, '').split(/[?&\/]/)[0];
    if (slug) return { kind: 'view', id: slug, name: slug };
    return null;
  }
  let _ctxAtOpen = null;

  const CATEGORIES = [
    { k: 'remind', ico: '🔔', label: 'Áminning', desc: 'Eitt skipti todo' },
    { k: 'pattern', ico: '🎯', label: 'Mynstur',  desc: 'Endurtekið vandamál sem AI á að vakta' },
    { k: 'rule',    ico: '⚖️', label: 'Regla',    desc: 'Sleppa/breyta hegðun (suppress)' },
    { k: 'bug',     ico: '🐛', label: 'Bug',      desc: 'Kerfisvilla' },
  ];

  function styles() {
    if (document.getElementById('_ad-styles')) return;
    const css = `
.ad-aibtn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(145deg,#1e2740,#0b1226);color:#7ab8ff;font-size:17px;line-height:1;cursor:pointer;margin:0 8px 0 4px;padding:0;box-shadow:0 0 0 1px rgba(122,184,255,.15) inset, 0 1px 3px rgba(0,0,0,.4);transition:transform .12s,background .12s;flex-shrink:0;position:relative}
.ad-aibtn:hover{transform:scale(1.06);background:linear-gradient(145deg,#283456,#0e1834)}
.ad-aibtn.open{background:linear-gradient(145deg,#7ab8ff,#3b82f6);color:#0b1226}
.ad-aibtn .ad-count{position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#dc2626;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:1.5px solid #1e2740;line-height:1}
.ad-aibtn .ad-count:empty{display:none}
.ad-panel{position:fixed;z-index:100060;background:var(--surface,#fff);color:var(--ink1,#0f172a);border:1px solid var(--brd,#e6eaf0);border-radius:14px;box-shadow:0 18px 50px rgba(15,23,42,.25);width:min(360px,calc(100vw - 24px));max-height:min(80vh,560px);display:flex;flex-direction:column;overflow:hidden;animation:adp-in .14s ease-out}
@keyframes adp-in{from{transform:translateY(-6px);opacity:0}to{transform:translateY(0);opacity:1}}
.ad-hd{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px 14px;background:var(--surface2,#f8fafc);border-bottom:1px solid var(--brd,#e6eaf0)}
.ad-hd h4{margin:0;font-size:14px;font-weight:800;letter-spacing:-.01em}
.ad-x{background:none;border:none;font-size:18px;cursor:pointer;color:var(--ink3,#94a3b8);line-height:1;padding:2px 6px}
.ad-bd{flex:1;overflow-y:auto;padding:10px 14px 14px}
.ad-sec{margin-bottom:14px}
.ad-sec-h{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3,#94a3b8);font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}
.ad-tog{display:flex;align-items:center;gap:9px;padding:8px 11px;background:var(--surface2,#f8fafc);border:1px solid var(--brd,#e6eaf0);border-radius:9px;cursor:pointer;user-select:none}
.ad-tog input{margin:0;cursor:pointer}
.ad-tog .lbl{flex:1;font-size:13px;font-weight:600;color:var(--ink1,#0f172a)}
.ad-tog .sub{font-size:11.5px;color:var(--ink3,#94a3b8);margin-top:1px}
.ad-list{display:flex;flex-direction:column;gap:5px}
.ad-row{display:flex;align-items:flex-start;gap:9px;padding:8px 10px;border:1px solid var(--brd,#eef1f5);border-radius:9px;background:var(--surface,#fff)}
.ad-row .ad-cat{flex-shrink:0;font-size:15px;line-height:1.2}
.ad-row .ad-body{flex:1;min-width:0}
.ad-row .ad-title{font-size:13px;font-weight:600;color:var(--ink1,#0f172a);line-height:1.3;word-break:break-word}
.ad-row .ad-meta{font-size:11px;color:var(--ink3,#94a3b8);margin-top:2px}
.ad-row .ad-del{flex-shrink:0;background:none;border:none;color:var(--ink3,#94a3b8);font-size:14px;cursor:pointer;padding:2px 4px;border-radius:5px;line-height:1}
.ad-row .ad-del:hover{color:#dc2626;background:#fef2f2}
.ad-empty{padding:14px;text-align:center;color:var(--ink3,#94a3b8);font-size:12.5px;font-style:italic}
.ad-add{margin-top:8px;width:100%;padding:9px 12px;background:var(--brand,#0d6efd);color:#fff;border:none;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
.ad-add:hover{filter:brightness(1.07)}
.ad-form{margin-top:8px;padding:10px;background:var(--surface2,#f8fafc);border:1px solid var(--brd,#e6eaf0);border-radius:10px;display:flex;flex-direction:column;gap:8px}
.ad-chips{display:flex;gap:5px;flex-wrap:wrap}
.ad-chip{padding:5px 10px;border-radius:99px;border:1px solid var(--brd,#cbd5e1);background:var(--surface,#fff);color:var(--ink2,#475569);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.ad-chip.on{background:var(--brand,#0d6efd);color:#fff;border-color:var(--brand,#0d6efd)}
.ad-in{border:1px solid var(--brd,#cbd5e1);border-radius:8px;padding:9px 11px;font:inherit;font-size:14px;background:var(--surface,#fff);color:var(--ink1,#0f172a);outline:none;box-sizing:border-box;width:100%}
.ad-in:focus{border-color:var(--brand,#0d6efd);box-shadow:0 0 0 3px rgba(13,110,253,.15)}
.ad-row2{display:flex;gap:6px}
.ad-row2 .ad-in{flex:1}
.ad-actions{display:flex;justify-content:flex-end;gap:6px}
.ad-btn{padding:7px 13px;border:none;border-radius:8px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
.ad-btn.go{background:#16a34a;color:#fff}
.ad-btn.alt{background:var(--surface,#fff);border:1px solid var(--brd,#cbd5e1);color:var(--ink2,#475569)}
.ad-foot{font-size:11px;color:var(--ink3,#94a3b8);padding:8px 14px;border-top:1px solid var(--brd,#eef1f5);background:var(--surface2,#f8fafc);text-align:center}
.ad-foot code{font-size:10.5px;background:rgba(0,0,0,.05);padding:1px 5px;border-radius:4px}
`;
    const tag = document.createElement('style');
    tag.id = '_ad-styles'; tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ── public storage API ───────────────────────────────────────────────────
  function addWatch(partial) {
    const item = Object.assign({
      id: newId(), created_at: nowISO(), status: 'open',
      category: 'pattern', severity: 'info', title: '', body: '',
      target_kind: null, target_value: null, target_name: null,
    }, partial || {});
    if (!item.title) throw new Error('title required');
    const list = loadWatch();
    list.unshift(item);
    saveWatch(list);
    updateBadge();
    if (document.getElementById(PANEL_ID)) renderPanel();
    // Refresh patch 237 dots since new linked watchpoints may now flag a customer
    try { if (window.CustomerBrief && CustomerBrief.refreshFlags) CustomerBrief.refreshFlags(); } catch (_) {}
    return item;
  }
  function removeWatch(id) {
    const list = loadWatch().filter(x => x.id !== id);
    saveWatch(list);
    updateBadge();
    if (document.getElementById(PANEL_ID)) renderPanel();
    try { if (window.CustomerBrief && CustomerBrief.refreshFlags) CustomerBrief.refreshFlags(); } catch (_) {}
    setTimeout(refreshMarkers, 100);
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(loadWatch(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'adstod-watchlist.json';
    document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 100);
  }

  function updateBadge() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    const count = loadWatch().filter(x => x.status === 'open').length;
    const badge = btn.querySelector('.ad-count');
    if (badge) badge.textContent = count > 0 ? String(count) : '';
  }

  // ── panel render ─────────────────────────────────────────────────────────
  function closePanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) p.remove();
    const btn = document.getElementById(BTN_ID);
    if (btn) btn.classList.remove('open');
    document.removeEventListener('click', _outsideClick, true);
    document.removeEventListener('keydown', _esc, true);
  }
  function _outsideClick(e) {
    const p = document.getElementById(PANEL_ID); if (!p) return;
    if (p.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#' + BTN_ID)) return;
    closePanel();
  }
  function _esc(e) { if (e.key === 'Escape') closePanel(); }

  let _formOpen = false;
  let _formCategory = 'pattern';
  let _formCtx = null;  // {kind:'customer'|'view'|'pinned', id, name} or null
  let _tab = 'watch';  // 'watch' | 'assist'
  let _assistTask = '';
  let _assistResult = null;  // {ts, mock:true, ...}
  let _pinData = null;  // {selector, text, viewSlug, scrollY} when about to save a pinned punkt

  function renderPanel() {
    styles();
    let p = document.getElementById(PANEL_ID);
    if (!p) {
      p = document.createElement('div');
      p.id = PANEL_ID;
      p.className = 'ad-panel';
      document.body.appendChild(p);
      placePanel();
      window.addEventListener('resize', placePanel);
    }
    const list = loadWatch();
    const dotsHidden = window.CustomerBrief && CustomerBrief.getDotsHidden && CustomerBrief.getDotsHidden();

    const chips = CATEGORIES.map(c =>
      '<button class="ad-chip' + (c.k === _formCategory ? ' on' : '') + '" data-cat="' + c.k + '" title="' + esc(c.desc) + '">' + c.ico + ' ' + esc(c.label) + '</button>'
    ).join('');
    // Context chip — pre-filled with whatever the user was looking at when 🤖 was opened
    const ctxChip = _formCtx
      ? '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:8px;font-size:12px;font-weight:600">' +
          '<span>📍 Tengt við:</span>' +
          '<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            (_formCtx.kind === 'customer' ? '🏢' : '📄') + ' ' + esc(_formCtx.name) +
            (_formCtx.kind === 'customer' ? ' <span style="font-weight:400;opacity:.7">(co ' + esc(_formCtx.id) + ')</span>' : '') +
          '</span>' +
          '<button type="button" id="_ad-ctx-clear" title="Engin tenging — generic punktur" style="background:none;border:none;color:#1e40af;cursor:pointer;font-size:14px;padding:0 4px;line-height:1">×</button>' +
        '</div>'
      : '<div style="font-size:11.5px;color:var(--ink3,#94a3b8);padding:0 2px">📍 Generic punktur (ekki tengdur við neinn ákveðinn kúnna)</div>';

    const formHTML = _formOpen ? (
      '<div class="ad-form">' +
        ctxChip +
        '<div class="ad-chips">' + chips + '</div>' +
        '<input class="ad-in" id="_ad-title" placeholder="t.d. Skýrslur á röngum stöðum" maxlength="120" autocomplete="off">' +
        (_formCtx ? '' :
          '<div class="ad-row2">' +
            '<input class="ad-in" id="_ad-target" placeholder="(valkv.) kennitala / sendandi" maxlength="80" autocomplete="off">' +
          '</div>') +
        '<textarea class="ad-in" id="_ad-body" placeholder="(valkv.) lýsing / dæmi" rows="2" style="resize:vertical;min-height:50px"></textarea>' +
        '<div class="ad-actions">' +
          '<button class="ad-btn alt" type="button" id="_ad-cancel">Hætta við</button>' +
          '<button class="ad-btn go" type="button" id="_ad-save">💾 Bæta við</button>' +
        '</div>' +
      '</div>'
    ) : '<div style="display:flex;gap:6px"><button class="ad-add" type="button" id="_ad-open-form" style="flex:1">➕ Bæta við punkti</button><button class="ad-add" type="button" id="_ad-open-pin" title="Smella á stað á síðunni" style="flex:0 0 auto;padding:9px 12px;background:#7c3aed">📌</button></div>';

    const listHTML = list.length === 0
      ? '<div class="ad-empty">Engir punktar ennþá. Bættu við þínum fyrsta.</div>'
      : '<div class="ad-list">' + list.map(it => {
          const cat = CATEGORIES.find(c => c.k === it.category) || CATEGORIES[1];
          // Target chip — clickable when it points somewhere navigable
          let targetChip = '';
          if (it.target_kind === 'customer' && it.target_value) {
            targetChip = '<a href="#" class="ad-tgt" data-co="' + esc(it.target_value) + '" style="text-decoration:none;display:inline-block;font-size:10.5px;padding:1px 7px;border-radius:99px;background:#dbeafe;color:#1e40af;font-weight:600;margin-right:5px">🏢 ' + esc(it.target_name || it.target_value) + '</a>';
          } else if (it.target_kind === 'pinned' && it.target_value) {
            let pin = null; try { pin = JSON.parse(it.target_value); } catch (_) {}
            const label = (it.target_name || (pin && pin.text) || 'pin').slice(0, 40);
            targetChip = '<a href="#" class="ad-pin-jump" data-w="' + esc(it.id) + '" style="text-decoration:none;display:inline-block;font-size:10.5px;padding:1px 7px;border-radius:99px;background:#ede9fe;color:#6d28d9;font-weight:600;margin-right:5px">📌 ' + (pin ? esc(pin.viewSlug) + ' › ' : '') + esc(label) + '</a>';
          } else if (it.target_kind === 'view' && it.target_value) {
            targetChip = '<span style="font-size:10.5px;padding:1px 7px;border-radius:99px;background:#e0e7ff;color:#3730a3;font-weight:600;margin-right:5px">📄 ' + esc(it.target_name || it.target_value) + '</span>';
          } else if (it.target_value) {
            targetChip = '<span style="font-size:10.5px;padding:1px 7px;border-radius:99px;background:#f1f5f9;color:#475569;font-weight:600;margin-right:5px">📌 ' + esc(it.target_value) + '</span>';
          }
          const metaParts = [cat.label];
          if (it.body) metaParts.push(esc(it.body).slice(0, 80) + (it.body.length > 80 ? '…' : ''));
          return '<div class="ad-row">' +
            '<div class="ad-cat" title="' + esc(cat.label) + '">' + cat.ico + '</div>' +
            '<div class="ad-body"><div class="ad-title">' + esc(it.title) + '</div>' +
              '<div class="ad-meta">' + targetChip + metaParts.join(' · ') + '</div></div>' +
            '<button class="ad-del" type="button" data-del="' + esc(it.id) + '" title="Eyða">×</button>' +
          '</div>';
        }).join('') + '</div>';

    const tabStrip =
      '<div style="display:flex;gap:0;border-bottom:1px solid var(--brd,#e6eaf0);background:var(--surface2,#f8fafc)">' +
        '<button type="button" id="_ad-tab-watch" style="flex:1;padding:9px 0;background:' + (_tab==='watch'?'var(--surface,#fff)':'transparent') + ';border:none;border-bottom:2px solid ' + (_tab==='watch'?'var(--brand,#0d6efd)':'transparent') + ';color:' + (_tab==='watch'?'var(--ink1,#0f172a)':'var(--ink3,#94a3b8)') + ';font:inherit;font-size:13px;font-weight:700;cursor:pointer">🔔 Watchlist' + (list.length?' ('+list.length+')':'') + '</button>' +
        '<button type="button" id="_ad-tab-assist" style="flex:1;padding:9px 0;background:' + (_tab==='assist'?'var(--surface,#fff)':'transparent') + ';border:none;border-bottom:2px solid ' + (_tab==='assist'?'var(--brand,#0d6efd)':'transparent') + ';color:' + (_tab==='assist'?'var(--ink1,#0f172a)':'var(--ink3,#94a3b8)') + ';font:inherit;font-size:13px;font-weight:700;cursor:pointer">🪄 Aðstoð</button>' +
      '</div>';

    let bodyHTML;
    if (_tab === 'watch') {
      bodyHTML =
        '<div class="ad-sec">' +
          '<label class="ad-tog">' +
            '<input type="checkbox" id="_ad-dots"' + (dotsHidden ? '' : ' checked') + '>' +
            '<div class="lbl">Sýna dots á kúnnum<div class="sub">👁 lítill rauður/amber dot á þeim sem þurfa athygli</div></div>' +
          '</label>' +
        '</div>' +
        '<div class="ad-sec">' +
          '<div class="ad-sec-h"><span>🔔 Mín watchlist (' + list.length + ')</span>' +
            (list.length > 0 ? '<button class="ad-btn alt" type="button" id="_ad-export" style="padding:2px 8px;font-size:10.5px;font-weight:600">⤓ Flytja út</button>' : '') +
          '</div>' +
          listHTML +
          formHTML +
        '</div>';
    } else {
      // 🪄 Aðstoð tab — task-execution helper (Fasi 1 scaffold, Fasi 2 = real Claude)
      const ctxLine = _ctxAtOpen
        ? '<div style="padding:6px 10px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:8px">📍 Samhengi: ' +
            (_ctxAtOpen.kind === 'customer' ? '🏢' : '📄') + ' ' + esc(_ctxAtOpen.name) +
          '</div>'
        : '<div style="font-size:11.5px;color:var(--ink3,#94a3b8);margin-bottom:8px">📍 Ekkert samhengi — gefur generic svör. Opnaðu kúnna fyrst fyrir betri tillögur.</div>';

      const taTaskHTML =
        '<textarea class="ad-in" id="_ad-task" placeholder="Skrifaðu verkefnið. T.d. „Senda Eykt póst með verði á 20× ABC duft 6kg" eða „Finna skýrslu Colas 2024 og setja attachment"" rows="4" style="resize:vertical;min-height:80px">' + esc(_assistTask) + '</textarea>';

      let resultHTML = '';
      if (_assistResult && _assistResult.mock) {
        resultHTML =
          '<div style="margin-top:10px;padding:12px;background:linear-gradient(135deg,#eef2ff,#f0f9ff);border:1px solid #c7d2fe;border-radius:10px">' +
            '<div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#4338ca;font-weight:700;margin-bottom:8px">🤖 Tillaga AI (PRUFA — Claude tenging í Fasa 2)</div>' +
            '<div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:var(--ink1,#0f172a)">' +
              '<div><b>📄 Skýrsla:</b> <span style="color:var(--ink3,#94a3b8)">leitar í <code style="font-size:10.5px;background:rgba(0,0,0,.05);padding:1px 4px;border-radius:3px">customer_documents</code> + Drive móttöku eftir „' + esc(_assistResult.companyHint || '?') + '" → hlekkur á PDF</span></div>' +
              '<div><b>💰 Verð:</b> <span style="color:var(--ink3,#94a3b8)">flettir upp <code style="font-size:10.5px;background:rgba(0,0,0,.05);padding:1px 4px;border-radius:3px">vorur</code> sem passa „' + esc(_assistResult.itemsHint || '?') + '" + reiknar fjölda × einingaverð + VSK</span></div>' +
              '<div><b>✉️ Drög að pósti:</b> <span style="color:var(--ink3,#94a3b8)">samansetur greinargóðan tilboðstexta með nafni, líklega greinendum, dagsetningu, samtalstilvísun</span></div>' +
            '</div>' +
            '<div style="margin-top:10px;display:flex;gap:6px;justify-content:flex-end">' +
              '<button class="ad-btn alt" type="button" id="_ad-assist-reset" style="padding:5px 11px">↻ Hreinsa</button>' +
            '</div>' +
          '</div>';
      }

      bodyHTML =
        '<div class="ad-sec">' +
          ctxLine +
          taTaskHTML +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px">' +
            '<span style="font-size:11px;color:var(--ink3,#94a3b8)">⌘⏎ til að keyra</span>' +
            '<button class="ad-btn go" type="button" id="_ad-assist-run">🪄 Fá aðstoð</button>' +
          '</div>' +
          resultHTML +
        '</div>';
    }

    p.innerHTML =
      '<div class="ad-hd"><h4>🤖 Aðstoðarmaður</h4><button class="ad-x" type="button" id="_ad-x" aria-label="Loka">✕</button></div>' +
      tabStrip +
      '<div class="ad-bd">' + bodyHTML + '</div>' +
      '<div class="ad-foot">' +
        (_tab === 'watch'
          ? 'Vistað staðbundið. AI mun lesa í næstu yfirferð (Fasi 2).'
          : '🪄 Fasi 1: UI scaffold. Fasi 2: tengist Claude í gegnum brunaholf <code>/api/adstod-assist</code>.')
      + '</div>';

    // Wire events
    p.querySelector('#_ad-x').addEventListener('click', closePanel);
    // Tab switching
    const tw = p.querySelector('#_ad-tab-watch'); if (tw) tw.addEventListener('click', () => { _tab = 'watch'; renderPanel(); });
    const ta = p.querySelector('#_ad-tab-assist'); if (ta) ta.addEventListener('click', () => { _tab = 'assist'; renderPanel(); setTimeout(() => { const el = document.getElementById('_ad-task'); if (el) el.focus(); }, 30); });

    if (_tab === 'watch') {
      const dotsCb = p.querySelector('#_ad-dots');
      if (dotsCb) dotsCb.addEventListener('change', () => {
        if (window.CustomerBrief && CustomerBrief.setDotsHidden) CustomerBrief.setDotsHidden(!dotsCb.checked);
      });
      p.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => removeWatch(b.dataset.del)));
      p.querySelectorAll('.ad-tgt[data-co]').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const coId = a.getAttribute('data-co');
        closePanel();
        if (window.App && App.switchView) App.switchView('companies');
        setTimeout(() => { try { if (window.Companies && Companies.openDetail) Companies.openDetail(+coId); } catch (_) {} }, 60);
      }));
      p.querySelectorAll('.ad-pin-jump[data-w]').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const wid = a.getAttribute('data-w');
        const item = loadWatch().find(x => x.id === wid);
        if (!item) return;
        let pin = null; try { pin = JSON.parse(item.target_value); } catch (_) { return; }
        if (!pin) return;
        closePanel();
        // Navigate to the saved view, then scroll + flash
        location.hash = '#' + pin.viewSlug;
        setTimeout(() => {
          let el = null;
          try { el = pin.selector && document.querySelector(pin.selector); } catch (_) {}
          if (!el && pin.text) {
            const all = document.querySelectorAll('tr, .row, .card, li, div');
            for (const c of all) {
              const t = (c.textContent || '').trim().replace(/\s+/g, ' ');
              if (t.indexOf(pin.text.slice(0, 60)) === 0) { el = c; break; }
            }
          }
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ad-pin-flash');
            setTimeout(() => el.classList.remove('ad-pin-flash'), 1700);
          } else {
            window.scrollTo({ top: pin.scrollY || 0, behavior: 'smooth' });
          }
          refreshMarkers();
        }, 400);
      }));
      const ex = p.querySelector('#_ad-export'); if (ex) ex.addEventListener('click', exportJSON);
    } else {
      const ta = p.querySelector('#_ad-task');
      if (ta) ta.addEventListener('input', e => { _assistTask = e.target.value; });
      const runBtn = p.querySelector('#_ad-assist-run');
      if (runBtn) runBtn.addEventListener('click', runAssist);
      if (ta) ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runAssist(); }
      });
      const rst = p.querySelector('#_ad-assist-reset');
      if (rst) rst.addEventListener('click', () => { _assistResult = null; renderPanel(); });
    }

    if (_formOpen) {
      p.querySelectorAll('[data-cat]').forEach(c => c.addEventListener('click', () => {
        _formCategory = c.dataset.cat; renderPanel();
        setTimeout(() => { const t = document.getElementById('_ad-title'); if (t) t.focus(); }, 20);
      }));
      const ctxClear = p.querySelector('#_ad-ctx-clear');
      if (ctxClear) ctxClear.addEventListener('click', () => { _formCtx = null; renderPanel(); });
      p.querySelector('#_ad-cancel').addEventListener('click', () => { _formOpen = false; _formCtx = _ctxAtOpen; renderPanel(); });
      const submit = () => {
        const t = p.querySelector('#_ad-title').value.trim();
        if (!t) { p.querySelector('#_ad-title').focus(); return; }
        try {
          const targetField = p.querySelector('#_ad-target');
          const tk = _formCtx ? _formCtx.kind : null;
          // For 'pinned' context, store the captured pin data JSON in target_value
          let tv;
          if (tk === 'pinned' && _pinData) {
            tv = JSON.stringify(_pinData);
          } else {
            tv = _formCtx ? _formCtx.id : (targetField ? targetField.value.trim() || null : null);
          }
          const tn = _formCtx ? _formCtx.name : null;
          addWatch({
            category: _formCategory,
            title: t,
            target_kind: tk,
            target_value: tv,
            target_name: tn,
            body: p.querySelector('#_ad-body').value.trim() || null,
          });
          _formOpen = false; _formCtx = _ctxAtOpen; _pinData = null;
          renderPanel();
          setTimeout(refreshMarkers, 100);
        } catch (e) { console.warn('addWatch', e); }
      };
      p.querySelector('#_ad-save').addEventListener('click', submit);
      p.querySelector('#_ad-title').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); });
      setTimeout(() => { try { p.querySelector('#_ad-title').focus(); } catch (_) {} }, 30);
    } else {
      p.querySelector('#_ad-open-form').addEventListener('click', () => { _formCtx = _ctxAtOpen; _formOpen = true; renderPanel(); });
      const pinBtn = p.querySelector('#_ad-open-pin');
      if (pinBtn) pinBtn.addEventListener('click', enterPinMode);
    }
  }

  function placePanel() {
    const p = document.getElementById(PANEL_ID); if (!p) return;
    const btn = document.getElementById(BTN_ID);
    const margin = 10;
    const pr = p.getBoundingClientRect();
    let top, left;
    if (btn) {
      const br = btn.getBoundingClientRect();
      top = br.bottom + 8;
      left = Math.min(window.innerWidth - pr.width - margin, br.right - pr.width);
      if (left < margin) left = margin;
    } else {
      top = 60; left = window.innerWidth - pr.width - margin;
    }
    if (top + pr.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - pr.height - margin);
    p.style.top = top + 'px';
    p.style.left = left + 'px';
  }

  // ── 📌 Pin mode — click anywhere on the page to attach a punkt there ─────
  function buildSelector(el) {
    // Build a chain up to a stable anchor (id, view-id, body)
    const parts = [];
    let n = el;
    let depth = 0;
    while (n && n.nodeType === 1 && n !== document.body && depth < 8) {
      let sel = n.tagName.toLowerCase();
      if (n.id) { sel += '#' + n.id; parts.unshift(sel); break; }
      const cls = (n.className && typeof n.className === 'string')
        ? n.className.split(/\s+/).filter(c => c && c.indexOf(':') < 0 && !/^_?(sam|cb|ad|bk|bs)-/.test(c)).slice(0,2).join('.')
        : '';
      if (cls) sel += '.' + cls;
      // nth-of-type so we pick the right sibling
      let sib = n; let i = 0;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === n.tagName) i++;
      if (i > 0) sel += ':nth-of-type(' + (i + 1) + ')';
      parts.unshift(sel);
      n = n.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }
  function elementSnippet(el) {
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
    return t.slice(0, 140);
  }
  function currentViewSlug() {
    return (location.hash || '#').replace(/^#/, '').split(/[?&\/]/)[0] || 'unknown';
  }

  function enterPinMode() {
    closePanel();
    document.documentElement.classList.add('ad-pin-mode');
    if (!document.getElementById('_ad-pin-style')) {
      const st = document.createElement('style');
      st.id = '_ad-pin-style';
      st.textContent =
        '.ad-pin-mode, .ad-pin-mode *{cursor:crosshair !important}' +
        '.ad-pin-bnr{position:fixed;top:0;left:0;right:0;z-index:100200;padding:12px 16px;background:linear-gradient(90deg,#7c3aed,#6d28d9);color:#fff;text-align:center;font:inherit;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.4);display:flex;justify-content:center;align-items:center;gap:14px}' +
        '.ad-pin-bnr button{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:8px;padding:5px 13px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700}' +
        '.ad-pin-bnr button:hover{background:rgba(255,255,255,.28)}' +
        '.ad-pin-hover{outline:2px dashed #7c3aed !important;outline-offset:2px !important;background:rgba(124,58,237,.08) !important}' +
        '.ad-pin-marker{position:absolute;z-index:99990;display:inline-flex;align-items:center;gap:5px;background:#7c3aed;color:#fff;border-radius:99px;padding:3px 10px;font:inherit;font-size:11.5px;font-weight:700;box-shadow:0 4px 14px rgba(124,58,237,.5);cursor:pointer;text-decoration:none;border:none;pointer-events:auto;animation:ad-pin-pop .3s ease-out}' +
        '.ad-pin-marker:hover{background:#6d28d9;transform:scale(1.05)}' +
        '@keyframes ad-pin-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}' +
        '.ad-pin-flash{animation:ad-pin-flash 1.6s ease-out}' +
        '@keyframes ad-pin-flash{0%,100%{outline:0 solid rgba(124,58,237,0)}25%{outline:4px solid rgba(124,58,237,.6)}}';
      document.head.appendChild(st);
    }
    const bnr = document.createElement('div');
    bnr.className = 'ad-pin-bnr';
    bnr.id = '_ad-pin-bnr';
    bnr.innerHTML = '<span>📌 Smelltu á það sem þú vilt pinna</span><button type="button" id="_ad-pin-cancel">Hætta við</button>';
    document.body.appendChild(bnr);
    bnr.querySelector('#_ad-pin-cancel').addEventListener('click', exitPinMode);
    // Hover highlight
    document.addEventListener('mouseover', _pinHoverIn, true);
    document.addEventListener('mouseout', _pinHoverOut, true);
    document.addEventListener('click', _pinCapture, true);
    document.addEventListener('keydown', _pinEsc, true);
  }
  function exitPinMode() {
    document.documentElement.classList.remove('ad-pin-mode');
    const bnr = document.getElementById('_ad-pin-bnr'); if (bnr) bnr.remove();
    document.querySelectorAll('.ad-pin-hover').forEach(el => el.classList.remove('ad-pin-hover'));
    document.removeEventListener('mouseover', _pinHoverIn, true);
    document.removeEventListener('mouseout', _pinHoverOut, true);
    document.removeEventListener('click', _pinCapture, true);
    document.removeEventListener('keydown', _pinEsc, true);
  }
  function _pinHoverIn(e) {
    if (e.target.closest && (e.target.closest('.ad-pin-bnr') || e.target.closest('#' + PANEL_ID))) return;
    if (e.target.classList) e.target.classList.add('ad-pin-hover');
  }
  function _pinHoverOut(e) {
    if (e.target.classList) e.target.classList.remove('ad-pin-hover');
  }
  function _pinEsc(e) { if (e.key === 'Escape') exitPinMode(); }
  function _pinCapture(e) {
    // Allow the cancel button to work
    if (e.target.closest && (e.target.closest('.ad-pin-bnr') || e.target.closest('#' + PANEL_ID))) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    _pinData = {
      selector: buildSelector(el),
      text: elementSnippet(el),
      viewSlug: currentViewSlug(),
      scrollY: window.scrollY,
      ts: Date.now(),
    };
    exitPinMode();
    // Reopen panel with form prefilled in "pinned" mode
    _ctxAtOpen = { kind: 'pinned', id: 'pin_' + _pinData.ts, name: (_pinData.text || _pinData.viewSlug).slice(0, 50) };
    _formCtx = _ctxAtOpen;
    _formOpen = true;
    _tab = 'watch';
    togglePanel();
  }

  // ── Re-attach floating 📌 markers when navigating to a view that has pinned punkts
  function refreshMarkers() {
    document.querySelectorAll('.ad-pin-marker').forEach(m => m.remove());
    const slug = currentViewSlug();
    const list = loadWatch().filter(w => w.status === 'open' && w.target_kind === 'pinned');
    for (const w of list) {
      let pin;
      try { pin = JSON.parse(w.target_value); } catch (_) { continue; }
      if (!pin || pin.viewSlug !== slug) continue;
      let el = null;
      try { el = pin.selector && document.querySelector(pin.selector); } catch (_) {}
      // Fallback: text content search within the active view
      if (!el && pin.text) {
        const viewEl = document.querySelector('.view:not([style*="display: none"]), #view-' + slug + ':not([style*="display: none"])');
        const root = viewEl || document.body;
        // Find first element whose direct textContent starts with the pinned text
        const all = root.querySelectorAll('tr, .row, .card, li, div, h1, h2, h3, h4, p');
        for (const c of all) {
          const t = (c.textContent || '').trim().replace(/\s+/g, ' ');
          if (t.indexOf(pin.text.slice(0, 60)) === 0) { el = c; break; }
        }
      }
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const marker = document.createElement('a');
      marker.className = 'ad-pin-marker';
      marker.href = '#';
      marker.dataset.w = w.id;
      marker.innerHTML = '📌 <span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(w.title) + '</span>';
      marker.title = w.title + (w.body ? ' — ' + w.body : '');
      marker.style.top = (rect.top + window.scrollY - 10) + 'px';
      marker.style.left = (rect.right + window.scrollX + 6) + 'px';
      marker.addEventListener('click', e => {
        e.preventDefault();
        if (window.AdstodHub) AdstodHub.toggle();
      });
      document.body.appendChild(marker);
    }
  }
  // Re-attach on view/hash change
  window.addEventListener('hashchange', () => setTimeout(refreshMarkers, 200));
  // Also on scroll/resize — keep markers anchored
  let _markerTimer = 0;
  window.addEventListener('scroll', () => { clearTimeout(_markerTimer); _markerTimer = setTimeout(refreshMarkers, 100); }, { passive: true });
  window.addEventListener('resize', () => { clearTimeout(_markerTimer); _markerTimer = setTimeout(refreshMarkers, 100); });
  // Initial sweep
  setTimeout(refreshMarkers, 1500);

  // 🪄 Aðstoð runner — Fasi 1 stub. Does cheap keyword extraction client-side
  // to make the mock result feel contextual. Fasi 2 will POST this same shape
  // to brunaholf /api/adstod-assist and replace the static cells with real
  // results (Drive search, product lookup, email composition).
  function runAssist() {
    const text = (_assistTask || '').trim();
    if (!text) return;
    // Extract crude hints — a company name (capitalized word) and an item phrase
    const words = text.split(/\s+/);
    const company = (words.find(w => /^[A-ZÁÉÍÓÚÝÞÆÖ]/.test(w) && w.length > 2) || (_ctxAtOpen && _ctxAtOpen.name) || '?').replace(/[.,]$/, '');
    const itemMatch = text.match(/(\d+\s*[×x*]\s*[A-Za-zÁÉÍÓÚÝÞÆÖáéíóúýþæö0-9.\s]+(?:duft|froðu|kolsýru|skápur|skynjari)[A-Za-z0-9\s]*)/i);
    const items = itemMatch ? itemMatch[1].trim() : text.length > 50 ? text.slice(0, 50) + '…' : text;
    _assistResult = {
      mock: true,
      ts: Date.now(),
      taskText: text,
      companyHint: company,
      itemsHint: items,
    };
    renderPanel();
  }

  function togglePanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) { closePanel(); return; }
    _formOpen = false;
    // Capture what user was looking at BEFORE the panel covers anything
    _ctxAtOpen = getCurrentContext();
    _formCtx = _ctxAtOpen;
    renderPanel();
    const btn = document.getElementById(BTN_ID); if (btn) btn.classList.add('open');
    setTimeout(() => {
      document.addEventListener('click', _outsideClick, true);
      document.addEventListener('keydown', _esc, true);
    }, 50);
  }

  // ── insertion: stick the 🤖 button beside the banner clock ────────────────
  function ensureBtn() {
    if (document.getElementById(BTN_ID)) return;
    // Brunastál banner: insert as sibling RIGHT BEFORE .bb-clockbox
    const clockbox = document.querySelector('.bb-clockbox');
    if (clockbox && clockbox.parentNode) {
      styles();
      const btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.className = 'ad-aibtn';
      btn.title = 'Aðstoðarmaður — watchlist og dot-stillingar';
      btn.setAttribute('aria-label', 'Aðstoðarmaður');
      btn.innerHTML = '🤖<span class="ad-count"></span>';
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); togglePanel(); });
      clockbox.parentNode.insertBefore(btn, clockbox);
      updateBadge();
      return;
    }
    // Brunastál is off — append next to floating 🔥 restore button
    const restore = document.getElementById('bstal-restore');
    if (restore && restore.style.display !== 'none') {
      styles();
      const btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.className = 'ad-aibtn';
      btn.title = 'Aðstoðarmaður';
      btn.innerHTML = '🤖<span class="ad-count"></span>';
      btn.style.cssText += ';position:fixed;right:64px;top:14px;z-index:9998;width:40px;height:40px;border-radius:11px;margin:0';
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); togglePanel(); });
      document.body.appendChild(btn);
      updateBadge();
    }
  }

  function bootObserver() {
    ensureBtn();
    const obs = new MutationObserver(() => {
      // Banner gets re-built on theme change / view switch — re-attach if needed.
      if (!document.getElementById(BTN_ID)) ensureBtn();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Re-attempt a few times in case banner is built late
    [400, 1200, 3000].forEach(ms => setTimeout(ensureBtn, ms));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootObserver);
  else bootObserver();

  // public API
  window.AdstodHub = {
    open: () => { if (!document.getElementById(PANEL_ID)) togglePanel(); },
    close: closePanel,
    toggle: togglePanel,
    addWatch, removeWatch, listWatch: loadWatch, exportJSON,
  };
})();
