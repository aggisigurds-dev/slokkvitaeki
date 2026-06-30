/* === SIDEBAR BADGE UNIFY v1 ===
 * Replaces the bright colored .sb-badge circles in the sidebar with a single
 * muted-grey pill so all nav-item labels sit on a straight line. Applies
 * GLOBALLY (every theme) per user intent: "lose the color numbers and have the
 * text in a straight line with the others, as seen in the new theme change".
 *
 * Beats:
 *   - patch 15 (sidebar-counts): color variants .red/.orange/.green/.blue/.gray
 *   - patch 20 (mark-invoice-paid): inline background:#dc2626 on .mip-badge
 *   - patches 152/166/172/193/33: other badge injectors via attribute selectors
 *
 * Does NOT touch setBadge() / refresh() APIs. Pure visual override.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__sbBadgeUnifyInstalled) return;
  window.__sbBadgeUnifyInstalled = true;

  const STYLE_ID = 'sb-badge-unify-css';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* Muted-grey pill — consistent across all themes.
       * Keep margin-left:auto so the badge sits on the RIGHT edge of the
       * nav-button → all labels align in a straight column on the LEFT. */
      .view-nav .vnav-btn .sb-badge,
      .view-nav .vnav-btn .sb-badge.red,
      .view-nav .vnav-btn .sb-badge.orange,
      .view-nav .vnav-btn .sb-badge.green,
      .view-nav .vnav-btn .sb-badge.blue,
      .view-nav .vnav-btn .sb-badge.gray,
      .vnav-btn .badge,
      .vnav-btn .count,
      .vnav-btn [class*='badge']:not([class*='dot']):not(#alert-badge),
      .vnav-btn [class*='count']:not(.fcol-count) {
        background: #8a929e !important;
        color: #0c0d10 !important;
        min-width: 0 !important;
        height: auto !important;
        padding: 1px 8px !important;
        border-radius: 20px !important;
        font-family: 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
        font-variant-numeric: tabular-nums !important;
        margin-left: auto !important;
        display: inline-block !important;
        box-shadow: none !important;
        border: 0 !important;
        text-align: center !important;
        vertical-align: middle !important;
        flex: 0 0 auto !important;
      }
      /* Preserve zero-state hiding */
      .view-nav .vnav-btn .sb-badge.zero,
      .view-nav .vnav-btn .sb-badge:empty {
        display: none !important;
      }
      /* Hide the legacy patch-20 .mip-badge (Tekjur ógreitt) — its inline
       * bright-red bg is jarring next to the unified grey pills and the
       * count is already covered by .sb-badge on the same nav item. */
      .view-nav .vnav-btn .sb-badge.mip-badge {
        display: none !important;
      }
    `;
    document.head.appendChild(s);
  }

  /* Patch 20 sets `style.background = '#dc2626'` inline on .sb-badge.mip-badge,
   * which beats stylesheets. Strip that inline background whenever it appears
   * or changes. Lightweight: only fires on badge mutations inside the sidebar. */
  function stripInlineBg(el) {
    if (!el || !el.style) return;
    if (el.style.background || el.style.backgroundColor) {
      el.style.removeProperty('background');
      el.style.removeProperty('background-color');
    }
  }

  function scanAndStrip(root) {
    if (!root || !root.querySelectorAll) return;
    const badges = root.querySelectorAll('.sb-badge');
    badges.forEach(stripInlineBg);
  }

  let scheduled = false;
  function schedule(root) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scanAndStrip(root || document.querySelector('.view-nav') || document.body);
    });
  }

  function install() {
    const nav = document.querySelector('.view-nav') || document.body;
    if (!nav) return;
    scanAndStrip(nav);
    const obs = new MutationObserver((muts) => {
      let touched = false;
      for (const m of muts) {
        if (m.type === 'attributes' && m.target && m.target.classList && m.target.classList.contains('sb-badge')) {
          stripInlineBg(m.target);
          touched = true;
        } else if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
          touched = true;
        }
      }
      if (touched) schedule(nav);
    });
    obs.observe(nav, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
