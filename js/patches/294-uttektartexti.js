/* js/patches/294-uttektartexti.js — sjálfvirkur úttektartexti
   ─────────────────────────────────────────────────────────────────
   Þegar „✅ Staðfesta lista" er ýtt í ársskoðun myndast textinn sem á að standa
   í „📝 Upplýsingar um úttekt" — Elías skrifaði hann áður í hvert sinn, og með
   hundruðum skýrslna á ári er það umtalsverður tími.

   ORÐALAGIÐ (Agnar/Elías, skjalfest 30.07.2026 — röðin skiptir máli):
     1. Grunnur:      „Öll tæki yfirfarin og vottuð í lagi."
     2. Hleðsla / ónýtt / ný tæki skjóta sér inn á milli.
     3. Hausskipti:   „Skipta þurfti um nýjan haus á eina brunaslönguna."
                      (fleirtala beygist: tvær/þrjár/fjórar brunaslöngur)
     4. Slöngur SÍÐAST: „Brunaslöngur prófaðar á fullum þrýsting og vottaðar í lagi."
   Hausskiptin koma ALLTAF beint á undan slöngu-vottuninni svo hún endi
   setninguna.

   HVAÐAN GÖGNIN KOMA — og af hverju EKKI DOM-skröpun:
   Fyrri drög lásu ástandið með því að leita að `button.active` og lesa texta
   úr röðum. Það er brothætt: `.ut-svc`-hnapparnir bera klasann `on` (ekki
   `active`), „Nýtt" og „Ónýtt" byrja bæði á „n" í lágstöfum, og öll þrjú
   heitin eru þýdd. Þessi útgáfa les í staðinn BEINT úr sömu heimild og
   reikningurinn notar:
     · `UnitServicePicker.getChoice(coId, uid, type)` → yfirferd|hledsla|nyitt|onytt
     · `DB.cache.units` fyrir tækjalistann (sama og patch 224 teiknar)
     · `loadTripState(coId).extras` fyrir hausana (Brunaslöngustútur-vörulínan)
   Þar með getur textinn ALDREI sagt annað en reikningurinn.

   ÖRYGGI:
   · Skrifar ALDREI yfir texta sem er þegar í reitnum (hvorki handskrifaðan né
     fyrri sjálfvirkan) — reiturinn er heilagur, sbr. ALLTAF LEYFA VISTUN.
   · Vistar gegnum sama tripState-veg og reiturinn sjálfur, svo textinn lifir
     endurhleðslu (það dugir EKKI að setja `.value`).
   · Gerir ekkert nema listinn sé raunverulega LÆSTUR (staðfestur) — afhök
     hreyfir ekki við textanum.
*/
(function () {
  'use strict';
  if (window.__uttektartextiInstalled) return;
  window.__uttektartextiInstalled = true;
  var TAG = '[294-uttektartexti]';

  // Þolfall: brunaslanga er KVENkyns, tæki er HVORUGkyns.
  var KVK = ['', 'eina', 'tvær', 'þrjár', 'fjórar', 'fimm', 'sex', 'sjö', 'átta', 'níu', 'tíu'];
  var HK  = ['', 'eitt', 'tvö', 'þrjú', 'fjögur', 'fimm', 'sex', 'sjö', 'átta', 'níu', 'tíu'];
  function kvk(n) { return KVK[n] || String(n); }
  function hk(n) { return HK[n] || String(n); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Trip-state lykillinn er `slokk_trip_<coId>` (patch 129 línur 271/286) — EKKI
  // `trip_`, sem fyrri drög giskuðu á; sá lykill hefði skrifað í tómarúm og
  // textinn horfið við endurhleðslu. Beint localStorage-skrif er í lagi: patch
  // 227 vefur `localStorage.setItem` og speglar öll `slokk_trip_*` skrif í
  // skýið, svo þetta samstillist milli tækja án nokkurs auka-verks.
  function tripKey(coId) { return 'slokk_trip_' + coId; }
  function loadTrip(coId) {
    try { return JSON.parse(localStorage.getItem(tripKey(coId)) || '{}') || {}; }
    catch (_) { return {}; }
  }
  function saveTrip(coId, st) {
    try { localStorage.setItem(tripKey(coId), JSON.stringify(st)); } catch (_) {}
  }

  function unitsFor(coId) {
    try {
      var c = window.Companies && Companies.list && Companies.list.find(function (x) { return x.id == coId; });
      if (!c || !window.DB || !DB.cache || !DB.cache.units) return [];
      return DB.cache.units.filter(function (u) { return u.client === c.nafn; });
    } catch (_) { return []; }
  }

  function isSlanga(u) {
    var t = ((u && u.type) || '').toLowerCase();
    return /brunaslang|brunaslöng|slang|hose/.test(t);
  }

  /* Telur þjónustuval per tæki — SÖMU gildi og reikningurinn les.
     NB `getChoice` skilar SJÁLFGEFNU gildi þegar tækið hefur ekki verið snert
     (duft → hleðsla, annað → yfirferð, sjá 131 `defaultForType`). Það er
     VILJANDI: patch 129 rukkar eftir nákvæmlega sömu gildum, svo textinn og
     reikningurinn geta aldrei sagt sitt hvað. „Sleppa" (`none`) telst hvorki
     með í heildinni né í slöngu-talningunni — tækið fór ekki í þessa ferð. */
  function skanna(coId) {
    var st = { yfir: 0, hled: 0, nytt: 0, onytt: 0, slanga: 0, alls: 0 };
    var units = unitsFor(coId);
    units.forEach(function (u) {
      var val = '';
      try {
        if (window.UnitServicePicker && UnitServicePicker.getChoice)
          val = UnitServicePicker.getChoice(coId, u.id, u.type) || '';
      } catch (_) {}
      if (val === 'none') return;
      st.alls++;
      if (isSlanga(u)) st.slanga++;
      if (val === 'hledsla') st.hled++;
      else if (val === 'nyitt') st.nytt++;
      else if (val === 'onytt') st.onytt++;
      else st.yfir++;
    });
    return st;
  }

  /* Hausar: taldir af AUKALÍNUNUM á reikningnum — það er línan sem er
     raunverulega rukkuð, svo textinn og reikningurinn haldast í hendur.
     Vörurnar sem eiga við (vorur-taflan, staðfest 30.07.2026): „Brunaslöngustútur 1""
     (356, Varahlutir, 8.500 kr), „Brunastútur 1" Ajax" (352) og „Úðastútur
     brunaslanga 19 m.m." (128) — allt sami hluturinn í reynd, hausinn á slöngunni. */
  function erHaus(nafn) {
    var n = (nafn || '').toLowerCase();
    var slanga = /slöng|slong|slang/.test(n);
    if (/stút|stut/.test(n)) return slanga || /bruna/.test(n);
    return /haus/.test(n) && slanga;
  }
  function hausar(coId) {
    var n = 0;
    try {
      var ex = loadTrip(coId).extras || [];
      ex.forEach(function (e) {
        // `name` + `qty` eru reitirnir sem 129 skrifar (VorurPicker-línan).
        if (erHaus(e && (e.name || e.nafn))) n += Math.max(1, +e.qty || 1);
      });
    } catch (_) {}
    return n;
  }

  function smida(coId) {
    var st = skanna(coId), nHaus = hausar(coId), s = [];
    if (!st.alls) return '';

    if (st.yfir > 0) s.push('Öll tæki yfirfarin og vottuð í lagi.');
    if (st.hled > 0) s.push(st.hled === 1
      ? 'Eitt tæki fékk hleðslu og fulla áfyllingu.'
      : cap(hk(st.hled)) + ' tæki fengu hleðslu og fulla áfyllingu.');
    if (st.onytt > 0) s.push(st.onytt === 1
      ? 'Eitt tæki reyndist ónýtt og var tekið úr notkun.'
      : cap(hk(st.onytt)) + ' tæki reyndust ónýt og voru tekin úr notkun.');
    if (st.nytt > 0) s.push(st.nytt === 1
      ? 'Eitt nýtt tæki var sett upp.'
      : cap(hk(st.nytt)) + ' ný tæki voru sett upp.');
    // Hausskiptin ALLTAF beint á undan slöngu-vottuninni.
    if (nHaus > 0) s.push(nHaus === 1
      ? 'Skipta þurfti um nýjan haus á eina brunaslönguna.'
      : 'Skipta þurfti um nýja hausa á ' + kvk(nHaus) + ' brunaslöngur.');
    if (st.slanga > 0) s.push('Brunaslöngur prófaðar á fullum þrýsting og vottaðar í lagi.');

    return s.join(' ');
  }

  function fylla(coId) {
    var ta = document.getElementById('_ctc-notes-ta');
    if (!ta) { console.log(TAG, 'reiturinn ekki á skjánum'); return; }
    if ((ta.value || '').trim()) { console.log(TAG, 'reitur ekki tómur — snerti ekki'); return; }
    var txt = smida(coId);
    if (!txt) { console.log(TAG, 'ekkert að skrifa (engin tæki/val)'); return; }
    ta.value = txt;
    // Vista gegnum SAMA veg og reiturinn sjálfur — annars glatast textinn við
    // endurhleðslu því 129 les úr tripState, ekki úr DOM-inu.
    var st = loadTrip(coId); st.notes = txt; saveTrip(coId, st);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(TAG, 'texti settur:', txt);
  }

  // „✅ Staðfesta lista" (patch 224 `.ut-listlock`). Aðeins þegar hann LÆSIR
  // (staðfestir) — afhök á ekki að hreyfa við textanum. Capture-fasi + smá bið
  // svo 224 sé búinn að skrifa lásinn áður en við lesum hann.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.ut-listlock') : null;
    if (!b) return;
    var coId = +b.dataset.co;
    if (!coId) return;
    setTimeout(function () {
      var laest = false;
      try { laest = localStorage.getItem('sk_ut_lock_' + coId) === '1'; } catch (_) {}
      if (laest) fylla(coId);
    }, 150);
  }, true);

  // Handvirkt fyrir prófanir: Uttektartexti.forskoda(coId) skilar textanum án
  // þess að skrifa neitt; .fylla(coId) skrifar (virðir tóma-reit regluna).
  window.Uttektartexti = { forskoda: smida, fylla: fylla, skanna: skanna, hausar: hausar };
  console.log(TAG, 'hlaðinn');
})();
