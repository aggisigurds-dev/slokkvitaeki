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

  /* ── EIN SKRIFLEIÐ, SAMEINUÐ VIÐ FERSKA RÖÐ (05.10.2026) ──
   * Þrír staðir skrifuðu ALLA röðina (hæðir, skurð, merki) úr minni vafrans án þess að líta á þjóninn: Vista (hér),
   * hver færsla merkis (433) og „Opna í TurboPaint" (383). Gluggi sem stóð opinn í símanum skrifaði því yfir það sem
   * önnur vél hafði gert á meðan — skurð, nýja hæð, merki á sömu hæð — þegjandi (SAMSTILLT MILLI VÉLA: fjórar tölvur
   * og sími í sömu gögnum). Nú fer allt um skrifa(): röðin er lesin fersk rétt fyrir skrif, og hafi einhver annar
   * skrifað síðan þessi vafri sá hana síðast (_sed) er sameinað í stað þess að yfirskrifa:
   *   • stillingar hæðar (skurður, Skýrari/fest, veggir, eldVal …) koma af þjóninum — þær vistar 383 sér, jafnóðum;
   *   • merki þessa vafra standa; merki sem ÖNNUR vél bætti við á sömu hæð haldast; merki sem var eytt HÉR kemur ekki aftur;
   *   • hæð sem önnur vél bætti við helst; hæð sem var eytt HÉR kemur ekki aftur; tæki er aðeins á einni hæð.
   * Eftir sameinuð skrif er ritillinn uppfærður með niðurstöðunni, svo næstu skrif byggi ekki á úreltu minni. */
  var _sed = {};      // cid → { t, ids, merki } — röðin eins og ÞESSI vafri sá hana síðast (sókn eða eigin skrif)
  function timi(t) { var n = Date.parse(t); return isNaN(n) ? 0 : n; }
  function sja(cid, updated_at, haedir) {
    var hs = Array.isArray(haedir) ? haedir : [], merki = {};
    hs.forEach(function (h) { if (h && h.id) merki[h.id] = (h.markers || []).map(function (m) { return m && m.unitId != null ? String(m.unitId) : null; }).filter(Boolean); });
    _sed[cid] = { t: timi(updated_at), ids: hs.map(function (h) { return h && h.id; }).filter(Boolean), merki: merki };
  }
  // HREIN: hæðir þessa vafra (minar) ofan á ferskar hæðir þjónsins. sed = það sem þessi vafri sá síðast, eða null.
  function sameinaVidFerska(minar, ferskar, sed) {
    if (!Array.isArray(ferskar) || !ferskar.length) return minar;
    if (!Array.isArray(minar) || !minar.length) return ferskar;
    var lyk = function (m) { return m && m.unitId != null ? String(m.unitId) : null; };
    var eftirId = {}; ferskar.forEach(function (f) { if (f && f.id) eftirId[f.id] = f; });
    var notad = {}, minMerki = {};
    minar.forEach(function (l) { ((l && l.markers) || []).forEach(function (m) { var k = lyk(m); if (k) minMerki[k] = 1; }); });
    var ut = minar.map(function (l) {
      if (!l) return l;
      var f = l.id && eftirId[l.id];
      // Þessi vafri sá röðina aldrei (sed === null): auðkenni hæðar hér getur verið gervi — þá ræður sama mynd.
      if (!f && !sed) f = ferskar.filter(function (q) { return q && q.id && !notad[q.id] && !minar.some(function (o) { return o && o.id === q.id; }) && (q.image_url || null) === (l.image_url || null); })[0];
      if (!f) return l;                                                   // ný hæð hér
      notad[f.id] = 1;
      if ((l.image_url || null) !== (f.image_url || null)) return l;     // önnur mynd hér: hæðin er ný að efni
      var n = {}; Object.keys(f).forEach(function (k) { n[k] = f[k]; });  // stillingar þjónsins
      var sedHer = (sed && sed.merki && sed.merki[f.id]) || null, herna = {};
      (l.markers || []).forEach(function (m) { var k = lyk(m); if (k) herna[k] = 1; });
      n.markers = (l.markers || []).concat((f.markers || []).filter(function (m) {
        var k = lyk(m);
        if (!k || herna[k] || minMerki[k]) return false;                  // er hér þegar (þessi hæð eða önnur)
        return !(sedHer && sedHer.indexOf(k) >= 0);                       // var séð hér áður og vantar nú → eytt hér
      }));
      n.nafn = l.nafn;
      if (l.frum) n.frum = l.frum;
      if (l.stimpilStaerd !== undefined) n.stimpilStaerd = l.stimpilStaerd;
      return n;
    });
    ferskar.forEach(function (f) {
      if (!f || !f.id || notad[f.id]) return;
      if (sed && sed.ids && sed.ids.indexOf(f.id) >= 0) return;           // var séð hér áður og vantar nú → eytt hér
      var n = {}; Object.keys(f).forEach(function (k) { n[k] = f[k]; });
      n.markers = (f.markers || []).filter(function (m) { var k = lyk(m); return !k || !minMerki[k]; });
      ut.push(n);                                                         // hæð sem önnur vél bætti við
    });
    return ut;
  }
  function uppfaeraRitil(cid, row, tilraun) {
    try {
      if (!window.FloorPlan || FloorPlan.companyId !== cid) return;
      if (window.TeiknMerking && TeiknMerking.iDragi && TeiknMerking.iDragi() && (tilraun || 0) < 6) { setTimeout(function () { uppfaeraRitil(cid, row, (tilraun || 0) + 1); }, 700); return; }
      var plan = FloorPlan.plans[cid] || (FloorPlan.plans[cid] = { markers: [] });
      plan.markers = Array.isArray(row.markers) ? row.markers : [];
      if (typeof FloorPlan.__eftirSokn === 'function') FloorPlan.__eftirSokn(cid, row);
      beitaAServer(cid, row);
    } catch (e) { console.warn('[375] uppfæra ritil', e && e.message); }
  }
  // Skilar loforði um { error, sameinad }. row = { company_id, markers, image_url, updated_at, haedir? }.
  function skrifa(cid, row) {
    return new Promise(function (res) {
      if (!cid || !row || !window.DB || !DB.sb) { res({ error: new Error('engin tenging') }); return; }
      var senda = function (sameinad) {
        DB.sb.from(TAFLA).upsert(row, { onConflict: 'company_id' }).then(function (r) {
          var villa = r && r.error;
          if (!villa) {
            if (Array.isArray(row.haedir)) sja(cid, row.updated_at, row.haedir); else if (_sed[cid]) _sed[cid].t = timi(row.updated_at);
            if (sameinad) uppfaeraRitil(cid, row);
          }
          res({ error: villa || null, sameinad: !!sameinad });
        }, function (e) { res({ error: e || new Error('náði ekki í þjóninn') }); });
      };
      if (!Array.isArray(row.haedir) || !row.haedir.length) { senda(false); return; }
      DB.sb.from(TAFLA).select('haedir,updated_at').eq('company_id', cid).limit(1).then(function (r) {
        var f = r && !r.error && r.data && r.data[0], s = _sed[cid] || null;
        if (f && Array.isArray(f.haedir) && f.haedir.length && (!s || timi(f.updated_at) !== s.t)) {
          row.haedir = sameinaVidFerska(row.haedir, f.haedir, s);
          row.markers = (row.haedir[0] && row.haedir[0].markers) || [];
          row.image_url = (row.haedir[0] && typeof row.haedir[0].image_url === 'string' && row.haedir[0].image_url) || row.image_url || null;
          console.info('[375] röðin hafði breyst á þjóninum — sameinað í stað þess að yfirskrifa');
          senda(true);
        } else senda(false);
      }, function () { senda(false); });
    });
  }
  window.TeiknVistun = { skrifa: skrifa, sja: sja, sameinaVidFerska: sameinaVidFerska };

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
      skrifa(cid, row).then(function (r) {
        if (r && r.error) { console.warn('[375] upsert', r.error.message); segja('⚠ Teikningin vistaðist AÐEINS í þessum vafra — ' + (r.error.message || 'náði ekki í þjóninn')); return; }
        if (Array.isArray(row.haedir)) fjoldi = row.haedir.reduce(function (n, h) { return n + ((h.markers || []).length); }, 0);
        segja('Teikning vistuð ✓ — ' + fjoldi + ' staðsetningar' + (row.haedir && row.haedir.length > 1 ? ' á ' + row.haedir.length + ' hæðum' : '') +
          (r && r.sameinad ? ', sameinað við breytingar úr annarri vél' : ', sést á öllum vélum'));
      });
    } catch (e) { console.warn('[375] upsert', e && e.message); }
  }

  function beitaAServer(cid, row) {
    var virk = (window.TeiknBord && typeof TeiknBord.virk === 'function') ? TeiknBord.virk() : 0;
    if (virk !== 0) {
      try { FloorPlan._renderCanvas(); FloorPlan._renderPanel(); } catch (_) {}
      return;
    }
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
      if (window.TeiknGaedi && TeiknGaedi.bindSrc) TeiknGaedi.bindSrc(img, row.image_url);
      else if (window.TeiknSja && TeiknSja.bindSrc) TeiknSja.bindSrc(img, row.image_url);
      else img.src = row.image_url;
    } else {
      try { FloorPlan._renderCanvas(); FloorPlan._renderPanel(); } catch (_) {}
    }
  }

  function serverFetch(cid) {
    if (!cid || !window.DB || !DB.sb) return;
    try {
      DB.sb.from(TAFLA).select('markers,image_url,haedir,updated_at').eq('company_id', cid).limit(1)
        .then(function (r) {
          // 374 bíður eftir þessu áður en það ályktar að engin teikning sé til (annars opnaðist „Sækja teikningu"
          // yfir teikningunni ef röð þjónsins var lengur en 0,7 s á leiðinni — fyrsta opnun án skyndiminnis).
          FloorPlan.__soknLokid = cid;
          if (!r || r.error || !r.data || !r.data.length) return;
          var row = r.data[0];
          sja(cid, row.updated_at, row.haedir);
          var plan = FloorPlan.plans[cid] || (FloorPlan.plans[cid] = { markers: [] });
          plan.markers = Array.isArray(row.markers) ? row.markers : [];
          if (row.image_url) plan.imageUrl = row.image_url;
          // 04.10.2026: hæðirnar (skurður, Skýrari/fest, veggir) fylgja skyndiminninu — annars opnaðist glugginn með allt
          // blaðið og án Skýrari veggja þangað til röð þjónsins barst (15–40 s á prófílnum, Agnar: „open sooner").
          try {
            localStorage.setItem('fp_' + cid, JSON.stringify({
              markers: plan.markers, imageUrl: plan.imageUrl,
              haedir: Array.isArray(row.haedir) && row.haedir.length ? row.haedir : undefined
            }));
          } catch (_) {}
          // 383: hæðirnar fylgja röðinni; merkin eru hér í frummyndarhnitum (ritillinn hliðrar þeim sjálfur við skurð).
          try { if (typeof FloorPlan.__eftirSokn === 'function') FloorPlan.__eftirSokn(cid, row); } catch (_) {}
          if (FloorPlan.companyId === cid) beitaAServer(cid, row);   // borðið opið → uppfæra sýn
        }, function () { FloorPlan.__soknLokid = cid; });
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
