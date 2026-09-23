/* === BRUNAKERFIS-SKÝRSLAN FYLLT INNI Í MIÐJUNNI (408) — 23.09.2026 =============================
 *
 * Agnar 23.09 23:00: „bara svo skýrslan sé í raun fyllanleg á miðju svæðinu eins og slökkviþjónustan".
 * Slökkvikerfisblaðið (386) fyllist inni á 🍳-flipanum; skoðunarskýrsla brunakerfisins (273) hoppaði
 * upp sem yfirlag yfir alla síðuna (#_bks-overlay, position:fixed, body læst). Sama mynstur og 386
 * notar á vinnusíðu 274: STAKIÐ ER FLUTT, ekki endurskrifað.
 *
 *   • BrunakerfiSkyrsla.openForm er vafið: sé 🚨-flipinn opinn (#_sks-bru sýnilegur með hýsta 274) er
 *     #_bks-overlay flutt inn í hýsil #_sks-bks efst í #_sks-bru, gert flæðandi (CSS hér), body-læsingin
 *     tekin af og spjöld 274 falin á meðan (klasi á #_sks-bru — inline display 274 ósnert, svo vaktir
 *     274/386 sjá enga breytingu). Allir hnappar formsins (Til baka · Vinnusvæði · Skýrsla · Vista drög ·
 *     Prenta · Ljúka) eru þeir sömu, hlustarar 273 ósnertir.
 *   • Lokun (273 setur display:none) → stakið flutt aftur út á body. 274 fylgist með display-breytingunni
 *     og endurhleður eins og áður (watchForm) — það sér stakið á sama stað og fyrr.
 *   • Prentun: prent-CSS 273 gerir ráð fyrir body>#_bks-overlay. beforeprint flytur stakið út,
 *     afterprint inn aftur.
 *   • Sé prófíllinn endurteiknaður (hash-skipti) meðan formið er hýst hverfur hýsillinn — stakið er
 *     þá sett aftur á body (falið) svo 273/274 finni það áfram. Aðeins tölva; síminn fær sama flæði
 *     og áður (yfirlag).
 * ============================================================================================ */
(() => {
  if (window.__bksInni408) return;
  window.__bksInni408 = true;

  const HOST_ID = '_sks-bks';
  const OPEN_CLS = '_sks-bks-open';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  const PLATE = '#e2e6ec';
  const PLATE_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  const LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';

  let ovRef = null;      // stakið sjálft — haldið í minni svo það týnist ekki þótt hýsillinn hverfi
  let printMoved = false;

  function scope() {
    const h = document.documentElement;
    return h.getAttribute('data-thm-preset') === 'brunastal' && h.getAttribute('data-viewmode') !== 'mobile' && !h.classList.contains('slokk-phone-dev') && !document.body.classList.contains('appmode');
  }
  function bruHost() {
    const b = document.getElementById('_sks-bru');
    if (!b || !b.isConnected || b.style.display === 'none') return null;
    if (!b.querySelector('#_bkc-overlay._sks-inni')) return null;
    return b;
  }
  function hosted() { return !!(ovRef && ovRef.classList.contains('_sks-inni') && ovRef.closest('#' + HOST_ID)); }

  function hostIn(bru) {
    const ov = document.getElementById('_bks-overlay'); if (!ov) return false;
    ovRef = ov;
    let host = document.getElementById(HOST_ID);
    if (!host || !host.isConnected) { host = document.createElement('div'); host.id = HOST_ID; }
    const bkc = bru.querySelector('#_bkc-overlay');
    if (host.parentNode !== bru) bru.insertBefore(host, bkc || null);
    if (ov.parentNode !== host) host.appendChild(ov);
    ov.classList.add('_sks-inni');
    bru.classList.add(OPEN_CLS);
    document.body.style.overflow = '';
    try { bru.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) {}
    return true;
  }
  function release(hide) {
    const ov = ovRef || document.getElementById('_bks-overlay'); if (!ov) return;
    const bru = document.getElementById('_sks-bru'); if (bru) bru.classList.remove(OPEN_CLS);
    ov.classList.remove('_sks-inni');
    if (ov.parentNode !== document.body) document.body.appendChild(ov);
    if (hide) ov.style.display = 'none';
    const host = document.getElementById(HOST_ID); if (host && host.parentNode) host.parentNode.removeChild(host);
  }

  // Lokun: 273 setur display:none → út á body (274 sér breytinguna á sama staki og endurhleður)
  function watchClose(ov) {
    if (ov.__bks408watch) return; ov.__bks408watch = true;
    new MutationObserver(() => {
      if (ov.style.display === 'none' && ov.classList.contains('_sks-inni')) release(true);
    }).observe(ov, { attributes: true, attributeFilter: ['style'] });
  }

  function wrap() {
    const B = window.BrunakerfiSkyrsla;
    if (!B || !B.openForm || B.__bks408) return !!B;
    const orig = B.openForm;
    B.openForm = function () {
      if (ovRef) ovRef.hidden = false;   // sjá tick(): falið með hidden eftir hash-skipti
      const bru = scope() ? bruHost() : null;
      const r = orig.apply(this, arguments);
      if (bru) { try { if (hostIn(bru)) watchClose(ovRef); } catch (e) { console.warn('[408] hýsing', e); } }
      return r;
    };
    B.__bks408 = true;
    return true;
  }

  // Prentun: prent-CSS 273 er `body>#_bks-overlay` — stakið verður að vera á body meðan prentað er
  window.addEventListener('beforeprint', () => { if (hosted()) { printMoved = true; const ov = ovRef; ov.classList.remove('_sks-inni'); document.body.appendChild(ov); } });
  window.addEventListener('afterprint', () => { if (printMoved && ovRef && ovRef.style.display !== 'none') { printMoved = false; const bru = bruHost(); if (bru) hostIn(bru); else release(false); } else printMoved = false; });

  // Hýsillinn hvarf (prófíll endurteiknaður / annar flipi valinn og síðan farið) → stakið aftur á body, falið
  function tick() {
    if (!wrap()) return;
    if (ovRef && ovRef.classList.contains('_sks-inni') && !ovRef.isConnected) {
      ovRef.classList.remove('_sks-inni');
      // hidden-eigind, EKKI style: 274 vaktar style-breytingar formsins og les #_bkc-overlay sem er þá horfið með prófílnum (TypeError)
      ovRef.hidden = true;
      document.body.appendChild(ovRef);
      document.body.style.overflow = '';
    }
  }
  setInterval(tick, 1000);
  window.addEventListener('hashchange', () => setTimeout(tick, 50));

  // ── CSS: formið flæðandi inni í 🚨-spjaldinu, sömu áferð og hýsta vinnusíðan ──────────────────
  const H = '#_sks-bru #' + HOST_ID + ' #_bks-overlay._sks-inni';
  const RB = 'content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none';
  const css = [
    '#_sks-bru.' + OPEN_CLS + ' > #_bkc-overlay{display:none!important}',
    // overflow:clip (ekki hidden): falinn ISO-dagsetningarreitur 149 (.dd-date-iso) stendur út úr og víkkaði síðuna; clip býr EKKI til skrunkassa svo sticky-toppstikan heldur sér
    '#_sks-bru #' + HOST_ID + '{display:block;position:relative;overflow:clip}',
    // skelin (402) er overflow:hidden → sticky-toppstikan festist við hana en ekki skrunarann; clip klippir eins án skrunkassa
    '#_sks-bru.' + OPEN_CLS + '{overflow:clip!important}',
    H + '{position:static!important;inset:auto!important;z-index:auto!important;overflow:visible!important;background:transparent!important;height:auto!important;font-family:' + SANS + '!important;color:#11141c}',
    H + ' ._bks-top{position:sticky;top:0;z-index:30;background:' + METAL + ';border-bottom:1px solid #000;padding:10px 24px;gap:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
    H + ' ._bks-top::before{' + RB + ';left:7px}',
    H + ' ._bks-top::after{' + RB + ';right:7px}',
    H + ' ._bks-logo{display:none!important}',
    H + ' ._bks-ttl{font-family:' + MONO + ';font-size:11.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
    H + ' ._bks-sub{font-family:' + MONO + ';font-size:11px;color:#c9d0da}',
    H + ' ._bks-hb{height:36px;padding:0 13px;border-radius:8px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ';color:#1f2530;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);font-family:' + SANS + ';font-size:12.5px;font-weight:600}',
    H + ' ._bks-hb:hover{background:' + SILVER + ';filter:brightness(.97)}',
    H + ' ._bks-hb._on{background:' + METAL_BTN + ';border-color:#000;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)}',
    H + ' ._bks-hb._grn{background:' + SAEKJA + ';border-color:rgba(52,168,98,.55);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3)}',
    H + ' ._bks-hb._grn:hover{background:' + SAEKJA + ';filter:brightness(1.1)}',
    H + ' ._bks-wrap{max-width:none!important;padding:12px!important}',
    H + ' ._bks-cust{background:' + PLATE + ';background-image:' + PLATE_IMG + ';border:1px solid rgba(20,24,34,.16);border-radius:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6);padding:12px 14px;margin-bottom:12px}',
    H + ' ._bks-f label{color:#525b6b;font-family:' + MONO + ';letter-spacing:.12em}',
    H + ' ._bks-f input{background:#eef1f6;border:1px solid rgba(20,24,34,.14);color:#141822;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);border-radius:8px}',
    H + ' ._bks-f input[type=date]{color-scheme:light}',
    H + ' ._bks-card{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 12px 30px -16px rgba(0,0,0,.55);overflow:hidden}',
    H + ' ._bks-ch{position:relative;background:' + METAL + ';border-bottom:1px solid #000;padding:10px 20px;font-family:' + MONO + ';font-size:11.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
    H + ' ._bks-ch::before{' + RB + ';left:7px}',
    H + ' ._bks-ch::after{' + RB + ';right:7px}',
    H + ' ._bks-ch small{font-family:' + MONO + ';color:#c9d0da;text-transform:none;letter-spacing:.02em}',
    H + ' ._bks-lbl{font-family:' + MONO + ';letter-spacing:.12em;color:#525b6b}',
    H + ' ._bks-in{border:1px solid rgba(20,24,34,.14);border-radius:8px;background:#eef1f6;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)}',
    H + ' ._bks-in:focus{background:#fff;outline:2px solid #b42318}',
    H + ' ._bks-add{background:' + METAL_BTN + ';border:1px solid #000;border-radius:8px;color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)}',
    H + ' ._bks-add:hover{background:' + METAL_BTN + ';filter:brightness(1.15)}',
    H + ' ._bks-sam,' + H + ' ._bks-flchip{background:' + METAL_BTN + ';border:1px solid #000;font-family:' + MONO + '}',
    H + ' ._bks-step button{background:' + SILVER + ';border:1px solid rgba(20,24,34,.14);color:#1f2530}',
    H + ' ._bks-athform{' + LINE + ';border:0}',
    H + ' ._bks-ath{' + LINE + ';border:0}',
    H + ' ._bks-seg button._on{background:' + METAL_BTN + ';border-color:#000}',
    H + ' ._bks-backbtn{background:' + METAL_BTN + ';border-color:#000}',
    H + ' ._bks-note{background:' + PLATE + ';border-bottom:1px solid rgba(20,24,34,.14);color:#3a4250;font-family:' + MONO + ';font-size:11.5px}',
    H + ' ._bks-sheetwrap{padding:18px 0 24px}',
    H + ' ._bks-sheet{border:1px solid #000;border-radius:8px;box-shadow:0 12px 30px -16px rgba(0,0,0,.55)}',
    H + ' ._bks-vtot ._big{border-top-color:#000}',
    H + ' ._bks-ttl,' + H + ' ._bks-sub{font-family:' + MONO + '!important}',
    H + ' ._bks-ttl{font-family:' + DISPLAY + '!important;font-size:16px!important;letter-spacing:0!important;text-transform:none!important}'
  ].join('\n');
  const st = document.createElement('style'); st.id = 'bks-inni-408'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => wrap()); else wrap();
  [600, 2000, 5000].forEach(ms => setTimeout(wrap, ms));
  console.log('[patch-408] brunakerfis-skýrslan fyllist inni í 🚨-flipanum');
})();
