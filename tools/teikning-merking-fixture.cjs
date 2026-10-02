#!/usr/bin/env node
/**
 * Hermir drátt á léttvatn á 1. hæð, hæðaflipa, fyrirtækjaskipti.
 * Krefst: merki situr eftir close/reopen, situr á 1. hæð ekki 2., 1612
 * merki hverfa ekki þegar 388 er opnað.
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
  const html = pathToFileURL(path.join(__dirname, 'teikning-merking-fixture.html')).href;
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); }
  catch (_) { browser = await chromium.launch(); }
  const page = await browser.newPage();
  await page.goto(html, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__teiknHreinsa3d === true && window.TeiknMerking && window.TeiknTakn, null, { timeout: 5000 });

  const lettvatn = { id: 25446, type: 'Léttvatn', serial: 'TMP-WFCMBQ', status: 'active' };

  await page.evaluate((u) => {
    if (!window.FloorPlan) throw new Error('FloorPlan vantar: ' + Object.keys(window).filter(k => /[A-Z]/.test(k[0])).slice(0, 30).join(','));
    FloorPlan.open(1612, 'Bílabúð Benna', [u]);
    if (window.TeiknMerking && TeiknMerking.tikk) TeiknMerking.tikk();
  }, lettvatn);
  await page.waitForTimeout(350);

  const eftirDropp = await page.evaluate((u) => {
    const main = document.getElementById('fp-main');
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    drop.clientX = 80; drop.clientY = 90;
    drop.dataTransfer = { getData: function (t) { return t === 'application/x-fp-unit' ? String(u.id) : ''; } };
    main.dispatchEvent(drop);
    const st = TeiknMerking.setjaStimpil('ut', 40, 50);
    const raf = TeiknMerking.setjaStimpil('rafmagn', 60, 70);
    const skl = TeiknMerking.setjaStimpil('skilti_slt', 100, 40);
    const sls = TeiknMerking.setjaStimpil('skilti_slanga', 120, 55);
    TeiknMerking.vistaAdThjoni();
    const p = FloorPlan.plans[1612];
    const rail = document.getElementById('fp-unit-list');
    const rod = rail && rail.querySelector('[data-unit-id="' + u.id + '"]');
    return {
      modal: !!document.getElementById('modal-floorplan'),
      hreinsa: !!document.querySelector('.fp-hreinsa-btn'),
      d3: !!document.querySelector('.fp-3d-btn'),
      haedir: !!document.getElementById('fp-haedir'),
      stimpil: !!document.getElementById('fp-stimpil'),
      merki: (p.markers || []).map(x => ({ unitId: x.unitId, kind: x.kind, sign: x.sign, x: x.x, y: x.y })),
      nofn: [...document.querySelectorAll('.fp-stimpill')].map(b => b.textContent.replace(/\s+/g, ' ').trim()),
      staðsett: rail && /Staðsetning/.test(rail.textContent),
      draggable: !!(rod && rod.draggable),
      upserts: window.__upserts.length,
      haed0: (p.haedir && p.haedir[0] && p.haedir[0].markers || []).length,
      drop: !!(st && raf && skl && sls)
    };
  }, lettvatn);

  const haedir = await page.evaluate(() => {
    const ny = document.querySelector('#fp-haedir [data-h="ny"]');
    if (ny) ny.click();
    const a2btn = document.querySelector('#fp-haedir [data-h="1"]');
    if (a2btn) a2btn.click();
    const p = FloorPlan.plans[1612];
    const a2 = (p.markers || []).slice();
    const a1btn = document.querySelector('#fp-haedir [data-h="0"]');
    if (a1btn) a1btn.click();
    const a1 = (p.markers || []).slice();
    return {
      nHaedir: p.haedir && p.haedir.length,
      a2: a2.map(m => m.unitId),
      a1: a1.map(m => ({ unitId: m.unitId, x: m.x, y: m.y, kind: m.kind })),
      haed0: (p.haedir[0].markers || []).map(m => m.unitId),
      haed1: (p.haedir[1] && p.haedir[1].markers || []).map(m => m.unitId)
    };
  });

  await page.evaluate(() => { FloorPlan.open(388, 'Félag 388', []); });
  await page.waitForTimeout(280);
  const a388 = await page.evaluate(() => {
    const p388 = FloorPlan.plans[388] || { markers: [] };
    const p1612 = FloorPlan.plans[1612] || { markers: [] };
    return {
      merki388: (p388.markers || []).length,
      merki1612: (p1612.markers || []).length,
      stjorn: !!(document.querySelector('.fp-hreinsa-btn') && document.querySelector('.fp-3d-btn') && document.getElementById('fp-haedir')),
      rail: !!(document.getElementById('fp-panel') && /SLÖKKVITÆKI/.test(document.body.innerText)),
      loka: /Loka/.test(document.body.innerText),
      vista: /Vista/.test(document.body.innerText)
    };
  });

  await page.evaluate((u) => { FloorPlan.open(1612, 'Bílabúð Benna', [u]); }, lettvatn);
  await page.waitForTimeout(280);
  const aftur = await page.evaluate(() => {
    const p = FloorPlan.plans[1612];
    return {
      merki: (p.markers || []).map(m => m.unitId),
      stimpil: !!(p.markers || []).some(m => m.kind === 'sign'),
      haedir: !!document.getElementById('fp-haedir'),
      stika: !!document.getElementById('fp-stimpil')
    };
  });

  await browser.close();

  const villur = [];
  const krefst = (ok, msg) => { if (!ok) villur.push(msg); };
  krefst(eftirDropp.hreinsa && eftirDropp.d3 && eftirDropp.haedir, 'stjórn vantar: ' + JSON.stringify(eftirDropp));
  krefst(eftirDropp.stimpil, 'stimpilröð vantar');
  krefst(eftirDropp.nofn && eftirDropp.nofn.some(n => /Rafmagnstafla/.test(n)), 'Rafmagnstafla vantar á rönd: ' + JSON.stringify(eftirDropp.nofn));
  krefst(eftirDropp.nofn && eftirDropp.nofn.some(n => /Skilti slökkvitæki/.test(n)), 'Skilti slökkvitæki vantar');
  krefst(eftirDropp.nofn && eftirDropp.nofn.some(n => /Skilti brunaslanga/.test(n)), 'Skilti brunaslanga vantar');
  krefst(eftirDropp.nofn && eftirDropp.nofn.some(n => /Neyðarútgangur/.test(n)) && eftirDropp.nofn.some(n => /^Út$/.test(n) || /\bÚt\b/.test(n)), 'Neyðarútgangur/Út vantar');
  krefst(eftirDropp.drop && eftirDropp.merki.some(m => m.unitId === 25446 && m.x === 80), 'léttvatn fór ekki á 1. hæð: ' + JSON.stringify(eftirDropp.merki));
  krefst(eftirDropp.draggable, 'tæki á ræmunni á að vera draggandi');
  krefst(eftirDropp.merki.some(m => m.kind === 'sign' && m.sign === 'ut'), 'Út-stimpill vantar');
  krefst(eftirDropp.merki.some(m => m.kind === 'sign' && m.sign === 'rafmagn'), 'Rafmagnstafla á að vera merki');
  krefst(eftirDropp.merki.some(m => m.kind === 'sign' && m.sign === 'skilti_slt'), 'Skilti slökkvitæki á að vera merki');
  krefst(eftirDropp.merki.some(m => m.kind === 'sign' && m.sign === 'skilti_slanga'), 'Skilti brunaslanga á að vera merki');
  krefst(!eftirDropp.merki.some(m => m.sign && m.kind !== 'sign'), 'stimpill mátti ekki verða uttaeki-röð');
  krefst(eftirDropp.upserts > 0, 'ekkert upsert á teikning_bord');
  krefst(haedir.nHaedir >= 2, 'vantar 2 hæðir: ' + JSON.stringify(haedir));
  krefst(haedir.a2.length === 0 && haedir.haed1.length === 0, 'merki áttu að sitja á 1. hæð, ekki 2.: ' + JSON.stringify(haedir));
  krefst(haedir.a1.some(m => m.unitId === 25446) && haedir.haed0.includes(25446), 'merki týndust við að skipta um hæð: ' + JSON.stringify(haedir));
  krefst(a388.stjorn && a388.loka && a388.vista && a388.rail, '388 mátti ekki missa stjórn/Loka/Vista/rail');
  krefst(a388.merki1612 >= 2, '1612 merki máttu ekki hverfa við félagsskipti: ' + a388.merki1612);
  krefst(aftur.merki.includes(25446) && aftur.stimpil && aftur.haedir && aftur.stika, 'close/reopen 1612 tapaði merkjum: ' + JSON.stringify(aftur));

  if (villur.length) {
    console.log('TEIKNING-MERKING FIXTURE RAUDT');
    villur.forEach(v => console.log('  · ' + v));
    process.exit(1);
  }
  console.log('TEIKNING-MERKING FIXTURE GRÆNT — dráttur, hæðir, stimplar og félagsskipti.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
