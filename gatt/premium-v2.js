/* Brunahólf V2 — útlitslag ofan á Premium-þemað (data-theme="premium").
   Hönnunarkerfi: „Brunahólf V2“ (Design System artifact, 06.11.2026).
   Bætir við: efstu stiku (topbar) sem speglar flipana, táknum í hliðarstiku og hetju (banner) á hverri síðu.
   Breytir ENGUM gögnum og engum hegðunum — smellir á efstu stiku smella bara á upprunalega flipann.
   ATH: portal.js leitar með 'nav .tab[data-view=…]' — því má efsta stikan hvorki nota <nav> né klasann .tab. */
(function () {
  'use strict';
  var root = document.documentElement;
  function on() { return root.getAttribute('data-theme') === 'premium'; }

  var P = {
    house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    chart: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    /* 07.11.2026 — tákn fyrir hausa spjaldanna á eignasíðunni (mockup) */
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    cal: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    ruler: '<path d="M3 7v10"/><path d="M21 7v10"/><path d="M3 12h18"/><path d="M7 9v6"/><path d="M12 9v6"/><path d="M17 9v6"/>'
  };
  function ic(n, c) { return '<svg class="v2-ic' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; }

  var VIEW_IC = { yfirlit: 'house', vinnusvaedi: 'layers', eldvarnabok: 'book', skyrslur: 'chart', reikningar: 'receipt', verkbeidnir: 'wrench', erindi: 'mail', serkjor: 'shield', skilabod: 'msg' };
  /* Undirtextar hetjunnar — orðrétt úr útlitsdrögunum. Yfirskrift (eyebrow) og titill koma úr síðunni sjálfri. */
  var SUB = {
    yfirlit: 'Stjórnun, eftirfylgni og yfirsýn á brunavörnum fasteigna.',
    vinnusvaedi: 'Yfirlit, verkefni, skoðanir og rekstur brunavarna á einum stað.',
    skyrslur: 'Yfirlit yfir allar úttektir, skýrslur og niðurstöður.',
    reikningar: 'Yfirlit yfir alla reikninga, þjónustu og greiðslustöðu.',
    verkbeidnir: 'Yfirlit yfir allar verkbeiðnir og tengdar eignir.',
    skilabod: 'Sendu okkur fyrirspurn, beiðni eða skilaboð.'
  };

  function sideTabs() { return Array.prototype.slice.call(document.querySelectorAll('#portal header nav a.tab[data-view]')); }

  function buildTopbar() {
    if (document.getElementById('v2-top')) return;
    var portal = document.getElementById('portal'); if (!portal) return;
    var bar = document.createElement('div');
    bar.id = 'v2-top';
    bar.innerHTML = '<a class="v2-logo" href="#" data-go="yfirlit"><img src="/gatt/myndir/brunaholf/brunaholf-logo-hvitt.webp" alt="Brunahólf" width="500" height="150"></a>' +
      '<div class="v2-topnav" role="navigation" aria-label="Aðalvalmynd"></div>' +
      '<div class="v2-tools">' +
      '<button type="button" class="v2-find" data-act="leit">' + ic('search') + '<span>Leita í eignum, verkum, skjölum</span></button>' +
      '<button type="button" class="v2-ib" data-act="bell" aria-label="Skilaboð og erindi">' + ic('bell') + '<i class="v2-dot" hidden></i></button>' +
      '<button type="button" class="v2-ib" data-act="help" aria-label="Hafa samband">' + ic('help') + '</button>' +
      '<button type="button" class="v2-av" data-act="adg" aria-label="Aðgangur">' + ic('user') + '</button>' +
      '</div>';
    portal.insertBefore(bar, portal.firstChild);
    /* leitarreitur gáttarinnar (#leit) flyst upp í efstu stiku — portal.js finnur hann áfram eftir id */
    var leit = document.getElementById('leit'), tools = bar.querySelector('.v2-tools');
    if (leit && tools) tools.insertBefore(leit, tools.firstChild);
    var tn = bar.querySelector('.v2-topnav');
    sideTabs().forEach(function (t) {
      var a = document.createElement('a');
      a.href = '#'; a.className = 'v2-tl'; a.setAttribute('data-go', t.getAttribute('data-view'));
      a.textContent = (t.childNodes[0] && t.childNodes[0].nodeType === 3 ? t.childNodes[0].textContent : t.textContent).trim();
      tn.appendChild(a);
    });
    bar.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]'), b = e.target.closest('[data-act]');
      if (g) { e.preventDefault(); var t = document.querySelector('#portal header nav a.tab[data-view="' + g.getAttribute('data-go') + '"]'); if (t) t.click(); window.scrollTo(0, 0); return; }
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'leit') { var q = document.getElementById('leit-q'); var l = document.getElementById('leit'); if (q && l && !l.classList.contains('hidden')) { q.focus(); } else { var y = document.querySelector('#portal header nav a.tab[data-view="yfirlit"]'); if (y) y.click(); setTimeout(function () { var s = document.querySelector('#yf-tools input'); if (s) s.focus(); }, 60); } }
      else if (act === 'bell') { var er = document.querySelector('#portal header nav a.tab[data-view="erindi"]:not(.hidden)') || document.querySelector('#portal header nav a.tab[data-view="skilabod"]'); if (er) er.click(); }
      else if (act === 'help') { var sk = document.querySelector('#portal header nav a.tab[data-view="skilabod"]'); if (sk) sk.click(); }
      else if (act === 'adg') { var ad = document.getElementById('adgBtn'); if (ad && !ad.classList.contains('hidden')) ad.click(); }
    });
    sync();
  }

  function sync() {
    var bar = document.getElementById('v2-top'); if (!bar) return;
    var dot = false;
    sideTabs().forEach(function (t) {
      var v = t.getAttribute('data-view');
      var a = bar.querySelector('.v2-tl[data-go="' + v + '"]'); if (!a) return;
      a.hidden = t.classList.contains('hidden');
      if (t.classList.contains('on')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      var bd = t.querySelector('.nbadge'); var n = bd && !bd.classList.contains('hidden') ? bd.textContent.trim() : '';
      var c = a.querySelector('.v2-count');
      if (n) { if (!c) { c = document.createElement('span'); c.className = 'v2-count'; a.appendChild(c); } c.textContent = n; if (v === 'erindi' || v === 'skilabod') dot = true; }
      else if (c) c.remove();
    });
    var d = bar.querySelector('.v2-dot'); if (d) d.hidden = !dot;
  }

  function sidebarIcons() {
    sideTabs().forEach(function (t) {
      if (t.querySelector('.v2-ic')) return;
      var n = VIEW_IC[t.getAttribute('data-view')]; if (!n) return;
      t.insertAdjacentHTML('afterbegin', ic(n));
    });
  }

  function heroes() {
    var sections = document.querySelectorAll('#portal main > section[id^="v-"]');
    Array.prototype.forEach.call(sections, function (sec) {
      if (sec.querySelector(':scope > .v2-hero')) return;
      var v = sec.id.slice(2);
      var kick = sec.querySelector(':scope > .kicker');
      var h2 = sec.querySelector(':scope > h2.page') || sec.querySelector(':scope > .vs-haus > h2.page');
      if (!h2) return;
      var hero = document.createElement('div');
      hero.className = 'v2-hero';
      var eb = document.createElement('p'); eb.className = 'v2-eyebrow';
      if (kick) { eb.textContent = kick.textContent; eb.setAttribute('data-src', kick.id || ''); }
      var h1 = document.createElement('h1'); h1.textContent = h2.textContent;
      hero.appendChild(eb); hero.appendChild(h1);
      if (SUB[v]) { var p = document.createElement('p'); p.className = 'v2-sub'; p.textContent = SUB[v]; hero.appendChild(p); }
      /* Sérkjör: samningstextinn (#kj-intro, fylltur af portal.js) liggur í hetjunni eins og í útlitsdrögunum */
      var intro = v === 'serkjor' ? sec.querySelector('#kj-intro') : null;
      if (intro) {
        var ps = document.createElement('p'); ps.className = 'v2-sub'; ps.textContent = intro.textContent; hero.appendChild(ps);
        new MutationObserver(function () { ps.textContent = intro.textContent; }).observe(intro, { childList: true, characterData: true, subtree: true });
      }
      sec.insertBefore(hero, sec.firstChild);
      sec.classList.add('v2-has-hero');
      /* yfirskrift sem portal.js uppfærir (t.d. #yf-kicker) speglast áfram */
      if (kick) new MutationObserver(function () { eb.textContent = kick.textContent; }).observe(kick, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ── Bannermynd eignar (eignasíðan = #drawer) ─────────────────────────────
     Röð: eign.banner_url (valin í gáttinni) → eign.mynd (húsmyndin) → sjálfgefna V2-myndin.
     Pínulítill myndavélartakki neðst til hægri í bannernum skiptir um mynd; ↺ fjarlægir valda mynd. */
  var DEFAULT_BANNER = '/gatt/myndir/brunaholf/hetja-v3.webp';
  P.camera = '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>';
  P.undo = '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>';
  function G() { return window.Gatt || null; }
  function cssUrl(u) { return 'url("' + String(u).replace(/"/g, '%22') + '")'; }
  function globalUrl() { var g = G(), d = g && g.state && g.state.data; return (d && d.banner_global_url) || null; }
  /* Aðalbanner allra gátta (valinn í stjórnborðinu, sameiginlegur) — fellur á sjálfgefnu V2-myndina */
  function applyGlobal() {
    var u = globalUrl();
    if (u) root.style.setProperty('--v2-hero-img', cssUrl(u)); else root.style.removeProperty('--v2-hero-img');
  }
  function bannerOf(b) { var e = b && b.eign; return (e && (e.banner_url || e.mynd)) || globalUrl() || DEFAULT_BANNER; }
  function drawerBanner() {
    var head = document.querySelector('#drawer .dr-head'); if (!head) return;
    var g = G(), b = g && g.drB ? g.drB() : null;
    head.classList.add('v2-dr-hero');
    head.style.setProperty('--v2-banner', cssUrl(bannerOf(b)));
    var box = head.querySelector('.v2-bn');
    if (!box) {
      box = document.createElement('div'); box.className = 'v2-bn';
      box.innerHTML = '<button type="button" class="v2-bn-b" data-bn="velja" title="Skipta um bannermynd" aria-label="Skipta um bannermynd">' + ic('camera') + '</button>' +
        '<button type="button" class="v2-bn-b" data-bn="fjarlaegja" title="Nota sjálfgefna mynd" aria-label="Nota sjálfgefna mynd">' + ic('undo') + '</button>' +
        '<input type="file" accept="image/jpeg,image/png,image/webp" hidden>';
      head.appendChild(box);
      box.addEventListener('click', function (e) {
        var t = e.target.closest('[data-bn]'); if (!t) return;
        if (t.getAttribute('data-bn') === 'velja') box.querySelector('input').click();
        else vistaBanner(null);
      });
      box.querySelector('input').addEventListener('change', function () { var f = this.files && this.files[0]; this.value = ''; if (f) minnka(f).then(vistaBanner); });
    }
    var harEigin = !!(b && b.eign && b.eign.banner_url);
    box.querySelector('[data-bn="fjarlaegja"]').hidden = !harEigin;
  }
  function minnka(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res({ data: c.toDataURL('image/jpeg', 0.86), w: c.width, h: c.height });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Myndin opnaðist ekki')); };
      img.src = url;
    });
  }
  function toast(t) { var g = G(); if (g && g.toast) g.toast(t); }
  function vistaBanner(m) {
    var g = G(), b = g && g.drB ? g.drB() : null; if (!b || !b.id) return;
    b.eign = b.eign || {};
    if (g.state && g.state.demo) {                        /* sýnishorn: ekkert vistað */
      if (m) b.eign.banner_url = m.data; else delete b.eign.banner_url;
      drawerBanner(); toast('Sýnishorn — myndin er ekki vistuð'); return;
    }
    var slug = g.SLUG ? g.SLUG() : '', purl = g.state && g.state.open ? ('/api/gatt?c=' + encodeURIComponent(slug)) : '/api/gatt';
    var body = { action: 'eign_banner', site_id: b.id, mynd: m ? m.data : null, mynd_w: m ? m.w : null, mynd_h: m ? m.h : null };
    var head = document.querySelector('#drawer .dr-head'); if (head) head.classList.add('v2-bn-vinnur');
    fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (head) head.classList.remove('v2-bn-vinnur');
        if (!x.ok || !x.j || !x.j.ok) { toast((x.j && x.j.error) || 'Myndin vistaðist ekki'); return; }
        if (x.j.banner_url) b.eign.banner_url = x.j.banner_url; else delete b.eign.banner_url;
        drawerBanner(); toast(m ? 'Bannermynd vistuð' : 'Sjálfgefin mynd tekin aftur');
      })
      .catch(function () { if (head) head.classList.remove('v2-bn-vinnur'); toast('Myndin vistaðist ekki — netvilla'); });
  }

  /* ── Eignasíðan sem SÍÐA: flipar (Yfirlit · Brunavarnir · Teikningar · Verkefni · Skoðanir · Skjöl · Um eignina) ──────────
     Hluti eignasíðunnar (#dr-body) er áfram byggður af portal.js úr RAUNGÖGNUM eignarinnar — hér er aðeins raðað:
     hver hluti er flokkaður eftir fyrirsögn sinni og birtist undir þeim flipa/flipum sem hann á heima í. Flipi sem hefur
     engan hluta (eignin á engin skjöl, engar teikningar …) birtist ekki. Enginn hluti er búinn til hér, engin gögn tilbúin. */
  var TABS = [['yfirlit', 'Yfirlit'], ['brunavarnir', 'Brunavarnir'], ['teikningar', 'Teikningar'], ['verkefni', 'Verkefni'], ['skodanir', 'Skoðanir'], ['skjol', 'Skjöl'], ['reikningar', 'Reikningar'], ['um', 'Um eignina']];
  var TAB_IC = { yfirlit: 'house', brunavarnir: 'flame', teikningar: 'layers', verkefni: 'wrench', skodanir: 'shield', skjol: 'book', reikningar: 'receipt', um: 'chart' };
  /* [regex á h4, flipar, breiddarklasar, röð á Yfirliti, slug, tákn í haus]
     07.11.2026 — röðin fylgir mockupinu: Grunnupplýsingar · Staða · Búnaður / Staðsetning · Flýtiaðgerðir · Verkefni /
     Teikningar · Skoðanir · Skjöl · Lykiltölur · fellilistinn neðst. Nýju spjöldin (v2*) eru númer 1–5, 12 og 20. */
  var SEC_TAB = [
    [/^Yfirlit/, 'yfirlit', 'w3 bare', 1, 'yfkpi'], [/^Erindi/, 'verkefni', '', 6, 'erindi', 'wrench'], [/^Eldvarnabók/, 'yfirlit skodanir', '', 9, 'eb', 'book'],
    [/^Teikningar/, 'yfirlit teikningar', 'w3', 10, 'teikn', 'layers'], [/^Búnaðargreining/, 'brunavarnir', 'w2', 0, 'bgr', 'flame'], [/^Búnaður/, 'brunavarnir', 'w2', 0, 'bun', 'flame'],
    [/^Kerfi og skoðanir/, 'brunavarnir skodanir', 'w2', 0, 'kerfi', 'shield'], [/^Greining teikninga/, 'brunavarnir', '', 0, 'gt', 'layers'], [/^Greining fasteignar/, 'um', 'w2', 0, 'gfast', 'chart'],
    [/^Viðhaldsáætlun/, 'verkefni skodanir', '', 11, 'vid', 'cal'], [/^Saga eignar/, 'skodanir', 'w2', 0, 'saga', 'chart'], [/^Skoðana/, 'yfirlit skodanir', '', 7, 'sodsaga', 'shield'],
    [/^Skýrslur um eignina/, 'skjol', '', 0, 'skyrslueign', 'book'], [/^Skýrslur/, 'yfirlit skjol', '', 8, 'skyrsl', 'book'], [/^Reikningar/, 'reikningar', 'w2', 0, 'reikn', 'receipt'],
    [/^Rými og leigutakar/, 'um', 'w2', 0, 'rymi'], [/^Lyklar/, 'um', '', 0, 'lyklar'], [/^Orkumælar/, 'um', '', 0, 'orku'], [/^Kostnaður/, 'um', '', 0, 'kostn'], [/^Um eignina/, 'um', 'w2', 0, 'umeign', 'info']
  ];
  function secTab(el) {
    if (el.classList.contains('dgrp')) return ['x', ''];
    var h = el.querySelector('h4'); var t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    for (var i = 0; i < SEC_TAB.length; i++) if (SEC_TAB[i][0].test(t)) return [SEC_TAB[i][1], SEC_TAB[i][2] || '', SEC_TAB[i][3] || 0, SEC_TAB[i][4] || '', SEC_TAB[i][5] || ''];
    return ['yfirlit', ''];
  }

  /* Brunavarnir-flipinn: tölurnar efst (úr sömu raungögnum og Yfirlit), þungu hlutarnir samanbrotnir, tækjalistinn opinn þegar hann er stuttur */
  var FOLD = { bgr: 1, gt: 1 };
  function bvExtras(body) {
    var g = G(), b = g && g.drB ? g.drB() : null;
    Array.prototype.forEach.call(body.querySelectorAll(':scope > [data-v2s]'), function (k) {
      var sl = k.getAttribute('data-v2s');
      if (FOLD[sl] && !k.hasAttribute('data-v2f')) {
        k.setAttribute('data-v2f', '1'); k.classList.add('v2-fold');
        var h = k.querySelector('h4'); if (h) { h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); h.addEventListener('click', function () { k.classList.toggle('v2-fold'); }); h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); k.classList.toggle('v2-fold'); } }); }
      }
      if (sl === 'bun' && !k.hasAttribute('data-v2o')) {
        k.setAttribute('data-v2o', '1');
        var d = k.querySelector('details.eq-fold'), n = d ? d.querySelectorAll('tbody tr').length : 0; if (d && n && n <= 30) d.open = true;
      }
    });
  }

  /* ── Eignasíðan í mockup-grind (07.11.2026) ────────────────────────────────────────────────────────
     Spjöldin hér eru ÖLL byggð úr sömu raungögnum eignarinnar og portal.js notar (window.Gatt.drB()).
     Ekkert gildi er búið til: vanti tölu birtist línan ekki, og engin græn hök eru sett nema ársmerkið
     (b.y) segi að skoðun þess árs sé í lagi. Gömlu KPI-flísarnar („Yfirlit") víkja þegar spjöldin koma,
     því efni þeirra er allt komið í Staða brunavarna + Brunavarnabúnaður + Lykiltölur. */
  function hausTakn(k, nafn) {
    var h = k.querySelector(':scope > h4'); if (!h || h.querySelector('.v2-hic')) return;
    h.insertAdjacentHTML('afterbegin', ic(nafn, 'v2-hic'));
  }
  function gB() { var g = G(); return g && g.drB ? g.drB() : null; }
  function hreint(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function tolustafir(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function kortSec(slug, takn, titill, auki, inner, w, rod) {
    return '<section class="dsec" data-v2t="yfirlit" data-v2s="' + slug + '"' + (w ? ' data-v2w="' + w + '"' : '') +
      ' style="--v2o:' + rod + '"><h4>' + ic(takn, 'v2-hic') + titill + (auki || '') + '</h4>' + inner + '</section>';
  }

  /* Næsta skoðun: b.nt er „Tæki: 08/2027|Kerfi: 12/2026“. Fyrsta talan sem fellur er sú sem ræður stöðunni. */
  function naestu(b) {
    var out = [];
    String((b && b.nt) || '').split('|').filter(Boolean).forEach(function (l) {
      var m = /^(.+?):\s*(\d{2})\/(\d{4})\s*$/.exec(l.trim());
      if (m) out.push({ lbl: m[1], m: +m[2], y: +m[3], idx: +m[3] * 12 + +m[2] });
    });
    out.sort(function (a, c) { return a.idx - c.idx; });
    return out;
  }
  function stadaKort(b) {
    var N = naestu(b), d = new Date(), nu = d.getFullYear() * 12 + (d.getMonth() + 1);
    var seint = N.filter(function (x) { return x.idx < nu; });
    var ham, hed, und;
    var skrad = !!String((b && b.nt) || '').trim();
    if (!skrad) { ham = 'obekkt'; hed = 'Ekki skráð'; und = 'Skoðunarmánuður er ekki skráður á eignina.'; }
    else if (seint.length) { ham = 'seint'; hed = 'Skoðun á eftirtíma'; und = seint.length === 1 ? 'Ein skoðun er komin fram yfir skoðunarmánuð.' : seint.length + ' skoðanir eru komnar fram yfir skoðunarmánuð.'; }
    else { ham = 'ok'; hed = 'Skoðun í skilum'; und = 'Engin skoðun er komin fram yfir skoðunarmánuð.'; }
    var pilla = '';
    if (N.length && !seint.length) {
      var mn = N[0].idx - nu;
      pilla = '<span class="v2-pilla">' + (mn <= 0 ? 'í þessum mánuði' : mn === 1 ? 'eftir mánuð' : 'eftir ' + mn + ' mánuði') + '</span>';
    } else if (seint.length) {
      var se = nu - seint[0].idx;
      pilla = '<span class="v2-pilla sein">' + (se === 1 ? 'mánuði of seint' : se + ' mánuðum of seint') + '</span>';
    }
    return kortSec('v2stada', 'shield', 'Staða brunavarna', '',
      '<div class="v2-stada"><div class="v2-flagg ' + ham + '">' + ic(ham === 'ok' ? 'shield' : 'flame') +
      '<div><b>' + hed + '</b><span>' + und + '</span></div></div>' +
      '<div class="v2-naest"><span class="v2-nh">' + ic('cal', 'v2-sic') + 'Næsta reglubundna skoðun</span>' + pilla + '</div>' +
      '<div class="v2-nslot"></div></div>', '', 2);
  }

  /* Grunnupplýsingar — heimilisfang, tegund, hæðir/einingar, stærð, byggingarár, eigandi. */
  /* HÚSATÖLUR — ein heimild báðum megin (Agnar 07.11.2026: „ársskoðun er grunnurinn").
     Þjónninn (gatt.cjs husUr) hefur þegar valið heimild á hverjum reit: það sem Agnar skráir á
     fyrirtækjabannerinn í Ársskoðun ræður, sjálfvirka flokkunin og Landeignaskráin eru varaleið.
     Viðmótið VELUR EKKI heimild — það les b.hus og segir í titli hvaðan talan kemur. */
  var HUS_HEITI = { arsskodun: 'Skráð í Ársskoðun', flokkun: 'Sjálfvirk flokkun staðarins', landeignaskra: 'Landeignaskrá HMS' };
  function husTitill(b, reitur) {
    var h = (b.hus && b.hus.frá && b.hus.frá[reitur]) || '';
    return HUS_HEITI[h] ? ' title="' + HUS_HEITI[h] + '"' : '';
  }
  function tala(b, reitur) { var h = b.hus || {}; return h[reitur] != null ? h[reitur] : null; }
  function grunnKort(b) {
    var e = b.eign || {}, f = b.flokkun || {};
    var m2 = tala(b, 'm2');
    var L = [
      ['pin', 'Heimilisfang', b.heimilisfang, ''],
      ['house', 'Tegund', f.tegund || e.tegund, ''],
      ['shield', 'Notkunarflokkur', f.flokkur ? 'Flokkur ' + f.flokkur : null, ''],
      ['layers', 'Hæðir', tala(b, 'haedir'), 'haedir'],
      ['house', 'Íbúðir', tala(b, 'ibudir'), 'ibudir'],
      ['layers', 'Stigagangar', tala(b, 'stigagangar'), 'stigagangar'],
      ['book', 'Herbergi', tala(b, 'herbergi'), 'herbergi'],
      ['ruler', 'Flatarmál (BTA)', m2 != null ? tolustafir(m2) + ' m²' : null, 'm2'],
      ['cal', 'Byggingarár', tala(b, 'byggingarar'), 'byggingarar'],
      ['user', 'Eigandi', b.eigandi, '']
    ].filter(function (x) { return x[2] != null && x[2] !== ''; });
    if (!L.length) return '';
    return kortSec('v2grunn', 'info', 'Grunnupplýsingar', '',
      '<div class="v2-info">' + L.map(function (x) {
        return '<div class="v2-irow"' + (x[3] ? husTitill(b, x[3]) : '') + '>' + ic(x[0], 'v2-sic') +
          '<span>' + hreint(x[1]) + '</span><b>' + hreint(x[2]) + '</b></div>';
      }).join('') + '</div>', '', 1);
  }

  /* Brunavarnabúnaður — heimildartölurnar þrjár, svo aðrar tegundir úr tækjaskránni ef þær eru til.
     Grænt hak aðeins þar sem ársmerkið (b.y) segir skoðun ársins í lagi — annars ekkert hak. */
  function bunadurKort(b) {
    var y = (b.y || []), sidast = y.length ? y[y.length - 1] : null;
    var okS = !!(sidast && sidast[0] === 'ok'), okB = !!(sidast && sidast[1] === 'ok');
    var L = [];
    if (b.sl != null) L.push(['flame', 'Slökkvitæki', b.sl, okS]);
    if (b.slo != null) L.push(['shield', 'Brunaslöngur', b.slo, okS]);
    if (b.br) L.push(['bell', 'Brunakerfi', b.bru_ein ? b.bru_ein : 'Já', okB]);
    /* Hin kerfin koma úr kerfaskránni með STÖÐU — aldrei talin úr b.equipment, því sú skrá er sundurliðun
       slökkvitækjanna sjálfra (Léttvatn + CO₂ + Duft = b.sl) og hefði tvítalið þau hér. */
    var BUID = { slokkvitaeki: 1, slongukefli: 1, brunavidvorunarkerfi: 1 };
    var HEITI = (G() && G().KERFI_HEITI) || {}, ROD = (G() && G().KERFI_ROD) || [];
    (Array.isArray(b.kerfi) ? b.kerfi : []).slice()
      .sort(function (a, c) { return ROD.indexOf(a.k) - ROD.indexOf(c.k); })
      .forEach(function (k) {
        if (!k || BUID[k.k]) return;
        var okkar = k.adili === 'okkar', til = k.til === 'ja';
        if (!okkar && !til) return;
        L.push(['bolt', HEITI[k.k] || k.k, okkar ? 'Í þjónustu' : 'Til staðar', okkar]);
      });
    if (!L.length) return '';
    return kortSec('v2bun', 'flame', 'Brunavarnabúnaður', '<a href="#" class="dsec-meira" data-v2go="brunavarnir">Sjá allt →</a>',
      '<div class="v2-bun">' + L.map(function (x) {
        return '<div class="v2-brow' + (isFinite(+x[2]) ? '' : ' ordi') + '">' + ic(x[0], 'v2-sic') + '<span>' + hreint(x[1]) + '</span><b>' + hreint(x[2]) + '</b>' +
          (x[3] ? '<i class="v2-hak" title="Skoðun ársins skráð">' + ic('shield') + '</i>' : '<i class="v2-hak tom"></i>') + '</div>';
      }).join('') + '</div>', '', 3);
  }

  /* Staðsetning — kort aðeins þegar hnit eru skráð á eignina; annars heimilisfangið eitt. */
  function hnit(b) {
    var e = b.eign || {};
    if (e.hnit && isFinite(+e.hnit.lat) && isFinite(+e.hnit.lng) && +e.hnit.lat) return { lat: +e.hnit.lat, lng: +e.hnit.lng };
    if (isFinite(+e.lat) && isFinite(+e.lng) && +e.lat) return { lat: +e.lat, lng: +e.lng };
    return null;
  }
  function stadKort(b) {
    if (!b.heimilisfang) return '';
    var h = hnit(b);
    var q = encodeURIComponent(b.heimilisfang);
    var slod = h ? ('https://www.google.com/maps/search/?api=1&query=' + h.lat + ',' + h.lng) : ('https://www.google.com/maps/search/?api=1&query=' + q);
    return kortSec('v2stad', 'pin', 'Staðsetning',
      '<a href="' + slod + '" target="_blank" rel="noopener" class="dsec-meira">Skoða á korti ' + ic('ext', 'v2-sic') + '</a>',
      '<div class="v2-kort' + (h ? '' : ' engin') + '"><div class="v2-kmap" ' + (h ? 'data-lat="' + h.lat + '" data-lng="' + h.lng + '"' : '') + '></div>' +
      '<div class="v2-kaddr">' + ic('pin', 'v2-sic') + '<span>' + hreint(b.heimilisfang) + '</span></div></div>', '', 4);
  }

  /* Flýtiaðgerðir — aðeins hnappar sem eiga sér raunverulega aðgerð í gáttinni (fótur eignasíðunnar og eignarskýrsla). */
  function flytiKort(b) {
    var fot = document.querySelector('#drawer .dr-foot'); if (!fot) return '';
    var L = [];
    var vb = fot.querySelector('[data-dr-erindi="verkbeidni"]');
    if (vb && !vb.classList.contains('hidden')) L.push(['wrench', 'Ný verkbeiðni', 'verkbeidni', 1]);
    if (fot.querySelector('[data-dr-erindi="fyrirspurn"]')) L.push(['mail', 'Senda fyrirspurn', 'fyrirspurn', 0]);
    if (fot.querySelector('[data-dr-erindi="thjonusta"]')) L.push(['bolt', (document.getElementById('dr-thj-l') || {}).textContent || 'Bæta við þjónustu', 'thjonusta', 0]);
    if (window.GattSkyrsla && b.id != null) L.push(['book', 'Eignarskýrsla (PDF)', 'skyrsla', 0]);
    if (L.length < 2) return '';
    return kortSec('v2flyti', 'bolt', 'Flýtiaðgerðir', '',
      '<div class="v2-flyti">' + L.map(function (x) {
        return '<button type="button" class="v2-fb' + (x[3] ? ' adal' : '') + '" data-v2act="' + x[2] + '">' + ic(x[0], 'v2-sic') + '<span>' + hreint(x[1]) + '</span></button>';
      }).join('') + '</div>', '', 5);
  }

  /* Lykiltölur — sömu tölur og Grunnupplýsingar, settar fram sem flísar eins og í mockupinu. */
  function lykilKort(b) {
    var tk = (b.teikning || []).filter(function (x) { return x && (x.mynd || x.threed); }).length;
    var ib = tala(b, 'ibudir'), hb = tala(b, 'herbergi'), hd = tala(b, 'haedir'), m2 = tala(b, 'm2');
    var L = [];
    if (ib != null) L.push([ib, ib === 1 ? 'íbúð' : 'íbúðir', 'house']);
    if (hb != null) L.push([hb, hb === 1 ? 'herbergi' : 'herbergi', 'book']);
    if (hd != null) L.push([hd, hd === 1 ? 'hæð' : 'hæðir', 'layers']);
    if (m2 != null) L.push([tolustafir(m2) + ' m²', 'BTA', 'ruler']);
    if (tk) L.push([tk, tk === 1 ? 'teikning' : 'teikningar', 'book']);
    L = L.slice(0, 4);
    if (L.length < 2) return '';
    return kortSec('v2lykil', 'chart', 'Lykiltölur', '',
      '<div class="v2-lykil">' + L.map(function (x) {
        return '<div class="v2-lt">' + ic(x[2], 'v2-sic') + '<b>' + hreint(x[0]) + '</b><span>' + hreint(x[1]) + '</span></div>';
      }).join('') + '</div>', '', 6);
  }

  /* Fellilistinn neðst — ein lína á hvern flipa sem á efni, með talningunni sem flipinn ber sjálfur. */
  var NAV_TXT = {
    brunavarnir: 'Búnaður, viðhald, þjónusta og úrbætur',
    teikningar: 'Grunnmyndir, brunateikningar og kerfisteikningar',
    verkefni: 'Opin erindi, verkbeiðnir og það sem er í vinnslu',
    skodanir: 'Skoðanasaga, eldvarnabók og næstu dagsetningar',
    skjol: 'Skýrslur, vottorð, viðhaldsáætlanir og aðrar skrár',
    reikningar: 'Þjónusta, viðhald og tengdur kostnaður',
    um: 'Byggingarlýsing, kerfi og sérupplýsingar'
  };
  function navKort(body) {
    var raw = {};
    Array.prototype.forEach.call(body.children, function (k) {
      var t = k.getAttribute('data-v2t') || ''; if (t === 'x') return;
      t.split(' ').forEach(function (x) { if (x && x !== 'yfirlit') raw[x] = (raw[x] || 0) + 1; });
    });
    var L = TABS.filter(function (t) { return t[0] !== 'yfirlit' && raw[t[0]]; });
    if (L.length < 2) return '';
    return kortSec('v2nav', 'layers', 'Allt um eignina', '',
      '<div class="v2-nav">' + L.map(function (t) {
        return '<button type="button" class="v2-nrow" data-v2go="' + t[0] + '">' + ic(TAB_IC[t[0]], 'v2-sic') +
          '<b>' + hreint(t[1]) + '</b><span>' + hreint(NAV_TXT[t[0]] || '') + '</span>' +
          '<i class="v2-ncnt">' + raw[t[0]] + (raw[t[0]] === 1 ? ' hluti' : ' hlutar') + '</i>' +
          '<em class="v2-nchev"></em></button>';
      }).join('') + '</div>', 'w3', 20);
  }

  /* Engin röð endar hálf: síðasta einbreiða spjaldið spannar það sem upp á vantar í síðustu röðinni.
     Dálkafjöldinn er lesinn úr grindinni sjálfri svo reglan fylgi breiddinni (3 → 2 → 1 dálkur). */
  function fyllaRod(body) {
    var singles = [];
    Array.prototype.forEach.call(body.children, function (k) {
      if (getComputedStyle(k).display === 'none') return;
      var w = k.getAttribute('data-v2w') || '';
      var ws = ' ' + w + ' ';
      if (ws.indexOf(' w2 ') > -1 || ws.indexOf(' w3 ') > -1 || ws.indexOf(' bare ') > -1) return;
      singles.push(k);
    });
    singles.forEach(function (k) { k.style.removeProperty('grid-column'); });
    if (body.getAttribute('data-v2tab') !== 'yfirlit') return;
    var cols = String(getComputedStyle(body).gridTemplateColumns || '').trim().split(' ').filter(Boolean).length;
    if (cols < 2 || singles.length < 2) return;
    var r = singles.length % cols;
    if (!r) return;
    singles.sort(function (a, c) { return (+a.style.getPropertyValue('--v2o') || 0) - (+c.style.getPropertyValue('--v2o') || 0); });
    singles[singles.length - 1].style.setProperty('grid-column', 'span ' + (cols - r + 1));
  }
  var fyllaT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(fyllaT);
    fyllaT = setTimeout(function () { var b = document.getElementById('dr-body'); if (b && on()) fyllaRod(b); }, 120);
  });

  function yfExtras(body) {
    var b = gB(); if (!b) return;
    if (body.querySelector(':scope > [data-v2s="v2grunn"], :scope > [data-v2s="v2stada"]')) { kortLifga(body); fyllaRod(body); return; }
    var html = grunnKort(b) + stadaKort(b) + bunadurKort(b) + stadKort(b) + flytiKort(b) + lykilKort(b) + navKort(body);
    if (!html) { body.classList.remove('v2-eign-ny'); return; }
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    var born = Array.prototype.slice.call(tmp.children);
    born.forEach(function (k) { body.appendChild(k); });
    /* Næsta skoðun + ársmerkin eru áfram teiknuð af portal.js — hnúturinn FLYST inn í Stöðu-spjaldið
       í stað þess að vera teiknaður upp á nýtt (ein heimild fyrir þeim texta). */
    var dnext = body.querySelector(':scope > [data-v2s="yfkpi"] .dnext'), slot = body.querySelector('.v2-nslot');
    if (dnext && slot) slot.appendChild(dnext);
    /* 07.11.2026 (Agnar: „sé bara ein lína af teikningum og síðan restin í tab"): forskoðunin sýnir eina röð,
       hlekkurinn fer á Teikningar-flipann þar sem allar hæðirnar standa. CSS felur umframhæðirnar. */
    var th = body.querySelector(':scope > [data-v2s="teikn"] > h4');
    if (th && !th.querySelector('[data-v2go="teikningar"]')) {
      th.insertAdjacentHTML('beforeend', '<a href="#" class="dsec-meira" data-v2go="teikningar">Opna teikningar →</a>');
    }
    body.classList.add('v2-eign-ny');
    kortLifga(body);
    fyllaRod(body);
  }

  /* Kortið er teiknað eftir á (Leaflet sótt í fyrsta sinn) — sama flísaþjónusta og Mitt vinnusvæði notar. */
  var leafP = null;
  function saekjaLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (!leafP) leafP = new Promise(function (res, rej) {
      var c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(c);
      var s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; s.onerror = function () { leafP = null; rej(new Error('leaflet')); }; document.head.appendChild(s);
    });
    return leafP;
  }
  function kortLifga(body) {
    var el = body.querySelector('.v2-kmap[data-lat]'); if (!el || el._k) return;
    el._k = 1;
    saekjaLeaflet().then(function () {
      var m = window.L.map(el, { scrollWheelZoom: false, zoomControl: false, attributionControl: false, dragging: false, doubleClickZoom: false })
        .setView([+el.getAttribute('data-lat'), +el.getAttribute('data-lng')], 16);
      window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(m);
      window.L.marker([+el.getAttribute('data-lat'), +el.getAttribute('data-lng')],
        { icon: window.L.divIcon({ className: 'v2-pin', html: '<i></i>', iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(m);
      setTimeout(function () { m.invalidateSize(); }, 80);
    }).catch(function () { el.classList.add('v2-kbilun'); });
  }

  /* Smellir: flipaskipti úr spjöldunum og flýtiaðgerðirnar (sem smella á raunverulegu hnappana í fætinum). */
  document.addEventListener('click', function (e) {
    if (!on() || !e.target.closest) return;
    var g = e.target.closest('[data-v2go]');
    if (g) { e.preventDefault(); drTab = g.getAttribute('data-v2go'); applyTab(); var bd = document.getElementById('dr-body'); if (bd) bd.scrollTop = 0; return; }
    var a = e.target.closest('[data-v2act]');
    if (a) {
      e.preventDefault();
      var k = a.getAttribute('data-v2act');
      if (k === 'skyrsla') { var b = gB(); if (b && window.GattSkyrsla) GattSkyrsla.opna('eign', b); return; }
      var btn = document.querySelector('#drawer .dr-foot [data-dr-erindi="' + k + '"]');
      if (btn) btn.click();
    }
  });

  /* ── Tölureim undirsíðanna (07.11.2026) ───────────────────────────────────────────────────
     Ein reim, endurbyggð við hver flipaskipti úr raungögnum eignarinnar. Engin tala er reiknuð
     hér sem á sér heimild annars staðar: tækjatölurnar koma af þjóninum (skýrslurnar = Ársskoðun),
     húsatölurnar úr b.hus, og listarnir eru taldir eins og þeir eru teiknaðir á flipanum.
     Flipi sem á engar tölur fær ENGA reim. */
  function kr(n) {
    var v = Math.round(Number(n) || 0);
    return String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr.';
  }
  function erindiEignar(b) {
    var d = (G() && G().state && G().state.data) || {};
    return (d.erindi || []).filter(function (e) { return e && e.fid === b.id; });
  }
  function skjolEignar(b) {
    var d = (G() && G().state && G().state.data) || {};
    return (d.reports || []).filter(function (r) { return r.bygging === b.nafn; });
  }
  function reikningarEignar(b) {
    var d = (G() && G().state && G().state.data) || {};
    return (d.invoices || []).filter(function (r) { return r.fid != null ? r.fid === b.id : r.bygging === b.nafn; });
  }
  function flipaTolur(tab, b) {
    var T = [], i;
    if (tab === 'brunavarnir') {
      if (b.sl != null) T.push(['Slökkvitæki', b.sl]);
      if (b.slo != null) T.push(['Brunaslöngur', b.slo]);
      if (b.br) T.push(['Brunakerfi', b.bru_ein ? b.bru_ein + ' einingar' : 'Já']);
      var nt = (b.nt || '').split('|').filter(Boolean)[0];
      if (nt) { var kv = nt.split(':'); kv.shift(); T.push(['Næsta skoðun', kv.join(':').trim()]); }
    } else if (tab === 'teikningar') {
      var tk = (b.teikning || []).filter(function (f) { return f && (f.mynd || f.threed); });
      if (!tk.length) return [];
      T.push(['Hæðir með teikningu', tk.length]);
      var merki = tk.reduce(function (n, f) { return n + ((f.merki || []).length); }, 0);
      if (merki) T.push(['Merkt tæki á teikningum', merki]);
      var td = tk.filter(function (f) { return f.threed; }).length;
      if (td) T.push(['Hæðir með 3D', td]);
      if (b.hus && b.hus.haedir) T.push(['Hæðir í húsinu', b.hus.haedir]);
    } else if (tab === 'verkefni') {
      var E = erindiEignar(b);
      if (!E.length) return [];
      T.push(['Erindi alls', E.length]);
      T.push(['Opin', E.filter(function (e) { return e.stada !== 'lokid'; }).length]);
      i = E.filter(function (e) { return e.stada === 'i_vinnslu'; }).length; if (i) T.push(['Í vinnslu', i]);
      T.push(['Lokið', E.filter(function (e) { return e.stada === 'lokid'; }).length]);
    } else if (tab === 'skodanir') {
      var sg = (b.saga || []).length;
      if (sg) T.push(['Skráðir atburðir', sg]);
      var sk = (G() && G().skodanirEignar) ? G().skodanirEignar(b) : [];
      sk.forEach(function (x) {
        var n = x.n || {};
        T.push([x.k === 'brunavidvorunarkerfi' ? 'Næsta kerfisskoðun' : 'Næsta tækjaskoðun',
          (n.m != null ? (n.m < 10 ? '0' : '') + n.m + '/' + n.y : '—')]);
      });
      if (!T.length) return [];
    } else if (tab === 'skjol') {
      var S = skjolEignar(b);
      if (!S.length) return [];
      T.push(['Skýrslur', S.length]);
      var ar = S.map(function (r) { return Number(r.ar) || 0; }).filter(Boolean);
      if (ar.length) T.push(['Nýjasta skýrsla', Math.max.apply(null, ar)]);
      var teg = {}; S.forEach(function (r) { if (r.tegund) teg[r.tegund] = (teg[r.tegund] || 0) + 1; });
      Object.keys(teg).slice(0, 2).forEach(function (k) { T.push([k, teg[k]]); });
    } else if (tab === 'reikningar') {
      var R = reikningarEignar(b);
      if (!R.length) return [];
      T.push(['Reikningar', R.length]);
      var summa = R.reduce(function (n, r) { return n + (Number(r.upphaed) || 0); }, 0);
      if (summa) T.push(['Samtals', kr(summa)]);
      var ny = R.slice().sort(function (a, c) { return String(c.dags || '').localeCompare(String(a.dags || '')); })[0];
      if (ny && ny.dags) T.push(['Nýjasti', String(ny.dags).slice(0, 10).split('-').reverse().join('.')]);
    }
    return T;
  }
  function flipaRaema(body, tab) {
    var gamalt = body.querySelector(':scope > .v2-bvk');
    var b = gB();
    var T = (b && tab && tab !== 'yfirlit') ? flipaTolur(tab, b) : [];
    if (!T.length) { if (gamalt) gamalt.remove(); return; }
    var el = gamalt || document.createElement('div');
    el.className = 'v2-bvk';
    el.setAttribute('data-v2t', tab);
    el.setAttribute('data-v2s', 'kpi');
    el.setAttribute('data-v2w', 'w3 bare');   // fyllaRod telur hana ekki sem einbreitt spjald
    el.innerHTML = T.map(function (t) {
      return '<div class="v2-kt"><span>' + hreint(t[0]) + '</span><b>' + hreint(t[1]) + '</b></div>';
    }).join('');
    if (el.parentNode !== body || body.firstChild !== el) body.insertBefore(el, body.firstChild);
  }

  var drTab = 'yfirlit', drTabs = null;
  function applyTab() {
    var body = document.getElementById('dr-body'); if (!body) return;
    Array.prototype.forEach.call(body.children, function (k) { if (!k.hasAttribute('data-v2t')) { var r = secTab(k); k.setAttribute('data-v2t', r[0]); if (r[1]) k.setAttribute('data-v2w', r[1]); if (r[2]) k.style.setProperty('--v2o', r[2]); if (r[3]) k.setAttribute('data-v2s', r[3]); if (r[4]) hausTakn(k, r[4]); } });
    yfExtras(body);
    var have = {}; Array.prototype.forEach.call(body.children, function (k) { k.getAttribute('data-v2t').split(' ').forEach(function (t) { have[t] = (have[t] || 0) + 1; }); });
    have.yfirlit = have.yfirlit || 1;
    if (!have[drTab]) drTab = 'yfirlit';
    body.setAttribute('data-v2tab', drTab);
    var bar = document.getElementById('v2-dtabs');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'v2-dtabs'; bar.setAttribute('role', 'tablist');
      var dr = document.getElementById('drawer'); dr.insertBefore(bar, body);
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return;
        drTab = b.getAttribute('data-t'); applyTab(); body.scrollTop = 0;
      });
    }
    bvExtras(body);
    bar.innerHTML = TABS.filter(function (t) { return have[t[0]]; }).map(function (t) {
      return '<button type="button" role="tab" data-t="' + t[0] + '" class="' + (t[0] === drTab ? 'on' : '') + '" aria-selected="' + (t[0] === drTab) + '">' + ic(TAB_IC[t[0]]) + '<span>' + t[1] + '</span></button>';
    }).join('');
    flipaRaema(body, drTab);
    fyllaRod(body);
  }
  function drawerMeta() {
    var g = G(), b = g && g.drB ? g.drB() : null, tt = document.querySelector('#drawer .dr-tt'); if (!tt) return;
    var k = tt.querySelector('.kicker');
    if (k && !k.querySelector('.v2-crumb')) { k.innerHTML = '<a href="#" class="v2-crumb">Eignir</a><span class="v2-sep">›</span><span class="v2-crumb-n"></span>'; k.querySelector('.v2-crumb').addEventListener('click', function (e) { e.preventDefault(); if (g && g.closeDrawer) g.closeDrawer(); }); }
    if (k) { var n = k.querySelector('.v2-crumb-n'); if (n) n.textContent = b && b.nafn ? b.nafn : ''; }
    var m = tt.querySelector('.v2-meta'); if (!m) { m = document.createElement('div'); m.className = 'v2-meta'; tt.appendChild(m); }
    /* 07.11.2026 (mockup): ein lína með tákni — tegund · teikningar · einingar — og staðan sem pilla hægra megin í hausnum. */
    var bits = [];
    if (b) {
      var fl = b.flokkun || {}, eg = b.eign || {};
      if (fl.tegund || eg.tegund) bits.push(String(fl.tegund || eg.tegund).replace(/[<>&]/g, ''));
      var tn = (b.teikning || []).filter(function (f) { return f && (f.mynd || f.threed); }).length;
      if (tn) bits.push(tn + (tn === 1 ? ' teikning' : ' teikningar'));
      var hu = b.hus || {};
      if (hu.ibudir) bits.push(hu.ibudir + (hu.ibudir === 1 ? ' íbúð' : ' íbúðir'));
      else if (hu.herbergi) bits.push(hu.herbergi + ' herbergi');
      else if (eg.einingar) bits.push(String(eg.einingar).replace(/[<>&]/g, '') + ' einingar');
    }
    m.innerHTML = bits.length ? '<span class="v2-mline">' + ic('house', 'v2-sic') + '<span>' + bits.join(' · ') + '</span></span>' : '';
    var head = document.querySelector('#drawer .dr-head');
    if (head) {
      var sp = head.querySelector('.v2-stpill');
      if (!sp) { sp = document.createElement('div'); sp.className = 'v2-stpill'; head.appendChild(sp); }
      if (b && b.i_thjonustu === true) { sp.className = 'v2-stpill ok'; sp.textContent = 'Í þjónustu'; sp.hidden = false; }
      else if (b && b.i_thjonustu === false) { sp.className = 'v2-stpill'; sp.textContent = 'Utan þjónustu'; sp.hidden = false; }
      else sp.hidden = true;
    }
  }
  /* Þétt yfirlitsreim fyrir eign: aðeins staðfest gildi úr opnu eignargagni. */
  function drawerSummary() {
    var d = document.getElementById('drawer'), g = G(), b = g && g.drB ? g.drB() : null;
    if (!d) return;
    var old = document.getElementById('v2-dr-summary');
    if (!b) { if (old) old.remove(); return; }
    var rows = [];
    var hu = b.hus || {}, eg = b.eign || {};
    if (hu.ibudir != null && hu.ibudir !== '') rows.push(['Íbúðir', hu.ibudir]);
    else if (hu.herbergi != null && hu.herbergi !== '') rows.push(['Herbergi', hu.herbergi]);
    else if (eg.einingar != null && eg.einingar !== '') rows.push(['Einingar', eg.einingar]);
    if (hu.haedir != null && hu.haedir !== '') rows.push(['Hæðir', hu.haedir]);
    var tk = (b.teikning || []).filter(function (f) { return f && (f.mynd || f.threed); }).length;
    if (tk) rows.push(['Teikningar', tk]);
    if (b.sl != null && b.sl !== '') rows.push(['Slökkvitæki', b.sl]);
    if (b.slo != null && b.slo !== '') rows.push(['Brunaslöngur', b.slo]);
    if (b.i_thjonustu === true) rows.push(['Þjónusta', 'Í þjónustu']);
    else if (b.i_thjonustu === false) rows.push(['Þjónusta', 'Utan þjónustu']);
    if (!rows.length) { if (old) old.remove(); return; }
    var strip = old || document.createElement('div');
    strip.id = 'v2-dr-summary';
    strip.setAttribute('aria-label', 'Lykilupplýsingar eignar');
    strip.replaceChildren();
    rows.slice(0, 6).forEach(function (item) {
      var cell = document.createElement('div'), value = document.createElement('strong'), label = document.createElement('span');
      cell.className = 'v2-dr-summary-cell';
      value.textContent = String(item[1]);
      label.textContent = item[0];
      cell.appendChild(value); cell.appendChild(label); strip.appendChild(cell);
    });
    var tabs = document.getElementById('v2-dtabs'), body = document.getElementById('dr-body');
    if (tabs && tabs.parentNode === d) d.insertBefore(strip, tabs);
    else if (body && body.parentNode === d) d.insertBefore(strip, body);
  }
  function drawerPage() { drawerMeta(); applyTab(); drawerSummary(); }

  function watchDrawer() {
    var d = document.getElementById('drawer'); if (!d || d._v2) return; d._v2 = true;
    new MutationObserver(function () { if (on() && !d.classList.contains('hidden')) { drTab = 'yfirlit'; drawerBanner(); drawerPage(); } }).observe(d, { attributes: true, attributeFilter: ['class'] });
    var db = document.getElementById('dr-body'), rq = 0;
    if (db) new MutationObserver(function () { if (!on() || rq) return; rq = requestAnimationFrame(function () { rq = 0; if (!d.classList.contains('hidden')) applyTab(); }); }).observe(db, { childList: true });
    /* nav/efsta stika lokar eignasíðunni — hún liggur ofan á efnissvæðinu en ekki ofan á valmyndinni */
    document.addEventListener('click', function (e) { if (on() && !d.classList.contains('hidden') && e.target.closest && e.target.closest('#v2-top a, #v2-top button, #portal header nav a.tab')) { var g = G(); if (g && g.closeDrawer) g.closeDrawer(); } }, true);
    var nm = document.getElementById('dr-name');
    if (nm) new MutationObserver(function () { if (on()) { drawerBanner(); drawerMeta(); drawerSummary(); } }).observe(nm, { childList: true, characterData: true, subtree: true });
  }

  function start() {
    if (!on()) return;
    applyGlobal(); buildTopbar(); sidebarIcons(); heroes(); watchDrawer(); sync();
  }

  /* Vaktir: aðeins þema-eigindin á <html> og flipar hliðarstikunnar (class + badge-texti) — ekki allt skjalið */
  var navMo = new MutationObserver(function () { if (on()) { sync(); sidebarIcons(); } });
  function watchNav() {
    var nav = document.querySelector('#portal header nav'); if (!nav || nav._v2) return; nav._v2 = true;
    navMo.observe(nav, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true, characterData: true });
  }
  function boot() {
    start(); watchNav();
    new MutationObserver(function () { if (on()) { start(); watchNav(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
