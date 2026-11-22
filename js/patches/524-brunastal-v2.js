/* === BRUNASTÁL V2 — yfirlag ofan á frosna C (22.11.2026) ===
 *
 * Agnar: „Er ad reyna gera brunastal v2 en gengur illa ad fa retta utlitid".
 *
 * Sama uppskrift og Brunahólf V2 (507): nafngreint yfirlag, krókar óbreyttir.
 * 220/230/245 eru FROSIN. V2 kveikir aðeins undir html[data-bstal-v2="1"].
 *
 * Rétt útlit = mockups/brunastal.html (Space Grotesk / Sora / Space Mono +
 * rauður málmgradient + stálplata + 4 hnoð). 230 lóðar letrið en setur
 * IBM Plex ofan á (leturlögn). 245 þvingar Plex með !important. ChatGPT-V2
 * sem endurskrifar HTML missir málminn í 325 pappa. Þetta lag leiðréttir
 * leturlögnina og setur plötuna á spjöld — endurskrifar ekkert DOM.
 *
 * Rofi [C | V2] í Stílstjóra. AppSettings brunastal_utgafa = 'c' | 'v2'
 * (eitt val, allar vélar — regla 15.10). ?bstal=v2 forskoðar án vistunar.
 *
 * Tókenar: css/theme-handoff/brunastal-v2.tokens.json
 */
(() => {
  if (window.BrunastalV2) return;

  const LYKILL = 'brunastal_utgafa';
  const ATTR = 'data-bstal-v2';
  const CSS_ID = 'bstal-v2-css';
  const GRP_ID = 'pe-bstal-v2-grp';
  const H = 'html[' + ATTR + '="1"]';

  const TOKENS = {
    ui: '"Space Grotesk",system-ui,sans-serif',
    word: '"Sora",sans-serif',
    display: '"Playfair Display",Georgia,serif',
    mono: '"Space Mono",ui-monospace,monospace',
    accent: '#c92a2a',
    accent2: '#f0584c',
    glow: 'rgba(160,16,16,.55)',
    ring: 'rgba(190,32,28,.55)',
    plate: '#eef1f6',
    grad: 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)',
    page: 'linear-gradient(180deg,#060607 0px,#060607 95px,#aeb4be 360px,#9ba1ad 100%)',
    plateImg: 'linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px)',
    metal: 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)'
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

  function merkja(rot, a) {
    if (!rot) return;
    if (a) {
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
    const disp = TOKENS.display;
    const word = TOKENS.word;
    return [
      H + '{--bstal-accent:' + TOKENS.accent + ';--bstal-accent2:' + TOKENS.accent2 +
        ';--bstal-ring:' + TOKENS.ring + ';--bstal-glow:' + TOKENS.glow +
        ';--bstal-grad:' + TOKENS.grad + ';--bstal-plate:' + TOKENS.plate +
        ';--bstal-plate-img:' + TOKENS.plateImg +
        ';--bstal-ui:' + ui + ';--bstal-mono:' + mono + ';--bstal-disp:' + disp + '}',

      /* Leturlögnin: Space Grotesk slær IBM Plex (230 án !important, 245 með). */
      H + ' body,' + H + ' .view,' + H + ' .topbar,' + H + ' .vnav-btn,' + H + ' #bstal-banner,' +
        H + ' .view button,' + H + ' .view input,' + H + ' .view select,' + H + ' .view textarea,' +
        H + ' .view .btn,' + H + ' .view .fi,' + H + ' .view .stat-label,' + H + ' .view .kpi-label,' +
        H + ' .view .stat .label,' + H + ' .view .kpi .label,' +
        H + ' .view .btn:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-brand):not(.btn-ghost)' +
        '{font-family:' + ui + '!important}',

      H + ' .view input[type="text"],' + H + ' .view input[type="search"],' +
        H + ' .view input[type="number"],' + H + ' .view input[type="email"],' +
        H + ' .view input[type="tel"],' + H + ' .view input[type="date"],' +
        H + ' .view input[type="password"]' +
        '{font-family:' + ui + '!important}',

      H + ' #bstal-banner .bb-word{font-family:' + word + '!important}',

      H + ' .view h1,' + H + ' .view > .main-panel > h1:first-child,' +
        H + ' .view > h1:first-child,' + H + ' .view > .main-panel > div > h1:first-child,' +
        H + ' .modal .modal-hd h2,' + H + ' .modal-hd h2' +
        '{font-family:' + disp + '!important;letter-spacing:-.02em}',

      /* Tölur: Space Mono eins og mockupið (230 lofaði, 245 setti JetBrains). */
      H + ' .kr,' + H + ' .price,' + H + ' .amount,' + H + ' .kt,' + H + ' .kennitala,' +
        H + ' .date,' + H + ' .dags,' + H + ' .mono,' + H + ' .num,' + H + ' .numeric,' +
        H + ' .tnum,' + H + ' .stat-value,' + H + ' .kpi-value,' + H + ' .stat .value,' +
        H + ' .kpi .value,' + H + ' #bstal-banner .bb-clock,' + H + ' #bstal-banner .bb-date,' +
        H + ' .view-nav .vnav-btn .sb-badge,' + H + ' .view-nav .vnav-btn .badge,' +
        H + ' .view-nav .vnav-btn .count' +
        '{font-family:' + mono + '!important;font-variant-numeric:tabular-nums}',

      /* Stálplata á spjöldum — 245 hvítar þau flöt. Dökkar körfur ósnertar. */
      H + ' .view .card:not(.pos-cart),' + H + ' .view .panel,' + H + ' .view .section-card,' +
        H + ' .view .surface,' + H + ' .view .box-card,' + H + ' .view .info-card,' +
        H + ' .view .data-card,' + H + ' .view .tcard,' + H + ' .view .tile' +
        '{background:var(--bstal-plate-img),var(--bstal-plate)!important}',

      /* Hnoðin í borðanum: mockup 13 px, 230 er 12. */
      H + ' #bstal-banner .bb-bolt{width:13px;height:13px}',

      /* CTA sem 245 málar svart málm fá rauða accent-hallann úr mockupinu. */
      H + ' .view .btn-primary,' + H + ' .view .btn-brand' +
        '{background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;' +
        'box-shadow:0 0 16px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.16)!important}'
    ].join('\n');
  }

  function styles() {
    let s = document.getElementById(CSS_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = CSS_ID;
      document.head.appendChild(s);
    }
    if (s.textContent !== cssText()) s.textContent = cssText();
  }

  function teiknaRofa() {
    const bar = document.querySelector('.pe-toolbar');
    if (!bar) return;
    let grp = document.getElementById(GRP_ID);
    if (!grp) {
      grp = document.createElement('div');
      grp.id = GRP_ID;
      grp.className = 'pe-grp';
      grp.title = 'C er frosna Brunastál. V2 er yfirlag: Space Grotesk, Sora, Space Mono og stálplata úr mockupinu. Krókarnir óbreyttir.';
      grp.innerHTML =
        '<span class="pe-grplbl">Brunastál</span>' +
        '<div class="pe-seg" role="group" aria-label="Útgáfa Brunastáls">' +
          '<button type="button" data-bstal-utg="c">C</button>' +
          '<button type="button" data-bstal-utg="v2">V2</button>' +
        '</div>';
      bar.appendChild(grp);
      grp.addEventListener('click', function (e) {
        const b = e.target && e.target.closest && e.target.closest('[data-bstal-utg]');
        if (!b) return;
        e.preventDefault();
        skipta(b.getAttribute('data-bstal-utg'));
      });
    }
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
