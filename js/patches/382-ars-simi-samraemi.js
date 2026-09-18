/* === ÁRSSKOÐUN Á SÍMA: APP OG VEFSLÓÐ LÍTA EINS ÚT (382, 2026-09-18) =========
 *
 * Agnar 18.09.2026 (sex skjáskot af S26): „geturðu reynt að samræma og laga þetta fyrir símann" ·
 * „þetta svona skársta útgáfan: Sími + sími af vefsíðu-url" · „vil samt geta skrollað alla leið og
 * pinch zoom". Þrennt MÆLT í 375 px glugga, í appham (?app=verkefni&page=arsskodun) og á vefslóð:
 *
 *  1. GRÁR BAKGRUNNUR Í APPINU. Dökkblái bakgrunnurinn á Ársskoðun er Agnars eigin hönnun úr
 *     Hönnunarham (#_pe-overrides: `#view-arsskodun{background:… !important}`, sérhæfni 1,0,0).
 *     Appskelin (261) setur `body.appmode .view.active:not(#view-opp){background:grátt !important}`
 *     (1,2,1) og vann því alltaf — sama síða, tveir litir eftir því hvernig hún var opnuð.
 *     Lausn: bakgrunnur sem Hönnunarhamur setur á SJÁLFA síðuna (#view-x) er endurómaður með
 *     hærri sérhæfni í appham. Síður án eigin bakgrunns halda gráa app-bakgrunninum.
 *
 *  2. APPELSÍNUGUL SPORASKJA Í SÍMALISTA. Forgangs-punkturinn (.cb-dot úr 237) finnur engan
 *     titil-hnút í `._arsm-row` og lendir því sem SJÖTTA barn grid-raðarinnar → eigin grid-lína
 *     undir heimilisfanginu (auð rönd á vefslóð) og í appham teygir 50px lágmarkshæð takka hann
 *     í 16×50 sporöskju. Lausn: punkturinn situr efst til hægri í nafnadálknum (absolute),
 *     14×14, með ósýnilegu 34px snertisvæði.
 *
 *  3. SKJÁR/TAFLA: HAUS OG RAÐIR Á SKJÖN + 1.400 PX TÓMT TIL HÆGRI. mobile.css (≤900px) setur
 *     `.view table thead, .view table tbody{display:table;width:100%}`. 325 endurreisir töfluna
 *     sjálfa en ekki thead/tbody → colgroup gildir ekki, th 110 px yfir td 131 px, og taflan varð
 *     2.455 px (width:max-content) utan um 1.061 px af dálkum — „skrun alla leið" endaði í auðn.
 *     Lausn: thead/tbody aftur table-header-group/row-group og width:auto í breiðu hömunum.
 *     Mælt eftir: th = td í hverjum dálki, scrollWidth = hægri brún síðasta dálks.
 *
 * Klípu-zoom: viewport er `user-scalable=yes` og touch-action `manipulation` (leyfir klípu) —
 * óbreytt. 153/187-reikningur ÓSNERTUR; aðeins CSS + endurómun á bakgrunni.
 * ========================================================================== */
(() => {
  if (window.__arsSimiSamraemi382) return;
  window.__arsSimiSamraemi382 = true;

  const STYLE_ID = 'ars-simi-samraemi-382';
  const BG_ID = 'ars-simi-samraemi-382-bg';
  const P = ':not(#_p382a):not(#_p382b):not(#_p382c):not(#_p382d):not(#_p382e):not(#_p382f)';
  const T = 'html.ars-wide-table #view-arsskodun table.data-table' + P;

  function css() {
    return [
      // 3 — taflan er aftur ein tafla
      T + '{width:auto !important;min-width:0 !important}',
      T + ' > thead{display:table-header-group !important;width:auto !important}',
      T + ' > tbody{display:table-row-group !important;width:auto !important}',
      // 2 — forgangs-punkturinn í símalistanum
      '#view-arsskodun ._arsm-row:not(._arsm-head)' + P + '{position:relative}',
      '#view-arsskodun ._arsm-row' + P + ' > .cb-dot{position:absolute !important;top:7px !important;left:108px !important;' +
        'width:14px !important;height:14px !important;min-width:0 !important;min-height:0 !important;max-height:14px !important;' +
        'margin:0 !important;padding:0 !important;border-radius:50% !important;z-index:1}',
      '#view-arsskodun ._arsm-row' + P + ' > .cb-dot::after{content:"";position:absolute;inset:-10px}',
      '#view-arsskodun ._arsm-row:has(> .cb-dot) ._arsm-name{padding-right:20px !important;box-sizing:border-box}'
    ].join('\n');
  }

  function styles() {
    let st = document.getElementById(STYLE_ID);
    if (!st) { st = document.createElement('style'); st.id = STYLE_ID; }
    st.textContent = css();
    document.head.appendChild(st);   // alltaf aftast
  }

  // 1 — bakgrunnur úr Hönnunarham gildir líka í appham
  let _sidast = null;
  function bakgrunnar() {
    const pe = document.getElementById('_pe-overrides');
    let ut = '';
    try {
      const rules = pe && pe.sheet ? pe.sheet.cssRules : [];
      for (const r of rules) {
        const sel = r.selectorText || '';
        const m = sel.match(/^(#view-[\w-]+)(?:\1)?$/);
        if (!m || m[1] === '#view-opp') continue;
        // stuttritið ef það er til, annars hver langeiginleiki fyrir sig (mynd + stærð + staða haldast saman)
        const stutt = r.style.getPropertyValue('background');
        const decl = stutt ? ['background:' + stutt + ' !important']
          : ['background-image', 'background-color', 'background-size', 'background-position', 'background-repeat', 'background-attachment']
              .map((p) => (r.style.getPropertyValue(p) ? p + ':' + r.style.getPropertyValue(p) + ' !important' : '')).filter(Boolean);
        if (!decl.length) continue;
        ut += 'body.appmode ' + m[1] + m[1] + '.view.active' + P + '{' + decl.join(';') + '}\n';
      }
    } catch (_) {}
    if (ut === _sidast) return;
    _sidast = ut;
    let st = document.getElementById(BG_ID);
    if (!st) { st = document.createElement('style'); st.id = BG_ID; }
    st.textContent = ut;
    document.head.appendChild(st);
  }

  function keyra() { styles(); bakgrunnar(); }

  let _t = 0;
  function bida() { clearTimeout(_t); _t = setTimeout(bakgrunnar, 250); }

  function raesa() {
    keyra();
    // #_pe-overrides kemur seint (AppSettings) og er endurskrifað þegar Agnar hannar
    try {
      new MutationObserver((muts) => {
        for (const m of muts) {
          const n = m.target;
          if ((n && (n.id === '_pe-overrides' || (n.parentNode && n.parentNode.id === '_pe-overrides'))) ||
              [...(m.addedNodes || [])].some((x) => x.id === '_pe-overrides')) { bida(); return; }
        }
      }).observe(document.head, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
    window.addEventListener('hashchange', bida);
    [1500, 4000, 9000].forEach((ms) => setTimeout(keyra, ms));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', raesa);
  else raesa();

  window.ArsSimiSamraemi = { keyra };
  console.log('[patch-382] Ársskoðun á síma: app = vefslóð (bakgrunnur, forgangs-punktur, tafla)');
})();
/* === END 382 === */
