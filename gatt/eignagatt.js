/* eignagatt.js — Þjónustugáttin sem eignaumsjón (11.10.2026, Agnar: „high professional building manager system").
 *
 *   GattPunktar      verkbeiðni sem PUNKTUR á teikningu hæðar (eða án teikningar) með mynd → mál á Þjónustuborði;
 *                    punkturinn er rauður (móttekið), gulur (í vinnslu) og grænn þegar lagað með eftirmynd.
 *                    Verk með ábyrgð „eigandi"/„annar" klárar kúnninn sjálfur með eftirmynd.
 *   GattVinnusvaedi  „Mitt vinnusvæði": verkefni (gátlisti), dagatal, kort með leit í Landeignaskrá og „Bæta við eign",
 *                    niðurhal (CSV), skjöl og hlekkir á borði kúnnans. Röð eininga eins og á Þjónustuborðinu.
 *
 * Hleðst Á UNDAN portal.js (notar window.Gatt sem portal.js setur upp í lok sinnar IIFE — aðeins kallað eftir boot).
 * Skrif fara öll um /api/gatt (POST action …) — sama leið í opnum ham (?c=slug). ?demo=1 skrifar ekkert.
 */
(function () {
  'use strict';
  var G = function () { return window.Gatt; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var fmtDate = function (d) { if (!d) return '—'; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d)); return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(d); };
  var LIT = { mottekid: '#c0392b', i_vinnslu: '#c48a1a', lokid: '#1f7a44' };
  var ABYRGD = { okkar: 'Slökkvitæki ehf.', eigandi: 'Eigandi sjálfur', annar: 'Annar verktaki' };
  var STADA = { mottekid: 'Móttekið', i_vinnslu: 'Í vinnslu', lokid: 'Lokið' };
  function ic(k, w) { return G().svgIc(k, w); }
  function toast(m) { G().toast(m); }
  function st() { return G().state; }
  function data() { return st().data || {}; }
  function erindi() { return data().erindi || []; }
  function syn() { return G().synOf(); }
  function allarEignir() { return (data().buildings || []).concat(data().eignir_utan || []); }
  function eignAfId(id) { return G().eignAfId(id); }
  function api(body) {
    var s = st();
    if (s.demo) return Promise.resolve({ ok: true, j: { ok: true, demo: true } });
    var purl = s.open ? ('/api/gatt?c=' + encodeURIComponent(G().SLUG())) : '/api/gatt';
    return fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .catch(function () { return { ok: false, j: { error: 'Engin tenging' } }; });
  }
  // Mynd úr skrá → smækkuð JPEG (≤1600 px) sem dataURL; skilar {data, w, h}
  function minnkaMynd(file, hamark) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) { rej(new Error('ekki mynd')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, (hamark || 1600) / Math.max(img.naturalWidth, img.naturalHeight, 1));
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res({ data: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('mynd')); };
      img.src = url;
    });
  }
  function lesaSkra(file) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result)); }; r.onerror = function () { rej(new Error('skrá')); }; r.readAsDataURL(file); });
  }
  function lokaLikama() { if ($('#drawer').classList.contains('hidden') && $('#er-modal').classList.contains('hidden') && $('#lb').classList.contains('hidden')) document.body.style.overflow = ''; }
  function myndaRod(L, merki) {
    if (!L || !L.length) return '';
    return '<div class="vb-myndir">' + L.map(function (m) { return '<a href="' + esc(m.url) + '" target="_blank" rel="noopener" class="vb-th' + (merki ? ' eftir' : '') + '"><img src="' + esc(m.url) + '" alt="' + (merki ? 'Eftirmynd' : 'Mynd') + '" loading="lazy">' + (merki ? '<span>Eftir</span>' : '') + '</a>'; }).join('') + '</div>';
  }

  /* ═══ PUNKTAR ═══════════════════════════════════════════════════════════ */
  var placing = null;   // { fid, haed, nafn }
  var vbB = null, vbPkt = null;   // eign og punktur í opna glugganum
  function punktarHaedar(fid, haed) {
    return erindi().filter(function (e) { return e.fid === fid && e.punktur && +e.punktur.haed === haed; });
  }
  // Teiknar punktana ofan á teikninguna (kallað úr teiknaHaed í portal.js með kvarðanum sem merkin nota)
  function teikna(c, f, g) {
    c._geo = g; c._pts = [];
    if (f._fid == null || f._haed == null) return;
    var L = punktarHaedar(f._fid, f._haed); if (!L.length) return;
    var x = c.getContext('2d'), r = Math.max(7, c.width / 75);
    L.forEach(function (e, i) {
      var px = (e.punktur.x - g.sk.x) * g.k0 * g.k, py = (e.punktur.y - g.sk.y) * g.k0 * g.k;
      if (px < -r || py < -r || px > c.width + r || py > c.height + r) return;
      x.beginPath(); x.arc(px, py, r + 2.5, 0, 2 * Math.PI); x.fillStyle = 'rgba(255,255,255,.95)'; x.fill();
      x.beginPath(); x.arc(px, py, r, 0, 2 * Math.PI); x.fillStyle = LIT[e.stada] || LIT.mottekid; x.fill();
      x.lineWidth = Math.max(1.2, r * 0.18); x.strokeStyle = 'rgba(0,0,0,.35)'; x.stroke();
      if (e.stada === 'lokid') { x.beginPath(); x.moveTo(px - r * 0.45, py); x.lineTo(px - r * 0.12, py + r * 0.35); x.lineTo(px + r * 0.5, py - r * 0.38); x.lineWidth = Math.max(1.5, r * 0.22); x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); }
      else { x.font = '700 ' + Math.round(r * 1.15) + 'px ' + (getComputedStyle(document.body).getPropertyValue('--ui') || 'sans-serif'); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), px, py + r * 0.05); }
      c._pts.push({ e: e, px: px, py: py, r: r });
    });
  }
  // Músarstaða → striga-dílar (strigi með object-fit:contain í kassanum sínum)
  function hnit(ev, c) {
    var rect = c.getBoundingClientRect();
    var s = Math.min(rect.width / c.width, rect.height / c.height), dw = c.width * s, dh = c.height * s;
    var ox = rect.left + (rect.width - dw) / 2, oy = rect.top + (rect.height - dh) / 2;
    var px = (ev.clientX - ox) / s, py = (ev.clientY - oy) / s;
    if (px < 0 || py < 0 || px > c.width || py > c.height) return null;
    return { px: px, py: py, s: s };
  }
  function frumdilar(c, p) { var g = c._geo; return { x: Math.round(p.px / (g.k0 * g.k) + g.sk.x), y: Math.round(p.py / (g.k0 * g.k) + g.sk.y) }; }
  // Smellur á teikningu (spjald eða ljósmynd): staðsetning nýs punkts, eða opna punkt sem hitt var á. Skilar true ef tekið.
  function smellur(ev, f, b, box) {
    box = box || ev.currentTarget; var c = box && box.querySelector('canvas');
    if (!c || !c._geo) return false;
    var p = hnit(ev, c);
    if (!p) { if (placing && placing.fid === f._fid && placing.haed === f._haed) { toast('Smelltu innan teikningarinnar (hvíti ramminn utan um blaðið telst ekki)'); return true; } return false; }
    if (placing && placing.fid === f._fid && placing.haed === f._haed) {
      var o = frumdilar(c, p);
      haettaPlacing();
      opnaVb(b || eignAfId(f._fid), { haed: f._haed, nafn: f.nafn || ('Hæð ' + (f._haed + 1)), x: o.x, y: o.y });
      return true;
    }
    var hit = null;
    (c._pts || []).forEach(function (q) { var d = Math.hypot(q.px - p.px, q.py - p.py); if (d <= q.r * 1.6 && (!hit || d < hit.d)) hit = { q: q, d: d }; });
    if (hit) { synaPop(hit.q.e, ev.clientX, ev.clientY); return true; }
    // Stækkaða teikningin: smellur á blaðið merkir beint — enginn takki þarf að vera á (Agnar 11.10 kl. 23:32:
    // „fékk teikninguna en fékk ekki gluggann")
    if (box.id === 'lb-m' && syn().punktar && f.mynd && f._fid != null) {
      var o2 = frumdilar(c, p);
      haettaPlacing();
      opnaVb(b || eignAfId(f._fid), { haed: f._haed, nafn: f.nafn || ('Hæð ' + (f._haed + 1)), x: o2.x, y: o2.y });
      return true;
    }
    return false;
  }
  function byrjaPlacing(b, f) {
    placing = { fid: f._fid, haed: f._haed, nafn: f.nafn };
    document.querySelectorAll('.fcard').forEach(function (k) { k.classList.toggle('placing', !!(k._f && k._f._fid === f._fid && k._f._haed === f._haed)); });
    $('#lb').classList.toggle('placing', !$('#lb').classList.contains('hidden'));
    var m = $('#lb-merkja'); if (m) m.classList.add('on');
    toast('Smelltu á teikninguna þar sem verkið er');
  }
  function haettaPlacing() {
    placing = null;
    document.querySelectorAll('.fcard.placing').forEach(function (k) { k.classList.remove('placing'); });
    $('#lb').classList.remove('placing');
    var m = $('#lb-merkja'); if (m) m.classList.remove('on');
  }
  // Hnappur á hæðarspjaldi: „+ Punktur" (kallað úr haedarSpjald í portal.js)
  function spjald(k, b, f) {
    if (!syn().punktar || !f.mynd) return;
    var h = k.querySelector('.fcard-h'); if (!h) return;
    var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'vb-plus'; bt.title = 'Setja verkbeiðni sem punkt á teikninguna';
    bt.innerHTML = ic('plus', 2.2) + '<span>Punktur</span>';
    bt.onclick = function (e) { e.stopPropagation(); if (k._ham !== 'teikning') { k._ham = 'teikning'; k.querySelectorAll('.fseg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-ham') === 'teikning'); }); G().synaHaed(k.querySelector('.fm'), f, 'teikning'); } byrjaPlacing(b, f); };
    h.appendChild(bt);
    var n = punktarHaedar(f._fid, f._haed).length;
    if (n) { var sp = document.createElement('small'); sp.className = 'vb-n'; sp.textContent = n + (n === 1 ? ' verkbeiðni' : ' verkbeiðnir'); h.querySelector('span').appendChild(sp); }
  }
  function lbOpin(b, f, ham) {
    var m = $('#lb-merkja'); if (!m) return;
    m.classList.toggle('hidden', !(syn().punktar && f.mynd && ham === 'teikning'));
    // merking í gangi af spjaldinu heldur áfram í stækkuðu teikningunni
    m.classList.toggle('on', !!(placing && placing.fid === f._fid && placing.haed === f._haed));
    if (m.classList.contains('on')) toast('Smelltu á teikninguna þar sem verkið er');
    m.onclick = function () { byrjaPlacing(b, f); toast('Smelltu á teikninguna þar sem verkið er — hvar sem er á blaðinu'); };
  }
  function lbLokad() { haettaPlacing(); lokaPop(); }
  // Teikna hæðina upp á nýtt þar sem hún sést (spjald + ljósmynd)
  function endurteikna(fid, haed) {
    document.querySelectorAll('.fcard').forEach(function (k) {
      if (k._f && k._f._fid === fid && k._f._haed === haed && k.querySelector('.fm canvas')) G().synaHaed(k.querySelector('.fm'), k._f, k._ham);
    });
    var lb = G().lbS();
    if (lb && lb.f && lb.f._fid === fid && lb.f._haed === haed && !$('#lb').classList.contains('hidden')) G().synaHaed($('#lb-m'), lb.f, lb.ham, 2600);
  }
  // Sprettigluggi við punkt
  function synaPop(e, cx, cy) {
    var pop = $('#vb-pop'); if (!pop) return;
    var b = eignAfId(e.fid);
    pop.innerHTML = '<div class="vb-pop-h"><i style="background:' + (LIT[e.stada] || LIT.mottekid) + '"></i><b>' + esc(e.titill || 'Verkbeiðni') + '</b><button type="button" class="xbtn sm" data-vb-pop-x aria-label="Loka">' + ic('x', 2) + '</button></div>' +
      '<div class="vb-pop-b">' + (b ? '<div class="dim">' + esc(b.nafn) + ' · ' + esc(e.punktur.nafn || '') + '</div>' : '') +
      (e.lysing ? '<p>' + esc(e.lysing) + '</p>' : '') + erindiAuki(e, true) + '</div>';
    pop.classList.remove('hidden');
    var w = Math.min(360, window.innerWidth - 24), x = Math.min(Math.max(12, cx - w / 2), window.innerWidth - w - 12), y = cy + 14;
    pop.style.width = w + 'px'; pop.style.left = x + 'px';
    if (y + 260 > window.innerHeight) y = Math.max(12, cy - 270);
    pop.style.top = y + 'px';
  }
  function lokaPop() { var pop = $('#vb-pop'); if (pop) pop.classList.add('hidden'); }
  // Viðbót við erindi-röð (portal.js erindiRod) og í sprettiglugga: ábyrgð, punktur, myndir, aðgerðir
  function erindiAuki(e, iPop) {
    if (!e || (!e.abyrgd && !e.punktur && !(e.myndir && e.myndir.length))) return '';
    var bits = [];
    bits.push('<span class="vb-ab ' + esc(e.abyrgd || 'okkar') + '">' + esc(ABYRGD[e.abyrgd] || ABYRGD.okkar) + '</span>');
    if (e.punktur) bits.push('<span class="vb-pk">' + ic('teikning', 1.8) + esc(e.punktur.nafn || 'Teikning') + '</span>');
    if (e.frestur) bits.push('<span class="vb-fr">Frestur ' + esc(fmtDate(e.frestur)) + '</span>');
    var acts = [];
    if (e.punktur && !iPop) acts.push('<button type="button" class="kbtn sm" data-vb-syna="' + e.id + '">' + ic('teikning', 1.8) + 'Sjá á teikningu</button>');
    if (e.abyrgd && e.abyrgd !== 'okkar' && e.stada !== 'lokid') acts.push('<button type="button" class="gbtn sm" data-vb-loka="' + e.id + '">' + ic('hak', 2.2) + 'Merkja lokið</button>');
    var lok = e.stada === 'lokid' && (e.lokid || e.lokid_lysing) ? '<div class="vb-lok">' + ic('hak', 2.2) + '<span><b>Lokið ' + esc(fmtDate(e.lokid)) + '</b>' + (e.lokid_lysing ? ' — ' + esc(e.lokid_lysing) : '') + '</span></div>' : '';
    return '<div class="vb-auki"><div class="vb-bits">' + bits.join('') + '</div>' + myndaRod(e.myndir) + myndaRod(e.eftirmyndir, true) + lok + (acts.length ? '<div class="vb-acts">' + acts.join('') + '</div>' : '') + '</div>';
  }

  /* ── Glugginn: ný verkbeiðni / verkefni ── */
  var vbMynd = null;
  function opnaVb(b, pkt, forAbyrgd) {
    vbB = b || null; vbPkt = pkt || null; vbMynd = null;
    var L = allarEignir();
    var sel = $('#vb-eign');
    sel.innerHTML = '<option value="">Veldu eign…</option>' + L.map(function (x) { return '<option value="' + x.id + '"' + (b && x.id === b.id ? ' selected' : '') + '>' + esc(x.nafn) + '</option>'; }).join('');
    $('#vb-eign-wrap').classList.toggle('hidden', !!(b && pkt));
    $('#vb-where').textContent = b ? (b.nafn + (pkt ? ' · ' + pkt.nafn + ' — merkt á teikningu' : (b.heimilisfang ? ' · ' + b.heimilisfang : ''))) : 'Veldu eign';
    $('#vb-titill').value = ''; $('#vb-lysing').value = ''; $('#vb-stad').value = '';
    $('#vb-stad-wrap').classList.toggle('hidden', !!pkt);
    $('#vb-prev').innerHTML = ''; $('#vb-mynd').value = '';
    setAbyrgd(forAbyrgd || 'okkar');
    $('#vb-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#vb-titill').focus(); }, 40);
  }
  function setAbyrgd(a) { document.querySelectorAll('#vb-abyrgd button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-a') === a); }); $('#vb-send-l').textContent = a === 'okkar' ? 'Senda verkbeiðni' : 'Vista verkefni'; }
  function abyrgdVal() { var x = $('#vb-abyrgd button.on'); return x ? x.getAttribute('data-a') : 'okkar'; }
  function lokaVb() { $('#vb-modal').classList.add('hidden'); lokaLikama(); }
  function sendaVb() {
    var sid = vbB ? vbB.id : parseInt($('#vb-eign').value, 10);
    if (!sid) { toast('Veldu eign'); return; }
    var titill = $('#vb-titill').value.trim(), lysing = $('#vb-lysing').value.trim();
    if (!titill && !lysing) { toast('Lýstu verkinu'); $('#vb-titill').focus(); return; }
    var ab = abyrgdVal(), btn = $('#vb-send'); btn.disabled = true;
    var body = { action: 'punktur', site_id: sid, titill: titill, lysing: lysing, abyrgd: ab, stadsetning: $('#vb-stad').value.trim(), punktur: vbPkt };
    if (vbMynd) { body.mynd = vbMynd.data; body.mynd_w = vbMynd.w; body.mynd_h = vbMynd.h; }
    api(body).then(function (res) {
      btn.disabled = false;
      if (!res.ok) { toast((res.j && res.j.error) || 'Sending tókst ekki — reyndu aftur'); return; }
      var e = res.j.erindi || { id: Date.now(), fid: sid, titill: titill || 'Verkbeiðni', lysing: lysing, stada: 'mottekid', tegund: ab === 'okkar' ? 'verkbeidni' : 'verkefni', abyrgd: ab, punktur: vbPkt, dags: new Date().toISOString(), myndir: vbMynd ? [{ url: vbMynd.data }] : [], eftirmyndir: [] };
      (data().erindi = data().erindi || []).unshift(e);
      lokaVb();
      if (vbPkt) endurteikna(sid, vbPkt.haed);
      G().renderYfirlit(data().buildings); G().renderEgYfir(); renderVinnusvaedi();
      endurteiknaDrawer(sid);
      toast(ab === 'okkar' ? 'Verkbeiðnin er móttekin — við höfum samband' : 'Verkefnið er á borðinu þínu');
    });
  }
  // Eignasíðan: endurteikna erindi-kaflann ef hún er opin á þessari eign (öll síðan teiknuð aftur — spjöldin hlaðast úr skyndiminni)
  function endurteiknaDrawer(sid) {
    var b = G().drB(); if (!b || b.id !== sid || $('#drawer').classList.contains('hidden')) return;
    var top = $('#dr-body').scrollTop;
    var i = (data().buildings || []).indexOf(b), j = (data().eignir_utan || []).indexOf(b);
    if (i > -1) G().openDrawer(i); else if (j > -1) G().openUtan(j);
    $('#dr-body').scrollTop = top;
  }

  /* ── Glugginn: ljúka eigin verkefni með eftirmynd ── */
  var lkId = null, lkMynd = null;
  function opnaLk(id) {
    var e = erindi().filter(function (x) { return x.id === id; })[0]; if (!e) return;
    lkId = id; lkMynd = null;
    $('#lk-titill').textContent = e.titill || 'Verkefni';
    $('#lk-lysing').value = ''; $('#lk-prev').innerHTML = ''; $('#lk-mynd').value = '';
    $('#lk-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
  }
  function lokaLk() { $('#lk-modal').classList.add('hidden'); lokaLikama(); }
  function sendaLk() {
    var btn = $('#lk-send'); btn.disabled = true;
    var body = { action: 'lokid', id: lkId, lysing: $('#lk-lysing').value.trim() };
    if (lkMynd) { body.mynd = lkMynd.data; body.mynd_w = lkMynd.w; body.mynd_h = lkMynd.h; }
    api(body).then(function (res) {
      btn.disabled = false;
      if (!res.ok) { toast((res.j && res.j.error) || 'Vistun tókst ekki'); return; }
      var L = data().erindi || [], i;
      for (i = 0; i < L.length; i++) if (L[i].id === lkId) break;
      if (i < L.length) {
        var ny = res.j.erindi || Object.assign({}, L[i], { stada: 'lokid', lokid: new Date().toISOString(), lokid_lysing: body.lysing, eftirmyndir: lkMynd ? [{ url: lkMynd.data }] : [] });
        L[i] = ny;
        if (ny.punktur) endurteikna(ny.fid, ny.punktur.haed);
        endurteiknaDrawer(ny.fid);
      }
      lokaLk(); lokaPop();
      G().renderYfirlit(data().buildings); G().renderEgYfir(); renderVinnusvaedi();
      toast('Verkinu er lokið');
    });
  }
  function synaATeikningu(id) {
    var e = erindi().filter(function (x) { return x.id === id; })[0]; if (!e || !e.punktur) return;
    var b = eignAfId(e.fid), f = b && b.teikning && b.teikning[e.punktur.haed];
    if (!b || !f) { toast('Teikningin er ekki opin á þessum aðgangi'); return; }
    f._fid = b.id; f._haed = e.punktur.haed;
    G().opnaLb(b, f, 'teikning');
  }
  function tengjaMynd(inputSel, prevSel, setter) {
    var inp = $(inputSel); if (!inp) return;
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      $(prevSel).innerHTML = '<div class="ft">Vinn myndina…</div>';
      minnkaMynd(f, 1600).then(function (m) { setter(m); $(prevSel).innerHTML = '<img src="' + m.data + '" alt="Mynd"><button type="button" class="kbtn sm" data-mynd-burt>Fjarlægja</button>'; },
        function () { setter(null); $(prevSel).innerHTML = ''; toast('Þetta er ekki mynd'); });
    });
    $(prevSel).addEventListener('click', function (e) { if (e.target.closest('[data-mynd-burt]')) { setter(null); inp.value = ''; $(prevSel).innerHTML = ''; } });
  }

  /* ═══ MITT VINNUSVÆÐI ═══════════════════════════════════════════════════ */
  var cal = { y: new Date().getFullYear(), m: new Date().getMonth() };
  var kort = null, kortMerki = {}, leitT = null, leitNidur = [];
  var HL_H = { stjornandi: 'Stjórnandi', eldvarnarfulltrui: 'Eldvarnarfulltrúi', skodandi: 'Lesaðgangur', leigutaki: 'Leigutaki' };
  function notandiLifga() {
    var n = data().account && data().account.notandi;
    document.body.className = document.body.className.replace(/\bhl-\S+/g, '').trim();
    var g = $('#hnot'); if (g) g.remove();
    if (!n) return;
    document.body.classList.add('hl-' + n.hlutverk);
    var ht = $('#htag'); if (ht) ht.insertAdjacentHTML('afterend', '<span class="hnot" id="hnot">' + esc(n.nafn || '') + (n.nafn ? ' · ' : '') + esc(HL_H[n.hlutverk] || n.hlutverk) + (n.eignir ? ' · ' + n.eignir.length + (n.eignir.length === 1 ? ' eign' : ' eignir') : '') + '</span>');
  }
  function renderVinnusvaedi() {
    notandiLifga();
    var tab = document.querySelector('nav .tab[data-view="vinnusvaedi"]'), v = $('#v-vinnusvaedi');
    if (!tab || !v || !st().data) return;
    var synileg = !!syn().vinnusvaedi;
    tab.classList.toggle('hidden', !synileg);
    if (!synileg) { renderVerkbeidnir(); return; }
    var cnt = erindi().filter(function (e) { return e.stada !== 'lokid' && e.abyrgd && e.abyrgd !== 'okkar'; }).length;
    var badge = $('#vsBadge'); if (badge) { badge.textContent = cnt; badge.classList.toggle('hidden', !cnt); }
    renderChecklist(); renderVidhald();
    $('#vs-verk').innerHTML = verkefniHtml();
    $('#vs-dagatal').innerHTML = dagatalHtml();
    $('#vs-nidurhal').innerHTML = nidurhalHtml();
    $('#vs-skjol').innerHTML = skjolHtml();
    if (!$('#v-vinnusvaedi').classList.contains('hidden')) kortLifga();
    renderVerkbeidnir();
  }
  /* Verkefni — gátlisti */
  function verkefniHtml() {
    var L = erindi().slice().sort(function (a, c) { return (a.stada === 'lokid') - (c.stada === 'lokid') || String(c.dags).localeCompare(String(a.dags)); });
    var min = L.filter(function (e) { return e.abyrgd && e.abyrgd !== 'okkar'; }), okkar = L.filter(function (e) { return !e.abyrgd || e.abyrgd === 'okkar'; });
    function rod(e) {
      var b = eignAfId(e.fid), lok = e.stada === 'lokid';
      return '<div class="vs-r' + (lok ? ' lok' : '') + '">' +
        (e.abyrgd && e.abyrgd !== 'okkar' ? '<button type="button" class="vs-chk' + (lok ? ' on' : '') + '" data-vb-loka="' + e.id + '" aria-label="Merkja lokið"' + (lok ? ' disabled' : '') + '>' + ic('hak', 2.6) + '</button>'
          : '<i class="vs-dot" style="background:' + (LIT[e.stada] || LIT.mottekid) + '"></i>') +
        '<div class="egt"><b>' + esc(e.titill || 'Verk') + '</b><span>' + (b ? esc(b.nafn) + ' · ' : '') + esc(STADA[e.stada] || '') + (e.punktur ? ' · ' + esc(e.punktur.nafn) : '') + (e.frestur ? ' · frestur ' + esc(fmtDate(e.frestur)) : '') + '</span></div>' +
        (e.punktur ? '<button type="button" class="kbtn sm" data-vb-syna="' + e.id + '" title="Sjá á teikningu">' + ic('teikning', 1.8) + '</button>' : '') +
        '<span class="vb-ab ' + esc(e.abyrgd || 'okkar') + '">' + esc(ABYRGD[e.abyrgd] || ABYRGD.okkar) + '</span></div>';
    }
    var opM = min.filter(function (e) { return e.stada !== 'lokid'; }).length, opO = okkar.filter(function (e) { return e.stada !== 'lokid'; }).length;
    return '<div class="egp-h"><b>Verkefni</b><span>' + opM + ' mín · ' + opO + ' hjá okkur</span></div>' +
      '<div class="vs-sub">Mín verkefni og annarra verktaka</div>' +
      (min.length ? min.slice(0, 12).map(rod).join('') : '<div class="egp-e">Engin verkefni enn — „Nýtt verkefni" setur verk á borðið þitt, með mynd og punkti á teikningu ef vill.</div>') +
      '<div class="vs-sub">Verkbeiðnir til Slökkvitækja ehf.</div>' +
      (okkar.length ? okkar.slice(0, 12).map(rod).join('') : '<div class="egp-e">Engar verkbeiðnir enn.</div>') +
      '<div class="vs-foot"><button type="button" class="gbtn sm" data-vs-nytt>' + ic('plus', 2.2) + 'Nýtt verkefni</button><button type="button" class="kbtn sm" data-vs-nytt-okkar>' + ic('plus', 2.2) + 'Verkbeiðni til okkar</button></div>';
  }
  /* Dagatal */
  function atburdir(y, m) {
    var out = [], d = data(), M = G().MAN_STUTT;
    (d.buildings || []).forEach(function (b) {
      G().skodanirEignar(b).forEach(function (s) { if (s.n.y === y && s.n.m - 1 === m) out.push({ dagur: 1, teg: 'skodun', heiti: s.heiti, eign: b.nafn, seint: s.n.seint, fid: b.id }); });
      if (Array.isArray(b.eldvarnabok) && b.i_thjonustu !== false) {
        var key = y + '-' + ('0' + (m + 1)).slice(-2), r = G().ebRod(b, key), nuIdx = new Date().getFullYear() * 12 + new Date().getMonth();
        if (y * 12 + m <= nuIdx + 2 && y * 12 + m >= nuIdx - 11 && !(r && r.stada === 'undirritad')) out.push({ dagur: new Date(y, m + 1, 0).getDate(), teg: 'eldvarnabok', heiti: 'Eldvarnabók ' + M[m], eign: b.nafn, fid: b.id, drog: !!r });
      }
    });
    (d.vidhald || []).forEach(function (r) {
      var b = eignAfId(r.fid), nafn = b ? b.nafn : '';
      var dn = r.naest ? new Date(r.naest + 'T00:00:00') : null;
      if (dn && dn.getFullYear() === y && dn.getMonth() === m) out.push({ dagur: dn.getDate(), teg: 'vidhald', heiti: r.heiti, eign: nafn, fid: r.fid, seint: vhDagar(r.naest) < 0 });
      var dg = r.gildir_til ? new Date(r.gildir_til + 'T00:00:00') : null;
      if (dg && dg.getFullYear() === y && dg.getMonth() === m) out.push({ dagur: dg.getDate(), teg: 'skirteini', heiti: 'Skírteini rennur út: ' + r.heiti, eign: nafn, fid: r.fid, seint: vhDagar(r.gildir_til) < 0 });
    });
    erindi().forEach(function (e) {
      var b = eignAfId(e.fid), nafn = b ? b.nafn : '';
      var ds = e.frestur ? new Date(e.frestur) : null;
      if (ds && ds.getFullYear() === y && ds.getMonth() === m) out.push({ dagur: ds.getDate(), teg: 'frestur', heiti: e.titill, eign: nafn, id: e.id, lok: e.stada === 'lokid' });
      var dc = e.dags ? new Date(e.dags) : null;
      if (dc && dc.getFullYear() === y && dc.getMonth() === m) out.push({ dagur: dc.getDate(), teg: 'erindi', heiti: e.titill, eign: nafn, id: e.id, lok: e.stada === 'lokid' });
      var dl = e.lokid ? new Date(e.lokid) : null;
      if (dl && dl.getFullYear() === y && dl.getMonth() === m) out.push({ dagur: dl.getDate(), teg: 'lokid', heiti: e.titill, eign: nafn, id: e.id, lok: true });
    });
    return out.sort(function (a, c) { return a.dagur - c.dagur; });
  }
  var TEG = { skodun: ['Skoðun', 'skodun'], eldvarnabok: ['Eldvarnabók', 'eb'], frestur: ['Frestur', 'frestur'], erindi: ['Erindi', 'erindi'], lokid: ['Lokið', 'lokid'], vidhald: ['Viðhald', 'skodun'], skirteini: ['Skírteini', 'frestur'] };
  function dagatalHtml() {
    var y = cal.y, m = cal.m, A = atburdir(y, m), M = G().MAN_LANGT;
    var first = new Date(y, m, 1), start = (first.getDay() + 6) % 7, dagar = new Date(y, m + 1, 0).getDate();
    var nu = new Date(), erNu = nu.getFullYear() === y && nu.getMonth() === m;
    var byDay = {}; A.forEach(function (a) { (byDay[a.dagur] = byDay[a.dagur] || []).push(a); });
    var cells = '';
    for (var i = 0; i < start; i++) cells += '<i></i>';
    for (var d = 1; d <= dagar; d++) {
      var L = byDay[d] || [];
      cells += '<button type="button" class="cal-d' + (erNu && nu.getDate() === d ? ' nu' : '') + (L.length ? ' hefur' : '') + '" data-cal-d="' + d + '"><span>' + d + '</span>' +
        (L.length ? '<em>' + L.slice(0, 3).map(function (a) { return '<b class="' + TEG[a.teg][1] + (a.lok ? ' lok' : '') + (a.seint ? ' seint' : '') + '"></b>'; }).join('') + '</em>' : '') + '</button>';
    }
    var heiti = M[m].charAt(0).toUpperCase() + M[m].slice(1) + ' ' + y;
    return '<div class="egp-h"><b>Dagatal</b><span>' + A.length + ' atriði</span></div>' +
      '<div class="cal-nav"><button type="button" class="kbtn sm" data-cal="-1" aria-label="Fyrri mánuður">' + ic('til_baka', 2.2) + '</button><b>' + esc(heiti) + '</b><button type="button" class="kbtn sm" data-cal="1" aria-label="Næsti mánuður">' + ic('afram', 2.2) + '</button><button type="button" class="kbtn sm" data-cal="0">Í dag</button></div>' +
      '<div class="cal-w">' + ['Má', 'Þr', 'Mi', 'Fi', 'Fö', 'La', 'Su'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
      '<div class="cal-g">' + cells + '</div>' +
      '<div class="cal-l">' + (A.length ? A.map(function (a) {
        return '<div class="egp-r' + (a.id ? ' clk' : '') + '"' + (a.id ? ' data-vb-opna="' + a.id + '"' : (a.fid && a.teg === 'eldvarnabok' ? ' data-eb-opna="' + a.fid + '"' : '')) + '><span class="egd' + (a.seint ? ' seint' : '') + '"><b>' + a.dagur + '</b>' + esc(G().MAN_STUTT[m]) + '</span>' +
          '<div class="egt"><b>' + esc(a.heiti) + '</b><span>' + esc(a.eign) + '</span></div><span class="kst ' + (a.lok ? 'okkar' : a.seint ? 'vantar' : a.teg === 'eldvarnabok' ? (a.drog ? 'til' : 'oskrad') : 'til') + '">' + esc(TEG[a.teg][0]) + '</span></div>';
      }).join('') : '<div class="egp-e">Ekkert á dagskrá í þessum mánuði.</div>') + '</div>';
  }
  /* Kort */
  function hnitEignar(b) {
    var e = b.eign || {};
    if (e.hnit && isFinite(+e.hnit.lat) && isFinite(+e.hnit.lng)) return { lat: +e.hnit.lat, lng: +e.hnit.lng };
    if (isFinite(+e.lat) && isFinite(+e.lng) && +e.lat) return { lat: +e.lat, lng: +e.lng };
    return null;
  }
  var leafletP = null;
  function saekjaLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (!leafletP) leafletP = new Promise(function (res, rej) {
      var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
      var sk = document.createElement('script'); sk.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; sk.onload = res; sk.onerror = function () { leafletP = null; rej(new Error('leaflet')); }; document.head.appendChild(sk);
    });
    return leafletP;
  }
  function kortLifga() {
    var box = $('#vs-kort-m'); if (!box || !syn().vinnusvaedi) return;
    saekjaLeaflet().then(function () {
      if (!kort) {
        kort = window.L.map(box, { scrollWheelZoom: false }).setView([64.13, -21.9], 11);
        // Esri World Street Map — sama flísaþjónusta og appið (155/161): enginn lykill, OSM lokaði á appið 16.09.2026
        window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles © Esri' }).addTo(kort);
      }
      setTimeout(function () { kort.invalidateSize(); }, 50);
      kortMerkja();
    }, function () { box.innerHTML = '<div class="egp-e">Kortið hlóðst ekki.</div>'; });
  }
  function merkiHtml(b, inni) {
    return window.L.divIcon({ className: 'vs-pin' + (inni ? ' inni' : ''), html: '<i></i>', iconSize: [18, 18], iconAnchor: [9, 9] });
  }
  function kortMerkja() {
    if (!kort) return;
    var inni = data().buildings || [], utan = data().eignir_utan || [], pts = [], vantar = [];
    inni.concat(utan).forEach(function (b) {
      var h = hnitEignar(b);
      if (!h) { if (b.heimilisfang) vantar.push(b); return; }
      pts.push([h.lat, h.lng]);
      if (kortMerki[b.id]) return;
      var mk = window.L.marker([h.lat, h.lng], { icon: merkiHtml(b, inni.indexOf(b) > -1) }).addTo(kort);
      mk.bindPopup('<b>' + esc(b.nafn) + '</b><br>' + esc(b.heimilisfang || '') + '<br><button type="button" class="kbtn sm" data-vs-opna="' + b.id + '">Opna eign</button>');
      kortMerki[b.id] = mk;
    });
    if (pts.length) kort.fitBounds(pts, { padding: [30, 30], maxZoom: 14 });
    $('#vs-kort-n').textContent = pts.length + ' af ' + (inni.length + utan.length) + ' eignum á korti' + (vantar.length ? ' · staðset ' + vantar.length + '…' : '');
    // Eignir án hnita: geocode (Staðfangaskrá/Nominatim um /api/geocode) og vista í eign.hnit — mest 12 í hverri heimsókn
    if (vantar.length && !st().demo) geokoda(vantar.slice(0, 12));
  }
  function geokoda(L) {
    L.reduce(function (p, b) {
      return p.then(function () {
        return fetch('/api/geocode?q=' + encodeURIComponent(b.heimilisfang) + '&cc=is').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
          if (!j || !isFinite(+j.lat) || !isFinite(+j.lon)) return;
          b.eign = b.eign || {}; b.eign.hnit = { lat: +j.lat, lng: +j.lon, uppruni: j.source || 'geocode' };
          return api({ action: 'hnit', site_id: b.id, lat: +j.lat, lng: +j.lon, uppruni: j.source || 'geocode' });
        }).catch(function () {});
      });
    }, Promise.resolve()).then(function () { kortMerkja(); });
  }
  function leita(q) {
    var box = $('#vs-leit-n'); if (!box) return;
    if (q.length < 3) { box.innerHTML = ''; leitNidur = []; return; }
    box.innerHTML = '<div class="egp-e">Leita í Landeignaskrá…</div>';
    var p = st().demo ? Promise.resolve({ results: [{ landnr: 105166, heinum: 1016256, label: q + '  (104) - L 105166' }] })
      : fetch('/.netlify/functions/landnr?leit=' + encodeURIComponent(q)).then(function (r) { return r.json(); });
    p.then(function (j) {
      leitNidur = (j && j.results) || [];
      var mine = allarEignir();
      box.innerHTML = leitNidur.length ? leitNidur.slice(0, 12).map(function (r, i) {
        var til = mine.some(function (b) { return b.eign && +b.eign.landnr === +r.landnr; });
        return '<div class="egp-r"><div class="egt"><b>' + esc(r.label) + '</b><span>Landnr ' + esc(r.landnr) + '</span></div>' +
          (til ? '<span class="kst okkar">Á listanum</span>' : (syn().baeta_eign ? '<button type="button" class="gbtn sm" data-vs-baeta="' + i + '">' + ic('plus', 2.2) + 'Bæta við</button>' : '')) + '</div>';
      }).join('') : '<div class="egp-e">Ekkert fannst á „' + esc(q) + '". Prófaðu götu og húsnúmer, t.d. „Borgartún 37".</div>';
    }, function () { box.innerHTML = '<div class="egp-e">Landeignaskrá svaraði ekki — reyndu aftur.</div>'; });
  }
  function baetaVid(i) {
    var r = leitNidur[i]; if (!r) return;
    var bt = $('[data-vs-baeta="' + i + '"]'); if (bt) bt.disabled = true;
    (st().demo ? Promise.resolve({ ok: true, j: { ok: true, eign: { id: 9900 + i, nafn: r.label.replace(/\s*\(.*$/, ''), heimilisfang: r.label.replace(/\s*-\s*L.*$/, '').replace(/\s+\((\d{3})\)/, ', $1'), eign: { landnr: r.landnr, hnit: { lat: 64.135, lng: -21.86 }, uppruni: 'gatt' }, beidni: false, kerfi: [], flokkun: null, teikning: null } } })
      : api({ action: 'ny_eign', landnr: r.landnr, heitinr: r.heinum, label: r.label })).then(function (res) {
      if (bt) bt.disabled = false;
      if (!res.ok) { toast((res.j && res.j.error) || 'Tókst ekki'); return; }
      (data().eignir_utan = data().eignir_utan || []).push(res.j.eign);
      G().renderEignasafn(); renderVinnusvaedi();
      $('#vs-leit').value = ''; $('#vs-leit-n').innerHTML = '';
      var h = hnitEignar(res.j.eign); if (h && kort) kort.setView([h.lat, h.lng], 15);
      toast('Eignin er komin á listann — „Skrá í þjónustu" þegar þú vilt');
    });
  }
  /* Niðurhal */
  function csvSkra(nafn, rows) {
    var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
    G().vistaBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), nafn + '-' + new Date().toISOString().slice(0, 10) + '.csv');
  }
  function csvEignir(adeinsHeimilisfong) {
    var inni = data().buildings || [], utan = data().eignir_utan || [], rows = [];
    rows.push(adeinsHeimilisfong ? ['Eign', 'Heimilisfang', 'Póstnúmer'] : ['Eign', 'Heimilisfang', 'Póstnúmer', 'Landnr', 'Breidd', 'Lengd', 'Í þjónustu', 'Stærð m²', 'Byggt', 'Tegund', 'Kerfi skráð', 'Opin erindi']);
    inni.concat(utan).forEach(function (b) {
      var e = b.eign || {}, h = hnitEignar(b), pn = (String(b.heimilisfang || '').match(/\b(\d{3})\b/) || [])[1] || '';
      if (adeinsHeimilisfong) { rows.push([b.nafn, b.heimilisfang, pn]); return; }
      var L = b.kerfi || [], sk = L.filter(function (k) { return k.til !== 'ovitad' || k.adili === 'okkar'; }).length;
      rows.push([b.nafn, b.heimilisfang, pn, e.landnr || '', h ? String(h.lat).replace('.', ',') : '', h ? String(h.lng).replace('.', ',') : '', inni.indexOf(b) > -1 ? 'Já' : 'Nei',
        e.staerd_m2 || (b.flokkun && b.flokkun.m2) || '', e.byggingarar || '', e.tegund || (b.flokkun && b.flokkun.tegund) || '', L.length ? sk + ' af ' + L.length : '', erindi().filter(function (x) { return x.fid === b.id && x.stada !== 'lokid'; }).length]);
    });
    csvSkra(adeinsHeimilisfong ? 'heimilisfong' : 'eignasafn', rows);
  }
  function csvErindi() {
    var rows = [['Dags', 'Eign', 'Titill', 'Tegund', 'Ábyrgð', 'Staða', 'Hæð', 'Frestur', 'Lokið', 'Lokið lýsing']];
    erindi().forEach(function (e) { var b = eignAfId(e.fid); rows.push([fmtDate(e.dags), b ? b.nafn : '', e.titill, e.tegund, ABYRGD[e.abyrgd] || ABYRGD.okkar, STADA[e.stada] || '', e.punktur ? e.punktur.nafn : '', e.frestur ? fmtDate(e.frestur) : '', e.lokid ? fmtDate(e.lokid) : '', e.lokid_lysing || '']); });
    csvSkra('erindi', rows);
  }
  function nidurhalHtml() {
    var n = (data().buildings || []).length + (data().eignir_utan || []).length;
    return '<div class="egp-h"><b>Niðurhal</b><span>' + n + ' eignir</span></div>' +
      '<div class="vs-dl"><button type="button" class="kbtn" data-vs-csv="eignir">' + ic('pdf', 1.8) + 'Eignasafn (CSV)</button>' +
      '<button type="button" class="kbtn" data-vs-csv="heimilisfong">' + ic('pdf', 1.8) + 'Heimilisföng (CSV)</button>' +
      '<button type="button" class="kbtn" data-vs-csv="erindi">' + ic('pdf', 1.8) + 'Erindi og verkefni (CSV)</button>' +
      '<button type="button" class="kbtn" data-vs-prenta>' + ic('pdf', 1.8) + 'Prenta yfirlit</button></div>' +
      '<div class="egp-n">CSV opnast í Excel (íslenskt snið: semíkomma, komma í tölum). Eignasafnið ber landnúmer og hnit þegar þau eru skráð.</div>';
  }
  /* Skjöl og hlekkir — borðið */
  function skjolIc(it) {
    if (it.tegund === 'hlekkur') return ic('hlekkur', 1.9);
    if (/pdf/.test(it.mime || '')) return ic('pdf', 1.9);
    if (/^image\//.test(it.mime || '')) return ic('mynd', 1.9);
    return ic('skjal', 1.9);
  }
  function staerd(n) { return n == null ? '' : n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function skjolHtml() {
    var L = (data().items || []).slice().sort(function (a, c) { return (a.rod || 0) - (c.rod || 0); });
    return '<div class="egp-h"><b>Skjöl og hlekkir</b><span>' + L.length + ' á borðinu</span></div>' +
      (L.length ? '<div class="vs-items">' + L.map(function (it, i) {
        return '<div class="vs-it" data-vs-it="' + it.id + '"><a class="vs-it-a" href="' + esc(it.url || '#') + '" target="_blank" rel="noopener"><span class="vs-it-ic">' + skjolIc(it) + '</span><span class="vs-it-t"><b>' + esc(it.heiti) + '</b><small>' + (it.tegund === 'hlekkur' ? esc((it.url || '').replace(/^https?:\/\//, '').slice(0, 60)) : staerd(it.staerd)) + ' · ' + esc(fmtDate(it.dags)) + '</small></span></a>' +
          '<span class="vs-it-b"><button type="button" class="xbtn sm" data-vs-upp="' + it.id + '" aria-label="Færa upp"' + (i === 0 ? ' disabled' : '') + '>' + ic('upp', 2.2) + '</button><button type="button" class="xbtn sm" data-vs-nidur="' + it.id + '" aria-label="Færa niður"' + (i === L.length - 1 ? ' disabled' : '') + '>' + ic('nidur', 2.2) + '</button><button type="button" class="xbtn sm" data-vs-eyda="' + it.id + '" aria-label="Eyða">' + ic('x', 2.2) + '</button></span></div>';
      }).join('') + '</div>' : '<div class="egp-e">Geymdu hér skjöl sem þú vilt hafa við höndina — samninga, teikningar, úttektir annarra — og hlekki á kerfi sem þú notar.</div>') +
      '<form class="vs-add" id="vs-hlekkur"><input class="svc-in" id="vs-hl-heiti" placeholder="Heiti hlekks" maxlength="80"><input class="svc-in" id="vs-hl-url" placeholder="https://…" type="url"><button type="submit" class="kbtn sm">' + ic('plus', 2.2) + 'Hlekkur</button></form>' +
      '<label class="vs-upl"><input type="file" id="vs-skra" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.txt,.csv,application/pdf,image/*">' + ic('plus', 2.2) + '<span>Hlaða upp skjali (mest 5 MB)</span></label>';
  }
  function vistaHlekk(heiti, url) {
    api({ action: 'item', tegund: 'hlekkur', heiti: heiti, url: url }).then(function (res) {
      if (!res.ok) { toast((res.j && res.j.error) || 'Tókst ekki'); return; }
      if (st().demo) (data().items = data().items || []).push({ id: Date.now(), tegund: 'hlekkur', heiti: heiti || url, url: url, rod: Date.now(), dags: new Date().toISOString() });
      else data().items = res.j.items || [];
      renderVinnusvaedi(); toast('Hlekkurinn er á borðinu');
    });
  }
  function vistaSkra(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Skráin er stærri en 5 MB'); return; }
    toast('Hleð upp…');
    (/^image\//.test(file.type) ? minnkaMynd(file, 2400).then(function (m) { return m.data; }) : lesaSkra(file)).then(function (dataUrl) {
      return api({ action: 'item', tegund: 'skjal', heiti: file.name, gogn: dataUrl });
    }).then(function (res) {
      if (!res.ok) { toast((res.j && res.j.error) || 'Tókst ekki'); return; }
      if (st().demo) (data().items = data().items || []).push({ id: Date.now(), tegund: 'skjal', heiti: file.name, mime: file.type, staerd: file.size, url: '#', rod: Date.now(), dags: new Date().toISOString() });
      else data().items = res.j.items || [];
      renderVinnusvaedi(); toast('Skjalið er á borðinu');
    }, function () { toast('Skráin lesist ekki'); });
  }
  function eydaItem(id) {
    if (!window.confirm('Taka af borðinu?')) return;
    api({ action: 'item_eyda', id: id }).then(function (res) {
      if (!res.ok) { toast('Tókst ekki'); return; }
      data().items = st().demo ? (data().items || []).filter(function (x) { return x.id !== id; }) : (res.j.items || []);
      renderVinnusvaedi();
    });
  }
  function faera(id, d) {
    var L = (data().items || []).slice().sort(function (a, c) { return (a.rod || 0) - (c.rod || 0); }), i = L.findIndex(function (x) { return x.id === id; }), j = i + d;
    if (i < 0 || j < 0 || j >= L.length) return;
    var t = L[i]; L[i] = L[j]; L[j] = t;
    L.forEach(function (x, n) { x.rod = n + 1; });
    data().items = L; renderVinnusvaedi();
    api({ action: 'item_roda', ids: L.map(function (x) { return x.id; }) });
  }

  /* ═══ CHECKLISTI — frjáls atriði kúnnans, eins og á Þjónustuborðinu (stjarna, hak, röð, hreinsa) ═══ */
  var STAR_ON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.7l-6.1 3.4 1.4-6.8L2.2 9.6l6.9-.8z"/></svg>', STAR_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 2.5 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.7l-6.1 3.4 1.4-6.8L2.2 9.6l6.9-.8z"/></svg>';
  function ckL() { return (data().checklist || []).slice().sort(function (a, c) { return (c.stjarna - a.stjarna) || (a.rod || 0) - (c.rod || 0); }); }
  function ckHtml(it, i, n) {
    var txt = esc(it.texti).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return '<div class="ck-r' + (it.lokid ? ' lok' : '') + (it.stjarna && !it.lokid ? ' stj' : '') + '" data-ck="' + it.id + '">' +
      '<button type="button" class="ck-b' + (it.lokid ? ' on' : '') + '" data-ck-hak="' + it.id + '" aria-label="' + (it.lokid ? 'Opna aftur' : 'Merkja klárað') + '">' + ic('hak', 2.8) + '</button>' +
      '<span class="ck-t" contenteditable="' + (it.lokid ? 'false' : 'true') + '" spellcheck="false" data-ck-texti="' + it.id + '">' + txt + '</span>' +
      (it.lokid ? '' : '<button type="button" class="ck-i' + (it.stjarna ? ' on' : '') + '" data-ck-stj="' + it.id + '" aria-label="Stjarna">' + (it.stjarna ? STAR_ON : STAR_OFF) + '</button>' +
        '<button type="button" class="ck-i" data-ck-upp="' + it.id + '" aria-label="Upp"' + (i === 0 ? ' disabled' : '') + '>' + ic('upp', 2.2) + '</button><button type="button" class="ck-i" data-ck-nidur="' + it.id + '" aria-label="Niður"' + (i === n - 1 ? ' disabled' : '') + '>' + ic('nidur', 2.2) + '</button>') +
      '<button type="button" class="ck-i" data-ck-eyda="' + it.id + '" aria-label="Eyða">' + ic('x', 2.2) + '</button></div>';
  }
  function checklistHtml() {
    var L = ckL(), opin = L.filter(function (x) { return !x.lokid; }), lok = L.filter(function (x) { return x.lokid; });
    return '<div class="egp-h"><b>Checklisti</b><span>' + opin.length + ' opin · ' + lok.length + ' klárað</span></div>' +
      (opin.length ? opin.map(function (it, i) { return ckHtml(it, i, opin.length); }).join('') : '<div class="egp-e">Tómur listi — skrifaðu atriði hér að neðan, Enter bætir við. Stjarna setur efst.</div>') +
      '<form class="ck-add" id="ck-form"><input class="svc-in" id="ck-inp" placeholder="Nýtt atriði … Enter bætir við" maxlength="500" autocomplete="off"><button type="submit" class="gbtn">' + ic('plus', 2.4) + 'Bæta við</button></form>' +
      (lok.length ? '<div class="ck-h2"><span class="vs-sub">Klárað · ' + lok.length + '</span><button type="button" class="kbtn sm" data-ck-hreinsa>Hreinsa kláruð</button></div>' + lok.slice(0, 20).map(function (it) { return ckHtml(it, 0, 1); }).join('') : '');
  }
  function ckApi(body) {
    if (st().demo) {
      var L = data().checklist = data().checklist || [], it = L.filter(function (x) { return x.id === body.id; })[0];
      if (body.action === 'chk_add') L.push({ id: Date.now(), texti: body.texti, stjarna: false, lokid: null, rod: Date.now() });
      else if (body.action === 'chk_toggle' && it) it.lokid = body.lokid ? new Date().toISOString() : null;
      else if (body.action === 'chk_stjarna' && it) it.stjarna = !!body.stjarna;
      else if (body.action === 'chk_texti' && it) it.texti = body.texti;
      else if (body.action === 'chk_eyda') data().checklist = L.filter(function (x) { return x.id !== body.id; });
      else if (body.action === 'chk_hreinsa') data().checklist = L.filter(function (x) { return !x.lokid; });
      else if (body.action === 'chk_roda') body.ids.forEach(function (id, i) { var x = L.filter(function (y) { return y.id === id; })[0]; if (x) x.rod = i + 1; });
      renderChecklist(); return Promise.resolve(true);
    }
    return api(body).then(function (res) {
      if (!res.ok) { toast((res.j && res.j.error) || 'Vistun tókst ekki'); renderChecklist(); return false; }
      data().checklist = res.j.checklist || []; renderChecklist(); return true;
    });
  }
  function renderChecklist() {
    var el = $('#vs-check'); if (!el || !st().data) return;
    var inp = $('#ck-inp'), gildi = inp ? inp.value : '', fokus = inp && document.activeElement === inp;
    el.innerHTML = checklistHtml();
    if (gildi || fokus) { var ni = $('#ck-inp'); if (ni) { ni.value = gildi; if (fokus) ni.focus(); } }
  }
  function ckFaera(id, d) {
    var L = ckL().filter(function (x) { return !x.lokid; }), i = L.findIndex(function (x) { return x.id === id; }), j = i + d;
    if (i < 0 || j < 0 || j >= L.length) return;
    var t = L[i]; L[i] = L[j]; L[j] = t;
    L.forEach(function (x, n) { x.rod = n + 1; });
    ckApi({ action: 'chk_roda', ids: L.map(function (x) { return x.id; }) });
  }

  /* ═══ VIÐHALDSÁÆTLUN OG SKÍRTEINI (portal_vidhald) ═══════════════════════
     Tíðni per kerfi, næst = síðast + tíðni, áminning í dagatali, skírteini með gildistíma. */
  var VH_KERFI = { slokkvitaeki: ['Slökkvitæki — árleg skoðun', 12], slongukefli: ['Slöngukefli — árleg skoðun', 12], brunavidvorunarkerfi: ['Brunaviðvörunarkerfi — árleg skoðun', 12],
    vatnsudakerfi: ['Vatnsúðakerfi — árleg skoðun og þjónusta', 12], neydarlysing: ['Neyðarlýsing — árleg fullprófun', 12], utljos: ['Útljós — árleg skoðun', 12],
    reykskynjarar: ['Reykskynjarar — árleg prófun', 12], reyklosun: ['Reyklosun — árleg prófun', 12], eldvarnaeftirlit: ['Eldvarnaeftirlit slökkviliðs', 12],
    slokkvikerfi_eldhus: ['Slökkvikerfi í eldhúsháfi — hálfsárs þjónusta', 6], brunathettingar: ['Brunaþéttingar — úttekt', 48], rafmagn: ['Rafskoðun — töflur og lagnir', 48],
    lyfta: ['Lyfta — árleg skoðun', 12], eldvarnarteppi: ['Eldvarnarteppi — skoðun', 12], rymingaruppdrattur: ['Rýmingaruppdráttur — yfirferð', 12], fjoldaskilti: ['Fjöldaskilti — yfirferð', 12], annad: ['Annað', 12] };
  var vhSia = 'allar', vhB = null, vhId = null;
  function vhL() { return (data().vidhald || []).slice().sort(function (a, c) { return String(a.naest || '9999').localeCompare(String(c.naest || '9999')); }); }
  function vhDagar(d) { if (!d) return null; return Math.round((new Date(d + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5); }
  function vhStada(r) { var n = vhDagar(r.naest); if (n == null) return 'oskrad'; if (n < 0) return 'seint'; if (n <= (r.minning || 30)) return 'brad'; return 'ok'; }
  function vhKerfiHeiti(k) { return (G().KERFI_HEITI && G().KERFI_HEITI[k]) || (VH_KERFI[k] ? VH_KERFI[k][0].split(' — ')[0] : k) || ''; }
  function vhRod(r, medEign) {
    var b = eignAfId(r.fid), st2 = vhStada(r), n = vhDagar(r.naest), M = G().MAN_STUTT;
    var dtxt = r.naest ? '<b>' + esc(fmtDate(r.naest)) + '</b>' + (st2 === 'seint' ? (-n) + ' dögum á eftir' : n === 0 ? 'í dag' : 'eftir ' + n + ' daga') : '<b>—</b>engin dagsetning';
    return '<div class="vh-r" data-vh="' + r.id + '"><span class="vh-d ' + st2 + '">' + dtxt + '</span>' +
      '<div class="egt"><b>' + esc(r.heiti) + '</b><span>' + (medEign && b ? esc(b.nafn) + ' · ' : '') + 'tíðni ' + r.tidni + ' mán.' + (r.sidast ? ' · síðast ' + esc(fmtDate(r.sidast)) : '') + (r.gildir_til ? ' · skírteini gildir til ' + esc(fmtDate(r.gildir_til)) : '') + '</span></div>' +
      '<span class="vb-ab ' + esc(r.abyrgd) + '">' + esc(ABYRGD[r.abyrgd] || 'Okkar') + '</span>' +
      '<div class="vh-a">' + (r.skirteini && r.skirteini.url ? '<a class="kbtn sm" href="' + esc(r.skirteini.url) + '" target="_blank" rel="noopener" title="' + esc(r.skirteini.heiti) + '">' + ic('pdf', 1.8) + '</a>' : '') +
      '<label class="kbtn sm" title="Hlaða upp skírteini eða skýrslu">' + ic('skjal', 1.8) + '<input type="file" data-vh-skjal="' + r.id + '" accept=".pdf,image/*,application/pdf"></label>' +
      '<button type="button" class="kbtn sm" data-vh-gert="' + r.id + '" title="Merkja framkvæmt í dag">' + ic('hak', 2.4) + '</button>' +
      '<button type="button" class="kbtn sm" data-vh-breyta="' + r.id + '" title="Breyta">' + ic('erindi', 1.8) + '</button></div></div>';
  }
  function vidhaldHtml() {
    var L = vhL(), seint = L.filter(function (r) { return vhStada(r) === 'seint'; }).length, brad = L.filter(function (r) { return vhStada(r) === 'brad'; }).length;
    var S = L.filter(function (r) { return vhSia === 'allar' || (vhSia === 'seint' ? vhStada(r) === 'seint' : vhStada(r) !== 'ok' && vhStada(r) !== 'oskrad'); });
    return '<div class="egp-h"><b>Viðhaldsáætlun</b><span>' + (L.length ? L.length + ' liðir · ' + seint + ' á eftir · ' + brad + ' á næstunni' : 'fyrirbyggjandi viðhald') + '</span></div>' +
      '<div class="vh-sia"><button type="button" class="ysia' + (vhSia === 'allar' ? ' on' : '') + '" data-vh-sia="allar">Allir liðir</button><button type="button" class="ysia' + (vhSia === 'seint' ? ' on' : '') + '" data-vh-sia="seint">Á eftir</button><button type="button" class="ysia' + (vhSia === 'brad' ? ' on' : '') + '" data-vh-sia="brad">Næstu áminningar</button></div>' +
      (S.length ? S.slice(0, 40).map(function (r) { return vhRod(r, true); }).join('') : (L.length ? '<div class="egp-e">Ekkert í þessari síu.</div>' : '<div class="egp-e">Engin áætlun enn. „Setja upp áætlun" stingur upp á liðum úr kerfum hverrar eignar: tíðni, hver sér um og áminning. Næsta dagsetning reiknast af síðustu skoðun.</div>')) +
      '<div class="vs-foot"><button type="button" class="gbtn sm" data-vh-tillogur>' + ic('plus', 2.2) + 'Setja upp áætlun</button><button type="button" class="kbtn sm" data-vh-nytt>' + ic('plus', 2.2) + 'Stakur liður</button></div>';
  }
  function skirteiniHtml() {
    var L = vhL().filter(function (r) { return r.skirteini || r.gildir_til; }).sort(function (a, c) { return String(a.gildir_til || '9999').localeCompare(String(c.gildir_til || '9999')); });
    return '<div class="egp-h"><b>Skírteini</b><span>' + (L.length ? L.length + ' skjöl' : 'vottorð og þjónustumiðar') + '</span></div>' +
      (L.length ? L.slice(0, 20).map(function (r) {
        var b = eignAfId(r.fid), n = vhDagar(r.gildir_til), st2 = r.gildir_til ? (n < 0 ? 'seint' : n <= 30 ? 'brad' : 'ok') : 'oskrad';
        return '<div class="sk-r"><span class="vh-d ' + st2 + '"><b>' + (r.gildir_til ? esc(fmtDate(r.gildir_til)) : '—') + '</b>' + (r.gildir_til ? (n < 0 ? 'útrunnið' : 'gildir til') : 'enginn gildistími') + '</span>' +
          '<div class="egt"><b>' + esc(r.skirteini ? r.skirteini.heiti : r.heiti) + '</b><span>' + (b ? esc(b.nafn) + ' · ' : '') + esc(r.heiti) + '</span></div>' +
          (r.skirteini && r.skirteini.url ? '<a class="kbtn sm" href="' + esc(r.skirteini.url) + '" target="_blank" rel="noopener">' + ic('pdf', 1.8) + 'Opna</a>' : '<label class="kbtn sm">' + ic('skjal', 1.8) + 'Hlaða upp<input type="file" data-vh-skjal="' + r.id + '" accept=".pdf,image/*" style="position:absolute;opacity:0;width:1px;height:1px"></label>') + '</div>';
      }).join('') : '<div class="egp-e">Skírteini, vottorð og skýrslur hengjast á liði í viðhaldsáætluninni með gildistíma — hér sést hvað rennur út næst.</div>');
  }
  function renderVidhald() {
    var a = $('#vs-vidhald'), b = $('#vs-skirteini'); if (!a || !b || !st().data) return;
    a.innerHTML = vidhaldHtml(); b.innerHTML = skirteiniHtml();
  }
  // Eignasíða: liðir eignarinnar + „Setja upp áætlun"
  function eignHtml(b) {
    if (!syn().vinnusvaedi || !b || b.id == null) return '';
    var L = vhL().filter(function (r) { return r.fid === b.id; });
    return '<section class="dsec"><h4>Viðhaldsáætlun <span class="cnt">' + (L.length ? L.length + ' liðir · ' + L.filter(function (r) { return vhStada(r) === 'seint'; }).length + ' á eftir' : '') + '</span></h4>' +
      (L.length ? '<div class="dpanel">' + L.map(function (r) { return vhRod(r, false); }).join('') + '</div>' : '<div class="dpanel"><div class="dempty">Engin áætlun fyrir þessa eign enn.</div></div>') +
      '<div class="kfoot2"><span>Tíðni per kerfi, næsta dagsetning af síðustu skoðun, skírteini með gildistíma. Liðir birtast í dagatali vinnusvæðisins.</span><button type="button" class="kbtn sm" data-vh-tillogur="' + b.id + '">' + ic('plus', 2.2) + 'Setja upp áætlun</button></div></section>';
  }
  function vhApi(body) {
    if (st().demo) {
      var L = data().vidhald = data().vidhald || [];
      if (body.action === 'vh_add') (body.rows || [body]).forEach(function (r) { var sid = r.sidast || null, t = +r.tidni || 12; L.push({ id: Date.now() + Math.random(), fid: +r.site_id, kerfi: r.kerfi, heiti: r.heiti, tidni: t, sidast: sid, naest: sid ? vhPlus(sid, t) : null, abyrgd: r.abyrgd || 'okkar', minning: +r.minning || 30, ath: r.ath || '', skirteini: null, gildir_til: null }); });
      else { var it = L.filter(function (x) { return x.id === body.id; })[0];
        if (body.action === 'vh_gert' && it) { it.sidast = body.dags || new Date().toISOString().slice(0, 10); it.naest = vhPlus(it.sidast, it.tidni); }
        else if (body.action === 'vh_edit' && it) { ['heiti', 'abyrgd', 'ath'].forEach(function (k) { if (body[k] != null) it[k] = body[k]; }); if (body.tidni) it.tidni = +body.tidni; if (body.minning) it.minning = +body.minning; if (body.sidast !== undefined) { it.sidast = body.sidast; it.naest = it.sidast ? vhPlus(it.sidast, it.tidni) : null; } }
        else if (body.action === 'vh_skirteini' && it) { it.gildir_til = body.gildir_til || null; if (body.gogn) it.skirteini = { url: body.gogn, heiti: body.heiti }; }
        else if (body.action === 'vh_eyda') data().vidhald = L.filter(function (x) { return x.id !== body.id; }); }
      renderVidhald(); $('#vs-dagatal').innerHTML = dagatalHtml(); return Promise.resolve(true);
    }
    return api(body).then(function (res) {
      if (!res.ok) { toast((res.j && res.j.error) || 'Vistun tókst ekki'); return false; }
      data().vidhald = res.j.vidhald || []; renderVidhald(); $('#vs-dagatal').innerHTML = dagatalHtml();
      var drb = G().drB(); if (drb && !$('#drawer').classList.contains('hidden')) endurteiknaDrawer(drb.id);
      return true;
    });
  }
  function vhPlus(d, m) { var x = new Date(d + 'T00:00:00'); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0, 10); }
  // Gluggi: tillögur (hak-listi úr kerfum eignar) eða stakur liður (nýr/breyta)
  function opnaVh(mode, b, r) {
    vhB = b || null; vhId = r ? r.id : null;
    var L = allarEignir(), sel = $('#vh-eign');
    sel.innerHTML = L.map(function (x) { return '<option value="' + x.id + '"' + (b && x.id === b.id ? ' selected' : '') + '>' + esc(x.nafn) + '</option>'; }).join('');
    $('#vh-kerfi').innerHTML = Object.keys(VH_KERFI).map(function (k) { return '<option value="' + k + '">' + esc(vhKerfiHeiti(k) || VH_KERFI[k][0]) + '</option>'; }).join('');
    $('#vh-tillogur-wrap').classList.toggle('hidden', mode !== 'tillogur');
    $('#vh-stak-wrap').classList.toggle('hidden', mode === 'tillogur');
    $('#vh-eyda').classList.toggle('hidden', !r);
    $('#vh-h').textContent = mode === 'tillogur' ? 'Setja upp áætlun' : r ? 'Breyta lið' : 'Nýr liður';
    $('#vh-sub').textContent = b ? b.nafn + (b.heimilisfang ? ' · ' + b.heimilisfang : '') : '';
    $('#vh-send-l').textContent = mode === 'tillogur' ? 'Setja í áætlun' : 'Vista';
    if (mode === 'tillogur') {
      if (!b) { b = L[0]; vhB = b; sel.value = b ? b.id : ''; }
      vhTillogur(b);
      sel.onchange = function () { vhB = eignAfId(+sel.value); $('#vh-sub').textContent = vhB ? vhB.nafn : ''; vhTillogur(vhB); };
    } else {
      sel.onchange = null;
      $('#vh-kerfi').value = r ? (r.kerfi || 'annad') : 'annad'; $('#vh-heiti').value = r ? r.heiti : ''; $('#vh-tidni').value = r ? String(r.tidni) : '12';
      $('#vh-sidast').value = r && r.sidast ? r.sidast : ''; $('#vh-abyrgd').value = r ? r.abyrgd : 'okkar'; $('#vh-minning').value = r ? String(r.minning || 30) : '30'; $('#vh-ath').value = r ? (r.ath || '') : '';
      $('#vh-kerfi').onchange = function () { var k = $('#vh-kerfi').value; if (!$('#vh-heiti').value.trim() && VH_KERFI[k]) { $('#vh-heiti').value = VH_KERFI[k][0]; $('#vh-tidni').value = String(VH_KERFI[k][1]); } };
    }
    $('#vh-modal').setAttribute('data-mode', mode);
    $('#vh-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
  }
  function vhTillogur(b) {
    var box = $('#vh-tillogur'); if (!b) { box.innerHTML = ''; return; }
    var til = vhL().filter(function (r) { return r.fid === b.id; }).map(function (r) { return r.kerfi; });
    var K = (b.kerfi || []).filter(function (k) { return (k.til === 'ja' || k.adili === 'okkar') && VH_KERFI[k.k] && til.indexOf(k.k) < 0; }).map(function (k) { return { k: k.k, okkar: k.adili === 'okkar' }; });
    if (b.br && !K.some(function (x) { return x.k === 'brunavidvorunarkerfi'; }) && til.indexOf('brunavidvorunarkerfi') < 0) K.push({ k: 'brunavidvorunarkerfi', okkar: true });
    if ((b.sl || b.taeki) && !K.some(function (x) { return x.k === 'slokkvitaeki'; }) && til.indexOf('slokkvitaeki') < 0) K.push({ k: 'slokkvitaeki', okkar: true });
    ['eldvarnaeftirlit', 'rafmagn', 'brunathettingar'].forEach(function (k) { if (!K.some(function (x) { return x.k === k; }) && til.indexOf(k) < 0) K.push({ k: k, okkar: k !== 'eldvarnaeftirlit', valfrjals: true }); });
    box.innerHTML = K.length ? K.map(function (x) {
      return '<label><input type="checkbox" value="' + x.k + '" data-okkar="' + (x.okkar ? 1 : 0) + '"' + (x.valfrjals ? '' : ' checked') + '><span>' + esc(VH_KERFI[x.k][0]) + '</span><small>' + VH_KERFI[x.k][1] + ' mán. · ' + (x.okkar ? 'okkar' : 'eigandi') + '</small></label>';
    }).join('') : '<div class="egp-e">Allt sem kerfin segja til um er þegar í áætlun fyrir þessa eign.</div>';
  }
  function lokaVh() { $('#vh-modal').classList.add('hidden'); lokaLikama(); }
  function sendaVh() {
    var mode = $('#vh-modal').getAttribute('data-mode'), btn = $('#vh-send'); btn.disabled = true;
    var p;
    if (mode === 'tillogur') {
      var rows = [].slice.call(document.querySelectorAll('#vh-tillogur input:checked')).map(function (c) { return { site_id: vhB && vhB.id, kerfi: c.value, heiti: VH_KERFI[c.value][0], tidni: VH_KERFI[c.value][1], abyrgd: c.getAttribute('data-okkar') === '1' ? 'okkar' : 'eigandi', minning: 30 }; });
      if (!rows.length) { btn.disabled = false; toast('Hakaðu við liði'); return; }
      p = vhApi({ action: 'vh_add', rows: rows });
    } else {
      var body = { site_id: parseInt($('#vh-eign').value, 10), kerfi: $('#vh-kerfi').value, heiti: $('#vh-heiti').value.trim(), tidni: +$('#vh-tidni').value, sidast: $('#vh-sidast').value || null, abyrgd: $('#vh-abyrgd').value, minning: +$('#vh-minning').value, ath: $('#vh-ath').value.trim() };
      if (!body.heiti) { btn.disabled = false; toast('Skrifaðu heiti'); $('#vh-heiti').focus(); return; }
      if (vhId) { body.action = 'vh_edit'; body.id = vhId; } else body.action = 'vh_add';
      p = vhApi(body);
    }
    p.then(function (ok) { btn.disabled = false; if (ok) { lokaVh(); toast(mode === 'tillogur' ? 'Áætlunin er komin inn' : 'Vistað'); } });
  }
  function vhSkjal(id, file) {
    if (!file) return;
    var r = vhL().filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var gt = window.prompt('Gildir til (ÁÁÁÁ-MM-DD) — má vera autt:', r.gildir_til || '');
    if (gt === null) return;
    gt = gt.trim(); if (gt && !/^\d{4}-\d{2}-\d{2}$/.test(gt)) { toast('Dagsetning á forminu ÁÁÁÁ-MM-DD'); return; }
    if (file.size > 8 * 1024 * 1024) { toast('Skráin er stærri en 8 MB'); return; }
    toast('Hleð upp…');
    (/^image\//.test(file.type) ? minnkaMynd(file, 2400).then(function (m) { return m.data; }) : lesaSkra(file)).then(function (d) {
      return vhApi({ action: 'vh_skirteini', id: id, gogn: d, heiti: file.name, gildir_til: gt || null });
    }).then(function (ok) { if (ok) toast('Skírteinið er vistað'); }, function () { toast('Skráin lesist ekki'); });
  }

  /* ═══ QR-MERKI EIGNAR: leigutaki skannar → tilkynnir án innskráningar (/gatt/q/?t=…) ═══ */
  var qrP = null;
  function saekjaQr() {
    if (window.QRCode) return Promise.resolve();
    if (!qrP) qrP = new Promise(function (res, rej) { var sk = document.createElement('script'); sk.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sk.onload = res; sk.onerror = function () { qrP = null; rej(new Error('qr')); }; document.head.appendChild(sk); });
    return qrP;
  }
  function opnaQr(b) {
    if (!b) return;
    var box = $('#qr-k'); box.innerHTML = '<div class="ft" style="position:static">Bý til merki…</div>';
    $('#qr-e').textContent = b.nafn || ''; $('#qr-a').textContent = b.heimilisfang || ''; $('#qr-url').textContent = '';
    $('#qr-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    (st().demo ? Promise.resolve({ ok: true, j: { url: location.origin + '/gatt/q/?t=9000.synishorn' } }) : api({ action: 'qr', site_id: b.id })).then(function (res) {
      if (!res.ok) { box.innerHTML = '<div class="ft" style="position:static">' + esc((res.j && res.j.error) || 'Tókst ekki') + '</div>'; return; }
      var url = res.j.url; $('#qr-url').textContent = url; $('#qr-modal').setAttribute('data-url', url);
      saekjaQr().then(function () { box.innerHTML = ''; new window.QRCode(box, { text: url, width: 180, height: 180, correctLevel: window.QRCode.CorrectLevel.M }); },
        function () { box.innerHTML = '<div class="ft" style="position:static">QR-safnið hlóðst ekki — slóðin er hér að neðan</div>'; });
    });
  }
  function lokaQr() { $('#qr-modal').classList.add('hidden'); lokaLikama(); }

  /* ═══ GREINING FASTEIGNAR á eignasíðu (12.10.2026, Agnar: „má alveg hafa allt greiningartólið með, og hök") ═══
     Sömu opinberu heimildir og síðan „Greining fasteignar" (451) í appinu: fasteign-opin (Staðfanga-/Landeignaskrá),
     bygging-uppl (skráningartafla + byggingarlýsing, OCR á skrifstofutölvu), teikn-listi (skjalasafn). Kröfur eftir
     tegund koma með kerfunum (v_stadur_kerfi/flokkar_krofur). Hökin velja hvað sést — vistuð í portal_users.stillingar. */
  var GR_HLUTAR = [['eignin', 'Eignin'], ['bygging', 'Byggingarupplýsingar'], ['brunavarnir', 'Brunavarnir úr byggingarlýsingu'], ['krofur', 'Kröfur eftir tegund'], ['skjalasafn', 'Teikningar úr skjalasafni']];
  var grCache = {};
  function grStill() { var s = (data().account && data().account.stillingar && data().account.stillingar.greining) || {}, o = {}; GR_HLUTAR.forEach(function (h) { o[h[0]] = s[h[0]] !== false; }); return o; }
  function grTala(n) { return n == null || n === '' ? '—' : Number(n).toLocaleString('is-IS'); }
  function grEignHtml(b) {
    if (!syn().fasteign || !b || b.id == null) return '';
    var st2 = grStill();
    return '<section class="dsec" id="gr-sec" data-gr-fid="' + b.id + '"><h4>Greining fasteignar <span class="cnt">opinber gögn · sjálfsótt</span></h4>' +
      '<div class="gr-hok">' + GR_HLUTAR.map(function (h) { return '<label><input type="checkbox" data-gr-hak="' + h[0] + '"' + (st2[h[0]] ? ' checked' : '') + '>' + esc(h[1]) + '</label>'; }).join('') + '</div>' +
      '<div class="gr-grid">' +
        '<div class="gr-p" id="gr-eignin"' + (st2.eignin ? '' : ' hidden') + '><div class="gr-h">Eignin<span>Staðfangaskrá · Landeignaskrá HMS</span></div><div class="gr-b"><div class="dim">Sæki…</div></div></div>' +
        '<div class="gr-p" id="gr-bygging"' + (st2.bygging ? '' : ' hidden') + '><div class="gr-h">Byggingarupplýsingar<span>skráningartafla · skjalasafn</span></div><div class="gr-b"><div class="dim">Sæki…</div></div></div>' +
        '<div class="gr-p wide" id="gr-brunavarnir"' + (st2.brunavarnir ? '' : ' hidden') + '><div class="gr-h">Brunavarnir úr byggingarlýsingu<span>orðrétt · OCR</span></div><div class="gr-b"><div class="dim">Sæki…</div></div></div>' +
        '<div class="gr-p wide" id="gr-krofur"' + (st2.krofur ? '' : ' hidden') + '><div class="gr-h">Kröfur eftir tegund<span>' + esc((b.flokkun && b.flokkun.tegund) || (b.eign && b.eign.tegund) || '') + (b.flokkun && b.flokkun.flokkur ? ' · notkunarflokkur ' + esc(b.flokkun.flokkur) : '') + '</span></div><div class="gr-b">' + grKrofurHtml(b) + '</div></div>' +
        '<div class="gr-p wide" id="gr-skjalasafn"' + (st2.skjalasafn ? '' : ' hidden') + '><div class="gr-h">Teikningar úr skjalasafni<span>aðaluppdrættir</span></div><div class="gr-b"><div class="dim">Sæki…</div></div></div>' +
      '</div></section>';
  }
  function grKrofurHtml(b) {
    var L = (b.kerfi || []).slice().sort(function (a, c) { return (G().KERFI_ROD || []).indexOf(a.k) - (G().KERFI_ROD || []).indexOf(c.k); });
    if (!L.length) return '<div class="dim">Engin flokkun skráð á eignina enn — kröfurnar birtast þegar tegund hennar hefur verið staðfest við fyrstu úttekt.</div>';
    return '<table class="gr-kr"><thead><tr><th>Kerfi</th><th>Krafa</th><th>Til staðar</th><th>Skilyrði / magn · heimild</th></tr></thead><tbody>' + L.map(function (k) {
      var heiti = (G().KERFI_HEITI && G().KERFI_HEITI[k.k]) || k.k;
      return '<tr><td><b>' + esc(heiti) + '</b></td><td><span class="kst ' + (k.skylt === 'ja' ? 'til' : k.skylt === 'skilyrt' ? 'oskrad' : 'ekki') + '">' + esc(k.skylt === 'ja' ? 'Skylt' : k.skylt === 'skilyrt' ? 'Skilyrt' : 'Ekki skylt') + '</span></td>' +
        '<td>' + (k.til === 'ja' ? '<span class="kst okkar">Já' + (k.adili === 'okkar' ? ' · okkar' : '') + '</span>' : k.til === 'nei' ? '<span class="kst vantar">Nei</span>' : '<span class="kst oskrad">Óvitað</span>') + '</td>' +
        '<td>' + (k.skilyrdi ? esc(k.skilyrdi) : '<span class="dim">—</span>') + (k.heimild ? '<br>' + (k.url ? '<a href="' + esc(k.url) + '" target="_blank" rel="noopener">' + esc(k.heimild) + '</a>' : '<span class="dim">' + esc(k.heimild) + '</span>') : '') + '</td></tr>';
    }).join('') + '</tbody></table><div class="gr-src">Kröfur úr reglusafni (byggingarreglugerð 112/2012, reglugerð 723/2017) eftir tegund og notkunarflokki — leiðbeinandi; endanlegt mat er hjá hönnuði og slökkviliði. <em>sjálfsótt</em></div>';
  }
  function grSet(id, html) { var el = document.querySelector('#' + id + ' .gr-b'); if (el) el.innerHTML = html; }
  function grJson(url, ms) { return fetch(url, { signal: AbortSignal.timeout(ms || 20000) }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function grLifga(b) {
    var sec = $('#gr-sec'); if (!sec || !b || +sec.getAttribute('data-gr-fid') !== b.id) return;
    if (st().demo) { grSet('gr-eignin', '<div class="dim">Sýnishorn — í raunverulegri eign sækir gáttin staðfang, landnúmer, heitinúmer, sveitarfélag, matshluta og lóð úr skrám HMS og sýnir eignina á korti.</div>'); grSet('gr-bygging', '<div class="dim">Sýnishorn — brúttóflötur, hæðir, byggingarár og skjölin í skjalasafninu (skráningartöflur, byggingarlýsingar) koma hér.</div>'); grSet('gr-brunavarnir', '<div class="dim">Sýnishorn — orðréttar setningar úr byggingarlýsingu hússins um brunahólfun, vatnsúðakerfi, brunaviðvörunarkerfi, flóttaleiðir og slökkvitæki.</div>'); grSet('gr-skjalasafn', '<div class="dim">Sýnishorn — fjöldi og smámyndir aðaluppdrátta úr skjalasafni sveitarfélagsins.</div>'); return; }
    var c = grCache[b.id];
    if (c) { grFylla(b, c); return; }
    c = grCache[b.id] = { adr: b.heimilisfang || '' };
    var hnit = b.eign && (b.eign.hnit || (isFinite(+b.eign.lat) && +b.eign.lat ? { lat: +b.eign.lat, lng: +b.eign.lng } : null));
    var q = b.eign && b.eign.heitinr ? 'heitinr=' + encodeURIComponent(b.eign.heitinr) : 'heimilisfang=' + encodeURIComponent(c.adr);
    grJson('/.netlify/functions/fasteign-opin?' + q, 15000).then(function (j) { c.opin = j || false; grFylla(b, c);
      var landnr = (j && j.eign && j.eign.landnr) || (b.eign && b.eign.landnr);
      if (landnr) grJson('/.netlify/functions/teikn-listi?landnr=' + encodeURIComponent(landnr), 25000).then(function (t) { c.teikn = t || false; grFylla(b, c); });
      else { c.teikn = false; grFylla(b, c); }
    });
    grJson('/.netlify/functions/bygging-uppl?heimilisfang=' + encodeURIComponent(c.adr), 28000).then(function (j) { c.bygg = j && !j.error ? j : false; grFylla(b, c); });
    if (hnit) c.hnit = hnit;
  }
  var EFNI_H = { brunaholfun: 'Brunahólfun', brunavidvorunarkerfi: 'Brunaviðvörunarkerfi', vatnsudakerfi: 'Vatnsúðakerfi', neydarlysing: 'Neyðarlýsing', handslokkvitaeki: 'Slökkvitæki', brunaslongur: 'Brunaslöngur / slöngukefli', flottaleidir: 'Flóttaleiðir', reyklosun: 'Reyklosun', thjonustusamningur: 'Þjónustusamningur', brunahonnun: 'Brunahönnun', stigahus: 'Stigahús', lyfta: 'Lyfta' };
  function grFylla(b, c) {
    var sec = $('#gr-sec'); if (!sec || +sec.getAttribute('data-gr-fid') !== b.id) return;
    // Eignin
    if (c.opin !== undefined) {
      var o = c.opin, e = o && o.eign;
      if (!o) grSet('gr-eignin', '<div class="dim">Staðfangaskrá svaraði ekki fyrir þetta heimilisfang.</div>');
      else {
        var hn = e && isFinite(+e.lat) ? { lat: +e.lat, lng: +e.lon } : c.hnit;
        grSet('gr-eignin', '<dl class="gr-kv"><dt>Staðfang</dt><dd>' + esc((e && e.label) || c.adr) + '</dd>' +
          '<dt>Landnúmer</dt><dd>' + (e && e.landnr ? '<a href="https://geo.fasteignaskra.is/landeignaskra/' + esc(e.landnr) + '" target="_blank" rel="noopener">L' + esc(e.landnr) + '</a>' : '—') + '</dd>' +
          '<dt>Heitinúmer</dt><dd>' + esc(e && e.heitinr ? e.heitinr : '—') + '</dd>' +
          '<dt>Sveitarfélag</dt><dd>' + esc(e && e.postnr ? e.postnr : '') + (e && e.svfnr ? ' <small>svf. ' + esc(e.svfnr) + '</small>' : '') + '</dd>' +
          (o.einingar ? '<dt>Matshlutar</dt><dd>' + esc(o.einingar.mhl != null ? o.einingar.mhl : '—') + (o.einingar.fjoldi ? ' <small>· ' + o.einingar.fjoldi + ' eignarhlutar</small>' : '') + '</dd>' : '') +
          (o.lod ? '<dt>Lóð</dt><dd>' + grTala(o.lod.skrad_m2 || o.lod.maeld_m2) + ' m² <small>Landeignaskrá</small></dd>' : '') + '</dl>' +
          (hn ? '<div class="gr-kort" id="gr-kort"></div>' : '') +
          '<div class="gr-src">Staðfangaskrá og Landeignaskrá HMS (opið WFS)' + (hn ? ' · kort: Esri' : '') + ' <em>sjálfsótt</em></div>');
        if (hn) saekjaLeaflet().then(function () { var el = $('#gr-kort'); if (!el || el._k) return; var m = window.L.map(el, { scrollWheelZoom: false, zoomControl: false, attributionControl: false }).setView([hn.lat, hn.lng], 16); el._k = m; window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(m); window.L.marker([hn.lat, hn.lng], { icon: merkiHtml(b, true) }).addTo(m); setTimeout(function () { m.invalidateSize(); }, 80); });
      }
    }
    // Byggingarupplýsingar + brunavarnir
    if (c.bygg !== undefined) {
      var g = c.bygg;
      if (!g) { grSet('gr-bygging', '<div class="dim">Engin byggingargögn fundust í skjalasafni fyrir þetta heimilisfang.</div>'); grSet('gr-brunavarnir', '<div class="dim">Engin byggingarlýsing fannst.</div>'); }
      else {
        var hd = g.haedir && (g.haedir.ofanjardar != null ? g.haedir.ofanjardar : g.haedir), heim = Array.isArray(g.heimildir) ? g.heimildir : [];
        grSet('gr-bygging', '<div class="gr-tolur">' +
          '<div class="gr-t"><div class="k">m² brúttó</div><div class="v">' + (g.m2 ? grTala(Math.round(g.m2)) : '—<small> ekki lesið</small>') + '</div></div>' +
          '<div class="gr-t"><div class="k">Hæðir</div><div class="v">' + (hd != null && typeof hd !== 'object' ? esc(hd) : '—<small> ekki lesið</small>') + '</div></div>' +
          '<div class="gr-t"><div class="k">Byggt</div><div class="v">' + (g.byggingarar ? esc(g.byggingarar) : (b.eign && b.eign.byggingarar ? esc(b.eign.byggingarar) : '—')) + '</div></div>' +
          '<div class="gr-t"><div class="k">Eignarhlutar</div><div class="v">' + (g.eignir != null ? esc(g.eignir) : '—') + '</div></div></div>' +
          (g.notkunarflokkur_lysing ? '<div>Byggingarlýsingin segir notkunarflokk <b>' + esc(g.notkunarflokkur_lysing) + '</b></div>' : '') +
          (heim.length ? '<div class="lbl" style="margin-top:8px">Skjöl í safninu</div><ul class="gr-skjol" style="list-style:none;margin:4px 0 0;padding:0">' + heim.slice(0, 8).map(function (x) {
            return '<li><i class="' + (x.lesin ? 'on' : '') + '"></i><span>' + esc(x.tegund === 'skraningartafla' ? 'Skráningartafla' : x.tegund === 'byggingarlysing' ? 'Byggingarlýsing' : (x.tegund || 'Skjal')) + '</span><span class="dd">' + esc(fmtDate(x.dags)) + '</span>' + (x.matshluti ? '<small class="dim">mhl. ' + esc(x.matshluti) + '</small>' : '') + (x.slod ? '<a href="' + esc(x.slod) + '" target="_blank" rel="noopener">opna</a>' : '') + (x.lesin ? '' : '<small class="dim">ólesið</small>') + '</li>';
          }).join('') + (heim.length > 8 ? '<li><small class="dim">+ ' + (heim.length - 8) + ' fleiri</small></li>' : '') + '</ul>' : '<div class="dim">Engin skráningartafla eða byggingarlýsing í safninu.</div>') +
          '<div class="gr-src">Skráningartafla og byggingarlýsing úr skjalasafni sveitarfélags, lesin með OCR á skrifstofu Slökkvitækja — tölur birtast aðeins þegar þær hafa verið lesnar, aldrei ágiskaðar. <em>sjálfsótt</em></div>');
        var bv = g.brunavarnir, efni = bv && bv.efni ? bv.efni : null;
        if (!efni) { var lys = heim.filter(function (x) { return x.tegund === 'byggingarlysing'; }).length; grSet('gr-brunavarnir', '<div class="dim">' + (lys ? lys + (lys === 1 ? ' byggingarlýsing fannst' : ' byggingarlýsingar fundust') + ' í safninu en hefur ekki verið lesin enn — Slökkvitæki les hana á skrifstofunni við fyrstu úttekt.' : 'Engin byggingarlýsing fannst í skjalasafninu.') + '</div>'); }
        else {
          var K = Object.keys(EFNI_H).filter(function (k) { return efni[k] && (efni[k].fjoldi || (efni[k].daemi || []).length); });
          grSet('gr-brunavarnir', (K.length ? '<div class="gr-bv">' + K.map(function (k) {
            var x = efni[k], d = (x.daemi || []).slice(0, 2);
            return '<div><b>' + esc(EFNI_H[k]) + ' <small class="dim" style="font-weight:400">' + (x.fjoldi || d.length) + '× nefnt</small></b>' + d.map(function (y) { return '<q class="' + (y.neitun ? 'neit' : '') + '">' + esc(y.setning || '') + '</q>'; }).join('') + '</div>';
          }).join('') + '</div>' : '<div class="dim">Lýsingin nefnir engar brunavarnir.</div>') +
            '<div class="gr-src">Orðrétt úr byggingarlýsingu ' + esc(fmtDate(bv.dags)) + ' · ' + (bv.heimild === 'textalag' ? 'textalag PDF' : 'OCR af skannaðri mynd — getur verið rangt lesið') + (bv.slod ? ' · <a href="' + esc(bv.slod) + '" target="_blank" rel="noopener">skjalið</a>' : '') + ' <em>sjálfsótt</em></div>');
        }
      }
    }
    // Teikningar úr skjalasafni
    if (c.teikn !== undefined) {
      var tt = c.teikn, L = tt && Array.isArray(tt.results) ? tt.results.filter(function (d) { return d && !d.urelt; }) : [];
      if (!tt || !L.length) grSet('gr-skjalasafn', '<div class="dim">' + (tt ? 'Engar gildandi teikningar fundust í skjalasafninu fyrir þetta landnúmer.' : 'Skjalasafnið svaraði ekki.') + '</div>');
      else {
        var grunn = L.filter(function (d) { return d.grunnmynd; }), med = L.filter(function (d) { return d.thumb; }).slice(0, 8);
        grSet('gr-skjalasafn', '<div class="gr-tolur"><div class="gr-t"><div class="k">Blöð</div><div class="v">' + L.length + '</div></div><div class="gr-t"><div class="k">Grunnmyndir</div><div class="v">' + grunn.length + '</div></div><div class="gr-t"><div class="k">Gildandi</div><div class="v">' + (tt.gildandi != null ? tt.gildandi : L.length) + '</div></div><div class="gr-t"><div class="k">Alls í safni</div><div class="v">' + (tt.fjoldi != null ? tt.fjoldi : L.length) + '</div></div></div>' +
          (med.length ? '<div class="gr-thumbs">' + med.map(function (d) { return '<a href="' + esc(d.infoUrl || d.thumb) + '" target="_blank" rel="noopener"><img src="/.netlify/functions/teikn-mynd?url=' + encodeURIComponent(d.thumb) + '" alt="" loading="lazy"><small>' + esc([d.haed, d.lysing].filter(Boolean).join(' · ') || d.tegund || 'Teikning') + (d.dags ? ' · ' + esc(fmtDate(d.dags)) : '') + '</small></a>'; }).join('') + '</div>' : '') +
          '<div class="gr-src">' + esc(tt.heimild || 'Skjalasafn sveitarfélags') + ' — teikningarnar sem Slökkvitæki merkir búnað inn á koma héðan. <em>sjálfsótt</em></div>');
      }
    }
  }
  function grHak(k, on) {
    var el = $('#gr-' + k); if (el) el.hidden = !on;
    var st2 = grStill(); st2[k] = on;
    if (data().account) { data().account.stillingar = data().account.stillingar || {}; data().account.stillingar.greining = st2; }
    if (!st().demo) api({ action: 'stillingar', stillingar: { greining: st2 } }).then(function (res) { if (!res.ok) toast('Valið vistaðist ekki'); });
  }

  /* ═══ VERKBEIÐNIR-FLIPI: velja eign → teikningar → punktur + mynd → senda ═══ */
  var vbtB = null, vbtQ = '';
  function imgW(u, w) { return /images\.prismic\.io/.test(u || '') ? u + (u.indexOf('?') > -1 ? '&' : '?') + 'w=' + w : (u || ''); }
  function vbtPassar(b) {
    if (!vbtQ) return true;
    return ((b.nafn || '') + ' ' + (b.heimilisfang || '')).toLowerCase().indexOf(vbtQ) > -1;
  }
  function renderVerkbeidnir() {
    var tab = document.querySelector('nav .tab[data-view="verkbeidnir"]'), v = $('#v-verkbeidnir');
    if (!tab || !v || !st().data) return;
    var sn = syn(), synileg = !!(sn.verkbeidni || sn.punktar);
    tab.classList.toggle('hidden', !synileg);
    if (!synileg) return;
    var L = allarEignir(), inni = data().buildings || [];
    $('#vbt-list').innerHTML = L.filter(vbtPassar).slice(0, 24).map(function (b) {
      var e = b.eign || {}, n = erindi().filter(function (x) { return x.fid === b.id && x.stada !== 'lokid'; }).length;
      return '<button type="button" class="vbt-c" data-vbt-pick="' + b.id + '"><i' + (e.mynd ? ' style="background-image:url(' + esc(imgW(e.mynd, 200)) + ')"' : '') + '></i><span><b>' + esc(b.nafn) + '</b><small>' + esc(b.heimilisfang || '') + (b.teikning && b.teikning.length ? ' · ' + b.teikning.length + (b.teikning.length === 1 ? ' teikning' : ' teikningar') : ' · engin teikning') + '</small></span>' +
        (n ? '<span class="kst til">' + n + ' opin</span>' : (inni.indexOf(b) > -1 ? '<span class="kst okkar">Í þjónustu</span>' : '')) + '</button>';
    }).join('') || '<div class="egp-e">Engin eign passar við „' + esc(vbtQ) + '".</div>';
    if (vbtB && L.indexOf(vbtB) < 0) vbtB = null;
    $('#vbt-eign').classList.toggle('hidden', !vbtB);
    if (vbtB) vbtEign();
    var opin = erindi().filter(function (e) { return e.stada !== 'lokid' && (e.tegund === 'verkbeidni' || e.tegund === 'verkefni'); });
    $('#vbt-oll-cnt').textContent = opin.length ? opin.length + ' opnar' : '';
    $('#vbt-oll-l').innerHTML = opin.length ? opin.slice(0, 20).map(function (e) { return G().erindiRod(e, true); }).join('') : '<div class="dempty">Engar opnar verkbeiðnir. Veldu eign að ofan og settu punkt á teikninguna.</div>';
  }
  function vbtEign() {
    var b = vbtB, sn = syn();
    $('#vbt-nafn').textContent = b.nafn || ''; $('#vbt-addr').textContent = b.heimilisfang || '';
    var qb = $('#vbt-qr'); if (qb) qb.classList.toggle('hidden', !sn.verkbeidni);
    var tk = (b.teikning || []).filter(function (f) { return f && f.mynd; });
    $('#vbt-hint').innerHTML = tk.length
      ? ic('teikning', 1.8) + ' Smelltu á <b>+ Punktur</b> á hæðinni og svo á teikninguna þar sem verkið er — eða á teikninguna sjálfa til að stækka hana og merkja þar. Mynd af síma fylgir með.'
      : 'Engin teikning er skráð á þessa eign enn. Sendu verkbeiðnina með staðsetningu í texta; við merkjum teikningar inn við fyrstu úttekt.';
    var g = $('#vbt-tk'); g.innerHTML = '';
    tk.forEach(function (f, j) { g.appendChild(G().haedarSpjald(b, f, j, sn)); });
    var L = erindi().filter(function (e) { return e.fid === b.id; }), op = L.filter(function (e) { return e.stada !== 'lokid'; }).length;
    $('#vbt-cnt').textContent = L.length ? op + ' opin · ' + (L.length - op) + ' lokið' : '';
    $('#vbt-erindi').innerHTML = L.length ? L.slice(0, 12).map(function (e) { return G().erindiRod(e, false); }).join('') : '<div class="dempty">Engin verkbeiðni enn á þessari eign.</div>';
  }
  function vbtVelja(id) {
    vbtB = eignAfId(id) || null;
    renderVerkbeidnir();
    var el = $('#vbt-eign'); if (el && vbtB) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Sýnishorn ── */
  function demo(DEMO) {
    DEMO.account.syn.punktar = true; DEMO.account.syn.vinnusvaedi = true; DEMO.account.syn.baeta_eign = true;
    var nu = Date.now();
    DEMO.erindi = (DEMO.erindi || []).concat([
      { id: 11, fid: 9000, titill: 'Leki við úðara á gangi', lysing: 'Dropar úr lofti við herbergi 214 — vatn á gólfi.', stada: 'i_vinnslu', tegund: 'verkbeidni', abyrgd: 'okkar', punktur: { haed: 1, nafn: '1. hæð', x: 760, y: 455 }, dags: new Date(nu - 3 * 864e5).toISOString(), myndir: [], eftirmyndir: [] },
      { id: 12, fid: 9000, titill: 'Neyðarljós dautt í stigahúsi', stada: 'lokid', tegund: 'verkbeidni', abyrgd: 'okkar', punktur: { haed: 1, nafn: '1. hæð', x: 300, y: 450 }, dags: new Date(nu - 12 * 864e5).toISOString(), lokid: new Date(nu - 2 * 864e5).toISOString(), lokid_lysing: 'Nýr lampi settur og prófaður.', myndir: [], eftirmyndir: [] },
      { id: 13, fid: 9000, titill: 'Fjarlægja fleyg úr brunahurð 2. hæð', stada: 'mottekid', tegund: 'verkefni', abyrgd: 'eigandi', punktur: { haed: 2, nafn: '2. hæð', x: 540, y: 450 }, dags: new Date(nu - 864e5).toISOString(), frestur: new Date(nu + 6 * 864e5).toISOString().slice(0, 10), myndir: [], eftirmyndir: [] },
      { id: 14, fid: 9001, titill: 'Málning á gangi — annar verktaki', stada: 'mottekid', tegund: 'verkefni', abyrgd: 'annar', punktur: null, dags: new Date(nu - 5 * 864e5).toISOString(), myndir: [], eftirmyndir: [] },
    ]);
    var d0 = new Date(), iso = function (dd) { var x = new Date(d0); x.setDate(x.getDate() + dd); return x.toISOString().slice(0, 10); };
    DEMO.vidhald = [
      { id: 1, fid: 9000, kerfi: 'brunavidvorunarkerfi', heiti: 'Brunaviðvörunarkerfi — árleg skoðun', tidni: 12, sidast: iso(-380), naest: iso(-15), abyrgd: 'okkar', minning: 30, ath: '', skirteini: null, gildir_til: null },
      { id: 2, fid: 9000, kerfi: 'neydarlysing', heiti: 'Neyðarlýsing — árleg fullprófun', tidni: 12, sidast: iso(-340), naest: iso(25), abyrgd: 'okkar', minning: 30, ath: '', skirteini: { url: '#', heiti: 'Neyðarlýsing 2025.pdf' }, gildir_til: iso(25) },
      { id: 3, fid: 9001, kerfi: 'rafmagn', heiti: 'Rafskoðun — töflur og lagnir', tidni: 48, sidast: iso(-700), naest: iso(760), abyrgd: 'annar', minning: 60, ath: '', skirteini: { url: '#', heiti: 'Rafskoðun 2024.pdf' }, gildir_til: iso(760) },
      { id: 4, fid: 9003, kerfi: 'slokkvitaeki', heiti: 'Slökkvitæki — árleg skoðun', tidni: 12, sidast: iso(-200), naest: iso(165), abyrgd: 'okkar', minning: 30, ath: '', skirteini: null, gildir_til: null },
    ];
    DEMO.checklist = [
      { id: 1, texti: 'Panta nýjar flóttaleiðamerkingar fyrir kjallara', stjarna: true, lokid: null, rod: 1 },
      { id: 2, texti: 'Senda rýmingaráætlun á starfsfólk', stjarna: false, lokid: null, rod: 2 },
      { id: 3, texti: 'Prófa neyðarlýsingu í bílakjallara', stjarna: false, lokid: new Date(nu - 864e5).toISOString(), rod: 3 },
    ];
    DEMO.items = [
      { id: 1, tegund: 'hlekkur', heiti: 'Rýmingaráætlun (Drive)', url: 'https://drive.google.com/', rod: 1, dags: new Date(nu - 20 * 864e5).toISOString() },
      { id: 2, tegund: 'skjal', heiti: 'Þjónustusamningur 2026.pdf', mime: 'application/pdf', staerd: 418000, url: '#', rod: 2, dags: new Date(nu - 40 * 864e5).toISOString() },
    ];
    DEMO.buildings.forEach(function (b, i) { b.eign = b.eign || {}; b.eign.hnit = { lat: 64.146 + (i % 4) * 0.004, lng: -21.93 + i * 0.006 }; });
  }

  /* ── Atburðir ── */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var x;
    if ((x = t.closest('[data-vb-loka]'))) { opnaLk(+x.getAttribute('data-vb-loka')); return; }
    if ((x = t.closest('[data-vb-syna]'))) { lokaPop(); synaATeikningu(+x.getAttribute('data-vb-syna')); return; }
    if ((x = t.closest('[data-vb-opna]'))) { var ee = erindi().filter(function (q) { return q.id === +x.getAttribute('data-vb-opna'); })[0]; if (ee) { if (ee.punktur) synaATeikningu(ee.id); else { var b = eignAfId(ee.fid), i = (data().buildings || []).indexOf(b), j = (data().eignir_utan || []).indexOf(b); if (i > -1) G().openDrawer(i); else if (j > -1) G().openUtan(j); } } return; }
    if (t.closest('[data-vb-pop-x]')) { lokaPop(); return; }
    if (!t.closest('#vb-pop') && !t.closest('canvas')) lokaPop();
    if (t.closest('#vb-close')) { lokaVb(); return; }
    if (t.closest('#lk-close')) { lokaLk(); return; }
    if ((x = t.closest('#vb-abyrgd button'))) { setAbyrgd(x.getAttribute('data-a')); return; }
    if ((x = t.closest('[data-vh-sia]'))) { vhSia = x.getAttribute('data-vh-sia'); renderVidhald(); return; }
    if ((x = t.closest('[data-vh-tillogur]'))) { var fid0 = +x.getAttribute('data-vh-tillogur'); opnaVh('tillogur', fid0 ? eignAfId(fid0) : (G().drB() || null)); return; }
    if (t.closest('[data-vh-nytt]')) { opnaVh('stak', null, null); return; }
    if ((x = t.closest('[data-vh-breyta]'))) { var vr = vhL().filter(function (q) { return q.id === +x.getAttribute('data-vh-breyta'); })[0]; if (vr) opnaVh('stak', eignAfId(vr.fid), vr); return; }
    if ((x = t.closest('[data-vh-gert]'))) { var vg = vhL().filter(function (q) { return q.id === +x.getAttribute('data-vh-gert'); })[0]; if (vg && window.confirm('Merkja „' + vg.heiti + '" framkvæmt í dag? Næsta dagsetning færist fram um ' + vg.tidni + ' mánuði.')) vhApi({ action: 'vh_gert', id: vg.id }).then(function (ok) { if (ok) toast('Skráð framkvæmt'); }); return; }
    if (t.closest('#vh-close')) { lokaVh(); return; }
    if (t.closest('#vh-eyda')) { if (vhId && window.confirm('Eyða þessum lið úr áætluninni?')) vhApi({ action: 'vh_eyda', id: vhId }).then(function (ok) { if (ok) lokaVh(); }); return; }
    if ((x = t.closest('[data-ck-hak]'))) { var ci = (data().checklist || []).filter(function (q) { return q.id === +x.getAttribute('data-ck-hak'); })[0]; if (ci) ckApi({ action: 'chk_toggle', id: ci.id, lokid: !ci.lokid }); return; }
    if ((x = t.closest('[data-ck-stj]'))) { var cs = (data().checklist || []).filter(function (q) { return q.id === +x.getAttribute('data-ck-stj'); })[0]; if (cs) ckApi({ action: 'chk_stjarna', id: cs.id, stjarna: !cs.stjarna }); return; }
    if ((x = t.closest('[data-ck-eyda]'))) { ckApi({ action: 'chk_eyda', id: +x.getAttribute('data-ck-eyda') }); return; }
    if (t.closest('[data-ck-hreinsa]')) { if (window.confirm('Hreinsa öll kláruð atriði af listanum?')) ckApi({ action: 'chk_hreinsa' }); return; }
    if ((x = t.closest('[data-ck-upp]'))) { ckFaera(+x.getAttribute('data-ck-upp'), -1); return; }
    if ((x = t.closest('[data-ck-nidur]'))) { ckFaera(+x.getAttribute('data-ck-nidur'), 1); return; }
    if ((x = t.closest('[data-vbt-pick]'))) { vbtVelja(+x.getAttribute('data-vbt-pick')); return; }
    if (t.closest('#vbt-an')) { opnaVb(vbtB, null, 'okkar'); return; }
    if (t.closest('#vbt-qr')) { opnaQr(vbtB); return; }
    if (t.closest('#qr-close')) { lokaQr(); return; }
    if (t.closest('#qr-afrita')) { var u = $('#qr-modal').getAttribute('data-url') || ''; if (u && navigator.clipboard) navigator.clipboard.writeText(u).then(function () { toast('Slóðin afrituð'); }); return; }
    if (t.closest('#qr-prenta')) { document.body.classList.add('qr-prent'); setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('qr-prent'); }, 500); }, 50); return; }
    if (t.closest('#vbt-skipta')) { vbtB = null; renderVerkbeidnir(); var q = $('#vbt-leit'); if (q) q.focus(); return; }
    if (t.closest('[data-vs-nytt]')) { opnaVb(null, null, 'eigandi'); return; }
    if (t.closest('[data-vs-nytt-okkar]')) { opnaVb(null, null, 'okkar'); return; }
    if ((x = t.closest('[data-cal]'))) { var d = +x.getAttribute('data-cal'); if (d === 0) { cal.y = new Date().getFullYear(); cal.m = new Date().getMonth(); } else { cal.m += d; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } } $('#vs-dagatal').innerHTML = dagatalHtml(); return; }
    if ((x = t.closest('[data-cal-d]'))) { var r = $('#vs-dagatal .cal-l'); if (r) { var rows = r.querySelectorAll('.egp-r'), dd = +x.getAttribute('data-cal-d'); rows.forEach(function (q) { q.classList.toggle('hl', +(q.querySelector('.egd b') || {}).textContent === dd); }); var hl = r.querySelector('.egp-r.hl'); if (hl) hl.scrollIntoView({ block: 'nearest' }); } return; }
    if ((x = t.closest('[data-vs-csv]'))) { var k = x.getAttribute('data-vs-csv'); if (k === 'eignir') csvEignir(false); else if (k === 'heimilisfong') csvEignir(true); else csvErindi(); return; }
    if (t.closest('[data-vs-prenta]')) { window.print(); return; }
    if ((x = t.closest('[data-vs-baeta]'))) { baetaVid(+x.getAttribute('data-vs-baeta')); return; }
    if ((x = t.closest('[data-vs-opna]'))) { var b2 = eignAfId(+x.getAttribute('data-vs-opna')), i2 = (data().buildings || []).indexOf(b2), j2 = (data().eignir_utan || []).indexOf(b2); if (i2 > -1) G().openDrawer(i2); else if (j2 > -1) G().openUtan(j2); return; }
    if ((x = t.closest('[data-vs-eyda]'))) { eydaItem(+x.getAttribute('data-vs-eyda')); return; }
    if ((x = t.closest('[data-vs-upp]'))) { faera(+x.getAttribute('data-vs-upp'), -1); return; }
    if ((x = t.closest('[data-vs-nidur]'))) { faera(+x.getAttribute('data-vs-nidur'), 1); return; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (placing) haettaPlacing(); lokaPop(); if (!$('#vh-modal').classList.contains('hidden')) lokaVh(); if (!$('#qr-modal').classList.contains('hidden')) lokaQr(); if (!$('#vb-modal').classList.contains('hidden')) lokaVb(); if (!$('#lk-modal').classList.contains('hidden')) lokaLk(); } });
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'vb-form') { e.preventDefault(); sendaVb(); }
    if (e.target.id === 'lk-form') { e.preventDefault(); sendaLk(); }
    if (e.target.id === 'vh-form') { e.preventDefault(); sendaVh(); }
    if (e.target.id === 'ck-form') { e.preventDefault(); var ci2 = $('#ck-inp'), tx = ci2.value.trim(); if (!tx) return; ci2.value = ''; ckApi({ action: 'chk_add', texti: tx }).then(function () { var n = $('#ck-inp'); if (n) n.focus(); }); }
    if (e.target.id === 'vs-hlekkur') { e.preventDefault(); var u = $('#vs-hl-url').value.trim(); if (!/^https?:\/\//i.test(u)) { toast('Slóðin þarf að byrja á https://'); return; } vistaHlekk($('#vs-hl-heiti').value.trim(), u); }
  });
  document.addEventListener('focusout', function (e) {
    var sp = e.target.closest && e.target.closest('[data-ck-texti]'); if (!sp) return;
    var id = +sp.getAttribute('data-ck-texti'), it = (data().checklist || []).filter(function (q) { return q.id === id; })[0], tx = sp.textContent.trim().slice(0, 500);
    if (it && tx && tx !== it.texti) { it.texti = tx; ckApi({ action: 'chk_texti', id: id, texti: tx }); } else renderChecklist();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-ck-texti]')) { e.preventDefault(); e.target.blur(); } });
  document.addEventListener('change', function (e) { var gh = e.target.closest && e.target.closest('[data-gr-hak]'); if (gh) grHak(gh.getAttribute('data-gr-hak'), gh.checked); });
  document.addEventListener('change', function (e) { var vs = e.target.closest && e.target.closest('[data-vh-skjal]'); if (vs) { vhSkjal(+vs.getAttribute('data-vh-skjal'), vs.files && vs.files[0]); vs.value = ''; } });
  document.addEventListener('change', function (e) { if (e.target.id === 'vs-skra') { vistaSkra(e.target.files && e.target.files[0]); e.target.value = ''; } });
  document.addEventListener('input', function (e) { if (e.target.id === 'vbt-leit') { vbtQ = e.target.value.trim().toLowerCase(); renderVerkbeidnir(); } });
  document.addEventListener('input', function (e) { if (e.target.id === 'vs-leit') { clearTimeout(leitT); var q = e.target.value.trim(); leitT = setTimeout(function () { leita(q); }, 350); } });
  document.addEventListener('DOMContentLoaded', function () {
    tengjaMynd('#vb-mynd', '#vb-prev', function (m) { vbMynd = m; });
    tengjaMynd('#lk-mynd', '#lk-prev', function (m) { lkMynd = m; });
    ['#vb-modal', '#lk-modal'].forEach(function (s) { var m = $(s); if (m) m.addEventListener('mousedown', function (ev) { if (ev.target === m) { if (s === '#vb-modal') lokaVb(); else lokaLk(); } }); });
    var vm = $('#vh-modal'); if (vm) vm.addEventListener('mousedown', function (ev) { if (ev.target === vm) lokaVh(); });
    var qm = $('#qr-modal'); if (qm) qm.addEventListener('mousedown', function (ev) { if (ev.target === qm) lokaQr(); });
    var lbm = $('#lb-m'); if (lbm) lbm.addEventListener('click', function (ev) { var lb = G() && G().lbS(); if (lb && smellur(ev, lb.f, lb.b, lbm)) ev.stopPropagation(); });
    var tab = document.querySelector('nav .tab[data-view="vinnusvaedi"]'); if (tab) tab.addEventListener('click', function () { setTimeout(kortLifga, 30); });
  });

  window.GattPunktar = { teikna: teikna, smellur: smellur, spjald: spjald, lbOpin: lbOpin, lbLokad: lbLokad, erindiAuki: erindiAuki, opna: opnaVb };
  window.GattVinnusvaedi = { render: renderVinnusvaedi, demo: demo };
  window.GattVidhald = { eignHtml: eignHtml, render: renderVidhald };
  window.GattGreining = { eignHtml: grEignHtml, lifga: grLifga };
})();
