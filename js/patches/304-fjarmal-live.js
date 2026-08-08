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
    await Arsskodun.loadAll();   // sama hleðsla og viewin nota — cache-uð eftir fyrsta kall
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

  let _busy = false;
  async function publish() {
    if (_busy) return;
    _busy = true;
    try {
      const row = await compute();
      if (!row) return;
      const SB = window.DB && DB.sb;
      if (!SB) return;
      const r = await SB.from('fjarmal_live').upsert(row, { onConflict: 'key' });
      if (r.error) console.warn('[fjarmal-live]', r.error.message);
      else console.log('[fjarmal-live] skyrslur_i_vinnslu →', row.n + ' verk · ' + row.kr + ' kr');
    } catch (e) {
      console.warn('[fjarmal-live]', e && e.message);
    } finally { _busy = false; }
  }

  // Einu sinni þegar appið er komið í ró eftir ræsingu, svo á 30 mín fresti
  // meðan flipinn er opinn — talan er þá aldrei eldri en síðasta virka lota.
  setTimeout(publish, 20000);
  setInterval(publish, 30 * 60 * 1000);
  window.FjarmalLive = { publish };
})();
