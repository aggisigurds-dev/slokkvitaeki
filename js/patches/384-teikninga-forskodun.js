/* === FORSKOÐUN TEIKNINGA Á FYRIRTÆKJASPJALDI (384) ==========================
 *
 * Agnar 20.09.2026: „could you enable preview window before open it in turbopaint. Með exit. Opna í turbopaint...
 * download full quality. Og print."
 *
 * ÁÐUR: „📐 46 teikningar · Skjalasafn Reykjavíkur" á spjaldinu (363) var hlekkur sem opnaði TurboPaint-leitina í nýjum
 * flipa — til að SJÁ eina teikningu þurfti að fara út úr appinu, bíða eftir innflutningi og koma aftur.
 * NÚ: smellurinn opnar glugga hér: listi með smámyndum (grunnmyndir fyrst), stór forskoðun sem má þysja og draga,
 * og fjórir takkar — 🖌 Opna í TurboPaint · ⬇ Sækja í fullum gæðum · 🖨 Prenta · 📌 Nota í úttektarteikningu — og ✕ Loka.
 *
 * Aðeins fyrir staði í skjalasafni Reykjavíkur (landnúmer á hlekknum, sjá 363). Önnur sveitarfélög eiga enga rafræna
 * teikningaskrá hér — þar heldur hlekkurinn áfram á TurboPaint/kortasjá eins og áður. Ctrl/⌘-smellur opnar alltaf
 * gamla hlekkinn í nýjum flipa.
 *
 * Ekkert er vistað hér. Myndin kemur um teikn-mynd (6006 px JPEG af sömu rót), frumritið um teikn-pdf (vigur-PDF).
 * TIF-frumrit skjalasafnsins eru 50–300 MB og fara ekki gegnum fall með 10 sek þak — þar opnast skjalið í skjalasafninu
 * sjálfu. Beinar .tif kortasjár (Mosfellsbær, 0,1–1,5 MB) eru hins vegar afkóðaðar hér (TIF-vélin, 19.10.2026) og sýndar.
 *
 * Agnar 02.10.2026: 1.–4. hæð á spjaldinu opnaðist ekki. hus-upplysingar skilar
 * hæðum án `results`; hnappurinn bar aðeins data-co. Nú fer landnúmer með og
 * smellurinn sækir teikn-listi beint.
 * ========================================================================== */
(() => {
  if (window.__teiknForskodun) return;
  window.__teiknForskodun = true;

  const LISTI = '/.netlify/functions/teikn-listi', MYND = '/.netlify/functions/teikn-mynd', PDF = '/.netlify/functions/teikn-pdf';
  const TURBOPAINT = 'https://kjarni.vercel.app/kjarni/turbopaint';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const segja = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const erPdf = d => /\.pdf(\.info)?$/i.test(String(d.infoUrl || d.filename || ''));
  // 21.09.2026: Kópavogur / Garðabær / Hafnarfjörður afhenda BEINT PDF (engin .info, engin smámynd, engin JPEG-útgáfa).
  // Þar er fyrsta síða skjalsins teiknuð með pdf.js (sama útgáfa og 383 / FloorPlan) og sýnd sem mynd, svo þysjun,
  // prentun og „Nota í úttektarteikningu" virka eins og fyrir Reykjavík. Myndirnar eru geymdar á meðan glugginn er opinn.
  const beintPdf = d => /\.pdf$/i.test(String(d.infoUrl || '')) && !/skjalasafn\.reykjavik\.is/i.test(String(d.infoUrl || ''));
  // 19.10.2026: Mosfellsbær (luks.mos.is) afhendir skannanir sem .tif BEINT (510 af 515 á Sunnukrika 3). Vafrinn birtir ekki
  // TIFF og teikn-mynd kann aðeins FotoWeb — blaðið er sótt um teikn-pdf (sama rót) og afkóðað hér með TIF-vélinni (UTIF í
  // vinnuþræði, sjá neðar), svo það birtist sem mynd eins og PDF-blöð Kópavogs. ⬇ sækir skrána sjálfa (?nidurhal=1, rétt nafn).
  const beintTif = d => /\.tiff?$/i.test(String(d.infoUrl || '')) && !/skjalasafn\.reykjavik\.is/i.test(String(d.infoUrl || ''));
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const _myndir = new Map();
  const _pdf = new Map();
  const _thumbs = new Map();
  function pdfGogn(d) {
    if (!_pdf.has(d.infoUrl)) {
      _pdf.set(d.infoUrl, (async () => {
        const r = await fetch(PDF + '?url=' + encodeURIComponent(d.infoUrl), { signal: AbortSignal.timeout(45000) });
        if (!r.ok) { let v = ''; try { v = (await r.json()).error || ''; } catch (_) {} throw new Error(v || ('PDF fékkst ekki (' + r.status + ')')); }
        return new Uint8Array(await r.arrayBuffer());
      })());
    }
    return _pdf.get(d.infoUrl);
  }

  /* ── TIF-VÉLIN (19.10.2026) — bein .tif kortasjár sem mynd ──────────────────────────────────────────────────────
   * Skönnun Mosfellsbæjar er 1 bita CCITT G4, 9364 × 6621 dílar í 135 kB skrá (Reykjabyggð 10, 4871.TIF): sem RGBA væri
   * hún 248 MB, svo hún er ALDREI afkóðuð í fulla stærð á aðalþræði. Vinnuþráðurinn (sama UTIF-útgáfa og 438 notar, pako
   * fyrir Deflate-skannanir) afkóðar skrána einu sinni og geymir hrá gögnin (1 bita = 7,7 MB), teiknar svo mynd af
   * umbeðinni stærð (lengri hlið = px) með kassasíun beint úr hráu gögnunum — þunn lína í 25× smækkun hverfur ekki. Hér
   * verður svarið blob-slóð (JPEG) sem lifir meðan síðan er opin, ein per blað og stærð. Skrá > 25 MB fær villu með
   * stærðinni og ⬇ sækir hana í staðinn. 451 Greining notar sömu vél (window.TeiknTif) — eitt afkóðað eintak.
   * Bætin fara um teikn-pdf án ?nidurhal, svo 463 deilir sókninni með öðrum köllurum. */
  const TeiknTif = (() => {
    const HAMARK = 25 * 1024 * 1024, HRA_HAMARK = 96 * 1024 * 1024;
    const VERK = [
      "importScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js','https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js');",
      'const G=new Map();let heild=0;',
      // díll (x,y) → 0xAABBGGRR, beint úr hráu gögnunum (sama lesari og 438): 1/4/8 bita grátt, litaspjald, RGB(A); annars UTIF
      'function lesari(f){const d=f.data,w=f.width,ip=f.t262?f.t262[0]:2,bps=f.t258?f.t258[0]:1,spp=f.t258?f.t258.length:1,bpl=Math.ceil(w*bps*spp/8),A=0xff000000;',
      ' if((ip===0||ip===1)&&spp===1&&(bps===1||bps===4||bps===8)){const mx=(1<<bps)-1,lut=new Uint32Array(mx+1);for(let v=0;v<=mx;v++){let g=Math.round(v*255/mx);if(ip===0)g=255-g;lut[v]=A|g<<16|g<<8|g;}',
      '  if(bps===8)return(x,y)=>lut[d[y*bpl+x]];if(bps===4)return(x,y)=>lut[(d[y*bpl+(x>>1)]>>(4-4*(x&1)))&15];return(x,y)=>lut[(d[y*bpl+(x>>3)]>>(7-(x&7)))&1];}',
      ' if(ip===3&&spp===1&&(bps===4||bps===8)&&f.t320){const n=1<<bps,m=f.t320,lut=new Uint32Array(n);for(let v=0;v<n;v++)lut[v]=A|(m[2*n+v]>>8)<<16|(m[n+v]>>8)<<8|(m[v]>>8);',
      '  if(bps===8)return(x,y)=>lut[d[y*bpl+x]];return(x,y)=>lut[(d[y*bpl+(x>>1)]>>(4-4*(x&1)))&15];}',
      ' if(ip===2&&bps===8&&(spp===3||spp===4))return(x,y)=>{const i=y*bpl+x*spp;return A|d[i+2]<<16|d[i+1]<<8|d[i];};',
      ' const r=new Uint32Array(UTIF.toRGBA8(f).buffer);return(x,y)=>r[y*w+x]|A;}',
      // birtingar-díll → hrár díll fyrir snúningana átta (TIFF Orientation)
      'function varp(o,W,H){switch(o){case 2:return(x,y)=>[W-1-x,y];case 3:return(x,y)=>[W-1-x,H-1-y];case 4:return(x,y)=>[x,H-1-y];',
      ' case 5:return(x,y)=>[y,x];case 6:return(x,y)=>[y,H-1-x];case 7:return(x,y)=>[W-1-y,H-1-x];case 8:return(x,y)=>[W-1-y,x];default:return null;}}',
      'onmessage=e=>{const q=e.data;try{',
      ' let m=G.get(q.slod);',
      ' if(!m){if(!q.buf){postMessage({id:q.id,vantar:true});return;}',
      '  const ifds=UTIF.decode(q.buf).filter(f=>f.t256&&f.t257).sort((a,c)=>c.t256[0]*c.t257[0]-a.t256[0]*a.t257[0]);if(!ifds.length)throw new Error("Engin mynd í TIF-skránni");',
      '  const f=ifds[0];UTIF.decodeImage(q.buf,f);const o=f.t274?f.t274[0]:1,sn=o>=5;',
      '  m={W:f.width,H:f.height,dW:sn?f.height:f.width,dH:sn?f.width:f.height,v:varp(o,f.width,f.height),les:lesari(f),b:f.data?f.data.length:0,bil:!!(f.t258&&f.t258.length===1&&f.t258[0]===1)};',
      '  G.set(q.slod,m);heild+=m.b;while(G.size>1&&heild>' + HRA_HAMARK + '){const k=G.keys().next().value;heild-=G.get(k).b;G.delete(k);}}',
      ' G.delete(q.slod);G.set(q.slod,m);',   // nýjast aftast — elsta fýkur fyrst
      ' const k=Math.min(1,q.px/Math.max(m.dW,m.dH)),w=Math.max(1,Math.round(m.dW*k)),h=Math.max(1,Math.round(m.dH*k));',
      // 1 bita línuteikning: hrein kassasíun gerir 1 díls línu að ljósgráu (4 % dökkva í 25×25 kassa — mælt 248 dökkir dílar
      // af 102.220 á Reykjabyggð 10). Dökkvinn er því margfaldaður með hliðarlengd kassans (lína í gegnum kassann = svart);
      // grátóna-/litaskannanir halda hreinu meðaltali, annars yrði ljósgrár bakgrunnur þeirra svartur.
      ' const sx=m.dW/w,sy=m.dH/h,nx=Math.min(32,Math.max(1,Math.round(sx))),ny=Math.min(32,Math.max(1,Math.round(sy))),n=nx*ny,bk=m.bil?Math.sqrt(n):1,v=m.v,les=m.les,ut=new Uint32Array(w*h);',
      ' for(let j=0;j<h;j++){const y0=j*sy;for(let i=0;i<w;i++){const x0=i*sx;let r=0,g=0,b=0;',
      '  for(let a=0;a<ny;a++){const y=Math.min(m.dH-1,Math.floor(y0+(a+.5)*sy/ny));for(let c=0;c<nx;c++){const x=Math.min(m.dW-1,Math.floor(x0+(c+.5)*sx/nx));',
      '   let u;if(v){const p=v(x,y);u=les(p[0],p[1]);}else u=les(x,y);r+=u&255;g+=u>>8&255;b+=u>>16&255;}}',
      '  if(bk>1){const L=255-Math.min(255,Math.round((255-(r+g+b)/(3*n))*bk));ut[j*w+i]=0xff000000|L<<16|L<<8|L;}',
      '  else ut[j*w+i]=0xff000000|((b/n)|0)<<16|((g/n)|0)<<8|((r/n)|0);}}',
      ' postMessage({id:q.id,w,h,W:m.dW,H:m.dH,rgba:ut.buffer},[ut.buffer]);',
      '}catch(err){postMessage({id:q.id,villa:(err&&err.message)||String(err)});}};',
    ];
    let w = null, nr = 0;
    const bid = new Map();      // id → { res, rej }
    const baeti = new Map();    // frumslóð → Promise<ArrayBuffer>
    const myndir = new Map();   // frumslóð|px → Promise<blob-slóð>
    const staerd = new Map();   // frumslóð → { W, H } (dílar eftir snúning)
    const iThraedi = new Set(); // frumslóðir sem þráðurinn á afkóðaðar
    function thradur() {
      if (w) return w;
      w = new Worker(URL.createObjectURL(new Blob([VERK.join('\n')], { type: 'text/javascript' })));
      w.onmessage = (e) => { const m = e.data, p = bid.get(m.id); if (!p) return; bid.delete(m.id); if (m.villa) p.rej(new Error(m.villa)); else p.res(m); };
      w.onerror = (e) => {
        const v = new Error('TIF-þráðurinn stöðvaðist' + (e && e.message ? ': ' + e.message : ''));
        bid.forEach((p) => p.rej(v)); bid.clear(); iThraedi.clear();
        try { w.terminate(); } catch (_) {} w = null;
      };
      return w;
    }
    const kalla = (msg, flytja) => new Promise((res, rej) => { const id = ++nr; bid.set(id, { res, rej }); thradur().postMessage(Object.assign({ id }, msg), flytja || []); });
    const mb = (n) => (n / 1048576).toFixed(n >= 10485760 ? 0 : 1).replace('.', ',') + ' MB';
    function ofStor(n) { const e = new Error('TIF-skráin er ' + mb(n) + ' — of stór til að birta hér. Sæktu hana með ⬇ og opnaðu í myndaforriti'); e.ofStor = n; return e; }
    function saekjaBaeti(slod) {
      if (!baeti.has(slod)) {
        const p = (async () => {
          const r = await fetch(PDF + '?url=' + encodeURIComponent(slod), { signal: AbortSignal.timeout(60000) });
          if (!r.ok) { let v = ''; try { v = (await r.json()).error || ''; } catch (_) {} throw new Error(v || ('TIF-skráin fékkst ekki (' + r.status + ')')); }
          const lengd = Number(r.headers.get('content-length') || 0);
          if (lengd > HAMARK) throw ofStor(lengd);   // 463 sleppir hausnum — þá er stærðin mæld á bætunum sjálfum
          const b = await r.arrayBuffer();
          if (b.byteLength > HAMARK) throw ofStor(b.byteLength);
          if (b.byteLength < 8) throw new Error('TIF-skráin er tóm (' + b.byteLength + ' bæti)');
          return b;
        })();
        baeti.set(slod, p); p.catch(() => baeti.delete(slod));
      }
      return baeti.get(slod);
    }
    // Mynd blaðsins, lengri hlið = px (aldrei stærri en frumritið) → blob-slóð; sama blað og stærð = sama slóð
    function mynd(slod, px) {
      const k = slod + '|' + px;
      if (!myndir.has(k)) {
        const p = (async () => {
          let svar = null;
          for (let t = 0; t < 2 && !svar; t++) {
            if (iThraedi.has(slod)) { const s = await kalla({ slod, px }); if (s.vantar) iThraedi.delete(slod); else svar = s; continue; }
            const b = await saekjaBaeti(slod), afrit = b.slice(0);   // afritið flyst yfir; bætin hér lifa fyrir næstu sendingu
            iThraedi.add(slod);
            const s = await kalla({ slod, px, buf: afrit }, [afrit]);
            if (s.vantar) iThraedi.delete(slod); else svar = s;
          }
          if (!svar) throw new Error('TIF-þráðurinn skilaði engri mynd');
          staerd.set(slod, { W: svar.W, H: svar.H });
          const cv = document.createElement('canvas'); cv.width = svar.w; cv.height = svar.h;
          cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(svar.rgba), svar.w, svar.h), 0, 0);
          const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.86));
          if (!blob) throw new Error('mynd varð ekki til');
          return URL.createObjectURL(blob);
        })();
        myndir.set(k, p); p.catch(() => myndir.delete(k));
      }
      return myndir.get(k);
    }
    const nidurhal = (slod) => PDF + '?nidurhal=1&url=' + encodeURIComponent(slod);
    return { mynd, nidurhal, saekjaBaeti, staerd: (slod) => staerd.get(slod) || null, HAMARK, mb, er: (u) => /\.tiff?$/i.test(String(u || '')) && !/skjalasafn\.reykjavik\.is/i.test(String(u || '')) };
  })();
  window.TeiknTif = TeiknTif;
  function hladaPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise((res, rej) => {
      const sk = document.createElement('script'); sk.src = PDFJS + 'pdf.min.js';
      sk.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } catch (_) {} res(); };
      sk.onerror = () => rej(new Error('pdf.js hlóðst ekki')); document.head.appendChild(sk);
    });
  }
  async function myndSlod(d) {
    if (beintTif(d)) {
      // TIF kortasjár: afkóðað í vinnuþræði, lengri hlið ~4200 px eins og PDF-blöðin; blob-slóðin lifir með síðunni
      if (_myndir.has(d.infoUrl)) return _myndir.get(d.infoUrl);
      const url = await TeiknTif.mynd(d.infoUrl, 4200);
      _myndir.set(d.infoUrl, url);
      return url;
    }
    if (!beintPdf(d)) return MYND + '?url=' + encodeURIComponent(d.infoUrl);
    if (_myndir.has(d.infoUrl)) return _myndir.get(d.infoUrl);
    await hladaPdfJs();
    const gogn = await pdfGogn(d);
    const doc = await window.pdfjsLib.getDocument({ data: gogn.slice() }).promise;
    const sida = await doc.getPage(1), v0 = sida.getViewport({ scale: 1 });
    const kv = Math.min(4, Math.max(1, 4200 / Math.max(v0.width, v0.height)));          // lengri hlið ~4200 px: læsileg málsetning, hóflegt minni
    const vp = sida.getViewport({ scale: kv }), cv = document.createElement('canvas');
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    await sida.render({ canvasContext: cx, viewport: vp, intent: 'print' }).promise;
    const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.9));
    const url = URL.createObjectURL(blob); _myndir.set(d.infoUrl, url);
    d._sidur = doc.numPages;
    return url;
  }
  async function thumbAf(d) {
    if (!d) return '';
    if (d.thumb) return d.thumb;
    if (_thumbs.has(d.infoUrl)) return _thumbs.get(d.infoUrl);
    if (beintTif(d)) { const u = await TeiknTif.mynd(d.infoUrl, 320); _thumbs.set(d.infoUrl, u); return u; }
    if (!beintPdf(d)) return '';
    await hladaPdfJs();
    const gogn = await pdfGogn(d);
    const doc = await window.pdfjsLib.getDocument({ data: gogn.slice() }).promise;
    const sida = await doc.getPage(1);
    const v0 = sida.getViewport({ scale: 1 });
    const kv = 320 / Math.max(v0.width, v0.height, 1);
    const vp = sida.getViewport({ scale: kv });
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(vp.width));
    cv.height = Math.max(1, Math.round(vp.height));
    const cx = cv.getContext('2d');
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, cv.width, cv.height);
    await sida.render({ canvasContext: cx, viewport: vp, intent: 'print' }).promise;
    const url = cv.toDataURL('image/jpeg', 0.72);
    _thumbs.set(d.infoUrl, url);
    return url;
  }
  let thumbKedja = Promise.resolve();
  function fyllaThumbs() {
    document.querySelectorAll('#tfs .tfs-thumb[data-url]').forEach((el) => {
      if (el.dataset.th === '1') return;
      const url = el.getAttribute('data-url');
      const d = (S.listi || []).find((x) => x && x.infoUrl === url);
      if (!d) return;
      el.dataset.th = '1';
      const setja = (src) => {
        if (!src || !el.isConnected) return;
        const im = el.querySelector('img');
        if (!im) return;
        im.onerror = () => { im.removeAttribute('src'); };
        im.src = src;
      };
      if (d.thumb) { setja(d.thumb); return; }
      thumbKedja = thumbKedja.then(() => thumbAf(d)).then(setja).catch(() => {});
    });
  }

  const S = { listi: [], sia: 'grunn', valin: null, stadur: '', coId: null, z: { s: 1, x: 0, y: 0 } };

  function stilar() {
    if (document.getElementById('tfs-css')) return;
    const st = document.createElement('style'); st.id = 'tfs-css';
    st.textContent =
      '#tfs{position:fixed;inset:0;z-index:2147482500;background:rgba(8,8,10,.72);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif}' +
      '#tfs .tfs-gl{width:min(1400px,96vw);height:min(920px,94dvh);background:#14120f;color:#f1ede4;border:1px solid #000;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.8)}' +
      '#tfs .tfs-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,#242320,#141312)}' +
      '#tfs .tfs-hd h2{margin:0;font:700 17px Georgia,serif;color:#e8cb7a;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#tfs .tfs-sub{font-size:12px;color:rgba(255,255,255,.5)}' +
      '#tfs .tfs-seg{display:inline-flex;flex-wrap:wrap;gap:4px}' +
      '#tfs .tfs-seg button{height:32px;padding:0 11px;border:1px solid rgba(255,255,255,.18);border-radius:9px;background:transparent;color:#f1ede4;font:600 12.5px inherit;cursor:pointer}' +
      '#tfs .tfs-seg button[aria-pressed="true"]{background:#c9a54a;color:#14120f;border-color:#c9a54a}' +
      '#tfs .tfs-tk{height:38px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;font:700 13px inherit;cursor:pointer;white-space:nowrap}' +
      '#tfs .tfs-tk:hover{background:rgba(255,255,255,.14)}#tfs .tfs-tk.gull{background:#c9a54a;color:#14120f;border-color:#c9a54a}#tfs .tfs-tk:disabled{opacity:.45;cursor:default}' +
      '#tfs .tfs-bd{flex:1;min-height:0;display:flex}' +
      '#tfs .tfs-li{width:210px;flex:none;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;border-right:1px solid rgba(255,255,255,.1);-webkit-overflow-scrolling:touch}' +
      '#tfs .tfs-kort{flex:none;border:2px solid transparent;border-radius:9px;overflow:hidden;background:rgba(255,255,255,.05);cursor:pointer;text-align:left;padding:0;color:inherit;font:inherit}' +
      '#tfs .tfs-kort[aria-current="true"]{border-color:#c9a54a}' +
      '#tfs .tfs-thumb{display:block;position:relative;height:104px;background:#f4efe4;overflow:hidden}' +
      '#tfs .tfs-thumb img{width:100%;height:100%;object-fit:contain;background:#fff;display:block}' +
      '#tfs .tfs-thumb img:not([src]){display:none}' +
      '#tfs .tfs-thumb em{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;text-align:center;font:700 13px/1.25 Georgia,serif;color:#3a3428}' +
      '#tfs .tfs-thumb img[src]{position:relative;z-index:1}' +
      '#tfs .tfs-kort b{display:block;font-size:12.5px;padding:6px 8px 1px;line-height:1.25}#tfs .tfs-kort span{display:block;font-size:11px;color:rgba(255,255,255,.5);padding:0 8px 7px}' +
      '#tfs .tfs-sv{flex:1;min-width:0;position:relative;overflow:hidden;background:#2a2724;touch-action:none;cursor:grab}' +
      '#tfs .tfs-sv img{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:calc(100% - 24px);max-height:calc(100% - 24px);width:auto;height:auto;object-fit:contain;user-select:none;-webkit-user-drag:none;background:#fff}' +
      '#tfs .tfs-sv img.tfs-zoomad{left:0;top:0;max-width:none;max-height:none;object-fit:fill;transform-origin:0 0}' +
      '#tfs .tfs-bid{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:rgba(255,255,255,.75);font-size:14px;text-align:center;padding:20px}' +
      '#tfs .tfs-bid[hidden]{display:none!important}' +
      '#tfs .tfs-zoom{position:absolute;right:10px;top:10px;display:flex;gap:5px;z-index:2}' +
      '#tfs .tfs-zoom button{width:40px;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.88);color:#fff;font:700 19px system-ui;cursor:pointer}' +
      '#tfs .tfs-txt{position:absolute;left:10px;top:10px;z-index:2;max-width:calc(100% - 160px);padding:6px 10px;border-radius:9px;background:rgba(20,18,15,.88);font-size:12.5px;line-height:1.35}' +
      '#tfs .tfs-ft{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 14px;border-top:1px solid rgba(255,255,255,.1);background:#0f0e0c}' +
      '#tfs.tfs-simi .tfs-gl{width:100vw;height:100dvh;border-radius:0}#tfs.tfs-simi .tfs-bd{flex-direction:column-reverse}' +
        '#tfs.tfs-simi .tfs-li{width:auto;flex-direction:row;overflow-x:auto;overflow-y:hidden;border-right:0;border-top:1px solid rgba(255,255,255,.1);padding:8px}' +
        '#tfs.tfs-simi .tfs-kort{width:132px}#tfs.tfs-simi .tfs-thumb{height:78px}#tfs.tfs-simi .tfs-ft .tfs-tk{flex:1 1 46%;padding:0 8px;font-size:12.5px}#tfs.tfs-simi .tfs-hd{padding-left:64px}';
    document.head.appendChild(st);
  }

  // Eintala á blaðinu er „skráningartafla“ (a), fleirtala „skráningartöflur“ (ö).
  const erSkraning = (d) => /skr[aá]ningart[aö]fl/i.test([d && d.lysing, d && d.filename, d && d.tegund].filter(Boolean).join(' '));
  function textiTeikningar(d) {
    return [d && d.lysing, d && d.gerd, d && d.tegund, d && d.filename].filter(Boolean).join(' ');
  }
  function golvTeikningar(d) {
    const t = textiTeikningar(d);
    const haed = [];
    const baeta = (n) => { n = +n; if (n > 0 && n < 60 && haed.indexOf(n) < 0) haed.push(n); };
    if (d && Array.isArray(d.haed)) d.haed.forEach(baeta);
    let m;
    const re1 = /(\d{1,2})\s*\.\s*hæð/gi;
    while ((m = re1.exec(t))) baeta(m[1]);
    const reOg = /(\d{1,2})\s+og\s+(\d{1,2})\s*\.?\s*hæð/gi;
    while ((m = reOg.exec(t))) { baeta(m[1]); baeta(m[2]); }
    const reBil = /(\d{1,2})\s*[-–]\s*(\d{1,2})\s*\.?\s*hæð/gi;
    while ((m = reBil.exec(t))) {
      const a = +m[1], b = +m[2];
      if (b >= a && b - a <= 12) for (let n = a; n <= b; n++) baeta(n);
    }
    const stig = [];
    const baetaS = (s) => { if (s && stig.indexOf(s) < 0) stig.push(s); };
    if (d && Array.isArray(d.stig)) d.stig.forEach(baetaS);
    if (/kjall/i.test(t) || (d && d.kjallari)) baetaS('Kjallari');
    if (/(?:^|[\s,.:])ris(?:$|[\s,.:])|rishæð/i.test(t) || (d && d.ris)) baetaS('Ris');
    haed.sort((a, b) => a - b);
    return { haed, stig };
  }
  function haedirALista(listi) {
    const haed = [];
    let kjallari = false, ris = false;
    (listi || []).forEach((d) => {
      if (!d || d.urelt) return;
      const g = golvTeikningar(d);
      g.haed.forEach((n) => { if (haed.indexOf(n) < 0) haed.push(n); });
      if (g.stig.indexOf('Kjallari') >= 0) kjallari = true;
      if (g.stig.indexOf('Ris') >= 0) ris = true;
    });
    haed.sort((a, b) => a - b);
    return { haed, kjallari, ris };
  }
  function erGrunn(d) {
    if (!d) return false;
    if (d.grunnmynd) return true;
    const fl = d.flokkur || '';
    if (fl && fl !== 'adal') return false;
    return /grunnmynd/i.test(textiTeikningar(d));
  }
  function almennGrunn(d) {
    if (!erGrunn(d)) return false;
    const g = golvTeikningar(d);
    return !g.haed.length && g.stig.indexOf('Kjallari') < 0 && g.stig.indexOf('Ris') < 0;
  }
  function passarGolv(d, sia) {
    const g = golvTeikningar(d);
    if (sia.indexOf('h:') === 0) return g.haed.indexOf(+sia.slice(2)) >= 0;
    if (sia === 's:Kjallari') return g.stig.indexOf('Kjallari') >= 0;
    if (sia === 's:Ris') return g.stig.indexOf('Ris') >= 0;
    return false;
  }
  function sheetsForFloor(listi, sia) {
    const gild = listi.filter((d) => d && !d.urelt);
    const base = gild.length ? gild : listi;
    const named = base.filter((d) => passarGolv(d, sia));
    const ut = [];
    const add = (arr) => arr.forEach((d) => { if (ut.indexOf(d) < 0) ut.push(d); });
    add(named.filter(erGrunn));
    if (sia.indexOf('h:') === 0) add(base.filter(almennGrunn));
    add(named);
    return ut;
  }
  function siaNafn(k) {
    if (k && k.indexOf('h:') === 0) return k.slice(2) + '. hæð';
    if (k === 's:Kjallari') return 'Kjallari';
    if (k === 's:Ris') return 'Ris';
    if (k === 'allar') return 'Allar';
    if (k === 'grunn') return 'Grunnmyndir';
    return '';
  }
  function veljaSia(listi) {
    const f = haedirALista(listi);
    if (f.haed.length) return 'h:' + f.haed[0];
    if (f.kjallari) return 's:Kjallari';
    if (f.ris) return 's:Ris';
    return 'grunn';
  }
  function haedaTakkar(listi) {
    const f = haedirALista(listi);
    const takkar = [];
    f.haed.forEach((n) => takkar.push({ k: 'h:' + n, t: n + '. hæð' }));
    if (f.kjallari) takkar.push({ k: 's:Kjallari', t: 'Kjallari' });
    if (f.ris) takkar.push({ k: 's:Ris', t: 'Ris' });
    if (takkar.length) takkar.push({ k: 'allar', t: 'Allar' });
    return takkar;
  }
  function thumbMerki(d) {
    const g = golvTeikningar(d);
    if (g.haed.length === 1) return g.haed[0] + '. hæð';
    if (g.haed.length > 1) return g.haed.map((n) => n + '. hæð').join(' + ');
    if (g.stig.indexOf('Kjallari') >= 0) return 'Kjallari';
    if (g.stig.indexOf('Ris') >= 0) return 'Ris';
    if (erGrunn(d)) return 'Grunnmynd';
    return (d && (d.tegund || d.gerd)) || 'Teikning';
  }
  const synilegar = () => {
    const l = S.listi;
    if (S.sia === 'skraning') return l.filter(erSkraning);
    if (S.sia === 'allar') return l;
    if (S.sia === 'gild') return l.filter(d => !d.urelt);
    if (S.sia && (S.sia.indexOf('h:') === 0 || S.sia.indexOf('s:') === 0)) {
      const s = sheetsForFloor(l, S.sia);
      if (s.length) return s;
      const gild = l.filter(d => !d.urelt);
      return gild.length ? gild : l;
    }
    const g = l.filter(d => d.grunnmynd && !d.urelt);
    return g.length ? g : l.filter(d => !d.urelt);
  };

  // Bakk-takkinn lokar forskoðuninni: skráð sem lag í almennu reglunni (patch 276).
  function loka() {
    const el = document.getElementById('tfs'); if (el) el.remove();
    document.removeEventListener('keydown', aLykil, true);
  }
  function aLykil(e) {
    if (e.key === 'Escape') { e.stopPropagation(); loka(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const l = synilegar(), i = l.indexOf(S.valin); if (i < 0) return;
    const n = l[i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1)]; if (n) { e.preventDefault(); velja(n); }
  }

  function grind() {
    stilar(); if (document.getElementById('tfs')) loka();
    const el = document.createElement('div'); el.id = 'tfs';
    el.innerHTML = '<div class="tfs-gl" role="dialog" aria-modal="true" aria-label="Teikningar">' +
      '<div class="tfs-hd"><div style="min-width:0;flex:1"><h2 id="tfs-titill"></h2><div class="tfs-sub" id="tfs-sub"></div></div>' +
        '<div class="tfs-seg" id="tfs-seg" role="group" aria-label="Hæðir"></div>' +
        '<button type="button" class="tfs-tk" data-a="loka" aria-label="Loka">✕ Loka</button></div>' +
      '<div class="tfs-bd"><div class="tfs-li" id="tfs-li"></div>' +
        '<div class="tfs-sv" id="tfs-sv"><div class="tfs-txt" id="tfs-txt" hidden></div>' +
          '<div class="tfs-zoom"><button type="button" data-z="ut" aria-label="Minnka">−</button><button type="button" data-z="inn" aria-label="Stækka">+</button><button type="button" data-z="passa" aria-label="Passa í glugga" style="font-size:15px">⤢</button></div>' +
          '<div class="tfs-bid" id="tfs-bid">Sæki teikningar…</div></div></div>' +
      '<div class="tfs-ft">' +
        '<button type="button" class="tfs-tk gull" data-a="turbopaint" title="Flytja teikninguna inn á TurboPaint-borð">🖌 Opna í TurboPaint</button>' +
        '<button type="button" class="tfs-tk" data-a="saekja" title="Upprunalega skjalið úr skjalasafninu">⬇ Sækja í fullum gæðum</button>' +
        '<button type="button" class="tfs-tk" data-a="prenta">🖨 Prenta</button>' +
        '<button type="button" class="tfs-tk" data-a="uttekt" title="Setja teikninguna í úttektarteikningu staðarins til að merkja tækin">📌 Nota í úttektarteikningu</button>' +
        '<span style="flex:1"></span><span class="tfs-sub" id="tfs-skra"></span></div></div>';
    document.body.appendChild(el);
    // Sama regla og í teikningaglugganum (383): appið þysjar sig á síma, svo breiddarregla kviknar ekki — skjár á hæðina ræður.
    const simi = () => el.classList.toggle('tfs-simi', window.innerWidth <= 760 || window.innerHeight > window.innerWidth * 1.1);
    simi(); window.addEventListener('resize', simi);
    el.addEventListener('click', e => {
      if (e.target === el) { loka(); return; }
      const t = e.target.closest('[data-a],[data-sia],[data-z],[data-i]'); if (!t) return;
      if (t.dataset.sia) { S.sia = t.dataset.sia; teiknaLista(true); return; }
      if (t.dataset.i != null) { velja(synilegar()[+t.dataset.i]); return; }
      if (t.dataset.z) { t.dataset.z === 'passa' ? passa() : thysja(t.dataset.z === 'inn' ? 1.4 : 1 / 1.4); return; }
      const a = t.dataset.a;
      if (a === 'loka') loka();
      else if (a === 'turbopaint') opnaTurboPaint();
      else if (a === 'saekja') saekjaFrumrit();
      else if (a === 'prenta') prenta();
      else if (a === 'uttekt') notaIUttekt();
    });
    document.addEventListener('keydown', aLykil, true);
    tengjaSvid();
  }

  function teiknaSiu() {
    const seg = document.getElementById('tfs-seg'); if (!seg) return;
    const haed = haedaTakkar(S.listi);
    const takkar = haed.length ? haed : [
      { k: 'grunn', t: 'Grunnmyndir' }, { k: 'gild', t: 'Gildandi' }, { k: 'allar', t: 'Allar' }, { k: 'skraning', t: 'Skráningartöflur' },
    ];
    if (!takkar.some((t) => t.k === S.sia)) S.sia = takkar[0].k;
    seg.innerHTML = takkar.map((t) =>
      '<button type="button" data-sia="' + esc(t.k) + '" aria-pressed="' + (t.k === S.sia) + '">' + esc(t.t) + '</button>').join('');
  }
  function teiknaLista(veljaFyrstu) {
    const li = document.getElementById('tfs-li'); if (!li) return;
    teiknaSiu();
    const l = synilegar();
    li.innerHTML = l.map((d, i) => '<button type="button" class="tfs-kort" data-i="' + i + '" aria-current="' + (d === S.valin) + '">' +
      '<span class="tfs-thumb" data-url="' + esc(d.infoUrl || '') + '"><img alt=""><em>' + esc(thumbMerki(d)) + '</em></span>' +
      '<b>' + esc(d.lysing || d.tegund || d.filename || 'Teikning') +
      (d.urelt ? ' <em style="color:#e0a05f;font-weight:400;font-style:normal">(úrelt)</em>' : '') + '</b><span>' + esc([d.dags, erPdf(d) ? 'PDF' : 'TIF'].filter(Boolean).join(' · ')) + '</span></button>').join('') ||
      '<div class="tfs-sub" style="padding:8px">' + (S.listi.length ? 'Ekkert blað á þessari hæð.' : 'Engin teikning í þessari síu.') + '</div>';
    const sub = document.getElementById('tfs-sub');
    const nafn = siaNafn(S.sia);
    if (sub) sub.textContent = (nafn ? nafn + ' · ' : '') + (l.length === 1 ? 'heilt blað' : (l.length + ' blöð')) + ' · Esc lokar';
    fyllaThumbs();
    if (veljaFyrstu && l.length && l.indexOf(S.valin) < 0) velja(l[0]);
  }

  /* ── forskoðun með þysjun ── */
  function beita() { const im = document.querySelector('#tfs-sv img'); if (im) im.style.transform = 'translate(' + S.z.x + 'px,' + S.z.y + 'px) scale(' + S.z.s + ')'; }
  function passa() {
    const sv = document.getElementById('tfs-sv'), im = sv && sv.querySelector('img');
    if (!im || !im.naturalWidth || !sv.clientWidth || !sv.clientHeight) return false;
    const s = Math.min((sv.clientWidth - 24) / im.naturalWidth, (sv.clientHeight - 24) / im.naturalHeight);
    if (!isFinite(s) || s <= 0) return false;
    im.classList.add('tfs-zoomad');
    S.z = { s, x: (sv.clientWidth - im.naturalWidth * s) / 2, y: (sv.clientHeight - im.naturalHeight * s) / 2 };
    beita();
    im.style.visibility = 'visible';
    return true;
  }
  function passaSeint(im) {
    let n = 0;
    const reyna = () => {
      if (!im || !im.isConnected) return;
      if (passa()) return;
      if (++n > 24) { im.style.visibility = 'visible'; return; }
      requestAnimationFrame(reyna);
    };
    reyna();
  }
  function thysja(f, cx, cy) {
    const sv = document.getElementById('tfs-sv'); if (!sv) return;
    const r = sv.getBoundingClientRect(), mx = cx == null ? r.width / 2 : cx - r.left, my = cy == null ? r.height / 2 : cy - r.top;
    const ns = Math.min(8, Math.max(0.02, S.z.s * f));
    S.z.x = mx - (mx - S.z.x) * (ns / S.z.s); S.z.y = my - (my - S.z.y) * (ns / S.z.s); S.z.s = ns; beita();
  }
  function tengjaSvid() {
    const sv = document.getElementById('tfs-sv'); if (!sv) return;
    const f = new Map(); let klipa = 0, midja = null;
    sv.addEventListener('wheel', e => { e.preventDefault(); thysja(e.deltaY < 0 ? 1.18 : 0.85, e.clientX, e.clientY); }, { passive: false });
    sv.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; try { sv.setPointerCapture(e.pointerId); } catch (_) {} f.set(e.pointerId, { x: e.clientX, y: e.clientY }); klipa = 0; midja = null; sv.style.cursor = 'grabbing'; });
    sv.addEventListener('pointermove', e => {
      const p = f.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (f.size >= 2) {
        const [a, b] = [...f.values()], fj = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (klipa) thysja(fj / klipa, mx, my);
        if (midja) { S.z.x += mx - midja[0]; S.z.y += my - midja[1]; beita(); }
        klipa = fj; midja = [mx, my];
      } else { S.z.x += dx; S.z.y += dy; beita(); }
    });
    const sleppa = e => { f.delete(e.pointerId); klipa = 0; midja = null; sv.style.cursor = 'grab'; };
    sv.addEventListener('pointerup', sleppa); sv.addEventListener('pointercancel', sleppa);
    window.addEventListener('resize', () => { if (document.getElementById('tfs')) passa(); });
  }

  function velja(d) {
    if (!d) return;
    S.valin = d;
    document.querySelectorAll('#tfs .tfs-kort').forEach((k, i) => {
      const a = synilegar()[i] === d; k.setAttribute('aria-current', String(a));
      if (a) try { k.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
    });
    const sv = document.getElementById('tfs-sv'), bid = document.getElementById('tfs-bid'), txt = document.getElementById('tfs-txt');
    const gomul = sv.querySelector('img'); if (gomul) gomul.remove();
    bid.hidden = false; bid.style.removeProperty('display');
    bid.innerHTML = '<div style="width:26px;height:26px;border:3px solid rgba(255,255,255,.18);border-top-color:#c9a54a;border-radius:50%;animation:bvr .9s linear infinite"></div>Sæki teikningu…';
    txt.hidden = false;
    txt.innerHTML = '<b>' + esc(d.lysing || d.tegund || 'Teikning') + '</b> · ' + esc([d.dags, d.stada, d.bnnr].filter(Boolean).join(' · '));
    document.getElementById('tfs-skra').textContent = d.filename || '';
    document.querySelector('#tfs [data-a="saekja"]').textContent = erPdf(d) ? '⬇ Sækja í fullum gæðum (PDF)' : beintTif(d) ? '⬇ Sækja TIF-skrána' : '⬇ Sækja frumrit í skjalasafni (TIF)';
    const im = new Image();
    im.alt = d.lysing || 'Teikning'; im.draggable = false;
    im.style.visibility = 'hidden';
    im.onload = () => {
      if (S.valin !== d) return;
      bid.hidden = true;
      bid.style.setProperty('display', 'none', 'important');
      sv.insertBefore(im, sv.firstChild);
      im.style.visibility = 'visible';
      passaSeint(im);
    };
    im.onerror = () => { if (S.valin !== d) return; bid.innerHTML = '⚠ Náði ekki í teikninguna. Prófaðu aðra, eða opnaðu hana í skjalasafninu með ⬇.'; };
    if (beintPdf(d)) bid.innerHTML = '<div style="width:26px;height:26px;border:3px solid rgba(255,255,255,.18);border-top-color:#c9a54a;border-radius:50%;animation:bvr .9s linear infinite"></div>Sæki PDF og teikna fyrstu síðu…';
    else if (beintTif(d)) bid.innerHTML = '<div style="width:26px;height:26px;border:3px solid rgba(255,255,255,.18);border-top-color:#c9a54a;border-radius:50%;animation:bvr .9s linear infinite"></div>Sæki TIF-skönnun og afkóða…';
    myndSlod(d).then(u => { if (S.valin !== d) return; im.src = u; if (d._sidur > 1) txt.innerHTML += ' · <span style="color:#e8cb7a">síða 1 af ' + d._sidur + ' — allar síður í ⬇ / 🖨</span>'; })
      .catch(e => { if (S.valin !== d) return; bid.innerHTML = '⚠ Náði ekki í teikninguna: ' + esc((e && e.message) || e) + '. Prófaðu aðra, eða sæktu skjalið með ⬇.'; });
  }

  /* ── aðgerðir ── */
  function opnaTurboPaint() {
    if (!S.valin) return;
    const plan = S.valin.infoUrl;
    if (S.coId && window.TeiknTurboPaint && typeof TeiknTurboPaint.opna === 'function' && window.FloorPlan && String(FloorPlan.companyId) === String(S.coId) && FloorPlan.bgImage) {
      TeiknTurboPaint.opna({ plan: plan });
      return;
    }
    const q = ['plan=' + encodeURIComponent(plan)];
    if (S.coId) q.push('uttekt=' + encodeURIComponent(S.coId));
    window.open(TURBOPAINT + '?' + q.join('&'), '_blank', 'noopener');
  }
  function saekjaFrumrit() {
    const d = S.valin; if (!d) return;
    if (erPdf(d)) {
      const a = document.createElement('a');
      a.href = PDF + '?nidurhal=1&url=' + encodeURIComponent(d.infoUrl); a.download = d.filename || 'teikning.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      segja('⬇ Sæki ' + (d.filename || 'PDF') + ' úr skjalasafninu…');
    } else if (beintTif(d)) {
      // Bein .tif kortasjár (Mosfellsbær: 1–1,5 MB) — streymd af sömu rót sem niðurhal með nafni skjalsins.
      const a = document.createElement('a');
      a.href = PDF + '?nidurhal=1&url=' + encodeURIComponent(d.infoUrl); a.download = d.filename || 'teikning.tif';
      document.body.appendChild(a); a.click(); a.remove();
      segja('⬇ Sæki ' + (d.filename || 'TIF') + ' úr kortasjánni…');
    } else {
      // TIF-frumrit eru 50–300 MB — of stór til að streyma gegnum fall. Síða skjalsins í safninu á „Download".
      window.open(String(d.infoUrl), '_blank', 'noopener');
      segja('TIF-frumritið er of stórt til að sækja héðan — skjalið opnast í skjalasafninu, veldu „Download" þar.');
    }
  }
  function prenta() {
    const d = S.valin; if (!d) return;
    if (erPdf(d)) {
      // Vigur-PDF prentast hnífskarpt úr PDF-skoðara vafrans — mynd af því væri alltaf lakari.
      window.open(PDF + '?url=' + encodeURIComponent(d.infoUrl), '_blank');
      segja('PDF-ið opnast í nýjum flipa — prentaðu þaðan (Ctrl+P) í fullum gæðum.');
      return;
    }
    const im = document.querySelector('#tfs-sv img'); if (!im) { segja('Bíddu þar til teikningin hefur hlaðist.'); return; }
    const langs = im.naturalWidth >= im.naturalHeight;
    const g = window.open('', '_blank'); if (!g) { segja('Vafrinn lokaði á prentgluggann — leyfðu sprettiglugga fyrir síðuna.'); return; }
    g.document.write('<!doctype html><title>' + esc((S.stadur ? S.stadur + ' — ' : '') + (d.lysing || 'Teikning')) + '</title>' +
      '<style>@page{size:' + (langs ? 'landscape' : 'portrait') + ';margin:8mm}html,body{margin:0;height:100%}img{display:block;max-width:100%;max-height:100vh;margin:0 auto}</style>' +
      '<img src="' + esc(new URL(im.src, location.href).href) + '" onload="setTimeout(function(){window.print()},200)">');
    g.document.close();
  }
  function notaIUttekt() {
    const d = S.valin; if (!d) return;
    if (typeof FloorPlan === 'undefined' || !FloorPlan.open) { segja('Teikniglugginn er ekki tilbúinn — reyndu aftur.'); return; }
    const takki = [...document.querySelectorAll('button,a')].find(b => {
      const t = (b.textContent || '').replace(/\s+/g, ' ').trim();
      const on = b.getAttribute('onclick') || '';
      return t === 'Teikning' && (/FloorPlan\.open/.test(on) || /opnaTeikningu/.test(on));
    });
    if (!takki) { segja('Fann ekki „Teikning"-takkann á spjaldinu — opnaðu úttektarteikninguna og notaðu „📐 Sækja teikningu".'); return; }
    // loka() tekur sögufærsluna af með history.back() — ÓSAMSTILLT. Opnist teikningaglugginn (sem setur sína eigin
    // færslu) á undan, tæki bakkið HANS færslu og næsta lokun færi af spjaldinu. Því er beðið eftir bakkinu.
    loka(); setTimeout(() => takki.click(), 450);
    // Glugginn hleður fyrst vistuðu hæðirnar (375/383). Eigi virka hæðin þegar teikningu fer þessi á NÝJA hæð — annars
    // færi hún yfir teikningu sem tækin eru þegar merkt á.
    let n = 0;
    const bida = setInterval(() => {
      const m = document.getElementById('modal-floorplan'), flipar = document.getElementById('fp-haedir');
      if (++n > 40) { clearInterval(bida); return; }
      if (!m || !flipar || n < 6) return;                              // ~1,8 sek: svar þjónsins um hæðirnar er komið
      clearInterval(bida);
      const p = FloorPlan.plans[FloorPlan.companyId];
      if (p && p.imageUrl) { const ny = flipar.querySelector('[data-h="ny"]'); if (ny) ny.click(); }
      setTimeout(() => {
        const im = new Image(); let url = '';
        im.onload = () => {
          FloorPlan.bgImage = im;
          const pl = FloorPlan.plans[FloorPlan.companyId] || (FloorPlan.plans[FloorPlan.companyId] = { markers: [] }); pl.imageUrl = url;
          const c = document.getElementById('fp-canvas'); if (c) c.style.display = 'block';
          const dm = document.getElementById('fp-drop-msg'); if (dm) dm.style.display = 'none';
          try { FloorPlan._renderCanvas(); FloorPlan._renderPanel(); } catch (_) {}
          segja('📌 ' + (d.lysing || 'Teikningin') + ' er komin í úttektarteikninguna — merktu tækin og ýttu á Vista.');
        };
        im.onerror = () => segja('⚠ Náði ekki í teikninguna fyrir úttektina.');
        // Beint PDF / TIF: blob-slóðin lifir aðeins í þessum flipa og má EKKI vistast sem imageUrl á þjóninn — þar fer gagnaslóð.
        myndSlod(d).then(async u => {
          if (beintPdf(d) || beintTif(d)) { try { const b = await (await fetch(u)).blob(); u = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); } catch (_) {} }
          url = u;
          if (window.TeiknGaedi && TeiknGaedi.bindSrc) TeiknGaedi.bindSrc(im, u);
          else if (window.TeiknSja && TeiknSja.bindSrc) TeiknSja.bindSrc(im, u);
          else im.src = u;
        }).catch(() => segja('⚠ Náði ekki í teikninguna fyrir úttektina.'));
      }, 350);
    }, 300);
  }

  let _opnun = 0;
  function nyskraFyrirtaeki(coId) {
    const nyr = coId == null || coId === '' ? null : String(coId);
    // Tóm kalla (banner-púls án id) mega ekki loka opinni forskoðun.
    if (nyr == null) return S.coId;
    if (S.coId != null && String(S.coId) === nyr) return S.coId;
    _opnun++;
    if (document.getElementById('tfs')) loka();
    Object.assign(S, { listi: [], sia: 'grunn', valin: null, stadur: '', coId: nyr, _landnr: '', z: { s: 1, x: 0, y: 0 } });
    return nyr;
  }
  function heimiliFyrir(coId) {
    try {
      const c = ((window.Companies && Companies.list) || []).find(x => String(x.id) === String(coId));
      return c ? String(c.heimilisfang || '').trim() : '';
    } catch (_) { return ''; }
  }
  function aukaAfEl(el) {
    const auka = {};
    if (el && el.dataset && el.dataset.golv) auka.sia = el.dataset.golv;
    if (el && el.dataset && el.dataset.svf) {
      auka.svf = el.dataset.svf;
      auka.heitinr = el.dataset.heitinr || 0;
    }
    return auka;
  }
  function opnaAfEl(el, flokkur, sia) {
    if (!el) return;
    const co = el.dataset.co || null;
    const land = el.dataset.landnr;
    if (land) {
      const auka = aukaAfEl(el);
      if (sia) auka.sia = sia;
      opna(land, el.dataset.stadur || '', co, auka);
      return;
    }
    opnaGeymt(co, flokkur, sia || (el.dataset && el.dataset.golv) || '');
  }

  function hnutur(e) {
    let t = e && e.target;
    if (t && t.nodeType === 3) t = t.parentElement;
    return t && t.closest ? t : null;
  }

  async function opna(landnr, stadur, coId, auka) {
    const sia = (auka && auka.sia) || '';
    if (coId != null && coId !== '') nyskraFyrirtaeki(coId);
    const min = ++_opnun;
    // Sami aðaluppdráttalisti er þegar inni — skipt er um síu án nýs kalls.
    // Ekki endurnýta gluggann þegar félagið breyttist: landnúmer getur verið
    // það sama á tveimur húsum og þá gleypti fyrri listinn seinni smellinn.
    if (document.getElementById('tfs') && S._landnr === String(landnr) && S.listi.length
      && (coId == null || coId === '' || String(S.coId) === String(coId))) {
      S.sia = sia;
      if (stadur) S.stadur = stadur;
      teiknaLista(true);
      return;
    }
    Object.assign(S, { listi: [], sia, valin: null, stadur: stadur || '', coId: coId || S.coId || null, _landnr: String(landnr) });
    grind();
    document.getElementById('tfs-titill').textContent = '📐 Teikningar' + (stadur ? ' — ' + stadur : '');
    try {
      const vidbot = auka && auka.svf ? '&svf=' + encodeURIComponent(auka.svf) + '&heitinr=' + encodeURIComponent(auka.heitinr || 0) : '';
      const r = await fetch(LISTI + '?landnr=' + encodeURIComponent(landnr) + vidbot, { signal: AbortSignal.timeout(28000) });
      const d = await r.json();
      if (min !== _opnun || !document.getElementById('tfs')) return;
      if (d.error) throw new Error(d.error);
      S.listi = d.results || [];
      if (!S.sia) S.sia = veljaSia(S.listi);
      if (!S.listi.length) { document.getElementById('tfs-bid').textContent = 'Engar teikningar skráðar á þetta landnúmer.'; return; }
      teiknaLista(true);
    } catch (e) {
      if (min !== _opnun) return;
      const b = document.getElementById('tfs-bid'); if (b) b.textContent = '⚠ Náði ekki í teikningalistann: ' + ((e && e.message) || e);
    }
  }
  // 21.09.2026 (Agnar: „mig langar bara að geta kíkt á teikningarnar fyrst án þess að fylla TurboPaint"): forskoðun út frá
  // heimilisfangi, svo hún nýtist líka þar sem enginn banner-hlekkur er (Teikningar-glugginn, 376). Uppflettingin er
  // hus-upplysingar — sama fall og 363 notar — sem þolir beygð götuheiti og póstnúmer og skilar landnr + heitinr + svf.
  let _leit = 0;
  async function opnaHeimilisfang(heimilisfang, coId) {
    const h = String(heimilisfang || '').trim();
    if (h.length < 3) { segja('Veldu stað eða sláðu inn heimilisfang.'); return false; }
    const min = ++_leit;
    segja('🔎 Leita að teikningum á ' + h + '…');
    let d = null;
    try {
      const r = await fetch('/.netlify/functions/hus-upplysingar?heimilisfang=' + encodeURIComponent(h), { signal: AbortSignal.timeout(28000) });
      d = await r.json();
    } catch (e) { if (min === _leit) segja('⚠ Náði ekki í teikningaskrána: ' + ((e && e.message) || e)); return false; }
    if (min !== _leit) return false;                                   // nýrri leit tók við
    if (!d || d.error || !d.eign || !d.eign.landnr) { segja((d && d.error) || ('Fann enga lóð fyrir „' + h + '".')); return false; }
    if (!d.teikningar || !d.teikningar.fjoldi) { segja(d.athugasemd || ('Engar rafrænar teikningar fundust á ' + (d.eign.label || h) + '.')); return false; }
    if (d.eign.oviss) segja('ℹ Nákvæmt húsnúmer fannst ekki — sýni næstu lóð: ' + d.eign.label);
    await opna(d.eign.landnr, d.eign.label || h, coId || null, d.eign.svf ? { svf: d.eign.svf, heitinr: d.eign.heitinr || 0 } : null);
    return true;
  }
  // Hlekkurinn á spjaldinu (363 setur data-landnr þegar staðurinn er í skjalasafni Reykjavíkur).
  function opnaGeymt(coId, flokkur, sia) {
    nyskraFyrirtaeki(coId);
    const sk = window.BannerUpplysingar && BannerUpplysingar.skrarSvar && BannerUpplysingar.skrarSvar(coId);
    const allar = (sk && sk.results) || [];
    const land = sk && sk.eign && sk.eign.landnr;
    if (!allar.length && land) {
      const auka = { sia: sia || '' };
      if (sk.eign.svf) { auka.svf = sk.eign.svf; auka.heitinr = sk.eign.heitinr || 0; }
      opna(sk.eign.landnr, (sk.eign && sk.eign.label) || '', coId, auka);
      return;
    }
    if (!allar.length) {
      const heim = heimiliFyrir(coId);
      if (heim.length >= 3) {
        opnaHeimilisfang(heim, coId).then(ok => {
          if (ok && sia) { S.sia = sia; teiknaLista(true); }
        });
        return;
      }
    }
    const listi = flokkur ? allar.filter(d => d.flokkur === flokkur) : allar;
    Object.assign(S, {
      listi: listi.length ? listi : allar,
      sia: sia || veljaSia(listi.length ? listi : allar),
      valin: null,
      stadur: (sk && sk.eign && sk.eign.label) || '',
      coId: coId || null,
    });
    grind();
    const titill = document.getElementById('tfs-titill');
    if (titill) titill.textContent = '📐 Teikningar' + (S.stadur ? ' — ' + S.stadur : '');
    if (!S.listi.length) {
      const b = document.getElementById('tfs-bid');
      if (b) b.textContent = 'Engar vistaðar teikningar á þessu húsi.';
      return;
    }
    teiknaLista(true);
  }

  function festTakka(rot) {
    const r = rot && rot.querySelectorAll ? rot : document;
    r.querySelectorAll('._bupp-teikn').forEach(el => {
      if (el.dataset.teiknFest === '1') return;
      el.dataset.teiknFest = '1';
      el.addEventListener('click', e => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        e.stopPropagation();
        if (el.dataset.golv) opnaAfEl(el, null, el.dataset.golv);
        else if (el.dataset.flokkur) opnaAfEl(el, el.dataset.flokkur);
        else if (el.dataset.landnr) opna(el.dataset.landnr, el.dataset.stadur || '', el.dataset.co || null, el.dataset.svf ? { svf: el.dataset.svf, heitinr: el.dataset.heitinr || 0 } : null);
      });
    });
  }

  function smellaTeikn(e) {
    const t = hnutur(e);
    if (!t) return;
    const g = t.closest('button._bupp-teikn[data-golv]');
    if (g) {
      e.preventDefault(); e.stopPropagation();
      opnaAfEl(g, null, g.dataset.golv);
      return;
    }
    const b = t.closest('button._bupp-teikn[data-flokkur]');
    if (b) {
      e.preventDefault(); e.stopPropagation();
      opnaAfEl(b, b.dataset.flokkur);
      return;
    }
    const a = t.closest('a._bupp-teikn[data-landnr]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
    e.preventDefault(); e.stopPropagation();
    opna(a.dataset.landnr, a.dataset.stadur || '', a.dataset.co || null, a.dataset.svf ? { svf: a.dataset.svf, heitinr: a.dataset.heitinr || 0 } : null);
  }

  document.addEventListener('click', smellaTeikn, true);
  window.addEventListener('hashchange', () => {
    const m = String(location.hash || '').match(/#(?:company|companies)\/(\d+)/);
    if (m) {
      nyskraFyrirtaeki(m[1]);
      setTimeout(() => { try { festTakka(document.querySelector('.co-bupp') || document); } catch (_) {} }, 0);
    }
  });

  // 20.10.2026: smámyndir og PDF-gögn (skyndiminni hér) eru nú líka notuð af „Veldu teikningu" (374) svo kortin sjáist.
  window.TeikningaForskodun = { opna, loka, opnaHeimilisfang, opnaGeymt, festTakka, nyskraFyrirtaeki, thumbAf, pdfGogn, hladaPdfJs, beintPdf, beintTif, myndSlod };
})();
