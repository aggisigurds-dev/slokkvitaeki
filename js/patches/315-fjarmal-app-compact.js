/* Fjármál/Boss overview density — per-page polish on top of patch 314.
   Agnar 2026-08-26: "Fjármála app. Has everything way too big as an overview
   app. Waste of space." Kröfur collapse lives in 166 (`.ky-mdetail` / `.is-open`).
   This sheet: full-bleed lists, short Ársskoðun mrows, hide the stray copy-icon.
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
      '{padding-bottom:calc(64px + env(safe-area-inset-bottom,0px))!important}',
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode[data-app="fjarmal"] .view.active:not(#view-field):not(#view-counter):not(#view-workshop),' +
    'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode[data-app="boss"] .view.active:not(#view-field):not(#view-counter):not(#view-workshop)' +
      '{padding-bottom:calc(64px + env(safe-area-inset-bottom,0px))!important}',

    // ── Kröfur: kill remaining grey gutters around the white company card ──
    KY + '.thm .app-main{padding:8px 0 12px!important}',
    KY + '.page-title,' + KY + '.stat-row,' + KY + '.ky-exprow,' + KY + '.ky-filterbar' +
      '{padding-left:10px;padding-right:10px;box-sizing:border-box}',
    KY + '.stat-card{padding:8px 10px!important;border-radius:10px!important;min-height:0!important}',
    KY + '.stat-card__value{font-size:15px!important;margin-top:2px!important}',
    KY + '.stat-row{margin-bottom:8px!important;gap:8px!important}',
    KY + '.ky-exprow{gap:8px!important;margin-bottom:8px!important}',
    KY + '.ky-filterbar{margin-bottom:8px!important}',
    KY + '.ky-co{border-radius:0;border-left:none;border-right:none;margin-bottom:8px;box-shadow:none}',
    KY + '.ky-coname{font-size:16px!important;line-height:1.2}',
    KY + '.ky-cometa{font-size:12px!important;margin-top:2px}',
    KY + '.ky-krafamt{font-size:16px!important}',
    KY + '.ky-cohead{padding:10px 12px 6px!important}',
    KY + '.ky-cobar{margin-top:6px!important}',
    KY + '.ky-cosub{margin-top:4px!important;font-size:11px}',
    KY + '.ky-mcopy{display:none!important}',
    KY + '.filter-chip,' + KY + '.ky-navbtn,' + KY + '._ky-sync,' + KY + '._ky-exp,' +
    KY + '.page-title__tools button,' + KY + '.page-title__tools select' +
      '{min-height:36px!important;height:auto!important;padding-top:6px!important;padding-bottom:6px!important;font-size:13px!important}',
    KY + 'input._ky-search{font-size:16px!important;min-height:40px!important;padding:8px 10px!important}',
    KY + '.ky-saletop input[type=checkbox],' + KY + '.ky-copick input' +
      '{min-height:20px!important;width:20px!important;height:20px!important;padding:0!important}',
    KY + '.ky-mrow{padding:8px 12px;min-height:44px}',
    KY + '.ky-mnum{font-size:14px!important}',
    KY + '.ky-mdate{font-size:12px!important}',
    KY + '.ky-mamt{font-size:15px!important}',
    KY + '.ky-mrow.open .ky-acts .ky-abtn,' + KY + '.ky-acts .ky-abtn' +
      '{min-height:36px!important;height:36px!important;padding:2px 6px!important;font-size:11px!important}',
    KY + '.ky-mexp,.ky-chev{min-height:36px!important;width:36px!important;height:36px!important;padding:0!important}',
    KY + '.ky-mrow.open .ky-mnote{font-size:16px!important;min-height:40px!important}',

    // ── Þjónusta / Ársskoðun mrows: full-bleed, short rows, ≥16px names ──
    // Do NOT restyle `._yr` (look-A lives on another ticket).
    ARS + '#ars-main > div{padding-left:0!important;padding-right:0!important;max-width:none!important}',
    ARS + '#ars-main > div > :not(._arsm-tbl){padding-left:10px;padding-right:10px;box-sizing:border-box}',
    ARS + '._arsm-tbl{border-radius:0;border-left:none;border-right:none;margin-top:0;box-shadow:none}',
    ARS + '._arsm-row{padding:6px 10px;gap:4px;grid-template-columns:minmax(0,1fr) 66px 34px 32px 26px}',
    ARS + '._arsm-row._arsm-head{padding:5px 10px}',
    'html body.appmode #view-arsskodun ._arsm-row ._arsm-nm{font-size:16px!important;font-weight:700;line-height:1.2}',
    'html body.appmode #view-arsskodun ._arsm-row ._arsm-sub{font-size:12px!important}',
    ARS + '._arsm-ak{min-height:32px!important;width:32px!important;height:32px!important;padding:0!important}',
    ARS + '#_ars-search{font-size:16px!important;min-height:40px!important;padding:8px 10px!important}',
    ARS + '#_ars-new,' + ARS + '#_ars-print,' + ARS + '#_ars-print-caret,' + ARS + '#_ars-ovr,' +
    ARS + '#_ars-sort,' + ARS + '._ars-st,' + ARS + '._ars-mo,' + ARS + '#_ars-skiphide,' +
    ARS + '#_ars-pnr-btn' +
      '{min-height:36px!important;padding-top:6px!important;padding-bottom:6px!important;font-size:13px!important}',
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
