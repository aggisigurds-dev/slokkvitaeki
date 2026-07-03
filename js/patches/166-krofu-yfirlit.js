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

  // ── Brunastál-scoped skin ──────────────────────────────────────────────────
  // The page title/subtitle/month sit on the dark top band of the Brunastál
  // page gradient, where the default dark ink is invisible. Under that preset
  // only, flip the title band to white (per THEME-SPEC) and give figures the
  // Space Mono treatment. Scoped so the light themes are untouched.
  (function injectSkin() {
    const ID = 'ky-brunastal-skin';
    if (document.getElementById(ID)) return;
    if (!document.getElementById('ky-fonts')) {
      const l = document.createElement('link');
      l.id = 'ky-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
      (document.head || document.documentElement).appendChild(l);
    }
    const s = document.createElement('style');
    s.id = ID;
    const V = '#view-krofu-yfirlit ';
    const B = 'html[data-thm-preset="brunastal"] #view-krofu-yfirlit ';
    s.textContent =
      // v3 handoff: light-metallic labelled action buttons (Krafa send / Greitt / …)
      V + '.ky-abtn{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:46px;height:42px;padding:0 7px;border-radius:9px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#ffffff,#dbe0e9);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.95),0 3px 6px -3px rgba(20,30,60,.3);cursor:pointer;font:inherit;transition:transform .12s ease,box-shadow .12s ease}' +
      V + '.ky-abtn:hover{transform:translateY(-1px);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.95),0 6px 12px -4px rgba(20,30,60,.42)}' +
      V + '.ky-abtn.on{background:linear-gradient(150deg,#2bbf6c,#0f6e3a);border-color:#156e3a;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 3px 7px -3px rgba(15,110,58,.5)}' +
      V + '.ky-row:hover{background:#f7f9fd}' +
      // Barely-visible per-krafa athugasemd/áminning reitur — svartur texti,
      // ósýnilegur rammi þar til hann er valinn.
      V + '._ky-note{color:#11141c !important;background:transparent !important;border:1px solid transparent !important;border-bottom:1px dashed #d7dce4 !important;border-radius:5px !important;box-shadow:none !important}' +
      V + '._ky-note::placeholder{color:#c8cfd9}' +
      V + '._ky-note:hover{border-bottom-color:#b6bec9 !important}' +
      V + '._ky-note:focus{background:#fff !important;border:1px solid #93c5fd !important}' +
      B + '.darkfield::placeholder{color:rgba(255,255,255,.55)}' +
      B + '.ky-navbtn option{background:#1a1a1f;color:#fff}' +
      // 2026-07-01 (Agnar): stretch the page to fill the content area and hug the
      // sidebar + top banner — was capped at 1200px centred (22px pad) which left
      // a wide right gutter + a top gap. Applies in every theme (not Brunastál-
      // scoped). The inner wrapper now contributes no padding; the view owns a
      // tight, uniform margin.
      '#view-krofu-yfirlit{padding:12px 18px 26px !important;max-width:none !important;box-sizing:border-box}' +
      B + '.ky-h1{color:#fff !important;font-size:26px !important;font-weight:800 !important;text-shadow:0 2px 8px rgba(0,0,0,.55)}' +
      B + '.ky-sub{color:rgba(255,255,255,.62) !important}' +
      B + '.ky-month{color:#fff !important}' +
      B + '.ky-navbtn{background:linear-gradient(145deg,#0b0b0d,#2a2a30 30%,#3c3c44 52%,#1a1a1f 74%,#08080a) !important;color:#fff !important;border-color:#0a0b0d !important}' +
      '#view-krofu-yfirlit .ky-num{font-variant-numeric:tabular-nums}' +
      B + ".ky-num{font-family:'Space Mono',ui-monospace,SFMono-Regular,Menlo,monospace !important}";
    (document.head || document.documentElement).appendChild(s);
  })();

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
  // Aggressive name key for cross-table matching: lowercase, strip diacritics,
  // drop punctuation (so "hf" == "hf."), collapse spaces. Used to recover a kt
  // for sales that were saved name-only (no kt/customer_id) — but ONLY when the
  // match is unambiguous (a single distinct kt for that key).
  function keyName(s) {
    return String(s || '')
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function ktDigits(s) { return String(s || '').replace(/\D+/g, ''); }

  // ── v3 handoff helpers ─────────────────────────────────────────────────────
  // Aging pill: green ≤30d · amber 31–60d · red >60d.
  function agingPill(days) {
    if (days == null) return '';
    const p = days > 60 ? { bg: '#fff1f2', tx: '#be123c', bd: '#fecdd3' }
            : days > 30 ? { bg: '#fffbeb', tx: '#b45309', bd: '#fde68a' }
            : { bg: '#ecfdf5', tx: '#047857', bd: '#a7f3d0' };
    return '<span class="ky-num" style="background:' + p.bg + ';color:' + p.tx + ';border:1px solid ' + p.bd + ';padding:2px 8px;border-radius:99px;font-size:10.5px;font-weight:700;white-space:nowrap">' + days + ' d.</span>';
  }
  // Light-metallic labelled action button (icon + tiny colored label).
  // filled=true → dark-metal green (used for a sent claim).
  function kyAbtn(cls, extra, glyph, label, color, title, filled) {
    return '<button class="' + cls + ' ky-abtn' + (filled ? ' on' : '') + '" ' + extra + ' type="button" title="' + esc(title) + '">' +
      '<span style="font-size:14px;line-height:1;color:' + (filled ? '#fff' : color) + '">' + glyph + '</span>' +
      '<span style="font-size:8.5px;font-weight:700;letter-spacing:.02em;color:' + (filled ? '#fff' : color) + '">' + esc(label) + '</span>' +
    '</button>';
  }

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
  let _state = { month: null, all: [], vbByParent: {}, sort: loadSort(),
                 selected: new Set(), sending: false, stop: false, search: '',
                 // Sýnarsía: 'krofur' (útistandandi, eins og áður) · 'osendar' ·
                 // 'greiddar' · 'allt' (bæði ógreiddar OG greiddar).
                 viewFilter: 'krofur' };

  // A sale is "sendanleg" (queueable) if it hasn't already been pushed to
  // Payday. krafa_sent_at / invoiced_at / dk_invoice_id all mark a sent claim —
  // re-sending would 409 in payday-push, so those rows get no checkbox.
  function isSendable(s) {
    return !s.paid_at && !s.krafa_sent_at && !s.invoiced_at && !s.dk_invoice_id;
  }

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
    let q = SB.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_base_id,customer_kt,samtals,greitt_med,athugasemdir,krafa_note,created_at,updated_at,paid_at,invoiced_at,krafa_sent_at,dk_invoice_id,is_credit,credit_of')
      .eq('greitt_med', 'reikningur');
    const vf = _state.viewFilter || 'krofur';
    if (vf === 'krofur')        q = q.is('paid_at', null);                      // útistandandi (eins og áður)
    else if (vf === 'osendar')  q = q.is('paid_at', null).is('krafa_sent_at', null).is('invoiced_at', null).is('dk_invoice_id', null); // ósendar
    else if (vf === 'greiddar') q = q.not('paid_at', 'is', null);              // greiddar kröfur
    // 'allt' → engin paid_at-sía (bæði ógreiddar OG greiddar)
    const r = await q.order('updated_at', { ascending: false });
    if (r.error) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    _state.all = r.data || [];

    // Fela BAKFÆRÐAR kröfur: kreditreikninga sjálfa (is_credit) OG upprunalega
    // reikninginn sem þeir bakfæra (credit_of → id). Þeir eru uppgerðir (nettó 0)
    // — röng reikningur + bakfærsla eiga ekki heima í útistandandi kröfum. Nýi
    // (réttur) reikningurinn stendur eftir. (Agnar 2026-07-03)
    {
      const creditedIds = new Set((_state.all || [])
        .filter(s => s.is_credit && s.credit_of != null)
        .map(s => String(s.credit_of)));
      if (creditedIds.size || (_state.all || []).some(s => s.is_credit)) {
        _state.all = (_state.all || []).filter(s => !s.is_credit && !creditedIds.has(String(s.id)));
      }
    }

    // Reconcile any pending selection against the freshly-loaded rows: drop ids
    // that are gone or no longer sendable (e.g. just pushed), so the bulk bar
    // count never counts a stale/sent claim.
    if (_state.selected.size) {
      const sendableIds = new Set((_state.all || []).filter(isSendable).map(s => String(s.id)));
      _state.selected.forEach(id => { if (!sendableIds.has(String(id))) _state.selected.delete(id); });
    }

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

    // ── Recover kt for sales saved name-only ────────────────────────────────
    // Some reikningur sales arrive with no customer_kt AND no usable id/base
    // link (the company name was typed free-hand in the POS "Án kennitölu" box).
    // Look the name up in fyrirtaeki / customers_base and remember the kt IF the
    // match is unambiguous (one distinct kt). This drives the display and, at
    // send time, a write-back so the Payday push has a kt to work with.
    _state.nameKt = {};   // keyName -> { kt, coId, baseId }
    {
      const hasKt = (s) => {
        if (s.customer_kt) return true;
        const fy = s.customer_id ? (_state.fyrirtMap || {})[s.customer_id] : null;
        if (fy && fy.kennitala) return true;
        const bb = s.customer_base_id ? (_state.baseMap || {})[s.customer_base_id] : null;
        return !!(bb && bb.kennitala);
      };
      const needKeys = new Set((_state.all || []).filter(s => !hasKt(s)).map(s => keyName(s.customer_nafn)).filter(Boolean));
      if (needKeys.size) {
        const acc = {};   // key -> { kts:Set, coId, baseId }
        const add = (nafn, kt, coId, baseId) => {
          const k = keyName(nafn); if (!k || !needKeys.has(k)) return;
          const d = ktDigits(kt); if (d.length !== 10) return;
          const e = acc[k] || (acc[k] = { kts: new Set(), coId: null, baseId: null });
          e.kts.add(d);
          if (coId != null && e.coId == null) e.coId = coId;
          if (baseId != null && e.baseId == null) e.baseId = baseId;
        };
        const [fyAll, baseAll] = await Promise.all([
          SB.from('fyrirtaeki').select('id,nafn,kennitala,customer_base_id'),
          SB.from('customers_base').select('id,nafn,kennitala'),
        ]);
        (fyAll.data || []).forEach(r => add(r.nafn, r.kennitala, r.id, r.customer_base_id));
        (baseAll.data || []).forEach(r => add(r.nafn, r.kennitala, null, r.id));
        Object.keys(acc).forEach(k => {
          const e = acc[k];
          if (e.kts.size === 1) {   // unambiguous only — never guess a kt onto a bill
            const d = Array.from(e.kts)[0];
            _state.nameKt[k] = { kt: d.slice(0, 6) + '-' + d.slice(6), coId: e.coId, baseId: e.baseId };
          }
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

  // ── Payday greiðslu-samstilling (summary popup) ──────────────────────────
  function showSyncSummary(data) {
    const old = document.getElementById('_ky-sync-modal'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = '_ky-sync-modal';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;font-family:\'Space Grotesk\',system-ui,sans-serif';
    let inner;
    if (data.error) {
      inner = '<div style="font-size:16px;font-weight:800;color:#dc2626;margin-bottom:8px">⚠️ Villa við samstillingu</div>' +
              '<div style="font-size:13px;color:#334155;white-space:pre-wrap;word-break:break-word">' + esc(String(data.error)) + '</div>';
    } else {
      const list = (data.marked || []).map(m =>
        '<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px">' +
          '<span style="font-weight:600;color:#11141c">' + esc(m.customer || '—') + ' <span style="color:#94a3b8;font-family:monospace;font-weight:400">' + esc(m.num || '') + '</span></span>' +
          '<span style="white-space:nowrap"><span style="font-family:monospace;color:#0f7a43;font-weight:700">' + fmtKr(m.amount) + '</span> <span style="color:#94a3b8;font-size:11px">' + esc(m.paidDate || '') + '</span></span>' +
        '</div>').join('');
      inner = '<div style="font-size:17px;font-weight:800;color:#0f7a43;margin-bottom:4px">✅ Samstillingu lokið</div>' +
        '<div style="font-size:12.5px;color:#64748b;margin-bottom:14px">Athugaði <b>' + (data.checked || 0) + '</b> reikninga í Payday · <b>' + (data.candidates || 0) + '</b> ógreiddar kröfur skoðaðar.' + (data.dry ? ' <b style="color:#b45309">(prufa — engu breytt)</b>' : '') + '</div>' +
        (data.marked_count
          ? '<div style="font-weight:700;color:#11141c;margin-bottom:4px">' + data.marked_count + ' krafa merkt greidd:</div><div style="max-height:320px;overflow:auto">' + list + '</div>'
          : '<div style="padding:16px;text-align:center;color:#64748b;background:#f8fafc;border-radius:10px">Engin ný greiðsla fannst — allt þegar uppfært. 👍</div>');
    }
    wrap.innerHTML = '<div style="background:#fff;border-radius:16px;padding:22px 24px;max-width:540px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.35)">' + inner +
      '<div style="text-align:right;margin-top:18px"><button id="_ky-sync-close" type="button" style="padding:9px 20px;border:none;border-radius:9px;background:#1d4ed8;color:#fff;font-weight:700;cursor:pointer;font:inherit">Loka</button></div></div>';
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    wrap.querySelector('#_ky-sync-close').addEventListener('click', close);
  }

  async function runPaydaySync(btn) {
    if (!btn || btn.disabled) return;
    const orig = btn.textContent;
    btn.disabled = true; btn.style.opacity = '.6'; btn.textContent = '⏳ Sæki úr Payday…';
    try {
      const res = await fetch('/api/payday-sync-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({ error: 'Ógilt svar frá þjóni (HTTP ' + res.status + ')' }));
      if (!res.ok && !data.error) data.error = 'HTTP ' + res.status;
      showSyncSummary(data);
      if (!data.error && data.marked_count) await load(_state.month || new Date()); // ný render → nýr takki
    } catch (e) {
      showSyncSummary({ error: String(e.message || e) });
    } finally {
      const b = document.querySelector('#ky-main ._ky-sync');
      if (b) { b.disabled = false; b.style.opacity = ''; b.textContent = orig; }
    }
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

    // ── Search filter — matches company name, kt (any source incl. recovered),
    //    or a sale/reikningur number. Numeric query also matches kt digits. ──
    const q = (_state.search || '').trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    function coKt(g) {
      const s0 = g.sales[0] || {};
      const fy = g.id ? (_state.fyrirtMap || {})[g.id] : null;
      const baseRow = s0.customer_base_id ? (_state.baseMap || {})[s0.customer_base_id] : null;
      const rec = (_state.nameKt || {})[keyName(g.display)];
      return (s0.customer_kt) || (fy && fy.kennitala) || (baseRow && baseRow.kennitala) || (rec && rec.kt) || '';
    }
    const shown = !q ? companies : companies.filter(g => {
      if (normName(g.display).indexOf(q) !== -1) return true;
      if (qDigits.length >= 3 && ktDigits(coKt(g)).indexOf(qDigits) !== -1) return true;
      if (g.sales.some(s => String(s.num || '').toLowerCase().indexOf(q) !== -1)) return true;
      return false;
    });

    const monthLabel = _state.month.getFullYear() + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];

    main.innerHTML = `
      <div style="max-width:none;margin:0;padding:0;width:100%">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">
          <div>
            <h1 class="ky-h1" style="margin:0;font-size:24px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:10px">📄 Kröfu yfirlit</h1>
            <div class="ky-sub" style="font-size:12px;color:#64748b;margin-top:2px">Krafa í heimabanka — sölur með greitt_med = "Senda reikning" sem þarf að safna saman í lok mánaðar</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="_ky-prev ky-navbtn" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">◀</button>
            <div class="ky-month" style="font-size:13px;font-weight:700;color:#0f172a;padding:0 8px;min-width:140px;text-align:center">${esc(monthLabel)}</div>
            <button class="_ky-next ky-navbtn" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">▶</button>
            <select class="_ky-sort ky-navbtn" title="Raða" style="margin-left:6px;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;font-size:12.5px;font-weight:600;color:#475569;cursor:pointer">
              <option value="updated_desc"${_state.sort === 'updated_desc' ? ' selected' : ''}>🕐 Nýlega breytt fyrst</option>
              <option value="created_desc"${_state.sort === 'created_desc' ? ' selected' : ''}>📅 Nýjast stofnað</option>
              <option value="created_asc"${_state.sort === 'created_asc' ? ' selected' : ''}>📅 Elst stofnað</option>
              <option value="amount_desc"${_state.sort === 'amount_desc' ? ' selected' : ''}>💰 Hæsta upphæð</option>
              <option value="amount_asc"${_state.sort === 'amount_asc' ? ' selected' : ''}>💰 Lægsta upphæð</option>
            </select>
            <input class="_ky-search ky-navbtn darkfield" type="search" placeholder="🔍 Leita (nafn · kt · R-nr)…" value="${esc(_state.search)}" style="margin-left:6px;padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;font-size:13px;min-width:210px">
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          ${[['krofur','📋 Sýna kröfur'],['osendar','📤 Ósendar kröfur'],['greiddar','✅ Greiddar kröfur'],['allt','📚 Sýna allt']].map(([k, label]) => {
            const on = (_state.viewFilter || 'krofur') === k;
            return `<button class="_ky-vf" data-vf="${k}" type="button" style="padding:7px 14px;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;${on ? 'border:1px solid #1d4ed8;background:#1d4ed8;color:#fff' : 'border:1px solid #cbd5e1;background:#fff;color:#475569'}">${label}</button>`;
          }).join('')}
          <button class="_ky-sync" type="button" title="Sækja greiðslustöðu úr Payday og merkja greiddar kröfur sjálfkrafa" style="margin-left:auto;padding:7px 14px;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;border:1px solid #0f7a43;background:linear-gradient(180deg,#17945a,#0f6e3a);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 8px -4px rgba(0,0,0,.4)">🔄 Athuga greiðslur í Payday</button>
        </div>

        ${(() => {
          const CS = '0 1px 1px rgba(15,23,42,.05),0 8px 16px -8px rgba(15,23,42,.15),0 24px 44px -20px rgba(15,23,42,.3),inset 0 2px 0 rgba(255,255,255,.95),inset 0 -10px 20px -14px rgba(15,23,42,.14)';
          const light = (label, value, sub, ic, icbg, glow) =>
            `<div style="flex:1 1 240px;min-width:240px;border-radius:18px;padding:15px 17px;display:flex;align-items:center;gap:13px;background:linear-gradient(180deg,#ffffff,#eef1f6);box-shadow:${CS}">
              <div style="width:46px;height:46px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;background:${icbg};box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 -3px 6px rgba(0,0,0,.25),0 4px 10px -3px ${glow}">${ic}</div>
              <div style="min-width:0">
                <div style="font-size:10.5px;font-weight:700;letter-spacing:.14em;color:#8a93a5;text-transform:uppercase">${esc(label)}</div>
                <div class="ky-num" style="font-size:24px;font-weight:700;color:#11141c;margin-top:2px;white-space:nowrap">${fmtKr(value)}</div>
                <div style="font-size:11px;color:#9098a6;margin-top:1px">${esc(sub)}</div>
              </div>
            </div>`;
          const hero = (label, value, sub, ic, grad, glowShadow) =>
            `<div style="flex:1 1 240px;min-width:240px;border-radius:18px;padding:15px 17px;display:flex;align-items:center;gap:13px;background:${grad};box-shadow:0 1px 1px rgba(15,23,42,.05),0 10px 20px -8px rgba(15,23,42,.25),${glowShadow},inset 0 1px 0 rgba(255,255,255,.45)">
              <div style="width:46px;height:46px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;background:rgba(255,255,255,.16);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 -3px 6px rgba(0,0,0,.2)">${ic}</div>
              <div style="min-width:0">
                <div style="font-size:10.5px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,.72);text-transform:uppercase">${esc(label)}</div>
                <div class="ky-num" style="font-size:24px;font-weight:700;color:#fff;margin-top:2px;white-space:nowrap">${fmtKr(value)}</div>
                <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:1px">${esc(sub)}</div>
              </div>
            </div>`;
          return '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">' +
            light('Þessi mánuður', thisMonthTotal, thisMonth.length + ' kröfur', '📄', 'linear-gradient(180deg,#5a86e0,#2f5fe0)', 'rgba(47,95,224,.5)') +
            light('Eldri ógreitt', olderTotal, older.length + ' kröfur', '⏳', 'linear-gradient(180deg,#d4a94f,#ab7f2a)', 'rgba(171,127,42,.45)') +
            hero('Heildarkröfur', grandTotal, all.length + ' sölur · ' + companies.length + ' fyrirtæki', '💰', 'linear-gradient(150deg,#6f97ff 0%,#2f5fe0 34%,#1c3d8c 60%,#0b1838 100%)', '0 26px 46px -20px rgba(20,40,120,.5)') +
            hero('Sendar kröfur', sentTotal, sent.length + ' sölur · ' + sentCompanies + ' fyrirtæki', '🏦', 'linear-gradient(150deg,#37c6a6 0%,#0f9d78 34%,#0a5f52 60%,#062f2b 100%)', '0 26px 46px -20px rgba(10,90,80,.5)') +
          '</div>';
        })()}

        <div style="font-size:12.5px;color:#5b6472;margin-bottom:14px;padding:11px 15px;background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:14px;box-shadow:0 8px 22px -16px rgba(25,35,60,.18);line-height:1.5">
          💡 Útistandandi kröfur per fyrirtæki sem þarf að setja í heimabankann.
          Þegar krafan er mynduð, smelltu <b style="color:#0f7a43">„✓ Allar greiddar"</b> til að hreinsa þær út.
        </div>

        ${q && companies.length ? `<div style="font-size:12px;color:#64748b;margin-bottom:10px">🔍 ${shown.length} af ${companies.length} fyrirtækjum passa við „${esc(_state.search)}"</div>` : ''}

        ${shown.length
          ? shown.map(renderCompany).join('')
          : (q
              ? '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:40px;text-align:center;color:#94a3b8;font-style:italic">Ekkert fyrirtæki passar við „' + esc(_state.search) + '"</div>'
              : '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:40px;text-align:center;color:#94a3b8;font-style:italic">Engar útistandandi kröfur 🎉</div>')}

      </div>
      <div id="ky-bulkbar"></div>`;

    main.querySelector('._ky-sort')?.addEventListener('change', e => {
      _state.sort = e.target.value;
      saveSort(_state.sort);
      render();
    });
    main.querySelector('._ky-search')?.addEventListener('input', e => {
      _state.search = e.target.value;
      render();
      // render() rebuilds innerHTML → the input is replaced; restore focus+caret.
      const el = document.querySelector('#ky-main ._ky-search');
      if (el) { el.focus(); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (_) {} }
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
    // Sýnarsía: kröfur / ósendar / greiddar / allt
    main.querySelectorAll('._ky-vf').forEach(b => b.addEventListener('click', () => {
      if (_state.viewFilter === b.dataset.vf) return;
      _state.viewFilter = b.dataset.vf;
      _state.selected.clear();
      load(_state.month || new Date());
    }));
    // 🔄 Athuga greiðslur í Payday → merkja greiddar sjálfkrafa + summary popup
    main.querySelector('._ky-sync')?.addEventListener('click', (e) => runPaydaySync(e.currentTarget));
    // Per-krafa minnispunktur → EIGIN reitur solur.krafa_note (EKKI athugasemd
    // reikningsins) þegar farið er úr reitnum (change = eftir edit, ekki hvern
    // staf). Uppfærir líka _state svo texti helst við endur-render.
    main.querySelectorAll('._ky-note').forEach(inp => {
      inp.addEventListener('change', async () => {
        const SB = getSB(); if (!SB) return;
        const val = inp.value.trim();
        const row = (_state.all || []).find(x => String(x.id) === String(inp.dataset.id));
        if (row) row.krafa_note = val;
        inp.style.borderBottomColor = '#a7f3d0';
        const w = await SB.from('solur').update({ krafa_note: val }).eq('id', inp.dataset.id);
        if (w && w.error) { inp.style.borderBottomColor = '#fca5a5'; inp.title = 'Villa við vistun: ' + w.error.message; }
      });
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
        if (!confirm('Senda kröfu í Payday núna?\n\nSendist sjálfkrafa (rafrænt ef kúnni tekur við því, annars í tölvupósti). Viltu bara DRÖG? Hakaðu við kröfuna og notaðu „📤 Í Payday sem drög".')) return;
        b.disabled = true; b.textContent = '⏳ Sendir…';
        try {
          const sale = (_state.all || []).find(s => String(s.id) === String(id));
          if (sale) {
            const ke = await ensureKtForSale(sale);
            if (!ke.ok) throw new Error('Vantar kennitölu — fannst ekki út frá nafni. Skráðu kt á kúnnann fyrst.');
          }
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
    main.querySelectorAll('._ky-nyjan').forEach(b => {
      b.addEventListener('click', () => openNewSaleFor(b.dataset.kt, b.dataset.nafn));
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

    // ── Bulk-select checkboxes → selection set + sticky send bar ─────────────
    main.querySelectorAll('._ky-pick').forEach(cb => {
      cb.checked = _state.selected.has(String(cb.dataset.id));
      cb.addEventListener('change', () => {
        const id = String(cb.dataset.id);
        if (cb.checked) _state.selected.add(id); else _state.selected.delete(id);
        syncCoChecks(); updateBulkBar();
      });
    });
    main.querySelectorAll('._ky-pick-co').forEach(cb => {
      cb.addEventListener('change', () => {
        const ids = String(cb.dataset.ids || '').split(',').filter(Boolean);
        if (cb.checked) ids.forEach(id => _state.selected.add(String(id)));
        else ids.forEach(id => _state.selected.delete(String(id)));
        syncRowChecks(); syncCoChecks(); updateBulkBar();
      });
    });
    syncCoChecks();
    updateBulkBar();

    refreshBadge();
  }

  // ── Bulk Payday send helpers ───────────────────────────────────────────────
  function kyMain() { return document.getElementById('ky-main'); }
  function syncRowChecks() {
    const main = kyMain(); if (!main) return;
    main.querySelectorAll('._ky-pick').forEach(rc => { rc.checked = _state.selected.has(String(rc.dataset.id)); });
  }
  function syncCoChecks() {
    const main = kyMain(); if (!main) return;
    main.querySelectorAll('._ky-pick-co').forEach(cb => {
      const ids = String(cb.dataset.ids || '').split(',').filter(Boolean);
      const sel = ids.filter(id => _state.selected.has(String(id)));
      cb.checked = ids.length > 0 && sel.length === ids.length;
      cb.indeterminate = sel.length > 0 && sel.length < ids.length;
    });
  }
  function selectedSales() {
    return (_state.all || []).filter(s => _state.selected.has(String(s.id)) && isSendable(s));
  }

  // Make sure the sale row carries a kt before we push to Payday. If the sale
  // was saved name-only, write back the unambiguous name-matched kt (+ links)
  // first — that's the fix for POS "Án kennitölu" claims losing their kt.
  async function ensureKtForSale(sale) {
    if (sale.customer_kt) return { ok: true };
    const fy = sale.customer_id ? (_state.fyrirtMap || {})[sale.customer_id] : null;
    if (fy && fy.kennitala) return { ok: true };
    const bb = sale.customer_base_id ? (_state.baseMap || {})[sale.customer_base_id] : null;
    if (bb && bb.kennitala) return { ok: true };
    const rec = (_state.nameKt || {})[keyName(sale.customer_nafn)];
    if (!rec || !rec.kt) return { ok: false };
    const SB = getSB(); if (!SB) return { ok: false };
    const patch = { customer_kt: rec.kt };
    if (rec.coId != null && sale.customer_id == null) patch.customer_id = rec.coId;
    if (rec.baseId != null && sale.customer_base_id == null) patch.customer_base_id = rec.baseId;
    const r = await SB.from('solur').update(patch).eq('id', sale.id);
    if (r.error) return { ok: false, error: r.error.message };
    Object.assign(sale, patch);   // reflect locally so the UI updates on reload
    return { ok: true, linked: true, kt: rec.kt };
  }

  // Cancellable delay — resolves early if the user hits ⏹ Stöðva.
  function sleep(ms) {
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; clearInterval(iv); clearTimeout(t); resolve(); };
      const t = setTimeout(finish, ms);
      const iv = setInterval(() => { if (_state.stop) finish(); }, 120);
    });
  }

  function updateBulkBar() {
    const bar = document.getElementById('ky-bulkbar');
    if (!bar || _state.sending) return;   // the queue owns the bar while sending
    const sel = selectedSales();
    if (!sel.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
    const total = sel.reduce((s, x) => s + (parseFloat(x.samtals) || 0), 0);
    // How many of the selected still need a kt recovered / are unresolvable.
    const noKt = sel.filter(s => {
      if (s.customer_kt) return false;
      const fy = s.customer_id ? (_state.fyrirtMap || {})[s.customer_id] : null;
      if (fy && fy.kennitala) return false;
      const bb = s.customer_base_id ? (_state.baseMap || {})[s.customer_base_id] : null;
      if (bb && bb.kennitala) return false;
      return !((_state.nameKt || {})[keyName(s.customer_nafn)]);
    }).length;
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:100060;background:#0f172a;color:#fff;box-shadow:0 -8px 24px rgba(0,0,0,.28);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap';
    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
      + '<span style="font-weight:800;font-size:15px">🏦 ' + sel.length + ' ' + (sel.length === 1 ? 'krafa valin' : 'kröfur valdar') + '</span>'
      + '<span style="font-family:ui-monospace,monospace;font-size:14px;color:#bae6fd">' + fmtKr(total) + '</span>'
      + (noKt ? '<span style="font-size:11.5px;color:#fca5a5;background:#450a0a;border:1px solid #7f1d1d;padding:2px 8px;border-radius:99px">⚠️ ' + noKt + ' án kt</span>' : '')
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<button id="_ky-bulk-clear" type="button" style="padding:8px 12px;border:1px solid #334155;background:transparent;color:#cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px">Hreinsa</button>'
      + '<button id="_ky-bulk-draft" type="button" title="Stofna aðeins drög í Payday — þú sendir handvirkt þaðan (líka fyrir kúnna sem taka ekki við rafrænum)" style="padding:9px 16px;border:1px solid #64748b;background:#334155;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13.5px;font-weight:700">📤 Í Payday sem drög</button>'
      + '<button id="_ky-bulk-send" type="button" title="Senda sjálfkrafa (rafrænt ef hægt, annars tölvupóstur)" style="padding:9px 16px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13.5px;font-weight:700">🏦 Senda valdar í Payday</button>'
      + '</div>';
    bar.style.display = '';
    bar.querySelector('#_ky-bulk-clear').addEventListener('click', () => {
      _state.selected.clear(); syncRowChecks(); syncCoChecks(); updateBulkBar();
    });
    bar.querySelector('#_ky-bulk-draft').addEventListener('click', () => sendSelectedQueue('draft'));
    bar.querySelector('#_ky-bulk-send').addEventListener('click', () => sendSelectedQueue('send'));
  }

  async function sendSelectedQueue(mode) {
    if (_state.sending) return;
    mode = mode === 'draft' ? 'draft' : 'send';
    const sel = selectedSales();
    if (!sel.length) return;
    const note = mode === 'draft'
      ? 'Aðeins DRÖG verða stofnuð í Payday — þú sendir þau handvirkt þaðan.'
      : 'Reikningar SENDAST sjálfkrafa (rafrænt ef kúnni tekur við því, annars í tölvupósti).';
    if (!confirm((mode === 'draft' ? 'Stofna drög fyrir ' : 'Senda ') + sel.length + ' ' + (sel.length === 1 ? 'kröfu' : 'kröfur') + ' í Payday?\n\nEin og ein, ~6 sek á milli. ' + note)) return;
    _state.sending = true; _state.stop = false;
    const bar = document.getElementById('ky-bulkbar');
    const DELAY = 6000;
    const results = [];
    function renderProgress(done, statusText) {
      if (!bar) return;
      const pct = Math.round((done / sel.length) * 100);
      bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:100060;background:#0f172a;color:#fff;box-shadow:0 -8px 24px rgba(0,0,0,.28);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap';
      bar.style.display = '';
      bar.innerHTML =
        '<div style="flex:1;min-width:220px">'
        + '<div style="font-weight:700;font-size:14px;margin-bottom:6px">🏦 Sendi kröfur í Payday… ' + done + '/' + sel.length + '</div>'
        + '<div style="height:6px;background:#1e293b;border-radius:99px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#2563eb,#38bdf8);transition:width .3s"></div></div>'
        + '<div style="font-size:11.5px;color:#94a3b8;margin-top:5px">' + esc(statusText || '') + '</div>'
        + '</div>'
        + '<button id="_ky-bulk-stop" type="button" style="padding:9px 14px;border:1px solid #7f1d1d;background:#450a0a;color:#fecaca;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">⏹ Stöðva</button>';
      const sb = bar.querySelector('#_ky-bulk-stop');
      if (sb) sb.addEventListener('click', () => { _state.stop = true; sb.textContent = '⏹ Stöðva… (klára núverandi)'; sb.disabled = true; });
    }
    renderProgress(0, 'Undirbý…');
    let sent = 0, failed = 0, skipped = 0;
    for (let i = 0; i < sel.length; i++) {
      if (_state.stop) { skipped = sel.length - i; break; }
      const sale = sel[i];
      renderProgress(i, (sale.num || '') + ' · ' + (sale.customer_nafn || ''));
      try {
        const ke = await ensureKtForSale(sale);
        if (!ke.ok) { failed++; results.push({ num: sale.num, ok: false, error: 'vantar kt' }); }
        else {
          const r = await fetch('/api/payday-push', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sale_id: sale.id, mode }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
          sent++; results.push({ num: sale.num, ok: true });
          _state.selected.delete(String(sale.id));
        }
      } catch (e) {
        failed++; results.push({ num: sale.num, ok: false, error: (e.message || String(e)) });
      }
      renderProgress(i + 1, '✓ Sendar: ' + sent + ' · ✗ Villur: ' + failed);
      if (i < sel.length - 1 && !_state.stop) await sleep(DELAY);
    }
    _state.sending = false; _state.stop = false;
    const failLines = results.filter(r => !r.ok).map(r => '• ' + (r.num || '?') + ': ' + (r.error || 'villa')).join('\n');
    alert('🏦 Payday sendingar\n\n✓ Sendar: ' + sent + '\n✗ Villur: ' + failed +
      (skipped ? ('\n⏸ Sleppt (stöðvað): ' + skipped) : '') +
      (failLines ? ('\n\n' + failLines) : ''));
    await load(_state.month);
    refreshBadge();
  }

  function renderCompany(grp) {
    // Sort sales chronological asc within the company card for easier review.
    const sales = grp.sales.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const ids = sales.map(s => s.id).join(',');
    const totalStr = String(Math.round(grp.sum));
    // Ids of claims not yet pushed to Payday — these get a pick checkbox and are
    // what the company "select all" toggles.
    const sendableIds = sales.filter(isSendable).map(s => s.id);

    // 2026-06-30: sýna kt + email fyrir Payday-undirbúning. Lestir í þessari röð:
    // 1) solur.customer_kt — POS-authoritative
    // 2) fyrirtaeki via customer_id
    // 3) customers_base via customer_base_id (einstaklings-kúnnar lenda hér)
    const fy = grp.id ? (_state.fyrirtMap || {})[grp.id] : null;
    const firstSale = sales[0] || {};
    const baseRow = firstSale.customer_base_id ? (_state.baseMap || {})[firstSale.customer_base_id] : null;
    const directKt = (firstSale.customer_kt) || (fy && fy.kennitala) || (baseRow && baseRow.kennitala) || null;
    // Name-recovered kt (only when nothing direct) — shown with 🔗 so it's clear
    // it was auto-matched by name; it gets written back on Payday send.
    const recovered = !directKt ? (_state.nameKt || {})[keyName(grp.display)] : null;
    const email = (fy && fy.netfang) || (baseRow && baseRow.netfang) || null;
    const ktHtml = directKt
      ? '<span style="color:#475569;font-family:ui-monospace,Menlo,monospace;font-size:11px">' + esc(directKt) + '</span>'
      : recovered
        ? '<span title="kt fannst sjálfkrafa út frá nafni — vistast við sendingu í Payday" style="color:#b45309;font-family:ui-monospace,Menlo,monospace;font-size:11px">🔗 ' + esc(recovered.kt) + '</span>'
        : '<span style="color:#dc2626;font-weight:700">⚠️ vantar kt</span>';
    const meta = [
      ktHtml,
      email ? '<span style="color:#0369a1">📧 ' + esc(email) + '</span>'
            : '<span style="color:#b45309">⚠️ vantar netfang</span>',
    ].join(' · ');

    // Smella á nafn fyrirtækisins → opna fyrirtækjasíðu (data-co-id click handler binds below)
    const nameHtml = grp.id
      ? `<a href="#" class="_ky-co-link" data-co-id="${grp.id}" style="color:#0f172a;text-decoration:none;border-bottom:1px dotted #94a3b8;cursor:pointer">${esc(grp.display)}</a>`
      : esc(grp.display);

    // Aging distribution across the company's claims → mini bar + oldest days.
    let agG = 0, agA = 0, agR = 0, oldestD = 0;
    sales.forEach(s => { const d = daysAgo(s.created_at) || 0; const amt = parseFloat(s.samtals) || 0; if (d > oldestD) oldestD = d; if (d > 60) agR += amt; else if (d > 30) agA += amt; else agG += amt; });
    const agTot = agG + agA + agR || 1;
    const agBar = '<div style="height:6px;border-radius:99px;overflow:hidden;display:flex;background:#eef1f6;width:180px;max-width:44vw;margin-top:6px">' +
      (agG ? '<div style="width:' + (agG / agTot * 100) + '%;background:#22c55e"></div>' : '') +
      (agA ? '<div style="width:' + (agA / agTot * 100) + '%;background:#f59e0b"></div>' : '') +
      (agR ? '<div style="width:' + (agR / agTot * 100) + '%;background:#ef4444"></div>' : '') +
    '</div>';
    const oldestLbl = oldestD > 60 ? 'elstu 60+ d.' : ('elstu ' + oldestD + ' d.');

    return `
      <div style="background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:16px;margin-bottom:12px;overflow:hidden;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)">
        <div style="padding:14px 18px;border-bottom:1px solid #eef1f6;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:flex-start;gap:12px">
            ${sendableIds.length
              ? `<label style="display:flex;align-items:center;padding-top:4px;cursor:pointer" title="Velja allar ósendar kröfur hjá ${esc(grp.display)}"><input type="checkbox" class="_ky-pick-co" data-ids="${sendableIds.join(',')}" style="width:17px;height:17px;cursor:pointer;accent-color:#2f5fe0"></label>`
              : ''}
            <div>
              <div style="font-weight:800;color:#11141c;font-size:16px">${nameHtml}</div>
              <div style="font-size:11px;color:#8a93a5;margin-top:2px">${meta}</div>
              ${agBar}
              <div style="font-size:11px;color:#8a93a5;margin-top:4px">${sales.length} kröfur${grp.olderSum > 0 ? ' · <span style="color:#b45309">eldra: ' + fmtKr(grp.olderSum) + '</span>' : ''} · ${oldestLbl}</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <div style="text-align:right">
              <div style="font-size:10px;color:#8a93a5;text-transform:uppercase;letter-spacing:.1em;font-weight:700">Krafa</div>
              <div class="ky-num" style="font-size:22px;font-weight:700;color:#2f5fe0">${fmtKr(grp.sum)}</div>
            </div>
            <button class="_ky-copy-total" data-value="${esc(totalStr)}" type="button" title="Afrita upphæð" style="width:38px;height:38px;background:#f1f5f9;color:#475569;border:1px solid rgba(20,24,34,.14);border-radius:10px;cursor:pointer;font:inherit;font-size:13px">📋</button>
            <button class="_ky-mark-all-paid" data-ids="${ids}" data-name="${esc(grp.display)}" type="button" title="Merkja allar kröfur sem greitt" style="height:40px;padding:0 16px;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border:1px solid #156e3a;border-radius:11px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)">✓ Allar greiddar</button>
          </div>
        </div>
        <div>
          ${sales.map(s => {
            const da = daysAgo(s.created_at);
            // 2026-06-30: 📎 fylgiskjal — leita úttektarskýrslu sömu ár.
            let skyrslaBtn = '';
            try {
              if (window.CompanyAttachments && CompanyAttachments.list) {
                const yr = String(new Date(s.created_at).getFullYear());
                const candidateIds = [];
                if (s.customer_id) candidateIds.push(s.customer_id);
                const kt = (s.customer_kt || '').trim();
                if (kt && _state.fyrirtIdsByKt && _state.fyrirtIdsByKt[kt]) {
                  _state.fyrirtIdsByKt[kt].forEach(id => { if (!candidateIds.includes(id)) candidateIds.push(id); });
                }
                let skyrsla = null, hitCoId = null;
                for (const coId of candidateIds) {
                  const atts = CompanyAttachments.list(coId) || [];
                  const hit = atts.find(a => a && a.kind === 'skyrsla' && String(a.year || '') === yr);
                  if (hit) { skyrsla = hit; hitCoId = coId; break; }
                }
                if (skyrsla && hitCoId) {
                  skyrslaBtn = `<button class="_ky-skyrsla" data-co-id="${hitCoId}" data-att-id="${esc(skyrsla.id || '')}" type="button" title="Úttektarskýrsla ${yr} — smelltu til að opna PDF (dragðu svo í Payday Drög sem fylgiskjal)" style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;background:#fff;color:#3a4250;border:1px solid rgba(20,24,34,.16);border-radius:8px;cursor:pointer;font:inherit;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 2px rgba(15,23,42,.05)">📄 Skýrsla ${yr}</button>`;
                }
              }
            } catch (_) {}
            return `
              <div class="ky-row" style="display:flex;align-items:center;gap:12px;padding:9px 18px;border-bottom:1px solid #f3f5f9;font-size:12.5px">
                ${isSendable(s)
                  ? `<input type="checkbox" class="_ky-pick" data-id="${s.id}" data-amount="${Math.round(parseFloat(s.samtals) || 0)}" title="Velja kröfu í Payday-sendingu" style="width:15px;height:15px;cursor:pointer;accent-color:#2f5fe0;flex-shrink:0">`
                  : '<span style="width:15px;flex-shrink:0"></span>'}
                <span class="ky-num" style="color:#1d4ed8;font-weight:700;width:92px;flex-shrink:0">${esc(s.num || '')}</span>
                <span class="ky-num" style="color:#64748b;width:86px;flex-shrink:0">${fmtDate(s.created_at)}</span>
                ${agingPill(da)}
                ${skyrslaBtn}
                <input class="_ky-note" data-id="${s.id}" value="${esc(s.krafa_note || '')}" placeholder="🗒 minnispunktur (t.d. senda í tölvupósti · finna netfang)…" title="Minnispunktur fyrir þessa kröfu — eigin reitur (ekki athugasemd reikningsins). Vistast sjálfkrafa." style="flex:1;min-width:60px;margin:0 10px;padding:4px 8px;border:1px solid transparent;border-bottom:1px dashed #d3d9e2;background:transparent;font:inherit;font-size:12px;color:#11141c;outline:none;border-radius:5px">
                <span class="ky-num" style="text-align:right;font-weight:700;color:#11141c;white-space:nowrap">${fmtKr(s.samtals)}</span>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  ${kyAbtn('_ky-krafa-toggle', 'data-id="' + s.id + '"' + (s.krafa_sent_at ? ' data-on="1"' : ''), '🏦', 'Krafa send', '#0f7a43', s.krafa_sent_at ? ('Krafa send ' + fmtDate(s.krafa_sent_at) + ' — smelltu til að afhaka') : 'Senda kröfu í Payday (drag)', !!s.krafa_sent_at)}
                  ${kyAbtn('_ky-mark-paid', 'data-id="' + s.id + '"', '✓', 'Greitt', '#0f7a43', 'Merkja sem greitt', false)}
                  ${kyAbtn('_ky-view-invoice', 'data-id="' + s.id + '"', '🖨', 'Reikning', '#2f5fe0', 'Skoða / prenta reikning', false)}
                  ${kyAbtn('_ky-open-editor', 'data-num="' + esc(s.num) + '"', '✎', 'Breyta', '#c2410c', 'Opna í sölu-editor', false)}
                  ${kyAbtn('_ky-kredit', 'data-id="' + s.id + '"', '↩', 'Bakfæra', '#dc2626', 'Bakfæra (kreditfæra) reikninginn', false)}
                  ${kyAbtn('_ky-nyjan', 'data-kt="' + esc(s.customer_kt || '') + '" data-nafn="' + esc(s.customer_nafn || '') + '"', '＋', 'Nýr', '#0f7a43', 'Ný sala fyrir þennan viðskiptavin (opnar Sölu með kt tilbúið)', false)}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // ── „＋ Nýjan" — open Sala (POS) for this customer to redo the sale ───────
  // Prefills the kt so pos.js's lookup loads the customer + auto-applies their
  // saved afsláttur (patch 255). Exposed as window.SalaNyjan so Hreyfingarlisti
  // reuses the exact same behaviour.
  function openNewSaleFor(kt, nafn) {
    const digits = String(kt || '').replace(/[^0-9]/g, '');
    try { if (window.App && App.switchView) App.switchView('sala'); } catch (_) {}
    let tries = 0;
    (function go() {
      const ktInp = document.getElementById('pos-kt');
      if (ktInp) {
        if (digits.length === 10 && digits !== '9999999999') {
          ktInp.value = digits.slice(0, 6) + '-' + digits.slice(6);
          ktInp.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
      }
      if (tries === 1) { try { location.hash = '#sala'; } catch (_) {} }  // fallback nav
      if (tries++ < 40) setTimeout(go, 150);
    })();
  }
  window.SalaNyjan = openNewSaleFor;

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
