/* === SIDEBAR ICON ALIGN v1 ===
 * The sidebar mixes SVG icons (16px stroke) and emoji icons (🎯⚙️📕 etc).
 * Emoji glyph widths vary between fonts/platforms, so the LABEL text starts
 * at a different X-position on every row — making the nav look misaligned
 * even after the badge fix.
 *
 * Fix: wrap the icon (whether SVG, IMG, or a leading emoji text-glyph) in
 * a fixed-width box (22px) so every label starts at the SAME X.
 *
 * Pure visual normalization — no markup is removed, no click handlers
 * touched. Applies to all themes per Design intent.
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
      /* Reset gap — we own the icon→label spacing now */
      .view-nav .vnav-btn { gap: 0 !important; }

      /* Icon slot (first child) — fixed width, centered */
      .view-nav .vnav-btn > svg:first-child,
      .view-nav .vnav-btn > img:first-child,
      .view-nav .vnav-btn > .vnav-icon-norm:first-child {
        width: ${ICON_W}px !important;
        min-width: ${ICON_W}px !important;
        max-width: ${ICON_W}px !important;
        flex: 0 0 ${ICON_W}px !important;
        height: 18px !important;
        margin-right: 10px !important;
        text-align: center !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        line-height: 1 !important;
      }
      /* Label slot — takes all available space, left-aligned */
      .view-nav .vnav-btn > .vnav-label-norm {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        text-align: left !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
    `;
    document.head.appendChild(s);
  }

  // Match a leading emoji or symbol cluster. Most emoji are in these ranges;
  // also includes simple symbols (▶ ✓ etc) and the variation selector + ZWJ
  // combos common in compound emoji.
  const EMOJI_RE = /^(\s*)([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}][\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{20E3}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]*)/u;

  function normalizeButton(btn) {
    if (!btn || btn.dataset.icoNorm === '1') return;

    // Find the icon — either an SVG/IMG already there, or a leading emoji
    // in the first text node.
    let iconEl = null;
    let firstNonIconText = null;

    const kids = Array.from(btn.childNodes);
    if (!kids.length) return;

    const first = kids[0];
    if (first.nodeType === 1 && (first.tagName === 'SVG' || first.tagName === 'IMG')) {
      // Already an SVG / IMG → leave it, just wrap the rest as label
      iconEl = first;
    } else if (first.nodeType === 3) {
      // Text node — extract leading emoji
      const text = first.nodeValue;
      const m = EMOJI_RE.exec(text);
      if (m) {
        // Replace the text node: emoji-span + rest
        const iconSpan = document.createElement('span');
        iconSpan.className = 'vnav-icon-norm';
        iconSpan.textContent = m[2];
        btn.insertBefore(iconSpan, first);
        first.nodeValue = text.slice(m[0].length);
        iconEl = iconSpan;
      }
    }

    // Now wrap the REST (everything after the icon, except .sb-badge / count
    // pills which we want as siblings of the label, not inside it) in a label
    // span so flex: 1 1 auto works.
    const wrap = document.createElement('span');
    wrap.className = 'vnav-label-norm';
    const toWrap = [];
    let started = false;
    for (const k of Array.from(btn.childNodes)) {
      if (k === iconEl) { started = true; continue; }
      if (!started) continue;
      // Don't wrap badge / count pill — they sit on the right via margin-left:auto
      if (k.nodeType === 1) {
        const el = k;
        const cls = el.className || '';
        if (typeof cls === 'string' && /\b(sb-badge|badge|count|mip-badge)\b/i.test(cls)) continue;
        if (el.id === 'alert-badge') continue;
      }
      toWrap.push(k);
    }
    if (toWrap.length) {
      // Insert wrap right after the icon (or at start if no icon)
      const anchor = iconEl ? iconEl.nextSibling : btn.firstChild;
      btn.insertBefore(wrap, anchor);
      toWrap.forEach(n => wrap.appendChild(n));
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
