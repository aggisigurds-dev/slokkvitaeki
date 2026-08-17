/* js/patches/294-uttektartexti.js — sjálfvirkur úttektartexti
   ─────────────────────────────────────────────────────────────────
   Þegar „✅ Staðfesta lista" er ýtt í ársskoðun myndast textinn sem á að standa
   í „📝 Upplýsingar um úttekt" — Elías skrifaði hann áður í hvert sinn, og með
   hundruðum skýrslna á ári er það umtalsverður tími.

   ORÐALAGIÐ (húsmálið, talið úr 27 frágengnum skýrslum — röðin skiptir máli):
     1. Grunnur:      „Öll slökkvitæki yfirfarin og vottuð í lagi."
        · allt endurhlaðið → „…yfirfarin, endurhlaðin og vottuð í lagi."
        · ónýtt skeytist INN í grunnsetninguna, fær ekki sér setningu:
          „…vottuð í lagi nema eitt sem var dæmt ónýtt." („nema tvö … dæmd ónýt")
     2. Hleðsla að hluta: „Fjögur slökkvitæki endurhlaðin og vottuð í lagi."
     3. Ný tæki í ÞÁGUFALLI: „Einu nýju slökkvitæki bætt við." / „3 nýjum
        slökkvitækjum bætt við."
     4. Reykskynjarar sér lína: „Reykskynjarar hljóðprófaðir og skipt um
        rafhlöður." — skynjarar og slöngur teljast EKKI með slökkvitækjunum.
     5. Stútskipti:   „Skipt um stút á einni brunaslöngu."
                      (fleirtala: „Skipt um stúta á N brunaslöngum.")
     6. Slöngur SÍÐAST, sér lína: „Brunaslöngur prófaðar á fullum þrýstingi."
        (EKKI vottun — maður skrifar „og vottaðar í lagi" / leka-athugasemd
        sjálfur, sjá Blikkhella)
   Hausskiptin koma ALLTAF beint á undan slöngu-línunni svo hún endi textann.

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

  // Reykskynjarar fá sér setningu í húsmálinu („hljóðprófaðir og skipt um
  // rafhlöður") og mega ekki teljast með í „Öll slökkvitæki yfirfarin".
  function isSkynjari(u) {
    var t = ((u && u.type) || '').toLowerCase();
    return /skynjar|smoke|detector/.test(t);
  }

  /* Telur þjónustuval per tæki — SÖMU gildi og reikningurinn les.
     NB `getChoice` skilar SJÁLFGEFNU gildi þegar tækið hefur ekki verið snert
     (duft → hleðsla, annað → yfirferð, sjá 131 `defaultForType`). Það er
     VILJANDI: patch 129 rukkar eftir nákvæmlega sömu gildum, svo textinn og
     reikningurinn geta aldrei sagt sitt hvað. „Sleppa" (`none`) telst hvorki
     með í heildinni né í slöngu-talningunni — tækið fór ekki í þessa ferð. */
  function skanna(coId) {
    // yfir/hled/nytt/onytt telja aðeins SLÖKKVITÆKI — slöngur og skynjarar
    // eiga sínar eigin setningar í húsmálinu og mengast ekki inn í
    // „Öll slökkvitæki yfirfarin".
    var st = { yfir: 0, hled: 0, nytt: 0, onytt: 0, slanga: 0, skynj: 0, alls: 0 };
    var units = unitsFor(coId);
    units.forEach(function (u) {
      var val = '';
      try {
        if (window.UnitServicePicker && UnitServicePicker.getChoice)
          val = UnitServicePicker.getChoice(coId, u.id, u.type) || '';
      } catch (_) {}
      if (val === 'none') return;
      st.alls++;
      if (isSlanga(u)) { st.slanga++; return; }
      if (isSkynjari(u)) { st.skynj++; return; }
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

    // 1. Grunnsetningin. Sé ALLT endurhlaðið fellur það inn í hana
    //    („yfirfarin, endurhlaðin og vottuð í lagi") — annars kemur hleðslan
    //    sem sér setning á eftir. Ónýtt skeytist inn í grunnsetninguna
    //    („nema eitt sem var dæmt ónýtt"), fær ALDREI sér setningu.
    var grunn = '';
    if (st.yfir > 0)      grunn = 'Öll slökkvitæki yfirfarin og vottuð í lagi';
    else if (st.hled > 0) grunn = 'Öll slökkvitæki yfirfarin, endurhlaðin og vottuð í lagi';
    if (grunn) {
      if (st.onytt > 0) grunn += st.onytt === 1
        ? ' nema eitt sem var dæmt ónýtt'
        : ' nema ' + hk(st.onytt) + ' sem voru dæmd ónýt';
      s.push(grunn + '.');
    } else if (st.onytt > 0) {
      // Jaðartilvik: ekkert yfirfarið/hlaðið, bara ónýtt.
      s.push(st.onytt === 1
        ? 'Eitt slökkvitæki var dæmt ónýtt og tekið úr notkun.'
        : cap(hk(st.onytt)) + ' slökkvitæki dæmd ónýt og tekin úr notkun.');
    }

    // 2. Endurhleðsla að hluta — sér setning með vottun (einfaldasta
    //    húsmálsformið: „Fjögur slökkvitæki endurhlaðin og vottuð í lagi.").
    if (st.yfir > 0 && st.hled > 0) s.push(st.hled === 1
      ? 'Eitt slökkvitæki endurhlaðið og vottað í lagi.'
      : cap(hk(st.hled)) + ' slökkvitæki endurhlaðin og vottuð í lagi.');

    // 3. Ný tæki í þágufalli.
    if (st.nytt > 0) s.push(st.nytt === 1
      ? 'Einu nýju slökkvitæki bætt við.'
      : st.nytt + ' nýjum slökkvitækjum bætt við.');

    // 4. Reykskynjarar — sér lína í húsmálinu, rafhlöðuskipti eru hluti af
    //    árlegri þjónustu.
    if (st.skynj > 0) s.push(st.skynj === 1
      ? 'Reykskynjari hljóðprófaður og skipt um rafhlöður.'
      : 'Reykskynjarar hljóðprófaðir og skipt um rafhlöður.');

    var txt = s.join(' ');

    // 5.+6. Stútskipti og slöngu-línan — SÉR LÍNA neðst, alltaf síðast.
    // Brunaslöngu-VOTTUN má ALDREI leiðast af tækjalistanum (Agnar + húsmál,
    // Blikkhellu-gildran: „…og ein þeirra lekur"). Sjálfvirki textinn segir aðeins
    // að slöngurnar hafi verið PRÓFAÐAR (verkið sem var unnið) — niðurstöðuna
    // („og vottaðar í lagi" EÐA leka-athugasemd) skrifar maður handvirkt.
    var slongur = [];
    if (nHaus > 0) slongur.push(nHaus === 1
      ? 'Skipt um stút á einni brunaslöngu.'
      : 'Skipt um stúta á ' + nHaus + ' brunaslöngum.');
    if (st.slanga > 0) slongur.push(st.slanga === 1
      ? 'Brunaslanga prófuð á fullum þrýstingi.'
      : 'Brunaslöngur prófaðar á fullum þrýstingi.');
    if (slongur.length) txt = (txt ? txt + '\n' : '') + slongur.join(' ');

    return txt;
  }

  function fylla(coId, yfirskrifa) {
    var ta = document.getElementById('_ctc-notes-ta');
    if (!ta) { console.log(TAG, 'reiturinn ekki á skjánum'); return false; }
    if (!yfirskrifa && (ta.value || '').trim()) { console.log(TAG, 'reitur ekki tómur — snerti ekki'); return false; }
    var txt = smida(coId);
    if (!txt) { console.log(TAG, 'ekkert að skrifa (engin tæki/val)'); return false; }
    ta.value = txt;
    // Vista gegnum SAMA veg og reiturinn sjálfur — annars glatast textinn við
    // endurhleðslu því 129 les úr tripState, ekki úr DOM-inu.
    var st = loadTrip(coId); st.notes = txt; saveTrip(coId, st);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(TAG, 'texti settur:', txt);
    return true;
  }

  /* ✨-takki í hausnum á reitnum — handvirkt endurgera, og LEIÐIN að eldri
     úttektum: sjálfvirka fyllingin gerist bara í því augnabliki sem listinn er
     staðfestur, svo skýrsla sem var gerð áður en þetta kom (eða þar sem reitnum
     var lokað tómum) fær textann hér. Yfirskrift krefst staðfestingar — sjálf-
     virka leiðin snertir aldrei texta sem er fyrir, og það á ekki að breytast
     þótt takkinn geti það þegar MAÐUR biður um það. */
  function currentCoId() {
    var main = document.getElementById('companies-main');
    if (!main) return 0;
    var el = main.querySelector('[data-co-id]:not(._cat-section)');
    var v = el && el.getAttribute('data-co-id');
    return (v && /^\d+$/.test(v)) ? +v : 0;
  }

  function haus() {
    var ta = document.getElementById('_ctc-notes-ta');
    if (!ta || !ta.parentNode) return null;
    // Hausinn er fyrsta flex-línan á undan textareanum (129 teiknar hann þar).
    var h = ta.previousElementSibling;
    return (h && h.tagName === 'DIV') ? h : null;
  }

  function settaTakka() {
    var h = haus();
    if (!h || h.querySelector('.ut-txtgen')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ut-txtgen';
    b.textContent = '✨ Búa til texta';
    b.title = 'Semja úttektartextann út frá tækjalistanum · virkar líka á eldri úttektir';
    b.style.cssText = 'margin-left:auto;padding:3px 9px;border:1px solid var(--brd,#cbd5e1);' +
      'border-radius:99px;background:#fff;color:#334155;font:inherit;font-size:11.5px;' +
      'font-weight:700;cursor:pointer;line-height:1.5;white-space:nowrap';
    h.appendChild(b);
  }

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.ut-txtgen') : null;
    if (!b) return;
    e.preventDefault();
    var coId = currentCoId();
    if (!coId) { alert('Fann ekki fyrirtækið á síðunni.'); return; }
    var txt = smida(coId);
    if (!txt) { alert('Ekkert að skrifa — engin tæki á listanum.'); return; }
    var ta = document.getElementById('_ctc-notes-ta');
    var fyrir = ta && (ta.value || '').trim();
    if (fyrir && fyrir !== txt &&
        !confirm('Skrifa yfir textann sem er í reitnum?\n\nNýr texti:\n' + txt)) return;
    if (fylla(coId, true)) {
      var gamalt = b.textContent;
      b.textContent = '✓ Texti settur';
      setTimeout(function () { b.textContent = gamalt; }, 1600);
    }
  }, false);

  // 129 endurteiknar `notesBox.innerHTML` í hvert sinn sem kostnaður er
  // endurreiknaður — takkinn hverfur þá með. Því er hann settur aftur inn við
  // hverja breytingu á fyrirtækjasvæðinu (sama mynstur og 131 notar).
  (function fylgjast() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(fylgjast, 800); return; }
    var t = 0;
    new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(settaTakka, 80);
    }).observe(main, { childList: true, subtree: true });
    settaTakka();
  })();

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
  window.Uttektartexti = { forskoda: smida, fylla: fylla, skanna: skanna, hausar: hausar, takki: settaTakka };
  console.log(TAG, 'hlaðinn');
})();
