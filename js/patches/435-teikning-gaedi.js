/* === TEIKNING: GÆÐI (435) ==================================================
 *
 * Agnar 02.10.2026 ofan á stimpla/tákn: Forskoðun / Miðlungs / Full gæði.
 * Full gæði sækir vigur-PDF og teiknar það í hárri upplausn — bæði á
 * borðið og í veggagreiningu — svo þunnir veggir (Skútuvogur 4, Fiskislóð)
 * hverfi ekki inn í JPEG-forskoðunina. Útlitsval þessa tækis: localStorage.
 * ========================================================================== */
(() => {
  if (typeof window !== 'undefined' && window.TeiknGaedi) return;

  const LS = 'teikn_gaedi';
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const VAL = ['forskodun', 'midlungs', 'fullt'];
  const NOFN = { forskodun: 'Forskoðun', midlungs: 'Miðlungs', fullt: 'Full gæði' };
  const HLID = { forskodun: 2000, midlungs: 4000, fullt: 7200 };
  const VINNU = { forskodun: 1600, midlungs: 2200, fullt: 5200 };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const segja = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };

  function gildi() {
    try {
      const v = localStorage.getItem(LS);
      if (VAL.indexOf(v) >= 0) return v;
    } catch (_) {}
    return 'midlungs';
  }
  function hlid() { return HLID[gildi()] || HLID.midlungs; }
  function vinnuPx() { return VINNU[gildi()] || VINNU.midlungs; }

  let _lastPdf = null;
  let _bindBid = 0;
  const _blobs = [];
  function geymaBlob(url) {
    _blobs.push(url);
    while (_blobs.length > 6) {
      const u = _blobs.shift();
      try { URL.revokeObjectURL(u); } catch (_) {}
    }
    return url;
  }
  function canvasSlod(cv) {
    return new Promise(res => {
      cv.toBlob(b => {
        if (!b) { res(cv.toDataURL('image/jpeg', 0.92)); return; }
        res(geymaBlob(URL.createObjectURL(b)));
      }, 'image/jpeg', 0.92);
    });
  }

  function pdfSlodUrMynd(url) {
    try {
      const u = new URL(url, location.href);
      if (!/teikn-mynd/.test(u.pathname + u.search)) return '';
      const inn = u.searchParams.get('url') || '';
      if (!inn) return '';
      const p = new URL(inn).pathname;
      if (!/\.pdf(\.info)?$/i.test(p)) return '';
      return '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn);
    } catch (_) { return ''; }
  }

  function saekjaPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise((res, rej) => {
      const sk = document.createElement('script'); sk.src = PDFJS + 'pdf.min.js';
      sk.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } catch (_) {} res(); };
      sk.onerror = () => rej(new Error('pdf.js hlóðst ekki'));
      document.head.appendChild(sk);
    });
  }

  async function rasterPdf(pdfUrl, hlið, matchW, matchH) {
    await saekjaPdfJs();
    const r = await fetch(pdfUrl, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) {
      let v = ''; try { v = (await r.json()).error || ''; } catch (_) {}
      throw new Error(v || ('PDF fékkst ekki (' + r.status + ')'));
    }
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise;
    const sida = await doc.getPage(1);
    const v0 = sida.getViewport({ scale: 1 });
    let kv;
    if (matchW && matchH) kv = Math.max(matchW, matchH) / Math.max(v0.width, v0.height, 1);
    else kv = Math.min(6, Math.max(0.4, (hlið || hlid()) / Math.max(v0.width, v0.height, 1)));
    const vp = sida.getViewport({ scale: kv });
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(vp.width));
    cv.height = Math.max(1, Math.round(vp.height));
    const cx = cv.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    await sida.render({ canvasContext: cx, viewport: vp }).promise;
    if (matchW && matchH && (cv.width !== matchW || cv.height !== matchH)) {
      const ut = document.createElement('canvas');
      ut.width = matchW; ut.height = matchH;
      const ox = ut.getContext('2d');
      ox.fillStyle = '#fff'; ox.fillRect(0, 0, matchW, matchH);
      ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
      ox.drawImage(cv, 0, 0, matchW, matchH);
      cv.width = 0; cv.height = 0;
      return ut;
    }
    return cv;
  }

  function bindSrc(img, url) {
    if (!img || !url) return;
    const g = gildi();
    const pdf = g === 'fullt' ? pdfSlodUrMynd(url) : '';
    img._gaedi = g + ':' + url;
    if (!pdf) { img.src = url; return; }
    const bid = ++_bindBid;
    img._gaediBid = bid;
    const origLoad = img.onload;
    let skref = 0;
    img.onload = function () {
      if (img._gaediBid !== bid) return;
      if (origLoad) origLoad.call(img);
      if (skref === 0) {
        skref = 1;
        if (window.FloorPlan && FloorPlan.bgImage !== img) return;
        const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        rasterPdf(pdf, hlid(), w, h).then(cv => canvasSlod(cv)).then(slod => {
          if (img._gaediBid !== bid) return;
          img.src = slod;
        }).catch(() => {});
        return;
      }
      if (window.FloorPlan && FloorPlan.bgImage === img) {
        try { if (window.TeiknBord && TeiknBord.nyMynd) TeiknBord.nyMynd(); } catch (_) {}
      }
    };
    img.src = url;
  }

  async function rasterLastPdf() {
    const F = window.FloorPlan;
    if (!F || !_lastPdf || _lastPdf.cid !== F.companyId || !_lastPdf.data) return false;
    await saekjaPdfJs();
    const doc = await window.pdfjsLib.getDocument({ data: _lastPdf.data.slice() }).promise;
    const page = await doc.getPage(1);
    const v0 = page.getViewport({ scale: 1 });
    const kv = Math.min(6, Math.max(0.4, hlid() / Math.max(v0.width, v0.height, 1)));
    const vp = page.getViewport({ scale: kv });
    const oc = document.createElement('canvas');
    oc.width = Math.max(1, Math.round(vp.width));
    oc.height = Math.max(1, Math.round(vp.height));
    const cx = oc.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, oc.width, oc.height);
    await page.render({ canvasContext: cx, viewport: vp }).promise;
    const slod = await canvasSlod(oc);
    await F._loadImg(slod);
    try { if (window.TeiknBord && TeiknBord.nyMynd) TeiknBord.nyMynd(); } catch (_) {}
    return true;
  }

  async function endurhlada() {
    const F = window.FloorPlan;
    if (!F || !F.companyId) return;
    const p = F.plans[F.companyId];
    const url = p && p.imageUrl;
    if (url && pdfSlodUrMynd(url)) {
      const img = new Image();
      img.onload = function () {
        if (F.companyId !== (p && F.companyId)) return;
        F.bgImage = img;
        const c = document.getElementById('fp-canvas'); if (c) c.style.display = 'block';
        try { F._renderCanvas(); F._renderPanel(); } catch (_) {}
        try { if (window.TeiknBord && TeiknBord.nyMynd) TeiknBord.nyMynd(); } catch (_) {}
      };
      bindSrc(img, url);
      return;
    }
    if (await rasterLastPdf()) return;
  }

  function setja(id) {
    if (VAL.indexOf(id) < 0) return gildi();
    try { localStorage.setItem(LS, id); } catch (_) {}
    malaTakka();
    endurhlada().then(() => {
      const n = NOFN[id] || id;
      segja(id === 'fullt' ? n + ' — PDF í hárri upplausn (þunnir veggir).' : n + ' vistað á þessu tæki.');
    }).catch(() => {});
    return id;
  }

  function stillCss() {
    if (document.getElementById('t435-css')) return;
    const st = document.createElement('style'); st.id = 't435-css';
    st.textContent =
      '.t434-gaedi,.fp-gaedi{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}' +
      '.t434-gq,.fp-gaedi button{padding:7px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font:600 12.5px system-ui,sans-serif;color:#334155}' +
      '.t434-gq.on,.fp-gaedi button.on{border-color:#c9a54a;background:#fbf6e8;color:#14120f;box-shadow:0 0 0 2px rgba(201,165,74,.28)}' +
      '#fp-gaedi{margin:0;align-items:center}' +
      '#fp-gaedi button{padding:5px 9px;height:32px;border:1px solid rgba(255,255,255,.18);background:rgba(20,18,15,.88);color:#f1ede4;font-size:11px}' +
      '#fp-gaedi button.on{background:#c9a54a;color:#14120f;border-color:#c9a54a}' +
      '#fp-afturkalla{padding:5px 10px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(20,18,15,.88);color:#f1ede4;font:600 11px system-ui,sans-serif;cursor:pointer}' +
      '#fp-afturkalla[hidden]{display:none!important}';
    document.head.appendChild(st);
  }

  function malaTakka(rot) {
    const g = gildi();
    (rot || document).querySelectorAll('.t434-gq,#fp-gaedi [data-q]').forEach(b => {
      b.classList.toggle('on', b.getAttribute('data-q') === g);
    });
  }

  function gaediHTML() {
    const g = gildi();
    return '<div class="su-section-title">Gæði</div>' +
      '<p class="t434-inng">Full gæði sækir PDF-ið og teiknar það í hárri upplausn — bæði á borðið og í veggagreiningu. Forskoðun er hraðari. Gildir á þessu tæki.</p>' +
      '<div class="t434-gaedi" id="t434-gaedi">' +
      VAL.map(v => '<button type="button" class="t434-gq' + (g === v ? ' on' : '') + '" data-q="' + v + '">' + esc(NOFN[v]) + '</button>').join('') +
      '</div>';
  }

  function modalTakki() {
    stillCss();
    const grp = document.querySelector('#modal-floorplan .fp-hd-grp');
    if (!grp) return;
    let d = document.getElementById('fp-gaedi');
    if (!d) {
      d = document.createElement('div');
      d.id = 'fp-gaedi';
      d.className = 'fp-gaedi';
      d.title = 'Gæði teikningarinnar — Full gæði sækir PDF fyrir þunna veggi';
      d.innerHTML = VAL.map(v => '<button type="button" data-q="' + v + '">' + esc(NOFN[v]) + '</button>').join('');
      d.addEventListener('click', e => {
        const b = e.target.closest('[data-q]'); if (!b) return;
        setja(b.getAttribute('data-q'));
      });
      const eftir = grp.querySelector('.fp-ei-btn') || grp.querySelector('.fp-hreinsa-btn');
      try { grp.insertBefore(d, eftir && eftir.nextSibling ? eftir.nextSibling : grp.firstChild); }
      catch (_) { grp.appendChild(d); }
    }
    malaTakka(d);
  }

  function vefjaPdf() {
    const F = window.FloorPlan;
    if (!F || typeof F._loadPDF !== 'function' || F._loadPDF.__gaedi) return !!(F && F._loadPDF && F._loadPDF.__gaedi);
    F._loadPDF = async function (file) {
      await saekjaPdfJs();
      const ab = await file.arrayBuffer();
      _lastPdf = { cid: this.companyId, data: new Uint8Array(ab) };
      const doc = await window.pdfjsLib.getDocument({ data: _lastPdf.data.slice() }).promise;
      const page = await doc.getPage(1);
      const v0 = page.getViewport({ scale: 1 });
      const kv = Math.min(6, Math.max(0.4, hlid() / Math.max(v0.width, v0.height, 1)));
      const vp = page.getViewport({ scale: kv });
      const oc = document.createElement('canvas');
      oc.width = Math.max(1, Math.round(vp.width));
      oc.height = Math.max(1, Math.round(vp.height));
      const cx = oc.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, oc.width, oc.height);
      await page.render({ canvasContext: cx, viewport: vp }).promise;
      const slod = await canvasSlod(oc);
      await this._loadImg(slod);
    };
    F._loadPDF.__gaedi = 1;
    return true;
  }

  function tikk() {
    stillCss();
    try { vefjaPdf(); } catch (_) {}
    try { modalTakki(); } catch (_) {}
  }

  window.TeiknGaedi = {
    gildi, setja, hlid, vinnuPx, bindSrc, pdfSlodUrMynd, rasterPdf, gaediHTML, malaTakka, NOFN, VAL
  };

  if (!vefjaPdf()) { let n = 0; const i = setInterval(() => { if (vefjaPdf() || ++n > 80) clearInterval(i); }, 150); }
  setInterval(() => { try { tikk(); } catch (_) {} }, 500);
  tikk();
})();
