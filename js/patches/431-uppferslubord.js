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
 * Hús: heimilisfang á færslunni er ekki teikningaskrá. Opinn prófíll má sækja
 * hus-upplysingar einu sinni fyrir ÞETTA heimilisfang þegar 363 á ekkert í
 * geymslu. Hlaða (depth) og önnur félög fara ekki í gegn.
 * Af hreinsar aldrei skyndiminni prófílsins.
 *
 * Viðvaranir á hverri röð og aðgerðir fyrir eitt fyrirtæki (úr #company/N).
 * Aðgerðirnar kalla einu sinni, aðeins á þetta fyrirtæki. Hlaða er sami takki
 * og í borðanum og sækir ekki kt, hús eða geocode.
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

  const SIDAST = 'slokk_uppfærslur_sidast';
  const KORTADR = 'slokk_uppfærslur_kortadr';
  const OF_ORT = 'Of ört. Getur fest síðuna eða fyllt netið.';
  const VISTAD = 'Gildið er þegar vistað. Auka kall geta 404 eða hægt á opnun.';
  const TOMUR = 'Prófíllinn getur opnast tómur.';
  const VANTAR = 'Vantar á röðina. Verður ekki fyllt fyrr en Endurnýja eða kveikt er á sjálfvirkt.';
  const OSOTT_TXT = {
    taeki: 'Tæki fyrir þetta fyrirtæki eru ekki í minni. Ýttu á Hlaða eða Endurnýja.',
    fyrirtaeki: 'Fyrirtækjalistinn er ekki sóttur.',
    kennitala: VANTAR,
    hus: VANTAR,
    kort: VANTAR,
    skilabod: 'Skilaboðaboxið sækir ekki. Ný póstar birtast ekki fyrr en kveikt er aftur.'
  };

  let _depth = 0;
  const _last = Object.create(null);
  let _kortLeyfiTil = 0;
  let _teiknad = false;
  let _bein = '';
  let _listiHeil = false;
  let _felagId = 0;
  let _adgerd = false;

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
  function note(id) {
    if (!id) return;
    _last[id] = Date.now();
    try {
      const o = JSON.parse(localStorage.getItem(SIDAST) || '{}') || {};
      o[id] = _last[id];
      localStorage.setItem(SIDAST, JSON.stringify(o));
    } catch (_) {}
    const el = document.querySelector('#ub-tafla tr[data-ub="' + id + '"] .ub-sidast');
    if (el) el.textContent = sidastTexti(_last[id]);
  }

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
    if (_bein && _bein === job) return true;
    const mode = modeOf(job);
    if (mode === 'af') return false;
    if (endurnyjaLeyfir(job)) return true;
    if (mode === 'auto') return due(job);
    if (job === 'kennitala') return !kennitalaASkra(url);
    if (job === 'hus') {
      if (_depth) return false;
      if (!heimilisfangASkra(url)) return true;
      if (!profilOpinn()) return false;
      const rod = felagRod();
      const q = String(breyta(url, 'heimilisfang') || '').trim();
      const adr = String((rod && rod.heimilisfang) || '').trim();
      return !!adr && adr === q;
    }
    if (job === 'kort') {
      if (hnitASkra(url)) return false;
      if (Date.now() < _kortLeyfiTil) return true;
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

  let _origFetch = null;
  function vefjaFetch() {
    if (window.fetch && window.fetch.__ub431) return;
    const orig = window.fetch;
    if (typeof orig !== 'function') return;
    _origFetch = orig;
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
      if (full && this.list.length >= 100) _listiHeil = true;
      if (full && !allow('fyrirtaeki')) return Promise.resolve(this.list);
      note('fyrirtaeki');
      const p = orig.apply(this, arguments);
      return Promise.resolve(p).then((r) => {
        if (Array.isArray(this.list) && this.list.length >= 100) _listiHeil = true;
        try { if (document.getElementById('ub-tafla')) uppfaeraVidvoranir(); } catch (_) {}
        return r;
      });
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
      const o = JSON.parse(localStorage.getItem(SIDAST) || '{}') || {};
      Object.keys(o).forEach((k) => { if (!_last[k] && o[k]) _last[k] = +o[k]; });
    } catch (_) {}
    try {
      const o = JSON.parse(localStorage.getItem('company_mail_cache_v2') || 'null');
      if (o && o.t && (!_last.skilabod || o.t > _last.skilabod)) _last.skilabod = o.t;
    } catch (_) {}
  }

  function sidastTexti(t) {
    if (!t) return '';
    const d = new Date(t);
    const p = (n) => (n < 10 ? '0' : '') + n;
    return 'síðast sótt ' + d.getDate() + '.' + (d.getMonth() + 1) + '. ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function idUrHash() {
    const m = String(location.hash || '').match(/^#(?:company|companies|fyrirtaeki)\/(\d+)/i);
    return m ? +m[1] : 0;
  }
  function profilOpinn() {
    if (idUrHash()) return true;
    try {
      return !!(window.Companies && Companies.currentId && typeof Companies._detailOpen === 'function' && Companies._detailOpen());
    } catch (_) { return false; }
  }
  function munaFelag() {
    const h = idUrHash();
    if (h) _felagId = h;
    else if (profilOpinn() && window.Companies && Companies.currentId) _felagId = +Companies.currentId;
  }
  function felagIdNu() {
    const h = idUrHash();
    if (h) return h;
    if (profilOpinn() && window.Companies && Companies.currentId) return +Companies.currentId;
    return _felagId || 0;
  }
  function felagRod() {
    const id = felagIdNu();
    if (!id) return null;
    const list = (window.Companies && Companies.list) || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] && +list[i].id === id) return list[i];
    }
    return { id: id, _vantarRod: true };
  }
  function listiSottur() {
    if (_listiHeil) return true;
    const list = window.Companies && Companies.list;
    return !!(Array.isArray(list) && list.length >= 100);
  }
  function taekiIMinni(id) {
    if (!id) return false;
    const db = window.DB;
    if (!db) return false;
    if (db._unitsComplete) return true;
    if (db._companyFetched && db._companyFetched[id]) return true;
    const units = db.cache && db.cache.units;
    if (!units) return false;
    for (let i = 0; i < units.length; i++) {
      if (units[i] && +units[i].fyrirtaeki_id === +id) return true;
    }
    return false;
  }
  function ktTil(co) {
    return String((co && co.kennitala) || '').replace(/\D/g, '').length > 0;
  }
  function husTil(co) {
    return String((co && co.heimilisfang) || '').trim().length > 0;
  }
  function lesaGc() {
    try { return JSON.parse(localStorage.getItem('_slokk_gc') || '{}') || {}; }
    catch (_) { return {}; }
  }
  function pinOk(p) {
    return !!(p && typeof p.lat === 'number');
  }
  function pinFyrir(co) {
    const gc = lesaGc();
    const adr = String((co && co.heimilisfang) || '').trim();
    const coPin = co && co.id ? gc['__co__:' + co.id] : null;
    const adrPin = adr ? gc[adr] : null;
    const nafnPin = co && co.nafn ? gc[co.nafn] : null;
    const pin = pinOk(coPin) ? coPin : pinOk(adrPin) ? adrPin : pinOk(nafnPin) ? nafnPin : null;
    return { pin: pin, coPin: pinOk(coPin), adrPin: pinOk(adrPin) };
  }
  function posturIMinni() {
    try {
      const o = JSON.parse(localStorage.getItem('company_mail_cache_v2') || 'null');
      return !!(o && o.t);
    } catch (_) { return false; }
  }
  function cacheTomt(id, co) {
    if (id === 'taeki') return !!(co && co.id && !taekiIMinni(co.id));
    if (id === 'fyrirtaeki') return !listiSottur();
    if (id === 'kennitala') return !!(co && co.id && !ktTil(co));
    if (id === 'hus') return !!(co && co.id && !husTil(co));
    if (id === 'kort') return !!(co && co.id && !pinFyrir(co).pin);
    if (id === 'skilabod') return !posturIMinni();
    return false;
  }
  function gildiVistad(id, co) {
    if (!co || !co.id || co._vantarRod) return false;
    if (id === 'kennitala') return ktTil(co);
    if (id === 'hus') return husTil(co);
    if (id === 'kort') return !!pinFyrir(co).pin;
    return false;
  }
  function ofOrt(id, cur) {
    if (!cur || cur.mode !== 'auto' || id === 'skilabod') return false;
    if (+cur.ms > 0 && +cur.ms < 30000) return true;
    try {
      const vist = JSON.parse(localStorage.getItem(LYKILL) || '{}') || {};
      const v = vist[id];
      if (v && v.mode === 'auto' && +v.ms > 0 && +v.ms < 30000) return true;
    } catch (_) {}
    return false;
  }
  function meta(id, cur, co) {
    const mode = cur.mode;
    const hefir = !!(co && co.id);
    const tomt = cacheTomt(id, co);
    if (ofOrt(id, cur)) return { chip: 'Villulíkur', setning: OF_ORT };
    if (mode === 'auto' && gildiVistad(id, co)) return { chip: 'Villulíkur', setning: VISTAD };
    if (mode === 'af' && id === 'skilabod' && profilOpinn() && !posturIMinni()) return { chip: 'Villulíkur', setning: TOMUR };
    if (mode === 'af' && tomt && hefir && id !== 'fyrirtaeki' && id !== 'skilabod') return { chip: 'Villulíkur', setning: TOMUR };
    if (mode === 'af' && id === 'fyrirtaeki' && tomt && hefir) return { chip: 'Villulíkur', setning: TOMUR };
    if ((mode === 'af' || mode === 'hand') && id === 'taeki' && hefir && tomt) return { chip: 'Ósótt', setning: OSOTT_TXT.taeki };
    if ((mode === 'af' || mode === 'hand') && id === 'fyrirtaeki' && tomt) return { chip: 'Ósótt', setning: OSOTT_TXT.fyrirtaeki };
    if ((mode === 'af' || mode === 'hand') && (id === 'kennitala' || id === 'hus' || id === 'kort') && hefir && tomt) {
      return { chip: 'Ósótt', setning: VANTAR };
    }
    if (mode === 'af' && id === 'skilabod' && profilOpinn()) return { chip: 'Ósótt', setning: OSOTT_TXT.skilabod };
    return { chip: 'Í lagi', setning: 'Engin viðvörun.' };
  }
  function samantektTexti(listi) {
    let n = 0;
    for (let i = 0; i < listi.length; i++) if (listi[i].chip !== 'Í lagi') n++;
    if (!n) return 'Ekkert ósótt.';
    return n === 1 ? '1 viðvörun' : (n + ' viðvaranir');
  }
  function vidvorunHtml(m, id) {
    const kl = m.chip === 'Ósótt' ? 'osott' : m.chip === 'Villulíkur' ? 'villa' : 'lagi';
    const sid = sidastTexti(_last[id]);
    return '<span class="ub-chip ub-chip-' + kl + '">' + esc(m.chip) + '</span>' +
      '<div class="ub-setning">' + esc(m.setning) + '</div>' +
      '<div class="ub-sidast">' + esc(sid) + '</div>';
  }
  function uppfaeraVidvoranir() {
    const all = lesa();
    const co = felagRod();
    const metas = [];
    SJALFGEFID.forEach((r) => {
      const m = meta(r.id, all[r.id], co);
      metas.push(m);
      const cell = document.querySelector('#ub-tafla tr[data-ub="' + r.id + '"] .ub-vidvorun');
      if (cell) cell.innerHTML = vidvorunHtml(m, r.id);
    });
    const sum = document.getElementById('ub-samantekt');
    if (sum) {
      const n = metas.filter((m) => m.chip !== 'Í lagi').length;
      sum.textContent = samantektTexti(metas);
      sum.setAttribute('data-n', String(n));
    }
  }
  function driftTexti(co) {
    if (!co || co._vantarRod) return '';
    const adr = String(co.heimilisfang || '').trim();
    if (!adr) return '';
    const p = pinFyrir(co);
    if (!p.pin) return '';
    let kortadr = {};
    try { kortadr = JSON.parse(localStorage.getItem(KORTADR) || '{}') || {}; } catch (_) { kortadr = {}; }
    const sidast = String(kortadr[String(co.id)] || '').trim();
    if (sidast && sidast !== adr) return 'Heimilisfang hefur breyst. Punkturinn er enn á gamla staðnum.';
    if (!sidast && p.coPin && !p.adrPin) return 'Heimilisfang hefur breyst. Punkturinn er enn á gamla staðnum.';
    return '';
  }
  function linTexti(co) {
    if (!co || co._vantarRod) return 'Röðin er ekki í minni.';
    const kt = ktTil(co) ? String(co.kennitala) : 'engin kennitala';
    const adr = husTil(co) ? String(co.heimilisfang).trim() : 'ekkert heimilisfang';
    return kt + ' · ' + adr;
  }

  function medBeinu(job, fn) {
    const prev = _bein;
    _bein = job;
    return Promise.resolve()
      .then(fn)
      .finally(() => { _bein = prev; });
  }
  function nidurstada(texti, villa) {
    const el = document.getElementById('ub-nidurstada');
    if (!el) return;
    el.textContent = texti || '';
    el.classList.toggle('ub-villa', !!villa);
  }
  function maelaFelag() {
    const co = felagRod();
    const lin = document.getElementById('ub-felag-lin');
    if (lin && co) lin.textContent = linTexti(co);
    const haus = document.getElementById('ub-felag-haus');
    if (haus && co && co.nafn) haus.textContent = co.nafn + ' #' + co.id;
    const drift = document.getElementById('ub-drift');
    if (drift) drift.textContent = co ? (driftTexti(co) || '') : '';
  }
  async function lesaRod(id) {
    if (!window.DB || !DB.sb) {
      const co = felagRod();
      if (co && +co.id === +id && !co._vantarRod) return co;
      throw new Error('Engin tenging við grunn');
    }
    const r = await DB.sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').eq('id', id).maybeSingle();
    if (!r || r.error) throw new Error((r && r.error && r.error.message) || 'gat ekki lesið fyrirtæki');
    if (!r.data) throw new Error('Fyrirtæki fannst ekki');
    return r.data;
  }
  function samraema(row) {
    if (!row) return row;
    const list = (window.Companies && Companies.list) || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] && +list[i].id === +row.id) {
        if (row.heimilisfang != null) list[i].heimilisfang = row.heimilisfang;
        if (row.kennitala != null) list[i].kennitala = row.kennitala;
        if (row.nafn) list[i].nafn = row.nafn;
        return list[i];
      }
    }
    if (window.Companies) {
      if (!Array.isArray(Companies.list)) Companies.list = [];
      Companies.list.push(row);
    }
    return row;
  }
  function hnitTexti(lat, lon) {
    return Number(lat).toFixed(5) + ', ' + Number(lon).toFixed(5);
  }
  function vistaPin(co, adr, lat, lon, displayName) {
    const val = { lat: lat, lng: lon, display_name: displayName || null };
    const gc = lesaGc();
    gc['__co__:' + co.id] = val;
    if (adr) gc[adr] = val;
    if (co.nafn) gc[co.nafn] = val;
    try { localStorage.setItem('_slokk_gc', JSON.stringify(gc)); } catch (_) {}
    let kortadr = {};
    try { kortadr = JSON.parse(localStorage.getItem(KORTADR) || '{}') || {}; } catch (_) { kortadr = {}; }
    kortadr[String(co.id)] = adr;
    try { localStorage.setItem(KORTADR, JSON.stringify(kortadr)); } catch (_) {}
    const SB_URL = window.SUPABASE_URL;
    const SB_KEY = window.SUPABASE_KEY;
    if (!SB_URL || !SB_KEY) return;
    const rows = [{ query: '__co__:' + co.id, lat: lat, lng: lon, display_name: displayName || null, source: 'uppferslubord' }];
    if (adr) rows.push({ query: adr, lat: lat, lng: lon, display_name: displayName || null, source: 'uppferslubord' });
    if (co.nafn) rows.push({ query: co.nafn, lat: lat, lng: lon, display_name: displayName || null, source: 'uppferslubord' });
    (_origFetch || fetch).call(window, SB_URL + '/rest/v1/geocode_cache', {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(rows)
    }).catch(() => {});
    try { if (window.Leidsogn && Leidsogn.refresh) Leidsogn.refresh(); } catch (_) {}
  }
  async function faeraPin(co, adr) {
    const r = await medBeinu('kort', () => fetch('/api/geocode?q=' + encodeURIComponent(adr)));
    if (!r.ok) throw new Error('geocode svaraði ' + r.status);
    let d = null;
    try { d = await r.json(); } catch (_) { d = null; }
    const lat = d && typeof d.lat === 'number' ? d.lat : null;
    const lon = d && typeof d.lon === 'number' ? d.lon : (d && typeof d.lng === 'number' ? d.lng : null);
    if (lat == null || lon == null) throw new Error('geocode skilaði engum hnitum');
    vistaPin(co, adr, lat, lon, (d && d.display_name) || '');
    return { lat: lat, lon: lon };
  }
  async function saekjaHus(id, adr) {
    const r = await medBeinu('hus', () => fetch('/.netlify/functions/hus-upplysingar?heimilisfang=' + encodeURIComponent(adr)));
    let svar = null;
    try { svar = await r.json(); } catch (_) { svar = null; }
    if (!r.ok) return { villa: (svar && (svar.error || svar.message)) || ('hús svaraði ' + r.status) };
    const ottrygg = !!(svar && svar.reynaAftur);
    if (!ottrygg && svar) {
      try {
        sessionStorage.setItem('bupp_skrar_v1_' + id, JSON.stringify({ heimilisfang: adr, svar: svar, sott: Date.now() }));
      } catch (_) {}
    }
    return { svar: svar };
  }
  async function uppfaeraEftirHeimilisfangi(id) {
    const co = felagRod() || { id: id };
    const adradur = String((co && co.heimilisfang) || '').trim();
    const thvinga = !!(document.getElementById('ub-thvinga') && document.getElementById('ub-thvinga').checked);
    const row = await lesaRod(id);
    const adr = String(row.heimilisfang || '').trim();
    const pin = pinFyrir({ id: row.id, nafn: row.nafn || co.nafn, heimilisfang: adr });
    if (!thvinga && adr && adr === adradur && pin.pin) {
      nidurstada('Heimilisfang óbreytt. Punktur er þegar til.');
      return;
    }
    if (!adr) {
      nidurstada('Ekkert heimilisfang á röðinni.', true);
      return;
    }
    samraema(row);
    const hus = await saekjaHus(id, adr);
    let hnit;
    try { hnit = await faeraPin(row, adr); }
    catch (e) {
      const h = hus && hus.villa ? ('Hús: ' + hus.villa + '. ') : '';
      throw new Error(h + ((e && e.message) || 'geocode brást'));
    }
    nidurstada(adr + ' · ' + hnitTexti(hnit.lat, hnit.lon));
  }
  async function faeraGeopunkt(id) {
    const row = await lesaRod(id);
    const adr = String(row.heimilisfang || '').trim();
    if (!adr) {
      nidurstada('Ekkert heimilisfang á röðinni.', true);
      return;
    }
    samraema(row);
    const hnit = await faeraPin(row, adr);
    nidurstada(adr + ' · ' + hnitTexti(hnit.lat, hnit.lon));
  }
  async function endurnyjaFelag(id) {
    if (!window.DB || typeof DB._primeCompany !== 'function') throw new Error('Endurnýjun er ekki tilbúin');
    const ok = await DB._primeCompany(id, { force: true });
    note('fyrirtaeki');
    note('taeki');
    if (!ok) nidurstada('Fyrirtæki fannst ekki.', true);
    else nidurstada('Fyrirtæki endurnýjað.');
  }
  async function saekjaKennitolu(id) {
    const row = await lesaRod(id);
    samraema(row);
    const kt = String(row.kennitala || '').replace(/\D/g, '');
    if (!kt) {
      nidurstada('Engin kennitala á röðinni.', true);
      return;
    }
    const r = await medBeinu('kennitala', () => fetch('/api/kt-lookup?kt=' + encodeURIComponent(kt) + '&skra=3'));
    if (!r.ok) {
      nidurstada('Villa: kt-lookup svaraði ' + r.status, true);
      return;
    }
    let d = null;
    try { d = await r.json(); } catch (_) { d = null; }
    if (!d || d.error) {
      nidurstada('Villa: ' + ((d && d.error) || 'kt-lookup tókst ekki'), true);
      return;
    }
    try { localStorage.setItem('ktskra3:' + kt, JSON.stringify({ d: d, t: Date.now() })); } catch (_) {}
    const adr = d.heimilisfang_full || d.nafn || '';
    nidurstada(adr ? ('Kennitala sótt. ' + adr) : 'Kennitala sótt.');
  }
  async function keyraHlada() {
    if (window.Hledslutakki && typeof Hledslutakki.saekja === 'function') {
      nidurstada('Hlaða sækir…');
      await Hledslutakki.saekja();
      const n = (window.Companies && Companies.list && Companies.list.length) || 0;
      const t = (window.DB && DB.cache && DB.cache.units && DB.cache.units.length) || 0;
      nidurstada('Hlaða klárað. ' + n + ' fyrirtæki, ' + t + ' tæki í minni.');
      return;
    }
    const b = document.getElementById('_hl-takki');
    if (b) { b.click(); nidurstada('Hlaða ræst.'); return; }
    nidurstada('Hlaða er ekki tilbúið.', true);
  }
  async function keyraAdgerd(nafn) {
    if (_adgerd) return;
    const id = felagIdNu();
    if (!id) { nidurstada('Ekkert fyrirtæki valið.', true); return; }
    _adgerd = true;
    document.querySelectorAll('#ub-felag [data-ub-adgerd]').forEach((b) => { b.disabled = true; });
    try {
      if (nafn === 'heimilisfang') await uppfaeraEftirHeimilisfangi(id);
      else if (nafn === 'geopunkt') await faeraGeopunkt(id);
      else if (nafn === 'endurnyja') await endurnyjaFelag(id);
      else if (nafn === 'kennitala') await saekjaKennitolu(id);
      else if (nafn === 'hlada') await keyraHlada();
    } catch (e) {
      nidurstada((e && e.message) || 'Villa', true);
    } finally {
      _adgerd = false;
      document.querySelectorAll('#ub-felag [data-ub-adgerd]').forEach((b) => { b.disabled = false; });
      maelaFelag();
      try { uppfaeraVidvoranir(); } catch (_) {}
    }
  }
  function uppfaeraFelag(force) {
    const sec = document.getElementById('ub-felag');
    if (!sec) return;
    const co = felagRod();
    const id = co ? String(co.id) : '';
    if (!force && document.activeElement && document.activeElement.id === 'ub-leit' && !id) return;
    if (!force && sec.getAttribute('data-id') === id) {
      maelaFelag();
      return;
    }
    sec.setAttribute('data-id', id);
    sec.innerHTML = co ? felagHtml(co) : leitHtml();
  }
  function sjaLeit(q) {
    const box = document.getElementById('ub-leit-nidur');
    if (!box) return;
    const list = (window.Companies && Companies.list) || [];
    const n = String(q || '').trim().toLowerCase();
    if (!list.length) {
      box.innerHTML = '<div class="ub-leit-tomt">Fyrirtækjalistinn er ekki sóttur.</div>';
      return;
    }
    if (!n) { box.innerHTML = ''; return; }
    const hit = [];
    for (let i = 0; i < list.length && hit.length < 8; i++) {
      const c = list[i];
      if (!c) continue;
      const hay = String(c.nafn || '') + ' ' + String(c.kennitala || '') + ' ' + String(c.heimilisfang || '') + ' ' + c.id;
      if (hay.toLowerCase().indexOf(n) >= 0) hit.push(c);
    }
    box.innerHTML = hit.length
      ? hit.map((c) => '<button type="button" data-ub-felag="' + c.id + '">' + esc(c.nafn || ('#' + c.id)) + ' · ' + esc(c.heimilisfang || '') + '</button>').join('')
      : '<div class="ub-leit-tomt">Ekkert fannst.</div>';
  }
  function leitHtml() {
    return '<h2>Eitt fyrirtæki</h2>' +
      '<p class="ub-felag-lead">Enginn prófíll er opinn. Leitaðu að einu fyrirtæki.</p>' +
      '<input id="ub-leit" type="search" autocomplete="off" placeholder="Nafn, kennitala eða heimilisfang" aria-label="Leita að fyrirtæki">' +
      '<div id="ub-leit-nidur"></div>';
  }
  function felagHtml(co) {
    const nafn = (co && co.nafn) ? co.nafn : ('Fyrirtæki #' + (co && co.id));
    const drift = driftTexti(co);
    return '<h2>Eitt fyrirtæki</h2>' +
      '<div id="ub-felag-haus">' + esc(nafn) + ' #' + (co && co.id) + '</div>' +
      '<div id="ub-felag-lin">' + esc(linTexti(co)) + '</div>' +
      '<div id="ub-drift">' + esc(drift) + '</div>' +
      '<div class="ub-adgerdir">' +
        '<button type="button" data-ub-adgerd="heimilisfang">Uppfæra eftir heimilisfangi</button>' +
        '<label class="ub-thvinga"><input type="checkbox" id="ub-thvinga"> Þvinga</label>' +
        '<button type="button" data-ub-adgerd="geopunkt">Færa geopunkt</button>' +
        '<button type="button" data-ub-adgerd="endurnyja">Endurnýja fyrirtæki</button>' +
        '<button type="button" data-ub-adgerd="kennitala">Sækja kennitölu</button>' +
        '<button type="button" data-ub-adgerd="hlada">Hlaða</button>' +
      '</div>' +
      '<div id="ub-nidurstada" class="ub-nidurstada" role="status"></div>';
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
      '#ub-samantekt{font-size:14px;font-weight:700;margin:0 0 14px}',
      '#ub-samantekt[data-n="0"]{color:#146c43}',
      '#ub-samantekt:not([data-n="0"]){color:#8a5a00}',
      '.ub-chip{display:inline-block;border-radius:999px;padding:3px 8px;font:700 11px/1.3 system-ui,sans-serif;letter-spacing:.01em}',
      '.ub-chip-lagi{background:#e7f6ee;color:#146c43}',
      '.ub-chip-osott{background:#fff4d6;color:#8a5a00}',
      '.ub-chip-villa{background:#fde8e8;color:#9b1c1c}',
      '.ub-setning{margin-top:6px;font-size:13px;line-height:1.4;color:var(--ink2,#243040);max-width:36ch}',
      '.ub-sidast{margin-top:4px;font-size:11px;color:var(--ink3,#5c6570)}',
      '#ub-felag{margin-top:22px;padding:14px 14px 16px;background:var(--surface,#fff);border:1px solid var(--brd,#e3e6ec);border-radius:10px}',
      '#ub-felag h2{font-size:16px;margin:0 0 8px}',
      '#ub-felag .ub-felag-lead{margin:0 0 10px;font-size:13px;color:var(--ink3,#5c6570)}',
      '#ub-felag-haus{font-weight:700;font-size:15px}',
      '#ub-felag-lin{margin-top:4px;font-size:13px;color:var(--ink2,#243040)}',
      '#ub-drift{margin-top:8px;font-size:13px;color:#8a5a00;min-height:0}',
      '#ub-drift:empty{display:none}',
      '#ub-felag .ub-adgerdir{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}',
      '#ub-felag .ub-adgerdir button{border:1px solid var(--brd,#d5dae3);background:var(--surface,#fff);color:var(--ink2,#243040);border-radius:8px;padding:8px 10px;font:600 13px/1.2 system-ui,sans-serif;cursor:pointer}',
      '#ub-felag .ub-adgerdir button:disabled{opacity:.55;cursor:wait}',
      '#ub-felag .ub-thvinga{font-size:13px;display:inline-flex;align-items:center;gap:6px}',
      '#ub-nidurstada{margin-top:10px;font-size:13px;min-height:1.2em}',
      '#ub-nidurstada.ub-villa{color:#9b1c1c}',
      '#ub-leit{width:100%;max-width:420px;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--brd,#d5dae3);font:inherit;font-size:14px}',
      '#ub-leit-nidur{display:flex;flex-direction:column;gap:4px;margin-top:8px;max-width:520px}',
      '#ub-leit-nidur button{text-align:left;border:1px solid var(--brd,#e3e6ec);background:var(--surface2,#f4f6f8);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;cursor:pointer}',
      '.ub-leit-tomt{font-size:13px;color:var(--ink3,#5c6570)}',
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
      '<td><div class="ub-modes">' + btns + '</div>' + sel + '</td>' +
      '<td class="ub-vidvorun">' + vidvorunHtml(meta(r.id, cur, felagRod()), r.id) + '</td></tr>';
  }
  function teikna() {
    const main = document.getElementById('ub-main');
    if (!main) return;
    const all = lesa();
    const co = felagRod();
    const metas = SJALFGEFID.map((r) => meta(r.id, all[r.id], co));
    const n = metas.filter((m) => m.chip !== 'Í lagi').length;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(main) : null;
    main.innerHTML =
      '<h1>Uppfærsluborð</h1>' +
      '<p class="ub-lead">Hér sést hvað síðan sækir aftur og aftur. Valið gildir í þessari tölvu. ' +
      'Hlaða sækir fyrirtæki og öll tæki í einni umferð. Endurnýja á prófíl sækir það eina fyrirtæki. ' +
      'Hús færist ekki: ef heimilisfang, hnit eða kennitala er þegar á færslunni er það ekki sótt aftur þegar prófíll opnast.</p>' +
      '<p id="ub-samantekt" role="status" data-n="' + n + '">' + esc(samantektTexti(metas)) + '</p>' +
      '<table id="ub-tafla"><thead><tr><th>Nafn</th><th>Hvaðan</th><th>Stjórn</th><th>Viðvörun</th></tr></thead><tbody>' +
      SJALFGEFID.map((r) => htmlRod(r, all[r.id])).join('') +
      '</tbody></table>' +
      '<section id="ub-felag" data-id="' + (co ? co.id : '') + '">' + (co ? felagHtml(co) : leitHtml()) + '</section>';
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
    uppfaeraVidvoranir();
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
      const ad = e.target.closest && e.target.closest('[data-ub-adgerd]');
      if (ad && v.contains(ad)) {
        e.preventDefault();
        keyraAdgerd(ad.getAttribute('data-ub-adgerd'));
        return;
      }
      const pick = e.target.closest && e.target.closest('[data-ub-felag]');
      if (pick && v.contains(pick)) {
        e.preventDefault();
        _felagId = +pick.getAttribute('data-ub-felag');
        uppfaeraFelag(true);
        uppfaeraVidvoranir();
        return;
      }
      const tr = e.target.closest && e.target.closest('tr[data-ub]');
      if (!tr) return;
      const id = tr.getAttribute('data-ub');
      const modeBtn = e.target.closest('[data-ub-mode]');
      if (modeBtn) {
        e.preventDefault();
        setja(id, { mode: modeBtn.getAttribute('data-ub-mode') });
      }
    });
    v.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'ub-leit') sjaLeit(e.target.value);
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
    munaFelag();
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
    if (!_teiknad || !document.getElementById('ub-tafla')) { teikna(); _teiknad = true; }
    else { uppfaeraVidvoranir(); uppfaeraFelag(); }
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

  function stodvaKort() {
    if (modeOf('kort') === 'auto') return;
    if (window.GeocodePrewarm && GeocodePrewarm.cancel) {
      try { GeocodePrewarm.cancel(); } catch (_) {}
    }
  }
  function boot() {
    try { munaFelag(); saejast(); vefjaFetch(); vefjaLoad(); vefjaHlada(); vefjaPrime(); navTakki(); hook(); limaVidStillingar(); stodvaKort(); } catch (e) {
      console.warn('[431]', e);
    }
  }
  boot();
  [400, 1500, 3500].forEach((ms) => setTimeout(() => {
    try {
      boot();
      limaVidStillingar();
      munaFelag();
      if (document.getElementById('ub-tafla')) { uppfaeraVidvoranir(); uppfaeraFelag(); }
    } catch (_) {}
  }, ms));
  // 218 heldur #uppferslubord á meðan síðan er ekki til, og ræsingin má ekki
  // skrifa yfir hana. Síðan er því ekki búin til fyrr en hér, eftir þann glugga.
  setTimeout(() => {
    try {
      const h = (location.hash || '').replace(/^#/, '');
      if (h === NAV || h === 'uppfærslubord') show();
    } catch (_) {}
  }, 2100);
  setInterval(() => { try { dæla(); } catch (_) {} }, 15000);
  setTimeout(() => {
    try {
      if (listiSottur() && !_last.fyrirtaeki) note('fyrirtaeki');
      if (unitsHome() && !_last.taeki) note('taeki');
      if (document.getElementById('ub-tafla')) { uppfaeraVidvoranir(); uppfaeraFelag(); }
    } catch (_) {}
  }, 8000);

  window.addEventListener('hashchange', () => {
    const id = idUrHash();
    if (id) _felagId = id;
    const h = (location.hash || '').replace(/^#/, '');
    if (h === NAV || h === 'uppfærslubord') show();
    else if (id && document.getElementById('ub-tafla')) {
      try { uppfaeraVidvoranir(); uppfaeraFelag(); } catch (_) {}
    }
  });

  window.Uppfaerslubord = {
    allow: allow,
    note: note,
    skipFullUnits: skipFullUnits,
    mode: modeOf,
    open: show,
    stada: function (id) { return meta(id, rod(id), felagRod()); }
  };
  console.log('[431] uppfærsluborð');
})();
