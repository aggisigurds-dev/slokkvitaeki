#!/usr/bin/env node
// tools/app-tokn-png.cjs — býr til PNG-útgáfur (192 + 512, „any" og „maskable") af öllum táknum í img/app-tokn/.
//
// 19.09.2026: manifest notenda-búinna appa bar AÐEINS SVG-tákn (sizes:"any"). Android (WebAPK) vill PNG 192/512 —
// með SVG einu fær heimaskjárinn í besta falli almennt tákn. Keyrt á þeirri vél sem hefur Playwright + Chrome:
//     NODE_PATH=../luna-bridge/node_modules node tools/app-tokn-png.cjs
// Útkoman er committuð (img/app-tokn/png/NN-nafn-192.png, -512.png, -192-maskable.png, -512-maskable.png),
// svo hvorki build né þjónn þurfa Playwright. Bæta við tákni = leggja SVG í möppuna og keyra þetta aftur.
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const DIR = path.join(__dirname, '..', 'img', 'app-tokn'), OUT = path.join(DIR, 'png');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(DIR).filter((f) => /^[0-9]{2}-[a-z0-9-]+\.svg$/.test(f));
  let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch (_) { browser = await chromium.launch(); }
  const page = await browser.newPage();
  await page.setContent('<!doctype html><canvas id="c"></canvas>');
  let n = 0;
  for (const f of files) {
    const svg = fs.readFileSync(path.join(DIR, f), 'utf8');
    const url = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    const res = await page.evaluate(async ({ url }) => {
      const img = new Image(); img.src = url; await img.decode();
      const c = document.getElementById('c'); const out = {};
      for (const s of [192, 512]) {
        c.width = c.height = s; let x = c.getContext('2d');
        x.clearRect(0, 0, s, s); x.drawImage(img, 0, 0, s, s);
        out[s] = c.toDataURL('image/png');
        // maskable: hornin fyllt með bakgrunnslit táknsins (sýni tekið efst fyrir miðju), táknið í fullri stærð ofan á
        const p = x.getImageData(Math.round(s / 2), Math.round(s * 0.03), 1, 1).data;
        x.clearRect(0, 0, s, s); x.fillStyle = 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; x.fillRect(0, 0, s, s); x.drawImage(img, 0, 0, s, s);
        out[s + 'm'] = c.toDataURL('image/png');
      }
      return out;
    }, { url });
    const base = f.replace(/\.svg$/, '');
    for (const [k, suffix] of [['192', '-192'], ['512', '-512'], ['192m', '-192-maskable'], ['512m', '-512-maskable']]) {
      fs.writeFileSync(path.join(OUT, base + suffix + '.png'), Buffer.from(res[k].split(',')[1], 'base64'));
    }
    n++;
  }
  await browser.close();
  console.log(n + ' tákn → ' + n * 4 + ' PNG í img/app-tokn/png/');
})().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
