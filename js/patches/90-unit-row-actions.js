/* === UNIT ROW ACTIONS v1 ===
 *
 * The unit-rows inside Verkbeiðnir / Afgreiðsla / Verkstæði used to have
 * an edit pencil and a "register barcode" affordance; that fell off in some
 * earlier refactor (modal.js renderDetail now only renders the QR-print
 * icon). This patch adds them back without touching modal.js itself.
 *
 * Per row we now expose:
 *   ✏️  Breyta             — open the existing _slokk_editUnit dialog (v9.js)
 *   🏷  Strikamerki        — print a Brother QL label for THIS unit only
 *   🔧  Staða (dropdown)   — Í lagi / Þarfnast viðgerðar / Ónýtt
 *   🖨  QR (existing)      — preserved
 *
 * Also injects a small status pill into the row's "Staða" cell so the user
 * can see at-a-glance which units are flagged broken/repair.
 *
 * Hook strategy: MutationObserver on #counter-main + #workshop-main, scoped
 * to row insertions (no body-wide observer; learned that lesson with patch 87).
 */
(() => {
  if (window.__unitRowActionsInstalled) return;
  window.__unitRowActionsInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // --- Print one Brother label for a single unit ---------------------------
  function printSingleBarcode(unit, jobCustomer, jobPhone) {
    const win = window.open('', 'strikamerki-eitt', 'width=420,height=700');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta strikamerki.'); return; }
    const ps = (window.AppSettings && window.AppSettings.path('prentun')) || {};
    const sz = ps.label_size || '54x17';
    const dpiComp = Number.isFinite(+ps.dpi_compensation) ? +ps.dpi_compensation : 2;
    let w = 54, h = 17;
    if (sz === '62x17')      { w = 62; h = 17; }
    else if (sz === '62x100'){ w = 62; h = 100; }
    else if (sz === '38x90') { w = 38; h = 90; }
    const top = 9 + dpiComp;
    const qr = Math.max(4, Math.min(20, h - top - 1));
    const serial = unit.serial || '';
    const name = (unit.type || '') + (unit.size ? ' · ' + unit.size : '');
    const customer = jobCustomer || unit.client || '';
    const phone = jobPhone || unit.phone || '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Strikamerki — ${esc(serial)}</title>
<style>
  @page { size: ${w}mm ${h}mm; margin: 0; }
  html, body { margin: 0; padding: 0; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .lbl {
    width: ${w}mm; height: ${h}mm;
    box-sizing: border-box; padding: ${top}mm 6mm 0mm 5mm;
    display: flex; align-items: center; gap: 1.5mm;
    overflow: hidden;
  }
  .qr { width: ${qr}mm; height: ${qr}mm; flex-shrink: 0; }
  .lbl-text { flex: 1; min-width: 0; line-height: 1.05; }
  .lbl-serial { font-size: 10pt; font-weight: 800; font-family: 'Courier New', monospace; }
  .lbl-name   { font-size: 7.5pt; font-weight: 600; margin-top: 0.4mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lbl-phone  { font-size: 6.5pt; color: #222; margin-top: 0.3mm; }
  .lbl-org    { font-size: 5.5pt; color: #555; margin-top: 0.3mm; }
  .toolbar {
    padding: 8px 12px; background: #f4f4f4; border-bottom: 1px solid #ddd;
    text-align: center; font-size: 12px;
  }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; margin: 0 4px; }
  @media print { .toolbar { display: none; } }
</style></head><body>
  <div class="toolbar">
    1 strikamerki · ${w} × ${h} mm
    <button onclick="window.print()">🖨️ Prenta</button>
    <button onclick="window.close()">Loka</button>
  </div>
  <div class="lbl">
    <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(serial)}" alt="${esc(serial)}">
    <div class="lbl-text">
      <div class="lbl-serial">${esc(serial)}</div>
      <div class="lbl-name">${esc(customer || name)}</div>
      ${phone ? `<div class="lbl-phone">📞 ${esc(phone)}</div>` : ''}
      <div class="lbl-org">Slökkvitæki ehf · 565-4080</div>
    </div>
  </div>
  <script>
    var imgs = Array.from(document.images);
    var loaded = 0;
    function maybePrint() { loaded++; if (loaded >= imgs.length) setTimeout(() => window.print(), 250); }
    if (imgs.length === 0) setTimeout(() => window.print(), 200);
    else imgs.forEach(img => { if (img.complete) maybePrint(); else { img.addEventListener('load', maybePrint); img.addEventListener('error', maybePrint); }});
  <\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  // --- Mark unit status (Í lagi / Þarfnast viðgerðar / Ónýtt) --------------
  async function setUnitStatus(unitId, newStatus) {
    if (!window.DB || !window.DB.sb) return false;
    try {
      const r = await window.DB.sb.from('uttaeki').update({ status: newStatus }).eq('id', unitId);
      if (r.error) { alert('Villa: ' + r.error.message); return false; }
      // Update local cache so UI doesn't need a full reload
      if (window.DB.cache && Array.isArray(window.DB.cache.units)) {
        const idx = window.DB.cache.units.findIndex(u => u.id === unitId);
        if (idx >= 0) window.DB.cache.units[idx].status = newStatus;
      }
      return true;
    } catch (e) { alert('Villa: ' + e.message); return false; }
  }

  // Find the unit object behind a row's serial text by looking it up in DB.cache
  function unitFromRow(row) {
    const serialEl = row.querySelector('.ser');
    const serial = serialEl ? serialEl.textContent.trim() : '';
    if (!serial) return null;
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    return units.find(u => u.serial === serial) || null;
  }

  // Find the parent job for a counter row
  function jobFromContext() {
    if (window.Counter && Counter.sel && window.DB && DB.getJob) {
      try { return DB.getJob(Counter.sel); } catch (_) {}
    }
    return null;
  }

  // --- Inject buttons into existing rows -----------------------------------
  function decorateRow(row) {
    if (row.dataset._pm90 === '1') return;
    const cells = row.querySelectorAll('td');
    if (cells.length < 6) return; // structure not as expected
    const unit = unitFromRow(row);
    if (!unit) return; // can't act without a real unit lookup
    row.dataset._pm90 = '1';

    // Add a status pill into the existing "Staða" cell (5th of 6)
    const stCell = cells[4];
    if (unit.status === 'fail' || unit.status === 'repair' || unit.status === 'scrap') {
      const labels = { fail: '⚠ Bilað', repair: '🔧 Viðgerð', scrap: '🚫 Ónýtt' };
      const colors = { fail: '#dc2626', repair: '#b45309', scrap: '#475569' };
      stCell.insertAdjacentHTML('beforeend',
        `<span style="display:inline-block;margin-left:6px;padding:2px 7px;background:${colors[unit.status]}15;color:${colors[unit.status]};border:1px solid ${colors[unit.status]}40;border-radius:10px;font-size:10px;font-weight:700">${labels[unit.status]}</span>`);
    }

    // Add the action buttons in the last cell
    const actionCell = cells[cells.length - 1];
    const job = jobFromContext();
    const jobCustomer = job ? job.customer : '';
    const jobPhone = job ? job.phone : '';

    // Replace cell content with new button group (preserves QR via existing onclick markup pattern)
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;gap:4px;align-items:center';

    function btn(title, html, onClick) {
      const b = document.createElement('button');
      b.className = 'btn btn-ghost btn-sm';
      b.title = title;
      b.type = 'button';
      b.style.cssText = 'padding:4px 7px;min-width:28px';
      b.innerHTML = html;
      b.addEventListener('click', e => { e.stopPropagation(); onClick(e); });
      return b;
    }

    // Edit (pencil)
    wrap.appendChild(btn('Breyta', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>', () => {
      if (typeof window._slokk_editUnit === 'function') window._slokk_editUnit(unit.id);
      else alert('Edit-virkni ekki hlaðin');
    }));

    // Print Brother barcode label
    wrap.appendChild(btn('Prenta strikamerki', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M3 7h18M3 12h2M7 12h2M11 12h2M15 12h2M19 12h2M3 17h18M5 7v10M9 7v10M13 7v10M17 7v10M21 7v10"/></svg>', () => {
      printSingleBarcode(unit, jobCustomer, jobPhone);
    }));

    // Status menu
    wrap.appendChild(btn('Staða: ' + (unit.status || 'active'), '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>', e => {
      // Open small popover menu
      closeAnyStatusMenu();
      const menu = document.createElement('div');
      menu.className = '_pm90-stmenu';
      menu.style.cssText = 'position:absolute;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:5px;z-index:9999;min-width:180px';
      const r = e.currentTarget.getBoundingClientRect();
      menu.style.top = (window.scrollY + r.bottom + 4) + 'px';
      menu.style.left = (window.scrollX + r.left - 140) + 'px';
      const opts = [
        { v: 'active',  label: '✓ Í lagi',           color: '#16a34a' },
        { v: 'repair',  label: '🔧 Þarfnast viðgerðar', color: '#b45309' },
        { v: 'scrap',   label: '🚫 Ónýtt',            color: '#475569' },
        { v: 'fail',    label: '⚠ Bilað',             color: '#dc2626' }
      ];
      menu.innerHTML = opts.map(o =>
        `<button data-st="${o.v}" type="button" style="display:block;width:100%;text-align:left;padding:8px 12px;background:${unit.status===o.v?'#f1f5f9':'transparent'};border:none;border-radius:5px;cursor:pointer;font:inherit;font-size:13px;color:${o.color};font-weight:600">${o.label}</button>`
      ).join('');
      document.body.appendChild(menu);
      menu.querySelectorAll('button[data-st]').forEach(b => {
        b.addEventListener('click', async () => {
          const newSt = b.dataset.st;
          menu.remove();
          if (newSt === unit.status) return;
          const ok = await setUnitStatus(unit.id, newSt);
          if (ok && window.Counter && window.Counter.sel) {
            const j = jobFromContext();
            if (j && Counter.renderDetail) Counter.renderDetail(j);
          }
        });
      });
      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', closeAnyStatusMenu, { once: true });
      }, 0);
    }));

    // Preserve existing QR-print button if any was in the cell (look for onclick="Print.showQR")
    const qrBtn = actionCell.querySelector('button[onclick*="Print.showQR"]');
    if (qrBtn) {
      // Re-style to match
      qrBtn.style.padding = '4px 7px';
      qrBtn.style.minWidth = '28px';
      wrap.appendChild(qrBtn);
    } else {
      // Add our own QR-print fallback
      wrap.appendChild(btn('Prenta QR', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="21" y2="14"/><line x1="14" y1="18" x2="21" y2="18"/><line x1="18" y1="14" x2="18" y2="21"/></svg>', () => {
        const job = jobFromContext();
        if (window.Print && Print.showQR) {
          Print.showQR({
            serial: unit.serial,
            type: unit.type,
            size: unit.size || '',
            client: job ? job.customer : (unit.client || ''),
            next_insp: job ? job.pickup : (unit.next_insp || '')
          });
        }
      }));
    }

    // Replace cell content with our wrap
    actionCell.innerHTML = '';
    actionCell.appendChild(wrap);
  }
  function closeAnyStatusMenu() {
    document.querySelectorAll('._pm90-stmenu').forEach(m => m.remove());
  }

  function decorateAllRows() {
    const containers = [
      document.getElementById('counter-main'),
      document.getElementById('workshop-main')
    ];
    containers.forEach(c => {
      if (!c) return;
      c.querySelectorAll('table.dtbl tbody tr').forEach(decorateRow);
    });
  }

  // Watch for re-renders. Counter.renderDetail wipes #counter-main so we
  // need to redecorate after each render. Light scoped observer.
  function attach(id) {
    const el = document.getElementById(id);
    if (!el) { setTimeout(() => attach(id), 800); return; }
    new MutationObserver(() => {
      // Debounce — many mutations during a render
      clearTimeout(attach._t);
      attach._t = setTimeout(decorateAllRows, 80);
    }).observe(el, { childList: true, subtree: true });
  }
  attach('counter-main');
  attach('workshop-main');
  setTimeout(decorateAllRows, 1000);
  setTimeout(decorateAllRows, 3000);

  console.log('[unit-row-actions] installed');
})();
/* === END UNIT ROW ACTIONS v1 === */
