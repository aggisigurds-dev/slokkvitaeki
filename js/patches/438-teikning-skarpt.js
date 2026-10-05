/* === TEIKNING: SKARPT VIÐ AÐDRÁTT ÚR VIGUR-PDF (438) =========================
 *
 * Agnar 04.10.2026 (Fiskislóð 41, 538%): „Þetta er bara ekki að koma nægilega vel út". Þysjun gluggans (383 zBeita)
 * er CSS-skölun á #fp-canvas — 6006 px JPEG skjalasafnsins stækkar þá í pixla. Sé frumrit hæðarinnar VIGUR-PDF er
 * sýnilegi hlutinn teiknaður beint úr PDF-inu í skjáupplausn, á eigið lag (z 4) ofan á myndinni með multiply-blöndun.
 * Tækin teiknast INN Í #fp-canvas (FloorPlan), svo á meðan skarpa lagið sést teiknar canvasinn hvítan grunn í stað
 * myndarinnar (drawImage(bgImage) er gripið) — tækin standa þá óhögguð á hvítu og skörpu línurnar leggjast yfir.
 * Svæði hæðarinnar er forteiknað einu sinni í bakgrunni (pdf.js, ~8 s á Fiskislóð); eftir það fylgir skerpan
 * þysjun og færslu í hverjum ramma. Engin gögn breytast.
 *
 * SKANNAÐAR TEIKNINGAR (Agnar 05.10.2026, Center Hótel Þingholt í 356 %: „can you try to get better quality in the
 * teikningar"). Skjalasafnið afhendir 6006 px JPEG sem er mjög þjappað (2 MB á 25 MP → suð og loðnir stafir), en
 * frumritið er TIF (Þingholt: 7016 px, 8 bita litaspjald, LZW, 13 MB — taplaust). Það er sótt um teikn-pdf (sama
 * rendition-flæði), afkóðað í vinnuþræði (UTIF) og sett á sama lag og vigurinn; birtuskil á laginu gera línurnar
 * svartar og pappírinn hvítan. Snúningur TIF-sins er valinn með samsvörun við JPEG-ið (allir átta möguleikarnir
 * bornir saman við myndina sem er á borðinu) — skrá sem passar ekki fer aldrei upp; þá sést JPEG-ið eins og áður.
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
  // Skannað frumrit á skjalasafni Reykjavíkur (.tif.info) → teikn-pdf, sem sækir líka TIF um ORIGINAL-flæðið.
  function tifSlod(h) {
    try {
      const u = new URL(h.image_url, location.href), inn = u.searchParams.get('url') || '', i = new URL(inn);
      return i.hostname === 'skjalasafn.reykjavik.is' && /\.tiff?\.info$/i.test(i.pathname) ? '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn) : '';
    } catch (_) { return ''; }
  }

  /* ── TIF-vinnuþráður: afkóðun (~0,4 s á 35 MP) og skurður gerast utan aðalþráðarins svo glugginn frjósi ekki.
   * Þráðurinn geymir AÐEINS síðustu teikninguna (hrá gögn, ~1 bæti á díl í litaspjaldi) og er drepinn eftir mínútu
   * án glugga. Díll er lesinn beint úr hráu gögnunum í gegnum snúning (o 1–8), svo engin full RGBA-afrit verða til. */
  const VERK = [
    "importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js','https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js');",
    'let M=null;',
    'function lesari(f){const d=f.data,w=f.width,ip=f.t262?f.t262[0]:2,bps=f.t258?f.t258[0]:1,spp=f.t258?f.t258.length:1,bpl=Math.ceil(w*bps*spp/8),A=0xff000000;',
    ' if((ip===0||ip===1)&&spp===1&&(bps===1||bps===4||bps===8)){const mx=(1<<bps)-1,lut=new Uint32Array(mx+1);for(let v=0;v<=mx;v++){let g=Math.round(v*255/mx);if(ip===0)g=255-g;lut[v]=A|g<<16|g<<8|g;}',
    '  if(bps===8)return(x,y)=>lut[d[y*bpl+x]];if(bps===4)return(x,y)=>lut[(d[y*bpl+(x>>1)]>>(4-4*(x&1)))&15];return(x,y)=>lut[(d[y*bpl+(x>>3)]>>(7-(x&7)))&1];}',
    ' if(ip===3&&spp===1&&(bps===4||bps===8)&&f.t320){const n=1<<bps,m=f.t320,lut=new Uint32Array(n);for(let v=0;v<n;v++)lut[v]=A|(m[2*n+v]>>8)<<16|(m[n+v]>>8)<<8|(m[v]>>8);',
    '  if(bps===8)return(x,y)=>lut[d[y*bpl+x]];return(x,y)=>lut[(d[y*bpl+(x>>1)]>>(4-4*(x&1)))&15];}',
    ' if(ip===2&&bps===8&&(spp===3||spp===4))return(x,y)=>{const i=y*bpl+x*spp;return A|d[i+2]<<16|d[i+1]<<8|d[i];};',
    ' const r=new Uint32Array(UTIF.toRGBA8(f).buffer);return(x,y)=>r[y*w+x]|A;}',
    // birtingar-díll (x,y) → hrár díll, fyrir alla átta snúningana (TIFF Orientation)
    'function varp(o,W,H){switch(o){case 2:return(x,y)=>[W-1-x,y];case 3:return(x,y)=>[W-1-x,H-1-y];case 4:return(x,y)=>[x,H-1-y];',
    ' case 5:return(x,y)=>[y,x];case 6:return(x,y)=>[y,H-1-x];case 7:return(x,y)=>[W-1-y,H-1-x];case 8:return(x,y)=>[W-1-y,x];default:return(x,y)=>[x,y];}}',
    'onmessage=async e=>{const q=e.data;try{',
    ' if(q.cmd==="saekja"){M=null;const r=await fetch(q.slod);if(!r.ok)throw new Error("Svar "+r.status);const b=await r.arrayBuffer();',
    '  const ifds=UTIF.decode(b).filter(f=>f.t256&&f.t257).sort((a,c)=>c.t256[0]*c.t257[0]-a.t256[0]*a.t257[0]);if(!ifds.length)throw new Error("Engin mynd");',
    '  const f=ifds[0];UTIF.decodeImage(b,f);M={f,W:f.width,H:f.height,les:lesari(f),o:f.t274?f.t274[0]:1};postMessage({id:q.id,W:M.W,H:M.H,o:M.o});return;}',
    ' if(!M)throw new Error("Engin teikning");const les=M.les;',
    ' if(q.cmd==="syni"){const n=q.n,ut=[];for(const c of q.c){const v=varp(c.o,M.W,M.H),a=new Float32Array(n*n);',
    '  for(let j=0;j<n;j++)for(let i=0;i<n;i++){let s=0;for(let b=0;b<5;b++)for(let k=0;k<5;k++){const p=v(Math.min(c.dW-1,Math.floor(c.x+(i+(k+.5)/5)*c.w/n)),Math.min(c.dH-1,Math.floor(c.y+(j+(b+.5)/5)*c.h/n)));const u=les(p[0],p[1]);s+=(u&255)+(u>>8&255)+(u>>16&255);}a[j*n+i]=s/75;}',
    '  ut.push(a);}postMessage({id:q.id,ut});return;}',
    ' if(q.cmd==="skera"){const v=varp(q.o,M.W,M.H),w=q.w,h=q.h,px=new Uint32Array(w*h);',
    '  for(let y=0;y<h;y++){const o=y*w;for(let x=0;x<w;x++){const p=v(q.x+x,q.y+y);px[o+x]=les(p[0],p[1]);}}',
    '  const id=new ImageData(new Uint8ClampedArray(px.buffer),w,h);',
    '  const bm=q.R<0.999?await createImageBitmap(id,{resizeWidth:Math.max(1,Math.round(w*q.R)),resizeHeight:Math.max(1,Math.round(h*q.R)),resizeQuality:"high"}):await createImageBitmap(id);',
    '  postMessage({id:q.id,bm},[bm]);return;}',
    '}catch(x){postMessage({id:q.id,villa:String(x&&x.message||x)});}};'
  ].join('\n');
  const T = { verk: null, bid: {}, n: 0, sidast: 0 };
  function verk(skilabod) {
    if (!T.verk) {
      T.verk = new Worker(URL.createObjectURL(new Blob([VERK], { type: 'text/javascript' })));
      T.verk.onmessage = e => { const b = T.bid[e.data.id]; if (!b) return; delete T.bid[e.data.id]; e.data.villa ? b.rej(new Error(e.data.villa)) : b.res(e.data); };
      T.verk.onerror = e => { Object.keys(T.bid).forEach(k => { T.bid[k].rej(new Error(e.message || 'vinnuþráður')); delete T.bid[k]; }); };
    }
    const id = ++T.n;
    return new Promise((res, rej) => { T.bid[id] = { res, rej }; T.verk.postMessage(Object.assign({ id }, skilabod)); });
  }
  function sleppaVerki() {
    if (T.verk) { try { T.verk.terminate(); } catch (_) {} }
    T.verk = null; Object.keys(T.bid).forEach(k => { T.bid[k].rej(new Error('hætt')); delete T.bid[k]; });
    if (S.pdf && S.pdf.tif) { S.pdf = null; S.pdfSlod = ''; S.pdfBid = null; }
    if (S.blad && S.blad.tif) { try { S.blad.canvas.close(); } catch (_) {} S.blad = null; }
  }
  // Myndin á borðinu (JPEG, skorin að hæðinni) sem n×n grátónanet — mælistikan fyrir snúning TIF-sins.
  // Minnkuð í HELMINGSÞREPUM: Chrome með skjákorti tekur annars fáa díla úr ~100× minnkun (Agnar 05.10.2026: fylgni 0,59
  // í hans vafra, 0,77 í prófunarvafranum — TIF-inu var hafnað og JPEG-ið stóð).
  function synishorn(mynd, n) {
    let src = mynd, w = mynd.naturalWidth || mynd.width, h = mynd.naturalHeight || mynd.height;
    while (w > n * 2 || h > n * 2) {
      const nw = Math.max(n, Math.ceil(w / 2)), nh = Math.max(n, Math.ceil(h / 2));
      const t = document.createElement('canvas'); t.width = nw; t.height = nh;
      const tx = t.getContext('2d'); tx.fillStyle = '#fff'; tx.fillRect(0, 0, nw, nh); tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high';
      tx.drawImage(src, 0, 0, nw, nh); src = t; w = nw; h = nh;
    }
    const c = document.createElement('canvas'); c.width = n; c.height = n;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, n, n); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data, a = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) a[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
    return a;
  }
  function fylgni(a, b) {
    const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
    let ab = 0, aa = 0, bb = 0; for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; ab += x * y; aa += x * x; bb += y * y; }
    return aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0;
  }
  async function saekjaTif(slod, st) {
    const r = await verk({ cmd: 'saekja', slod: new URL(slod, location.href).href });
    const fb = st.h.frum.b, fh = st.h.frum.h || 0;
    const sk = st.h.skurdur && st.h.skurdur.w > 8 ? st.h.skurdur : { x: 0, y: 0, w: fb, h: fh || fb };
    // snúningar sem passa við hlutföll JPEG-sins (1–4 sömu mál, 5–8 víxluð)
    const c = [1, 2, 3, 4, 5, 6, 7, 8].map(o => {
      const dW = o > 4 ? r.H : r.W, dH = o > 4 ? r.W : r.H, kp = fb / dW;
      return { o, dW, dH, kp, x: sk.x / kp, y: sk.y / kp, w: sk.w / kp, h: sk.h / kp };
    }).filter(k => !fh || Math.abs(k.dH * k.kp - fh) < fh * 0.015);
    if (!c.length) throw new Error('TIF passar ekki við myndina');
    const n = 40, a = synishorn(FloorPlan.bgImage, n);
    const s = await verk({ cmd: 'syni', n, c: c.map(k => ({ o: k.o, dW: k.dW, dH: k.dH, x: k.x, y: k.y, w: k.w, h: k.h })) });
    let best = null;
    c.forEach((k, i) => { k.r = fylgni(a, s.ut[i]); if (!best || k.r > best.r) best = k; });
    console.info('[438] TIF ' + r.W + '×' + r.H + ' merki ' + r.o + ' → snúningur ' + best.o + ' (fylgni ' + c.map(k => k.o + ':' + k.r.toFixed(2)).join(' ') + ')');
    if (best.r < 0.3) throw new Error('TIF passar ekki við myndina (fylgni ' + best.r.toFixed(2) + ')');
    const sida = { tif: true, o: best.o, b: best.dW, h: best.dH, fx: 0, fy: 0 };
    // Hliðrunin ber saman fimm reiti í FULLRI upplausn — finnist ekki samsvörun í a.m.k. tveimur er TIF-ið ekki notað.
    Object.assign(sida, await hlidrun(sida, best.kp, sk));
    return sida;
  }
  // HLIÐRUN (mælt 05.10.2026 á Þingholti: JPEG skjalasafnsins situr 3,4 díla neðar og 0,75 til vinstri miðað við
  // frumritið, jafnt yfir allt blaðið, fylgni 0,93–0,99). Tækin eru vistuð í JPEG-hnitum, svo TIF-ið er fært að
  // JPEG-inu: fimm reitir innan hæðarinnar, besta hliðrun hvers (⅓ díls nákvæmni), miðgildið notað.
  async function hlidrun(sida, kp, sk) {
    const mynd = FloorPlan.bgImage, N = 160, D = 8, SUB = 3, G = N * SUB, M = (N + 2 * D) * SUB;
    const gra = (cv) => { const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data, a = new Float32Array(cv.width * cv.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]; return a; };
    const nidur = [];
    for (const [a, b] of [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) {
      const fx0 = Math.round(sk.x + a * sk.w - N / 2), fy0 = Math.round(sk.y + b * sk.h - N / 2);
      const j = document.createElement('canvas'); j.width = G; j.height = G;
      const jx = j.getContext('2d', { willReadFrequently: true }); jx.fillStyle = '#fff'; jx.fillRect(0, 0, G, G); jx.imageSmoothingQuality = 'high';
      jx.drawImage(mynd, fx0 - sk.x, fy0 - sk.y, N, N, 0, 0, G, G);
      const A = gra(j);
      let ma = 0; for (let i = 0; i < A.length; i++) ma += A[i]; ma /= A.length;
      let va = 0; for (let i = 0; i < A.length; i += 7) va += (A[i] - ma) ** 2;
      if (va / (A.length / 7) < 400) continue;                       // auður reitur — segir ekkert um hliðrun
      const tx0 = Math.max(0, Math.floor((fx0 - D) / kp) - 1), ty0 = Math.max(0, Math.floor((fy0 - D) / kp) - 1);
      const tw = Math.min(sida.b - tx0, Math.ceil((N + 2 * D) / kp) + 3), th = Math.min(sida.h - ty0, Math.ceil((N + 2 * D) / kp) + 3);
      const r = await verk({ cmd: 'skera', o: sida.o, x: tx0, y: ty0, w: tw, h: th, R: 1 });
      const t = document.createElement('canvas'); t.width = M; t.height = M;
      const tc = t.getContext('2d', { willReadFrequently: true }); tc.fillStyle = '#fff'; tc.fillRect(0, 0, M, M); tc.imageSmoothingQuality = 'high';
      tc.setTransform(SUB * kp, 0, 0, SUB * kp, (tx0 * kp - (fx0 - D)) * SUB, (ty0 * kp - (fy0 - D)) * SUB);
      tc.drawImage(r.bm, 0, 0); try { r.bm.close(); } catch (_) {}
      const B = gra(t);
      const fyl = (dx, dy, sk2) => {
        let sa = 0, sb = 0, sab = 0, saa = 0, sbb = 0, n = 0;
        for (let y = 0; y < G; y += sk2) { const ra = y * G, rb = (y + D * SUB + dy) * M + D * SUB + dx; for (let x = 0; x < G; x += sk2) { const p = A[ra + x], q = B[rb + x]; sa += p; sb += q; sab += p * q; saa += p * p; sbb += q * q; n++; } }
        const v = (saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2);
        return v > 0 ? (sab / n - (sa / n) * (sb / n)) / Math.sqrt(v) : 0;
      };
      let best = { dx: 0, dy: 0, c: -2 };
      for (let dy = -D * SUB; dy <= D * SUB; dy += SUB) for (let dx = -D * SUB; dx <= D * SUB; dx += SUB) { const c = fyl(dx, dy, 3); if (c > best.c) best = { dx, dy, c }; }
      const g = best;
      for (let dy = g.dy - SUB + 1; dy <= g.dy + SUB - 1; dy++) for (let dx = g.dx - SUB + 1; dx <= g.dx + SUB - 1; dx++) { if (Math.abs(dx) > D * SUB || Math.abs(dy) > D * SUB) continue; const c = fyl(dx, dy, 2); if (c > best.c) best = { dx, dy, c }; }
      if (best.c > 0.75) nidur.push(best);
    }
    if (nidur.length < 2) throw new Error('TIF passar ekki við myndina (' + nidur.length + ' af 5 reitum)');
    const midgildi = v => { const a = v.slice().sort((x, y) => x - y), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
    const fx = -midgildi(nidur.map(x => x.dx)) / SUB, fy = -midgildi(nidur.map(x => x.dy)) / SUB;
    console.info('[438] hliðrun TIF → JPEG: ' + fx.toFixed(2) + ', ' + fy.toFixed(2) + ' díll (' + nidur.length + ' reitir, fylgni ' + nidur.map(x => x.c.toFixed(2)).join('/') + ')');
    return { fx, fy };
  }

  async function saekjaSidu(slod, st) {
    if (S.pdf && S.pdfSlod === slod) return S.pdf;
    if (S.pdfBid && S.pdfSlod === slod) return S.pdfBid;
    S.pdfSlod = slod; S.pdf = null;
    S.pdfBid = (async () => {
      if (st && st.tif) { S.pdf = await saekjaTif(slod, st); return S.pdf; }
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
    const pdf = pdfSlod(h), tif = pdf ? '' : tifSlod(h), slod = pdf || tif;
    if (!slod || !FloorPlan.bgImage) return null;
    const mr = main.getBoundingClientRect(), cr = c.getBoundingClientRect();
    if (cr.width < 4 || mr.width < 4) return null;
    return { main, c, h, slod, tif: !!tif, mr, cr, rymi: TeiknBord.rymi() };
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
    if (sida.tif) {
      // heilir dílar svo skurðurinn í vinnuþræðinum og vörpunin hér séu nákvæmlega sama svæðið
      const xi = Math.max(0, Math.floor(x0)), yi = Math.max(0, Math.floor(y0));
      const wi = Math.min(sida.b - xi, Math.ceil(x0 + w) - xi), hi = Math.min(sida.h - yi, Math.ceil(y0 + h) - yi);
      const Rt = Math.min(1, Math.sqrt((simi ? 12e6 : 36e6) / Math.max(1, wi * hi)));
      return { tif: true, o: sida.o, fx: sida.fx || 0, fy: sida.fy || 0, x0: xi, y0: yi, w: wi, h: hi, R: Rt, kp, lykill: st.slod + '|' + sida.o + '|' + [xi, yi, wi, hi].join(',') + '|' + Rt.toFixed(3) };
    }
    const R = Math.min(5, Math.sqrt((simi ? 10e6 : 24e6) / (w * h)));
    return { x0, y0, w, h, R, kp, lykill: st.slod + '|' + [x0, y0, w, h].map(Math.round).join(',') + '|' + R.toFixed(2) };
  }
  async function forteikna(st) {
    let sida;
    try { sida = await saekjaSidu(st.slod, st); } catch (e) { console.warn('[438] ' + (st.tif ? 'TIF' : 'PDF'), e); return null; }
    const sv = svaedi(st, sida);
    if (S.blad && S.blad.lykill === sv.lykill) return S.blad;
    if (S.bladBid && S.bladBid.lykill === sv.lykill) return S.bladBid.p;
    const p = (async () => {
      if (sv.tif) {
        // Minni upplausn en JPEG-ið (sími, risaskrá án skurðar) bætir engu — JPEG-ið stendur þá.
        if (sv.R / sv.kp < 0.98) { S.bilad[st.slod] = 1; return null; }
        const r = await verk({ cmd: 'skera', o: sv.o, x: sv.x0, y: sv.y0, w: sv.w, h: sv.h, R: sv.R });
        if (S.blad && S.blad.tif) { try { S.blad.canvas.close(); } catch (_) {} }
        // R mælt af útkomunni (námundun í createImageBitmap)
        S.blad = Object.assign({ canvas: r.bm }, sv, { R: r.bm.width / sv.w });
        S.lykill = '';
        return S.blad;
      }
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
    // CSS-stærð í staðbundnum px: síminn setur zoom á gluggann og mr er í skjá-px (sama og zKv í 383)
    const zk = st.main.offsetWidth ? st.mr.width / st.main.offsetWidth : 1;
    l.style.width = (st.mr.width / zk) + 'px'; l.style.height = (st.mr.height / zk) + 'px';
    const x = l.getContext('2d');
    x.clearRect(0, 0, W, H);
    const k = st.cr.width / st.c.width;                    // skjápx á canvas-px (canvas-px = frummyndar-px − rymi)
    // forteiknaða blaðið: pt (x0..) × R  →  frummyndar-px = pt × kp  →  skjár
    const s = k * bl.kp / bl.R;                             // skjápx á forteikningar-px
    const dx = (st.cr.left - st.mr.left) + (bl.x0 * bl.kp + (bl.fx || 0) - st.rymi.x) * k;
    const dy = (st.cr.top - st.mr.top) + (bl.y0 * bl.kp + (bl.fy || 0) - st.rymi.y) * k;
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
    // skönnun: dökkar línur svartar, pappír hvítur (sami bragur og 436 á #fp-canvas, aðeins sterkari)
    const sia = bl.tif ? 'brightness(0.87) contrast(2.1)' : '';
    if (l.style.filter !== sia) l.style.filter = sia;
    grip(st.c);
    setjaVirkt(true);          // canvasinn: hvítt í stað myndar, tækin ofan á
    l.style.opacity = '1';
  }

  function tikk() {
    const st = stada();
    const l = document.getElementById('fp-skarpt');
    if (!st) {
      if (l) l.style.opacity = '0'; S.lykill = ''; setjaVirkt(false);
      if (T.verk && Date.now() - T.sidast > 60000) sleppaVerki();
      return;
    }
    T.sidast = Date.now();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // 6006 px JPEG skjalasafnsins er sjálf óskýr (1–2 px línur, JPEG-suð) — sést vel löngu áður en hún nær 1:1.
    // Skarpt um leið og meira en hálfur díll myndarinnar fer á hvern skjádíl.
    const upp = (st.cr.width / st.c.width) * dpr > 0.45;
    // Forteikna strax við opnun (líka áður en þysjað er) svo skerpan sé tilbúin þegar á þarf að halda.
    const sv = S.pdf ? svaedi(st, S.pdf) : null;
    const tilbuid = !!(S.blad && sv && S.blad.lykill === sv.lykill);
    // ekki reyna aftur í hverjum ramma eftir villu — 30 s bið
    // TIF-frumrit er 10–15 MB: í síma (farsímagögn) sótt fyrst þegar þysjað er inn, í tölvu strax.
    const biduTif = st.tif && !upp && window.matchMedia && matchMedia('(max-width: 900px)').matches;
    if (!tilbuid && !biduTif && !S.bladBid && !S.bilad[st.slod] && (S.pdf || !S.pdfBid) && Date.now() - (S.villaTimi || 0) > 30000) forteikna(st);
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
