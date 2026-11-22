/* === BRUNASTÁL V2 — bakgrunnur á .view (22.11.2026) ===
 *
 * Agnar 22.11: „Ju se bakgrunninn breyttan á einum stað, svo ekki vera að
 * deploya þessu strax." Eitt CSS-atriði: bakgrunnur `.view`. Ekki HUD, ekki
 * letur, ekki spjöld, ekki borði. 220/230/245 FROSIN. Ekkert [deploy].
 *
 * Rofi [C | V2] í Stílstjóra forskoðar. AppSettings brunastal_utgafa.
 * ?bstal=v2 forskoðar án þess að vista. Sjálfgefið er C.
 */
(() => {
  if (window.BrunastalV2) return;

  const LYKILL = 'brunastal_utgafa';
  const ATTR = 'data-bstal-v2';
  const CSS_ID = 'bstal-v2-css';
  const GRP_ID = 'pe-bstal-v2-grp';
  const H = 'html[' + ATTR + '="1"]';

  const TOKENS = {
    navy: '#071018',
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
    return H + ' .view{background:url(' + TOKENS.stal + ') center/cover no-repeat,' + TOKENS.navy + '!important}';
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
      grp.title = 'C er frosna Brunastál. V2 er bara bakgrunnur síðunnar (forskoðun — ekki í loftinu).';
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
