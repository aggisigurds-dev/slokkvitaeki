#!/usr/bin/env node
/* === MOCKUP Í SÍÐU — venjulega leiðin, ekki mynd→HTML ==========================================
 *
 * Agnar 22.11.2026: ChatGPT-mockup af hluta limt inn, Claude Code á að fylgja — quality hrynur
 * alltaf. Þetta tól skrifar SKIPUN og mælir dílamun (hluti vs rest), það býr ekki til síðu.
 *
 *   node tools/mockup-i-sidu.cjs --snið --nafn haus --url URL --hluti '.sel' [--mynd mockup.png]
 *   node tools/mockup-i-sidu.cjs --lesa mockup.png
 *   node tools/mockup-i-sidu.cjs --bera fyrir.png eftir.png [--grima x,y,w,h] [--ut mismunur.png] [--thak 1.5]
 *
 * --bera: rest > þak %  → exit 2 (of mikið utan hluta). Hlutinn 0% → exit 3 (ekkert gert).
 * ================================================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const REST_THAK = 1.5;

function crc(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function writePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readPng(buf) {
  if (!Buffer.isBuffer(buf)) buf = fs.readFileSync(buf);
  if (buf.length < 24 || buf.subarray(0, 8).compare(SIG) !== 0) throw new Error('ekki PNG');
  let off = 8, width, height, depth, ctype, plte = null, trns = null;
  const idat = [];
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off); off += 4;
    const type = buf.toString('ascii', off, off + 4); off += 4;
    const data = buf.subarray(off, off + len); off += len;
    off += 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      ctype = data[9];
      if (data[12] !== 0) throw new Error('PNG interlaced ekki stutt');
    } else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!width || depth !== 8) throw new Error('aðeins 8-bita PNG');
  const bppMap = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const bpp = bppMap[ctype];
  if (!bpp) throw new Error('PNG color type ' + ctype + ' ekki stutt');
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const raw = Buffer.alloc(stride * height);
  let src = 0;
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filt = inflated[src++];
    const row = inflated.subarray(src, src + stride); src += stride;
    const out = raw.subarray(y * stride, y * stride + stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? out[i - bpp] : 0;
      const up = prev[i];
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      const x = row[i];
      let v;
      if (filt === 0) v = x;
      else if (filt === 1) v = (x + left) & 255;
      else if (filt === 2) v = (x + up) & 255;
      else if (filt === 3) v = (x + ((left + up) >> 1)) & 255;
      else if (filt === 4) v = (x + paeth(left, up, upLeft)) & 255;
      else throw new Error('PNG filter ' + filt);
      out[i] = v;
    }
    out.copy(prev);
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++) {
    if (ctype === 6) {
      rgba[p++] = raw[i * 4]; rgba[p++] = raw[i * 4 + 1]; rgba[p++] = raw[i * 4 + 2]; rgba[p++] = raw[i * 4 + 3];
    } else if (ctype === 2) {
      rgba[p++] = raw[i * 3]; rgba[p++] = raw[i * 3 + 1]; rgba[p++] = raw[i * 3 + 2]; rgba[p++] = 255;
    } else if (ctype === 0) {
      const g = raw[i]; rgba[p++] = g; rgba[p++] = g; rgba[p++] = g; rgba[p++] = 255;
    } else if (ctype === 4) {
      const g = raw[i * 2]; rgba[p++] = g; rgba[p++] = g; rgba[p++] = g; rgba[p++] = raw[i * 2 + 1];
    } else {
      const idx = raw[i];
      rgba[p++] = plte[idx * 3]; rgba[p++] = plte[idx * 3 + 1]; rgba[p++] = plte[idx * 3 + 2];
      rgba[p++] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }
  return { width, height, data: rgba };
}

function parseGrima(s) {
  if (!s) return null;
  const p = String(s).split(',').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) throw new Error('--grima á að vera x,y,w,h');
  return { x: p[0], y: p[1], w: p[2], h: p[3] };
}

function inGrima(x, y, g) {
  return g && x >= g.x && y >= g.y && x < g.x + g.w && y < g.y + g.h;
}

function bera(a, b, opts) {
  opts = opts || {};
  const A = typeof a === 'object' && a.data ? a : readPng(a);
  const B = typeof b === 'object' && b.data ? b : readPng(b);
  if (A.width !== B.width || A.height !== B.height) {
    throw new Error('mismunandi stærð: ' + A.width + '×' + A.height + ' vs ' + B.width + '×' + B.height + ' — skjáskot á sömu breidd');
  }
  const g = opts.grima || null;
  const thr = opts.delta == null ? 8 : opts.delta;
  const diff = Buffer.from(A.data);
  let inCh = 0, inN = 0, outCh = 0, outN = 0;
  for (let y = 0; y < A.height; y++) {
    for (let x = 0; x < A.width; x++) {
      const i = (y * A.width + x) * 4;
      const d = Math.max(
        Math.abs(A.data[i] - B.data[i]),
        Math.abs(A.data[i + 1] - B.data[i + 1]),
        Math.abs(A.data[i + 2] - B.data[i + 2])
      );
      const inn = inGrima(x, y, g);
      if (inn) inN++; else outN++;
      if (d > thr) {
        if (inn) inCh++; else outCh++;
        diff[i] = 220; diff[i + 1] = 40; diff[i + 2] = 40; diff[i + 3] = 255;
      } else {
        diff[i] = Math.round(A.data[i] * 0.35);
        diff[i + 1] = Math.round(A.data[i + 1] * 0.35);
        diff[i + 2] = Math.round(A.data[i + 2] * 0.35);
      }
    }
  }
  const pct = (n, d) => (d ? (100 * n) / d : 0);
  return {
    width: A.width,
    height: A.height,
    hluti: { breytt: inCh, n: inN, pct: pct(inCh, inN) },
    rest: { breytt: outCh, n: outN, pct: pct(outCh, outN) },
    diff
  };
}

function rikjandi(png, n) {
  n = n || 6;
  const { width, height, data } = png;
  const step = Math.max(1, Math.floor(Math.sqrt(width * height) / 80));
  const bag = new Map();
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 16) continue;
      const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      bag.set(k, (bag.get(k) || 0) + 1);
    }
  }
  return [...bag.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => {
    const r = ((k >> 8) & 15) * 17, g = ((k >> 4) & 15) * 17, b = (k & 15) * 17;
    const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    return { hex, n: c };
  });
}

function slug(s) {
  return String(s || 'hluti').toLowerCase().replace(/[^a-z0-9áéíóúýþæö-]+/gi, '-').replace(/^-|-$/g, '') || 'hluti';
}

function skipunSnið(o) {
  o = o || {};
  return `# SKIPUN — mockup í síðu

- Nafn: ${o.nafn || ''}
- Síða: ${o.url || ''}
- Hluti (veljari): \`${o.hluti || ''}\`
- Mockup: ${o.mynd || ''}

Mockupið er ásetningur. Ekki endurskrifa HTML. Quality = öndun og leturstigi, ekki „svipaður litur".

## BREYTA (mest sjö)

1.
2.
3.

Hver lína: hvað sést á mockupinu → veljari → Brunastál-tókni (ekki hex úr myndinni).

## HALDA

- Krókar, \`data-*\`, föll, Vista, gögn
- Nav og aðrir hlutar síðunnar

## HUNSA (uppspuni ChatGPT)

- Leturgerð sem er ekki í theme.css
- Takkar / nav / enski texti / fölsk gögn sem eru ekki í framleiðslu
- Vafrakróm í mockupinu

## Mæling

- \`fyrir.png\` / \`eftir.png\` = hlutinn, sama breidd
- \`fyrir-sida.png\` / \`eftir-sida.png\` = öll síðan
- \`node tools/mockup-i-sidu.cjs --bera fyrir-sida.png eftir-sida.png --grima x,y,w,h\`
  - rest > 1,5% → of mikið
  - hluti 0% → ekkert gert
`;
}

function mappaFyrir(nafn) {
  return path.join(process.cwd(), '.design', 'mockup-' + slug(nafn));
}

function rokin(argv) {
  const o = { hamur: null, nafn: null, url: null, hluti: null, mynd: null, a: null, b: null, grima: null, ut: null, thak: REST_THAK };
  const rest = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--snið' || a === '--snid') o.hamur = 'snid';
    else if (a === '--lesa') { o.hamur = 'lesa'; o.mynd = argv[++i]; }
    else if (a === '--bera') o.hamur = 'bera';
    else if (a === '--nafn') o.nafn = argv[++i];
    else if (a === '--url') o.url = argv[++i];
    else if (a === '--hluti') o.hluti = argv[++i];
    else if (a === '--mynd') o.mynd = argv[++i];
    else if (a === '--grima') o.grima = parseGrima(argv[++i]);
    else if (a === '--ut') o.ut = argv[++i];
    else if (a === '--thak') o.thak = +argv[++i];
    else if (a === '--hjalp' || a === '--help' || a === '-h') o.hamur = 'hjalp';
    else rest.push(a);
  }
  if (o.hamur === 'bera') {
    o.a = rest[0]; o.b = rest[1];
  } else if (!o.hamur && rest[0]) o.hamur = 'hjalp';
  return o;
}

function hjalp() {
  return `mockup-i-sidu — SKIPUN + dílamunur. Býr ekki til HTML.

  node tools/mockup-i-sidu.cjs --snið --nafn haus --url URL --hluti '.sel' [--mynd mockup.png]
  node tools/mockup-i-sidu.cjs --lesa mockup.png
  node tools/mockup-i-sidu.cjs --bera fyrir.png eftir.png [--grima x,y,w,h] [--ut mismunur.png]
`;
}

function main(argv) {
  const o = rokin(argv);
  if (!o.hamur || o.hamur === 'hjalp') {
    process.stdout.write(hjalp());
    return 0;
  }
  if (o.hamur === 'snid') {
    if (!o.nafn) throw new Error('--nafn vantar');
    const dir = mappaFyrir(o.nafn);
    fs.mkdirSync(dir, { recursive: true });
    const md = path.join(dir, 'SKIPUN.md');
    if (!fs.existsSync(md)) fs.writeFileSync(md, skipunSnið(o));
    if (o.mynd && fs.existsSync(o.mynd)) fs.copyFileSync(o.mynd, path.join(dir, 'mockup' + path.extname(o.mynd)));
    process.stdout.write(dir + '\n' + md + '\n');
    return 0;
  }
  if (o.hamur === 'lesa') {
    if (!o.mynd) throw new Error('--lesa þarf PNG');
    const png = readPng(o.mynd);
    const litir = rikjandi(png);
    process.stdout.write(JSON.stringify({ width: png.width, height: png.height, litir }, null, 2) + '\n');
    return 0;
  }
  if (o.hamur === 'bera') {
    if (!o.a || !o.b) throw new Error('--bera þarf tvær PNG');
    const r = bera(o.a, o.b, { grima: o.grima });
    if (o.ut) fs.writeFileSync(o.ut, writePng(r.width, r.height, r.diff));
    const line = {
      hluti_pct: +r.hluti.pct.toFixed(3),
      rest_pct: +r.rest.pct.toFixed(3),
      hluti: r.hluti.breytt + '/' + r.hluti.n,
      rest: r.rest.breytt + '/' + r.rest.n,
      px: r.width + '×' + r.height
    };
    process.stdout.write(JSON.stringify(line) + '\n');
    if (r.rest.n && r.rest.pct > o.thak) {
      process.stderr.write('FALL: rest síðunnar breyttist ' + r.rest.pct.toFixed(2) + '% (þak ' + o.thak + '%)\n');
      return 2;
    }
    if (o.grima && r.hluti.n && r.hluti.pct === 0) {
      process.stderr.write('FALL: hlutinn breyttist 0% — ekkert gert\n');
      return 3;
    }
    return 0;
  }
  throw new Error('óþekktur hamur');
}

if (require.main === module) {
  try {
    process.exit(main(process.argv));
  } catch (e) {
    process.stderr.write(String(e.message || e) + '\n');
    process.exit(1);
  }
}

module.exports = { readPng, writePng, bera, skipunSnið, rokin, rikjandi, slug, main, parseGrima };
