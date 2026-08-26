/* === COLOR SCHEME LIGHT (Chrome Android Force Dark) =========================
 * Agnar cannot change Chrome Android Theme / Force Dark Pages. Blink inverts
 * unspecified form-control colours unless the page opts out with
 * `color-scheme: only light` — plain `light` is still force-darkened
 * (chromium ForceDark: 'light' → invert, 'only light' → leave alone).
 *
 * Head meta + app.css cover first paint. This patch is the coherent place
 * for native-widget colours: theme tokens (--surface / --ink1 / --ink4 /
 * --brd / --brand), not a generic white body or #0066cc links.
 *
 * Does NOT: restyle `a`, Ársskoðun `._yr`, body/sidebar fills, navy buttons.
 * Frozen theme-scoped.css is not edited. Patch 313 still owns steel-title
 * ink; this sheet does not !important text colour.
 * Invoice OUT / kennitala / Payday paths are untouched.
 * ========================================================================== */
(() => {
  if (window.__colorSchemeLightInstalled) return;
  window.__colorSchemeLightInstalled = true;

  const STYLE_ID = 'color-scheme-light-css';

  /* Text fields only — skip UA buttons/checks and intentional dark fields.
     #_bks-overlay date inputs keep color-scheme:dark (more specific, no
     !important here). */
  const FIELD =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="range"])' +
    ':not([type="file"]):not([type="hidden"]):not([type="image"])' +
    ':not([type="color"]):not([type="button"]):not([type="submit"])' +
    ':not([type="reset"]):not(.field-dark):not(.darkfield),' +
    'textarea:not(.field-dark):not(.darkfield),' +
    'select:not(.field-dark):not(.darkfield)';

  const AUTO =
    'input:not(.field-dark):not(.darkfield):-webkit-autofill,' +
    'input:not(.field-dark):not(.darkfield):-webkit-autofill:hover,' +
    'input:not(.field-dark):not(.darkfield):-webkit-autofill:focus,' +
    'textarea:not(.field-dark):not(.darkfield):-webkit-autofill,' +
    'textarea:not(.field-dark):not(.darkfield):-webkit-autofill:hover,' +
    'textarea:not(.field-dark):not(.darkfield):-webkit-autofill:focus,' +
    'select:not(.field-dark):not(.darkfield):-webkit-autofill,' +
    'select:not(.field-dark):not(.darkfield):-webkit-autofill:hover,' +
    'select:not(.field-dark):not(.darkfield):-webkit-autofill:focus';

  const css = [
    /* Opt out of Chrome Auto Dark / Force Dark Pages. `only` is required. */
    'html{color-scheme:light}',
    'html,body{color-scheme:only light!important}',
    ':root{color-scheme:only light}',

    /* Native widgets follow the page scheme (light scrollbars, pickers). */
    'input,textarea,select,button{color-scheme:only light}',

    /* Explicit colours so Android Chrome does not substitute dark UA widgets.
       No !important — .fi, .field-dark, overlay and brand buttons still win. */
    FIELD + '{background-color:var(--surface,#ffffff);color:var(--ink1,#0f1117);border-color:var(--brd,#e4e6ea)}',

    'input::placeholder,textarea::placeholder,select::placeholder' +
      '{color:var(--ink4,#626b7a);opacity:1}',

    'input[type="checkbox"],input[type="radio"]' +
      '{color-scheme:only light;accent-color:var(--brand,#C93C1D)}',

    /* Autofill: stop Chrome's dark-yellow / black flash. */
    AUTO +
      '{-webkit-text-fill-color:var(--ink1,#0f1117)!important;' +
      'caret-color:var(--ink1,#0f1117);' +
      'color:var(--ink1,#0f1117)!important;' +
      'background-color:var(--surface,#ffffff)!important;' +
      'background-image:none!important;' +
      '-webkit-box-shadow:0 0 0 1000px var(--surface,#ffffff) inset!important;' +
      'box-shadow:0 0 0 1000px var(--surface,#ffffff) inset!important;' +
      'transition:background-color 99999s ease-out}',

    /* Phone in dark theme: do not supply a dark palette Chrome can invert
       into grey-on-grey. Stay light; 313 still inks steel titles. */
    '@media (prefers-color-scheme:dark){' +
      'html{color-scheme:light}' +
      'html,body{color-scheme:only light!important}' +
      'input,textarea,select,button{color-scheme:only light}' +
      FIELD + '{background-color:var(--surface,#ffffff);color:var(--ink1,#0f1117)}' +
    '}'
  ].join('');

  function inject() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css;
    if (s.parentNode) s.parentNode.appendChild(s);
  }

  inject();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  }
  [400, 1200].forEach(ms => setTimeout(inject, ms));

  window.ColorSchemeLight = { rescan: inject };
  console.log('[patch-318] color-scheme only light installed');
})();
/* === END COLOR SCHEME LIGHT === */
