/* === URL ROUTING (deep-link views by name) v1 ===
 *
 * Makes the address bar reflect the current view, and lets you deep-link
 * straight to a view by its (ascii) page name. Examples:
 *     slokkvitaeki.netlify.app/#leidsogn   -> opens Leiðsögn (þjónustukortið)
 *     slokkvitaeki.netlify.app/#sala       -> opens Sala
 *     slokkvitaeki.netlify.app/#afgreidsla -> opens Afgreiðsla
 *
 * How it works
 *  - Wraps App.switchView so every navigation does
 *        history.replaceState(null, '', '#' + slug)
 *    (no page reload, and replaceState keeps it out of the back-button
 *    history so flipping views doesn't spam it).
 *  - On boot, and on every `hashchange`, it reads the hash, maps the slug
 *    to the internal view id and calls App.switchView(view) — so typing or
 *    sharing a #slug URL opens that page.
 *
 * Slugs
 *  - `ALIAS` gives the Icelandic sidebar pages a clean ascii name. Every
 *    view WITHOUT an explicit alias just uses its own (already-ascii) id,
 *    and any hash that is itself a real view id (#sala, #vorur, #companies)
 *    works directly too. So new views need no change here to be linkable.
 *
 * Coexistence (important — this app has ~200 patches)
 *  - Ignores key=value hashes (#device=…, #portal=…, #tab=…) and the legacy
 *    #view-… form; those belong to other patches (57, 51, 147, 154).
 *  - Patch 154 (last-view-memory) yields to any clean slug hash (see the
 *    guard in its restoreLastView), so a deep link is not overridden by the
 *    remembered last view on reload.
 *  - The wrapper copies any flags the underlying switchView carries
 *    (e.g. 154's __lastViewWrapped, features.js's _patched) so it does not
 *    trigger a re-wrap, and re-asserts the deep-link view briefly on boot to
 *    win over the boot-time auto-landers (sala.js etc. fire up to ~t=1.5s).
 */
(() => {
  if (window.__urlRoutingInstalled) return;
  window.__urlRoutingInstalled = true;

  // ascii slug -> internal view id. Only the pages that want a prettier name
  // need to be here; the reverse map prefers the FIRST slug listed per view.
  var ALIAS = {
    leidsogn:      'field',            // Leiðsögn (þjónustukortið)
    afgreidsla:    'counter',          // Afgreiðsla
    verkstaedi:    'workshop',         // Verkstæði
    fyrirtaeki:    'companies',        // Fyrirtæki í þjónustu
    tekjur:        'income',           // Tekjur
    stillingar:    'settings',         // Stillingar
    bokhald:       'bokhalds-yfirlit', // Bókhalds yfirlit
    lan:           'lanstaeki',        // Lánstæki
    // identity entries — listed so the reverse map keeps these tidy names
    sala: 'sala', vorur: 'vorur', geymsla: 'geymsla', beidnir: 'beidnir',
    verkbord: 'verkbord', verkefni: 'verkbord',   // sameinað verkborð (patch 231)
    brunakerfi: 'brunakerfi', verkdagbok: 'verkdagbok', arsskodun: 'arsskodun',
    vidskiptavinir: 'vidskiptavinir', yfirlit: 'yfirlit',
    bilstjori: 'bilstjori', drivers: 'bilstjori', bakendi: 'bakendi',
    sameining: 'sameining', adstod: 'adstod',
    postur: 'reikninga-postur', reikningapostur: 'reikninga-postur',  // 📧 Reikninga-póstur (patch 240)
    aksturslisti: 'aksturslisti', vakt: 'aksturslisti',   // 🚚 Aksturslisti / vakt-yfirlit (patch 268)
    opp: 'opp'   // 📱 Öpp launcher (patch 261)
  };

  // internal view id -> preferred ascii slug (first alias wins).
  var SLUG = {};
  Object.keys(ALIAS).forEach(function (s) { if (!(ALIAS[s] in SLUG)) SLUG[ALIAS[s]] = s; });
  // Leiðsögn has two historical view ids (field / leidsogn) — both get the
  // same pretty slug so the URL is stable whichever one the app renders.
  SLUG.field = 'leidsogn'; SLUG.leidsogn = 'leidsogn';

  function slugForView(v) { return SLUG[v] || v; }

  // resolve a slug to the view id that actually EXISTS in the DOM (handles the
  // field <-> leidsogn pair without guessing).
  function resolveView(s) {
    var v = ALIAS[s] || s;
    if (document.getElementById('view-' + v)) return v;
    if (v === 'field' && document.getElementById('view-leidsogn')) return 'leidsogn';
    if (v === 'leidsogn' && document.getElementById('view-field')) return 'field';
    return v;
  }

  // the current hash as a clean nav slug, or '' if it is not ours to handle.
  function cleanHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return '';
    if (h.indexOf('=') !== -1) return '';      // #device=, #portal=, #tab=…
    if (h.indexOf('view-') === 0) return '';   // legacy #view-… (patch 154 owns)
    if (h.indexOf('/') !== -1) return '';      // anything path-like
    return h;
  }

  var _suppress = false; // guards the switchView<->hash feedback loop

  // Sync the sidebar highlight to a view. The core App.switchView does this
  // itself, but several board patches (240 Reikninga-póstur o.fl.) wrap
  // switchView and short-circuit for their own view WITHOUT touching the
  // .vnav-btn active class — after hash navigation the highlight then stayed
  // stuck on the previous page (Sala). Called from the apply-hash path so
  // hash-driven navigation always lands the highlight on the right button.
  function syncNav(view) {
    try {
      var slugs = { }; slugs[view] = 1; slugs[slugForView(view)] = 1;
      // field/leidsogn are the same page under two ids
      if (view === 'field' || view === 'leidsogn') { slugs.field = 1; slugs.leidsogn = 1; }
      document.querySelectorAll('.vnav-btn').forEach(function (b) {
        b.classList.toggle('active', !!slugs[b.getAttribute('data-view')]);
      });
    } catch (_) {}
  }

  function applyHash() {
    try {
      var s = cleanHash(); if (!s) return;
      var view = resolveView(s);
      if (!document.getElementById('view-' + view)) return; // unknown slug -> ignore
      if (!window.App || typeof App.switchView !== 'function') return;
      var active = document.querySelector('.view.active');
      if (active && active.id === 'view-' + view) { syncNav(view); return; }   // already there — just fix the highlight
      _suppress = true;
      App.switchView(view);
      _suppress = false;
      syncNav(view);
    } catch (_) { _suppress = false; }
  }

  function wrap() {
    if (!window.App || typeof App.switchView !== 'function') { setTimeout(wrap, 100); return; }
    if (App.switchView.__urlRouted) return;
    var orig = App.switchView;
    var wrapped = function (v) {
      var r = orig.apply(this, arguments);
      try {
        if (!_suppress && v && typeof v === 'string') {
          var slug = slugForView(v);
          if (cleanHash() !== slug) history.replaceState(null, '', '#' + slug);
        }
      } catch (_) {}
      return r;
    };
    // carry over flags other wrappers check so we don't cause a re-wrap
    for (var k in orig) { try { wrapped[k] = orig[k]; } catch (_) {} }
    wrapped.__urlRouted = true;
    App.switchView = wrapped;
  }

  window.addEventListener('hashchange', function () { if (!_suppress) applyHash(); });

  function boot() {
    wrap();
    if (!cleanHash()) return; // no deep link -> leave the normal boot landing alone
    // Apply the deep link, then re-assert briefly to beat boot-time auto-landers.
    var tries = 0;
    (function tick() {
      applyHash();
      if (++tries < 24) setTimeout(tick, 80); // ~1.9s window
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // small public surface for debugging / programmatic deep-linking
  window.UrlRouting = { applyHash: applyHash, slugForView: slugForView, resolveView: resolveView, syncNav: syncNav, ALIAS: ALIAS };

  try { console.log('[url-routing v1] installed'); } catch (_) {}
})();
/* === END URL ROUTING === */
