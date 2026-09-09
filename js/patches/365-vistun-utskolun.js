/* 365 — VISTUN MÁ ALDREI GLATAST VIÐ LOKUN
 *
 * Agnar 09.09.2026, eftir að hafa tapað vinnu miðja í reikningalotu:
 *   „Þetta er það mikilvægasta af öllu. En af hverju hefur enginn lagað þetta
 *    eftir ítrekaðar staðfestingar að þetta sé að fullu lagað og muni aldrei
 *    gerast aftur. Á hverjum degi endalaust."
 *
 * VANDINN SEM ÞETTA LEYSIR
 * Textatap-sópið fyrr sama dag lagaði „debounce án blur-flush" í níu pöppum:
 * þeir vista nú STRAX við blur, svo það sem er slegið inn og smellt frá helst.
 * Það dugar fyrir venjulega notkun — en ekki fyrir þetta:
 *
 *   notandinn skrifar í reit → lokar flipanum, fer af síðunni eða vélin sofnar
 *   MEÐAN BENDILLINN ER ENN Í REITNUM
 *
 * Þá kemur ekkert `blur`-atvik. Debounce-tímamælirinn (200–900 ms eftir pöppum)
 * fer aldrei af stað. Innslátturinn var aldrei sendur neitt og er farinn.
 *
 * Vörðurinn `tools/audit-vistun-utskolun.cjs` fann sjö skrár sem tefja skrif á
 * þjón án útskolunar, þar á meðal 153-arsskodun (þar sem Agnar sagði að tæki
 * hyrfu), 231-verkbord og 175-rekstrarfelog.
 *
 * AÐFERÐIN — ein aðgerð sem lagar þær allar
 * Í stað þess að breyta sjö skrám með sjö mismunandi tímamælum notum við það sem
 * þær eiga þegar sameiginlegt: þær vista allar á `blur`. Þegar síðan er að hverfa
 * þvingum við `blur` á reitinn sem er í fókus — og þá keyra ALLIR þessir
 * blur-vistarar sjálfkrafa, líka í pöppum sem enginn hefur fundið enn.
 *
 * Auk þess er skrá fyrir papp sem þarf sína eigin útskolun:
 *   window.VistunarSkol.skra(function(){ ... });
 *
 * Ræst á `pagehide` og `visibilitychange`→hidden. Ekki `beforeunload`: hann
 * keyrir ekki áreiðanlega á farsímum, og Safari/iOS sleppir honum alveg.
 */
(function () {
  'use strict';

  var skolarar = [];
  var sidast = 0;

  function skolaAllt(astaeda) {
    // Fleiri en eitt atvik geta komið í röð (visibilitychange + pagehide).
    // Ein útskolun á 400 ms dugar; við viljum ekki tvísenda hverja vistun.
    var nu = Date.now();
    if (nu - sidast < 400) return;
    sidast = nu;

    // 1. Þvinga blur á reitinn í fókus. Þetta ræsir blur-vistarana sem eru
    //    þegar til í 153, 158, 175, 198, 231, 302 og víðar — án þess að þeir
    //    viti af þessum papp.
    try {
      var v = document.activeElement;
      if (v && v !== document.body && typeof v.blur === 'function') {
        var ritanlegt = /^(INPUT|TEXTAREA|SELECT)$/.test(v.tagName) ||
          v.isContentEditable;
        if (ritanlegt) {
          // ⚠️ .blur() EITT OG SÉR DUGAR EKKI. Vafrar senda ekki `blur`-atvik
          // þegar skjalið sjálft er ekki í fókus — sem er nákvæmlega ástandið
          // þegar flipa er lokað eða skipt um glugga. Mælt í prófun 09.09.2026:
          // .blur() færði fókusinn en blur-hlustarinn keyrði ALDREI.
          // Þess vegna sendum við atvikin sjálf. Þau ræsa hlustarana alltaf.
          //
          // Tvívistun er möguleg ef vafrinn sendir líka sitt eigið blur — og
          // það er í lagi: vistararnir skrifa sama gildið. Tvívistun er
          // margfalt skárri en engin vistun.
          try { v.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
          try { v.dispatchEvent(new FocusEvent('blur', { bubbles: false })); } catch (e) {
            try { v.dispatchEvent(new Event('blur')); } catch (e2) {}
          }
          // focusout bubbles — sumir hlustarar nota hann frekar en blur.
          try { v.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); } catch (e) {}
          try { v.blur(); } catch (e) {}
        }
      }
    } catch (e) {}

    // 2. Skráðir útskolarar (pappar sem þurfa meira en blur).
    for (var i = 0; i < skolarar.length; i++) {
      try { skolarar[i](astaeda); } catch (e) {}
    }
  }

  window.VistunarSkol = {
    skra: function (fn) { if (typeof fn === 'function') skolarar.push(fn); },
    skolaNuna: function () { sidast = 0; skolaAllt('handvirkt'); },
    fjoldi: function () { return skolarar.length; }
  };

  window.addEventListener('pagehide', function () { skolaAllt('pagehide'); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') skolaAllt('hidden');
  });
})();
