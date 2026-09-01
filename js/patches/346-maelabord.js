/* === MÆLABORÐ — öll mælitækin á einum skjá (346) ==========================
 *
 * Agnar 31.08.2026:
 *   „svona tölur fæ ég í hvert einasta skipti sem ég minnist á þetta. þetta á
 *    ekki að geta gerst ítrekað … það þarf að vera listi með öllum svona tölum
 *    mér aðgengilegur. skráð baseline í dag, línurit, og í hvert skipti sem hún
 *    hreyfist skráist það í bók. valdurinn af breytingunni. þá yrði hægt að sjá
 *    afhverju og fyrirbyggja. að það blikki einhver viðvörun ef línuritið fer í
 *    vitlausa átt."
 *   „settu kannski bara síðu á slökkvitæki í jarvis stíl. með öllum mæli-
 *    einingum sem skipta máli. og línurit. sem frystir fyrir og eftir claude
 *    viðgerð. með dagsetningu / sama villan á ekki geta gerst nema einu sinni."
 *
 * ── AF HVERJU ÞESSI SÍÐA ER TIL ───────────────────────────────────────────
 * Talan 260 var reiknuð upp á nýtt í hverju samtali og hent jafnóðum. Þess
 * vegna kom hún alltaf sem NÝ FRÉTT, og þess vegna var aldrei hægt að sjá
 * hvort hún væri að lagast eða versna. Hér er hún geymd, dagsett og teiknuð.
 *
 * ── STÍLLINN ──────────────────────────────────────────────────────────────
 * Dökkt mælaborð eins og Agnar bað um („jarvis stíl"). EN áherslulitirnir eru
 * húsalitirnir — brunastál og rautt — ekki sci-fi blátt. Þemað er FROSIÐ
 * (17.08.2026: Brunastál+rautt eina útlitið); þessi síða er nýtt tæki, ekki
 * ný húðun á kerfinu, og hún á að líta út eins og hún tilheyri því.
 *
 * ── ÞAÐ SEM GERIR „BARA EINU SINNI" SATT ──────────────────────────────────
 * Hver viðgerð sem er skráð gegnum POST /api/ai-context með `vidgerd:true`
 * frystir tölurnar FYRIR og EFTIR, dagsettar, og verður að nefna VÖRN —
 * nafn varðar í tools/audit-all.cjs sem fellur rautt ef villan reynir að koma
 * aftur. Viðgerð án varnar birtist hér BLIKKANDI sem „ÓVARIÐ". Texti um að
 * hafa lagað eitthvað stöðvar ekki endurtekningu; vörður gerir það.
 *
 * ── SÍÐAN BREYTIR ENGU ────────────────────────────────────────────────────
 * Hún les og sýnir. Engin skrif, engin sjálfvirk ákvörðun.
 * ========================================================================== */
(() => {
  if (window.__maelabord346) return;
  window.__maelabord346 = true;

  const VIEW_ID = 'view-maelabord';   // verður að vera view-{NAV_KEY} fyrir beininn (218)
  const NAV_KEY = 'maelabord';

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ── Mælitækin ────────────────────────────────────────────────────────────
     Lykillinn er sá SAMI og hurðin skráir. Bætist mælikvarði við hurðina birtist
     hann sjálfkrafa hér neðst sem „nýr" — betra en að hverfa þegjandi. */
  const MAELAR = [
    /* SKRÁIN — kunnaskra */
    { g: 'Skráin', k: 'i_thjonustu_an_taekja', t: 'Í þjónustu, engin tæki skráð',
      s: 'Ósýnileg í Ársskoðun. Orsökin á bak við margar hinna talnanna.' },
    { g: 'Skráin', k: 'thar_af_fyllanleg_ur_reikningi', t: '…þar af fyllanleg úr reikningi',
      s: 'Magnið er til í síðasta reikningi og má lesa þaðan. Hátt er GOTT hér.' },
    { g: 'Skráin', k: 'thar_af_med_drive_reikning', t: '…þar af með Drive-reikning á sér',
      s: 'Magnið er í PDF-inu og má lesa þaðan (eins og Húnar). Hátt er GOTT hér.' },
    { g: 'Skráin', k: 'blob_og_uttaeki_osamraeda', t: 'Blob og tækjaraðir segja sitthvað',
      s: 'Appið lætur tækjaraðirnar vinna — ósamræmið er þögult þar til einhver setur equipment_manual.' },
    { g: 'Skráin', k: 'i_thjonustu_an_kennitolu', t: 'Í þjónustu, engin kennitala',
      s: 'Ekki hægt að para við kúnnaskrá né reikning.' },
    { g: 'Skráin', k: 'i_thjonustu_ogild_kennitala', t: 'Kennitala ekki 10 stafir',
      s: 'Villuslegin kennitala paraast aldrei rétt.' },
    { g: 'Skráin', k: 'tvitekin_kennitala', t: 'Sama kennitala á fleiri en einu fyrirtæki',
      s: 'Rekstrarfélög eiga margar starfsstöðvar — en tvítak felur sig hér líka.' },
    { g: 'Skráin', k: 'i_thjonustu_an_heimilisfangs', t: 'Í þjónustu, ekkert heimilisfang',
      s: 'Bílstjórinn hefur ekkert að fara eftir.' },
    { g: 'Skráin', k: 'i_thjonustu_an_postnumers', t: 'Í þjónustu, ekkert póstnúmer',
      s: 'Fellur út úr svæðaskiptum aksturslistum.' },
    { g: 'Skráin', k: 'i_thjonustu_an_tengilids', t: 'Enginn sími, farsími né netfang',
      s: 'Ekki hægt að boða komu né senda skýrslu.' },
    { g: 'Skráin', k: 'i_thjonustu_an_netfangs', t: 'Í þjónustu, ekkert netfang',
      s: 'Reikningur og skýrsla komast ekki í tölvupósti.' },
    { g: 'Skráin', k: 'i_thjonustu_an_kunnaskrar', t: 'Í þjónustu, ekki tengt kúnnaskrá',
      s: 'Skjöl og reikningar rata ekki á staðinn.' },
    { g: 'Skráin', k: 'i_thjonustu_en_merkt_ovirkt', t: 'Í þjónustu en merkt óvirkt',
      s: 'Tvö flögg segja andstæða hluti.' },

    /* ÁRSSKOÐUN — elon-musk */
    { g: 'Ársskoðun', k: 'komid_a_tima_enginn_akstur', t: 'Komin á tíma, á engum aksturslista',
      s: 'Enginn er á leiðinni þangað. Stekkur við hver mánaðamót — það er dagatalið.' },
    { g: 'Ársskoðun', k: 'i_thjonustu_an_skodunarmanadar', t: 'Enginn skoðunarmánuður settur',
      s: 'Kemst aldrei á tíma, því ekkert segir hvenær.' },
    { g: 'Ársskoðun', k: 'i_thjonustu_ekki_skodad_i_ar', t: 'Ekki skoðað í ár',
      s: 'Árið er ekki búið — en þetta er eftirstandandi verk.' },
    { g: 'Ársskoðun', k: 'i_thjonustu_ekki_skodad_2_ar', t: 'Ekki skoðað í 2 ár eða lengur',
      s: 'Farið fram úr lögbundinni árlegri yfirferð.' },
    { g: 'Ársskoðun', k: 'veidin_stadir_med_2026_skyrslu', t: 'Staðir með 2026-skýrslu  ↑',
      s: 'Veiðin. Fjölgun er ÞEKJA — hærra er betra.' },
    { g: 'Ársskoðun', k: 'veidin_stadir_med_2025_skyrslu', t: 'Staðir með 2025-skýrslu  ↑',
      s: 'Veiðin. Hærra er betra.' },
    { g: 'Ársskoðun', k: 'veidin_engin_skyrsla_25_26', t: 'Hvorki 2025 né 2026 skýrsla',
      s: 'Veiðin. Tveggja ára gat.' },
    { g: 'Ársskoðun', k: 'veidin_amber_felog', t: 'Amber-félög',
      s: 'Veiðin. Gulmerkt — þarfnast yfirferðar.' },
    { g: 'Ársskoðun', k: 'veidin_gleymd_felog', t: 'Gleymd félög',
      s: 'Veiðin. Enginn hefur snert þau.' },
    { g: 'Ársskoðun', k: 'veidin_skyrslur_2026', t: '2026-skýrslur alls  ↑',
      s: 'Veiðin. Hærra er betra.' },
    { g: 'Ársskoðun', k: 'veidin_skyrslur_2026_reviewed', t: '…þar af yfirfarnar  ↑',
      s: 'Veiðin. Hærra er betra.' },

    /* SALA OG RUKKUN — sala-reikningar */
    { g: 'Sala og rukkun', k: 'skodad_en_orukkad', t: 'Skoðað í ár, hvorki sala né reikningur',
      s: 'Vinnan var unnin og ekki rukkuð.' },
    { g: 'Sala og rukkun', k: 'rukkad_undir_helmingi_skradra', t: 'Rukkuð tæki undir helmingi skráðra',
      s: 'Skráin eða reikningurinn er skakkur — annað hvort.' },
    { g: 'Sala og rukkun', k: 'rukkad_yfir_tvofalt_skrad', t: 'Rukkuð tæki yfir tvöfalt skráð',
      s: 'Hin áttin: gömul draugatæki geta troðið sér inn á reikninga.' },
    { g: 'Sala og rukkun', k: 'solur_i_ar_an_vidskiptavinar', t: 'Sölur í ár án viðskiptavinar',
      s: 'Hvorki customer_id né kúnnaskrá — ratar hvergi.' },
    { g: 'Sala og rukkun', k: 'solur_i_ar_an_lina', t: 'Sölur í ár án lína',
      s: 'Reikningur án innihalds.' },
    { g: 'Sala og rukkun', k: 'solur_i_ar_an_upphaedar', t: 'Frágengnar sölur án upphæðar',
      s: 'Status final en samtals 0.' },
    { g: 'Sala og rukkun', k: 'solur_fastar_i_drogum', t: 'Sölur fastar í drögum',
      s: 'Aldrei frágengnar — hvorki rukkaðar né felldar.' },
    { g: 'Sala og rukkun', k: 'kreditreikningar_i_ar', t: 'Kreditreikningar í ár',
      s: 'Eðlilegur hluti reksturs — talinn til upplýsingar, ekki sem villa.' },
    { g: 'Sala og rukkun', k: 'tvitekin_solunumer', t: 'Tvítekin sölunúmer',
      s: 'Sama númer á fleiri en einni sölu.' },
    { g: 'Sala og rukkun', k: 'reikningsskjol_an_numers', t: 'Reikningsskjöl án reikningsnúmers',
      s: 'Ekki hægt að para við sölu.' },
    { g: 'Sala og rukkun', k: 'tvitekin_reikningsnumer', t: 'Tvítekin reikningsnúmer í skjölum',
      s: 'Sama R-númer á fleiri en einu skjali.' },
    { g: 'Sala og rukkun', k: 'veidin_rukkud_an_skyrslu', t: 'Rukkað 2026 án skýrslu',
      s: 'Veiðin. Reikningur fór út, skýrslan er ekki til.' },
    { g: 'Sala og rukkun', k: 'veidin_bundle_por', t: 'Kláruð pör (skýrsla + reikningur)  ↑',
      s: 'Veiðin. Hærra er betra.' },
    { g: 'Sala og rukkun', k: 'veidin_bundle_reikn_vantar', t: '2026-skýrslur án reiknings',
      s: 'Veiðin. Vinnan var unnin og ekki rukkuð.' },
    { g: 'Sala og rukkun', k: 'veidin_bundle_skyrsla_vantar', t: '2026-reikningar án skýrslu',
      s: 'Veiðin. Rukkað en engin skýrsla á skrá.' },

    /* SKJÖL OG DRIVE */
    { g: 'Skjöl og Drive', k: 'dauder_drive_tenglar', t: 'Dauðir Drive-tenglar',
      s: 'Skýrslan er ekki þar sem tengillinn segir.' },
    { g: 'Skjöl og Drive', k: 'oathugadir_drive_tenglar', t: 'Óathugaðir Drive-tenglar',
      s: 'Veit ekki hvort þeir virka. Óvissa, ekki bilun.' },
    { g: 'Skjöl og Drive', k: 'skjol_an_kunnaskrar', t: 'Skjöl án eiganda',
      s: 'Hvorki kúnnaskrá né fyrirtæki — finnast ekki á staðnum.' },
    { g: 'Skjöl og Drive', k: 'skjol_merkt_tvitekin', t: 'Skjöl merkt tvítekin',
      s: 'Þegar greind sem afrit; bíða förgunar eða staðfestingar.' },
    { g: 'Skjöl og Drive', k: 'veidin_skjol_an_ars', t: 'Skjöl án árs',
      s: 'Veiðin. Fóru úr 336 í 1 — nánast leyst.' },
    { g: 'Skjöl og Drive', k: 'veidin_drive_tvitok', t: 'Drive-tvítök 2026',
      s: 'Veiðin. Sama skjal oftar en einu sinni.' },
    { g: 'Skjöl og Drive', k: 'veidin_drive_2026_radir', t: 'Drive-raðir 2026',
      s: 'Veiðin. Stofnstærð — hvorki góð né slæm.' },
    { g: 'Skjöl og Drive', k: 'veidin_drive_2026_distinct', t: '…þar af einstök skjöl',
      s: 'Veiðin. Stofnstærð.' },
    { g: 'Skjöl og Drive', k: 'veidin_blob_graen_an_skyrslu', t: 'Græn í blob en engin skýrsla',
      s: 'Veiðin. Kerfið segir búið; skjalið er ekki til.' },
    { g: 'Skjöl og Drive', k: 'veidin_hud_buid_2026', t: 'Húð merkt búið 2026',
      s: 'Veiðin. Stofnstærð yfirferðar.' },
    { g: 'Skjöl og Drive', k: 'veidin_hud_buid_vs_skyrsla', t: 'Húð búið en skýrsla vantar',
      s: 'Veiðin. Misræmi milli merkingar og skjals.' },
    { g: 'Skjöl og Drive', k: 'veidin_systkini_kt', t: 'Systkini-kennitölur',
      s: 'Veiðin. Sama kt á mörgum stöðum — join-leki felur sig hér.' },

    /* TÆKI */
    { g: 'Tæki', k: 'taeki_med_utrunna_skodun', t: 'Tæki með útrunna skoðun',
      s: 'next_insp er liðinn. Stærsta einstaka talan í kerfinu.' },
    { g: 'Tæki', k: 'taeki_an_naestu_skodunar', t: 'Tæki án næstu skoðunar',
      s: 'Ekkert segir hvenær á að koma aftur.' },
    { g: 'Tæki', k: 'taeki_an_sidustu_skodunar', t: 'Tæki án síðustu skoðunar',
      s: 'Engin saga — ekki hægt að reikna næsta gjalddaga.' },
    { g: 'Tæki', k: 'taeki_an_stadsetningar', t: 'Tæki án staðsetningar í húsi',
      s: 'Tæknimaðurinn veit ekki hvar það hangir.' },
    { g: 'Tæki', k: 'taeki_an_eiganda', t: 'Tæki án eiganda',
      s: 'Hvorki fyrirtæki né kúnnaskrá.' },
    { g: 'Tæki', k: 'taeki_an_radnumers', t: 'Tæki án raðnúmers',
      s: 'Ekki hægt að skanna né rekja.' },
    { g: 'Tæki', k: 'tvitekid_radnumer', t: 'Tvítekið raðnúmer',
      s: 'Sama raðnúmer á fleiri en einu tæki.' },
    { g: 'Tæki', k: 'taeki_an_tegundar', t: 'Tæki án tegundar',
      s: 'Ekki hægt að reikna slökkvigildi né verð.' },

    /* ÞJÓNUSTUBORÐ OG VERK — bord-flettur */
    { g: 'Þjónustuborð og verk', k: 'opin_thjonustumal', t: 'Opin þjónustumál',
      s: 'Staða nytt og ekki eytt.' },
    { g: 'Þjónustuborð og verk', k: 'opin_eldri_en_6_manada', t: '…þar af eldri en 6 mánaða',
      s: 'Líklega afgreidd í raun, aldrei merkt.' },
    { g: 'Þjónustuborð og verk', k: 'opin_an_svarad_at', t: 'Opin mál án svarad_at',
      s: 'Reiturinn er til og ekkert skrifar í hann. Þess vegna vex borðið.' },
    { g: 'Þjónustuborð og verk', k: 'opin_an_kunnaskrar', t: 'Opin mál án viðskiptavinar',
      s: 'Ekki hægt að sjá söguna á staðnum.' },
    { g: 'Þjónustuborð og verk', k: 'verkbeidnir_ekki_sottar', t: 'Verkbeiðnir tilbúnar, ósóttar',
      s: 'Staða ready — bíða á verkstæði.' },
    { g: 'Þjónustuborð og verk', k: 'verkbeidnir_ekki_sottar_30_daga', t: '…þar af yfir 30 daga',
      s: 'Standa á gólfinu.' },
    { g: 'Þjónustuborð og verk', k: 'verklidir_an_taekis', t: 'Verkliðir án tækis',
      s: 'Vinna skráð á ekkert tæki — rekst ekki á sögu tækisins.' },

    /* SAMNINGAR */
    { g: 'Samningar', k: 'i_thjonustu_an_samnings', t: 'Í þjónustu án virks samnings',
      s: 'Þjónustað án samnings að baki.' },
    { g: 'Samningar', k: 'samningar_komnir_a_tima', t: 'Samningar komnir á gjalddaga',
      s: 'next_due liðinn og staða virkur.' },
    { g: 'Samningar', k: 'veidin_stadir_med_samning', t: 'Staðir með samning  ↑',
      s: 'Veiðin. Hærra er betra.' },
    { g: 'Samningar', k: 'veidin_felog_med_netfang', t: 'Félög með netfang  ↑',
      s: 'Veiðin. Hærra er betra.' },

    /* STOFNSTÆRÐIR */
    { g: 'Stofnstærðir', k: 'veidin_stadir_i_thjonustu', t: 'Staðir í þjónustu',
      s: 'Veiðin. Nefnarinn í flestum hlutföllum hér að ofan.' },
    { g: 'Stofnstærðir', k: 'veidin_felog_i_thjonustu', t: 'Félög í þjónustu',
      s: 'Veiðin. Stofnstærð.' },

    /* VERKEFNALISTINN */
    { g: 'Verkefnalisti', k: 'verkefni_i_beidni', t: 'Verkefni í beiðni',
      s: 'Bíða þess að vera tekin.' },
    { g: 'Verkefnalisti', k: 'verkefni_i_vinnu', t: 'Verkefni í vinnu',
      s: 'Í gangi — eðlilegt vinnuflæði, ekki vandamál.' },
    { g: 'Verkefnalisti', k: 'verkefni_i_yfirferd', t: 'Verkefni í yfirferð',
      s: 'Bíða samþykkis Agnars.' },
  ];

  const HEITI = k => (MAELAR.find(m => m.k === k) || {}).t || String(k).replace(/_/g, ' ');

  let _d = null, _valinn = 'i_thjonustu_an_taekja', _sott = false;

  /* ── Stílar ────────────────────────────────────────────────────────────── */
  function stilar() {
    if (document.getElementById('_mb-css')) return;
    const V = '#' + VIEW_ID + ' ';
    const s = document.createElement('style');
    s.id = '_mb-css';
    s.textContent = [
      V + '{background:#0e1013;color:#d8dce2;padding:0 0 40px;min-height:100vh}',
      V + '*{box-sizing:border-box}',
      V + '.mb-wrap{max-width:1180px;margin:0 auto;padding:18px 16px 0;'
        + 'font:14px/1.5 "IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif}',

      /* Haus */
      V + '.mb-hd{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;'
        + 'border-bottom:1px solid #23262c;padding-bottom:12px;margin-bottom:16px}',
      V + '.mb-hd h1{margin:0;font-size:19px;font-weight:600;letter-spacing:.14em;color:#eceff3}',
      V + '.mb-hd .mb-sub{font-size:12px;color:#6d757f}',
      V + '.mb-hd .mb-upp{margin-left:auto;font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:#6d757f}',
      V + '#mb-maela{flex:0 0 auto;min-height:34px;padding:0 13px;border-radius:3px;border:1px solid #3b4148;'
        + 'background:#1c2026;color:#cfd5dc;font-size:12.5px;font-weight:600;cursor:pointer;letter-spacing:.03em}',
      V + '#mb-maela:hover{background:#242931;border-color:#4a5158}',
      V + '#mb-maela[disabled]{opacity:.55;cursor:default}',

      /* Blikkandi viðvörun */
      V + '.mb-alarm{border:1px solid #7d2b26;background:#1d1113;border-left:3px solid #c0392b;'
        + 'border-radius:3px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#f0c3bd}',
      V + '.mb-alarm b{display:block;color:#ff6b5a;letter-spacing:.06em;font-size:12px;margin-bottom:6px}',
      V + '.mb-alarm .mb-row{padding:2px 0}',
      V + '.mb-blikk{animation:mbBlikk 1.25s steps(1) infinite}',
      '@keyframes mbBlikk{0%,55%{opacity:1}56%,100%{opacity:.28}}',
      /* Sé notandinn með hreyfingu slökkta blikkar ekkert — liturinn ber merkinguna. */
      '@media (prefers-reduced-motion:reduce){' + V + '.mb-blikk{animation:none}}',

      /* Mælaraðir */
      V + '.mb-maelar{border:1px solid #23262c;border-radius:4px;overflow:hidden;background:#131519}',
      V + '.mb-m{display:grid;grid-template-columns:1fr 88px 74px 116px;gap:12px;align-items:center;'
        + 'padding:11px 14px;border-bottom:1px solid #1e2126;cursor:pointer}',
      V + '.mb-hopur{padding:9px 14px 7px;font-size:10.5px;font-weight:700;letter-spacing:.13em;'
        + 'color:#7d858f;background:#0f1115;border-bottom:1px solid #1e2126;border-top:1px solid #1e2126}',
      V + '.mb-hopur:first-child{border-top:0}',
      V + '.mb-m:last-child{border-bottom:0}',
      V + '.mb-m:hover{background:#181b20}',
      V + '.mb-m.valinn{background:#191d23;box-shadow:inset 3px 0 0 #c0392b}',
      V + '.mb-m .mb-t{font-size:13.5px;color:#dfe3e9;font-weight:500}',
      V + '.mb-m .mb-s{font-size:11.5px;color:#6d757f;margin-top:2px}',
      V + '.mb-m .mb-n{font:600 22px/1 ui-monospace,SFMono-Regular,Menlo,monospace;'
        + 'text-align:right;color:#eceff3}',
      V + '.mb-m.nul .mb-n{color:#4e9c72}',
      V + '.mb-m .mb-dl{font:600 12px/1 ui-monospace,monospace;text-align:right}',
      V + '.mb-dl.verri{color:#e05a48}',
      V + '.mb-dl.betri{color:#4e9c72}',
      V + '.mb-dl.kyrr{color:#5c646e}',
      V + '.mb-dl.grunn{color:#7d858f;font-size:10.5px;letter-spacing:.05em}',
      V + '.mb-m svg{display:block}',

      /* Línurit */
      V + '.mb-graf{margin-top:18px;border:1px solid #23262c;border-radius:4px;background:#131519;padding:14px 16px 10px}',
      V + '.mb-graf h2{margin:0 0 2px;font-size:14px;font-weight:600;color:#eceff3}',
      V + '.mb-graf .mb-gs{font-size:11.5px;color:#6d757f;margin-bottom:10px}',
      V + '.mb-graf svg{width:100%;height:auto;display:block}',
      V + '.mb-tomt{padding:26px 4px;color:#6d757f;font-size:12.5px;text-align:center}',

      /* Bókin */
      V + '.mb-bok{margin-top:18px}',
      V + '.mb-bok h2{margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:.1em;color:#9aa3ad}',
      V + '.mb-f{border:1px solid #23262c;border-left:3px solid #3d4650;border-radius:3px;background:#131519;'
        + 'padding:11px 13px;margin-bottom:8px}',
      V + '.mb-f.ovarid{border-left-color:#c0392b}',
      V + '.mb-f .mb-fd{font:11px ui-monospace,monospace;color:#6d757f}',
      V + '.mb-f .mb-fa{font-size:13.5px;color:#e4e8ed;margin:3px 0 5px}',
      V + '.mb-delta{font:12px ui-monospace,monospace;color:#9aa3ad}',
      V + '.mb-delta i{font-style:normal;color:#4e9c72}',
      V + '.mb-delta s{text-decoration:none;color:#8c949e}',
      V + '.mb-vorn{display:inline-block;margin-top:6px;font-size:11px;padding:2px 7px;border-radius:2px;'
        + 'background:#16301f;color:#6fbf8f;letter-spacing:.03em}',
      V + '.mb-vorn.nei{background:#2d1315;color:#ff7a68}',
      V + '.mb-note{margin-top:14px;font-size:11.5px;color:#5c646e;line-height:1.6;'
        + 'border-top:1px solid #1e2126;padding-top:12px}',
      V + '.mb-note code{color:#8c949e}',
      V + '.mb-bid{padding:56px 0;text-align:center;color:#6d757f;font-size:13px}',
      V + '.mb-villa{padding:16px;border:1px solid #7d2b26;background:#1d1113;color:#f0c3bd;'
        + 'border-radius:3px;font-size:13px;line-height:1.6}',

      /* Sími: fjórir dálkar verða þrjár línur. */
      '@media (max-width:640px){',
      V + '.mb-m{grid-template-columns:1fr auto;gap:6px 10px}',
      V + '.mb-m .mb-n{grid-column:2;grid-row:1}',
      V + '.mb-m .mb-dl{grid-column:2;grid-row:2;align-self:start}',
      V + '.mb-m .mb-sp{grid-column:1/-1;grid-row:3}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  function viewEl() {
    let v = document.getElementById(VIEW_ID);
    if (!v) {
      v = document.createElement('div');
      v.id = VIEW_ID;
      v.className = 'view';
      const systkini = document.querySelector('.view');
      if (systkini && systkini.parentNode) systkini.parentNode.appendChild(v);
      else document.body.appendChild(v);
    }
    return v;
  }

  /* ── Teikning ──────────────────────────────────────────────────────────── */
  function sparkline(ferill, stefna) {
    if (!Array.isArray(ferill) || ferill.length < 2) return '';
    const w = 104, h = 26, mn = Math.min(...ferill), mx = Math.max(...ferill), sp = (mx - mn) || 1;
    const d = ferill.map((v, i) => (i ? 'L' : 'M')
      + (i / (ferill.length - 1) * w).toFixed(1) + ' '
      + (h - ((v - mn) / sp) * (h - 4) - 2).toFixed(1)).join(' ');
    // Liturinn verður að fylgja stefnu mælisins, annars er grænt/rautt öfugt
    // á þeim átta sem batna við hækkun.
    const upp = ferill[ferill.length - 1] > ferill[0];
    const verri = stefna === 'hlutlaus' ? null : (stefna === 'haerra_betra' ? !upp : upp);
    return '<svg class="mb-sp" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">'
      + '<path d="' + d + '" fill="none" stroke="' + (verri === null ? '#5c646e' : verri ? '#c0392b' : '#4e9c72') + '" stroke-width="1.7"/></svg>';
  }

  /* Stóra línuritið með frystingarmerkjum. Einn punktur = enginn ferill enn:
     þá er sagt „grunnlína skráð" í stað þess að teikna flata línu sem lítur
     út eins og mæling sem hreyfist ekki. */
  function graf(h, vidgerdir) {
    if (!h || !Array.isArray(h.ferill) || h.ferill.length < 2) {
      const d0 = h && h.dagar && h.dagar[0] ? ' ' + esc(String(h.dagar[0]).slice(0, 10)) : '';
      return '<div class="mb-tomt">Grunnlína skráð' + d0
        + ' — línuritið teiknast við næstu mælingu.</div>';
    }
    const W = 900, H = 240, L = 46, R = 14, T = 18, B = 30;
    const f = h.ferill, dg = h.dagar || [];
    const mn0 = Math.min(...f), mx0 = Math.max(...f);
    const pad = Math.max(1, Math.round((mx0 - mn0) * 0.12));
    const mn = Math.max(0, mn0 - pad), mx = mx0 + pad, sp = (mx - mn) || 1;
    const X = i => L + (i / (f.length - 1)) * (W - L - R);
    const Y = v => T + (1 - (v - mn) / sp) * (H - T - B);

    const lina = f.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    const flotur = lina + ' L' + X(f.length - 1).toFixed(1) + ' ' + (H - B) + ' L' + L + ' ' + (H - B) + ' Z';
    const verri = f[f.length - 1] > f[0];
    const litur = verri ? '#c0392b' : '#4e9c72';

    /* Frystingarmerki: lóðrétt brotalína á þann mælipunkt sem er næstur
       dagsetningu viðgerðarinnar. Sé enginn punktur innan 36 klst er ekkert
       teiknað — merki á röngum stað er verra en ekkert merki. */
    const merki = (vidgerdir || []).map(v => {
      let best = -1, bd = Infinity;
      dg.forEach((d, i) => {
        const diff = Math.abs(new Date(d) - new Date(v.dags));
        if (diff < bd) { bd = diff; best = i; }
      });
      if (best < 0 || bd > 36 * 3600e3) return '';
      const x = X(best).toFixed(1);
      return '<line x1="' + x + '" y1="' + T + '" x2="' + x + '" y2="' + (H - B) + '" '
        + 'stroke="' + (v.varin ? '#5b7f96' : '#c0392b') + '" stroke-width="1" stroke-dasharray="3 3"/>'
        + '<text x="' + x + '" y="' + (T - 5) + '" fill="#7d858f" font-size="9" text-anchor="middle" '
        + 'font-family="ui-monospace,monospace">' + esc(String(v.dags).slice(5, 10)) + '</text>';
    }).join('');

    const asar = [mx, Math.round((mx + mn) / 2), mn].map(v =>
      '<line x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - R) + '" y2="' + Y(v).toFixed(1)
      + '" stroke="#1f232a" stroke-width="1"/>'
      + '<text x="' + (L - 7) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" fill="#5c646e" font-size="10" '
      + 'text-anchor="end" font-family="ui-monospace,monospace">' + v + '</text>').join('');

    const dagsetningar = '<text x="' + L + '" y="' + (H - 9) + '" fill="#5c646e" font-size="10" '
      + 'font-family="ui-monospace,monospace">' + esc(String(dg[0] || '').slice(0, 10)) + '</text>'
      + '<text x="' + (W - R) + '" y="' + (H - 9) + '" fill="#5c646e" font-size="10" text-anchor="end" '
      + 'font-family="ui-monospace,monospace">' + esc(String(dg[dg.length - 1] || '').slice(0, 10)) + '</text>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" '
      + 'aria-label="Línurit fyrir ' + esc(HEITI(h.maelikvardi)) + '">'
      + asar + merki
      + '<path d="' + flotur + '" fill="' + litur + '" opacity=".08"/>'
      + '<path d="' + lina + '" fill="none" stroke="' + litur + '" stroke-width="2"/>'
      + '<circle cx="' + X(f.length - 1).toFixed(1) + '" cy="' + Y(f[f.length - 1]).toFixed(1)
      + '" r="3.5" fill="' + litur + '"/>'
      + dagsetningar + '</svg>';
  }

  function deltaMerki(h) {
    if (!h) return '<span class="mb-dl kyrr">—</span>';
    if (h.att === 'grunnlína') return '<span class="mb-dl grunn">GRUNNLÍNA</span>';
    // Hlutlaus mælir sýnir hreyfingu án dóms — stofnstærð sem hækkar er ekki bilun.
    if (h.att === 'hlutlaus') {
      return '<span class="mb-dl kyrr">' + (h.breyting > 0 ? '+' : '') + (h.breyting || 0) + '</span>';
    }
    if (!h.breyting) return '<span class="mb-dl kyrr">óbreytt</span>';
    const upp = h.breyting > 0;
    return '<span class="mb-dl ' + (upp ? 'verri' : 'betri') + '">'
      + (upp ? '▲ +' : '▼ ') + h.breyting + '</span>';
  }

  function teikna() {
    const v = viewEl();
    if (!_d) {
      v.innerHTML = '<div class="mb-wrap"><div class="mb-bid">Sæki mælingar…</div></div>';
      return;
    }
    if (_d.villa) {
      v.innerHTML = '<div class="mb-wrap"><div class="mb-villa">Náði ekki í mælingar: ' + esc(_d.villa)
        + '<br><br>Mælaborðið les <code>/api/ai-context</code>. Svari hún ekki er ekkert sýnt — '
        + 'engin tala er betri en tala sem gæti verið röng.</div></div>';
      return;
    }

    const S = _d.saga || {}, hr = S.hreyfing || [];
    const byKey = {};
    hr.forEach(h => { byKey[h.maelikvardi] = h; });

    // Mælikvarðar sem hurðin skilar en eru ekki skilgreindir hér — sýndir samt.
    const aukalegir = hr.filter(h => !MAELAR.some(m => m.k === h.maelikvardi))
      .map(h => ({ k: h.maelikvardi, t: String(h.maelikvardi).replace(/_/g, ' '),
                   s: 'Nýr mælikvarði — ekki skilgreindur í 346.' }));
    const listi = MAELAR.filter(m => byKey[m.k]).concat(aukalegir);

    const vidv = _d.vidvorun || [];
    const ovardar = _d.ovardar_vidgerdir || [];
    const alarm = (vidv.length || ovardar.length)
      ? '<div class="mb-alarm"><b class="mb-blikk">⚠ VIÐVÖRUN</b>'
        + vidv.map(x => '<div class="mb-row">' + esc(x) + '</div>').join('')
        + (ovardar.length
            ? '<div class="mb-row" style="margin-top:6px">Viðgerðir án varnar — geta endurtekið sig: '
              + esc(ovardar.join(' · ')) + '</div>'
            : '')
        + '</div>'
      : '';

    /* Flokkahaus birtist þegar `g` breytist. 73 raðir í einni bunu eru
       veggur; áttatíu prósent af gagninu er að vita hvar maður er staddur. */
    let sidastiHopur = null;
    const madar = listi.map(m => {
      const h = byKey[m.k];
      const hopur = m.g || 'Annað';
      const haus = hopur !== sidastiHopur
        ? '<div class="mb-hopur">' + esc(hopur) + '</div>' : '';
      sidastiHopur = hopur;
      // Grænt núll þýðir „leyst" — en aðeins þegar lægra ER betra. Hlutlaus
      // stofnstærð upp á 0 er ekki sigur, og hærra-betra 0 er þvert á móti slæmt.
      const graent = h.nuna === 0 && (h.stefna || 'laegra_betra') === 'laegra_betra';
      return haus
        + '<div class="mb-m' + (_valinn === m.k ? ' valinn' : '') + (graent ? ' nul' : '')
        + '" data-k="' + esc(m.k) + '">'
        + '<div><div class="mb-t">' + esc(m.t) + '</div><div class="mb-s">' + esc(m.s) + '</div></div>'
        + '<div class="mb-n">' + h.nuna + '</div>'
        + '<div>' + deltaMerki(h) + '</div>'
        + '<div>' + sparkline(h.ferill, h.stefna) + '</div></div>';
    }).join('');

    const valinnH = byKey[_valinn] || hr[0];
    const vg = _d.vidgerdir || [];

    const bok = vg.length
      ? vg.map(f => {
          const breytingar = (f.fyrir && f.eftir)
            ? Object.keys(f.eftir).filter(k => (f.fyrir[k] || 0) !== f.eftir[k])
                .map(k => esc(HEITI(k)) + ': <s>' + (f.fyrir[k] || 0) + '</s> → <i>' + f.eftir[k] + '</i>')
            : [];
          return '<div class="mb-f' + (f.varin ? '' : ' ovarid') + '">'
            + '<div class="mb-fd">' + esc(String(f.dags).slice(0, 16).replace('T', ' ')) + ' · '
            + esc(f.hver || '—') + '</div>'
            + '<div class="mb-fa">' + esc(f.adgerd) + '</div>'
            + '<div class="mb-delta">'
            + (breytingar.length ? breytingar.join(' · ') : 'Engin mæld tala breyttist.') + '</div>'
            + (f.varin
                ? '<span class="mb-vorn">🛡 vörn: ' + esc(f.vorn) + '</span>'
                : '<span class="mb-vorn nei mb-blikk">ÓVARIÐ — getur endurtekið sig</span>')
            + '</div>';
        }).join('')
      : '<div class="mb-f"><div class="mb-delta">Engin viðgerð skráð enn. Hún skráist sjálfkrafa '
        + 'þegar lagfæring er send inn með <code>vidgerd:true</code>.</div></div>';

    const nyjast = (S.nyjast && S.nyjast.dags) ? String(S.nyjast.dags).slice(0, 16).replace('T', ' ') : '—';
    const grunn = (S.grunnlina && S.grunnlina.dags) ? String(S.grunnlina.dags).slice(0, 10) : '—';

    v.innerHTML = '<div class="mb-wrap">'
      + '<div class="mb-hd"><h1>MÆLABORÐ</h1>'
      + '<span class="mb-sub">grunnlína ' + esc(grunn) + ' · ' + (S.punktar || 0) + ' mælipunktar</span>'
      + '<span class="mb-upp">mælt ' + esc(nyjast) + '</span>'
      + '<button id="mb-maela" type="button" title="Les ~35 þús. raðir og skráir nýjan mælipunkt">Mæla núna</button></div>'
      + alarm
      + '<div class="mb-maelar">' + madar + '</div>'
      + '<div class="mb-graf"><h2>' + esc(HEITI(_valinn)) + '</h2>'
      + '<div class="mb-gs">Brotalínur = frysting við viðgerð. Smelltu á mæli að ofan til að skipta.</div>'
      + graf(valinnH, vg) + '</div>'
      + '<div class="mb-bok"><h2>VIÐGERÐARBÓK — FYRIR / EFTIR</h2>' + bok + '</div>'
      + '<div class="mb-note">Tölurnar eru mældar við hvern inngang á <code>/api/ai-context</code> og geymdar '
      + 'dagsettar. Hækkun er verri — allar þessar tölur eru vandamál. Viðgerð verður að nefna vörn í '
      + '<code>tools/audit-all.cjs</code>; sá vörður fellur rautt reyni villan að koma aftur. Það er það sem '
      + 'gerir „bara einu sinni" satt.</div></div>';

    /* Mæling er aðgerð, ekki aukaverkun af því að opna síðuna: full skönnun
       les ~35 þús. raðir. Síðan sýnir bókina strax og mælir bara þegar beðið
       er um það. */
    const takki = v.querySelector('#mb-maela');
    if (takki) takki.addEventListener('click', async () => {
      takki.disabled = true;
      takki.textContent = 'Mæli…';
      try {
        const r = await fetch('/api/ai-context?maela=1', { headers: { accept: 'application/json' } });
        const d = await r.json().catch(() => null);
        if (r.ok && d) _d = d; else _d = { villa: 'HTTP ' + r.status };
      } catch (e) {
        _d = { villa: String((e && e.message) || e) };
      }
      teikna();
    });

    v.querySelectorAll('.mb-m').forEach(el => el.addEventListener('click', () => {
      _valinn = el.dataset.k;
      teikna();
      const g = v.querySelector('.mb-graf');
      if (g) g.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
  }

  async function saekja() {
    try {
      const r = await fetch('/api/ai-context', { headers: { accept: 'application/json' } });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) { _d = { villa: 'HTTP ' + r.status }; return; }
      _d = d;
      // Valinn mælikvarði gæti verið horfinn úr hurðinni — falla þá á þann fyrsta.
      const til = (d.saga && d.saga.hreyfing) || [];
      if (!til.some(h => h.maelikvardi === _valinn) && til[0]) _valinn = til[0].maelikvardi;
    } catch (e) {
      _d = { villa: String((e && e.message) || e) };
    }
  }

  async function opna() {
    stilar();
    if (_sott) { teikna(); return; }
    _sott = true;
    teikna();          // „Sæki mælingar…"
    await saekja();
    teikna();
  }

  /* ── Nav + beinir (sama mynstur og 345/239) ───────────────────────────── */
  function navTakki() {
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return true;
    const sib = document.querySelector('[data-view="stadan"]')
             || document.querySelector('[data-view="arsskodun"]')
             || document.querySelector('[data-view]');
    if (!sib) return false;
    const b = sib.cloneNode(true);
    b.dataset.view = NAV_KEY;
    const sp = b.querySelector('span:not([class*="icon"]):not([class*="badge"])');
    if (sp) sp.textContent = '📈 Mælaborð';
    else for (const c of b.childNodes) if (c.nodeType === 3 && c.nodeValue.trim()) { c.nodeValue = ' 📈 Mælaborð'; break; }
    b.querySelectorAll('.count,.badge,[class*="badge"],[class*="count"]').forEach(n => n.remove());
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
    });
    sib.parentNode.insertBefore(b, sib.nextSibling);
    return true;
  }

  /* App.switchView þekkir aðeins sýnir sem eru í index.html. Þessi er búin til
     af pappa og verður því að skrá sig sjálf — sama og 345 og 239. */
  function hookSwitch() {
    if (!window.App || !App.switchView) return false;
    if (App.__maelabordPatched) return true;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
        const el = viewEl();
        el.style.display = 'block';
        el.classList.add('active');
        opna();
        try { history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
        return;
      }
      const me = document.getElementById(VIEW_ID);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      return orig(k);
    };
    App.__maelabordPatched = true;
    return true;
  }

  function vakta() {
    navTakki();
    hookSwitch();
    // Bein slóð /#maelabord á líka að virka, ekki bara nav-takkinn.
    try {
      if (location.hash.replace('#', '') === NAV_KEY) {
        const el = document.getElementById(VIEW_ID);
        if (!el || !el.classList.contains('active')) {
          if (window.App && App.switchView) App.switchView(NAV_KEY);
        }
      }
    } catch (_) {}
    const el = document.getElementById(VIEW_ID);
    if (el && el.classList.contains('active')) opna();
  }

  new MutationObserver(() => { clearTimeout(window.__mbT); window.__mbT = setTimeout(vakta, 300); })
    .observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.Maelabord = {
    opna,
    endurhlada: async () => { _sott = false; _d = null; await opna(); },
    version: 'v1',
  };
  console.log('[patch-346] maelabord ready');
})();
/* === END MÆLABORÐ === */
