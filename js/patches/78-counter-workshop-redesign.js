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
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  // 2026-06-23: date shown on each Afgreiðsla card. Reuse U.fd if present,
  // else format YYYY-MM-DD → DD.MM.YYYY. jobDate uses the received (dropoff)
  // date, falling back to created_at; groupDate = earliest in a collapsed group.
  function fmtD(d) {
    if (!d) return '';
    if (window.U && typeof U.fd === 'function') { try { const s = U.fd(d); if (s) return s; } catch (_) {} }
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
    return m ? m[3] + '.' + m[2] + '.' + m[1] : String(d);
  }
  function jobDate(j) { return fmtD(j && (j.dropoff || j.created_at)); }
  function groupDate(jobs) {
    const ds = (jobs || []).map(j => j && (j.dropoff || j.created_at)).filter(Boolean).sort();
    return ds.length ? fmtD(ds[0]) : '';
  }
  // m. vsk line total for a stored spare part {qty,verd_an_vsk,vsk_prosenta}
  function partTotal(p) { return (+p.qty || 1) * (+p.verd_an_vsk || 0) * (1 + (+p.vsk_prosenta || 24) / 100); }

  // A tæki soft-deleted via "🗑 Eyða" gets status 'eytt'. Hide it from the
  // workshop everywhere (tiles, chips, counts); it lives only in the
  // "Eydd tæki" archive at the bottom of Verkstæði until restored.
  function live(units) { return (units || []).filter(u => u && u.status !== 'eytt'); }

  // ----- Counter (Afgreiðsla) -----

  function counterRender() {
    const container = document.getElementById('view-counter');
    if (!container) return;
    const allActive = window.DB && DB.getActiveJobs ? DB.getActiveJobs() : [];
    // 2026-06-20: search bar — find the customer that's picking up a tæki.
    const q = String(Counter.search || '').trim().toLowerCase();
    const all = q
      ? allActive.filter(j =>
          String(j.customer || '').toLowerCase().includes(q) ||
          String(j.num || '').toLowerCase().includes(q))
      : allActive;
    const byStatus = { received: [], inprogress: [], ready: [] };
    all.forEach(j => {
      const s = j.status === 'in_progress' ? 'inprogress' : j.status;
      (byStatus[s] || byStatus.received).push(j);
    });
    // 2026-06-20: sort every column alphabetically by customer name (is_IS).
    const byName = (a, b) => String(a.customer || '').localeCompare(String(b.customer || ''), 'is', { sensitivity: 'base' });
    byStatus.received.sort(byName);
    byStatus.inprogress.sort(byName);
    byStatus.ready.sort(byName);

    const html =
      '<div id="counter-sidebar" style="padding:10px 16px;border-bottom:1px solid var(--brd,#e4e6ea);display:flex;align-items:center;gap:10px;background:#f8f9fb;flex-wrap:wrap">' +
        '<button class="btn btn-primary btn-sm" onclick="Counter.openNew()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Ný verk</button>' +
        `<span style="font-size:12px;color:var(--ink3,#8891a0)">${q ? all.length + ' af ' + allActive.length : allActive.length} virk verk · ${byStatus.ready.length} tilbúin</span>` +
        '<div style="position:relative;flex:1;min-width:180px">' +
          '<span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:13px;color:#94a3b8;pointer-events:none">🔍</span>' +
          `<input id="counter-search" type="text" autocomplete="off" placeholder="Leita að viðskiptavin sem sækir…" value="${esc(Counter.search || '')}" oninput="Counter.setSearch(this.value)" style="width:100%;padding:8px 30px 8px 32px;border:1px solid var(--brd,#cbd5e1);border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box;background:#fff">` +
          (q ? '<button onclick="Counter.setSearch(\'\')" title="Hreinsa" style="position:absolute;right:7px;top:50%;transform:translateY(-50%);border:none;background:#e2e8f0;color:#475569;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1">✕</button>' : '') +
        '</div>' +
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
    return '<div class="cw-col" style="display:flex;flex-direction:column;background:#fff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;min-height:0;min-width:0">' +
      `<div class="cw-col-head" style="padding:8px 12px;border-bottom:1px solid #f1f5f9;background:linear-gradient(180deg,${bgGrad} 0%,#fff 100%);flex-shrink:0">` +
        `<div class="cw-col-title" style="font-size:11px;font-weight:700;color:${titleCol};text-transform:uppercase;letter-spacing:.06em">${esc(title)}</div>` +
        `<div class="cw-col-sub" style="font-size:10px;color:#94a3b8;margin-top:1px">${esc(sub)}</div>` +
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
        `<div style="font-size:11px;color:#64748b">${j.units ? j.units.length : 0} slökkvitæki${jobDate(j) ? ' · ' + jobDate(j) : ''} ${badge}</div>` +
      '</div>' +
    '</div>';
  }

  function readyCard(j) {
    return '<div class="cw-rcard" style="display:flex;gap:8px;padding:10px;border-radius:10px;margin-bottom:6px;background:#f0fdf4;border:1px solid #bbf7d0">' +
      '<div class="cw-rcard-info" onclick="Counter.select(' + j.id + ')" style="min-width:0;flex:1;cursor:pointer">' +
        `<div style="font-family:var(--mono,monospace);font-size:11px;color:#059669;font-weight:600">${dnum(j.num)}</div>` +
        `<div class="cw-rcard-name" style="font-size:13px;font-weight:600;color:#0f172a;margin:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j.customer)}</div>` +
        `<div style="font-size:11px;color:#059669">${live(j.units).length} slökkvitæki${jobDate(j) ? ' · ' + jobDate(j) : ''}</div>` +
      '</div>' +
      `<button type="button" class="_sbw-inline" onclick="event.stopPropagation();window.Counter&&Counter.sendBackToWorkshop&&Counter.sendBackToWorkshop(${j.id})" title="Senda aftur til verkstæðis" style="flex-shrink:0;align-self:center;margin-right:6px;padding:4px 9px;background:#fff;border:1px solid #fbbf24;color:#92400e;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">← Verkstæði</button>` +
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
          return '<div class="cw-rcard" style="display:flex;gap:8px;padding:7px 8px;border-radius:8px;margin-bottom:3px;background:#f0fdf4;border:1px solid #bbf7d0">' +
            '<div class="cw-rcard-info" onclick="event.stopPropagation();Counter.select(' + j.id + ')" style="min-width:0;flex:1;cursor:pointer">' +
              `<div style="font-family:var(--mono,monospace);font-size:10px;color:#059669;font-weight:600">${dnum(j.num)}</div>` +
              `<div style="font-size:12px;color:#0f172a;margin:1px 0">${live(j.units).length} slökkvitæki</div>` +
            '</div>' +
            `<button type="button" class="_sbw-inline" onclick="event.stopPropagation();window.Counter&&Counter.sendBackToWorkshop&&Counter.sendBackToWorkshop(${j.id})" title="Senda aftur til verkstæðis" style="flex-shrink:0;align-self:center;margin-right:5px;padding:3px 8px;background:#fff;border:1px solid #fbbf24;color:#92400e;border-radius:99px;font-size:10.5px;font-weight:700;cursor:pointer;white-space:nowrap">← Verkstæði</button>` +
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
    // 2026-06-23: collapsed Tilbúin groups get a "Sótt ✓" button too (matches
    // the single readyCard). Reuses Counter.markCollected, which opens the
    // pickup-checkout for the whole sale (all -V units), so one click on a
    // multi-tæki single-sale group collects them all. stopPropagation so the
    // button doesn't also toggle the expander.
    const groupCollect = isReady
      ? `<button class="btn btn-sm btn-success" onclick="event.stopPropagation();Counter.markCollected(${co.jobs[0].id})" style="flex-shrink:0;align-self:center" title="Sækja — opnar afgreiðslu">Sótt ✓</button>`
      : '';
    return `<div onclick="Counter.toggleCo('${safeKey}')" style="margin-bottom:6px;background:${bg};border:1px solid ${border};border-radius:10px;cursor:pointer">` +
      '<div style="padding:10px 12px;display:flex;align-items:center;gap:8px">' +
        `<span style="color:#64748b;font-size:13px;width:14px">${caret}</span>` +
        '<div style="min-width:0;flex:1">' +
          `<div style="font-size:13px;font-weight:600;color:${nameCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(co.name)}</div>` +
          `<div style="font-size:11px;color:#64748b">${co.jobs.length} verk · ${co.totalUnits} tæki${groupDate(co.jobs) ? ' · ' + groupDate(co.jobs) : ''}</div>` +
        '</div>' +
        groupCollect +
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

  // 2026-06-18: "Eydd tæki" — soft-deleted units (verklidur.status='eytt')
  // collapsed into a bottom bar so the office can review/restore later.
  function archiveBar() {
    const jobs = (window.DB && DB.getWorkshopJobs ? DB.getWorkshopJobs() : []);
    const all  = (window.DB && DB.cache && DB.cache.jobs) ? DB.cache.jobs : jobs;
    const items = [];
    all.forEach(j => (j.units || []).forEach(u => {
      if (u && u.status === 'eytt') items.push({ job: j, unit: u });
    }));
    const open = Workshop._archiveOpen === true;
    let list;
    if (!items.length) {
      list = '<div style="padding:14px 16px;color:#94a3b8;font-size:12px;text-align:center">Engin eydd tæki.</div>';
    } else {
      list = items.map(({ job, unit }) => {
        const t = [unit.type, unit.size].filter(Boolean).join(' · ');
        const cust = job.customer || job.num || '';
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-top:1px solid #f1f5f9">' +
            '<span style="font-size:13px;color:#475569;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
              '<span style="font-weight:600;color:#0f172a">' + esc(t || 'Tæki') + '</span>' +
              '<span style="color:#94a3b8"> — ' + esc(cust) + '</span>' +
            '</span>' +
            '<button onclick="Workshop.restoreUnit(' + job.id + ',' + jsv(unit.id) + ')" ' +
              'style="border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:5px 11px;font-size:12px;cursor:pointer;white-space:nowrap;color:#0f172a">↩ Endurheimta</button>' +
          '</div>';
      }).join('');
    }
    return '<div class="cw-archive" style="position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff;border-top:1px solid #e5e7eb;box-shadow:0 -6px 20px rgba(0,0,0,.08)">' +
        '<div onclick="Workshop.toggleArchive()" style="padding:11px 16px;cursor:pointer;display:flex;align-items:center;gap:9px;user-select:none">' +
          '<span>🗑️</span>' +
          '<span style="font-weight:700;flex:1;font-size:13px;color:#0f172a">Eydd tæki (' + items.length + ')</span>' +
          '<span style="font-size:12px;color:#64748b">' + (open ? 'Loka ▾' : 'Sjá ▴') + '</span>' +
        '</div>' +
        (open ? '<div style="max-height:48vh;overflow-y:auto;border-top:1px solid #f1f5f9">' + list + '</div>' : '') +
      '</div>';
  }

  // serialize a unit id for inline onclick (numeric → bare, else quoted string)
  function jsv(v) {
    return (typeof v === 'number') ? v : "'" + String(v).replace(/'/g, "\\'") + "'";
  }

  function workshopRender() {
    const container = document.getElementById('view-workshop');
    if (!container) return;
    const jobs = window.DB && DB.getWorkshopJobs ? DB.getWorkshopJobs() : [];
    // Left: all workshop jobs (received + inprogress). Right: same set, filtered to contract holders.
    const contractJobs = jobs.filter(j => isContractCustomer(j.customer));

    // 2026-06-20: single-column VERK card + permanent Samningshafar panel
    // docked on the right (mockup verkstaedi-reorg.html + user screenshot).
    const html =
      '<div class="bw-page-hdr">' +
        '<div class="bw-page-titles">' +
          '<h1 class="bw-page-h1">Verkröð</h1>' +
          `<div class="bw-page-sub"><b>${jobs.length}</b> verk í vinnslu</div>` +
        '</div>' +
        '<div class="bw-hdr-actions">' +
          '<button class="bw-scan" onclick="Field.openScan()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M4 6V4h2"/><path d="M4 18v2h2"/><path d="M20 6V4h-2"/><path d="M20 18v2h-2"/><line x1="4" y1="12" x2="20" y2="12"/></svg> Skanna tæki</button>' +
        '</div>' +
      '</div>' +
      '<div style="display:none"><div id="workshop-queue"></div></div>' +
      '<div class="bw-flow">' +
        '<div class="bw-card">' +
          `<div class="bw-chd"><b>VERK</b><span class="bw-cnum">${jobs.length} verk</span></div>` +
          wRenderJobs('all', jobs) +
        '</div>' +
        '<div class="bw-sh-col">' +
          '<div class="bw-shd">' +
            '<div class="bw-shd-t" style="text-transform:uppercase">Samningshafar</div>' +
            `<span class="bw-shd-n">${contractJobs.length} verk</span>` +
          '</div>' +
          `<div class="bw-sh-body">${wRenderJobs('contract', contractJobs)}</div>` +
        '</div>' +
      '</div>' +
      '<div id="workshop-detail-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:8000;align-items:center;justify-content:center;padding:24px">' +
        '<div style="background:#fff;border-radius:16px;max-width:780px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 28px 80px rgba(0,0,0,.35)">' +
          '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:flex-end">' +
            '<button onclick="Workshop.closeDetail()" style="border:none;background:#f3f4f6;border-radius:10px;padding:6px 14px;font-size:13px;cursor:pointer">✕ Loka</button>' +
          '</div>' +
          '<div id="workshop-detail" style="overflow-y:auto;flex:1"></div>' +
        '</div>' +
      '</div>' +
      archiveBar();
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
    return '<div class="cw-col" style="display:flex;flex-direction:column;background:#fff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;min-height:0;min-width:0">' +
      '<div class="cw-col-head" style="padding:12px 14px;border-bottom:1px solid #f1f5f9;background:linear-gradient(180deg,#f8fafc 0%,#fff 100%);flex-shrink:0">' +
        `<div class="cw-col-title" style="font-size:12px;font-weight:700;color:${titleCol};text-transform:uppercase;letter-spacing:.06em">${esc(title)}</div>` +
        `<div class="cw-col-sub" style="font-size:11px;color:#94a3b8;margin-top:2px">${esc(sub)}</div>` +
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
    // 2026-05-21: unified layout — every customer (1 verk or many) renders
    // as wCustomerGroup so the tile-strip + Tilbúið buttons look identical
    // for everyone. The old wJobCard branch for single-verk customers is
    // retired; users said the mixed layouts looked messy.
    jobs.forEach(j => {
      if (rendered[j.customer]) return;
      const list = byCust[j.customer];
      const tot  = list.reduce((s, jj) => s + live(jj.units).length, 0);
      const done = list.reduce((s, jj) => s + live(jj.units).filter(u => u.status === 'done').length, 0);
      rendered[j.customer] = true;
      if (tot === 0) return;   // every tæki deleted → drop the customer from the workshop
      html += wCustomerGroup(statusKey, { name: j.customer, jobs: list, totalUnits: tot, doneUnits: done });
    });
    return `<div style="display:flex;flex-direction:column;gap:5px">${html}</div>`;
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
      ? `<div style="display:inline-block;font-size:11px;font-weight:600;color:#1e3a8a;background:#eff6ff;border:1px solid #bfdbfe;padding:2px 8px;border-radius:99px;margin-top:4px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(svcDesc)}">🛠️ ${esc(svcDesc)}</div>`
      : '';
    const noteHtml = extraNote
      ? `<div style="font-size:11px;color:#1e3a8a;background:#dbeafe;border-left:3px solid #2563eb;padding:3px 6px;border-radius:4px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(extraNote)}">📝 ${esc(extraNote)}</div>`
      : '';
    return '<div onclick="Workshop.select(' + j.id + ')" style="padding:7px 8px;border-radius:9px;cursor:pointer;background:#fff;border:1px solid #f1f5f9;transition:all .12s" onmouseover="this.style.background=\'#f8fafc\';this.style.borderColor=\'#e2e8f0\'" onmouseout="this.style.background=\'#fff\';this.style.borderColor=\'#f1f5f9\'">' +
      '<div style="display:flex;justify-content:space-between;align-items:start;gap:6px">' +
        '<div style="min-width:0;flex:1">' +
          `<div style="display:flex;gap:6px;align-items:baseline">` +
            `<div style="font-family:var(--mono,monospace);font-size:10.5px;color:#94a3b8;font-weight:600">${dnum(j.num)}</div>` +
            `<div style="font-size:12.5px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j.customer)}</div>` +
          `</div>` +
          `<div style="font-size:10.5px;color:#64748b;margin-top:1px">${done}/${total} lokið · ${(window.U && U.fd) ? U.fd(j.dropoff) : (j.dropoff || '')}</div>` +
          (svcHtml || noteHtml ? '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">' + svcHtml + noteHtml + '</div>' : '') +
        '</div>' + badge +
      '</div>' +
      renderUnitChips(j) +
      renderProgressAndReady(j, pct) +
    '</div>';
  }

  // ── Inline unit chip strip (mirrors Counter qcard-chips) ─────────────────
  // Click chip = toggle that unit's status. stopPropagation so we don't open
  // the detail modal underneath. Chips kept very tight so 8-10 fit on one row
  // in a narrow column.
  function renderUnitChips(j) {
    const us = live(j.units);
    if (!us.length) return '';
    const chips = us.map(u => {
      const isDone = u.status === 'done';
      const isBroken = u.status === 'broken';
      const tail = (String(u.serial || '').match(/[^-]+$/) || [u.serial || '?'])[0];
      const tp = (u.type || '') + (u.size ? ' ' + u.size : '');
      const extraStyle = isBroken
        ? ';background:#fef2f2;border-color:#fecaca;color:#991b1b'
        : '';
      const tick = isDone
        ? '<svg style="width:9px;height:9px;stroke:currentColor;fill:none;flex-shrink:0" viewBox="0 0 24 24" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
        : isBroken ? '<span style="font-size:9px">🚫</span>' : '';
      return `<div class="chip${isDone ? ' done' : ''}" style="cursor:pointer;padding:1px 6px;font-size:10px;gap:3px${extraStyle}" `
        + `onclick="event.stopPropagation();Workshop.toggleUnit(${j.id},${u.id})" `
        + `title="${esc((u.serial || '') + ' — ' + tp)}">`
        + tick
        + `<span class="chip-ser" style="font-size:10px">${esc(tail)}</span>`
        + '</div>';
    }).join('');
    return `<div class="qcard-chips" style="margin-top:4px;gap:3px">${chips}</div>`;
  }

  // ── Progress bar + Tilbúið button in one row to save vertical space ─────
  // Hidden once the job is already 'ready' (it's about to leave the workshop
  // column anyway). Always allowed even when not all units are done — Agnar
  // can decide; Workshop.markReady cascades units to done in db.js.
  function renderProgressAndReady(j, pct) {
    const bar = `<div style="flex:1;height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct === 100 ? '#10b981' : '#f59e0b'};transition:width .2s"></div></div>`;
    if (j.status === 'ready') {
      return `<div style="margin-top:6px">${bar}</div>`;
    }
    const btn = `<button onclick="event.stopPropagation();Workshop.markReady(${j.id})" type="button" `
      + 'style="padding:3px 9px;background:#16a34a;color:#fff;border:none;border-radius:99px;'
      + 'font:inherit;font-size:10.5px;font-weight:700;cursor:pointer;'
      + 'display:inline-flex;align-items:center;gap:3px;flex-shrink:0;line-height:1.4">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" style="width:9px;height:9px"><polyline points="20 6 9 17 4 12"/></svg>'
      + 'Tilbúið</button>';
    return `<div style="display:flex;gap:8px;align-items:center;margin-top:6px">${bar}${btn}</div>`;
  }

  // ── Customer group (Verkstæði) — 2026-06-20 reorg ───────────────────────
  // One card per customer (mockup verkstaedi-reorg.html). No click-to-expand
  // dropdown any more — every tæki shows as a tile (click upper part → Tæki
  // modal), and a "📤 Senda í afgreiðslu" button on the right marks the whole
  // customer's verk ready.
  function wCustomerGroup(statusKey, co) {
    const pct = co.totalUnits ? Math.round(co.doneUnits / co.totalUnits * 100) : 0;
    const ready = pct === 100;
    const jobIds = co.jobs.map(j => j.id).join(',');
    return '<div class="bw-row">' +
        '<div class="bw-row-top">' +
          '<div class="bw-cinfo">' +
            `<div class="bw-cname">${esc(co.name)}</div>` +
            `<div class="bw-cmeta">${co.jobs.length} verk · ${co.doneUnits}/${co.totalUnits} lokið</div>` +
          '</div>' +
          renderUnitTiles(co.jobs) +
        '</div>' +
        '<div class="bw-prow">' +
          `<div class="bw-prog${ready ? ' full' : ''}"><div style="width:${pct}%"></div></div>` +
          `<button class="bw-send${ready ? ' ready' : ''}" onclick="event.stopPropagation();Workshop.sendGroupToAfgreidsla([${jobIds}])">📤 Senda í afgreiðslu</button>` +
        '</div>' +
      '</div>';
  }

  // ── Per-tæki tile strip ─────────────────────────────────────────────────
  // Flattens every unit across the customer's verk into a grid of tiles.
  // Each tile:
  //   • upper body (type + serial + "🔧 N hlutir" if spare parts added) is
  //     CLICKABLE → opens the Tæki modal (✓ Tilbúið · 🚫 Ónýtt · 🔧 Laga · 🗑)
  //   • bottom = one-tap quick toggle ☐/✓ Tilbúið (Workshop.toggleUnit)
  //   • ✕ top-right soft-deletes the tæki (→ Eydd tæki)
  function renderUnitTiles(jobs) {
    if (!jobs || !jobs.length) return '';
    const items = [];
    jobs.forEach(j => {
      live(j.units).forEach(u => items.push({ jobId: j.id, unit: u }));
    });
    if (!items.length) return '';
    const tiles = items.map(({ jobId, unit }) => {
      const isDone = unit.status === 'done';
      const isBroken = unit.status === 'broken';
      const cls = isDone ? 'yes' : (isBroken ? 'broken' : 'no');
      const txt = isDone ? '✓ Tilbúið' : (isBroken ? '🚫 Ónýtt' : '☐ Tilbúið');
      const typeRaw = String(unit.type || '—').split(/\s+/).slice(0, 2).join(' ');
      const sizeRaw = unit.size ? String(unit.size) : '';
      const label   = typeRaw + (sizeRaw ? ' ' + sizeRaw : '');
      const serialShort = String(unit.serial || '').replace(/^.*-/, '').slice(0, 8);
      const parts = Array.isArray(unit.parts) ? unit.parts : [];
      const partCount = parts.reduce((s, p) => s + (+p.qty || 1), 0);
      const partInd = partCount
        ? `<div class="bw-tile-parts">🔧 ${partCount} ${partCount === 1 ? 'hlutur' : 'hlutir'}</div>`
        : '<div class="bw-tile-parts"></div>';
      // broken tile's quick button reopens the modal (deliberate un-break);
      // done/not-done quick-toggle directly.
      const chkClick = isBroken
        ? `Workshop.openUnitModal(${jobId},${unit.id})`
        : `Workshop.toggleUnit(${jobId},${unit.id})`;
      return '<div class="bw-tile" title="' + esc((unit.serial || '') + ' — ' + label) + '">' +
          `<button class="bw-tile-x" onclick="event.stopPropagation();Workshop.deleteUnit(${jobId},${unit.id})" title="Eyða tæki (fer í Eydd tæki)">✕</button>` +
          `<div class="bw-tile-body" onclick="event.stopPropagation();Workshop.openUnitModal(${jobId},${unit.id})">` +
            `<div class="bw-tile-ty">${esc(label)}</div>` +
            (serialShort ? `<div class="bw-tile-ser">${esc(serialShort)}</div>` : '') +
            partInd +
          '</div>' +
          `<button class="bw-chk ${cls}" onclick="event.stopPropagation();${chkClick}">${txt}</button>` +
        '</div>';
    }).join('');
    return '<div class="bw-tiles">' + tiles + '</div>';
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
      // 2026-05-20: Make the per-unit ✓ checkmark inside the workshop detail
      // modal a clearly-labeled "Tilbúið" pill button. The default ws-chk in
      // app.css is just a tiny circle which Agnar found too easy to miss.
      '.ws-chk {' +
      '  width: auto !important;' +
      '  height: 32px !important;' +
      '  min-width: 96px !important;' +
      '  padding: 0 14px !important;' +
      '  border-radius: 99px !important;' +
      '  border: 1.5px solid #16a34a !important;' +
      '  background: #f0fdf4 !important;' +
      '  color: #166534 !important;' +
      '  font-weight: 700 !important;' +
      '  font-size: 12px !important;' +
      '  letter-spacing: .02em !important;' +
      '  gap: 6px !important;' +
      '  transition: transform .08s, background .15s !important;' +
      '}' +
      '.ws-chk:hover { background: #dcfce7 !important; transform: translateY(-1px) !important; }' +
      '.ws-chk:active { transform: translateY(0) !important; }' +
      '.ws-chk::after { content: "Tilbúið" !important; }' +
      '.ws-chk svg { width: 14px !important; height: 14px !important; stroke: #16a34a !important; stroke-width: 3 !important; }' +
      '.ws-chk.done { background: #16a34a !important; border-color: #15803d !important; color: #fff !important; box-shadow: 0 1px 3px rgba(22,163,74,.3) !important; }' +
      '.ws-chk.done::after { content: "✓ Tilbúið" !important; }' +
      '.ws-chk.done svg { display: none !important; }' +
      '@media (max-width: 900px) {' +
      '  #view-counter > div[style*="grid-template-columns:1fr 1fr 1fr"],' +
      '  #view-workshop > div[style*="grid-template-columns:2fr 1fr"] {' +
      '    grid-template-columns: 1fr !important;' +
      '    height: auto !important;' +
      '    overflow: auto !important;' +
      '  }' +
      // clearance so the fixed "Eydd tæki" bar doesn't hide the last card
      '  #view-workshop > div[style*="grid-template-columns:2fr 1fr"] { padding-bottom: 70px !important; }' +
      '  #counter-detail-modal > div, #workshop-detail-modal > div {' +
      '    max-width: 96vw !important;' +
      '  }' +
      '  #counter-detail-modal [style*="grid-template-columns:1fr 320px"] {' +
      '    grid-template-columns: 1fr !important;' +
      '  }' +
      '  #counter-detail-modal aside { display: none !important; }' +
      '}' +
      // 2026-06-18: phone view — the Tilbúin cards crammed customer name +
      // 3 action buttons (← Verkstæði · Hilla · Sótt ✓) onto one row, so
      // names truncated to "Kal…" and the Hilla select clipped off-screen.
      // On ≤640px, let the info take a full first row (name wraps, R-nr on one
      // line) and the buttons flow onto a second row sharing the width.
      '@media (max-width: 640px) {' +
      '  .cw-rcard { flex-wrap: wrap !important; gap: 8px 6px !important; align-items: center !important; }' +
      '  .cw-rcard-info { flex: 1 1 100% !important; }' +
      '  .cw-rcard-name { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; }' +
      '  .cw-rcard > button { flex: 1 1 auto !important; min-height: 40px !important; font-size: 13px !important; }' +
      '  .cw-rcard > select[data-shelf-dd] { min-height: 40px !important; }' +
      // Verkstæði customer-group header: let the name use the full first row and
      // the per-tæki tile strip wrap onto its own full-width row below it (the
      // fixed 140px name + squeezed tiles looked cramped on a phone).
      '  .cw-wgroup-head { flex-wrap: wrap !important; }' +
      '  .cw-wgroup-name { width: auto !important; flex: 1 1 auto !important; }' +
      '  .cw-wtiles { flex-basis: 100% !important; margin-top: 4px !important; }' +
      '}';
    document.head.appendChild(css);
  }

  // ── 2026-06-20 Verkstæði reorg styles (from mockups/verkstaedi-reorg.html) ──
  if (!document.getElementById('_bw_css')) {
    const bw = document.createElement('style');
    bw.id = '_bw_css';
    bw.textContent =
      // customer row card
      '.bw-row{border:1px solid rgba(20,24,34,.10);border-left:3px solid #2f5fe0;border-radius:12px;padding:11px 13px;margin-bottom:9px;background:linear-gradient(180deg,#fff,#eef1f6);box-shadow:0 2px 6px -4px rgba(25,35,60,.12)}' +
      '.bw-row-top{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}' +
      '.bw-cinfo{width:150px;flex:1 1 150px;min-width:0}' +
      '.bw-cname{font-size:14px;font-weight:600;color:#11141c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.bw-cmeta{font-size:11.5px;color:#9098a6;margin-top:2px}' +
      '.bw-tiles{flex:2 1 60%;min-width:0;display:flex;flex-wrap:wrap;gap:7px}' +
      // device tile
      '.bw-tile{width:92px;flex:none;border:1px solid rgba(20,24,34,.12);border-radius:9px;overflow:hidden;background:linear-gradient(180deg,#eef1f6,#dde1e9);transition:transform .12s,box-shadow .12s,border-color .12s;position:relative}' +
      '.bw-tile:hover{transform:translateY(-2px);box-shadow:0 8px 18px -8px rgba(20,30,60,.4);border-color:#9bb0e6}' +
      '.bw-tile-x{position:absolute;top:0;right:0;width:28px;height:28px;line-height:1;padding:0;border:none;border-radius:0 0 0 7px;background:rgba(15,23,42,.06);color:#475569;font-size:13px;font-weight:700;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center}' +
      '.bw-tile-x:hover{background:rgba(220,38,38,.18);color:#b91c1c}' +
      '.bw-tile-body{padding:7px 14px 4px 6px;text-align:center;cursor:pointer}' +
      '.bw-tile-ty{font-size:10px;font-weight:600;color:#11141c;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.bw-tile-ser{font-family:"Space Mono",var(--mono,monospace);font-size:9.5px;color:#7a8493;margin-top:2px}' +
      '.bw-tile-parts{font-size:9px;color:#16a34a;font-weight:700;margin-top:2px;min-height:11px}' +
      '.bw-chk{display:block;width:100%;border:none;border-top:1px solid #e2e8f0;cursor:pointer;font-weight:700;font-size:10px;padding:4px;line-height:1.1}' +
      '.bw-chk.no{background:#fff;color:#64748b}' +
      '.bw-chk.yes{background:linear-gradient(160deg,#1f9d57,#0a4a26);color:#fff}' +
      '.bw-chk.broken{background:linear-gradient(150deg,#e25555,#a01818);color:#fff}' +
      // progress + send
      '.bw-prow{display:flex;align-items:center;gap:11px;margin-top:10px}' +
      '.bw-prog{flex:1;height:5px;border-radius:3px;background:#e6e9ef;overflow:hidden}' +
      '.bw-prog>div{height:100%;background:linear-gradient(90deg,#e0a020,#c77a16)}' +
      '.bw-prog.full>div{background:linear-gradient(90deg,#7aa0ff,#2f5fe0)}' +
      '.bw-send{flex:none;height:32px;padding:0 13px;border-radius:9px;border:1px solid #0a0b0d;cursor:pointer;font-weight:700;font-size:12px;color:#fff;white-space:nowrap;background:linear-gradient(145deg,#08080a,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709)}' +
      '.bw-send.ready{background:linear-gradient(145deg,#0d0102,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102);border-color:#971515;box-shadow:0 0 14px -4px rgba(160,16,16,.55)}' +
      // Tæki modal
      '.bw-ov{position:fixed;inset:0;background:rgba(8,10,14,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9000}' +
      '.bw-modal{width:520px;max-width:100%;max-height:92vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 30px 80px -20px #000}' +
      '.bw-mh{background:linear-gradient(145deg,#08080a,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709);color:#fff;padding:15px 20px;display:flex;align-items:center;gap:12px}' +
      '.bw-mh .ser{font-family:"Space Mono",var(--mono,monospace);font-size:15px;font-weight:700}' +
      '.bw-mh .ty{font-size:12px;color:rgba(255,255,255,.6);margin-top:2px}' +
      '.bw-mh .x{margin-left:auto;background:rgba(255,255,255,.1);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px}' +
      '.bw-mb{padding:18px 20px 22px}' +
      '.bw-lab{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a93a5;margin:0 0 8px}' +
      '.bw-acts{display:grid;grid-template-columns:1fr 1fr;gap:9px}' +
      '.bw-act{display:flex;align-items:center;justify-content:center;gap:7px;height:46px;border-radius:11px;cursor:pointer;font-weight:700;font-size:14px;border:1px solid transparent;text-align:center}' +
      '.bw-act.ok{background:#fff;color:#166534;border-color:#bbf7d0}' +
      '.bw-act.ok.on{background:linear-gradient(160deg,#1f9d57,#0a4a26);color:#fff;border-color:transparent}' +
      '.bw-act.broken{background:#fff;color:#a01818;border:1px solid #fecaca}' +
      '.bw-act.broken.on{background:linear-gradient(150deg,#e25555,#a01818);color:#fff;border-color:transparent}' +
      '.bw-act.laga{background:linear-gradient(145deg,#0d0102,#6c0d10 50%,#971515 60%,#100102);color:#fff;grid-column:1/-1;height:48px;font-size:13.5px}' +
      '.bw-act.del{background:#fff;color:#64748b;border:1px solid #e2e8f0;grid-column:1/-1;height:40px;font-size:12.5px}' +
      '.bw-ta{width:100%;min-height:56px;margin-top:6px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f6f8fb;font:inherit;font-size:13px;resize:vertical;box-sizing:border-box}' +
      '.bw-arow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px}' +
      '.bw-arow .rm{background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:16px}' +
      '.bw-atot{display:flex;justify-content:space-between;font-weight:800;font-size:14px;margin-top:8px;padding-top:8px;border-top:2px solid #0f172a}' +
      /* ── single-column page layout (mockup verkstaedi-reorg.html) ── */
      '.bw-page-hdr{display:flex;align-items:center;gap:14px;padding:8px 22px 12px;position:relative;flex-shrink:0}' +
      '.bw-page-titles{min-width:0}' +
      '.bw-page-h1{font-size:26px;font-weight:700;margin:0;line-height:1.1;color:#11141c}' +
      '.bw-page-sub{font-family:"Space Mono",var(--mono,monospace);font-size:13px;color:#6b7280;margin-top:3px}' +
      '.bw-page-sub b{color:#2f5fe0}' +
      '.bw-hdr-actions{margin-left:auto;display:flex;align-items:center;gap:10px}' +
      '.bw-scan{display:flex;align-items:center;gap:7px;height:40px;padding:0 16px;border-radius:11px;border:1px solid #cbd5e1;background:#fff;color:#11141c;cursor:pointer;font:600 13px/1 inherit;white-space:nowrap}' +
      '.bw-scan:hover{background:#f1f5f9}' +
      /* VERK card + Samningshafar panel side by side (panel docked right) */
      '.bw-flow{flex:1;overflow-y:auto;padding:2px 22px 76px;min-height:0;display:flex;align-items:flex-start;gap:14px}' +
      '.bw-card{flex:1;min-width:0;background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:16px;box-shadow:0 10px 28px -16px rgba(25,35,60,.18);padding:16px 18px 18px}' +
      '.bw-sh-col{width:336px;flex-shrink:0;align-self:flex-start;position:sticky;top:0;display:flex;flex-direction:column;max-height:calc(100vh - 168px);background:#fff;border:1px solid rgba(20,24,34,.10);border-radius:14px;overflow:hidden;box-shadow:0 10px 28px -16px rgba(25,35,60,.28)}' +
      /* clean white header to match the mockup card-h (VERK), not a dark bar */
      '.bw-shd{position:relative;padding:14px 16px 16px;border-bottom:1px solid #eef0f4;flex-shrink:0}' +
      '.bw-shd-t{font-size:13px;font-weight:700;letter-spacing:.12em;color:#3a4250}' +
      '.bw-shd-n{position:absolute;top:15px;right:16px;font-family:"Space Mono",var(--mono,monospace);font-size:12px;color:#9098a6}' +
      '.bw-sh-body{padding:10px;overflow-y:auto;flex:1;min-height:0}' +
      '.bw-sh-body .bw-row:last-child{margin-bottom:0}' +
      '.bw-sh-body .empty,.bw-sh-body>div[style*="text-align:center"]{padding:18px 8px}' +
      '.bw-chd{display:flex;align-items:center;gap:10px;margin-bottom:12px}' +
      '.bw-chd b{font-size:14px;font-weight:700;letter-spacing:.12em;color:#3a4250}' +
      '.bw-cnum{margin-left:auto;font-family:"Space Mono",var(--mono,monospace);font-size:12px;color:#9098a6}' +
      '@media (max-width:900px){.bw-flow{flex-direction:column;align-items:stretch}.bw-card{flex:none}.bw-sh-col{width:auto;position:static;max-height:none}}' +
      '@media (max-width:640px){.bw-cinfo{flex:1 1 100%}.bw-tiles{flex:1 1 100%}' +
        '.bw-page-hdr{flex-wrap:wrap;padding:8px 14px}.bw-hdr-actions{width:100%}.bw-scan{flex:1}.bw-flow{padding:2px 12px 76px}}';
    document.head.appendChild(bw);
  }

  // Persist a tæki's spare-parts list to verklidur.parts (draft — billed at Sókn).
  async function persistParts(unitId, parts) {
    try { if (window.DB && DB.online && DB.sb) await DB.sb.from('verklidur').update({ parts }).eq('id', unitId); }
    catch (e) { console.warn('[persistParts]', e); }
  }

  // Build the Tæki modal body for a (job, unit).
  function unitModalHtml(job, u) {
    const parts = Array.isArray(u.parts) ? u.parts : [];
    const tot = parts.reduce((s, p) => s + partTotal(p), 0);
    const svc = [u.type, u.size, u.service].filter(Boolean).join(' · ') || '—';
    const isDone = u.status === 'done', isBroken = u.status === 'broken';
    let partsHtml;
    if (parts.length) {
      partsHtml = parts.map((p, i) =>
        '<div class="bw-arow"><span>🔧 ' + esc(p.nafn) + ((+p.qty || 1) > 1 ? ' ×' + (+p.qty) : '') + '</span>' +
          '<span><b style="font-variant-numeric:tabular-nums">' + esc(fmtKr(partTotal(p))) + '</b> ' +
          '<button class="rm" title="Eyða" onclick="Workshop.removePartFromUnit(' + job.id + ',' + u.id + ',' + i + ')">×</button></span></div>'
      ).join('') +
      '<div class="bw-atot"><span>Varahlutir samtals m. vsk</span><span style="font-variant-numeric:tabular-nums">' + esc(fmtKr(tot)) + '</span></div>';
    } else {
      partsHtml = '<div style="color:#9098a6;font-size:12px;padding:6px 0">Engir varahlutir skráðir enn — smelltu „🔧 Laga".</div>';
    }
    return '<div class="bw-modal">' +
        '<div class="bw-mh"><div><div class="ser">' + esc(u.serial || '—') + '</div>' +
          '<div class="ty">' + esc([u.type, u.size].filter(Boolean).join(' · ') || 'Tæki') + '</div></div>' +
          '<button class="x" onclick="Workshop.closeUnitModal()">✕</button></div>' +
        '<div class="bw-mb">' +
          '<p class="bw-lab">Þjónusta</p>' +
          '<div style="font-size:14px;font-weight:600;color:#11141c;margin-bottom:14px">' + esc(svc) + '</div>' +
          '<p class="bw-lab">Staða tækis</p>' +
          '<div class="bw-acts">' +
            '<div class="bw-act ok' + (isDone ? ' on' : '') + '" onclick="Workshop.setUnitStatusToggle(' + job.id + ',' + u.id + ',\'done\')">✓ Tilbúið</div>' +
            '<div class="bw-act broken' + (isBroken ? ' on' : '') + '" onclick="Workshop.setUnitStatusToggle(' + job.id + ',' + u.id + ',\'broken\')">🚫 Ónýtt</div>' +
            '<div class="bw-act laga" onclick="Workshop.addPartToUnit(' + job.id + ',' + u.id + ')">🔧 Laga — bæta við varahlut / þjónustu</div>' +
            '<div class="bw-act del" onclick="Workshop.deleteUnitFromModal(' + job.id + ',' + u.id + ')">🗑 Eyða tæki</div>' +
          '</div>' +
          '<div style="margin-top:14px">' +
            '<p class="bw-lab">Varahlutir / þjónusta á þetta tæki</p>' +
            '<div id="bw-parts">' + partsHtml + '</div>' +
          '</div>' +
          '<p class="bw-lab" style="margin-top:16px">Athugasemd</p>' +
          '<textarea class="bw-ta" id="bw-note" placeholder="t.d. skipti um ventil, þrýstiprófað…">' + esc(u.notes || '') + '</textarea>' +
        '</div>' +
      '</div>';
  }

  function install() {
    if (!window.Counter || !window.Workshop || typeof Counter.render !== 'function' || typeof Workshop.render !== 'function') {
      setTimeout(install, 300);
      return;
    }
    if (window.__counterWorkshopRedesignInstalled) return;
    window.__counterWorkshopRedesignInstalled = true;

    Counter.expandedCos = Counter.expandedCos || {};
    Counter.search = Counter.search || '';
    Counter.render = counterRender;
    Counter.toggleCo = function(key) { Counter.expandedCos[key] = !Counter.expandedCos[key]; Counter.render(); };
    // 2026-06-20: Afgreiðsla customer search. Re-render then restore focus +
    // caret so typing isn't interrupted by the innerHTML rebuild.
    Counter.setSearch = function(val) {
      Counter.search = val;
      Counter.render();
      const inp = document.getElementById('counter-search');
      if (inp) { inp.focus(); const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (_) {} }
    };
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

    // 2026-06-18: soft-delete a workshop unit (verklidur.status='eytt') + the
    // "Eydd tæki" archive bar. Direct verklidur write (NOT DB.updateUnitStatus,
    // which auto-promotes the job to inprogress/ready — unwanted on delete).
    Workshop._archiveOpen = Workshop._archiveOpen || false;
    Workshop.toggleArchive = function() { Workshop._archiveOpen = !Workshop._archiveOpen; Workshop.render(); };
    // 2026-06-20: Samningshafar dropdown (replaces the 2nd column).
    Workshop._shOpen = Workshop._shOpen || false;
    Workshop.toggleSH = function() { Workshop._shOpen = !Workshop._shOpen; Workshop.render(); };
    Workshop.deleteUnit = async function(jobId, unitId) {
      if (!window.confirm('Eyða þessu tæki af verkstæðinu?\n(fer í „Eydd tæki" — hægt að endurheimta síðar)')) return false;
      try { if (DB.online && DB.sb) await DB.sb.from('verklidur').update({ status: 'eytt' }).eq('id', unitId); }
      catch (e) { console.warn('[deleteUnit]', e); }
      const job = DB.getJob(jobId);
      if (job && job.units) { const u = job.units.find(function(u){ return u.id === unitId; }); if (u) u.status = 'eytt'; }
      if (window.Toast && Toast.show) Toast.show('🗑 Tæki sett í „Eydd tæki"');
      Workshop.render();
      return true;
    };
    Workshop.restoreUnit = async function(jobId, unitId) {
      try { if (DB.online && DB.sb) await DB.sb.from('verklidur').update({ status: 'received' }).eq('id', unitId); }
      catch (e) { console.warn('[restoreUnit]', e); }
      const job = DB.getJob(jobId);
      if (job && job.units) { const u = job.units.find(function(u){ return u.id === unitId; }); if (u) u.status = 'received'; }
      if (window.Toast && Toast.show) Toast.show('↩ Tæki endurheimt');
      Workshop.render();
    };

    Workshop.select = function(id) {
      Workshop.sel = id;
      const job = DB.getJob(id);
      if (!job) return;
      if (Workshop.renderDetail) Workshop.renderDetail(job);
      Workshop.openDetail();
    };

    // ── 2026-06-20 Verkstæði reorg: per-tæki status + spare parts ──────────
    // Direct verklidur write, NO job auto-promote. The whole verk only moves
    // to Afgreiðslu when the user clicks "📤 Senda í afgreiðslu" (explicit),
    // which fixed the old "looks ready but isn't" confusion.
    Workshop.setUnitStatus = async function(jobId, unitId, status) {
      try { if (DB.online && DB.sb) await DB.sb.from('verklidur').update({ status }).eq('id', unitId); }
      catch (e) { console.warn('[setUnitStatus]', e); }
      const job = DB.getJob(jobId);
      if (job && job.units) { const u = job.units.find(u => u.id === unitId); if (u) u.status = status; }
      // Bump received → inprogress (signal that work started) but NEVER
      // auto-promote to 'ready' — that's the explicit "📤 Senda í afgreiðslu".
      if (job && job.status === 'received' && (status === 'done' || status === 'broken')) {
        try { await DB.updateJobStatus(jobId, 'inprogress'); } catch (_) {}
      }
      if (Workshop._unitCtx) Workshop._renderUnitModal();
      Workshop.render();
    };
    // Quick tile toggle: done ↔ received (no auto-promote).
    Workshop.toggleUnit = function(jobId, unitId) {
      const job = DB.getJob(jobId); if (!job) return;
      const u = (job.units || []).find(u => u.id === unitId); if (!u) return;
      Workshop.setUnitStatus(jobId, unitId, u.status === 'done' ? 'received' : 'done');
    };
    // Modal status buttons: clicking the active status again clears it.
    Workshop.setUnitStatusToggle = function(jobId, unitId, status) {
      const job = DB.getJob(jobId); if (!job) return;
      const u = (job.units || []).find(u => u.id === unitId); if (!u) return;
      Workshop.setUnitStatus(jobId, unitId, u.status === status ? 'received' : status);
    };

    // ── Tæki modal (one window per device) ────────────────────────────────
    Workshop.openUnitModal = function(jobId, unitId) {
      Workshop._unitCtx = { jobId, unitId };
      Workshop._renderUnitModal();
    };
    Workshop.closeUnitModal = function() {
      const ov = document.getElementById('bw-unit-ov');
      if (ov) ov.remove();
      Workshop._unitCtx = null;
      Workshop.render();
    };
    Workshop._renderUnitModal = function() {
      const ctx = Workshop._unitCtx; if (!ctx) return;
      const job = DB.getJob(ctx.jobId); if (!job) { Workshop.closeUnitModal(); return; }
      const u = (job.units || []).find(x => x.id === ctx.unitId);
      if (!u || u.status === 'eytt') { Workshop.closeUnitModal(); return; }
      let ov = document.getElementById('bw-unit-ov');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'bw-unit-ov';
        ov.className = 'bw-ov';
        ov.addEventListener('click', e => { if (e.target === ov) Workshop.closeUnitModal(); });
        document.body.appendChild(ov);
      }
      ov.innerHTML = unitModalHtml(job, u);
      const ta = ov.querySelector('#bw-note');
      if (ta) {
        const save = () => Workshop.saveUnitNote(ctx.jobId, ctx.unitId, ta.value);
        ta.addEventListener('change', save);
        ta.addEventListener('blur', save);
      }
    };
    Workshop.saveUnitNote = async function(jobId, unitId, note) {
      note = String(note || '');
      const job = DB.getJob(jobId);
      const u = job && (job.units || []).find(x => x.id === unitId);
      if (u && (u.notes || '') === note) return;
      try { if (DB.online && DB.sb) await DB.sb.from('verklidur').update({ notes: note }).eq('id', unitId); }
      catch (e) { console.warn('[saveUnitNote]', e); }
      if (u) u.notes = note;
    };
    Workshop.deleteUnitFromModal = async function(jobId, unitId) {
      const ok = await Workshop.deleteUnit(jobId, unitId);
      if (ok) Workshop.closeUnitModal();
    };

    // ── 🔧 Laga → spare part / þjónusta picker → verklidur.parts ───────────
    // Parts are stored on the tæki as a draft. They are NOT billed yet — at
    // Sókn (pickup) patch 121 pre-loads them as billable extras so the
    // operator confirms them onto the reikningur. "Draft until sótt".
    Workshop.addPartToUnit = function(jobId, unitId) {
      if (!window.VorurPicker || typeof VorurPicker.open !== 'function') {
        alert('Vörulisti ekki tilbúinn — endurhladdu síðunni og prófaðu aftur.');
        return;
      }
      VorurPicker.open(async p => {
        const job = DB.getJob(jobId); if (!job) return;
        const u = (job.units || []).find(x => x.id === unitId); if (!u) return;
        const parts = Array.isArray(u.parts) ? u.parts.slice() : [];
        const ex = parts.find(x => String(x.vara_id) === String(p.id) && x.nafn === p.nafn);
        if (ex) ex.qty = (+ex.qty || 1) + 1;
        else parts.push({ vara_id: p.id, nafn: p.nafn, verd_an_vsk: +p.verd_an_vsk || 0, vsk_prosenta: +p.vsk_prosenta || 24, qty: 1 });
        await persistParts(unitId, parts);
        u.parts = parts;
        if (Workshop._unitCtx) Workshop._renderUnitModal();
        Workshop.render();
        if (window.Toast && Toast.show) Toast.show('🔧 ' + p.nafn + ' bætt við');
      });
    };
    Workshop.removePartFromUnit = async function(jobId, unitId, idx) {
      const job = DB.getJob(jobId);
      const u = job && (job.units || []).find(x => x.id === unitId); if (!u) return;
      const parts = Array.isArray(u.parts) ? u.parts.slice() : [];
      parts.splice(idx, 1);
      await persistParts(unitId, parts);
      u.parts = parts;
      if (Workshop._unitCtx) Workshop._renderUnitModal();
      Workshop.render();
    };

    // ── 📤 Senda í afgreiðslu (per customer group) ────────────────────────
    Workshop.sendGroupToAfgreidsla = async function(jobIds) {
      if (!Array.isArray(jobIds) || !jobIds.length) return;
      let total = 0, done = 0, name = '';
      jobIds.forEach(id => {
        const j = DB.getJob(id);
        if (j) { name = j.customer || name; live(j.units).forEach(u => { total++; if (u.status === 'done') done++; }); }
      });
      if (done < total) {
        const msg = name + ': ' + done + '/' + total + ' tilbúin. Senda samt í afgreiðslu?';
        const ok = (window.Confirm && Confirm.show)
          ? await Confirm.show(msg, { okText: 'Senda' })
          : window.confirm(msg);
        if (!ok) return;
      }
      for (const id of jobIds) {
        try { await DB.updateJobStatus(id, 'ready'); } catch (e) { console.warn('[sendGroup]', e); }
      }
      if (window.Toast && Toast.show) Toast.show('📤 Sent í afgreiðslu');
      Workshop.render();
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
