/* === UNIT DETAIL MODAL v1 ===
 *
 * Sameinað skjáborð fyrir öll tæki — opnast við smelli á tækjarúðu hvar
 * sem er í kerfinu (Afgreiðsla / Verkstæði / Fyrirtækjaspjaldi /
 * Þjónustutæki / Geymsla / Lánstæki).
 *
 * ── Innihaldið ─────────────────────────────────────────────────────────────
 *   1. Upplýsingar — týpa, stærð, staðsetning, viðskiptavinur, sími, þrýstingur,
 *      næsta skoðun, síðasta skoðun, dagsetningar
 *   2. Strikamerki / QR — núverandi gildi sýnt sem QR-kóði + texti, hnappur
 *      til að breyta (slá inn handsmíðað eða skanna), prenta á 54×17mm
 *   3. Staða — quick-buttons: Í lagi · Þarfnast viðgerðar · Bilað · Ónýtt
 *   4. Athugasemdir — textareiti með auto-save (debounce)
 *   5. Saga — listi yfir verkbeiðnir tengdar þessu tæki (síðustu 10)
 *
 * ── Aðgangur ───────────────────────────────────────────────────────────────
 *   • Smellur á tækjarúðu (heilan tr) opnar þetta modal
 *   • Hnappur „📋 Upplýsingar" í aðgerðadálki á rúðu (bætt sjálfvirkt)
 *   • window.UnitDetail.open(unitId, table?) kalla beint
 *
 * ── Allt er saved beint í Supabase (uttaeki / lanstaeki) ──────────────────
 */
(() => {
  if (window.__unitDetailModalInstalled) return;
  window.__unitDetailModalInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }

  async function fetchUnit(unitId, table) {
    const SB = getSB();
    if (!SB) return null;
    const tbl = table === 'lanstaeki' ? 'lanstaeki' : 'uttaeki';
    const r = await SB.from(tbl).select('*').eq('id', unitId).single();
    if (r.error || !r.data) return null;
    return { ...r.data, _table: tbl };
  }

  async function fetchUnitJobs(unit) {
    if (!unit || !unit.serial) return [];
    const SB = getSB();
    if (!SB) return [];
    try {
      // Find verkbeidnir that mention this unit's serial in their lines
      // (verkbeidnir.linur is JSONB array)
      const r = await SB.from('verkbeidnir')
        .select('id,num,customer,created_at,status')
        .order('created_at', { ascending: false })
        .limit(40);
      const all = r.data || [];
      // Client-side filter — look for serial in line items
      // (we don't have a direct join so fetch units→jobs map via DB.cache if available)
      const jobIds = new Set();
      const cache = (window.DB && window.DB.cache && window.DB.cache.units) || [];
      const myUnit = cache.find(u => u.serial === unit.serial);
      if (myUnit && myUnit.job_id) jobIds.add(myUnit.job_id);
      // Best-effort: scan jobs and look for matching serial in their stored line lists
      return all.filter(j => jobIds.has(j.id)).slice(0, 10);
    } catch (e) {
      return [];
    }
  }

  async function updateUnit(unit, patch) {
    const SB = getSB();
    if (!SB) return false;
    const r = await SB.from(unit._table).update(patch).eq('id', unit.id);
    if (r.error) {
      alert('Villa: ' + r.error.message);
      return false;
    }
    if (unit._table === 'uttaeki' && window.DB && window.DB.cache && Array.isArray(window.DB.cache.units)) {
      const idx = window.DB.cache.units.findIndex(u => u.id === unit.id);
      if (idx >= 0) Object.assign(window.DB.cache.units[idx], patch);
    }
    Object.assign(unit, patch);
    return true;
  }

  // ── Print 54×17mm label (re-uses BarcodeMgr logic) ────────────────────────
  function printLabel(unit) {
    if (window.BarcodeMgr && window.BarcodeMgr.print) {
      let jobCustomer = unit.client || '', jobPhone = unit.phone || '';
      try {
        if (window.Counter && Counter.sel && window.DB && DB.getJob) {
          const job = DB.getJob(Counter.sel);
          if (job) { jobCustomer = job.customer || ''; jobPhone = job.phone || ''; }
        }
      } catch (_) {}
      window.BarcodeMgr.print(unit, jobCustomer, jobPhone);
    } else {
      alert('Prentvirknin (patch 95) ekki hlaðin.');
    }
  }

  // ── Open scanner via patch 95 ─────────────────────────────────────────────
  function scanBarcode(onResult) {
    if (window.BarcodeMgr && window.BarcodeMgr.scan) {
      window.BarcodeMgr.scan(onResult);
    } else {
      alert('Skannarvirkni ekki hlaðin.');
    }
  }

  const STATUS_OPTIONS = [
    { v: 'active',  label: '✓ Í lagi',           color: '#16a34a', bg: '#dcfce7' },
    { v: 'repair',  label: '🔧 Þarfnast viðgerðar', color: '#b45309', bg: '#fef3c7' },
    { v: 'fail',    label: '⚠ Bilað',             color: '#dc2626', bg: '#fee2e2' },
    { v: 'scrap',   label: '🚫 Ónýtt',            color: '#475569', bg: '#f1f5f9' },
    { v: 'geymsla', label: '📦 Geymsla',          color: '#1e40af', bg: '#dbeafe' }
  ];

  async function openModal(unitId, table) {
    const unit = await fetchUnit(unitId, table);
    if (!unit) { alert('Tæki fannst ekki'); return; }

    let dlg = document.getElementById('_ud-modal');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_ud-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100030;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';

    const title = (unit.type || 'Tæki') + (unit.size ? ' · ' + unit.size : '');

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">' +
        // Header
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div style="min-width:0">' +
            '<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Tæki · ' + esc(unit.serial || '—') + '</div>' +
            '<div style="font-size:18px;font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(title) + '</div>' +
          '</div>' +
          '<button id="_ud-x" type="button" style="background:transparent;border:1px solid #475569;color:#cbd5e1;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        // Body (scrollable)
        '<div id="_ud-body" style="flex:1;overflow:auto;padding:18px 22px"></div>' +
        // Footer
        '<div style="padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
          '<span id="_ud-status-text" style="flex:1;font-size:12px;color:#94a3b8;align-self:center"></span>' +
          '<button id="_ud-print" type="button" style="padding:9px 16px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">🖨 Prenta label</button>' +
          '<button id="_ud-close" type="button" style="padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">Loka</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_ud-x').addEventListener('click', close);
    dlg.querySelector('#_ud-close').addEventListener('click', close);
    dlg.querySelector('#_ud-print').addEventListener('click', () => printLabel(unit));

    function setStatus(txt, color) {
      const s = dlg.querySelector('#_ud-status-text');
      if (!s) return;
      s.textContent = txt;
      s.style.color = color || '#94a3b8';
    }

    renderBody(unit, dlg, setStatus);
  }

  function renderBody(unit, dlg, setStatus) {
    const body = dlg.querySelector('#_ud-body');
    const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=' + encodeURIComponent(unit.serial || '');

    // ── Section: Strikamerki + QR ─────────────────────────────────────────
    const barcodeSection =
      '<div style="margin-bottom:18px">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Strikamerki / QR</div>' +
        '<div style="display:grid;grid-template-columns:120px 1fr;gap:14px;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">' +
          '<img src="' + qrSrc + '" alt="QR" style="width:120px;height:120px;background:#fff;border-radius:8px;border:1px solid #e2e8f0">' +
          '<div>' +
            '<div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:4px">Strikamerki</div>' +
            '<div style="display:flex;gap:6px">' +
              '<input id="_ud-serial" type="text" value="' + esc(unit.serial || '') + '" ' +
                'style="flex:1;padding:8px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;font-family:\'Courier New\',monospace;font-weight:700;letter-spacing:0.04em;box-sizing:border-box">' +
              '<button id="_ud-scan" type="button" title="Skanna" style="padding:8px 12px;background:#2563eb;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600">📷</button>' +
              '<button id="_ud-save-serial" type="button" style="padding:8px 14px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600">Vista</button>' +
            '</div>' +
            '<div style="margin-top:10px;font-size:11px;color:#64748b;line-height:1.4">Sláðu inn handsmíðað eða skannaðu (QR · Code 128 · EAN · UPC · Code 39 · ITF). Þú getur breytt strikamerkinu og vistað.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // ── Section: Staða ─────────────────────────────────────────────────────
    const statusButtons = STATUS_OPTIONS.map(o =>
      '<button data-status="' + o.v + '" type="button" ' +
        'style="padding:10px 14px;border:2px solid ' + (unit.status === o.v ? o.color : '#e2e8f0') + ';' +
        'background:' + (unit.status === o.v ? o.bg : '#fff') + ';color:' + o.color + ';' +
        'border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;flex:1;min-width:130px">' +
        o.label +
      '</button>'
    ).join('');
    const statusSection =
      '<div style="margin-bottom:18px">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Staða</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + statusButtons + '</div>' +
      '</div>';

    // ── Section: Upplýsingar (editable) ───────────────────────────────────
    const today = new Date().toISOString().slice(0,10);
    const infoSection =
      '<div style="margin-bottom:18px">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Upplýsingar</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          inputField('_ud-type', 'Týpa', unit.type, 'select', ['ABC Duft','CO2','Vatn','Froðuefni','Halon','Slönguhjól','Reykskynjari','Annað']) +
          inputField('_ud-size', 'Stærð', unit.size, 'text') +
          inputField('_ud-loc', 'Staðsetning', unit.location, 'text') +
          inputField('_ud-pressure', 'Þrýstingur', unit.pressure, 'number') +
          inputField('_ud-client', 'Viðskiptavinur', unit.client, 'text') +
          inputField('_ud-phone', 'Sími', unit.phone, 'tel') +
          inputField('_ud-next', 'Næsta skoðun', unit.next_insp, 'date') +
          inputField('_ud-last', 'Síðasta skoðun', unit.last_insp || '', 'date') +
        '</div>' +
        '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:10px">' +
          '<button id="_ud-save-info" type="button" style="padding:8px 16px;background:#0f172a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">Vista breytingar</button>' +
        '</div>' +
      '</div>';

    // ── Section: Athugasemdir ──────────────────────────────────────────────
    const notesSection =
      '<div style="margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
          '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Athugasemdir</div>' +
          '<span id="_ud-notes-status" style="font-size:11px;color:#94a3b8"></span>' +
        '</div>' +
        '<textarea id="_ud-notes" rows="3" placeholder="Athugasemdir, sögu, sérkennilegt..."' +
          ' style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;line-height:1.5;resize:vertical;box-sizing:border-box;background:#fffef9">' + esc(unit.notes || '') + '</textarea>' +
      '</div>';

    // ── Section: Saga (history) ────────────────────────────────────────────
    const historySection =
      '<div style="margin-bottom:8px">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Saga tækisins</div>' +
        '<div id="_ud-history" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font-size:13px">' +
          '<div style="color:#94a3b8;font-style:italic">Hleður sögu...</div>' +
        '</div>' +
      '</div>';

    body.innerHTML = barcodeSection + statusSection + infoSection + notesSection + historySection;

    // Async load history into placeholder
    loadHistory(unit, body.querySelector('#_ud-history'));

    // ── Wire Strikamerki section ───────────────────────────────────────────
    const serialInput = body.querySelector('#_ud-serial');
    body.querySelector('#_ud-scan').addEventListener('click', () => {
      scanBarcode(text => {
        if (text) serialInput.value = String(text).trim();
        serialInput.focus();
      });
    });
    body.querySelector('#_ud-save-serial').addEventListener('click', async () => {
      const v = serialInput.value.trim();
      if (!v) { alert('Strikamerki má ekki vera tómt.'); return; }
      const ok = await updateUnit(unit, { serial: v });
      if (ok) {
        setStatus('✓ Strikamerki vistað', '#16a34a');
        // Refresh QR image
        const qrImg = body.querySelector('img[alt="QR"]');
        if (qrImg) qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=' + encodeURIComponent(v);
        // Refresh header serial
        const hdrSerial = dlg.querySelector('div[style*="text-transform:uppercase"]');
        if (hdrSerial) hdrSerial.textContent = 'Tæki · ' + v;
      }
    });

    // ── Wire Staða buttons ────────────────────────────────────────────────
    body.querySelectorAll('[data-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = btn.dataset.status;
        if (newStatus === unit.status) return;
        const ok = await updateUnit(unit, { status: newStatus });
        if (ok) {
          setStatus('✓ Staða uppfærð', '#16a34a');
          // Re-render status section to update visual state
          renderBody(unit, dlg, setStatus);
        }
      });
    });

    // ── Wire Upplýsingar Vista ─────────────────────────────────────────────
    body.querySelector('#_ud-save-info').addEventListener('click', async () => {
      const patch = {
        type: body.querySelector('#_ud-type').value || unit.type || 'Annað', // type is NOT NULL — never blank it
        size: body.querySelector('#_ud-size').value || null,
        location: body.querySelector('#_ud-loc').value || null,
        pressure: parseInt(body.querySelector('#_ud-pressure').value) || null,
        client: body.querySelector('#_ud-client').value || null,
        phone: body.querySelector('#_ud-phone').value || null,
        next_insp: body.querySelector('#_ud-next').value || null,
        last_insp: body.querySelector('#_ud-last').value || null
      };
      const ok = await updateUnit(unit, patch);
      if (ok) setStatus('✓ Upplýsingar vistaðar', '#16a34a');
    });

    // ── Wire Athugasemdir auto-save ───────────────────────────────────────
    const notesTa = body.querySelector('#_ud-notes');
    const notesStatus = body.querySelector('#_ud-notes-status');
    let notesTimer = null;
    let lastSaved = unit.notes || '';
    notesTa.addEventListener('input', () => {
      if (notesTimer) clearTimeout(notesTimer);
      notesStatus.textContent = '…';
      notesStatus.style.color = '#94a3b8';
      notesTimer = setTimeout(async () => {
        if (notesTa.value === lastSaved) { notesStatus.textContent = ''; return; }
        const ok = await updateUnit(unit, { notes: notesTa.value });
        if (ok) {
          lastSaved = notesTa.value;
          notesStatus.textContent = '✓ vistað';
          notesStatus.style.color = '#16a34a';
          setTimeout(() => { if (notesStatus.textContent === '✓ vistað') notesStatus.textContent = ''; }, 1800);
        } else {
          notesStatus.textContent = '✗ ekki vistað';
          notesStatus.style.color = '#dc2626';
        }
      }, 800);
    });
    notesTa.addEventListener('blur', () => {
      if (notesTimer) { clearTimeout(notesTimer); notesTimer = null; }
      if (notesTa.value !== lastSaved) {
        updateUnit(unit, { notes: notesTa.value }).then(ok => {
          if (ok) { lastSaved = notesTa.value; notesStatus.textContent = '✓ vistað'; notesStatus.style.color = '#16a34a'; }
        });
      }
    });
  }

  // ── Saga / History loader ─────────────────────────────────────────────────
  async function loadHistory(unit, container) {
    if (!container) return;
    const SB = getSB();
    if (!SB) { container.innerHTML = '<div style="color:#94a3b8">Engin gagnabankatenging</div>'; return; }

    let entries = []; // { ts, kind, label, detail, color }

    // 1. Refills (afyllingar) — recharge / refill history
    try {
      const r = await SB.from('afyllingar')
        .select('id,dagsetning,efni,magn_kg,kostnadur,taeknimadur,athugasemd,created_at')
        .or('uttaeki_id.eq.' + unit.id + ',uttaeki_nr.eq.' + JSON.stringify(unit.serial || ''))
        .order('dagsetning', { ascending: false })
        .limit(30);
      (r.data || []).forEach(a => {
        entries.push({
          ts: a.dagsetning || a.created_at,
          kind: 'afylling',
          label: '🧴 Endurhleðsla',
          detail: (a.efni ? esc(a.efni) : '') + (a.magn_kg ? ' · ' + a.magn_kg + ' kg' : '') +
                  (a.taeknimadur ? ' · ' + esc(a.taeknimadur) : '') +
                  (a.athugasemd ? '<div style="font-size:11px;color:#64748b;margin-top:2px">' + esc(a.athugasemd) + '</div>' : ''),
          color: '#7c3aed'
        });
      });
    } catch (_) {}

    // 2. Inspection: derive from last_insp / next_insp on the unit itself
    if (unit.last_insp) {
      entries.push({
        ts: unit.last_insp,
        kind: 'insp',
        label: '✓ Síðasta skoðun',
        detail: 'Skoðun framkvæmd',
        color: '#16a34a'
      });
    }
    if (unit.next_insp) {
      entries.push({
        ts: unit.next_insp,
        kind: 'next-insp',
        label: '📅 Næsta skoðun',
        detail: 'Áætluð skoðun',
        color: '#2563eb'
      });
    }

    // 3. Audit log (if table exists) — any changes to this unit
    try {
      const r = await SB.from('audit_log')
        .select('ts,action,details,user_email')
        .eq('table_name', 'uttaeki')
        .eq('row_id', String(unit.id))
        .order('ts', { ascending: false })
        .limit(20);
      (r.data || []).forEach(a => {
        const det = a.details && typeof a.details === 'object' ? a.details : {};
        let summary = a.action || 'breyting';
        if (det.changed_fields && Array.isArray(det.changed_fields)) {
          summary = 'Breyting: ' + det.changed_fields.join(', ');
        }
        entries.push({
          ts: a.ts,
          kind: 'audit',
          label: '✎ ' + esc(summary),
          detail: a.user_email ? esc(a.user_email) : '',
          color: '#64748b'
        });
      });
    } catch (_) { /* audit_log may not exist */ }

    // 4. Verkbeidnir (work orders) — find jobs that include this serial
    try {
      const r = await SB.from('verkbeidnir')
        .select('id,num,customer,created_at,status,linur')
        .order('created_at', { ascending: false })
        .limit(80);
      (r.data || []).forEach(j => {
        const linur = Array.isArray(j.linur) ? j.linur : [];
        const hit = linur.some(l => {
          if (!l) return false;
          if (l.serial === unit.serial) return true;
          if (typeof l === 'string' && l.includes(unit.serial)) return true;
          return false;
        });
        if (hit) {
          entries.push({
            ts: j.created_at,
            kind: 'verkbeidni',
            label: '🔨 Verkbeiðni ' + esc(j.num || '#' + j.id),
            detail: (j.customer ? esc(j.customer) : '') + (j.status ? ' · ' + esc(j.status) : ''),
            color: '#b45309'
          });
        }
      });
    } catch (_) {}

    // Sort by ts desc
    entries.sort((a, b) => {
      const ta = new Date(a.ts).getTime() || 0;
      const tb = new Date(b.ts).getTime() || 0;
      return tb - ta;
    });

    if (!entries.length) {
      container.innerHTML = '<div style="color:#94a3b8;font-style:italic;padding:6px 0">Engin saga skráð fyrir þetta tæki ennþá.</div>';
      return;
    }

    container.innerHTML = entries.map(e =>
      '<div style="display:grid;grid-template-columns:80px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid #e2e8f0">' +
        '<div style="font-size:11px;color:#64748b;font-weight:600">' + esc(fmtDate(e.ts)) + '</div>' +
        '<div>' +
          '<div style="font-size:13px;font-weight:600;color:' + e.color + '">' + e.label + '</div>' +
          (e.detail ? '<div style="font-size:12px;color:#475569;margin-top:1px">' + e.detail + '</div>' : '') +
        '</div>' +
      '</div>'
    ).join('');
  }

  function inputField(id, label, value, type, options) {
    const v = value == null ? '' : value;
    if (type === 'select' && Array.isArray(options)) {
      // Keep the unit's existing value selectable even if it isn't one of the
      // predefined options (e.g. an imported type like "10") — otherwise the
      // <select> renders blank and saving would wipe a NOT-NULL field.
      const optList = options.slice();
      if (v !== '' && optList.indexOf(v) < 0) optList.unshift(v);
      const opts = optList.map(o => '<option' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('');
      return '<div>' +
        '<label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:3px">' + esc(label) + '</label>' +
        '<select id="' + id + '" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;background:#fff">' +
          '<option value=""></option>' + opts +
        '</select>' +
      '</div>';
    }
    return '<div>' +
      '<label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:3px">' + esc(label) + '</label>' +
      '<input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
    '</div>';
  }

  // ── Wire row clicks across views ──────────────────────────────────────────
  // SAFE SCOPE: Only fires for actual unit rows (must have .ser cell with a
  // valid serial that matches a known uttaeki/lanstaeki entry). All other
  // clicks pass through untouched, so company list / company detail clicks
  // (Companies.openDetail etc) keep working as before.
  //
  // Strategy: we use a delegate on the container. The delegate explicitly
  // skips clicks where:
  //   - target is a button, link, form input (already-interactive)
  //   - tr has no .ser cell (it's a list row, not a unit row)
  //   - the serial doesn't match any unit in cache and is not in lanstaeki
  // We do NOT call stopPropagation, so existing handlers also run.
  function wireRowClicks(container) {
    if (!container || container.dataset._udWired === '1') return;
    container.dataset._udWired = '1';
    container.addEventListener('click', e => {
      // Skip if click was on a button or interactive element
      if (e.target.closest('button, a, input, select, textarea, label')) return;
      const tr = e.target.closest('tr');
      if (!tr) return;
      // Only act on rows that explicitly look like a unit row — must have a
      // .ser cell. This prevents false matches on header rows or other tables.
      const serialEl = tr.querySelector('.ser');
      if (!serialEl) return;
      const serial = serialEl.textContent.trim();
      if (!serial) return;
      // Find unit in DB cache
      const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
      const unit = units.find(u => u.serial === serial);
      if (unit) { openModal(unit.id, 'uttaeki'); return; }
      // Lánstæki row — must be inside view-lanstaeki to even try fetching
      if (container.id === 'view-lanstaeki') {
        const SB = getSB();
        if (!SB) return;
        SB.from('lanstaeki').select('id').eq('serial', serial).single().then(r => {
          if (r && r.data) openModal(r.data.id, 'lanstaeki');
        });
      }
    });
  }

  function attach(id) {
    const el = document.getElementById(id);
    if (!el) { setTimeout(() => attach(id), 800); return; }
    wireRowClicks(el);
  }
  // Attach to all unit-listing containers, including companies-main now that
  // the .ser-cell check is strict enough to avoid intercepting company list
  // / detail-page clicks.
  attach('counter-main');
  attach('workshop-main');
  attach('companies-main');
  attach('view-geymsla');
  attach('view-lanstaeki');
  attach('view-thjonustutaeki');

  // Public API
  window.UnitDetail = {
    open: openModal
  };

  console.log('[unit-detail-modal] installed — click any unit row to open comprehensive detail');
})();
/* === END UNIT DETAIL MODAL v1 === */
