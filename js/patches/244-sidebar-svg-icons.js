/* === SIDEBAR SVG ICONS v1 ===
 * Replaces leading emoji-icons in sidebar nav buttons with 16px line-SVGs
 * from the Design's Sidebar.dc.html reference. Each known label gets the
 * exact SVG path the reference specifies, and the spec's color (most are
 * currentColor; a handful are accent-colored per spec §5).
 *
 * Pure visual: no click handlers touched, label text and badges preserved.
 *
 * Runs after patch 243 (icon-align) which ensures any icon — SVG or
 * leftover emoji — sits in a 22px slot.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__sbSvgIconsInstalled) return;
  window.__sbSvgIconsInstalled = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // label → { d (svg children innerHTML), color, sw (stroke-width) }
  // Paths copied verbatim from Sidebar.dc.html reference.
  const ICONS = {
    'Verkborð':              { d: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 9h3M15 13h3M6 7h3M6 11h3"/>' },
    'Verkdagbók':            { d: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
    'Þjónustuverk':          { d: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z"/>' },
    'Þjónustuver':           { d: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>', color: '#e8a662' },
    'Beiðnir':               { d: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>' },
    'Stjórnstöð':            { d: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>', color: '#e23232' },
    'Sala':                  { d: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>', color: '#2fcf63', sw: 2 },
    'Afgreiðsla':            { d: '<path d="M3 3h18v4H3zM3 7l1.5 12.5A2 2 0 0 0 6.5 21h11a2 2 0 0 0 2-1.5L21 7"/>' },
    'Verkstæði':             { d: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z"/>' },
    'Vörur og þjónusta':     { d: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
    'Fyrirtæki í Þjónustu':  { d: '<path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M19 21v-8a2 2 0 0 0-2-2h-2"/><path d="M8 7h2M8 11h2M8 15h2"/>', color: '#5b86ff', sw: 2 },
    'Brunakerfisþjónusta':   { d: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>' },
    'Allir Viðskiptavinir':  { d: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/>' },
    'Drög':                  { d: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' },
    'Rekstrarfélög':         { d: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/>' },
    'ÞjónustuVerkstæði':     { d: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z"/>' },
    'Móttaka':               { d: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>' },
    'Vertíð':                { d: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
    'Hreyfingarlisti':       { d: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>' },
    'Kröfu yfirlit':         { d: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M8 8h8M8 12h6"/>' },
    'Bókhalds yfirlit':      { d: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>' },
    'Fyrirtæki · yfirferð':  { d: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/><path d="m13 14 1.5 1.5L17 13"/>', color: '#5b86ff' },
    'Bókhald · yfirferð':    { d: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/><rect x="13" y="8" width="3" height="9"/><path d="m18 6 1.5 1.5L22 5"/>', color: '#3ec77a' },
    'Leiðsögn':              { d: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-3 6-4 1.5 1.5-4z"/>' },
    'Viðskiptavinir':        { d: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/>' },
    'Tilboð':                { d: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>' },
    'Samningar':             { d: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 17c1-1.5 3-1.5 4 0"/>' },
    'Eftirfylgni':           { d: '<path d="M12 17v5"/><path d="M9 10.8V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5.8a2 2 0 0 0 .6 1.4l1.4 1.4a1 1 0 0 1-.7 1.7H7.7a1 1 0 0 1-.7-1.7l1.4-1.4a2 2 0 0 0 .6-1.4z"/>', color: '#e23232' },
    'Bílstjóri':             { d: '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>' },
    'Fletta upp':            { d: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>' },
    'Stillingar':            { d: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
    'Útlit':                 { d: '<circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 1 2-4h2a4 4 0 0 0 0-8z"/>' },
    'Kerfi':                 { d: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>' },
    'Bakendi':               { d: '<path d="m4 7 4 4-4 4M11 15h6"/><rect x="2" y="3" width="20" height="18" rx="2"/>' },
    'Yfirferð greiðslna':    { d: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>' },
    'Sameining':             { d: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>' },
    'Aðlaga hliðarstiku':    { d: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', color: '#d9af52' },
    'Skrár í Storage':       { d: '<path d="M4 5a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>', color: '#d9af52' },
    'Google Sheet':          { d: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>', color: '#3ec77a' },
    'Google Drive':          { d: '<path d="M6 2h12l4 7-6 11H8L2 9z"/><path d="m2 9 6 11M22 9 8 9M6 2l6 11"/>', color: '#5b86ff' },
    'QR-miði (18×70mm)':     { d: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/>' },
  };

  // Strip leading emoji + whitespace from text content, leave the rest.
  const LEAD_EMOJI_RE = /^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}][\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{20E3}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]*\s*/u;

  function buildSvg(spec) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', spec.color || 'currentColor');
    svg.setAttribute('stroke-width', String(spec.sw || 1.9));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = spec.d;
    svg.setAttribute('data-sb-svg', '1');
    return svg;
  }

  function getLabel(btn) {
    // Walk children, collecting text only from text nodes / span / generic
    // wrappers — skip SVG, IMG, and badge/count pills.
    const parts = [];
    for (const n of btn.childNodes) {
      if (n.nodeType === 3) {
        parts.push(n.nodeValue);
      } else if (n.nodeType === 1) {
        const tag = n.tagName;
        if (tag === 'SVG' || tag === 'IMG') continue;
        const cls = (n.className && typeof n.className === 'string') ? n.className : '';
        if (/\b(sb-badge|badge|count|mip-badge)\b/i.test(cls)) continue;
        if (n.id === 'alert-badge') continue;
        parts.push(n.textContent || '');
      }
    }
    const raw = parts.join(' ').replace(LEAD_EMOJI_RE, '').replace(/\s+/g, ' ').trim();
    return raw;
  }

  function decorate(btn) {
    if (!btn || btn.dataset.sbSvgDone === '1') return;

    // Detect existing SVG icon — if present and looks like a proper one (16px
    // or so), leave it alone (these are the index.html-defined buttons).
    const existingSvg = btn.querySelector(':scope > svg');
    if (existingSvg && !existingSvg.hasAttribute('data-sb-svg')) {
      btn.dataset.sbSvgDone = '1';
      return;
    }

    const label = getLabel(btn);
    if (!label) return;

    // Try exact match, then fuzzy (label starts with key, or key starts with
    // label) to handle wrappers like "QR-miði (18×70mm)" with extra chars.
    let spec = ICONS[label];
    if (!spec) {
      for (const k of Object.keys(ICONS)) {
        if (label === k || label.startsWith(k) || k.startsWith(label)) {
          spec = ICONS[k];
          break;
        }
      }
    }
    if (!spec) return;

    // Remove any leading emoji from first text node, and remove an existing
    // generated svg if present (re-apply).
    const oldGen = btn.querySelector(':scope > svg[data-sb-svg]');
    if (oldGen) oldGen.remove();

    for (const n of Array.from(btn.childNodes)) {
      if (n.nodeType === 3) {
        const stripped = n.nodeValue.replace(LEAD_EMOJI_RE, '');
        if (stripped !== n.nodeValue) {
          n.nodeValue = stripped;
        }
        break;
      } else if (n.nodeType === 1) {
        // Element first — might contain emoji as text. Strip leading emoji
        // from its first text node.
        const first = n.firstChild;
        if (first && first.nodeType === 3) {
          first.nodeValue = first.nodeValue.replace(LEAD_EMOJI_RE, '');
        }
        // Also strip leading emoji from this element's text content if it's
        // just plain text.
        if (n.children.length === 0) {
          const t = n.textContent || '';
          const cleaned = t.replace(LEAD_EMOJI_RE, '');
          if (cleaned !== t) n.textContent = cleaned;
        }
        break;
      }
    }

    // Also strip any leftover .vnav-icon-norm span (from patch 243) that
    // contained only an emoji — we own the icon now.
    const oldNorm = btn.querySelector(':scope > .vnav-icon-norm');
    if (oldNorm) oldNorm.remove();

    // Insert the SVG at the very start
    const svg = buildSvg(spec);
    btn.insertBefore(svg, btn.firstChild);
    btn.dataset.sbSvgDone = '1';
  }

  function decorateAll() {
    document.querySelectorAll('.view-nav .vnav-btn').forEach(decorate);
  }

  function install() {
    const nav = document.querySelector('.view-nav');
    if (!nav) {
      requestAnimationFrame(install);
      return;
    }
    decorateAll();
    let scheduled = false;
    const obs = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        decorateAll();
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
