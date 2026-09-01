/* === MONTHLY INSPECTION STRIP v1 ===
 *
 * Adds a horizontal month-strip to the Field map view so the user can flick
 * between months and see which companies have next_insp due that month
 * (with a colored status dot — same logic as map markers).
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │           [ map ]                   │
 *   ├─────────────────────────────────────┤
 *   │ Allt árið │ Jan │ Feb │ … │ Des    │  ← month tabs
 *   ├─────────────────────────────────────┤
 *   │ 🟢 Ferðafélag Íslands  15.05.2026 →│
 *   │ 🟠 Steypustöðin       22.05.2026 →│
 *   │ 🔴 KAT ehf.           02.04.2026 →│
 *   └─────────────────────────────────────┘
 *
 * Click on a row → opens the company detail view via _openCompanySafe.
 * Status dot color matches mapfix.js logic:
 *   🔴 red       — at least one tæki overdue (next_insp < today)
 *   🟠 orange    — at least one tæki due within 30 days
 *   🟢 green     — all in lagi
 *   ⚪ grey      — no dates / no equipment
 */
(() => {
  if (window.__monthlyStripInstalled) return;
  window.__monthlyStripInstalled = true;

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Maí','Jún','Júl','Ágú','Sep','Okt','Nóv','Des'];
  let _selectedMonth = null; // null = "Allt árið"; 0-11 = specific month
  let _selectedYear = new Date().getFullYear();

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }

  function statusFor(units) {
    const today = new Date(); today.setHours(0,0,0,0);
    const d30 = new Date(today.getTime() + 30*86400000);
    const cu = units.filter(u => u && u.status !== 'urelt');
    if (!cu.length) return { color: '#9ca3af', emoji: '⚪', label: 'Engin tæki' };
    let overdue = 0, soon = 0, ok = 0, noDate = 0;
    cu.forEach(u => {
      if (!u.next_insp) noDate++;
      else {
        const ni = new Date(u.next_insp);
        if (ni < today) overdue++;
        else if (ni <= d30) soon++;
        else ok++;
      }
    });
    if (overdue) return { color: '#dc2626', emoji: '🔴', label: 'Útrunnið' };
    if (soon)    return { color: '#b45309', emoji: '🟠', label: 'Rennur út' };
    if (noDate && !ok) return { color: '#9ca3af', emoji: '⚪', label: 'Engar dagsetningar' };
    return { color: '#16a34a', emoji: '🟢', label: 'Í lagi' };
  }

  // Earliest next_insp in a month (used for sorting and matching the month filter).
  function earliestInspForMonth(units, year, month) {
    let earliest = null;
    units.forEach(u => {
      if (!u || u.status !== 'active' || !u.next_insp) return;
      const d = new Date(u.next_insp);
      if (isNaN(d)) return;
      if (month != null && (d.getMonth() !== month || d.getFullYear() !== year)) return;
      if (!earliest || d < earliest) earliest = d;
    });
    return earliest;
  }

  function buildStripHtml(year) {
    const monthsHtml = MONTHS_SHORT.map((label, i) => {
      const active = _selectedMonth === i;
      return `<button class="_mis-month" data-month="${i}" type="button" style="padding:7px 11px;background:${active?'var(--app-primary,#C93C1D)':'#fff'};color:${active?'#fff':'#475569'};border:1px solid ${active?'transparent':'#e2e8f0'};border-radius:7px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .12s">${label}</button>`;
    }).join('');
    const allActive = _selectedMonth == null;
    const allBtn = `<button class="_mis-all" type="button" style="padding:7px 13px;background:${allActive?'var(--app-primary,#C93C1D)':'#fff'};color:${allActive?'#fff':'#475569'};border:1px solid ${allActive?'transparent':'#e2e8f0'};border-radius:7px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .12s">📅 Allt árið</button>`;
    const yearLabel = `<span style="font-size:13px;font-weight:700;color:#0f172a;padding:0 10px;display:flex;align-items:center">${year}</span>`;
    const yearControls = `
      <button class="_mis-year-prev" type="button" title="Fyrra ár" style="min-width:40px;min-height:40px;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font:inherit;font-size:15px;font-weight:600">‹</button>
      ${yearLabel}
      <button class="_mis-year-next" type="button" title="Næsta ár" style="min-width:40px;min-height:40px;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font:inherit;font-size:15px;font-weight:600">›</button>
    `;
    return `
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin:12px 20px 0;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
        ${yearControls}
        <span style="width:1px;height:24px;background:#e2e8f0;margin:0 4px"></span>
        ${allBtn}
        ${monthsHtml}
      </div>
      <div id="_mis-list" style="margin:8px 20px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04)"></div>
    `;
  }

  function buildListHtml(rows, label) {
    if (!rows.length) {
      return `<div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:flex;justify-content:space-between;align-items:center"><span>Skoðun ${label}</span><button class="_mis-close" type="button" title="Loka lista" style="padding:3px 9px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;color:#475569;font-weight:600">✕ Loka</button></div>` +
        `<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">Engin fyrirtæki með skoðun ${label}</div>`;
    }
    const total = rows.length;
    const header = `<div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:flex;justify-content:space-between;align-items:center"><span>Skoðun ${label} <span style="margin-left:8px;color:#94a3b8;font-weight:600">${total} fyrirtæki</span></span><button class="_mis-close" type="button" title="Loka lista" style="padding:3px 9px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;color:#475569;font-weight:600">✕ Loka</button></div>`;
    const items = rows.map(r => `
      <div class="_mis-row" data-co-id="${r.coId}" style="display:grid;grid-template-columns:24px 1fr auto auto 16px;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .12s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <div style="width:14px;height:14px;border-radius:50%;background:${r.status.color};border:2px solid #fff;box-shadow:0 0 0 1px ${r.status.color}40,0 1px 2px rgba(0,0,0,0.1)"></div>
        <div style="font-weight:600;color:#0f172a;font-size:13.5px;line-height:1.3">${escapeHtml(r.nafn)}<div style="font-size:11px;color:#64748b;font-weight:500;margin-top:2px">${escapeHtml(r.heimilisfang || '')}</div></div>
        <div style="font-size:11px;font-weight:700;color:${r.status.color};text-transform:uppercase;letter-spacing:.04em">${escapeHtml(r.status.label)}</div>
        <div style="font-size:12px;color:#475569;font-variant-numeric:tabular-nums;font-weight:600">${escapeHtml(r.dateStr)}</div>
        <div style="color:#94a3b8;font-size:13px">›</div>
      </div>`).join('');
    return header + items;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // 2026-08-24 (Agnar ein-uppspretta): staða skoðunar byggir á CANONICAL skoðunar-
  // dagsetningu (skýrsla/reikningur, canonical 312), ekki dauðum tækja-dagsetningum.
  // Þannig samræmist liturinn skoðunarmánuðinum sem prófíllinn/Ársskoðun sýna.
  function canonStatusFor(cd) {
    if (!cd) return { color:'#9ca3af', emoji:'⚪', label:'Óþekkt' };
    const today = new Date(); today.setHours(0,0,0,0);
    const d30 = new Date(today.getTime() + 30*86400000);
    const ni = new Date(cd); ni.setHours(0,0,0,0);
    if (isNaN(ni)) return { color:'#9ca3af', emoji:'⚪', label:'Óþekkt' };
    if (ni < today) return { color:'#dc2626', emoji:'🔴', label:'Útrunnið' };
    if (ni <= d30) return { color:'#b45309', emoji:'🟠', label:'Rennur út' };
    return { color:'#16a34a', emoji:'🟢', label:'Í lagi' };
  }

  function refreshList() {
    const list = document.getElementById('_mis-list');
    if (!list) return;
    // If user pressed "Loka" earlier, reopening the panel by re-selecting a
    // month/year/all should bring it back into view.
    list.style.display = '';
    const companies = (window.Companies && window.Companies.list) || [];
    // 2026-05-08: Use unitsByClient index instead of full filter — at 456
    // companies × 3000 units this saves 1.4M comparisons per month-tab
    // click. Falls back to full filter if cache index isn't built yet.
    const ubc = (window.DB && window.DB.cache && window.DB.cache.unitsByClient) || null;
    const allUnits = (window.DB && window.DB.cache && window.DB.cache.units) || [];

    const rows = [];
    companies.forEach(co => {
      if (!co || co.id == null) return;
      // 2026-08-24 (Agnar ein-uppspretta / ÖRYGGISMÁL): hvaða mánuð fyrirtæki lendir í
      // kemur AÐEINS úr skýrslu/reikningi (canonical 312 → v_stadur_yfirlit), ALDREI úr
      // tækja-next_insp. Rangur mánuður hér = fyrirtæki sést ekki í rétta mánuðinum =
      // gleymd skoðun = brunahætta. Fyrirtæki án áætlaðs mánaðar (engin skýrsla/reikningur/
      // handvirkt) birtist ekki í mánaðar-listanum — það kemur fram sem gloppa í Ársskoðun.
      const cd = (window.CanonStadur && CanonStadur.nextDateOf) ? CanonStadur.nextDateOf(co.id) : null;
      const cdt = cd ? new Date(cd) : null;
      if (!cdt || isNaN(cdt) || cdt.getFullYear() !== _selectedYear) return;
      if (_selectedMonth != null && cdt.getMonth() !== _selectedMonth) return;
      rows.push({
        coId: co.id,
        nafn: co.nafn || '',
        heimilisfang: co.heimilisfang || '',
        status: canonStatusFor(cd),
        dateStr: fmtDate(cd),
        sortKey: cdt.getTime()
      });
    });
    rows.sort((a, b) => a.sortKey - b.sortKey || a.nafn.localeCompare(b.nafn, 'is'));

    const label = _selectedMonth == null ? `${_selectedYear}` : `${MONTHS_SHORT[_selectedMonth]} ${_selectedYear}`;
    list.innerHTML = buildListHtml(rows, label);

    // Wire row clicks
    list.querySelectorAll('._mis-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = +row.getAttribute('data-co-id');
        if (!id) return;
        if (window._openCompanySafe) {
          window._openCompanySafe(id);
        } else if (window.App && window.App.switchView && window.Companies && window.Companies.openDetail) {
          window.App.switchView('companies');
          setTimeout(() => window.Companies.openDetail(id), 150);
        }
      });
    });
    // Wire close button — hides the list panel until user picks a month again.
    const closeBtn = list.querySelector('._mis-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        list.style.display = 'none';
      });
    }
  }

  function rebuildStrip() {
    const fv = document.getElementById('view-field');
    if (!fv) return;
    const existingStrip = fv.querySelector('._mis-wrap');
    const html = buildStripHtml(_selectedYear);
    let wrap = existingStrip;
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = '_mis-wrap';
    }
    // 2026-05-10: Position wrap BETWEEN the map and the .field-body columns.
    // Race condition history: if patch 89 fired before newfeatures.js injected
    // the map, wrap landed above field-body BEFORE the map, so the map+columns
    // were pushed below the fold and the user had to scroll past 100+ list
    // rows. Now we always re-check on every rebuild + schedule a follow-up
    // re-check so a late-arriving map gets the wrap repositioned correctly.
    const body = fv.querySelector('.field-body');
    const mapBox = fv.querySelector('#field-map-container');
    const mapWrapper = mapBox && mapBox.parentElement && mapBox.parentElement.parentElement === fv
      ? mapBox.parentElement : null;

    if (mapWrapper) {
      // Map is present — put wrap right after it (so order is: map, wrap, body).
      if (wrap.previousElementSibling !== mapWrapper) {
        mapWrapper.insertAdjacentElement('afterend', wrap);
      }
    } else if (body && body.parentElement) {
      // Map not injected yet — sit just before field-body. We'll re-check
      // shortly to catch the map when it shows up.
      if (wrap.nextElementSibling !== body) {
        body.insertAdjacentElement('beforebegin', wrap);
      }
      if (!wrap._misMapWatch) {
        wrap._misMapWatch = true;
        // Poll a couple times for the map to appear; rebuildStrip is idempotent.
        let attempts = 0;
        const tick = () => {
          attempts++;
          if (fv.querySelector('#field-map-container')) {
            rebuildStrip();
          } else if (attempts < 10) {
            setTimeout(tick, 500);
          } else {
            wrap._misMapWatch = false; // give up after 5s
          }
        };
        setTimeout(tick, 500);
      }
    } else if (!wrap.parentElement) {
      fv.appendChild(wrap);
    }
    wrap.innerHTML = html;
    // Wire month buttons + year nav
    wrap.querySelectorAll('._mis-month').forEach(btn => {
      btn.addEventListener('click', () => {
        _selectedMonth = +btn.dataset.month;
        rebuildStrip();
      });
    });
    const allBtn = wrap.querySelector('._mis-all');
    if (allBtn) allBtn.addEventListener('click', () => {
      _selectedMonth = null;
      rebuildStrip();
    });
    const yPrev = wrap.querySelector('._mis-year-prev');
    if (yPrev) yPrev.addEventListener('click', () => { _selectedYear--; rebuildStrip(); });
    const yNext = wrap.querySelector('._mis-year-next');
    if (yNext) yNext.addEventListener('click', () => { _selectedYear++; rebuildStrip(); });
    refreshList();
  }

  // Try to render strip when the field view becomes active
  function ensure() {
    const fv = document.getElementById('view-field');
    if (!fv || !fv.classList.contains('active')) return;
    rebuildStrip();
    // 312: mánaðar-bucketing byggir á canonical skoðunarmánuði — tryggja að hann sé
    // hlaðinn og endurteikna þegar hann kemur (annars sæist tómur listi fyrsta augnablikið).
    try{
      if (window.CanonStadur && !window.__misCanonLoaded) {
        CanonStadur.ready().then(function(){ window.__misCanonLoaded = true; rebuildStrip(); });
      }
    }catch(e){}
  }
  document.addEventListener('view-shown', e => {
    if (e && e.detail && e.detail.name === 'field') setTimeout(ensure, 200);
  });
  // Also poll a few times on load — Field view may already be open
  setTimeout(ensure, 1500);
  setTimeout(ensure, 3500);

  console.log('[monthly-inspection-strip] installed');
})();
/* === END MONTHLY INSPECTION STRIP v1 === */
