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

  /* ── STÖK RÖÐ ÚR MINNI (03.10.2026) ──────────────────────────────────────
   * Agnar: „yrði hægt að láta þennan Hlaða takka í banner uploada meira í
   * vinnsluminni til að vera undirbúinn til að fara fram og til baka inn á
   * prófíla." — ⚡ Hlaða (407) sækir ÞEGAR allar 1.217 fyrirtækjaraðir með
   * select('*') í Companies.list. Mælt 03.10 á #company/1612:
   *     kalt           58 köll · síðasta klárast 4,64 s
   *     eftir Hlaða    42 köll · síðasta klárast 2,25 s   (uttaeki fóru í 0)
   * EN fyrirtaeki fór samt út 8× — sex af þeim sækja hver sinn DÁLK úr SÖMU
   * röðinni (kennitala / er_i_thjonustu / afslattur_pct / discount_tier_id …),
   * dreifðar á 2,2 sek. Slóðar-lykillinn hér að neðan getur aldrei sameinað þær
   * af því að slóðirnar eru ólíkar — TTL-hækkun var prófuð 03.10 og gerði illt
   * verra (62 köll í stað 58). Röðin er hins vegar ÖLL í minni (33 dálkar,
   * ekkert vantar), svo svarið má smíða hér og sleppa ferðinni.
   *
   * ÖRYGGI: aðeins stakar raðir eftir id, aðeins þegar Companies.list er til,
   * og AÐEINS þar til næsta skrif. Hvert skrif slekkur á þessu (sama merki og
   * tæmir skyndiminnið) þar til listinn er endurhlaðinn — eigin breytingar
   * sjást því alltaf ferskar, eins og áður.
   */
  var minniLokad = false;          // true eftir skrif, þar til Companies.list endurnýjast
  var minniListi = null;           // listinn sem var treyst síðast

  function radUrMinni(id) {
    try {
      var L = window.Companies && Companies.list;
      if (!L || !L.length) return null;
      if (minniLokad && L === minniListi) return null;   // skrif hefur átt sér stað á ÞENNAN lista
      if (L !== minniListi) { minniListi = L; minniLokad = false; }   // nýr listi = ferskur
      for (var i = 0; i < L.length; i++) if (+L[i].id === id) return L[i];
      return null;
    } catch (_) { return null; }
  }

  // „select=a,b,"c með broddi",d" → ['a','b','c með broddi','d']; '*' skilar null (allt).
  function dalkar(sel) {
    if (!sel || sel === '*') return null;
    var ut = [], bil = '', inni = false;
    for (var i = 0; i < sel.length; i++) {
      var c = sel[i];
      if (c === '"') { inni = !inni; continue; }
      if (c === ',' && !inni) { if (bil.trim()) ut.push(bil.trim()); bil = ''; continue; }
      bil += c;
    }
    if (bil.trim()) ut.push(bil.trim());
    // Tengdar fyrirspurnir (tafla(dalkar)) eru EKKI í minni — þá sleppum við öllu.
    for (var j = 0; j < ut.length; j++) if (ut[j].indexOf('(') > -1) return false;
    return ut;
  }
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
          var svar0 = upprunalegt.apply(this, arguments);
          try {
            var fall = (slod.split(/\/api\/|\/\.netlify\/functions\//)[1] || '').split(/[?#/]/)[0];
            svar0.then(function (r) {
              if (r && r.ok) { try { document.dispatchEvent(new CustomEvent('gogn-skrifud', { detail: { tafla: 'api:' + fall, adferd: m0 } })); } catch (_) {} }
            }, function () {});
          } catch (_) {}
          return svar0;
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
        // 28.09.2026 (Agnar: „þegar maður breytir í fyrirtækjaprófíl að breytingin komi strax"): hér fara ALLAR skriftir
        // um Supabase (~150 staðir í pöttunum skrifa beint með DB.sb.from(...)), svo þetta er eini staðurinn sem sér þær
        // allar. Heppnuð skrift boðar `gogn-skrifud` { tafla, adferd } — 421 endurteiknar opinn prófíl á staðnum.
        var svar = upprunalegt.apply(this, arguments);
        try {
          var hlutur = (slod.split('/rest/v1/')[1] || '').split(/[?#]/)[0];
          var tafla = hlutur.indexOf('rpc/') === 0 ? 'rpc:' + hlutur.slice(4).split('/')[0] : hlutur.split('/')[0];
          svar.then(function (r) {
            if (r && r.ok) { try { document.dispatchEvent(new CustomEvent('gogn-skrifud', { detail: { tafla: tafla, adferd: adferd } })); } catch (_) {} }
          }, function () {});
        } catch (_) {}
        minniLokad = true;   // eigin breyting — hætta að svara úr minni þar til listinn endurnýjast
        return svar;
      }
      // 25.09.2026: HEAD (talningar, count:'exact', head:true) samnýtt líka — mælt: sama ógreidda-krafna-talningin fór
      // 2–3× á hverri síðu (166 merkið + 368 borðið). Aðferðin er hluti af lyklinum.
      if ((adferd !== 'GET' && adferd !== 'HEAD') || slod.indexOf(g + '/rest/v1/') !== 0 || slod.indexOf('/rest/v1/rpc/') > -1 ||
          slod.indexOf('/rest/v1/app_settings') > -1 || (stillingar && (stillingar.signal || stillingar.cache === 'no-store'))) {
        return upprunalegt.apply(this, arguments);
      }
      var h = (stillingar && stillingar.headers) || (inntak && inntak.headers) || null;

      // Stök fyrirtaeki-röð eftir id → úr minni, engin ferð.
      if (adferd === 'GET' && slod.indexOf(g + '/rest/v1/fyrirtaeki?') === 0) {
        var sp = slod.slice(slod.indexOf('?') + 1).split('&');
        var sel = null, idGildi = null, annad = false;
        for (var si = 0; si < sp.length; si++) {
          var jafn = sp[si].indexOf('='), nafn = jafn > 0 ? sp[si].slice(0, jafn) : sp[si];
          var gildi = jafn > 0 ? decodeURIComponent(sp[si].slice(jafn + 1)) : '';
          if (nafn === 'select') sel = gildi;
          else if (nafn === 'id' && gildi.indexOf('eq.') === 0) idGildi = +gildi.slice(3);
          else annad = true;                                    // önnur sía → ekki óhætt
        }
        var raud = (!annad && idGildi) ? radUrMinni(idGildi) : null;
        if (raud) {
          var d = dalkar(sel);
          if (d !== false) {
            var hlutur = {};
            if (d === null) hlutur = raud;
            else for (var di = 0; di < d.length; di++) hlutur[d[di]] = (d[di] in raud) ? raud[d[di]] : null;
            var vantarDalk = false;
            if (d) for (var dk = 0; dk < d.length; dk++) if (!(d[dk] in raud)) vantarDalk = true;
            if (!vantarDalk) {
              var stakur = String(haus(h, 'Accept') || '').indexOf('pgrst.object') > -1;
              tolur.urMinni = (tolur.urMinni || 0) + 1;
              return Promise.resolve(new Response(JSON.stringify(stakur ? hlutur : [hlutur]), {
                status: 200, headers: { 'Content-Type': 'application/json' }
              }));
            }
          }
        }
      }

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
