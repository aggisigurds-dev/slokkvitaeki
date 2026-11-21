/* === YFIRSÝNARRÖNDIN v1 (21.11.2026) ===
 *
 * Efst á Þjónustuborði Agnars og Annþórs (368, beint undir Flýtileiðum): lykiltölur beggja félaga í einni rönd.
 * Agnar: „Master yfirsýn banner … sem maður gæti eiginlega séð stöðuna", „aðeins skoða tölurnar og velja einhverjar
 * mikilvægari og sleppa öðrum" og um útlitið: burstaður navy-málmur, upphleyptar dökkar flísar („sirka svona").
 * Hönnunin: canvas „Þjónustuborð – endurskipulag" · YfirsynMalmur.dc.html.
 *
 * GÖGN — engar nýjar reglur hér, hver tala kemur úr sinni heimild:
 *   /api/yfirsyn (netlify/functions/yfirsyn.cjs, aðeins stjórnandi): Rekstrarskýrsla Brunahólfs (virði, greitt inn,
 *     vikan, dagsröð), Kröfu yfirlit BH, kröfusýnir SL, verkbeiðnir, síðast greitt, Tímavera.
 *   Virði ársþjónustu: reiknað af Ársskoðun (153 kallar geymaArs) og geymt í AppSettings `yfirsyn_ars` — sama tala og
 *     Ársskoðun sýnir; röndin segir hvenær hún var síðast reiknuð.
 *   Opin mál: talin af borðinu sjálfu (368 sendir master/mine).
 * Náist heimild ekki stendur „ómælt" með ástæðunni — aldrei 0.
 *
 * Hamur: Rönd (sjálfgefið) eða Lína, Vidmot `bord.yfirsyn` (eins á öllum vélum). „Stækka" opnar Rekstrarskýrsluna.
 * API (368 kallar, allt varið með `window.YfirsynRond &&`): html(n, ctx) · css() · smellur(el) · geymaArs(v) · load(force)
 */
(() => {
  if (window.YfirsynRond) return;

  const EIGENDUR = ['Agnar', 'Anni'];
  const HAM_LYKILL = 'bord.yfirsyn';
  const NYTT = 10 * 60000;              // sótt aftur eftir 10 mín. þegar borðið teiknast
  const REKSTUR_URL = 'https://brunaholf.netlify.app/rekstur';
  const S = { d: null, villa: null, loading: false, at: 0 };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fin = x => typeof x === 'number' && isFinite(x);
  const isk = n => fin(n) ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—';
  const mkr = (n, d = 2) => fin(n) ? (n / 1e6).toFixed(d).replace('.', ',') : '—';
  const pct = (a, b) => (fin(a) && fin(b) && b > 0) ? Math.round(a / b * 100) : null;
  const dd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? (+m[3]) + '.' + (+m[2]) : ''; };
  const klukka = s => { const t = new Date(s); return isNaN(t) ? '' : String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); };
  const dagarSidan = s => { const t = Date.parse(String(s || '').slice(0, 10)); return isNaN(t) ? null : Math.floor((Date.parse(new Date().toISOString().slice(0, 10)) - t) / 86400000); };
  const vmLesa = (k, d) => { try { return window.Vidmot ? Vidmot.lesa(k, d) : d; } catch (_) { return d; } };
  const vmSetja = (k, v) => { try { if (window.Vidmot) Vidmot.setja(k, v); } catch (_) {} };
  const notify = () => { try { if (window.Thjonustubord5 && Thjonustubord5.render) Thjonustubord5.render(); } catch (_) {} };
  const MAN = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
  const MANUDUR = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const manOf = iso => { const m = /^\d{4}-(\d{2})/.exec(String(iso || '')); return m ? +m[1] - 1 : null; };

  async function load(force) {
    if (S.loading) return;
    if (!force && S.at && Date.now() - S.at < NYTT) return;
    S.loading = true;
    try {
      const r = await fetch('/api/yfirsyn', { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) S.villa = 'Innskráning vantar — skráðu þig inn til að sjá tölurnar';
      else if (r.status === 403) S.villa = 'Aðeins stjórnandi sér yfirsýnina';
      else if (!r.ok) S.villa = 'Yfirsýnin náðist ekki (' + r.status + ') — reynt aftur eftir 10 mín.';
      else { S.d = await r.json(); S.villa = null; }
    } catch (_) { S.villa = 'Yfirsýnin náðist ekki — netið?'; }
    S.loading = false; S.at = Date.now();
    notify();
  }

  // 153 (Ársskoðun) kallar þetta þegar hún reiknar virðið. Geymt á þjóni aðeins ef tölurnar breyttust.
  let arsSent = '';
  function geymaArs(v) {
    try {
      if (!v || !fin(v.total) || v.total <= 0 || !window.AppSettings || !AppSettings.save) return;
      const lykill = [v.ar, v.total, v.buid, v.stadir, v.buidStadir, v.komin].join('|');
      const nu = AppSettings.path ? AppSettings.path('yfirsyn_ars') : null;
      const nuLykill = nu ? [nu.ar, nu.total, nu.buid, nu.stadir, nu.buidStadir, nu.komin].join('|') : '';
      if (lykill === nuLykill || lykill === arsSent) return;
      arsSent = lykill;
      AppSettings.save({ yfirsyn_ars: Object.assign({}, v, { reiknad_at: new Date().toISOString() }) });
    } catch (_) {}
  }

  /* ── smáhlutir ───────────────────────────────────────────────────────────── */
  const ICON = {
    ars: '<rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3M5.6 10.1l1.7 1.7 3.2-3.3"/>',
    virdi: '<path d="M1.5 12l4-4 3 3 6-6.5M10.5 4.5h4v4"/>',
    inn: '<path d="M8 1.5v8M4.8 6.5L8 9.7l3.2-3.2M2 11.5v1.8c0 .7.5 1.2 1.2 1.2h9.6c.7 0 1.2-.5 1.2-1.2v-1.8"/>',
    krafa: '<path d="M4 1.5h5.5L13 5v9.5H4zM9.5 1.5V5H13M6.3 8.5h4.4M6.3 11h4.4"/>',
    klukka: '<circle cx="8" cy="8" r="6.3"/><path d="M8 4.5V8l2.5 1.6"/>',
    lykill: '<path d="M10.6 2.2a3.4 3.4 0 0 0-3.9 4.5L2.2 11.2a1.5 1.5 0 0 0 2.1 2.1l4.5-4.5a3.4 3.4 0 0 0 4.5-3.9l-2 2-2-.4-.4-2z"/>',
    hus: '<path d="M2 13.5h12M3.5 13.5V7l4.5-4 4.5 4v6.5M6.5 13.5v-3.5h3v3.5"/>',
    vidv: '<path d="M8 1.8L1.5 13.5h13zM8 6.2v3.6M8 11.6v.1"/>',
    greitt: '<circle cx="8" cy="8" r="6.3"/><path d="M5.3 8.2l1.9 1.9 3.6-3.8"/>',
    nidur: '<path d="M4 6l4 4 4-4"/>',
  };
  const ic = (k, stil) => '<svg class="yr-ic" viewBox="0 0 16 16" aria-hidden="true"' + (stil ? ' style="' + stil + '"' : '') + '>' + ICON[k] + '</svg>';
  const led = (lit, titill) => '<i class="yr-led yr-led-' + lit + '"' + (titill ? ' title="' + esc(titill) + '"' : '') + '></i>';
  const omaelt = (titill, astaeda) => '<div class="yr-k yr-om"><span class="yr-kl">' + esc(titill) + '</span><span class="yr-ks">ómælt</span><span class="yr-kf">' + led('or') + esc(astaeda || 'heimild svaraði ekki') + '</span></div>';
  const ok = x => x && !x.omaelt;

  // Ferskleiki heimilda: græn = ný, gul = gæti vantað nýjustu færslur, rauð = úrelt.
  function heimildir(rek) {
    const f = (rek && rek.ferskleiki) || {};
    const l = [];
    const pd = f.payday_sl && f.payday_sl.samstillt;
    if (pd) { const k = (Date.now() - Date.parse(pd)) / 3600000; l.push({ n: 'Payday SL', t: 'samstillt ' + dd(pd) + ' kl. ' + klukka(pd), lit: k < 26 ? 'gr' : k < 72 ? 'or' : 'rd' }); }
    const tv = f.timavera && f.timavera.nyjast;
    if (tv) { const d = dagarSidan(tv); l.push({ n: 'Tímavera', t: 'nýjasti dagur ' + dd(tv), lit: d <= 2 ? 'gr' : d <= 4 ? 'or' : 'rd' }); }
    const aj = f.ajour && f.ajour.nyjast;
    if (aj) { const d = dagarSidan(aj); l.push({ n: 'Ajour (göt)', t: 'nýjasti dagur ' + dd(aj), lit: d <= 2 ? 'gr' : d <= 5 ? 'or' : 'rd' }); }
    const bh = f.payday_bh && f.payday_bh.nyjasta_greidsla;
    if (bh) { const d = dagarSidan(bh); l.push({ n: 'Greiðslur BH', t: 'nýjasta greiðsla ' + dd(bh), lit: d <= 7 ? 'gr' : d <= 14 ? 'or' : 'rd' }); }
    return l;
  }

  /* ── flísarnar ───────────────────────────────────────────────────────────── */
  function arsHtml() {
    const a = (window.AppSettings && AppSettings.path) ? AppSettings.path('yfirsyn_ars') : null;
    if (!a || !fin(a.total)) {
      return '<div class="yr-k"><span class="yr-kl">' + ic('ars') + 'Ársþjónusta</span><span class="yr-ks">Virðið reiknast á Ársskoðun.</span>' +
        '<button type="button" class="yr-kp yr-o" data-t5="yr-fara" data-to="arsskodun">Opna Ársskoðun</button></div>';
    }
    const p = Math.max(0, Math.min(1, a.buid / a.total));
    const nu = new Date(), upph = new Date(nu.getFullYear(), 0, 1), naest = new Date(nu.getFullYear() + 1, 0, 1);
    const arP = Math.max(0, Math.min(1, (nu - upph) / (naest - upph)));
    const punkt = (f, r) => { const h = Math.PI * (1 - f); return [(58 + r * Math.cos(h)).toFixed(1), (58 - r * Math.sin(h)).toFixed(1)]; };
    const [kx, ky] = punkt(p, 46), [y1x, y1y] = punkt(arP, 37), [y2x, y2y] = punkt(arP, 57);
    const eftir = a.total - a.buid, eftirSt = (a.stadir || 0) - (a.buidStadir || 0);
    const gamalt = a.reiknad_at ? dagarSidan(a.reiknad_at) : null;
    return '<div class="yr-k yr-hero" title="Virði ársþjónustu ' + esc(a.ar) + ' (Ársskoðun): ' + isk(a.total) + ' kr · búið ' + isk(a.buid) + ' kr á ' + isk(a.buidStadir) + ' stöðum · eftir ' + isk(eftir) + ' kr á ' + isk(eftirSt) + ' stöðum. Hvíta strikið = hve mikið er liðið af árinu.">' +
      '<span class="yr-kl">' + ic('ars') + 'Ársþjónusta ' + esc(a.ar) + '</span>' +
      '<div class="yr-ars"><div><div class="yr-gauge">' +
        '<svg viewBox="0 0 116 66" aria-hidden="true">' +
          '<path d="M5.0 58.0L0.0 58.0M7.6 41.6L4.7 40.7M15.1 26.8L12.7 25.1M26.8 15.1L25.1 12.7M41.6 7.6L40.7 4.7M58.0 5.0L58.0 0.0M74.4 7.6L75.3 4.7M89.2 15.1L90.9 12.7M100.9 26.8L103.3 25.1M108.4 41.6L111.3 40.7M111.0 58.0L116.0 58.0" stroke="rgba(200,215,240,.45)" stroke-width="1.2" stroke-linecap="round"/>' +
          '<path d="M12 58 A46 46 0 0 1 104 58" fill="none" stroke="rgba(0,0,0,.62)" stroke-width="15" stroke-linecap="round"/>' +
          '<path d="M12 58 A46 46 0 0 1 104 58" fill="none" stroke="rgba(242,193,78,.38)" stroke-width="9" stroke-linecap="round"/>' +
          '<path class="yr-fg" d="M12 58 A46 46 0 0 1 104 58" fill="none" stroke="url(#yrArc)" stroke-width="9" stroke-linecap="round" pathLength="100" stroke-dasharray="' + (p * 100).toFixed(1) + ' 100"/>' +
          '<path d="M12.5 56.5 A44.5 44.5 0 0 1 ' + kx + ' ' + (ky - 1.4) + '" fill="none" stroke="rgba(255,255,255,.38)" stroke-width="1.1" stroke-linecap="round"/>' +
          '<circle cx="' + kx + '" cy="' + ky + '" r="6.2" fill="url(#yrKnob)" stroke="rgba(0,0,0,.4)" stroke-width=".8"/><circle cx="' + kx + '" cy="' + ky + '" r="2" fill="#22c55e"/>' +
          '<path d="M' + y1x + ' ' + y1y + 'L' + y2x + ' ' + y2y + '" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" class="yr-ar"/>' +
        '</svg><span class="yr-gv">' + Math.round(p * 100) + '<small>%</small></span><span class="yr-gs">búið</span></div>' +
        '<div class="yr-gcap"><i></i>árið ' + Math.round(arP * 100) + ' % liðið</div></div>' +
        '<div class="yr-rt"><span class="yr-kn">' + mkr(a.total, 1) + '<small>m.kr</small></span>' +
          '<span class="yr-ks"><b>' + isk(a.buidStadir) + '</b> af ' + isk(a.stadir) + ' stöðum</span>' +
          (fin(a.komin) && a.komin > 0 ? '<span class="yr-kp yr-r" title="Óbúið og skoðunarmánuðurinn kominn eða liðinn">' + isk(a.komin) + ' á eftir áætlun</span>' : '') +
        '</div></div>' +
      '<span class="yr-sb yr-sb-l" role="img" aria-label="Búið ' + mkr(a.buid, 1) + ' m, eftir ' + mkr(eftir, 1) + ' m"><i class="yr-s-gr" style="width:' + (p * 100).toFixed(1) + '%"></i><i class="yr-s-am" style="width:' + ((1 - p) * 100).toFixed(1) + '%"></i></span>' +
      '<span class="yr-bl"><span>' + led('gr') + 'Búið <b>' + mkr(a.buid, 1) + ' m</b></span><span>' + led('am') + 'Eftir <b>' + mkr(eftir, 1) + ' m</b> · ' + isk(eftirSt) + ' st.</span></span>' +
      '<span class="yr-kf">' + led(gamalt == null || gamalt <= 7 ? 'gr' : 'or') + 'Ársskoðun' + (a.reiknad_at ? ' · reiknað ' + dd(a.reiknad_at) : '') +
        '<button type="button" class="yr-lnk" data-t5="yr-fara" data-to="arsskodun">Opna ›</button></span>' +
    '</div>';
  }

  function virdiHtml(rek) {
    if (!ok(rek)) return omaelt('Virði mánaðarins', rek && rek.omaelt);
    const T = rek.timabil, v = rek.badir.tekjur[3], fyrr = rek.badir.tekjur[4];
    const sl = rek.sl.tekjur[3], bh = rek.bh.virdi[3];
    const fra = T[3].fra, til = T[3].til, mi = manOf(fra);
    const ar = +String(fra).slice(0, 4), dim = new Date(ar, mi + 1, 0).getDate();
    const dagurNu = +String(til).slice(8, 10);
    const rod = (rek.rod || []).filter(r => r.d >= fra && r.d <= til);
    const vmax = Math.max(fyrr || 0, v || 0) * 1.04 || 1;
    const B = 66, H = 60, x = i => ((i + 0.5) / dim * 240);
    const y = val => (B - val / vmax * H).toFixed(1);
    let cum = 0; const pts = ['0,' + B];
    const dagMax = Math.max(1, ...rod.map(r => (r.sl || 0) + (r.bh || 0)));
    let bars = '', helgar = '';
    for (let i = 0; i < dim; i++) {
      const wd = new Date(ar, mi, i + 1).getDay();
      if (wd === 0 || wd === 6) helgar += '<rect x="' + (i / dim * 240).toFixed(1) + '" y="0" width="' + (240 / dim).toFixed(1) + '" height="' + B + '" class="yr-we"/>';
    }
    rod.forEach(r => {
      const i = +String(r.d).slice(8, 10) - 1;
      cum += (r.sl || 0) + (r.bh || 0);
      pts.push(x(i).toFixed(1) + ',' + y(cum));
      const hb = (r.bh || 0) / dagMax * 20, hs = (r.sl || 0) / dagMax * 20, bx = (x(i) - 2.4).toFixed(1);
      if (hb > .2) bars += '<rect x="' + bx + '" y="' + (B - hb).toFixed(1) + '" width="4.8" height="' + hb.toFixed(1) + '" rx="1" class="yr-cb"/>';
      if (hs > .2) bars += '<rect x="' + bx + '" y="' + (B - hb - hs).toFixed(1) + '" width="4.8" height="' + hs.toFixed(1) + '" rx="1" class="yr-cs"/>';
    });
    const ex = x(dagurNu - 1).toFixed(1), ey = y(cum);
    const fyrrY = y(fyrr || 0);
    const p = pct(v, fyrr), lidid = Math.round(dagurNu / dim * 100);
    const fyrriNafn = MANUDUR[manOf(T[4].fra)] || 'fyrri mánuður';
    return '<div class="yr-k" title="Virði ' + esc(MANUDUR[mi] || '') + ' án vsk, uppsafnað dag fyrir dag: SL tekjur ' + isk(sl) + ' kr + BH áunnið ' + isk(bh) + ' kr. Strikalína = allur ' + esc(fyrriNafn) + ' (' + isk(fyrr) + ' kr). ' + lidid + ' % af mánuðinum liðið.">' +
      '<span class="yr-kl">' + ic('virdi') + 'Virði ' + esc(MANUDUR[mi] || '') + '<em>án vsk</em></span>' +
      '<span class="yr-row"><span class="yr-kn">' + mkr(v) + '<small>m</small></span>' + (p != null ? '<span class="yr-kp ' + (p >= lidid ? 'yr-g' : 'yr-o') + '" style="margin-left:auto">' + p + ' % af ' + esc(MAN[manOf(T[4].fra)] || '') + '.</span>' : '') + '</span>' +
      '<span class="yr-ks">SL <b>' + mkr(sl) + '</b> · BH <b>' + mkr(bh) + '</b></span>' +
      '<div class="yr-scr"><svg viewBox="0 0 240 66" aria-hidden="true">' + helgar +
        '<rect x="' + (dagurNu / dim * 240).toFixed(1) + '" y="0" width="' + (240 - dagurNu / dim * 240).toFixed(1) + '" height="' + B + '" fill="url(#yrFut)"/>' +
        '<line x1="0" y1="' + fyrrY + '" x2="240" y2="' + fyrrY + '" stroke="#9fb0cc" stroke-width="1" stroke-dasharray="4 3" opacity=".8"/>' + bars +
        '<path d="M' + pts.join(' L') + ' L' + ex + ',' + B + ' Z" fill="url(#yrArea)"/>' +
        '<path class="yr-ln" d="M' + pts.join(' L') + '" fill="none" stroke="#ffb066" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle cx="' + ex + '" cy="' + ey + '" r="3.8" fill="url(#yrKnob)" stroke="#ff8a1f" stroke-width="1.6"/>' +
      '</svg>' +
      '<span class="yr-cl" style="left:8px;top:' + Math.max(2, (fyrrY / B * 100 - 2)).toFixed(0) + '%">' + esc(fyrriNafn) + ' allur ' + mkr(fyrr) + '</span>' +
      '<div class="yr-ax"><span style="left:5%">1.' + (mi + 1) + '</span><span class="yr-nu" style="left:' + ((dagurNu - .5) / dim * 100).toFixed(1) + '%">í dag</span><span style="left:93%">' + dim + '.' + (mi + 1) + '</span></div></div>' +
      '<span class="yr-kf">' + heimildLed(rek, 'Payday SL') + 'Payday SL<s>|</s>' + heimildLed(rek, 'Tímavera') + 'Tímavera ' + dd(rek.ferskleiki && rek.ferskleiki.timavera && rek.ferskleiki.timavera.nyjast) + '</span>' +
    '</div>';
  }
  const heimildLed = (rek, n) => { const h = heimildir(rek).find(x => x.n === n); return led(h ? h.lit : 'gy', h ? n + ': ' + h.t : n); };

  // Greitt inn MEÐ VSK (yfirsyn.cjs greittInn): Payday SL + búð SL + Payday BH + BH merkt greitt í Kröfu yfirliti.
  function greittHtml(gi, rek) {
    if (!ok(gi) || !Array.isArray(gi.manudir) || gi.manudir.length < 4) return omaelt('Greitt inn', gi && gi.omaelt);
    const M = gi.manudir, nu = M[3];
    const fullir = M.slice(0, 3).map(m => m.alls).filter(fin);
    const medal = fullir.length ? fullir.reduce((a, b) => a + b, 0) / fullir.length : null;
    const mi = manOf(nu.fra), dim = new Date(+nu.fra.slice(0, 4), mi + 1, 0).getDate();
    const lidid = Math.round(+nu.til.slice(8, 10) / dim * 100);
    const p = pct(nu.alls, medal);
    const max = Math.max(...M.map(m => m.alls || 0), medal || 0) || 1;
    const h = val => Math.max(2, Math.round(val / max * 46));
    const sund = m => esc(MAN[manOf(m.fra)] || '') + ' ' + mkr(m.alls) + ' m (Payday SL ' + mkr(m.sl_payday) + ' · búð ' + mkr(m.sl_bud) + ' · Payday BH ' + mkr(m.bh_payday) + (m.bh_hand ? ' · merkt greitt BH ' + mkr(m.bh_hand) + ': ' + m.bh_hand_reikn.join(', ') : '') + ')';
    return '<div class="yr-k" title="Greitt inn MEÐ VSK, bæði félög — peningarnir sem komu inn.\n' + M.map(sund).join('\n') + '\nStrikalína = meðaltal síðustu þriggja heilu mánaða (' + mkr(medal) + ' m). ' + lidid + ' % af mánuðinum liðið.">' +
      '<span class="yr-kl">' + ic('inn') + 'Greitt inn<em>m. vsk</em></span>' +
      '<span class="yr-kn">' + mkr(nu.alls) + '<small>m</small></span>' +
      (p != null ? '<span class="yr-kp ' + (p >= lidid ? 'yr-g' : 'yr-a') + '" title="' + lidid + ' % af mánuðinum liðið">' + p + ' % af meðaltali</span>' : '') +
      '<div class="yr-bars">' + (medal ? '<span class="yr-avg" style="bottom:' + h(medal) + 'px"></span>' : '') +
        M.map((m, i) => '<div' + (i === 3 ? ' class="yr-nu"' : '') + '>' + (i === 3 && medal && m.alls < medal ? '<span class="yr-ghost" style="bottom:' + h(m.alls) + 'px;height:' + (h(medal) - h(m.alls)) + 'px"></span>' : '') + '<i style="height:' + h(m.alls || 0) + 'px"></i></div>').join('') +
      '</div>' +
      '<div class="yr-mo">' + M.map((m, i) => '<span' + (i === 3 ? ' class="yr-nu"' : '') + '>' + esc(MAN[manOf(m.fra)] || '') + '<b>' + mkr(m.alls, 1) + '</b></span>').join('') + '</div>' +
      '<span class="yr-kf" title="Payday SL og BH + BH-reikningar merktir greiddir í Kröfu yfirliti">' + heimildLed(rek, 'Payday SL') + 'Payday SL<s>|</s>' + heimildLed(rek, 'Greiðslur BH') + 'BH</span>' +
    '</div>';
  }

  function leidinniHtml(D) {
    const sl = D.krofur && D.krofur.sl, bh = D.krofur && D.krofur.bh, os = D.osott;
    if (!ok(sl) && !ok(bh)) return omaelt('Á leiðinni inn', (sl && sl.omaelt) || (bh && bh.omaelt));
    const osent = (ok(sl) ? sl.osent.kr : 0) + (ok(bh) ? bh.osent.kr : 0);
    const ogr = (ok(sl) ? sl.ogreitt.kr : 0) + (ok(bh) ? bh.ogreitt.kr : 0);
    const osk = ok(os) ? os.kr : 0;
    const alls = osent + ogr + osk || 1;
    const eldri = (ok(sl) ? sl.eldri45.kr : 0) + (ok(bh) ? bh.eldri45.kr : 0);
    const eldriN = (ok(sl) ? sl.eldri45.n : 0) + (ok(bh) ? bh.eldri45.n : 0);
    const vantar = [!ok(sl) && 'SL', !ok(bh) && 'BH', !ok(os) && 'ósótt'].filter(Boolean);
    const w = k => (k / alls * 100).toFixed(1) + '%';
    return '<div class="yr-k" title="M. vsk, bæði félög. Ósent + ógreitt + ósótt tæki. Ekki leggja saman við virðið — sama féð á leiðinni inn.' + (ok(bh) && bh.staerst ? ' Stærsta krafan: ' + esc(bh.staerst.nr + ' ' + bh.staerst.kunni + ' ' + mkr(bh.staerst.kr) + ' m') + '.' : '') + (ok(sl) && sl.a_bid.n ? ' Auk þess á bið hjá SL: ' + sl.a_bid.n + ' · ' + mkr(sl.a_bid.kr) + ' m.' : '') + '">' +
      '<span class="yr-kl">' + ic('krafa') + 'Á leiðinni inn<em>m. vsk</em></span>' +
      '<span class="yr-row"><span class="yr-kn">' + mkr(osent + ogr + osk) + '<small>m</small></span>' + (eldri > 0 ? '<span class="yr-kp yr-r" title="' + eldriN + ' ógreiddar kröfur eldri en 45 daga">' + mkr(eldri) + ' m &gt;45 d.</span>' : '') + '</span>' +
      '<span class="yr-sb"><i class="yr-s-bl" style="width:' + w(osent) + '"></i><i class="yr-s-rd" style="width:' + w(ogr) + '"></i><i class="yr-s-or" style="width:' + w(osk) + '"></i></span>' +
      '<div class="yr-lrs">' +
        '<span class="yr-lr" title="SL ' + (ok(sl) ? sl.osent.n + ' · ' + isk(sl.osent.kr) + ' kr' : 'ómælt') + ' · BH ' + (ok(bh) ? bh.osent.n + ' · ' + isk(bh.osent.kr) + ' kr' : 'ómælt') + '">' + led('bl') + 'Ósent<b>' + mkr(osent) + '<small>m</small></b></span>' +
        '<span class="yr-lr" title="SL ' + (ok(sl) ? sl.ogreitt.n + ' · ' + isk(sl.ogreitt.kr) + ' kr' : 'ómælt') + ' · BH ' + (ok(bh) ? bh.ogreitt.n + ' · ' + isk(bh.ogreitt.kr) + ' kr' : 'ómælt') + '">' + led('rd') + 'Ógreitt<b>' + mkr(ogr) + '<small>m</small></b></span>' +
        '<span class="yr-lr" title="' + (ok(os) ? os.n + ' verkbeiðnir tilbúnar · ' + isk(os.kr) + ' kr' : 'ómælt') + '">' + led('or') + 'Ósótt<b>' + mkr(osk) + '<small>m</small></b></span>' +
      '</div>' +
      '<span class="yr-kf">' + (vantar.length ? led('or') + 'ómælt: ' + esc(vantar.join(', ')) : led('gr') + 'Kröfur SL · Kröfu yfirlit BH') + '</span>' +
    '</div>';
  }

  function vikanHtml(rek, tv) {
    if (!ok(rek)) return omaelt('Vikan', rek && rek.omaelt);
    const T = rek.timabil;
    const klst = ok(tv) ? tv.vika.klst : null, klstF = ok(tv) ? tv.svika.klst : null;
    const dk = (fin(klst) && fin(klstF) && klstF > 0) ? Math.round((klst - klstF) / klstF * 100) : null;
    const rukk = pct(rek.bh.klst[1], klst), rukkF = pct(rek.bh.klst[2], klstF);
    const reikn = (rek.sl.sentN[1] || 0) + (rek.bh.bokunN[1] || 0), reiknF = (rek.sl.sentN[2] || 0) + (rek.bh.bokunN[2] || 0);
    const mal = (nu, fyrr, gildi, nafn, titill) => {
      const max = Math.max(nu || 0, fyrr || 0) || 1, upp = (nu || 0) >= (fyrr || 0);
      const mun = fin(nu) && fin(fyrr) ? nu - fyrr : null;
      return '<div class="yr-well" title="' + esc(titill) + '"><span class="yr-v">' + gildi + (mun != null && mun !== 0 ? '<s class="' + (upp ? 'yr-up' : 'yr-dn') + '">' + (upp ? '▲' : '▼') + (nafn === 'tekjur vikunnar' ? Math.abs(pct(nu, fyrr) - 100) + ' %' : Math.abs(Math.round(mun))) + '</s>' : '') + '</span>' +
        '<span class="yr-db"><i class="' + (upp ? 'yr-u' : 'yr-d') + '" style="width:' + ((nu || 0) / max * 100).toFixed(0) + '%"></i><b style="left:' + ((fyrr || 0) / max * 100).toFixed(0) + '%"></b></span><span class="yr-n">' + esc(nafn) + '</span></div>';
    };
    const vika = (dd(T[1].fra) + '–' + dd(T[1].til)).replace(/^(\d+)\.\d+–/, '$1.–');
    return '<div class="yr-k" title="Vikan ' + esc(dd(T[1].fra)) + '–' + esc(dd(T[1].til)) + ' á móti ' + esc(dd(T[2].fra)) + '–' + esc(dd(T[2].til)) + '. Hvíti tígullinn = síðasta vika.">' +
      '<span class="yr-kl">' + ic('klukka') + 'Vikan<em>' + esc(vika) + '</em></span>' +
      '<span class="yr-row"><span class="yr-kn">' + (fin(klst) ? isk(klst) : '—') + '<small>klst</small></span>' + (dk != null ? '<span class="yr-kp ' + (dk >= 0 ? 'yr-g' : 'yr-r') + '">' + (dk >= 0 ? '▲ ' : '▼ ') + Math.abs(dk) + ' %</span>' : '') + (fin(klstF) ? '<span class="yr-ks" title="' + (ok(tv) ? tv.vika.starfsmenn + ' starfsmenn í vikunni' : '') + '">síðast ' + isk(klstF) + '</span>' : '') + '</span>' +
      '<div class="yr-vk">' +
        mal(rek.badir.tekjur[1], rek.badir.tekjur[2], mkr(rek.badir.tekjur[1]) + '<small>m</small>', 'tekjur vikunnar', 'Virði vikunnar án vsk: BH tímar ' + mkr(rek.bh.tima[1]) + ' · BH göt ' + mkr((rek.bh.lshV[1] || 0) + (rek.bh.hekV[1] || 0)) + ' · SL ' + mkr(rek.sl.tekjur[1]) + ' m · síðasta vika ' + mkr(rek.badir.tekjur[2]) + ' m') +
        mal(rukk, rukkF, (rukk != null ? rukk + ' %' : '—'), 'rukkanlegt', 'Rukkanlegir tímar ' + isk(rek.bh.klst[1]) + ' af ' + isk(klst) + ' (síðast ' + isk(rek.bh.klst[2]) + ' af ' + isk(klstF) + ')') +
        mal(rek.bh.got[1], rek.bh.got[2], isk(rek.bh.got[1]), 'göt kláruð', 'Göt kláruð í vikunni (Ajour) · síðast ' + isk(rek.bh.got[2])) +
        mal(reikn, reiknF, isk(reikn), 'reikn. sendir', 'Reikningar sendir: SL ' + (rek.sl.sentN[1] || 0) + ' (síðast ' + (rek.sl.sentN[2] || 0) + ') · BH ' + (rek.bh.bokunN[1] || 0) + ' (síðast ' + (rek.bh.bokunN[2] || 0) + ')') +
      '</div>' +
      '<span class="yr-kf">' + heimildLed(rek, 'Tímavera') + 'Tímavera<s>|</s>' + heimildLed(rek, 'Ajour (göt)') + 'göt: Ajour ' + esc(dd(rek.ferskleiki && rek.ferskleiki.ajour && rek.ferskleiki.ajour.nyjast)) + '</span>' +
    '</div>';
  }

  function osottHtml(D, rek) {
    const os = D.osott, vk = ok(rek) && rek.sl && rek.sl.verkstaedi;
    if (!ok(os)) return omaelt('Ósótt tæki', os && os.omaelt);
    return '<div class="yr-k" title="Verkbeiðnir tilbúnar til afhendingar sem bíða þess að vera sóttar">' +
      '<span class="yr-kl">' + ic('lykill') + 'Ósótt tæki</span>' +
      '<span class="yr-row"><span class="yr-kn">' + isk(os.n) + '</span><span class="yr-ks"><b>' + isk(os.kr) + '</b> kr</span></span>' +
      (fin(os.elst_dagar) ? '<span class="yr-kp ' + (os.elst_dagar > 60 ? 'yr-a' : 'yr-g') + '">elst ' + isk(os.elst_dagar) + ' dagar</span>' : '') +
      (os.yfir30 ? '<span class="yr-ks">' + isk(os.yfir30) + ' tilbúin lengur en 30 d.</span>' : '') +
      // „bíða" á verkstæðinu eru sömu tækin og ósótt hér að ofan (yfirferð 21.11) — aðeins „í vinnslu" stendur hér.
      (vk ? '<span class="yr-hr"></span><span class="yr-kl">' + ic('hus') + 'Verkstæðið</span><span class="yr-row"><span class="yr-k2">' + isk(vk.nu) + '</span><span class="yr-ks">tæki í vinnslu</span></span>' : '') +
      '<span class="yr-kf">' + led('gr') + 'verkbeiðnir</span>' +
    '</div>';
  }

  // Atriðin sem þarf að skoða — reglur yfir sömu gögn, alvarlegast fyrst.
  function athygli(D, rek) {
    const l = [];
    const bh = D.krofur && D.krofur.bh, sl = D.krofur && D.krofur.sl, os = D.osott;
    if (ok(bh)) bh.eldri45.reikn.sort((a, b) => b.kr - a.kr).forEach(r => l.push({ lit: 'rd', t: '<b>' + esc(r.nr + ' ' + String(r.kunni).split(/\s+/)[0]) + '</b> ' + mkr(r.kr) + ' m &gt;45 d.', titill: r.nr + ' ' + r.kunni + ' · ' + isk(r.kr) + ' kr · ' + r.dagar + ' dagar frá gjalddaga' }));
    if (ok(sl) && sl.eldri45.n) l.push({ lit: 'or', t: '<b>' + sl.eldri45.n + ' kröfur SL</b> &gt;45 d. · ' + mkr(sl.eldri45.kr) + ' m', titill: 'Ógreiddar kröfur Slökkvitækja eldri en 45 daga' });
    const gi = D.greitt;
    if (ok(gi) && Array.isArray(gi.manudir) && gi.manudir.length === 4) {
      const M = gi.manudir, nu = M[3], full = M.slice(0, 3).map(x => x.alls).filter(fin);
      const m = full.length ? full.reduce((a, b) => a + b, 0) / full.length : null;
      const mi = manOf(nu.fra), dim = new Date(+nu.fra.slice(0, 4), mi + 1, 0).getDate(), lidid = +nu.til.slice(8, 10) / dim;
      if (m && nu.alls / m < lidid * 0.75) l.push({ lit: 'or', t: '<b>Greitt inn</b> ' + pct(nu.alls, m) + ' % af meðaltali', titill: Math.round(lidid * 100) + ' % af mánuðinum liðið · m. vsk' });
    }
    if (ok(os) && os.yfir30) l.push({ lit: 'or', t: '<b>' + os.yfir30 + ' tæki</b> tilbúin &gt;30 d.', titill: 'Verkbeiðnir tilbúnar lengur en 30 daga' });
    if (ok(sl) && sl.a_bid.n) l.push({ lit: 'gy', t: '<b>' + sl.a_bid.n + ' á bið</b> SL · ' + mkr(sl.a_bid.kr) + ' m', titill: 'Kröfur Slökkvitækja á bið' });
    if (ok(bh) && bh.likleg_greidd && bh.likleg_greidd.n) l.push({ lit: 'bl', t: '<b>' + bh.likleg_greidd.n + ' líklega greidd</b> BH', titill: 'Fannst greitt í banka en enn ógreitt í Payday' });
    heimildir(rek).filter(h => h.lit === 'rd').forEach(h => l.push({ lit: 'rd', t: '<b>' + esc(h.n) + '</b> úrelt', titill: h.t }));
    return l;
  }

  function topHtml(n, ctx, rek, tv) {
    const hm = heimildir(rek);
    return '<header class="yr-top">' +
      '<div class="yr-brand"><span class="yr-mark">Yfirsýn</span><span class="yr-upd">' + led(S.villa ? 'or' : 'gr') + (S.loading && !S.d ? 'Sæki tölur…' : 'Uppfært ' + (S.d ? klukka(S.d.maelt_at) : '')) + '</span></div>' +
      '<div class="yr-chips">' +
        (ctx && fin(ctx.master) ? '<span class="yr-chip" title="Opin mál á borðinu · þar af á þínu borði">Opin mál <b>' + isk(ctx.master) + '</b>' + (fin(ctx.mine) ? ' · þín <b>' + isk(ctx.mine) + '</b>' : '') + '</span>' : '') +
        (ok(tv) ? '<span class="yr-chip" title="Starfsmenn með skráða tíma í Tímaveru">' + led(tv.idag ? 'gr' : 'gy') + isk(tv.idag) + ' við vinnu · <b>' + isk(tv.igaer) + '</b> í gær</span>' : '') +
        (hm.length ? '<span class="yr-chip" title="' + esc(hm.map(h => h.n + ': ' + h.t).join(' · ')) + '">Heimildir ' + hm.map(h => led(h.lit)).join('') + '</span>' : '') +
      '</div>' +
      '<div class="yr-act">' + hamRofi('rond') +
        '<a class="yr-go" href="' + REKSTUR_URL + '" target="_blank" rel="noopener" title="Rekstrarskýrsla dagsins — allar tölurnar og sundurliðun">Stækka' + ic('nidur') + '</a>' +
      '</div>' +
    '</header>';
  }
  const hamRofi = virkur => '<div class="yr-seg" role="group" aria-label="Stærð yfirsýnar">' +
    '<button type="button" data-t5="yr-ham" data-v="lina" aria-pressed="' + (virkur === 'lina') + '">Lína</button>' +
    '<button type="button" data-t5="yr-ham" data-v="rond" aria-pressed="' + (virkur === 'rond') + '">Rönd</button></div>';

  function footHtml(D, rek) {
    const at = athygli(D, rek);
    const ssl = D.sidast && D.sidast.sl, sbh = D.sidast && D.sidast.bh;
    const pi = (felag, x) => ok(x) ? '<span class="yr-pi" title="' + esc(dd(x.dags) + ' · ' + x.nr + ' ' + x.kunni + ' · ' + isk(x.kr) + ' kr') + '"><u>' + felag + '</u><b>' + esc(String(x.kunni).split(/\s+/).slice(0, 2).join(' ')) + '</b>' + (x.kr >= 1e6 ? mkr(x.kr) + ' m' : isk(x.kr)) + '</span>' : '';
    return '<div class="yr-foot">' +
      '<div class="yr-fl"><span class="yr-kl yr-fk">' + ic('vidv', 'color:#f87171') + 'Þarf athygli' + (at.length ? ' <span class="yr-cnt">' + at.length + '</span>' : '') + '</span>' +
        '<div class="yr-rail">' + (at.length ? at.map(a => '<span class="yr-ach" title="' + esc(a.titill || '') + '">' + led(a.lit) + a.t + '</span>').join('') : '<span class="yr-ks">Ekkert sem stendur upp úr</span>') + '</div></div>' +
      '<div class="yr-fl"><span class="yr-kl yr-fk">' + ic('greitt', 'color:#4ade80') + 'Síðast greitt</span>' + pi('SL', ssl) + pi('BH', sbh) + '</div>' +
    '</div>';
  }

  function linaHtml(ctx, D, rek) {
    const sl = D && D.krofur && D.krofur.sl, bh = D && D.krofur && D.krofur.bh, os = D && D.osott;
    const leid = (ok(sl) ? sl.osent.kr + sl.ogreitt.kr : 0) + (ok(bh) ? bh.osent.kr + bh.ogreitt.kr : 0) + (ok(os) ? os.kr : 0);
    const a = (window.AppSettings && AppSettings.path) ? AppSettings.path('yfirsyn_ars') : null;
    const at = D ? athygli(D, rek) : [];
    const chip = (t, v) => '<span class="yr-chip">' + t + ' <b>' + v + '</b></span>';
    return '<div class="yr-line">' +
      '<div class="yr-brand"><span class="yr-mark">Yfirsýn</span><span class="yr-upd">' + led(S.villa ? 'or' : 'gr') + (S.d ? klukka(S.d.maelt_at) : '') + '</span></div>' +
      '<div class="yr-chips">' +
        (D && (ok(sl) || ok(bh)) ? chip('Á leiðinni inn', mkr(leid) + ' m') : '') +
        (a && fin(a.total) ? chip('Ársþjónusta', pct(a.buid, a.total) + ' %') : '') +
        (ok(rek) ? chip('Virði ' + esc(MAN[manOf(rek.timabil[3].fra)] || '') + '.', mkr(rek.badir.tekjur[3]) + ' m') : '') +
        (D && ok(D.greitt) && D.greitt.manudir && D.greitt.manudir[3] ? chip('Greitt inn', mkr(D.greitt.manudir[3].alls) + ' m') : '') +
        (ok(rek) ? chip('Vikan', mkr(rek.badir.tekjur[1]) + ' m') : '') +
        (at.length ? '<span class="yr-chip">' + led('rd') + at.length + ' þarf athygli</span>' : '') +
      '</div>' +
      '<div class="yr-act">' + hamRofi('lina') + '</div>' +
    '</div>';
  }

  const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="yrArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6702" stop-opacity=".55"/><stop offset=".7" stop-color="#ff6702" stop-opacity=".08"/><stop offset="1" stop-color="#ff6702" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="yrBH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8db2f7"/><stop offset="1" stop-color="#2f6fe4" stop-opacity=".75"/></linearGradient>' +
    '<linearGradient id="yrSL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc08a"/><stop offset="1" stop-color="#ff7a1a"/></linearGradient>' +
    '<linearGradient id="yrArc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#15803d"/><stop offset=".6" stop-color="#22c55e"/><stop offset="1" stop-color="#86efac"/></linearGradient>' +
    '<radialGradient id="yrKnob" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d6deea"/><stop offset="1" stop-color="#6b7c99"/></radialGradient>' +
    '<pattern id="yrFut" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,.07)" stroke-width="2"/></pattern>' +
    '</defs></svg>';

  function html(n, ctx) {
    if (EIGENDUR.indexOf(n) < 0) return '';
    if (!S.loading && (!S.at || Date.now() - S.at > NYTT)) setTimeout(() => load(), 0);
    const ham = vmLesa(HAM_LYKILL, 'rond') === 'lina' ? 'lina' : 'rond';
    const D = S.d, rek = D && D.rekstur;
    if (ham === 'lina') return '<div class="yr-fr yr-fr-l"><section class="yr-mb" aria-label="Yfirsýn">' + linaHtml(ctx, D, rek) + '</section></div>';
    let midja;
    if (!D) midja = '<div class="yr-tomt">' + (S.villa ? led('or') + esc(S.villa) : 'Sæki tölur beggja félaga…') + '</div>';
    else {
      const tv = D.timavera;
      midja = '<div class="yr-grid">' + arsHtml() + virdiHtml(rek) + greittHtml(D.greitt, rek) + leidinniHtml(D) + vikanHtml(rek, tv) + osottHtml(D, rek) + '</div>' + footHtml(D, rek);
    }
    return '<div class="yr-fr">' + DEFS + '<section class="yr-mb" aria-label="Yfirsýn">' + topHtml(n, ctx, rek, D && D.timavera) +
      (S.villa && D ? '<div class="yr-villa">' + led('or') + esc(S.villa) + ' — sýni tölur frá kl. ' + esc(klukka(D.maelt_at)) + '</div>' : '') + midja + '</section></div>';
  }

  function smellur(el) {
    const a = el && el.dataset && el.dataset.t5;
    if (a === 'yr-ham') { vmSetja(HAM_LYKILL, el.dataset.v === 'lina' ? 'lina' : 'rond'); notify(); return true; }
    if (a === 'yr-fara') { try { location.hash = '#' + (el.dataset.to || ''); } catch (_) {} return true; }
    return false;
  }

  function css() {
    return [
      '.yr-fr{container:yr / inline-size;margin:0 0 14px;padding:2px;border-radius:22px;background:linear-gradient(180deg,#a7b8d3 0%,#3c5884 12%,#0a1a33 50%,#13284a 86%,#5d78a2 100%);box-shadow:0 30px 56px -26px rgba(1,20,45,.9),0 12px 22px -14px rgba(1,20,45,.6)}',
      '.yr-fr-l{border-radius:18px}.yr-fr-l .yr-mb{border-radius:16px}',
      // burstaður navy-málmur: fínar láréttar rákir, ljós að ofan, dökk brún að neðan
      '.yr-mb{position:relative;isolation:isolate;overflow:hidden;border-radius:20px;color:#fff;font-family:Poppins,system-ui,sans-serif;font-variant-numeric:tabular-nums;line-height:1.35;text-align:left;' +
        'background:radial-gradient(70% 150% at 50% -35%,rgba(120,170,240,.26),transparent 60%),repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 2px),repeating-linear-gradient(0deg,rgba(0,0,0,.08) 0 1px,transparent 1px 4px),linear-gradient(180deg,#183a6c 0%,#0e2a54 30%,#08193a 72%,#050f24 100%);' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(0,0,0,.6),inset 0 0 70px rgba(0,0,0,.45)}',
      '.yr-mb::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,#ffb066,#ff6702 20%,rgba(255,103,2,0) 65%);box-shadow:0 0 16px rgba(255,103,2,.6);pointer-events:none}',
      '.yr-ic{flex:none;width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
      '.yr-led{--c:#22c55e;flex:none;display:inline-block;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 16%,var(--c) 52%,color-mix(in srgb,var(--c) 50%,#000) 100%);box-shadow:0 0 5px var(--c),0 0 12px color-mix(in srgb,var(--c) 70%,transparent)}',
      '.yr-led-rd{--c:#f87171}.yr-led-or{--c:#fb8b3c}.yr-led-am{--c:#f2c14e}.yr-led-bl{--c:#5b8ff0}.yr-led-gy{--c:#9fb0cc;box-shadow:0 0 3px rgba(159,176,204,.6)}',
      // haus
      '.yr-top,.yr-line{display:flex;align-items:center;gap:14px;padding:15px 18px 13px}.yr-line{padding:11px 14px 11px 18px}',
      '.yr-brand{display:flex;align-items:center;gap:14px;white-space:nowrap}',
      '.yr-mark{font-size:19px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 0 18px rgba(140,180,255,.25)}',
      '.yr-upd{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:#c8d4e8}',
      '.yr-chips{display:flex;gap:8px;margin-left:6px;min-width:0;overflow:hidden}',
      '.yr-chip{display:inline-flex;align-items:center;gap:7px;height:31px;padding:0 13px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,8,24,.35));border:1px solid rgba(160,190,235,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 3px 6px -2px rgba(0,0,0,.6);font-size:13px;font-weight:500;color:#e6edf8;white-space:nowrap}',
      '.yr-chip b{font-weight:600;color:#fff}',
      '.yr-act{display:flex;align-items:center;gap:10px;margin-left:auto}',
      '.yr-seg{display:flex;padding:3px;border-radius:12px;background:rgba(0,6,18,.55);border:1px solid rgba(160,190,235,.22);box-shadow:inset 0 1px 3px rgba(0,0,0,.7)}',
      '.yr-seg button{height:28px;padding:0 14px;border:0;border-radius:9px;background:transparent;color:#c8d4e8;font:600 13px Poppins,system-ui,sans-serif;cursor:pointer}',
      '.yr-seg button[aria-pressed="true"]{background:linear-gradient(180deg,#ffffff,#dbe4f1);color:#011f40;box-shadow:inset 0 1px 0 #fff,0 2px 6px rgba(0,0,0,.5)}',
      '.yr-go{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 18px;border-radius:11px;background:linear-gradient(180deg,#ffa756 0%,#ff6702 48%,#e25000 52%,#f06a14 100%);color:#fff!important;text-decoration:none!important;font-size:14px;font-weight:600;text-shadow:0 1px 0 rgba(120,35,0,.6);box-shadow:inset 0 1px 0 rgba(255,235,210,.75),inset 0 -2px 3px rgba(120,30,0,.35),0 10px 22px -8px rgba(255,103,2,.95),0 0 0 1px rgba(150,45,0,.6)}',
      '.yr-go .yr-ic{width:13px;height:13px;stroke-width:2.4}',
      '.yr-tomt,.yr-villa{display:flex;align-items:center;gap:8px;margin:0 14px 14px;padding:12px 14px;border-radius:12px;background:rgba(0,6,18,.45);border:1px solid rgba(160,190,235,.16);font-size:13px;color:#c8d4e8}',
      '.yr-villa{margin-bottom:10px}',
      // flísar — dökkar, upphleyptar, ljós brún
      '.yr-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1.35fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,1.45fr) minmax(0,1fr);gap:10px;padding:0 14px 12px}',
      '.yr-k{position:relative;display:flex;flex-direction:column;gap:7px;min-width:0;padding:13px 14px 10px;border-radius:15px;' +
        'background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,0) 36%),radial-gradient(90% 80% at 50% 42%,rgba(70,130,210,.32),transparent 70%),linear-gradient(180deg,#0f2b52,#081a36);' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.24),inset 0 0 0 1px rgba(150,185,235,.22),inset 0 -1px 0 rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.5),0 16px 26px -14px rgba(0,0,0,.95)}',
      '.yr-om{opacity:.8}',
      // Ársþjónustan (Agnar 21.11: „aðeins meiri 3d effect og dýpt í ársþjónustu kassann"): upphleyptari flís með grænum
      // ljóma, gljáa efst og dýpri skugga; mælirinn situr í innfelldri, skáskorinni holu.
      '.yr-hero{background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,0) 30%),radial-gradient(80% 70% at 30% 55%,rgba(34,197,94,.22),transparent 70%),radial-gradient(90% 80% at 50% 42%,rgba(70,130,210,.30),transparent 70%),linear-gradient(180deg,#123362,#08193a);' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 0 0 0 1px rgba(134,239,172,.26),inset 0 -2px 0 rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.55),0 22px 34px -16px rgba(0,0,0,1),0 6px 12px -6px rgba(0,0,0,.7),0 0 34px -14px rgba(34,197,94,.65)}',
      '.yr-hero::before{content:"";position:absolute;left:10px;right:10px;top:1px;height:42%;border-radius:14px 14px 40% 40%/14px 14px 22px 22px;background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0));pointer-events:none}',
      '.yr-hero .yr-ars{box-shadow:inset 0 3px 8px rgba(0,0,0,.75),inset 0 -1px 0 rgba(255,255,255,.08),inset 0 0 0 1px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.14)}',
      '.yr-kl{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#eef3fb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.yr-kl .yr-ic{color:#ff8a1f;filter:drop-shadow(0 0 6px rgba(255,138,31,.55))}',
      '.yr-kl em{margin-left:auto;font-style:normal;font-size:11.5px;font-weight:500;letter-spacing:0;text-transform:none;color:#a9b8d0}',
      '.yr-kn{font-size:31px;font-weight:600;line-height:1;letter-spacing:-.02em;color:#fff;white-space:nowrap;text-shadow:0 1px 0 rgba(0,0,0,.6),0 0 20px rgba(130,175,255,.22)}',
      '.yr-kn small{margin-left:4px;font-size:14px;font-weight:500;letter-spacing:0;color:#b8c6dd;text-shadow:none}',
      '.yr-k2{font-size:21px;font-weight:600;line-height:1;color:#fff;white-space:nowrap;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      '.yr-ks{font-size:12.5px;color:#b8c6dd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yr-ks b{font-weight:600;color:#fff}',
      '.yr-row{display:flex;align-items:center;gap:9px;min-width:0}.yr-row .yr-ks,.yr-row .yr-kp.yr-r{margin-left:auto}',
      '.yr-kp{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;height:23px;padding:0 10px;border-radius:999px;font:600 12px Poppins,system-ui,sans-serif;white-space:nowrap;cursor:default}',
      'button.yr-kp{cursor:pointer}',
      '.yr-o{background:rgba(255,103,2,.16);border:1px solid rgba(255,138,31,.6);color:#ffb37a}',
      '.yr-r{background:rgba(220,38,38,.18);border:1px solid rgba(248,113,113,.6);color:#ffaaa3}',
      '.yr-a{background:rgba(242,193,78,.16);border:1px solid rgba(242,193,78,.55);color:#f8d98d}',
      '.yr-g{background:rgba(22,163,74,.18);border:1px solid rgba(74,222,128,.5);color:#86efac}',
      '.yr-kf{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:8px;border-top:1px solid rgba(255,255,255,.10);font-size:11px;color:#a9b8d0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.yr-kf .yr-led{width:7px;height:7px}.yr-kf s{text-decoration:none;color:rgba(255,255,255,.22);padding:0 3px}',
      '.yr-lnk{margin-left:auto;padding:0;border:0;background:none;color:#ffb37a;font:600 11px Poppins,system-ui,sans-serif;cursor:pointer}',
      '.yr-hr{height:2px;margin:2px 0;background:linear-gradient(180deg,rgba(0,0,0,.45) 0 1px,rgba(255,255,255,.08) 1px 2px)}',
      '.yr-well,.yr-lr{border-radius:10px;background:rgba(0,8,22,.45);box-shadow:inset 0 1px 3px rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.08)}',
      // ársþjónusta — innfelldur mælir með málmhnúð
      '.yr-ars{display:flex;align-items:center;gap:12px;min-width:0;padding:6px 8px 4px;border-radius:12px;background:radial-gradient(70% 90% at 30% 60%,rgba(34,197,94,.14),transparent 70%),rgba(0,8,22,.38);box-shadow:inset 0 2px 6px rgba(0,0,0,.65),inset 0 0 0 1px rgba(255,255,255,.04),0 1px 0 rgba(255,255,255,.1)}',
      '.yr-gauge{flex:none;position:relative;width:112px}.yr-gauge svg{display:block;width:112px;height:64px;overflow:visible}',
      '.yr-fg{filter:drop-shadow(0 0 6px rgba(34,197,94,.8))}.yr-ar{filter:drop-shadow(0 0 3px #ffffff)}',
      '.yr-gv{position:absolute;left:0;right:0;top:28px;text-align:center;font-size:24px;font-weight:600;line-height:1;text-shadow:0 1px 0 rgba(0,0,0,.6),0 0 14px rgba(74,222,128,.35)}.yr-gv small{font-size:13px;color:#b8c6dd}',
      '.yr-gs{position:absolute;left:0;right:0;top:53px;text-align:center;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#a9b8d0}',
      '.yr-gcap{display:flex;align-items:center;justify-content:center;gap:5px;width:112px;margin-top:5px;font-size:11px;color:#a9b8d0;white-space:nowrap}.yr-gcap i{width:10px;height:3px;border-radius:2px;background:#fff;box-shadow:0 0 4px #fff}',
      '.yr-rt{display:flex;flex-direction:column;gap:7px;min-width:0;flex:1}',
      '.yr-bl{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#b8c6dd;white-space:nowrap}.yr-bl span{display:inline-flex;align-items:center;gap:6px}.yr-bl b{font-weight:600;color:#fff}',
      // virði — innfelldur skjár
      '.yr-scr{position:relative;padding:6px 6px 0;border-radius:10px;background:linear-gradient(180deg,rgba(0,6,20,.6),rgba(0,6,20,.35));box-shadow:inset 0 2px 6px rgba(0,0,0,.75),0 1px 0 rgba(255,255,255,.09)}',
      '.yr-scr svg{display:block;width:100%;height:auto;overflow:visible}.yr-we{fill:rgba(255,255,255,.035)}.yr-cb{fill:url(#yrBH)}.yr-cs{fill:url(#yrSL)}',
      '.yr-ln{filter:drop-shadow(0 0 3px rgba(255,138,31,.95)) drop-shadow(0 0 8px rgba(255,103,2,.6))}',
      '.yr-cl{position:absolute;font-size:10.5px;color:#a9b8d0;line-height:1;white-space:nowrap}',
      '.yr-ax{position:relative;height:15px;font-size:10.5px;color:#a9b8d0}.yr-ax span{position:absolute;top:2px;transform:translateX(-50%);white-space:nowrap}.yr-ax .yr-nu{color:#ffb37a;font-weight:600}',
      // greitt inn — sívalningar
      '.yr-bars{position:relative;display:flex;align-items:flex-end;gap:8px;height:50px;padding:0 2px;border-bottom:1px solid rgba(255,255,255,.16)}',
      '.yr-bars div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;min-width:0;position:relative}',
      '.yr-bars i{display:block;width:100%;border-radius:5px 5px 1px 1px;background:linear-gradient(90deg,#3b5379,#a9bbd8 42%,#6f86ab 62%,#33496d);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 4px 8px -4px rgba(0,0,0,.7)}',
      '.yr-bars .yr-nu i{background:linear-gradient(90deg,#b23c00,#ffb066 42%,#ff7a1a 60%,#c94400);box-shadow:inset 0 1px 0 rgba(255,235,210,.8),0 0 14px -2px rgba(255,103,2,1)}',
      '.yr-ghost{position:absolute;left:0;right:0;border:1px dashed rgba(255,162,94,.7);border-bottom:0;border-radius:5px 5px 0 0;background:repeating-linear-gradient(135deg,rgba(255,138,31,.12) 0 3px,transparent 3px 6px)}',
      '.yr-avg{position:absolute;left:-2px;right:-2px;border-top:1px dashed rgba(255,255,255,.6);z-index:2}',
      '.yr-mo{display:flex;gap:8px;padding:0 2px;font-size:10.5px;color:#a9b8d0}.yr-mo span{flex:1;display:flex;flex-direction:column;align-items:center;line-height:1.3}.yr-mo b{font-size:12.5px;font-weight:600;color:#fff}.yr-mo .yr-nu b{color:#ffb37a}',
      // á leiðinni
      '.yr-sb{display:flex;height:9px;padding:1px;gap:2px;border-radius:999px;background:rgba(0,6,20,.6);box-shadow:inset 0 1px 3px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.09)}.yr-sb-l{height:11px}',
      '.yr-sb i{display:block;height:100%;min-width:4px;border-radius:999px}',
      '.yr-s-bl{background:linear-gradient(180deg,#8db2f7,#2f6fe4);box-shadow:inset 0 1px 0 rgba(225,235,255,.6),0 0 8px rgba(91,143,240,.7)}',
      '.yr-s-rd{background:linear-gradient(180deg,#fca5a5,#dc2626);box-shadow:inset 0 1px 0 rgba(255,220,215,.6),0 0 8px rgba(248,113,113,.8)}',
      '.yr-s-or{background:linear-gradient(180deg,#ffb066,#ec5300);box-shadow:inset 0 1px 0 rgba(255,235,210,.7),0 0 8px rgba(255,138,31,.8)}',
      '.yr-s-gr{background:linear-gradient(180deg,#86efac,#16a34a);box-shadow:inset 0 1px 0 rgba(220,255,230,.6),0 0 10px rgba(74,222,128,.7)}',
      '.yr-s-am{background:linear-gradient(180deg,#fbe1a0,#e9ad25);box-shadow:inset 0 1px 0 rgba(255,245,215,.7),0 0 8px rgba(242,193,78,.6)}',
      '.yr-lrs{display:flex;flex-direction:column;gap:5px}',
      '.yr-lr{display:flex;align-items:center;gap:8px;padding:5px 10px;font-size:12.5px;color:#dfe6f2;white-space:nowrap}.yr-lr b{margin-left:auto;font-size:15px;font-weight:600;color:#fff}.yr-lr b small{margin-left:2px;font-size:11px;font-weight:500;color:#b8c6dd}',
      // vikan
      '.yr-vk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
      '.yr-well{display:flex;flex-direction:column;gap:4px;min-width:0;padding:7px 9px 6px}',
      '.yr-v{display:flex;align-items:baseline;gap:5px;font-size:16px;font-weight:600;line-height:1.1;white-space:nowrap}.yr-v small{font-size:11px;font-weight:500;color:#b8c6dd;margin-left:-2px}.yr-v s{text-decoration:none;font-size:11px;font-weight:600}',
      '.yr-up{color:#4ade80;text-shadow:0 0 8px rgba(74,222,128,.55)}.yr-dn{color:#ff8f86;text-shadow:0 0 8px rgba(248,113,113,.55)}',
      '.yr-n{font-size:11px;color:#a9b8d0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.yr-db{position:relative;height:5px;border-radius:999px;background:rgba(0,0,0,.5);box-shadow:inset 0 1px 2px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.07)}',
      '.yr-db i{position:absolute;left:0;top:0;bottom:0;border-radius:999px}',
      '.yr-db b{position:absolute;top:-1px;width:7px;height:7px;margin-left:-3.5px;border-radius:1px;background:linear-gradient(135deg,#fff,#b9c6dc);transform:rotate(45deg);box-shadow:0 0 0 1.5px #08234a,0 0 6px rgba(255,255,255,.6)}',
      '.yr-u{background:linear-gradient(90deg,#166534,#4ade80);box-shadow:0 0 8px rgba(74,222,128,.7)}.yr-d{background:linear-gradient(90deg,#991b1b,#f87171);box-shadow:0 0 8px rgba(248,113,113,.7)}',
      // neðsta röðin
      '.yr-foot{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:0 14px 14px}',
      '.yr-fl{display:flex;align-items:center;gap:10px;min-width:0;height:44px;padding:0 8px 0 14px;border-radius:13px;background:rgba(0,6,18,.55);border:1px solid rgba(160,190,235,.16);box-shadow:inset 0 2px 5px rgba(0,0,0,.7)}',
      '.yr-fk{flex:none;overflow:visible}',
      '.yr-cnt{display:inline-grid;place-items:center;min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:radial-gradient(circle at 35% 25%,#fecaca,#ef4444 45%,#b91c1c);color:#fff;font-size:12px;font-weight:700;letter-spacing:0;box-shadow:0 0 0 2px rgba(220,38,38,.25),0 0 14px rgba(239,68,68,.9)}',
      '.yr-rail{display:flex;gap:7px;min-width:0;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}',
      '.yr-ach,.yr-pi{flex:none;display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,8,24,.3));border:1px solid rgba(160,190,235,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.12);font-size:12.5px;color:#dfe6f2;white-space:nowrap}',
      '.yr-ach b,.yr-pi b{font-weight:600;color:#fff}.yr-pi u{text-decoration:none;font-size:11px;font-weight:600;color:#a9b8d0}',
      // mjórri gluggi: þrír dálkar; sími: flísarnar strjúkast til hliðar, flögurnar fara
      '@container yr (max-width: 1150px){.yr-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.yr-chips{display:none}}',
      '@container yr (max-width: 760px){.yr-grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.yr-k{flex:none;width:270px;scroll-snap-align:start}' +
        '.yr-foot{grid-template-columns:minmax(0,1fr)}.yr-fl+.yr-fl{display:none}.yr-top,.yr-line{flex-wrap:wrap;gap:10px}.yr-act{margin-left:0}.yr-mark{font-size:16px}}',
    ].join('\n');
  }

  window.YfirsynRond = { html, css, smellur, geymaArs, load, S, version: '2026-11-21' };
})();
