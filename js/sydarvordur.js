/* SÝNDARVÖRÐUR (451, 09.10.2026) — sýndarfyrirtækið má ALDREI valda skrifi á þjóninn.
 *
 * „Greining fasteignar" (js/patches/451-greining-fasteignar.js) opnar RAUNVERULEGA fyrirtækjaprófílinn
 * (Companies.openDetail — sama teikning og #company/<id>) fyrir heimilisfang sem er EKKI viðskiptavinur: „tómur prófíll
 * með smá extra" (Agnar 09.10.2026). Til þess fær Companies.list tímabundna röð með auðkenninu -987654321. Prófílpappar
 * skrifa sumir við opnun — mælt 09.10.2026 í Playwright: app_settings_merge (co_bygging_mynd[-98765]) 1,3 s eftir
 * opnun — og hver takki á prófílnum (Athugasemd, Breyta, + Bæta við tæki, Teikning …) skrifar á auðkenni fyrirtækisins.
 *
 * Þess vegna EIN vörn á lægsta stigi, ekki í hverjum pappa: þessi skrá vefur window.fetch, XMLHttpRequest og
 * navigator.sendBeacon ÁÐUR en rest-samnyting.js og db.js hlaðast (supabase-js grípur fetch við createClient, svo
 * allar fyrirspurnir biðlarans fara hér í gegn). Beiðni sem er ekki GET/HEAD/OPTIONS og ber töluna 987654321 í slóð
 * eða meginmáli (eq.-987654321, {"-987654321":…}, fyrirtaeki_id:-987654321, turbopaint/…/-987654321/) er STÖÐVUÐ áður
 * en hún fer: henni er svarað með 403 og villuboðum sem PostgREST-biðlarinn skilar sem `.error`. Talan er valin svo
 * hún geti ekki komið fyrir í lögmætu skrifi (níu stafa neikvæð upphæð = −987 milljónir kr; ekki kennitala, ekki sími).
 * Vörðurinn er ALLTAF virkur — óháð því hvort sýndarprófíllinn sést — svo röð sem lifir einhvers staðar (leitarbox,
 * Sala) geti aldrei orðið að sölu eða tæki.
 *
 * Meðan sýndarprófíllinn er á skjánum (Sydarvordur.virkt) eru ÖNNUR skrif skráð (ekki stöðvuð) í Sydarvordur.adrir —
 * prófið les þann lista og krefst þess að hann sé tómur eftir opnun, smelli og 30 s kyrrstöðu.
 * Engin gögn, enginn vafralykill. Slökkva er ekki í boði.
 */
(function () {
  'use strict';
  if (window.Sydarvordur) return;
  var ID = -987654321;
  // Talan sem HEIL tala (á undan: ekki tölustafur né punktur; á eftir: ekki tölustafur) — „eq.-987654321", „%2D987654321",
  // „/-987654321/", {"-987654321":…}, "fyrirtaeki_id":-987654321. Brot úr kommutölu („0,1987654321" í hnitum/veggjum
  // teikningar) passar ALDREI, svo stór vistun með þúsundum talna stöðvast ekki fyrir tilviljun.
  var TAKN = /(?:^|[^0-9.])987654321(?![0-9])/;
  var LES = { GET: 1, HEAD: 1, OPTIONS: 1 };
  var gripid = [], adrir = [];
  var V = { ID: ID, virkt: false, gripid: gripid, adrir: adrir };

  function slodAf(u) { try { return typeof u === 'string' ? u : (u && u.url) || String(u || ''); } catch (_) { return ''; } }
  function erThjonn(slod) {
    // Supabase (rest, storage, rpc, functions) og okkar eigin föll / API — annað (t.d. kortaflísar) skrifar ekki.
    return /supabase\.co\//.test(slod) || /\/\.netlify\/functions\//.test(slod) || /(^|\/\/[^/]+)\/api\//.test(slod);
  }
  function meginmal(b) {
    if (b == null) return '';
    if (typeof b === 'string') return b;
    try { if (b instanceof URLSearchParams) return b.toString(); } catch (_) {}
    try { if (typeof FormData !== 'undefined' && b instanceof FormData) { var t = ''; b.forEach(function (v, k) { t += k + '=' + (typeof v === 'string' ? v : '') + '&'; }); return t; } } catch (_) {}
    return '';   // Blob/ArrayBuffer (myndir): slóðin ræður (geymsluslóðin ber auðkennið)
  }
  function metaSkrif(adf, slod, body, hvadan) {
    var a = String(adf || 'GET').toUpperCase();
    if (LES[a]) return null;
    var skraUt = String(slod || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 200);
    if (TAKN.test(slod) || TAKN.test(decodeURIComponentSafe(slod)) || TAKN.test(meginmal(body))) {
      var f = { t: Date.now(), adferd: a, slod: skraUt, hvadan: hvadan };
      gripid.push(f); if (gripid.length > 200) gripid.shift();
      try { console.warn('[sýndarvörður] stöðvaði skrif á sýndarfyrirtækið', a, skraUt); } catch (_) {}
      try { document.dispatchEvent(new CustomEvent('sydar-skrif-stodvad', { detail: f })); } catch (_) {}
      return f;
    }
    if (V.virkt && erThjonn(String(slod || ''))) {
      adrir.push({ t: Date.now(), adferd: a, slod: skraUt, hvadan: hvadan });
      if (adrir.length > 200) adrir.shift();
    }
    return null;
  }
  function decodeURIComponentSafe(s) { try { return decodeURIComponent(String(s || '')); } catch (_) { return String(s || ''); } }
  var SVAR = JSON.stringify({ code: 'SYNDARVORDUR', message: 'Sýndarfyrirtæki (Greining fasteignar) — ekkert vistað', details: null, hint: null });

  // ── fetch ───────────────────────────────────────────────────────────────────
  try {
    var f0 = window.fetch;
    if (typeof f0 === 'function') {
      window.fetch = function (u, o) {
        try {
          var adf = (o && o.method) || (u && typeof u === 'object' && u.method) || 'GET';
          if (metaSkrif(adf, slodAf(u), o && o.body, 'fetch')) {
            return Promise.resolve(new Response(SVAR, { status: 403, statusText: 'Synd', headers: { 'Content-Type': 'application/json' } }));
          }
        } catch (_) {}
        return f0.apply(this, arguments);
      };
    }
  } catch (_) {}

  // ── XMLHttpRequest ──────────────────────────────────────────────────────────
  try {
    var XP = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
    if (XP) {
      var opna0 = XP.open, senda0 = XP.send;
      XP.open = function (adf, slod) { this.__sydAdf = adf; this.__sydSlod = slod; return opna0.apply(this, arguments); };
      XP.send = function (b) {
        if (metaSkrif(this.__sydAdf, this.__sydSlod, b, 'xhr')) {
          var x = this;
          setTimeout(function () { try { x.abort(); } catch (_) {} try { if (typeof x.onerror === 'function') x.onerror(new Event('error')); } catch (_) {} }, 0);
          return;
        }
        return senda0.apply(this, arguments);
      };
    }
  } catch (_) {}

  // ── sendBeacon ──────────────────────────────────────────────────────────────
  try {
    if (navigator.sendBeacon) {
      var b0 = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (slod, gogn) {
        if (metaSkrif('POST', slod, gogn, 'beacon')) return true;
        return b0(slod, gogn);
      };
    }
  } catch (_) {}

  V.er = function (id) { return Number(id) === ID; };
  V.metaSkrif = metaSkrif;          // prófið og 451 nota sömu reglu
  window.Sydarvordur = V;
})();
