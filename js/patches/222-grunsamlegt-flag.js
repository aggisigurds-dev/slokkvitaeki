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
  async function buildIndex() {
    var SB = (window.DB && DB.sb) || window.__vdaSB;
    if (!SB) return null;
    var map = {}, from = 0;
    try {
      while (true) {
        var r = await SB.from('uttaeki').select('client,last_insp,status').range(from, from + 999);
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
    var cell = tr.querySelector('td'); if (!cell) return;
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

  function process() {
    if (!_idx) return;
    var cos = (window.Companies && Companies.list) || [];
    if (!cos.length) return;
    var byId = {}; cos.forEach(function (c) { byId[String(c.id)] = c; });
    document.querySelectorAll('tr._ars-row:not([data-grun]), ._ars-card:not([data-grun])').forEach(function (el) {
      el.setAttribute('data-grun', '1');
      var coId = el.getAttribute('data-co-id'); if (!coId) return;
      var c = byId[coId]; if (!c) return;
      if (lyiFor(coId) !== CUR) return;             // only rows claimed done this year
      var e = _idx[foldName(c.nafn)];
      if (!e || !e.hasDate) return;                 // no tæki dates → can't contradict
      if (e.maxYear >= CUR) return;                 // tæki confirm current year → fine
      // contradiction: marked done CUR, but newest tæki inspection is earlier.
      if (el.matches('tr._ars-row')) addBadge(el, e.maxYear);
      else { // card layout — drop the badge near the title
        if (el.querySelector('._grun-badge')) return;
        var host = el.querySelector('strong, b, h3, h4, ._ars-card-title') || el;
        var b = document.createElement('span');
        b.className = '_grun-badge';
        b.title = 'Merkt skoðað ' + CUR + ' en nýjasta tækjaskoðun er ' + e.maxYear + '.';
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
  (async function init() {
    if (_building) return; _building = true;
    _idx = await buildIndex();
    setInterval(process, 1500);
    setTimeout(process, 200);
  })();

  console.log('[patch-222] grunsamlegt-flag installed — ⚠ on falsely-"skoðað" rows');
})();
/* === END GRUNSAMLEGT FLAG === */
