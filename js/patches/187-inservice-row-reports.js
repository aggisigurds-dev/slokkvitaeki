/* === FYRIRTÆKI Í ÞJÓNUSTU — úttekt 23/24/25/26 dálkar í aðallistanum v2 ===
 * Injects real 2023/2024/2025/2026 columns into the árleg-skoðun table
 * (patch 153) — right after "Tæki" — green 📄 + clickable when an
 * úttektarskýrsla for that year exists on Drive, grey "·" when missing. So the
 * report history shows as columns in the main view, like in Rekstrarfélög.
 *
 * Report data: AppSettings.uttekt_files (kt → {year:url}). No DB query.
 * Re-injects after the list re-renders (sort/filter) via an interval. Cells +
 * header are appended in matching positions so column alignment is preserved.
 * Self-contained; touches no core file.
 */
(() => {
  if (window.__inserviceRowReportsInstalled) return;
  window.__inserviceRowReportsInstalled = true;

  const YEARS = ['2023','2024','2025','2026'];
  function digits(s){ return String(s||'').replace(/\D/g,''); }

  function process(){
    let uf = {};
    try { if (window.AppSettings && AppSettings.path) uf = AppSettings.path('uttekt_files') || {}; } catch(e){}
    const cos = (window.Companies && Companies.list) || [];
    if (!cos.length) return;
    const byId = {}; cos.forEach(c => { byId[String(c.id)] = c; });

    // 1) header — add the four year columns after the 5th column ("Tæki")
    document.querySelectorAll('table thead tr').forEach(htr => {
      const tbl = htr.closest('table');
      if (!tbl || !tbl.querySelector('tr._ars-row')) return;      // only the árskoðun table
      if (htr.querySelector('th[data-yrcol]')) return;            // already done this render
      const ref = htr.children[1] || null;   // right after the "Fyrirtæki" name column
      YEARS.forEach(y => {
        const th = document.createElement('th');
        th.setAttribute('data-yrcol','1');
        th.style.cssText = 'padding:9px 5px;text-align:center;color:#475569;font-weight:700;font-size:10px;text-transform:none;letter-spacing:0';
        th.textContent = y;
        htr.insertBefore(th, ref);
      });
    });

    // 2) each company row — add the four year cells at the same position
    document.querySelectorAll('tr._ars-row:not([data-yrcol])').forEach(tr => {
      tr.setAttribute('data-yrcol','1');
      const c = byId[String(tr.getAttribute('data-co-id'))];
      const kt = c ? digits(c.kennitala) : '';
      const rec = uf[kt] || {};
      const ref = tr.children[1] || null;   // right after the company name cell
      YEARS.forEach(y => {
        const u = rec[y];
        const td = document.createElement('td');
        td.setAttribute('data-yrcell','1');
        td.style.cssText = 'padding:6px 5px;text-align:center;font-size:11px;' + (u ? 'background:#f0fdf4' : '');
        td.innerHTML = u
          ? '<a href="' + u + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Úttektarskýrsla ' + y + ' í Drive" style="color:#15803d;font-weight:700;text-decoration:none">📄</a>'
          : '<span style="color:#d1d5db">·</span>';
        tr.insertBefore(td, ref);
      });
    });
  }

  // Interval: the list patch rebuilds on sort/filter; new thead/rows lack the
  // markers so they get the columns again on the next tick (cheap — already
  // marked nodes are skipped).
  setInterval(process, 1500);
  setTimeout(process, 800);
})();
