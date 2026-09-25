/* REST-SAMNÝTING (21.09.2026, afköst) — eins GET-fyrirspurn á Supabase innan 2 sek. endurnýtir svarið.
 *
 * Af hverju: mælt á lifandi fyrirtækjaspjaldi 21.09.2026 — EIN opnun sendi 100 REST-köll. Spjaldið teiknar sig þrisvar á
 * fyrstu ~2 sek. og hver kafli sækir sömu gögnin í hvert sinn (trio_saga ×3, year_factcheck ×3, customer_documents ×3 …),
 * og sama uppfletting á fyrirtækinu (id / kennitala) fór ~20 sinnum. Að elta hvern kallara í 40 skrám er endalaust; eitt lag
 * hér nær þeim öllum. Agnar: „við erum svo mikið inn og út af þessum síðum þegar við erum að gera skýrslurnar".
 *
 * REGLURNAR (allar í átt að öryggi):
 *   • AÐEINS GET á <SUPABASE_URL>/rest/v1/… — aldrei rpc/, storage, auth, föll né annað lén.
 *   • Lykill = slóð + Range + Prefer + Accept + Accept-Profile (blaðsíður og talning eru því aðskilin svör).
 *   • HVER SKRIFT (allt sem er ekki GET/HEAD á Supabase, líka rpc og keepalive-skrif) TÆMIR allt skyndiminnið áður en
 *     hún fer — lestur eftir vistun í þessum flipa er því alltaf ferskur.
 *   • `app_settings` er UNDANSKILIN: „lesa ferskt rétt fyrir vistun"-varnirnar (85 · 145 · 273 · 303 · 305 · 368 · 33/37)
 *     byggja á því að sá lestur sé glænýr, líka gagnvart ÖÐRUM tækjum.
 *   • Lifir 2 sek. Svör með villu (ekki 2xx) og rofnar beiðnir eru aldrei geymd. Beiðni með `signal` (AbortController) eða
 *     `cache: 'no-store'` fer alltaf beint.
 *   • Hver kallari fær sitt EIGIÐ afrit (Response.clone()) — frumritið er aldrei lesið.
 * Slökkva: localStorage.setItem('rest_samnyting_off','1') og endurhlaða. Tölur: window.RestSamnyting.tolur().
 */
(function () {
  if (window.__restSamnytingInstalled || typeof window.fetch !== 'function') return;
  window.__restSamnytingInstalled = true;
  try { if (localStorage.getItem('rest_samnyting_off') === '1') return; } catch (_) {}

  var LIFIR_MS = 2000, HAMARK = 300;
  var upprunalegt = window.fetch;
  var geymsla = new Map();          // lykill → { t, p: Promise<Response> }
  var tolur = { samnytt: 0, sott: 0, taemt: 0, skrif: 0 };

  function grunnur() { return String(window.SUPABASE_URL || '').replace(/\/+$/, ''); }
  function haus(h, nafn) {
    if (!h) return '';
    try {
      if (typeof h.get === 'function') return h.get(nafn) || '';
      var k = Object.keys(h).find(function (x) { return x.toLowerCase() === nafn.toLowerCase(); });
      return k ? String(h[k]) : '';
    } catch (_) { return ''; }
  }

  window.fetch = function (inntak, stillingar) {
    try {
      var slod = typeof inntak === 'string' ? inntak : (inntak && inntak.url) || '';
      var g = grunnur();
      if (!g || slod.indexOf(g) !== 0) {
        // Skrif um okkar eigin Netlify-föll (/api/… — t.d. Payday-sending, póstur) breyta gögnum ÞJÓNSMEGIN án þess að fara
        // um Supabase héðan. Þau teljast því líka sem skrift og tæma skyndiminnið (sjá skrif() og 153 backgroundRefresh).
        var m0 = String((stillingar && stillingar.method) || (inntak && inntak.method) || 'GET').toUpperCase();
        if (m0 !== 'GET' && m0 !== 'HEAD' && (slod.indexOf('/api/') === 0 || slod.indexOf('/.netlify/functions/') === 0 ||
            slod.indexOf(location.origin + '/api/') === 0 || slod.indexOf(location.origin + '/.netlify/functions/') === 0)) {
          tolur.skrif++;
          if (geymsla.size) { geymsla.clear(); tolur.taemt++; }
        }
        return upprunalegt.apply(this, arguments);
      }
      var adferd = String((stillingar && stillingar.method) || (inntak && inntak.method) || 'GET').toUpperCase();
      if (adferd !== 'GET' && adferd !== 'HEAD') {               // skrift → allt ferskt á eftir
        // Hraðamælirinn (387) og villuskráin (309) skrifa SJÁLF í bakgrunni — það er ekki „notandinn vistaði eitthvað" og má
        // hvorki tæma skyndiminnið né kveikja endursókn á Ársskoðun.
        if (slod.indexOf('/rest/v1/hradamaelingar') > -1 || slod.indexOf('/rest/v1/app_problems') > -1) return upprunalegt.apply(this, arguments);
        tolur.skrif++;
        if (geymsla.size) { geymsla.clear(); tolur.taemt++; }
        return upprunalegt.apply(this, arguments);
      }
      // 25.09.2026: HEAD (talningar, count:'exact', head:true) samnýtt líka — mælt: sama ógreidda-krafna-talningin fór
      // 2–3× á hverri síðu (166 merkið + 368 borðið). Aðferðin er hluti af lyklinum.
      if ((adferd !== 'GET' && adferd !== 'HEAD') || slod.indexOf(g + '/rest/v1/') !== 0 || slod.indexOf('/rest/v1/rpc/') > -1 ||
          slod.indexOf('/rest/v1/app_settings') > -1 || (stillingar && (stillingar.signal || stillingar.cache === 'no-store'))) {
        return upprunalegt.apply(this, arguments);
      }
      var h = (stillingar && stillingar.headers) || (inntak && inntak.headers) || null;
      var lykill = adferd + ' ' + slod + '|' + haus(h, 'Range') + '|' + haus(h, 'Prefer') + '|' + haus(h, 'Accept') + '|' + haus(h, 'Accept-Profile');
      var nu = Date.now(), til = geymsla.get(lykill);
      if (til && (nu - til.t) < LIFIR_MS) {
        tolur.samnytt++;
        return til.p.then(function (r) { return r.clone(); });
      }
      if (geymsla.size > HAMARK) geymsla.clear();
      tolur.sott++;
      var p = upprunalegt.apply(this, arguments);
      var faersla = { t: nu, p: p };
      geymsla.set(lykill, faersla);
      p.then(function (r) { if (!r || !r.ok) { if (geymsla.get(lykill) === faersla) geymsla.delete(lykill); } },
             function () { if (geymsla.get(lykill) === faersla) geymsla.delete(lykill); });
      setTimeout(function () { if (geymsla.get(lykill) === faersla) geymsla.delete(lykill); }, LIFIR_MS + 50);
      return p.then(function (r) { return r.clone(); });
    } catch (_) {
      return upprunalegt.apply(this, arguments);
    }
  };

  window.RestSamnyting = {
    tolur: function () { return Object.assign({ i_geymslu: geymsla.size }, tolur); },
    taema: function () { geymsla.clear(); },
    // Fjöldi skrifta (allt nema GET/HEAD á Supabase, líka rpc) úr ÞESSUM flipa frá hleðslu. 153 notar þetta til að vita
    // hvort nokkuð var vistað síðan Ársskoðun sótti síðast — sjá backgroundRefresh.
    skrif: function () { return tolur.skrif; }
  };
})();
