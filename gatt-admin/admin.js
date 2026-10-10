/* admin.js — Viðskiptavinavefir stjórnsíða. Talar við /api/gatt-admin. */
(function () {
  'use strict';
  // ── Starfsmanna-hlið: fái síðan 401 { need_login } frá bakenda birtir hún
  // lykilorðs-glugga, skráir inn (POST /api/hub-login) og reynir aftur. Óvirkt
  // nema HUB_STAFF_PASSWORD sé sett server-megin — þá svarar gatt-admin 200 eins
  // og áður og þessi kóði kemur aldrei við sögu.
  var __hubLoginP = null;
  function hubLogin() {
    if (__hubLoginP) return __hubLoginP;
    __hubLoginP = new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:rgba(10,12,16,.72);display:flex;align-items:center;justify-content:center;font-family:inherit');
      ov.innerHTML = '<form id="__hubForm" style="background:#14181f;color:#fff;padding:24px 22px;border-radius:14px;border:1px solid rgba(255,255,255,.14);min-width:290px;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        + '<div style="font-weight:700;font-size:16px;margin-bottom:4px">Starfsmanna-innskr&#225;ning</div>'
        + '<div style="font-size:12px;color:#9aa3b2;margin-bottom:14px">&#222;essi s&#237;&#240;a er varin. Sl&#225;&#240;u inn sameiginlega lykilor&#240;i&#240;.</div>'
        + '<input id="__hubPw" type="password" autocomplete="current-password" placeholder="Lykilor&#240;" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:#0e1116;color:#fff;font:inherit;font-size:15px">'
        + '<div id="__hubErr" style="color:#ff6b6b;font-size:12px;min-height:16px;margin:8px 2px 0"></div>'
        + '<button id="__hubBtn" type="submit" style="margin-top:8px;width:100%;padding:10px;border:0;border-radius:9px;background:#c8302f;color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer">Skr&#225; inn</button></form>';
      var form = ov.querySelector('#__hubForm'), inp = ov.querySelector('#__hubPw'), err = ov.querySelector('#__hubErr'), btn = ov.querySelector('#__hubBtn');
      form.onsubmit = function (e) {
        e.preventDefault(); var pw = inp.value; if (!pw) return;
        btn.disabled = true; btn.textContent = 'Skr\u00e1i inn\u2026'; err.textContent = '';
        fetch('/api/hub-login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (res.ok) { document.body.removeChild(ov); __hubLoginP = null; resolve(); }
            else { err.textContent = (res.j && res.j.error) || 'Villa'; btn.disabled = false; btn.textContent = 'Skr\u00e1 inn'; inp.select(); }
          })
          .catch(function () { err.textContent = 'Netvilla'; btn.disabled = false; btn.textContent = 'Skr\u00e1 inn'; });
      };
      document.body.appendChild(ov); setTimeout(function () { inp.focus(); }, 30);
    });
    return __hubLoginP;
  }
  function gattFetch(url, opts) {
    opts = opts || {}; if (!('credentials' in opts)) opts.credentials = 'same-origin';
    return fetch(url, opts).then(function (r) {
      if (r.status !== 401) return r;
      return r.clone().json().catch(function () { return {}; }).then(function (j) {
        if (j && j.need_login) return hubLogin().then(function () { return fetch(url, opts); });
        return r;
      });
    });
  }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var ORIGIN = location.origin;
  var state = { access: [], messages: [] };

  // Þemu Þjónustuvefsins — sömu lyklar og :root[data-theme] í gatt/index.html og THEMES í gatt-admin.cjs.
  var GOLD = 'linear-gradient(90deg,#7a5a12,#f5d76e,#fff3b0,#c9a54a,#7a5a12)';
  var SILVER = 'linear-gradient(90deg,#4a5059,#dde2e8,#ffffff,#9aa2ad,#4a5059)';
  var COPPER = 'linear-gradient(90deg,#5a240b,#ec9a62,#ffd8bc,#c8642a,#5a240b)';
  var THEMES = [
    { k: 'steel', n: 'Stál', d: 'Hlutlaust · kopar', hdr: '#161616', paper: '#e9eaec', card: '#ffffff', metal: COPPER, dot: '#c8642a' },
    { k: 'cream', n: 'Rjómi', d: 'Rjómi · gull · svart', hdr: '#22170e', paper: '#efe7db', card: '#fffdf8', metal: GOLD, dot: '#c9a54a' },
    { k: 'boss', n: 'Boss', d: 'Svart stál · gull', hdr: '#141312', paper: '#f4f1ea', card: '#ffffff', metal: GOLD, dot: '#c9a54a' },
    { k: 'grafit', n: 'Grafít', d: 'Grátt · silfur', hdr: '#27292d', paper: '#e3e4e6', card: '#ffffff', metal: SILVER, dot: '#aab2bc' },
    { k: 'blar', n: 'Blátt', d: 'Dökkblátt · silfur', hdr: '#132036', paper: '#e6ebf2', card: '#ffffff', metal: SILVER, dot: '#aab2bc' },
  ];
  function themeOf(k) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].k === k) return THEMES[i]; return THEMES[0]; }
  // Línutákn (engin emoji)
  var IC = {
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    open: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M16 7l2.5 2.5M14 9l2 2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    bell: '<path d="M6.5 16v-4.5a5.5 5.5 0 0 1 11 0V16l1.5 2h-14z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    bldg: '<path d="M4.5 21V6l7.5-3 7.5 3v15"/><path d="M2.5 21h19"/><path d="M8.5 9h2M13.5 9h2M8.5 13h2M13.5 13h2M10.5 21v-4h3v4"/>',
    flame: '<path d="M12.6 3c.5 3-1.3 4.6-2.8 6.2C8.2 10.9 6.8 12.7 6.8 15.4a5.2 5.2 0 0 0 10.4 0c0-2.3-1.1-4.1-2.3-5.5-.1 1.5-.8 2.6-1.9 3.2.6-3.4-.2-6.4-.4-10.1z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  function ic(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[k] || '') + '</svg>'; }
  function themeChip(k) { var t = themeOf(k); return '<span class="thm"><i style="background:' + t.hdr + ';box-shadow:inset 0 -3px 0 ' + t.dot + '"></i>' + esc(t.n) + '</span>'; }
  function themeCards(cur) {
    return THEMES.map(function (t) {
      return '<div class="tcard' + (t.k === cur ? ' on' : '') + '" data-theme="' + t.k + '" role="radio" tabindex="0" aria-checked="' + (t.k === cur) + '">' +
        '<div class="tprev" style="background:' + t.paper + '"><div class="h" style="background:' + t.hdr + '"></div><div class="b" style="background:' + t.metal + '"></div>' +
        '<div class="cs"><span style="background:' + t.card + '"></span><span style="background:' + t.card + '"></span><span style="background:' + t.hdr + ';box-shadow:inset 0 2px 0 ' + t.dot + '"></span></div></div>' +
        '<b>' + esc(t.n) + '</b><small>' + esc(t.d) + '</small>' +
        '<a class="pv" href="/gatt/?demo=1&theme=' + t.k + '" target="_blank" rel="noopener">Forskoða ↗</a></div>';
    }).join('');
  }

  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(window._t); window._t = setTimeout(function () { t.classList.remove('show'); }, 1900); }
  function copy(txt) { try { navigator.clipboard.writeText(txt); toast('Afritað'); } catch (_) { toast('Gat ekki afritað'); } }
  function urlOf(a) { return ORIGIN + '/gatt/?c=' + a.slug; }
  function api(body) { return gattFetch('/api/gatt-admin', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  function fmtDate(d) { if (!d) return ''; var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(d)); return m ? (m[3] + '.' + m[2] + '. ' + m[4] + ':' + m[5]) : String(d).slice(0, 16); }

  function load() {
    gattFetch('/api/gatt-admin', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) { $('#accBody').innerHTML = '<tr><td colspan="5" class="empty">' + esc(d.error) + '</td></tr>'; return; }
        state.access = d.access || []; state.messages = d.messages || [];
        renderStats(); renderAccess(); renderMessages();
      })
      .catch(function () { $('#accBody').innerHTML = '<tr><td colspan="5" class="empty">Villa við að sækja gögn</td></tr>'; });
  }

  function statusOf(a) {
    if (a.active && a.hasPassword && a.email) return { c: 'on', t: 'Virkur' };
    if (!a.active) return { c: 'off', t: 'Óvirkur' };
    return { c: 'setup', t: 'Í uppsetningu' };
  }

  function renderStats() {
    var virk = state.access.filter(function (a) { return a.active && a.hasPassword && a.email; }).length;
    var ovirk = state.access.length - virk;
    var ny = state.messages.filter(function (m) { return m.sender === 'kunni' && !m.read_by_staff; }).length;
    $('#stats').innerHTML =
      '<div class="chip good"><span class="ico">' + ic('globe') + '</span><div class="k">Virkir vefir</div><div class="v">' + virk + '</div></div>' +
      '<div class="chip"><span class="ico">' + ic('gear') + '</span><div class="k">Í uppsetningu / óvirkir</div><div class="v">' + ovirk + '</div></div>' +
      '<div class="chip alert' + (ny ? ' has' : '') + '"><span class="ico">' + ic('bell') + '</span><div class="k">Ný skilaboð</div><div class="v">' + ny + '</div></div>';
  }

  function renderAccess() {
    if (!state.access.length) { $('#accBody').innerHTML = '<tr><td colspan="5" class="empty">Enginn aðgangur stofnaður enn — leitaðu að fyrirtæki að ofan.</td></tr>'; return; }
    $('#accBody').innerHTML = state.access.map(function (a) {
      var st = statusOf(a);
      return '<tr class="rowline" data-id="' + a.id + '">' +
        '<td><div class="co">' + esc(a.base_nafn) + '</div><div class="kt">' + esc(a.slug || '') + '</div></td>' +
        '<td><span class="pill ' + st.c + '"><span class="dot"></span>' + st.t + '</span></td>' +
        '<td class="hide-sm"><div class="look">' + themeChip(a.theme) + (a.show_details ? '<span class="det" title="Kúnni sér nánari upplýsingar um eignir">' + ic('eye') + 'Nánar</span>' : '') + '</div></td>' +
        '<td class="hide-sm acc ' + (a.email ? '' : 'none') + '">' + esc(a.email || '—') + '</td>' +
        '<td><div class="actions">' +
          '<button class="btn btn--sm btn--accent" data-act="imp" title="Opna vef kúnnans án lykilorðs">' + ic('open') + 'Opna sem kúnni</button>' +
          '<button class="btn btn--sm" data-act="copy">' + ic('copy') + 'Hlekkur</button>' +
          '<button class="btn btn--sm" data-act="edit">' + ic('key') + 'Aðgangur</button>' +
        '</div></td></tr>' +
        '<tr class="edrow hidden" data-edit="' + a.id + '"><td colspan="5" style="padding:0"></td></tr>';
    }).join('');
    // wire row buttons
    $('#accBody').querySelectorAll('.rowline').forEach(function (tr) {
      var id = tr.getAttribute('data-id');
      var a = state.access.find(function (x) { return String(x.id) === id; });
      tr.querySelector('[data-act="copy"]').onclick = function () { copy(urlOf(a)); };
      // 09.10.2026: opna vef kúnna án lykilorðs. Í sama flipa (virkar líka í uppsettu appi / iframe-lausu).
      tr.querySelector('[data-act="imp"]').onclick = function () {
        api({ action: 'impersonate', id: a.id }).then(function (res) {
          if (res.ok && res.url) { try { (window.top || window).location.href = res.url; } catch (_) { location.href = res.url; } }
          else toast(res.error || 'Villa');
        }).catch(function () { toast('Netvilla'); });
      };
      tr.querySelector('[data-act="edit"]').onclick = function () { toggleEditor(a); };
    });
  }

  function toggleEditor(a) {
    var row = $('#accBody [data-edit="' + a.id + '"]');
    var line = $('#accBody .rowline[data-id="' + a.id + '"]');
    if (!row.classList.contains('hidden')) { row.classList.add('hidden'); if (line) line.classList.remove('open'); return; }
    $('#accBody').querySelectorAll('.edrow').forEach(function (r) { r.classList.add('hidden'); });
    $('#accBody').querySelectorAll('.rowline').forEach(function (r) { r.classList.remove('open'); });
    if (line) line.classList.add('open');
    row.querySelector('td').innerHTML = editorHtml(a);
    row.classList.remove('hidden');
    wireEditor(a, row);
  }

  function editorHtml(a) {
    return '<div class="editor"><div class="editor-in">' +
      '<div><h3>Aðgangur — ' + esc(a.base_nafn) + '</h3>' +
        '<div class="fld"><label>Aðgangsorð (netfang)</label><input class="inp" data-f="email" value="' + esc(a.email || '') + '" placeholder="nafn@fyrirtaeki.is"></div>' +
        '<div class="fld"><label>Lykilorð</label><div class="inrow">' +
          '<input class="inp mono" data-f="pw" placeholder="' + (a.hasPassword ? '•••••••• (sett — skrifaðu nýtt til að breyta)' : 'ekkert lykilorð enn') + '">' +
          '<button class="btn btn--sm" data-act="gen">Búa til</button>' +
          (a.hasPassword ? '<button class="btn btn--sm" data-act="clearpw" title="Fjarlægja lykilorð — vefurinn opnast þá beint með raungögnum, engin innskráning">' + ic('lock') + 'Fjarlægja</button>' : '') +
        '</div></div>' +
        '<div class="note">Tómt lykilorð → vefurinn er OPINN (raungögn, engin innskráning) þar til lykilorð er sett. Um leið og lykilorð er sett krefst hann innskráningar. Til að forskoða meðan á uppsetningu stendur: hafðu lykilorðið tómt (eða ýttu á „Fjarlægja") og smelltu svo á „Opna vef".</div>' +
      '</div>' +
      '<div><h3>Hlekkur & sending</h3>' +
        '<div class="fld"><label>Vefslóð viðskiptavinar</label><div class="urlbox"><code>' + esc(urlOf(a)) + '</code><button class="btn btn--sm" data-act="copy2" title="Afrita">' + ic('copy') + '</button></div></div>' +
        '<div class="divider"></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn--sm" data-act="open">' + ic('open') + 'Opna vef</button>' +
          '<button class="btn btn--sm btn--accent" data-act="send">' + ic('mail') + 'Senda á viðskiptavin</button>' + '<span title="Svar-stöð SV-12 — textinn sem fer héðan er kortlagður þar (slokkvitaeki.netlify.app/#svarstod)" style="display:inline-block;margin-left:8px;padding:0 5px;border:1px solid currentColor;border-radius:3px;font:700 9.5px/1.5 \'JetBrains Mono\',ui-monospace,monospace;letter-spacing:.06em;vertical-align:middle;opacity:.7">SV-12</span>' +
          '<button class="btn btn--sm btn--danger" data-act="del">Aftengja</button>' +
        '</div>' +
        '<div class="note">„Senda" póstar viðskiptavini vefslóð + notandanafn (og lykilorð ef þú bjóst það til núna) gegnum Eldklár-póstinn.</div>' +
      '</div>' +
      // Útlit og upplýsingar — full breidd svo þemaspjöldin fimm komist í eina röð
      '<div class="efull"><h3>Útlit og upplýsingar</h3>' +
        '<input type="hidden" data-f="theme" value="' + esc(themeOf(a.theme).k) + '">' +
        '<div class="themes" role="radiogroup" aria-label="Þema vefsins">' + themeCards(themeOf(a.theme).k) + '</div>' +
        '<label class="tgl"><input type="checkbox" data-f="details"' + (a.show_details ? ' checked' : '') + '><span class="sw"></span>' +
          '<span><b>Nánari upplýsingar um eignir</b><small>Kúnni getur smellt á eign og séð tækjaskrá (tegund, stærð, staðsetningu, skoðunardaga), skoðanasögu, skýrslur og reikninga eignarinnar.</small></span></label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
          '<button class="btn btn--accent" data-act="save">Vista aðgang</button>' +
          '<button class="btn" data-act="toggle">' + (a.active ? 'Afvirkja' : 'Virkja') + '</button>' +
          '<span class="note" style="margin:0 0 0 6px">Netfang, lykilorð, þema og nánari upplýsingar vistast saman og gilda strax.</span>' +
        '</div>' +
      '</div>' +
    '</div></div>';
  }

  function wireEditor(a, row) {
    var emailEl = row.querySelector('[data-f="email"]');
    // þemaval: smellur (eða Enter/bil) á spjald velur; Forskoða-tengillinn opnar sýnishorn án þess að velja
    row.querySelectorAll('.tcard').forEach(function (c) {
      function pick() {
        row.querySelectorAll('.tcard').forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
        c.classList.add('on'); c.setAttribute('aria-checked', 'true');
        row.querySelector('[data-f="theme"]').value = c.getAttribute('data-theme');
      }
      c.addEventListener('click', function (e) { if (e.target.closest('.pv')) return; pick(); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    var pwEl = row.querySelector('[data-f="pw"]');
    row.querySelector('[data-act="gen"]').onclick = function () {
      api({ action: 'gen-password', id: a.id }).then(function (res) {
        if (res.password) { pwEl.value = res.password; a.hasPassword = true; copy(res.password); toast('Nýtt lykilorð búið til + afritað'); }
        else toast(res.error || 'Villa');
      });
    };
    row.querySelector('[data-act="save"]').onclick = function () {
      var body = { action: 'save', id: a.id, email: emailEl.value };
      if (pwEl.value.trim()) body.password = pwEl.value.trim();
      var themeEl = row.querySelector('[data-f="theme"]'); if (themeEl) body.theme = themeEl.value;
      var detEl = row.querySelector('[data-f="details"]'); if (detEl) body.show_details = !!detEl.checked;
      api(body).then(function (res) { if (res.ok) { toast('Vistað'); load(); } else toast(res.error || 'Villa'); });
    };
    row.querySelector('[data-act="toggle"]').onclick = function () {
      api({ action: 'toggle', id: a.id, active: !a.active }).then(function (res) { if (res.ok) { toast(a.active ? 'Afvirkjað' : 'Virkjað'); load(); } });
    };
    var clearBtn = row.querySelector('[data-act="clearpw"]');
    if (clearBtn) clearBtn.onclick = function () {
      if (!confirm('Fjarlægja lykilorð fyrir „' + a.base_nafn + '"?\nVefurinn verður þá OPINN með raungögnum (engin innskráning) — hentugt meðan á uppsetningu stendur.')) return;
      api({ action: 'clear-password', id: a.id }).then(function (res) {
        if (res.ok) { toast('Lykilorð fjarlægt — vefurinn er opinn'); load(); }
        else toast(res.error || 'Villa');
      });
    };
    row.querySelector('[data-act="copy2"]').onclick = function () { copy(urlOf(a)); };
    row.querySelector('[data-act="open"]').onclick = function () {
      // Með lykilorði krefst vefurinn innskráningar. Bjóða að fjarlægja það svo
      // hann opnist beint með raungögnum (forskoðun meðan á uppsetningu stendur).
      if (a.hasPassword) {
        if (confirm('„' + a.base_nafn + '" er með lykilorð og opnast með innskráningu.\n\nViltu fjarlægja lykilorðið svo vefurinn opnist beint með raungögnum (forskoðun, engin innskráning)?\n\nÍ lagi = fjarlægja + opna  ·  Hætta við = opna samt (með innskráningu)')) {
          api({ action: 'clear-password', id: a.id }).then(function (res) {
            if (res.ok) { a.hasPassword = false; toast('Lykilorð fjarlægt — vefurinn er nú opinn'); window.open(urlOf(a), '_blank'); load(); }
            else { toast(res.error || 'Villa'); window.open(urlOf(a), '_blank'); }
          });
          return;
        }
      }
      window.open(urlOf(a), '_blank');
    };
    row.querySelector('[data-act="send"]').onclick = function () {
      if (!emailEl.value.trim()) { toast('Settu netfang fyrst'); return; }
      var body = { action: 'send', id: a.id, to: emailEl.value.trim() };
      if (pwEl.value.trim()) body.password = pwEl.value.trim();
      api(body).then(function (res) { if (res.ok) toast('Sent á ' + res.sent_to); else toast(res.error || 'Sending mistókst'); });
    };
    row.querySelector('[data-act="del"]').onclick = function () {
      if (!confirm('Aftengja vef ' + a.base_nafn + '? Innskráning hættir að virka.')) return;
      api({ action: 'delete', id: a.id }).then(function (res) { if (res.ok) { toast('Aftengt'); load(); } });
    };
  }

  function renderMessages() {
    var el = $('#msgPanel');
    if (!state.messages.length) { el.innerHTML = '<div class="empty">Engin skilaboð.</div>'; return; }
    el.innerHTML = state.messages.map(function (m) {
      var unread = m.sender === 'kunni' && !m.read_by_staff;
      var replyHtml = m.sender === 'kunni'
        ? '<div class="reply"><input placeholder="Svara…" data-base="' + m.base_id + '"><button class="btn btn--sm btn--accent" data-reply="' + m.base_id + '">Svara</button></div>' : '';
      return '<div class="msg' + (unread ? ' unread' : '') + '">' +
        '<div class="av">' + ic(m.sender === 'kunni' ? 'bldg' : 'flame') + '</div>' +
        '<div class="body"><div class="top"><span class="from">' + esc(m.base_nafn) + (m.sender === 'starf' ? ' · svar' : '') + '</span><span class="t">' + esc(fmtDate(m.created_at)) + '</span></div>' +
        '<div class="txt">' + esc(m.body) + '</div>' + replyHtml + '</div></div>';
    }).join('');
    el.querySelectorAll('[data-reply]').forEach(function (btn) {
      btn.onclick = function () {
        var base = btn.getAttribute('data-reply');
        var inp = el.querySelector('input[data-base="' + base + '"]');
        var text = inp.value.trim(); if (!text) return;
        btn.disabled = true;
        api({ action: 'reply-msg', base_id: parseInt(base, 10), body: text }).then(function (res) {
          if (res.ok) { api({ action: 'mark-read', base_id: parseInt(base, 10) }).then(load); toast('Svar sent'); }
          else { toast(res.error || 'Villa'); btn.disabled = false; }
        });
      };
    });
  }

  // ── fyrirtækjaleit → stofna aðgang ──
  var searchTimer;
  $('#coSearch').addEventListener('input', function () {
    var q = this.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 2) { $('#coResults').classList.add('hidden'); return; }
    searchTimer = setTimeout(function () {
      gattFetch('/api/gatt-admin?q=' + encodeURIComponent(q), { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var cos = d.companies || [];
          var box = $('#coResults');
          if (!cos.length) { box.innerHTML = '<div style="color:var(--faint)">Ekkert fannst</div>'; box.classList.remove('hidden'); return; }
          box.innerHTML = cos.map(function (c) {
            var have = state.access.some(function (a) { return a.base_id === c.id; });
            return '<div data-base="' + c.id + '"' + (have ? ' style="opacity:.5"' : '') + '>' + esc(c.nafn) + '<span class="rk">' + esc(c.kennitala || '') + (have ? ' · vefur til' : '') + '</span></div>';
          }).join('');
          box.classList.remove('hidden');
          box.querySelectorAll('[data-base]').forEach(function (row) {
            row.onclick = function () {
              var base = parseInt(row.getAttribute('data-base'), 10);
              box.classList.add('hidden'); $('#coSearch').value = '';   // loka strax við val
              if (state.access.some(function (a) { return a.base_id === base; })) { toast('Vefur er þegar til fyrir þetta félag'); return; }
              api({ action: 'create', base_id: base }).then(function (res) {
                if (res.ok) { toast('Aðgangur stofnaður'); load(); }
                else toast(res.error || 'Villa');
              });
            };
          });
        });
    }, 250);
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.picker')) $('#coResults').classList.add('hidden'); });
  $('#coSearch').addEventListener('keydown', function (e) { if (e.key === 'Escape') { $('#coResults').classList.add('hidden'); this.blur(); } });

  load();
})();
