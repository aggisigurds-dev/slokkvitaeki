/* App-profiles — installable, mobile-first „mini-öpp" over a curated subset of
 * pages. Phase 1 ships ONE app — 💰 Fjármál (Kröfu yfirlit · Fyrirtæki í þjónustu
 * · Tekjur) — but the framework is generic so 🚚 Bílstjóri and 👥 Kúnnar drop in
 * by adding to APPS.
 *
 * How it works
 *  - „📱 Öpp" launcher page (view-opp, slug #opp): one card per app with an
 *    „Opna" button, „Afrita hlekk", and a page-checklist you tick to choose which
 *    pages the app shows (saved to localStorage + AppSettings — synced).
 *  - App mode: opening `/?app=fjarmal` (the app's start_url + its own manifest)
 *    boots a locked, full-screen mobile shell — sidebar + fire-banner hidden, a
 *    slim app header on top and a thumb-zone bottom nav with only that app's
 *    pages. Navigating outside the set snaps back (focus lock, like ?driver).
 *  - Each app has its OWN manifest (name + 💰 icon + start_url) so it installs as
 *    a SEPARATE home-screen icon. In app mode we swap <link rel=manifest> to it so
 *    „Setja upp" / the browser install menu captures the right app.
 */
(function () {
  if (window.__appProfilesInstalled) return; window.__appProfilesInstalled = true;

  var VIEW_ID = 'view-opp', NAV_KEY = 'opp', NAV_LABEL = '📱 Öpp';

  // ── 01.10.2026 (B48, Agnar: „fara yfir allar síðurnar í Öpp og samræma … og mobile view“) ──
  // Brunastál C á ræsinum, fylkinu, app-spjöldunum, síðuritlinum og app-hausnum/-dokkanum:
  // málmhaus með hnoðum, stálplata, silfur/rauðir takkar, Playfair-titlar, mono-merki.
  // Engin emoji í viðmótinu lengur — síður fá línutákn (pgIcon) í stað p.emoji. p.emoji
  // stendur áfram í PAGES (aðrir pappar og manifest mega lesa það).
  var B48_MONO = '"JetBrains Mono",ui-monospace,monospace';
  var B48_SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var B48_DISP = '"Playfair Display",Georgia,serif';
  var B48_METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var B48_MBTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var B48_SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var B48_PLATE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  var B48_RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  var B48_RAUTT = 'linear-gradient(180deg,#c22f26 0%,#951818 50%,#650c0d 100%)';
  function b48Hnod(sel) {
    return [sel + '::before,' + sel + '::after{content:"";position:absolute;left:12px;width:7px;height:7px;border-radius:50%;background:' + B48_RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.6)}',
      sel + '::before{top:10px}', sel + '::after{bottom:10px}'];
  }
  function b48Svg(d) { return '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var B48_IK = {
    opna: b48Svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>'),
    nidur: b48Svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
    hlekkur: b48Svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    litur: b48Svg('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-1 .8-1.7 1.9-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.2" r="1.2"/>'),
    rusl: b48Svg('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>'),
    auga: b48Svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    fela: b48Svg('<path d="M3 3l18 18M10.6 6a9.8 9.8 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.6 3.3M6.6 6.7C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.7 0 3.2-.5 4.4-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
    plus: b48Svg('<path d="M12 5v14M5 12h14"/>'),
    chev: b48Svg('<path d="M6 9l6 6 6-6"/>'),
    ut: b48Svg('<path d="M8 16L16 8M9 8h7v7"/>'),
    tannhjol: b48Svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
    x: b48Svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    bak: b48Svg('<path d="M15 6l-6 6 6 6"/>'),
    sidur: b48Svg('<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>')
  };
  var B48_PG = {
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    list: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    building: '<path d="M4 21V5l8-2v18M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.1 2.3 3.5 5.2"/>',
    cart: '<path d="M3 4h2.5l2.2 11h10.6L20.5 8H6.6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    check: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    wrench: '<path d="M15 4a5 5 0 0 0-4.6 6.9L3.5 17.8a1.8 1.8 0 0 0 2.6 2.6l6.9-6.9A5 5 0 0 0 20 9l-3 1-2-2 1-3z"/>',
    flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 3 2.5 3 4.5"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    hospital: '<path d="M4 21V7h16v14M9 21v-4h6v4M12 10v4M10 12h4"/>',
    cpu: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    brush: '<path d="M19 3l-8.5 8.5M14.5 3.5l6 6M10 12c-2.5 0-4 1.5-4 4 0 1.5-1 2.5-3 3 4 1.5 9 .5 9-4z"/>',
    cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'
  };
  var B48_PGMAP = {
    'krofu-yfirlit': 'money', income: 'money', 'br-krofur': 'money', 'br-krofuyfirlit': 'money', 'br-skuldunautar': 'money',
    'br-fjarmalyfirlit': 'money', 'br-gerdreikninga': 'money', 'br-reikningagerd': 'money',
    'bokhalds-yfirlit': 'chart', kostnadur: 'chart', 'br-efniskostnadur': 'chart',
    'reikninga-postur': 'mail', hreyfingarlisti: 'list', 'br-hreyfingar': 'list',
    companies: 'building', rekstrarfelog: 'building', 'br-verkkaupar': 'building', vidskiptavinir: 'users',
    sala: 'cart', bord: 'grid', 'minar-sidur': 'grid', arsskodun: 'check', 'br-yfirferd': 'check',
    thjonustuverk: 'wrench', 'thjonustu-verkstaedi': 'wrench', 'br-verkstadir': 'wrench',
    brunayfirlit: 'flame', brunaskra: 'flame', slokkvikerfi: 'bell',
    'br-vinnubok': 'doc', 'br-eydublod': 'doc', 'br-skyrslustod': 'doc', 'br-drogstod': 'inbox',
    'br-maeting': 'clock', 'br-dagurinn': 'sun', 'br-nlsh': 'hospital', 'br-jarvis': 'cpu',
    'br-raddminni': 'mic', 'br-kerfisheilsa': 'shield', turbopaint: 'brush', '3dwork': 'cube'
  };
  function pgIcon(p) {
    var t = (p && B48_PGMAP[p.k]) || (p && p.minarId ? 'grid' : 'doc');
    return b48Svg(B48_PG[t]);
  }

  // ── catalog of pages that can go into an app (switchView key → label) ────────
  var PAGES = [
    { k: 'krofu-yfirlit',    label: 'Kröfu yfirlit',        short: 'Kröfur',     emoji: '💳' },
    { k: 'companies',        label: 'Fyrirtæki (skrá)',      short: 'Fyrirtæki',  emoji: '🏢' },
    { k: 'income',           label: 'Tekjur',                emoji: '📈' },
    { k: 'bokhalds-yfirlit', label: 'Bókhald',               emoji: '📊' },
    { k: 'reikninga-postur', label: 'Reikninga-póstur',      short: 'Póstur',     emoji: '📧' },
    { k: 'hreyfingarlisti',  label: 'Hreyfingarlisti',       short: 'Hreyfingar', emoji: '📄' },
    { k: 'kostnadur',        label: 'Kostnaður · reikningar úr pósti', short: 'Kostnaður', emoji: '🧾' },   // 419 (28.09.2026)
    { k: 'vidskiptavinir',   label: 'Viðskiptavinir',        short: 'Kúnnar',     emoji: '👤' },
    { k: 'sala',             label: 'Sala',                  emoji: '💵' },
    { k: 'bord',             label: 'Þjónustuborð',          short: 'Borð',       emoji: '🔧' },   // Þjónustuborð 2 (368), kveikt 11.09.2026
    { k: 'samthykkja',       label: 'Samþykkja',             short: 'Samþykkja',  emoji: '✅' },   // 446 (08.10.2026) — símasíða Samþykkja-hamsins
    { k: 'svarstod',         label: 'Svar-stöð · hvernig textar verða til', short: 'Svar-stöð', emoji: '✉️' },   // 447 (08.10.2026)
    // 19.09.2026: 'verkbord' (Verkefnalisti) tekið úr listanum — sama sýn og 'bord' (368). pagesFor() vísar þangað.
    // 19.09.2026: 'thjonustubord' (gamla mobíl-borðið, 306) tekið úr listanum — það teiknar ekkert lengur og var
    // því hak sem gaf auðan skjá. pagesFor() vísar eldri vistunum á 'bord'.
    { k: 'arsskodun',        label: 'Fyrirtæki í þjónustu',  short: 'Þjónusta',   emoji: '🏢' },
    { k: 'thjonustuverk',    label: 'Þjónustuverk',          short: 'Þj.verk',    emoji: '🛠' },
    { k: 'thjonustu-verkstaedi', label: 'ÞjónustuVerkstæði', short: 'Verkstæði', emoji: '🔧' },
    // 05.10.2026 (Agnar: „taka hinar tvær útfærslurnar úr umferð, fyrst gamli síminn hafi verið að pikka upp gömlu
    // útgáfuna"): 'brunayfirlit' (Brunakerfi yfirlit, 272) tekið úr listanum — 'brunaskra' (Brunakerfis skoðun, 385)
    // er aðalútgáfan. pagesFor() vísar eldri vistunum og `defaults` þangað.
    // 21.09.2026: þriðji þjónustuflokkurinn (385). Hér svo hægt sé að haka síðuna inn í app — annars vísar app-hamur henni frá.
    { k: 'slokkvikerfi',     label: 'Slökkvikerfis skoðun',  short: 'Slökkvikerfi', emoji: '🍳' },
    { k: 'brunaskra',        label: 'Brunakerfis skoðun',    short: 'Brunaskoðun', emoji: '🚨' },
    { k: 'rekstrarfelog',    label: 'Rekstrarfélög',         short: 'Rekstrarf.', emoji: '🏢' },
    // 08.10.2026 (Agnar: „hægt að bæta þessu inn sem page í öpp-valsíðunum“): Bílstjóri sem síða í hvaða appi sem er —
    // 219 leggst undir app-hausinn og botnstikuna (sjá 219 CSS body.appmode #view-bilstjori). Læsta /app/bilstjori/ er óbreytt.
    { k: 'bilstjori',        label: 'Bílstjóri · leið dagsins', short: 'Bílstjóri', emoji: '🚚' },
    // 08.10.2026 (Agnar: „gera öpp-útfærslur á þessum sem ég get valið inn í öpp“): þrjár skrifstofusíður í valið.
    { k: 'birgdir',          label: 'Birgðir',               short: 'Birgðir',    emoji: '📦' },
    { k: 'aksturslisti',     label: 'Aksturslisti',          short: 'Akstur',     emoji: '🚗' },
    { k: 'vorur',            label: 'Vörur og þjónusta',     short: 'Vörur',      emoji: '🏷' },
    { k: 'minar-sidur',      label: 'Mínar síður',           short: 'Mínar síður', emoji: '🧩' },
    // Brunahólf-síður — birtar inni í appinu í iframe (deep-link á tab-ið).
    { k: 'br-gerdreikninga', label: 'Gerð reikninga',        short: 'Reikn.gerð', emoji: '🧾', url: 'https://brunaholf.netlify.app/?embed=1#gerdreikninga' },
    { k: 'br-vinnubok',      label: 'Vinnubók',              emoji: '📓', url: 'https://brunaholf.netlify.app/?embed=1#vinnubok' },
    { k: 'br-krofur',        label: 'Krófur & Tekjur',       short: 'Fjárhagur', emoji: '📊', url: 'https://brunaholf.netlify.app/?embed=1#krofur' },
    { k: 'br-krofuyfirlit',  label: 'Kröfu yfirlit (Brunahólf)', short: 'BH Kröfur', emoji: '📑', url: 'https://brunaholf.netlify.app/?embed=1#krofuyfirlit' },
    // Drög-stöðin (05.09.2026): innhólf punkta + draft-körfur fyrir bæði félögin; „Senda í körfu" opnar söluborðið hér.
    { k: 'br-drogstod',      label: 'Drög-stöð (punktar + draft-körfur)', short: 'Drög-stöð', emoji: '🛒', url: 'https://brunaholf.netlify.app/?embed=1#drogstod' },
    // Kostnaðarreikningar úr símanum (Agnar 06.09.2026): droppa/mynda PDF, velja fyrirtæki, AI les — listinn = innkaupabók
    { k: 'br-efniskostnadur', label: 'Efniskostnaður · kostnaðarreikningar (dropp úr síma)', short: 'Efniskostn.', emoji: '📥', url: 'https://brunaholf.netlify.app/?embed=1#efniskostnadur' },
    { k: 'br-maeting',       label: 'Mæting · verkstaðir (Tímavera)', short: 'Mæting', emoji: '🕒', url: 'https://brunaholf.netlify.app/?embed=1#tvmaeting' },
    { k: 'br-fjarmalyfirlit',label: 'Fjármála-yfirlit (Slökkv. + Brunahólf)', short: 'Yfirlit', emoji: '💰', url: 'https://brunaholf.netlify.app/fjarmalyfirlit.html' },
    // Fleiri Brunahólf-síður (fyrir Brunahólf-appið — allt í iframe, deep-link á tab).
    { k: 'br-dagurinn',      label: 'Dagurinn (Brunahólf)',  short: 'Dagurinn',  emoji: '🌅', url: 'https://brunaholf.netlify.app/?embed=1#dagurinn' },
    { k: 'br-reikningagerd', label: 'Reikningagerð (Brunahólf)', short: 'Reikn.gerð', emoji: '🧾', url: 'https://brunaholf.netlify.app/?embed=1#reikningar' },
    { k: 'br-skuldunautar',  label: 'Skuldunautar (Brunahólf)', short: 'Skuldun.', emoji: '💰', url: 'https://brunaholf.netlify.app/?embed=1#skuldunautar' },
    { k: 'br-hreyfingar',    label: 'Hreyfingaryfirlit (Brunahólf)', short: 'Hreyf.', emoji: '📄', url: 'https://brunaholf.netlify.app/?embed=1#hreyfingaryfirlit' },
    { k: 'br-verkstadir',    label: 'Verkstaðir (Brunahólf)', short: 'Verkst.',  emoji: '🏗️', url: 'https://brunaholf.netlify.app/?embed=1#verkstadir' },
    { k: 'br-nlsh',          label: 'Landsspítalinn (Brunahólf)', short: 'NLSH', emoji: '🏥', url: 'https://brunaholf.netlify.app/?embed=1#nlsh' },
    // Verkkaupar er SJÁLFSTÆÐ síða (ekki hash-flipi í index.html) — því bein slóð
    // án ?embed=1#… . Hún er þegar app-útlit (eigin haus, engin hliðarstika).
    { k: 'br-verkkaupar',    label: 'Verkkaupar (Brunahólf)', short: 'Verkkaupar', emoji: '🤝', url: 'https://brunaholf.netlify.app/verkkaupar.html' },
    { k: 'br-jarvis',        label: 'J.A.R.V.I.S. (Brunahólf)', short: 'Jarvis', emoji: '🧠', url: 'https://brunaholf.netlify.app/jarvis.html?embed=1' },
    { k: 'br-raddminni',     label: 'Raddminni (Brunahólf)',  short: 'Raddminni', emoji: '🎙️', url: 'https://brunaholf.netlify.app/radd.html' },
    { k: 'br-kerfisheilsa',  label: 'Kerfisheilsa (Brunahólf)', short: 'Kerfisheilsa', emoji: '🛡️', url: 'https://brunaholf.netlify.app/kerfisheilsa.html' },
    // Yfirferð efnislista — símavæn síða þar sem yfirmaður fer yfir flaggaða
    // Efnislista (Kröfu yfirlit 👔-takkinn), breytir magni, vistar og staðfestir.
    { k: 'br-yfirferd',      label: 'Yfirferð efnislista (Brunahólf)', short: 'Yfirferð', emoji: '👔', url: 'https://brunaholf.netlify.app/yfirferd.html' },
    { k: 'br-eydublod',     label: 'Eyðublöð (Brunahólf)',            short: 'Eyðublöð', emoji: '📝', url: 'https://brunaholf.netlify.app/eydublod.html' },
    // Skýrslu-stöð úr Bakendanum — einangraður flipi í brunaholf (?embed=1#skyrslustod)
    // svo AÐEINS stöðin birtist í appinu, ekki allur Bakendinn. Tengja skýrslu/reikning
    // við réttan stað + ár beint úr símanum.
    { k: 'br-skyrslustod',  label: 'Skýrslu-stöð (Brunahólf)',        short: 'Skýrslust.', emoji: '📊', url: 'https://brunaholf.netlify.app/?embed=1#skyrslustod' },
    { k: 'turbopaint',      label: 'TurboPaint — teikningar',        short: 'Teikningar', emoji: '📐', url: 'https://kjarni.vercel.app/kjarni/turbopaint' },
    { k: '3dwork',          label: '3dwork — merkja/CAD-bekkur',     short: '3dwork', emoji: '🛠️', url: 'https://kjarni-3dwork.vercel.app/3dwork' },
  ];
  var PAGE_BY_KEY = {}; PAGES.forEach(function (p) { PAGE_BY_KEY[p.k] = p; });

  // ── einstakar Mínar síður-síður sem valkostir, ekki bara verkfærið í heild ──
  // Kyrrstæði PAGES-listinn dugar fyrir „Mínar síður" sem EITT boð (sjá að ofan) —
  // en hver vistuð síða notandans er ekki þekkt fyrr en í keyrslu, per-notanda.
  // Því er þessi hluti REIKNAÐUR (ekki fastur), lesinn beint úr sömu AppSettings-
  // slóð og patch 302 sjálft notar (min_sidur.sidur[]). k = 'minar-<id>' svo það
  // rekist aldrei á neinn fastan lykil úr PAGES að ofan.
  function dynamicPages() {
    try {
      var st = (window.AppSettings && AppSettings.path && AppSettings.path('min_sidur')) || null;
      if (!st || !Array.isArray(st.sidur)) return [];
      return st.sidur.map(function (s) {
        var nm = s.nafn || 'Ónefnd síða';
        return { k: 'minar-' + s.id, label: nm + ' (Mínar síður)', short: nm.length > 12 ? nm.slice(0, 12) + '…' : nm, emoji: '🧩', minarId: s.id };
      });
    } catch (_) { return []; }
  }
  function allPages() { return PAGES.concat(dynamicPages()); }
  function pageByKey(k) {
    if (PAGE_BY_KEY[k]) return PAGE_BY_KEY[k];
    if (k && k.indexOf('minar-') === 0) {
      var dyn = dynamicPages();
      for (var i = 0; i < dyn.length; i++) { if (dyn[i].k === k) return dyn[i]; }
    }
    return null;
  }

  // ── the apps (phase 1: Fjármál only) ────────────────────────────────────────
  var APPS = [
    { key: 'fjarmal', emoji: '💰', name: 'Fjármál', color: '#0b0b0d', dark: '#000000',
      manifest: '/manifest-fjarmal.json', home: 'krofu-yfirlit',
      blurb: 'Kröfur, sala, fyrirtæki + Brunahólf reikningagerð',
      defaults: ['krofu-yfirlit', 'br-fjarmalyfirlit', 'br-krofuyfirlit', 'sala', 'vidskiptavinir', 'thjonustuverk', 'thjonustu-verkstaedi', 'rekstrarfelog', 'br-jarvis', 'br-maeting', 'br-gerdreikninga', 'br-efniskostnadur', 'kostnadur', 'br-vinnubok', 'br-krofur'] },
    // Agnar 12.09.2026: „setja þjónustuborð síðuna á skjáinn í símanum" — appið
    // opnast hvort eð er á #bord, svo það heitir nú Þjónustuborð (lykill, id og
    // slóð /app/verkefni/ óbreytt, svo uppsett eintök haldast sama appið).
    { key: 'verkefni', emoji: '📋', name: 'Þjónustuborð', color: '#0b0b0d', dark: '#000000',
      manifest: '/manifest-verkefni.json', home: 'bord',
      blurb: 'Þjónustuborð — Master borð, mitt borð og eftirfylgni',
      defaults: ['bord', 'samthykkja', 'arsskodun', 'reikninga-postur'] },
    { key: 'brunaholf', emoji: '🔥', name: 'Brunahólf', color: '#0b0b0d', dark: '#000000',
      manifest: '/manifest-brunaholf.json', home: 'br-dagurinn',
      blurb: 'Brunahólf-hubbið í símanum — Dagurinn, Krófur, Reikningagerð, Vinnubók, Mæting o.fl.',
      defaults: ['br-dagurinn', 'br-jarvis', 'br-verkkaupar', 'br-skyrslustod', 'br-krofur', 'br-krofuyfirlit', 'br-gerdreikninga', 'br-vinnubok', 'br-maeting', 'turbopaint'] },
    // Skýrslu-stöðin sem sitt eigið app (Agnar 23.09.2026: „Can you make a app page
    // for skýrslustod. For öpp page"). Hún er þegar til sem síða (br-skyrslustod →
    // brunaholf /?embed=1#skyrslustod); hér fær hún eigin skel svo hún opnist beint
    // og skiptist í forskoðun efst / lista neðst á símanum.
    { key: 'skyrslustod', emoji: '📊', name: 'Skýrslu-stöð', color: '#0b0b0d', dark: '#000000',
      manifest: '/manifest-skyrslustod.json', home: 'br-skyrslustod',
      blurb: 'Tengja skýrslur og reikninga við réttan stað — forskoðun efst, listinn undir',
      defaults: ['br-skyrslustod', 'br-drogstod', 'br-krofuyfirlit', 'br-yfirferd'] },
    // Brunakerfi-appið fyrir skoðunarmenn á staðnum (ósk Agnars 2026-07-21):
    // skoðunarlistinn er heimasíðan; fyrirtækjasíðan (274) og skýrslu-formið (273)
    // opnast þaðan sem yfirlög — allt innan sömu læstu skeljar.
    // 05.10.2026: heimasíðan og `defaults` vísuðu á GAMLA yfirlitið ('brunayfirlit', 272). Vistaði listinn hafði
    // löngu skipt því út fyrir 'brunaskra', en hvert tæki sem missti af vistaða listanum (eða þegar hann var
    // yfirskrifaður, sjá flutninginn neðar) datt aftur á gömlu síðuna — „gamla útgáfu með bara 3 síðum".
    { key: 'brunakerfi', emoji: '🚨', name: 'Brunakerfi', color: '#0b0b0d', dark: '#000000',
      manifest: '/manifest-brunakerfi.json', home: 'brunaskra',
      blurb: 'Skoðunarmanna-app: fyrirtækin, skoðunarskýrslur og verð — skráð á staðnum',
      defaults: ['brunaskra', 'slokkvikerfi', 'arsskodun', 'sala', 'turbopaint'] },
    // Bílstjóri er STANDALONE: engin botn-nav-skel (patch 219 á heilan
    // læstan fullskjá). Kortið gefur bara Opna / Setja upp / Afrita hlekk —
    // engin „Síður í appinu"-listi. ?app=bilstjori ræsir læsta Bílstjórann.
    { key: 'bilstjori', emoji: '🚚', name: 'Bílstjóri', color: '#111318', dark: '#000000',
      manifest: '/manifest-bilstjori.json', standalone: true,
      blurb: 'Ökumanns-app: leið dagsins, tækjaúttekt og skýrslur í símanum',
      defaults: [] },
    // Framkvæmda-yfirlit fyrir Agnar (ósk 8.8.): sama efni og Fjármál-appið að
    // hluta en breiðara — tekur líka Tekjur/Bókhald/Verkefnalisti/Rekstrarfélög
    // svo öll stóru KPI-in eru á einum stað án þess að velja Fjármál-undirmengið.
    // Heimasíða = br-fjarmalyfirlit (Brunahólf iframe, EKKI þessa appsins Supabase-
    // klient) — krofu-yfirlit sem heimasíða sló stundum í "Engin gagnabankatenging"
    // á fyrstu opnun (DB.sb ekki tilbúinn þegar appmode-skelin snappar strax á
    // heimasíðuna á boot); fjarmalyfirlit-iframe-ið hleður sínum eigin gögnum og
    // forðast því kappleikinn alveg.
    { key: 'boss', emoji: '👑', name: 'The Big Boss', color: '#fbe9ab', dark: '#b8860b',
      manifest: '/manifest-boss.json', home: 'br-fjarmalyfirlit',
      blurb: 'Framkvæmda-yfirlit þvert á bæði fyrirtækin — kröfur, fjármál, tekjur, bókhald, verkefni',
      defaults: ['br-fjarmalyfirlit', 'br-yfirferd', 'br-skyrslustod', 'br-eydublod', 'krofu-yfirlit', 'br-drogstod', 'br-efniskostnadur', 'kostnadur', 'income', 'bokhalds-yfirlit', 'bord', 'verkbord', 'rekstrarfelog'] },
    // 3dwork sem eigið app (Agnar 23.09.2026: vildi opna bekkinn af öpp-síðunni í
    // símanum, ekki úr hliðarstiku). Ein síða — bekkurinn sjálfur (iframe á
    // kjarni-3dwork.vercel.app/3dwork), sem er þegar fullt app-útlit.
    // Lykill = 'threedwork' (stafir) því /app/<key>/ app-mode boot (lína ~473)
    // les aðeins [a-z]+ — lykill sem byrjar á tölustaf ('3dwork') fer aldrei í
    // app-ham. Nafn, PAGE-lykill og heimasíða halda áfram '3dwork'.
    { key: 'threedwork', emoji: '🛠️', name: '3dwork', color: '#0b0b0d', dark: '#000000',
      manifest: '/manifest-threedwork.json', home: '3dwork',
      blurb: 'STL/mesh-bekkur fyrir CO2-merki og prentun',
      defaults: ['3dwork'] },
  ];
  var APP_BY_KEY = {}; APPS.forEach(function (a) { APP_BY_KEY[a.key] = a; });
  // ── NOTENDA-BÚIN ÖPP (2026-08-26, ósk Agnars: „save as app page named …") ──
  // Vistast í custom_apps_json (localStorage STRAX + AppSettings í ský) og
  // renna inn í APPS/APP_BY_KEY — fá launcher-kort MEÐ síðu-hökunum, ?app=
  // boot og /app/<key>/ slóð eins og innbyggðu öppin. Ekkert manifest →
  // „Setja upp" er falinn á þeim; Opna + Afrita hlekk virka.
  // ── Af hverju tómu catch-in í þessari geymslu eru RÉTT (yfirfarið 17.09.2026) ──
  // LESTUR (loadCustoms/loadCfg/loadOverrides): hver og einn er keðja með
  //   varaleiðum — AppSettings → localStorage → tómt sjálfgefið gildi. Bregðist
  //   efsta þrepið tekur það næsta við; ekkert tapast og ekkert verður ósatt.
  // SKRIF (saveCustoms/saveCfg/saveOverride): `AppSettings.save` ER `saveVordud`
  //   í patch 85 — hún kastar ekki, en misheppnað skrif fer í BIÐRÖÐ, er reynt
  //   aftur á 20 sek fresti og NOTANDINN FÆR AÐVÖRUN þaðan („⚠️ Vistun mistókst
  //   — geymt og reynt aftur"). Skilagildið sem er hunsað hér er því ekki eina
  //   vísbendingin um bilun; hún er þegar sögð á einum stað fyrir allt appið.
  //   Eina raunverulega gatið er `if (window.AppSettings && ...)`-vörðurinn:
  //   sé AppSettings alls ekki til (skriftaröð brotin) fer ekkert í skýið OG
  //   engin biðröð tekur við. Það sæist þó strax á öllu öðru í appinu.
  var CUSTOM_KEY = 'custom_apps_json';
  function loadCustoms() {
    var raw = null;
    try { if (window.AppSettings && AppSettings.get) raw = AppSettings.get(CUSTOM_KEY); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem(CUSTOM_KEY); } catch (_) {} }
    if (!raw) return [];
    var a; try { a = JSON.parse(raw); } catch (_) { return []; }
    if (!Array.isArray(a)) return [];
    return hreinsaTvitekna(a);
  }
  // 21.09.2026 — TVO OPP, EITT AUDKENNI. Manifest-slodin er
  // /api/app-manifest?key=<lykill>, svo tvo opp med sama lykli eru EITT app i
  // augum simans — og `mergeCustoms` sleppir thvi seinna thogult, svo appid
  // sem notandinn bjo til birtist aldrei an nokkurrar skyringar.
  //
  // Hreinsad vid LESTUR (ekki bara vid skrif) svo gogn sem ERU thegar skokk
  // lagist a ollum velunum an handavinnu. Seinni faerslan lifir — hun er
  // nyrra skrefid sem notandinn tok.
  function hreinsaTvitekna(list) {
    var seen = {}, ut = [], tvitekid = false;
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      if (!c || !c.key) { ut.unshift(c); continue; }
      if (seen[c.key]) { tvitekid = true; continue; }
      seen[c.key] = 1; ut.unshift(c);
    }
    if (tvitekid) {
      try {
        var s = JSON.stringify(ut);
        try { localStorage.setItem('custom_apps_json', s); } catch (_) {}
        if (window.AppSettings && AppSettings.save) AppSettings.save({ custom_apps_json: s });
      } catch (_) {}
    }
    return ut;
  }
  function saveCustoms(list) {
    var str = JSON.stringify(list || []);
    try { localStorage.setItem(CUSTOM_KEY, str); } catch (_) {}
    try { if (window.AppSettings && AppSettings.save) { var pl = {}; pl[CUSTOM_KEY] = str; AppSettings.save(pl); } } catch (_) {}
  }
  function mergeCustoms() {
    var changed = false;
    loadCustoms().forEach(function (c) {
      if (!c || !c.key || APP_BY_KEY[c.key]) return;
      // 2026-09-08: `ikon` VARÐ AÐ FYLGJA MEÐ hér. Án þess týndist valda táknið
      // milli custom-listans og APPS — spjaldið féll aftur á emoji og valið leit út
      // fyrir að hafa ekki vistast (mælt í viðmótinu).
      var a = { key: c.key, emoji: c.emoji || '📱', ikon: c.ikon || null, name: c.name || c.key, color: (c.color && c.color !== '#334155') ? c.color : '#0b0b0d',
        dark: (c.dark && c.dark !== '#0f172a') ? c.dark : '#000000', home: '', blurb: c.blurb || 'Notenda-búið app', custom: true,
        defaults: Array.isArray(c.defaults) ? c.defaults : [] };
      APPS.push(a); APP_BY_KEY[a.key] = a;
      changed = true;
    });
    return changed;
  }
  mergeCustoms();   // localStorage-eintakið er til NÚNA → ?app=/slóð bootar strax
  function customKeyFor(name, listi) {
    var base = 'x' + String(name || '').toLowerCase()
      .replace(/[áà]/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/[óö]/g, 'o')
      .replace(/ú/g, 'u').replace(/ý/g, 'y').replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae')
      .replace(/[^a-z]/g, '').slice(0, 18) || 'xapp';
    // APP_BY_KEY er endurbyggt i mergeCustoms(); se thad ekki bunid ad keyra
    // er nyskradur lykill osynilegur her og naesta app faer SAMA lykil. Listinn
    // sjalfur er eina heimildin sem er alltaf fersk.
    var iNotkun = {};
    (Array.isArray(listi) ? listi : loadCustoms()).forEach(function (c) { if (c && c.key) iNotkun[c.key] = 1; });
    var k = base, i = 2;
    while (APP_BY_KEY[k] || iNotkun[k]) k = base + 'abcdefghij'.charAt(i++ % 10);
    return k;
  }
  // Stofna / uppfæra custom app án native prompt — Stilla útlit (262) og Öpp.
  // opts: { name, pageKey?, emoji?, blurb?, color?, dark?, key? }
  // Skilar { ok, key, name, updated } eða { ok:false, error }.
  // ── TÁKNASAFN (2026-09-08, ósk Agnars: „opna á möguleikann að opna á tákn
  // gallery og ég geti sett allskonar merki þar inn") ─────────────────────
  // Skrárnar liggja í img/app-tokn/ — 512×512 SVG, teiknuð fyrir dökkan
  // bakgrunn. Bæta við tákni = leggja SVG í möppuna og bæta einni línu hér.
  // Ekkert annað þarf: valmyndin, spjaldið, manifestið og ræsiskjárinn lesa
  // öll sama reitinn (`app.ikon`).
  var IKON_MAPPA = '/img/app-tokn/';
  var IKONSAFN = [
    { f: '01-slokkvitaeki.svg',   h: 'Slökkvitæki' },
    { f: '02-brunaholf.svg',      h: 'Brunahólf' },
    { f: '03-brunakerfi.svg',     h: 'Brunakerfi' },
    { f: '04-arsskodun.svg',      h: 'Ársskoðun' },
    { f: '05-oryggi.svg',         h: 'Öryggi' },
    { f: '06-taekjaskra.svg',     h: 'Tækjaskrá' },
    { f: '07-reykskynjari.svg',   h: 'Reykskynjari' },
    { f: '08-slongukefli.svg',    h: 'Slöngukefli' },
    { f: '09-bigboss-gull.svg',   h: 'Big Boss — gull' },
    { f: '10-bigboss-silfur.svg', h: 'Big Boss — silfur' },
    { f: '11-boss-gull-ankrunu.svg', h: 'Boss — án krúnu' },
    { f: '12-fjarmal.svg',        h: 'Fjármál' },
    { f: '13-kjarni.svg',         h: 'Kjarni' },
    { f: '14-kerfisstjorn.svg',   h: 'Kerfisstjórn' },
    { f: '15-skyrslur.svg',       h: 'Skýrslur' },
    { f: '16-vidskiptavinir.svg', h: 'Viðskiptavinir' },
    { f: '17-verkefni.svg',       h: 'Verkefni' },
    { f: '18-kort.svg',           h: 'Kort' },
    { f: '19-dagatal.svg',        h: 'Dagatal' },
    { f: '20-tolfraedi.svg',      h: 'Tölfræði' },
    { f: '21-eldur-raunver.svg',  h: 'Eldur' },
    { f: '22-eldur-metalraud.svg',h: 'Eldur — málmrautt' },
    { f: '23-boss-larvidur.svg',  h: 'Boss — lárviður' },
    { f: '24-boss-skjoldur.svg',  h: 'Boss — skjöldur' },
    { f: '25-boss-innsigli.svg',  h: 'Boss — innsigli' },
    { f: '26-driver-styri.svg',   h: 'Bílstjóri — stýri' },
    { f: '27-driver-bill.svg',    h: 'Bílstjóri — bíll' },
    { f: '28-driver-leid.svg',    h: 'Bílstjóri — leið' },
  ];
  function ikonSlod(app) {
    var f = app && app.ikon;
    if (!f) return null;
    // Aðeins skráarheiti úr safninu — engin slóð utan möppunnar.
    for (var i = 0; i < IKONSAFN.length; i++) if (IKONSAFN[i].f === f) return IKON_MAPPA + f;
    return null;
  }
  // Táknið eins og það birtist: SVG þegar valið er úr safninu, annars emoji.
  function ikonHtml(app, px) {
    var slod = ikonSlod(app);
    if (slod) return '<img src="' + slod + '" alt="" width="' + px + '" height="' + px + '" ' +
      'style="display:block;border-radius:' + Math.round(px * 0.22) + 'px;flex:none">';
    return '<span style="font-size:' + Math.round(px * 0.8) + 'px;line-height:1">' +
      String((app && app.emoji) || '📱') + '</span>';
  }

  function saveAsApp(opts) {
    opts = opts || {};
    var name = String(opts.name || '').trim().slice(0, 30);
    if (!name) return { ok: false, error: 'name' };
    var pageKey = opts.pageKey ? String(opts.pageKey).trim() : '';
    if (pageKey && !pageByKey(pageKey)) return { ok: false, error: 'page' };
    var emoji = String(opts.emoji || '📱').trim().slice(0, 4) || '📱';
    var blurb = String(opts.blurb || 'Útlitsútgáfa frá Stilla útlit').trim().slice(0, 120)
      || 'Útlitsútgáfa frá Stilla útlit';
    var defaults = pageKey ? [pageKey] : ['bord'];
    var list = loadCustoms();
    var app = null;
    var updated = false;
    if (opts.key) {
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].key === opts.key) { app = list[i]; break; }
      }
    }
    if (!app && pageKey) {
      for (var j = 0; j < list.length; j++) {
        var c = list[j];
        if (!c || !c.key) continue;
        if (c.name === name && Array.isArray(c.defaults) && c.defaults[0] === pageKey) {
          app = c; break;
        }
      }
    }
    if (app) {
      app.name = name; app.emoji = emoji; app.blurb = blurb; app.defaults = defaults;
      if ('ikon' in opts) app.ikon = opts.ikon || null;
      if (opts.color) app.color = opts.color;
      if (opts.dark) app.dark = opts.dark;
      updated = true;
    } else {
      app = {
        key: customKeyFor(name, list), name: name, emoji: emoji, ikon: opts.ikon || null,
        color: opts.color || '#0b0b0d', dark: opts.dark || '#000000',
        blurb: blurb, defaults: defaults
      };
      list.push(app);
    }
    saveCustoms(list);
    mergeCustoms();
    if (pageKey) saveCfg(app.key, defaults.slice());
    try { render(); } catch (_) {}
    return { ok: true, key: app.key, name: app.name, updated: updated };
  }
  function createCustomApp() {
    openNewAppDialog();
  }
  function openNewAppDialog() {
    var existing = document.getElementById('_op-newapp-dlg');
    if (existing) existing.remove();
    var dlg = document.createElement('div');
    dlg.id = '_op-newapp-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:min(400px,calc(100vw - 32px));overflow:hidden;font:inherit">' +
        '<div style="padding:16px 18px 6px;font-size:16px;font-weight:800;color:#0f172a">Búa til app</div>' +
        '<div style="padding:8px 18px 14px;display:flex;flex-direction:column;gap:10px">' +
          '<label style="display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:700;color:#475569">Nafn' +
            '<input id="_op-na-name" type="text" maxlength="30" placeholder="t.d. Ársskoðun sími" style="padding:10px 12px;border:1px solid #d7dce4;border-radius:9px;font:inherit;font-size:15px"></label>' +
          '<div style="font-size:12.5px;font-weight:700;color:#475569">Tákn</div>' +
          '<div id="_op-na-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:7px;max-height:210px;overflow:auto;padding:8px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc">' +
            IKONSAFN.map(function (x) {
              return '<button type="button" class="_op-na-ik" data-ik="' + x.f + '" title="' + x.h + '" ' +
                'style="padding:3px;border:2px solid transparent;border-radius:11px;background:#fff;cursor:pointer;line-height:0">' +
                '<img src="' + IKON_MAPPA + x.f + '" alt="' + x.h + '" width="42" height="42" style="display:block;border-radius:9px">' +
              '</button>';
            }).join('') +
          '</div>' +
          '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:#475569">eða emoji' +
            '<input id="_op-na-emoji" type="text" maxlength="4" value="📱" style="width:64px;padding:8px 10px;border:1px solid #d7dce4;border-radius:9px;font:inherit;font-size:20px;text-align:center">' +
          '</label>' +
        '</div>' +
        '<div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;background:#f8fafc">' +
          '<button type="button" id="_op-na-cancel" style="padding:0 16px;min-height:40px;border:1px solid rgba(20,24,34,.28);border-radius:7px;background:' + B48_SILVER + ';box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.12);cursor:pointer;font:inherit;font-size:13px;font-weight:600;color:#1c2028">Hætta við</button>' +
          '<button type="button" id="_op-na-ok" style="padding:0 18px;min-height:40px;background:' + B48_RAUTT + ';color:#fff;border:1px solid #2a0303;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;text-shadow:0 1px 1px rgba(0,0,0,.55)">Búa til</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    var nameEl = dlg.querySelector('#_op-na-name');
    var emojiEl = dlg.querySelector('#_op-na-emoji');
    // Eitt val í einu; endurval afvelur. Emoji-reiturinn er varaleiðin þegar
    // ekkert tákn er valið — þess vegna deyfist hann þegar tákn er virkt.
    var validIkon = null;
    function maerkjaVal() {
      dlg.querySelectorAll('._op-na-ik').forEach(function (b) {
        var a = b.dataset.ik === validIkon;
        b.style.borderColor = a ? '#b3261e' : 'transparent';
        b.style.background = a ? '#fdecea' : '#fff';
      });
      emojiEl.style.opacity = validIkon ? '.4' : '1';
    }
    dlg.querySelectorAll('._op-na-ik').forEach(function (b) {
      b.addEventListener('click', function () {
        validIkon = (validIkon === b.dataset.ik) ? null : b.dataset.ik;
        maerkjaVal();
      });
    });
    maerkjaVal();
    function close() { dlg.remove(); }
    dlg.querySelector('#_op-na-cancel').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.querySelector('#_op-na-ok').addEventListener('click', function () {
      var name = (nameEl.value || '').trim().slice(0, 30);
      if (!name) { try { nameEl.focus(); } catch (_) {} return; }
      var r = saveAsApp({
        name: name,
        emoji: (emojiEl.value || '📱').trim().slice(0, 4) || '📱',
        ikon: validIkon,
        blurb: 'Notenda-búið app — hakaðu við síðurnar að neðan',
        // 19.09.2026: var 'thjonustubord' (gamla mobíl-borðið, 306) — sú síða teiknar ekkert lengur, svo hvert
        // nýtt app opnaðist á AUÐUM skjá (mælt: „Brunahólf og slökkvitæki" → engin virk síða). Nýja borðið er 'bord'.
        pageKey: 'bord'
      });
      close();
      if (r && r.ok) {
        try { if (window.Toast && Toast.show) Toast.show('„' + r.name + '" búið til — hakaðu við „Síður í appinu"'); } catch (_) {}
      }
    });
    setTimeout(function () { try { nameEl.focus(); } catch (_) {} }, 40);
  }
  function deleteCustomApp(key) {
    var a = APP_BY_KEY[key]; if (!a || !a.custom) return;
    function doDelete() {
      saveCustoms(loadCustoms().filter(function (c) { return c && c.key !== key; }));
      var i = APPS.indexOf(a); if (i >= 0) APPS.splice(i, 1); delete APP_BY_KEY[key];
      // Þögnin rétt (17.09.2026): hér er aðeins TIL TEKTAR — síðu-stillingar
      // appsins sem var að hverfa. Sjálf eyðingin er línan á undan. Verði
      // munaðarlaus lykill eftir í app_profiles_json vísar hann á app sem er
      // ekki lengur í APPS og er hunsaður alls staðar.
      try { var c = loadCfg(); if (c && c[key]) { delete c[key]; var st = JSON.stringify(c); localStorage.setItem(CFG_KEY, st); if (window.AppSettings && AppSettings.save) AppSettings.save({ app_profiles_json: st }); } } catch (_) {}
      render();
    }
    if (window.Confirm && typeof Confirm.show === 'function') {
      Confirm.show('Eyða appinu „' + a.name + '"?', { danger: true, okText: 'Eyða' }).then(function (ok) {
        if (ok) doDelete();
      });
      return;
    }
    doDelete();
  }
  // Skýja-eintakið kemur seint — sama 12s-retry mynstur og cfg-migrationin.
  (function () {
    var n = 0;
    function t() {
      try { if (mergeCustoms()) { var v = document.getElementById(VIEW_ID); if (v && v.classList.contains('active')) render(); } } catch (_) {}
      if (++n < 12) setTimeout(t, 1000);
    }
    setTimeout(t, 1000);
  })();
  // Standalone apps (Bílstjóri) render their OWN full-screen locked view
  // (patch 219) — patch 261 must NOT build its bottom-nav shell or snap-back
  // for them, only surface the launcher card + install button.
  function isStandalone(key) { return !!(APP_BY_KEY[key] && APP_BY_KEY[key].standalone); }

  // active app mode — from the path /app/<key>/ (each app's own PWA scope) or
  // the legacy ?app=<key> query (older installed shortcuts still boot).
  var ACTIVE = (function () {
    try {
      var pm = (location.pathname || '').match(/^\/app\/([a-z]+)\/?/);
      var v = pm ? pm[1] : new URLSearchParams(location.search).get('app');
      return APP_BY_KEY[v] ? v : null;
    } catch (_) { return null; }
  })();

  // ── forsíðu-hleðsluskjár (load screen) ───────────────────────────────────────
  // Sýndur STRAX (fyrir sw/pages hafa hlaðið), falinn þegar buildShell() klárar.
  // Standalone (Bílstjóri) sér um sitt eigið lok í patch 219 — skiptum okkur ekki af.
  var _splashEl = null;
  function showSplash(key) {
    if (isStandalone(key)) return;
    var a = effectiveApp(key); if (!a) return;
    if (_splashEl || document.getElementById('_app-splash')) return;
    var isBoss = a.key === 'boss';
    var d = document.createElement('div');
    d.id = '_app-splash';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483600;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:14px;' + (isBoss ? BOSS_BG_CSS : ('background:linear-gradient(180deg,' + esc(a.color) + ',' + esc(a.dark) + ')')) + ';' +
      'color:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif';
    d.innerHTML = (isBoss ? bossCrownSvg(64) : '<div style="line-height:0;display:flex;justify-content:center">' + ikonHtml(a, 72) + '</div>') +
      '<div style="font-size:19px;font-weight:800;letter-spacing:.02em' + (isBoss ? ';' + BOSS_GOLD_CSS : '') + '">' + esc(a.name) + '</div>' +
      '<div style="width:26px;height:26px;border-radius:50%;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;animation:_appspin .8s linear infinite"></div>' +
      '<style>@keyframes _appspin{to{transform:rotate(360deg)}}</style>';
    (document.body || document.documentElement).appendChild(d);
    _splashEl = d;
    setTimeout(hideSplash, 8000); // öryggisnet — aldrei sitja fastur á hleðsluskjá
  }
  function hideSplash() {
    var el = _splashEl || document.getElementById('_app-splash');
    if (!el) return;
    _splashEl = null;
    el.style.transition = 'opacity .25s ease';
    el.style.opacity = '0';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
  }
  if (ACTIVE && !isStandalone(ACTIVE)) showSplash(ACTIVE);

  // ── config storage (which pages each app shows) — localStorage + AppSettings ─
  // Sama röksemd og við CUSTOM_KEY að ofan (17.09.2026): lestur með varaleiðum,
  // skrif á vegum saveVordud sem setur í biðröð og lætur notandann vita sjálf.
  var CFG_KEY = 'app_profiles_json';
  function loadCfg() {
    var raw = null;
    try { if (window.AppSettings && AppSettings.get) raw = AppSettings.get(CFG_KEY); } catch (_) {}
    if (!raw) { try { raw = localStorage.getItem(CFG_KEY); } catch (_) {} }
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch (_) { return {}; }
  }
  function pagesFor(key) {
    var c = loadCfg();
    var app = APP_BY_KEY[key]; if (!app) return [];
    var arr = (c && Array.isArray(c[key])) ? c[key] : app.defaults;
    // The Fjármál "Fyrirtæki í þjónustu" slot used to point at the fyrirtæki
    // REGISTRY ('companies'); the intended page is the customer list. Swap on
    // read so already-saved configs pick up the fix without re-picking pages.
    arr = arr.map(function (k) { return k === 'companies' && key === 'fjarmal' ? 'vidskiptavinir' : k; });
    // 19.09.2026: 'thjonustubord' (gamla mobíl-borðið, 306) teiknar ekkert lengur. Flutningurinn 11.09 (__bord1)
    // skipti því út í þá vistuðum öppum, en app sem var búið til EFTIR það (eða á `defaults`) sat eftir með dauða
    // síðu sem heimasíðu. Skipt út við LESTUR, svo vistaðar stillingar þurfi enga handavinnu.
    // 19.09.2026 (Agnar: „já"): 'verkbord' (Verkefnalisti) er SAMA sýnin — 368 tók við #verkbord og opnar #bord —
    // svo öpp með bæði báru tvo flipa á sömu síðu (Þjónustuborð, Big Boss). Vísað á 'bord'; de-dup að neðan fellir hinn.
    arr = arr.map(function (k) { return (k === 'thjonustubord' || k === 'verkbord') ? 'bord' : k; });
    // 05.10.2026: gamla 'brunayfirlit' → aðalútgáfan 'brunaskra' (sjá PAGES). De-dup að neðan fellir tvítekningu.
    arr = arr.map(function (k) { return k === 'brunayfirlit' ? 'brunaskra' : k; });
    // 08.10.2026 (Agnar: „setja hana inn í öpp Þjónustuborð“): Samþykkja-síðan (446) fer á Þjónustuborðs-appið við lestur,
    // á eftir borðinu, svo vistaðar stillingar þurfi enga handavinnu. Má taka út í síðuvalinu eins og hverja aðra.
    if (key === 'verkefni' && arr.indexOf('samthykkja') < 0 && !(c && c.__samt446)) { var bi = arr.indexOf('bord'); arr = arr.slice(0, bi + 1).concat(['samthykkja'], arr.slice(bi + 1)); }
    arr = arr.filter(function (k, i) { return arr.indexOf(k) === i; });   // de-dup
    return arr.filter(function (k) { return pageByKey(k); });
  }
  function saveCfg(key, arr) {
    var c = loadCfg(); c[key] = arr;
    var s = JSON.stringify(c);
    try { localStorage.setItem(CFG_KEY, s); } catch (_) {}
    try { if (window.AppSettings && AppSettings.save) AppSettings.save({ app_profiles_json: s }); } catch (_) {}
  }

  // ── útlits-yfirskrift (nafn/lýsing/tákn/litur) á hverju appi — sjálfgefið úr
  // APPS, notandi má breyta gegnum Þjónustuborðið. Sama vistunar-mynstur og cfg. ─
  var OV_KEY = 'app_profiles_overrides_json';
  // 2026-09-09: AppSettings.save() er ÓSAMSTILLT — `_settings` uppfærist ekki
  // fyrr en RPC-ið svarar, svo AppSettings.get() skilar GAMLA gildinu í render()
  // sem keyrir strax á eftir. Fela-takkinn leit því út fyrir að gera ekki neitt:
  // gildið var vistað (localStorage sýndi falid:true) en spjaldið stóð eftir.
  // `_ovNy` heldur því sem VIÐ skrifuðum síðast þar til serverinn skilar sama
  // gildi — þá er henni sleppt svo breyting af annarri vél nái í gegn.
  var _ovNy = null;
  function loadOverrides() {
    var raw = null;
    try { if (window.AppSettings && AppSettings.get) raw = AppSettings.get(OV_KEY); } catch (_) {}
    if (_ovNy) { if (raw === _ovNy) _ovNy = null; else raw = _ovNy; }
    if (!raw) { try { raw = localStorage.getItem(OV_KEY); } catch (_) {} }
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch (_) { return {}; }
  }
  function saveOverrides(key, patch) {
    var o = loadOverrides();
    var cur = o[key] || {};
    for (var k in patch) { cur[k] = patch[k]; }
    for (var k2 in cur) { if (cur[k2] === '' || cur[k2] == null) delete cur[k2]; }
    o[key] = cur;
    var s = JSON.stringify(o);
    _ovNy = s;                                   // gildir strax, líka fyrir render() í sömu andrá
    try { localStorage.setItem(OV_KEY, s); } catch (_) {}
    try { if (window.AppSettings && AppSettings.save) { var payload = {}; payload[OV_KEY] = s; AppSettings.save(payload); } } catch (_) {}
  }
  // Sameinar fast-skilgreint app (APPS) við notenda-yfirskriftina — notað
  // ALLS STAÐAR sem app er teiknað (launcher-kort, haus, splash) svo breyting
  // birtist samstundis alls staðar.
  function effectiveApp(key) {
    var a = APP_BY_KEY[key]; if (!a) return null;
    var ov = loadOverrides()[key] || {};
    var e = {
      key: a.key, manifest: a.manifest, home: a.home, standalone: a.standalone, defaults: a.defaults, custom: !!a.custom,
      emoji: ov.emoji || a.emoji, name: ov.name || a.name, blurb: ov.blurb || a.blurb,
      // 2026-09-08: táknið úr safninu fylgir sömu leið og hitt útlitið, svo það
      // birtist samstundis á spjaldi, haus, splash OG í manifestinu.
      ikon: ov.ikon || a.ikon || null,
      // 2026-09-09 (Agnar: „þoli ekki að geta ekki stjórnað neinu"): INNBYGGÐ öpp
      // var hvorki hægt að eyða né fela — 🗑 birtist aðeins á notenda-búnum. Þau
      // eiga ekki að hverfa úr kóðanum, en þau eiga að mega hverfa úr ræsaranum.
      // `falid` er afturkræft og geymt með hinu útlitinu.
      falid: !!ov.falid,
      color: ov.color || a.color, dark: ov.dark || a.dark
    };
    if (!e.manifest && a.custom) e.manifest = customManifestUrl(e);
    // 19.09.2026: innbyggðu öppin fara líka um fallið (kyrrstætt manifest + yfirskrift Agnars) — SAMA slóð og
    // <head>-veljarinn setur, svo hlekkurinn breytist ekki eftir ræsingu. Tónlist (/spotify/) er utan þessa.
    if (!a.custom && ['fjarmal', 'verkefni', 'brunaholf', 'brunakerfi', 'bilstjori', 'boss'].indexOf(a.key) !== -1) e.manifest = customManifestUrl(e);
    return e;
  }
  function versionLine() {
    var b = window.BUILD;
    if (!b || !b.commit) return null;
    var short = String(b.commit).slice(0, 7);
    var when = '';
    try { when = new Date(b.time).toLocaleString('is-IS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (_) {}
    return short + (when ? ' · ' + when : '');
  }

  // Einskiptis-migrations: nýjar síður bætt í ÞEGAR-VISTAÐAR Fjármál-stillingar
  // (flagg per síðu í cfg svo notandinn geti af-hakað hana eftirá án þess að hún
  // troði sér inn aftur; ný uppsetning fær þær úr defaults).
  //   __brky1 (2026-07-08): br-krofuyfirlit — á eftir krofu-yfirlit
  //   __brtv1 (2026-07-08): br-maeting — aftast fyrir framan br-gerdreikninga
  //   __tvk1  (2026-07-20): thjonustuverk — á eftir arsskodun (ósk Agnars)
  //   __vkp1  (2026-07-20): br-verkkaupar — á eftir br-dagurinn í BRUNAHÓLF-appinu
  //   __rf2   (2026-07-31): rekstrarfelog — á eftir vidskiptavinir í Fjármálum
  //   __jv2   (2026-07-31): br-jarvis — á eftir rekstrarfelog (Fjármál) og
  //   __jv2b                 á eftir br-dagurinn (Brunahólf)
  //   __tvks1 (2026-08-01): thjonustu-verkstaedi — á eftir thjonustuverk (Fjármál)
  //   __bksl1 (2026-08-27): sala — á eftir brunayfirlit í Brunakerfi-appinu
  // KAPPHLAUPS-GALLI SEM VAR LAGAÐUR 2026-07-31: migrationin keyrði EINU SINNI
  // við hleðslu skrárinnar — löngu áður en AppSettings hafði sótt vistuðu
  // stillinguna úr skýinu. Þá var `c[appKey]` ekki fylki, ekkert var sett inn,
  // EN flaggið var samt sett og vistað. Síðan bættist því ALDREI við hjá þeim
  // sem var þegar með vistaðar síður — nákvæmlega þeim sem migrationin er fyrir.
  // Tvennt lagar það: (1) flagg er AÐEINS sett þegar fylkið er raunverulega til,
  // (2) reynt aftur í ~12 s meðan skýja-stillingin er að koma.
  //
  // GAMALT AFRIT ÁT SÍÐULISTA ALLRA APPANNA — LAGAÐ 05.10.2026 (mælt í audit_vernd: 12:39:57 fór
  // app_profiles_json úr 1204 stöfum í 608; Brunakerfi, Boss og þrjú notenda-búin öpp duttu út og allir fengu
  // `defaults` — Agnar: „nú fæ ég líka gamla útgáfu með bara 3 síðum"). Flutningurinn vann á `loadCfg()` STRAX
  // við hleðslu skrárinnar. Þá skilar AppSettings.get() enn skyndiminninu úr localStorage (85, allt að 30 daga
  // gamalt) eða staðbundna afritinu. Vanti eitt flagg í ÞAÐ afrit — sími sem var síðast opnaður fyrir síðasta
  // flutning — taldist það „breytt" og allt gamla afritið var skrifað yfir þjóninn.
  // Nú er staðbundna afritið aðeins VÍSBENDING um að eitthvað vanti. Sjálfur flutningurinn vinnur á gildi sem
  // er lesið af þjóninum rétt áður (einn lykill, ekki 1,4 MB blobbinn). Bregðist sá lestur er EKKERT skrifað.
  (function () {
    var reynt = 0, iLestri = false, lokid = false;
    // → strengur = gildi þjónsins · null = þjónninn á enga stillingu · undefined = lestur brást
    function saekjaFerskt() {
      try {
        if (!(window.DB && DB.sb)) return Promise.resolve(undefined);
        return DB.sb.from('app_settings').select('cfg:settings->>' + CFG_KEY).eq('id', 1).maybeSingle().then(function (r) {
          if (!r || r.error || !r.data) return undefined;
          return r.data.cfg == null ? null : String(r.data.cfg);
        }, function () { return undefined; });
      } catch (_) { return Promise.resolve(undefined); }
    }
    // Hreint fall: breytir `c` á staðnum og skilar true ef eitthvað breyttist.
    function flytja(c) {
        var changed = false;
        // appKey er valfrjálst og fellur aftur á 'fjarmal' svo eldri köllin séu óbreytt.
        function insertOnce(flag, key, afterKey, appKey) {
          appKey = appKey || 'fjarmal';
          if (c[flag]) return;
          var arr = c[appKey];
          // Engin vistuð stilling ENN → ekki brenna flaggið, reyna síðar.
          // (Sé engin stilling til á endanum sér `defaults` um nýju síðurnar.)
          if (!Array.isArray(arr)) return;
          if (arr.indexOf(key) === -1) {
            var ki = arr.indexOf(afterKey);
            arr.splice(ki === -1 ? arr.length : ki + 1, 0, key);
          }
          c[flag] = 1; changed = true;
        }
        insertOnce('__brky1', 'br-krofuyfirlit', 'krofu-yfirlit');
        insertOnce('__brtv1', 'br-maeting', 'vidskiptavinir');
        insertOnce('__tvk1',  'thjonustuverk', 'arsskodun');
        insertOnce('__vkp1',  'br-verkkaupar', 'br-dagurinn', 'brunaholf');
        // NB flögg í ANNARRI kynslóð (__rf2/__jv2) — fyrstu flöggin brunnu í
        // gallanum hér að ofan, svo þau eru ónothæf til að greina „ógert".
        insertOnce('__rf2',   'rekstrarfelog', 'vidskiptavinir');
        insertOnce('__jv2',   'br-jarvis',     'rekstrarfelog');
        insertOnce('__jv2b',  'br-jarvis',     'br-dagurinn', 'brunaholf');
        insertOnce('__tvks1', 'thjonustu-verkstaedi', 'thjonustuverk');
        insertOnce('__yfd1',  'br-yfirferd', 'br-fjarmalyfirlit', 'boss');
        insertOnce('__ds1',   'br-drogstod', 'krofu-yfirlit', 'boss');   // Drög-stöð í Boss (05.09.2026)
        insertOnce('__efk1',  'br-efniskostnadur', 'br-gerdreikninga', 'fjarmal');   // Efniskostnaður/dropp í Fjármál (06.09.2026)
        insertOnce('__efk2',  'br-efniskostnadur', 'br-drogstod', 'boss');           // … og í Boss
        insertOnce('__kst1',  'kostnadur', 'br-efniskostnadur', 'fjarmal');   // Kostnaður (419) í Fjármál (28.09.2026: „ég sé hana ekki")
        insertOnce('__kst2',  'kostnadur', 'br-efniskostnadur', 'boss');      // … og í Boss
        insertOnce('__bksl1', 'sala', 'brunayfirlit', 'brunakerfi');
        insertOnce('__tp1',   'turbopaint', 'sala', 'brunakerfi');
        insertOnce('__tp1b',  'turbopaint', 'br-maeting', 'brunaholf');
        // __bord1 (11.09.2026): Þjónustuborð 2 ('bord', patch 368) kemur í stað gamla mobíl-borðsins
        // ('thjonustubord', 306) í öllum vistuðum öppum og fer á undan 'verkbord' í Verkefni og Boss.
        // Flaggið brennur aðeins ef einhver vistuð app-stilling er til (annars sjá `defaults` um það).
        if (!c.__bord1 && Object.keys(c).some(function (k) { return Array.isArray(c[k]); })) {
          Object.keys(c).forEach(function (k) {
            var arr = c[k];
            if (!Array.isArray(arr)) return;
            var i = arr.indexOf('thjonustubord');
            if (i === -1) return;
            if (arr.indexOf('bord') === -1) arr.splice(i, 1, 'bord'); else arr.splice(i, 1);
          });
          ['verkefni', 'boss'].forEach(function (k) {
            var arr = c[k];
            if (!Array.isArray(arr) || arr.indexOf('bord') !== -1) return;
            var i = arr.indexOf('verkbord');
            arr.splice(i === -1 ? 0 : i, 0, 'bord');
          });
          c.__bord1 = 1; changed = true;
        }
        return changed;
    }
    function keyra() {
      try {
        // Þurrkeyrsla á AFRITI staðbundna gildisins: vanti ekkert þar er ekkert að gera og enginn lestur fer af stað.
        if (!lokid && !iLestri && flytja(JSON.parse(JSON.stringify(loadCfg())))) {
          iLestri = true;
          saekjaFerskt().then(function (raw) {
            iLestri = false;
            if (raw === undefined) return;                 // lestur brást → reynt aftur í næstu umferð, ekkert skrifað
            lokid = true;
            if (raw === null) return;                      // þjónninn á enga stillingu → `defaults` sjá um nýju síðurnar
            var c; try { c = JSON.parse(raw); } catch (_) { return; }
            if (!c || typeof c !== 'object' || !flytja(c)) return;   // þjónninn var þegar fluttur
            var s = JSON.stringify(c);
            try { localStorage.setItem(CFG_KEY, s); } catch (_) {}
            try { if (window.AppSettings && AppSettings.save) AppSettings.save({ app_profiles_json: s }); } catch (_) {}
          });
        }
      // Þögnin rétt (17.09.2026): einskiptis-flutningur sem bætir 'bord' inn í
      // síðulista appanna. Hann keyrir sjálfkrafa upp að 12 sinnum (lína neðar),
      // engin gögn tapast þótt hann sleppi úr, og saveVordud sér um að reyna
      // skýja-skrifið aftur. Aðvörun hér væri hávaði um verk sem enginn bað um.
      } catch (_) {}
      if (++reynt < 12) setTimeout(keyra, 1000);
    }
    keyra();
  })();

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function appLink(key) { return location.origin + '/app/' + key + '/'; }
  // Notenda-búin öpp hafa ekkert kyrrstætt manifest — /api/app-manifest býr það til úr
  // nafni/tákni/lit appsins (netlify/functions/app-manifest.js, 06.09.2026). Án þess
  // bauð Chrome aldrei uppsetningu („get ekki installað Ársskoðun app á heimaskjá").
  // Key-only: SAMA slóð og <head>-veljarinn í index.html setur við hleðslu, svo
  // manifest-hlekkurinn breytist aldrei eftir ræsingu (fallið les nafn/lit úr grunninum).
  function customManifestUrl(a) {
    return '/api/app-manifest?key=' + encodeURIComponent(a.key);
  }

  // ── „The Big Boss" gold-foil skin — pure metal, not a flat yellow bar ────────
  // The generic header/splash (emoji + flat linear-gradient(color,dark)) reads
  // as a plain yellow banner for this app; Agnar asked for the SAME banded
  // gold-metal look as the install icon's "BOSS" wordmark. Scoped to key==='boss'
  // only — every other mini-app keeps the plain emoji+flat-color header.
  var BOSS_GOLD_CSS = 'background:linear-gradient(180deg,#fffbe8 0%,#f9e29a 12%,#e0ad3f 26%,' +
    '#96631a 40%,#6e4a11 46%,#c99a3f 54%,#f6dd8f 64%,#d3a63f 78%,#8a5c17 90%,#f3dd97 100%);' +
    '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent';
  var BOSS_BG_CSS = 'background:linear-gradient(135deg,#2c2c30 0%,#0a0a0b 45%,#000000 100%)';
  var _bossSvgSeq = 0;
  function bossCrownSvg(px) {
    var id = 'bossFoil' + (++_bossSvgSeq);
    return '<svg width="' + px + '" height="' + Math.round(px * 111 / 184) + '" viewBox="0 0 184 111" ' +
      'xmlns="http://www.w3.org/2000/svg" style="flex:none">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#fff6d2"/><stop offset="45%" stop-color="#e2b34a"/>' +
      '<stop offset="55%" stop-color="#8a5c17"/><stop offset="100%" stop-color="#f3dd97"/>' +
      '</linearGradient></defs>' +
      '<path d="M0 94L0 56L42 86L92 8L142 86L184 56L184 94Z" fill="url(#' + id + ')"/>' +
      '<rect x="0" y="94" width="184" height="17" rx="4" fill="url(#' + id + ')"/>' +
      '<circle cx="0" cy="49" r="11" fill="url(#' + id + ')"/>' +
      '<circle cx="92" cy="2" r="12.5" fill="url(#' + id + ')"/>' +
      '<circle cx="184" cy="49" r="11" fill="url(#' + id + ')"/></svg>';
  }

  // Navigate to a page — click its real sidebar button when present (lazy pages
  // render most reliably that way), else fall back to App.switchView.
  function navTo(key) {
    var btn = document.querySelector('.vnav-btn[data-view="' + key + '"]');
    if (!btn) {
      var all = document.querySelectorAll('.vnav-btn');
      for (var i = 0; i < all.length; i++) {
        var oc = all[i].getAttribute('onclick') || '';
        if (oc.indexOf("switchView('" + key + "')") !== -1) { btn = all[i]; break; }
      }
    }
    if (btn) { btn.click(); return; }
    try { if (window.App && App.switchView) App.switchView(key); } catch (_) {}
  }

  // ── install (per-app manifest) ───────────────────────────────────────────────
  var deferredPrompt = null;
  // 20.09.2026 (Agnar: „Get bara haft einhver 3-4. Hin opnast í gegnum þau"): aðalappið (manifest.json) hefur scope "/",
  // svo sé ÞAÐ uppsett grípur Android alla /app/<key>/ hlekki og opnar þá inni í því. Þar segir display-mode „standalone"
  // þótt ÞETTA app sé ekki uppsett. Fyrsta slóð gluggans segir hvaða app hýsir okkur í raun.
  var _hysill = '';
  try {
    _hysill = sessionStorage.getItem('_pwa_hysill') || '';
    if (!_hysill) { _hysill = location.pathname || '/'; sessionStorage.setItem('_pwa_hysill', _hysill); }
  } catch (_) {}
  function hystAfOdru() { return !!(ACTIVE && _hysill && _hysill.indexOf('/app/' + ACTIVE + '/') !== 0); }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredPrompt = e; refreshInstallBtns();
    // Arrived via „Setja upp" (…/app/<key>/?install=1) → show the native install
    // dialog for THIS app the moment the browser offers it.
    try { if (new URLSearchParams(location.search).has('install')) setTimeout(doInstall, 300); } catch (_) {}
  });
  // 20.09.2026 (Agnar: „Ég get ekki installað öppunum" · „Gerir ekkert"): þegar Chrome býður EKKI uppsetningu
  // (appið þegar uppsett, boðinu hafnað áður, eða iOS) endurhlóð takkinn síðuna á ?install=1 og svo gerðist
  // ekkert — leiðbeiningarnar birtust fyrst við ANNAN smell. Nú birtast þær sjálfar ef boðið kemur ekki á 3 sek.
  var _promptSynt = false;
  try {
    if (new URLSearchParams(location.search).has('install')) {
      window.addEventListener('load', function () {
        setTimeout(function () {
          if (deferredPrompt || _promptSynt || document.getElementById('_app-inst-guide')) return;
          if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
          showInstallGuide();
        }, 3000);
      });
    }
  } catch (_) {}
  // Skilaboð sem sjást ALLTAF — Toast-ið liggur undir app-hausnum í app-ham og sást ekki.
  function segja(msg) {
    var d = document.getElementById('_app-inst-msg');
    if (!d) { d = document.createElement('div'); d.id = '_app-inst-msg'; document.body.appendChild(d); }
    d.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);transform:translateX(-50%);z-index:2147483647;' +
      'max-width:calc(100vw - 24px);background:#11141c;color:#fff;border:1px solid #c9a54a;border-radius:12px;padding:12px 16px;' +
      'font:600 14.5px system-ui,sans-serif;line-height:1.4;box-shadow:0 12px 30px -8px rgba(0,0,0,.6);text-align:center';
    d.textContent = msg;
    clearTimeout(segja._t); segja._t = setTimeout(function () { try { d.remove(); } catch (_) {} }, 4500);
  }
  function setManifest(href) {
    var l = document.querySelector('link[rel="manifest"]');
    if (l && href) l.setAttribute('href', href);
  }
  async function doInstall() {
    // Already running as an installed PWA — nothing to do.
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      synaUppsettHjalp();
      return;
    }
    if (deferredPrompt) { _promptSynt = true; deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (_) {} deferredPrompt = null; refreshInstallBtns(); return; }
    // No native prompt yet. If we haven't tried a fresh page load, navigate to
    // ?install=1 so Chrome gets a clean shot at beforeinstallprompt on load.
    // The beforeinstallprompt listener will auto-call doInstall() if it fires.
    if (ACTIVE) {
      try {
        var _params = new URLSearchParams(location.search);
        if (!_params.has('install')) { segja('Opna uppsetningu…'); location.href = appLink(ACTIVE) + '?install=1'; return; }
      } catch (_) {}
    }
    // Already at ?install=1 and Chrome still won't offer the prompt — fall back
    // to the manual guide (⋮ menu instructions).
    showInstallGuide();
    // Relabel all install buttons so it's clear that pressing them again just
    // re-opens the instructions — not the actual OS install dialog.
    document.querySelectorAll('#_app-inst2,._app-install[data-always]').forEach(function (b) {
      b.textContent = 'Leiðbeiningar';
    });
  }
  // Inni í uppsettu appi: „Setja upp" getur ekkert gert — en notandinn er oftast að leita að tákninu á heimaskjánum.
  function synaUppsettHjalp() {
    if (document.getElementById('_app-inst-guide')) return;
    var a = effectiveApp(ACTIVE) || { key: ACTIVE };
    var d = document.createElement('div');
    d.id = '_app-inst-guide';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6)';
    d.innerHTML = '<div style="background:#fff;border-radius:20px 20px 0 0;padding:22px 20px 32px;max-width:480px;width:100%;box-shadow:0 -8px 40px rgba(0,0,0,.25);font-family:system-ui,sans-serif">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
      '<div style="font-size:17px;font-weight:800;color:#11141c">' + (hystAfOdru() ? 'Setja þetta app upp sér' : 'Appið er þegar uppsett') + '</div>' +
      '<button id="_app-inst-guide-x" type="button" style="min-width:44px;height:44px;background:#f1f5f9;border:none;border-radius:12px;cursor:pointer;font-size:15px;font-weight:700;color:#334155">Loka</button></div>' +
      (hystAfOdru()
        ? '<div style="font-size:14.5px;color:#1e293b;line-height:1.55">Þetta app er <b>ekki uppsett sér</b> — það opnaðist inni í öðru uppsettu appi (' + esc(_hysill === '/' ? 'aðalappinu Slökkvitæki' : _hysill) + '), og þar er ekki hægt að setja upp. Ýttu á <b>Opna í Chrome</b> og settu það upp þaðan: <b>Setja upp</b>, eða ⋮ → „Setja upp app".</div>'
        : '<div style="font-size:14.5px;color:#1e293b;line-height:1.55"><b>Finnst táknið ekki á heimaskjánum?</b> Strjúktu upp í forritalistann, haltu fingri á appinu og veldu <b>„Bæta á heimaskjá"</b>.</div>') +
      '<div id="_pe-heim-host"></div></div>';
    document.body.appendChild(d);
    var host = d.querySelector('#_pe-heim-host');
    host.innerHTML = hystAfOdru()
      ? '<div style="margin:14px 0 0"><a href="' + esc(chromeHlekkur(a)) + '" target="_blank" rel="noopener" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#11141c;color:#fff;font-weight:800;text-decoration:none">Opna í Chrome ›</a></div>'
      : '<div style="margin:12px 0 0;padding:12px 13px;border-radius:12px;background:#fef9c3;color:#713f12;font-size:13.5px;line-height:1.55">' +
      '<b>Setja upp aftur</b> (nýtt tákn/litur strax, eða táknið týnt):<ol style="margin:6px 0 8px;padding-left:20px">' +
      '<li>Ýttu á <b>Opna í Chrome</b>.</li><li>Fjarlægðu gamla appið: haltu fingri á tákninu → <b>Fjarlægja / Uninstall</b>.</li>' +
      '<li>Í Chrome: endurhlaðaðu og veldu <b>Setja upp</b> (eða ⋮ → „Setja upp app").</li></ol>' +
      '<a href="' + esc(chromeHlekkur(a)) + '" target="_blank" rel="noopener" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#11141c;color:#fff;font-weight:800;text-decoration:none">Opna í Chrome ›</a></div>';
    d.addEventListener('click', function (e) { if (e.target === d) d.remove(); });
    d.querySelector('#_app-inst-guide-x').addEventListener('click', function () { d.remove(); });
  }
  function showInstallGuide() {
    if (document.getElementById('_app-inst-guide')) return;
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    var steps = isIos
      ? ['Opnaðu þessa síðu í <b>Safari</b> (ekki Chrome/Firefox á iOS)', 'Ýttu á <b>Share</b> hnappinn neðst á skjánum', 'Veldu <b>„Bæta við heimaskjá"</b> úr listanum']
      : ['Opnaðu valmynd vafrans (<b>⋮</b> efst til hægri)', 'Veldu <b>„Setja upp app"</b> eða <b>„Bæta á heimaskjá"</b>', 'Ýttu á <b>Setja upp</b> í staðfestingarglugganum'];
    var hint = isIos && !isSafari
      ? '<div style="background:#fff;color:#1c2028;border:1px solid rgba(20,24,34,.16);border-left:3px solid #b3261e;border-radius:7px;padding:10px 14px;margin-bottom:14px;font-size:13px;font-weight:600">iOS krefst Safari — Chrome á iPhone/iPad getur ekki sett upp heimaskjáforrit.</div>'
      : '';
    // On Android Chrome the browser's own ⋮ menu is the only path once
    // beforeinstallprompt has been consumed — make that crystal-clear.
    var androidNote = !isIos
      ? '<div style="background:#fff;border:1px solid rgba(20,24,34,.16);border-left:3px solid #b3261e;border-radius:7px;padding:10px 14px;margin-top:14px;font-size:13px;color:#1c2028;line-height:1.5">'
        + '<b>Af hverju kom enginn gluggi?</b> Chrome býður ekki uppsetningu ef appið er <b>þegar á símanum</b> (gáðu á heimaskjáinn — í ⋮ stendur þá „Opna app") eða ef boðinu var hafnað nýlega. Leiðin um <b>valmynd vafrans (⋮)</b> virkar alltaf.</div>'
      : '';
    var d = document.createElement('div');
    d.id = '_app-inst-guide';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)';
    d.innerHTML = '<div style="background:#fff;border-radius:20px 20px 0 0;padding:24px 22px 36px;max-width:480px;width:100%;box-shadow:0 -8px 40px rgba(0,0,0,.25)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
      + '<div style="font-family:' + B48_DISP + ';font-size:20px;font-weight:800;color:#11141c">Setja upp í síma</div>'
      + '<button id="_app-inst-guide-x" type="button" style="width:32px;height:32px;background:#f1f5f9;border:none;border-radius:50%;cursor:pointer;line-height:0;color:#3b414b;display:inline-flex;align-items:center;justify-content:center">' + B48_IK.x + '</button>'
      + '</div>'
      + hint
      + '<ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:10px">'
      + steps.map(function(s){ return '<li style="font-size:15px;color:#1e293b;line-height:1.45">'+s+'</li>'; }).join('')
      + '</ol>'
      + androidNote
      + '<div style="margin-top:18px;font-size:12.5px;color:#94a3b8;line-height:1.5">Þegar forritið er sett upp opnarðu það beint af heimaskjánum eins og hvaða app sem er.</div>'
      + '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function(e) { if (e.target === d) d.remove(); });
    d.querySelector('#_app-inst-guide-x').addEventListener('click', function() { d.remove(); });
  }
  function refreshInstallBtns() {
    document.querySelectorAll('._app-install').forEach(function (b) {
      b.style.display = deferredPrompt ? '' : (b.dataset.always ? '' : b.style.display);
    });
  }
  function toast(msg) { if (window.Toast && Toast.show) Toast.show(msg); else try { alert(msg); } catch (_) {} }

  // Brunahólf Fjármála-yfirlit viewport: pinch + hard-zoom reflow. 166 used to
  // write width=390 in appmode (getViewMode → mobile) which froze Android zoom.
  var HUB_VP = window.__HUB_VP || 'width=device-width, initial-scale=1, user-scalable=yes, viewport-fit=cover';  // window.__HUB_VP: breitt útlit á síma, ákveðið í <head> (index.html, 05.10.2026)
  function setHubViewport() {
    try {
      var vp = document.querySelector('meta[name="viewport"]');
      if (!vp) {
        vp = document.createElement('meta');
        vp.setAttribute('name', 'viewport');
        (document.head || document.documentElement).appendChild(vp);
      }
      if (vp.getAttribute('content') !== HUB_VP) vp.setAttribute('content', HUB_VP);
    } catch (_) {}
  }

  // ── styles ───────────────────────────────────────────────────────────────────
  function styles() {
    if (document.getElementById('_app-styles')) return;
    var css = [
      // ── FYLKI: síður × öpp ──────────────────────────────────────────────
      // Fyrsta súlan er LÆST (position:sticky) svo síðuheitið sjáist alltaf
      // þegar strokið er til hliðar — annars veit maður ekki hvaða röð maður
      // er að haka við um leið og öppin verða fleiri en skjárinn ber.
      '.mx-box{padding:12px !important;overflow:hidden}',
      '.mx-sum{position:relative;display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;padding:11px 14px 11px 32px;cursor:pointer;list-style:none;user-select:none;background:' + B48_METAL + ';border:1px solid #000;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 2px rgba(0,0,0,.35)}',
      '.mx-sum-tt{display:flex;flex-direction:column;min-width:0}',
      '.mx-sum-k{font-family:' + B48_MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#aab1bb !important;line-height:1.2}',
      '.mx-chev{display:inline-flex;color:#c9ced6;transition:transform .18s}',
      '.mx-chev svg{width:16px;height:16px}',
      '.mx-box[open] .mx-chev{transform:rotate(180deg)}',
      '.mx-sum::-webkit-details-marker{display:none}',
      '.mx-sum-t{font-family:' + B48_DISP + ';font-weight:800;font-size:18px;color:#fff;line-height:1.15;margin-top:2px;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      '.mx-sum-n{margin-left:auto;font-family:' + B48_MONO + ';font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#c9ced6;white-space:nowrap}',
      '.mx-scroll{overflow-x:auto;overflow-y:visible;-webkit-overflow-scrolling:touch;margin-top:10px;border:1px solid rgba(20,24,34,.24);border-radius:7px;background:#fff;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}',
      // Appið þvingar ALLAR töflur í `display:block;max-width:100%;overflow-x:auto`
      // (almenn "responsive tafla"-regla). Þá verður taflan sjálf skrunbox inni í
      // .mx-scroll, læsta súlan hættir að virka og síðustu dálkarnir KLIPPAST AF
      // í stað þess að skrunast (staðfest: síðasta appið á x=546 í 470px glugga).
      // Hér er hún færð aftur í alvöru töflu og skrunið skilið eftir hjá .mx-scroll.
      '.mx-scroll .mx-t{display:table !important;border-collapse:separate;border-spacing:0;font-size:12.5px;width:max-content !important;min-width:100% !important;max-width:none !important;overflow:visible !important}',
      '.mx-t th,.mx-t td{padding:0;margin:0}',
      '.mx-t thead th{position:sticky;top:0;z-index:3;background:#26262c !important;border-bottom:1px solid #000;color:#e3e7ee}',
      '.mx-cnr{position:sticky;left:0;z-index:4 !important;background:#1c1e23 !important;text-align:left;padding:8px 12px !important;font-family:' + B48_MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#aab1bb !important;min-width:190px;border-right:1px solid #000}',
      '.mx-ah{padding:7px 4px !important;min-width:62px;text-align:center;vertical-align:bottom}',
      '.mx-ae{font-size:17px;line-height:1.1}',
      '.mx-an{font-family:' + B48_SANS + ';font-size:9px;font-weight:600;color:#c9ced6 !important;line-height:1.15;max-width:62px;margin:2px auto 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.mx-rh{position:sticky;left:0;z-index:2;background:#fff;text-align:left;font-family:' + B48_SANS + ';font-weight:600;color:#1c2028;padding:6px 12px !important;border-right:1px solid rgba(20,24,34,.14);border-bottom:1px solid #eceff3;white-space:nowrap}',
      '.mx-t tbody tr:nth-child(even) .mx-rh{background:#f5f6f8}',
      '.mx-t tbody tr:nth-child(even) td{background:#f5f6f8}',
      '.mx-pe{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-right:8px;vertical-align:-6px;border-radius:5px;border:1px solid rgba(20,24,34,.14);background:' + B48_SILVER + ';color:#b3261e}',
      '.mx-pe svg{width:13px;height:13px}',
      // Útgáfu-raðir eru inndregnar og merktar v2/v3 svo sjáist strax að þetta
      // er SAMA síðan í annarri útfærslu, ekki ótengd síða.
      '.mx-sub .mx-rh{padding-left:30px !important;font-weight:500;color:#4a515c}',
      '.mx-vb{display:inline-block;margin-right:7px;background:' + B48_SILVER + ';border:1px solid rgba(179,38,30,.45);color:#8a1414;border-radius:4px;padding:1px 5px;font-family:' + B48_MONO + ';font-size:9px;font-weight:700;letter-spacing:.08em;vertical-align:1px}',
      '.mx-sub .mx-vb{border-color:rgba(20,24,34,.22);color:#5b6370}',
      // B48 sími: síðudálkurinn má ekki gleypa skjáinn (309 px af 323) — brotnar í línur svo öppin sjáist strax
      '@media (max-width:600px){.mx-cnr{min-width:0 !important;width:132px}.mx-rh{white-space:normal !important;min-width:132px;max-width:140px;line-height:1.25;padding:6px 8px !important}.mx-sub .mx-rh{padding-left:14px !important}.mx-pe{margin-right:5px}}',
      '.mx-c{text-align:center;border-bottom:1px solid #eceff3}',
      '.mx-c input{width:17px;height:17px;accent-color:#b3261e;cursor:pointer;margin:6px auto;display:block}',
      '.mx-op{width:34px;text-align:center;border-bottom:1px solid #eceff3}',
      '#view-opp .mx-open{all:unset;cursor:pointer;color:#7a828e !important;background:transparent !important;border:0 !important;box-shadow:none !important;padding:5px 6px;border-radius:6px;display:inline-flex !important;align-items:center;min-height:0 !important}',
      '#view-opp .mx-open svg{width:15px;height:15px}',
      '#view-opp .mx-open:hover{color:#b3261e !important;background:#f1f2f4 !important}',
      '.mx-hint{padding:9px 2px 0;font-family:' + B48_SANS + ';font-size:11.5px;color:#3b414b}',
      // launcher page — B48: dökka bandið nær niður fyrir titilinn (endar ~335 px á 1600 og í Tölvusíðu-ham);
      // áður dofnaði það frá 95 px og hvíti 409-titillinn + undirlínan stóðu á miðgráu
      '#' + VIEW_ID + '{padding:0 !important;background:linear-gradient(180deg,#060607 0px,#101115 300px,#1c1e23 345px,#aeb4be 560px,#9ba1ad 100%) !important;min-height:100vh}',
      // Launcher-inn er hub-síða → fasti Brunastál-borðinn (og hamborgarinn) liggja
      // ofan á honum. Ýtum innihaldinu niður fyrir borðann svo „📱 Öpp" titillinn
      // sé ekki falinn. Á síma er borðinn grennri en á skjáborði.
      '#' + VIEW_ID + ' .op-main{max-width:760px;margin:0 auto;padding:96px 18px 60px;box-sizing:border-box}',
      '@media (min-width:901px){#' + VIEW_ID + ' .op-main{padding-top:118px}}',
      // Skjár: Fylki-spjaldið var 760px-eyja á risastórum gráum fleti. Breiðara
      // svo Stílstjóri geti málað síðuna. Sími/Tafla halda 760px. Aðrar síður ósnertar.
      'html[data-viewmode="desktop"] #' + VIEW_ID + ' .op-main{max-width:min(1280px,calc(100% - 40px))}',
      '#' + VIEW_ID + ' .op-kick{font-family:' + B48_MONO + ';font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#aab1bb !important;margin:0 0 4px}',
      '#' + VIEW_ID + ' .op-h1{margin:0 0 4px;font-family:' + B48_DISP + ';font-size:32px;font-weight:800;color:#fff;letter-spacing:.005em;line-height:1.1;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 10px rgba(0,0,0,.4)}',
      '#' + VIEW_ID + ' .op-sub{margin:0 0 20px;font-family:' + B48_SANS + ';font-size:13px;color:#c9ced6}',
      '#' + VIEW_ID + ' .op-card{background:' + B48_PLATE + ';border:1px solid #0b0c0f;border-radius:10px;padding:14px;margin:0 0 16px;box-shadow:0 18px 40px -22px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.7);font-family:' + B48_SANS + ';color:#1c2028}',
      '#' + VIEW_ID + ' .op-top{position:relative;display:flex;align-items:center;gap:13px;background:' + B48_METAL + ';border:1px solid #000;border-radius:8px;padding:12px 14px 12px 32px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 2px rgba(0,0,0,.4)}',
      '#' + VIEW_ID + ' .op-top > div:last-child{min-width:0}',
      '#' + VIEW_ID + ' .op-ic{width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;flex:none;color:#fff;border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 2px 6px rgba(0,0,0,.5)}',
      '#' + VIEW_ID + ' .op-nm{font-family:' + B48_DISP + ';font-size:21px;font-weight:800;color:#fff;line-height:1.1;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      '#' + VIEW_ID + ' .op-bl{font-family:' + B48_SANS + ';font-size:12.5px;color:#c9ced6;margin-top:3px}',
      '#' + VIEW_ID + ' .op-acts{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}',
      '#' + VIEW_ID + ' .op-btn{font-family:' + B48_SANS + ' !important;font-size:13px;font-weight:600;padding:0 14px;border-radius:7px !important;border:1px solid rgba(20,24,34,.28) !important;background:' + B48_SILVER + ' !important;color:#1c2028 !important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.12) !important;text-shadow:none !important;cursor:pointer;min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;line-height:1.1}',
      '#' + VIEW_ID + ' .op-btn svg{width:15px;height:15px;flex:none;color:#525b6b}',
      '#' + VIEW_ID + ' .op-btn:hover{box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(201,42,42,.35),0 2px 6px rgba(0,0,0,.14) !important}',
      '#' + VIEW_ID + ' .op-btn:active{transform:translateY(1px)}',
      '#' + VIEW_ID + ' .op-btn.prim{background:' + B48_RAUTT + ' !important;border-color:#2a0303 !important;color:#fff !important;font-weight:700;text-shadow:0 1px 1px rgba(0,0,0,.55) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -1px 0 rgba(0,0,0,.3),0 2px 4px rgba(0,0,0,.28) !important}',
      '#' + VIEW_ID + ' .op-btn.prim svg{color:#ffd9d6}',
      '#' + VIEW_ID + ' .op-btn.prim:hover{filter:brightness(1.1)}',
      '#' + VIEW_ID + ' .op-btn.op-haett{color:#8a1414 !important}',
      '#' + VIEW_ID + ' .op-btn.op-haett svg{color:#b3261e}',
      '#' + VIEW_ID + ' .op-sech{font-family:' + B48_MONO + ';font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5b6370;margin:18px 0 8px}',
      // Samanbrjótanlegt síðuval (lokað sjálfgefið) — heldur launcher þéttum.
      '#' + VIEW_ID + ' .op-pagesbox{margin-top:12px;border-top:1px solid rgba(20,24,34,.14);padding-top:6px}',
      '#' + VIEW_ID + ' .op-pgsum{display:flex;align-items:center;gap:8px;list-style:none;cursor:pointer;padding:9px 4px;border-radius:7px;min-height:44px;-webkit-tap-highlight-color:transparent}',
      '#' + VIEW_ID + ' .op-pgsum::-webkit-details-marker{display:none}',
      '#' + VIEW_ID + ' .op-pgsum:hover{background:rgba(255,255,255,.45)}',
      '#' + VIEW_ID + ' .op-pgsum-t{display:inline-flex;align-items:center;gap:7px;font-family:' + B48_MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#3b414b}',
      '#' + VIEW_ID + ' .op-pgsum-t svg{width:14px;height:14px;color:#b3261e}',
      '#' + VIEW_ID + ' .op-pgcount{margin-left:auto;font-family:' + B48_MONO + ';font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a1414;background:' + B48_SILVER + ';border:1px solid rgba(179,38,30,.45);padding:3px 9px;border-radius:5px;white-space:nowrap}',
      '#' + VIEW_ID + ' .op-pgchev{display:inline-flex;color:#5b6370;transition:transform .18s}',
      '#' + VIEW_ID + ' .op-pgchev svg{width:16px;height:16px}',
      '#' + VIEW_ID + ' .op-pagesbox[open] .op-pgchev{transform:rotate(180deg)}',
      '#' + VIEW_ID + ' .op-pages{display:flex;flex-direction:column;gap:2px;margin-top:6px}',
      '#' + VIEW_ID + ' .op-pg{display:flex;align-items:center;gap:11px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:14px;color:#1c2028}',
      '#' + VIEW_ID + ' .op-pg:hover{background:rgba(255,255,255,.5)}',
      '#' + VIEW_ID + ' .op-pg input{width:19px;height:19px;accent-color:#b3261e;flex:none}',
      '#' + VIEW_ID + ' .op-pg .e{flex:none;width:28px;height:28px;border-radius:6px;border:1px solid rgba(20,24,34,.14);background:' + B48_SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);display:inline-flex;align-items:center;justify-content:center;color:#b3261e}',
      '#' + VIEW_ID + ' .op-pg .e svg{width:15px;height:15px}',
      // Nýtt app-spjaldið og falin-öpp-línan sitja á gráa fletinum — dökkt gler, ljóst letur.
      '#' + VIEW_ID + ' .op-card.op-ny{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:150px;border:2px dashed rgba(255,255,255,.4);background:rgba(10,12,16,.55);box-shadow:none}',
      '#' + VIEW_ID + ' .op-ny-plus{width:44px;height:44px;border-radius:50%;background:' + B48_METAL + ';border:1px solid #000;display:flex;align-items:center;justify-content:center;color:#e3e7ee;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.4)}',
      '#' + VIEW_ID + ' .op-ny-plus svg{width:20px;height:20px}',
      '#' + VIEW_ID + ' .op-ny-txt{font-size:11.5px;color:#e3e7ee;text-align:center;max-width:240px;line-height:1.45}',
      '#' + VIEW_ID + ' .op-falin{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:9px;margin:-4px auto 14px;padding:6px 8px 6px 12px;width:max-content;max-width:100%;box-sizing:border-box;border-radius:8px;background:rgba(10,12,16,.6);font-size:12.5px;color:#e3e7ee}',
      '#' + VIEW_ID + ' .op-falin .op-btn{min-height:32px;padding:0 11px;font-size:12px}',
      '#' + VIEW_ID + ' .op-ver{text-align:center;font-family:' + B48_MONO + ';font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#2a2f37;margin-top:4px}',
      // ── app mode shell ──
      'body.appmode,body.appmode #app{overflow-x:auto!important;touch-action:pan-x pan-y pinch-zoom}',
      'body.appmode #bstal-banner{display:none !important}',
      'body.appmode .topbar,body.appmode .sidebar,body.appmode nav.view-nav{display:none !important}',
      // Hide every mobile-nav hamburger variant (three patches ship one) + drawers.
      'body.appmode .mobile-nav-toggle,body.appmode .mobile-nav-backdrop,body.appmode .mobile-nav-drawer,' +
        'body.appmode #_mnav_btn,body.appmode #_mobnav_btn,body.appmode #_slokk_hamb,' +
        'body.appmode #_mnav_drawer,body.appmode #_mnav_scrim,body.appmode #_mobnav_drawer{display:none !important}',
      // Full-width content: .view carries margin-left:220px + width:calc(100vw-220px)
      // (the sidebar slot) from app.css — hidden sidebar leaves an empty left gutter.
      'body.appmode .view,body.appmode .view.active{margin-left:0 !important;width:100vw !important;max-width:100vw !important;left:0 !important}',
      'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode .view.active:not(#view-field):not(#view-counter):not(#view-workshop){margin-left:0 !important;width:100vw !important;max-width:100vw !important}',
      'body.appmode .main-panel{margin-left:0 !important;margin-right:0 !important;max-width:none !important}',
      'body.appmode .view.active{padding-top:50px !important;padding-bottom:116px !important}',
      // App-síðurnar sitja á STEEL-GRÁA bakgrunni skjáborðsþemunnar (Brunastál),
      // ekki flötu hvítu. Áður þvingaðum við hvítt (til að dökka gradientinn frá
      // 229-sala-theme-bridge blæddi ekki inn) — en það drap grámann sem síðurnar
      // eru hannaðar fyrir og hvítu titlarnir hurfu (hvítt-á-hvítu). Nú notum við
      // gráu stoppin úr Brunastál-gradientinum (patch 230: #aeb4be→#9ba1ad) EN án
      // svarta toppsins (0–95px) sem olli „dökka yfirlaginu" (#671). Þannig fá
      // síðurnar aftur skjáborðs-grámann og hvítu titlarnir verða læsilegir.
      // (Ósk Agnars 2026-08-22: „settu gráa upprunalega bakgrunninn aftur á þær".)
      // Launcher (#view-opp) heldur sínum eigin dökka gradient.
      'body.appmode .view.active:not(#view-opp){background:linear-gradient(180deg,#aeb4be 0px,#9ba1ad 340px,#9ba1ad 100%) !important}',
      // Beat patch 230's ON+':not(#id)…{padding-top:160px}` (id-level specificity) when the
      // Brunastál banner attr is present — otherwise the content sits 160px below my header.
      'html[data-bstal-banner="on"][data-thm-preset="brunastal"] body.appmode .view.active:not(#view-field):not(#view-counter):not(#view-workshop){padding-top:50px !important;padding-bottom:116px !important}',
      '#_app-hdr{position:fixed;top:0;left:0;right:0;height:50px;z-index:2147481001;display:flex;align-items:center;gap:8px;padding:0 10px 0 12px;color:#fff;border-bottom:1px solid #000;box-shadow:0 2px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.18)}',
      '#_app-hdr .nm{font-family:' + B48_DISP + ';font-size:18px;font-weight:800;flex:1;min-width:0;display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 1px rgba(0,0,0,.55)}',
      '#_app-hdr button{font-family:' + B48_SANS + ' !important;font-size:12.5px;font-weight:600;height:34px;padding:0 11px;border-radius:7px !important;border:1px solid #000 !important;background:' + B48_MBTN + ' !important;color:#e3e7ee !important;cursor:pointer;flex:none;display:inline-flex !important;align-items:center;justify-content:center;gap:6px;text-shadow:none !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.5) !important}',
      '#_app-hdr button svg{width:16px;height:16px;flex:none}',
      '#_app-hdr button:hover{color:#fff !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 1px rgba(224,96,90,.55) !important}',
      '#_app-hdr ._applbl{font-style:normal}',
      // Bottom nav = 3-column grid (2 rows for up to 6 pages), bigger thumb targets.
      // 2026-07-19: EIN skrunanleg lína (ekki 3-dálka grind sem vafðist í 2
      // raðir — neðri röðin faldist á bak við home-strikuna á síma svo aðeins
      // 3 flipar sáust). flex:1 0 78px → fáir flipar fylla breiddina, margir
      // haldast í einni röð og skrunast lárétt (sama og Verkborð-lausnin).
      '#_app-nav{position:fixed;bottom:0;left:0;right:0;z-index:2147481001;display:flex;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:7px;background:' + B48_METAL + ';border-top:1px solid #000;padding:9px 9px calc(9px + env(safe-area-inset-bottom,0px));box-shadow:0 -3px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.1)}',
      '#_app-nav::-webkit-scrollbar{display:none}',
      // 2026-07-29: dokkan var 256px há með 52px emoji — á appi með fáar/eina síðu
      // varð þetta risaflís sem gleypti hálfan skjáinn. Nú þéttur þumal-dokki
      // (~84px) og felst alveg þegar appið hefur bara eina síðu (ekkert að velja).
      '#_app-nav button{flex:1 0 84px;min-width:84px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.015)) !important;border:1px solid rgba(255,255,255,.07) !important;color:#aab1bb !important;font-family:' + B48_SANS + ' !important;font-size:13.5px;font-weight:600;text-shadow:none !important;box-shadow:none !important;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px 5px;border-radius:8px !important;min-height:120px;text-align:center;line-height:1.15;overflow:hidden}',
      '#_app-nav button .e{font-size:28px;line-height:1;display:inline-flex}',
      '#_app-nav button .e svg{width:1em;height:1em;stroke-width:1.8}',
      'body.appmode-nonav #_app-nav{display:none !important}',
      'body.appmode.appmode-nonav .view.active{padding-bottom:24px !important}',
      'body.appmode-nonav #_app-frame{bottom:0 !important}',
      '#_app-nav button.on{color:#fff !important;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.04)) !important;box-shadow:inset 0 2px 0 #c22f26 !important}',
      '#_app-nav button.on .e{color:#ff7a70}',
      // external-page iframe host (sits between the header and the bottom nav)
      '#_app-frame{position:fixed;top:50px;left:0;right:0;bottom:104px;z-index:2147481000;background:#fff;display:none}',
      '#_app-frame iframe{width:100%;height:100%;border:0;display:block}',
      // ── App-mode readability: bigger text + thumb-friendly tap targets. Scoped to
      //    body.appmode so the office desktop view is untouched. ──
      'body.appmode .view{font-size:17px}',
      'body.appmode .view button,body.appmode .view .btn,body.appmode .view a.btn,body.appmode .view [role="button"]{font-size:17px !important;min-height:50px;padding-top:12px !important;padding-bottom:12px !important;line-height:1.2}',
      'body.appmode .view input,body.appmode .view select,body.appmode .view textarea{font-size:18px !important;min-height:52px}',
      // tiny stacked icon+label action buttons (e.g. Krafa send / Greitt / Reikning) — keep compact but legible
      'body.appmode .view button:has(> svg),body.appmode .view .abtn5{font-size:14.5px !important}',
      'body.appmode .view .pill,body.appmode .view .chip,body.appmode .view [class*="pill"],body.appmode .view [class*="chip"]{font-size:15px !important}',
      // section/table text larger
      'body.appmode .view td,body.appmode .view th,body.appmode .view label,body.appmode .view p,body.appmode .view li{font-size:16.5px}',
      // headings a step up too
      'body.appmode .view h1{font-size:30px !important}',
      'body.appmode .view h2,body.appmode .view h3{font-size:21px !important}',
      '#_app-nav button{font-size:14.5px}',
      // Fyrirtæki í þjónustu-taflan (#ars-main) í appmode: litlu hringlaga
      // hnapparnir (forgangur ❗ / akstur 🚗 / merkja ✓ / staða) teygðust í
      // 50px sporöskjur af thumb-target reglunni (.view button{min-height:50px})
      // — „pulled circle". Undanskiljum þá svo þeir haldist hringlaga.
      'body.appmode #ars-main table button,body.appmode #ars-main table .akstur,body.appmode #ars-main table ._arsak-chip{min-height:0 !important;height:auto !important;padding-top:2px !important;padding-bottom:2px !important;line-height:1.1 !important}',
      // Kröfu yfirlit is an OVERVIEW list. The 50px-on-every-button rule turns
      // 8 .ky-abtn + month ◀▶ into sausages and the 52px input blows the
      // always-visible minnispunktur. Patch 166 owns compact sizes; we only
      // stop the hammer here (same pattern as #ars-main above).
      'body.appmode #view-krofu-yfirlit .ky-abtn,body.appmode #view-krofu-yfirlit .ky-navbtn,body.appmode #view-krofu-yfirlit .ky-mcopy,body.appmode #view-krofu-yfirlit .filter-chip,body.appmode #view-krofu-yfirlit ._ky-sync,body.appmode #view-krofu-yfirlit ._ky-exp{min-height:0 !important;padding-top:0 !important;padding-bottom:0 !important}',
      'body.appmode #view-krofu-yfirlit input._ky-note{min-height:28px !important;height:28px !important;font-size:16px !important;padding:2px 8px !important}',
      'body.appmode #view-krofu-yfirlit input._ky-search,body.appmode #view-krofu-yfirlit select._ky-sort{min-height:44px !important;font-size:16px !important}',
      // Full lárétt skrun á töflunni svo hægt sé að ná alla leið að „2026"-dálknum.
      // Staða-pillan í síðasta dálki (grænn/blár/gulur) datt út af hægri brún —
      // hún flæddi út fyrir skrun-breidd töflunnar. Víkkum töfluna + bætum
      // hægri-fyllingu í síðasta reit svo pillan sitji ÖLL innan skrunsins.
      'body.appmode #ars-main ._ars-tblscroll{overflow-x:auto !important;-webkit-overflow-scrolling:touch;max-width:100vw !important;padding-bottom:8px}',
      'body.appmode #ars-main ._ars-tblscroll table{min-width:1320px !important}',
      'body.appmode #ars-main ._ars-tblscroll td:last-child,body.appmode #ars-main ._ars-tblscroll th:last-child{padding-right:26px !important}',
      'body.appmode #ars-main ._ars-tblscroll td:last-child > div{justify-content:flex-start !important}',
      // In-app síðu-ritill (⚙ Síður) — yfirlagt spjald
      '#_app-pgedit{position:fixed;inset:0;z-index:2147482000;background:rgba(6,7,10,.55);display:none;align-items:flex-end;justify-content:center}',
      '#_app-pgedit ._pe-card{background:' + B48_PLATE + ';border:1px solid #0b0c0f;width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;border-radius:12px 12px 0 0;overflow:hidden;box-shadow:0 -10px 40px rgba(0,0,0,.5);font-family:' + B48_SANS + ';color:#1c2028}',
      '#_app-pgedit ._pe-h{position:relative;flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px 12px 32px;background:' + B48_METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.12);font-family:' + B48_DISP + ';font-size:19px;font-weight:800;color:#fff;line-height:1.15;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      '#_app-pgedit ._pe-h > span{min-width:0}',
      '#_app-pgedit ._pe-kick{display:block;font-family:' + B48_MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#aab1bb !important;text-shadow:none;margin-bottom:2px}',
      '#_app-pgedit ._pe-h button{font-family:' + B48_SANS + ' !important;font-size:13px;font-weight:600;padding:0 13px 0 9px;border-radius:7px !important;border:1px solid #000 !important;background:' + B48_MBTN + ' !important;color:#e3e7ee !important;text-shadow:none !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.5) !important;cursor:pointer;min-height:40px;display:inline-flex;align-items:center;gap:5px}',
      '#_app-pgedit ._pe-h button svg{width:15px;height:15px}',
      '#_app-pgedit .op-sech{font-family:' + B48_MONO + ';font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5b6370}',
      '#_app-pgedit ._pe-sub{padding:0 14px 8px;font-size:13px;color:#4a515c}',
      '@media (max-width:700px){#_app-pgedit ._pe-card{max-height:94vh;max-height:94dvh}}',
      '#_app-pgedit ._pe-h button{flex:none}',
      '#_app-pgedit details._pe-sidur{margin:6px 6px 0;border:1px solid rgba(20,24,34,.18);border-radius:8px;background:rgba(255,255,255,.6)}',
      '#_app-pgedit details._pe-sidur>summary{padding:13px 14px;font-family:' + B48_MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1c2028;cursor:pointer;list-style:none}',
      '#_app-pgedit details._pe-sidur>summary::after{content:"▾";float:right;color:#b3261e}',
      '#_app-pgedit details._pe-sidur[open]>summary::after{content:"▴"}',
      '#_app-pgedit ._pe-heim{margin:10px 0 0;padding:12px 13px;border-radius:7px;background:#fff;border:1px solid rgba(20,24,34,.16);border-left:3px solid #b3261e;color:#1c2028;font-size:13.5px;line-height:1.55}',
      '#_app-pgedit ._pe-heim ol{margin:6px 0 8px;padding-left:20px}',
      '#_app-pgedit ._pe-heim a{display:inline-block;padding:10px 14px;border-radius:7px;background:' + B48_RAUTT + ';border:1px solid #2a0303;color:#fff;font-weight:700;text-decoration:none;text-shadow:0 1px 1px rgba(0,0,0,.55)}',
      '#_app-pgedit ._pe-list{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 12px calc(20px + env(safe-area-inset-bottom,0px))}',
      '#_app-pgedit ._pe-row{display:flex;align-items:center;gap:12px;padding:10px 10px;border-radius:7px;cursor:pointer;font-size:15.5px;color:#1c2028}',
      '#_app-pgedit ._pe-row:active{background:rgba(255,255,255,.7)}',
      '#_app-pgedit ._pe-row input{width:22px;height:22px;accent-color:#b3261e;flex:none}',
      '#_app-pgedit ._pe-row .e{flex:none;width:30px;height:30px;border-radius:6px;border:1px solid rgba(20,24,34,.14);background:' + B48_SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);display:inline-flex;align-items:center;justify-content:center;color:#b3261e}',
      '#_app-pgedit ._pe-row .e svg{width:16px;height:16px}',
    ];
    css = css.concat(b48Hnod('#' + VIEW_ID + ' .op-top'), b48Hnod('.mx-sum'), b48Hnod('#_app-pgedit ._pe-h'));
    var st = document.createElement('style'); st.id = '_app-styles'; st.textContent = css.join('\n');
    document.head.appendChild(st);
  }

  // ── launcher page ────────────────────────────────────────────────────────────
  function viewEl() {
    var v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    var host = document.querySelector('.main-panel') ? document.querySelector('.main-panel').parentNode : null;
    var anchor = document.getElementById('view-counter') || document.querySelector('.view');
    if (anchor && anchor.parentNode) anchor.parentNode.appendChild(v);
    else document.body.appendChild(v);
    return v;
  }
  /* ── FYLKI: síður × öpp ─────────────────────────────────────────────────────
   * Agnar 29.08: "öll öppin eru með allskonar útgáfur núna með sömu síðunni …
   * listaðu frekar allar tilbúnar síður og öppin til hliðar, og sjá bara
   * checkmark hvaða síður hvert app á að vera með."
   *
   * Áður: sex öpp, hvert með sinn samanbrotna lista yfir allar 35 síðurnar.
   * Til að sjá hvar EIN síða er notuð þurfti að opna sex lista og bera saman.
   * Núna: eitt fylki — síður niður, öpp til hliðar, hak í skurðpunkti.
   *
   * ÚTGÁFUR. Sumar síður eru til í fleiri en einni útfærslu undir ólíkum lyklum
   * (Kröfu yfirlit í Slökkvitæki OG í Brunahólfi; tvær reikningagerðir). Þær
   * eru hópaðar í eina röð með v1/v2-merki svo sjáist að þetta er sama síðan —
   * annars líta þær út eins og ótengdar síður í 35-línu lista.
   * Hóparnir eru TALDIR UPP, ekki giskaðir: sjálfvirk pörun á heitum myndi
   * para saman óskyldar síður um leið og einhver endurnefnir eitthvað.        */
  var VARIANT_OF = {
    'br-krofuyfirlit':  'krofu-yfirlit',
    'br-hreyfingar':    'hreyfingarlisti',
    'br-reikningagerd': 'br-gerdreikninga'
  };

  function matrixRows() {
    var pages = allPages();
    var byKey = {}; pages.forEach(function (p) { byKey[p.k] = p; });
    var kids = {};
    pages.forEach(function (p) {
      var par = VARIANT_OF[p.k];
      if (par && byKey[par]) { (kids[par] = kids[par] || []).push(p); }
    });
    var rows = [];
    pages.forEach(function (p) {
      if (VARIANT_OF[p.k] && byKey[VARIANT_OF[p.k]]) return;   // birtist sem útgáfa
      rows.push({ page: p, v: 1, parent: null });
      (kids[p.k] || []).forEach(function (c, i) {
        rows.push({ page: c, v: i + 2, parent: p });
      });
    });
    return rows;
  }

  /* Slóðin sem símaramminn á að sýna fyrir tiltekna síðu.
     • Síða með eigin `url` (Brunahólfs-flipi eða sjálfstæð HTML-útfærsla) er
       sín eigin síða — hún er römmuð ÓBREYTT, engin devframe-breyta.
     • Síða inni í appinu er römmuð sem RAUNVERULEG APP-SÍÐA: ?app=<lykill>
       kveikir app-haminn (botnflakk + haus), devframe=simi þvingar símasýn án
       þess að krukka í sýnarvali tækisins, og page=<lykill> lendir á réttri
       síðu í stað heimasíðu appsins. */
  function previewUrl(p) {
    if (p.url) return p.url;
    var app = null;
    // Veldu app sem hefur síðuna valda — þá sést hún í sínu rétta samhengi.
    APPS.forEach(function (b) {
      if (app) return;
      var a = effectiveApp(b.key);
      if (a && !a.standalone && pagesFor(a.key).indexOf(p.k) >= 0) app = a.key;
    });
    if (!app) { var f = APPS.filter(function (b) { return !effectiveApp(b.key).standalone; })[0]; app = f && f.key; }
    var u = new URL(location.origin + '/');
    if (app) u.searchParams.set('app', app);
    u.searchParams.set('devframe', 'simi');
    u.searchParams.set('page', p.k);
    if (p.k === 'arsskodun') u.searchParams.set('arsview', 'bord');
    return u.toString();
  }

  function matrixHtml() {
    var apps = APPS.map(function (b) { return effectiveApp(b.key); })
                   .filter(function (a) { return !a.standalone; });
    var sel = {};
    apps.forEach(function (a) { sel[a.key] = {}; pagesFor(a.key).forEach(function (k) { sel[a.key][k] = 1; }); });

    var head = '<th class="mx-cnr">Síða</th>' + apps.map(function (a) {
      return '<th class="mx-ah" title="' + esc(a.name) + '">' +
        '<div class="mx-ae">' + ikonHtml(a, 26) + '</div>' +
        '<div class="mx-an">' + esc(a.name) + '</div></th>';
    }).join('') + '<th class="mx-op"></th>';

    var body = matrixRows().map(function (r) {
      var p = r.page;
      var nafn = r.parent
        ? '<span class="mx-vb">v' + r.v + '</span>' + esc(p.label)
        : '<span class="mx-pe">' + pgIcon(p) + '</span>' + esc(p.label) +
          (r.v === 1 && matrixRows().filter(function (x) { return x.parent === p; }).length
            ? '<span class="mx-vb">v1</span>' : '');
      var cells = apps.map(function (a) {
        return '<td class="mx-c"><input type="checkbox" class="_op-mx" data-app="' + a.key +
               '" data-k="' + p.k + '"' + (sel[a.key][p.k] ? ' checked' : '') + '></td>';
      }).join('');
      return '<tr class="' + (r.parent ? 'mx-sub' : '') + '">' +
        '<th class="mx-rh">' + nafn + '</th>' + cells +
        '<td class="mx-op"><button class="mx-open _op-mxopen" data-k="' + p.k +
        '" type="button" title="Opna síðuna og sjá útlitið">' + B48_IK.ut + '</button></td></tr>';
    }).join('');

    return '<details class="op-card mx-box" open><summary class="mx-sum">' +
        '<span class="mx-sum-tt"><small class="mx-sum-k">Fylki · síður × öpp</small><strong class="mx-sum-t">Hvaða síður eru í hvaða appi</strong></span>' +
        '<span class="mx-sum-n">' + matrixRows().length + ' síður · ' + apps.length + ' öpp</span>' +
        '<span class="mx-chev">' + B48_IK.chev + '</span>' +
      '</summary>' +
      '<div class="mx-scroll"><table class="mx-t no-skin"><thead><tr>' + head + '</tr></thead>' +
      '<tbody>' + body + '</tbody></table></div>' +
      '<div class="mx-hint">Strjúktu til hliðar til að sjá fleiri öpp · örin lengst til hægri opnar síðuna svo þú sjáir útlitið</div>' +
    '</details>';
  }

  function render() {
    styles();
    var v = viewEl();
    // Falin öpp hverfa úr ræsaranum en EKKI úr kerfinu — hlekkir, manifest og
    // síðuvalið standa. Teljarinn að neðan skilar þeim til baka.
    var faldirLyklar = APPS.map(function (b) { return effectiveApp(b.key); })
      .filter(function (a) { return a && a.falid; }).map(function (a) { return a.key; });
    var synaFalin = false;
    try { synaFalin = localStorage.getItem('op_syna_falin') === '1'; } catch (_) {}
    var cards = APPS.filter(function (base) {
      if (synaFalin) return true;
      return faldirLyklar.indexOf(base.key) < 0;
    }).map(function (base) {
      var a = effectiveApp(base.key);
      var sel = pagesFor(a.key);
      var selSet = {}; sel.forEach(function (k) { selSet[k] = 1; });
      var pageRows = allPages().map(function (p) {
        return '<label class="op-pg"><input type="checkbox" class="_op-pg" data-app="' + a.key + '" data-k="' + p.k + '"' + (selSet[p.k] ? ' checked' : '') + '>' +
          '<span class="e">' + pgIcon(p) + '</span><span>' + esc(p.label) + '</span></label>';
      }).join('');
      // Síðuvalið var áður alltaf opið undir HVERJU appi → risalöng, kaótísk síða
      // (6 öpp × allur síðulistinn). Nú lokað sjálfgefið í <details> með teljara,
      // svo launcher-inn er þéttur; smellt til að velja síður.
      var pagesSection = a.standalone ? '' :
        ('<details class="op-pagesbox"><summary class="op-pgsum">' +
          '<span class="op-pgsum-t">' + B48_IK.sidur + 'Síður í appinu</span>' +
          '<span class="op-pgcount" data-app="' + a.key + '">' + sel.length + ' valdar</span>' +
          '<span class="op-pgchev">' + B48_IK.chev + '</span>' +
        '</summary><div class="op-pages">' + pageRows + '</div></details>');
      return '<div class="op-card">' +
        '<div class="op-top"><div class="op-ic" style="' + (a.key === 'boss' ? BOSS_BG_CSS : ('background:linear-gradient(180deg,' + esc(a.color) + ',' + esc(a.dark) + ')')) + '">' + (a.key === 'boss' ? bossCrownSvg(30) : ikonHtml(a, 30)) + '</div>' +
          '<div><div class="op-nm">' + esc(a.name) + '</div><div class="op-bl">' + esc(a.blurb) + '</div></div></div>' +
        '<div class="op-acts">' +
          '<button class="op-btn prim _op-open" data-app="' + a.key + '" type="button">' + B48_IK.opna + 'Opna</button>' +
          '<button class="op-btn _app-install _op-install" data-app="' + a.key + '" data-always="1" type="button">' + B48_IK.nidur + 'Setja upp í síma</button>' +
          '<button class="op-btn _op-link" data-app="' + a.key + '" type="button">' + B48_IK.hlekkur + 'Afrita hlekk</button>' +
          // 2026-09-09 (Agnar: „breytingar mögulegar inn á þjónustuborð, en það
          // er samt ekki á öllum"): ⚙ birtist áður AÐEINS á innbyggðu öppunum.
          // Öppin sem hann bjó til sjálfur fengu bara „Síður í appinu"-kassann,
          // svo nafn, lýsing, tákn og litir voru ÓBREYTANLEG á þeim. Borðið er
          // alfarið lykil-drifið (effectiveApp/saveOverrides/pagesFor) og kann
          // þegar við standalone-öpp, svo það þurfti enga undantekningu.
          // 19.09.2026 (Agnar: „finn ekki lengur option að breyta tákni á eldri öppunum, og opnunarlit"): möguleikinn var
          // hér allan tímann en hét „⚙ Þjónustuborð" — sem er líka nafn á síðu OG appi og segir ekkert um tákn/lit.
          '<button class="op-btn _op-panel" data-app="' + a.key + '" type="button" title="Nafn, lýsing, tákn, litir' + (a.standalone ? '' : ' og síður') + ' appsins">' + B48_IK.litur + 'Tákn · litur' + (a.standalone ? '' : ' · síður') + '</button>' +
          (a.custom ? '<button class="op-btn op-haett _op-delapp" data-app="' + a.key + '" type="button">' + B48_IK.rusl + 'Eyða appi</button>' : '') +
          '<button class="op-btn _op-felaapp" data-app="' + a.key + '" type="button" title="' +
            (a.falid ? 'Sýna appið aftur í ræsaranum' : 'Fela appið úr ræsaranum — ekkert er eytt, það kemur aftur með einum smelli') + '">' +
            (a.falid ? B48_IK.auga + 'Sýna aftur' : B48_IK.fela + 'Fela app') + '</button>' +
        '</div>' +
        pagesSection +
      '</div>';
    }).join('');
    // Án þessarar línu væri falið app horfið að eilífu — spjaldið með
    // „👁 Sýna aftur" er sjálft falið. Línan er eina leiðin til baka.
    var falinLina = faldirLyklar.length
      ? '<div class="op-falin">' +
          '<span>' + faldirLyklar.length + (faldirLyklar.length === 1 ? ' falið app' : ' falin \u00f6pp') + '</span>' +
          '<button class="op-btn _op-synafalin" type="button">' +
            (synaFalin ? B48_IK.fela + 'Fela þau aftur' : B48_IK.auga + 'Sýna þau') + '</button>' +
        '</div>'
      : '';
    var ver = versionLine();
    v.innerHTML = '<div class="op-main"><div class="op-kick">Slökkvitæki · ræsir</div><h1 class="op-h1">Öpp</h1>' +
      '<p class="op-sub">Léttar, símavænar útgáfur með völdum síðum — hver með eigin hlekk og hægt að setja upp í símann.</p>' +
      matrixHtml() +
      falinLina +
      cards +
      '<div class="op-card op-ny">' +
        '<div class="op-ny-plus">' + B48_IK.plus + '</div>' +
        '<button class="op-btn prim" id="_op-newapp" type="button">Búa til app</button>' +
        '<div class="op-ny-txt">Nefndu appið og hakaðu svo við í „Síður í appinu" hvaða síður birtast í því</div>' +
      '</div>' +
      (ver ? '<div class="op-ver">Útgáfa ' + esc(ver) + '</div>' : '') +
      '</div>';
    v.querySelectorAll('._op-open').forEach(function (b) { b.addEventListener('click', function () { location.href = appLink(b.dataset.app); }); });
    var nb = v.querySelector('#_op-newapp'); if (nb) nb.addEventListener('click', function (e) { e.preventDefault(); createCustomApp(); });
    v.querySelectorAll('._op-delapp').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); deleteCustomApp(b.dataset.app); }); });
    v.querySelectorAll('._op-felaapp').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var k = b.dataset.app;
        var nuFalid = !!effectiveApp(k).falid;
        saveOverrides(k, { falid: nuFalid ? null : true });   // null hreinsar yfirskriftina
        render();
      });
    });
    v.querySelectorAll('._op-synafalin').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        try { localStorage.setItem('op_syna_falin', localStorage.getItem('op_syna_falin') === '1' ? '0' : '1'); } catch (_) {}
        render();
      });
    });
    v.querySelectorAll('._op-install').forEach(function (b) { b.addEventListener('click', function () {
      // ALDREI nota deferredPrompt sem var fangaður HÉR á launcher-síðunni —
      // beforeinstallprompt er bundinn við manifestið sem gilti þegar hann
      // kviknaði (aðal-appið á "/"), svo prompt() setti upp AÐALAPPIÐ þó
      // setManifest() skipti hlekknum eftirá (rót „Fjármál varð aðalappið").
      // Farðu alltaf á eigin /app/<key>/ scope — þar fangar vafrinn RÉTTA
      // manifestið og ?install=1 opnar uppsetningargluggann sjálfkrafa.
      location.href = appLink(b.dataset.app) + '?install=1';
    }); });
    v.querySelectorAll('._op-link').forEach(function (b) { b.addEventListener('click', function () {
      var url = appLink(b.dataset.app);
      try { navigator.clipboard.writeText(url); toast('Hlekkur afritaður'); } catch (_) { toast(url); }
    }); });
    v.querySelectorAll('._op-panel').forEach(function (b) { b.addEventListener('click', function () { openControlPanel(b.dataset.app); }); });
    /* Fylkis-hakið skrifar BEINT í geymsluna og speglar sig svo í gamla
     * app-listann (og teljarann hans) — annars fara sýnirnar tvær úr takti og
     * notandinn sér tvö ólík svör við sömu spurningu. */
    v.querySelectorAll('._op-mx').forEach(function (cb) { cb.addEventListener('change', function () {
      var app = cb.dataset.app, k = cb.dataset.k;
      var cur = pagesFor(app).slice();
      var i = cur.indexOf(k);
      if (cb.checked) { if (i < 0) cur.push(k); } else if (i >= 0) { cur.splice(i, 1); }
      saveCfg(app, cur);
      var tvi = v.querySelector('._op-pg[data-app="' + app + '"][data-k="' + k + '"]');
      if (tvi) tvi.checked = cb.checked;
      var cnt = v.querySelector('.op-pgcount[data-app="' + app + '"]');
      if (cnt) cnt.textContent = cur.length + ' valdar';
    }); });
    v.querySelectorAll('._op-mxopen').forEach(function (b) { b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var p = pageByKey(b.dataset.k); if (!p) return;
      // 2026-08-29 (Agnar: „mér er bara vísað á síðuna á desctopinnu… ekki raun
      // app síðuna"): ↗ FLAKKAR EKKI LENGUR BURT. Áður fór hann um switchView og
      // skilaði skjáborðsútlitinu í kerfinu — sem er einmitt ekki það sem á að
      // meta áður en hakað er við útfærslu. Nú poppar hann upp símaramma (320)
      // ofan á Öpp-yfirlitinu, svo röðin í fylkinu tapast ekki.
      var url = previewUrl(p);
      if (window.SlokkDevFrame && SlokkDevFrame.open) {
        SlokkDevFrame.open('simi', { url: url, title: p.label });
        return;
      }
      // 320 ekki hlaðinn (t.d. eldri skyndiminnisútgáfa) — gamla hegðunin.
      if (p.url) { window.open(p.url, '_blank', 'noopener'); return; }
      try { if (window.App && App.switchView) App.switchView(p.k); else location.hash = '#' + p.k; }
      catch (_) { location.hash = '#' + p.k; }
    }); });
    v.querySelectorAll('._op-pg').forEach(function (cb) { cb.addEventListener('change', function () {
      var app = cb.dataset.app;
      var picked = allPages().map(function (p) { return p.k; }).filter(function (k) {
        var el = v.querySelector('._op-pg[data-app="' + app + '"][data-k="' + k + '"]'); return el && el.checked;
      });
      saveCfg(app, picked);
      var cnt = v.querySelector('.op-pgcount[data-app="' + app + '"]');
      if (cnt) cnt.textContent = picked.length + ' valdar';
      var mx = v.querySelector('._op-mx[data-app="' + app + '"][data-k="' + cb.dataset.k + '"]');
      if (mx) mx.checked = cb.checked;
    }); });
  }

  // ── app-mode shell (bottom nav + header) ─────────────────────────────────────
  var _curPage = null;
  var _bootAt = Date.now();
  // Síðurnar í botnstikunni, í þeirri röð sem skelin sýnir þær.
  function skelSidur(a) {
    var pages = pagesFor(a.key); if (!pages.length) pages = a.defaults.slice();
    // App-mode á að opnast á SÍNU auðkennis-síðu (home), ekki hvað sem raðast
    // fremst í valdar síður. „Síður í appinu"-hökin vistast í PAGES-röð, svo t.d.
    // Verkefnalista-appið (verkbord) fékk krofu-yfirlit fremst þegar það var valið
    // með — og opnaðist ranglega á Fjármála-skjánum. Hífum home fremst í nav + boot.
    if (a.home && pages.indexOf(a.home) > 0) {
      pages = [a.home].concat(pages.filter(function (k) { return k !== a.home; }));
    }
    return pages;
  }
  // 05.10.2026: skelin er byggð við ræsingu af SKYNDIMINNI AppSettings (85). Hafi síðulistinn breyst á annarri vél
  // sat gamli listinn í botnstikunni þar til appið var opnað í ANNAÐ sinn (mælt: 3 flipar á skjánum, 8 í minni).
  // Nú er skelin endurbyggð þegar listinn sem hún var byggð af er ekki lengur sá sem gildir.
  var _skelSidur = null;
  function vaktaSidulista() {
    if (window.__appSidulistaVakt || !(window.AppSettings && AppSettings.onChange)) return;
    window.__appSidulistaVakt = true;
    AppSettings.onChange(function () {
      try {
        if (!ACTIVE || isStandalone(ACTIVE) || _skelSidur == null) return;
        var a = effectiveApp(ACTIVE); if (!a) return;
        if (skelSidur(a).join('|') !== _skelSidur) buildShell();
      } catch (_) {}
    });
  }
  function buildShell() {
    _bootAt = Date.now();
    var a = effectiveApp(ACTIVE); if (!a) return;
    styles();
    setHubViewport();
    document.body.classList.add('appmode');
    document.body.setAttribute('data-app', a.key);
    // 19.09.2026 (Agnar: „bláa sé svart og þetta appelsínugula uppi líka svart"): stöðustika símans tók litinn úr
    // <meta theme-color> aðalsíðunnar (#C93C1D, eldrautt) í ÖLLUM öppum. Nú fylgir hún haus appsins.
    try { var _tc = document.querySelector('meta[name="theme-color"]'); if (_tc) _tc.setAttribute('content', a.key === 'boss' ? '#0a0a0b' : (a.color || '#0b0b0d')); } catch (_) {}
    var pages = skelSidur(a);
    _skelSidur = pages.join('|');

    var isBoss = a.key === 'boss';
    var hdr = document.getElementById('_app-hdr') || document.createElement('div');
    hdr.id = '_app-hdr'; hdr.style.display = ''; hdr.style.background = isBoss ? BOSS_BG_CSS.replace('background:', '') : ('linear-gradient(180deg,' + a.color + ',' + a.dark + ')');
    hdr.innerHTML = '<div class="nm">' + (isBoss ? bossCrownSvg(26) + '<span style="' + BOSS_GOLD_CSS + '">' + esc(a.name) + '</span>' : ikonHtml(a, 22) + ' ' + esc(a.name)) + '</div>' +
      // Textinn situr í ._applbl svo 316 geti falið hann og skilið EFTIR
      // táknið eitt í 36px reitnum (sjá athugasemd þar). Áður var klippt á
      // miðjum streng og hausinn sýndi „⚙ Þ" og „⤓ Se".
      (a.standalone ? '' : '<button id="_app-pages" type="button" title="Tákn, litur og síður appsins">' + B48_IK.tannhjol + '<i class="_applbl">Tákn · litur · síður</i></button>') +
      // 🎨 Stílstjórinn var ÓAÐGENGILEGUR í app-ham: 262 hengir takkann sinn á
      // banner-klukkuna og app-hamurinn felur bannerinn alveg
      // (body.appmode #bstal-banner{display:none}). Þar með var ekki hægt að
      // laga útlit þeirra síðna sem maður notar mest — einmitt í símanum þar
      // sem plássið er minnst (Agnar 29.08). Takkinn er því endurtekinn hér.
      // 04.10.2026 (Agnar: „sameinast hinu í header … setja inn í Stilla útlit. Default zoom per page"): 🎨 opnar
      // nú „Stærð og útlit" (333) — stærð ÞESSARAR síðu, vistuð á þjóninn; „Litir og letur…" þar opnar ritilinn.
      '<button id="_app-style" type="button" title="Stærð og útlit þessarar síðu">' + B48_IK.litur + '</button>' +
      '<button class="_app-install" data-always="1" id="_app-inst2" type="button" title="Setja appið upp í símann">' + B48_IK.nidur + '<i class="_applbl">Setja upp</i></button>' +
      '<button id="_app-exit" type="button" title="Loka appi">' + B48_IK.x + '</button>';
    if (!hdr.parentNode) document.body.appendChild(hdr);
    var sty = document.getElementById('_app-style');
    if (sty && !sty._wired) { sty._wired = 1; sty.addEventListener('click', function (e) {
      e.preventDefault();
      try {
        if (window.AppPageZoom && AppPageZoom.vixla) AppPageZoom.vixla();
        else if (window.PageEditor && PageEditor.toggle) PageEditor.toggle();
      } catch (_) {}
    }); }

    var nav = document.getElementById('_app-nav') || document.createElement('div');
    nav.id = '_app-nav'; nav.style.display = '';
    nav.innerHTML = pages.map(function (k) {
      var p = pageByKey(k) || { k: k, label: k };
      return '<button class="_app-tab" data-k="' + k + '"><span class="e">' + pgIcon(p) + '</span>' + esc(p.short || p.label) + '</button>';
    }).join('');
    if (!nav.parentNode) document.body.appendChild(nav);
    // Ein síða → ekkert að velja: fela dokkinn alveg (risaflísin fór hálfan skjáinn).
    document.body.classList.toggle('appmode-nonav', pages.length < 2);

    nav.querySelectorAll('._app-tab').forEach(function (b) { b.addEventListener('click', function () { goPage(b.dataset.k); }); });
    hdr.querySelector('#_app-inst2').addEventListener('click', function () {
      // Uppsetning gildir aðeins innan eigin /app/<key>/ scope-s. Ef komið var
      // inn um gamla ?app=<key> hlekkinn er síðan UTAN scope-sins og prompt-inn
      // (ef einhver) tilheyrir aðalappinu — hoppa þá fyrst á réttu slóðina.
      if ((location.pathname || '').indexOf('/app/' + a.key + '/') !== 0) {
        location.href = appLink(a.key) + '?install=1'; return;
      }
      setManifest(a.manifest); doInstall();
    });
    hdr.querySelector('#_app-exit').addEventListener('click', function () { location.href = location.origin + '/'; });
    var _pgBtn = hdr.querySelector('#_app-pages');
    if (_pgBtn) _pgBtn.addEventListener('click', function () { openControlPanel(ACTIVE); });

    setManifest(a.manifest);   // install captures THIS app
    syncFrameBottom();
    // Endurbygging (vaktarinn) á EKKI að hoppa til baka á fyrstu síðu — nema
    // núverandi síða hafi verið tekin úr appinu (þá förum við á home/fyrstu).
    goPage((_curPage && pages.indexOf(_curPage) !== -1) ? _curPage : pages[0]);
    hideSplash();
  }
  // Iframe-botninn = raunhæð navsins (var harðkóðað 150px — 3ja raða nav er ~225px
  // svo neðsti hluti síðunnar lenti Á BAK VIÐ navið og virtist klipptur).
  function syncFrameBottom() {
    try {
      var nav = document.getElementById('_app-nav'), f = document.getElementById('_app-frame');
      // 353: rammi getur verið zoomaður (síðuzoom) → deilt með zoom; !important því 316
      // negldi bottom:64px!important (stikan huldi neðstu 57px af iframe-síðunum).
      if (nav && f) {
        var fz = parseFloat(getComputedStyle(f).zoom) || 1;
        var nh = getComputedStyle(nav).display === 'none' ? 0 : nav.getBoundingClientRect().height;
        f.style.setProperty('bottom', Math.round(nh / fz) + 'px', 'important');
      }
    } catch (_) {}
  }
  // Sjálf-heilun: EITTHVAÐ á símanum fjarlægir/felur botn-navið ("fliparnir niðri
  // hverfa alltaf") — annar patch, endur-teiknun eða yfirlögn. Vaktari sem
  // endurbyggir shellið ef header/nav vantar, er tómt eða falið. buildShell er
  // idempotent (endurnotar element eftir id) og goPage(_curPage) heldur síðunni.
  function startShellGuard() {
    vaktaSidulista();
    if (window.__appShellGuard) return; window.__appShellGuard = true;
    setInterval(function () {
      try {
        if (!ACTIVE) return;
        var nav = document.getElementById('_app-nav'), hdr = document.getElementById('_app-hdr');
        var navDead = !nav || !nav.isConnected || !nav.querySelector('._app-tab');
        var hdrDead = !hdr || !hdr.isConnected;
        if (navDead || hdrDead) { buildShell(); return; }
        if (getComputedStyle(nav).display === 'none') nav.style.display = 'grid';
        if (getComputedStyle(hdr).display === 'none') hdr.style.display = 'flex';
        syncFrameBottom();
      } catch (_) {}
    }, 1500);
  }
  // ── Þjónustuborð (síður + útlit + útgáfa) ───────────────────────────────────
  // Áður var EINA leiðin til að bæta síðu við app að fara á Öpp-launcher-síðuna í
  // vafranum → haka → og svo var uppsetta appið í símanum ekki uppfært fyrr en
  // það var tekið út og sett upp aftur. Núna má breyta síðum, nafni/lýsingu/tákni/
  // lit BEINT — bæði inni í appinu sjálfu OG frá launcher-kortinu — breytist strax
  // (buildShell()/render() endurteikna lifandi), engin endur-uppsetning. Tekur
  // `key` (ekki bara ACTIVE) svo sama spjaldið dugi hvort sem kallað er innan úr
  // appi eða af 📱 Öpp-síðunni áður en appið er einu sinni opnað.
  function refreshAfterEdit(key) { if (ACTIVE === key) buildShell(); else render(); }
  var _peSidurOpid = false, _peTaknBreytt = false, _peSaga = false;
  function lokaSpjaldi() {
    var ov = document.getElementById('_app-pgedit'); if (ov) ov.style.display = 'none';
    _peTaknBreytt = false;
    if (_peSaga) { _peSaga = false; try { history.back(); } catch (_) {} }
  }
  // capture: á undan bakk-vörðunum (18/277) svo bakk með opið spjald flakki ekki á milli síðna.
  window.addEventListener('popstate', function (e) {
    var ov = document.getElementById('_app-pgedit');
    if (_peSaga && ov && ov.style.display !== 'none') {
      _peSaga = false; ov.style.display = 'none'; _peTaknBreytt = false;
      try { e.stopImmediatePropagation(); } catch (_) {}
    }
  }, true);
  // Táknið á HEIMASKJÁ símans er hluti af uppsetta appinu — Android uppfærir það sjálft á 1–3 dögum. Strax: setja upp aftur.
  function chromeHlekkur(a) {
    var slod = appLink(a.key) + '?install=1';
    if (/android/i.test(navigator.userAgent)) return 'intent://' + slod.replace(/^https?:[/][/]/, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    return slod;
  }
  function heimaskjarHtml(a, vistad) {
    return '<div class="_pe-heim">' + (vistad ? '✓ <b>Táknið er vistað</b> og sést strax inni í appinu. ' : '') +
      '<b>Táknið á heimaskjá símans breytist EKKI strax.</b> Android leyfir vefappi ekki að skipta sjálft um tákn á heimaskjánum — síminn sækir nýja táknið sjálfur á 1–3 dögum. Til að fá það strax þarf að setja appið upp aftur:' +
      '<ol><li>Ýttu á <b>Opna í Chrome</b> hér fyrir neðan.</li>' +
      '<li>Fjarlægðu gamla appið: haltu fingri á tákninu (heimaskjár eða forritalisti) → <b>Fjarlægja / Uninstall</b>.</li>' +
      '<li>Í Chrome: endurhlaðaðu síðuna og veldu <b>Setja upp</b> (eða ⋮ → „Setja upp app"). Táknið lendir þá á heimaskjánum.</li></ol>' +
      '<a href="' + esc(chromeHlekkur(a)) + '" target="_blank" rel="noopener">Opna í Chrome ›</a></div>';
  }
  function openControlPanel(key) {
    var a = effectiveApp(key); if (!a) return;
    var selSet = {}; pagesFor(a.key).forEach(function (k) { selSet[k] = 1; });
    var ver = versionLine();
    var ov = document.getElementById('_app-pgedit') || document.createElement('div');
    ov.id = '_app-pgedit';
    // 20.09.2026 (Agnar: „Þegar ég ýti á breyta lit/icon þá fer ég bara á síðuyfirlit"): síðulistinn (2400 px á síma)
    // drekkti útlitinu. Hann er nú samanbrotinn; táknið er efst.
    var pagesBlock = a.standalone ? '' :
      '<details class="_pe-sidur"' + (_peSidurOpid ? ' open' : '') + '><summary>Síður í appinu (' + pagesFor(a.key).length + ')</summary>' +
      '<div class="_pe-sub">Hakaðu við síðurnar sem eiga að vera í appinu.</div>' +
      '<div>' + allPages().map(function (p) {
        return '<label class="_pe-row"><input type="checkbox" class="_pe-pg" data-k="' + p.k + '"' + (selSet[p.k] ? ' checked' : '') + '>' +
          '<span class="e">' + pgIcon(p) + '</span><span>' + esc(p.label) + '</span></label>';
      }).join('') + '</div></details>';
    var gamalt = document.getElementById('_app-pgedit');
    var fyrraSkrun = gamalt && gamalt.style.display !== 'none' && gamalt.querySelector('._pe-list') ? gamalt.querySelector('._pe-list').scrollTop : 0;
    ov.innerHTML =
      '<div class="_pe-card">' +
        '<div class="_pe-h"><span><small class="_pe-kick">Tákn · litur' + (a.standalone ? '' : ' · síður') + '</small>' + esc(a.name) + '</span><button id="_pe-close" type="button">' + B48_IK.bak + 'Til baka</button></div>' +
        '<div class="_pe-list">' +
          '<div class="op-sech" style="margin:4px 8px 8px">Tákn appsins</div>' +
          '<div style="padding:0 10px 12px">' +
            '<div style="font-size:12px;font-weight:600;color:#3b414b;margin-bottom:5px">Smelltu á tákn til að velja það, aftur til að afvelja</div>' +
            '<div class="_pe-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:6px;max-height:236px;overflow:auto;padding:7px;border:1px solid rgba(20,24,34,.18);border-radius:8px;background:rgba(255,255,255,.6)">' +
              IKONSAFN.map(function (x) {
                var valid = a.ikon === x.f;
                return '<button type="button" class="_pe-ik" data-ik="' + x.f + '" title="' + x.h + '" ' +
                  'style="padding:3px;border:2px solid ' + (valid ? '#b3261e' : 'transparent') + ';border-radius:8px;background:' + (valid ? '#fdecea' : '#fff') + ';cursor:pointer;line-height:0">' +
                  '<img src="' + IKON_MAPPA + x.f + '" alt="" width="42" height="42" style="display:block;border-radius:8px">' +
                '</button>';
              }).join('') +
            '</div>' +
            (_peTaknBreytt || a.ikon ? heimaskjarHtml(a, _peTaknBreytt) : '') +
          '</div>' +
          '<div class="op-sech" style="margin:4px 8px 8px">Nafn og litir</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px;padding:0 10px 14px;font-size:13.5px;color:#1c2028">' +
            '<label style="display:flex;flex-direction:column;gap:4px">Nafn' +
              '<input class="_pe-name" value="' + esc(a.name) + '" style="padding:9px 11px;border:1px solid #d7dce4;border-radius:9px;font:inherit;font-size:15px"></label>' +
            '<label style="display:flex;flex-direction:column;gap:4px">Lýsing' +
              '<input class="_pe-blurb" value="' + esc(a.blurb || '') + '" style="padding:9px 11px;border:1px solid #d7dce4;border-radius:9px;font:inherit;font-size:15px"></label>' +
            '<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap">' +
              // 20.09.2026 (Agnar hringaði 💰-reitinn: „This won't change"): emoji-reiturinn stóð óbreyttur þótt táknmynd
              // væri valin, svo það leit út eins og valið hefði ekki tekist. Með valda táknmynd sýnir reiturinn HANA.
              (a.ikon
                ? '<div style="display:flex;flex-direction:column;gap:4px">Valið tákn' +
                    '<img src="' + IKON_MAPPA + esc(a.ikon) + '" alt="" width="52" height="52" style="display:block;border-radius:11px;border:1px solid #d7dce4"></div>'
                : '<label style="display:flex;flex-direction:column;gap:4px">Tákn (emoji)' +
                    '<input class="_pe-emoji" value="' + esc(a.emoji) + '" maxlength="4" style="width:64px;padding:9px 11px;border:1px solid #d7dce4;border-radius:9px;font:inherit;font-size:20px;text-align:center"></label>') +
              '<label style="display:flex;flex-direction:column;gap:4px">Litur (efst)' +
                '<input class="_pe-color" type="color" value="' + esc(a.color) + '" style="width:52px;height:40px;padding:2px;border:1px solid #d7dce4;border-radius:9px"></label>' +
              '<label style="display:flex;flex-direction:column;gap:4px">Litur (neðst)' +
                '<input class="_pe-dark" type="color" value="' + esc(a.dark) + '" style="width:52px;height:40px;padding:2px;border:1px solid #d7dce4;border-radius:9px"></label>' +
              '<button class="_pe-reset-look" type="button" style="font:inherit;font-size:13px;font-weight:600;padding:0 13px;border-radius:7px;border:1px solid rgba(20,24,34,.28);background:' + B48_SILVER + ';color:#1c2028;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.12);cursor:pointer;min-height:40px">Núllstilla</button>' +
            '</div>' +
            '<div style="font-size:11.5px;color:#4a515c;line-height:1.5">Breytist strax í appinu (spjald, haus, stöðustika, hleðsluskjár). Táknmynd og opnunarlitur á heimaskjá símans fylgja líka — uppsett app uppfærist sjálft á 1–3 dögum, eða strax ef það er fjarlægt og sett upp aftur.</div>' +
          '</div>' +
          pagesBlock +
          '<div class="op-sech" style="margin:14px 18px 6px">Upplýsingar</div>' +
          '<div style="padding:0 18px 18px;font-size:12.5px;color:#4a515c;line-height:1.7">' +
            'Útgáfa: ' + (ver ? esc(ver) : '—') + '<br>' +
            'Hlekkur: <code style="font-size:11.5px">' + esc(appLink(a.key)) + '</code>' +
          '</div>' +
        '</div>' +
      '</div>';
    if (!ov.parentNode) document.body.appendChild(ov);
    ov.style.display = 'flex';
    // Endurteikning (eftir hvert val) má ekki henda manni efst í spjaldið.
    var _l0 = ov.querySelector('._pe-list'); if (_l0 && fyrraSkrun) _l0.scrollTop = fyrraSkrun;
    var _det = ov.querySelector('details._pe-sidur');
    if (_det) _det.addEventListener('toggle', function () { _peSidurOpid = _det.open; });
    // Android-bakk á að LOKA spjaldinu — ekki appinu. Ein sögufærsla meðan spjaldið er opið.
    if (!_peSaga) { try { history.pushState({ slokkPe: 1 }, '', location.href); _peSaga = true; } catch (_) {} }
    ov.querySelector('#_pe-close').addEventListener('click', lokaSpjaldi);
    if (!ov._bakWired) { ov._bakWired = 1; ov.addEventListener('click', function (e) { if (e.target === ov) lokaSpjaldi(); }); }
    ov.querySelectorAll('._pe-pg').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var checked = Array.prototype.slice.call(ov.querySelectorAll('._pe-pg:checked')).map(function (x) { return x.dataset.k; });
        if (!checked.length) { cb.checked = true; return; }         // alltaf a.m.k. ein síða
        var picked = allPages().map(function (p) { return p.k; }).filter(function (k) { return checked.indexOf(k) !== -1; });
        saveCfg(a.key, picked);
        refreshAfterEdit(a.key);
      });
    });
    function bindLook(sel, field) {
      var el = ov.querySelector(sel); if (!el) return;
      el.addEventListener('change', function () {
        var patch = {}; patch[field] = el.value.trim();
        saveOverrides(a.key, patch);
        refreshAfterEdit(a.key);
        openControlPanel(a.key);   // endurteiknar spjaldið sjálft með nýjum gildum
      });
    }
    bindLook('._pe-name', 'name');
    bindLook('._pe-blurb', 'blurb');
    bindLook('._pe-emoji', 'emoji');
    // Táknið vistast eins og hinir útlitsreitirnir — í app_profiles_overrides,
    // svo það gildi líka fyrir INNBYGGÐU öppin sem eiga enga custom-röð.
    ov.querySelectorAll('._pe-ik').forEach(function (b) {
      b.addEventListener('click', function () {
        var nytt = (a.ikon === b.dataset.ik) ? null : b.dataset.ik;
        _peTaknBreytt = true;
        saveOverrides(a.key, { ikon: nytt });
        refreshAfterEdit(a.key);
        openControlPanel(a.key);
      });
    });
    bindLook('._pe-color', 'color');
    bindLook('._pe-dark', 'dark');
    var resetBtn = ov.querySelector('._pe-reset-look');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      saveOverrides(a.key, { name: '', blurb: '', emoji: '', color: '', dark: '' });
      refreshAfterEdit(a.key);
      openControlPanel(a.key);
    });
  }

  function goPage(k) {
    _curPage = k;
    var p = pageByKey(k);
    if (p && p.minarId) {
      // Stök vistuð Mínar síður-síða — opna BEINT á hana (ekki bara flipann í heild).
      hideFrame();
      if (window.MinarSidur && window.MinarSidur.openPage) window.MinarSidur.openPage(p.minarId);
      else navTo('minar-sidur');
    } else if (p && p.url) showFrame(p);      // external (Brunahólf) page → iframe
    else { hideFrame(); navTo(k); }    // native slökkvitæki view
    var nav = document.getElementById('_app-nav');
    if (nav) nav.querySelectorAll('._app-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.k === k); });
  }
  // Full-screen iframe host for external pages (between header + bottom nav).
  function frameEl() {
    var f = document.getElementById('_app-frame');
    if (f) return f;
    f = document.createElement('div'); f.id = '_app-frame';
    // 09.10.2026 (Agnar: Raddminni í The Box „Kemst ekki í hljóðnemann: Permission denied" þótt Chrome og Android leyfðu):
    // iframe á annað lén fær ENGA hljóðnema-/myndavélar-/staðsetningarheimild nema hún sé framseld hér með allow= —
    // getUserMedia hafnar þá alltaf, óháð stillingum símans. radd.html og jarvis.html þurfa microphone.
    f.innerHTML = '<iframe id="_app-iframe" title="app" allow="clipboard-write; clipboard-read; microphone; camera; geolocation; fullscreen" allowfullscreen></iframe>';
    document.body.appendChild(f);
    return f;
  }
  function showFrame(p) {
    var f = frameEl(), ifr = f.querySelector('iframe');
    if (ifr.getAttribute('data-src') !== p.url) { ifr.src = p.url; ifr.setAttribute('data-src', p.url); }
    f.style.display = 'block';
  }
  function hideFrame() { var f = document.getElementById('_app-frame'); if (f) f.style.display = 'none'; }

  // ── switchView hook: launcher opens here; app mode is a focus-lock ───────────
  function patchSwitchView() {
    if (!window.App || !window.App.switchView) { setTimeout(patchSwitchView, 120); return; }
    if (window.App._appProfilesPatched) return;
    var orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { openLauncher(); return; }
      var r = orig ? orig.apply(this, arguments) : undefined;
      // hide the launcher when navigating elsewhere
      try { if (view !== NAV_KEY) { var v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } } catch (_) {}
      // app mode: if someone navigates to a page NOT in the app, snap back
      // (standalone apps like Bílstjóri handle their own lock in patch 219)
      if (ACTIVE && !isStandalone(ACTIVE)) {
        var allowed = pagesFor(ACTIVE); if (!allowed.length) allowed = (APP_BY_KEY[ACTIVE] || {}).defaults || [];
        var _app = APP_BY_KEY[ACTIVE] || {};
        var _home = (_app.home && allowed.indexOf(_app.home) !== -1) ? _app.home : allowed[0];
        // Óheimil síða (t.d. sjálfgefinn krofu-yfirlit-landari á boot) → snappa á
        // home/fyrstu síðu jafnvel þótt _curPage sé enn óstillt (annars sat appið fast).
        if (allowed.indexOf(view) === -1 && view !== NAV_KEY) { setTimeout(function () { goPage(_curPage || _home); }, 0); }
        else if (view !== _curPage && _curPage) {
          // Leyfð síða en EKKI valin í botn-navinu: fyrstu sekúndurnar er þetta
          // boot-landerinn (sala.js opnar #sala eftir á) → festa fyrstu síðuna
          // aftur; seinna er þetta lögmæt in-page leið → uppfæra flipa-ljósið.
          if (Date.now() - _bootAt < 12000) { setTimeout(function () { if (_curPage) goPage(_curPage); }, 0); }
          else {
            _curPage = view;
            var nv = document.getElementById('_app-nav');
            if (nv) nv.querySelectorAll('._app-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.k === view); });
          }
        }
      }
      return r;
    };
    for (var k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._appProfilesPatched = true;
  }
  function openLauncher() {
    // 30.09.2026 — MÆLT á lifandi síðu: Bílstjóri → 📱 Öpp skildi BÁÐAR síður eftir
    // sýnilegar (view-bilstjori + view-opp samtímis; allar aðrar leiðir hreinar).
    // Ástæðan: þessi sópun tók aðeins `.view.active`, en `#view-bilstjori` er búið
    // til í kóða (219:535) og ber ENGAN `view`-klasa — aðeins `active`. Það hélt því
    // `display:block` undir Öppin.
    // Af hverju klasinn var EKKI settur á 219 í staðinn: `.view` fær
    // `background:…!important` frá 190/229/230-Brunastáli og bakgrunnur Bílstjórans
    // er án `!important`, svo þemað hefði málað skjáinn hans upp á nýtt.
    // `[id^="view-"].active` þýðir „view sem telur sig vera núverandi síðan" — það
    // er einmitt það sem á að hverfa þegar skipt er, hvaða klasa sem það ber.
    document.querySelectorAll('.view.active,[id^="view-"].active').forEach(function (v) { v.classList.remove('active'); v.style.display = 'none'; });
    var v = viewEl(); render(); v.style.display = ''; v.classList.add('active');
  }

  // ── sidebar button ───────────────────────────────────────────────────────────
  function addNavButton() {
    if (document.getElementById('_app-navbtn')) return;
    var proto = document.querySelector('.vnav-btn'); if (!proto) { setTimeout(addNavButton, 300); return; }
    var btn = proto.cloneNode(true);
    btn.id = '_app-navbtn'; btn.removeAttribute('data-view'); btn.setAttribute('data-view', NAV_KEY);
    if (btn.hasAttribute('onclick')) btn.setAttribute('onclick', "App.switchView('" + NAV_KEY + "')");
    btn.classList.remove('active');
    btn.textContent = NAV_LABEL;
    proto.parentNode.insertBefore(btn, proto.nextSibling);
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else openLauncher(); });
  }

  // ── boot ─────────────────────────────────────────────────────────────────────
  function boot() {
    patchSwitchView();
    addNavButton();
    // Standalone app (Bílstjóri) → patch 219 owns the full-screen lock; do not
    // build the 261 bottom-nav shell over it.
    if (ACTIVE && isStandalone(ACTIVE)) return;
    if (ACTIVE) {
      // wait for the shell + a nav target, then lock into the app.
      // Enginn 6s dauðafrestur lengur — á hægum síma gat App.switchView komið
      // seinna og shellið byggðist þá ALDREI; vaktarinn tekur líka við eftirá.
      (function tick() {
        if (document.querySelector('.vnav-btn') && window.App && window.App.switchView) {
          // ?page=<lykill> — notað af símaramma-forskoðuninni í Öpp-fylkinu svo
          // ramminn lendi á RÉTTU síðunni en ekki heimasíðu appsins.
          //
          // Stillt Á UNDAN buildShell viljandi: shellið opnar á `_curPage` sé hún
          // í síðulistanum (annars pages[0]), og verndarinn í patchSwitchView
          // snappar aftur á `_curPage` fyrstu 12 sekúndurnar. switchView EFTIR
          // buildShell var því kastað til baka — mælt: lenti á krofu-yfirlit.
          try {
            var want = new URLSearchParams(location.search).get('page');
            if (want && pageByKey(want) && pagesFor(ACTIVE).indexOf(want) !== -1) _curPage = want;
          } catch (_) {}
          buildShell();
          startShellGuard(); return;
        }
        setTimeout(tick, 250);
      })();
      startShellGuard();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.AppProfiles = {
    open: openLauncher,
    reload: render,
    pagesFor: pagesFor,
    saveAsApp: saveAsApp,
    pageByKey: pageByKey,
    allPages: allPages
  };
})();
