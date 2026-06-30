/* === SIDEBAR SVG ICONS v3 ===
 * Replaces leading emoji-icons in sidebar nav buttons with 16px line-SVGs
 * from the Design's Sidebar.dc.html reference.
 *
 * v3 — fully idempotent, defends against re-renders:
 *  • DOES NOT rely on a "done" dataset flag. Each pass detects the actual
 *    DOM state and only mutates when something is wrong. Safe to run any
 *    number of times.
 *  • Walks ALL leading nodes/elements (including descendants of leading
 *    wrapper spans like `<span style="display:inline-flex">…</span>` from
 *    patches 157/161/178/179/182/210/219), removing wrong SVGs/IMGs and
 *    peeling every leading emoji until clean.
 *  • Handles the `<span style="margin-right:6px">📋</span>Label` pattern
 *    that patches 143/144/145/147/152/166/167/171/172/193/197/198/201/231
 *    re-emit on every refresh — emoji is detected & stripped each time.
 *  • Handles trailing variation selectors (U+FE0F) and ZWJ joiners that
 *    follow the leading emoji glyph.
 *  • Handles the clone pattern from 220/221 (cloned anchor SVG + emoji
 *    prefix in span).
 *  • Strips emoji ANYWHERE in the label, not just leading (e.g. „🔥 Útlit 🔥").
 *
 * Pure visual: no click handlers touched, badges preserved.
 *
 * Runs after patch 243 (icon-align) which gives every leading icon a 22px slot.
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
    'Tilboð & samningar':    { d: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>' },
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
    'Fyrirtæki':             { d: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>' },
    'Tekjur':                { d: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', color: '#2fcf63' },
    'Lánstæki':              { d: '<path d="M16 16l3-8 3 8"/><path d="M14 12h8M3 8h10v13H3z"/><path d="M8 8V5"/>' },
    'Geymsla':               { d: '<path d="M5 8h14M5 8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/>' },
    'Þjónustutæki':          { d: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>' },
    'Verkefni':              { d: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 11l2 2 4-4"/>' },
    'Til að rukka':          { d: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' },
    'Kúnnareikningur':       { d: '<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-5"/>' },
    'Kreditreikningur':      { d: '<path d="M3 11l4-8 14 14-4 8z"/><path d="m7 3 14 14"/>' },
    'Leiðbeiningar':         { d: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
    'Reikningar':            { d: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>' },
  };

  // EMOJI character (single codepoint, possibly with VS16/ZWJ/skin-tone
  // joiners trailing). Generous Unicode ranges covering every emoji used
  // anywhere in the patches (📋 📞 🔧 🏷 🎯 💰 💳 📊 📝 ⚙ ✅ 🔔 🔍 🤖 🔥
  // 🧾 📜 🎨 🛠 🚨 📑 🏢 🚪 🌅 🗃 🔗 🚀 🚶 💡 🚗 👤 💬 📦 📥 📤 🧰 ↩ ✨ ⏳ 🚫
  // 📅 etc.) — the JS engine handles the Unicode classes.
  const EMOJI_GLYPH = '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2300}-\\u{23FF}\\u{2B00}-\\u{2BFF}\\u{1F1E6}-\\u{1F1FF}\\u{2190}-\\u{21FF}]';
  const EMOJI_JOIN  = '[\\u{FE0E}\\u{FE0F}\\u{200D}\\u{1F3FB}-\\u{1F3FF}\\u{20E3}\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]';
  // Match an emoji cluster anywhere in a string (glyph + any joiners/variation
  // selectors) — used to strip emoji from arbitrary positions in the label.
  const EMOJI_CLUSTER_RE = new RegExp(EMOJI_GLYPH + EMOJI_JOIN + '*', 'gu');
  // Match a leading-emoji-with-surrounding-whitespace (greedy: keep peeling)
  const LEAD_EMOJI_RE = new RegExp('^\\s*(?:' + EMOJI_GLYPH + EMOJI_JOIN + '*\\s*)+', 'u');

  function stripAllEmoji(str) {
    if (!str) return str;
    return str.replace(EMOJI_CLUSTER_RE, '');
  }
  function stripLeadingEmoji(str) {
    if (!str) return str;
    return str.replace(LEAD_EMOJI_RE, '');
  }
  function hasEmoji(str) {
    if (!str) return false;
    EMOJI_CLUSTER_RE.lastIndex = 0;
    return EMOJI_CLUSTER_RE.test(str);
  }

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

  function classOf(el) {
    if (!el || el.nodeType !== 1) return '';
    if (typeof el.className === 'string') return el.className;
    if (el.className && el.className.baseVal != null) return el.className.baseVal;
    return el.getAttribute && el.getAttribute('class') || '';
  }

  function isBadgeEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.id === 'alert-badge') return true;
    const cls = classOf(el);
    if (/\b(sb-badge|badge|count|mip-badge|tr-badge|ky-badge|_drog-badge|_tb-count|_payrev-badge)\b/i.test(cls)) return true;
    // common pattern: badge sits with `display:none` and a custom class — also
    // detect by style margin-left:auto (right-edge pill).
    const style = (el.getAttribute && el.getAttribute('style')) || '';
    if (/margin-left\s*:\s*auto/i.test(style)) return true;
    return false;
  }

  // Get the "clean" label text for a button (used to look up ICONS).
  // Descends into wrapper spans, skips SVGs/IMGs/badges/icon-norm wrappers,
  // strips ALL emoji, joins and trims.
  function getLabel(btn) {
    const parts = [];
    function walk(node) {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          parts.push(n.nodeValue);
        } else if (n.nodeType === 1) {
          const tag = n.tagName;
          if (tag === 'SVG' || tag === 'svg' || tag === 'IMG') continue;
          if (isBadgeEl(n)) continue;
          if (n.classList && n.classList.contains('vnav-icon-norm')) continue;
          walk(n);
        }
      }
    }
    walk(btn);
    return stripAllEmoji(parts.join(' ')).replace(/\s+/g, ' ').trim();
  }

  function findIconSpec(label) {
    if (!label) return null;
    if (ICONS[label]) return ICONS[label];
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    const nLabel = norm(label);
    for (const k of Object.keys(ICONS)) {
      if (norm(k) === nLabel) return ICONS[k];
    }
    for (const k of Object.keys(ICONS)) {
      const nk = norm(k);
      if (nLabel.startsWith(nk) || nk.startsWith(nLabel)) return ICONS[k];
    }
    return null;
  }

  // Strip every emoji from a subtree's text nodes (not from badges).
  function scrubEmoji(node) {
    if (!node) return false;
    let changed = false;
    if (node.nodeType === 3) {
      if (hasEmoji(node.nodeValue)) {
        node.nodeValue = stripAllEmoji(node.nodeValue);
        changed = true;
      }
      return changed;
    }
    if (node.nodeType !== 1) return false;
    if (isBadgeEl(node)) return false;
    for (const child of Array.from(node.childNodes)) {
      if (scrubEmoji(child)) changed = true;
    }
    return changed;
  }

  // Is this leading element a "wrapper" we should mutate
  // (descend into, drop, or pillage for emoji)?
  // True for:
  //   • inline-flex / inline-block wrapper spans containing an SVG/IMG/emoji
  //     (157/161/178/179/182/210/219 pattern)
  //   • emoji-only spans with margin-right:6px etc.
  //     (143/144/145/147/152/166/167/171/172/193/197/198/201/231 pattern)
  function isLeadingWrapper(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName !== 'SPAN' && el.tagName !== 'DIV') return false;
    if (isBadgeEl(el)) return false;
    // Contains an icon child
    if (el.querySelector(':scope > svg, :scope > img, :scope svg, :scope img')) return true;
    // Emoji-only (after stripping, only whitespace left)
    const txt = (el.textContent || '');
    if (txt && stripAllEmoji(txt).trim() === '') return true;
    return false;
  }

  // The core idempotent transform: bring btn to "canonical SVG + clean label".
  // Returns true if it mutated the DOM.
  function decorate(btn) {
    if (!btn) return false;
    if (btn.dataset.sbSkip === '1') return false;

    const label = getLabel(btn);
    if (!label) return false;
    const spec = findIconSpec(label);
    if (!spec) return false;

    let changed = false;
    let hasOurSvg = false;

    // ── 1. Peel leading "wrong" stuff from the button's direct children ──
    //    until we hit a real label element or a badge.
    for (const n of Array.from(btn.childNodes)) {
      if (n.nodeType === 1) {
        const tag = n.tagName;
        // Direct SVG/svg
        if (tag === 'SVG' || tag === 'svg') {
          if (n.getAttribute && n.getAttribute('data-sb-svg') === '1') {
            // Our own SVG — verify it's the right path; else replace.
            const want = spec.d.replace(/\s+/g, '');
            const got = (n.innerHTML || '').replace(/\s+/g, '');
            if (got === want) {
              hasOurSvg = true;
              break; // canonical icon already in place; stop peeling
            } else {
              n.remove();
              changed = true;
              continue;
            }
          }
          // Foreign SVG — kill it
          n.remove();
          changed = true;
          continue;
        }
        if (tag === 'IMG') { n.remove(); changed = true; continue; }
        if (n.classList && n.classList.contains('vnav-icon-norm')) {
          n.remove();
          changed = true;
          continue;
        }
        if (isBadgeEl(n)) { continue; /* leave badge in place; keep scanning */ }

        if (isLeadingWrapper(n)) {
          // Wrapper has icon and/or emoji. Determine if it has a real label.
          const innerText = stripAllEmoji(n.textContent || '').trim();
          if (innerText) {
            // Wrapper IS the label container (e.g. 157/161/178 pattern).
            // Kill its inner SVG/IMG (we install our own outside),
            // kill any nested icon-norm spans, scrub emoji from its text.
            const innerIcons = n.querySelectorAll('svg, img, .vnav-icon-norm');
            innerIcons.forEach(el => { el.remove(); changed = true; });
            if (scrubEmoji(n)) changed = true;
            // Stop peeling — this wrapper is now the label.
            break;
          } else {
            // Emoji-only / icon-only wrapper — drop it entirely.
            n.remove();
            changed = true;
            continue;
          }
        }

        // It's a "real label" element. Strip leading emoji inside its first
        // text node, scrub ALL emoji from inside it, then stop peeling.
        const first = n.firstChild;
        if (first && first.nodeType === 3) {
          const cleaned = stripLeadingEmoji(first.nodeValue);
          if (cleaned !== first.nodeValue) { first.nodeValue = cleaned; changed = true; }
        }
        if (scrubEmoji(n)) changed = true;
        break;
      } else if (n.nodeType === 3) {
        const v = n.nodeValue;
        const cleaned = stripAllEmoji(v);
        if (cleaned !== v) { n.nodeValue = cleaned; changed = true; }
        if ((n.nodeValue || '').trim()) break; // real text — stop peeling
        // else: empty/whitespace, keep peeling
      }
    }

    // ── 2. Insert canonical SVG at very start if it's not already there ──
    if (!hasOurSvg) {
      const first = btn.firstChild;
      const firstSvg = first && first.nodeType === 1 && (first.tagName === 'SVG' || first.tagName === 'svg')
        && first.getAttribute && first.getAttribute('data-sb-svg') === '1';
      if (!firstSvg) {
        btn.insertBefore(buildSvg(spec), btn.firstChild);
        changed = true;
      }
    }

    // ── 3. Final sweep: kill any emoji left ANYWHERE in label-bearing
    //      children (covers trailing emoji + emoji inside wrappers we kept). ──
    for (const n of Array.from(btn.childNodes)) {
      if (n.nodeType === 1) {
        const tag = n.tagName;
        if (tag === 'SVG' || tag === 'svg' || tag === 'IMG') continue;
        if (isBadgeEl(n)) continue;
        if (scrubEmoji(n)) changed = true;
      } else if (n.nodeType === 3) {
        if (hasEmoji(n.nodeValue)) {
          n.nodeValue = stripAllEmoji(n.nodeValue);
          changed = true;
        }
      }
    }

    return changed;
  }

  function decorateAll() {
    let total = 0;
    document.querySelectorAll('.view-nav .vnav-btn').forEach(btn => {
      if (decorate(btn)) total++;
    });
    return total;
  }

  function install() {
    const nav = document.querySelector('.view-nav');
    if (!nav) {
      requestAnimationFrame(install);
      return;
    }
    decorateAll();

    // De-bounce + a small "we just mutated" mute so our own DOM writes
    // don't infinite-loop with the observer. The decorate function is
    // idempotent (returns 0 changes when state is clean), so even if it
    // does fire again it costs nothing.
    let scheduled = false;
    const obs = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        decorateAll();
      });
    });
    obs.observe(nav, { childList: true, subtree: true, characterData: true });

    // Safety net: re-run once a second for the first 10s in case other
    // patches install their nav button via a deferred setTimeout we miss.
    let kicks = 0;
    const id = setInterval(() => {
      decorateAll();
      if (++kicks >= 10) clearInterval(id);
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  // Expose for debugging
  window.__sbSvgIcons = { decorateAll, ICONS };
})();
