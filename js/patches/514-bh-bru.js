/* 514-bh-bru.js — appið nær í föll Brunahólfs eftir að þau lokuðust (Powerplan lota 13, 17.11.2026).
 *
 * Föll Brunahólfs krefjast nú innskráningar á Brunahólfi EÐA tíma-tóka (brunaholf/netlify/functions/_vord.js).
 * Þessi vafri á ekki Brunahólfs-kökuna (annar vefur). Í staðinn:
 *   1. fetch á https://brunaholf.netlify.app/api/… (og /.netlify/functions/…) fær tókann:
 *      GET/HEAD → hausinn x-hub-toki (lendir ekki í annálum; vörður Brunahólfs svarar CORS-forspurninni). Hafni eldri
 *      útgáfa Brunahólfs forspurninni (TypeError) er reynt einu sinni aftur með færibreytunni _hubtoki=.
 *      POST o.fl. → færibreytan _hubtoki= (engin endurtekning, svo bilað net getur aldrei tvísent skrif).
 *   2. innfelldar Brunahólfs-síður (iframe, ?embed=1) biðja um tókann: { type:'hub-toki', id } → svar
 *      { type:'hub-toki-svar', id, toki, gildir_ms } (brunaholf/js/hub-bru.js). Aðeins skeyti frá brunaholf-uppruna.
 * Tókinn kemur úr /api/bh-toki (krefst innskráningar appsins) og er geymdur þar til mínúta er eftir af gildistímanum.
 * Takist ekki að sækja hann fer kallið óbreytt (og fær 401 ef fallið er lokað) — appið hangir aldrei á þessu.
 * Hlaðið SAMSTILLT strax á eftir config.js í index.html, svo það sé komið á undan öðrum plástrum.
 */
(function () {
  if (window.__bhBru) return;
  window.__bhBru = true;
  var BH = 'https://brunaholf.netlify.app';
  var toki = '', gildirTil = 0, bidur = null;

  function saekja() {
    if (toki && Date.now() < gildirTil - 60000) return Promise.resolve(toki);
    if (bidur) return bidur;
    bidur = upphaflegt('/api/bh-toki', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && typeof j.toki === 'string' && /^\d+\.[0-9a-f]{64}$/.test(j.toki)) {
          toki = j.toki; gildirTil = Date.now() + Math.min(Number(j.gildir_ms) || 0, 10 * 60000);
        }
        bidur = null; return toki;
      })
      .catch(function () { bidur = null; return ''; });
    return bidur;
  }

  function erBhFall(url) {
    try { var u = new URL(String(url), location.href); return u.origin === BH && /^\/(api|\.netlify\/functions)\//.test(u.pathname); }
    catch (e) { return false; }
  }
  function medToka(url, t) {
    var u = new URL(String(url), location.href);
    if (!u.searchParams.has('_hubtoki')) u.searchParams.set('_hubtoki', t);
    return u.toString();
  }

  var upphaflegt = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' || input instanceof URL ? String(input) : (input && input.url);
    if (!erBhFall(url)) return upphaflegt(input, init);
    return saekja().then(function (t) {
      if (!t) return upphaflegt(input, init);
      var medFaeribreytu = function () {
        if (typeof input === 'string' || input instanceof URL) return upphaflegt(medToka(url, t), init);
        return upphaflegt(new Request(medToka(url, t), input), init);
      };
      var adferd = String((init && init.method) || (input && typeof input === 'object' && input.method) || 'GET').toUpperCase();
      if (adferd !== 'GET' && adferd !== 'HEAD') return medFaeribreytu();
      var hausar = new Headers((init && init.headers) || (input && typeof input === 'object' && input.headers) || {});
      if (!hausar.has('x-hub-toki')) hausar.set('x-hub-toki', t);
      return upphaflegt(input, Object.assign({}, init || {}, { headers: hausar })).catch(function (e) {
        if (e && e.name === 'AbortError') throw e;
        return medFaeribreytu();
      });
    });
  };

  // Innfelldar Brunahólfs-síður biðja um tókann (brunaholf/js/hub-bru.js)
  window.addEventListener('message', function (e) {
    if (e.origin !== BH || !e.source) return;
    var d = e.data || {};
    if (d.type !== 'hub-toki' || typeof d.id !== 'string' || d.id.length > 80) return;
    saekja().then(function (t) {
      try { e.source.postMessage({ type: 'hub-toki-svar', id: d.id, toki: t || '', gildir_ms: t ? Math.max(0, gildirTil - Date.now()) : 0 }, BH); } catch (_) {}
    });
  });

  window.bhSlodMedToka = function (url) { return saekja().then(function (t) { return t ? medToka(url, t) : String(url); }); };
})();
