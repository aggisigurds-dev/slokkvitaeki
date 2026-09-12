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
  var FLIS_B = 190, FLIS_H = 108;         // ein flís — fyllir svæðið; myndin passar INN í hana
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

  // ── Lesa / skrifa ───────────────────────────────────────────────────────
  var _ny = new Map();
  function lesaMynd(coId) {
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
      '.' + HOLF + '{display:flex;margin-left:auto;flex:none;align-self:center}',
      // 363 setur margin-left:auto á .co-bupp; standi myndin á undan tekur
      // bilið hennar við og línurnar sitja þétt við hliðina.
      '.' + HOLF + ' + .co-bupp{margin-left:16px}',
      // „almost transparent lines" — daufur brotinn rammi, lýsist við hover.
      '.co-mynd-flis{position:relative;width:' + FLIS_B + 'px;height:' + FLIS_H + 'px;border:1px dashed rgba(255,255,255,.22);' +
        'border-radius:10px;background:rgba(255,255,255,.03);display:flex;align-items:center;justify-content:center;' +
        'overflow:hidden;cursor:pointer;outline:none;transition:border-color .15s,background .15s}',
      '.co-mynd-flis:hover,.co-mynd-flis:focus{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.07)}',
      '.co-mynd-flis.drag{border-color:#93c5fd;border-style:solid;background:rgba(147,197,253,.12)}',
      '.co-mynd-flis.villa{border-color:#f87171}',
      // Vefjan faðmar myndina; max-stærð í px svo hún passi INN og teygist aldrei.
      '.co-mynd-vefja{position:relative;display:inline-block;line-height:0}',
      '.co-mynd-vefja img{display:block;max-width:' + FLIS_B + 'px;max-height:' + FLIS_H + 'px;width:auto;height:auto}',
      '.co-mynd-tomt{font-size:11px;line-height:1.4;color:rgba(255,255,255,.45);text-align:center;padding:8px}',
      '.co-mynd-tomt b{display:block;font-size:20px;margin-bottom:3px;color:rgba(255,255,255,.6)}',
      '.co-mynd-tomt small{display:block;font-size:9.5px;color:rgba(255,255,255,.32);margin-top:2px}',
      '.co-mynd-x{position:absolute;top:4px;right:5px;width:20px;height:20px;border-radius:50%;border:0;padding:0;' +
        'background:rgba(0,0,0,.55);color:#fff;font-size:13px;line-height:20px;cursor:pointer;opacity:0;transition:opacity .15s}',
      '.co-mynd-flis:hover .co-mynd-x{opacity:1}',
      // v2: snertiskjár á enga sveimu — × sést þá alltaf (og er stærra).
      '@media (hover:none){.co-mynd-flis .co-mynd-x{opacity:1;width:28px;height:28px;line-height:28px;font-size:16px}}',
      '.co-mynd-x:hover{background:#dc2626}',
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
      'html[data-viewmode="mobile"] .' + HOLF + ',body.appmode .' + HOLF + '{flex-basis:100%;margin-left:0;margin-top:10px}',
      'html[data-viewmode="mobile"] .co-mynd-flis,body.appmode .co-mynd-flis{width:100%;height:140px}',
      'html[data-viewmode="mobile"] .co-mynd-vefja img,body.appmode .co-mynd-vefja img{max-width:100%;max-height:140px}',
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

  // ── Flísin ──────────────────────────────────────────────────────────────
  function smidaFlis(coId) {
    var flis = document.createElement('div');
    flis.className = 'co-mynd-flis';
    flis.tabIndex = 0;
    var m = lesaMynd(coId);
    if (m && m.url) {
      flis.title = 'Mynd af byggingunni — smelltu til að stækka, skipta um eða fjarlægja · límdu nýja yfir til að skipta';
      flis.innerHTML = '<div class="co-mynd-vefja"><img alt="Bygging"></div>' +
        '<button type="button" class="co-mynd-x" title="Fjarlægja myndina">×</button>';
      flis.querySelector('img').src = m.url;
      flis.addEventListener('click', function (e) {
        if (e.target.closest('.co-mynd-x')) return;
        opnaLjos(m.url, coId);
      });
      flis.querySelector('.co-mynd-x').addEventListener('click', function (e) {
        e.stopPropagation();
        fjarlaegja(coId);
      });
    } else {
      flis.title = 'Límdu mynd af byggingunni (Ctrl+V með músina hér), dragðu hana inn, eða smelltu';
      // Agnar: „og ekki hafa neinn texta þarna með að líma mynd“. Tóm flís er
      // AÐEINS daufi ramminn; leiðbeiningin lifir í title (sést við hover).
      flis.innerHTML = '';
      flis.addEventListener('click', function () { veljaMynd(coId); });
    }
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
    var sig = coId + '|' + ((m && m.url) || '');
    if (box && !thvinga && box.dataset.sig === sig) return;   // ekkert breyst — engin DOM-skrif
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
  console.log(TAG, 'virkt v2 — mynd af byggingunni í bannernum (skipta/fjarlægja úr stækkun)');
})();
