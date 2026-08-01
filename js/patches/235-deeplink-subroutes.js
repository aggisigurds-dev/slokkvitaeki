/* === DEEP-LINK SUB-ROUTES (per-item links) v1 ===
 *
 * Patch 218 (url-routing) covers top-level views: #sala, #companies, #bakendi
 * etc. This patch adds links to specific items inside those views — so 3-4
 * people can paste a URL and land on the exact company/sale/tæki/verkbeiðni
 * they're talking about.
 *
 *   slokkvitaeki.netlify.app/#company/123        → Companies.openDetail(123)
 *   slokkvitaeki.netlify.app/#unit/A1234         → showUnitDetail("A1234")
 *   slokkvitaeki.netlify.app/#sale/R-000244      → opens that sale in a popup
 *   slokkvitaeki.netlify.app/#verkbeidni/V-1234  → opens the workshop card
 *
 * Coexistence with patch 218
 *  - Patch 218 ignores `/`-containing hashes (it returns '' from cleanHash),
 *    so it leaves every #thing/<arg> link alone for us. No edit to 218.
 *  - On a sub-route we ALSO call App.switchView(parentView) first so the
 *    underlying page is mounted (e.g. #company/123 puts us on Companies
 *    before opening the detail). The parent slug ends up in the hash via
 *    218's wrapper, then we replaceState it back to the full sub-route.
 *
 * Registering more sub-routes
 *   SubRoutes.register('thing', {
 *     parent: 'companies',                  // top-level view slug to switch to
 *     open:   id => Things.open(Number(id)) // how to open the item
 *   });
 *   // …and call SubRoutes.setHash('thing', id) from your open fn so
 *   //    clicking through writes the deep-link URL too.
 */
(() => {
  if (window.__deeplinkSubroutesInstalled) return;
  window.__deeplinkSubroutesInstalled = true;

  var ROUTES = {};        // name -> { parent, open }
  var _suppress = false;  // guard the open↔hash feedback loop

  // ── parsing ────────────────────────────────────────────────────────────────
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    if (!h || h.indexOf('=') !== -1 || h.indexOf('view-') === 0) return null;
    var i = h.indexOf('/');
    if (i < 0) return null;
    var name = h.slice(0, i);
    var rest = h.slice(i + 1);
    if (!name || !rest) return null;
    return { name: name, args: rest.split('/').filter(Boolean) };
  }

  function setHash(name, arg) {
    var want = '#' + name + '/' + encodeURIComponent(String(arg));
    if (location.hash !== want) {
      try { history.replaceState(null, '', want); } catch (_) {}
    }
  }

  // ── apply current hash ────────────────────────────────────────────────────
  function apply() {
    var p = parseHash(); if (!p) return;
    var route = ROUTES[p.name]; if (!route) return;
    _suppress = true;
    try {
      // Mount the parent view first so the open fn has somewhere to render.
      if (route.parent && window.App && typeof App.switchView === 'function') {
        var active = document.querySelector('.view.active');
        var parentViewId = (window.UrlRouting && UrlRouting.resolveView)
          ? UrlRouting.resolveView(route.parent) : route.parent;
        if (!active || active.id !== 'view-' + parentViewId) {
          try { App.switchView(parentViewId); } catch (_) {}
        }
      }
      var arg = decodeURIComponent(p.args[0] || '');
      // Allow openers to be async; we don't need to await — just don't crash.
      Promise.resolve().then(function () {
        try { route.open(arg, p.args); } catch (e) { console.warn('[subroutes] open', p.name, e); }
      });
      // Re-write the deep hash AFTER switchView clobbered it with the parent slug.
      setTimeout(function () { setHash(p.name, p.args[0] || ''); }, 0);
    } finally {
      _suppress = false;
    }
  }

  // ── public surface ────────────────────────────────────────────────────────
  var SubRoutes = {
    register: function (name, def) {
      if (!name || !def || typeof def.open !== 'function') return;
      ROUTES[name] = { parent: def.parent || '', open: def.open };
    },
    setHash: setHash,
    apply: apply,
    _routes: ROUTES
  };
  window.SubRoutes = SubRoutes;

  // ── built-in routes ───────────────────────────────────────────────────────
  // Company: #company/<id>
  SubRoutes.register('company', {
    parent: 'companies',
    open: function (id) {
      var n = Number(id); if (!n) return;
      if (!window.Companies || typeof Companies.openDetail !== 'function') {
        setTimeout(function () { SubRoutes.apply(); }, 200); return;
      }
      Companies.openDetail(n);
    }
  });
  // Mirror Companies.openDetail clicks into the hash.
  function wrapCompanies() {
    if (!window.Companies || typeof Companies.openDetail !== 'function') {
      setTimeout(wrapCompanies, 200); return;
    }
    if (Companies.openDetail.__subRouted) return;
    var orig = Companies.openDetail;
    var wrapped = function (id) {
      var r = orig.apply(this, arguments);
      if (!_suppress && id != null) setHash('company', id);
      return r;
    };
    for (var k in orig) { try { wrapped[k] = orig[k]; } catch (_) {} }
    wrapped.__subRouted = true;
    Companies.openDetail = wrapped;
  }

  // Tæki: #unit/<serial>  (serials are user-visible + stable, better than db id)
  SubRoutes.register('unit', {
    parent: '',  // unit-detail is a modal — no parent view to switch
    open: function (serial) {
      if (!serial) return;
      if (typeof window.showUnitDetail !== 'function') {
        setTimeout(function () { SubRoutes.apply(); }, 200); return;
      }
      window.showUnitDetail(serial);
    }
  });
  function wrapUnitDetail() {
    if (typeof window.showUnitDetail !== 'function') {
      setTimeout(wrapUnitDetail, 200); return;
    }
    if (window.showUnitDetail.__subRouted) return;
    var orig = window.showUnitDetail;
    var wrapped = function (serial) {
      var r = orig.apply(this, arguments);
      if (!_suppress && serial) setHash('unit', serial);
      return r;
    };
    for (var k in orig) { try { wrapped[k] = orig[k]; } catch (_) {} }
    wrapped.__subRouted = true;
    window.showUnitDetail = wrapped;
  }

  // Sala: #sale/<num>  (R-000244, K-000005 …). Opens the same popup the
  // Bókhalds-yfirlit / Hreyfingar lists use, in a new window.
  SubRoutes.register('sale', {
    parent: 'bokhalds-yfirlit',
    open: async function (num) {
      if (!num) return;
      var SB = (window.DB && DB.sb) || null;
      if (!SB || !window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') {
        setTimeout(function () { SubRoutes.apply(); }, 250); return;
      }
      var w = window.open('', '_blank', 'width=900,height=1100');
      if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að opna reikning.'); return; }
      var r = await SB.from('solur').select('*').eq('num', String(num).trim()).maybeSingle();
      if (!r || r.error || !r.data) { w.close(); alert('Salan fannst ekki: ' + num); return; }
      var sale = r.data, cust = null;
      if (sale.customer_id) {
        // fyrirtaeki + vidskiptavinir have independent bigserials → low ids
        // overlap. Pull both and disambiguate by matching sale.customer_nafn.
        var bothRes = await Promise.all([
          SB.from('fyrirtaeki').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
          SB.from('vidskiptavinir').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
        ]);
        var f = bothRes[0].data, v = bothRes[1].data;
        var norm = function (s) { return String(s || '').trim().toLowerCase(); };
        var saleNafn = norm(sale.customer_nafn);
        if (saleNafn) {
          if (f && norm(f.nafn) === saleNafn) cust = f;
          else if (v && norm(v.nafn) === saleNafn) cust = v;
        }
        if (!cust) cust = f || v || null;
      }
      SalaInvoice.renderFromSale(w, sale, cust);
    }
  });

  // Verkbeiðni: #verkbeidni/<num>  → drop the user on Afgreiðsla with the
  // beiðninúmer in the search box. We don't currently have an "open one"
  // fn for the workshop card, so this is the most useful target today.
  SubRoutes.register('verkbeidni', {
    parent: 'counter',  // 'afgreidsla'
    open: function (num) {
      if (!num) return;
      // Try a few likely search inputs in the Afgreiðsla view.
      var sel = '#view-counter input[type="search"], #view-counter input[placeholder*="leita" i], #view-counter input[placeholder*="númer" i]';
      var tries = 0;
      (function tick() {
        var inp = document.querySelector(sel);
        if (inp) {
          inp.focus();
          inp.value = String(num);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
        if (++tries < 25) setTimeout(tick, 100);
      })();
    }
  });

  // ── wiring ────────────────────────────────────────────────────────────────
  function boot() {
    wrapCompanies();
    wrapUnitDetail();
    // First apply runs after a tick so patch 218 finishes its own boot.
    setTimeout(apply, 60);
  }
  window.addEventListener('hashchange', function () { if (!_suppress) apply(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  try { console.log('[deeplink-subroutes v1] installed'); } catch (_) {}
})();
/* === END DEEP-LINK SUB-ROUTES === */
