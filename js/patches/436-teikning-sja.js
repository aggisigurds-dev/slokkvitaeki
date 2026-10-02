/* === TEIKNING: SKÝRARI GRUNNMYND OG MERKI (436) ============================
 *
 * Agnar 02.10.2026: „very haaard to see" — FotoWeb-JPEG og þunnar CAD-línur
 * á íslenskum grunnmyndum (Fiskislóð o.fl.) hverfa á síma, og stimplar eru
 * 14 px rauðir punktar. Hér er AÐEINS birting: enginn nýr hamur, ekkert
 * gæða-val, engir veggir fundnir, ekkert EI stimplað.
 *
 * 1. CSS-contrast á #fp-canvas svo grátt blek dökkni, pappírinn haldist ljós.
 * 2. Ef myndin er teikn-mynd af PDF: teikna vigurinn með pdf.js (Full gæði
 *    innvortis) ofan á JPEGið — án þess að vista blob-slóðina.
 * 3. Stimpil- og táknastærðir miðast við skjápunkta, ekki 6000 px blaðið.
 * ========================================================================== */
(() => {
  if (window.TeiknSja) return;

  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const FILTER = 'brightness(0.82) contrast(1.55)';
  const HLID = 7200;
  const _blobs = [];
  let _bindBid = 0;

  function stimpilPx(crWidth) {
    const w = Number(crWidth) || 0;
    return Math.max(32, Math.min(56, Math.round(w / 12) || 32));
  }
  function taknPx(cw, sc) {
    const a = Math.round((Number(cw) || 0) / 70);
    const b = (sc > 0 && isFinite(sc)) ? Math.round(26 / sc) : 26;
    return Math.max(22, a, b);
  }
  function punkturPx(cw, sc) {
    const a = Math.round((Number(cw) || 0) / 280);
    const b = (sc > 0 && isFinite(sc)) ? Math.round(14 / sc) : 14;
    return Math.max(10, a, b);
  }

  function stillCss() {
    if (document.getElementById('t436-css')) return;
    const st = document.createElement('style');
    st.id = 't436-css';
    st.textContent =
      '#fp-canvas{filter:' + FILTER + '}' +
      '#fp-yfirlag{filter:none}';
    document.head.appendChild(st);
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
        if (!b) { res(cv.toDataURL('image/jpeg', 0.95)); return; }
        res(geymaBlob(URL.createObjectURL(b)));
      }, 'image/jpeg', 0.95);
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
    else kv = Math.min(6, Math.max(0.4, (hlið || HLID) / Math.max(v0.width, v0.height, 1)));
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
    const pdf = pdfSlodUrMynd(url);
    img._sja = url;
    if (!pdf) { img.src = url; return; }
    const bid = ++_bindBid;
    img._sjaBid = bid;
    const origLoad = img.onload;
    let skref = 0;
    img.onload = function () {
      if (img._sjaBid !== bid) return;
      if (origLoad) origLoad.call(img);
      if (skref === 0) {
        skref = 1;
        const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        rasterPdf(pdf, HLID, w, h).then(cv => canvasSlod(cv)).then(slod => {
          if (img._sjaBid !== bid) return;
          img.src = slod;
        }).catch(() => {});
        return;
      }
      try {
        const F = window.FloorPlan;
        if (F && F.bgImage === img) {
          if (window.TeiknBord && TeiknBord.nyMynd) TeiknBord.nyMynd();
          F._renderCanvas();
        }
      } catch (_) {}
    };
    img.src = url;
  }

  function vefjaHleðslu() {
    const F = window.FloorPlan;
    if (!F || typeof F._loadImg !== 'function') return false;
    if (F._loadImg.__sja) return true;
    F._loadImg = function (url) {
      const self = this;
      return new Promise(function (res) {
        const img = new Image();
        let fyrsta = true;
        img.onload = function () {
          self.bgImage = img;
          if (!self.plans[self.companyId]) self.plans[self.companyId] = { markers: [], imageUrl: url };
          else self.plans[self.companyId].imageUrl = url;
          if (fyrsta) { fyrsta = false; res(); }
          try { self._renderCanvas(); self._renderPanel(); } catch (_) {}
        };
        img.onerror = function () { if (fyrsta) { fyrsta = false; res(); } };
        if (window.TeiknGaedi && TeiknGaedi.bindSrc) TeiknGaedi.bindSrc(img, url);
        else bindSrc(img, url);
      });
    };
    F._loadImg.__sja = 1;
    return true;
  }

  function tikk() {
    stillCss();
    try { vefjaHleðslu(); } catch (_) {}
  }

  window.TeiknSja = {
    FILTER, stimpilPx, taknPx, punkturPx, bindSrc, pdfSlodUrMynd, rasterPdf
  };

  if (!vefjaHleðslu()) {
    let n = 0;
    const i = setInterval(() => { if (vefjaHleðslu() || ++n > 80) clearInterval(i); }, 150);
  }
  setInterval(() => { try { tikk(); } catch (_) {} }, 800);
  tikk();
})();
