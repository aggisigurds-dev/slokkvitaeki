#!/usr/bin/env node
/**
 * Vafrapróf: húsupplýsingar úr skrám á fyrirtækjabannernum (patch 363 v3 +
 * netlify/functions/hus-upplysingar). Keyrir í ALVÖRU Chromium gegnum
 * tools/bh-browser.cjs (relay fyrir egress-proxy Claude Code remote).
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node tools/test-banner-skrar.cjs [grunnslóð]
 *
 * Sjálfgefin grunnslóð er framleiðslan. Til að prófa ÁÐUR en deployað er:
 *   PORT=4160 NODE_USE_ENV_PROXY=1 node <scratch>/slokkvitaeki-local.mjs   (static + fallið)
 *   … node tools/test-banner-skrar.cjs http://localhost:4160
 *
 * Prófar með raunverulegum fyrirtækjum: 411 Jarðboranir (Dalshraun 1B, Hfj —
 * 2 teikningar, engar grunnmyndir → aðeins tengill) og Garðatorg 7 (Garðabær —
 * 8 hæðir + kjallari → bláar flísar). Smellir á flís, sannreynir vistun og
 * SETUR GILDIÐ AFTUR eins og það var — gögn Agnars standa óbreytt eftir prófið.
 */
const path = require('path');
const { launch } = require(path.join(__dirname, 'bh-browser.cjs'));

const BASE = (process.argv[2] || 'https://slokkvitaeki.netlify.app').replace(/\/$/, '');
const SHOT = process.env.SHOT || '';                       // SHOT=/leið/mynd.png → skjámynd af bannernum
let ok = 0, fail = 0;
const pass = (m) => { ok++; console.log('  ✔ ' + m); };
const flop = (m, extra) => { fail++; console.log('  ✘ ' + m + (extra ? ' — ' + extra : '')); };
const check = (cond, m, extra) => (cond ? pass(m) : flop(m, extra));

async function opna(page, coId) {
  // Hash-breyting ein og sér endurhleður ekki appið — förum um about:blank svo
  // hvert félag fái ferska síðu (eins og notandi sem opnar tengilinn).
  if (page.url() !== 'about:blank') await page.goto('about:blank');
  await page.goto(`${BASE}/#company/${coId}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  // Bannerinn teiknast þegar Companies.list + AppSettings eru komin — bíðum eftir boxinu.
  await page.waitForSelector(`#companies-main .co-banner [data-co="${coId}"], .co-banner [data-co="${coId}"]`, { timeout: 90000 });
  return page.locator(`.co-banner [data-co="${coId}"]`).first();
}

(async () => {
  const { context, cleanup } = await launch();
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const villur = [];
  page.on('pageerror', (e) => villur.push(String(e && e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' && /363|hus-upplysingar/.test(m.text())) villur.push(m.text()); });

  try {
    // ── 1. Jarðboranir: aðeins teikningatengill (0 grunnmyndir) ──────────────
    const box411 = await opna(page, 411);
    const nafn411 = await page.evaluate(() => { const c = (window.Companies && Companies.list || []).find(x => +x.id === 411); return c ? (c.name || c.nafn || c.heiti) + ' · ' + c.heimilisfang : null; });
    console.log('  411 =', nafn411);
    const teikn411 = box411.locator('a._bupp-teikn');
    await teikn411.waitFor({ state: 'visible', timeout: 60000 });
    const t411 = (await teikn411.textContent() || '').trim();
    check(/2 teikningar/.test(t411) && /Hafnarfj/.test(t411), 'Jarðboranir: Teikningar-línan segir „2 teikningar · Kortasjá Hafnarfjarðar"', t411);
    const href411 = await teikn411.getAttribute('href');
    check(/\/kjarni\/turbopaint\?leit=Dalshraun%201B$/.test(href411 || ''), 'tengillinn opnar TurboPaint með ?leit=Dalshraun 1B', href411);
    check((await teikn411.getAttribute('target')) === '_blank', 'tengillinn opnast í nýjum flipa');
    check((await box411.locator('._bupp-flis._skra').count()) === 0, 'engar skrá-flísar þegar safnið á engar grunnmyndir');
    const svar411 = await page.evaluate(() => window.BannerUpplysingar.skrarSvar(411));
    check(svar411 && svar411.eign && svar411.eign.landnr === 212944, 'skrarSvar(411) geymir eignina (L 212944)', JSON.stringify(svar411 && svar411.eign));
    check(!!sessionStorage_ok(await page.evaluate(() => { try { return sessionStorage.getItem('bupp_skrar_v1_411'); } catch (_) { return null; } })), 'svarið er í sessionStorage-skyndiminni');

    // ── 2. Garðatorg 7: bláar flísar úr skrám ─────────────────────────────────
    const coGb = await page.evaluate(() => {
      const c = (window.Companies && Companies.list || []).filter(x => /^Gar[ðd]atorg(i)?\s+7\b/i.test(String(x.heimilisfang || '')));
      return c.map(x => ({ id: +x.id, name: x.name || x.nafn || x.heiti, heimilisfang: x.heimilisfang }));
    });
    console.log('  Garðatorg 7 félög:', JSON.stringify(coGb));
    if (!coGb.length) { flop('fann ekkert félag á Garðatorgi 7'); }
    else {
      const co = coGb[0].id;
      const box = await opna(page, co);
      const skra = box.locator('._bupp-flis._skra');
      // Fyrsta svar fyrir stóra lóð (Garðatorg 7 = 1052 teikningar) getur tekið drjúga
      // stund þegar fallið, kjarni-API-ið og map.is-setan eru öll köld — bíðum lengur.
      await skra.first().waitFor({ state: 'attached', timeout: 120000 }).catch(() => {});
      const merki = await skra.allTextContents();
      const fyrir = await page.evaluate((id) => ({ haedir: window.BannerUpplysingar.gildi(id, 'haedir'), kjallari: window.BannerUpplysingar.gildi(id, 'kjallari') }), co);
      console.log('  gildi fyrir próf:', JSON.stringify(fyrir), '· skrá-flísar:', JSON.stringify(merki));
      const von = [];
      if (!fyrir.haedir) von.push('8 hæðir');
      if (!fyrir.kjallari) von.push('kjallari');
      check(von.every(v => merki.includes(v)), 'skrá-flísarnar sem vantar í reitina birtast: ' + von.join(', '), JSON.stringify(merki));
      check(!merki.includes('8 hæðir') || !fyrir.haedir, 'engin flís fyrir reit sem er þegar skráður');
      const litur = merki.length ? await skra.first().evaluate(el => getComputedStyle(el).borderColor + ' / ' + getComputedStyle(el).borderStyle) : '';
      check(/rgba?\(96, 165, 250.*dashed/.test(litur), 'skrá-flísin er blá með brotalínu', litur);
      const titill = merki.length ? await skra.first().getAttribute('title') : '';
      check(/Úr skrám \(Kortasjá Garðabæjar/.test(titill || ''), 'flísin segir hvaðan tillagan kemur', titill);
      const teikn = box.locator('a._bupp-teikn');
      const tt = (await teikn.textContent() || '').trim();
      const nT = Number((tt.match(/(\d{3,4}) teikningar · Kortasjá Garðabæjar/) || [])[1]);
      check(nT >= 500, 'Teikningar-línan: „≥500 teikningar · Kortasjá Garðabæjar" (1052 þann 14.09.2026)', tt);

      // Smellur á „8 hæðir" → reiturinn hæðir fær 8 og vistast → sett aftur STRAX
      // (viljandi án biðar: tvær vistanir á sama reit í kapphlaupi var raunveruleg
      // villa — sú seinni á alltaf að standa, bæði hér og á þjóninum).
      if (!fyrir.haedir && merki.includes('8 hæðir')) {
        await skra.filter({ hasText: '8 hæðir' }).first().click();
        const inp = box.locator('input.co-bupp-reitur[data-reitur="haedir"]');
        await page.waitForFunction((id) => window.BannerUpplysingar.gildi(id, 'haedir') === '8', co, { timeout: 30000 }).catch(() => {});
        const eftir = await page.evaluate((id) => window.BannerUpplysingar.gildi(id, 'haedir'), co);
        check(eftir === '8', 'smellur á „8 hæðir" vistar 8 í reitinn hæðir (AppSettings)', String(eftir));
        check((await inp.inputValue()) === '8', 'reiturinn sýnir 8');
        check((await box.locator('._bupp-flis._skra', { hasText: '8 hæðir' }).count()) === 0, 'flísin hverfur þegar reiturinn er fylltur');
        // Aftur eins og var (tómt): eyða og Enter (Enter → blur → vista('')) — alvöru
        // fókus-missir svo samstilla() megi endurteikna og tillagan komi aftur.
        await inp.fill('');
        await inp.press('Enter');
        await page.waitForFunction((id) => !window.BannerUpplysingar.gildi(id, 'haedir'), co, { timeout: 30000 }).catch(() => {});
        const aftur = await page.evaluate((id) => window.BannerUpplysingar.gildi(id, 'haedir'), co);
        check(!aftur, 'hæðir sett aftur á tómt eins og fyrir prófið', String(aftur));
        // Þjónninn á líka að enda á tómu — lesum ferskt eintak framhjá skyndiminni patch 85.
        // Vistanirnar fara í röð („8" og svo „") svo þjónninn getur verið hálfnaður — bíðum allt að 25 s.
        let server = '8';
        for (let i = 0; i < 25 && server; i++) {
          server = await page.evaluate(async (id) => { const r = await window.DB.sb.from('app_settings').select('settings').eq('id', 1).maybeSingle(); const b = r.data && r.data.settings && r.data.settings.banner_upplysingar || {}; return (b[String(id)] || {}).haedir; }, co);
          if (server) await page.waitForTimeout(1000);
        }
        check(!server, 'þjónninn (app_settings) ber líka tómt gildi eftir prófið (innan 25 s)', String(server));
        // Eftir endurteiknun kemur flísin aftur.
        await page.waitForFunction((id) => Array.from(document.querySelectorAll('.co-banner [data-co="' + id + '"] ._bupp-flis._skra')).some(b => /8 hæðir/.test(b.textContent || '')), co, { timeout: 30000 }).catch(() => {});
        check((await box.locator('._bupp-flis._skra', { hasText: '8 hæðir' }).count()) >= 1, 'tillagan „8 hæðir" birtist aftur þegar reiturinn tæmist');
      } else {
        console.log('  (hæðir þegar skráðar — smell-prófinu sleppt til að hrófla ekki við gildinu)');
      }

      if (SHOT) try { await page.screenshot({ path: SHOT, clip: await box.boundingBox().then(b => b && { x: Math.max(0, b.x - 420), y: Math.max(0, b.y - 10), width: Math.min(1280, b.width + 440), height: b.height + 20 }) || undefined }); console.log('  skjámynd:', SHOT); } catch (e) { console.log('  (skjámynd mistókst: ' + e.message + ')'); }

      // Tengillinn opnar TurboPaint með leitina fyllta — alvöru nýr flipi.
      const [nyr] = await Promise.all([
        context.waitForEvent('page', { timeout: 60000 }),
        teikn.click(),
      ]);
      await nyr.waitForLoadState('domcontentloaded', { timeout: 90000 });
      const headSpan = nyr.locator('span.font-semibold', { hasText: 'Garðatorg 7' }).first();
      await headSpan.waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
      check((await headSpan.count()) > 0, 'nýi flipinn: TurboPaint sýnir leitina „Garðatorg 7"', nyr.url());
      check(!/[?&]leit=/.test(nyr.url()), '?leit= er horfið úr slóð nýja flipans', nyr.url());
      await nyr.close();
    }

    // ── 3. Óvisst heimilisfang: engar flísar, „Næsta lóð … · óvisst" ───────────
    const r = await page.evaluate(async () => {
      const x = await fetch('/.netlify/functions/hus-upplysingar?heimilisfang=' + encodeURIComponent('Borgartún 12, 105 Reykjavík'));
      return { status: x.status, svar: await x.json() };
    });
    check(r.status === 200 && r.svar.eign && r.svar.eign.oviss === true && Object.keys(r.svar.tillogur || {}).length === 0, 'Borgartún 12 (ekki í Staðfangaskrá) → oviss, engar tillögur', JSON.stringify(r.svar.eign));
    const r2 = await page.evaluate(async () => (await fetch('/.netlify/functions/hus-upplysingar?heimilisfang=Rugl')).status);
    check(r2 === 400, 'ógilt heimilisfang → 400', String(r2));
  } catch (e) {
    flop('próf hrundi', e && e.stack || String(e));
  } finally {
    if (villur.length) console.log('  villur í síðu:', villur.slice(0, 5));
    await cleanup();
  }
  console.log(`${ok}/${ok + fail} passed`);
  process.exit(fail ? 1 : 0);
})();

function sessionStorage_ok(raw) { try { const o = JSON.parse(raw); return o && o.svar && o.svar.eign; } catch (_) { return null; } }
