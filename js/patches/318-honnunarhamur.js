/* === HÖNNUNARHAMUR — sleðar á símastærðirnar ================================
 *
 * Agnar 2026-08-29: „I also really want to be able to fix my page myself
 * instead of days trying to make code do it."
 *
 * Verk 3 úr handoff-inu „Símastillingar á einn stað". Verk 2 (css/ars-simi-vars.css)
 * er forsendan: allar símastærðir Ársskoðunar eru CSS-breytur á einum stað.
 * Þessi pappi gefur sleða á þær breytur, beint ofan á RAUNVERULEGUM gögnum.
 *
 * ── HVERNIG ÞAÐ VIRKAR ─────────────────────────────────────────────────────
 * Sleði skrifar í document.documentElement.style.setProperty(...) — þess vegna
 * sést breytingin samstundis á öllum 678 röðunum eða 601 spjaldinu, ekki á
 * sýnidæmi. Panellinn situr NEÐST og hylur ekki listann; hann er tól.
 *
 * ── VISTUN ─────────────────────────────────────────────────────────────────
 * „Vista stillingar" ritar í AppSettings undir EIGIN lykli (ars_simi_stillingar)
 * — ALDREI í arsskodun_customers. Sá blob er kúnnagögn og race-lagfæringin frá
 * 2026-07-15 gildir um hann. AppSettings er sameiginlegt, svo Agnar stillir
 * einu sinni og bílstjórarnir fá það (skv. handoff).
 *
 * „Endurstilla" fjarlægir yfirskriftirnar og fer aftur í gildin úr
 * ars-simi-vars.css — sem eru enn sjálfgefna skráin, ósnert.
 * ========================================================================== */
(() => {
  if (window.__honnunarhamur318) return;
  window.__honnunarhamur318 = true;

  const LS_ON  = 'ars_honnunarhamur_v1';
  const AS_KEY = 'ars_simi_stillingar';

  /* Breyturnar sem má stilla, hópaðar eftir því hvað þær snerta. `syn` ræður
     hvaða hópur birtist þegar stak er valið með pikki. */
  const HOPAR = [
    { syn: 'bord', heiti: 'Borð · röð', breytur: [
      { v: '--ars-rad-haed',      m: 'Raðhæð',        min: 36, max: 96,  sjalf: 52 },
      { v: '--ars-nafn-dalkur',   m: 'Nafndálkur',    min: 90, max: 260, sjalf: 150 },
      { v: '--ars-nafn-letur',    m: 'Nafnletur',     min: 10, max: 20,  sjalf: 12.5, skref: .5 },
      { v: '--ars-undirtexti',    m: 'Undirtexti',    min: 7,  max: 14,  sjalf: 9.5,  skref: .5 },
      { v: '--ars-haus-haed',     m: 'Haushæð',       min: 26, max: 60,  sjalf: 38 }
    ] },
    { syn: 'dalkar', heiti: 'Borð · dálkar', breytur: [
      { v: '--ars-col-man',    m: 'Mán',    min: 34, max: 110, sjalf: 56 },
      { v: '--ars-col-ar',     m: 'Ár',     min: 60, max: 180, sjalf: 112 },
      { v: '--ars-col-taeki',  m: 'Tæki',   min: 50, max: 160, sjalf: 96 },
      { v: '--ars-col-akstur', m: 'Akstur', min: 36, max: 110, sjalf: 60 },
      { v: '--ars-col-stada',  m: 'Staða',  min: 34, max: 100, sjalf: 52 },
      { v: '--ars-col-virdi',  m: 'Virði',  min: 50, max: 160, sjalf: 84 },
      { v: '--ars-col-sidast', m: 'Síðast', min: 50, max: 150, sjalf: 78 },
      { v: '--ars-col-nota',   m: 'Nóta',   min: 60, max: 260, sjalf: 130 }
    ] },
    { syn: 'spjald', heiti: 'Spjald · bílstjóri', breytur: [
      { v: '--ars-spjald-nafn',    m: 'Nafnletur',  min: 12, max: 22, sjalf: 16.5, skref: .5 },
      { v: '--ars-spjald-bil',     m: 'Bil milli',  min: 4,  max: 28, sjalf: 12 },
      { v: '--ars-spjald-kantur',  m: 'Kantur',     min: 0,  max: 10, sjalf: 3 },
      { v: '--ars-spjald-radius',  m: 'Radíus',     min: 0,  max: 18, sjalf: 3 },
      { v: '--ars-skodad-haed',    m: '✓ Skoðað',   min: 32, max: 60, sjalf: 40 },
      { v: '--ars-takn-haed',      m: 'Táknhnappar',min: 30, max: 56, sjalf: 38 },
      { v: '--ars-akstur-haed',    m: 'Akstur',     min: 28, max: 56, sjalf: 36 },
      { v: '--ars-arsreitur-breidd', m: 'Árs-reitur b.', min: 20, max: 60, sjalf: 31 },
      { v: '--ars-arsreitur-haed',   m: 'Árs-reitur h.', min: 14, max: 40, sjalf: 20 }
    ] }
  ];
  const ALLAR = HOPAR.reduce((a, h) => a.concat(h.breytur), []);
  const finna = v => ALLAR.find(b => b.v === v);

  const on = () => { try { return localStorage.getItem(LS_ON) === '1'; } catch (_) { return false; } };
  const setOn = v => { try { localStorage.setItem(LS_ON, v ? '1' : '0'); } catch (_) {} };

  /* Núgildandi tala: yfirskrift ef til, annars það sem ars-simi-vars.css segir. */
  function gildi(b) {
    const yfir = document.documentElement.style.getPropertyValue(b.v).trim();
    const s = yfir || getComputedStyle(document.documentElement).getPropertyValue(b.v).trim();
    const n = parseFloat(s);
    return isNaN(n) ? b.sjalf : n;
  }
  const breytt = () => ALLAR.filter(b => document.documentElement.style.getPropertyValue(b.v).trim());

  /* ── Stílar ────────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById('_hh-css')) return;
    const s = document.createElement('style');
    s.id = '_hh-css';
    s.textContent = [
      '#_hh-panel{position:fixed;left:0;right:0;bottom:0;z-index:2147483400;background:#16181c;color:#e8e6e2;',
        'font:13px/1.35 "IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif;',
        'max-height:52vh;display:flex;flex-direction:column;box-shadow:0 -12px 34px -18px rgba(0,0,0,.8)}',
      '#_hh-hd{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #2a2d33;flex:none}',
      '#_hh-tt{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#9aa3b0}',
      '#_hh-val{font-size:12.5px;font-weight:600;color:#e8e6e2}',
      '#_hh-x{margin-left:auto;min-width:40px;min-height:40px;border:0;background:none;color:#9aa3b0;font-size:19px;cursor:pointer}',
      '#_hh-body{overflow-y:auto;padding:6px 12px 10px;flex:1 1 auto;-webkit-overflow-scrolling:touch}',
      '._hh-row{display:flex;align-items:center;gap:10px;padding:5px 0}',
      '._hh-lbl{flex:0 0 96px;font-size:12px;color:#b9c0c9}',
      '._hh-sl{flex:1;min-height:40px;accent-color:#5980a6;background:transparent}',
      '._hh-num{flex:0 0 56px;text-align:right;font:600 12.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:#e8e6e2}',
      '#_hh-css-out{margin:8px 0 0;padding:9px 10px;background:#0e1013;border:1px solid #2a2d33;border-radius:3px;',
        'font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#a8d0a8;white-space:pre;overflow-x:auto}',
      '#_hh-ft{display:flex;gap:8px;padding:9px 12px;border-top:1px solid #2a2d33;flex:none;align-items:center}',
      '._hh-b{min-height:40px;padding:9px 14px;border-radius:3px;cursor:pointer;font-size:12.5px;font-weight:600;',
        'background:none;border:1px solid #3a3f47;color:#c8cfd8}',
      '._hh-b.adal{background:#5980a6;border-color:#5980a6;color:#fff;margin-left:auto}',
      '._hh-b.lit{min-height:30px;padding:5px 10px;font-size:11.5px}',
      /* Valið stak fær rofna útlínu — engin litafylling, ekkert hopp. */
      '._hh-valid{outline:1px dashed rgba(89,128,166,.55) !important;outline-offset:-1px}',
      /* Plássið undir panelnum er SETT MEÐ JS (sjá rymi()), ekki hér:
         .view-padding er stimplað INLINE af pinPad() og inline !important
         slær stílblaðs-!important. Mælt 29.08: reglan hér skilaði 64px
         þar sem hún bað um 52vh. Sjá .claude/agents/joker.md. */
      '#_hh-panel .hidden{display:none}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ── Panell ────────────────────────────────────────────────────────────── */
  let synHopur = null;   // null = allir hópar

  function cssBlokk() {
    const b = breytt();
    if (!b.length) return '/* engu breytt enn */';
    return b.map(x => '  ' + x.v + ': ' + fmt(x, gildi(x)) + ';').join('\n');
  }
  const fmt = (b, n) => (b.skref ? n : Math.round(n)) + 'px';

  function teikna() {
    const p = document.getElementById('_hh-panel'); if (!p) return;
    const hopar = synHopur ? HOPAR.filter(h => h.syn === synHopur) : HOPAR;
    p.querySelector('#_hh-tt').textContent = synHopur
      ? (HOPAR.find(h => h.syn === synHopur) || {}).heiti : 'Hönnunarhamur';
    p.querySelector('#_hh-val').textContent = synHopur ? '· pikkaðu utan til að sýna allt' : '';
    p.querySelector('#_hh-body').innerHTML =
      hopar.map(h => (synHopur ? '' : '<div class="_hh-lbl" style="flex:none;margin:8px 0 2px;color:#7f8894;font-size:11px;'
        + 'text-transform:uppercase;letter-spacing:.05em">' + h.heiti + '</div>')
        + h.breytur.map(b => {
          const g = gildi(b);
          return '<div class="_hh-row"><label class="_hh-lbl" for="hh_' + b.v.slice(2) + '">' + b.m + '</label>'
            + '<input class="_hh-sl" id="hh_' + b.v.slice(2) + '" type="range" data-v="' + b.v + '" '
            + 'min="' + b.min + '" max="' + b.max + '" step="' + (b.skref || 1) + '" value="' + g + '">'
            + '<span class="_hh-num" data-num="' + b.v + '">' + fmt(b, g) + '</span></div>';
        }).join('')).join('')
      + '<pre id="_hh-css-out">' + esc(cssBlokk()) + '</pre>';
    tengjaSleda(p);
    // Hæð panelsins breytist þegar hópur er valinn — og við fyrstu teikningu
    // er hann enn tómur. Mælt 29.08: rými varð 40px meðan panellinn var 439px.
    requestAnimationFrame(() => rymi(true));
  }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function tengjaSleda(p) {
    p.querySelectorAll('._hh-sl').forEach(sl => {
      const uppf = () => {
        const b = finna(sl.dataset.v); if (!b) return;
        const n = parseFloat(sl.value);
        // Beint í :root — þess vegna sést það samstundis á öllum röðunum.
        document.documentElement.style.setProperty(b.v, fmt(b, n));
        const num = p.querySelector('[data-num="' + b.v + '"]');
        if (num) num.textContent = fmt(b, n);
        const out = p.querySelector('#_hh-css-out');
        if (out) out.textContent = cssBlokk();
      };
      sl.addEventListener('input', uppf);
      sl.addEventListener('change', uppf);
    });
  }

  /* Pikk á stak → sýna aðeins breyturnar sem eiga við það. */
  function velja(e) {
    if (!on()) return;
    const p = document.getElementById('_hh-panel');
    if (p && p.contains(e.target)) return;
    const t = e.target.closest('._bil-card, ._arsm-row, ._arsm-name');
    document.querySelectorAll('._hh-valid').forEach(x => x.classList.remove('_hh-valid'));
    if (!t) { synHopur = null; teikna(); return; }
    e.preventDefault(); e.stopPropagation();
    t.classList.add('_hh-valid');
    synHopur = t.classList.contains('_bil-card') ? 'spjald'
             : t.classList.contains('_arsm-name') ? 'bord' : 'dalkar';
    teikna();
  }

  /* ── Vistun í AppSettings — EIGIN lykill, aldrei arsskodun_customers ───── */
  async function vista(btn) {
    const b = breytt();
    if (!b.length) { alert('Engu hefur verið breytt.'); return; }
    const gogn = {};
    b.forEach(x => { gogn[x.v] = fmt(x, gildi(x)); });
    if (!window.AppSettings || !AppSettings.save) { alert('AppSettings ekki tiltækt'); return; }
    btn.disabled = true;
    const ok = await AppSettings.save({ [AS_KEY]: gogn });
    btn.disabled = false;
    alert(ok ? 'Vistað — gildir á öllum tækjum sem nota þetta app.' : 'Vistun mistókst');
  }

  function beita(gogn) {
    if (!gogn) return;
    Object.keys(gogn).forEach(v => {
      if (finna(v)) document.documentElement.style.setProperty(v, gogn[v]);
    });
  }

  function endurstilla() {
    ALLAR.forEach(b => document.documentElement.style.removeProperty(b.v));
    teikna();
  }

  /* Panellinn má ekki hylja neðstu röðina. #ars-main er skrunkassinn; hann er
     ekki stimplaður inline af pinPad, svo hér dugar bein stilling. Upprunalega
     gildið er geymt svo loka() skili því nákvæmlega til baka. */
  let _rymiAdur = null;
  function rymi(kveikja) {
    const m = document.getElementById('ars-main')
          || document.querySelector('#view-arsskodun ._bil-wrap');
    if (!m) return;
    if (kveikja) {
      if (_rymiAdur === null) _rymiAdur = m.style.paddingBottom || '';
      const h = (document.getElementById('_hh-panel') || {}).offsetHeight || 0;
      m.style.paddingBottom = (h + 16) + 'px';
    } else if (_rymiAdur !== null) {
      m.style.paddingBottom = _rymiAdur;
      _rymiAdur = null;
    }
  }

  function opna() {
    css();
    if (document.getElementById('_hh-panel')) return;
    const p = document.createElement('div');
    p.id = '_hh-panel';
    p.innerHTML =
      '<div id="_hh-hd"><span id="_hh-tt">Hönnunarhamur</span><span id="_hh-val"></span>'
      + '<button id="_hh-x" type="button" title="Loka">✕</button></div>'
      + '<div id="_hh-body"></div>'
      + '<div id="_hh-ft"><button type="button" class="_hh-b lit" id="_hh-reset">Endurstilla</button>'
      + '<button type="button" class="_hh-b" id="_hh-copy">Afrita CSS</button>'
      + '<button type="button" class="_hh-b adal" id="_hh-save">Vista stillingar</button></div>';
    document.body.appendChild(p);
    document.body.classList.add('_hh-on');
    teikna();
    p.querySelector('#_hh-x').addEventListener('click', loka);
    p.querySelector('#_hh-reset').addEventListener('click', endurstilla);
    p.querySelector('#_hh-save').addEventListener('click', e => vista(e.currentTarget));
    p.querySelector('#_hh-copy').addEventListener('click', async e => {
      const txt = ':root {\n' + cssBlokk() + '\n}';
      try { await navigator.clipboard.writeText(txt); e.currentTarget.textContent = 'Afritað ✓';
        setTimeout(() => { e.currentTarget.textContent = 'Afrita CSS'; }, 1600); }
      catch (_) { alert(txt); }
    });
    document.addEventListener('click', velja, true);
  }

  function loka() {
    rymi(false);
    const p = document.getElementById('_hh-panel'); if (p) p.remove();
    document.body.classList.remove('_hh-on');
    document.querySelectorAll('._hh-valid').forEach(x => x.classList.remove('_hh-valid'));
    document.removeEventListener('click', velja, true);
    synHopur = null;
    setOn(false);
    takki();
  }

  /* ── Takki í Ársskoðun ─────────────────────────────────────────────────── */
  function takki() {
    const v = document.getElementById('view-arsskodun');
    if (!v || !v.classList.contains('active')) return;
    let b = v.querySelector('#_hh-toggle');
    if (!b) {
      const anchor = v.querySelector('#_bil-toggle') || v.querySelector('._ars-filterstrip');
      if (!anchor) return;
      b = document.createElement('button');
      b.id = '_hh-toggle'; b.type = 'button';
      b.style.cssText = 'min-height:40px;padding:8px 13px;border-radius:3px;cursor:pointer;margin:0 0 8px 6px;'
        + 'background:#fff;border:1px solid #e0ddd7;color:#5d5a54;font-weight:600;font-size:12.5px';
      b.addEventListener('click', e => {
        e.preventDefault();
        if (on()) { loka(); } else { setOn(true); opna(); }
        merkja();
      });
      anchor.parentNode.insertBefore(b, anchor.nextSibling);
    }
    const merkja = () => { b.textContent = on() ? '✕ Loka hönnun' : '⚙ Hönnunarhamur'; };
    merkja();
  }

  /* Vistuð gildi gilda ALLTAF — líka þegar hönnunarhamur er slökktur.
     Það er tilgangurinn: Agnar stillir einu sinni, allir fá það. */
  function sækja() {
    try {
      const g = window.AppSettings && AppSettings.path && AppSettings.path(AS_KEY);
      if (g) beita(g);
    } catch (_) {}
  }

  function vakta() { sækja(); takki(); if (on()) opna(); }
  document.addEventListener('slokk-viewmode', vakta);
  new MutationObserver(() => { clearTimeout(window.__hhT); window.__hhT = setTimeout(vakta, 300); })
    .observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.Honnunarhamur = { opna, loka, endurstilla, version: 'v1' };
  console.log('[patch-318] honnunarhamur ready');
})();
/* === END HÖNNUNARHAMUR === */
