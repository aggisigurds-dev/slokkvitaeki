/* === SAMNINGSHAFAR RECEIVE v1 ===
 *
 * Adds a "📥 Sækja inn úr fyrirtæki" button at the top of the Samningshafar
 * column in Verkstæði. Click → modal that lets you:
 *   1. Search for a service-contract company (or any fyrirtæki)
 *   2. See all of that company's active uttaeki (field equipment)
 *   3. Tick which units the driver brought in (default: all checked)
 *   4. Pick a service type per row (Hleðsla / Skoðun / Viðgerð)
 *   5. Click "Stofna verk" → creates ONE verkbeiðni with a verklidur for
 *      each selected uttaeki. Each verklidur stores `uttaeki_id` so when
 *      the work is finished (patch 121 pickup checkout) we can auto-update
 *      uttaeki.next_insp +12 months and last_insp = today.
 *
 * The verkbeiðni then flows through the normal workshop pipeline (mark
 * done/broken, Sótt ✓, pickup checkout, invoice, kreditreikningur).
 *
 * Requires SQL: sql/verklidur_uttaeki_link.sql (adds uttaeki_id column).
 * Without it, INSERT fails and we fall back to no link (12-mo update
 * skipped at pickup, but flow still works).
 */
(() => {
  if (window.__samningshafarReceiveInstalled) return;
  window.__samningshafarReceiveInstalled = true;

  const SERVICE_TYPES = ['Hleðsla', 'Skoðun', 'Viðgerð', 'Hleðsla + Skoðun'];

  function getSB() { return (window.DB && window.DB.sb) || null; }

  // ── Price lookup ────────────────────────────────────────────────────────
  // For a given (service, type, size) combo, return a list of `vorur` rows
  // whose nafn matches all parts. Service is split on "+" so "Hleðsla + Skoðun"
  // resolves to two separate vorur entries (Hleðsla + Yfirferð).
  let _vorurCache = null;
  async function loadVorur() {
    if (_vorurCache) return _vorurCache;
    const SB = getSB();
    if (!SB) return [];
    const r = await SB.from('vorur').select('id,nafn,verd_an_vsk,vsk_prosenta').eq('virkt', true);
    _vorurCache = r.data || [];
    return _vorurCache;
  }
  function typeKeyword(type) {
    const t = String(type || '').toLowerCase();
    if (t.includes('duft')) return 'duft';
    if (t.includes('co')) return 'co';   // matches "CO₂", "co2"
    if (t.includes('léttvatn') || t.includes('vatn')) return 'vatn';
    if (t.includes('fro')) return 'fro';
    if (t.includes('blautt') || t.includes('abf')) return 'abf';
    return '';
  }
  function sizeKeyword(size) {
    // "6 kg" → "6", "100 gr" → "100", "6 L" → "6"
    const m = String(size || '').match(/(\d+)/);
    return m ? m[1] : '';
  }
  function serviceKeywords(service) {
    // Split combined services on "+" or "&"; map to canonical search terms.
    return String(service || '').split(/[+&]/).map(s => {
      const v = s.trim().toLowerCase();
      if (v.startsWith('hleðsla')) return 'hleðsla';
      if (v.startsWith('skoðun') || v.startsWith('yfirferð')) return 'yfirferð';
      if (v.startsWith('viðgerð')) return 'viðgerð';
      return v;
    }).filter(Boolean);
  }
  // Find one vorur row best matching all keyword filters. Returns null if no match.
  function bestMatch(vorur, svcKey, typeKey, sizeKey) {
    const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ');
    const candidates = vorur.filter(v => {
      const n = norm(v.nafn);
      if (svcKey && !n.includes(svcKey)) return false;
      if (typeKey && !n.includes(typeKey)) return false;
      if (sizeKey && !n.includes(sizeKey)) return false;
      return true;
    });
    return candidates[0] || null;
  }
  // Look up company-specific price override (patch 113 — Tilboðsverð on
  // company profile). Returns the override row {name, price_ex_vat, vsk_pct}
  // or null if none matches.
  function findCompanyPriceOverride(coId, productName) {
    if (!coId || !window.CompanyPricing || typeof CompanyPricing.list !== 'function') return null;
    const overrides = CompanyPricing.list(coId) || [];
    if (!overrides.length) return null;
    const d = String(productName || '').toLowerCase();
    let best = null;
    overrides.forEach(o => {
      const n = String(o.name || '').toLowerCase().trim();
      if (!n) return;
      if (d.indexOf(n) >= 0 || n.indexOf(d) >= 0) {
        if (!best || n.length > String(best.name).length) best = o;
      }
    });
    return best;
  }

  // Build aggregated solur.linur from picked unitState. Each verklidur becomes
  // 1+ solur lines (one per atomic service in its service string). Lines
  // with the same product are merged by qty. Company-specific Tilboðsverð
  // (patch 113) is applied automatically when a company has an override
  // matching the catalog product name (e.g. Hagvagnar with custom hleðsla
  // price gets that price instead of the standard catalog price).
  async function buildLinurFromPicked(picked, companyId) {
    const vorur = await loadVorur();
    const byProduct = new Map(); // key = vorur.id, value = { id, desc, qty, unit_price_ex_vat, vsk_pct, ... }
    const unmatched = [];
    let overrideCount = 0;
    for (const s of picked) {
      const u = s.u;
      const tKey = typeKeyword(u.type);
      const zKey = sizeKeyword(u.size);
      const services = serviceKeywords(s.service);
      for (const svcKey of services) {
        const v = bestMatch(vorur, svcKey, tKey, zKey);
        if (!v) { unmatched.push({ unit: u.serial, service: s.service }); continue; }
        const k = v.id;
        if (!byProduct.has(k)) {
          // Check for company-specific Tilboðsverð override on this product
          const override = findCompanyPriceOverride(companyId, v.nafn);
          if (override) overrideCount++;
          byProduct.set(k, {
            product_id: v.id,
            desc: v.nafn,
            qty: 0,
            unit_price_ex_vat: override ? (+override.price_ex_vat || 0) : (+v.verd_an_vsk || 0),
            vsk_pct: override && override.vsk_pct != null ? +override.vsk_pct : (+v.vsk_prosenta || 24),
            type: 'service',
            isOverride: !!override                  // flag so UI can show 💰 badge
          });
        }
        byProduct.get(k).qty += 1;
      }
    }
    return { linur: Array.from(byProduct.values()), unmatched, overrideCount };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  // ── Inject "Sækja inn" button into Samningshafar column header ───────────
  function injectButton() {
    const view = document.getElementById('view-workshop');
    if (!view || !view.classList.contains('active')) return;
    // Find the Samningshafar column by its title text
    const titles = view.querySelectorAll('div[style*="text-transform:uppercase"]');
    let header = null;
    titles.forEach(t => {
      if ((t.textContent || '').trim() === 'Samningshafar') header = t;
    });
    if (!header) return;
    const colHd = header.parentElement;
    if (!colHd || colHd.querySelector('._sr-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = '_sr-btn';
    btn.textContent = '📥 Sækja inn úr fyrirtæki';
    btn.style.cssText =
      'margin-top:8px;padding:6px 12px;background:#0d6efd;color:#fff;border:none;' +
      'border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;width:100%';
    btn.addEventListener('click', openReceiveModal);
    colHd.appendChild(btn);
  }

  // Watch the workshop view for the column being rendered (patch 78
  // re-renders on every Workshop.render call).
  function attach() {
    const view = document.getElementById('view-workshop');
    if (!view) { setTimeout(attach, 800); return; }
    new MutationObserver(() => {
      // Only act when active to avoid background CPU
      if (view.classList.contains('active')) injectButton();
    }).observe(view, { childList: true, subtree: true });
    // Also try on view-shown
    document.addEventListener('view-shown', e => {
      if (e && e.detail && e.detail.name === 'workshop') setTimeout(injectButton, 200);
    });
    setTimeout(injectButton, 1500);
  }
  attach();

  // ── Modal state ──────────────────────────────────────────────────────────
  let _companies = [];
  let _selectedCompany = null;
  let _units = [];        // [{u: uttaekiRow, checked: bool, service: 'Hleðsla'}]
  let _searchQuery = '';

  // ── Open ─────────────────────────────────────────────────────────────────
  async function openReceiveModal() {
    _selectedCompany = null;
    _units = [];
    _searchQuery = '';
    await loadCompanies();
    renderModal();
  }

  async function loadCompanies() {
    const SB = getSB();
    if (!SB) { _companies = []; return; }
    // Pull all companies — search lives client-side. Service-contract holders
    // are highlighted but the user can pick any company. fyrirtaeki has the
    // same shape as vidskiptavinir for our purposes here.
    // 2026-06-10: page through fyrirtaeki — there are >1000 rows and Supabase
    // caps a single select at 1000, so without paging the alphabetically-late
    // companies (e.g. "Test fyrirtæki") were silently missing from the picker.
    async function fetchAllCompanies() {
      const out = [];
      const PAGE = 1000;
      for (let from = 0; from < 20000; from += PAGE) {
        const r = await SB.from('fyrirtaeki')
          .select('id,nafn,kennitala,simi,heimilisfang,deleted_at')
          .order('nafn').range(from, from + PAGE - 1);
        if (r.error || !r.data || !r.data.length) break;
        out.push(...r.data);
        if (r.data.length < PAGE) break;
      }
      return out.filter(c => !c.deleted_at);
    }
    const [coAll, contractRes] = await Promise.all([
      fetchAllCompanies(),
      SB.from('thjonustusamningar').select('company_nafn').eq('status', 'virkur')
    ]);
    const contractSet = new Set(
      (contractRes && contractRes.data ? contractRes.data : [])
        .map(c => (c.company_nafn || '').trim().toLowerCase()).filter(Boolean)
    );
    _companies = coAll.map(c => ({
      ...c,
      isContract: contractSet.has((c.nafn || '').trim().toLowerCase())
    }));
  }

  async function loadUnitsForCompany(companyName) {
    const SB = getSB();
    if (!SB) { _units = []; return; }
    // Active units only — broken/scrapped units shouldn't be re-serviced.
    // Match by client name (uttaeki.client). Status null is treated as active.
    const r = await SB.from('uttaeki')
      .select('id,serial,type,size,client,location,next_insp,last_insp,status')
      .eq('client', companyName)
      .order('next_insp', { ascending: true });
    if (r.error) { _units = []; return; }
    _units = (r.data || [])
      .filter(u => u.status !== 'urelt' && u.status !== 'disposed' && u.status !== 'scrapped' && u.status !== 'geymsla' && u.status !== 'broken')
      .map(u => ({
        u,
        checked: true,                  // default: assume driver brought all
        service: defaultServiceFor(u)
      }));
  }
  function defaultServiceFor(u) {
    // If next_insp is in the past or within 30 days, default to "Hleðsla + Skoðun".
    // Otherwise plain "Hleðsla". User can override per row.
    if (!u.next_insp) return 'Hleðsla + Skoðun';
    const ni = new Date(u.next_insp);
    const today = new Date(); today.setHours(0,0,0,0);
    const in30 = new Date(today.getTime() + 30 * 86400000);
    return (ni <= in30) ? 'Hleðsla + Skoðun' : 'Hleðsla';
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function renderModal() {
    let dlg = document.getElementById('_sr-dialog');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_sr-dialog';
    dlg.style.cssText =
      'position:fixed;inset:0;z-index:100020;background:rgba(15,23,42,0.6);' +
      'display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);' +
        'width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 40px);' +
        'display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#0d6efd,#0a58ca);' +
          'color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:17px;font-weight:700">📥 Sækja inn úr fyrirtæki</h3>' +
            '<div style="font-size:11px;color:#bfdbfe;margin-top:2px">Veldu fyrirtæki og hvaða tæki komu inn</div>' +
          '</div>' +
          '<button id="_sr-x" type="button" style="background:transparent;border:1px solid #60a5fa;' +
            'color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;' +
            'line-height:1">✕</button>' +
        '</div>' +
        '<div id="_sr-body" style="flex:1;overflow:auto;padding:18px 22px"></div>' +
        '<div style="padding:13px 22px;border-top:1px solid #e2e8f0;display:flex;gap:8px;' +
          'justify-content:space-between;align-items:center;flex-wrap:wrap">' +
          '<div id="_sr-summary" style="font-size:12px;color:#64748b"></div>' +
          '<div style="display:flex;gap:8px">' +
            '<button id="_sr-cancel" type="button" style="padding:9px 18px;border:1px solid #cbd5e1;' +
              'border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;' +
              'color:#475569">Hætta við</button>' +
            '<button id="_sr-create" type="button" style="padding:9px 18px;background:#0d6efd;' +
              'color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;' +
              'font-weight:700" disabled>Stofna verk</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_sr-x').addEventListener('click', close);
    dlg.querySelector('#_sr-cancel').addEventListener('click', close);
    dlg.querySelector('#_sr-create').addEventListener('click', submitReceive);

    renderBody();
  }

  function renderBody() {
    const body = document.getElementById('_sr-body');
    if (!body) return;
    if (!_selectedCompany) {
      body.innerHTML = renderCompanyPicker();
      // Wire search + row clicks
      const search = body.querySelector('#_sr-search');
      if (search) {
        search.addEventListener('input', e => {
          _searchQuery = e.target.value;
          // Re-render just the list portion
          const list = body.querySelector('#_sr-co-list');
          if (list) list.innerHTML = renderCompanyList();
          wireCompanyRows(body);
        });
        setTimeout(() => search.focus(), 50);
      }
      wireCompanyRows(body);
    } else {
      body.innerHTML = renderUnitPicker();
      wireUnitRows(body);
    }
    updateSummary();
  }

  function renderCompanyPicker() {
    return '' +
      '<div style="margin-bottom:12px">' +
        '<input id="_sr-search" type="search" placeholder="Leita að fyrirtæki…" ' +
          'style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;' +
          'font:inherit;font-size:14px;box-sizing:border-box">' +
      '</div>' +
      '<div id="_sr-co-list" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">' +
        renderCompanyList() +
      '</div>';
  }

  function renderCompanyList() {
    const q = (_searchQuery || '').trim().toLowerCase();
    let list = _companies;
    if (q) {
      list = list.filter(c =>
        ((c.nafn || '').toLowerCase().includes(q)) ||
        ((c.kennitala || '').toLowerCase().includes(q))
      );
    }
    // Contract holders bubble to top
    list = list.slice().sort((a, b) => {
      if (a.isContract !== b.isContract) return a.isContract ? -1 : 1;
      return (a.nafn || '').localeCompare(b.nafn || '', 'is');
    });
    if (!list.length) {
      return '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">Ekkert fyrirtæki fannst</div>';
    }
    return list.slice(0, 200).map(c =>
      '<div class="_sr-co-row" data-co-id="' + esc(c.id) + '" data-co-nafn="' + esc(c.nafn || '') + '" ' +
        'style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;' +
        'border-bottom:1px solid #f1f5f9;cursor:pointer" onmouseover="this.style.background=\'#f8fafc\'" ' +
        'onmouseout="this.style.background=\'\'">' +
        '<div>' +
          '<div style="font-weight:600;color:#0f172a;font-size:13px">' + esc(c.nafn || '') +
            (c.isContract ? ' <span style="background:#dbeafe;color:#1e40af;padding:1px 7px;border-radius:99px;font-size:10px;font-weight:700;margin-left:4px">Samningshafi</span>' : '') +
          '</div>' +
          '<div style="font-size:11px;color:#64748b;margin-top:2px">' +
            (c.kennitala ? esc(c.kennitala) : '') +
            (c.heimilisfang ? ' · ' + esc(c.heimilisfang) : '') +
          '</div>' +
        '</div>' +
        '<div style="color:#94a3b8;font-size:13px">›</div>' +
      '</div>'
    ).join('');
  }

  function wireCompanyRows(body) {
    body.querySelectorAll('._sr-co-row').forEach(row => {
      row.addEventListener('click', async () => {
        const id = +row.dataset.coId;
        const nafn = row.dataset.coNafn;
        _selectedCompany = _companies.find(c => c.id === id) || { id, nafn };
        // Loading state
        const inner = document.getElementById('_sr-body');
        if (inner) inner.innerHTML = '<div style="padding:30px;text-align:center;color:#64748b;font-size:13px">Hleður tækjum frá ' + esc(nafn) + '…</div>';
        await loadUnitsForCompany(nafn);
        renderBody();
      });
    });
  }

  function renderUnitPicker() {
    const c = _selectedCompany;
    const back = '<button id="_sr-back" type="button" style="background:transparent;border:none;color:#0d6efd;font:inherit;font-size:13px;cursor:pointer;padding:0;font-weight:600">← Velja annað fyrirtæki</button>';
    const head = '' +
      '<div style="margin-bottom:14px">' +
        back +
        '<div style="margin-top:8px;padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px">' +
          '<div style="font-size:14px;font-weight:700;color:#0f172a">' + esc(c.nafn || '') + '</div>' +
          '<div style="font-size:11px;color:#475569;margin-top:2px">' +
            (c.kennitala ? 'kt. ' + esc(c.kennitala) : '') +
            (c.simi ? ' · ' + esc(c.simi) : '') +
            (c.heimilisfang ? ' · ' + esc(c.heimilisfang) : '') +
          '</div>' +
        '</div>' +
      '</div>';

    if (!_units.length) {
      return head +
        '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;border:1px dashed #cbd5e1;border-radius:10px">' +
          'Engin virk tæki skráð á þetta fyrirtæki í field-service skránni.' +
          '<div style="margin-top:6px;font-size:11px">Þú getur samt stofnað verkbeiðni handvirkt í gegnum venjulega Counter flæðið.</div>' +
        '</div>';
    }

    const rows = _units.map((s, i) => {
      const u = s.u;
      const ni = u.next_insp || '';
      const isOverdue = ni && new Date(ni) < new Date();
      const overdueChip = isOverdue
        ? '<span style="background:#fee2e2;color:#dc2626;padding:1px 6px;border-radius:99px;font-size:10px;font-weight:700;margin-left:6px">⚠ Útrunnið</span>'
        : '';
      return '<div style="display:grid;grid-template-columns:24px 1fr 160px;gap:10px;align-items:center;padding:8px 12px;border-bottom:1px solid #f1f5f9">' +
        '<input type="checkbox" class="_sr-unit-chk" data-i="' + i + '" ' + (s.checked ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer">' +
        '<div style="min-width:0">' +
          '<div style="font-size:13px;font-weight:600;color:#0f172a">' +
            '<span style="font-family:monospace">' + esc(u.serial || '—') + '</span>' +
            ' · ' + esc(u.type || '—') + (u.size ? ' ' + esc(u.size) : '') +
            overdueChip +
          '</div>' +
          '<div style="font-size:11px;color:#64748b;margin-top:2px">' +
            (u.location ? esc(u.location) + ' · ' : '') +
            'Næsta skoðun: ' + (ni ? esc(ni) : '—') +
          '</div>' +
        '</div>' +
        '<select class="_sr-unit-svc" data-i="' + i + '" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;background:#fff">' +
          SERVICE_TYPES.map(svc => '<option' + (s.service === svc ? ' selected' : '') + '>' + esc(svc) + '</option>').join('') +
        '</select>' +
      '</div>';
    }).join('');

    const allChecked = _units.every(s => s.checked);
    const toolbar =
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px">' +
        '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#475569">' +
          '<input type="checkbox" id="_sr-toggle-all"' + (allChecked ? ' checked' : '') + ' style="width:14px;height:14px;cursor:pointer"> Velja öll' +
        '</label>' +
        '<span style="color:#94a3b8">' + _units.length + ' tæki frá field-service</span>' +
      '</div>';

    return head + '<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' + toolbar + rows + '</div>';
  }

  function wireUnitRows(body) {
    const back = body.querySelector('#_sr-back');
    if (back) back.addEventListener('click', () => {
      _selectedCompany = null;
      _units = [];
      renderBody();
    });
    body.querySelectorAll('._sr-unit-chk').forEach(cb => {
      cb.addEventListener('change', e => {
        const i = +cb.dataset.i;
        if (_units[i]) _units[i].checked = cb.checked;
        updateSummary();
        // Update "select all" toggle state
        const all = body.querySelector('#_sr-toggle-all');
        if (all) all.checked = _units.every(s => s.checked);
      });
    });
    body.querySelectorAll('._sr-unit-svc').forEach(sel => {
      sel.addEventListener('change', () => {
        const i = +sel.dataset.i;
        if (_units[i]) _units[i].service = sel.value;
      });
    });
    const toggleAll = body.querySelector('#_sr-toggle-all');
    if (toggleAll) toggleAll.addEventListener('change', () => {
      const c = toggleAll.checked;
      _units.forEach(s => { s.checked = c; });
      body.querySelectorAll('._sr-unit-chk').forEach(cb => { cb.checked = c; });
      updateSummary();
    });
  }

  function updateSummary() {
    const sum = document.getElementById('_sr-summary');
    const create = document.getElementById('_sr-create');
    if (!sum || !create) return;
    if (!_selectedCompany) {
      sum.textContent = '';
      create.disabled = true;
      return;
    }
    const picked = _units.filter(s => s.checked);
    sum.textContent = picked.length + ' af ' + _units.length + ' tækjum valin';
    create.disabled = picked.length === 0;
  }

  // ── Submit: create verkbeiðni + verklidur ────────────────────────────────
  async function submitReceive() {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    if (!_selectedCompany) return;
    const picked = _units.filter(s => s.checked);
    if (!picked.length) return;

    const create = document.getElementById('_sr-create');
    if (create) { create.disabled = true; create.textContent = 'Vista…'; }

    try {
      const today = todayISO();
      const pickupOffset = (() => {
        try {
          const v = window.AppSettings && window.AppSettings.path('almennt.default_pickup_offset_days');
          return Number.isFinite(+v) && +v > 0 ? +v : 7;
        } catch (_) { return 7; }
      })();
      const pickupDate = new Date(); pickupDate.setDate(pickupDate.getDate() + pickupOffset);
      const pickupISO = pickupDate.toISOString().slice(0, 10);

      // Compute draft pricing from `vorur` lookup so pickup-checkout shows
      // real numbers. Company Tilboðsverð (patch 113) applied automatically.
      const { linur, unmatched, overrideCount } = await buildLinurFromPicked(picked, _selectedCompany.id);
      const draftEx = linur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0), 0);
      const draftVsk = linur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * ((+l.vsk_pct || 0) / 100), 0);
      const draftTotal = Math.round(draftEx + draftVsk);

      // 2026-05-10 (B4 fix): Insert solur FIRST so the BEFORE-INSERT trigger
      // can assign the canonical R-NNNNNN num. Then use that same num on the
      // verkbeiðni so patch 121's parentSaleNum() lookup finds the draft.
      // Old approach generated `#YYYY-NNN` for verkbeiðni and trusted the
      // trigger to leave it on solur — but the trigger overrode to R-NNNNNN,
      // breaking the link.
      const draftSale = {
        starfsmadur: 'Verkstæði',
        customer_nafn: _selectedCompany.nafn || '',
        customer_id: _selectedCompany.id || null,
        linur,
        upphaed_an_vsk: Math.round(draftEx),
        vsk_upphaed: Math.round(draftVsk),
        afslattur: 0,
        samtals: draftTotal,
        greitt_med: 'greitt_sidar',
        athugasemdir: 'Drög — bíður Sótt ✓',
        status: 'drog',
        source: 'sott'
      };
      let saleRes = await SB.from('solur').insert(draftSale).select().single();
      if (saleRes.error && /status/i.test(saleRes.error.message || '')) {
        const { status, ...rest } = draftSale;
        saleRes = await SB.from('solur').insert(rest).select().single();
        if (!saleRes.error && window.Toast && Toast.show) {
          Toast.show('Drög-staða ekki tiltæk — keyrðu sql/solur_status.sql svo Tekjur feli drög rétt');
        }
      }
      if (saleRes.error) {
        // 2026-05-11: Was synthesizing 'R-' + Date.now().slice(-6) here as
        // an "ultra-fallback" but that:
        //   1. Can collide with REAL R-NNNNNN numbers from the trigger,
        //      breaking parentSaleNum() lookups in patch 121.
        //   2. Bypasses the BEFORE-INSERT trigger that assigns canonical IDs.
        // Better: abort the verkbeiðni creation entirely and tell the user
        // what went wrong. The customer can retry, and we keep data clean.
        console.error('[samningshafar-receive] draft solur insert failed:', saleRes.error.message);
        if (window.Toast && Toast.show) {
          Toast.show('❌ Gat ekki vistað sölu: ' + saleRes.error.message);
        } else {
          alert('Gat ekki vistað sölu — verkbeiðni ekki stofnuð.\n\n' + saleRes.error.message);
        }
        return; // abort — don't create orphan verkbeiðni
      }
      const num = saleRes.data && saleRes.data.num;
      if (!num) {
        // Sale was created but num came back empty (trigger missing?). Same
        // safety: abort rather than synthesize.
        console.error('[samningshafar-receive] solur insert succeeded but num is empty');
        if (window.Toast && Toast.show) Toast.show('❌ Salinn fékk ekki R-númer');
        return;
      }

      // Insert verkbeiðni with the SAME num as the draft solur.
      const jobIns = await SB.from('verkbeidnir').insert({
        num,
        status: 'received',
        customer: _selectedCompany.nafn || '',
        phone: _selectedCompany.simi || '',
        dropoff: today,
        pickup: pickupISO,
        notes: 'Sótt úr field-service — ' + picked.length + ' tæki',
        verd: draftTotal
      }).select().single();
      if (jobIns.error) throw jobIns.error;
      const jobId = jobIns.data.id;

      // Insert verklidur for each picked unit. Try with uttaeki_id first;
      // if column doesn't exist, retry without.
      const linesWithLink = picked.map(s => ({
        job_id: jobId,
        serial: s.u.serial || '',
        type: s.u.type || '',
        size: s.u.size || '',
        service: s.service,
        status: 'received',
        uttaeki_id: s.u.id
      }));
      let liRes = await SB.from('verklidur').insert(linesWithLink);
      if (liRes.error && /uttaeki_id/i.test(liRes.error.message || '')) {
        const linesNoLink = linesWithLink.map(({ uttaeki_id, ...rest }) => rest);
        liRes = await SB.from('verklidur').insert(linesNoLink);
        if (!liRes.error && window.Toast && Toast.show) {
          Toast.show('Verkbeiðni stofnuð, en uttaeki-tenging vantar — keyrðu sql/verklidur_uttaeki_link.sql');
        }
      }
      if (liRes.error) throw liRes.error;

      // 4. Refresh local cache + workshop view
      if (window.DB && typeof DB.loadAll === 'function') {
        await DB.loadAll();
      }
      if (window.Workshop && typeof Workshop.render === 'function') {
        try { Workshop.render(); } catch (_) {}
      }

      // 5. Close + toast
      const dlg = document.getElementById('_sr-dialog');
      if (dlg) dlg.remove();
      if (window.Toast && Toast.show) {
        const msg = '✓ Stofnað ' + num + ' með ' + picked.length + ' tækjum' +
          (draftTotal ? ' · ' + Math.round(draftTotal).toLocaleString('is-IS') + ' kr' : '') +
          (overrideCount ? ' · 💰 ' + overrideCount + ' Tilboðsverð notuð' : '') +
          (unmatched.length ? ' (verð vantar fyrir ' + unmatched.length + ' tæki)' : '');
        Toast.show(msg);
      }
    } catch (e) {
      alert('Villa: ' + (e.message || e));
      if (create) { create.disabled = false; create.textContent = 'Stofna verk'; }
    }
  }

  // Public API
  window.SamningshafarReceive = { open: openReceiveModal };

  console.log('[samningshafar-receive] installed');
})();
/* === END SAMNINGSHAFAR RECEIVE === */
