/* === KRÖFU YFIRLIT v1 ===
 *
 * Mánaðar-yfirlit yfir ALLAR ógreiddar sölur með greitt_med='reikningur'
 * (Senda reikning / krafa í heimabanka 10 dagar). Aðskilið frá "Til að
 * rukka" sem inniheldur líka 'greitt_sidar'.
 *
 * Markmið: í lok mánaðar þarf Agnar að senda hverri fyrirtækjakröfu inn
 * í heimabankann. Þessi síða hjálpar honum að:
 *   1. Sjá alla útistandandi kröfu-sölu á einum stað
 *   2. Gruppera per fyrirtæki — heildartala per fyrirtæki er það sem fer
 *      í heimabankann
 *   3. Merkja allar sölur fyrirtækis sem greitt þegar krafan er búin
 *
 * Sidebar entry "📋 Kröfu yfirlit" rétt fyrir neðan "Til að rukka".
 */
(() => {
  if (window.__krofuYfirlitInstalled) return;
  window.__krofuYfirlitInstalled = true;

  const VIEW_ID = 'view-krofu-yfirlit';
  const NAV_KEY = 'krofu-yfirlit';

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
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  function daysAgo(iso) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }
  function normName(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const rukkBtn = Array.from(nav.querySelectorAll('.vnav-btn'))
      .find(b => /Til að rukka|Til ad rukka/.test(b.textContent || ''));
    const tpl = rukkBtn || nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">📋</span>Kröfu yfirlit <span class="ky-badge" style="margin-left:auto;background:#1d4ed8;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px;display:none"></span>';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      show();
    });
    if (rukkBtn && rukkBtn.parentNode) rukkBtn.parentNode.insertBefore(btn, rukkBtn.nextSibling);
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
    v.innerHTML = '<main id="ky-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function patchSwitchView() {
    if (!window.App || window.App._kySwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        // 2026-06-13: class-based like the core (.view.active{display:block}).
        // Clear any stale inline display so switching AWAY later (core toggles
        // the class only) doesn't leave other views stranded as display:none.
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.classList.remove('active');
          v.style.display = '';
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.classList.add('active'); v.style.display = 'block'; }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._kySwitchPatched = true;
  }

  // ── Data load ────────────────────────────────────────────────────────────
  // 2026-05-21: _state.sort persists the current sort across reloads via
  // localStorage so the choice survives view-switches.
  const SORT_KEY = '_ky_sort_v1';
  function loadSort() {
    try { return localStorage.getItem(SORT_KEY) || 'updated_desc'; } catch (_) { return 'updated_desc'; }
  }
  function saveSort(v) { try { localStorage.setItem(SORT_KEY, v); } catch (_) {} }
  let _state = { month: null, all: [], vbByParent: {}, sort: loadSort(), selected: new Set() };

  function monthBounds(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }

  async function load(filterMonth) {
    const main = document.getElementById('ky-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8">Hleður kröfum…</div>';
    const SB = getSB();
    if (!SB) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Engin gagnabankatenging.</div>'; return; }

    const m = filterMonth || new Date();
    _state.month = m;

    // ONLY reikningur — that's the "krafa í heimabanka 10 dagar" choice.
    // 'greitt_sidar' is excluded — it has its own page (Til að rukka).
    // 2026-05-21: pull updated_at too so the sort options can use it.
    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_base_id,customer_kt,samtals,greitt_med,athugasemdir,created_at,updated_at,paid_at,invoiced_at,krafa_sent_at,dk_invoice_id,is_credit,credit_of')
      .eq('greitt_med', 'reikningur')
      .is('paid_at', null)
      .order('updated_at', { ascending: false });
    if (r.error) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    _state.all = r.data || [];

    // 2026-06-30: pull kt + netfang fyrir hvern customer_id svo Payday-vinnan
    // sjái strax hvort gögn vanti. Birtist undir nafni fyrirtækisins.
    const cidSet = Array.from(new Set((_state.all || []).map(s => s.customer_id).filter(Boolean)));
    _state.fyrirtMap = {};
    if (cidSet.length) {
      const fy = await SB.from('fyrirtaeki').select('id,kennitala,netfang').in('id', cidSet);
      (fy.data || []).forEach(f => { _state.fyrirtMap[f.id] = f; });
    }
    // 2026-06-30: líka pull úr customers_base ef customer_base_id er sett —
    // einstaklingskúnnar (eins og Agnar 425) eru ekki í fyrirtaeki, bara í base.
    const baseSet = Array.from(new Set((_state.all || []).map(s => s.customer_base_id).filter(Boolean)));
    _state.baseMap = {};
    if (baseSet.length) {
      const bb = await SB.from('customers_base').select('id,kennitala,netfang').in('id', baseSet);
      (bb.data || []).forEach(b => { _state.baseMap[b.id] = b; });
    }
    // 2026-06-30: byggja kt → fyrirtaeki[] map fyrir úttektarskýrslu-lookup.
    // CompanyAttachments er per-fyrirtaeki, en sölur hafa oft bara customer_kt
    // (engan customer_id). Þá þurfum við að finna öll fyrirtaeki með sama kt
    // og spyrja CompanyAttachments fyrir hvert.
    const ktSet = Array.from(new Set((_state.all || []).map(s => (s.customer_kt || '').trim()).filter(Boolean)));
    _state.fyrirtIdsByKt = {};
    if (ktSet.length) {
      const fy2 = await SB.from('fyrirtaeki').select('id,kennitala,customer_base_id').in('kennitala', ktSet);
      (fy2.data || []).forEach(f => {
        const k = (f.kennitala || '').trim();
        if (!k) return;
        (_state.fyrirtIdsByKt[k] = _state.fyrirtIdsByKt[k] || []).push(f.id);
      });
      // Líka með customer_base_id — finna öll fyrirtaeki undir sama base
      const baseIds = (_state.all || []).map(s => s.customer_base_id).filter(Boolean);
      if (baseIds.length) {
        const fy3 = await SB.from('fyrirtaeki').select('id,kennitala,customer_base_id').in('customer_base_id', Array.from(new Set(baseIds)));
        (fy3.data || []).forEach(f => {
          const k = (f.kennitala || '').trim();
          if (!k) return;
          (_state.fyrirtIdsByKt[k] = _state.fyrirtIdsByKt[k] || []);
          if (!_state.fyrirtIdsByKt[k].includes(f.id)) _state.fyrirtIdsByKt[k].push(f.id);
        });
      }
    }

    // Verkbeidnir for pickup status (same approach as patch 152).
    const vb = await SB.from('verkbeidnir').select('num,status').like('num', 'R-%-V%');
    _state.vbByParent = {};
    (vb.data || []).forEach(v => {
      const parent = String(v.num || '').replace(/-V\d+$/, '');
      (_state.vbByParent[parent] = _state.vbByParent[parent] || []).push(v.status);
    });

    render();
  }

  function pickupStatus(saleNum) {
    const statuses = _state.vbByParent[saleNum] || [];
    if (!statuses.length) return { label: '—', icon: '·', color: '#94a3b8' };
    const allCollected = statuses.every(s => s === 'collected' || s === 'done');
    const anyAtShop = statuses.some(s => s === 'received' || s === 'ready' || s === 'inprogress');
    if (allCollected) return { label: 'Sótt', icon: '✅', color: '#16a34a' };
    if (anyAtShop) return { label: 'Hjá þér', icon: '🏪', color: '#f59e0b' };
    return { label: '—', icon: '·', color: '#94a3b8' };
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    const main = document.getElementById('ky-main');
    if (!main) return;
    const all = _state.all;
    const { start, end } = monthBounds(_state.month);

    const thisMonth = [];
    const older = [];
    all.forEach(s => {
      const t = new Date(s.created_at).getTime();
      if (t >= start.getTime() && t < end.getTime()) thisMonth.push(s);
      else older.push(s);
    });

    function sum(arr) { return arr.reduce((s, x) => s + (parseFloat(x.samtals) || 0), 0); }
    const thisMonthTotal = sum(thisMonth);
    const olderTotal = sum(older);
    const grandTotal = thisMonthTotal + olderTotal;
    // 2026-06-30: telja sendar kröfur (úr Payday eða manual toggle á krafa_sent_at)
    const sent = (all || []).filter(s => s.krafa_sent_at);
    const sentTotal = sum(sent);
    const sentCompanies = new Set(sent.map(s => normName(s.customer_nafn) || '(ekkert)')).size;

    // Group by company across the whole dataset for the per-company section.
    const grouped = {};
    all.forEach(s => {
      const key = normName(s.customer_nafn) || '(ekkert nafn)';
      const display = s.customer_nafn || '(ekkert nafn)';
      if (!grouped[key]) grouped[key] = { display, id: s.customer_id || null, sales: [], sum: 0, thisMonthSum: 0, olderSum: 0, latestUpdated: '', latestCreated: '' };
      grouped[key].sales.push(s);
      grouped[key].sum += parseFloat(s.samtals) || 0;
      const t = new Date(s.created_at).getTime();
      if (t >= start.getTime() && t < end.getTime()) grouped[key].thisMonthSum += parseFloat(s.samtals) || 0;
      else grouped[key].olderSum += parseFloat(s.samtals) || 0;
      // Track latest timestamps so sort modes work at company-card level too.
      const u = s.updated_at || s.created_at || '';
      if (u > grouped[key].latestUpdated) grouped[key].latestUpdated = u;
      const c = s.created_at || '';
      if (c > grouped[key].latestCreated) grouped[key].latestCreated = c;
    });
    // 2026-05-21: sort companies AND the sales within each company by the
    // chosen order. Default = nýlega breytt → claims you just touched
    // (mark paid, switch method, save edits) jump to the top instead of
    // staying buried by their original created_at.
    const sortMode = _state.sort;
    function cmpUpdated(a, b) { return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''); }
    function cmpCreatedDesc(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); }
    function cmpCreatedAsc(a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); }
    function cmpAmtDesc(a, b) { return (+b.samtals || 0) - (+a.samtals || 0); }
    function cmpAmtAsc(a, b)  { return (+a.samtals || 0) - (+b.samtals || 0); }
    const saleCmp = sortMode === 'created_desc' ? cmpCreatedDesc
                  : sortMode === 'created_asc'  ? cmpCreatedAsc
                  : sortMode === 'amount_desc'  ? cmpAmtDesc
                  : sortMode === 'amount_asc'   ? cmpAmtAsc
                  : cmpUpdated; // updated_desc default
    Object.values(grouped).forEach(g => g.sales.sort(saleCmp));
    const companies = Object.values(grouped).sort((a, b) => {
      if (sortMode === 'amount_asc')   return a.sum - b.sum;
      if (sortMode === 'amount_desc')  return b.sum - a.sum;
      if (sortMode === 'created_asc')  return (a.latestCreated || '').localeCompare(b.latestCreated || '');
      if (sortMode === 'created_desc') return (b.latestCreated || '').localeCompare(a.latestCreated || '');
      // updated_desc: company with the most-recently-touched sale floats up
      return (b.latestUpdated || '').localeCompare(a.latestUpdated || '');
    });

    const monthLabel = _state.month.getFullYear() + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];

    main.innerHTML = `
      <div class="bh-page">
        <div class="bh-title-band">
          <div class="bh-container" style="padding-bottom:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px">
              <div>
                <h1>Kröfu yfirlit</h1>
                <div class="bh-subtitle">Krafa í heimabanka — sölur með greitt_med „Senda reikning" sem þarf að safna saman í lok mánaðar</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="_ky-prev bh-btn bh-btn--metal bh-btn--sm" type="button" aria-label="Fyrri mánuður">◀</button>
                <div class="bh-mono" style="font-size:14px;font-weight:700;padding:0 8px;min-width:150px;text-align:center;color:#fff">${esc(monthLabel)}</div>
                <button class="_ky-next bh-btn bh-btn--metal bh-btn--sm" type="button" aria-label="Næsti mánuður">▶</button>
                <select class="_ky-sort bh-select bh-select--sm" title="Raða" style="margin-left:6px;background:#0a0b0d;color:#fff;border-color:#0a0b0d;font-weight:600">
                  <option value="updated_desc"${_state.sort === 'updated_desc' ? ' selected' : ''}>Nýlega breytt fyrst</option>
                  <option value="created_desc"${_state.sort === 'created_desc' ? ' selected' : ''}>Nýjast stofnað</option>
                  <option value="created_asc"${_state.sort === 'created_asc' ? ' selected' : ''}>Elst stofnað</option>
                  <option value="amount_desc"${_state.sort === 'amount_desc' ? ' selected' : ''}>Hæsta upphæð</option>
                  <option value="amount_asc"${_state.sort === 'amount_asc' ? ' selected' : ''}>Lægsta upphæð</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="bh-container">
          <div class="bh-stats">
            <div class="bh-stat">
              <div class="bh-stat-label">Þessi mánuður</div>
              <div class="bh-stat-value">${fmtKr(thisMonthTotal)}</div>
              <div class="bh-stat-sub"><span class="bh-mono">${thisMonth.length}</span> kröfur</div>
            </div>
            ${olderTotal !== 0 ? `
            <div class="bh-stat bh-stat--amber">
              <div class="bh-stat-label">Eldri ógreitt</div>
              <div class="bh-stat-value">${fmtKr(olderTotal)}</div>
              <div class="bh-stat-sub"><span class="bh-mono">${older.length}</span> kröfur</div>
            </div>` : ''}
            <div class="bh-stat bh-stat--hero">
              <div class="bh-stat-label">Heildarkröfur</div>
              <div class="bh-stat-value">${fmtKr(grandTotal)}</div>
              <div class="bh-stat-sub"><span class="bh-mono">${all.length}</span> sölur · <span class="bh-mono">${companies.length}</span> fyrirtæki</div>
            </div>
            <div class="bh-stat bh-stat--green">
              <div class="bh-stat-label">Sendar kröfur</div>
              <div class="bh-stat-value">${fmtKr(sentTotal)}</div>
              <div class="bh-stat-sub"><span class="bh-mono">${sent.length}</span> sölur · <span class="bh-mono">${sentCompanies}</span> fyrirtæki</div>
            </div>
          </div>

          <div class="bh-card" style="padding:12px 16px;font-size:13px;color:${'#3a4250'};line-height:1.5;margin-bottom:14px">
            💡 Þessar tölur eru útistandandi kröfur per fyrirtæki sem þarf að setja í heimabankann.
            Þegar krafan hefur verið mynduð, tikkaðu ósentar kröfur og notaðu <b>„📤 Senda valdar í Payday"</b> stikuna, eða smelltu <b>„✓ Allar greiddar"</b> þegar greitt hefur borist.
          </div>

          ${companies.length
            ? companies.map(renderCompany).join('')
            : '<div class="bh-empty">Engar útistandandi kröfur 🎉</div>'}
        </div>
      </div>

      <div id="_ky-bulk-bar" class="bh-bulkbar" style="display:none">
        <div class="bh-bulkbar-inner">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <div class="bh-bulkbar-count"><span id="_ky-bulk-n" class="bh-mono">0</span> kröfur valdar · <span id="_ky-bulk-sum" class="bh-mono">0 kr</span></div>
            <button id="_ky-bulk-clear" type="button" class="bh-btn bh-btn--sm" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.25);font-weight:600">✕ Hreinsa val</button>
          </div>
          <button id="_ky-bulk-send" type="button" class="bh-btn bh-btn--green">📤 Senda valdar í Payday</button>
        </div>
      </div>`;

    main.querySelector('._ky-sort')?.addEventListener('change', e => {
      _state.sort = e.target.value;
      saveSort(_state.sort);
      render();
    });
    main.querySelector('._ky-prev')?.addEventListener('click', () => {
      const m = new Date(_state.month);
      m.setMonth(m.getMonth() - 1);
      load(m);
    });
    main.querySelector('._ky-next')?.addEventListener('click', () => {
      const m = new Date(_state.month);
      m.setMonth(m.getMonth() + 1);
      load(m);
    });

    // 2026-06-30: smella á nafn fyrirtækisins → opna fyrirtækjasíðu
    main.querySelectorAll('._ky-co-link').forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const id = a.dataset.coId;
        if (id && typeof window._openCompanySafe === 'function') {
          window._openCompanySafe(id);
        }
      });
    });

    // 2026-06-30: 📎 Skýrsla hnappur — opnar úttektarskýrslu PDF í preview
    main.querySelectorAll('._ky-skyrsla').forEach(b => {
      b.addEventListener('click', async () => {
        try {
          const coId = b.dataset.coId;
          const attId = b.dataset.attId;
          if (!coId || !window.CompanyAttachments) return;
          const atts = CompanyAttachments.list(coId) || [];
          const file = atts.find(a => String(a.id) === String(attId));
          if (!file) { alert('Skjal fannst ekki — hefur þú endurnýjað kröfu yfirlitið?'); return; }
          if (CompanyAttachments.openPreview) CompanyAttachments.openPreview(coId, file);
          else if (CompanyAttachments.download) CompanyAttachments.download(coId, file);
        } catch (e) { alert('Villa: ' + (e.message || e)); }
      });
    });

    // 2026-06-30: „Krafa send" hnappur sendir núna kröfuna í Payday gegnum
    // /api/payday-push (sem setur invoiced_at + krafa_sent_at + dk_invoice_id).
    // Afhökun (going from on → off) er ennþá bara local toggle á krafa_sent_at —
    // hún dregur EKKI til baka Payday-drögin.
    main.querySelectorAll('._ky-krafa-toggle').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const isOn = b.dataset.on === '1';
        if (isOn) {
          if (!confirm('Afhaka „Krafa send"? (NB Payday-dragið helst óbreytt)')) return;
          const SB = getSB();
          const r = await SB.from('solur').update({ krafa_sent_at: null }).eq('id', id);
          if (r.error) { alert('Villa: ' + r.error.message); return; }
          if (window.Toast && Toast.show) Toast.show('Krafa send — afhakað');
          await load(_state.month);
          return;
        }
        if (!confirm('Senda kröfu í Payday núna? (drag verður stofnað, ekki sjálfvirkt sent á kúnna)')) return;
        b.disabled = true; b.textContent = '⏳ Sendir…';
        try {
          const r = await fetch('/api/payday-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sale_id: id }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
          if (window.Toast && Toast.show) Toast.show('🏦 ✓ Krafa send í Payday');
          await load(_state.month);
        } catch (e) {
          alert('Payday push villa: ' + (e.message || e));
          b.disabled = false;
        }
      });
    });
    main.querySelectorAll('._ky-mark-paid').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        if (!confirm('Merkja sem greitt? (paid_at = núna)')) return;
        const SB = getSB();
        const r = await SB.from('solur').update({ paid_at: new Date().toISOString() }).eq('id', id);
        if (r.error) { alert('Villa: ' + r.error.message); return; }
        if (window.Toast && Toast.show) Toast.show('✓ Merkt sem greitt');
        await load(_state.month);
        refreshBadge();
      });
    });
    main.querySelectorAll('._ky-mark-all-paid').forEach(b => {
      b.addEventListener('click', async () => {
        const ids = b.dataset.ids.split(',').map(Number);
        const name = b.dataset.name || 'þetta fyrirtæki';
        if (!confirm('Merkja allar ' + ids.length + ' kröfur sem greitt fyrir "' + name + '"?\n\n(Notist eftir að krafa hefur verið send í heimabanka.)')) return;
        const SB = getSB();
        const r = await SB.from('solur').update({ paid_at: new Date().toISOString() }).in('id', ids);
        if (r.error) { alert('Villa: ' + r.error.message); return; }
        if (window.Toast && Toast.show) Toast.show('✓ ' + ids.length + ' kröfur merktar greiddar');
        await load(_state.month);
        refreshBadge();
      });
    });
    main.querySelectorAll('._ky-open-editor').forEach(b => {
      b.addEventListener('click', () => {
        const num = b.dataset.num;
        if (window.SaleEditor && SaleEditor.openByNum) SaleEditor.openByNum(num);
      });
    });
    main.querySelectorAll('._ky-view-invoice').forEach(b => {
      b.addEventListener('click', () => openInvoice(b.dataset.id));
    });
    main.querySelectorAll('._ky-kredit').forEach(b => {
      b.addEventListener('click', async () => {
        if (!window.CreditInvoice || !CreditInvoice.open) {
          alert('Kreditfærslueining ekki tiltæk.'); return;
        }
        const SB = getSB(); if (!SB) return;
        const r = await SB.from('solur')
          .select('id,num,customer_nafn,customer_id,samtals,upphaed_an_vsk,vsk_upphaed,linur,greitt_med')
          .eq('id', b.dataset.id).single();
        if (r.error || !r.data) { alert('Salan fannst ekki.'); return; }
        const d = r.data;
        CreditInvoice.open({
          id: d.id, num: d.num, customer: d.customer_nafn, customer_id: d.customer_id,
          total: +(d.samtals || 0), ex: +(d.upphaed_an_vsk || 0), vsk: +(d.vsk_upphaed || 0),
          lines: Array.isArray(d.linur) ? d.linur : [], payment: d.greitt_med
        });
        // Patch 26 hides the modal on confirm/cancel — refresh on close.
        setTimeout(() => {
          const modal = document.getElementById('ci-modal');
          if (!modal) return;
          const obs = new MutationObserver(() => {
            if (modal.style.display === 'none') {
              obs.disconnect();
              setTimeout(() => load(_state.month), 250);
            }
          });
          obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
        }, 250);
      });
    });
    main.querySelectorAll('._ky-copy-total').forEach(b => {
      b.addEventListener('click', async () => {
        const v = b.dataset.value;
        try {
          await navigator.clipboard.writeText(v);
          if (window.Toast && Toast.show) Toast.show('✓ Afritað: ' + v + ' kr');
        } catch (_) {}
      });
    });

    // 2026-06-30: bulk Payday push — fjölval með tickbox + neðstu aðgerðastiku.
    // Selecting state lives in _state.selected (Set of sale.id), preserved
    // across re-renders within the session. Each tick updates the bar; Send →
    // POST /api/payday-push fyrir hvert valið ID í röð (sama endpoint og
    // einstaki takkinn). Reload í lokin sækir nýju krafa_sent_at færslurnar.
    function pruneSelected() {
      const live = new Set((_state.all || []).filter(s => !s.krafa_sent_at).map(s => s.id));
      Array.from(_state.selected).forEach(id => { if (!live.has(id)) _state.selected.delete(id); });
    }
    function refreshBulkBar() {
      pruneSelected();
      const bar = document.getElementById('_ky-bulk-bar');
      if (!bar) return;
      const n = _state.selected.size;
      if (n === 0) { bar.style.display = 'none'; return; }
      const sum = (_state.all || []).filter(s => _state.selected.has(s.id))
        .reduce((acc, s) => acc + (parseFloat(s.samtals) || 0), 0);
      const nEl = document.getElementById('_ky-bulk-n');
      const sEl = document.getElementById('_ky-bulk-sum');
      if (nEl) nEl.textContent = String(n);
      if (sEl) sEl.textContent = fmtKr(sum);
      bar.style.display = 'block';
    }
    main.querySelectorAll('._ky-select').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        if (cb.checked) _state.selected.add(id); else _state.selected.delete(id);
        refreshBulkBar();
      });
    });
    main.querySelectorAll('._ky-select-all').forEach(b => {
      b.addEventListener('click', () => {
        const ids = (b.dataset.ids || '').split(',').filter(Boolean);
        const allSelected = ids.length && ids.every(id => _state.selected.has(id));
        if (allSelected) ids.forEach(id => _state.selected.delete(id));
        else ids.forEach(id => _state.selected.add(id));
        main.querySelectorAll('._ky-select').forEach(cb => {
          cb.checked = _state.selected.has(cb.dataset.id);
        });
        refreshBulkBar();
      });
    });
    document.getElementById('_ky-bulk-clear')?.addEventListener('click', () => {
      _state.selected.clear();
      main.querySelectorAll('._ky-select').forEach(cb => { cb.checked = false; });
      refreshBulkBar();
    });
    document.getElementById('_ky-bulk-send')?.addEventListener('click', async () => {
      const ids = Array.from(_state.selected);
      if (!ids.length) return;
      if (!confirm('Senda ' + ids.length + ' kröfur í Payday núna?\n\n(Hver salan verður sitt eigið drag — ekki sjálfvirkt sent á kúnna.)')) return;
      const btn = document.getElementById('_ky-bulk-send');
      const bar = document.getElementById('_ky-bulk-bar');
      let ok = 0, failed = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (btn) btn.textContent = '⏳ ' + (i + 1) + ' / ' + ids.length + '…';
        try {
          const r = await fetch('/api/payday-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sale_id: id }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
          ok++;
          _state.selected.delete(id);
        } catch (e) {
          const s = (_state.all || []).find(x => x.id === id);
          failed.push({ num: s ? s.num : id, msg: (e && e.message) || String(e) });
        }
      }
      if (btn) btn.textContent = '📤 Senda valdar í Payday';
      const okMsg = ok ? '✓ ' + ok + ' kröfur sendar í Payday' : '';
      if (failed.length) {
        const list = failed.map(f => '• ' + f.num + ' — ' + f.msg).join('\n');
        alert((okMsg ? okMsg + '\n\n' : '') + failed.length + ' kröfur misheppnaðar:\n\n' + list);
      } else if (window.Toast && Toast.show) {
        Toast.show(okMsg);
      }
      await load(_state.month);
    });
    refreshBulkBar();

    refreshBadge();
  }

  function renderCompany(grp) {
    // Sort sales chronological asc within the company card for easier review.
    const sales = grp.sales.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const ids = sales.map(s => s.id).join(',');
    // 2026-06-30: bulk-Payday — ósentar (engin krafa_sent_at) sem fá tickbox.
    const unsentIds = sales.filter(s => !s.krafa_sent_at).map(s => s.id);
    const totalStr = String(Math.round(grp.sum));

    // 2026-06-30: sýna kt + email fyrir Payday-undirbúning. Lestir í þessari röð:
    // 1) solur.customer_kt — POS-authoritative
    // 2) fyrirtaeki via customer_id
    // 3) customers_base via customer_base_id (einstaklings-kúnnar lenda hér)
    const fy = grp.id ? (_state.fyrirtMap || {})[grp.id] : null;
    const firstSale = sales[0] || {};
    const baseRow = firstSale.customer_base_id ? (_state.baseMap || {})[firstSale.customer_base_id] : null;
    const kt = (firstSale.customer_kt) || (fy && fy.kennitala) || (baseRow && baseRow.kennitala) || null;
    const email = (fy && fy.netfang) || (baseRow && baseRow.netfang) || null;
    const meta = [
      kt ? '<span style="color:#475569;font-family:ui-monospace,Menlo,monospace;font-size:11px">' + esc(kt) + '</span>'
         : '<span style="color:#dc2626;font-weight:700">⚠️ vantar kt</span>',
      email ? '<span style="color:#0369a1">📧 ' + esc(email) + '</span>'
            : '<span style="color:#b45309">⚠️ vantar netfang</span>',
    ].join(' · ');

    // Smella á nafn fyrirtækisins → opna fyrirtækjasíðu (data-co-id click handler binds below)
    const nameHtml = grp.id
      ? `<a href="#" class="_ky-co-link" data-co-id="${grp.id}">${esc(grp.display)}</a>`
      : esc(grp.display);
    const metaLine2 = [
      grp.thisMonthSum > 0 ? '<span style="color:#2f5fe0">þessi mán: <span class="bh-mono">' + fmtKr(grp.thisMonthSum) + '</span></span>' : '',
      grp.olderSum > 0 ? '<span style="color:#b45309">eldra: <span class="bh-mono">' + fmtKr(grp.olderSum) + '</span></span>' : '',
    ].filter(Boolean).join(' · ');

    return `
      <div class="bh-group">
        <div class="bh-group-head">
          <div style="min-width:0;flex:1">
            <div class="bh-group-name">${nameHtml}</div>
            <div class="bh-group-meta">${meta}</div>
            <div class="bh-group-meta"><span class="bh-mono">${sales.length}</span> kröfur${metaLine2 ? ' · ' + metaLine2 : ''}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <div style="text-align:right">
              <div class="bh-group-total-label">Krafa</div>
              <div class="bh-group-total">${fmtKr(grp.sum)}</div>
            </div>
            <button class="_ky-copy-total bh-btn bh-btn--light bh-btn--sm" data-value="${esc(totalStr)}" type="button" title="Afrita upphæð">📋</button>
            ${unsentIds.length ? `<button class="_ky-select-all bh-btn bh-btn--sm" data-ids="${unsentIds.join(',')}" type="button" title="Velja allar ósentar kröfur þessa fyrirtækis fyrir Payday-push" style="background:#eef3ff;color:#2f5fe0;border-color:#c6d6ff;font-weight:700">☑ Velja <span class="bh-mono">${unsentIds.length}</span></button>` : ''}
            <button class="_ky-mark-all-paid bh-btn bh-btn--green bh-btn--sm" data-ids="${ids}" data-name="${esc(grp.display)}" type="button" title="Merkja allar kröfur sem greitt">✓ Allar greiddar</button>
          </div>
        </div>
        <div class="bh-table-wrap" style="border-radius:0;border:none;box-shadow:none">
          <div class="bh-table-scroll">
            <table class="bh-table" style="min-width:780px">
              <thead>
                <tr>
                  <th style="width:28px;padding-left:16px"></th>
                  <th style="width:100px">Nr.</th>
                  <th style="width:88px">Dags.</th>
                  <th>Staða</th>
                  <th class="cen" style="width:80px">Aldur</th>
                  <th class="num" style="width:130px">Upphæð</th>
                  <th class="cen" style="width:240px">Aðgerðir</th>
                </tr>
              </thead>
              <tbody>
                ${sales.map(s => {
                  const st = pickupStatus(s.num);
                  const da = daysAgo(s.created_at);
                  // 2026-06-30: 📎 fylgiskjal — leita úttektarskýrslu sömu ár.
                  let skyrslaBtn = '';
                  try {
                    if (window.CompanyAttachments && CompanyAttachments.list) {
                      const yr = String(new Date(s.created_at).getFullYear());
                      const candidateIds = [];
                      if (s.customer_id) candidateIds.push(s.customer_id);
                      const kt2 = (s.customer_kt || '').trim();
                      if (kt2 && _state.fyrirtIdsByKt && _state.fyrirtIdsByKt[kt2]) {
                        _state.fyrirtIdsByKt[kt2].forEach(id => { if (!candidateIds.includes(id)) candidateIds.push(id); });
                      }
                      let skyrsla = null, hitCoId = null;
                      for (const coId of candidateIds) {
                        const atts = CompanyAttachments.list(coId) || [];
                        const hit = atts.find(a => a && a.kind === 'skyrsla' && String(a.year || '') === yr);
                        if (hit) { skyrsla = hit; hitCoId = coId; break; }
                      }
                      if (skyrsla && hitCoId) {
                        skyrslaBtn = `<button class="_ky-skyrsla bh-btn bh-btn--xs" data-co-id="${hitCoId}" data-att-id="${esc(skyrsla.id || '')}" type="button" title="Úttektarskýrsla ${yr} — smelltu til að opna PDF (dragðu svo í Payday Drög sem fylgiskjal)" style="background:#eef3ff;color:#2f5fe0;border-color:#c6d6ff">📎 <span class="bh-mono">${yr}</span></button>`;
                      }
                    }
                  } catch (_) {}
                  const isChecked = _state.selected.has(s.id);
                  const checkboxCell = s.krafa_sent_at
                    ? ''
                    : `<label style="display:flex;align-items:center;justify-content:center;cursor:pointer;margin:0"><input type="checkbox" class="_ky-select" data-id="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:#2f5fe0"></label>`;
                  const statusChipCls = st.color === '#16a34a' ? 'bh-chip--done'
                                      : st.color === '#dc2626' ? 'bh-chip--overdue'
                                      : st.color === '#f59e0b' ? 'bh-chip--pending'
                                      : 'bh-chip--neutral';
                  const krafaBtn = s.krafa_sent_at
                    ? `<button class="_ky-krafa-toggle bh-btn bh-btn--xs" data-id="${s.id}" data-on="1" type="button" title="Krafa send ${fmtDate(s.krafa_sent_at)} — smelltu til að afhaka" style="background:#ecfdf5;color:#047857;border-color:#a7f3d0;font-weight:700">🏦 ✓ Send</button>`
                    : `<button class="_ky-krafa-toggle bh-btn bh-btn--xs bh-btn--light" data-id="${s.id}" type="button" title="Haka við þegar krafan hefur verið stofnuð í heimabankanum">🏦 Krafa</button>`;
                  return `
                    <tr>
                      <td style="padding-left:16px">${checkboxCell}</td>
                      <td class="mono" style="color:#3a4250;font-size:12.5px">${esc(s.num || '')}</td>
                      <td class="mono" style="color:#5b6472;font-size:12px">${fmtDate(s.created_at)}</td>
                      <td><span class="bh-chip ${statusChipCls}">${st.icon} ${esc(st.label)}</span></td>
                      <td class="cen mono" style="color:#9098a6;font-size:11.5px">${da != null ? da + ' d.' : ''}</td>
                      <td class="num mono" style="font-weight:700;color:#11141c;font-size:13px">${fmtKr(s.samtals)}</td>
                      <td>
                        <div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">
                          ${skyrslaBtn}
                          ${krafaBtn}
                          <button class="_ky-mark-paid bh-btn bh-btn--xs" data-id="${s.id}" type="button" title="Merkja sem greitt" style="background:#ecfdf5;color:#047857;border-color:#a7f3d0;font-weight:700">✓</button>
                          <button class="_ky-view-invoice bh-btn bh-btn--xs bh-btn--light" data-id="${s.id}" type="button" title="Skoða / prenta reikning" style="color:#2f5fe0">🖨</button>
                          <button class="_ky-open-editor bh-btn bh-btn--xs bh-btn--light" data-num="${esc(s.num)}" type="button" title="Opna í sölu-editor">✏️</button>
                          <button class="_ky-kredit bh-btn bh-btn--xs" data-id="${s.id}" type="button" title="Kreditfæra reikninginn" style="background:#fff7ed;color:#c2410c;border-color:#fed7aa">↩</button>
                        </div>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  // ── View invoice (SalaInvoice popup) ─────────────────────────────────────
  async function openInvoice(saleId) {
    const SB = getSB();
    if (!SB) return;
    if (!window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') {
      alert('Reikningsmótið er ekki tiltækt.'); return;
    }
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
    const r = await SB.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { w.close(); alert('Salan fannst ekki.'); return; }
    const sale = r.data;
    let cust = null;
    if (sale.customer_id) {
      // fyrirtaeki + vidskiptavinir have independent bigserials → low ids
      // overlap. Pull both and disambiguate by matching sale.customer_nafn.
      const [fRes, vRes] = await Promise.all([
        SB.from('fyrirtaeki').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
        SB.from('vidskiptavinir').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
      ]);
      const f = fRes.data, v = vRes.data;
      const norm = s => String(s || '').trim().toLowerCase();
      const saleNafn = norm(sale.customer_nafn);
      if (saleNafn) {
        if (f && norm(f.nafn) === saleNafn) cust = f;
        else if (v && norm(v.nafn) === saleNafn) cust = v;
      }
      if (!cust) cust = f || v || null;
    }
    SalaInvoice.renderFromSale(w, sale, cust);
  }

  // ── Sidebar badge ────────────────────────────────────────────────────────
  async function refreshBadge() {
    const btn = document.querySelector('.vnav-btn[data-view="' + NAV_KEY + '"]');
    if (!btn) return;
    const SB = getSB();
    if (!SB) return;
    try {
      const r = await SB.from('solur').select('id', { count: 'exact', head: true })
        .eq('greitt_med', 'reikningur')
        .is('paid_at', null);
      const badge = btn.querySelector('.ky-badge');
      if (!badge) return;
      const n = r.count || 0;
      if (n > 0) {
        badge.textContent = String(n);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    } catch (_) {}
  }

  function show() {
    ensureView();
    // Try the normal route first…
    try { if (window.App && App.switchView) App.switchView(NAV_KEY); } catch (_) {}
    // …then, ONLY if that didn't activate our view (e.g. a later patch replaced
    // App.switchView without chaining our case → the core hid all views and
    // showed nothing, "shuts itself off"), force it the class-based way the
    // core uses — clearing stale inline display so nothing strands.
    const v = document.getElementById(VIEW_ID);
    if (v && !v.classList.contains('active')) {
      try {
        document.querySelectorAll('[id^="view-"]').forEach(x => { x.classList.remove('active'); x.style.display = ''; });
        v.classList.add('active'); v.style.display = 'block';
        document.querySelectorAll('.vnav-btn').forEach(b =>
          b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
      } catch (_) {}
    }
    load();
  }

  // 2026-06-13: keep the nav button alive. It must never be in sidebar_hidden
  // for it to "shut off" — but to be bulletproof against ANY patch removing it,
  // re-inject if it ever goes missing (injectNav is idempotent — it no-ops when
  // the button is already present, so this is cheap). Debounced so a burst of
  // nav mutations on load collapses into one check.
  function guardButton() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(guardButton, 400); return; }
    let t = null;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(injectNav, 250); })
      .observe(nav, { childList: true, subtree: false });
  }

  injectNav();
  setTimeout(injectNav, 1000);
  setTimeout(injectNav, 3000);
  setTimeout(injectNav, 6000);
  guardButton();
  ensureView();
  patchSwitchView();
  setTimeout(refreshBadge, 2500);
  setTimeout(refreshBadge, 8000);
  document.addEventListener('sale-edited', () => setTimeout(refreshBadge, 600));

  window.KrofuYfirlit = { show, load, refreshBadge };
  console.log('[patch-166] Kröfu yfirlit installed — krafa í heimabanka per fyrirtæki');
})();
/* === END KRÖFU YFIRLIT === */
