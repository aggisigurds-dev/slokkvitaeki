/* === BAKK Í APPINU — vafra-bakk fer TIL BAKA Í APPINU (2026-07-22) ===
 *
 * Ósk Agnars: „Can you make back button in browser act like a back in the page.
 * so it doesent just turn of the program unnececery" — bakk-takkinn í vafranum
 * hoppaði BEINT ÚT úr appinu, sama hversu langt maður var kominn inn í það.
 *
 * Af hverju gerðist það
 *  - Patch 218 (url-routing) og 235 (deep-link undirslóðir) skrifa slóðina með
 *    `history.replaceState` — VILJANDI, svo „flakk milli síðna spammi ekki
 *    bakk-söguna". Afleiðingin er samt sú að appið býr ALDREI til bakk-færslu:
 *    `history.length` stendur í stað hvað sem maður flakkar mikið, svo fyrsta
 *    bakk fer á það sem var á undan appinu (eða lokar flipanum).
 *
 * Hvað þetta gerir
 *  - Eftir hverja notenda-aðgerð er fylgst með hvort slóðin BREYTIST án þess að
 *    bakk-sagan lengist. Gerist það var replaceState notað þar sem alvöru færsla
 *    átti heima — og hún er endurgerð: gamla slóðin sett aftur á núverandi
 *    færslu og sú nýja ýtt ofan á. Bakk skilar sér þá á fyrri síðu í appinu.
 *  - Beðið er eftir að slóðin sitji kyrr (~240ms) áður en ýtt er, því sumar
 *    leiðir skrifa slóðina í tveimur skrefum (235 setur fyrst foreldrasíðuna
 *    `#fyrirtaeki` og svo `#company/293`) — annars kæmu tvær færslur á eina
 *    aðgerð.
 *  - Ekkert er vafið utan um switchView/setHash. Leiðin sem slóðin breytist
 *    skiptir engu máli, svo þetta nær yfir 218, 235 OG borð-patchana sem skrifa
 *    sína eigin hash (219/231/232/239) án þess að hrófla við þeim.
 *
 * Sambúð
 *  - Patch 276 (bakk lokar efsta LAGI: gluggar, form, ritlar) ýtir sínum eigin
 *    færslum ÁN slóðarbreytingar og situr því ofan á þessum. Bakk lokar fyrst
 *    opnum lögum (276) og fer svo á fyrri síðu (þetta). Engin árekstur.
 *  - Uppsettu öppin og Bílstjórinn eiga sín eigin bakk-kerfi (276 app-hamur /
 *    219) þar sem bakk MÁ ALDREI loka appinu — þeim er sleppt hér.
 *  - Patch 18 (gamla nav-history) er afvirkjað og kemur hvergi við sögu.
 */
(() => {
  if (window.__navBackInstalled) return;
  window.__navBackInstalled = true;

  const path = location.pathname || '', search = location.search || '';
  // 2026-08-06 (Agnar: „back only one step, everywhere — not all the way to the
  // beginning / closing the app"): áður var 277 SLEPPT í öllum uppsettu öppunum
  // (/app/<key>/, ?app=) — þá bjó appið ALDREI til síðu-bakk-færslur þar og bakk
  // hoppaði á forsíðuna. Nú keyrir 277 líka í uppsettu öppunum svo hver síða fái
  // sína bakk-færslu; 276 heldur botn-varnaglanum (lokar aldrei appinu). AÐEINS
  // Bílstjórinn er undanskilinn — hann á sitt eigið armBack í 219.
  if (/^\/app\/bilstjori\//.test(path) || /[?&]driver(?:$|[=&])/.test(search)
      || /[?&]app=bilstjori(?:$|[&])/.test(search)) {
    return;   // 219 sér um Bílstjórann
  }

  const SETTLE = 2;      // fjöldi kyrra mælinga áður en ýtt er (~240ms)
  const STEP = 120;      // ms milli mælinga
  const BUDGET = 20;     // hámark mælinga per aðgerð (~2.4s)

  let popAt = 0;
  window.addEventListener('popstate', () => { popAt = Date.now(); }, true);

  function fullUrl(hash) { return location.pathname + location.search + (hash || ''); }

  // replaceState-skrifin endurgerð sem alvöru bakk-færsla.
  function pushInstead(prev, next) {
    if (!next || prev === next) return;
    try {
      history.replaceState(history.state, '', fullUrl(prev));
      history.pushState(null, '', fullUrl(next));
    } catch (_) {}
  }

  let pending = null;

  function onGesture() {
    pending = { from: location.hash, len: history.length, seen: location.hash, stable: 0, n: 0 };
    setTimeout(tick, STEP);
  }

  function tick() {
    const p = pending; if (!p) return;
    // Bakk/áfram í gangi — slóðin breyttist ekki vegna aðgerðarinnar.
    if (Date.now() - popAt < 700) { pending = null; return; }
    const now = location.hash;
    if (now !== p.seen) { p.seen = now; p.stable = 0; } else { p.stable++; }
    if (now !== p.from && p.stable >= SETTLE) {
      // Lengdist sagan sjálf? Þá ýtti einhver annar rétt og ekkert þarf að gera.
      if (history.length === p.len) pushInstead(p.from, now);
      pending = null; return;
    }
    if (++p.n > BUDGET) { pending = null; return; }
    setTimeout(tick, STEP);
  }

  ['pointerdown', 'keydown'].forEach(ev =>
    window.addEventListener(ev, onGesture, true));

  window.NavBack = { pushInstead, pending: () => pending };
  try { console.log('[patch-277] bakk: vafra-bakk fer til baka í appinu'); } catch (_) {}
})();
/* === END BAKK Í APPINU === */
