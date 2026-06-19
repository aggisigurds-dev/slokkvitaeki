/* === ÞJÓNUSTUVERKSTÆÐI v2 — Kanban yfir fyrirtæki í þjónustu ===
 *
 * One Kanban that mirrors the Móttaka/Verkstæði style but for whole-company
 * service cycles (Fyrirtæki í þjónustu). Columns:
 *
 *   ⏳ Á dagskrá   — skoðunarmánuður kominn/liðinn, ekki hafið (not blue/green)
 *   🔵 Í vinnslu   — skoðun hafin, skýrsla/reikningur eftir   (the blue flag)
 *   ✅ Búið í ár   — fullklárað í ár (green)
 *
 * Single source of truth = AppSettings.arsskodun_customers (same flag as the
 * blue dot in patch 153 and the per-unit Í vinnslu in patch 191). No separate
 * service_visits table needed — ticking units Í vinnslu auto-moves a company
 * into the 🔵 column; finishing it (✓ Búið) moves it to ✅.
 *
 * Per card: 🏢 Opna · 📄 Skýrsla · ✓ Búið · ✕ Afmerkja (▶ í vinnslu on
 * Á-dagskrá cards). Afmerkja er andhverfan á bláa hnappnum á Fyrirtæki í
 * þjónustu — fjarlægir field_inspected_year svo kortið fer úr 🔵 dálknum.
 */
(() => {
  if (window.__thjonustuVerkstaediInstalled) return;
  window.__thjonustuVerkstaediInstalled = true;

  const VIEW_ID = 'view-thjonustu-verkstaedi';
  const NAV_KEY = 'thjonustu-verkstaedi';
  const KEY = 'arsskodun_customers';
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function fmtKt(k) { const c = String(k || '').replace(/\D/g, ''); return c.length >= 10 ? c.slice(0,6) + '-' + c.slice(6,10) : (k || ''); }
  function fmtKr(n) { if (n == null || !isFinite(+n)) return ''; const s = Math.round(+n).toString(); const r = []; let t = s; while (t.length > 3) { r.unshift(t.slice(-3)); t = t.slice(0, -3); } r.unshift(t); return r.join('.') + ' kr'; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[þjónustuverkstæði]', m); }
  function arsMap() { try { if (window.AppSettings && AppSettings.path) return AppSettings.path(KEY) || {}; } catch (_) {} return {}; }

  // 2026-06-12 (Todoist): fjögur eftirfylgni-skref á hverju Í-vinnslu korti.
  // Geymd árs-skorðuð í arsskodun_customers[<id>].steps_<ár> svo þau núllast
  // sjálfkrafa um áramót. Þegar öll fjögur eru ✓ færist kortið sjálfkrafa í Búið.
  const STEPS_KEY = 'steps_' + curYear;
  const STEP_DEFS = [
    ['uttekt',     'Úttekt búin',      'Úttekt'],
    ['skyrsla',    'Skýrsla tilbúin',  'Skýrsla'],
    ['send',       'Skýrsla send',     'Send'],
    ['reikningur', 'Reikningur sendur','Reikningur']
  ];
  // Bráðabirgða-merkingar (single-select) á hverju Í-vinnslu korti.
  // [key, label, bg, tx, bd]
  const MARK_DEFS = [
    ['haett',         'Hætt',                    '#fef2f2', '#b91c1c', '#fecaca'],
    ['uppfaera_dags', 'Eftir að uppfæra dags.',  '#fffbeb', '#a16207', '#fde68a'],
    ['reikn_adur',    'Reikningur sendur áður',  '#eff6ff', '#1d4ed8', '#bfdbfe']
  ];

  // View mode — "list" (gamla miðjan, sjálfgefið / uppáhald) eða "cards".
  let _mode = (function () { try { return localStorage.getItem('sv_mode') || 'list'; } catch (_) { return 'list'; } })();
  function setMode(m) { _mode = m; try { localStorage.setItem('sv_mode', m); } catch (_) {} render(); }
  // Röðun á Í-vinnslu listanum — "name" | "revenue" | "marked".
  let _sort = (function () { try { return localStorage.getItem('sv_sort') || 'name'; } catch (_) { return 'name'; } })();
  function setSort(s) { _sort = s; try { localStorage.setItem('sv_sort', s); } catch (_) {} render(); }
  const SORTERS = {
    name:    (x, y) => String(x.nafn).localeCompare(y.nafn, 'is'),
    revenue: (x, y) => ((+y.tekjur || 0) - (+x.tekjur || 0)) || String(x.nafn).localeCompare(y.nafn, 'is'),
    marked:  (x, y) => ((+y.markedAt || 0) - (+x.markedAt || 0)) || String(x.nafn).localeCompare(y.nafn, 'is'),
  };
  // Collapsible hliðar-dálkar — collapsed by default ("collapse both of each side").
  let _openDagskra = false, _openBuid = false;

  function injectStyles() {
    if (document.getElementById('_sv-styles')) return;
    const s = document.createElement('style');
    s.id = '_sv-styles';
    s.textContent = [
      '#' + VIEW_ID + ' .sv-seg{display:inline-flex;background:var(--brd);border-radius:10px;padding:3px;gap:3px}',
      '#' + VIEW_ID + ' .sv-seg button{border:0;background:transparent;color:var(--ink3);font:inherit;font-size:12.5px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer}',
      '#' + VIEW_ID + ' .sv-seg button.on{background:var(--surface);color:var(--ink1);box-shadow:0 1px 2px rgba(0,0,0,.12)}',
      '#' + VIEW_ID + ' .sv-chip{display:inline-flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--brd);border-radius:99px;padding:7px 13px;font-size:12.5px;font-weight:600;color:var(--ink2);cursor:pointer}',
      '#' + VIEW_ID + ' .sv-chip .n{font-weight:800;color:var(--ink1)}',
      '#' + VIEW_ID + ' .sv-drawer{background:var(--surface);border:1px solid var(--brd);border-radius:12px;margin-bottom:14px;overflow:hidden}',
      '#' + VIEW_ID + ' .sv-drawer-row{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--brd);font-size:13px}',
      '#' + VIEW_ID + ' .sv-drawer-row:last-child{border-bottom:0}',
      '#' + VIEW_ID + ' .sv-drawer-row .nm{flex:1;font-weight:600;color:var(--ink1)}',
      '#' + VIEW_ID + ' .sv-drawer-row .mn{color:var(--ink4);font-size:12px}',
      // grid (cards mode)
      '#' + VIEW_ID + ' .sv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}',
      '@media(max-width:760px){#' + VIEW_ID + ' .sv-grid{grid-template-columns:1fr}}',
      '#' + VIEW_ID + ' .sv-list{display:flex;flex-direction:column;gap:10px;max-width:640px}',
      // wide mode — full-width, short rows; note + actions on the right
      '#' + VIEW_ID + ' .sv-list-wide{display:flex;flex-direction:column;gap:8px}',
      '#' + VIEW_ID + ' .sv-card.wide{flex-direction:row;align-items:stretch;gap:16px;padding:11px 14px}',
      '#' + VIEW_ID + ' .sv-wide-l{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;justify-content:center}',
      '#' + VIEW_ID + ' .sv-wide-r{flex:0 0 300px;display:flex;flex-direction:column;gap:7px}',
      '#' + VIEW_ID + ' .sv-wide-r .sv-note{flex:1;min-height:34px;margin:0}',
      '#' + VIEW_ID + ' .sv-wide-r .sv-acts{border-top:0;padding-top:0}',
      '#' + VIEW_ID + ' .sv-wide-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '@media(max-width:720px){#' + VIEW_ID + ' .sv-card.wide{flex-direction:column}#' + VIEW_ID + ' .sv-wide-r{flex-basis:auto}}',
      '#' + VIEW_ID + ' .sv-card{background:var(--surface);border:1px solid var(--brd);border-left:4px solid #3b82f6;border-radius:13px;padding:13px 14px;box-shadow:0 1px 2px rgba(16,24,40,.04);display:flex;flex-direction:column;gap:10px;transition:opacity .15s}',
      '#' + VIEW_ID + ' .sv-card.haett{opacity:.55;border-left-color:#dc2626}',
      // stepper
      '#' + VIEW_ID + ' .sv-steps{display:flex;align-items:flex-start;gap:0}',
      '#' + VIEW_ID + ' .sv-step{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;position:relative;cursor:pointer;background:none;border:0;padding:0;font:inherit}',
      '#' + VIEW_ID + ' .sv-step .ln{position:absolute;top:13px;left:-50%;width:100%;height:3px;background:var(--brd);z-index:0}',
      '#' + VIEW_ID + ' .sv-step:first-child .ln{display:none}',
      '#' + VIEW_ID + ' .sv-step.on .ln{background:#16a34a}',
      '#' + VIEW_ID + ' .sv-step .nd{position:relative;z-index:1;width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:2px solid var(--brd);background:var(--surface);color:var(--ink4)}',
      '#' + VIEW_ID + ' .sv-step.on .nd{background:#16a34a;border-color:#16a34a;color:#fff}',
      '#' + VIEW_ID + ' .sv-step .lb{font-size:10px;font-weight:700;color:var(--ink3);text-align:center;line-height:1.2}',
      '#' + VIEW_ID + ' .sv-step.on .lb{color:#15803d}',
      // marks
      '#' + VIEW_ID + ' .sv-marks{display:flex;gap:6px;flex-wrap:wrap}',
      '#' + VIEW_ID + ' .sv-mark{border:1px solid var(--brd);background:var(--bg);color:var(--ink4);border-radius:99px;padding:4px 11px;font-size:10.5px;font-weight:700;cursor:pointer}',
      // note
      '#' + VIEW_ID + ' .sv-note{width:100%;box-sizing:border-box;font:inherit;font-size:12.5px;line-height:1.45;padding:7px 9px;border:1px solid var(--brd);border-radius:9px;resize:vertical;min-height:38px;color:var(--ink1);background:var(--bg)}',
      '#' + VIEW_ID + ' .sv-note:focus{outline:none;border-color:#3b82f6;background:var(--surface)}',
      '#' + VIEW_ID + ' .sv-acts{display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--brd);padding-top:9px}'
    ].join('');
    document.head.appendChild(s);
  }

  // Einingar + áætlaðar tekjur per fyrirtæki — sama lifandi útreikningur og
  // Fyrirtæki í Þjónustu notar (patch 153: uttaeki × yfirferð + skýrslugerð +
  // akstur, m. vsk). Hlaðið einu sinni þegar viewið opnast.
  let _arsLoadKicked = false;
  function ensureArsData() {
    if (_arsLoadKicked) return;
    if (!(window.Arsskodun && Arsskodun.loadAll)) return;
    _arsLoadKicked = true;
    Promise.resolve(Arsskodun.loadAll()).then(() => render()).catch(() => { _arsLoadKicked = false; });
  }
  function arsInfo(coId) {
    const L = (window.Arsskodun && Arsskodun._cache && Arsskodun._cache.list) || [];
    const row = L.find(x => String(x.id) === String(coId));
    return (row && row._ars) || {};
  }

  // Build the three buckets from the company list + arsskodun flags.
  function buckets() {
    const map = arsMap();
    const cos = (window.Companies && Companies.list) || [];
    const out = { dagskra: [], vinnsla: [], buid: [] };
    cos.forEach(co => {
      if (!co || co.deleted_at) return;
      if (co.er_i_thjonustu === false) return;          // only service companies
      const a = map[String(co.id)] || {};
      const ly = +a.last_year_inspected || 0;
      const fy = +a.field_inspected_year || 0;
      const m  = +a.inspect_month || 0;
      const info = arsInfo(co.id);
      // A saved (óklárað) report in the cloud (patch 227/228) = work in progress.
      const hasDraft = !!(window.SavedReports && SavedReports.has && SavedReports.has(co.id));
      const card = {
        id: co.id, nafn: co.nafn || ('#' + co.id), kennitala: co.kennitala || '',
        month: m, aminning: (a.aminning || '').trim(),
        steps: a[STEPS_KEY] || {},
        mark: a.sv_mark || '',          // bráðabirgða-merking (single-select)
        note: a.sv_note || '',          // bráðabirgða-minnispunktur (frítexti)
        markedAt: +a.sv_mark_at || 0,   // hvenær síðast merkt (fyrir "Nýlega merkt" röðun)
        units: +info._unit_count || 0,
        tekjur: +info.estimated_yearly || 0,
        hasDraft: hasDraft
      };
      if (ly === curYear) out.buid.push(card);
      else if (fy === curYear || hasDraft) out.vinnsla.push(card);   // started OR has a saved draft
      else if (m > 0 && m <= curMonth) out.dagskra.push(card);   // due/overdue, not started
    });
    const byName = (x, y) => String(x.nafn).localeCompare(y.nafn, 'is');
    out.dagskra.sort(byName); out.vinnsla.sort(byName); out.buid.sort(byName);
    return out;
  }

  async function setFlag(coId, patch, opts) {
    if (!window.AppSettings || !AppSettings.save) { toast('Engar stillingar'); return; }
    const map = arsMap();
    const e = Object.assign({}, map[String(coId)] || {}, patch);
    if (patch._delete) patch._delete.forEach(k => { delete e[k]; });
    delete e._delete;
    await AppSettings.save({ [KEY]: Object.assign({}, map, { [String(coId)]: e }) });
    if (!(opts && opts.silent)) render();   // note edits save silently (keep focus)
  }
  // NB: AppSettings.save() DEEP-MERGES — deleting a key does NOT propagate to
  // the server (see patches 157/158). So every transition must SET the flags to
  // 0 (which all readers treat as "not set" via `|| 0`), never rely on _delete.
  const startVinnsla = id => setFlag(id, { field_inspected_year: curYear, last_year_inspected: 0 });
  const markBuid     = id => setFlag(id, { last_year_inspected: curYear, field_inspected_year: 0 });
  const reopen       = id => setFlag(id, { field_inspected_year: 0, last_year_inspected: 0 });
  // Afmerkja: andhverfan á bláa hnappnum — núllar vinnslu-flaggið svo kortið
  // dettur úr 🔵 (fer í ⏳ Á dagskrá ef skoðunarmánuður er kominn, annars af borðinu).
  const unVinnsla    = id => setFlag(id, { field_inspected_year: 0 });

  function openCompany(id) { if (window.VidskDetail && VidskDetail.show) return VidskDetail.show(id); if (window.Companies && Companies.openDetail) return Companies.openDetail(id); }
  function openReport(id) { if (window.CompanyInspectionReport && CompanyInspectionReport.open) return CompanyInspectionReport.open(id); if (window.VisitReport && VisitReport.open) return VisitReport.open(id); openCompany(id); }

  function btn(bg, tx, bd) { return 'padding:6px 10px;border:1px solid ' + bd + ';border-radius:8px;background:' + bg + ';color:' + tx + ';font-size:11.5px;font-weight:700;cursor:pointer'; }

  // ── Shared card pieces (used by both list + cards mode) ──────────────────
  function metaChips(r) {
    const draftChip = r.hasDraft ? '<span title="Óklárað úttekt vistuð — heldur áfram á fyrirtækjasíðunni" style="background:#fffbeb;color:#a16207;border:1px solid #fde68a;border-radius:99px;padding:1px 8px;font-size:10px;font-weight:700;white-space:nowrap">📝 óklárað vistað</span>' : '';
    if (!(r.units > 0 || r.tekjur > 0 || draftChip)) return '';
    return '<div style="display:flex;gap:5px;flex-wrap:wrap">' +
      draftChip +
      (r.units > 0 ? '<span style="background:#eff6ff;color:#1d4ed8;border-radius:99px;padding:1px 8px;font-size:10px;font-weight:700;white-space:nowrap">🧯 ' + r.units + ' einingar</span>' : '') +
      (r.tekjur > 0 ? '<span style="background:#eff6ff;color:#1d4ed8;border-radius:99px;padding:1px 8px;font-size:10px;font-weight:700;white-space:nowrap" title="Áætlaðar tekjur: yfirferðir + skýrslugerð + akstur, m. vsk">áætl. ' + fmtKr(r.tekjur) + '</span>' : '') +
      '</div>';
  }
  // gamli stíllinn — skref sem pillur (list mode)
  function stepPills(r) {
    return '<div style="display:flex;gap:4px;flex-wrap:wrap">' +
      STEP_DEFS.map(([k, label]) => {
        const on = !!r.steps[k];
        return '<button class="_sv-step" data-id="' + r.id + '" data-step="' + k + '" title="' + esc(label) + (on ? ' — smelltu til að afhaka' : '') + '" ' +
          'style="padding:3px 8px;border-radius:99px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid ' +
          (on ? '#86efac;background:#dcfce7;color:#14532d' : 'var(--brd);background:var(--bg);color:var(--ink4)') + '">' +
          (on ? '✓ ' : '○ ') + esc(label) + '</button>';
      }).join('') + '</div>';
  }
  // nýi stíllinn — framvindu-stika (cards mode)
  function stepper(r) {
    return '<div class="sv-steps">' +
      STEP_DEFS.map(([k, full, short], i) => {
        const on = !!r.steps[k];
        return '<button class="_sv-step sv-step' + (on ? ' on' : '') + '" data-id="' + r.id + '" data-step="' + k + '" title="' + esc(full) + '">' +
          '<span class="ln"></span><span class="nd">' + (on ? '✓' : (i + 1)) + '</span><span class="lb">' + esc(short) + '</span></button>';
      }).join('') + '</div>';
  }
  // bráðabirgða-merkingar (single-select)
  function marks(r) {
    return '<div class="sv-marks">' + MARK_DEFS.map(([k, label, bg, tx, bd]) => {
      const on = r.mark === k;
      const st = on ? ' style="background:' + bg + ';color:' + tx + ';border-color:' + bd + '"' : '';
      return '<button class="sv-mark" data-id="' + r.id + '" data-mark="' + k + '" title="' + esc(label) + (on ? ' — smelltu til að afmerkja' : '') + '"' + st + '>' + (on ? '● ' : '') + esc(label) + '</button>';
    }).join('') + '</div>';
  }
  function note(r) {
    return '<textarea class="sv-note" data-id="' + r.id + '" rows="2" placeholder="Minnispunktur…">' + esc(r.note || '') + '</textarea>';
  }
  function vinnslaActs(r) {
    return '<div class="sv-acts">' +
      '<button class="_sv-act" data-act="open" data-id="' + r.id + '" style="' + btn('var(--surface)','var(--ink2)','var(--brd2)') + '">🏢 Opna</button>' +
      '<button class="_sv-act" data-act="report" data-id="' + r.id + '" style="' + btn('#ede9fe','#5b21b6','#ddd6fe') + '">📄 Skýrsla</button>' +
      '<button class="_sv-act" data-act="buid" data-id="' + r.id + '" style="' + btn('#dcfce7','#14532d','#86efac') + '">✓ Búið</button>' +
      '<button class="_sv-act" data-act="unstart" data-id="' + r.id + '" title="Afmerkja — taka úr vinnslu og af verkstæðinu" style="' + btn('#fef2f2','#b91c1c','#fecaca') + '">✕ Afmerkja</button>' +
      '</div>';
  }
  function nameBlock(r, big) {
    return '<div><div style="font-weight:700;font-size:' + (big ? '15px' : '13.5px') + ';color:var(--ink1);line-height:1.25">' + esc(r.nafn) + '</div>' +
      (r.kennitala ? '<div style="font-size:10px;color:var(--ink4);font-family:monospace;margin-top:1px">kt. ' + esc(fmtKt(r.kennitala)) + '</div>' : '') + '</div>';
  }
  function aminningLine(r, n) { return r.aminning ? '<div style="font-size:10.5px;color:#b45309">📌 ' + esc(r.aminning.slice(0, n || 80)) + '</div>' : ''; }

  // Í-vinnslu kort — list mode (gamli stíllinn) + merkingar + nóta
  function listCard(r) {
    return '<div class="sv-card' + (r.mark === 'haett' ? ' haett' : '') + '">' +
      nameBlock(r, false) + metaChips(r) + aminningLine(r) + stepPills(r) + marks(r) + note(r) + vinnslaActs(r) + '</div>';
  }
  // Í-vinnslu kort — cards mode (nýi stíllinn með stiku)
  function gridCard(r) {
    return '<div class="sv-card' + (r.mark === 'haett' ? ' haett' : '') + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' + nameBlock(r, true) + metaChips(r) + '</div>' +
      stepper(r) + marks(r) + note(r) + aminningLine(r, 90) + vinnslaActs(r) + '</div>';
  }
  // Í-vinnslu kort — wide mode (breið, lág röð; nóta + aðgerðir hægra megin)
  function wideCard(r) {
    return '<div class="sv-card wide' + (r.mark === 'haett' ? ' haett' : '') + '">' +
      '<div class="sv-wide-l">' +
        '<div class="sv-wide-row" style="justify-content:space-between">' + nameBlock(r, false) + metaChips(r) + '</div>' +
        '<div class="sv-wide-row">' + stepPills(r) + marks(r) + '</div>' +
        aminningLine(r) +
      '</div>' +
      '<div class="sv-wide-r">' + note(r) + vinnslaActs(r) + '</div>' +
    '</div>';
  }

  function viewEl() { return document.getElementById(VIEW_ID); }
  function ensureView() {
    if (viewEl()) return;
    const v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view'; v.style.cssText = 'padding:20px';
    const ref = document.getElementById('view-workshop') || document.getElementById('view-counter');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v);
  }
  function render() {
    ensureView(); injectStyles();
    const v = viewEl(); if (!v) return;
    const b = buckets();
    b.vinnsla.sort(SORTERS[_sort] || SORTERS.name);   // röðun valin af notanda
    const fmtSum = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' m.kr.' : (n > 0 ? Math.round(n / 1000) + ' þ.kr.' : '');
    const vinnslaSum = b.vinnsla.reduce((s, r) => s + (+r.tekjur || 0), 0);

    // Collapsible side drawers (collapsed by default).
    function drawerRows(list, withStart) {
      if (!list.length) return '<div class="sv-drawer-row"><span class="mn">Ekkert hér.</span></div>';
      return list.map(r =>
        '<div class="sv-drawer-row"><span class="nm">' + esc(r.nafn) + '</span>' +
          '<span class="mn">' + (r.units > 0 ? '🧯 ' + r.units : '') + '</span>' +
          (withStart
            ? '<button class="_sv-act" data-act="start" data-id="' + r.id + '" style="' + btn('#dbeafe','#1e3a8a','#93c5fd') + '">▶ Hefja vinnslu</button>'
            : '<button class="_sv-act" data-act="open" data-id="' + r.id + '" style="' + btn('var(--surface)','var(--ink2)','var(--brd2)') + '">🏢 Opna</button>') +
        '</div>'
      ).join('');
    }
    const dagskraDrawer = _openDagskra
      ? '<div class="sv-drawer"><div style="padding:10px 14px;font-size:12px;font-weight:700;color:#a16207;background:#fffbeb;border-bottom:1px solid #fde68a">⏳ Á DAGSKRÁ — hefja næsta</div>' + drawerRows(b.dagskra, true) + '</div>'
      : '';
    const buidDrawer = _openBuid
      ? '<div class="sv-drawer"><div style="padding:10px 14px;font-size:12px;font-weight:700;color:#15803d;background:#f0fdf4;border-bottom:1px solid #bbf7d0">✅ BÚIÐ Í ÁR</div>' + drawerRows(b.buid, false) + '</div>'
      : '';

    // The blue work area — list (default) or cards.
    const body = b.vinnsla.length
      ? (_mode === 'cards' ? '<div class="sv-grid">' + b.vinnsla.map(gridCard).join('') + '</div>'
        : _mode === 'wide' ? '<div class="sv-list-wide">' + b.vinnsla.map(wideCard).join('') + '</div>'
        : '<div class="sv-list">' + b.vinnsla.map(listCard).join('') + '</div>')
      : '<div style="color:var(--brd2);font-size:13px;padding:26px;text-align:center;border:1px dashed var(--brd);border-radius:12px">Ekkert í vinnslu núna.</div>';

    v.innerHTML = '<div style="max-width:1080px;margin:0 auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:4px">' +
        '<h1 style="font-size:22px;margin:0;font-weight:750">🔧 ÞjónustuVerkstæði</h1>' +
        '<div class="sv-seg"><button data-mode="list"' + (_mode === 'list' ? ' class="on"' : '') + '>☰ Listi</button><button data-mode="wide"' + (_mode === 'wide' ? ' class="on"' : '') + '>▭ Breitt</button><button data-mode="cards"' + (_mode === 'cards' ? ' class="on"' : '') + '>▦ Spjöld</button></div>' +
      '</div>' +
      '<p style="color:var(--ink3);font-size:14px;margin:0 0 14px">Það sem er í vinnslu núna' + (vinnslaSum > 0 ? ' · <span title="Samtals áætlaðar tekjur, m. vsk">áætl. ' + fmtSum(vinnslaSum) + '</span>' : '') + '.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
        '<span class="sv-chip" style="background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;font-weight:800">🔵 <span class="n" style="color:#1d4ed8">' + b.vinnsla.length + '</span> í vinnslu</span>' +
        '<span class="sv-chip" data-toggle="dagskra">⏳ <span class="n">' + b.dagskra.length + '</span> á dagskrá ' + (_openDagskra ? '▾' : '▸') + '</span>' +
        '<span class="sv-chip" data-toggle="buid">✅ <span class="n">' + b.buid.length + '</span> búin í ár ' + (_openBuid ? '▾' : '▸') + '</span>' +
        '<select class="sv-sort" title="Raða Í-vinnslu listanum" style="margin-left:auto;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink2);border:1px solid var(--brd);border-radius:99px;padding:7px 30px 7px 13px;background:var(--surface);cursor:pointer">' +
          '<option value="name"' + (_sort === 'name' ? ' selected' : '') + '>↕ Nafn (A–Ö)</option>' +
          '<option value="revenue"' + (_sort === 'revenue' ? ' selected' : '') + '>↕ Hæstu tekjur</option>' +
          '<option value="marked"' + (_sort === 'marked' ? ' selected' : '') + '>↕ Nýlega merkt</option>' +
        '</select>' +
      '</div>' +
      dagskraDrawer + buidDrawer + body + '</div>';

    // view-mode toggle
    v.querySelectorAll('.sv-seg button').forEach(bn => bn.addEventListener('click', () => setMode(bn.dataset.mode)));
    // sort
    const sortSel = v.querySelector('.sv-sort');
    if (sortSel) sortSel.addEventListener('change', e => setSort(e.target.value));
    // collapse/expand sides
    v.querySelectorAll('.sv-chip[data-toggle]').forEach(ch => ch.addEventListener('click', () => {
      if (ch.dataset.toggle === 'dagskra') _openDagskra = !_openDagskra; else _openBuid = !_openBuid;
      render();
    }));
    // card actions
    v.querySelectorAll('._sv-act').forEach(bn => bn.addEventListener('click', e => {
      e.stopPropagation();
      const id = +bn.dataset.id, act = bn.dataset.act;
      if (act === 'open') openCompany(id);
      else if (act === 'report') openReport(id);
      else if (act === 'start') startVinnsla(id);
      else if (act === 'buid') markBuid(id);
      else if (act === 'reopen') reopen(id);
      else if (act === 'unstart') unVinnsla(id);
    }));
    // follow-up steps (pills + stepper share class) — all four ✓ → auto Búið
    v.querySelectorAll('._sv-step').forEach(bn => bn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = +bn.dataset.id, k = bn.dataset.step;
      const cur = (arsMap()[String(id)] || {})[STEPS_KEY] || {};
      const next = Object.assign({}, cur, { [k]: !cur[k] });
      await setFlag(id, { [STEPS_KEY]: next });
      if (STEP_DEFS.every(([sk]) => next[sk])) { toast('✓ Öll skref klár — fært í Búið'); markBuid(id); }
    }));
    // temp marks (single-select)
    v.querySelectorAll('.sv-mark').forEach(bn => bn.addEventListener('click', e => {
      e.stopPropagation();
      const id = +bn.dataset.id, k = bn.dataset.mark;
      const cur = (arsMap()[String(id)] || {}).sv_mark || '';
      const next = cur === k ? '' : k;
      // stimpla hvenær merkt (fyrir "Nýlega merkt" röðun); núllað þegar afmerkt
      setFlag(id, { sv_mark: next, sv_mark_at: next ? Date.now() : 0 });
    }));
    // note — save on blur, no re-render (keep focus while typing)
    v.querySelectorAll('.sv-note').forEach(ta => ta.addEventListener('change', e => {
      e.stopPropagation();
      setFlag(+ta.dataset.id, { sv_note: ta.value }, { silent: true });
    }));
  }

  function openView() {
    document.querySelectorAll('[id^=view-]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    ensureView();
    const v = viewEl(); v.style.display = ''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(x => x.classList.remove('active'));
    const b = document.querySelector('[data-view="' + NAV_KEY + '"]'); if (b) b.classList.add('active');
    render();
    ensureArsData(); // einingar + áætlaðar tekjur — re-renders when loaded
  }
  function injectTab() {
    const btns = Array.prototype.slice.call(document.querySelectorAll('.vnav-btn'));
    const anchor = btns.find(b => b.dataset.view === 'workshop') || btns.find(b => b.dataset.view === 'counter');
    if (!anchor || !anchor.parentElement) return;
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const btn = anchor.cloneNode(true);
    btn.dataset.view = NAV_KEY; btn.classList.remove('active');
    const span = btn.querySelector('span');
    if (span) span.textContent = '🔧 ÞjónustuVerkstæði'; else btn.textContent = '🔧 ÞjónustuVerkstæði';
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n => n.remove());
    btn.removeAttribute('onclick');
    btn.onclick = openView;
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    document.querySelectorAll('.vnav-btn').forEach(b => { if (b === btn) return; b.addEventListener('click', () => { const vv = viewEl(); if (vv) { vv.style.display = 'none'; vv.classList.remove('active'); } btn.classList.remove('active'); }); });
    console.log('[þjónustuverkstæði] tab injected');
  }
  setInterval(injectTab, 1200);
  setTimeout(injectTab, 600);
  try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { if (viewEl() && viewEl().classList.contains('active')) render(); }); } catch (_) {}

  window.ThjonustuVerkstaedi = { render, open: openView, buckets };
  console.log('[patch-190 v2] ÞjónustuVerkstæði (company Kanban) installed');
})();
/* === END ÞJÓNUSTUVERKSTÆÐI === */
