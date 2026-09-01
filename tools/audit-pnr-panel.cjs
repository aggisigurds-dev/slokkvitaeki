#!/usr/bin/env node
/* Regression net — the Ársskoðun „📍 Númer" póstnúmera-panel stays reachable
 * (2026-09-01).
 *
 * Agnar reported "the númer postalcode chooser does not open". The button was
 * never broken: it toggled, aria-expanded went true, the caret flipped to ▴ and
 * #_ars-pnr-panel WAS in the DOM. It was invisible because it got clipped to
 * nothing.
 *
 * Cause: _ensureArsStrimlarCss() puts `overflow-x:auto` on #_ars-pnr-row so the
 * chip strip scrolls sideways instead of wrapping. CSS does not allow clipping
 * one axis while leaving the other visible — `overflow-x:auto` forces the used
 * value of `overflow-y` to `auto` too (measured in Chromium: auto/auto). The row
 * is ~28px tall and the panel was `position:absolute;top:100%`, i.e. it started
 * exactly at the row's bottom edge, fully outside the parent's overflow box.
 * Measured before the fix: elementFromPoint over the panel centre never returned
 * anything inside the panel, on desktop AND phone. Clipping does not change
 * getBoundingClientRect, only painting and hit-testing — which is why the panel
 * still measured a plausible height while being completely unusable.
 *
 * audit-all could not see it: the break is CSS layout, not a Supabase data
 * invariant — it reached us as a bug report. This SOURCE-only audit locks the
 * escape hatch so the class of break cannot ship silently again. Anyone who
 * "tidies" the panel back to position:absolute, or drops _pnrPlace(), gets RED.
 *
 * NB the same trap applies to ._ars-morow and ._ars-statusrow — both also carry
 * overflow-x:auto. Anchoring any future popup inside those needs the same
 * treatment. See docs/ORYGGISNET.md.
 *
 * GREEN if: the panel is position:fixed, _pnrPlace() exists and is called from
 *           both the render tail and a scroll/resize listener registered OUTSIDE
 *           render() (so listeners cannot accumulate per repaint).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js/patches/153-arsskodun.js'), 'utf8');

const fails = [];

// ── The row still clips. If that ever stops being true this audit may relax. ──
const rowClips = /#_ars-pnr-row\{[^}]*overflow-x:\s*auto/.test(src);

// ── 1. The panel must not be absolutely positioned inside the clipping row ────
const panelTag = (src.match(/<div id="_ars-pnr-panel"[^>]*>/) || [])[0];
if (!panelTag) {
  fails.push('153 no longer renders <div id="_ars-pnr-panel"> — the póstnúmera-glugginn markup is gone');
} else {
  if (/position:\s*absolute/.test(panelTag)) {
    fails.push(
      '153 #_ars-pnr-panel is position:absolute again' +
      (rowClips ? ' while #_ars-pnr-row still has overflow-x:auto (which forces overflow-y:auto) — the panel will be clipped to nothing and the chooser will not open'
                : ' — it must stay position:fixed unless #_ars-pnr-row is provably not a clipping box')
    );
  } else if (!/position:\s*fixed/.test(panelTag)) {
    fails.push('153 #_ars-pnr-panel is neither position:fixed nor absolute — it must be fixed to escape the #_ars-pnr-row overflow box');
  }
}

// ── 2. The placement helper must exist ───────────────────────────────────────
if (!/function\s+_pnrPlace\s*\(/.test(src)) {
  fails.push('153 _pnrPlace() is gone — a position:fixed panel with no coordinate source renders at the viewport origin, not under the button');
}

// ── 3. …and be called from the render tail, so a repaint re-anchors the panel ─
if (!/if\s*\(\s*_pnrOpen\s*\)\s*_pnrPlace\s*\(\s*\)/.test(src)) {
  fails.push('153 render() no longer calls _pnrPlace() when _pnrOpen — the panel keeps stale coordinates after every re-render (picking a postal code re-renders)');
}

// ── 4. …and follow the button on scroll/resize, since fixed does not scroll ───
const listener = /\[\s*['"]scroll['"]\s*,\s*['"]resize['"]\s*\][\s\S]{0,220}?_pnrPlace\s*\(\s*\)/.test(src);
if (!listener) {
  fails.push('153 lost the scroll/resize listener that re-runs _pnrPlace() — a position:fixed panel does not move with the button when the list scrolls');
}

// ── 5. Those listeners must be registered ONCE, not inside render() ──────────
// render() starts at `function render()`; anything after it repeats per repaint.
const iRender = src.search(/\n\s*function render\s*\(/);
const iListener = src.search(/\[\s*['"]scroll['"]\s*,\s*['"]resize['"]\s*\]/);
if (iRender !== -1 && iListener !== -1 && iListener > iRender) {
  fails.push('153 registers the scroll/resize _pnrPlace listener inside/after render() — listeners accumulate on every repaint (the mousedown handler is deliberately registered once for the same reason)');
}

if (fails.length) {
  console.log('RED  ' + fails.join('; '));
  process.exit(1);
}
console.log('GREEN  Númer-glugginn sleppur út úr overflow-boxinu: panel er position:fixed, _pnrPlace() kallað úr render-hala + scroll/resize (skráð einu sinni)');
process.exit(0);
