/* 375 — Teikning-borð: vista staðsetningar á ÞJÓN (Supabase) svo þær berist milli
 * allra 4 vélanna (SAMSTILLT MILLI VÉLA). Áður var eingöngu localStorage per vafra.
 *
 * Skreytir FloorPlan (js/scanner.js):
 *   • save  → upsert á public.teikning_bord (auk localStorage sem áður).
 *   • load  → localStorage strax (offline) OG sókn á þjón sem RÆÐUR (berst milli véla).
 * Markers eru í native-pixlum myndarinnar — sama og modal-borðið notar.
 * Hleðst á EFTIR newfeatures.js (sem breytir blob:→dataURL á save) og patch 374.
 */
(function () {
  if (window.__teiknVistunSett) return;
  window.__teiknVistunSett = true;

  var TAFLA = 'teikning_bord';

  function serverUpsert(cid, plan) {
    if (!cid || !plan || !window.DB || !DB.sb) return;
    var row = {
      company_id: cid,
      markers: plan.markers || [],
      image_url: plan.imageUrl || null,
      updated_at: new Date().toISOString()
    };
    // 20.09.2026 (383): hæðir, skurður og handdregnir veggir. markers/image_url hér að ofan spegla FYRSTU hæð svo
    // eldri biðlarar og 109-borðinn virka óbreyttir. Reiturinn er aðeins sendur þegar ritillinn á hæðir — biðlari
    // án 383 má ekki núlla hæðir sem önnur vél vistaði.
    var fjoldi = row.markers.length;
    if (Array.isArray(plan.haedir) && plan.haedir.length) {
      row.haedir = plan.haedir;
      fjoldi = plan.haedir.reduce(function (n, h) { return n + ((h.markers || []).length); }, 0);
    }
    try {
      // 20.09.2026: grunn-save (scanner.js) segir „aðeins í þessum vafra — sést ekki á hinum vélunum". Það var satt
      // áður en þessi patch kom; nú fer teikningin á þjóninn og tilkynningin laug. Niðurstaða skrifanna ræður textanum.
      var segja = function (t) { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
      DB.sb.from(TAFLA).upsert(row, { onConflict: 'company_id' }).then(function (r) {
        if (r && r.error) { console.warn('[375] upsert', r.error.message); segja('⚠ Teikningin vistaðist AÐEINS í þessum vafra — þjónninn hafnaði: ' + r.error.message); }
        else segja('Teikning vistuð ✓ — ' + fjoldi + ' staðsetningar' + (row.haedir && row.haedir.length > 1 ? ' á ' + row.haedir.length + ' hæðum' : '') + ', sést á öllum vélum');
      }, function (e) { console.warn('[375] upsert', e && e.message); segja('⚠ Teikningin vistaðist AÐEINS í þessum vafra — náði ekki í þjóninn.'); });
    } catch (e) { console.warn('[375] upsert', e && e.message); }
  }

  function beitaAServer(cid, row) {
    var c = document.getElementById('fp-canvas');
    if (row.image_url && FloorPlan._srvImg !== row.image_url) {
      FloorPlan._srvImg = row.image_url;
      var img = new Image();
      img.onload = function () {
        if (FloorPlan.companyId !== cid) return;
        FloorPlan.bgImage = img;
        if (c) c.style.display = 'block';
        var dm = document.getElementById('fp-drop-msg'); if (dm) dm.style.display = 'none';
        try { FloorPlan._renderCanvas(); FloorPlan._renderPanel(); } catch (_) {}
      };
      img.src = row.image_url;
    } else {
      try { FloorPlan._renderCanvas(); FloorPlan._renderPanel(); } catch (_) {}
    }
  }

  function serverFetch(cid) {
    if (!cid || !window.DB || !DB.sb) return;
    try {
      DB.sb.from(TAFLA).select('markers,image_url,haedir,updated_at').eq('company_id', cid).limit(1)
        .then(function (r) {
          if (!r || r.error || !r.data || !r.data.length) return;
          var row = r.data[0];
          var plan = FloorPlan.plans[cid] || (FloorPlan.plans[cid] = { markers: [] });
          plan.markers = Array.isArray(row.markers) ? row.markers : [];
          if (row.image_url) plan.imageUrl = row.image_url;
          try { localStorage.setItem('fp_' + cid, JSON.stringify({ markers: plan.markers, imageUrl: plan.imageUrl })); } catch (_) {}
          // 383: hæðirnar fylgja röðinni; merkin eru hér í frummyndarhnitum (ritillinn hliðrar þeim sjálfur við skurð).
          try { if (typeof FloorPlan.__eftirSokn === 'function') FloorPlan.__eftirSokn(cid, row); } catch (_) {}
          if (FloorPlan.companyId === cid) beitaAServer(cid, row);   // borðið opið → uppfæra sýn
        }, function () {});
    } catch (_) {}
  }

  function skreyta() {
    if (!window.FloorPlan) return false;
    if (FloorPlan.__vistunSkreytt) return true;
    if (typeof FloorPlan.save !== 'function' || typeof FloorPlan.load !== 'function') return false;

    var _save = FloorPlan.save.bind(FloorPlan);   // = newfeatures-útgáfan
    FloorPlan.save = function () {
      var self = this, cid = this.companyId, plan = this.plans[cid] || {};
      var klara = function () { _save.call(self); serverUpsert(cid, self.plans[cid] || plan); };
      // blob: → dataURL FYRST svo bæði localStorage og þjónn fái myndina (og
      // newfeatures sjái ekki blob). Sama umbreyting og newfeatures notar.
      if (plan.imageUrl && plan.imageUrl.indexOf('blob:') === 0) {
        var img = new Image();
        img.onload = function () {
          try {
            var cv = document.createElement('canvas');
            var w = Math.min(img.naturalWidth, 1600), h = Math.round(img.naturalHeight * w / img.naturalWidth);
            cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
            plan.imageUrl = cv.toDataURL('image/jpeg', 0.75);
          } catch (_) {}
          klara();
        };
        img.onerror = klara;
        img.src = plan.imageUrl;
      } else { klara(); }
    };

    var _load = FloorPlan.load.bind(FloorPlan);
    FloorPlan.load = function (cid) {
      _load(cid);          // localStorage strax (offline / skyndiminni)
      serverFetch(cid);    // þjónn ræður — berst milli véla
    };

    FloorPlan.__vistunSkreytt = true;
    return true;
  }

  if (!skreyta()) {
    var reyn = 0;
    var i = setInterval(function () { if (skreyta() || ++reyn > 40) clearInterval(i); }, 150);
  }
})();
