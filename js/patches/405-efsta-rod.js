/* === 405 · Efsta aðgerðaröðin og Samskipta-hausinn eins og hönnunin C (23.09.2026) ===
 *
 * 1) Efsta röð fyrirtækjasíðunnar: Til baka · stöðuplata (Í þjónustu / Úr þjónustu) · … · Breyta · ⋯.
 *    Hnapparnir sem 160 (🗑 Eyða), 280 (Taka úr/Setja í þjónustu) og 281 (NÝTT) hengja við hlið Breyta
 *    FÆRAST inn í ⋯-valmynd sem liði sem smella á þá (hnappurinn sjálfur situr inni í liðnum, ósýnilegur en
 *    í DOM). Valmyndin er barn sömu raðar (editBtn.parentElement), svo tilvistarpróf þessara patcha
 *    (actionsRow.querySelector('._co-delete') o.s.frv.) finna hnappana áfram og bæta þeim ekki við tvisvar.
 *    Breyta stendur eftir sýnilegur — hann er akkerið sem 160/280/281 og 91 leita að.
 *
 * 2) Samskipta-hausinn (286): Playfair-talning „N póstar síðustu 12 mánuði" lesin úr flísinni sem 286 teiknar.
 *    286 endurbyggir spjaldið við hverja teikningu → talningin er sett inn aftur af vaktinni (eins og 359 gerir).
 *
 * Engin gögn sótt, enginn handler skrifaður. Gildissvið: Brunastál, tölva.
 */
(function () {
  if (window.__efsta405) return;
  window.__efsta405 = true;

  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var DOTS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  function svg(d) { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var ICON = { trash: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>'), power: svg('<path d="M18.4 6.6a9 9 0 1 1-12.8 0"/><path d="M12 2v10"/>'), star: svg('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>') };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function stripEmoji(s) { return String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}✅❌⬆⬇️]/gu, '').replace(/^[\s·]+|[\s·]+$/g, '').trim(); }
  function scope() { var h = document.documentElement; return h.getAttribute('data-thm-preset') === 'brunastal' && h.getAttribute('data-viewmode') !== 'mobile' && !h.classList.contains('slokk-phone-dev') && !document.body.classList.contains('appmode'); }

  function closeAll() {
    document.querySelectorAll('.b405-menu:not([hidden])').forEach(function (m) { m.hidden = true; });
    document.querySelectorAll('.b405-meira.opin').forEach(function (b) { b.classList.remove('opin'); b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.b405-vm')) closeAll(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  window.addEventListener('scroll', closeAll, true);

  var ITEMS = [
    { sel: '._co-nytt-toggle', icon: ICON.star },
    { sel: '._co-svc-toggle', icon: ICON.power },
    { sel: '._co-delete', icon: ICON.trash, danger: true }
  ];

  function labelFor(orig) { var t = stripEmoji(txt(orig)); return t.charAt(0).toUpperCase() + t.slice(1); }

  function ensureMenu(row) {
    var vm = row.querySelector(':scope > .b405-vm');
    if (!vm) {
      vm = el('span', 'b405-vm');
      var btn = el('button', 'b405-meira', DOTS); btn.type = 'button'; btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Fleiri aðgerðir'); btn.title = 'Fleiri aðgerðir';
      var menu = el('div', 'b405-menu'); menu.setAttribute('role', 'menu'); menu.hidden = true;
      vm.appendChild(btn); vm.appendChild(menu);
      btn.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var open = !menu.hidden; closeAll();
        if (open) return;
        // merkimiðar lifandi: 280 breytir texta hnappsins eftir stöðu
        Array.prototype.slice.call(menu.querySelectorAll('.b405-mi')).forEach(function (mi) { var o = mi.querySelector('.b405-orig'); if (o) mi.querySelector('span').textContent = labelFor(o); });
        menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.classList.add('opin');
        var r = btn.getBoundingClientRect(); menu.style.top = (r.bottom + 4) + 'px'; menu.style.left = Math.max(8, r.right - menu.offsetWidth) + 'px';
      });
      row.appendChild(vm);
    }
    var menu = vm.querySelector('.b405-menu');
    ITEMS.forEach(function (it) {
      var orig = row.querySelector(':scope > ' + it.sel);
      if (!orig) return; // ekki komið enn (160/280/281 hengja async) — vaktin kallar aftur
      var mi = el('button', 'b405-mi' + (it.danger ? ' eyda' : '')); mi.type = 'button'; mi.setAttribute('role', 'menuitem');
      mi.innerHTML = (it.icon || '') + '<span>' + labelFor(orig) + '</span>';
      orig.classList.add('b405-orig'); mi.appendChild(orig);
      mi.addEventListener('click', function (ev) { if (orig === ev.target || orig.contains(ev.target)) return; ev.preventDefault(); ev.stopPropagation(); closeAll(); orig.click(); });
      if (it.danger && menu.children.length) menu.appendChild(el('div', 'b405-skil'));
      menu.appendChild(mi);
    });
  }

  function ensurePlate(main, row) {
    var top = row.parentElement; if (!top || top.parentElement !== main) return;
    var svc = row.querySelector('._co-svc-toggle'); if (!svc) return;
    var inSvc = svc.dataset.inservice !== '0';
    var pl = top.querySelector(':scope > .b405-plata');
    if (!pl) { pl = el('span', 'b405-plata'); var back = top.firstElementChild; if (back && back.nextSibling) top.insertBefore(pl, back.nextSibling); else top.appendChild(pl); }
    var want = inSvc ? 'ok' : 'stal', label = inSvc ? 'Í þjónustu' : 'Úr þjónustu';
    if (pl.dataset.st !== want) { pl.dataset.st = want; pl.innerHTML = '<i class="' + want + '"></i>' + label; }
  }

  function ensureSamskipti(main) {
    var head = main.querySelector('._samskipti-card ._skx-head'); if (!head || head.querySelector('.b405-talning')) return;
    var tiles = Array.prototype.slice.call(main.querySelectorAll('._samskipti-card ._skx-tile'));
    var t = tiles.filter(function (x) { return /12 mán/i.test(txt(x.querySelector('b'))); })[0];
    var v = t ? txt(t.querySelector('span')) : '';
    var m = v.match(/^(\d+)\s*(.*)$/); if (!m) return;
    var box = el('div', 'b405-talning', '<span class="tala">' + m[1] + '</span><span class="tlabel">' + (m[2] || 'póstar') + ' síðustu 12 mánuði</span>');
    var title = head.querySelector('._skx-title');
    if (title) title.insertAdjacentElement('afterend', box); else head.insertBefore(box, head.firstChild);
  }

  // 3) Fyrirtækjaspjaldið (hönnun C): staðreyndalínurnar (heimilisfang/sími/netfang, fyrirtækjaskrá, skýrslu-samantekt)
  //    færast úr málmhausnum í hvítar línur vinstra megin við loftmyndina. features.js setur .co-banner-skra og
  //    .co-banner-skyrsla inn ASYNC á eftir .co-banner-facts — lendi þær í hausnum eftir á færir vaktin þær hingað.
  function ensureBanner(main) {
    var banner = main.querySelector('.co-banner'); if (!banner) return;
    var box = banner.querySelector(':scope > .b405-facts');
    var parts = ['.co-banner-facts', '.co-banner-skra', '.co-banner-skyrsla'];
    var any = parts.some(function (sel) { var e = banner.querySelector(sel); return e && (!box || !box.contains(e)); });
    if (!any) return;
    if (!box) { box = el('div', 'b405-facts'); var mynd = banner.querySelector(':scope > .co-mynd'); if (mynd) banner.insertBefore(box, mynd); else banner.appendChild(box); }
    parts.forEach(function (sel) { var e = banner.querySelector(sel); if (e && !box.contains(e)) box.appendChild(e); });
  }
  var timer = null;
  function tick() {
    if (!scope()) return;
    var main = document.getElementById('companies-main'); if (!main || !main.querySelector('.co-banner')) return;
    try {
      var editBtn = main.querySelector('button[onclick^="Companies.openEdit"]');
      var row = editBtn && editBtn.parentElement;
      if (row && row.parentElement && row.parentElement.parentElement === main) { row.classList.add('b405-rod'); ensureMenu(row); ensurePlate(main, row); }
      ensureSamskipti(main);
      ensureBanner(main);
    } catch (err) { console.error('[405]', err); }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(tick, 0); }
  (function watch() {
    var main = document.getElementById('companies-main'); if (!main) { setTimeout(watch, 700); return; }
    new MutationObserver(function (recs) { for (var i = 0; i < recs.length; i++) { var t = recs[i].target; if (t && t.closest && t.closest('.b405-menu')) continue; schedule(); return; } }).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-inservice'] });
    setInterval(tick, 1500);
    schedule();
  })();

  if (!document.getElementById('efsta-405')) {
    var P = 'html[data-thm-preset="brunastal"] #companies-main ';
    function r(sel, css) { return sel.split(',').map(function (s) { return P + s.trim(); }).join(',') + '{' + css + '}'; }
    var css = [
      r('.b405-orig', 'position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;opacity:0!important;margin:0!important;padding:0!important;border:0!important;pointer-events:none'),
      r('.b405-rod', 'display:flex;gap:8px;align-items:center'),
      r('.b405-plata', 'display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:3px;border:1px solid #000;background:' + METAL_BTN + ';color:#eef1f4;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);margin-left:4px'),
      r('.b405-plata i', 'width:6px;height:6px;border-radius:50%;display:inline-block;background:#8f98a8'), r('.b405-plata i.ok', 'background:#3cc47c;box-shadow:0 0 8px rgba(60,196,124,.8)'),
      r('.b405-vm', 'position:relative;display:inline-flex'),
      r('.b405-meira', 'all:unset;cursor:pointer;width:40px;height:40px;border-radius:9px;border:1px solid #000;background:' + METAL_BTN + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box'),
      r('.b405-meira.opin', 'background:' + SILVER + ';color:#11141c'),
      r('.b405-menu', 'position:fixed;z-index:7900;min-width:220px;background:#fff;border:1px solid rgba(20,24,34,.12);border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);padding:6px;display:flex;flex-direction:column;gap:2px'),
      r('.b405-mi', 'all:unset;cursor:pointer;height:40px;border-radius:8px;padding:0 10px;display:flex;align-items:center;gap:10px;font-family:' + SANS + ';font-size:13.5px;font-weight:500;color:#1f2530;position:relative;box-sizing:border-box'),
      r('.b405-mi svg', 'color:#5b6472;flex:none'), r('.b405-mi:hover', 'background:#f1f4f8'), r('.b405-mi.eyda', 'color:#b42318;font-weight:600'), r('.b405-mi.eyda svg', 'color:#b42318'),
      r('.b405-skil', 'height:1px;background:#eceff3;margin:4px 6px'),
      r('._samskipti-card ._skx-head', 'flex-wrap:wrap;row-gap:4px'),
      r('.b405-talning', 'display:flex;align-items:baseline;gap:10px;flex-basis:100%;order:1;margin-top:2px'),
      r('.b405-talning .tala', 'font-family:' + DISPLAY + ';font-size:38px;font-weight:800;line-height:1;letter-spacing:-.02em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
      r('.b405-talning .tlabel', 'font-family:' + DISPLAY + ';font-size:16px;font-weight:700;color:#d9dee6'),
      r('._samskipti-card ._skx-head ._skx-acts', 'order:0;margin-left:auto')
    ].join('\n');
    css += '\n' + P + '.b405-menu[hidden]{display:none!important}'; // [hidden] vinnur display:flex
    var st = document.createElement('style'); st.id = 'efsta-405'; st.textContent = css; document.head.appendChild(st);
  }
})();
