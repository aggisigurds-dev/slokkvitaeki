/* === ÞJÓNUSTUVERK v1 ===
 *
 * Lightweight CRM/case table for service-related work that doesn't fit a
 * verkbeiðni yet:
 *   • Customer wrote in asking to join service → paste their email
 *   • Prospect asked for a tilboð (e.g. 30 × ABC duft 6 kg) → run a quick
 *     calc with discount and reply with a price
 *   • Existing customer phoned about something to fix → log + follow up
 *
 * Each case carries:
 *   • Title + body (paste-friendly multiline)
 *   • Status (Ný / Í vinnslu / Lokið)
 *   • Optional linked customer — when set, shows the company's Mikilvægt
 *     flag + athugasemdir and gives a one-click jump to the company profile
 *   • Link chips — Gmail URL, R-000xxx sale ref, company id, unit serial,
 *     or any external https URL. Click jumps to the right place in the app
 *     (or opens the URL).
 *   • Tilbóð widget — pick products via VorurPicker, set qty + discount %,
 *     see the calculated price ex/incl VSK.
 *
 * Storage: AppSettings.path('thjonustuverk') = { cases: [...] }. Synced via
 * Supabase like the rest of AppSettings.
 *
 * Sidebar: "🛠 Þjónustuverk" entry sits right below Verkefni (patch 145).
 */
(() => {
  if (window.__thjonustuverkInstalled) return;
  window.__thjonustuverkInstalled = true;

  const VIEW_ID = 'view-thjonustuverk';
  const NAV_KEY = 'thjonustuverk';
  const STORAGE_KEY = 'thjonustuverk';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  function nowIso() { return new Date().toISOString(); }

  // ── State ───────────────────────────────────────────────────────────────
  let _state = { cases: [], filter: 'all' };
  function load() {
    const v = (window.AppSettings && AppSettings.path && AppSettings.path(STORAGE_KEY)) || {};
    _state.cases = Array.isArray(v.cases) ? v.cases : [];
  }
  async function save() {
    if (!window.AppSettings || !AppSettings.save) return false;
    return await AppSettings.save({ [STORAGE_KEY]: { cases: _state.cases } });
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    // Anchor after Verkefni (patch 145).
    const verkBtn = Array.from(nav.querySelectorAll('.vnav-btn'))
      .find(b => /Verkefni/i.test(b.textContent || ''));
    const tpl = verkBtn || nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">🛠</span>Þjónustuverk' +
      ' <span class="tv-badge" style="margin-left:auto;background:#7c3aed;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px;display:none"></span>';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    if (verkBtn && verkBtn.parentNode) verkBtn.parentNode.insertBefore(btn, verkBtn.nextSibling);
    else nav.appendChild(btn);
  }

  // ── View container ───────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="tv-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitchView() {
    if (!window.App || window.App._tvSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        render();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._tvSwitchPatched = true;
  }

  // ── Status helpers ───────────────────────────────────────────────────────
  const STATUSES = [
    { v: 'ny',         label: 'Ný',         color: '#1d4ed8', bg: '#dbeafe' },
    { v: 'i_vinnslu',  label: 'Í vinnslu',  color: '#92400e', bg: '#fef3c7' },
    { v: 'lokid',      label: 'Lokið',      color: '#166534', bg: '#dcfce7' }
  ];
  function statusBadge(s) {
    const def = STATUSES.find(x => x.v === s) || STATUSES[0];
    return '<span style="font-size:10px;font-weight:700;background:' + def.bg + ';color:' + def.color + ';padding:2px 8px;border-radius:99px">' + def.label + '</span>';
  }

  // ── Link chip helpers ────────────────────────────────────────────────────
  // Each link: { type, value, label }
  //   type='url'      → external URL, open in new tab
  //   type='gmail'    → email URL (mail.google.com or mailto:) → new tab
  //   type='sale'     → sale by num (e.g. R-000123) → opens invoice via SalaInvoice
  //   type='company'  → company id → jumps to company profile
  //   type='unit'     → uttaeki id → opens UnitDetail
  function classifyLink(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (/mail\.google\.com|^mailto:/.test(s)) return { type: 'gmail', value: s, label: 'Gmail þráður' };
    if (/^R-\d{4,}/.test(s)) return { type: 'sale', value: s.toUpperCase(), label: s.toUpperCase() };
    if (/^https?:/.test(s))  return { type: 'url', value: s, label: s.length > 40 ? s.slice(0, 40) + '…' : s };
    // Numeric id → ambiguous. Default to URL of the entered string itself.
    return { type: 'url', value: s, label: s };
  }
  async function followLink(link) {
    if (!link) return;
    if (link.type === 'gmail' || link.type === 'url') {
      window.open(link.value, '_blank', 'noopener');
      return;
    }
    if (link.type === 'sale') {
      const SB = getSB();
      if (!SB) return;
      const r = await SB.from('solur').select('id').eq('num', link.value).maybeSingle();
      if (r.data && window.SalaInvoice && SalaInvoice.renderFromSale) {
        const sr = await SB.from('solur').select('*').eq('id', r.data.id).single();
        if (sr.data) {
          const w = window.open('', '_blank', 'width=900,height=1100');
          if (w) SalaInvoice.renderFromSale(w, sr.data, null);
        }
      } else alert('Salan fannst ekki: ' + link.value);
      return;
    }
    if (link.type === 'company' && link.value) {
      if (window._openCompanySafe) window._openCompanySafe(+link.value);
      else if (window.Companies && Companies.openDetail) Companies.openDetail(+link.value);
      return;
    }
    if (link.type === 'unit' && link.value) {
      if (window.UnitDetail && UnitDetail.open) UnitDetail.open(+link.value, 'uttaeki');
      return;
    }
  }
  function linkChip(link, removable, onRemove) {
    const icons = { gmail: '📧', sale: '🧾', company: '🏢', unit: '🧯', url: '🔗' };
    const colors = { gmail: '#b91c1c', sale: '#1d4ed8', company: '#16a34a', unit: '#92400e', url: '#475569' };
    const ic = icons[link.type] || '🔗';
    const col = colors[link.type] || '#475569';
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:#fff;border:1px solid #cbd5e1;border-radius:99px;padding:3px 10px;font-size:11px;color:' + col + ';font-weight:600;margin:2px 4px 2px 0;cursor:pointer;max-width:260px';
    wrap.innerHTML = ic + ' <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">' + esc(link.label) + '</span>';
    wrap.addEventListener('click', e => {
      if (e.target.closest('._tv-link-rm')) return;
      followLink(link);
    });
    if (removable) {
      const rm = document.createElement('button');
      rm.className = '_tv-link-rm';
      rm.type = 'button';
      rm.textContent = '×';
      rm.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 0 0 2px;line-height:1';
      rm.addEventListener('click', e => { e.stopPropagation(); onRemove(); });
      wrap.appendChild(rm);
    }
    return wrap;
  }

  // ── Tilbóð calc ──────────────────────────────────────────────────────────
  function computeTilbod(t) {
    if (!t || !Array.isArray(t.items) || !t.items.length) return { ex: 0, vsk: 0, total: 0, discountEx: 0 };
    let raw = 0, vsk = 0;
    t.items.forEach(it => {
      const lineEx = (+it.qty || 0) * (+it.unit_price_ex_vat || 0);
      raw += lineEx;
      vsk += lineEx * ((+it.vsk_pct || 24) / 100);
    });
    const pct = Math.max(0, Math.min(100, +t.discount_pct || 0));
    const discountEx = raw * pct / 100;
    const ex = Math.max(0, raw - discountEx);
    const factor = raw > 0 ? ex / raw : 1;
    const vskAfter = vsk * factor;
    return { ex, vsk: vskAfter, total: ex + vskAfter, discountEx, raw };
  }

  // ── Render the case list ────────────────────────────────────────────────
  function render() {
    const main = document.getElementById('tv-main');
    if (!main) return;

    let cases = _state.cases.slice().sort((a, b) =>
      (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '')
    );
    const filter = _state.filter;
    const filtered = filter === 'all' ? cases : cases.filter(c => c.status === filter);

    const counts = {
      all: cases.length,
      ny: cases.filter(c => c.status === 'ny').length,
      i_vinnslu: cases.filter(c => c.status === 'i_vinnslu').length,
      lokid: cases.filter(c => c.status === 'lokid').length
    };

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:22px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">🛠 Þjónustuverk</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">Tilboð, fyrirspurnir og póstar sem þarf að fylgja eftir</div>
          </div>
          <button id="_tv-new" type="button" style="padding:9px 16px;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">+ Nýtt mál</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          ${[
            ['all', 'Allt', counts.all],
            ['ny', 'Ný', counts.ny],
            ['i_vinnslu', 'Í vinnslu', counts.i_vinnslu],
            ['lokid', 'Lokið', counts.lokid]
          ].map(([k, lbl, n]) => {
            const on = filter === k;
            return '<button class="_tv-chip" data-k="' + k + '" type="button" ' +
              'style="padding:6px 12px;border:1px solid ' + (on ? '#0f172a' : '#cbd5e1') +
              ';background:' + (on ? '#0f172a' : '#fff') + ';color:' + (on ? '#fff' : '#475569') +
              ';border-radius:99px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">' +
              esc(lbl) + ' <span style="opacity:.65;font-weight:500">' + n + '</span></button>';
          }).join('')}
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          ${filtered.length ? filtered.map(rowHtml).join('') :
            '<div style="padding:40px;text-align:center;color:#94a3b8;font-style:italic">' +
              (filter === 'all' ? 'Engin mál enn — smelltu „+ Nýtt mál" til að byrja.' : 'Engin mál með þessa stöðu.') +
            '</div>'}
        </div>
      </div>`;

    main.querySelector('#_tv-new').addEventListener('click', () => openEditor(null));
    main.querySelectorAll('._tv-chip').forEach(c => c.addEventListener('click', () => {
      _state.filter = c.dataset.k; render();
    }));
    main.querySelectorAll('._tv-row').forEach(r => r.addEventListener('click', e => {
      if (e.target.closest('._tv-del')) return;
      const id = r.dataset.id;
      openEditor(_state.cases.find(c => c.id === id));
    }));
    main.querySelectorAll('._tv-del').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = b.dataset.id;
      const c = _state.cases.find(x => x.id === id);
      if (!c) return;
      if (!confirm('Eyða „' + (c.title || 'máli') + '"?')) return;
      _state.cases = _state.cases.filter(x => x.id !== id);
      const ok = await save();
      if (ok) { if (window.Toast && Toast.show) Toast.show('🗑 Mál eytt'); render(); refreshBadge(); }
    }));

    refreshBadge();
  }

  function rowHtml(c) {
    const t = computeTilbod(c.tilbod);
    const tilbodChip = t.total > 0
      ? '<span style="font-size:11px;background:#ede9fe;color:#6b21a8;padding:2px 8px;border-radius:99px;font-weight:700">💰 ' + fmtKr(t.total) + '</span>'
      : '';
    const linksN = Array.isArray(c.links) ? c.links.length : 0;
    const linksChip = linksN > 0
      ? '<span style="font-size:11px;background:#f1f5f9;color:#475569;padding:2px 7px;border-radius:99px;font-weight:600">🔗 ' + linksN + '</span>'
      : '';
    const custLabel = c.customer_nafn
      ? '<span style="color:#0f172a;font-weight:600">' + esc(c.customer_nafn) + '</span>'
      : '<span style="color:#94a3b8;font-style:italic">— (engin tenging)</span>';
    return `<div class="_tv-row" data-id="${esc(c.id)}" style="display:grid;grid-template-columns:90px 1fr 220px 110px 90px 40px;gap:12px;padding:11px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;align-items:center;font-size:13px" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <div style="color:#64748b;font-size:11.5px">${esc(fmtDate(c.updated_at || c.created_at))}</div>
        <div style="min-width:0">
          <div style="font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.title || '(án titils)')}</div>
          <div style="font-size:11px;color:#64748b;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((c.body || '').slice(0, 90))}</div>
        </div>
        <div>${custLabel}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${tilbodChip}${linksChip}</div>
        <div>${statusBadge(c.status || 'ny')}</div>
        <button class="_tv-del" data-id="${esc(c.id)}" type="button" title="Eyða" style="background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:18px;padding:0 4px;line-height:1">×</button>
      </div>`;
  }

  // ── Editor modal ─────────────────────────────────────────────────────────
  function openEditor(existing) {
    document.getElementById('_tv-editor')?.remove();
    const c = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: uid(), title: '', body: '', status: 'ny',
      customer_id: null, customer_nafn: '',
      links: [],
      tilbod: { items: [], discount_pct: 0 },
      created_at: nowIso(), updated_at: nowIso()
    };
    const dlg = document.createElement('div');
    dlg.id = '_tv-editor';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100070;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;padding:18px';
    dlg.innerHTML = '' +
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.4);width:min(780px,calc(100vw - 32px));max-height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#6b21a8,#7c3aed);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h2 style="margin:0;font-size:16px;font-weight:700">🛠 ' + (existing ? 'Breyta máli' : 'Nýtt þjónustuverk') + '</h2>' +
            '<div style="font-size:11px;color:#e9d5ff;margin-top:2px">Bæta við punktum, fyrirspurnum, tilbóði eða athugasemdum.</div>' +
          '</div>' +
          '<button id="_tv-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:16px;line-height:1">✕</button>' +
        '</div>' +
        '<div id="_tv-body" style="flex:1;overflow-y:auto;padding:18px 22px;background:#fff"></div>' +
        '<div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px;background:#f8fafc">' +
          '<button id="_tv-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_tv-save" type="button" style="padding:8px 18px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">💾 Vista</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });
    dlg.querySelector('#_tv-x').addEventListener('click', () => dlg.remove());
    dlg.querySelector('#_tv-cancel').addEventListener('click', () => dlg.remove());
    dlg.querySelector('#_tv-save').addEventListener('click', async () => {
      c.updated_at = nowIso();
      const idx = _state.cases.findIndex(x => x.id === c.id);
      if (idx >= 0) _state.cases[idx] = c; else _state.cases.push(c);
      const ok = await save();
      if (!ok) { alert('Vista mistókst'); return; }
      if (window.Toast && Toast.show) Toast.show('✓ Vistað');
      dlg.remove();
      render();
    });
    renderEditorBody(c);
  }

  function renderEditorBody(c) {
    const body = document.getElementById('_tv-body');
    if (!body) return;
    const t = computeTilbod(c.tilbod);
    body.innerHTML = '' +
      // Title
      '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Titill</label>' +
      '<input id="_tv-title" type="text" value="' + esc(c.title || '') + '" placeholder="t.d. Höldur fyrirspurn — 30× duft 6 kg" ' +
        'style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;box-sizing:border-box;margin-bottom:14px">' +

      // Body / notes
      '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Athugasemd / pósturinn</label>' +
      '<textarea id="_tv-body-txt" rows="5" placeholder="Límdu inn pósti eða skrifaðu punkta…" ' +
        'style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;line-height:1.45;resize:vertical;box-sizing:border-box;margin-bottom:14px">' + esc(c.body || '') + '</textarea>' +

      // Customer link section
      '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 14px;margin-bottom:14px">' +
        '<div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">🏢 Tengjast viðskiptavini</div>' +
        '<div id="_tv-cust-row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"></div>' +
        '<div id="_tv-cust-info" style="margin-top:8px"></div>' +
      '</div>' +

      // Links chips
      '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">🔗 Tenglar</label>' +
      '<div id="_tv-links" style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;min-height:42px;margin-bottom:6px"></div>' +
      '<div style="display:flex;gap:6px;margin-bottom:14px">' +
        '<input id="_tv-link-inp" type="text" placeholder="Límdu inn Gmail URL, R-000xxx, eða vefslóð…" ' +
          'style="flex:1;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12.5px">' +
        '<button id="_tv-link-add" type="button" style="padding:7px 14px;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">Bæta við</button>' +
      '</div>' +

      // Tilbóð
      '<div style="background:#ede9fe;border:1px solid #c4b5fd;border-radius:8px;padding:12px 14px;margin-bottom:14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="font-size:11px;font-weight:700;color:#6b21a8;text-transform:uppercase;letter-spacing:.04em">💰 Tilbóð (valkvætt)</div>' +
          '<button id="_tv-tilbod-add" type="button" style="padding:5px 11px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">+ Bæta vöru</button>' +
        '</div>' +
        '<div id="_tv-tilbod-items"></div>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-top:8px">' +
          '<label style="font-size:12px;color:#6b21a8;font-weight:600">Afsláttur:</label>' +
          '<input id="_tv-tilbod-pct" type="number" min="0" max="100" step="1" value="' + (c.tilbod && c.tilbod.discount_pct || 0) + '" style="width:60px;padding:5px 8px;border:1px solid #c4b5fd;border-radius:5px;font:inherit;font-size:12px;text-align:center"> %' +
          '<div id="_tv-tilbod-total" style="margin-left:auto;font-weight:800;color:#6b21a8;font-size:14px">' + fmtKr(t.total) + '</div>' +
        '</div>' +
      '</div>' +

      // Status
      '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Staða</label>' +
      '<select id="_tv-status" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;background:#fff">' +
        STATUSES.map(s => '<option value="' + s.v + '"' + (c.status === s.v ? ' selected' : '') + '>' + s.label + '</option>').join('') +
      '</select>';

    // Wire inputs
    body.querySelector('#_tv-title').addEventListener('input', e => { c.title = e.target.value; });
    body.querySelector('#_tv-body-txt').addEventListener('input', e => { c.body = e.target.value; });
    body.querySelector('#_tv-status').addEventListener('change', e => { c.status = e.target.value; });

    // Customer row
    function renderCustRow() {
      const row = body.querySelector('#_tv-cust-row');
      const info = body.querySelector('#_tv-cust-info');
      if (!row || !info) return;
      if (c.customer_id) {
        row.innerHTML =
          '<div style="font-weight:700;color:#0f172a;font-size:14px">' + esc(c.customer_nafn || '—') + '</div>' +
          '<button id="_tv-cust-open" type="button" style="padding:5px 10px;background:#fff;border:1px solid #86efac;color:#166534;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">↗ Opna spjald</button>' +
          '<button id="_tv-cust-mik" type="button" style="padding:5px 10px;background:#fff;border:1px solid #fde68a;color:#92400e;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">⚠ Mikilvægt</button>' +
          '<button id="_tv-cust-clear" type="button" style="padding:5px 10px;background:#fff;border:1px solid #cbd5e1;color:#64748b;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px">Aftengja</button>';
        body.querySelector('#_tv-cust-open').addEventListener('click', () => {
          if (window._openCompanySafe) window._openCompanySafe(c.customer_id);
          else if (window.Companies && Companies.openDetail) Companies.openDetail(c.customer_id);
        });
        body.querySelector('#_tv-cust-mik').addEventListener('click', async () => {
          if (window.toggleImportant) await window.toggleImportant(c.customer_id);
          else {
            // Inline fallback — flip the AppSettings list directly
            const list = (window.AppSettings && AppSettings.path('tilkynningar.important_company_ids')) || [];
            const s = new Set(list); s.has(c.customer_id) ? s.delete(c.customer_id) : s.add(c.customer_id);
            await AppSettings.save({ tilkynningar: { important_company_ids: Array.from(s) } });
          }
          renderCustInfo();
        });
        body.querySelector('#_tv-cust-clear').addEventListener('click', () => {
          c.customer_id = null; c.customer_nafn = '';
          renderCustRow(); renderCustInfo();
        });
        renderCustInfo();
      } else {
        row.innerHTML =
          '<input id="_tv-cust-search" type="text" placeholder="Leita að fyrirtæki eða viðskiptavini…" ' +
            'style="flex:1;padding:7px 10px;border:1px solid #86efac;border-radius:6px;font:inherit;font-size:13px;min-width:220px">' +
          '<div id="_tv-cust-results" style="width:100%;max-height:0;overflow:hidden"></div>';
        const inp = body.querySelector('#_tv-cust-search');
        let timer;
        inp.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(() => runCustSearch(inp.value.trim()), 220);
        });
        info.innerHTML = '';
      }
    }
    async function runCustSearch(q) {
      const out = body.querySelector('#_tv-cust-results');
      if (!out) return;
      if (q.length < 2) { out.innerHTML = ''; out.style.maxHeight = '0'; return; }
      const SB = getSB();
      if (!SB) return;
      const [fy, vi] = await Promise.all([
        SB.from('fyrirtaeki').select('id,nafn,kennitala').ilike('nafn', '%' + q + '%').limit(6),
        SB.from('vidskiptavinir').select('id,nafn,kennitala').ilike('nafn', '%' + q + '%').limit(6)
      ]);
      const fyList = (fy.data || []).map(x => ({ ...x, src: 'fyrirtaeki' }));
      const viList = (vi.data || []).map(x => ({ ...x, src: 'vidskiptavinir' }));
      const all = fyList.concat(viList);
      if (!all.length) { out.innerHTML = '<div style="padding:10px;color:#94a3b8;font-style:italic;font-size:12px">Engin samsvörun</div>'; out.style.maxHeight = '120px'; return; }
      out.style.maxHeight = '260px';
      out.style.overflow = 'auto';
      out.style.marginTop = '6px';
      out.innerHTML = all.map((p, i) => {
        const badge = p.src === 'fyrirtaeki'
          ? '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">B2B</span>'
          : '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">Vsk.</span>';
        return '<div class="_tv-cust-hit" data-i="' + i + '" style="padding:8px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:4px;cursor:pointer;font-size:12.5px" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'#fff\'">' +
          '<strong>' + esc(p.nafn) + '</strong>' + badge +
          (p.kennitala ? '<div style="font-size:10.5px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ' + esc(p.kennitala) + '</div>' : '') +
        '</div>';
      }).join('');
      out.querySelectorAll('._tv-cust-hit').forEach(el => {
        el.addEventListener('click', () => {
          const p = all[+el.dataset.i];
          c.customer_id = p.id;
          c.customer_nafn = p.nafn;
          c.customer_source = p.src;
          renderCustRow();
        });
      });
    }
    async function renderCustInfo() {
      const info = body.querySelector('#_tv-cust-info');
      if (!info || !c.customer_id) return;
      const SB = getSB();
      if (!SB) return;
      const src = c.customer_source === 'vidskiptavinir' ? 'vidskiptavinir' : 'fyrirtaeki';
      const r = await SB.from(src).select('kennitala,simi,heimilisfang,athugasemdir').eq('id', c.customer_id).maybeSingle();
      const isImp = (window.isImportant && window.isImportant(c.customer_id)) ||
                    ((window.AppSettings && AppSettings.path('tilkynningar.important_company_ids')) || []).map(Number).indexOf(+c.customer_id) >= 0;
      const meta = r && r.data || {};
      info.innerHTML = '' +
        (isImp ? '<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;margin-bottom:6px;font-size:12px;font-weight:700;color:#92400e">⚠ Mikilvægt fyrirtæki</div>' : '') +
        '<div style="font-size:11.5px;color:#475569;line-height:1.55">' +
          (meta.kennitala ? 'kt. ' + esc(meta.kennitala) : '') +
          (meta.simi ? ' · 📞 ' + esc(meta.simi) : '') +
          (meta.heimilisfang ? '<br>📍 ' + esc(meta.heimilisfang) : '') +
        '</div>' +
        (meta.athugasemdir ? '<div style="margin-top:6px;padding:6px 10px;background:#fff;border:1px dashed #86efac;border-radius:5px;font-size:12px;color:#0f172a;white-space:pre-wrap">📝 ' + esc(meta.athugasemdir) + '</div>' : '');
    }
    renderCustRow();

    // Links
    function renderLinks() {
      const wrap = body.querySelector('#_tv-links');
      if (!wrap) return;
      wrap.innerHTML = '';
      if (!Array.isArray(c.links) || !c.links.length) {
        wrap.innerHTML = '<span style="font-size:11px;color:#94a3b8;font-style:italic;padding:4px 8px">Engir tenglar — límdu inn URL eða R-000xxx fyrir neðan</span>';
        return;
      }
      c.links.forEach((link, i) => {
        wrap.appendChild(linkChip(link, true, () => { c.links.splice(i, 1); renderLinks(); }));
      });
    }
    renderLinks();
    body.querySelector('#_tv-link-add').addEventListener('click', () => {
      const inp = body.querySelector('#_tv-link-inp');
      const link = classifyLink(inp.value);
      if (!link) { inp.focus(); return; }
      c.links = Array.isArray(c.links) ? c.links : [];
      c.links.push(link);
      inp.value = '';
      renderLinks();
    });
    body.querySelector('#_tv-link-inp').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); body.querySelector('#_tv-link-add').click(); }
    });

    // Tilbóð items
    if (!c.tilbod) c.tilbod = { items: [], discount_pct: 0 };
    function renderTilbod() {
      const itemsEl = body.querySelector('#_tv-tilbod-items');
      const totalEl = body.querySelector('#_tv-tilbod-total');
      if (!itemsEl || !totalEl) return;
      if (!c.tilbod.items.length) {
        itemsEl.innerHTML = '<div style="font-size:11.5px;color:#7c3aed;font-style:italic;padding:6px 0">Engar vörur — smelltu „+ Bæta vöru" til að byrja.</div>';
      } else {
        itemsEl.innerHTML = c.tilbod.items.map((it, i) =>
          '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-top:1px dashed #c4b5fd">' +
            '<div style="flex:1;font-size:12.5px;color:#0f172a">' + esc(it.name || 'Vara') + '</div>' +
            '<input class="_tv-tb-qty" data-i="' + i + '" type="number" min="0" step="1" value="' + (+it.qty || 0) + '" title="Magn" style="width:56px;padding:4px 6px;border:1px solid #c4b5fd;border-radius:4px;font:inherit;font-size:11.5px;text-align:center;background:#fff">' +
            '<span style="color:#7c3aed;font-size:11px">×</span>' +
            '<input class="_tv-tb-pr" data-i="' + i + '" type="number" min="0" step="1" value="' + Math.round(+it.unit_price_ex_vat || 0) + '" title="Verð án vsk" style="width:80px;padding:4px 6px;border:1px solid #c4b5fd;border-radius:4px;font:inherit;font-size:11.5px;text-align:right;background:#fff"> kr' +
            '<button class="_tv-tb-rm" data-i="' + i + '" type="button" title="Eyða" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 3px;line-height:1">×</button>' +
          '</div>'
        ).join('');
      }
      const t = computeTilbod(c.tilbod);
      totalEl.innerHTML =
        '<span style="font-size:10.5px;color:#7c3aed;font-weight:600;margin-right:6px">Án vsk: ' + fmtKr(t.ex) + ' · VSK: ' + fmtKr(t.vsk) + '</span>' +
        '<span style="font-size:14px">' + fmtKr(t.total) + '</span>';
      itemsEl.querySelectorAll('._tv-tb-qty').forEach(inp => inp.addEventListener('input', () => {
        c.tilbod.items[+inp.dataset.i].qty = Math.max(0, parseInt(inp.value, 10) || 0);
        const t = computeTilbod(c.tilbod);
        totalEl.innerHTML = '<span style="font-size:10.5px;color:#7c3aed;font-weight:600;margin-right:6px">Án vsk: ' + fmtKr(t.ex) + ' · VSK: ' + fmtKr(t.vsk) + '</span><span style="font-size:14px">' + fmtKr(t.total) + '</span>';
      }));
      itemsEl.querySelectorAll('._tv-tb-pr').forEach(inp => inp.addEventListener('input', () => {
        c.tilbod.items[+inp.dataset.i].unit_price_ex_vat = Math.max(0, parseFloat(inp.value) || 0);
        const t = computeTilbod(c.tilbod);
        totalEl.innerHTML = '<span style="font-size:10.5px;color:#7c3aed;font-weight:600;margin-right:6px">Án vsk: ' + fmtKr(t.ex) + ' · VSK: ' + fmtKr(t.vsk) + '</span><span style="font-size:14px">' + fmtKr(t.total) + '</span>';
      }));
      itemsEl.querySelectorAll('._tv-tb-rm').forEach(b => b.addEventListener('click', () => {
        c.tilbod.items.splice(+b.dataset.i, 1);
        renderTilbod();
      }));
    }
    renderTilbod();
    body.querySelector('#_tv-tilbod-add').addEventListener('click', () => {
      if (!window.VorurPicker || !VorurPicker.open) { alert('Vörulistinn ekki tiltækur.'); return; }
      VorurPicker.open(p => {
        if (!p) return;
        c.tilbod.items.push({
          product_id: p.id, name: p.nafn,
          qty: 1, unit_price_ex_vat: +p.verd_an_vsk || 0, vsk_pct: +p.vsk_prosenta || 24
        });
        renderTilbod();
      });
    });
    body.querySelector('#_tv-tilbod-pct').addEventListener('input', e => {
      c.tilbod.discount_pct = Math.max(0, Math.min(100, +e.target.value || 0));
      renderTilbod();
    });
  }

  // ── Sidebar badge ───────────────────────────────────────────────────────
  function refreshBadge() {
    const btn = document.querySelector('.vnav-btn[data-view="' + NAV_KEY + '"]');
    if (!btn) return;
    const badge = btn.querySelector('.tv-badge');
    if (!badge) return;
    const n = _state.cases.filter(c => c.status !== 'lokid').length;
    if (n > 0) { badge.textContent = String(n); badge.style.display = ''; }
    else badge.style.display = 'none';
  }

  function show() {
    ensureView();
    if (window.App && App.switchView) App.switchView(NAV_KEY);
    else { load(); render(); }
  }

  injectNav();
  setTimeout(injectNav, 1000);
  ensureView();
  patchSwitchView();
  setTimeout(() => { load(); refreshBadge(); }, 2000);

  window.Thjonustuverk = { show, open: show };
  console.log('[patch-172] Þjónustuverk ready');
})();
/* === END ÞJÓNUSTUVERK === */
