#!/usr/bin/env node
/* Regression net — Ársskoðun ("Fyrirtæki í þjónustu") table columns stay
 * aligned (2026-08-26).
 *
 * Patch 187 injects the four year report/document columns ("Skoðanir · skjöl",
 * the inv-dot / klarað readiness surface that audit-arsskodun-inv-dot guards)
 * into the 153 table at RUNTIME. It used to anchor on a hardcoded positional
 * index (htr.children[1] / tr.children[1]). When 153 prepended a new leftmost
 * póst-stöðu column (._ars-mailhdr / ._ars-mailcol), children[1] slid from the
 * Nóta cell onto the NAME cell, so the year columns injected between the mail
 * column and the company name, the colspan="Skoðanir · skjöl" super-header
 * vanished (hasNota went false), and the fixed colgroup widths mapped the name
 * column to 64px. audit-all could not see it — the break is DOM layout, not a
 * Supabase data invariant. This SOURCE-only audit locks the two guards that
 * keep the columns aligned so the class of break cannot ship silently again.
 *
 * GREEN if: 187 anchors on the Nóta cell by SELECTOR (not bare children[1]),
 *           and 153 renders ._ars-mailcol/._ars-mailhdr BEFORE the name cell.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src187 = fs.readFileSync(path.join(root, 'js/patches/187-inservice-row-reports.js'), 'utf8');
const src153 = fs.readFileSync(path.join(root, 'js/patches/153-arsskodun.js'), 'utf8');
const src222 = fs.readFileSync(path.join(root, 'js/patches/222-grunsamlegt-flag.js'), 'utf8');

const fails = [];

// ── 187: content-based anchors (survive a prepended leftmost column) ─────────
if (!/querySelector\(\s*['"]th\[data-notacol\]['"]\s*\)/.test(src187)) {
  fails.push('187 header anchor is not querySelector("th[data-notacol]") — a prepended column would shift children[1] and mis-inject the year headers');
}
if (!/querySelector\(\s*['"]td\._ars-notacell['"]\s*\)/.test(src187)) {
  fails.push('187 body anchor is not querySelector("td._ars-notacell") — a prepended column would shift children[1] and mis-inject the year cells');
}

// ── 153: the póst-stöðu column must precede the name cell (both th and td) ───
// Compare the TEMPLATE tags (not the CSS selectors, which occur earlier in the
// file) — these fragments appear only in the thead/tbody render.
const iHdrMail = src153.indexOf('<th class="_ars-mailhdr');   // header: mail th
const iHdrName = src153.indexOf('<th data-sort="name"');       // header: Fyrirtæki th
const iTdMail = src153.indexOf('<td class="center _ars-mailcol"'); // body: mail td
const iTdName = src153.indexOf('<td class="_ars-namecell">');  // body: name td
if (iHdrMail === -1) fails.push('153 missing <th ._ars-mailhdr> (póst-stöðu header)');
if (iTdMail === -1) fails.push('153 missing <td ._ars-mailcol> (póst-stöðu cell)');
if (iTdName === -1) fails.push('153 missing <td ._ars-namecell> (name cell marker 187/dense-mode CSS depend on)');
if (iHdrMail !== -1 && iHdrName !== -1 && iHdrMail > iHdrName) {
  fails.push('153 header <th ._ars-mailhdr> renders AFTER the Fyrirtæki header — 187 injects the year super-header on the wrong anchor');
}
if (iTdMail !== -1 && iTdName !== -1 && iTdMail > iTdName) {
  fails.push('153 <td ._ars-mailcol> renders AFTER ._ars-namecell — the mail column must stay leftmost or 187 + colgroup desync');
}
// Leading narrow <col> for the mail column (keeps fixed-layout widths 1:1)
if (!/<colgroup>\s*<col style="width:34px">/.test(src153)) {
  fails.push('153 colgroup missing the leading <col style="width:34px"> for the mail column');
}

// ── 222: the "⚠ grunsamlegt" pill must anchor on the name cell, not the first
// <td> (which is now the mail column) — else it lands on top of the 295 badge ─
if (!/_ars-namecell/.test(src222)) {
  fails.push('222 addBadge() does not anchor on td._ars-namecell — the ⚠ grunsamlegt pill would land in the leftmost mail column, colliding with the 295 badge');
}

// ── tightening: the dense-mode (viewmode=table) rules and the year-padding rule
// must stay position-independent of the prepended mail column ────────────────
if (/tbody td:first-child>div:nth-child\([23]\)/.test(src153)) {
  fails.push('153 dense-mode CSS reverted to td:first-child — now the empty mail cell; must stay ._ars-namecell');
}
if (!/data-table td:nth-child\(5\).*data-table td:nth-child\(8\)/.test(src153)) {
  fails.push('153 year-cell padding rule is not nth-child(5..8) — the four 187 year cells shifted right by the mail column');
}

if (fails.length) {
  console.log('RED  ' + fails.join('; '));
  process.exit(1);
}
console.log('GREEN  Ársskoðun columns aligned: 187 anchors on Nóta by selector, ._ars-mailcol leads ._ars-namecell (BASELINE 0)');
process.exit(0);
