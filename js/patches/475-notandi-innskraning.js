/* 475 — Notandinn neðst í hliðarstikunni: nafnið úr innskráningunni + „Skrá út" / „Skrá inn".
 *
 * Agnar 19.10.2026: „geturðu bætt við útskrá þarna svo nýtt nafn geti skráð sig inn". Merkið var fast „JS / Jón S." í
 * index.html. Nú sækir það stöðuna úr /api/hub-adgangar (sama notendaskrá og Brunahólf; cookie hub_user á þessum vef):
 *   innskráð(ur): avatar = notandanafn (AS), nafn = „Agnar S.", valmynd með Skrá út (+ Aðgangar fyrir admin)
 *   óinnskráð(ur): „Ekki innskráð(ur)", valmynd með Skrá inn
 * Skrá út → /innskraning.html, þar sem nýtt nafn getur skráð sig inn. Engin tækjastilling (reglan 15.10.2026): staðan er cookie
 * + þjónn. Næst fær merkið að stjórna því hver er „ég" í Slökkvitæki — enn ekki tengt (bh_me er óbreytt).
 * Bilar hljóðlega: svari þjónninn ekki helst merkið eins og það var. */
(function () {
  'use strict';
  var HUB = 'https://brunaholf.netlify.app';
  var S = { authed: false, user: null, ok: false };
  var menu = null;

  function first(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function shortName(n) {
    var w = String(n || '').trim().split(/\s+/).filter(Boolean);
    return w.length < 2 ? (w[0] || '') : w[0] + ' ' + w[w.length - 1][0].toUpperCase() + '.';
  }
  function chip() { return document.querySelector('.topbar-right .user-chip'); }

  function paint() {
    var c = chip(); if (!c) return false;
    var av = c.querySelector('.user-avatar'), nm = c.querySelector('span');
    if (!av || !nm) return false;
    if (S.ok) {
      av.textContent = S.authed ? String(S.user.nn || '?').slice(0, 2) : '–';
      nm.textContent = S.authed ? shortName(S.user.nafn) : 'Ekki innskráð(ur)';
    }
    [av, nm].forEach(function (x) { x.style.cursor = 'pointer'; });
    av.setAttribute('role', 'button'); av.setAttribute('tabindex', '0'); av.setAttribute('aria-haspopup', 'menu');
    av.setAttribute('aria-label', S.authed ? 'Notandi: ' + (S.user.nafn || '') + ' — valmynd' : 'Notandi — skrá inn');
    av.title = S.authed ? 'Skráð(ur) inn sem ' + (S.user.nafn || '') : 'Smelltu til að skrá inn';
    return true;
  }

  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function openMenu() {
    closeMenu();
    var c = chip(), av = c && c.querySelector('.user-avatar'); if (!av) return;
    var r = av.getBoundingClientRect();
    var m = document.createElement('div'); m.id = '_nu-menu'; m.setAttribute('role', 'menu');
    m.style.cssText = 'position:fixed;z-index:100000;left:' + Math.max(8, Math.round(r.left)) + 'px;bottom:' + Math.round(window.innerHeight - r.top + 8) + 'px;width:228px;box-sizing:border-box;padding:6px;border-radius:10px;border:1px solid #000;background:linear-gradient(145deg,#08080a 0%,#26262c 30%,#3a3a41 50%,#19191d 75%,#070709 100%);box-shadow:0 18px 40px -12px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.12);font-family:"IBM Plex Sans",system-ui,sans-serif';
    var itemCss = 'display:flex;align-items:center;gap:8px;width:100%;height:40px;padding:0 10px;border:0;border-radius:7px;background:transparent;color:#fff;font:600 13px/1 "IBM Plex Sans",system-ui,sans-serif;text-align:left;text-decoration:none;cursor:pointer;box-sizing:border-box';
    var html = '';
    if (S.authed) {
      html += '<div style="padding:8px 10px 8px"><div style="color:#fff;font-weight:600;font-size:13px">' + esc(S.user.nafn) + '</div><div style="margin-top:3px;color:#aab2c0;font:500 10.5px/1 \'JetBrains Mono\',monospace;letter-spacing:.1em;text-transform:uppercase">' + esc(S.user.nn) + ' · ' + esc(S.user.rola) + '</div></div>' +
        '<div style="height:1px;background:rgba(255,255,255,.14);margin:2px 4px 6px"></div>';
      if (S.user.rola === 'Admin') html += '<a role="menuitem" href="' + HUB + '/adgangar.html" target="_blank" rel="noopener" style="' + itemCss + '" class="_nu-it">Aðgangar (admin)</a>';
      html += '<button type="button" role="menuitem" id="_nu-ut" style="' + itemCss + '" class="_nu-it">Skrá út</button>';
    } else {
      html += '<div style="padding:8px 10px;color:#d9dee6;font-size:12.5px;line-height:1.4">Þú ert ekki skráð(ur) inn.</div><button type="button" role="menuitem" id="_nu-inn" style="' + itemCss + '" class="_nu-it">Skrá inn</button>';
    }
    m.innerHTML = '<style>._nu-it:hover,._nu-it:focus-visible{background:rgba(255,255,255,.1)!important;outline:none}</style>' + html;
    document.body.appendChild(m); menu = m;
    var ut = m.querySelector('#_nu-ut'), inn = m.querySelector('#_nu-inn');
    if (ut) { ut.addEventListener('click', function () { ut.disabled = true; fetch('/api/hub-adgangar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ action: 'logout' }) }).catch(function () {}).then(function () { location.href = '/innskraning.html'; }); }); }
    if (inn) inn.addEventListener('click', function () { location.href = '/innskraning.html?next=' + encodeURIComponent(location.pathname + location.search + location.hash); });
    var first = m.querySelector('._nu-it'); if (first) first.focus();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function bind() {
    var c = chip(); if (!c || c.dataset.nu === '1') return;
    c.dataset.nu = '1';
    c.addEventListener('click', function (e) { e.stopPropagation(); if (menu) closeMenu(); else openMenu(); });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (menu) closeMenu(); else openMenu(); } });
  }
  document.addEventListener('click', function (e) { if (menu && !menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  function start(tries) {
    if (!paint()) { if (tries < 40) setTimeout(function () { start(tries + 1); }, 250); return; }
    bind();
  }
  fetch('/api/hub-adgangar', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (st) { S.ok = true; S.authed = !!st.authed; S.user = st.user || null; })
    .catch(function () { /* merkið helst eins og það var */ })
    .then(function () { start(0); });
})();
