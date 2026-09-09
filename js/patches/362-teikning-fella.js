/* === TEIKNING: FELLA SAMAN Á FYRIRTÆKJAPRÓFÍLNUM (362) ======================
 *
 * Agnar 09.09.2026: „Það vantar collapse takka á teikningar."
 *
 * Teikning-borðinn (`#co-fp-section`, smíðaður í `_coFpInject` í newfeatures.js
 * og skreyttur af 109) er 480 px hár rammi sem situr OFAN VIÐ tækjalistann og
 * ýtir öllu niður á hverjum einasta prófíl sem á mynd — líka þegar erindið á
 * síðunni kemur teikningunni ekkert við. Hér kemur takki í hausinn (hægra megin
 * við ↺) sem fellir rammann saman; hausinn stendur einn eftir (án línu að
 * neðan) svo hægt sé að opna aftur, og smellur á titilinn „TEIKNING" gerir það
 * sama.
 *
 * MUNAÐ MILLI HEIMSÓKNA í `localStorage` (`teikning_fellt`). Það brýtur ekki
 * samstillingar-regluna frá 05.09.2026: þetta lýsir engri STÖÐU GAGNA, þetta er
 * útlitsval eins vafra — nákvæmlega það sem sú regla telur upp sem leyfilegt
 * („sía, röðun, samanbrot, þema").
 *
 * ── ÞRENNT SEM ÞURFTI AÐ LEYSA (allt mælt í vafra 09.09.2026) ───────────────
 *
 * 1) MÆLINGIN — 0-vandamálið. `_coFpInject` reiknar grunnkvarða myndarinnar í
 *    `img.onload`: `W = vp.offsetWidth || 640`, `bs = W/iw`, og 109 mælir
 *    `vp.offsetWidth/offsetHeight` í `fitCanvasToViewport`. Væri ramminn
 *    `display:none` þegar borðinn er smíðaður mælist hann 0 → newfeatures fellur
 *    á 640 px í stað raunbreiddar (mælt: canvas 640×369,8 í stað 823,8×476) og
 *    109 hættir við (`vpW <= 0`). Þess vegna er falið ástand hér
 *    `height:0 + overflow:hidden` EN EKKI `display:none`: útlitið er nákvæmlega
 *    það sama (ramminn tekur enga hæð, hausinn stendur einn eftir), en BREIDDIN
 *    helst mælanleg svo grunnkvarðinn verður réttur strax. Aðeins hæðin mælist
 *    0, sem lætur 109 víkja á meðan — það er einmitt það sem á að gerast.
 *    Til vara er samt ÞVINGUÐ endur-mæling þegar opnað er aftur:
 *    `resize`-atburður (rAF + aftur eftir 350 ms) — 109 hlustar á hann og keyrir
 *    `decorate()` → `fitCanvasToViewport` með réttum málum. Staðfest: eftir
 *    fella→opna er canvas 823,846×476 á (215,077 , 2) — nákvæmlega sömu tölur og
 *    áður en fellt var.
 *    (Það er ekki hægt að kalla beint í 109 eða `_coFpInject`: hvorugt er flutt
 *    út. `_coFpInject` er inni í IIFE-inu sem hefst á línu 206 í newfeatures.js
 *    — staðfest í vafra að `window._coFpInject === undefined` — og 109 geymir
 *    `decorate` í sínu eigin lokunarsviði. `resize` er eina opna leiðin.)
 *
 * 2) SÍÐAN ER ALDREI RÓLEG. Fyrsta útgáfa notaði MutationObserver með 250 ms
 *    debounce eins og 109 gerir. Takkinn kom ALDREI aftur eftir að borðinn var
 *    endursmíðaður: `clearTimeout` endursetti biðina í hverri einustu hviðu og
 *    DOM-hviðurnar hætta aldrei (sjá frontend-profiler-skýrsluna, 06.09.2026).
 *    Hér er því inngjöf (throttle) sem keyrir ALLTAF innan 80 ms frá fyrstu
 *    hviðu, plús 1,5 s varðhundur ef athugandinn missir af. `skreyta()` skrifar
 *    ekkert í DOM þegar allt er þegar rétt (textinn borinn saman fyrst), svo
 *    hún kveikir ekki á sjálfri sér í gegnum athugandann.
 *
 * 3) BORÐINN ER ENDURSMÍÐAÐUR í hvert sinn sem `_coFpInject` keyrir
 *    (`prev.remove()` í hverri `Companies.openDetail`) — takkinn hverfur með
 *    honum og er settur á aftur, aðeins ef hann er ekki þegar til.
 *
 * Ástandið liggur á `<html>` sem `data-teikning="fellt"` (ekki klasi: aðrar
 * plástrar skrifa í `documentElement.className`) svo nýr borði mælist aldrei
 * sýnilegur augnablik og blikki. Sérhæfnin er blásin upp viljandi — `!important`
 * eitt og sér dugar ekki gegn 109 (sjá minnisatriðið um sérhæfni).
 *
 * newfeatures.js, 109-floorplan-banner.js og floorplanfix.js eru ÓSNERT.
 * Ekkert skrifað í grunninn.
 * ========================================================================== */
(() => {
  if (window.__teikningFellaInstalled) return;
  window.__teikningFellaInstalled = true;

  const LYKILL = 'teikning_fellt';
  const ATTR = 'data-teikning';      // á <html>: "fellt" eða ekkert
  const KL_HAUS = '_tf-haus';
  const BTN = '_tf-btn';
  const STIL = 'border:1px solid #d1d5db;border-radius:5px;padding:0 8px;height:26px;' +
    'background:#fff;cursor:pointer;font-size:11px;color:#374151;white-space:nowrap;';
  const TXT_FELLA = '⌃ Fella';
  const TXT_SYNA = '⌄ Sýna';

  function fellt() {
    try { return localStorage.getItem(LYKILL) === '1'; } catch (_) { return false; }
  }
  function vista(v) {
    try { v ? localStorage.setItem(LYKILL, '1') : localStorage.removeItem(LYKILL); } catch (_) {}
  }
  function setjaAstand(v) {
    if (v) document.documentElement.setAttribute(ATTR, 'fellt');
    else document.documentElement.removeAttribute(ATTR);
  }

  // ── CSS ──────────────────────────────────────────────────────────────────
  // `html[...] #co-fp-section #coFpVp` = (2 auðkenni, 1 eigind, 1 tag) og slær
  // þar með út `#co-fp-section._fpb-banner #coFpVp{height:480px!important}` í
  // 109 (2 auðkenni, 1 klasi) — bæði á skjáborði og í 768px-fjölmiðlareglunni.
  if (!document.getElementById('_tf-css')) {
    const st = document.createElement('style');
    st.id = '_tf-css';
    st.textContent =
      'html[' + ATTR + '="fellt"] #co-fp-section #coFpVp{' +
        'height:0 !important;min-height:0 !important;border:0 !important;overflow:hidden !important}' +
      'html[' + ATTR + '="fellt"] #co-fp-section > .' + KL_HAUS + ',' +
      'html[' + ATTR + '="fellt"] #co-fp-section > div:first-child{border-bottom:0 !important}' +
      '#' + BTN + ':hover{background:#f3f4f6}';
    document.head.appendChild(st);
  }
  setjaAstand(fellt());

  // ── Opnun: þvinguð endur-mæling (109 hlustar á resize) ───────────────────
  function hrista() { try { window.dispatchEvent(new Event('resize')); } catch (_) {} }
  function endurmaela() {
    try { requestAnimationFrame(hrista); } catch (_) { hrista(); }
    setTimeout(hrista, 350);
  }

  function merkja(b) {
    const f = fellt();
    const txt = f ? TXT_SYNA : TXT_FELLA;
    // Aðeins skrifað ef eitthvað breytist — annars kveikir athugandinn á sér.
    if (b.textContent !== txt) b.textContent = txt;
    const ttl = f ? 'Sýna teikninguna' : 'Fella teikninguna saman';
    if (b.title !== ttl) b.title = ttl;
    const ae = f ? 'false' : 'true';
    if (b.getAttribute('aria-expanded') !== ae) b.setAttribute('aria-expanded', ae);
  }

  function skipta(vilFella) {
    const nytt = (typeof vilFella === 'boolean') ? vilFella : !fellt();
    vista(nytt);
    setjaAstand(nytt);
    const b = document.getElementById(BTN);
    if (b) merkja(b);
    if (!nytt) endurmaela();
    console.log('[teikning-fella] ' + (nytt ? 'fellt saman' : 'opnað — endur-mæling þvinguð (resize → 109)'));
  }

  // ── Setur takkann á borðann (og aftur á, því hann er endursmíðaður) ──────
  function skreyta() {
    const sec = document.getElementById('co-fp-section');
    if (!sec) return;
    const rst = sec.querySelector('#coFpRst');
    const ctrl = rst ? rst.parentElement : null;
    if (!ctrl) return;
    const hdr = ctrl.parentElement;
    if (hdr && !hdr.classList.contains(KL_HAUS)) hdr.classList.add(KL_HAUS);

    // Titillinn „TEIKNING" fellir líka saman. (floorplanfix.js endurskrifar
    // textann í „TEIKNING · N staðsetningar"; það hreyfir ekki við hlustandanum
    // á span-inum sjálfum.)
    const titill = hdr ? hdr.querySelector(':scope > span') : null;
    if (titill && !titill.dataset.tfBundinn) {
      titill.dataset.tfBundinn = '1';
      titill.style.cursor = 'pointer';
      titill.style.userSelect = 'none';
      titill.title = 'Smelltu til að fella saman eða opna';
      titill.addEventListener('click', () => skipta());
    }

    let b = ctrl.querySelector('#' + BTN);
    if (!b) {
      // Leifar úr borða sem var fjarlægður — id verður að vera einkvæmt.
      const gamall = document.getElementById(BTN);
      if (gamall) gamall.remove();
      b = document.createElement('button');
      b.id = BTN;
      b.type = 'button';
      b.style.cssText = STIL;
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); skipta(); });
      ctrl.appendChild(b);
    }
    merkja(b);
  }

  // ── Fylgst með #companies-main (inngjöf, ekki debounce — sjá haus lið 2) ──
  let bidur = false;
  function nudda() {
    if (bidur) return;
    bidur = true;
    setTimeout(() => { bidur = false; skreyta(); }, 80);
  }

  function tengja() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(tengja, 800); return; }
    new MutationObserver(nudda).observe(main, { childList: true, subtree: true });
    skreyta();
  }
  tengja();
  setTimeout(skreyta, 1500);
  setTimeout(skreyta, 3000);
  // Varðhundur: ódýr (eitt getElementById þegar enginn borði er á skjánum) og
  // grípur ef athugandinn missir af eða hýsillinn er endurnýjaður undir honum.
  setInterval(skreyta, 1500);

  console.log('[teikning-fella] uppsett — collapse-takki á Teikning-borðann, ástand munað í localStorage(' + LYKILL + ')');
})();
