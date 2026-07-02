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

  // Brunastál: the title/subtitle/month sit on the dark page band where the
  // default dark ink is invisible. Flip them to white under that preset only.
  (function injectSkin() {
    if (document.getElementById('hl-brunastal-skin')) return;
    const s = document.createElement('style');
    s.id = 'hl-brunastal-skin';
    const B = 'html[data-thm-preset="brunastal"] #view-hreyfingarlisti ';
    s.textContent =
      B + '.hl-h1{color:#fff !important;font-size:26px !important;font-weight:800 !important;text-shadow:0 2px 8px rgba(0,0,0,.55)}' +
      B + '.hl-sub{color:rgba(255,255,255,.62) !important}' +
      B + '.hl-month{color:#fff !important}' +
      B + '.hl-navbtn{background:linear-gradient(145deg,#0b0b0d,#2a2a30 30%,#3c3c44 52%,#1a1a1f 74%,#08080a) !important;color:#fff !important;border-color:#0a0b0d !important}';
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
    if (d === '9999999999') return '<span style="background:#f1f5f9;color:#64748b;padding:1px 7px;border-radius:99px;font-size:10px">Staðgr.</span>';
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
    return `<th class="_hr-sort" data-k="${key}" style="padding:9px 10px;text-align:${align || 'left'};font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;user-select:none;white-space:nowrap">${esc(label)} <span style="font-size:9px;font-weight:400">${sortArrow(key)}</span></th>`;
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

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:22px">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">
          <div>
            <h1 class="hl-h1" style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">📜 Hreyfingarlisti</h1>
            ${_state.mode === 'kt' && _state.ktInfo
              ? `<div class="hl-sub" style="font-size:12.5px;color:#334155;margin-top:3px">👤 <b>${esc(_state.ktInfo.nafn)}</b>${_state.ktInfo.ktFmt ? ' · <span style="font-family:monospace">kt. ' + esc(_state.ktInfo.ktFmt) + '</span>' : ''} · ${_state.all.length} færslur${_state.ktInfo.locs > 1 ? ' · 📍 ' + _state.ktInfo.locs + ' staðsetningar' : ''}</div>`
              : `<div class="hl-sub" style="font-size:12px;color:#64748b;margin-top:2px">Tímaröð yfir allar færslur — sölur og kreditfærslur</div>`}
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
            ${_state.mode === 'kt'
              ? `<button class="_hr-back hl-navbtn" type="button" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:600;color:#475569">← Mánaðaryfirlit</button>`
              : `${_state.scope !== 'all' ? '<button class="_hr-prev hl-navbtn" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">◀</button>' : ''}
                 <div class="hl-month" style="font-size:13px;font-weight:700;color:#0f172a;padding:0 8px;min-width:${_state.scope === 'all' ? '110' : '140'}px;text-align:center">${esc(scopeLabel)}</div>
                 ${_state.scope !== 'all' ? '<button class="_hr-next hl-navbtn" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">▶</button>' : ''}
                 <div style="display:inline-flex;border:1px solid #cbd5e1;border-radius:7px;overflow:hidden;margin-left:4px">
                   ${['month','year','all'].map(s => { const on = _state.scope === s; const lbl = { month: 'Mán', year: 'Ár', all: 'Allt' }[s];
                     return '<button class="_hr-scope" data-s="' + s + '" type="button" style="padding:7px 11px;border:none;' + (s !== 'month' ? 'border-left:1px solid #e2e8f0;' : '') + 'background:' + (on ? '#0f172a' : '#fff') + ';color:' + (on ? '#fff' : '#475569') + ';cursor:pointer;font:inherit;font-size:12px;font-weight:600">' + lbl + '</button>'; }).join('')}
                 </div>`}
            <input class="_hr-ktlookup" type="text" placeholder="🔎 Kennitala eða nafn — öll saga" value="${_state.mode === 'kt' && _state.ktInfo ? esc(_state.ktInfo.query) : ''}" title="Sláðu inn kennitölu eða nafn og ýttu á Enter til að sjá ALLAR sölur/reikninga kúnnans" style="padding:7px 11px;border:1.5px solid #1d4ed8;border-radius:7px;font:inherit;font-size:13px;min-width:230px;margin-left:6px">
            <input class="_hr-search" type="text" placeholder="🔍 Sía lista…" value="${esc(_state.search)}" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;min-width:130px">
            <button class="_hr-csv" type="button" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:600;color:#475569">📥 CSV</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:18px">
          ${statCard('Sölur', sales, '#1d4ed8', '#dbeafe', '💰')}
          ${statCard('Kreditfært', -credits, '#dc2626', '#fee2e2', '↩️')}
          ${statCard(_state.mode === 'kt' || _state.scope !== 'month' ? 'Greitt' : 'Greitt í mán.', paidIn, '#16a34a', '#dcfce7', '✓')}
          ${statCard('Ógreitt', unpaidOut, '#b45309', '#fef3c7', '⏳')}
          ${statCard('Nettó', net, net >= 0 ? '#0f172a' : '#dc2626', '#f1f5f9', 'Σ')}
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${chipDef.map(([k, label, n]) => {
            const on = _state.filter === k;
            return `<button class="_hr-chip" data-k="${k}" type="button"
              style="padding:6px 12px;border:1px solid ${on ? '#0f172a' : '#cbd5e1'};
                background:${on ? '#0f172a' : '#fff'};color:${on ? '#fff' : '#475569'};
                border-radius:99px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">
              ${esc(label)} <span style="opacity:.65;font-weight:500">${n}</span></button>`;
          }).join('')}
        </div>

        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
              ${th('created_at', 'Dags · Tími', 'left')}
              ${th('num', 'Skjal', 'left')}
              ${th('customer_nafn', 'Viðskiptavinur', 'left')}
              <th style="padding:9px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">Kennitala</th>
              ${th('tegund', 'Tegund', 'left')}
              ${th('greitt_med', 'Greiðslumáti', 'left')}
              ${th('stada', 'Staða', 'left')}
              ${th('samtals', 'Upphæð', 'right')}
              <th style="padding:9px 10px"></th>
            </tr></thead>
            <tbody>
              ${rows.length
                ? rows.map(rowHtml).join('')
                : '<tr><td colspan="9" style="padding:30px;text-align:center;color:#94a3b8;font-style:italic">Engar hreyfingar</td></tr>'}
            </tbody>
          </table>
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

  function statCard(label, value, color, bg, icon) {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px">
      <div style="width:34px;height:34px;border-radius:8px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0">${icon}</div>
      <div style="min-width:0">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">${esc(label)}</div>
        <div style="font-size:17px;font-weight:800;color:${color};font-variant-numeric:tabular-nums">${esc(fmtKr(value))}</div>
      </div>
    </div>`;
  }

  function rowHtml(s) {
    const isCredit = !!s.is_credit;
    const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
    const isPaid = !!s.paid_at;
    const total = +s.samtals || 0;

    const typeBadge = isCredit
      ? '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px">↩ Kredit</span>'
      : '<span style="font-size:10px;font-weight:700;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:99px">Sala</span>';

    const status = isCredit
      ? '<span style="color:#991b1b;font-size:11px">—</span>'
      : isPaid
        ? '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px">✓ Greitt</span>'
        : isInvoice
          ? '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px">⚠ Ógreitt</span>'
          : '<span style="font-size:10px;font-weight:700;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:99px">—</span>';

    const amountCol = isCredit
      ? `<span style="color:#dc2626;font-weight:700;font-variant-numeric:tabular-nums">${esc(fmtKr(-Math.abs(total)))}</span>`
      : `<span style="color:#0f172a;font-weight:700;font-variant-numeric:tabular-nums">${esc(fmtKr(total))}</span>`;

    return `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:8px 10px;font-size:12px;color:#475569;white-space:nowrap">
        ${esc(fmtDate(s.created_at))}<span style="color:#94a3b8;margin-left:5px">${esc(fmtTime(s.created_at))}</span>
      </td>
      <td style="padding:8px 10px;font-family:monospace;font-size:11.5px;color:#0f172a;font-weight:600">${esc(s.num || '')}</td>
      <td style="padding:8px 10px;font-size:12.5px;color:#0f172a">${
        s.customer_id
          ? `<a class="_hr-co" data-id="${s.customer_id}" href="#company/${s.customer_id}" title="Opna fyrirtækjaspjald" style="color:#1d4ed8;text-decoration:none;border-bottom:1px dotted #93c5fd;cursor:pointer">${esc(s.customer_nafn || '—')}</a>`
          : esc(s.customer_nafn || '—')
      }</td>
      <td style="padding:8px 10px;white-space:nowrap">${ktCell(s.customer_kt)}</td>
      <td style="padding:8px 10px">${typeBadge}</td>
      <td style="padding:8px 10px;font-size:11.5px;color:#475569">${methodLabel(s.greitt_med)}</td>
      <td style="padding:8px 10px">${status}</td>
      <td style="padding:8px 10px;text-align:right">${amountCol}</td>
      <td style="padding:8px 10px;text-align:right;white-space:nowrap">
        <button class="_hr-send" data-id="${s.id}" type="button" title="Senda kvittun í tölvupósti"
          style="padding:4px 8px;background:#fff;color:#0f766e;border:1px solid #99f6e4;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;margin-right:4px">📧</button>
        <button class="_hr-view" data-id="${s.id}" type="button" title="Skoða / prenta / vista PDF"
          style="padding:4px 8px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;margin-right:4px">🖨</button>
        ${s.is_credit ? '' : `<button class="_hr-edit" data-id="${s.id}" type="button" title="Breyta sölu — óSENDA reikninga má breyta beint (t.d. bæta afslætti)"
          style="padding:4px 8px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;margin-right:4px">✏️</button>`}
        ${s.is_credit ? '' : `<button class="_hr-bakfaera" data-id="${s.id}" type="button" title="Bakfæra (kreditfæra) þennan reikning"
          style="padding:4px 8px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:700;margin-right:4px">↩</button>`}
        <button class="_hr-nyjan" data-kt="${esc(s.customer_kt || '')}" data-nafn="${esc(s.customer_nafn || '')}" type="button" title="Ný sala fyrir þennan viðskiptavin (opnar Sölu, afsláttur bætist sjálfkrafa)"
          style="padding:4px 8px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">＋</button>
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
