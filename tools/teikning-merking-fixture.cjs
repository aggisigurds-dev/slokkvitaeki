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
  const args = ['--no-sandbox', '--disable-dev-shm-usage'];
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome', args }); }
  catch (_) { browser = await chromium.launch({ args }); }
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[fixture pageerror]', e.message.split('\n')[0]));
  await page.goto(html, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__teiknHreinsa3d === true && window.TeiknMerking && window.TeiknTakn && window.TeiknGaedi, null, { timeout: 5000 });

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

  const valmynd = await page.evaluate(() => {
    const m = TeiknMerking.setjaStimpil('neyðarútgangur', 50, 60);
    TeiknMerking.snuaMerki(m);
    const rot = m.rot;
    const n0 = (FloorPlan.plans[1612].markers || []).length;
    TeiknMerking.opnaValmynd({ clientX: 24, clientY: 24 }, m);
    const menu = document.getElementById('fp-valmynd');
    const txt = menu ? menu.textContent : '';
    TeiknMerking.eydaMerki(m);
    const n1 = (FloorPlan.plans[1612].markers || []).length;
    const okUndo = TeiknMerking.afturkalla();
    const n2 = (FloorPlan.plans[1612].markers || []).length;
    return {
      rot, n0, n1, n2, okUndo,
      snua: /Snúa/.test(txt),
      afrita: /Afrita/.test(txt),
      eyda: /Eyða/.test(txt),
      breyta: /Breyta í/.test(txt)
    };
  });

  const att = await page.evaluate(() => {
    FloorPlan.onCanvasClick({ clientX: 1, clientY: 1, preventDefault: function () {}, stopPropagation: function () {} });
    const b = document.querySelector('.fp-stimpill[data-sign="hose"]');
    if (!b) return { err: 'hose vantar' };
    b.click();
    TeiknMerking.tikk();
    const on = b.classList.contains('on');
    const armadur = document.getElementById('fp-main').classList.contains('fp-armadur');
    const n0 = (FloorPlan.plans[1612].markers || []).filter(m => m.sign === 'hose').length;
    const ev = { clientX: 170, clientY: 130, button: 0, pointerId: 11, preventDefault: function () {}, stopPropagation: function () {} };
    const gripOk = TeiknMerking.grip(ev);
    FloorPlan.onCanvasClick(ev);
    const merki = (FloorPlan.plans[1612].markers || []).filter(m => m.sign === 'hose');
    const sett = merki.find(m => m.x === 170 && m.y === 130) || merki[merki.length - 1];
    if (sett) FloorPlan.onCanvasClick({ clientX: sett.x, clientY: sett.y, button: 0, preventDefault: function () {}, stopPropagation: function () {} });
    TeiknMerking.tikk();
    const box = document.getElementById('fp-merki-adgerd');
    const txt = box && !box.hidden ? box.textContent : '';
    const skipta = box && box.querySelector('[data-act="skipta"][data-sign="ut"]');
    if (skipta) skipta.click();
    TeiknMerking.tikk();
    const eftir = (FloorPlan.plans[1612].markers || []).find(m => m.unitId === (sett && sett.unitId));
    const per = TeiknMerking.setjaStaerd(40, true);
    const eigin = (FloorPlan.plans[1612].markers || []).find(m => m.unitId === (sett && sett.unitId));
    FloorPlan.onCanvasClick({ clientX: 2, clientY: 2, preventDefault: function () {}, stopPropagation: function () {} });
    const sjalf = TeiknMerking.setjaStaerd(96, true);
    TeiknMerking.tikk();
    const hvarfi = document.getElementById('fp-stimpil-staerd');
    const lbl = document.getElementById('fp-stimpil-staerd-lbl');
    return {
      on, armadur, gripOk, n0, n1: merki.length,
      x: sett && sett.x, y: sett && sett.y,
      valið: /Slöngumerki/.test(txt) && /Snúa/.test(txt) && /Eyða/.test(txt) && /Breyta í/.test(txt),
      skipt: !!(eftir && eftir.sign === 'ut'),
      per, eiginStaerd: eigin && eigin.staerd,
      sjalf, hvarfi: hvarfi && hvarfi.value,
      lbl: lbl && lbl.textContent
    };
  });

  const eitt = await page.evaluate(() => {
    FloorPlan.onCanvasClick({ clientX: 1, clientY: 1, preventDefault: function () {}, stopPropagation: function () {} });
    TeiknMerking.velja(null);
    TeiknMerking.setjaStaerd(40, true);
    const b = document.querySelector('.fp-stimpill[data-sign="neyðarútgangur"]');
    if (!b) return { err: 'neyðarútgangur vantar' };
    b.click();
    TeiknMerking.tikk();
    const n0 = (FloorPlan.plans[1612].markers || []).filter(m => m.sign === 'neyðarútgangur').length;
    const ev = { clientX: 90, clientY: 145, button: 0, pointerId: 21, preventDefault: function () {}, stopPropagation: function () {} };
    TeiknMerking.grip(ev);
    FloorPlan.onCanvasClick(ev);
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 90, clientY: 145, bubbles: true }));
    TeiknMerking.tikk();
    const n1 = (FloorPlan.plans[1612].markers || []).filter(m => m.sign === 'neyðarútgangur').length;
    const box = document.getElementById('fp-merki-adgerd');
    const txt = box && !box.hidden ? box.textContent : '';
    const armadur = document.getElementById('fp-main').classList.contains('fp-armadur');
    FloorPlan.onCanvasClick({ clientX: 15, clientY: 150, button: 0, preventDefault: function () {}, stopPropagation: function () {} });
    const n2 = (FloorPlan.plans[1612].markers || []).filter(m => m.sign === 'neyðarútgangur').length;
    FloorPlan.onCanvasClick({ clientX: 18, clientY: 152, button: 0, preventDefault: function () {}, stopPropagation: function () {} });
    const n3 = (FloorPlan.plans[1612].markers || []).filter(m => m.sign === 'neyðarútgangur').length;
    const merki = (FloorPlan.plans[1612].markers || []).find(m => m.sign === 'neyðarútgangur' && m.x === 90);
    let n4 = n3;
    if (merki) {
      FloorPlan.onCanvasClick({ clientX: merki.x, clientY: merki.y, button: 0, preventDefault: function () {}, stopPropagation: function () {} });
      TeiknMerking.tikk();
      const eyda = document.querySelector('#fp-merki-adgerd [data-act="eyda"]');
      if (eyda) eyda.click();
      n4 = (FloorPlan.plans[1612].markers || []).filter(m => m.sign === 'neyðarútgangur').length;
    }
    return {
      n0, n1, n2, n3, n4, armadur,
      eyda: /Eyða/.test(txt),
      nafn: /Neyðarútgangur/.test(txt)
    };
  });

  const undo = await page.evaluate(() => {
    TeiknMerking.setjaStimpil('hose', 11, 12);
    const n0 = (FloorPlan.plans[1612].markers || []).length;
    const ok = TeiknMerking.afturkalla();
    const n1 = (FloorPlan.plans[1612].markers || []).length;
    TeiknMerking.setjaStimpil('ut', 30, 40);
    const n2 = (FloorPlan.plans[1612].markers || []).length;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    const n3 = (FloorPlan.plans[1612].markers || []).length;
    const gaedi = window.TeiknGaedi && TeiknGaedi.setja('fullt') === 'fullt' && TeiknGaedi.vinnuPx() === 5200;
    TeiknGaedi.setja('forskodun');
    const forsk = TeiknGaedi.gildi() === 'forskodun' && TeiknGaedi.vinnuPx() === 1600;
    TeiknGaedi.setja('midlungs');
    const ls = localStorage.getItem('teikn_gaedi');
    const still = TeiknGaedi.gaediHTML();
    const transform = (function () {
      try { TeiknBord.faraAd(80, 90); } catch (e) { return String(e && e.message); }
      const c = document.getElementById('fp-canvas');
      return c && c.style.transform;
    })();
    return {
      n0, ok, n1, n2, n3, gaedi, forsk, ls, still,
      transform,
      afturkallaBtn: !!document.getElementById('fp-afturkalla') || n0 > n1,
      gq: /Forskoðun/.test(still) && /Miðlungs/.test(still) && /Full gæði/.test(still)
    };
  });

  const taeki = await page.evaluate(() => {
    const p = FloorPlan.plans[1612];
    const m = (p.markers || []).find(x => x.unitId === 25446);
    if (!m) return { err: 'tæki vantar' };
    TeiknMerking.velja(m);
    TeiknMerking.tikk();
    const box = document.getElementById('fp-merki-adgerd');
    const txt = box && !box.hidden ? box.textContent : '';
    const lbl = (document.getElementById('fp-stimpil-staerd-lbl') || {}).textContent;
    const n = TeiknMerking.setjaStaerd(72, true);
    const eigin = (FloorPlan.plans[1612].markers || []).find(x => x.unitId === 25446);
    const co = document.querySelector('#fp-merki-adgerd [data-takn="co2"]');
    if (co) co.click();
    TeiknMerking.tikk();
    if (!co) TeiknMerking.breytaTakn(eigin, 'co2');
    const eftir = (FloorPlan.plans[1612].markers || []).find(x => x.unitId === 25446);
    const c = document.getElementById('fp-canvas');
    const z0 = TeiknBord.thysjun();
    const s0 = TeiknMerking.skjaStaerd({ staerd: 40 }, c.getBoundingClientRect().width);
    const inn = document.querySelector('#fp-zoom [data-z="inn"]');
    if (inn) inn.click();
    const z1 = TeiknBord.thysjun();
    const s1 = TeiknMerking.skjaStaerd({ staerd: 40 }, c.getBoundingClientRect().width);
    const a2 = document.querySelector('#fp-haedir [data-h="1"]');
    if (a2) a2.click();
    const virk = TeiknBord.virk();
    const a1 = document.querySelector('#fp-haedir [data-h="0"]');
    if (a1) a1.click();
    const aftur = (FloorPlan.plans[1612].markers || []).find(x => x.unitId === 25446);
    const p0 = FloorPlan.plans[1612];
    if (p0.haedir && p0.haedir[0]) p0.haedir[0].pdfVeggir = [[1, 2, 3, 4]];
    const row = { haedir: JSON.parse(JSON.stringify(p0.haedir || [])) };
    if (row.haedir[0]) row.haedir[0].pdfVeggir = [];
    if (typeof FloorPlan.__eftirSokn === 'function') FloorPlan.__eftirSokn(1612, row);
    const veggirEftir = ((FloorPlan.plans[1612].haedir[0] || {}).pdfVeggir || []).length;
    return {
      txt, lbl, n, eigin: eigin && eigin.staerd, takn: (eftir && eftir.takn) || (aftur && aftur.takn),
      z0, z1, s0, s1, virk, afturStaerd: aftur && aftur.staerd,
      breyta: /Breyta í/.test(txt), veggirEftir
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
  krefst(valmynd.rot === 90, 'snúa átti að setja rot 90, var ' + valmynd.rot);
  krefst(valmynd.snua && valmynd.afrita && valmynd.eyda && valmynd.breyta, 'valmynd vantar liði: ' + JSON.stringify(valmynd));
  krefst(valmynd.n1 === valmynd.n0 - 1, 'eyða átti að fjarlægja stimpil: ' + JSON.stringify(valmynd));
  krefst(valmynd.okUndo && valmynd.n2 === valmynd.n0, 'afturkalla átti að skila stimpil: ' + JSON.stringify(valmynd));
  krefst(att.on && att.armadur, 'smellur á merki á ræmu átti að velja það: ' + JSON.stringify(att));
  krefst(att.gripOk && att.n1 === att.n0 + 1 && att.x === 170, 'valinn stimpill átti að setjast á teikninguna: ' + JSON.stringify(att));
  krefst(att.valið, 'valið merki átti að sýna Snúa/Breyta/Eyða í ræmunni: ' + JSON.stringify(att));
  krefst(att.skipt, 'Breyta í átti að skipta slöngumerki yfir í Út: ' + JSON.stringify(att));
  krefst(att.per === 40 && att.eiginStaerd === 40, 'valið skilti átti að fá eigin stærð 40: ' + JSON.stringify(att));
  krefst(att.sjalf === 96 && att.hvarfi === '96', 'stærðarhvarfi átti að stilla sjálfgefna stærð tákna: ' + JSON.stringify(att));
  krefst(/Stærð tákna/.test(att.lbl || ''), 'ræman á að sýna stærðarhvarfa: ' + att.lbl);
  krefst(eitt.n1 === eitt.n0 + 1 && eitt.n2 === eitt.n1 && eitt.n3 === eitt.n1, 'einn smellur á að setja eitt merki, ekki fleiri: ' + JSON.stringify(eitt));
  krefst(eitt.eyda && eitt.nafn && !eitt.armadur, 'eftir setningu á merkið að vera valið og ræman óvopnuð: ' + JSON.stringify(eitt));
  krefst(eitt.n4 === eitt.n0, 'Eyða átti að fjarlægja merkið sem var sett: ' + JSON.stringify(eitt));
  krefst(undo.ok && undo.n1 === undo.n0 - 1, 'Afturkalla tók ekki síðasta merki: ' + JSON.stringify(undo));
  krefst(undo.n3 === undo.n2 - 1, 'Ctrl+Z tók ekki síðasta stimpil: ' + JSON.stringify(undo));
  krefst(undo.gaedi && undo.forsk && undo.ls === 'midlungs', 'gæði/localStorage: ' + JSON.stringify({ gaedi: undo.gaedi, forsk: undo.forsk, ls: undo.ls }));
  krefst(undo.gq, 'Stillingar vantar Gæði-hnappa');
  krefst(/translate/.test(String(undo.transform || '')) && /scale/.test(String(undo.transform || '')), 'faraAd átti að þysja: ' + undo.transform);
  krefst(taeki.n === 72 && taeki.eigin === 72, 'stærðarhvarfi átti að stilla tæki, ekki bara skilti: ' + JSON.stringify(taeki));
  krefst(taeki.takn === 'co2', 'Breyta í átti að skipta tæki yfir í CO₂ tákn: ' + JSON.stringify(taeki));
  krefst(taeki.breyta, 'valið tæki átti að sýna Breyta í: ' + JSON.stringify(taeki));
  krefst(taeki.z1 > taeki.z0 && taeki.s1 > taeki.s0, 'stimpill átti að stækka með zoom inn, ekki minnka: ' + JSON.stringify(taeki));
  krefst(taeki.virk === 1, 'hæðaflipi 2. hæð átti að virkjast: ' + JSON.stringify(taeki));
  krefst(taeki.afturStaerd === 72, 'tækjastærð átti að sitja á 1. hæð eftir skipti: ' + JSON.stringify(taeki));
  krefst(taeki.veggirEftir > 0, 'sækja af þjóni mátti ekki núlla Skýrari veggi: ' + JSON.stringify(taeki));

  if (villur.length) {
    console.log('TEIKNING-MERKING FIXTURE RAUDT');
    villur.forEach(v => console.log('  · ' + v));
    process.exit(1);
  }
  console.log('TEIKNING-MERKING FIXTURE GRÆNT — dráttur, hæðir, stimplar og félagsskipti.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
