/* 536 — Kröfu yfirlit á síma: samantektarkortin tvö hætta að éta skjáinn (27.11.2026).
 *
 * Agnar 27.11.2026, eftir sömu yfirferð á Vörum: „Já, Kröfu yfirlit".
 *
 * MÆLT á lifandi síðu (390×844, símahamur, vistað zoom 0,90) ÁÐUR:
 *   .ky-exprow (kortin „Ógreiddar í Payday" og „Ósendar kröfur")  hæð 175 px  (eftir: 113)
 *     ├ merki   9 px
 *     ├ upphæð 20 px / línuhæð 30 → „3.363.885 kr" brotnaði á TVÆR línur (54 px)
 *     ├ skýring 14 px / línuhæð 21 → FJÓRAR línur, 94 px einar og sér
 *     └ táknið ⏳ tekur 27 px af 183 px breidd kortsins, svo textinn hefur 117 px
 *   Samtals fór fjórðungur skjásins í tvö samantektarkort og listinn byrjaði í 469 px.
 *
 * 166 ætlaði sér þetta þrengra — það stendur þar `div>div:last-child{font-size:14px}`
 * — en reglan beit ekki þar sem til stóð:
 *   · `div:last-child` er SKÝRINGIN, ekki upphæðin, svo 14 px lenti á röngum hnút
 *     og upphæðin stóð í 20 px. Skinnið 399 skrifar þessa reglu aftur með tveimur
 *     raunauðkennum og fimm gervi-auðkennum, svo venjuleg regla ber hana ekki.
 * Hér er því sama aðferð notuð með átta auðkennum, og hnútarnir taldir eftir röð
 * (`:nth-child`) í stað `:last-child`, svo rétt stærð lendi á réttum hnút.
 *
 * Ekkert efni er falið: skýringin stendur öll, aðeins minni. Reitirnir til að haka
 * við kröfu voru 18×18 px og fara í 24 px (snertiflötur).
 */
(() => {
  'use strict';
  const ID = 't5-krofu-simi';
  if (document.getElementById(ID)) return;

  // Tvö raunauðkenni + sex gervi: nógu há sérvirkni til að bera 399-skinnið.
  const P = ':not(#_k536a):not(#_k536b):not(#_k536c):not(#_k536d):not(#_k536e):not(#_k536f)';
  const V = '#view-krofu-yfirlit#view-krofu-yfirlit' + P + ' ';
  const g = (...bitar) => bitar.map(s =>
    'html[data-viewmode="mobile"] body ' + V + s + ',' +
    'body.appmode ' + V + s).join(',');

  const css = [
    // ── Kortin tvö: upphæðin á EINNI línu, skýringin smærri (táknið fær að standa) ──
    g('.ky-exprow ._ky-exp') + '{align-items:flex-start!important;padding:8px 10px!important;gap:6px!important}',
    g('.ky-exprow ._ky-exp>div') + '{min-width:0!important;width:100%!important}',
    // 1. merkið
    g('.ky-exprow ._ky-exp>div>div:nth-child(1)') +
      '{font-size:10px!important;line-height:1.25!important;letter-spacing:.03em!important}',
    // 2. upphæðin — má ekki brotna
    g('.ky-exprow ._ky-exp>div>div:nth-child(2)') +
      '{font-size:17px!important;line-height:1.25!important;white-space:nowrap!important;' +
      'margin:2px 0 3px!important;overflow:hidden!important;text-overflow:ellipsis!important}',
    // 3. skýringin — öll með, en smærri
    g('.ky-exprow ._ky-exp>div>div:nth-child(3)') +
      '{font-size:10.5px!important;line-height:1.35!important;font-weight:600!important}',

    // ── Snertifletir: hökunarreitirnir ──
    g('._ky-pick') + ',' + g('._ky-pick-co') +
      '{width:24px!important;height:24px!important;min-width:24px!important}'
  ];

  const st = document.createElement('style');
  st.id = ID;
  st.textContent = css.join('\n');
  (document.head || document.documentElement).appendChild(st);
})();
