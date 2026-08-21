/* === VÖRUR / ÞJÓNUSTA PICKER v2 (flokka-tíglar + mest notað + grúppuð) ===
 *
 * Sameiginleg leitar-popup fyrir vörur og þjónustur — notuð víða:
 *   • 78-counter-workshop   (verkstæði → breyta tæki → bæta við þjónustu)
 *   • 121-pickup-checkout   (Sótt → bæta við vöru)
 *   • 129-company-total-cost(+ Bæta við vöru eða þjónustu)
 *   • 142-sale-editor       (bæta línu á sölu)
 *   • 113/116/158/172       (verðlistar / tilboð / sérkjör)
 *
 * Stillir nafn, sjálfgefið verð (verd_an_vsk) og VSK% sjálfvirkt þegar
 * notandi velur vöru úr listanum, svo ekki þarf að slá inn handvirkt.
 *
 * Notkun (ÓBREYTT frá v1 — allir kallarar virka áfram):
 *   window.VorurPicker.open(function(p){
 *     // p = { id, nafn, flokkur, verd_an_vsk, vsk_prosenta, lysing }
 *   });
 *
 * v2 (2026-07-23): endurhannað eftir Claude Design comp „Voruval Picker.dc.html"
 *   — flokka-tíglar (gler-stíll, litur + íkon per flokk) í stað <select>, „Mest
 *   notað" pillur (nýjustu val + sjálfgefnir skýrslu-liðir) og flokka-borðar
 *   yfir grúppuðum lista. Gagna-/kallara-samningur óbreyttur.
 *
 * Cache: products sótt einu sinni úr Supabase, cachað fyrir session.
 * VorurPicker.refresh() til að hreinsa.
 */
(() => {
  if (window.__vorurPickerInstalled) return;
  window.__vorurPickerInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  // Íslensk þúsundamörk, engin aukastafur (12900 → „12.900").
  function fmtNum(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS'); }
  function getSB() { return (window.DB && window.DB.sb) || null; }

  // Flokkur → íkon + grunnlitur (hue). Sami og í hönnunar-comp-inu; óþekktir
  // flokkar fá hlutlausan bláan fallback.
  const CAT_META = {
    'Allt':                   { hue: '#1e3a8a' },
    'Slökkvitæki':            { hue: '#dc2626' },
    'Brunaslöngur':           { hue: '#c2410c' },
    'Skilti':                 { hue: '#15803d' },
    'Reykskynjarar':          { hue: '#7c3aed' },
    'Brunakerfi':             { hue: '#be123c' },
    'Varahlutir':             { hue: '#475569' },
    'Fylgihlutir':            { hue: '#0f766e' },
    'Ýmsar vörur':            { hue: '#b45309' },
    'Þjónusta':               { hue: '#0369a1' },
    'Aukavörur':              { hue: '#7c3aed' },
    'Brunaslöngurhjól':       { hue: '#c2410c' },
    'Eldvarnir':              { hue: '#dc2626' },
    'Hleðsla slökkvitækja':   { hue: '#b45309' },
    'Skilti, ljós og miðar':  { hue: '#15803d' },
    'Skynjarar og rafhlöður': { hue: '#7c3aed' },
    'Tæki':                   { hue: '#475569' },
    'Viðvörunarkerfi':        { hue: '#be123c' },
    'Vinna':                  { hue: '#0369a1' },
    'Vinna og akstur':        { hue: '#0e7490' },
    'Yfirferð slökkvitækja':  { hue: '#1f9d55' }
  };
  function metaFor(cat) { return CAT_META[cat] || { hue: '#1e3a8a' }; }
  // 2026-08-05 (ósk Agnars: „þessi emoji eru voða barnalegir — meira faglegt"):
  // emoji-táknin víkja fyrir stroke-teiknuðum SVG úr js/ui-icons.js, sem erfa
  // lit flokksins og teiknast eins á öllum tækjum.
  function iconFor(cat, size) { return window.UIIcons ? UIIcons.flokkurSvg(cat, { size: size || 15 }) : ''; }

  // „Mest notað" — nýjustu val notandans (localStorage) fyrst, svo sjálfgefnir
  // skýrslu-þjónustuliðir svo reiturinn er aldrei tómur í fyrsta skipti.
  const RECENT_KEY = 'vp_recent_v1';
  const DEFAULT_RECENT = [
    'Samantekt og gerð skoðunarskýrslu',
    'Skoðun á aðalstöð brunaviðvörunarkerfis',
    'Skoðun skynjara / boða, pr. stk',
    'Skoðun á aðalafli og varaafli'
  ];
  function getRecents() {
    try { const a = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(a) ? a : []; }
    catch (_) { return []; }
  }
  function pushRecent(nafn) {
    if (!nafn) return;
    try {
      let a = getRecents().filter(n => n !== nafn);
      a.unshift(nafn);
      if (a.length > 12) a = a.slice(0, 12);
      localStorage.setItem(RECENT_KEY, JSON.stringify(a));
    } catch (_) {}
  }

  // „Uppáhald" — handvalið af notanda (ekki sjálfvirkt eins og „Mest notað").
  // Geymt sem listi af vöru-ID (strengir). Sýnt EINGÖNGU þegar tíninn er opnaður
  // með { favorites:true } — í dag aðeins úr Verkstæði (78 → „Laga/varahlutur").
  // Geymt í localStorage (per-tæki). Ósk Agnars 2026-08-21.
  const FAV_KEY = 'vp_fav_v1';
  function getFavs() {
    try { const a = JSON.parse(localStorage.getItem(FAV_KEY)); return Array.isArray(a) ? a.map(String) : []; }
    catch (_) { return []; }
  }
  function isFav(id) { return getFavs().indexOf(String(id)) >= 0; }
  function toggleFav(id) {
    const sid = String(id);
    try {
      let a = getFavs();
      if (a.indexOf(sid) >= 0) a = a.filter(x => x !== sid); else a.push(sid);
      localStorage.setItem(FAV_KEY, JSON.stringify(a));
    } catch (_) {}
  }

  let _cache = null;
  let _loadingPromise = null;

  function loadProducts() {
    if (_cache) return Promise.resolve(_cache);
    if (_loadingPromise) return _loadingPromise;
    const SB = getSB();
    if (!SB) return Promise.resolve([]);
    _loadingPromise = SB.from('vorur')
      .select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,lysing,virkt')
      .eq('virkt', true)
      .order('flokkur', { ascending: true })
      .order('nafn', { ascending: true })
      .then(r => {
        _cache = (r.data || []);
        _loadingPromise = null;
        return _cache;
      })
      .catch(e => {
        console.warn('[vorur-picker] load failed:', e);
        _loadingPromise = null;
        return [];
      });
    return _loadingPromise;
  }

  // Highlight matching tokens in a string (case-insensitive substring per token).
  function highlight(text, tokens) {
    const s = esc(text || '');
    if (!tokens || !tokens.length) return s;
    let out = s;
    tokens.forEach(tok => {
      if (!tok) return;
      const re = new RegExp('(' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      out = out.replace(re, '<mark style="background:#fde68a;color:#78350f;border-radius:2px;padding:0 1px">$1</mark>');
    });
    return out;
  }

  function open(onPick, opts) {
    const wantFav = !!(opts && opts.favorites);
    let dlg = document.getElementById('_vp-dialog');
    if (dlg) dlg.remove();

    dlg = document.createElement('div');
    dlg.id = '_vp-dialog';
    // 2026-05-21: 100080 svo tíninn sitji ALLTAF ofan á host-modal sem opnaði
    // hann (Þjónustuverk 100070, sölu-ritill, verðlista-gluggar 100050-100070).
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100080;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);width:min(600px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden">' +
        // ── Haus ──
        '<div style="background:#1e3a8a;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<div style="font-size:15px;font-weight:800;display:flex;align-items:center;gap:7px">' +
              (window.UIIcons ? UIIcons.svg('search', { size: 16 }) : '') + 'Velja vöru / þjónustu</div>' +
            '<div style="font-size:11.5px;opacity:.75">Smelltu á vöru til að nota nafn + verð sjálfvirkt</div>' +
          '</div>' +
          '<div id="_vp-x" title="Loka" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.15);border-radius:8px;font-size:14px;cursor:pointer">✕</div>' +
        '</div>' +
        // ── Leitarglugginn — efst, áberandi, sjálf-fókuserað. Flokka-tíglarnir
        // (stórar mynda-flísar) eru farnir — óþarflega hægvirkir þegar leitað var
        // að vöru (Agnar 2026-08-05). Flokkar birtast núna sem samanbrjótanlegur
        // listi fyrir neðan (sjá renderList), sjálfgefið samanbrotinn.
        '<div style="padding:12px 16px;border-bottom:1px solid rgba(0,0,0,.07);background:linear-gradient(180deg,#f4f6fa,#e9edf4)">' +
          '<div style="position:relative">' +
            '<span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);display:flex;opacity:.55;color:#0f172a;pointer-events:none">' + (window.UIIcons ? UIIcons.svg('search', { size: 15 }) : '') + '</span>' +
            '<input id="_vp-search" type="text" autocomplete="off" placeholder="Leita að vöru, flokki eða lýsingu…" style="border:1.5px solid rgba(0,0,0,.18);border-radius:10px;padding:13px 36px 13px 34px;font-size:15px;font-weight:600;width:100%;box-sizing:border-box;background:#fff">' +
            '<div id="_vp-clear" title="Hreinsa leit" style="display:none;position:absolute;right:8px;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:99px;background:rgba(0,0,0,.08);color:rgba(0,0,0,.55);font-size:13px;line-height:24px;text-align:center;cursor:pointer">✕</div>' +
          '</div>' +
        '</div>' +
        // ── Uppáhald (handvalið — aðeins þegar wantFav) ──
        '<div id="_vp-fav-wrap" style="padding:10px 16px 4px;display:none;flex:none">' +
          '<div style="font-size:10px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;display:flex;align-items:center;gap:5px">' + (window.UIIcons ? UIIcons.svg('star', { size: 12 }) : '★') + 'Uppáhald</div>' +
          '<div id="_vp-fav" style="display:flex;flex-wrap:wrap;gap:6px"></div>' +
        '</div>' +
        // ── Mest notað ──
        '<div id="_vp-recent-wrap" style="padding:10px 16px 4px;display:none;flex:none">' +
          '<div style="font-size:10px;font-weight:800;color:rgba(0,0,0,.4);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;display:flex;align-items:center;gap:5px">' + (window.UIIcons ? UIIcons.svg('star', { size: 12 }) : '') + 'Mest notað í þínum skýrslum</div>' +
          '<div id="_vp-recent" style="display:flex;flex-wrap:wrap;gap:6px"></div>' +
        '</div>' +
        // ── Grúppaður listi ──
        '<div id="_vp-list" style="flex:1;min-height:130px;overflow:auto;padding:6px 0 10px">' +
          '<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Hleð inn vörum…</div>' +
        '</div>' +
        // ── Fótur ──
        '<div style="padding:10px 16px;border-top:1px solid rgba(0,0,0,.08);display:flex;justify-content:space-between;align-items:center;gap:12px">' +
          '<div id="_vp-count" style="font-size:12px;color:rgba(0,0,0,.5)"></div>' +
          '<div id="_vp-cancel" style="font-size:13px;font-weight:700;border:1px solid rgba(0,0,0,.15);border-radius:9px;padding:9px 16px;color:rgba(0,0,0,.6);cursor:pointer">Hætta við</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    const search    = dlg.querySelector('#_vp-search');
    const clearBtn  = dlg.querySelector('#_vp-clear');
    const favWrap   = dlg.querySelector('#_vp-fav-wrap');
    const favEl     = dlg.querySelector('#_vp-fav');
    const recentWrap= dlg.querySelector('#_vp-recent-wrap');
    const recentEl  = dlg.querySelector('#_vp-recent');
    const listEl    = dlg.querySelector('#_vp-list');
    const countEl   = dlg.querySelector('#_vp-count');

    let products = [];
    const state = { query: '' };
    // Categories a user has manually expanded THIS time the picker is open.
    // Always starts empty — "allir Categories Collapsed as default" (Agnar
    // 2026-08-05) — searching auto-expands matching ones on top of this.
    const manuallyOpen = new Set();

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_vp-x').addEventListener('click', close);
    dlg.querySelector('#_vp-cancel').addEventListener('click', close);

    function doPick(p) {
      if (p && typeof onPick === 'function') {
        onPick({
          id: p.id,
          nafn: p.nafn || '',
          flokkur: p.flokkur || '',
          verd_an_vsk: +p.verd_an_vsk || 0,
          vsk_prosenta: +p.vsk_prosenta || 24,
          lysing: p.lysing || ''
        });
      }
      pushRecent(p && p.nafn);
      close();
    }

    // Flokkar í CAT_META-röð fyrst, svo hvaðeina sem eftir er.
    function categories() {
      const present = [];
      products.forEach(p => { const c = p.flokkur || 'Ýmsar vörur'; if (present.indexOf(c) < 0) present.push(c); });
      const ordered = Object.keys(CAT_META).filter(c => c !== 'Allt' && present.indexOf(c) >= 0);
      present.forEach(c => { if (ordered.indexOf(c) < 0) ordered.push(c); });
      return ordered;
    }

    // Uppáhald efst (aðeins wantFav) — handvalið, kemur í stað „Mest notað" þar.
    function renderFav() {
      if (!wantFav || state.query) { favWrap.style.display = 'none'; return; }
      favWrap.style.display = '';
      const byId = {};
      products.forEach(p => { byId[String(p.id)] = p; });
      const items = getFavs().map(id => byId[id]).filter(Boolean);
      if (!items.length) {
        favEl.innerHTML = '<div style="font-size:11.5px;color:rgba(0,0,0,.45);font-weight:600">Engin uppáhald enn — ýttu á ☆ við vöru að neðan til að festa hana hér.</div>';
        return;
      }
      favEl.innerHTML = items.map(p => {
        const priceInc = (+p.verd_an_vsk || 0) * (1 + (+p.vsk_prosenta || 24) / 100);
        const nm = p.nafn || '—';
        const label = nm.length > 30 ? nm.slice(0, 29) + '…' : nm;
        return '<div class="_vp-fav-chip" data-id="' + esc(p.id) + '" style="font-size:12px;font-weight:700;background:rgba(180,83,9,.08);border:1px solid rgba(180,83,9,.3);color:#92400e;padding:8px 8px 8px 12px;border-radius:99px;cursor:pointer;display:inline-flex;align-items:center;gap:8px">' +
            '<span>' + esc(label) + ' · <b>' + fmtNum(priceInc) + ' kr</b></span>' +
            '<span class="_vp-fav-x" data-id="' + esc(p.id) + '" title="Taka úr uppáhaldi" style="opacity:.55;font-size:13px;line-height:1;padding:0 2px">✕</span>' +
          '</div>';
      }).join('');
    }

    function renderRecent() {
      if (wantFav || state.query) { recentWrap.style.display = 'none'; return; }
      const byName = {};
      products.forEach(p => { if (!(p.nafn in byName)) byName[p.nafn] = p; });
      const names = [];
      getRecents().concat(DEFAULT_RECENT).forEach(n => { if (byName[n] && names.indexOf(n) < 0) names.push(n); });
      const top = names.slice(0, 6);
      if (!top.length) { recentWrap.style.display = 'none'; return; }
      recentWrap.style.display = '';
      recentEl.innerHTML = top.map(n => {
        const p = byName[n];
        const priceInc = (+p.verd_an_vsk || 0) * (1 + (+p.vsk_prosenta || 24) / 100);
        const label = n.length > 34 ? n.slice(0, 33) + '…' : n;
        return '<div data-name="' + esc(n) + '" style="font-size:12px;font-weight:700;background:rgba(30,58,138,.07);border:1px solid rgba(30,58,138,.25);color:#1e3a8a;padding:8px 12px;border-radius:99px;cursor:pointer">' +
          esc(label) + ' · <b>' + fmtNum(priceInc) + ' kr</b></div>';
      }).join('');
    }

    // Tókenuð leit (2026-05-10): öll orð verða að finnast (í hvaða röð sem er)
    // yfir nafn/flokk/lýsingu — svo „duft hleðsla 6" finnur „6 kg. Duft ABC hleðsla".
    function queryTokens() { return (state.query || '').trim().toLowerCase().split(/\s+/).filter(Boolean); }
    function matches(p, tokens) {
      if (!tokens.length) return true;
      const hay = ((p.nafn || '') + ' ' + (p.flokkur || '') + ' ' + (p.lysing || '')).toLowerCase();
      return tokens.every(tok => hay.indexOf(tok) >= 0);
    }

    function headerHtml(cat, count, open) {
      const m = metaFor(cat);
      return '<div class="_vp-cat-header" data-cat="' + esc(cat) + '" style="position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:9px;padding:11px 16px;cursor:pointer;background:#fff;border-bottom:1px solid rgba(0,0,0,.06)">' +
          '<span style="display:inline-flex;transition:transform .15s ease;transform:rotate(' + (open ? '90deg' : '0deg') + ');color:rgba(0,0,0,.4);font-size:12px;flex:none">▶</span>' +
          '<span style="display:flex;flex:none;color:' + m.hue + '">' + iconFor(cat, 15) + '</span>' +
          '<span style="font-size:14px;font-weight:800;color:#1a1a1a;flex:1;min-width:0">' + esc(cat) + '</span>' +
          '<span style="font-size:11.5px;font-weight:700;color:rgba(0,0,0,.4)">' + count + '</span>' +
        '</div>';
    }

    function rowHtml(p, tokens) {
      const priceEx = +p.verd_an_vsk || 0;
      const vsk = +p.vsk_prosenta || 24;
      const priceInc = priceEx * (1 + vsk / 100);
      return '<div class="_vp-row" data-id="' + esc(p.id) + '" style="padding:10px 16px 10px 39px;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.04)">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13.5px;font-weight:700;color:#1a1a1a">' + highlight(p.nafn || '—', tokens) + '</div>' +
            (p.lysing ? '<div style="font-size:11.5px;color:rgba(0,0,0,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + highlight(p.lysing, tokens) + '</div>' : '') +
          '</div>' +
          '<div style="text-align:right;flex:none">' +
            '<div style="font-size:14px;font-weight:800;color:#1a1a1a;font-variant-numeric:tabular-nums">' + fmtNum(priceInc) + ' kr</div>' +
            '<div style="font-size:10.5px;color:rgba(0,0,0,.45);font-variant-numeric:tabular-nums">' + fmtNum(priceEx) + ' kr án vsk · ' + vsk + '%</div>' +
          '</div>' +
          (wantFav ? '<div class="_vp-star" data-id="' + esc(p.id) + '" title="Setja í / úr uppáhaldi" style="flex:none;font-size:19px;line-height:1;cursor:pointer;padding:2px 2px 2px 6px;color:' + (isFav(p.id) ? '#f59e0b' : 'rgba(0,0,0,.22)') + '">' + (isFav(p.id) ? '★' : '☆') + '</div>' : '') +
        '</div>';
    }

    function renderList() {
      const tokens = queryTokens();
      const searching = tokens.length > 0;
      const groupMap = {};
      products.forEach(p => { const c = p.flokkur || 'Ýmsar vörur'; (groupMap[c] = groupMap[c] || []).push(p); });
      const order = categories().filter(c => groupMap[c]);

      let totalMatches = 0;
      const html = order.map(c => {
        const all = groupMap[c];
        const rows = searching ? all.filter(p => matches(p, tokens)) : all;
        if (searching && !rows.length) return ''; // hide empty categories while searching
        totalMatches += rows.length;
        // While searching, a category with hits is force-expanded regardless of
        // manual state; otherwise it's exactly what the user toggled (default closed).
        const open = searching ? true : manuallyOpen.has(c);
        return headerHtml(c, rows.length, open) +
          (open ? rows.map(p => rowHtml(p, tokens)).join('') : '');
      }).join('');

      countEl.textContent = (searching ? totalMatches : products.length) + ' / ' + products.length;
      listEl.innerHTML = html || '<div style="padding:40px;text-align:center;font-size:13px;color:rgba(0,0,0,.45)">Engin vara fannst — prófaðu annað leitarorð</div>';
    }

    function render() { renderFav(); renderRecent(); renderList(); }

    // ── Atburðir (delegation) ──
    recentEl.addEventListener('click', e => {
      const t = e.target.closest('[data-name]'); if (!t) return;
      const p = products.find(x => x.nafn === t.getAttribute('data-name'));
      if (p) doPick(p);
    });
    favEl.addEventListener('click', e => {
      const x = e.target.closest('._vp-fav-x');
      if (x) { e.stopPropagation(); toggleFav(x.getAttribute('data-id')); render(); return; }
      const chip = e.target.closest('._vp-fav-chip'); if (!chip) return;
      const p = products.find(y => String(y.id) === String(chip.getAttribute('data-id')));
      if (p) doPick(p);
    });
    listEl.addEventListener('click', e => {
      // stjörnu-smellur festir/losar úr uppáhaldi — velur EKKI vöruna.
      const star = e.target.closest('._vp-star');
      if (star) { e.stopPropagation(); toggleFav(star.getAttribute('data-id')); render(); return; }
      const row = e.target.closest('._vp-row');
      if (row) { const p = products.find(x => String(x.id) === String(row.getAttribute('data-id'))); if (p) doPick(p); return; }
      const hdr = e.target.closest('._vp-cat-header');
      if (hdr && !state.query) {
        // Toggling only makes sense outside an active search (search force-expands).
        const cat = hdr.getAttribute('data-cat');
        if (manuallyOpen.has(cat)) manuallyOpen.delete(cat); else manuallyOpen.add(cat);
        renderList();
      }
    });
    listEl.addEventListener('mouseover', e => { const r = e.target.closest('._vp-row'); if (r) r.style.background = 'rgba(30,58,138,.05)'; });
    listEl.addEventListener('mouseout',  e => { const r = e.target.closest('._vp-row'); if (r) r.style.background = ''; });

    function updateClearVisibility() { clearBtn.style.display = search.value ? 'block' : 'none'; }
    search.addEventListener('input', () => { state.query = search.value; updateClearVisibility(); render(); });
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); if (search.value) { search.value = ''; state.query = ''; updateClearVisibility(); render(); } else close(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = listEl.querySelector('._vp-row');
        if (first) first.click();
      }
    });
    clearBtn.addEventListener('click', () => { search.value = ''; state.query = ''; updateClearVisibility(); render(); search.focus(); });

    setTimeout(() => search.focus(), 80);

    loadProducts().then(p => { products = p; render(); });
  }

  window.VorurPicker = {
    open,
    refresh: () => { _cache = null; _loadingPromise = null; },
    list: () => _cache || []
  };

  console.log('[vorur-picker] installed v2 — VorurPicker.open(callback) til að velja vöru/þjónustu');
})();
/* === END VÖRUR PICKER v2 === */
