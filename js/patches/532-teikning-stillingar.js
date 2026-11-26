/* === 532-teikning-stillingar.js — Táknasafn & aðgerðir: sjálfsafgreiðsla (Agnar 26.11.2026) =========================
 *
 * Agnar: „Vil bara geta opnað teikningu, breytt því sem ég vil, sett tæki og búnað, og helst bakenda-stillingar og ham til
 * að stjórna hvað sé í aðgerðartökkum í teikningum og TurboPaint — breyta, bæta við táknum, hide, add — svo ég þurfi ekki
 * stöðugt að vera með Claude í að laga 24/7."
 *
 * Þessi patch er stillingaglugginn. Hann breytir ENGUM kóða — hann skrifar aðeins yfirlög á þjóninn (Vidmot, eins á öllum
 * vélum, regla 05.09): `teikning.bunadur`, `teikning.merki` (táknin í ræmunni) og `teikning.takkar` (hvaða aðgerðir sjást,
 * um 484). 433 les yfirlögin og byggir ræmuna; 484 les aðgerðaval. Opnast úr „Nánar ▾ → ⚙ Táknasafn & aðgerðir".
 *
 * Mörk (staðfest með Agnari): ný tákn eru BÚNAÐUR bundinn ÞEKKTRI tegund (Léttvatn, Reykskynjari …) svo táknið á striga
 * verði rétt sjálfkrafa (434 les tegund). Merki (ÚT-skilti o.fl.) má fela/endurnefna/lita/raða en ekki bæta við (nýtt
 * stimpil-id teiknaðist sem „annað" á striga). TurboPaint (kjarni, önnur vél) les sömu yfirlög í sér verki síðar.
 * =================================================================================================================== */
(() => {
  if (window.TeiknStillingar) return;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TM = () => window.TeiknMerking;
  const TT = () => window.TeiknTakn;
  // Þekktar tegundir fyrir nýjan búnað — sömu og tækin eru skráð (uttaeki.type) og 434 fjold()/kjarni þekkja.
  const TEGUNDIR = ['Léttvatn', 'ABC Duft', 'CO2', 'Brunaslanga', 'Reykskynjari', 'Hitaskynjari', 'Viðvörunarbjalla', 'Segulloki', 'Handboði', 'Annað tæki'];
  // Íkon sem nýtt merki má bera (sömu og 434 teiknar). Agnar 26.11.2026: „random ný merki sem vill bæta innan í".
  const GLYFF = (window.TeiknTakn && Array.isArray(TeiknTakn.glyff)) ? TeiknTakn.glyff : ['extinguisher', 'hose', 'sign-extinguisher', 'sign-hose', 'exit', 'electric', 'hydrant', 'pin', 'alarm', 'detector', 'magnet', 'window'];
  const GLYFF_NOFN = { extinguisher: 'Slökkvitæki', hose: 'Slanga', 'sign-extinguisher': 'Skilti SLT', 'sign-hose': 'Skilti slanga', exit: 'Útgangur', electric: 'Rafmagn', hydrant: 'Hani', pin: 'Pinni', alarm: 'Hnappur', detector: 'Skynjari', magnet: 'Segull', window: 'Björgunarop' };

  function lesaYf(key) { try { const v = window.Vidmot && Vidmot.lesa(key, null); return v && typeof v === 'object' ? v : {}; } catch (_) { return {}; } }
  function vista(key, obj) { try { if (window.Vidmot) Vidmot.setja(key, obj); } catch (e) { console.warn('[532] vista', e); } }
  const stuttAf = n => String(n || '').trim().replace(/[^A-Za-zÁÉÍÓÚÝÞÆÖáéíóúýþæö0-9]/g, '').slice(0, 2).toUpperCase() || 'TÁ';

  // Byggir vinnulíkan eins og það stendur núna: sjálfgefið + yfirlög, í röð.
  function byggja() {
    const sj = (TM() && TM().sjalfgefid) || { merki: [], bunadur: [] };
    const bunY = lesaYf('teikning.bunadur'), merY = lesaYf('teikning.merki');
    const raða = (DEF, yf, erBun) => {
      const breytt = yf.breytt || {}, falin = new Set(yf.falin || []), ny = Array.isArray(yf.ny) ? yf.ny : [], rod = Array.isArray(yf.rod) ? yf.rod : null;
      let L = DEF.map(d => Object.assign({ _def: true }, d, breytt[d.id] || {}, { falid: falin.has(d.id) }));
      ny.forEach(n => { if (n && n.id && !L.some(x => x.id === n.id)) L.push(Object.assign({ _ny: true }, n, { falid: falin.has(n.id) })); });
      if (rod) L.sort((a, b) => { const ia = rod.indexOf(a.id), ib = rod.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
      return L;
    };
    return {
      bun: raða(sj.bunadur || [], bunY, true),
      mer: raða(sj.merki || [], merY, false),
      takkar: (window.TeiknTakkar && TeiknTakkar.listi ? TeiknTakkar.listi() : []).map(t => Object.assign({}, t, { synt: (TeiknTakkar.festir() || []).indexOf(t.k) >= 0 }))
    };
  }

  function css() {
    if (document.getElementById('t532-css')) return;
    const st = document.createElement('style'); st.id = 't532-css';
    st.textContent =
      '#t532-bak{position:fixed;inset:0;z-index:2147483000;background:rgba(10,9,7,.62);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto}' +
      '#t532{width:min(620px,100%);background:#1b1916;border:1px solid rgba(255,255,255,.2);border-radius:16px;color:#f1ede4;font:500 13.5px/1.5 system-ui,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.6);margin:auto}' +
      '#t532 .hd{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.12)}' +
      '#t532 .hd h2{margin:0;font:800 16px system-ui;flex:1}' +
      '#t532 .hd button{height:34px;padding:0 12px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#f1ede4;font:700 13px system-ui;cursor:pointer}' +
      '#t532 .bd{padding:10px 14px 4px;max-height:calc(100vh - 190px);overflow:auto}' +
      '#t532 h3{margin:16px 2px 6px;font:800 13px system-ui;color:#e8d9a8;letter-spacing:.02em}' +
      '#t532 h3:first-child{margin-top:4px}' +
      '#t532 .sk{font-size:11.5px;color:rgba(255,255,255,.55);margin:0 2px 8px}' +
      '#t532 .r{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:9px;background:rgba(255,255,255,.04);margin:5px 0}' +
      '#t532 .r[data-falid="1"]{opacity:.5}' +
      '#t532 .r .ico{width:26px;height:26px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;font:800 10px system-ui;color:#fff;background:#8a1d27;overflow:hidden}' +
      '#t532 .r .ico canvas,#t532 .r .ico img{width:100%;height:100%;object-fit:contain}' +
      '#t532 .r input[type=text]{flex:1;min-width:60px;height:30px;border-radius:7px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.25);color:#f1ede4;font:600 12.5px system-ui;padding:0 8px}' +
      '#t532 .r input[type=color]{width:34px;height:30px;border-radius:7px;border:1px solid rgba(255,255,255,.2);background:none;cursor:pointer;flex:none;padding:0}' +
      '#t532 .r select{height:30px;border-radius:7px;border:1px solid rgba(255,255,255,.2);background:#241f1a;color:#f1ede4;font:600 12px system-ui;padding:0 6px}' +
      '#t532 .r .mv{display:flex;flex-direction:column;gap:1px;flex:none}' +
      '#t532 .r .mv button,#t532 .r .x,#t532 .r .eye{height:28px;min-width:30px;border-radius:7px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#f1ede4;font:700 12px system-ui;cursor:pointer;flex:none;padding:0 6px}' +
      '#t532 .r .mv button{height:14px;line-height:12px;font-size:9px}' +
      '#t532 .r .eye[data-on="0"]{opacity:.55}' +
      '#t532 .addrow{display:flex;gap:8px;align-items:center;margin:8px 0 4px;flex-wrap:wrap}' +
      '#t532 .addrow input,#t532 .addrow select{height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.25);color:#f1ede4;font:600 12.5px system-ui;padding:0 8px}' +
      '#t532 .addrow .add{background:#c9a54a;border-color:#c9a54a;color:#14120f;font-weight:800;padding:0 12px;cursor:pointer}' +
      '#t532 .ft{display:flex;gap:10px;align-items:center;padding:12px 18px;border-top:1px solid rgba(255,255,255,.12)}' +
      '#t532 .ft .sp{flex:1}' +
      '#t532 .ft button{height:38px;padding:0 16px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#f1ede4;font:800 13px system-ui;cursor:pointer}' +
      '#t532 .ft button.ok{background:#c9a54a;border-color:#c9a54a;color:#14120f}' +
      '#t532 .ft button.rst{font-weight:600;font-size:12px;color:rgba(255,255,255,.7)}';
    document.head.appendChild(st);
  }

  function ikon(el, d, erMerki) {
    el.innerHTML = '';
    try {
      if (TT() && TT().teiknaISpan) { TT().teiknaISpan(el, erMerki ? d : { id: d.id, stutt: d.stutt }); if (el.firstChild) { if (erMerki && d.litur) el.style.background = d.litur; return; } }
    } catch (_) {}
    el.textContent = d.stutt || stuttAf(d.nafn);
    if (erMerki && d.litur) el.style.background = d.litur;
  }

  function rodHtml(d, i, n, erMerki) {
    return '<div class="r" data-i="' + i + '" data-falid="' + (d.falid ? 1 : 0) + '">' +
      '<span class="ico"></span>' +
      '<input type="text" class="nafn" value="' + esc(d.nafn || '') + '" placeholder="Heiti">' +
      (erMerki ? '<input type="color" class="lit" value="' + esc(/^#[0-9a-f]{6}$/i.test(d.litur || '') ? d.litur : '#c93c1d') + '" title="Litur">' : '') +
      (erMerki && d._ny ? '<select class="gly" title="Íkon">' + GLYFF.map(g => '<option value="' + g + '"' + (d.glyff === g ? ' selected' : '') + '>' + esc(GLYFF_NOFN[g] || g) + '</option>').join('') + '</select>' : '') +
      '<span class="mv"><button type="button" class="up" ' + (i === 0 ? 'disabled style="opacity:.3"' : '') + '>▲</button><button type="button" class="dn" ' + (i === n - 1 ? 'disabled style="opacity:.3"' : '') + '>▼</button></span>' +
      '<button type="button" class="eye" data-on="' + (d.falid ? 0 : 1) + '" title="Sýna / fela í ræmunni">' + (d.falid ? '🚫' : '👁') + '</button>' +
      (d._ny ? '<button type="button" class="x" title="Eyða þessu tákni">✕</button>' : '') +
      '</div>';
  }

  function render(ov, M) {
    const bd = ov.querySelector('.bd');
    bd.innerHTML =
      '<h3>Búnaður (tæki sem þú setur á teikninguna)</h3>' +
      '<div class="sk">Dragðu á teikninguna. Ný tákn tengjast tegundinni svo þau birtast rétt og teljast rétt.</div>' +
      '<div data-sec="bun">' + M.bun.map((d, i) => rodHtml(d, i, M.bun.length, false)).join('') + '</div>' +
      '<div class="addrow" data-add="bun"><input type="text" class="n-nafn" placeholder="Heiti nýs tákns" style="flex:1;min-width:120px">' +
      '<select class="n-teg">' + TEGUNDIR.map(t => '<option value="' + esc(t) + '">' + esc(t) + '</option>').join('') + '</select>' +
      '<button type="button" class="add">+ Bæta við</button></div>' +
      '<h3>Merki (skilti og tákn)</h3>' +
      '<div class="sk">ÚT-skilti, slöngumerki, rafmagn o.fl. Má fela, endurnefna, lita og raða.</div>' +
      '<div data-sec="mer">' + M.mer.map((d, i) => rodHtml(d, i, M.mer.length, true)).join('') + '</div>' +
      '<div class="addrow" data-add="mer"><input type="text" class="n-nafn" placeholder="Heiti nýs merkis" style="flex:1;min-width:110px">' +
      '<input type="color" class="n-lit" value="#c93c1d" title="Litur">' +
      '<select class="n-gly" title="Íkon">' + GLYFF.map(g => '<option value="' + g + '">' + esc(GLYFF_NOFN[g] || g) + '</option>').join('') + '</select>' +
      '<button type="button" class="add">+ Bæta við</button></div>' +
      '<h3>Aðgerðartakkar (hvað sést á stikunni)</h3>' +
      '<div class="sk">Hakað = sést efst í teikniglugganum. Afhakað fer í „Nánar ▾".</div>' +
      '<div data-sec="takkar">' + M.takkar.map((t, i) =>
        '<div class="r" data-i="' + i + '"><span class="ico" style="background:rgba(255,255,255,.12)">⚙</span>' +
        '<div style="flex:1"><b>' + esc(t.nafn) + '</b></div>' +
        '<button type="button" class="eye" data-on="' + (t.synt ? 1 : 0) + '" title="Sýna á stikunni">' + (t.synt ? '👁' : '🚫') + '</button></div>').join('') +
      '</div>';
    bd.querySelectorAll('[data-sec="bun"] .r').forEach(r => ikon(r.querySelector('.ico'), M.bun[+r.dataset.i], false));
    bd.querySelectorAll('[data-sec="mer"] .r').forEach(r => ikon(r.querySelector('.ico'), M.mer[+r.dataset.i], true));
  }

  function opna() {
    css();
    let ov = document.getElementById('t532-bak');
    if (ov) ov.remove();
    const M = byggja();
    ov = document.createElement('div'); ov.id = 't532-bak';
    ov.innerHTML = '<div id="t532" role="dialog" aria-modal="true">' +
      '<div class="hd"><h2>Teikningastillingar</h2><button type="button" class="loka">Loka</button></div>' +
      '<div class="bd"></div>' +
      '<div class="ft"><button type="button" class="rst">Endurstilla sjálfgefið</button><span class="sp"></span>' +
      '<button type="button" class="hætta">Hætta við</button><button type="button" class="ok">Vista</button></div></div>';
    document.body.appendChild(ov);
    render(ov, M);

    const loka = () => { ov.remove(); };
    ov.addEventListener('click', e => { if (e.target === ov) loka(); });
    ov.querySelector('.loka').addEventListener('click', loka);
    ov.querySelector('.hætta').addEventListener('click', loka);

    // listi sem röðin er lesin af: 'bun' | 'mer'
    const listi = sec => sec === 'bun' ? M.bun : M.mer;
    ov.querySelector('.bd').addEventListener('input', e => {
      const r = e.target.closest('.r'); if (!r) return; const sec = r.closest('[data-sec]'); if (!sec) return;
      const arr = sec.getAttribute('data-sec'); if (arr === 'takkar') return;
      const d = listi(arr)[+r.dataset.i]; if (!d) return;
      if (e.target.classList.contains('nafn')) { d.nafn = e.target.value; }
      if (e.target.classList.contains('lit')) { d.litur = e.target.value; const ic = r.querySelector('.ico'); if (ic) ikon(ic, d, true); }
      if (e.target.classList.contains('gly')) { d.glyff = e.target.value; const ic = r.querySelector('.ico'); if (ic) ikon(ic, d, true); }
    });
    ov.querySelector('.bd').addEventListener('click', e => {
      const r = e.target.closest('.r'); if (!r) return; const sec = r.closest('[data-sec]'); if (!sec) return;
      const secN = sec.getAttribute('data-sec'), i = +r.dataset.i;
      if (secN === 'takkar') {
        if (e.target.closest('.eye')) { M.takkar[i].synt = !M.takkar[i].synt; render(ov, M); }
        return;
      }
      const arr = listi(secN);
      if (e.target.closest('.up') && i > 0) { const t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; render(ov, M); return; }
      if (e.target.closest('.dn') && i < arr.length - 1) { const t = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = t; render(ov, M); return; }
      if (e.target.closest('.eye')) { arr[i].falid = !arr[i].falid; render(ov, M); return; }
      if (e.target.closest('.x') && arr[i] && arr[i]._ny) { arr.splice(i, 1); render(ov, M); return; }
    });
    ov.querySelector('.bd').addEventListener('click', e => {
      const add = e.target.closest('.add'); if (!add) return;
      const box = add.closest('.addrow'); if (!box) return;
      const nafn = (box.querySelector('.n-nafn').value || '').trim();
      if (!nafn) { box.querySelector('.n-nafn').focus(); return; }
      const id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      if (box.getAttribute('data-add') === 'mer') {
        M.mer.push({ _ny: true, id, nafn, stutt: stuttAf(nafn), litur: box.querySelector('.n-lit').value, glyff: box.querySelector('.n-gly').value, falid: false });
      } else {
        M.bun.push({ _ny: true, id, nafn, stutt: stuttAf(nafn), tegund: box.querySelector('.n-teg').value, falid: false });
      }
      render(ov, M);
    });

    ov.querySelector('.rst').addEventListener('click', () => {
      vista('teikning.bunadur', {}); vista('teikning.merki', {});
      try { if (TM() && TM().endurteikna) TM().endurteikna(); } catch (_) {}
      loka();
      try { if (window.Toast && Toast.show) Toast.show('Táknasafn endurstillt á sjálfgefið.'); } catch (_) {}
    });

    ov.querySelector('.ok').addEventListener('click', () => {
      const sj = (TM() && TM().sjalfgefid) || { merki: [], bunadur: [] };
      const smida = (arr, DEF, erMerki) => {
        const defId = new Set((DEF || []).map(d => d.id)), defMap = {}; (DEF || []).forEach(d => { defMap[d.id] = d; });
        const yf = { rod: arr.map(d => d.id), falin: arr.filter(d => d.falid).map(d => d.id), breytt: {}, ny: [] };
        arr.forEach(d => {
          if (d._ny || !defId.has(d.id)) {
            yf.ny.push(erMerki
              ? { id: d.id, nafn: d.nafn, stutt: d.stutt || stuttAf(d.nafn), litur: d.litur, glyff: d.glyff }
              : { id: d.id, nafn: d.nafn, stutt: d.stutt || stuttAf(d.nafn), tegund: d.tegund });
            return;
          }
          const b = {}, base = defMap[d.id] || {};
          if ((d.nafn || '') !== (base.nafn || '')) b.nafn = d.nafn;
          if ((d.stutt || '') !== (base.stutt || '')) b.stutt = d.stutt;
          if (erMerki && (d.litur || '') !== (base.litur || '')) b.litur = d.litur;
          if (Object.keys(b).length) yf.breytt[d.id] = b;
        });
        return yf;
      };
      vista('teikning.bunadur', smida(M.bun, sj.bunadur, false));
      vista('teikning.merki', smida(M.mer, sj.merki, true));
      try { if (window.TeiknTakkar && TeiknTakkar.setFestir) TeiknTakkar.setFestir(M.takkar.filter(t => t.synt).map(t => t.k)); } catch (_) {}
      try { if (TM() && TM().endurteikna) TM().endurteikna(); } catch (_) {}
      loka();
      try { if (window.Toast && Toast.show) Toast.show('Táknasafn vistað — gildir á öllum vélum.'); } catch (_) {}
    });
  }

  window.TeiknStillingar = { opna };
})();
