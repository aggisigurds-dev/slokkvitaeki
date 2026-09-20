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

  // ── ALMENN REGLA (Agnar 20.09.2026: „setja nýja alreglu að backbutton á síma og backtakkinn í browser fari bara eitt
  //    skref aftur á bak … ekki á byrjunarreit. Margt svona allstaðar alveg lúmskt pirrandi að leita og finna upp á
  //    nýtt"). Listinn hér að neðan þekkti SEX tiltekin lög — enginn venjulegur gluggi appsins (Modal.open í utils.js)
  //    var þar, svo bakk með opinn glugga fór af síðunni. Nú er efsti opni Modal-glugginn ALLTAF lag, hver sem hann er,
  //    og teikningagluggarnir (383/384) eru skráðir hér í stað þess að reka sitt eigið sögukerfi.
  //    Modal.stack getur borið dauð auðkenni (closeFP() felur gluggann án Modal.close) — því er DOM-ið spurt, ekki staflinn.
  const opinnModal = () => {
    try {
      const st = (window.Modal && Array.isArray(Modal.stack)) ? Modal.stack : [];
      for (let i = st.length - 1; i >= 0; i--) {
        const el = document.getElementById(st[i]);
        if (el && el.classList.contains('open') && el.style.display !== 'none') return el;
      }
    } catch (_) {}
    return null;
  };
  // ── þekkt lög, efsta fyrst ──────────────────────────────────────────────────
  const LAYERS = [
    // Forskoðun teikninga (384) liggur ofan á öllu.
    { find: () => document.getElementById('tfs'),
      close: el => { try { window.TeikningaForskodun.loka(); } catch (_) { el.remove(); } } },
    // 3D-sýn innan teikningagluggans (383): bakk lokar henni fyrst, svo glugganum.
    { find: () => document.getElementById('fp-3d'),
      close: el => { const b = el.querySelector('#fp-3d-x'); if (b) b.click(); else el.remove(); } },
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
    // Hvaða venjulegi gluggi appsins sem er — NEÐST, svo sérhæfðu lögin hér að ofan (sem liggja ofan á gluggum) lokist fyrst.
    { find: opinnModal,
      close: el => { try { if (el.id === 'modal-floorplan' && window.closeFP) window.closeFP(); else Modal.close(el.id); } catch (_) { el.classList.remove('open'); } } },
  ];
  function topLayer() { for (const L of LAYERS) { let el = null; try { el = L.find(); } catch (_) {} if (el) return { L, el }; } return null; }
  // Modal-lagið telur HVERN opinn glugga (gluggi ofan á glugga = tvö lög), hin lögin eitt hvert.
  const opnirModalar = () => { try { return (Modal.stack || []).filter((id, i, a) => a.indexOf(id) === i).filter(id => { const el = document.getElementById(id); return el && el.classList.contains('open') && el.style.display !== 'none'; }).length; } catch (_) { return 0; } };
  function openCount() { return LAYERS.reduce((a, L) => { try { return a + (L.find === opinnModal ? opnirModalar() : (L.find() ? 1 : 0)); } catch (_) { return a; } }, 0); }
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
    if (n < armed) {
      // Lag lokað með ✕/Loka/Vista: færslan þess sat áður eftir sem „dautt" bakk (ýta þurfti tvisvar). Hún er nú tekin af
      // — en AÐEINS þegar efsta sögufærslan er okkar lag-færsla. Hafi slóðin breyst á meðan (277 ýtti síðu ofan á) má
      // ekki bakka: það færi af síðunni.
      const daudar = armed - n; armed = n;
      if (history.state && history.state.bkOvl) { gleypa += daudar; try { history.go(-daudar); } catch (_) { gleypa = 0; } }
    }
  }
  let gleypa = 0;
  // Modal.open/close breyta aðeins klasa (ekki childList) — MutationObserver-inn hér að neðan sér það ekki.
  try {
    if (window.Modal && !Modal.__bakk276) {
      Modal.__bakk276 = true;
      ['open', 'close', 'closeAll'].forEach(f => { const u = Modal[f]; if (typeof u === 'function') Modal[f] = function () { const r = u.apply(this, arguments); setTimeout(sync, 0); return r; }; });
    }
  } catch (_) {}
  // Gluggar sem lokast án Modal.close (closeFP, style.display) og lög sem hverfa öðruvísi: ódýr taktur (nokkur getElementById).
  setInterval(sync, 350);
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
    if (gleypa > 0) { gleypa--; if (atRoot()) armRoot(); return; }   // okkar eigið history.go() eftir ✕ — ekkert að loka
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
