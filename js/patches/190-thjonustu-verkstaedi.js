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
  // Þögnin rétt (17.09.2026): hreinn LESTUR úr hlöðnum stillingum, með {} sem
  // varaleið. Séu stillingarnar ekki komnar enn sýnir kortið engin skref — en
  // AppSettings.onChange neðst í skránni endurteiknar um leið og þær berast, og
  // héðan er aldrei skrifað, svo tómt kort getur ekki þurrkað út raunveruleg skref.
  function arsMap() { try { if (window.AppSettings && AppSettings.path) return AppSettings.path(KEY) || {}; } catch (_) {} return {}; }

  // 2026-06-12 (Todoist): eftirfylgni-skref á hverju Í-vinnslu korti.
  // Geymd árs-skorðuð í arsskodun_customers[<id>].steps_<ár> svo þau núllast
  // sjálfkrafa um áramót. Þegar öll eru ✓ færist kortið sjálfkrafa í Búið.
  // 2026-07-22 (ósk Agnars): „Farið á verkstað" bætt við FREMST — skrefið sem
  // segir að búið sé að mæta á staðinn, á undan því að úttektin sjálf klárist.
  const STEPS_KEY = 'steps_' + curYear;
  // Hver setti hvaða skref og hvenær — { farid:{by,at}, uttekt:{…}, … }.
  // Sama arsskodun_customers-blob og skrefin sjálf, svo þetta samstillist strax
  // milli tækja og allir sjá hver er kominn í hvaða skýrslu.
  const STEPS_META_KEY = 'steps_meta_' + curYear;
  // Ártalið sem tækjalistinn var staðfestur í ársskoðun (patch 224 skrifar það
  // við „✅ Staðfesta lista"). Ártal en ekki bool svo það núllist um áramót eins
  // og hin skrefin — sami samstillti blob, svo allar vélar sjá staðfestinguna.
  const LISTI_KEY = 'listi_stadfest_ar';
  // Nafnið er SAMEIGINLEGT með bílstjóra-appinu (patch 219, localStorage
  // bs_employee) svo starfsmaður velji sig einu sinni — hvort sem hann byrjar
  // í bílnum eða á skrifstofunni.
  const EMP_KEY = 'bs_employee';
  const folkid = () => { try { const l = window.BordStarfsmadur && BordStarfsmadur.list ? BordStarfsmadur.list() : []; const f = l.filter(n => n && n !== 'Charlize' && String(n).toLowerCase() !== 'allir'); if (f.length) return f; } catch (_) {} return ['Agnar', 'Bjarndís', 'Binni', 'Anni', 'Hákon', 'Afgreiðsla']; };   // sameiginlegi listinn (350), fólkið án Charlize og Allir
  function whoAmI() { try { return localStorage.getItem(EMP_KEY) || ''; } catch (_) { return ''; } }
  function setWhoAmI(n) { try { localStorage.setItem(EMP_KEY, n || ''); } catch (_) {} }
  // „Hákon · 14:03" — eða „14:03" ef enginn hefur valið nafn (þá er tíminn þó
  // til, sem er betra en ekkert).
  function stampText(m) {
    if (!m || !m.at) return '';
    const d = new Date(m.at), now = new Date();
    const hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const sameDay = d.toDateString() === now.toDateString();
    const when = sameDay ? hhmm : (String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + hhmm);
    return (m.by ? m.by + ' · ' : '') + when;
  }
  // 2026-07-30 (ósk Agnars): „Tækjalisti staðfestur" milli þess að vera á
  // staðnum og að úttektin teljist búin — skrefið kviknar SJÁLFT þegar listinn
  // er staðfestur í ársskoðun (patch 224 „✅ Staðfesta lista"), svo skrifstofan
  // sér að tækin séu talin án þess að nokkur haki sérstaklega hér.
  const STEP_DEFS = [
    ['farid',       'Farið á verkstað', 'Farið'],
    ['averkstaedi', 'Á verkstæði',      'Verkst.'],
    ['taekjalisti', 'Tækjalisti staðfestur', 'Tækjalisti'],
    ['uttekt',      'Úttekt búin',      'Úttekt'],
    ['skyrsla',    'Skýrsla tilbúin',  'Skýrsla'],
    ['send',       'Skýrsla send',     'Send'],
    ['reikningur', 'Reikningur sendur','Reikningur']
  ];
  // Afleidd (effective) skref — speglun FRÁ Fyrirtæki í þjónustu (153):
  // fyrirtæki sem 153 (eða Bílstjóri 219 / ArsWorkflow 266) merkti „Í vinnslu"
  // (field_inspected_year === curYear) telst með úttektina búna, og fullklárað
  // ár (last_year_inspected === curYear) sýnir öll skrefin græn — nema
  // skrefið hafi verið afhakað sérstaklega (explicit false vinnur alltaf).
  function effSteps(a, hasReik, hasSkyrsla) {
    a = a || {};
    const s = Object.assign({}, a[STEPS_KEY] || {});
    if (s.uttekt === undefined && +a.field_inspected_year === curYear) s.uttekt = true;
    if (+a.last_year_inspected === curYear) STEP_DEFS.forEach(([k]) => { if (s[k] === undefined) s[k] = true; });
    // 2026-07-15: reikningur ársins þegar á skrá í customer_documents (sama
    // gögn og græna „Reikningur <ár> sendur" borðinn) ⇒ Reikningur-skrefið
    // telst búið þó enginn hafi smellt á það — send-leiðirnar (Kröfuyfirlit,
    // PDF-sjálfvistun, Drive) skrifa ekki skref. Skýrt afhak (false) vinnur.
    if (s.reikningur === undefined && hasReik) s.reikningur = true;
    // 2026-08-30: sama regla fyrir skýrslu — Ársskoðun 187 / Kröfu yfirlit
    // lykla úttektarskýrslu á fyrirtaeki_id. Án þessa sat „Skýrsla tilbúin /
    // send" óhakað þótt skjalið væri til, eða (öfugt) kt/base-join litaði
    // systkini. Aðeins ÓSKRÁÐ skref eru afleidd; skýrt afhak vinnur.
    if (s.skyrsla === undefined && hasSkyrsla) s.skyrsla = true;
    if (s.send === undefined && hasSkyrsla) s.send = true;
    // „Farið á verkstað" er UNDANFARI úttektarinnar: sé úttektin búin hlýtur að
    // hafa verið farið. Án þessa sætu öll eldri kort (og allt sem 153/219/266
    // merkja) uppi með tómt fyrsta skref á eftir grænni úttekt.
    // „Á verkstæði" er líka undanfari úttektar — og „Farið á verkstað" undanfari
    // beggja. Leiða þau af úttektinni svo eldri/afleidd kort standi ekki með tóm
    // fyrstu skref á eftir grænni úttekt.
    // Tækjalistinn er UNDANFARI úttektarinnar (talið áður en úttekt telst búin)
    // og er líka lesinn beint úr ársskoðunar-lásnum (`listi_stadfest_<ár>`) sem
    // patch 224 skrifar við „✅ Staðfesta lista" — svo hakið kviknar þótt enginn
    // smelli hér. Skýrt afhak (false) vinnur alltaf, eins og á öðrum skrefum.
    if (s.taekjalisti === undefined && +a[LISTI_KEY] === curYear) s.taekjalisti = true;
    if (s.taekjalisti === undefined && s.uttekt) s.taekjalisti = true;
    if (s.averkstaedi === undefined && (s.uttekt || s.taekjalisti)) s.averkstaedi = true;
    if (s.farid === undefined && (s.uttekt || s.averkstaedi || s.taekjalisti)) s.farid = true;
    return s;
  }
  // Bráðabirgða-merkingar (single-select) á hverju Í-vinnslu korti.
  // [key, label, bg, tx, bd]
  // Rólegri (muted) litir en áður — halda merkingu (warning/varúð) en falla að
  // vinstri-dálks stílnum í stað hávaðasamra rauð/blárra fylla (Agnar 2026-07-26).
  const MARK_DEFS = [
    ['haett',         'Hætt',                    '#f4ecec', '#8a4a46', '#e2cdcb'],
    ['uppfaera_dags', 'Eftir að uppfæra dags.',  '#f4efe4', '#836a38', '#e3d8c1'],
    ['reikn_adur',    'Reikningur sendur áður',  '#eceff4', '#4f5d76', '#d3dae5']
  ];

  // View mode — "list" (gamla miðjan, sjálfgefið / uppáhald) eða "cards".
  let _mode = (function () { try { return localStorage.getItem('sv_mode') || 'list'; } catch (_) { return 'list'; } })();
  function setMode(m) { _mode = m; try { localStorage.setItem('sv_mode', m); } catch (_) {} render(); }
  // Skref-sía (2026-07-30, ósk Agnars: „sjá alla sem eru með það hakað — og hina
  // líka"). Þrjár stöður per skref: '' (engin sía) → 'on' (✓ búið) → 'off'
  // (⧗ vantar). Geymt svo sían haldist milli heimsókna á síðuna.
  let _stepF = (function () { try { return JSON.parse(localStorage.getItem('sv_stepf') || '{}') || {}; } catch (_) { return {}; } })();
  function cycleStepF(k) {
    const cur = _stepF[k] || '';
    const next = cur === '' ? 'on' : (cur === 'on' ? 'off' : '');
    if (next) _stepF[k] = next; else delete _stepF[k];
    try { localStorage.setItem('sv_stepf', JSON.stringify(_stepF)); } catch (_) {}
    render();
  }
  function clearStepF() { _stepF = {}; try { localStorage.removeItem('sv_stepf'); } catch (_) {} render(); }
  // Röðun á Í-vinnslu listanum — "name" | "revenue" | "marked".
  let _sort = (function () { try { return localStorage.getItem('sv_sort') || 'name'; } catch (_) { return 'name'; } })();
  function setSort(s) { _sort = s; try { localStorage.setItem('sv_sort', s); } catch (_) {} render(); }
  // Leit í Í-vinnslu listanum
  let _search = '';
  function setSearch(s) { _search = s.trim().toLowerCase(); render(); }

  // Companies that ALREADY have a reikningur filed for the current year in
  // customer_documents (Drive-indexed + POS-connected — the same store the
  // company profile "Skjöl & viðhengi" reads). A green "🧾 Reikningur <ár> sendur"
  // banner + "Fjarlægja af borði" then lets the office clear them off the board.
  // ⚠️ Lykillinn hér er `fyrirtaeki_id` — STAÐURINN, ekki kennitalan og ekki
  // `customer_base_id` (lögaðilinn). Kennitalan er EKKI einkvæm: 19 kennitölur
  // ná yfir 78 staði (Heimaleiga 12, Pizzan 11, Center Hótel 10 …), svo bæði
  // kt- og base_id-uppfletting lætur reikning á EINUM stað lita alla systkina-
  // staðina græna og hreinsa þá af borðinu. Mælt 2026-08-08 á lifandi gögnum:
  // base_id-lykill hreinsaði 11 staði en 4 þeirra RANGLEGA; `fyrirtaeki_id`
  // hreinsar réttu 7. `customer_documents.fyrirtaeki_id` er útfylltur á 92,9%
  // reikninga ársins — raðir án hans eru viljandi sleppt, því þá vitum við
  // ekki hvaða stað reikningurinn tilheyrir.
  let _reikStadir = new Set();   // Set<fyrirtaeki.id> með reikning ársins
  let _reik2026Loaded = false;
  // co.id → á reikning ársins (fyllt í buckets(), notað í skref-smellinum svo
  // smellurinn sjái SÖMU afleiddu skrefin og teiknuð eru)
  let _reikCoIds = new Set();
  // Sama regla og Ársskoðun 187: brunakerfi/búð kveikja EKKI úttektar-🧾.
  // Ómerkt/ovisst telst úttekt (Hamraborg 7).
  function isUttektInvoiceTeg(teg) {
    const t = String(teg || '').toLowerCase();
    return t !== 'brunakerfi' && t !== 'bud';
  }
  async function loadReik2026() {
    try {
      const sb = (window.DB && DB.sb); if (!sb) return;
      // 21.09.2026 (úttekt): fyrirspurnin var ÓBLAÐSÍÐUÐ — PostgREST klippir þegjandi
      // við 1000 raðir, og sjálfvirka „búið"-merkingin hér að neðan (markBuid) SKRIFAR
      // út frá þessu mengi. DB.fetchAll flettir í 1000-raða síðum (`id` gefur stöðuga
      // röð) og kastar á villu → catch að neðan, ekkert skrifað.
      const rows = await DB.fetchAll((from, to) => sb.from('customer_documents')
        .select('fyrirtaeki_id,vidskiptategund').eq('doc_type', 'reikningur').eq('year', curYear)
        .not('fyrirtaeki_id', 'is', null).order('id').range(from, to));
      _reikStadir = new Set((rows || [])
        .filter(x => isUttektInvoiceTeg(x.vidskiptategund))
        .map(x => x.fyrirtaeki_id).filter(v => v != null));
      // Auto-remove: staðir í „í vinnslu" sem eiga reikning ársins eru í raun
      // kláraðir — merkjum þá án þess að bíða eftir handvirkum smelli (sama og
      // markBuid gerir á hakinu).
      const map = arsMap();
      const cos = (window.Companies && Companies.list) || [];
      for (const co of cos) {
        if (!co || co.deleted_at || co.er_i_thjonustu === false) continue;
        if (!_reikStadir.has(co.id)) continue;
        const a = map[String(co.id)] || {};
        const fy = +a.field_inspected_year || 0;
        const ly = +a.last_year_inspected || 0;
        if (fy === curYear && ly !== curYear) markBuid(co.id);
      }
    } catch (_) {}
    render();
  }

  // ── Árs-skjöl (úttektarskýrsla + reikningur) per fyrirtæki — batchað. ──────
  // Viðbót ofan á loadReik2026 (sem rekur AÐEINS reikningsveru per kt fyrir
  // afleiddu skrefin): hér eru sóttar SJÁLFAR skjala-raðirnar svo hver röð geti
  // sýnt 📄 Skýrslu-hlekk, 🧾 R-nr-hlekk og (úr payday_invoices_slokk eftir kt)
  // upphæð + greiðslustöðu. Ein fyrirspurn per gagnategund yfir ALLA sýnilega
  // þjónustu-kúnna — aldrei per-röð. Best-effort: mistök skilja borðið eftir
  // ósnert (kortin sleppa bara auka-línunni).
  let _yearDocs = null;      // Map<co.id, {skyrsla|null, reik|null}>
  let _yearDocsLoaded = false;
  let _pdByCo = null;        // Map<co.id, payday/solur-röð> — STAÐUR, ekki kt
  let _krafaCoIds = new Set();  // solur.customer_id með senda kröfu ársins
  function storageUrl(p) {
    if (!p) return '';
    const base = String(window.SUPABASE_URL || '').replace(/\/+$/, '');
    if (!base) return '';
    const s = String(p).replace(/^\/+/, '');
    const i = s.indexOf('/'); if (i < 1) return '';
    return base + '/storage/v1/object/public/' + s.slice(0, i) + '/' +
           s.slice(i + 1).split('/').map(encodeURIComponent).join('/');
  }
  function docUrl(d) {
    if (!d) return '';
    if (d.public_url) return d.public_url;
    // storage-first (sama og 187): Drive-id rotnar; Storage-skýrslur bera
    // AÐEINS storage_path. Án þessa sýndi docsLine „engin skýrsla".
    const su = storageUrl(d.storage_path);
    if (su) return su;
    if (d.drive_file_id && String(d.drive_file_id).indexOf('sb:') !== 0) return 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(d.drive_file_id);
    return '';
  }
  function pickBetterPd(prev, next) {
    if (!prev) return next;
    const better = (!!next.paid_date && !prev.paid_date) ||
      (String(next.created_date || '') > String(prev.created_date || ''));
    return better ? next : prev;
  }
  async function loadYearDocs() {
    try {
      const sb = (window.DB && DB.sb); if (!sb) return;
      const cos = (window.Companies && Companies.list) || [];
      const svc = cos.filter(c => c && !c.deleted_at && c.er_i_thjonustu !== false);
      // customer_documents — skýrsla + reikningur ársins, lyklað á
      // fyrirtaeki_id (STAÐURINN). Sama join og Ársskoðun 187. Eldri
      // customer_base_id-uppfletting + „fyrsta skjal base-sins" lék
      // Center/Pizzan/Heimaleiga-systkini græn án eigin skýrslu.
      const ids = Array.from(new Set(svc.map(c => c.id).filter(v => v != null)));
      const byCo = new Map();   // coId -> {skyrsla, reik}
      // Ár-sía + blaðsíður (ekki 300-id IN): public_url er EKKI dálkur
      // (400 þagði niður alla skýrslulínu áður). Sama uppspretta og 187.
      const PAGE = 1000;
      for (let off = 0; off <= 20000; off += PAGE) {
        const r = await sb.from('customer_documents')
          .select('fyrirtaeki_id,doc_type,invoice_number,drive_file_id,storage_path,vidskiptategund')
          .eq('year', curYear)
          .in('doc_type', ['uttektarskyrsla', 'reikningur'])
          .not('fyrirtaeki_id', 'is', null)
          .range(off, off + PAGE - 1);
        const rows = r.data || [];
        rows.forEach(d => {
          if (d.doc_type === 'reikningur' && !isUttektInvoiceTeg(d.vidskiptategund)) return;
          const k = String(d.fyrirtaeki_id);
          if (!k || k === 'null' || k === 'undefined') return;
          let e = byCo.get(k); if (!e) { e = { skyrsla: null, reik: null }; byCo.set(k, e); }
          if (d.doc_type === 'reikningur') { if (!e.reik) e.reik = d; }
          else if (!e.skyrsla) e.skyrsla = d;
        });
        if (rows.length < PAGE) break;
      }
      _yearDocs = byCo;

      // Kröfu-yfirlit (166): krafa_sent_at / invoiced_at / dk_invoice_id á
      // solur.customer_id. Payday-taflan er kt-lykluð og má EKKI lita
      // fjölstaða-kt (Center 19.778 kr á Arnarhvoll var Skjaldbreið R-000670).
      const pm = new Map();
      const krafa = new Set();
      const yrStart = curYear + '-01-01';
      const yrEnd = (curYear + 1) + '-01-01';
      for (let i = 0; i < ids.length; i += 300) {
        const chunk = ids.slice(i, i + 300);
        const r = await sb.from('solur')
          .select('customer_id,num,samtals,paid_at,krafa_sent_at,invoiced_at,dk_invoice_id,created_at,vidskiptategund,status,is_credit')
          .in('customer_id', chunk).eq('greitt_med', 'reikningur')
          .gte('created_at', yrStart).lt('created_at', yrEnd);
        (r.data || []).forEach(s => {
          if (!s || s.customer_id == null) return;
          if (s.is_credit) return;
          const st = String(s.status || '').toLowerCase();
          if (st === 'void' || st === 'cancelled' || st === 'canceled' || st === 'credit') return;
          if (!isUttektInvoiceTeg(s.vidskiptategund)) return;
          const sent = !!(s.krafa_sent_at || s.invoiced_at || s.dk_invoice_id);
          const cid = String(s.customer_id);
          if (sent) krafa.add(cid);
          const row = {
            number: s.num, amount_total: s.samtals,
            status: s.paid_at ? 'paid' : (sent ? 'sent' : ''),
            paid_date: s.paid_at, created_date: s.created_at
          };
          if (sent || s.paid_at) pm.set(cid, pickBetterPd(pm.get(cid), row));
        });
      }
      _krafaCoIds = krafa;

      // Payday eftir kt AÐEINS þegar kt-in á einn þjónustustað (ótvírætt).
      const ktCount = new Map();
      svc.forEach(c => {
        const k = digits(c.kennitala);
        if (k.length >= 10 && k !== '9999999999') ktCount.set(k, (ktCount.get(k) || 0) + 1);
      });
      const uniqueKts = [];
      const ktToCo = new Map();
      svc.forEach(c => {
        const k = digits(c.kennitala);
        if ((ktCount.get(k) || 0) === 1) { uniqueKts.push(k); ktToCo.set(k, String(c.id)); }
      });
      for (let i = 0; i < uniqueKts.length; i += 300) {
        const chunk = uniqueKts.slice(i, i + 300);
        const r = await sb.from('payday_invoices_slokk')
          .select('kt,number,amount_total,status,paid_date,due_date,created_date')
          .in('kt', chunk);
        (r.data || []).forEach(p => {
          const yr = String(p.created_date || p.due_date || '').slice(0, 4);
          if (yr && +yr !== curYear) return;
          const coId = ktToCo.get(p.kt);
          if (coId == null || pm.has(coId)) return;   // solur á staðnum vinnur
          pm.set(coId, pickBetterPd(pm.get(coId), p));
        });
      }
      _pdByCo = pm;
    } catch (_) {}
    render();
  }
  // Greiðslustaða payday-raðar → { txt, paid } (rólegur litur á pillunni).
  function pdStatus(p) {
    const s = String((p && p.status) || '').toLowerCase();
    const paid = !!(p && p.paid_date) || /paid|greid|greitt/.test(s);
    return paid ? { txt: 'greitt', paid: true } : { txt: 'sendur', paid: false };
  }

  const SORTERS = {
    name:    (x, y) => String(x.nafn).localeCompare(y.nafn, 'is'),
    revenue: (x, y) => ((+y.tekjur || 0) - (+x.tekjur || 0)) || String(x.nafn).localeCompare(y.nafn, 'is'),
    marked:  (x, y) => ((+y.markedAt || 0) - (+x.markedAt || 0)) || String(x.nafn).localeCompare(y.nafn, 'is'),
  };
  // Collapsible hliðar-dálkar — collapsed by default ("collapse both of each side").
  let _openDagskra = false, _openBuid = false;

  // ── Brunastál C stílblað efri hlutans (26.09.2026) ─────────────────────────────────────────────────────────────
  function injectB190() {
    if (document.getElementById('_sv-b190')) return;
    const V = 'html body #' + VIEW_ID + '#' + VIEW_ID;
    const S = V + ' ';
    const MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif', DISPLAY = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    const K = {
      gull:   { f: 'linear-gradient(145deg,#3d2b05 0%,#d3ab4e 20%,#ffe9b0 35%,#a67f22 52%,#ffe9b0 68%,#d3ab4e 82%,#3d2b05 100%)', i: METAL, t: 'linear-gradient(90deg,#3d2b05,#ffe9b0 50%,#3d2b05)', h: 'radial-gradient(circle at 40% 35%,#fff3c4 0%,#f0a83c 45%,#7a4a08 100%)', g: '0 0 6px 1px rgba(240,168,60,.7)', led: '#e0a93e' },
      blatt:  { f: 'linear-gradient(145deg,#040d18 0%,#0b2440 25%,#2f7fc9 50%,#0b2440 75%,#040d18 100%)', i: 'linear-gradient(145deg,#050a12 0%,#0f1d33 26%,#162a47 50%,#0b1628 74%,#04080e 100%)', t: 'linear-gradient(90deg,#0b2440,#9fd0ff 50%,#0b2440)', h: 'radial-gradient(circle at 40% 35%,#d6e8ff 0%,#3b82f6 45%,#0a2350 100%)', g: '0 0 6px 1px rgba(59,130,246,.6)', led: '#5aa2ff' },
      rautt:  { f: 'linear-gradient(145deg,#0d0102 0%,#380506 18%,#6c0d10 38%,#971515 50%,#6c0d10 62%,#380506 82%,#0d0102 100%)', i: 'linear-gradient(145deg,#130506 0%,#331214 26%,#4a1a1d 50%,#240b0d 74%,#0e0405 100%)', t: 'linear-gradient(90deg,#380506,#ff9d95 50%,#380506)', h: 'radial-gradient(circle at 40% 35%,#ffd6d0 0%,#e25555 45%,#5a0a0a 100%)', g: '0 0 6px 1px rgba(226,85,85,.6)', led: '#f0584c' },
      graent: { f: 'linear-gradient(145deg,#010d05 0%,#0e5a2e 25%,#16783f 50%,#0e5a2e 75%,#010f06 100%)', i: 'linear-gradient(145deg,#06120a 0%,#132a1c 26%,#1b3a26 50%,#0e2216 74%,#050b07 100%)', t: 'linear-gradient(90deg,#06331a,#7fe0a8 50%,#06331a)', h: 'radial-gradient(circle at 40% 35%,#d8ffe6 0%,#23a35a 45%,#073a1d 100%)', g: '0 0 6px 1px rgba(35,163,90,.6)', led: '#3cc47c' }
    };
    const BAR = { bl: 'linear-gradient(180deg,#8fb8ff 0%,#2f5fb0 35%,#122a55 60%,#244a8a 100%)', ra: 'linear-gradient(180deg,#d97878 0%,#8a2020 35%,#4a0d0d 60%,#7a1a1a 100%)', gu: 'linear-gradient(180deg,#e2c67a 0%,#9c7c2c 35%,#5c4412 60%,#8c6c24 100%)', gr: 'linear-gradient(180deg,#63b88c 0%,#1f6f42 35%,#0c3d22 60%,#1a5a35 100%)' };
    const blek = c => c.replace(/(^|;)color:([^;!]+)(?=;|$)/g, '$1color:$2!important');
    const r = (sel, css) => sel.split(',').map(x => S + x.trim()).join(',') + '{' + blek(css) + '}';
    const out = [
      // síðan: kolið út í kanta, eins og Ársskoðun (416)
      V + '.view{background-color:#25272c!important;background-image:linear-gradient(180deg,#1d1f24 0%,#30333a 320px,#2a2c31 100%)!important}',
      r('.b190-sida', 'max-width:none;margin:0;width:100%;box-sizing:border-box;padding:6px 10px 34px;font-family:' + SANS),
      r('.b190-top', 'container-type:inline-size;container-name:b190;display:flex;flex-direction:column;gap:12px;margin:0 0 16px'),
      // haus
      r('.b190-haus', 'display:flex;align-items:flex-end;justify-content:space-between;gap:12px 16px;flex-wrap:wrap'),
      r('.b190-titill', 'min-width:0'),
      r('.b190-titill .yfir', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#a9b1bf'),
      r('.b190-titill h1', 'margin:2px 0 0;font-family:' + DISPLAY + '!important;font-size:28px!important;font-weight:800!important;line-height:1.05!important;letter-spacing:-.01em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
      r('.b190-titill .undir', 'font-family:' + MONO + ';font-size:11.5px;color:#c9d0da;margin-top:5px'),
      r('.b190-titill .undir b', 'color:#fff'),
      r('.b190-verk', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end'),
      r('.b190-verk .sv-empbtn', 'height:36px!important;padding:0 14px!important;border-radius:9px!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14)!important;color:#1f2530;font:600 13px ' + SANS + '!important'),
      r('.b190-verk .sv-seg', 'display:inline-flex;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;border-radius:9px!important;padding:3px!important;gap:3px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14)'),
      r('.b190-verk .sv-seg button', 'height:28px;padding:0 12px!important;border-radius:7px!important;font:600 12.5px ' + SANS + '!important;color:#3a4250;background:transparent!important;border:0!important;box-shadow:none!important;min-height:0!important'),
      r('.b190-verk .sv-seg button.on', 'background:' + METAL + '!important;color:#fff'),
      r('.b190-verk .sv-sort', 'height:36px!important;border-radius:9px!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;color:#1f2530;font:600 12.5px ' + SANS + '!important;padding:0 10px!important;min-height:0!important'),
      r('.b190-verk .sv-search', 'height:36px;width:170px;box-sizing:border-box;padding:0 12px;border-radius:9px;background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);color:#1f2530;font:400 13px ' + SANS + ';outline:none'),
      // spjöldin
      r('.b190-grid', 'display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:12px;align-items:stretch'),
      r('.b190-k', 'padding:2px;position:relative;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px));filter:drop-shadow(0 14px 24px rgba(10,14,22,.45));min-width:0;background-color:#0a0a0c'),
      r('.b190-i', 'position:relative;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));color:#fff;background-color:#0a0a0c;padding:14px 18px 14px;display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box;min-height:176px'),
      r('.b190-i::before', 'content:"";position:absolute;left:0;right:0;top:0;height:3px;pointer-events:none'),
      r('.b190-k .hn', 'position:absolute;width:6px;height:6px;border-radius:50%;z-index:1;pointer-events:none')
    ];
    Object.keys(K).forEach(c => {
      const k = K[c];
      out.push(r('.b190-k.' + c, 'background:' + k.f));
      out.push(r('.b190-k.' + c + ' > .b190-i', 'background-image:' + STRIPE + ',' + k.i));
      out.push(S + '.b190-k.' + c + ' > .b190-i::before{background:' + k.t + '}');
      out.push(r('.b190-k.' + c + ' .hn', 'background:' + k.h + ';box-shadow:' + k.g));
      out.push(r('.b190-k.' + c + ' .led', 'background:' + k.led + ';box-shadow:0 0 0 3px rgba(255,255,255,.08),0 0 10px ' + k.led));
    });
    out.push(
      r('.b190-m', 'display:flex;align-items:center;gap:9px;white-space:nowrap;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#d9dee6;min-width:0'),
      r('.b190-m .led', 'width:7px;height:7px;border-radius:50%;flex:none'),
      r('.b190-p', 'display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:3px;font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;flex:none'),
      r('.b190-p.ghost', 'background:transparent;border:1px solid rgba(255,255,255,.3);color:#e9edf3;margin-left:auto'),
      r('.b190-rod', 'display:flex;align-items:flex-end;gap:14px;min-width:0;flex-wrap:wrap'),
      r('.b190-t', 'font-family:' + DISPLAY + ';font-size:44px;font-weight:800;line-height:1;letter-spacing:-.02em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);white-space:nowrap'),
      r('.b190-t small', 'font-size:16px;font-weight:700;color:#d9dee6;margin-left:6px;letter-spacing:0'),
      r('.b190-t.gull', 'color:#f3d98a;text-shadow:0 0 18px rgba(230,190,90,.35),0 1px 0 rgba(0,0,0,.7)'),
      r('.b190-t.gull small', 'color:#d3ab4e'),
      r('.b190-s', 'height:9px;border-radius:5px;background:#131316;box-shadow:inset 0 1px 2px rgba(0,0,0,.7);display:flex;overflow:hidden;gap:2px;flex:none'),
      r('.b190-s.stor', 'height:12px;border-radius:4px'),
      r('.b190-s span', 'height:100%;display:block;box-shadow:inset 0 1px 0 rgba(255,255,255,.16)'),
      r('.b190-s .bl', 'background:' + BAR.bl), r('.b190-s .ra', 'background:' + BAR.ra), r('.b190-s .gu', 'background:' + BAR.gu), r('.b190-s .gr', 'background:' + BAR.gr),
      r('.b190-l', 'display:flex;flex-wrap:wrap;gap:6px 16px;font-family:' + MONO + ';font-size:11.5px;color:#d5dbe6;align-items:center;min-width:0;min-height:18px'),
      r('.b190-l.dalk', 'flex-direction:column;align-items:flex-start;gap:6px;padding-bottom:5px'),
      r('.b190-l i', 'width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:6px;vertical-align:-1px;border:1px solid rgba(0,0,0,.4)'),
      r('.b190-l i.bl', 'background:#2f5fb0'), r('.b190-l i.ra', 'background:#8a2020'), r('.b190-l i.gu', 'background:#9c7c2c'),
      r('.b190-l b', 'color:#fff;font-weight:700'), r('.b190-l small', 'color:#8e97a6;margin-left:5px;font-size:11px'),
      r('.b190-tikk', 'display:flex;flex-direction:column;gap:6px;min-height:60px'),
      r('.b190-tikk .r', 'display:grid;grid-template-columns:104px minmax(0,1fr) 30px;gap:8px;align-items:center;font-family:' + MONO + ';font-size:11px;color:#d5dbe6'),
      r('.b190-tikk .r b', 'color:#fff;text-align:right;font-weight:700'),
      r('.b190-tikk .bar', 'height:5px;border-radius:3px;background:#131316;box-shadow:inset 0 1px 2px rgba(0,0,0,.7)'),
      r('.b190-tikk .bar span', 'display:block;height:100%;border-radius:3px'),
      r('.b190-tikk .bar .bl', 'background:linear-gradient(90deg,#6aa0ff,#1c3f7a)'), r('.b190-tikk .bar .gu', 'background:linear-gradient(90deg,#d8b866,#7a5a18)'), r('.b190-tikk .bar .gr', 'background:linear-gradient(90deg,#4fc07f,#155a33)'),
      r('.b190-f4', 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px'),
      r('.b190-f', 'display:flex;flex-direction:column;justify-content:center;gap:2px;height:50px;box-sizing:border-box;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);min-width:0;overflow:hidden'),
      r('.b190-f .l', 'font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#a9b1bf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
      r('.b190-f .v', 'font-family:' + MONO + ';font-size:14px;font-weight:700;color:#fff;white-space:nowrap'),
      r('.b190-f .v small', 'font-size:10.5px;font-weight:400;color:#a9b1bf;margin-left:3px'),
      r('.b190-opna', 'margin-top:auto;align-self:flex-start;height:30px;padding:0 12px;border-radius:7px;background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.2);color:#1f2530;font:600 12px ' + SANS + ';cursor:pointer;min-height:0!important'),
      r('.b190-opna[aria-expanded="true"]', 'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#fff'),
      // skrefa-strimillinn
      r('.b190-strim', 'background:' + METAL + ';background-color:#0a0a0c;border:1px solid #000;border-radius:10px;padding:12px 16px 10px;display:flex;flex-direction:column;gap:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)'),
      r('.b190-strim .hd', 'min-height:17px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#e9cf85'),
      r('.b190-strim .hd .dl', 'width:7px;height:7px;background:#e0a93e;transform:rotate(45deg);display:inline-block;flex:none'),
      r('.b190-strim .hd .r', 'margin-left:auto;color:#d5dbe6;letter-spacing:.04em;text-transform:none;font-weight:400;font-size:11.5px;display:inline-flex;align-items:center;gap:8px'),
      r('.b190-strim .hd .r b', 'color:#fff;font-weight:700'),
      r('.b190-strim .sv-stepf-clear', 'height:24px;padding:0 10px;border-radius:6px;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;color:#1f2530;font:600 11.5px ' + SANS + '!important;cursor:pointer;min-height:0!important'),
      r('.b190-man', 'display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;align-items:end;height:92px'),
      r('.b190-man button', 'all:unset;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;height:100%;cursor:pointer;min-width:0;box-sizing:border-box'),
      r('.b190-man button i', 'display:block;width:100%;border-radius:3px 3px 0 0;background:linear-gradient(180deg,#7a8190 0%,#454a55 35%,#26292f 60%,#3a3f49 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.5);transition:filter .12s'),
      r('.b190-man button:hover i', 'filter:brightness(1.15)'),
      r('.b190-man button.on i', 'background:linear-gradient(180deg,#ffe9b0 0%,#d3ab4e 40%,#7a5608 60%,#a67f22 100%);box-shadow:0 0 12px rgba(230,190,90,.5),inset 0 1px 0 rgba(255,255,255,.5)'),
      r('.b190-man button.off i', 'background:' + BAR.ra + ';box-shadow:0 0 12px rgba(226,85,85,.45),inset 0 1px 0 rgba(255,255,255,.3)'),
      r('.b190-man button em', 'font-family:' + MONO + ';font-size:10px;font-weight:700;font-style:normal;color:#d5dbe6;letter-spacing:.04em;white-space:nowrap;line-height:15px;max-width:100%;overflow:hidden;text-overflow:ellipsis'),
      r('.b190-man button u', 'font-family:' + MONO + ';font-size:10px;color:#8e97a6;text-decoration:none;line-height:15px'),
      r('.b190-man button.on em,.b190-man button.on u', 'color:#f3d98a'),
      r('.b190-man button.off em,.b190-man button.off u', 'color:#ff9d95'),
      r('.b190-man button:focus-visible', 'outline:2px solid #f3d98a;outline-offset:2px;border-radius:3px'),
      // appmode (261 þvingar .view button/input: 17px letur, 12px fylling, 50px lágmark) — stjórntækin okkar halda sinni stærð
      r('.b190-opna,.b190-verk .sv-empbtn,.b190-verk .sv-seg button,.b190-verk .sv-sort,.b190-strim .sv-stepf-clear', 'min-height:0!important;line-height:1!important;padding-top:0!important;padding-bottom:0!important'),
      r('.b190-opna', 'height:30px!important;font-size:12px!important;padding:0 12px!important'),
      r('.b190-verk .sv-empbtn,.b190-verk .sv-sort', 'height:36px!important;font-size:13px!important'),
      r('.b190-verk .sv-seg button', 'height:28px!important;font-size:12.5px!important'),
      r('.b190-strim .sv-stepf-clear', 'height:24px!important;font-size:11.5px!important'),
      r('.b190-verk .sv-search', 'height:36px!important;min-height:0!important;font-size:13px!important;padding:0 12px!important;line-height:36px!important'),
      // listinn undir: hólfin halda sínu hvíta útliti; „Ekkert í vinnslu" og skúffurnar standa á kolinu
      r('.sv-drawer', 'margin-bottom:14px'),
      // mjórra hólf (appið, sími, þröngur gluggi): tveir dálkar, hetjan yfir báða — svo einn dálkur
      '@container b190 (max-width: 1000px){' + r('.b190-grid', 'grid-template-columns:1fr 1fr') + r('.b190-k.gull,.b190-k.blatt', 'grid-column:1 / -1') + r('.b190-haus', 'align-items:flex-start') + r('.b190-verk', 'justify-content:flex-start') + '}',
      '@container b190 (max-width: 540px){' + r('.b190-grid', 'grid-template-columns:1fr') + r('.b190-f4', 'grid-template-columns:1fr 1fr') + r('.b190-f', 'height:46px') + r('.b190-verk .sv-search', 'flex:1;width:auto;min-width:140px') + r('.b190-man em', 'font-size:9px') + '}'
    );
    const st = document.createElement('style');
    st.id = '_sv-b190';
    st.textContent = out.join('\n');
    document.head.appendChild(st);
  }

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
        '#' + VIEW_ID + ' h1{font-family:"Playfair Display",Georgia,serif;letter-spacing:-.01em;color:#11141c}',
        // Card surface (the wrapper card for each Í-vinnslu row)
        '#' + VIEW_ID + ' .sv-card{background:#fff!important;border:1px solid rgba(20,24,34,.08)!important;border-left:3px solid #2f5fe0!important;border-radius:16px!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)!important;padding:18px 20px!important}',
        '#' + VIEW_ID + ' .sv-card.haett{border-left-color:#c0241f!important}',
        // Segmented mode-switch (Listi / Breitt / Spjöld) — metallic black pill (filter-chip style)
        '#' + VIEW_ID + ' .sv-seg{background:#fff;border:1px solid rgba(20,24,34,.14);border-radius:11px;padding:3px;gap:3px;box-shadow:0 1px 2px rgba(0,0,0,.04)}',
        '#' + VIEW_ID + ' .sv-seg button{font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;font-size:13px;font-weight:600;color:#3a4250;padding:7px 14px;border-radius:9px;cursor:pointer;background:transparent;border:0}',
        '#' + VIEW_ID + ' .sv-seg button.on{background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.18)}',
        // Tinted stat chips (Í vinnslu blue, Á dagskrá amber, Búið green) matching spec
        '#' + VIEW_ID + ' .sv-chip{font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;font-size:13px;font-weight:600;padding:8px 16px;border-radius:11px;border:1px solid rgba(20,24,34,.14);background:#fff;color:#3a4250;cursor:pointer;display:inline-flex;align-items:center;gap:8px}',
        '#' + VIEW_ID + ' .sv-chip .n{font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:700;color:inherit}',
      // Skref-sía (2026-07-30) — sömu rólegu litir og chip-röðin fyrir ofan;
      // virk sía fær dökka fyllingu (búið) eða gulbrúna (vantar) svo sjáist
      // í einu augnkasti að listinn sé síaður.
      '#' + VIEW_ID + ' .sv-stepf{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:0 2px 16px}',
      '#' + VIEW_ID + ' .sv-stepf-lbl{font-size:12px;color:#8a93a5;font-weight:600}',
      '#' + VIEW_ID + ' .sv-stepf-chip{font-family:inherit;font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:99px;border:1px solid rgba(20,24,34,.14);background:#fff;color:#3a4250;cursor:pointer;display:inline-flex;align-items:center;gap:6px}',
      '#' + VIEW_ID + ' .sv-stepf-chip .n{font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:700;opacity:.65}',
      '#' + VIEW_ID + ' .sv-stepf-chip:hover{border-color:#94a3b8}',
      '#' + VIEW_ID + ' .sv-stepf-chip.on{background:linear-gradient(150deg,#2bbf6c,#0f6e3a);border-color:#0f6e3a;color:#fff}',
      '#' + VIEW_ID + ' .sv-stepf-chip.on .n{opacity:.85}',
      '#' + VIEW_ID + ' .sv-stepf-chip.off{background:#fdf6e7;border-color:#e3d8c1;color:#836a38}',
      '#' + VIEW_ID + ' .sv-stepf-clear{font-family:inherit;font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:99px;border:1px solid rgba(20,24,34,.14);background:#f6f8fb;color:#5b6472;cursor:pointer}',
        // Sort select — pill style
        '#' + VIEW_ID + ' .sv-sort{height:36px;border:1px solid rgba(20,24,34,.14)!important;border-radius:11px!important;background:#fff!important;color:#3a4250!important;font-weight:600!important;font-size:12.5px!important;cursor:pointer}',
        // Drawer (Á dagskrá / Búið expanded list)
        '#' + VIEW_ID + ' .sv-drawer{background:#fff!important;border:1px solid rgba(20,24,34,.08)!important;border-radius:14px!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)!important}',
        '#' + VIEW_ID + ' .sv-drawer-row{border-bottom:1px solid rgba(20,24,34,.06)!important;font-size:13.5px;color:#3a4250}',
        '#' + VIEW_ID + ' .sv-drawer-row .nm{font-weight:600!important;color:#11141c!important}',
        '#' + VIEW_ID + ' .sv-drawer-row .mn{font-family:"JetBrains Mono",ui-monospace,monospace!important;color:#9098a6!important}',
        // Stepper — green check filled when ON
        '#' + VIEW_ID + ' .sv-steps{background:#f8fafc;border:1px solid rgba(20,24,34,.06);border-radius:12px;padding:14px 16px}',
        '#' + VIEW_ID + ' .sv-step .nd{width:24px!important;height:24px!important;border:2px solid #cbd5e1!important;color:#64748b!important;font-size:11px!important}',
        '#' + VIEW_ID + ' .sv-step.on .nd{background:linear-gradient(150deg,#2bbf6c,#0f6e3a)!important;border-color:#0f6e3a!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}',
        '#' + VIEW_ID + ' .sv-step .lb{font-size:11px!important;font-weight:600!important;color:#64748b!important;text-transform:none!important;letter-spacing:0!important}',
        '#' + VIEW_ID + ' .sv-step.on .lb{color:#0f6e3a!important}',
        '#' + VIEW_ID + ' .sv-step.on .ln{background:#2bbf6c!important}',
        // Marks (Hætt / Eftir að uppfæra / Reikningur áður)
        '#' + VIEW_ID + ' .sv-mark{font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:8px;border:1px solid rgba(20,24,34,.14);background:#f6f8fb;color:#5b6472;cursor:pointer;white-space:nowrap}',
        // Note textarea
        '#' + VIEW_ID + ' .sv-note{background:#f6f8fb!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:11px!important;padding:11px 13px!important;color:#141822!important;font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif!important;font-size:13px!important;line-height:1.45!important}',
        '#' + VIEW_ID + ' .sv-note:focus{outline:none!important;border-color:#2f5fe0!important;background:#fff!important;box-shadow:0 0 0 3px rgba(47,95,224,.12)!important}',
        // Action row
        '#' + VIEW_ID + ' .sv-acts{border-top:0!important;padding-top:0!important;gap:8px!important}',
        '#' + VIEW_ID + ' .sv-acts ._sv-act{height:36px!important;padding:0 13px!important;border-radius:10px!important;border:1px solid rgba(20,24,34,.14)!important;background:#f1f5f9!important;color:#3a4250!important;font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif!important;font-size:12.5px!important;font-weight:600!important;cursor:pointer!important}',
        '#' + VIEW_ID + ' .sv-acts ._sv-act[data-act="buid"]{border:1px solid #156e3a!important;background:linear-gradient(150deg,#2bbf6c,#0f6e3a)!important;color:#fff!important;font-weight:700!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)!important}',
        '#' + VIEW_ID + ' .sv-acts ._sv-act[data-act="unstart"]{border:1px solid #f3c6c4!important;background:#fdecec!important;color:#c0241f!important}',
        '#' + VIEW_ID + ' .sv-acts ._sv-act[data-act="report"]{background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)!important;border-color:#0a0b0d!important;color:#fff!important}',
        // Wide-mode right pane — make action stack tidy
        '#' + VIEW_ID + ' .sv-wide-r{gap:9px!important}',
        // Wide-mode stepper — full-label nodes in a grey strip (comp: ThjonustuVerkstaedi wide)
        '#' + VIEW_ID + ' .sv-stepsw{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#f6f8fb;border:1px solid rgba(20,24,34,.06);border-radius:12px;padding:13px 18px}',
        '#' + VIEW_ID + ' .sv-stepw{display:inline-flex;align-items:center;gap:8px;background:none;border:0;padding:0;cursor:pointer;font:inherit}',
        // Stimpill: hver setti skrefið og hvenær — undir merkimiðanum.
        '#' + VIEW_ID + ' .sv-stepw .lb{display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1.2}',
        '#' + VIEW_ID + ' .sv-stamp{font-size:9.5px;font-weight:700;color:#2563eb;letter-spacing:.01em;white-space:nowrap}',
        '#' + VIEW_ID + ' .sv-empbtn{height:30px;padding:0 12px;border-radius:99px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.12);color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}',
        '#' + VIEW_ID + ' .sv-stepw .nd{width:26px;height:26px;border-radius:50%;border:2px solid #cbd5e1;background:#fff;color:#94a3b8;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;box-sizing:border-box}',
        '#' + VIEW_ID + ' .sv-stepw.on .nd{background:linear-gradient(150deg,#2bbf6c,#0f6e3a);border-color:#0f6e3a;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}',
        '#' + VIEW_ID + ' .sv-stepw .lb{font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;font-size:12.5px;font-weight:600;color:#5b6472;white-space:nowrap}',
        '#' + VIEW_ID + ' .sv-stepw.on .lb{color:#0f6e3a;font-weight:700}',
        '#' + VIEW_ID + ' .sv-lnw{flex:1;min-width:12px;max-width:46px;height:3px;border-radius:2px;background:#dbe1ea}',
        '#' + VIEW_ID + ' .sv-lnw.on{background:#2bbf6c}',
        // Wide-mode right column — big note, 3-button row, full-width Afmerkja below
        '#' + VIEW_ID + ' .sv-wide-r{flex:0 0 340px!important}',
        '#' + VIEW_ID + ' .sv-wide-r .sv-note{min-height:86px!important}',
        '#' + VIEW_ID + ' .sv-actsw{display:flex!important;gap:8px!important;flex-wrap:nowrap!important;border-top:0!important;padding-top:0!important}',
        '#' + VIEW_ID + ' .sv-actsw ._sv-act{flex:1;height:42px!important;white-space:nowrap}',
        '#' + VIEW_ID + ' .sv-actsw ._sv-act[data-act="report"]{background:#f1f5f9!important;border-color:rgba(20,24,34,.14)!important;color:#3a4250!important}',
        '#' + VIEW_ID + ' .sv-unmarkw{width:100%;height:38px;border:1px solid #f3c6c4!important;background:#fdf1f1!important;color:#c0241f!important;border-radius:10px!important;font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif!important;font-size:12.5px!important;font-weight:700!important;cursor:pointer}',
        // Numbers in mono
        '#' + VIEW_ID + ' [data-mono],#' + VIEW_ID + ' .sv-kt{font-family:"JetBrains Mono",ui-monospace,monospace}'
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
      '#' + VIEW_ID + ' .sv-acts{display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--brd);padding-top:9px}',
      // Síma-úttekt 2026-07-30 (mælt á 390 px): 810 snertifletir undir 44 px og
      // 866 textar undir 16 px á þessari síðu — verst .sv-step (115×40) og
      // .sv-mark (61×40). Á ≤900 px fá stjórntökurnar 44 px lágmark og 15 px
      // texta; skjáborðið heldur þéttleikanum óbreyttum.
      '@media(max-width:900px){'+
        '#' + VIEW_ID + ' ._sv-step,'+
        '#' + VIEW_ID + ' .sv-step{min-height:44px}'+
        '#' + VIEW_ID + ' .sv-mark{min-height:44px;display:inline-flex;align-items:center;font-size:15px;padding:8px 14px}'+
        '#' + VIEW_ID + ' .sv-acts ._sv-act{min-height:44px;height:auto!important;font-size:15px!important;padding:8px 16px!important}'+
        '#' + VIEW_ID + ' .sv-step .lb{font-size:15px}'+
      '}',
      // Skjala-lína ársins (📄 Skýrsla · ✉️ Senda · 🧾 R-nr · payday-pilla) — rólegir litir
      '#' + VIEW_ID + ' .sv-docsline{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:1px 0}',
      '#' + VIEW_ID + ' .sv-doclink{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:8px;border:1px solid var(--brd);background:var(--bg);color:var(--ink2);text-decoration:none;cursor:pointer;font-family:inherit}',
      '#' + VIEW_ID + ' .sv-doclink:hover{border-color:#94a3b8;color:var(--ink1)}',
      '#' + VIEW_ID + ' .sv-doclink.reik{color:#4f5d76}',
      '#' + VIEW_ID + ' .sv-doclink.send{background:#eef3ec;border-color:#cfe0cb;color:#3f6b3a}',
      '#' + VIEW_ID + ' .sv-docmuted{font-size:11px;color:var(--ink4);font-style:italic}',
      '#' + VIEW_ID + ' .sv-pdpill{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;font-weight:700;padding:3px 9px;border-radius:7px;border:1px solid #d9c7b0;background:#f5efe1;color:#7a5f2a}',
      '#' + VIEW_ID + ' .sv-pdpill.paid{border-color:#c3ddc7;background:#eef6ef;color:#3f6b3a}'
    ].join('');
    document.head.appendChild(s);
  }

  // Einingar + áætlaðar tekjur per fyrirtæki — sama lifandi útreikningur og
  // Fyrirtæki í Þjónustu notar (patch 153: uttaeki × yfirferð + skýrslugerð +
  // akstur, m. vsk). Hlaðið einu sinni þegar viewið opnast.
  let _arsLoadKicked = false;
  let _arsWaitTries = 0;
  // ⚠️ Hleðsluröð patch-anna er ekki tryggð: sé 153 (Arsskodun) ekki kominn þegar
  // viewið opnast skilaði þetta fall áður ÞÖGULT og var aldrei kallað aftur —
  // `ensureArsData()` er bara kallað í open(). Afleiðing: `r.tekjur` verður 0 á
  // öllum spjöldum, `vinnslaSum` verður 0, og peningaboxið sýnir „—" í stað
  // upphæðar. Það lítur út eins og gögnin séu horfin þótt þau séu í fínu lagi.
  // Bíðum því eftir 153 í stað þess að gefast upp (0,3 s × 20 ≈ 6 s þak).
  function ensureArsData() {
    if (_arsLoadKicked) return;
    if (!(window.Arsskodun && Arsskodun.loadAll)) {
      if (_arsWaitTries++ < 20) setTimeout(ensureArsData, 300);
      return;
    }
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
    const out = { dagskra: [], vinnsla: [], buid: [], serviceTotal: 0 };
    _reikCoIds = new Set();
    cos.forEach(co => {
      if (!co || co.deleted_at) return;
      if (co.er_i_thjonustu === false) return;          // only service companies
      out.serviceTotal++;                                // heildar-þjónustufjöldi (yfirlitsband)
      const a = map[String(co.id)] || {};
      const ly = +a.last_year_inspected || 0;
      const fy = +a.field_inspected_year || 0;
      const m  = +a.inspect_month || 0;
      const info = arsInfo(co.id);
      // A saved (óklárað) report in the cloud (patch 227/228) = work in progress.
      const hasDraft = !!(window.SavedReports && SavedReports.has && SavedReports.has(co.id));
      const docs = _yearDocs ? (_yearDocs.get(String(co.id)) || null) : null;
      const hasSkyrsla = !!(docs && docs.skyrsla);
      const hasReikDoc = _reikStadir.has(co.id) || !!(docs && docs.reik);   // staður, ekki kt
      const hasKrafa = _krafaCoIds.has(String(co.id));
      const hasReik = hasReikDoc || hasKrafa;
      if (hasReik) _reikCoIds.add(co.id);
      const card = {
        id: co.id, nafn: co.nafn || ('#' + co.id), kennitala: co.kennitala || '',
        month: m, aminning: (a.aminning || '').trim(),
        steps: effSteps(a, hasReik, hasSkyrsla),   // 153-staða + eigin skýrsla/reikningur/krafa
        stepsMeta: a[STEPS_META_KEY] || {},   // hver setti hvaða skref og hvenær
        mark: a.sv_mark || '',          // bráðabirgða-merking (single-select)
        // 24.09.2026 (Agnar: „sync these three text boxes together ... saved and
        // connectable to all devices"): minnispunkturinn hér, ✍ Athugasemd á
        // fyrirtækjasíðunni og Ferðanótan í Ársskoðun voru þrír aðskildir reitir.
        // Nú er EINN: fyrirtaeki.banner_note (alvöru dálkur, ekki stillinga-blobb),
        // og gagnagrunns-vörður heldur plan_note í takt. Gamli sv_note er ekki
        // lengur lesinn — gildin fjögur sem í honum voru fóru inn í banner_note.
        note: co.banner_note || '',
        markedAt: +a.sv_mark_at || 0,   // hvenær síðast merkt (fyrir "Nýlega merkt" röðun)
        units: +info._unit_count || 0,
        tekjur: +info.estimated_yearly || 0,
        hasDraft: hasDraft,
        doneDocs: hasFullDocs(co.id),  // already has skýrsla + reikningur for the year
        reik2026: hasReikDoc,   // customer_documents á ÞESSUM stað — ekki kt-payday
        netfang: co.netfang || '',   // fyrir ✉️ senda-glugga
        docs: docs,   // {skyrsla,reik} ársins, fyrirtaeki_id
        pd: _pdByCo ? (_pdByCo.get(String(co.id)) || null) : null   // krafa ársins á þessum stað
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
    if (!window.AppSettings || !AppSettings.save) { toast('Engar stillingar'); return false; }
    // ÞRÖNGUR patch: EITT fyrirtæki. Gamla heil-vörpu-skrifið setti stöðu allra
    // hinna aftur í það sem ÞESSI flipi las síðast. `_delete` er fellt burt —
    // deepMerge getur aldrei fjarlægt lykil, svo það var alltaf núll-verk (og
    // enginn kallandi sendir það; sjá athugasemdina hér fyrir neðan).
    const p = Object.assign({}, patch);
    delete p._delete;
    // 17.09.2026 (Agnar: „takkinn gerir ekki það sem hann segist gera"):
    // AppSettings.save skilar true/false — gildinu var hent. Mistækist skrifið
    // sagði borðið samt „Fært í Búið í ár" og kortið hoppaði; við endurhleðslu
    // var allt óbreytt og úttektin taldist óunnin. Þetta er rót fjölskyldunnar:
    // markBuid, startVinnsla, reopen og unVinnsla fara öll hér í gegn.
    let ok = false;
    try { ok = await AppSettings.save({ [KEY]: { [String(coId)]: p } }); }
    catch (e) { ok = false; console.warn('[190] setFlag', e); }
    if (!ok) {
      // 17.09.2026 — LEIÐRÉTT samdægurs. Fyrri útgáfa sagði „Reyndu aftur".
      // Það var rangt ráð: AppSettings.save ER saveVordud (85:460) sem setur
      // skrifið í biðröð, varar sjálf við og reynir á 20 sek fresti. Hér má
      // aðeins segja hvað er ÓSTAÐFEST — ekki biðja um endurtekningu og ekki
      // endurtaka aðvörunina sem notandinn fékk þegar.
      toast('⏳ Staðan er ekki staðfest á þjóninum enn — hún er í biðröð. Kortið uppfærist þegar hún kemst inn.');
      try { if (window.logProblem) window.logProblem('thjonustu_setflag_failed', 'co:' + coId); } catch (_) {}
    }
    if (!(opts && opts.silent)) render();   // note edits save silently (keep focus)
    return ok;
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

  // 2026-07-30 (ósk Agnars): „📁 Opna" á að fara BEINT á ársskoðunar-síðuna —
  // fyrirtækjasíðuna með tækjalistanum (224), UPPLÝSINGAR UM ÚTTEKT og
  // REIKNINGUR-spjaldinu — því það er þar sem úttektin er unnin. Áður fór hún á
  // VidskDetail-milliskrefið (158) og maður þurfti að smella á „Opna
  // fyrirtækisíðu →" til viðbótar. `_openCompanySafe` (mapfix.js) er notað því
  // það skiptir um view OG bíður eftir Companies.load() — beint
  // `Companies.openDetail` á óhlöðnum lista skilar auðri síðu.
  function openCompany(id) {
    if (window._openCompanySafe) return window._openCompanySafe(id);
    if (window.Companies && Companies.openDetail) return Companies.openDetail(id);
    if (window.VidskDetail && VidskDetail.show) return VidskDetail.show(id);
  }
  function openReport(id) { if (window.CompanyInspectionReport && CompanyInspectionReport.open) return CompanyInspectionReport.open(id); if (window.VisitReport && VisitReport.open) return VisitReport.open(id); openCompany(id); }

  // ✉️ Senda úttektarskýrslu ársins í tölvupósti. Endurnýtir ReceiptSender
  // (patch 254): compose-gluggi (forfyllt netfang, ALLTAF breytanlegt/leyfð
  // vistun) + gmail-send sem sækir skjalið server-megin (public_url eða driveId).
  // ReceiptSender.buildInvoiceBlob teiknar AÐEINS reikninga, svo skýrslan er send
  // sem núverandi customer_documents-skrá (URL/Drive-id) — ekki endurteiknuð.
  function sendSkyrsla(id) {
    const docs = _yearDocs && _yearDocs.get(String(id));
    const d = docs && docs.skyrsla;
    if (!d) { toast('Engin úttektarskýrsla ' + curYear + ' fannst'); return; }
    const co = ((window.Companies && Companies.list) || []).find(c => String(c.id) === String(id)) || {};
    const nafn = co.nafn || ('#' + id);
    const filename = (nafn.replace(/\s+/g, ' ').trim() + ' - úttektarskýrsla ' + curYear + '.pdf');
    if (window.ReceiptSender && ReceiptSender.sendDoc) {
      ReceiptSender.sendDoc({
        kind: 'skyrsla', filename: filename,
        url: docUrl(d) || undefined,
        driveId: (!docUrl(d) && d.drive_file_id) ? d.drive_file_id : undefined,
        to: co.netfang || '', nafn: nafn, ar: curYear
      });
      return;
    }
    // Fallback — opna skjalið + tilkynning (ekkert sendikerfi til staðar).
    const u = docUrl(d);
    if (u) window.open(u, '_blank');
    toast('Sendikerfi ekki tiltækt — opnaði skýrsluna');
  }

  function btn(bg, tx, bd) { return 'padding:6px 10px;border:1px solid ' + bd + ';border-radius:8px;background:' + bg + ';color:' + tx + ';font-size:11.5px;font-weight:700;cursor:pointer'; }

  // ── Shared card pieces (used by both list + cards mode) ──────────────────
  function metaChips(r) {
    const draftChip = r.hasDraft ? '<span title="Óklárað úttekt vistuð — heldur áfram á fyrirtækjasíðunni" style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:7px;background:#fffbeb;color:#b45309;border:1px solid #fde68a;white-space:nowrap">📝 óklárað vistað</span>' : '';
    if (!(r.units > 0 || r.tekjur > 0 || draftChip)) return '';
    return '<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">' +
      draftChip +
      (r.units > 0 ? '<span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:7px;background:#eef1f6;color:#475569;border:1px solid #cbd5e1;white-space:nowrap">🧯 ' + r.units + ' einingar</span>' : '') +
      (r.tekjur > 0 ? '<span style="font-family:\'JetBrains Mono\',ui-monospace,monospace;font-size:12px;font-weight:700;color:#11141c;align-self:center" title="Áætlaðar tekjur: yfirferðir + skýrslugerð + akstur, m. vsk">áætl. ' + fmtKr(r.tekjur) + '</span>' : '') +
      '</div>';
  }
  // Skjala-lína ársins: 📄 Skýrsla-hlekkur + ✉️ Senda · 🧾 R-nr-hlekkur +
  // upphæð/greiðslustaða (payday). Rólegir litir, birtist á hverri röð.
  function docsLine(r) {
    const parts = [];
    const sk = r.docs && r.docs.skyrsla;
    if (sk) {
      const u = docUrl(sk);
      if (u) parts.push('<a href="' + esc(u) + '" target="_blank" rel="noopener" class="sv-doclink" title="Opna úttektarskýrslu ' + curYear + '">📄 Skýrsla ' + curYear + '</a>');
      parts.push('<button class="_sv-send sv-doclink send" data-id="' + r.id + '" title="Senda úttektarskýrslu í tölvupósti">✉️ Senda</button>');
    } else {
      parts.push('<span class="sv-docmuted">engin skýrsla ' + curYear + '</span>');
    }
    const re = r.docs && r.docs.reik;
    if (re) {
      const u = docUrl(re);
      const rnr = re.invoice_number ? esc(re.invoice_number) : ('Reikningur ' + curYear);
      parts.push(u
        ? '<a href="' + esc(u) + '" target="_blank" rel="noopener" class="sv-doclink reik" title="Opna reikning">🧾 ' + rnr + '</a>'
        : '<span class="sv-doclink reik">🧾 ' + rnr + '</span>');
    }
    if (r.pd) {
      const st = pdStatus(r.pd);
      const amt = fmtKr(r.pd.amount_total);
      parts.push('<span class="sv-pdpill' + (st.paid ? ' paid' : '') + '" title="Krafa ' + curYear + ' á þessum stað">' + (amt ? amt + ' · ' : '') + esc(st.txt) + '</span>');
    }
    if (!parts.length) return '';
    return '<div class="sv-docsline">' + parts.join('') + '</div>';
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
        // Stimpillinn (hver · hvenær) undir merkimiðanum — svo starfsmaður sjái
        // strax að einhver annar er kominn í þessa skýrslu.
        const st = stampText((r.stepsMeta || {})[k]);
        return (i > 0 ? '<span class="sv-lnw' + (prevOn ? ' on' : '') + '"></span>' : '') +
          '<button class="_sv-step sv-stepw' + (on ? ' on' : '') + '" data-id="' + r.id + '" data-step="' + k + '" title="' + esc(full) + (st ? ' — ' + esc(st) : '') + (on ? ' — smelltu til að afhaka' : '') + '">' +
          '<span class="nd">' + (on ? '✓' : '') + '</span>' +
          '<span class="lb">' + esc(full) +
            (st ? '<span class="sv-stamp">' + esc(st) + '</span>' : '') +
          '</span></button>';
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
      (r.kennitala ? '<div style="font-family:\'JetBrains Mono\',ui-monospace,monospace;font-size:11px;color:#9098a6;margin-top:1px">kt. ' + esc(fmtKt(r.kennitala)) + '</div>' : '') + '</div>';
  }
  // Sama hreinsun og Ársskoðun notar (153) — innflutningurinn tvítók sumar
  // áminningar með „---"-skiltingu og án þessa sæist afritið hér áfram.
  // Fallback: hrár texti ef 153 hefur ekki hlaðist (röðin tryggir að hann geri það).
  function cleanAmin(s) {
    try { if (window.Arsskodun && Arsskodun.cleanAminning) return Arsskodun.cleanAminning(s); } catch (_) {}
    return String(s == null ? '' : s);
  }
  function aminningLine(r, n) {
    const a = cleanAmin(r.aminning);
    return a ? '<div style="font-size:10.5px;color:#b45309">📌 ' + esc(a.slice(0, n || 80)) + '</div>' : '';
  }
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
      docAlert(r) + reikAlert(r) + nameBlock(r, false) + metaChips(r) + docsLine(r) + aminningLine(r) + stepPills(r) + marks(r) + note(r) + vinnslaActs(r) + '</div>';
  }
  // Í-vinnslu kort — cards mode (nýi stíllinn með stiku)
  function gridCard(r) {
    return '<div class="sv-card' + (r.mark === 'haett' ? ' haett' : '') + '">' +
      docAlert(r) + reikAlert(r) +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' + nameBlock(r, true) + metaChips(r) + '</div>' +
      docsLine(r) + stepper(r) + marks(r) + note(r) + aminningLine(r, 90) + vinnslaActs(r) + '</div>';
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
        docsLine(r) +
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
    // once (þegar Companies.list er komið) → sækir árs-skjöl + payday, endurteiknar
    if (!_yearDocsLoaded && (window.Companies && Companies.list && Companies.list.length)) { _yearDocsLoaded = true; loadYearDocs(); }
    const b = buckets();
    b.vinnsla.sort(SORTERS[_sort] || SORTERS.name);   // röðun valin af notanda
    // Skref-sían gildir á ÖLL þrjú hólfin svo talan á pillunni og listinn segi
    // það sama. Margar síur = OG (öll skilyrðin þurfa að standast).
    const stepKeys = Object.keys(_stepF);
    const vinnslaAlls = b.vinnsla.length;
    // Talan á hverjum síu-hnappi á ALLTAF að miðast við óhreyft þýði — annars
    // rýrnuðu tölurnar við hverja síu og hnappurinn gæti aldrei sagt satt um
    // hvað liggur að baki honum.
    const _allRaw = b.dagskra.concat(b.vinnsla, b.buid);
    if (stepKeys.length) {
      const pass = r => stepKeys.every(k => (_stepF[k] === 'on' ? !!r.steps[k] : !r.steps[k]));
      b.vinnsla = b.vinnsla.filter(pass);
      b.dagskra = b.dagskra.filter(pass);
      b.buid    = b.buid.filter(pass);
    }
    if (_search) {
      const match = r => String(r.nafn || '').toLowerCase().includes(_search);
      b.vinnsla = b.vinnsla.filter(match);
    }
    const fmtSum = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' m.kr.' : (n > 0 ? Math.round(n / 1000) + ' þ.kr.' : '');
    const vinnslaSum = b.vinnsla.reduce((s, r) => s + (+r.tekjur || 0), 0);
    // Yfirlitsband ársins — reiknað úr sömu gögnum og þegar eru hlaðin (skref +
    // customer_documents): N í þjónustu · úttekt búin · skýrsla send · reikn. sendur.
    const _all = b.dagskra.concat(b.vinnsla, b.buid);
    const ovN     = b.serviceTotal || _all.length;
    const ovUttekt = _all.filter(r => r.steps.uttekt).length;
    const ovSend   = _all.filter(r => r.steps.send || (r.docs && r.docs.skyrsla)).length;
    const ovReik   = _all.filter(r => r.steps.reikningur || r.reik2026 || (r.docs && r.docs.reik)).length;
    // Peningaboxið og tölu-flísarnar (2026-07-28) eru nú í gull-spjaldinu efst (26.09.2026, Brunastál C).
    const dagskraSum = b.dagskra.reduce((s, r) => s + (+r.tekjur || 0), 0);

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

    // ── Efri hlutinn í Brunastáli C (26.09.2026, Agnar: „endurskipulagt þjónustuverk aðeins · sérstaklega efri hlutann") ──
    // Sama útlit og Ársskoðun (414): haus með Playfair-titli, fjögur stálspjöld með skornum hornum og hnoðum (gull
    // Áætlað virði · blátt Í vinnslu · dökkrautt Á dagskrá · grænt Búin í ár) og skrefa-strimill með dökkmálms-súlum í
    // stað síuflísanna. SÖMU hnappar og hlustanir og áður (data-mode, data-toggle, data-stepf, .sv-sort, .sv-search,
    // ._sv-emp, .sv-stepf-clear) — aðeins umgjörðin er ný. Spjöldin raðast eftir breidd hólfsins (container query), svo
    // sama markup virkar á 1900 px skjá og í appinu á síma.
    injectB190();
    const pctOf = (a, t) => (t > 0 ? Math.max(0, Math.min(100, a / t * 100)) : 0).toFixed(1) + '%';
    const krUnit = n => n >= 1e6 ? [(n / 1e6).toFixed(1).replace('.', ','), 'm.kr'] : (n > 0 ? [String(Math.round(n / 1000)), 'þ.kr'] : ['—', '']);
    const HN = '<span class="hn" style="top:9px;left:9px" aria-hidden="true"></span><span class="hn" style="top:9px;right:26px" aria-hidden="true"></span><span class="hn" style="bottom:9px;left:26px" aria-hidden="true"></span><span class="hn" style="bottom:9px;right:9px" aria-hidden="true"></span>';
    const vn = b.vinnsla.length, dn = b.dagskra.length, bn = b.buid.length;
    const vCnt = k => b.vinnsla.filter(r => r.steps && r.steps[k]).length;
    const tikk = (lbl, n, tot, cls) => '<div class="r"><span>' + esc(lbl) + '</span><div class="bar"><span class="' + cls + '" style="width:' + pctOf(n, tot) + '"></span></div><b>' + n + '</b></div>';
    const flis = (lbl, val, sm) => '<div class="b190-f"><span class="l">' + esc(lbl) + '</span><span class="v">' + val + (sm ? '<small>' + esc(sm) + '</small>' : '') + '</span></div>';
    const [vNum, vUnit] = krUnit(vinnslaSum);
    const vUttektSum = b.vinnsla.filter(r => r.steps && r.steps.uttekt).reduce((t, r) => t + (+r.tekjur || 0), 0);
    const dSum = fmtSum(dagskraSum) || '—';
    const totAll = _allRaw.length;
    const skrefSulur = STEP_DEFS.map(([k, lbl, short]) => {
      const st = _stepF[k] || '';
      const n = _allRaw.filter(r => (st === 'off' ? !r.steps[k] : !!r.steps[k])).length;
      const h = Math.max(6, Math.round(n / Math.max(1, totAll) * 52));
      return '<button type="button" class="' + st + '" data-stepf="' + k + '" aria-pressed="' + (st ? 'true' : 'false') + '" ' +
        'title="' + esc(lbl) + ' — smelltu: ✓ búið → ⧗ vantar → af">' +
        '<i style="height:' + h + 'px"></i><em>' + (st === 'off' ? '⧗ ' : (st === 'on' ? '✓ ' : '')) + esc(short) + '</em><u>' + n + '</u></button>';
    }).join('');
    const opna = (key, open) => '<button type="button" class="b190-opna" data-toggle="' + key + '" aria-expanded="' + (open ? 'true' : 'false') + '">' + (open ? 'Fela listann ▾' : 'Sýna listann ▸') + '</button>';
    // leitin heldur fókus og bendli yfir endurteikninguna (setSearch teiknar allt upp á nýtt við hvern staf)
    const _ae = document.activeElement;
    const _leitFokus = (_ae && _ae.classList && _ae.classList.contains('sv-search') && v.contains(_ae)) ? [_ae.selectionStart, _ae.selectionEnd] : null;
    v.innerHTML = '<div class="b190-sida">' +
      '<div class="b190-top" data-s409-skip="1">' +
        '<div class="b190-haus">' +
          '<div class="b190-titill">' +
            '<div class="yfir">Þjónusta · ' + curYear + '</div>' +
            '<h1>ÞjónustuVerkstæði</h1>' +
            '<div class="undir"><b>' + vn + '</b> í vinnslu · <b>' + dn + '</b> á dagskrá · <b>' + bn + '</b> búin í ár · <b>' + ovN + '</b> fyrirtæki í þjónustu</div>' +
          '</div>' +
          '<div class="b190-verk">' +
            // Hver er að vinna? Nafnið er stimplað á hvert skref sem þú hakar (sama nafn og bílstjóra-appið, bs_employee).
            '<button class="_sv-emp sv-empbtn" type="button" title="Nafnið þitt er stimplað á hvert skref sem þú hakar — svo aðrir sjái hver er kominn í skýrsluna">' +
              (whoAmI() ? esc(whoAmI()) : 'Hver ert þú?') + '</button>' +
            '<div class="sv-seg"><button data-mode="list"' + (_mode === 'list' ? ' class="on"' : '') + '>Listi</button><button data-mode="wide"' + (_mode === 'wide' ? ' class="on"' : '') + '>Breitt</button><button data-mode="cards"' + (_mode === 'cards' ? ' class="on"' : '') + '>Spjöld</button></div>' +
            '<select class="sv-sort" title="Raða Í-vinnslu listanum">' +
              '<option value="name"' + (_sort === 'name' ? ' selected' : '') + '>Nafn (A–Ö)</option>' +
              '<option value="revenue"' + (_sort === 'revenue' ? ' selected' : '') + '>Hæstu tekjur</option>' +
              '<option value="marked"' + (_sort === 'marked' ? ' selected' : '') + '>Nýlega merkt</option>' +
            '</select>' +
            '<input class="sv-search" type="search" placeholder="Leita í vinnslu…" value="' + esc(_search) + '" title="Leita í Í-vinnslu listanum">' +
          '</div>' +
        '</div>' +
        '<div class="b190-grid">' +
          // Í vinnslu — virði (gull). 26.09 (Agnar: „óþarfi að blanda inn á dagskrá og heildina — einbeita sér þarna bara að
          // hvað er í vinnslu"): aðeins verkin á borðinu — virðið, skipt í úttekt búin / eftir, og hvað stendur út af þeim.
          '<div class="b190-k gull" title="Áætlaðar tekjur verkanna í vinnslu: yfirferðir + skýrslugerð + akstur, m. vsk"><div class="b190-i">' + HN +
            '<div class="b190-m"><span class="led" aria-hidden="true"></span>Í vinnslu · virði<span class="b190-p ghost">m. vsk</span></div>' +
            '<div class="b190-rod"><div class="b190-t gull">' + vNum + '<small>' + vUnit + '</small></div>' +
              '<span class="b190-l dalk"><span><i class="bl" aria-hidden="true"></i>Úttekt búin <b>' + (fmtSum(vUttektSum) || '—') + '</b><small>' + vCnt('uttekt') + ' verk</small></span>' +
              '<span><i class="gu" aria-hidden="true"></i>Úttekt eftir <b>' + (fmtSum(vinnslaSum - vUttektSum) || '—') + '</b><small>' + (vn - vCnt('uttekt')) + ' verk</small></span></span></div>' +
            '<div class="b190-s stor" role="img" aria-label="Virði verka í vinnslu: úttekt búin og eftir"><span class="bl" style="width:' + pctOf(vUttektSum, vinnslaSum) + '"></span><span class="gu" style="width:' + pctOf(vinnslaSum - vUttektSum, vinnslaSum) + '"></span></div>' +
            '<div class="b190-f4">' + flis('Verk', vn) + flis('Meðalverk', vn ? Math.round(vinnslaSum / vn).toLocaleString('de-DE') : '—', vn ? 'kr' : '') + flis('Skýrsla eftir', vn - vCnt('skyrsla')) + flis('Reikn. eftir', vn - vCnt('reikningur')) + '</div>' +
          '</div></div>' +
          // Í vinnslu (blátt) — hvar verkin á borðinu standa
          '<div class="b190-k blatt"><div class="b190-i">' + HN +
            '<div class="b190-m"><span class="led" aria-hidden="true"></span>Í vinnslu</div>' +
            '<div class="b190-t">' + vn + '<small>' + (stepKeys.length ? 'af ' + vinnslaAlls + ' verkum' : 'verk') + '</small></div>' +
            '<div class="b190-tikk">' + tikk('Úttekt búin', vCnt('uttekt'), vn, 'bl') + tikk('Skýrsla tilbúin', vCnt('skyrsla'), vn, 'gu') + tikk('Reikningur', vCnt('reikningur'), vn, 'gr') + '</div>' +
          '</div></div>' +
          // Á dagskrá (dökkrautt) — opnar listann „hefja næsta"
          '<div class="b190-k rautt"><div class="b190-i">' + HN +
            '<div class="b190-m"><span class="led" aria-hidden="true"></span>Á dagskrá</div>' +
            '<div class="b190-t">' + dn + '<small>staðir</small></div>' +
            '<div class="b190-s" role="img" aria-label="Á dagskrá af fyrirtækjum í þjónustu"><span class="ra" style="width:' + pctOf(dn, ovN) + '"></span></div>' +
            '<div class="b190-l"><span>≈ <b>' + dSum + '</b> eftir</span></div>' +
            opna('dagskra', _openDagskra) +
          '</div></div>' +
          // Búin í ár (grænt)
          '<div class="b190-k graent"><div class="b190-i">' + HN +
            '<div class="b190-m"><span class="led" aria-hidden="true"></span>Búin í ár</div>' +
            '<div class="b190-t">' + bn + '<small>staðir</small></div>' +
            '<div class="b190-s" role="img" aria-label="Búin af fyrirtækjum í þjónustu"><span class="gr" style="width:' + pctOf(bn, ovN) + '"></span></div>' +
            '<div class="b190-l"><span><b>' + (ovN > 0 ? Math.round(bn / ovN * 100) : 0) + '%</b> af ' + ovN + ' í þjónustu</span></div>' +
            opna('buid', _openBuid) +
          '</div></div>' +
        '</div>' +
        // Skref ársins — súla per skref; smellur: ✓ búið → ⧗ vantar → af (sama sía og áður)
        '<div class="b190-strim">' +
          '<div class="hd"><span class="dl" aria-hidden="true"></span>Skref ársins · ' + curYear +
            '<span class="r">' + (stepKeys.length
              ? '<b>' + vn + '</b> af ' + vinnslaAlls + ' í vinnslu <button type="button" class="sv-stepf-clear">Hreinsa síu</button>'
              : '<b>' + totAll + '</b> staðir · smelltu á súlu: ✓ búið → ⧗ vantar') + '</span></div>' +
          '<div class="b190-man" role="group" aria-label="Sía eftir skrefi">' + skrefSulur + '</div>' +
        '</div>' +
      '</div>' +
      dagskraDrawer + buidDrawer + body + '</div>';
    if (_leitFokus) { const si = v.querySelector('.sv-search'); if (si) { si.focus(); try { si.setSelectionRange(_leitFokus[0], _leitFokus[1]); } catch (_) {} } }


    // view-mode toggle
    v.querySelectorAll('.sv-seg button').forEach(bn => bn.addEventListener('click', () => setMode(bn.dataset.mode)));
    // skref-sía
    v.querySelectorAll('[data-stepf]').forEach(bn => bn.addEventListener('click', () => cycleStepF(bn.dataset.stepf)));
    const clrF = v.querySelector('.sv-stepf-clear');
    if (clrF) clrF.addEventListener('click', clearStepF);
    // sort
    const sortSel = v.querySelector('.sv-sort');
    if (sortSel) sortSel.addEventListener('change', e => setSort(e.target.value));
    // search
    const searchInp = v.querySelector('.sv-search');
    if (searchInp) {
      searchInp.addEventListener('input', e => setSearch(e.target.value));
      searchInp.addEventListener('search', e => setSearch(e.target.value));
    }
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
      else if (act === 'removedone') { markBuid(id).then((ok) => { if (ok) toast('Fært í „Búið í ár“ — komið með skýrslu + reikning'); }); }
    }));
    // ✉️ Senda úttektarskýrslu ársins í tölvupósti (ReceiptSender-gluggi)
    v.querySelectorAll('._sv-send').forEach(bn => bn.addEventListener('click', e => {
      e.stopPropagation();
      sendSkyrsla(+bn.dataset.id);
    }));
    // follow-up steps (pills + stepper share class).
    // Sync í Fyrirtæki í þjónustu (153): skref sett Á ⇒ árið telst hafið
    // (field_inspected_year → blátt „Í skýrslugerð" á 153); „Reikningur sendur"
    // eða öll fjögur ✓ ⇒ árið fullklárað (last_year_inspected → grænt á 153).
    // Nafnaval — einfalt hringval gegnum starfsmannalistann (sami og 219).
    v.querySelectorAll('._sv-emp').forEach(bn => bn.addEventListener('click', () => {
      const cur = whoAmI();
      const L = folkid(), i = L.indexOf(cur);
      const next = L[(i + 1) % (L.length + 1)] || '';
      setWhoAmI(next);
      toast(next ? '👤 ' + next : 'Nafn hreinsað');
      render();
    }));
    v.querySelectorAll('._sv-step').forEach(bn => bn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = +bn.dataset.id, k = bn.dataset.step;
      const a = arsMap()[String(id)] || {};
      const cur = effSteps(a, _reikCoIds.has(id), !!( _yearDocs && _yearDocs.get(String(id)) && _yearDocs.get(String(id)).skyrsla ));
      const next = Object.assign({}, a[STEPS_KEY] || {}, cur, { [k]: !cur[k] });
      // Kveikt á úttektinni ⇒ „Farið á verkstað" kviknar með (undanfari), og
      // afhak á ferðinni slekkur á úttektinni. Þannig getur stikan aldrei sýnt
      // kláraða úttekt án þess að hafa verið farið.
      if (k === 'uttekt' && next.uttekt) next.farid = true;
      if (k === 'farid' && !next.farid) next.uttekt = false;
      const extra = {};
      if (next[k] && +a.last_year_inspected !== curYear) extra.field_inspected_year = curYear;
      // 2026-07-29 (Agnar: „starfsmennirnir mjög óöruggir hvernig staðan er …
      // sést svo illa ef einhver er búinn að vinna í henni"): þrepin geymdu
      // AÐEINS já/nei — hvergi var skráð hver setti hakið né hvenær, svo appið
      // gat ekki sagt frá því. Nú fylgir stimpill hverju skrefi.
      const meta = Object.assign({}, a[STEPS_META_KEY] || {});
      if (next[k]) meta[k] = { by: whoAmI(), at: Date.now() };
      else delete meta[k];
      if (k === 'uttekt' && next.uttekt && !meta.farid) meta.farid = { by: whoAmI(), at: Date.now() };
      extra[STEPS_META_KEY] = meta;
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
      // Skrifað á fyrirtækið sjálft svo textinn sjáist á öllum þremur skjám og
      // öllum vélum. Companies.saveBannerNote uppfærir líka minnið í flipanum.
      const _id = +ta.dataset.id;
      if (window.Companies && typeof Companies.saveBannerNote === 'function') {
        Companies.saveBannerNote(_id, ta.value);
        const _c = (window.state && state.companies || []).find(x => +x.id === _id);
        if (_c) _c.banner_note = ta.value;
      } else if (window.DB && DB.sb) {
        DB.sb.from('fyrirtaeki').update({ banner_note: ta.value || null }).eq('id', _id)
          .then(r => { if (r && r.error) toast('Minnispunktur vistaðist EKKI: ' + r.error.message); });
      } else { toast('Minnispunktur vistaðist EKKI — engin gagnabankatenging'); }
    }));
  }

  // 25.09.2026: sami minnispunktur á þremur stöðum — breyting annars staðar (fyrirtækjasíða, Ársskoðun, önnur vél)
  // uppfærir reitinn hér strax, nema verið sé að skrifa í hann.
  document.addEventListener('fyrirtaeki-nota', e => {
    const d = e.detail || {}; if (!d.id) return;
    const val = d.texti == null ? '' : String(d.texti);
    const _c = (window.state && state.companies || []).find(x => +x.id === +d.id);
    if (_c) _c.banner_note = val;
    document.querySelectorAll('.sv-note[data-id="' + (+d.id) + '"]').forEach(ta => {
      if (document.activeElement !== ta && ta.value !== val) ta.value = val;
    });
  });

  function openView() {
    document.querySelectorAll('[id^=view-]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    ensureView();
    const v = viewEl(); v.style.display = ''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(x => x.classList.remove('active'));
    const b = document.querySelector('[data-view="' + NAV_KEY + '"]'); if (b) b.classList.add('active');
    render();
    ensureArsData(); // einingar + áætlaðar tekjur — re-renders when loaded
    // Spegla slugginn sjálf (eins og Verkborð 231): röð vefjara á App.switchView
    // er tilviljanakennd, svo 218-speglinum er ekki treystandi þegar hookurinn
    // okkar skammhleypir framhjá honum.
    try {
      if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY);
    } catch (_) {}
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
    // Fara gegnum App.switchView (ekki beint í openView) svo allir vefjarar
    // sjái flakkið — 218 speglar þá #thjonustu-verkstaedi í slóðina og
    // bakk-lagið (277) fær alvöru færslu. Hookurinn hér að neðan grípur
    // NAV_KEY og kallar openView.
    btn.onclick = function () {
      if (window.App && typeof App.switchView === 'function') App.switchView(NAV_KEY);
      else openView();
    };
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    document.querySelectorAll('.vnav-btn').forEach(b => { if (b === btn) return; b.addEventListener('click', () => { const vv = viewEl(); if (vv) { vv.style.display = 'none'; vv.classList.remove('active'); } btn.classList.remove('active'); }); });
    console.log('[þjónustuverkstæði] tab injected');
  }
  setInterval(injectTab, 1200);
  setTimeout(injectTab, 600);

  // ── Deep-link lagfæring (2026-07-30, Verkefnalisti 56b9c9c6) ──────────────
  // #thjonustu-verkstaedi virkaði ekki á köldum boot: (1) view-divið varð
  // aðeins til í openView svo 218-vörðurinn (`getElementById('view-'+v)`)
  // hafnaði slugnum og sala-boot-landerinn yfirskrifaði hashið; (2) enginn
  // switchView-hookur var til svo App.switchView(NAV_KEY) sýndi tóman div.
  // Lagað með sama mynstri og hin borðin (231/232/268): divið til strax +
  // switchView-hookur sem beinir NAV_KEY í openView.
  ensureView();
  (function patchSwitchView() {
    if (!window.App || typeof App.switchView !== 'function') { setTimeout(patchSwitchView, 200); return; }
    if (App.switchView.__svThjVerk) return;
    const orig = App.switchView;
    const wrapped = function (v) {
      if (v === NAV_KEY) { openView(); return; }
      return orig.apply(this, arguments);
    };
    for (const k in orig) { try { wrapped[k] = orig[k]; } catch (_) {} }
    wrapped.__svThjVerk = true;
    App.switchView = wrapped;
  })();
  // Þögnin rétt (17.09.2026): skráir aðeins endurteikningu þegar stillingar
  // breytast. Bregðist hún sést nýjasta staðan við næstu opnun sýnarinnar —
  // ekkert skrifast héðan og ekkert getur tapast.
  try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { if (viewEl() && viewEl().classList.contains('active')) render(); }); } catch (_) {}

  window.ThjonustuVerkstaedi = { render, open: openView, buckets };
  console.log('[patch-190 v2] ÞjónustuVerkstæði (company Kanban) installed');
})();
/* === END ÞJÓNUSTUVERKSTÆÐI === */
