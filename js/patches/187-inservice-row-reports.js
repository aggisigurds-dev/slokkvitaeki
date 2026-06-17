/* === FYRIRTÆKI Í ÞJÓNUSTU — úttekt 23/24/25/26 dálkar í aðallistanum v3 ===
 * Injects real 2023/2024/2025/2026 columns into the árleg-skoðun table
 * (patch 153) — right after "Tæki" — green 📄 + clickable when an
 * úttektarskýrsla for that year exists, grey "·" when missing. So the
 * report history shows as columns in the main view, like in Rekstrarfélög.
 *
 * Report sources (v3 — two, merged):
 *   1. AppSettings.uttekt_files (kt → {year:url}) — Drive links.
 *   2. AppSettings.company_attachments (co_id → [files]) — uploaded skjöl
 *      from the 📎 Skjöl & skýrslur section (patch 111) that carry a
 *      `year` tag. Click opens a signed Storage URL.
 * Drive link wins when both exist for the same year.
 *
 * Re-injects after the list re-renders (sort/filter) via an interval, and
 * rebuilds immediately on the 'attachment-year-changed' event from patch 111.
 * Self-contained; touches no core file.
 */
(() => {
  if (window.__inserviceRowReportsInstalled) return;
  window.__inserviceRowReportsInstalled = true;

  const YEARS = ['2023','2024','2025','2026'];
  const BUCKET = 'samningar';
  function digits(s){ return String(s||'').replace(/\D/g,''); }

  function process(){
    let uf = {}, att = {};
    try { if (window.AppSettings && AppSettings.path) uf = AppSettings.path('uttekt_files') || {}; } catch(e){}
    try { if (window.AppSettings && AppSettings.path) att = AppSettings.path('company_attachments') || {}; } catch(e){}
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
        th.style.cssText = "padding:9px 5px;text-align:center;color:#9A9CA2;font-weight:700;font-size:10px;font-family:'Space Mono',monospace;text-transform:none;letter-spacing:0";
        th.textContent = "'" + y.slice(-2);
        htr.insertBefore(th, ref);
      });
    });

    // 2) each company row — add the four year cells at the same position
    document.querySelectorAll('tr._ars-row:not([data-yrcol])').forEach(tr => {
      tr.setAttribute('data-yrcol','1');
      const coId = String(tr.getAttribute('data-co-id'));
      const c = byId[coId];
      const kt = c ? digits(c.kennitala) : '';
      const rec = uf[kt] || {};
      const files = Array.isArray(att[coId]) ? att[coId] : [];
      const ref = tr.children[1] || null;   // right after the company name cell
      YEARS.forEach(y => {
        const u = rec[y];
        // Explicit year tag wins; untagged files (year == null) fall back to a
        // year found in the filename ("Rjúpufell 2025.pdf" → 2025) so old
        // uploads light up without manual tagging. year === '0' = explicitly
        // cleared by the user — never auto-matched.
        const f = files.find(x => String(x.year) === y) ||
                  files.find(x => x.year == null && new RegExp('\\b' + y + '\\b').test(String(x.name || '')));
        // Inspection-tag styling (matches the redesign): legible '23–'26 tag,
        // green = report on file, grey = none, amber = current year still due.
        const yy = y.slice(-2);
        const TAG = "display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 9px 0 7px;border-radius:3px 9px 9px 3px;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;text-decoration:none;border:1px solid transparent;box-sizing:border-box;";
        const dotGreen = '<span style="width:4px;height:4px;border-radius:50%;background:#1C8F60;flex:0 0 auto"></span>';
        const td = document.createElement('td');
        td.setAttribute('data-yrcell','1');
        td.style.cssText = 'padding:6px 4px;text-align:center;';
        if (u) {
          td.innerHTML = '<a href="' + u + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Úttektarskýrsla ' + y + ' í Drive" style="' + TAG + 'background:#DBEEE3;border-color:rgba(28,143,96,.35);color:#0F5E3F">' + dotGreen + yy + '</a>';
        } else if (f) {
          td.innerHTML = '<a href="#" class="_yr-att" data-path="' + String(f.path||'').replace(/"/g,'&quot;') + '" title="' + String(f.name||'').replace(/"/g,'&quot;') + ' (' + y + ' — upphlaðið skjal)" style="' + TAG + 'background:#DBEEE3;border-color:rgba(28,143,96,.35);color:#0F5E3F">' + dotGreen + yy + '</a>';
        } else {
          // Empty = attach point: click to upload a skýrsla into (company, year).
          const due = (y === '2026');
          const bg = due ? '#FBEAC6' : '#F0EFEA', bd = due ? 'rgba(217,146,6,.5)' : '#E2DFD6', col = due ? '#8A5C04' : '#9CA0A6';
          const eye = due
            ? '<span style="width:4px;height:4px;border-radius:50%;background:#D99206;flex:0 0 auto"></span>'
            : '<span style="width:4px;height:4px;border-radius:50%;box-shadow:inset 0 0 0 1.5px #B9B6AC;flex:0 0 auto"></span>';
          td.innerHTML = '<a href="#" class="_yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Hengja skýrslu við ' + y + '" style="' + TAG + 'background:' + bg + ';border-color:' + bd + ';color:' + col + '">' + eye + yy + '</a>';
        }
        tr.insertBefore(td, ref);
      });
    });
  }

  // Clicking an uploaded-document icon: open a signed Storage URL. The tab is
  // opened synchronously (before the await) so popup blockers stay quiet.
  document.addEventListener('click', async e => {
    const a = e.target.closest('._yr-att');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    const path = a.dataset.path;
    if (!path || !window.DB || !DB.sb) return;
    const w = window.open('', '_blank');
    try {
      const r = await DB.sb.storage.from(BUCKET).createSignedUrl(path, 3600);
      const url = r && r.data && r.data.signedUrl;
      if (url) { if (w) w.location = url; else window.open(url, '_blank'); return; }
    } catch (_) {}
    if (w) w.close();
    alert('Náði ekki að opna skjalið.');
  });

  // Clicking an empty year cell: pick a file and attach it to that
  // (company, year) via patch 111's uploader — the cell lights up when done.
  document.addEventListener('click', e => {
    const a = e.target.closest('._yr-add');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    if (!window.CompanyAttachments || !CompanyAttachments.upload) { alert('Skjalaeining (patch 111) ekki hlaðin.'); return; }
    const coId = a.dataset.coId, year = a.dataset.year;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pdf,.doc,.docx,.xls,.xlsx,image/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0];
      inp.remove();
      if (!file) return;
      a.textContent = '⏳';
      const meta = await CompanyAttachments.upload(+coId, file, { year });
      if (meta) {
        // upload dispatches attachment-year-changed (year is set) → cells rebuild
        try { if (window.Toast && Toast.show) Toast.show('✓ Skýrsla tengd við ' + year); } catch (_) {}
      } else {
        a.textContent = '·';
      }
    });
    inp.click();
  });

  // Year tag changed in Skjöl & skýrslur (patch 111) → rebuild all year cells.
  document.addEventListener('attachment-year-changed', () => {
    document.querySelectorAll('th[data-yrcol], td[data-yrcell]').forEach(el => el.remove());
    document.querySelectorAll('tr._ars-row[data-yrcol]').forEach(tr => tr.removeAttribute('data-yrcol'));
    process();
  });

  // Interval: the list patch rebuilds on sort/filter; new thead/rows lack the
  // markers so they get the columns again on the next tick (cheap — already
  // marked nodes are skipped).
  setInterval(process, 1500);
  setTimeout(process, 120); setTimeout(process, 500);
})();
