/* 535 — Sýnin á að ná niður á skjábrúnina þegar hún er zoomuð (27.11.2026).
 *
 * Agnar sendi skjáskot af Vörum á síma með stórum hvítum fleti neðst, hringuðum:
 * efnið endar við „Ýmsar vörur" og þar fyrir neðan er auður flötur ofan við
 * neðstu stikuna.
 *
 * MÆLT á lifandi síðu (390×844, símahamur, Vörur, vistað zoom 0,80):
 *   #view-vorur  rect.height = 675 px  (844 × 0,80),  botn 675,  skjár 844
 *   → 169 px af BODY sjást undir sýninni; `body` er rgb(245,244,239) = hvíti flöturinn.
 *   Á Kröfu yfirliti (zoom 0,90) er sama gat 84 px.
 *
 * HVERS VEGNA 333 nær þessu ekki, þótt reglan sé til:
 *   333 skrifar `height:calc(100vh / var(--app-page-zoom))!important` á `.view.active`.
 *   Hún lítur rétt út — en INNI Í ZOOMUÐUM HNÚT er `vh` þegar búið að skala:
 *   mælt með prófhnút inni í sýninni (zoom 0,80) gaf `height:100vh` offsetHeight 844,
 *   nákvæmlega eins og `height:844px`. Deilingin með zoominu vinnur því aðeins upp
 *   skölunina sem vh bar þegar — útkoman er 100vh af skjánum SINNUM zoomið.
 *   (`dvh` hagar sér eins; mælt.) Sýnin fékk líka `max-height` sem klippti hana,
 *   svo það dugði ekki að þvinga `height` eitt sér inline — mælt: rect stóð í 675.
 *
 * ÞAÐ SEM VIRKAR, mælt í sömu lotu: setja allar þrjár hæðirnar í RAUNPIXLUM
 * (`innerHeight / zoom`) → rect 844, gat 0, `scrollHeight` óbreytt (22.529).
 * Þess vegna reiknar þessi plástur töluna í JS í stað þess að treysta vh.
 *
 * Gildir aðeins þegar 333 er með zoom í gangi (`html.app-page-zoomed`) og við erum
 * í síma- eða app-ham. Sömu sýnar undanskildar og í 333 (field/counter/workshop).
 * Þegar skilyrðin falla er inline-stíllinn tekinn af aftur, svo tölvusýn er ósnert.
 */
(() => {
  'use strict';
  if (window.__simaHaed535) return;
  window.__simaHaed535 = true;

  const UNDAN = { 'view-field': 1, 'view-counter': 1, 'view-workshop': 1 };
  const LYKLAR = ['height', 'min-height', 'max-height'];
  let sidast = '';

  function virkt() {
    const h = document.documentElement;
    if (!h.classList.contains('app-page-zoomed')) return false;
    return h.getAttribute('data-viewmode') === 'mobile' || document.body.classList.contains('appmode');
  }

  function hreinsa(el) {
    if (!el) return;
    LYKLAR.forEach(k => { try { if (el.style.getPropertyValue(k)) el.style.removeProperty(k); } catch (_) {} });
  }

  function stilla() {
    const virk = document.querySelector('.view.active');
    // taka af öllum sýnum sem eru ekki virkar (hamur getur skipt um sýn)
    document.querySelectorAll('.view[data-h535]').forEach(e => {
      if (e !== virk) { hreinsa(e); e.removeAttribute('data-h535'); }
    });
    if (!virk || UNDAN[virk.id] || !virkt()) {
      if (virk && virk.hasAttribute('data-h535')) { hreinsa(virk); virk.removeAttribute('data-h535'); }
      sidast = '';
      return;
    }
    const z = parseFloat(getComputedStyle(virk).zoom) || 1;
    if (!(z > 0.05) || Math.abs(z - 1) < 0.001) {
      // ekkert zoom: engin skekkja, engin inngrip
      if (virk.hasAttribute('data-h535')) { hreinsa(virk); virk.removeAttribute('data-h535'); }
      sidast = '';
      return;
    }
    const px = Math.round(window.innerHeight / z) + 'px';
    const lykill = virk.id + '|' + px;
    if (lykill === sidast && virk.hasAttribute('data-h535')) return;
    LYKLAR.forEach(k => { try { virk.style.setProperty(k, px, 'important'); } catch (_) {} });
    virk.setAttribute('data-h535', '1');
    sidast = lykill;
  }

  const seinka = (() => { let t = 0; return () => { clearTimeout(t); t = setTimeout(stilla, 60); }; })();

  function raesa() {
    stilla();
    addEventListener('resize', seinka);
    addEventListener('orientationchange', seinka);
    addEventListener('hashchange', seinka);
    document.addEventListener('slokk-viewmode', seinka);
    try {
      new MutationObserver(seinka).observe(document.documentElement, {
        attributes: true, attributeFilter: ['class', 'data-viewmode', 'style']
      });
    } catch (_) {}
    // sýnaskipti og zoom-vistun gerast án atburðar — ódýr púls sem hættir strax sé allt rétt
    setInterval(stilla, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', raesa);
  else raesa();
})();
