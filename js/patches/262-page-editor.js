/* === STÍLSTJÓRI — 🎨 lifandi útlits-ritill (262) ============================
 *
 * A small 🎨 button in the Brunastál banner (right before the clock) opens a
 * docked panel at the BOTTOM of the site. Pick any element on the page and
 * restyle it live: sliders (letur/breidd/hæð/padding/border/bil…), litir
 * (texti/bakgrunnur/border), halli (gradient), leturgerð, tilbúin stíla-safn
 * (dökkur málmur / gler / pilla …), og bakgrunnsmynd. Everything applies
 * INSTANTLY and is saved (synced across devices via AppSettings).
 *
 * Scope per change: „Þessi síða" (only the active view — overrides there) eða
 * „Allar síður" (global). Stored as ONE json string under `page_editor_v1_json`
 * (string keys overwrite cleanly — no array-merge / delete-propagation issues).
 *
 * Overrides are injected as a <style id="_pe-overrides"> with !important so they
 * win over the app's own CSS. Phase 1 — custom saved presets, an emoji palette
 * and a per-box component builder are the planned next steps.
 * ========================================================================== */
(() => {
  if (window.__pageEditorInstalled) return;
  window.__pageEditorInstalled = true;

  const IN_DEVFRAME = !!(new URLSearchParams(location.search).get('devframe'));

  const KEY = 'page_editor_v1_json';
  const BTN_ID = '_pe-btn';
  const PANEL_ID = '_pe-panel';
  const STYLE_ID = '_pe-overrides';
  const HL_ID = '_pe-highlight';

  let state = { rules: [], bg: { all: null, pages: {} }, favs: [], zones: {}, zoom: {} };
  let target = null;        // currently selected DOM element
  let picking = false;      // element-pick mode
  let scope = 'page';       // 'page' | 'all'
  let matchMode = 'one';    // 'one' = just this element, 'many' = every matching element (tag+class, no nth-of-type)
  let extraTargets = [];    // „Velja marga" (2026-08-26): fleiri valdir hlutir — sömu breytingar á alla
  let multiPick = false;    // ☑-hamur: smellir BÆTA VIÐ valið í stað þess að skipta um
  // Dokkun (2026-08-26, ósk Agnars): 'side' = hliðarpanel, 'bottom' = botn-sheet.
  // Vistast per tæki. 2026-08-29 (Agnar: „útlitssstýrikerfið er eiginlega
  // hræðilegt á desktop"): á Skjá/breiðum skjá er hlið sjálfgefið — botn-
  // sheetið varð að stóru tómu hvítu vinnusvæði sem huldi töfluna.
  let dock = 'side';
  try { dock = localStorage.getItem('pe_dock') || 'side'; } catch (_) {}
  let _saveT = null;
  // Skjár-hamur (data-viewmode=desktop) eða breiður gluggi — ekki sími/tafla.
  function isDesktopUi() {
    try {
      const vm = document.documentElement.getAttribute('data-viewmode') || '';
      if (vm === 'desktop') return true;
      if (vm === 'mobile' || vm === 'table') return false;
      return window.innerWidth >= 900;
    } catch (_) { return window.innerWidth >= 900; }
  }
  function preferDesktopDock() {
    if (!isDesktopUi()) return;
    // Einu sinni: færa desktop úr botn-sheeti yfir í hliðarpanel. Eftir það
    // virðir Botn/Hlið-takkinn val notandans.
    try {
      if (localStorage.getItem('pe_dock_desk_v2') === '1') return;
      dock = 'side';
      localStorage.setItem('pe_dock', 'side');
      localStorage.setItem('pe_dock_desk_v2', '1');
    } catch (_) { dock = 'side'; }
  }
  let undoStack = [];       // snapshot() before each mutation → ↩ Afturkalla pops the last one
  const UNDO_MAX = 20;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cssEsc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&');

  // ── persistence ───────────────────────────────────────────────────────────
  function loadState() {
    try {
      const raw = window.AppSettings && AppSettings.path ? AppSettings.path(KEY) : null;
      if (raw) state = Object.assign({ rules: [], bg: { all: null, pages: {} }, favs: [], zones: {}, zoom: {} }, JSON.parse(raw));
      if (!state.bg) state.bg = { all: null, pages: {} };
      if (!Array.isArray(state.rules)) state.rules = [];
      if (!Array.isArray(state.favs)) state.favs = [];
      if (!Array.isArray(state.versions)) state.versions = [];
      if (!Array.isArray(state.customLinks)) state.customLinks = [];
      if (!state.pageLinks || typeof state.pageLinks !== 'object') state.pageLinks = {};
      if (!state.zones || typeof state.zones !== 'object') state.zones = {};
      if (!state.zoom || typeof state.zoom !== 'object') state.zoom = {};
    } catch (_) {}
  }
  function persist() {
    applyCss();
    if (_saveT) clearTimeout(_saveT);
    _saveT = setTimeout(() => {
      try { if (window.AppSettings && AppSettings.save) AppSettings.save({ [KEY]: JSON.stringify(state) }); } catch (_) {}
    }, 400);
  }
  // ── undo ──────────────────────────────────────────────────────────────────
  // Called BEFORE every state mutation (setDecl/applySize/applyPreset/reset/
  // bakgrunnur/favorites) so „↩ Afturkalla" can step back one change at a time.
  // In-memory only (not synced) — a fresh page load starts with an empty stack.
  // Debounced: a slider drag fires setDecl/applySize dozens of times per second
  // — without this, one drag would eat the whole undo stack and „↩" would only
  // creep back one tiny increment. Collapsing rapid-fire pushes into a single
  // step means one undo reverts one whole slider drag / preset click / reset.
  let _lastSnapAt = 0;
  function snapshot() {
    const now = Date.now();
    if (undoStack.length && now - _lastSnapAt < 600) return;
    _lastSnapAt = now;
    try { undoStack.push(JSON.stringify(state)); if (undoStack.length > UNDO_MAX) undoStack.shift(); } catch (_) {}
  }
  function undo() {
    if (!undoStack.length) { toast('Ekkert til að afturkalla'); return; }
    try { state = JSON.parse(undoStack.pop()); } catch (_) { return; }
    persist(); renderPanel();
  }

  // ── selector + scope helpers ────────────────────────────────────────────────
  function viewIdOf(el) { const v = el.closest ? el.closest('.view') : null; return v && v.id ? v.id : null; }
  // general=true (📑 Alla eins mode) skips the :nth-of-type disambiguation at
  // EVERY step, so the selector matches every sibling with the same tag+class
  // (e.g. every row in a table) instead of pinning to just the one clicked.
  function relSelector(el, general) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && !node.classList.contains('view') && node !== document.body) {
      if (node.id && !general) { parts.unshift('#' + cssEsc(node.id)); break; }
      let part = node.tagName.toLowerCase();
      const cls = Array.prototype.slice.call(node.classList).filter(c => c && !/(^active$|^on$|^open$|^show$|^selected$|^_pe-)/.test(c)).slice(0, 2);
      if (cls.length) part += '.' + cls.map(cssEsc).join('.');
      if (!general) {
        const parent = node.parentNode;
        if (parent && parent.children) { const sibs = Array.prototype.slice.call(parent.children).filter(x => x.tagName === node.tagName); if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(node) + 1) + ')'; }
      }
      parts.unshift(part);
      node = node.parentNode;
      if (parts.length >= 5) break;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
  }
  // Effective scope for the current target: 'all', or the enclosing view id.
  function targetScope() {
    if (scope === 'all') return 'all';
    const vid = target ? viewIdOf(target) : null;
    return vid || 'all';   // elements outside any view are global-only
  }
  function ruleFor(sel, scp, create) {
    // Öryggisventill: selector án nokkurs klasa/#id/[attr]-akkeri — bert
    // element-heiti („svg", „div") EÐA keðja af berum heitum
    // („div > div > div > div > div", 2026-08-17: litaði ALLAN texta appsins
    // hvítan) — á ÖLLUM síðum næði yfir allt appið. Færum slíka reglu
    // sjálfkrafa á síðuna sem er opin.
    if (scp === 'all' && !/[.#\[]/.test(String(sel || ''))) {
      const cur = document.querySelector('.view.active');
      if (cur && cur.id) {
        scp = cur.id;
        try { toast('„' + sel + '" er of vítt fyrir allar síður — vistað á þessa síðu í staðinn.'); } catch (_) {}
      } else {
        return null;   // engin síða opin → sleppum frekar en að lita allt appið
      }
    }
    let r = state.rules.find(x => x.sel === sel && x.scope === scp);
    if (!r && create) { r = { sel, scope: scp, decls: {} }; state.rules.push(r); }
    return r;
  }
  function currentRule(create) {
    if (!target) return null;
    return ruleFor(relSelector(target, matchMode === 'many'), targetScope(), create);
  }

  // ── css injection ───────────────────────────────────────────────────────────
  // 2026-08-05 (hraða-/þema-úttekt): EIN mis-smellt regla — `svg` með gildissvið
  // „allar síður" — lenti hér inni og litaði ÖLL tákn í appinu #f4f3e6 með
  // !important, svo engin táknmynd hélt sínum lit fyrr en hún þvingaði hann
  // inline. Bert element-heiti á öllum síðum er alltaf slys: það nær yfir
  // hundruð hluta sem notandinn sá aldrei. Slíkar reglur eru hunsaðar hér (og
  // aldrei búnar til framar — sjá ruleFor).
  const BARE_TAG = /^[a-z][a-z0-9]*$/i;
  function isGlobalTagRule(r) {
    return r && r.scope === 'all' && BARE_TAG.test(String(r.sel || '').trim());
  }

  // Eigindin sem eiga að ná NIÐUR Í frumurnar þegar valin er heil tafla.
  // Aðeins þau sem frumur eiga sjálfar — ekki t.d. border/breidd á töflunni.
  const CELL_PROPS = ['font-size', 'line-height', 'font-weight', 'font-family',
    'letter-spacing', 'color', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right'];
  // Á valinn velji við TÖFLU? Flett upp í DOM-inu og svarið geymt per applyCss-
  // keyrslu (sami velji kemur oft fyrir og querySelector er ekki ókeypis).
  let _tblCache = null;
  function selHitsTable(sel) {
    if (_tblCache && sel in _tblCache) return _tblCache[sel];
    let hit = false;
    try { const el = document.querySelector(sel); hit = !!el && el.tagName === 'TABLE'; } catch (_) {}
    if (_tblCache) _tblCache[sel] = hit;
    return hit;
  }
  function applyCss() {
    _tblCache = {};
    let st = document.getElementById(STYLE_ID);
    if (!st) { st = document.createElement('style'); st.id = STYLE_ID; document.head.appendChild(st); }
    let css = '';
    // ── SÍÐU-ZOOM ───────────────────────────────────────────────────────────
    // Agnar 29.08: „kannski eins og zoom out 20%". `zoom` er notað en EKKI
    // `transform:scale()`: scale minnkar aðeins myndina og skilur eftir sama
    // pláss, svo spjöldin héldu sinni hæð og ekkert ynnist. `zoom` reiknar
    // umbrotið upp á nýtt — kortin verða raunverulega lægri og fleiri komast
    // á skjáinn, sem var tilgangurinn.
    for (const vid in (state.zoom || {})) {
      const z = state.zoom[vid];
      if (!z || z === 100) continue;
      css += '#' + vid + '#' + vid + '{zoom:' + (z / 100) + '}' + String.fromCharCode(10);
    }
    const colorSels = [];
    for (const r of state.rules) {
      const keys = r.decls ? Object.keys(r.decls) : [];
      if (!keys.length) continue;
      if (isGlobalTagRule(r)) {
        console.warn('[stílstjóri] hunsa alheimsreglu á berum tag-velja:', r.sel, r.decls);
        continue;
      }
      const body = keys.map(p => p + ':' + r.decls[p] + (/!important/.test(r.decls[p]) ? '' : ' !important')).join(';');
      const cellProps = keys.filter(p => CELL_PROPS.indexOf(p) >= 0);
      // Tvöfalt id (#view-x#view-x) + html-forskeyti: Stílstjóra-reglan á að
      // VINNA á contrast-/þema-læsingum með !important id-pinnum (232/313
      // o.fl.) — notandinn valdi þetta sjálfur (Agnar 26.08: „næ ekki að
      // breyta litnum af neinum af fyrirsögnunum").
      const sel = r.scope === 'all' ? 'html ' + r.sel : '#' + r.scope + '#' + r.scope + ' ' + r.sel;
      css += sel + '{' + body + '}\n';
      // TAFLA: frumurnar (th/td) hafa sínar EIGIN letur-, lita- og bil-reglur í
      // stílblöðum appsins, svo regla sem sett er á <table> erfist aldrei niður
      // í þær — taflan leit út fyrir að vera ósnert þótt sleðinn hreyfðist
      // (Agnar 26.08: „Letur fór 14→9 í panelinum en taflan breyttist EKKERT").
      // Speglum því frumu-eigindunum yfir á th/td. Röðin skiptir máli: þessi
      // regla kemur Á EFTIR töflu-reglunni og er sértækari, svo hún vinnur.
      // Bil-eigindin fara líka hingað — það er raunveruleg röð-hæð í töflu
      // (padding á <table> gerir ekkert sýnilegt).
      if (cellProps.length && selHitsTable(sel)) {
        const cellBody = cellProps
          .map(p => p + ':' + r.decls[p] + (/!important/.test(r.decls[p]) ? '' : ' !important')).join(';');
        css += sel + ' th,' + sel + ' td{' + cellBody + '}\n';
      }
      if (r.decls.color) colorSels.push(sel);
    }
    window.__peColorSels = colorSels;
    const bgDecl = (v, fixed) => String(v).indexOf('css:') === 0
      ? 'background:' + v.slice(4) + ' !important'
      : 'background-image:url(' + v + ') !important;background-size:cover !important;background-position:center !important' + (fixed ? ';background-attachment:fixed !important' : '');
    if (state.bg && state.bg.all) css += 'body{' + bgDecl(state.bg.all, true) + '}\n';
    if (state.bg && state.bg.pages) for (const vid in state.bg.pages) { if (state.bg.pages[vid]) css += '#' + vid + '{' + bgDecl(state.bg.pages[vid], false) + '}\n'; }
    st.textContent = css;
    try { scrubContrastInk(); } catch (_) {}
  }
  // 313-contrast-clarity skrifar inline-lit með !important (merkir data-cc313).
  // Þegar Stílstjórinn á lit-reglu sem nær yfir hlutinn víkur inline-liturinn
  // svo val notandans sjáist strax — 313 sleppir honum svo framvegis.
  function controlsColor(el) {
    const sels = window.__peColorSels || [];
    for (let i = 0; i < sels.length; i++) {
      try { if (el.closest && el.closest(sels[i])) return true; } catch (_) {}
    }
    return false;
  }
  function scrubContrastInk() {
    document.querySelectorAll('[data-cc313]').forEach(el => {
      if (controlsColor(el)) { el.style.removeProperty('color'); el.removeAttribute('data-cc313'); }
    });
  }

  // Set/clear one declaration on the current target.
  // Rule fyrir AUKA-valinn hlut (Velja marga) — sama leið og currentRule.
  function ruleForEl(el, create) {
    const scp = scope === 'all' ? 'all' : (viewIdOf(el) || 'all');
    return ruleFor(relSelector(el, matchMode === 'many'), scp, create);
  }
  // Keyrir fn á reglu aðal-valsins OG hvers auka-valins hlutar (Velja marga).
  function eachRule(create, fn) {
    const seen = {};
    const r0 = currentRule(create);
    if (r0) { fn(r0); seen[r0.scope + '|' + r0.sel] = 1; }
    extraTargets.forEach(el => {
      if (!el || !el.isConnected) return;
      const r = ruleForEl(el, create); if (!r) return;
      const k = r.scope + '|' + r.sel; if (seen[k]) return; seen[k] = 1;
      fn(r);
    });
    return r0;
  }
  function setDecl(prop, val) {
    snapshot();
    const r0 = eachRule(true, r => {
      if (val === '' || val == null) delete r.decls[prop]; else r.decls[prop] = val;
    });
    if (!r0) return;
    persist();
  }
  function getDecl(prop) { const r = currentRule(false); return r && r.decls ? r.decls[prop] : undefined; }
  // Apply a numeric size (from slider OR manual number box). Padding V/H set BOTH
  // sides and drop any `padding` shorthand so squared buttons actually shrink.
  // CSS-eigindi sem TAKA EKKI einingu. Áður féllu þau í px-greinina hér að neðan
  // ef kallandinn gaf ranga einingu, og út kom ógilt `font-weight:300px` sem
  // vafrinn hendir þegjandi. Listinn ver okkur óháð því hvað kallandinn sendir.
  const UNITLESS_PROPS = new Set([
    'font-weight', 'line-height', 'opacity', 'z-index',
    'flex-grow', 'flex-shrink', 'order', 'font-variation-settings',
  ]);
  function applySize(prop, unit, raw) {
    let val = parseFloat(String(raw).replace(',', '.')); if (!isFinite(val)) return;
    snapshot();
    const r0 = eachRule(true, r => {
      if (prop === 'padding-top') { r.decls['padding-top'] = val + 'px'; r.decls['padding-bottom'] = val + 'px'; delete r.decls['padding']; }
      else if (prop === 'padding-left') { r.decls['padding-left'] = val + 'px'; r.decls['padding-right'] = val + 'px'; delete r.decls['padding']; }
      else if (prop === 'height' && val <= 0) { delete r.decls['height']; }   // 0 = auto (unset)
      else if (prop === 'line-height') { r.decls['line-height'] = String(val / 100); }
      else if (unit === '%') { r.decls[prop] = val + '%'; }
      else if (unit === '' || UNITLESS_PROPS.has(prop)) { r.decls[prop] = String(val); }
      else { if (prop === 'border-width') r.decls['border-style'] = 'solid'; r.decls[prop] = val + 'px'; }
    });
    if (!r0) return;
    persist();
  }
  // Read the element's live value (override → computed) for slider init.
  function liveNum(prop, fallback) {
    // Línuhæðar-sleðinn er á PRÓSENTU-skala (90–240) en bæði reiknaða gildið
    // („21px") og vistaða gildið (hlutfall, „1.4") eru á öðrum skala. Án
    // umreiknings lenti 21 utan marka og sleðinn virtist FASTUR — Agnar 26.08:
    // „Línuhæð-sleðinn hreyfist ekki einu sinni (fast í 21)".
    if (prop === 'line-height') return liveLineHeightPct(fallback);
    const ov = getDecl(prop); if (ov != null) { const n = parseFloat(ov); if (isFinite(n)) return n; }
    if (!target) return fallback;
    const cs = getComputedStyle(target); const n = parseFloat(cs[prop] || cs.getPropertyValue(prop)); return isFinite(n) ? Math.round(n) : fallback;
  }
  function liveLineHeightPct(fallback) {
    const ov = getDecl('line-height');
    if (ov != null) {
      const n = parseFloat(ov);
      // Vistað sem einingalaust hlutfall (applySize skrifar val/100) → ×100.
      if (isFinite(n)) return Math.round(n <= 5 ? n * 100 : n);
    }
    if (!target) return fallback;
    const cs = getComputedStyle(target);
    const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
    if (isFinite(lh) && isFinite(fs) && fs > 0) return Math.round((lh / fs) * 100);
    return fallback;
  }
  function liveColor(prop, fallback) {
    const ov = getDecl(prop); if (ov) return toHex(ov) || fallback;
    if (!target) return fallback;
    return toHex(getComputedStyle(target)[prop]) || fallback;
  }
  function toHex(c) {
    if (!c) return null; c = String(c).trim();
    if (/^#([0-9a-f]{6})$/i.test(c)) return c;
    const m = c.match(/rgba?\(([^)]+)\)/i); if (!m) return /^#([0-9a-f]{3})$/i.test(c) ? c : null;
    const p = m[1].split(',').map(x => parseFloat(x));
    return '#' + p.slice(0, 3).map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  }

  // ── hnappa- & merkja-safn (button / badge collection) ───────────────────────
  // Pure-CSS re-creations of the reference button styles (glossy pills, chrome &
  // gold metal frames, neon glow, modern gradient pills). Applied to whatever
  // element is selected — a button OR a status pill/badge.
  const glossPill = (c1, c2, txt, ts) => ({
    'border-radius': '999px', 'border': '0', 'padding': '12px 26px', 'color': txt, 'font-weight': '700', 'text-shadow': ts,
    'background': 'linear-gradient(180deg,rgba(255,255,255,.6),rgba(255,255,255,0) 46%), linear-gradient(180deg,' + c1 + ',' + c2 + ')',
    'box-shadow': 'inset 0 1px 1px rgba(255,255,255,.85), inset 0 -8px 12px rgba(0,0,0,.22), 0 6px 14px rgba(0,0,0,.35)'
  });
  const metalBar = (c1, c2) => ({
    'border-radius': '10px', 'padding': '12px 24px', 'color': '#fff', 'font-weight': '800', 'text-shadow': '0 1px 2px rgba(0,0,0,.5)',
    'border': '5px solid transparent',
    'background': 'linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,0) 45%), linear-gradient(180deg,' + c1 + ',' + c2 + ') padding-box, linear-gradient(180deg,#fafafa,#7a7f86 50%,#c9ccd1) border-box',
    'box-shadow': '0 6px 16px rgba(0,0,0,.4), inset 0 1px 2px rgba(255,255,255,.4)'
  });
  const neonRound = (c1, c2, glow) => ({
    'border-radius': '50%', 'width': '92px', 'height': '92px', 'min-height': '92px', 'padding': '0', 'color': '#fff', 'font-weight': '800', 'text-shadow': '0 1px 3px rgba(0,0,0,.6)',
    'border': '3px solid #cfd3d8',
    'background': 'radial-gradient(circle at 50% 32%,rgba(255,255,255,.65),rgba(255,255,255,0) 44%), linear-gradient(180deg,' + c1 + ',' + c2 + ')',
    'box-shadow': '0 0 20px 3px ' + glow + ', inset 0 -8px 14px rgba(0,0,0,.45), inset 0 3px 6px rgba(255,255,255,.45)'
  });
  const gradPill = (c1, c2) => ({
    'border-radius': '999px', 'border': '0', 'padding': '12px 26px', 'color': '#fff', 'font-weight': '700', 'text-shadow': '0 1px 2px rgba(0,0,0,.25)',
    'background': 'linear-gradient(135deg,' + c1 + ',' + c2 + ')', 'box-shadow': '0 8px 18px -6px rgba(0,0,0,.4)'
  });
  const chromeFrame = (inner1, inner2, extraGlow) => ({
    'border-radius': '12px', 'padding': '12px 22px', 'color': '#fff', 'font-weight': '800', 'letter-spacing': '.05em', 'text-shadow': '0 1px 0 #000',
    'border': '3px solid transparent',
    'background': 'linear-gradient(' + inner1 + ',' + inner2 + ') padding-box, linear-gradient(180deg,#f2f2f2,#8f8f8f 45%,#3a3a3a) border-box',
    'box-shadow': (extraGlow ? extraGlow + ', ' : '') + '0 6px 16px rgba(0,0,0,.5), inset 0 1px 2px rgba(255,255,255,.18)'
  });
  const goldFrame = (inner1, inner2, txt) => ({
    'border-radius': '8px', 'padding': '11px 24px', 'color': txt, 'font-weight': '800', 'text-shadow': '0 1px 2px rgba(0,0,0,.55)',
    'border': '4px solid transparent',
    'background': 'linear-gradient(' + inner1 + ',' + inner2 + ') padding-box, linear-gradient(180deg,#fff3b0,#9a6c15) border-box',
    'box-shadow': '0 6px 16px rgba(0,0,0,.45), inset 0 1px 2px rgba(255,255,255,.5)'
  });
  // Dark metallic SQUARED button (compact, small radius). Uses padding-top/bottom
  // longhand so the size sliders can shrink it (no `padding` shorthand to fight).
  const metalSquare = (c1, c2) => ({
    'border-radius': '6px', 'padding-top': '9px', 'padding-bottom': '9px', 'padding-left': '18px', 'padding-right': '18px',
    'color': '#fff', 'font-weight': '800', 'text-shadow': '0 1px 2px rgba(0,0,0,.6)',
    'border': '1px solid rgba(0,0,0,.6)',
    'background': 'linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 46%), linear-gradient(180deg,' + c1 + ',' + c2 + ')',
    'box-shadow': 'inset 0 1px 0 rgba(255,255,255,.28), inset 0 -3px 7px rgba(0,0,0,.55), 0 4px 10px rgba(0,0,0,.4)'
  });

  // Hnappa- og glugga-galleríin (2026-08-26, söfn Agnars endurgerð í CSS).
  const BTN_GALLERY = [
    ['01 Fægt gull', { background: 'linear-gradient(180deg,#f3d98b,#c9a44a 55%,#a67c28)', color: '#2a1f08', border: '1px solid #8a6a1f', 'border-radius': '9px', 'box-shadow': 'inset 0 1px 0 rgba(255,255,255,.6),0 2px 5px rgba(0,0,0,.35)', 'text-shadow': '0 1px 0 rgba(255,255,255,.35)', 'font-weight': '700' }],
    ['02 Gljái sweep', { background: 'linear-gradient(105deg,#c9a44a 0%,#f7e6a8 45%,#c9a44a 62%)', color: '#3a2b0a', border: '1px solid #9a7a24', 'border-radius': '9px', 'box-shadow': '0 2px 6px rgba(0,0,0,.3)', 'font-weight': '700' }],
    ['03 Burstað stál', { background: 'repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 3px),linear-gradient(180deg,#3a4049,#23272e)', color: '#eef1f5', border: '1px solid #14171c', 'border-radius': '9px', 'box-shadow': 'inset 0 1px 0 rgba(255,255,255,.12),0 2px 4px rgba(0,0,0,.4)' }],
    ['04 Króm silfur', { background: 'linear-gradient(180deg,#f5f7fa,#c3cad4 50%,#98a1ad)', color: '#1c2230', border: '1px solid #7d8794', 'border-radius': '9px', 'box-shadow': 'inset 0 1px 0 #fff,0 2px 5px rgba(0,0,0,.3)', 'font-weight': '700' }],
    ['05 Gler frosted', { background: 'rgba(30,34,42,.55)', color: '#f2f4f8', border: '1px solid rgba(255,255,255,.25)', 'border-radius': '10px', 'backdrop-filter': 'blur(6px)', 'box-shadow': '0 2px 8px rgba(0,0,0,.25)' }],
    ['06 Gler gullrönd', { background: 'rgba(22,17,8,.5)', color: '#e9d9a6', border: '1px solid #c9a44a', 'border-radius': '10px', 'box-shadow': 'inset 0 0 8px rgba(201,164,74,.15)' }],
    ['07 Vélað rautt', { background: 'linear-gradient(135deg,#e2555f,#8e1219 60%,#5a0c10)', color: '#fff', border: '1px solid #4a0a0e', 'border-radius': '9px', 'box-shadow': 'inset 0 1px 0 rgba(255,255,255,.25),0 2px 5px rgba(0,0,0,.4)', 'text-shadow': '0 1px 1px rgba(0,0,0,.35)', 'font-weight': '700' }],
    ['08 Neumorphic', { background: '#efece4', color: '#3a3f4a', border: '0', 'border-radius': '12px', 'box-shadow': '6px 6px 12px rgba(0,0,0,.12),-6px -6px 12px #ffffff', 'font-weight': '600' }],
    ['09 Grafið inset', { background: '#ece9e1', color: '#5a5f6a', border: '0', 'border-radius': '10px', 'box-shadow': 'inset 3px 3px 7px rgba(0,0,0,.16),inset -3px -3px 7px #ffffff' }],
    ['10 3D chunky', { background: 'linear-gradient(180deg,#2fa866,#1f8a50)', color: '#fff', border: '0', 'border-radius': '10px', 'box-shadow': '0 5px 0 #14663a,0 7px 10px rgba(0,0,0,.3)', 'font-weight': '800' }],
    ['11 Foil-rammi', { background: 'transparent', color: '#e9d9a6', border: '2px solid #d4af5a', 'border-radius': '10px', 'box-shadow': 'inset 0 0 12px rgba(212,175,90,.22)', 'font-weight': '700' }],
    ['12 Glóð pulse', { background: '#171310', color: '#f3d98b', border: '1px solid #d4af5a', 'border-radius': '10px', 'box-shadow': '0 0 14px rgba(212,175,90,.45)', 'font-weight': '700' }],
    ['13 Holographic', { background: 'linear-gradient(115deg,#c9b7ff,#a8e6cf 40%,#ffd3e0 70%,#c1e3ff)', color: '#21262e', border: '1px solid rgba(120,120,160,.35)', 'border-radius': '10px', 'font-weight': '700' }],
    ['14 Satín gull-texti', { background: 'transparent', color: '#d9b967', border: '0', 'text-shadow': '0 1px 1px rgba(0,0,0,.25)', 'font-weight': '800', 'letter-spacing': '.03em' }],
    ['15 Kolefnistrefjar', { background: 'repeating-linear-gradient(45deg,#17191d 0 6px,#22252b 6px 12px)', color: '#dfe3ea', border: '1px solid #0d0f13', 'border-radius': '9px' }],
    ['16 Leður saumur', { background: '#2a1c12', color: '#e8d9c0', border: '1px dashed #c9a05f', 'border-radius': '10px', 'box-shadow': 'inset 0 0 10px rgba(0,0,0,.5)' }],
  ];
  const PANEL_GALLERY = [
    ['G1 Hvítt kort', { background: '#ffffff', color: '#11141c', border: '1px solid #e6eaf0', 'border-radius': '14px', 'box-shadow': '0 2px 10px rgba(15,23,42,.08)' }],
    ['G2 Lux dökkt + gull', { background: 'linear-gradient(180deg,#15130e,#0c0b08)', color: '#efe6cd', border: '1px solid rgba(212,175,90,.5)', 'border-radius': '12px' }],
    ['G3 Gler frosted', { background: 'rgba(18,21,28,.6)', color: '#eef1f6', border: '1px solid rgba(255,255,255,.18)', 'border-radius': '14px', 'backdrop-filter': 'blur(8px)' }],
    ['G4 Pappír + litarönd', { background: '#faf7ef', color: '#23262e', border: '1px solid #e4ded0', 'border-top': '3px solid #C93C1D', 'border-radius': '12px' }],
    ['G5 Grafið krem', { background: '#efece4', color: '#3a3f4a', border: '0', 'border-radius': '14px', 'box-shadow': 'inset 3px 3px 8px rgba(0,0,0,.13),inset -3px -3px 8px #ffffff' }],
    ['G6 Kolefni', { background: 'repeating-linear-gradient(45deg,#17191d 0 8px,#22252b 8px 16px)', color: '#e6e9ef', border: '1px solid #0d0f13', 'border-radius': '12px' }],
    ['G7 Burstað stál', { background: 'repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px),linear-gradient(180deg,#565d68,#454c56)', color: '#f2f4f8', border: '1px solid #2b3037', 'border-radius': '12px' }],
    ['G8 Pergament vignetta', { background: 'radial-gradient(120% 100% at 50% 40%,transparent 55%,rgba(150,110,40,.16)),#f1e9d6', color: '#4a3c22', border: '1px solid rgba(160,120,40,.4)', 'border-radius': '12px' }],
  ];
  const PRESET_GROUPS = [
    { label: '🔘 Hnappa-gallerí (safnið þitt)', items: BTN_GALLERY },
    { label: '🪟 Glugga & spjalda-gallerí', items: PANEL_GALLERY },
    { label: 'Glans-pillur', items: [
      ['Silfur', glossPill('#ffffff', '#b9bfc6', '#2a2f36', '0 1px 0 rgba(255,255,255,.7)')],
      ['Gull', glossPill('#ffe08a', '#c8892b', '#fff', '0 1px 2px rgba(0,0,0,.4)')],
      ['Grænn', glossPill('#9be15d', '#3f9e1b', '#fff', '0 1px 2px rgba(0,0,0,.4)')],
      ['Rauður', glossPill('#ef5a52', '#a3160f', '#fff', '0 1px 2px rgba(0,0,0,.4)')],
      ['Blár', glossPill('#5bb6f5', '#1462c8', '#fff', '0 1px 2px rgba(0,0,0,.4)')],
      ['Fjólublár', glossPill('#d07de0', '#8e24aa', '#fff', '0 1px 2px rgba(0,0,0,.4)')],
      ['Svartur', glossPill('#4a4a4a', '#0c0c0c', '#fff', '0 1px 2px rgba(0,0,0,.5)')],
    ]},
    { label: 'Málmur & rammar', items: [
      ['Króm dökkt', chromeFrame('#2b2b2b', '#050505')],
      ['Króm rautt', chromeFrame('#8a1a15', '#2a0503', '0 0 16px rgba(200,40,30,.5)')],
      ['Gullrammi', goldFrame('#f6d873', '#a9781a', '#fff5cc')],
      ['Gullrammi svart', goldFrame('#2a2a2a', '#050505', '#ffe9a8')],
      ['Málmbjálki rauður', metalBar('#e0463c', '#8a120c')],
      ['Málmbjálki blár', metalBar('#3a86e0', '#12468f')],
      ['Málmbjálki grænn', metalBar('#63c23a', '#227a12')],
    ]},
    { label: 'Dökkur málmur — ferningur', items: [
      ['Dökkt', metalSquare('#3a3a40', '#111114')],
      ['Rautt', metalSquare('#a3251f', '#3a0806')],
      ['Blátt', metalSquare('#1f4f9c', '#0a1c3d')],
      ['Grænt', metalSquare('#1f7a2c', '#083312')],
      ['Gult', metalSquare('#b89a1a', '#4a3806')],
      ['Appelsínu', metalSquare('#c26a15', '#4a2405')],
      ['Grátt', metalSquare('#7c828c', '#2c2f34')],
    ]},
    { label: 'Neon (kringlótt)', items: [
      ['Neon rauður', neonRound('#e0463c', '#7a0f0a', 'rgba(224,70,60,.75)')],
      ['Neon grænn', neonRound('#6ee23a', '#1f7a12', 'rgba(110,226,58,.7)')],
      ['Neon blár', neonRound('#3aa0f5', '#0f3f9e', 'rgba(58,160,245,.75)')],
      ['Neon gull', neonRound('#ffd24a', '#c88a12', 'rgba(255,210,74,.7)')],
      ['Neon fjólublár', neonRound('#c04df0', '#6a12a0', 'rgba(192,77,240,.7)')],
    ]},
    { label: 'Nútíma halli', items: [
      ['Sólsetur', gradPill('#ff8008', '#f5325b')],
      ['Haf', gradPill('#2193b0', '#1c62d6')],
      ['Skógur', gradPill('#56ab2f', '#1e7d2b')],
      ['Ametýst', gradPill('#a044ff', '#e94fa1')],
      ['Kóral', gradPill('#ff5f6d', '#c31432')],
      ['Nótt', gradPill('#232526', '#414345')],
    ]},
    { label: 'Einfalt', items: [
      ['Dökkur málmur', { 'background': 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)', 'color': '#f4f4f6', 'border': '1px solid #0a0b0d', 'border-radius': '11px', 'box-shadow': 'inset 0 1px 0 rgba(255,255,255,.14), 0 6px 18px -8px rgba(0,0,0,.6)', 'padding': '12px 18px' }],
      ['Gler', { 'background': 'rgba(255,255,255,0.14)', 'backdrop-filter': 'blur(10px)', '-webkit-backdrop-filter': 'blur(10px)', 'border': '1px solid rgba(255,255,255,.4)', 'border-radius': '14px', 'box-shadow': '0 8px 30px -12px rgba(0,0,0,.35)', 'color': '#0f172a', 'padding': '12px 18px' }],
      ['Flöt spjald', { 'background': '#ffffff', 'border': '1px solid #e2e8f0', 'border-radius': '13px', 'box-shadow': '0 1px 2px rgba(16,24,40,.05)', 'color': '#11141c', 'padding': '13px 18px' }],
      ['Hlý', { 'background': 'linear-gradient(135deg,#fff7ed,#ffedd5)', 'border': '1px solid #fed7aa', 'border-radius': '16px', 'color': '#7c2d12', 'box-shadow': '0 2px 8px rgba(124,45,18,.08)', 'padding': '13px 18px' }],
    ]},
  ];
  function applyPreset(decls) { if (!target) { toast('Veldu hlut fyrst (🎯 Velja)'); return; }
    snapshot(); eachRule(true, r => Object.assign(r.decls, decls)); persist(); renderPanel();
  }
  // Save the selected element's current look as a named favourite (synced).
  function saveFavorite() {
    if (!target) { toast('Veldu hlut fyrst (🎯 Velja)'); return; }
    const r = currentRule(false);
    if (!r || !r.decls || !Object.keys(r.decls).length) { toast('Enginn stíll á þessum hlut enn — breyttu einhverju fyrst'); return; }
    const nm = prompt('Nafn á uppáhalds-stíl:', 'Minn stíll'); if (!nm) return;
    snapshot();
    state.favs = state.favs || []; state.favs.push({ n: nm.slice(0, 24), d: Object.assign({}, r.decls) });
    persist(); renderPanel();
  }
  function deleteFavorite(i) { if (state.favs && state.favs[i]) { snapshot(); state.favs.splice(i, 1); persist(); renderPanel(); } }
  // Chip preview: render the chip itself with the look (a real visual picker).
  function presetPreviewStyle(d) {
    const keep = ['background', 'color', 'border', 'box-shadow', 'text-shadow', 'font-weight', 'backdrop-filter'];
    const round = /50%/.test(d['border-radius'] || '');
    let s = 'padding:8px 15px;margin:0;font-size:11.5px;line-height:1.1;border-radius:' + (round || /999/.test(d['border-radius'] || '') ? '999px' : '9px') + ';';
    keep.forEach(p => { if (d[p]) s += p + ':' + d[p] + ';'; });
    return s;
  }

  const FONTS = ['(sjálfgefið)', 'IBM Plex Sans', 'JetBrains Mono', 'Source Serif 4', 'Georgia, serif', 'system-ui, sans-serif', 'Arial, sans-serif', 'Courier New, monospace', 'Impact, sans-serif'];

  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); }

  // ── styles ──────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('_pe-css')) return;
    const s = document.createElement('style'); s.id = '_pe-css';
    s.textContent = [
      '#' + BTN_ID + '{all:unset;cursor:pointer;font-size:17px;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;margin-right:6px;transition:background .12s}',
      '#' + BTN_ID + ':hover{background:rgba(255,255,255,.14)}',
      '#' + PANEL_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:99990;max-height:56vh;overflow:auto;background:#f8fafc;border-top:1px solid #cbd5e1;box-shadow:0 -12px 34px -14px rgba(15,23,42,.35);font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;color:#11141c;padding:14px 18px 22px}',
      // Hliðar-dokkun: panel í fullri hæð á breiðum skjá.
      '@media (min-width:900px){' +
        /* 2026-08-26 (Agnar): hliðarpanellinn VINSTRA megin, yfir app-sidebarnum. */
        '#' + PANEL_ID + '.pe-side{left:0;right:auto;top:0;bottom:0;width:320px;max-width:94vw;max-height:none;height:auto;border-top:0;border-left:0;border-right:1px solid #cbd5e1;box-shadow:16px 0 36px -18px rgba(15,23,42,.45);padding:12px 14px 22px;overflow-y:auto}' +
        '#' + PANEL_ID + '.pe-side .pe-grid{grid-template-columns:1fr;gap:10px}' +
        '#' + PANEL_ID + '.pe-side .pe-target{max-width:100%}' +
        /* Botn á breiðum skjá: þjappað sheet — ekki 56vh af tómum hvítum reitum. */
        '#' + PANEL_ID + ':not(.pe-side){max-height:36vh}' +
      '}',
      // Desktop/Skjár: pe-desk tryggir hlið/þjöppun líka þegar media query dugir ekki.
      '#' + PANEL_ID + '.pe-desk.pe-side{left:0;right:auto;top:0;bottom:0;width:320px;max-width:94vw;max-height:none;height:auto;border-top:0;border-left:0;border-right:1px solid #cbd5e1;box-shadow:16px 0 36px -18px rgba(15,23,42,.45);padding:12px 14px 22px;overflow-y:auto}',
      '#' + PANEL_ID + '.pe-desk:not(.pe-side){max-height:36vh}',
      // Færum síðuna til hægri svo taflan sjáist meðan stjórnborðið er opið.
      'html[data-viewmode="desktop"] body.pe-side-open #bstal-banner,' +
      'html[data-viewmode="desktop"] body.pe-side-open #bstal-ember{left:var(--pe-side-w,320px)!important;width:calc(100% - var(--pe-side-w,320px))!important;right:14px!important}',
      'html[data-viewmode="desktop"] body.pe-side-open .view.active{margin-left:var(--pe-side-w,320px)!important;box-sizing:border-box}',
      'html[data-viewmode="desktop"] body.pe-side-open .topbar{visibility:hidden;pointer-events:none}',
      // Header is now its own column: title row, then a toolbar row (wraps
      // cleanly instead of everything fighting for one line), then — only when
      // a target is picked — its own row for the selector chip. Fixes the
      // cramped/overlapping header when the selector text was long.
      '#' + PANEL_ID + ' .pe-hd{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}',
      '#' + PANEL_ID + ' .pe-titlerow{display:flex;align-items:flex-start;gap:12px}',
      '#' + PANEL_ID + ' .pe-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      // Merktir takkahópar — hver hópur er ein rönd með lítilli yfirskrift til
      // vinstri, svo augað sjái strax HVAÐ hver takki tilheyrir.
      '#' + PANEL_ID + ' .pe-grp{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:7px 9px;border:1px solid #e2e8f0;border-radius:11px;background:#fff}',
      '#' + PANEL_ID + ' .pe-grplbl{font-size:9.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#94a3b8;flex:0 0 auto;min-width:58px}',
      // Tómur hópur (t.d. „Tafla & skjár" áður en 319/320/321 hlaðast) á ekki
      // að sitja eftir sem stök merkimiða-rönd.
      '#' + PANEL_ID + ' .pe-grp:not(:has(button)){display:none}',
      '#' + PANEL_ID + ' .pe-targetrow{display:flex;align-items:center;gap:8px}',
      '#' + PANEL_ID + ' .pe-h{font-size:16px;font-weight:800;margin:0}',
      '#' + PANEL_ID + ' .pe-sub{font-size:12px;color:#64748b}',
      '#' + PANEL_ID + ' .pe-btn{all:unset;cursor:pointer;font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#334155}',
      '#' + PANEL_ID + ' .pe-btn:hover{background:#eef2f7}',
      '#' + PANEL_ID + ' .pe-btn.on{background:linear-gradient(145deg,#08080a,#3a3a41 50%,#070709);color:#fff;border-color:#0a0b0d}',
      '#' + PANEL_ID + ' .pe-btn.pri{background:#2563eb;color:#fff;border-color:#1d4ed8}',
      '#' + PANEL_ID + ' .pe-btn:disabled{cursor:default;opacity:.4;background:#fff}',
      '#' + PANEL_ID + ' .pe-btn:disabled:hover{background:#fff}',
      '#' + PANEL_ID + ' .pe-seg{display:inline-flex;background:#e9eef5;border-radius:10px;padding:3px;gap:3px}',
      '#' + PANEL_ID + ' .pe-seg button{all:unset;cursor:pointer;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;color:#475569}',
      '#' + PANEL_ID + ' .pe-seg button.on{background:#fff;color:#11141c;box-shadow:0 1px 2px rgba(0,0,0,.12)}',
      '#' + PANEL_ID + ' .pe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px 22px;margin-top:6px}',
      '#' + PANEL_ID + ' .pe-sec{background:#fff;border:1px solid #e6eaf0;border-radius:12px;padding:12px 14px}',
      '#' + PANEL_ID + ' .pe-sec h4{margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;display:inline}',
      // Each section is a <details> now (verkefnalisti feedback: panel „takes
      // huge space" — collapsed sections stay out of the way until needed).
      '#' + PANEL_ID + ' .pe-sec summary{cursor:pointer;list-style:none;margin-bottom:8px}',
      '#' + PANEL_ID + ' .pe-sec summary::-webkit-details-marker{display:none}',
      '#' + PANEL_ID + ' .pe-sec summary:before{content:"▸ ";color:#94a3b8;font-size:11px}',
      '#' + PANEL_ID + ' .pe-sec[open] summary:before{content:"▾ "}',
      '#' + PANEL_ID + ' .pe-sec[open] summary{margin-bottom:10px}',
      '#' + PANEL_ID + ' .pe-row{display:flex;align-items:center;gap:8px;margin:3px 0}',
      '#' + PANEL_ID + ' .pe-row label{flex:0 0 96px;font-size:12px;font-weight:600;color:#334155}',
      '#' + PANEL_ID + ' .pe-row input[type=range]{flex:1;min-width:80px}',
      '#' + PANEL_ID + ' .pe-val{flex:0 0 52px;width:52px;text-align:center;font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:700;font-size:12.5px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;padding:4px 2px;-moz-appearance:textfield}',
      '#' + PANEL_ID + ' .pe-val:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.2)}',
      '#' + PANEL_ID + ' .pe-val::-webkit-outer-spin-button,#' + PANEL_ID + ' .pe-val::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}',
      '#' + PANEL_ID + ' .pe-row input[type=color]{width:40px;height:28px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:1px;cursor:pointer}',
      '#' + PANEL_ID + ' .pe-row select{flex:1;font:inherit;font-size:12.5px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}',
      '#' + PANEL_ID + ' .pe-presets{display:flex;gap:9px;flex-wrap:wrap}',
      '#' + PANEL_ID + ' .pe-chip{all:unset;cursor:pointer;font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;display:inline-flex;align-items:center;justify-content:center;min-width:64px;text-align:center}',
      '#' + PANEL_ID + ' .pe-chip:hover{filter:brightness(1.06)}',
      '#' + PANEL_ID + ' .pe-pgroup{margin:2px 0 8px}',
      '#' + PANEL_ID + ' .pe-glabel{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;font-weight:700;margin:5px 0 3px}',
      '#' + PANEL_ID + ' .pe-favwrap{position:relative;display:inline-flex}',
      '#' + PANEL_ID + ' .pe-favdel{all:unset;position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:#dc2626;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.35)}',
      '#' + PANEL_ID + ' .pe-target{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11.5px;background:#111827;color:#e5e7eb;padding:4px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;max-width:320px;text-overflow:ellipsis}',
      '#' + PANEL_ID + ' .pe-empty{padding:22px;text-align:center;color:#64748b;font-size:13px;border:1px dashed #cbd5e1;border-radius:12px;background:#fff}',
      '#' + PANEL_ID + ' .pe-tip{display:none;margin:6px 0 2px;font-size:12px;color:#64748b;line-height:1.45}',
      '#' + PANEL_ID + '.pe-desk .pe-empty{display:none}',
      '#' + PANEL_ID + '.pe-desk .pe-tip{display:block}',
      // ── v2: þrepa-merki, svæða-kort og verkfæraspjöld ───────────────────────
      'body.appmode #' + PANEL_ID + '{z-index:2147481500 !important;top:50px !important}',
      'body.appmode #' + PANEL_ID + '.pe-side{height:calc(100vh - 50px) !important}',
      '#' + PANEL_ID + ' .pe-zoom{display:inline-flex;align-items:center;gap:3px;margin-left:auto}',
      '#' + PANEL_ID + ' .pe-zoomv{font-size:12px;font-weight:800;min-width:42px;text-align:center;font-variant-numeric:tabular-nums;color:#334155}',
      '#' + PANEL_ID + ' .pe-step{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;margin:14px 0 2px}',
      '#' + PANEL_ID + '.pe-desk .pe-step{margin:8px 0 2px}',
      '#' + PANEL_ID + ' .pe-pickrow{display:flex;gap:8px}',
      '#' + PANEL_ID + ' .pe-pickrow .pe-btn{flex:1;text-align:center}',
      '#' + PANEL_ID + ' .pe-btn.big{padding:8px 13px;font-size:13px}',
      '#' + PANEL_ID + '.pe-desk .pe-btn.big{padding:6px 10px;font-size:12.5px}',
      '#' + PANEL_ID + ' .pe-hd>.pe-seg{width:100%;box-sizing:border-box}',
      '#' + PANEL_ID + ' .pe-hd>.pe-seg button{flex:1;text-align:center}',
      '#' + PANEL_ID + ' .pe-map{display:flex;gap:6px;border:1px solid #e2e8f0;border-radius:11px;padding:6px;background:#fff}',
      '#' + PANEL_ID + ' .pe-map-nav{all:unset;box-sizing:border-box;cursor:pointer;flex:0 0 58px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10.5px;font-weight:700;color:#64748b;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;padding:4px}',
      '#' + PANEL_ID + ' .pe-map-col{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0}',
      '#' + PANEL_ID + ' .pe-map-z{all:unset;box-sizing:border-box;cursor:pointer;padding:8px 11px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12.5px;font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#' + PANEL_ID + ' .pe-map-z:hover,#' + PANEL_ID + ' .pe-map-nav:hover{background:#eef2f7}',
      '#' + PANEL_ID + ' .pe-map-z.on,#' + PANEL_ID + ' .pe-map-nav.on{background:#2563eb;color:#fff;border-color:#1d4ed8}',
      '#' + PANEL_ID + ' .pe-map-z.miss{opacity:.38;cursor:default}',
      '#' + PANEL_ID + ' .pe-map-z.miss:hover{background:#f8fafc}',
      // Desktop / botn: flögg í röð — ekki fullbreiddar tómar raðir (Agnar 29.08).
      '#' + PANEL_ID + '.pe-desk .pe-map,#' + PANEL_ID + ':not(.pe-side) .pe-map{flex-wrap:wrap;align-items:flex-start;gap:5px}',
      '#' + PANEL_ID + '.pe-desk .pe-map-nav,#' + PANEL_ID + ':not(.pe-side) .pe-map-nav{flex:0 0 auto;min-width:0;padding:6px 10px}',
      '#' + PANEL_ID + '.pe-desk .pe-map-col,#' + PANEL_ID + ':not(.pe-side) .pe-map-col{flex:1 1 auto;flex-direction:row;flex-wrap:wrap;gap:5px}',
      '#' + PANEL_ID + '.pe-desk .pe-map-z,#' + PANEL_ID + ':not(.pe-side) .pe-map-z{flex:0 0 auto;width:auto;max-width:100%;padding:6px 10px}',
      '#' + PANEL_ID + ' .pe-card{border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:8px 10px;margin-top:6px}',
      '#' + PANEL_ID + ' .pe-card-h{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#b58a2b;margin:0 0 5px;display:flex;align-items:center;gap:8px}',
      '#' + PANEL_ID + ' .pe-card-sub{margin-left:auto;font-size:10.5px;font-weight:700;color:#94a3b8;letter-spacing:0;text-transform:none}',
      '#' + PANEL_ID + ' .pe-frow{display:flex;align-items:center;gap:9px;margin:9px 0;flex-wrap:wrap}',
      '#' + PANEL_ID + ' .pe-flbl{flex:0 0 92px;font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8}',
      // Rofi (á/af) — stærri en checkbox og les sem staða, ekki aðgerð.
      '#' + PANEL_ID + ' .pe-sw{all:unset;cursor:pointer;width:42px;height:24px;border-radius:99px;background:#cbd5e1;position:relative;flex:0 0 auto;transition:background .15s}',
      '#' + PANEL_ID + ' .pe-sw.on{background:#16a34a}',
      '#' + PANEL_ID + ' .pe-sw:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.3)}',
      '#' + PANEL_ID + ' .pe-sw.on:after{left:21px}',
      // Stepparar: talan sem sést ER talan sem gildir (sama rök og í 322).
      '#' + PANEL_ID + ' .pe-stp{display:inline-flex;align-items:center;gap:2px;border:1px solid #cbd5e1;border-radius:8px;padding:2px;background:#fff}',
      '#' + PANEL_ID + ' .pe-stp button{all:unset;cursor:pointer;width:24px;height:24px;text-align:center;line-height:24px;font-size:15px;font-weight:800;color:#334155;border-radius:6px}',
      '#' + PANEL_ID + ' .pe-stp button:hover{background:#eef2f7}',
      '#' + PANEL_ID + ' .pe-stpv{min-width:42px;text-align:center;font-weight:700;font-size:12.5px;font-variant-numeric:tabular-nums}',
      // Fjarlægjanleg flögg (KPI-spjöld, sýnilegar síur) — ✕ felur, dragið raðar.
      '#' + PANEL_ID + ' .pe-xchip{display:inline-flex;align-items:center;gap:6px;background:#eef2f7;border:1px solid #cbd5e1;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:700;color:#334155;cursor:grab;user-select:none}',
      '#' + PANEL_ID + ' .pe-xchip.off{opacity:.42;background:#f8fafc}',
      '#' + PANEL_ID + ' .pe-xchip.drag{opacity:.5}',
      '#' + PANEL_ID + ' .pe-xchip .pe-xdel{all:unset;cursor:pointer;color:#64748b;font-weight:800;font-size:12px;line-height:1}',
      '#' + PANEL_ID + ' .pe-xchip .pe-xdel:hover{color:#dc2626}',
      '#' + PANEL_ID + ' .pe-xwrap{display:flex;flex-wrap:wrap;gap:6px}',
      'body.pe-picking *{cursor:crosshair !important}',
      '#' + HL_ID + '{position:fixed;z-index:99989;pointer-events:none;border:2px solid #2563eb;background:rgba(37,99,235,.10);border-radius:4px;transition:all .04s;display:none}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── the panel ───────────────────────────────────────────────────────────────
  function sliderRow(label, prop, min, max, step, unit) {
    const v = liveNum(prop, min);
    // 2026-08-29 (Agnar: „ég næ rosalega takmarkað að stækka þessa glugga box").
    // Talnareiturinn hefur aldrei haft þak, en sleðinn hafði FAST hámark. Þegar
    // gildið fór yfir það sat sleðinn pinnaður lengst til hægri og hreyfðist
    // ekki lengra — það leit út eins og stækkunin sjálf væri búin. Hámarkið
    // eltir núna gildið (+25% svigrúm), svo alltaf megi draga lengra en núna er.
    const st = step || 1;
    const hi = Math.max(max, Math.ceil((+v || 0) * 1.25 / st) * st);
    return '<div class="pe-row"><label>' + esc(label) + '</label>' +
      '<input type="range" data-slider="' + prop + '" data-unit="' + (unit || 'px') + '" min="' + min + '" max="' + hi + '" step="' + st + '" value="' + v + '">' +
      '<input type="number" class="pe-val" data-num="' + prop + '" data-unit="' + (unit || 'px') + '" step="' + (step || 1) + '" value="' + v + '"></div>';
  }
  function colorRow(label, prop) {
    return '<div class="pe-row"><label>' + esc(label) + '</label>' +
      '<input type="color" data-color="' + prop + '" value="' + liveColor(prop, '#333333') + '">' +
      '<button class="pe-btn" data-clear="' + prop + '" title="Hreinsa">✕</button></div>';
  }
  function renderPanel() {
    const p = document.getElementById(PANEL_ID); if (!p) return;
    extraTargets = extraTargets.filter(el => el && el.isConnected && el !== target);
    const targetLbl = target ? relSelector(target, matchMode === 'many') + (extraTargets.length ? '  (+' + extraTargets.length + ' valdir)' : '') : '';
    const scopeSeg = '<div class="pe-seg" title="Vista breytingu á þessari síðu eingöngu, eða öllum síðum"><button data-scope="page"' + (scope === 'page' ? ' class="on"' : '') + '>Þessi síða</button>' +
      '<button data-scope="all"' + (scope === 'all' ? ' class="on"' : '') + '>Allar síður</button></div>';
    const matchSeg = '<div class="pe-seg" title="Bara þennan staka hlut, eða ALLA hluti sem líta eins út (t.d. allar raðir í töflu í einu)"><button data-match="one"' + (matchMode === 'one' ? ' class="on"' : '') + '>🎯 Bara þennan</button>' +
      '<button data-match="many"' + (matchMode === 'many' ? ' class="on"' : '') + '>📑 Alla eins</button></div>';
    // v2-uppbygging (hönnun Agnars 26.08): tvö NÚMERUÐ þrep í stað einnar flatrar
    // hrúgu — „1 · VELDU" (hvað ætlarðu að snerta) og „2 · BREYTTU" (stíla-söfnin).
    // Á milli þeirra situr verkfæraspjald valins svæðis. Aðgerðir á síðuna
    // (vista/afturkalla/resetta/bakgrunnur) færast upp í hausinn þar sem þær
    // tilheyra — þær eiga hvorugt þrepið.
    // ⚠️ `.pe-toolbar` verður að lifa áfram sem klasi: patchar 319/320/321 finna
    // hann með querySelector('.pe-toolbar') og appenda sínum tökkum.
    const head = '<div class="pe-hd">' +
      '<div class="pe-titlerow">' +
        '<div style="flex:1"><h3 class="pe-h">🎨 Stilla útlit</h3></div>' +
        '<button class="pe-btn" id="pe-dock" title="Færa stjórnborðið milli hliðar og botns">' + (dock === 'side' ? '⇓ Botn' : '⇥ Hlið') + '</button>' +
        '<button class="pe-btn" id="pe-close">✕ Loka</button>' +
      '</div>' +
      '<div class="pe-step">1 · Veldu</div>' +
      '<div class="pe-pickrow">' +
        '<button class="pe-btn big ' + (picking ? 'on' : 'pri') + '" id="pe-pick">' + (picking ? '🎯 Hætta að velja' : '🎯 Velja hlut') + '</button>' +
        '<button class="pe-btn big' + (multiPick ? ' on' : '') + '" id="pe-multi" title="Smelltu á nokkra hluti — sömu breytingar fara á þá alla">☑ Velja marga</button>' +
      '</div>' +
      scopeSeg +
      zoneMapSection() +
      (target ? '<div class="pe-targetrow"><span class="pe-target" title="' + esc(targetLbl) + '"><b>' + esc(friendlyName(target)) + '</b> · ' + esc(targetLbl) + '</span>' +
        '<button class="pe-btn" id="pe-parent" title="Velja hlutinn UTAN um þennan (stækka valið)">⬆ Foreldri</button>' +
        (target.closest && target.closest('table') && target.tagName !== 'TABLE' ? '<button class="pe-btn" id="pe-pick-table" title="Velja töfluna í heild">📊 Taflan</button>' : '') +
        '<button class="pe-btn" id="pe-unpick">hreinsa val</button></div>' : '') +
      (target ? '<div class="pe-grp">' + '<span class="pe-grplbl">Nákvæmni</span>' + matchSeg + '</div>' : '') +
      '<div class="pe-grp pe-toolbar">' +
        '<span class="pe-grplbl">Tafla &amp; skjár</span>' +
      '</div>' +
      '</div>';

    // „Síðan"-aðgerðirnar (vista/afturkalla/resetta/bakgrunnur) sitja NEÐST
    // (Agnar 27.08: „færa Síðan vista síðu alveg niður"). Þær eru lokahnykkurinn
    // — maður velur, breytir og vistar SVO — og þær ýttu verkfærunum niður fyrir
    // brún á meðan þær sátu efst.
    const sidanGrp = '<div class="pe-grp" style="margin-top:14px">' +
      '<span class="pe-grplbl">Síðan</span>' +
      '<button class="pe-btn pri" id="pe-savepage" title="Vista útlit þessarar síðu sem nefnda útgáfu — hægt að sækja aftur hvenær sem er">💾 Vista síðu</button>' +
      '<button class="pe-btn" id="pe-undo"' + (undoStack.length ? '' : ' disabled') + ' title="Afturkalla síðustu breytingu">↩ Afturkalla</button>' +
      '<button class="pe-btn" id="pe-reset">↺ Resetta ▾</button>' +
      '<button class="pe-btn" id="pe-bg">🖼 Bakgrunnsmynd</button>' +
      // Zoom á SÍÐUNA sjálfa — lækkar kortin og kemur fleirum á skjáinn.
      '<span class="pe-zoom">' +
        '<button class="pe-btn" data-zoom="-10" title="Minnka um 10%">−</button>' +
        '<span class="pe-zoomv">' + curZoom() + '%</span>' +
        '<button class="pe-btn" data-zoom="10" title="Stækka um 10%">+</button>' +
        (curZoom() !== 100 ? '<button class="pe-btn" data-zoom="0" title="Aftur í 100%">↺</button>' : '') +
      '</span>' +
    '</div>';

    const step2 = '<div class="pe-step">2 · Breyttu</div>';
    let body;
    if (!target) {
      body = cardSection() +
        (activeZone && cards[activeZone] ? '' :
          '<div class="pe-empty">Smelltu á svæði í kortinu hér að ofan — eða á <b>🎯 Velja hlut</b> og svo á texta, box eða glugga á síðunni.</div>' +
          '<div class="pe-tip">Veldu hlut á síðunni (🎯) eða svæði hér að ofan — síðan stillirðu lit, letur eða hnappastíl fyrir neðan.</div>') +
        step2 + presetsSection() + bgGallerySection() + versionsSection() + tableHelpSection() + linkasafnSection();
    } else {
      body = cardSection() + step2 + '<div class="pe-grid">' +
        '<details class="pe-sec"><summary><h4>Stærð &amp; bil</h4></summary>' +
          sliderRow('Letur', 'font-size', 8, 54, 1) +
          sliderRow('Línuhæð', 'line-height', 90, 240, 5, '%') +
          sliderRow('Leturþyngd', 'font-weight', 100, 900, 100, '') +
          sliderRow('Padding lóðrétt', 'padding-top', 0, 60, 1) +
          sliderRow('Padding lárétt', 'padding-left', 0, 60, 1) +
          sliderRow('Stafabil', 'letter-spacing', -2, 8, 0.5) +
        '</details>' +
        '<details class="pe-sec"><summary><h4>Box &amp; gluggi</h4></summary>' +
          // Grunn-hámörkin miðast við raunveruleg borð, ekki við smáhluti:
          // breið tafla þarf meira en 1280px og há síða meira en 600px. Sleðinn
          // fer sjálfkrafa hærra en þetta ef gildið er þegar hærra (sjá sliderRow).
          sliderRow('Breidd', 'width', 40, 3840, 5) +
          sliderRow('Hæð (0=sjálfv.)', 'height', 0, 2400, 2) +
          sliderRow('Lágmarkshæð', 'min-height', 0, 2400, 5) +
          sliderRow('Border þykkt', 'border-width', 0, 10, 1) +
          sliderRow('Border radíus', 'border-radius', 0, 44, 1) +
          sliderRow('Bil (gap)', 'gap', 0, 40, 1) +
        '</details>' +
        '<details class="pe-sec" open><summary><h4>Litir</h4></summary>' +
          colorRow('Texti', 'color') +
          colorRow('Bakgrunnur', 'background-color') +
          colorRow('Border', 'border-color') +
          '<div class="pe-row"><label>Halli (gradient)</label>' +
            '<input type="color" data-grad="c1" value="' + (gradPart(0) || '#111827') + '">' +
            '<input type="color" data-grad="c2" value="' + (gradPart(1) || '#3b82f6') + '">' +
            '<input type="range" data-grad="ang" min="0" max="360" step="5" value="' + (gradAngle() || 145) + '">' +
            '<button class="pe-btn" data-clear="background">✕</button></div>' +
        '</details>' +
        '<details class="pe-sec"><summary><h4>Leturgerð</h4></summary>' +
          '<div class="pe-row"><label>Font</label><select data-font>' + FONTS.map(f => '<option value="' + esc(f) + '"' + ((getDecl('font-family') || '') === f ? ' selected' : '') + '>' + esc(f) + '</option>').join('') + '</select></div>' +
          '<div class="pe-sub" style="margin-top:6px">Border sést aðeins þegar þykkt &gt; 0.</div>' +
        '</details>' +
      '</div>' + presetsSection() + bgGallerySection() + versionsSection() + tableHelpSection() + linkasafnSection();
    }
    p.innerHTML = head + body + sidanGrp;
    wirePanel();
    wireCard();
  }
  // ── „Útgáfur" (2026-08-26, ósk Agnars: „save as … nokkrar útgáfur af layout
  // og litum") — nafngreind heildar-snapshot af öllu útlitinu: allar
  // Stílstjóra-reglur + bakgrunnar + töflustillingar (319: breiddir/jöfnun/
  // raðhæð). Vistast í AppSettings með state → fylgja milli tækja.
  function tableLookGet() {
    try { return window.TableLook && TableLook.get ? TableLook.get() : {}; } catch (_) { return {}; }
  }
  function tableLookSet(v) {
    try { if (window.TableLook && TableLook.set) TableLook.set(v || {}); } catch (_) {}
  }
  function saveVersionAs() {
    let name = prompt('Nafn útgáfu (t.d. „Þétt vinnusýn"):', '');
    if (!name) return; name = String(name).trim().slice(0, 40); if (!name) return;
    snapshot();
    const snap = {
      name, savedAt: new Date().toISOString().slice(0, 16),
      rules: JSON.parse(JSON.stringify(state.rules || [])),
      bg: JSON.parse(JSON.stringify(state.bg || { all: null, pages: {} })),
      tables: tableLookGet(),
    };
    const i = state.versions.findIndex(v => v.name === name);
    if (i >= 0) state.versions[i] = snap; else state.versions.push(snap);
    persist(); renderPanel(); toast('💾 Útgáfa „' + name + '" vistuð');
  }
  function activateVersion(i) {
    const v = state.versions && state.versions[i]; if (!v) return;
    snapshot();
    state.rules = JSON.parse(JSON.stringify(v.rules || []));
    state.bg = JSON.parse(JSON.stringify(v.bg || { all: null, pages: {} }));
    tableLookSet(v.tables || {});
    persist(); renderPanel(); toast('✓ Útgáfa „' + v.name + '" virk');
  }
  function deleteVersion(i) {
    const v = state.versions && state.versions[i]; if (!v) return;
    if (!confirm('Eyða útgáfunni „' + v.name + '"?')) return;
    snapshot(); state.versions.splice(i, 1); persist(); renderPanel();
  }
  // ── Bakgrunna-gallerí (2026-08-26, ósk Agnars — F/BG safnið hans úr Claude,
  // endurgert sem HREINT CSS: gradients+mynstur, engar myndir, hlaðast strax).
  const BG_GALLERY = [
    ['F1 Miðnæturolía', 'linear-gradient(180deg,#0a1428,#0d1b3a 60%,#0a1224)'],
    ['F2 Kolasvart + glóð', 'radial-gradient(620px 320px at 78% 10%,rgba(255,171,64,.16),transparent 62%) #0b0b0d'],
    ['F3 Grænflöskugler', 'linear-gradient(180deg,#0d2d20,#0a1f16)'],
    ['F4 Aurora', 'radial-gradient(800px 420px at 18% 18%,rgba(74,118,255,.26),transparent 60%),radial-gradient(720px 400px at 82% 32%,rgba(146,92,255,.2),transparent 62%) #101425'],
    ['F5 Ritstjórnarhvítt', 'repeating-linear-gradient(0deg,transparent 0 31px,rgba(30,25,15,.05) 31px 32px),repeating-linear-gradient(90deg,transparent 0 31px,rgba(30,25,15,.05) 31px 32px) #faf8f2'],
    ['F6 Grafít + teikninet', 'repeating-linear-gradient(0deg,transparent 0 47px,rgba(255,255,255,.055) 47px 48px),repeating-linear-gradient(90deg,transparent 0 47px,rgba(255,255,255,.055) 47px 48px) #14161c'],
    ['F7 Sandsteinn', 'radial-gradient(700px 260px at 50% 0,rgba(214,120,80,.14),transparent 65%),linear-gradient(180deg,#f3e7d8,#e8d9c4)'],
    ['F8 Fjólublátt flauel', 'linear-gradient(180deg,#241a4d,#1b1338)'],
    ['F9 Hafnarþoka', 'linear-gradient(180deg,#39434f,#6b7686)'],
    ['F10 Brúnt bókband', 'radial-gradient(130% 95% at 50% 6%,#3a2a1c,#221610 70%,#150d09)'],
    ['F11 Pergament + gullrönd', 'linear-gradient(90deg,rgba(197,160,89,.6) 0 3px,transparent 3px calc(100% - 3px),rgba(197,160,89,.6) calc(100% - 3px)),#f4ecd9'],
    ['F12 Svart gler', 'linear-gradient(105deg,#0a0a0c 38%,#22242a 50%,#0a0a0c 62%)'],
    ['BG1 Grafít → silfur', 'linear-gradient(180deg,#2b2f36,#9aa1ab)'],
    ['BG2 Burstað stál', 'repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 3px),linear-gradient(180deg,#565d68,#454c56)'],
    ['BG3 Kolefnistrefjar', 'repeating-linear-gradient(45deg,#17191d 0 8px,#22252b 8px 16px)'],
    ['BG4 Filmukorn', 'radial-gradient(rgba(255,255,255,.05) 1px,transparent 1.4px) 0 0/3px 3px repeat #1a1c21'],
    ['BG5 Kastljós grátt', 'radial-gradient(92% 72% at 50% 28%,#9aa2ad,#565e69 82%)'],
    ['BG6 Gatað málm', 'radial-gradient(rgba(10,12,15,.8) 1.6px,transparent 2px) 0 0/14px 14px repeat #596069'],
    ['BG7 Espresso → gullglóð', 'radial-gradient(600px 280px at 50% 100%,rgba(210,160,70,.22),transparent 60%),linear-gradient(180deg,#201510,#3d2c17)'],
    ['BG8 Leður djúpbrúnt', 'radial-gradient(rgba(0,0,0,.25) 1px,transparent 1.3px) 0 0/5px 5px repeat,linear-gradient(180deg,#2e2015,#241811)'],
    ['BG9 Mokka → latte', 'linear-gradient(180deg,#4e3d2b,#cbb392)'],
    ['BG10 Pergament + vignetta', 'radial-gradient(120% 100% at 50% 40%,transparent 55%,rgba(150,110,40,.16)),#f1e9d6'],
    ['BG11 Lín krem', 'repeating-linear-gradient(0deg,transparent 0 7px,rgba(90,70,40,.07) 7px 8px),repeating-linear-gradient(90deg,transparent 0 7px,rgba(90,70,40,.07) 7px 8px) #f4eeda'],
    ['BG12 Steypa ljósgrá', 'radial-gradient(500px 300px at 30% 20%,rgba(255,255,255,.5),transparent 60%),linear-gradient(180deg,#d8d7d3,#c9c8c4)'],
  ];
  function applyGalleryBg(i) {
    const g = BG_GALLERY[i]; if (!g) return;
    snapshot();
    const val = 'css:' + g[1];
    if (scope === 'all') { state.bg.all = val; }
    else {
      const cur = document.querySelector('.view.active');
      if (!cur || !cur.id) { state.bg.all = val; } else { state.bg.pages[cur.id] = val; }
    }
    persist(); toast('🖼 ' + g[0] + (scope === 'all' ? ' — allar síður' : ' — þessi síða'));
  }
  function clearGalleryBg() {
    snapshot();
    if (scope === 'all') state.bg.all = null;
    else { const cur = document.querySelector('.view.active'); if (cur && cur.id) state.bg.pages[cur.id] = null; else state.bg.all = null; }
    persist(); toast('Bakgrunnur hreinsaður');
  }
  function bgGallerySection() {
    const swatch = (g, i, big) =>
      '<button class="pe-chip" data-bgg="' + i + '" title="' + esc(g[0]) + '" style="flex-direction:column;gap:4px;padding:5px;min-width:0">' +
        '<span style="display:block;width:' + (big ? 78 : 46) + 'px;height:' + (big ? 44 : 40) + 'px;border-radius:7px;border:1px solid rgba(0,0,0,.18);background:' + esc(g[1]) + '"></span>' +
        (big ? '<span style="font-size:9.5px;line-height:1.1;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(g[0]) + '</span>' : '') +
      '</button>';
    const rest = BG_GALLERY.length - BG_PEEK;
    const body = showAllBg
      ? '<div class="pe-presets">' + BG_GALLERY.map((g, i) => swatch(g, i, true)).join('') +
          '<button class="pe-chip" id="pe-bgg-clear" title="Hreinsa bakgrunn">✕ Hreinsa</button></div>' +
        '<button class="pe-btn" id="pe-bg-less" style="margin-top:8px">− Sýna færri</button>'
      : '<div class="pe-presets">' + BG_GALLERY.slice(0, BG_PEEK).map((g, i) => swatch(g, i, false)).join('') +
          (rest > 0 ? '<button class="pe-chip" id="pe-bg-more" style="min-width:46px;height:52px;border-style:dashed;color:#64748b">+' + rest + '</button>' : '') +
        '</div>';
    return '<details class="pe-sec" style="margin-top:10px" open><summary style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<h4 style="margin:0;display:inline">Bakgrunnar</h4>' +
      '<span class="pe-card-sub" style="margin-left:auto">' + BG_GALLERY.length + ' í safni</span></summary>' +
      '<div class="pe-sub" style="margin-bottom:6px">Smellur setur á ' + (scope === 'all' ? 'ALLAR síður' : 'þessa síðu') + ' (skv. gildissviðs-valinu efst).</div>' +
      body +
    '</details>';
  }
  function versionsSection() {
    const rows = (state.versions || []).map((v, i) =>
      '<div class="pe-row" style="margin:4px 0">' +
        '<span style="flex:1;min-width:0;font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(v.savedAt || '') + '">' + esc(v.name) + '</span>' +
        '<button class="pe-btn" data-ver-go="' + i + '">Virkja</button>' +
        '<button class="pe-btn" data-ver-del="' + i + '" title="Eyða" style="padding:7px 9px">🗑</button>' +
      '</div>').join('');
    return '<details class="pe-sec" style="margin-top:10px"' + ((state.versions || []).length ? ' open' : '') + '><summary><h4>💾 Útgáfur — vista og skipta um heildar-útlit</h4></summary>' +
      '<button class="pe-btn pri" id="pe-ver-save">＋ Vista núverandi útlit sem…</button>' +
      '<div style="margin-top:6px">' + (rows || '<div class="pe-sub">Engin útgáfa vistuð enn.</div>') + '</div>' +
      '<div class="pe-sub" style="margin-top:6px">Útgáfa geymir allar Stílstjóra-breytingar, bakgrunna og töflustillingar (breiddir/jöfnun/raðhæð).</div>' +
    '</details>';
  }
  // ── 🔗 Linkasafn (2026-08-26, ósk Agnars: Keldan-leitarboxið + „Teikningar
  // rvk") — flýtileitir út á ytri vefi, opnast í nýjum flipa. Iframe er EKKI
  // í boði (Keldan sendir X-Frame-Options: DENY + frame-ancestors 'none'),
  // svo boxin SENDA leitina út: keldan.is/Leit?search=… og FotoWeb-safnið
  // tekur ?q=… (hvort tveggja staðfest í vafra 26.08 — ATH ?q= á Keldan
  // virkar EKKI, paramið þar heitir search). Nýr tengill = ein lína í LINKS.
  const LINKS = [
    { name: '🏢 Keldan — fyrirtækjaleit', ph: 'Nafn eða kennitala…',
      base: 'https://keldan.is/Fyrirtaeki/Leit',
      srch: 'https://keldan.is/Leit?search=', quote: false },
    { name: '📐 Teikningar rvk — aðaluppdrættir', ph: 'Heimilisfang…',
      base: 'https://skjalasafn.reykjavik.is/fotoweb/archives/5000-A%C3%B0aluppdr%C3%A6ttir/',
      srch: 'https://skjalasafn.reykjavik.is/fotoweb/archives/5000-A%C3%B0aluppdr%C3%A6ttir/?q=', quote: true }
  ];
  // Sameinaður listi: innbyggðu leitirnar + link-takkar notandans (v2 26.08:
  // „vantar að geta búið til lítinn link takka til að setja á síðuna").
  function allLinks() {
    return LINKS.concat((state.customLinks || []).map(c => ({ name: c.name, ph: '', base: c.url, srch: null, custom: true })));
  }
  function linkGo(i, qtxt) {
    const L = allLinks()[i]; if (!L) return;
    let qq = String(qtxt || '').trim();
    // FotoWeb-ráðið af síðunni sjálfri: gæsalappir þrengja heimilisfangaleit.
    if (L.quote && qq && /\s/.test(qq) && !/"/.test(qq)) qq = '"' + qq + '"';
    try { window.open((qq && L.srch) ? L.srch + encodeURIComponent(qq) : L.base, '_blank', 'noopener'); } catch (_) {}
  }
  // ── link-takkar Á síðunni sjálfri ──────────────────────────────────────────
  function curViewId() { const v = document.querySelector('.view.active'); return (v && v.id) || 'all'; }
  let _plKey = null;
  function placeLink(i) {
    const L = allLinks()[i]; if (!L) return;
    const k = curViewId();
    if (!state.pageLinks || typeof state.pageLinks !== 'object') state.pageLinks = {};
    (state.pageLinks[k] = state.pageLinks[k] || []).push({ n: L.name, u: L.base });
    persist(); renderPageLinks(true); toast('🔗 „' + L.name + '" kominn á þessa síðu');
  }
  function removePageLink(idx) {
    const k = curViewId(); const arr = (state.pageLinks || {})[k]; if (!arr) return;
    const gone = arr.splice(idx, 1)[0];
    if (!arr.length) delete state.pageLinks[k];
    persist(); renderPageLinks(true); toast('✕ „' + ((gone || {}).n || 'takki') + '" fjarlægður');
  }
  function addCustomLink() {
    const name = prompt('Nafn á nýja link-takkanum:', ''); if (!name || !name.trim()) return;
    let url = prompt('Slóðin (URL) sem hann opnar:', 'https://'); if (!url || !url.trim() || url.trim() === 'https://') return;
    url = url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    state.customLinks = state.customLinks || [];
    state.customLinks.push({ name: name.trim(), url: url });
    persist(); renderPanel(); toast('🔗 „' + name.trim() + '" kominn í Linkasafnið — ➕ setur hann á síðuna');
  }
  function deleteCustomLink(ci) {
    const c = (state.customLinks || [])[ci]; if (!c) return;
    if (!confirm('Eyða „' + c.name + '" úr Linkasafninu?')) return;
    state.customLinks.splice(ci, 1);
    persist(); renderPanel();
  }
  // Chips-röndin: link-takkar á hverri síðu (per síða, vistast í AppSettings →
  // fylgja milli tækja).
  //
  // 26.08 v3 — ósk Agnars: „nýjir takka linkar fara bara niður í hægra hornið og
  // ég get ekkert losnað við það … ég vill geta ráðið hvar þeir verða."
  // Takkarnir voru harðkóðaðir í fastan stafla (right:12px;bottom:14px) svo ALLIR
  // lentu í horninu og staðsetning varð ekki valin. Núna: DRAGA takkann hvert sem
  // er — staðsetningin geymist sem hlutfall af glugganum (x/y í %) á hverjum takka
  // fyrir sig, svo hún haldist á öllum skjástærðum. Takki án x/y hegðar sér eins og
  // áður (staflast neðst til hægri) svo eldri vistaðir takkar færast ekki til.
  // Tvísmellur setur takkann aftur í hornið; ✕ fjarlægir hann (stærra og sýnilegra
  // en áður — það var of smátt til að hitta á síma).
  let _plRz = null;
  // 2026-08-29 (Agnar: „hann er fastur á stað í skjánum þegar ég skrolla niður").
  // Áður geymdist staðsetningin sem hlutfall af GLUGGANUM og takkinn sat á
  // position:fixed yfirlagi — hann elti því skjáinn og lá ofan á efninu alla
  // leið niður síðuna. Núna er hann festur á SÍÐUNA: dx = hlutfall af breidd
  // skjals (svo hann haldi sér á öllum skjástærðum), dy = px frá toppi skjals.
  const PL_POS = l => (l && typeof l.dx === 'number' && typeof l.dy === 'number');
  // Eldri takkar (x/y sem hlutfall af glugganum) færast yfir í dx/dy við fyrstu
  // teikningu — sama sjónræna staðsetning og áður, en fylgir nú síðunni.
  function plMigrate(arr) {
    const d = document.documentElement;
    let changed = false;
    (arr || []).forEach(l => {
      if (!l || PL_POS(l)) return;
      if (typeof l.x === 'number' && typeof l.y === 'number') {
        l.dx = l.x;
        l.dy = Math.round((l.y / 100) * (d.clientHeight || window.innerHeight || 768));
        delete l.x; delete l.y;
        changed = true;
      }
    });
    return changed;
  }
  // Er stílstjórinn opinn? Þá — og AÐEINS þá — má draga takkana og ✕ sést.
  function plEditMode() { return !!document.getElementById(PANEL_ID); }
  // 2026-08-29 (Agnar: „hún getur færst svoldið eftir refresh").
  // Tvær ástæður, báðar hér:
  //  1) window.innerWidth TELUR skrunstikuna með, clientWidth ekki. Síða MEÐ
  //     skrunstiku og síða ÁN hennar gáfu því sitt hvora pixla-tölu út úr sama
  //     prósentugildinu — takkinn færðist um ~15px við það eitt að skipta um síðu.
  //  2) offsetWidth er mælt ÁÐUR en letrið (IBM Plex Sans) er komið. Þá er
  //     takkinn annarrar breiddar en hann endar í, og klemman við hægri brún
  //     reiknast af rangri breidd. Þess vegna er endurstaðsett við fonts.ready
  //     (sjá renderPageLinks) — ekki bara við fyrstu teikningu.
  // xPct = hlutfall af breidd skjals, yPx = px frá toppi SKJALS (ekki gluggans).
  function plClamp(el, xPct, yPx) {
    const d = document.documentElement;
    const w = el.offsetWidth || 120, h = el.offsetHeight || 32;
    const dw = d.clientWidth || window.innerWidth || 1024;
    const dh = Math.max(d.scrollHeight || 0, d.clientHeight || window.innerHeight || 768);
    let left = (xPct / 100) * dw;
    let top = +yPx || 0;
    left = Math.max(4, Math.min(left, dw - w - 4));
    top = Math.max(4, Math.min(top, Math.max(4, dh - h - 4)));
    el.style.left = left + 'px'; el.style.top = top + 'px';
  }
  // Stöðugt, einkvæmt id per takka — byggt á NAFNINU, ekki á sætisnúmeri sem
  // hliðrast þegar takka er eytt.
  //
  // 2026-08-29 (Agnar: „ef ég er að reyna breyta útliti á honum í annað skiptið
  // þá breytir það öðrum tökkum líka"). Ástæðan: takkarnir höfðu hvorki id né
  // klasa, svo relSelector gekk upp tréð og stoppaði á fyrsta id-inu sem hann
  // fann — umgjörðinni #pe-pagelinks. Sú regla nær yfir ALLA takkana. Með
  // einkvæmu id-i verður valið „🎯 Bara þennan" raunverulega bara þennan.
  function plId(name) {
    const s = String(name || 'takki').toLowerCase()
      .replace(/[^a-z0-9à-þ]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return 'pe-pl-' + (s || 'takki');
  }
  function renderPageLinks(force) {
    const k = curViewId();
    if (!force && k === _plKey && document.getElementById('pe-pagelinks')) return;
    _plKey = k;
    let box = document.getElementById('pe-pagelinks');
    let dbox = document.getElementById('pe-pagelinks-doc');
    const arr = ((state.pageLinks || {})[k] || []);
    if (!arr.length) { if (box) box.remove(); if (dbox) dbox.remove(); return; }
    if (plMigrate(arr)) persist();
    if (!box) {
      box = document.createElement('div');
      box.id = 'pe-pagelinks';
      document.body.appendChild(box);
    }
    // TVÖ lög, því takkarnir eiga tvenns konar heimili:
    //  • #pe-pagelinks      — position:fixed. Sjálfgefna hornið neðst til hægri,
    //                         sem Á að fljóta með skjánum (óbreytt hegðun).
    //  • #pe-pagelinks-doc  — position:absolute á SKJALINU. Dregnir takkar sitja
    //                         hér og skruna með efninu, í stað þess að liggja
    //                         ofan á því alla leið niður síðuna.
    if (!dbox) {
      dbox = document.createElement('div');
      dbox.id = 'pe-pagelinks-doc';
      document.body.appendChild(dbox);
    }
    dbox.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:0;z-index:99500;pointer-events:none';
    dbox.innerHTML = '';
    const editMode = plEditMode();
    // Stíllinn er settur í HVERT sinn (ekki bara við stofnun): annars situr eldra
    // eintak eftir með gamla stíl ef patchinn er endurhlaðinn í lifandi síðu.
    // Gegnsætt yfirlag yfir allan gluggann svo takkarnir geti setið hvar sem er.
    // pointer-events:none => yfirlagið sjálft stelur ENGUM smellum; aðeins
    // takkarnir sjálfir taka við þeim.
    box.style.cssText = 'position:fixed;inset:0;z-index:99500;pointer-events:none';
    // Sjálfgefna hornið: staflast OFAN VIÐ „🤖 AI-flokka póst" (#pat-launch, 308)
    // sem situr líka fast neðst til hægri — og með hærri z-index, svo hann lá ofan
    // á link-tökkunum og faldi ✕-ið („ég get ekkert losnað við það", Agnar 26.08).
    let bot = 14;
    try {
      const pat = document.getElementById('pat-launch');
      if (pat && pat.offsetParent !== null) {
        const pr = pat.getBoundingClientRect();
        if (pr.height) bot = Math.round((window.innerHeight - pr.top) + 10);
      }
    } catch (_) {}
    box.innerHTML = '<div id="pe-pl-stack" style="position:absolute;right:12px;bottom:' + bot + 'px;display:flex;flex-direction:column;gap:8px;align-items:flex-end"></div>';
    const stack = box.querySelector('#pe-pl-stack');
    const used = {};
    arr.forEach((l, i) => {
      const el = document.createElement('span');
      el.setAttribute('data-pl-chip', String(i));
      el.className = 'pe-pl-chip';
      // Einkvæmt id svo stílstjórinn geti valið ÞENNAN takka en ekki alla.
      // Tveir takkar með sama nafn fá -2, -3 … svo id-in haldist einkvæm.
      let id = plId(l.n);
      if (used[id]) id = id + '-' + (++used[plId(l.n)]);
      else { used[id] = 1; }
      el.id = id;
      el.style.cssText = 'pointer-events:auto;display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #cbd5e1;border-radius:99px;padding:7px 8px 7px 13px;box-shadow:0 6px 18px -8px rgba(15,23,42,.4);touch-action:none;user-select:none;cursor:' + (editMode ? 'grab' : 'pointer');
      el.title = editMode
        ? 'Stílstjórinn er opinn — dragðu takkann þangað sem þú vilt hafa hann · tvísmellur setur hann aftur í hornið'
        : l.n;
      el.innerHTML =
        '<a href="' + esc(l.u) + '" target="_blank" rel="noopener" draggable="false" style="font:700 12.5px \'IBM Plex Sans\',-apple-system,\'Segoe UI\',sans-serif;color:#0f172a;text-decoration:none;white-space:nowrap;max-width:52vw;overflow:hidden;text-overflow:ellipsis">' + esc(l.n) + '</a>' +
        // 2026-08-29 (Agnar): ✕ og færsla eiga AÐEINS heima í ritilham. Utan hans
        // er takkinn bara takki — ekkert ✕ til að ýta óvart á og hann haggast ekki.
        (editMode
          ? '<button type="button" data-pl-del="' + i + '" title="Fjarlægja takkann af þessari síðu" style="all:unset;cursor:pointer;width:20px;height:20px;line-height:20px;text-align:center;border-radius:99px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:700;flex:none">✕</button>'
          : '');
      if (PL_POS(l)) { el.style.position = 'absolute'; dbox.appendChild(el); plClamp(el, l.dx, l.dy); }
      else stack.appendChild(el);
    });
    // ATH: takkarnir búa núna í TVEIMUR gámum (staflinn í box, dregnir í dbox),
    // svo hvor tveggja verður að leita í báðum — annars missa dregnu takkarnir
    // ✕-ið og dráttinn.
    const chips = sel => [].concat(
      Array.prototype.slice.call(box.querySelectorAll(sel)),
      Array.prototype.slice.call(dbox.querySelectorAll(sel)));
    chips('[data-pl-del]').forEach(b => b.onclick = e => {
      e.preventDefault(); e.stopPropagation(); removePageLink(+b.dataset.plDel);
    });
    // Dráttur aðeins í ritilham — utan hans haggast takkinn ekki.
    if (editMode) chips('[data-pl-chip]').forEach(el => plDraggable(el, arr));
    // Endurstaðsetja þegar letrið er komið: fyrsta mælingin á breidd takkans er
    // gerð með fallback-letri og skeikar nógu miklu til að klemman við brúnina
    // reiknist skakkt. Þetta keyrir einu sinni per teikningu og hreyfir ekkert
    // ef breiddin var þegar rétt.
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          const b = document.getElementById('pe-pagelinks-doc'); if (b !== dbox) return;
          arr.forEach((l, i) => {
            if (!PL_POS(l)) return;
            const c = dbox.querySelector('[data-pl-chip="' + i + '"]');
            if (c) plClamp(c, l.dx, l.dy);
          });
        });
      }
    } catch (_) {}
  }
  // Draga takka: pointer-events, virkar bæði með mús og á snertiskjá. Hreyfing
  // undir 4px telst smellur (svo tengillinn opnist eðlilega), yfir 4px er dráttur.
  function plDraggable(el, arr) {
    el.addEventListener('dblclick', e => {
      e.preventDefault();
      const l = arr[+el.getAttribute('data-pl-chip')]; if (!l) return;
      delete l.x; delete l.y; delete l.dx; delete l.dy;
      persist(); renderPageLinks(true); toast('↩ Takkinn aftur í hornið');
    });
    el.addEventListener('pointerdown', e => {
      if (e.button != null && e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('[data-pl-del]')) return;
      const l = arr[+el.getAttribute('data-pl-chip')]; if (!l) return;
      const r = el.getBoundingClientRect();
      const offX = e.clientX - r.left, offY = e.clientY - r.top;
      let moved = false;
      const onMove = ev => {
        if (!moved && Math.abs(ev.clientX - e.clientX) < 4 && Math.abs(ev.clientY - e.clientY) < 4) return;
        if (!moved) {
          moved = true;
          el.style.cursor = 'grabbing';
          el.style.opacity = '.92';
          // Losa úr staflanum og festa á SKJAL-lagið, á sama stað og hann var.
          const dbox = document.getElementById('pe-pagelinks-doc');
          if (dbox && el.parentElement !== dbox) { el.style.position = 'absolute'; dbox.appendChild(el); }
        }
        ev.preventDefault();
        // clientX/Y eru miðuð við GLUGGANN; skjal-lagið vill hnit frá toppi
        // SKJALSINS, svo skrunstaðan bætist við. Án hennar stökk takkinn upp á
        // við sem nam skruninu um leið og hann var sleppt.
        const dw = document.documentElement.clientWidth || window.innerWidth || 1024;
        plClamp(el, ((ev.clientX - offX) / dw) * 100, (ev.clientY - offY) + (window.scrollY || 0));
      };
      const onUp = ev => {
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onUp, true);
        document.removeEventListener('pointercancel', onUp, true);
        el.style.cursor = 'grab'; el.style.opacity = '';
        if (!moved) return;                 // hreinn smellur → tengillinn sér um sig
        ev.preventDefault();
        const dw = document.documentElement.clientWidth || window.innerWidth || 1024;
        l.dx = Math.max(0, Math.min(100, (parseFloat(el.style.left) / dw) * 100));
        l.dy = Math.max(0, Math.round(parseFloat(el.style.top) || 0));
        delete l.x; delete l.y;             // gamla glugga-hlutfallið á ekki við lengur
        persist(); toast('📍 Staðsetning takkans vistuð — hann fylgir nú síðunni');
      };
      // Hlustað á DOCUMENT, ekki á takkann sjálfan: við færum hann milli foreldra
      // í miðjum drætti (úr staflanum yfir á yfirlagið) og það EYÐIR pointer-capture,
      // svo frekari pointermove-atburðir rata ekki á hann. (Staðfest í vafra 26.08:
      // takkinn losnaði en fylgdi svo ekki músinni og staðsetningin vistaðist aldrei.)
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
      document.addEventListener('pointercancel', onUp, true);
    });
  }
  // 🗺 Grunn-skipting síðunnar — smellu-val á stóru svæðin (header, valstika,
  // tafla, main content …) án þess að þurfa að hitta þau með bendlinum
  // (ósk Agnars 26.08: „sína svona grunn skiptingu síðunnar").
  // ── 🗺 Svæða-kort + verkfæraspjöld (v2, hönnun Agnars 26.08) ─────────────────
  // Gamla útgáfan sýndi svæðin sem flata chip-hrúgu og gerði ekkert annað en að
  // VELJA elementið — eftir það sat notandinn uppi með sömu hráu CSS-sleðana og
  // áður („ég sé ekkert hvað ég get gert þarna"). Núna er síðan teiknuð sem lítið
  // KORT (Valmynd til vinstri, Haus / Talnaspjöld / Síur / Taflan í stafla) og
  // smellur á svæði opnar VERKFÆRASPJALD sem talar tungumál þess svæðis:
  // „Falinn / Mjór borði / Fullur" í stað height-sleða, síu-nöfn í stað selectora.
  //
  // Spjöldin sjálf búa EKKI hér — þau skrá sig með PageEditor.registerCard(...),
  // sama mynstur og 319/320/321 nota á .pe-toolbar. Þannig á hvert svæði sinn
  // eiganda og 262 helst við það eitt að vera umgjörðin.
  const ZONES = [
    { id: 'haus',  label: 'Haus',
      find: v => { const h = v && v.querySelector('h1'); return (h && h.parentElement !== v ? h.parentElement : h) || document.getElementById('bstal-banner'); } },
    { id: 'kpi',   label: 'Talnaspjöldin (KPI)',
      find: v => v && v.querySelector('._ars-statgrid, .statgrid, .kpi-grid, .stats') },
    { id: 'siur',  label: 'Síur',
      find: v => v && v.querySelector('._ars-filterstrip, .filterstrip, .filters, .toolbar') },
    { id: 'tafla', label: 'Taflan',
      find: v => v && v.querySelector('table') },
    // ── Kanban-síður (Afgreiðsla / Verkstæði, patch 78) ────────────────────
    // Sama umgjörð, önnur svæði: kanban-síða hefur enga töflu og engin
    // talnaspjöld — hún hefur leitarrönd, dálka og kort. Svæðin sem finnast
    // EKKI á síðunni falla sjálfkrafa út úr kortinu (sjá zoneMapSection), svo
    // hver síðugerð sýnir bara sín eigin svæði án sérstakrar síðu-rökfræði.
    { id: 'leit',   label: 'Leitarrönd',
      find: v => v && v.querySelector('#counter-sidebar') },
    { id: 'dalkar', label: 'Kanban-dálkar',
      find: v => { const c = v && v.querySelector('.cw-col'); return c ? c.parentElement : null; } },
    { id: 'kort',   label: 'Verk-kortin',
      find: v => v && v.querySelector('.cw-rcard, .cw-col-scroll > [onclick^="Counter.select"]') },
  ];
  const NAVZONE = { id: 'valmynd', label: 'Valmynd', find: () => document.querySelector('.topbar') };
  const ALLZONES = ZONES.concat([NAVZONE]);
  let activeZone = null;    // id svæðisins sem er valið — ræður hvaða spjald er opið
  const cards = {};         // svæðis-id → { render(cfg, api), wire(root, cfg, api) }

  function zoneEl(z) {
    try { return z.find(document.querySelector('.view.active')) || null; } catch (_) { return null; }
  }
  // Stillingar spjaldanna liggja í SÖMU geymslu og útlits-reglurnar
  // (page_editor_v1_json) og eru skorðaðar við síðuna. Þar með fylgja þær milli
  // tækja OG fljóta sjálfkrafa með „Vista síðu"/Útgáfum — engin ný samstilling.
  function zoneCfg(cardId, vid) {
    const k = vid || curViewId();
    if (!state.zones || typeof state.zones !== 'object') state.zones = {};
    const pg = (state.zones[k] = state.zones[k] || {});
    return (pg[cardId] = pg[cardId] || {});
  }
  function setZoneCfg(cardId, patch) {
    snapshot();
    const c = zoneCfg(cardId);
    Object.keys(patch).forEach(k => {
      const v = patch[k];
      if (v === null || v === undefined) delete c[k]; else c[k] = v;
    });
    persist();
    applyZones();
    renderPanel();
  }
  // Spjöldin breyta útliti/hegðun sem BÝR Á SÍÐUNNI sjálfri (bannerhæð, faldar
  // síur, KPI-spjöld) — ekki í CSS-reglunum okkar. Þau hlusta því á þennan
  // atburð og keyra sinn eigin „applier" þegar stillingar breytast eða síðan
  // er endurteiknuð.
  function applyZones() {
    try {
      document.dispatchEvent(new CustomEvent('pe-zones-apply', {
        detail: { view: curViewId(), cfg: (state.zones || {})[curViewId()] || {} }
      }));
    } catch (_) {}
  }
  // Kortið sýnir svæðin sem ERU á síðunni sem er opin — ársskoðun fær Haus /
  // Talnaspjöld / Síur / Taflan, Afgreiðsla fær Haus / Leitarrönd /
  // Kanban-dálkar / Verk-kortin. Áður voru öll svæði sýnd og þau sem vantaði
  // sátu eftir sem óvirkir takkar; á kanban-síðu þýddi það þrjá dauða takka og
  // ekkert nothæft. Finnist ekkert svæði (ókunn síða) sýnum við allt óvirkt
  // eins og áður, svo kortið verði aldrei tómt.
  // ── Síðu-zoom ─────────────────────────────────────────────────────────────
  const ZOOM_MIN = 50, ZOOM_MAX = 150;
  function curZoom() { return (state.zoom && state.zoom[curViewId()]) || 100; }
  function setZoom(delta) {
    const v = curViewId(); if (!v || v === 'all') return;
    snapshot();
    if (!state.zoom) state.zoom = {};
    const nyr = delta === 0 ? 100 : Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, curZoom() + delta));
    if (nyr === 100) delete state.zoom[v]; else state.zoom[v] = nyr;
    persist(); renderPanel();
    toast(nyr === 100 ? 'Zoom aftur í 100%' : 'Zoom ' + nyr + '%');
  }

  function zoneMapSection() {
    const found = ZONES.filter(z => !!zoneEl(z));
    const list = found.length ? found : ZONES;
    const desk = isDesktopUi();
    const rows = list.map(z => {
      const has = found.length > 0;
      return '<button class="pe-map-z' + (activeZone === z.id ? ' on' : '') + (has ? '' : ' miss') +
        '" data-zone="' + z.id + '"' + (has ? '' : ' disabled title="Ekki á þessari síðu"') + '>' + esc(z.label) + '</button>';
    }).join('');
    const intro = desk
      ? '<div class="pe-sub" style="margin:6px 0 4px">Svæði á síðunni:</div>'
      : '<div class="pe-sub" style="margin:9px 0 6px">…eða smelltu á svæði — verkfærin opnast fyrir það:</div>';
    return intro +
      '<div class="pe-map">' +
        '<button class="pe-map-nav' + (activeZone === 'valmynd' ? ' on' : '') + '" data-zone="valmynd">Valmynd</button>' +
        '<div class="pe-map-col">' + rows + '</div>' +
      '</div>';
  }
  function pickZone(id) {
    const z = ALLZONES.filter(x => x.id === id)[0]; if (!z) return;
    const el = zoneEl(z);
    activeZone = (activeZone === id) ? null : id;
    if (activeZone && el) {
      target = el; extraTargets = [];
      highlight(el); setTimeout(hideHighlight, 900);
      try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
    }
    renderPanel();
  }
  // Spjald valins svæðis — eða, ef svæðið á ekkert skráð spjald, gömlu
  // CSS-stýringarnar svo ekkert glatist.
  function cardSection() {
    if (!activeZone) return '';
    const c = cards[activeZone];
    if (!c || typeof c.render !== 'function') return '';
    let inner = '';
    try { inner = c.render(zoneCfg(activeZone), cardApi) || ''; } catch (e) { return ''; }
    return inner ? '<div class="pe-card" data-card="' + esc(activeZone) + '">' + inner + '</div>' : '';
  }
  function wireCard() {
    if (!activeZone) return;
    const root = document.querySelector('#' + PANEL_ID + ' [data-card="' + cssEsc(activeZone) + '"]');
    const c = cards[activeZone];
    if (!root || !c || typeof c.wire !== 'function') return;
    try { c.wire(root, zoneCfg(activeZone), cardApi); } catch (_) {}
  }
  // Litla hjálpar-API-ið sem spjöldin fá — svo þau þurfi hvorki að þekkja
  // geymsluna né endurteikningar-keðjuna.
  const cardApi = {
    get: id => zoneCfg(id || activeZone),
    set: (patch, id) => setZoneCfg(id || activeZone, patch),
    esc, toast, view: () => curViewId(),
    el: () => { const z = ALLZONES.filter(x => x.id === activeZone)[0]; return z ? zoneEl(z) : null; },
    // Sameiginlegar smá-græjur svo spjöldin líti eins út án þess að afrita CSS.
    sw: (on, attr) => '<button type="button" class="pe-sw' + (on ? ' on' : '') + '" ' + attr + '></button>',
    seg: (opts, cur, attr) => '<div class="pe-seg">' + opts.map(o =>
      '<button type="button" ' + attr + '="' + esc(o[0]) + '"' + (o[0] === cur ? ' class="on"' : '') + '>' + esc(o[1]) + '</button>').join('') + '</div>',
    stp: (val, attr, suffix) => '<span class="pe-stp"><button type="button" ' + attr + '="-1">−</button>' +
      '<span class="pe-stpv">' + esc(String(val)) + esc(suffix || '') + '</span>' +
      '<button type="button" ' + attr + '="1">+</button></span>',
    row: (label, body) => '<div class="pe-frow"><span class="pe-flbl">' + esc(label) + '</span>' + body + '</div>',
    head: (title, sub) => '<h4 class="pe-card-h">' + esc(title) + (sub ? '<span class="pe-card-sub">' + esc(sub) + '</span>' : '') + '</h4>',
  };
  // Hjálp fyrir töflutólin (319) — „ég sé ekki alveg hvernig maður velur
  // coloms, eða þá raðirnar" (Agnar 26.08). Dálkar eru EKKI valdir með
  // 🎯 Velja hlut heldur beint á töflunni þegar ↔ Dálkar er kveikt.
  function tableHelpSection() {
    return '<details class="pe-sec" style="margin-top:10px"><summary><h4>📊 Töflur — svona velurðu dálka &amp; raðir</h4></summary>' +
      '<div style="font-size:12.5px;line-height:1.65;color:#334155">' +
        '<div>1️⃣ Kveiktu á <b>↔ Dálkar</b> hér uppi í tækjastikunni — þá birtast bláar griplínur í töfluhausnum.</div>' +
        '<div style="margin-top:5px"><b>Breidd:</b> dragðu bláu línuna við brún dálks.</div>' +
        '<div><b>Jöfnun:</b> smelltu á haus dálksins — víxlar vinstri ⟸ → miðjað ⟺ → hægri ⟹ → sjálfgefið.</div>' +
        '<div><b>Fela dálk:</b> haltu fingri/mús á hausnum í ~sekúndu. <b>👁 Sýna dálka</b> birtir þá aftur.</div>' +
        '<div style="margin-top:5px"><b>Raðir:</b> <b>↕−</b> / <b>↕+</b> lækka/hækka allar raðir í töflum síðunnar (ekkert val þarf) · <b>🔤−</b>/<b>🔤+</b> leturstærð · <b>📌</b> límdur haus · <b>🦓</b> röndóttar raðir · <b>↺ tafla</b> núllstillir.</div>' +
        '<div style="margin-top:5px;color:#64748b">Allt vistast sjálfkrafa og fylgir milli tækja (☁️). 🎯 Velja hlut er fyrir annað en dálka — texta, box og glugga.</div>' +
      '</div>' +
    '</details>';
  }
  function linkasafnSection() {
    const links = allLinks();
    return '<details class="pe-sec" style="margin-top:10px"><summary><h4>🔗 Linkasafn — flýtileitir &amp; link-takkar</h4></summary>' +
      links.map((L, i) =>
        '<div class="pe-row" style="margin:5px 0;flex-wrap:wrap">' +
          '<button class="pe-btn" data-lk-open="' + i + '" title="Opna síðuna í nýjum flipa" style="flex:1 1 auto;min-width:0;text-align:left">' + esc(L.name) + '</button>' +
          '<button class="pe-btn" data-lk-place="' + i + '" title="Setja lítinn link-takka á síðuna sem er opin">➕ Á síðuna</button>' +
          (L.custom ? '<button class="pe-btn" data-lk-delc="' + (i - LINKS.length) + '" title="Eyða úr safninu" style="padding:7px 9px">🗑</button>' : '') +
          (L.srch ?
            '<input type="search" data-lk-q="' + i + '" placeholder="' + esc(L.ph) + '" style="flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:9px;padding:8px 10px;font:inherit">' +
            '<button class="pe-btn" data-lk-go="' + i + '" title="Leita — niðurstaðan opnast í nýjum flipa">🔍</button>'
          : '') +
        '</div>').join('') +
      '<button class="pe-btn pri" id="pe-lk-new" style="margin-top:6px">＋ Nýr link-takki…</button>' +
      '<div class="pe-sub" style="margin-top:6px">Leit: sláðu inn og ýttu á Enter — niðurstaðan opnast í nýjum flipa. <b>➕ Á síðuna</b> setur takkann á síðuna sem er opin. <b>Dragðu takkann þangað sem þú vilt hafa hann</b> — staðsetningin vistast fyrir þá síðu og fylgir milli tækja; tvísmellur setur hann aftur í hornið og ✕ fjarlægir hann. Nýr link-takki = nafn + slóð.</div>' +
    '</details>';
  }
  // Söfnin (stíla-flögg og bakgrunnar) eru stærstu plássætur panelsins. Í v2 sýna
  // þau AÐEINS forsmekk — þrjú flögg / fimm bakgrunna — og opna allt safnið með
  // einum smelli. Þannig sést strax að safnið er til, án þess að það éti skjáinn.
  let showAllPresets = false, showAllBg = false;
  const PRESET_PEEK = 3, BG_PEEK = 5;
  function presetChip(gi, ii, it) {
    return '<button class="pe-chip" data-preset="' + gi + '-' + ii + '" title="' + esc(it[0]) + '" style="' + presetPreviewStyle(it[1]) + '">' + esc(it[0]) + '</button>';
  }
  function presetsSection() {
    const favs = (state.favs || []);
    const total = PRESET_GROUPS.reduce((n, g) => n + g.items.length, 0);
    const favRow = favs.length ? '<div class="pe-frow" style="margin-top:8px"><span class="pe-flbl">★ Uppáhald</span><div class="pe-xwrap">' +
      favs.map((f, i) => '<span class="pe-favwrap"><button class="pe-chip" data-fav="' + i + '" title="' + esc(f.n) + '" style="' + presetPreviewStyle(f.d) + '">' + esc(f.n) + '</button><button class="pe-favdel" data-favdel="' + i + '" title="Fjarlægja">✕</button></span>').join('') +
      '</div></div>' : '';
    let grid;
    if (showAllPresets) {
      grid = PRESET_GROUPS.map((g, gi) => '<div class="pe-pgroup"><span class="pe-glabel">' + esc(g.label) + '</span><div class="pe-presets">' +
        g.items.map((it, ii) => presetChip(gi, ii, it)).join('') +
      '</div></div>').join('') +
      '<button class="pe-btn" id="pe-preset-less" style="margin-top:8px">− Sýna færri</button>';
    } else {
      const peek = [];
      for (let gi = 0; gi < PRESET_GROUPS.length && peek.length < PRESET_PEEK; gi++)
        for (let ii = 0; ii < PRESET_GROUPS[gi].items.length && peek.length < PRESET_PEEK; ii++)
          peek.push(presetChip(gi, ii, PRESET_GROUPS[gi].items[ii]));
      grid = '<div class="pe-presets">' + peek.join('') + '</div>' +
        '<button class="pe-btn" id="pe-preset-more" style="margin-top:8px">＋ Sjá alla…</button>';
    }
    return '<details class="pe-sec" style="margin-top:10px" open><summary style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<h4 style="margin:0;display:inline">Hnappar &amp; stöðu-merki</h4>' +
      '<span class="pe-card-sub" style="margin-left:auto">' + total + ' stílar</span></summary>' +
      '<div class="pe-sub" style="margin-bottom:7px">Smelltu til að setja á valinn hlut (hnapp eða stöðu-merki).</div>' +
      grid + favRow +
      '<button class="pe-btn" id="pe-fav" style="margin-top:8px" title="Vista núverandi stíl valins hlutar sem uppáhald">★ Vista stíl í uppáhald</button>' +
    '</details>';
  }
  // gradient current-value helpers (parse existing 'background' override)
  function gradParts() { const g = getDecl('background') || ''; const m = g.match(/linear-gradient\(([^)]*)\)/i); return m ? m[1] : null; }
  function gradPart(i) { const s = gradParts(); if (!s) return null; const cols = s.match(/#[0-9a-f]{6}/ig); return cols && cols[i] ? cols[i] : null; }
  function gradAngle() { const s = gradParts(); if (!s) return null; const m = s.match(/(\d+)deg/); return m ? +m[1] : null; }
  function setGradient() {
    const p = document.getElementById(PANEL_ID);
    const c1 = p.querySelector('[data-grad="c1"]').value, c2 = p.querySelector('[data-grad="c2"]').value, ang = p.querySelector('[data-grad="ang"]').value;
    setDecl('background', 'linear-gradient(' + ang + 'deg,' + c1 + ',' + c2 + ')');
  }

  // Draganleg panel-breidd (Agnar 26.08) — handfang á hægri brún, vistast á tækinu.
  let _sideW = 320;
  try { _sideW = Math.max(260, parseInt(localStorage.getItem('pe_side_w'), 10) || 320); } catch (_) {}
  function syncDeskChrome(p) {
    const desk = isDesktopUi();
    if (p) {
      p.classList.toggle('pe-desk', desk);
      p.classList.toggle('pe-side', dock === 'side');
    }
    const sideOpen = !!(p && dock === 'side' && desk);
    try {
      document.body.classList.toggle('pe-side-open', sideOpen);
      if (sideOpen) document.body.style.setProperty('--pe-side-w', (_sideW || 320) + 'px');
      else document.body.style.removeProperty('--pe-side-w');
    } catch (_) {}
  }
  function ensureResizeHandle(p) {
    if (p.querySelector('#pe-resize')) return;
    const rh = document.createElement('div');
    rh.id = 'pe-resize';
    rh.title = 'Dragðu til að breikka eða mjókka stjórnborðið';
    rh.style.cssText = 'position:absolute;top:0;right:-2px;width:14px;height:100%;cursor:ew-resize;z-index:6;touch-action:none';
    rh.innerHTML = '<div style="position:absolute;top:0;bottom:0;right:6px;width:3px;border-radius:2px;background:#cbd5e1"></div>';
    rh.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const sx = ev.clientX, sw = p.getBoundingClientRect().width;
      const mv = e2 => {
        _sideW = Math.max(260, Math.min(Math.round(sw + (e2.clientX - sx)), Math.round(window.innerWidth * 0.55)));
        p.style.width = _sideW + 'px';
        try { document.body.style.setProperty('--pe-side-w', _sideW + 'px'); } catch (_) {}
      };
      const up = () => {
        document.removeEventListener('pointermove', mv);
        document.removeEventListener('pointerup', up);
        try { localStorage.setItem('pe_side_w', String(_sideW)); } catch (_) {}
      };
      document.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
    });
    p.appendChild(rh);
  }
  function wirePanel() {
    const p = document.getElementById(PANEL_ID); if (!p) return;
    const q = s => p.querySelector(s), qa = s => Array.prototype.slice.call(p.querySelectorAll(s));
    q('#pe-close').onclick = closePanel;
    syncDeskChrome(p);
    if (dock === 'side') { p.style.width = _sideW + 'px'; ensureResizeHandle(p); }
    else { p.style.width = ''; }
    const dk = q('#pe-dock'); if (dk) dk.onclick = () => {
      dock = dock === 'side' ? 'bottom' : 'side';
      try {
        localStorage.setItem('pe_dock', dock);
        localStorage.setItem('pe_dock_desk_v2', '1');
      } catch (_) {}
      renderPanel();
    };
    qa('[data-bgg]').forEach(b => b.onclick = () => applyGalleryBg(+b.dataset.bgg));
    const bgc = q('#pe-bgg-clear'); if (bgc) bgc.onclick = clearGalleryBg;
    const vs = q('#pe-ver-save'); if (vs) vs.onclick = saveVersionAs;
    // Sama aðgerð og „＋ Vista núverandi útlit sem…" neðst í Útgáfur-spjaldinu,
    // en sýnileg í toolbarnum: aðgerðin VAR til, hún fannst bara aldrei ofan í
    // samanbrotnu spjaldi (Agnar 26.08: „Engin skýr Vista síðu-aðgerð").
    const sp = q('#pe-savepage'); if (sp) sp.onclick = saveVersionAs;
    qa('[data-ver-go]').forEach(b => b.onclick = () => activateVersion(+b.dataset.verGo));
    qa('[data-ver-del]').forEach(b => b.onclick = () => deleteVersion(+b.dataset.verDel));
    qa('[data-lk-open]').forEach(b => b.onclick = () => linkGo(+b.dataset.lkOpen, ''));
    qa('[data-lk-go]').forEach(b => b.onclick = () => { const inp = q('[data-lk-q="' + b.dataset.lkGo + '"]'); linkGo(+b.dataset.lkGo, inp ? inp.value : ''); });
    qa('[data-lk-q]').forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); linkGo(+inp.dataset.lkQ, inp.value); } }));
    qa('[data-lk-place]').forEach(b => b.onclick = () => placeLink(+b.dataset.lkPlace));
    qa('[data-lk-delc]').forEach(b => b.onclick = () => deleteCustomLink(+b.dataset.lkDelc));
    const lkn = q('#pe-lk-new'); if (lkn) lkn.onclick = addCustomLink;
    qa('[data-zone]').forEach(b => b.onclick = () => pickZone(b.dataset.zone));
    const pp = q('#pe-parent'); if (pp) pp.onclick = () => {
      const par = target && target.parentElement;
      if (par && par !== document.body && par !== document.documentElement) {
        target = par; highlight(par); setTimeout(hideHighlight, 900); renderPanel();
      }
    };
    const pt = q('#pe-pick-table'); if (pt) pt.onclick = () => {
      const tb = target && target.closest && target.closest('table');
      if (tb) { target = tb; extraTargets = []; highlight(tb); setTimeout(hideHighlight, 900); renderPanel(); }
    };
    const pk = q('#pe-pick'); if (pk) pk.onclick = () => setPicking(!picking);
    const mu = q('#pe-multi'); if (mu) mu.onclick = () => {
      multiPick = !multiPick;
      if (multiPick && !picking) setPicking(true);   // beint í val-ham
      if (!multiPick) extraTargets = [];
      renderPanel();
    };
    const up = q('#pe-unpick'); if (up) up.onclick = () => { target = null; extraTargets = []; hideHighlight(); renderPanel(); };
    const bg = q('#pe-bg'); if (bg) bg.onclick = pickBackground;
    qa('[data-zoom]').forEach(b => b.onclick = () => setZoom(+b.dataset.zoom));
    const rs = q('#pe-reset'); if (rs) rs.onclick = resetMenu;
    const un = q('#pe-undo'); if (un) un.onclick = undo;
    qa('[data-scope]').forEach(b => b.onclick = () => { scope = b.dataset.scope; renderPanel(); });
    qa('[data-match]').forEach(b => b.onclick = () => { matchMode = b.dataset.match; renderPanel(); });
    qa('[data-slider]').forEach(inp => inp.addEventListener('input', () => {
      const num = p.querySelector('[data-num="' + inp.dataset.slider + '"]'); if (num) num.value = inp.value;
      applySize(inp.dataset.slider, inp.dataset.unit, inp.value);
    }));
    qa('[data-num]').forEach(inp => inp.addEventListener('input', () => {
      const rng = p.querySelector('[data-slider="' + inp.dataset.num + '"]'); if (rng && inp.value !== '') rng.value = inp.value;
      if (inp.value !== '') applySize(inp.dataset.num, inp.dataset.unit, inp.value);
    }));
    qa('[data-color]').forEach(inp => inp.addEventListener('input', () => {
      if (inp.dataset.color === 'border-color') setDecl('border-style', 'solid');
      setDecl(inp.dataset.color, inp.value);
    }));
    qa('[data-clear]').forEach(b => b.onclick = () => { setDecl(b.dataset.clear, ''); renderPanel(); });
    qa('[data-grad]').forEach(inp => inp.addEventListener('input', setGradient));
    const fs = q('[data-font]'); if (fs) fs.onchange = () => setDecl('font-family', fs.value === '(sjálfgefið)' ? '' : fs.value);
    qa('[data-preset]').forEach(b => b.onclick = () => { const p = b.dataset.preset.split('-'); const g = PRESET_GROUPS[+p[0]]; if (g && g.items[+p[1]]) applyPreset(g.items[+p[1]][1]); });
    const favBtn = q('#pe-fav'); if (favBtn) favBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); saveFavorite(); };
    const pm = q('#pe-preset-more'); if (pm) pm.onclick = () => { showAllPresets = true; renderPanel(); };
    const pl = q('#pe-preset-less'); if (pl) pl.onclick = () => { showAllPresets = false; renderPanel(); };
    const bm = q('#pe-bg-more'); if (bm) bm.onclick = () => { showAllBg = true; renderPanel(); };
    const bl = q('#pe-bg-less'); if (bl) bl.onclick = () => { showAllBg = false; renderPanel(); };
    qa('[data-fav]').forEach(b => b.onclick = () => { const f = (state.favs || [])[+b.dataset.fav]; if (f) applyPreset(f.d); });
    qa('[data-favdel]').forEach(b => b.onclick = (e) => { e.stopPropagation(); deleteFavorite(+b.dataset.favdel); });
  }

  function resetMenu() {
    const vid = target ? viewIdOf(target) : null;
    const opts = [];
    if (target) opts.push('1 = þennan hlut');
    opts.push('2 = þessa síðu' + (vid ? ' (' + vid + ')' : ''));
    opts.push('3 = ALLT (öll útlit)');
    const ans = prompt('Resetta útlit:\n' + opts.join('\n') + '\n\nSláðu inn 1, 2 eða 3:', target ? '1' : '2');
    snapshot();
    if (ans === '1' && target) {
      const sel = relSelector(target, matchMode === 'many'), scp = targetScope();
      state.rules = state.rules.filter(r => !(r.sel === sel && r.scope === scp));
    } else if (ans === '2') {
      const cur = document.querySelector('.view.active') || target && target.closest('.view');
      const id = (cur && cur.id) || vid;
      if (id) { state.rules = state.rules.filter(r => r.scope !== id); if (state.bg.pages) delete state.bg.pages[id]; }
    } else if (ans === '3') {
      if (!confirm('Eyða ÖLLUM útlits-breytingum á öllum síðum?')) return;
      state = { rules: [], bg: { all: null, pages: {} } };
    } else { undoStack.pop(); return; }
    persist(); renderPanel();
  }

  // 2026-08-05 (hraða-úttekt): bakgrunnsmyndin var lesin sem base64 data-URL og
  // geymd INNI Í stillingunum — ein 179 kB PNG þýddi 179 kB aukalega í hverri
  // einustu opnun appsins, á öllum tækjum. Myndin fer nú í Supabase Storage og
  // aðeins slóðin geymist (vafrinn cachar hana þá líka). Data-URL er notað sem
  // varaleið ef Storage svarar ekki, svo aðgerðin klikkar aldrei.
  const BG_BUCKET = 'utlit';

  async function uploadBg(f) {
    const SB = (window.DB && DB.sb) || null;
    if (!SB || !SB.storage) return null;
    try {
      const ext = (f.name.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase();
      const path = 'bakgrunnur/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + ext;
      const up = await SB.storage.from(BG_BUCKET).upload(path, f, {
        upsert: false, contentType: f.type || 'image/png', cacheControl: '31536000'
      });
      if (up.error) return null;
      const pub = SB.storage.from(BG_BUCKET).getPublicUrl(path);
      return (pub && pub.data && pub.data.publicUrl) || null;
    } catch (_) { return null; }
  }

  function pickBackground() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const where = prompt('Setja bakgrunn á:\n1 = þessa síðu\n2 = allar síður\n\n1 eða 2:', '1');
      if (where !== '1' && where !== '2') return;
      const cur = document.querySelector('.view.active');
      const id = cur && cur.id;
      if (where === '1' && !id) { toast('Opnaðu síðuna fyrst'); return; }

      toast('Hleð upp bakgrunni…');
      let url = await uploadBg(f);
      if (!url) {
        url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(f); });
        if (!url) { toast('Tókst ekki að lesa myndina.'); return; }
        toast('Storage svaraði ekki — myndin geymist í stillingum í bili.');
      }
      snapshot();
      if (where === '2') state.bg.all = url;
      else { state.bg.pages = state.bg.pages || {}; state.bg.pages[id] = url; }
      persist();
    };
    inp.click();
  }

  // ── element picking ─────────────────────────────────────────────────────────
  function setPicking(on) {
    picking = on;
    document.body.classList.toggle('pe-picking', on);
    if (!on) hideHighlight();
    renderPanel();
  }
  function insideEditor(el) { return !!(el.closest && (el.closest('#' + PANEL_ID) || el.closest('#' + BTN_ID) || el.id === HL_ID || el.id === HL_ID + '-lbl')); }
  // Mannamál um hlutinn — birt á merkimiða við bendilinn og í val-röndinni
  // („gera betur augljóst hvað maður er að fara velja", Agnar 26.08).
  function friendlyName(el) {
    try {
      const t = el.tagName;
      if (t === 'TABLE') return '📊 Tafla í heild';
      if (t === 'TR') return 'Röð í töflu';
      if (t === 'TH') return 'Töfluhaus (dálkur)';
      if (t === 'TD') return 'Reitur í töflu';
      if (t === 'BUTTON') return 'Hnappur';
      if (t === 'A') return 'Tengill / hnappur';
      if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return 'Innsláttarreitur';
      if (/^H[1-6]$/.test(t)) return 'Fyrirsögn';
      if (t === 'IMG' || t === 'svg' || (el.closest && el.closest('svg'))) return 'Mynd / tákn';
      if (el.classList.contains('topbar')) return '☰ Hliðarstikan (valmynd)';
      if (el.classList.contains('view')) return '🗔 Síðan öll';
      if (el.classList.contains('data-table-wrap') || el.classList.contains('thm')) return 'Töflu-ramminn';
      const txt = (el.textContent || '').trim();
      if (txt && txt.length < 30 && !el.children.length) return 'Texti: „' + txt.slice(0, 26) + '"';
      return 'Box / svæði';
    } catch (_) { return 'Hlutur'; }
  }
  function highlight(el) {
    let h = document.getElementById(HL_ID);
    if (!h) { h = document.createElement('div'); h.id = HL_ID; document.body.appendChild(h); }
    const r = el.getBoundingClientRect();
    h.style.display = 'block'; h.style.left = r.left + 'px'; h.style.top = r.top + 'px'; h.style.width = r.width + 'px'; h.style.height = r.height + 'px';
    let l = document.getElementById(HL_ID + '-lbl');
    if (!l) {
      l = document.createElement('div'); l.id = HL_ID + '-lbl';
      l.style.cssText = 'position:fixed;z-index:99997;pointer-events:none;background:#0f172a;color:#fff;font:700 11.5px \'IBM Plex Sans\',-apple-system,\'Segoe UI\',sans-serif;padding:3px 9px;border-radius:7px;box-shadow:0 4px 12px rgba(0,0,0,.35);white-space:nowrap';
      document.body.appendChild(l);
    }
    l.textContent = friendlyName(el);
    l.style.display = 'block';
    l.style.left = Math.max(4, r.left) + 'px';
    l.style.top = (r.top > 26 ? r.top - 24 : r.top + 4) + 'px';
  }
  function hideHighlight() {
    const h = document.getElementById(HL_ID); if (h) h.style.display = 'none';
    const l = document.getElementById(HL_ID + '-lbl'); if (l) l.style.display = 'none';
  }
  function onMove(e) { if (!picking) return; const el = e.target; if (!el || insideEditor(el)) { hideHighlight(); return; } highlight(el); }
  function onPick(e) {
    if (!picking) return; const el = e.target; if (!el || insideEditor(el)) return;
    e.preventDefault(); e.stopPropagation();
    if (multiPick && target && el !== target) {
      // „Velja marga": smellur BÆTIR VIÐ (eða fjarlægir ef sami hlutur aftur).
      const i = extraTargets.indexOf(el);
      if (i >= 0) extraTargets.splice(i, 1); else extraTargets.push(el);
      highlight(el); setTimeout(hideHighlight, 500);
      renderPanel();   // picking helst Á — hægt að smella áfram
      return;
    }
    target = el;
    if (!multiPick) setPicking(false);
    // keep the highlight on the chosen element briefly
    highlight(el); setTimeout(hideHighlight, 700);
    renderPanel();
  }

  // ── panel open/close ────────────────────────────────────────────────────────
  function openPanel() {
    if (IN_DEVFRAME) return;
    injectStyles();
    if (document.getElementById(PANEL_ID)) return;
    preferDesktopDock();
    const p = document.createElement('div'); p.id = PANEL_ID; document.body.appendChild(p);
    renderPanel();
    renderPageLinks(true);   // ✕ og dráttur kvikna á link-tökkunum
  }
  function closePanel() {
    const p = document.getElementById(PANEL_ID); if (p) p.remove();
    setPicking(false); hideHighlight();
    syncDeskChrome(null);
    renderPageLinks(true);   // ✕ hverfur og takkarnir læsast á sínum stað
  }
  function togglePanel() { if (document.getElementById(PANEL_ID)) closePanel(); else openPanel(); }

  // ── the 🎨 banner button ────────────────────────────────────────────────────
  function ensureBtn() {
    if (IN_DEVFRAME) return;
    if (document.getElementById(BTN_ID)) return;
    injectStyles();
    const clockbox = document.querySelector('.bb-clockbox');
    const mk = () => { const b = document.createElement('button'); b.id = BTN_ID; b.type = 'button'; b.title = 'Stilla útlit — litir, letur, stærðir, bakgrunnur'; b.textContent = '🎨'; b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); togglePanel(); }); return b; };
    if (clockbox && clockbox.parentNode) { clockbox.parentNode.insertBefore(mk(), clockbox); return; }
    const restore = document.getElementById('bstal-restore');
    if (restore && restore.style.display !== 'none') { const b = mk(); b.style.cssText += ';position:fixed;right:108px;top:14px;z-index:9998;width:38px;height:38px;margin:0;background:rgba(0,0,0,.35)'; document.body.appendChild(b); }
  }

  function boot() {
    loadState(); applyCss();
    if (IN_DEVFRAME) {
      applyZones();
      try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { loadState(); applyCss(); applyZones(); }); } catch (_) {}
      window.addEventListener('hashchange', () => setTimeout(applyZones, 140));
      document.addEventListener('slokk-viewmode', () => setTimeout(applyZones, 60));
      setInterval(applyZones, 1500);
      return;
    }
    ensureBtn();
    const obs = new MutationObserver(() => { if (!document.getElementById(BTN_ID)) ensureBtn(); });
    obs.observe(document.body, { childList: true, subtree: true });
    [400, 1200, 3000].forEach(ms => setTimeout(ensureBtn, ms));
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onPick, true);
    // re-hydrate overrides once settings sync from the DB
    try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { loadState(); applyCss(); renderPageLinks(true); applyZones(); }); } catch (_) {}
    // Svæða-stillingarnar (bannerhæð, faldar síur, KPI-spjöld) sitja á DOM-inu
    // sjálfu, ekki í CSS-reglunum — þær þarf því að keyra aftur í hvert sinn sem
    // síða er teiknuð upp á nýtt. Ódýrt: hvert spjald hættir strax ef ekkert
    // er stillt fyrir virku síðuna.
    applyZones();
    window.addEventListener('hashchange', () => setTimeout(applyZones, 140));
    document.addEventListener('slokk-viewmode', () => setTimeout(applyZones, 60));
    setInterval(applyZones, 1500);
    window.addEventListener('scroll', () => { if (picking) hideHighlight(); }, true);
    // link-takkar á síðum: teikna við ræsingu og elta síðu-skipti
    renderPageLinks(true);
    window.addEventListener('hashchange', () => setTimeout(() => renderPageLinks(true), 120));
    // Snúningur/stærðarbreyting: dregnir takkar eru geymdir sem hlutfall, svo
    // teiknum upp á nýtt til að klemma þá aftur inn í gluggann.
    window.addEventListener('resize', () => { clearTimeout(_plRz); _plRz = setTimeout(() => renderPageLinks(true), 180); });
    document.addEventListener('slokk-viewmode', () => renderPageLinks(true));
    // 2026-08-29 (Agnar: „sést alltaf í kanski eina sekúndu ennþá þegar maður
    // skiptir um síðu"). Ástæðan: síðuskipti í þessu appi eru EKKI alltaf
    // hashchange — flestar sýnir skipta bara um .active-klasann. Þá tók ekkert
    // eftir skiptunum fyrr en 2 sekúndna pollið kom næst, og takki gömlu
    // síðunnar sat eftir á meðan. Fylgjumst því með klasanum sjálfum og
    // teiknum um leið og hann breytist.
    try {
      const vObs = new MutationObserver(() => renderPageLinks(false));
      document.querySelectorAll('.view').forEach(v => vObs.observe(v, { attributes: true, attributeFilter: ['class'] }));
      // Sýnir sem bætast við eftir á (lazy-teiknaðar síður) fá sama fylgjara.
      new MutationObserver(muts => {
        muts.forEach(m => (m.addedNodes || []).forEach(n => {
          if (n.nodeType === 1 && n.classList && n.classList.contains('view')) {
            vObs.observe(n, { attributes: true, attributeFilter: ['class'] });
          }
        }));
      }).observe(document.body, { childList: true, subtree: true });
    } catch (_) {}
    setInterval(() => renderPageLinks(false), 2000);   // bakvörður ef fylgjarinn missir af
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.PageEditor = {
    open: openPanel, close: closePanel, toggle: togglePanel,
    reset: () => { state = { rules: [], bg: { all: null, pages: {} }, zones: {} }; persist(); },
    // ── Verkfæraspjöld svæðanna (v2) ────────────────────────────────────────
    // Skráðu spjald á svæði úr ZONES ('haus' | 'kpi' | 'siur' | 'tafla' |
    // 'valmynd'). `render(cfg, api)` skilar HTML, `wire(root, cfg, api)` tengir
    // það. Stillingarnar (`cfg`) eru geymdar per síðu inni í page_editor_v1_json
    // — þær samstillast því milli tækja og fylgja „Vista síðu"/Útgáfum.
    registerCard: (id, impl) => {
      if (!id || !impl) return;
      cards[id] = impl;
      if (document.getElementById(PANEL_ID)) renderPanel();
    },
    // Lesa/skrifa svæðis-stillingar utan frá (t.d. úr applier sem keyrir á
    // síðunni sjálfri, án þess að panellinn sé opinn).
    // Valinn hlutur — svo spjöld geti boðið „bara þennan" gildissvið.
    target: () => target,
    zoneCfg: (id, vid) => zoneCfg(id, vid),
    setZoneCfg: (id, patch) => setZoneCfg(id, patch),
    applyZones: applyZones,
    // Teikna panelinn upp á nýtt án þess að loka honum — fyrir spjöld sem
    // skrifa í aðra geymslu (t.d. TableLook) og þurfa svo að sýna nýja stöðu.
    refresh: () => { if (document.getElementById(PANEL_ID)) renderPanel(); },
    syncFrame: () => {},
    // Fyrir hjálpar-patcha (321-toflunet o.fl.): skrifa/lesa staka decl á reglu
    // með eigin selector — sama farvegur og allt annað (snapshot + persist +
    // AppSettings-sync), svo breytingakerfið helst eitt.
    upsertDecl: (scp, sel, prop, val) => {
      snapshot();
      const r = ruleFor(sel, scp, true); if (!r) return;
      if (val == null || val === '') delete r.decls[prop]; else r.decls[prop] = val;
      persist(); renderPanel();
    },
    readDecl: (scp, sel, prop) => {
      const r = state.rules.find(x => x.sel === sel && x.scope === scp);
      return r && r.decls ? (r.decls[prop] || null) : null;
    },
    clearRule: (scp, sel) => {
      const i = state.rules.findIndex(x => x.sel === sel && x.scope === scp);
      if (i >= 0) { snapshot(); state.rules.splice(i, 1); persist(); renderPanel(); }
    }
  };
  console.log('[patch-262] Stílstjóri (page editor) installed');
})();
