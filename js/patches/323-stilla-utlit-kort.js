/* === STILLA ÚTLIT v2 — VERKFÆRASPJÖLD SVÆÐANNA (323) ========================
 *
 * Hönnun Agnars 26.08 („Stilla Utlit Panel v2"). Stílstjórinn (262) er umgjörðin
 * — svæða-kortið og þrepin — og ÞESSI patch á spjöldin sem opnast þegar smellt er
 * á svæði í kortinu:
 *
 *     Haus        → STILLA HAUS        (hæð, bakgrunnur, klukka, hnappar)
 *     Talnaspjöld → STILLA TALNASPJÖLD (hvaða spjöld, röð, stærð, upphæðir)
 *     Síur        → STILLA SÍUR        (sýnilegar síur, mánaðaröðin, muna val)
 *     Taflan      → STILLA TÖFLU       (letur, línuhæð, þéttleiki, dálkar, raðir)
 *
 * HVERS VEGNA SPJÖLD EN EKKI SLEÐAR:
 * Gamla útgáfan bauð upp á hráa CSS-sleða á hvaða element sem var. Það þýddi að
 * einfaldasta verkið („lækka bannerinn", „fela síu sem ég nota aldrei") krafðist
 * þess að notandinn vissi HVAÐA element bar hæðina og HVAÐA CSS-eigind stýrði
 * henni. Spjöldin snúa þessu við: þau bjóða upp á það sem svæðið raunverulega
 * getur, á íslensku, og þýða það sjálf yfir í rétta staðinn.
 *
 * GEYMSLA: engin ný. Stillingarnar liggja per síðu inni í `page_editor_v1_json`
 * gegnum PageEditor.zoneCfg/setZoneCfg — samstillast því milli tækja og fljóta
 * með „Vista síðu"/Útgáfum eins og allt annað útlit.
 *
 * BEITING: bannerhæð, faldar síur og KPI-spjöld búa á DOM-inu sjálfu, ekki í
 * CSS-reglum Stílstjórans. `pe-zones-apply` (262) kallar því á applier-ana hér
 * í hvert sinn sem stillingum er breytt, síða skipt eða appið endurteiknar.
 * ========================================================================== */
(() => {
  if (window.__stillaUtlitKort323) return;
  window.__stillaUtlitKort323 = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SHEET = '_pe-zones-css';
  const view = () => document.querySelector('.view.active');
  const vid = () => { const v = view(); return (v && v.id) || 'all'; };
  function sheet() {
    let s = document.getElementById(SHEET);
    if (!s) { s = document.createElement('style'); s.id = SHEET; (document.head || document.documentElement).appendChild(s); }
    return s;
  }
  function toast(m) { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} }

  /* ══ 1 · HAUS ══════════════════════════════════════════════════════════════
   * Bannerinn (#bstal-banner, patch 230) er með hæðina HARÐKÓÐAÐA á fimm stöðum
   * í fimm skrám (230 ×2, 314-simi-compact-layer, css/mobile.css, 261). Við
   * eltum ekki þær reglur uppi — við skrifum eitt blað sem situr síðast og
   * vinnur þær allar með !important. Sama gildir um `.view.active{padding-top}`
   * sem heldur efninu neðan við bannerinn: hún verður að fylgja hæðinni,
   * annars myndast gat (eða efnið fer undir bannerinn).
   * ------------------------------------------------------------------------ */
  const HEIGHTS = { falinn: 0, mjor: 54, fullur: 134 };
  const HAUS_BG = [
    ['eldur',  'Eldur (sjálfgefið)', null],
    ['nott',   'Nótt',               'linear-gradient(180deg,#101a33,#0a1224)'],
    ['kol',    'Kol',                'linear-gradient(180deg,#1a1a1e,#0a0a0c)'],
    ['ljost',  'Ljóst',              'linear-gradient(180deg,#f4f1ea,#e4ded1)'],
  ];
  function hausDefaults(c) {
    return {
      h: c.h || 'fullur',
      bg: c.bg || 'eldur',
      klukka: c.klukka !== false,
      hnappar: c.hnappar !== false,
    };
  }
  const HAUS = {
    render(cfg, api) {
      const c = hausDefaults(cfg);
      const sw = HAUS_BG.map(b =>
        '<button type="button" class="pe-chip" data-haus-bg="' + b[0] + '" title="' + esc(b[1]) + '" style="' +
          'min-width:0;width:44px;height:34px;padding:0;border-radius:8px;' +
          (b[2] ? 'background:' + b[2] + ';' : 'background:linear-gradient(180deg,#c2410c,#7c2d12);') +
          (c.bg === b[0] ? 'outline:3px solid #2563eb;outline-offset:1px;' : '') +
        '"></button>').join('');
      return api.head('Stilla haus') +
        api.row('Hæð', api.seg([['falinn', 'Falinn'], ['mjor', 'Mjór borði'], ['fullur', 'Fullur']], c.h, 'data-haus-h')) +
        api.row('Bakgrunnur', '<div class="pe-xwrap">' + sw + '</div>') +
        api.row('Klukka & kassakerfi', api.sw(c.klukka, 'data-haus-klukka')) +
        api.row('Sími · tafla · skjár hnappar', api.sw(c.hnappar, 'data-haus-hnappar')) +
        '<div class="pe-sub">Gildir á þessari síðu — bannerinn skiptir um svip þegar þú ferð á milli.</div>';
    },
    wire(root, cfg, api) {
      root.querySelectorAll('[data-haus-h]').forEach(b => b.onclick = () => api.set({ h: b.dataset.hausH }));
      root.querySelectorAll('[data-haus-bg]').forEach(b => b.onclick = () => api.set({ bg: b.dataset.hausBg }));
      const k = root.querySelector('[data-haus-klukka]');
      if (k) k.onclick = () => api.set({ klukka: !hausDefaults(cfg).klukka });
      const h = root.querySelector('[data-haus-hnappar]');
      if (h) h.onclick = () => api.set({ hnappar: !hausDefaults(cfg).hnappar });
    },
  };
  // ⚠️ SÉRTÆKNI (specificity), ekki bara !important:
  // Bannerinn er stilltur á fimm stöðum og sumar þeirra reglna eru sértækari en
  // einfalt `#bstal-banner` — t.d. `html[data-viewmode="mobile"] #bstal-banner`
  // í 314-simi-compact-layer (auðkenni + eigind). Staðfest í vafra 27.08: appið
  // situr í data-viewmode="mobile" jafnvel á 1280px skjá, svo sú regla vann og
  // „Mjór borði" gerði EKKERT. Báðar reglur eru !important — þá ræður sértækni.
  // Þess vegna er auðkennið TVÍTEKIÐ (#x#x = tvö auðkenni) og `html body` sett
  // framan við: það vinnur allar fimm reglurnar án þess að við þurfum að elta
  // þær uppi eða breyta þeim.
  // Sama gildir um padding-top á síðunni, sem verður að fylgja bannerhæðinni.
  // `css/mobile.css:224` blæs upp sína sértækni VILJANDI með gervi-auðkennum
  // (`:not(#_a):not(#_b):not(#_c):not(#_d)` = fjögur auðkenni) til að vinna
  // þema-reglurnar. Við notum sama stílbragð einu þrepi ofar (sex auðkenni) —
  // það er idíóm sem er þegar til í þessum kóðabasa, ekki nýtt trix.
  const B = 'html body #bstal-banner#bstal-banner';
  const PAD = ':not(#_p1):not(#_p2):not(#_p3)';
  const VIEWS = 'html body .view.active:not(#view-field):not(#view-counter):not(#view-workshop)' + PAD;
  const VIEWS3 = 'html body #view-field.active' + PAD + ',html body #view-counter.active' + PAD +
                 ',html body #view-workshop.active' + PAD;
  function hausCss(cfg) {
    const c = hausDefaults(cfg);
    let css = '';
    if (c.h === 'falinn') {
      // Bannerinn hverfur — en efnið verður að renna upp í staðinn, annars situr
      // 148px af tómu plássi eftir efst á síðunni.
      css += B + ',html body #bstal-ember#bstal-ember{display:none!important}\n';
      css += VIEWS + '{padding-top:16px!important}\n';
    } else if (c.h === 'mjor') {
      const H = HEIGHTS.mjor;
      css += B + '{height:' + H + 'px!important}\n';
      css += B + ' .bb-flames{height:' + (H + 6) + 'px!important}\n';
      css += B + ' .bb-logo img{height:26px!important}\n';
      css += B + ' .bb-clock{font-size:18px!important}\n';
      css += B + ' .bb-date,' + B + ' .bb-eyebrow{font-size:8.5px!important}\n';
      css += 'html body #bstal-ember#bstal-ember{display:none!important}\n';
      css += VIEWS + '{padding-top:' + (H + 14) + 'px!important}\n';
      css += VIEWS3 + '{padding-top:' + (H + 18) + 'px!important}\n';
    }
    const bg = HAUS_BG.filter(b => b[0] === c.bg)[0];
    if (bg && bg[2]) {
      // Logarnir eru mynd ofan á andlitinu — þeir verða að víkja svo nýi
      // bakgrunnurinn sjáist yfirhöfuð.
      css += B + ' .bb-face{background:' + bg[2] + '!important}\n';
      css += B + ' .bb-flames{opacity:0!important}\n';
    }
    if (!c.klukka) css += B + ' .bb-clockbox{display:none!important}\n';
    if (!c.hnappar) css += B + ' .bb-rightwrap>*:not(.bb-clockbox){display:none!important}\n';
    hausPad(c);
    return css;
  }
  // Í síma-/appham stimpla 314 (`pinPad`) og mobilenav.js padding-top BEINT á
  // hvert .view sem inline !important — og engin stílblaðsregla vinnur inline
  // !important, sama hversu sértæk hún er (staðfest í vafra 27.08: bannerinn
  // mjókkaði en 86px gatið sat eftir). Báðar skrár lesa nú `__peBannerPad`, svo
  // hér er nóg að setja töluna og stimpla hana strax; næsta `pinPad`-keyrsla
  // reiknar sama gildi og því verður ekkert flökt.
  function hausPad(c) {
    const mobile = document.documentElement.getAttribute('data-viewmode') === 'mobile';
    const app = !!(document.body && document.body.classList.contains('appmode'));
    if (app || !mobile) { window.__peBannerPad = null; return; }
    const pad = c.h === 'falinn' ? '16px' : c.h === 'mjor' ? (HEIGHTS.mjor + 12) + 'px' : null;
    window.__peBannerPad = pad;               // null ⇒ 314/mobilenav nota 86px
    const want = pad || '86px';
    document.querySelectorAll('.view').forEach(v => {
      if (v.style.getPropertyValue('padding-top') !== want) v.style.setProperty('padding-top', want, 'important');
    });
  }

  /* ══ 2 · TALNASPJÖLD (KPI) ═════════════════════════════════════════════════
   * `._ars-statgrid` er fjögur bókstafleg <div> í einni stórri template-streng
   * í 153 — ekkert fylki, engin id. Við auðkennum spjöldin því á YFIRSKRIFTINNI
   * sem stendur á þeim (FJÖLDI / BÚIÐ 2026 / …), lesinni beint af síðunni. Það
   * þýðir að spjöldin í panelnum heita alltaf það sama og spjöldin á skjánum,
   * og röðun/felun lifir af þótt 153 bæti við fimmta spjaldinu síðar.
   * ------------------------------------------------------------------------ */
  function kpiGrid() { const v = view(); return v && v.querySelector('._ars-statgrid, .statgrid, .kpi-grid, .stats'); }
  function kpiCards() {
    const g = kpiGrid(); if (!g) return [];
    return Array.prototype.slice.call(g.children).filter(el => el.nodeType === 1).map((el, i) => {
      const t = (el.textContent || '').trim().split('\n')[0].trim();
      return { el, i, label: (t || ('Spjald ' + (i + 1))).slice(0, 22) };
    });
  }
  const KPI_SIZE = { sm: { pad: 7, num: 19 }, md: null, lg: { pad: 18, num: 34 } };
  const KPI = {
    render(cfg, api) {
      const cards = kpiCards();
      if (!cards.length) return api.head('Stilla talnaspjöld') + '<div class="pe-sub">Engin talnaspjöld á þessari síðu.</div>';
      const hide = cfg.hide || {};
      const order = (cfg.order && cfg.order.length) ? cfg.order : cards.map(c => c.label);
      const sorted = order.map(l => cards.filter(c => c.label === l)[0]).filter(Boolean)
        .concat(cards.filter(c => order.indexOf(c.label) < 0));
      const chips = sorted.map(c =>
        '<span class="pe-xchip' + (hide[c.label] ? ' off' : '') + '" draggable="true" data-kpi="' + esc(c.label) + '">' +
          esc(c.label) +
          '<button type="button" class="pe-xdel" data-kpi-tog="' + esc(c.label) + '" title="' +
            (hide[c.label] ? 'Sýna aftur' : 'Fela spjaldið') + '">' + (hide[c.label] ? '＋' : '✕') + '</button>' +
        '</span>').join('');
      return api.head('Stilla talnaspjöld') +
        '<div class="pe-sub" style="margin-bottom:7px">Spjöld — dragðu til, ✕ felur.</div>' +
        '<div class="pe-xwrap" data-kpi-zone>' + chips + '</div>' +
        api.row('Stærð', api.seg([['sm', 'Lítil röð'], ['md', 'Venjuleg'], ['lg', 'Stór']], cfg.size || 'md', 'data-kpi-size')) +
        api.row('Upphæðir sýnilegar (kr)', api.sw(cfg.kr !== false, 'data-kpi-kr'));
    },
    wire(root, cfg, api) {
      root.querySelectorAll('[data-kpi-tog]').forEach(b => b.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        const l = b.dataset.kpiTog, hide = Object.assign({}, cfg.hide || {});
        if (hide[l]) delete hide[l]; else hide[l] = true;
        api.set({ hide: hide });
      });
      root.querySelectorAll('[data-kpi-size]').forEach(b => b.onclick = () => api.set({ size: b.dataset.kpiSize }));
      const kr = root.querySelector('[data-kpi-kr]');
      if (kr) kr.onclick = () => api.set({ kr: cfg.kr === false });
      dragSort(root.querySelector('[data-kpi-zone]'), '[data-kpi]', 'kpi', names => api.set({ order: names }));
    },
  };
  function kpiApply(cfg) {
    const g = kpiGrid(); if (!g) return '';
    const cards = kpiCards();
    const hide = cfg.hide || {};
    let css = '';
    // Röð + felun með CSS `order`/`display` frekar en að hræra í DOM-inu: 153
    // teiknar þennan streng upp á nýtt við hverja síun og myndi henda hverri
    // DOM-færslu jafnóðum.
    // Sami sértækni-slagur og með bannerinn: `315-fjarmal-app-compact` er með
    // `body.appmode #view-arsskodun ._ars-statgrid > div{padding:8px 10px!important}`
    // og `314-arsskodun-mobile-compact` sínar eigin. Staðfest í vafra 27.08:
    // felun virkaði (engin samkeppni) en STÆRÐ gerði ekkert. Tvítekið auðkenni
    // á sýninni (#view-x#view-x = tvö auðkenni) vinnur þær allar.
    const V = vid();
    const G = 'html body #' + V + '#' + V + ' ._ars-statgrid';
    const order = (cfg.order && cfg.order.length) ? cfg.order : [];
    cards.forEach(c => {
      const n = c.i + 1;
      const base = G + '>*:nth-child(' + n + ')';
      if (hide[c.label]) css += base + '{display:none!important}\n';
      const oi = order.indexOf(c.label);
      if (oi >= 0) css += base + '{order:' + oi + '!important}\n';
    });
    const sz = KPI_SIZE[cfg.size || 'md'];
    if (sz) {
      css += G + '>*{padding:' + sz.pad + 'px!important}\n';
      css += G + '>* div:nth-child(2){font-size:' + sz.num + 'px!important;line-height:1.15!important}\n';
    }
    // „Upphæðir sýnilegar" er skjá-friðhelgi (Agnar sýnir skjáinn á fundum), ekki
    // útlit — talan er því MÖSKUÐ í DOM-inu. Upprunalega gildið geymist á
    // elementinu svo það komi óskaddað til baka þegar kveikt er aftur.
    const maskOff = cfg.kr === false;
    cards.forEach(c => {
      c.el.querySelectorAll('*').forEach(n => {
        if (n.children.length) return;
        const txt = (n.textContent || '');
        const isMoney = /\d[\d.\s]*\s*kr/i.test(txt);
        if (maskOff && isMoney && !n.hasAttribute('data-pe-kr')) {
          n.setAttribute('data-pe-kr', txt); n.textContent = '••••• kr';
        } else if (!maskOff && n.hasAttribute('data-pe-kr')) {
          n.textContent = n.getAttribute('data-pe-kr'); n.removeAttribute('data-pe-kr');
        }
      });
    });
    return css;
  }

  /* ══ 3 · SÍUR ══════════════════════════════════════════════════════════════
   * Stöðu-flöggin (._ars-st[data-status]) eru gagnadrifin í 153, svo hér dugar
   * að fela þau sem eiga ekki að sjást. En falin sía sem hverfur ALVEG er gildra
   * — notandinn man ekki hvað hann faldi. Þau fara því undir „⋯ Fleiri síur",
   * sem er sýnilegur takki í sömu rönd, nákvæmlega eins og í hönnuninni.
   * ------------------------------------------------------------------------ */
  function statusRow() { const v = view(); return v && v.querySelector('._ars-statusrow'); }
  function statusChips() {
    const r = statusRow(); if (!r) return [];
    return Array.prototype.slice.call(r.querySelectorAll('._ars-st[data-status]')).map(el => ({
      el, v: el.dataset.status, label: (el.textContent || el.dataset.status).trim().slice(0, 20),
    }));
  }
  function monthRow() {
    const v = view(); const m = v && v.querySelector('._ars-mo');
    return m ? m.parentElement : null;
  }
  const SIUR = {
    render(cfg, api) {
      const chips = statusChips();
      if (!chips.length) return api.head('Stilla síur') + '<div class="pe-sub">Engar síur á þessari síðu.</div>';
      const hide = cfg.hide || {};
      const shown = chips.filter(c => !hide[c.v]);
      const hidden = chips.filter(c => hide[c.v]);
      const wrap = shown.map(c =>
        '<span class="pe-xchip" data-sia="' + esc(c.v) + '">' + esc(c.label) +
          '<button type="button" class="pe-xdel" data-sia-tog="' + esc(c.v) + '" title="Færa undir „Fleiri síur"">✕</button>' +
        '</span>').join('');
      const more = hidden.length
        ? '<div class="pe-frow" style="margin-top:2px"><span class="pe-flbl"></span><div class="pe-xwrap">' +
            hidden.map(c => '<span class="pe-xchip off" data-sia="' + esc(c.v) + '">' + esc(c.label) +
              '<button type="button" class="pe-xdel" data-sia-tog="' + esc(c.v) + '" title="Sýna alltaf">＋</button></span>').join('') +
          '</div></div>'
        : '';
      return api.head('Stilla síur') +
        '<div class="pe-sub" style="margin-bottom:7px">Sýnilegar síur — ✕ færir undir „Fleiri".' +
          (hidden.length ? ' <b>' + hidden.length + '</b> undir „Fleiri síur".' : '') + '</div>' +
        '<div class="pe-xwrap">' + wrap + '</div>' + more +
        api.row('Mánaðaröðin', api.seg([['hnappar', 'Hnappar'], ['dropdown', 'Dropdown'], ['falin', 'Falin']], cfg.man || 'hnappar', 'data-sia-man')) +
        api.row('Muna valdar síur milli heimsókna', api.sw(cfg.muna !== false, 'data-sia-muna'));
    },
    wire(root, cfg, api) {
      root.querySelectorAll('[data-sia-tog]').forEach(b => b.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        const v = b.dataset.siaTog, hide = Object.assign({}, cfg.hide || {});
        if (hide[v]) delete hide[v]; else hide[v] = true;
        api.set({ hide: hide });
      });
      root.querySelectorAll('[data-sia-man]').forEach(b => b.onclick = () => api.set({ man: b.dataset.siaMan }));
      const mu = root.querySelector('[data-sia-muna]');
      if (mu) mu.onclick = () => api.set({ muna: cfg.muna === false });
    },
  };
  const MORE_ID = '_pe-siur-more';
  function siurApply(cfg) {
    const hide = cfg.hide || {};
    const row = statusRow();
    let css = '';
    const anyHidden = Object.keys(hide).length > 0;
    if (row) {
      const expanded = row.getAttribute('data-pe-more') === 'on';
      Object.keys(hide).forEach(v => {
        if (!expanded) css += '#' + vid() + ' ._ars-st[data-status="' + v.replace(/"/g, '') + '"]{display:none!important}\n';
      });
      // „⋯ Fleiri síur" — settur inn í röndina sjálfa svo faldar síur séu alltaf
      // einum smelli í burtu. 153 teiknar röndina upp á nýtt við hverja síun, svo
      // takkinn er endurgerður hér í hvert sinn sem applier keyrir.
      let btn = row.querySelector('#' + MORE_ID);
      if (anyHidden) {
        if (!btn) {
          btn = document.createElement('button');
          btn.id = MORE_ID; btn.type = 'button';
          btn.style.cssText = 'all:unset;cursor:pointer;font-size:11.5px;font-weight:700;padding:5px 10px;border-radius:8px;border:1px dashed #94a3b8;color:#475569;margin-left:4px';
          btn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            row.setAttribute('data-pe-more', row.getAttribute('data-pe-more') === 'on' ? 'off' : 'on');
            runApply();
          });
          row.appendChild(btn);
        }
        const n = Object.keys(hide).length;
        btn.textContent = expanded ? '⋯ Fela aftur' : '⋯ Fleiri síur (' + n + ')';
      } else if (btn) { btn.remove(); }
    }
    const mr = monthRow();
    if (mr) {
      if (cfg.man === 'falin') mr.style.display = 'none';
      else mr.style.removeProperty('display');
      monthDropdown(mr, cfg.man === 'dropdown');
    }
    // „Muna valdar síur" af ⇒ hreinsa vistaða valið þegar síðan er opnuð, svo
    // næsta heimsókn byrji á hreinu borði. 153 heldur áfram að skrifa í
    // localStorage — við tökum bara ekki við því.
    if (cfg.muna === false && !siurApply._cleared) {
      siurApply._cleared = true;
      try {
        localStorage.removeItem('arsskodun_status');
        localStorage.removeItem('arsskodun_month');
        localStorage.removeItem('arsskodun_months');
      } catch (_) {}
    }
    if (cfg.muna !== false) siurApply._cleared = false;
    return css;
  }
  // Mánaðaröðin sem fellilisti: 12+ flögg í tveimur línum verða ein lína. Við
  // smíðum EKKI nýja síun — valið smellir bara á upprunalega flaggið, svo öll
  // rökfræði 153 helst ósnert.
  function monthDropdown(mr, on) {
    let sel = mr.querySelector('[data-pe-mosel]');
    const chips = Array.prototype.slice.call(mr.querySelectorAll('._ars-mo'));
    if (!on) {
      if (sel) sel.remove();
      chips.forEach(c => c.style.removeProperty('display'));
      return;
    }
    chips.forEach(c => c.style.display = 'none');
    if (!sel) {
      sel = document.createElement('select');
      sel.setAttribute('data-pe-mosel', '1');
      sel.style.cssText = 'font:inherit;font-size:12.5px;font-weight:700;padding:5px 8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155';
      sel.addEventListener('change', () => {
        const t = chips.filter(c => (c.dataset.month || '') === sel.value)[0];
        if (t) t.click();
      });
      mr.appendChild(sel);
    }
    const cur = chips.filter(c => c.classList.contains('on') || c.classList.contains('active'))[0];
    sel.innerHTML = chips.map(c =>
      '<option value="' + esc(c.dataset.month || '') + '"' + (c === cur ? ' selected' : '') + '>' +
        esc((c.textContent || '').trim()) + '</option>').join('');
  }

  /* ══ 4 · TAFLAN ════════════════════════════════════════════════════════════
   * Sama geymsla og 319/322 nota (window.TableLook) — engin ný. Spjaldið bætir
   * við því sem vantaði: dálkalistanum („ítarlegt"), þar sem raða má dálkum,
   * stilla breidd og fela þá með auga, í stað þess að þurfa að hitta á griplínu
   * í töfluhausnum.
   * ------------------------------------------------------------------------ */
  const FONTS = [
    ['', '(sjálfgefið)'],
    ['"Space Grotesk",system-ui,sans-serif', 'Space Grotesk'],
    ['"Public Sans",system-ui,sans-serif', 'Public Sans'],
    ['system-ui,-apple-system,sans-serif', 'Kerfisletur'],
    ['Verdana,Geneva,sans-serif', 'Verdana'],
    ['Georgia,"Times New Roman",serif', 'Georgia'],
    ['ui-monospace,Consolas,monospace', 'Jafnbreitt'],
  ];
  const DENSITY = {
    'Þétt':     { fs: 11, lh: 105, padY: 2 },
    'Miðlungs': { fs: 13, lh: 130, padY: 6 },
    'Rúmgott':  { fs: 15, lh: 155, padY: 11 },
  };
  const FS_MIN = 9, FS_MAX = 22, LH_MIN = 70, LH_MAX = 170, LH_STEP = 5;
  const W_MIN = 40, W_MAX = 520, W_STEP = 20;
  let advOpen = false;

  function pickTable() {
    const v = view(); if (!v) return null;
    const ts = Array.prototype.slice.call(v.querySelectorAll('table'))
      .filter(t => t.offsetWidth > 200 && t.querySelector('tbody td'));
    if (!ts.length) return null;
    return ts.sort((a, b) => b.querySelectorAll('tbody tr').length - a.querySelectorAll('tbody tr').length)[0];
  }
  function tlKey(t) {
    const v = t.closest('.view'); const id = v && v.id; if (!id) return null;
    const cls = t.id ? ('#' + t.id) : (t.classList[0] ? ('.' + t.classList[0]) : '');
    return id + '|' + (cls || 'table');
  }
  function tlEntry(create) {
    const TL = window.TableLook, t = pickTable();
    if (!TL || !t) return null;
    const k = tlKey(t); if (!k) return null;
    const s = TL.get();
    if (!s[k] && !create) return { store: s, key: k, e: {}, table: t };
    s[k] = s[k] || {};
    return { store: s, key: k, e: s[k], table: t };
  }
  function tlWrite(patch) {
    const en = tlEntry(true); if (!en) return;
    Object.keys(patch).forEach(k => {
      const v = patch[k];
      if (v === null || v === '' || v === undefined) delete en.e[k]; else en.e[k] = v;
    });
    window.TableLook.set(en.store);
    rerenderPanel();
  }
  function tlVals() {
    const en = tlEntry(false);
    const t = en && en.table, e = (en && en.e) || {};
    let fs = e.fs, lh = e.lh;
    if (t) {
      const td = t.querySelector('tbody td');
      if (td) {
        const cs = getComputedStyle(td);
        if (!fs) fs = Math.round(parseFloat(cs.fontSize)) || 13;
        if (!lh) {
          const l = parseFloat(cs.lineHeight), f = parseFloat(cs.fontSize);
          lh = (isFinite(l) && isFinite(f) && f > 0) ? Math.round((l / f) * 100) : 130;
        }
      }
    }
    return { fs: fs || 13, lh: lh || 130, ff: e.ff || '', padY: e.padY, e: e, table: t, has: !!t };
  }
  // ── Dálkaröð ──────────────────────────────────────────────────────────────
  // ↕-handfangið var teiknað en aldrei tengt — dautt viðmót, nákvæmlega það sem
  // pirraði mest annars staðar. Röðun á TÖFLU-dálkum er ekki hægt að gera með
  // CSS (`order` virkar ekki á töflufrumur), svo hún er raunveruleg DOM-færsla.
  //
  // Hver dálkur er stimplaður með UPPRUNALEGU sæti sínu (`data-pe-col`) í fyrsta
  // sinn sem hann sést; röðin er geymd sem listi þeirra númera. 153 endurteiknar
  // töfluna við hverja síun, svo applier-inn ber saman DOM-röðina við þá vistuðu
  // og færir aðeins ef þær stangast á — annars væri þetta 500 hnútafærslur á
  // 1,5 sekúndna fresti.
  // ⚠️ HAUS-SÆTI ER EKKI DÁLK-SÆTI.
  // Ársskoðunartaflan: 10 <th> en 13 dálkar — „Skoðanir · skjöl" spannar
  // fjögur ár-spjöld (colspan=4). `th:nth-child(6)` er Skoðun en
  // `td:nth-child(6)` er ár-reitur. Hver sá sem notar SÖMU töluna á hvort
  // tveggja (eins og 319 gerir) felur rangan dálk um leið og einhver haus
  // spannar fleiri en einn. Þess vegna vinnur þetta spjald með HÓPA: hver haus
  // á sitt dálkabil [start, start+span), og bæði felun og röðun fara um það bil.
  function stampCols(t) {
    const ths = Array.prototype.slice.call(t.querySelectorAll('thead th'));
    ths.forEach((th, i) => { if (!th.hasAttribute('data-pe-col')) th.setAttribute('data-pe-col', String(i + 1)); });
    return ths;
  }
  function groupsOf(t) {
    if (!t) return [];
    let start = 1;
    return stampCols(t).map((th, i) => {
      const span = th.colSpan || 1;
      const g = {
        n: +th.getAttribute('data-pe-col'),
        idx: i + 1,                      // sæti hausins NÚNA (fyrir th:nth-child)
        start: start, span: span,
        label: (th.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18) || ('Dálkur ' + (i + 1)),
      };
      start += span;
      return g;
    });
  }
  function colCount(t) { return groupsOf(t).reduce((a, g) => a + g.span, 0); }
  function curOrder(t) {
    return stampCols(t).map(th => +th.getAttribute('data-pe-col'));
  }
  // ⚠️ RÖÐUN ER AÐEINS ÖRUGG Í 1:1-TÖFLUM.
  // Ársskoðunartaflan hefur 10 <th> en 13 <td> í hverri röð — „Skoðanir · skjöl"
  // spannar fleiri en einn dálk. Fyrsta útgáfan færði hausinn en SLEPPTI
  // líkamanum (frumufjöldi stemmdi ekki) og þá sat nafn fyrirtækisins undir
  // ✉-hausnum. Það er nákvæmlega bilunin sem `audit-ars-column-shift.cjs` er til
  // fyrir — röng gögn undir röngum haus er verra en engin röðun.
  // Þess vegna: annaðhvort færist ALLT saman, eða ekkert.
  // Röðun er örugg svo lengi sem hver líkamsröð hefur nákvæmlega jafnmarga reiti
  // og summa haus-spannanna. Þá vitum við hvaða reitir tilheyra hvaða haus og
  // getum fært hópinn í heilu lagi — ár-spjöldin fjögur fylgja „Skoðanir · skjöl"
  // og skiljast aldrei að. (Röð sem spannar allt, t.d. „engar niðurstöður",
  // er sleppt.) rowSpan í haus myndi brjóta þetta; þá er ekki raðað.
  function canReorder(t) {
    if (!t) return false;
    const gs = groupsOf(t); if (!gs.length) return false;
    for (const th of t.querySelectorAll('thead th')) if (th.rowSpan > 1) return false;
    const n = gs.reduce((a, g) => a + g.span, 0);
    const cg = t.querySelectorAll('colgroup col');
    if (cg.length && cg.length !== n) return false;
    let sawRow = false;
    for (const tr of t.querySelectorAll('tbody tr')) {
      const tds = tr.querySelectorAll(':scope>td');
      if (!tds.length) continue;
      let sum = 0; for (const td of tds) sum += (td.colSpan || 1);
      if (tds.length === 1 && sum >= n) continue;          // „engar niðurstöður"-röð
      if (sum !== n) return false;
      sawRow = true;
    }
    return sawRow;
  }
  function applyOrder(t, ord) {
    if (!t || !ord || !ord.length || !canReorder(t)) return;
    const gs = groupsOf(t);
    const now = gs.map(g => g.n);
    if (now.length !== ord.length || now.every((v, i) => v === ord[i])) return;   // þegar rétt
    const range = {};
    gs.forEach(g => { range[g.n] = { start: g.start - 1, span: g.span }; });
    // Hausinn: einn hnútur á hóp. Líkami/colgroup: heil SNEIÐ á hóp.
    const head = t.querySelector('thead tr');
    if (head) {
      const ths = Array.prototype.slice.call(head.querySelectorAll(':scope>th'));
      const byN = {}; now.forEach((n, i) => { byN[n] = ths[i]; });
      ord.forEach(n => { const el = byN[n]; if (el) head.appendChild(el); });
    }
    const slice = (row, sel) => {
      const cells = Array.prototype.slice.call(row.querySelectorAll(sel));
      if (cells.length !== gs.reduce((a, g) => a + g.span, 0)) return;
      const out = [];
      ord.forEach(n => { const r = range[n]; if (r) out.push.apply(out, cells.slice(r.start, r.start + r.span)); });
      out.forEach(c => row.appendChild(c));
    };
    const cg = t.querySelector('colgroup'); if (cg) slice(cg, ':scope>col');
    t.querySelectorAll('tbody tr').forEach(tr => {
      if (tr.querySelectorAll(':scope>td').length <= 1) return;
      slice(tr, ':scope>td');
    });
  }
  function cols(t) { return groupsOf(t); }
  const TAFLA = {
    render(cfg, api) {
      const v = tlVals();
      if (!v.has) return api.head('Stilla töflu') + '<div class="pe-sub">Engin tafla á þessari síðu.</div>';
      const dens = Object.keys(DENSITY).map(n => {
        const d = DENSITY[n];
        const on = (v.fs === d.fs && v.lh === d.lh && v.padY === d.padY);
        return '<button type="button" class="pe-btn' + (on ? ' on' : '') + '" data-t-dens="' + esc(n) + '">' + esc(n) + '</button>';
      }).join('');
      const head = api.head('Stilla töflu', pageLabel());
      const basic =
        api.row('Letur',
          '<select data-t-ff style="flex:1;min-width:0;font:inherit;font-size:12.5px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:8px;background:#fff">' +
          FONTS.map(f => '<option value="' + esc(f[0]) + '"' + (f[0] === v.ff ? ' selected' : '') + '>' + esc(f[1]) + '</option>').join('') +
          '</select>' + api.stp(v.fs, 'data-t-fs')) +
        api.row('Línuhæð', api.stp(v.lh, 'data-t-lh', '%')) +
        '<div class="pe-frow"><span class="pe-flbl"></span>' + dens + '</div>' +
        '<div class="pe-frow"><span class="pe-flbl"></span>' +
          '<button type="button" class="pe-btn pri" data-t-save>✓ Vista síðu</button>' +
          '<button type="button" class="pe-btn" data-t-reset title="Núllstilla letur, línuhæð og bil">↺</button>' +
          '<button type="button" class="pe-btn" data-t-adv style="margin-left:auto">ítarlegt ' + (advOpen ? '▴' : '▾') + '</button>' +
        '</div>';
      if (!advOpen) return head + basic;
      const e = v.e, w = e.w || {}, hideG = e.hideG || {};
      const canOrd = canReorder(v.table);
      const list = cols(v.table).map(c =>
        '<div class="pe-frow" style="margin:4px 0;gap:6px" data-t-col="' + c.n + '"' + (canOrd ? ' draggable="true"' : '') + '>' +
          (canOrd ? '<span style="cursor:grab;color:#94a3b8;font-weight:800">↕</span>' : '') +
          '<span style="flex:1;min-width:0;font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' +
            (hideG[c.n] ? ';opacity:.4' : '') + '">' + esc(c.label) +
            (c.span > 1 ? '<span style="color:#94a3b8;font-weight:600"> · ' + c.span + ' dálkar</span>' : '') + '</span>' +
          '<button type="button" class="pe-btn" data-t-w="' + c.start + '|-1" style="padding:4px 8px">−</button>' +
          '<span style="font-size:11px;font-variant-numeric:tabular-nums;color:#64748b;min-width:34px;text-align:center">' +
            (w[c.start] ? w[c.start] + 'px' : 'auto') + '</span>' +
          '<button type="button" class="pe-btn" data-t-w="' + c.start + '|1" style="padding:4px 8px">+</button>' +
          '<button type="button" class="pe-btn" data-t-hide="' + c.n + '" style="padding:4px 8px" title="' +
            (hideG[c.n] ? 'Sýna dálkinn' : 'Fela dálkinn') + '">' + (hideG[c.n] ? '🚫' : '👁') + '</button>' +
        '</div>').join('');
      const per = window.__peTablePer || 50;
      return head + basic +
        '<div class="pe-glabel" style="margin-top:12px">Dálkar — ' + (canOrd ? '↕ raðar · ' : '') + '👁 felur</div>' +
        '<div data-t-collist>' + list + '</div>' +
        (canOrd ? '' : '<div class="pe-sub" style="margin-top:4px">Þessari töflu verður ekki raðað: hausar hennar spanna fleiri en einn dálk, ' +
          'svo röðun myndi setja gögnin undir rangan haus. Breidd og 👁 virka eftir sem áður.</div>') +
        api.row('Jafna breidd sjálfkrafa', api.sw(!!e.autow, 'data-t-autow')) +
        api.row('Fastur dálkahaus við skrun', api.sw(!!e.sticky, 'data-t-sticky')) +
        api.row('Raðir á síðu', api.seg([[25, '25'], [50, '50'], [0, 'Allar']], per === 999999 ? 0 : per, 'data-t-per'));
    },
    wire(root, cfg, api) {
      const v = tlVals();
      root.querySelectorAll('[data-t-fs]').forEach(b => b.onclick = () =>
        tlWrite({ fs: Math.max(FS_MIN, Math.min(FS_MAX, v.fs + (+b.dataset.tFs))) }));
      root.querySelectorAll('[data-t-lh]').forEach(b => b.onclick = () =>
        tlWrite({ lh: Math.max(LH_MIN, Math.min(LH_MAX, v.lh + (+b.dataset.tLh) * LH_STEP)) }));
      const ff = root.querySelector('[data-t-ff]');
      if (ff) ff.onchange = () => tlWrite({ ff: ff.value || null });
      root.querySelectorAll('[data-t-dens]').forEach(b => b.onclick = () => {
        const d = DENSITY[b.dataset.tDens]; if (d) tlWrite({ fs: d.fs, lh: d.lh, padY: d.padY });
      });
      const rs = root.querySelector('[data-t-reset]');
      if (rs) rs.onclick = () => {
        if (!confirm('Núllstilla letur, línuhæð og bil á þessari töflu?\n(Dálkabreiddir haldast.)')) return;
        tlWrite({ fs: null, lh: null, ff: null, padY: null });
      };
      const sv = root.querySelector('[data-t-save]');
      if (sv) sv.onclick = () => {
        const b = document.getElementById('pe-savepage') || document.getElementById('pe-ver-save');
        if (b) b.click(); else toast('✓ Töflu-útlit vistað');
      };
      const adv = root.querySelector('[data-t-adv]');
      if (adv) adv.onclick = () => { advOpen = !advOpen; rerenderPanel(); };
      root.querySelectorAll('[data-t-w]').forEach(b => b.onclick = () => {
        const p = b.dataset.tW.split('|'), n = +p[0], d = +p[1];
        const e = tlVals().e, w = Object.assign({}, e.w || {});
        const th = v.table && v.table.querySelectorAll('thead th')[n - 1];
        const cur = w[n] || (th ? Math.round(th.getBoundingClientRect().width) : 120);
        w[n] = Math.max(W_MIN, Math.min(W_MAX, cur + d * W_STEP));
        tlWrite({ w: w });
      });
      // Felun er geymd á HAUS-númeri (hideG) og CSS-ið smíðað hér, því 319 notar
      // sömu töluna á th og td og felur því rangan dálk í töflum með colspan.
      // Gamla `hide` er hreinsuð í leiðinni svo ekki sitji tvær uppsprettur.
      root.querySelectorAll('[data-t-hide]').forEach(b => b.onclick = () => {
        const n = b.dataset.tHide, e = tlVals().e, hideG = Object.assign({}, e.hideG || {});
        if (hideG[n]) delete hideG[n]; else hideG[n] = true;
        tlWrite({ hideG: hideG, hide: null });
      });
      const aw = root.querySelector('[data-t-autow]');
      if (aw) aw.onclick = () => tlWrite({ autow: tlVals().e.autow ? null : 1 });
      const st = root.querySelector('[data-t-sticky]');
      if (st) st.onclick = () => tlWrite({ sticky: tlVals().e.sticky ? null : 1 });
      root.querySelectorAll('[data-t-per]').forEach(b => b.onclick = () => {
        const n = +b.dataset.tPer;
        api.set({ per: n === 0 ? 999999 : n });
      });
      // ↕ Dálkaröð — dragið í listanum skrifar nýja röð í TableLook og
      // applier-inn færir dálkana strax.
      const list = root.querySelector('[data-t-collist]');
      if (list) dragSort(list, '[data-t-col]', 't-col', names => tlWrite({ ord: names.map(Number) }));
    },
  };
  function pageLabel() {
    const v = view(); if (!v) return 'Taflan';
    const h = v.querySelector('h1');
    return 'Taflan · ' + ((h && h.textContent.trim().slice(0, 24)) || v.id.replace(/^view-/, ''));
  }
  function taflaApply(cfg) {
    // Raðir á síðu: 153 les `window.__peTablePer` (sjálfgildi 50). Sett hér svo
    // stillingin lifi reload og fylgi milli tækja eins og allt annað.
    const per = cfg.per || 50;
    if (window.__peTablePer !== per) {
      window.__peTablePer = per;
      try { if (window.Arsskodun && Arsskodun.render) Arsskodun.render(); } catch (_) {}
    }
    const en = tlEntry(false);
    // Dálkaröðin er DOM-færsla, ekki CSS — endurtekin hér því 153 teiknar
    // töfluna upp á nýtt við hverja síun. applyOrder hættir strax ef röðin er
    // þegar rétt, svo þetta kostar ekkert í venjulegri keyrslu.
    if (en && en.table && en.e && en.e.ord) {
      try { applyOrder(en.table, en.e.ord); } catch (_) {}
    }
    let css = '';
    // Felun: haus falinn á HAUS-sæti, reitir/col á DÁLK-bili hópsins.
    if (en && en.table && en.e && en.e.hideG && Object.keys(en.e.hideG).length) {
      const t = en.table;
      const cls = t.id ? ('#' + t.id) : (t.classList[0] ? ('.' + t.classList[0]) : '');
      const base = 'html body #' + vid() + '#' + vid() + ' table' + cls;
      groupsOf(t).forEach(g => {
        if (!en.e.hideG[g.n]) return;
        css += base + ' thead th:nth-child(' + g.idx + '){display:none!important}\n';
        for (let c = g.start; c < g.start + g.span; c++) {
          css += base + ' tbody td:nth-child(' + c + '){display:none!important}\n';
          css += base + ' colgroup col:nth-child(' + c + '){display:none!important;width:0!important}\n';
        }
      });
    }
    if (en && en.e && en.e.autow) css += '#' + vid() + ' table{table-layout:auto!important}\n';
    return css;
  }

  /* ══ Sameiginlegt ══════════════════════════════════════════════════════════ */
  // Dráttarröðun á flöggum (KPI-spjöld). HTML5 drag-and-drop frekar en pointer-
  // math: listinn er stuttur og lárétt-brjótandi, og innbyggða lausnin sér um
  // snerti-/lyklaborðs-hegðun sem við þyrftum annars að endurgera.
  function dragSort(zone, sel, attr, done) {
    if (!zone) return;
    let src = null;
    zone.querySelectorAll(sel).forEach(el => {
      el.addEventListener('dragstart', e => { src = el; el.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); } catch (_) {} });
      el.addEventListener('dragend', () => { el.classList.remove('drag'); src = null; });
      el.addEventListener('dragover', e => {
        e.preventDefault();
        if (!src || src === el) return;
        const r = el.getBoundingClientRect();
        zone.insertBefore(src, (e.clientX - r.left) > r.width / 2 ? el.nextSibling : el);
      });
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const names = Array.prototype.slice.call(zone.querySelectorAll(sel))
        .map(el => el.getAttribute('data-' + attr));
      done(names);
    });
  }
  // Panellinn endurteiknar sig sjálfur við setZoneCfg. Þetta er fyrir hina
  // leiðina: þegar spjald skrifar BEINT í TableLook (319) og panellinn þarf svo
  // að sýna nýju tölurnar.
  function rerenderPanel() {
    try {
      if (!window.PageEditor) return;
      if (PageEditor.applyZones) PageEditor.applyZones();
      if (PageEditor.refresh) PageEditor.refresh();
    } catch (_) {}
  }
  // Einn applier, eitt style-blað. Keyrður úr 262 (`pe-zones-apply`) við hverja
  // breytingu, síðuskipti og á reglulegu millibili — svo endurteiknun 153 éti
  // ekki stillingarnar.
  let _cur = {};
  function runApply(detail) {
    const cfg = (detail && detail.cfg) || _cur;
    _cur = cfg || {};
    let css = '';
    try { css += hausCss(_cur.haus || {}); } catch (_) {}
    try { css += kpiApply(_cur.kpi || {}); } catch (_) {}
    try { css += siurApply(_cur.siur || {}); } catch (_) {}
    try { css += taflaApply(_cur.tafla || {}); } catch (_) {}
    const s = sheet();
    if (s.textContent !== css) s.textContent = css;
    if (s.parentNode) s.parentNode.appendChild(s);   // sitja síðast → vinna 230/314
  }
  document.addEventListener('pe-zones-apply', e => runApply(e.detail));

  function reg() {
    if (!window.PageEditor || !window.PageEditor.registerCard) return false;
    PageEditor.registerCard('haus', HAUS);
    PageEditor.registerCard('kpi', KPI);
    PageEditor.registerCard('siur', SIUR);
    PageEditor.registerCard('tafla', TAFLA);
    try { PageEditor.applyZones(); } catch (_) {}
    return true;
  }
  if (!reg()) {
    let n = 0;
    const t = setInterval(() => { if (reg() || ++n > 40) clearInterval(t); }, 250);
  }

  console.log('[patch-323] Stilla útlit v2 — verkfæraspjöld tilbúin');
})();
/* === END STILLA ÚTLIT v2 — VERKFÆRASPJÖLD === */
