/* === SALA + ÁRS-PRÓFÍLL = KRÖFU YFIRLIT Á SÍMA (338) ========================
 *
 * Agnar 2026-08-30: Kröfu yfirlit (þétt yfirlit, chippa-röð, ekki risatakkar)
 * átti að smitast yfir á Sala og fyrirtækjaprófílinn sem opnast úr Ársskoðun
 * / Fyrirtæki í þjónustu (Arsskodun.openDetail og Companies.openDetail).
 *
 * Aðeins Sími (`html[data-viewmode="mobile"]`) og Öpp (`body.appmode`).
 * Skjár / desktop 1440 er ÓSNERT (engar reglur án mobile/appmode).
 *
 * Á NEMUR:
 *   1. #view-sala — vöru/þjónustu-flísar og karfa-takkar sem yfirlit, ekki
 *      2× risakort (314/pos.js) né 261 50px-hamarinn.
 *   2. #companies-main:has(.co-banner) — prófíllinn, ekki listinn.
 *   3. ._ars-modal / ._ars-modal-bg — Ársskoðun openDetail-spjaldið.
 *
 * Á SNERTIR EKKI:
 *   • 153/187-reikning (FULLBÚIÐ, ._yr, renderMobileRows).
 *   • Fyrirtæki-í-þjónustu LISTA (._arsm-*, 187).
 *   • Brunahólf. .oneignore.
 *   • Viewport user-scalable=no / html { zoom }.
 * ========================================================================== */
(() => {
  if (window.__salaArsProfilSimi338) return;
  window.__salaArsProfilSimi338 = true;

  const STYLE_ID = 'sala-ars-profil-simi-338';
  const P = ':not(#_p338a):not(#_p338b):not(#_p338c)';

  function css() {
    const M = 'html[data-viewmode="mobile"] ';
    const A = 'body.appmode ';
    const Z = 'html.app-page-zoomed ';

    function both(sel) { return M + sel + ',' + A + sel; }

    const chip =
      '{display:inline-flex!important;flex:0 0 auto!important;flex-direction:column!important;'
      + 'align-items:center!important;justify-content:center!important;'
      + 'min-width:46px!important;width:auto!important;max-width:none!important;'
      + 'min-height:0!important;height:42px!important;padding:0 8px!important;'
      + 'gap:1px!important;box-sizing:border-box!important;white-space:nowrap!important;'
      + 'font-size:11px!important;line-height:1.1!important;border-radius:9px!important}';
    const strip =
      '{display:flex!important;flex-wrap:nowrap!important;align-items:center!important;'
      + 'gap:6px!important;overflow-x:auto!important;overflow-y:hidden!important;'
      + 'height:auto!important;max-height:none!important;'
      + '-webkit-overflow-scrolling:touch}';
    return [
      /* ── 1. Sala: yfirlit, ekki risakort ────────────────────────────────
         314 festir 2 dálka + 14/16px letur. pos.js Sími: min-height 72px.
         261 hamrar .pos-svc/.pos-prod (þau ERU button) upp í 50px+17px.
         Hér: 3 dálkar, styttri flís, chippa-röð á körfutökkum. */
      both('#view-sala' + P)
        + '{overflow-x:auto!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch}',
      both('#view-sala .pos-grid' + P)
        + '{grid-template-columns:1fr!important;gap:8px!important;padding:0 8px 88px!important;'
        + 'min-height:0!important;width:100%!important;max-width:none!important;'
        + 'box-sizing:border-box!important}',
      both('#view-sala .pos-banner' + P)
        + '{margin:8px 8px 6px!important;min-height:0!important;padding:8px 10px!important}',
      both('#view-sala .pos-col-left>div' + P)
        + '{padding:8px 8px!important;margin-bottom:8px!important;border-radius:10px!important}',
      both('#view-sala #pos-kt' + P)
        + '{font-size:16px!important;padding:10px 12px!important;min-height:44px!important}',
      both('#view-sala #pos-services' + P) + ','
        + both('#view-sala #pos-products' + P)
        + '{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}',
      both('#view-sala .pos-svc' + P) + ','
        + both('#view-sala .pos-prod' + P) + ','
        + A + '#view-sala button.pos-svc' + P + ','
        + A + '#view-sala button.pos-prod' + P
        + '{display:flex!important;flex-direction:column!important;align-items:center!important;'
        + 'justify-content:center!important;text-align:center!important;'
        + 'grid-template-columns:none!important;grid-template-rows:none!important;'
        + 'padding:6px 4px!important;min-height:0!important;height:auto!important;'
        + 'gap:3px!important;border-radius:10px!important;'
        + 'font-size:11px!important;line-height:1.15!important}',
      both('#view-sala .pos-tile-ic' + P) + ','
        + both('#view-sala .pos-svc>img' + P) + ','
        + both('#view-sala .pos-prod>img' + P)
        + '{grid-column:auto!important;grid-row:auto!important;'
        + 'width:28px!important;height:28px!important}',
      both('#view-sala .pos-tile-name' + P)
        + '{grid-column:auto!important;min-height:0!important;font-size:11px!important;'
        + 'line-height:1.15!important;max-height:2.4em!important}',
      both('#view-sala .pos-tile-price' + P)
        + '{grid-column:auto!important;font-size:13px!important;font-weight:800!important}',
      both('#view-sala .pos-tile-exvat' + P)
        + '{grid-column:auto!important;font-size:10px!important}',
      both('#view-sala .pos-cart' + P)
        + '{padding:10px!important;border-radius:12px!important}',
      both('#view-sala .pos-cart>div:first-child' + P) + strip,
      both('#view-sala #pos-add-service' + P) + ','
        + both('#view-sala #pos-hreyf' + P) + ','
        + both('#view-sala #pos-drog' + P) + ','
        + both('#view-sala #pos-scan-top' + P)
        + '{flex:0 0 auto!important;min-height:0!important;height:42px!important;'
        + 'padding:0 10px!important;font-size:12px!important;white-space:nowrap!important}',
      both('#view-sala #pos-checkout' + P)
        + '{min-height:48px!important;height:48px!important;padding:0 14px!important;'
        + 'font-size:15px!important;border-radius:0!important}',

      /* ── 2. Fyrirtækjaprófíll (Companies.openDetail) ─────────────────────
         Aðeins þegar .co-banner er til — listinn í #companies-main er
         annars agents. Aðgerðaröð = Kröfu chips, ekki 50% flísar. */
      both('#companies-main:has(.co-banner)' + P)
        + '{padding:8px 8px 48px!important;max-width:none!important;'
        + 'overflow-x:auto!important;-webkit-overflow-scrolling:touch}',
      both('#companies-main .co-banner' + P)
        + '{padding:10px 12px!important;margin-bottom:8px!important;gap:10px!important;'
        + 'border-radius:12px!important;overflow-x:auto!important}',
      both('#companies-main .co-banner-mono' + P)
        + '{width:36px!important;height:36px!important;font-size:14px!important;'
        + 'border-radius:10px!important}',
      both('#companies-main .co-banner-name' + P)
        + '{font-size:16px!important;line-height:1.2!important}',
      both('#companies-main .co-banner-kt' + P)
        + '{font-size:11px!important}',
      both('#companies-main .co-banner-facts' + P)
        + '{gap:8px!important;margin-top:4px!important;font-size:12px!important}',
      both('#companies-main .co-banner-note' + P)
        + '{width:100%!important;max-width:100%!important;min-height:40px!important;'
        + 'font-size:16px!important}',
      both('#companies-main .co-banner-right' + P)
        + '{width:100%!important}',
      both('#companies-main:has(.co-banner)>div:first-child' + P)
        + strip.slice(0, -1) + ';margin-bottom:8px!important}',
      both('#companies-main:has(.co-banner)>div:first-child .btn' + P) + ','
        + both('#companies-main:has(.co-banner)>div:first-child button' + P)
        + '{flex:0 0 auto!important;min-height:36px!important;height:36px!important;'
        + 'padding:0 10px!important;font-size:13px!important;white-space:nowrap!important}',
      both('#companies-main [data-co-id]' + P)
        + strip.slice(0, -1) + ';margin-bottom:10px!important;padding:2px 0 6px!important}',
      both('#companies-main [data-co-id] .btn' + P) + ','
        + both('#companies-main [data-co-id] button' + P) + ','
        + A + '#companies-main:has(.co-banner) [data-co-id] button' + P + ','
        + A + '#companies-main:has(.co-banner) [data-co-id] .btn' + P
        + chip,
      both('#companies-main .uttekt-cols' + P)
        + '{display:flex!important;flex-direction:column!important;gap:10px!important}',
      both('#companies-main .uttekt-col-l' + P) + ','
        + both('#companies-main .uttekt-col-r' + P)
        + '{flex:1 1 auto!important;width:100%!important;max-width:none!important;'
        + 'min-width:0!important}',
      both('#companies-main .ut-row' + P)
        + '{flex-wrap:nowrap!important;overflow-x:auto!important;gap:8px!important;'
        + 'padding:7px 10px!important;-webkit-overflow-scrolling:touch}',
      both('#companies-main .ut-svc' + P) + ','
        + both('#companies-main .ut-act' + P) + ','
        + both('#companies-main .ut-grp-h' + P)
        + '{min-height:0!important;height:auto!important;padding-top:4px!important;'
        + 'padding-bottom:4px!important;font-size:12px!important}',
      both('#companies-main .ut-bulk' + P) + strip,
      both('#companies-main #_ctc-section' + P)
        + '{overflow-x:auto!important;-webkit-overflow-scrolling:touch}',

      /* ── 3. Ársskoðun openDetail (._ars-modal) ───────────────────────────
         Inline 3-dálka KPI + 4-dálka tækjaflísar + flex:1 min-width:140px
         fótur = risakort á 390px. Yfirlit: þétt spjald, chippa-röð. */
      both('._ars-modal-bg' + P)
        + '{padding:8px 8px 16px!important;align-items:flex-start!important;'
        + 'justify-content:flex-start!important}',
      both('._ars-modal' + P)
        + '{max-width:none!important;width:100%!important;max-height:calc(100dvh - 16px)!important;'
        + 'overflow-y:auto!important;border-radius:12px!important;'
        + 'box-sizing:border-box!important}',
      both('._ars-modal>div:first-child' + P)
        + '{padding:10px 12px!important;gap:8px!important}',
      both('._ars-modal ._ars-info-view>div:first-child' + P)
        + '{font-size:16px!important}',
      both('._ars-modal>div:nth-child(2)' + P)
        + '{padding:10px 12px 14px!important;gap:8px!important}',
      both('._ars-modal [style*="grid-template-columns:1fr 1fr 1fr"]' + P)
        + '{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;'
        + 'gap:6px!important;grid-template-columns:none!important;'
        + '-webkit-overflow-scrolling:touch}',
      both('._ars-modal [style*="grid-template-columns:1fr 1fr 1fr"]>div' + P)
        + '{flex:0 0 auto!important;min-width:132px!important;padding:6px 8px!important}',
      both('._ars-eq-grid' + P)
        + '{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important}',
      both('._ars-eq-grid>div' + P)
        + '{padding:5px 6px!important;border-radius:7px!important}',
      both('._ars-eq-val' + P)
        + '{font-size:15px!important}',
      both('._ars-modal [style*="flex-wrap:wrap"][style*="padding-top:8px"]' + P)
        + strip.slice(0, -1) + ';padding-top:6px!important}',
      both('._ars-modal ._ars-go-fyrirt' + P) + ','
        + both('._ars-modal ._ars-go-map' + P) + ','
        + both('._ars-modal ._ars-go-brunakerfi' + P) + ','
        + both('._ars-modal ._ars-go-samningur' + P)
        + chip.slice(0, -1) + ';flex:0 0 auto!important;min-width:46px!important;'
        + 'min-height:42px!important}',
      both('._ars-add-site' + P) + ','
        + both('._ars-info-toggle' + P)
        + '{min-height:32px!important;height:32px!important;padding:0 8px!important;'
        + 'font-size:12px!important}',
      both('._ars-modal input' + P) + ','
        + both('._ars-modal select' + P) + ','
        + both('._ars-modal textarea' + P)
        + '{font-size:16px!important}',
      both('._ars-modal input[type="checkbox"]' + P) + ','
        + both('._ars-modal input[type="radio"]' + P)
        + '{min-height:18px!important;width:18px!important;height:18px!important;'
        + 'padding:0!important}',

      /* Zoom: yfirlit verður að geta skrunað (ekki dauðu beige). */
      Z + '#view-sala,' + Z + M + '#view-sala,' + Z + A + '#view-sala,'
        + Z + '#companies-main,' + Z + '._ars-modal-bg'
        + '{overflow:auto!important;-webkit-overflow-scrolling:touch}'
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
  mountCss();
  document.addEventListener('slokk-viewmode', mountCss);
  [80, 400, 1200].forEach(ms => setTimeout(mountCss, ms));

  window.SalaArsProfilSimi338 = { mountCss, version: '338' };
  console.log('[patch-338] Sala + Árs-prófíll = Kröfu chip-row density (Sími only)');
})();
