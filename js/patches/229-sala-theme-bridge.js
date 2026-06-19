/* === 229-theme-bridge.js — app-wide theme bridge (content views) ============
 *
 * Makes theme-switching ACTUALLY re-skin the app. The app pre-dates the theme
 * system and hardcodes the same house "slate" palette inline across nearly every
 * page (#fff panels, #f1f5f9 areas, #0f172a/#64748b text, #e2e8f0/#cbd5e1
 * borders…), so patch 220 only re-skinned the few token-based bits — themes felt
 * like "a few buttons here and there".
 *
 * This maps those NEUTRAL house colours → the theme tokens (--thm-bg/-card/-ink/
 * -muted/-line) for everything inside `.view` (the main content pages), via
 * inline-style attribute selectors with !important. So pick a dark theme and the
 * whole content area goes dark, readable (bg→card pairs with text→ink/muted).
 *
 * Deliberately untouched:
 *   • ACCENT / STATUS colours (greens, reds, brand orange, blues) — kept so the
 *     UI still has colour pops on the themed surface.
 *   • The sidebar (`nav.view-nav` — not `.view`) — has its own treatment.
 *   • Modals + the print receipt — position:fixed on <body>, outside `.view`,
 *     so they stay white/fixed (receipt must print white).
 *
 * In the default LIGHT theme the tokens ≈ the originals, so the app looks the
 * same; the difference shows when you pick a darker/other theme. CSS-only,
 * layout-safe (no reflow), fully reversible: delete this file + its <script>.
 * =========================================================================== */
(() => {
  if (document.getElementById('theme-bridge')) return;
  // #view-sala is created/managed by pos.js; make sure it carries `.view` so the
  // scope below reaches it too.
  (function tag(t){ const v=document.getElementById('view-sala'); if(v) v.classList.add('view'); else if((t||0)<40) setTimeout(()=>tag((t||0)+1),300); })(0);

  const V = '.view ';
  const css = [
    // page background of the active content view
    '.view{background:var(--thm-bg)!important}',
    // white panels / cards → themed surface
    V+'[style*="background:#fff"],'+V+'[style*="background: #fff"],'+V+'[style*="background:#ffffff"]{background:var(--thm-card)!important}',
    // light-grey surfaces → page bg
    V+'[style*="background:#f8fafc"],'+V+'[style*="background:#f1f5f9"],'+V+'[style*="background:#f8f9fa"],'+V+'[style*="background:#f9fafb"],'+V+'[style*="background:#f3f4f6"],'+V+'[style*="background:#f5f5f7"],'+V+'[style*="background:#f5f6f7"]{background:var(--thm-bg)!important}',
    // primary text
    V+'[style*="color:#0f172a"],'+V+'[style*="color:#1e293b"],'+V+'[style*="color:#111827"],'+V+'[style*="color:#1a1a1f"],'+V+'[style*="color:#16181d"],'+V+'[style*="color:#111"],'+V+'[style*="color:#334155"]{color:var(--thm-ink)!important}',
    // muted / secondary text
    V+'[style*="color:#475569"],'+V+'[style*="color:#64748b"],'+V+'[style*="color:#6b7280"],'+V+'[style*="color:#9ca3af"],'+V+'[style*="color:#94a3b8"],'+V+'[style*="color:#666"],'+V+'[style*="color:#888"],'+V+'[style*="color:#999"]{color:var(--thm-muted)!important}',
    // neutral borders → themed line
    V+'[style*="#e2e8f0"],'+V+'[style*="#cbd5e1"],'+V+'[style*="#e5e7eb"],'+V+'[style*="#e6eaf0"],'+V+'[style*="#eef2f7"],'+V+'[style*="solid #ccc"],'+V+'[style*="solid #ddd"],'+V+'[style*="solid #eee"]{border-color:var(--thm-line)!important}'
  ].join('');
  const st = document.createElement('style');
  st.id = 'theme-bridge';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
  console.log('[patch-229] app-wide theme bridge installed');
})();
/* === END THEME BRIDGE === */
