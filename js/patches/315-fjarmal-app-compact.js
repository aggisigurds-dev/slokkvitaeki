/* Fjármál/Boss overview density — per-page polish on top of patch 314.
   Agnar 2026-08-26: "Fjármála app. Has everything way too big as an overview
   app. Waste of space." Compact sizes stay; 166 no longer hides `.ky-acts`
   behind `.open` (Senda kröfu / Greitt were gone entirely).
   This sheet: full-bleed lists, short Ársskoðun mrows, hide the stray copy-icon,
   and beat 261’s `[role=button]` 12px padding on `.ky-saletop`.
   Does not edit theme-scoped.css or restyle Ársskoðun `._yr` look-A. */
(() => {
  if (window.__fjarmalAppCompactInstalled) return;
  window.__fjarmalAppCompactInstalled = true;

  const STYLE_ID = 'fjarmal-app-compact-css';
  const KY = 'body.appmode #view-krofu-yfirlit ';
  const ARS = 'body.appmode #view-arsskodun ';
  const HL = 'body.appmode #view-hreyfingarlisti ';

  const css = [
    // Bottom-nav compacting can also live in 314; keep a Fjármál/Boss override
    // in case 314 is not present on a given deploy.
    'body.appmode[data-app="fjarmal"] #_app-nav,body.appmode[data-app="boss"] #_app-nav' +
      '{padding:4px 6px calc(4px + env(safe-area-inset-bottom,0px))!important;gap:4px}',
    'body.appmode[data-app="fjarmal"] #_app-nav button,body.appmode[data-app="boss"] #_app-nav button' +
      '{min-height:52px!important;padding:4px 3px!important;font-size:11px!important;gap:2px!important;border-radius:10px}',
    'body.appmode[data-app="fjarmal"] #_app-nav button .e,body.appmode[data-app="boss"] #_app-nav button .e{font-size:18px}',
    'body.appmode[data-app="fjarmal"] .view.active,body.appmode[data-app="boss"] .view.active' +
      '{padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))!important}',
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode[data-app="fjarmal"] .view.active:not(#view-field):not(#view-counter):not(#view-workshop),' +
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode[data-app="boss"] .view.active:not(#view-field):not(#view-counter):not(#view-workshop)' +
      '{padding-bottom:calc(88px + env(safe-area-inset-bottom,0px))!important}',

    // 230 Brunastál: `.view.active:not(#view-field):not(#view-counter):not(#view-workshop)>.main-panel{padding:8px 14px}`
    // The three :not(#id) bump specificity past a plain `#ars-main` rule — copy the
    // chain plus the view id so the white list can go full-bleed.
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode #view-krofu-yfirlit.active:not(#view-field):not(#view-counter):not(#view-workshop)>.main-panel,' +
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode #view-arsskodun.active:not(#view-field):not(#view-counter):not(#view-workshop)>.main-panel,' +
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode #view-hreyfingarlisti.active:not(#view-field):not(#view-counter):not(#view-workshop)>.main-panel' +
      '{padding-left:0!important;padding-right:0!important}',

    // ── Kröfur: kill remaining grey gutters around the white company card ──
    KY + '.thm .app-main{padding:8px 0 12px!important}',
    KY + '.page-title,' + KY + '.stat-row,' + KY + '.ky-exprow,' + KY + '.ky-filterbar' +
      '{padding-left:10px;padding-right:10px;box-sizing:border-box}',
    KY + '.page-title{margin-bottom:6px!important;gap:6px!important}',
    KY + '.page-title h1{font-size:18px!important}',
    KY + '.stat-card{padding:6px 8px!important;border-radius:10px!important;min-height:0!important}',
    KY + '.stat-card__label{font-size:9px!important}',
    KY + '.stat-card__value{font-size:14px!important;margin-top:1px!important}',
    KY + '.stat-row{margin-bottom:6px!important;gap:6px!important}',
    KY + '.ky-exprow{gap:6px!important;margin-bottom:6px!important}',
    KY + '.ky-exprow > *{padding:6px 8px!important;min-height:0!important}',
    KY + '.ky-filterbar{margin-bottom:8px!important}',
    KY + '.ky-co{border-radius:0;border-left:none;border-right:none;margin-bottom:8px;box-shadow:none}',
    KY + '.ky-coname{font-size:16px!important;line-height:1.2}',
    KY + '.ky-cometa{font-size:12px!important;margin-top:2px}',
    KY + '.ky-krafamt{font-size:16px!important}',
    KY + '.ky-cohead{padding:8px 10px 4px!important}',
    KY + '.ky-cobar{margin-top:4px!important}',
    KY + '.ky-cosub{margin-top:2px!important;font-size:11px}',
    KY + '.ky-mcopy{display:none!important}',
    KY + '.filter-chip,' + KY + '.ky-navbtn,' + KY + '._ky-sync,' + KY + '._ky-exp,' +
    KY + '.page-title__tools button,' + KY + '.page-title__tools select' +
      '{min-height:44px!important;height:auto!important;padding-top:8px!important;padding-bottom:8px!important;font-size:13px!important}',
    KY + 'input._ky-search{font-size:16px!important;min-height:40px!important;padding:8px 10px!important}',
    KY + '.ky-saletop input[type=checkbox],' + KY + '.ky-copick input' +
      '{min-height:20px!important;width:20px!important;height:20px!important;padding:0!important}',
    // 166 already zeros `.ky-mrow` padding. Do not add it back — 261 still
    // hammers `.ky-saletop[role=button]` with padding-top/bottom 12px !important
    // (and 17px type), which is why collapsed rows stayed huge.
    KY + '.ky-mrow{padding:0!important;min-height:0}',
    KY + '.ky-saletop,' + KY + '.ky-saletop[role="button"]' +
      '{min-height:44px!important;height:auto!important;padding:6px 10px!important;' +
       'font-size:14px!important;line-height:1.2!important;flex-wrap:nowrap!important}',
    KY + '.ky-mnum{font-size:14px!important;min-width:0}',
    KY + '.ky-mdate{font-size:12px!important}',
    KY + '.ky-mamt{font-size:15px!important}',
    // 2026-08-29: ÞVINGUNIN FELLD NIÐUR. Hér stóð áður „do not re-collapse
    // behind .open" og reglurnar opnuðu hnappablokkina á ÖLLUM röðum — ~300px
    // af hnöppum á kröfu, sinnum 43 kröfur, um 13.000px af skruni til að finna
    // eina kröfu. Felunin hafði verið fjarlægð AF ÞVÍ hnapparnir fundust ekki;
    // það leysti fundvísina með því að eyðileggja listann.
    // Nú opnast AÐEINS valin röð (.open) og opnunarhnappurinn (.ky-mexp/.ky-chev)
    // er áfram 44px og sýnilegur, svo upprunalega vandamálið kemur ekki aftur.
    KY + '.ky-mdetail{display:none!important}',
    KY + '.ky-mrow.open .ky-mdetail,' + KY + '.open > .ky-mdetail'
      + '{display:block!important;height:auto!important;overflow:visible!important}',
    KY + '.ky-mrow.open .ky-acts,' + KY + '.open .ky-acts'
      + '{display:flex!important;flex-wrap:wrap!important;visibility:visible!important;height:auto!important;max-height:none!important;overflow:visible!important;pointer-events:auto!important;gap:6px;padding:0 10px 10px}',
    KY + '.open .ky-acts .ky-abtn,body.appmode #view-krofu-yfirlit .open button.ky-abtn' +
      '{display:inline-flex!important;visibility:visible!important;pointer-events:auto!important;' +
       'flex:1 1 calc(50% - 6px);min-width:calc(50% - 6px);min-height:44px!important;height:44px!important;padding:2px 4px!important;font-size:11px!important}',
    KY + '.ky-mexp,.ky-chev{min-height:44px!important;width:36px!important;height:36px!important;padding:0!important;font-size:16px!important}',
    KY + '.ky-mnote{display:block!important;font-size:16px!important;min-height:44px!important}',

    // ── Þjónusta / Ársskoðun mrows: full-bleed, short rows, ≥16px names ──
    // Do NOT restyle `._yr` (look-A lives on another ticket).
    ARS + '#ars-main,' + ARS + '#ars-main.main-panel' +
      '{padding-left:0!important;padding-right:0!important;max-width:none!important;margin:0!important}',
    ARS + '#ars-main > div,' + ARS + '#ars-main [style*="max-width:1720"]' +
      '{padding-left:0!important;padding-right:0!important;max-width:none!important;margin:0!important}',
    ARS + 'h1{font-size:18px!important;line-height:1.15!important}',
    ARS + '._ars-statgrid{gap:6px!important;margin-bottom:8px!important}',
    ARS + '._ars-statgrid > div{padding:8px 10px!important}',
    ARS + '._arsm-tbl{border-radius:0;border-left:none;border-right:none;margin-top:0;box-shadow:none;' +
      'width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;' +
      'overscroll-behavior-x:contain;scrollbar-width:thin}',
    // 2026-08-29: Grindin var negld hér (minmax(0,1fr) 66px 34px 32px 26px) fyrir
    // gamla 5-reita mrows-markupið. 153 er núna með 9 reiti (190px frosinn nafn +
    // 668px sem skrunast) og þessi lína tróð þeim í 5 rákir. Grind og padding eiga
    // heima hjá 153 einum — 315 stillir aðeins rammann utan um töfluna.
    // Lárétt skrun + músar-drag (símarammi) er í patch 328.
    ARS + '._arsm-row._arsm-head{padding:0}',
    // Nafnið fékk 16px hér; dálkurinn er 190px og raðhæðin föst 52px, svo 16px
    // sprengdi tveggja-línu klemmuna. 12.5px er það sem 153 mælir með.
    'html body.appmode #view-arsskodun ._arsm-row ._arsm-sub{font-size:9.5px!important}',
    ARS + '._arsm-ak{min-height:26px!important;width:30px!important;height:26px!important;padding:0!important}',
    ARS + '#_ars-search{font-size:16px!important;min-height:40px!important;padding:8px 10px!important}',
    ARS + '#_ars-new,' + ARS + '#_ars-ovr,' +
    ARS + '._ars-st,' + ARS + '._ars-mo,' + ARS + '#_ars-skiphide,' +
    ARS + '#_ars-pnr-btn' +
      '{min-height:36px!important;padding-top:6px!important;padding-bottom:6px!important;font-size:13px!important}',
    // Same hide as 314: Fjármál/Boss app is body.appmode. Stafrófsröð +
    // Prenta lista stay on desktop Skjár (not appmode).
    ARS + '#_ars-sort,' + ARS + '#_ars-print-wrap,' + ARS + '#_ars-print,' +
    ARS + '#_ars-print-caret,' + ARS + '#_ars-print-menu' +
      '{display:none!important}',
    ARS + 'table td,' + ARS + 'table th{padding:4px 6px;font-size:13px}',

    // ── Hreyfingar: full-bleed + actions on open ──
    HL + '.thm .app-main{padding:8px 0 12px!important}',
    HL + '.page-title,' + HL + '.stat-row,' + HL + '.filter-bar,' + HL + '.hl-filter,' +
    HL + '.ky-filterbar{padding-left:10px;padding-right:10px;box-sizing:border-box}',
    HL + '.hl-mcard{border-radius:0;border-left:none;border-right:none;margin-bottom:0;cursor:pointer}',
    HL + '.hl-mhead{padding:8px 12px}',
    HL + '.hl-mcard:not(.open) .hl-macts{display:none!important}',
    HL + '.hl-mcard.open .hl-macts{display:flex!important;flex-wrap:wrap;gap:4px;padding:6px 10px 10px}',
    HL + '.hl-mcard.open{cursor:default}',
    HL + '.abtn5{min-height:36px!important;height:36px!important;padding:2px 6px!important;font-size:11px!important}',

    // 2026-08-29 (Agnar, spjaldtolvu-hamur: "faranleg nyting a plassi"). Kroffu-
    // adgerdirnar voru tvaer i rod OHAD skjabreidd — a 834px spjaldtolvu thydir thad
    // helming skjasins ononotadan og adgerdablokk sem er haerri en krafan sjalf.
    // Fra 700px: fjorar i rod og laegri hnappar. Aeeins thettleiki — engin ny hegdun.
    '@media (min-width:700px){'+
      KY + '.open .ky-acts .ky-abtn,body.appmode #view-krofu-yfirlit .open button.ky-abtn'+
        '{flex:1 1 calc(25% - 6px)!important;min-width:calc(25% - 6px)!important;height:38px!important;min-height:38px!important}'+
      '}',
    '@media (min-width:700px){'+
      HL + '.hl-mcard.open .hl-macts .abtn5{flex:1 1 calc(25% - 4px);min-width:calc(25% - 4px)}'+
      '}',
    KY + '{overflow-x:hidden}',
    ARS + '{overflow-x:hidden}',
    HL + '{overflow-x:hidden}'
  ].join('\n');

  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
      s.textContent = css;
    } else if (s.parentNode && s.parentNode.lastElementChild !== s) {
      s.parentNode.appendChild(s);
    }
  }
  mountCss();
  document.addEventListener('slokk-viewmode', mountCss);

  document.addEventListener('click', function (e) {
    if (!document.body || !document.body.classList.contains('appmode')) return;
    const t = e.target;
    const hlCard = t.closest && t.closest('#view-hreyfingarlisti .hl-mcard');
    if (!hlCard) return;
    if (t.closest('input,button,a,select,textarea,.hl-macts,.abtn5')) return;
    const host = hlCard.closest('.view') || document;
    const was = hlCard.classList.contains('open');
    host.querySelectorAll('.hl-mcard.open').forEach(function (el) {
      if (el !== hlCard) el.classList.remove('open');
    });
    hlCard.classList.toggle('open', !was);
  }, true);

  window.FjarmalAppCompact = { mountCss };
})();
