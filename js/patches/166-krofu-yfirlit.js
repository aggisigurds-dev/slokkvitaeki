/* === KRÖFU YFIRLIT v1 ===
 *
 * Mánaðar-yfirlit yfir ALLAR ógreiddar sölur með greitt_med='reikningur'
 * (Senda reikning / krafa í heimabanka 10 dagar). Aðskilið frá "Til að
 * rukka" sem inniheldur líka 'greitt_sidar'.
 *
 * Markmið: í lok mánaðar þarf Agnar að senda hverri fyrirtækjakröfu inn
 * í heimabankann. Þessi síða hjálpar honum að:
 *   1. Sjá alla útistandandi kröfu-sölu á einum stað
 *   2. Gruppera per fyrirtæki — heildartala per fyrirtæki er það sem fer
 *      í heimabankann
 *   3. Merkja allar sölur fyrirtækis sem greitt þegar krafan er búin
 *
 * Sidebar entry "📋 Kröfu yfirlit" rétt fyrir neðan "Til að rukka".
 */
(() => {
  if (window.__krofuYfirlitInstalled) return;
  window.__krofuYfirlitInstalled = true;

  // ── Brunastál-scoped skin ──────────────────────────────────────────────────
  // The page title/subtitle/month sit on the dark top band of the Brunastál
  // page gradient, where the default dark ink is invisible. Under that preset
  // only, flip the title band to white (per THEME-SPEC) and give figures the
  // Space Mono treatment. Scoped so the light themes are untouched.
  (function injectSkin() {
    const ID = 'ky-brunastal-skin';
    if (document.getElementById(ID)) return;
    if (!document.getElementById('ky-fonts')) {
      const l = document.createElement('link');
      l.id = 'ky-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
      (document.head || document.documentElement).appendChild(l);
    }
    const s = document.createElement('style');
    s.id = ID;
    const V = '#view-krofu-yfirlit ';
    const B = 'html[data-thm-preset="brunastal"] #view-krofu-yfirlit ';
    // Sími-hamur (getViewMode()==='mobile' ⇒ html[data-viewmode="mobile"]). Notað
    // AÐEINS til að endur-flæða SAMEIGINLEG haus-element (KPI-spjöld + síu-borða) á
    // síma — breiða/tafla-sýnin (data-viewmode desktop/table) er ósnert. Ný ky-m*/
    // ky-co*/ky-acts kort-element eru eingöngu á síma svo þau þurfa ekki þennan skala.
    const M = 'html[data-viewmode="mobile"] #view-krofu-yfirlit ';
    // App-ham + sími (uppsett öpp): sama og M en AÐEINS í appi — notað til að gera
    // haus-texta dökkan því .view fær þvingaðan hvítan bakgrunn í appmode (patch 261).
    const MA = 'html[data-viewmode="mobile"] body.appmode #view-krofu-yfirlit ';
    s.textContent =
      // v3 handoff: light-metallic labelled action buttons (Krafa send / Greitt / …)
      V + '.ky-abtn{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:46px;height:42px;padding:0 7px;border-radius:9px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#ffffff,#dbe0e9);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.95),0 3px 6px -3px rgba(20,30,60,.3);cursor:pointer;font:inherit;transition:transform .12s ease,box-shadow .12s ease}' +
      V + '.ky-abtn:hover{transform:translateY(-1px);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.95),0 6px 12px -4px rgba(20,30,60,.42)}' +
      V + '.ky-abtn.on{background:linear-gradient(150deg,#2bbf6c,#0f6e3a);border-color:#156e3a;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 3px 7px -3px rgba(15,110,58,.5)}' +
      V + '.ky-row:hover{background:#f7f9fd}' +
      // Barely-visible per-krafa athugasemd/áminning reitur — svartur texti,
      // ósýnilegur rammi þar til hann er valinn.
      V + '._ky-note{color:#11141c !important;background:transparent !important;border:1px solid transparent !important;border-bottom:1px dashed #d7dce4 !important;border-radius:5px !important;box-shadow:none !important}' +
      V + '._ky-note::placeholder{color:#c8cfd9}' +
      V + '._ky-note:hover{border-bottom-color:#b6bec9 !important}' +
      V + '._ky-note:focus{background:#fff !important;border:1px solid #93c5fd !important}' +
      B + '.darkfield::placeholder{color:rgba(255,255,255,.55)}' +
      B + '.ky-navbtn option{background:#1a1a1f;color:#fff}' +
      // 2026-07-01 (Agnar): stretch the page to fill the content area and hug the
      // sidebar + top banner — was capped at 1200px centred (22px pad) which left
      // a wide right gutter + a top gap. Applies in every theme (not Brunastál-
      // scoped). The inner wrapper now contributes no padding; the view owns a
      // tight, uniform margin.
      // theme.css yfirfærsla (2026-07-09): .thm .app-page bandið á viewið flush —
      // viewið sjálft leggur ekkert pad/bakgrunn til (sama og Hreyfingarlisti 167).
      '#view-krofu-yfirlit{padding:0 !important;max-width:none !important;box-sizing:border-box}' +
      B + '.ky-h1{color:#fff !important;font-size:26px !important;font-weight:800 !important;text-shadow:0 2px 8px rgba(0,0,0,.55)}' +
      B + '.ky-sub{color:rgba(255,255,255,.62) !important}' +
      B + '.ky-month{color:#fff !important}' +
      B + '.ky-navbtn{background:linear-gradient(145deg,#0b0b0d,#2a2a30 30%,#3c3c44 52%,#1a1a1f 74%,#08080a) !important;color:#fff !important;border-color:#0a0b0d !important}' +
      '#view-krofu-yfirlit .ky-num{font-variant-numeric:tabular-nums}' +
      // ▦ Tafla (table) mode — dense data table
      V + '.ky-table{width:100%;border-collapse:collapse;font-size:12px}' +
      V + '.ky-table th{position:sticky;top:0;z-index:1;background:#0f172a;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;text-align:left;padding:8px 10px;white-space:nowrap}' +
      V + '.ky-table td{padding:6px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}' +
      V + '.ky-table tr.ky-tgrp td{background:#eef2f8;font-weight:700;border-top:2px solid #d7dee9}' +
      V + '.ky-table tr.ky-trow:hover td{background:#f7f9fd}' +
      B + '.ky-table td{color:#11141c}' +
      B + ".ky-num{font-family:'Space Mono',ui-monospace,SFMono-Regular,Menlo,monospace !important}" +
      // 2026-08-25: Stílstjóri málaði síðuna (grár bakgrunnur, svartur titill,
      // hetjukortið hvítt). Læsum Brunastál-útlitinu aftur + jöfnum KPI-spjöldin
      // (flex-wrap lét Heildarkröfur blása út). Sími-2×2 kemur á eftir (M).
      V + '.page-title h1{color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.55)!important}' +
      V + '.page-title p{color:rgba(255,255,255,.62)!important}' +
      V + '.ky-month{color:#fff!important}' +
      V + '.stat-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:16px}' +
      V + '.stat-card{min-width:0!important}' +
      V + '.stat-card__label{white-space:normal;line-height:1.35}' +
      V + '.stat-card.stat-card--hero{background:linear-gradient(160deg,#7ba0ff 0%,#3a6ae8 34%,#1c3d8c 68%,#0a1630 100%)!important;border:1px solid rgba(255,255,255,.18)!important}' +
      V + '.stat-card.stat-card--hero .stat-card__label{color:rgba(255,255,255,.72)!important}' +
      V + '.stat-card.stat-card--hero .stat-card__value{color:#fff!important}' +
      V + '.ky-exprow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}' +
      V + '.ky-exprow ._ky-exp{min-width:0}' +

      // ── 📱 Sími — hreinsað kort-útlit (2026-08, samþykkt mockup „kyf-clean") ──
      // Rein hvít fyrirtækjakort; aðgerða-hnappar BROTNA (flex-wrap) í stað
      // láréttrar skrunar svo ekkert klippist og líkaminn skrunar aldrei lárétt.
      // Þessir klasar eru EINGÖNGU á síma-kortinu (renderCompanyMobile) — breiða
      // borðið notar .ky-row með eigin inline-flex og er ósnert.
      V + '.ky-co{background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:16px;margin-bottom:11px;overflow:hidden;box-shadow:0 1px 2px rgba(20,30,25,.05),0 12px 26px -20px rgba(20,30,25,.35)}' +
      V + '.ky-cohead{padding:13px 14px 12px}' +
      V + '.ky-cotop{display:flex;align-items:flex-start;gap:10px}' +
      V + '.ky-copick{display:flex;align-items:center;padding-top:2px;cursor:pointer;flex:none}' +
      V + '.ky-copick input{width:20px;height:20px;cursor:pointer;accent-color:#2f5fe0}' +
      V + '.ky-coid{flex:1;min-width:0}' +
      V + '.ky-coname{font-weight:800;color:#11141c;font-size:15.5px;line-height:1.25;overflow-wrap:anywhere}' +
      V + '.ky-coname a{color:#0f172a;text-decoration:none;border-bottom:1px dotted #94a3b8}' +
      V + '.ky-cometa{font-size:11.5px;color:#8a93a5;margin-top:3px;line-height:1.45;overflow-wrap:anywhere}' +
      V + '.ky-krafa{text-align:right;flex:none}' +
      V + '.ky-kraflbl{font-size:9px;font-weight:700;letter-spacing:.1em;color:#9aa1ab;text-transform:uppercase}' +
      V + '.ky-krafamt{font-size:18px;font-weight:800;color:#11141c;margin-top:2px;white-space:nowrap}' +
      V + '.ky-cobar{margin-top:11px}' +
      V + '.ky-cobar > div{width:100% !important;max-width:100% !important;margin-top:0 !important}' +
      V + '.ky-cosub{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:11.5px;color:#8a93a5}' +
      V + '.ky-cosub .ky-eldra{color:#b45309}' +
      V + '.ky-mcopy{margin-left:auto;flex:none;width:40px;height:40px;background:#f1f5f9;color:#475569;border:1px solid rgba(20,24,34,.14);border-radius:10px;cursor:pointer;font:inherit;font-size:15px}' +
      V + '.ky-mcopy:active{background:#e2e8f0}' +
      V + '.ky-mrow{display:block;padding:11px 14px 12px;border-top:1px solid #eef1f6;background:#fafbfc}' +
      V + '.ky-saletop{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
      V + '.ky-saletop input[type=checkbox]{width:20px;height:20px;cursor:pointer;accent-color:#2f5fe0;flex:none}' +
      V + '.ky-pick-sp{width:20px;flex:none}' +
      V + '.ky-mnum{color:#1d4ed8;font-weight:700;font-size:14px;white-space:nowrap}' +
      V + '.ky-mdate{color:#64748b;font-size:12px;white-space:nowrap}' +
      V + '.ky-mamt{margin-left:auto;font-weight:800;color:#11141c;font-size:15px;white-space:nowrap;flex:none}' +
      V + '.ky-mnote{display:block;width:100%;margin-top:9px;padding:8px 2px;font-size:16px;line-height:1.3}' +
      V + '.ky-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
      V + '.ky-acts .ky-abtn{flex:1 1 auto;min-width:76px;height:42px;white-space:nowrap}' +

      // Sameiginlegur haus á síma: 2×2 KPI-spjöld (án táknmyndar) + síu-borði þar
      // sem leitin fær eigin línu. AÐEINS data-viewmode="mobile" — breiða/tafla ósnert.
      M + '.stat-row{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px}' +
      M + '.stat-card{min-width:0 !important;display:block !important;padding:12px 13px !important;border-radius:14px !important}' +
      M + '.stat-card__icon{display:none !important}' +
      M + '.stat-card__label{font-size:9.5px !important;letter-spacing:.06em !important;line-height:1.3}' +
      M + '.stat-card__value{font-size:16px !important;margin-top:5px !important}' +
      M + '.filter-chip{padding:9px 14px !important;font-size:13px !important}' +
      M + '.ky-filterbar ._ky-search{flex:1 1 100% !important;margin-left:0 !important;margin-top:2px}' +
      // Haus á síma: forskotið (📄 titill + undirtexti) STAFLAST ofan á verkfærin
      // (◀ mánuður ▶ + röðun) svo þau skarist ekki og röðunar-valið flæði ekki út af
      // hægri kanti á 390 px. Verkfærin fá eigin línu; röðun sín eigin. (Agnar 2026-08-22.)
      M + '.page-title{flex-direction:column;align-items:stretch;gap:10px;margin-bottom:13px}' +
      M + '.page-title__lead{align-items:flex-start;gap:11px}' +
      M + '.page-title__icon{width:38px !important;height:38px !important;flex:none}' +
      M + '.page-title h1{font-size:20px !important;line-height:1.15}' +
      M + '.page-title p{font-size:11.5px !important;line-height:1.4;margin-top:2px}' +
      M + '.page-title__tools{justify-content:flex-start !important;flex-wrap:wrap;gap:7px;width:100%}' +
      M + '.page-title__tools .ky-month{min-width:0 !important;padding:0 6px}' +
      M + '.page-title__tools ._ky-sort{margin-left:0 !important;flex:1 1 100%;min-width:0}' +
      // App-ham situr á LJÓSUM bakgrunni (patch 261 þvingar hvítt/stál á .view í appi) svo
      // hvíti titillinn/undirtextinn/mánuðurinn hverfur — gera þau dökk-læsileg. Hub-
      // síma-sýnin (án appmode) situr áfram á dökka Brunastál-borðanum og heldur hvítu.
      MA + '.page-title h1{color:#11141c !important;text-shadow:none !important;font-size:20px !important}' +
      MA + '.page-title p{color:#1e293b !important}' +
      MA + '.ky-month{color:#11141c !important}' +

      // ── 📱 Dense overview (2026-08-26 P0) ──
      // Patch 261 `body.appmode .view button{min-height:50px;padding:12px}` +
      // `input{min-height:52px}` + `td{font-size:16.5px}` blew this list:
      // 8 ky-abtn sausages, always-open 52px minnispunktur, 50px ◀▶ in the
      // title gap, grey 14–24px gutters around .app-page. 263 skips this view
      // so it cannot save us. Collapse actions/notes until the row is opened.
      M + '>.main-panel{padding-left:0!important;padding-right:0!important;max-width:none!important}' +
      // Beat patch 230's `>.main-panel{padding:8px 14px}` — those three
      // `:not(#id)` count as ID specificity, so a plain #view-… >.main-panel loses.
      'html[data-viewmode="mobile"] #view-krofu-yfirlit.view.active:not(#view-field):not(#view-counter):not(#view-workshop)>.main-panel{padding-left:0!important;padding-right:0!important;padding-top:4px!important;max-width:none!important}' +
      'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode #view-krofu-yfirlit.view.active:not(#view-field):not(#view-counter):not(#view-workshop)>.main-panel{padding-left:0!important;padding-right:0!important;padding-top:4px!important}' +
      M + '.thm .app-main{padding:6px 0 16px!important}' +
      M + '.thm .app-page{background:transparent!important;min-height:0!important}' +
      M + '.page-title,' + M + '.stat-row,' + M + '.ky-exprow,' + M + '.ky-filterbar,' + M + '.ky-hint{padding-left:10px;padding-right:10px;box-sizing:border-box}' +
      M + '.page-title{margin-bottom:8px!important;gap:8px!important}' +
      M + '.page-title p{display:none!important}' +
      M + '.page-title__tools ._ky-prev,' + M + '.page-title__tools ._ky-next{min-width:44px;min-height:44px!important;height:44px!important;padding:0!important;font-size:16px!important;line-height:1}' +
      M + '.page-title__tools ._ky-sort{flex:1 1 160px!important;min-height:44px!important;font-size:16px!important;padding:8px 10px!important}' +
      M + '.ky-hint{display:none!important}' +
      M + '.stat-row{margin-bottom:6px!important;gap:6px!important}' +
      M + '.stat-card{padding:6px 8px!important;border-radius:10px!important}' +
      M + '.stat-card__value{font-size:14px!important;margin-top:1px!important}' +
      M + '.stat-card__label{font-size:9px!important}' +
      M + '.ky-exprow{gap:6px!important;margin-bottom:6px!important}' +
      M + '.ky-exprow ._ky-exp{min-height:0!important;height:auto!important;padding:6px 8px!important;gap:6px!important;border-radius:10px!important;align-items:center!important}' +
      M + '.ky-exprow ._ky-exp>span:first-child{display:none!important}' +
      M + '.ky-exprow ._ky-exp div>div:first-child{font-size:9px!important;letter-spacing:.03em}' +
      M + '.ky-exprow ._ky-exp div>div:last-child{font-size:14px!important}' +
      M + '.ky-filterbar{margin-bottom:6px!important;gap:6px!important}' +
      M + '.ky-filterbar .filter-chip,' + M + '._ky-sync{flex:1 1 auto;min-height:40px!important;height:auto!important;padding:6px 10px!important;font-size:12px!important}' +
      M + '.ky-filterbar ._ky-search{flex:1 1 100%!important;min-height:40px!important;font-size:16px!important;padding:8px 10px!important}' +
      M + '.ky-co{border-radius:0;border-left:none;border-right:none;margin-bottom:0;box-shadow:none}' +
      M + '.ky-cohead{padding:8px 12px 4px}' +
      M + '.ky-coname{font-size:15px;line-height:1.2}' +
      M + '.ky-cometa{font-size:11px;margin-top:1px}' +
      M + '.ky-kraflbl{display:none}' +
      M + '.ky-krafamt{font-size:15px;margin-top:0}' +
      M + '.ky-cobar{margin-top:4px}' +
      M + '.ky-cobar>div{height:4px!important;width:100%!important;max-width:100%!important;margin-top:0!important}' +
      M + '.ky-cosub{margin-top:4px;font-size:11px}' +
      M + '.ky-mcopy{width:36px;height:36px;min-height:36px!important}' +
      M + '.ky-mrow{padding:0;border-top:1px solid #e8ecf2}' +
      M + '.ky-saletop{min-height:44px;padding:8px 12px;gap:8px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      M + '.ky-mdetail{display:none;padding:0 12px 10px}' +
      M + '.ky-mrow.open .ky-mdetail,' + M + '.ky-mrow:focus-within .ky-mdetail{display:block}' +
      M + '.ky-mrow.open .ky-saletop,' + M + '.ky-mrow:focus-within .ky-saletop{background:#f4f7fb}' +
      M + '.ky-chev{margin-left:4px;flex:none;color:#334155;font-size:16px;line-height:1;transition:transform .12s}' +
      M + '.ky-mrow.open .ky-chev,' + M + '.ky-mrow:focus-within .ky-chev{transform:rotate(90deg)}' +
      M + '.ky-hasnote{flex:none;font-size:12px;opacity:.8}' +
      M + '.ky-mnote{margin-top:4px;min-height:44px!important;font-size:16px!important;padding:8px 10px!important}' +
      M + '.ky-acts{margin-top:8px;gap:8px}' +
      M + '.ky-acts .ky-abtn{flex:1 1 calc(50% - 8px);min-width:calc(50% - 8px);min-height:44px!important;height:44px!important;padding:0 6px!important;font-size:11px!important}' +
      // Beat 261's 50px hammer with ID-level !important (this view is skipped in 263).
      M + 'button.ky-abtn,' + M + 'button.ky-navbtn{min-height:44px!important;padding-top:0!important;padding-bottom:0!important}' +
      M + 'button._ky-exp{min-height:0!important;padding:6px 8px!important}' +
      M + 'input._ky-note,' + M + 'input._ky-search,' + M + 'select._ky-sort{min-height:44px!important;font-size:16px!important}' +
      M + '{overflow-x:hidden}';
    (document.head || document.documentElement).appendChild(s);
  })();

  // ── View-mode toggle style (GLOBAL — the toggle lives in the banner, not the
  //    view, so it must NOT be scoped to #view-krofu-yfirlit) ──────────────────
  function injectVmStyle() {
    if (document.getElementById('ky-vm-style')) return;
    const s = document.createElement('style');
    s.id = 'ky-vm-style';
    s.textContent =
      '.ky-vm{display:inline-flex;align-items:center;gap:0;background:rgba(10,14,24,.5);border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:2px;margin:0 8px 0 4px;flex-shrink:0;flex:none;z-index:7;position:relative;overflow:visible}' +
      '.ky-vm-seg,.ky-vm-seg[data-vm="mobile"],html[data-viewmode="desktop"] .ky-vm-seg[data-vm="mobile"],html[data-viewmode="table"] .ky-vm-seg[data-vm="mobile"]{display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center;gap:5px;padding:6px 9px;border:none;background:transparent;color:rgba(255,255,255,.62);border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;line-height:1;transition:background .12s,color .12s;flex:none}' +
      '.ky-vm-seg:hover{color:#fff}' +
      '.ky-vm-seg.on{background:linear-gradient(180deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}' +
      '.ky-vm-ico{font-size:14px;line-height:1}' +
      '@media (max-width:760px){.ky-vm-lbl{display:none}.ky-vm-seg{padding:7px 9px}}' +
      // Skjár on a phone: clock yields so 📱 Sími is never clipped by overflow:hidden.
      'html.slokk-phone-nav #bstal-banner .bb-face{overflow:visible;gap:8px;padding:0 10px}' +
      'html.slokk-phone-nav #bstal-banner .bb-clockbox{display:none}' +
      'html.slokk-phone-nav .ky-vm-lbl{display:none}' +
      'html.slokk-phone-nav .ky-vm-seg{padding:7px 9px}' +
      // Síma-úttekt 2026-07-30 (mælt á 834 px): síðasti aðgerða-hnappurinn í
      // hverri röð (t.d. ._ky-nyjan) klipptist 42 px út fyrir kortið, sem er
      // með inline overflow:hidden. AÐEINS media-regla á umgjörðina — við
      // snertum ALDREI .ky-row flexið sjálft (sjá v5-gildruna í CLAUDE.md:
      // wrap/margin-left:auto/flex-basis þar brýtur línuröðunina).
      '@media (max-width:900px){#view-krofu-yfirlit .ky-row > div{overflow-x:auto;-webkit-overflow-scrolling:touch}}';
    (document.head || document.documentElement).appendChild(s);
  }

  const VIEW_ID = 'view-krofu-yfirlit';
  const NAV_KEY = 'krofu-yfirlit';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  function daysAgo(iso) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }
  function normName(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  // Aggressive name key for cross-table matching: lowercase, strip diacritics,
  // drop punctuation (so "hf" == "hf."), collapse spaces. Used to recover a kt
  // for sales that were saved name-only (no kt/customer_id) — but ONLY when the
  // match is unambiguous (a single distinct kt for that key).
  function keyName(s) {
    return String(s || '')
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function ktDigits(s) { return String(s || '').replace(/\D+/g, ''); }

  // ── v3 handoff helpers ─────────────────────────────────────────────────────
  // Aging pill: green ≤30d · amber 31–60d · red >60d.
  function agingPill(days) {
    if (days == null) return '';
    const p = days > 60 ? { bg: '#fff1f2', tx: '#be123c', bd: '#fecdd3' }
            : days > 30 ? { bg: '#fffbeb', tx: '#b45309', bd: '#fde68a' }
            : { bg: '#ecfdf5', tx: '#047857', bd: '#a7f3d0' };
    return '<span class="ky-num" style="background:' + p.bg + ';color:' + p.tx + ';border:1px solid ' + p.bd + ';padding:2px 8px;border-radius:99px;font-size:10.5px;font-weight:700;white-space:nowrap">' + days + ' d.</span>';
  }
  // Light-metallic labelled action button (icon + tiny colored label).
  // filled=true → dark-metal green (used for a sent claim).
  function kyAbtn(cls, extra, glyph, label, color, title, filled) {
    return '<button class="' + cls + ' ky-abtn' + (filled ? ' on' : '') + '" ' + extra + ' type="button" title="' + esc(title) + '">' +
      '<span style="font-size:14px;line-height:1;color:' + (filled ? '#fff' : color) + '">' + glyph + '</span>' +
      '<span style="font-size:8.5px;font-weight:700;letter-spacing:.02em;color:' + (filled ? '#fff' : color) + '">' + esc(label) + '</span>' +
    '</button>';
  }

  // ── View-mode (Sími / Tafla / Skjár) ───────────────────────────────────────
  // A 3-segment control in the banner switches the Kröfu-yfirlit layout between
  // 📱 mobile (stacked, big taps, no overlap) · ▦ table (dense) · 🖥 desktop
  // (the current card look). Persisted in localStorage.slokk_viewmode and mirrored
  // onto html[data-viewmode] so the render() branch + any CSS can read it. For now
  // ONLY this page reacts; the toggle itself is app-wide.
  const VM_KEY = 'slokk_viewmode';
  const VM_ID = '_ky-vm-toggle';
  const VM_MODES = ['mobile', 'table', 'desktop'];
  // Phone vs viewport: Chrome "Request desktop site" on a Samsung makes
  // innerWidth ~980px so matchMedia(max-width:640px) lies. screen.width is
  // the real CSS-pixel short side (~412 on S26).
  function isPhoneDevice() {
    try {
      const short = Math.min(screen.width || 0, screen.height || 0);
      if (short > 0 && short <= 500) return true;
      if ((navigator.maxTouchPoints || 0) > 1 && short > 0 && short <= 700) return true;
    } catch (_) {}
    return false;
  }
  window.SlokkIsPhoneDevice = isPhoneDevice;
  // Uppsett öpp (body.appmode) = appið sjálft er síminn.
  function inAppMode() {
    try { return !!(document.body && document.body.classList.contains('appmode')); } catch (_) { return false; }
  }
  function getViewMode() {
    // Í uppsettu öpp-i (app-mode) er appið SJÁLFT síminn — nota alltaf hreina
    // síma-útlitið (renderCompanyMobile), óháð vistuðu Sími/Tafla/Skjár vali.
    // (Ósk Agnars 2026-08-20: „create it for the app format in Öpp".) Vafra-/hub-
    // sýnin heldur áfram að hlýða rofanum að neðan.
    if (inAppMode()) return 'mobile';
    const m = document.documentElement.dataset.viewmode;
    return VM_MODES.indexOf(m) >= 0 ? m : 'desktop';
  }
  function loadViewMode() {
    // App-ham þvingar 'mobile' — en snertir EKKI vistaða vafra-valið (applyViewMode
    // sleppir localStorage í app-ham) svo Sími/Tafla/Skjár í hubbinu helst óbreytt.
    if (inAppMode()) return 'mobile';
    let m = null;
    try { m = localStorage.getItem(VM_KEY); } catch (_) {}
    // 2026-08-25: sími lenti í 🖥 Skjár (hvítir nav-textar á gráu, þrjár
    // Afgreiðslu-dálkar klemmdir) því Chrome „desktop site" vistaði desktop.
    // Einu-sinni reset — notandi getur ýtt á Skjár aftur ef hann vill.
    if (isPhoneDevice()) {
      try {
        if (!localStorage.getItem('slokk_viewmode_phone_v1')) {
          localStorage.setItem('slokk_viewmode_phone_v1', '1');
          if (m === 'desktop' || m === 'table') m = 'mobile';
        }
      } catch (_) {}
    }
    if (VM_MODES.indexOf(m) < 0) {
      m = (isPhoneDevice() || (window.matchMedia && window.matchMedia('(max-width:640px)').matches)) ? 'mobile' : 'desktop';
    }
    return m;
  }
  function lockPhoneViewport(mode) {
    // Chrome "Request desktop site" ignores width=device-width and lays the
    // page out at ~980px. Sími on a real phone must use the short screen
    // side so the UI fills the S26, not a centred/left strip.
    if (!isPhoneDevice()) return;
    try {
      let vp = document.querySelector('meta[name="viewport"]');
      if (!vp) {
        vp = document.createElement('meta');
        vp.setAttribute('name', 'viewport');
        (document.head || document.documentElement).appendChild(vp);
      }
      const short = Math.min(screen.width || 0, screen.height || 0);
      if (mode === 'mobile' && short >= 320 && short <= 700) {
        vp.setAttribute('content', 'width=' + short + ', initial-scale=1, viewport-fit=cover');
      } else {
        vp.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }
    } catch (_) {}
  }
  function applyViewMode(mode, rerender) {
    if (VM_MODES.indexOf(mode) < 0) mode = 'desktop';
    document.documentElement.dataset.viewmode = mode;
    lockPhoneViewport(mode);
    // Broadcast an app-wide signal so ANY page (not just Kröfu yfirlit) can
    // listen and re-render its own layout for the chosen mode. Kröfu yfirlit's
    // own re-render below stays intact — this is purely additive.
    try { document.dispatchEvent(new CustomEvent('slokk-viewmode', { detail: mode })); } catch (_) {}
    // Í app-ham vistum við EKKI — annars skrifaði þvingaða 'mobile' yfir raunverulegt
    // Sími/Tafla/Skjár val notandans í vafranum/hubbinu.
    if (!inAppMode()) { try { localStorage.setItem(VM_KEY, mode); } catch (_) {} }
    const wrap = document.getElementById(VM_ID);
    if (wrap) wrap.querySelectorAll('[data-vm]').forEach(b => b.classList.toggle('on', b.dataset.vm === mode));
    if (rerender) {
      const v = document.getElementById(VIEW_ID);
      if (v && v.classList.contains('active')) { try { render(); } catch (_) {} }
    }
  }
  function buildToggle() {
    injectVmStyle();
    const wrap = document.createElement('div');
    wrap.id = VM_ID;
    wrap.className = 'ky-vm';
    wrap.setAttribute('role', 'group');
    wrap.title = 'Sýn: Sími / Tafla / Skjár';
    const mode = getViewMode();
    const seg = [['mobile', '📱', 'Sími'], ['table', '▦', 'Tafla'], ['desktop', '🖥', 'Skjár']];
    wrap.innerHTML = seg.map(([k, ico, lbl]) =>
      '<button type="button" class="ky-vm-seg' + (k === mode ? ' on' : '') + '" data-vm="' + k + '" title="' + lbl + '">' +
        '<span class="ky-vm-ico">' + ico + '</span><span class="ky-vm-lbl">' + lbl + '</span></button>'
    ).join('');
    wrap.querySelectorAll('[data-vm]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation(); applyViewMode(b.dataset.vm, true);
    }));
    return wrap;
  }
  // Insert the toggle right before the banner clock (.bb-clockbox — same anchor as
  // patch 238). If the Brunastál banner is off, drop a small floating fallback.
  function ensureToggle() {
    injectVmStyle();
    const existing = document.getElementById(VM_ID);
    // Sit in .bb-face, NOT inside .bb-rightwrap: 314 hides the clock wrap in
    // Sími-ham, and Skjár-on-phone overflow used to clip 📱 Sími.
    const face = document.querySelector('#bstal-banner .bb-face');
    const rightwrap = document.querySelector('#bstal-banner .bb-rightwrap');
    if (face) {
      const t = existing || buildToggle();
      t.className = 'ky-vm'; t.style.cssText = '';
      if (rightwrap) {
        if (t.parentNode !== face || t.nextElementSibling !== rightwrap) {
          face.insertBefore(t, rightwrap);
        }
      } else if (t.parentNode !== face) {
        face.appendChild(t);
      }
      return;
    }
    if (existing) return;   // floating already present, banner absent
    const t = buildToggle();
    t.style.cssText += ';position:fixed;top:12px;right:112px;z-index:9997';
    document.body.appendChild(t);
  }
  // Endur-beita geymdri sýn (2026-07-16): eftir flakk/síma-back datt síðan í
  // breiða sýn af því data-viewmode týndist (bfcache/endurteiknun) — lesum
  // localStorage aftur og setjum attribute-ið + endurteiknum ef það vantar.
  function reapplyViewMode() {
    const m = loadViewMode();
    if (document.documentElement.dataset.viewmode !== m) applyViewMode(m, true);
    ensureToggle();
  }
  function bootViewModeToggle() {
    applyViewMode(loadViewMode(), false);
    ensureToggle();
    let t = null;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(ensureToggle, 200); })
      .observe(document.body, { childList: true, subtree: true });
    [400, 1200, 3000, 6000].forEach(ms => setTimeout(ensureToggle, ms));
    // Sýnin á að HALDAST: endur-beita við hvert flakk, síma-back, bfcache-
    // endurkomu (pageshow) og þegar flipi vaknar aftur.
    ['hashchange', 'popstate', 'pageshow'].forEach(ev =>
      window.addEventListener(ev, () => setTimeout(reapplyViewMode, 0)));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) reapplyViewMode();
    });
    // Öryggisnet: ef eitthvað þurrkar attribute-ið af <html> kemur það aftur.
    new MutationObserver(reapplyViewMode)
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-viewmode'] });
    window.SlokkViewMode = { get: getViewMode, apply: applyViewMode, reapply: reapplyViewMode };
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const rukkBtn = Array.from(nav.querySelectorAll('.vnav-btn'))
      .find(b => /Til að rukka|Til ad rukka/.test(b.textContent || ''));
    const tpl = rukkBtn || nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">📋</span>Kröfu yfirlit <span class="ky-badge" style="margin-left:auto;background:#1d4ed8;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px;display:none"></span>';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      show();
    });
    if (rukkBtn && rukkBtn.parentNode) rukkBtn.parentNode.insertBefore(btn, rukkBtn.nextSibling);
    else nav.appendChild(btn);
  }

  // ── View container ───────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="ky-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function patchSwitchView() {
    if (!window.App || window.App._kySwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        // 2026-06-13: class-based like the core (.view.active{display:block}).
        // Clear any stale inline display so switching AWAY later (core toggles
        // the class only) doesn't leave other views stranded as display:none.
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.classList.remove('active');
          v.style.display = '';
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.classList.add('active'); v.style.display = 'block'; }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._kySwitchPatched = true;
  }

  // ── Data load ────────────────────────────────────────────────────────────
  // 2026-05-21: _state.sort persists the current sort across reloads via
  // localStorage so the choice survives view-switches.
  const SORT_KEY = '_ky_sort_v1';
  function loadSort() {
    try { return localStorage.getItem(SORT_KEY) || 'updated_desc'; } catch (_) { return 'updated_desc'; }
  }
  function saveSort(v) { try { localStorage.setItem(SORT_KEY, v); } catch (_) {} }
  let _state = { month: null, all: [], vbByParent: {}, sort: loadSort(),
                 selected: new Set(), sending: false, stop: false, search: '',
                 // Sýnarsía: 'krofur' (útistandandi, eins og áður) · 'osendar' ·
                 // 'greiddar' · 'allt' (bæði ógreiddar OG greiddar).
                 viewFilter: 'krofur',
                 // Síma/app: hvaða kröfu-raðir eru opnar (aðgerðir + minnispunktur).
                 openSales: new Set() };

  // A sale is "sendanleg" (queueable) if it hasn't already been pushed to
  // Payday. krafa_sent_at / invoiced_at / dk_invoice_id all mark a sent claim —
  // re-sending would 409 in payday-push, so those rows get no checkbox.
  function isSendable(s) {
    return !s.paid_at && !s.krafa_sent_at && !s.invoiced_at && !s.dk_invoice_id;
  }

  // 2026-07-14: when an INSPECTION krafa (source='uttekt') is sent to Payday,
  // advance the ÞjónustuVerkstæði workflow (patch 266 ArsWorkflow): the invoice
  // went → „Reikningur sendur"; if the úttektarskýrsla rode along as a fylgiskjal
  // (payday-push returns attached_report) → „Skýrsla send" too.
  function markWorkflowSent(sale, resp) {
    try {
      if (!sale || sale.source !== 'uttekt' || !sale.customer_id) return;
      if (!window.ArsWorkflow || !ArsWorkflow._write) return;
      const patch = { uttekt: true, reikningur: true };
      if (resp && resp.attached_report) patch.send = true;
      ArsWorkflow._write(sale.customer_id, patch, { field_inspected_year: ArsWorkflow.curYear });
    } catch (_) {}
  }

  function monthBounds(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }

  async function load(filterMonth, retry) {
    const main = document.getElementById('ky-main');
    if (!main) return;
    const thmWrap = (inner) => '<div class="thm"><div class="app-page"><main class="app-main">' + inner + '</main></div></div>';
    main.innerHTML = thmWrap('<div style="padding:32px;text-align:center;color:#cbd5e1">Hleður kröfum…</div>');
    const SB = getSB();
    if (!SB) {
      // DB-biðlarinn (window.DB.sb) er oft ekki tilbúinn þegar Kröfuyfirlit er
      // UPPHAFSSÍÐA appsins (kalt start) — þá birtist „Engin gagnabankatenging"
      // ranglega. Það lagast við að fara á aðra síðu og til baka því biðlarinn
      // er þá tilbúinn. Bíð + reyni aftur í ~10s (eins og patch 240) og held
      // „Hleður…"-stöðunni á meðan, í stað þess að sýna falska villu strax.
      if ((retry || 0) < 20) { setTimeout(() => load(filterMonth, (retry || 0) + 1), 500); return; }
      main.innerHTML = thmWrap('<div style="padding:32px;color:#fca5a5">Engin gagnabankatenging.</div>'); return;
    }

    const m = filterMonth || new Date();
    _state.month = m;

    // ONLY reikningur — that's the "krafa í heimabanka 10 dagar" choice.
    // 'greitt_sidar' is excluded — it has its own page (Til að rukka).
    // 2026-05-21: pull updated_at too so the sort options can use it.
    let q = SB.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_base_id,customer_kt,samtals,greitt_med,athugasemdir,krafa_note,created_at,updated_at,paid_at,invoiced_at,krafa_sent_at,dk_invoice_id,is_credit,credit_of,source')
      .eq('greitt_med', 'reikningur');
    const vf = _state.viewFilter || 'krofur';
    if (vf === 'krofur')        q = q.is('paid_at', null).neq('status', 'void'); // útistandandi — void telst ALDREI skuld (2026-08-14, R-000232)
    else if (vf === 'osendar')  q = q.is('paid_at', null).is('krafa_sent_at', null).is('invoiced_at', null).is('dk_invoice_id', null); // ósendar
    else if (vf === 'greiddar') q = q.not('paid_at', 'is', null);              // greiddar kröfur
    // 'allt' → engin paid_at-sía (bæði ógreiddar OG greiddar)
    const r = await q.order('updated_at', { ascending: false });
    if (r.error) { main.innerHTML = thmWrap('<div style="padding:32px;color:#fca5a5">Villa: ' + esc(r.error.message) + '</div>'); return; }
    _state.all = r.data || [];

    // Fela BAKFÆRÐAR kröfur: kreditreikninga sjálfa (is_credit) OG upprunalega
    // reikninginn sem þeir bakfæra (credit_of → id). Þeir eru uppgerðir (nettó 0)
    // — röng reikningur + bakfærsla eiga ekki heima í útistandandi kröfum. Nýi
    // (réttur) reikningurinn stendur eftir. (Agnar 2026-07-03)
    {
      const creditedIds = new Set((_state.all || [])
        .filter(s => s.is_credit && s.credit_of != null)
        .map(s => String(s.credit_of)));
      if (creditedIds.size || (_state.all || []).some(s => s.is_credit)) {
        _state.all = (_state.all || []).filter(s => !s.is_credit && !creditedIds.has(String(s.id)));
      }
    }

    // Reconcile any pending selection against the freshly-loaded rows: drop ids
    // that are gone or no longer sendable (e.g. just pushed), so the bulk bar
    // count never counts a stale/sent claim.
    if (_state.selected.size) {
      const sendableIds = new Set((_state.all || []).filter(isSendable).map(s => String(s.id)));
      _state.selected.forEach(id => { if (!sendableIds.has(String(id))) _state.selected.delete(id); });
    }

    // 2026-06-30: pull kt + netfang fyrir hvern customer_id svo Payday-vinnan
    // sjái strax hvort gögn vanti. Birtist undir nafni fyrirtækisins.
    const cidSet = Array.from(new Set((_state.all || []).map(s => s.customer_id).filter(Boolean)));
    _state.fyrirtMap = {};
    if (cidSet.length) {
      const fy = await SB.from('fyrirtaeki').select('id,kennitala,netfang,customer_base_id').in('id', cidSet);
      (fy.data || []).forEach(f => { _state.fyrirtMap[f.id] = f; });
    }
    // 2026-06-30: líka pull úr customers_base ef customer_base_id er sett —
    // einstaklingskúnnar (eins og Agnar 425) eru ekki í fyrirtaeki, bara í base.
    const baseSet = Array.from(new Set((_state.all || []).map(s => s.customer_base_id).filter(Boolean)));
    _state.baseMap = {};
    if (baseSet.length) {
      const bb = await SB.from('customers_base').select('id,kennitala,netfang').in('id', baseSet);
      (bb.data || []).forEach(b => { _state.baseMap[b.id] = b; });
    }
    // 2026-06-30: byggja kt → fyrirtaeki[] map fyrir úttektarskýrslu-lookup.
    // CompanyAttachments er per-fyrirtaeki, en sölur hafa oft bara customer_kt
    // (engan customer_id). Þá þurfum við að finna öll fyrirtaeki með sama kt
    // og spyrja CompanyAttachments fyrir hvert.
    const ktSet = Array.from(new Set((_state.all || []).map(s => (s.customer_kt || '').trim()).filter(Boolean)));
    _state.fyrirtIdsByKt = {};
    _state.baseIdByKt = {};   // kt → customer_base_id (fyrir customer_documents-uppflettingu)
    if (ktSet.length) {
      const fy2 = await SB.from('fyrirtaeki').select('id,kennitala,customer_base_id').in('kennitala', ktSet);
      (fy2.data || []).forEach(f => {
        const k = (f.kennitala || '').trim();
        if (!k) return;
        (_state.fyrirtIdsByKt[k] = _state.fyrirtIdsByKt[k] || []).push(f.id);
        if (f.customer_base_id != null && _state.baseIdByKt[k] == null) _state.baseIdByKt[k] = f.customer_base_id;
      });
      // Líka með customer_base_id — finna öll fyrirtaeki undir sama base
      const baseIds = (_state.all || []).map(s => s.customer_base_id).filter(Boolean);
      if (baseIds.length) {
        const fy3 = await SB.from('fyrirtaeki').select('id,kennitala,customer_base_id').in('customer_base_id', Array.from(new Set(baseIds)));
        (fy3.data || []).forEach(f => {
          const k = (f.kennitala || '').trim();
          if (!k) return;
          (_state.fyrirtIdsByKt[k] = _state.fyrirtIdsByKt[k] || []);
          if (!_state.fyrirtIdsByKt[k].includes(f.id)) _state.fyrirtIdsByKt[k].push(f.id);
          if (f.customer_base_id != null && _state.baseIdByKt[k] == null) _state.baseIdByKt[k] = f.customer_base_id;
        });
      }
    }

    // ── Recover kt for sales saved name-only ────────────────────────────────
    // Some reikningur sales arrive with no customer_kt AND no usable id/base
    // link (the company name was typed free-hand in the POS "Án kennitölu" box).
    // Look the name up in fyrirtaeki / customers_base and remember the kt IF the
    // match is unambiguous (one distinct kt). This drives the display and, at
    // send time, a write-back so the Payday push has a kt to work with.
    _state.nameKt = {};   // keyName -> { kt, coId, baseId }
    {
      const hasKt = (s) => {
        if (s.customer_kt) return true;
        const fy = s.customer_id ? (_state.fyrirtMap || {})[s.customer_id] : null;
        if (fy && fy.kennitala) return true;
        const bb = s.customer_base_id ? (_state.baseMap || {})[s.customer_base_id] : null;
        return !!(bb && bb.kennitala);
      };
      const needKeys = new Set((_state.all || []).filter(s => !hasKt(s)).map(s => keyName(s.customer_nafn)).filter(Boolean));
      if (needKeys.size) {
        const acc = {};   // key -> { kts:Set, coId, baseId, netfang }
        // 2026-08-05 (Agnar: "Húsfélagið Engjasel 31" ⚠️ vantar netfang þrátt
        // fyrir að fyrirtaeki.netfang væri rétt til staðar): kt-endurheimtin
        // hér fann kt-ið og hlekkjaði nafnið, en aldrei netfangið — svo bara
        // sölur sem BÁRU customer_id/customer_base_id þegar fengu tölvupóst.
        // Sama endurheimt, bara líka geymt netfang svo companyIdentity() eigi
        // fallback fyrir sölur sem koma nafn-eingöngu úr POS.
        const add = (nafn, kt, coId, baseId, netfang) => {
          const k = keyName(nafn); if (!k || !needKeys.has(k)) return;
          const d = ktDigits(kt); if (d.length !== 10) return;
          const e = acc[k] || (acc[k] = { kts: new Set(), coId: null, baseId: null, netfang: null });
          e.kts.add(d);
          if (coId != null && e.coId == null) e.coId = coId;
          if (baseId != null && e.baseId == null) e.baseId = baseId;
          if (netfang && !e.netfang) e.netfang = netfang;
        };
        // NB síðuskipting (2026-07-17): báðar töflur eru komnar yfir 1000 raðir
        // og Supabase klippir ósíðuskipt select við 1000 — þá „týndust" félög
        // (Sjúkraþjálfun Afl) úr endurheimtinni og skýrslu/hlekkja-tengingin brást.
        const pageAll = async (table, cols) => {
          const out = [];
          for (let from = 0; ; from += 1000) {
            const r = await SB.from(table).select(cols).range(from, from + 999);
            const rows = r.data || [];
            out.push(...rows);
            if (rows.length < 1000) break;
          }
          return out;
        };
        const [fyAll, baseAll] = await Promise.all([
          pageAll('fyrirtaeki', 'id,nafn,kennitala,customer_base_id,netfang'),
          pageAll('customers_base', 'id,nafn,kennitala,netfang'),
        ]);
        fyAll.forEach(r => add(r.nafn, r.kennitala, r.id, r.customer_base_id, r.netfang));
        baseAll.forEach(r => add(r.nafn, r.kennitala, null, r.id, r.netfang));
        Object.keys(acc).forEach(k => {
          const e = acc[k];
          if (e.kts.size === 1) {   // unambiguous only — never guess a kt onto a bill
            const d = Array.from(e.kts)[0];
            _state.nameKt[k] = { kt: d.slice(0, 6) + '-' + d.slice(6), coId: e.coId, baseId: e.baseId, netfang: e.netfang };
          }
        });
      }
    }

    // 2026-07-16 (fært aftur fyrir nameKt 2026-07-17): sækja úttektarskýrslur
    // líka úr customer_documents (Drive-hryggnum, sameiginlegur með Brunahólf) —
    // svo 📄 Skýrsla-takkinn og Senda-glugginn sjái skýrslur sem eru EKKI
    // vistaðar sem fyrirtækjaviðhengi. Keyrir EFTIR nafna-endurheimtina svo
    // úttektar-sölur án customer_id/kt (bara nafn) fái sínar skýrslur líka.
    // Additive og fail-safe: villa hér (t.d. RLS) skilur bara eftir tóm map
    // og viðhengja-leiðin (CompanyAttachments) virkar áfram óbreytt.
    _state.docsByCo = {}; _state.docsByBase = {};
    try {
      const coIds = new Set(cidSet.map(String));
      Object.values(_state.fyrirtIdsByKt || {}).forEach(arr => arr.forEach(id => coIds.add(String(id))));
      const bIds = new Set(baseSet.map(String));
      Object.values(_state.fyrirtMap || {}).forEach(f => { if (f && f.customer_base_id != null) bIds.add(String(f.customer_base_id)); });
      Object.values(_state.baseIdByKt || {}).forEach(id => bIds.add(String(id)));
      Object.values(_state.nameKt || {}).forEach(r => {
        if (r.coId != null) coIds.add(String(r.coId));
        if (r.baseId != null) bIds.add(String(r.baseId));
      });
      const ors = [];
      if (coIds.size) ors.push('fyrirtaeki_id.in.(' + Array.from(coIds).join(',') + ')');
      if (bIds.size) ors.push('customer_base_id.in.(' + Array.from(bIds).join(',') + ')');
      if (ors.length) {
        const dr = await SB.from('customer_documents')
          .select('id,customer_base_id,fyrirtaeki_id,year,doc_type,drive_file_id,storage_path')
          .eq('doc_type', 'uttektarskyrsla')
          .or('is_duplicate.is.null,is_duplicate.eq.false')
          .or(ors.join(','));
        (dr.data || []).forEach(d => {
          if (d.fyrirtaeki_id != null) (_state.docsByCo[String(d.fyrirtaeki_id)] = _state.docsByCo[String(d.fyrirtaeki_id)] || []).push(d);
          if (d.customer_base_id != null) (_state.docsByBase[String(d.customer_base_id)] = _state.docsByBase[String(d.customer_base_id)] || []).push(d);
        });
      }
    } catch (_) {}

    // Verkbeidnir for pickup status (same approach as patch 152).
    const vb = await SB.from('verkbeidnir').select('num,status').like('num', 'R-%-V%');
    _state.vbByParent = {};
    (vb.data || []).forEach(v => {
      const parent = String(v.num || '').replace(/-V\d+$/, '');
      (_state.vbByParent[parent] = _state.vbByParent[parent] || []).push(v.status);
    });

    // ── Samantektar-gögn fyrir stækkanlegu spjöldin ────────────────────────────
    // ÓHÁÐ view-síunni + mánuði svo „Ógreiddar í Payday" og „Ósendar kröfur" séu
    // ALLTAF réttar heildartölur (sama regla og payday-sync-paid: ógreitt reikn.
    // með dk_invoice_id = sent í Payday en óuppgert; ósendar = engin send-merki).
    try {
      const sr = await SB.from('solur')
        .select('id,num,customer_nafn,customer_kt,samtals,created_at,paid_at,krafa_sent_at,invoiced_at,dk_invoice_id,is_credit,credit_of')
        .eq('greitt_med', 'reikningur').is('paid_at', null)
        .order('created_at', { ascending: true });
      let rows = (sr.data || []);
      const cids = new Set(rows.filter(s => s.is_credit && s.credit_of != null).map(s => String(s.credit_of)));
      rows = rows.filter(s => !s.is_credit && !cids.has(String(s.id)));
      _state.paydayUnpaid = rows.filter(s => s.dk_invoice_id);                                   // sent í Payday, ógreitt (59)
      _state.osendar      = rows.filter(s => !s.krafa_sent_at && !s.invoiced_at && !s.dk_invoice_id); // aldrei send
    } catch (_) { _state.paydayUnpaid = _state.paydayUnpaid || []; _state.osendar = _state.osendar || []; }

    render();
    maybeAutoSync();   // athuga greiðslur í Payday sjálfkrafa (throttlað) → Greitt kviknar sjálft
  }

  // Sjálfvirk greiðslu-athugun: keyrir /api/payday-sync-paid í bakgrunni þegar
  // síðan er opnuð (mest einu sinni á 30 mín per vafra), án modal. Ef eitthvað er
  // merkt greitt → endur-render svo „Greitt" kvikni sjálft. Handvirki 🔄-takkinn
  // er áfram til staðar fyrir strax-athugun.
  let _autoSyncing = false;
  async function maybeAutoSync() {
    if (_autoSyncing) return;
    let last = 0; try { last = +localStorage.getItem('_ky_paysync_at') || 0; } catch (_) {}
    if (Date.now() - last < 30 * 60 * 1000) return;   // throttle: 30 mín
    _autoSyncing = true;
    try { localStorage.setItem('_ky_paysync_at', String(Date.now())); } catch (_) {}
    try {
      const res = await fetch('/api/payday-sync-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.marked_count) {
        if (window.Toast && Toast.show) Toast.show('✓ ' + data.marked_count + ' greiddar (Payday)');
        _autoSyncing = false;          // leyfa endur-render án þess að læsa
        await load(_state.month); refreshBadge();
        return;
      }
    } catch (_) {}
    _autoSyncing = false;
  }

  function pickupStatus(saleNum) {
    const statuses = _state.vbByParent[saleNum] || [];
    if (!statuses.length) return { label: '—', icon: '·', color: '#94a3b8' };
    const allCollected = statuses.every(s => s === 'collected' || s === 'done');
    const anyAtShop = statuses.some(s => s === 'received' || s === 'ready' || s === 'inprogress');
    if (allCollected) return { label: 'Sótt', icon: '✅', color: '#16a34a' };
    if (anyAtShop) return { label: 'Hjá þér', icon: '🏪', color: '#f59e0b' };
    return { label: '—', icon: '·', color: '#94a3b8' };
  }

  // ── Payday greiðslu-samstilling (summary popup) ──────────────────────────
  function showSyncSummary(data) {
    const old = document.getElementById('_ky-sync-modal'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = '_ky-sync-modal';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;font-family:\'Space Grotesk\',system-ui,sans-serif';
    let inner;
    if (data.error) {
      inner = '<div style="font-size:16px;font-weight:800;color:#dc2626;margin-bottom:8px">⚠️ Villa við samstillingu</div>' +
              '<div style="font-size:13px;color:#334155;white-space:pre-wrap;word-break:break-word">' + esc(String(data.error)) + '</div>';
    } else {
      const list = (data.marked || []).map(m =>
        '<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px">' +
          '<span style="font-weight:600;color:#11141c">' + esc(m.customer || '—') + ' <span style="color:#94a3b8;font-family:monospace;font-weight:400">' + esc(m.num || '') + '</span></span>' +
          '<span style="white-space:nowrap"><span style="font-family:monospace;color:#0f7a43;font-weight:700">' + fmtKr(m.amount) + '</span> <span style="color:#94a3b8;font-size:11px">' + esc(m.paidDate || '') + '</span></span>' +
        '</div>').join('');
      inner = '<div style="font-size:17px;font-weight:800;color:#0f7a43;margin-bottom:4px">✅ Samstillingu lokið</div>' +
        '<div style="font-size:12.5px;color:#64748b;margin-bottom:12px">Athugaði <b>' + (data.checked || 0) + '</b> reikninga í Payday · <b>' + (data.candidates || 0) + '</b> ógreiddar kröfur skoðaðar.' + (data.dry ? ' <b style="color:#b45309">(prufa — engu breytt)</b>' : '') + '</div>' +
        (data.candidates
          ? '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:11px 14px;margin-bottom:14px">' +
              '<span style="font-size:12.5px;color:#9a3412;font-weight:600">⏳ Útistandandi kröfur í Payday (' + (data.candidates || 0) + ')</span>' +
              '<span style="font-size:17px;font-weight:800;color:#b45309;font-family:monospace">' + fmtKr(data.candidates_total || 0) + '</span>' +
            '</div>'
          : '') +
        (data.marked_count
          ? '<div style="font-weight:700;color:#11141c;margin-bottom:4px">' + data.marked_count + ' krafa merkt greidd' + (data.marked_total ? ' · ' + fmtKr(data.marked_total) : '') + ':</div><div style="max-height:320px;overflow:auto">' + list + '</div>'
          : '<div style="padding:16px;text-align:center;color:#64748b;background:#f8fafc;border-radius:10px">Engin ný greiðsla fannst — allt þegar uppfært. 👍</div>');
    }
    wrap.innerHTML = '<div style="background:#fff;border-radius:16px;padding:22px 24px;max-width:540px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.35)">' + inner +
      '<div style="text-align:right;margin-top:18px"><button id="_ky-sync-close" type="button" style="padding:9px 20px;border:none;border-radius:9px;background:#1d4ed8;color:#fff;font-weight:700;cursor:pointer;font:inherit">Loka</button></div></div>';
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    wrap.querySelector('#_ky-sync-close').addEventListener('click', close);
  }

  async function runPaydaySync(btn) {
    if (!btn || btn.disabled) return;
    const orig = btn.textContent;
    btn.disabled = true; btn.style.opacity = '.6'; btn.textContent = '⏳ Sæki úr Payday…';
    try {
      const res = await fetch('/api/payday-sync-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({ error: 'Ógilt svar frá þjóni (HTTP ' + res.status + ')' }));
      if (!res.ok && !data.error) data.error = 'HTTP ' + res.status;
      showSyncSummary(data);
      if (!data.error && data.marked_count) await load(_state.month || new Date()); // ný render → nýr takki
    } catch (e) {
      showSyncSummary({ error: String(e.message || e) });
    } finally {
      const b = document.querySelector('#ky-main ._ky-sync');
      if (b) { b.disabled = false; b.style.opacity = ''; b.textContent = orig; }
    }
  }

  // Stækkanleg samantektarspjöld (Payday-ógreitt / Ósendar) — smellur víxlar
  // _state.expandCard og endurteiknar → listinn birtist undir.
  function expCardHtml(key, icon, label, count, total, color, bg, border, sub) {
    const open = _state.expandCard === key;
    return '<button type="button" class="_ky-exp" data-exp="' + key + '" title="Smelltu til að sjá listann" style="text-align:left;cursor:pointer;background:' + bg + ';border:1px solid ' + border + ';border-radius:12px;padding:13px 15px;display:flex;align-items:center;gap:12px;font:inherit;box-shadow:' + (open ? 'inset 0 0 0 2px ' + color : '0 1px 3px rgba(0,0,0,.04)') + '">' +
      '<span style="font-size:22px">' + icon + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:11px;color:' + color + ';font-weight:700;text-transform:uppercase;letter-spacing:.04em">' + esc(label) + ' · ' + count + '</div>' +
        '<div style="font-size:20px;font-weight:800;color:' + color + ';font-family:monospace">' + fmtKr(total) + '</div>' +
        (sub ? '<div style="font-size:10px;font-weight:600;color:' + color + ';opacity:.8;margin-top:2px">' + esc(sub) + '</div>' : '') +
      '</div>' +
      '<span style="font-size:14px;color:' + color + ';font-weight:800">' + (open ? '▾' : '▸') + '</span>' +
    '</button>';
  }
  function expDetailHtml(key, title, rows, total, color) {
    const fmtD = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; };
    const body = rows.length
      ? rows.slice().sort((a, b) => (parseFloat(b.samtals) || 0) - (parseFloat(a.samtals) || 0)).map(s =>
          '<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #eef1f6;font-size:13px">' +
            '<span style="min-width:0"><b style="color:#11141c">' + esc(s.customer_nafn || '—') + '</b> <span style="font-family:monospace;color:#94a3b8;font-size:11px">' + esc(s.num || '') + '</span>' +
              (fmtD(s.created_at) ? ' <span style="color:#94a3b8;font-size:11px">· ' + fmtD(s.created_at) + '</span>' : '') + '</span>' +
            '<span style="font-family:monospace;font-weight:700;color:' + color + ';white-space:nowrap">' + fmtKr(parseFloat(s.samtals) || 0) + '</span>' +
          '</div>').join('')
      : '<div style="padding:14px;text-align:center;color:#94a3b8;font-style:italic">Ekkert í þessum flokki 🎉</div>';
    return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">' +
        '<span style="font-weight:800;font-size:13.5px;color:#11141c">' + esc(title) + ' · ' + rows.length + '</span>' +
        '<span style="font-family:monospace;font-weight:800;font-size:15px;color:' + color + '">' + fmtKr(total) + '</span>' +
      '</div>' +
      '<div style="max-height:340px;overflow:auto">' + body + '</div>' +
    '</div>';
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    const main = document.getElementById('ky-main');
    if (!main) return;
    // App-ham: tryggja að <html data-viewmode="mobile"> sé sett ÁÐUR en við teiknum,
    // svo M-scoped síma-CSS (KPI 2×2, haus, síu-borði) virkist — ekki bara render-
    // greinin. applyViewMode vistar ekki í app-ham svo vafra-valið helst. (Agnar 2026-08-22.)
    if (inAppMode() && document.documentElement.dataset.viewmode !== 'mobile') {
      try { applyViewMode('mobile', false); } catch (_) {}
    }
    const all = _state.all;
    const { start, end } = monthBounds(_state.month);

    const thisMonth = [];
    const older = [];
    all.forEach(s => {
      const t = new Date(s.created_at).getTime();
      if (t >= start.getTime() && t < end.getTime()) thisMonth.push(s);
      else older.push(s);
    });

    function sum(arr) { return arr.reduce((s, x) => s + (parseFloat(x.samtals) || 0), 0); }
    const thisMonthTotal = sum(thisMonth);
    const olderTotal = sum(older);
    const grandTotal = thisMonthTotal + olderTotal;
    // 2026-06-30: telja sendar kröfur (úr Payday eða manual toggle á krafa_sent_at)
    const sent = (all || []).filter(s => s.krafa_sent_at);
    const sentTotal = sum(sent);
    const sentCompanies = new Set(sent.map(s => normName(s.customer_nafn) || '(ekkert)')).size;

    // Stækkanleg samantektarspjöld (óháð view-síunni) — smelltu til að sjá listann.
    const paydayUnpaid = _state.paydayUnpaid || [];
    const osendarRows  = _state.osendar || [];
    const paydayUnpaidTotal = sum(paydayUnpaid);
    const osendarTotal = sum(osendarRows);

    // Group by company across the whole dataset for the per-company section.
    const grouped = {};
    all.forEach(s => {
      // Group key prefers kennitala, then customer_id, then the normalized name —
      // so two distinct entities that share a name (different kt) don't merge into
      // one company. The human name stays as the display label below.
      const key = ktDigits(s.customer_kt)
                || (s.customer_id != null ? 'id:' + s.customer_id : '')
                || normName(s.customer_nafn) || '(ekkert nafn)';
      const display = s.customer_nafn || '(ekkert nafn)';
      if (!grouped[key]) grouped[key] = { display, id: s.customer_id || null, sales: [], sum: 0, thisMonthSum: 0, olderSum: 0, latestUpdated: '', latestCreated: '' };
      // 2026-08-05: don't get stuck on null forever just because the FIRST sale
      // seen for this company happened to be an older name-only entry with no
      // customer_id — any later sale that does carry one should still link the
      // whole group to fyrirtaeki (fixes "vantar netfang" for companies whose
      // email/kt is right there in the profile, verkefnalisti f1db7352).
      if (!grouped[key].id && s.customer_id) grouped[key].id = s.customer_id;
      grouped[key].sales.push(s);
      grouped[key].sum += parseFloat(s.samtals) || 0;
      const t = new Date(s.created_at).getTime();
      if (t >= start.getTime() && t < end.getTime()) grouped[key].thisMonthSum += parseFloat(s.samtals) || 0;
      else grouped[key].olderSum += parseFloat(s.samtals) || 0;
      // Track latest timestamps so sort modes work at company-card level too.
      const u = s.updated_at || s.created_at || '';
      if (u > grouped[key].latestUpdated) grouped[key].latestUpdated = u;
      const c = s.created_at || '';
      if (c > grouped[key].latestCreated) grouped[key].latestCreated = c;
    });
    // 2026-05-21: sort companies AND the sales within each company by the
    // chosen order. Default = nýlega breytt → claims you just touched
    // (mark paid, switch method, save edits) jump to the top instead of
    // staying buried by their original created_at.
    const sortMode = _state.sort;
    function cmpUpdated(a, b) { return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''); }
    function cmpCreatedDesc(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); }
    function cmpCreatedAsc(a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); }
    function cmpAmtDesc(a, b) { return (+b.samtals || 0) - (+a.samtals || 0); }
    function cmpAmtAsc(a, b)  { return (+a.samtals || 0) - (+b.samtals || 0); }
    const saleCmp = sortMode === 'created_desc' ? cmpCreatedDesc
                  : sortMode === 'created_asc'  ? cmpCreatedAsc
                  : sortMode === 'amount_desc'  ? cmpAmtDesc
                  : sortMode === 'amount_asc'   ? cmpAmtAsc
                  : cmpUpdated; // updated_desc default
    Object.values(grouped).forEach(g => g.sales.sort(saleCmp));
    const companies = Object.values(grouped).sort((a, b) => {
      if (sortMode === 'amount_asc')   return a.sum - b.sum;
      if (sortMode === 'amount_desc')  return b.sum - a.sum;
      if (sortMode === 'created_asc')  return (a.latestCreated || '').localeCompare(b.latestCreated || '');
      if (sortMode === 'created_desc') return (b.latestCreated || '').localeCompare(a.latestCreated || '');
      // updated_desc: company with the most-recently-touched sale floats up
      return (b.latestUpdated || '').localeCompare(a.latestUpdated || '');
    });

    // ── Search filter — matches company name, kt (any source incl. recovered),
    //    or a sale/reikningur number. Numeric query also matches kt digits. ──
    const q = (_state.search || '').trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    function coKt(g) {
      const s0 = g.sales[0] || {};
      const fy = g.id ? (_state.fyrirtMap || {})[g.id] : null;
      const baseRow = s0.customer_base_id ? (_state.baseMap || {})[s0.customer_base_id] : null;
      const rec = (_state.nameKt || {})[keyName(g.display)];
      return (s0.customer_kt) || (fy && fy.kennitala) || (baseRow && baseRow.kennitala) || (rec && rec.kt) || '';
    }
    const shown = !q ? companies : companies.filter(g => {
      if (normName(g.display).indexOf(q) !== -1) return true;
      if (qDigits.length >= 3 && ktDigits(coKt(g)).indexOf(qDigits) !== -1) return true;
      if (g.sales.some(s => String(s.num || '').toLowerCase().indexOf(q) !== -1)) return true;
      return false;
    });

    const monthLabel = _state.month.getFullYear() + ' · ' +
      ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'][_state.month.getMonth()];

    main.innerHTML = `
      <div class="thm"><div class="app-page"><main class="app-main">

        <div class="page-title">
          <div class="page-title__lead">
            <span class="page-title__icon">📄</span>
            <div>
              <h1>Kröfu yfirlit</h1>
              <p>Krafa í heimabanka — sölur með greitt_med = "Senda reikning" sem þarf að safna saman í lok mánaðar</p>
            </div>
          </div>
          <div class="page-title__tools" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="_ky-prev ky-navbtn" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">◀</button>
            <div class="ky-month" style="font-size:13px;font-weight:700;color:#fff;padding:0 8px;min-width:140px;text-align:center">${esc(monthLabel)}</div>
            <button class="_ky-next ky-navbtn" type="button" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px">▶</button>
            <select class="_ky-sort ky-navbtn" title="Raða" style="margin-left:6px;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;font-size:12.5px;font-weight:600;color:#475569;cursor:pointer">
              <option value="updated_desc"${_state.sort === 'updated_desc' ? ' selected' : ''}>🕐 Nýlega breytt fyrst</option>
              <option value="created_desc"${_state.sort === 'created_desc' ? ' selected' : ''}>📅 Nýjast stofnað</option>
              <option value="created_asc"${_state.sort === 'created_asc' ? ' selected' : ''}>📅 Elst stofnað</option>
              <option value="amount_desc"${_state.sort === 'amount_desc' ? ' selected' : ''}>💰 Hæsta upphæð</option>
              <option value="amount_asc"${_state.sort === 'amount_asc' ? ' selected' : ''}>💰 Lægsta upphæð</option>
            </select>
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-card"><span class="stat-card__icon">📄</span><div><div class="stat-card__label">Þessi mánuður · ${thisMonth.length} kröfur</div><div class="stat-card__value ky-num">${fmtKr(thisMonthTotal)}</div></div></div>
          <div class="stat-card stat-card--amber"><span class="stat-card__icon">⏳</span><div><div class="stat-card__label">Eldri ógreitt · ${older.length} kröfur</div><div class="stat-card__value ky-num">${fmtKr(olderTotal)}</div></div></div>
          <div class="stat-card stat-card--hero"><span class="stat-card__icon">💰</span><div><div class="stat-card__label">Heildarkröfur í þessari sýn · ${all.length} sölur · ${companies.length} fyrirtæki</div><div class="stat-card__value ky-num">${fmtKr(grandTotal)}</div></div></div>
          <div class="stat-card stat-card--green"><span class="stat-card__icon">🏦</span><div><div class="stat-card__label">Sendar kröfur · ${sent.length} sölur · ${sentCompanies} fyrirtæki</div><div class="stat-card__value ky-num">${fmtKr(sentTotal)}</div></div></div>
        </div>

        <div class="ky-exprow">
          ${expCardHtml('payday', '⏳', 'Ógreiddar í Payday', paydayUnpaid.length, paydayUnpaidTotal, '#b45309', '#fff7ed', '#fed7aa', 'Allir mánuðir — ekki hluti af Heildarkröfum')}
          ${expCardHtml('osendar', '📤', 'Ósendar kröfur', osendarRows.length, osendarTotal, '#1d4ed8', '#eff6ff', '#bfdbfe', 'Allir mánuðir — ekki hluti af Heildarkröfum')}
        </div>
        ${_state.expandCard === 'payday' ? expDetailHtml('payday', '⏳ Ógreiddar kröfur í Payday', paydayUnpaid, paydayUnpaidTotal, '#b45309')
          : _state.expandCard === 'osendar' ? expDetailHtml('osendar', '📤 Ósendar kröfur (aldrei sendar í banka/Payday)', osendarRows, osendarTotal, '#1d4ed8')
          : ''}

        <div class="ky-filterbar" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          ${[['krofur','📋 Kröfur'],['osendar','📤 Ósendar'],['greiddar','✅ Greiddar'],['allt','📚 Allt']].map(([k, label]) => {
            const on = (_state.viewFilter || 'krofur') === k;
            return `<button class="_ky-vf filter-chip${on ? ' is-active' : ''}" data-vf="${k}" type="button" style="padding:6px 10px;font-size:12px">${label}</button>`;
          }).join('')}
          <button class="_ky-sync" type="button" title="Sækja greiðslustöðu úr Payday og merkja greiddar kröfur sjálfkrafa" style="padding:6px 10px;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;border:1px solid #0f7a43;background:linear-gradient(180deg,#17945a,#0f6e3a);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 8px -4px rgba(0,0,0,.4)">🔄 Payday</button>
          <input class="_ky-search ky-navbtn darkfield" type="search" placeholder="🔍 Leita (nafn · kt · R-nr)…" value="${esc(_state.search)}" style="flex:1 1 160px;min-width:130px;margin-left:auto;padding:7px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;font-size:13px">
        </div>

        <div class="ky-hint" style="font-size:12.5px;color:#1e293b;margin-bottom:14px;padding:11px 15px;background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:14px;box-shadow:0 8px 22px -16px rgba(25,35,60,.18);line-height:1.5">
          💡 Útistandandi kröfur per fyrirtæki sem þarf að setja í heimabankann.
          Þegar krafan er greidd, merktu hverja sölu greidda með <b style="color:#0f7a43">✓</b> — eða „🔄 Payday" sækir greiðslustöðuna sjálfkrafa.
        </div>

        ${q && companies.length ? `<div style="font-size:12px;color:#e2e6ee;margin-bottom:10px;text-shadow:0 1px 2px rgba(0,0,0,.4)">🔍 ${shown.length} af ${companies.length} fyrirtækjum passa við „${esc(_state.search)}"</div>` : ''}

        ${shown.length
          ? (getViewMode() === 'table' ? renderTable(shown)
             : getViewMode() === 'mobile' ? shown.map(renderCompanyMobile).join('')
             : shown.map(renderCompany).join(''))
          : (q
              ? '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:40px;text-align:center;color:#94a3b8;font-style:italic">Ekkert fyrirtæki passar við „' + esc(_state.search) + '"</div>'
              : '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:40px;text-align:center;color:#94a3b8;font-style:italic">Engar útistandandi kröfur 🎉</div>')}

      </main></div></div>
      <div id="ky-bulkbar"></div>`;

    main.querySelector('._ky-sort')?.addEventListener('change', e => {
      _state.sort = e.target.value;
      saveSort(_state.sort);
      render();
    });
    main.querySelector('._ky-search')?.addEventListener('input', e => {
      _state.search = e.target.value;
      render();
      // render() rebuilds innerHTML → the input is replaced; restore focus+caret.
      const el = document.querySelector('#ky-main ._ky-search');
      if (el) { el.focus(); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (_) {} }
    });
    main.querySelector('._ky-prev')?.addEventListener('click', () => {
      const m = new Date(_state.month);
      m.setMonth(m.getMonth() - 1);
      load(m);
    });
    main.querySelector('._ky-next')?.addEventListener('click', () => {
      const m = new Date(_state.month);
      m.setMonth(m.getMonth() + 1);
      load(m);
    });
    // Sýnarsía: kröfur / ósendar / greiddar / allt
    main.querySelectorAll('._ky-vf').forEach(b => b.addEventListener('click', () => {
      if (_state.viewFilter === b.dataset.vf) return;
      _state.viewFilter = b.dataset.vf;
      _state.selected.clear();
      load(_state.month || new Date());
    }));
    // Stækkanleg samantektarspjöld — víxla opnun/lokun á listanum
    main.querySelectorAll('._ky-exp').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.exp;
      _state.expandCard = _state.expandCard === k ? null : k;
      render();
    }));
    // 🔄 Athuga greiðslur í Payday → merkja greiddar sjálfkrafa + summary popup
    main.querySelector('._ky-sync')?.addEventListener('click', (e) => runPaydaySync(e.currentTarget));
    // Per-krafa minnispunktur → EIGIN reitur solur.krafa_note (EKKI athugasemd
    // reikningsins) þegar farið er úr reitnum (change = eftir edit, ekki hvern
    // staf). Uppfærir líka _state svo texti helst við endur-render.
    main.querySelectorAll('._ky-note').forEach(inp => {
      inp.addEventListener('change', async () => {
        const SB = getSB(); if (!SB) return;
        const val = inp.value.trim();
        const row = (_state.all || []).find(x => String(x.id) === String(inp.dataset.id));
        if (row) row.krafa_note = val;
        inp.style.borderBottomColor = '#a7f3d0';
        const w = await SB.from('solur').update({ krafa_note: val }).eq('id', inp.dataset.id);
        if (w && w.error) { inp.style.borderBottomColor = '#fca5a5'; inp.title = 'Villa við vistun: ' + w.error.message; }
      });
    });

    // 2026-06-30: smella á nafn fyrirtækisins → opna fyrirtækjasíðu
    main.querySelectorAll('._ky-co-link').forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const id = a.dataset.coId;
        if (id && typeof window._openCompanySafe === 'function') {
          window._openCompanySafe(id);
        }
      });
    });

    // 📄 Skýrsla hnappur (2026-07-16) — grænn opnar úttektarskýrslu ársins í
    // nýjum flipa (viðhengi eða customer_documents/Drive); grár = vantar (toast).
    main.querySelectorAll('._ky-skyrsla').forEach(b => {
      b.addEventListener('click', async () => {
        const s = (_state.all || []).find(x => String(x.id) === String(b.dataset.id));
        if (!s) return;
        const res = resolveSkyrsla(s);
        if (!res.found) {
          const msg = 'Engin úttektarskýrsla fundin fyrir ' + res.year;
          if (window.Toast && Toast.show) Toast.show('📄 ' + msg); else alert(msg);
          return;
        }
        try { await openSkyrsla(res); } catch (e) { alert('Villa: ' + (e.message || e)); }
      });
    });

    // 2026-06-30: „Krafa send" hnappur sendir núna kröfuna í Payday gegnum
    // /api/payday-push (sem setur invoiced_at + krafa_sent_at + dk_invoice_id).
    // Afhökun (going from on → off) er ennþá bara local toggle á krafa_sent_at —
    // hún dregur EKKI til baka Payday-drögin.
    main.querySelectorAll('._ky-krafa-toggle').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const isOn = b.dataset.on === '1';
        if (isOn) {
          if (!confirm('Afhaka „Krafa send"? (NB Payday-dragið helst óbreytt)')) return;
          const SB = getSB();
          const r = await SB.from('solur').update({ krafa_sent_at: null }).eq('id', id);
          if (r.error) { alert('Villa: ' + r.error.message); return; }
          if (window.Toast && Toast.show) Toast.show('Krafa send — afhakað');
          await load(_state.month);
          return;
        }
        // 2026-07-16: confirm() → eiginn Senda-gluggi með skýrslu-stöðunni —
        // skrifstofan opnar og yfirfer úttektarskýrsluna ÁÐUR en krafan fer.
        const sale = (_state.all || []).find(s => String(s.id) === String(id));
        const choice = await openKrafaSendDialog(sale);
        if (!choice) return;
        b.disabled = true; b.textContent = '⏳ Sendir…';
        try {
          if (sale) {
            const ke = await ensureKtForSale(sale);
            if (!ke.ok) throw new Error('Vantar kennitölu — fannst ekki út frá nafni. Skráðu kt á kúnnann fyrst.');
          }
          const r = await fetch('/api/payday-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sale_id: id,
              attach_report: choice.attach,
              report_storage_path: (choice.attach && choice.path) || undefined,
            }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
          markWorkflowSent(sale, j);
          if (window.Toast && Toast.show) Toast.show('🏦 ✓ Krafa send í Payday' + deliveryNote(j));
          await load(_state.month);
        } catch (e) {
          alert('Payday push villa: ' + (e.message || e));
          b.disabled = false;
        }
      });
    });
    main.querySelectorAll('._ky-mark-paid').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const isOn = b.dataset.on === '1';   // þegar greitt → afhaka
        if (isOn && !confirm('Afhaka „greitt"? (paid_at hreinsað)')) return;
        const SB = getSB();
        const r = await SB.from('solur').update({ paid_at: isOn ? null : new Date().toISOString() }).eq('id', id);
        if (r.error) { alert('Villa: ' + r.error.message); return; }
        if (window.Toast && Toast.show) Toast.show(isOn ? '↩ Afhakað' : '✓ Merkt sem greitt');
        await load(_state.month);
        refreshBadge();
      });
    });
    main.querySelectorAll('._ky-open-editor').forEach(b => {
      b.addEventListener('click', () => {
        const num = b.dataset.num;
        if (window.SaleEditor && SaleEditor.openByNum) SaleEditor.openByNum(num);
      });
    });
    main.querySelectorAll('._ky-view-invoice').forEach(b => {
      b.addEventListener('click', () => openInvoice(b.dataset.id));
    });
    // 📧 Senda — opnar póst-ritilinn (patch 254) með hökum fyrir reikning og/eða
    // úttektarskýrslu + breytanlegan staðlaðan texta. Sent gegnum Gmail.
    main.querySelectorAll('._ky-email').forEach(b => {
      b.addEventListener('click', async () => {
        const s = (_state.all || []).find(x => String(x.id) === String(b.dataset.id));
        if (!s) return;
        if (!window.ReceiptSender || !ReceiptSender.compose) {
          if (window.Toast && Toast.show) Toast.show('Póst-ritillinn hlóðst ekki — endurhladdu síðunni.');
          return;
        }
        const res = resolveSkyrsla(s);
        const nr = s.num || '';
        const email = await emailForSale(s);
        ReceiptSender.compose({
          title: 'Senda — ' + (s.customer_nafn || ''),
          to: email,
          subject: 'Reikningur ' + nr + ' — Slökkvitæki ehf',
          bodyText: ReceiptSender.standardText('reikningur', { nafn: s.customer_nafn || '', nr: nr }),
          attachmentChoices: [
            { label: 'Reikningur ' + nr + ' (PDF)', checked: true,
              build: () => ReceiptSender.invoiceAttachment(s.id) },
            { label: 'Úttektarskýrsla' + (res.year ? ' ' + res.year : ''),
              checked: res.found, disabled: !res.found,
              build: () => skyrslaAttachment(res) },
          ],
        });
      });
    });
    main.querySelectorAll('._ky-nyjan').forEach(b => {
      b.addEventListener('click', () => openNewSaleFor(b.dataset.kt, b.dataset.nafn));
    });
    main.querySelectorAll('._ky-kredit').forEach(b => {
      b.addEventListener('click', async () => {
        if (!window.CreditInvoice || !CreditInvoice.open) {
          alert('Kreditfærslueining ekki tiltæk.'); return;
        }
        const SB = getSB(); if (!SB) return;
        const r = await SB.from('solur')
          .select('id,num,customer_nafn,customer_id,samtals,upphaed_an_vsk,vsk_upphaed,linur,greitt_med')
          .eq('id', b.dataset.id).single();
        if (r.error || !r.data) { alert('Salan fannst ekki.'); return; }
        const d = r.data;
        CreditInvoice.open({
          id: d.id, num: d.num, customer: d.customer_nafn, customer_id: d.customer_id,
          total: +(d.samtals || 0), ex: +(d.upphaed_an_vsk || 0), vsk: +(d.vsk_upphaed || 0),
          lines: Array.isArray(d.linur) ? d.linur : [], payment: d.greitt_med
        });
        // Patch 26 hides the modal on confirm/cancel — refresh on close.
        setTimeout(() => {
          const modal = document.getElementById('ci-modal');
          if (!modal) return;
          const obs = new MutationObserver(() => {
            if (modal.style.display === 'none') {
              obs.disconnect();
              setTimeout(() => load(_state.month), 250);
            }
          });
          obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
        }, 250);
      });
    });
    // ── ⊘ Afturkalla kröfu í Payday — cancels claim + invoice, frees the sale ──
    main.querySelectorAll('._ky-afturkalla').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const sale = (_state.all || []).find(s => String(s.id) === String(id));
        const label = sale ? ((sale.num || '') + ' · ' + (sale.customer_nafn || '')) : ('#' + id);
        if (!confirm('Afturkalla kröfuna í Payday?\n\n' + label + '\n\nÞetta fellir niður bæði bankakröfuna og reikninginn í Payday, og losar söluna svo hægt sé að senda hana aftur. Ekki hægt að afturkalla ef kúnninn er þegar búinn að greiða.')) return;
        b.disabled = true; b.style.opacity = '.5';
        try {
          const r = await fetch('/api/payday-push', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cancel', sale_id: id }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
          if (window.Toast && Toast.show) Toast.show('⊘ ✓ Krafa afturkölluð í Payday');
          await load(_state.month);
        } catch (e) {
          alert('Afturköllun mistókst: ' + (e.message || e));
          b.disabled = false; b.style.opacity = '';
        }
      });
    });
    main.querySelectorAll('._ky-copy-total').forEach(b => {
      b.addEventListener('click', async () => {
        const v = b.dataset.value;
        try {
          await navigator.clipboard.writeText(v);
          if (window.Toast && Toast.show) Toast.show('✓ Afritað: ' + v + ' kr');
        } catch (_) {}
      });
    });

    // Síma/app: stutt yfirlit — smellur á röð opnar minnispunkt + aðgerðir.
    if (!_state.openSales) _state.openSales = new Set();
    main.querySelectorAll('.ky-mrow .ky-saletop').forEach(top => {
      const row = top.closest('.ky-mrow');
      if (!row) return;
      const toggle = (ev) => {
        if (ev.target.closest('input,button,a,select,textarea,.ky-acts,._ky-note')) return;
        ev.preventDefault();
        const id = String(row.dataset.saleId || '');
        const on = !row.classList.contains('open');
        row.classList.toggle('open', on);
        top.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (id) {
          if (on) _state.openSales.add(id); else _state.openSales.delete(id);
        }
      };
      top.addEventListener('click', toggle);
      top.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') toggle(ev);
      });
    });

    // ── Bulk-select checkboxes → selection set + sticky send bar ─────────────
    main.querySelectorAll('._ky-pick').forEach(cb => {
      cb.checked = _state.selected.has(String(cb.dataset.id));
      cb.addEventListener('change', () => {
        const id = String(cb.dataset.id);
        if (cb.checked) _state.selected.add(id); else _state.selected.delete(id);
        syncCoChecks(); updateBulkBar();
      });
    });
    main.querySelectorAll('._ky-pick-co').forEach(cb => {
      cb.addEventListener('change', () => {
        const ids = String(cb.dataset.ids || '').split(',').filter(Boolean);
        if (cb.checked) ids.forEach(id => _state.selected.add(String(id)));
        else ids.forEach(id => _state.selected.delete(String(id)));
        syncRowChecks(); syncCoChecks(); updateBulkBar();
      });
    });
    syncCoChecks();
    updateBulkBar();

    refreshBadge();
  }

  // ── Bulk Payday send helpers ───────────────────────────────────────────────
  function kyMain() { return document.getElementById('ky-main'); }
  function syncRowChecks() {
    const main = kyMain(); if (!main) return;
    main.querySelectorAll('._ky-pick').forEach(rc => { rc.checked = _state.selected.has(String(rc.dataset.id)); });
  }
  function syncCoChecks() {
    const main = kyMain(); if (!main) return;
    main.querySelectorAll('._ky-pick-co').forEach(cb => {
      const ids = String(cb.dataset.ids || '').split(',').filter(Boolean);
      const sel = ids.filter(id => _state.selected.has(String(id)));
      cb.checked = ids.length > 0 && sel.length === ids.length;
      cb.indeterminate = sel.length > 0 && sel.length < ids.length;
    });
  }
  function selectedSales() {
    return (_state.all || []).filter(s => _state.selected.has(String(s.id)) && isSendable(s));
  }

  // Make sure the sale row carries a kt before we push to Payday. If the sale
  // was saved name-only, write back the unambiguous name-matched kt (+ links)
  // first — that's the fix for POS "Án kennitölu" claims losing their kt.
  async function ensureKtForSale(sale) {
    if (sale.customer_kt) return { ok: true };
    const fy = sale.customer_id ? (_state.fyrirtMap || {})[sale.customer_id] : null;
    if (fy && fy.kennitala) return { ok: true };
    const bb = sale.customer_base_id ? (_state.baseMap || {})[sale.customer_base_id] : null;
    if (bb && bb.kennitala) return { ok: true };
    const rec = (_state.nameKt || {})[keyName(sale.customer_nafn)];
    if (!rec || !rec.kt) return { ok: false };
    const SB = getSB(); if (!SB) return { ok: false };
    const patch = { customer_kt: rec.kt };
    if (rec.coId != null && sale.customer_id == null) patch.customer_id = rec.coId;
    if (rec.baseId != null && sale.customer_base_id == null) patch.customer_base_id = rec.baseId;
    const r = await SB.from('solur').update(patch).eq('id', sale.id);
    if (r.error) return { ok: false, error: r.error.message };
    Object.assign(sale, patch);   // reflect locally so the UI updates on reload
    return { ok: true, linked: true, kt: rec.kt };
  }

  // Cancellable delay — resolves early if the user hits ⏹ Stöðva.
  function sleep(ms) {
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; clearInterval(iv); clearTimeout(t); resolve(); };
      const t = setTimeout(finish, ms);
      const iv = setInterval(() => { if (_state.stop) finish(); }, 120);
    });
  }

  function updateBulkBar() {
    const bar = document.getElementById('ky-bulkbar');
    if (!bar || _state.sending) return;   // the queue owns the bar while sending
    const sel = selectedSales();
    if (!sel.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
    const total = sel.reduce((s, x) => s + (parseFloat(x.samtals) || 0), 0);
    // How many of the selected still need a kt recovered / are unresolvable.
    const noKt = sel.filter(s => {
      if (s.customer_kt) return false;
      const fy = s.customer_id ? (_state.fyrirtMap || {})[s.customer_id] : null;
      if (fy && fy.kennitala) return false;
      const bb = s.customer_base_id ? (_state.baseMap || {})[s.customer_base_id] : null;
      if (bb && bb.kennitala) return false;
      return !((_state.nameKt || {})[keyName(s.customer_nafn)]);
    }).length;
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:100060;background:#0f172a;color:#fff;box-shadow:0 -8px 24px rgba(0,0,0,.28);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap';
    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
      + '<span style="font-weight:800;font-size:15px">🏦 ' + sel.length + ' ' + (sel.length === 1 ? 'krafa valin' : 'kröfur valdar') + '</span>'
      + '<span style="font-family:ui-monospace,monospace;font-size:14px;color:#bae6fd">' + fmtKr(total) + '</span>'
      + (noKt ? '<span style="font-size:11.5px;color:#fca5a5;background:#450a0a;border:1px solid #7f1d1d;padding:2px 8px;border-radius:99px">⚠️ ' + noKt + ' án kt</span>' : '')
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<button id="_ky-bulk-clear" type="button" style="padding:8px 12px;border:1px solid #334155;background:transparent;color:#cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px">Hreinsa</button>'
      + '<button id="_ky-bulk-draft" type="button" title="Stofna aðeins drög í Payday — þú sendir handvirkt þaðan (líka fyrir kúnna sem taka ekki við rafrænum)" style="padding:9px 16px;border:1px solid #64748b;background:#334155;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13.5px;font-weight:700">📤 Í Payday sem drög</button>'
      + '<button id="_ky-bulk-send" type="button" title="Senda sjálfkrafa (rafrænt ef hægt, annars tölvupóstur)" style="padding:9px 16px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13.5px;font-weight:700">🏦 Senda valdar í Payday</button>'
      + '</div>';
    bar.style.display = '';
    bar.querySelector('#_ky-bulk-clear').addEventListener('click', () => {
      _state.selected.clear(); syncRowChecks(); syncCoChecks(); updateBulkBar();
    });
    bar.querySelector('#_ky-bulk-draft').addEventListener('click', () => sendSelectedQueue('draft'));
    bar.querySelector('#_ky-bulk-send').addEventListener('click', () => sendSelectedQueue('send'));
  }

  async function sendSelectedQueue(mode) {
    if (_state.sending) return;
    mode = mode === 'draft' ? 'draft' : 'send';
    const sel = selectedSales();
    if (!sel.length) return;
    // 2026-08-13 (rukkunarkeðju-rannsókn, liður 5): bunkinn sendi 7 kröfur á
    // sömu kennitölu á 78 sekúndum (Vélrás 02.07) — sprengja, ekki afhending.
    // Hópum valið á kennitölu og krefjumst sérstakrar staðfestingar þegar sami
    // kúnni fengi fleiri en eina kröfu í sömu keyrslu, með ábendingu um að
    // sameina frekar (🔗 Sameina flæðið) eða dreifa yfir daga.
    const _byKt = {};
    sel.forEach(s => { const k = String(s.customer_kt || s.customer_nafn || '?'); (_byKt[k] = _byKt[k] || []).push(s); });
    const _multi = Object.entries(_byKt).filter(([, arr]) => arr.length > 1);
    if (mode !== 'draft' && _multi.length) {
      const lines = _multi.map(([kt, arr]) => '• ' + (arr[0].customer_nafn || kt) + ': ' + arr.length + ' kröfur (' +
        arr.reduce((t, s) => t + (Number(s.samtals) || 0), 0).toLocaleString('is-IS') + ' kr)').join('\n');
      if (!confirm('⚠ Sami kúnni fengi FLEIRI EN EINA kröfu í þessari keyrslu:\n\n' + lines +
        '\n\nÍhugaðu að sameina sölurnar í einn reikning (🔗 Sameina) eða dreifa sendingum yfir daga.\n\nSenda samt allar núna?')) return;
    }
    const note = mode === 'draft'
      ? 'Aðeins DRÖG verða stofnuð í Payday — þú sendir þau handvirkt þaðan.'
      : 'Reikningar SENDAST sjálfkrafa (rafrænt ef kúnni tekur við því, annars í tölvupósti).';
    if (!confirm((mode === 'draft' ? 'Stofna drög fyrir ' : 'Senda ') + sel.length + ' ' + (sel.length === 1 ? 'kröfu' : 'kröfur') + ' í Payday?\n\nEin og ein, ~6 sek á milli. ' + note)) return;
    _state.sending = true; _state.stop = false;
    const bar = document.getElementById('ky-bulkbar');
    const DELAY = 6000;
    const results = [];
    function renderProgress(done, statusText) {
      if (!bar) return;
      const pct = Math.round((done / sel.length) * 100);
      bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:100060;background:#0f172a;color:#fff;box-shadow:0 -8px 24px rgba(0,0,0,.28);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap';
      bar.style.display = '';
      bar.innerHTML =
        '<div style="flex:1;min-width:220px">'
        + '<div style="font-weight:700;font-size:14px;margin-bottom:6px">🏦 Sendi kröfur í Payday… ' + done + '/' + sel.length + '</div>'
        + '<div style="height:6px;background:#1e293b;border-radius:99px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#2563eb,#38bdf8);transition:width .3s"></div></div>'
        + '<div style="font-size:11.5px;color:#94a3b8;margin-top:5px">' + esc(statusText || '') + '</div>'
        + '</div>'
        + '<button id="_ky-bulk-stop" type="button" style="padding:9px 14px;border:1px solid #7f1d1d;background:#450a0a;color:#fecaca;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">⏹ Stöðva</button>';
      const sb = bar.querySelector('#_ky-bulk-stop');
      if (sb) sb.addEventListener('click', () => { _state.stop = true; sb.textContent = '⏹ Stöðva… (klára núverandi)'; sb.disabled = true; });
    }
    renderProgress(0, 'Undirbý…');
    let sent = 0, failed = 0, skipped = 0;
    for (let i = 0; i < sel.length; i++) {
      if (_state.stop) { skipped = sel.length - i; break; }
      const sale = sel[i];
      renderProgress(i, (sale.num || '') + ' · ' + (sale.customer_nafn || ''));
      try {
        const ke = await ensureKtForSale(sale);
        if (!ke.ok) { failed++; results.push({ num: sale.num, ok: false, error: 'vantar kt' }); }
        else {
          const r = await fetch('/api/payday-push', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sale_id: sale.id, mode }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
          markWorkflowSent(sale, j);
          sent++; results.push({ num: sale.num, ok: true, dlv: deliveryNote(j) });
          _state.selected.delete(String(sale.id));
        }
      } catch (e) {
        failed++; results.push({ num: sale.num, ok: false, error: (e.message || String(e)) });
      }
      renderProgress(i + 1, '✓ Sendar: ' + sent + ' · ✗ Villur: ' + failed);
      if (i < sel.length - 1 && !_state.stop) await sleep(DELAY);
    }
    _state.sending = false; _state.stop = false;
    const failLines = results.filter(r => !r.ok).map(r => '• ' + (r.num || '?') + ': ' + (r.error || 'villa')).join('\n');
    const okLines = results.filter(r => r.ok && r.dlv).map(r => '• ' + (r.num || '?') + r.dlv).join('\n');
    alert('🏦 Payday sendingar\n\n✓ Sendar: ' + sent + '\n✗ Villur: ' + failed +
      (skipped ? ('\n⏸ Sleppt (stöðvað): ' + skipped) : '') +
      (okLines ? ('\n\n' + okLines) : '') +
      (failLines ? ('\n\n' + failLines) : ''));
    await load(_state.month);
    refreshBadge();
  }

  // Hvernig var afhent — lesið úr payday-push svarinu (delivery/email_used/
  // fellBackToNonElectronic) svo notandinn sjái strax hvert reikningurinn fór.
  function deliveryNote(j) {
    if (!j) return '';
    if (j.fellBackToNonElectronic) return ' — rafrænt hafnað, sent í pósti' + (j.email_used ? ' á ' + j.email_used : '');
    if (j.delivery === 'both') return ' — ⚡ rafrænt + ✉ ' + (j.email_used || 'póstafrit');
    if (j.delivery === 'electronic') return ' — ⚡ rafrænt (ekkert póstafrit)';
    if (j.delivery === 'email') return ' — ✉ ' + (j.email_used || 'tölvupóstur');
    if (j.delivery === 'none' && j.mode !== 'draft') return ' — ⚠ engin afhending';
    return '';
  }

  // ── Shared per-company / per-row builders (used by all three view modes) ────
  // Identity block: kt (direct or 🔗 name-recovered) + email + clickable name.
  function companyIdentity(grp) {
    const sales = grp.sales;
    const fy = grp.id ? (_state.fyrirtMap || {})[grp.id] : null;
    const firstSale = sales[0] || {};
    const baseRow = firstSale.customer_base_id ? (_state.baseMap || {})[firstSale.customer_base_id] : null;
    const directKt = (firstSale.customer_kt) || (fy && fy.kennitala) || (baseRow && baseRow.kennitala) || null;
    // 2026-08-05: recovered (nameKt) is looked up regardless of directKt now —
    // a sale can carry a real customer_kt yet still miss customer_id/base_id
    // (exactly the Engjasel 31 case: kt WAS null too here, but the general
    // fix is the same either way) — email fallback shouldn't depend on kt
    // already being present.
    const recovered = (_state.nameKt || {})[keyName(grp.display)] || null;
    const email = (fy && fy.netfang) || (baseRow && baseRow.netfang) || (recovered && recovered.netfang) || null;
    const ktHtml = directKt
      ? '<span style="color:#475569;font-family:ui-monospace,Menlo,monospace;font-size:11px">' + esc(directKt) + '</span>'
      : recovered
        ? '<span title="kt fannst sjálfkrafa út frá nafni — vistast við sendingu í Payday" style="color:#b45309;font-family:ui-monospace,Menlo,monospace;font-size:11px">🔗 ' + esc(recovered.kt) + '</span>'
        : '<span style="color:#dc2626;font-weight:700">⚠️ vantar kt</span>';
    const metaHtml = [
      ktHtml,
      email ? '<span style="color:#0369a1">📧 ' + esc(email) + '</span>'
            : '<span style="color:#b45309">⚠️ vantar netfang</span>',
    ].join(' · ');
    // Hlekkjanlegt nafn: beint customer_id, annars fyrirtaeki fundið eftir kt,
    // annars nafna-endurheimtin (rec.coId) — úttektar-sölur bera oft ekkert id.
    const linkId = grp.id
      || (directKt && _state.fyrirtIdsByKt && (_state.fyrirtIdsByKt[directKt] || [])[0])
      || (recovered && recovered.coId)
      || null;
    const nameHtml = linkId
      ? `<a href="#" class="_ky-co-link" data-co-id="${linkId}" style="color:#0f172a;text-decoration:none;border-bottom:1px dotted #94a3b8;cursor:pointer">${esc(grp.display)}</a>`
      : esc(grp.display);
    return { fy, firstSale, baseRow, directKt, recovered, email, metaHtml, nameHtml };
  }
  // Aging distribution → mini stacked bar + "elstu N d." label.
  function agingBarFor(sales) {
    let agG = 0, agA = 0, agR = 0, oldestD = 0;
    sales.forEach(s => { const d = daysAgo(s.created_at) || 0; const amt = parseFloat(s.samtals) || 0; if (d > oldestD) oldestD = d; if (d > 60) agR += amt; else if (d > 30) agA += amt; else agG += amt; });
    const agTot = agG + agA + agR || 1;
    const agBar = '<div style="height:6px;border-radius:99px;overflow:hidden;display:flex;background:#eef1f6;width:180px;max-width:44vw;margin-top:6px">' +
      (agG ? '<div style="width:' + (agG / agTot * 100) + '%;background:#22c55e"></div>' : '') +
      (agA ? '<div style="width:' + (agA / agTot * 100) + '%;background:#f59e0b"></div>' : '') +
      (agR ? '<div style="width:' + (agR / agTot * 100) + '%;background:#ef4444"></div>' : '') +
    '</div>';
    const oldestLbl = oldestD > 60 ? 'elstu 60+ d.' : ('elstu ' + oldestD + ' d.');
    return { agBar, oldestLbl };
  }
  // ── 📄 Úttektarskýrsla per krafa (2026-07-16) ──────────────────────────────
  // Resolve the inspection report for the sale's YEAR: (1) fyrirtækjaviðhengi
  // (CompanyAttachments, kind='skyrsla', sama ár — sama og payday-push notar),
  // (2) customer_documents (doc_type='uttektarskyrsla', sama ár) per fyrirtæki
  // eða customers_base. Skilar {found, kind:'att'|'doc', ...} — aldrei giskað.
  function resolveSkyrsla(s) {
    const yr = String(new Date(s.created_at || Date.now()).getFullYear());
    const candidateIds = [];
    if (s.customer_id) candidateIds.push(s.customer_id);
    // Úttektar-sölur eru oft vistaðar nafn-eingöngu (ekkert customer_id/kt) —
    // notum þá nafna-endurheimtina (nameKt) sem síðan sýnir þegar 🔗 kt-ið.
    const rec = (_state.nameKt || {})[keyName(s.customer_nafn)] || null;
    if (rec && rec.coId != null && !candidateIds.includes(rec.coId)) candidateIds.push(rec.coId);
    const kt = (s.customer_kt || (rec && rec.kt) || '').trim();
    if (kt && _state.fyrirtIdsByKt && _state.fyrirtIdsByKt[kt]) {
      _state.fyrirtIdsByKt[kt].forEach(id => { if (!candidateIds.includes(id)) candidateIds.push(id); });
    }
    // 1) fyrirtækjaviðhengi (Supabase samningar-bucket)
    try {
      if (window.CompanyAttachments && CompanyAttachments.list) {
        for (const coId of candidateIds) {
          const atts = CompanyAttachments.list(coId) || [];
          const hit = atts.find(a => a && a.kind === 'skyrsla' && String(a.year || '') === yr);
          if (hit) return { found: true, kind: 'att', coId, att: hit, year: yr };
        }
      }
    } catch (_) {}
    // 2) customer_documents (Drive-hryggurinn)
    const docs = [];
    candidateIds.forEach(id => ((_state.docsByCo || {})[String(id)] || []).forEach(d => { if (!docs.includes(d)) docs.push(d); }));
    const baseIds = [];
    if (s.customer_base_id) baseIds.push(s.customer_base_id);
    const fy = s.customer_id ? (_state.fyrirtMap || {})[s.customer_id] : null;
    if (fy && fy.customer_base_id != null) baseIds.push(fy.customer_base_id);
    if (kt && _state.baseIdByKt && _state.baseIdByKt[kt] != null) baseIds.push(_state.baseIdByKt[kt]);
    if (rec && rec.baseId != null && !baseIds.includes(rec.baseId)) baseIds.push(rec.baseId);
    baseIds.forEach(id => ((_state.docsByBase || {})[String(id)] || []).forEach(d => { if (!docs.includes(d)) docs.push(d); }));
    const doc = docs.find(d => String(d.year || '') === yr && (d.drive_file_id || d.storage_path));
    if (doc) return { found: true, kind: 'doc', doc, year: yr };
    return { found: false, year: yr };
  }
  // Open the resolved report in a new tab (attachment → public storage URL /
  // preview; customer_documents → storage URL else Drive viewer).
  async function openSkyrsla(res) {
    if (res.kind === 'att' && res.att) {
      if (res.att.path && window.CompanyAttachments && CompanyAttachments.getPublicUrl) {
        const url = await CompanyAttachments.getPublicUrl(res.att.path);
        if (url) { window.open(url, '_blank', 'noopener'); return; }
      }
      if (window.CompanyAttachments && CompanyAttachments.openPreview) { CompanyAttachments.openPreview(res.att); return; }
      throw new Error('Gat ekki opnað skýrsluna.');
    }
    if (res.kind === 'doc' && res.doc) {
      if (res.doc.storage_path && window.CompanyAttachments && CompanyAttachments.getPublicUrl) {
        const url = await CompanyAttachments.getPublicUrl(res.doc.storage_path);
        if (url) { window.open(url, '_blank', 'noopener'); return; }
      }
      if (res.doc.drive_file_id && String(res.doc.drive_file_id).indexOf('sb:') !== 0) {
        window.open('https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(res.doc.drive_file_id), '_blank', 'noopener');
        return;
      }
    }
    throw new Error('Skjalið fannst ekki.');
  }
  // Úttektarskýrsla sölu → viðhengi ({url} eða {driveId}) fyrir 📧 Senda-gluggann.
  async function skyrslaAttachment(res) {
    if (!res || !res.found) return null;
    const fn = 'Úttektarskýrsla' + (res.year ? ' ' + res.year : '') + '.pdf';
    const getUrl = window.CompanyAttachments && CompanyAttachments.getPublicUrl;
    if (res.kind === 'att' && res.att && res.att.path && getUrl) {
      const url = await CompanyAttachments.getPublicUrl(res.att.path);
      return url ? { filename: fn, url: url } : null;
    }
    if (res.kind === 'doc' && res.doc) {
      if (res.doc.storage_path && getUrl) {
        const url = await CompanyAttachments.getPublicUrl(res.doc.storage_path);
        if (url) return { filename: fn, url: url };
      }
      if (res.doc.drive_file_id) return { filename: fn, driveId: res.doc.drive_file_id };
    }
    return null;
  }

  // Netfang kúnnans til að forfylla Senda-gluggann (má alltaf breyta þar).
  async function emailForSale(s) {
    const SB = getSB(); if (!SB) return '';
    const kt = String((s && s.customer_kt) || '').replace(/\D/g, '');
    if (kt.length === 10 && kt !== '9999999999') {
      const d = kt.slice(0, 6) + '-' + kt.slice(6);
      for (const t of ['fyrirtaeki', 'vidskiptavinir']) {
        try {
          const r = await SB.from(t).select('netfang').or('kennitala.eq.' + kt + ',kennitala.eq.' + d)
            .not('netfang', 'is', null).limit(1).maybeSingle();
          if (r && r.data && r.data.netfang) return String(r.data.netfang).trim();
        } catch (_) {}
      }
    }
    if (s && s.customer_id) {
      try {
        const r = await SB.from('fyrirtaeki').select('netfang').eq('id', s.customer_id).maybeSingle();
        if (r && r.data && r.data.netfang) return String(r.data.netfang).trim();
      } catch (_) {}
    }
    return '';
  }

  // 📄 Skýrsla takki í kyAbtn-röðinni: GRÆNN (filled) þegar skýrsla ársins er
  // til → opnar hana; grár „vantar" annars (smellur = toast, ekkert meira).
  function skyrslaBtnFor(s) {
    const res = resolveSkyrsla(s);
    return res.found
      ? kyAbtn('_ky-skyrsla', 'data-id="' + s.id + '"', '📄', 'Skýrsla', '#0f7a43', 'Úttektarskýrsla ' + res.year + ' — opna og yfirfara áður en krafan er send (fylgir kröfunni sem viðhengi)', true)
      : kyAbtn('_ky-skyrsla', 'data-id="' + s.id + '" data-missing="1"', '📄', 'Skýrsla', '#a6adbb', 'Engin úttektarskýrsla fundin fyrir ' + res.year, false);
  }
  function skyrslaIconFor(s) {
    const res = resolveSkyrsla(s);
    return res.found
      ? kyIcon('_ky-skyrsla', 'data-id="' + s.id + '"', '📄', '#0f7a43', 'Úttektarskýrsla ' + res.year + ' — opna og yfirfara', true)
      : kyIcon('_ky-skyrsla', 'data-id="' + s.id + '" data-missing="1"', '📄', '#a6adbb', 'Engin úttektarskýrsla fundin fyrir ' + res.year, false);
  }
  // 🏦 Senda-gluggi (kemur í stað confirm): sýnir kröfuna + skýrslu-stöðuna.
  // Skýrsla til → hak „fylgir sem viðhengi" (sjálfgefið á, má afhaka) + 👁 opna.
  // Engin skýrsla → heiðarleg lína; sending samt leyfð (ALLTAF LEYFA VISTUN).
  function openKrafaSendDialog(sale) {
    return new Promise(resolve => {
      const res = resolveSkyrsla(sale || {});
      const old = document.getElementById('_ky-send-modal'); if (old) old.remove();
      const wrap = document.createElement('div');
      wrap.id = '_ky-send-modal';
      wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100070;display:flex;align-items:center;justify-content:center;padding:20px;font-family:\'Space Grotesk\',system-ui,sans-serif';
      const isUttekt = !!(sale && sale.source === 'uttekt');
      let reportHtml;
      if (res.found) {
        reportHtml =
          '<div style="margin:14px 0;padding:12px 14px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px">' +
            '<label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:13.5px;color:#065f46;font-weight:700">' +
              '<input type="checkbox" id="_ky-send-attach" checked style="width:17px;height:17px;accent-color:#0f7a43;cursor:pointer;flex-shrink:0">' +
              '<span>📄 Úttektarskýrsla ' + esc(res.year) + ' fylgir kröfunni sem viðhengi</span>' +
            '</label>' +
            '<div style="margin-top:9px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
              '<button type="button" id="_ky-send-open" style="padding:7px 12px;border:1px solid #0f7a43;background:#fff;color:#0f7a43;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700">👁 Opna og yfirfara skýrsluna</button>' +
              (!isUttekt ? '<span style="font-size:11.5px;color:#b45309">NB: Payday festir skýrsluna aðeins á úttektar-kröfur (source=uttekt).</span>' : '') +
            '</div>' +
          '</div>';
      } else {
        reportHtml = '<div style="margin:14px 0;padding:12px 14px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;font-size:13px;color:#64748b">📄 Engin úttektarskýrsla fundin fyrir ' + esc(res.year) + ' — sending er samt leyfð.</div>';
      }
      wrap.innerHTML =
        '<div style="background:#fff;border-radius:16px;padding:22px 24px;max-width:520px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.35)">' +
          '<div style="font-size:17px;font-weight:800;color:#11141c;margin-bottom:4px">🏦 Senda kröfu í Payday</div>' +
          '<div style="font-size:13px;color:#334155">' + esc((sale && sale.num) || '') + ' · ' + esc((sale && sale.customer_nafn) || '') + ' · <b class="ky-num">' + fmtKr(sale && sale.samtals) + '</b></div>' +
          reportHtml +
          '<div style="font-size:12px;color:#64748b;margin-bottom:16px">Sendist sjálfkrafa (rafrænt ef kúnni tekur við því, annars í tölvupósti). Viltu bara DRÖG? Hakaðu við kröfuna og notaðu „📤 Í Payday sem drög".</div>' +
          '<div style="display:flex;justify-content:flex-end;gap:8px">' +
            '<button type="button" id="_ky-send-cancel" style="padding:9px 16px;border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:9px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">Hætta við</button>' +
            '<button type="button" id="_ky-send-go" style="padding:9px 18px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:9px;cursor:pointer;font:inherit;font-size:13.5px;font-weight:700">🏦 Senda kröfu</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(wrap);
      const done = (v) => { wrap.remove(); resolve(v); };
      wrap.addEventListener('click', e => { if (e.target === wrap) done(null); });
      wrap.querySelector('#_ky-send-cancel').addEventListener('click', () => done(null));
      wrap.querySelector('#_ky-send-go').addEventListener('click', () => {
        const cb = wrap.querySelector('#_ky-send-attach');
        done({ attach: cb ? !!cb.checked : true, path: (res.att && res.att.path) || (res.doc && res.doc.storage_path) || null });
      });
      const ob = wrap.querySelector('#_ky-send-open');
      if (ob) ob.addEventListener('click', () => { openSkyrsla(res).catch(e => alert('Villa: ' + (e.message || e))); });
    });
  }

  // ── 📱 Sími (mobile) — one column, big taps, nothing overlaps ───────────────
  function renderCompanyMobile(grp) {
    const sales = grp.sales.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const totalStr = String(Math.round(grp.sum));
    const sendableIds = sales.filter(isSendable).map(s => s.id);
    const ident = companyIdentity(grp);
    const ag = agingBarFor(sales);

    // 2026-08 (Agnar — „hreinsað síma-útlit"): rein hvít fyrirtækjakort, aðgerða-
    // hnappar sem BROTNA (flex-wrap) svo ekkert klippist og líkaminn skrunar aldrei
    // lárétt. Öll gögn/handtök halda sér — aðeins útlit/uppröðun breytist. „Allar
    // greiddar" hnappurinn fjarlægður af síma (ósk Agnars). Nýir ky-m*/ky-co*/ky-acts
    // klasar eru EINGÖNGU á síma svo breiða/tafla-sýnin er ósnert.
    const rows = sales.map(s => {
      const da = daysAgo(s.created_at);
      const skyrslaBtn = skyrslaBtnFor(s);
      const sid = String(s.id);
      const isOpen = _state.openSales && _state.openSales.has(sid);
      const hasNote = !!(s.krafa_note && String(s.krafa_note).trim());
      return `
        <div class="ky-row ky-mrow${isOpen ? ' open' : ''}" data-sale-id="${esc(sid)}">
          <div class="ky-saletop" role="button" tabindex="0" aria-expanded="${isOpen ? 'true' : 'false'}" title="Opna aðgerðir">
            ${isSendable(s)
              ? `<input type="checkbox" class="_ky-pick" data-id="${s.id}" data-amount="${Math.round(parseFloat(s.samtals) || 0)}" title="Velja kröfu í Payday-sendingu">`
              : '<span class="ky-pick-sp"></span>'}
            <span class="ky-num ky-mnum">${esc(s.num || '')}</span>
            <span class="ky-num ky-mdate">${fmtDate(s.created_at)}</span>
            ${agingPill(da)}
            <span class="ky-num ky-mamt">${fmtKr(s.samtals)}</span>
            ${hasNote ? '<span class="ky-hasnote" title="Minnispunktur">🗒</span>' : ''}
            <span class="ky-chev" aria-hidden="true">›</span>
          </div>
          <div class="ky-mdetail">
          <input class="_ky-note ky-mnote" data-id="${s.id}" value="${esc(s.krafa_note || '')}" placeholder="🗒 minnispunktur (t.d. senda í tölvupósti · finna netfang)…" title="Minnispunktur fyrir þessa kröfu — vistast sjálfkrafa.">
          <!-- Sama röð og á breiða borðinu (2026-07-22 v2): skjölin fremst
               (Senda · Reikningur · Skýrsla), svo staðan (Krafa send · Greitt),
               svo hitt. Röðin er eins á síma og skjá svo handtökin séu þau sömu.
               Munurinn: hér BROTNA hnapparnir (flex-wrap) í stað láréttrar skrunar.
               Í yfirliti eru þau FALIN uns röðin er opnuð (261 blés þau í 50px). -->
          <div class="ky-acts">
            ${kyAbtn('_ky-email', 'data-id="' + s.id + '"', '📧', 'Senda', '#0f766e', 'Senda reikning og/eða úttektarskýrslu í tölvupósti', false)}
            ${kyAbtn('_ky-view-invoice', 'data-id="' + s.id + '"', '🖨', 'Reikning', '#2f5fe0', 'Skoða / prenta reikning', false)}
            ${skyrslaBtn}
            ${kyAbtn('_ky-krafa-toggle', 'data-id="' + s.id + '"' + (s.krafa_sent_at ? ' data-on="1"' : ''), '🏦', s.krafa_sent_at ? 'Krafa send' : 'Senda Kröfu', '#0f7a43', s.krafa_sent_at ? ('Krafa send ' + fmtDate(s.krafa_sent_at) + ' — smelltu til að afhaka') : 'Senda kröfu í Payday (drag)', !!s.krafa_sent_at)}
            ${kyAbtn('_ky-mark-paid', 'data-id="' + s.id + '"' + (s.paid_at ? ' data-on="1"' : ''), '✓', 'Greitt', '#0f7a43', s.paid_at ? ('Greitt ' + fmtDate(s.paid_at) + ' — smelltu til að afhaka') : 'Merkja sem greitt', !!s.paid_at)}
            ${kyAbtn('_ky-open-editor', 'data-num="' + esc(s.num) + '"', '✎', 'Breyta', '#c2410c', 'Opna í sölu-editor', false)}
            ${kyAbtn('_ky-kredit', 'data-id="' + s.id + '"', '↩', 'Bakfæra', '#dc2626', 'Bakfæra (kreditfæra) reikninginn', false)}
            ${s.dk_invoice_id ? kyAbtn('_ky-afturkalla', 'data-id="' + s.id + '"', '⊘', 'Afturkalla', '#b45309', 'Afturkalla kröfuna í Payday (fella niður kröfu + reikning)', false) : ''}
            ${kyAbtn('_ky-nyjan', 'data-kt="' + esc(s.customer_kt || '') + '" data-nafn="' + esc(s.customer_nafn || '') + '"', '＋', 'Nýr', '#0f7a43', 'Ný sala fyrir þennan viðskiptavin', false)}
          </div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="ky-co">
        <div class="ky-cohead">
          <div class="ky-cotop">
            ${sendableIds.length
              ? `<label class="ky-copick" title="Velja allar ósendar kröfur"><input type="checkbox" class="_ky-pick-co" data-ids="${sendableIds.join(',')}"></label>`
              : ''}
            <div class="ky-coid">
              <div class="ky-coname">${ident.nameHtml}</div>
              <div class="ky-cometa">${ident.metaHtml}</div>
            </div>
            <div class="ky-krafa">
              <div class="ky-kraflbl">Krafa</div>
              <div class="ky-num ky-krafamt">${fmtKr(grp.sum)}</div>
            </div>
          </div>
          <div class="ky-cobar">${ag.agBar}</div>
          <div class="ky-cosub">
            <span>${sales.length} kröfur${grp.olderSum > 0 ? ' · <span class="ky-eldra">eldra: ' + fmtKr(grp.olderSum) + '</span>' : ''} · ${ag.oldestLbl}</span>
            <button class="_ky-copy-total ky-mcopy" data-value="${esc(totalStr)}" type="button" title="Afrita upphæð">📋</button>
          </div>
        </div>
        <div>${rows}</div>
      </div>`;
  }

  // ── ▦ Tafla (table) — dense, fast-scan; grouped by company ──────────────────
  // Compact icon-only action button; keeps the same _ky-* hook classes.
  function kyIcon(cls, extra, glyph, color, title, filled) {
    const base = 'width:30px;height:30px;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;line-height:1;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;';
    const style = filled
      ? base + 'border:1px solid #156e3a;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff'
      : base + 'border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#e7ebf1);color:' + color;
    return '<button class="' + cls + ' ky-ticon' + (filled ? ' on' : '') + '" ' + extra + ' type="button" title="' + esc(title) + '" style="' + style + '">' + glyph + '</button>';
  }
  function renderTable(shown) {
    const head = '<thead><tr>' +
      '<th style="width:30px"></th>' +
      '<th>R-nr</th><th>Dags</th><th>Aldur</th><th>Fyrirtæki</th>' +
      '<th style="text-align:right">Upphæð</th><th>Staða / aðgerðir</th>' +
      '</tr></thead>';
    const body = shown.map(renderTableGroup).join('');
    return '<div style="background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:14px;overflow-x:auto;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)">' +
      '<table class="ky-table">' + head + '<tbody>' + body + '</tbody></table></div>';
  }
  function renderTableGroup(grp) {
    const sales = grp.sales.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const totalStr = String(Math.round(grp.sum));
    const sendableIds = sales.filter(isSendable).map(s => s.id);
    const ident = companyIdentity(grp);
    const groupRow = `
      <tr class="ky-tgrp">
        <td>${sendableIds.length ? `<input type="checkbox" class="_ky-pick-co" data-ids="${sendableIds.join(',')}" title="Velja allar ósendar kröfur" style="width:16px;height:16px;cursor:pointer;accent-color:#2f5fe0">` : ''}</td>
        <td colspan="3" style="font-size:13px;overflow-wrap:anywhere">${ident.nameHtml}</td>
        <td style="color:#8a93a5;font-weight:600;white-space:nowrap">${sales.length} kröfur</td>
        <td class="ky-num" style="text-align:right;color:#11141c;font-weight:800;white-space:nowrap">${fmtKr(grp.sum)}</td>
        <td>
          <div style="display:flex;gap:5px;align-items:center">
            <button class="_ky-copy-total" data-value="${esc(totalStr)}" type="button" title="Afrita upphæð" style="width:28px;height:28px;background:#fff;color:#475569;border:1px solid rgba(20,24,34,.16);border-radius:7px;cursor:pointer;font-size:12px;flex-shrink:0">📋</button>
          </div>
        </td>
      </tr>`;
    const rows = sales.map(s => {
      const da = daysAgo(s.created_at);
      return `
        <tr class="ky-trow">
          <td>${isSendable(s) ? `<input type="checkbox" class="_ky-pick" data-id="${s.id}" data-amount="${Math.round(parseFloat(s.samtals) || 0)}" title="Velja kröfu í Payday-sendingu" style="width:15px;height:15px;cursor:pointer;accent-color:#2f5fe0">` : ''}</td>
          <td class="ky-num" style="color:#1d4ed8;font-weight:700;white-space:nowrap">${esc(s.num || '')}</td>
          <td class="ky-num" style="color:#64748b;white-space:nowrap">${fmtDate(s.created_at)}</td>
          <td>${agingPill(da)}</td>
          <td style="color:#64748b;overflow-wrap:anywhere;max-width:200px">${esc(grp.display)}</td>
          <td class="ky-num" style="text-align:right;font-weight:700;color:#11141c;white-space:nowrap">${fmtKr(s.samtals)}</td>
          <td>
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:nowrap">
              ${skyrslaIconFor(s)}
              ${kyIcon('_ky-krafa-toggle', 'data-id="' + s.id + '"' + (s.krafa_sent_at ? ' data-on="1"' : ''), '🏦', '#0f7a43', s.krafa_sent_at ? ('Krafa send ' + fmtDate(s.krafa_sent_at) + ' — smelltu til að afhaka') : 'Senda kröfu í Payday', !!s.krafa_sent_at)}
              ${kyIcon('_ky-mark-paid', 'data-id="' + s.id + '"' + (s.paid_at ? ' data-on="1"' : ''), '✓', '#0f7a43', s.paid_at ? ('Greitt ' + fmtDate(s.paid_at) + ' — smelltu til að afhaka') : 'Merkja sem greitt', !!s.paid_at)}
              ${kyIcon('_ky-view-invoice', 'data-id="' + s.id + '"', '🖨', '#2f5fe0', 'Skoða / prenta reikning', false)}
              ${kyIcon('_ky-open-editor', 'data-num="' + esc(s.num) + '"', '✎', '#c2410c', 'Opna í sölu-editor', false)}
              ${kyIcon('_ky-kredit', 'data-id="' + s.id + '"', '↩', '#dc2626', 'Bakfæra (kreditfæra) reikninginn', false)}
              ${s.dk_invoice_id ? kyIcon('_ky-afturkalla', 'data-id="' + s.id + '"', '⊘', '#b45309', 'Afturkalla kröfuna í Payday', false) : ''}
              ${kyIcon('_ky-nyjan', 'data-kt="' + esc(s.customer_kt || '') + '" data-nafn="' + esc(s.customer_nafn || '') + '"', '＋', '#0f7a43', 'Ný sala fyrir þennan viðskiptavin', false)}
            </div>
          </td>
        </tr>`;
    }).join('');
    return groupRow + rows;
  }

  function renderCompany(grp) {
    // Sort sales chronological asc within the company card for easier review.
    const sales = grp.sales.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const totalStr = String(Math.round(grp.sum));
    // Ids of claims not yet pushed to Payday — these get a pick checkbox and are
    // what the company "select all" toggles.
    const sendableIds = sales.filter(isSendable).map(s => s.id);

    // 2026-06-30: sýna kt + email fyrir Payday-undirbúning (companyIdentity).
    const ident = companyIdentity(grp);
    const meta = ident.metaHtml;
    const nameHtml = ident.nameHtml;
    // Aging distribution across the company's claims → mini bar + oldest days.
    const ag = agingBarFor(sales);
    const agBar = ag.agBar;
    const oldestLbl = ag.oldestLbl;

    return `
      <div style="background:#fff;border:1px solid rgba(20,24,34,.08);border-radius:16px;margin-bottom:12px;overflow:hidden;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)">
        <div style="padding:14px 18px;border-bottom:1px solid #eef1f6;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:flex-start;gap:12px">
            ${sendableIds.length
              ? `<label style="display:flex;align-items:center;padding-top:4px;cursor:pointer" title="Velja allar ósendar kröfur hjá ${esc(grp.display)}"><input type="checkbox" class="_ky-pick-co" data-ids="${sendableIds.join(',')}" style="width:17px;height:17px;cursor:pointer;accent-color:#2f5fe0"></label>`
              : ''}
            <div>
              <div style="font-weight:800;color:#11141c;font-size:16px">${nameHtml}</div>
              <div style="font-size:11px;color:#8a93a5;margin-top:2px">${meta}</div>
              ${agBar}
              <div style="font-size:11px;color:#8a93a5;margin-top:4px">${sales.length} kröfur${grp.olderSum > 0 ? ' · <span style="color:#b45309">eldra: ' + fmtKr(grp.olderSum) + '</span>' : ''} · ${oldestLbl}</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <div style="text-align:right">
              <div style="font-size:10px;color:#8a93a5;text-transform:uppercase;letter-spacing:.1em;font-weight:700">Krafa</div>
              <div class="ky-num" style="font-size:22px;font-weight:700;color:#11141c">${fmtKr(grp.sum)}</div>
            </div>
            <button class="_ky-copy-total" data-value="${esc(totalStr)}" type="button" title="Afrita upphæð" style="width:38px;height:38px;background:#f1f5f9;color:#475569;border:1px solid rgba(20,24,34,.14);border-radius:10px;cursor:pointer;font:inherit;font-size:13px">📋</button>
          </div>
        </div>
        <div>
          ${sales.map(s => {
            const da = daysAgo(s.created_at);
            // 2026-06-30: 📎 fylgiskjal — leita úttektarskýrslu sömu ár.
            const skyrslaBtn = skyrslaBtnFor(s);
            // 2026-07-22 (ósk Agnars): þrír vinnuflæðis-hnapparnir — Skýrsla ·
            // 2026-07-22 v2 (ósk Agnars, eftir að hafa séð fyrri röðunina):
            // VINSTRI  = Senda · Reikningur · Skýrsla — skjölin sjálf.
            // HÆGRI    = Krafa send · Greitt (stöðuhnapparnir tveir) og svo
            //            Breyta · Bakfæra · Afturkalla · Nýr.
            // Fyrri útgáfan hafði Skýrslu/Kröfu send/Greitt vinstra megin; nú
            // eru skjala-aðgerðirnar vinstra megin og staðan hægra megin.
            return `
              <div class="ky-row" style="display:flex;align-items:center;gap:12px;padding:9px 18px;border-bottom:1px solid #f3f5f9;font-size:12.5px">
                ${isSendable(s)
                  ? `<input type="checkbox" class="_ky-pick" data-id="${s.id}" data-amount="${Math.round(parseFloat(s.samtals) || 0)}" title="Velja kröfu í Payday-sendingu" style="width:15px;height:15px;cursor:pointer;accent-color:#2f5fe0;flex-shrink:0">`
                  : '<span style="width:15px;flex-shrink:0"></span>'}
                <div style="width:96px;flex-shrink:0;line-height:1.2">
                  <div class="ky-num" style="color:#1d4ed8;font-weight:700">${esc(s.num || '')}</div>
                  <div class="ky-num" style="color:#64748b;font-size:11px">${fmtDate(s.created_at)}</div>
                </div>
                ${agingPill(da)}
                <div style="display:flex;gap:6px;flex-shrink:0">
                  ${kyAbtn('_ky-email', 'data-id="' + s.id + '"', '📧', 'Senda', '#0f766e', 'Senda reikning og/eða úttektarskýrslu í tölvupósti', false)}
                  ${kyAbtn('_ky-view-invoice', 'data-id="' + s.id + '"', '🖨', 'Reikning', '#2f5fe0', 'Skoða / prenta reikning', false)}
                  ${skyrslaBtn}
                </div>
                <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;margin:0 10px">
                  <input class="_ky-note" data-id="${s.id}" value="${esc(s.krafa_note || '')}" placeholder="🗒 minnispunktur (t.d. senda í tölvupósti · finna netfang)…" title="Minnispunktur fyrir þessa kröfu — eigin reitur (ekki athugasemd reikningsins). Vistast sjálfkrafa." style="flex:1;min-width:0;padding:4px 8px;border:1px solid transparent;border-bottom:1px dashed #d3d9e2;background:transparent;font:inherit;font-size:12px;color:#11141c;outline:none;border-radius:5px">
                </div>
                <span class="ky-num" style="width:90px;text-align:right;font-weight:700;color:#11141c;white-space:nowrap;flex-shrink:0">${fmtKr(s.samtals)}</span>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  ${kyAbtn('_ky-krafa-toggle', 'data-id="' + s.id + '"' + (s.krafa_sent_at ? ' data-on="1"' : ''), '🏦', s.krafa_sent_at ? 'Krafa send' : 'Senda Kröfu', '#0f7a43', s.krafa_sent_at ? ('Krafa send ' + fmtDate(s.krafa_sent_at) + ' — smelltu til að afhaka') : 'Senda kröfu í Payday (drag)', !!s.krafa_sent_at)}
                  ${kyAbtn('_ky-mark-paid', 'data-id="' + s.id + '"' + (s.paid_at ? ' data-on="1"' : ''), '✓', 'Greitt', '#0f7a43', s.paid_at ? ('Greitt ' + fmtDate(s.paid_at) + ' — smelltu til að afhaka') : 'Merkja sem greitt', !!s.paid_at)}
                  ${kyAbtn('_ky-open-editor', 'data-num="' + esc(s.num) + '"', '✎', 'Breyta', '#c2410c', 'Opna í sölu-editor', false)}
                  ${kyAbtn('_ky-kredit', 'data-id="' + s.id + '"', '↩', 'Bakfæra', '#dc2626', 'Bakfæra (kreditfæra) reikninginn', false)}
            ${s.dk_invoice_id ? kyAbtn('_ky-afturkalla', 'data-id="' + s.id + '"', '⊘', 'Afturkalla', '#b45309', 'Afturkalla kröfuna í Payday (fella niður kröfu + reikning)', false) : ''}
                  ${kyAbtn('_ky-nyjan', 'data-kt="' + esc(s.customer_kt || '') + '" data-nafn="' + esc(s.customer_nafn || '') + '"', '＋', 'Nýr', '#0f7a43', 'Ný sala fyrir þennan viðskiptavin (opnar Sölu með kt tilbúið)', false)}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // ── „＋ Nýjan" — open Sala (POS) for this customer to redo the sale ───────
  // Prefills the kt so pos.js's lookup loads the customer + auto-applies their
  // saved afsláttur (patch 255). Exposed as window.SalaNyjan so Hreyfingarlisti
  // reuses the exact same behaviour.
  //
  // 2026-08-05 (verkefnalisti d18b707d): optional `lines` (a sale's `linur`)
  // copies the original order straight into the new cart instead of leaving
  // it empty — Agnar's complaint was pressing "Bakfæra og gera nýjan" landed
  // on a blank Sala with zero indication anything carried over. Also shows a
  // one-time banner so it's obvious this cart is a copy, not a fresh start.
  function openNewSaleFor(kt, nafn, lines) {
    const digits = String(kt || '').replace(/[^0-9]/g, '');
    try { if (window.App && App.switchView) App.switchView('sala'); } catch (_) {}
    let tries = 0;
    (function go() {
      const ktInp = document.getElementById('pos-kt');
      if (ktInp) {
        if (digits.length === 10 && digits !== '9999999999') {
          ktInp.value = digits.slice(0, 6) + '-' + digits.slice(6);
          ktInp.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (Array.isArray(lines) && lines.length) fillCopiedLines(lines, nafn);
        return;
      }
      if (tries === 1) { try { location.hash = '#sala'; } catch (_) {} }  // fallback nav
      if (tries++ < 40) setTimeout(go, 150);
    })();
  }
  function fillCopiedLines(lines, nafn) {
    let tries = 0;
    (function go() {
      if (window.POS && typeof POS.getState === 'function' && typeof POS.rerenderDynamic === 'function') {
        const st = POS.getState();
        st.lines = lines.map(l => Object.assign({}, l));
        POS.rerenderDynamic();
        showCopyBanner(nafn);
        return;
      }
      if (tries++ < 40) setTimeout(go, 150);
    })();
  }
  // Obvious one-time notice — "this cart didn't start empty, it's a copy".
  function showCopyBanner(nafn) {
    document.getElementById('_sn-copy-banner')?.remove();
    const b = document.createElement('div');
    b.id = '_sn-copy-banner';
    b.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:100090;background:linear-gradient(135deg,#0f7a43,#0a5c33);color:#fff;padding:12px 20px;border-radius:10px;box-shadow:0 12px 30px -10px rgba(0,0,0,.4);font:600 13px system-ui,-apple-system,sans-serif;display:flex;align-items:center;gap:10px';
    b.innerHTML = '<span>📋 Bakfært' + (nafn ? ' — ' + String(nafn).replace(/[<>&]/g, '') : '') + '. Línurnar úr gömlu sölunni eru komnar í körfuna — breyttu og staðfestu sem nýja sölu.</span>' +
      '<button type="button" style="background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:7px;padding:4px 10px;cursor:pointer;font:inherit">✕</button>';
    b.querySelector('button').addEventListener('click', () => b.remove());
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 12000);
  }
  window.SalaNyjan = openNewSaleFor;

  // ── View invoice (SalaInvoice popup) ─────────────────────────────────────
  async function openInvoice(saleId) {
    const SB = getSB();
    if (!SB) return;
    if (!window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') {
      alert('Reikningsmótið er ekki tiltækt.'); return;
    }
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
    const r = await SB.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { w.close(); alert('Salan fannst ekki.'); return; }
    const sale = r.data;
    let cust = null;
    if (sale.customer_id) {
      // fyrirtaeki + vidskiptavinir have independent bigserials → low ids
      // overlap. Pull both and disambiguate by matching sale.customer_nafn.
      const [fRes, vRes] = await Promise.all([
        SB.from('fyrirtaeki').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
        SB.from('vidskiptavinir').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
      ]);
      const f = fRes.data, v = vRes.data;
      const norm = s => String(s || '').trim().toLowerCase();
      const saleNafn = norm(sale.customer_nafn);
      if (saleNafn) {
        if (f && norm(f.nafn) === saleNafn) cust = f;
        else if (v && norm(v.nafn) === saleNafn) cust = v;
      }
      if (!cust) cust = f || v || null;
    }
    SalaInvoice.renderFromSale(w, sale, cust);
  }

  // ── Sidebar badge ────────────────────────────────────────────────────────
  async function refreshBadge() {
    const btn = document.querySelector('.vnav-btn[data-view="' + NAV_KEY + '"]');
    if (!btn) return;
    const SB = getSB();
    if (!SB) return;
    try {
      const r = await SB.from('solur').select('id', { count: 'exact', head: true })
        .eq('greitt_med', 'reikningur')
        .is('paid_at', null);
      const badge = btn.querySelector('.ky-badge');
      if (!badge) return;
      const n = r.count || 0;
      if (n > 0) {
        badge.textContent = String(n);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    } catch (_) {}
  }

  function show() {
    ensureView();
    // Try the normal route first…
    try { if (window.App && App.switchView) App.switchView(NAV_KEY); } catch (_) {}
    // …then, ONLY if that didn't activate our view (e.g. a later patch replaced
    // App.switchView without chaining our case → the core hid all views and
    // showed nothing, "shuts itself off"), force it the class-based way the
    // core uses — clearing stale inline display so nothing strands.
    const v = document.getElementById(VIEW_ID);
    if (v && !v.classList.contains('active')) {
      try {
        document.querySelectorAll('[id^="view-"]').forEach(x => { x.classList.remove('active'); x.style.display = ''; });
        v.classList.add('active'); v.style.display = 'block';
        document.querySelectorAll('.vnav-btn').forEach(b =>
          b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
      } catch (_) {}
    }
    load();
  }

  // 2026-06-13: keep the nav button alive. It must never be in sidebar_hidden
  // for it to "shut off" — but to be bulletproof against ANY patch removing it,
  // re-inject if it ever goes missing (injectNav is idempotent — it no-ops when
  // the button is already present, so this is cheap). Debounced so a burst of
  // nav mutations on load collapses into one check.
  function guardButton() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(guardButton, 400); return; }
    let t = null;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(injectNav, 250); })
      .observe(nav, { childList: true, subtree: false });
  }

  injectNav();
  setTimeout(injectNav, 1000);
  setTimeout(injectNav, 3000);
  setTimeout(injectNav, 6000);
  guardButton();
  ensureView();
  patchSwitchView();
  bootViewModeToggle();
  setTimeout(refreshBadge, 2500);
  setTimeout(refreshBadge, 8000);
  document.addEventListener('sale-edited', () => setTimeout(refreshBadge, 600));

  // 2026-08-25: Stílstjóri (262) saved accidental paint on this page only
  // (gray app-main, black title on the fire band, white/blue hero). Those
  // rules live in AppSettings page_editor_v1_json with scope view-krofu-yfirlit
  // and land in #_pe-overrides with !important, beating theme.css. Strip the
  // DOM immediately, then merge a cleaned JSON (that key only) so every
  // machine stays clean after reload.
  const PE_KEY = 'page_editor_v1_json';
  const KY_SCOPE = 'view-krofu-yfirlit';
  function stripPeOverridesDom() {
    const st = document.getElementById('_pe-overrides');
    if (!st || !st.textContent) return false;
    const next = st.textContent.split('\n').filter(function (line) {
      return !/#view-krofu-yfirlit\b/.test(line);
    }).join('\n');
    if (next === st.textContent) return false;
    st.textContent = next;
    return true;
  }
  function watchPeOverrides() {
    const attach = function (st) {
      if (!st || st.__kyPeWatch) return;
      st.__kyPeWatch = true;
      try {
        new MutationObserver(function () { stripPeOverridesDom(); })
          .observe(st, { childList: true, characterData: true, subtree: true });
      } catch (_) {}
      stripPeOverridesDom();
    };
    const existing = document.getElementById('_pe-overrides');
    if (existing) attach(existing);
    try {
      new MutationObserver(function () {
        const st = document.getElementById('_pe-overrides');
        if (st) attach(st);
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
    [0, 80, 400, 1500, 4000].forEach(function (ms) { setTimeout(stripPeOverridesDom, ms); });
  }
  let _kyPeScrubTries = 0;
  async function scrubKrofuPageEditor() {
    if (window.__kyPeScrubDone) return;
    const AS = window.AppSettings;
    const sb = window.DB && window.DB.sb;
    if (!AS || typeof AS.save !== 'function' || !sb) return;
    let raw = null;
    try {
      const r = await sb.from('app_settings').select('settings').eq('id', 1).maybeSingle();
      if (r && r.error) {
        console.warn('[patch-166] Stílstjóri-hreinsun: náði ekki stillingum', r.error.message);
        return;
      }
      raw = r && r.data && r.data.settings && r.data.settings[PE_KEY];
    } catch (e) {
      console.warn('[patch-166] Stílstjóri-hreinsun: lestrarvilla', e);
      return;
    }
    stripPeOverridesDom();
    if (!raw) { window.__kyPeScrubDone = true; return; }
    let obj;
    try { obj = (typeof raw === 'string') ? JSON.parse(raw) : raw; } catch (_) { return; }
    if (!obj || typeof obj !== 'object') return;
    if (!Array.isArray(obj.rules)) obj.rules = [];
    const before = obj.rules.length;
    obj.rules = obj.rules.filter(function (r) { return !r || r.scope !== KY_SCOPE; });
    let bgCut = false;
    if (obj.bg && obj.bg.pages && Object.prototype.hasOwnProperty.call(obj.bg.pages, KY_SCOPE)) {
      delete obj.bg.pages[KY_SCOPE];
      bgCut = true;
    }
    if (obj.rules.length === before && !bgCut) {
      window.__kyPeScrubDone = true;
      stripPeOverridesDom();
      return;
    }
    if (_kyPeScrubTries >= 5) {
      console.warn('[patch-166] Stílstjóri-hreinsun: hætti eftir', _kyPeScrubTries, 'tilraunir');
      return;
    }
    _kyPeScrubTries += 1;
    try {
      const ok = await AS.save({ [PE_KEY]: JSON.stringify(obj) });
      if (ok) {
        console.log('[patch-166] hreinsaði', before - obj.rules.length, 'Stílstjóri-reglur af Kröfu yfirliti');
      } else {
        console.warn('[patch-166] Stílstjóri-hreinsun: vistaðist ekki');
      }
    } catch (e) {
      console.warn('[patch-166] Stílstjóri-hreinsun: vistunarvilla', e);
    }
    stripPeOverridesDom();
  }
  watchPeOverrides();
  [400, 1500, 4000, 9000].forEach(function (ms) { setTimeout(scrubKrofuPageEditor, ms); });
  try {
    if (window.AppSettings && typeof AppSettings.onChange === 'function') {
      AppSettings.onChange(function () {
        stripPeOverridesDom();
        if (!window.__kyPeScrubDone) scrubKrofuPageEditor();
      });
    }
  } catch (_) {}

  window.KrofuYfirlit = { show, load, refreshBadge, getViewMode, setViewMode: (m) => applyViewMode(m, true) };
  console.log('[patch-166] Kröfu yfirlit installed — krafa í heimabanka per fyrirtæki');
})();
/* === END KRÖFU YFIRLIT === */
