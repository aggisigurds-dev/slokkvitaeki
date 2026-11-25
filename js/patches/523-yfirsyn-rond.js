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
 *
 * 25.11.2026 (Agnar): Ársþjónusta aftur fremst · ↻ allsherjar endurnýjun (allar heimildir + AppSettings) · „skráðir í dag“
 * í stað „við vinnu“ (Tímavera berst seint: 0 í dag = óskráð, ekki enginn við vinnu) · BH/SL hlutfallslína á „Á leiðinni inn“,
 * smellur opnar glugga með öllum ósendum og ógreiddum kröfum félagsins (yfirsyn.cjs sendir raðirnar) · tæki mánaðarins
 * (yfirfarin, hlaðin, ný seld) á Ósótt-flísinni úr Unnið-reglunni (_rekstur-yfirlit taeki_sund).
 */
(() => {
  if (window.YfirsynRond) return;

  const EIGENDUR = ['Agnar', 'Anni'];
  const HAM_LYKILL = 'bord.yfirsyn';
  const NYTT = 10 * 60000;              // sótt aftur eftir 10 mín. þegar borðið teiknast
  const REKSTUR_URL = 'https://brunaholf.netlify.app/rekstur';
  const S = { d: null, villa: null, loading: false, at: 0, bannad: false, r: null, rVilla: null, rLoading: false, rAt: 0 };

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
      // 403: innskráður er ekki Agnar eða Annþór (eða ekki stjórnandi) — þá hverfur röndin alveg, engin villa á borðinu.
      else if (r.status === 403) { S.bannad = true; S.d = null; S.villa = null; }
      else if (!r.ok) S.villa = 'Yfirsýnin náðist ekki (' + r.status + ') — reynt aftur eftir 10 mín.';
      else { S.d = await r.json(); S.villa = null; }
    } catch (_) { S.villa = 'Yfirsýnin náðist ekki — netið?'; }
    S.loading = false; S.at = Date.now();
    notify();
    if (!S.bannad && S.d) ladaRekstur(force);        // „Unnið“ í mánuðinum kemur sér (þungt: Payday, Tímavera, Ajour) og seinkar ekki röndinni
  }

  // 22.11.2026 (Agnar: „skipta út t.d. vikutekjum fyrir þína samantekt“): flísin „tekjur vikunnar“ víkur fyrir „unnið í mánuðinum“ hjá hvoru félagi
  // (úr /api/rekstur-yfirlit — sama og „Hvernig gengur reksturinn?“ á Tekjum): unnið til dags og % af síðasta mánuði; áætlunin er MERKT í title.
  async function ladaRekstur(force) {
    if (S.rLoading) return;
    if (!force && S.rAt && Date.now() - S.rAt < NYTT) return;
    S.rLoading = true;
    try {
      const r = await fetch('/api/rekstur-yfirlit', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) { S.rVilla = 'Reksturinn svaraði ' + r.status; }
      else { const j = await r.json(); if (j && j.slokkvitaeki && j.brunaholf) { S.r = j; S.rVilla = null; } else S.rVilla = 'óvænt snið'; }
    } catch (_) { S.rVilla = 'Reksturinn náðist ekki — netið?'; }
    S.rLoading = false; S.rAt = Date.now();
    notify();
  }
  // 153 (Ársskoðun) kallar þetta þegar hún reiknar virðið. Geymt á þjóni aðeins ef tölurnar breyttust.
  let arsSent = '';
  function geymaArs(v) {
    try {
      if (!v || !fin(v.total) || v.total <= 0 || !window.AppSettings || !AppSettings.save) return;
      const lykill = [v.ar, v.total, v.buid, v.stadir, v.buidStadir, v.eftirStadir, v.komin, v.fela_slepptu].join('|');
      const nu = AppSettings.path ? AppSettings.path('yfirsyn_ars') : null;
      const nuLykill = nu ? [nu.ar, nu.total, nu.buid, nu.stadir, nu.buidStadir, nu.eftirStadir, nu.komin, nu.fela_slepptu].join('|') : '';
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
    refresh: '<path d="M13.3 8.3a5.3 5.3 0 1 1-1.6-3.9"/><path d="M13.7 2.2v3.1h-3.1"/>',
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
    const eftir = a.total - a.buid, eftirSt = fin(a.eftirStadir) ? a.eftirStadir : (a.stadir || 0) - (a.buidStadir || 0);
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
      '<span class="yr-ks" title="SL = tekjur eftir söludegi (önnur regla en „Unnið í mánuðinum“, sem miðar við skoðunarmánuð/klart_at). BH = unnið, sama tala og í „Unnið í mánuðinum“.">SL sala <b>' + mkr(sl) + '</b> · BH <b>' + mkr(bh) + '</b></span>' +
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
    const sund = m => esc(MAN[manOf(m.fra)] || '') + ' ' + mkr(m.alls) + ' m (Payday SL ' + mkr(m.sl_payday) + ' · búð ' + mkr(m.sl_bud) + ' · Payday BH ' + mkr(m.bh_payday) + (m.bh_hand ? ' · merkt greitt BH ' + mkr(m.bh_hand) + ': ' + esc((m.bh_hand_reikn || []).join(', ')) : '') + ')';
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

  // Áunnið Brunahólfs í mánuðinum, án vsk: göt (Landspítali + Heklureitur) og rukkanlegir tímar. Sama tala og á Unnið-spjaldinu.
  function bhAunidLina() {
    const man = S.r && S.r.brunaholf && S.r.brunaholf.man;
    const m = man && man[man.length - 1];
    const h = m && m.hlutar;
    if (!h) return '';
    const got = fin(h.landspitali) && fin(h.heklureitur) ? h.landspitali + h.heklureitur : null;
    return '<span class="yr-n" title="Brunahólf áunnið í mánuðinum, án vsk. Göt = Landspítali + Heklureitur. Rukkanlegir tímar × taxti.">BH áunnið · göt <b>' + (got == null ? 'ómælt' : mkr(got) + ' m') + '</b> · rukkanlegir tímar <b>' + (fin(h.tima) ? mkr(h.tima) + ' m' : 'ómælt') + '</b></span>';
  }

  // BH/SL hlutfallslína (Agnar 25.11.2026: „hversu mikið er á sitthvoru fyrirtækinu ógreitt … í svona hlutfallslínu, og … clicka á
  // sitthvorum megin og síðan opnað glugga sem sýnir alla tölurnar"). Hlutur hvors félags í ósendu + ógreiddu (m. vsk); breidd eftir
  // hlutfalli, minnst 22 % svo minni hliðin sé alltaf smellanleg. Kom í stað línunnar „Kröfu yfirlit BH · ósent · ógreitt".
  function felagBar(sl, bh) {
    const t = x => ok(x) ? x.osent.kr + x.ogreitt.kr : null;
    const b = t(bh), s = t(sl);
    if (b == null && s == null) return '';
    const alls = ((b || 0) + (s || 0)) || 1;
    const seg = (felag, nafn, v, cls) => v == null
      ? '<span class="yr-cseg yr-cseg-om" title="' + esc(nafn + ': ómælt') + '"><span>' + nafn + '</span><b>ómælt</b></span>'
      : '<button type="button" class="yr-cseg ' + cls + '" data-t5="yr-krofur" data-felag="' + felag + '" style="flex-grow:' + Math.max(v / alls, 0.22).toFixed(3) + '" title="' +
        esc((felag === 'bh' ? 'Brunahólf' : 'Slökkvitæki') + ' — ósent + ógreitt ' + isk(v) + ' kr m. vsk (' + Math.round(v / alls * 100) + ' %). Smelltu til að sjá allar kröfurnar.') + '">' +
        '<span>' + nafn + ' · ' + Math.round(v / alls * 100) + ' %</span><b>' + mkr(v) + '<small>m</small></b></button>';
    return '<div class="yr-cbar" role="group" aria-label="Ósent og ógreitt eftir félagi">' + seg('bh', 'BH', b, 'yr-cbh') + seg('sl', 'SL', s, 'yr-csl') + '</div>';
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
      felagBar(sl, bh) +
      bhAunidLina() +
      '<span class="yr-kf">' + (vantar.length ? led('or') + 'ómælt: ' + esc(vantar.join(', ')) : led('gr') + 'Kröfur SL · Kröfu yfirlit BH') + '</span>' +
    '</div>';
  }

  // SAMTALS (fasi 3c, 22.11.2026; Agnar: „skipta út t.d. vikutekjum fyrir þína samantekt“): VIKAN-flísin víkur fyrir samtölu líðandi mánaðar hjá hvoru félagi.
  // Gögn: /api/rekstur-yfirlit (S.r) — sama og „Hvernig gengur reksturinn?“ á Tekjum og Fjármála-yfirliti, svo engin önnur tala er til fyrir sama mánuð.
  // Félögin eru ALDREI lögð saman. Slökkvitæki: úttektir · verkstæði · verslun (án vsk) + fjöldi tækja (kreditnóta á dag frumsölu; skoðunarmánuður/klart_at).
  // Brunahólf: unnið (tímar × taxti + göt, áætlun) og undir því reikningsfært / ógefið út. Ómælt með ástæðu — aldrei 0. Smellur → Tekjuliðir í Rekstrarskýrslu.
  // Vikutölur (tímar, göt, reikningar vikunnar) fóru með VIKAN-flísinni: þær eru í Rekstrarskýrslunni undir „Þessi vika“ og „Síðasta vika“.
  // Upphæð í milljónum (2 sæti) frá 5.000 kr.; undir því í krónum (annars sýnir mkr „0,00“ eða „-0,00“ sem lítur út eins og núll). Raunverulegt núll er „0,00“.
  const minus = t => String(t).replace('-', '−');
  const stor = n => (n === 0 || Math.abs(n) >= 5000) ? { t: minus(mkr(n)), e: 'm' } : { t: minus(isk(n)), e: 'kr' };
  const smatt = n => { if (!fin(n)) return 'ómælt'; const x = stor(n); return x.t + ' ' + x.e; };
  function samtalsHtml(rek) {
    const r = S.r;
    const lnk = REKSTUR_URL + '#tekjulidir', fjarm = 'https://brunaholf.netlify.app/#fjarmalyfirlit';
    const nm = r ? (MANUDUR[manOf(r.idag)] || 'mánuðinum') : 'mánuðinum';
    const aj = rek && rek.ferskleiki && rek.ferskleiki.ajour && rek.ferskleiki.ajour.nyjast;
    const kf = '<a class="yr-fm" href="' + fjarm + '" target="_blank" rel="noopener" title="Fjármála-yfirlit: ógreitt, ósent og unnið en ekki gefið út">Fjármála-yfirlit →</a>' +
      '<span class="yr-kf">' + heimildLed(rek, 'Tímavera') + 'Tímavera<s>|</s>' + heimildLed(rek, 'Ajour (göt)') + 'göt: Ajour ' + esc(dd(aj)) + '</span>';
    const om = (nafn, astaeda) => '<div class="yr-well"><span class="yr-v">' + esc(nafn) + ' <span class="yr-e">ómælt</span></span><span class="yr-n" title="' + esc(astaeda) + '">' + esc(astaeda) + '</span></div>';
    let wells;
    if (!r) wells = '<div class="yr-well"><span class="yr-v"><span class="yr-e">' + (S.rVilla ? 'ómælt' : '…') + '</span></span><span class="yr-n" title="' + esc(S.rVilla || '') + '">' + esc(S.rVilla || 'sæki samtölu mánaðarins …') + '</span></div>';
    else {
      const sl = r.slokkvitaeki, um = sl && !sl.omaelt ? sl.unnid_manudur : null;
      const wSl = um && fin(um.samtals)
        ? '<div class="yr-well" title="' + esc('Slökkvitæki — ' + nm + ' til dags, án vsk: úttektir ' + isk(um.skodanir) + ' kr · verkstæði ' + isk(um.verkstaedi) + ' kr · verslun ' + isk(um.verslun) + ' kr · samtals ' + isk(um.samtals) + ' kr · ' + isk(um.taeki) + ' tæki') + '">' +
          '<span class="yr-v">' + stor(um.samtals).t + '<span class="yr-e">' + stor(um.samtals).e + ' Slökkvitæki</span></span>' +
          '<span class="yr-n">úttektir <b>' + smatt(um.skodanir) + '</b> · verkstæði <b>' + smatt(um.verkstaedi) + '</b></span>' +
          '<span class="yr-n">verslun <b>' + smatt(um.verslun) + '</b> · ' + isk(um.taeki).replace('-', '−') + ' tæki</span></div>'
        : om('Slökkvitæki', (sl && sl.omaelt) || 'samtala mánaðarins vantar');
      const bh = r.brunaholf, m = bh && bh.man && bh.man[bh.man.length - 1];
      let wBh;
      if (m && fin(m.unnid)) {
        const rf = fin(m.reikningsfaert) ? '<b>' + smatt(m.reikningsfaert) + '</b>' : 'ómælt';
        const og = !fin(m.ogefid) ? 'ómælt' : m.ogefid > 0 ? '<b>' + smatt(m.ogefid) + '</b>' : '<b>ekkert</b> <span class="yr-e" title="Reikningsfært í mánuðinum er umfram unnið — reikningar fyrir vinnu fyrri mánaða eru gefnir út núna">(umfram ' + smatt(-m.ogefid) + ')</span>';
        const h = m.hlutar || {};
        const got = fin(h.landspitali) && fin(h.heklureitur) ? h.landspitali + h.heklureitur : null;
        wBh = '<div class="yr-well" title="' + esc('Brunahólf — ' + nm + ' til dags, án vsk, áætlun: unnið ' + isk(m.unnid) + ' kr (rukkanlegir tímar ' + isk(h.tima) + ' · göt ' + (got == null ? 'ómælt' : isk(got) + ' kr') + ' · Landspítali ' + isk(h.landspitali) + ' · Heklureitur ' + isk(h.heklureitur) + ') · reikningsfært ' + (fin(m.reikningsfaert) ? isk(m.reikningsfaert) + ' kr' : 'ómælt') + ' · ógefið út = unnið − reikningsfært') + '">' +
          '<span class="yr-v">' + stor(m.unnid).t + '<span class="yr-e">' + stor(m.unnid).e + ' Brunahólf</span></span>' +
          '<span class="yr-n">Göt <b>' + (got == null ? 'ómælt' : smatt(got)) + '</b> · Landspítali ' + smatt(h.landspitali) + ' · Heklureitur ' + smatt(h.heklureitur) + '</span>' +
          '<span class="yr-n">Rukkanlegir tímar <b>' + smatt(h.tima) + '</b></span>' +
          '<span class="yr-n">reikningsfært ' + rf + '</span><span class="yr-n">ógefið út ' + og + '</span></div>';
      } else wBh = om('Brunahólf', (m && m.omaelt) || (bh && bh.omaelt) || 'samtala mánaðarins vantar');
      wells = wSl + wBh;
    }
    const tit = (r ? ['slokkvitaeki', 'brunaholf'].map(k => { const b = r[k]; return (k === 'slokkvitaeki' ? 'Slökkvitæki: ' : 'Brunahólf: ') + (b && b.setning ? b.setning.setning + (b.setning.aaetlun ? ' ' + b.setning.aaetlun.texti : '') : 'ómælt'); }).join('\n') + '\n' : '') +
      'Unnið í ' + nm + ' til dags, án vsk — félögin eru aldrei lögð saman. Slökkvitæki: úttektir í skoðunarmánuði, verkstæði þegar tækið er klárt, verslun; kreditnóta fylgir degi frumsölunnar. ' +
      'Brunahólf: stimplaðir tímar × taxti + kláruð göt (áætlun); reikningsfært = Payday-reikningar útgefnir í mánuðinum; ógefið út = unnið − reikningsfært. ' +
      'Virði mánaðarins sýnir SL eftir söludegi (önnur regla); BH er sama talan og hér. Vikutölurnar (tímar, göt, reikningar) eru í Rekstrarskýrslunni undir „Þessi vika“ og „Síðasta vika“. Smelltu til að opna Tekjuliði.';
    const gamalt = r && S.rVilla ? '<span class="yr-n" title="' + esc('Síðasta endurnýjun mistókst: ' + S.rVilla) + '">' + led('or') + 'tölur frá kl. ' + esc(klukka(r.maelt_at)) + ' — endurnýjun mistókst</span>' : '';
    return '<div class="yr-k yr-sam" title="' + esc(tit + (gamalt ? '\nSíðasta endurnýjun mistókst: ' + S.rVilla : '')) + '">' +
      '<a class="yr-samlnk" href="' + lnk + '" target="_blank" rel="noopener">' +
        '<span class="yr-kl">' + ic('klukka') + 'Unnið í ' + esc(nm) + '<em>án vsk</em></span>' +
        '<div class="yr-vk yr-vk1">' + wells + '</div></a>' + gamalt + kf + '</div>';
  }

  // Tæki mánaðarins (Agnar 25.11.2026: „fjöldi yfirfarinna tækja í þessum mánuði, fjöldi hlaðinna …, fjöldi seldra … og síðan
  // heildina"). Úr Unnið-reglunni (_unnid-sl / _rekstur-yfirlit taeki_sund): sölulínur „Yfirferð · / Hleðsla · / Nýtt ·" í
  // skoðunarmánuði + verkliðir verkstæðis í mánuði klart_at — sama talan og „Unnið í mánuðinum" sýnir, nú sundurliðuð.
  // Alls = summa línanna (tæki sem er bæði yfirfarið og hlaðið telst í báðum). Búðarsalan ber aðeins krónur, enga tækjatölu:
  // það stendur sýnilega á flísinni, ekki falið (aldrei 0 þar sem gögn vantar).
  function taekiMan() {
    const sl = S.r && S.r.slokkvitaeki, um = sl && !sl.omaelt ? sl.unnid_manudur : null;
    const nm = MANUDUR[manOf(S.r && S.r.idag)] || 'mánuðinum';
    if (!S.r) return '<span class="yr-hr"></span><span class="yr-n">' + esc(S.rVilla ? 'Tæki mánaðarins ómælt — ' + S.rVilla : 'Sæki tæki mánaðarins …') + '</span>';
    if (!um) return '<span class="yr-hr"></span><span class="yr-n" title="' + esc((sl && sl.omaelt) || '') + '">Tæki í ' + esc(nm) + ': ómælt</span>';
    const ts = um.taeki_sund;
    if (!ts) return '<span class="yr-hr"></span><span class="yr-vks">' + ic('ars') + 'Tæki í ' + esc(nm) + '<b>' + isk(um.taeki) + '</b><i>alls</i></span>';
    const allt = (ts.yfirferd || 0) + (ts.hledsla || 0) + (ts.nytt || 0);
    const c = (n, t) => '<span class="yr-tc"><b>' + isk(n) + '</b><i>' + t + '</i></span>';
    return '<span class="yr-hr"></span>' +
      '<span class="yr-vks" title="' + esc('Tæki í ' + nm + ' til dags úr úttektum og verkstæði: yfirfarin ' + isk(ts.yfirferd) + ' · hlaðin ' + isk(ts.hledsla) + ' · ný seld í úttektum ' + isk(ts.nytt) + '. Alls = summa línanna; tæki sem er bæði yfirfarið og hlaðið telst í báðum. Tæki seld í búðinni eru ekki talin (búðarsalan ber aðeins krónur).') + '">' +
        ic('ars') + 'Tæki í ' + esc(nm) + '<b>' + isk(allt) + '</b><i>alls</i></span>' +
      '<span class="yr-tg">' + c(ts.yfirferd, 'yfirfarin') + c(ts.hledsla, 'hlaðin') + c(ts.nytt, 'ný seld') + '</span>' +
      '<span class="yr-n yr-tn">' + led('am') + 'Búðarsala ekki talin í tækjum</span>';
  }

  // Ósótt + verkstæði þjappað (Agnar 25.11.2026: „þjappa hinu aðeins") svo tæki mánaðarins komist fyrir.
  function osottHtml(D, rek) {
    const os = D.osott, vk = ok(rek) && rek.sl && rek.sl.verkstaedi;
    if (!ok(os)) return omaelt('Ósótt tæki', os && os.omaelt);
    const elst = fin(os.elst_dagar) ? '<span class="yr-kp ' + (os.elst_dagar > 60 ? 'yr-a' : 'yr-g') + '" style="margin-left:auto" title="' +
      esc('Elsta tilbúna tækið hefur beðið ' + os.elst_dagar + ' daga' + (os.yfir30 ? ' · ' + os.yfir30 + ' tilbúin lengur en 30 daga' : '')) + '">elst ' + isk(os.elst_dagar) + ' d.' + (os.yfir30 ? ' · ' + isk(os.yfir30) + ' &gt;30' : '') + '</span>' : '';
    return '<div class="yr-k" title="Verkbeiðnir tilbúnar til afhendingar sem bíða þess að vera sóttar">' +
      '<span class="yr-kl">' + ic('lykill') + 'Ósótt tæki<em>' + isk(os.kr) + ' kr</em></span>' +
      '<span class="yr-row"><span class="yr-kn">' + isk(os.n) + '</span>' + elst + '</span>' +
      // „bíða" á verkstæðinu eru sömu tækin og ósótt hér að ofan (yfirferð 21.11) — aðeins „í vinnslu" stendur hér.
      (vk ? '<span class="yr-vks">' + ic('hus') + 'Verkstæðið<b>' + isk(vk.nu) + '</b><i>í vinnslu</i></span>' : '') +
      taekiMan() +
      '<span class="yr-kf">' + led('gr') + 'verkbeiðnir<s>|</s>' + led(S.r ? 'gr' : 'gy') + 'sölulínur</span>' +
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
        // 25.11.2026 (Agnar: „0 við vinnu - 8 í gær passar ekki"): talan er fjöldi starfsmanna með SKRÁÐA tíma í Tímaveru, og dagurinn
        // í dag fyllist ekki fyrr en tímarnir eru skráðir (mælt 25.11 kl. 13: engin færsla dagsins enn, 8 í gær). „Við vinnu“ lofaði
        // lifandi viðveru sem gögnin hafa ekki.
        (ok(tv) ? '<span class="yr-chip" title="Starfsmenn með skráða tíma í Tímaveru. Dagurinn í dag fyllist þegar tímarnir eru skráðir, oft í lok dags — 0 í dag þýðir óskráð, ekki að enginn sé við vinnu.">' + led(tv.idag ? 'gr' : 'gy') + isk(tv.idag) + ' skráðir í dag · <b>' + isk(tv.igaer) + '</b> í gær</span>' : '') +
        (hm.length ? '<span class="yr-chip" title="' + esc(hm.map(h => h.n + ': ' + h.t).join(' · ')) + '">Heimildir ' + hm.map(h => led(h.lit)).join('') + '</span>' : '') +
      '</div>' +
      '<div class="yr-act">' + hamRofi('rond') + rfTakki() +
        '<a class="yr-go" href="' + REKSTUR_URL + '" target="_blank" rel="noopener" title="Rekstrarskýrsla dagsins — allar tölurnar og sundurliðun">Stækka' + ic('nidur') + '</a>' +
      '</div>' +
    '</header>';
  }
  const hamRofi = virkur => '<div class="yr-seg" role="group" aria-label="Stærð yfirsýnar">' +
    '<button type="button" data-t5="yr-ham" data-v="lina" aria-pressed="' + (virkur === 'lina') + '">Lína</button>' +
    '<button type="button" data-t5="yr-ham" data-v="rond" aria-pressed="' + (virkur === 'rond') + '">Rönd</button></div>';
  // ↻ Allsherjar endurnýjun (Agnar 25.11.2026: „hafu alsherjar refresh takka á honum"): snýst meðan heimildirnar eru sóttar.
  const rfTakki = () => {
    const snyst = S.loading || S.rLoading;
    return '<button type="button" class="yr-rf' + (snyst ? ' yr-rf-spin' : '') + '" data-t5="yr-refresh"' + (snyst ? ' aria-busy="true"' : '') +
      ' title="Sækja allar tölur beggja félaga upp á nýtt — kröfur, unnið, virði, greitt inn, ársþjónusta, Tímavera, ósótt" aria-label="Endurnýja allar tölur">' + ic('refresh') + '</button>';
  };

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

  // Lína-hamur: flaga með unnið í mánuðinum hjá hvoru félagi (kom í stað „Vikan“; félögin aldrei lögð saman, ómælt með ástæðu í title)
  function unnidChip() {
    const r = S.r;
    if (!r) return '';
    const um = r.slokkvitaeki && !r.slokkvitaeki.omaelt ? r.slokkvitaeki.unnid_manudur : null;
    const bm = r.brunaholf && r.brunaholf.man && r.brunaholf.man[r.brunaholf.man.length - 1];
    const a = um && fin(um.samtals) ? 'SL ' + smatt(um.samtals) : 'SL ómælt', b = bm && fin(bm.unnid) ? 'BH ' + smatt(bm.unnid) : 'BH ómælt';
    return '<span class="yr-chip" title="Unnið í ' + esc(MANUDUR[manOf(r.idag)] || 'mánuðinum') + ' til dags, án vsk — félögin eru aldrei lögð saman">Unnið <b>' + a + ' · ' + b + '</b></span>';
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
        (a && fin(a.total) ? chip('Ársþjónusta', pct(a.buid, a.total) + ' %') : '') +
        (D && (ok(sl) || ok(bh)) ? chip('Á leiðinni inn', mkr(leid) + ' m') : '') +
        (ok(rek) ? chip('Virði ' + esc(MAN[manOf(rek.timabil[3].fra)] || '') + '.', mkr(rek.badir.tekjur[3]) + ' m') : '') +
        (D && ok(D.greitt) && D.greitt.manudir && D.greitt.manudir[3] ? chip('Greitt inn', mkr(D.greitt.manudir[3].alls) + ' m') : '') +
        unnidChip() +
        (at.length ? '<span class="yr-chip">' + led('rd') + at.length + ' þarf athygli</span>' : '') +
      '</div>' +
      '<div class="yr-act">' + hamRofi('lina') + rfTakki() + '</div>' +
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
    if (EIGENDUR.indexOf(n) < 0 || S.bannad) return '';
    if (!S.loading && (!S.at || Date.now() - S.at > NYTT)) setTimeout(() => load(), 0);
    const ham = vmLesa(HAM_LYKILL, 'rond') === 'lina' ? 'lina' : 'rond';
    const D = S.d, rek = D && D.rekstur;
    if (ham === 'lina') return '<div class="yr-fr yr-fr-l"><section class="yr-mb" aria-label="Yfirsýn">' + linaHtml(ctx, D, rek) + '</section></div>';
    let midja;
    if (!D) midja = '<div class="yr-tomt">' + (S.villa ? led('or') + esc(S.villa) : 'Sæki tölur beggja félaga…') + '</div>';
    else {
      // 25.11.2026 (Agnar: „mátt setja árþjónusta 2026 aftur alveg til vinstri endann"): Ársþjónusta fremst, svo á leiðinni inn
      // og unnið; virði og greitt inn á eftir. Á síma er þetta 2 dálkar svo fleiri tölur sjást án hliðarskruns.
      midja ='<div class="yr-grid">' + arsHtml() + leidinniHtml(D) + samtalsHtml(rek) + virdiHtml(rek) + greittHtml(D.greitt, rek) + osottHtml(D, rek) + '</div>' + footHtml(D, rek);
    }
    return '<div class="yr-fr">' + DEFS + '<section class="yr-mb" aria-label="Yfirsýn">' + topHtml(n, ctx, rek, D && D.timavera) +
      (S.villa && D ? '<div class="yr-villa">' + led('or') + esc(S.villa) + ' — sýni tölur frá kl. ' + esc(klukka(D.maelt_at)) + '</div>' : '') + midja + '</section></div>';
  }

  // ↻ Allsherjar endurnýjun (Agnar 25.11.2026): ALLAR heimildir röndarinnar sóttar upp á nýtt í einu — /api/yfirsyn (kröfur beggja
  // félaga, greitt inn, Tímavera, ósótt, síðast greitt, Rekstrarskýrslan), /api/rekstur-yfirlit (unnið og tæki mánaðarins, load(true)
  // kallar ladaRekstur(true)) og AppSettings (virði ársþjónustu sem Ársskoðun reiknar). Endurnýjun sem er á lofti er ekki tvöfölduð.
  function allsherjar() {
    if (S.loading || S.rLoading) return;
    S.at = 0; S.rAt = 0;
    try { if (window.AppSettings && typeof AppSettings.load === 'function') Promise.resolve(AppSettings.load()).then(notify, () => {}); } catch (_) {}
    load(true);
    notify();               // takkinn snýst strax meðan sótt er
  }

  // Gluggi með öllum kröfum annars félagsins sem röndin leggur saman (Agnar 25.11.2026: „clicka á sitthvorum megin og síðan opnað
  // glugga sem sýnir alla tölurnar sem er verið að miðast við … alla ógreiddu kröfurnar"). Raðirnar koma úr yfirsyn.cjs (reikn) —
  // sömu mengi og summurnar. Borðið býr í Shadow DOM (368), svo glugginn situr á document.body með EIGIN stíl (yrm-stil).
  const MODAL_CSS = [
    '.yrm-back{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(2,10,24,.72);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);font-family:Poppins,system-ui,sans-serif;line-height:1.35;text-align:left;color:#eef3fb}',
    '.yrm-box{display:flex;flex-direction:column;width:min(620px,100%);max-height:86vh;border-radius:18px;overflow:hidden;background:linear-gradient(180deg,#163868,#0b1f40 55%,#07152f);box-shadow:0 30px 70px -20px rgba(0,0,0,.95),inset 0 1px 0 rgba(255,255,255,.2),inset 0 0 0 1px rgba(150,185,235,.22)}',
    '.yrm-top{display:flex;align-items:center;gap:12px;padding:15px 16px 13px 18px;border-bottom:1px solid rgba(255,255,255,.1)}',
    '.yrm-ti{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:16px;font-weight:600;color:#fff}.yrm-ti span{font-size:11.5px;font-weight:500;color:#a9b8d0}',
    '.yrm-tot{margin-left:auto;font-size:19px;font-weight:600;color:#ffb37a;font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.yrm-x{flex:none;width:32px;height:32px;padding:0;border-radius:9px;border:1px solid rgba(160,190,235,.3);background:rgba(0,8,24,.45);color:#cdd9ec;font:600 14px Poppins,system-ui,sans-serif;cursor:pointer}.yrm-x:hover{color:#fff}.yrm-x:focus-visible{outline:2px solid #ffb066;outline-offset:2px}',
    '.yrm-sum{display:flex;flex-wrap:wrap;gap:6px 18px;padding:10px 18px;font-size:12.5px;color:#cdd9ec;border-bottom:1px solid rgba(255,255,255,.07)}.yrm-sum span{display:inline-flex;align-items:center;gap:7px}.yrm-sum b{color:#fff;font-weight:600}',
    '.yrm-scr{overflow:auto;padding:2px 14px 12px;-webkit-overflow-scrolling:touch}',
    '.yrm-sec{margin-top:12px}.yrm-utan{opacity:.72}',
    '.yrm-sh{display:flex;align-items:center;gap:8px;padding:6px 4px;font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#dbe6f6;border-bottom:1px solid rgba(255,255,255,.14)}',
    '.yrm-sh b{margin-left:auto;font-size:13px;letter-spacing:0;text-transform:none;color:#fff;font-variant-numeric:tabular-nums}',
    '.yrm-sn{display:inline-grid;place-items:center;min-width:20px;height:19px;padding:0 6px;border-radius:999px;background:rgba(0,8,24,.55);font-size:11px;letter-spacing:0;color:#cdd9ec}',
    '.yrm-t{width:100%;border-collapse:collapse;font-size:13px}.yrm-t td{padding:7px 5px;border-bottom:1px solid rgba(255,255,255,.06);white-space:nowrap;vertical-align:top}',
    '.yrm-nr{color:#a9b8d0;font-size:12px}.yrm-ku{width:99%;white-space:normal!important;color:#eef3fb}',
    '.yrm-dg{text-align:right;color:#a9b8d0;font-size:12px}.yrm-sein{color:#ffaaa3}.yrm-kr{text-align:right;font-weight:600;color:#fff;font-variant-numeric:tabular-nums}',
    '.yrm-tomt{padding:28px 10px;text-align:center;color:#a9b8d0;font-size:13px}',
    '.yrm-foot{padding:10px 18px 12px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;color:#a9b8d0;line-height:1.5}',
    '.yrm-back .yr-led{--c:#22c55e;flex:none;display:inline-block;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 16%,var(--c) 52%,#000 130%);box-shadow:0 0 5px var(--c)}',
    '.yrm-back .yr-led-rd{--c:#f87171}.yrm-back .yr-led-bl{--c:#5b8ff0}.yrm-back .yr-led-gy{--c:#9fb0cc}',
    '@media (max-width:560px){.yrm-back{padding:0;align-items:flex-end}.yrm-box{max-height:92vh;border-radius:18px 18px 0 0}.yrm-t{font-size:12.5px}}',
  ].join('\n');
  function modalStill() {
    if (document.getElementById('yrm-stil')) return;
    const s = document.createElement('style');
    s.id = 'yrm-stil'; s.textContent = MODAL_CSS;
    document.head.appendChild(s);
  }
  function opnaKrofur(felag) {
    document.querySelectorAll('.yrm-back').forEach(n => n.remove());
    const D = S.d, x = D && D.krofur && (felag === 'bh' ? D.krofur.bh : D.krofur.sl);
    if (!ok(x)) return;
    modalStill();
    const heiti = felag === 'bh' ? 'Brunahólf' : 'Slökkvitæki';
    const hluti = (radir, nafn, lit, utan) => {
      if (!Array.isArray(radir)) return '<div class="yrm-sec"><div class="yrm-sh">' + led(lit) + esc(nafn) + '<b>listinn barst ekki — endurnýjaðu ↻</b></div></div>';
      if (!radir.length) return '';
      const sum = radir.reduce((a, r) => a + (r.kr || 0), 0);
      return '<div class="yrm-sec' + (utan ? ' yrm-utan' : '') + '"><div class="yrm-sh">' + led(lit) + esc(nafn) + '<span class="yrm-sn">' + radir.length + '</span><b>' + isk(sum) + ' kr</b></div>' +
        '<table class="yrm-t"><tbody>' + radir.map(r => '<tr><td class="yrm-nr">' + esc(r.nr || '—') + '</td><td class="yrm-ku">' + esc(r.kunni || '—') + '</td>' +
          '<td class="yrm-dg' + (r.dagar > 45 ? ' yrm-sein' : '') + '">' + (r.dagar != null ? esc(r.dagar) + ' d.' : '') + '</td><td class="yrm-kr">' + isk(r.kr) + '</td></tr>').join('') +
        '</tbody></table></div>';
    };
    const ogr = x.ogreitt.reikn, osn = x.osent.reikn, bid = x.a_bid && x.a_bid.reikn;
    const tomt = Array.isArray(ogr) && Array.isArray(osn) && !ogr.length && !osn.length;
    const back = document.createElement('div');
    back.className = 'yrm-back';
    back.innerHTML = '<div class="yrm-box" role="dialog" aria-modal="true" aria-label="' + esc('Kröfur ' + heiti) + '">' +
      '<div class="yrm-top"><div class="yrm-ti">' + esc(heiti) + '<span>Ógreitt og ósent · m. vsk · tölur frá kl. ' + esc(klukka(D.maelt_at)) + '</span></div>' +
        '<b class="yrm-tot">' + isk(x.osent.kr + x.ogreitt.kr) + ' kr</b><button type="button" class="yrm-x" aria-label="Loka">✕</button></div>' +
      '<div class="yrm-sum"><span>' + led('rd') + 'Ógreitt <b>' + isk(x.ogreitt.kr) + ' kr</b><span class="yrm-sn">' + isk(x.ogreitt.n) + '</span></span>' +
        '<span>' + led('bl') + 'Ósent <b>' + isk(x.osent.kr) + ' kr</b><span class="yrm-sn">' + isk(x.osent.n) + '</span></span></div>' +
      '<div class="yrm-scr">' + (tomt ? '<div class="yrm-tomt">Engar ógreiddar eða ósendar kröfur.</div>' : hluti(ogr, 'Ógreitt', 'rd') + hluti(osn, 'Ósent', 'bl')) +
        (Array.isArray(bid) && bid.length ? hluti(bid, 'Á bið — ekki í samtölunni', 'gy', true) : '') + '</div>' +
      '<div class="yrm-foot">Sömu raðir og röndin leggur saman — ' + (felag === 'bh'
        ? 'Kröfu yfirlit Brunahólfs (faldar og kláraðar kröfur ekki með; ósent = drög sem eru ekki send í bókun).'
        : 'kröfusýnir Slökkvitækja (ósent = krafa ekki send).') + ' Dagar = aldur kröfunnar; rautt = eldri en 45 daga.</div>' +
    '</div>';
    const lyk = e => { if (e.key === 'Escape') loka(); };
    const loka = () => { back.remove(); document.removeEventListener('keydown', lyk); };
    back.addEventListener('click', e => { if (e.target === back || (e.target.closest && e.target.closest('.yrm-x'))) loka(); });
    document.addEventListener('keydown', lyk);
    document.body.appendChild(back);
    try { back.querySelector('.yrm-x').focus(); } catch (_) {}
  }

  function smellur(el) {
    const a = el && el.dataset && el.dataset.t5;
    if (a === 'yr-ham') { vmSetja(HAM_LYKILL, el.dataset.v === 'lina' ? 'lina' : 'rond'); notify(); return true; }
    if (a === 'yr-fara') { try { location.hash = '#' + (el.dataset.to || ''); } catch (_) {} return true; }
    if (a === 'yr-refresh') { allsherjar(); return true; }
    if (a === 'yr-krofur') { opnaKrofur(el.dataset.felag === 'bh' ? 'bh' : 'sl'); return true; }
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
      // röð frá 25.11: Ársþjónusta · Á leiðinni inn · Unnið · Virði · Greitt inn · Ósótt/tæki
      '.yr-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1.6fr) minmax(0,1.35fr) minmax(0,1fr) minmax(0,1.2fr) minmax(0,1.05fr);gap:10px;padding:0 14px 12px}',
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
      // samtals (kom í stað „Vikan“ 22.11): tveir brunnar, einn fyrir hvort félag; smellur opnar Tekjuliði
      '.yr-vk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.yr-vk1{grid-template-columns:minmax(0,1fr)}',
      '.yr-samlnk{display:flex;flex-direction:column;gap:7px;min-width:0;color:inherit;text-decoration:none!important;border-radius:12px;cursor:pointer}.yr-samlnk:hover .yr-well{box-shadow:inset 0 1px 3px rgba(0,0,0,.7),0 0 0 1px rgba(255,176,102,.45)}',
      '.yr-samlnk:focus-visible,.yr-fm:focus-visible{outline:2px solid #ffb066;outline-offset:2px}',
      '.yr-fm{align-self:flex-end;border-radius:6px;color:#ffb37a;font:600 11px Poppins,system-ui,sans-serif;text-decoration:none!important;white-space:nowrap}.yr-fm:hover{color:#ffd0a6}',
      '.yr-n b{font-weight:600;color:#fff}',
      '.yr-v .yr-e{font-size:11px;font-weight:500;color:#b8c6dd;margin-left:-2px}.yr-n .yr-e{font-size:10.5px;font-weight:500;color:#a9b8d0}',
      '.yr-well{display:flex;flex-direction:column;gap:4px;min-width:0;padding:7px 9px 6px}',
      '.yr-v{display:flex;align-items:baseline;gap:5px;font-size:16px;font-weight:600;line-height:1.1;white-space:nowrap}.yr-v small{font-size:11px;font-weight:500;color:#b8c6dd;margin-left:-2px}.yr-v s{text-decoration:none;font-size:11px;font-weight:600}',
      '.yr-h2{color:#b8c6dd;font-weight:500}',
      '.yr-up{color:#4ade80;text-shadow:0 0 8px rgba(74,222,128,.55)}.yr-dn{color:#ff8f86;text-shadow:0 0 8px rgba(248,113,113,.55)}',
      '.yr-n{font-size:11px;color:#a9b8d0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.yr-db{position:relative;height:5px;border-radius:999px;background:rgba(0,0,0,.5);box-shadow:inset 0 1px 2px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.07)}',
      '.yr-db i{position:absolute;left:0;top:0;bottom:0;border-radius:999px}',
      '.yr-db b{position:absolute;top:-1px;width:7px;height:7px;margin-left:-3.5px;border-radius:1px;background:linear-gradient(135deg,#fff,#b9c6dc);transform:rotate(45deg);box-shadow:0 0 0 1.5px #08234a,0 0 6px rgba(255,255,255,.6)}',
      '.yr-u{background:linear-gradient(90deg,#166534,#4ade80);box-shadow:0 0 8px rgba(74,222,128,.7)}.yr-d{background:linear-gradient(90deg,#991b1b,#f87171);box-shadow:0 0 8px rgba(248,113,113,.7)}',
      '.yr-h{background:linear-gradient(90deg,#3b5379,#a9bbd8);box-shadow:0 0 6px rgba(169,187,216,.5)}',
      // neðsta röðin
      '.yr-foot{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:0 14px 14px}',
      '.yr-fl{display:flex;align-items:center;gap:10px;min-width:0;height:44px;padding:0 8px 0 14px;border-radius:13px;background:rgba(0,6,18,.55);border:1px solid rgba(160,190,235,.16);box-shadow:inset 0 2px 5px rgba(0,0,0,.7)}',
      '.yr-fk{flex:none;overflow:visible}',
      '.yr-cnt{display:inline-grid;place-items:center;min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:radial-gradient(circle at 35% 25%,#fecaca,#ef4444 45%,#b91c1c);color:#fff;font-size:12px;font-weight:700;letter-spacing:0;box-shadow:0 0 0 2px rgba(220,38,38,.25),0 0 14px rgba(239,68,68,.9)}',
      '.yr-rail{display:flex;gap:7px;min-width:0;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}',
      '.yr-ach,.yr-pi{flex:none;display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,8,24,.3));border:1px solid rgba(160,190,235,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.12);font-size:12.5px;color:#dfe6f2;white-space:nowrap}',
      '.yr-ach b,.yr-pi b{font-weight:600;color:#fff}.yr-pi u{text-decoration:none;font-size:11px;font-weight:600;color:#a9b8d0}',
      // ↻ allsherjar endurnýjun (25.11)
      '.yr-rf{flex:none;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border-radius:11px;border:1px solid rgba(160,190,235,.3);background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(0,8,24,.4));color:#dbe6f6;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 3px 6px -2px rgba(0,0,0,.6)}',
      '.yr-line .yr-rf{width:32px;height:32px;border-radius:10px}',
      '.yr-rf:hover{color:#fff;border-color:rgba(190,210,245,.55)}.yr-rf:focus-visible{outline:2px solid #ffb066;outline-offset:2px}.yr-rf .yr-ic{width:17px;height:17px;stroke-width:2}',
      '.yr-rf-spin{cursor:progress}.yr-rf-spin .yr-ic{animation:yr-snu .9s linear infinite}@keyframes yr-snu{to{transform:rotate(360deg)}}',
      // BH/SL hlutfallslína á „Á leiðinni inn" (25.11)
      '.yr-cbar{display:flex;gap:4px;min-width:0}',
      '.yr-cseg{flex:1 1 0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;min-width:66px;height:38px;padding:0 10px;border:0;border-radius:10px;color:#fff;text-align:left;font-family:inherit;cursor:pointer;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(0,0,0,.3),0 4px 9px -4px rgba(0,0,0,.8)}',
      '.yr-cseg span{font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.9);white-space:nowrap}',
      '.yr-cseg b{font-size:14.5px;font-weight:600;line-height:1.1;white-space:nowrap}.yr-cseg b small{margin-left:2px;font-size:10px;font-weight:500;color:rgba(255,255,255,.85)}',
      '.yr-cbh{background:linear-gradient(180deg,#6b9bf3,#2f6fe4 70%,#285fc4)}.yr-csl{background:linear-gradient(180deg,#ffa55c,#ec5f00 70%,#cf5200)}',
      '.yr-cbh:hover,.yr-csl:hover{filter:brightness(1.12)}.yr-cseg:focus-visible{outline:2px solid #fff;outline-offset:2px}',
      '.yr-cseg-om{cursor:default;background:rgba(0,8,22,.45)}',
      // tæki mánaðarins + þjappað ósótt/verkstæði (25.11)
      '.yr-vks{display:flex;align-items:center;gap:7px;min-width:0;font-size:12px;color:#c8d4e8;white-space:nowrap}.yr-vks .yr-ic{color:#ff8a1f}',
      '.yr-vks b{margin-left:auto;font-size:16px;font-weight:600;color:#fff}.yr-vks i{font-style:normal;font-size:11.5px;color:#a9b8d0}',
      '.yr-tg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}',
      '.yr-tc{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0;padding:5px 2px 4px;border-radius:9px;background:rgba(0,8,22,.45);box-shadow:inset 0 1px 3px rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.08)}',
      '.yr-tc b{font-size:16px;font-weight:600;line-height:1.1;color:#fff}.yr-tc i{max-width:100%;font-style:normal;font-size:10.5px;color:#a9b8d0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.yr-tn{display:flex;align-items:center;gap:6px}.yr-tn .yr-led{width:6px;height:6px}',
      // mjórri gluggi: þrír dálkar; sími: flísarnar strjúkast til hliðar, flögurnar fara
      '@container yr (max-width: 1150px){.yr-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.yr-chips{display:none}}',
      '@container yr (max-width: 760px){.yr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.yr-k{min-width:0}' +
        '.yr-foot{grid-template-columns:minmax(0,1fr)}.yr-fl+.yr-fl{display:none}.yr-top,.yr-line{flex-wrap:wrap;gap:10px}.yr-act{margin-left:0}.yr-mark{font-size:16px}.yr-kn{font-size:26px}}',
    ].join('\n');
  }

  window.YfirsynRond = { html, css, smellur, geymaArs, load, allsherjar, opnaKrofur, S, version: '2026-11-25' };
})();
