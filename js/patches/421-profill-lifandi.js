/* === FYRIRTÆKJAPRÓFÍLL UPPFÆRIST STRAX (421) — 28.09.2026 ===
 *
 * Agnar: „þegar maður breytir í fyrirtækjaprófíl að breytingin komi strax, ekki að maður þurfi að refresha" — og
 * um hvað: „Allt".
 *
 * Af hverju þetta var svona: prófíllinn (Companies.openDetail → #companies-main) er teiknaður ÚR MINNI —
 * Companies.list (fyrirtaeki) og DB.cache.units (uttaeki). Um 150 staðir í pöttunum vista beint með
 * DB.sb.from(...).update/insert, og enginn þeirra endurnýjar það minni né teiknar prófílinn aftur. Rauntímarásin
 * (db.js) sleppir ÞVÍ VILJANDI á meðan prófíll er opinn (til að rífa ekki reit undan notanda), og 127 lokar
 * endurteikningu listans á meðan. Útkoman: vistunin tókst en skjárinn sýndi gamla gildið þar til síðan var endurhlaðin.
 *
 * Lausn: rest-samnyting.js (fetch-umbúðin sem ALLAR Supabase-skriftir fara um) boðar `gogn-skrifud` eftir heppnaða
 * skrift. Hér er hlustað, og sé prófíll opinn og notandinn nýbúinn að gera eitthvað:
 *   1. bíða þar til hann er hættur að skrifa (focusout) og enginn gluggi er opinn,
 *   2. sækja AÐEINS þetta fyrirtæki og tæki þess og lagfæra minnið (ekki allar 1900 raðirnar),
 *   3. teikna prófílinn aftur á staðnum — án „Hleður…"-hulunnar (195), án nýrrar sögu-færslu (18) og slóðar (235)
 *      (window.__coLifandi), og skrunstaðan helst.
 *
 * Varnir gegn lykkju: prófíllinn skrifar sjálfur í bakgrunni við teikningu (year_factcheck, geocode_cache …). Því:
 *   • aðeins skrift sem kemur innan 20 s frá raunverulegri aðgerð notanda (smellur/lykill) telst „breyting",
 *   • bakgrunnstöflur eru undanskildar,
 *   • skriftir sem verða meðan á endurteikningu stendur (og 2,5 s á eftir) eru hunsaðar.
 */
(() => {
  if (window.__profillLifandi421) return;
  window.__profillLifandi421 = true;

  // 01.10.2026 (Agnar: „hrikaleg hopp í ársskoðun þegar maður ýtir á check í tæki eða breytir hleðslu/yfirferð“): hakið og
  // valið lifa í localStorage og 227 speglar þau í app_settings 1–2 s síðar. Sú skrift kom hingað sem „breyting“ og
  // ALLUR prófíllinn var endurteiknaður (mælt: fyrsta röð listans 390 → 609 → 740 → 433 → 306 → 272 px á 1,5 s).
  // Skjárinn sýndi þegar nýju stöðuna — app_settings / app_kv / rpc:app_settings_merge eru bakgrunnur hér.
  const BAKGRUNNUR = /^(hradamaelingar|app_problems|year_factcheck|geocode_cache|doc_factcheck|trio_saga|villur|villuvakt|heimsoknir_log|page_views|automation_runs|fjarmal_live|app_settings|app_kv|rpc:app_settings_merge)$/;
  // 01.10.2026 (Agnar: „brunakerfis skoðun hoppar gríðarlega þegar ég reyni að setja nýtt inn á reikninginn“): Brunakerfis- og
  // Slökkvikerfis-spjöldin (274/386, hýst í prófílnum) eiga sín gögn og teikna sig sjálf eftir vistun. Verðlínuvistun 274
  // kom hingað og ALLUR prófíllinn var rifinn ~1,5 s eftir hverja nýja línu (mælt í 412 px: #companies-main 7.215 →
  // 2.469 px, spjaldið horfið, byggt aftur í lotum á ~1 s). Skýrsluskjöl og reikningar (customer_documents, solur)
  // endurteikna prófílinn áfram eins og áður — þaðan les Skjöl og viðhengi (199).
  // 09.10.2026: Kerfi og þjónusta (450) vistar í stadur_kerfi / stadur_flokkun og uppfærir aðeins röðina sem breyttist.
  const SJALFTEIKNA = /^(brunakerfi_skyrslur|slokkvikerfi|slokkvikerfi_skodanir|stadur_kerfi|stadur_flokkun)$/;
  const NOTANDI_MS = 20000, KYRRD_MS = 2500, BID_MS = 450;

  let _adgerd = 0;              // síðasta raunverulega aðgerð notanda
  let _kyrrdTil = 0;            // skriftir fyrir þennan tíma eru afleiðing endurteikningar okkar
  let _tafla = new Set(), _t = null, _keyrir = false, _aftur = false;

  ['pointerdown', 'keydown', 'change'].forEach((ev) => document.addEventListener(ev, (e) => { if (e.isTrusted) _adgerd = Date.now(); }, true));

  const erProfill = () => {
    const v = document.getElementById('view-companies'), main = document.getElementById('companies-main');
    if (!v || !main || !v.classList.contains('active')) return false;
    if (main.querySelector('.company-grid')) return false;
    return !!main.querySelector('button[onclick*="Companies.openEdit"],button[onclick*="Companies.openMap"],button[onclick*="Companies.render"],._cat-section,._cpr-section,#_ctc-section');
  };
  const opidId = () => {
    const id = window._currentCompanyId != null ? window._currentCompanyId : null;
    const n = parseInt(id, 10);
    return isFinite(n) && n > 0 ? n : null;
  };
  const erAdSkrifa = () => {
    const a = document.activeElement;
    if (!a || a === document.body) return false;
    return a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  };
  const gluggiOpinn = () => {
    const o = document.getElementById('overlay');
    if (o && o.classList.contains('open')) return true;
    return !!document.querySelector('.modal.open, [role="dialog"][aria-modal="true"]:not([hidden])');
  };

  document.addEventListener('gogn-skrifud', (e) => {
    const t = (e.detail && e.detail.tafla) || '';
    if (!t || BAKGRUNNUR.test(t)) return;
    // 01.10.2026: 227 vistar með RPC (tafla = 'rpc:app_settings_merge') — sama speglun, sama bakgrunnur
    if (/app_settings|app_kv/.test(t)) return;
    if (SJALFTEIKNA.test(t)) return;
    const nu = Date.now();
    if (nu < _kyrrdTil && _adgerd < _kyrrdTil - KYRRD_MS) return;   // afleiðing okkar eigin endurteikningar
    if (nu - _adgerd > NOTANDI_MS) return;                           // enginn notandi á bak við — bakgrunnsskrift
    if (!erProfill() || !opidId()) return;
    _tafla.add(t);
    skipuleggja(BID_MS);
  });

  function skipuleggja(ms) {
    clearTimeout(_t);
    _t = setTimeout(keyra, ms);
  }

  async function keyra() {
    if (_keyrir) { _aftur = true; return; }
    if (!erProfill()) { _tafla.clear(); return; }
    // Aldrei rífa reit undan þeim sem er að skrifa, né teikna undir opnum glugga — bíða og reyna aftur.
    if (erAdSkrifa() || gluggiOpinn()) { skipuleggja(600); return; }
    const id = opidId(); if (!id) return;
    // Hak / Yfirferð / Hleðsla already updated that one row. Do not refetch
    // every device of the company, and do not remount the list.
    if (window.__hakHopp && __hakHopp.skalSleppa && __hakHopp.skalSleppa()) { _tafla.clear(); return; }
    const toflur = Array.from(_tafla); _tafla.clear();
    _keyrir = true;
    try {
      await endurnyjaMinni(id, toflur);
      if (!erProfill() || opidId() !== id || erAdSkrifa() || gluggiOpinn()) { _tafla = new Set(toflur.concat(Array.from(_tafla))); skipuleggja(600); return; }
      // 01.10.2026: aðeins tæki breyttust (Merkja skoðun, dagsetningar, staða) → listinn og kostnaðurinn lesa úr
      // DB.cache.units sem var nýlagfært; 224.rerender er vafið af 404 (uppröðun í sama tifi, skrun helst). Allur
      // prófíllinn (haus, skjöl, samskipti, teikning) stendur kyrr — hann sækir ekkert úr uttaeki.
      if (toflur.length && toflur.every((t) => t === 'uttaeki') && document.querySelector('#companies-main .ut-list[data-uw-co="' + id + '"]')) { lett(id); return; }
      teikna(id);
    } catch (err) {
      console.warn('[421] endurnýjun prófíls brást — síðan sýnir áfram fyrri stöðu', err);
    } finally {
      _keyrir = false;
      if (_aftur) { _aftur = false; skipuleggja(BID_MS); }
    }
  }

  // Aðeins þetta fyrirtæki og tæki þess — sama lögun og DB.loadAll / Companies.load skila (select *).
  async function endurnyjaMinni(id, toflur) {
    const sb = window.DB && DB.sb; if (!sb) return;
    // 01.10.2026: aðeins taflan sem var skrifuð. Áður sótti hver vistun bæði
    // fyrirtækisröðina og öll tæki hennar, líka þegar aðeins ein röð breyttist.
    const villFyr = toflur.indexOf('fyrirtaeki') > -1;
    const villTaeki = toflur.indexOf('uttaeki') > -1;
    const verk = [];
    if (villFyr || !villTaeki) {
      verk.push(sb.from('fyrirtaeki').select('*').eq('id', id).maybeSingle().then(({ data }) => {
        if (!data || !window.Companies || !Array.isArray(Companies.list)) return;
        const c = Companies.list.find((x) => x.id === id);
        if (c) { Object.keys(c).forEach((k) => { if (!(k in data)) delete c[k]; }); Object.assign(c, data); }
        else Companies.list.push(data);
      }));
    }
    if (!villTaeki) { await Promise.all(verk); return; }
    verk.push(sb.from('uttaeki').select('*').eq('fyrirtaeki_id', id).order('id').range(0, 999).then(({ data }) => {
      if (!data || !window.DB || !DB.cache || !Array.isArray(DB.cache.units)) return;
      const nyjar = new Map(data.map((u) => [u.id, u]));
      DB.cache.units = DB.cache.units.filter((u) => u.fyrirtaeki_id !== id || nyjar.has(u.id))
        .map((u) => (nyjar.has(u.id) ? Object.assign(u, nyjar.get(u.id)) : u));
      const til = new Set(DB.cache.units.map((u) => u.id));
      data.forEach((u) => { if (!til.has(u.id)) DB.cache.units.push(u); });
    }));
    if (window.DB && DB.cache && Array.isArray(DB.cache.units)) {
      const minni = DB.cache.units.filter((u) => u.fyrirtaeki_id === id).map((u) => u.id);
      if (minni.length) verk.push(sb.from('uttaeki').select('*').in('id', minni.slice(0, 500)).range(0, 999).then(({ data }) => {
        if (!data) return;
        const m = new Map(data.map((u) => [u.id, u]));
        DB.cache.units.forEach((u) => { if (m.has(u.id)) Object.assign(u, m.get(u.id)); });
      }));
    }
    await Promise.all(verk);
  }

  // Skrunstaðan lifir á nokkrum stöðum eftir skjá (gluggi, .main-panel, sýnin sjálf) — öllum haldið og skilað aftur
  // á meðan pattarnir raða sér inn (þeir teikna í nokkrum lotum eftir openDetail).
  function skrunarar() {
    const l = [document.scrollingElement || document.documentElement];
    ['.main-panel', '#view-companies', '#companies-main', '.main-content', 'main'].forEach((s) => { const e = document.querySelector(s); if (e && l.indexOf(e) < 0) l.push(e); });
    return l;
  }
  function lett(id) {
    _kyrrdTil = Date.now() + KYRRD_MS + 500;
    try { if (window.UttektTaeki && UttektTaeki.rerender) UttektTaeki.rerender(id); } catch (e) { console.warn('[421] létt endurteikning', e); }
    try { if (window.recomputeCompanyTotalCost) window.recomputeCompanyTotalCost(); } catch (_) {}
  }
  function teikna(id) {
    // 01.10.2026: hak / Yfirferð / Hleðsla skrifa inspection_trips (227) →
    // gogn-skrifud. Þessi pappi ríf þá ALLAN prófílinn (openDetail) og hakið
    // / valið / skrunið tapast. Staðbundin aðgerð á tækjaröð er ekki „Allt".
    try { if (window.__hakHopp && __hakHopp.skalSleppa && __hakHopp.skalSleppa()) return; } catch (_) {}
    const hlutir = skrunarar().map((e) => [e, e.scrollTop]);
    const skila = () => hlutir.forEach(([e, y]) => { if (Math.abs(e.scrollTop - y) > 2) e.scrollTop = y; });
    window.__coLifandi = true;
    _kyrrdTil = Date.now() + KYRRD_MS + 1500;
    // 195/18/235 keyra SAMSTILLT inni í openDetail — fáninn fellur strax á eftir, svo næsta raunverulega leiðsögn
    // (annað fyrirtæki) fær sína sögu-færslu og slóð eins og áður.
    try { Companies.openDetail(id); }
    finally {
      window.__coLifandi = false;
      skila();
      requestAnimationFrame(skila);
      // Pattarnir (153, 199, 311, 403 …) fylla prófílinn á næstu ~1,5 s. Skruninu er haldið þar til allt er komið,
      // nema notandinn skruni sjálfur á meðan.
      let n = 0, notandiSkrunadi = false;
      const hlusta = () => { notandiSkrunadi = true; };
      window.addEventListener('wheel', hlusta, { passive: true, once: true });
      window.addEventListener('touchmove', hlusta, { passive: true, once: true });
      const t = setInterval(() => {
        if (!notandiSkrunadi) skila();
        if (++n >= 15) {
          clearInterval(t);
          window.removeEventListener('wheel', hlusta);
          window.removeEventListener('touchmove', hlusta);
        }
      }, 100);
    }
  }

  window.ProfillLifandi = { endurteikna: () => { const id = opidId(); if (id && erProfill()) { _tafla.add('handvirkt'); keyra(); } }, version: 'v1' };
})();
/* === END FYRIRTÆKJAPRÓFÍLL UPPFÆRIST STRAX === */
