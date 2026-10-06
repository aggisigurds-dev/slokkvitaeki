/* opp-profun.cjs — prófar öll uppsett öpp í síma-stærð (375×812, S26-líkt).
 *
 * Fyrir hvert app (/app/<key>/) og hvern flipa í botnstikunni: smellir, bíður kyrrðar,
 * og mælir (a) hvað nær út fyrir hægri brún skjásins, (b) miðgildi leturs í RAUNPIXLUM
 * (fontSize × zoom síðunnar), (c) takka lægri en 30 px, (d) JS-villur. Skjáskot í
 * tools/opp-skjaskot/<app>-<flipi>.png.
 *
 *   NODE_PATH=../luna-bridge/node_modules node tools/opp-profun.cjs [app ...]
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.OPP_BASE || 'https://slokkvitaeki.netlify.app';
const APPS = process.argv.slice(2).length ? process.argv.slice(2) : ['fjarmal', 'boss', 'brunaholf', 'brunakerfi', 'bilstjori', 'skyrslustod', 'verkefni', 'threedwork'];
const OUT = path.join(__dirname, 'opp-skjaskot');
fs.mkdirSync(OUT, { recursive: true });

const MAELING = `(() => {
  const v = document.querySelector('.view.active');
  const fr = document.querySelector('#_app-frame');
  const frVis = fr && getComputedStyle(fr).display !== 'none' && getComputedStyle(fr).visibility !== 'hidden' && fr.getBoundingClientRect().height > 50;
  const m = { view: v && v.id, iframe: !!frVis, pz: getComputedStyle(document.documentElement).getPropertyValue('--app-page-zoom').trim() || '1', sw: document.documentElement.scrollWidth };
  if (frVis || !v) return m;
  const z = parseFloat(getComputedStyle(v).zoom) || 1;
  const els = [...v.querySelectorAll('*')].slice(0, 6000).filter(n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  // Útflæði: nær út fyrir hægri brún OG enginn forfaðir er viljandi lárétt skrunanlegur
  // (overflow-x auto/scroll með innihald breiðara en hann sjálfur) — töflur með eigin skruni teljast ekki.
  const iSkruni = n => { for (let p = n.parentElement; p && p !== v.parentElement; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 2) return true; } return false; };
  const over = els.filter(n => n.getBoundingClientRect().right > innerWidth + 2 && !iSkruni(n));
  m.over = over.length;
  m.overEx = over.slice(0, 3).map(n => ((n.className && String(n.className).split(' ')[0]) || n.tagName) + ':' + Math.round(n.getBoundingClientRect().right));
  if (over.length) { const r = over[0].getBoundingClientRect(); m.overY = Math.round(r.top + scrollY); }
  const txt = els.filter(n => n.children.length === 0 && n.textContent.trim().length > 2).map(n => parseFloat(getComputedStyle(n).fontSize) * z).sort((a, b) => a - b);
  m.txtN = txt.length; m.fsMed = txt.length ? +txt[Math.floor(txt.length / 2)].toFixed(1) : null; m.under10 = txt.filter(x => x < 10).length;
  const btns = els.filter(n => /^(BUTTON|A)$/.test(n.tagName));
  m.btnN = btns.length; m.btnSmall = btns.filter(b => b.getBoundingClientRect().height < 30).length;
  m.textLen = v.innerText.trim().length;
  return m;
})()`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
  const result = {};
  for (const app of APPS) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 120)));
    const rows = [];
    try {
      await page.goto(BASE + '/app/' + app + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(9000);
      const tabs = await page.$$eval('#_app-nav ._app-tab', ts => ts.map(t => ({ k: t.dataset.k, n: t.textContent.trim().slice(0, 14) })));
      for (let i = 0; i < tabs.length; i++) {
        const t = tabs[i];
        const errBefore = errors.length;
        await page.evaluate(i => document.querySelectorAll('#_app-nav ._app-tab')[i].click(), i);
        await page.waitForTimeout(3500);
        const m = await page.evaluate(MAELING);
        m.k = t.k; m.n = t.n; m.err = errors.slice(errBefore);
        rows.push(m);
        const nafn = app + '-' + String(i + 1).padStart(2, '0') + '-' + t.k;
        await page.screenshot({ path: path.join(OUT, nafn + '.png') }).catch(() => {});
        if (m.over) {
          await page.evaluate(y => window.scrollTo(0, Math.max(0, y - 200)), m.overY);
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(OUT, nafn + '-ut.png') }).catch(() => {});
          await page.evaluate(() => window.scrollTo(0, 0));
        }
      }
    } catch (e) { rows.push({ k: '(app)', err: [String(e.message).slice(0, 160)] }); }
    result[app] = rows;
    console.log('\n== ' + app + ' (' + rows.length + ' flipar) ==');
    for (const r of rows) console.log(
      [String(r.k).padEnd(22), r.iframe ? 'iframe' : ('z=' + r.pz).padEnd(7), r.iframe ? '' : ('út=' + r.over + ' letur=' + r.fsMed + 'px (<10: ' + r.under10 + '/' + r.txtN + ') takkar<30: ' + r.btnSmall + '/' + r.btnN + ' sw=' + r.sw), r.overEx && r.overEx.length ? ' ' + r.overEx.join(' ') : '', r.err && r.err.length ? ' ⚠ ' + r.err.join(' | ') : ''].join(' ')
    );
    await page.close();
  }
  fs.writeFileSync(path.join(OUT, '_nidurstada.json'), JSON.stringify(result, null, 1));
  await browser.close();
})();
