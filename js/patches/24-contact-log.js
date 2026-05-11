/* === CONTACT LOG v1 === */
/* Adds a "Samskiptasaga" (contact history) tab to each company detail view.
 * Logs calls, emails, visits, and notes per company with date, type, and text.
 *
 * SQL required (run once in Supabase):
 *   CREATE TABLE IF NOT EXISTS contact_log (
 *     id BIGSERIAL PRIMARY KEY,
 *     company_id BIGINT REFERENCES fyrirtaeki(id) ON DELETE CASCADE,
 *     contact_type TEXT NOT NULL, -- 'simi', 'netfang', 'heimsokn', 'athugasemd'
 *     notes TEXT,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     created_by TEXT
 *   );
 *   CREATE INDEX IF NOT EXISTS contact_log_company_idx ON contact_log(company_id);
 *
 * Hooks into Companies.openDetail by watching for the company detail panel
 * and injecting a "Samskipti" tab button + content area.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__contactLogInstalled) return;
  window.__contactLogInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear()
      + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  const TYPE_META = {
    simi:        { label: 'Símtal',    icon: '📞', color: '#2563eb', bg: '#eff6ff' },
    netfang:     { label: 'Tölvupóstur', icon: '📧', color: '#7c3aed', bg: '#f5f3ff' },
    heimsokn:    { label: 'Heimsókn', icon: '🏠', color: '#16a34a', bg: '#f0fdf4' },
    athugasemd:  { label: 'Athugasemd', icon: '📝', color: '#64748b', bg: '#f8fafc' }
  };

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('cl-style')) {
    const s = document.createElement('style');
    s.id = 'cl-style';
    s.textContent = `
      .cl-tab-btn {
        padding: 6px 14px; background: #f1f5f9; border: 1px solid #e2e8f0;
        border-radius: 6px; font: inherit; font-size: 12px; font-weight: 600;
        cursor: pointer; color: #475569; white-space: nowrap;
      }
      .cl-tab-btn:hover { background: #e2e8f0; }
      .cl-tab-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
      .cl-panel { padding: 14px 0 4px; }
      .cl-add-row {
        display: flex; gap: 6px; flex-wrap: wrap; align-items: flex-start;
        margin-bottom: 14px;
      }
      .cl-type-sel {
        padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 7px;
        font: inherit; font-size: 12px; background: #fff; min-width: 140px;
      }
      .cl-notes-inp {
        flex: 1; min-width: 180px; padding: 7px 10px;
        border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 12px;
        resize: none; height: 36px;
      }
      .cl-notes-inp:focus, .cl-type-sel:focus { outline: none; border-color: #2563eb; }
      .cl-add-btn {
        padding: 7px 14px; background: #2563eb; color: #fff; border: none;
        border-radius: 7px; font: inherit; font-size: 12px; font-weight: 600;
        cursor: pointer; white-space: nowrap;
      }
      .cl-add-btn:hover { background: #1d4ed8; }
      .cl-add-btn:disabled { opacity: .5; cursor: not-allowed; }
      .cl-list { display: flex; flex-direction: column; gap: 8px; }
      .cl-entry {
        border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
        background: #fff; position: relative;
      }
      .cl-entry .cl-entry-hd { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
      .cl-entry .cl-type-pill {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700;
      }
      .cl-entry .cl-date { font-size: 11px; color: #94a3b8; }
      .cl-entry .cl-by { font-size: 11px; color: #94a3b8; margin-left: auto; }
      .cl-entry .cl-notes-text { font-size: 13px; color: #334155; white-space: pre-wrap; }
      .cl-entry .cl-del-btn {
        position: absolute; top: 8px; right: 8px;
        background: none; border: none; font-size: 14px; color: #94a3b8;
        cursor: pointer; line-height: 1; padding: 2px 5px; border-radius: 4px;
      }
      .cl-entry .cl-del-btn:hover { background: #fee2e2; color: #dc2626; }
      .cl-empty { color: #94a3b8; font-style: italic; font-size: 13px; padding: 20px 0; text-align: center; }
      .cl-loading { color: #94a3b8; font-size: 13px; padding: 12px 0; }
    `;
    document.head.appendChild(s);
  }

  // ── Load & save ───────────────────────────────────────────────────────────
  async function loadEntries(companyId) {
    const SB = getSB();
    if (!SB) return [];
    const { data, error } = await SB
      .from('contact_log')
      .select('id,contact_type,notes,created_at,created_by')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      if (/relation.*does not exist/i.test(error.message)) return null; // table not created yet
      console.warn('[contact-log]', error.message);
      return [];
    }
    return data || [];
  }

  async function addEntry(companyId, type, notes, user) {
    const SB = getSB();
    if (!SB) throw new Error('Engin tenging');
    const { data, error } = await SB
      .from('contact_log')
      .insert({ company_id: companyId, contact_type: type, notes, created_by: user || '' })
      .select('id,contact_type,notes,created_at,created_by')
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteEntry(id) {
    const SB = getSB();
    if (!SB) throw new Error('Engin tenging');
    const { error } = await SB.from('contact_log').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Render panel content ─────────────────────────────────────────────────
  function renderEntries(container, entries, companyId) {
    if (entries === null) {
      container.innerHTML = `<div class="cl-empty">Samskiptasaga er ekki til enn.<br>
        <small style="display:block;margin-top:6px;">Þarf að búa til <code>contact_log</code> töfluna í Supabase fyrst.<br>Sjá SQL í <code>js/patches/24-contact-log.js</code> haus.</small></div>`;
      return;
    }
    let html = `<div class="cl-add-row">
      <select class="cl-type-sel" id="cl-type-${companyId}">
        <option value="simi">📞 Símtal</option>
        <option value="netfang">📧 Tölvupóstur</option>
        <option value="heimsokn">🏠 Heimsókn</option>
        <option value="athugasemd">📝 Athugasemd</option>
      </select>
      <textarea class="cl-notes-inp" id="cl-notes-${companyId}" placeholder="Skrá samskipti…" rows="1"></textarea>
      <button class="cl-add-btn" id="cl-add-${companyId}">+ Skrá</button>
    </div>`;
    if (!entries.length) {
      html += '<div class="cl-empty">Engin samskipti skráð enn</div>';
    } else {
      html += '<div class="cl-list">' + entries.map(e => {
        const meta = TYPE_META[e.contact_type] || TYPE_META.athugasemd;
        return `<div class="cl-entry" data-cl-entry-id="${e.id}">
          <div class="cl-entry-hd">
            <span class="cl-type-pill" style="background:${meta.bg};color:${meta.color};">
              ${meta.icon} ${esc(meta.label)}
            </span>
            <span class="cl-date">${esc(fmtDateTime(e.created_at))}</span>
            ${e.created_by ? `<span class="cl-by">${esc(e.created_by)}</span>` : ''}
            <button class="cl-del-btn" data-cl-del="${e.id}" title="Eyða">✕</button>
          </div>
          <div class="cl-notes-text">${esc(e.notes || '—')}</div>
        </div>`;
      }).join('') + '</div>';
    }
    container.innerHTML = html;

    // Wire add button
    document.getElementById(`cl-add-${companyId}`)?.addEventListener('click', async () => {
      const typeEl = document.getElementById(`cl-type-${companyId}`);
      const notesEl = document.getElementById(`cl-notes-${companyId}`);
      const notes = notesEl ? notesEl.value.trim() : '';
      if (!notes) { if (window.Toast && Toast.show) Toast.show('Skrðu athugasemd'); return; }
      const btn = document.getElementById(`cl-add-${companyId}`);
      btn.disabled = true;
      try {
        const newEntry = await addEntry(companyId, typeEl?.value || 'athugasemd', notes, '');
        entries.unshift(newEntry);
        notesEl.value = '';
        renderEntries(container, entries, companyId);
        if (window.Toast && Toast.show) Toast.show('✓ Samskipti skráð');
      } catch (err) {
        if (window.Toast && Toast.show) Toast.show('Villa: ' + err.message);
        btn.disabled = false;
      }
    });

    // Wire delete buttons
    container.querySelectorAll('[data-cl-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!await Confirm.show('Eyða þessari færslu?')) return;
        const id = parseInt(btn.dataset.clDel, 10);
        try {
          await deleteEntry(id);
          const idx = entries.findIndex(e => e.id === id);
          if (idx >= 0) entries.splice(idx, 1);
          renderEntries(container, entries, companyId);
        } catch (err) {
          if (window.Toast && Toast.show) Toast.show('Villa: ' + err.message);
        }
      });
    });
  }

  // ── Inject into company detail panel ─────────────────────────────────────
  let _lastCompanyId = null;

  async function injectIntoDetail(detailEl) {
    if (!detailEl) return;
    // Find company id — look for data-id or data-company-id attribute
    let companyId = detailEl.dataset.companyId || detailEl.dataset.id;
    if (!companyId) {
      // Try to read from heading/edit button
      const editBtn = detailEl.querySelector('[onclick*="openEdit"]');
      if (editBtn) {
        const m = (editBtn.getAttribute('onclick') || '').match(/\d+/);
        if (m) companyId = m[0];
      }
    }
    if (!companyId) companyId = _lastCompanyId;
    if (!companyId) return;

    companyId = parseInt(companyId, 10);
    if (isNaN(companyId)) return;

    // Don't re-inject if already done for same company
    if (detailEl.querySelector('#cl-tab-btn-' + companyId)) return;

    // Find the action row / tab row in the detail panel to append tab button
    let tabRow = detailEl.querySelector('.co-tabs, .detail-tabs, .co-tab-row');
    if (!tabRow) {
      // Create a tab row before the first section in the detail
      const firstSection = detailEl.querySelector('.co-section, .detail-section, h3, .section');
      tabRow = document.createElement('div');
      tabRow.className = 'co-tabs';
      tabRow.style.cssText = 'display:flex;gap:6px;padding:10px 16px 0;flex-wrap:wrap;';
      if (firstSection) firstSection.parentNode.insertBefore(tabRow, firstSection);
      else detailEl.appendChild(tabRow);
    }

    const tabBtn = document.createElement('button');
    tabBtn.id = 'cl-tab-btn-' + companyId;
    tabBtn.className = 'cl-tab-btn';
    tabBtn.textContent = '📞 Samskipti';
    tabRow.appendChild(tabBtn);

    // Create panel container
    const panelContainer = document.createElement('div');
    panelContainer.id = 'cl-panel-' + companyId;
    panelContainer.className = 'cl-panel';
    panelContainer.style.cssText = 'padding: 14px 16px; display: none;';
    panelContainer.innerHTML = '<div class="cl-loading">Hleður samskiptasögu…</div>';
    detailEl.appendChild(panelContainer);

    let isOpen = false;

    tabBtn.addEventListener('click', async () => {
      isOpen = !isOpen;
      tabBtn.classList.toggle('active', isOpen);
      panelContainer.style.display = isOpen ? '' : 'none';
      if (isOpen && panelContainer.querySelector('.cl-loading')) {
        const entries = await loadEntries(companyId);
        renderEntries(panelContainer, entries, companyId);
      }
    });
  }

  // ── Watch for company detail panels ──────────────────────────────────────
  function tryInjectAll() {
    const panels = document.querySelectorAll(
      '[id^="co-detail"], .co-detail, [class*="company-detail"], [id*="company-detail"]'
    );
    panels.forEach(p => {
      if (p.querySelector('h2, h3, .co-name, [class*="name"]')) injectIntoDetail(p);
    });
  }

  // Hook Companies.openDetail
  function hookOpenDetail() {
    if (!window.Companies || !Companies.openDetail) return;
    if (Companies.openDetail._clHook) return;
    const orig = Companies.openDetail.bind(Companies);
    Companies.openDetail = function(id) {
      _lastCompanyId = id;
      const ret = orig(id);
      setTimeout(tryInjectAll, 300);
      setTimeout(tryInjectAll, 800);
      return ret;
    };
    Companies.openDetail._clHook = true;
  }

  hookOpenDetail();
  setTimeout(hookOpenDetail, 1000);
  setTimeout(hookOpenDetail, 2500);

  const obs = new MutationObserver(() => {
    hookOpenDetail();
    if (_lastCompanyId) setTimeout(tryInjectAll, 100);
  });
  obs.observe(document.body, { childList: true, subtree: true });

  window.ContactLog = { inject: injectIntoDetail, tryInjectAll };
  console.log('[contact-log] installed');
})();
/* === END CONTACT LOG === */
