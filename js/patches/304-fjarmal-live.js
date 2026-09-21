/* js/patches/304-fjarmal-live.js — 💰 Fjármál-LIVE útgefandi
   ────────────────────────────────────────────────────────────
   Reiknar „Skýrslur í vinnslu" — SAMA talan og Í VINNSLU-línan í peningaboxi
   Þjónustuverkstæðisins (patch 190: verkin á borðinu núna × áætlað virði) —
   og skrifar hana í fjarmal_live-töfluna svo Fjármála-yfirlitið á
   brunaholf.netlify.app (/api/fjarmal-yfirlit) geti birt hana (ósk Agnars 8.8.).

   Af hverju client-megin en ekki í Netlify-fallinu: virðið per fyrirtæki
   (estimated_yearly, patch 153) byggir á lifandi uttaeki-NAFNAPÖRUN + verðum
   úr vörulistanum + facts/manual-yfirskriftum — vél sem er öll client-megin
   og þróast þar. Að endursmíða hana þjóns-megin væri drift-gildra (sama regla
   og pdf-tools.js á hub-num skjalfestir). Verkstæðið og Afgreiðslan eru hins
   vegar hrein töflugögn (verkbeidnir/verklidur/solur) og reiknast þjóns-megin.

   Vinnslu-skilyrðið SPEGLAR buckets() í patch 190 — breytist það þar á það
   að breytast hér: í vinnslu = þjónustufyrirtæki þar sem
     last_year_inspected ≠ árið  OG  (field_inspected_year == árið EÐA vistuð
     drög í skýinu (SavedReports, patch 227/228)). */
(() => {
  if (window.__fjarmalLiveInstalled) return;
  window.__fjarmalLiveInstalled = true;

  const KEY = 'arsskodun_customers';
  const curYear = new Date().getFullYear();

  function whoAmI() {
    try { return localStorage.getItem('ky_me') || localStorage.getItem('bs_employee') || ''; } catch (_) { return ''; }
  }
  function arsInfo(coId) {
    const L = (window.Arsskodun && Arsskodun._cache && Arsskodun._cache.list) || [];
    const row = L.find(x => String(x.id) === String(coId));
    return (row && row._ars) || {};
  }

  async function compute() {
    if (!(window.Arsskodun && Arsskodun.loadAll)) return null;
    // 21.09.2026 (afköst, mælt á lifandi): hér stóð „cache-uð eftir fyrsta kall" — það er hún EKKI. Hvert kall
    // sótti ALLT Ársskoðunar-mengið upp á nýtt (~27 REST-köll: uttaeki 2×6 síður, 1,4 MB app_settings, fyrirtaeki…),
    // 20 sek. eftir HVERJA síðuhleðslu á hverri vél, líka þegar notandinn var nýbúinn að opna Ársskoðun og gögnin
    // voru tveggja sekúndna gömul. Nú er nýsótt mengi notað beint: 153 skrifar snapshot (ars_snapshot_v1, reitur t)
    // í lok hverrar hleðslu, svo aldur þess segir hvenær listinn í minni var síðast sóttur.
    if (!ferskurListi()) await Arsskodun.loadAll();
    const cos = (window.Companies && Companies.list) || [];
    if (!cos.length) return null;
    const map = (window.AppSettings && AppSettings.path && AppSettings.path(KEY)) || {};
    const rows = [];
    cos.forEach(co => {
      if (!co || co.deleted_at) return;
      if (co.er_i_thjonustu === false) return;
      const a = map[String(co.id)] || {};
      const ly = +a.last_year_inspected || 0;
      const fy = +a.field_inspected_year || 0;
      const hasDraft = !!(window.SavedReports && SavedReports.has && SavedReports.has(co.id));
      if (ly === curYear) return;                 // búið í ár → ekki í vinnslu
      if (!(fy === curYear || hasDraft)) return;  // hvorki byrjað né drög
      rows.push({ label: co.nafn || ('#' + co.id), kr: Math.round(+arsInfo(co.id).estimated_yearly || 0) });
    });
    rows.sort((x, y) => y.kr - x.kr);
    return {
      key: 'skyrslur_i_vinnslu',
      kr: rows.reduce((s, r) => s + r.kr, 0),
      n: rows.length,
      n2: null,
      list: rows.slice(0, 100),
      updated_at: new Date().toISOString(),
      updated_by: whoAmI() || 'app'
    };
  }

  const FERSKT_MS = 10 * 60 * 1000;      // listi í minni yngri en þetta → engin ný sókn
  const BIRT_NYLEGA_MS = 25 * 60 * 1000; // talan á þjóni yngri en þetta → þessi flipi sleppir umferðinni
  function ferskurListi() {
    try {
      const L = window.Arsskodun && Arsskodun._cache && Arsskodun._cache.list;
      if (!L || !L.length) return false;
      const snap = JSON.parse(localStorage.getItem('ars_snapshot_v1') || 'null');
      return !!(snap && snap.t && (Date.now() - snap.t) < FERSKT_MS);
    } catch (_) { return false; }
  }
  // Fjórar vélar + símar, hver flipi birti sömu töluna á 30 mín fresti og 20 sek. eftir hverja hleðslu. Eitt örlítið
  // kall (ein röð, einn dálkur) segir hvort einhver annar er nýbúinn — þá þarf þessi flipi hvorki að sækja né skrifa.
  // Bregðist kallið er haldið áfram eins og áður (betra að birta tvisvar en aldrei).
  async function nylegaBirt(SB) {
    try {
      const r = await SB.from('fjarmal_live').select('updated_at').eq('key', 'skyrslur_i_vinnslu').maybeSingle();
      const t = r && r.data && r.data.updated_at ? new Date(r.data.updated_at).getTime() : 0;
      return !!t && (Date.now() - t) < BIRT_NYLEGA_MS;
    } catch (_) { return false; }
  }

  let _busy = false;
  async function publish(thvinga) {
    if (_busy) return;
    _busy = true;
    try {
      const SB = window.DB && DB.sb;
      if (!SB) return;
      // þvinguð birting (FjarmalLive.publish(true)) sleppir athuguninni — t.d. rétt eftir að verk var klárað
      if (thvinga !== true && await nylegaBirt(SB)) return;
      const row = await compute();
      if (!row) return;
      const r = await SB.from('fjarmal_live').upsert(row, { onConflict: 'key' });
      if (r.error) console.warn('[fjarmal-live]', r.error.message);
      else console.log('[fjarmal-live] skyrslur_i_vinnslu →', row.n + ' verk · ' + row.kr + ' kr');
    } catch (e) {
      console.warn('[fjarmal-live]', e && e.message);
    } finally { _busy = false; }
  }

  // Einu sinni þegar appið er komið í ró eftir ræsingu, svo á 30 mín fresti
  // meðan flipinn er opinn — talan er þá aldrei eldri en síðasta virka lota.
  setTimeout(() => publish(), 20000);
  // falinn flipi birtir ekki — sýnilegi flipinn (eða næsta vél) sér um það
  setInterval(() => { if (!document.hidden) publish(); }, 30 * 60 * 1000);
  window.FjarmalLive = { publish };
})();
