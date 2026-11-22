/* === BRUNASTÁL V2 — dökk navy HUD (22.11.2026) ===
 *
 * Agnar: bakgrunnur einn er tilgangslaus. V2 er þema: navy, gler, appelsína,
 * dökk tafla — mockupin í mockups/bstal-v2/. 220/230/245 FROSIN.
 *
 * Rofi [C | V2] EFST í Stílstjóra. AppSettings brunastal_utgafa.
 * ?bstal=v2 forskoðar. Sjálfgefið C. Ekkert [deploy].
 */
(() => {
  if (window.BrunastalV2) return;

  const LYKILL = 'brunastal_utgafa';
  const ATTR = 'data-bstal-v2';
  const CSS_ID = 'bstal-v2-css';
  const FONT_ID = 'bstal-v2-letur';
  const GRP_ID = 'pe-bstal-v2-grp';
  const PANEL_ID = '_pe-panel';
  const PRE = 'html[data-thm-preset="brunastal"][' + ATTR + '="1"]';
  const ON = PRE + '[data-bstal-banner="on"]';
  const ARS = PRE + ' body #view-arsskodun#view-arsskodun';

  const TOKENS = {
    ui: 'Poppins,system-ui,sans-serif',
    mono: '"JetBrains Mono",ui-monospace,monospace',
    accent: '#ff8a1f',
    accent2: '#ff6702',
    glow: 'rgba(255,103,2,.45)',
    ring: 'rgba(255,138,31,.45)',
    navy: '#071018',
    ink: '#e8f0f8',
    muted: '#8aa3bb',
    glass: 'rgba(8,22,36,.82)',
    grad: 'linear-gradient(180deg,#ff8a1f,#ff6702 55%,#ec5300)',
    rammi: '/img/bstal-v2/rammi.png',
    bordi: '/img/bstal-v2/bordi.png',
    stal: '/img/bstal-v2/stal.jpg'
  };

  let bid = null;

  function forskodun() {
    try {
      const q = new URLSearchParams(location.search).get('bstal');
      if (q === 'v2') return 'v2';
      if (q === 'c' || q === 'v1') return 'c';
    } catch (_) {}
    return null;
  }

  function utgafa() {
    if (bid === 'v2' || bid === 'c') return bid;
    const f = forskodun();
    if (f) return f;
    try {
      const v = window.AppSettings && AppSettings.path && AppSettings.path(LYKILL);
      return v === 'v2' ? 'v2' : 'c';
    } catch (_) { return 'c'; }
  }

  function virk() { return utgafa() === 'v2'; }

  function letur() {
    if (document.getElementById(FONT_ID)) return;
    const l = document.createElement('link');
    l.id = FONT_ID;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
  }

  function merkja(rot, a) {
    if (!rot) return;
    if (a) {
      letur();
      if (rot.getAttribute(ATTR) !== '1') rot.setAttribute(ATTR, '1');
    } else if (rot.hasAttribute(ATTR)) rot.removeAttribute(ATTR);
  }

  function stilla() {
    const a = virk();
    merkja(document.documentElement, a);
    try {
      const f = window.SlokkDevFrame && typeof SlokkDevFrame.iframe === 'function' && SlokkDevFrame.iframe();
      if (f && f.contentDocument && f.contentDocument.documentElement) {
        merkja(f.contentDocument.documentElement, a);
      }
    } catch (_) {}
  }

  function cssText() {
    const ui = TOKENS.ui;
    const mono = TOKENS.mono;
    const H = PRE;
    return [
      H + '{--bstal-accent:' + TOKENS.accent + ';--bstal-accent2:' + TOKENS.accent2 +
        ';--bstal-ring:' + TOKENS.ring + ';--bstal-glow:' + TOKENS.glow +
        ';--bstal-grad:' + TOKENS.grad + ';--bstal-navy:' + TOKENS.navy +
        ';--bstal-ink:' + TOKENS.ink + ';--bstal-muted:' + TOKENS.muted +
        ';--bstal-glass:' + TOKENS.glass +
        ';--bstal-ui:' + ui + ';--bstal-mono:' + mono + '}',

      H + ' body,' + H + ' .view,' + H + ' .topbar,' + H + ' .vnav-btn,' + H + ' #bstal-banner,' +
        H + ' .view button,' + H + ' .view input,' + H + ' .view select,' + H + ' .view textarea,' +
        H + ' .view .btn,' + H + ' .view .fi' +
        '{font-family:' + ui + '!important;color:var(--bstal-ink)}',

      H + ' .kr,' + H + ' .price,' + H + ' .amount,' + H + ' .kt,' + H + ' ._kpi-n,' +
        H + ' #bstal-banner .bb-clock' +
        '{font-family:' + mono + '!important;font-variant-numeric:tabular-nums}',

      H + ' .view,' + H + ' body .view' +
        '{background:url(' + TOKENS.stal + ') center/cover no-repeat,var(--bstal-navy)!important;color:var(--bstal-ink)!important}',
      H + ' .topbar{background:linear-gradient(180deg,#0a1520,var(--bstal-navy))!important;border-right:1px solid rgba(255,138,31,.18)!important;box-shadow:8px 0 40px -12px var(--bstal-glow)!important}',
      H + ' .vnav-btn{color:rgba(232,240,248,.72)!important}',
      H + ' .vnav-btn.active{background:var(--bstal-grad)!important;color:#fff!important;border:1px solid var(--bstal-ring)!important;box-shadow:0 0 18px -4px var(--bstal-glow)!important}',
      H + ' .brand-name{color:#fff!important}',

      H + ' #bstal-banner{height:78px!important;padding:6px!important;border-radius:18px!important;' +
        'background:url(' + TOKENS.rammi + ') center/100% 100% no-repeat!important;box-shadow:0 18px 40px -18px #000,0 0 28px -8px var(--bstal-glow)!important}',
      H + ' #bstal-banner .bb-face{background:url(' + TOKENS.bordi + ') center/cover no-repeat,linear-gradient(180deg,#0c2436,#071018)!important;border-radius:12px!important}',
      H + ' #bstal-banner .bb-bolt{display:none}',
      H + ' #bstal-banner .bb-word{font-family:' + ui + '!important;letter-spacing:.12em}',
      H + ' #bstal-banner .bb-clock{color:#ffb24d!important;text-shadow:0 0 16px var(--bstal-glow)!important}',
      ON + ' .view.active:not(#view-field):not(#view-counter):not(#view-workshop){padding-top:96px!important}',
      ON + ' #view-field.active,' + ON + ' #view-counter.active,' + ON + ' #view-workshop.active{padding-top:100px!important}',
      H + ' #bstal-ember{top:90px!important;opacity:.7}',

      H + ' .view h1{color:#fff!important;font-family:' + ui + '!important;font-weight:800!important;letter-spacing:-.03em;text-shadow:0 2px 18px rgba(0,0,0,.55)!important}',
      H + ' .view ._ars-sub{color:rgba(232,240,248,.62)!important}',

      H + ' .view .card:not(.pos-cart),' + H + ' .view .panel,' + H + ' .view .section-card,' +
        H + ' .view .tcard,' + H + ' .view .tile,' + H + ' .view ._ars-summary,' +
        H + ' .view .thm-stat,' + H + ' .view ._kpi' +
        '{background:var(--bstal-glass)!important;border:1px solid rgba(255,138,31,.16)!important;color:var(--bstal-ink)!important;' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 16px 32px -18px #000!important}',

      H + ' .view .btn-primary,' + H + ' .view .btn-brand,' + H + ' .view #_ars-new' +
        '{background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;' +
        'box-shadow:0 0 16px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.28)!important}',

      H + ' #view-arsskodun ._kpi{border-radius:16px!important}',
      H + ' #view-arsskodun ._kpi-n{font-size:28px!important}',
      H + ' #view-arsskodun .bstal-hero{background:linear-gradient(160deg,#7a3a0c,#3a1c08 58%,#1a0c06)!important;border-color:rgba(255,138,31,.4)!important}',
      H + ' #view-arsskodun ._ars-statusrow,' + H + ' #view-arsskodun ._ars-filterstrip,' +
        H + ' #view-arsskodun ._ars-sjon' +
        '{background:rgba(8,22,36,.78)!important;border-color:rgba(255,255,255,.08)!important;color:var(--bstal-ink)!important}',
      H + ' #view-arsskodun table,' + H + ' #view-arsskodun .dtbl,' + H + ' #view-arsskodun .tcard' +
        '{background:rgba(6,16,26,.9)!important;color:var(--bstal-ink)!important;border-color:rgba(255,138,31,.14)!important}',
      H + ' #view-arsskodun thead th{background:#0a1824!important;color:#c5d4e4!important;border-color:rgba(255,255,255,.08)!important}',
      H + ' #view-arsskodun tbody td,' + H + ' #view-arsskodun tbody th' +
        '{border-color:rgba(255,255,255,.06)!important;color:var(--bstal-ink)!important;background:transparent!important}',
      H + ' #view-arsskodun tbody tr:hover td{background:rgba(255,138,31,.08)!important}',
      H + ' #view-arsskodun #_ars-search,' + H + ' #view-arsskodun #_ars-sort,' +
        H + ' #view-arsskodun #_ars-print,' + H + ' #view-arsskodun ._ars-vm,' +
        H + ' #view-arsskodun input,' + H + ' #view-arsskodun select' +
        '{background:rgba(8,22,36,.9)!important;color:var(--bstal-ink)!important;border-color:rgba(255,255,255,.12)!important}',

      /* 230 setur .view input:not()×3 (4 attr) — auka attr hér vinnur. 240 #_ars-search. */
      H + ' .view input:not([type=checkbox]):not([type=radio]):not([type=color]),' +
        H + ' .view textarea,' + H + ' .view select,' +
        H + ' #_ars-search,' + H + ' #_ars-sort' +
        '{background:rgba(8,22,36,.9)!important;background-image:none!important;color:var(--bstal-ink)!important;' +
        'border:1px solid rgba(255,255,255,.12)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)!important}',
      H + ' .view input[type="text"],' + H + ' .view input[type="search"],' +
        H + ' .view input[type="number"],' + H + ' .view input[type="email"],' +
        H + ' .view input[type="tel"]' +
        '{background:rgba(8,22,36,.9)!important;color:var(--bstal-ink)!important}',
      H + ' .view [class*="-card"]' +
        '{background:var(--bstal-glass)!important;border:1px solid rgba(255,138,31,.16)!important;color:var(--bstal-ink)!important}',

      /* 394: html body #view-arsskodun#view-arsskodun #_ars-search (3 id). */
      ARS + ',' + ARS + '.view' +
        '{background:url(' + TOKENS.stal + ') center/cover no-repeat,var(--bstal-navy)!important;color:var(--bstal-ink)!important}',
      ARS + ' #_ars-search,' + ARS + ' #_ars-sort,' + ARS + ' #_ars-print,' +
        ARS + ' input,' + ARS + ' select,' + ARS + ' textarea' +
        '{background:rgba(8,22,36,.9)!important;background-image:none!important;color:var(--bstal-ink)!important;' +
        'border:1px solid rgba(255,255,255,.12)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)!important}',
      ARS + ' .arsm-seg,' + ARS + ' ._ars-sjon,' + ARS + ' ._ars-filterstrip,' + ARS + ' ._ars-statusrow' +
        '{background:rgba(8,22,36,.78)!important;border-color:rgba(255,255,255,.08)!important;color:var(--bstal-ink)!important}',
      ARS + ' .arsm-seg button,' + ARS + ' ._ars-sjon button' +
        '{background:transparent!important;color:var(--bstal-ink)!important}',
      ARS + ' .arsm-seg button.on,' + ARS + ' ._ars-sjon button.on,' + ARS + ' .arsm-seg button[aria-pressed="true"]' +
        '{background:var(--bstal-grad)!important;color:#fff!important}'
    ].join('\n');
  }

  function styles() {
    let s = document.getElementById(CSS_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = CSS_ID;
    }
    if (s.textContent !== cssText()) s.textContent = cssText();
    if (s.parentNode !== document.head || s !== document.head.lastElementChild) {
      document.head.appendChild(s);
    }
  }

  function teiknaRofa() {
    const p = document.getElementById(PANEL_ID);
    if (!p) return;
    let grp = document.getElementById(GRP_ID);
    if (!grp) {
      grp = document.createElement('div');
      grp.id = GRP_ID;
      grp.className = 'pe-grp';
      grp.style.cssText = 'margin:0 0 12px';
      grp.title = 'C er frosna Brunastál. V2 er dökk navy HUD (gler, appelsína, dökk tafla).';
      grp.innerHTML =
        '<span class="pe-grplbl">Brunastál</span>' +
        '<div class="pe-seg" role="group" aria-label="Útgáfa Brunastáls">' +
          '<button type="button" data-bstal-utg="c">C</button>' +
          '<button type="button" data-bstal-utg="v2">V2</button>' +
        '</div>';
      grp.addEventListener('click', function (e) {
        const b = e.target && e.target.closest && e.target.closest('[data-bstal-utg]');
        if (!b) return;
        e.preventDefault();
        skipta(b.getAttribute('data-bstal-utg'));
      });
    }
    if (p.firstChild !== grp) p.insertBefore(grp, p.firstChild);
    const v2 = virk();
    grp.querySelectorAll('[data-bstal-utg]').forEach(function (b) {
      const on = (b.getAttribute('data-bstal-utg') === 'v2') === v2;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  async function skipta(gildi) {
    const nyt = gildi === 'v2' ? 'v2' : 'c';
    if (utgafa() === nyt && !forskodun()) return true;
    bid = nyt;
    stilla();
    teiknaRofa();
    let ok = false;
    try {
      if (window.AppSettings && AppSettings.save) {
        ok = !!(await AppSettings.save({ [LYKILL]: nyt }));
      }
    } catch (_) {}
    if (ok) bid = null;
    else { bid = null; stilla(); teiknaRofa(); }
    return ok;
  }

  styles();
  stilla();
  teiknaRofa();

  if (window.AppSettings && typeof AppSettings.onChange === 'function') {
    AppSettings.onChange(function () { stilla(); teiknaRofa(); });
  }
  try {
    if (window.AppSettings && typeof AppSettings.load === 'function') {
      AppSettings.load().then(function () { stilla(); teiknaRofa(); }).catch(function () {});
    }
  } catch (_) {}

  let t = null;
  function vaktRofa() {
    if (!document.body) return;
    new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(teiknaRofa, 250);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) vaktRofa();
  else document.addEventListener('DOMContentLoaded', vaktRofa);

  window.BrunastalV2 = { virk, utgafa, stilla, skipta, TOKENS, LYKILL, ATTR };
})();
