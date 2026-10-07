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
      // 07.10.2026 (Agnar: „þegar maður opnar Bílstjóra í tölvunni opnist tablet view“): 219 læsir rótinni
      // við 440 px á ≥1100 px (sími-rammi miðjaður á skrifstofuskjá) — gridið skipti þá 440 px í 68 + 360 og
      // vinstri dálkurinn var klipptur (mælt 1400 px: listi 68 px, kort 360 px). Rótin fær fulla breidd hér og
      // dálkarnir snúa eins og á striganum: listinn 360–400 px til vinstri, kortið fær restina.
      R + '.bt.screen,html body #view-bilstjori #_bs-root.bt.screen{max-width:100%!important}',
      'html body #view-bilstjori .bt .dock,html body #view-bilstjori .bt.screen .dock{max-width:100%!important}',
      R + '{display:grid!important;grid-template-columns:minmax(360px,400px) minmax(0,1fr)!important;' +
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

      // ── 07.10.2026 (Agnar: „taka út Agnar og Hákon kassana, hafa bara nafnið í þessu rauða, lækka hæðina á
      //    fyrirtækja boxunum“): starfsmanna-spjöldin undir DAGURINN Í DAG hverfa á spjaldtölvunni — nafnarofinn
      //    (rauða flísin) stendur einn. Stoppspjöldin þéttast: mælt 1400 px fyrir ≈ 230 px hvert, eftir ≈ 150 px.
      'html body #view-bilstjori #_bs-vakt>div:not(:first-child){display:none!important}',
      'html body #view-bilstjori #_bs-vakt>#_bs-manudur{display:flex!important}',   // mánaðarstrimillinn er líka barn #_bs-vakt — má ekki hverfa með spjöldunum
      'html body #view-bilstjori #_bs-vakt>div:first-child{margin-bottom:2px!important}',
      'html body #view-bilstjori #_bs-list{gap:8px!important}',
      'html body #view-bilstjori .bt .stop__body{padding:8px 10px 8px 14px!important;gap:10px!important}',
      'html body #view-bilstjori .bt .badge{width:28px!important;height:28px!important;font-size:12px!important}',
      'html body #view-bilstjori .bt .stop__name{font-size:14px!important}',
      'html body #view-bilstjori .bt .stop__addr{font-size:12px!important;margin-top:1px!important}',
      'html body #view-bilstjori .bt .stop__body>div>div:last-of-type:not(._bsnota){margin-top:4px!important}',
      'html body #view-bilstjori ._bsnota{margin-top:5px!important}',
      'html body #view-bilstjori ._bsnota input{height:32px!important;font-size:13px!important}',
      // NB: _bs-list er AUÐKENNI (sjá 397) — ._bs-list hitti aldrei, 52 px reglan hér fyrir neðan heldur ekki.
      'html body #view-bilstjori #_bs-list .stop__actions .act{min-height:36px!important;height:36px!important;font-size:12.5px!important}',
      'html body #view-bilstjori .bt .stop__body>div>div:last-of-type:not(._bsnota){flex-wrap:nowrap!important}',
      'html body #view-bilstjori .bt .stop__meta{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      'html body #view-bilstjori .bt .stop .pill{white-space:nowrap!important;flex:none!important}',   // „Í lagi 2026“ braut sig í tvær línur (43 px)
      // Fyrirtækjaspjaldið (smellur á punkt) rann inn sem 440 px sími-dálkur í MIÐJUNNI yfir kortinu (Agnar: „símalookið
      // kemur ef maður ýtir á punkt“). Á spjaldtölvunni leggst það að hægri brún, 480 px breitt, kortið sést áfram vinstra megin.
      'html body ._bs-sheet.bt.screen{left:auto!important;right:0!important;width:480px!important;max-width:480px!important;box-shadow:-18px 0 40px -20px rgba(0,0,0,.7)!important;border-left:1px solid #000}',
      'html body ._bs-sheet .dock{left:auto!important;right:0!important;width:480px!important;max-width:480px!important}',

      // ── Mánaðarskoðunin (Agnar 07.10: „það sem er með mánaðarskoðunina núverandi mánuð, það sem er eftir og í vinnslu“)
      'html body #view-bilstjori #_bs-manudur{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 2px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-family:' + MONO + ';font-size:11.5px;color:#c7ccd3}',
      'html body #view-bilstjori #_bs-manudur b{color:#fff;font-size:13px}',
      'html body #view-bilstjori #_bs-manudur .mn{font-weight:800;letter-spacing:.08em;color:#d9b25a;text-transform:uppercase}',
      'html body #view-bilstjori #_bs-manudur i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:-1px}',
      'html body #view-bilstjori #_bs-manudur .sl{margin-left:auto;color:#8a93a5}',

      // ── 07.10.2026 (Agnar: „setja sem í sama þema og allt hitt“): spjaldtölvu-sýnin í Brunastál C — stálgrár
      //    röndóttur grunnur, silfur-/málmtakkar í stað grænu og bláu, Playfair-titill, JetBrains Mono á tölum.
      //    Síminn (<900 px) heldur Bílstjóra-þemanu úr 219 óbreyttu.
      'html body #view-bilstjori ._bs-root.bt{font-family:' + SANS + '!important;background:#e2e6ec!important;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)!important}',
      'html body #view-bilstjori{background:#1f2126!important}',
      'html body #view-bilstjori .bt .topbar__title{font-family:"Playfair Display",Georgia,serif!important;font-weight:800!important;font-size:20px!important}',
      'html body #view-bilstjori .bt .topbar__sub,html body #view-bilstjori ._bs-prog2,html body #view-bilstjori #_bs-prog2{font-family:' + MONO + '!important}',
      'html body #view-bilstjori .bt .search{height:42px!important;border-radius:8px!important;border:1px solid rgba(20,24,34,.2)!important;box-shadow:none!important}',
      'html body #view-bilstjori .bt .seg__btn{height:40px!important;border-radius:8px!important;border:1px solid rgba(20,24,34,.2)!important;background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;color:#1f2530!important;font-size:12.5px!important;font-weight:700!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.08)!important}',
      'html body #view-bilstjori .bt .seg__btn.is-active{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;color:#fff!important;border-color:#000!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)!important}',
      'html body #view-bilstjori #_bs-vakt>div:first-child span{color:#1f2530!important;font-family:' + MONO + '!important;font-size:10px!important;letter-spacing:.16em!important}',
      'html body #view-bilstjori #_bs-manudur{background:#fff!important;border:1px solid rgba(20,24,34,.16)!important;color:#3a4250!important}',
      'html body #view-bilstjori #_bs-manudur b{color:#11141c!important}html body #view-bilstjori #_bs-manudur .mn{color:#8a5a0c!important}html body #view-bilstjori #_bs-manudur .sl{color:#6b7483!important}',
      'html body #view-bilstjori .bt .stop{border-radius:10px!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:0 1px 2px rgba(0,0,0,.06)!important}',
      'html body #view-bilstjori .bt .stop__rail{width:4px!important}',
      'html body #view-bilstjori .bt .badge{background:#1f2530!important;box-shadow:0 0 0 1px #1f2530!important;font-family:' + MONO + '!important}',
      'html body #view-bilstjori .bt .badge--todo{background:#c92a2a!important;box-shadow:0 0 0 1px #c92a2a!important}html body #view-bilstjori .bt .badge--done{background:#16783f!important;box-shadow:0 0 0 1px #16783f!important}',
      'html body #view-bilstjori .bt .stop__addr,html body #view-bilstjori .bt .stop__meta{font-family:' + MONO + '!important}',
      'html body #view-bilstjori .bt .stop__actions .act{background:#f3f5f8!important;color:#1f2530!important;font-weight:700!important}',
      'html body #view-bilstjori .bt .act--done{background:#eef7f0!important;color:#0f5c33!important}html body #view-bilstjori .bt .act--done.is-done{background:linear-gradient(180deg,#1f9d5a,#0f6e3a)!important;color:#fff!important}',
      'html body #view-bilstjori .bt .dock{background:linear-gradient(180deg,rgba(226,230,236,0),rgba(226,230,236,.96) 42%)!important}',
      // fyrirtækjaspjaldið (._bs-sheet) — sama klæðning
      'html body ._bs-sheet.bt{font-family:' + SANS + '!important;background:#e2e6ec!important;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)!important}',
      'html body ._bs-sheet .card{border-radius:10px!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:0 1px 2px rgba(0,0,0,.06)!important}',
      'html body ._bs-sheet .sec-label{font-family:' + MONO + '!important;font-size:10px!important;letter-spacing:.16em!important;color:#6b7483!important}',
      'html body ._bs-sheet .field{border-radius:8px!important;border:1px solid rgba(20,24,34,.18)!important;background:#fff!important}',
      'html body ._bs-sheet .btn{border-radius:8px!important}',
      'html body ._bs-sheet .btn--light{background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;border:1px solid rgba(20,24,34,.2)!important;color:#1f2530!important}',
      'html body ._bs-sheet .btn--dark{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;border:1px solid #000!important}',
      'html body ._bs-sheet .seg__btn{height:40px!important;border-radius:8px!important;border:1px solid rgba(20,24,34,.2)!important;background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;color:#1f2530!important;font-weight:700!important}',
      'html body ._bs-sheet .seg__btn.is-active{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;color:#fff!important;border-color:#000!important}',
      'html body ._bs-sheet .topbar .topbar__title,html body ._bs-sheet .topbar div[style*="font-weight:800"]{font-family:"Playfair Display",Georgia,serif!important}',

      // ── Snertifletir í listanum ──────────────────────────────────────────
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
  /* Mánaðarskoðunin: fyrirtæki í þjónustu með skoðunarmánuð = núverandi mánuður, talin eins og 219 statusFor()
   * flokkar þau — búið (last_year_inspected = árið), í vinnslu (field_inspected_year = árið, skjöl eftir), eftir
   * (hvorugt). Lesið beint úr sömu gögnum og listinn (Companies.list + arsskodun_customers), ekkert sótt. */
  const MAN = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];
  function manudur() {
    const vakt = document.getElementById('_bs-vakt');
    if (!vakt) return;
    if (innerWidth < 900) { const g = document.getElementById('_bs-manudur'); if (g) g.remove(); return; }
    const cos = (window.Companies && Companies.list) || [];
    const ars = (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {};
    const bru = (window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_customers')) || {};
    const cy = new Date().getFullYear(), cm = new Date().getMonth() + 1;
    let buid = 0, vinnsla = 0, eftir = 0;
    cos.forEach(c => {
      const a = ars[String(c.id)] || null;
      const inSv = (c && c.er_i_thjonustu === true) || (a && (a.subscribed === true || a.equipment)) || !!bru[String(c.id)];
      if (!inSv || !a || +a.inspect_month !== cm) return;
      if (+a.last_year_inspected === cy) buid++;
      else if (+a.field_inspected_year === cy) vinnsla++;
      else eftir++;
    });
    const alls = buid + vinnsla + eftir;
    const html = '<span class="mn">' + MAN[cm - 1] + '</span><span><b>' + alls + '</b> á skoðun</span>' +
      '<span><i style="background:#e23232"></i><b>' + eftir + '</b> eftir</span>' +
      '<span><i style="background:#e0a93e"></i><b>' + vinnsla + '</b> í vinnslu</span>' +
      '<span><i style="background:#1f9d57"></i><b>' + buid + '</b> búið</span>' +
      '<span class="sl">' + (alls ? Math.round((buid + vinnsla) / alls * 100) : 0) + ' % hafið</span>';
    let el = document.getElementById('_bs-manudur');
    if (!el) { el = document.createElement('div'); el.id = '_bs-manudur'; vakt.appendChild(el); }
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
  }

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
    try { manudur(); } catch (e) { console.warn('[396] manudur', e); }

    const set = (el, col, row, svaedi) => {
      if (!el) return;
      // 26.09.2026: skrifa aðeins breytingar — raða() keyrir nú við hverja teikningu.
      if (el.style.getPropertyValue('grid-column') !== col) el.style.setProperty('grid-column', col, 'important');
      if (el.style.getPropertyValue('grid-row') !== row) el.style.setProperty('grid-row', row, 'important');
      if (svaedi && el.dataset.bsSvaedi !== svaedi) el.dataset.bsSvaedi = svaedi;
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
      if (c.style.getPropertyValue('grid-column')) c.style.removeProperty('grid-column');
      if (c.style.getPropertyValue('grid-row')) c.style.removeProperty('grid-row');
      if ('bsSvaedi' in c.dataset) delete c.dataset.bsSvaedi;
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
    // 26.09.2026 (hopp-yfirferð): raða() beið 260 ms eftir hverja teikningu 219 og á meðan
    // málaðist listinn í EINUM dálki (framvindan 206 px há) → allt hoppaði þegar reitirnir komu.
    // Nú raðað í sama örverki og teikningin (upprunalegi MO, fyrir málun); resize-púlsinn bíður áfram.
    const MO = window.__NativeMutationObserver || MutationObserver;
    new MO(ms => {
      for (const m of ms) {
        if (m.type === 'childList' && m.addedNodes.length) {
          try { raða(); } catch (e) { console.warn('[396] raða', e); }
          puls(); return;
        }
      }
    }).observe(v, { childList: true, subtree: true });
    addEventListener('hashchange', puls);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1000));
  else setTimeout(start, 1000);

  console.log('[396] Bílstjóri á spjaldtölvu');
})();
/* === END BÍLSTJÓRI Á SPJALDTÖLVU === */
