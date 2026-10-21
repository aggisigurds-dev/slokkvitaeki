/* 476-i-vinnslu-kjarni.js — EIN regla um „í vinnslu", lesin alls staðar.
 *
 * 21.10.2026 — Agnar: „þetta á allt að fylgjast saman… Á verkstæði · í vinnslu
 * í ársskoðun · í vinnslu takkinn í company profile · á þjónustuverkstæði" og
 * „setja vörð sem passar að fjöldinn á hverjum stað sé sá sami".
 *
 * ÞAÐ SEM VAR AÐ: reglan var SKRIFUÐ UPP AFTUR á hverjum stað — 190 (borðið),
 * 304 (Fjármála-yfirlitið), 153 (flagan, sían og stöðupillan) og 165 (takkinn á
 * prófílnum). Fjórar skrár, sjö eintök, og þau voru þegar farin að reka í
 * sundur. Skráð dæmi í 304 frá 16.10.2026: „Afmerkja" á borðinu setur
 * `sv_force_unstarted`, en Fjármála-yfirlitið vissi ekki af því og taldi
 * 270.710 kr sem borðið sýndi ekki. Það var ekki villa í einu eintaki — það var
 * afleiðing þess að eintökin voru mörg. Nýtt skilyrði mun alltaf gleymast í
 * a.m.k. einu þeirra.
 *
 * REGLAN (eini staðurinn sem hún stendur á):
 *
 *   í vinnslu  =  ekki afmerkt handvirkt
 *                 OG ( úttekt hafin á árinu
 *                      EÐA óklárað úttektardrög vistuð
 *                      EÐA tæki félagsins er á verkstæðinu hjá okkur )
 *
 * „Tæki á verkstæðinu" er með af ásettu ráði, líka þótt árið sé merkt búið
 * (Agnar 21.10: „when It sækja inn úr fyrirtæki the company goes into í Vinnslu
 * as well"). Verkinu er ekki lokið meðan við geymum búnaðinn þeirra. MÆLT
 * 21.10.2026: það eru 4 félög — Bílasprautun Íslands, Heimaleiga Dalbrekka 4-6,
 * Álfaskeiði 86-88 og Japanskar vélar. Þau færast úr „Búin í ár" yfir í „Í
 * vinnslu". Árslásinn og reikningsstaðan hreyfast EKKI: þetta fall LES aðeins,
 * það skrifar hvorki `last_year_inspected` né `field_inspected_year`.
 *
 * ÞEGAR TEKIÐ ER ÚR VINNSLU stendur `astaedur()` eftir sem listi yfir það sem
 * heldur félaginu opnu — með hlekk á staðinn þar sem hægt er að laga það. Standi
 * tæki á verkstæðinu býður `spyrjaAdurEnTekidAf()` að merkja þau sótt í leiðinni
 * (Agnar 21.10: „Á að merkja tækin sem voru á verkstæði sem sótt og sett á sinn
 * stað"), svo ástæðan hverfi í stað þess að vera rifist um hana.
 */
(function () {
  'use strict';
  if (window.IVinnslu) return;

  var LYKILL = 'arsskodun_customers';

  function ar() {
    try { if (window.ArsWorkflow && ArsWorkflow.curYear) return ArsWorkflow.curYear; } catch (_) {}
    return new Date().getFullYear();
  }
  function ars(coId) {
    try {
      if (!window.AppSettings || !AppSettings.path) return null;
      return (AppSettings.path(LYKILL) || {})[String(coId)] || {};
    } catch (_) { return null; }
  }

  /* ── Tæki á verkstæðinu — EIN fyrirspurn yfir allt, ekki ein á hvert félag ──
   * 165 á `taekiAVerkstaedi(coId)`, en það svarar já/nei fyrir eitt félag með
   * `limit(1)`. Listasíður þurfa fjöldann fyrir hundruð félaga; hér er hann
   * sóttur í einu lagi og geymdur. Blaðsíður þótt mengið sé lítið (13 raðir á 7
   * félögum, mælt 21.10.2026) — PostgREST klippir þegjandi við 1000.
   */
  var _verkst = null;        // Map<String(coId), fjöldi> — null = ekki sótt enn
  var _sottAt = 0, _iGangi = null;
  var FERSKT_MS = 60 * 1000;

  function hlada(force) {
    if (_iGangi) return _iGangi;
    if (!force && _verkst && Date.now() - _sottAt < FERSKT_MS) return Promise.resolve(_verkst);
    _iGangi = (async function () {
      try {
        var sb = window.DB && DB.sb; if (!sb) return _verkst;
        var rows = await DB.fetchAll(function (from, to) {
          return sb.from('uttaeki').select('fyrirtaeki_id').eq('status', 'loaned')
            .not('fyrirtaeki_id', 'is', null).order('id').range(from, to);
        });
        var m = new Map();
        (rows || []).forEach(function (u) {
          var k = String(u.fyrirtaeki_id);
          if (!k || k === 'null' || k === 'undefined') return;
          m.set(k, (m.get(k) || 0) + 1);
        });
        _verkst = m; _sottAt = Date.now();
        try { window.dispatchEvent(new CustomEvent('ivinnslu:breytt')); } catch (_) {}
      } catch (_) {
        /* Sóknarvilla skilur `_verkst` eftir eins og það var. Tómt svar er ekki
         * staðreynd: hefðum við sett tómt kort hér myndi hvert einasta félag
         * segja „0 á verkstæði" og vísirinn slokkna á röngum forsendum. */
      } finally { _iGangi = null; }
      return _verkst;
    })();
    return _iGangi;
  }
  // Fjöldi óskilaðra tækja. 0 þegar mengið er ósótt — kallandi sem þarf að vita
  // muninn spyr `verkstaediVitad()`.
  function verkstaedi(coId) {
    if (!_verkst || !coId) return 0;
    return _verkst.get(String(coId)) || 0;
  }
  function verkstaediVitad() { return !!_verkst; }
  function gleyma() { _verkst = null; _sottAt = 0; }

  function drog(coId) {
    try { return !!(window.SavedReports && SavedReports.has && SavedReports.has(coId)); } catch (_) { return false; }
  }
  function flagg(coId, a) {
    a = a || ars(coId) || {};
    return +a.field_inspected_year === ar();
  }
  function afmerkt(coId, a) {
    a = a || ars(coId) || {};
    return !!a.sv_force_unstarted;
  }

  /* astaedur(coId) → listi yfir það sem heldur félaginu í vinnslu.
   * `eftirAf` segir hvort ástæðan standi ENN eftir að „í vinnslu" er slökkt —
   * það er nákvæmlega það sem viðvörunin á að telja upp. */
  function astaedur(coId) {
    if (!coId) return [];
    var a = ars(coId) || {};
    if (afmerkt(coId, a)) return [];
    var out = [];
    if (flagg(coId, a)) {
      out.push({ lykill: 'flagg', texti: 'Úttekt hafin á árinu', eftirAf: false,
        hlekkur: '#arsskodun', hlekkTexti: 'Ársskoðun' });
    }
    var n = verkstaedi(coId);
    if (n > 0) {
      out.push({ lykill: 'verkstaedi', eftirAf: true,
        texti: n + (n === 1 ? ' tæki er' : ' tæki eru') + ' á verkstæðinu hjá okkur',
        hlekkur: '#verkstaedi', hlekkTexti: 'Opna Verkstæði', fjoldi: n });
    }
    if (drog(coId)) {
      out.push({ lykill: 'drog', texti: 'Óklárað úttekt vistuð', eftirAf: true,
        hlekkur: '#company/' + coId, hlekkTexti: 'Opna fyrirtækið' });
    }
    return out;
  }
  function er(coId) { return astaedur(coId).length > 0; }
  // Ástæður sem standa eftir þótt flaggið sé slökkt.
  function bond(coId) { return astaedur(coId).filter(function (x) { return x.eftirAf; }); }

  /* ── Viðvörunin ──────────────────────────────────────────────────────────
   * Agnar 21.10: „perhaps only show a small warning and ask „Á að merkja tækin
   * sem voru á verkstæði sem sótt og sett á sinn stað" then mark it as picked up
   * in the Verkstæði automatically".
   *
   * Þess vegna er þetta EKKI hindrun. Standi ekkert eftir gengur aðgerðin þegjandi
   * í gegn. Standi tæki eftir er boðið að ljúka þeim í leiðinni — um sömu leið og
   * „Sækja"-takkinn á Verkstæðinu fer (269 `close`), svo þjónustan skráist á tækið,
   * next_insp færist fram og afturköllun sé möguleg. Enginn nýr skrifstaður.
   *
   * Skilar: true = halda áfram með að taka úr vinnslu, false = hætta við.
   */
  async function spyrjaAdurEnTekidAf(coId) {
    var b = bond(coId);
    if (!b.length) return true;
    var verk = b.find(function (x) { return x.lykill === 'verkstaedi'; });
    var hinir = b.filter(function (x) { return x.lykill !== 'verkstaedi'; });

    if (verk) {
      var sp = 'Taka úr vinnslu — en ' + verk.texti + '.\n\n' +
               'Á að merkja tækin sem voru á verkstæði sem sótt og sett á sinn stað?';
      var ja = false;
      try {
        ja = (window.Confirm && Confirm.show)
          ? await Confirm.show(sp, { okText: 'Já, merkja sótt', cancelText: 'Nei, skilja eftir' })
          : window.confirm(sp);
      } catch (_) { ja = false; }
      if (ja) {
        var fjoldi = 0;
        try {
          if (window.VkLoaned && VkLoaned.sottFyrirFelag) fjoldi = await VkLoaned.sottFyrirFelag(coId);
        } catch (_) { fjoldi = -1; }
        gleyma(); await hlada(true);
        if (window.Toast && Toast.show) {
          // Aldrei „búið" nema það sé satt: -1 = kallið sprakk, 0 = ekkert fannst.
          Toast.show(fjoldi > 0 ? ('🚚 ' + fjoldi + (fjoldi === 1 ? ' tæki merkt sótt' : ' tæki merkt sótt'))
            : fjoldi === 0 ? '⚠ Ekkert tæki fannst til að merkja — staðan stendur óbreytt'
            : '⚠ Merkingin mistókst — tækin standa áfram á verkstæðinu');
        }
      }
    }
    if (hinir.length && window.Toast && Toast.show) {
      Toast.show('Stendur enn eftir: ' + hinir.map(function (x) { return x.texti; }).join(' · '));
    }
    return true;
  }

  window.IVinnslu = {
    curYear: ar,
    hlada: hlada,
    gleyma: gleyma,
    verkstaedi: verkstaedi,
    verkstaediVitad: verkstaediVitad,
    er: er,
    astaedur: astaedur,
    bond: bond,
    spyrjaAdurEnTekidAf: spyrjaAdurEnTekidAf
  };
  console.log('[patch-476] IVinnslu — ein regla um „í vinnslu" installed');
})();
