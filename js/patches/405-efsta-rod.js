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

  // 30.09.2026 (Agnar, skjámynd með örvum: „má færa 2 takkana og taka burtu þetta staða-yfirlit"): skoðunarmánuðurinn
  // (.co-banner-badge úr borðanum, features.js) og ☆ Merkja mikilvægt (._smx-imp úr samskiptaspjaldinu, 359) FÆRAST upp í
  // efstu röðina — sami hnútur, sami hlustari; 359 endurteiknar sinn hnapp → nýi kemur í stað þess gamla svo aldrei tveir.
  // „Staða — yfirlit" (185, #_isy-btnbar) er falin með CSS meðan fyrirtækjasíða er opin.
  function ensureFaera(main, row) {
    var top = row.parentElement; if (!top || top.parentElement !== main) return;
    var badge = main.querySelector('.co-banner-badge');
    if (badge && badge.parentElement !== top) {
      var t = stripEmoji(txt(badge)).replace(/^Skoðun:\s*/i, '');
      badge.classList.add('b405-plata', 'b405-skodun'); badge.innerHTML = '<i class="gull"></i>Skoðun: ' + t;
      var pl = top.querySelector(':scope > .b405-plata:not(.b405-skodun)');
      if (pl) top.insertBefore(badge, pl.nextSibling); else top.insertBefore(badge, row);
    }
    // 30.09 18:3x: takkinn sem Agnar benti á er ⚠ Merkja mikilvægt úr 91 (._imp-toggle, sat í aðgerðaröðinni undir
    // borðanum) — ekki ☆ úr samskiptakortinu (359), sá stendur áfram þar. 91 teiknar sinn hnapp einu sinni (dataset-vörður).
    // B36 (Agnar 30.09: „Póstafrit er frekar eitthvað sem ætti að vera efst á profile sem bara check mark"): 199 teiknar
    // rofann í haus Skjöl og viðhengi (og aftur við hverja endurteikningu) — nýjasti hnúturinn færist upp, eldri afrit fjarlægð.
    var postar = Array.prototype.slice.call(main.querySelectorAll('.sk-mailpref'));
    var ferskur = postar.filter(function (b) { return b.parentElement !== top; })[0];
    if (ferskur) { postar.forEach(function (b) { if (b !== ferskur && b.parentElement === top) b.remove(); }); ferskur.classList.add('b405-post'); var eftir = top.querySelector(':scope > .b405-skodun') || top.querySelector(':scope > .b405-plata'); if (eftir && eftir.nextSibling) top.insertBefore(ferskur, eftir.nextSibling); else top.insertBefore(ferskur, row); }
    var post = top.querySelector(':scope > .sk-mailpref');
    if (post) { var off = post.dataset.off === '1' || /AF\b/.test(post.textContent || ''); var vil = '<i class="' + (off ? 'stal' : 'ok') + '"></i>Póstafrit ' + (off ? '✕' : '✓'); if (post.innerHTML !== vil) post.innerHTML = vil; post.title = off ? 'Póstafrit slökkt — aðeins rafræn krafa. Smelltu til að kveikja.' : 'Póstafrit kveikt — rafrænt + tölvupóstur. Smelltu til að slökkva.'; }
    var imp = main.querySelector('._imp-toggle');
    if (imp && imp.parentElement !== row) { imp.classList.add('b405-imp'); row.insertBefore(imp, row.firstChild); }
    // 01.10.2026 (B44): aðeins EINN ⚠-hnappur — sá í efstu röðinni; afrit sem 91 bjó til annars staðar fara.
    Array.prototype.slice.call(main.querySelectorAll('._imp-toggle')).forEach(function (b) { if (b.parentElement !== row && row.querySelector('._imp-toggle')) b.remove(); });
  }
  // ── B27 (Agnar 30.09: „færa þennan bara í tákn á Teikningum í efri hluta sem bara collapsed default, en hægt að expanda") ──
  // Teikningarborðinn (#co-fp-section, newfeatures/109/362) og Viðbóta upplýsingar (#vbu-section, vbu.js) sitja undir
  // miðjunni og taka pláss þótt erindið komi teikningunni ekki við. Nú eru þau FALIN sjálfgefið og opnast með litlum
  // takka við hlið „Teikning" í borðanum; valið er munað í localStorage (teikning_syna) — útlitsval, ekki gagnastaða.
  // Falið = hæð 0 + overflow hidden (EKKI display:none — breiddin þarf að mælast fyrir grunnkvarða myndarinnar, sjá 362).
  var FP_LYKILL = 'teikning_syna';
  function fpOpid() { try { return localStorage.getItem(FP_LYKILL) === '1'; } catch (_) { return false; } }
  function fpSetja(v) { try { v ? localStorage.setItem(FP_LYKILL, '1') : localStorage.removeItem(FP_LYKILL); } catch (_) {} }
  function fpEndurmaela() { try { window.dispatchEvent(new Event('resize')); } catch (_) {} setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (_) {} }, 350); }
  function ensureTeikning(main) {
    var sec = document.getElementById('co-fp-section');
    var knappar = main.querySelector('.b405-knappar');
    var opid = fpOpid();
    main.classList.toggle('b405-fp-open', opid);
    if (!knappar) return;
    var t = knappar.querySelector('#b405-fpt');
    if (!sec) { if (t) t.remove(); return; }
    var hdr = sec.querySelector('span'); var m = hdr && String(hdr.textContent || '').match(/(\d+)\s*sta/i);
    var n = m ? m[1] : '';
    var CHEV = svg('<path d="m6 9 6 6 6-6"/>');
    var label = opid ? (CHEV + 'Fela teikningu') : (CHEV + 'Teikning' + (n ? ' · ' + n : ''));
    if (!t) {
      t = el('button', 'b405-fpt', label); t.id = 'b405-fpt'; t.type = 'button'; t.title = 'Sýna eða fela teikninguna og viðbótaupplýsingar';
      t.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var nu = !fpOpid(); fpSetja(nu); main.classList.toggle('b405-fp-open', nu);
        if (nu) {
          // 362 gæti hafa fellt borðann sjálfan saman (teikning_fellt) — opna hann líka, annars stendur hausinn einn eftir
          try { if (localStorage.getItem('teikning_fellt') === '1') { var b = document.getElementById('_tf-btn'); if (b) b.click(); } } catch (_) {}
          requestAnimationFrame(fpEndurmaela);
          var s2 = document.getElementById('co-fp-section'); if (s2) setTimeout(function () { s2.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
        }
        ensureTeikning(main);
      });
      var teikn = Array.prototype.slice.call(knappar.querySelectorAll('button')).filter(function (b) { return /FloorPlan\./.test(b.getAttribute('onclick') || ''); })[0];
      if (teikn && teikn.nextSibling) knappar.insertBefore(t, teikn.nextSibling); else knappar.appendChild(t);
    } else if (t.innerHTML !== label) t.innerHTML = label;
    t.classList.toggle('opin', opid);
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
    var parts = ['.co-banner-facts', '.co-banner-skra'];
    // Skýrslu-samantektin („Skýrsla 2025: 12× Léttvatn …" + allt í lagi) stendur hægra megin í málmhausnum (hönnun C)
    var sky = banner.querySelector('.co-banner-skyrsla'); var idb = banner.querySelector(':scope > .co-banner-id');
    if (sky && idb && sky.parentElement !== idb) { sky.classList.add('b405-sky'); idb.appendChild(sky); }
    // Teikning · Þjónustusamningur undir loftmyndinni (hönnun C) — inline onclick, virka hvar sem er; 91/370 nota röðina áfram
    var knappar = banner.querySelector(':scope > .b405-knappar');
    var kand = Array.prototype.slice.call(main.querySelectorAll('div[data-co-id] > button[onclick]')).filter(function (b) { return /DocTemplates\.openForCompany|FloorPlan\./.test(b.getAttribute('onclick') || ''); });
    if (kand.length) { if (!knappar) { knappar = el('div', 'b405-knappar'); banner.appendChild(knappar); } kand.forEach(function (b) { if (b.parentElement !== knappar) { b.classList.add('b405-knappur'); knappar.appendChild(b); } }); }
    var any = parts.some(function (sel) { var e = banner.querySelector(sel); return e && (!box || !box.contains(e)); });
    if (!any && !box) return;
    if (!box) { box = el('div', 'b405-facts'); var mynd = banner.querySelector(':scope > .co-mynd'); if (mynd) banner.insertBefore(box, mynd); else banner.appendChild(box); }
    if (any) parts.forEach(function (sel) { var e = banner.querySelector(sel); if (e && !box.contains(e)) box.appendChild(e); });
    // (textinn í .co-banner-skra kemur ASYNC eftir færsluna — því er hreinsað í hverju tifi, ódýrt)
    // emoji-tákn í textanum (📍 📞 ✉ 🏛 📋) víkja — hönnunin merkir línurnar með orðum; aðeins textahnútar snertir
    var n; var tn = []; [box, sky].filter(Boolean).forEach(function (rt) { var w = document.createTreeWalker(rt, NodeFilter.SHOW_TEXT); while ((n = w.nextNode())) tn.push(n); });
    tn.forEach(function (x) { var v = x.nodeValue; var y = v.replace(/[🀀-🫿⌀-⏿☀-➿️]/gu, '').replace(/^\s+/, ''); if (y !== v) x.nodeValue = y; }); // (/^s+/ át „ss" úr ss@ss.is — 23.09 19:10)
  }
  // 4) Miðjan (386-flipar, 274-vinnusíða, 386-blað): emoji-tákn í hausum, flipum og tökkum víkja — hönnunin merkir með orðum.
  //    Aðeins textahnútar snertir; ▾ · × ＋ eru ekki emoji og standa. Handlerar (closest('._sks-tab'), data-*) ósnertir.
  var MIDJA_SEL = '.b405-knappur,#_sks-tabs ._sks-tab,#_sks-host ._sks-hd h2,#_sks-host .khd b,#_sks-host ._sks-btn,#_sks-bru ._bkc-herot,#_sks-bru ._bkc-lbl,#_sks-bru ._bkc-ch,#_sks-bru ._bkc-act,#_sks-bru ._bkc-new,#_sks-bru #_bkr-link';
  function ensureMidja(main) {
    var els = main.querySelectorAll(MIDJA_SEL); if (!els.length) return;
    for (var i = 0; i < els.length; i++) {
      var w = document.createTreeWalker(els[i], NodeFilter.SHOW_TEXT), n, tn = [];
      while ((n = w.nextNode())) tn.push(n);
      tn.forEach(function (x) { var v = x.nodeValue; var y = v.replace(/[🀀-🫿⌀-⏿☀-➿️]/gu, '').replace(/^\s+/, ''); if (y !== v) x.nodeValue = y; });
    }
  }
  var timer = null;
  function tick() {
    if (!scope()) return;
    var main = document.getElementById('companies-main'); if (!main || !main.querySelector('.co-banner')) return;
    try {
      var editBtn = main.querySelector('button[onclick^="Companies.openEdit"]');
      var row = editBtn && editBtn.parentElement;
      if (row && row.parentElement && row.parentElement.parentElement === main) { row.classList.add('b405-rod'); ensureMenu(row); ensurePlate(main, row); ensureFaera(main, row); }
      ensureSamskipti(main);
      ensureBanner(main);
      ensureTeikning(main);
      ensureMidja(main);
    } catch (err) { console.error('[405]', err); }
  }
  // 25.09.2026 (hopp): setTimeout(tick, 0) lenti EFTIR málun — vaktin (252) skilar sér í rAF, svo hrái ramminn
  // (takkaröðin óuppröðuð, 32→40 px) sást í einn ramma og allt fyrir neðan hoppaði. Sama tif, eins og 404.
  function schedule() { if (schedule.inni) return; schedule.inni = true; try { tick(); } finally { schedule.inni = false; } }
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
      r('.b405-rod ~ ._samskipti-host,.b405-rod ~ ._co-mail-box', 'flex:0 0 100%!important;width:100%!important;order:9'),
      r('.b405-plata', 'display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:3px;border:1px solid #000;background:' + METAL_BTN + ';color:#eef1f4;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);margin-left:4px'),
      r('.b405-plata i', 'width:6px;height:6px;border-radius:50%;display:inline-block;background:#8f98a8'), r('.b405-plata i.ok', 'background:#3cc47c;box-shadow:0 0 8px rgba(60,196,124,.8)'),       r('.b405-plata i.gull', 'background:#e0a93e;box-shadow:0 0 8px rgba(224,169,62,.8)'),
      r('.b405-post', 'cursor:pointer;display:inline-flex!important;align-items:center;gap:6px;height:26px!important;padding:0 10px!important;border-radius:3px!important;border:1px solid #000!important;background:' + METAL_BTN + '!important;color:#eef1f4!important;font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.06em;text-transform:uppercase;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)!important;white-space:nowrap;line-height:1;margin:0!important'),
      r('.b405-post i', 'width:6px;height:6px;border-radius:50%;display:inline-block;background:#8f98a8'), r('.b405-post i.ok', 'background:#3cc47c;box-shadow:0 0 8px rgba(60,196,124,.8)'),
      r('.b405-skodun.co-banner-badge', 'height:26px!important;padding:0 10px!important;border-radius:3px!important;border:1px solid #000!important;background:' + METAL_BTN + '!important;color:#eef1f4!important;font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)!important;margin:0!important;align-self:center!important'),
      r('.b405-rod ._imp-toggle', 'cursor:pointer;height:40px!important;padding:0 14px!important;border-radius:9px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;color:#1f2530!important;font-family:' + SANS + '!important;font-size:13px!important;font-weight:600!important;display:inline-flex!important;align-items:center;gap:7px;white-space:nowrap;box-sizing:border-box;margin:0!important'),
      r('.b405-rod ._imp-toggle[style*="fef3c7"]', 'background:linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)!important;border-color:rgba(190,150,60,.5)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
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
    // B27: teikningin og viðbótaupplýsingar falin þar til opnað er úr borðanum (hæð 0, breidd mælanleg)
    css += '\nhtml[data-thm-preset="brunastal"] #companies-main:not(.b405-fp-open) #co-fp-section{height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;opacity:0;pointer-events:none}';
    css += '\nhtml[data-thm-preset="brunastal"] #companies-main:not(.b405-fp-open) #vbu-section{display:none!important}';
    css += '\n' + P + '.b405-fpt{flex:0 0 auto!important;height:40px;padding:0 12px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);color:#1f2530;font-family:' + SANS + ';font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}';
    css += '\n' + P + '.b405-fpt.opin{background:' + METAL_BTN + ';border-color:#000;color:#eef1f4}' + P + '.b405-fpt.opin svg{transform:rotate(180deg)}';
    css += '\nhtml[data-thm-preset="brunastal"] #_isy-btnbar:has(+ #companies-main .co-banner){display:none!important}'; // Staða — yfirlit (185) víkur á fyrirtækjasíðunni
    var st = document.createElement('style'); st.id = 'efsta-405'; st.textContent = css; document.head.appendChild(st);
  }
})();
