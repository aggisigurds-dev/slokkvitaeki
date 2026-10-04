/* === TEIKNING: SKARPT VIÐ AÐDRÁTT ÚR VIGUR-PDF (438) =========================
 *
 * Agnar 04.10.2026 (Fiskislóð 41, 538%): „Þetta er bara ekki að koma nægilega vel út". Þysjun gluggans (383 zBeita)
 * er CSS-skölun á #fp-canvas — 6006 px JPEG skjalasafnsins stækkar þá í pixla. Sé frumrit hæðarinnar VIGUR-PDF er
 * sýnilegi hlutinn teiknaður beint úr PDF-inu í skjáupplausn, á eigið lag (z 4) ofan á myndinni með multiply-blöndun.
 * Tækin teiknast INN Í #fp-canvas (FloorPlan), svo á meðan skarpa lagið sést teiknar canvasinn hvítan grunn í stað
 * myndarinnar (drawImage(bgImage) er gripið) — tækin standa þá óhögguð á hvítu og skörpu línurnar leggjast yfir.
 * Svæði hæðarinnar er forteiknað einu sinni í bakgrunni (pdf.js, ~8 s á Fiskislóð); eftir það fylgir skerpan
 * þysjun og færslu í hverjum ramma. Engin gögn breytast; skannanir (ekki PDF) eru óbreyttar.
 *
 * Varpanir: skjár = canvas-rammi (getBoundingClientRect, með CSS-skölun) + (frummyndar-px − G.rymi) × k, þar sem
 * k = skjápx/canvas-px; frummyndar-px = PDF-pt × (frum.b / síðubreidd).
 * ========================================================================== */
(() => {
  if (window.__teiknSkarpt) return;
  window.__teiknSkarpt = true;

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';   // sama útgáfa og 383/435
  const S = { lykill: '', pdf: null, pdfSlod: '', pdfBid: null, blad: null, bladBid: null, virkt: false, bilad: {} };

  // drawImage(bgImage) á #fp-canvas → hvítur flötur á meðan skarpa lagið er virkt (tækin teiknast áfram ofan á).
  function grip(c) {
    const ctx = c.getContext('2d');
    if (!ctx || ctx.__skarpt) return;
    const upp = ctx.drawImage;
    ctx.drawImage = function (img) {
      if (S.virkt && window.FloorPlan && img && img === FloorPlan.bgImage) {
        const a = arguments;
        let x = 0, y = 0, w = img.width, h = img.height;
        if (a.length === 3) { x = a[1]; y = a[2]; }
        else if (a.length === 5) { x = a[1]; y = a[2]; w = a[3]; h = a[4]; }
        else if (a.length === 9) { x = a[5]; y = a[6]; w = a[7]; h = a[8]; }
        const f = this.fillStyle; this.fillStyle = '#fff'; this.fillRect(x, y, w, h); this.fillStyle = f;
        return;
      }
      return upp.apply(this, arguments);
    };
    ctx.__skarpt = true;
  }
  function setjaVirkt(v) {
    if (S.virkt === v) return;
    S.virkt = v;
    try { if (window.FloorPlan && FloorPlan._renderCanvas) FloorPlan._renderCanvas(); } catch (_) {}
  }

  function saekjaPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise((res, rej) => {
      const sk = document.createElement('script'); sk.src = PDFJS + 'pdf.min.js';
      sk.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } catch (_) {} res(); };
      sk.onerror = () => rej(new Error('pdf.js')); document.head.appendChild(sk);
    });
  }
  // sama regla og 383 pdfSlod: image_url = teikn-mynd?url=<permalink>; .pdf.info (Reykjavík) og .pdf (Hafnarfjörður) → teikn-pdf
  function pdfSlod(h) {
    try {
      const u = new URL(h.image_url, location.href), inn = u.searchParams.get('url') || '';
      return /\.pdf(\.info)?$/i.test(new URL(inn).pathname) ? '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn) : '';
    } catch (_) { return ''; }
  }
  async function saekjaSidu(slod) {
    if (S.pdf && S.pdfSlod === slod) return S.pdf;
    if (S.pdfBid && S.pdfSlod === slod) return S.pdfBid;
    S.pdfSlod = slod; S.pdf = null;
    S.pdfBid = (async () => {
      await saekjaPdfJs();
      const r = await fetch(slod);
      if (!r.ok) throw new Error('Svar ' + r.status);
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise;
      const sida = await doc.getPage(1);
      const vp = sida.getViewport({ scale: 1 });
      S.pdf = { sida, b: vp.width, h: vp.height };
      return S.pdf;
    })().catch(e => {
      // PDF sem fæst ekki (t.d. 10 MB skjal sem netfallið klippir við 10 s — Álfaborg 2. hæð) er ekki reynt aftur í
      // þessari lotu: annars sóttust ~3 MB á 30 s fresti á meðan glugginn stóð opinn. Teikningin sést áfram (JPEG).
      S.bilad[slod] = 1; S.pdfSlod = ''; S.pdfBid = null; S.villaTimi = Date.now(); throw e;
    });
    return S.pdfBid;
  }

  function lag(main) {
    let c = document.getElementById('fp-skarpt');
    if (!c || c.parentNode !== main) {
      if (c) c.remove();
      c = document.createElement('canvas'); c.id = 'fp-skarpt';
      c.style.cssText = 'position:absolute;left:0;top:0;z-index:4;pointer-events:none;opacity:0;mix-blend-mode:multiply';
      main.appendChild(c);
    }
    return c;
  }

  function stada() {
    const m = document.getElementById('modal-floorplan');
    if (!m || !m.classList.contains('open') || !window.FloorPlan || !window.TeiknBord) return null;
    if (document.getElementById('fp-3d')) return null;
    const main = m.querySelector('#fp-main'), c = m.querySelector('#fp-canvas');
    if (!main || !c || c.style.display === 'none' || !c.width) return null;
    const hs = TeiknBord.haedir(), h = hs && hs[TeiknBord.virk()];
    if (!h || !h.frum || !h.frum.b) return null;
    const slod = pdfSlod(h);
    if (!slod) return null;
    const mr = main.getBoundingClientRect(), cr = c.getBoundingClientRect();
    if (cr.width < 4 || mr.width < 4) return null;
    return { main, c, h, slod, mr, cr, rymi: TeiknBord.rymi() };
  }

  // FORTEIKNAÐ BLAÐ (04.10.2026, mælt á lifandi síðu: pdf.js-teikning Fiskislóðar = 72 þús. aðgerðir ≈ 8 s í hvert
  // sinn — of hægt fyrir hverja þysjun). Svæði hæðarinnar (skurðurinn, annars allt blaðið) er teiknað EINU sinni í
  // bakgrunni í hárri upplausn (≤ 24 MP, ≤ 5 díl/pt); þysjun og færsla afrita svo aðeins sýnilega hlutann (ms).
  function svaedi(st, sida) {
    const kp = st.h.frum.b / sida.b;                       // frummyndar-px á pt
    const sk = st.h.skurdur && st.h.skurdur.w > 8 ? st.h.skurdur : null;
    const x0 = sk ? sk.x / kp : 0, y0 = sk ? sk.y / kp : 0;
    const w = sk ? sk.w / kp : sida.b, h = sk ? sk.h / kp : sida.h;
    const simi = window.matchMedia && matchMedia('(max-width: 900px)').matches;
    const R = Math.min(5, Math.sqrt((simi ? 10e6 : 24e6) / (w * h)));
    return { x0, y0, w, h, R, kp, lykill: st.slod + '|' + [x0, y0, w, h].map(Math.round).join(',') + '|' + R.toFixed(2) };
  }
  async function forteikna(st) {
    let sida;
    try { sida = await saekjaSidu(st.slod); } catch (e) { console.warn('[438] PDF', e); return null; }
    const sv = svaedi(st, sida);
    if (S.blad && S.blad.lykill === sv.lykill) return S.blad;
    if (S.bladBid && S.bladBid.lykill === sv.lykill) return S.bladBid.p;
    const p = (async () => {
      const W = Math.ceil(sv.w * sv.R), H = Math.ceil(sv.h * sv.R);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const cx = cv.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H);
      const vp = sida.sida.getViewport({ scale: sv.R, offsetX: -sv.x0 * sv.R, offsetY: -sv.y0 * sv.R });
      await sida.sida.render({ canvasContext: cx, viewport: vp }).promise;
      S.blad = Object.assign({ canvas: cv }, sv);
      S.lykill = '';                                        // teikna strax á skjáinn
      return S.blad;
    })().catch(e => { console.warn('[438] forteiknun', e); S.villaTimi = Date.now(); return null; }).finally(() => { if (S.bladBid && S.bladBid.lykill === sv.lykill) S.bladBid = null; });
    S.bladBid = { lykill: sv.lykill, p };
    return p;
  }
  function afrita(st) {
    const bl = S.blad;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(st.mr.width * dpr), H = Math.round(st.mr.height * dpr);
    const l = lag(st.main);
    if (l.width !== W || l.height !== H) { l.width = W; l.height = H; }
    l.style.width = st.mr.width + 'px'; l.style.height = st.mr.height + 'px';
    const x = l.getContext('2d');
    x.clearRect(0, 0, W, H);
    const k = st.cr.width / st.c.width;                    // skjápx á canvas-px (canvas-px = frummyndar-px − rymi)
    // forteiknaða blaðið: pt (x0..) × R  →  frummyndar-px = pt × kp  →  skjár
    const s = k * bl.kp / bl.R;                             // skjápx á forteikningar-px
    const dx = (st.cr.left - st.mr.left) + (bl.x0 * bl.kp - st.rymi.x) * k;
    const dy = (st.cr.top - st.mr.top) + (bl.y0 * bl.kp - st.rymi.y) * k;
    x.save();
    x.beginPath();
    x.rect((st.cr.left - st.mr.left) * dpr, (st.cr.top - st.mr.top) * dpr, st.cr.width * dpr, st.cr.height * dpr);
    x.clip();
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.setTransform(dpr * s, 0, 0, dpr * s, dx * dpr, dy * dpr);
    // aðeins sýnilegi hlutinn af forteikningunni (24 MP) — annars kostar hver rammi tugi ms
    const vx0 = Math.max(0, st.cr.left - st.mr.left), vx1 = Math.min(st.mr.width, st.cr.right - st.mr.left);
    const vy0 = Math.max(0, st.cr.top - st.mr.top), vy1 = Math.min(st.mr.height, st.cr.bottom - st.mr.top);
    const sx0 = Math.max(0, Math.floor((vx0 - dx) / s) - 1), sx1 = Math.min(bl.canvas.width, Math.ceil((vx1 - dx) / s) + 1);
    const sy0 = Math.max(0, Math.floor((vy0 - dy) / s) - 1), sy1 = Math.min(bl.canvas.height, Math.ceil((vy1 - dy) / s) + 1);
    if (sx1 > sx0 && sy1 > sy0) x.drawImage(bl.canvas, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0, sy0, sx1 - sx0, sy1 - sy0);
    x.setTransform(1, 0, 0, 1, 0, 0);
    // „Skýrari veggir": blaðið deyft eins og í 383 (globalAlpha 0,85) svo PDF-veggirnir á yfirlaginu standi út.
    if (st.h.syn && st.h.syn.a && st.h.pdfVeggir && st.h.pdfVeggir.length) {
      x.globalAlpha = 0.15; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
    }
    x.restore();
    grip(st.c);
    setjaVirkt(true);          // canvasinn: hvítt í stað myndar, tækin ofan á
    l.style.opacity = '1';
  }

  function tikk() {
    const st = stada();
    const l = document.getElementById('fp-skarpt');
    if (!st) { if (l) l.style.opacity = '0'; S.lykill = ''; setjaVirkt(false); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // 6006 px JPEG skjalasafnsins er sjálf óskýr (1–2 px línur, JPEG-suð) — sést vel löngu áður en hún nær 1:1.
    // Skarpt um leið og meira en hálfur díll myndarinnar fer á hvern skjádíl.
    const upp = (st.cr.width / st.c.width) * dpr > 0.45;
    // Forteikna strax við opnun (líka áður en þysjað er) svo skerpan sé tilbúin þegar á þarf að halda.
    const sv = S.pdf ? svaedi(st, S.pdf) : null;
    const tilbuid = !!(S.blad && sv && S.blad.lykill === sv.lykill);
    // ekki reyna aftur í hverjum ramma eftir villu — 30 s bið
    if (!tilbuid && !S.bladBid && !S.bilad[st.slod] && (S.pdf || !S.pdfBid) && Date.now() - (S.villaTimi || 0) > 30000) forteikna(st);
    const lykill = [st.slod, Math.round(st.cr.left), Math.round(st.cr.top), Math.round(st.cr.width), st.c.width,
      st.rymi.x, st.rymi.y, Math.round(st.mr.width), Math.round(st.mr.height), upp, tilbuid, !!(st.h.syn && st.h.syn.a)].join('|');
    if (lykill === S.lykill) return;
    S.lykill = lykill;
    if (!upp || !tilbuid) { if (l) l.style.opacity = '0'; setjaVirkt(false); return; }
    afrita(st);                                             // afritun úr forteikningu — nógu hröð fyrir hvern ramma
  }

  // Á meðan teikningin er á leiðinni: „Sæki teikninguna…" í stað „Hlaða upp teikningu" (sem leit út eins og ekkert
  // væri til — Agnar 04.10.2026 sá tóman glugga sem var aðeins enn að hlaðast).
  function hledsla() {
    const m = document.getElementById('modal-floorplan');
    const main = m && m.classList.contains('open') ? m.querySelector('#fp-main') : null;
    let e = document.getElementById('fp-saeki');
    let a = false;
    if (main && window.FloorPlan && !FloorPlan.bgImage) {
      const p = FloorPlan.plans && FloorPlan.plans[FloorPlan.companyId];
      const hs = p && p.haedir, h = hs && window.TeiknBord ? hs[TeiknBord.virk()] : null;
      a = !!((h && h.image_url) || (p && p.imageUrl));
    }
    if (!a) { if (e) e.remove(); return; }
    if (!e || e.parentNode !== main) {
      if (e) e.remove();
      e = document.createElement('div'); e.id = 'fp-saeki';
      e.style.cssText = 'position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;background:#1a1814;color:rgba(255,255,255,.78);font:600 14px system-ui,sans-serif;pointer-events:none';
      e.textContent = 'Sæki teikninguna…';
      main.appendChild(e);
    }
  }

  function lykkja() { try { tikk(); hledsla(); } catch (e) { console.warn('[438]', e); } requestAnimationFrame(lykkja); }
  requestAnimationFrame(lykkja);
  window.TeiknSkarpt = { tikk, stada: () => S };
})();
