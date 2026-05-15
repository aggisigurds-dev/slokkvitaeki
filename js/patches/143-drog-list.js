/* === DRÖG LIST v1 ===
   Surfaces all open draft sales (status='drog') so the user can see them at
   a glance and click into the Sale Editor to continue them. Drafts are
   sales that have been started (drop-off, partial pickup, etc.) but not
   yet finalized — invisible in Bókhald but very much "in progress".

   Adds:
     1. A sidebar entry "📝 Drög (N)" below Sala, with live count
     2. A modal listing all draft sales when clicked, with customer / num /
        total / created date / "✏️ Breyta" + "✅ Klára" actions per row
     3. Auto-refreshes on the `sale-edited` event the editor dispatches

   Depends on patch 142 (sale-editor).  */
(() => {
  if (window.__drogListInstalled) return;
  window.__drogListInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }
  function daysSince(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  let _count = 0;
  let _items = [];

  async function loadDrog() {
    const SB = getSB();
    if (!SB) return;
    try {
      const { data, error } = await SB.from('solur')
        .select('id,num,customer_nafn,samtals,greitt_med,created_at,athugasemdir')
        .eq('status', 'drog')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.warn('[drog-list] load error:', error); return; }
      _items = data || [];
      _count = _items.length;
      updateBadge();
    } catch (e) {
      console.warn('[drog-list] load exception:', e);
    }
  }

  // ── Sidebar entry ─────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('._drog-nav-btn')) { updateBadge(); return; }
    // Place right after the Sala nav button
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const salaBtn = allBtns.find(b => /\bsala\b/i.test(b.textContent || ''));
    if (!salaBtn) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = salaBtn.className.replace(/\bactive\b/g, '').trim() + ' _drog-nav-btn';
    btn.setAttribute('data-drog-nav', '1');
    btn.innerHTML = '<span style="margin-right:6px">📝</span>Drög <span class="_drog-badge" style="display:none;margin-left:6px;background:#f59e0b;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px">0</span>';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openListModal();
    });
    salaBtn.parentNode.insertBefore(btn, salaBtn.nextSibling);
    updateBadge();
  }

  function updateBadge() {
    const badge = document.querySelector('._drog-badge');
    if (!badge) return;
    badge.textContent = String(_count);
    badge.style.display = _count > 0 ? 'inline-block' : 'none';
  }

  // ── Modal listing ─────────────────────────────────────────────────────────
  function openListModal() {
    document.getElementById('_drog-list-modal')?.remove();
    const m = document.createElement('div');
    m.id = '_drog-list-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:100030;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(960px,calc(100vw - 28px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 22px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="margin:0;font-size:17px;font-weight:700">📝 Drög</h2>
            <div style="font-size:12px;color:#fef3c7;margin-top:2px">Sölur sem hafa ekki verið kláraðar — birtast ekki í Bókhaldi fyrr en klárað er</div>
          </div>
          <button id="_drog-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:18px;width:34px;height:34px;border-radius:7px;cursor:pointer;line-height:1">✕</button>
        </div>
        <div id="_drog-body" style="flex:1;overflow-y:auto;background:#f8fafc"></div>
      </div>`;
    document.body.appendChild(m);
    m.querySelector('#_drog-x').addEventListener('click', () => m.remove());
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    renderList();
  }

  function renderList() {
    const body = document.getElementById('_drog-body');
    if (!body) return;
    if (!_items.length) {
      body.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8;font-style:italic;font-size:13px">Engin drög í gangi 🎉</div>';
      return;
    }
    const rows = _items.map(s => {
      const age = daysSince(s.created_at);
      const ageBadge = age > 14
        ? '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:99px">' + age + ' daga gamalt</span>'
        : (age > 7 ? '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:99px">' + age + ' daga</span>'
                   : '<span style="font-size:10px;color:#64748b">' + age + ' d</span>');
      return `
        <tr data-id="${s.id}">
          <td style="padding:11px 14px;font-family:monospace;font-size:12px;color:#475569">${esc(s.num || '—')}</td>
          <td style="padding:11px 14px;font-weight:600;color:#0f172a">${esc(s.customer_nafn || '—')}</td>
          <td style="padding:11px 14px;color:#475569;font-size:12.5px">${esc(s.greitt_med || '—')}</td>
          <td style="padding:11px 14px;color:#475569;font-size:12px">${esc(fmtDate(s.created_at))} · ${ageBadge}</td>
          <td style="padding:11px 14px;text-align:right;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums">${fmtKr(s.samtals)}</td>
          <td style="padding:9px 12px;text-align:right;white-space:nowrap">
            <button data-act="edit" type="button" style="padding:6px 12px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;margin-right:4px">✏️ Breyta</button>
            <button data-act="finalize" type="button" style="padding:6px 12px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">✅ Klára</button>
          </td>
        </tr>`;
    }).join('');
    body.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#fff;text-align:left;border-bottom:1px solid #e2e8f0">
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Num</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Viðskiptavinur</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Greiðsla</th>
          <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Stofnað</th>
          <th style="padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Upphæð</th>
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    body.querySelectorAll('tbody tr').forEach(tr => {
      const id = tr.dataset.id;
      tr.querySelector('button[data-act="edit"]').addEventListener('click', () => {
        document.getElementById('_drog-list-modal')?.remove();
        if (window.SaleEditor) window.SaleEditor.openById(id);
      });
      tr.querySelector('button[data-act="finalize"]').addEventListener('click', () => {
        document.getElementById('_drog-list-modal')?.remove();
        // Open editor and immediately let user review before finalize
        if (window.SaleEditor) window.SaleEditor.openById(id);
      });
    });
  }

  // ── Refresh hooks ─────────────────────────────────────────────────────────
  document.addEventListener('sale-edited', loadDrog);
  // Periodic refresh in case other tabs/devices change drög
  setInterval(loadDrog, 30000);

  // ── Boot ──────────────────────────────────────────────────────────────────
  injectSidebar();
  setTimeout(injectSidebar, 1000);
  setTimeout(loadDrog, 600);

  // Public API
  window.DrogList = {
    open: openListModal,
    refresh: loadDrog,
    count: () => _count
  };
  console.log('[patch-143] drog-list installed — sidebar badge + modal');
})();
/* === END DRÖG LIST === */
