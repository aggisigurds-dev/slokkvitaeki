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

  const KEY = 'page_editor_v1_json';
  const BTN_ID = '_pe-btn';
  const PANEL_ID = '_pe-panel';
  const STYLE_ID = '_pe-overrides';
  const HL_ID = '_pe-highlight';

  let state = { rules: [], bg: { all: null, pages: {} }, favs: [] };
  let target = null;        // currently selected DOM element
  let picking = false;      // element-pick mode
  let scope = 'page';       // 'page' | 'all'
  let matchMode = 'one';    // 'one' = just this element, 'many' = every matching element (tag+class, no nth-of-type)
  let _saveT = null;
  let undoStack = [];       // snapshot() before each mutation → ↩ Afturkalla pops the last one
  const UNDO_MAX = 20;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cssEsc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&');

  // ── persistence ───────────────────────────────────────────────────────────
  function loadState() {
    try {
      const raw = window.AppSettings && AppSettings.path ? AppSettings.path(KEY) : null;
      if (raw) state = Object.assign({ rules: [], bg: { all: null, pages: {} }, favs: [] }, JSON.parse(raw));
      if (!state.bg) state.bg = { all: null, pages: {} };
      if (!Array.isArray(state.rules)) state.rules = [];
      if (!Array.isArray(state.favs)) state.favs = [];
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

  function applyCss() {
    let st = document.getElementById(STYLE_ID);
    if (!st) { st = document.createElement('style'); st.id = STYLE_ID; document.head.appendChild(st); }
    let css = '';
    for (const r of state.rules) {
      const keys = r.decls ? Object.keys(r.decls) : [];
      if (!keys.length) continue;
      if (isGlobalTagRule(r)) {
        console.warn('[stílstjóri] hunsa alheimsreglu á berum tag-velja:', r.sel, r.decls);
        continue;
      }
      const body = keys.map(p => p + ':' + r.decls[p] + (/!important/.test(r.decls[p]) ? '' : ' !important')).join(';');
      const sel = r.scope === 'all' ? r.sel : '#' + r.scope + ' ' + r.sel;
      css += sel + '{' + body + '}\n';
    }
    if (state.bg && state.bg.all) css += 'body{background-image:url(' + state.bg.all + ') !important;background-size:cover !important;background-position:center !important;background-attachment:fixed !important}\n';
    if (state.bg && state.bg.pages) for (const vid in state.bg.pages) { if (state.bg.pages[vid]) css += '#' + vid + '{background-image:url(' + state.bg.pages[vid] + ') !important;background-size:cover !important;background-position:center !important}\n'; }
    st.textContent = css;
  }

  // Set/clear one declaration on the current target.
  function setDecl(prop, val) {
    const r = currentRule(true); if (!r) return;
    snapshot();
    if (val === '' || val == null) delete r.decls[prop]; else r.decls[prop] = val;
    persist();
  }
  function getDecl(prop) { const r = currentRule(false); return r && r.decls ? r.decls[prop] : undefined; }
  // Apply a numeric size (from slider OR manual number box). Padding V/H set BOTH
  // sides and drop any `padding` shorthand so squared buttons actually shrink.
  function applySize(prop, unit, raw) {
    const r = currentRule(true); if (!r) return;
    let val = parseFloat(String(raw).replace(',', '.')); if (!isFinite(val)) return;
    snapshot();
    if (prop === 'padding-top') { r.decls['padding-top'] = val + 'px'; r.decls['padding-bottom'] = val + 'px'; delete r.decls['padding']; }
    else if (prop === 'padding-left') { r.decls['padding-left'] = val + 'px'; r.decls['padding-right'] = val + 'px'; delete r.decls['padding']; }
    else if (prop === 'height' && val <= 0) { delete r.decls['height']; }   // 0 = auto (unset)
    else if (prop === 'line-height') { r.decls['line-height'] = String(val / 100); }
    else if (unit === '%') { r.decls[prop] = val + '%'; }
    else if (unit === '') { r.decls[prop] = String(val); }
    else { if (prop === 'border-width') r.decls['border-style'] = 'solid'; r.decls[prop] = val + 'px'; }
    persist();
  }
  // Read the element's live value (override → computed) for slider init.
  function liveNum(prop, fallback) {
    const ov = getDecl(prop); if (ov != null) { const n = parseFloat(ov); if (isFinite(n)) return n; }
    if (!target) return fallback;
    const cs = getComputedStyle(target); const n = parseFloat(cs[prop] || cs.getPropertyValue(prop)); return isFinite(n) ? Math.round(n) : fallback;
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

  const PRESET_GROUPS = [
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
    const r = currentRule(true); snapshot(); Object.assign(r.decls, decls); persist(); renderPanel();
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

  const FONTS = ['(sjálfgefið)', 'Space Grotesk', 'Space Mono', 'Source Serif 4', 'Georgia, serif', 'system-ui, sans-serif', 'Arial, sans-serif', 'Courier New, monospace', 'Impact, sans-serif'];

  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); }

  // ── styles ──────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('_pe-css')) return;
    const s = document.createElement('style'); s.id = '_pe-css';
    s.textContent = [
      '#' + BTN_ID + '{all:unset;cursor:pointer;font-size:17px;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;margin-right:6px;transition:background .12s}',
      '#' + BTN_ID + ':hover{background:rgba(255,255,255,.14)}',
      '#' + PANEL_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:99990;max-height:56vh;overflow:auto;background:#f8fafc;border-top:1px solid #cbd5e1;box-shadow:0 -12px 34px -14px rgba(15,23,42,.35);font-family:"Space Grotesk",system-ui,sans-serif;color:#11141c;padding:14px 18px 22px}',
      // Header is now its own column: title row, then a toolbar row (wraps
      // cleanly instead of everything fighting for one line), then — only when
      // a target is picked — its own row for the selector chip. Fixes the
      // cramped/overlapping header when the selector text was long.
      '#' + PANEL_ID + ' .pe-hd{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}',
      '#' + PANEL_ID + ' .pe-titlerow{display:flex;align-items:flex-start;gap:12px}',
      '#' + PANEL_ID + ' .pe-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '#' + PANEL_ID + ' .pe-targetrow{display:flex;align-items:center;gap:8px}',
      '#' + PANEL_ID + ' .pe-h{font-size:16px;font-weight:800;margin:0}',
      '#' + PANEL_ID + ' .pe-sub{font-size:12px;color:#64748b}',
      '#' + PANEL_ID + ' .pe-btn{all:unset;cursor:pointer;font-size:12.5px;font-weight:700;padding:7px 13px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#334155}',
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
      '#' + PANEL_ID + ' .pe-row{display:flex;align-items:center;gap:10px;margin:7px 0}',
      '#' + PANEL_ID + ' .pe-row label{flex:0 0 118px;font-size:12.5px;font-weight:600;color:#334155}',
      '#' + PANEL_ID + ' .pe-row input[type=range]{flex:1;min-width:80px}',
      '#' + PANEL_ID + ' .pe-val{flex:0 0 52px;width:52px;text-align:center;font-family:"Space Mono",monospace;font-weight:700;font-size:12.5px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;padding:4px 2px;-moz-appearance:textfield}',
      '#' + PANEL_ID + ' .pe-val:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.2)}',
      '#' + PANEL_ID + ' .pe-val::-webkit-outer-spin-button,#' + PANEL_ID + ' .pe-val::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}',
      '#' + PANEL_ID + ' .pe-row input[type=color]{width:40px;height:28px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:1px;cursor:pointer}',
      '#' + PANEL_ID + ' .pe-row select{flex:1;font:inherit;font-size:12.5px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}',
      '#' + PANEL_ID + ' .pe-presets{display:flex;gap:9px;flex-wrap:wrap}',
      '#' + PANEL_ID + ' .pe-chip{all:unset;cursor:pointer;font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;display:inline-flex;align-items:center;justify-content:center;min-width:64px;text-align:center}',
      '#' + PANEL_ID + ' .pe-chip:hover{filter:brightness(1.06)}',
      '#' + PANEL_ID + ' .pe-pgroup{margin:2px 0 8px}',
      '#' + PANEL_ID + ' .pe-glabel{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;font-weight:700;margin:8px 0 6px}',
      '#' + PANEL_ID + ' .pe-favwrap{position:relative;display:inline-flex}',
      '#' + PANEL_ID + ' .pe-favdel{all:unset;position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:#dc2626;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.35)}',
      '#' + PANEL_ID + ' .pe-target{font-family:"Space Mono",monospace;font-size:11.5px;background:#111827;color:#e5e7eb;padding:4px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;max-width:320px;text-overflow:ellipsis}',
      '#' + PANEL_ID + ' .pe-empty{padding:22px;text-align:center;color:#64748b;font-size:13px;border:1px dashed #cbd5e1;border-radius:12px;background:#fff}',
      'body.pe-picking *{cursor:crosshair !important}',
      '#' + HL_ID + '{position:fixed;z-index:99989;pointer-events:none;border:2px solid #2563eb;background:rgba(37,99,235,.10);border-radius:4px;transition:all .04s;display:none}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── the panel ───────────────────────────────────────────────────────────────
  function sliderRow(label, prop, min, max, step, unit) {
    const v = liveNum(prop, min);
    return '<div class="pe-row"><label>' + esc(label) + '</label>' +
      '<input type="range" data-slider="' + prop + '" data-unit="' + (unit || 'px') + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + v + '">' +
      '<input type="number" class="pe-val" data-num="' + prop + '" data-unit="' + (unit || 'px') + '" step="' + (step || 1) + '" value="' + v + '"></div>';
  }
  function colorRow(label, prop) {
    return '<div class="pe-row"><label>' + esc(label) + '</label>' +
      '<input type="color" data-color="' + prop + '" value="' + liveColor(prop, '#333333') + '">' +
      '<button class="pe-btn" data-clear="' + prop + '" title="Hreinsa">✕</button></div>';
  }
  function renderPanel() {
    const p = document.getElementById(PANEL_ID); if (!p) return;
    const targetLbl = target ? relSelector(target, matchMode === 'many') : '';
    const scopeSeg = '<div class="pe-seg" title="Vista breytingu á þessari síðu eingöngu, eða öllum síðum"><button data-scope="page"' + (scope === 'page' ? ' class="on"' : '') + '>Þessi síða</button>' +
      '<button data-scope="all"' + (scope === 'all' ? ' class="on"' : '') + '>Allar síður</button></div>';
    const matchSeg = '<div class="pe-seg" title="Bara þennan staka hlut, eða ALLA hluti sem líta eins út (t.d. allar raðir í töflu í einu)"><button data-match="one"' + (matchMode === 'one' ? ' class="on"' : '') + '>🎯 Bara þennan</button>' +
      '<button data-match="many"' + (matchMode === 'many' ? ' class="on"' : '') + '>📑 Alla eins</button></div>';
    const head = '<div class="pe-hd">' +
      '<div class="pe-titlerow">' +
        '<div style="flex:1"><h3 class="pe-h">🎨 Stilla útlit</h3><div class="pe-sub">Veldu hlut og breyttu lit, letri, stærð, halla eða settu bakgrunn. Vistast strax' + (scope === 'all' ? ' — <b>allar síður</b>' : ' — <b>þessi síða</b>') + '.</div></div>' +
        '<button class="pe-btn" id="pe-close">✕ Loka</button>' +
      '</div>' +
      '<div class="pe-toolbar">' +
        '<button class="pe-btn ' + (picking ? 'on' : 'pri') + '" id="pe-pick">' + (picking ? '🎯 Hætta að velja' : '🎯 Velja hlut') + '</button>' +
        scopeSeg +
        (target ? matchSeg : '') +
        '<button class="pe-btn" id="pe-undo"' + (undoStack.length ? '' : ' disabled') + ' title="Afturkalla síðustu breytingu">↩ Afturkalla</button>' +
        '<button class="pe-btn" id="pe-reset">↺ Resetta ▾</button>' +
        '<button class="pe-btn" id="pe-bg">🖼 Bakgrunnsmynd</button>' +
      '</div>' +
      (target ? '<div class="pe-targetrow"><span class="pe-target" title="' + esc(targetLbl) + '">' + esc(targetLbl) + '</span><button class="pe-btn" id="pe-unpick">hreinsa val</button></div>' : '') +
      '</div>';

    let body;
    if (!target) {
      body = '<div class="pe-empty">Ýttu á <b>🎯 Velja hlut</b> og smelltu svo á texta, box eða glugga á síðunni til að byrja að breyta.<br>Eða settu <b>🖼 Bakgrunnsmynd</b> á síðuna.</div>' + presetsSection();
    } else {
      body = '<div class="pe-grid">' +
        '<details class="pe-sec"><summary><h4>Stærð &amp; bil</h4></summary>' +
          sliderRow('Letur', 'font-size', 8, 54, 1) +
          sliderRow('Línuhæð', 'line-height', 90, 240, 5, '%') +
          sliderRow('Leturþyngd', 'font-weight', 100, 900, 100, '') +
          sliderRow('Padding lóðrétt', 'padding-top', 0, 60, 1) +
          sliderRow('Padding lárétt', 'padding-left', 0, 60, 1) +
          sliderRow('Stafabil', 'letter-spacing', -2, 8, 0.5) +
        '</details>' +
        '<details class="pe-sec"><summary><h4>Box &amp; gluggi</h4></summary>' +
          sliderRow('Breidd', 'width', 40, 1280, 5) +
          sliderRow('Hæð (0=sjálfv.)', 'height', 0, 600, 2) +
          sliderRow('Lágmarkshæð', 'min-height', 0, 600, 5) +
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
      '</div>' + presetsSection();
    }
    p.innerHTML = head + body;
    wirePanel();
  }
  function presetsSection() {
    const favs = (state.favs || []);
    const favGroup = favs.length ? '<div class="pe-pgroup"><span class="pe-glabel">⭐ Uppáhald</span><div class="pe-presets">' +
      favs.map((f, i) => '<span class="pe-favwrap"><button class="pe-chip" data-fav="' + i + '" title="' + esc(f.n) + '" style="' + presetPreviewStyle(f.d) + '">' + esc(f.n) + '</button><button class="pe-favdel" data-favdel="' + i + '" title="Fjarlægja">✕</button></span>').join('') +
      '</div></div>' : '';
    // Collapsed by default — this chip grid (6 groups × up to 7 swatches) was
    // the single biggest space-eater in the panel (verkefnalisti feedback).
    return '<details class="pe-sec" style="margin-top:12px"><summary style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h4 style="margin:0;display:inline">Hnappa- &amp; merkja-safn — smelltu til að setja á valinn hlut (hnapp eða stöðu-merki)</h4>' +
      '<button class="pe-btn" id="pe-fav" style="margin-left:auto" title="Vista núverandi stíl valins hlutar sem uppáhald">★ Vista stíl í uppáhald</button></summary>' +
      favGroup +
      PRESET_GROUPS.map((g, gi) => '<div class="pe-pgroup"><span class="pe-glabel">' + esc(g.label) + '</span><div class="pe-presets">' +
        g.items.map((it, ii) => '<button class="pe-chip" data-preset="' + gi + '-' + ii + '" title="' + esc(it[0]) + '" style="' + presetPreviewStyle(it[1]) + '">' + esc(it[0]) + '</button>').join('') +
      '</div></div>').join('') + '</details>';
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

  function wirePanel() {
    const p = document.getElementById(PANEL_ID); if (!p) return;
    const q = s => p.querySelector(s), qa = s => Array.prototype.slice.call(p.querySelectorAll(s));
    q('#pe-close').onclick = closePanel;
    const pk = q('#pe-pick'); if (pk) pk.onclick = () => setPicking(!picking);
    const up = q('#pe-unpick'); if (up) up.onclick = () => { target = null; hideHighlight(); renderPanel(); };
    const bg = q('#pe-bg'); if (bg) bg.onclick = pickBackground;
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
  function insideEditor(el) { return !!(el.closest && (el.closest('#' + PANEL_ID) || el.closest('#' + BTN_ID) || el.id === HL_ID)); }
  function highlight(el) {
    let h = document.getElementById(HL_ID);
    if (!h) { h = document.createElement('div'); h.id = HL_ID; document.body.appendChild(h); }
    const r = el.getBoundingClientRect();
    h.style.display = 'block'; h.style.left = r.left + 'px'; h.style.top = r.top + 'px'; h.style.width = r.width + 'px'; h.style.height = r.height + 'px';
  }
  function hideHighlight() { const h = document.getElementById(HL_ID); if (h) h.style.display = 'none'; }
  function onMove(e) { if (!picking) return; const el = e.target; if (!el || insideEditor(el)) { hideHighlight(); return; } highlight(el); }
  function onPick(e) {
    if (!picking) return; const el = e.target; if (!el || insideEditor(el)) return;
    e.preventDefault(); e.stopPropagation();
    target = el; setPicking(false);
    // keep the highlight on the chosen element briefly
    highlight(el); setTimeout(hideHighlight, 700);
    renderPanel();
  }

  // ── panel open/close ────────────────────────────────────────────────────────
  function openPanel() {
    injectStyles();
    if (document.getElementById(PANEL_ID)) return;
    const p = document.createElement('div'); p.id = PANEL_ID; document.body.appendChild(p);
    renderPanel();
  }
  function closePanel() { const p = document.getElementById(PANEL_ID); if (p) p.remove(); setPicking(false); hideHighlight(); }
  function togglePanel() { if (document.getElementById(PANEL_ID)) closePanel(); else openPanel(); }

  // ── the 🎨 banner button ────────────────────────────────────────────────────
  function ensureBtn() {
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
    ensureBtn();
    const obs = new MutationObserver(() => { if (!document.getElementById(BTN_ID)) ensureBtn(); });
    obs.observe(document.body, { childList: true, subtree: true });
    [400, 1200, 3000].forEach(ms => setTimeout(ensureBtn, ms));
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onPick, true);
    // re-hydrate overrides once settings sync from the DB
    try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { loadState(); applyCss(); }); } catch (_) {}
    window.addEventListener('scroll', () => { if (picking) hideHighlight(); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.PageEditor = { open: openPanel, close: closePanel, toggle: togglePanel, reset: () => { state = { rules: [], bg: { all: null, pages: {} } }; persist(); } };
  console.log('[patch-262] Stílstjóri (page editor) installed');
})();
