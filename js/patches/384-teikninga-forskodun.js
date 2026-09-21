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
 * TIF-frumrit eru 50–300 MB og fara ekki gegnum fall með 10 sek þak — þar opnast skjalið í skjalasafninu sjálfu.
 * ========================================================================== */
(() => {
  if (window.__teiknForskodun) return;
  window.__teiknForskodun = true;

  const LISTI = '/.netlify/functions/teikn-listi', MYND = '/.netlify/functions/teikn-mynd', PDF = '/.netlify/functions/teikn-pdf';
  const TURBOPAINT = 'https://slokkvitaeki.vercel.app/kjarni/turbopaint';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const segja = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const erPdf = d => /\.pdf(\.info)?$/i.test(String(d.infoUrl || d.filename || ''));
  // 21.09.2026: Kópavogur / Garðabær / Hafnarfjörður afhenda BEINT PDF (engin .info, engin smámynd, engin JPEG-útgáfa).
  // Þar er fyrsta síða skjalsins teiknuð með pdf.js (sama útgáfa og 383 / FloorPlan) og sýnd sem mynd, svo þysjun,
  // prentun og „Nota í úttektarteikningu" virka eins og fyrir Reykjavík. Myndirnar eru geymdar á meðan glugginn er opinn.
  const beintPdf = d => /\.pdf$/i.test(String(d.infoUrl || '')) && !/skjalasafn\.reykjavik\.is/i.test(String(d.infoUrl || ''));
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const _myndir = new Map();
  function hladaPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise((res, rej) => {
      const sk = document.createElement('script'); sk.src = PDFJS + 'pdf.min.js';
      sk.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } catch (_) {} res(); };
      sk.onerror = () => rej(new Error('pdf.js hlóðst ekki')); document.head.appendChild(sk);
    });
  }
  async function myndSlod(d) {
    if (!beintPdf(d)) return MYND + '?url=' + encodeURIComponent(d.infoUrl);
    if (_myndir.has(d.infoUrl)) return _myndir.get(d.infoUrl);
    await hladaPdfJs();
    const r = await fetch(PDF + '?url=' + encodeURIComponent(d.infoUrl), { signal: AbortSignal.timeout(45000) });
    if (!r.ok) { let v = ''; try { v = (await r.json()).error || ''; } catch (_) {} throw new Error(v || ('PDF fékkst ekki (' + r.status + ')')); }
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise;
    const sida = await doc.getPage(1), v0 = sida.getViewport({ scale: 1 });
    const kv = Math.min(4, Math.max(1, 4200 / Math.max(v0.width, v0.height)));          // lengri hlið ~4200 px: læsileg málsetning, hóflegt minni
    const vp = sida.getViewport({ scale: kv }), cv = document.createElement('canvas');
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    await sida.render({ canvasContext: cx, viewport: vp }).promise;
    const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.9));
    const url = URL.createObjectURL(blob); _myndir.set(d.infoUrl, url);
    d._sidur = doc.numPages;
    return url;
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
      '#tfs .tfs-seg{display:inline-flex;border:1px solid rgba(255,255,255,.18);border-radius:9px;overflow:hidden}' +
      '#tfs .tfs-seg button{height:32px;padding:0 11px;border:0;border-left:1px solid rgba(255,255,255,.12);background:transparent;color:#f1ede4;font:600 12.5px inherit;cursor:pointer}' +
      '#tfs .tfs-seg button:first-child{border-left:0}#tfs .tfs-seg button[aria-pressed="true"]{background:#c9a54a;color:#14120f}' +
      '#tfs .tfs-tk{height:38px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;font:700 13px inherit;cursor:pointer;white-space:nowrap}' +
      '#tfs .tfs-tk:hover{background:rgba(255,255,255,.14)}#tfs .tfs-tk.gull{background:#c9a54a;color:#14120f;border-color:#c9a54a}#tfs .tfs-tk:disabled{opacity:.45;cursor:default}' +
      '#tfs .tfs-bd{flex:1;min-height:0;display:flex}' +
      '#tfs .tfs-li{width:210px;flex:none;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;border-right:1px solid rgba(255,255,255,.1);-webkit-overflow-scrolling:touch}' +
      '#tfs .tfs-kort{flex:none;border:2px solid transparent;border-radius:9px;overflow:hidden;background:rgba(255,255,255,.05);cursor:pointer;text-align:left;padding:0;color:inherit;font:inherit}' +
      '#tfs .tfs-kort[aria-current="true"]{border-color:#c9a54a}' +
      '#tfs .tfs-kort i{display:block;height:104px;background:#000 center/contain no-repeat}' +
      '#tfs .tfs-kort b{display:block;font-size:12.5px;padding:6px 8px 1px;line-height:1.25}#tfs .tfs-kort span{display:block;font-size:11px;color:rgba(255,255,255,.5);padding:0 8px 7px}' +
      '#tfs .tfs-sv{flex:1;min-width:0;position:relative;overflow:hidden;background:#2a2724;touch-action:none;cursor:grab}' +
      '#tfs .tfs-sv img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none;user-select:none;-webkit-user-drag:none;background:#fff}' +
      '#tfs .tfs-bid{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:rgba(255,255,255,.75);font-size:14px;text-align:center;padding:20px}' +
      '#tfs .tfs-zoom{position:absolute;right:10px;top:10px;display:flex;gap:5px;z-index:2}' +
      '#tfs .tfs-zoom button{width:40px;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.88);color:#fff;font:700 19px system-ui;cursor:pointer}' +
      '#tfs .tfs-txt{position:absolute;left:10px;top:10px;z-index:2;max-width:calc(100% - 160px);padding:6px 10px;border-radius:9px;background:rgba(20,18,15,.88);font-size:12.5px;line-height:1.35}' +
      '#tfs .tfs-ft{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 14px;border-top:1px solid rgba(255,255,255,.1);background:#0f0e0c}' +
      '#tfs.tfs-simi .tfs-gl{width:100vw;height:100dvh;border-radius:0}#tfs.tfs-simi .tfs-bd{flex-direction:column-reverse}' +
        '#tfs.tfs-simi .tfs-li{width:auto;flex-direction:row;overflow-x:auto;overflow-y:hidden;border-right:0;border-top:1px solid rgba(255,255,255,.1);padding:8px}' +
        '#tfs.tfs-simi .tfs-kort{width:132px}#tfs.tfs-simi .tfs-kort i{height:78px}#tfs.tfs-simi .tfs-ft .tfs-tk{flex:1 1 46%;padding:0 8px;font-size:12.5px}#tfs.tfs-simi .tfs-hd{padding-left:64px}';
    document.head.appendChild(st);
  }

  const synilegar = () => {
    const l = S.listi;
    if (S.sia === 'allar') return l;
    if (S.sia === 'gild') return l.filter(d => !d.urelt);
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
        '<div class="tfs-seg" role="group" aria-label="Sía">' +
          '<button type="button" data-sia="grunn">Grunnmyndir</button><button type="button" data-sia="gild">Gildandi</button><button type="button" data-sia="allar">Allar</button></div>' +
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

  function teiknaLista(veljaFyrstu) {
    const li = document.getElementById('tfs-li'); if (!li) return;
    const l = synilegar();
    document.querySelectorAll('#tfs [data-sia]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sia === S.sia)));
    li.innerHTML = l.map((d, i) => '<button type="button" class="tfs-kort" data-i="' + i + '" aria-current="' + (d === S.valin) + '">' +
      '<i style="' + (d.thumb ? 'background-image:url(\'' + esc(d.thumb) + '\')' : '') + '"></i><b>' + esc(d.lysing || d.tegund || d.filename || 'Teikning') +
      (d.urelt ? ' <em style="color:#e0a05f;font-weight:400;font-style:normal">(úrelt)</em>' : '') + '</b><span>' + esc([d.dags, erPdf(d) ? 'PDF' : 'TIF'].filter(Boolean).join(' · ')) + '</span></button>').join('') ||
      '<div class="tfs-sub" style="padding:8px">Engin teikning í þessari síu.</div>';
    const sub = document.getElementById('tfs-sub');
    if (sub) sub.textContent = l.length + ' af ' + S.listi.length + ' teikningum · ↑↓ fletta · Esc lokar';
    if (veljaFyrstu && l.length && l.indexOf(S.valin) < 0) velja(l[0]);
  }

  /* ── forskoðun með þysjun ── */
  function beita() { const im = document.querySelector('#tfs-sv img'); if (im) im.style.transform = 'translate(' + S.z.x + 'px,' + S.z.y + 'px) scale(' + S.z.s + ')'; }
  function passa() {
    const sv = document.getElementById('tfs-sv'), im = sv && sv.querySelector('img'); if (!im || !im.naturalWidth) return;
    const s = Math.min((sv.clientWidth - 16) / im.naturalWidth, (sv.clientHeight - 16) / im.naturalHeight);
    S.z = { s, x: (sv.clientWidth - im.naturalWidth * s) / 2, y: (sv.clientHeight - im.naturalHeight * s) / 2 }; beita();
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
    bid.hidden = false; bid.innerHTML = '<div style="width:26px;height:26px;border:3px solid rgba(255,255,255,.18);border-top-color:#c9a54a;border-radius:50%;animation:bvr .9s linear infinite"></div>Sæki teikningu…';
    txt.hidden = false;
    txt.innerHTML = '<b>' + esc(d.lysing || d.tegund || 'Teikning') + '</b> · ' + esc([d.dags, d.stada, d.bnnr].filter(Boolean).join(' · '));
    document.getElementById('tfs-skra').textContent = d.filename || '';
    document.querySelector('#tfs [data-a="saekja"]').textContent = erPdf(d) ? '⬇ Sækja í fullum gæðum (PDF)' : '⬇ Sækja frumrit í skjalasafni (TIF)';
    const im = new Image();
    im.alt = d.lysing || 'Teikning'; im.draggable = false;
    im.onload = () => { if (S.valin !== d) return; bid.hidden = true; sv.insertBefore(im, sv.firstChild); passa(); };
    im.onerror = () => { if (S.valin !== d) return; bid.innerHTML = '⚠ Náði ekki í teikninguna. Prófaðu aðra, eða opnaðu hana í skjalasafninu með ⬇.'; };
    if (beintPdf(d)) bid.innerHTML = '<div style="width:26px;height:26px;border:3px solid rgba(255,255,255,.18);border-top-color:#c9a54a;border-radius:50%;animation:bvr .9s linear infinite"></div>Sæki PDF og teikna fyrstu síðu…';
    myndSlod(d).then(u => { if (S.valin !== d) return; im.src = u; if (d._sidur > 1) txt.innerHTML += ' · <span style="color:#e8cb7a">síða 1 af ' + d._sidur + ' — allar síður í ⬇ / 🖨</span>'; })
      .catch(e => { if (S.valin !== d) return; bid.innerHTML = '⚠ Náði ekki í teikninguna: ' + esc((e && e.message) || e) + '. Prófaðu aðra, eða sæktu skjalið með ⬇.'; });
  }

  /* ── aðgerðir ── */
  function opnaTurboPaint() {
    if (!S.valin) return;
    window.open(TURBOPAINT + '?plan=' + encodeURIComponent(S.valin.infoUrl), '_blank', 'noopener');
  }
  function saekjaFrumrit() {
    const d = S.valin; if (!d) return;
    if (erPdf(d)) {
      const a = document.createElement('a');
      a.href = PDF + '?nidurhal=1&url=' + encodeURIComponent(d.infoUrl); a.download = d.filename || 'teikning.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      segja('⬇ Sæki ' + (d.filename || 'PDF') + ' úr skjalasafninu…');
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
    const takki = [...document.querySelectorAll('button,a')].find(b => b.textContent.trim() === 'Teikning' && /FloorPlan\.open/.test(b.getAttribute('onclick') || ''));
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
        // Beint PDF: blob-slóðin lifir aðeins í þessum flipa og má EKKI vistast sem imageUrl á þjóninn — þar fer gagnaslóð.
        myndSlod(d).then(async u => {
          if (beintPdf(d)) { try { const b = await (await fetch(u)).blob(); u = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); } catch (_) {} }
          url = u; im.src = u;
        }).catch(() => segja('⚠ Náði ekki í teikninguna fyrir úttektina.'));
      }, 350);
    }, 300);
  }

  async function opna(landnr, stadur, coId, auka) {
    Object.assign(S, { listi: [], sia: 'grunn', valin: null, stadur: stadur || '', coId: coId || null });
    grind();
    document.getElementById('tfs-titill').textContent = '📐 Teikningar' + (stadur ? ' — ' + stadur : '');
    try {
      const vidbot = auka && auka.svf ? '&svf=' + encodeURIComponent(auka.svf) + '&heitinr=' + encodeURIComponent(auka.heitinr || 0) : '';
      const r = await fetch(LISTI + '?landnr=' + encodeURIComponent(landnr) + vidbot, { signal: AbortSignal.timeout(28000) });
      const d = await r.json();
      if (!document.getElementById('tfs')) return;
      if (d.error) throw new Error(d.error);
      S.listi = d.results || [];
      if (!S.listi.length) { document.getElementById('tfs-bid').textContent = 'Engar teikningar skráðar á þetta landnúmer.'; return; }
      teiknaLista(true);
    } catch (e) {
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
  window.TeikningaForskodun = { opna, loka, opnaHeimilisfang };

  // Hlekkurinn á spjaldinu (363 setur data-landnr þegar staðurinn er í skjalasafni Reykjavíkur).
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a._bupp-teikn[data-landnr]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
    e.preventDefault(); e.stopPropagation();
    opna(a.dataset.landnr, a.dataset.stadur || '', a.dataset.co || null, a.dataset.svf ? { svf: a.dataset.svf, heitinr: a.dataset.heitinr || 0 } : null);
  }, true);
})();
