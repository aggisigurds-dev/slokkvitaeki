/* === 229-sala-theme-bridge.js — Sala (#view-sala) follows the Útlit theme =====
 *
 * Light-touch "theme pass" for the POS page. Sala (js/pos.js) is older and
 * hardcodes ~320 colours inline with ZERO theme tokens, so picking a theme in
 * Útlit re-skinned the sidebar/shell but not Sala itself.
 *
 * Rather than rewrite pos.js (risky — same hex is reused for panels, white
 * button text AND the print receipt), this maps ONLY the neutral surfaces
 * INSIDE #view-sala to the theme tokens (--thm-bg/-card/-ink/-muted/-line) via
 * inline-style attribute selectors with !important. Accent/status colours
 * (greens, reds, brand orange, the dark action button) keep their hardcoded
 * look on purpose. The print receipt + modals are position:fixed on <body>
 * (outside #view-sala) so they stay white/fixed for printing — untouched.
 *
 * Tokens are always set by patch 220, so in the default light theme Sala looks
 * essentially identical; pick a dark theme and Sala's frame + text follow it,
 * staying readable (bg→--thm-card pairs with text→--thm-ink/-muted).
 *
 * Purely additive + reversible: delete this file + its <script> tag.
 * =========================================================================== */
(() => {
  if (document.getElementById('sala-theme-bridge')) return;
  const S = '#view-sala ';
  const css = [
    // the view's own page background
    '#view-sala{background:var(--thm-bg)!important}',
    // panels / cards (white) → themed surface
    S + '[style*="background:#fff"]{background:var(--thm-card)!important}',
    S + '[style*="background: #fff"]{background:var(--thm-card)!important}',
    // light slate areas → page bg
    S + '[style*="background:#f1f5f9"]{background:var(--thm-bg)!important}',
    S + '[style*="background:#f8fafc"]{background:var(--thm-bg)!important}',
    // primary text
    S + '[style*="color:#0f172a"]{color:var(--thm-ink)!important}',
    S + '[style*="color:#1e293b"]{color:var(--thm-ink)!important}',
    S + '[style*="color:#334155"]{color:var(--thm-ink)!important}',
    S + '[style*="color:#111"]{color:var(--thm-ink)!important}',
    // muted / secondary text
    S + '[style*="color:#475569"]{color:var(--thm-muted)!important}',
    S + '[style*="color:#64748b"]{color:var(--thm-muted)!important}',
    S + '[style*="color:#6b7280"]{color:var(--thm-muted)!important}',
    S + '[style*="color:#666"]{color:var(--thm-muted)!important}',
    S + '[style*="color:#888"]{color:var(--thm-muted)!important}',
    S + '[style*="color:#999"]{color:var(--thm-muted)!important}',
    S + '[style*="color:#94a3b8"]{color:var(--thm-muted)!important}',
    // neutral borders → themed line
    S + '[style*="#cbd5e1"]{border-color:var(--thm-line)!important}',
    S + '[style*="#e2e8f0"]{border-color:var(--thm-line)!important}',
    S + '[style*="solid #ccc"]{border-color:var(--thm-line)!important}',
    S + '[style*="solid #ddd"]{border-color:var(--thm-line)!important}',
    S + '[style*="solid #eee"]{border-color:var(--thm-line)!important}'
  ].join('');
  const st = document.createElement('style');
  st.id = 'sala-theme-bridge';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
  console.log('[patch-229] sala theme bridge installed');
})();
/* === END SALA THEME BRIDGE === */
