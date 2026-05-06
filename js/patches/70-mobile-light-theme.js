/* === MOBILE LIGHT THEME v1 ===
 *
 * On screens ≤900px (the mobile breakpoint that collapses the sidebar to
 * 60px), flip the sidebar colour scheme from dark navy to light/white so
 * it matches the rest of the app's light surfaces.
 *
 * Implemented as a single high-specificity stylesheet appended to <head>
 * so it overrides everything in app.css (which has many hardcoded
 * `color: white` / `rgba(255,255,255,.X)` rules in the sidebar).
 */
(() => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('mobile-light-theme-style')) return;

  const css = `
    @media (max-width: 900px) {
      /* ── Override the CSS custom properties that drive the sidebar ── */
      :root {
        --sidebar-bg: #ffffff !important;
        --sidebar-hover: #f1f5f9 !important;
        --sidebar-active: rgba(201,60,29,.10) !important;
        --sidebar-active-border: #C93C1D !important;
        --sidebar-text: #475569 !important;
        --sidebar-text-active: #0f172a !important;
        --sidebar-icon: #94a3b8 !important;
      }

      /* ── Sidebar container + brand ────────────────────────────────── */
      nav.view-nav, .view-nav, .topbar {
        background: #ffffff !important;
        color: #0f172a !important;
        border-right: 1px solid #e2e8f0 !important;
        box-shadow: 1px 0 4px rgba(15,23,42,0.04) !important;
      }
      .brand {
        background: #ffffff !important;
      }
      .brand-name {
        color: #0f172a !important;
      }
      .brand-sub, .brand-text {
        color: #64748b !important;
      }
      .brand-logo {
        background: #C93C1D !important;
      }
      .brand-logo svg { stroke: #ffffff !important; }

      /* ── Nav buttons ──────────────────────────────────────────────── */
      .vnav-btn {
        color: #475569 !important;
        background: transparent !important;
      }
      .vnav-btn:hover {
        background: #f1f5f9 !important;
        color: #0f172a !important;
      }
      .vnav-btn:hover svg { opacity: 1 !important; }
      .vnav-btn.active {
        background: rgba(201,60,29,0.10) !important;
        color: #C93C1D !important;
      }
      .vnav-btn.active svg { color: #C93C1D !important; opacity: 1 !important; }
      .vnav-btn svg {
        color: #94a3b8 !important;
      }

      /* ── Section labels & dividers ───────────────────────────────── */
      .nav-section-label {
        color: #94a3b8 !important;
      }
      .nav-sep, .nav-sep.nav-sep-group {
        background: #e2e8f0 !important;
      }

      /* ── User chip at bottom ─────────────────────────────────────── */
      .user-chip {
        background: #f8fafc !important;
        color: #0f172a !important;
        border: 1px solid #e2e8f0 !important;
      }
      .user-chip:hover { background: #f1f5f9 !important; }
      .user-chip > span:not(.ua-role-badge) {
        color: #0f172a !important;
      }
      .user-avatar, .user-initials {
        background: #C93C1D !important;
        color: #ffffff !important;
      }
      .ua-logout-btn {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #475569 !important;
      }
      .ua-logout-btn:hover {
        background: #f1f5f9 !important;
        color: #0f172a !important;
      }

      /* ── Online status chip ──────────────────────────────────────── */
      .online-chip {
        color: #475569 !important;
      }
      .sync-dot {
        background: #16a34a !important;
        box-shadow: 0 0 0 2px rgba(22,163,74,0.18) !important;
      }

      /* ── Full content area: force every view to render with a light
            background and dark text on mobile, regardless of any dark-
            themed legacy CSS. */
      html, body {
        background: #f5f5f7 !important;
        color: #0f172a !important;
      }
      [id^="view-"] {
        background: #ffffff !important;
        color: #0f172a !important;
      }
      [id^="view-"] .main-panel,
      [id^="view-"] main {
        background: transparent !important;
        color: #0f172a !important;
      }

      /* ── Reikningar modal (legacy) is hardcoded dark in 00-legacy.js.
            Force it to a light theme on mobile. */
      #reik-master-modal > div {
        background: #ffffff !important;
        color: #0f172a !important;
      }
      #reik-master-modal h2,
      #reik-master-modal th {
        color: #0f172a !important;
      }
      #reik-master-modal table {
        background: #ffffff !important;
      }
      #reik-master-modal tr {
        border-bottom: 1px solid #e2e8f0 !important;
      }
      #reik-master-modal tbody td {
        color: #0f172a !important;
      }

      /* ── Tenglar (qlinks) section ────────────────────────────────── */
      .qlinks-section {
        background: #ffffff !important;
        color: #0f172a !important;
      }
      .qlinks-section a {
        color: #475569 !important;
      }
      .qlinks-section a:hover {
        background: #f1f5f9 !important;
        color: #0f172a !important;
      }

      /* ── Badges (counters next to nav buttons) ───────────────────── */
      .vnav-badge, .vnav-btn .badge {
        background: #C93C1D !important;
        color: #ffffff !important;
      }

      /* ── Search trigger ("🔍 Leita... ⌘K") — was spilling out the
            collapsed sidebar. Shrink it to an icon-only button at 60px max. */
      #gs-trigger {
        background: #f1f5f9 !important;
        border: 1px solid #cbd5e1 !important;
        color: #475569 !important;
        padding: 6px !important;
        margin: 4px auto !important;
        max-width: 44px !important;
        max-height: 36px !important;
        font-size: 14px !important;
        gap: 0 !important;
        justify-content: center !important;
        overflow: hidden !important;
      }
      #gs-trigger kbd { display: none !important; }

      /* ── Language toggle (EN/IS) — keep tight so it doesn't overflow ── */
      [class*="lang-toggle"], [id*="lang-toggle"], [class*="lang-switch"] {
        max-width: 44px !important;
        font-size: 10px !important;
        padding: 2px 4px !important;
      }

      /* ── User chip (avatar + Skrá inn / Útskrá) — extra tight cap so
            the button never reaches the right edge and overlaps content. */
      .user-chip {
        flex-direction: column !important;
        gap: 4px !important;
        padding: 4px !important;
        align-items: center !important;
        max-width: 52px !important;
        margin: 4px auto !important;
        width: auto !important;
      }
      .user-chip > span:not(.ua-role-badge) {
        display: none !important;
      }

      /* ── Sidebar footer / topbar-right column: stack vertically with
            tight spacing so multiple chips don't fight for horizontal room. */
      .topbar-right, .sidebar-footer {
        flex-direction: column !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 6px 4px !important;
      }
      .online-chip {
        max-width: 52px !important;
        font-size: 9px !important;
        padding: 2px 4px !important;
        text-align: center !important;
      }
      .alert-badge {
        margin: 0 auto !important;
      }
    }
  `;

  const style = document.createElement('style');
  style.id = 'mobile-light-theme-style';
  style.textContent = css;
  // Append last so we override anything that loaded before us.
  document.head.appendChild(style);

  console.log('[mobile-light-theme] v1 ready');
})();
/* === END MOBILE LIGHT THEME === */
