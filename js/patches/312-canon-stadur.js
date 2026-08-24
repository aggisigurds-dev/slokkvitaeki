/* === 312 CANON STAÐUR — EIN uppspretta skoðunarmánaðar + tækjafjölda === */
/*
  Agnar, mikilvægasta reglan: „verður alllt að reiknast og syncast saman og taka
  gögn af sama stað." Þessi skrá ER sá staður fyrir SKOÐUNARMÁNUÐ og TÆKJAFJÖLDA
  hvers fyrirtækis/staðar.

  Les DB-viewið `v_stadur_yfirlit` (ein röð per fyrirtaeki_id) EINU SINNI og deilir
  með ÖLLUM flötum sem sýna „næstu skoðun" á fyrirtækis-/staðar-stigi:
    · 175 Rekstrarfélög        · 185 Í þjónustu (yfirlit)
    · companieslist (Öll fyrirtæki)  · 89 mánaðar-röð (hvaða mánuð fyrirtæki lendir í)
    · 77 gjaldfallið (hópað á fyrirtæki)

  GUIDE RULE (Agnar): „virk tæki hafa enga þýðingu. eru bara tómar dauðar tölur.
  skýrsla og invoice ráða alltaf." Þess vegna:
    · SKOÐUNARMÁNUÐUR kemur AÐEINS úr skýrslu/reikningi (inspect_month + report/
      invoice-ár úr v_stadur_yfirlit). Enginn slíkur → ÓÞEKKT (null). ALDREI
      nafna-strengs-dagsetning úr uttaeki.next_insp (t.d. janúar hjá Arnarhvoli).
    · TÆKJAFJÖLDI kemur úr skýrslu > reikningur > handvirkt (taeki_count). Sé hann
      ekki til → null (kallandi má þá halda sínu fyrra best-giski, en ALDREI falsa 0).

  Öryggismál: rangur mánuður = gleymd skoðun = brunahætta. Þess vegna er þetta
  einn staður, prófaður, frekar en sama formúlan afrituð í 5 skrár þar sem hún
  rekur í sundur.

  Notkun (kallandi bíður eftir ready() í async-innkomu, les svo samstillt):
      await window.CanonStadur.ready();
      var d = CanonStadur.nextDateOf(co.id);   // 'YYYY-MM-01' eða null
      var n = CanonStadur.countOf(co.id);       // tala eða null
*/
(function(){ 'use strict';
  var _map = null;   // { <fyrirtaeki_id>: row }
  var _p = null;     // in-flight load promise
  var _at = 0;       // tími síðustu VELHEPPNUÐU hleðslu (ms)
  var TTL = 60000;   // endurles eftir 60 s

  function _sb(){ return (window.DB && DB.sb) || window.__vdaSB || null; }

  async function _load(){
    var SB = _sb();
    if(!SB) return {};
    var cols = 'fyrirtaeki_id,taeki_count,inspect_month,report_year,invoice_year,count_source';
    var rows = [];
    try {
      if(window.DB && DB.fetchAll){
        rows = await DB.fetchAll(function(from,to){
          return SB.from('v_stadur_yfirlit').select(cols).order('fyrirtaeki_id').range(from,to);
        });
      } else {
        var from = 0;
        while(true){
          var r = await SB.from('v_stadur_yfirlit').select(cols).order('fyrirtaeki_id').range(from, from+999);
          if(r.error) break;
          rows = rows.concat(r.data || []);
          if(!r.data || r.data.length < 1000) break;
          from += 1000; if(from > 50000) break;
        }
      }
    } catch(e){ console.warn('[CanonStadur] load villa', e); }
    var m = {};
    (rows||[]).forEach(function(c){ if(c && c.fyrirtaeki_id != null) m[String(c.fyrirtaeki_id)] = c; });
    return m;
  }

  // Skilar promise sem leysist í kortið. Cache-ar VELHEPPNAÐA (non-tóma) hleðslu í
  // TTL; við tóma/villu endurles næsta kall (cache ekki eitrað).
  function ready(){
    if(_map && Object.keys(_map).length && (Date.now()-_at) < TTL) return Promise.resolve(_map);
    if(_p) return _p;
    _p = _load().then(function(m){
      _p = null;
      _map = m || {};
      _at = (m && Object.keys(m).length) ? Date.now() : 0;   // _at=0 → endurles næst
      return _map;
    }).catch(function(){ _p = null; _map = _map || {}; _at = 0; return _map; });
    return _p;
  }

  function rowOf(id){ return (_map && id != null) ? (_map[String(id)] || null) : null; }

  // Skoðunarmánuður sem dagsetning 'YYYY-MM-01' — AÐEINS skýrsla/reikningur, annars null.
  // (Sama formúla og prófíllinn/153 byggja á: síðasta skýrslu-/reikningsár + 1.)
  function nextDateOf(id){
    var c = rowOf(id); if(!c) return null;
    var mm = +c.inspect_month || 0; if(!(mm >= 1 && mm <= 12)) return null;
    var baseY = Math.max(+c.report_year || 0, +c.invoice_year || 0);
    var yr = baseY > 0 ? baseY + 1 : new Date().getFullYear();
    return yr + '-' + ('0'+mm).slice(-2) + '-01';
  }

  function monthOf(id){ var c = rowOf(id); var mm = c ? (+c.inspect_month || 0) : 0; return (mm>=1 && mm<=12) ? mm : null; }
  function yearOf(id){ var d = nextDateOf(id); return d ? +d.slice(0,4) : null; }
  function countOf(id){ var c = rowOf(id); return (c && c.taeki_count != null) ? +c.taeki_count : null; }
  function sourceOf(id){ var c = rowOf(id); return c ? (c.count_source || null) : null; }

  window.CanonStadur = {
    ready: ready,
    rowOf: rowOf,
    nextDateOf: nextDateOf,
    monthOf: monthOf,
    yearOf: yearOf,
    countOf: countOf,
    sourceOf: sourceOf,
    invalidate: function(){ _map = null; _at = 0; }
  };
  console.log('[CanonStadur] 312 loaded — ein uppspretta skoðunarmánaðar');
})();
/* === END 312 CANON STAÐUR === */
