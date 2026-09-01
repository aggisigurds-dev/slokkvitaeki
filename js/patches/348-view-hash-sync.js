/* === VIEW ↔ HASH SYNC (refresh lands you where you were) v1 ===
 *
 * Agnar 2026-09-01: „ef maður refreshar að maður endi ekki alltaf á
 * sölusíðunni. helst bara haldast þar sem maður er."
 *
 * MÆLT, EKKI ÁLYKTAÐ. Smellt á hvern nav-hnapp og borið saman virk sýn vs.
 * slóðin á eftir (17 hnappar prófaðir):
 *
 *   Stjórnstöð    → virk sýn „stjornstod"   en slóðin sagði „#afgreidsla"
 *   Tilboð        → virk sýn „tilbod"       en slóðin sagði „#afgreidsla"
 *   Samningar     → virk sýn „samningar"    en slóðin sagði „#afgreidsla"
 *   Eftirfylgni   → virk sýn „eftirfylgni"  en slóðin sagði „#afgreidsla"
 *   📱 Öpp        → virk sýn „opp"          en slóðin sagði „#verkbord"
 *
 * ÞESS VEGNA lendir refresh á Afgreiðslu — sölu-borðinu. Nákvæmlega kvörtunin.
 * (Afgreiðsla→counter og Verkstæði→workshop LÍTA út eins og ósamræmi en eru
 * réttar ALIAS-færslur í 218; þær endurheimtast rétt. Ekki „laga" þær.)
 *
 * RÓTIN: 218 skrifar slóðina með því að vefja App.switchView. ~40 pappar vefja
 * þá sömu fúnksjón og sumir stytta sér leið fyrir SÍNA sýn án þess að kalla
 * áfram (218 lýsir þessu sjálft í athugasemd um syncNav). Þá keyrir vafningur
 * 218 aldrei og slóðin situr eftir á fyrri sýn. Sýnirnar fjórar að ofan eru
 * auk þess búnar til á keyrslutíma (pappar 61/201/50/194) svo þær eru hvorki
 * í ALIAS né í index.html.
 *
 * LAUSNIN: hætta að treysta vafningakeðjunni og LESA ÞESS Í STAÐ DOM-inn —
 * hver sýn er raunverulega `.view.active` — og halda slóðinni í takt við hana.
 * Það virkar sama hvaða leið var farin í sýnina.
 *
 * ÖRYGGISATRIÐIÐ SEM MÁ ALDREI FALLA ÚT:
 * Ekkert er skrifað fyrr en NOTANDI hefur snert appið (mousedown/keydown/
 * touchstart/pointerdown — sömu mörk og pappi 154 notar). Á ræsingu er slóðin
 * djúptengill sem 218/154 eru að endurheimta MEÐAN virka sýnin er enn
 * sjálfgefna Sala-sýnin; skrifaði þessi pappi þá myndi hann yfirskrifa
 * djúptengilinn með „#sala" og eyðileggja einmitt þá endurheimt sem hann á að
 * þjóna. Fyrsta snerting er mörkin á milli „ræsing er enn að landa" og
 * „notandinn stýrir núna".
 *
 * Snertir ekki slóðir sem tilheyra öðrum pöppum: key=value (#device=, #portal=,
 * #tab=), gamla #view-… formið, né neitt slóðarlegt með „/" — sömu reglur og
 * cleanHash() í 218. replaceState (ekki pushState) svo bakk-hnappurinn fyllist
 * ekki, og replaceState vekur ekki hashchange svo engin lykkja við 218.
 */
(() => {
  if (window.__viewHashSyncInstalled) return;
  window.__viewHashSyncInstalled = true;

  // Ræsingarmörkin — sjá haus. Ekkert skrifað fyrr en þetta er satt.
  let userTouched = false;
  ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, () => { userTouched = true; }, { capture: true, passive: true });
  });

  function activeViewId() {
    const el = document.querySelector('.view.active');
    if (!el || !el.id || el.id.indexOf('view-') !== 0) return '';
    return el.id.slice(5);
  }

  function slugFor(v) {
    try {
      if (window.UrlRouting && typeof UrlRouting.slugForView === 'function') return UrlRouting.slugForView(v);
    } catch (_) {}
    return v;
  }

  // Er núverandi slóð okkar að eiga við? Sömu útilokanir og 218.cleanHash().
  function hashIsOurs() {
    const h = (location.hash || '').replace(/^#/, '');
    if (!h) return true;                     // tóm slóð — óhætt að skrifa í hana
    if (h.indexOf('=') !== -1) return false; // #device=, #portal=, #tab=…
    if (h.indexOf('view-') === 0) return false;
    if (h.indexOf('/') !== -1) return false;
    return true;
  }

  // Slóðar-drifin ferð tilheyrir 218: þegar hashchange kviknar (notandi límir
  // slóð, bakk/áfram, eða pappi setur location.hash) skiptir 218 um sýn. Kvikni
  // þessi pappi á meðan sér hann ENN gömlu sýnina og skrifar gömlu slóðina til
  // baka — sem drepur ferðina. Mælt: slóð sett á #arsskodun fór aftur í #opp.
  // Þess vegna: þögn í 2,5s eftir hverja hashchange svo 218 nái að landa.
  // (Hvorki replaceState 218 né okkar kveikir hashchange, svo venjuleg ferð
  //  innan appsins lendir aldrei í þessari þögn.)
  let quietUntil = 0;
  window.addEventListener('hashchange', () => { quietUntil = Date.now() + 2500; });

  function sync() {
    if (!userTouched) return;
    if (Date.now() < quietUntil) return;
    if (!hashIsOurs()) return;
    const v = activeViewId();
    if (!v) return;
    const slug = slugFor(v);
    if (!slug) return;
    const cur = (location.hash || '').replace(/^#/, '');
    if (cur === slug) return;
    // Slóðin nefnir AÐRA sýn en þá sem er virk → hún er úrelt. Leiðréttum.
    try { history.replaceState(null, '', '#' + slug); } catch (_) {}
  }

  // Atburðadrifið: fylgjast með `class`-breytingum (sýn verður .active) í stað
  // þess að poll-a. Kviknar oft, svo raunvinnan er samandregin í eitt rAF.
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || setTimeout)(() => { queued = false; sync(); }, 0);
  }

  // ── Endurheimt fyrir sýnir sem verða til SEINT ──────────────────────────────
  // 218.applyHash() gefst upp þegjandi ef `view-<slug>` er ekki til (218:121) og
  // ræsi-lykkja þess reynir aðeins í ~1,9s (218:158-162). Sýnir sem pappar búa
  // til á keyrslutíma geta komið eftir það. MÆLT: #samningar (pappar 50/194)
  // náðist ekki og notandinn lenti á #sala — VERRA en áður, því án þessa pappa
  // sat slóðin á #afgreidsla og skilaði a.m.k. réttri grannsýn. Þetta er því
  // ekki fínpússun heldur skilyrði fyrir því að pappinn geri ekki illt verra.
  //
  // Því: haltu áfram að reyna í 8s, en AÐEINS meðan slóðin nefnir sýn sem er
  // ekki enn til. Hættir um leið og hún birtist, eða þegar notandi tekur við.
  function restoreLateView() {
    const want = (location.hash || '').replace(/^#/, '');
    if (!want || !hashIsOurs()) return;
    let tries = 0;
    (function tick() {
      if (userTouched) return;              // notandinn stýrir — ekki grípa fram fyrir
      if (++tries > 53) return;             // ~8s á 150ms
      let view = want;
      try {
        if (window.UrlRouting && typeof UrlRouting.resolveView === 'function') view = UrlRouting.resolveView(want);
      } catch (_) {}
      if (document.getElementById('view-' + view)) {
        // Sýnin er mætt — láttu 218 um sjálfa ferðina svo nav-highlight fylgi.
        try { if (window.UrlRouting && UrlRouting.applyHash) UrlRouting.applyHash(); } catch (_) {}
        return;
      }
      // Sumar sýnir eru búnar til LATT — fyrst þegar farið er í þær (t.d.
      // #samningar, pappar 50/194). Þá kemur `view-…` aldrei af sjálfu sér og
      // biðin hér að ofan yrði eilíf: MÆLT, #samningar endaði á #sala. Fyrir
      // þær er switchView SJÁLFUR smiðurinn, svo eftir stutta bið (svo venjuleg
      // ræsing 218/154 fái fyrsta orðið) prófum við hann EINU SINNI og
      // staðfestum svo að hann hafi raunverulega landað.
      if (tries === 5 && window.App && typeof App.switchView === 'function') {
        try {
          App.switchView(view);
          if (document.getElementById('view-' + view)) {
            try { if (window.UrlRouting && UrlRouting.applyHash) UrlRouting.applyHash(); } catch (_) {}
            return;
          }
        } catch (_) { /* óþekkt sýn — þegjum og skilum venjulegri lendingu */ }
      }
      setTimeout(tick, 150);
    })();
  }

  function start() {
    restoreLateView();
    try {
      new MutationObserver(schedule).observe(document.body, {
        attributes: true, attributeFilter: ['class'], subtree: true,
      });
    } catch (_) {}
    // Bakvörður: sýnir sem eru búnar til á keyrslutíma geta orðið virkar án
    // class-breytingar á núverandi hnút. Ódýrt (ein querySelector).
    setInterval(sync, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.ViewHashSync = { sync, activeViewId, slugFor };
  try { console.log('[view-hash-sync v1] installed'); } catch (_) {}
})();
/* === END VIEW ↔ HASH SYNC === */
