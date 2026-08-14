/* === HREYFINGARLISTI v1 ===
 *
 * Tímaröð yfir allar hreyfingar í `solur`: sölur + kreditfærslur, með
 * mánaðar-nav, samantekt og CSV útflutningi. Útvíkkar Bókhalds yfirlit
 * með einföldu ledger-flæði — eitt línur per færsla, raðað eftir tíma.
 *
 * Sidebar entry "📜 Hreyfingarlisti" rétt fyrir neðan Bókhalds yfirlit.
 */
(() => {
  if (window.__hreyfingarlistiInstalled) return;
  window.__hreyfingarlistiInstalled = true;

  const VIEW_ID = 'view-hreyfingarlisti';
  const NAV_KEY = 'hreyfingarlisti';

  // ── App-wide view-mode (📱 Sími / ▦ Tafla / 🖥 Skjár) ──────────────────────
  // The toggle itself lives in the Brunastál banner (patch 166); here we only
  // READ the current mode off html[data-viewmode] and re-render our own layout.
  const VM_MODES = ['mobile', 'table', 'desktop'];
  function getViewMode() {
    const m = document.documentElement.dataset.viewmode;
    return VM_MODES.indexOf(m) >= 0 ? m : 'desktop';
  }

  // v3 "dark gradients" skin (handoff 2026-07-02): fonts + hover/abtn5 recipes.
  // The header bar is always dark now, so the title reads white on every theme.
  (function injectSkin() {
    if (document.getElementById('hl-brunastal-skin')) return;
    if (!document.getElementById('hl-fonts')) {
      const l = document.createElement('link');
      l.id = 'hl-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
      (document.head || document.documentElement).appendChild(l);
    }
    const s = document.createElement('style');
    s.id = 'hl-brunastal-skin';
    const V = '#view-hreyfingarlisti ';
    s.textContent =
      V + '.hl-mono{font-family:\'Space Mono\',ui-monospace,monospace}' +
      V + 'tbody tr{transition:background .12s ease}' +
      V + 'tbody tr:hover{background:#f3f6fc}' +
      V + '.darkfield::placeholder{color:rgba(255,255,255,.55)}' +
      V + '._hr-sort{transition:background .12s ease}' +
      V + '._hr-sort:hover{background:rgba(255,255,255,.07)}' +
      V + '.abtn5{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:50px;height:44px;padding:0 8px;border-radius:10px;border:1px solid rgba(20,24,34,.22);background:linear-gradient(180deg,#ffffff,#dbe0e9);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.95),0 3px 7px -3px rgba(20,30,60,.32);cursor:pointer;font:inherit;transition:transform .12s ease,box-shadow .12s ease}' +
      V + '.abtn5:hover{transform:translateY(-1px);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.95),0 6px 13px -4px rgba(20,30,60,.42)}' +
      // ── ▦ Tafla (table) mode — dense, fast-scan data table, sticky dark header ──
      V + '.hl-table{width:100%;border-collapse:collapse;font-size:12px}' +
      V + '.hl-table th{position:sticky;top:0;z-index:1;background:#0f172a;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;text-align:left;padding:7px 9px;white-space:nowrap;user-select:none}' +
      V + '.hl-table th._hr-sort{cursor:pointer}' +
      V + '.hl-table th._hr-sort:hover{background:#1e293b}' +
      V + '.hl-table td{padding:5px 9px;border-bottom:1px solid #f1f5f9;vertical-align:middle;color:#11141c}' +
      V + '.hl-table tr.hl-trow:hover td{background:#f7f9fd}' +
      V + '.hl-ticon{width:29px;height:29px;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;line-height:1;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#e7ebf1);transition:transform .1s ease}' +
      V + '.hl-ticon:hover{transform:translateY(-1px)}' +
      // ── 📱 Sími (mobile) mode — single-column stacked cards, big taps, wrap ──
      V + '.hl-mcard{background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:14px;margin-bottom:11px;overflow:hidden;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)}' +
      V + '.hl-mhead{padding:12px 13px 11px;border-bottom:1px solid #eef1f6}' +
      V + '.hl-macts{display:flex;gap:7px;padding:10px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap}' +
      V + '.hl-macts .abtn5{flex-shrink:0}' +
      // Let the .thm .app-page dark band fill the view flush (theme.css owns the look now).
      '#view-hreyfingarlisti{padding:0 !important;max-width:none !important;background:transparent !important}' +
      // 2026-07-30 (Verkefnalisti 7e68b092): app.css `.main-panel{max-width:1200px}`
      // þrengdi #hr-main svo borðið stoppaði í 1200px og stórt autt svæði sat eftir
      // hægra megin (ON-reglan í 230 nær aðeins yfir Brunastál + banner á). ID-sértæknin
      // (2,1,1) slær bæði app.css og 245-skinnið; taflan skrunar áfram lárétt inni í
      // .data-table-scroll á þröngum skjám. Hliðar-padding kemur frá .thm .app-main.
      '#view-hreyfingarlisti #hr-main.main-panel{max-width:none !important;width:100% !important;padding:0 !important;box-sizing:border-box}' +
      // „Sía lista"-reiturinn: .field-dark (hvítur texti á hálfgagnsæju hvítu) var
      // ólæsilegur/ósýnilegur þar sem stál-stigullinn (patch 224) er orðinn ljósgrár
      // við síuröðina → ljós útgáfa með dökkum texta, í stíl við hvítu kortin og
      // chippana á sama svæði. Sértækni (1,2,0) slær .thm .app-page .field-dark
      // vörðinn í theme-scoped.css (0,3,0). Kennitölu-leitin efst (tool-lookup)
      // situr á dökka bandinu og heldur sínum dökka stíl óbreyttum.
      '#view-hreyfingarlisti .filter-search .field-dark{background:#fff !important;color:#11141c !important;border:1px solid rgba(20,24,34,.18) !important;box-shadow:0 1px 2px rgba(15,23,42,.1) !important}' +
      '#view-hreyfingarlisti .filter-search .field-dark::placeholder{color:#8a93a5 !important}' +
      '#view-hreyfingarlisti .filter-search svg{color:#5b6472 !important}';
    (document.head || document.documentElement).appendChild(s);
  })();

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    const neg = v < 0;
    return (neg ? '−' : '') + Math.abs(v).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  // Grænn „✓ greitt <dags>" undirmerki þegar salan var GREIDD annan dag en hún
  // var skráð — t.d. tæki úr hleðslu sótt+greitt löngu eftir móttöku.
  function paidNote(s) {
    if (!s.paid_at) return '';
    if (fmtDate(s.paid_at) === fmtDate(s.created_at)) return '';
    return '<div class="hl-mono" style="font-size:10px;color:#16a34a;font-weight:700;margin-top:1px">✓ greitt ' + esc(fmtDate(s.paid_at)) + '</div>';
  }
  // „Síðasta hreyfing" = nýjasti tímastimpill sölunnar: greitt / breytt / skráð.
  // ISO-strengir raðast rétt í stafrófsröð svo hæsta gildið = nýjast.
  function lastAct(s) {
    return [s.paid_at, s.updated_at, s.created_at].filter(Boolean).map(String).sort().pop() || '';
  }
  // Sérstakur „Greitt · síðast" dálkur: sýnir GREIÐSLU-/síðustu-hreyfingar-dag
  // (grænt ef greitt) svo tæki sem er sótt+greitt löngu eftir móttöku sjáist á
  // réttum degi. „—" ef ekkert gerðist eftir skráningu.
  function greittCell(s) {
    if (s.paid_at) {
      return '<span class="hl-mono" style="font-size:11px;color:#16a34a;font-weight:700">✓ ' + esc(fmtDate(s.paid_at)) + '</span> <span class="hl-mono" style="font-size:10px;color:#16a34a">' + esc(fmtTime(s.paid_at)) + '</span>';
    }
    // 4-þrepa staðan (2026-08-14): void/drog mega aldrei líta út sem ógreitt.
    if (String(s.status || '') === 'void') return '<span style="font-size:10.5px;color:#64748b;font-weight:700">↩ Bakfært</span>';
    if (String(s.status || '') === 'drog') return '<span style="font-size:10.5px;color:#64748b;font-weight:700">✎ Drög</span>';
    const la = lastAct(s);
    if (la && new Date(la) > new Date(s.created_at) && fmtDate(la) !== fmtDate(s.created_at)) {
      return '<span class="hl-mono" style="font-size:11px;color:#64748b">' + esc(fmtDate(la)) + '</span> <span class="hl-mono" style="font-size:10px;color:#94a3b8">' + esc(fmtTime(la)) + '</span>';
    }
    return '<span style="color:#cbd5e1">—</span>';
  }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function methodLabel(m) {
    if (m === 'kort') return '💳 Kort';
    if (m === 'pening' || m === 'reidufe' || m === 'peningar') return '💵 Reiðufé';
    if (m === 'reikningur') return '📋 Reikningur';
    if (m === 'greitt_sidar') return '⏳ Greitt síðar';
    return esc(m || '—');
  }

  // ── v3 metallic status/tag buttons (filled gradient + white text) ──────────
  const GRAD = {
    sala:   'linear-gradient(145deg,#2a4c8f,#183363 45%,#0a1a3a 75%,#122750)',
    green:  'linear-gradient(145deg,#2f9d63,#166b3c 42%,#083f22 72%,#125a32)',
    blue:   'linear-gradient(145deg,#5a86e0,#2f5fe0 42%,#1a3a8c 72%,#2d55c4)',
    gold:   'linear-gradient(145deg,#d4a94f,#ab7f2a 42%,#775213 72%,#9c7828)',
    purple: 'linear-gradient(145deg,#a98ff0,#7c53d6 42%,#4c2b9e 72%,#7a52cc)',
    slate:  'linear-gradient(145deg,#6b7280,#3f4650 45%,#23282f 75%,#3a4048)'
  };
  function metalBtn(label, grad) {
    return '<span style="display:inline-block;font-family:inherit;font-size:12px;font-weight:600;color:#fff;' +
      'border-radius:8px;padding:3px 11px;background:' + grad +
      ';box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),inset 0 -2px 4px rgba(0,0,0,.24),0 2px 5px -2px rgba(20,30,60,.4);' +
      'text-shadow:0 1px 1px rgba(0,0,0,.3);filter:saturate(.74);white-space:nowrap">' + esc(label) + '</span>';
  }
  function methodBtn(m) {
    if (m === 'kort') return metalBtn('Kort', GRAD.green);
    if (m === 'reikningur') return metalBtn('Reikningur', GRAD.blue);
    if (m === 'greitt_sidar') return metalBtn('Greitt síðar', GRAD.gold);
    if (m === 'pening' || m === 'reidufe' || m === 'peningar') return metalBtn('Reiðufé', GRAD.green);
    return m ? metalBtn(String(m), GRAD.slate) : '<span style="color:#cbd5e1">—</span>';
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const byBtn = Array.from(nav.querySelectorAll('.vnav-btn'))
      .find(b => /Bókhalds yfirlit|Bokhalds yfirlit/.test(b.textContent || ''));
    const tpl = byBtn || nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">📜</span>Hreyfingarlisti';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    if (byBtn && byBtn.parentNode) byBtn.parentNode.insertBefore(btn, byBtn.nextSibling);
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
    v.innerHTML = '<main id="hr-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function patchSwitchView() {
    if (!window.App || window.App._hrSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._hrSwitchPatched = true;
  }

  // ── Data load ────────────────────────────────────────────────────────────
  let _state = { month: null, all: [], filter: 'all', search: '', sortKey: 'greitt', sortDir: 'desc', mode: 'month', ktInfo: null, scope: 'month' };

  // 2026-07-01: customer lookup by NAME or KENNITALA — pull a customer's WHOLE
  // sölu-/reikningasaga (all time, not month-bounded) so "sendu mér kvittun frá
  // í síðustu viku" is one search. Must accept the NAME too, not just kt: many
  // POS sales stored the name but lost the kt/customer_id (see Gjörvaverk), so a
  // kt-only lookup would miss exactly those receipts. kt is also stored
  // inconsistently (with/without dash), so match both forms.
  function ktDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function ktDashed(d) { return d && d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  // Kennitala cell: real kt → dashed mono; walk-in 999999-9999 → subtle badge;
  // empty (legacy, not yet backfilled) → dash.
  function ktCell(kt) {
    const d = ktDigits(kt);
    if (d === '9999999999') return '<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:1px 8px;border-radius:99px;font-size:10px;font-weight:700">Staðgr.</span>';
    if (d.length === 10) return '<span style="font-family:\'Space Mono\',monospace;font-size:11px;color:#475569">' + esc(ktDashed(d)) + '</span>';
    return kt ? '<span style="font-family:monospace;font-size:11px;color:#475569">' + esc(kt) + '</span>' : '<span style="color:#cbd5e1">—</span>';
  }
  // Sanitise a value for embedding inside a PostgREST .or() list (commas /
  // parens / quotes are the delimiters there).
  function orSafe(s) { return String(s == null ? '' : s).replace(/["(),*]/g, ' ').trim(); }

  async function lookupCustomer(qRaw) {
    const main = document.getElementById('hr-main');
    if (!main) return;
    const q = String(qRaw == null ? '' : qRaw).trim();
    if (q.length < 2) { if (window.Toast && Toast.show) Toast.show('Sláðu inn nafn eða kennitölu'); return; }
    const SB = getSB();
    if (!SB) return;
    main.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8">Leita að sögu kúnna…</div>';
    const kt = ktDigits(q);
    const isKt = kt.length >= 7;                 // ≥7 digits → treat as kennitala
    const dashed = ktDashed(kt);

    // 1) Resolve the customer row(s) — by kt (exact, both forms) or by name (ilike).
    const custFilter = isKt
      ? 'kennitala.eq.' + kt + (dashed !== kt ? ',kennitala.eq.' + dashed : '')
      : 'nafn.ilike.*' + orSafe(q) + '*';
    const [fR, vR] = await Promise.all([
      SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').is('deleted_at', null).or(custFilter),
      SB.from('vidskiptavinir').select('id,nafn,kennitala,heimilisfang').or(custFilter),
    ]);
    const custRows = [...(fR.data || []), ...(vR.data || [])];
    const ids = custRows.map(r => r.id).filter(x => x != null);
    const names = [...new Set(custRows.map(r => r.nafn).filter(Boolean))];
    const kts = [...new Set(custRows.map(r => ktDigits(r.kennitala)).filter(x => x && x.length === 10))];
    if (isKt && kt.length === 10 && !kts.includes(kt)) kts.push(kt);

    // 2) Match sales: by id-set OR exact/loose name OR a kt stamped in the note
    //    (name-only recovery). Include the typed name too, so a walk-in sale that
    //    was never linked to a customer row is still found.
    const parts = [];
    if (ids.length) parts.push('customer_id.in.(' + ids.join(',') + ')');
    const nameSet = [...new Set([...names, ...(isKt ? [] : [q])])].map(orSafe).filter(Boolean);
    if (nameSet.length) parts.push('customer_nafn.in.(' + nameSet.map(n => '"' + n + '"').join(',') + ')');
    if (!isKt) parts.push('customer_nafn.ilike.*' + orSafe(q) + '*');
    // The customer_kt column is now the reliable link (POS writes it + backfill).
    // Match it directly, plus the legacy kt-in-note fallback.
    kts.forEach(k => {
      const d = ktDashed(k);
      parts.push('customer_kt.eq.' + k); if (d !== k) parts.push('customer_kt.eq.' + d);
      parts.push('athugasemdir.ilike.*' + k + '*'); if (d !== k) parts.push('athugasemdir.ilike.*' + d + '*');
    });
    if (!parts.length) { main.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Enginn kúnni fannst fyrir „' + esc(q) + '".</div>'; return; }

    const r = await SB.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,upphaed_an_vsk,vsk_upphaed,greitt_med,athugasemdir,created_at,updated_at,paid_at,is_credit,credit_of,starfsmadur,status')
      .or(parts.join(','))
      .order('created_at', { ascending: false })
      .limit(1000);
    if (r.error) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    const nafn = (custRows[0] && custRows[0].nafn) || (r.data && r.data[0] && r.data[0].customer_nafn) || q;
    _state.mode = 'kt';
    _state.ktInfo = { query: q, nafn, ktFmt: kts[0] ? ktDashed(kts[0]) : (isKt ? dashed : ''), locs: custRows.length };
    _state.filter = 'all';
    _state.search = '';
    _state.all = r.data || [];
    render();
  }

  function exitKt() {
    _state.mode = 'month';
    _state.ktInfo = null;
    load(_state.month || new Date());
  }

  function monthBounds(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }

  async function load(filterMonth) {
    const main = document.getElementById('hr-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:32px;text-align:center;color:#94a3b8">Hleður hreyfingum…</div>';
    const SB = getSB();
    if (!SB) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Engin gagnabankatenging.</div>'; return; }

    const m = filterMonth || _state.month || new Date();
    _state.month = m;

    // 2026-07-01: scope — Mánuður (default) · Ár (whole year) · Allt (all time).
    let q = SB.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,upphaed_an_vsk,vsk_upphaed,greitt_med,athugasemdir,created_at,updated_at,paid_at,is_credit,credit_of,starfsmadur,status')
      .order('created_at', { ascending: false });
    if (_state.scope === 'all') {
      q = q.limit(5000);
    } else if (_state.scope === 'year') {
      const ys = new Date(m.getFullYear(), 0, 1), ye = new Date(m.getFullYear() + 1, 0, 1);
      q = q.gte('created_at', ys.toISOString()).lt('created_at', ye.toISOString()).limit(5000);
    } else {
      const { start, end } = monthBounds(m);
      q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    }
    const r = await q;
    if (r.error) { main.innerHTML = '<div style="padding:32px;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    _state.all = r.data || [];

    render();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function applyFilter(rows) {
    if (_state.filter === 'paid')   return rows.filter(r => r.paid_at && !r.is_credit);
    if (_state.filter === 'unpaid') return rows.filter(r => !r.paid_at && !r.is_credit);
    if (_state.filter === 'credit') return rows.filter(r => r.is_credit);
    return rows;
  }

  // 2026-06-23 (#4 smálagfæring): free-text search + clickable column sort.
  function searchMatch(s, q) {
    if (!q) return true;
    return [s.num, s.customer_nafn, s.greitt_med, s.starfsmadur, s.samtals]
      .map(x => String(x == null ? '' : x).toLowerCase()).join(' ').includes(q);
  }
  function sortRows(rows) {
    const k = _state.sortKey, dir = _state.sortDir === 'asc' ? 1 : -1;
    const val = s => {
      switch (k) {
        case 'num':            return String(s.num || '');
        case 'customer_nafn':  return String(s.customer_nafn || '').toLowerCase();
        case 'greitt_med':     return String(s.greitt_med || '');
        case 'tegund':         return s.is_credit ? 1 : 0;
        case 'stada':          return s.is_credit ? 2 : (s.paid_at ? 0 : 1);
        case 'samtals':        return s.is_credit ? -Math.abs(+s.samtals || 0) : (+s.samtals || 0);
        case 'greitt':         return lastAct(s);   // greitt/breytt/skráð — nýjast fyrst
        default:               return String(s.created_at || '');
      }
    };
    return rows.slice().sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return -dir;
      if (va > vb) return dir;
      // tiebreak: newest first (keeps "skjal most recent on top" intuitive)
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
  }
  function sortArrow(key) {
    if (_state.sortKey !== key) return '<span style="opacity:.3">↕</span>';
    return _state.sortDir === 'asc' ? '▲' : '▼';
  }
  function th(key, label, align) {
    return `<th class="_hr-sort" data-k="${key}" style="padding:12px 14px;text-align:${align || 'left'};font-size:10px;font-weight:700;color:#e8ecf4;text-transform:uppercase;letter-spacing:.11em;cursor:pointer;user-select:none;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.4)">${esc(label)} <span style="font-size:9px;font-weight:400;opacity:.75">${sortArrow(key)}</span></th>`;
  }
  function thPlain(label, align) {
    return `<th style="padding:12px 14px;text-align:${align || 'left'};font-size:10px;font-weight:700;color:#e8ecf4;text-transform:uppercase;letter-spacing:.11em;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.4)">${esc(label)}</th>`;
  }

  function render() {
    const main = document.getElementById('hr-main');
    if (!main) return;

    const all = _state.all;
    const q = String(_state.search || '').trim().toLowerCase();
    const rows = sortRows(applyFilter(all).filter(r => searchMatch(r, q)));

    // Totals computed against the FULL month, not the filter — gives a stable
    // picture of the month while the chips slice the visible list.
    let sales = 0, credits = 0, paidIn = 0, unpaidOut = 0;
    all.forEach(s => {
      const total = +s.samtals || 0;
      if (s.is_credit) credits += Math.abs(total);
      else {
        sales += total;
        if (s.paid_at) paidIn += total;
        else if (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur') unpaidOut += total;
      }
    });
    const net = sales - credits;

    const monthLabel = _state.month.getFullYear() + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];
    const scopeLabel = _state.scope === 'all' ? 'Allar færslur'
      : _state.scope === 'year' ? String(_state.month.getFullYear())
      : monthLabel;

    const chipDef = [
      ['all',    'Allt',       all.length],
      ['paid',   'Greitt',     all.filter(r => r.paid_at && !r.is_credit).length],
      ['unpaid', 'Ógreitt',    all.filter(r => !r.paid_at && !r.is_credit).length],
      ['credit', 'Kredit',     all.filter(r => r.is_credit).length]
    ];

    const greittLabel = (_state.mode === 'kt' || _state.scope !== 'month') ? 'Greitt' : 'Greitt í mán.';
    const darkBtn = 'padding:8px 11px;border:1px solid rgba(255,255,255,.16);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font:inherit;font-size:13px';
    main.innerHTML = `
      <div class="thm"><div class="app-page"><main class="app-main">

        <!-- title (plain, on the dark band) + tools -->
        <div class="page-title">
          <div class="page-title__lead">
            <span class="page-title__icon">📜</span>
            <div style="min-width:0">
              <h1>Hreyfingarlisti</h1>
              ${_state.mode === 'kt' && _state.ktInfo
                ? `<p>👤 <b style="color:#fff">${esc(_state.ktInfo.nafn)}</b>${_state.ktInfo.ktFmt ? ' · kt. ' + esc(_state.ktInfo.ktFmt) : ''} · ${_state.all.length} færslur${_state.ktInfo.locs > 1 ? ' · 📍 ' + _state.ktInfo.locs + ' staðsetningar' : ''}</p>`
                : `<p>Tímaröð yfir allar færslur — smelltu á dálk til að raða</p>`}
            </div>
          </div>
          <div class="page-title__tools">
            ${_state.mode === 'kt'
              ? `<button class="_hr-back btn btn--dark" type="button">← Mánaðaryfirlit</button>`
              : `${_state.scope !== 'all' ? '<button class="_hr-prev tool-dark" type="button">◀</button>' : ''}
                 <span class="tool-month">${esc(scopeLabel)}</span>
                 ${_state.scope !== 'all' ? '<button class="_hr-next tool-dark" type="button">▶</button>' : ''}
                 <div class="seg">${['month','year','all'].map(s => { const on = _state.scope === s; const lbl = { month: 'Mán', year: 'Ár', all: 'Allt' }[s];
                     return '<button class="_hr-scope' + (on ? ' is-active' : '') + '" data-s="' + s + '" type="button">' + lbl + '</button>'; }).join('')}</div>`}
            <input class="_hr-ktlookup field-dark tool-lookup" type="text" placeholder="🔎 Kennitala eða nafn…" value="${_state.mode === 'kt' && _state.ktInfo ? esc(_state.ktInfo.query) : ''}" title="Sláðu inn kennitölu eða nafn og ýttu á Enter til að sjá ALLAR sölur/reikninga kúnnans">
            <button class="_hr-csv btn btn--dark" type="button">⭳ CSV</button>
          </div>
        </div>

        <!-- stat cards -->
        <div class="stat-row">
          <div class="stat-card"><span class="stat-card__icon">💰</span><div><div class="stat-card__label">SÖLUR</div><div class="stat-card__value">${esc(fmtKr(sales))}</div></div></div>
          <div class="stat-card stat-card--red"><span class="stat-card__icon">↩</span><div><div class="stat-card__label">KREDITFÆRT</div><div class="stat-card__value">${esc(fmtKr(-credits))}</div></div></div>
          <div class="stat-card stat-card--green"><span class="stat-card__icon">✓</span><div><div class="stat-card__label">${esc((greittLabel || '').toUpperCase())}</div><div class="stat-card__value">${esc(fmtKr(paidIn))}</div></div></div>
          <div class="stat-card stat-card--amber"><span class="stat-card__icon">⏳</span><div><div class="stat-card__label">ÓGREITT</div><div class="stat-card__value">${esc(fmtKr(unpaidOut))}</div></div></div>
          <div class="stat-card stat-card--hero"><span class="stat-card__icon">∑</span><div><div class="stat-card__label">NETTÓ</div><div class="stat-card__value">${esc(fmtKr(net))}</div></div></div>
        </div>

        <!-- filter chips + search -->
        <div class="filter-row">
          ${chipDef.map(([k, label, n]) => `<button class="_hr-chip filter-chip${_state.filter === k ? ' is-active' : ''}" data-k="${k}" type="button">${esc(label)} <span>${n}</span></button>`).join('')}
          <div class="filter-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input class="_hr-search field-dark" type="text" placeholder="Sía lista…" value="${esc(_state.search)}">
          </div>
        </div>

        <!-- list — layout differs per view-mode (📱 / ▦ / 🖥); data + hooks identical -->
        ${listHtml(rows)}

      </main></div></div>`;

    // Prev/next step by month (Mán scope) or year (Ár scope). Hidden in Allt.
    const _step = dir => {
      const m = new Date(_state.month);
      if (_state.scope === 'year') m.setFullYear(m.getFullYear() + dir);
      else m.setMonth(m.getMonth() + dir);
      load(m);
    };
    main.querySelector('._hr-prev')?.addEventListener('click', () => _step(-1));
    main.querySelector('._hr-next')?.addEventListener('click', () => _step(1));
    main.querySelectorAll('._hr-scope').forEach(b => b.addEventListener('click', () => {
      if (_state.scope === b.dataset.s) return;
      _state.scope = b.dataset.s;
      load(_state.month || new Date());
    }));
    main.querySelector('._hr-csv')?.addEventListener('click', exportCSV);
    main.querySelectorAll('._hr-chip').forEach(c => {
      c.addEventListener('click', () => { _state.filter = c.dataset.k; render(); });
    });
    main.querySelectorAll('._hr-sort').forEach(h => {
      h.addEventListener('click', () => {
        const k = h.dataset.k;
        if (_state.sortKey === k) _state.sortDir = _state.sortDir === 'asc' ? 'desc' : 'asc';
        else { _state.sortKey = k; _state.sortDir = (k === 'created_at' || k === 'greitt' || k === 'samtals') ? 'desc' : 'asc'; }
        render();
      });
    });
    const _si = main.querySelector('._hr-search');
    if (_si) _si.addEventListener('input', () => {
      _state.search = _si.value;
      render();
      const el = document.querySelector('._hr-search');
      if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (_) {} }
    });
    main.querySelectorAll('._hr-view').forEach(b => {
      b.addEventListener('click', () => openInvoice(b.dataset.id));
    });
    main.querySelectorAll('._hr-send').forEach(b => {
      b.addEventListener('click', () => sendReceipt(b.dataset.id));
    });
    main.querySelectorAll('._hr-edit').forEach(b => {
      b.addEventListener('click', () => {
        if (window.SaleEditor && SaleEditor.openById) SaleEditor.openById(b.dataset.id);
        else alert('Sölu-editor ekki tiltækur.');
      });
    });
    main.querySelectorAll('._hr-bakfaera-nyjan').forEach(b => {
      b.addEventListener('click', async () => {
        if (!window.CreditInvoice || !CreditInvoice.open) { alert('Kreditfærslueining ekki tiltæk.'); return; }
        if (typeof window.SalaNyjan !== 'function') { alert('Sala-eining ekki tiltæk.'); return; }
        const SB = getSB(); if (!SB) return;
        const r = await SB.from('solur')
          .select('id,num,customer_nafn,customer_id,customer_kt,samtals,upphaed_an_vsk,vsk_upphaed,linur,greitt_med')
          .eq('id', b.dataset.id).single();
        if (r.error || !r.data) { alert('Salan fannst ekki.'); return; }
        const d = r.data;
        const lines = Array.isArray(d.linur) ? d.linur : [];
        CreditInvoice.open({
          id: d.id, num: d.num, customer: d.customer_nafn, customer_id: d.customer_id,
          total: +(d.samtals || 0), ex: +(d.upphaed_an_vsk || 0), vsk: +(d.vsk_upphaed || 0),
          lines, payment: d.greitt_med
        });
        // Once the credit modal closes (whether confirmed or cancelled), open a
        // fresh sale for the same customer with the original lines copied in —
        // that's the "og nýtt" half of this button (verkefnalisti d18b707d).
        setTimeout(() => {
          const modal = document.getElementById('ci-modal');
          if (!modal) { window.SalaNyjan(d.customer_kt, d.customer_nafn, lines); return; }
          const obs = new MutationObserver(() => {
            if (modal.style.display === 'none' || !document.body.contains(modal)) {
              obs.disconnect();
              load(_state.month || new Date());
              window.SalaNyjan(d.customer_kt, d.customer_nafn, lines);
            }
          });
          obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
        }, 300);
      });
    });
    main.querySelectorAll('._hr-bakfaera').forEach(b => {
      b.addEventListener('click', async () => {
        if (!window.CreditInvoice || !CreditInvoice.open) { alert('Kreditfærslueining ekki tiltæk.'); return; }
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
        // Refresh the list once the credit modal closes.
        setTimeout(() => {
          const modal = document.getElementById('ci-modal');
          if (!modal) return;
          const obs = new MutationObserver(() => {
            if (modal.style.display === 'none' || !document.body.contains(modal)) { obs.disconnect(); load(_state.month || new Date()); }
          });
          obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
        }, 300);
      });
    });
    // Kennitala/nafn lookup — Enter pulls the customer's whole history.
    const _kl = main.querySelector('._hr-ktlookup');
    if (_kl) _kl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); lookupCustomer(_kl.value); }
    });
    main.querySelector('._hr-back')?.addEventListener('click', exitKt);
    // Company name → fyrirtækjaspjald. solur.customer_id is a fyrirtaeki id (FK),
    // which is exactly what _openCompanySafe / Companies.openDetail expect. Use
    // the loading-safe opener (patch 164) when present.
    main.querySelectorAll('._hr-co').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const id = +a.dataset.id;
      try {
        if (typeof window._openCompanySafe === 'function') window._openCompanySafe(id);
        else if (window.Companies && typeof Companies.openDetail === 'function') Companies.openDetail(id);
        else location.hash = '#company/' + id;
      } catch (_) { location.hash = '#company/' + id; }
    }));
  }

  function statCard3d(label, value, kind) {
    const K = {
      blue:  { ic: '💰', icbg: 'linear-gradient(180deg,#5a86e0,#2f5fe0)', glow: 'rgba(47,95,224,.5)',  val: '#11141c' },
      red:   { ic: '↩',  icbg: 'linear-gradient(180deg,#f0584c,#c62f26)', glow: 'rgba(198,47,38,.45)', val: '#be123c' },
      green: { ic: '✓',  icbg: 'linear-gradient(180deg,#2f9d63,#0f6e3a)', glow: 'rgba(15,110,58,.45)', val: '#0f7a43' },
      gold:  { ic: '⏳', icbg: 'linear-gradient(180deg,#d4a94f,#ab7f2a)', glow: 'rgba(171,127,42,.45)', val: '#b45309' }
    };
    const shadow = '0 1px 1px rgba(15,23,42,.05),0 8px 16px -8px rgba(15,23,42,.15),0 24px 44px -20px rgba(15,23,42,.3),inset 0 2px 0 rgba(255,255,255,.95),inset 0 -10px 20px -14px rgba(15,23,42,.14)';
    const wrap = (bg, extraShadow, iconTile, labelCol, valCol) =>
      '<div style="flex:1 1 195px;min-width:195px;border-radius:15px;padding:11px 14px;display:flex;align-items:center;gap:11px;background:' + bg + ';box-shadow:' + extraShadow + '">' +
        iconTile +
        '<div style="min-width:0">' +
          '<div style="font-size:9.5px;font-weight:700;letter-spacing:.12em;color:' + labelCol + ';text-transform:uppercase">' + esc(label) + '</div>' +
          '<div class="hl-mono" style="font-size:20px;font-weight:700;color:' + valCol + ';margin-top:2px;white-space:nowrap">' + esc(fmtKr(value)) + '</div>' +
        '</div>' +
      '</div>';
    if (kind === 'hero') {
      const tile = '<div style="width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;background:rgba(255,255,255,.16);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 -3px 6px rgba(0,0,0,.2)">Σ</div>';
      return wrap('linear-gradient(150deg,#6f97ff 0%,#2f5fe0 34%,#1c3d8c 60%,#0b1838 100%)',
        '0 1px 1px rgba(15,23,42,.05),0 8px 16px -8px rgba(15,23,42,.25),0 20px 38px -20px rgba(20,40,120,.5),inset 0 1px 0 rgba(255,255,255,.45)',
        tile, 'rgba(255,255,255,.72)', '#fff');
    }
    const k = K[kind] || K.blue;
    const tile = '<div style="width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;background:' + k.icbg + ';box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 -3px 6px rgba(0,0,0,.25),0 4px 10px -3px ' + k.glow + '">' + k.ic + '</div>';
    return wrap('linear-gradient(180deg,#ffffff,#eef1f6)', shadow, tile, '#8a93a5', k.val);
  }

  // One light-metallic action button (icon + tiny colored label).
  function abtn(cls, extra, glyph, label, color, title) {
    return '<button class="' + cls + ' abtn5" ' + extra + ' type="button" title="' + esc(title) + '">' +
      '<span style="font-size:15px;line-height:1;color:' + color + '">' + glyph + '</span>' +
      '<span style="font-size:8.5px;font-weight:700;letter-spacing:.02em;color:' + color + '">' + esc(label) + '</span>' +
    '</button>';
  }

  // ── Shared per-row bits (identical data + hooks across all three layouts) ───
  function custNameHtml(s) {
    return s.customer_id
      ? `<a class="_hr-co" data-id="${s.customer_id}" href="#company/${s.customer_id}" title="Opna fyrirtækjaspjald" style="color:#1d4ed8;text-decoration:none;cursor:pointer">${esc(s.customer_nafn || '—')}</a>`
      : esc(s.customer_nafn || '—');
  }
  function typeBtnFor(s) { return s.is_credit ? metalBtn('↩ Kredit', GRAD.purple) : metalBtn('Sala', GRAD.sala); }
  function statusBtnFor(s) {
    const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
    return s.is_credit ? metalBtn('↩ Kredit', GRAD.purple)
      : s.paid_at ? metalBtn('✓ Greitt', GRAD.green)
      : isInvoice ? metalBtn('⚠ Ógreitt', GRAD.gold)
      : '<span style="color:#94a3b8;font-size:12px">—</span>';
  }
  function amountHtml(s) {
    const total = +s.samtals || 0;
    return s.is_credit
      ? `<span class="hl-mono" style="color:#dc2626;font-weight:700">${esc(fmtKr(-Math.abs(total)))}</span>`
      : `<span class="hl-mono" style="color:#11141c;font-weight:700">${esc(fmtKr(total))}</span>`;
  }
  // Ordered action list — one source of truth, rendered labelled (abtn5) on
  // desktop/mobile and icon-only (hl-ticon) in the dense table.
  function actionDefs(s) {
    const defs = [];
    defs.push({ cls: '_hr-send', extra: 'data-id="' + s.id + '"', glyph: '✉', label: 'Kvittun', color: '#2f5fe0', title: 'Senda kvittun í tölvupósti' });
    defs.push({ cls: '_hr-view', extra: 'data-id="' + s.id + '"', glyph: '🖨', label: 'PDF', color: '#475569', title: 'Skoða / prenta / vista PDF' });
    if (!s.is_credit) {
      defs.push({ cls: '_hr-edit', extra: 'data-id="' + s.id + '"', glyph: '✎', label: 'Breyta', color: '#c2410c', title: 'Breyta sölu — óSENDA reikninga má breyta beint' });
      defs.push({ cls: '_hr-bakfaera', extra: 'data-id="' + s.id + '"', glyph: '↩', label: 'Kredit', color: '#dc2626', title: 'Bakfæra (kreditfæra) þennan reikning' });
    }
    if (!s.is_credit) {
      // 2026-08-05 (verkefnalisti d18b707d): renamed from "Nýr + kredit" — the
      // OLD button just opened a blank Sala for the customer with no credit and
      // no line items, despite its name. Now genuinely bakfærir the original
      // (same Kredit modal as the ↩ button above) and THEN opens a new sale
      // with the original's lines already in the cart, obviously labelled.
      defs.push({ cls: '_hr-bakfaera-nyjan', extra: 'data-id="' + s.id + '"', glyph: '↩＋', label: 'Bakfæra og nýtt', color: '#0f7a43', title: 'Bakfæra þennan reikning OG opna nýja sölu með sömu línum til að breyta' });
    }
    return defs;
  }
  function actsAbtn(s) { return actionDefs(s).map(d => abtn(d.cls, d.extra, d.glyph, d.label, d.color, d.title)).join(''); }
  function iconBtn(d) {
    return '<button class="' + d.cls + ' hl-ticon" ' + d.extra + ' type="button" title="' + esc(d.title) + '" style="color:' + d.color + '">' + d.glyph + '</button>';
  }

  // Sort-header for the dense table (reuses the ._hr-sort click hook + data-k).
  function thT(key, label, align) {
    return `<th class="_hr-sort" data-k="${key}" style="text-align:${align || 'left'}">${esc(label)} <span style="font-size:9px;font-weight:400;opacity:.75">${sortArrow(key)}</span></th>`;
  }

  // ── List section — layout differs by view-mode; data/hooks identical ───────
  function listHtml(rows) {
    const mode = getViewMode();
    if (mode === 'mobile') return mobileCardsHtml(rows);
    if (mode === 'table')  return tableDenseHtml(rows);
    return desktopTableHtml(rows);
  }

  // 🖥 Skjár — the original full-width layout, unchanged.
  function desktopTableHtml(rows) {
    return `
      <div class="data-table-wrap"><div class="data-table-scroll">
        <table class="data-table" style="min-width:1080px">
          <thead><tr>
            <th class="_hr-sort" data-k="created_at">Skráð · Tími <span class="sort-ar">${sortArrow('created_at')}</span></th>
            <th class="_hr-sort" data-k="greitt">Greitt · síðast <span class="sort-ar">${sortArrow('greitt')}</span></th>
            <th class="_hr-sort" data-k="num">Skjal <span class="sort-ar">${sortArrow('num')}</span></th>
            <th class="_hr-sort" data-k="customer_nafn">Viðskiptavinur <span class="sort-ar">${sortArrow('customer_nafn')}</span></th>
            <th>Kennitala</th>
            <th class="_hr-sort" data-k="tegund">Tegund <span class="sort-ar">${sortArrow('tegund')}</span></th>
            <th class="_hr-sort" data-k="greitt_med">Greiðslumáti <span class="sort-ar">${sortArrow('greitt_med')}</span></th>
            <th class="_hr-sort" data-k="stada">Staða <span class="sort-ar">${sortArrow('stada')}</span></th>
            <th class="num _hr-sort" data-k="samtals">Upphæð <span class="sort-ar">${sortArrow('samtals')}</span></th>
            <th class="center">Aðgerðir</th>
          </tr></thead>
          <tbody>
            ${rows.length
              ? rows.map(rowHtml).join('')
              : '<tr><td colspan="10" style="padding:44px;text-align:center;color:#94a3b8;font-style:italic">Engar hreyfingar</td></tr>'}
          </tbody>
        </table>
      </div></div>`;
  }

  // ▦ Tafla — dense scan table (compact rows, small text, sticky dark header,
  // icon-only actions), many rows visible at once.
  function tableDenseHtml(rows) {
    const head = '<thead><tr>' +
      thT('created_at', 'Skráð') +
      thT('greitt', 'Greitt · síðast') +
      thT('num', 'Skjal') +
      thT('customer_nafn', 'Viðskiptavinur') +
      '<th>Kt.</th>' +
      thT('tegund', 'Tegund') +
      thT('greitt_med', 'Greiðslum.') +
      thT('stada', 'Staða') +
      thT('samtals', 'Upphæð', 'right') +
      '<th style="text-align:right">Aðgerðir</th>' +
      '</tr></thead>';
    const body = rows.length
      ? rows.map(rowDenseHtml).join('')
      : '<tr><td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;font-style:italic">Engar hreyfingar</td></tr>';
    return '<div class="data-table-wrap" style="overflow-x:auto"><table class="hl-table">' + head + '<tbody>' + body + '</tbody></table></div>';
  }
  function rowDenseHtml(s) {
    const acts = actionDefs(s).map(iconBtn).join('');
    return `<tr class="hl-trow">
      <td style="white-space:nowrap"><span class="hl-mono" style="font-size:11px;color:#334155">${esc(fmtDate(s.created_at))}</span> <span class="hl-mono" style="font-size:10px;color:#94a3b8">${esc(fmtTime(s.created_at))}</span></td>
      <td style="white-space:nowrap">${greittCell(s)}</td>
      <td><span class="hl-mono" style="font-size:11px;color:#1d4ed8;font-weight:700">${esc(s.num || '')}</span></td>
      <td style="font-size:12px;font-weight:600;overflow-wrap:anywhere;max-width:220px">${custNameHtml(s)}</td>
      <td style="white-space:nowrap">${ktCell(s.customer_kt)}</td>
      <td>${typeBtnFor(s)}</td>
      <td>${methodBtn(s.greitt_med)}</td>
      <td>${statusBtnFor(s)}</td>
      <td style="text-align:right;white-space:nowrap">${amountHtml(s)}</td>
      <td><div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:nowrap">${acts}</div></td>
    </tr>`;
  }

  // 📱 Sími — single-column stacked cards, ≥40px taps, names/amounts wrap.
  function mobileCardsHtml(rows) {
    if (!rows.length) return '<div style="padding:44px;text-align:center;color:#94a3b8;font-style:italic">Engar hreyfingar</div>';
    return '<div class="hl-mlist">' + rows.map(cardMobileHtml).join('') + '</div>';
  }
  function cardMobileHtml(s) {
    return `
      <div class="hl-mcard">
        <div class="hl-mhead">
          <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
            <span class="hl-mono" style="font-size:13px;color:#1d4ed8;font-weight:700">${esc(s.num || '')}</span>
            <span class="hl-mono" style="font-size:12px;color:#64748b">${esc(fmtDate(s.created_at))}${fmtTime(s.created_at) ? ' · ' + esc(fmtTime(s.created_at)) : ''}</span>
            ${s.paid_at && fmtDate(s.paid_at) !== fmtDate(s.created_at) ? '<span class="hl-mono" style="font-size:11px;color:#16a34a;font-weight:700">✓ greitt ' + esc(fmtDate(s.paid_at)) + '</span>' : ''}
            <span style="margin-left:auto;font-size:16px;overflow-wrap:anywhere">${amountHtml(s)}</span>
          </div>
          <div style="margin-top:8px;font-size:15px;font-weight:700;color:#11141c;overflow-wrap:anywhere;line-height:1.3">${custNameHtml(s)}</div>
          <div style="margin-top:4px">${ktCell(s.customer_kt)}</div>
          <div style="margin-top:9px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${typeBtnFor(s)} ${methodBtn(s.greitt_med)} ${statusBtnFor(s)}
          </div>
        </div>
        <div class="hl-macts">${actsAbtn(s)}</div>
      </div>`;
  }

  function rowHtml(s) {
    return `<tr style="border-bottom:1px solid #eef1f6">
      <td style="padding:10px 14px;white-space:nowrap">
        <span class="hl-mono" style="font-size:12px;color:#334155">${esc(fmtDate(s.created_at))}</span>
        <span class="hl-mono" style="display:block;font-size:10.5px;color:#94a3b8;margin-top:1px">${esc(fmtTime(s.created_at))}</span>
      </td>
      <td style="padding:10px 14px;white-space:nowrap">${greittCell(s)}</td>
      <td style="padding:10px 14px"><span class="hl-mono" style="font-size:12px;color:#1d4ed8;font-weight:700">${esc(s.num || '')}</span></td>
      <td style="padding:10px 14px;font-size:13.5px;font-weight:600;color:#11141c">${custNameHtml(s)}</td>
      <td style="padding:10px 14px;white-space:nowrap">${ktCell(s.customer_kt)}</td>
      <td style="padding:10px 14px">${typeBtnFor(s)}</td>
      <td style="padding:10px 14px">${methodBtn(s.greitt_med)}</td>
      <td style="padding:10px 14px">${statusBtnFor(s)}</td>
      <td style="padding:10px 14px;text-align:right">${amountHtml(s)}</td>
      <td style="padding:7px 14px;border-left:1px solid #eef1f6">
        <div style="display:flex;gap:6px;justify-content:flex-end">${actsAbtn(s)}</div>
      </td>
    </tr>`;
  }

  // ── View invoice (same pattern as Til að rukka / Kröfu yfirlit) ──────────
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

  // ── Send receipt/invoice by email ────────────────────────────────────────
  // The email sender (Gmail/Microsoft Graph) is being set up. When connected it
  // will expose window.ReceiptSender.send(saleId) — this button then sends the
  // PDF straight from the app. Until then it opens the invoice so the user can
  // print or save-as-PDF and attach it manually (nothing is blocked meanwhile).
  async function sendReceipt(saleId) {
    if (window.ReceiptSender && typeof window.ReceiptSender.send === 'function') {
      try { await window.ReceiptSender.send(saleId); return; } catch (_) { /* fall through to manual */ }
    }
    if (window.Toast && Toast.show) Toast.show('📧 Bein tölvupóstsending er ekki tengd enn — opna reikninginn til að prenta eða vista sem PDF.');
    openInvoice(saleId);
  }

  // ── CSV export ──────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = applyFilter(_state.all);
    const header = ['Dags','Tími','Skjal','Viðskiptavinur','Kennitala','Tegund','Greiðslumáti','Staða','Án VSK','VSK','Samtals','Starfsmaður','Athugasemdir'];
    const lines = [header];
    rows.forEach(s => {
      const isCredit = !!s.is_credit;
      const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
      const isPaid = !!s.paid_at;
      const status = isCredit ? 'Kredit' : isPaid ? 'Greitt' : isInvoice ? 'Ógreitt' : '';
      const total = +s.samtals || 0;
      lines.push([
        fmtDate(s.created_at),
        fmtTime(s.created_at),
        s.num || '',
        s.customer_nafn || '',
        s.customer_kt || '',
        isCredit ? 'Kreditfærsla' : 'Sala',
        s.greitt_med || '',
        status,
        Math.round(+s.upphaed_an_vsk || 0),
        Math.round(+s.vsk_upphaed || 0),
        isCredit ? -Math.abs(Math.round(total)) : Math.round(total),
        s.starfsmadur || '',
        s.athugasemdir || ''
      ]);
    });
    const csv = '﻿' + lines.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = _state.mode === 'kt' ? ('kunni_' + (_state.ktInfo && _state.ktInfo.ktFmt ? ktDigits(_state.ktInfo.ktFmt) : 'saga'))
      : _state.scope === 'all' ? 'allt'
      : _state.scope === 'year' ? String(_state.month.getFullYear())
      : _state.month.getFullYear() + '-' + String(_state.month.getMonth()+1).padStart(2,'0');
    a.href = url;
    a.download = 'Hreyfingarlisti_' + slug + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  }

  function show() {
    ensureView();
    if (window.App && App.switchView) App.switchView(NAV_KEY);
    else load();
  }

  injectNav();
  setTimeout(injectNav, 1000);
  ensureView();
  patchSwitchView();

  // ── Deep-link: #hreyfingarlisti/<kennitala-eða-nafn> ──────────────────────
  // Opens the view and runs the customer lookup — so a shareable link (or the
  // Sala „🧾 Fyrri" button in patch 253) lands straight on a customer's whole
  // sölu-/reikningasaga. Waits for the view + DB before running the lookup.
  function handleDeepLink() {
    const h = location.hash || '';
    const m = h.match(/^#(?:hreyfingarlisti|hreyfingar)\/(.+)$/i);
    if (!m) return;
    let q = '';
    try { q = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim(); } catch (_) { q = m[1].trim(); }
    if (!q) return;
    try { if (window.App && App.switchView) App.switchView(NAV_KEY); } catch (_) {}
    ensureView();
    let tries = 0;
    (function run() {
      if (getSB() && document.getElementById('hr-main') && typeof lookupCustomer === 'function') { lookupCustomer(q); return; }
      if (tries++ < 50) setTimeout(run, 200);
    })();
  }
  window.addEventListener('hashchange', handleDeepLink);
  setTimeout(handleDeepLink, 1400);

  // App-wide view-mode toggle (patch 166, in the banner) → re-render THIS page
  // live when it is the active view, so flipping 📱/▦/🖥 switches the layout
  // instantly. Cheap no-op when the view is not active.
  document.addEventListener('slokk-viewmode', () => {
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) { try { render(); } catch (_) {} }
  });

  window.Hreyfingarlisti = { show, load, lookup: lookupCustomer };
  console.log('[patch-167] Hreyfingarlisti installed');
})();
/* === END HREYFINGARLISTI === */
