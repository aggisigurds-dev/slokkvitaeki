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
  // 2026-07-30: var RAÐBUNDIN blaðsíðu-sókn (beið eftir hverri síðu). Á
  // customer_documents (3.512 raðir) eru það 4 sóknir í röð × ~0,6 s ≈ 2,4 s af
  // hreinni bið. Nú er fyrsta síðan sótt með count:'exact' og allar hinar
  // SAMHLIÐA → ein umferðartíð. Skilar sömu röðum; öryggisventillinn helst.
  async function fetchAll(mk){
    const PAGE = 1000;
    try {
      const r0 = await mk().range(0, PAGE - 1);
      if (r0.error) return [];
      let out = (r0.data || []).slice();
      if (out.length < PAGE) return out;
      // heildarfjöldi óþekktur hér (mk býr til fyrirspurn án count) → sækjum
      // næstu síður samhliða í hóflegum skömmtum og hættum þegar síða er stutt.
      for (let base = PAGE; base <= 60000; base += PAGE * 4) {
        const offs = [base, base + PAGE, base + PAGE * 2, base + PAGE * 3];
        const pages = await Promise.all(offs.map(o =>
          mk().range(o, o + PAGE - 1).then(r => (r.error ? [] : (r.data || []))).catch(() => [])));
        pages.forEach(p => { out = out.concat(p); });
        if (pages.some(p => p.length < PAGE)) break;   // náðum enda
      }
      return out;
    } catch (e) { console.warn('[inservice-rows] fetchAll', e); return []; }
  }

  // 2026-08-14 (Norðurbrú-lexían): úttekt sem við eigum BARA reikning fyrir
  // sýndist ógerð — starfsmaður les grátt ár sem „aldrei farið" og fer að
  // óþörfu. v_uttekt_ar sameinar skýrslu-ár og reikninga-ár per stað;
  // heimild 'reikningur' = úttekt staðfest með reikningi en skýrslan vantar
  // (viewið sleppir reikningi þegar skýrsla er til fyrir sama ár). Þau ár
  // litast BLÁ — greinilega virk, ekki grá — en telja ÁFRAM sem „vantar
  // skýrslu" í síum/fact-check (has=false), því skýrslan vantar enn.
  let invMap = null, invLoading = false;   // co_id(str) → { year(str) → {nr,dags} }
  async function loadInv(){
    if (invLoading || invMap) return; invLoading = true;
    try {
      const sb = window.DB && DB.sb; if (!sb) { invLoading = false; return; }
      const rows = await fetchAll(() => sb.from('v_uttekt_ar')
        .select('fyrirtaeki_id,ar,heimild,nr,dags').eq('heimild','reikningur'));
      const map = {};
      rows.forEach(x => {
        if (x.fyrirtaeki_id == null || !x.ar) return;
        (map[String(x.fyrirtaeki_id)] = map[String(x.fyrirtaeki_id)] || {})[String(x.ar)] = { nr: x.nr || '', dags: x.dags || '' };
      });
      invMap = map;
      document.querySelectorAll('th[data-yrcol], td[data-yrcell]').forEach(el => el.remove());
      document.querySelectorAll('tr._ars-row[data-yrcol]').forEach(tr => tr.removeAttribute('data-yrcol'));
      process();
    } catch (_) {}
    invLoading = false;
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
      const reikRows = await fetchAll(() => sb.from('customer_documents').select('customer_base_id,year,invoice_number')
        .eq('doc_type','reikningur').not('customer_base_id','is',null));
      // Pakki 7: búðarreikningar (solur.vidskiptategund='bud') kveikja EKKI
      // 🧾-ársmerkið í ársskoðunarlistanum — það er skoðunar-samhengi og
      // búðarsala segir ekkert um úttekt ársins. ovisst/óþekkt telja áfram.
      const budNums = new Set();
      try {
        const bs = await fetchAll(() => sb.from('solur').select('num').eq('vidskiptategund', 'bud'));
        bs.forEach(s => { const n = String(s.num || '').trim().toUpperCase(); if (n) budNums.add(n); });
      } catch (_) {}
      const byBase = {};
      reikRows.forEach(x => {
        if (x.customer_base_id == null || !x.year) return;
        const inv = String(x.invoice_number || '').trim().toUpperCase();
        if (inv && budNums.has(inv)) return;
        (byBase[x.customer_base_id] = byBase[x.customer_base_id] || new Set()).add(String(x.year));
      });
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
      // 2026-08-17: Nóta-dálkurinn (153, th[data-notacol]) situr næst á eftir
      // nafninu — árs-dálkarnir hliðra sér þá um eitt sæti til hægri, og fá
      // EINN samhaus „Skoðanir · skjöl" (colspan=4) eins og mockupið, í stað
      // fjögurra '23–'26 hausa. Röð-reitirnir eru áfram fjórir undir honum.
      let ref = htr.children[1] || null;
      const hasNota = !!(ref && ref.getAttribute && ref.getAttribute('data-notacol'));
      if (hasNota) ref = htr.children[2] || null;
      if (hasNota) {
        // Design v3: EINN samhaus yfir árin fjögur — erfir þema-hausstílinn
        // (.thm .data-table th) svo hann er eins og hinir hausarnir.
        const th = document.createElement('th');
        th.setAttribute('data-yrcol', '1');
        th.colSpan = YEARS.length;
        th.className = 'center';
        th.textContent = 'Skoðanir · skjöl';
        htr.insertBefore(th, ref);
      } else YEARS.forEach(y => {
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
      // 2026-08-17: hoppa yfir Nóta-reitinn (153, td._ars-notacell) — árs-
      // reitirnir koma á eftir honum, eins og í hausnum.
      let ref = tr.children[1] || null;
      if (ref && ref.classList && ref.classList.contains('_ars-notacell')) ref = tr.children[2] || null;
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
        // 2026-08-11 (Agnar: „this is very dangerous false flag … might make us
        // miss going to this company in security inspections"): þetta mátaði
        // HVAÐA viðhengi sem er með réttu ári — líka REIKNINGA og SAMNINGA — og
        // málaði árið grænt eins og úttektarskýrsla væri á skrá. Dæmið sem fannst:
        // Steypustöðin Þorlákshöfn (co 620) átti reikning „… R-106237 - 2026 -
        // 109.868 kr.pdf" merktan 2026 → '26 varð grænt þótt ENGIN skoðun 2026
        // væri til. Mælt á lifandi gögnum: 97 reikningar + 4 samningar bera
        // árs-merki, 130 reitir lituðust af öðru en skýrslu, þar af 20 ÁN
        // nokkurrar raunverulegrar skýrslu. Grænt = „skoðun skjalfest" og má
        // ALDREI leiða af reikningi — reikningur sannar að rukkað var, ekki að
        // farið hafi verið á staðinn.
        const isReportKind = (x) => {
          const k = String(x.kind || x.category || '').toLowerCase();
          if (k) return k === 'skyrsla' || k === 'skýrsla' || k === 'uttektarskyrsla' || k === 'brunakerfi';
          // Ómerkt (hvorki kind né category): fellum aftur á heitið, en aðeins ef
          // það lítur EKKI út eins og reikningur — „R-106237", „109.868 kr",
          // „reikningur". Ómerkt skýrsla („Steypustöðin Þorlákshöfn 2025.pdf")
          // heldur sér því, en reikningur með ártali í heiti gerir það ekki.
          return !/(\bR-?\s?\d{4,}\b|\bkr\b|reikning)/i.test(String(x.name || ''));
        };
        const f = files.find(x => String(x.year) === y && isReportKind(x)) ||
                  files.find(x => x.year == null && isReportKind(x) &&
                                  new RegExp('\\b' + y + '\\b').test(String(x.name || '')));
        // 2026-08-17 (Design v3, 842ebdfe — README: „CSS-ið í <style>-blokkinni
        // er nákvæma uppskriftin"): _yr-merkin 52×20 með LED-stöðupunkti
        // (::before) + tveir örpunktar undir (grænn = úttektarskýrsla, blár =
        // reikningur). Ástönd: tómt/on/both/now/inv-only — CSS í 153
        // (_ars-mock-css). Allar smell-hegðanir og titlar halda sér.
        const yy = y.slice(-2);
        const fst = fcStat(coId, y);
        const confirmed = fst === 'human';
        const isClaude  = fst === 'claude';
        const isGap     = fst === 'gap';
        const isNow = (y === String(new Date().getFullYear()));
        const hasInvYear = !!((invMap && invMap[coId] && invMap[coId][y]) || (reikMap && reikMap[kt] && reikMap[kt].has(y)));
        const td = document.createElement('td');
        td.setAttribute('data-yrcell','1');
        td.style.cssText = 'text-align:center;';
        const wrapBadge = (badgeHtml, hasRep) =>
          '<span class="_dd">' + badgeHtml +
            '<u><i class="' + (hasRep ? 'rep' : '') + '"></i><i class="' + (hasInvYear ? 'inv' : '') + '"></i></u></span>';
        // Ástands-klasar merkisins (effRep = skýrsla eða handstaðfest):
        const yrCls = (effRep) => {
          if (isGap) return '_yr now' + (effRep ? ' lit' : '');
          if (effRep && hasInvYear) return '_yr ' + (isNow ? 'now' : 'on') + ' both lit';
          if (effRep) return '_yr ' + (isNow ? 'now' : 'on') + ' lit';
          if (hasInvYear || isClaude) return '_yr ' + (isNow ? 'now' : 'on') + ' inv-only lit';
          if (isNow) return '_yr now';
          return '_yr';
        };
        // 2026-08-11: „skýrsla vantar"-flaggið kemur FYRST — á undan skjala-
        // vísbendingunum. Áður stóð það neðst, svo hvaða árs-merkt viðhengi sem er
        // þaggaði það niður í hljóði: Steypustöðin Þorlákshöfn 2026 var MERKT
        // `gap` („Skýrsla vantar fyrir þetta ár") og sýndi samt GRÆNT. Mælt: 12
        // slík tilvik. Þetta er líka svarið við „I cant make it not green" —
        // flaggið er skýr mannleg/Claude-niðurstaða og yfirgnæfir nú ágiskun úr
        // skjölum. Skjalið sjálft er áfram aðgengilegt (📄-hlekkur á eftir).
        if (isGap) {
          const gapDoc = (u || f)
            ? ' · ATH: skjal er á skrá fyrir ' + y + ' en það er EKKI úttektarskýrsla (eða flaggið stendur enn)'
            : '';
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(false) + ' _yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Skýrsla vantar fyrir ' + y + ' — hengdu við eða veldu úr safni' + gapDoc + '">' + yy + '</a>' +
            (u ? '<a href="' + u + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Opna skjalið sem er á skrá fyrir ' + y + '" style="font-size:10px;text-decoration:none">📄</a>' : ''), false);
        } else if (u) {
          td.innerHTML = wrapBadge('<a href="' + u + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="' + yrCls(true) + '" title="Úttektarskýrsla ' + y + ' í Drive' + (confirmed ? ' · ✓ staðfest handvirkt' : (isClaude ? ' · Claude yfirfór' : '')) + '">' + yy + '</a>', true);
        } else if (f) {
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(true) + ' _yr-att" data-path="' + String(f.path||'').replace(/"/g,'&quot;') + '" title="' + String(f.name||'').replace(/"/g,'&quot;') + ' (' + y + ' — upphlaðið skjal)">' + yy + '</a>', true);
        } else if (invMap && invMap[coId] && invMap[coId][y]) {
          // BLÁTT (inv-only): úttektin var GERÐ (reikningur til) en skýrslan vantar.
          const iv = invMap[coId][y];
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(false) + ' _yr-add" data-co-id="' + coId + '" data-year="' + y + '" ' +
            'title="Úttekt staðfest með reikningi ' + String(iv.nr).replace(/"/g,'&quot;') + ' (' + String(iv.dags).replace(/"/g,'&quot;') + ') — skýrsla vantar. Smelltu til að hengja skýrsluna við.">' + yy + '</a>', false);
        } else if (confirmed) {
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(true) + ' _yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Fact-checkað ' + y + ' (staðfest handvirkt)">' + yy + '</a>', true);
        } else if (isClaude) {
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(false) + ' _yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Claude yfirfór ' + y + ' — bíður staðfestingar">' + yy + '</a>', false);
        } else {
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(false) + ' _yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Hengja skýrslu við ' + y + '">' + yy + '</a>', false);
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
    try { loadLoc(); loadReik(); loadInv(); } catch (_) {}   // best-effort warm (idempotent)
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
      // `inv` = úttekt staðfest með reikningi (v_uttekt_ar) en skýrsla vantar —
      // `has` er ÁFRAM skýrslu-eingöngu svo „vantar skýrslu"-talningar standi.
      out[y] = { has: !!(u || f), due: (y === '2026'), reik: !!(reikMap && reikMap[kt] && reikMap[kt].has(y)),
        inv: !!(invMap && invMap[coId] && invMap[coId][y]) };
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

  // 2026-08-11 (ósk Agnars — „Manual override"): TVÍSMELLUR á árs-reit í
  // listanum hringar fact-check ársins beint héðan, án þess að opna kúnnasíðuna.
  // 2026-08-17 (Agnar: „toggle the status. green yellow, blue"): blátt bætt í
  // hringinn — handmerkið fyrir „úttekt gerð / yfirfarið en skýrsla vantar":
  //   ekkert → ✓ staðfest (grænt) → 🟠 skýrsla vantar (gult) → 🔵 blátt → ekkert
  // 'gap' er RÍKJANDI í litun reitsins, svo þetta er leiðin til að slökkva á
  // ranglega grænu ári. Sama `year_factcheck`-tafla og NÁKVÆMLEGA sami hringur
  // og STAÐA EFTIR ÁRI-pillurnar á kúnnasíðunni (patch 199 fcToggle) — ein
  // staða, tvær leiðir að henni; yfirskrift á öðrum staðnum birtist á hinum.
  document.addEventListener('dblclick', async e => {
    const cell = e.target.closest('._yr-add, ._yr-att, td[data-yrcell] a');
    if (!cell) return;
    const td = cell.closest('td[data-yrcell]'); if (!td) return;
    const tr = td.closest('tr._ars-row'); if (!tr) return;
    const coId = cell.dataset.coId || tr.getAttribute('data-co-id');
    // Árið: af hlekknum sjálfum þegar það er til, annars úr stöðu reitsins í röðinni.
    let year = cell.dataset.year;
    if (!year) {
      const cells = Array.from(tr.querySelectorAll('td[data-yrcell]'));
      const i = cells.indexOf(td); if (i >= 0) year = YEARS[i];
    }
    if (!coId || !year) return;
    e.preventDefault(); e.stopPropagation();
    const sb = window.DB && DB.sb; if (!sb) return;
    const cur = fcStat(coId, year);
    const next = cur === 'human' ? 'gap' : (cur === 'gap' ? 'claude' : (cur === 'claude' ? null : 'human'));
    try {
      if (next === null) {
        const r = await sb.from('year_factcheck').delete().eq('co_id', +coId).eq('year', +year);
        if (r.error) throw r.error;
      } else {
        const r = await sb.from('year_factcheck').upsert({
          co_id: +coId, year: +year, status: next,
          note: next === 'gap' ? 'Merkt handvirkt: skýrsla vantar'
              : next === 'claude' ? 'Merkt handvirkt: úttekt gerð — skýrsla vantar'
              : null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'co_id,year' });
        if (r.error) throw r.error;
      }
      // fcMap byrjar sem null (ekki hlaðið enn) — má ekki afvísa í það blint.
      if (!fcMap) fcMap = {};
      fcMap[String(coId)] = fcMap[String(coId)] || {};
      if (next === null) delete fcMap[String(coId)][String(year)];
      else fcMap[String(coId)][String(year)] = next;
      document.querySelectorAll('th[data-yrcol], td[data-yrcell]').forEach(el => el.remove());
      document.querySelectorAll('tr._ars-row[data-yrcol]').forEach(r => r.removeAttribute('data-yrcol'));
      process();
      // 2026-08-17: láta 153 vita — „Skoðað <ár>"-staðan fylgir nú litnum á
      // árs-merkinu (isDoneYear les year_factcheck), svo hún á að uppfærast strax.
      try { document.dispatchEvent(new Event('attachment-year-changed')); } catch (_) {}
      try { if (window.Toast && Toast.show) Toast.show(
        next === 'gap' ? '🟠 ' + year + ' merkt: skýrsla vantar'
        : next === 'human' ? '✓ ' + year + ' staðfest'
        : next === 'claude' ? '🔵 ' + year + ' merkt: úttekt gerð — skýrsla vantar'
        : '↺ ' + year + ' flagg hreinsað — sjálfvirk staða'); } catch (_) {}
    } catch (err) { alert('Náði ekki að vista: ' + ((err && (err.message || err.hint)) || err)); }
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
  setTimeout(loadInv, 800);    // load v_uttekt_ar (úttekt-með-reikningi = blátt ár)
})();
