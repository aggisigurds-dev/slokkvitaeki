/* === FLJÓTANDI HNAPPAR: RÖÐ OG FORGANGUR (400) — 23.09.2026 ===
 *
 * Agnar 23.09: „sjá hvort eitthvað cuttast af. Eitthvað sé að overlappa."
 *
 * MÆLT Í APPINU (412×915, Fjármál → Kröfu yfirlit):
 *   • #qr-fab (52×52) sat á y=851 — NÁKVÆMLEGA ofan á #_app-nav (y=851, h=64).
 *     Myndavélar-hnappurinn lá því yfir hægsta flipanum í botnstikunni og
 *     stal smellinum af honum.
 *   • #toast (z-index 9999) lendir undir #_app-nav (z-index 2147481001).
 *     Skilaboð um vistun/villu voru því ÓSÝNILEG í appinu — þau birtust bak við
 *     stikuna. Það er verra en útlitsgalli: maður fær ekki að vita hvort vistaðist.
 *
 * LAUSN: hnapparnir raðast í dálk NEÐST TIL HÆGRI, hver fyrir ofan annan, og
 * neðsta sætið byrjar fyrir ofan botnstikuna. Hæð stikunnar er MÆLD (353 skalar
 * krómið á símanum, svo fast tal væri rangt) og sett í `--ap-nav-h`.
 * Toast fær z-index yfir stikuna.
 *
 * Engin hegðun er snert — aðeins staðsetning og lagskipting.
 */
(() => {
  if (window.__fljotandiRod400) return;
  window.__fljotandiRod400 = true;

  // Aðeins það sem stílblað ræður við. Staðsetningin sjálf fer inline (sjá rada):
  // hnapparnir bera `style="inset:auto 12px 12px auto !important"` frá eigendum
  // sínum, og INLINE !important vinnur öll stílblöð — líka regluna sem
  // `_simi-fljotandi-takkar` skrifar sjálft. Mælt 23.09: bottom stóð í 12 px
  // þrátt fyrir `html body #qr-fab{bottom:…!important}`.
  const CSS = [
    'html body #toast{z-index:2147481500!important}',
  ].join('\n');

  // Sætin í dálknum, neðst og upp. Talan er bilið OFAN VIÐ botnstikuna.
  const SAETI = [
    { sel: '#qr-fab', bil: 14 },
    { sel: '#_ad-fab', bil: 78 },
    { sel: '#_app-zoom', bil: 142 },
    { sel: '#toast', bil: 16 },
  ];

  function rada(navH) {
    SAETI.forEach(s => {
      const el = document.querySelector(s.sel);
      if (!el) return;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none') return;
      const vil = 'calc(' + (navH + s.bil) + 'px + env(safe-area-inset-bottom,0px))';
      if (el.style.getPropertyValue('bottom') === vil) return;   // engin lykkja
      el.style.setProperty('bottom', vil, 'important');
      el.style.setProperty('top', 'auto', 'important');
      if (s.sel !== '#toast') el.style.setProperty('right', '12px', 'important');
    });
  }

  function inject() {
    let st = document.getElementById('_fljotandi-css');
    if (!st) {
      st = document.createElement('style');
      st.id = '_fljotandi-css';
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = '@media (max-width: 900px){\n' + CSS + '\n}';
  }

  // Hæð botnstikunnar er MÆLD, ekki gefin: 353 skalar krómið eftir því hvernig
  // Chrome leggur síðuna út á símanum, svo 64 px hér og 116 px þar er sama stikan.
  function maela() {
    if (innerWidth > 900) return;              // borðtölvan á sitt eigið útlit
    const nav = document.getElementById('_app-nav');
    const synileg = nav && getComputedStyle(nav).display !== 'none' && nav.offsetHeight > 0;
    const h = synileg ? Math.round(nav.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--ap-nav-h', h + 'px');
    rada(h);
  }

  let t = null;
  function schedule() { clearTimeout(t); t = setTimeout(maela, 200); }

  function start() {
    inject();
    maela();
    // Stikan kemur eftir ræsingu (261) og breytist við appaskipti.
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: false });
    const nav = document.getElementById('_app-nav');
    if (nav) new MutationObserver(schedule).observe(nav, { attributes: true, attributeFilter: ['style', 'class'] });
    // Eigendur hnappanna (329/353) endurskrifa `style` — þá þarf að raða aftur.
    // `rada` skrifar aðeins þegar gildið er annað, svo þetta verður ekki lykkja.
    SAETI.forEach(s => {
      const el = document.querySelector(s.sel);
      if (el) new MutationObserver(schedule).observe(el, { attributes: true, attributeFilter: ['style'] });
    });
    addEventListener('resize', schedule);
    addEventListener('orientationchange', schedule);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 900));
  else setTimeout(start, 900);
  // Stikan getur birst seint; mælum aftur eftir að allt er komið upp.
  setTimeout(maela, 3000);
  setTimeout(maela, 8000);

  console.log('[400] Fljótandi hnappar raðast fyrir ofan botnstikuna');
})();
/* === END FLJÓTANDI RÖÐ === */
