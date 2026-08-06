// tools/gen-icon-tonlist.mjs — býr til heimaskjás-táknin fyrir Tónlist-appið.
//
// Engin myndvinnslu-pakki er uppsettur (hvorki sharp né PIL) og við bætum ekki
// dependency við fyrir þrjár myndir. Þess í stað er PNG-inn skrifaður beint:
// hrátt RGB-buffer → zlib deflate → IHDR/IDAT/IEND chunkar með CRC32. Node's
// innbyggða zlib sér um þjöppunina, restin er ~40 línur.
//
//   node tools/gen-icon-tonlist.mjs
//
// Táknið er tónjafnari (equalizer) — VÍSVITANDI ekki Spotify-merkið, það er
// vörumerki þeirra og má ekki endurteikna í okkar appi.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BG = [10, 11, 13];        // #0a0b0d — sami bakgrunnur og hin öppin
const GREEN = [29, 185, 84];    // Spotify-grænt sem áherslulitur
const GREEN_DIM = [22, 128, 61];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  // Hver lína byrjar á filter-bæti (0 = None) og svo RGB á hvern díl.
  const raw = Buffer.alloc(size * (1 + size * 3));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size);
      raw[o++] = r; raw[o++] = g; raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bitdýpt
  ihdr[9] = 2;   // litategund 2 = truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Tónjafnari: fimm súlur með mismunandi hæð, ávalar í endana. Allt reiknað í
// hlutföllum af stærðinni svo 192 og 512 líti nákvæmlega eins út.
// Súlurnar halda sig innan miðju-60% svo maskable-klippingin (Android klippir
// að hring með ~40% öryggissvæði) éti ekki hausinn af þeim.
const BARS = [0.34, 0.62, 0.86, 0.52, 0.28];

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function pixel(x, y, size) {
  const u = x / size, v = y / size;
  // Mjúkur halli í bakgrunni svo táknið sé ekki flatt svart.
  let out = mix(BG, [18, 22, 26], (u + v) / 2);

  const spanW = 0.60, spanH = 0.56;          // teiknisvæði súlnanna
  const left = (1 - spanW) / 2, cy = 0.5;
  const slot = spanW / BARS.length;
  const barW = slot * 0.52, radius = barW / 2;

  for (let i = 0; i < BARS.length; i++) {
    const cx = left + slot * (i + 0.5);
    const half = (BARS[i] * spanH) / 2;
    const dx = Math.abs(u - cx);
    if (dx > radius) continue;
    const dy = Math.abs(v - cy);
    // Kapsúla: bein súla í miðjunni, hringur í báða enda.
    const inside = dy <= half - radius
      ? true
      : Math.hypot(dx, dy - (half - radius)) <= radius;
    if (!inside) continue;
    // Hæstu súlurnar bjartastar — gefur dýpt án þess að nota gagnsæi.
    out = mix(GREEN_DIM, GREEN, BARS[i]);
  }
  return out;
}

mkdirSync(join(ROOT, 'img'), { recursive: true });
for (const [name, size] of [
  ['app-tonlist-192.png', 192],
  ['app-tonlist-512.png', 512],
  ['app-tonlist-apple.png', 180],
]) {
  const file = join(ROOT, 'img', name);
  writeFileSync(file, png(size, pixel));
  console.log('skrifa', name, size + 'x' + size);
}
