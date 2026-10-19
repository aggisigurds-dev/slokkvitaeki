/* === GRUNSAMLEGT FLAG — falsely-"done" warning in Fyrirtæki í þjónustu v1 ===
 *
 * Read-only safety badge. A company can be marked "skoðað <þetta ár>"
 * (arsskodun_customers[id].last_year_inspected) by hand or by the field flow,
 * while its actual tæki (uttaeki.last_insp, matched by folded client-name) were
 * last inspected in an EARLIER year. That mismatch is exactly how a multi-site
 * lookalike (Heimaleiga …) got marked done without being serviced.
 *
 * This patch injects a small "⚠ grunsamlegt" badge onto any Ársskoðun row
 * (tr._ars-row) where:
 *   • last_year_inspected === current year, AND
 *   • the company's name-matched tæki HAVE real inspection dates, AND
 *   • the newest of those dates is in an earlier year.
 *
 * Nothing is written — it only surfaces the contradiction so a falsely-"done"
 * row can't hide. Untagged tæki (no dates) are never flagged (can't contradict).
 *
 * Mirrors patch 187's injection pattern (interval re-inject + event refresh).
 * Self-contained; touches no core file.
 */
(() => {
  if (window.__grunsamlegtInstalled) return;
  window.__grunsamlegtInstalled = true;

  var CUR = new Date().getFullYear();

  // Same folding as patch 153 (foldName) so company.nafn ⇆ uttaeki.client match.
  function foldName(s) {
    return String(s || '').toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  // foldName(client) -> { maxYear, hasDate }
  var _idx = null, _building = false;
  // 30.09.2026 (kortlagning ræsi-netkallanna): þetta fall skannaði `uttaeki`
  // frá enda til enda í SJÖ RAÐTENGDUM ferðum við hverja einustu hleðslu —
  // líka þegar Ársskoðun var aldrei opnuð. Allt sem það þarf (client,
  // last_insp, status) er ÞEGAR í `DB.cache.units`, sem db.js byggir hvort eð
  // er. Netskönnunin er nú varaleið sem keyrir aðeins ef minnið er tómt.
  function buildIndexFromCache() {
    var raw = (window.DB && DB.cache && DB.cache.units) || null;
    if (!raw || !raw.length) return null;
    var map = {};
    raw.forEach(function (u) {
      if (u.status && u.status !== 'active') return;
      var k = foldName(u.client); if (!k) return;
      var y = u.last_insp ? parseInt(String(u.last_insp).slice(0, 4), 10) : 0;
      var e = map[k] || (map[k] = { maxYear: 0, hasDate: false });
      if (y) { e.hasDate = true; if (y > e.maxYear) e.maxYear = y; }
    });
    return map;
  }

  async function buildIndex() {
    var urMinni = buildIndexFromCache();
    if (urMinni) return urMinni;
    var SB = (window.DB && DB.sb) || window.__vdaSB;
    if (!SB) return null;
    var map = {}, from = 0;
    try {
      while (true) {
        var r = await SB.from('uttaeki').select('client,last_insp,status').order('id').range(from, from + 999);
        if (r.error) break;
        (r.data || []).forEach(function (u) {
          if (u.status && u.status !== 'active') return;   // match the in-service list
          var k = foldName(u.client); if (!k) return;
          var y = u.last_insp ? parseInt(String(u.last_insp).slice(0, 4), 10) : 0;
          var e = map[k] || (map[k] = { maxYear: 0, hasDate: false });
          if (y) { e.hasDate = true; if (y > e.maxYear) e.maxYear = y; }
        });
        if (!r.data || r.data.length < 1000) break;
        from += 1000; if (from > 30000) break;
      }
    } catch (e) { console.warn('[grunsamlegt] index', e); }
    return map;
  }

  function lyiFor(coId) {
    try {
      var m = (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {};
      var e = m[String(coId)] || {};
      return parseInt(e.last_year_inspected, 10) || 0;
    } catch (_) { return 0; }
  }

  function addBadge(tr, yr) {
    // 2026-08-26: festa á nafna-reitinn með klasa, ekki fyrsta <td> — nýr
    // póst-stöðu dálkur fremst (153, ._ars-mailcol) er nú fyrsti reiturinn og
    // „⚠ grunsamlegt" pillan hefði annars lent þar ofan í póst-merkinu (295).
    var cell = tr.querySelector('td._ars-namecell') || tr.querySelector('td'); if (!cell) return;
    if (cell.querySelector('._grun-badge')) return;
    var b = document.createElement('span');
    b.className = '_grun-badge';
    b.title = 'Merkt skoðað ' + CUR + ' en nýjasta tækjaskoðun er ' + yr +
      '. Athugaðu hvort raunverulega var þjónustað — eða tengdu úttektarskýrslu fyrir ' + CUR + '.';
    b.textContent = '⚠ grunsamlegt';
    b.style.cssText = 'display:inline-block;margin-left:8px;font-size:10px;font-weight:700;' +
      'color:#b45309;background:#fff7ed;border:1px solid #fed7aa;border-radius:99px;' +
      'padding:1px 7px;white-space:nowrap;vertical-align:middle';
    cell.appendChild(b);
  }

  // 19.10.2026 (Agnar: „kemur stundum og stundum ekki“): merkið var reiknað ÚR gögnum sem gátu verið ókomin eða úrelt.
  //  (1) Hver lína var stimpluð (data-grun) í fyrstu umferð — líka þegar stillingar (arsskodun_customers) voru ókomnar —
  //      og var þá aldrei skoðuð aftur. Mælt: lína sem birtist áður en stillingarnar komu fékk aldrei merki.
  //  (2) Vísitalan (_idx) var byggð einu sinni við ræsingu; skoðun skráð á tæki, endurnefning eða stillingar úr annarri
  //      vél breyttu merkinu ekki fyrr en síðan var endurhlaðin. Og DomKynslod-hliðið sleppti umferð þegar DOM breyttist
  //      ekki — en gögn sem berast breyta ekki DOM.
  // Lausn: UNDIRSKRIFT gagnanna (stillingar + tæki + fyrirtæki). Breytist hún er vísitalan endurbyggð og allar línur
  // endurmetnar í sömu umferð (engin millistaða sést). Línur eru stimplaðar fyrst þegar gögnin eru komin.
  var _sigKey = null;
  function dataSig() {
    var m = (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || null;
    var tot = 0, ids = [];
    if (m) for (var k in m) { tot++; var x = m[k]; if ((parseInt(x && x.last_year_inspected, 10) || 0) === CUR) ids.push(k); }
    var u = (window.DB && DB.cache && DB.cache.units) || [], act = 0, yrSum = 0, clSum = 0;
    for (var i = 0; i < u.length; i++) {
      var r = u[i]; if (r.status && r.status !== 'active') continue;
      act++; clSum += (r.client ? r.client.length : 0);
      if (r.last_insp) yrSum += parseInt(String(r.last_insp).slice(0, 4), 10) || 0;
    }
    var cos = (window.Companies && Companies.list) || [], nmSum = 0;
    for (var j = 0; j < cos.length; j++) nmSum += (cos[j].nafn ? cos[j].nafn.length : 0);
    ids.sort(); var h = 5381, js = ids.join(','); for (var q = 0; q < js.length; q++) h = ((h << 5) + h + js.charCodeAt(q)) | 0;
    return { hasSettings: tot > 0, ids: ids, key: tot + '|' + ids.length + '|' + h + '|' + u.length + '|' + act + '|' + yrSum + '|' + clSum + '|' + cos.length + '|' + nmSum };
  }

  // 19.10.2026: tækjalistinn í DB.cache.units kemur úr ræsi-skyndiminni (360) og endurnýjast aðeins við „Hlaða“ eða þegar
  // prófíll er opnaður — hann getur verið tugi mínútna og dögum gamall og er ólíkur milli véla. Lagfæring á þjóninum
  // (t.d. tækjadagsetningar leiðréttar eftir skýrslu) sást því ekki í merkinu. Merkið sannreynir sig því á FERSKUM gögnum:
  // aðeins þau fyrirtæki sem skyndiminnið segir grunsamleg (≈30) eru spurð, í EINU kalli (fyrirtaeki_id í lista), og
  // merkið fellur niður ef nýjasta skoðun á þjóninum er í ár. Bili kallið gildir skyndiminnið (merkið helst).
  var _fersk = {}, _ferskLykill = '', _ferskBusy = false;
  function ferskaThaer(ids) {
    var lykill = ids.join(',');
    if (!ids.length || lykill === _ferskLykill || _ferskBusy) return;
    var SB = (window.DB && DB.sb) || window.__vdaSB; if (!SB) return;
    _ferskBusy = true;
    Promise.resolve(SB.from('uttaeki').select('fyrirtaeki_id,last_insp,status').in('fyrirtaeki_id', ids.map(Number)))   // ~300 línur; þjónninn skilar mest 1000 — færri línur þýðir aðeins að merkið helst
      .then(function (r) {
        if (!r || r.error || !r.data) return;
        var nyr = {};
        r.data.forEach(function (u) {
          if (u.status && u.status !== 'active') return;
          var y = u.last_insp ? (parseInt(String(u.last_insp).slice(0, 4), 10) || 0) : 0;
          var k = String(u.fyrirtaeki_id); var e = nyr[k] || (nyr[k] = { maxYear: 0 }); if (y > e.maxYear) e.maxYear = y;
        });
        _fersk = nyr; _ferskLykill = lykill; _sigKey = null;      // endurmeta allt með ferskum gögnum í næsta púlsi
      })
      .catch(function () {})
      .then(function () { _ferskBusy = false; });
  }

  function process() {
    if (!_idx) return;
    var cos = (window.Companies && Companies.list) || [];
    if (!cos.length) return;
    var sg = dataSig();
    if (!sg.hasSettings) return;                       // stillingar ókomnar: stimpla ekkert, reyna aftur í næsta púlsi
    var byId = {}; cos.forEach(function (c) { byId[String(c.id)] = c; });
    if (sg.key !== _sigKey) {
      // gögnin breyttust (eða komu í fyrsta sinn): ný vísitala, hreinsa og endurmeta allt í SÖMU umferð
      _sigKey = sg.key;
      var nyr = buildIndexFromCache(); if (nyr) _idx = nyr;
      var kand = [];
      sg.ids.forEach(function (id) {
        var c = byId[id]; if (!c) return;
        var e = _idx[foldName(c.nafn)]; if (e && e.hasDate && e.maxYear < CUR) kand.push(id);
      });
      kand.sort(); ferskaThaer(kand);
      document.querySelectorAll('._grun-badge').forEach(function (n) { n.remove(); });
      document.querySelectorAll('[data-grun]').forEach(function (n) { n.removeAttribute('data-grun'); });
    } else if (window.DomKynslod && !DomKynslod.breytt('222:grun')) {
      // 13.10.2026 (afköst í kyrrstöðu): gögn óbreytt og DOM óbreytt → ekkert að gera (252 DomKynslod).
      return;
    }
    document.querySelectorAll('tr._ars-row:not([data-grun]), ._ars-card:not([data-grun])').forEach(function (el) {
      var coId = el.getAttribute('data-co-id'); if (!coId) { el.setAttribute('data-grun', '1'); return; }
      var c = byId[coId]; if (!c) return;               // fyrirtækið ekki komið í listann: EKKI stimpla, reyna aftur
      el.setAttribute('data-grun', '1');
      if (lyiFor(coId) !== CUR) return;             // only rows claimed done this year
      var e = _idx[foldName(c.nafn)];
      if (!e || !e.hasDate) return;                 // no tæki dates → can't contradict
      if (e.maxYear >= CUR) return;                 // tæki confirm current year → fine
      var fr = _fersk[coId];                         // ferskt af þjóninum: skoðun í ár → ekkert merki
      if (fr && fr.maxYear >= CUR) return;
      var arSkod = (fr && fr.maxYear) ? fr.maxYear : e.maxYear;
      // contradiction: marked done CUR, but newest tæki inspection is earlier.
      if (el.matches('tr._ars-row')) addBadge(el, arSkod);
      else { // card layout — drop the badge near the title
        if (el.querySelector('._grun-badge')) return;
        var host = el.querySelector('strong, b, h3, h4, ._ars-card-title') || el;
        var b = document.createElement('span');
        b.className = '_grun-badge';
        b.title = 'Merkt skoðað ' + CUR + ' en nýjasta tækjaskoðun er ' + arSkod + '.';
        b.textContent = '⚠ grunsamlegt';
        b.style.cssText = 'display:inline-block;margin-left:8px;font-size:10px;font-weight:700;color:#b45309;background:#fff7ed;border:1px solid #fed7aa;border-radius:99px;padding:1px 7px;white-space:nowrap;vertical-align:middle';
        host.appendChild(b);
      }
    });
  }

  function resetAndProcess() {
    document.querySelectorAll('._grun-badge').forEach(function (n) { n.remove(); });
    document.querySelectorAll('[data-grun]').forEach(function (n) { n.removeAttribute('data-grun'); });
    process();
  }

  // Marking / attachment changes can flip a row in or out of "suspicious".
  document.addEventListener('arsskodun-marking-changed', resetAndProcess);
  document.addEventListener('attachment-year-changed', resetAndProcess);

  // Build the index once, then keep re-injecting as the list re-renders.
  // Bíður eftir minninu í stað þess að sækja sjálfur. Púlsinn er ódýr í
  // kyrrstöðu (process hættir strax finnist engar raðir) en hann á ekki að
  // ganga í földum flipa — 173 af 188 tímurum í appinu gleymdu því.
  (async function init() {
    if (_building) return; _building = true;
    for (var bid = 0; bid < 40; bid++) {                 // allt að ~12 s
      if (window.DB && DB.cache && DB.cache.units && DB.cache.units.length) break;
      await new Promise(function (r) { setTimeout(r, 300); });
    }
    _idx = await buildIndex();
    setInterval(function () { if (!document.hidden) process(); }, 1500);
    setTimeout(process, 200);
  })();

  console.log('[patch-222] grunsamlegt-flag installed — ⚠ on falsely-"skoðað" rows');
})();
/* === END GRUNSAMLEGT FLAG === */
