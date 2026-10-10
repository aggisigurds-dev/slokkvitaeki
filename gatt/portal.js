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
    return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(d);
  };
  var TYPE_LABEL = { uttektarskyrsla: 'Slökkvitæki', brunakerfi: 'Brunakerfi' };

  /* ── Tákn (stroke = currentColor). Lykill = merkið á spjaldinu. Engin emoji. ── */
  var ICON = {
    'Byggingar': '<path d="M4.5 21V6l7.5-3 7.5 3v15"/><path d="M2.5 21h19"/><path d="M8.5 9h2M13.5 9h2M8.5 13h2M13.5 13h2M10.5 21v-4h3v4"/>',
    'Slökkvitæki': '<rect x="8" y="8.5" width="8" height="13" rx="3"/><path d="M10 8.5V6h4v2.5"/><path d="M14 6h2.6l2.9 2.3"/><path d="M9 3.5h6"/><path d="M8 14h8"/>',
    'Brunaslöngur': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.5"/><path d="M20.5 12H23"/>',
    'Brunakerfi': '<path d="M6.5 16v-4.5a5.5 5.5 0 0 1 11 0V16l1.5 2h-14z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M3.5 9.5a9 9 0 0 1 2.3-4.6M20.5 9.5a9 9 0 0 0-2.3-4.6"/>',
    'Skoðun á tíma': '<path d="M12 2.8 4.8 5.6v5.6c0 4.7 3.1 8.5 7.2 9.9 4.1-1.4 7.2-5.2 7.2-9.9V5.6z"/><path d="m8.8 12.1 2.3 2.3 4.3-4.6"/>',
    'pdf': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5"/>',
    'mappa': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    'erindi': '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
    'las': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/>',
    'hak': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };
  function svgIc(k, w) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[k] || '') + '</svg>';
  }
  function icon(k) { return ICON[k] ? '<span class="ic" aria-hidden="true">' + svgIc(k) + '</span>' : ''; }
  // Íslensk fleirtala: 1, 21, 31 … (ekki 11) taka eintölu
  function eint(n) { return n % 10 === 1 && n % 100 !== 11; }
  function tala(n, et, ft) { return n + ' ' + (eint(n) ? et : ft); }
  // Fótlína töflu: „11 skýrslur“ eða „3 af 11 skýrslum · Klöpp“
  function foot(sel, shown, total, nf, thgf, filter) {
    var el = $(sel); if (!el) return;
    if (!total) { el.innerHTML = ''; return; }
    el.innerHTML = filter
      ? '<b>' + shown + '</b>&nbsp;af ' + tala(total, thgf[0], thgf[1]) + ' · ' + esc(filter)
      : '<b>' + total + '</b>&nbsp;' + (eint(total) ? nf[0] : nf[1]);
  }
  // Tegund sem pilla: slökkvitæki (málmlituð, tákn), brunakerfi (hlutlaus, tákn), annað án tákns
  function tegundPilla(t) {
    var s = String(t || '');
    if (!s || s === '—') return '<span class="dim">—</span>';
    if (/^brunakerfi/i.test(s)) return '<span class="tb br">' + svgIc('Brunakerfi', 1.9) + esc(s) + '</span>';
    if (/sl[öo]kkvit|uttekt|úttekt/i.test(s)) return '<span class="tb sl">' + svgIc('Slökkvitæki', 1.9) + esc(s) + '</span>';
    return '<span class="tb plain">' + esc(s) + '</span>';
  }
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


  // Sýnishorn: tækjaskrá búin til úr fjölda tækja svo spjaldið „nánari upplýsingar“ sjáist
  function demoEquipment(b) {
    var LOC = ['Móttaka', '1. hæð — gangur', '2. hæð — gangur', '3. hæð — gangur', 'Eldhús', 'Kjallari', 'Stigagangur', 'Þvottahús', 'Bílakjallari', 'Tæknirými'];
    var out = [], n = b.sl || 0, i;
    for (i = 0; i < n; i++) {
      var co2 = i % 6 === 5;
      out.push({ tegund: co2 ? 'CO2' : 'Léttvatn', staerd: co2 ? '2 kg' : '6 L', stadsetning: LOC[i % LOC.length],
        nr: 'AE2026-' + String(1000 + i * 7 + n), sidast: '2026-08-24', naest: '2027-08-24', lan: false });
    }
    for (i = 0; i < (b.slo || 0); i++) {
      out.push({ tegund: 'Brunaslanga', staerd: '25 m', stadsetning: LOC[(i + 2) % LOC.length], nr: null, sidast: '2026-08-24', naest: '2027-08-24', lan: false });
    }
    return out;
  }

  var SLUG = (function () { var m = /[?&]c=([^&]+)/.exec(location.search); return m ? decodeURIComponent(m[1]) : ''; })();
  var state = { data: null, demo: false, open: false };

  /* ── boot ── */
  function boot() {
    var demo = /[?&]demo=1/.test(location.search);
    if (demo) {
      state.demo = true;
      var qt = /[?&]theme=([a-z]+)/.exec(location.search); // ?theme=cream til að forskoða þema
      if (qt) DEMO.account.theme = qt[1];
      // Sýnishornið sýnir „nánari upplýsingar“ (?details=0 slekkur)
      DEMO.account.details = !/[?&]details=0/.test(location.search);
      if (DEMO.account.details) DEMO.buildings.forEach(function (b) { b.equipment = demoEquipment(b); });
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
          y: yearsFromStatus(b), nt: nextInspText(b), docId: null, stada: b.stada,
          id: b.id, equipment: Array.isArray(b.equipment) ? b.equipment : null };
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
    var today = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
    $('#yf-kicker').textContent = 'Staða brunavarna · uppfært ' + today;
    if (data.account && data.account.name) $('#htag').innerHTML = 'Þjónustuvefur · <b>' + esc(data.account.name) + '</b>';
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
      return '<div class="sc' + (c.dark ? ' dark' : '') + '">' + icon(c.k) + '<div class="k">' + esc(c.k) + '</div>' +
        '<div class="v">' + esc(c.v) + (c.s ? ' <small>' + esc(c.s) + '</small>' : '') + '</div></div>';
    }).join('');
  }

  function markCell(pair) {
    function m(v) { return v === 'ok' ? '<span class="ok">✓</span>' : v === 'due' ? '<span class="due">!</span>' : '<span class="no">—</span>'; }
    return '<div class="mk">' + m(pair[0]) + ' ' + m(pair[1]) + '</div>';
  }
  function renderYfirlit(bldgs) {
    var yrs = ["'23", "'24", "'25", "'26"];
    var det = !!(state.data && state.data.account && state.data.account.details);
    $('#yf-body').innerHTML = (bldgs || []).map(function (b, bi) {
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
      var cls = (b.ontime ? 'ontime' : '') + (det ? ' clk' : '');
      return '<tr data-i="' + bi + '"' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + (det ? ' title="Smelltu fyrir nánari upplýsingar um eignina"' : '') + '>' +
        '<td><div class="bcell"><span class="bic">' + svgIc('Byggingar') + '</span><div><div class="bname">' + esc(b.nafn) + '</div><div class="baddr">' + esc(b.heimilisfang) + '</div></div></div></td>' +
        '<td class="num">' + (b.sl != null ? b.sl : '—') + '</td>' +
        '<td class="num">' + (b.slo != null ? b.slo : '—') + '</td>' +
        '<td>' + (b.br ? 'Já' : '—') + '</td>' +
        '<td><div class="yrs">' + boxes + '</div></td>' +
        '<td><div class="next">' + (next || '<span class="dim">—</span>') + '</div></td>' +
        // 09.10.2026: byggingin á engin eitt skjal (docId alltaf null) — „Skjöl" opnar Skýrslur síaðar á bygginguna.
        '<td class="r"><div class="ract"><a class="pdf" href="#" data-skjol="' + esc(b.nafn) + '">' + svgIc('mappa') + 'Skjöl</a>' +
        '<button type="button" class="pdf" data-erindi-b="' + bi + '" title="Senda fyrirspurn eða bæta við þjónustu">' + svgIc('erindi') + 'Erindi</button></div></td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engar byggingar skráðar</td></tr>';
    foot('#yf-foot', (bldgs || []).length, (bldgs || []).length, ['bygging', 'byggingar'], ['byggingu', 'byggingum'], '');
  }

  function docLink(label, docId) {
    if (state.demo || !docId) return '<a class="pdf" href="#" onclick="return false">' + svgIc('pdf', 1.8) + label + '</a>';
    // Opinn ham: gatt-doc opnar skjöl félagsins með ?c=<slug> (án innskráningar).
    var href = '/api/gatt-doc?doc=' + encodeURIComponent(docId) + (state.open ? '&c=' + encodeURIComponent(SLUG) : '');
    return '<a class="pdf" href="' + href + '" target="_blank" rel="noopener">' + svgIc('pdf', 1.8) + label + '</a>';
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
        '<td>' + tegundPilla(r.tegund) + '</td>' +
        '<td class="num">' + (r.magn != null ? esc(r.magn) : '<span class="dim">—</span>') + '</td>' +
        '<td class="num">' + esc(r.ar || '') + '</td>' +
        '<td class="r">' + docLink('PDF', r.docId) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engar skýrslur skráðar</td></tr>';
    foot('#sk-foot', rows.length, (state.data.reports || []).length, ['skýrsla', 'skýrslur'], ['skýrslu', 'skýrslum'], filter);
  }

  function renderReikningar(filter) {
    var rows = (state.data.invoices || []).filter(function (r) { return !filter || r.bygging === filter; });
    $('#re-body').innerHTML = rows.map(function (r) {
      return '<tr><td class="kt">' + esc(r.nr || '—') + '</td>' +
        '<td class="num">' + esc(fmtDate(r.dags)) + '</td>' +
        '<td><span class="bname" style="font-size:17px">' + esc(r.bygging) + '</span></td>' +
        '<td>' + tegundPilla(r.tegund) + '</td>' +
        '<td class="dim">' + esc(r.lysing || '') + '</td>' +
        '<td class="r num">' + (r.upphaed != null ? esc(fmtKr(r.upphaed)) : '<span class="dim">—</span>') + '</td>' +
        '<td class="r">' + docLink('PDF', r.docId) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engir reikningar skráðir</td></tr>';
    foot('#re-foot', rows.length, (state.data.invoices || []).length, ['reikningur', 'reikningar'], ['reikningi', 'reikningum'], filter);
  }

  /* ── nav / lang / logout ── */
  function goView(v) {
    document.querySelectorAll('nav .tab').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-view') === v); });
    ['yfirlit', 'skyrslur', 'reikningar', 'skilabod'].forEach(function (name) { $('#v-' + name).classList.toggle('hidden', name !== v); });
  }
  // „Skjöl" á Yfirliti → Skýrslur síaðar á þá byggingu (smellir á sama flís og notandinn myndi gera).
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-skjol]'); if (!a) return;
    e.preventDefault();
    var n = a.getAttribute('data-skjol'); goView('skyrslur'); window.scrollTo(0, 0);
    var chips = document.querySelectorAll('#v-skyrslur .chip'), hit = null;
    chips.forEach(function (c) { if (c.getAttribute('data-b') === n) hit = c; });
    if (hit) hit.click(); else { chips.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-b') === ''); }); renderSkyrslur(n); }
  });
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
    // EN/IS þýðingar ekki komnar — takki sem gerir ekkert er falinn þar til þær koma (09.10.2026).
    var lb = $('#langBtn'); if (lb) lb.style.display = 'none';
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
    r.innerHTML = svgIc('las', 1.9) + 'Opinn aðgangur — vefurinn læsist þegar lykilorð er sett';
    document.body.appendChild(r);
  }


  /* ── NÁNARI UPPLÝSINGAR UM EIGN (portal_users.show_details) ─────────────────── */
  var drOpen = -1;
  function bldgAt(i) { return ((state.data && state.data.buildings) || [])[i] || null; }
  function openDrawer(i) {
    var b = bldgAt(i); if (!b) return;
    drOpen = i;
    $('#dr-name').textContent = b.nafn || '';
    $('#dr-addr').textContent = b.heimilisfang || '';
    var eq = b.equipment || [];
    var html = '';
    // Yfirlit eignar
    var nextHtml = (b.nt || '').split('|').filter(Boolean).map(function (line) {
      var kv = line.split(':'); var lbl = kv.shift(), val = kv.join(':').trim();
      return '<div><span class="lbl">' + esc(lbl) + ':</span> ' + esc(val) + '</div>';
    }).join('');
    var yrs = ["'23", "'24", "'25", "'26"];
    var boxes = (b.y || []).map(function (p, k) { return '<div class="yb"><div class="yy">' + yrs[k] + '</div>' + markCell(p) + '</div>'; }).join('');
    html += '<section class="dsec"><h4>Yfirlit</h4><div class="dkpis">' +
      '<div class="dk"><div class="k">Slökkvitæki</div><div class="v">' + (b.sl != null ? b.sl : '—') + '</div></div>' +
      '<div class="dk"><div class="k">Brunaslöngur</div><div class="v">' + (b.slo != null ? b.slo : '—') + '</div></div>' +
      '<div class="dk"><div class="k">Brunakerfi</div><div class="v">' + (b.br ? 'Já' : '—') + '</div></div></div>' +
      '<div class="dnext"><div class="next">' + (nextHtml || '<span class="dim">Næsta skoðun ekki skráð</span>') + '</div><div class="yrs">' + boxes + '</div></div></section>';
    // Búnaður
    var groups = {}, order = [];
    eq.forEach(function (e) { var k = (e.tegund || 'Tæki') + (e.staerd ? ' ' + e.staerd : ''); if (!groups[k]) { groups[k] = 0; order.push(k); } groups[k]++; });
    html += '<section class="dsec"><h4>Búnaður <span class="cnt">' + (eq.length ? tala(eq.length, 'tæki', 'tæki') : '') + '</span></h4>';
    if (!eq.length) html += '<div class="dpanel"><div class="dempty">Engin tæki skráð á þessa eign.</div></div>';
    else {
      html += '<div class="eqsum">' + order.map(function (k) { return tegundPilla(k).replace('</span>', ' <b>× ' + groups[k] + '</b></span>'); }).join('') + '</div>';
      html += '<div class="dpanel"><table><thead><tr><th>Tegund</th><th>Staðsetning</th><th>Síðast skoðað</th><th>Næsta skoðun</th></tr></thead><tbody>' +
        eq.map(function (e) {
          return '<tr><td><div style="font-weight:600;color:var(--ink)">' + esc(e.tegund || '—') + (e.staerd ? ' <span class="dim" style="font-weight:500">' + esc(e.staerd) + '</span>' : '') + '</div>' +
            (e.nr ? '<div class="eq-nr">Nr. ' + esc(e.nr) + '</div>' : '') + (e.lan ? '<div class="eq-nr">Lánstæki</div>' : '') + '</td>' +
            '<td class="eq-loc">' + (e.stadsetning ? esc(e.stadsetning) : '—') + '</td>' +
            '<td class="num">' + esc(fmtDate(e.sidast)) + '</td>' +
            '<td class="num">' + esc(fmtDate(e.naest)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    html += '</section>';
    // Skýrslur og reikningar eignarinnar
    var reps = (state.data.reports || []).filter(function (r) { return r.bygging === b.nafn; });
    html += '<section class="dsec"><h4>Skýrslur <span class="cnt">' + (reps.length ? tala(reps.length, 'skýrsla', 'skýrslur') : '') + '</span></h4><div class="dpanel">' +
      (reps.length ? reps.map(function (r) {
        return '<div class="drow"><span class="dd">' + esc(fmtDate(r.dags)) + '</span><span class="grow">' + tegundPilla(r.tegund) + '</span>' + docLink('PDF', r.docId) + '</div>';
      }).join('') : '<div class="dempty">Engar skýrslur skráðar.</div>') + '</div></section>';
    var invs = (state.data.invoices || []).filter(function (r) { return r.bygging === b.nafn; });
    if (invs.length) {
      html += '<section class="dsec"><h4>Reikningar <span class="cnt">' + tala(invs.length, 'reikningur', 'reikningar') + '</span></h4><div class="dpanel">' +
        invs.map(function (r) {
          return '<div class="drow"><span class="dd">' + esc(fmtDate(r.dags)) + '</span><span class="grow"><span class="kt">' + esc(r.nr || '—') + '</span> <span class="dim">' + esc(r.lysing || '') + '</span></span>' +
            '<span class="num" style="font-weight:600;color:var(--ink)">' + (r.upphaed != null ? esc(fmtKr(r.upphaed)) : '') + '</span>' + docLink('PDF', r.docId) + '</div>';
        }).join('') + '</div></section>';
    }
    $('#dr-body').innerHTML = html;
    $('#dr-body').scrollTop = 0;
    $('#dr-scrim').classList.remove('hidden');
    $('#drawer').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drOpen = -1;
    $('#dr-scrim').classList.add('hidden');
    $('#drawer').classList.add('hidden');
    if ($('#er-modal').classList.contains('hidden')) document.body.style.overflow = '';
  }

  /* ── ERINDI: fyrirspurn eða „bæta við þjónustu“ fyrir eign ───────────────────
     Fer sem venjuleg skilaboð (portal_messages) með eignina í fyrstu línu, svo
     það sést strax á stjórnsíðunni og í Skilaboð-flipanum. */
  var erB = null, erKind = 'fyrirspurn';
  function setErKind(k) {
    erKind = k;
    document.querySelectorAll('#er-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-k') === k); });
    $('#er-svc').classList.toggle('hidden', k !== 'thjonusta');
    $('#er-lbl').textContent = k === 'thjonusta' ? 'Nánari lýsing (valfrjálst)' : 'Fyrirspurn';
    $('#er-text').placeholder = k === 'thjonusta' ? 'T.d. fjöldi tækja, hæð, hvenær hentar…' : 'Skrifaðu fyrirspurnina hér…';
  }
  function openErindi(i, kind) {
    erB = bldgAt(i);
    $('#er-title').textContent = erB ? erB.nafn : 'Almennt erindi';
    $('#er-addr').textContent = erB ? (erB.heimilisfang || '') : '';
    $('#er-text').value = '';
    document.querySelectorAll('#er-svc input').forEach(function (c) { c.checked = false; });
    setErKind(kind || 'fyrirspurn');
    $('#er-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#er-text').focus(); }, 40);
  }
  function closeErindi() {
    $('#er-modal').classList.add('hidden');
    if ($('#drawer').classList.contains('hidden')) document.body.style.overflow = '';
  }
  function toast(msg) {
    var t = $('#toast'); t.innerHTML = svgIc('hak', 2) + esc(msg); t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  // Sendir skilaboð (sama leið og Skilaboð-formið, líka í opnum ham). Skilar Promise<bool>.
  function sendText(text) {
    if (state.demo) {
      state.data.messages.push({ sender: 'kunni', author_name: 'Þú', body: text, created_at: new Date().toISOString() });
      renderMessages(state.data.messages); return Promise.resolve(true);
    }
    var purl = state.open ? ('/api/gatt?c=' + encodeURIComponent(SLUG)) : '/api/gatt';
    return fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) })
      .then(function (r) { return r.ok; })
      .then(function (ok) {
        if (ok) {
          state.data.messages.push({ sender: 'kunni', author_name: (state.data.account && state.data.account.name) || 'Þú', body: text, created_at: new Date().toISOString() });
          renderMessages(state.data.messages);
        }
        return ok;
      })
      .catch(function () { return false; });
  }
  $('#er-seg').addEventListener('click', function (e) { var bt = e.target.closest('button[data-k]'); if (bt) setErKind(bt.getAttribute('data-k')); });
  $('#er-close').onclick = closeErindi;
  $('#er-modal').addEventListener('mousedown', function (e) { if (e.target === this) closeErindi(); });
  $('#er-form').onsubmit = function (e) {
    e.preventDefault();
    var msg = $('#er-text').value.trim();
    var svc = []; document.querySelectorAll('#er-svc input:checked').forEach(function (c) { svc.push(c.value); });
    if (erKind === 'thjonusta' && !svc.length && !msg) { toast('Veldu þjónustu eða skrifaðu lýsingu'); return; }
    if (erKind === 'fyrirspurn' && !msg) { $('#er-text').focus(); return; }
    var where = erB ? (erB.nafn + (erB.heimilisfang ? ' (' + erB.heimilisfang + ')' : '')) : '';
    var head = (erKind === 'thjonusta' ? 'Beiðni um þjónustu' : 'Fyrirspurn') + (where ? ' — ' + where : '');
    var text = head + (svc.length ? '\nÞjónusta: ' + svc.join(', ') : '') + (msg ? '\n\n' + msg : '');
    var btn = $('#er-send'); btn.disabled = true;
    sendText(text).then(function (ok) {
      btn.disabled = false;
      if (ok) { closeErindi(); toast(erKind === 'thjonusta' ? 'Beiðnin er send — við höfum samband' : 'Fyrirspurnin er send'); }
      else toast('Sending tókst ekki — reyndu aftur');
    });
  };
  $('#dr-close').onclick = closeDrawer;
  $('#dr-scrim').onclick = closeDrawer;
  document.querySelectorAll('[data-dr-erindi]').forEach(function (bt) {
    bt.onclick = function () { openErindi(drOpen, bt.getAttribute('data-dr-erindi')); };
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('#er-modal').classList.contains('hidden')) closeErindi();
    else if (!$('#drawer').classList.contains('hidden')) closeDrawer();
  });
  // Yfirlit: „Erindi“ á hverri eign + smellur á röð opnar nánari upplýsingar (ef hakað)
  document.addEventListener('click', function (e) {
    var t = e.target;
    var er = t.closest && t.closest('[data-erindi-b]');
    if (er) { e.preventDefault(); openErindi(Number(er.getAttribute('data-erindi-b')), 'fyrirspurn'); return; }
    var tr = t.closest && t.closest('#yf-body tr.clk');
    if (tr && !t.closest('a,button')) openDrawer(Number(tr.getAttribute('data-i')));
  });

  boot();
})();
