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

  // 18.09.2026 (Agnar: "Allar dagsetningar eiga ad vera DD/MM en ekki manudurinn a undan"):
  // calls WITH an options object passed through untouched, so on machines without the
  // Icelandic locale data { day:'2-digit', month:'2-digit', hour:... } fell back to en-US
  // -> "09/18, 04:15 PM". When the options are purely numeric (no month/weekday text) we
  // now format with en-GB, which every browser ships: day first, slashes, 24h clock.
  // Time zone and the other options are preserved. Text formats ("17. september 2026")
  // still pass through unchanged. Sister file: brunaholf/js/dags-snid.js.
  const TEXT = { long: 1, short: 1, narrow: 1 };
  const numericOnly = (o) => !!o && typeof o === 'object'
    && !TEXT[o.month] && !o.weekday && !o.era && !o.timeZoneName && !o.dayPeriod
    && !(o.dateStyle && o.dateStyle !== 'short') && !(o.timeStyle && o.timeStyle !== 'short' && o.timeStyle !== 'medium');


  // 18.09.2026: LANGFORM á vélum án íslenskrar staðfærslu. Þar skilaði
  // toLocaleDateString('is-IS', {day:'numeric', month:'long', year:'numeric'}) „September 18, 2026".
  // Styðji vafrinn ekki is-IS smíðum við textann sjálf: „föstudagur, 18. september 2026 kl. 16:15".
  // Vafrar MEÐ is-IS fara áfram sína leið (útkoman er sú sama).
  const hasIs = (() => { try { return Intl.DateTimeFormat.supportedLocalesOf('is-IS').length > 0; } catch (_) { return true; } })();
  const MONTHS_IS = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const WEEKDAYS_IS = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'];
  const longIs = (d, o, medTima) => {
    if (isNaN(d)) return '';
    // tímabelti: Ísland = UTC allt árið; „UTC"/„Atlantic/Reykjavik" lesa því UTC-reitina.
    const utc = o.timeZone && /^(utc|atlantic\/reykjavik)$/i.test(String(o.timeZone));
    const g = (l, u) => (utc ? d[u]() : d[l]());
    const tvo = (n) => String(n).padStart(2, '0');
    let s = '';
    if (o.weekday) { const w = WEEKDAYS_IS[g('getDay', 'getUTCDay')]; s += (o.weekday === 'long' ? w : w.slice(0, 3) + '.') + (o.day || o.month || o.year ? ', ' : ''); }
    if (o.day) s += g('getDate', 'getUTCDate') + '. ';
    if (o.month) { const m = MONTHS_IS[g('getMonth', 'getUTCMonth')]; s += (o.month === 'long' ? m : o.month === 'short' ? m.slice(0, 3) + '.' : m[0].toUpperCase()); }
    if (o.year) s += ' ' + (o.year === '2-digit' ? String(g('getFullYear', 'getUTCFullYear')).slice(2) : g('getFullYear', 'getUTCFullYear'));
    if (medTima && (o.hour || o.minute)) s += ' kl. ' + tvo(g('getHours', 'getUTCHours')) + ':' + tvo(g('getMinutes', 'getUTCMinutes')) + (o.second ? ':' + tvo(g('getSeconds', 'getUTCSeconds')) : '');
    return s.trim();
  };
  const textFormat = (o) => !!o && typeof o === 'object' && !o.dateStyle && !o.timeStyle && !o.era && !o.timeZoneName
    && (o.month === 'long' || o.month === 'short' || o.month === 'narrow' || !!o.weekday)
    && (!o.timeZone || /^(utc|atlantic\/reykjavik)$/i.test(String(o.timeZone)));

  const orig = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function (locale, options) {
    // Only intercept the "bare" call (no options). Anything with options
    // (long-form receipts, weekday-only headers, etc.) passes through.
    if (!options && isIcelandicLocale(locale)) {
      return ddmmyyyy(this);
    }
    if (isIcelandicLocale(locale) && numericOnly(options)) return orig.call(this, 'en-GB', options);
    if (!hasIs && isIcelandicLocale(locale) && textFormat(options)) return longIs(this, options, false);
    return orig.call(this, locale, options);
  };

  // 17.09.2026 — same rule for the date+time call. `toLocaleString('is-IS')` was
  // never intercepted, so a timestamp rendered "9.3.2026, 14:05" (or the en-US
  // fallback "3/9/2026, 2:05 PM") right next to a date this patch had already
  // turned into "09/03/2026". One format everywhere means both go through here.
  const origBoth = Date.prototype.toLocaleString;
  Date.prototype.toLocaleString = function (locale, options) {
    if (!options && isIcelandicLocale(locale)) {
      if (isNaN(this)) return '';
      return ddmmyyyy(this) + ', ' + String(this.getHours()).padStart(2, '0')
             + ':' + String(this.getMinutes()).padStart(2, '0');
    }
    if (isIcelandicLocale(locale) && numericOnly(options)) return origBoth.call(this, 'en-GB', options);
    if (!hasIs && isIcelandicLocale(locale) && textFormat(options)) return longIs(this, options, true);
    return origBoth.call(this, locale, options);
  };

  // Clock: always 24h (never "04:15 PM").
  const origTime = Date.prototype.toLocaleTimeString;
  Date.prototype.toLocaleTimeString = function (locale, options) {
    if (isIcelandicLocale(locale) && (!options || numericOnly(options))) return origTime.call(this, 'en-GB', options);
    return origTime.call(this, locale, options);
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
