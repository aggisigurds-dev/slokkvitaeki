/* === AFSLATTARKASSI v1 ===
 *
 * Steypir ÞREMUR aðskildum afsláttar-kössum á fyrirtækjaprófílnum í EINN kassa:
 *
 *   ._ahop-section  🏷️ Afsláttarhópur      (patch 296)
 *   ._cad-section   🎯 Sjálfvirkur afsláttur (patch 255)
 *   ._cpr-section   💰 Tilboðsverð          (patch 113)
 *
 * Þeir stóðu hver í sínum ramma, hver með sinn haus, og sögðu hvergi hvernig
 * þeir vinna saman — þótt þeir séu í raun ÞREP Í SAMA STIGA:
 *
 *     Tilboðsverð  ›  Afsláttarhópur  ›  Sjálfvirkur afsláttur
 *     (fast verð)     (% per flokki)     (% af öllu)
 *
 * Hér er sá stigi gerður sýnilegur: einn haus, þrjú þrep, og virku þrepin
 * merkt svo það sjáist í einni sýn hvað ræður verðinu hjá þessum kúnna.
 *
 * ── Hvernig (mikilvægt ef þetta þarf viðhald) ──────────────────────────────
 * Kassarnir eru EKKI endurskrifaðir. Þessi patch FÆRIR lifandi DOM-hnútana
 * (`appendChild` á sama hnút) inn í sameiginlega umgjörð og strípar af þeim
 * þeirra eigin ramma/bakgrunn. Þar með halda allir atburðahlustarar,
 * vistunar-rökfræðin og endur-teikningar patchanna þriggja sér ÓBREYTT —
 * hver þeirra á áfram sín gögn og sína vistun. Ekkert er afritað hingað.
 *
 * Þeir þrír leita allir að sér með `main.querySelector('._xxx-section')` áður
 * en þeir sprauta sér inn; það finnur þá áfram inni í umgjörðinni, svo þeir
 * tvöfaldast ekki. Þeir leita líka hver að öðrum til að raða sér — það heldur
 * líka, því þeir enda allir inni í sama foreldri.
 *
 * Samantektin í hausnum er LESIN ÚR KÖSSUNUM SJÁLFUM (select-gildi, %-reitur,
 * fjöldamerki), aldrei úr sjálfstæðri fyrirspurn. Ein staðreynd á einn stað —
 * annars gæti hausinn sagt annað en reiturinn fyrir neðan hann.
 */
(() => {
  if (window.__afslKassiInstalled) return;
  window.__afslKassiInstalled = true;

  const BOX = '_afsl-box';
  const SECTIONS = ['._ahop-section', '._cad-section', '._cpr-section'];

  // ── Stílar (media query þarf alvöru stílblað, ekki inline) ────────────────
  function ensureCss() {
    if (document.getElementById('_afsl-css')) return;
    const s = document.createElement('style');
    s.id = '_afsl-css';
    s.textContent = `
      .${BOX}{margin:14px 0 10px;border:1px solid var(--brd);border-radius:14px;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.05);overflow:hidden}
      .${BOX} ._afsl-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 15px;border-bottom:1px solid var(--brd);background:var(--surface2)}
      .${BOX} ._afsl-title{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:800;color:var(--ink1)}
      .${BOX} ._afsl-ladder{display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap;margin-left:auto}
      .${BOX} ._afsl-step{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:99px;font-size:10.5px;font-weight:700;border:1px solid var(--brd);background:var(--surface);color:var(--ink4)}
      .${BOX} ._afsl-step._on{border-color:#16a34a;background:#f0fdf4;color:#166534}
      .${BOX} ._afsl-arrow{font-size:10px;color:var(--ink4)}
      .${BOX} ._afsl-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
      .${BOX} ._afsl-grid > *{padding:12px 15px;min-width:0}
      .${BOX} ._afsl-grid > *:first-child{border-right:1px solid var(--brd)}
      .${BOX} ._afsl-wide{padding:12px 15px;border-top:1px solid var(--brd)}
      /* Báðir efri reitirnir fá sama takt: heiti + skýring á línu 1, stýringar
         hægri-jafnaðar á línu 2. Annars brýtur annar dálkurinn í tvær línur og
         hinn ekki — sem lítur út eins og mistök fremur en hönnun. Uppbyggingin
         er sú sama í 296 og 255: <div><span heiti><span skýring><span stýringar>. */
      .${BOX} ._afsl-grid ._ahop-section > div > span:last-child,
      .${BOX} ._afsl-grid ._cad-section > div > span:last-child{flex-basis:100%;margin-left:0!important;justify-content:flex-end;margin-top:9px}
      /* Strípa af innfærðu köflunum þeirra eigin kassa-útliti */
      .${BOX} ._ahop-section,
      .${BOX} ._cad-section,
      .${BOX} ._cpr-section{margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      @media (max-width:820px){
        .${BOX} ._afsl-grid{grid-template-columns:1fr}
        .${BOX} ._afsl-grid > *:first-child{border-right:0;border-bottom:1px solid var(--brd)}
        .${BOX} ._afsl-ladder{margin-left:0;width:100%}
      }
    `;
    document.head.appendChild(s);
  }

  // ── Lesa virka stöðu ÚR köflunum sjálfum (engin sjálfstæð fyrirspurn) ─────
  function readState(box) {
    const sel = box.querySelector('._ahop-sel');
    const inp = box.querySelector('._cad-inp');
    const cprToggle = box.querySelector('._cpr-toggle');
    // Fjöldamerkið hjá Tilboðsverði er annaðhvort talan (span með tölu) eða
    // „engin" — við lesum textann fremur en að telja raðir, því listinn er
    // samanbrotinn og því ekki til í DOM þegar lokað er.
    let tilbod = 0;
    if (cprToggle) {
      const m = cprToggle.textContent.match(/Tilboðsverð\s*(\d+)/);
      if (m) tilbod = +m[1];
    }
    const pct = inp ? (parseFloat(inp.value) || 0) : 0;
    const hopur = sel && sel.value ? (sel.options[sel.selectedIndex] || {}).text || '' : '';
    return { tilbod, pct, hopur };
  }

  function renderHead(box) {
    const head = box.querySelector('._afsl-head');
    if (!head) return;
    const st = readState(box);
    const step = (on, label) =>
      '<span class="_afsl-step' + (on ? ' _on' : '') + '">' + (on ? '●' : '○') + ' ' + label + '</span>';
    const arrow = '<span class="_afsl-arrow">›</span>';
    head.innerHTML =
      '<span class="_afsl-title">💸 Afslættir &amp; verð</span>' +
      '<span style="font-size:10.5px;color:var(--ink3)">efsta virka þrepið ræður verðinu í Sölu</span>' +
      '<span class="_afsl-ladder">' +
        step(st.tilbod > 0, 'Tilboðsverð' + (st.tilbod ? ' · ' + st.tilbod : '')) + arrow +
        step(!!st.hopur, st.hopur ? 'Hópur · ' + st.hopur : 'Hópur') + arrow +
        step(st.pct > 0, st.pct > 0 ? st.pct + '% af öllu' : 'Sjálfvirkt %') +
      '</span>';
  }

  // ── Byggja/viðhalda kassanum ──────────────────────────────────────────────
  function build() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const found = SECTIONS.map(s => main.querySelector(s));
    // Bíðum þar til a.m.k. einn kafli er kominn — hinir tveir sprauta sér inn
    // síðar og eru þá dregnir inn af sama fall-i (sjá observer neðar).
    if (!found.some(Boolean)) return;

    ensureCss();
    let box = main.querySelector('.' + BOX);
    if (!box) {
      box = document.createElement('div');
      box.className = BOX;
      box.innerHTML =
        '<div class="_afsl-head"></div>' +
        '<div class="_afsl-grid"><div class="_afsl-slot-hop"></div><div class="_afsl-slot-pct"></div></div>' +
        '<div class="_afsl-wide _afsl-slot-cpr"></div>';
      // Þar sem fyrsti kaflinn stóð — svo kassinn lendi á sama stað á síðunni.
      const anchor = found.find(Boolean);
      anchor.parentNode.insertBefore(box, anchor);
    }

    // Færa kaflana á sinn stað (lifandi hnútar → allir hlustarar halda sér).
    const slots = [
      ['._ahop-section', '._afsl-slot-hop'],
      ['._cad-section', '._afsl-slot-pct'],
      ['._cpr-section', '._afsl-slot-cpr']
    ];
    slots.forEach(([sec, slot]) => {
      const el = main.querySelector(sec);
      const target = box.querySelector(slot);
      if (el && target && el.parentNode !== target) target.appendChild(el);
    });

    // Tómur helmingur lítur út eins og villa — fela hann þar til kaflinn kemur.
    const hop = box.querySelector('._afsl-slot-hop');
    const pct = box.querySelector('._afsl-slot-pct');
    const grid = box.querySelector('._afsl-grid');
    if (grid && hop && pct) {
      const nHop = !!hop.firstElementChild, nPct = !!pct.firstElementChild;
      hop.style.display = nHop ? '' : 'none';
      pct.style.display = nPct ? '' : 'none';
      grid.style.display = (nHop || nPct) ? '' : 'none';
      // Einn eftir → hann fær alla breiddina og enga skiptilínu.
      grid.style.gridTemplateColumns = (nHop && nPct) ? '' : '1fr';
      if (hop) hop.style.borderRight = (nHop && nPct) ? '' : '0';
    }
    const cpr = box.querySelector('._afsl-slot-cpr');
    if (cpr) cpr.style.display = cpr.firstElementChild ? '' : 'none';

    renderHead(box);
  }

  // ── Fylgjast með: kaflarnir þrír koma inn á mismunandi tíma og endur-teikna
  // sig sjálfir við vistun. Debounce-að svo okkar eigin færslur valdi ekki lykkju.
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 700); return; }
    let t = 0;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(build, 220);
    }).observe(main, { childList: true, subtree: true });
    // Haus-samantektin þarf líka að fylgja innslætti (%-reiturinn) og vali.
    main.addEventListener('input', e => {
      if (e.target.closest && e.target.closest('._cad-inp')) {
        const box = main.querySelector('.' + BOX);
        if (box) renderHead(box);
      }
    });
    setTimeout(build, 1200);
  }
  attach();

  window.AfslattarKassi = { rebuild: build, version: 'v1' };
  console.log('[patch-307] 💸 Afsláttar-kassinn — hópur + sjálfvirkt % + tilboðsverð í einum ramma');
})();
