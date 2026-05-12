/* === COUNTER / WORKSHOP REDESIGN v1 === */
/* Replaces the long single-column work-order sidebar in Afgreiðsla
 * (view-counter) with a 3-column status layout: Móttekin / Í vinnslu / Tilbúin.
 * Replaces Verkstæði (view-workshop) with a 2-column layout: Móttekin / Í vinnslu.
 *
 * Within each column, when one customer has 2+ jobs they collapse into a
 * single expandable row (�-� Harpa · 3 verk · 20 tæki) that you click to expand
 * inline. Single-job customers show as a normal card.
 *
 * Click any card �?' opens the existing job-detail in a centered modal
 * (containing the original #counter-main and #print-aside elements, so the
 * existing renderDetail/renderPrintAside/Print.showJob/etc. all keep working).
 *
 * Legacy DOM IDs (#counter-sidebar, #job-list, #sidebar-ready, #workshop-queue,
 * #workshop-detail) are kept as hidden elements so editjobbutton.js,
 * searchbox.js and similar continue to find their anchors.
 *
 * Bug fixes folded in:
 *   - #counter-main sets data-job-id so editjobbutton.js's findCurrentJobId
 *     succeeds even when num doesn't match the YYYY-NNN regex
 *   - .info-grid in renderDetail is tagged data-_pm-info to prevent legacy
 *     "enhance company info" pollers from clobbering job phone with kennitala
 */
(() => {
  if (window.__counterWorkshopRedesignInstalled) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  // 2026-05-10 (#3): Strip -V1 suffix for display in cards.
  // Detail views still get the full num via DB.getJob(id).
  function dnum(n) { return esc(String(n == null ? '' : n).replace(/-V\d+$/, '')); }

  // ----- Counter (Afgreiðsla) -----

  function counterRender() {
    const container = document.getElementById('view-counter');
    if (!container) return;
    const all   = window.DB && DB.getActiveJobs ? DB.getActiveJobs() : [];
    const byStatus = { received: [], inprogress: [], ready: [] };
    all.forEach(j => {
      const s = j.status === 'in_progress' ? 'inprogress' : j.status;
      (byStatus[s] || byStatus.received).push(j);
    });

    const html =
      '<div id="counter-sidebar" style="padding:10px 16px;border-bottom:1px solid var(--brd,#e4e6ea);display:flex;align-items:center;gap:10px;background:#f8f9fb;flex-wrap:wrap">' +
        '<button class="btn btn-primary btn-sm" onclick="Counter.openNew()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Ný verk</button>' +
        `<span style="font-size:12px;color:var(--ink3,#8891a0)">${all.length} virk verk · ${byStatus.ready.length} tilbúin</span>` +
      '</div>' +
      // Legacy IDs kept alive (hidden) so editjobbutton.js, searchbox.js work
      '<div style="display:none"><div id="job-list"></div><div id="sidebar-ready"></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px;height:calc(100vh - 110px);overflow:hidden;box-sizing:border-box;min-width:0">' +
        colHtml('Móttekin',  byStatus.received.length + ' verk',   '#64748b', '#f8fafc',
                renderJobs('received',   byStatus.received,   false)) +
        colHtml('Í vinnslu', byStatus.inprogress.length + ' verk', '#d97706', '#fef3c7',
                renderJobs('inprogress', byStatus.inprogress, false)) +
        colHtml('Tilbúin',   byStatus.ready.length + ' verk',      '#059669', '#ecfdf5',
                renderJobs('ready',      byStatus.ready,      true)) +
      '</div>' +
      // Detail modal: holds #counter-main + #print-aside so legacy renderDetail/renderPrintAside still work
      '<div id="counter-detail-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:8000;align-items:center;justify-content:center;padding:24px">' +
        '<div style="background:#fff;border-radius:16px;max-width:1100px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 28px 80px rgba(0,0,0,.35)">' +
          '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:flex-end">' +
            '<button onclick="Counter.closeJobModal()" style="border:none;background:#f3f4f6;border-radius:10px;padding:6px 14px;font-size:13px;cursor:pointer">✕ Loka</button>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 320px;gap:0;flex:1;overflow:hidden">' +
            '<div id="counter-main" style="overflow-y:auto;padding:24px"></div>' +
            '<aside id="print-aside" style="overflow-y:auto;padding:20px;border-left:1px solid #f1f5f9;background:#fafbfc"></aside>' +
          '</div>' +
        '</div>' +
      '</div>';
    container.innerHTML = html;

    const ab = document.getElementById('alert-badge');
    if (ab && DB.getOverdue && DB.getDue) ab.textContent = DB.getOverdue().length + DB.getDue().length;

    // 2026-05-10 (L2 fix): If a job was selected, re-render detail AND
    // re-show the modal �?" innerHTML replace destroyed the previous one.
    // Without this, clicking actions inside the detail modal that trigger
    // App.refreshAll() (e.g. updateUnitStatus) silently closed the modal.
    if (Counter.sel) {
      const job = DB.getJob(Counter.sel);
      if (job && Counter.renderDetail) Counter.renderDetail(job);
      if (job && Counter.renderPrintAside) Counter.renderPrintAside(job);
      if (job && Counter.openJobModal) Counter.openJobModal();
    }
  }

  function colHtml(title, sub, titleCol, bgGrad, body) {
    return '<div style="display:flex;flex-direction:column;background:#fff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;min-height:0;min-width:0">' +
      `<div style="padding:8px 12px;border-bottom:1px solid #f1f5f9;background:linear-gradient(180deg,${bgGrad} 0%,#fff 100%);flex-shrink:0">` +
        `<div style="font-size:11px;font-weight:700;color:${titleCol};text-transform:uppercase;letter-spacing:.06em">${esc(title)}</div>` +
        `<div style="font-size:10px;color:#94a3b8;margin-top:1px">${esc(sub)}</div>` +
      '</div>' +
      `<div style="overflow-y:auto;padding:6px;flex:1;min-height:0">${body}</div>` +
    '</div>';
  }

  function renderJobs(statusKey, jobs, isReady) {
    if (!jobs.length) return '<div style="padding:20px;color:#94a3b8;font-size:12px;text-align:center">Engin verk</div>';
    const byCust = {};
    jobs.forEach(j => { (byCust[j.customer] = byCust[j.customer] || []).push(j); });
    const rendered = {};
    let html = '';
    jobs.forEach(j => {
      if (rendered[j.customer]) return;
      const list = byCust[j.customer];
      if (list.length === 1) {
        html += isReady ? readyCard(j) : jobCard(j);
      } else {
        const totalUnits = list.reduce((s, jj) => s + (jj.units ? jj.units.length : 0), 0);
        html += customerGroup(statusKey, { name: j.customer, jobs: list, totalUnits }, isReady);
      }
      rendered[j.customer] = true;
    });
    return html;
  }

  function jobCard(j) {
    const dot = (window.U && U.dc) ? U.dc(j.status) : '';
    const badge = (window.U && U.badge) ? U.badge(j.status) : '';
    return '<div onclick="Counter.select(' + j.id + ')" style="display:flex;gap:10px;padding:10px;border-radius:10px;cursor:pointer;margin-bottom:6px;background:#fff;border:1px solid #f1f5f9;transition:all .12s" onmouseover="this.style.background=\'#f8fafc\';this.style.borderColor=\'#e2e8f0\'" onmouseout="this.style.background=\'#fff\';this.style.borderColor=\'#f1f5f9\'">' +
      `<div class="jli-dot ${dot}" style="flex-shrink:0;margin-top:4px"></div>` +
      '<div style="min-width:0;flex:1">' +
        `<div style="font-family:var(--mono,monospace);font-size:11px;color:#94a3b8;font-weight:600">${dnum(j.num)}</div>` +
        `<div style="font-size:13px;font-weight:600;color:#0f172a;margin:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j.customer)}</div>` +
        `<div style="font-size:11px;color:#64748b">${j.units ? j.units.length : 0} slökkvitæki ${badge}</div>` +
      '</div>' +
    '</div>';
  }

  function readyCard(j) {
    return '<div style="display:flex;gap:8px;padding:10px;border-radius:10px;margin-bottom:6px;background:#f0fdf4;border:1px solid #bbf7d0">' +
      '<div onclick="Counter.select(' + j.id + ')" style="min-width:0;flex:1;cursor:pointer">' +
        `<div style="font-family:var(--mono,monospace);font-size:11px;color:#059669;font-weight:600">${dnum(j.num)}</div>` +
        `<div style="font-size:13px;font-weight:600;color:#0f172a;margin:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j.customer)}</div>` +
        `<div style="font-size:11px;color:#059669">${j.units ? j.units.length : 0} slökkvitæki</div>` +
      '</div>' +
      `<button class="btn btn-sm btn-success" onclick="event.stopPropagation();Counter.markCollected(${j.id})" style="flex-shrink:0;align-self:center">Sótt ✓</button>` +
    '</div>';
  }

  function customerGroup(statusKey, co, isReady) {
    const key = statusKey + ':' + co.name;
    const expanded = Counter.expandedCos[key] === true;
    const caret = expanded ? '▼' : '▶';
    let inner = '';
    if (expanded) {
      inner = '<div style="padding:4px 4px 8px 18px">' + co.jobs.map(j => {
        const badge = (window.U && U.badge) ? U.badge(j.status) : '';
        const dot = (window.U && U.dc) ? U.dc(j.status) : '';
        if (isReady) {
          return '<div style="display:flex;gap:8px;padding:7px 8px;border-radius:8px;margin-bottom:3px;background:#f0fdf4;border:1px solid #bbf7d0">' +
            '<div onclick="event.stopPropagation();Counter.select(' + j.id + ')" style="min-width:0;flex:1;cursor:pointer">' +
              `<div style="font-family:var(--mono,monospace);font-size:10px;color:#059669;font-weight:600">${dnum(j.num)}</div>` +
              `<div style="font-size:12px;color:#0f172a;margin:1px 0">${j.units ? j.units.length : 0} slökkvitæki</div>` +
            '</div>' +
            `<button class="btn btn-sm btn-success" onclick="event.stopPropagation();Counter.markCollected(${j.id})" style="flex-shrink:0;align-self:center">Sótt ✓</button>` +
          '</div>';
        }
        return '<div onclick="event.stopPropagation();Counter.select(' + j.id + ')" style="display:flex;gap:8px;padding:7px 8px;border-radius:8px;cursor:pointer;margin-bottom:3px;background:#f8fafc;border:1px solid #f1f5f9" onmouseover="this.style.background=\'#eef2f7\'" onmouseout="this.style.background=\'#f8fafc\'">' +
          `<div class="jli-dot ${dot}" style="flex-shrink:0;margin-top:3px"></div>` +
          '<div style="min-width:0;flex:1">' +
            `<div style="font-family:var(--mono,monospace);font-size:10px;color:#94a3b8">${dnum(j.num)}</div>` +
            `<div style="font-size:12px;color:#0f172a;margin:1px 0">${j.units ? j.units.length : 0} slökkvitæki ${badge}</div>` +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
    }
    const safeKey = key.replace(/'/g, "\\'");
    const bg = isReady ? '#f0fdf4' : '#fff';
    const border = isReady ? '#bbf7d0' : '#e5e7eb';
    const nameCol = isReady ? '#065f46' : '#111';
    return `<div onclick="Counter.toggleCo('${safeKey}')" style="margin-bottom:6px;background:${bg};border:1px solid ${border};border-radius:10px;cursor:pointer">` +
      '<div style="padding:10px 12px;display:flex;align-items:center;gap:8px">' +
        `<span style="color:#64748b;font-size:13px;width:14px">${caret}</span>` +
        '<div style="min-width:0;flex:1">' +
          `<div style="font-size:13px;font-weight:600;color:${nameCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(co.name)}</div>` +
          `<div style="font-size:11px;color:#64748b">${co.jobs.length} verk · ${co.totalUnits} tæki</div>` +
        '</div>' +
      '</div>' +
      inner +
    '</div>';
  }

  // ----- Workshop (Verkstæði) -----

  // Active service contracts �?" cached. Set is keyed by customer name (lowercased).
  let _contractSet = new Set();
  let _contractsLoading = false;
  async function loadContracts() {
    if (_contractsLoading) return;
    _contractsLoading = true;
    try {
      const sb = (window.DB && DB.sb) || null;
      if (!sb) return;
      const r = await sb.from('thjonustusamningar').select('company_nafn').eq('status', 'virkur');
      if (r && !r.error) {
        _contractSet = new Set((r.data || []).map(c => (c.company_nafn || '').trim().toLowerCase()).filter(Boolean));
      }
    } finally {
      _contractsLoading = false;
    }
  }
  function isContractCustomer(name) {
    return _contractSet.has((name || '').trim().toLowerCase());
  }

  function workshopRender() {
    const container = document.getElementById('view-workshop');
    if (!container) return;
    const jobs = window.DB && DB.getWorkshopJobs ? DB.getWorkshopJobs() : [];
    // Left: all workshop jobs (received + inprogress). Right: same set, filtered to contract holders.
    const contractJobs = jobs.filter(j => isContractCustomer(j.customer));

    const html =
      '<div style="padding:10px 16px;border-bottom:1px solid var(--brd,#e4e6ea);display:flex;align-items:center;gap:10px;background:#f8f9fb;flex-wrap:wrap">' +
        '<div style="font-size:13px;font-weight:600;color:#0f172a">Verkröð</div>' +
        `<span style="font-size:12px;color:var(--ink3,#8891a0)">${jobs.length} verk í vinnslu</span>` +
        '<button class="btn btn-outline btn-sm" onclick="Field.openScan()" style="margin-left:auto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M4 6V4h2"/><path d="M4 18v2h2"/><path d="M20 6V4h-2"/><path d="M20 18v2h-2"/><line x1="4" y1="12" x2="20" y2="12"/></svg>Skanna tæki</button>' +
      '</div>' +
      '<div style="display:none"><div id="workshop-queue"></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px;height:calc(100vh - 110px);overflow:hidden;box-sizing:border-box;min-width:0">' +
        colHtmlW('Verk',           jobs.length         + ' verk', '#64748b', wRenderJobs('all',      jobs))         +
        colHtmlW('Samningshafar',  contractJobs.length + ' verk', '#0d6efd', wRenderJobs('contract', contractJobs)) +
      '</div>' +
      '<div id="workshop-detail-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:8000;align-items:center;justify-content:center;padding:24px">' +
        '<div style="background:#fff;border-radius:16px;max-width:780px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 28px 80px rgba(0,0,0,.35)">' +
          '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:flex-end">' +
            '<button onclick="Workshop.closeDetail()" style="border:none;background:#f3f4f6;border-radius:10px;padding:6px 14px;font-size:13px;cursor:pointer">✕ Loka</button>' +
          '</div>' +
          '<div id="workshop-detail" style="overflow-y:auto;flex:1"></div>' +
        '</div>' +
      '</div>';
    container.innerHTML = html;

    if (Workshop.sel) {
      const job = DB.getJob(Workshop.sel);
      if (job && Workshop.renderDetail) Workshop.renderDetail(job);
      // 2026-05-10 (L2 fix): innerHTML replace just rebuilt the modal element
      // so its `display:flex` state from openDetail() is gone. Re-show it
      // when there's a selected job �?" keeps the detail modal stable across
      // unit-toggle re-renders (clicking �o" on a unit no longer closes/jumps
      // the modal).
      if (Workshop.openDetail) Workshop.openDetail();
    }
  }

  function colHtmlW(title, sub, titleCol, body) {
    return '<div style="display:flex;flex-direction:column;background:#fff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;min-height:0;min-width:0">' +
      '<div style="padding:12px 14px;border-bottom:1px solid #f1f5f9;background:linear-gradient(180deg,#f8fafc 0%,#fff 100%);flex-shrink:0">' +
        `<div style="font-size:12px;font-weight:700;color:${titleCol};text-transform:uppercase;letter-spacing:.06em">${esc(title)}</div>` +
        `<div style="font-size:11px;color:#94a3b8;margin-top:2px">${esc(sub)}</div>` +
      '</div>' +
      `<div style="overflow-y:auto;padding:8px;flex:1;min-height:0">${body}</div>` +
    '</div>';
  }

  function wRenderJobs(statusKey, jobs) {
    if (!jobs.length) return '<div style="padding:20px;color:#94a3b8;font-size:12px;text-align:center">Engin verk í vinnslu</div>';
    const byCust = {};
    jobs.forEach(j => { (byCust[j.customer] = byCust[j.customer] || []).push(j); });
    const rendered = {};
    let html = '';
    jobs.forEach(j => {
      if (rendered[j.customer]) return;
      const list = byCust[j.customer];
      if (list.length === 1) {
        html += wJobCard(j);
      } else {
        const tot = list.reduce((s, jj) => s + (jj.units ? jj.units.length : 0), 0);
        const done = list.reduce((s, jj) => s + (jj.units ? jj.units.filter(u => u.status === 'done').length : 0), 0);
        html += wCustomerGroup(statusKey, { name: j.customer, jobs: list, totalUnits: tot, doneUnits: done });
      }
      rendered[j.customer] = true;
    });
    return html;
  }

  function wJobCard(j) {
    const done = j.units ? j.units.filter(u => u.status === 'done').length : 0;
    const total = j.units ? j.units.length : 0;
    const pct = total ? Math.round(done / total * 100) : 0;
    const badge = (window.U && U.badge) ? U.badge(j.status) : '';
    const fd = (window.U && U.fd) ? U.fd(j.pickup) : (j.pickup || '');
    // Also show service desc + customer note on top-level job cards.
    const rawNotes = String(j.notes || '');
    const noteLines = rawNotes.split('\n').map(l => l.trim()).filter(Boolean);
    const svcDesc = noteLines[0] || '';
    const extraNote = noteLines.slice(1).map(l => l.replace(/^—\s*/, '').trim()).filter(Boolean).join(' · ');
    const svcHtml = svcDesc
      ? `<div style="font-size:11px;color:#475569;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(svcDesc)}</div>`
      : '';
    const noteHtml = extraNote
      ? `<div style="font-size:11px;color:#92400e;background:#fef3c7;border-left:3px solid #f59e0b;padding:3px 6px;border-radius:4px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(extraNote)}">📝 ${esc(extraNote)}</div>`
      : '';
    return '<div onclick="Workshop.select(' + j.id + ')" style="padding:10px;border-radius:10px;cursor:pointer;margin-bottom:6px;background:#fff;border:1px solid #f1f5f9;transition:all .12s" onmouseover="this.style.background=\'#f8fafc\';this.style.borderColor=\'#e2e8f0\'" onmouseout="this.style.background=\'#fff\';this.style.borderColor=\'#f1f5f9\'">' +
      '<div style="display:flex;justify-content:space-between;align-items:start;gap:8px">' +
        '<div style="min-width:0;flex:1">' +
          `<div style="font-family:var(--mono,monospace);font-size:11px;color:#94a3b8;font-weight:600">${dnum(j.num)}</div>` +
          `<div style="font-size:13px;font-weight:600;color:#0f172a;margin:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j.customer)}</div>` +
          `<div style="font-size:11px;color:#64748b">${done}/${total} lokið · Móttekið ${(window.U && U.fd) ? U.fd(j.dropoff) : (j.dropoff || '')}</div>` +
          svcHtml +
          noteHtml +
        '</div>' + badge +
      '</div>' +
      `<div style="margin-top:7px;height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct === 100 ? '#10b981' : '#f59e0b'};transition:width .2s"></div></div>` +
    '</div>';
  }

  function wCustomerGroup(statusKey, co) {
    const key = statusKey + ':' + co.name;
    const expanded = Workshop.expandedCos[key] === true;
    const caret = expanded ? '▼' : '▶';
    const pct = co.totalUnits ? Math.round(co.doneUnits / co.totalUnits * 100) : 0;
    let inner = '';
    if (expanded) {
      inner = '<div style="padding:4px 4px 8px 18px">' + co.jobs.map(j => {
        const done = j.units ? j.units.filter(u => u.status === 'done').length : 0;
        const total = j.units ? j.units.length : 0;
        const badge = (window.U && U.badge) ? U.badge(j.status) : '';
        // 2026-05-11: also surface the service description + any customer
        // note so the user doesn't have to open every job to know what's
        // in it. j.notes is "<service desc>\n— <state.notes>" from pos.js
        // (or just the service desc on older jobs).
        const rawNotes = String(j.notes || '');
        const noteLines = rawNotes.split('\n').map(l => l.trim()).filter(Boolean);
        const svcDesc = noteLines[0] || '';
        const extraNote = noteLines.slice(1).map(l => l.replace(/^—\s*/, '').trim()).filter(Boolean).join(' · ');
        const svcHtml = svcDesc
          ? `<div style="font-size:11px;color:#475569;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(svcDesc)}</div>`
          : '';
        const noteHtml = extraNote
          ? `<div style="font-size:11px;color:#92400e;background:#fef3c7;border-left:3px solid #f59e0b;padding:3px 6px;border-radius:4px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(extraNote)}">📝 ${esc(extraNote)}</div>`
          : '';
        return '<div onclick="event.stopPropagation();Workshop.select(' + j.id + ')" style="display:flex;gap:8px;padding:7px 8px;border-radius:8px;cursor:pointer;margin-bottom:3px;background:#f8fafc;border:1px solid #f1f5f9" onmouseover="this.style.background=\'#eef2f7\'" onmouseout="this.style.background=\'#f8fafc\'">' +
          '<div style="min-width:0;flex:1">' +
            `<div style="font-family:var(--mono,monospace);font-size:10px;color:#94a3b8">${dnum(j.num)}</div>` +
            `<div style="font-size:12px;color:#0f172a;margin:1px 0">${done}/${total} lokið ${badge}</div>` +
            svcHtml +
            noteHtml +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
    }
    const safeKey = key.replace(/'/g, "\\'");
    return `<div onclick="Workshop.toggleCo('${safeKey}')" style="margin-bottom:6px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer">` +
      '<div style="padding:10px 12px;display:flex;align-items:center;gap:8px">' +
        `<span style="color:#64748b;font-size:13px;width:14px">${caret}</span>` +
        '<div style="min-width:0;flex:1">' +
          `<div style="font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(co.name)}</div>` +
          `<div style="font-size:11px;color:#64748b">${co.jobs.length} verk · ${co.doneUnits}/${co.totalUnits} lokið</div>` +
        '</div>' +
      '</div>' +
      `<div style="margin:0 12px 10px;height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct === 100 ? '#10b981' : '#f59e0b'};"></div></div>` +
      inner +
    '</div>';
  }

  // Inject CSS override: app.css forces #view-counter.active and #view-workshop.active
  // to display:flex with default row direction. That squishes our 3-col / 2-col grid
  // (which is one of several sibling children) into a single column on the left.
  // Force flex-direction:column so our children stack toolbar�?'grid�?'modal vertically.
  // Also: at �?�900px (mobile), columns get too narrow to read, so stack them too.
  if (!document.getElementById('_cw_redesign_css')) {
    const css = document.createElement('style');
    css.id = '_cw_redesign_css';
    css.textContent =
      '#view-counter.active, #view-workshop.active {' +
      '  flex-direction: column !important;' +
      '  align-items: stretch !important;' +
      '  overflow: hidden !important;' +
      '}' +
      '@media (max-width: 900px) {' +
      '  #view-counter > div[style*="grid-template-columns:1fr 1fr 1fr"],' +
      '  #view-workshop > div[style*="grid-template-columns:1fr 1fr"] {' +
      '    grid-template-columns: 1fr !important;' +
      '    height: auto !important;' +
      '    overflow: auto !important;' +
      '  }' +
      '  #counter-detail-modal > div, #workshop-detail-modal > div {' +
      '    max-width: 96vw !important;' +
      '  }' +
      '  #counter-detail-modal [style*="grid-template-columns:1fr 320px"] {' +
      '    grid-template-columns: 1fr !important;' +
      '  }' +
      '  #counter-detail-modal aside { display: none !important; }' +
      '}';
    document.head.appendChild(css);
  }

  function install() {
    if (!window.Counter || !window.Workshop || typeof Counter.render !== 'function' || typeof Workshop.render !== 'function') {
      setTimeout(install, 300);
      return;
    }
    if (window.__counterWorkshopRedesignInstalled) return;
    window.__counterWorkshopRedesignInstalled = true;

    Counter.expandedCos = Counter.expandedCos || {};
    Counter.render = counterRender;
    Counter.toggleCo = function(key) { Counter.expandedCos[key] = !Counter.expandedCos[key]; Counter.render(); };
    Counter.openJobModal  = function() { const m = document.getElementById('counter-detail-modal'); if (m) m.style.display = 'flex'; };
    Counter.closeJobModal = function() { const m = document.getElementById('counter-detail-modal'); if (m) m.style.display = 'none'; Counter.sel = null; };

    const origCSelect = Counter.select;
    Counter.select = function(id) {
      Counter.sel = id;
      const job = DB.getJob(id);
      if (!job) return;
      if (Counter.renderDetail)     Counter.renderDetail(job);
      if (Counter.renderPrintAside) Counter.renderPrintAside(job);
      Counter.openJobModal();
      const main = document.getElementById('counter-main');
      if (main) main.dataset.jobId = String(id);
    };

    const origCRD = Counter.renderDetail;
    Counter.renderDetail = function(job) {
      origCRD.call(this, job);
      // Tag .info-grid so legacy patch-master "enhance company info" pollers don't hijack it
      const grid = document.querySelector('#counter-main .info-grid');
      if (grid) grid.setAttribute('data-_pm-info', 'job-detail');
    };

    Counter.renderList = function() { /* legacy stub �?" render() now drives this */ };

    Workshop.expandedCos = Workshop.expandedCos || {};
    Workshop.render = workshopRender;
    Workshop.toggleCo   = function(key) { Workshop.expandedCos[key] = !Workshop.expandedCos[key]; Workshop.render(); };
    Workshop.openDetail = function() { const m = document.getElementById('workshop-detail-modal'); if (m) m.style.display = 'flex'; };
    Workshop.closeDetail= function() { const m = document.getElementById('workshop-detail-modal'); if (m) m.style.display = 'none'; Workshop.sel = null; };

    Workshop.select = function(id) {
      Workshop.sel = id;
      const job = DB.getJob(id);
      if (!job) return;
      if (Workshop.renderDetail) Workshop.renderDetail(job);
      Workshop.openDetail();
    };

    // 2026-05-10 (L3 fix): Hydrate contract list and re-render Workshop so
    // Samningshafar súlan actually shows contract-holders' jobs.
    // loadContracts was defined but never called �?' Samningshafar always empty.
    // Re-fetch on every view-shown for workshop + on AppSettings changes so
    // newly-added contracts surface without a full page refresh.
    loadContracts().then(() => { try { Workshop.render(); } catch (_) {} });
    document.addEventListener('view-shown', e => {
      if (e && e.detail && e.detail.name === 'workshop') {
        loadContracts().then(() => { try { Workshop.render(); } catch (_) {} });
      }
    });
    if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
      window.AppSettings.onChange(() => loadContracts());
    }

    // Force a re-render right away if those views are mounted
    try { Counter.render(); } catch (_) {}
    try { Workshop.render(); } catch (_) {}
    console.log('[counter-workshop-redesign] installed');
  }
  install();
})();
/* === END COUNTER / WORKSHOP REDESIGN v1 === */
