/* portal.js — Þjónustuvefur (kúndavefur) framendi.
 * Sækir gögn úr /api/gatt (innskráð session). ?demo=1 sýnir hönnunina með
 * sýnishorns-gögnum (engin auðkenning) svo hægt sé að skoða útlitið á forskoðun.
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var fmtKr = function (n) { return (n == null || n === '') ? '—' : Number(n).toLocaleString('is-IS') + ' kr.'; };
  var fmtDate = function (d) {
    if (!d) return '—';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
    return m ? (m[3] + '.' + m[2] + '.' + m[1]) : String(d);
  };
  var TYPE_LABEL = { uttektarskyrsla: 'Slökkvitæki', brunakerfi: 'Brunakerfi' };
  var INV_TEG = { uttekt: 'Slökkvitæki', brunakerfi: 'Brunakerfi', bud: 'Búð', ovisst: 'Óvíst' };

  /* ── SÝNISHORN (úr v3 Steel hönnun) ── */
  var DEMO = {
    account: { name: 'Center Hótel', theme: 'steel' },
    stats: [
      { k: 'Byggingar', v: '10' }, { k: 'Slökkvitæki', v: '155' }, { k: 'Brunaslöngur', v: '77' },
      { k: 'Brunakerfi', v: '9', s: 'hús' }, { k: 'Skoðun á tíma', v: '1', s: 'hús', dark: true },
    ],
    buildings: [
      { nafn: 'Arnarhvoll', heimilisfang: 'Ingólfsstræti 1, 101 Reykjavík', sl: 13, slo: 8, br: true, y: [['no', 'no'], ['ok', 'ok'], ['ok', 'ok'], ['no', 'ok']], nt: 'Tæki: janúar 2026|Kerfi: maí 2027' },
      { nafn: 'Grandi', heimilisfang: 'Seljavegur 2, 101 Reykjavík', sl: 14, slo: 11, br: true, y: [['ok', 'ok'], ['ok', 'ok'], ['ok', 'ok'], ['ok', 'ok']], nt: 'Tæki: janúar 2027|Kerfi: mars 2027' },
      { nafn: 'Hlaðvarpinn', heimilisfang: 'Aðalstræti 4, 101 Reykjavík', sl: null, slo: null, br: false, y: [['no', 'no'], ['no', 'no'], ['no', 'no'], ['no', 'no']], nt: 'Tæki: —' },
      { nafn: 'Klöpp', heimilisfang: 'Klapparstígur 26, 101 Reykjavík', sl: 18, slo: 10, br: true, y: [['no', 'ok'], ['ok', 'ok'], ['ok', 'ok'], ['ok', 'no']], nt: 'Tæki: júlí 2027|Kerfi: nóvember 2026' },
      { nafn: 'Laugavegur', heimilisfang: 'Laugavegur 95–99, 101 Reykjavík', sl: 15, slo: null, br: true, y: [['ok', 'no'], ['ok', 'ok'], ['ok', 'ok'], ['ok', 'no']], nt: 'Tæki: ágúst 2027|Kerfi: september 2026' },
      { nafn: 'Miðgarður', heimilisfang: 'Laugavegur 120, 101 Reykjavík', sl: 31, slo: null, br: true, y: [['ok', 'no'], ['ok', 'ok'], ['no', 'ok'], ['ok', 'no']], nt: 'Tæki: september 2027|Kerfi: september 2026' },
      { nafn: 'Plaza', heimilisfang: 'Aðalstræti 4–6, 101 Reykjavík', sl: 44, slo: 39, br: true, y: [['ok', 'no'], ['ok', 'ok'], ['ok', 'ok'], ['no', 'no']], nt: 'Tæki: ágúst 2026|Kerfi: desember 2026' },
      { nafn: 'Skjaldbreið', heimilisfang: 'Laugavegur 16, 101 Reykjavík', sl: 3, slo: null, br: true, y: [['no', 'ok'], ['ok', 'ok'], ['ok', 'ok'], ['ok', 'no']], nt: 'Tæki: júlí 2027|Kerfi: september 2026' },
    ],
    reports: [
      { dags: '2026-08-03', bygging: 'Klöpp', heimilisfang: 'Klapparstígur 26', tegund: 'Slökkvitæki og slöngur', magn: '18 + 10', ar: 2026 },
      { dags: '2026-08-03', bygging: 'Skjaldbreið', heimilisfang: 'Laugavegur 16', tegund: 'Slökkvitæki', magn: '3', ar: 2026 },
      { dags: '2026-05-01', bygging: 'Arnarhvoll', heimilisfang: 'Ingólfsstræti 1', tegund: 'Brunakerfi', magn: null, ar: 2026 },
      { dags: '2026-03-01', bygging: 'Grandi', heimilisfang: 'Seljavegur 2', tegund: 'Brunakerfi', magn: null, ar: 2026 },
      { dags: '2026', bygging: 'Grandi', heimilisfang: 'Seljavegur 2', tegund: 'Slökkvitæki og slöngur', magn: '14 + 11', ar: 2026 },
      { dags: '2025-12-01', bygging: 'Plaza', heimilisfang: 'Aðalstræti 4–6', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-10-01', bygging: 'Klöpp', heimilisfang: 'Klapparstígur 26', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-09-01', bygging: 'Laugavegur', heimilisfang: 'Laugavegur 95–99', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-09-01', bygging: 'Miðgarður', heimilisfang: 'Laugavegur 120', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-09-01', bygging: 'Skjaldbreið', heimilisfang: 'Laugavegur 16', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-09-01', bygging: 'Þingholt', heimilisfang: 'Þingholtsstræti 3–5', tegund: 'Brunakerfi', magn: null, ar: 2025 },
    ],
    invoices: [
      { nr: 'R-000668', dags: '2026-08-03', bygging: 'Klöpp', lysing: 'Úttekt — slökkvitæki og brunaslöngur', upphaed: 174747, tegund: 'Slökkvitæki' },
      { nr: 'R-000670', dags: '2026-08-03', bygging: 'Skjaldbreið', lysing: 'Úttekt — slökkvitæki', upphaed: 19778, tegund: 'Slökkvitæki' },
      { nr: 'R-107802', dags: '2026', bygging: 'Plaza', lysing: 'Þjónusta', upphaed: null, tegund: 'Slökkvitæki' },
      { nr: 'R-108001', dags: '2026', bygging: 'Grandi', lysing: 'Þjónusta', upphaed: null, tegund: 'Brunakerfi' },
      { nr: 'R-108134', dags: '2026', bygging: 'Grandi', lysing: 'Þjónusta', upphaed: null },
      { nr: 'R-107257', dags: '2025', bygging: 'Plaza', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107258', dags: '2025', bygging: 'Arnarhvoll', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107259', dags: '2025', bygging: 'Miðgarður', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107260', dags: '2025', bygging: 'Laugavegur', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107261', dags: '2025', bygging: 'Þingholt', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107053', dags: '2025', bygging: 'Skjaldbreið', lysing: 'Þjónusta', upphaed: null },
    ],
    messages: [
      { sender: 'starf', author_name: 'Slökkvitæki', body: 'Sæl! Úttekt á Klöpp er lokið og skýrslan komin inn.', created_at: '2026-08-03T10:12:00' },
      { sender: 'kunni', author_name: 'Center Hótel', body: 'Takk fyrir! Getið þið sent afrit af reikningi fyrir Skjaldbreið?', created_at: '2026-08-04T09:20:00' },
    ],
  };

  var SLUG = (function () { var m = /[?&]c=([^&]+)/.exec(location.search); return m ? decodeURIComponent(m[1]) : ''; })();
  var state = { data: null, demo: false, open: false };

  /* ── boot ── */
  function boot() {
    var demo = /[?&]demo=1/.test(location.search);
    if (demo) {
      state.demo = true;
      var qt = /[?&]theme=([a-z]+)/.exec(location.search); // ?theme=cream til að forskoða þema
      if (qt) DEMO.account.theme = qt[1];
      renderPortal(DEMO); showDemoRibbon(); return;
    }
    fetch('/api/gatt', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.ok) return r.json().then(function (d) { renderPortal(normalize(d)); });
        return gateBySlug();   // ekki innskráð → athuga slug-stöðu
      })
      .catch(function () { gateBySlug(); });
  }

  // Ekki innskráð: innskráningarglugginn opnast AÐEINS ef félags-URL er virkt
  // (aðgangsorð+lykilorð sett). Annars „vefurinn ekki virkur enn".
  function gateBySlug() {
    if (!SLUG) { showLogin(); return; }
    return fetch('/api/gatt-status?c=' + encodeURIComponent(SLUG), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (s && s.theme) document.documentElement.setAttribute('data-theme', s.theme);
        if (s && s.active) showLogin();       // lykilorð virkt → innskráning
        else if (s && s.open) openBoot();      // opinn forsýnar-aðgangur → raungögn án innskráningar
        else showNotReady(s && s.name);
      })
      .catch(function () { showLogin(); });
  }

  // Opinn aðgangur (virkur + ekkert lykilorð): sækir raungögn félagsins um
  // slug ÁN innskráningar. Læsist um leið og lykilorð er sett.
  function openBoot() {
    fetch('/api/gatt?c=' + encodeURIComponent(SLUG), { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { state.open = true; renderPortal(normalize(d)); showOpenRibbon(); })
      .catch(function () { showNotReady(); });
  }
  function showNotReady(name) {
    $('#login').classList.add('hidden');
    $('#portal').classList.add('hidden');
    if (name) $('#notready-name').textContent = 'Aðgangur fyrir ' + name + ' hefur ekki verið virkjaður enn.';
    $('#notready').classList.remove('hidden');
  }

  /* Map API-svar → sama form og DEMO */
  function normalize(d) {
    var s = d.stats || {};
    return {
      account: d.account || {},
      stats: [
        { k: 'Byggingar', v: s.byggingar != null ? String(s.byggingar) : '—' },
        { k: 'Slökkvitæki', v: s.taeki_alls != null ? String(s.taeki_alls) : '—' },
        { k: 'Brunaslöngur', v: s.brunaslongur_alls != null ? String(s.brunaslongur_alls) : '—' },
        { k: 'Brunakerfi', v: s.brunakerfi_stk != null ? String(s.brunakerfi_stk) : '—', s: 'hús' },
        { k: 'Skoðun á tíma', v: s.i_lagi != null ? String(s.i_lagi) : '—', s: 'hús', dark: true },
      ],
      buildings: (d.buildings || []).map(function (b) {
        return { nafn: b.nafn, heimilisfang: b.heimilisfang, sl: b.taeki, slo: b.slo, br: !!b.bru_i_thjonustu,
          y: yearsFromStatus(b), nt: nextInspText(b), docId: null, stada: b.stada };
      }),
      reports: (d.reports || []).map(function (r) {
        return { docId: r.docId, dags: r.dags || r.ar, bygging: r.bygging, heimilisfang: '', tegund: TYPE_LABEL[r.tegund] || r.tegund, magn: r.magn, ar: r.ar };
      }),
      invoices: (d.invoices || []).map(function (i) {
        return { docId: i.docId, nr: i.nr, dags: i.dags || i.ar, bygging: i.bygging, lysing: i.lysing || '', upphaed: i.upphaed, tegund: INV_TEG[i.tegund] || i.tegund || '' };
      }),
      messages: d.messages || [],
    };
  }
  var MONTHS_IS = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  function lastDocYear(arr) {
    var m = 0;
    (arr || []).forEach(function (y) { var n = Number(y); if (n > m) m = n; });
    return m || null;
  }
  // Tvær línur þegar húsið er í báðum þjónustum — slökk og brunakerfi ráða
  // hvor sinni dagsetningu. Aldrei eitt „næsta skoðun" fyrir báðar.
  function nextInspText(b) {
    var lines = [];
    function line(lbl, month, last) {
      if (!month || month < 1 || month > 12) return;
      var yr = last ? (Number(last) + 1) : null;
      lines.push(lbl + ': ' + MONTHS_IS[month - 1] + (yr ? ' ' + yr : ''));
    }
    if (b.i_thjonustu !== false) line('Tæki', b.skodun_manudur, lastDocYear(b.ar_slokk) || b.sidasta_ar);
    if (b.bru_i_thjonustu) line('Kerfi', b.bru_skodun_manudur, lastDocYear(b.ar_bru));
    return lines.join('|');
  }

  function yearsFromStatus(b) {
    // Hvert ár sýnir tvö merki: [slökkvitæki, brunakerfi].
    // AÐEINS ár þar sem raunverulegt skjal er til á ÞESSU fyrirtaeki_id.
    // Aldrei fylla slökk áfram frá sidasta_ar (Miðgarður '25 / Plaza '26).
    var sl = {}; (b.ar_slokk || []).forEach(function (y) { sl[String(y)] = 1; });
    var bru = {}; (b.ar_bru || []).forEach(function (y) { bru[String(y)] = 1; });
    return ['2023', '2024', '2025', '2026'].map(function (y) {
      return [sl[y] ? 'ok' : 'no', bru[y] ? 'ok' : 'no'];
    });
  }

  /* ── LOGIN ── */
  function showLogin(msg) {
    $('#portal').classList.add('hidden');
    $('#notready').classList.add('hidden');
    $('#login').classList.remove('hidden');
    if (msg) $('#lerr').textContent = msg;
  }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#lerr').textContent = '';
    var email = $('#email').value, password = $('#password').value;
    fetch('/api/gatt-login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) { $('#login').classList.add('hidden'); boot(); }
        else $('#lerr').textContent = res.j.error || 'Rangt netfang eða lykilorð';
      })
      .catch(function () { $('#lerr').textContent = 'Villa við innskráningu. Reyndu aftur.'; });
  });

  /* ── PORTAL ── */
  function renderPortal(data) {
    state.data = data;
    document.documentElement.setAttribute('data-theme', (data.account && data.account.theme) || 'steel');
    $('#login').classList.add('hidden');
    $('#portal').classList.remove('hidden');
    var lo = $('#logoutBtn'); if (lo) lo.style.display = state.open ? 'none' : '';  // ekkert að útskrá í opnum ham
    var d = new Date();
    var today = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
    $('#yf-kicker').textContent = 'Staða brunavarna · uppfært ' + today;
    renderCards(data.stats);
    renderYfirlit(data.buildings);
    renderChips('#sk-chips', data.reports, renderSkyrslur);
    renderChips('#re-chips', data.invoices, renderReikningar);
    renderSkyrslur('');
    renderReikningar('');
    renderMessages(data.messages);
    wireNav();
  }

  function renderMessages(msgs) {
    msgs = msgs || [];
    var box = $('#msg-thread');
    if (!msgs.length) { box.innerHTML = '<div class="msg-empty">Engin skilaboð enn. Sendu okkur fyrirspurn hér að neðan.</div>'; }
    else {
      box.innerHTML = msgs.map(function (m) {
        var who = m.sender === 'kunni' ? (m.author_name || 'Þú') : 'Slökkvitæki ehf.';
        return '<div class="msg-bubble ' + (m.sender === 'kunni' ? 'kunni' : 'starf') + '">' +
          '<div class="who">' + esc(who) + '</div>' + esc(m.body) +
          '<div class="t">' + esc(fmtDate(m.created_at)) + '</div></div>';
      }).join('');
      box.scrollTop = box.scrollHeight;
    }
  }

  function renderCards(stats) {
    $('#cards').innerHTML = (stats || []).map(function (c) {
      return '<div class="sc' + (c.dark ? ' dark' : '') + '"><div class="k">' + esc(c.k) + '</div>' +
        '<div class="v">' + esc(c.v) + (c.s ? ' <small>' + esc(c.s) + '</small>' : '') + '</div></div>';
    }).join('');
  }

  function markCell(pair) {
    function m(v) { return v === 'ok' ? '✓' : v === 'due' ? '<span class="due">!</span>' : '<span class="no">—</span>'; }
    return '<div class="mk">' + m(pair[0]) + ' ' + m(pair[1]) + '</div>';
  }
  function renderYfirlit(bldgs) {
    var yrs = ["'23", "'24", "'25", "'26"];
    $('#yf-body').innerHTML = (bldgs || []).map(function (b) {
      var boxes = (b.y || []).map(function (p, i) {
        return '<div class="yb"><div class="yy">' + yrs[i] + '</div>' + markCell(p) + '</div>';
      }).join('');
      var next = '';
      if (b.nt) {
        var parts = b.nt.split('|');
        next = parts.map(function (line) {
          var kv = line.split(':');
          var lbl = kv.shift(), val = kv.join(':').trim();
          var isOn = b.ontime && val.indexOf(b.ontime) > -1;
          return '<div><span class="lbl">' + esc(lbl) + ':</span> ' + (isOn ? '<b>' + esc(val) + '</b><span class="badge">Á tíma</span>' : esc(val)) + '</div>';
        }).join('');
      }
      return '<tr' + (b.ontime ? ' class="ontime"' : '') + '>' +
        '<td><div class="bname">' + esc(b.nafn) + '</div><div class="baddr">' + esc(b.heimilisfang) + '</div></td>' +
        '<td class="num">' + (b.sl != null ? b.sl : '—') + '</td>' +
        '<td class="num">' + (b.slo != null ? b.slo : '—') + '</td>' +
        '<td>' + (b.br ? 'Já' : '—') + '</td>' +
        '<td><div class="yrs">' + boxes + '</div></td>' +
        '<td><div class="next">' + (next || '<span class="dim">—</span>') + '</div></td>' +
        '<td class="r">' + docLink('Skjöl', b.docId) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engar byggingar skráðar</td></tr>';
  }

  function docLink(label, docId) {
    if (state.demo || !docId) return '<a class="pdf" href="#" onclick="return false">' + label + '</a>';
    // Opinn ham: gatt-doc opnar skjöl félagsins með ?c=<slug> (án innskráningar).
    var href = '/api/gatt-doc?doc=' + encodeURIComponent(docId) + (state.open ? '&c=' + encodeURIComponent(SLUG) : '');
    return '<a class="pdf" href="' + href + '" target="_blank" rel="noopener">' + label + '</a>';
  }

  function buildingsOf(rows) {
    var seen = {}, out = [];
    (rows || []).forEach(function (r) { if (r.bygging && !seen[r.bygging]) { seen[r.bygging] = 1; out.push(r.bygging); } });
    return out;
  }
  function renderChips(sel, rows, onPick) {
    var names = buildingsOf(rows);
    var html = '<button class="chip on" data-b="">Allar byggingar</button>' +
      names.map(function (n) { return '<button class="chip" data-b="' + esc(n) + '">' + esc(n) + '</button>'; }).join('');
    var box = $(sel); box.innerHTML = html;
    box.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        box.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        onPick(c.getAttribute('data-b'));
      });
    });
  }

  function renderSkyrslur(filter) {
    var rows = (state.data.reports || []).filter(function (r) { return !filter || r.bygging === filter; });
    $('#sk-body').innerHTML = rows.map(function (r) {
      return '<tr><td class="num">' + esc(fmtDate(r.dags)) + '</td>' +
        '<td><span class="bname" style="font-size:17px">' + esc(r.bygging) + '</span></td>' +
        '<td class="dim">' + esc(r.heimilisfang || '') + '</td>' +
        '<td><span class="tb">' + esc(r.tegund) + '</span></td>' +
        '<td class="num">' + (r.magn != null ? esc(r.magn) : '<span class="dim">—</span>') + '</td>' +
        '<td class="num">' + esc(r.ar || '') + '</td>' +
        '<td class="r">' + docLink('PDF ⬇', r.docId) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engar skýrslur skráðar</td></tr>';
  }

  function renderReikningar(filter) {
    var rows = (state.data.invoices || []).filter(function (r) { return !filter || r.bygging === filter; });
    $('#re-body').innerHTML = rows.map(function (r) {
      return '<tr><td class="kt">' + esc(r.nr || '—') + '</td>' +
        '<td class="num">' + esc(fmtDate(r.dags)) + '</td>' +
        '<td><span class="bname" style="font-size:17px">' + esc(r.bygging) + '</span></td>' +
        '<td><span class="tb">' + esc(r.tegund || '—') + '</span></td>' +
        '<td class="dim">' + esc(r.lysing || '') + '</td>' +
        '<td class="r num">' + (r.upphaed != null ? esc(fmtKr(r.upphaed)) : '<span class="dim">—</span>') + '</td>' +
        '<td class="r">' + docLink('PDF ⬇', r.docId) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engir reikningar skráðir</td></tr>';
  }

  /* ── nav / lang / logout ── */
  function wireNav() {
    document.querySelectorAll('nav .tab').forEach(function (t) {
      t.onclick = function () {
        document.querySelectorAll('nav .tab').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on');
        var v = t.getAttribute('data-view');
        ['yfirlit', 'skyrslur', 'reikningar', 'skilabod'].forEach(function (name) {
          $('#v-' + name).classList.toggle('hidden', name !== v);
        });
      };
    });
    $('#logoutBtn').onclick = function () {
      if (state.demo) { showLogin(); return; }
      fetch('/api/gatt-login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
        .then(function () { location.reload(); });
    };
    $('#langBtn').onclick = function () { /* EN/IS þýðingar koma síðar */ };
    $('#msg-form').onsubmit = function (e) {
      e.preventDefault();
      var inp = $('#msg-input'), text = inp.value.trim();
      if (!text) return;
      if (state.demo) {
        state.data.messages.push({ sender: 'kunni', author_name: 'Þú', body: text, created_at: new Date().toISOString() });
        renderMessages(state.data.messages); inp.value = ''; return;
      }
      var btn = e.target.querySelector('button'); btn.disabled = true;
      var purl = state.open ? ('/api/gatt?c=' + encodeURIComponent(SLUG)) : '/api/gatt';
      fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) })
        .then(function (r) { return r.json(); })
        .then(function () {
          state.data.messages.push({ sender: 'kunni', author_name: state.data.account.name || 'Þú', body: text, created_at: new Date().toISOString() });
          renderMessages(state.data.messages); inp.value = '';
        })
        .catch(function () {})
        .then(function () { btn.disabled = false; });
    };
  }

  function showDemoRibbon() {
    var r = document.createElement('div'); r.className = 'demo-ribbon'; r.textContent = 'Sýnishorn';
    document.body.appendChild(r);
  }

  function showOpenRibbon() {
    var r = document.createElement('div'); r.className = 'open-ribbon';
    r.textContent = '🔓 Opinn aðgangur — vefurinn læsist þegar lykilorð er sett';
    r.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:60;padding:6px 14px;border-radius:99px;font-size:12px;font-weight:600;background:rgba(138,109,47,.96);color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.22);max-width:92vw;text-align:center';
    document.body.appendChild(r);
  }

  boot();
})();
