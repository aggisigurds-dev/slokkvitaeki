/* === STILLA ÚTLIT v2 — VERKFÆRASPJÖLD KANBAN-SÍÐNA (324) ====================
 *
 * Framhald af 323. Þar eru spjöldin fyrir Ársskoðun (tafla + talnaspjöld +
 * síur); hér eru þau fyrir Afgreiðslu og Verkstæði (patch 78) — síður sem hafa
 * enga töflu og engin talnaspjöld, heldur leitarrönd, kanban-dálka og verk-kort.
 *
 *     Leitarrönd     → STILLA LEITARRÖND  (staða, talning, Ný verk, þéttleiki)
 *     Kanban-dálkar  → STILLA DÁLKA       (hæð, breidd, dálkahaus, bil)
 *     Verk-kortin    → STILLA VERK-KORT   (þéttleiki, litakantur, hnappar)
 *
 * HVERS VEGNA SÉR-SPJALD FYRIR KORTIN:
 * Kanban-síða er listi, ekki stakur hlutur. Á Afgreiðslu sitja 30–40 kort í
 * Tilbúin-dálknum; að velja eitt og stilla það er gagnslaust. Þess vegna gilda
 * ÖLL spjöldin hér á alla hluti af sömu gerð á síðunni í einu — það er tekið
 * fram í spjaldinu sjálfu svo enginn haldi að hann sé að stilla stakt kort.
 *
 * GEYMSLA: engin ný — PageEditor.zoneCfg/setZoneCfg, per síðu inni í
 * `page_editor_v1_json`, alveg eins og 323. Fljóta því með „Vista síðu",
 * Útgáfum og samstillingu milli tækja.
 *
 * BEITING: allt sem hér er stillt er CSS. Patch 78 teiknar borðið upp á nýtt
 * við hverja síun og hverja stöðubreytingu, svo DOM-færslur myndu lifa í eina
 * sekúndu; eitt style-blað sem situr síðast heldur alltaf.
 * ========================================================================== */
(() => {
  if (window.__stillaUtlitAfgreidsla324) return;
  window.__stillaUtlitAfgreidsla324 = true;

  const SHEET = '_pe-kanban-css';
  const view = () => document.querySelector('.view.active');
  const vid = () => { const v = view(); return (v && v.id) || 'all'; };
  function sheet() {
    let s = document.getElementById(SHEET);
    if (!s) { s = document.createElement('style'); s.id = SHEET; (document.head || document.documentElement).appendChild(s); }
    return s;
  }
  // Tvítekið auðkenni — sama sértækni-brag og 323 notar. Patch 78 skrifar sínar
  // eigin reglur með !important (`#view-counter .cw-col …`), svo einfalt
  // `#view-counter` myndi tapa. Tvö auðkenni + `html body` vinna þær allar án
  // þess að við þurfum að breyta 78.
  const V = () => { const v = vid(); return 'html body #' + v + '#' + v; };
  const ALL_CARD = '.cw-rcard,.cw-col-scroll>[onclick^="Counter.select"]';

  /* ══ 1 · LEITARRÖND ════════════════════════════════════════════════════════
   * #counter-sidebar: „Ný verk" + talning + leitarreitur. Föst-efst er raunveru-
   * legt gagn hér: dálkarnir skruna innan sín, en röndin sjálf skrapp upp úr
   * skjánum þegar borðið var langt.
   * ------------------------------------------------------------------------ */
  const LEIT_PAD = { thett: 5, midlungs: 10, rumgott: 16 };
  function leitDefaults(c) {
    return {
      fast: c.fast !== false,
      talning: c.talning !== false,
      nyverk: c.nyverk !== false,
      pad: c.pad || 'midlungs',
    };
  }
  const LEIT = {
    render(cfg, api) {
      const c = leitDefaults(cfg);
      return api.head('Stilla leitarrönd', 'Afgreiðsla') +
        api.row('Staða', api.seg([['fast', 'Föst efst'], ['flyt', 'Skrunar með']], c.fast ? 'fast' : 'flyt', 'data-l-fast')) +
        api.row('Þéttleiki', api.seg([['thett', 'Þétt'], ['midlungs', 'Miðlungs'], ['rumgott', 'Rúmgott']], c.pad, 'data-l-pad')) +
        api.row('Talning („35 virk verk")', api.sw(c.talning, 'data-l-talning')) +
        api.row('„Ný verk"-hnappur', api.sw(c.nyverk, 'data-l-nyverk')) +
        '<div class="pe-sub">Leitarreiturinn sjálfur er aldrei falinn — hann er leiðin að kúnnanum sem er í röðinni.</div>';
    },
    wire(root, cfg, api) {
      const c = leitDefaults(cfg);
      root.querySelectorAll('[data-l-fast]').forEach(b => b.onclick = () => api.set({ fast: b.dataset.lFast === 'fast' }));
      root.querySelectorAll('[data-l-pad]').forEach(b => b.onclick = () => api.set({ pad: b.dataset.lPad }));
      const t = root.querySelector('[data-l-talning]');
      if (t) t.onclick = () => api.set({ talning: !c.talning });
      const n = root.querySelector('[data-l-nyverk]');
      if (n) n.onclick = () => api.set({ nyverk: !c.nyverk });
    },
  };
  function leitCss(cfg) {
    const c = leitDefaults(cfg);
    const S = V() + ' #counter-sidebar';
    let css = '';
    const pad = LEIT_PAD[c.pad] || LEIT_PAD.midlungs;
    css += S + '{padding-top:' + pad + 'px!important;padding-bottom:' + pad + 'px!important}\n';
    if (c.fast) {
      // z-index undir bannerinn (sem er 99xxx) en yfir kortin.
      css += S + '{position:sticky!important;top:0!important;z-index:40!important}\n';
    }
    // Talningin og „Ný verk" eru fyrstu tvö börnin í röndinni — engin auðkenni
    // í 78, svo við festum okkur á sætinu. Leitarreiturinn er þriðja barnið og
    // er viljandi aldrei faldur.
    if (!c.nyverk) css += S + '>button:first-child{display:none!important}\n';
    if (!c.talning) css += S + '>span{display:none!important}\n';
    return css;
  }

  /* ══ 2 · KANBAN-DÁLKAR ═════════════════════════════════════════════════════
   * Rúðunetið í 78 er `display:grid;grid-template-columns:1fr 1fr 1fr` með
   * `height:calc(100vh - 110px)`. Það er rétt sjálfgildi en ekki alltaf: þegar
   * Tilbúin er með 32 kort og Móttekin með tvö er jöfn breidd óhagkvæm.
   * ------------------------------------------------------------------------ */
  function dalkDefaults(c) {
    return {
      breidd: c.breidd || 'jofn',
      haed: c.haed || 'full',
      haus: c.haus || 'fullur',
      bil: typeof c.bil === 'number' ? c.bil : 8,
    };
  }
  const BIL_MIN = 0, BIL_MAX = 26;
  const DALKAR = {
    render(cfg, api) {
      const c = dalkDefaults(cfg);
      return api.head('Stilla dálka', 'Móttekin · Í vinnslu · Tilbúin') +
        api.row('Breidd', api.seg([['jofn', 'Jöfn'], ['tilbuin', 'Tilbúin breiðari'], ['virk', 'Virk breiðari']], c.breidd, 'data-d-breidd')) +
        api.row('Hæð', api.seg([['full', 'Full hæð'], ['auto', 'Eftir innihaldi']], c.haed, 'data-d-haed')) +
        api.row('Dálkahaus', api.seg([['fullur', 'Fullur'], ['mjor', 'Mjór'], ['falinn', 'Falinn']], c.haus, 'data-d-haus')) +
        api.row('Bil milli dálka', api.stp(c.bil, 'data-d-bil', 'px')) +
        '<div class="pe-sub">„Full hæð" lætur hvern dálk skruna innan sín — borðið sjálft skrunar þá ekki.</div>';
    },
    wire(root, cfg, api) {
      const c = dalkDefaults(cfg);
      root.querySelectorAll('[data-d-breidd]').forEach(b => b.onclick = () => api.set({ breidd: b.dataset.dBreidd }));
      root.querySelectorAll('[data-d-haed]').forEach(b => b.onclick = () => api.set({ haed: b.dataset.dHaed }));
      root.querySelectorAll('[data-d-haus]').forEach(b => b.onclick = () => api.set({ haus: b.dataset.dHaus }));
      root.querySelectorAll('[data-d-bil]').forEach(b => b.onclick = () =>
        api.set({ bil: Math.max(BIL_MIN, Math.min(BIL_MAX, c.bil + (+b.dataset.dBil) * 2)) }));
    },
  };
  function dalkGrid() {
    const v = view(); const c = v && v.querySelector('.cw-col');
    return c ? c.parentElement : null;
  }
  function dalkCss(cfg) {
    const g = dalkGrid(); if (!g) return '';
    const c = dalkDefaults(cfg);
    const n = Array.prototype.slice.call(g.children).filter(x => x.nodeType === 1).length || 3;
    // Rúðunetið hefur ekkert auðkenni og ekkert klasanafn — við hengjum eitt á
    // það sjálf svo við þurfum ekki að giska á :nth-child-slóð niður frá .view.
    g.setAttribute('data-pe-kanban', '1');
    const G = V() + ' [data-pe-kanban]';
    let cols = 'repeat(' + n + ',1fr)';
    if (c.breidd === 'tilbuin' && n === 3) cols = '1fr 1fr 1.6fr';
    if (c.breidd === 'virk' && n === 3) cols = '1.4fr 1.4fr 1fr';
    let css = G + '{grid-template-columns:' + cols + '!important;gap:' + c.bil + 'px!important}\n';
    if (c.haed === 'auto') {
      css += G + '{height:auto!important;overflow:visible!important}\n';
      css += G + ' .cw-col-scroll{overflow:visible!important;max-height:none!important}\n';
    }
    if (c.haus === 'falinn') css += G + ' .cw-col-head{display:none!important}\n';
    else if (c.haus === 'mjor') {
      css += G + ' .cw-col-head{padding:4px 10px!important}\n';
      css += G + ' .cw-col-sub{display:none!important}\n';
      css += G + ' .cw-col-title{font-size:10px!important}\n';
    }
    return css;
  }

  /* ══ 3 · VERK-KORTIN ═══════════════════════════════════════════════════════
   * Öll kort í öllum dálkum í einu — sjá kaflann að ofan um hvers vegna.
   * Tegundar-litakanturinn er `inset box-shadow` í 78 (viljandi, svo hover-
   * handler kortanna slökkvi ekki á honum), svo breidd hans er stillt með því
   * að skrifa nýtt inset shadow — ekki border.
   * ------------------------------------------------------------------------ */
  const KORT_DENS = {
    thett:    { pad: 4,  fs: 12,   gap: 2 },
    midlungs: { pad: 7,  fs: 13,   gap: 5 },
    rumgott:  { pad: 12, fs: 14.5, gap: 9 },
  };
  function kortDefaults(c) {
    return {
      dens: c.dens || 'midlungs',
      kantur: typeof c.kantur === 'number' ? c.kantur : 4,
      fylling: c.fylling !== false,
      hnappar: c.hnappar || 'alltaf',
    };
  }
  const KORT = {
    render(cfg, api) {
      const c = kortDefaults(cfg);
      return api.head('Stilla verk-kort', kortCount() + ' kort á borðinu') +
        '<div class="pe-sub" style="margin-bottom:9px">Gildir á <b>öll kort af sömu gerð</b> í öllum dálkum — kanban-síða er listi, ekki stakur hlutur.</div>' +
        api.row('Þéttleiki', api.seg([['thett', 'Þétt'], ['midlungs', 'Miðlungs'], ['rumgott', 'Rúmgott']], c.dens, 'data-k-dens')) +
        api.row('Tegundar-litakantur', api.stp(c.kantur, 'data-k-kantur', 'px')) +
        api.row('Græn fylling á Tilbúin', api.sw(c.fylling, 'data-k-fylling')) +
        api.row('Aðgerðahnappar', api.seg([['alltaf', 'Alltaf'], ['hover', 'Við yfirsvif']], c.hnappar, 'data-k-hnappar')) +
        '<div class="pe-sub">„Við yfirsvif" hreinsar kortin — Sótt ✓ og ↩ Verkstæði birtast þegar bendillinn er á kortinu.</div>';
    },
    wire(root, cfg, api) {
      const c = kortDefaults(cfg);
      root.querySelectorAll('[data-k-dens]').forEach(b => b.onclick = () => api.set({ dens: b.dataset.kDens }));
      root.querySelectorAll('[data-k-kantur]').forEach(b => b.onclick = () =>
        api.set({ kantur: Math.max(0, Math.min(12, c.kantur + (+b.dataset.kKantur) * 2)) }));
      const f = root.querySelector('[data-k-fylling]');
      if (f) f.onclick = () => api.set({ fylling: !c.fylling });
      root.querySelectorAll('[data-k-hnappar]').forEach(b => b.onclick = () => api.set({ hnappar: b.dataset.kHnappar }));
    },
  };
  function kortCount() {
    const v = view(); if (!v) return 0;
    return v.querySelectorAll(ALL_CARD).length;
  }
  // ── Tegundar-litakanturinn ────────────────────────────────────────────────
  // 78 skrifar hann inline á hvert kort: `typeFrame()` skilar
  // `box-shadow:inset 4px 0 0 <litur kortategundar>`, þar sem liturinn SEGIR
  // hvers kyns verkið er. Freistandi leiðin — að skrifa yfir hann með stílblaði
  // — eyðileggur einmitt það sem kanturinn er til fyrir: CSS getur ekki breytt
  // BARA breidd skuggans, svo maður neyðist til að nefna lit líka, og hvaða
  // fasti litur sem er (t.d. `currentColor`) málar öll kortin eins og þurrkar
  // flokkunina út.
  //
  // Þess vegna er breiddin stillt á SAMA stað og 78 skrifar hana: inline, með
  // upprunalega litnum höldnum. Upphaflegi skugginn er geymdur á elementinu svo
  // 4px (sjálfgildið) skili sér óskaddað til baka. 78 endurteiknar borðið við
  // hverja síun — applier-inn keyrir aftur og stimplar þá einfaldlega upp á nýtt.
  // ⚠️ Vafrinn NORMALISERAR skuggann um leið og hann er lesinn: 78 skrifar
  // `inset 4px 0 0 rgb(...)` en `el.style.boxShadow` skilar
  // `rgb(37, 99, 235) 4px 0px 0px inset` — LITURINN FYRST, `inset` SÍÐAST.
  // (Staðfest í vafra 27.08; regex sem leitaði að rittextanum hitti aldrei og
  // stillingin gerði þegjandi ekkert.) Báðar ritmyndir eru því studdar.
  function rewriteShadow(orig, px) {
    let m = /^(.+?)\s+([\d.]+)px\s+0px\s+0px(\s+0px)?\s+inset\s*$/i.exec(orig);
    if (m) return m[1] + ' ' + px + 'px 0px 0px inset';          // normaliserað
    m = /^inset\s+([\d.]+)px\s+0\s+0\s+(.+)$/i.exec(orig);
    if (m) return 'inset ' + px + 'px 0 0 ' + m[2];              // eins og 78 ritar
    return null;                                                 // enginn tegundar-kantur
  }
  function kanturApply(px) {
    const v = view(); if (!v) return;
    v.querySelectorAll(ALL_CARD).forEach(el => {
      let orig = el.getAttribute('data-pe-shadow');
      if (orig == null) {
        orig = el.style.boxShadow || '';
        if (!orig || rewriteShadow(orig, 4) === null) return;   // ekkert kant á þessu korti
        el.setAttribute('data-pe-shadow', orig);
      }
      const want = (px === 4) ? orig : (px === 0) ? 'none' : (rewriteShadow(orig, px) || orig);
      if (el.style.boxShadow !== want) el.style.boxShadow = want;
    });
  }
  function kortCss(cfg) {
    const v = view(); if (!v || !v.querySelector('.cw-col')) return '';
    const c = kortDefaults(cfg);
    const d = KORT_DENS[c.dens] || KORT_DENS.midlungs;
    const C = V() + ' .cw-rcard,' + V() + ' .cw-col-scroll>[onclick^="Counter.select"]';
    let css = C + '{padding:' + d.pad + 'px ' + (d.pad + 3) + 'px!important;' +
      'margin-bottom:' + d.gap + 'px!important;font-size:' + d.fs + 'px!important}\n';
    css += V() + ' .cw-rcard-name{font-size:' + d.fs + 'px!important}\n';
    // Litakanturinn er meðhöndlaður í JS (kanturApply) — EKKI hér. Sjá skýringu
    // þar: liturinn er bakaður inn í inline-skuggann og tapast ef við skrifum
    // yfir hann með stílblaði.
    kanturApply(c.kantur);
    if (!c.fylling) {
      css += V() + ' .cw-rcard{background:#fff!important}\n';
    }
    if (c.hnappar === 'hover') {
      css += V() + ' .cw-rcard button{opacity:0!important;transition:opacity .12s!important}\n';
      css += V() + ' .cw-rcard:hover button,' + V() + ' .cw-rcard:focus-within button{opacity:1!important}\n';
    }
    return css;
  }

  /* ══ Applier ═══════════════════════════════════════════════════════════════ */
  let _cur = {};
  function runApply(detail) {
    const cfg = (detail && detail.cfg) || _cur;
    _cur = cfg || {};
    let css = '';
    try { css += leitCss(_cur.leit || {}); } catch (_) {}
    try { css += dalkCss(_cur.dalkar || {}); } catch (_) {}
    try { css += kortCss(_cur.kort || {}); } catch (_) {}
    const s = sheet();
    if (s.textContent !== css) s.textContent = css;
    if (s.parentNode) s.parentNode.appendChild(s);   // sitja síðast → vinna 78
  }
  document.addEventListener('pe-zones-apply', e => runApply(e.detail));

  function reg() {
    if (!window.PageEditor || !window.PageEditor.registerCard) return false;
    PageEditor.registerCard('leit', LEIT);
    PageEditor.registerCard('dalkar', DALKAR);
    PageEditor.registerCard('kort', KORT);
    try { PageEditor.applyZones(); } catch (_) {}
    return true;
  }
  if (!reg()) {
    let n = 0;
    const t = setInterval(() => { if (reg() || ++n > 40) clearInterval(t); }, 250);
  }

  console.log('[patch-324] Stilla útlit v2 — kanban-spjöld tilbúin');
})();
/* === END STILLA ÚTLIT v2 — KANBAN-SPJÖLD === */
