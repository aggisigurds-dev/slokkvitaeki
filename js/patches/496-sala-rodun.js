/* === SÖLUBORÐ · RAÐA FLÍSUNUM (496) — 03.11.2026 ===
 *
 * Agnar 03.11.2026: „Geturðu sett inn nýjan Söluborðs View með adjuster, dregið vörurnar til eftir hvar
 * þær eiga að vera í röðinni í Sala borð".
 *
 * Takkinn „Raða" við Flísar / Listi (299) kveikir á röðunarham á Söluborðinu: flísarnar í Þjónustu og Vörum
 * dragast til (mús og snerting — pointer events), hver flís ber sætið sitt, smellur bætir EKKI í körfu, og
 * „Vista röð" skrifar vorur.rodun (10, 20, 30 … í sýndu röðinni). Það er sami dálkur og pos.js sortTiles
 * raðar eftir („Röðun" í Vörur og þjónusta) — á þjóninum, eins á öllum vélum. Aðeins breyttar raðir
 * skrifast, hver villa er sögð. Vörur sem sjást ekki (stjörnusían) halda sinni röðun.
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
  const S = { on: false, upphaf: null, vinna: null, drag: null, vistar: false, skrun: 0 };

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
      '#_srod-bar .-plata{font:700 10.5px/1 ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;padding:5px 8px;border-radius:3px;' + SILVER_BTN + '}' +
      // Þemað (Brunastál) málar takka með !important — gervi-auðkenni + !important (brunastal-c.md, gildra 3).
      B + 'button{height:34px!important;min-height:0!important;padding:0 14px!important;border-radius:9px!important;font:inherit!important;font-size:13px!important;font-weight:700!important;cursor:pointer;text-shadow:none!important}' +
      B + 'button.-haetta{' + vigt(SILVER_BTN) + '}' +
      B + 'button.-vista{' + vigt(METAL_BTN) + '}' +
      B + 'button:disabled{opacity:.38!important;pointer-events:none}' +
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
    b.title = 'Raða flísunum á Söluborðinu — dragðu þær í röð og vistaðu (gildir á öllum vélum)';
    b.innerHTML = I_RADA + 'Raða';
    b.addEventListener('click', () => (S.on ? haetta() : kveikja()));
    const beta = sw.querySelector('.-beta');
    sw.insertBefore(b, beta || null);
  }

  // ── ham ──────────────────────────────────────────────────────────────────
  function kveikja() {
    const v = view(); if (!v) return;
    if (listiOpinn()) { toast('Raða virkar á Flísum — veldu Flísar fyrst'); return; }
    if (!flisar(grid('pos-services')).length && !flisar(grid('pos-products')).length) { toast('Engar flísar að raða'); return; }
    css();
    S.on = true; S.upphaf = rodNu(); S.vinna = rodNu();
    v.classList.add('_srod-on');
    const tak = document.getElementById('_srod-tak'); if (tak) tak.dataset.active = '1';
    teiknaStiku();
  }
  function slokkva() {
    S.on = false; S.drag = null; S.upphaf = null; S.vinna = null;
    const v = view(); if (v) v.classList.remove('_srod-on');
    const tak = document.getElementById('_srod-tak'); if (tak) tak.dataset.active = '0';
    const bar = document.getElementById('_srod-bar'); if (bar) bar.remove();
  }
  function haetta() {
    if (S.vistar) return;
    if (S.upphaf) { S.vinna = S.upphaf; setjaRod(); }
    slokkva();
  }

  const fjoldiFaerdra = () => {
    if (!S.upphaf) return 0;
    const nu = rodNu();
    let n = 0;
    nu.forEach((r, gi) => r.forEach((id, i) => { if (S.upphaf[gi][i] !== id) n++; }));
    return n;
  };
  function teiknaStiku(villa) {
    let bar = document.getElementById('_srod-bar');
    if (!bar) {
      const g = grid('pos-services'), card = g && g.parentElement;
      if (!card || !card.parentElement) return;
      bar = document.createElement('div');
      bar.id = '_srod-bar';
      card.parentElement.insertBefore(bar, card);
      bar.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.classList.contains('-haetta')) haetta();
        else if (b.classList.contains('-vista')) vista();
      });
    }
    const n = fjoldiFaerdra();
    bar.innerHTML =
      '<span class="-lbl">Raða Söluborði</span>' +
      '<span class="-txt">Dragðu flísarnar þangað sem þær eiga að vera. Smellur bætir ekki í körfu á meðan.</span>' +
      '<span class="-plata">' + (n ? n + ' færð' : 'Óbreytt') + '</span>' +
      '<button type="button" class="-haetta"' + (S.vistar ? ' disabled' : '') + '>Hætta við</button>' +
      '<button type="button" class="-vista"' + (n && !S.vistar ? '' : ' disabled') + '>' + (S.vistar ? 'Vistar…' : 'Vista röð') + '</button>' +
      (villa ? '<div class="-villa">' + String(villa).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + '</div>' : '');
  }

  // Raðar flísunum eftir S.vinna (eftir endurteikningu pos.js eða Hætta við). Nýjar flísar aftast.
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

  // ── vista: vorur.rodun ───────────────────────────────────────────────────
  async function vista() {
    if (S.vistar || !window.DB || !DB.sb) return;
    const st = (window.POS && POS.getState) ? POS.getState() : null;
    const allar = st ? (st.services || []).concat(st.products || []) : [];
    const breytt = [];
    rodNu().forEach(r => r.forEach((id, i) => {
      const p = allar.find(x => x.id === id), rodun = (i + 1) * 10;
      if (!p || +p.rodun !== rodun) breytt.push({ id, rodun, p });
    }));
    if (!breytt.length) { slokkva(); return; }
    S.vistar = true; teiknaStiku();
    const villur = [];
    for (let i = 0; i < breytt.length; i += 6) {
      await Promise.all(breytt.slice(i, i + 6).map(async b => {
        const r = await DB.sb.from('vorur').update({ rodun: b.rodun }).eq('id', b.id);
        if (r && r.error) villur.push(((b.p && b.p.nafn) || ('vara ' + b.id)) + ': ' + (r.error.message || 'villa'));
        else if (b.p) b.p.rodun = b.rodun;
      }));
    }
    S.vistar = false;
    if (villur.length) {
      teiknaStiku('Röðin vistaðist ekki á ' + villur.length + ' af ' + breytt.length + ' vörum — reyndu aftur: ' + villur.slice(0, 3).join(' · '));
      try { if (window.logProblem) window.logProblem('sala_rodun_vistun', villur.join(' | ').slice(0, 300)); } catch (_) {}
      return;
    }
    slokkva();
    toast('Röðin vistuð — ' + breytt.length + ' vörur');
  }

  // ── draga (pointer events: mús + snerting) ───────────────────────────────
  document.addEventListener('pointerdown', e => {
    if (!S.on || S.vistar || (e.pointerType === 'mouse' && e.button !== 0)) return;
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
    if (d.virk) { S.vinna = rodNu(); teiknaStiku(); }
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
  document.addEventListener('keydown', e => { if (S.on && e.key === 'Escape' && !S.drag) haetta(); });

  // ── festing: takkinn og endurteikningar pos.js ───────────────────────────
  // Vaktin keyrir tikk beint (örverkefni, fyrir málun — og líka í földu spjaldi þar sem rAF stendur kyrrt).
  // Hún skrifar aðeins það sem vantar (takka einu sinni, röð við misræmi, stiku einu sinni): engin lykkja.
  function tikk() {
    festaTakka();
    if (!S.on) return;
    if (!view() || !view().classList.contains('_srod-on')) { slokkva(); return; }   // pos.js teiknaði síðuna upp á nýtt
    if (listiOpinn()) { haetta(); return; }
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

  window.SalaRodun = { kveikja, haetta, vista, virkt: () => S.on };
})();
