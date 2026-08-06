/* === BAKK-TAKKI SÍMANS — Í ÖLLU APPINU OG ÖPPUNUM (2026-07-21) ===
 *
 * Ósk Agnars: „back button patch can just apply to everything. all apps and site"
 * — bakk-takki símans á að loka efsta opna laginu (formi/glugga) í stað þess að
 * loka appinu eða hoppa af síðunni.
 *
 * Hegðun:
 *  - Í UPPSETTU öppunum (/app/<key>/ eða ?app=<key>): buffer-færsla í history
 *    (armBack-bragðið úr 219) — bakk lokar efsta laginu; þegar ekkert er opið
 *    gerir bakk ekkert og appið lokast ALDREI á bakk.
 *  - Á VENJULEGA vefnum: history-færsla er sett um leið og þekkt lag OPNast;
 *    bakk lokar því þá. Þegar ekkert lag er opið hegðar bakk sér eðlilega
 *    (flakk milli síðna óbreytt).
 *  - Bílstjórinn (/app/bilstjori/, ?driver) á sitt eigið armBack í 219 — hér
 *    er honum sleppt svo tvö kerfi togist ekki á.
 *
 * Lögin sem lokast (efsta fyrst): verðlista-ritill → skýrslu-val →
 * póst-ritillinn (254) → greiðslugluggi Sölu (07) → skoðunarskýrslu-formið
 * (273, vistar drög sjálfkrafa) → brunakerfis-fyrirtækjasíðan (274).
 */
(() => {
  if (window.__bkBackInstalled) return;
  window.__bkBackInstalled = true;

  const path = location.pathname || '', search = location.search || '';
  const BIL = /^\/app\/bilstjori\//.test(path) || /[?&]driver(?:$|[=&])/.test(search) || /[?&]app=bilstjori(?:$|[&])/.test(search);
  if (BIL) return;   // 219 sér um Bílstjórann
  const APPMODE = /^\/app\/[a-z]+\//.test(path) || /[?&]app=[a-z]+(?:$|[&])/.test(search);

  // ── þekkt lög, efsta fyrst ──────────────────────────────────────────────────
  const LAYERS = [
    { find: () => document.getElementById('_bks-pedit'), close: el => el.remove() },
    { find: () => document.getElementById('_bks-picker'), close: el => el.remove() },
    { find: () => document.getElementById('_rs-dialog'),
      close: el => { const b = el.querySelector('#_rs-cancel'); if (b) b.click(); else el.remove(); } },
    { find: () => document.getElementById('sala-pay-modal'),
      close: el => { const b = el.querySelector('.scd-cancel') || el.querySelector('.scd-x'); if (b) b.click(); else el.remove(); } },
    { find: () => { const f = document.getElementById('_bks-overlay'); return (f && f.style.display === 'block') ? f : null; },
      close: el => { const b = el.querySelector('[data-act="close"]'); if (b) b.click(); else el.style.display = 'none'; } },
    { find: () => { const c = document.getElementById('_bkc-overlay'); return (c && c.style.display === 'block') ? c : null; },
      close: el => { const b = el.querySelector('[data-a="back"]'); if (b) b.click(); else el.style.display = 'none'; } },
  ];
  function topLayer() { for (const L of LAYERS) { let el = null; try { el = L.find(); } catch (_) {} if (el) return { L, el }; } return null; }
  function openCount() { return LAYERS.reduce((a, L) => { try { return a + (L.find() ? 1 : 0); } catch (_) { return a; } }, 0); }
  function closeTop() { const t = topLayer(); if (!t) return false; try { t.L.close(t.el); } catch (_) {} return true; }

  // ── Botn-varnagli (AÐEINS uppsettu öppin): EIN færsla neðst svo síðu-bakk (277)
  //    geti aldrei dottið út úr appinu — bakk lokar appinu ALDREI. Endurýtt ef hún
  //    er poppuð. Á venjulega vefnum þarf hann ekki (flipinn má lokast eðlilega).
  //    2026-08-06: áður hélt app-hamur BARA einum buffer og endurýtti á HVERT bakk,
  //    svo bakk hoppaði alltaf á forsíðuna (engar síðu-færslur, 277 var sleppt).
  //    Nú keyrir 277 líka í öppunum → hver síða fær færslu → bakk fer eitt skref;
  //    varnaglinn grípur aðeins þegar við værum að detta út.
  function armRoot() { if (APPMODE) { try { history.pushState({ bkRoot: 1 }, ''); } catch (_) {} } }
  function atRoot() { return APPMODE && history.state && history.state.bkRoot; }
  armRoot();

  // ── Lag-varnaglar (BÁÐIR hamir): færsla ýtt inn um leið og þekkt lag OPNast, svo
  //    bakk poppi ÞVÍ (loki laginu) í stað þess að flakka síðu. ──────────────────
  let armed = 0;
  function sync() {
    const n = openCount();
    while (armed < n) { try { history.pushState({ bkOvl: armed + 1 }, ''); } catch (_) {} armed++; }
    if (n < armed) armed = n;   // lag lokað með ✕: stale state situr eftir (eitt „dautt" bakk í versta falli)
  }
  // fylgjast með: ný lög á body (picker/ritlar/gluggar) + display-breytingar á
  // þrálátu yfirlögunum (form 273 / síða 274) þegar þau verða til.
  const watched = new WeakSet();
  function watchPersistent() {
    ['_bks-overlay', '_bkc-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !watched.has(el)) {
        watched.add(el);
        new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['style'] });
      }
    });
  }
  new MutationObserver(() => { watchPersistent(); sync(); }).observe(document.body, { childList: true });
  watchPersistent();

  window.addEventListener('popstate', () => {
    // 1) Opið lag efst? Lokaðu ÞVÍ (eitt bakk = eitt lag). Færslan sem var poppuð
    //    var lag-varnaglinn, svo engin síða færist.
    if (closeTop()) { armed = Math.max(0, armed - 1); if (atRoot()) armRoot(); return; }
    // 2) Ekkert lag → síðu-bakk (277-færslur). Í uppsettu appi: ef við lentum á
    //    botn-varnaglanum, endurýttu honum svo næsta bakk loki EKKI appinu.
    if (atRoot()) armRoot();
  });
  console.log('[patch-276] bakk-takki: lög + botn-varnagli (' + (APPMODE ? 'app' : 'vefur') + ')');
})();
/* === END BAKK-TAKKI === */
