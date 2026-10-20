/* === 467 — HLEÐSLUSPÁ-SPJALDIÐ (var 465 til 14.10 kl. 01 — 465-djupdvali.js kom sama kvöld úr annarri lotu, númerið gefið eftir) á fyrirtækjasíðunni (14.10.2026) ==============
 *
 * Agnar 13.10.2026: „register how many tæki was yfirfarin, hlaðin, ný í duft og léttvatn og kolsýru per year so we
 * can determine when and how many we need to hlaða each visit.. but hlaða is every 5 years" — og svo: „try to make
 * it into compact tablet that can be seen somewhere on the company profile and later in the driver apps".
 * 14.10 (v2): „Myndi helst bara að hvert fyrirtæki myndi bara sækja úr þessum gagnagrunni og verða að lítilli
 * compact töflu inn í company profile" — reitirnir urðu að TVEIMUR litlum töflum: saga eftir árum (yfirfarin ·
 * hlaðin · ný · heimild) og næsta heimsókn eftir tegund (tæki · hlaðin/ný 5 ár · til hleðslu).
 *
 * Gögnin: viewið `v_hledsluspa` (ein röð per stað: virk tæki per tegund úr uttaeki, hlaðin/ný síðustu 5 ár úr
 * `thjonustusaga`, til_hledslu = mismunurinn, elsta_heimild) og `thjonustusaga` (ár fyrir ár: yfirfarin · hlaðin ·
 * ný · tæki á staðnum skv. skýrslu · heimild · tilvísun). Hvort tveggja fyllt af tools/thjonustusaga.cjs — sjá sql/2026-10-13_thjonustusaga.sql.
 * Þetta spjald LES AÐEINS.
 *
 * Staðsetning: eitt stálspjald í fullri breidd beint fyrir ofan tækjadálkana (.uttekt-cols) — þar sem tækin sjálf
 * byrja. Hnúturinn er okkar; 129 teiknar prófílinn með sameiningu (aðskotahnútar standa), svo spjaldið lifir
 * endurteikningar og er aðeins fært þegar .uttekt-cols er endurgerð. Fyrirtækið breytist → sama hnútur, ný gildi;
 * töflubúkarnir eru aðeins endurgerðir þegar strengurinn þeirra breytist. Hæðin er tekin frá (min-height) áður en
 * gögnin koma — ekkert hopp. 462 (stöðug opnun) kallar tick() í sama tifi og borðinn.
 *
 * Fyrir bílstjóra-appið síðar: `Hledsluspa.saekja(fid)` skilar {spa, saga} og `Hledsluspa.lina(fid)` skilar einni
 * línu („12 til hleðslu · L 15 · D 2 · CO₂ 0 · síðast hlaðið 2026") þegar gögnin eru komin — 219 getur notað hana á stoppi.
 */
(() => {
  'use strict';
  if (window.Hledsluspa) return;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const LINE = 'background:#fff;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = () => (window.DB && DB.sb) || null;
  const AR = new Date().getFullYear();
  const OPIN_LYKILL = 'profill.hledsluspaOpin';
  const erOpin = () => { try { return !!(window.Vidmot && Vidmot.lesa(OPIN_LYKILL, false) === true); } catch (_) { return false; } };
  const stillaOpin = (el) => {
    const o = erOpin() ? '1' : '0'; if (el.dataset.opin !== o) el.dataset.opin = o;
    const b = el.querySelector('.hsp-hnapp'); if (b) { b.setAttribute('aria-expanded', o === '1' ? 'true' : 'false'); b.title = o === '1' ? 'Loka Hleðsluspá' : 'Opna Hleðsluspá'; }
  };

  const css = [
    '.hsp{background:#fff;border:1px solid #000;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px -16px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.25);margin:0 0 16px;min-height:150px;font-family:' + SANS + ';color:#141822;box-sizing:border-box;container-type:inline-size}',
    '.hsp[hidden]{display:none}',
    // 20.10.2026 (Agnar: „hafa hleðsluspá bara default collapsed"): lokað sjálfgefið — hausinn (heimsókn, til hleðslu) sést,
    // taflan opnast með smelli; valið fer á þjóninn (Vidmot, ekki tækið)
    '.hsp[data-opin="0"]{min-height:0}',
    '.hsp[data-opin="0"] .hsp-buk{display:none}',
    '.hsp[data-opin="0"] .hsp-haus{border-bottom:0}',
    '.hsp-haus{cursor:pointer}',
    '.hsp-hnapp{flex:none;width:26px;height:26px;margin-left:2px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgba(255,255,255,.22)!important;background:rgba(255,255,255,.08)!important;color:#fff!important;cursor:pointer;box-shadow:none!important}',
    '.hsp-hnapp svg{transition:transform .15s}',
    '.hsp[data-opin="1"] .hsp-hnapp svg{transform:rotate(180deg)}',
    '.hsp-haus{position:relative;background:' + METAL + ';min-height:46px;padding:5px 16px 5px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000;box-sizing:border-box}',
    '.hsp-haus::before,.hsp-haus::after{content:"";position:absolute;top:50%;margin-top:-3px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.6);pointer-events:none}',
    '.hsp-haus::before{left:7px}.hsp-haus::after{right:7px}',
    '.hsp-led{width:8px;height:8px;border-radius:50%;flex:none;background:#8f98a8;box-shadow:0 0 0 1px rgba(0,0,0,.5)}',
    '.hsp-led[data-t="raudt"]{background:#e25555;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 8px rgba(226,85,85,.7)}',
    '.hsp-led[data-t="graent"]{background:#1f9d57;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 8px rgba(31,157,87,.6)}',
    '.hsp-led[data-t="gult"]{background:#b8912f;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 8px rgba(184,145,47,.6)}',
    '.hsp-t{font-size:15px;font-weight:600;text-shadow:0 1px 1px rgba(0,0,0,.6);white-space:nowrap}',
    '.hsp-plata{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;text-shadow:none}',
    '.hsp-plata[data-t="gult"]{color:#845400}',
    '.hsp-tala{margin-left:auto;display:flex;align-items:baseline;gap:8px;white-space:nowrap}',
    '.hsp-tala b{font-family:' + DISPLAY + ';font-size:30px;font-weight:800;line-height:1;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7);font-variant-numeric:lining-nums}',
    '.hsp-tala small{font-family:' + DISPLAY + ';font-size:14px;font-weight:700;color:rgba(255,255,255,.85)}',
    // búkur: tvær litlar töflur á stálplötu — saga eftir árum · næsta heimsókn eftir tegund
    '.hsp-buk{padding:10px 12px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:10px;align-items:start;background:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)}',
    '.hsp-tb{' + LINE + ';overflow:hidden;min-width:0}',
    '.hsp-tb table{width:100%;border-collapse:collapse;font-family:' + MONO + ';font-size:11.5px;font-variant-numeric:tabular-nums;table-layout:auto}',
    '.hsp-tb thead th{background:' + METAL + ';color:rgba(255,255,255,.82);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:6px 9px;text-align:right;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
    '.hsp-tb thead th:first-child{text-align:left}',
    '.hsp-tb tbody td{padding:5px 9px;border-bottom:1px solid #edf0f4;text-align:right;white-space:nowrap;color:#141822;line-height:1.3}',
    '.hsp-tb tbody tr:last-child td{border-bottom:0}',
    '.hsp-tb tbody td:first-child{text-align:left;font-family:' + SANS + ';font-weight:700;font-size:12px}',
    '.hsp-tb tbody td.hsp-dauft{color:#aab1bb}',
    '.hsp-tb tbody td b{font-weight:700}',
    '.hsp-tb tbody tr.hsp-nu td{background:#f3f5f8}',
    '.hsp-tb tbody tr.hsp-alls td{font-weight:700;border-top:1px solid rgba(20,24,34,.16);background:#f7f8fa}',
    '.hsp-tb tbody td.hsp-stor{font-family:' + DISPLAY + ';font-size:17px;font-weight:800;line-height:1}',
    '.hsp-tb td.hsp-heim{font-size:10.5px;color:#525b6b;max-width:150px;overflow:hidden;text-overflow:ellipsis}',
    '.hsp-teg{display:inline-flex;align-items:center;gap:6px}',
    '.hsp-teg i{width:9px;height:9px;border-radius:2px;flex:none;display:inline-block;background:var(--hsp-teg,#8f98a8)}',
    '.hsp-teg[data-teg="lettvatn"]{--hsp-teg:#2f7fd4}.hsp-teg[data-teg="duft"]{--hsp-teg:#c9372c}.hsp-teg[data-teg="co2"]{--hsp-teg:#3a3a41}',
    '.hsp-tomt{padding:10px 12px;font-family:' + MONO + ';font-size:11px;color:#525b6b}',
    '.hsp-ath{grid-column:1 / -1;font-family:' + MONO + ';font-size:10.5px;color:#525b6b;padding:0 2px}',
    // sími / app (980 px): spjaldið er sjálft ílát — töflurnar stafla sér undir 640 px
    '@container (max-width:640px){.hsp-buk{grid-template-columns:minmax(0,1fr)}.hsp-t{font-size:13.5px}.hsp-tala b{font-size:24px}}'
  ].join('\n');
  const st = document.createElement('style'); st.id = 'hledsluspa-467'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // ---------------------------------------------------------------- gögn
  const minni = new Map();     // fid → { spa, saga } | { villa }
  const bid = new Map();       // fid → Promise
  async function saekja(fid) {
    fid = +fid; if (!fid) return null;
    if (minni.has(fid)) return minni.get(fid);
    if (bid.has(fid)) return bid.get(fid);
    const SB = sb(); if (!SB) return null;
    const p = (async () => {
      try {
        const [a, b] = await Promise.all([
          SB.from('v_hledsluspa').select('*').eq('fyrirtaeki_id', fid).limit(1),
          SB.from('thjonustusaga').select('ar,tegund,yfirfarin,hladin,ny,taeki,heimild,tilvisun').eq('fyrirtaeki_id', fid).order('ar')
        ]);
        if (a.error || b.error) throw new Error((a.error || b.error).message);
        const r = { spa: (a.data && a.data[0]) || null, saga: b.data || [] };
        minni.set(fid, r); return r;
      } catch (e) {
        // villa festist ekki í minninu sem „engin saga" — næsta tikk reynir aftur
        return { villa: String(e && e.message || e) };
      } finally { bid.delete(fid); }
    })();
    bid.set(fid, p); return p;
  }
  // ár fyrir ár: summur yfir tegundir (heimildir eru útilokandi per ár, sjá tólið) + stysta tilvísunin sem segir hvaðan
  const HEIMILD_RD = { sala: 0, reikningur: 1, skyrslutexti: 2, skyrsla: 3 };
  function arin(saga) {
    const o = {};
    (saga || []).forEach(r => {
      const a = o[r.ar] = o[r.ar] || { ar: r.ar, yf: 0, hl: 0, ny: 0, heimild: null, tilv: null, _taeki: {} };
      a.yf += +r.yfirfarin || 0; a.hl += +r.hladin || 0; a.ny += +r.ny || 0;
      // heildarfjöldi: skýrslutalan er stimpluð á allar heimildaraðir sama árs/tegundar → max per tegund, ekki summa
      if (r.taeki != null) a._taeki[r.tegund] = Math.max(a._taeki[r.tegund] || 0, +r.taeki);
      if (a.heimild == null || HEIMILD_RD[r.heimild] < HEIMILD_RD[a.heimild]) { a.heimild = r.heimild; a.tilv = r.tilvisun; }
    });
    return Object.values(o).map(a => { const k = Object.keys(a._taeki); a.taeki = k.length ? k.reduce((s, t) => s + a._taeki[t], 0) : null; a.taekiAaetlad = a.taeki == null ? a.yf + a.hl + a.ny : null; return a; }).sort((x, y) => x.ar - y.ar);
  }
  // heimildin á mannamáli: reikningsnúmer þegar það er til, annars „skýrsla"
  function heimildTexti(a) {
    if (a.heimild === 'sala' || a.heimild === 'reikningur') { const m = String(a.tilv || '').match(/R-\d+|\b\d{5,6}\b/); return m ? m[0] : (a.heimild === 'sala' ? 'sala' : 'reikningur'); }
    return a.heimild === 'skyrslutexti' ? 'skýrsla (texti)' : 'skýrsla';
  }
  // LISTAR (bílstjóra-appið, 466): spáin ein fyrir marga staði í einu — ein sókn per 200 staði, aðskilið minni svo
  // prófílspjaldið (sem þarf líka söguna) rugli ekki saman „spá án sögu" og „engin saga".
  const spar = new Map(); const sparBid = new Set();
  async function saekjaSpar(ids) {
    ids = Array.from(new Set((ids || []).map(Number).filter(i => i && !spar.has(i) && !sparBid.has(i))));
    if (!ids.length) return; const SB = sb(); if (!SB) return;
    ids.forEach(i => sparBid.add(i));
    try {
      for (let i = 0; i < ids.length; i += 200) {
        const b = ids.slice(i, i + 200);
        const r = await SB.from('v_hledsluspa').select('fyrirtaeki_id,stada,naesta_heimsokn,taeki,taeki_lettvatn,taeki_duft,taeki_co2,nyleg_lettvatn,nyleg_duft,nyleg_co2,nyleg_oskilgreint,til_hledslu,til_hledslu_lettvatn,til_hledslu_duft,til_hledslu_co2,sidasta_hledsla,elsta_heimild,ath').in('fyrirtaeki_id', b);
        if (r.error) throw new Error(r.error.message);
        (r.data || []).forEach(s => spar.set(+s.fyrirtaeki_id, s));
        b.forEach(i => { if (!spar.has(i)) spar.set(i, null); });   // staður án raðar í viewinu = engin gögn (ekki villa)
      }
    } catch (_) { /* villa festist ekki — næsta kall reynir aftur */ } finally { ids.forEach(i => sparBid.delete(i)); }
  }
  // spáin fyrir einn stað úr hvoru minninu sem er: undefined = ekki sótt enn, null = engin gögn
  function spa(fid) { fid = +fid; const r = minni.get(fid); if (r && r.spa) return r.spa; return spar.has(fid) ? spar.get(fid) : undefined; }
  function lina(fid) {
    const s = spa(fid); if (!s) return '';
    return s.til_hledslu + ' til hleðslu · L ' + s.til_hledslu_lettvatn + ' · D ' + s.til_hledslu_duft + ' · CO₂ ' + s.til_hledslu_co2 + (s.sidasta_hledsla ? ' · síðast hlaðið ' + s.sidasta_hledsla : ' · aldrei skráð hleðsla');
  }

  // ---------------------------------------------------------------- spjaldið
  function skel() {
    const el = document.createElement('section');
    el.className = 'hsp'; el.id = '_hsp-spjald'; el.setAttribute('aria-label', 'Hleðsluspá');
    el.innerHTML =
      '<div class="hsp-haus"><i class="hsp-led" aria-hidden="true"></i><span class="hsp-t">Hleðsluspá</span>' +
        '<span class="hsp-plata hsp-heimsokn" title="Hlaðið á 5 ára fresti: tæki sem var hlaðið eða selt nýtt árið Y kemur í hleðslu árið Y+5"></span>' +
        '<span class="hsp-plata hsp-sidast" hidden></span>' +
        '<span class="hsp-plata hsp-mork" data-t="gult" hidden></span>' +
        '<div class="hsp-tala"><b>—</b><small>til hleðslu</small></div>' +
        '<button type="button" class="hsp-hnapp" aria-label="Opna eða loka Hleðsluspá"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>' +
      '<div class="hsp-buk">' +
        '<div class="hsp-tb hsp-saga"><table><thead><tr><th>Ár</th><th>Tæki</th><th>Yfirfarin</th><th>Hlaðin</th><th>Ný</th><th>Heimild</th></tr></thead><tbody></tbody></table></div>' +
        '<div class="hsp-tb hsp-teg-tb"><table><thead><tr><th>Næsta heimsókn</th><th>Tæki</th><th>Hlaðin/ný 5 ár</th><th>Til hleðslu</th></tr></thead><tbody></tbody></table></div>' +
        '<div class="hsp-ath"></div>' +
      '</div>';
    stillaOpin(el);
    el.querySelector('.hsp-haus').addEventListener('click', () => {
      try { if (window.Vidmot) Vidmot.setja(OPIN_LYKILL, !erOpin()); } catch (_) {}
      stillaOpin(el);
    });
    return el;
  }
  const setT = (el, sel, v) => { const n = el.querySelector(sel); if (n && n.textContent !== String(v)) n.textContent = String(v); };
  const setB = (el, sel, html) => { const n = el.querySelector(sel); if (n && n.dataset.html !== html) { n.dataset.html = html; n.innerHTML = html; } };
  const tala = (v, dauft) => '<td' + (dauft || !v ? ' class="hsp-dauft"' : '') + '>' + (v || '—') + '</td>';
  const tegH = (teg, heiti) => '<td><span class="hsp-teg" data-teg="' + teg + '"><i aria-hidden="true"></i>' + heiti + '</span></td>';

  function fylla(el, fid, r) {
    el.dataset.fid = String(fid);
    if (!r) return;                                                   // enn að sækja — beinagrindin stendur
    if (r.villa) { setT(el, '.hsp-heimsokn', 'engin tenging'); return; }
    const s = r.spa, led = el.querySelector('.hsp-led'), mork = el.querySelector('.hsp-mork'), sid = el.querySelector('.hsp-sidast');
    if (!s) { setT(el, '.hsp-tala b', '—'); setT(el, '.hsp-heimsokn', 'engin gögn'); led.dataset.t = ''; return; }
    const heimsokn = s.naesta_heimsokn || AR;
    setT(el, '.hsp-heimsokn', 'Heimsókn ' + heimsokn + ' · ' + (s.stada || ''));
    setT(el, '.hsp-tala b', s.taeki ? s.til_hledslu : '—');
    led.dataset.t = !s.taeki ? '' : s.til_hledslu === 0 ? 'graent' : (s.til_hledslu >= Math.max(5, s.taeki * 0.5) ? 'raudt' : 'gult');
    sid.hidden = !s.sidasta_hledsla; if (s.sidasta_hledsla) { sid.textContent = 'Síðast hlaðið ' + s.sidasta_hledsla + ' · næst ' + (s.sidasta_hledsla + 5); }
    const efri = !!(s.ath && /efri mörk|engin saga/.test(s.ath));
    mork.hidden = !efri; if (efri) { mork.textContent = s.elsta_heimild ? 'Efri mörk · saga frá ' + s.elsta_heimild : 'Engin saga'; mork.title = s.ath; }
    // SAGA — ein röð per ár (yfirstandandi ár grátt), heimildin aftast
    const ar = arin(r.saga);
    setB(el, '.hsp-saga tbody', ar.length
      ? ar.map(a => '<tr' + (a.ar === AR ? ' class="hsp-nu"' : '') + '><td>' + a.ar + '</td>' + (a.taeki != null ? '<td title="Tæki á staðnum skv. úttektarskýrslu ' + a.ar + '"><b>' + a.taeki + '</b></td>' : '<td class="hsp-dauft" title="Engin skýrsla lesin ' + a.ar + ' — yfirfarin + hlaðin + ný af reikningi">' + (a.taekiAaetlad || '—') + '</td>') + tala(a.yf) + tala(a.hl) + tala(a.ny) + '<td class="hsp-heim" title="' + esc(a.tilv || '') + '">' + esc(heimildTexti(a)) + '</td></tr>').join('')
      : '<tr><td colspan="6" class="hsp-tomt">Engin þjónustusaga skráð — reikningar og skýrslur ólesnar.</td></tr>');
    // NÆSTA HEIMSÓKN — ein röð per tegund + Alls; til hleðslu í Playfair
    const teg = [['lettvatn', 'Léttvatn', s.taeki_lettvatn, s.nyleg_lettvatn, s.til_hledslu_lettvatn], ['duft', 'Duft', s.taeki_duft, s.nyleg_duft, s.til_hledslu_duft], ['co2', 'Kolsýra', s.taeki_co2, s.nyleg_co2, s.til_hledslu_co2]];
    setB(el, '.hsp-teg-tb tbody',
      teg.map(([t, h, alls, nyleg, til]) => '<tr>' + tegH(t, h) + tala(alls) + tala(nyleg) + (alls ? '<td class="hsp-stor' + (til ? '' : ' hsp-dauft') + '">' + til + '</td>' : '<td class="hsp-dauft">—</td>') + '</tr>').join('') +
      '<tr class="hsp-alls"><td>Alls' + (s.nyleg_oskilgreint ? ' <span style="font-weight:400;color:#525b6b;font-family:' + MONO + ';font-size:10.5px" title="Hlaðin skv. skýrslutexta án tegundar — dragast aðeins frá heildinni">+' + s.nyleg_oskilgreint + ' ót.</span>' : '') + '</td>' + tala(s.taeki) + tala(s.nyleg_lettvatn + s.nyleg_duft + s.nyleg_co2 + s.nyleg_oskilgreint) + '<td class="hsp-stor' + (s.til_hledslu ? '' : ' hsp-dauft') + '">' + s.til_hledslu + '</td></tr>');
    setT(el, '.hsp-ath', (s.ath || '') + ' · hlaðið á 5 ára fresti · reykskynjarar, slöngur og teppi utan');
  }

  // ---------------------------------------------------------------- uppröðun
  function fidNu(main) {
    const el = main.querySelector('[data-co-id]:not(._cat-section):not(._dyg-section):not(._cpr-section):not(._dpb-company)');
    if (el) { const v = el.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    return +(window.Companies && Companies.currentId) || 0;
  }
  let inni = false;
  function tick() {
    if (inni || document.hidden) return; inni = true;
    try {
      const main = document.getElementById('companies-main'); if (!main) return;
      const cols = main.querySelector('.uttekt-cols');
      let el = document.getElementById('_hsp-spjald');
      // tækjadálkarnir eru ekki á síðunni (listi, brunakerfi-flipi …) → spjaldið falið, aldrei fjarlægt
      if (!cols || !cols.offsetHeight) { if (el) el.hidden = true; return; }
      if (!el) { el = skel(); cols.parentNode.insertBefore(el, cols); }
      else if (el.nextElementSibling !== cols) cols.parentNode.insertBefore(el, cols);   // .uttekt-cols endurgerð → sami hnútur, réttur staður
      if (el.hidden) el.hidden = false;
      stillaOpin(el);                                                 // önnur vél gæti hafa opnað/lokað — þjónninn ræður, nýjasta valið
      const fid = fidNu(main); if (!fid) return;
      const r = minni.get(fid);
      if (el.dataset.fid !== String(fid) || !el.dataset.fyllt) {
        fylla(el, fid, r || null);
        if (r) el.dataset.fyllt = '1'; else { delete el.dataset.fyllt; saekja(fid).then(() => schedule()); }
      }
    } catch (e) { console.error('[467]', e); } finally { inni = false; }
  }
  function schedule() { if (schedule.q) return; schedule.q = true; requestAnimationFrame(() => { schedule.q = false; tick(); }); }
  (function watch() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 500); return; }
    new MutationObserver(ms => {
      if (document.hidden) return;
      for (const m of ms) { const t = m.target; if (t && t.closest && t.closest('#_hsp-spjald')) continue; schedule(); return; }
    }).observe(main, { childList: true, subtree: true });
    tick();
  })();
  setInterval(() => { if (!document.hidden) tick(); }, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });

  // tick er opið svo 462 (stöðug opnun) geti teiknað beinagrindina í SAMA tifi og borðann — ekki á eigin tifi seinna
  window.Hledsluspa = { saekja, saekjaSpar, spa, arin, lina, tick, gleyma: fid => { minni.delete(+fid); const el = document.getElementById('_hsp-spjald'); if (el) delete el.dataset.fyllt; schedule(); } };
})();
