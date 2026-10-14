/* === 465 — HLEÐSLUSPÁ-SPJALDIÐ á fyrirtækjasíðunni (14.10.2026) ==============
 *
 * Agnar 13.10.2026: „register how many tæki was yfirfarin, hlaðin, ný í duft og léttvatn og kolsýru per year so we
 * can determine when and how many we need to hlaða each visit.. but hlaða is every 5 years" — og svo: „try to make
 * it into compact tablet that can be seen somewhere on the company profile and later in the driver apps".
 *
 * Gögnin: viewið `v_hledsluspa` (ein röð per stað: virk tæki per tegund úr uttaeki, hlaðin/ný síðustu 5 ár úr
 * `thjonustusaga`, til_hledslu = mismunurinn, elsta_heimild) og `thjonustusaga` (ár fyrir ár: yfirfarin · hlaðin ·
 * ný). Hvort tveggja fyllt af tools/thjonustusaga.cjs — sjá sql/2026-10-13_thjonustusaga.sql. Þetta spjald LES AÐEINS.
 *
 * Staðsetning: eitt stálspjald í fullri breidd beint fyrir ofan tækjadálkana (.uttekt-cols) — þar sem tækin sjálf
 * byrja. Hnúturinn er okkar; 129 teiknar prófílinn með sameiningu (aðskotahnútar standa), svo spjaldið lifir
 * endurteikningar og er aðeins fært þegar .uttekt-cols er endurgerð. Fyrirtækið breytist → sama hnútur, ný gildi
 * (engin innerHTML-þurrkun). Hæðin er tekin frá (min-height) áður en gögnin koma — ekkert hopp.
 *
 * Fyrir bílstjóra-appið síðar: `Hledsluspa.saekja(fid)` skilar {spa, saga} og `Hledsluspa.lina(fid)` skilar einni
 * línu („12 til hleðslu · L 15 · D 2 · síðast hlaðið 2026") þegar gögnin eru komin — 219 getur notað hana á stoppi.
 */
(() => {
  'use strict';
  if (window.Hledsluspa) return;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = () => (window.DB && DB.sb) || null;
  const AR = new Date().getFullYear();

  const css = [
    '.hsp{background:#fff;border:1px solid #000;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px -16px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.25);margin:0 0 16px;min-height:132px;font-family:' + SANS + ';color:#141822;box-sizing:border-box}',
    '.hsp[hidden]{display:none}',
    '.hsp-haus{position:relative;background:' + METAL + ';min-height:46px;padding:5px 16px 5px 20px;display:flex;align-items:center;gap:10px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000;box-sizing:border-box}',
    '.hsp-haus::before,.hsp-haus::after{content:"";position:absolute;top:50%;margin-top:-3px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.6);pointer-events:none}',
    '.hsp-haus::before{left:7px}.hsp-haus::after{right:7px}',
    '.hsp-led{width:8px;height:8px;border-radius:50%;flex:none;background:#8f98a8;box-shadow:0 0 0 1px rgba(0,0,0,.5)}',
    '.hsp-led[data-t="raudt"]{background:#e25555;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 8px rgba(226,85,85,.7)}',
    '.hsp-led[data-t="graent"]{background:#1f9d57;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 8px rgba(31,157,87,.6)}',
    '.hsp-led[data-t="gult"]{background:#b8912f;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 8px rgba(184,145,47,.6)}',
    '.hsp-t{font-size:15px;font-weight:600;text-shadow:0 1px 1px rgba(0,0,0,.6);white-space:nowrap}',
    '.hsp-plata{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;text-shadow:none}',
    '.hsp-plata[data-t="dokk"]{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#eef1f4}',
    '.hsp-tala{margin-left:auto;display:flex;align-items:baseline;gap:8px;white-space:nowrap}',
    '.hsp-tala b{font-family:' + DISPLAY + ';font-size:30px;font-weight:800;line-height:1;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7);font-variant-numeric:lining-nums}',
    '.hsp-tala small{font-family:' + DISPLAY + ';font-size:14px;font-weight:700;color:rgba(255,255,255,.85)}',
    '.hsp-buk{padding:10px 12px 10px;display:flex;flex-wrap:wrap;gap:8px;align-items:stretch;background:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)}',
    '.hsp-r{' + LINE + ';flex:1 1 150px;min-width:0;padding:7px 12px 6px;display:flex;flex-direction:column;gap:2px}',
    '.hsp-r i{font-style:normal;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#525b6b;display:flex;align-items:center;gap:6px;white-space:nowrap}',
    '.hsp-r i::before{content:"";width:9px;height:9px;border-radius:2px;background:var(--hsp-teg,#8f98a8);flex:none}',
    '.hsp-r[data-teg="lettvatn"]{--hsp-teg:#2f7fd4}.hsp-r[data-teg="duft"]{--hsp-teg:#c9372c}.hsp-r[data-teg="co2"]{--hsp-teg:#3a3a41}.hsp-r[data-teg="sidast"] i::before{display:none}',
    '.hsp-r b{font-family:' + MONO + ';font-size:17px;font-weight:700;color:#141822;line-height:1.15;font-variant-numeric:lining-nums}',
    '.hsp-r b small{font-size:11.5px;font-weight:400;color:#525b6b;margin-left:4px}',
    '.hsp-r em{font-style:normal;font-family:' + MONO + ';font-size:11px;color:#525b6b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.hsp-saga{flex:1 1 100%;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-family:' + MONO + ';font-size:11px;color:#525b6b;min-height:22px}',
    '.hsp-saga .hsp-plata{text-transform:none;letter-spacing:.02em;font-weight:500;gap:5px}',
    '.hsp-saga .hsp-plata b{font-weight:700;color:#11141c}',
    '.hsp-saga .hsp-plata[data-t="nu"]{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#eef1f4}.hsp-saga .hsp-plata[data-t="nu"] b{color:#fff}',
    '.hsp-ath{margin-left:auto;white-space:nowrap}',
    // sími / app: sama efni, minna letur; .hsp er sjálfur ílát svo reglan kviknar þótt síðan sé 980 px (sjá slokkvitaeki-layout §9)
    '.hsp{container-type:inline-size}',
    '@container (max-width:620px){.hsp-t{font-size:13.5px}.hsp-tala b{font-size:24px}.hsp-r{flex-basis:120px}.hsp-ath{margin-left:0;flex-basis:100%;white-space:normal}}'
  ].join('\n');
  const st = document.createElement('style'); st.id = 'hledsluspa-465'; st.textContent = css;
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
          SB.from('thjonustusaga').select('ar,tegund,yfirfarin,hladin,ny,heimild,tilvisun').eq('fyrirtaeki_id', fid).order('ar')
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
  // ár fyrir ár: summur yfir tegundir (heimildir eru útilokandi per ár, sjá tólið)
  function arin(saga) {
    const o = {};
    (saga || []).forEach(r => { const a = o[r.ar] = o[r.ar] || { ar: r.ar, yf: 0, hl: 0, ny: 0, heimild: new Set() }; a.yf += +r.yfirfarin || 0; a.hl += +r.hladin || 0; a.ny += +r.ny || 0; a.heimild.add(r.heimild); });
    return Object.values(o).sort((x, y) => x.ar - y.ar);
  }
  function lina(fid) {
    const r = minni.get(+fid); if (!r || !r.spa) return '';
    const s = r.spa;
    return s.til_hledslu + ' til hleðslu · L ' + s.til_hledslu_lettvatn + ' · D ' + s.til_hledslu_duft + ' · CO₂ ' + s.til_hledslu_co2 + (s.sidasta_hledsla ? ' · síðast hlaðið ' + s.sidasta_hledsla : ' · aldrei skráð hleðsla');
  }

  // ---------------------------------------------------------------- spjaldið
  function skel() {
    const el = document.createElement('section');
    el.className = 'hsp'; el.id = '_hsp-spjald'; el.setAttribute('aria-label', 'Hleðsluspá');
    el.innerHTML =
      '<div class="hsp-haus"><i class="hsp-led" aria-hidden="true"></i><span class="hsp-t">Hleðsluspá</span>' +
        '<span class="hsp-plata hsp-heimsokn" title="Hlaðið á 5 ára fresti: tæki sem var hlaðið eða selt nýtt árið Y kemur í hleðslu árið Y+5"></span>' +
        '<span class="hsp-plata hsp-mork" hidden></span>' +
        '<div class="hsp-tala"><b>—</b><small>til hleðslu</small></div></div>' +
      '<div class="hsp-buk">' +
        reitur('lettvatn', 'Léttvatn') + reitur('duft', 'Duft') + reitur('co2', 'Kolsýra') +
        '<div class="hsp-r" data-teg="sidast"><i>Síðast hlaðið</i><b class="hsp-v">—</b><em class="hsp-e"></em></div>' +
        '<div class="hsp-saga"></div>' +
      '</div>';
    return el;
  }
  function reitur(teg, heiti) { return '<div class="hsp-r" data-teg="' + teg + '"><i>' + heiti + '</i><b><span class="hsp-v">—</span><small class="hsp-af"></small></b><em class="hsp-e"></em></div>'; }
  const setT = (el, sel, v) => { const n = el.querySelector(sel); if (n && n.textContent !== String(v)) n.textContent = String(v); };

  function fylla(el, fid, r) {
    el.dataset.fid = String(fid);
    if (!r) return;                                                   // enn að sækja — beinagrindin stendur
    if (r.villa) { setT(el, '.hsp-heimsokn', 'engin tenging'); return; }
    const s = r.spa, led = el.querySelector('.hsp-led'), mork = el.querySelector('.hsp-mork');
    if (!s) { setT(el, '.hsp-tala b', '—'); setT(el, '.hsp-heimsokn', 'engin gögn'); led.dataset.t = ''; return; }
    const heimsokn = s.naesta_heimsokn || AR;
    setT(el, '.hsp-heimsokn', 'Heimsókn ' + heimsokn + ' · ' + (s.stada || ''));
    setT(el, '.hsp-tala b', s.taeki ? s.til_hledslu : '—');
    led.dataset.t = !s.taeki ? '' : s.til_hledslu === 0 ? 'graent' : (s.til_hledslu >= Math.max(5, s.taeki * 0.5) ? 'raudt' : 'gult');
    const efri = !!(s.ath && /efri mörk|engin saga/.test(s.ath));
    mork.hidden = !efri; if (efri) { mork.textContent = s.elsta_heimild ? 'Efri mörk · saga frá ' + s.elsta_heimild : 'Engin saga'; mork.title = s.ath; mork.dataset.t = ''; }
    [['lettvatn', s.til_hledslu_lettvatn, s.taeki_lettvatn, s.nyleg_lettvatn], ['duft', s.til_hledslu_duft, s.taeki_duft, s.nyleg_duft], ['co2', s.til_hledslu_co2, s.taeki_co2, s.nyleg_co2]].forEach(([teg, til, alls, nyleg]) => {
      const rt = el.querySelector('.hsp-r[data-teg="' + teg + '"]'); if (!rt) return;
      setT(rt, '.hsp-v', alls ? til : '—'); setT(rt, '.hsp-af', alls ? 'af ' + alls : 'engin');
      setT(rt, '.hsp-e', alls ? (nyleg ? nyleg + ' hlaðin/ný síðustu 5 ár' : 'engin hleðsla skráð') : '');
    });
    const sr = el.querySelector('.hsp-r[data-teg="sidast"]');
    setT(sr, '.hsp-v', s.sidasta_hledsla || '—');
    setT(sr, '.hsp-e', s.sidasta_hledsla ? 'næst ' + (s.sidasta_hledsla + 5) + (s.nyleg_oskilgreint ? ' · +' + s.nyleg_oskilgreint + ' án tegundar' : '') : 'engin hleðsla í sögu');
    // árin: ein plata per ár — yf · hl · ný; yfirstandandi ár dökkt
    const saga = el.querySelector('.hsp-saga'); const ar = arin(r.saga);
    const html = (ar.length ? ar.map(a => '<span class="hsp-plata" data-t="' + (a.ar === AR ? 'nu' : '') + '" title="' + esc(Array.from(a.heimild).join(', ')) + '"><b>' + a.ar + '</b>yf ' + a.yf + (a.hl ? ' · hl ' + a.hl : '') + (a.ny ? ' · ný ' + a.ny : '') + '</span>').join('')
      : '<span>Engin þjónustusaga skráð — reikningar og skýrslur ólesnar.</span>') +
      '<span class="hsp-ath">' + esc(s.ath || '') + '</span>';
    if (saga.dataset.html !== html) { saga.dataset.html = html; saga.innerHTML = html; }
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
      else if (el.nextElementSibling !== cols) cols.parentNode.insertBefore(el, cols);   // .uttekt-cols endurgerð → sama hnútur, réttur staður
      if (el.hidden) el.hidden = false;
      const fid = fidNu(main); if (!fid) return;
      const r = minni.get(fid);
      if (el.dataset.fid !== String(fid) || !el.dataset.fyllt) {
        fylla(el, fid, r || null);
        if (r) el.dataset.fyllt = '1'; else { delete el.dataset.fyllt; saekja(fid).then(() => schedule()); }
      }
    } catch (e) { console.error('[465]', e); } finally { inni = false; }
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
  window.Hledsluspa = { saekja, lina, tick, gleyma: fid => { minni.delete(+fid); const el = document.getElementById('_hsp-spjald'); if (el) delete el.dataset.fyllt; schedule(); } };
})();
