/* === 230-brunastal-theme.js — „🔥 Brunastál" dark-metallic POS theme =========
 *
 * High-fidelity recreation of the uploaded “Dark Metallic POS Theme” handoff,
 * wired into the app's own Útlit theme system (patch 220) as a preset called
 * `brunastal`. It is OPT-IN: nothing changes until a user picks 🔥 Brunastál in
 * ⚙️ Útlit. Everything keys off `html[data-thm-preset="brunastal"]`, so the whole
 * effect appears/disappears with the preset and is fully reversible (delete this
 * file + its <script> + the preset entry in 220).
 *
 * The look (per the design spec):
 *   • a thick brushed-STEEL banner across the top of the content area with the
 *     real Brunahólf mark, live fire (img/theme/fire-flames.png) + ember underglow,
 *     a live LED CLOCK + date on the right (Space Mono);
 *   • a near-black metallic SIDEBAR with an accent-gradient active item;
 *   • a brushed steel-grey page BACKDROP, WHITE product/document cards;
 *   • metallic-black / accent CONTROLS, brushed tiles, glossy status pills;
 *   • Space Grotesk (UI) · Sora (wordmark) · Space Mono (numbers) fonts;
 *   • a switchable accent — red (default) · blue · gold — via the banner swatches.
 *
 * ROBUSTNESS: the banner is a SINGLE position:fixed element parented to <body>,
 * so it is never destroyed by a view's innerHTML re-render (pos.js owns
 * #view-sala). It shows on EVERY page and REPLACES each page's own banner (the
 * POS .pos-banner is hidden). Standard block pages get one deterministic scroller
 * beneath it; the bespoke flex pages (map / kanban / workshop) keep their native
 * flex+scroll and are simply inset below it (border-box shrinks their panes).
 * =========================================================================== */
(() => {
  if (window.__brunastal) return; window.__brunastal = true;

  const PRESET = 'brunastal';
  const ACC_LS = 'brunastal_accent';
  const PREV_LS = 'bstal_prev_preset';   // remembers the non-brunastal preset to return to

  // ── theme switch (Brunastál ⇄ sjálfgefið) ───────────────────────────────────
  function curPreset() { return document.documentElement.getAttribute('data-thm-preset') || ''; }
  // Apply a preset live (Theme API) AND persist it the same way ⚙️ Útlit does
  // (localStorage 'slokk_theme' + AppSettings 'ui_theme') so the choice sticks
  // across reloads and syncs across the machines.
  function setPreset(name) {
    try {
      if (window.Theme && typeof Theme.set === 'function') {
        Theme.set({ preset: name });
        const st = (Theme.get && Theme.get()) || { preset: name };
        try { localStorage.setItem('slokk_theme', JSON.stringify(st)); } catch (_) {}
        try { if (window.AppSettings && AppSettings.save) AppSettings.save({ ui_theme: st }); } catch (_) {}
      } else {
        document.documentElement.setAttribute('data-thm-preset', name);
      }
    } catch (_) {}
  }
  function prevPreset() {
    let p = 'klassiskt';
    try { p = localStorage.getItem(PREV_LS) || 'klassiskt'; } catch (_) {}
    return p === PRESET ? 'klassiskt' : p;
  }
  function goDefault() { setPreset(prevPreset()); }      // brunastal → sjálfgefið
  function goBrunastal() {                               // sjálfgefið → brunastal
    const c = curPreset();
    if (c && c !== PRESET) { try { localStorage.setItem(PREV_LS, c); } catch (_) {} }
    setPreset(PRESET);
  }
  // Nice page titles for the banner (fallback: active nav label, then brand).
  const VIEW_TITLES = {
    sala:'Sala', counter:'Afgreiðsla', workshop:'Verkstæði', field:'Leiðsögn',
    companies:'Fyrirtæki', income:'Tekjur', settings:'Stillingar', lanstaeki:'Lánstæki',
    geymsla:'Geymsla', vorur:'Vörur', utlit:'Útlit', rekstrarfelog:'Rekstrarfélög',
    brunakerfi:'Brunakerfi', tilbodhub:'Tilboð'
  };
  const WK = ['Sun','Mán','Þri','Mið','Fim','Fös','Lau'];
  const MO = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];

  // ── fonts ──────────────────────────────────────────────────────────────────
  function fonts() {
    if (document.getElementById('bstal-fonts')) return;
    const pre1 = document.createElement('link'); pre1.rel='preconnect'; pre1.href='https://fonts.googleapis.com';
    const pre2 = document.createElement('link'); pre2.rel='preconnect'; pre2.href='https://fonts.gstatic.com'; pre2.crossOrigin='';
    const l = document.createElement('link'); l.id='bstal-fonts'; l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
    document.head.appendChild(pre1); document.head.appendChild(pre2); document.head.appendChild(l);
  }

  // ── the metallic stylesheet (all scoped to the preset) ──────────────────────
  const P = 'html[data-thm-preset="'+PRESET+'"] ';
  const ON = 'html[data-bstal-banner="on"][data-thm-preset="'+PRESET+'"] ';
  const METAL_BLACK = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const PLATE_IMG   = 'linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px)';

  function styles() {
    if (document.getElementById('bstal-css')) return;
    const css = [
      /* ── accent variable sets (red default · blue · gold) ───────────────── */
      P+'{'
        +'--bstal-accent:#c92a2a; --bstal-accent2:#f0584c; --bstal-ring:rgba(190,32,28,.55); --bstal-glow:rgba(160,16,16,.55);'
        +'--bstal-grad:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);'
        +'--bstal-plate:#eef1f6; --bstal-plate-img:'+PLATE_IMG+';'
      +'}',
      'html[data-thm-preset="'+PRESET+'"][data-bstal-accent="blue"]{'
        +'--bstal-accent:#5b86ff; --bstal-accent2:#82a4ff; --bstal-ring:rgba(110,155,255,.55); --bstal-glow:rgba(64,113,240,.5);'
        +'--bstal-grad:linear-gradient(145deg,#03040a 0%,#0c1730 24%,#1d3c80 48%,#264c9e 56%,#0f2042 78%,#03060d 100%);}',
      'html[data-thm-preset="'+PRESET+'"][data-bstal-accent="gold"]{'
        +'--bstal-accent:#d9af52; --bstal-accent2:#e6c578; --bstal-ring:rgba(200,160,80,.55); --bstal-glow:rgba(200,160,80,.46);'
        +'--bstal-grad:linear-gradient(145deg,#120c03 0%,#332507 22%,#6f5318 44%,#9a7a2c 54%,#5a4314 74%,#181004 100%);}',

      /* ── fonts ──────────────────────────────────────────────────────────── */
      P+'body, '+P+'.view, '+P+'.topbar, '+P+'.vnav-btn, '+P+'#bstal-banner{font-family:"Space Grotesk",system-ui,-apple-system,sans-serif}',

      /* ── page backdrop: UNIFORM brushed steel-grey (no dark zone around the
       *    content/products — the fixed banner supplies the black at the top). */
      P+'.view{background:linear-gradient(180deg,#060607 0px,#060607 240px,#40444d 680px,#31343b 100%)!important}',
      /* the POS draws its own colourful banner — hide it; the steel one replaces it. */
      P+'.pos-banner{display:none!important}',

      /* ── SIDEBAR → near-black brushed metal ─────────────────────────────── */
      P+'.topbar{background:linear-gradient(180deg,#141519,#0c0d10)!important;border-right:1px solid #050506!important;box-shadow:6px 0 24px -14px #000}',
      P+'.brand{border-bottom:1px solid #060708!important}',
      P+'.brand-logo{width:40px!important;height:40px!important;flex:none!important;border-radius:12px!important;background:#0a0b0d!important;border:1px solid #060708!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 4px 10px -4px #000!important;display:flex!important;align-items:center!important;justify-content:center!important}',
      // top sidebar logo → flame mark with the design's gradient (yellow→orange→red)
      P+'.brand-logo svg{width:22px!important;height:26px!important;filter:drop-shadow(0 1px 2px rgba(255,120,20,.5))}',
      P+'.brand-name{color:#eef1f4!important}',
      P+'.nav-section-label{color:rgba(255,255,255,.3)!important}',
      P+'.vnav-btn{color:rgba(255,255,255,.62)!important;border-radius:9px}',
      P+'.vnav-btn:hover{background:rgba(255,255,255,.06)!important;color:#fff!important}',
      P+'.vnav-btn.active{background:var(--bstal-grad)!important;color:#fff!important;border:1px solid var(--bstal-ring);box-shadow:0 0 16px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.18)}',
      P+'.vnav-btn.active svg{color:#fff!important;opacity:1}',
      P+'.vnav-btn.active::before{background:var(--bstal-accent2)!important;box-shadow:0 0 8px var(--bstal-accent2);top:35%;bottom:35%;width:6px;border-radius:50%;left:6px}',
      P+'#alert-badge{background:#8a929e!important;color:#0c0d10!important}',

      /* ── scroll model: standard block pages → one deterministic scroller below
       *    the banner. box-sizing:border-box (app default) makes the inner
       *    .main-panel fit exactly beneath the banner with no clipping. */
      ON+'.view.active:not(#view-field):not(#view-counter):not(#view-workshop){height:100vh!important;overflow-y:auto!important;padding-top:160px!important}',
      ON+'.view.active:not(#view-field):not(#view-counter):not(#view-workshop)>.main-panel{height:100%!important;overflow-y:auto!important;max-width:none}',
      /* bespoke FLEX pages (map / kanban / workshop) → keep native flex+scroll,
       * just inset below the banner (border-box shrinks the inner panes to fit). */
      ON+'#view-field.active,'+ON+'#view-counter.active,'+ON+'#view-workshop.active{padding-top:152px!important}',

      /* ── WHITE cards (kept light) with the spec's soft shadow ───────────── */
      P+'.view .tcard,'+P+'.view .card,'+P+'.view [class*="-card"]{background:#fff!important;border:1px solid rgba(20,24,34,.08)!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)!important}',
      P+'.view h1{color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.55)}',

      /* ── BUTTONS: only real .btn-style buttons get the metal finish, so tiny
       *    icon/utility <button>s are NOT turned into black blobs. ─────────── */
      P+'.view .btn:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-brand),'
        +P+'.view .btn-outline,'+P+'.view .btn-secondary,'+P+'.view a.btn:not(.btn-primary),'+P+'.view a[download]{'
        +'background:'+METAL_BLACK+'!important;border:1px solid #0a0b0d!important;color:#fff!important;'
        +'box-shadow:inset 0 1px 0 rgba(255,255,255,.1)!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
      P+'.view .btn-primary,'+P+'.view .btn-brand,'+P+'.view [style*="background:var(--brand)"],'+P+'.view [style*="background: var(--brand)"]{'
        +'background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;'
        +'box-shadow:0 0 16px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.16)!important;text-shadow:0 1px 1px rgba(0,0,0,.4)}',
      P+'.view .btn:hover,'+P+'.view a[download]:hover{filter:brightness(1.2)}',
      P+'.view .btn:active{filter:brightness(.95);box-shadow:inset 0 2px 5px rgba(0,0,0,.55)!important}',

      /* ── brushed metal tiles (product/service flís) ─────────────────────── */
      P+'.view .pos-tile,'+P+'.view .tile,'+P+'.view .grid-tile{'
        +'background-color:var(--bstal-plate)!important;background-image:var(--bstal-plate-img)!important;'
        +'border:1px solid rgba(20,24,34,.09)!important;box-shadow:0 4px 12px -6px rgba(25,35,60,.12)!important;border-radius:13px}',
      P+'.view .pos-tile:hover,'+P+'.view .tile:hover,'+P+'.view .grid-tile:hover{'
        +'border-color:var(--bstal-ring)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 16px 34px -16px var(--bstal-glow)!important;transform:translateY(-3px)}',

      /* ── inputs: recessed light field ───────────────────────────────────── */
      P+'.view input:not([type=checkbox]):not([type=radio]):not([type=color]),'+P+'.view textarea,'+P+'.view select{'
        +'background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;color:#141822!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)}',

      /* ── STATUS pills: default = readable brushed silver (DARK text, never
       *    white-on-light); status sub-classes = glossy colour + white text. ─ */
      P+'.view .badge,'+P+'.view .pill,'+P+'.view .chip,'+P+'.view .tag{'
        +'background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;color:#11141c!important;border:1px solid rgba(20,24,34,.12)!important;'
        +'box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12)!important}',
      P+'.view .badge-success,'+P+'.view .pill-green,'+P+'.view .status-done,'+P+'.view [class*="-tilbuin"],'+P+'.view [class*="-buid"],'
        +P+'.view .chip.done,'+P+'.view .ws-chk.done,'+P+'.view ._sc_pill_done,'+P+'.view .vd-stat.done,'+P+'.view .ef-done,'+P+'.view ._bd-done{background:linear-gradient(150deg,#1f9d57,#0a4a26)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)!important}',
      P+'.view .badge-info,'+P+'.view .pill-blue,'+P+'.view .status-progress,'+P+'.view [class*="vinnsl"]{background:linear-gradient(150deg,#4f74dc,#16306f)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)!important}',
      P+'.view .badge-warning,'+P+'.view .pill-amber,'+P+'.view .status-pending,'+P+'.view [class*="-bidur"]{background:linear-gradient(150deg,#e0a93e,#9a6a14)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)!important}',
      P+'.view .badge-danger,'+P+'.view .pill-red,'+P+'.view .status-overdue,'+P+'.view [class*="-utrunnin"],'+P+'.view [class*="-haett"]{background:linear-gradient(150deg,#e25555,#a01818)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)!important}',

      /* ── numbers in Space Mono where the app marks them ─────────────────── */
      P+'.view .kr,'+P+'.view .price,'+P+'.view .amount,'+P+'.view .total,'+P+'.view .mono{font-family:"Space Mono",monospace}',

      /* ═══ SITE-WIDE RECIPES (Cowork audit §C/§D/§E) ══════════════════════ */
      /* focus rings (a11y) */
      P+'.view input:focus,'+P+'.view textarea:focus,'+P+'.view select:focus,'+P+'.view .btn:focus-visible,'+P+'.view button:focus-visible{outline:none!important;box-shadow:0 0 0 3px var(--bstal-ring)!important;border-color:var(--bstal-accent)!important}',
      /* checkboxes / radios take the accent */
      P+'.view input[type=checkbox],'+P+'.view input[type=radio]{accent-color:var(--bstal-accent)}',
      /* glossy success / danger buttons — so Afgreiðsla actions aren't flat (Cowork §3) */
      P+'.view .btn-success,'+P+'.modal .btn-success{background:linear-gradient(150deg,#1f9d57,#0a4a26)!important;border:1px solid #0a4a26!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 2px 5px rgba(0,0,0,.3)!important;text-shadow:0 1px 1px rgba(0,0,0,.4)}',
      P+'.view .btn-danger,'+P+'.modal .btn-danger{background:linear-gradient(150deg,#e25555,#a01818)!important;border:1px solid #7a1212!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 2px 5px rgba(0,0,0,.3)!important;text-shadow:0 1px 1px rgba(0,0,0,.4)}',
      /* filter chips / tabs / segmented: brushed-silver default, metallic-black active */
      P+'.view .filter-chip,'+P+'.view .seg button,'+P+'.view .thm-seg button,'+P+'.view .tab{background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;color:#11141c!important;border:1px solid rgba(20,24,34,.12)!important}',
      P+'.view .filter-chip.active,'+P+'.view .seg button.on,'+P+'.view .thm-seg button.on,'+P+'.view .tab.active{background:'+METAL_BLACK+'!important;color:#fff!important;border:1px solid #0a0b0d!important}',
      /* TABLES: white body, metallic-dark header, row hover (Cowork §D data-table recipe) */
      P+'.view table{background:#fff!important;border-color:rgba(20,24,34,.10)!important}',
      P+'.view table thead th{background:linear-gradient(180deg,#2b2f37,#15171c)!important;color:#eef1f4!important;border-color:#0a0b0d!important}',
      P+'.view table td,'+P+'.view table th{border-color:rgba(20,24,34,.08)!important}',
      P+'.view table tbody tr:hover td{background:rgba(20,24,34,.035)!important}',
      /* ── Afgreiðsla (#view-counter) + Verkstæði (#view-workshop) chrome ──
         The kanban toolbars/columns/headers use inline house styles; pull them
         into the metallic theme so the bespoke flex pages match the rest. */
      P+'#counter-sidebar,'+P+'.cw-toolbar{background:'+METAL_BLACK+'!important;border-bottom:1px solid #000!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}',
      P+'#counter-sidebar>span,'+P+'.cw-toolbar>div:first-child,'+P+'.cw-toolbar>span{color:#cfd4dc!important}',
      P+'.cw-col{background:#fff!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:0 12px 30px -16px rgba(0,0,0,.55)!important}',
      P+'.cw-col-head{background:'+METAL_BLACK+'!important;border-bottom:1px solid #000!important}',
      P+'.cw-col-sub{color:#9aa3b3!important}',
      /* keep status colour-coding but brightened so it reads on the dark header */
      P+'.cw-col-title[style*="#64748b"]{color:#aeb6c4!important}',
      P+'.cw-col-title[style*="#d97706"]{color:#f6b545!important}',
      P+'.cw-col-title[style*="#059669"]{color:#34d399!important}',
      P+'.cw-col-title[style*="#0d6efd"]{color:#6ea8ff!important}',
      P+'.cw-archive{background:'+METAL_BLACK+'!important;border-top:1px solid #000!important}',
      P+'.cw-archive span{color:#e7eaf0!important}',
      /* „Sækja inn úr fyrirtæki" → follow the accent (metal-red default, blue/gold) */
      P+'.view ._sr-btn{background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;box-shadow:0 0 16px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.16)!important;text-shadow:0 1px 1px rgba(0,0,0,.4)}',
      P+'.view ._sr-btn:hover{filter:brightness(1.15)}',
      /* Verkstæði single-column header (mockup): white title, metallic buttons.
         .bw-page-h1 is an <h1> so it already turns white via the .view h1 rule. */
      P+'.view .bw-page-sub{color:rgba(255,255,255,.78)!important}',
      P+'.view .bw-page-sub b{color:#82a4ff!important}',
      P+'.view .bw-scan,'+P+'.view .bw-sh-toggle{background:'+METAL_BLACK+'!important;border:1px solid #0a0b0d!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.07)!important}',
      P+'.view .bw-scan:hover,'+P+'.view .bw-sh-toggle:hover{filter:brightness(1.22)!important}',
      P+'.view .bw-sh-toggle.on{filter:brightness(1.32)!important;border-color:var(--bstal-ring)!important}',
      P+'.view .bw-sh-caret{color:rgba(255,255,255,.6)!important}',
      /* ── Fyrirtæki í þjónustu (#view-arsskodun) — match FyrirtaekiiThjonustu
         mockup: LIGHT page, inactive buttons light/silver w/ dark text, only the
         active one stands out (status=metallic, view/month=accent). */
      P+'.view ._ars-sub{color:rgba(255,255,255,.74)!important}',
      P+'.view ._ars-vm,'+P+'.view ._ars-st,'+P+'.view #_ars-sort,'+P+'.view #_ars-print{background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;border:1px solid rgba(20,24,34,.14)!important;color:#3a4250!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(20,30,60,.08)!important}',
      P+'.view ._ars-mo{background:#fff!important;border:1px solid rgba(20,24,34,.12)!important;color:#3a4250!important;box-shadow:none!important}',
      P+'.view ._ars-st[style*="var(--brand)"]{background:linear-gradient(145deg,#08080a,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709)!important;border:1px solid #0a0b0d!important;color:#fff!important}',
      P+'.view ._ars-vm[style*="var(--brand)"],'+P+'.view ._ars-mo[style*="var(--brand)"]{background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 14px -5px var(--bstal-glow)!important}',
      P+'.view ._ars-card{background:#fff!important;border:1px solid rgba(20,24,34,.12)!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.2)!important}',
      P+'.view ._ars-summary{background:#fff!important;border:1px solid rgba(20,24,34,.12)!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.2)!important}',
      /* ── ÞjónustuVerkstæði úttekt (tæki-listi + „Upplýsingar um úttekt" form) ──
         The list (.ut-list) + notes/cost panel (#_ctc-notes/#_ctc-section) are
         house light cards whose labels (var(--ink2)) went low-contrast on the
         grey backdrop. Force clean white cards so dark labels read; the harsh
         flat-black .ut-bulk bar becomes a metallic one. */
      P+'.ut-list,'+P+'#_ctc-notes,'+P+'#_ctc-section{background:#fff!important;border-color:rgba(20,24,34,.10)!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.22)!important}',
      P+'#_ctc-section{border-top:1px dashed #cfe8d8!important}',
      P+'.ut-bulk{background:'+METAL_BLACK+'!important;border-bottom:1px solid #000!important}',
      P+'.ut-grp-h{background:#f6f8fb!important}',
      P+'.ut-svcseg{background:#f1f4f8!important}',
      /* tæki-list secondary labels were var(--ink3)/(--ink4) → faint on the
         white card. One step darker so headers/serial/counts read. (Always on
         a white card, so safe — unlike the dark-header .cw-col-sub.) */
      P+'.ut-head .h-last,'+P+'.ut-head .h-now,'+P+'.ut-grp-cnt,'+P+'.ut-sub{color:var(--ink2)!important}',
      /* theme typeface reaches form controls + buttons (UA controls don't
         inherit the .view font-family). */
      P+'.view button,'+P+'.view input,'+P+'.view select,'+P+'.view textarea{font-family:"Space Grotesk",system-ui,-apple-system,sans-serif}',
      /* reikningur (úttekt) line-item amount column → mono numbers per the guide */
      P+'#_ctc-section tbody td:last-child,'+P+'#_ctc-section tfoot td:last-child{font-family:"Space Mono",monospace}',
      /* ── Allir viðskiptavinir (#view-allir-vidsk) — light page, fix off-theme bits ── */
      /* An info-banner sits ABOVE the title, pushing it down onto the LIGHT part
         of the backdrop — so the global white h1 was unreadable. Per the mockup
         the title is DARK on the light content (not white-on-dark): override the
         global `.view h1{color:#fff}` for this view + keep the subtitle muted. */
      P+'#view-allir-vidsk h1{color:#11141c!important;text-shadow:none!important}',
      P+'#view-allir-vidsk h1 + div{color:#5b6472!important}',
      P+'.view #_av-new-cust{background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;box-shadow:0 0 14px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.16)!important}',
      P+'.view ._av-ft[style*="background:#0f172a"],'+P+'.view ._av-xft[style*="background:#0f172a"],'+P+'.view ._av-vm[style*="background:#0f172a"]{background:'+METAL_BLACK+'!important;border-color:#0a0b0d!important}',
      /* INACTIVE filter/Sía/view-mode chips were near-white on the grey backdrop
         (esp. the Sía row ._av-xft #f8fafc) → washed out. Light-silver button w/
         dark text so they read as real buttons (matches the #188 treatment). */
      P+'.view ._av-ft[style*="background:#fff"],'+P+'.view ._av-vm[style*="background:#fff"],'+P+'.view #_av-selmode[style*="background:#fff"],'+P+'.view ._av-xft[style*="background:#f8fafc"]{background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;border:1px solid rgba(20,24,34,.16)!important;color:#3a4250!important}',
      /* ── Rekstrarfélög (#view-rekstrarfelog) ── */
      P+'.view .rf-ava{background:var(--bstal-grad)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 6px 12px -6px rgba(0,0,0,.5)!important}',
      P+'.view .rf-ava svg{stroke:#fff!important}',
      P+'.view ._rf_modebtn[style*="var(--surface)"],'+P+'.view ._rf_fchip[style*="var(--surface)"]{background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;border:1px solid rgba(20,24,34,.14)!important;color:#3a4250!important}',
      /* empty / loading / error states readable on the grey backdrop */
      P+'.view .loading-state,'+P+'.view .empty-state,'+P+'.view .empty{color:#3a4250!important}',
      /* hero metallic-blue total card (opt-in: add class .bstal-hero) */
      P+'.view .bstal-hero,'+P+'.view .hero-stat,'+P+'.view .stat-card.total{background:linear-gradient(150deg,#6f97ff 0%,#2f5fe0 34%,#1c3d8c 60%,#0b1838 100%)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 14px 34px -18px rgba(0,0,0,.7)!important}',
      P+'.view .bstal-hero *{color:#fff!important}',
      /* SVG bar charts (Tekjur o.fl.) — red bars → accent */
      P+'.view svg rect[fill="#dc2626"]{fill:var(--bstal-accent)!important}',
      /* Fyrirtæki í þjónustu (#153): „+ Nýtt fyrirtæki" flat red → accent metal CTA */
      P+'.view #_ars-new{background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;box-shadow:0 0 16px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.16)!important;text-shadow:0 1px 1px rgba(0,0,0,.4)}',

      /* ═══ SALA (POS) — replicate the Dark-Metallic design faithfully ═════ */
      /* right „KARFA" box → dark panel */
      P+'.view .pos-cart{background:#14171d!important;border:1px solid rgba(255,255,255,.06)!important;box-shadow:0 18px 44px -24px #000!important;color:rgba(255,255,255,.85)!important}',
      /* cart text → light (override dark inline colours + the 229 bridge) */
      P+'.view .pos-cart [style*="color:#64748b"],'+P+'.view .pos-cart [style*="color:#94a3b8"],'+P+'.view .pos-cart [style*="color:#334155"]{color:rgba(255,255,255,.6)!important}',
      P+'.view .pos-cart [style*="color:#0f172a"],'+P+'.view .pos-cart [style*="color:#111"],'+P+'.view .pos-cart [style*="color:#1e293b"]{color:#fff!important}',
      /* empty-cart dashed box → dark */
      P+'.view .pos-cart [style*="dashed"]{border-color:rgba(255,255,255,.14)!important;background:rgba(255,255,255,.03)!important}',
      /* „+ Annað" + „🧾 Bókhald" → metallic black */
      P+'.view #pos-add-service,'+P+'.view ._sala_shortcut_by{background:'+METAL_BLACK+'!important;color:#fff!important;border:1px solid #0a0b0d!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important}',
      /* section headers Viðskiptavinur / Þjónusta / Vörur → bigger + darker (per design) */
      P+'.view .pos-sec{font-size:14px!important;color:#3a4250!important;letter-spacing:.08em!important}',
      /* „ÁFRAM" + „Án kennitölu" walk-in → accent CTA (were green) */
      P+'.view #pos-checkout,'+P+'.view #_ups-walkin{background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;box-shadow:0 0 18px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.18)!important;text-shadow:0 1px 1px rgba(0,0,0,.4)}',
      /* „Skanna" → metallic black */
      P+'.view #pos-scan-top{background:'+METAL_BLACK+'!important;border:1px solid #0a0b0d!important;color:#fff!important}',
      /* POS service/product tiles → brushed metal plate */
      P+'.view .pos-svc,'+P+'.view .pos-prod{background-color:var(--bstal-plate)!important;background-image:var(--bstal-plate-img)!important;border:1px solid rgba(20,24,34,.09)!important;box-shadow:0 4px 12px -6px rgba(25,35,60,.12)!important}',
      P+'.view .pos-svc:hover,'+P+'.view .pos-prod:hover{border-color:var(--bstal-ring)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 16px 34px -16px var(--bstal-glow)!important;transform:translateY(-3px)}',
      /* metallic ic-*.png on matching ÞJÓNUSTA tiles (pos.js tags them data-bstic) */
      P+'.view .pos-tile-ic[data-bstic]{width:50px!important;height:50px!important;background-color:transparent!important;background-repeat:no-repeat;background-position:center;background-size:cover;border-radius:13px!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.18),0 7px 14px -6px rgba(20,30,60,.5)!important}',
      P+'.view .pos-tile-ic[data-bstic] svg{display:none!important}',
      P+'.view .pos-tile-ic[data-bstic="b"]{background-image:url(/img/theme/ic-b.png)}',
      P+'.view .pos-tile-ic[data-bstic="r"]{background-image:url(/img/theme/ic-r.png)}',
      P+'.view .pos-tile-ic[data-bstic="rr"]{background-image:url(/img/theme/ic-rr.png)}',
      P+'.view .pos-tile-ic[data-bstic="g"]{background-image:url(/img/theme/ic-g.png)}',
      P+'.view .pos-tile-ic[data-bstic="gb"]{background-image:url(/img/theme/ic-gb.png)}',
      P+'.view .pos-tile-ic[data-bstic="br"]{background-image:url(/img/theme/ic-br.png)}',
      P+'.view .pos-tile-ic[data-bstic="y"]{background-image:url(/img/theme/ic-y.png)}',
      /* MODALS (outside .view): white body, metallic header + buttons. The print
       * receipt uses a separate print window, so it is unaffected. */
      P+'.modal{background:#fff!important;border:1px solid rgba(20,24,34,.1)!important;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)!important}',
      P+'.modal-hd{background:'+METAL_BLACK+'!important;border-bottom:1px solid #0a0b0d!important}',
      P+'.modal-hd h2,'+P+'.modal-hd .modal-x,'+P+'.modal-hd *{color:#fff!important}',
      P+'.modal .fi,'+P+'.modal input:not([type=checkbox]):not([type=radio]),'+P+'.modal textarea,'+P+'.modal select{background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;color:#141822!important}',
      P+'.modal .btn:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-brand),'+P+'.modal .btn-outline{background:'+METAL_BLACK+'!important;border:1px solid #0a0b0d!important;color:#fff!important}',
      P+'.modal .btn-primary{background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important}',
      /* toasts → dark glossy */
      P+'.toast{background:linear-gradient(180deg,#1c1f25,#0e1014)!important;color:#fff!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:0 12px 30px -10px rgba(0,0,0,.7)!important}',
      /* hide the duplicate generic accent dots under Brunastál — the accent lives
       * in the banner swatches (Cowork §B1: unify accents). */
      'html[data-thm-preset="'+PRESET+'"] #view-utlit .thm-card:has(#thm-accents){display:none}',

      /* ═══ THE STEEL BANNER ═══════════════════════════════════════════════ */
      '#bstal-banner{position:fixed;top:10px;left:calc(var(--sidebar-w,220px) + 14px);right:14px;height:134px;z-index:40;'
        +'padding:7px;border-radius:16px;'
        +'background:linear-gradient(180deg,#26282d 0%,#121316 42%,#070708 100%);'
        +'box-shadow:inset 0 2px 0 rgba(255,255,255,.14),inset 0 -4px 8px rgba(0,0,0,.85),0 22px 40px -18px #000;'
        +'display:none}',
      'html[data-bstal-banner="on"] #bstal-banner{display:block}',
      '#bstal-banner .bb-face{position:relative;height:100%;border-radius:11px;overflow:hidden;'
        +'background:linear-gradient(180deg,#0c0d0f,#060607);box-shadow:inset 0 2px 8px rgba(0,0,0,.95),inset 0 -1px 0 rgba(255,255,255,.04);'
        +'display:flex;align-items:center;gap:18px;padding:0 22px}',
      '#bstal-banner .bb-bolt{position:absolute;width:12px;height:12px;border-radius:50%;z-index:6;'
        +'background:radial-gradient(circle at 35% 30%,#9aa1ab,#26282d 70%);box-shadow:inset 0 1px 1px rgba(255,255,255,.6),0 1px 2px #000}',
      '#bstal-banner .bb-flames{position:absolute;left:0;right:0;bottom:-2px;height:106px;z-index:1;pointer-events:none;'
        +'background:url("/img/theme/fire-flames.png") repeat-x bottom left;background-size:auto 100%;'
        +'-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 32%);mask-image:linear-gradient(180deg,transparent 0%,#000 32%);'
        +'transform:translateZ(0);will-change:transform}',  /* own GPU layer — not re-painted on clock tick */
      '#bstal-banner .bb-logo{position:relative;z-index:5;padding:6px 30px 6px 6px;margin-top:-4px}',
      '#bstal-banner .bb-logo::before{content:"";position:absolute;inset:-10px -30px -10px -20px;z-index:-1;'
        +'background:radial-gradient(closest-side at 36% 50%,rgba(0,0,0,.74),transparent 80%)}',
      '#bstal-banner .bb-logo img{display:block;height:44px;width:auto;filter:drop-shadow(0 2px 6px rgba(0,0,0,.7))}',
      '#bstal-banner .bb-word{font-family:"Sora",sans-serif;font-weight:700;font-size:17px;letter-spacing:.14em;color:#fff;'
        +'margin-top:6px;white-space:nowrap;text-shadow:0 2px 6px rgba(0,0,0,.85)}',
      '#bstal-banner .bb-word b{font-weight:500;color:rgba(255,255,255,.7)}',
      /* right cluster: theme-swatch box + recessed LED clock (per bannerexport.html) */
      '#bstal-banner .bb-rightwrap{position:relative;z-index:5;margin-left:auto;display:flex;align-items:center;gap:12px}',
      '#bstal-banner .bb-clockbox{text-align:right;padding:8px 16px;border-radius:12px;background:#050607;border:1px solid #000;box-shadow:inset 0 2px 10px #000,inset 0 0 30px rgba(255,160,40,.06)}',
      '#bstal-banner .bb-eyebrow{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.22em;color:rgba(255,178,77,.55)}',
      '#bstal-banner .bb-clock{font-family:"Space Mono",monospace;font-size:28px;font-weight:700;line-height:1.05;color:#ffb24d;font-variant-numeric:tabular-nums;letter-spacing:.5px;text-shadow:0 0 14px rgba(255,160,40,.85);contain:layout style}',
      '#bstal-banner .bb-date{font-size:10px;color:rgba(255,178,77,.5);font-family:"Space Mono",monospace;margin-top:1px;text-transform:uppercase}',
      '#bstal-banner .bb-sw{display:flex;gap:4px;padding:4px;border-radius:12px;background:#070809;border:1px solid #000;box-shadow:inset 0 2px 6px #000}',
      '#bstal-banner .bb-sw button{width:28px;height:22px;border-radius:7px;cursor:pointer;padding:0;border:2px solid rgba(255,255,255,.18);opacity:.5;transition:opacity .15s,border-color .15s}',
      '#bstal-banner .bb-sw button.on{opacity:1;border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.18)}',
      '#bstal-banner .bb-sw button.red{background:linear-gradient(145deg,#0d0102,#6c0d10 50%,#971515 60%,#100102)}',
      '#bstal-banner .bb-sw button.blue{background:linear-gradient(145deg,#03040a,#1d3c80 52%,#264c9e 60%,#03060d)}',
      '#bstal-banner .bb-sw button.gold{background:linear-gradient(145deg,#0d0802,#5c4413 52%,#82661f 60%,#100b03)}',
      '#bstal-banner .bb-themebtn{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;cursor:pointer;font-size:18px;line-height:1;border:1px solid #000;background:'+METAL_BLACK+';box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}',
      '#bstal-banner .bb-themebtn:hover{filter:brightness(1.25)}',
      /* ember underglow bleeding below the banner */
      '#bstal-ember{position:fixed;top:146px;left:calc(var(--sidebar-w,220px) + 8%);right:8%;height:60px;z-index:39;pointer-events:none;'
        +'background:radial-gradient(62% 100% at 50% 0%,rgba(255,110,30,.32),rgba(255,80,20,.08) 55%,transparent 76%);filter:blur(13px);display:none;'
        +'transform:translateZ(0);will-change:transform}',  /* isolate the costly blur to its own layer (painted once) */
      'html[data-bstal-banner="on"] #bstal-ember{display:block}',

      /* mobile: full-width banner, slimmer + smaller insets */
      '@media(max-width:760px){#bstal-banner{left:10px;right:10px;top:8px;height:104px}#bstal-banner .bb-logo img{height:34px}#bstal-banner .bb-word{font-size:13px}#bstal-banner .bb-clock{font-size:24px}#bstal-banner .bb-flames{height:80px}#bstal-ember{left:10px;right:10px;top:114px}'
        +ON+'.view.active:not(#view-field):not(#view-counter):not(#view-workshop){padding-top:120px!important}'
        +ON+'#view-field.active,'+ON+'#view-counter.active,'+ON+'#view-workshop.active{padding-top:114px!important}}'
    ].join('\n');
    const st = document.createElement('style'); st.id='bstal-css'; st.textContent = css;
    (document.head||document.documentElement).appendChild(st);
  }

  // ── the banner element ──────────────────────────────────────────────────────
  function buildBanner() {
    if (document.getElementById('bstal-banner')) return;
    const acc = localStorage.getItem(ACC_LS) || 'red';
    document.documentElement.setAttribute('data-bstal-accent', acc);
    const b = document.createElement('div');
    b.id = 'bstal-banner';
    b.innerHTML =
      '<div class="bb-bolt" style="top:9px;left:9px"></div><div class="bb-bolt" style="top:9px;right:9px"></div>'+
      '<div class="bb-bolt" style="bottom:9px;left:9px"></div><div class="bb-bolt" style="bottom:9px;right:9px"></div>'+
      '<div class="bb-face">'+
        '<div class="bb-flames"></div>'+
        '<div class="bb-logo">'+
          '<img src="/img/theme/brunaholf-mark.png" alt="Brunahólf">'+
          '<div class="bb-word">SLÖKKVITÆKI <b>EHF.</b></div>'+
        '</div>'+
        '<div class="bb-rightwrap">'+
          '<div class="bb-sw" id="bstal-sw">'+
            '<button class="blue'+(acc==='blue'?' on':'')+'" data-acc="blue" title="Blátt"></button>'+
            '<button class="red'+(acc==='red'?' on':'')+'" data-acc="red" title="Rautt"></button>'+
            '<button class="gold'+(acc==='gold'?' on':'')+'" data-acc="gold" title="Gyllt"></button>'+
          '</div>'+
          '<button class="bb-themebtn" id="bstal-themebtn" title="Til baka í venjulegt útlit (slökkva á Brunastáli)">🔥</button>'+
          '<div class="bb-clockbox">'+
            '<div class="bb-eyebrow">KASSAKERFI</div>'+
            '<div class="bb-clock" id="bstal-clock">--:--</div>'+
            '<div class="bb-date" id="bstal-date">—</div>'+
          '</div>'+
        '</div>'+
      '</div>';
    const ember = document.createElement('div'); ember.id = 'bstal-ember';
    document.body.appendChild(b); document.body.appendChild(ember);
    b.querySelector('#bstal-sw').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-acc]'); if (!btn) return;
      document.documentElement.setAttribute('data-bstal-accent', btn.dataset.acc);
      try { localStorage.setItem(ACC_LS, btn.dataset.acc); } catch (_) {}
      b.querySelectorAll('#bstal-sw button').forEach(x => x.classList.toggle('on', x === btn));
    });
    const tb = b.querySelector('#bstal-themebtn');
    if (tb) tb.addEventListener('click', goDefault);
  }

  // Always-present floating chip to turn Brunastál back ON when it's off
  // (the banner — and its toggle — only exist while brunastal is active).
  function ensureRestore() {
    if (document.getElementById('bstal-restore')) return;
    const r = document.createElement('button');
    r.id = 'bstal-restore';
    r.type = 'button';
    r.title = 'Kveikja á Brunastáls-útliti';
    r.innerHTML = '🔥';
    // Icon-only, top-right — same corner as the banner clock/toggle, so the
    // flame switch lives in one consistent spot whether Brunastál is on or off.
    r.style.cssText = 'display:none;position:fixed;right:16px;top:14px;z-index:9998;align-items:center;justify-content:center;width:40px;height:40px;border-radius:11px;cursor:pointer;font-size:19px;line-height:1;color:#fff;border:1px solid #971515;background:linear-gradient(145deg,#0d0102,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102);box-shadow:0 6px 20px -6px rgba(160,16,16,.6)';
    r.addEventListener('click', goBrunastal);
    document.body.appendChild(r);
  }

  // ── live clock ──────────────────────────────────────────────────────────────
  let clockTimer = null;
  function staffName() {
    try {
      const l = window.AppSettings && AppSettings.path && AppSettings.path('starfsmenn');
      if (Array.isArray(l)) { const f = l.find(s => s && s.name && String(s.name).trim()); if (f) return String(f.name).trim(); }
    } catch (_) {}
    return '';
  }
  function tickClock() {
    const c = document.getElementById('bstal-clock'); if (!c) return;
    const n = new Date();
    const p = (x) => String(x).padStart(2, '0');
    c.textContent = p(n.getHours())+':'+p(n.getMinutes());
    const d = document.getElementById('bstal-date');
    if (d) { const st = staffName(); d.textContent = WK[n.getDay()]+' '+n.getDate()+'. '+MO[n.getMonth()] + (st ? ' · ' + st : ''); }
  }

  // ── show/hide + live page title ─────────────────────────────────────────────
  let lastTitle = '';
  function refresh() {
    const on = document.documentElement.getAttribute('data-thm-preset') === PRESET;
    ensureRestore();
    const rst = document.getElementById('bstal-restore');
    if (rst) rst.style.display = on ? 'none' : 'flex';
    if (!on) { document.documentElement.removeAttribute('data-bstal-banner'); lastTitle=''; return; }
    fonts(); styles(); buildBanner();
    document.documentElement.setAttribute('data-bstal-banner', 'on');
    if (!clockTimer) { tickClock(); clockTimer = setInterval(tickClock, 1000); }
    // The eyebrow is a static „KASSAKERFI" label (LED-clock widget); no per-page
    // title update needed.
  }

  // ── hooks: theme attr changes + every view switch ───────────────────────────
  try {
    new MutationObserver(refresh).observe(document.documentElement, { attributes:true, attributeFilter:['data-thm-preset'] });
  } catch (_) {}
  (function wrap(){
    if (!window.App || typeof App.switchView !== 'function') { return void setTimeout(wrap, 120); }
    if (App.switchView.__bstal) return;
    const orig = App.switchView.bind(App);
    App.switchView = function(){ const r = orig.apply(this, arguments); try{ refresh(); }catch(_){ } return r; };
    App.switchView.__bstal = true;
  })();
  setInterval(refresh, 700);  // safety net for patch-views that bypass switchView
  if (document.readyState !== 'loading') refresh();
  else document.addEventListener('DOMContentLoaded', refresh);

  console.log('[patch-230] 🔥 Brunastál metallic theme ready (pick it in ⚙️ Útlit)');
})();
/* === END BRUNASTÁL THEME === */
