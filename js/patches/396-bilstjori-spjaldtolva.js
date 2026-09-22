/* === BÍLSTJÓRI Á SPJALDTÖLVU (396) — 22.09.2026 ===
 *
 * Agnar: „Can you also make bilstjori in powerful tablet mode".
 *
 * Á 1180 px spjaldtölvu var Bílstjórinn ein mjó súla: kortið 190 px hátt bandi
 * yfir allri breiddinni, og undir því sást EITT stopp í einu — restin af
 * skjánum fór í loft. Í bílnum er þetta skjárinn sem maður les með annarri
 * hendinni á stýrinu, svo plássið á að vinna.
 *
 * Á ≥900 px verður sýnin TVEIR DÁLKAR:
 *   • vinstra megin leitin, síurnar og stoppalistinn — það sem maður snertir,
 *   • hægra megin kortið, hátt og FAST (sticky) svo það fylgir þegar listinn
 *     skrunast. Kortið er þá jafn hátt og skjárinn, ekki 190 px band.
 *   • hausinn, framvindan og „Keyra leið dagsins" ná yfir báða dálka.
 *
 * Snertifletir: Maps · Hringja · Merkja búið fá 52 px hæð og stærra letur.
 *
 * Síminn er ÓSNERTUR (allt inni í @media (min-width:900px)) og 219 sjálft er
 * ekki snert — þetta er stílblað ofan á. Leaflet þarf að vita af nýju hæðinni,
 * svo hjúpurinn sendir resize-atburð þegar útlitið tekur gildi; Leaflet hlustar
 * á hann sjálfgefið og teiknar flísarnar upp á nýtt.
 */
(() => {
  if (window.__bsSpjald396) return;
  window.__bsSpjald396 = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),';

  function css() {
    const R = 'html body #view-bilstjori ._bs-root';
    return [
      // ── Tveir dálkar ─────────────────────────────────────────────────────
      R + '{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(360px,42%)!important;' +
        'column-gap:12px!important;align-content:start!important}',
      // Staðsetningin sjálf er sett inline af raða() — eftir INNIHALDI, ekki
      // raðnúmeri. Fyrsta útgáfan notaði :nth-child og þá lenti kortið utan
      // dálksins um leið og 219 teiknaði börnin í annarri röð (mælt: hægri
      // dálkurinn stóð tómur og „Dagurinn í dag" sat þar sem kortið átti að vera).
      R + '>[data-bs-svaedi="kort"]{position:sticky!important;top:8px!important;align-self:start!important;padding:12px 12px 0 0!important}',
      R + '>[data-bs-svaedi="listi"]{min-width:0!important}',

      // Kortið hátt — ekki 190 px band. 190 px af 820 px skjá er 23%; hér fær það
      // það sem eftir stendur þegar haus, framvinda og dokkan eru dregin frá.
      // Hæðin verður að fara á `.map`-umgjörðina: 219 setur
      // `.bt .map #_bs-mapcanvas{position:absolute;inset:0}` svo striginn fylgir
      // henni. Fyrsta atlagan setti hæð á strigann sjálfan og kortið stóð tómt.
      'html body #view-bilstjori ._bs-root .map{height:calc(100vh - 268px)!important;min-height:420px!important;border-radius:2px!important;overflow:hidden!important}',
      'html body #view-bilstjori #_bs-mapcanvas{border-radius:2px!important}',

      // ── Snertifletir í listanum ──────────────────────────────────────────
      'html body #view-bilstjori ._bs-list button{min-height:52px!important;font-size:15px!important}',
      'html body #view-bilstjori ._bs-list{padding-bottom:12px!important}',

      // ── Haus og framvinda í Miðakerfinu ─────────────────────────────────
      'html body #view-bilstjori header.topbar{background-image:' + STRIPE + METAL + '!important;border-bottom:1px solid #23262c!important}',
      'html body #view-bilstjori ._bs-prog2{background-image:' + STRIPE + METAL + '!important;font-family:' + MONO + '!important}',
      'html body #view-bilstjori ._bs-vakt{font-family:' + MONO + '!important;letter-spacing:.06em!important}',
      'html body #view-bilstjori .dock{font-family:' + SANS + '!important}',
    ].join('\n');
  }

  function inject() {
    let st = document.getElementById('_bsspjald-css');
    if (!st) {
      st = document.createElement('style');
      st.id = '_bsspjald-css';
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = '@media (min-width: 900px){\n' + css() + '\n}';
  }

  /* Hver hluti fær sinn reit — greindur á innihaldi svo röðin í 219 megi breytast.
   * Aðeins grid-staðsetning er sett; ekkert element er fært, falið eða smíðað. */
  function raða() {
    if (innerWidth < 900) { hreinsa(); return; }
    const root = document.querySelector('#view-bilstjori ._bs-root');
    if (!root) return;
    const born = Array.from(root.children);
    const kort = born.find(c => c.querySelector && c.querySelector('#_bs-mapcanvas'));
    const leit = born.find(c => c.querySelector && c.querySelector('input'));
    const haus = born.find(c => c.tagName === 'HEADER');
    // NB: hlutarnir bera ýmist klasa, auðkenni eða hvorugt eftir því hvernig 219
    // teiknar þá (mælt: `_bs-list` er AUÐKENNI, og í einni teikningu báru prog/vakt
    // engan klasa). Þess vegna er leitað í þessari röð og loks eftir innihaldi.
    const prog = born.find(c => c.classList.contains('_bs-prog2')) ||
      born.find(c => /kláruð/.test(c.textContent || '') && c !== haus);
    const vakt = born.find(c => c.classList.contains('_bs-vakt')) ||
      born.find(c => /DAGURINN Í DAG/i.test(c.textContent || '') && (c.textContent || '').length < 120);
    const listi = born.find(c => c.id === '_bs-list' || c.classList.contains('_bs-list'));
    const dokk = born.find(c => c.classList.contains('dock')) ||
      born.find(c => /Keyra leið/.test(c.textContent || ''));
    // Síuhnapparnir: blokkin með „Dagsins verk" sem er hvorki leit né kort.
    const siur = born.find(c => c !== leit && c !== kort && /Dagsins verk|Akstur/.test(c.textContent || '') && !c.classList.contains('_bs-list'));
    if (!kort || !listi) return;

    const set = (el, col, row, svaedi) => {
      if (!el) return;
      el.style.setProperty('grid-column', col, 'important');
      el.style.setProperty('grid-row', row, 'important');
      if (svaedi) el.dataset.bsSvaedi = svaedi;
    };
    set(haus, '1 / 3', '1');
    set(prog, '1 / 3', '2');
    set(leit, '1', '3');
    set(siur, '1', '4');
    set(vakt, '1', '5');
    set(listi, '1', '6', 'listi');
    set(kort, '2', '3 / 7', 'kort');
    set(dokk, '1 / 3', '7');
  }

  function hreinsa() {
    const root = document.querySelector('#view-bilstjori ._bs-root');
    if (!root) return;
    Array.from(root.children).forEach(c => {
      c.style.removeProperty('grid-column');
      c.style.removeProperty('grid-row');
      delete c.dataset.bsSvaedi;
    });
  }

  // Leaflet mælir hæðina sína þegar kortið er búið til; nýja hæðin kemur úr
  // stílblaði og kveikir engan atburð sjálf. Einn resize-púls dugar — Leaflet
  // hlustar á window.resize og kallar invalidateSize() sjálft.
  let t = null;
  function puls() {
    clearTimeout(t);
    t = setTimeout(() => {
      try { raða(); } catch (e) { console.warn('[396] raða', e); }
      try { window.dispatchEvent(new Event('resize')); } catch (_) {}
    }, 260);
  }

  function start() {
    inject();
    const v = document.getElementById('view-bilstjori');
    if (!v) { setTimeout(start, 1200); return; }
    puls();
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'childList' && m.addedNodes.length) { puls(); return; }
      }
    }).observe(v, { childList: true, subtree: true });
    addEventListener('hashchange', puls);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1000));
  else setTimeout(start, 1000);

  console.log('[396] Bílstjóri á spjaldtölvu');
})();
/* === END BÍLSTJÓRI Á SPJALDTÖLVU === */
