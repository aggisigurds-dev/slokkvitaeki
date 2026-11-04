// Kontrast-úttekt (WCAG 2.x) á litapörum sem standa í SÖMU reglu (color + background).
// Les: css/theme-handoff/theme.css, css/theme-scoped.css, css/mobile.css + 10 nýjustu patchar (hæstu NNN).
// Keyrsla: node kontrast.cjs <repo-rót> <úttaksskrá.json>
// Aðeins lestur. Skrifar eina JSON-skrá.
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = process.argv[2] || 'C:/projects/slokkvitaeki';
const OUT = process.argv[3] || path.join(require('os').tmpdir(), 'kontrast-' + new Date().toISOString().slice(0,10) + '.json');

const NAMED = { white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000', blue: '#0000ff', gray: '#808080', grey: '#808080',
  silver: '#c0c0c0', yellow: '#ffff00', orange: '#ffa500', navy: '#000080', maroon: '#800000', darkred: '#8b0000' };

function hexToRgba(h) {
  h = h.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return null;
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
}
function parseColorToken(t) {
  t = t.trim().toLowerCase();
  if (t.startsWith('#')) return hexToRgba(t);
  let m = /^rgba?\(([^)]+)\)$/.exec(t);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(x => x.trim());
    if (p.length < 3) return null;
    const num = x => x.endsWith('%') ? parseFloat(x) * 2.55 : parseFloat(x);
    const a = p[3] != null ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
    return { r: num(p[0]), g: num(p[1]), b: num(p[2]), a: isFinite(a) ? a : 1 };
  }
  if (NAMED[t]) return hexToRgba(NAMED[t]);
  return null;
}
const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black|red|green|blue|gray|grey|silver|yellow|orange|navy|maroon|darkred)\b/gi;

function lum(c) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function blend(top, bottom) {
  const a = top.a;
  return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
}
function ratio(a, b) { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }
function toHex(c) { const h = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'); return '#' + h(c.r) + h(c.g) + h(c.b); }

// ── CSS-breytur (:root) úr þemaskránum ─────────────────────────────────────
const VARS = {};
function harvestVars(txt) {
  const re = /(--[a-z0-9_-]+)\s*:\s*([^;{}]+)[;}]/gi; let m;
  while ((m = re.exec(txt))) { if (!(m[1] in VARS)) VARS[m[1]] = m[2].trim(); }
}
function resolveVars(v, depth) {
  depth = depth || 0; if (depth > 6) return v;
  return v.replace(/var\(\s*(--[a-z0-9_-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/gi, (all, name, fb) => {
    if (VARS[name] != null) return resolveVars(VARS[name], depth + 1);
    if (fb != null) return resolveVars(fb, depth + 1);
    return all;
  });
}

// ── JS-strengfastar: NAME = '...' → staðgengill í ' + NAME + ' ──────────────
function jsConsts(txt) {
  const out = {}; const re = /\b(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=\s*(['"])((?:\\.|(?!\2).)*)\2\s*[;,]/g; let m;
  while ((m = re.exec(txt))) out[m[1]] = m[3];
  // keðjur: const A = 'x', B = 'y';
  const re2 = /,\s*([A-Z_][A-Z0-9_]*)\s*=\s*(['"])((?:\\.|(?!\2).)*)\2/g;
  while ((m = re2.exec(txt))) if (!(m[1] in out)) out[m[1]] = m[3];
  return out;
}
function inlineConsts(txt, C) {
  // '...' + NAME + '...'  →  '...<gildi>...'
  return txt.replace(/(['"`])\s*\+\s*([A-Z_][A-Z0-9_]*)\s*\+\s*(['"`])/g, (all, q1, name, q2) => (C[name] != null ? C[name] : all));
}

function lineOf(txt, idx) { let n = 1; for (let i = 0; i < idx && i < txt.length; i++) if (txt.charCodeAt(i) === 10) n++; return n; }

function lastDecl(body, prop) {
  // síðasta yfirlýsing (án forskeytis, t.d. ekki border-color)
  const re = new RegExp('(?:^|[;{\\s"\'`])' + prop + '\\s*:\\s*([^;}"\'`]+)', 'gi'); let m, last = null;
  while ((m = re.exec(body))) last = { v: m[1].trim(), i: m.index };
  return last;
}
function bgLayers(v) {
  // skipta á efstu kommum
  const out = []; let depth = 0, cur = '';
  for (const ch of v) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch; }
  if (cur.trim()) out.push(cur); return out;
}
function bgColors(v) {
  v = resolveVars(v.replace(/!important/g, ''));
  if (/^\s*(none|transparent|inherit|initial|unset|currentcolor)\s*$/i.test(v)) return null;
  const layers = bgLayers(v);
  // neðsta ógegnsæja lagið ræður (efri rendur eru hálfgegnsæ yfirlög)
  for (let i = layers.length - 1; i >= 0; i--) {
    const toks = (layers[i].match(COLOR_RE) || []).map(parseColorToken).filter(Boolean);
    if (!toks.length) continue;
    const solid = toks.filter(c => c.a >= 0.5);
    if (!solid.length) continue;
    return solid;
  }
  return null;
}

const results = [];
let metin = 0;
let skipped = { gegnsae: 0, oleyst: 0 };
function checkBlock(file, txt, body, bodyStart, selector) {
  const c = lastDecl(body, 'color');
  const b1 = lastDecl(body, 'background');
  const b2 = lastDecl(body, 'background-color');
  const b = (b1 && b2) ? (b1.i > b2.i ? b1 : b2) : (b1 || b2);
  if (!c || !b) return;
  let cv = resolveVars(c.v.replace(/!important/g, '').trim());
  if (/^(inherit|currentcolor|transparent|initial|unset)$/i.test(cv)) return;
  const fgTok = (cv.match(COLOR_RE) || [])[0];
  const fg0 = fgTok ? parseColorToken(fgTok) : null;
  const bgs = bgColors(b.v);
  if (!fg0) { skipped.oleyst++; return; }
  if (!bgs) { skipped.gegnsae++; return; }
  // stór texti: ≥24px eða ≥18,66px feitletrað
  const fs_ = lastDecl(body, 'font-size'); const fw = lastDecl(body, 'font-weight'); const fnt = lastDecl(body, 'font');
  let px = fs_ ? parseFloat(fs_.v) : NaN; let bold = fw ? (/bold/.test(fw.v) || parseFloat(fw.v) >= 700) : false;
  if (fnt) { const m = /(\d{3})?\s*([\d.]+)px/.exec(fnt.v); if (m) { if (!isFinite(px)) px = parseFloat(m[2]); if (m[1] && +m[1] >= 700) bold = true; } }
  const stor = isFinite(px) && (px >= 24 || (bold && px >= 18.66));
  const krafa = stor ? 3 : 4.5;
  // versta stöð halla; hálfgegnsær bakgrunnur blandaður yfir hvítt, hálfgegnsær texti yfir bakgrunninn
  let worst = null;
  for (const bg0 of bgs) {
    const bg = bg0.a < 1 ? blend(bg0, { r: 255, g: 255, b: 255, a: 1 }) : bg0;
    const fg = fg0.a < 1 ? blend(fg0, bg) : fg0;
    const r = ratio(fg, bg);
    if (!worst || r < worst.r) worst = { r, fg, bg, bgAlpha: bg0.a < 1 };
  }
  metin++;
  if (worst.r < 4.5) {
    results.push({
      skra: file, lina: lineOf(txt, bodyStart + c.i),
      forgrunnur: toHex(worst.fg) + (fg0.a < 1 ? ' (' + fgTok + ')' : ''),
      bakgrunnur: toHex(worst.bg) + (bgs.length > 1 ? ' (versta stöð af ' + bgs.length + ')' : '') + (worst.bgAlpha ? ' (alfa yfir hvítt)' : ''),
      hlutfall: Math.round(worst.r * 100) / 100,
      krafa, fellur: worst.r < krafa,
      regla: String(selector || '').replace(/\s+/g, ' ').trim().slice(-90)
    });
  }
}

function scanCss(file, txt) {
  const re = /([^{}]*)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(txt))) checkBlock(file, txt, m[2], m.index + m[1].length + 1, m[1]);
}
function scanJs(file, raw) {
  const C = jsConsts(raw);
  const txt = inlineConsts(raw, C);
  // 1) CSS-reglur inni í strengjum: selector{…}
  const re = /([#.\w\s:>~+\[\]="'()*-]{0,160})\{([^{}]*\b(?:color|background)\b[^{}]*)\}/g; let m;
  while ((m = re.exec(txt))) {
    if (!/(?:^|[;{\s'"`])color\s*:/.test(m[2])) continue;
    if (/=>|function|return|const |let |var /.test(m[2])) continue;   // kóðablokk, ekki CSS
    checkBlock(file, txt, m[2], m.index + m[1].length + 1, m[1]);
  }
  // 2) inline style="…" og cssText = '…'
  const re2 = /(?:style\s*=\s*\\?["']|cssText\s*=\s*['"`])([^"'`]*\bcolor\s*:[^"'`]*)/g;
  while ((m = re2.exec(txt))) checkBlock(file, txt, m[1], m.index + m[0].length - m[1].length, 'inline style');
}

const themeFiles = ['css/theme-handoff/theme.css', 'css/theme-scoped.css', 'css/app.css', 'css/ars-simi-vars.css'];
themeFiles.forEach(f => { try { harvestVars(fs.readFileSync(path.join(REPO, f), 'utf8')); } catch (_) {} });

const cssFiles = ['css/theme-handoff/theme.css', 'css/theme-scoped.css', 'css/mobile.css'];
const pdir = path.join(REPO, 'js/patches');
const patches = fs.readdirSync(pdir).filter(f => /^\d+[a-z]?-.*\.js$/.test(f))
  .sort((a, b) => parseInt(b, 10) - parseInt(a, 10) || b.localeCompare(a)).slice(0, 10).map(f => 'js/patches/' + f);

const scanned = [];
cssFiles.forEach(f => { const t = fs.readFileSync(path.join(REPO, f), 'utf8'); scanned.push(f); scanCss(f, t); });
patches.forEach(f => { const t = fs.readFileSync(path.join(REPO, f), 'utf8'); scanned.push(f); scanJs(f, t); });

// tvítök (sama skrá+lína+par) burt
const seen = new Set();
const uniq = results.filter(r => { const k = r.skra + ':' + r.lina + ':' + r.forgrunnur + ':' + r.bakgrunnur; if (seen.has(k)) return false; seen.add(k); return true; })
  .sort((a, b) => a.hlutfall - b.hlutfall);
fs.writeFileSync(OUT, JSON.stringify(uniq, null, 1), 'utf8');
const fall = uniq.filter(r => r.fellur).length;
console.log(JSON.stringify({ skrar: scanned, para_undir_4_5: uniq.length, fellur_eigin_krafa: fall, undir_3: uniq.filter(r => r.hlutfall < 3).length, sleppt: skipped, metin_por: metin, ut: OUT }, null, 1));
