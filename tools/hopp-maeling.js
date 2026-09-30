/* hopp-maeling.js — mælir HOPP og MULTI-LOAD RACE í lifandi viðmóti.
 *
 * Agnar 30.09.2026: „fiktaðu í öllu … til að reyna finna restina af multi load
 * race hopp."  Og eitt af því sem sú nótt leiddi í ljós: appið á 66 verði og
 * ENGINN þeirra opnar síðu. Allt sem fannst, fannst með handvirkum vafra.
 * Þetta tól gerir þá mælingu endurtakanlega, svo „hoppar ekki lengur" sé TALA
 * sem einhver getur keyrt aftur — ekki fullyrðing.
 *
 * NOTKUN — límdu skrána í vafraborðið á opinni fyrirtækjasíðu, svo:
 *
 *   await Hopp.keyra([
 *     { heiti: 'Yfirferð',  vel: '.ut-svc',   nr: 9  },
 *     { heiti: 'Hleðsla',   vel: '.ut-svc',   nr: 10 },
 *     { heiti: 'Hak',       vel: '.ut-check', nr: 6  },
 *     { heiti: 'Ónýtt',     vel: '.ut-onytt', nr: 4  },
 *   ]);
 *
 * VIÐMIÐIÐ ER AÐALATRIÐIÐ. Án þess er ekki hægt að greina á milli þess sem
 * SMELLURINN veldur og þess sem einhver púls gerði hvort eð er. Í nótt var
 * fyrsta ályktun mín röng af þeirri ástæðu: ég hélt að sjö fyrirspurnir væru
 * púls sem lenti í mæliglugganum. Viðmiðið sýndi núll í kyrrstöðu — smellurinn
 * olli þeim öllum. Hver mæling hér keyrir því AÐGERÐARLAUSAN glugga fyrst.
 *
 * Mælt er þrennt, og öll þrjú þarf:
 *   fyrirspurnir  — .from()-köll gegnum DB.sb (gripið við kallið, ekki á netinu,
 *                   svo skyndiminni feli ekki kallandann)
 *   teikningar    — barnabreytingar á íláti; ein aðgerð á að gefa EINA
 *   hopp          — færsla á viðmiðunarröð í px, og layout-shift ofan á
 */
(function () {
  'use strict';
  if (window.Hopp) { console.log('[hopp] þegar hlaðið'); return; }

  const BID_MS = 2500;      // gluggi eftir hverja aðgerð
  const HVILD_MS = 1000;    // hlé milli mælinga svo þær blandist ekki

  function sofa(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Viðmiðunarhnútur: sá sem á að standa kyrr. Sjálfgefið sjöunda tækjaröðin,
  // annars fyrsta spjaldið sem finnst.
  function vidmidHnutur(vel) {
    if (vel) return document.querySelector(vel);
    return document.querySelectorAll('.ut-row')[6]
        || document.querySelector('.ut-row')
        || document.querySelector('._dyg-section, .uttekt-cols, #companies-main');
  }
  function topp(el) { return el ? Math.round(el.getBoundingClientRect().top) : null; }

  // Eitt mælitímabil. `adgerd` má vera null — þá er þetta VIÐMIÐ.
  async function timabil(adgerd, val) {
    val = val || {};
    const ilatVel = val.ilat || '.uttekt-cols, ._dyg-section, #companies-main';
    const ilat = document.querySelector(ilatVel);
    const vidmid = vidmidHnutur(val.vidmid);

    const fyrirspurnir = [];
    let teikningar = 0, shift = 0;

    // .from() gripið — kallandinn sést jafnvel þótt rest-samnyting deili svarinu
    const sb = (window.DB && window.DB.sb) || null;
    const uppr = sb ? sb.from.bind(sb) : null;
    if (sb) sb.from = function (tafla) { fyrirspurnir.push(tafla); return uppr(tafla); };

    const mo = ilat ? new MutationObserver(function () { teikningar++; }) : null;
    if (mo) mo.observe(ilat, { childList: true, subtree: true });

    let po = null;
    try {
      po = new PerformanceObserver(function (l) {
        l.getEntries().forEach(function (e) { if (!e.hadRecentInput) shift += e.value; });
      });
      po.observe({ type: 'layout-shift', buffered: false });
    } catch (_) {}

    const toppFyrir = topp(vidmid);
    if (adgerd) { try { adgerd(); } catch (e) { console.warn('[hopp] aðgerð kastaði', e); } }
    await sofa(val.bid || BID_MS);

    if (sb) sb.from = uppr;
    if (mo) mo.disconnect();
    if (po) try { po.disconnect(); } catch (_) {}

    const talning = {};
    fyrirspurnir.forEach(function (t) { talning[t] = (talning[t] || 0) + 1; });

    return {
      fyrirspurnir: fyrirspurnir.length,
      toflur: Object.keys(talning).sort(function (a, b) { return talning[b] - talning[a]; })
        .map(function (k) { return k + '×' + talning[k]; }).join(' · '),
      teikningar: teikningar,
      hopp_px: (toppFyrir != null && topp(vidmid) != null) ? topp(vidmid) - toppFyrir : null,
      shift: +shift.toFixed(4),
    };
  }

  async function keyra(adgerdir, val) {
    val = val || {};
    const nidur = [];

    // 1) VIÐMIÐ — hvað gerist þegar EKKERT er gert
    nidur.push(Object.assign({ adgerd: '— viðmið (engin aðgerð) —' }, await timabil(null, val)));
    await sofa(HVILD_MS);

    // 2) hver aðgerð, hver með sitt tímabil
    for (const a of (adgerdir || [])) {
      const smella = function () {
        const hnappar = document.querySelectorAll(a.vel);
        const el = hnappar[a.nr || 0];
        if (!el) throw new Error('fann ekki ' + a.vel + '[' + (a.nr || 0) + '] (' + hnappar.length + ' til)');
        el.click();
      };
      nidur.push(Object.assign({ adgerd: a.heiti || a.vel }, await timabil(smella, val)));
      await sofa(HVILD_MS);
    }

    // 3) VIÐMIÐ AFTUR — hafi talan hækkað er eitthvað farið að ganga sem gerði það ekki áður
    nidur.push(Object.assign({ adgerd: '— viðmið eftir á —' }, await timabil(null, val)));

    try { console.table(nidur); } catch (_) { console.log(nidur); }
    const v0 = nidur[0], v1 = nidur[nidur.length - 1];
    if (v1.fyrirspurnir > v0.fyrirspurnir) {
      console.warn('[hopp] ⚠ kyrrstaðan fór úr ' + v0.fyrirspurnir + ' í ' + v1.fyrirspurnir +
        ' fyrirspurnir — aðgerðirnar ræstu eitthvað sem heldur áfram að ganga.');
    }
    return nidur;
  }

  // Tilbúið sett fyrir úttektarsíðuna — það sem Agnar smellir á í raun.
  function uttekt() {
    return keyra([
      { heiti: 'Yfirferð', vel: '.ut-svc', nr: 9 },
      { heiti: 'Hleðsla', vel: '.ut-svc', nr: 10 },
      { heiti: 'Hak', vel: '.ut-check', nr: 6 },
      { heiti: 'Ónýtt', vel: '.ut-onytt', nr: 4 },
      { heiti: 'Velja allt', vel: '.ut-selall', nr: 0 },
    ]);
  }

  window.Hopp = { keyra: keyra, uttekt: uttekt, timabil: timabil };
  console.log('[hopp] tilbúið — Hopp.uttekt() eða Hopp.keyra([{heiti,vel,nr}])');
})();
