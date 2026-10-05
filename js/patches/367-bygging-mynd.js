/* 367-bygging-mynd.js — mynd af byggingunni í fyrirtækjabannernum.
 *
 * Agnar 10.09.2026: „Can you add a picture preview in that area ... perhaps almost
 * transparent lines around that area, where I can paste a picture of the building.
 * and it enlarges when clicked.... but make it fit the frame, without stretching".
 *
 * Og strax á eftir: „ekki hafa dótið með teikningunni þarna,,, það kemur bara
 * þegar maður ýtir á teikninga takkann". Fyrsta útgáfan sýndi TVÆR flísar —
 * bygging og forsýn teikningar með tækjadottum. Teikningin á sinn eigin takka og
 * sitt eigið spjald; hún var tekin út. („ok kanski bara default hide teikninguna —
 * verður kanski fínt seinna meir“: prófuð útgáfa með dottum er í git-sögunni, fyrsta
 * commit þessarar skrár, svo auðvelt er að endurvekja hana.) Byggingin stendur ein og fær því stærri
 * ramma sem fyllir svæðið sem Agnar merkti.
 *
 * Flísin situr í auða svæðinu vinstra megin við upplýsingalínurnar (363):
 *   • tóm: AÐEINS daufur brotinn rammi, enginn texti (ósk Agnars) — límdu (Ctrl+V
 *     yfir flísinni), dragðu inn, eða smelltu; leiðbeiningin er í title-texta
 *   • með mynd: smellur stækkar; myndin passar í rammann og teygist ALDREI
 *
 * ── v2 12.09.2026: SKIPTA UM MYND Í SÍMA ─────────────────────────────────────
 * Agnar (úr símanum): „Geturðu opnað á að ég geti breytt um mynd í company
 * profile". Í síma er hvorki músarsveima (× fjarlægja birtist aðeins við hover)
 * né líming/dráttur, og smellur á mynd stækkaði hana bara — þar var því engin
 * leið til að skipta um mynd. Nú ber stækkunin takkana „📷 Skipta um mynd“
 * (vafrinn býður myndavél eða myndasafn) og „🗑 Fjarlægja“, og × sést alltaf á
 * snertiskjá. Handvalin mynd fær `uppspretta: 'handvirkt'` svo sjálfsótt
 * loftmynd (borgarvefsjá) sé ekki talin uppruninn.
 *
 * ── v3 13.09.2026: MYNDIN Í HÆÐ BANNERSINS + HLEKKIR Á GÖTUMYND ──────────────
 * Agnar: „geturðu kanski lagað hlutföllinn á fyrirtækjabanner. kanski stækkað
 * myndina í samræmi við hæð bannersins". Flísin var föst 190×108 og stóð fyrir
 * miðju í ~190 px hárri línu. Nú teygir hún sig í hæð línunnar (align-self:
 * stretch) og vex í laust pláss upp að HAMARK_B (flex-grow). Línurnar raðast enn
 * á grunnbreiddinni FLIS_B, svo stærri mynd ýtir engu niður í nýja línu. Myndin
 * fyllir rammann (object-fit:cover): hlutföllin haldast, jaðrar skerast og
 * stækkunin sýnir alla myndina — hún teygist enn ALDREI.
 *
 * Og: „eða bara link sem sýnir myndina frá google maps". Flísin fær hlekkina
 * Google og Já á heimilisfang félagsins (sjást við sveimu, alltaf á snertiskjá).
 * Opinberar hlekkjaslóðir: enginn lykill, ekkert sótt sjálfvirkt. Þar má afrita
 * myndina og líma yfir flísina. Sjálfvirk sókn frá Já var prófuð 13.09: myndin
 * sjálf hleðst inn á okkar síðu, en til að finna rétta mynd þarf innri leit Já
 * sem robots.txt bannar vélum og engir birtir skilmálar leyfa — bíður Agnars.
 *
 * ── GEYMSLA ───────────────────────────────────────────────────────────────
 * Byggingarmyndin er GÖGN, ekki útlitsval — hún á að sjást á öllum fjórum
 * vélunum. Skráin fer í Supabase-geymsluna `verkbord-files` (sama og 364 notar)
 * og vísunin í AppSettings `co_bygging_mynd` (atómísk sameining á þjóni).
 * `_ny` lokar ósamstillta gatinu: AppSettings.save er async og AppSettings.path
 * skilar gamla gildinu þar til RPC-ið svarar (sama gildra og 261, 291, 274).
 *
 * Símamyndir eru ~4000 px og nokkur MB. Myndin er minnkuð í 1600 px langhlið
 * (JPEG 0,85) ÁÐUR en hún fer upp: ~250 KB í stað ~4 MB, skörp í stækkun, og
 * bannerinn hleðst ekki hægt. Eldri skrá er ALDREI eytt úr geymslunni þegar skipt
 * er um mynd — aðeins vísunin.
 *
 * PRÓFAÐ 10.09.2026 (fyrri útgáfa, sama myndaleið): prufumynd dregin inn →
 * minnkuð → geymsla → þjónn; breið mynd (2,4) og ferningur (1,0) héldu nákvæmlega
 * sínum hlutföllum í flís og stækkun; Escape lokar. Prófgögn hreinsuð á eftir.
 */
(function () {
  'use strict';
  if (window.__byggingMynd) return;
  window.__byggingMynd = true;

  var TAG = '[bygging-mynd]';
  var LYKILL = 'co_bygging_mynd';
  var BUCKET = 'verkbord-files';
  var HOLF = 'co-mynd';
  var FLIS_B = 190, FLIS_H = 108;         // lágmark flísar — línurnar raðast á þessari breidd
  var HAMARK_B = 340;                     // v3: flísin vex í laust pláss upp að þessu (≈ 16:9 í fullri hæð)
  var HAMARK = 1600;                      // lengsta hlið eftir minnkun

  function sbKlient() { return window.DB && DB.sb; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function coIdNu() {
    var m = String(location.hash || '').match(/#(?:company|companies)\/(\d+)/);
    if (m) return +m[1];
    var el = document.querySelector('#companies-main [data-co-id]');
    var v = el && +el.getAttribute('data-co-id');
    return v || null;
  }

  // v3: heimilisfangið eins og bannerinn sýnir það (features.js: „📍 <b>…</b>“).
  function heimilisfangNu() {
    var b = document.querySelector('#companies-main .co-banner .co-banner-facts b') ||
      document.querySelector('.co-banner .co-banner-facts b');
    return b ? String(b.textContent || '').trim() : '';
  }
  // Opinberar hlekkjaslóðir: Google Maps sýnir götumynd efst í spjaldinu, Já sýnir
  // mynd af húsinu. Ekkert er sótt héðan — notandinn opnar og afritar sjálfur.
  function hlekkirHtml(adr) {
    if (!adr) return '';
    var q = encodeURIComponent(adr);
    return '<div class="co-mynd-hlekkir">' +
      '<a href="https://www.google.com/maps/search/?api=1&amp;query=' + q + '" target="_blank" rel="noopener" ' +
        'title="Opna heimilisfangið í Google Maps (götumynd efst)">Google</a>' +
      '<a href="https://ja.is/kort/?q=' + q + '" target="_blank" rel="noopener" ' +
        'title="Opna heimilisfangið á Já-korti (mynd af húsinu)">Já</a>' +
    '</div>';
  }

  // ── Lesa / skrifa ───────────────────────────────────────────────────────
  var _ny = new Map();
  function lesaMynd(coId) {
    // 17.09.2026 yfirferð: þögnin er RÉTT hér — LESTUR þar sem null þýðir „engin
    // mynd skráð", sem er gild staða. Skrifleiðin (skrifaMynd) kastar rétt þegar
    // AppSettings.save skilar false, svo vistun getur ekki horfið þögult.
    var k = String(coId), server = null;
    try {
      var m = (window.AppSettings && AppSettings.path && AppSettings.path(LYKILL)) || {};
      server = m[k] || null;
    } catch (_) {}
    if (_ny.has(k)) {
      var o = _ny.get(k);
      if (JSON.stringify(server) === JSON.stringify(o)) _ny.delete(k); else return o;
    }
    return server;
  }
  async function skrifaMynd(coId, gildi) {
    var k = String(coId);
    _ny.set(k, gildi);
    var p = {}; p[k] = gildi;
    var patch = {}; patch[LYKILL] = p;
    if (!window.AppSettings || !AppSettings.save) throw new Error('AppSettings ekki tiltækt');
    var ok = await AppSettings.save(patch);
    if (ok === false) throw new Error('vistun á þjóni mistókst');
  }

  // ── Stílar ──────────────────────────────────────────────────────────────
  function stilar() {
    if (document.getElementById('co-mynd-css')) return;
    var s = document.createElement('style');
    s.id = 'co-mynd-css';
    s.textContent = [
      // v3: flísin teygir sig í hæð línunnar og vex í laust pláss upp að HAMARK_B.
      // Línurnar raðast á grunnbreiddinni (flex-basis FLIS_B), svo stærri mynd
      // ýtir engu niður í nýja línu; afgangurinn fer í margin-left:auto.
      '.' + HOLF + '{display:flex;margin-left:auto;flex:1 1 ' + FLIS_B + 'px;min-width:' + FLIS_B + 'px;' +
        'max-width:' + HAMARK_B + 'px;align-self:stretch}',
      // 363 setur margin-left:auto á .co-bupp; standi myndin á undan tekur
      // bilið hennar við og línurnar sitja þétt við hliðina.
      '.' + HOLF + ' + .co-bupp{margin-left:16px}',
      // „almost transparent lines" — daufur brotinn rammi, lýsist við hover.
      '.co-mynd-flis{position:relative;flex:1 1 auto;min-height:' + FLIS_H + 'px;border:1px dashed rgba(255,255,255,.22);' +
        'border-radius:10px;background:rgba(255,255,255,.03);display:flex;align-items:center;justify-content:center;' +
        'overflow:hidden;cursor:pointer;outline:none;transition:border-color .15s,background .15s}',
      '.co-mynd-flis:hover,.co-mynd-flis:focus{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.07)}',
      // Með mynd boðar brotni ramminn ekki lengur tóman reit — daufur heill rammi.
      '.co-mynd-flis.med{border-style:solid;border-color:rgba(255,255,255,.14)}',
      '.co-mynd-flis.drag{border-color:#93c5fd;border-style:solid;background:rgba(147,197,253,.12)}',
      '.co-mynd-flis.villa{border-color:#f87171}',
      // v3: myndin fyllir rammann og heldur hlutföllum (cover) — jaðrar skerast,
      // ekkert teygist; stækkunin sýnir alla myndina.
      '.co-mynd-vefja{position:absolute;inset:0;line-height:0}',
      '.co-mynd-vefja img{display:block;width:100%;height:100%;max-width:none;max-height:none;object-fit:cover}',
      '.co-mynd-tomt{font-size:11px;line-height:1.4;color:rgba(255,255,255,.45);text-align:center;padding:8px}',
      '.co-mynd-engin{font:600 13px/1.35 system-ui,sans-serif;color:rgba(255,255,255,.9);position:relative;z-index:1}',
      // Loftmyndin er sjálfvirk — hún á að sjást aðeins daufari en mynd sem Agnar setti inn,
      // og bera merki svo hún sé aldrei ruglað við hana (sjá loftmynd() neðar).
      '.co-mynd-loft img{opacity:.9}',
      '.co-mynd-loftmerki{position:absolute;left:7px;bottom:7px;background:rgba(0,0,0,.55);color:#fff;' +
        'font:600 10px/1 system-ui,sans-serif;padding:3px 7px;border-radius:999px;letter-spacing:.02em}',
      '.co-mynd-tomt b{display:block;font-size:20px;margin-bottom:3px;color:rgba(255,255,255,.6)}',
      '.co-mynd-tomt small{display:block;font-size:9.5px;color:rgba(255,255,255,.32);margin-top:2px}',
      '.co-mynd-x{position:absolute;top:4px;right:5px;width:20px;height:20px;border-radius:50%;border:0;padding:0;' +
        'background:rgba(0,0,0,.55);color:#fff;font-size:13px;line-height:20px;cursor:pointer;opacity:0;transition:opacity .15s}',
      '.co-mynd-flis:hover .co-mynd-x{opacity:1}',
      // v2: snertiskjár á enga sveimu — × sést þá alltaf (og er stærra).
      '@media (hover:none){.co-mynd-flis .co-mynd-x{opacity:1;width:28px;height:28px;line-height:28px;font-size:16px}}',
      '.co-mynd-x:hover{background:#dc2626}',
      // v3: hlekkir á götumynd — sjást við sveimu/fókus, alltaf á snertiskjá.
      // v4 20.09.2026 (Agnar: „væri fínt að geta sett inn aðra mynd úr símanum líka … pínulítinn takka efst í hornið. Upload").
      // Leiðin var til (smellur á mynd → stækkun → „Skipta um mynd"; smellur á tóma flís) en ósýnileg — og með sjálfsóttri
      // loftmynd í flísinni leit hún út fyrir að vera full. Nú er 📷 ALLTAF sýnilegur í horninu og opnar myndaval/myndavél beint.
      '.co-mynd-upp{position:absolute;left:6px;top:6px;z-index:2;width:26px;height:26px;padding:0;border:1px solid rgba(255,255,255,.55);border-radius:8px;background:rgba(15,23,42,.62);color:#fff;font-size:13px;line-height:24px;text-align:center;cursor:pointer;opacity:.9}',
      '.co-mynd-upp:hover{background:#1d4ed8;opacity:1}',
      '@media (hover:none){.co-mynd-upp{width:32px;height:32px;line-height:30px;font-size:15px}}',
      '.co-mynd-hlekkir{position:absolute;left:6px;bottom:6px;display:flex;gap:4px;line-height:normal;opacity:0;transition:opacity .15s}',
      '.co-mynd-flis:hover .co-mynd-hlekkir,.co-mynd-flis:focus-within .co-mynd-hlekkir{opacity:1}',
      '@media (hover:none){.co-mynd-flis .co-mynd-hlekkir{opacity:1}}',
      '.co-mynd-hlekkir a{font-size:10.5px;font-weight:700;line-height:18px;padding:0 7px;border-radius:9px;' +
        'background:rgba(0,0,0,.62);color:#fff;text-decoration:none;white-space:nowrap}',
      '.co-mynd-hlekkir a:hover{background:#1d4ed8;color:#fff}',
      // Stækkun
      '#co-mynd-ljos{position:fixed;inset:0;z-index:99999;background:rgba(8,10,14,.88);display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;gap:14px;padding:20px;box-sizing:border-box;cursor:zoom-out}',
      '#co-mynd-ljos img{display:block;max-width:92vw;max-height:74vh;width:auto;height:auto;border-radius:8px;' +
        'box-shadow:0 20px 60px rgba(0,0,0,.6);cursor:default}',
      '#co-mynd-ljos .co-mynd-takkar{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}',
      '#co-mynd-ljos button{font:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:9px;border:1px solid #475569;' +
        'background:#1e293b;color:#f1f5f9;cursor:pointer;min-height:40px}',
      '#co-mynd-ljos button:hover{background:#334155}',
      '#co-mynd-ljos button.co-mynd-eyda{border-color:#7f1d1d;background:#3b1111;color:#fecaca}',
      '#co-mynd-ljos button.co-mynd-eyda:hover{background:#991b1b;color:#fff}',
      // Sími/app: bannerinn staflast — flísin tekur fulla breidd.
      'html[data-viewmode="mobile"] .' + HOLF + ',body.appmode .' + HOLF + '{flex-basis:100%;max-width:none;margin-left:0;margin-top:10px}',
      'html[data-viewmode="mobile"] .co-mynd-flis,body.appmode .co-mynd-flis{width:100%;height:140px}',
      // 04.10.2026 (Agnar: „skelfileg nýting á plássi í company profile"): tómur kassi („engin mynd") tók 140 px í
      // símanum. Án myndar er hann aðeins ræma með myndavélar-takkanum.
      'html[data-viewmode="mobile"] .co-mynd-flis:has(> .co-mynd-engin),body.appmode .co-mynd-flis:has(> .co-mynd-engin){height:44px}',
      // MÆLT 13.09.2026 í 375 px: mobile-baseline-css setur `.view … img{height:auto}` með
      // vægi (0,6,2), svo myndin fékk eðlilega hæð og skarst neðst (2:1 → 154 px í 140 px
      // flís; standandi símamynd hefði sýnt aðeins efsta hlutann). !important heldur henni í rammanum.
      'html[data-viewmode="mobile"] .co-mynd-vefja img,body.appmode .co-mynd-vefja img{width:100%!important;height:100%!important;' +
        'max-width:none!important;object-fit:cover}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }

  // ── Stækkun ─────────────────────────────────────────────────────────────
  function lokaLjos() { var o = document.getElementById('co-mynd-ljos'); if (o) o.remove(); }
  function opnaLjos(url, coId) {
    lokaLjos();
    var o = document.createElement('div');
    o.id = 'co-mynd-ljos';
    o.innerHTML = '<img alt="Bygging">' +
      '<div class="co-mynd-takkar">' +
        (coId
          ? '<button type="button" data-a="skipta" title="Taka mynd eða velja úr myndasafni">📷 Skipta um mynd</button>' +
            '<button type="button" data-a="eyda" class="co-mynd-eyda" title="Fjarlægja myndina af byggingunni">🗑 Fjarlægja</button>'
          : '') +
        '<button type="button" data-a="loka">✕ Loka</button>' +
      '</div>';
    var img = o.querySelector('img');
    img.src = url;
    Array.prototype.forEach.call(o.querySelectorAll('button[data-a]'), function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = b.getAttribute('data-a');
        if (a === 'loka') { lokaLjos(); return; }
        if (a === 'skipta') { veljaMynd(coId); return; }
        if (a === 'eyda') fjarlaegja(coId);
      });
    });
    // Smellur á bakgrunn lokar; smellur á myndina sjálfa gerir það ekki.
    o.addEventListener('click', function (e) { if (e.target === o) lokaLjos(); });
    img.addEventListener('click', function (e) { e.stopPropagation(); });
    document.body.appendChild(o);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lokaLjos(); });

  // v2: velja nýja mynd — í síma býður vafrinn upp á myndavél eða myndasafn.
  function veljaMynd(coId) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      lokaLjos();
      var flis = document.querySelector('.' + HOLF + ' .co-mynd-flis');
      if (flis) hladaUpp(coId, f, flis);
    });
    inp.click();
  }
  async function fjarlaegja(coId) {
    if (!confirm('Fjarlægja myndina af byggingunni?\n(Skráin sjálf helst í geymslunni.)')) return;
    lokaLjos();
    try { await skrifaMynd(coId, null); endurteikna(true); }
    catch (err) {
      var flis = document.querySelector('.' + HOLF + ' .co-mynd-flis');
      if (flis) villaA(flis, 'Mistókst — ' + ((err && err.message) || ''));
    }
  }

  // ── Minnka mynd fyrir upphleðslu ────────────────────────────────────────
  function minnka(skra) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(skra);
      var i = new Image();
      i.onload = function () {
        try {
          var w = i.naturalWidth, h = i.naturalHeight;
          var k = Math.min(1, HAMARK / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * k); c.height = Math.round(h * k);
          c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(function (b) { b ? resolve(b) : reject(new Error('gat ekki minnkað myndina')); }, 'image/jpeg', 0.85);
        } catch (err) { URL.revokeObjectURL(url); reject(err); }
      };
      i.onerror = function () { URL.revokeObjectURL(url); reject(new Error('skráin er ekki mynd sem vafrinn les')); };
      i.src = url;
    });
  }

  async function hladaUpp(coId, skra, flis) {
    var s = sbKlient();
    if (!s) { villaA(flis, 'Engin gagnagrunnstenging'); return; }
    if (!skra || !/^image\//.test(skra.type || '')) { villaA(flis, 'Þetta er ekki mynd'); return; }
    flis.classList.remove('villa');
    flis.innerHTML = '<div class="co-mynd-tomt"><b>⏳</b>Hleð upp…</div>';
    try {
      var blob = await minnka(skra);
      var hreint = String(skra.name || 'bygging').replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'bygging';
      var slod = 'bygging/' + coId + '/' + Date.now() + '_' + hreint + '.jpg';
      var up = await s.storage.from(BUCKET).upload(slod, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      var pub = s.storage.from(BUCKET).getPublicUrl(slod);
      var url = pub && pub.data && pub.data.publicUrl;
      if (!url) throw new Error('fékk enga slóð á myndina');
      await skrifaMynd(coId, { url: url, slod: BUCKET + '/' + slod, ts: new Date().toISOString(), uppspretta: 'handvirkt' });
      endurteikna(true);
    } catch (err) {
      console.warn(TAG, err);
      try { if (window.logProblem) window.logProblem('bygging_mynd_failed', 'co ' + coId + ' — ' + ((err && err.message) || err)); } catch (_) {}
      villaA(flis, 'Mistókst — ' + ((err && err.message) || 'reyndu aftur'));
    }
  }
  function villaA(flis, texti) {
    flis.classList.add('villa');
    flis.innerHTML = '<div class="co-mynd-tomt" style="color:#fecaca"><b>⚠</b>' + esc(texti) + '</div>';
    setTimeout(function () { endurteikna(true); }, 4000);
  }

  // ── Loftmynd ────────────────────────────────────────────────────────────
  // 2026-09-16 (ósk Agnars: „ef þú finnur aðra lausn á myndamálinu"). Tóma flísin er
  // ekki lengur tóm: við teiknum loftmynd af heimilisfanginu úr SÖMU Esri-þjónustu og
  // kortið notar — ein fyrirspurn, enginn lykill, ekkert afrit af Google eða Já.
  // Myndin er MERKT „Loftmynd" svo hún sé aldrei ruglað við mynd sem Agnar límdi inn
  // (regla hans 16.09.: sjálfsótt gögn bera merki og taka aldrei fram yfir okkar eigin).
  // Hnitin koma úr okkar eigin /api/geocode (Nominatim + skyndiminni í grunni). Finnist
  // heimilisfangið ekki stendur flísin tóm eins og áður — engin ágiskun.
  var _loftHnit = {};
  // Hnit sem kortið hefur þegar vistað (_slokk_gc) — sama lykill og mapfix/156.
  function hnitUrMinni(adr) {
    if (_loftHnit[adr]) return _loftHnit[adr];
    try {
      var gc = JSON.parse(localStorage.getItem('_slokk_gc') || '{}');
      var p = gc[adr];
      var lon = p && (typeof p.lon === 'number' ? p.lon : p.lng);
      if (p && typeof p.lat === 'number' && typeof lon === 'number') return { lat: p.lat, lon: lon };
    } catch (_) {}
    return null;
  }
  function loftmynd(flis, adr) {
    if (!adr || !flis) return;
    var setja = function (lat, lon) {
      if (!lat || !lon || !flis.isConnected) return;
      var d = 0.00085;                                  // ~190 m breiður rammi
      var bbox = (lon - d * 2.2) + ',' + (lat - d) + ',' + (lon + d * 2.2) + ',' + (lat + d);
      var vefja = document.createElement('div');
      vefja.className = 'co-mynd-vefja co-mynd-loft';
      var img = document.createElement('img');
      img.alt = 'Loftmynd af heimilisfanginu';
      img.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export' +
        '?bbox=' + bbox + '&bboxSR=4326&imageSR=3857&size=600,320&format=jpg&f=image';
      img.addEventListener('error', function () {
        try { vefja.remove(); } catch (_) {}
        var t = flis.querySelector('.co-mynd-engin');
        if (t) t.hidden = false;
      });
      var tomt = flis.querySelector('.co-mynd-engin');
      if (tomt) tomt.hidden = true;
      vefja.appendChild(img);
      var merki = document.createElement('span');
      merki.className = 'co-mynd-loftmerki';
      merki.textContent = '🛰 Loftmynd';
      merki.title = 'Sjálfvirk loftmynd af heimilisfanginu (Esri) — ekki mynd sem þú settir inn. ' +
        'Límdu mynd yfir til að skipta.';
      vefja.appendChild(merki);
      flis.insertBefore(vefja, flis.firstChild);
    };
    var minni = hnitUrMinni(adr);
    if (minni) { _loftHnit[adr] = minni; setja(minni.lat, minni.lon); }
    // Heimilisfangið er á færslunni (þaðan kemur adr). Húsið færist ekki —
    // /api/geocode aðeins þegar ýtt er á Endurnýja og hnitin eru ekki þegar til.
    var coId = coIdNu();
    if (minni) return;
    if (!(coId && window.__coMaEndurnyja && window.__coMaEndurnyja(coId, 'kort'))) return;
    fetch('/api/geocode?q=' + encodeURIComponent(adr))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (g) {
        if (!g || !g.lat) return;
        _loftHnit[adr] = { lat: +g.lat, lon: +g.lon };
        setja(+g.lat, +g.lon);
      })
      .catch(function () {});
  }

  var _hnitLoford = new Map();
  var _myndBid = new Set();
  function vistaHnit(adr, lat, lon) {
    _loftHnit[adr] = { lat: lat, lon: lon };
    try {
      var gc = JSON.parse(localStorage.getItem('_slokk_gc') || '{}');
      gc[adr] = { lat: lat, lng: lon };
      localStorage.setItem('_slokk_gc', JSON.stringify(gc));
    } catch (_) {}
  }
  // Eitt les af geocode_cache. Aldrei /api/geocode. Sama loforð ef loftmynd og
  // útilitsmynd biðja á sama tíma — seinni kallari má ekki halda að hnit vanti.
  function hnitEinusinni(adr) {
    var minni = hnitUrMinni(adr);
    if (minni) { _loftHnit[adr] = minni; return Promise.resolve(minni); }
    if (!adr) return Promise.resolve(null);
    if (_hnitLoford.has(adr)) return _hnitLoford.get(adr);
    var p = (async function () {
      try {
        var s = sbKlient();
        if (!s) return null;
        var r = await s.from('geocode_cache').select('lat,lng').eq('query', adr).limit(1);
        var row = r && r.data && r.data[0];
        var lon = row && (typeof row.lon === 'number' ? row.lon : row.lng);
        if (row && typeof row.lat === 'number' && typeof lon === 'number') {
          vistaHnit(adr, row.lat, lon);
          return _loftHnit[adr];
        }
      } catch (_) {}
      return null;
    })();
    _hnitLoford.set(adr, p);
    return p;
  }
  function lesaReynd(coId, adr) {
    try {
      var o = JSON.parse(localStorage.getItem('husmynd_reynd_v1_' + coId) || 'null');
      if (o && o.adr === adr) return o;
    } catch (_) {}
    return null;
  }
  function vistaReynd(coId, adr, stada) {
    try { localStorage.setItem('husmynd_reynd_v1_' + coId, JSON.stringify({ adr: adr, stada: stada })); } catch (_) {}
  }
  function erVerndud(m) {
    // Handvirkt, tóm uppspretta og allt sem á þegar slóð er skilið eftir.
    return !!(m && m.url);
  }
  function b64Blob(b64, tegund) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: tegund || 'image/jpeg' });
  }
  async function vistaUtan(coId, adr, svar) {
    if (erVerndud(lesaMynd(coId))) return false;
    var s = sbKlient();
    if (!s) return false;
    var blob = b64Blob(svar.image, svar.contentType || 'image/jpeg');
    var nafn = String(svar.heimild || 'borgarvefsja-2018').replace(/[^a-z0-9-]/gi, '') || 'utan';
    var slod = 'bygging/' + coId + '/' + nafn + '.jpg';
    var up = await s.storage.from(BUCKET).upload(slod, blob, { contentType: 'image/jpeg', upsert: true });
    if (up.error) throw up.error;
    var pub = s.storage.from(BUCKET).getPublicUrl(slod);
    var url = pub && pub.data && pub.data.publicUrl;
    if (!url) return false;
    if (erVerndud(lesaMynd(coId))) return false;
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now();
    await skrifaMynd(coId, {
      url: url, slod: BUCKET + '/' + slod, ts: new Date().toISOString(),
      heimilisfang: adr, engin: false,
      uppspretta: svar.heimild || 'borgarvefsja-2018',
      heimild: svar.heimild || 'borgarvefsja-2018',
      attribution: svar.attribution || 'Borgarvefsjá · loftmynd 17.7.2018'
    });
    return true;
  }
  function erMapisPost(adr) {
    var t = String(adr || '');
    var eftir = t.split(',').slice(1).join(' ');
    return /\b(200|201|202|203|210|211|212|225|220|221)\b/.test(eftir)
      || /\b(200|201|202|203|210|211|212|225|220|221)\b/.test(t);
  }
  async function vistaEngin(coId, adr, kodi, svar) {
    if (erVerndud(lesaMynd(coId))) return false;
    await skrifaMynd(coId, {
      engin: true, ts: new Date().toISOString(), heimilisfang: adr,
      uppspretta: (svar && svar.heimild) || 'borgarvefsja-2018',
      heimild: kodi || 'engin-mynd',
      attribution: (svar && svar.attribution) || '',
      skilabod: 'engin mynd'
    });
    return true;
  }
  // Ein tilraun þegar engin mynd er vistuð. Næsta opnun les co_bygging_mynd
  // og kallar ekki aftur. Tími/netvilla er ekki vistuð sem engin, en þessi
  // síðuhleðsla reynir ekki aftur.
  var _reynd = new Set();
  async function einUtanMynd(coId, adr) {
    if (!coId || !adr) return;
    if (!window.AppSettings || !AppSettings.isLoaded || !AppSettings.isLoaded()) return;
    var m = lesaMynd(coId);
    if (erVerndud(m)) return;
    if (m && m.engin && String(m.heimilisfang || '') === String(adr)) {
      // Borgarvefsjá er Reykjavík. Ein loftmyndatilraun fyrir map.is-bæina.
      var src = String(m.uppspretta || '');
      if (!(erMapisPost(adr) && src.indexOf('borgarvefsja') === 0)) return;
    }
    var lykill = coId + '|' + adr;
    if (_reynd.has(lykill) || _myndBid.has(coId)) return;
    _reynd.add(lykill);
    _myndBid.add(coId);
    try {
      var r = await fetch('/api/husmynd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: adr })
      });
      var svar = null;
      try { svar = await r.json(); } catch (_) { svar = null; }
      if (erVerndud(lesaMynd(coId))) return;
      if (svar && svar.ok && svar.image) {
        await vistaUtan(coId, adr, svar);
        endurteikna(true);
        return;
      }
      if (svar && svar.error === 'timi') return;
      await vistaEngin(coId, adr, (svar && svar.error) || 'engin', svar);
      endurteikna(true);
    } catch (_) {}
    finally {
      _myndBid.delete(coId);
    }
  }
  function synaMyndEdaTomt(flis, coId) {
    einUtanMynd(coId, heimilisfangNu());
  }

  // ── Flísin ──────────────────────────────────────────────────────────────
  function smidaFlis(coId) {
    var flis = document.createElement('div');
    flis.className = 'co-mynd-flis';
    flis.tabIndex = 0;
    var m = lesaMynd(coId);
    var hlekkir = hlekkirHtml(heimilisfangNu());
    var UPP = '<button type="button" class="co-mynd-upp" title="Setja inn mynd — taka mynd eða velja úr myndasafni" aria-label="Setja inn mynd">📷</button>';
    if (m && m.url) {
      flis.classList.add('med');
      flis.title = 'Mynd af byggingunni — smelltu til að stækka, skipta um eða fjarlægja · límdu nýja yfir til að skipta';
      var src = String(m.uppspretta || '');
      var mapisLoft = src.indexOf('mapis-loftmynd') === 0;
      var borgarLoft = src.indexOf('borgarvefsja') === 0;
      // 05.10.2026 (Agnar: „taka hvert fyrirtækið fyrir sig og fletta upp heimilisfangi og taka screenshot af fyrsta sem
      // kemur upp og setja inn"): fyrsta mynd fyrirtækisins (eða nágranna á sama heimilisfangi) af Google Maps, sótt í
      // lotu (E:/pascal-profun/maps-mynd.cjs + maps-setja.cjs). Sjálfsótt → ber merki, eins og loftmyndirnar.
      var googleMynd = src.indexOf('google-maps') === 0;
      var merki = (mapisLoft || borgarLoft || googleMynd)
        ? '<span class="co-mynd-loftmerki" title="' + esc(googleMynd
          ? ('Fyrsta mynd af Google Maps' + (m.stadur ? ' — ' + m.stadur : '') + '. Sjálfsótt, ekki mynd sem þú settir inn — límdu þína eigin yfir.')
          : mapisLoft
          ? 'Loftmynd úr map.is (Loftmyndir). Húsið sést að ofan. Þetta er ekki götumynd og ekki mynd sem þú settir inn.'
          : 'Loftmynd úr Borgarvefsjá 2018. Ekki mynd sem þú settir inn.') + '">' +
          (googleMynd ? 'Google Maps' : mapisLoft ? 'Loftmynd' : 'Borgarvefsjá') + '</span>'
        : '';
      flis.innerHTML = '<div class="co-mynd-vefja"><img alt="Bygging"></div>' + merki +
        '<button type="button" class="co-mynd-x" title="Fjarlægja myndina">×</button>' + UPP + hlekkir;
      var mynd = flis.querySelector('img');
      mynd.addEventListener('error', function () {
        var vef = flis.querySelector('.co-mynd-vefja');
        if (vef) vef.remove();
        var pill = flis.querySelector('.co-mynd-loftmerki');
        if (pill) pill.remove();
        flis.classList.remove('med');
        if (!flis.querySelector('.co-mynd-engin')) {
          var t = document.createElement('div');
          t.className = 'co-mynd-tomt co-mynd-engin';
          t.textContent = 'engin mynd';
          flis.appendChild(t);
        }
      });
      mynd.src = m.url;
      flis.addEventListener('click', function (e) {
        if (e.target.closest('.co-mynd-x') || e.target.closest('.co-mynd-hlekkir') || e.target.closest('.co-mynd-upp')) return;
        opnaLjos(m.url, coId);
      });
      flis.querySelector('.co-mynd-x').addEventListener('click', function (e) {
        e.stopPropagation();
        fjarlaegja(coId);
      });
    } else {
      flis.title = 'Límdu mynd af byggingunni (Ctrl+V með músina hér), dragðu hana inn, eða smelltu · Google/Já opna götumynd af heimilisfanginu';
      // Agnar: „og ekki hafa neinn texta þarna með að líma mynd“. Tóm flís er
      // AÐEINS daufi ramminn; leiðbeiningin lifir í title (sést við hover).
      // v3: hlekkirnir eru ósýnilegir þar til músin fer yfir flísina.
      flis.innerHTML = UPP + hlekkir + '<div class="co-mynd-tomt co-mynd-engin">engin mynd</div>';
      synaMyndEdaTomt(flis, coId);
      flis.addEventListener('click', function (e) {
        if (e.target.closest('.co-mynd-hlekkir') || e.target.closest('.co-mynd-upp')) return;
        veljaMynd(coId);
      });
    }
    var upp = flis.querySelector('.co-mynd-upp');
    if (upp) upp.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); veljaMynd(coId); });
    // Draga inn — virkar líka yfir mynd sem er fyrir (skiptir um).
    flis.addEventListener('dragover', function (e) { e.preventDefault(); flis.classList.add('drag'); });
    flis.addEventListener('dragleave', function () { flis.classList.remove('drag'); });
    flis.addEventListener('drop', function (e) {
      e.preventDefault(); flis.classList.remove('drag');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) hladaUpp(coId, f, flis);
    });
    return flis;
  }

  // ── Festing í bannerinn ─────────────────────────────────────────────────
  function endurteikna(thvinga) {
    var banner = document.querySelector('#companies-main .co-banner') || document.querySelector('.co-banner');
    if (!banner) return;
    var coId = coIdNu(); if (!coId) return;
    stilar();
    var box = banner.querySelector('.' + HOLF);
    var m = lesaMynd(coId);
    // v3: heimilisfangið er í undirskriftinni svo hlekkirnir fylgi breyttu heimilisfangi.
    var adrNuna = heimilisfangNu();
    var sig = coId + '|' + ((m && m.url) || '') + '|' + adrNuna;
    if (box && !thvinga && box.dataset.sig === sig) {
      if (!(m && m.url)) einUtanMynd(coId, adrNuna);
      return;
    }
    if (box) box.remove();
    box = document.createElement('div');
    box.className = HOLF;
    box.dataset.sig = sig;
    box.appendChild(smidaFlis(coId));
    var vid = banner.querySelector('.co-bupp') || banner.querySelector('.co-banner-right');
    if (vid) banner.insertBefore(box, vid); else banner.appendChild(box);
  }

  // Líma: aðeins þegar músin er yfir flísinni (eða hún hefur fókus) og ekki er
  // verið að skrifa í reit — annars myndi Ctrl+V í Athugasemd stela myndinni.
  document.addEventListener('paste', function (e) {
    var flis = document.querySelector('.' + HOLF + ' .co-mynd-flis');
    if (!flis) return;
    var virkt = document.activeElement;
    var iReit = virkt && virkt !== flis && (/^(INPUT|TEXTAREA|SELECT)$/.test(virkt.tagName) || virkt.isContentEditable);
    if (iReit) return;
    if (!(flis.matches(':hover') || virkt === flis)) return;
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && /^image\//.test(items[i].type)) {
        var f = items[i].getAsFile();
        if (f) { e.preventDefault(); hladaUpp(coIdNu(), f, flis); return; }
      }
    }
  });

  setInterval(function () { endurteikna(false); }, 1200);
  document.addEventListener('DOMContentLoaded', function () { endurteikna(false); });
  endurteikna(false);

  window.ByggingMynd = { endurteikna: endurteikna, lesaMynd: lesaMynd, opnaLjos: opnaLjos };
  console.log(TAG, 'virkt — vistuð mynd, annars ein Borgarvefsjá-tilraun');
})();
