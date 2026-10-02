#!/usr/bin/env node
/**
 * Tómur FloorPlan má ekki vera hvítt blað. 1. hæð á prófílnum á að opna forskoðun.
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
  const html = pathToFileURL(path.join(__dirname, 'teikning-opna-fixture.html')).href;
  let browser;
  const args = ['--no-sandbox', '--disable-dev-shm-usage'];
  try { browser = await chromium.launch({ channel: 'chrome', args }); }
  catch (_) { browser = await chromium.launch({ args }); }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//9k=',
    'base64'
  );
  await page.route(/teikn-mynd/, async route => {
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: jpeg });
  });
  await page.goto(html, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TeiknGluggi && window.TeikningaForskodun, null, { timeout: 5000 });

  await page.evaluate(() => {
    FloorPlan.open(204, 'Heimaleiga - G14 ehf', []);
    if (window.TeiknGluggi) TeiknGluggi.beita();
  });
  await page.waitForTimeout(200);

  const tomur = await page.evaluate(() => {
    const m = document.getElementById('modal-floorplan');
    const bd = m && m.querySelector('.modal-bd');
    const dm = document.getElementById('fp-drop-msg');
    const bg = bd ? getComputedStyle(bd).backgroundColor : '';
    const drop = dm ? getComputedStyle(dm).color : '';
    return {
      open: !!(m && m.classList.contains('open')),
      bg,
      drop,
      dropText: dm ? dm.textContent : '',
      cta: !!(dm && dm.querySelector('.fp-drop-cta')),
      canvasOn: document.getElementById('fp-canvas') && document.getElementById('fp-canvas').style.display !== 'none'
    };
  });

  await page.waitForTimeout(900);
  const yfir = await page.evaluate(() => {
    const o = document.getElementById('fp-teikn-yfir');
    return {
      yfir: !!(o && o.style.display !== 'none'),
      yfirTexti: o ? o.innerText.slice(0, 240) : '',
      fetches: window.__fetches.slice()
    };
  });

  await page.evaluate(() => {
    const m = document.getElementById('modal-floorplan');
    if (m) { m.classList.remove('open'); m.style.display = 'none'; }
    const o = document.getElementById('fp-teikn-yfir'); if (o) o.remove();
  });
  await page.click('button._bupp-teikn[data-golv="h:1"]');
  await page.waitForFunction(() => {
    const tfs = document.getElementById('tfs');
    const img = document.querySelector('#tfs-sv img');
    const bid = (document.getElementById('tfs-bid') || {}).textContent || '';
    return !!(tfs && ((img && img.naturalWidth > 0) || /Náði ekki/.test(bid) || (document.querySelectorAll('#tfs .tfs-kort').length > 0 && bid === '')));
  }, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  const forskodun = await page.evaluate(() => {
    const tfs = document.getElementById('tfs');
    const kort = tfs ? tfs.querySelectorAll('.tfs-kort').length : 0;
    const titill = (document.getElementById('tfs-titill') || {}).textContent || '';
    const bid = document.getElementById('tfs-bid');
    const img = document.querySelector('#tfs-sv img');
    return {
      tfs: !!tfs,
      synilegt: tfs ? getComputedStyle(tfs).display !== 'none' : false,
      z: tfs ? getComputedStyle(tfs).zIndex : '',
      kort,
      titill,
      mynd: !!(img && img.src && img.naturalWidth > 0),
      myndVilla: /Náði ekki/.test(bid && bid.textContent || ''),
      bidDisplay: bid ? getComputedStyle(bid).display : '',
      yfirlag: (() => {
        const sv = document.getElementById('tfs-sv');
        if (!sv) return '';
        const r = sv.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + 80, r.top + 80);
        return el ? (el.id || el.className || el.tagName) : '';
      })()
    };
  });

  await browser.close();

  const villur = [];
  const rgb = tomur.bg.replace(/\s/g, '');
  if (!tomur.open) villur.push('FloorPlan.open bjó ekki til glugga');
  if (rgb === 'rgb(255,255,255)' || rgb === '#fff' || rgb === 'white') villur.push('modal-bd er enn hvítt: ' + tomur.bg);
  if (!/26,\s*24,\s*20/.test(tomur.bg) && !/1a1814/i.test(tomur.bg)) villur.push('modal-bd á að vera #1a1814, var ' + tomur.bg);
  if (!/Hlað upp/.test(tomur.dropText)) villur.push('drop-skilaboð vantar');
  if (!tomur.cta) villur.push('Sækja teikningu hússins vantar á tóma borðið');
  if (tomur.canvasOn) villur.push('canvas á ekki að vera sýnilegur án myndar');
  if (!yfir.yfir && !yfir.fetches.some(u => /teikn-listi/.test(u))) {
    villur.push('tómt borð átti að sækja teikningar hússins');
  }
  if (!forskodun.tfs) villur.push('1. hæð opnaði ekki #tfs');
  if (!forskodun.synilegt) villur.push('#tfs er falið');
  if (forskodun.kort < 1) villur.push('forskoðun sýndi engin blöð');
  if (forskodun.myndVilla) villur.push('forskoðun náði ekki í myndina');
  if (forskodun.mynd && forskodun.bidDisplay !== 'none') villur.push('Sæki-yfirlagið hylur teikninguna: display=' + forskodun.bidDisplay);
  if (forskodun.mynd && forskodun.yfirlag === 'tfs-bid') villur.push('smellur á teikninguna lendir á Sæki-yfirlaginu');
  if (!/Grensásvegur/.test(forskodun.titill) && !/Teikningar/.test(forskodun.titill)) {
    villur.push('titill forskoðunar: ' + forskodun.titill);
  }

  const ut = {
    tomur, yfir: { yfir: yfir.yfir, fetches: yfir.fetches }, forskodun, villur
  };
  console.log(JSON.stringify(ut, null, 2));
  if (villur.length) {
    console.error('TEIKNING-OPNA FIXTURE RAUDT — ' + villur.join(' · '));
    process.exit(1);
  }
  console.log('TEIKNING-OPNA FIXTURE GRÆNT — dokkkað tómt borð, Sækja, 1. hæð opnar forskoðun.');
}

main().catch(e => { console.error(e); process.exit(1); });
