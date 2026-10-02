#!/usr/bin/env node
/**
 * Hermir FloorPlan.open remount (cab96432): 1612 svo 388.
 * Krefst hæðaflipa, Skýrari veggir og 3D á BÁÐUM gluggum.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (_) {
    try { ({ chromium } = require(path.join(__dirname, '../../luna-bridge/node_modules/playwright'))); }
    catch (e) { console.error('PLAYWRIGHT VANTAR'); process.exit(2); }
  }
  const html = pathToFileURL(path.join(__dirname, 'teikning-stjorn-fixture.html')).href;
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); }
  catch (_) { browser = await chromium.launch(); }
  const page = await browser.newPage();
  await page.goto(html, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__teiknHreinsa3d === true, null, { timeout: 5000 });

  const skoða = async (cid, nafn) => {
    await page.evaluate(({ cid, nafn }) => {
      FloorPlan.open(cid, nafn, []);
    }, { cid, nafn });
    await page.waitForTimeout(280);
    return page.evaluate(() => {
      const m = document.getElementById('modal-floorplan');
      const hd = m && m.querySelector('.modal-hd');
      return {
        modal: !!m,
        hreinsa: !!(m && m.querySelector('.fp-hreinsa-btn')),
        d3: !!(m && m.querySelector('.fp-3d-btn')),
        haedir: !!(m && m.querySelector('#fp-haedir')),
        haedirTexti: (m && m.querySelector('#fp-haedir') && m.querySelector('#fp-haedir').textContent) || '',
        header: hd ? hd.innerText.replace(/\s+/g, ' ').trim() : '',
        loka: !!(m && /Loka/.test(m.innerText)),
        vista: !!(m && /Vista/.test(m.innerText)),
        rail: !!(m && /SLÖKKVITÆKI/.test(m.innerText))
      };
    });
  };

  const a = await skoða(1612, 'Bílabúð Benna');
  const b = await skoða(388, 'Félag 388');
  await browser.close();

  const villur = [];
  const krefst = (ok, msg) => { if (!ok) villur.push(msg); };
  krefst(a.hreinsa && a.d3 && a.haedir, '1612 vantar stjórn: ' + JSON.stringify(a));
  krefst(/Skýrari veggir/.test(a.header) && /3D/.test(a.header), '1612 haus án Skýrari veggir/3D: ' + a.header);
  krefst(/hæð/.test(a.haedirTexti), '1612 vantar hæðaflipa: ' + a.haedirTexti);
  krefst(a.loka && a.vista && a.rail, '1612 mátti ekki missa Loka/Vista/rail');
  krefst(b.hreinsa && b.d3 && b.haedir, '388 eftir skipti vantar stjórn: ' + JSON.stringify(b));
  krefst(/Skýrari veggir/.test(b.header) && /3D/.test(b.header), '388 haus án Skýrari veggir/3D: ' + b.header);
  krefst(b.loka && b.vista && b.rail, '388 mátti ekki missa Loka/Vista/rail');

  if (villur.length) {
    console.log('TEIKNING-STJORN FIXTURE RAUDT');
    villur.forEach(v => console.log('  · ' + v));
    process.exit(1);
  }
  console.log('TEIKNING-STJORN FIXTURE GRÆNT — 1612 og 388 hafa hæðir, Skýrari veggir og 3D eftir remount.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
