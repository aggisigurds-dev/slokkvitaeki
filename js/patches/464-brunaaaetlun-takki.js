/* 464 — BRUNAÁÆTLUN-TAKKI Á FYRIRTÆKJAPRÓFÍL (13.10.2026)
 *
 * Opnar smiðinn /brunaaaetlun/?fyrirtaeki=<id> í nýjum flipa: viðbragðs- og rýmingaráætlun, eigið eldvarnaeftirlit,
 * flóttaáætlanir (IS/EN, ein á hvert herbergi), SHS-samningur og gátlistar — reitir, textar og merkingar á teikningu
 * hverrar hæðar (teikning_bord) eru fylltar þar og geymdar í töflunni brunaaaetlun. Agnar 13.10.2026: „útbúa form
 * generator sem við getum sett inn fleiri merkingum … svo við getum klárað svona sjálf".
 *
 * Sama mynstur og 370 (Hreyfingaryfirlit): á tölvu í Brunastáli situr takkinn í .co-banner .b405-knappar, annars í
 * takkaröðinni. 464 á hnútinn og staðinn; setja() skrifar ekkert ef takkinn er þegar á réttum stað. 462 kallar á
 * setja() í sama tifi og borðinn teiknast (SKREF), svo takkinn hoppar ekki inn eftir á.
 */
(() => {
  if (window.BrunaaaetlunTakki) return;
  const KLASI = '_ba-takki';

  function opna(coId) { window.open('/brunaaaetlun/?fyrirtaeki=' + encodeURIComponent(coId), '_blank', 'noopener'); }

  function setja() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const rod = main.querySelector('div[data-co-id]:not(._cat-section)');
    if (!rod) return;
    const coId = rod.getAttribute('data-co-id');
    if (!/^\d+$/.test(String(coId || ''))) return;
    if (!main.querySelector('.co-banner .b405-knappar') && window.Efsta405 && Efsta405.scope()) { try { Efsta405.tick(); } catch (_) {} }
    const heim = main.querySelector('.co-banner .b405-knappar') || rod;
    const til = main.querySelector('.' + KLASI);
    if (til && til.dataset.co === coId && til.parentElement === heim) return;
    if (til) til.remove();
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm ' + KLASI + (heim !== rod ? ' b405-knappur' : '');
    b.dataset.co = coId;
    b.title = 'Brunaáætlun — viðbragðs- og rýmingaráætlun, eigið eldvarnaeftirlit og flóttaáætlanir (opnast í nýjum flipa)';
    b.setAttribute('aria-label', 'Brunaáætlun');
    if (heim !== rod) {
      // Í spjaldinu er takkaröðin 428 px og brotnar aldrei (411) — orðið myndi stytta Þjónustusamning og Hreyfingaryfirlit
      // með „…". Hér er því aðeins tákn (útgangur) í fastri breidd; inline !important vinnur flex-reglu 411.
      b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="3" width="11" height="18" rx="1"/><circle cx="17.5" cy="6.5" r="1.6"/><path d="M17 9.5l-2 4 3 2 1 4M15 13.5l-3-1M18 15.5l3-1"/></svg>';
      b.style.setProperty('flex', '0 0 auto', 'important');
      b.style.setProperty('padding', '0 10px', 'important');
    } else b.textContent = 'Brunaáætlun';
    b.addEventListener('click', () => opna(coId));
    heim.appendChild(b);
  }

  function vakta() {
    const main = document.getElementById('companies-main');
    if (!main) return false;
    new MutationObserver(setja).observe(main, { childList: true });
    setja();
    return true;
  }
  if (!vakta()) document.addEventListener('DOMContentLoaded', vakta, { once: true });
  // #companies-main er skipt út eftir ræsingu (sjá 370) — tifarinn kostar eitt querySelector og skrifar ekkert í kyrrstöðu.
  setInterval(() => {
    const v = document.getElementById('view-companies');
    if (v && !v.classList.contains('active')) return;
    setja();
  }, 1200);

  window.BrunaaaetlunTakki = { opna, setja };
})();
