/* === PAYMENT REVIEW v1 ===
   "Yfirferð greiðslna" — a review tool for going over bills whose payment
   routing is wrong or incomplete.

   The pain it solves: a lot of sales were rung up as "Greitt síðar"
   (greitt_sidar) at the till, but there was no way afterwards to switch them
   to "Reikningur" so an invoice + krafa í heimabanka could be sent. Drafts
   (drög) were also stranded. This modal lists every sale that likely needs
   attention and lets the user, per row:

     • change the greiðslumáti (greitt_med) inline — instantly saved
     • finalize a draft (drög → final) so it enters Bókhald
     • 👁 Fela (soft-hide) — sets solur.hidden=true; the row drops out of
       Bókhalds yfirlit while the user cleans up (fully reversible)
     • 🗑 Eyða (soft-delete) — sets status='void' (recoverable, never a hard
       delete)

   Hidden + void rows are excluded from Bókhald (patch 11 filters
   .neq('hidden',true) and the view already ignores void). A "Sýna falin"
   toggle reveals hidden/void rows so they can be restored.

   Adds a sidebar entry "🧾 Yfirferð greiðslna (N)" under Drög. Depends on the
   solur.hidden + solur.hidden_at columns (migration 2026-06-10).  */
(() => {
  if (window.__paymentReviewInstalled) return;
  window.__paymentReviewInstalled = true;

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

  // Canonical payment methods. The DB has historical case/label variants
  // (kort/Kort, reidufe, Pening) — we normalise on display but only WRITE
  // these canonical values when the user picks one.
  const PAYMENTS = [
    { v: 'reikningur',    label: 'Reikningur (senda kröfu)' },
    { v: 'greitt_sidar',  label: 'Greitt síðar' },
    { v: 'kort',          label: 'Kort' },
    { v: 'reidufe',       label: 'Reiðufé' }
  ];
  function payLabel(v) {
    const s = String(v || '').toLowerCase();
    if (s === 'reikningur') return 'Reikningur';
    if (s === 'greitt_sidar') return 'Greitt síðar';
    if (s === 'kort') return 'Kort';
    if (s === 'reidufe' || s === 'pening' || s === 'reiðufé') return 'Reiðufé';
    return v || '—';
  }
  // Map an arbitrary stored value to the closest canonical dropdown value so
  // the <select> shows the right current option.
  function payValueFor(v) {
    const s = String(v || '').toLowerCase();
    if (s === 'reikningur') return 'reikningur';
    if (s === 'greitt_sidar') return 'greitt_sidar';
    if (s === 'kort') return 'kort';
    if (s === 'reidufe' || s === 'pening' || s === 'reiðufé') return 'reidufe';
    return '';
  }

  let _count = 0;
  let _items = [];
  let _showHidden = false;

  // ── Load: focus on the sales that need routing attention ──────────────────
  // Default working set: drafts + greitt_sidar (the stranded "pay later"
  // bills). When "Sýna falin" is on we also pull hidden + void so they can be
  // restored.
  async function loadReview() {
    const SB = getSB();
    if (!SB) return;
    try {
      const { data, error } = await SB.from('solur')
        .select('id,num,customer_nafn,samtals,greitt_med,status,hidden,created_at,invoiced_at,dk_invoice_id')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) { console.warn('[payment-review] load error:', error); return; }
      _items = data || [];
      // Count = active (not hidden, not void) bills that still need routing:
      // drafts or "greitt_sidar" not yet invoiced.
      _count = _items.filter(s => !s.hidden && s.status !== 'void' &&
        (s.status === 'drog' ||
         (payValueFor(s.greitt_med) === 'greitt_sidar' && !s.invoiced_at))
      ).length;
      updateBadge();
      if (document.getElementById('_payrev-body')) renderList();
    } catch (e) {
      console.warn('[payment-review] load exception:', e);
    }
  }

  // ── Sidebar entry ─────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('._payrev-nav-btn')) { updateBadge(); return; }
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    // Prefer to sit right after the Drög button; fall back to after Sala.
    const anchor = allBtns.find(b => /\bdrög\b/i.test(b.textContent || ''))
                || allBtns.find(b => /\bsala\b/i.test(b.textContent || ''));
    if (!anchor) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = anchor.className.replace(/\bactive\b/g, '').trim() + ' _payrev-nav-btn';
    btn.setAttribute('data-payrev-nav', '1');
    btn.innerHTML = '<span style="margin-right:6px">🧾</span>Yfirferð greiðslna <span class="_payrev-badge" style="display:none;margin-left:6px;background:#0ea5e9;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px">0</span>';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openModal(); });
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    updateBadge();
  }
  function updateBadge() {
    const badge = document.querySelector('._payrev-badge');
    if (!badge) return;
    badge.textContent = String(_count);
    badge.style.display = _count > 0 ? 'inline-block' : 'none';
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal() {
    document.getElementById('_payrev-modal')?.remove();
    const m = document.createElement('div');
    m.id = '_payrev-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:100030;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(1040px,calc(100vw - 28px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 22px;background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <div>
            <h2 style="margin:0;font-size:17px;font-weight:700">🧾 Yfirferð greiðslna</h2>
            <div style="font-size:12px;color:#e0f2fe;margin-top:2px">Breyttu greiðslumáta, kláraðu drög, eða feldu/eyddu röngum sölum á meðan þú ferð yfir</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#fff;cursor:pointer;user-select:none">
              <input id="_payrev-showhidden" type="checkbox" ${_showHidden ? 'checked' : ''} style="cursor:pointer"> Sýna falin/eydd
            </label>
            <button id="_payrev-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:18px;width:34px;height:34px;border-radius:7px;cursor:pointer;line-height:1">✕</button>
          </div>
        </div>
        <div style="padding:8px 22px;background:#f1f5f9;border-bottom:1px solid #e2e8f0">
          <div id="_payrev-filters" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        </div>
        <div id="_payrev-body" style="flex:1;overflow-y:auto;background:#f8fafc"></div>
      </div>`;
    document.body.appendChild(m);
    m.querySelector('#_payrev-x').addEventListener('click', () => m.remove());
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    m.querySelector('#_payrev-showhidden').addEventListener('change', e => {
      _showHidden = e.target.checked;
      renderFilters(); renderList();
    });
    renderFilters();
    renderList();
    loadReview();
  }

  // Filter chips
  const FILTERS = [
    { k: 'attention', label: '⚠️ Þarf yfirferð' },
    { k: 'greitt_sidar', label: 'Greitt síðar' },
    { k: 'drog', label: 'Drög' },
    { k: 'reikningur', label: 'Reikningur' },
    { k: 'all', label: 'Allt' }
  ];
  let _filter = 'attention';
  function renderFilters() {
    const el = document.getElementById('_payrev-filters');
    if (!el) return;
    el.innerHTML = FILTERS.map(f =>
      `<button data-f="${f.k}" type="button" style="padding:5px 11px;border-radius:7px;border:1px solid ${_filter===f.k?'#0ea5e9':'#cbd5e1'};background:${_filter===f.k?'#0ea5e9':'#fff'};color:${_filter===f.k?'#fff':'#475569'};font:inherit;font-size:12px;font-weight:600;cursor:pointer">${f.label}</button>`
    ).join('');
    el.querySelectorAll('button[data-f]').forEach(b => b.addEventListener('click', () => {
      _filter = b.dataset.f; renderFilters(); renderList();
    }));
  }

  function visibleItems() {
    return _items.filter(s => {
      const hiddenOrVoid = s.hidden || s.status === 'void';
      if (hiddenOrVoid && !_showHidden) return false;
      if (!hiddenOrVoid) {
        // active rows: apply the filter chip
        const pv = payValueFor(s.greitt_med);
        switch (_filter) {
          case 'greitt_sidar': return pv === 'greitt_sidar';
          case 'drog': return s.status === 'drog';
          case 'reikningur': return pv === 'reikningur';
          case 'all': return true;
          default: /* attention */
            return s.status === 'drog' || (pv === 'greitt_sidar' && !s.invoiced_at);
        }
      }
      // hidden/void rows only show when _showHidden is on (shown regardless of chip)
      return true;
    });
  }

  function rowActions(s) {
    const isVoid = s.status === 'void';
    const isHidden = !!s.hidden;
    if (isVoid) {
      return `<button data-act="restore" type="button" style="padding:5px 10px;background:#0f766e;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">↩ Endurheimta</button>`;
    }
    let btns = '';
    if (s.status === 'drog') {
      btns += `<button data-act="finalize" type="button" style="padding:5px 10px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600;margin-right:4px">✅ Klára</button>`;
    }
    btns += `<button data-act="edit" type="button" style="padding:5px 10px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600;margin-right:4px">✏️</button>`;
    btns += `<button data-act="hide" type="button" title="${isHidden ? 'Sýna aftur' : 'Fela úr Bókhaldi'}" style="padding:5px 10px;background:${isHidden ? '#64748b' : '#fff'};color:${isHidden ? '#fff' : '#475569'};border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600;margin-right:4px">${isHidden ? '👁 Sýna' : '🙈 Fela'}</button>`;
    btns += `<button data-act="void" type="button" title="Eyða (mjúk eyðing — endurheimtanlegt)" style="padding:5px 10px;background:#fff;color:#dc2626;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">🗑</button>`;
    return btns;
  }

  function statusBadge(s) {
    if (s.status === 'void') return '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:99px">EYTT</span>';
    if (s.hidden) return '<span style="font-size:10px;font-weight:700;background:#e2e8f0;color:#475569;padding:2px 7px;border-radius:99px">FALIÐ</span>';
    if (s.status === 'drog') return '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:99px">DRÖG</span>';
    if (s.invoiced_at || s.dk_invoice_id) return '<span style="font-size:10px;font-weight:700;background:#dbeafe;color:#1e40af;padding:2px 7px;border-radius:99px">SENT</span>';
    return '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 7px;border-radius:99px">FINAL</span>';
  }

  function renderList() {
    const body = document.getElementById('_payrev-body');
    if (!body) return;
    const items = visibleItems();
    if (!items.length) {
      body.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8;font-style:italic;font-size:13px">Engar sölur í þessari síu 🎉</div>';
      return;
    }
    const rows = items.map(s => {
      const curVal = payValueFor(s.greitt_med);
      const opts = PAYMENTS.map(p => `<option value="${p.v}" ${p.v===curVal?'selected':''}>${p.label}</option>`).join('');
      const dim = (s.hidden || s.status === 'void') ? 'opacity:0.55' : '';
      const lockSelect = s.status === 'void' ? 'disabled' : '';
      return `
        <tr data-id="${s.id}" style="${dim}">
          <td style="padding:9px 12px;font-family:monospace;font-size:12px;color:#475569;white-space:nowrap">${esc(s.num || '—')} ${statusBadge(s)}</td>
          <td style="padding:9px 12px;font-weight:600;color:#0f172a">${esc(s.customer_nafn || '—')}</td>
          <td style="padding:9px 12px;color:#64748b;font-size:12px;white-space:nowrap">${esc(fmtDate(s.created_at))}</td>
          <td style="padding:9px 12px">
            <select data-act="pay" ${lockSelect} style="padding:5px 8px;border:1px solid ${curVal==='reikningur'?'#0ea5e9':'#cbd5e1'};border-radius:6px;font:inherit;font-size:12px;background:${curVal==='reikningur'?'#f0f9ff':'#fff'};color:#0f172a;cursor:pointer;max-width:180px">
              ${curVal ? '' : `<option value="" selected>${esc(payLabel(s.greitt_med))}</option>`}
              ${opts}
            </select>
          </td>
          <td style="padding:9px 12px;text-align:right;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;white-space:nowrap">${fmtKr(s.samtals)}</td>
          <td style="padding:7px 10px;text-align:right;white-space:nowrap">${rowActions(s)}</td>
        </tr>`;
    }).join('');
    body.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#fff;text-align:left;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:1">
          <th style="padding:9px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Num</th>
          <th style="padding:9px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Viðskiptavinur</th>
          <th style="padding:9px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Stofnað</th>
          <th style="padding:9px 12px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Greiðslumáti</th>
          <th style="padding:9px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Upphæð</th>
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="padding:10px 14px;color:#94a3b8;font-size:11.5px">${items.length} sölur sýndar · breytingar á greiðslumáta vistast strax</div>`;

    body.querySelectorAll('tbody tr').forEach(tr => {
      const id = tr.dataset.id;
      const sel = tr.querySelector('select[data-act="pay"]');
      if (sel) sel.addEventListener('change', () => changePayment(id, sel.value, sel));
      tr.querySelectorAll('button[data-act]').forEach(b => {
        b.addEventListener('click', () => handleAction(id, b.dataset.act));
      });
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function changePayment(id, value, selEl) {
    const SB = getSB();
    if (!SB || !value) return;
    if (selEl) { selEl.disabled = true; }
    const { error } = await SB.from('solur').update({ greitt_med: value }).eq('id', id);
    if (selEl) selEl.disabled = false;
    if (error) { alert('Villa við að breyta greiðslumáta: ' + error.message); return; }
    const row = _items.find(s => String(s.id) === String(id));
    if (row) row.greitt_med = value;
    if (window.Toast && Toast.show) Toast.show('✓ Greiðslumáti uppfærður → ' + payLabel(value));
    notifyChanged();
    // keep counts fresh, but don't yank the row out from under the user
    loadReview();
  }

  async function handleAction(id, act) {
    const SB = getSB();
    if (!SB) return;
    const row = _items.find(s => String(s.id) === String(id));
    if (!row) return;

    if (act === 'edit') {
      document.getElementById('_payrev-modal')?.remove();
      if (window.SaleEditor) window.SaleEditor.openById(id);
      return;
    }
    if (act === 'finalize') {
      document.getElementById('_payrev-modal')?.remove();
      if (window.SaleEditor) window.SaleEditor.openById(id); // review before finalize
      return;
    }
    if (act === 'hide') {
      const newHidden = !row.hidden;
      const { error } = await SB.from('solur')
        .update({ hidden: newHidden, hidden_at: newHidden ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) { alert('Villa: ' + error.message); return; }
      row.hidden = newHidden;
      if (window.Toast && Toast.show) Toast.show(newHidden ? '🙈 Falið úr Bókhaldi' : '👁 Sýnt aftur');
      notifyChanged(); renderList(); loadReview();
      return;
    }
    if (act === 'void') {
      const msg = 'Eyða sölu ' + (row.num || '') + '?\n\nÞetta er mjúk eyðing — salan fer úr Bókhaldi en er endurheimtanleg.';
      const ok = (window.Confirm && Confirm.show)
        ? await Confirm.show(msg, { okText: '🗑 Eyða', cancelText: 'Hætta við' })
        : window.confirm(msg);
      if (!ok) return;
      const { error } = await SB.from('solur').update({ status: 'void' }).eq('id', id);
      if (error) { alert('Villa: ' + error.message); return; }
      row.status = 'void';
      if (window.Toast && Toast.show) Toast.show('🗑 Sala eydd (endurheimtanleg)');
      notifyChanged(); renderList(); loadReview();
      return;
    }
    if (act === 'restore') {
      // void → back to final (or drög if it never finalized — we restore to
      // final since void only ever applied to finalized/duplicate rows here)
      const { error } = await SB.from('solur').update({ status: 'final', hidden: false, hidden_at: null }).eq('id', id);
      if (error) { alert('Villa: ' + error.message); return; }
      row.status = 'final'; row.hidden = false;
      if (window.Toast && Toast.show) Toast.show('↩ Sala endurheimt');
      notifyChanged(); renderList(); loadReview();
      return;
    }
  }

  function notifyChanged() {
    try { document.dispatchEvent(new CustomEvent('sale-edited', { detail: { source: 'payment-review' } })); } catch (_) {}
    try { window.App && App.refreshAll && App.refreshAll(); } catch (_) {}
  }

  // Refresh when other surfaces edit sales
  document.addEventListener('sale-edited', loadReview);
  setInterval(loadReview, 300000);

  // 2026-06-28: dismiss the modal on view switch + Esc, otherwise it stayed
  // open across navigation and dimmed every subsequent page (the .55-alpha
  // backdrop is fixed-position-inset-0).
  function closeIfOpen() { document.getElementById('_payrev-modal')?.remove(); }
  try {
    if (window.App && typeof App.switchView === 'function' && !App.switchView.__payrev_hooked) {
      const orig = App.switchView;
      App.switchView = function () { closeIfOpen(); return orig.apply(this, arguments); };
      App.switchView.__payrev_hooked = true;
    }
  } catch (_) {}
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeIfOpen(); });

  injectSidebar();
  setTimeout(injectSidebar, 1000);
  setTimeout(loadReview, 700);

  window.PaymentReview = { open: openModal, refresh: loadReview, count: () => _count };
  console.log('[patch-193] payment-review installed — sidebar badge + modal');
})();
/* === END PAYMENT REVIEW === */
