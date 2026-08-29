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

  /* ?arsview=bilstjori|bord í símaramma: sýnir spjöld eða borð ÁN þess að
     krukka í vistaða stillingu notandans. Stjórnun = borðið úr
     arsskodun-mobile.html (renderMobileRows). Bílstjóri = 317-spjöldin. */
  function previewOverride() {
    try {
      const q = new URLSearchParams(location.search).get('arsview');
      if (q === 'bilstjori') return true;
      if (q === 'bord' || q === 'stjornun') return false;
    } catch (_) {}
    return null;
  }
  const on = () => {
    const o = previewOverride();
    if (o !== null) return o;
    try { return localStorage.getItem(LS_ON) === '1'; } catch (_) { return false; }
  };
  const setOn = v => { try { localStorage.setItem(LS_ON, v ? '1' : '0'); } catch (_) {} };
  const akFilter = () => { try { return localStorage.getItem(LS_AK) || 'allir'; } catch (_) { return 'allir'; } };
  const setAkFilter = v => { try { localStorage.setItem(LS_AK, v); } catch (_) {} };

  /* ── Stílar — arsskodun-app.html (Agnar 29.08, upprunalega málmútlitið) ──
     Handoff v2.1 vildi hljóðlát 2a-spjöld. Agnar hlóð svo inn
     arsskodun-app.html og nefndi það: dökkur haus, rauð undirstrikun,
     stöðupillur, árs-reitir með ljósdíóðu og tveimur punktum, málmhnappar.
     Gögnin koma áfram úr 153/187 — þetta er teikning, ekki ný rök. */
  function css() {
    if (document.getElementById('_ars-bil-css')) return;
    const s = document.createElement('style');
    s.id = '_ars-bil-css';
    // Tvöfaldað auðkenni: þjöppunarlögin (314/315) eru sértækari en einfalt
    // #view-arsskodun og myndu annars yfirskrifa hæðir og letur hér.
    const V = '#' + VIEW_ID + '#' + VIEW_ID + ' ';
    const METAL = 'linear-gradient(180deg,#3c4452,#232b38)';
    /* Takkalitur: --ars-sokkull (hönnunarhamur). Solid svo litavalið sést beint. */
    const BLUE = 'var(--ars-sokkull,#17324f)';
    const LETUR = "var(--ars-letur,'IBM Plex Sans',-apple-system,'Segoe UI',system-ui,sans-serif)";
    s.textContent = [
      V + '._bil-wrap{padding:0 0 96px;background:var(--ars-grunnur,#f0eeea);font-family:' + LETUR + '}',
      V + '._bil-hdr{background:#1a1f2e;padding:9px 12px 0}',
      V + '._bil-hdr-row{padding-bottom:9px}',
      V + '._bil-hdr-tt{font:700 15px ' + LETUR + ';color:#fff}',
      V + '._bil-hdr-sub{font:11px ' + LETUR + ';color:rgba(255,255,255,.6);margin-top:2px}',
      V + '._bil-tabs{display:flex}',
      V + '._bil-tab{flex:1;border:0;background:transparent;color:rgba(255,255,255,.55);font:700 13px ' + LETUR + ';padding:10px 0 9px;border-bottom:2px solid transparent;cursor:pointer}',
      V + '._bil-tab.on{color:#fff;border-bottom-color:#C93C1D}',
      V + '._bil-mon{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#eef1f5;border-bottom:1px solid #d0d4da;'
        + 'font:700 10px ' + LETUR + ';letter-spacing:.06em;text-transform:uppercase;color:var(--ars-texti-mjukur,#5d5a54)}',
      V + '._bil-mon i{flex:1;height:1px;background:#d0d4da;font-size:0}',
      V + '._bil-mon b{font:700 11px ui-monospace,monospace;color:var(--ars-texti-mjukur,#5d5a54);letter-spacing:0;text-transform:none}',
      V + '._bil-list{padding:8px 12px 16px;display:flex;flex-direction:column;gap:var(--ars-spjald-bil,8px)}',

      V + '._bil-card{background:#fff !important;border:1px solid var(--ars-rammi,#e3e1dc) !important;'
        + 'border-left:var(--ars-spjald-kantur,4px) solid var(--ars-accent,#5980a6) !important;'
        + 'border-radius:var(--ars-spjald-radius,12px);padding:10px 12px;'
        + 'display:flex;flex-direction:column;gap:8px}',
      V + '._bil-card._bs-done{border-left-color:#1f9d57 !important}',
      V + '._bil-card._bs-vinnslu{border-left-color:var(--ars-sokkull,#17324f) !important}',
      V + '._bil-card._bs-vantar{border-left-color:#c0392b !important}',
      V + '._bil-card._bs-sleppt{border-left-color:#c98a1a !important}',
      V + '._bil-card._bs-queue{border-left-color:var(--ars-accent,#5980a6) !important}',

      V + '._bil-top{display:flex;align-items:flex-start;gap:9px}',
      V + '._bil-top>div{flex:1;min-width:0}',
      V + '._bil-nm{font-size:var(--ars-spjald-nafn,15.5px);font-weight:700;color:var(--ars-texti,#16181c);line-height:1.2}',
      V + '._bil-addr{font-size:12px;color:var(--ars-texti-mjukur,#5d5a54);margin-top:2px}',
      V + '._bil-st{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:99px;font:700 11.5px ' + LETUR + ';white-space:nowrap;flex:0 0 auto}',
      V + '._bil-st._bs-done{background:#e7f7ee;color:#1f9d57}',
      V + '._bil-st._bs-vinnslu{background:#eef4fb;color:var(--ars-sokkull,#17324f)}',
      V + '._bil-st._bs-vantar{background:#fdeceb;color:#c0392b}',
      V + '._bil-st._bs-sleppt{background:#fdf3e0;color:#c98a1a}',
      V + '._bil-st._bs-queue{background:#f4f6f9;color:var(--ars-texti-merki,#6f6b63)}',

      V + '._bil-mid{display:flex;align-items:center;gap:14px;flex-wrap:wrap}',
      V + '._bil-yrs{display:flex;gap:5px;width:184px}',
      V + '._bil-yrcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px}',
      V + '._bil-yr{width:100%;height:var(--ars-arsreitur-haed,26px);min-width:var(--ars-arsreitur-breidd,40px);border-radius:6px;color:#fff;font:700 13px ui-monospace,monospace;'
        + 'display:flex;align-items:center;justify-content:center;gap:5px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25);border:1px solid #7a1d13;'
        + 'background:linear-gradient(180deg,#c0392b,#8c2318)}',
      V + '._bil-yr.skyrsla{background:linear-gradient(180deg,#1e6b3d,#0d4526);border-color:#0a3a1f}',
      V + '._bil-yr.skodad{background:linear-gradient(180deg,#c9a227,#8f6d10);border-color:#7a5c0c}',
      V + '._bil-led{width:5px;height:5px;border-radius:50%;background:#e8705f;flex:none}',
      V + '._bil-yr.skyrsla ._bil-led{background:#34d17a}',
      V + '._bil-yr.skodad ._bil-led{background:#f0c246}',
      V + '._bil-dots{display:flex;gap:4px}',
      V + '._bil-dots i{width:5px;height:5px;border-radius:50%;background:#ccd2da}',
      V + '._bil-dots i.on{background:#22c55e}',
      V + '._bil-dots i.inv{background:#2563eb}',
      V + '._bil-eq{display:flex;gap:11px}',
      V + '._bil-eq span{display:flex;flex-direction:column;align-items:center;line-height:1.04}',
      V + '._bil-eq b{font:800 14px ' + LETUR + ';color:var(--ars-texti,#16181c)}',
      V + '._bil-eq u{font:700 8px ' + LETUR + ';color:var(--ars-texti-mjukur,#5d5a54);text-decoration:none}',
      V + '._bil-meta{font:12.5px ui-monospace,monospace;color:var(--ars-texti-mjukur,#5d5a54)}',
      V + '._bil-val{margin-left:auto;font:12.5px ui-monospace,monospace;color:var(--ars-texti-mjukur,#5d5a54)}',
      V + '._bil-who{display:flex;align-items:center;gap:8px;font:12.5px ' + LETUR + ';color:var(--ars-texti-mjukur,#5d5a54)}',
      V + '._bil-who b{color:var(--ars-texti,#16181c)}',
      V + '._bil-who span{font-family:ui-monospace,monospace}',
      V + '._bil-note{font:12px ' + LETUR + ';color:var(--ars-texti-mjukur,#5d5a54);background:#f4f6f9;border-radius:8px;padding:7px 9px}',

      V + '._bil-ok{display:flex;align-items:center;gap:9px;flex-wrap:wrap;border:1px solid #cfdcea;background:#eef4fb;border-radius:9px;padding:8px 10px}',
      V + '._bil-oktxt{font:700 12px ' + LETUR + ';color:var(--ars-sokkull,#17324f)}',
      V + '._bil-oksub{font:11.5px ' + LETUR + ';color:var(--ars-texti-mjukur,#5d5a54)}',
      V + '._bil-sync{margin-left:auto;min-height:36px;border:1px solid #0d1a2b;background:' + BLUE + ';color:#eaf1f9;font:700 12px ' + LETUR + ';border-radius:8px;padding:0 11px;cursor:pointer}',

      V + '._bil-akrow{display:flex;gap:7px;align-items:center}',
      V + '._bil-aklbl{font:700 10px ' + LETUR + ';letter-spacing:.05em;text-transform:uppercase;color:var(--ars-texti-merki,#6f6b63)}',
      V + '._bil-seg{display:flex;gap:4px}',
      V + '._bil-ak{min-width:40px;min-height:var(--ars-akstur-haed,40px) !important;height:var(--ars-akstur-haed,40px) !important;'
        + 'border:1px solid #10161f;background:' + METAL + ';color:#8f99a8;font:700 14px ui-monospace,monospace;border-radius:9px;cursor:pointer;'
        + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}',
      V + '._bil-ak.on{background:' + BLUE + ';border-color:#0d1a2b;color:#eaf1f9;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 2px color-mix(in srgb,var(--ars-sokkull,#17324f) 28%,transparent)}',

      V + '._bil-btns{display:flex;gap:7px}',
      V + '._bil-ic{flex:1;min-height:var(--ars-takn-haed,44px) !important;height:auto !important;border:1px solid #10161f;background:' + METAL + ';'
        + 'color:#dbe2ec;font:700 13px ' + LETUR + ';border-radius:9px;display:flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer;padding:0}',
      V + '._bil-ic[disabled],a._bil-ic[aria-disabled="true"],span._bil-ic[aria-disabled="true"]{opacity:.4;pointer-events:none}',
      V + '._bil-done{flex:1.4;min-height:var(--ars-skodad-haed,44px) !important;height:auto !important;border:1px solid #10161f;background:' + METAL + ';'
        + 'color:#aab3c0;font:700 13.5px ' + LETUR + ';border-radius:9px;cursor:pointer}',
      V + '._bil-done.hakad{background:' + BLUE + ';border-color:#0d1a2b;color:#eaf1f9}',
      V + '._bil-done[disabled]{opacity:.5;cursor:default}',
      V + '._bil-tom{padding:34px 12px;text-align:center;color:var(--ars-texti-mjukur,#5d5a54);font-size:13px}'
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

  /* Sama stState og renderMobileRows / arsPerur — ekki afrit af rökinum.
     Fallback aðeins ef 153 er ekki hlaðið (ætti ekki að gerast á þessari síðu). */
  function stada(co) {
    const ar = new Date().getFullYear();
    const years = [ar - 3, ar - 2, ar - 1, ar];
    const map = {
      done:  ['_bs-done',   '✓ Skoðað ' + ar],
      work:  ['_bs-vinnslu', '◐ Í vinnslu'],
      skip:  ['_bs-sleppt', '⏳ Sleppt í fyrra'],
      over:  ['_bs-vantar', '! Á eftir'],
      queue: ['_bs-queue',  '○ Á dagskrá']
    };
    try {
      if (window.Arsskodun && Arsskodun.arsPerur) {
        const p = Arsskodun.arsPerur(co, years, ar, new Date().getMonth() + 1);
        return map[p.stState] || map.queue;
      }
    } catch (_) {}
    const a = co._ars || {};
    if (+a.last_year_inspected === ar) return map.done;
    if (+a.field_inspected_year === ar) return map.work;
    if (a.ekki_sleppt === false || a.skipped_last_year) return map.skip;
    return map.queue;
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
    const simiHreint = simi ? String(simi).replace(/[\s-]/g, '') : '';
    const pnr = String(c.postnumer || '').trim();
    const heim = String(c.heimilisfang || '').trim();
    const addr = [pnr && heim.indexOf(pnr) < 0 ? pnr : '', heim].filter(Boolean).join(' ');
    const tengill = String(c['tengiliður'] || '').trim();
    const nota = (c.plan_note || '').trim();
    const est = +a.estimated_yearly || 0;

    // Árs-reitirnir eru teiknaðir HÉR en reiknaðir í 153 (Arsskodun.arsPerur) —
    // ein rökfærsla, tvær teikningar. Ljósdíóða + tveir punktar úr mockupinu:
    // d1 grænt ef skýrsla, d2 blátt aðeins ef 187.yearInfo.reik er satt
    // (sama 🧾 og borðið — engin ágiskun, grár punktur ef 187 er ekki til).
    const ar = new Date().getFullYear();
    const years = [ar - 3, ar - 2, ar - 1, ar];
    let yrs = '';
    let invByY = {};
    try {
      if (window.InserviceRowReports && InserviceRowReports.yearInfo)
        invByY = InserviceRowReports.yearInfo(c) || {};
    } catch (_) {}
    try {
      const p = Arsskodun.arsPerur(c, years, ar, new Date().getMonth() + 1);
      yrs = '<div class="_bil-yrs">' + years.map((y, i) => {
        const st = p.arStada[i] === 'ekkert' ? '' : p.arStada[i];
        const d1 = p.arStada[i] === 'skyrsla' ? ' on' : '';
        const rec = invByY[String(y)];
        const d2 = rec && rec.reik ? ' inv' : '';
        return '<span class="_bil-yrcol">'
          + '<span class="_bil-yr ' + st + '"><i class="_bil-led"></i>' + String(y).slice(-2) + '</span>'
          + '<span class="_bil-dots"><i class="' + d1 + '"></i><i class="' + d2 + '"></i></span>'
          + '</span>';
      }).join('') + '</div>';
    } catch (_) {}

    // „Í vinnslu — óklárað". Talan kemur úr CanonStadur ef hún er til; ANNARS
    // er línan sleppt. Uppdiktuð tala („3 af 9") væri verri en engin tala.
    let oklarad = '';
    if (cls === '_bs-vinnslu') {
      let skrad = null;
      try { if (window.CanonStadur && CanonStadur.countOf) skrad = CanonStadur.countOf(c.id); } catch (_) {}
      const sub = (skrad != null && eq.total)
        ? '<span class="_bil-oksub">' + skrad + ' af ' + eq.total + ' tækjum skráð</span>' : '';
      oklarad = '<div class="_bil-ok"><span class="_bil-oktxt">Í vinnslu — óklárað</span>'
        + sub
        + '<button type="button" class="_bil-sync" data-co="' + c.id + '">⟳ Samstilla í Ársskoðun</button></div>';
    }

    const hakad = cls === '_bs-done';
    const hringja = simiHreint
      ? '<a class="_bil-ic _bil-call" href="tel:' + esc(simiHreint) + '">📞 Hringja</a>'
      : '<span class="_bil-ic" aria-disabled="true">📞 Hringja</span>';
    const who = (tengill || simi)
      ? '<div class="_bil-who">'
        + (tengill ? '<b>' + esc(tengill) + '</b>' : '')
        + (simi ? '<span>' + esc(simi) + '</span>' : '')
        + '</div>'
      : '';
    return '<div class="_bil-card ' + cls + '" data-co="' + c.id + '">'
      + '<div class="_bil-top"><div><div class="_bil-nm">' + esc(c.nafn || '—') + '</div>'
      + (addr ? '<div class="_bil-addr">' + esc(addr) + '</div>' : '') + '</div>'
      + '<span class="_bil-st ' + cls + '">' + esc(merki) + '</span></div>'
      + '<div class="_bil-mid">' + yrs
      + '<div class="_bil-eq">'
      + '<span><b>' + eq.slt + '</b><u>SLT</u></span>'
      + '<span><b>' + eq.bsl + '</b><u>BSL</u></span>'
      + '<span><b>' + eq.rs + '</b><u>RS</u></span>'
      + '</div>'
      + (a.last_skodun ? '<span class="_bil-meta">Síðast ' + esc(String(a.last_skodun)) + '</span>' : '')
      + (est ? '<span class="_bil-val">≈ ' + esc(kr(est)) + '</span>' : '')
      + '</div>'
      + who
      + (nota ? '<div class="_bil-note">📝 ' + esc(nota) + '</div>' : '')
      + oklarad
      + '<div class="_bil-akrow"><span class="_bil-aklbl">Akstur</span><div class="_bil-seg">'
      + [0, 1, 2, 3].map(n => '<button type="button" class="_bil-ak' + (ak === n ? ' on' : '') + '" data-ak="' + n + '" data-co="' + c.id + '">'
          + (n || '—') + '</button>').join('')
      + '</div></div>'
      + '<div class="_bil-btns">'
      + hringja
      + '<button type="button" class="_bil-ic _bil-nav" data-co="' + c.id + '">🗺 Leiðsögn</button>'
      + '<button type="button" class="_bil-done' + (hakad ? ' hakad' : '') + '" data-co="' + c.id + '">'
      + (hakad ? '✓ Skoðað' : '✓ Skoðað?') + '</button>'
      + '</div></div>';
  }

  function html() {
    const hopar = rada();
    const f = akFilter();
    const talning = hopar.reduce((s, h) => s + h[1].length, 0);
    const budid = hopar.reduce((s, h) => s + h[1].filter(c => stada(c)[0] === '_bs-done').length, 0);
    const titill = f === 'allir' ? 'Allir aksturslistar' : 'Aksturslisti ' + f;
    const tabs = [['1', '🚗 1'], ['2', '🚗 2'], ['3', '🚗 3'], ['allir', 'Allir']]
      .map(([k, l]) => '<button type="button" class="_bil-tab' + (f === k ? ' on' : '') + '" data-akf="' + k + '">' + l + '</button>').join('');
    // 📋 Listi er EKKI inni í símanum — Stjórnun/Bílstjóri situr í ramma-overlayinu.
    const body = hopar.length
      ? hopar.map(([m, arr]) =>
          '<div class="_bil-mon"><span>' + (m ? esc(MONTHS[m - 1]) + ' ' + new Date().getFullYear() : 'Án mánaðar') + '</span>'
          + '<i></i><b>' + arr.filter(c => stada(c)[0] === '_bs-done').length + ' / ' + arr.length + '</b></div>'
          + '<div class="_bil-list">' + arr.map(spjald).join('') + '</div>').join('')
      : '<div class="_bil-tom">Engin fyrirtæki á þessum aksturslista.</div>';
    return '<div class="_bil-wrap"><div class="_bil-hdr"><div class="_bil-hdr-row">'
      + '<div class="_bil-hdr-tt">' + esc(titill) + '</div>'
      + '<div class="_bil-hdr-sub">' + talning + ' staðir · ' + budid + ' búnir</div>'
      + '</div><div class="_bil-tabs">' + tabs + '</div></div>'
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
    if (previewOverride() !== null) return;
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

  window.ArsBilstjori = { teikna, on, setOn, version: 'v2-app' };
  console.log('[patch-317] arsskodun bilstjori ready');
})();
/* === END ÁRSSKOÐUN BÍLSTJÓRASPJÖLD === */
