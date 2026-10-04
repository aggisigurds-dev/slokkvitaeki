/* === TEIKNING: SKARPT VIÐ AÐDRÁTT ÚR VIGUR-PDF (438) =========================
 *
 * Agnar 04.10.2026 (Fiskislóð 41, 538%): „Þetta er bara ekki að koma nægilega vel út". Þysjun gluggans (383 zBeita)
 * er CSS-skölun á #fp-canvas — 6006 px JPEG skjalasafnsins stækkar þá í pixla. Sé frumrit hæðarinnar VIGUR-PDF er
 * sýnilegi hlutinn teiknaður beint úr PDF-inu í skjáupplausn, á eigið lag (z 4) ofan á myndinni með multiply-blöndun.
 * Tækin teiknast INN Í #fp-canvas (FloorPlan), svo á meðan skarpa lagið sést teiknar canvasinn hvítan grunn í stað
 * myndarinnar (drawImage(bgImage) er gripið) — tækin standa þá óhögguð á hvítu og skörpu línurnar leggjast yfir.
 * Teiknað þegar þysjun/færsla stoppar (220 ms); á meðan hreyft er sést myndin eins og áður. Engin gögn breytast;
 * skannanir (ekki PDF) eru óbreyttar.
 *
 * Varpanir: skjár = canvas-rammi (getBoundingClientRect, með CSS-skölun) + (frummyndar-px − G.rymi) × k, þar sem
 * k = skjápx/canvas-px; frummyndar-px = PDF-pt × (frum.b / síðubreidd).
 * ========================================================================== */
(() => {
  if (window.__teiknSkarpt) return;
  window.__teiknSkarpt = true;

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';   // sama útgáfa og 383/435
  const S = { lykill: '', timi: 0, verk: null, pdf: null, pdfSlod: '', pdfBid: null, kyn: 0, virkt: false };

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
  // sama regla og 383 pdfSlod: image_url = teikn-mynd?url=<permalink>; .pdf.info → teikn-pdf
  function pdfSlod(h) {
    try {
      const u = new URL(h.image_url, location.href), inn = u.searchParams.get('url') || '';
      return /\.pdf\.info$/i.test(new URL(inn).pathname) ? '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn) : '';
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
    })().catch(e => { S.pdfSlod = ''; S.pdfBid = null; throw e; });
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

  async function teikna(st, kyn) {
    let sida;
    try { sida = await saekjaSidu(st.slod); } catch (e) { console.warn('[438] PDF', e); return; }
    if (kyn !== S.kyn) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const k = st.cr.width / st.c.width;               // skjápx á canvas-px
    const kp = st.h.frum.b / sida.b;                  // frummyndar-px á PDF-pt
    const W = Math.round(st.mr.width * dpr), H = Math.round(st.mr.height * dpr);
    const ox = (st.cr.left - st.mr.left - st.rymi.x * k) * dpr, oy = (st.cr.top - st.mr.top - st.rymi.y * k) * dpr;
    const vp = sida.sida.getViewport({ scale: k * kp * dpr, offsetX: ox, offsetY: oy });
    const t = document.createElement('canvas'); t.width = W; t.height = H;
    const tx = t.getContext('2d');
    tx.fillStyle = '#fff'; tx.fillRect(0, 0, W, H);
    if (S.verk) { try { S.verk.cancel(); } catch (_) {} }
    S.verk = sida.sida.render({ canvasContext: tx, viewport: vp });
    try { await S.verk.promise; } catch (_) { return; }   // hætt við (ný færsla)
    if (kyn !== S.kyn) return;
    const l = lag(st.main);
    l.width = W; l.height = H; l.style.width = st.mr.width + 'px'; l.style.height = st.mr.height + 'px';
    const x = l.getContext('2d');
    x.clearRect(0, 0, W, H);
    // aðeins innan teikningarinnar (skurðarins) — utan hennar sést dökki bakgrunnurinn áfram
    x.save(); x.beginPath();
    x.rect((st.cr.left - st.mr.left) * dpr, (st.cr.top - st.mr.top) * dpr, st.cr.width * dpr, st.cr.height * dpr);
    x.clip(); x.drawImage(t, 0, 0); x.restore();
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
    const lykill = [st.slod, Math.round(st.cr.left), Math.round(st.cr.top), Math.round(st.cr.width), st.c.width,
      st.rymi.x, st.rymi.y, Math.round(st.mr.width), Math.round(st.mr.height), upp].join('|');
    if (lykill === S.lykill) return;
    S.lykill = lykill; S.kyn++;
    if (l) l.style.opacity = '0';                         // gamla skerpan passar ekki lengur — myndin sést á meðan
    setjaVirkt(false);
    if (!upp) return;
    clearTimeout(S.timi);
    const kyn = S.kyn;
    S.timi = setTimeout(() => { if (kyn === S.kyn) teikna(stada() || st, kyn); }, 220);
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
  window.TeiknSkarpt = { tikk };
})();
