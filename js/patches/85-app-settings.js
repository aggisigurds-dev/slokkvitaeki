/* === APP SETTINGS v1 ===
 *
 * Loads app-wide config from the `app_settings` Supabase table on boot, caches
 * it on window.AppSettings, and applies the parts that are visible from the
 * very first frame (banner text, logo, primary color).
 *
 * Other patches read settings via:
 *   const s = window.AppSettings.get();           // whole object
 *   const co = window.AppSettings.get('branding'); // section
 *   const phone = window.AppSettings.path('branding.phone'); // dotted path
 *
 * Saving is via Settings UI (patch 86) which calls AppSettings.save(patch).
 *
 * Schema lives in sql/app_settings.sql — run that file once in Supabase before
 * this patch is useful. Until the table exists, patch falls back to DEFAULTS
 * so the app keeps working.
 */
(() => {
  if (window.__appSettingsInstalled) return;
  window.__appSettingsInstalled = true;

  const DEFAULTS = {
    branding: {
      // company_name = LEGAL entity name. Used on invoices, reports, signatures, VAT.
      // For the visual logo/banner identity, use banner_text (drops the "ehf").
      company_name: 'Slökkvitæki ehf',
      tagline: 'Brunahólf',
      kennitala: '600508-0400',
      vsk_nr: '98107',
      address1: 'Helluhrauni 10',
      address2: '220 Hafnarfirði',
      phone: '565-4080',
      email: 'eldklar@eldklar.is',
      logo_url: '/img/logo.png',
      primary_color: '#C93C1D',
      banner_text: 'Slökkvitæki',
      banner_subtitle: 'Slökkvitækjaþjónusta',
      banner_style: 'litrikt',
      banner_image_url: '/img/banner-1x.png',
      banner_image_2x_url: '/img/banner-2x.png',
      banner_image_mobile_url: '/img/banner-mobile.png'
    },
    sala: {
      sort_order: 'alphabetical',
      pinned_product_ids: [],
      hidden_product_ids: [],
      show_aux_categories: true,
      position_orders: {},           // { "<product_id>": <position_number>, ... } — manual line-up
      deleted_product_names: []      // names the user explicitly deleted; re-seed patches must skip these
    },
    shortcuts: [
      { label: 'ABC duft hleðsla 6kg', price: 5200, icon: '🔥' },
      { label: 'Yfirferð',             price: 4200, icon: '✓' },
      { label: 'CO2 hleðsla 5kg',      price: 5300, icon: '💨' },
      { label: 'Akstur',               price: 3500, icon: '🚚' }
    ],
    prentun: {
      default_print_kvittun: false,
      default_print_strikamerki: true,
      // 2026-05-19: re-enabled QR-miði 24x100 default. Aggi confirmed the
      // post-sale QR-label dialog (with calibration test print) should
      // still open after each sale. The 2026-05-18 disable was for the
      // *green* test-button (patch 84) only — got conflated with this.
      default_print_qr_label: true,
      // 2026-05-18: skip the "Skrá tæki fyrir verkbeiðni" prompt by default.
      // Read by patch 106; re-enable in Stillingar -> Prentun if needed.
      skip_unit_prompt: true,
      label_size: '54x17',
      dpi_compensation: 2
    },
    almennt: {
      default_vsk_pct: 24,
      default_due_days: 10,
      default_pickup_offset_days: 7,
      date_format: 'dd.mm.yyyy',
      time_format: '24h',
      currency: 'kr',
      starting_view: 'sala'
    },
    utlit: {
      hidden_nav_views: [],          // list of view names to hide from sidebar (e.g., ['birgdir','akstur'])
      sidebar_default_collapsed: false,
      compact_mode: false             // tighter spacing across the app
    },
    starfsmenn: [],                  // [{name, initials, color}, ...] — list of staff who appear on receipts
    kvittun: {
      footer_text: 'Takk fyrir viðskiptin!',
      reikningur_message: 'Greiðsla óskast innan 10 daga. Vinsamlegast tilgreinið reikningsnúmer við greiðslu.',
      show_logo: true,
      show_qr_for_pay: false           // future — QR for payment link
    },
    tilkynningar: {
      ogreitt_after_days: 14,         // alert when invoice unpaid for X days
      taeki_skodun_days_warn: 30,     // warn X days before next_insp
      taeki_skodun_days_overdue: 0,   // immediate red alert when overdue
      sala_card_lokid_warn: true,
      enable_sounds: false
    },
    email: {
      from_name: 'Slökkvitæki ehf',
      from_email: 'eldklar@eldklar.is',
      reply_to: '',
      reikningur_subject: 'Reikningur frá Slökkvitæki ehf — {invoiceNum}',
      reikningur_body: 'Sæl/sæll {customerName},\n\nMeðfylgjandi er reikningur {invoiceNum} að upphæð {amount}.\n\nGreiðslukröfur birtast í heimabankanum þínum innan örfárra daga.\n\nKveðja,\n{companyName}',
      reminder_subject: 'Áminning — reikningur {invoiceNum} ógreidd',
      reminder_body: 'Sæl/sæll {customerName},\n\nReikningur {invoiceNum} að upphæð {amount} er enn ógreiddur.\n\nVinsamlegast greiðið við fyrsta tækifæri.\n\nKveðja,\n{companyName}',
      signature: 'Slökkvitæki ehf · 565-4080 · eldklar@eldklar.is'
    },
    backup: {
      auto_export_enabled: false,
      last_export_at: null,
      include_attachments: false
    },
    tenglar: {
      google_sheet_url: '',
      google_drive_url: '',
      custom_links: []                 // [{label, url, icon}, ...] — extra side-nav links
    },
    dashboard: {
      hidden_widgets: []                // names of widgets to hide on dashboard
    }
  };

  // 2026-05-09: localStorage cache to eliminate banner/topbar flicker on
  // page load. Without this, the page renders with DEFAULTS for ~300-500ms
  // (until Supabase fetch completes), then visibly re-renders with the
  // user's banner image / company colors. With cache: initial paint uses
  // last-known-good settings → no flicker on repeat visits. Fresh DB load
  // still happens after; if it differs, that's one re-render — but only
  // when settings actually changed, not every visit.
  const CACHE_KEY = 'slokk_app_settings_v1';
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || !o.s || typeof o.s !== 'object') return null;
      // Drop cache older than 30 days — defensive against stale schemas.
      if (o.at && (Date.now() - o.at) > 30 * 86400000) return null;
      return o.s;
    } catch (_) { return null; }
  }
  function writeCache(s) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ s, at: Date.now() })); } catch (_) {}
  }
  function clearCache() { try { localStorage.removeItem(CACHE_KEY); } catch (_) {} }

  let _settings = JSON.parse(JSON.stringify(DEFAULTS));
  // Hydrate from cache synchronously so the very first paint can use real
  // settings instead of defaults. deepMerge ensures any new keys added to
  // DEFAULTS since the cache was written still get filled in.
  const _cached = readCache();
  if (_cached) {
    _settings = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), _cached);
  }
  let _loaded = false;
  const _listeners = [];

  function deepMerge(target, src) {
    if (!src || typeof src !== 'object') return target;
    for (const key of Object.keys(src)) {
      if (src[key] && typeof src[key] === 'object' && !Array.isArray(src[key])) {
        target[key] = deepMerge(target[key] || {}, src[key]);
      } else {
        target[key] = src[key];
      }
    }
    return target;
  }

  function get(section) {
    if (!section) return _settings;
    return _settings[section];
  }

  function path(dotted) {
    return String(dotted).split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), _settings);
  }

  function notify() {
    for (const fn of _listeners) {
      try { fn(_settings); } catch (e) { console.warn('[app-settings] listener error:', e); }
    }
  }

  function onChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  async function load() {
    if (!window.DB || !window.DB.sb) {
      console.warn('[app-settings] DB not ready; using defaults');
      _loaded = true;
      notify();
      return _settings;
    }
    try {
      const r = await window.DB.sb.from('app_settings').select('settings').eq('id', 1).maybeSingle();
      if (r.error) {
        // Table missing or RLS denied — fall back silently.
        console.warn('[app-settings] load skipped:', r.error.message);
      } else if (r.data && r.data.settings) {
        _settings = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), r.data.settings);
        // Cache the freshly-loaded settings so the next page load can paint
        // with real values immediately instead of defaults.
        writeCache(r.data.settings);
      }
    } catch (e) {
      console.warn('[app-settings] load exception:', e);
    }
    _loaded = true;
    notify();
    return _settings;
  }

  async function save(patch) {
    if (!patch || typeof patch !== 'object') return false;
    const next = deepMerge(JSON.parse(JSON.stringify(_settings)), patch);
    if (!window.DB || !window.DB.sb) {
      _settings = next;
      notify();
      return false;
    }
    try {
      const r = await window.DB.sb
        .from('app_settings')
        .upsert({ id: 1, settings: next, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (r.error) {
        console.warn('[app-settings] save error:', r.error.message);
        return false;
      }
      _settings = next;
      // Update cache so the next page load reflects the change immediately.
      writeCache(next);
      notify();
      return true;
    } catch (e) {
      console.warn('[app-settings] save exception:', e);
      return false;
    }
  }

  // ── Format helpers driven by Stillingar → Almennt ────────────────────────
  function fmtPrice(n, opts) {
    const a = (_settings && _settings.almennt) || {};
    const cur = (a.currency || 'kr').trim();
    const v = Math.round(Number(n) || 0);
    const formatted = v.toLocaleString('is-IS').replace(/,/g, '.');
    if (opts && opts.symbolBefore) return cur + ' ' + formatted;
    return formatted + ' ' + cur;
  }
  function fmtDate(iso, opts) {
    if (!iso) return '';
    const d = (iso instanceof Date) ? iso : new Date(iso);
    if (isNaN(d)) return '';
    const a = (_settings && _settings.almennt) || {};
    const fmt = a.date_format || 'dd.mm.yyyy';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (fmt === 'yyyy-mm-dd') return yyyy + '-' + mm + '-' + dd;
    if (fmt === 'dd/mm/yyyy') return dd + '/' + mm + '/' + yyyy;
    return dd + '.' + mm + '.' + yyyy; // default: dd.mm.yyyy
  }

  window.AppSettings = {
    get, path, save, load, onChange,
    fmtPrice, fmtDate,
    defaults: DEFAULTS,
    isLoaded: () => _loaded,
    version: 'v2'
  };

  // Apply branding to the topbar/banner as soon as DOM is ready, even before
  // load() returns — uses defaults until DB hydrates, then re-applies.
  function applyBranding(s) {
    const b = (s && s.branding) || _settings.branding;
    document.documentElement.style.setProperty('--app-primary', b.primary_color || '#C93C1D');
    // Banner text in topbar
    const titles = document.querySelectorAll('[data-banner-title]');
    titles.forEach(el => { el.textContent = b.banner_text || b.company_name || ''; });
    const subs = document.querySelectorAll('[data-banner-subtitle]');
    subs.forEach(el => { el.textContent = b.banner_subtitle || ''; });
    // Document title
    if (b.company_name) document.title = b.company_name;
    // Refresh the Sala banner so banner_style takes effect live.
    if (window.POS && typeof window.POS.refreshBanner === 'function') {
      try { window.POS.refreshBanner(); } catch (e) { /* ignore */ }
    }
  }
  onChange(applyBranding);

  // Wait for DB.sb to exist, then load. Poll cheaply.
  function waitAndLoad(tries) {
    if (window.DB && window.DB.sb) { load(); return; }
    if ((tries || 0) > 50) { _loaded = true; notify(); return; }
    setTimeout(() => waitAndLoad((tries || 0) + 1), 200);
  }
  waitAndLoad();

  // Initial paint with defaults so nothing flashes.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyBranding());
  } else {
    applyBranding();
  }

  console.log('[app-settings] installed');
})();
/* === END APP SETTINGS v1 === */
