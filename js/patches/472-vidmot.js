/* 472-vidmot.js — EIN geymsla fyrir ÖLL viðmótsval (regla Agnars 15.10.2026).
 *
 * Agnar: „ég vill ekki sjá neinstaðar neina slíka stillingu að það virki bara í einhverju ákveðnu tæki …
 * regla bannað að það sé slíkt" — fimm tölvur, hvert val á að vera eins alls staðar og haldast.
 *
 * Reglan í kóða:
 *   • Sannleikurinn er á þjóninum: AppSettings-lykillinn `vidmot` = { <lykill>: { v: <gildi>, ts: <ms> } }.
 *   • Nýjasta valið ræður, per lykil (ts). Vél sem les eldra gildi af þjóni en hún á sjálf heldur sínu þar til
 *     hennar skrif er komið upp; vél með eldra gildi en þjónninn tekur þjónsins.
 *   • localStorage `vidmot_cache_v1` er AÐEINS skyndiminni svo gildið sé til samstundis við ræsingu (85-app-settings
 *     hleðst async) og svo smellur glatist ekki þótt netið detti út — aldrei sannleikur.
 *   • Skrif fara aðeins af stað við raunverulegt val notandans (setja), eru dregin saman í eina sókn (400 ms) og
 *     aldrei í vakt eða lykkju. deepMerge þjónsins eyðir aldrei lyklum: „ekkert" er skrifað sem null-gildi.
 *   • Tækjaflokkur: val sem er EÐLISLÆGT ólíkt á síma og tölvu (Sími/Tafla/Skjár-hamur, dregnar breiddir) geymist per
 *     flokk með lesaTaeki/setjaTaeki — lykillinn verður `<lykill>@simi` eða `<lykill>@tolva`. Það er samt EITT gildi
 *     fyrir allar tölvurnar fimm; flokkurinn lýsir skjánum, ekki vélinni.
 *   • Val sem berst frá annarri vél tekur gildi við NÆSTU opnun/teikningu — Vidmot kallar ekki á endurteikningu
 *     (Stöðugt viðmót). Sá sem vill bregðast við strax hlustar á `vidmot-breytt` á document.
 *
 * Notkun:
 *   Vidmot.lesa('arsskodun.sort', 'name')            Vidmot.setja('arsskodun.sort', 'postnr')
 *   Vidmot.lesaTaeki('viewmode', 'tafla')             Vidmot.setjaTaeki('viewmode', 'simi')
 *   Vidmot.flytja('arsskodun.sort', 'arsskodun_sort')  — einskiptis: gamli localStorage-lykillinn verður upphafsgildi
 *                                                         ef ekkert er til í vidmot; gamli lykillinn er ekki skrifaður framar.
 */
(function () {
  if (window.Vidmot) return;
  var LYKILL = 'vidmot', CACHE = 'vidmot_cache_v1', TAG = '[vidmot]';
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE) || '{}') || {}; } catch (_) { cache = {}; }
  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};
  var pending = {}, timer = null;

  function taeki() {
    try { if (document.documentElement.classList.contains('ars-simi-phone')) return 'simi'; } catch (_) {}
    try { if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1100) return 'simi'; } catch (_) {}
    return 'tolva';
  }
  function serverMap() {
    try {
      var m = window.AppSettings && AppSettings.path && AppSettings.path(LYKILL);
      return m && typeof m === 'object' && !Array.isArray(m) ? m : null;
    } catch (_) { return null; }
  }
  function gild(f) { return f && typeof f === 'object' && 'v' in f; }
  function faersla(k) {
    var s = serverMap(), sv = s ? s[k] : null, cv = cache[k];
    if (!gild(sv)) sv = null;
    if (!gild(cv)) cv = null;
    if (sv && cv) return (+cv.ts || 0) > (+sv.ts || 0) ? cv : sv;
    return sv || cv || null;
  }
  function lesa(k, sjalfgefid) {
    var f = faersla(k);
    return (f && f.v !== undefined && f.v !== null) ? f.v : sjalfgefid;
  }
  function vistaCache() { try { localStorage.setItem(CACHE, JSON.stringify(cache)); } catch (_) {} }
  function setja(k, v) {
    if (v === undefined) v = null;
    var f = { v: v, ts: Date.now() };
    cache[k] = f; vistaCache();
    pending[k] = f; skedula();
    try { document.dispatchEvent(new CustomEvent('vidmot-breytt', { detail: { lykill: k, gildi: v, heima: true } })); } catch (_) {}
  }
  function lesaTaeki(k, sjalfgefid) { return lesa(k + '@' + taeki(), sjalfgefid); }
  function setjaTaeki(k, v) { setja(k + '@' + taeki(), v); }
  function skedula() { if (timer) return; timer = setTimeout(skola, 400); }
  async function skola() {
    timer = null;
    var p = pending; pending = {};
    var lyklar = Object.keys(p); if (!lyklar.length) return;
    var AS = window.AppSettings;
    if (!AS || !AS.save || !(AS.isLoaded && AS.isLoaded())) { Object.assign(pending, p); timer = setTimeout(skola, 2500); return; }
    // Nýjasta ræður: hafi þjónninn nýrra gildi en það sem bíður hér er okkar gildi úrelt — sleppt (og skyndiminnið leiðrétt).
    var s = serverMap() || {};
    lyklar.forEach(function (k) { var sv = s[k]; if (gild(sv) && (+sv.ts || 0) > (+p[k].ts || 0)) { delete p[k]; cache[k] = sv; } });
    if (!Object.keys(p).length) { vistaCache(); return; }
    var patch = {}; patch[LYKILL] = p;
    try {
      var ok = await AS.save(patch);
      if (ok === false) throw new Error('AppSettings.save skilaði false');
    } catch (e) {
      try { console.warn(TAG, 'vistun bíður — reyni aftur', (e && e.message) || e); } catch (_) {}
      Object.keys(p).forEach(function (k) { if (!pending[k]) pending[k] = p[k]; });
      timer = setTimeout(skola, 5000);
    }
  }
  // Einskiptis flutningur úr gömlum localStorage-lykli. `umbreyta` fær hrátt gildi (JSON-þáttað ef hægt) og skilar
  // vidmot-gildinu, eða undefined til að sleppa.
  function flytja(k, gamall, umbreyta) {
    if (faersla(k)) return false;
    var raw = null;
    try { raw = localStorage.getItem(gamall); } catch (_) { raw = null; }
    if (raw === null || raw === undefined) return false;
    var v = raw;
    try { v = JSON.parse(raw); } catch (_) { v = raw; }
    if (umbreyta) { try { v = umbreyta(v); } catch (_) { v = undefined; } }
    if (v === undefined) return false;
    setja(k, v);
    return true;
  }
  // Þegar AppSettings hefur hlaðið (eða breytist frá annarri vél): skyndiminnið lagað að þjóninum þar sem hann er nýrri,
  // og þeim sem hlusta sagt frá.
  function samraema() {
    var s = serverMap(); if (!s) return;
    var breytt = [];
    Object.keys(s).forEach(function (k) {
      var sv = s[k], cv = cache[k];
      if (!gild(sv)) return;
      if (!cv || (+sv.ts || 0) > (+cv.ts || 0)) { if (!cv || JSON.stringify(cv.v) !== JSON.stringify(sv.v)) breytt.push(k); cache[k] = sv; }
    });
    if (breytt.length) {
      vistaCache();
      breytt.forEach(function (k) { try { document.dispatchEvent(new CustomEvent('vidmot-breytt', { detail: { lykill: k, gildi: s[k].v, heima: false } })); } catch (_) {} });
    }
  }
  function tengja() {
    var AS = window.AppSettings;
    if (!AS || !AS.onChange) { setTimeout(tengja, 500); return; }
    try { AS.onChange(samraema); } catch (_) {}
    if (AS.isLoaded && AS.isLoaded()) samraema();
    if (Object.keys(pending).length) skedula();
  }
  tengja();
  // Ósend skrif við lokun: AppSettings.saveVidLokun sé til, annars bíða þau í skyndiminninu og fara upp næst (ts heldur).
  window.addEventListener('pagehide', function () {
    try {
      var p = pending; if (!Object.keys(p).length) return;
      var AS = window.AppSettings; if (AS && AS.saveVidLokun) { var patch = {}; patch[LYKILL] = p; pending = {}; AS.saveVidLokun(patch); }
    } catch (_) {}
  });

  window.Vidmot = { lesa: lesa, setja: setja, lesaTaeki: lesaTaeki, setjaTaeki: setjaTaeki, flytja: flytja, taeki: taeki, _skola: skola, _cache: function () { return cache; } };
  try { console.log(TAG, 'virkt — eitt val fyrir allar vélar, nýjasta ræður'); } catch (_) {}
})();
