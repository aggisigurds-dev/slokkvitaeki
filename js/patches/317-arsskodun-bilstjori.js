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

  /* ── Stílar — HANDOFF v2.1 („hljóðlát spjöld með einni þungri aðgerð") ──
     Fyrsta útgáfan (29.08) var hafnað: dökkir metal-hnappar á allt, fullur blár
     flötur á spjaldi í vinnslu, sjö jafnþung stök að slást um sama spjaldið.
     Hér er ✓ Skoðað EINA fyllta aðgerðin; allt annað er hárlínur og texti. */
  function css() {
    if (document.getElementById('_ars-bil-css')) return;
    const s = document.createElement('style');
    s.id = '_ars-bil-css';
    // Tvöfaldað auðkenni: þjöppunarlögin (314/315) eru sértækari en einfalt
    // #view-arsskodun og myndu annars yfirskrifa hæðir og letur hér.
    const V = '#' + VIEW_ID + '#' + VIEW_ID + ' ';
    s.textContent = [
      V + '._bil-wrap{padding:0 10px 96px;background:var(--ars-grunnur,#f0eeea)}',
      V + '._bil-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:8px 0;position:sticky;top:0;z-index:5;background:var(--ars-grunnur,#f0eeea)}',
      V + '._bil-tabs::-webkit-scrollbar{display:none}',
      V + '._bil-tab{flex:0 0 auto;min-height:36px !important;height:36px !important;padding:0 15px;border-radius:3px;cursor:pointer;white-space:nowrap;'
        + 'background:#fff;border:1px solid #e0ddd7;color:#5d5a54;font-weight:600;font-size:13px}',
      V + '._bil-tab.on{background:#17324f;border-color:#17324f;color:#f2f5f8}',
      V + '._bil-mon{height:34px;display:flex;align-items:center;justify-content:space-between;'
        + 'font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#6f6b63;margin:8px 2px 4px}',

      /* Spjaldið: aldrei fylltur litaflötur. Litur birtist AÐEINS á 3px kantinum. */
      V + '._bil-card{background:#fff !important;background-image:none !important;'
        + 'border:1px solid var(--ars-rammi,#e3e1dc) !important;'
        + 'border-left:var(--ars-spjald-kantur,3px) solid #ded9d2 !important;'
        + 'border-radius:var(--ars-spjald-radius,3px);padding:12px 13px;margin-bottom:var(--ars-spjald-bil,12px);box-shadow:0 1px 1px rgba(20,20,18,.04)}',
      V + '._bil-card._bs-done{border-left-color:#2e6b4a !important}',
      V + '._bil-card._bs-vinnslu{border-left-color:#5980a6 !important}',
      V + '._bil-card._bs-vantar{border-left-color:#c0392b !important}',
      V + '._bil-card._bs-sleppt{border-left-color:#c9a227 !important}',

      V + '._bil-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}',
      V + '._bil-nm{font-size:var(--ars-spjald-nafn,16.5px);font-weight:600;color:#16181c;line-height:1.2}',
      V + '._bil-addr{font-size:12px;color:var(--ars-texti-mjukur,#5d5a54);margin-top:2px}',
      /* Staða = TEXTI í djúpa þrepinu, ekki pilla. Hrátt stálblátt aldrei á texta. */
      V + '._bil-st{flex:0 0 auto;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;color:#6f6b63 !important;background:none !important;padding:0 !important;border:0 !important}',
      V + '._bil-st._bs-done{color:#2e6b4a !important}',
      V + '._bil-st._bs-vinnslu{color:#2a4763 !important}',
      V + '._bil-st._bs-vantar{color:#c0392b !important}',
      V + '._bil-st._bs-sleppt{color:#8f6d10 !important}',

      /* Árs-reitir: flatir. Engir gljáar, engar ljósdíóður, engir deplar. */
      V + '._bil-yrs{display:flex;gap:3px}',
      V + '._bil-yr{width:var(--ars-arsreitur-breidd,31px);height:var(--ars-arsreitur-haed,20px);border-radius:2px;display:flex;align-items:center;justify-content:center;'
        + 'font-size:10.5px;font-weight:600;background:#e8e5e0;color:#6f6b63;font-variant-numeric:tabular-nums}',
      V + '._bil-yr.skyrsla{background:#2e6b4a;color:#fff}',
      V + '._bil-yr.skodad{background:#c9a227;color:#2b2205}',

      V + '._bil-mid{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 8px}',
      V + '._bil-meta{font-size:12px;color:var(--ars-texti-mjukur,#5d5a54);font-variant-numeric:tabular-nums}',
      V + '._bil-val{margin-left:auto;font-size:12.5px;font-weight:600;color:#16181c;font-variant-numeric:tabular-nums}',
      V + '._bil-note{font-size:12px;color:#5d5a54;background:#f4f6f9;border-radius:2px;padding:7px 9px;margin-bottom:8px}',

      /* „Óklárað" — ljós blokk með 2px striki, EKKI fullur blár flötur. */
      V + '._bil-ok{background:#f2f5f8;border-left:2px solid #5980a6;border-radius:0 2px 2px 0;padding:8px 10px;margin-bottom:9px;'
        + 'display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      V + '._bil-oktxt{font-size:11.5px;color:#2a4763;font-weight:600;line-height:1.35}',
      V + '._bil-oksub{font-weight:400;color:#2a4763;opacity:.85}',
      V + '._bil-sync{margin-left:auto;min-height:36px;padding:7px 12px;border-radius:2px;cursor:pointer;'
        + 'background:#fff;border:1px solid #c3cfdb;color:#2a4763;font-size:12px;font-weight:600;white-space:nowrap}',

      /* Akstur: SAMFELLDUR segment-strimill, ekki fjórir stakir hnappar. */
      V + '._bil-akrow{display:flex;align-items:center;gap:8px;margin-bottom:10px}',
      V + '._bil-aklbl{font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--ars-texti-merki,#6f6b63)}',
      V + '._bil-seg{display:flex;border:1px solid #e0ddd7;border-radius:2px;overflow:hidden}',
      V + '._bil-ak{width:30px;min-height:var(--ars-akstur-haed,36px) !important;height:var(--ars-akstur-haed,36px) !important;border:0;border-left:1px solid #e0ddd7;background:#fff;cursor:pointer;'
        + 'color:#5d5a54;font-size:12.5px;font-weight:600;padding:0}',
      V + '._bil-ak:first-child{border-left:0}',
      V + '._bil-ak.on{background:var(--ars-sokkull,#17324f);color:#f2f5f8}',

      /* Hringja/Leiðsögn: 38px táknhnappar, engir textar. Skoðað er eina fyllta. */
      V + '._bil-btns{display:flex;gap:8px;align-items:center}',
      V + '._bil-ic{width:38px;height:38px;flex:0 0 38px;border:1px solid #e0ddd7;background:#fff;border-radius:2px;'
        + 'cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;'
        + 'min-height:var(--ars-takn-haed,38px) !important;height:var(--ars-takn-haed,38px) !important}',
      V + '._bil-ic[disabled]{opacity:.4;cursor:default}',
      V + '._bil-done{flex:1;min-height:var(--ars-skodad-haed,40px) !important;height:var(--ars-skodad-haed,40px) !important;border-radius:2px;cursor:pointer;font-size:13.5px;font-weight:600;'
        + 'background:#f0eeea;border:1px solid #e0ddd7;color:#5d5a54}',
      V + '._bil-done.hakad{background:var(--ars-sokkull,#17324f);border-color:var(--ars-sokkull,#17324f);color:#f2f5f8}',
      V + '._bil-done[disabled]{opacity:.5;cursor:default}',
      V + '._bil-tom{padding:34px 12px;text-align:center;color:#5d5a54;font-size:13px}'
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
    if (+a.last_year_inspected === ar) return ['_bs-done', 'Skoðað ' + ar];
    if (+a.field_inspected_year === ar) return ['_bs-vinnslu', 'Í vinnslu'];
    if (a.ekki_sleppt === false || a.skipped_last_year) return ['_bs-sleppt', 'Sleppt í fyrra'];
    return ['_bs-vantar', 'Eftir ' + ar];
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
    const eq = (window.Arsskodun && Arsskodun.eqGroups) ? Arsskodun.eqGroups(a.equipment || {}) : { slt: 0, bsl: 0, rs: 0, total: 0 };
    const ak = (window.ArsAkstur && ArsAkstur.of) ? (ArsAkstur.of(c.id) || 0) : (+a.akstur || 0);
    const simi = [c.simi, c.farsimi].filter(Boolean)[0];
    const simiHreint = simi ? String(simi).replace(/\s/g, '') : '';
    const addr = [c.heimilisfang, [c.postnr, c.stadur].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const nota = (c.plan_note || '').trim();
    const est = +a.estimated_yearly || 0;

    // Árs-reitirnir eru teiknaðir HÉR en reiknaðir í 153 (Arsskodun.arsPerur) —
    // ein rökfærsla, tvær teikningar. Flatir reitir með ártalinu í, skv. v2.1.
    const ar = new Date().getFullYear();
    const years = [ar - 3, ar - 2, ar - 1, ar];
    let yrs = '';
    try {
      const p = Arsskodun.arsPerur(c, years, ar, new Date().getMonth() + 1);
      yrs = '<div class="_bil-yrs">' + years.map((y, i) =>
        '<span class="_bil-yr ' + (p.arStada[i] === 'ekkert' ? '' : p.arStada[i]) + '">'
        + String(y).slice(-2) + '</span>').join('') + '</div>';
    } catch (_) {}

    // „Í vinnslu — óklárað". Talan kemur úr CanonStadur ef hún er til; ANNARS
    // er línan sleppt. Uppdiktuð tala („3 af 9") væri verri en engin tala.
    let oklarad = '';
    if (cls === '_bs-vinnslu') {
      let skrad = null;
      try { if (window.CanonStadur && CanonStadur.countOf) skrad = CanonStadur.countOf(c.id); } catch (_) {}
      const sub = (skrad != null && eq.total)
        ? '<span class="_bil-oksub">' + skrad + ' af ' + eq.total + ' tækjum skráð</span>' : '';
      oklarad = '<div class="_bil-ok"><div class="_bil-oktxt">Í vinnslu — óklárað'
        + (sub ? '<br>' + sub : '') + '</div>'
        + '<button type="button" class="_bil-sync" data-co="' + c.id + '">⟳ Samstilla í Ársskoðun</button></div>';
    }

    const hakad = cls === '_bs-done';
    return '<div class="_bil-card ' + cls + '" data-co="' + c.id + '">'
      + '<div class="_bil-top"><div><div class="_bil-nm">' + esc(c.nafn || '—') + '</div>'
      + (addr ? '<div class="_bil-addr">' + esc(addr) + '</div>' : '') + '</div>'
      + '<span class="_bil-st ' + cls + '">' + esc(merki) + '</span></div>'
      + '<div class="_bil-mid">' + yrs
      + '<span class="_bil-meta"><b>' + eq.slt + '</b> SLT · <b>' + eq.bsl + '</b> BSL · <b>' + eq.rs + '</b> RS</span>'
      + (a.last_skodun ? '<span class="_bil-meta">Síðast ' + esc(String(a.last_skodun)) + '</span>' : '')
      + (est ? '<span class="_bil-val">≈ ' + esc(kr(est)) + '</span>' : '')
      + '</div>'
      + (simi ? '<div class="_bil-meta" style="margin:-2px 0 8px">📞 ' + esc(simi) + '</div>' : '')
      + (nota ? '<div class="_bil-note">' + esc(nota) + '</div>' : '')
      + oklarad
      + '<div class="_bil-akrow"><span class="_bil-aklbl">AKSTUR</span><div class="_bil-seg">'
      + [0, 1, 2, 3].map(n => '<button type="button" class="_bil-ak' + (ak === n ? ' on' : '') + '" data-ak="' + n + '" data-co="' + c.id + '">'
          + (n || '—') + '</button>').join('')
      + '</div></div>'
      + '<div class="_bil-btns">'
      + '<button type="button" class="_bil-ic _bil-call" title="Hringja" data-simi="' + esc(simiHreint) + '"' + (simiHreint ? '' : ' disabled') + '>📞</button>'
      + '<button type="button" class="_bil-ic _bil-nav" title="Leiðsögn" data-co="' + c.id + '">🗺</button>'
      + '<button type="button" class="_bil-done' + (hakad ? ' hakad' : '') + '" data-co="' + c.id + '">'
      + (hakad ? '✓ Skoðað' : 'Skoðað?') + '</button>'
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

    // ⟳ Samstilla: vettvangsskoðun (field_inspected_year) er til en skoðunin
    // hefur ekki verið færð í Ársskoðun. Þetta færir hana — sama eins-fyrirtækis
    // vistun og allt annað hér.
    root.querySelectorAll('._bil-sync').forEach(b => b.addEventListener('click', async e => {
      e.preventDefault();
      const id = +b.dataset.co, ar = new Date().getFullYear();
      const co = ((Arsskodun._cache || {}).list || []).find(x => +x.id === id);
      if (!co) return;
      b.disabled = true;
      const ok = await vista(id, { last_year_inspected: ar });
      b.disabled = false;
      if (!ok) { alert('Samstilling mistókst — reyndu aftur'); return; }
      co._ars = co._ars || {};
      co._ars.last_year_inspected = ar;
      teikna();
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
