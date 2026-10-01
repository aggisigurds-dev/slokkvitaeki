/* === UPPFÆRSLUBORÐ (431, 01.10.2026) ==========================================
 * Agnar: síða til að sjá og stjórna endursóknum í stað þess að þær séu harðkóðaðar.
 * Valið lifir í localStorage á vinnutölvunni (slokk_uppfærslur).
 *
 * allow(id) — má bakgrunnssókn fyrir þetta verk keyra núna?
 *   af        nei
 *   hand      nei (aðeins Hlaða / Endurnýja, og fyrsta fylling ef gildi vantar)
 *   auto      já, þegar bilið er liðið
 *
 * Hlaða (407) setur depth svo fyrirtæki + öll tæki fari í gegn nema róðurinn sé Af.
 * Endurnýja á prófíl sækir eitt fyrirtæki í gegnum DB._primeCompany og er ekki lokað hér.
 * Kennitala, hús og kort: ein umferð á hvern Endurnýja-smell (kallandinn merkir
 * __coEndurnyja.notad áður en fetch fer). Af stöðvar þær umferðir líka.
 * ========================================================================== */
(() => {
  if (window.Uppfaerslubord) return;

  const LYKILL = 'slokk_uppfærslur';
  const NAV = 'uppferslubord';
  const VIEW = 'view-uppferslubord';
  const BIL = [
    [30000, '30s'],
    [60000, '1 mín'],
    [120000, '2 mín'],
    [300000, '5 mín'],
    [1200000, '20 mín']
  ];
  const SJALFGEFID = [
    { id: 'taeki', nafn: 'Tæki', hvaðan: 'db.js · uttaeki', mode: 'hand', ms: 300000 },
    { id: 'fyrirtaeki', nafn: 'Fyrirtæki', hvaðan: 'fyrirtaeki · Companies.load', mode: 'hand', ms: 120000 },
    { id: 'kennitala', nafn: 'Kennitala', hvaðan: '/api/kt-lookup', mode: 'hand', ms: 300000 },
    { id: 'hus', nafn: 'Hús', hvaðan: 'hus-upplysingar', mode: 'hand', ms: 300000 },
    { id: 'kort', nafn: 'Kort', hvaðan: '/api/geocode', mode: 'hand', ms: 300000 },
    { id: 'skilabod', nafn: 'Skilaboð', hvaðan: 'company-mail · skilaboðabox', mode: 'auto', ms: 1200000 }
  ];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  let _depth = 0;
  const _last = Object.create(null);
  let _kortLeyfiTil = 0;
  let _teiknad = false;

  function lesa() {
    let vist = {};
    try { vist = JSON.parse(localStorage.getItem(LYKILL) || '{}') || {}; } catch (_) { vist = {}; }
    const ut = {};
    SJALFGEFID.forEach((r) => {
      const v = vist[r.id] || {};
      const mode = v.mode === 'af' || v.mode === 'hand' || v.mode === 'auto' ? v.mode : r.mode;
      const ms = BIL.some((b) => b[0] === +v.ms) ? +v.ms : r.ms;
      ut[r.id] = { mode, ms };
    });
    return ut;
  }
  function vista(all) {
    try { localStorage.setItem(LYKILL, JSON.stringify(all)); } catch (_) {}
  }
  function rod(id) {
    const all = lesa();
    return all[id] || { mode: 'hand', ms: 300000 };
  }
  function modeOf(id) { return rod(id).mode; }
  function intervalOf(id) { return rod(id).ms; }
  function due(id) {
    const t = _last[id] || 0;
    if (!t) return true;
    return Date.now() - t >= intervalOf(id);
  }
  function note(id) { if (id) _last[id] = Date.now(); }

  function allow(id) {
    const mode = modeOf(id);
    if (_depth && (id === 'taeki' || id === 'fyrirtaeki')) return mode !== 'af';
    if (mode === 'af') return false;
    if (mode === 'hand') return false;
    return due(id);
  }

  function unitsHome() {
    const db = window.DB;
    return !!(db && db._unitsComplete && db.cache && db.cache.units && db.cache.units.length);
  }
  function skipFullUnits(forceUnits) {
    const mode = modeOf('taeki');
    if (mode === 'af') return true;
    if (forceUnits) return false;
    if (!unitsHome()) return false;
    if (mode === 'hand') return true;
    if (mode === 'auto') return !due('taeki');
    return false;
  }

  function urlOf(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }
  function breyta(url, key) {
    try { return new URL(url, location.href).searchParams.get(key) || ''; }
    catch (_) { return ''; }
  }
  function jobOf(url) {
    if (!url) return '';
    if (/kt-lookup/i.test(url) && /[?&]skra=/.test(url)) return 'kennitala';
    if (/hus-upplysingar/i.test(url)) return 'hus';
    if (/\/geocode/i.test(url) && !/[?&]suggest=1/.test(url) && !/geocode-all/i.test(url)) return 'kort';
    if (/company-mail/i.test(url) && !/[?&]co=/.test(url)) return 'skilabod';
    return '';
  }
  function kennitalaASkra(url) {
    const kt = String(breyta(url, 'kt') || '').replace(/\D/g, '');
    if (!kt) return false;
    const list = (window.Companies && Companies.list) || [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c && String(c.kennitala || '').replace(/\D/g, '') === kt) return true;
    }
    return false;
  }
  function heimilisfangASkra(url) {
    const q = String(breyta(url, 'heimilisfang') || '').trim();
    if (!q) return false;
    const list = (window.Companies && Companies.list) || [];
    for (let i = 0; i < list.length; i++) {
      const adr = String((list[i] && list[i].heimilisfang) || '').trim();
      if (adr && (adr === q || q.indexOf(adr) === 0)) return true;
    }
    return false;
  }
  function hnitASkra(url) {
    const q = String(breyta(url, 'q') || '').trim();
    if (!q) return false;
    try {
      const gc = JSON.parse(localStorage.getItem('_slokk_gc') || '{}');
      if (gc[q] && typeof gc[q].lat === 'number') return true;
    } catch (_) {}
    const list = (window.Companies && Companies.list) || [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c) continue;
      const adr = String(c.heimilisfang || '').trim();
      if (!adr || (q !== adr && q.indexOf(adr) !== 0 && adr.indexOf(q) !== 0)) continue;
      if (c.lat != null && c.lat !== '' && (c.lon != null || c.lng != null)) return true;
      if (c.latitude != null && c.longitude != null) return true;
    }
    return false;
  }
  function adgerd() {
    try { return !!(navigator.userActivation && navigator.userActivation.isActive); }
    catch (_) { return false; }
  }
  // Endurnýja setur __coEndurnyja og kallandinn merkir lykilinn ÁÐUR en fetch fer.
  // Þá er gildið oft þegar á færslunni, svo hand-stillingin myndi annars stöðva
  // einu endurnýjunina. Ein umferð á hvern smell. Af stöðvar samt.
  function endurnyjaLeyfir(job) {
    const e = window.__coEndurnyja;
    if (!e || !e.notad) return false;
    const lykill = job === 'kennitala' ? 'kt' : job;
    if (!e.notad[lykill]) return false;
    e._ub = e._ub || {};
    if (e._ub[job]) return false;
    e._ub[job] = true;
    return true;
  }
  function leyfa(job, url) {
    const mode = modeOf(job);
    if (mode === 'af') return false;
    if (endurnyjaLeyfir(job)) return true;
    if (mode === 'auto') return due(job);
    if (job === 'kennitala') return !kennitalaASkra(url);
    if (job === 'hus') return !heimilisfangASkra(url);
    if (job === 'kort') {
      if (hnitASkra(url)) return false;
      if (Date.now() < _kortLeyfiTil) return true;
      if (adgerd()) { _kortLeyfiTil = Date.now() + 20000; return true; }
      return false;
    }
    if (job === 'skilabod') return false;
    return false;
  }
  function neitun() {
    return Promise.resolve(new Response('{}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  function vefjaFetch() {
    if (window.fetch && window.fetch.__ub431) return;
    const orig = window.fetch;
    if (typeof orig !== 'function') return;
    function wrapped(input, init) {
      try {
        const url = urlOf(input);
        const job = jobOf(url);
        if (job) {
          if (!leyfa(job, url)) return neitun();
          note(job);
        }
      } catch (_) {}
      return orig.apply(this, arguments);
    }
    wrapped.__ub431 = true;
    window.fetch = wrapped;
  }

  function vefjaLoad() {
    const C = window.Companies;
    if (!C || typeof C.load !== 'function' || C.load.__ub431) return;
    const orig = C.load;
    function wrapped() {
      const full = Array.isArray(this.list) && this.list.length > 0;
      if (full && !allow('fyrirtaeki')) return Promise.resolve(this.list);
      note('fyrirtaeki');
      return orig.apply(this, arguments);
    }
    wrapped.__ub431 = true;
    C.load = wrapped;
  }
  function vefjaHlada() {
    const H = window.Hledslutakki;
    if (!H || typeof H.saekja !== 'function' || H.saekja.__ub431) return;
    const orig = H.saekja;
    function wrapped() {
      _depth++;
      let p;
      try { p = orig.apply(this, arguments); }
      catch (e) { _depth--; throw e; }
      return Promise.resolve(p).finally(() => { _depth--; });
    }
    wrapped.__ub431 = true;
    H.saekja = wrapped;
  }
  function vefjaPrime() {
    const db = window.DB;
    if (!db || typeof db._primeCompany !== 'function' || db._primeCompany.__ub431) return;
    const orig = db._primeCompany;
    function wrapped(id, opts) {
      const force = !!(opts && opts.force);
      if (force) return orig.apply(this, arguments);
      if (modeOf('taeki') === 'af' && modeOf('fyrirtaeki') === 'af') return Promise.resolve(false);
      return orig.apply(this, arguments);
    }
    wrapped.__ub431 = true;
    db._primeCompany = wrapped;
  }

  function dæla() {
    if (document.hidden) return;
    const all = lesa();
    SJALFGEFID.forEach((r) => {
      if (!all[r.id] || all[r.id].mode !== 'auto') return;
      if (!due(r.id)) return;
      try {
        if (r.id === 'fyrirtaeki' && window.Companies && Companies.load) Companies.load();
        else if (r.id === 'taeki' && window.DB && DB.loadAll) { note('taeki'); DB.loadAll({ forceUnits: true }); }
        else if (r.id === 'skilabod' && window.CompanyMail && CompanyMail.refresh) CompanyMail.refresh();
        else if (r.id === 'kort' && window.GeocodePrewarm && GeocodePrewarm.start) GeocodePrewarm.start();
      } catch (_) {}
    });
    const k = lesa().kort;
    if (k && k.mode !== 'auto' && window.GeocodePrewarm && GeocodePrewarm.cancel) {
      try { GeocodePrewarm.cancel(); } catch (_) {}
    }
  }

  function saejast() {
    try {
      const o = JSON.parse(localStorage.getItem('company_mail_cache_v2') || 'null');
      if (o && o.t && !_last.skilabod) _last.skilabod = o.t;
    } catch (_) {}
  }

  function stíll() {
    if (document.getElementById('ub431-css')) return;
    const st = document.createElement('style');
    st.id = 'ub431-css';
    st.textContent = [
      '#view-uppferslubord{box-sizing:border-box}',
      '#ub-main{max-width:980px;margin:0 auto;padding:22px 18px 48px;font-family:system-ui,sans-serif;color:var(--ink1,#12151c)}',
      '#ub-main h1{font-size:22px;font-weight:700;margin:0 0 6px}',
      '#ub-main .ub-lead{font-size:13px;line-height:1.5;color:var(--ink3,#5c6570);margin:0 0 16px;max-width:62ch}',
      '#ub-tafla{width:100%;border-collapse:collapse;background:var(--surface,#fff);border:1px solid var(--brd,#e3e6ec);border-radius:10px;overflow:hidden}',
      '#ub-tafla th{text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink3,#5c6570);padding:10px 12px;background:var(--surface2,#f4f6f8);border-bottom:1px solid var(--brd,#e3e6ec)}',
      '#ub-tafla td{padding:12px;border-top:1px solid var(--brd,#e8ebf0);vertical-align:top;font-size:14px}',
      '#ub-tafla .ub-nafn{font-weight:700}',
      '#ub-tafla .ub-hva{font-size:12px;color:var(--ink3,#5c6570);font-family:ui-monospace,monospace}',
      '#ub-main .ub-modes{display:flex;flex-wrap:wrap;gap:6px}',
      '#ub-main .ub-modes button{border:1px solid var(--brd,#d5dae3);background:var(--surface,#fff);color:var(--ink2,#243040);border-radius:999px;padding:6px 10px;font:600 12px/1.2 system-ui,sans-serif;cursor:pointer}',
      '#ub-main .ub-modes button.on{background:#11141c;color:#fff;border-color:#11141c}',
      '#ub-main select{margin-top:8px;padding:6px 8px;border-radius:8px;border:1px solid var(--brd,#d5dae3);background:var(--surface,#fff);font:inherit;font-size:13px}',
      '@media (max-width:720px){#ub-tafla,#ub-tafla tbody,#ub-tafla tr,#ub-tafla td{display:block;width:100%}#ub-tafla thead{display:none}#ub-tafla td{border-top:0}#ub-tafla tr{border-top:1px solid var(--brd,#e8ebf0);padding:8px 0}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function bilMerking(ms) {
    const f = BIL.find((b) => b[0] === ms);
    return f ? f[1] : '5 mín';
  }
  function htmlRod(r, cur) {
    const modes = [
      ['af', 'Af'],
      ['hand', 'Aðeins Hlaða eða Endurnýja'],
      ['auto', 'Sjálfvirkt']
    ];
    const btns = modes.map(([m, lab]) =>
      '<button type="button" data-ub-mode="' + m + '"' + (cur.mode === m ? ' class="on"' : '') + '>' + lab + '</button>'
    ).join('');
    const sel = cur.mode === 'auto'
      ? '<select data-ub-ms aria-label="Bil">' + BIL.map(([ms, lab]) =>
        '<option value="' + ms + '"' + (cur.ms === ms ? ' selected' : '') + '>' + lab + '</option>'
      ).join('') + '</select>'
      : '<div style="margin-top:8px;font-size:12px;color:var(--ink3,#5c6570)">Bil ' + esc(bilMerking(cur.ms)) + ' þegar kveikt er á sjálfvirkt</div>';
    return '<tr data-ub="' + r.id + '"><td><div class="ub-nafn">' + esc(r.nafn) + '</div></td>' +
      '<td class="ub-hva">' + esc(r.hvaðan) + '</td>' +
      '<td><div class="ub-modes">' + btns + '</div>' + sel + '</td></tr>';
  }
  function teikna() {
    const main = document.getElementById('ub-main');
    if (!main) return;
    const all = lesa();
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(main) : null;
    main.innerHTML =
      '<h1>Uppfærsluborð</h1>' +
      '<p class="ub-lead">Hér sést hvað síðan sækir aftur og aftur. Valið gildir í þessari tölvu. ' +
      'Hlaða sækir fyrirtæki og öll tæki í einni umferð. Endurnýja á prófíl sækir það eina fyrirtæki. ' +
      'Hús færist ekki: ef heimilisfang, hnit eða kennitala er þegar á færslunni er það ekki sótt aftur þegar prófíll opnast.</p>' +
      '<table id="ub-tafla"><thead><tr><th>Nafn</th><th>Hvaðan</th><th>Stjórn</th></tr></thead><tbody>' +
      SJALFGEFID.map((r) => htmlRod(r, all[r.id])).join('') +
      '</tbody></table>';
    if (aftur) aftur();
  }

  function setja(id, patch) {
    const all = lesa();
    if (!all[id]) return;
    if (patch.mode) all[id].mode = patch.mode;
    if (patch.ms) all[id].ms = patch.ms;
    vista(all);
    if (id === 'kort' && all[id].mode !== 'auto' && window.GeocodePrewarm && GeocodePrewarm.cancel) {
      try { GeocodePrewarm.cancel(); } catch (_) {}
    }
    const tr = document.querySelector('#ub-tafla tr[data-ub="' + id + '"]');
    if (!tr) { teikna(); return; }
    const r = SJALFGEFID.find((x) => x.id === id);
    const tmp = document.createElement('tbody');
    tmp.innerHTML = htmlRod(r, all[id]);
    tr.replaceWith(tmp.firstChild);
  }

  function ensureView() {
    stíll();
    if (document.getElementById(VIEW)) return;
    const sample = document.getElementById('view-settings') || document.getElementById('view-companies') || document.querySelector('.view');
    const v = document.createElement('div');
    v.id = VIEW;
    v.className = ((sample && sample.className) || 'view').replace(/\bactive\b/g, '').trim() || 'view';
    if (v.className.indexOf('view') < 0) v.className += ' view';
    v.style.display = 'none';
    v.innerHTML = '<main id="ub-main" class="main-panel"></main>';
    (sample && sample.parentElement ? sample.parentElement : document.body).appendChild(v);
    v.addEventListener('click', (e) => {
      const tr = e.target.closest && e.target.closest('tr[data-ub]');
      if (!tr) return;
      const id = tr.getAttribute('data-ub');
      const modeBtn = e.target.closest('[data-ub-mode]');
      if (modeBtn) {
        e.preventDefault();
        setja(id, { mode: modeBtn.getAttribute('data-ub-mode') });
      }
    });
    v.addEventListener('change', (e) => {
      const sel = e.target.closest && e.target.closest('select[data-ub-ms]');
      if (!sel) return;
      const tr = sel.closest('tr[data-ub]');
      if (!tr) return;
      setja(tr.getAttribute('data-ub'), { ms: +sel.value });
    });
  }

  function show() {
    ensureView();
    document.querySelectorAll('.view').forEach((el) => {
      if (el.id === VIEW) return;
      el.classList.remove('active');
      el.style.display = 'none';
    });
    const v = document.getElementById(VIEW);
    v.style.display = 'block';
    v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-view') === NAV);
    });
    try {
      const h = (location.hash || '').replace(/^#/, '');
      if (h !== NAV && h !== 'uppfærslubord') history.replaceState(null, '', '#' + NAV);
    } catch (_) {}
    try { if (window.App) App.view = NAV; } catch (_) {}
    if (!_teiknad) { teikna(); _teiknad = true; }
    else if (!document.getElementById('ub-tafla')) teikna();
  }

  function hook() {
    if (!window.App || typeof App.switchView !== 'function' || App.switchView.__ub431) return;
    const orig = App.switchView;
    function wrapped(v) {
      if (v === NAV || v === 'uppfærslubord') { show(); return; }
      const me = document.getElementById(VIEW);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      const r = orig.apply(this, arguments);
      try {
        const live = document.querySelector('.view.active');
        if (live) live.style.display = '';
      } catch (_) {}
      return r;
    }
    wrapped.__ub431 = true;
    App.switchView = wrapped;
  }

  function navTakki() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav || nav.querySelector('.vnav-btn[data-view="' + NAV + '"]')) return;
    const settings = nav.querySelector('.vnav-btn[data-view="settings"]');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vnav-btn';
    b.setAttribute('data-view', NAV);
    b.innerHTML = '<span>Uppfærsluborð</span>';
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.App && App.switchView) App.switchView(NAV);
      else show();
    });
    if (settings && settings.parentNode) settings.insertAdjacentElement('afterend', b);
    else nav.appendChild(b);
  }
  function limaVidStillingar() {
    const s = document.querySelector('.vnav-btn[data-view="settings"]');
    const b = document.querySelector('.vnav-btn[data-view="' + NAV + '"]');
    if (!s || !b) return;
    const o = parseFloat(s.style.order || '9000');
    if (!isFinite(o)) return;
    b.style.order = String(o + 1);
    b.classList.remove('nav-grp-start');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('button');
    if (!btn) return;
    const t = btn.textContent || '';
    if (btn.closest('#view-field') && /Uppfær/.test(t)) _kortLeyfiTil = Date.now() + 20 * 60 * 1000;
  }, true);

  function boot() {
    try { saejast(); vefjaFetch(); vefjaLoad(); vefjaHlada(); vefjaPrime(); ensureView(); navTakki(); hook(); limaVidStillingar(); } catch (e) {
      console.warn('[431]', e);
    }
  }
  boot();
  [400, 1500, 3500].forEach((ms) => setTimeout(() => { try { boot(); limaVidStillingar(); } catch (_) {} }, ms));
  setInterval(() => { try { dæla(); } catch (_) {} }, 15000);
  setTimeout(() => {
    try {
      if (window.Companies && Companies.list && Companies.list.length && !_last.fyrirtaeki) note('fyrirtaeki');
      if (unitsHome() && !_last.taeki) note('taeki');
    } catch (_) {}
  }, 8000);

  window.addEventListener('hashchange', () => {
    const h = (location.hash || '').replace(/^#/, '');
    if (h === NAV || h === 'uppfærslubord') show();
  });

  window.Uppfaerslubord = {
    allow: allow,
    note: note,
    skipFullUnits: skipFullUnits,
    mode: modeOf,
    open: show
  };
  console.log('[431] uppfærsluborð');
})();
