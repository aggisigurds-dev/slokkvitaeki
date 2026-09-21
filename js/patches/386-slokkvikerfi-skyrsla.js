/* === SLÖKKVIKERFIS SKOÐUN — skýrslublaðið sem 🍳-flipi á fyrirtækjaprófílnum (2026-09-21) ===
 *
 * Ósk Agnars: prófíllinn efst eins og í Ársskoðun, og skýrslan „þar sem slökkvitækjayfirlitið er".
 * Bannerinn, myndin, nótan, aðgerðastikan og Samskipti-kortið eru prófílsins sjálfs (features.js
 * Companies.openDetail + 223/363/111 …) og eru EKKI afrituð. Þessi pappi bætir við:
 *
 *   1. Þjónustuflipum undir Samskiptum: 🧯 Slökkvitæki · 🍳 Slökkvikerfi — aðeins á fyrirtækjum sem
 *      eiga röð í `slokkvikerfi`. Flipinn skiptir AÐEINS um neðri helminginn: „Úttekt búin"-takkinn og
 *      `.uttekt-cols` (tækjalistinn) víkja fyrir blaðinu. Ekkert er fjarlægt úr DOM-inu, aðeins falið.
 *   2. Blaðinu: vinnuformið ER skýrslan (sama blað á skjá og á prenti), 1:1 við eyðublaðið
 *      slokkvikerfis-uttekt-tomt-eyoublad.pdf. Reitirnir eru óháðir eins og á pappírnum:
 *      Í lagi = fjöldi eða x · Ekki í lagi = fjöldi eða x · Sjá ath. = númer athugasemdar.
 *      Línur mega standa auðar. „Ekki í lagi" kveikir á athugasemd; ekki hægt að ljúka án texta.
 *   3. Kostnaðarlínum (Skoðun · Akstur · Skýrslugerð · Vinna · Annar kostnaður) — fara á reikning,
 *      ekki á skýrsluna. Tómt verð = „verð vantar", aldrei gisk.
 *
 * Geymsla: `slokkvikerfi_skodanir` (ein röð per kerfi per ár; data/kostnadur jsonb). Röðin verður til
 * við FYRSTU breytingu, ekki við að opna flipann. Sjálfvistun með updated_at-verði: uppfærslan
 * krefst þess að updated_at sé það sem síðast var lesið — hafi önnur vél skrifað á milli skilar
 * þjónninn engri röð og blaðið segir frá því í stað þess að yfirskrifa (galli E2 í 273).
 * „✓ Vistað" birtist AÐEINS eftir að þjónninn hefur skilað röðinni (skill heidarlegt-vidmot).
 *
 * Ekki enn: PDF í 📁 Skjöl (skref „Skýrsla") og reikningsdrög (387). „Ljúka skoðun" setur skrefið
 * „Skoðað" og uppfærir búnaðargrunnlínu kerfisins; prentun fer um prentglugga vafrans.
 *
 * Public: window.SlokkvikerfiSkyrsla = { mount, prenta }.
 */
(() => {
  if (window.__slokkvikerfiSkyrslaInstalled) return;
  window.__slokkvikerfiSkyrslaInstalled = true;

  const FELAG = 'Brunahólf slökkvitæki ehf';
  const FOTUR = FELAG + ' · Hlíðasmári 10, 201 Kópavogur · sími 547-0100';
  const LOGO = '/img/brunaholf-logo.png';
  const BUNADUR = ['Slökkvimiðill / fj. kerfa', 'Hylki', 'Þrýstiprófunartími hylkja', 'Hylkjaþrýstingur', 'Hæðarmæling', 'Dreifilögn', 'Dreifistútar', 'Tengigrein', 'Festingar', 'Þrýstislöngur', 'Stýrislöngur', 'Deililokar', 'Afhleypivír', 'Afhleypihylki', 'Stjórnstöð', 'Handboðar f. afhl.', 'Bræðivör f. afhl.'];
  const VOKTUN = ['Þjónustubók í vasa', 'Þjónustusamningur', 'Handvirk afhleyping — neyðar', 'Sjálfvirk afhleyping', 'Fjarvöktun (boð um bruna og bilun)'];
  const KOSTN = [['skodun', 'Skoðun slökkvikerfis', 'magn'], ['akstur', 'Akstur', 'km / ferð'], ['skyrsla', 'Skýrslugerð', 'magn'], ['vinna', 'Vinna', 'klst']];
  const LS_MADUR = 'slokkvikerfi_skodunarmadur';   // þægindi eins vafra: síðasta nafn skoðunarmanns

  const S = { fid: null, kerfi: [], k: null, rod: null, data: null, kost: null, flipi: 'ars', timer: null, saving: false, dirty: false, stoppad: false };

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[slokkvikerfi-skyrsla]', m); }
  function dm(iso) { if (!iso) return ''; const p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function isoUr(s) {
    const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(String(s).trim()); if (!m) return null;
    const d = +m[1], mo = +m[2], y = +m[3], t = new Date(y, mo - 1, d);
    if (t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d) return null;
    return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  function idag() { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function kr(n) { return Math.round(n).toLocaleString('is-IS') + ' kr'; }
  function arNu() { return new Date().getFullYear(); }
  function notandi() { try { return (window.CurrentUser && CurrentUser.name) || localStorage.getItem(LS_MADUR) || 'app'; } catch (_) { return 'app'; } }
  function lokad() { return !!(S.rod && S.rod.status === 'final'); }
  function $(sel) { const h = document.getElementById('_sks-host'); return h ? h.querySelector(sel) : null; }

  // ── gögn ────────────────────────────────────────────────────────────────────
  function tomtBlad(k, co) {
    let madur = ''; try { madur = localStorage.getItem(LS_MADUR) || ''; } catch (_) {}
    const grunn = Array.isArray(k.bunadur) ? k.bunadur : [];
    return {
      haus: { samn: k.samn_nr || '', vidsk: co.nafn || '', tengil: [co['tengiliður'] || co.tengilidur || '', co.netfang || ''].filter(Boolean).join(' · '),
        heim: co.heimilisfang || '', postnr: co.postnumer || '', simi: co.simi || co.farsimi || '', dags: idag(), dagsurb: '', madur: madur,
        thjon: k.thjonustuadili || FELAG, fjarg: k.fjargaesluadili || '', upps: k.uppsetningaradili || '', stadur: 'Kópavogur' },
      // Tegund + stk. erfast úr grunnlínu kerfisins (síðasta skýrsla); niðurstöðurnar ekki.
      bun: BUNADUR.map((_, i) => ({ teg: (grunn[i] && grunn[i].teg) || '', stk: (grunn[i] && grunn[i].stk) || '' })),
      auk: [{}, {}], vok: VOKTUN.map(() => ({})), eld: [{}, {}, {}, {}], annad: ''
    };
  }
  function radir(d) {
    const ut = [];
    d.bun.forEach((r, i) => ut.push({ hop: 'bun', i, r, heiti: BUNADUR[i] }));
    d.auk.forEach((r, i) => ut.push({ hop: 'auk', i, r, heiti: r.heiti || '' }));
    d.vok.forEach((r, i) => ut.push({ hop: 'vok', i, r, heiti: VOKTUN[i] }));
    d.eld.forEach((r, i) => ut.push({ hop: 'eld', i, r, heiti: r.heiti || '' }));
    return ut;
  }
  function athNr(d) { let n = 0; const m = {}; radir(d).forEach(x => { if (x.r.ath) m[x.hop + ':' + x.i] = ++n; }); return m; }
  // Verðútreikningur að fyrirmynd Ársskoðunar (129): línur = fjöldi × per stk × (1 − afsl.%), svo
  // Skýrslugerð og Akstur, heildarafsláttur %, VSK 24%. Tómt verð telst EKKI sem 0 kr heldur „vantar".
  const VSK = 0.24;
  const LINUR = [['skodun', '🍳 Skoðun slökkvikerfis', 'stk'], ['vinna', '🛠 Vinna', 'klst']];
  // Íslenskt snið: „25.000“ = 25000 og „1,5“ = 1.5 — en „1.5“ klst má ekki verða 15. Punktur telst þúsundaskil AÐEINS
  // þegar nákvæmlega þrír tölustafir fylgja; annars er hann aukastafamerki.
  function tala(v) { const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function linuSumma(r, sjalfgMagn) { const v = tala(r && r.verd); if (!v) return null; const m = tala(r.magn) || sjalfgMagn; return m * v * (1 - Math.min(100, Math.max(0, tala(r.afsl))) / 100); }
  function reikna(ko) {
    ko = ko || {};
    const hlutar = [];
    LINUR.forEach(x => hlutar.push(linuSumma(ko[x[0]] || {}, 1)));
    (ko.annad || []).forEach(r => hlutar.push(linuSumma(r, 1)));
    hlutar.push(linuSumma(ko.skyrsla || {}, 1)); hlutar.push(linuSumma(ko.akstur || {}, 1));
    const med = hlutar.filter(x => x != null);
    if (!med.length) return null;
    const brutto = med.reduce((a, b) => a + b, 0), afslPct = Math.min(100, Math.max(0, tala(ko.afslattur)));
    const afsl = brutto * afslPct / 100, anVsk = brutto - afsl, vsk = anVsk * VSK;
    return { brutto, afsl, afslPct, anVsk, vsk, medVsk: anVsk + vsk };
  }
  function summa(ko) { const r = reikna(ko); return r ? r.anVsk : null; }

  async function saekjaKerfi(fid) {
    const sb = SB(); if (!sb) return [];
    const { data, error } = await sb.from('slokkvikerfi').select('*').eq('fyrirtaeki_id', fid).order('id');
    if (error) { console.warn('[slokkvikerfi-skyrsla] kerfi', error); return []; }
    return data || [];
  }
  async function saekjaSkodun(k) {
    const sb = SB(); if (!sb) return null;
    const { data, error } = await sb.from('slokkvikerfi_skodanir').select('*').eq('kerfi_id', k.id).eq('ar', arNu()).limit(1);
    if (error) { console.warn('[slokkvikerfi-skyrsla] skodun', error); return null; }
    return (data && data[0]) || null;
  }

  // ── vistun ──────────────────────────────────────────────────────────────────
  // Kostnaðarlínur má laga eftir að skoðun er lokið (verð liggur oft ekki fyrir á staðnum) — aðeins reikningur læsir þeim.
  function merkjaBreytt() {
    if (S.stoppad || (S.rod && (S.rod.reikningur_at || S.rod.sala_id))) return;
    S.dirty = true; stadaTexti('…', '');
    clearTimeout(S.timer); S.timer = setTimeout(vista, 1200);
  }
  function stadaTexti(t, cls, title) { const e = $('#_sks-saved'); if (e) { e.textContent = t; e.className = '_sks-saved ' + (cls || ''); e.title = title || ''; } }
  function dalkar() {
    const h = S.data.haus;
    return { data: S.data, kostnadur: S.kost, dags_skodunar: h.dags || null, dags_urbota: h.dagsurb || null, skodunarmadur: (h.madur || '').trim() || null, updated_by: notandi() };
  }
  async function vista() {
    if (S.saving) { S.dirty = true; return false; }
    const sb = SB(); if (!sb) { stadaTexti('⚠ Engin tenging — óvistað', 'villa'); return false; }
    S.saving = true; S.dirty = false;
    let ok = false, villa = '';
    try {
      if (!S.rod) {
        const ny = Object.assign({ kerfi_id: S.k.id, fyrirtaeki_id: S.fid, ar: arNu() }, dalkar());
        const { data, error } = await sb.from('slokkvikerfi_skodanir').insert(ny).select('*');
        if (error) {
          // unique(kerfi_id, ar): önnur vél stofnaði skoðunina á undan
          if (String(error.code) === '23505') { S.stoppad = true; villa = 'Önnur vél stofnaði skoðun ' + arNu() + ' á sama tíma — endurhlaða til að sjá hana'; }
          else villa = error.message || String(error);
        } else if (data && data[0]) { S.rod = data[0]; ok = true; }
        else villa = 'Þjónninn skilaði engri röð';
      } else {
        const { data, error } = await sb.from('slokkvikerfi_skodanir').update(dalkar()).eq('id', S.rod.id).eq('updated_at', S.rod.updated_at).select('id,updated_at,status');
        if (error) villa = error.message || String(error);
        else if (data && data[0]) { S.rod.updated_at = data[0].updated_at; ok = true; }
        else { S.stoppad = true; villa = 'Skoðuninni var breytt annars staðar á meðan — endurhlaða áður en haldið er áfram'; }
      }
    } catch (e) { villa = (e && e.message) || String(e); }
    S.saving = false;
    if (ok) stadaTexti('✓ Vistað ' + new Date().toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' }), 'ok');
    else { stadaTexti('⚠ Vistaðist ekki', 'villa', villa); toast('⚠ Skoðunin vistaðist ekki: ' + villa); if (S.stoppad) syna(); }
    if (ok && S.dirty) { clearTimeout(S.timer); S.timer = setTimeout(vista, 400); }
    return ok;
  }

  // ── blaðið ──────────────────────────────────────────────────────────────────
  function reitir(hop, i, r, meta, ro) {
    const d = ' data-hop="' + hop + '" data-i="' + i + '"' + (ro ? ' disabled' : '');
    return (meta ? '<td><input class="ci" data-f="teg"' + d + ' value="' + esc(r.teg || '') + '"></td><td><input class="ci c" inputmode="numeric" data-f="stk"' + d + ' value="' + esc(r.stk || '') + '"></td>' : '') +
      '<td><input class="ci c" data-f="il"' + d + ' value="' + esc(r.il || '') + '"></td>' +
      '<td><input class="ci c bad" data-f="ek"' + d + ' value="' + esc(r.ek || '') + '"></td>' +
      '<td><button type="button" class="ath' + (r.ath ? ' on' : '') + '" data-ath="1"' + d + '></button></td>';
  }
  function bladHtml() {
    const d = S.data, h = d.haus, ro = lokad();
    const dis = ro ? ' disabled' : '';
    const hi = (key, ph, dags) => dags
      ? '<input class="ci" inputmode="numeric" data-dagur="' + key + '" placeholder="dd/mm/áááá" value="' + esc(dm(h[key])) + '"' + dis + '>'
      : '<input class="ci" data-haus="' + key + '" placeholder="' + (ph || '') + '" value="' + esc(h[key] || '') + '"' + dis + '>';
    const hd = (l, key, dags) => '<tr><th class="l" style="width:48%">' + l + '</th><td>' + hi(key, '', dags) + '</td></tr>';
    const col6 = '<colgroup><col style="width:34%"><col style="width:24%"><col style="width:10%"><col style="width:10%"><col style="width:11%"><col style="width:11%"></colgroup>';
    const col4 = '<colgroup><col style="width:58%"><col style="width:14%"><col style="width:14%"><col style="width:14%"></colgroup>';
    return '<div class="sh-top"><div class="samn">Samn. nr' + hi('samn') + '</div><h3>Skoðunarskýrsla<br>slökkvikerfis</h3><div class="logo"><img src="' + LOGO + '" alt="Brunahólf — Slökkvitæki ehf." onerror="this.style.display=\'none\'"></div></div>' +
      '<div class="sh-head"><div class="cust"><label>Viðskiptavinur</label>' + hi('vidsk') + '<label>Tengiliður / netfang</label>' + hi('tengil') + '<label>Heimilisfang</label>' + hi('heim') + '<label>Póstnúmer og staður</label>' + hi('postnr') + '<label>Sími</label>' + hi('simi') + '</div>' +
      '<table>' + hd('Dags. skoðunar', 'dags', true) + hd('Dags. viðgerða / úrbóta', 'dagsurb', true) + hd('Nafn skoðunarmanns', 'madur') + hd('Nafn þjónustuaðila', 'thjon') + hd('Nafn fjargæsluaðila', 'fjarg') + hd('Nafn uppsetningaraðila', 'upps') + '</table></div>' +
      '<div class="sh-cols"><div><div class="grp">Prófanir</div><table>' + col6 + '<tr><th class="l">Búnaður</th><th>Tegund</th><th>Stk.</th><th>Í lagi</th><th>Ekki í lagi</th><th>Sjá ath.</th></tr>' +
        d.bun.map((r, i) => '<tr><td class="l">' + BUNADUR[i] + '</td>' + reitir('bun', i, r, true, ro) + '</tr>').join('') +
        d.auk.map((r, i) => '<tr><td><input class="ci b" placeholder="Annar búnaður" data-f="heiti" data-hop="auk" data-i="' + i + '" value="' + esc(r.heiti || '') + '"' + dis + '></td>' + reitir('auk', i, r, true, ro) + '</tr>').join('') +
        '</table>' + (ro ? '' : '<button type="button" class="addrow" data-baeta="auk">＋ Bæta við búnaðarlínu</button>') + '</div>' +
      '<div><div class="grp">Prófanir</div><table>' + col4 + '<tr><th class="l">Vöktun og fl.</th><th>Í lagi</th><th>Ekki í lagi</th><th>Sjá ath.</th></tr>' +
        d.vok.map((r, i) => '<tr><td class="l">' + VOKTUN[i] + '</td>' + reitir('vok', i, r, false, ro) + '</tr>').join('') + '</table>' +
        '<div class="grp">Uppsetning eldhústækja miðað við dreifistúta</div><table>' + col4 + '<tr><th class="l">Eldhústæki</th><th>Í lagi</th><th>Ekki í lagi</th><th>Sjá ath.</th></tr>' +
        d.eld.map((r, i) => '<tr><td><input class="ci b" placeholder="Heiti tækis" data-f="heiti" data-hop="eld" data-i="' + i + '" value="' + esc(r.heiti || '') + '"' + dis + '></td>' + reitir('eld', i, r, false, ro) + '</tr>').join('') +
        '</table>' + (ro ? '' : '<button type="button" class="addrow" data-baeta="eld">＋ Bæta við eldhústæki</button>') + '</div></div>' +
      '<div class="grp">Athugasemdir / úrbætur</div><div class="athbox"><b>Athugasemdir:</b><div id="_sks-ath"></div><b>Annað:</b> <input class="ci annad" id="_sks-annad" value="' + esc(d.annad || '') + '"' + dis + '></div>' +
      '<div class="disc">Afrit af skoðunarskýrslunni verður sent eldvarnareftirliti slökkviliðs ef kallað er eftir því.</div>' +
      '<div class="sig"><div>' + hi('stadur') + 'Staður</div><div><input class="ci" disabled id="_sks-sigdags" value="' + esc(dm(h.dags)) + '">Dagsetning</div><div><input class="ci" disabled id="_sks-sigmadur" value="' + esc(h.madur || '') + '">Nafn skoðunarmanns — starfsmannsnúmer<br><b>F.h. ' + esc(FELAG) + '</b></div></div>' +
      '<div class="ft">' + esc(FOTUR) + '</div>';
  }
  function uppfaeraAth() {
    const d = S.data, nr = athNr(d), ro = lokad();
    const host = document.getElementById('_sks-host'); if (!host) return;
    host.querySelectorAll('button.ath').forEach(b => { const n = nr[b.dataset.hop + ':' + b.dataset.i]; b.textContent = n || ''; b.classList.toggle('on', !!n); });
    const l = radir(d).filter(x => x.r.ath);
    const e = host.querySelector('#_sks-ath'); if (!e) return;
    e.innerHTML = l.length ? '<ol>' + l.map(x => '<li><input class="ci" placeholder="' + esc(x.heiti || 'Lína') + ' — hvað er að og hvað þarf að gera?" data-athtxt="1" data-hop="' + x.hop + '" data-i="' + x.i + '" value="' + esc(x.r.athTxt || '') + '"' + (ro ? ' disabled' : '') + '></li>').join('') + '</ol>'
      : '<div class="hint">Smelltu á reit í „Sjá ath." til að fá númeraða athugasemd.</div>';
  }
  function kostHtml() {
    const ko = S.kost, ro = !!(S.rod && (S.rod.reikningur_at || S.rod.sala_id)), dis = ro ? ' disabled' : '';
    const inn = (attr, kf, gildi, ph, cls) => '<input class="kf' + (cls ? ' ' + cls : '') + '" inputmode="decimal" placeholder="' + ph + '" data-kf="' + kf + '"' + attr + ' value="' + esc(gildi == null ? '' : gildi) + '"' + dis + '>';
    const lina = (attr, heitiHtml, r, ein) => '<div class="kline">' + heitiHtml + inn(attr, 'magn', r.magn, ein) + inn(attr, 'verd', r.verd, 'kr') + inn(attr, 'afsl', r.afsl, '%') + '<div class="ksum" data-ksum="1"' + attr + '></div></div>';
    const vegna = ko.vegna != null ? ko.vegna : 'Skoðun slökkvikerfis — ' + (S.k.heiti || '') + (S.data.haus.dags ? ', ' + dm(S.data.haus.dags) : '');
    return '<div class="kglosur"><div class="khd"><b>📝 MINNISPUNKTAR</b><span class="sp"></span><span class="hint">innanhúss — fer hvorki á skýrslu né reikning</span></div>' +
      '<textarea class="kgl" data-ktop="glosur" rows="5" placeholder="t.d. sækja bræðivör 182°C × 6 · vinna: skipt um afhleypivír · hringja í kokkinn fyrir komu"' + dis + '>' + esc(ko.glosur || '') + '</textarea></div>' +
      '<div class="khd"><b>🧾 REIKNINGUR</b><span class="sp"></span><span id="_sks-kvantar"></span></div>' +
      '<div class="kstada"><span class="' + (lokad() ? 'ok' : 'bid') + '">📄 Skoðunarskýrsla ' + arNu() + ' — ' + (lokad() ? 'lokið ' + esc(dm(S.rod.dags_skodunar)) : 'í vinnslu') + '</span>' +
        '<span class="' + (S.rod && S.rod.reikningur_at ? 'ok' : 'bid') + '">🧾 Reikningur ' + arNu() + ' — ' + (S.rod && S.rod.reikningur_at ? 'kominn ' + esc(dm(S.rod.reikningur_at)) : 'enginn') + '</span></div>' +
      '<label class="klbl">🧾 Texti á reikning <small>sést sem „Vegna…" lína á reikningnum</small></label><input class="kf t" data-ktop="vegna" value="' + esc(vegna) + '"' + dis + '>' +
      '<div class="kline h"><div>Tegund</div><div>Fjöldi</div><div>Per stk</div><div>Afsl.</div><div>Samtals</div></div>' +
      LINUR.map(x => lina(' data-k="' + x[0] + '"', '<div>' + x[1] + '</div>', ko[x[0]] || {}, x[2])).join('') +
      (ko.annad || []).map((r, i) => lina(' data-ka="' + i + '"', '<div class="kfri"><input class="kf t" placeholder="Annar kostnaður — lýsing" data-kf="heiti" data-ka="' + i + '" value="' + esc(r.heiti || '') + '"' + dis + '>' + (ro ? '' : '<button type="button" class="kx" data-kx="' + i + '" title="Fjarlægja línu">✕</button>') + '</div>', r, 'stk')).join('') +
      (ro ? '' : '<button type="button" class="addrow" data-baeta="kost">＋ Bæta við vöru eða þjónustu</button>') +
      '<div class="kline sep">' + '<div>📋 Skýrslugerð</div><div></div>' + inn(' data-k="skyrsla"', 'verd', (ko.skyrsla || {}).verd, 'kr') + '<div></div><div class="ksum" data-ksum="1" data-k="skyrsla"></div></div>' +
      '<div class="kline">' + '<div>🚗 Akstur</div>' + inn(' data-k="akstur"', 'magn', (ko.akstur || {}).magn, '×') + inn(' data-k="akstur"', 'verd', (ko.akstur || {}).verd, 'kr') + '<div></div><div class="ksum" data-ksum="1" data-k="akstur"></div></div>' +
      '<div class="ktot"><div><span>Án vsk</span><b id="_sks-t-brutto"></b></div>' +
        '<div><span>Afsláttur <input class="kf mini" inputmode="decimal" placeholder="%" data-ktop="afslattur" value="' + esc(ko.afslattur == null ? '' : ko.afslattur) + '"' + dis + '> %</span><b id="_sks-t-afsl"></b></div>' +
        '<div><span>VSK 24%</span><b id="_sks-t-vsk"></b></div>' +
        '<div class="alls"><span>SAMTALS M. VSK</span><b id="_sks-t-alls"></b></div></div>' +
      '<div class="hint" style="margin-top:8px">Línurnar vistast með skoðuninni og fara óbreyttar í reikningsdrögin. Reikningsgerðin sjálf er næsta skref — hér er enginn takki fyrr en hann gerir eitthvað.</div>';
  }
  // Summur uppfærðar Á STAÐNUM — engin endurteikning, svo Tab milli reita heldur fókus.
  function uppfaeraSummur() {
    const host = document.getElementById('_sks-host'); if (!host || !S.kost) return;
    const ko = S.kost;
    host.querySelectorAll('[data-ksum]').forEach(e => {
      const r = e.dataset.ka != null ? (ko.annad || [])[+e.dataset.ka] : ko[e.dataset.k];
      const su = linuSumma(r || {}, 1);
      e.textContent = su == null ? '—' : kr(su); e.classList.toggle('tom', su == null);
    });
    const t = reikna(ko), set = (id, v) => { const e = host.querySelector(id); if (e) e.textContent = v; };
    set('#_sks-t-brutto', t ? kr(t.brutto) : '—'); set('#_sks-t-afsl', t && t.afsl ? '− ' + kr(t.afsl) : '—');
    set('#_sks-t-vsk', t ? kr(t.vsk) : '—'); set('#_sks-t-alls', t ? kr(t.medVsk) : '—');
    const v = host.querySelector('#_sks-kvantar');
    if (v) v.innerHTML = tala((ko.skodun || {}).verd) ? '' : '<span class="vantar">⚠ Verð á skoðun vantar</span>';
  }
  function vantar() {
    const d = S.data, v = [], r = radir(d);
    if (!(d.haus.madur || '').trim()) v.push('nafn skoðunarmanns vantar');
    if (!d.haus.dags) v.push('dagsetning skoðunar vantar');
    if (!r.some(x => x.r.il || x.r.ek)) v.push('engin lína merkt');
    const oa = r.filter(x => x.r.ath && !(x.r.athTxt || '').trim()).length; if (oa) v.push(oa + ' athugasemd án texta');
    const oe = r.filter(x => x.r.ek && !x.r.ath).length; if (oe) v.push(oe + ' lína „Ekki í lagi" án athugasemdar');
    return v;
  }

  function syna() {
    const host = document.getElementById('_sks-host'); if (!host) return;
    const k = S.k, ro = lokad();
    // Á tölvu stendur stikan neðst í hægri dálkinum (hann er límdur, svo vistunarstaðan sést alltaf);
    // á síma staflast dálkarnir og stikan límist neðst á skjáinn.
    const breidd = window.matchMedia('(min-width:1251px)').matches;
    const bar = '<div class="_sks-bar' + (breidd ? ' ipanel' : '') + '"><span id="_sks-saved" class="_sks-saved' + (S.stoppad ? ' villa' : '') + '">' + (S.stoppad ? '⚠ Síðasta breyting er ÓVISTUÐ — sjálfvistun stöðvuð' : S.rod ? 'Vistað á þjóni ' + esc(dm(S.rod.updated_at)) : 'Óvistað — skoðunin verður til við fyrstu breytingu') + '</span><span id="_sks-err" class="_sks-err"></span><span class="sp"></span>' +
      '<button type="button" class="_sks-btn" data-act="prenta">🖨 Prenta / PDF</button>' +
      (ro ? '<button type="button" class="_sks-btn" data-act="opna-aftur">✎ Opna aftur til breytinga</button>' : '<button type="button" class="_sks-btn pri" data-act="ljuka">Ljúka skoðun</button>') + '</div>';
    host.innerHTML =
      '<div class="_sks-hd"><h2>🍳 Slökkvikerfis skoðun ' + arNu() + ' · ' + esc(k.heiti) + (k.tegund ? ' <small>' + esc(k.tegund) + '</small>' : '') + '</h2>' +
        (S.kerfi.length > 1 ? '<span class="_sks-kerfi">' + S.kerfi.map(x => '<button type="button" class="_sks-kbtn' + (x.id === k.id ? ' on' : '') + '" data-kerfi="' + x.id + '">' + esc(x.heiti) + '</button>').join('') + '</span>' : '') +
        '<span class="sp"></span>' + (ro ? '<span class="_sks-lok">✓ Skoðun lokið ' + esc(dm(S.rod.dags_skodunar)) + '</span>' : (k.fyrri_skodun ? '<span class="hint">Síðast skoðað ' + esc(dm(k.fyrri_skodun)) + (k.fyrri_adili ? ' af ' + esc(k.fyrri_adili) : '') + ' — tegund og stk. erfast þaðan</span>' : '')) + '</div>' +
      (S.stoppad ? '<div class="_sks-villa">⚠ Sjálfvistun stöðvuð: skoðuninni var breytt annars staðar. <button type="button" class="_sks-btn" data-act="endurhlada">Endurhlaða skoðunina</button></div>' : '') +
      '<div class="_sks-cols"><div class="sheet' + (ro ? ' ro' : '') + '">' + bladHtml() + '</div>' +
      '<div class="kost"><div class="kost-in">' + kostHtml() + '</div>' + (breidd ? bar : '') + '</div></div>' + (breidd ? '' : bar);
    uppfaeraAth(); uppfaeraSummur();
  }

  // ── prentun: sama blað, gildin sem texti ────────────────────────────────────
  function prenta() {
    const d = S.data, h = d.haus, nr = athNr(d);
    const c = v => '<td class="c">' + esc(v || '') + '</td>';
    const lina = (heiti, r, meta, key) => '<tr><td class="l">' + esc(heiti) + '</td>' + (meta ? '<td>' + esc(r.teg || '') + '</td>' + c(r.stk) : '') + c(r.il) + c(r.ek) + c(nr[key]) + '</tr>';
    const hd = (l, v) => '<tr><th class="l" style="width:48%">' + l + '</th><td>' + esc(v || '') + '</td></tr>';
    const ath = radir(d).filter(x => x.r.ath);
    const win = window.open('', '_blank'); if (!win) { toast('Leyfðu sprettiglugga til að prenta.'); return; }
    win.document.write('<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Skoðunarskýrsla slökkvikerfis — ' + esc(h.vidsk) + ' — ' + esc(dm(h.dags).replace(/\//g, '.')) + '</title><style>' +
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:system-ui,Arial,sans-serif;color:#000;margin:0;padding:22px;font-size:12px}' +
      '.top{display:grid;grid-template-columns:110px 1fr 190px;align-items:center;gap:10px}.samn{border:1px solid #9aa3b0;padding:4px 6px;font-size:10px;min-height:38px}.samn b{display:block;font-size:13px}' +
      'h3{margin:0;text-align:center;font-size:20px;letter-spacing:.04em;text-transform:uppercase;line-height:1.15}.logo{text-align:right}.logo img{height:58px}' +
      '.head{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:14px}.cust{border:1px solid #9aa3b0;padding:8px 10px;line-height:1.5}' +
      'table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #9aa3b0;padding:3px 5px;font-size:11.5px;height:22px}th{background:#eef1f5;font-size:9.5px;text-transform:uppercase;text-align:center}' +
      'th.l,td.l{text-align:left}td.l{font-weight:600}td.c{text-align:center}.grp{font-style:italic;font-weight:700;text-decoration:underline;margin:14px 0 3px;font-size:13px}' +
      '.cols{display:grid;grid-template-columns:1.25fr 1fr;gap:18px}.athbox{border:1px solid #9aa3b0;padding:10px 14px;min-height:100px}ol{margin:6px 0 10px;padding-left:30px}' +
      '.disc{font-size:10px;color:#555;margin-top:6px;font-style:italic}.sig{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:20px;margin-top:34px;font-size:10.5px}.sig div{border-top:1px solid #000;padding-top:2px}.sig span{display:block;font-size:13px;text-align:center;margin-top:-22px;height:20px}' +
      '.ft{margin-top:14px;border-top:1px solid #9aa3b0;padding-top:5px;text-align:center;font-size:10px;color:#444}@page{size:A4;margin:12mm}</style></head><body>' +
      '<div class="top"><div class="samn">Samn. nr<b>' + esc(h.samn || '') + '</b></div><h3>Skoðunarskýrsla<br>slökkvikerfis</h3><div class="logo"><img src="' + location.origin + LOGO + '" alt=""></div></div>' +
      '<div class="head"><div class="cust"><b>' + esc(h.vidsk) + '</b><br>' + esc(h.tengil) + '<br>' + esc(h.heim) + '<br>' + esc(h.postnr) + '<br>' + esc(h.simi) + '</div><table>' + hd('Dags. skoðunar', dm(h.dags)) + hd('Dags. viðgerða / úrbóta', dm(h.dagsurb)) + hd('Nafn skoðunarmanns', h.madur) + hd('Nafn þjónustuaðila', h.thjon) + hd('Nafn fjargæsluaðila', h.fjarg) + hd('Nafn uppsetningaraðila', h.upps) + '</table></div>' +
      '<div class="cols"><div><div class="grp">Prófanir</div><table><colgroup><col style="width:34%"><col style="width:24%"><col style="width:10%"><col style="width:10%"><col style="width:11%"><col style="width:11%"></colgroup><tr><th class="l">Búnaður</th><th>Tegund</th><th>Stk.</th><th>Í lagi</th><th>Ekki í lagi</th><th>Sjá ath.</th></tr>' +
        d.bun.map((r, i) => lina(BUNADUR[i], r, true, 'bun:' + i)).join('') + d.auk.filter(r => r.heiti || r.il || r.ek).map(r => lina(r.heiti || '', r, true, 'auk:' + d.auk.indexOf(r))).join('') + '</table></div>' +
      '<div><div class="grp">Prófanir</div><table><colgroup><col style="width:58%"><col style="width:14%"><col style="width:14%"><col style="width:14%"></colgroup><tr><th class="l">Vöktun og fl.</th><th>Í lagi</th><th>Ekki í lagi</th><th>Sjá ath.</th></tr>' + d.vok.map((r, i) => lina(VOKTUN[i], r, false, 'vok:' + i)).join('') + '</table>' +
        '<div class="grp">Uppsetning eldhústækja miðað við dreifistúta</div><table><colgroup><col style="width:58%"><col style="width:14%"><col style="width:14%"><col style="width:14%"></colgroup><tr><th class="l">Eldhústæki</th><th>Í lagi</th><th>Ekki í lagi</th><th>Sjá ath.</th></tr>' + d.eld.map((r, i) => lina(r.heiti || '', r, false, 'eld:' + i)).join('') + '</table></div></div>' +
      '<div class="grp">Athugasemdir / úrbætur</div><div class="athbox"><b>Athugasemdir:</b>' + (ath.length ? '<ol>' + ath.map(x => '<li>' + esc(x.r.athTxt || '') + '</li>').join('') + '</ol>' : '<div style="margin:6px 0 10px">Engar.</div>') + '<b>Annað:</b> ' + esc(d.annad || '') + '</div>' +
      '<div class="disc">Afrit af skoðunarskýrslunni verður sent eldvarnareftirliti slökkviliðs ef kallað er eftir því.</div>' +
      '<div class="sig"><div><span>' + esc(h.stadur || '') + '</span>Staður</div><div><span>' + esc(dm(h.dags)) + '</span>Dagsetning</div><div><span>' + esc(h.madur || '') + '</span>Nafn skoðunarmanns — starfsmannsnúmer<br><b>F.h. ' + esc(FELAG) + '</b></div></div>' +
      '<div class="ft">' + esc(FOTUR) + '</div><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
    win.document.close();
  }

  // ── ljúka / opna aftur ──────────────────────────────────────────────────────
  async function ljuka() {
    const err = $('#_sks-err'); const v = vantar();
    if (v.length) { if (err) err.textContent = 'Ekki hægt að ljúka: ' + v.join(' · '); const h = document.getElementById('_sks-host'); if (h) h.querySelectorAll('[data-athtxt]').forEach(i => i.classList.toggle('miss', !i.value.trim())); return; }
    if (err) err.textContent = '';
    clearTimeout(S.timer);
    if (!(await vista())) return;                       // allt verður að vera komið á þjón fyrst
    const sb = SB(); if (!sb) return;
    const nu = new Date().toISOString();
    const { data, error } = await sb.from('slokkvikerfi_skodanir').update({ status: 'final', skodad_at: nu, updated_by: notandi() }).eq('id', S.rod.id).eq('updated_at', S.rod.updated_at).select('*');
    if (error || !data || !data[0]) { toast('⚠ Tókst ekki að ljúka: ' + ((error && error.message) || 'skoðuninni var breytt annars staðar')); if (!error) { S.stoppad = true; syna(); } return; }
    S.rod = data[0];
    // Búnaðargrunnlína kerfisins erfist í næstu skoðun; skoðunarmánuður festist ef hann vantaði.
    const patch = { bunadur: S.data.bun.map(r => ({ teg: r.teg || '', stk: r.stk || '' })), updated_by: notandi() };
    if (!S.k.skodunarmanudur && S.data.haus.dags) patch.skodunarmanudur = +String(S.data.haus.dags).slice(5, 7);
    const g = await sb.from('slokkvikerfi').update(patch).eq('id', S.k.id).select('id,bunadur,skodunarmanudur');
    if (g.error || !g.data || !g.data[0]) toast('⚠ Skoðun lokið, en búnaðargrunnlínan uppfærðist ekki: ' + ((g.error && g.error.message) || 'engin röð'));
    else { S.k.bunadur = g.data[0].bunadur; S.k.skodunarmanudur = g.data[0].skodunarmanudur; toast('✓ Skoðun lokið — skrefið „Skoðað" er komið á yfirlitið'); }
    syna();
  }
  async function opnaAftur() {
    const sb = SB(); if (!sb || !S.rod) return;
    if (S.rod.reikningur_at || S.rod.sala_id) { toast('Reikningur er kominn á þessa skoðun — hún verður ekki opnuð aftur héðan.'); return; }
    const { data, error } = await sb.from('slokkvikerfi_skodanir').update({ status: 'draft', skodad_at: null, updated_by: notandi() }).eq('id', S.rod.id).eq('updated_at', S.rod.updated_at).select('*');
    if (error || !data || !data[0]) { toast('⚠ Tókst ekki að opna aftur: ' + ((error && error.message) || 'skoðuninni var breytt annars staðar')); return; }
    S.rod = data[0]; syna(); toast('Skoðunin er opin aftur — skrefið „Skoðað" var tekið af');
  }

  async function veljaKerfi(k) {
    clearTimeout(S.timer); if (S.dirty && !S.stoppad) await vista();
    S.k = k; S.stoppad = false; S.dirty = false;
    const co = ((window.Companies && Companies.list) || []).find(x => x.id === S.fid) || {};
    S.rod = await saekjaSkodun(k);
    const d = S.rod && S.rod.data && S.rod.data.haus ? S.rod.data : tomtBlad(k, co);
    ['bun', 'auk', 'vok', 'eld'].forEach(h => { if (!Array.isArray(d[h])) d[h] = tomtBlad(k, co)[h]; });
    S.data = d; S.kost = Object.assign({ annad: [] }, (S.rod && S.rod.kostnadur) || {}); if (!Array.isArray(S.kost.annad)) S.kost.annad = [];
    if (!S.rod && S.kost.afslattur == null && +co.afslattur_pct > 0) S.kost.afslattur = String(+co.afslattur_pct);   // sami afsláttur og prófíllinn ber; breytanlegt
    syna();
  }

  // ── atburðir á hýslinum ─────────────────────────────────────────────────────
  function rad(t) { return S.data[t.dataset.hop][+t.dataset.i]; }
  function wire(host) {
    host.addEventListener('click', e => {
      const t = e.target;
      const kb = t.closest('[data-kerfi]'); if (kb) { const k = S.kerfi.find(x => x.id === +kb.dataset.kerfi); if (k) veljaKerfi(k); return; }
      const act = t.closest('[data-act]');
      if (act) { const a = act.dataset.act; if (a === 'prenta') return prenta(); if (a === 'ljuka') return ljuka(); if (a === 'opna-aftur') return opnaAftur(); if (a === 'endurhlada') return veljaKerfi(S.k); }
      if (S.stoppad) return;
      const kb2 = t.closest('[data-baeta="kost"]'), kx2 = t.dataset.kx != null;
      if (lokad() && !kb2 && !kx2) return;
      if (t.dataset.ath) { const r = rad(t); r.ath = !r.ath; uppfaeraAth(); return merkjaBreytt(); }
      const b = t.closest('[data-baeta]');
      if (b) { if (b.dataset.baeta === 'kost') { S.kost.annad.push({}); $('.kost-in').innerHTML = kostHtml(); uppfaeraSummur(); } else { S.data[b.dataset.baeta].push({}); const s = $('.sheet'); s.innerHTML = bladHtml(); uppfaeraAth(); } return merkjaBreytt(); }
      if (t.dataset.kx != null) { S.kost.annad.splice(+t.dataset.kx, 1); $('.kost-in').innerHTML = kostHtml(); uppfaeraSummur(); return merkjaBreytt(); }
    });
    // Smellur í tóman reit fyllir eins og á pappírnum: Í lagi = Stk. (eða x), Ekki í lagi = x + athugasemd.
    host.addEventListener('focusin', e => {
      const t = e.target, f = t.dataset && t.dataset.f;
      if ((f !== 'il' && f !== 'ek') || t.value || t.disabled || S.stoppad) return;
      const r = rad(t);
      if (f === 'il') { t.value = r.stk || 'x'; r.il = t.value; }
      else { t.value = 'x'; r.ek = 'x'; if (!r.ath) { r.ath = true; uppfaeraAth(); } }
      const err = $('#_sks-err'); if (err) err.textContent = '';
      try { t.select(); } catch (_) {}
      merkjaBreytt();
    });
    host.addEventListener('input', e => {
      const t = e.target, d = t.dataset; if (!S.data || t.disabled || S.stoppad) return;
      if (d.dagur) {
        const iso = t.value.trim() === '' ? '' : isoUr(t.value);
        t.classList.toggle('bad', iso === null); if (iso === null) return;
        S.data.haus[d.dagur] = iso; if (d.dagur === 'dags') { const s = $('#_sks-sigdags'); if (s) s.value = dm(iso); }
      } else if (d.haus) {
        S.data.haus[d.haus] = t.value;
        if (d.haus === 'madur') { const s = $('#_sks-sigmadur'); if (s) s.value = t.value; try { localStorage.setItem(LS_MADUR, t.value.trim()); } catch (_) {} }
      } else if (d.athtxt) { rad(t).athTxt = t.value; t.classList.remove('miss'); }
      else if (d.f) { rad(t)[d.f] = t.value; }
      else if (d.kf && d.k) { (S.kost[d.k] = S.kost[d.k] || {})[d.kf] = t.value; uppfaeraSummur(); }
      else if (d.kf && d.ka != null) { S.kost.annad[+d.ka][d.kf] = t.value; uppfaeraSummur(); }
      else if (d.ktop) { S.kost[d.ktop] = t.value; uppfaeraSummur(); }
      else if (t.id === '_sks-annad') { S.data.annad = t.value; }
      else return;
      merkjaBreytt();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && S.dirty && !S.stoppad && document.getElementById('_sks-host')) { clearTimeout(S.timer); vista(); } });
  }

  // ── flipar á prófílnum ──────────────────────────────────────────────────────
  // Neðri helmingur Ársskoðunar: tækjalistinn (.uttekt-cols) og „Úttekt búin / í Vinnslu“-takkinn. Takkinn er
  // sprautaður af öðrum pappa og stendur ekki alltaf næst á undan listanum (mælt á síma 21.09) — því er leitað
  // meðal beinna barna, ekki treyst á systkinaröð.
  function arsHlutar(main) {
    const cols = main.querySelector(':scope > .uttekt-cols'); if (!cols) return [];
    const ut = [];
    [...main.children].forEach(el => {
      if (el === cols || el.id === '_sks-host' || el.id === '_sks-tabs') return;
      const t = (el.textContent || '').trim();
      if (t.length < 80 && /Úttekt búin/i.test(t)) ut.push(el);
    });
    ut.push(cols);
    return ut;
  }
  function setjaFlipa(f) {
    S.flipi = f;
    const main = document.getElementById('companies-main'); if (!main) return;
    const slokk = f === 'slokk';
    arsHlutar(main).forEach(el => { if (slokk) { el.dataset.sksFalid = '1'; el.style.setProperty('display', 'none', 'important'); } else if (el.dataset.sksFalid) { delete el.dataset.sksFalid; el.style.removeProperty('display'); } });
    const host = document.getElementById('_sks-host'); if (host) host.style.display = slokk ? '' : 'none';
    main.querySelectorAll('#_sks-tabs ._sks-tab').forEach(b => b.classList.toggle('on', b.dataset.flipi === f));
    // Hýsillinn er nýr í hvert sinn sem prófíllinn er endurteiknaður — líka þegar SAMA fyrirtæki er
    // opnað aftur (mælt 21.09: blaðið stóð tómt í annarri opnun). Tómur hýsill → sækja upp á nýtt.
    if (slokk && S.kerfi.length && host && !host.firstChild) {
      const k = (S.k && S.k.fyrirtaeki_id === S.fid && S.kerfi.find(x => x.id === S.k.id)) || S.kerfi[0];
      veljaKerfi(k);
    }
  }
  let _mounting = false;
  async function mount() {
    const main = document.getElementById('companies-main'); if (!main || _mounting) return;
    const coEl = main.querySelector('[data-co-id]'); const cols = main.querySelector(':scope > .uttekt-cols');
    if (!coEl || !cols) return;
    const fid = +coEl.getAttribute('data-co-id'); if (!fid) return;
    if (main.querySelector('#_sks-tabs') && S.fid === fid) { if (S.flipi === 'slokk') setjaFlipa('slokk'); return; }   // þegar komið — endurbeita felun (takkinn kemur stundum á eftir)
    _mounting = true;
    try {
      if (S.fid !== fid) { clearTimeout(S.timer); if (S.dirty && !S.stoppad && S.k) await vista(); S.fid = fid; S.k = null; S.rod = null; S.data = null; S.flipi = 'ars'; S.kerfi = await saekjaKerfi(fid); }
      const gomul = main.querySelector('#_sks-tabs'); if (gomul) gomul.remove();
      const gamall = main.querySelector('#_sks-host'); if (gamall) gamall.remove();
      if (!S.kerfi.length) return;                                                  // fyrirtækið á ekkert slökkvikerfi → engir flipar
      const taeki = (cols.textContent.match(/Slökkvitæki\s*\((\d+)\)/) || [])[1];
      const tabs = document.createElement('div'); tabs.id = '_sks-tabs';
      tabs.innerHTML = '<button type="button" class="_sks-tab" data-flipi="ars">🧯 Slökkvitæki' + (taeki ? ' (' + taeki + ')' : '') + '</button>' +
        '<button type="button" class="_sks-tab" data-flipi="slokk">🍳 Slökkvikerfi' + (S.kerfi.length > 1 ? ' (' + S.kerfi.length + ')' : '') + '</button>';
      tabs.addEventListener('click', e => { const b = e.target.closest('._sks-tab'); if (b) setjaFlipa(b.dataset.flipi); });
      const host = document.createElement('div'); host.id = '_sks-host'; host.style.display = 'none'; wire(host);
      const hl = arsHlutar(main); const akkeri = hl.find(el => el.parentNode === main && (el.compareDocumentPosition(cols) & Node.DOCUMENT_POSITION_FOLLOWING)) || cols;
      main.insertBefore(tabs, akkeri); main.insertBefore(host, akkeri);
      // 385 skilur eftir ósk um að opna 🍳 beint þegar komið er af Slökkvikerfis-síðunni
      const o = window.__slokkvikerfiOpna; const beint = o && o.fid === fid && (Date.now() - o.at) < 15000;
      if (beint) window.__slokkvikerfiOpna = null;
      setjaFlipa(beint ? 'slokk' : S.flipi);
    } finally { _mounting = false; }
  }

  function ensureCss() {
    if (document.getElementById('_sks-css')) return;
    const s = document.createElement('style'); s.id = '_sks-css';
    const H = '#_sks-host ';
    s.textContent = [
      '#_sks-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:18px 0 12px;border-bottom:2px solid #d8dde6}',
      '#_sks-tabs ._sks-tab{border:1px solid #d8dde6;border-bottom:0;background:#f4f6f9;border-radius:10px 10px 0 0;padding:10px 16px;font:700 13px var(--ui,system-ui);cursor:pointer;color:#3a4250;margin-bottom:-2px}',
      '#_sks-tabs ._sks-tab.on{background:#fff;border-color:#b0201b;border-bottom:2px solid #fff;color:#0f172a}',
      H + '{font-family:var(--ui,system-ui,sans-serif);color:#0f172a;margin-bottom:18px}',
      H + '.sp{flex:1}' + H + '.hint{font-size:12px;color:#64748b}',
      H + '._sks-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;background:#fff;border:1px solid #d8dde6;border-radius:10px;padding:9px 14px}' + H + '._sks-hd h2{margin:0;font-size:17px;font-weight:800;color:#0f172a}' + H + '._sks-hd small{font-weight:500;color:#64748b;font-size:12.5px;margin-left:6px}',
      H + '._sks-kbtn{border:1px solid #d8dde6;background:#fff;border-radius:99px;padding:4px 11px;font:600 12px var(--ui,system-ui);cursor:pointer;margin-right:4px}' + H + '._sks-kbtn.on{background:#1b1d22;color:#fff;border-color:#000}',
      H + '._sks-lok{font-size:12.5px;font-weight:700;color:#fff;background:linear-gradient(145deg,#1c7a45,#0c3f22);border-radius:7px;padding:4px 10px}',
      H + '._sks-villa{background:#fff0ed;border:1px solid #fca5a5;color:#8a1d12;border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:13px}',
      H + '.sheet{background:#fff;color:#000;border:1px solid #d8dde6;border-radius:6px;padding:22px;max-width:920px;margin:0 auto;box-shadow:0 6px 24px rgba(20,30,45,.08)}',
      H + '.sheet.ro{background:#fbfcfd}',
      H + '.sh-top{display:grid;grid-template-columns:110px 1fr 190px;align-items:center;gap:10px}',
      H + '.samn{border:1px solid #9aa3b0;padding:4px 6px;font-size:10px;color:#444}',
      H + '.sh-top h3{font-family:var(--ui,system-ui,sans-serif)!important;font-weight:800;margin:0;text-align:center;font-size:20px;letter-spacing:.04em;text-transform:uppercase;line-height:1.15;color:#000}',
      H + '.logo{text-align:right}' + H + '.logo img{max-width:100%;height:58px;object-fit:contain}',
      H + '.sh-head{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:14px}',
      H + '.cust{border:1px solid #9aa3b0;padding:8px 10px;display:grid;gap:2px;align-content:start}' + H + '.cust label{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#555;margin:0}',
      // 245/mobile.css mála `.view table` — sama vopn og 153 þarf: display + !important
      H + '.sheet table{display:table!important;width:100%;min-width:0!important;border-collapse:collapse;table-layout:fixed;margin:0}',
      H + '.sheet tbody{display:table-row-group!important}' + H + '.sheet tr{display:table-row!important;background:transparent!important}',
      H + '.sheet th,' + H + '.sheet td{display:table-cell!important;border:1px solid #9aa3b0!important;padding:0!important;font-size:12px;height:26px;color:#000!important;background:#fff!important;text-transform:none;letter-spacing:0;white-space:normal}',
      H + '.sheet th{background:#eef1f5!important;font-size:10px!important;font-weight:700;text-transform:uppercase!important;letter-spacing:.03em;padding:3px 4px!important;text-align:center;line-height:1.1;text-shadow:none!important}',
      H + '.sheet td.l{padding:2px 6px!important;font-weight:600;text-align:left}' + H + '.sheet th.l{text-align:left}',
      H + '.grp{font-style:italic;font-weight:700;text-decoration:underline;margin:14px 0 3px;font-size:13px;color:#000}',
      H + 'input.ci{display:block;width:100%;height:100%;min-height:26px;border:0!important;background:transparent!important;box-shadow:none!important;font:12px var(--ui,system-ui)!important;padding:2px 5px!important;color:#000!important;border-radius:0!important;margin:0!important;box-sizing:border-box}',
      H + 'input.ci.c{text-align:center;padding:2px 1px!important}' + H + 'input.ci.b{font-weight:600!important}',
      H + 'input.ci:focus{outline:2px solid #b0201b;outline-offset:-2px;background:#fffdf6!important}',
      H + 'input.ci.bad{color:#a83018!important;font-weight:700!important}' + H + 'input.ci:disabled{opacity:1;-webkit-text-fill-color:#000}',
      H + 'button.ath{display:block;width:100%;height:100%;min-height:26px;border:0;background:transparent;cursor:pointer;font:700 12px var(--ui,system-ui);color:#000;padding:0;border-radius:0}' + H + 'button.ath.on{background:#ffe680}' + H + 'button.ath:disabled{cursor:default}',
      H + '.sh-cols{display:grid;grid-template-columns:1.25fr 1fr;gap:18px}',
      H + '.athbox{border:1px solid #9aa3b0;padding:10px 14px;min-height:110px;color:#000}' + H + '.athbox ol{margin:6px 0 10px;padding-left:34px}' + H + '.athbox li{margin-bottom:3px}',
      H + '.athbox input.ci{border-bottom:1px dotted #9aa3b0!important}' + H + '.athbox input.ci.miss{background:#fff0ed!important}' + H + '.athbox input.ci.annad{display:inline-block;width:calc(100% - 64px)}' + H + '.athbox .hint{margin:4px 0 10px}',
      H + '.disc{font-size:10px;color:#555;margin-top:6px;font-style:italic}',
      H + '.sig{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:20px;margin-top:26px;font-size:10.5px;color:#000}' + H + '.sig>div{border-top:1px solid #000;padding-top:2px}' + H + '.sig input.ci{font-size:13px!important;text-align:center}',
      H + '.ft{margin-top:14px;border-top:1px solid #9aa3b0;padding-top:5px;text-align:center;font-size:10px;color:#444}',
      H + '.addrow{font:600 11.5px var(--ui,system-ui);color:#a83018;background:transparent;border:0;cursor:pointer;padding:5px 0}',
      H + '._sks-cols{display:flex;gap:16px;align-items:flex-start}',
      H + '._sks-cols .sheet{flex:1 1 0;min-width:0;max-width:920px;margin:0}',
      H + '.kost{flex:0 0 470px;position:sticky;top:12px;background:#fff;border:1px solid #d8dde6;border-radius:12px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
      H + '.khd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}' + H + '.khd b{font-size:12.5px;letter-spacing:.05em;color:#3a4250}',
      H + '.vantar{font-size:11.5px;font-weight:600;color:#8a5c04;background:#fbeac6;border:1px solid rgba(217,146,6,.5);border-radius:6px;padding:2px 8px}',
      H + '.kstada{display:grid;gap:4px;margin-bottom:10px}' + H + '.kstada span{font-size:12.5px;border-radius:7px;padding:5px 9px;border:1px solid #e7eaf0;background:#f4f6f9;color:#3a4250}' + H + '.kstada span.ok{background:#e8f5ec;border-color:#b9dfc6;color:#0f5e3f;font-weight:600}',
      H + '.kglosur{margin:-14px -16px 12px;padding:14px 16px 12px;background:#fffdf3;border-bottom:1px solid #eee3b8;border-radius:12px 12px 0 0}' + H + 'textarea.kgl{display:block;width:100%;box-sizing:border-box;border:1px solid #e3d9a8!important;border-radius:8px!important;background:#fffef8!important;color:#0f172a!important;font:13px/1.45 var(--ui,system-ui)!important;padding:8px 10px!important;resize:vertical;min-height:96px;margin:0!important}',
      H + '.klbl{display:block;font-size:11.5px;font-weight:700;color:#3a4250;margin:4px 0 3px}' + H + '.klbl small{font-weight:400;color:#64748b;margin-left:4px}',
      H + '.kline{display:grid;grid-template-columns:minmax(0,1fr) 58px 86px 52px 92px;gap:6px;align-items:center;padding:5px 0;border-top:1px solid #eceff4;font-size:13px}',
      H + '.kline.h{border-top:0;margin-top:10px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em}' + H + '.kline.h div:not(:first-child),' + H + '.ksum{text-align:right}' + H + '.ksum{font-family:var(--mono,ui-monospace,monospace);font-size:12.5px}' + H + '.ksum.tom{color:#94a3b8}',
      H + '.kline.sep{border-top:2px solid #d8dde6;margin-top:4px}',
      H + 'input.kf{width:100%;border:1px solid #d8dde6!important;border-radius:7px!important;padding:6px 7px!important;font:13px var(--ui,system-ui)!important;text-align:right;background:#fff!important;color:#0f172a!important;box-sizing:border-box;margin:0!important;min-height:0!important;height:auto!important}' + H + 'input.kf.t{text-align:left}' + H + 'input.kf.mini{display:inline-block;width:54px;padding:3px 6px!important}' + H + 'input.kf:disabled{background:#f4f6f9!important;color:#64748b!important}',
      H + '.kfri{display:flex;gap:4px;min-width:0}' + H + '.kx{border:0;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;padding:0 2px}',
      H + '.ktot{margin-top:10px;border-top:2px solid #1b1d22;padding-top:8px;display:grid;gap:5px}' + H + '.ktot>div{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#3a4250}' + H + '.ktot b{font-family:var(--mono,ui-monospace,monospace);color:#0f172a}',
      H + '.ktot .alls{margin-top:4px;padding:9px 11px;border-radius:9px;color:#fff;background:linear-gradient(180deg,#3a3d45 0%,#1b1d22 100%);font-weight:700;letter-spacing:.04em}' + H + '.ktot .alls span{color:#f0f2f5}' + H + '.ktot .alls b{color:#fff;font-size:16px}',
      '@media (max-width:1250px){' + H + '._sks-cols{flex-direction:column}' + H + '._sks-cols .sheet{max-width:none;width:100%}' + H + '.kost{flex:1 1 auto;width:100%;position:static;box-sizing:border-box}}',
      H + '._sks-bar.ipanel{position:static;margin:12px 0 0;padding:10px 0 0;border:0;border-top:1px solid #eceff4;border-radius:0;box-shadow:none}' + H + '._sks-bar.ipanel ._sks-err{flex-basis:100%}',
      H + '._sks-bar{position:sticky;bottom:0;z-index:30;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0 0;background:#fff;border:1px solid #d8dde6;border-radius:10px;padding:10px 14px;box-shadow:0 -4px 16px rgba(20,30,45,.08)}',
      H + '._sks-saved{font-size:12px;color:#64748b}' + H + '._sks-saved.ok{color:#1c7a45;font-weight:600}' + H + '._sks-saved.villa{color:#b0201b;font-weight:700}' + H + '._sks-err{font-size:12.5px;color:#b0201b;font-weight:600}',
      H + '._sks-btn{border:1px solid #d8dde6;background:#fff;color:#0f172a;border-radius:8px;padding:8px 13px;font:600 12.5px var(--ui,system-ui);cursor:pointer}',
      H + '._sks-btn.pri{color:#fff;background:linear-gradient(145deg,#d84f4a 0%,#b0201b 42%,#6e100d 72%,#9c1d18 100%);border-color:#4d0a08}',
      '@media (max-width:760px){' + H + '.sheet{padding:12px}' + H + '.sh-top{grid-template-columns:80px 1fr}' + H + '.logo{grid-column:1/-1;text-align:center}' + H + '.sh-top h3{font-size:16px}' + H + '.sh-head,' + H + '.sh-cols{grid-template-columns:1fr}' +
        H + '.sheet th,' + H + '.sheet td{height:36px}' + H + 'input.ci,' + H + 'button.ath{min-height:36px;font-size:14px!important}' + H + '.kline{grid-template-columns:minmax(0,1fr) 48px 72px 44px 80px}' + '#_sks-tabs ._sks-tab{flex:1;padding:11px 8px}}'
    ].join('');
    document.head.appendChild(s);
  }

  // Prófíllinn er endurteiknaður með innerHTML (Companies.openDetail) og pappar sprauta sér inn á eftir.
  // Fylgst er AÐEINS með beinum börnum #companies-main, með töf, svo þetta verði ekki lykkja.
  function boot() {
    ensureCss();
    let t = null;
    const kikja = () => { clearTimeout(t); t = setTimeout(() => { mount().catch(e => console.warn('[slokkvikerfi-skyrsla] mount', e)); }, 250); };
    const festa = () => {
      const main = document.getElementById('companies-main');
      if (!main) { setTimeout(festa, 800); return; }
      new MutationObserver(kikja).observe(main, { childList: true });
      kikja();
    };
    festa();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.SlokkvikerfiSkyrsla = { mount, prenta, summa, reikna };
  console.log('[patch-386] Slökkvikerfis skýrsla installed');
})();
/* === END SLÖKKVIKERFIS SKÝRSLA === */
