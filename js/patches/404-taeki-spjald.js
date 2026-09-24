/* === 404 · Tækjalistinn — spjaldið úr hönnuninni C (23.09.2026) ===
 *
 * Sama aðferð og 403 (Skjöl & viðhengi): 224 teiknar tækjalistann eins og áður og þessi patch RAÐAR
 * úttaki hans upp á nýtt í hönnun C — málmhaus með talningu „N slökkvitæki", tegundastiku (Duft ·
 * Léttvatn · CO₂ …), skoðunarmánuði og Merkja skoðun; valstikan (Velja allt · N valin · → Yfirferð ·
 * → Hleðsla · Ónýtt · Breyta stærð · Síðasta/Næsta skoðun · Prenta QR · Eyða) sem málmband; hópar með
 * tegundarrönd; hver röð: hak · heiti · raðnúmer · „Yfirfarið ’25" sem lítill silfurhnappur · næsta
 * skoðun · ✓ · Yfirferð/Hleðsla/Nýtt · ⋯ (Ónýtt, Prenta QR-miða).
 *
 * ENGIN GÖGN, ENGINN HANDLER: hver upprunalegur hnappur, gátreitur og reitur er FÆRÐUR (aldrei klónaður,
 * aldrei fjarlægður). 224 hlustar á document, svo staðsetning skiptir engu. Ónýtt og ▦ sitja inni í
 * ⋯-liðum sem smella á þá. Mánaðarreiturinn og „Merkja skoðun" (00-legacy hengir þau í .ut-bulk) eru
 * færð í hausinn — legacy finnur þau áfram með main.querySelector.
 *
 * Endurteikning: UttektTaeki.rerender skrifar .ut-list innerHTML við hvern smell (hak, þjónusta, val) —
 * MutationObserver raðar upp aftur í sama tifi (fyrir málun). Öryggisnet eins og í 403: gagnvirkir hnútar
 * taldir fyrir/eftir, fækki þeim er uppröðunin dregin til baka.
 *
 * Gildissvið: Brunastál, tölva. Sími/app (338/356) ósnert.
 */
(function () {
  if (window.__taeki404) return;
  window.__taeki404 = true;

  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var TABLE_HEAD = 'linear-gradient(180deg,#2b2f37,#15171c)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var PLATE_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  var SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  var RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  var FAM = { duft: ['Duft', '#2563eb'], lettv: ['Léttvatn', '#38bdf8'], co2: ['CO₂', '#dc2626'], slanga: ['Slanga', '#14b8a6'], reyk: ['Reykskynjari', '#8a93a3'], annad: ['Annað', '#8a93a3'] };

  function svg(d, w, sz) { return '<svg width="' + (sz || 16) + '" height="' + (sz || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var ICON = {
    dots: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    ban: svg('<circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/>'),
    qr: svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v7h-7"/>'),
    check: svg('<path d="m5 12 5 5L20 7"/>', 3, 14),
    cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>', 2, 14),
    chev: svg('<path d="m6 9 6 6 6-6"/>', 2.5, 16)
  };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function stripEmoji(s) { return String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}✅❌↺→️]/gu, '').replace(/^[\s·]+|[\s·]+$/g, '').trim(); }
  function fam(e) { var m = e && e.className && e.className.match(/\b(duft|lettv|co2|slanga|reyk|annad)\b/); return m ? m[1] : 'annad'; }
  function interactive(root) { return root.querySelectorAll('button,a[href],input,select,textarea').length; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ⋯ valmynd (sama mynstur og 403): liðir smella á upprunalega hnappinn sem situr inni í liðnum
  function menuButton(items, label) {
    var wrap = el('span', 'b404-vm');
    var btn = el('button', 'b404-meira', ICON.dots);
    btn.type = 'button'; btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', label); btn.title = label;
    var menu = el('div', 'b404-menu'); menu.setAttribute('role', 'menu'); menu.hidden = true;
    items.forEach(function (it) {
      var mi = el('button', 'b404-mi' + (it.danger ? ' eyda' : '') + (it.on ? ' a' : ''));
      mi.type = 'button'; mi.setAttribute('role', 'menuitem');
      mi.innerHTML = (it.icon || '') + '<span>' + it.label + '</span>' + (it.on ? ICON.check : '');
      it.orig.classList.add('b404-orig'); mi.appendChild(it.orig);
      mi.addEventListener('click', function (ev) { if (it.orig === ev.target || it.orig.contains(ev.target)) return; ev.preventDefault(); ev.stopPropagation(); closeAll(); it.orig.click(); }); // gervi-smellurinn bólar upp í document-hlustara 224
      menu.appendChild(mi);
    });
    wrap.appendChild(btn); wrap.appendChild(menu);
    btn.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var open = !menu.hidden; closeAll();
      if (!open) { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.classList.add('opin'); var r = btn.getBoundingClientRect(); menu.style.top = (r.bottom + 4) + 'px'; var left = r.right - menu.offsetWidth; menu.style.left = Math.max(8, left) + 'px'; if (r.bottom + 4 + menu.offsetHeight > innerHeight - 8) menu.style.top = Math.max(8, r.top - 4 - menu.offsetHeight) + 'px'; }
    });
    return wrap;
  }
  function closeAll() {
    document.querySelectorAll('.b404-menu:not([hidden])').forEach(function (m) { m.hidden = true; });
    document.querySelectorAll('.b404-meira.opin').forEach(function (b) { b.classList.remove('opin'); b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.b404-vm')) closeAll(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  window.addEventListener('scroll', closeAll, true);

  function composeRow(row) {
    if (row.dataset.b404) return;
    row.dataset.b404 = '1';
    var f = fam(row.querySelector('.ut-ico'));
    row.classList.add('fam-' + f);
    var main = row.querySelector('.ut-main'); var sub = main && main.querySelector('.ut-sub');
    var last = row.querySelector('.ut-last');
    if (sub) {
      var t = txt(sub); var m = t.match(/^(.*?)(?:\s*·\s*næsta\s+(.*))?$/);
      var serial = m ? m[1] : t; var next = m && m[2] ? m[2] : '';
      var nm = next.match(/^(\d{1,2})\.\s*(\S+)\s+(\d{4})$/); // „1. apr 2026" → 01/04/2026
      var MAN = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
      if (nm) { var mi = MAN.indexOf(nm[2].toLowerCase().replace('.', '').slice(0, 3)); if (mi >= 0) next = String(nm[1]).padStart(2, '0') + '/' + String(mi + 1).padStart(2, '0') + '/' + nm[3]; }
      sub.innerHTML = '<b>' + esc(serial) + '</b>';
      if (last) { last.textContent = stripEmoji(txt(last)); sub.appendChild(last); }
      if (next) sub.appendChild(el('span', 'b404-naest', 'næsta ' + esc(next)));
    }
    var h = el('div', 'b404-h');
    var chk = row.querySelector('.ut-check'); if (chk) { chk.innerHTML = ICON.check; h.appendChild(chk); }
    var seg = row.querySelector('.ut-svcseg'); if (seg) h.appendChild(seg);
    var items = [];
    var onytt = row.querySelector('.ut-onytt'); if (onytt) items.push({ label: onytt.classList.contains('on') ? 'Ónýtt — taka af' : 'Merkja ónýtt', icon: ICON.ban, orig: onytt, on: onytt.classList.contains('on') });
    var act = row.querySelector('.ut-act'); if (act) items.push({ label: 'Prenta QR-miða', icon: ICON.qr, orig: act });
    if (items.length) h.appendChild(menuButton(items, 'Fleiri aðgerðir fyrir tækið'));
    var right = row.querySelector('.ut-right');
    // allt gagnvirkt sem eftir stendur í .ut-right (óþekkt) → sýnilegt í h
    if (right) { Array.prototype.slice.call(right.querySelectorAll('button,a[href],input,select')).forEach(function (k) { if (!h.contains(k)) h.appendChild(k); }); right.classList.add('b404-tomt'); }
    row.appendChild(h);
  }

  function compose(list) {
    if (list.querySelector('.b404-root') || list.dataset.b404fail === '1') return;
    var bulk = list.querySelector(':scope > .ut-bulk'); if (!bulk) return;
    var before = interactive(list);
    var main = document.getElementById('companies-main');
    var coId = list.getAttribute('data-uw-co');
    var root = el('div', 'b404-root');

    // talning per tegund
    var grps = Array.prototype.slice.call(list.querySelectorAll(':scope > .ut-grp'));
    var counts = [], total = 0;
    grps.forEach(function (g) { var ico = g.querySelector('.ut-grp-h .ut-ico'); var f = fam(ico); var n = parseInt(txt(g.querySelector('.ut-grp-cnt')), 10) || 0; counts.push({ f: f, n: n }); total += n; });
    var locked = list.classList.contains('locked');
    var yr = new Date().getFullYear();

    // ── haus ──
    var head = el('header', 'b404-haus', '<span class="b404-hnod tl"></span><span class="b404-hnod tr"></span><span class="b404-hnod bl"></span><span class="b404-hnod br"></span>');
    var v = el('div', 'b404-haus-v');
    v.appendChild(el('div', 'b404-titill', '<i class="b404-led ' + (locked ? 'g' : 'b') + '"></i>Úttekt ' + yr + ' · ' + (locked ? 'listi staðfestur' : 'í vinnslu')));
    v.appendChild(el('div', 'b404-talning', '<span class="tala">' + total + '</span><span class="tlabel">' + (total === 1 ? 'slökkvitæki' : 'slökkvitæki') + '</span>'));
    head.appendChild(v);
    if (counts.length) {
      var st = el('div', 'b404-haus-m');
      st.appendChild(el('div', 'b404-stika', counts.map(function (c) { return '<i style="flex:' + c.n + ';background:' + FAM[c.f][1] + '"></i>'; }).join('')));
      st.appendChild(el('div', 'b404-skyring', counts.map(function (c) { return '<span><i style="background:' + FAM[c.f][1] + '"></i>' + FAM[c.f][0] + ' <b>' + c.n + '</b></span>'; }).join('')));
      head.appendChild(st);
    }
    var hr = el('div', 'b404-haus-h');
    // 00-legacy: mánaðarreitur + Merkja skoðun hanga í .ut-bulk — færð í hausinn (legacy finnur þau áfram)
    var month = main && main.querySelector('._pm_quick_inspect_month'); if (month) { month.classList.add('b404-manudur'); hr.appendChild(month); }
    var merkja = main && main.querySelector('._pm_quick_inspect'); if (merkja) { merkja.classList.add('b404-btn-malmur'); merkja.innerHTML = ICON.check + 'Merkja skoðun'; hr.appendChild(merkja); }
    head.appendChild(hr);
    root.appendChild(head);

    var stal = el('div', 'b404-stal');
    // ── valstika (= .ut-bulk, óbreytt innihald) ──
    bulk.classList.add('b404-valstika');
    Array.prototype.slice.call(bulk.querySelectorAll('button')).forEach(function (b) { if (b.classList.contains('ut-bulk-clear')) { b.innerHTML = svg('<path d="M18 6 6 18M6 6l12 12"/>', 2.5, 14); b.setAttribute('aria-label', 'Hætta við val'); return; } b.textContent = stripEmoji(txt(b)).replace(/^[─-◿]s*/, ''); });
    Array.prototype.slice.call(bulk.querySelectorAll('.ut-bulk-lbl')).forEach(function (s) { s.textContent = stripEmoji(txt(s)); });
    var sel = bulk.querySelector('.ut-selall'); if (sel) sel.textContent = /Hreinsa/.test(txt(sel)) ? 'Hreinsa val' : 'Velja allt';
    stal.appendChild(bulk);
    var uh = list.querySelector(':scope > .ut-head'); if (uh) { uh.classList.add('b404-falid'); stal.appendChild(uh); }
    // ── hópar ──
    grps.forEach(function (g) {
      var gh = g.querySelector('.ut-grp-h'); var f = fam(gh && gh.querySelector('.ut-ico'));
      g.classList.add('b404-grp', 'fam-' + f);
      if (gh) { var chev = gh.querySelector('.ut-grp-chev'); if (chev) chev.innerHTML = ICON.chev; var nm = gh.querySelector('.ut-grp-nm'); if (nm) nm.textContent = FAM[f][0]; }
      Array.prototype.slice.call(g.querySelectorAll('.ut-row')).forEach(composeRow);
      stal.appendChild(g);
    });
    var lock = list.querySelector(':scope > .ut-listlock'); if (lock) { lock.textContent = stripEmoji(txt(lock)); lock.classList.add('b404-lock'); stal.appendChild(lock); }
    root.appendChild(stal);
    // leifar (óþekkt gagnvirkt) → sýnilegar neðst
    var leif = el('div', 'b404-leif');
    Array.prototype.slice.call(list.children).forEach(function (c) { if (c !== root && c.querySelector && interactive(c) > 0) leif.appendChild(c); });
    if (leif.children.length) stal.appendChild(leif);
    list.appendChild(root);
    Array.prototype.slice.call(list.children).forEach(function (c) { if (c !== root) c.classList.add('b404-gamalt'); });

    var after = interactive(list);
    if (after < before) { console.error('[404] uppröðun tapaði ' + (before - after) + ' tengingum — dregin til baka'); root.remove(); list.dataset.b404fail = '1'; list.classList.remove('b404'); return; }
    list.classList.add('b404'); list.dataset.b404 = String(before);
  }

  // Heimildin að „+ Bæta við tæki": hnúturinn sem raunverulega framkvæmir aðgerðina.
  // 73 setur sinn bulk-takka fremst og felur upprunalega, svo hann gengur fyrir sé hann til.
  function finnaBaetaHeimild(main) {
    var allir = Array.prototype.slice.call(main.querySelectorAll('button')).filter(function (x) {
      return /^\+\s*Bæta við tæki/.test(txt(x)) && !x.closest('.ut-list') && !x.closest('.modal') && !x.classList.contains('b404-umbod');
    });
    if (!allir.length) return null;
    for (var i = 0; i < allir.length; i++) if (allir[i].classList.contains('_bulkadd_btn')) return allir[i];
    return allir[0];
  }

  function scope() { var h = document.documentElement; return h.getAttribute('data-thm-preset') === 'brunastal' && h.getAttribute('data-viewmode') !== 'mobile' && !h.classList.contains('slokk-phone-dev') && !document.body.classList.contains('appmode'); }
  var timer = null;
  function tick() {
    if (!scope()) {
      // Sími/appmode: hausinn okkar er ekki til, svo heimildin verður að sjást aftur.
      Array.prototype.slice.call(document.querySelectorAll('.b404-heimild')).forEach(function (x) { x.classList.remove('b404-heimild'); });
      return;
    }
    var main = document.getElementById('companies-main'); if (!main) return;
    Array.prototype.slice.call(main.querySelectorAll('.ut-list')).forEach(function (l) {
      if (l.dataset.b404fail === '1' && !l.querySelector('.b404-root')) delete l.dataset.b404fail;
      try { compose(l); } catch (err) { console.error('[404]', err); }
      // legacy hengir mánuð/Merkja skoðun í .ut-bulk EFTIR uppröðun → færa í hausinn þegar þau koma
      var hr = l.querySelector('.b404-haus-h'); if (hr) { var m = main.querySelector('._pm_quick_inspect_month'), b = main.querySelector('._pm_quick_inspect'); if (m && m.parentElement !== hr) { m.classList.add('b404-manudur'); hr.appendChild(m); } if (b && b.parentElement !== hr) { b.classList.add('b404-btn-malmur'); b.innerHTML = ICON.check + 'Merkja skoðun'; hr.appendChild(b); }
        // Agnar 24.09 (skjámynd með hring og ör): „+ Bæta við tæki" á að standa í Úttekt-hausnum við Merkja skoðun.
        //
        // 24.09 seinna, Agnar: „þegar ég bæti við tæki, þá dettur takkinn út og næ ekki að bæta
        // við öðru nema refresha." Takkinn var FÆRÐUR hingað áður. Hann er ekki okkar hnútur —
        // hann býr í takkaröðinni (div[data-co-id]) sem `Companies` á. Við hverja endurteikningu
        // listans rífur compose() upp `.b404-root` og býr til NÝJAN `.b404-haus-h`, svo aðfengni
        // hnúturinn dó með gamla hausnum. Röðin sem átti hann teiknast EKKI aftur þegar tæki er
        // bætt við, svo ekkert endurskapaði hann — aðeins full endurhleðsla.
        // CLAUDE.md regla 4: ekki færa hnút sem þú átt ekki inn í ílát sem þú endurbyggir.
        // Þess í stað: UMBOÐSTAKKI sem við eigum og megum endurbyggja, og smellir á heimildina.
        var heim = finnaBaetaHeimild(main);
        if (heim) {
          // ÖRYGGISREGLA: heimildin felst AÐEINS ef umboðið er sannanlega komið í hausinn.
          // Í prófun 24.09 mældist staða með NÚLL sýnilegum „+ Bæta við tæki" — heimildin
          // var falin en umboðið varð aldrei til. Röðin hér að neðan tryggir að aldrei sé
          // hægt að enda með enga leið til að bæta við tæki.
          if (!hr.querySelector('.b404-umbod')) {
            var umb = document.createElement('button');
            umb.type = 'button';
            umb.className = 'b404-btn-malmur b404-baeta b404-umbod';
            umb.textContent = '+ Bæta við tæki';
            umb.addEventListener('click', function (e) {
              e.preventDefault();
              // heimildin er flett upp AFTUR við smell: hún gæti hafa verið
              // endurteiknuð (73 skiptir sínum bulk-takka inn) síðan umboðið varð til.
              var m = document.getElementById('companies-main');
              var h = m && finnaBaetaHeimild(m);
              if (h) h.click();
            });
            var mk2 = hr.querySelector('._pm_quick_inspect');
            if (mk2) hr.insertBefore(umb, mk2); else hr.appendChild(umb);
          }
          var stendur = hr.querySelector('.b404-umbod');
          if (stendur) heim.classList.add('b404-heimild');      // falin með CSS — EKKI færð
          else heim.classList.remove('b404-heimild');           // ekkert umboð → heimildin verður að sjást
        }
      }
    });
  }
  function schedule() { if (schedule.inni) return; schedule.inni = true; try { tick(); } finally { schedule.inni = false; } }   // 24.09.2026: vaktin (252) skilar sér í rAF, FYRIR málun — setTimeout héðan lenti EFTIR málun og hrái ramminn sást sem hopp (mælt: 224-listinn 601 → 741 px, valstikan 205 → 154 px). Sama tif, engin millistaða.
  // Vaktin (MutationObserver) er inngjafarstýrð af 252 og skilar sér ~300 ms eftir smell — sá millitími sæist sem hopp.
  // Því er UttektTaeki.rerender vafið: uppröðunin keyrir í SAMA tifi og endurteikningin, fyrir málun.
  (function wrapRerender() {
    var U = window.UttektTaeki;
    if (!U || !U.rerender || U.rerender.__b404) { setTimeout(wrapRerender, 500); return; }
    var orig = U.rerender;
    U.rerender = function () {
      // Agnar 24.09: „Þessi partur skreppur saman í örstutta stund þegar ég ýti á
      // yfirferð eða hleðslu." Mánaðarreiturinn og „Merkja skoðun" eru hnútar 00-legacy
      // sem við FÆRÐUM inn í hausinn okkar — hausinn býr inni í .ut-list sem 224 skrifar
      // yfir með innerHTML. Þeir dóu því með gamla trénu; tick() fann þá ekki og teiknaði
      // hausinn án þeirra (mjórri), legacy-vaktin bjó þá til aftur ~300 ms síðar og
      // hausinn stækkaði á ný. Lausn: taka þá úr trénu ÁÐUR en 224 skrifar, setja þá
      // aftur í nýju .ut-bulk (þar sem legacy skilur þá eftir) og láta tick() færa þá
      // í hausinn í SAMA tifi. Engin millistaða málast.
      var main = document.getElementById('companies-main');
      var geymt = [];
      if (main) {
        ['._pm_quick_inspect_month', '._pm_quick_inspect'].forEach(function (s) {
          var n = main.querySelector(s);
          if (n && n.closest('.ut-list')) { geymt.push(n); n.parentNode.removeChild(n); }
        });
      }
      var out = orig.apply(this, arguments);
      try {
        if (geymt.length && main) {
          var bulk = main.querySelector('.ut-list .ut-bulk') || main.querySelector('.ut-list');
          if (bulk) geymt.forEach(function (n) { bulk.appendChild(n); });
        }
        tick();
      } catch (e) { console.error('[404]', e); }
      return out;
    };
    U.rerender.__b404 = true;
  })();
  (function watch() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 700); return; }
    new MutationObserver(function (recs) { // hunsa okkar eigin valmyndar-opnanir (hidden-attribút) og legacy-innskot inn í hausinn
      for (var i = 0; i < recs.length; i++) { var t = recs[i].target; if (t && t.closest && (t.closest('.b404-menu') || t.classList && t.classList.contains('b404-haus-h'))) continue; schedule(); return; }
    }).observe(main, { childList: true, subtree: true });
    setInterval(tick, 1500);
    schedule();
  })();

  if (!document.getElementById('taeki-404')) {
    var P = 'html[data-thm-preset="brunastal"] #companies-main .ut-list.b404 ';
    function r(sel, css) { return sel.split(',').map(function (s) { return P + s.trim(); }).join(',') + '{' + css + '}'; }
    var LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
    var SILVER_BTN = 'background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.14)!important;color:#1f2530!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;text-shadow:none';
    var css = [
      // Heimildin að „+ Bæta við tæki" er FALIN, ekki færð — umboðstakkinn í hausnum
      // smellir á hana. Hún býr í takkaröðinni, utan .ut-list, svo r() -forskeytið nær ekki til hennar.
      'html[data-thm-preset="brunastal"] #companies-main .b404-heimild{display:none!important}',
      'html[data-thm-preset="brunastal"] #companies-main .uttekt-col-l:has(.ut-list.b404) > div:first-child{display:none}',
      r('', 'background:#e2e6ec;background-image:' + PLATE_IMG + ';border:1px solid #000;border-radius:14px;overflow:visible;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);font-family:' + SANS + ';margin-bottom:14px;container-type:normal'),
      r('> .b404-gamalt', 'display:none'),
      r('.b404-orig', 'position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;opacity:0!important;margin:0!important;padding:0!important;border:0!important;pointer-events:none'),
      r('.b404-falid,.b404-tomt', 'display:none!important'),
      // haus
      r('.b404-haus', 'position:relative;background:' + METAL + ';color:#fff;border-bottom:1px solid #000;border-radius:13px 13px 0 0;padding:14px 18px 12px;display:flex;align-items:center;gap:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);flex-wrap:wrap'),
      r('.b404-hnod', 'position:absolute;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7)'), r('.b404-hnod.tl', 'left:8px;top:8px'), r('.b404-hnod.tr', 'right:8px;top:8px'), r('.b404-hnod.bl', 'left:8px;bottom:8px'), r('.b404-hnod.br', 'right:8px;bottom:8px'),
      r('.b404-titill', 'font-family:' + MONO + ';font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d9dee6;display:flex;align-items:center;gap:9px'),
      r('.b404-led', 'width:8px;height:8px;border-radius:50%;display:inline-block'), r('.b404-led.b', 'background:#9fd0ff;box-shadow:0 0 0 3px rgba(60,120,200,.2),0 0 12px rgba(159,208,255,.8)'), r('.b404-led.g', 'background:#3cc47c;box-shadow:0 0 0 3px rgba(60,196,124,.16),0 0 12px rgba(60,196,124,.8)'),
      r('.b404-talning', 'display:flex;align-items:baseline;gap:10px;margin-top:6px'),
      r('.b404-talning .tala', 'font-family:' + DISPLAY + ';font-size:38px;font-weight:800;line-height:1;letter-spacing:-.02em;font-variant-numeric:lining-nums;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
      r('.b404-talning .tlabel', 'font-family:' + DISPLAY + ';font-size:16px;font-weight:700;color:#d9dee6'),
      r('.b404-haus-m', 'display:flex;flex-direction:column;gap:6px;margin-left:8px'),
      r('.b404-stika', 'display:flex;gap:3px;height:8px;width:280px;max-width:100%'), r('.b404-stika i', 'display:block;border-radius:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.4);min-width:0'),
      r('.b404-skyring', 'display:flex;gap:14px;font-family:' + MONO + ';font-size:11.5px;font-weight:500;color:#d5dbe6;flex-wrap:wrap'), r('.b404-skyring span', 'display:inline-flex;align-items:center;gap:5px'), r('.b404-skyring b', 'color:#fff;font-weight:700'), r('.b404-skyring i', 'width:6px;height:6px;border-radius:50%;display:inline-block'),
      r('.b404-haus-h', 'margin-left:auto;display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px'),
      r('.b404-manudur', 'height:30px!important;padding:0 8px!important;border-radius:3px!important;border:1px solid rgba(20,24,34,.12)!important;background:' + SILVER + '!important;color:#11141c!important;font-family:' + MONO + '!important;font-size:12px!important;font-weight:700!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12)!important;margin:0!important'),
      r('.b404-btn-malmur', 'all:unset;cursor:pointer;height:36px;padding:0 14px 0 12px;border-radius:9px;border:1px solid #000;background:' + METAL_BTN + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4;font-family:' + SANS + ';font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:7px;box-sizing:border-box;margin:0!important'),
      // stálplata
      r('.b404-stal', 'padding:10px 10px 16px;display:flex;flex-direction:column;gap:6px'),
      // valstika
      r('.b404-valstika', 'display:flex!important;align-items:center;gap:6px;flex-wrap:wrap;background:' + TABLE_HEAD + '!important;border:1px solid #000;border-radius:8px;padding:8px 10px!important;color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);margin-bottom:4px'),
      r('.b404-valstika .ut-bulk-cnt', 'font-family:' + MONO + ';font-size:12px;font-weight:700;color:#fff;margin:0 6px 0 2px'),
      r('.b404-valstika button', SILVER_BTN + ';border-radius:7px!important;font-family:' + SANS + '!important;font-size:12px!important;font-weight:600!important;padding:0 10px!important;height:32px;display:inline-flex;align-items:center;gap:5px'),
      r('.b404-valstika .ut-bulk-del', 'color:#b42318!important'),
      r('.b404-valstika .ut-bulk-clear', 'background:transparent!important;border-color:transparent!important;box-shadow:none!important;color:#d5dbe6!important;font-size:16px!important;margin-left:auto'),
      r('.b404-valstika .ut-bulk-datewrap', 'border-left:1px solid rgba(255,255,255,.14)!important;margin-left:4px!important;padding-left:8px!important;gap:6px!important'),
      r('.b404-valstika .ut-bulk-lbl', 'font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.1em;text-transform:uppercase;color:#d5dbe6!important'),
      r('.b404-valstika input[type="date"]', 'height:30px!important;padding:0 8px!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:6px!important;background:#eef1f6!important;color:#141822!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font-family:' + MONO + '!important;font-size:12px!important'),
      // hópar
      r('.b404-grp .ut-grp-h', 'width:100%;display:flex;align-items:center;gap:10px;padding:8px 12px 6px 14px;background:transparent!important;border:0!important;cursor:pointer;font-family:' + SANS + ';text-align:left'),
      r('.b404-grp .ut-grp-h::before', 'content:"";width:4px;height:20px;border-radius:2px;background:#8a93a3;flex:none'),
      r('.b404-grp.fam-duft .ut-grp-h::before,.ut-row.fam-duft::before', 'background:#2563eb'), r('.b404-grp.fam-lettv .ut-grp-h::before,.ut-row.fam-lettv::before', 'background:#38bdf8'), r('.b404-grp.fam-co2 .ut-grp-h::before,.ut-row.fam-co2::before', 'background:#dc2626'), r('.b404-grp.fam-slanga .ut-grp-h::before,.ut-row.fam-slanga::before', 'background:#14b8a6'),
      r('.b404-grp .ut-grp-h .ut-ico', 'display:none'),
      r('.b404-grp .ut-grp-nm', 'font-size:13px;font-weight:600;color:#1f2530'), r('.b404-grp .ut-grp-cnt', 'font-family:' + MONO + ';font-size:11px;font-weight:700;color:#5b6472'),
      r('.b404-grp .ut-grp-chev', 'margin-left:auto;color:#5b6472;display:inline-flex'),
      r('.b404-grp .ut-grp-body', 'display:flex;flex-direction:column;gap:6px;padding:0 0 6px'),
      // raðir
      r('.ut-row', LINE + ';display:flex;align-items:center;gap:10px;min-height:44px;padding:5px 6px 5px 0!important;border-top:0!important;overflow:hidden;position:relative'),
      r('.ut-row::before', 'content:"";width:4px;align-self:stretch;flex:none;background:#8a93a3;border-radius:6px 0 0 6px;margin:-5px 6px -5px 0'),
      r('.ut-row.sel', 'background:#fff8f7;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(201,42,42,.45),0 2px 4px rgba(10,14,22,.14)'),
      r('.ut-row.onytt', 'opacity:.6'),
      r('.ut-row .ut-ico', 'display:none'),
      r('.ut-row .ut-chk', 'width:18px;height:18px;border-radius:4px;accent-color:#0a4a26;flex:none;cursor:pointer'),
      r('.ut-row .ut-main', 'flex:1;min-width:120px;display:flex;flex-direction:column;gap:2px'),
      r('.ut-row .ut-t', 'font-family:' + SANS + ';font-size:13px;font-weight:600;color:#11141c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
      r('.ut-row .ut-sub', 'display:flex;align-items:center;gap:8px;font-family:' + MONO + ';font-size:11.5px;color:#5b6472;white-space:nowrap;overflow:hidden;margin:0'),
      r('.ut-row .ut-sub b', 'color:#1f2530;font-weight:700'),
      r('.ut-row .ut-last', 'height:22px;padding:0 7px;border-radius:5px;' + SILVER_BTN + ';font-family:' + SANS + '!important;font-size:11px!important;font-weight:600!important;color:#3a4250!important;display:inline-flex;align-items:center;white-space:nowrap'),
      r('.ut-row .ut-last.h', 'color:#845400!important'), r('.ut-row .ut-last.old', 'color:#b42318!important'), r('.ut-row .ut-last.none', 'background:transparent!important;border-style:dashed!important;color:#6b7483!important'),
      r('.b404-naest', 'color:#5b6472'),
      r('.b404-h', 'display:flex;align-items:center;gap:8px;flex:none;margin-left:auto'),
      r('.b404-h .ut-check', 'all:unset;cursor:pointer;width:30px;height:30px;border-radius:7px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ';color:#3a4250;display:inline-flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);box-sizing:border-box'),
      r('.b404-h .ut-check.on', 'background:linear-gradient(180deg,#1f9d57,#0a4a26);border-color:#0a4a26;color:#fff'),
      r('.b404-h .ut-svcseg', 'display:inline-flex;background:' + SILVER + ';border:1px solid rgba(20,24,34,.14);border-radius:7px;padding:0;gap:0;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);height:30px'),
      r('.b404-h .ut-svc', 'all:unset;cursor:pointer;height:30px;padding:0 10px;font-family:' + SANS + ';font-size:12px;font-weight:600;color:#3a4250;display:inline-flex;align-items:center;white-space:nowrap;box-sizing:border-box'),
      r('.b404-h .ut-svc + .ut-svc', 'border-left:1px solid rgba(20,24,34,.12)'),
      r('.b404-h .ut-svc.on', 'background:' + METAL_BTN + '!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.14)'),
      r('.b404-lock', 'all:unset;cursor:pointer;display:block;box-sizing:border-box;width:100%;margin-top:8px;padding:12px;border-radius:10px;border:1px solid rgba(52,168,98,.55);background:' + SAEKJA + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);color:#fff;font-family:' + SANS + ';font-size:14px;font-weight:700;text-align:center;text-shadow:0 1px 1px rgba(0,0,0,.55)'),
      r('.b404-lock.on', 'background:' + METAL_BTN + ';border-color:#000;color:#7fe0a8;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)'),
      r('.b404-leif', 'display:flex;flex-wrap:wrap;gap:6px;padding:6px 10px;' + LINE),
      // ⋯
      r('.b404-vm', 'position:relative;flex:none;display:inline-flex'),
      r('.b404-meira', 'all:unset;cursor:pointer;width:28px;height:28px;border-radius:6px;color:#5b6472;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box'),
      r('.b404-meira:hover,.b404-meira.opin', 'background:' + METAL_BTN + ';color:#eef1f4;border:1px solid #000'),
      r('.b404-menu', 'position:fixed;z-index:7900;min-width:212px;background:#fff;border:1px solid rgba(20,24,34,.12);border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);padding:6px;display:flex;flex-direction:column;gap:2px'),
      r('.b404-mi', 'all:unset;cursor:pointer;height:40px;border-radius:8px;padding:0 10px;display:flex;align-items:center;gap:10px;font-family:' + SANS + ';font-size:13.5px;font-weight:500;color:#1f2530;position:relative;box-sizing:border-box'),
      r('.b404-mi svg', 'color:#5b6472;flex:none'), r('.b404-mi:hover', 'background:#f1f4f8'), r('.b404-mi.a', 'color:#b42318;font-weight:600'), r('.b404-mi.a svg', 'color:#b42318'), r('.b404-mi > svg:last-of-type', 'margin-left:auto;color:#0a4a26')
    ].join('\n');
    css += '\n' + P + '.b404-menu[hidden]{display:none!important}'; // [hidden] vinnur display:flex
    var st = document.createElement('style'); st.id = 'taeki-404'; st.textContent = css; document.head.appendChild(st);
  }
})();
