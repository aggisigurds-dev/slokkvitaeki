/* === IMPORTANT COMPANIES v1 ===
 *
 * Lets the user flag a fyrirtæki as "Mikilvægt" — when something happens and
 * a service call needs to bump to the top of the queue. Surfaces:
 *
 *   1. Toggle button "⚠ Mikilvægt" in the company-detail header.
 *   2. Top section in the Field view's "Næstu heimsóknir" panel showing the
 *      flagged companies + their athugasemdir. Click to open the company.
 *
 * Storage: AppSettings.tilkynningar.important_company_ids — array of ints.
 * Lives in Supabase so the flag is shared across devices.
 */
(() => {
  if (window.__importantCompaniesInstalled) return;
  window.__importantCompaniesInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getList() {
    const v = window.AppSettings && window.AppSettings.path('tilkynningar.important_company_ids');
    return Array.isArray(v) ? v.map(Number) : [];
  }
  async function setList(arr) {
    if (!window.AppSettings || typeof window.AppSettings.save !== 'function') return false;
    return await window.AppSettings.save({ tilkynningar: { important_company_ids: arr } });
  }
  async function toggleImportant(coId) {
    const list = new Set(getList());
    if (list.has(coId)) list.delete(coId); else list.add(coId);
    return await setList(Array.from(list));
  }
  function isImportant(coId) {
    return getList().indexOf(+coId) >= 0;
  }

  // ── 1. Inject toggle button into Companies.openDetail header ─────────────
  function decorateCompanyDetail() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    if (main.dataset._impDecorated === '1') return;
    // Find the title block + action buttons row at the top of the detail
    const actionsRow = main.querySelector('div[style*="display:flex"][style*="gap:7px"]');
    if (!actionsRow) return;
    if (actionsRow.querySelector('._imp-toggle')) return;
    // Get the company id — the first onclick="Companies.openEdit(...)" gives us the id
    const editBtn = actionsRow.querySelector('button[onclick^="Companies.openEdit"]');
    const m = editBtn && editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if (!m) return;
    const coId = +m[1];
    main.dataset._impDecorated = '1';

    const isImp = isImportant(coId);
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline btn-sm _imp-toggle';
    btn.type = 'button';
    btn.innerHTML = isImp ? '⚠ Mikilvægt ✓' : '⚠ Merkja mikilvægt';
    btn.style.cssText = 'background:' + (isImp ? '#fef3c7' : '#fff') + ';color:' + (isImp ? '#92400e' : '#475569') + ';border-color:' + (isImp ? '#fbbf24' : '#cbd5e1') + ';font-weight:700';
    btn.addEventListener('click', async () => {
      const wasImp = isImportant(coId);
      btn.disabled = true;
      btn.textContent = '...';
      const ok = await toggleImportant(coId);
      btn.disabled = false;
      if (ok) {
        const nowImp = !wasImp;
        btn.innerHTML = nowImp ? '⚠ Mikilvægt ✓' : '⚠ Merkja mikilvægt';
        btn.style.background = nowImp ? '#fef3c7' : '#fff';
        btn.style.color = nowImp ? '#92400e' : '#475569';
        btn.style.borderColor = nowImp ? '#fbbf24' : '#cbd5e1';
        if (window.Toast && Toast.show) Toast.show(nowImp ? '⚠ Merkt mikilvægt' : 'Mikilvægi tekið af');
      } else {
        btn.innerHTML = isImp ? '⚠ Mikilvægt ✓' : '⚠ Merkja mikilvægt';
        if (window.Toast && Toast.show) Toast.show('Villa við vistun');
      }
    });
    actionsRow.insertBefore(btn, actionsRow.firstChild);
  }

  // ── 2. Inject "Mikilvæg fyrirtæki" section at TOP of view-field ─────────
  // 2026-05-08: Was inserting into #field-schedule (legacy). After patch 89
  // the monthly inspection strip pushed field-schedule down ~3600px so users
  // never saw the Mikilvægt section. Now we insert at the very top of
  // view-field, above the monthly strip.
  function decorateFieldSchedule() {
    const view = document.getElementById('view-field');
    const sched = document.getElementById('field-schedule');
    if (!view && !sched) return;
    // Remove any existing _imp-section anywhere in the field area
    document.querySelectorAll('#view-field ._imp-section, #field-schedule ._imp-section').forEach(el => el.remove());

    const list = getList();
    if (!list.length) return;
    const companies = (window.Companies && window.Companies.list) || [];
    const important = list
      .map(id => companies.find(c => +c.id === +id))
      .filter(Boolean);
    if (!important.length) return;

    const wrap = document.createElement('div');
    wrap.className = '_imp-section';
    wrap.style.cssText = 'background:#fef3c7;border:1.5px solid #fbbf24;border-radius:10px;padding:10px 12px;margin-bottom:14px;box-shadow:0 1px 3px rgba(245,158,11,0.15)';
    wrap.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<span style="font-size:11px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.05em">⚠ Mikilvægt — strax</span>' +
        '<span style="font-size:10px;color:#92400e;background:#fbbf24;padding:2px 8px;border-radius:10px;font-weight:700">' + important.length + '</span>' +
      '</div>' +
      important.map(c => {
        const note = (c.athugasemdir || '').trim();
        return '<div class="_imp-row" data-co-id="' + c.id + '" ' +
          'style="background:#fff;border:1px solid #fde68a;border-radius:8px;padding:9px 11px;margin-bottom:6px;cursor:pointer;transition:all .12s" ' +
          'onmouseover="this.style.borderColor=\'#fbbf24\';this.style.transform=\'translateY(-1px)\'" ' +
          'onmouseout="this.style.borderColor=\'#fde68a\';this.style.transform=\'\'">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
            '<div style="font-weight:700;color:#0f172a;font-size:13.5px;line-height:1.3">' + esc(c.nafn||'') + '</div>' +
            '<button class="_imp-clear" data-co-id="' + c.id + '" type="button" title="Fjarlægja mikilvægi" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 4px;line-height:1">✕</button>' +
          '</div>' +
          (note ? '<div style="margin-top:5px;font-size:12px;color:#475569;line-height:1.4;white-space:pre-wrap">' + esc(note) + '</div>'
                : '<div style="margin-top:4px;font-size:11px;color:#94a3b8;font-style:italic">Engin athugasemd skráð</div>') +
          (c.simi ? '<div style="margin-top:5px;font-size:11px;color:#64748b">📞 <a href="tel:' + esc(c.simi.replace(/[^0-9+]/g,'')) + '" style="color:#2563eb;text-decoration:none" onclick="event.stopPropagation()">' + esc(c.simi) + '</a></div>' : '') +
        '</div>';
      }).join('');
    // Insert at the TOP of view-field (above monthly strip + field-schedule).
    // Anchor: just below the search/action bar — find the first "real" content
    // div and insert before it. Fall back to sched.insertBefore for legacy.
    if (view) {
      // Add small horizontal padding so it lines up with other sections
      wrap.style.margin = '12px 20px';
      const firstContent = view.querySelector('.field-body, .field-content, ._mis-wrap, #field-schedule');
      if (firstContent && firstContent.parentNode) {
        firstContent.parentNode.insertBefore(wrap, firstContent);
      } else {
        view.insertBefore(wrap, view.firstChild);
      }
    } else if (sched) {
      sched.insertBefore(wrap, sched.firstChild);
    }

    // Wire row clicks → open company detail
    wrap.querySelectorAll('._imp-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = +row.getAttribute('data-co-id');
        if (window._openCompanySafe) window._openCompanySafe(id);
        else if (window.App && window.App.switchView && window.Companies && window.Companies.openDetail) {
          window.App.switchView('companies');
          setTimeout(() => window.Companies.openDetail(id), 150);
        }
      });
    });
    // Wire ✕ buttons → un-flag
    wrap.querySelectorAll('._imp-clear').forEach(b => {
      b.addEventListener('click', async e => {
        e.stopPropagation();
        const id = +b.getAttribute('data-co-id');
        b.disabled = true;
        await toggleImportant(id);
        decorateFieldSchedule();
      });
    });
  }

  // ── Triggers ──────────────────────────────────────────────────────────────
  // Companies detail panel is rebuilt on every openDetail. Watch #companies-main.
  // Use a debounced + scheduled-pass observer so we never run during the user's
  // click — that helps prevent any chance of interfering with the row click
  // handlers wired by companieslist.js / 00-legacy.js fix.
  function attachCompanies() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attachCompanies, 800); return; }
    let _debounceT = 0;
    new MutationObserver(() => {
      clearTimeout(_debounceT);
      _debounceT = setTimeout(() => {
        main.dataset._impDecorated = '0';
        try { decorateCompanyDetail(); } catch (e) { /* never break openDetail */ }
      }, 120);
    }).observe(main, { childList: true });
  }
  attachCompanies();

  // Field schedule rebuilt when Field.render() runs. Re-inject on any structural
  // change to #view-field. Also re-inject when the AppSettings flag changes.
  function attachField() {
    const view = document.getElementById('view-field');
    if (!view) { setTimeout(attachField, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(() => {
        // Don't loop: only re-inject if our section is missing
        if (!document.querySelector('#view-field ._imp-section') && getList().length) {
          decorateFieldSchedule();
        }
      }, 200);
    }).observe(view, { childList: true, subtree: true });
  }
  attachField();

  if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.AppSettings.onChange(() => {
      decorateFieldSchedule();
      // Also refresh company-detail button state if visible
      const main = document.getElementById('companies-main');
      if (main) main.dataset._impDecorated = '0';
      decorateCompanyDetail();
    });
  }

  // First-paint passes
  setTimeout(() => { decorateCompanyDetail(); decorateFieldSchedule(); }, 1500);
  setTimeout(() => { decorateCompanyDetail(); decorateFieldSchedule(); }, 3500);

  console.log('[important-companies] installed');
})();
/* === END IMPORTANT COMPANIES v1 === */
