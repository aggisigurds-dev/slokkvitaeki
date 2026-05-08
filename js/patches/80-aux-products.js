/* === AUX PRODUCTS v1 ===
 * Imports the 68 secondary-pricelist products from the user's spreadsheet
 * (sheet gid=1231510748) and exposes them in Sala behind an
 * "Aðrar Vörur" expandable button below the main product grid.
 *
 * Two parts:
 *   1) Idempotent seed — on first run, inserts any of these 68 products
 *      that aren't already in `vorur` (matched by name, case-insensitive).
 *      Marker stored in localStorage so we don't re-fetch every page load.
 *   2) UI patch — watches Sala (#pos-products) and hides product tiles
 *      whose category is in AUX_CATEGORIES, then injects an expandable
 *      "Aðrar Vörur" button + grid below. Clicking an aux tile triggers
 *      a click on the hidden original tile, which routes through pos.js's
 *      existing add-to-cart delegate.
 */
(() => {
  if (window.__auxProductsInstalled) return;
  window.__auxProductsInstalled = true;

  // Categories that count as auxiliary (everything from the spreadsheet).
  // Anything NOT in this set lives in the main Sala grid.
  const AUX_CATEGORIES = new Set([
    'Skilti, ljós og miðar',
    'Skynjarar og rafhlöður',
    'Brunaslöngurhjól',
    'Ýmsar vörur',
    'Varahlutir',
    'Vinna og akstur',
    'Yfirferð slökkvitækja',
    'Hleðsla slökkvitækja',
    'Vinna',
    'Tæki',
    'Aukavörur'
  ]);

  // Products from the spreadsheet — name, category, ex-VAT price (kr).
  // 68 entries. Names with embedded quotes ("3/4″") are cleaned to use the
  // prime symbol instead of multiple double-quote escapes.
  const AUX_PRODUCTS = [
    { nafn: 'Skilti græn lím sjálflýsandi 150x300', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 3073 },
    { nafn: 'Skilti Neyðarútgangur 120x340', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 4194 },
    { nafn: 'Miði Neyðarútgangur 60x170', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 3992 },
    { nafn: 'Miði Brunaslönguhjól leiðb.miði', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 565 },
    { nafn: 'Miði slökkvitæki og sjúkrapúði 5,5cm', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 444 },
    { nafn: 'CO / Reykskynjari Gabel', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 4850 },
    { nafn: 'Hitaskynjari MINI 10 ára', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 3105 },
    { nafn: 'Gasskynjari 12/230V', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 9481 },
    { nafn: 'Gasskynjari MINI m/rofa', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 10685 },
    { nafn: 'AA Rafhlaða', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 173 },
    { nafn: '9V Rafhlaða', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 466 },
    { nafn: 'Brunaslönguhjól GRAS 3/4″ 30 m', flokkur: 'Brunaslöngurhjól', verd_an_vsk: 46774 },
    { nafn: 'Brunaslönguhjól SAVAL 3/4″ 25 m', flokkur: 'Brunaslöngurhjól', verd_an_vsk: 49450 },
    { nafn: 'Brunaslönguhjól SAVAL 3/4″ 30 m', flokkur: 'Brunaslöngurhjól', verd_an_vsk: 52339 },
    { nafn: 'Neyðarútgönguljós', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 7900 },
    { nafn: 'Skilti flöt rauð sjálflýsandi 150x150', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 2016 },
    { nafn: 'Skilti -L- rauð sjálflýsandi 150x150', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 2419 },
    { nafn: 'Skilti -V- rauð sjálflýsandi 150x150', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 3226 },
    { nafn: 'Skilti græn hörð sjálflýsandi 150x150', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 2252 },
    { nafn: 'Skilti græn hörð sjálflýsandi 150x300', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 3738 },
    { nafn: 'Skilti græn lím sjálflýsandi 150x150', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 2213 },
    { nafn: 'Hitaskynjari', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 1930 },
    { nafn: 'Festiól m/krækju fyrir slökkvitæki', flokkur: 'Ýmsar vörur', verd_an_vsk: 987 },
    { nafn: 'Keðjustigi 4,5m', flokkur: 'Ýmsar vörur', verd_an_vsk: 15242 },
    { nafn: 'Lyfjaskápur m/glerhurð og skrá', flokkur: 'Ýmsar vörur', verd_an_vsk: 6950 },
    { nafn: 'Miðar á tæki Bílanaust', flokkur: 'Ýmsar vörur', verd_an_vsk: 453 },
    { nafn: 'Millistykki Co2 í Argon', flokkur: 'Ýmsar vörur', verd_an_vsk: 2812 },
    { nafn: 'Skápur fyrir 6 kg. Slökkvitæki', flokkur: 'Ýmsar vörur', verd_an_vsk: 18010 },
    { nafn: 'Skipafesting fyrir 6 kg. Slökkvitæki', flokkur: 'Ýmsar vörur', verd_an_vsk: 6963 },
    { nafn: 'Skyndihjálparpúði 112', flokkur: 'Ýmsar vörur', verd_an_vsk: 2550 },
    { nafn: 'Álhimna Co2', flokkur: 'Varahlutir', verd_an_vsk: 341 },
    { nafn: 'Botn slökkvitæki', flokkur: 'Varahlutir', verd_an_vsk: 1845 },
    { nafn: 'Double tape pr. M.', flokkur: 'Varahlutir', verd_an_vsk: 340 },
    { nafn: 'Horn fyrir 2 kg. Kolsýrutæki', flokkur: 'Varahlutir', verd_an_vsk: 1803 },
    { nafn: 'Hosuklemma', flokkur: 'Varahlutir', verd_an_vsk: 498 },
    { nafn: 'Krani fyrir Co2 flöskur', flokkur: 'Varahlutir', verd_an_vsk: 5976 },
    { nafn: 'Miði notk.leiðb. Slökkvitæki', flokkur: 'Varahlutir', verd_an_vsk: 863 },
    { nafn: 'O-hringur', flokkur: 'Varahlutir', verd_an_vsk: 270 },
    { nafn: 'Píla', flokkur: 'Varahlutir', verd_an_vsk: 195 },
    { nafn: 'Rörsía léttvatn', flokkur: 'Varahlutir', verd_an_vsk: 502 },
    { nafn: 'Slanga fyrir 5 kg. Kolsýrutæki', flokkur: 'Varahlutir', verd_an_vsk: 2150 },
    { nafn: 'Slanga fyrir Duft / Léttvatn', flokkur: 'Varahlutir', verd_an_vsk: 2030 },
    { nafn: 'Slöngufesting', flokkur: 'Varahlutir', verd_an_vsk: 251 },
    { nafn: 'Úðastútur brunaslanga 19 m.m.', flokkur: 'Varahlutir', verd_an_vsk: 6774 },
    { nafn: 'Veggfesting', flokkur: 'Varahlutir', verd_an_vsk: 800 },
    { nafn: 'Þéttihringur Co2', flokkur: 'Varahlutir', verd_an_vsk: 298 },
    { nafn: 'Þrýstimælir', flokkur: 'Varahlutir', verd_an_vsk: 1928 },
    { nafn: 'Öryggisinnsigli hvítt', flokkur: 'Varahlutir', verd_an_vsk: 461 },
    { nafn: 'Öryggispinni slökkvitæki', flokkur: 'Varahlutir', verd_an_vsk: 240 },
    { nafn: 'Vinna pr. Klst.', flokkur: 'Vinna og akstur', verd_an_vsk: 13200 },
    { nafn: 'Uppsetning', flokkur: 'Vinna og akstur', verd_an_vsk: 2350 },
    { nafn: 'Akstur', flokkur: 'Vinna og akstur', verd_an_vsk: 3554 },
    { nafn: 'Ný vara', flokkur: 'Yfirferð slökkvitækja', verd_an_vsk: 100 },
    { nafn: 'Hl. 5 kg Kolsýrusl.t.', flokkur: 'Hleðsla slökkvitækja', verd_an_vsk: 5315 },
    { nafn: 'Hl. 2 kg Kolsýrusl.t.', flokkur: 'Hleðsla slökkvitækja', verd_an_vsk: 2815 },
    { nafn: 'Límmiði sjálflýsandi Slökkvitæki 150x150mm', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 1363 },
    { nafn: 'Límmiði sjálflýsandi brunaslanga 150x150mm', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 1363 },
    { nafn: 'Límmiði sjálflýsandi neyðarútgangur 210x100mm', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 1363 },
    { nafn: 'Límmiði sjálflýsandi ör 150x150mm', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 1363 },
    { nafn: 'Sunwind Gasskynjari rafhlöðu', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 16048 },
    { nafn: 'CO / Reykskynjari 10 ára Siterwell', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 7097 },
    { nafn: 'Smartwares Reyksk.', flokkur: 'Skynjarar og rafhlöður', verd_an_vsk: 4289 },
    { nafn: 'Skilti Neyðarútgangur 30x17 Sjálflímandi', flokkur: 'Aukavörur', verd_an_vsk: 2935 },
    { nafn: 'Skýrslugerð og vottun.', flokkur: 'Vinna', verd_an_vsk: 3500 },
    { nafn: 'Mobiak Neyðarljós LED 2W Mini', flokkur: 'Skilti, ljós og miðar', verd_an_vsk: 7177 },
    { nafn: 'Eldstafur', flokkur: 'Tæki', verd_an_vsk: 2850 },
    { nafn: 'Förgun slökkvitækja', flokkur: 'Ýmsar vörur', verd_an_vsk: 1800 },
    { nafn: 'Þrif/hreinsun á slökkvitæki', flokkur: 'Ýmsar vörur', verd_an_vsk: 1589 }
  ];

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtKr(n){const s=Math.round(n).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr';}

  // ---------- Step 1: idempotent seed ----------
  async function seed() {
    if (!window.DB || !DB.sb) { setTimeout(seed, 600); return; }
    if (localStorage.getItem('_auxProductsSeededV1')) return;
    try {
      const r = await DB.sb.from('vorur').select('nafn');
      if (r.error) { console.warn('[aux-products] read failed:', r.error.message); return; }
      const have = new Set((r.data || []).map(p => String(p.nafn || '').trim().toLowerCase()));
      // Respect user deletions — names tombstoned in AppSettings.sala.deleted_product_names
      // were explicitly removed and should not be re-seeded.
      const tombstoned = new Set();
      try {
        const dpn = window.AppSettings && window.AppSettings.path && window.AppSettings.path('sala.deleted_product_names');
        if (Array.isArray(dpn)) dpn.forEach(n => tombstoned.add(String(n||'').trim().toLowerCase()));
      } catch(_) {}
      const missing = AUX_PRODUCTS.filter(p => !have.has(p.nafn.toLowerCase()) && !tombstoned.has(p.nafn.toLowerCase()));
      if (!missing.length) {
        localStorage.setItem('_auxProductsSeededV1', 'all-present-' + Date.now());
        return;
      }
      const rows = missing.map(p => ({
        nafn: p.nafn, flokkur: p.flokkur, verd_an_vsk: p.verd_an_vsk,
        vsk_prosenta: 24, birgdir: 0, mynd: '', virkt: true, lysing: ''
      }));
      const ins = await DB.sb.from('vorur').insert(rows).select();
      if (ins.error) {
        console.warn('[aux-products] insert failed:', ins.error.message);
      } else {
        console.log('[aux-products] inserted ' + (ins.data || []).length + ' aux products');
        localStorage.setItem('_auxProductsSeededV1', 'seeded-' + Date.now());
      }
    } catch (e) { console.warn('[aux-products] seed exception:', e); }
  }
  seed();

  // ---------- Step 2: Sala UI — auxiliary section ----------
  let _expanded = false;
  let _injecting = false;
  let _auxLookupByName = {};
  AUX_PRODUCTS.forEach(p => { _auxLookupByName[p.nafn.trim().toLowerCase()] = p; });

  function findOriginalTile(name) {
    // Find the hidden tile in #pos-products whose product name matches.
    // Exact match preferred; fall back to startsWith to avoid substring overlap
    // (e.g. "Skilti græn lím 150x300" vs "150x150" both contain "150x").
    const grid = document.getElementById('pos-products');
    if (!grid) return null;
    const target = String(name || '').trim().toLowerCase();
    let exact = null, prefix = null;
    for (const tile of grid.querySelectorAll('.pos-prod')) {
      const txt = tile.textContent.trim().toLowerCase();
      if (!exact) {
        // Tiles include both name and price; check if name is a leading line
        const firstLine = (tile.querySelector('div')?.textContent || '').trim().toLowerCase();
        if (firstLine === target) { exact = tile; continue; }
        if (firstLine.startsWith(target) || target.startsWith(firstLine)) prefix = prefix || tile;
      }
    }
    return exact || prefix || null;
  }

  function buildAuxHtml() {
    // Group products by category
    const byCat = {};
    AUX_PRODUCTS.forEach(p => { (byCat[p.flokkur] = byCat[p.flokkur] || []).push(p); });
    const cats = Object.keys(byCat).sort((a, b) => a.localeCompare(b, 'is'));
    let html = '';
    cats.forEach(c => {
      html += '<div style="grid-column:1/-1;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:8px 0 4px">' + esc(c) + '</div>';
      byCat[c].sort((a, b) => a.nafn.localeCompare(b.nafn, 'is')).forEach(p => {
        const incVat = Math.round(p.verd_an_vsk * 1.24);
        html +=
          '<button class="_aux-tile" data-aux-name="' + esc(p.nafn) + '" type="button" ' +
            'style="padding:10px 8px;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:5px">' +
            '<div style="font-weight:600;font-size:12px;color:#0f172a;line-height:1.2;min-height:29px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(p.nafn) + '</div>' +
            '<div style="font-size:13px;color:#0f172a;font-weight:800">' + fmtKr(incVat) + '</div>' +
            '<div style="font-size:10px;color:#94a3b8">' + fmtKr(p.verd_an_vsk) + ' án vsk</div>' +
          '</button>';
      });
    });
    return html;
  }

  // Hide aux tiles in the main grid. Idempotent — safe to call repeatedly.
  // Always re-applies, because pos.js re-renders #pos-products on cart changes
  // (rerenderDynamic) and the new tiles wouldn't be hidden otherwise.
  //
  // pos.js tile structure varies — stock-chip div, icon div, image, then name div.
  // We can't rely on "first div" being the name. Instead, scan every <div> in the
  // tile and exact-match its trimmed text against the aux name lookup.
  function hideAuxTiles() {
    const productsGrid = document.getElementById('pos-products');
    if (!productsGrid) return;
    productsGrid.querySelectorAll('.pos-prod').forEach(tile => {
      if (tile.dataset._auxHidden === '1') { tile.style.display = 'none'; return; }
      let matched = false;
      for (const div of tile.querySelectorAll('div')) {
        const text = div.textContent.trim().toLowerCase();
        if (text && _auxLookupByName[text]) { matched = true; break; }
      }
      if (matched) {
        tile.style.display = 'none';
        tile.dataset._auxHidden = '1';
      }
    });
  }

  function inject() {
    if (_injecting) return;
    const productsGrid = document.getElementById('pos-products');
    if (!productsGrid) return;
    const productsCard = productsGrid.parentElement; // the white card containing "Vörur"
    if (!productsCard) return;
    // Always re-hide aux tiles (re-runs cheap; survives pos.js rerenderDynamic)
    hideAuxTiles();
    if (productsCard.querySelector('._aux-toggle')) return; // already injected
    _injecting = true;

    // Inject toggle button + collapsible section
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<button class="_aux-toggle" type="button" ' +
        'style="margin-top:14px;width:100%;background:#f1f5f9;color:#334155;border:1px dashed #cbd5e1;padding:10px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px">' +
        '📂 Aðrar Vörur' +
      '</button>' +
      '<div class="_aux-wrap" style="display:none;margin-top:10px">' +
        '<input type="search" class="_aux-search" placeholder="Leita í aukavörum..." ' +
          'style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box">' +
        '<div class="_aux-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px"></div>' +
      '</div>';
    productsCard.appendChild(wrap);

    const toggle = productsCard.querySelector('._aux-toggle');
    const auxWrap = productsCard.querySelector('._aux-wrap');
    const auxGrid = productsCard.querySelector('._aux-grid');
    const search = productsCard.querySelector('._aux-search');

    function renderGrid(filter) {
      let html;
      if (filter && filter.trim()) {
        const q = filter.trim().toLowerCase();
        const filtered = AUX_PRODUCTS.filter(p => p.nafn.toLowerCase().includes(q) || p.flokkur.toLowerCase().includes(q));
        if (!filtered.length) {
          auxGrid.innerHTML = '<div style="grid-column:1/-1;color:#94a3b8;font-size:13px;text-align:center;padding:16px">Engin niðurstaða</div>';
          return;
        }
        html = filtered.map(p => {
          const incVat = Math.round(p.verd_an_vsk * 1.24);
          return '<button class="_aux-tile" data-aux-name="' + esc(p.nafn) + '" type="button" ' +
            'style="padding:10px 8px;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:5px">' +
            '<div style="font-weight:600;font-size:12px;color:#0f172a;line-height:1.2;min-height:29px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(p.nafn) + '</div>' +
            '<div style="font-size:13px;color:#0f172a;font-weight:800">' + fmtKr(incVat) + '</div>' +
            '<div style="font-size:10px;color:#94a3b8">' + fmtKr(p.verd_an_vsk) + ' án vsk</div>' +
            '</button>';
        }).join('');
      } else {
        html = buildAuxHtml();
      }
      auxGrid.innerHTML = html;
    }

    toggle.addEventListener('click', () => {
      _expanded = !_expanded;
      auxWrap.style.display = _expanded ? '' : 'none';
      toggle.textContent = _expanded ? '📂 Fela aðrar vörur' : '📂 Aðrar Vörur';
      if (_expanded) renderGrid('');
    });
    search.addEventListener('input', e => renderGrid(e.target.value));

    auxGrid.addEventListener('click', e => {
      const btn = e.target.closest('._aux-tile');
      if (!btn) return;
      const name = btn.getAttribute('data-aux-name');
      const orig = findOriginalTile(name);
      if (orig) {
        // Trigger the existing pos.js click delegate by clicking the hidden tile
        orig.click();
        if (window.Toast && Toast.show) {
          // toast feedback so user sees something happened (since the hidden tile
          // doesn't visibly highlight)
        }
      } else {
        console.warn('[aux-products] no original tile found for:', name);
      }
    });

    _injecting = false;
  }

  function watch() {
    inject();
    new MutationObserver(() => inject()).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }

  console.log('[aux-products] installed');
})();
/* === END AUX PRODUCTS v1 === */
