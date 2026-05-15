/* === DATE FORMAT UNIFY v1 ===
 *
 * Forces every `toLocaleDateString('is-IS')` (or `'is'`) call without an
 * options object to render as DD/MM/YYYY with slashes.
 *
 * Why this exists:
 *   - On many Windows + Chrome combos, the Icelandic locale falls back to
 *     en-US (M/D/YYYY) because the locale data is missing. So one user sees
 *     "5/15/2026" and another sees "15.5.2026" for the SAME line of code.
 *   - We've already converted the major `fmtDate` helpers to explicit
 *     DD/MM/YYYY, but inline `toLocaleDateString('is-IS')` calls remain
 *     scattered across many files (notes, invoice bodies, sent timestamps,
 *     print-header dates, …). Editing every call site is a lot of churn.
 *
 * What this does:
 *   - Wraps Date.prototype.toLocaleDateString so that when called with
 *     locale 'is' or 'is-IS' (or undefined) AND no options-object as the
 *     second argument, it returns DD/MM/YYYY (e.g. "15/05/2026").
 *   - When the caller passes an options object (e.g.
 *     `{day:'numeric',month:'short',year:'numeric'}` for receipt-style
 *     "15. maí 2026"), we pass through to the original implementation
 *     unchanged. Long-form / short-form / weekday-formatted dates keep
 *     working as before.
 *
 * Safe to load before or after other patches — it only changes the
 * formatting of the no-options call, not anything that explicitly opts
 * into a different style.
 */
(() => {
  if (window.__dateFormatUnifyInstalled) return;
  window.__dateFormatUnifyInstalled = true;

  const isIcelandicLocale = (loc) => {
    if (loc == null) return true; // default locale → still force DD/MM/YYYY
    if (typeof loc === 'string') return /^is(-IS)?$/i.test(loc);
    if (Array.isArray(loc)) return loc.some(l => /^is(-IS)?$/i.test(String(l)));
    return false;
  };

  const ddmmyyyy = (d) => {
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getMonth() + 1).padStart(2, '0') + '/' +
           d.getFullYear();
  };

  const orig = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function (locale, options) {
    // Only intercept the "bare" call (no options). Anything with options
    // (long-form receipts, weekday-only headers, etc.) passes through.
    if (!options && isIcelandicLocale(locale)) {
      return ddmmyyyy(this);
    }
    return orig.call(this, locale, options);
  };

  // Expose a globally-callable helper for new code (cleaner than calling
  // `(new Date(x)).toLocaleDateString('is-IS')` everywhere).
  window.fmtDateIS = function (d) {
    if (!d) return '—';
    const dt = (d instanceof Date) ? d : new Date(d);
    return isNaN(dt) ? '—' : ddmmyyyy(dt);
  };

  console.log('[patch-148] date format unified — toLocaleDateString("is-IS") → DD/MM/YYYY');
})();
/* === END DATE FORMAT UNIFY === */
