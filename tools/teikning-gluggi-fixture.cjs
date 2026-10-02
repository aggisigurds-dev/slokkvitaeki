#!/usr/bin/env node
/**
 * Hermir app.css 560 px spjaldið + FloorPlan.open 1200 px.
 * Eftir 436 á teikningin (#fp-main) að fá mest af skjánum.
 */
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (_) {
    try { ({ chromium } = require(path.join(__dirname, '../../luna-bridge/node_modules/playwright'))); }
    catch (e) { console.error('PLAYWRIGHT VANTAR'); process.exit(2); }
  }
  const html = pathToFileURL(path.join(__dirname, 'teikning-gluggi-fixture.html')).href;
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); }
  catch (_) { browser = await chromium.launch(); }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(html, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TeiknGluggi && window.__teiknHreinsa3d === true, null, { timeout: 5000 });

  await page.evaluate(() => {
    FloorPlan.open(1612, 'Bílabúð Benna', [{ id: 1, serial: 'S0001', type: 'Duft' }]);
  });
  await page.waitForTimeout(350);
  await page.evaluate(() => { if (window.TeiknGluggi) TeiknGluggi.beita(); FloorPlan._renderCanvas(); });
  await page.waitForTimeout(80);

  const desk = await page.evaluate(() => {
    const m = document.getElementById('modal-floorplan');
    const bd = m && m.querySelector('.modal-bd');
    const main = document.getElementById('fp-main');
    const canvas = document.getElementById('fp-canvas');
    const panel = document.getElementById('fp-panel');
    const vw = window.innerWidth, vh = window.innerHeight;
    const mr = main ? main.getBoundingClientRect() : { width: 0, height: 0 };
    const cr = canvas ? canvas.getBoundingClientRect() : { width: 0, height: 0 };
    const pr = panel ? panel.getBoundingClientRect() : { width: 0, height: 0 };
    const br = bd ? bd.getBoundingClientRect() : { width: 0, height: 0 };
    return {
      vw, vh,
      bdW: Math.round(br.width),
      mainW: Math.round(mr.width),
      mainH: Math.round(mr.height),
      canvasW: Math.round(cr.width),
      canvasH: Math.round(cr.height),
      panelW: Math.round(pr.width),
      simi: !!(m && m.classList.contains('fp-simi')),
      rail: !!(m && /SLÖKKVITÆKI/.test(m.innerText)),
      loka: !!(m && /Loka/.test(m.innerText)),
      hlutfall: vw * vh ? (mr.width * mr.height) / (vw * vh) : 0
    };
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.evaluate(() => { if (window.TeiknGluggi) TeiknGluggi.beita(); FloorPlan._renderCanvas(); });
  await page.waitForTimeout(80);
  const simi = await page.evaluate(() => {
    const m = document.getElementById('modal-floorplan');
    const main = document.getElementById('fp-main');
    const mr = main ? main.getBoundingClientRect() : { width: 0, height: 0 };
    return {
      simi: !!(m && m.classList.contains('fp-simi')),
      mainW: Math.round(mr.width),
      mainH: Math.round(mr.height),
      vw: window.innerWidth,
      vh: window.innerHeight
    };
  });

  await browser.close();

  const villur = [];
  const krefst = (ok, msg) => { if (!ok) villur.push(msg); };
  krefst(desk.bdW >= desk.vw * 0.9, 'bolurinn á að vera ≥90% af skjábreidd, var ' + desk.bdW + '/' + desk.vw);
  krefst(desk.mainW >= desk.vw * 0.7, 'teikningin á að vera ≥70% af skjábreidd, var ' + desk.mainW + '/' + desk.vw);
  krefst(desk.mainH >= desk.vh * 0.55, 'teikningin á að vera ≥55% af skjáhæð, var ' + desk.mainH + '/' + desk.vh);
  krefst(desk.canvasW >= 400 && desk.canvasH >= 300, 'striginn á að stækka með glugganum: ' + desk.canvasW + 'x' + desk.canvasH);
  krefst(desk.panelW > 80 && desk.panelW <= 190, 'ræman á að vera þröng en sýnileg, var ' + desk.panelW);
  krefst(desk.hlutfall >= 0.5, 'teikningin á að fá ≥50% af skjáflateyðinni, var ' + (desk.hlutfall * 100).toFixed(1) + '%');
  krefst(desk.rail && desk.loka, 'Loka og tækjaræma mega ekki hverfa');
  krefst(!desk.simi, '1400x900 á ekki að vera fp-simi');
  krefst(simi.simi, '390x844 á að fá fp-simi');
  krefst(simi.mainW >= simi.vw * 0.85, 'á síma á teikningin að fylla breiddina, var ' + simi.mainW + '/' + simi.vw);
  krefst(simi.mainH >= 280, 'á síma á teikningin að fá hæð, var ' + simi.mainH);

  if (villur.length) {
    console.log('TEIKNING-GLUGGI FIXTURE RAUDT');
    villur.forEach(v => console.log('  · ' + v));
    console.log(JSON.stringify({ desk, simi }, null, 2));
    process.exit(1);
  }
  console.log('TEIKNING-GLUGGI FIXTURE GRÆNT — ' + desk.mainW + 'x' + desk.mainH +
    ' (' + Math.round(desk.hlutfall * 100) + '% af skjá) · ræma ' + desk.panelW + ' px.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
