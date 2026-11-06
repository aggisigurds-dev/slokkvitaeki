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
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'
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
  var SEC_TAB = [
    [/^Yfirlit/, 'yfirlit', 'w2 bare', 1], [/^Erindi/, 'yfirlit verkefni', 'w2 bare', 4], [/^Eldvarnabók/, 'yfirlit skodanir', '', 2],
    [/^Teikningar/, 'yfirlit teikningar', 'w2', 3], [/^Búnaðargreining/, 'brunavarnir', 'w2'], [/^Búnaður/, 'brunavarnir', 'w2'],
    [/^Kerfi og skoðanir/, 'brunavarnir skodanir', 'w2'], [/^Greining teikninga/, 'brunavarnir'], [/^Greining fasteignar/, 'um'],
    [/^Viðhaldsáætlun/, 'yfirlit verkefni skodanir', '', 2], [/^Saga eignar/, 'skodanir', 'w2'], [/^Skoðana/, 'skodanir'],
    [/^Skýrslur/, 'yfirlit skjol', '', 2], [/^Reikningar/, 'reikningar', 'w2'],
    [/^(Rými og leigutakar|Lyklar|Orkumælar|Kostnaður|Um eignina)/, 'um']
  ];
  function secTab(el) {
    if (el.classList.contains('dgrp')) return ['x', ''];
    var h = el.querySelector('h4'); var t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    for (var i = 0; i < SEC_TAB.length; i++) if (SEC_TAB[i][0].test(t)) return [SEC_TAB[i][1], SEC_TAB[i][2] || '', SEC_TAB[i][3] || 0];
    return ['yfirlit', ''];
  }
  var drTab = 'yfirlit', drTabs = null;
  function applyTab() {
    var body = document.getElementById('dr-body'); if (!body) return;
    Array.prototype.forEach.call(body.children, function (k) { if (!k.hasAttribute('data-v2t')) { var r = secTab(k); k.setAttribute('data-v2t', r[0]); if (r[1]) k.setAttribute('data-v2w', r[1]); if (r[2]) k.style.order = r[2]; } });
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
    bar.innerHTML = TABS.filter(function (t) { return have[t[0]]; }).map(function (t) {
      return '<button type="button" role="tab" data-t="' + t[0] + '" class="' + (t[0] === drTab ? 'on' : '') + '" aria-selected="' + (t[0] === drTab) + '">' + ic(TAB_IC[t[0]]) + '<span>' + t[1] + '</span></button>';
    }).join('');
  }
  function drawerMeta() {
    var g = G(), b = g && g.drB ? g.drB() : null, tt = document.querySelector('#drawer .dr-tt'); if (!tt) return;
    var k = tt.querySelector('.kicker');
    if (k && !k.querySelector('.v2-crumb')) { k.innerHTML = '<a href="#" class="v2-crumb">Eignir</a><span class="v2-sep">›</span><span class="v2-crumb-n"></span>'; k.querySelector('.v2-crumb').addEventListener('click', function (e) { e.preventDefault(); if (g && g.closeDrawer) g.closeDrawer(); }); }
    if (k) { var n = k.querySelector('.v2-crumb-n'); if (n) n.textContent = b && b.nafn ? b.nafn : ''; }
    var m = tt.querySelector('.v2-meta'); if (!m) { m = document.createElement('div'); m.className = 'v2-meta'; tt.appendChild(m); }
    var bits = [];
    if (b) {
      if (b.i_thjonustu === true) bits.push('<span class="v2-chip ok">Í þjónustu</span>');
      else if (b.i_thjonustu === false) bits.push('<span class="v2-chip">Utan þjónustu</span>');
      var tn = (b.teikning || []).filter(function (f) { return f && (f.mynd || f.threed); }).length;
      if (tn) bits.push('<span class="v2-chip">' + tn + (tn === 1 ? ' teikning' : ' teikningar') + '</span>');
      if (b.eign && b.eign.einingar) bits.push('<span class="v2-chip">' + String(b.eign.einingar).replace(/[<>&]/g, '') + ' einingar</span>');
    }
    m.innerHTML = bits.join('');
  }
  function drawerPage() { drawerMeta(); applyTab(); }

  function watchDrawer() {
    var d = document.getElementById('drawer'); if (!d || d._v2) return; d._v2 = true;
    new MutationObserver(function () { if (on() && !d.classList.contains('hidden')) { drTab = 'yfirlit'; drawerBanner(); drawerPage(); } }).observe(d, { attributes: true, attributeFilter: ['class'] });
    var db = document.getElementById('dr-body'), rq = 0;
    if (db) new MutationObserver(function () { if (!on() || rq) return; rq = requestAnimationFrame(function () { rq = 0; if (!d.classList.contains('hidden')) applyTab(); }); }).observe(db, { childList: true });
    /* nav/efsta stika lokar eignasíðunni — hún liggur ofan á efnissvæðinu en ekki ofan á valmyndinni */
    document.addEventListener('click', function (e) { if (on() && !d.classList.contains('hidden') && e.target.closest && e.target.closest('#v2-top a, #v2-top button, #portal header nav a.tab')) { var g = G(); if (g && g.closeDrawer) g.closeDrawer(); } }, true);
    var nm = document.getElementById('dr-name');
    if (nm) new MutationObserver(function () { if (on()) { drawerBanner(); drawerMeta(); } }).observe(nm, { childList: true, characterData: true, subtree: true });
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
