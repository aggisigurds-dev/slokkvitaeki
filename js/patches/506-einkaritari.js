/* === EINKARITARINN (506) — 16.11.2026 ============================================================
 *
 * Agnar 15.11.2026: „eins og þú værir einkaritarinn minn" — samantekt vikunnar, forgangsröðun
 * dagsins og staða samninga, beint undir Vinnusamantekt á Þjónustuborðinu.
 *
 * HVAÐ ÞETTA ER: einn gluggi á borði Agnars, í Brunastál C útliti:
 *   · fyrirsögn dagsins;
 *   · Í dag — mikilvægast: 3–5 atriði með „af hverju" og hlekk;
 *   · Vikan í tölum (greitt, sendar, nýir — tölur úr GÖGNUNUM, aldrei úr texta Claude);
 *   · Samningar — Heimaleiga og Center Hotels (staða, opin mál, næsta skref);
 *   · Topp vikunnar — mest 10 atriði;
 *   · Áminningar — eindagar, forgangsmál, skoðanir á fresti, dagskrá.
 *
 * HVAÐAN: Claude skrifar þetta kl. 06:45 á hverjum morgni (einkaritari-background.cjs). Glugginn
 * LES /api/einkaritari og ↻ biður um ný skrif. Tölurnar í „Vikan í tölum" eru ALDREI skrifaðar
 * af Claude — þær koma beint úr rec.tolur sem kóðinn safnaði.
 *
 * STÖÐUGT VIÐMÓT: sama hönnun og 506-radgjafinn.js — ekkert localStorage (viðkvæm gögn),
 * glugginn mælir eigin hæð og leiðréttir skrun þegar svarið berst.
 * ============================================================================================== */
(() => {
  if (window.Einkaritari) return;

  const EIGANDI = 'Agnar';
  const LES = '/api/einkaritari';
  const SKRIFA = '/.netlify/functions/einkaritari-background';
  const FELLT_LYKILL = 'einkaritari_fellt';
  const ENDURLES_MS = 5 * 60 * 1000, KONNUN_MS = 8000, KONNUN_MAX_MS = 4 * 60 * 1000, BID_MIN = 5;

  const S = { gogn: null, at: 0, loading: false, villa: null, skrifar: null, skrifVilla: null, skrifVillaFra: 0, fellt: null };

  const falin = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const notify = () => { try { if (window.Bord368 && Bord368.render) Bord368.render(); } catch (_) {} };
  const VIKA = ['sun.', 'mán.', 'þri.', 'mið.', 'fim.', 'fös.', 'lau.'];
  const MAN = ['jan.', 'feb.', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'sept.', 'okt.', 'nóv.', 'des.'];
  const dagsTxt = (s) => { const d = new Date(s); return VIKA[d.getDay()] + ' ' + d.getDate() + '. ' + MAN[d.getMonth()]; };
  const klst = (s) => { const d = new Date(s); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const fmtKr = (v) => (v == null || !Number.isFinite(Number(v)) ? 'ómælt' : Math.round(Number(v)).toLocaleString('is-IS') + ' kr');
  const undirskrift = () => JSON.stringify([!!S.at, S.villa, S.gogn && S.gogn.nyjast && S.gogn.nyjast.skrifad_at,
    S.gogn && S.gogn.sidasta_villa && S.gogn.sidasta_villa.kl]);

  const hysill = () => document.getElementById('view-bord');
  const ekRect = () => { const v = hysill(), s = v && v.shadowRoot && v.shadowRoot.querySelector('section.ek'); return s ? s.getBoundingClientRect() : null; };
  function teiknaStodugt() {
    const v = hysill(), fyrir = ekRect();
    const skrunar = v && v.scrollHeight > v.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(v).overflowY);
    const sk = skrunar ? v : (document.scrollingElement || document.documentElement);
    const efst = skrunar ? v.getBoundingClientRect().top : 0;
    const st0 = sk.scrollTop;
    notify();
    const eftir = ekRect();
    if (!fyrir || !eftir) return;
    const munur = eftir.height - fyrir.height;
    if (!munur || fyrir.top >= efst) return;
    const z = skrunar ? (parseFloat(getComputedStyle(v).zoom) || 1) : 1;
    const mark = st0 + munur / z;
    sk.scrollTop = mark;
    requestAnimationFrame(() => { sk.scrollTop = mark; });
  }

  async function load(force, teikna = true) {
    if (S.loading && !force) return;
    const adur = undirskrift();
    S.loading = true;
    try {
      const r = await fetch(LES, { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) throw new Error('innskráning vantar');
      if (r.status === 403) throw new Error('aðeins fyrir stjórnanda');
      if (!r.ok) throw new Error('svar ' + r.status);
      const g = await r.json();
      S.gogn = g; S.villa = null;
      if (S.skrifVilla && S.skrifVillaFra && g && g.nyjast && Date.parse(g.nyjast.skrifad_at) >= S.skrifVillaFra) { S.skrifVilla = null; S.skrifVillaFra = 0; }
    } catch (e) { S.villa = (e && e.name === 'TypeError') ? 'náði ekki sambandi við þjóninn' : ((e && e.message) || String(e)); }
    S.at = Date.now(); S.loading = false;
    if (teikna && undirskrift() !== adur) teiknaStodugt();
  }

  async function skrifaAftur() {
    if (S.skrifar) return;
    const fra = Date.now();
    S.skrifar = { fra, virkt: 0, tima: 0, kanna: null }; S.skrifVilla = null; S.skrifVillaFra = 0; notify();
    try {
      const r = await fetch(SKRIFA, { method: 'POST', credentials: 'same-origin' });
      if (r.status === 401) throw new Error('innskráning vantar');
      if (r.status === 403) throw new Error('aðeins fyrir stjórnanda');
      if (!r.ok && r.status !== 202) throw new Error('svar ' + r.status);
    } catch (e) { S.skrifar = null; S.skrifVilla = (e && e.message) || String(e); teiknaStodugt(); return; }
    const kanna = async () => {
      const sk = S.skrifar;
      if (!sk) return;
      if (falin()) return;
      sk.virkt += KONNUN_MS;
      await load(true, false);
      if (S.skrifar !== sk) return;
      const n = S.gogn && S.gogn.nyjast, v = S.gogn && S.gogn.sidasta_villa;
      let lok = null;
      if (n && Date.parse(n.skrifad_at) >= fra) lok = { villa: null };
      else if (v && Date.parse(v.kl) >= fra) lok = { villa: v.texti };
      else if (sk.virkt > KONNUN_MAX_MS) lok = { villa: 'skrifin tóku of langan tíma — reyndu aftur síðar' };
      if (lok) { S.skrifar = null; S.skrifVilla = lok.villa; S.skrifVillaFra = lok.villa ? fra : 0; teiknaStodugt(); return; }
      sk.tima = setTimeout(kanna, KONNUN_MS);
    };
    S.skrifar.kanna = kanna;
    S.skrifar.tima = setTimeout(kanna, KONNUN_MS);
  }

  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
    if (falin() || !S.at) return;
    const sk = S.skrifar;
    if (sk && sk.kanna) { clearTimeout(sk.tima); sk.kanna(); return; }
    if (S.villa || Date.now() - S.at > 60000) load(true);
  });

  /* ── CSS ────────────────────────────────────────────────────────────────────── */
  const CSS = '<style id="_ek506-css">' +
    '.ek{margin:0 0 14px;padding:0}' +
    '.ek-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:11px 14px;border-bottom:1px solid var(--rule)}' +
    '.ek-h h2{margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase}.ek-mute{color:var(--mute);font-size:12.5px}.ek-h .grow{flex:1 1 auto}' +
    '.ek-fyrir{margin:0;padding:14px 16px 12px;font-family:var(--serif,"Playfair Display",Georgia,serif);font-size:21px;line-height:1.3;font-weight:700;color:var(--ink);border-bottom:1px solid var(--rule2)}' +
    /* Í dag */
    '.ek-idag{padding:12px 16px 6px;border-bottom:1px solid var(--rule2)}.ek-idag>h3{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
    '.ek-rad{list-style:none;margin:0;padding:0;counter-reset:ek}.ek-rad>li{counter-increment:ek;display:grid;grid-template-columns:30px minmax(0,1fr);gap:2px 10px;padding:10px 0;border-top:1px dashed var(--rule2)}.ek-rad>li:first-child{border-top:0;padding-top:2px}' +
    '.ek-rad>li::before{content:counter(ek);grid-row:1/span 3;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--ink);border:1px solid var(--edge);background:var(--panel)}' +
    '.ek-t{font-size:14.5px;font-weight:700;color:var(--ink)}.ek-a{font-size:13px;color:var(--ink2);line-height:1.45}.ek-s{font-size:12.5px;color:var(--mute)}' +
    '.ek-s a{color:var(--link,#1565c0);text-decoration:none}.ek-s a:hover{text-decoration:underline}' +
    /* Vikan í tölum */
    '.ek-tolur{display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px;border-bottom:1px solid var(--rule2)}' +
    '.ek-tolur>div{flex:1 1 140px;min-width:0;padding:6px 10px;border:1px solid var(--rule2);border-radius:4px}' +
    '.ek-tolur b{display:block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:700}' +
    '.ek-tolur span{display:block;font-size:17px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}.ek-tolur small{display:block;font-size:11.5px;color:var(--mute);overflow-wrap:anywhere}' +
    /* Samningar */
    '.ek-samn{padding:12px 16px 14px;border-bottom:1px solid var(--rule2)}.ek-samn>h3{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
    '.ek-hop+.ek-hop{margin-top:12px;padding-top:10px;border-top:1px solid var(--rule2)}.ek-hop h4{margin:0 0 3px;font-size:13px;font-weight:700;color:var(--ink);overflow-wrap:anywhere}' +
    '.ek-stada{margin:0 0 4px;font-size:12.5px;color:var(--ink2);font-style:italic;overflow-wrap:anywhere}.ek-opin{margin:0 0 4px;font-size:12.5px;color:var(--ink);overflow-wrap:anywhere}.ek-opin em{color:var(--mute);font-style:normal;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-right:4px}' +
    '.ek-skref{margin:0;font-size:12.5px;color:var(--ink);overflow-wrap:anywhere}.ek-skref em{color:var(--mute);font-style:normal;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-right:4px}' +
    /* Topp vikunnar */
    '.ek-topp{padding:12px 16px 6px;border-bottom:1px solid var(--rule2)}.ek-topp>h3{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
    '.ek-topp .ek-rad{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:22px}.ek-topp .ek-rad>li:nth-child(2){border-top:0;padding-top:2px}' +
    '.ek-hm{display:inline-block;font-size:10.5px;line-height:1.6;padding:0 6px;border:1px solid var(--rule2);border-radius:3px;color:var(--mute);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;margin-top:3px}' +
    /* Áminningar */
    '.ek-am{padding:12px 16px 14px;border-bottom:1px solid var(--rule2)}.ek-am>h3{margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
    '.ek-am-texti{font-size:13px;color:var(--ink);line-height:1.5;margin:0 0 8px;overflow-wrap:anywhere}' +
    '.ek-am-listi{list-style:none;margin:0;padding:0}.ek-am-listi>li{padding:4px 0;font-size:12.5px;color:var(--ink);border-top:1px dashed var(--rule2);overflow-wrap:anywhere}.ek-am-listi>li:first-child{border-top:0}' +
    '.ek-am-listi em{font-style:normal;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin-right:4px}' +
    /* Takkar á atriðum (16.11.2026) */
    '.ek-tk{margin-top:6px}.ek-h a.btn{text-decoration:none}' +
    '.ek-lk{appearance:none;background:none;border:0;padding:0;margin:0;font:inherit;color:var(--link,#1565c0);cursor:pointer;text-align:left}.ek-lk:hover{text-decoration:underline}' +
    /* Fótur + responsive */
    '.ek-ft{padding:8px 16px 11px;border-top:1px solid var(--rule2);font-size:11.5px;color:var(--mute)}.ek-ft .err{color:#b3220f}.ek-tomt{padding:16px;color:var(--mute);font-size:13px;min-height:220px}' +
    '.ek-bid{min-height:300px}' +
    '@container t5 (max-width:760px){.ek-h .btn{min-height:44px;min-width:44px}.ek-fyrir{font-size:18px}' +
      '.ek-topp .ek-rad{grid-template-columns:minmax(0,1fr)}.ek-topp .ek-rad>li:nth-child(2){border-top:1px dashed var(--rule2);padding-top:10px}}' +
    '@media (pointer:coarse){.ek-h .btn{min-height:44px;min-width:44px}}' +
    '</style>';

  /* ── Tölur úr gögnunum (ALDREI úr texta Claude) ────────────────────────── */
  // 16.11.2026: fyrsta útgáfan las lyklana SL/BH/fyrri.samtals sem bakendinn skilar ekki (hann skilar slokkvitaeki /
  // brunaholf / samtals) → „SL ómælt · BH ómælt" þótt talan væri mæld. Hluti sem er null (söfnunin brást) er „ómælt",
  // aldrei 0.
  function toluHtml(tolur) {
    if (!tolur) return '';
    const g = tolur.greitt, s = tolur.sendar, ny = tolur.nyir_i_thjonustu;
    const hl = (o, k) => (o && o[k]) || null;
    const samG = hl(g, 'samtals'), slG = hl(g, 'slokkvitaeki'), bhG = hl(g, 'brunaholf');
    const slS = hl(s, 'slokkvitaeki'), bhS = hl(s, 'brunaholf');
    const samS = hl(s, 'samtals') || (slS && bhS ? { fjoldi: (slS.fjoldi || 0) + (bhS.fjoldi || 0), kr: (slS.kr || 0) + (bhS.kr || 0) } : null);
    const krT = (o) => fmtKr(o ? o.kr : null);
    const fjT = (o) => (o ? (o.fjoldi || 0) + ' kröfur' : '');
    const breyting = (o) => {
      if (!o || !Number.isFinite(Number(o.kr)) || !Number.isFinite(Number(o.fyrri_kr))) return '';
      const m = Number(o.kr) - Number(o.fyrri_kr);
      return m === 0 ? ' · eins og vikuna á undan' : ' · ' + (m > 0 ? '+' : '−') + Math.abs(Math.round(m)).toLocaleString('is-IS') + ' kr frá fyrri viku';
    };
    return '<div class="ek-tolur" role="group" aria-label="Vikan í tölum">' +
      '<div><b>Greitt · 7 dagar</b><span>' + esc(krT(samG)) + '</span><small>' +
        esc(fjT(samG) + breyting(samG)) +
        '<br>Slökkvitæki ' + esc(krT(slG)) + ' · Brunahólf ' + esc(krT(bhG)) + '</small></div>' +
      '<div><b>Kröfur sendar · 7 dagar</b><span>' + esc(krT(samS)) + '</span><small>' +
        esc(fjT(samS)) +
        '<br>Slökkvitæki ' + esc(krT(slS)) + ' · Brunahólf ' + esc(krT(bhS)) + '</small></div>' +
      '<div><b>Nýir í þjónustu · 7 dagar</b><span>' + esc(ny ? ny.length : 'ómælt') + '</span><small>' +
        esc(ny ? (ny.length ? ny.map((x) => x.nafn).join(', ') : 'enginn í vikunni') : '') + '</small></div>' +
    '</div>';
  }

  /* ── Takki á atriði: opnar staðinn þar sem hægt er að GERA eitthvað (16.11.2026) ─────────── */
  // Agnar: „ég get heldur ekki ýtt eða gert neitt þarna". Bakendinn sannreynir adgerd + audkenni (stadfesta), svo
  // takkinn vísar alltaf á verk/mál sem er til. Eldri skrif (með „hlekkur") fá engan takka.
  function takkiHtml(r) {
    const id = Number(r && r.audkenni) || 0;
    if (r.adgerd === 'afgreidsla' && id) return '<a class="btn iv sm" href="/afgreidsla.html?v=' + id + '" title="Forunnið verk — þar framkvæmir takkinn">Afgreiða ›</a>';
    if (r.adgerd === 'adalmal') return '<button type="button" class="btn iv sm" data-t5="ek-syn" data-v="adalmal" title="Topp 10 listinn">Opna Aðalmál ›</button>';
    if (r.adgerd === 'mal' && id) return '<button type="button" class="btn iv sm" data-t5="ek-mal" data-id="' + id + '" title="Opna málið á borðinu">Opna málið ›</button>';
    return '';
  }

  /* ── Samningar ─────────────────────────────────────────────────────────── */
  function samningarHtml(samn) {
    if (!samn) return '';
    const hop = (nafn, h) => {
      if (!h) return '';
      return '<div class="ek-hop"><h4>' + esc(nafn) + '</h4>' +
        (h.stada ? '<p class="ek-stada">' + esc(h.stada) + '</p>' : '') +
        (h.opin_mal ? '<p class="ek-opin"><em>Opin mál</em>' + esc(h.opin_mal) + '</p>' : '') +
        (h.naesta_skref ? '<p class="ek-skref"><em>Næsta skref</em>' + esc(h.naesta_skref) + '</p>' : '') +
      '</div>';
    };
    return '<section class="ek-samn" aria-label="Samningar"><h3>Samningar</h3>' +
      hop('Heimaleiga', samn.heimaleiga) + hop('Center Hotels', samn.center) + '</section>';
  }

  /* ── Topp vikunnar ─────────────────────────────────────────────────────── */
  function toppHtml(topp) {
    if (!topp || !topp.length) return '';
    const li = topp.map((x) => '<li><div class="ek-t">' + esc(x.texti) + '</div>' +
      (x.heimild ? '<span class="ek-hm">' + esc(x.heimild) + '</span>' : '') + '</li>').join('');
    return '<section class="ek-topp" aria-label="Topp vikunnar"><h3>Topp vikunnar</h3>' +
      '<ol class="ek-rad">' + li + '</ol></section>';
  }

  /* ── Áminningar ─────────────────────────────────────────────────────────── */
  // 16.11.2026: dagskra kom sem HLUTUR úr combo-yfirliti og hefði fellt gluggann (for…of á hlut) um leið og áminningarnar
  // mældust — bakendinn skilar nú lista og hér er hver reitur varinn með listi(). Forgangsmál opnast á borðinu.
  function aminningarHtml(texti, aminningar) {
    const listi = (a) => (Array.isArray(a) ? a : []);
    const am = aminningar || {};
    const li = [];
    for (const x of listi(am.eindagar)) {
      const dags = x.eindagi || x.gjalddagi || '';
      const yfir = Number(x.dagar_fram_yfir);
      li.push('<li><em>Eindagi</em>' + esc(x.nafn + ' — ' + fmtKr(x.kr) + (dags ? ' — eindagi ' + dags : '') +
        (Number.isFinite(yfir) ? (yfir > 0 ? ' · ' + yfir + ' d. fram yfir' : ' · í dag eða framundan') : '')) + '</li>');
    }
    const eldri = am.eindagar_eldri_en_60d;
    if (eldri && eldri.fjoldi) li.push('<li><em>Eldra</em>' + esc(eldri.fjoldi + ' reikningar með eindaga fyrir meira en 60 dögum · ' + fmtKr(eldri.kr) + ' (gömul mál, ekki áminning dagsins)') + '</li>');
    for (const x of listi(am.forgangsmal)) {
      li.push('<li><em>Forgangsmál</em>' + (x.mal_id
        ? '<button type="button" class="ek-lk" data-t5="ek-mal" data-id="' + Number(x.mal_id) + '" title="Opna málið á borðinu">' + esc(x.titill) + ' ›</button>'
        : esc(x.titill)) + '</li>');
    }
    const ut = am.uttektir;
    if (ut && (ut.utrunnid || ut.thessi_manudur)) li.push('<li><em>Úttektir</em>' + esc((ut.utrunnid || 0) + ' útrunnar · ' + (ut.thessi_manudur || 0) + ' í þessum mánuði') + '</li>');
    for (const x of listi(am.dagskra)) li.push('<li><em>Dagskrá</em>' + esc((x.dags ? x.dags + ' · ' : '') + (x.hver ? x.hver + ': ' : '') + (x.titill || '')) + '</li>');
    if (!texti && !li.length) return '';
    return '<section class="ek-am" aria-label="Áminningar"><h3>Áminningar</h3>' +
      (texti ? '<p class="ek-am-texti">' + esc(texti) + '</p>' : '') +
      (li.length ? '<ul class="ek-am-listi">' + li.join('') + '</ul>' : '') + '</section>';
  }

  /* ── Aðalfall: html(nafn) ─────────────────────────────────────────────── */
  function html(nafn) {
    if (nafn !== EIGANDI) return '';
    if (S.fellt == null) { try { S.fellt = !!(window.Vidmot && Vidmot.lesaTaeki && Vidmot.lesaTaeki(FELLT_LYKILL, false)); } catch (_) { S.fellt = false; } }
    if (!S.at || Date.now() - S.at > ENDURLES_MS) load();
    const g = S.gogn, n = g && g.nyjast;
    const nyleg = (t) => !!t && (Date.now() - Date.parse(t)) < BID_MIN * 60000;
    const nyskrifad = nyleg(n && n.skrifad_at) || nyleg(g && g.sidasta_villa && g.sidasta_villa.kl);
    const stada = S.skrifar ? 'skrifar… (1–2 mín.)' : n ? dagsTxt(n.skrifad_at) + ' · skrifað kl. ' + klst(n.skrifad_at) : S.loading ? 'sæki…' : '';
    // 16.11.2026: takkar á staðina þar sem verkin eru UNNIN — Afgreiðsla (forunnin verk, takkinn framkvæmir) og Aðalmál (topp 10).
    const afgFj = n && n.afgreidsla_fjoldi != null ? ' · ' + Number(n.afgreidsla_fjoldi) : '';
    const haus = '<header class="ek-h"><h2>Einkaritarinn</h2><span class="ek-mute" role="status">' + esc(stada) + '</span><span class="grow"></span>' +
      '<a class="btn iv sm" href="/afgreidsla.html" title="Forunnin verk sem bíða þín — þar framkvæmir takkinn">Afgreiðsla' + esc(afgFj) + ' ›</a>' +
      '<button type="button" class="btn iv sm" data-t5="ek-syn" data-v="adalmal" title="Topp 10 listinn — sannreyndur">Aðalmál ›</button>' +
      '<button type="button" class="btn iv sm" data-t5="ek-skrifa"' + (S.skrifar || nyskrifad ? ' disabled' : '') +
        ' title="' + (nyskrifad ? 'Nýskrifað eða nýreynt — hægt að skrifa aftur eftir nokkrar mínútur' : 'Láta skrifa upp á nýtt (1–2 mín.)') + '">↻ Skrifa aftur</button>' +
      '<button type="button" class="btn iv sm tog" data-t5="ek-fella" aria-expanded="' + !S.fellt + '" aria-label="' + (S.fellt ? 'Opna' : 'Fella saman') + ' einkaritarann">' + (S.fellt ? '▾' : '▴') + '</button></header>';
    if (S.fellt) return CSS + '<section class="panel ek" tabindex="-1" aria-label="Einkaritarinn">' + haus + '</section>';

    if (!n) {
      const txt = S.villa ? 'Náði ekki í einkaritarann: ' + S.villa
        : S.loading || !S.at ? 'Sæki einkaritarann…'
        : 'Einkaritarinn hefur ekki skrifað enn. Fyrsta yfirlitið kemur kl. 06:45 — eða ýttu á ↻ Skrifa aftur.';
      return CSS + '<section class="panel ek ek-bid" tabindex="-1" aria-label="Einkaritarinn">' + haus + '<p class="ek-tomt">' + esc(txt) + '</p>' + villuLina(g) + '</section>';
    }

    // Eldri skrif báru „hlekkur" (texti eins og „samningar › heimaleiga", ekki slóð) sem var teiknaður sem dauður tengill.
    const idag = (n.i_dag || []).map((r) => {
      const t = takkiHtml(r);
      return '<li><div class="ek-t">' + esc(r.titill) + '</div><div class="ek-a">' + esc(r.af_hverju) + '</div>' +
        (t ? '<div class="ek-s ek-tk">' + t + '</div>' : '') + '</li>';
    }).join('');

    const ft = '<div class="ek-ft">Skrifað af Claude út frá kröfum, Þjónustuborði, Afgreiðslu og dagskrá' +
      (n.kallad_af === 'agnar' ? ' · skrifað aftur að beiðni' : '') + '.' +
      ((n.omaelt && n.omaelt.length) ? '<br><span class="err">Ekki mælt: ' + esc(n.omaelt.map((o) => o.hluti).join(', ')) + '</span>' : '') +
      '</div>' + villuLina(g);

    return CSS + '<section class="panel ek" tabindex="-1" aria-label="Einkaritarinn">' + haus +
      (n.fyrirsogn ? '<p class="ek-fyrir">' + esc(n.fyrirsogn) + '</p>' : '') +
      '<section class="ek-idag" aria-label="Í dag"><h3>Í dag — mikilvægast</h3>' +
        (idag ? '<ol class="ek-rad">' + idag + '</ol>' : '<p class="ek-mute">Engin forgangsatriði í dag.</p>') + '</section>' +
      toluHtml(n.tolur) +
      samningarHtml(n.samningar) +
      toppHtml(n.topp_vikunnar) +
      aminningarHtml(n.aminningar_texti, n.aminningar) +
      ft + '</section>';
  }

  function villuLina(g) {
    const v = S.skrifVilla || (g && g.sidasta_villa && (!g.nyjast || Date.parse(g.sidasta_villa.kl) > Date.parse(g.nyjast.skrifad_at)) ? g.sidasta_villa.texti : null);
    return v ? '<div class="ek-ft"><span class="err">Síðustu skrif tókust ekki: ' + esc(v) + '</span></div>' : '';
  }

  function fokusAftur(t5) {
    try {
      const v = hysill(), rot = v && v.shadowRoot; if (!rot) return;
      const b = rot.querySelector('[data-t5="' + t5 + '"]:not([disabled])') || rot.querySelector('section.ek');
      if (b) b.focus({ preventScroll: true });
    } catch (_) {}
  }
  function smellur(el) {
    const a = el && el.dataset && el.dataset.t5;
    if (!a || a.indexOf('ek-') !== 0) return false;
    if (a === 'ek-skrifa') { skrifaAftur(); fokusAftur('ek-skrifa'); return true; }
    if (a === 'ek-fella') { S.fellt = !S.fellt; try { if (window.Vidmot && Vidmot.setjaTaeki) Vidmot.setjaTaeki(FELLT_LYKILL, S.fellt); } catch (_) {} notify(); fokusAftur('ek-fella'); return true; }
    // 16.11.2026: mál opnast á borðinu (368 opnaMal velur það í Master) og skrunað er að því; sýn opnast með App.switchView.
    if (a === 'ek-mal') {
      const id = Number(el.dataset.id);
      try {
        if (id && window.Bord368 && Bord368.opnaMal) {
          Bord368.opnaMal(id);
          requestAnimationFrame(() => { try { const rot = Bord368.root && Bord368.root(); const s = rot && (rot.querySelector('.sel:not(.inline)') || rot.querySelector('.sel')); if (s) s.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) {} });
        }
      } catch (_) {}
      return true;
    }
    if (a === 'ek-syn') { try { if (window.App && App.switchView) App.switchView(el.dataset.v); } catch (_) {} return true; }
    return false;
  }

  window.Einkaritari = { html, load, smellur, takkiHtml, toluHtml, aminningarHtml, S, EIGANDI, version: '2026-11-16b' };
})();
