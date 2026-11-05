/* === SÖLUBORÐ · RAÐA FLÍSUNUM (496) — 03.11.2026, sjálfvirk vistun 05.11.2026 ===
 *
 * Agnar 03.11.2026: „Geturðu sett inn nýjan Söluborðs View með adjuster, dregið vörurnar til eftir hvar
 * þær eiga að vera í röðinni í Sala borð".
 *
 * Takkinn „Raða" við Flísar / Listi (299) kveikir á röðunarham á Söluborðinu: flísarnar í Þjónustu og Vörum
 * dragast til (mús og snerting — pointer events), hver flís ber sætið sitt, smellur bætir EKKI í körfu.
 * Röðin skrifast í vorur.rodun (10, 20, 30 … í sýndu röðinni) — sami dálkur og pos.js sortTiles raðar eftir — á
 * þjóninum, eins á öllum vélum. Aðeins breyttar raðir skrifast, hver villa er sögð.
 *
 * 05.11.2026 (Agnar: „afhverju þarf ég að biðja um þetta í hvert einasta skipti sem ég breyti einhverju að láta
 * helvítist kerfið savast" / „söluborðið heldur ekki röðuninni"):
 *   • ENGINN „Vista röð"-takki: röðin vistast SJÁLF 400 ms eftir hverja sleppingu (regla 15.10.2026: hvert val á þjóninn).
 *     Vistað er úr snapshot frá sleppingarstundu (S.snap), ekki úr DOM þegar tímamælirinn springur, og `S.gen` telur
 *     sleppingar svo færsla sem berst á meðan vistun er í gangi vistast strax á eftir. „Vistað" birtist aðeins þegar
 *     hver röð hefur verið lesin til baka af þjóninum með réttu gildi (supabase-js kastar aldrei; 0 raðir = mistök).
 *   • „Lokið" lýkur hamnum (og skolar óvistað strax). Vistun er líka skoluð við brottför (365 VistunarSkol,
 *     visibilitychange→hidden, pagehide).
 *   • RÓTIN að „heldur ekki röðuninni": patch 87 raðaði flísunum aftur eftir gömlu `position_orders` ofan á rodun
 *     (tvær heimildir fyrir sömu röðina) — sú grein er farin úr 87; rodun er eina heimildin. Röðin sem hér er vistuð er
 *     því röðin sem sést á ÖLLUM vélum (498 samstillir opnar síður).
 *   • SalaRodun.upptekid() / .gen() / .radaEftirRodun() eru fyrir 498 (samstilling): hún hreyfir ekkert á meðan hamur er á,
 *     dregið er eða vistun er á lofti, og raðar flísum eftir rodun í POS-state með sama samanburði og pos.js sortTiles.
 *
 * pos.js ósnert: les POS.getState() og færir flísahnútana sjálfa — smellirnir í pos.js hanga á ristinni
 * (#pos-services / #pos-products), ekki á flísunum, svo færður hnútur virkar áfram. Teikni pos.js ristina
 * upp á nýtt í miðjum ham (vörusókn) er vinnuröðin sett aftur á nýju hnútana.
 */
(() => {
  'use strict';
  if (window.__salaRodun496) return;
  window.__salaRodun496 = true;

  const GRIDS = ['pos-services', 'pos-products'];
  const TILE = '.pos-svc, .pos-prod';
  // stada: 'vistad' | 'bid' (óvistað, tímamælir í gangi) | 'vistar' | 'villa'
  const S = { on: false, vinna: null, snap: null, drag: null, vistar: false, aftur: false, skrun: 0, gen: 0, timer: null, stada: 'vistad', villa: '' };
  const BID_MS = 400;

  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const SILVER_BTN = 'background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530';
  const METAL_BTN = 'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4';
  const RIVET = 'content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const I_RADA = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4"/></svg>';

  const toast = m => { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} };
  const grid = id => document.getElementById(id);
  const flisar = g => g ? Array.prototype.filter.call(g.children, e => e.matches && e.matches(TILE)) : [];
  const rodNu = () => GRIDS.map(id => flisar(grid(id)).map(t => +t.dataset.id));
  const view = () => document.getElementById('view-sala');
  const listiOpinn = () => { const g = grid('pos-services'), c = g && g.parentElement; return !!(c && c.style.display === 'none'); };
  const posState = () => (window.POS && POS.getState) ? POS.getState() : null;
  const allarRodir = () => { const st = posState(); return st ? (st.services || []).concat(st.products || []) : []; };
  const upptekid = () => !!(S.on || S.vistar || S.timer || S.drag);

  // Sami samanburður og pos.js sortTiles (rodun asc, null → aftast, svo stafrófsröð).
  const bera = (a, b) => {
    const ra = a.rodun == null ? 9999 : +a.rodun, rb = b.rodun == null ? 9999 : +b.rodun;
    return (ra - rb) || String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is');
  };
  // Raðar flísunum í ristunum eftir rodun í POS-state. Hreyfir aðeins þegar röðin er röng. Skilar true ef eitthvað færðist.
  function radaEftirRodun() {
    const m = new Map(allarRodir().map(p => [+p.id, p]));
    let breytt = false;
    GRIDS.forEach(id => {
      const g = grid(id); if (!g) return;
      const nu = flisar(g); if (nu.length < 2) return;
      const med = nu.map(t => ({ t, p: m.get(+t.dataset.id) || { rodun: null, nafn: ((t.querySelector('.pos-tile-name') || {}).textContent || '') } }));
      const rod = med.slice().sort((a, b) => bera(a.p, b.p));
      if (rod.every((x, i) => x.t === nu[i])) return;
      rod.forEach(x => g.appendChild(x.t));
      breytt = true;
    });
    return breytt;
  }

  function css() {
    if (document.getElementById('_srod-css')) return;
    const s = document.createElement('style');
    s.id = '_srod-css';
    const V = '#view-sala._srod-on ';
    const B = '#view-sala #_srod-bar:not(#_p496a):not(#_p496b):not(#_p496c):not(#_p496d) ';
    const vigt = st => st.split(';').filter(Boolean).map(x => x + '!important').join(';');
    s.textContent =
      V + '#pos-services,' + V + '#pos-products{counter-reset:srod}' +
      V + '#pos-services>.pos-svc,' + V + '#pos-products>.pos-prod{cursor:grab!important;touch-action:none!important;user-select:none;-webkit-user-select:none;outline:1.5px dashed rgba(20,24,34,.38);outline-offset:-4px;transform:none!important}' +
      V + '#pos-services>.pos-svc::after,' + V + '#pos-products>.pos-prod::after{counter-increment:srod;content:counter(srod);position:absolute;bottom:4px;right:6px;font:700 10px/1 ' + MONO + ';color:#4a5363;letter-spacing:.04em}' +
      V + '._srod-sett{opacity:.28!important;outline:2px dashed #1c1e23!important}' +
      '._srod-ghost{position:fixed!important;z-index:2147483000!important;pointer-events:none!important;margin:0!important;box-shadow:0 16px 34px rgba(0,0,0,.38)!important;transform:rotate(-2deg) scale(1.04)!important;opacity:.96;cursor:grabbing!important}' +
      '#_srod-tak[data-active="1"]{background:#1c1e23!important;border-color:#000!important;color:#fff!important}' +
      '#_srod-bar{position:sticky;top:8px;z-index:60;display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 10px;padding:9px 18px 9px 24px;border-radius:12px;background:' + METAL + ';border:1px solid #000;box-shadow:0 8px 22px -10px rgba(0,0,0,.6);color:#eef1f4}' +
      '#_srod-bar::before{' + RIVET + ';left:9px}#_srod-bar::after{' + RIVET + ';right:9px}' +
      '#_srod-bar .-lbl{font:700 11px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#c9d0db}' +
      '#_srod-bar .-txt{flex:1;min-width:180px;font-size:12.5px;color:#d7dce3}' +
      '#_srod-bar .-plata{font:700 10.5px/1 ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;padding:5px 8px;border-radius:3px;min-width:74px;text-align:center;' + SILVER_BTN + '}' +
      '#_srod-bar .-plata[data-s="villa"]{background:linear-gradient(180deg,#ffb4ab,#e25555)!important;color:#3a0b07!important}' +
      // Þemað (Brunastál) málar takka með !important — gervi-auðkenni + !important (brunastal-c.md, gildra 3).
      B + 'button{height:34px!important;min-height:0!important;padding:0 14px!important;border-radius:9px!important;font:inherit!important;font-size:13px!important;font-weight:700!important;cursor:pointer;text-shadow:none!important}' +
      B + 'button.-aftur{' + vigt(SILVER_BTN) + '}' +
      B + 'button.-lokid{' + vigt(METAL_BTN) + '}' +
      '#_srod-bar .-villa{width:100%;font-size:12px;color:#ffb4ab}';
    document.head.appendChild(s);
  }

  // ── takkinn í Flísar/Listi-röðinni (299) ─────────────────────────────────
  function festaTakka() {
    if (document.getElementById('_srod-tak')) return;
    const sw = document.querySelector('#view-sala ._vlb-switch');
    if (!sw) return;
    const b = document.createElement('button');
    b.type = 'button'; b.id = '_srod-tak'; b.dataset.active = S.on ? '1' : '0';
    b.title = 'Raða flísunum á Söluborðinu — dragðu þær í röð (röðin vistast sjálf og gildir á öllum vélum)';
    b.innerHTML = I_RADA + 'Raða';
    b.addEventListener('click', () => (S.on ? lokid() : kveikja()));
    const beta = sw.querySelector('.-beta');
    sw.insertBefore(b, beta || null);
  }

  // ── ham ──────────────────────────────────────────────────────────────────
  function kveikja() {
    const v = view(); if (!v) return;
    if (listiOpinn()) { toast('Raða virkar á Flísum — veldu Flísar fyrst'); return; }
    if (!flisar(grid('pos-services')).length && !flisar(grid('pos-products')).length) { toast('Engar flísar að raða'); return; }
    css();
    radaEftirRodun();   // flísarnar eru í röð þjónsins (rodun) áður en nokkuð er dregið — ekkert „frávik" sem fyrsta sleppingin skrifaði yfir
    S.on = true; S.vinna = rodNu(); S.snap = null; S.stada = 'vistad'; S.villa = '';
    v.classList.add('_srod-on');
    const tak = document.getElementById('_srod-tak'); if (tak) tak.dataset.active = '1';
    teiknaStiku();
  }
  function slokkva() {
    S.on = false; S.drag = null; S.vinna = null;
    const v = view(); if (v) v.classList.remove('_srod-on');
    const tak = document.getElementById('_srod-tak'); if (tak) tak.dataset.active = '0';
    const bar = document.getElementById('_srod-bar'); if (bar) bar.remove();
  }
  // „Lokið": skolar óvistað strax (vistunin heldur áfram í bakgrunni) og lýkur hamnum.
  function lokid() {
    skola();
    slokkva();
  }

  const PLATA = { vistad: 'Vistað', bid: 'Óvistað', vistar: 'Vistar…', villa: 'Villa' };
  function teiknaStiku() {
    if (!S.on) return;
    let bar = document.getElementById('_srod-bar');
    if (!bar) {
      const g = grid('pos-services'), card = g && g.parentElement;
      if (!card || !card.parentElement) return;
      bar = document.createElement('div');
      bar.id = '_srod-bar';
      card.parentElement.insertBefore(bar, card);
      bar.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('-lokid')) lokid();
        else if (b.classList.contains('-aftur')) vista();
      });
    }
    const villaHtml = S.villa ? '<div class="-villa">' + String(S.villa).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + '</div>' : '';
    bar.innerHTML =
      '<span class="-lbl">Raða Söluborði</span>' +
      '<span class="-txt">Dragðu flísarnar þangað sem þær eiga að vera — röðin vistast sjálf og gildir á öllum vélum. Smellur bætir ekki í körfu á meðan.</span>' +
      '<span class="-plata" data-s="' + S.stada + '" role="status">' + PLATA[S.stada] + '</span>' +
      (S.stada === 'villa' ? '<button type="button" class="-aftur">Reyna aftur</button>' : '') +
      '<button type="button" class="-lokid">Lokið</button>' +
      villaHtml;
  }

  // Raðar flísunum eftir S.vinna (eftir endurteikningu pos.js). Nýjar flísar aftast.
  function setjaRod() {
    GRIDS.forEach((id, gi) => {
      const g = grid(id); if (!g || !S.vinna) return;
      const nu = flisar(g);
      if (nu.map(t => +t.dataset.id).join() === S.vinna[gi].join()) return;
      const eftirId = new Map(nu.map(t => [+t.dataset.id, t]));
      const rod = S.vinna[gi].map(i => eftirId.get(i)).filter(Boolean);
      nu.forEach(t => { if (rod.indexOf(t) < 0) rod.push(t); });
      rod.forEach(t => g.appendChild(t));
      S.vinna[gi] = rod.map(t => +t.dataset.id);   // horfin flís fer út úr vinnuröðinni — annars misræmi og lykkja
    });
  }

  // ── vista: vorur.rodun (sjálfvirkt) ──────────────────────────────────────
  function boda() {
    S.stada = 'bid'; S.villa = '';
    clearTimeout(S.timer);
    S.timer = setTimeout(() => { S.timer = null; vista(); }, BID_MS);
    teiknaStiku();
  }
  // Skolar óvistað STRAX (Lokið, brottför af síðu). Kallar ekki á neitt ef ekkert bíður.
  function skola() {
    if (!S.timer) return;
    clearTimeout(S.timer); S.timer = null;
    try { vista(); } catch (_) {}
  }
  async function vista() {
    if (S.vistar) { S.aftur = true; return; }   // nýtt snapshot bíður — vistað strax þegar núverandi lýkur
    const snap = S.snap; if (!snap) { if (S.on) { S.stada = 'vistad'; teiknaStiku(); } return; }
    if (!window.DB || !DB.sb) { S.stada = 'villa'; S.villa = 'Engin tenging við gagnagrunn — röðin er óvistuð.'; teiknaStiku(); return; }
    const st = posState();
    if (!st) { S.stada = 'villa'; S.villa = 'Vörulistinn er ekki hlaðinn — röðin er óvistuð.'; teiknaStiku(); return; }
    clearTimeout(S.timer); S.timer = null;
    const genVid = S.gen;
    const allar = allarRodir();
    const breytt = [];
    snap.forEach(r => r.forEach((id, i) => {
      const p = allar.find(x => +x.id === id), rodun = (i + 1) * 10;
      if (p && +p.rodun !== rodun) breytt.push({ id, rodun, p });   // flís sem er ekki í POS-state er aldrei skrifuð (gamalt hnútaauðkenni)
    }));
    if (!breytt.length) { if (S.gen === genVid) { S.stada = 'vistad'; S.villa = ''; teiknaStiku(); } return; }
    S.vistar = true; S.stada = 'vistar'; S.villa = ''; teiknaStiku();
    const villur = [];
    for (let i = 0; i < breytt.length; i += 6) {
      await Promise.all(breytt.slice(i, i + 6).map(async b => {
        let r = null;
        try { r = await DB.sb.from('vorur').update({ rodun: b.rodun }).eq('id', b.id).select('id,rodun'); } catch (e) { r = { error: { message: (e && e.message) || 'villa' } }; }
        // supabase-js kastar aldrei: lesa .error OG raðirnar sem komu til baka (0 raðir = ekkert var skrifað).
        const ok = !!(r && !r.error && Array.isArray(r.data) && r.data.length === 1 && +r.data[0].rodun === b.rodun);
        if (ok) b.p.rodun = b.rodun;
        else villur.push((b.p.nafn || ('vara ' + b.id)) + ': ' + ((r && r.error && r.error.message) || '0 raðir breyttust'));
      }));
    }
    S.vistar = false;
    if (villur.length) {
      S.stada = 'villa';
      S.villa = 'Röðin vistaðist ekki á ' + villur.length + ' af ' + breytt.length + ' vörum — reyndu aftur: ' + villur.slice(0, 3).join(' · ');
      try { if (window.logProblem) window.logProblem('sala_rodun_vistun', villur.join(' | ').slice(0, 300)); } catch (_) {}
      if (!S.on) toast('Röðin vistaðist ekki á ' + villur.length + ' vörum — opnaðu Raða og reyndu aftur');
      teiknaStiku();
      return;
    }
    if (S.gen !== genVid || S.aftur) { S.aftur = false; return vista(); }   // ný sleppingin kom á meðan — vista nýjasta snapshot
    S.stada = 'vistad'; S.villa = '';
    teiknaStiku();
    toast('Röðin vistuð');
  }

  // ── draga (pointer events: mús + snerting) ───────────────────────────────
  document.addEventListener('pointerdown', e => {
    if (!S.on || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const t = e.target.closest && e.target.closest(TILE);
    const g = t && t.parentElement;
    if (!g || GRIDS.indexOf(g.id) < 0) return;
    e.preventDefault();
    S.drag = { t, g, x0: e.clientX, y0: e.clientY, virk: false, ghost: null, dx: 0, dy: 0, y: e.clientY };
  }, true);

  document.addEventListener('pointermove', e => {
    const d = S.drag; if (!d) return;
    if (!d.virk) {
      if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 6) return;
      const r = d.t.getBoundingClientRect();
      d.dx = d.x0 - r.left; d.dy = d.y0 - r.top;
      d.ghost = d.t.cloneNode(true);
      d.ghost.classList.add('_srod-ghost');
      d.ghost.style.width = r.width + 'px'; d.ghost.style.height = r.height + 'px';
      document.body.appendChild(d.ghost);
      d.t.classList.add('_srod-sett');
      d.virk = true;
      skruna();
    }
    e.preventDefault();
    d.y = e.clientY;
    d.ghost.style.left = (e.clientX - d.dx) + 'px';
    d.ghost.style.top = (e.clientY - d.dy) + 'px';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const yfir = el && el.closest && el.closest(TILE);
    if (yfir && yfir !== d.t && yfir.parentElement === d.g) {
      const r = yfir.getBoundingClientRect();
      const eftir = e.clientX > r.left + r.width / 2;
      const ref = eftir ? yfir.nextSibling : yfir;
      if (ref !== d.t && d.t.nextSibling !== ref) d.g.insertBefore(d.t, ref);
    } else if (el === d.g) {
      const sidasta = flisar(d.g).slice(-1)[0];
      if (sidasta && sidasta !== d.t && e.clientY > sidasta.getBoundingClientRect().top) d.g.appendChild(d.t);
    }
  }, { capture: true, passive: false });

  function lokaDrag() {
    const d = S.drag; if (!d) return;
    S.drag = null;
    if (d.ghost) d.ghost.remove();
    d.t.classList.remove('_srod-sett');
    if (d.virk) {
      S.vinna = rodNu();
      S.snap = rodNu();   // snapshot frá SLEPPINGARSTUNDU — vistað úr honum, ekki úr DOM þegar tímamælirinn springur
      S.gen++;
      boda();             // vista sjálft: breyting án þess að nokkur þurfi að ýta á takka
    }
  }
  document.addEventListener('pointerup', lokaDrag, true);
  document.addEventListener('pointercancel', lokaDrag, true);

  // Sjálfvirkt skrun við efri/neðri brún á meðan dregið er (skrunar glugganum og næsta skrunhólfi).
  function skrunHolf(el) {
    for (let n = el && el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 4) return n;
    }
    return null;
  }
  function skruna() {
    const d = S.drag; if (!d || !d.virk) return;
    const brun = 70, h = window.innerHeight;
    const skref = d.y < brun ? -Math.ceil((brun - d.y) / 4) : d.y > h - brun ? Math.ceil((d.y - (h - brun)) / 4) : 0;
    if (skref) { const holf = skrunHolf(d.g); if (holf) holf.scrollTop += skref; else window.scrollBy(0, skref); }
    requestAnimationFrame(skruna);
  }

  // Smellur á flís í ham: hvorki í körfu né 🔍-gluggi (pos.js hlustar á ristinni í bólufasa).
  document.addEventListener('click', e => {
    if (!S.on) return;
    const t = e.target.closest && e.target.closest(TILE);
    if (t && t.parentElement && GRIDS.indexOf(t.parentElement.id) >= 0) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener('keydown', e => { if (S.on && e.key === 'Escape' && !S.drag) lokid(); });

  // Vistun skoluð við brottför (365 VistunarSkol + visibilitychange/pagehide): óvistuð röð má aldrei hverfa þótt flipanum sé lokað.
  try { if (window.VistunarSkol && VistunarSkol.skra) VistunarSkol.skra(skola); } catch (_) {}
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') skola(); });
  window.addEventListener('pagehide', skola);

  // ── festing: takkinn og endurteikningar pos.js ───────────────────────────
  // Vaktin keyrir tikk beint (örverkefni, fyrir málun — og líka í földu spjaldi þar sem rAF stendur kyrrt).
  // Hún skrifar aðeins það sem vantar (takka einu sinni, röð við misræmi, stiku einu sinni): engin lykkja.
  function tikk() {
    festaTakka();
    if (!S.on) return;
    if (!view() || !view().classList.contains('_srod-on')) { slokkva(); return; }   // pos.js teiknaði síðuna upp á nýtt
    if (listiOpinn()) { lokid(); return; }
    if (!S.drag) setjaRod();
    if (!document.getElementById('_srod-bar')) teiknaStiku();
  }
  function vakta() {
    const v = view();
    if (!v) { setTimeout(vakta, 500); return; }
    // Óinngjöfuð vakt (252 __NativeMutationObserver): endurteikni pos.js ristina á röðin að standa í SAMA verki,
    // áður en rammi með rangri röð sést. Inngjöfuð vakt bíður eftir rAF og þegir í földu spjaldi.
    const MO = window.__NativeMutationObserver || window.MutationObserver;
    new MO(() => { if (!S.drag) tikk(); }).observe(v, { childList: true, subtree: true });
    tikk();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta); else vakta();

  window.SalaRodun = { kveikja, lokid, haetta: lokid, vista, virkt: () => S.on, upptekid, gen: () => S.gen, radaEftirRodun };
})();
