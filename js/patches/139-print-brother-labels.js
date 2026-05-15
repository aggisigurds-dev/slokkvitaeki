/* === PRINT BROTHER LABELS v2 ===
   Overrides Print.showJob (called by the "🖨 Prenta N miða" button in the new
   Afgreiðsla aside) to print Brother 18×Nmm thermal labels instead of the old
   stk-prev card design.

   Thin wrapper: reuses the template/CSS/QR generation already in patch 08
   (window.QrLabelCustomer). One label per job.units entry, length picker
   defaults to 70mm (50/70/90/100mm choices). Does NOT touch the checkout
   flow — only replaces the legacy Print.showJob. */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!window.Print) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function pickLength() {
    return new Promise(resolve => {
      document.getElementById('_pbl-picker')?.remove();
      const m = document.createElement('div');
      m.id = '_pbl-picker';
      m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
      m.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:22px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(15,23,42,.25);font-family:inherit;">
          <h2 style="margin:0 0 4px;font-size:17px;color:#0f172a;">🏷️ Veldu miðalengd</h2>
          <div style="font-size:13px;color:#64748b;margin-bottom:14px;">Brother PT-P750W · 24mm TZe tape · 18mm prentanlegt</div>
          <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin:4px 0 4px;text-transform:uppercase;letter-spacing:.04em;">Lengd miða</label>
          <select id="_pbl-len" style="width:100%;padding:9px 11px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;color:#0f172a;background:#fff;outline:none;box-sizing:border-box;">
            <option value="50">50 mm — stutt</option>
            <option value="70" selected>70 mm — stöðluð</option>
            <option value="90">90 mm</option>
            <option value="100">100 mm — löng</option>
          </select>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button id="_pbl-cancel" style="padding:9px 16px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:500;">Hætta við</button>
            <button id="_pbl-ok" style="padding:9px 16px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #2563eb;background:#2563eb;color:#fff;font-weight:600;">🖨 Prenta</button>
          </div>
        </div>`;
      document.body.appendChild(m);
      function done(val) {
        document.removeEventListener('keydown', onKey);
        m.remove();
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(null); }
        else if (e.key === 'Enter') { e.preventDefault(); done(+document.getElementById('_pbl-len').value); }
      }
      document.addEventListener('keydown', onKey);
      m.querySelector('#_pbl-cancel').addEventListener('click', () => done(null));
      m.querySelector('#_pbl-ok').addEventListener('click', () => done(+document.getElementById('_pbl-len').value));
      m.addEventListener('click', e => { if (e.target === m) done(null); });
      setTimeout(() => document.getElementById('_pbl-len')?.focus(), 30);
    });
  }

  async function showJobBrother(job) {
    if (!job || !Array.isArray(job.units) || !job.units.length) {
      alert('Engar einingar til að prenta.');
      return;
    }
    const QLC = window.QrLabelCustomer;
    if (!QLC || !QLC.buildPrintLabel || !QLC.openPrintWindow) {
      alert('QR-miðakerfið er ekki hlaðið — get ekki prentað.');
      return;
    }

    const lengthMm = await pickLength();
    if (lengthMm == null) return;

    try { await QLC.ensureQRLib(); } catch (e) {
      alert('Gat ekki hlaðið QR safn.');
      return;
    }

    // Build labels in parallel using patch 08's exact template
    const parts = await Promise.all(job.units.map(async u => {
      const qrText = u.serial || '';
      const qrDataUrl = qrText ? await QLC.qrPNG(qrText, 320) : '';
      return QLC.buildPrintLabel({
        qrDataUrl,
        name: job.customer || '—',
        phone: job.phone || '',
        serial: u.serial || '',
        extra: [u.type, u.size].filter(Boolean).join(' ') || u.service || ''
      });
    }));

    QLC.openPrintWindow(parts.join(''), lengthMm);
  }

  const origShowJob = window.Print.showJob;
  window.Print.showJob = function(job) {
    this.job = job;
    showJobBrother(job).catch(err => {
      console.error('[patch-139]', err);
      try { origShowJob.call(window.Print, job); } catch (_) {}
    });
  };

  // 2026-05-12: Also override Print.showQR — used in Þjónustutæki rows,
  // Companies (Fyrirtækjaþjónusta) detail, Geymsla unit lists, overdue/scan
  // result modals. Was rendering a tiny 52px QR card; now uses the same
  // Brother 18×Nmm template as Print.showJob.
  async function showUnitBrother(unit) {
    if (!unit) { alert('Engin eining fundin til að prenta.'); return; }
    const QLC = window.QrLabelCustomer;
    if (!QLC || !QLC.buildPrintLabel || !QLC.openPrintWindow) {
      alert('QR-miðakerfið er ekki hlaðið — get ekki prentað.');
      return;
    }
    const lengthMm = await pickLength();
    if (lengthMm == null) return;
    try { await QLC.ensureQRLib(); } catch (e) {
      alert('Gat ekki hlaðið QR safn.');
      return;
    }
    const qrText = unit.serial || '';
    const qrDataUrl = qrText ? await QLC.qrPNG(qrText, 320) : '';
    const labelHTML = QLC.buildPrintLabel({
      qrDataUrl,
      name: unit.client || unit.customer || '—',
      phone: unit.phone || '',
      serial: unit.serial || '',
      extra: [unit.type, unit.size].filter(Boolean).join(' ') || unit.location || ''
    });
    QLC.openPrintWindow(labelHTML, lengthMm);
  }

  const origShowQR = window.Print.showQR;
  window.Print.showQR = function(unit) {
    showUnitBrother(unit).catch(err => {
      console.error('[patch-139] showQR:', err);
      try { origShowQR.call(window.Print, unit); } catch (_) {}
    });
  };

  console.log('[patch-139] print-brother-labels v3 installed — Print.showJob + Print.showQR now use patch-08 Brother template');
})();
/* === END PRINT BROTHER LABELS === */
