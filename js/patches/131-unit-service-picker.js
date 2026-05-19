/* Per-unit "Áætlað" picker í tæki-töflu á fyrirtækisspjaldi.
 *
 * Bætir dálk við hliðina á "Staða" í tæki-töflu á Companies.openDetail.
 * Notandi getur fyrir hvert tæki valið:
 *   • Hleðsla    — full hleðsla (sjálfgefið)
 *   • Yfirferð   — bara skoðun
 *   • Sleppa     — fer ekki í þessari ferð
 *
 * Vistast í localStorage[`slokk_trip_<coId>`].units[unitId] og patch 129
 * (Heildarkostnaður) reads það til að reikna réttan kostnað.
 */
(() => {
  if (window.__unitServicePickerInstalled) return;
  window.__unitServicePickerInstalled = true;

  const CHOICES = [
    { v: 'hledsla',  label: 'Hleðsla',  color: '#166534', bg: '#dcfce7' },
    { v: 'yfirferd', label: 'Yfirferð', color: '#1e40af', bg: '#dbeafe' },
    { v: 'none',     label: 'Sleppa',   color: '#64748b', bg: '#f1f5f9' }
  ];

  // 2026-05-19: type-aware default per Agnar's workflow. The Stolpi/Slökkvitæki
  // billing model differs per agent — Duft tends to need full hleðsla, while
  // Léttvatn and CO₂ usually only get a yfirferð.
  function defaultForType(typeText) {
    const t = (typeText || '').toLowerCase();
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) return 'hledsla';
    if (/co2|co₂|co_?2|kolsýr|kolsyr/.test(t)) return 'yfirferd';
    if (/léttv|lettv|abf|vatn|water/.test(t)) return 'yfirferd';
    return 'yfirferd'; // safe default for unknowns
  }

  // Categorize a row's Tegund text into one of the chip filter buckets.
  function typeBucket(typeText) {
    const t = (typeText || '').toLowerCase();
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) return 'duft';
    if (/co2|co₂|co_?2|kolsýr|kolsyr/.test(t)) return 'co2';
    if (/léttv|lettv|abf|vatn|water|froð/.test(t)) return 'lettvatn';
    if (/slang|hose/.test(t)) return 'slangur';
    if (/reykskynj|smoke/.test(t)) return 'reyk';
    return 'annad';
  }
  const BUCKETS = [
    { v: 'all',      label: '🔘 Allt',       color: '#0f172a' },
    { v: 'duft',     label: '🧯 Duft',       color: '#92400e' },
    { v: 'lettvatn', label: '💧 Léttvatn',   color: '#1e40af' },
    { v: 'co2',      label: '🌫 CO₂',        color: '#475569' },
    { v: 'slangur',  label: '🚒 Slöngur',    color: '#b91c1c' },
    { v: 'reyk',     label: '🚨 Reyk',       color: '#7c3aed' },
    { v: 'annad',    label: '⚙ Annað',      color: '#64748b' }
  ];

  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }

  function tripStateKey(coId) { return 'slokk_trip_' + coId; }
  function loadTripState(coId) {
    try { return JSON.parse(localStorage.getItem(tripStateKey(coId)) || '{}'); }
    catch (_) { return {}; }
  }
  function saveTripState(coId, state) {
    try { localStorage.setItem(tripStateKey(coId), JSON.stringify(state)); } catch (_) {}
  }

  function getUnitChoice(coId, unitId, typeText) {
    const st = loadTripState(coId);
    return (st.units && st.units[unitId]) || defaultForType(typeText);
  }
  function setUnitChoice(coId, unitId, value) {
    const st = loadTripState(coId);
    st.units = st.units || {};
    st.units[unitId] = value;
    saveTripState(coId, st);
  }

  function selectHtml(coId, unitId, typeText) {
    const cur = getUnitChoice(coId, unitId, typeText);
    const curDef = CHOICES.find(c => c.v === cur) || CHOICES[0];
    const opts = CHOICES.map(c =>
      '<option value="' + c.v + '"' + (c.v === cur ? ' selected' : '') + '>' + c.label + '</option>'
    ).join('');
    return '<select class="_usp-sel" data-uid="' + unitId + '" ' +
      'style="padding:2px 6px;border:1px solid ' + curDef.bg + ';background:' + curDef.bg + ';color:' + curDef.color + ';border-radius:5px;font:inherit;font-size:11px;font-weight:600;cursor:pointer">' + opts + '</select>';
  }

  // Find the unit table in the company detail page.
  function findUnitTable() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    // The table has headers including 'Raðnúmer' and 'Staða'.
    const tables = main.querySelectorAll('table.dtbl, table');
    for (const t of tables) {
      const ths = t.querySelectorAll('thead th');
      if (!ths.length) continue;
      let hasSerial = false, hasStatus = false;
      ths.forEach(th => {
        const tx = th.textContent.trim().toLowerCase();
        if (tx.includes('raðnúmer') || tx.includes('radnumer')) hasSerial = true;
        if (tx === 'staða' || tx === 'stada' || tx === 'status') hasStatus = true;
      });
      if (hasSerial && hasStatus) return t;
    }
    return null;
  }

  function injectColumn() {
    const coId = getCompanyId();
    if (!coId) return;
    const table = findUnitTable();
    if (!table) return;
    if (table.dataset._uspInjected === '1') return;
    table.dataset._uspInjected = '1';

    // 1. Add header column after "Staða".
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;
    const ths = Array.from(headerRow.children);
    let statusIdx = -1;
    ths.forEach((th, i) => {
      const tx = th.textContent.trim().toLowerCase();
      if (tx === 'staða' || tx === 'stada' || tx === 'status') statusIdx = i;
    });
    if (statusIdx === -1) return;
    const newTh = document.createElement('th');
    newTh.textContent = 'Áætlað';
    newTh.style.cssText = 'width:110px';
    if (statusIdx + 1 < ths.length) headerRow.insertBefore(newTh, ths[statusIdx + 1]);
    else headerRow.appendChild(newTh);

    // Detect which column has the Tegund text (header label "Tegund").
    let tegundIdx = -1;
    ths.forEach((th, i) => {
      const tx = th.textContent.trim().toLowerCase();
      if (tx === 'tegund' || tx === 'type') tegundIdx = i;
    });

    // 2. For each row, look up unit_id from the action buttons (Field.openInspect(DB.getUnit(<id>))).
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach(tr => {
      const cells = tr.children;
      if (cells.length <= statusIdx) return;
      // Extract unit id from any onclick that calls DB.getUnit(<id>)
      let unitId = null;
      const actionBtns = tr.querySelectorAll('button[onclick]');
      for (const b of actionBtns) {
        const m = b.getAttribute('onclick').match(/DB\.getUnit\((\d+)\)/);
        if (m) { unitId = +m[1]; break; }
      }
      if (!unitId) return;
      const typeText = tegundIdx >= 0 ? (cells[tegundIdx]?.textContent || '') : '';
      // Tag the row so filter chips can hide/show.
      tr.dataset.uspBucket = typeBucket(typeText);
      // Tighten row height per Agnar's request — easier to scroll a long list.
      tr.style.lineHeight = '1.15';
      Array.from(cells).forEach(td => { td.style.padding = '4px 8px'; });
      const td = document.createElement('td');
      td.innerHTML = selectHtml(coId, unitId, typeText);
      td.style.cssText = 'padding:4px 8px';
      if (statusIdx + 1 < cells.length) tr.insertBefore(td, cells[statusIdx + 1]);
      else tr.appendChild(td);
    });

    // 4. Inject type-filter chips above the table (once).
    const tableWrap = table.closest('.tcard') || table.parentElement;
    if (tableWrap && !tableWrap.querySelector('._usp-chips')) {
      const counts = {};
      bodyRows.forEach(tr => {
        const b = tr.dataset.uspBucket;
        if (b) counts[b] = (counts[b] || 0) + 1;
      });
      counts.all = bodyRows.length;
      const chipBar = document.createElement('div');
      chipBar.className = '_usp-chips';
      chipBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;align-items:center';
      // 2026-05-19: show ALL buckets even at 0 — grey out empty ones so the
      // user always sees the full category set and knows what's available.
      chipBar.innerHTML = BUCKETS
        .map(b => {
          const n = counts[b.v] || 0;
          const active = b.v === 'all';
          const empty = n === 0 && b.v !== 'all';
          const txtColor = active ? '#fff' : (empty ? '#cbd5e1' : b.color);
          const bgColor  = active ? '#0f172a' : '#fff';
          const bdColor  = active ? '#0f172a' : (empty ? '#e2e8f0' : '#cbd5e1');
          return '<button type="button" class="_usp-chip" data-bucket="' + b.v + '" ' +
            (empty ? 'disabled ' : '') +
            'style="padding:5px 11px;border:1px solid ' + bdColor +
            ';background:' + bgColor +
            ';color:' + txtColor +
            (empty ? ';opacity:.55;cursor:default' : ';cursor:pointer') +
            ';border-radius:99px;font:inherit;font-size:12px;font-weight:600">' +
            b.label + ' <span style="opacity:.65;font-weight:500">' + n + '</span></button>';
        }).join('');
      tableWrap.insertBefore(chipBar, tableWrap.firstChild);
      chipBar.addEventListener('click', e => {
        const chip = e.target.closest('._usp-chip');
        if (!chip) return;
        const bucket = chip.dataset.bucket;
        chipBar.querySelectorAll('._usp-chip').forEach(c => {
          const isOn = c.dataset.bucket === bucket;
          c.style.background = isOn ? '#0f172a' : '#fff';
          c.style.color = isOn ? '#fff' : (BUCKETS.find(x => x.v === c.dataset.bucket)?.color || '#475569');
          c.style.borderColor = isOn ? '#0f172a' : '#cbd5e1';
        });
        table.querySelectorAll('tbody tr').forEach(tr => {
          tr.style.display = (bucket === 'all' || tr.dataset.uspBucket === bucket) ? '' : 'none';
        });
      });
    }

    // 3. Wire changes — update state + ask patch 129 to recompute.
    table.addEventListener('change', e => {
      const sel = e.target.closest('._usp-sel');
      if (!sel) return;
      const unitId = +sel.dataset.uid;
      const value = sel.value;
      setUnitChoice(coId, unitId, value);
      const cd = CHOICES.find(c => c.v === value) || CHOICES[0];
      sel.style.background = cd.bg;
      sel.style.color = cd.color;
      sel.style.borderColor = cd.bg;
      if (typeof window.recomputeCompanyTotalCost === 'function') {
        window.recomputeCompanyTotalCost();
      }
    });
  }

  // Watch companies-main for the detail page rendering.
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectColumn, 250);
    }).observe(main, { childList: true, subtree: true });
    injectColumn();
  }
  attach();

  // Expose so patch 129 can read choices.
  window.UnitServicePicker = {
    getChoice: getUnitChoice,
    setChoice: setUnitChoice
  };

  console.log('[unit-service-picker] installed');
})();
