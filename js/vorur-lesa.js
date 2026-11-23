/* VorurLesa — ein select('*') fyrir Sala (pos.js) og Vörur (vorur.js).
   Báðar sýnir nota alla dálka. Vörur þarf allar raðir, raðað flokkur svo nafn
   (sama röð og fyrirspurnin skilaði). Sala síar virkt á biðlara og raðar aftur
   í sortTiles, svo flísaröðin breytist ekki. Ein beiðni í flugi, 60 s skyndiminni.
   Eitt svar, sama hámark PostgREST og áður (engin blaðsíðun). */
(function () {
  'use strict';
  var rows = null, inflight = null, ts = 0, gen = 0;
  var TTL = 60000;

  function ogilda() {
    rows = null;
    ts = 0;
    inflight = null;
    gen++;
  }

  function heild() {
    if (rows && (Date.now() - ts) < TTL) return Promise.resolve(rows);
    if (inflight) return inflight;
    if (!window.DB || !DB.sb) return Promise.reject(new Error('DB'));
    var my = gen;
    inflight = DB.sb.from('vorur').select('*')
      .order('flokkur', { ascending: true })
      .order('nafn', { ascending: true })
      .then(function (r) {
        if (my !== gen) return null;
        if (r && r.error) throw r.error;
        rows = (r && r.data) || [];
        ts = Date.now();
        inflight = null;
        return rows;
      }, function (e) {
        if (my === gen) inflight = null;
        throw e;
      });
    return inflight;
  }

  window.VorurLesa = { heild: heild, ogilda: ogilda };
})();
