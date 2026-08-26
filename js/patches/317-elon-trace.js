/* ELON TRACE — hidden junction-box stamps on bulbs (as-built, patch 317).
 *
 * Puts machine-readable numbers on year cells, FULLBÚIÐ/VANTAR, date pill,
 * SKOÐUN cells, month FILTER chips, status FILTERS, KPI/summaries, TÆKI,
 * STAÐA EFTIR ÁRI, 🧾 — WITHOUT changing visible design.
 * Look-A ._yr gradients stay in 153. No CSS on ._yr.
 *
 * Hover:  ELON · f193 · 2026 · both · src=facts · YEAR CELL
 * data-elon: ELON|fid=193|y=2026|k=both|src=facts|role=YEAR CELL
 *
 * SOURCE vs FILTER: 📅 .sk-month-pill / span._mo = SOURCE (inspect_month).
 * ._ars-mo chips and ._ars-st tabs = FILTER (do not write inspect_month).
 *
 * See docs/RAFKERFI.md (kaflar 8–12). Do not restyle ._yr. Do not merge hotels.
 */
(() => {
  if (window.__elonTraceInstalled) return;
  window.__elonTraceInstalled = true;

  function fidOf(el) {
    if (!el || !el.closest) return '';
    const row = el.closest('tr._ars-row[data-co-id]');
    if (row) return String(row.getAttribute('data-co-id') || '');
    const dyg = el.closest('._dyg-section');
    if (dyg && dyg.dataset && dyg.dataset.coId) return String(dyg.dataset.coId);
    const co = el.closest('[data-co-id]');
    if (co) {
      const v = co.getAttribute('data-co-id');
      if (v && /^\d+$/.test(v)) return v;
    }
    const rf = el.closest('tr.rf-bldrow');
    if (rf) {
      const a = rf.querySelector('a._rf_open[data-coid], [data-co-id], [data-rf-akstur]');
      if (a) {
        const v = a.getAttribute('data-coid') || a.getAttribute('data-co-id') || a.getAttribute('data-rf-akstur');
        if (v && /^\d+$/.test(v)) return v;
      }
    }
    const coid = el.closest('[data-coid]');
    if (coid) {
      const v = coid.getAttribute('data-coid');
      if (v && /^\d+$/.test(v)) return v;
    }
    const viewCo = document.querySelector('#view-company[data-co-id], #view-company [data-co-id]');
    if (viewCo) {
      const v = viewCo.getAttribute('data-co-id');
      if (v && /^\d+$/.test(v)) return v;
    }
    return '';
  }

  function yearOf(el) {
    if (!el) return '';
    const dy = el.getAttribute && (el.getAttribute('data-year') || el.getAttribute('data-yr'));
    if (dy && /^20\d{2}$/.test(dy)) return dy;
    const child = el.querySelector && el.querySelector('[data-year], [data-yr]');
    if (child) {
      const v = child.getAttribute('data-year') || child.getAttribute('data-yr');
      if (v && /^20\d{2}$/.test(v)) return v;
    }
    const blk = el.closest && el.closest('.sk-yrblock, .sk-pill, [data-yr]');
    if (blk) {
      const v = blk.getAttribute('data-yr') || (blk.querySelector && blk.querySelector('[data-yr]') && blk.querySelector('[data-yr]').getAttribute('data-yr'));
      if (v && /^20\d{2}$/.test(String(v))) return String(v);
    }
    const t = String((el.textContent || '')).replace(/\s+/g, '');
    const m2 = t.match(/\b(2[3-9]|3[0-9])\b/);
    if (m2 && t.length <= 6) return '20' + m2[1];
    const m4 = t.match(/\b(20[2-3]\d)\b/);
    if (m4) return m4[1];
    return '';
  }

  function stateOfYr(el) {
    const c = el.classList;
    if (!c) return '';
    if (c.contains('both')) return 'both';
    if (c.contains('penda')) return 'penda';
    if (c.contains('inv-only')) return 'inv-only';
    if (c.contains('now')) return 'now';
    if (c.contains('on')) return 'on';
    return 'empty';
  }

  function origTitle(el) {
    let o = el.getAttribute('data-elon-orig');
    if (o != null) return o;
    o = el.getAttribute('title') || '';
    o = o.replace(/^ELON · .*?(?: · src=\S+)?(?: · (?:YEAR CELL|SOURCE|FILTER|KPI|FULLB[ÚU]I[ĐD]|VANTAR|STA[ĐD]A|SWITCH|TÆKI|DOT|LED|CALC).*)?/, '');
    o = o.replace(/^ELON · .*? · src=\S+\s*(?:·\s*)?/, '');
    el.setAttribute('data-elon-orig', o);
    return o;
  }

  function srcOfYr(el, state) {
    const t = origTitle(el);
    if (/klarad|Fullbúið/i.test(t)) return 'pairs';
    if (/Fact-check|staðfest handvirkt/i.test(t)) return 'facts';
    if (/reikningi|v_uttekt|Úttekt staðfest með reikningi/i.test(t)) return 'solur';
    if (/Drive|upphlaðið skjal/i.test(t)) return 'docs';
    if (state === 'both') return 'docs';
    if (state === 'inv-only') return 'solur';
    if (state === 'penda' || state === 'now') return 'month';
    const dd = el.closest && el.closest('._dd');
    if (dd) {
      const inv = dd.querySelector('u i.inv');
      const rep = dd.querySelector('u i.rep');
      if (inv && inv.classList.contains('inv') && !(rep && rep.classList.contains('rep'))) return 'solur';
      if (rep && rep.classList.contains('rep')) return 'docs';
    }
    return 'docs';
  }

  function stamp(el, fid, year, state, src, role) {
    if (!el || !el.setAttribute) return;
    const f = fid != null ? String(fid) : '';
    const y = year != null ? String(year) : '';
    const k = state || '';
    const s = src || '';
    const r = role || '';
    const pipe = 'ELON|fid=' + f + '|y=' + y + '|k=' + k + '|src=' + s + (r ? '|role=' + r : '');
    const prev = el.getAttribute('data-elon');
    if (prev === pipe && el.getAttribute('title') && String(el.getAttribute('title')).indexOf('ELON ·') === 0) return;
    origTitle(el);
    el.setAttribute('data-elon', pipe);
    if (f) el.setAttribute('data-fid', f);
    if (y) el.setAttribute('data-year', y);
    if (k) el.setAttribute('data-state', k);
    if (s) el.setAttribute('data-elon-src', s);
    if (r) el.setAttribute('data-elon-role', r);
    const o = el.getAttribute('data-elon-orig') || '';
    let hover = 'ELON · f' + (f || '?') + ' · ' + (y || '—') + ' · ' + (k || '—') + ' · src=' + (s || '?');
    if (r) hover += ' · ' + r;
    if (o) hover += ' · ' + o;
    el.setAttribute('title', hover);
  }

  function stState(el) {
    const c = el.className || '';
    if (c.indexOf('_st--done') >= 0) return 'done';
    if (c.indexOf('_st--work') >= 0) return 'work';
    if (c.indexOf('_st--skip') >= 0) return 'skip';
    if (c.indexOf('_st--late') >= 0) return 'over';
    if (c.indexOf('_st--plan') >= 0) return 'queue';
    return '';
  }

  function rfYrState(el) {
    const c = el.className || '';
    const m = c.match(/rf-yr--(\w+)/);
    return m ? m[1] : '';
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    if (!scope.querySelectorAll) return;
    const yNow = String(new Date().getFullYear());

    /* --- Ársskoðun year cells (look-A). Role YEAR CELL. No CSS. --- */
    scope.querySelectorAll('a._yr, span._yr').forEach(el => {
      const fid = fidOf(el) || el.getAttribute('data-co-id') || '';
      const y = yearOf(el) || el.getAttribute('data-year') || '';
      const k = stateOfYr(el);
      const role = el.classList.contains('lit') ? 'YEAR CELL LED' : 'YEAR CELL';
      stamp(el, fid, y, k, srcOfYr(el, k), role);
    });

    /* Dots under year cells — report / invoice presence. */
    scope.querySelectorAll('#view-arsskodun ._dd u i.rep, #view-arsskodun ._dd u i.inv, #ars-main ._dd u i.rep, #ars-main ._dd u i.inv').forEach(el => {
      const isInv = el.classList.contains('inv');
      stamp(el, fidOf(el), yearOf(el.closest('._dd') || el), isInv ? 'inv' : 'rep', isInv ? 'solur' : 'docs', 'DOT');
    });

    /* SKOÐUN cell = SOURCE (per-row inspect_month). NOT the month filter. */
    scope.querySelectorAll('#view-arsskodun span._mo, #ars-main span._mo').forEach(el => {
      stamp(el, fidOf(el), '', 'month', 'month', 'SOURCE');
    });

    /* Month chips Ágú 32 = FILTER. Count = visible rows with that inspect_month. */
    scope.querySelectorAll('._ars-mo').forEach(el => {
      const m = el.getAttribute('data-month');
      stamp(el, '', m === 'all' ? '' : String(m || ''), 'filter', 'month', 'FILTER');
    });

    /* Status tabs Forgangur/Óvíst/Aldrei/… = FILTER. */
    scope.querySelectorAll('._ars-st').forEach(el => {
      const k = (el.getAttribute('data-status') || el.textContent || '').trim().slice(0, 24);
      stamp(el, '', yNow, k || 'filter', 'month', 'FILTER');
    });

    /* Per-row status pill (BÍÐUR / Í VINNSLU / KLÁRAÐ). */
    scope.querySelectorAll('span._st').forEach(el => {
      const k = stState(el);
      stamp(el, fidOf(el), yNow, k, k === 'done' ? 'facts' : 'month', 'STATUS');
    });

    /* TÆKI "2 SLT" — eqGroups from uttaeki.tegund. */
    scope.querySelectorAll('#view-arsskodun td._devs, #ars-main td._devs, #view-arsskodun ._devs, #ars-main ._devs').forEach(el => {
      stamp(el, fidOf(el), yNow, 'taeki', 'uttaeki', 'TÆKI');
    });

    /* KPI tiles + summary strip. */
    scope.querySelectorAll('._ars-statgrid > div, #ars-kpi-row > *').forEach((el, i) => {
      stamp(el, '', yNow, 'kpi', 'facts', 'KPI');
    });
    scope.querySelectorAll('._ars-summary, ._ars-kpi').forEach(el => {
      stamp(el, '', yNow, 'summary', 'facts', 'KPI');
    });

    /* Rekstrarfélög. */
    scope.querySelectorAll('.rf-bundle-tag').forEach(el => {
      const pill = el.closest('.rf-dd, .rf-ycell, .rf-yrs');
      const yrEl = pill && pill.querySelector('.rf-yr');
      stamp(el, fidOf(el), yearOf(yrEl || el), 'bundle', 'pairs', 'BUNDLE');
    });
    scope.querySelectorAll('.rf-yr').forEach(el => {
      const k = rfYrState(el);
      const src = (k === 'done') ? 'docs' : (k === 'due' || k === 'overdue' ? 'month' : 'docs');
      stamp(el, fidOf(el), yearOf(el), k, src, 'YEAR CELL');
    });
    scope.querySelectorAll('.rf-pill').forEach(el => {
      stamp(el, fidOf(el), yNow, 'pill', 'facts', 'PILL');
    });
    scope.querySelectorAll('.rf-sum-chip, .rf-sum-next, .rf-next').forEach(el => {
      stamp(el, fidOf(el), yNow, 'next', 'month', 'SOURCE');
    });

    /* Company profile — 📅 date pill = SOURCE SWITCH (inspect_month). */
    scope.querySelectorAll('.sk-month-pill, [data-month-edit]').forEach(el => {
      stamp(el, fidOf(el), '', 'switch', 'switch', 'SOURCE SWITCH');
    });

    /* STAÐA EFTIR ÁRI pills (pink "26" on Center Hotels). */
    scope.querySelectorAll('.sk-pill').forEach(el => {
      const y = yearOf(el);
      let k = 'none', src = 'docs';
      if (el.classList.contains('both') || el.classList.contains('done')) { k = 'both'; src = 'pairs'; }
      else if (el.classList.contains('ok')) { k = 'ok'; src = 'docs'; }
      else if (el.classList.contains('gap')) { k = 'gap'; src = 'facts'; }
      else if (el.classList.contains('claude')) { k = 'inv-only'; src = 'solur'; }
      else if (el.classList.contains('now')) { k = 'now'; src = 'month'; }
      stamp(el, fidOf(el), y, k, src, 'STAÐA EFTIR ÁRI');
    });
    scope.querySelectorAll('.sk-yr-label, .sk-yr[data-yr]').forEach(el => {
      let k = 'none', src = 'docs';
      if (el.classList.contains('sk-yr-ok')) { k = 'both'; src = 'docs'; }
      else if (el.classList.contains('sk-yr-gap')) { k = 'gap'; src = 'facts'; }
      else if (el.classList.contains('sk-yr-claude')) { k = 'inv-only'; src = 'solur'; }
      else if (el.classList.contains('sk-yr-now')) { k = 'now'; src = 'month'; }
      stamp(el, fidOf(el), yearOf(el), k, src, 'STAÐA EFTIR ÁRI');
    });

    /* FULLBÚIÐ / n AF 2 VANTAR / Í VINNSLU — accordion service status.
       Slökkvitækjaþjónusta vs Brunakerfisþjónusta are SEPARATE circuits. */
    scope.querySelectorAll('.sk-svc-st').forEach(el => {
      const t = String(el.textContent || '');
      let k = 'prog', src = 'docs', role = 'Í VINNSLU';
      if (/FULLBÚIÐ/.test(t)) { k = 'both'; src = 'pairs'; role = 'FULLBÚIÐ'; }
      else if (/VANTAR/.test(t)) { k = 'part'; src = 'docs'; role = 'VANTAR'; }
      stamp(el, fidOf(el), yearOf(el.closest('.sk-yrblock') || el), k, src, role);
    });

    /* Report / invoice checkmarks (skýrsla, R-000803). */
    scope.querySelectorAll('.sk-doc.inv, .sk-doc.rep, .sk-doc').forEach(el => {
      const isInv = el.classList.contains('inv');
      const isRep = el.classList.contains('rep');
      const src = isInv ? 'solur' : 'docs';
      stamp(el, fidOf(el), yearOf(el), isInv ? 'inv' : (isRep ? 'rep' : 'doc'), src, isInv ? 'REIKNINGUR' : (isRep ? 'SKÝRSLA' : 'DOC'));
    });
    scope.querySelectorAll('.sk-dot').forEach(el => {
      stamp(el, fidOf(el), yearOf(el.closest('.sk-yrblock') || el), 'dot', 'docs', 'DOT');
    });

    /* Afslættir % pills + custom % — CALC, not month. */
    scope.querySelectorAll('._afsl-step, ._cad-inp').forEach(el => {
      stamp(el, fidOf(el), yNow, 'discount', 'afslattur', 'CALC');
    });

    /* POS / Sala receipt totals if present. */
    scope.querySelectorAll('#pos-totals, #view-pos .pos-total, #view-sala .pos-total, .kvittun-total, [data-elon-calc]').forEach(el => {
      stamp(el, fidOf(el), yNow, 'total', 'solur', 'CALC');
    });

    /* Hide-skipped checkbox sits in the FILTER strip. */
    scope.querySelectorAll('#_ars-skiphide').forEach(el => {
      stamp(el, '', yNow, 'hide-skipped', 'month', 'FILTER');
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      try { scan(document); } catch (e) { console.warn('[elon-trace]', e); }
    });
  }

  function boot() {
    schedule();
    try {
      const mo = new MutationObserver(() => schedule());
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
    document.addEventListener('attachment-year-changed', schedule);
    setInterval(schedule, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.ElonTrace = { scan: () => scan(document), stamp };
})();
