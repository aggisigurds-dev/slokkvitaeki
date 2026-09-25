/* === ÁRSSKOÐUN SKJÁR: SKRUN NÁI FYRIRTÆKI (341) ============================
 *
 * Agnar 2026-08-30 (S26, Fyrirtæki í þjónustu · Skjár): nafnadálkurinn er
 * klipptur vinstra megin og strokið stoppar áður en FYRIRTÆKI kemur inn.
 * Heimilisfang og árs-punktar sjást. Hliðarstika opin.
 *
 * ORSÖK (lagskipt, 325/328/330/331/337):
 *   1. 331 setur #view-arsskodun { width:100vw; margin-left:0; --sidebar-w:0 }
 *      á html.ars-wide-table. Hliðarstikan er áfram position:fixed (220px).
 *      Taflan byrjar undir stikunni. Mail 34px + nafn 186px = 220px — dálkarnir
 *      sem hverfa. wrap.scrollLeft getur ekki farið undir 0, svo nöfnin eru
 *      ónáanleg.
 *   2. 331 + 337 setja overflow-x:auto á #view-arsskodun, .data-table-wrap
 *      OG ._ars-tblscroll. Þrír skrunarar. 331 setur overscroll-behavior:contain
 *      á innsta. Ef ytri (view/body) er skrunuð til hægri situr innsti í 0
 *      og strokið deyr — notandinn kemst aldrei til baka til nafnanna.
 *   3. 331 zoom/transform á <table> getur fært sjónræna vinstri-brúnina
 *      vinstra megin við skrunarans uppruna (scale án þess að layout fylgi).
 *
 * LAUSN: einn skrunari (#arsskodun-wrap = ._ars-tblscroll). Foreldrar clip.
 * Engin 100vw undir stikunni. Zoom án scale() sem hliðrar. Ancestor
 * scrollLeft → 0 svo wrap.scrollLeft=0 ER vinstri brún nafnsins.
 *
 * 153/187-reikningur ÓSNERT. Brunahólf ÓSNERT. .oneignore ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__arsSkjarScrollLeft341) return;
  window.__arsSkjarScrollLeft341 = true;

  const STYLE_ID = 'ars-skjar-scroll-left-341';
  const WRAP_ID = 'arsskodun-wrap';
  const VIEW_ID = 'view-arsskodun';
  const P = ':not(#_p341a):not(#_p341b):not(#_p341c):not(#_p341d):not(#_p341e)';
  const P6 = P + ':not(#_p341f)';

  function isWide() {
    try {
      const html = document.documentElement;
      if (html.classList.contains('ars-wide-table')) return true;
      const sjon = html.dataset.arsSjon;
      if (sjon === 'desktop' || sjon === 'table') return true;
      if (window.ArsSjon && typeof window.ArsSjon.get === 'function') {
        const m = window.ArsSjon.get();
        if (m === 'desktop' || m === 'table') return true;
      }
    } catch (_) {}
    return false;
  }

  function css() {
    const W = 'html.ars-wide-table ';
    const M = 'html[data-viewmode="mobile"] ';
    const A = 'body.appmode ';
    const V = '#' + VIEW_ID + '#' + VIEW_ID;
    const wrap = '#' + WRAP_ID + '#' + WRAP_ID;
    const clip =
      '{overflow-x:clip!important;max-width:100%!important;box-sizing:border-box!important}';
    // 03.09.2026 (Agnar: „festist alltaf í miðri töflu og kemst ekki alveg upp
    // né niður"). ÞESSI regla er sú sem vinnur á skrunaranum — hún ber tvöfalt
    // auðkenni og hleðst á eftir 331 — svo hún varð að lagast hér líka, ekki
    // bara í 331. `overscroll-behavior:contain` stöðvar scroll-chaining: þegar
    // kassinn var kominn í botn var strokan GLEYPT í stað þess að ganga áfram
    // til síðunnar. Nú aðeins á X-ásnum: það heldur til-baka-stroki vafrans
    // frá þegar maður pannar töfluna til hliðar (sem var tilgangurinn), en
    // lóðrétt strok fær að erfast upp í síðuna.
    // Hæð er sett í 331 og er `auto` — hún má ALDREI verða viewport-bundin
    // aftur hér eða þar: föst hæð + contain er nákvæmlega gildran.
    const pan =
      '{overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
      + 'width:100%!important;max-width:100%!important;min-width:0!important;'
      + 'box-sizing:border-box!important;'
      + '-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom!important;'
      + 'overscroll-behavior-x:contain;overscroll-behavior-y:auto}';
    return [
      /* View sits in the content box, never 100vw under the rail.
         Inherit --sidebar-w from html (263/app.css) — do not zero it here.
         Gated on ars-wide-table so Sími-listinn (330) is untouched. */
      W + V + P + ','
        + 'html.ars-wide-table[data-viewmode="mobile"] ' + V + P + ','
        + 'html.ars-wide-table body.appmode ' + V + P
        + '{--sidebar-w:inherit!important;'
        + 'margin-left:var(--sidebar-w,0px)!important;'
        + 'width:calc(100vw - var(--sidebar-w,0px))!important;'
        + 'max-width:calc(100vw - var(--sidebar-w,0px))!important;'
        + 'padding-left:0!important;padding-right:0!important;'
        + 'box-sizing:border-box!important;'
        + 'overflow-x:clip!important;overflow-y:auto!important}',

      /* Ancestors are not competing X-scrollers (325 + 328 intent). */
      W + V + ' #ars-main' + P + ',' + M + V + ' #ars-main' + P + ',' + A + V + ' #ars-main' + P + ','
        + W + V + ' .thm' + P + ',' + M + V + ' .thm' + P + ','
        + W + V + ' .data-table-wrap' + P + ',' + M + V + ' .data-table-wrap' + P + ','
        + A + V + ' .data-table-wrap' + P
        + clip,

      /* THE scroller — id stamped on ._ars-tblscroll. Beat 331's max-width:100vw. */
      W + wrap + P + ',' + M + wrap + P + ',' + A + wrap + P + ','
        + W + V + ' ._ars-tblscroll' + P + ',' + M + V + ' ._ars-tblscroll' + P + ','
        + A + V + ' ._ars-tblscroll' + P + ','
        + W + V + ' .data-table-scroll' + P + ',' + M + V + ' .data-table-scroll' + P
        + pan,

      /* Table is content, never a scroller (325). Origin 0 0 if zoom remains. */
      W + wrap + '>table' + P + ',' + M + wrap + '>table' + P + ','
        + W + V + ' ._ars-tblscroll>table' + P + ',' + M + V + ' ._ars-tblscroll>table' + P + ','
        + W + V + ' table.data-table' + P
        + '{display:table!important;overflow:visible!important;overflow-x:visible!important;'
        + 'max-width:none!important;transform-origin:0 0!important}',

      /* Name column: readable at the left edge. No sticky (sticky+zoom clips). */
      W + V + ' th[data-sort="name"]' + P + ',' + W + V + ' td._ars-namecell' + P + ','
        + W + V + ' td._ars-namecell ._co' + P
        + '{overflow:visible!important;text-overflow:clip!important;'
        + 'position:static!important;left:auto!important}',

      /* 23.09.2026 (Agnar, S26 í Chrome, Skjár: „no pinchzoom or moving. Side scroll“): á símanum er hliðarstikan
         AF skjánum (body.has-mobnav) en --sidebar-w er samt 60px (app.css:1352) → sýnin fékk margin-left:60px,
         breidd 330px og overflow-x:clip. Allt fyrir ofan töfluna (haus, KPI-spjöld, takkar) klipptist við hægri
         brún og engin leið að panna. Hér, aðeins með stikuna af skjánum, er SÝNIN eini skrunarinn: 100vw, pannar
         lárétt yfir alla síðuna (haus + tafla saman), pinch-zoom á viewport-inu. Sex gervi-auðkenni slá 341-regluna
         hér að ofan (fimm). Með stikuna á skjánum (Tölvusíðu-hamur ≥ 900px) gildir 341 óbreytt. */
      'html.ars-wide-table body.has-mobnav ' + V + P6
        + '{margin-left:0!important;width:100vw!important;max-width:100vw!important;'
        + 'overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;'
        + '-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom!important;overscroll-behavior-x:contain}',
      'html.ars-wide-table body.has-mobnav ' + V + ' #ars-main' + P6 + ','
        + 'html.ars-wide-table body.has-mobnav ' + V + ' .thm' + P6 + ','
        + 'html.ars-wide-table body.has-mobnav ' + V + ' .data-table-wrap' + P6 + ','
        + 'html.ars-wide-table body.has-mobnav ' + wrap + P6 + ','
        + 'html.ars-wide-table body.has-mobnav ' + V + ' ._ars-tblscroll' + P6 + ','
        + 'html.ars-wide-table body.has-mobnav ' + V + ' .data-table-scroll' + P6
        + '{overflow:visible!important;overflow-x:visible!important;overflow-y:visible!important;'
        + 'width:max-content!important;min-width:100%!important;max-width:none!important;touch-action:auto!important}'
    ].join('\n');
  }

  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css();
    if (s.parentNode && s.parentNode.lastElementChild !== s) s.parentNode.appendChild(s);
  }

  function scrollerEl() {
    return document.getElementById(WRAP_ID)
      || document.querySelector('#' + VIEW_ID + ' ._ars-tblscroll')
      || document.querySelector('#' + VIEW_ID + ' .data-table-scroll');
  }

  function tableEl() {
    const wrap = scrollerEl();
    if (wrap) {
      const t = wrap.querySelector('table');
      if (t) return t;
    }
    return document.querySelector('#' + VIEW_ID + ' table.data-table');
  }

  function stampWrap() {
    const el = document.querySelector('#' + VIEW_ID + ' ._ars-tblscroll')
      || document.querySelector('#' + VIEW_ID + ' .data-table-scroll');
    if (!el) return null;
    if (!el.id || el.id === WRAP_ID) el.id = WRAP_ID;
    return el;
  }

  /* Sidebar covering the table: layout rail OR open phone drawer.
     Overlay used to be skipped, but then FYRIRTÆKI sat under the drawer
     at scrollLeft=0 and could not be panned into view. */
  function railWidth() {
    try {
      const tb = document.querySelector('.topbar');
      if (!tb) return 0;
      const cs = getComputedStyle(tb);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return 0;
      const r = tb.getBoundingClientRect();
      const cssW = parseFloat(cs.width) || 0;
      const open = document.body && document.body.classList.contains('mobile-nav-open');
      if (open) return Math.round(Math.max(r.right > 80 ? r.right : 0, cssW || 260));
      if (r.left < 8 && r.right > 80 && r.width >= 40) return Math.round(r.right);
    } catch (_) {}
    return 0;
  }

  function pinViewToRail() {
    const v = document.getElementById(VIEW_ID);
    if (!v) return;
    // 23.09.2026 (afköst, mælt á lifandi síðu): smella-hlustarinn neðar í skránni grípur ALLA smelli í `.topbar` —
    // sem er hliðarstikan sjálf — og keyrir þetta fall tvisvar (50 ms og 280 ms) við HVERJA einustu flettingu, líka
    // þegar farið er á allt aðra sýn. Fallið skrifar `width`/`max-width`/`margin-left` á Ársskoðunar-sýnina og les
    // `.topbar`-hnitin, svo hver umferð þvingar fulla útlitsumferð. Mælt á Hreyfingarlista (28.203 hnútar):
    // 999 ms í einni aðgerð — á sýn sem kemur Ársskoðun ekkert við.
    //
    // Stillingin á aðeins erindi þegar Ársskoðun er raunverulega á skjánum. Sé hún það ekki, sleppum við henni:
    // `apply()` kallar á þetta fall við hashchange · resize · pageshow · slokk-viewmode · ræsingu (og 80/400/
    // 1200/3000 ms), svo sýnin fær sína stillingu um leið og hún birtist. Smellur á Ársskoðunar-hnappinn sjálfan
    // heldur líka áfram að virka: við 50/280 ms er sýnin orðin virk og skilyrðið hér stenst.
    // 25.09.2026 (afköst): offsetParent á ÓVIRKRI sýn þvingaði layout eftir hverja DOM-breytingu á öllum öðrum síðum
    // (mælt 0,66 s á Tekjum). Sýnin birtist aðeins með .active (eða inline display:block).
    if (!v.classList.contains('active') && v.style.display !== 'block') return;
    if (!isWide()) {
      try {
        v.style.removeProperty('margin-left');
        v.style.removeProperty('width');
        v.style.removeProperty('max-width');
        delete v.dataset.p341w;        // vörðurinn hreinsaður, annars festist hann
      } catch (_) {}
      return;
    }
    const w = railWidth();
    if (w > 0) {
      try {
        // 23.09.2026 (afköst): SKRIFA AÐEINS EF GILDIÐ BREYTIST. Fallið er keyrt margoft með nákvæmlega sömu tölu
        // (ræsing ×5, hashchange, resize, og tvisvar við hvern smell í hliðarstikunni). Hvert skrif ógildir stílinn
        // — líka þegar gildið er það sama — og næsta útlitslestur borgar fulla umferð. Mælt á Hreyfingarlista:
        // 652 ms í einni slíkri umferð. Samanburðurinn hér að neðan kostar ekkert og fellir þær allar nema fyrstu.
        // NB: bera saman TÖLUNA, ekki CSS-strenginn. Vafrinn umritar `calc(100vw - 220px)` í `calc(-220px + 100vw)`
        // við lestur, svo strengjasamanburður stenst aldrei og vörnin yrði gagnslaus (mælt 23.09.2026).
        if (v.dataset.p341w !== String(w)) {
          v.style.setProperty('margin-left', w + 'px', 'important');
          v.style.setProperty('width', 'calc(100vw - ' + w + 'px)', 'important');
          v.style.setProperty('max-width', 'calc(100vw - ' + w + 'px)', 'important');
          v.dataset.p341w = String(w);
        }
      } catch (_) {}
    } else {
      try {
        v.style.removeProperty('margin-left');
        v.style.removeProperty('width');
        v.style.removeProperty('max-width');
        delete v.dataset.p341w;        // sama hér — næsta umferð með w>0 á að skrifa á ný
      } catch (_) {}
    }
  }

  function zeroAncestorScroll(wrap) {
    let n = wrap && wrap.parentElement;
    while (n) {
      try { if (n.scrollLeft) n.scrollLeft = 0; } catch (_) {}
      n = n.parentElement;
    }
    try {
      if (document.documentElement.scrollLeft) document.documentElement.scrollLeft = 0;
      if (document.body && document.body.scrollLeft) document.body.scrollLeft = 0;
    } catch (_) {}
  }

  function dropScaleTransform(tbl) {
    if (!tbl) return;
    const tr = tbl.style.transform || '';
    if (!/scale\s*\(/i.test(tr)) {
      try { tbl.style.transformOrigin = '0 0'; } catch (_) {}
      return;
    }
    const m = tr.match(/scale\(\s*([0-9.]+)/i);
    const s = m ? parseFloat(m[1]) : 1;
    const zoomOk = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('zoom', '0.5');
    try {
      if (zoomOk && isFinite(s) && s > 0) {
        tbl.style.transform = '';
        tbl.style.zoom = String(s);
      } else {
        tbl.style.transformOrigin = '0 0';
      }
    } catch (_) {}
  }

  /* If zoom/transform painted the name column left of the wrap, push it
     back so scrollLeft=0 shows FYRIRTÆKI. Do not touch wrap.scrollLeft
     here — the user may already be panning right. */
  function revealNameAtOrigin(resetWrap) {
    const wrap = stampWrap();
    const tbl = tableEl();
    if (!wrap || !tbl) return;
    dropScaleTransform(tbl);
    zeroAncestorScroll(wrap);
    pinViewToRail();
    if (resetWrap) {
      try { wrap.scrollLeft = 0; } catch (_) {}
    }
    requestAnimationFrame(() => {
      try {
        const name = tbl.querySelector('th[data-sort="name"], td._ars-namecell, ._co');
        if (!name) return;
        if (resetWrap) wrap.scrollLeft = 0;
        const wr = wrap.getBoundingClientRect();
        const nr = name.getBoundingClientRect();
        const delta = wr.left - nr.left;
        if (delta > 0.5) {
          const cur = parseFloat(tbl.style.marginLeft) || 0;
          tbl.style.marginLeft = (cur + delta) + 'px';
        }
      } catch (_) {}
    });
  }

  function wrapArsSjon() {
    try {
      const api = window.ArsSjon;
      if (!api || typeof api.setScale !== 'function' || api.setScale.__scrollLeft341) return false;
      const orig = api.setScale;
      function wrapped() {
        const r = orig.apply(this, arguments);
        setTimeout(() => revealNameAtOrigin(true), 0);
        setTimeout(() => revealNameAtOrigin(false), 80);
        return r;
      }
      wrapped.__scrollLeft341 = true;
      api.setScale = wrapped;
      if (typeof api.set === 'function' && !api.set.__scrollLeft341) {
        const origSet = api.set;
        function wrappedSet() {
          const r = origSet.apply(this, arguments);
          setTimeout(() => revealNameAtOrigin(true), 60);
          setTimeout(() => revealNameAtOrigin(true), 400);
          return r;
        }
        wrappedSet.__scrollLeft341 = true;
        api.set = wrappedSet;
      }
      return true;
    } catch (_) { return false; }
  }

  function apply(resetWrap) {
    mountCss();
    stampWrap();
    pinViewToRail();
    wrapArsSjon();
    if (isWide()) revealNameAtOrigin(!!resetWrap);
  }

  mountCss();
  function boot() {
    apply(true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [80, 400, 1200, 3000].forEach(ms => setTimeout(boot, ms));

  document.addEventListener('slokk-viewmode', () => setTimeout(() => apply(true), 0));
  ['hashchange', 'resize', 'pageshow'].forEach(ev =>
    window.addEventListener(ev, () => setTimeout(() => apply(false), 0)));
  document.addEventListener('click', ev => {
    const t = ev && ev.target;
    if (t && t.closest && t.closest('.mobile-nav-toggle, .topbar, #mobile-nav-toggle')) {
      setTimeout(() => pinViewToRail(), 50);
      setTimeout(() => pinViewToRail(), 280);
    }
  }, true);

  new MutationObserver(() => {
    clearTimeout(window.__ars341t);
    window.__ars341t = setTimeout(() => {
      mountCss();
      stampWrap();
      pinViewToRail();
      wrapArsSjon();
    }, 200);
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.body) {
    new MutationObserver(() => {
      clearTimeout(window.__ars341nav);
      window.__ars341nav = setTimeout(() => pinViewToRail(), 50);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  window.ArsSkjarScrollLeft = {
    apply, stampWrap, pinViewToRail, revealNameAtOrigin, version: '341'
  };
  console.log('[patch-341] arsskodun skjar scrollLeft reaches Fyrirtæki');
})();
/* === END ÁRSSKOÐUN SKJÁR SCROLL LEFT === */
