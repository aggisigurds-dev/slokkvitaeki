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
  // Afleidd (effective) skref — speglun FRÁ Fyrirtæki í þjónustu (153):
  // fyrirtæki sem 153 (eða Bílstjóri 219 / ArsWorkflow 266) merkti „Í vinnslu"
  // (field_inspected_year === curYear) telst með úttektina búna, og fullklárað
  // ár (last_year_inspected === curYear) sýnir öll fjögur skref græn — nema
  // skrefið hafi verið afhakað sérstaklega (explicit false vinnur alltaf).
  function effSteps(a, hasReik) {
    a = a || {};
    const s = Object.assign({}, a[STEPS_KEY] || {});
    if (s.uttekt === undefined && +a.field_inspected_year === curYear) s.uttekt = true;
    if (+a.last_year_inspected === curYear) STEP_DEFS.forEach(([k]) => { if (s[k] === undefined) s[k] = true; });
    // 2026-07-15: reikningur ársins þegar á skrá í customer_documents (sama
    // gögn og græna „Reikningur <ár> sendur" borðinn) ⇒ Reikningur-skrefið
    // telst búið þó enginn hafi smellt á það — send-leiðirnar (Kröfuyfirlit,
    // PDF-sjálfvistun, Drive) skrifa ekki skref. Skýrt afhak (false) vinnur.
    if (s.reikningur === undefined && hasReik) s.reikningur = true;
    return s;
  }
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

  // Companies that ALREADY have a reikningur filed for the current year in
  // customer_documents (Drive-indexed + POS-connected — the same store the
  // company profile "Skjöl & viðhengi" reads). A green "🧾 Reikningur <ár> sendur"
  // banner + "Fjarlægja af borði" then lets the office clear them off the board.
  // Keyed by digits-only kennitala. Loaded once, async, then re-render.
  let _reik2026 = new Set();
  let _reik2026Loaded = false;
  // co.id → á reikning ársins (fyllt í buckets(), notað í skref-smellinum svo
  // smellurinn sjái SÖMU afleiddu skrefin og teiknuð eru)
  let _reikCoIds = new Set();
  async function loadReik2026() {
    try {
      const sb = (window.DB && DB.sb); if (!sb) return;
      const r = await sb.from('customer_documents')
        .select('customer_base_id').eq('doc_type', 'reikningur').eq('year', curYear)
        .not('customer_base_id', 'is', null);
      const baseIds = Array.from(new Set((r.data || []).map(x => x.customer_base_id).filter(v => v != null)));
      const kts = new Set();
      for (let i = 0; i < baseIds.length; i += 500) {
        const chunk = baseIds.slice(i, i + 500);
        const b = await sb.from('customers_base').select('kennitala').in('id', chunk);
        (b.data || []).forEach(x => { const d = digits(x.kennitala); if (d.length >= 10) kts.add(d); });
      }
      _reik2026 = kts;
    } catch (_) {}
    render();
  }

  const SORTERS = {
    name:    (x, y) => String(x.nafn).localeCompare(y.nafn, 'is'),
    revenue: (x, y) => ((+y.tekjur || 0) - (+x.tekjur || 0)) || String(x.nafn).localeCompare(y.nafn, 'is'),
    marked:  (x, y) => ((+y.markedAt || 0) - (+x.markedAt || 0)) || String(x.nafn).localeCompare(y.nafn, 'is'),
  };
  // Collapsible hliðar-dálkar — collapsed by default ("collapse both of each side").
  let _openDagskra = false, _openBuid = false;

  function injectStyles() {
    if (document.getElementById('_sv-styles')) return;
    // Spec theme overrides — match THEME-SPEC.md (sticky-header table, tinted stat chips,
    // metallic black filter chips, accent green confirm buttons, Space Mono numbers,
    // surface cards). Injected first so the local .sv-* rules can still tweak layout.
    if (!document.getElementById('_sv-theme')) {
      const t = document.createElement('style');
      t.id = '_sv-theme';
      t.textContent = [
        // page heading on white-area (we render below the banner, not on the dark band)
        '#' + VIEW_ID + ' h1{font-family:"Space Grotesk",system-ui,sans-serif;letter-spacing:-.01em;color:#11141c}',
        // Card surface (the wrapper card for each Í-vinnslu row)
        '#' + VIEW_ID + ' .sv-card{background:#fff!important;border:1px solid rgba(20,24,34,.08)!important;border-left:3px solid #2f5fe0!important;border-radius:16px!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)!important;padding:18px 20px!important}',
        '#' + VIEW_ID + ' .sv-card.haett{border-left-color:#c0241f!important}',
        // Segmented mode-switch (Listi / Breitt / Spjöld) — metallic black pill (filter-chip style)
        '#' + VIEW_ID + ' .sv-seg{background:#fff;border:1px solid rgba(20,24,34,.14);border-radius:11px;padding:3px;gap:3px;box-shadow:0 1px 2px rgba(0,0,0,.04)}',
        '#' + VIEW_ID + ' .sv-seg button{font-family:"Space Grotesk",system-ui,sans-serif;font-size:13px;font-weight:600;color:#3a4250;padding:7px 14px;border-radius:9px;cursor:pointer;background:transparent;border:0}',
        '#' + VIEW_ID + ' .sv-seg button.on{background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.18)}',
        // Tinted stat chips (Í vinnslu blue, Á dagskrá amber, Búið green) matching spec
        '#' + VIEW_ID + ' .sv-chip{font-family:"Space Grotesk",system-ui,sans-serif;font-size:13px;font-weight:600;padding:8px 16px;border-radius:11px;border:1px solid rgba(20,24,34,.14);background:#fff;color:#3a4250;cursor:pointer;display:inline-flex;align-items:center;gap:8px}',
        '#' + VIEW_ID + ' .sv-chip .n{font-family:"Space Mono",monospace;font-weight:700;color:inherit}',
        // Sort select — pill style
        '#' + VIEW_ID + ' .sv-sort{height:36px;border:1px solid rgba(20,24,34,.14)!important;border-radius:11px!important;background:#fff!important;color:#3a4250!important;font-weight:600!important;font-size:12.5px!important;cursor:pointer}',
        // Drawer (Á dagskrá / Búið expanded list)
        '#' + VIEW_ID + ' .sv-drawer{background:#fff!important;border:1px solid rgba(20,24,34,.08)!important;border-radius:14px!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)!important}',
        '#' + VIEW_ID + ' .sv-drawer-row{border-bottom:1px solid rgba(20,24,34,.06)!important;font-size:13.5px;color:#3a4250}',
        '#' + VIEW_ID + ' .sv-drawer-row .nm{font-weight:600!important;color:#11141c!important}',
        '#' + VIEW_ID + ' .sv-drawer-row .mn{font-family:"Space Mono",monospace!important;color:#9098a6!important}',
        // Stepper — green check filled when ON
        '#' + VIEW_ID + ' .sv-steps{background:#f8fafc;border:1px solid rgba(20,24,34,.06);border-radius:12px;padding:14px 16px}',
        '#' + VIEW_ID + ' .sv-step .nd{width:24px!important;height:24px!important;border:2px solid #cbd5e1!important;color:#64748b!important;font-size:11px!important}',
        '#' + VIEW_ID + ' .sv-step.on .nd{background:linear-gradient(150deg,#2bbf6c,#0f6e3a)!important;border-color:#0f6e3a!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}',
        '#' + VIEW_ID + ' .sv-step .lb{font-size:11px!important;font-weight:600!important;color:#64748b!important;text-transform:none!important;letter-spacing:0!important}',
        '#' + VIEW_ID + ' .sv-step.on .lb{color:#0f6e3a!important}',
        '#' + VIEW_ID + ' .sv-step.on .ln{background:#2bbf6c!important}',
        // Marks (Hætt / Eftir að uppfæra / Reikningur áður)
        '#' + VIEW_ID + ' .sv-mark{font-family:"Space Grotesk",system-ui,sans-serif;font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:8px;border:1px solid rgba(20,24,34,.14);background:#f6f8fb;color:#5b6472;cursor:pointer;white-space:nowrap}',
        // Note textarea
        '#' + VIEW_ID + ' .sv-note{background:#f6f8fb!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:11px!important;padding:11px 13px!important;color:#141822!important;font-family:"Space Grotesk",system-ui,sans-serif!important;font-size:13px!important;line-height:1.45!important}',
        '#' + VIEW_ID + ' .sv-note:focus{outline:none!important;border-color:#2f5fe0!important;background:#fff!important;box-shadow:0 0 0 3px rgba(47,95,224,.12)!important}',
        // Action row
        '#' + VIEW_ID + ' .sv-acts{border-top:0!important;padding-top:0!important;gap:8px!important}',
        '#' + VIEW_ID + ' .sv-acts ._sv-act{height:36px!important;padding:0 13px!important;border-radius:10px!important;border:1px solid rgba(20,24,34,.14)!important;background:#f1f5f9!important;color:#3a4250!important;font-family:"Space Grotesk",system-ui,sans-serif!important;font-size:12.5px!important;font-weight:600!important;cursor:pointer!important}',
        '#' + VIEW_ID + ' .sv-acts ._sv-act[data-act="buid"]{border:1px solid #156e3a!important;background:linear-gradient(150deg,#2bbf6c,#0f6e3a)!important;color:#fff!important;font-weight:700!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)!important}',
        '#' + VIEW_ID + ' .sv-acts ._sv-act[data-act="unstart"]{border:1px solid #f3c6c4!important;background:#fdecec!important;color:#c0241f!important}',
        '#' + VIEW_ID + ' .sv-acts ._sv-act[data-act="report"]{background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)!important;border-color:#0a0b0d!important;color:#fff!important}',
        // Wide-mode right pane — make action stack tidy
        '#' + VIEW_ID + ' .sv-wide-r{gap:9px!important}',
        // Wide-mode stepper — full-label nodes in a grey strip (comp: ThjonustuVerkstaedi wide)
        '#' + VIEW_ID + ' .sv-stepsw{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#f6f8fb;border:1px solid rgba(20,24,34,.06);border-radius:12px;padding:13px 18px}',
        '#' + VIEW_ID + ' .sv-stepw{display:inline-flex;align-items:center;gap:8px;background:none;border:0;padding:0;cursor:pointer;font:inherit}',
        '#' + VIEW_ID + ' .sv-stepw .nd{width:26px;height:26px;border-radius:50%;border:2px solid #cbd5e1;background:#fff;color:#94a3b8;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;box-sizing:border-box}',
        '#' + VIEW_ID + ' .sv-stepw.on .nd{background:linear-gradient(150deg,#2bbf6c,#0f6e3a);border-color:#0f6e3a;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}',
        '#' + VIEW_ID + ' .sv-stepw .lb{font-family:"Space Grotesk",system-ui,sans-serif;font-size:12.5px;font-weight:600;color:#5b6472;white-space:nowrap}',
        '#' + VIEW_ID + ' .sv-stepw.on .lb{color:#0f6e3a;font-weight:700}',
        '#' + VIEW_ID + ' .sv-lnw{flex:1;min-width:12px;max-width:46px;height:3px;border-radius:2px;background:#dbe1ea}',
        '#' + VIEW_ID + ' .sv-lnw.on{background:#2bbf6c}',
        // Wide-mode right column — big note, 3-button row, full-width Afmerkja below
        '#' + VIEW_ID + ' .sv-wide-r{flex:0 0 340px!important}',
        '#' + VIEW_ID + ' .sv-wide-r .sv-note{min-height:86px!important}',
        '#' + VIEW_ID + ' .sv-actsw{display:flex!important;gap:8px!important;flex-wrap:nowrap!important;border-top:0!important;padding-top:0!important}',
        '#' + VIEW_ID + ' .sv-actsw ._sv-act{flex:1;height:42px!important;white-space:nowrap}',
        '#' + VIEW_ID + ' .sv-actsw ._sv-act[data-act="report"]{background:#f1f5f9!important;border-color:rgba(20,24,34,.14)!important;color:#3a4250!important}',
        '#' + VIEW_ID + ' .sv-unmarkw{width:100%;height:38px;border:1px solid #f3c6c4!important;background:#fdf1f1!important;color:#c0241f!important;border-radius:10px!important;font-family:"Space Grotesk",system-ui,sans-serif!important;font-size:12.5px!important;font-weight:700!important;cursor:pointer}',
        // Numbers in mono
        '#' + VIEW_ID + ' [data-mono],#' + VIEW_ID + ' .sv-kt{font-family:"Space Mono",monospace}'
      ].join('');
      document.head.appendChild(t);
    }
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
      '#' + VIEW_ID + ' .sv-step .nd{position:relative;z-index:1;width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:2px solid var(--brd);background:var(--surface);color:var(--ink2)}',
      '#' + VIEW_ID + ' .sv-step.on .nd{background:#16a34a;border-color:#16a34a;color:#fff}',
      '#' + VIEW_ID + ' .sv-step .lb{font-size:10px;font-weight:700;color:var(--ink3);text-align:center;line-height:1.2}',
      '#' + VIEW_ID + ' .sv-step.on .lb{color:#15803d}',
      // marks
      '#' + VIEW_ID + ' .sv-marks{display:flex;gap:6px;flex-wrap:wrap}',
      '#' + VIEW_ID + ' .sv-mark{border:1px solid #cbd5e1;background:#eef2f7;color:#334155;border-radius:99px;padding:5px 11px;font-size:11px;font-weight:700;cursor:pointer}',
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

  // Does the company ALREADY have BOTH an úttektarskýrsla and a reikningur filed
  // for the current year? (patch 111/199/233 company attachments — explicit
  // kind:'skyrsla'/'reikningur' tag wins, else sniff the filename.) Used to alert
  // that a card on the board is in fact fully documented for the year.
  function docYearOf(f) {
    if (f.year && f.year !== '0') return String(f.year);
    const m = String(f.name || '').match(/\b(20[2-3][0-9])\b/);
    return m ? m[1] : null;
  }
  function docKindOf(f) {
    if (f.kind === 'skyrsla' || f.kind === 'reikningur') return f.kind;
    const n = String(f.name || '').toLowerCase();
    if (/reikning|\br-?\d/.test(n)) return 'reikningur';
    if (/úttekt|uttekt|skýrsl|skyrsl/.test(n)) return 'skyrsla';
    return null;
  }
  function hasFullDocs(coId) {
    const files = (window.CompanyAttachments && CompanyAttachments.list) ? (CompanyAttachments.list(coId) || []) : [];
    let sk = false, re = false;
    for (const f of files) {
      if (docYearOf(f) !== String(curYear)) continue;
      const k = docKindOf(f);
      if (k === 'skyrsla') sk = true; else if (k === 'reikningur') re = true;
    }
    return sk && re;
  }

  // Build the three buckets from the company list + arsskodun flags.
  function buckets() {
    const map = arsMap();
    const cos = (window.Companies && Companies.list) || [];
    const out = { dagskra: [], vinnsla: [], buid: [] };
    _reikCoIds = new Set();
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
      const hasReik = _reik2026.has(digits(co.kennitala));
      if (hasReik) _reikCoIds.add(co.id);
      const card = {
        id: co.id, nafn: co.nafn || ('#' + co.id), kennitala: co.kennitala || '',
        month: m, aminning: (a.aminning || '').trim(),
        steps: effSteps(a, hasReik),   // afleidd úr 153-stöðu + reikningi ársins þegar skref eru óskráð
        mark: a.sv_mark || '',          // bráðabirgða-merking (single-select)
        note: a.sv_note || '',          // bráðabirgða-minnispunktur (frítexti)
        markedAt: +a.sv_mark_at || 0,   // hvenær síðast merkt (fyrir "Nýlega merkt" röðun)
        units: +info._unit_count || 0,
        tekjur: +info.estimated_yearly || 0,
        hasDraft: hasDraft,
        doneDocs: hasFullDocs(co.id),  // already has skýrsla + reikningur for the year
        reik2026: hasReik   // 2026 reikningur á skrá (customer_documents)
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
    const draftChip = r.hasDraft ? '<span title="Óklárað úttekt vistuð — heldur áfram á fyrirtækjasíðunni" style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:7px;background:#fffbeb;color:#b45309;border:1px solid #fde68a;white-space:nowrap">📝 óklárað vistað</span>' : '';
    if (!(r.units > 0 || r.tekjur > 0 || draftChip)) return '';
    return '<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">' +
      draftChip +
      (r.units > 0 ? '<span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:7px;background:#eef1f6;color:#475569;border:1px solid #cbd5e1;white-space:nowrap">🧯 ' + r.units + ' einingar</span>' : '') +
      (r.tekjur > 0 ? '<span style="font-family:\'Space Mono\',monospace;font-size:12px;font-weight:700;color:#11141c;align-self:center" title="Áætlaðar tekjur: yfirferðir + skýrslugerð + akstur, m. vsk">áætl. ' + fmtKr(r.tekjur) + '</span>' : '') +
      '</div>';
  }
  // gamli stíllinn — skref sem pillur (list mode)
  function stepPills(r) {
    return '<div style="display:flex;gap:4px;flex-wrap:wrap">' +
      STEP_DEFS.map(([k, label]) => {
        const on = !!r.steps[k];
        return '<button class="_sv-step" data-id="' + r.id + '" data-step="' + k + '" title="' + esc(label) + (on ? ' — smelltu til að afhaka' : '') + '" ' +
          'style="padding:4px 9px;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ' +
          (on ? '#86efac;background:#dcfce7;color:#14532d' : '#cbd5e1;background:#eef2f7;color:#334155') + '">' +
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
  // breiði stíllinn — full-label stika í gráum borða (wide mode, comp-útlitið)
  function stepperWide(r) {
    return '<div class="sv-stepsw">' +
      STEP_DEFS.map(([k, full], i) => {
        const on = !!r.steps[k];
        const prevOn = i > 0 && !!r.steps[STEP_DEFS[i - 1][0]];
        return (i > 0 ? '<span class="sv-lnw' + (prevOn ? ' on' : '') + '"></span>' : '') +
          '<button class="_sv-step sv-stepw' + (on ? ' on' : '') + '" data-id="' + r.id + '" data-step="' + k + '" title="' + esc(full) + (on ? ' — smelltu til að afhaka' : '') + '">' +
          '<span class="nd">' + (on ? '✓' : '') + '</span><span class="lb">' + esc(full) + '</span></button>';
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
    return '<div><div style="font-weight:700;font-size:' + (big ? '15.5px' : '13.5px') + ';color:#11141c;line-height:1.25;letter-spacing:-.005em">' + esc(r.nafn) + '</div>' +
      (r.kennitala ? '<div style="font-family:\'Space Mono\',monospace;font-size:11px;color:#9098a6;margin-top:1px">kt. ' + esc(fmtKt(r.kennitala)) + '</div>' : '') + '</div>';
  }
  function aminningLine(r, n) { return r.aminning ? '<div style="font-size:10.5px;color:#b45309">📌 ' + esc(r.aminning.slice(0, n || 80)) + '</div>' : ''; }
  // Alert banner + "remove from board" button for cards that ALREADY have both an
  // úttektarskýrslu and a reikningur filed for the year (→ they're really done).
  function docAlert(r) {
    if (!r.doneDocs) return '';
    return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:7px 10px;font-size:11.5px;color:#92400e;font-weight:600">' +
      '⚠️ Þegar með úttektarskýrslu + reikning fyrir ' + curYear +
      '<button class="_sv-act" data-act="removedone" data-id="' + r.id + '" title="Fært í „Búið í ár“ og fjarlægt af verkstæðinu" style="' + btn('#dcfce7', '#14532d', '#86efac') + ';margin-left:auto">✔️ Fjarlægja af borði</button>' +
      '</div>';
  }
  // 2026 reikningur er þegar sendur/tengdur (customer_documents) — grænt banner
  // svo hægt sé að taka fyrirtækið af borðinu. Sleppt ef docAlert sýnir þegar
  // (það nær yfir bæði skýrslu + reikning).
  function reikAlert(r) {
    if (!r.reik2026 || r.doneDocs) return '';
    return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;padding:7px 10px;font-size:11.5px;color:#15803d;font-weight:700">' +
      '🧾 Reikningur ' + curYear + ' sendur' +
      '<button class="_sv-act" data-act="removedone" data-id="' + r.id + '" title="Fært í „Búið í ár“ og fjarlægt af verkstæðinu" style="' + btn('#dcfce7', '#14532d', '#86efac') + ';margin-left:auto">✔️ Fjarlægja af borði</button>' +
      '</div>';
  }

  // Í-vinnslu kort — list mode (gamli stíllinn) + merkingar + nóta
  function listCard(r) {
    return '<div class="sv-card' + (r.mark === 'haett' ? ' haett' : '') + '">' +
      docAlert(r) + reikAlert(r) + nameBlock(r, false) + metaChips(r) + aminningLine(r) + stepPills(r) + marks(r) + note(r) + vinnslaActs(r) + '</div>';
  }
  // Í-vinnslu kort — cards mode (nýi stíllinn með stiku)
  function gridCard(r) {
    return '<div class="sv-card' + (r.mark === 'haett' ? ' haett' : '') + '">' +
      docAlert(r) + reikAlert(r) +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' + nameBlock(r, true) + metaChips(r) + '</div>' +
      stepper(r) + marks(r) + note(r) + aminningLine(r, 90) + vinnslaActs(r) + '</div>';
  }
  // Í-vinnslu kort — wide mode (comp-útlitið: nafn+chips, full-label stika í
  // gráum borða, merkingar undir; hægra megin nóta → Opna/Skýrsla/Búið → Afmerkja)
  function vinnslaActsWide(r) {
    return '<div class="sv-acts sv-actsw">' +
      '<button class="_sv-act" data-act="open" data-id="' + r.id + '">📁 Opna</button>' +
      '<button class="_sv-act" data-act="report" data-id="' + r.id + '">📄 Skýrsla</button>' +
      '<button class="_sv-act" data-act="buid" data-id="' + r.id + '">✓ Búið</button>' +
      '</div>' +
      '<button class="_sv-act sv-unmarkw" data-act="unstart" data-id="' + r.id + '" title="Afmerkja — taka úr vinnslu og af verkstæðinu">✕ Afmerkja</button>';
  }
  function wideCard(r) {
    return '<div class="sv-card wide' + (r.mark === 'haett' ? ' haett' : '') + '">' +
      '<div class="sv-wide-l">' +
        docAlert(r) + reikAlert(r) +
        '<div class="sv-wide-row">' + nameBlock(r, true) + metaChips(r) + '</div>' +
        stepperWide(r) +
        marks(r) +
        aminningLine(r) +
      '</div>' +
      '<div class="sv-wide-r">' + note(r) + vinnslaActsWide(r) + '</div>' +
    '</div>';
  }

  function viewEl() { return document.getElementById(VIEW_ID); }
  function ensureView() {
    if (viewEl()) return;
    const v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view'; v.style.cssText = 'padding:10px 16px 34px';
    const ref = document.getElementById('view-workshop') || document.getElementById('view-counter');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v);
  }
  function render() {
    ensureView(); injectStyles();
    const v = viewEl(); if (!v) return;
    if (!_reik2026Loaded) { _reik2026Loaded = true; loadReik2026(); }   // once → re-renders with reikningur-badges
    const b = buckets();
    b.vinnsla.sort(SORTERS[_sort] || SORTERS.name);   // röðun valin af notanda
    const fmtSum = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' m.kr.' : (n > 0 ? Math.round(n / 1000) + ' þ.kr.' : '');
    const vinnslaSum = b.vinnsla.reduce((s, r) => s + (+r.tekjur || 0), 0);

    // Collapsible side drawers (collapsed by default).
    function drawerRows(list, withStart) {
      if (!list.length) return '<div class="sv-drawer-row"><span class="mn">Ekkert hér.</span></div>';
      return list.map(r =>
        '<div class="sv-drawer-row"><span class="nm">' + esc(r.nafn) +
          (withStart && r.doneDocs ? ' <span title="Þegar með úttektarskýrslu + reikning fyrir ' + curYear + '" style="font-size:10.5px;font-weight:700;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:1px 6px;white-space:nowrap">⚠️ skjöl komin</span>' : '') +
          '</span>' +
          '<span class="mn">' + (r.units > 0 ? '🧯 ' + r.units : '') + '</span>' +
          (withStart && r.doneDocs
            ? '<button class="_sv-act" data-act="removedone" data-id="' + r.id + '" title="Fært í „Búið í ár“ og fjarlægt af verkstæðinu" style="' + btn('#dcfce7','#14532d','#86efac') + '">✔️ Fjarlægja</button>'
            : withStart
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
      : '<div style="color:#8a93a5;font-size:13px;padding:30px;text-align:center;border:1px dashed rgba(20,24,34,.12);border-radius:14px;background:#fff">Ekkert í vinnslu núna.</div>';

    // Header + stat pills — mirrors reference comp ThjonustuVerkstaedi-board.dc.html
    // (plain title on the page band + a Listi/Breitt/Spjöld segmented toggle +
    // sort; the three counts are small coloured PILLS, not big cards).
    const pill = (label, count, c, opts) => {
      opts = opts || {};
      const arrow = opts.toggle ? (' <span style="opacity:.55;font-size:11px">' + (opts.open ? '▾' : '▸') + '</span>') : '';
      return '<button ' + (opts.toggle ? 'data-toggle="' + opts.toggle + '" ' : '') +
        'style="font-family:\'Space Grotesk\',system-ui,sans-serif;font-size:13px;font-weight:600;padding:8px 16px;border-radius:11px;border:1px solid ' + c.bd + ';background:' + c.bg + ';color:' + c.fg + ';cursor:' + (opts.toggle ? 'pointer' : 'default') + ';display:inline-flex;align-items:center;gap:8px">' +
        '<span style="width:9px;height:9px;border-radius:50%;background:' + c.dot + '"></span>' +
        '<b style="font-family:\'Space Mono\',monospace">' + count + '</b> ' + esc(label) + arrow + '</button>';
    };
    v.innerHTML = '<div style="max-width:none;margin:0;width:100%;box-sizing:border-box;padding:6px 10px 34px;font-family:\'Space Grotesk\',system-ui,sans-serif">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin:2px 2px 14px">' +
        '<div style="min-width:0">' +
          '<div style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-.01em;line-height:1.1;text-shadow:0 1px 3px rgba(0,0,0,.35)">🔧 ÞjónustuVerkstæði</div>' +
          '<div style="font-size:13px;color:#c7cdd8;margin-top:4px">Það sem er í vinnslu núna' + (vinnslaSum > 0 ? ' · áætl. <b style="font-family:\'Space Mono\',monospace;color:#ffffff">' + fmtSum(vinnslaSum) + '</b>' : '') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">' +
          '<div class="sv-seg"><button data-mode="list"' + (_mode === 'list' ? ' class="on"' : '') + '>Listi</button><button data-mode="wide"' + (_mode === 'wide' ? ' class="on"' : '') + '>Breitt</button><button data-mode="cards"' + (_mode === 'cards' ? ' class="on"' : '') + '>Spjöld</button></div>' +
          '<select class="sv-sort" title="Raða Í-vinnslu listanum">' +
            '<option value="name"' + (_sort === 'name' ? ' selected' : '') + '>Nafn (A–Ö)</option>' +
            '<option value="revenue"' + (_sort === 'revenue' ? ' selected' : '') + '>Hæstu tekjur</option>' +
            '<option value="marked"' + (_sort === 'marked' ? ' selected' : '') + '>Nýlega merkt</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:0 2px 16px">' +
        pill('í vinnslu', b.vinnsla.length, { fg: '#2f5fe0', bg: '#eef3ff', bd: '#c6d6ff', dot: '#2f5fe0' }) +
        pill('á dagskrá', b.dagskra.length, { fg: '#b45309', bg: '#fffbeb', bd: '#fde68a', dot: '#b45309' }, { toggle: 'dagskra', open: _openDagskra }) +
        pill('búin í ár', b.buid.length, { fg: '#047857', bg: '#ecfdf5', bd: '#a7f3d0', dot: '#047857' }, { toggle: 'buid', open: _openBuid }) +
      '</div>' +
      dagskraDrawer + buidDrawer + body + '</div>';

    // view-mode toggle
    v.querySelectorAll('.sv-seg button').forEach(bn => bn.addEventListener('click', () => setMode(bn.dataset.mode)));
    // sort
    const sortSel = v.querySelector('.sv-sort');
    if (sortSel) sortSel.addEventListener('change', e => setSort(e.target.value));
    // collapse/expand sides
    v.querySelectorAll('[data-toggle]').forEach(ch => ch.addEventListener('click', () => {
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
      else if (act === 'removedone') { toast('Fært í „Búið í ár“ — komið með skýrslu + reikning'); markBuid(id); }
    }));
    // follow-up steps (pills + stepper share class).
    // Sync í Fyrirtæki í þjónustu (153): skref sett Á ⇒ árið telst hafið
    // (field_inspected_year → blátt „Í skýrslugerð" á 153); „Reikningur sendur"
    // eða öll fjögur ✓ ⇒ árið fullklárað (last_year_inspected → grænt á 153).
    v.querySelectorAll('._sv-step').forEach(bn => bn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = +bn.dataset.id, k = bn.dataset.step;
      const a = arsMap()[String(id)] || {};
      const cur = effSteps(a, _reikCoIds.has(id));               // sama sýn og teiknuð er
      const next = Object.assign({}, a[STEPS_KEY] || {}, cur, { [k]: !cur[k] });
      const extra = {};
      if (next[k] && +a.last_year_inspected !== curYear) extra.field_inspected_year = curYear;
      await setFlag(id, Object.assign({ [STEPS_KEY]: next }, extra));
      // Aðeins þegar smellurinn kveikti á skrefi (aldrei við afhak):
      if (next[k] && (k === 'reikningur' || STEP_DEFS.every(([sk]) => next[sk]))) {
        toast(k === 'reikningur' ? '✓ Reikningur sendur — fært í Búið' : '✓ Öll skref klár — fært í Búið');
        markBuid(id);
      }
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
