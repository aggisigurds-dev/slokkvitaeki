/* === SIDEBAR ICON ALIGN v2 ===
 * v1 wrapped ALL trailing children in a single nowrap label span, which
 * collapsed multi-element labels (e.g. button with `<span>Útlit</span>` +
 * stray `<span>QR-miði (18×70mm)</span>`) onto one line without spacing.
 *
 * v2: ONLY normalize the icon slot. Leave the label markup alone — don't
 * wrap, don't change layout. The icon gets a fixed 22px box so labels
 * start at the same X regardless of emoji vs SVG.
 *
 * Pure visual: no markup removed, no click handlers touched.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__sbIconAlignInstalled) return;
  window.__sbIconAlignInstalled = true;

  const STYLE_ID = 'sb-icon-align-css';
  const ICON_W = 22;

  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* Icon slot — fixed width, centered. Targets either a real
       * leading SVG/IMG, or the synthetic .vnav-icon-norm we wrap a
       * leading emoji into. */
      .view-nav .vnav-btn > svg:first-child,
      .view-nav .vnav-btn > img:first-child,
      .view-nav .vnav-btn > .vnav-icon-norm:first-child {
        width: ${ICON_W}px !important;
        min-width: ${ICON_W}px !important;
        max-width: ${ICON_W}px !important;
        flex: 0 0 ${ICON_W}px !important;
        height: 18px !important;
        margin-right: 0 !important;
        text-align: center !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        line-height: 1 !important;
        font-style: normal !important;
      }
    `;
    document.head.appendChild(s);
  }

  // Leading emoji / symbol cluster (with variation selector + ZWJ for
  // compound emoji).
  const EMOJI_RE = /^(\s*)([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}][\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{20E3}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]*)(\s*)/u;

  function normalizeButton(btn) {
    if (!btn || btn.dataset.icoNorm === '1') return;

    const first = btn.firstChild;
    if (!first) return;

    // Case A: first child is already SVG/IMG → CSS handles sizing
    if (first.nodeType === 1 && (first.tagName === 'SVG' || first.tagName === 'IMG')) {
      btn.dataset.icoNorm = '1';
      return;
    }

    // Case B: leading text node — extract leading emoji (if any) and wrap it
    if (first.nodeType === 3) {
      const text = first.nodeValue;
      const m = EMOJI_RE.exec(text);
      if (m) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'vnav-icon-norm';
        iconSpan.textContent = m[2];
        btn.insertBefore(iconSpan, first);
        first.nodeValue = text.slice(m[0].length);
        btn.dataset.icoNorm = '1';
        return;
      }
    }

    // Case C: leading element that's an emoji-only span (e.g. <span>🎯</span>
    // injected by another patch) → relabel it as our icon class
    if (first.nodeType === 1) {
      const t = (first.textContent || '').trim();
      if (t && EMOJI_RE.test(t)) {
        first.classList.add('vnav-icon-norm');
        btn.dataset.icoNorm = '1';
        return;
      }
    }

    btn.dataset.icoNorm = '1';
  }

  function normalizeAll() {
    document.querySelectorAll('.view-nav .vnav-btn').forEach(normalizeButton);
  }

  function install() {
    const nav = document.querySelector('.view-nav');
    if (!nav) {
      requestAnimationFrame(install);
      return;
    }
    normalizeAll();
    let scheduled = false;
    const obs = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        normalizeAll();
      });
    });
    obs.observe(nav, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
