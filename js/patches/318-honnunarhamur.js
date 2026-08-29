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
  const IN_DEVFRAME = !!(new URLSearchParams(location.search).get('devframe'));

  function pageRoot() {
    try {
      if (window.SlokkDevFrame && typeof SlokkDevFrame.iframe === 'function') {
        const f = SlokkDevFrame.iframe();
        if (f && f.contentDocument && f.contentDocument.documentElement)
          return f.contentDocument.documentElement;
      }
    } catch (_) {}
    return document.documentElement;
  }
  function pageDoc() {
    const r = pageRoot();
    return (r && r.ownerDocument) || document;
  }

  /* Breyturnar sem má stilla, hópaðar eftir því hvað þær snerta. `syn` ræður
     hvaða hópur birtist þegar stak er valið með pikki. */
  const HOPAR = [
    { syn: 'bord', heiti: 'Borð · röð', vidmid: '._arsm-row', breytur: [
      { v: '--ars-rad-haed',      m: 'Raðhæð',        min: 36, max: 96,  sjalf: 52 },
      { v: '--ars-nafn-dalkur',   m: 'Nafndálkur',    min: 90, max: 260, sjalf: 150 },
      { v: '--ars-nafn-letur',    m: 'Nafnletur',     min: 10, max: 20,  sjalf: 12.5, skref: .5 },
      { v: '--ars-undirtexti',    m: 'Undirtexti',    min: 7,  max: 14,  sjalf: 9.5,  skref: .5 },
      { v: '--ars-haus-haed',     m: 'Haushæð',       min: 26, max: 60,  sjalf: 38 }
    ] },
    { syn: 'dalkar', heiti: 'Borð · dálkar', vidmid: '._arsm-row', breytur: [
      { v: '--ars-col-man',    m: 'Mán',    min: 34, max: 110, sjalf: 56 },
      { v: '--ars-col-ar',     m: 'Ár',     min: 60, max: 180, sjalf: 112 },
      { v: '--ars-col-taeki',  m: 'Tæki',   min: 50, max: 160, sjalf: 96 },
      { v: '--ars-col-akstur', m: 'Akstur', min: 36, max: 110, sjalf: 60 },
      { v: '--ars-col-stada',  m: 'Staða',  min: 34, max: 100, sjalf: 52 },
      { v: '--ars-col-virdi',  m: 'Virði',  min: 50, max: 160, sjalf: 84 },
      { v: '--ars-col-sidast', m: 'Síðast', min: 50, max: 150, sjalf: 78 },
      { v: '--ars-col-nota',   m: 'Nóta',   min: 60, max: 260, sjalf: 130 }
    ] },
    { syn: 'spjald', heiti: 'Spjald · bílstjóri', vidmid: '._bil-card', breytur: [
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
    const yfir = pageRoot().style.getPropertyValue(b.v).trim();
    const s = yfir || getComputedStyle(pageRoot()).getPropertyValue(b.v).trim();
    const n = parseFloat(s);
    return isNaN(n) ? b.sjalf : n;
  }
  const breytt = () => ALLAR.filter(b => pageRoot().style.getPropertyValue(b.v).trim());

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
      '#_hh-panel._hh-frame{position:absolute;inset:0;max-height:none;height:100%;width:100%;box-shadow:none;z-index:1;border-radius:14px}',
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
    // Sýna AÐEINS hópa sem eiga sér stak á skjánum. Í spjaldtölvuham (table)
    // teiknast skjáborðstaflan, ekki ._arsm-row — borð-sleðarnir hefðu þá
    // ekkert að stilla og litið út fyrir að vera bilaðir. Mælt 29.08 við
    // 1112x834: ._arsm-row = 0, skjáborðstaflan = 1.
    // Tilvist DUGAR EKKI: ._arsm-row er áfram í DOM-inu þegar bílstjórasýnin
    // felur #ars-main með display:none. Mælt 29.08 — spjaldaham sýndi áfram
    // 13 borð-sleða. Krefjumst þess að stakið hafi RAUNVERULEGA stærð.
    const til = h => {
      if (!h.vidmid) return true;
      const e = pageDoc().querySelector(h.vidmid);
      return !!(e && e.getBoundingClientRect().height > 0);
    };
    let hopar = (synHopur ? HOPAR.filter(h => h.syn === synHopur) : HOPAR).filter(til);
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
      + (hopar.length ? '' : '<div style="padding:18px 2px;color:#9aa3b0;font-size:12.5px;line-height:1.5">'
          + 'Engar stillanlegar stærðir á þessum skjá.<br>Sleðarnir stilla símaútlitið — '
          + 'skiptu í 📱 Sími eða kveiktu á 🚚 Bílstjóra.</div>')
      + '<pre id="_hh-css-out">' + esc(cssBlokk()) + '</pre>';
    tengjaSleda(p);
  }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function tengjaSleda(p) {
    p.querySelectorAll('._hh-sl').forEach(sl => {
      const uppf = () => {
        const b = finna(sl.dataset.v); if (!b) return;
        const n = parseFloat(sl.value);
        // Beint í :root — þess vegna sést það samstundis á öllum röðunum.
        pageRoot().style.setProperty(b.v, fmt(b, n));
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
    const t = e.target.closest && e.target.closest('._bil-card, ._arsm-row, ._arsm-name');
    pageDoc().querySelectorAll('._hh-valid').forEach(x => x.classList.remove('_hh-valid'));
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
      if (finna(v)) pageRoot().style.setProperty(v, gogn[v]);
    });
  }

  function endurstilla() {
    ALLAR.forEach(b => pageRoot().style.removeProperty(b.v));
    teikna();
  }

  /* Panellinn má ekki hylja neðstu röðina. #ars-main er skrunkassinn; hann er
     ekki stimplaður inline af pinPad, svo hér dugar bein stilling. Upprunalega
     gildið er geymt svo loka() skili því nákvæmlega til baka. */
  let _rymiAdur = null, _ro = null, _settT = null;
  function rymi(kveikja) {
    if (document.getElementById('_hh-panel') && document.getElementById('_hh-panel').classList.contains('_hh-frame'))
      return;
    const m = pageDoc().getElementById('ars-main')
          || pageDoc().querySelector('#view-arsskodun ._bil-wrap');
    if (!m) return;
    if (kveikja) {
      if (_rymiAdur === null) _rymiAdur = m.style.paddingBottom || '';
      const h = (document.getElementById('_hh-panel') || {}).offsetHeight || 0;
      // 'important' er NAUÐSYNLEGT: venjulegur inline-stíll TAPAR fyrir
      // stílblaði með !important. Mælt 29.08 — inline sagði 455px meðan
      // reiknað gildi var 40px. Aðeins inline !important vinnur á því.
      m.style.setProperty('padding-bottom', (h + 16) + 'px', 'important');
    } else if (_rymiAdur !== null) {
      m.style.removeProperty('padding-bottom');
      if (_rymiAdur) m.style.paddingBottom = _rymiAdur;
      _rymiAdur = null;
    }
  }

  let veljaDoc = null;
  function bindVelja(d) {
    if (veljaDoc) {
      try { veljaDoc.removeEventListener('click', velja, true); } catch (_) {}
    }
    veljaDoc = d || null;
    if (veljaDoc) veljaDoc.addEventListener('click', velja, true);
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
    const host = document.getElementById('_devframe-editor');
    if (host) {
      p.classList.add('_hh-frame');
      host.appendChild(p);
    } else {
      document.body.appendChild(p);
    }
    document.body.classList.add('_hh-on');
    teikna();
    p.querySelector('#_hh-x').addEventListener('click', loka);
    p.querySelector('#_hh-reset').addEventListener('click', endurstilla);
    p.querySelector('#_hh-save').addEventListener('click', e => vista(e.currentTarget));
    p.querySelector('#_hh-copy').addEventListener('click', async e => {
      const txt = ':root {\n' + cssBlokk() + '\n}';
      try { await navigator.clipboard.writeText(txt); e.currentTarget.textContent = 'Afritað';
        setTimeout(() => { e.currentTarget.textContent = 'Afrita CSS'; }, 1600); }
      catch (_) { alert(txt); }
    });
    bindVelja(pageDoc());
    /* ResizeObserver frekar en handvirkt kall: teikna() keyrir aðeins einu
       sinni (opna() hættir strax ef panellinn er til), og við fyrstu teikningu
       er hann 24px hár. Mælt 29.08: rýmið sat fast í 40px meðan panellinn var
       439px, svo neðsta röðin lá undir honum. Athugarinn fylgir hæðinni hvort
       sem hún breytist við teikningu eða hópaval. */
    try {
      _ro = new ResizeObserver(() => rymi(true));
      _ro.observe(p);
    } catch (_) { rymi(true); }
  }

  function loka() {
    if (_ro) { try { _ro.disconnect(); } catch (_) {} _ro = null; }
    rymi(false);
    const p = document.getElementById('_hh-panel');
    const framed = !!(p && p.classList.contains('_hh-frame'));
    if (p) p.remove();
    document.body.classList.remove('_hh-on');
    try { pageDoc().querySelectorAll('._hh-valid').forEach(x => x.classList.remove('_hh-valid')); } catch (_) {}
    bindVelja(null);
    synHopur = null;
    if (!framed) { setOn(false); takki(); }
  }

  function syncFrame() {
    if (IN_DEVFRAME) return;
    const host = document.getElementById('_devframe-editor');
    if (!host) {
      const p = document.getElementById('_hh-panel');
      if (p && p.classList.contains('_hh-frame')) loka();
      return;
    }
    let ars = false;
    try {
      const f = window.SlokkDevFrame && SlokkDevFrame.iframe && SlokkDevFrame.iframe();
      const src = (f && f.src) || '';
      ars = /page=arsskodun|arsview=|#arsskodun/.test(src);
      if (!ars && f && f.contentDocument) {
        const v = f.contentDocument.getElementById('view-arsskodun');
        ars = !!(v && v.classList.contains('active'));
      }
    } catch (_) {}
    if (!ars) {
      if (!host.querySelector('#_hh-panel')) {
        host.innerHTML = '<div id="_hh-hint" style="padding:18px 16px;color:#9aa3b0;font:13px/1.5 \'IBM Plex Sans\',sans-serif">Hönnunarsleðar fyrir Fyrirtæki í þjónustu birtast hér. Veldu síðuna og svo Stjórnun eða Bílstjóri uppi.</div>';
      }
      return;
    }
    const hint = host.querySelector('#_hh-hint');
    if (hint) hint.remove();
    if (!document.getElementById('_hh-panel')) opna();
    else {
      const p = document.getElementById('_hh-panel');
      if (p.parentNode !== host) { p.classList.add('_hh-frame'); host.appendChild(p); }
      bindVelja(pageDoc());
      teikna();
    }
  }

  /* ── Takki í Ársskoðun ─────────────────────────────────────────────────── */
  function takki() {
    if (IN_DEVFRAME) return;
    if (document.getElementById('_devframe-editor')) return;
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

  function vakta() {
    sækja();
    if (IN_DEVFRAME) return;
    if (document.getElementById('_devframe-editor')) {
      syncFrame();
      return;
    }
    takki();
    if (!on()) return;
    if (!document.getElementById('_hh-panel')) opna();
  }

  /* MutationObserver á body náði EKKI skiptunum milli borðs og spjalda —
     mælt 29.08: 0 endurteikningar á 2,5 sek meðan panellinn sýndi hópinn sem
     var horfinn. Í stað þess að elta DOM-atburði les þetta ÁSTANDIÐ sjálft
     og teiknar aðeins þegar undirskriftin breytist — sjálfleiðréttandi. */
  let _sidastaUndirskrift = '';
  function fylgjast() {
    if (!document.getElementById('_hh-panel')) return;
    const framed = !!document.querySelector('#_hh-panel._hh-frame');
    if (!on() && !framed) return;
    const sest = sel => { const e = pageDoc().querySelector(sel); return !!(e && e.getBoundingClientRect().height > 0); };
    const u = (sest('._arsm-row') ? 'b' : '') + (sest('._bil-card') ? 's' : '') + '|' + synHopur;
    if (u === _sidastaUndirskrift) return;
    _sidastaUndirskrift = u;
    teikna();
  }
  setInterval(fylgjast, 700);
  document.addEventListener('slokk-viewmode', vakta);
  new MutationObserver(() => { clearTimeout(window.__hhT); window.__hhT = setTimeout(vakta, 300); })
    .observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.Honnunarhamur = { opna, loka, endurstilla, syncFrame, version: 'v1.1' };
  console.log('[patch-318] honnunarhamur ready');
})();
/* === END HÖNNUNARHAMUR === */
