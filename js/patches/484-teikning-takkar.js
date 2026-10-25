/* === TEIKNING: TAKKASTIKAN — Nánar, + Hæð, skýringar og „Taka til baka“ (484) ==================
 *
 * Agnar 25.10.2026: „mátt fara yfir takkana uppi hvort eitthvað er tvítalið … óþarfi að sýna öll gæðin, frekar einn takka í horninu … hak merki hvort það sjáist á
 * skjá eða bara inni í Nánar“ · „má láta + sjá um eitthvað af þessu — en hvað þýðir sjálfvirkt, eða refresh-örin að sækja af þjóni, ég þori ekkert að ýta á þetta,
 * mætti sækja skýringar hvað gerist og leyfa að hætta við ef allt fer í bull“.
 *
 *  · Stikan sýnir aðeins það sem er hakað (sjálfgefið Skýrari veggir · Útlit fest · Opna í TurboPaint) + „Nánar ▾“. Gæðin (Forskoðun/Miðlungs/Full gæði) eru valin þar.
 *    Hakið í Nánar ræður hvað stendur á stikunni — valið vistast á þjóninum (Vidmot 'teikning.takkar', eins á öllum vélum). Smellt á nafn aðgerðar keyrir hana.
 *  · „+ Hæð“ opnar val: tóm hæð · sækja teikningu úr skjalasafni · finna allt húsið · hlaða upp mynd/PDF — hvert með einni línu um hvað gerist.
 *  · Sjálfvirkt · ↻ Sækja af þjóni · Finna allt húsið · Eyða hæð: fyrst gluggi sem segir HVAÐ GERIST og leyfir að hætta við. Hinar (nema ↻, sem skrifar ekkert) taka afrit
 *    af stöðunni á undan (minni + skrá í geymslu) og á eftir stendur borði „Taka til baka“ sem setur hæðirnar aftur eins og þær voru.
 * Gögn breytast aðeins þegar notandinn velur; engin vöktun í lykkju.
 * ================================================================================= */
(() => {
  if (window.__teiknTakkar) return;
  window.__teiknTakkar = true;

  const FP = () => window.FloorPlan;
  const KEY = 'teikning.takkar';
  const modal = () => document.getElementById('modal-floorplan');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const segja = (t, villa) => { try { if (window.showToast) showToast(t, !!villa); else if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  let bypass = null, UNDO = null;

  // aðgerðir stikunnar — sel finnur hnappinn í .fp-hd-grp; staerd = hvort gluggi með skýringu kemur á undan
  const TAKKAR = [
    { k: 'skyrari', sel: '.fp-hreinsa-btn', nafn: 'Skýrari veggir', lys: 'Gerir veggina skýrari í 3D — breytir engum gögnum.', def: true },
    { k: 'fest', sel: '.fp-fest-btn', nafn: 'Útlit fest', lys: 'Festir skurð og útlit hæðarinnar svo hún opnast alltaf eins.', def: true },
    { k: 'tp', sel: '.fp-tp-btn', nafn: 'Opna í TurboPaint', lys: 'Opnar hæðina í TurboPaint í nýjum flipa (teikna veggi, færa tæki). „Vista í úttekt“ þar kemur til baka hingað.', def: true },
    { k: 'saekja', sel: '.fp-saekja-btn', nafn: 'Sækja teikningu', lys: 'Sækir teikningu hússins úr skjalasafni sveitarfélagsins á þessa hæð.', def: false },
    { k: 'sjalf', sel: '.fp-tp-sjalf-btn', nafn: 'Sjálfvirkt', lys: 'TurboPaint keyrir allt verkferlið sjálft (veggi, hurðir, merki) — spyr fyrst.', def: false, skyr: 'sjalf' },
    { k: 'fah', sel: '.fp-fah-btn', nafn: 'Finna allt húsið', lys: 'Sækir öll gildandi blöð hússins og bætir við hæðum — spyr fyrst.', def: false, skyr: 'fah' },
    { k: 'greining', sel: '.fp-greining-btn', nafn: 'Greining fasteignar', lys: 'Opnar Greiningu fasteignar fyrir þennan stað.', def: false },
    { k: 'upp', sel: 'label.btn', nafn: 'Hlaða upp teikningu', lys: 'Velur JPG, PNG eða PDF úr tölvunni og setur á þessa hæð.', def: false, upp: true },
    { k: 'hreinsa', sel: '.fp-hd-grp > .btn-ghost', nafn: 'Hreinsa merki', lys: 'Eyðir öllum merkjum á hæðinni (spyr aftur).', def: false }
  ];
  const GAEDI = ['Forskoðun', 'Miðlungs', 'Full gæði'];

  /* ── stillingar (vistast á þjóni við raunverulegt val) ── */
  const festir = () => {
    try { const v = window.Vidmot ? Vidmot.lesa(KEY, null) : null; if (v && Array.isArray(v.festir)) return v.festir; } catch (_) {}
    return TAKKAR.filter(t => t.def).map(t => t.k);
  };
  const vistaFestir = a => { try { if (window.Vidmot) Vidmot.setja(KEY, { festir: a }); } catch (_) {} };

  function hnappur(d) {
    const g = document.querySelector('#modal-floorplan .fp-hd-grp'); if (!g) return null;
    if (d.upp) return [...g.querySelectorAll('label.btn')].find(l => /Hlaða upp/.test(l.textContent)) || null;
    return g.querySelector(d.sel);
  }

  function still() {
    if (document.getElementById('_t484-css')) return;
    const st = document.createElement('style'); st.id = '_t484-css';
    st.textContent = '' +
      '#modal-floorplan [data-t484-fal]{display:none!important}' +
      '#fp-t484-pop{position:fixed;z-index:80;min-width:300px;max-width:min(380px,calc(100vw - 16px));max-height:calc(100vh - 90px);overflow:auto;padding:10px;border-radius:12px;background:rgba(22,20,17,.98);border:1px solid rgba(255,255,255,.2);box-shadow:0 12px 32px rgba(0,0,0,.55);color:#f1ede4;font:600 12.5px system-ui,sans-serif}' +
      '#fp-t484-pop h4{margin:8px 2px 6px;font:700 10.5px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#c9c3b3}' +
      '#fp-t484-pop h4:first-child{margin-top:0}' +
      '#fp-t484-pop .g{display:flex;gap:4px;margin-bottom:6px}' +
      '#fp-t484-pop .g button{flex:1;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#f1ede4;font:700 12px system-ui;cursor:pointer}' +
      '#fp-t484-pop .g button.on{background:#c9a54a;border-color:#c9a54a;color:#14120f}' +
      '#fp-t484-pop .r{display:flex;align-items:flex-start;gap:9px;padding:7px 6px;border-radius:8px;cursor:pointer}' +
      '#fp-t484-pop .r:hover{background:rgba(255,255,255,.07)}' +
      '#fp-t484-pop .r input{margin-top:2px;width:16px;height:16px;accent-color:#c9a54a;flex:none;cursor:pointer}' +
      '#fp-t484-pop .r b{display:block;font:700 13px system-ui}' +
      '#fp-t484-pop .r span{display:block;font:500 11.5px/1.35 system-ui;color:#c9c3b3;margin-top:1px}' +
      '#fp-t484-pop .fot{margin:8px 2px 0;font:500 11px/1.35 system-ui;color:#a9a396}' +
      '#fp-t484-dlg{position:absolute;inset:0;z-index:90;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '#fp-t484-dlg .k{width:min(520px,100%);max-height:100%;overflow:auto;padding:16px 18px;border-radius:14px;background:#1b1916;border:1px solid rgba(255,255,255,.22);color:#f1ede4;font:500 13.5px/1.5 system-ui,sans-serif;box-shadow:0 16px 40px rgba(0,0,0,.6)}' +
      '#fp-t484-dlg h3{margin:0 0 8px;font:700 17px Playfair Display,Georgia,serif;color:#fff}' +
      '#fp-t484-dlg ol,#fp-t484-dlg ul{margin:6px 0 10px;padding-left:20px}' +
      '#fp-t484-dlg li{margin:3px 0}' +
      '#fp-t484-dlg .t{margin:10px 0 0;padding:8px 10px;border-radius:9px;background:rgba(201,165,74,.14);border:1px solid rgba(201,165,74,.4);font-size:12.5px}' +
      '#fp-t484-dlg .b{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}' +
      '#fp-t484-dlg .b button{height:38px;padding:0 16px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#f1ede4;font:700 13px system-ui;cursor:pointer}' +
      '#fp-t484-dlg .b button.ok{background:#c9a54a;border-color:#c9a54a;color:#14120f}' +
      '#fp-t484-undo{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 14px;border-radius:11px;background:rgba(27,25,22,.97);border:1px solid #c9a54a;color:#f1ede4;font:600 12.5px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.45);max-width:calc(100% - 20px)}' +
      '#fp-t484-undo button{height:30px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#f1ede4;font:700 12px system-ui;cursor:pointer;white-space:nowrap}' +
      '#fp-t484-undo button.ok{background:#c9a54a;border-color:#c9a54a;color:#14120f}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── stikan: aðeins hakað + „Nánar“ ── */
  function beita() {
    const g = document.querySelector('#modal-floorplan .fp-hd-grp'); if (!g) return;
    still();
    const f = new Set(festir());
    TAKKAR.forEach(d => { const b = hnappur(d); if (!b) return; const fal = !f.has(d.k); if (b.hasAttribute('data-t484-fal') !== fal) fal ? b.setAttribute('data-t484-fal', '1') : b.removeAttribute('data-t484-fal'); });
    const gae = document.getElementById('fp-gaedi'); if (gae && !gae.hasAttribute('data-t484-fal')) gae.setAttribute('data-t484-fal', '1');
    let nb = document.getElementById('fp-t484-nanar');
    const x = g.querySelector('.modal-x');
    if (!nb) {
      nb = document.createElement('button'); nb.type = 'button'; nb.id = 'fp-t484-nanar'; nb.className = 'btn btn-outline btn-sm'; nb.textContent = 'Nánar ▾';
      nb.title = 'Fleiri aðgerðir, gæði teikningarinnar og hvað stendur á stikunni';
      nb.addEventListener('click', e => { e.stopPropagation(); nanarVal(nb); });
    }
    if (nb.parentNode !== g || (x && nb.nextElementSibling !== x)) { if (x) g.insertBefore(nb, x); else g.appendChild(nb); }
  }

  function lokaPop() { const p = document.getElementById('fp-t484-pop'); if (p) p.remove(); }
  function pop(festaVid, html) {
    lokaPop();
    const m = modal(); if (!m) return null;
    const p = document.createElement('div'); p.id = 'fp-t484-pop'; p.innerHTML = html;
    m.appendChild(p);
    const r = festaVid.getBoundingClientRect(), pw = p.offsetWidth;
    p.style.top = Math.min(window.innerHeight - 60, r.bottom + 6) + 'px';
    p.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.right - pw)) + 'px';
    ['pointerdown', 'mousedown'].forEach(ev => p.addEventListener(ev, e => e.stopPropagation()));
    const lok = e => { if (p.contains(e.target) || festaVid.contains(e.target)) return; lokaPop(); document.removeEventListener('pointerdown', lok, true); };
    setTimeout(() => document.addEventListener('pointerdown', lok, true), 0);
    return p;
  }

  function keyra(d) {
    const b = hnappur(d); if (!b) { segja('Þessi aðgerð er ekki tiltæk núna.'); return; }
    if (d.upp) { const inp = b.querySelector('input[type=file]'); if (inp) inp.click(); return; }
    bypassClick(b, d.skyr);
  }
  // hnappur sem notandinn valdi úr valmynd: gluggi fyrst ef aðgerðin er varhugaverð
  function bypassClick(b, skyr) {
    const fara = () => { bypass = b; try { b.click(); } finally { setTimeout(() => { bypass = null; }, 0); } };
    if (skyr) skyring(skyr).then(v => { if (v) fara(); }); else fara();
  }

  function nanarVal(nb) {
    const g = document.querySelector('#modal-floorplan .fp-hd-grp'); if (!g) return;
    const gb = [...document.querySelectorAll('#fp-gaedi button')];
    const f = new Set(festir());
    const gaediH = gb.length ? '<h4>Gæði teikningarinnar</h4><div class="g">' + GAEDI.map((n, i) => '<button type="button" data-gaedi="' + i + '" class="' + (gb[i] && gb[i].classList.contains('on') ? 'on' : '') + '">' + n + '</button>').join('') + '</div>' : '';
    const rod = TAKKAR.filter(d => hnappur(d)).map(d => {
      const b = hnappur(d), nafn = (b.textContent || '').replace(/\s+/g, ' ').trim() || d.nafn;
      return '<div class="r" data-k="' + d.k + '"><input type="checkbox" data-pin="' + d.k + '" ' + (f.has(d.k) ? 'checked' : '') + ' title="Hakað = sést á stikunni"><div data-run="' + d.k + '"><b>' + esc(d.nafn === 'Útlit fest' ? nafn : d.nafn) + '</b><span>' + esc(d.lys) + '</span></div></div>';
    }).join('');
    const p = pop(nb, gaediH + '<h4>Aðgerðir</h4>' + rod + '<div class="fot">Hakið ræður hvað stendur á stikunni. Smelltu á nafn aðgerðar til að keyra hana.</div>');
    if (!p) return;
    p.addEventListener('click', e => {
      const q = e.target.closest('[data-gaedi]');
      if (q) { const i = +q.getAttribute('data-gaedi'); if (gb[i]) gb[i].click(); p.querySelectorAll('[data-gaedi]').forEach(x => x.classList.toggle('on', x === q)); return; }
      const pin = e.target.closest('[data-pin]');
      if (pin) { const k = pin.getAttribute('data-pin'), a = festir().filter(x => x !== k); if (pin.checked) a.push(k); vistaFestir(a); beita(); return; }
      const run = e.target.closest('[data-run]');
      if (run) { const d = TAKKAR.find(t => t.k === run.getAttribute('data-run')); lokaPop(); if (d) keyra(d); }
    });
  }

  /* ── „+ Hæð“ ── */
  function plusVal(btn) {
    const rod = [
      ['tom', 'Tóm hæð', 'Bætir við nýrri hæð án teikningar — þú sækir eða hleður upp teikningu á hana á eftir.'],
      ['saekja', 'Sækja teikningu úr skjalasafni', 'Leitar að aðaluppdráttum hússins hjá sveitarfélaginu og setur valið blað á þessa hæð.'],
      ['fah', 'Finna allt húsið', 'Sækir ÖLL gildandi grunnmyndablöð hússins og bætir við hæðum (spyr fyrst, tekur afrit).'],
      ['upp', 'Hlaða upp mynd eða PDF', 'Velur JPG, PNG eða PDF úr tölvunni og setur á hæðina.']
    ];
    const p = pop(btn, '<h4>Bæta við</h4>' + rod.map(r => '<div class="r" data-v="' + r[0] + '"><div><b>' + r[1] + '</b><span>' + r[2] + '</span></div></div>').join(''));
    if (!p) return;
    p.addEventListener('click', e => {
      const r = e.target.closest('[data-v]'); if (!r) return; const v = r.getAttribute('data-v'); lokaPop();
      if (v === 'tom') { bypass = btn; try { btn.click(); } finally { setTimeout(() => { bypass = null; }, 0); } return; }
      const d = TAKKAR.find(t => t.k === v); if (d) keyra(d);
    });
  }

  /* ── skýringargluggi ── */
  function gluggi(o) {
    return new Promise(res => {
      const m = modal(); if (!m) { res(null); return; }
      const e0 = document.getElementById('fp-t484-dlg'); if (e0) e0.remove();
      const d = document.createElement('div'); d.id = 'fp-t484-dlg';
      d.innerHTML = '<div class="k" role="dialog" aria-label="' + esc(o.titill) + '"><h3>' + esc(o.titill) + '</h3>' + o.html + '<div class="b">' + (o.takkar || []).map((t, i) => '<button type="button" data-i="' + i + '" class="' + (t[2] || '') + '">' + esc(t[0]) + '</button>').join('') + '</div></div>';
      const lok = v => { d.remove(); document.removeEventListener('keydown', esc2, true); res(v); };
      const esc2 = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); lok(null); } };
      d.addEventListener('click', ev => { const b = ev.target.closest('button[data-i]'); if (b) lok(o.takkar[+b.getAttribute('data-i')][1]); else if (ev.target === d) lok(null); });
      document.addEventListener('keydown', esc2, true);
      m.appendChild(d);
    });
  }

  const TEXTAR = {
    sjalf: {
      titill: 'Sjálfvirkt — hvað gerist?',
      html: '<p>TurboPaint keyrir allt verkferlið á hæðinni sjálft, án þess að þú gerir neitt:</p><ol><li>Núverandi staða hæðanna er <b>vistuð og afrituð</b> (til baka-takki birtist).</li><li>TurboPaint opnast í <b>nýjum flipa</b> og les teikninguna: bestu gæði, skurð að húsinu, veggi, hreinsun, hurðir, EI-merkingar og staðsetningu slökkvitækja og slangna — 2–4 mínútur.</li><li>Niðurstaðan vistast á hæðina og kemur hingað þegar þú ferð aftur í þennan flipa.</li></ol><div class="t">Getur breytt veggjum og merkjum hæðarinnar. Fari niðurstaðan í vitleysu: <b>Taka til baka</b> setur allt eins og það var.</div>',
      afrit: true, ok: 'Keyra Sjálfvirkt'
    },
    fah: {
      titill: 'Finna allt húsið — hvað gerist?',
      html: '<p>Sækir <b>öll gildandi grunnmyndablöð hússins</b> úr skjalasafni sveitarfélagsins og setur þau sem hæðir hér.</p><ul><li>Getur bætt við hæðum og breytt teikningum sem fyrir eru.</li><li>Staðsetningar tækja á hæðum sem haldast óbreyttar standa.</li></ul><div class="t">Staðan er afrituð á undan — <b>Taka til baka</b> kemur ef þetta fer ekki eins og þú vildir.</div>',
      afrit: true, ok: 'Finna allt húsið'
    },
    saekja: {
      titill: 'Sækja af þjóni (↻) — hvað gerist?',
      html: '<p>Sækir <b>nýjustu stöðu</b> hæðanna og merkjanna af þjóninum — það sem aðrar vélar eða TurboPaint hafa vistað síðan þú opnaðir gluggann.</p><ul><li><b>Skrifar ekkert</b> á þjóninn.</li><li>Breytingar sem þú hefur gert hér og ekki vistað <b>tapast</b> — veldu „Vista mínar fyrst“ ef þú vilt halda þeim.</li></ul>',
      takkar: [['Hætta við', null], ['Sækja (sleppa mínum óvistuðu)', 'sleppa'], ['Vista mínar fyrst og sækja', 'vista', 'ok']]
    },
    eyda: {
      titill: 'Eyða hæð — hvað gerist?',
      html: '<p>Eyðir virku hæðinni af þessum stað: <b>teikningunni, veggjunum og öllum merkjum á henni</b>.</p><div class="t">Staðan er afrituð á undan — <b>Taka til baka</b> kemur ef þetta var óvart.</div>',
      afrit: true, ok: 'Eyða hæðinni'
    }
  };
  function skyring(k) {
    const t = TEXTAR[k]; if (!t) return Promise.resolve(true);
    const takkar = t.takkar || [['Hætta við', null], [t.ok, 'ok', 'ok']];
    return gluggi({ titill: t.titill, html: t.html, takkar }).then(async v => {
      if (!v) return null;
      if (v === 'vista') { try { if (window.TeiknMerking && TeiknMerking.vistaAdThjoni) TeiknMerking.vistaAdThjoni(); } catch (_) {} await new Promise(r => setTimeout(r, 1800)); }
      if (t.afrit) await taka(k, t.titill.split(' —')[0]);
      return v;
    });
  }

  /* ── afrit og „Taka til baka“ ── */
  function nuna() {
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    const hs = (window.TeiknBord && TeiknBord.haedir && TeiknBord.haedir()) || [];
    return JSON.parse(JSON.stringify(hs, (k, v) => (k === 'pdfReynt' ? undefined : v)));
  }
  async function taka(k, heiti) {
    const F = FP(), cid = F && F.companyId; if (!cid) return;
    const hs = nuna(); if (!hs.length) return;
    UNDO = { cid, hs, heiti, kl: Date.now() };
    try {
      const slod = 'teikning-afrit/' + cid + '/' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + k + '.json';
      const blob = new Blob([JSON.stringify({ company_id: cid, haedir: hs, heiti, kl: new Date().toISOString() })], { type: 'application/json' });
      if (window.DB && DB.sb) DB.sb.storage.from('turbopaint').upload(slod, blob, { contentType: 'application/json', upsert: true }).then(r => { if (r && r.error) console.warn('[484] afrit í geymslu', r.error.message); }, () => {});
      UNDO.slod = slod;
    } catch (_) {}
    synaBordann();
  }
  function synaBordann() {
    const main = document.getElementById('fp-main'); if (!main || !UNDO) return;
    let b = document.getElementById('fp-t484-undo');
    if (!b) {
      b = document.createElement('div'); b.id = 'fp-t484-undo';
      b.addEventListener('click', e => {
        const t = e.target.closest('button[data-u]'); if (!t) return;
        if (t.getAttribute('data-u') === 'loka') { b.remove(); return; }
        takaTilBaka(b);
      });
      ['pointerdown', 'mousedown'].forEach(ev => b.addEventListener(ev, e => e.stopPropagation()));
      main.appendChild(b);
    }
    b.innerHTML = '<span>' + esc(UNDO.heiti) + ' — staðan fyrir var afrituð.</span><button type="button" class="ok" data-u="til">↩ Taka til baka</button><button type="button" data-u="loka" aria-label="Loka">✕</button>';
  }
  async function takaTilBaka(b) {
    const U = UNDO; if (!U || !window.DB || !DB.sb || !window.TeiknVistun) return;
    const ok = await gluggi({ titill: 'Taka til baka', html: '<p>Setur hæðirnar og merkin <b>aftur eins og þau voru</b> áður en „' + esc(U.heiti) + '“ var keyrt. Það sem gerðist á milli (t.d. í TurboPaint) hverfur.</p>', takkar: [['Hætta við', null], ['Taka til baka', 'ok', 'ok']] });
    if (!ok) return;
    try {
      const r = await DB.sb.from('teikning_bord').select('haedir,updated_at').eq('company_id', U.cid).limit(1);
      const f = r && !r.error && r.data && r.data[0];
      if (f && TeiknVistun.sja) TeiknVistun.sja(U.cid, f.updated_at, f.haedir);        // „séð hér“ — skrifa sameinar þá ekki heldur setur afritið
      const hs = JSON.parse(JSON.stringify(U.hs));
      const w = await TeiknVistun.skrifa(U.cid, { company_id: U.cid, markers: (hs[0] && hs[0].markers) || [], image_url: (hs[0] && hs[0].image_url) || null, haedir: hs, updated_at: new Date().toISOString() });
      if (w && w.error) throw w.error;
      segja('↩ Tekið til baka — hæðirnar eru eins og þær voru.');
      UNDO = null; if (b) b.remove();
      const sb = document.querySelector('#fp-haedir [data-h="saekja"]'); if (sb) { bypass = sb; try { sb.click(); } finally { setTimeout(() => { bypass = null; }, 0); } }
    } catch (e) { segja('⚠ Náði ekki að taka til baka: ' + ((e && e.message) || e), true); }
  }

  /* ── hlustarar (handtaka áður en upprunalegu hlustararnir keyra) ── */
  function tengja() {
    const m = modal(); if (!m || m.__t484) return !!(m && m.__t484);
    m.__t484 = true;
    m.addEventListener('click', e => {
      if (bypass) return;
      const t = e.target.closest && e.target.closest('button,label'); if (!t) return;
      const h = t.getAttribute && t.getAttribute('data-h');
      if (t.closest('#fp-haedir') && h === 'ny') { e.preventDefault(); e.stopPropagation(); plusVal(t); return; }
      if (t.closest('#fp-haedir') && (h === 'saekja' || h === 'eyda')) { e.preventDefault(); e.stopPropagation(); skyring(h).then(v => { if (v) { bypass = t; try { t.click(); } finally { setTimeout(() => { bypass = null; }, 0); } } }); return; }
      const d = TAKKAR.find(q => q.skyr && t.matches(q.sel) && t.closest('.fp-hd-grp'));
      if (d) { e.preventDefault(); e.stopPropagation(); skyring(d.skyr).then(v => { if (v) { bypass = t; try { t.click(); } finally { setTimeout(() => { bypass = null; }, 0); } } }); }
    }, true);
    return true;
  }

  function tikk() { try { const m = modal(); if (!m || !m.classList.contains('open')) return; tengja(); beita(); } catch (e) { console.warn('[484]', e && e.message); } }
  setInterval(tikk, 1200);
  window.TeiknTakkar = { tikk, festir, takaTilBaka: () => takaTilBaka(document.getElementById('fp-t484-undo')) };
})();
