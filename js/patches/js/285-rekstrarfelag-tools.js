/* === 285-rekstrarfelag-tools.js ===
 * Rekstrarfélags-haus verkfæri (á rekstrarfélags-spjaldinu, patch 175):
 *   1) 🎯 Sjálfvirkur afsláttur — allt félagið  → skrifar afslattur_pct á ALLAR
 *      kennitölur félagsins (fyrirtaeki + vidskiptavinir), sama og patch 255 en
 *      fyrir allt félagið. Sala les það sjálfkrafa (patch 255).
 *   2) 💰 Tilboðsverð — allt félagið → afritar sama tilboðslistann í
 *      company_pricing[co_id] fyrir HVERN stað félagsins (patch 113 les þau í Sölu).
 *      Yfirskrifar per-stað lista (val notanda: „overwrite all locations").
 *   3) Raðanlegir dálkar í byggingatöflunni (smellur á haus → raðar upp/niður).
 *
 * Master-gildin geymd í AppSettings: rekstrarfelag_discount[nafn],
 * rekstrarfelag_pricing[nafn]. Engar Sölu-breytingar — nýtir núverandi 255/113.
 */
(function () {
  if (window.__rfToolsInstalled) return; window.__rfToolsInstalled = true;

  function sb() { return (window.DB && DB.sb) || null; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function toast(m) { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmtKr(n) { n = +n || 0; return Math.round(n).toLocaleString('is-IS'); }
  var WALKIN = '9999999999';
  function ktPats(kts) {
    var out = {};
    kts.forEach(function (k) { k = digits(k); if (k.length === 10) { out[k] = 1; out[k.slice(0, 6) + '-' + k.slice(6)] = 1; } else if (k) { out[k] = 1; } });
    return Object.keys(out);
  }

  function injectStyles() {
    if (document.getElementById('_rft-styles')) return;
    var s = document.createElement('style'); s.id = '_rft-styles';
    s.textContent =
      '._rft-sec{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:10px 0;box-shadow:0 1px 4px rgba(30,41,59,.06)}'
      + '._rft-h{font-size:12px;font-weight:800;letter-spacing:.03em;color:#0b1f42;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
      + '._rft-h small{font-weight:600;color:#64748b;text-transform:none;letter-spacing:0}'
      + '._rft-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
      + '._rft-inp{padding:6px 9px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px}'
      + '._rft-btn{padding:6px 12px;border:none;border-radius:8px;background:#0f172a;color:#fff;font-weight:700;font-size:12.5px;cursor:pointer}'
      + '._rft-btn:disabled{opacity:.5;cursor:default}'
      + '._rft-btn.g{background:#15803d}'
      + '._rft-tbl{width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px}'
      + '._rft-tbl th,._rft-tbl td{padding:5px 7px;border-bottom:1px solid #eef2f7;text-align:left}'
      + '._rft-tbl th{color:#64748b;font-size:10.5px;text-transform:uppercase}'
      + '._rft-tbl td.n,._rft-tbl th.n{text-align:right;font-variant-numeric:tabular-nums}'
      + '._rft-x{color:#c2410c;cursor:pointer;font-weight:700;border:none;background:none;font-size:13px}'
      + '._rft-empty{color:#94a3b8;font-size:12px;padding:6px 0}'
      + '._rft-sortable{cursor:pointer;user-select:none;white-space:nowrap}'
      + '._rft-sortable:hover{filter:brightness(1.35)}'
      + '._rft-ar{opacity:.35;font-size:9px;margin-left:3px}'
      + '._rft-sortable._on ._rft-ar{opacity:1}';
    document.head.appendChild(s);
  }

  // ── félag members ────────────────────────────────────────────────────────
  function felagName() { var el = document.querySelector('span.rfa__name'); return el ? el.textContent.trim() : ''; }

  async function felagMembers() {
    var name = felagName(), s = sb();
    var coIds = {}, kts = {};
    // Scrape co-ids ONLY from the buildings-table body of THIS félag. Scanning the
    // whole document is unsafe: hidden pickers/datalists carry the entire company
    // list (~1200), which would spray the discount across every customer.
    var bt = findBuildingsTable();
    if (bt && bt.tBodies[0]) {
      [].slice.call(bt.tBodies[0].querySelectorAll('[data-co-id],[data-coid],[data-fid]')).forEach(function (el) {
        var id = el.getAttribute('data-co-id') || el.getAttribute('data-coid') || el.getAttribute('data-fid');
        if (id) coIds[String(id)] = 1;
      });
    }
    var byId = {}; ((window.Companies && Companies.list) || []).forEach(function (c) { byId[String(c.id)] = c; });
    Object.keys(coIds).forEach(function (id) { var c = byId[id]; if (c && c.kennitala) kts[digits(c.kennitala)] = 1; });
    if (name && s) {
      try {
        var b = await s.from('customers_base').select('id,kennitala').eq('rekstrarfelag', name);
        var bases = (b && b.data) || [];
        var baseIds = bases.map(function (x) { return x.id; });
        bases.forEach(function (x) { if (x.kennitala) kts[digits(x.kennitala)] = 1; });
        if (baseIds.length) {
          var f = await s.from('fyrirtaeki').select('id,kennitala').in('customer_base_id', baseIds);
          ((f && f.data) || []).forEach(function (x) { coIds[String(x.id)] = 1; if (x.kennitala) kts[digits(x.kennitala)] = 1; });
        }
      } catch (e) {}
    }
    delete kts[WALKIN]; delete kts[''];
    return { name: name, coIds: Object.keys(coIds), kts: Object.keys(kts).filter(Boolean) };
  }

  // ── AppSettings helpers ──────────────────────────────────────────────────
  function apGet(key) { try { return (window.AppSettings && AppSettings.path && AppSettings.path(key)) || {}; } catch (e) { return {}; } }
  async function apSave(obj) { try { if (window.AppSettings && AppSettings.save) return await AppSettings.save(obj); } catch (e) {} return false; }
  function priceListFor(name) { var m = apGet('rekstrarfelag_pricing'); return Array.isArray(m[name]) ? m[name] : []; }
  function discountFor(name) { var m = apGet('rekstrarfelag_discount'); return (name in m) ? m[name] : ''; }

  // ── pricing section ──────────────────────────────────────────────────────
  function buildPricingSection() {
    var name = felagName(), disc = discountFor(name), list = priceListFor(name);
    var sec = document.createElement('div'); sec.className = '_rft-wrap';
    sec.innerHTML =
      '<div class="_rft-sec">'
      + '<div class="_rft-h">🎯 Sjálfvirkur afsláttur — allt félagið <small>gildir sjálfkrafa á alla staði félagsins í Sölu</small></div>'
      + '<div class="_rft-row">'
      + '<input class="_rft-inp _rft-disc-in" type="number" min="0" max="100" step="1" style="width:80px" placeholder="0" value="' + (disc === '' ? '' : esc(disc)) + '"><span>%</span>'
      + '<button class="_rft-btn _rft-disc-save" type="button">Vista afslátt</button>'
      + '<span class="_rft-disc-msg" style="color:#64748b;font-size:12px"></span>'
      + '</div></div>'
      + '<div class="_rft-sec">'
      + '<div class="_rft-h">💰 Tilboðsverð — allt félagið <small>sérverð sem yfirstíga búðarverð í Sölu, á öllum stöðum</small></div>'
      + '<div class="_rft-row" style="margin-bottom:6px">'
      + '<input class="_rft-inp _rft-p-name" placeholder="Vara / þjónusta (t.d. Hleðsla)" style="flex:2;min-width:150px">'
      + '<input class="_rft-inp _rft-p-price n" type="number" placeholder="Verð án VSK" style="width:120px">'
      + '<input class="_rft-inp _rft-p-vsk n" type="number" placeholder="VSK%" value="24" style="width:64px">'
      + '<input class="_rft-inp _rft-p-note" placeholder="Athugasemd" style="flex:1;min-width:110px">'
      + '<button class="_rft-btn g _rft-p-add" type="button">+ Bæta við</button>'
      + '</div><div class="_rft-p-body"></div></div>';
    renderPriceBody(sec.querySelector('._rft-p-body'), list);
    wirePricing(sec);
    return sec;
  }

  function renderPriceBody(body, list) {
    if (!list.length) { body.innerHTML = '<div class="_rft-empty">Engin tilboðsverð skráð — bættu við hér að ofan.</div>'; return; }
    body.innerHTML = '<table class="_rft-tbl"><thead><tr><th>Vara / þjónusta</th><th class="n">Verð án VSK</th><th class="n">VSK%</th><th>Athugasemd</th><th></th></tr></thead><tbody>'
      + list.map(function (p, i) {
        return '<tr><td>' + esc(p.name) + '</td><td class="n">' + fmtKr(p.price_ex_vat) + ' kr</td><td class="n">' + esc(p.vsk_pct) + '</td><td>' + esc(p.notes || '') + '</td><td><button class="_rft-x" data-i="' + i + '" type="button">✕</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function wirePricing(sec) {
    sec.querySelector('._rft-disc-save').addEventListener('click', async function () {
      var btn = this, inp = sec.querySelector('._rft-disc-in'), msg = sec.querySelector('._rft-disc-msg');
      var v = Math.max(0, Math.min(100, parseFloat(inp.value) || 0));
      btn.disabled = true; msg.textContent = 'Vista…';
      var m = await felagMembers();
      if (!m.kts.length) { msg.textContent = '⚠ Engar kennitölur fundust'; btn.disabled = false; return; }
      var pats = ktPats(m.kts), s = sb();
      try {
        await s.from('fyrirtaeki').update({ afslattur_pct: v }).in('kennitala', pats);
        await s.from('vidskiptavinir').update({ afslattur_pct: v }).in('kennitala', pats);
        var disc = Object.assign({}, apGet('rekstrarfelag_discount')); disc[m.name] = v; await apSave({ rekstrarfelag_discount: disc });
        ((window.Companies && Companies.list) || []).forEach(function (c) { if (pats.indexOf(digits(c.kennitala)) >= 0 || pats.indexOf(c.kennitala) >= 0) c.afslattur_pct = v; });
        msg.textContent = '✓ Vistað'; toast('🎯 Afsláttur ' + v + '% á alla staði (' + m.kts.length + ' kt).');
      } catch (e) { msg.textContent = '⚠ Villa: ' + (e.message || e); }
      btn.disabled = false;
    });
    sec.querySelector('._rft-p-add').addEventListener('click', async function () {
      var nm = sec.querySelector('._rft-p-name').value.trim();
      var price = parseFloat(sec.querySelector('._rft-p-price').value);
      var vsk = parseFloat(sec.querySelector('._rft-p-vsk').value);
      var note = sec.querySelector('._rft-p-note').value.trim();
      if (!nm || !Number.isFinite(price)) { toast('⚠ Vantar vöru og verð'); return; }
      var item = { id: 'rf' + Date.now() + Math.floor(Math.random() * 1000), name: nm, price_ex_vat: price, vsk_pct: Number.isFinite(vsk) ? vsk : 24, notes: note };
      var fn = felagName(), list = priceListFor(fn).slice(); list.push(item);
      await savePricing(fn, list);
      sec.querySelector('._rft-p-name').value = ''; sec.querySelector('._rft-p-price').value = ''; sec.querySelector('._rft-p-note').value = '';
      renderPriceBody(sec.querySelector('._rft-p-body'), list);
    });
    sec.querySelector('._rft-p-body').addEventListener('click', async function (e) {
      var x = e.target.closest('._rft-x'); if (!x) return;
      var i = +x.getAttribute('data-i'), fn = felagName(), list = priceListFor(fn).slice(); list.splice(i, 1);
      await savePricing(fn, list);
      renderPriceBody(sec.querySelector('._rft-p-body'), list);
    });
  }

  async function savePricing(name, list) {
    var m = await felagMembers();
    var cp = Object.assign({}, apGet('company_pricing'));
    m.coIds.forEach(function (id) { cp[id] = list; });
    var rfp = Object.assign({}, apGet('rekstrarfelag_pricing')); rfp[name] = list;
    await apSave({ company_pricing: cp, rekstrarfelag_pricing: rfp });
    toast(list.length ? ('💰 ' + list.length + ' tilboðsverð á alla staði (' + m.coIds.length + ').') : 'Tilboðsverð hreinsuð.');
  }

  // ── buildings table sort ─────────────────────────────────────────────────
  function findBuildingsTable() {
    var tables = [].slice.call(document.querySelectorAll('table'));
    return tables.find(function (t) { return /BYGGING/i.test(t.textContent) && /KENNITALA/i.test(t.textContent); });
  }
  function decorateSort() {
    var t = findBuildingsTable();
    if (!t || t.__rftSort || !t.tHead || !t.tBodies[0]) return;
    var bodyCols = (t.tBodies[0].rows[0] && t.tBodies[0].rows[0].children.length) || 0;
    if (!bodyCols) return;
    var headRows = [].slice.call(t.tHead.rows);
    var headRow = headRows.filter(function (r) { return r.children.length === bodyCols; }).pop() || headRows[headRows.length - 1];
    if (!headRow) return;
    t.__rftSort = true;
    [].slice.call(headRow.children).forEach(function (th, ci) {
      if (!th.textContent.trim()) return;
      th.classList.add('_rft-sortable');
      if (!th.querySelector('._rft-ar')) { var a = document.createElement('span'); a.className = '_rft-ar'; a.textContent = '↕'; th.appendChild(a); }
      th.addEventListener('click', function () {
        var asc = t.__sortCol === ci ? !t.__sortAsc : true;
        t.__sortCol = ci; t.__sortAsc = asc;
        [].slice.call(headRow.children).forEach(function (h) { h.classList.remove('_on'); var ar = h.querySelector('._rft-ar'); if (ar) ar.textContent = '↕'; });
        th.classList.add('_on'); var ar = th.querySelector('._rft-ar'); if (ar) ar.textContent = asc ? '▲' : '▼';
        sortRows(t, ci, asc);
      });
    });
  }
  function cellVal(tr, ci) { var td = tr.children[ci]; return td ? (td.innerText || td.textContent || '').trim() : ''; }
  function sortRows(t, ci, asc) {
    var tb = t.tBodies[0]; if (!tb) return;
    var rows = [].slice.call(tb.rows).filter(function (r) { return r.children.length > ci; });
    var real = rows.filter(function (r) { return !/Engin bygging|passar við/i.test(r.textContent); });
    var filler = rows.filter(function (r) { return /Engin bygging|passar við/i.test(r.textContent); });
    function num(v) { var m = String(v).replace(/\./g, '').match(/-?\d+(?:,\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; }
    function dt(v) { var m = String(v).match(/\d{4}-\d{2}-\d{2}/); return m ? m[0] : null; }
    function hasAlpha(v) { return /[A-Za-zÀ-ÿ]/.test(v); }
    real.sort(function (a, b) {
      var va = cellVal(a, ci), vb = cellVal(b, ci);
      var da = dt(va), db = dt(vb);
      if (da || db) { da = da || ''; db = db || ''; return asc ? da.localeCompare(db) : db.localeCompare(da); }
      if (!hasAlpha(va) && !hasAlpha(vb)) {
        var na = num(va), nb = num(vb);
        if (na !== null && nb !== null) return asc ? na - nb : nb - na;
        if (na !== null) return -1;
        if (nb !== null) return 1;
      }
      return asc ? va.localeCompare(vb, 'is') : vb.localeCompare(va, 'is');
    });
    real.forEach(function (r) { tb.appendChild(r); });
    filler.forEach(function (r) { tb.appendChild(r); });
  }

  // ── inject / observe ─────────────────────────────────────────────────────
  function tick() {
    injectStyles();
    var host = document.querySelector('._rf_body');
    if (host && document.querySelector('span.rfa__name') && !host.querySelector('._rft-wrap')) {
      var wrap = buildPricingSection();
      var info = host.querySelector('._rf_info');
      if (info) info.insertAdjacentElement('afterend', wrap); else host.appendChild(wrap);
    }
    decorateSort();
  }
  var raf = null;
  var obs = new MutationObserver(function () { if (raf) return; raf = setTimeout(function () { raf = null; try { tick(); } catch (e) {} }, 250); });
  function start() { try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {} tick(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  console.log('[patch-285] 🎯Rekstrarfélags-verkfæri: afsláttur + tilboðsverð (allt félagið) + raðanlegir dálkar');
})();
