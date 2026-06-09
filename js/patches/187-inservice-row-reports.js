/* === FYRIRTÆKI Í ÞJÓNUSTU — úttekt 24/25/26 á hverja línu v1 ===
 * Adds a compact "Skýrslur: 24 25 26" status to every row of the árleg-skoðun
 * list (patch 153, tr._ars-row), green + clickable when an úttektarskýrsla for
 * that year exists on Drive, grey when it's missing. So the report status is
 * visible right in the main view — not just in the yfirlit overlay.
 *
 * Report data comes from AppSettings.uttekt_files (kt → {year:url}, parsed from
 * the úttektarskýrslu filenames). No DB query. Survives list re-renders via a
 * debounced MutationObserver. Self-contained; touches no core file.
 */
(() => {
  if (window.__inserviceRowReportsInstalled) return;
  window.__inserviceRowReportsInstalled = true;

  function digits(s){ return String(s||'').replace(/\D/g,''); }

  function process(){
    let uf = {};
    try { if (window.AppSettings && AppSettings.path) uf = AppSettings.path('uttekt_files') || {}; } catch(e){}
    const cos = (window.Companies && Companies.list) || [];
    if (!cos.length) return;
    const byId = {}; cos.forEach(c => { byId[String(c.id)] = c; });
    const rows = document.querySelectorAll('tr._ars-row:not([data-yrb])');
    rows.forEach(tr => {
      tr.setAttribute('data-yrb','1');
      const c = byId[String(tr.getAttribute('data-co-id'))];
      if (!c) return;
      const kt = digits(c.kennitala);
      const rec = uf[kt] || {};
      const cell = tr.querySelector('td');
      if (!cell) return;
      function yr(short){
        const k = '20' + short; const u = rec[k];
        return u
          ? '<a href="' + u + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Úttektarskýrsla ' + k + ' í Drive" style="color:#15803d;font-weight:700;text-decoration:none">📄' + short + '</a>'
          : '<span style="color:#cbd5e1;font-weight:600">' + short + '</span>';
      }
      const badge = document.createElement('div');
      badge.style.cssText = 'margin-top:2px;display:flex;gap:7px;align-items:center;font-size:10px;flex-wrap:wrap';
      badge.innerHTML = '<span style="color:#94a3b8">Skýrslur:</span>' + yr('24') + yr('25') + yr('26');
      cell.appendChild(badge);
    });
  }

  let t = null;
  const obs = new MutationObserver(() => { if (t) clearTimeout(t); t = setTimeout(process, 220); });
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(process, 1500);
})();
