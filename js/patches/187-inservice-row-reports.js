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
  // Fact-check per (fyrirtæki, ár) — úr Supabase-töflunni `year_factcheck`
  // (deilt með patch 199 og Claude). 'human' → glóandi grænn depill · 'claude'
  // → blár depill (Claude yfirfór, bíður staðfestingar).
  let fcMap = null, fcLoading = false;   // co_id(str) → { year(str) → status }
  function fcStat(coId,y){ var m=fcMap&&fcMap[String(coId)]; return (m&&m[String(y)])||null; }

  // kt (digits) → Set of years that already have a reikningur filed in
  // customer_documents (Drive-indexed + POS-connected). Drives a small 🧾 marker
  // on the year cell so the office sees "reikningur sendur" right in the list,
  // alongside the úttektarskýrslu status. Loaded once, then cells are rebuilt.
  let reikMap = null, reikLoading = false;
  // 2026-07-09 (critical bug, Agnar): fyrir rekstrarfélög með marga staði (ein
  // kt → margar fyrirtaeki-raðir, t.d. Heimaleiga með 8 staði) opnuðu '25/'26
  // flögurnar SÖMU kt-víðu Drive-skýrsluna (uttekt_files er keyed á kt) á
  // ÖLLUM röðunum — röng skýrsla (annar staður) á 7 af 8. Nú er STAÐRÉTTA
  // skýrslan úr customer_documents (fyrirtaeki_id → ár, sama uppspretta og
  // „Skjöl & viðhengi" á kúnnasíðunni) alltaf tekin fyrst, og kt-víði
  // hlekkurinn er AÐEINS notaður þegar kt-in á einn stað (ótvírætt).
  // Bein slóð á skjal í Supabase Storage. `storage_path` ber bucket-nafnið fremst
  // ("samningar/company_attachments/1611/skra.pdf"); bucket-arnir eru public svo
  // bein slóð dugar (engin async signed-url, sem heldur þessu samstillt við render).
  function storageUrl(p){
    if (!p) return '';
    const base = String(window.SUPABASE_URL || '').replace(/\/+$/, '');
    if (!base) return '';
    const s = String(p).replace(/^\/+/, '');
    const i = s.indexOf('/'); if (i < 1) return '';
    return base + '/storage/v1/object/public/' + s.slice(0, i) + '/' +
           s.slice(i + 1).split('/').map(encodeURIComponent).join('/');
  }

  // PostgREST skilar að HÁMARKI 1000 röðum sjálfgefið. Fyrirspurnirnar hér að neðan
  // höfðu enga blaðsíðuflettingu, svo þær þögðu og skáru sig við 1000 — af 1690
  // úttektarskýrslum með fyrirtaeki_id duttu ~690 út og árs-dálkurinn sýndi
  // ranglega „vantar" (t.d. JDÓ ehf. 2026, sem situr í röð ~1687). Sækjum allar
  // síður. `mk` býr til NÝJAN query-builder í hvert sinn (þeir eru einnota).
  async function fetchAll(mk){
    const PAGE = 1000; let from = 0, out = [];
    for (;;) {
      const r = await mk().range(from, from + PAGE - 1);
      if (r.error) break;
      const rows = r.data || [];
      out = out.concat(rows);
      if (rows.length < PAGE) break;
      from += PAGE;
      if (from > 60000) break;            // öryggisventill
    }
    return out;
  }

  let locMap = null, locLoading = false;
  async function loadLoc(){
    if (locLoading || locMap) return; locLoading = true;
    try {
      const sb = window.DB && DB.sb; if (!sb) { locLoading = false; return; }
      // Skýrslur liggja á TVEIMUR stöðum: Drive-lesnar bera `drive_file_id`, en þær
      // sem appið/Cowork býr til (t.d. úttektarskýrsla búin til í úttektinni sjálfri)
      // liggja í Supabase Storage og bera AÐEINS `storage_path`. Fyrirspurnin síaði
      // þær BEINT ÚT (.not drive_file_id is null) svo árs-dálkurinn sýndi grátt „·"
      // þótt skýrslan væri til — t.d. JDÓ ehf. 2026. Nú fylgja báðar gerðir með.
      const rows = await fetchAll(() => sb.from('customer_documents')
        .select('fyrirtaeki_id,year,drive_file_id,storage_path')
        .eq('doc_type','uttektarskyrsla').not('fyrirtaeki_id','is',null)
        .or('drive_file_id.not.is.null,storage_path.not.is.null'));
      const map = {};
      rows.forEach(x => {
        if (x.fyrirtaeki_id == null || !x.year) return;
        const u = x.drive_file_id
          ? 'https://drive.google.com/file/d/' + x.drive_file_id + '/view'
          : storageUrl(x.storage_path);
        if (!u) return;
        const k = String(x.fyrirtaeki_id);
        (map[k] = map[k] || {})[String(x.year)] = u;
      });
      locMap = map;
      // rebuild the year cells so location-precise links replace kt-wide ones
      document.querySelectorAll('th[data-yrcol], td[data-yrcell]').forEach(el => el.remove());
      document.querySelectorAll('tr._ars-row[data-yrcol]').forEach(tr => tr.removeAttribute('data-yrcol'));
      process();
    } catch (_) {}
    locLoading = false;
  }
  async function loadReik(){
    if (reikLoading || reikMap) return; reikLoading = true;
    try {
      const sb = window.DB && DB.sb; if (!sb) { reikLoading = false; return; }
      const reikRows = await fetchAll(() => sb.from('customer_documents').select('customer_base_id,year')
        .eq('doc_type','reikningur').not('customer_base_id','is',null));
      const byBase = {};
      reikRows.forEach(x => { if (x.customer_base_id != null && x.year) (byBase[x.customer_base_id] = byBase[x.customer_base_id] || new Set()).add(String(x.year)); });
      const ids = Object.keys(byBase);
      const map = {};
      for (let i = 0; i < ids.length; i += 500) {
        const b = await sb.from('customers_base').select('id,kennitala').in('id', ids.slice(i, i + 500));
        (b.data || []).forEach(row => { const d = digits(row.kennitala); if (d.length >= 10) map[d] = byBase[row.id]; });
      }
      reikMap = map;
      // rebuild the year cells so the new 🧾 markers appear
      document.querySelectorAll('th[data-yrcol], td[data-yrcell]').forEach(el => el.remove());
      document.querySelectorAll('tr._ars-row[data-yrcol]').forEach(tr => tr.removeAttribute('data-yrcol'));
      process();
    } catch (_) {}
    reikLoading = false;
  }
  async function loadFc(force){
    if (fcLoading || (fcMap && !force)) return; fcLoading = true;
    try {
      const sb = window.DB && DB.sb; if (!sb) { fcLoading = false; return; }
      const rows = await fetchAll(() => sb.from('year_factcheck').select('co_id,year,status'));
      const map = {};
      rows.forEach(x => { if (x.co_id != null && x.year) (map[String(x.co_id)] = map[String(x.co_id)] || {})[String(x.year)] = x.status; });
      fcMap = map;
      document.querySelectorAll('th[data-yrcol], td[data-yrcell]').forEach(el => el.remove());
      document.querySelectorAll('tr._ars-row[data-yrcol]').forEach(tr => tr.removeAttribute('data-yrcol'));
      process();
    } catch (_) {}
    fcLoading = false;
  }

  function process(){
    let uf = {}, att = {};
    try { if (window.AppSettings && AppSettings.path) uf = AppSettings.path('uttekt_files') || {}; } catch(e){}
    try { if (window.AppSettings && AppSettings.path) att = AppSettings.path('company_attachments') || {}; } catch(e){}
    const cos = (window.Companies && Companies.list) || [];
    if (!cos.length) return;
    const byId = {}; cos.forEach(c => { byId[String(c.id)] = c; });
    // Fjöldi fyrirtaeki-raða per kt — kt-víði uttekt_files hlekkurinn er bara
    // ótvíræður þegar kt-in á EINN stað.
    const ktCount = {}; cos.forEach(c => { const d = digits(c.kennitala); if (d) ktCount[d] = (ktCount[d] || 0) + 1; });

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
      const locRec = (locMap && locMap[coId]) || {};
      YEARS.forEach(y => {
        // Uppruna-röð: (1) STAÐRÉTT customer_documents skýrsla (fyrirtaeki_id
        // → ár, Drive) — sama og kúnnasíðan sýnir; (2) kt-víði uttekt_files
        // hlekkurinn AÐEINS þegar kt-in á einn stað. Fjölstaða-kt án staðréttrar
        // skýrslu sýnir heiðarlegt „vantar" í stað rangrar skýrslu annars staðar.
        const u = locRec[y] || ((ktCount[kt] || 0) <= 1 ? rec[y] : null);
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
        // Fact-check depill: 'human' → glóandi grænn · 'claude' → blár.
        const fst = fcStat(coId, y);
        const confirmed = fst === 'human';
        const isClaude  = fst === 'claude';
        const glowDot = '<span title="Staðfest" style="width:6px;height:6px;border-radius:50%;background:#16A34A;box-shadow:0 0 5px 1.5px rgba(22,163,74,.9);flex:0 0 auto"></span>';
        const blueDot = '<span title="Claude yfirfór — bíður staðfestingar" style="width:6px;height:6px;border-radius:50%;background:#2563EB;box-shadow:0 0 5px 1px rgba(37,99,235,.8);flex:0 0 auto"></span>';
        const gdot = confirmed ? glowDot : (isClaude ? blueDot : dotGreen);
        const okBorder = confirmed ? 'rgba(22,163,74,.7)' : 'rgba(28,143,96,.35)';
        const td = document.createElement('td');
        td.setAttribute('data-yrcell','1');
        td.style.cssText = 'padding:6px 4px;text-align:center;';
        if (u) {
          td.innerHTML = '<a href="' + u + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Úttektarskýrsla ' + y + ' í Drive" style="' + TAG + 'background:#DBEEE3;border-color:' + okBorder + ';color:#0F5E3F">' + gdot + yy + '</a>';
        } else if (f) {
          td.innerHTML = '<a href="#" class="_yr-att" data-path="' + String(f.path||'').replace(/"/g,'&quot;') + '" title="' + String(f.name||'').replace(/"/g,'&quot;') + ' (' + y + ' — upphlaðið skjal)" style="' + TAG + 'background:#DBEEE3;border-color:' + okBorder + ';color:#0F5E3F">' + gdot + yy + '</a>';
        } else if (confirmed) {
          // Fact-checkað handvirkt þótt ekkert skjal sé á þessari hlið.
          td.innerHTML = '<a href="#" class="_yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Fact-checkað ' + y + ' (staðfest handvirkt)" style="' + TAG + 'background:#DBEEE3;border-color:rgba(22,163,74,.7);color:#0F5E3F">' + glowDot + yy + '</a>';
        } else if (isClaude) {
          // Claude yfirfór — blár, bíður mannlegrar staðfestingar.
          td.innerHTML = '<a href="#" class="_yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Claude yfirfór ' + y + ' — bíður staðfestingar" style="' + TAG + 'background:#DBE7FE;border-color:rgba(37,99,235,.6);color:#1E3A8A">' + blueDot + yy + '</a>';
        } else {
          // Empty = attach point: click to upload a skýrsla into (company, year).
          const due = (y === '2026');
          const bg = due ? '#FBEAC6' : '#F0EFEA', bd = due ? 'rgba(217,146,6,.5)' : '#E2DFD6', col = due ? '#8A5C04' : '#9CA0A6';
          const eye = due
            ? '<span style="width:4px;height:4px;border-radius:50%;background:#D99206;flex:0 0 auto"></span>'
            : '<span style="width:4px;height:4px;border-radius:50%;box-shadow:inset 0 0 0 1.5px #B9B6AC;flex:0 0 auto"></span>';
          td.innerHTML = '<a href="#" class="_yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Hengja skýrslu við ' + y + '" style="' + TAG + 'background:' + bg + ';border-color:' + bd + ';color:' + col + '">' + eye + yy + '</a>';
        }
        // 🧾 reikningur ársins tengdur (customer_documents) → lítið tákn við hlið skýrslu-stöðunnar
        if (reikMap && reikMap[kt] && reikMap[kt].has(y)) {
          td.innerHTML += '<span title="Reikningur ' + y + ' sendur / tengdur" style="margin-left:3px;font-size:10px;line-height:1;vertical-align:middle">🧾</span>';
        }
        tr.insertBefore(td, ref);
      });
    });
  }

  // ── Shared: per-company '23–'26 report status ────────────────────────────
  // Same lookup the on-screen year columns use (site-precise via locMap), so
  // other views — e.g. the printed driver list (patch 153 printList) — show the
  // identical '23/'24/'25/'26 status without duplicating the data plumbing.
  // Returns { '2023': {has, due, reik}, … }. `has` = úttektarskýrsla á skrá.
  function yearInfo(c) {
    try { loadLoc(); loadReik(); } catch (_) {}   // best-effort warm (idempotent)
    const out = {};
    if (!c) { YEARS.forEach(y => out[y] = { has: false, due: (y === '2026'), reik: false }); return out; }
    let uf = {}, att = {};
    try { if (window.AppSettings && AppSettings.path) uf = AppSettings.path('uttekt_files') || {}; } catch (e) {}
    try { if (window.AppSettings && AppSettings.path) att = AppSettings.path('company_attachments') || {}; } catch (e) {}
    const cos = (window.Companies && Companies.list) || [];
    const ktCount = {}; cos.forEach(x => { const d = digits(x.kennitala); if (d) ktCount[d] = (ktCount[d] || 0) + 1; });
    const kt = digits(c.kennitala);
    const coId = String(c.id);
    const rec = uf[kt] || {};
    const files = Array.isArray(att[coId]) ? att[coId] : [];
    const locRec = (locMap && locMap[coId]) || {};
    YEARS.forEach(y => {
      const u = locRec[y] || ((ktCount[kt] || 0) <= 1 ? rec[y] : null);
      const f = files.find(x => String(x.year) === y) ||
                files.find(x => x.year == null && new RegExp('\\b' + y + '\\b').test(String(x.name || '')));
      out[y] = { has: !!(u || f), due: (y === '2026'), reik: !!(reikMap && reikMap[kt] && reikMap[kt].has(y)) };
    });
    return out;
  }
  window.InserviceRowReports = { YEARS: YEARS.slice(), yearInfo };

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
      // kind:'skyrsla' → patch 111 also lights up the skoðað-marking for the year
      const meta = await CompanyAttachments.upload(+coId, file, { year, kind: 'skyrsla' });
      if (meta) {
        // upload dispatches attachment-year-changed (year is set) → cells rebuild
        try { if (window.Toast && Toast.show) Toast.show('✓ Skýrsla tengd við ' + year); } catch (_) {}
      } else {
        a.textContent = '·';
      }
    });
    inp.click();
  });

  // Year tag changed OR fact-check toggled (patch 199 dispatches this) → refresh
  // the fact-check map from the table and rebuild all year cells.
  document.addEventListener('attachment-year-changed', () => {
    loadFc(true);   // re-pulls year_factcheck, then process() inside
    document.querySelectorAll('th[data-yrcol], td[data-yrcell]').forEach(el => el.remove());
    document.querySelectorAll('tr._ars-row[data-yrcol]').forEach(tr => tr.removeAttribute('data-yrcol'));
    process();
  });

  // Interval: the list patch rebuilds on sort/filter; new thead/rows lack the
  // markers so they get the columns again on the next tick (cheap — already
  // marked nodes are skipped).
  setInterval(process, 1500);
  setTimeout(process, 120); setTimeout(process, 500);
  setTimeout(loadReik, 900);   // load reikningur-status once, then re-render cells with 🧾
  setTimeout(loadLoc, 600);    // load location-precise reports once, then re-render cells
  setTimeout(loadFc, 750);     // load fact-check (blár/grænn) once, then re-render cells
})();
