/* === 533 HEIMILISFANG-VAL — staðfanga-tillögur á #nf-heimilisfang (stofna/breyta fyrirtæki) =====
 *
 * Agnar 26.11.2026: „Kanski væri bara fínt að það væri einhver vörn eða að maður myndi velja af
 * listanum heimilsfangið þegar maður er að breyta heimilisfangi eða stofna fyrirtæki eða bæta við
 * fasteign."
 *
 * TILEFNI: Nesdekk — Völuteigur 29, 270 Mosfellsbær. Staðföngin 25/27/29 á götunni deila ÖLL
 * landnúmeri 190052 (ein lóð, þrjú húsnúmer), svo frjáls innsláttur gat ekki ratað á húsið og
 * byggingar-/teikningauppfletting leit út fyrir að skila engu. Lausnin er sama staðfanga-leit og
 * greiningarhausinn (451) og TurboPaint (325) nota — Landnr.search → Landeignaskrá/Staðfangaskrá
 * HMS — en hér á fyrirtækjaglugganum (stofna OG breyta deila reitnum #nf-heimilisfang) sem vantaði.
 *
 * HVAÐ ÞETTA GERIR:
 *   · Tillögur beint úr HMS meðan slegið er inn; notandinn VELUR raunverulegt staðfang.
 *   · Póstnúmer (#nf-postnumer) fyllist sjálfkrafa af valda staðfanginu.
 *   · Mjúk VÖRN: finnist lokagildið ekki í HMS birtist viðvörun undir reitnum — en vistun er ALDREI
 *     stöðvuð (pósthólf, utanbæjar og ný staðföng eiga að sleppa í gegn).
 *
 * LES AÐEINS HMS (Landnr.search, enginn lykill). Engin skrif. Sjálfstæður IIFE, snertir engan annan
 * kóða; festist með focusin-delegation svo hann virkar í hvert sinn sem glugginn opnast.
 * ============================================================================================== */
(() => {
  if (window.__heimilisfangVal) return;
  window.__heimilisfangVal = true;

  // Póstnúmer → staður (Íslandspóstur). Aðeins til að fullgera skráða heimilisfangið „Gata nr, 270
  // Mosfellsbær" — uppflettingarnar sjálfar nota aðeins götu+númer+póstnúmer.
  const POSTNR = {
    101: 'Reykjavík', 102: 'Reykjavík', 103: 'Reykjavík', 104: 'Reykjavík', 105: 'Reykjavík',
    107: 'Reykjavík', 108: 'Reykjavík', 109: 'Reykjavík', 110: 'Reykjavík', 111: 'Reykjavík',
    112: 'Reykjavík', 113: 'Reykjavík', 116: 'Reykjavík', 121: 'Reykjavík', 123: 'Reykjavík',
    124: 'Reykjavík', 125: 'Reykjavík', 127: 'Reykjavík', 128: 'Reykjavík', 129: 'Reykjavík',
    130: 'Reykjavík', 132: 'Reykjavík', 150: 'Reykjavík', 155: 'Reykjavík', 161: 'Reykjavík',
    162: 'Reykjavík', 170: 'Seltjarnarnes', 172: 'Seltjarnarnes',
    190: 'Vogar', 191: 'Vogar',
    200: 'Kópavogur', 201: 'Kópavogur', 202: 'Kópavogur', 203: 'Kópavogur', 206: 'Kópavogur',
    210: 'Garðabær', 211: 'Garðabær', 212: 'Garðabær', 213: 'Garðabær', 225: 'Garðabær',
    220: 'Hafnarfjörður', 221: 'Hafnarfjörður', 222: 'Hafnarfjörður',
    230: 'Reykjanesbær', 232: 'Reykjanesbær', 233: 'Reykjanesbær', 235: 'Keflavíkurflugvöllur',
    240: 'Grindavík', 245: 'Sandgerði', 246: 'Suðurnesjabær', 250: 'Garður', 260: 'Reykjanesbær',
    262: 'Reykjanesbær',
    270: 'Mosfellsbær', 271: 'Mosfellsbær', 276: 'Mosfellsbær',
    300: 'Akranes', 301: 'Akranes', 302: 'Akranes', 310: 'Borgarnes', 311: 'Borgarnes',
    320: 'Reykholt', 340: 'Stykkishólmur', 341: 'Stykkishólmur', 342: 'Stykkishólmur',
    345: 'Flatey', 350: 'Grundarfjörður', 355: 'Ólafsvík', 356: 'Snæfellsbær', 360: 'Hellissandur',
    370: 'Búðardalur', 371: 'Búðardalur', 380: 'Reykhólahreppur',
    400: 'Ísafjörður', 401: 'Ísafjörður', 410: 'Hnífsdalur', 415: 'Bolungarvík', 420: 'Súðavík',
    425: 'Flateyri', 430: 'Suðureyri', 450: 'Patreksfjörður', 451: 'Patreksfjörður',
    460: 'Tálknafjörður', 465: 'Bíldudalur', 470: 'Þingeyri', 471: 'Þingeyri',
    500: 'Staður', 510: 'Hólmavík', 512: 'Hólmavík', 520: 'Drangsnes', 524: 'Árneshreppur',
    530: 'Hvammstangi', 531: 'Hvammstangi', 540: 'Blönduós', 541: 'Blönduós', 545: 'Skagaströnd',
    550: 'Sauðárkrókur', 551: 'Sauðárkrókur', 560: 'Varmahlíð', 565: 'Hofsós', 566: 'Hofsós',
    570: 'Fljót', 580: 'Siglufjörður',
    600: 'Akureyri', 601: 'Akureyri', 602: 'Akureyri', 603: 'Akureyri', 604: 'Akureyri',
    605: 'Akureyri', 606: 'Akureyri', 607: 'Akureyri', 610: 'Grenivík', 611: 'Grímsey',
    616: 'Grenivík', 620: 'Dalvík', 621: 'Dalvík', 625: 'Ólafsfjörður', 630: 'Hrísey',
    640: 'Húsavík', 641: 'Húsavík', 645: 'Fosshóll', 650: 'Laugar', 660: 'Mývatn',
    670: 'Kópasker', 671: 'Kópasker', 675: 'Raufarhöfn', 680: 'Þórshöfn', 681: 'Þórshöfn',
    685: 'Bakkafjörður', 690: 'Vopnafjörður', 691: 'Vopnafjörður',
    700: 'Egilsstaðir', 701: 'Egilsstaðir', 710: 'Seyðisfjörður', 715: 'Mjóifjörður',
    720: 'Borgarfjörður eystri', 730: 'Reyðarfjörður', 735: 'Eskifjörður', 740: 'Neskaupstaður',
    750: 'Fáskrúðsfjörður', 755: 'Stöðvarfjörður', 760: 'Breiðdalsvík', 765: 'Djúpivogur',
    780: 'Höfn', 781: 'Höfn', 785: 'Öræfi',
    800: 'Selfoss', 801: 'Selfoss', 802: 'Selfoss', 803: 'Selfoss', 804: 'Selfoss', 805: 'Selfoss',
    806: 'Selfoss', 810: 'Hveragerði', 815: 'Þorlákshöfn', 816: 'Ölfus', 820: 'Eyrarbakki',
    825: 'Stokkseyri', 840: 'Laugarvatn', 845: 'Flúðir', 846: 'Flúðir', 850: 'Hella', 851: 'Hella',
    860: 'Hvolsvöllur', 861: 'Hvolsvöllur', 870: 'Vík', 871: 'Vík', 880: 'Kirkjubæjarklaustur',
    881: 'Kirkjubæjarklaustur', 900: 'Vestmannaeyjar', 902: 'Vestmannaeyjar',
  };
  const stadurAf = (pn) => POSTNR[Number(pn)] || '';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

  // Þáttar HMS-merkimiða „Völuteigur 29  (270) - L 190052" → { gata_nr, postnr, stadur, canon, birt }
  function thattaLabel(r) {
    const label = String(r.label || '');
    const m = /^(.*?)\s*\((\d{3})\)/.exec(label);
    const gataNr = (m ? m[1] : label.replace(/\s*-\s*L\s*\d+\s*$/i, '')).replace(/\s+/g, ' ').trim();
    const postnr = m ? m[2] : '';
    const stadur = stadurAf(postnr);
    const canon = gataNr + (postnr ? ', ' + postnr + (stadur ? ' ' + stadur : '') : '');
    return { gataNr, postnr, stadur, canon, landnr: r.landnr };
  }

  function css() {
    if (document.getElementById('_hfv-css')) return;
    const s = document.createElement('style'); s.id = '_hfv-css';
    s.textContent = [
      '#_hfv-drop{position:fixed;z-index:100050;background:#fff;border:1px solid #cbd5e1;border-radius:10px;',
      'box-shadow:0 18px 44px -16px rgba(15,23,42,.45);overflow:hidden;max-height:290px;overflow-y:auto;',
      'font:13px "IBM Plex Sans",system-ui,-apple-system,sans-serif}',
      '#_hfv-drop .hfv-it{display:flex;align-items:center;gap:9px;padding:9px 11px;cursor:pointer;border-bottom:1px solid #f1f5f9}',
      '#_hfv-drop .hfv-it:last-child{border-bottom:0}',
      '#_hfv-drop .hfv-it:hover,#_hfv-drop .hfv-it.virk{background:#eef4ff}',
      '#_hfv-drop .hfv-nm{flex:1;min-width:0;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#_hfv-drop .hfv-st{color:#64748b;font-weight:500}',
      '#_hfv-drop .hfv-l{font-family:ui-monospace,Consolas,monospace;font-size:11px;font-weight:700;color:#2563eb;background:#e0edff;border-radius:6px;padding:2px 7px;flex:none}',
      '#_hfv-drop .hfv-haus{padding:6px 11px;font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#b58a2b;background:#fcfbf7;border-bottom:1px solid #f1f5f9}',
      '.hfv-vorn{margin-top:5px;font-size:12px;line-height:1.35;display:flex;gap:6px;align-items:flex-start}',
      '.hfv-vorn.vara{color:#b45309}.hfv-vorn.ok{color:#15803d}',
    ].join('');
    document.head.appendChild(s);
  }

  let drop = null, virkI = -1, radir = [], seq = 0, tof = 0, verifTof = 0, inpNu = null;
  let sidastValid = '';   // norm gildi sem var valið/staðfest úr HMS

  function dropEl() {
    if (drop) return drop;
    css();
    drop = document.createElement('div');
    drop.id = '_hfv-drop';
    drop.hidden = true;
    drop.addEventListener('mousedown', (e) => e.preventDefault());   // halda fókus í reitnum
    document.body.appendChild(drop);
    return drop;
  }

  function stadsetja(inp) {
    const d = dropEl();
    const r = inp.getBoundingClientRect();
    d.style.left = Math.round(r.left) + 'px';
    d.style.top = Math.round(r.bottom + 4) + 'px';
    d.style.width = Math.round(r.width) + 'px';
  }

  function loka() {
    if (drop && !drop.hidden) drop.hidden = true;
    virkI = -1; radir = [];
  }

  function syna(inp) {
    const d = dropEl();
    if (!radir.length) { loka(); return; }
    d.innerHTML = '<div class="hfv-haus">Staðfangaskrá HMS — veldu heimilisfang</div>' +
      radir.map((p, i) => '<div class="hfv-it' + (i === virkI ? ' virk' : '') + '" data-i="' + i + '">' +
        '<span class="hfv-nm">' + esc(p.gataNr) + (p.postnr ? ' <span class="hfv-st">· ' + esc(p.postnr + (p.stadur ? ' ' + p.stadur : '')) + '</span>' : '') + '</span>' +
        '<span class="hfv-l">L ' + esc(p.landnr) + '</span></div>').join('');
    stadsetja(inp);
    d.hidden = false;
  }

  function vornEl(inp, buaTil) {
    let v = inp.parentNode && inp.parentNode.querySelector(':scope > .hfv-vorn');
    if (!v && buaTil) {
      v = document.createElement('div');
      v.className = 'hfv-vorn';
      inp.insertAdjacentElement('afterend', v);
    }
    return v || null;
  }
  function setjaVorn(inp, tegund, txt) {
    const v = vornEl(inp, !!tegund);
    if (!v) return;
    if (!tegund) { v.remove(); return; }
    v.className = 'hfv-vorn ' + tegund;
    v.innerHTML = '<span>' + (tegund === 'ok' ? '✓' : '⚠') + '</span><span>' + esc(txt) + '</span>';
  }

  function velja(inp, p) {
    inp.value = p.canon;
    sidastValid = norm(p.canon);
    // Póstnúmer fylgir valinu (reiturinn er í sama glugga, stundum sprautaður inn af 14)
    if (p.postnr) {
      const pn = document.getElementById('nf-postnumer');
      if (pn) { pn.value = p.postnr; try { pn.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {} }
    }
    loka();
    setjaVorn(inp, 'ok', 'Staðfang úr HMS — landnúmer ' + p.landnr + '.');
    try { inp.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { inp.focus(); } catch (_) {}
  }

  async function leita(inp) {
    const q = String(inp.value || '').trim();
    sidastValid = sidastValid && norm(inp.value) === sidastValid ? sidastValid : '';
    if (q.length < 3 || !(window.Landnr && Landnr.search)) { loka(); return; }
    const my = ++seq;
    let rows = [];
    try { rows = await Landnr.search(q); } catch (_) { rows = []; }
    if (my !== seq || document.activeElement !== inp) return;
    const sed = new Set();
    radir = rows.map(thattaLabel).filter((p) => { const k = norm(p.canon) + '|' + p.landnr; if (sed.has(k)) return false; sed.add(k); return true; }).slice(0, 10);
    virkI = -1;
    syna(inp);
  }

  // Mjúk vörn: þegar reiturinn missir fókus, athuga hvort gildið sé raunverulegt staðfang í HMS.
  async function stadfesta(inp) {
    const q = String(inp.value || '').trim();
    if (!q) { setjaVorn(inp, null); return; }
    if (sidastValid && norm(q) === sidastValid) { setjaVorn(inp, 'ok', 'Staðfang staðfest í HMS.'); return; }
    if (!(window.Landnr && Landnr.search)) { setjaVorn(inp, null); return; }
    // pósthólf / box — sleppum vörninni
    if (/^p[óo]sth[óo]lf|^box\b|^p\.?o\.?\s*box/i.test(q)) { setjaVorn(inp, null); return; }
    let rows = [];
    try { rows = await Landnr.search(q); } catch (_) { setjaVorn(inp, null); return; }
    const fann = rows.map(thattaLabel).some((p) => norm(p.canon) === norm(q) || norm(p.gataNr) === norm(q.split(',')[0]));
    if (fann) setjaVorn(inp, 'ok', 'Heimilisfangið finnst í Staðfangaskrá HMS.');
    else setjaVorn(inp, 'vara', 'Fann ekki þetta heimilisfang í Staðfangaskrá HMS — veldu af listanum ef það á við (vistun stöðvast ekki).');
  }

  // ── Delegation: virkjast fyrir #nf-heimilisfang í hvert sinn sem glugginn opnast ──────────────
  document.addEventListener('focusin', (e) => {
    const inp = e.target;
    if (!inp || inp.id !== 'nf-heimilisfang' || inp.dataset.hfv === '1') { if (inp && inp.id === 'nf-heimilisfang') inpNu = inp; return; }
    inp.dataset.hfv = '1';
    inpNu = inp;
    inp.setAttribute('autocomplete', 'off');

    inp.addEventListener('input', () => { clearTimeout(tof); clearTimeout(verifTof); setjaVorn(inp, null); tof = setTimeout(() => leita(inp), 240); });
    inp.addEventListener('keydown', (ev) => {
      if (drop && !drop.hidden && radir.length) {
        if (ev.key === 'ArrowDown') { ev.preventDefault(); virkI = Math.min(radir.length - 1, virkI + 1); syna(inp); return; }
        if (ev.key === 'ArrowUp') { ev.preventDefault(); virkI = Math.max(0, virkI - 1); syna(inp); return; }
        if (ev.key === 'Enter' && virkI >= 0) { ev.preventDefault(); velja(inp, radir[virkI]); return; }
        if (ev.key === 'Escape') { ev.preventDefault(); loka(); return; }
      }
    });
    inp.addEventListener('blur', () => {
      setTimeout(() => { if (inpNu === inp) loka(); }, 150);
      clearTimeout(verifTof);
      verifTof = setTimeout(() => stadfesta(inp), 220);
    });
  }, true);

  // Dropdown-smellur (festur einu sinni; delegation á body)
  document.addEventListener('click', (e) => {
    const it = e.target.closest && e.target.closest('#_hfv-drop .hfv-it');
    if (it && inpNu) velja(inpNu, radir[+it.dataset.i]);
  });
  window.addEventListener('scroll', () => { if (drop && !drop.hidden && inpNu) stadsetja(inpNu); }, true);
  window.addEventListener('resize', () => { if (drop && !drop.hidden && inpNu) stadsetja(inpNu); });

  console.log('[patch-533] heimilisfang-val tilbúið — staðfanga-tillögur á #nf-heimilisfang');
})();
/* === END HEIMILISFANG-VAL === */
