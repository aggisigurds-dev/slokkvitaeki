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

  // Slökkvitækja-ársmerki = úttektarskýrsla. Brunakerfi er ANNAÐ kerfi
  // (STADREYNDIR: skýrslur mega ALDREI leka milli kerfanna). Center Hótel
  // Arnarhvoll á 2026 brunakerfi-PDF án 2026 úttektar — má ekki mála '26 grænt.
  function isReportKind(x) {
    const k = String(x.kind || x.category || '').toLowerCase();
    if (k) return k === 'skyrsla' || k === 'skýrsla' || k === 'uttektarskyrsla';
    return !/(\bR-?\s?\d{4,}\b|\bkr\b|reikning|brunakerfi)/i.test(String(x.name || ''));
  }
  function findReportAtt(files, y) {
    const list = Array.isArray(files) ? files : [];
    return list.find(x => String(x.year) === String(y) && isReportKind(x)) ||
           list.find(x => x.year == null && isReportKind(x) &&
                           new RegExp('\\b' + y + '\\b').test(String(x.name || '')));
  }

  // Reikningur-ár per STAÐ (fyrirtaeki_id), ekki per kennitölu.
  // 2026-08-25 (Agnar, false-flag hunt): loadReik lyklaði á customer_base_id →
  // kt-tölustafir, svo EINN Center Hótel-reikningur (450905-1430, 11 hótel)
  // málaði bláan reiknings-punkt á ÖLL systkini ársins — Hlaðvarpinn /
  // Þverholt 14 / Þingholt Apartments 2024+ sýndu „reikningur til" án
  // eigin reiknings og án skýrslu. Sama lekinn á Heimaleiga, Steypustöðinni,
  // Pizzunni, Vélrás. Nú: byCo[fyrirtaeki_id] = Set(ár); reikningar ÁN
  // fyrirtaeki_id (byKtOrphan) aðeins þegar kt-in á EINN stað — sama regla
  // og uttekt_files hér að neðan. Búðarsala + brunakerfi eru útilokuð.
  //
  // 2026-08-26 (Plaza false flag): Drive-reikningur ÁN POS/v_uttekt_ar má
  // ekki mála inv-only blátt. Plaza (193) á R-107802 (Stolpi 01.02.26,
  // hleðsla/yfirferð, EKKI ársúttektin) í customer_documents.teg=uttekt —
  // Rekstrarfélög/prófíls-pillur sýna ekkert blátt (engin skýrsla) en Ársskoðun
  // kveikti LED af reikMap.byCo. hasReikYear = 🧾 við hlið skýrslu;
  // hasConfirmedInvYear = inv-only blátt (v_uttekt_ar EÐA solur.customer_id).
  let reikMap = null, reikLoading = false;
  function hasReikYear(coId, kt, y, ktCount) {
    if (!reikMap) return false;
    if (reikMap.byCo && reikMap.byCo[coId] && reikMap.byCo[coId].has(y)) return true;
    if ((ktCount[kt] || 0) <= 1 && reikMap.byKtOrphan && reikMap.byKtOrphan[kt] && reikMap.byKtOrphan[kt].has(y)) return true;
    // POS á þessum stað (Klöpp R-000668 o.fl.) — 🧾 við hlið skýrslu. Drive-einn
    // (Plaza) kemst HINGAÐ líka um byCo, en inv-only notar hasConfirmedInvYear.
    if (reikMap.bySolurCo && reikMap.bySolurCo[coId] && reikMap.bySolurCo[coId].has(y)) return true;
    return false;
  }
  function hasConfirmedInvYear(coId, y) {
    if (invMap && invMap[coId] && invMap[coId][y]) return true;
    if (reikMap && reikMap.bySolurCo && reikMap.bySolurCo[coId] && reikMap.bySolurCo[coId].has(y)) return true;
    return false;
  }
  // 2026-08-19 (Agnar #11 — „fyrirtæki í þjónustu are not syncing to ársskoðun …
  // Hamraborg 7"): document_pairs.status='klarad' (skýrsla↔reikningur paruð, per
  // fyrirtaeki_id, service_type='uttekt') er DVARANDI „úttekt ársins fullbúin"-
  // merkið sem Agnar viðheldur handvirkt þvert á öppin. Það TROMPAR gamalt/staðnað
  // `gap`-flagg (year_factcheck skrifað ÁÐUR en verkið kláraðist): Hamraborg 7 (co
  // 1488) á klarad-par 2026 en `gap` frá 2026-07-22 → sýndist rautt. Steypustöðin
  // (co 620) á ENGIN klarad-par → helst rétt rautt (engin fals-græn — sama lexía
  // og árs-merkt viðhengi hér að ofan). pairMap[fyrirtaeki_id(str)] = Set(ár).
  let pairMap = null, pairLoading = false;
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
        // 2026-08-20: storage-first + authed proxy (Drive rotnar / óskráðar skrár
        // opna ekki með hráum hlekk → /api/skjal á Brunahólfi streymir með server-OAuth).
        const su = storageUrl(x.storage_path);
        const did = x.drive_file_id && String(x.drive_file_id).indexOf('sb:') !== 0 ? x.drive_file_id : '';
        const u = su || (did ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(did) : '');
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
  // Úttektar-🧾 á Ársskoðun. Brunakerfisreikningar (og búð) mega EKKI kveikja
  // slökkvitækja-punktinn — doc_type er alltaf 'reikningur' fyrir báðar þjónustur;
  // raunverulegi merkimiðinn er customer_documents.vidskiptategund. Óþekkt/ovisst
  // halda áfram (77 reikningar) svo Hamraborg 7 o.fl. slokkni ekki.
  function isUttektInvoiceTeg(teg) {
    const t = String(teg || '').toLowerCase();
    return t !== 'brunakerfi' && t !== 'bud';
  }
  async function loadReik(){
    if (reikLoading || reikMap) return; reikLoading = true;
    try {
      const sb = window.DB && DB.sb; if (!sb) { reikLoading = false; return; }
      const reikRows = await fetchAll(() => sb.from('customer_documents').select('id,customer_base_id,fyrirtaeki_id,year,invoice_number,vidskiptategund')
        .eq('doc_type','reikningur'));
      // Pakki 7 + 2026-08-26: búð og brunakerfi kveikja EKKI úttektar-🧾.
      // ovisst/óþekkt telja áfram (Hamraborg 7). solur.customer_id er staðrætti
      // POS-staðfesting — Drive-einn (Plaza R-107802) fer EKKI í bySolurCo.
      const skipNums = new Set();
      const bySolurCo = {};
      try {
        const sales = await fetchAll(() => sb.from('solur').select('num,customer_id,created_at,vidskiptategund,status'));
        sales.forEach(s => {
          const teg = String(s.vidskiptategund || '').toLowerCase();
          const n = String(s.num || '').trim().toUpperCase();
          if (teg === 'bud' || teg === 'brunakerfi') { if (n) skipNums.add(n); return; }
          const st = String(s.status || '').toLowerCase();
          if (st === 'cancelled' || st === 'canceled' || st === 'credit' || st === 'void') return;
          if (s.customer_id == null) return;
          const y = String(s.created_at || '').slice(0, 4);
          if (!/^20\d{2}$/.test(y)) return;
          (bySolurCo[String(s.customer_id)] = bySolurCo[String(s.customer_id)] || new Set()).add(y);
        });
      } catch (_) {}
      const byCo = {};
      const byBaseOrphan = {};
      reikRows.forEach(x => {
        if (!x.year) return;
        if (!isUttektInvoiceTeg(x.vidskiptategund)) return;
        const inv = String(x.invoice_number || '').trim().toUpperCase();
        if (inv && skipNums.has(inv)) return;
        const y = String(x.year);
        if (x.fyrirtaeki_id != null) {
          (byCo[String(x.fyrirtaeki_id)] = byCo[String(x.fyrirtaeki_id)] || new Set()).add(y);
        } else if (x.customer_base_id != null) {
          (byBaseOrphan[String(x.customer_base_id)] = byBaseOrphan[String(x.customer_base_id)] || new Set()).add(y);
        }
      });
      const byKtOrphan = {};
      const ids = Object.keys(byBaseOrphan);
      for (let i = 0; i < ids.length; i += 500) {
        const b = await sb.from('customers_base').select('id,kennitala').in('id', ids.slice(i, i + 500));
        (b.data || []).forEach(row => {
          const d = digits(row.kennitala);
          if (d.length < 10) return;
          const years = byBaseOrphan[String(row.id)];
          if (!years) return;
          const set = (byKtOrphan[d] = byKtOrphan[d] || new Set());
          years.forEach(y => set.add(y));
        });
      }
      reikMap = { byCo, byKtOrphan, bySolurCo };
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
  async function loadPairs(){
    if (pairLoading || pairMap) return; pairLoading = true;
    try {
      const sb = window.DB && DB.sb; if (!sb) { pairLoading = false; return; }
      // Aðeins fullbúin úttektar-pör (ekki brunakerfi, ekki vantar_*). Keyed á
      // fyrirtaeki_id svo fjölstaða-viðskiptavinur (t.d. Heimaleiga, 12 staðir á
      // sömu kt) haldi hverjum stað sjálfstæðum — sama regla og document_pairs
      // einkvæmnin í Brunahólf.
      const rows = await fetchAll(() => sb.from('document_pairs')
        .select('fyrirtaeki_id,year,invoice_doc_id')
        .eq('service_type','uttekt').eq('status','klarad').not('fyrirtaeki_id','is',null));
      // Display-omit: uttekt+klarad par sem vísar á brunakerfis-reikning
      // (t.d. Grandi 2026 par 1295 → R-108001). EKKI UPDATE/DELETE parinu —
      // málarinn sleppir því bara. Fail-open ef skip-sóknin klikkar.
      const bruInvIds = new Set();
      try {
        const bruRows = await fetchAll(() => sb.from('customer_documents')
          .select('id').eq('doc_type','reikningur').eq('vidskiptategund','brunakerfi'));
        bruRows.forEach(d => { if (d && d.id != null) bruInvIds.add(d.id); });
      } catch (e) {
        if (typeof window.logProblem === 'function') {
          window.logProblem('inservice_row_reports', 'bru_invoice_skip_failed', { detail: String((e && e.message) || e).slice(0, 200) });
        }
      }
      const map = {};
      rows.forEach(x => {
        if (x.fyrirtaeki_id == null || !x.year) return;
        if (x.invoice_doc_id && bruInvIds.has(x.invoice_doc_id)) return;
        (map[String(x.fyrirtaeki_id)] = map[String(x.fyrirtaeki_id)] || new Set()).add(String(x.year));
      });
      pairMap = map;
      document.querySelectorAll('th[data-yrcol], td[data-yrcell]').forEach(el => el.remove());
      document.querySelectorAll('tr._ars-row[data-yrcol]').forEach(tr => tr.removeAttribute('data-yrcol'));
      process();
    } catch (_) {}
    pairLoading = false;
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
      // 2026-08-17: Nóta- og Heimilisfangs-dálkarnir (153, data-notacol/-addrcol)
      // sitja á eftir nafninu — árs-dálkarnir hoppa yfir þá og fá EINN samhaus
      // „Skoðanir · skjöl" (colspan=4). Röð-reitirnir eru áfram fjórir undir.
      // 2026-08-26: festum við data-notacol-hausinn með SELECTOR, ekki children[1]
      // — nýr póst-stöðu dálkur (153, ._ars-mailhdr) fremst mátti annars færa
      // children[1] yfir á nafna-hausinn og árs-hausinn lenti á röngum stað.
      let ref = htr.querySelector('th[data-notacol]') || htr.children[1] || null;
      const hasNota = !!(ref && ref.getAttribute && ref.getAttribute('data-notacol'));
      while (ref && ref.getAttribute && (ref.getAttribute('data-notacol') || ref.getAttribute('data-addrcol'))) ref = ref.nextElementSibling;
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

    // 2026-08-17 (Agnar — „Des-skoðun, we dont have to go yet"): skoðunar-
    // mánuðurinn ræður hvort tómt yfirstandandi ár er RAUTT (mánuður kominn/
    // liðinn = á eftir) eða GULL (mánuður seinna á árinu = á dagskrá).
    // Lesið úr SÖMU samsettu heimild og SKOÐUN-dálkurinn sýnir
    // (Arsskodun._cache.list → _ars.inspect_month: handvirkt + skýrslugögn +
    // v_skodunar_manudur) — handvirka blobbið eitt missti af fyrirtækjum þar
    // sem mánuðurinn kemur úr skýrslu/reikningi (Okt-raðir sýndust rauðar).
    const _arsMonthById = {};
    try {
      (((window.Arsskodun || {})._cache || {}).list || []).forEach(c => {
        _arsMonthById[String(c.id)] = +(((c._ars || {}).inspect_month)) || 0;
      });
    } catch (_) {}
    const _arsBlob = (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {};
    const _curMonth = new Date().getMonth() + 1;

    // 2) each company row — add the four year cells at the same position
    document.querySelectorAll('tr._ars-row:not([data-yrcol])').forEach(tr => {
      tr.setAttribute('data-yrcol','1');
      const coId = String(tr.getAttribute('data-co-id'));
      const c = byId[coId];
      const kt = c ? digits(c.kennitala) : '';
      const rec = uf[kt] || {};
      const files = Array.isArray(att[coId]) ? att[coId] : [];
      // 2026-08-17: hoppa yfir Nóta- OG Heimilisfangs-reitina (153,
      // ._ars-notacell/._ars-addrcell) — árs-reitirnir koma á eftir þeim.
      // 2026-08-26: festum við ._ars-notacell með SELECTOR, ekki children[1]
      // — póst-stöðu dálkurinn fremst (153, ._ars-mailcol) hefði annars fært
      // children[1] yfir á nafna-reitinn og árin lent milli pósts og nafns.
      let ref = tr.querySelector('td._ars-notacell') || tr.children[1] || null;
      while (ref && ref.classList && (ref.classList.contains('_ars-notacell') || ref.classList.contains('_ars-addrcell'))) ref = ref.nextElementSibling;
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
        const f = findReportAtt(files, y);
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
        const hasRepDoc = !!(u || f);
        const hasInvYear = hasReikYear(coId, kt, y, ktCount);
        const hasInvOnly = hasConfirmedInvYear(coId, y);
        // Fullbúið úttektar-par (klarad) fyrir þennan stað+ár — trompar staðnað gap.
        const isKlarad = !!(pairMap && pairMap[coId] && pairMap[coId].has(y));
        // 🧾 undir skýrslu = site-keyed úttektarreikningur. Án skýrslu = aðeins
        // v_uttekt_ar eða POS á þessum stað — Plaza R-107802 (Drive-einn) slokknar.
        const showInvLed = (hasRepDoc || isKlarad) ? hasInvYear : hasInvOnly;
        const td = document.createElement('td');
        td.setAttribute('data-yrcell','1');
        td.style.cssText = 'text-align:center;';
        const wrapBadge = (badgeHtml, hasRep) =>
          '<span class="_dd">' + badgeHtml +
            '<u><i class="' + (hasRep ? 'rep' : '') + '"></i><i class="' + (showInvLed ? 'inv' : '') + '"></i></u></span>';
        // Ástands-klasar merkisins (effRep = skýrsla eða handstaðfest).
        // 2026-08-17 (Agnar): grænt = skoðað (skýrsla til), rautt = EKKI skoðað
        // („red when not inspected"), blátt = bara reikningur/yfirfarið — og
        // LED-glóðin (.lit) kviknar AÐEINS við fact-check-staðfestingu
        // („not with green dot light up untill factchecked").
        const yrCls = (effRep) => {
          const lit = confirmed ? ' lit' : '';
          // gull þegar skoðunarmánuður YFIRSTANDANDI árs er ekki kominn — líka
          // þegar gap-flagg stendur (Claude-yfirferðirnar flögguðu fjölda 2026-
          // raða „skýrsla vantar" þótt skoðunin sé ekki tímabær fyrr en seinna
          // á árinu; Agnar: „we dont have to go yet"). Liðinn mánuður = rautt.
          // 2026-08-23 (Factcheck Task 3): AÐEINS liðinn mánuður (_im < curMonth)
          // telst „á eftir" (rautt). YFIRSTANDANDI mánuður er enn framundan —
          // skoðunin má gerast hvenær sem er í mánuðinum — svo hann er gull, sbr.
          // year_factcheck-nóturnar („Ekki komið að skoðun — skoðunarmánuður er
          // ágúst"). Var <= (gerði yfirstandandi mánuð rauðan, á skjön við nótuna).
          const _im = _arsMonthById[String(coId)] || (+(((_arsBlob[String(coId)]) || {}).inspect_month) || 0);
          const notDue = isNow && !(_im > 0 && _im < _curMonth);
          // 2026-08-17 (Agnar, Heimaleiga Hamraborg 7: „this one is still not
          // conected"): fyrirtæki sem er MERKT SKOÐAÐ á árinu (Skoðað-hnappurinn
          // / last_year_inspected í ársskoðunar-blobbinu) sýndi samt RAUTT 26 —
          // heimsóknin var farin en engin skýrsla/reikningur enn. Skoðað ár án
          // skjala er „úttekt gerð, skjöl vantar" = blátt, ekki rautt.
          const _visited = +(((_arsBlob[String(coId)]) || {}).last_year_inspected) === y;
          // klarad-par = úttekt ársins fullbúin (Agnar-viðhaldið, þvert á öppin) →
          // grænt, TROMPAR staðnað gap. Sett á undan isGap svo Hamraborg 7 o.fl.
          // sýni loksins rétt grænt. Steypustöðin á ekkert par → fellur í isGap.
          if (isKlarad) return '_yr ' + (isNow ? 'now' : 'on') + ' both' + lit;
          if (isGap) return '_yr ' + (notDue ? 'penda' : 'now') + lit;
          if (effRep) return '_yr ' + (isNow ? 'now' : 'on') + ' both' + lit;
          if (hasInvOnly || isClaude || _visited) return '_yr ' + (isNow ? 'now' : 'on') + ' inv-only' + lit;
          if (isNow) return '_yr ' + (notDue ? 'penda' : 'now') + lit;
          return '_yr' + lit;
        };
        // 2026-08-11: „skýrsla vantar"-flaggið kemur FYRST — á undan skjala-
        // vísbendingunum. Áður stóð það neðst, svo hvaða árs-merkt viðhengi sem er
        // þaggaði það niður í hljóði: Steypustöðin Þorlákshöfn 2026 var MERKT
        // `gap` („Skýrsla vantar fyrir þetta ár") og sýndi samt GRÆNT. Mælt: 12
        // slík tilvik. Þetta er líka svarið við „I cant make it not green" —
        // flaggið er skýr mannleg/Claude-niðurstaða og yfirgnæfir nú ágiskun úr
        // skjölum. Skjalið sjálft er áfram aðgengilegt (📄-hlekkur á eftir).
        if (isGap && !isKlarad) {
          const gapDoc = (u || f)
            ? ' · ATH: skjal er á skrá fyrir ' + y + ' en það er EKKI úttektarskýrsla (eða flaggið stendur enn)'
            : '';
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(false) + ' _yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="Skýrsla vantar fyrir ' + y + ' — hengdu við eða veldu úr safni' + gapDoc + '">' + yy + '</a>' +
            (u ? '<a href="' + u + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Opna skjalið sem er á skrá fyrir ' + y + '" style="font-size:10px;text-decoration:none">📄</a>' : ''), false);
        } else if (u) {
          td.innerHTML = wrapBadge('<a href="' + u + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="' + yrCls(true) + '" title="Úttektarskýrsla ' + y + ' í Drive' + (confirmed ? ' · ✓ staðfest handvirkt' : (isClaude ? ' · Claude yfirfór' : '')) + '">' + yy + '</a>', true);
        } else if (f) {
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(true) + ' _yr-att" data-path="' + String(f.path||'').replace(/"/g,'&quot;') + '" title="' + String(f.name||'').replace(/"/g,'&quot;') + ' (' + y + ' — upphlaðið skjal)">' + yy + '</a>', true);
        } else if (isKlarad) {
          // GRÆNT (klarad án tengdrar skýrslu): parið er staðfest fullbúið (t.d.
          // handvirkt reikning-eingöngu par, Hamraborg 7) en skýrslu-skjalið er
          // ekki tengt. Grænt = úttekt ársins lokið; smellur opnar skýrslu-tengingu.
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(true) + ' _yr-add" data-co-id="' + coId + '" data-year="' + y + '" title="✓ Fullbúið fyrir ' + y + ' — skýrsla↔reikningur paruð (klarad). Skýrsla ekki tengd; smelltu til að hengja hana við.">' + yy + '</a>', false);
        } else if (hasInvOnly) {
          // BLÁTT (inv-only): úttektin var GERÐ (v_uttekt_ar eða POS á þessum
          // stað) en skýrslan vantar. Drive-einn reikningur (Plaza R-107802) kemst ekki hingað.
          const iv = (invMap && invMap[coId] && invMap[coId][y]) || {};
          td.innerHTML = wrapBadge('<a href="#" class="' + yrCls(false) + ' _yr-add" data-co-id="' + coId + '" data-year="' + y + '" ' +
            'title="Úttekt staðfest með reikningi' + (iv.nr ? (' ' + String(iv.nr).replace(/"/g,'&quot;')) : '') + (iv.dags ? (' (' + String(iv.dags).replace(/"/g,'&quot;') + ')') : '') + ' — skýrsla vantar. Smelltu til að hengja skýrsluna við.">' + yy + '</a>', false);
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
    try { loadLoc(); loadReik(); loadInv(); loadPairs(); } catch (_) {}   // best-effort warm (idempotent)
    const out = {};
    if (!c) { YEARS.forEach(y => out[y] = { has: false, due: (y === '2026'), reik: false, klarad: false }); return out; }
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
      const f = findReportAtt(files, y);
      const hasRep = !!(u || f);
      // `inv` = úttekt staðfest með reikningi (v_uttekt_ar / POS á stað) en skýrsla vantar —
      // `has` er ÁFRAM skýrslu-eingöngu svo „vantar skýrslu"-talningar standi.
      // `reik` 🧾: við skýrslu = site-keyed úttektarreikningur; án skýrslu = confirmed only.
      out[y] = { has: hasRep, due: (y === '2026'),
        reik: hasRep ? hasReikYear(coId, kt, y, ktCount) : hasConfirmedInvYear(coId, y),
        inv: hasConfirmedInvYear(coId, y),
        klarad: !!(pairMap && pairMap[coId] && pairMap[coId].has(y)) };
    });
    return out;
  }
  // O(1) klarad-uppfletting fyrir 153 (isDoneYear) — engin þung yearInfo-smíð.
  function isKlaradYear(coId, y){ try { loadPairs(); } catch(_){} return !!(pairMap && pairMap[String(coId)] && pairMap[String(coId)].has(String(y))); }
  window.InserviceRowReports = { YEARS: YEARS.slice(), yearInfo, isKlarad: isKlaradYear };

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
  setTimeout(loadPairs, 850);  // klarad úttektar-pör → grænt trompar staðnað gap
  setTimeout(loadInv, 800);    // load v_uttekt_ar (úttekt-með-reikningi = blátt ár)
})();
