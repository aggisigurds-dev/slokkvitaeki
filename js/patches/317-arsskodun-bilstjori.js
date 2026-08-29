/* === ÁRSSKOÐUN — BÍLSTJÓRASPJÖLD v1 =========================================
 *
 * Þriðja sýnin á Ársskoðun, fyrir vinnu í bíl: eitt spjald á fyrirtæki,
 * hópað eftir skoðunarmánuði, með aksturslista-flipum (1/2/3/Allir) og
 * stórum snertiflötum — Hringja · Leiðsögn · ✓ Skoðað.
 *
 * Byggt á docs/HANDOFF-arsskodun-simi.md (Agnar 2026-08-29). Sjónrænt viðmið
 * var arsskodun-app.html úr Claude Design; SÚ SKRÁ VAR SÝNISHORN MEÐ
 * DÆMIGÖGNUM og var eytt — hún gat aldrei lesið gagnagrunninn af því öll
 * gögnin liggja bak við window.AppSettings / CanonStadur / ArsAkstur, sem eru
 * aðeins til inni í appinu. Þessi pappi er endurgerðin á raunverulegum gögnum.
 *
 * ── EKKERT NÝTT GAGNALAG ───────────────────────────────────────────────────
 * Engin ný Supabase-tafla, engin ný fyrirspurn. Allt er endurnotað:
 *   Arsskodun._cache.list  fyrirtækin eins og 153 hlóð þau
 *   Arsskodun.eqGroups()   SLT/BSL/RS — SAMA formúla og borðið, ekki afrit
 *   CanonStadur.monthOf()  skoðunarmánuður — eina rétta uppsprettan
 *   ArsAkstur.of()/.set()  aksturslisti (heldur talningum og perum í takt)
 *   Leidsogn.addToRoute()  leiðsögn fer um patch 161, ekki beinan Maps-hlekk
 *
 * ── VISTUN: EITT FYRIRTÆKI Í EINU ──────────────────────────────────────────
 * AppSettings.save({ arsskodun_customers: { [id]: patch } })
 * ALDREI allan blobinn. Það er race-lagfæringin frá 2026-07-15
 * (153-arsskodun.js:2025) og hún má ekki tapast aftur: tvö tæki sem vista
 * samtímis skrifa annars hvort yfir annað.
 *
 * ── KVEIKJAN ───────────────────────────────────────────────────────────────
 * Handoff-skjalið lagði til matchMedia('(max-width:820px)'). ÞAÐ VIRKAR EKKI
 * hér: í þessu appi ræður `data-viewmode` á <html> útlitinu, ekki gluggabreidd
 * — það er NOTANDASTILLING (sjá .claude/agents/joker.md, „lærdómur 28.08").
 * Sýnin er því handvalin með takka og geymd í localStorage, eins og aðrar
 * sýnastillingar Ársskoðunar.
 * ========================================================================== */
(() => {
  if (window.__arsBilstjori317) return;
  window.__arsBilstjori317 = true;

  const VIEW_ID = 'view-arsskodun';
  const LS_ON   = 'arsskodun_bilstjori_v1';
  const LS_AK   = 'arsskodun_bilstjori_akstur';
  const MONTHS  = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const kr = n => (window.fmtKr ? window.fmtKr(n) : (Math.round(+n||0).toLocaleString('is-IS') + ' kr'));

  const on = () => { try { return localStorage.getItem(LS_ON) === '1'; } catch (_) { return false; } };
  const setOn = v => { try { localStorage.setItem(LS_ON, v ? '1' : '0'); } catch (_) {} };
  const akFilter = () => { try { return localStorage.getItem(LS_AK) || 'allir'; } catch (_) { return 'allir'; } };
  const setAkFilter = v => { try { localStorage.setItem(LS_AK, v); } catch (_) {} };

  /* ── Stílar ────────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById('_ars-bil-css')) return;
    const s = document.createElement('style');
    s.id = '_ars-bil-css';
    // Tvöfaldað auðkenni: þjöppunarlögin (314/315) eru sértækari en einfalt
    // #view-arsskodun og myndu annars yfirskrifa hæðir og letur hér.
    const V = '#' + VIEW_ID + '#' + VIEW_ID + ' ';
    s.textContent = [
      V + '._bil-wrap{padding:0 10px 96px}',
      V + '._bil-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:8px 0;position:sticky;top:0;z-index:5;background:#f5f4ef}',
      V + '._bil-tabs::-webkit-scrollbar{display:none}',
      V + '._bil-tab{flex:0 0 auto;min-height:40px;padding:8px 16px;border-radius:10px;border:1px solid #10161f;cursor:pointer;'
        + 'background:linear-gradient(180deg,#3c4452,#232b38);color:#e6ebf2;font-weight:700;font-size:13.5px;white-space:nowrap}',
      V + '._bil-tab.on{background:linear-gradient(180deg,#2f5a86,#17324f);border-color:#0d1a2b;color:#eaf1f9}',
      V + '._bil-mon{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#5b6573;margin:14px 2px 6px;display:flex;justify-content:space-between}',
      /* !important á bakgrunni OG kanti: ytri reglur máluðu spjaldið heilblátt
         (gradient) og kantinn hvítan. Mælt hvort tveggja áður en þetta var sett. */
      V + '._bil-card{background:#fff !important;background-image:none !important;'
        + 'border:1px solid #e6e9ee !important;border-left:4px solid #1f9d57 !important;'
        + 'border-radius:14px;padding:12px 13px;margin-bottom:10px;'
        + 'box-shadow:0 1px 2px rgba(20,30,25,.05),0 14px 30px -24px rgba(20,30,25,.45)}',
      V + '._bil-card._bs-vantar{border-left-color:#c0392b !important}',
      V + '._bil-card._bs-vinnslu{border-left-color:#2563eb !important}',
      V + '._bil-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}',
      V + '._bil-nm{font-size:15.5px;font-weight:700;color:#11141c;line-height:1.2}',
      V + '._bil-addr{font-size:12px;color:#4b5563;margin-top:2px}',
      V + '._bil-pill{flex:0 0 auto;font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;white-space:nowrap}',
      V + '._bil-pill._bs-done{background:#e7f7ee;color:#1f9d57}',
      V + '._bil-pill._bs-vantar{background:#fdeceb;color:#c0392b}',
      V + '._bil-pill._bs-vinnslu{background:#e8f0fe;color:#2563eb}',
      V + '._bil-mid{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 8px}',
      V + '._bil-meta{font-size:12px;color:#4b5563;font-variant-numeric:tabular-nums}',
      V + '._bil-val{margin-left:auto;font-size:12.5px;font-weight:700;color:#11141c;font-variant-numeric:tabular-nums}',
      V + '._bil-note{font-size:12px;color:#4b5563;background:#f7f8fa;border:1px solid #eef1f5;border-radius:8px;padding:7px 9px;margin-bottom:8px}',
      V + '._bil-akrow{display:flex;align-items:center;gap:6px;margin-bottom:9px}',
      V + '._bil-aklbl{font-size:10.5px;font-weight:800;letter-spacing:.05em;color:#6b7280;margin-right:2px}',
      V + '._bil-ak{min-width:44px;min-height:40px;border-radius:9px;border:1px solid #10161f;cursor:pointer;'
        + 'background:linear-gradient(180deg,#3c4452,#232b38);color:#e6ebf2;font-weight:700;font-size:14px}',
      V + '._bil-ak.on{background:linear-gradient(180deg,#2f5a86,#17324f);border-color:#0d1a2b;color:#eaf1f9}',
      V + '._bil-btns{display:flex;gap:7px}',
      V + '._bil-b{flex:1;min-height:44px;height:44px;white-space:nowrap;border-radius:10px;border:1px solid #10161f;cursor:pointer;font-weight:700;font-size:12.5px;'
        + 'background:linear-gradient(180deg,#3c4452,#232b38);color:#e6ebf2;display:flex;align-items:center;justify-content:center;gap:6px}',
      V + '._bil-b.aðal{flex:1.4;background:linear-gradient(180deg,#2f5a86,#17324f);border-color:#0d1a2b;color:#eaf1f9}',
      V + '._bil-b[disabled]{opacity:.42;cursor:default}',
      V + '._bil-tom{padding:34px 12px;text-align:center;color:#6b7280;font-size:13px}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ── Gögn ──────────────────────────────────────────────────────────────── */
  function manudur(co) {
    // CanonStadur er eina rétta uppsprettan (handoff). Blobbið er varaleið
    // þegar 312 hefur ekki hlaðið — aldrei nafna-strengur.
    try {
      if (window.CanonStadur && CanonStadur.monthOf) {
        const m = CanonStadur.monthOf(co.id);
        if (m >= 1 && m <= 12) return m;
      }
    } catch (_) {}
    const m2 = +((co._ars || {}).inspect_month) || 0;
    return (m2 >= 1 && m2 <= 12) ? m2 : 0;
  }

  function stada(co) {
    const a = co._ars || {}, ar = new Date().getFullYear();
    if (+a.last_year_inspected === ar) return ['_bs-done', '✓ Skoðað ' + ar];
    if (+a.field_inspected_year === ar) return ['_bs-vinnslu', '◐ Í vinnslu'];
    return ['_bs-vantar', '○ Eftir ' + ar];
  }

  function rada() {
    const cache = (window.Arsskodun && Arsskodun._cache) || {};
    const all = (cache.list || []).filter(c => c._ars && c._ars.equipment);
    const f = akFilter();
    const valin = all.filter(c => {
      if (f === 'allir') return true;
      const ak = (window.ArsAkstur && ArsAkstur.of) ? ArsAkstur.of(c.id) : +((c._ars || {}).akstur || 0);
      return String(ak) === f;
    });
    const hopar = new Map();
    valin.forEach(c => {
      const m = manudur(c);
      if (!hopar.has(m)) hopar.set(m, []);
      hopar.get(m).push(c);
    });
    // Mánuðir í röð; „án mánaðar" (0) aftast, eins og í borðinu.
    return [...hopar.entries()]
      .sort((a, b) => (a[0] === 0 ? 99 : a[0]) - (b[0] === 0 ? 99 : b[0]))
      .map(([m, arr]) => [m, arr.sort((x, y) => String(x.nafn || '').localeCompare(String(y.nafn || ''), 'is'))]);
  }

  /* ── Teikning ──────────────────────────────────────────────────────────── */
  function spjald(c) {
    const a = c._ars || {};
    const [cls, merki] = stada(c);
    const eq = (window.Arsskodun && Arsskodun.eqGroups) ? Arsskodun.eqGroups(a.equipment || {}) : { slt: 0, bsl: 0, rs: 0 };
    const ak = (window.ArsAkstur && ArsAkstur.of) ? (ArsAkstur.of(c.id) || 0) : (+a.akstur || 0);
    const simi = (c.simi || c.phone || '').toString().replace(/\s/g, '');
    const addr = [c.heimilisfang, [c.postnr, c.stadur].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const nota = (c.plan_note || '').trim();
    const sid = a.last_skodun ? String(a.last_skodun) : null;
    const est = +a.estimated_yearly || 0;

    return '<div class="_bil-card ' + cls + '" data-co="' + c.id + '">'
      + '<div class="_bil-top"><div><div class="_bil-nm">' + esc(c.nafn || '—') + '</div>'
      + (addr ? '<div class="_bil-addr">' + esc(addr) + '</div>' : '') + '</div>'
      + '<span class="_bil-pill ' + cls + '">' + esc(merki) + '</span></div>'
      + '<div class="_bil-mid">'
      + '<span class="_bil-meta"><b>' + eq.slt + '</b> SLT · <b>' + eq.bsl + '</b> BSL · <b>' + eq.rs + '</b> RS</span>'
      + (sid ? '<span class="_bil-meta">Síðast ' + esc(sid) + '</span>' : '')
      + (est ? '<span class="_bil-val">≈ ' + esc(kr(est)) + '</span>' : '')
      + '</div>'
      + (nota ? '<div class="_bil-note">📝 ' + esc(nota) + '</div>' : '')
      + '<div class="_bil-akrow"><span class="_bil-aklbl">AKSTUR</span>'
      + [0, 1, 2, 3].map(n => '<button type="button" class="_bil-ak' + (ak === n ? ' on' : '') + '" data-ak="' + n + '" data-co="' + c.id + '">'
          + (n || '—') + '</button>').join('')
      + '</div>'
      + '<div class="_bil-btns">'
      + '<button type="button" class="_bil-b _bil-call" data-simi="' + esc(simi) + '"' + (simi ? '' : ' disabled') + '>📞 Hringja</button>'
      + '<button type="button" class="_bil-b _bil-nav" data-co="' + c.id + '">🗺 Leiðsögn</button>'
      + '<button type="button" class="_bil-b aðal _bil-done" data-co="' + c.id + '">✓ Skoðað</button>'
      + '</div></div>';
  }

  function html() {
    const hopar = rada();
    const f = akFilter();
    const talning = hopar.reduce((s, h) => s + h[1].length, 0);
    const budid = hopar.reduce((s, h) => s + h[1].filter(c => stada(c)[0] === '_bs-done').length, 0);
    const tabs = [['1', '🚚 1'], ['2', '🚚 2'], ['3', '🚚 3'], ['allir', 'Allir']]
      .map(([k, l]) => '<button type="button" class="_bil-tab' + (f === k ? ' on' : '') + '" data-akf="' + k + '">' + l + '</button>').join('');
    const body = hopar.length
      ? hopar.map(([m, arr]) =>
          '<div class="_bil-mon"><span>' + (m ? esc(MONTHS[m - 1]) + ' ' + new Date().getFullYear() : 'Án mánaðar') + '</span>'
          + '<span>' + arr.filter(c => stada(c)[0] === '_bs-done').length + ' / ' + arr.length + '</span></div>'
          + arr.map(spjald).join('')).join('')
      : '<div class="_bil-tom">Engin fyrirtæki á þessum aksturslista.</div>';
    return '<div class="_bil-wrap"><div class="_bil-tabs">' + tabs + '</div>'
      + '<div class="_bil-mon"><span>' + talning + ' staðir</span><span>' + budid + ' búnir</span></div>'
      + body + '</div>';
  }

  /* ── Vistun — EITT fyrirtæki í einu ────────────────────────────────────── */
  async function vista(coId, patch) {
    if (!window.AppSettings || !AppSettings.save) return false;
    return await AppSettings.save({ arsskodun_customers: { [String(coId)]: patch } });
  }

  function tengja(root) {
    root.querySelectorAll('._bil-tab').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); setAkFilter(b.dataset.akf); teikna();
    }));

    root.querySelectorAll('._bil-ak').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const id = +b.dataset.co, n = +b.dataset.ak;
      b.parentElement.querySelectorAll('._bil-ak').forEach(x => x.classList.toggle('on', x === b));
      // Alltaf gegnum ArsAkstur — hann djúpsameinar í blobið og heldur
      // talningum/perum í 153 í takt. Bein skrift myndi rjúfa það.
      try { if (window.ArsAkstur && ArsAkstur.set) ArsAkstur.set(id, n); } catch (_) {}
      const co = ((Arsskodun._cache || {}).list || []).find(x => +x.id === id);
      if (co) { co._ars = co._ars || {}; co._ars.akstur = n; }
    }));

    root.querySelectorAll('._bil-call').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      const s = b.dataset.simi; if (s) location.href = 'tel:' + s;
    }));

    root.querySelectorAll('._bil-nav').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      const id = +b.dataset.co;
      const co = ((Arsskodun._cache || {}).list || []).find(x => +x.id === id);
      if (!co) return;
      // Leiðsögn fer um patch 161 (handoff), ekki beinan Google Maps hlekk.
      try {
        if (window.Leidsogn && Leidsogn.addToRoute) {
          Leidsogn.addToRoute(co.id, co.nafn, co.heimilisfang || '', co.lat, co.lng);
          if (Leidsogn.show) Leidsogn.show();
        }
      } catch (_) {}
    }));

    root.querySelectorAll('._bil-done').forEach(b => b.addEventListener('click', async e => {
      e.preventDefault();
      const id = +b.dataset.co, ar = new Date().getFullYear();
      const co = ((Arsskodun._cache || {}).list || []).find(x => +x.id === id);
      if (!co) return;
      const bui = (+((co._ars || {}).last_year_inspected) === ar);
      b.disabled = true;
      // Til baka-leið líka: annar smellur tekur merkinguna af, svo mis-smellur
      // í bíl sé ekki óafturkræfur.
      const nyttAr = bui ? null : ar;
      const ok = await vista(id, { last_year_inspected: nyttAr });
      b.disabled = false;
      if (!ok) { alert('Vistun mistókst — reyndu aftur'); return; }
      co._ars = co._ars || {};
      co._ars.last_year_inspected = nyttAr;
      teikna();
    }));
  }

  /* ── Sýnaskipti ────────────────────────────────────────────────────────── */
  function teikna() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !on()) return;
    const main = v.querySelector('#ars-main') || v;
    let box = v.querySelector('#_bil-root');
    if (!box) {
      box = document.createElement('div');
      box.id = '_bil-root';
      main.parentNode.insertBefore(box, main);
    }
    main.style.display = 'none';
    box.style.display = '';
    box.innerHTML = html();
    tengja(box);
  }

  function slokkva() {
    const v = document.getElementById(VIEW_ID); if (!v) return;
    const main = v.querySelector('#ars-main'); if (main) main.style.display = '';
    const box = v.querySelector('#_bil-root'); if (box) box.style.display = 'none';
  }

  function takki() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    if (v.querySelector('#_bil-toggle')) return;
    const anchor = v.querySelector('._ars-filterstrip') || v.querySelector('#ars-main');
    if (!anchor) return;
    const b = document.createElement('button');
    b.id = '_bil-toggle'; b.type = 'button';
    b.style.cssText = 'min-height:40px;padding:8px 14px;border-radius:10px;border:1px solid #10161f;cursor:pointer;'
      + 'background:linear-gradient(180deg,#3c4452,#232b38);color:#e6ebf2;font-weight:700;font-size:13px;margin:0 0 8px';
    const merkja = () => { b.textContent = on() ? '▦ Borð' : '🚚 Bílstjóri'; b.title = on() ? 'Til baka í borðið' : 'Spjaldasýn fyrir akstur'; };
    merkja();
    b.addEventListener('click', e => {
      e.preventDefault();
      setOn(!on()); merkja();
      if (on()) { css(); teikna(); } else slokkva();
    });
    anchor.parentNode.insertBefore(b, anchor);
  }

  function vakta() {
    takki();
    if (on()) { css(); teikna(); }
  }

  document.addEventListener('slokk-viewmode', vakta);
  new MutationObserver(() => { clearTimeout(window.__bilT); window.__bilT = setTimeout(vakta, 260); })
    .observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.ArsBilstjori = { teikna, on, setOn, version: 'v1' };
  console.log('[patch-317] arsskodun bilstjori ready');
})();
/* === END ÁRSSKOÐUN BÍLSTJÓRASPJÖLD === */
