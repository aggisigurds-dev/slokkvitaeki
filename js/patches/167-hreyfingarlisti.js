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
      V + '.abtn5:hover{transform:translateY(-1px);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.95),0 6px 13px -4px rgba(20,30,60,.42)}';
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
  let _state = { month: null, all: [], filter: 'all', search: '', sortKey: 'created_at', sortDir: 'desc', mode: 'month', ktInfo: null, scope: 'month' };

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
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,upphaed_an_vsk,vsk_upphaed,greitt_med,athugasemdir,created_at,paid_at,is_credit,credit_of,starfsmadur')
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
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,upphaed_an_vsk,vsk_upphaed,greitt_med,athugasemdir,created_at,paid_at,is_credit,credit_of,starfsmadur')
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
      <div style="max-width:none;margin:0;padding:14px 20px 40px;width:100%;box-sizing:border-box;font-family:'Space Grotesk',system-ui,sans-serif">

        <!-- Dark metallic header bar -->
        <div style="background:linear-gradient(180deg,#3a3d45,#2a2d33 45%,#1b1d22);border-radius:16px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;box-shadow:0 14px 32px -18px rgba(0,0,0,.65);margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:13px;min-width:0">
            <div style="width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;background:linear-gradient(180deg,#4a4e57,#2b2e34);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.18),inset 0 -3px 6px rgba(0,0,0,.4)">📜</div>
            <div style="min-width:0">
              <h1 class="hl-h1" style="margin:0;font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;color:#fff;letter-spacing:-.01em;line-height:1.1">Hreyfingarlisti</h1>
              ${_state.mode === 'kt' && _state.ktInfo
                ? `<div class="hl-sub" style="font-size:12.5px;color:rgba(255,255,255,.7);margin-top:2px">👤 <b>${esc(_state.ktInfo.nafn)}</b>${_state.ktInfo.ktFmt ? ' · <span class="hl-mono">kt. ' + esc(_state.ktInfo.ktFmt) + '</span>' : ''} · ${_state.all.length} færslur${_state.ktInfo.locs > 1 ? ' · 📍 ' + _state.ktInfo.locs + ' staðsetningar' : ''}</div>`
                : `<div class="hl-sub" style="font-size:12.5px;color:rgba(255,255,255,.6);margin-top:2px">Tímaröð yfir allar færslur — smelltu á dálk til að raða</div>`}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
            ${_state.mode === 'kt'
              ? `<button class="_hr-back" type="button" style="${darkBtn};font-weight:600">← Mánaðaryfirlit</button>`
              : `${_state.scope !== 'all' ? '<button class="_hr-prev" type="button" style="' + darkBtn + '">◀</button>' : ''}
                 <div class="hl-month hl-mono" style="font-size:13px;font-weight:700;color:#fff;padding:0 6px;min-width:${_state.scope === 'all' ? '96' : '132'}px;text-align:center">${esc(scopeLabel)}</div>
                 ${_state.scope !== 'all' ? '<button class="_hr-next" type="button" style="' + darkBtn + '">▶</button>' : ''}
                 <div style="display:inline-flex;border:1px solid rgba(255,255,255,.16);border-radius:9px;overflow:hidden">
                   ${['month','year','all'].map(s => { const on = _state.scope === s; const lbl = { month: 'Mán', year: 'Ár', all: 'Allt' }[s];
                     return '<button class="_hr-scope" data-s="' + s + '" type="button" style="padding:8px 13px;border:none;' + (s !== 'month' ? 'border-left:1px solid rgba(255,255,255,.12);' : '') + 'background:' + (on ? '#c92a2a' : 'transparent') + ';color:' + (on ? '#fff' : 'rgba(255,255,255,.68)') + ';cursor:pointer;font:inherit;font-size:12px;font-weight:700">' + lbl + '</button>'; }).join('')}
                 </div>`}
            <input class="_hr-ktlookup darkfield" type="text" placeholder="🔎 Kennitala eða nafn…" value="${_state.mode === 'kt' && _state.ktInfo ? esc(_state.ktInfo.query) : ''}" title="Sláðu inn kennitölu eða nafn og ýttu á Enter til að sjá ALLAR sölur/reikninga kúnnans" style="padding:8px 12px;border:1px solid rgba(120,160,255,.5);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:13px;min-width:220px">
            <button class="_hr-csv" type="button" style="${darkBtn};font-weight:600;display:inline-flex;align-items:center;gap:6px">⬇ CSV</button>
          </div>
        </div>

        <!-- 3D stat cards -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
          ${statCard3d('Sölur', sales, 'blue')}
          ${statCard3d('Kreditfært', -credits, 'red')}
          ${statCard3d(greittLabel, paidIn, 'green')}
          ${statCard3d('Ógreitt', unpaidOut, 'gold')}
          ${statCard3d('Nettó', net, 'hero')}
        </div>

        <!-- Filter chips + list search -->
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
          <div style="display:flex;gap:7px;flex-wrap:wrap">
          ${chipDef.map(([k, label, n]) => {
            const on = _state.filter === k;
            return `<button class="_hr-chip" data-k="${k}" type="button"
              style="padding:8px 15px;border-radius:10px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;${on
                ? 'border:1px solid #0a0b0d;background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5)'
                : 'border:1px solid rgba(20,24,34,.14);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#3a4250'}">
              ${esc(label)} <span style="opacity:.6;font-weight:500">${n}</span></button>`;
          }).join('')}
          </div>
          <input class="_hr-search" type="text" placeholder="🔍 Sía lista…" value="${esc(_state.search)}" style="margin-left:auto;padding:9px 13px;border:1px solid rgba(20,24,34,.14);border-radius:10px;background:#fff;font:inherit;font-size:13px;min-width:200px;box-shadow:0 1px 2px rgba(15,23,42,.06)">
        </div>

        <!-- Table (dark metallic header, sticky) -->
        <div style="border-radius:16px;border:1px solid rgba(20,24,34,.08);background:#fff;box-shadow:0 10px 28px -16px rgba(25,35,60,.16);overflow:hidden">
          <div style="overflow-x:auto">
            <table style="width:100%;min-width:1080px;border-collapse:collapse;font-size:13px">
              <thead style="position:sticky;top:0;z-index:2"><tr style="background:linear-gradient(180deg,#3a3d45,#2a2d33 45%,#1b1d22)">
                ${th('created_at', 'Dags · Tími', 'left')}
                ${th('num', 'Skjal', 'left')}
                ${th('customer_nafn', 'Viðskiptavinur', 'left')}
                ${thPlain('Kennitala', 'left')}
                ${th('tegund', 'Tegund', 'left')}
                ${th('greitt_med', 'Greiðslumáti', 'left')}
                ${th('stada', 'Staða', 'left')}
                ${th('samtals', 'Upphæð', 'right')}
                <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:700;color:#e8ecf4;text-transform:uppercase;letter-spacing:.11em;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.4);border-left:1px solid rgba(255,255,255,.12)">Aðgerðir</th>
              </tr></thead>
              <tbody>
                ${rows.length
                  ? rows.map(rowHtml).join('')
                  : '<tr><td colspan="9" style="padding:44px;text-align:center;color:#94a3b8;font-style:italic">Engar hreyfingar</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

      </div>`;

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
        else { _state.sortKey = k; _state.sortDir = (k === 'created_at' || k === 'samtals') ? 'desc' : 'asc'; }
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
    main.querySelectorAll('._hr-nyjan').forEach(b => {
      b.addEventListener('click', () => {
        if (typeof window.SalaNyjan === 'function') window.SalaNyjan(b.dataset.kt, b.dataset.nafn);
        else { try { if (window.App && App.switchView) App.switchView('sala'); } catch (_) {} }
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
      '<div style="flex:1 1 240px;min-width:240px;border-radius:18px;padding:15px 17px;display:flex;align-items:center;gap:13px;background:' + bg + ';box-shadow:' + extraShadow + '">' +
        iconTile +
        '<div style="min-width:0">' +
          '<div style="font-size:10.5px;font-weight:700;letter-spacing:.14em;color:' + labelCol + ';text-transform:uppercase">' + esc(label) + '</div>' +
          '<div class="hl-mono" style="font-size:25px;font-weight:700;color:' + valCol + ';margin-top:3px;white-space:nowrap">' + esc(fmtKr(value)) + '</div>' +
        '</div>' +
      '</div>';
    if (kind === 'hero') {
      const tile = '<div style="width:46px;height:46px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;background:rgba(255,255,255,.16);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 -3px 6px rgba(0,0,0,.2)">Σ</div>';
      return wrap('linear-gradient(150deg,#6f97ff 0%,#2f5fe0 34%,#1c3d8c 60%,#0b1838 100%)',
        '0 1px 1px rgba(15,23,42,.05),0 10px 20px -8px rgba(15,23,42,.25),0 26px 46px -20px rgba(20,40,120,.5),inset 0 1px 0 rgba(255,255,255,.45)',
        tile, 'rgba(255,255,255,.72)', '#fff');
    }
    const k = K[kind] || K.blue;
    const tile = '<div style="width:46px;height:46px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;background:' + k.icbg + ';box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 -3px 6px rgba(0,0,0,.25),0 4px 10px -3px ' + k.glow + '">' + k.ic + '</div>';
    return wrap('linear-gradient(180deg,#ffffff,#eef1f6)', shadow, tile, '#8a93a5', k.val);
  }

  // One light-metallic action button (icon + tiny colored label).
  function abtn(cls, extra, glyph, label, color, title) {
    return '<button class="' + cls + ' abtn5" ' + extra + ' type="button" title="' + esc(title) + '">' +
      '<span style="font-size:15px;line-height:1;color:' + color + '">' + glyph + '</span>' +
      '<span style="font-size:8.5px;font-weight:700;letter-spacing:.02em;color:' + color + '">' + esc(label) + '</span>' +
    '</button>';
  }

  function rowHtml(s) {
    const isCredit = !!s.is_credit;
    const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
    const isPaid = !!s.paid_at;
    const total = +s.samtals || 0;

    const typeBtn = isCredit ? metalBtn('↩ Kredit', GRAD.purple) : metalBtn('Sala', GRAD.sala);
    const statusBtn = isCredit
      ? metalBtn('↩ Kredit', GRAD.purple)
      : isPaid
        ? metalBtn('✓ Greitt', GRAD.green)
        : isInvoice
          ? metalBtn('⚠ Ógreitt', GRAD.gold)
          : '<span style="color:#94a3b8;font-size:12px">—</span>';

    const amountCol = isCredit
      ? `<span class="hl-mono" style="color:#dc2626;font-weight:700">${esc(fmtKr(-Math.abs(total)))}</span>`
      : `<span class="hl-mono" style="color:#11141c;font-weight:700">${esc(fmtKr(total))}</span>`;

    const acts = [];
    acts.push(abtn('_hr-send', 'data-id="' + s.id + '"', '✉', 'Kvittun', '#2f5fe0', 'Senda kvittun í tölvupósti'));
    acts.push(abtn('_hr-view', 'data-id="' + s.id + '"', '🖨', 'PDF', '#475569', 'Skoða / prenta / vista PDF'));
    if (!isCredit) {
      acts.push(abtn('_hr-edit', 'data-id="' + s.id + '"', '✎', 'Breyta', '#c2410c', 'Breyta sölu — óSENDA reikninga má breyta beint'));
      acts.push(abtn('_hr-bakfaera', 'data-id="' + s.id + '"', '↩', 'Kredit', '#dc2626', 'Bakfæra (kreditfæra) þennan reikning'));
    }
    acts.push(abtn('_hr-nyjan', 'data-kt="' + esc(s.customer_kt || '') + '" data-nafn="' + esc(s.customer_nafn || '') + '"', '＋', 'Nýr + kredit', '#0f7a43', 'Ný sala fyrir þennan viðskiptavin (opnar Sölu, afsláttur bætist sjálfkrafa)'));

    return `<tr style="border-bottom:1px solid #eef1f6">
      <td style="padding:10px 14px;white-space:nowrap">
        <span class="hl-mono" style="font-size:12px;color:#334155">${esc(fmtDate(s.created_at))}</span>
        <span class="hl-mono" style="display:block;font-size:10.5px;color:#94a3b8;margin-top:1px">${esc(fmtTime(s.created_at))}</span>
      </td>
      <td style="padding:10px 14px"><span class="hl-mono" style="font-size:12px;color:#1d4ed8;font-weight:700">${esc(s.num || '')}</span></td>
      <td style="padding:10px 14px;font-size:13.5px;font-weight:600;color:#11141c">${
        s.customer_id
          ? `<a class="_hr-co" data-id="${s.customer_id}" href="#company/${s.customer_id}" title="Opna fyrirtækjaspjald" style="color:#1d4ed8;text-decoration:none;cursor:pointer">${esc(s.customer_nafn || '—')}</a>`
          : esc(s.customer_nafn || '—')
      }</td>
      <td style="padding:10px 14px;white-space:nowrap">${ktCell(s.customer_kt)}</td>
      <td style="padding:10px 14px">${typeBtn}</td>
      <td style="padding:10px 14px">${methodBtn(s.greitt_med)}</td>
      <td style="padding:10px 14px">${statusBtn}</td>
      <td style="padding:10px 14px;text-align:right">${amountCol}</td>
      <td style="padding:7px 14px;border-left:1px solid #eef1f6">
        <div style="display:flex;gap:6px;justify-content:flex-end">${acts.join('')}</div>
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

  window.Hreyfingarlisti = { show, load, lookup: lookupCustomer };
  console.log('[patch-167] Hreyfingarlisti installed');
})();
/* === END HREYFINGARLISTI === */
