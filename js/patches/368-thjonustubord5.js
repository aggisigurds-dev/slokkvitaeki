/* === ÞJÓNUSTUBORÐ 5 — Master borð, mitt borð, hamir, einingar og flýtileiðir (368) ============
 *
 * Agnar 10.09.2026: „þjónustuborðið er ekki alveg að virka núna, og margt þar sem þarf ekki að vera
 * … væri gott að hafa það smá skipt svo sé ekki jafn yfirþyrmandi, að hver starfsmaður geti haft sitt
 * ennþá og síðan Master borð, að við getum pickað af því smá saman og haft bara fá atriði á okkar
 * borði" · „jafnvel skipta um mode … skýrslumode … kröfumode … akstursskipulags mode … samskiptamode"
 * · Boss-útlitið. Tillagan (artifact „Þjónustuborð Boss v5") samþykkt. Lógóið er ekki endurtekið
 * hér — haus appsins ber það þegar.
 * Síðar sama kvöld: vinnuskjáirnir eru bogadregnir og um þrefalt breiðari en 1920 px, með tugi flipa
 * opna („Keldan, Drive, Brunahólf, Turbopaint, Payday, kröfuyfirlit, Tímavera …") — „kveikja á
 * hliðar viðbótum … festa linka eins og favorite bar í chrome" · „mode yrði alveg snilld í það,
 * með mismunandi opnur" · „gatt-admin og kanski link á þjónustugáttina líka".
 *
 * GAMLA BORÐIÐ FARIÐ 11.09.2026 (231 + 347 út): 368 festir hliðarstikuhnappinn sjálft (festaHnapp, data-view
 * 'verkbord'), tekur við #verkbord/#verkefni, setur óúthlutað > 30 d. í bunka Charlize (saekjaBunka) og sýnir fylgiskjöl.
 * KVEIKT 11.09.2026 („þá mátt kveikja á þjónustuborð 2"): hnappurinn „🔧 Þjónustuborð" (231 injectNav,
 * data-view 'verkbord') opnar #bord og Verkefnalista-appið byrjar hér (261). Gamla borðið (231) er
 * áfram á #verkbord og verður fjarlægt þegar Agnar segir til („eyða hinu þegar við erum búin").
 *
 * EINANGRAÐ (Shadow DOM): Brunastál-þemað þvingar `.view .btn` í hvítt á svörtu og `.view h1/h2/h3`
 *   í næstum svart með !important (mælt 10.09.2026) — gullhnappurinn varð svartur og titill valins
 *   máls hefði orðið svartur á svörtu. Borðið býr því í eigin skuggarót: stílar appsins ná ekki inn,
 *   stílar borðsins leka ekki út, og observerar annarra patcha sjá ekki hnappana. Atburðir eru
 *   hlustaðir á rótinni (click/change/keydown), ekki á document.
 *
 * BREIDD (gámafyrirspurnir, ekki skjástærð — borðið lagar sig að plássinu sem það fær):
 *   ≤ 760 px    sími: einn dálkur, Master/Mitt borð sem flipar, valið mál opnast undir línunni.
 *   761–1599    einn dálkur af einingum, borðið í tveimur dálkum.
 *   ≥ 1600      einingahamur (368aa): einingarnar í tveimur til þremur dálkum, valið mál hægra megin; borðið í fullri breidd.
 *   miðja ≥1500 Master · Mitt borð · Valið mál hlið við hlið (bogaskjárinn).
 *   Hver hamur er sín „opna": einingar hamsins (MODES.first) og ekkert annað — sjá HAMIR ENDURSKIPULAGÐIR.
 *
 * HVAÐ ER Á MASTER (mælt 10.09.2026): 82 opin mál — 77 á Charlize, 3 án starfsmanns, 2 á Bjarndísi.
 *   231 setur óúthlutuð mál eldri en 30 daga sjálfkrafa á AI_WORKER = 'Charlize' (claimOldJobs).
 *   Charlize er því bunki, ekki manneskja: Master = opið, ekki í geymslu, og enginn starfsmaður EÐA
 *   Charlize. Mitt borð = assigned_to er sá sem situr við tölvuna (BordStarfsmadur, 350).
 *
 * FELA OG VINNA (Agnar 11.09.2026: „Geturðu sett daufa textalínu allstaðar sem safnast, og ég geti ýtt á hide" ·
 *   „þetta er svoldið bara upplýsingablað en ekki vinnustofa"):
 *   Fela    hver röð í einingum sem safnast fær dauft „Fela" aftast í gráu línunni. Staða gagna → þjónninn:
 *           thjonustubord_falid (lykill <eining>:<hluti>:<auðkenni>[:<fingrafar>]), upsert lesið til baka, aldrei eytt —
 *           „Sýna aftur" skrifar falid = false. Síað ÁÐUR en sneitt er; kbox-staðreyndir telja áfram allt. Ekki á
 *           Master/Mitt borð, akstri (✕), vinnublöðum, skipulagi, forgangslista (369 „sleppt") né starfsmannatöflu.
 *   Vinna   raðir í Kröfum og „Gleymst að rukka?" fá „Vinna ›" → vinnugluggi 369 (opnaSolu / opnaGleymt); opin drög
 *           og kreditreikningar „Opna sölu ›" → 371 OpnaSolu (annars yfir á Sölu).
 *   Gleymt  úttektir sýna skoðunarmánuð, vinnublað og síðasta Stólpa-reikning; úttektir rukkaðar gegnum Stólpa (fyrri
 *           eigendur) eru sér og samanbrotnar — aldrei rukka þær aftur (sql/2026-09-11_gleymt_uttekt_stolpi.sql).
 *   Skýring (Agnar 11.09.2026: „máttu leyfa mér allstaðar að setja inn skýringar"): „· Skýring" / „· Breyta skýringu" aftan
 *           við Fela — sami lykill, sama röð: skyring/skyring_af (gikkurinn stimplar skyring_at og söguna). falid er sjálfgefið
 *           false, svo röð sem ber aðeins skýringu felur ekkert: „falið" er AÐEINS falid = true. Dauf lína „📝 texti — hver ·
 *           dags." undir efni línunnar, sýnilegrar og falinnar. Ritillinn (einn í einu) lokast aðeins þegar þjónninn hefur
 *           staðfest; bilun skilur textann eftir í reitnum. Flipi hverfur / starfsmaður skiptir / farið af borðinu / línan
 *           hverfur úr listanum → vistað strax, og við pagehide líka með keepalive beint á PostgREST.
 *
 * BÍÐUR SAMÞYKKIS (368u · Agnar 11.09.2026: „setja inn á mitt Agnar heimaborð sem þú þarft mig til að samþykkja eða
 *   staðfesta … eða setja tag á mig þá sé ég það"): merkið `samthykki` í thjonustubeidni.tags. Mál sem ber það og er á
 *   borði einhvers birtist á Mitt borð eigandans í ÖLLUM hömum (368aa: nú AÐEINS í hamnum Samþykkja), efst, með flögunni
 *   „Bíður samþykkis". Hamaflögurnar í völdu máli sýna áfram raunverulega hama-aðild (iHamGrunnur). Claude stofnar
 *   slík mál (created_by 'claude') með fullrannsökuðum spurningum. Laust mál (Master/bunki Charlize) fær enga sérmeðferð.
 *   SVAR (368v · Agnar 11.09.2026: „eitt mál á mig í hverjum lið. Tag eða álíka svo ég geti bara samþykkt hvert og eitt.
 *   Eða setja í vinnslu"): á slíku máli á eigin borði koma „✓ Samþykkja" / „▶ Í vinnslu" / „✕ Hafna" í stað Lokið/Skila.
 *   Svarið skrifar merkið svar:samthykkt|vinnsla|hafnad í stað samthykki, stöðuna tilbuid|i_vinnslu|lokad og línu aftast í
 *   lýsingu — lesið ferskt, skilyrt á updated_at, lesið til baka, „Afturkalla" í 7 s. Samþykkt mál og mál í vinnslu bíða
 *   Claude og halda sér efst á borðinu í öllum hömum („Samþykkt · bíður Claude"); Claude lokar þeim þegar verkinu lýkur.
 *   SKÝRING (368w · Agnar 12.09.2026: „bæta við einum viðbótar takka … að ég geti sett inn einhverja skýringu á málinu
 *   og látið þig síðan fara aftur yfir það og endurmeta"): „💬 Skýring" við hlið svartakkanna opnar ritil í Völdu máli.
 *   „Senda til Claude" skrifar svar:endurmeta (staða i_vinnslu) og skýringuna aftast í lýsingu — sömu skilyrtu skrif og
 *   hin svörin, lesið til baka, „Afturkalla" setur textann aftur í ritilinn. Claude les skýringuna, endurmetur tillöguna
 *   og setur samthykki aftur á málið, svo takkarnir birtast á ný. Óvistuð drög lifa í minni og localStorage þar til send.
 *
 * VINNUBLÖÐ — VINNUSVÆÐI (368y · Agnar 13.09.2026: „geturðu kanski fjölgað hömum, eða gert þetta eitthvað aðgengilegra.
 *   svo mikið þarna núna... líka með vinnublöð að sýna screenshotið sem er í attachments,, og gefa þeirri vinnu meiri pláss
 *   í kanski sér Ham" · „svo lítið vinnuplássið fyrir svona yfirferðarverkefni"): hamurinn vinnublod er board:false og
 *   teiknar vinnusvæði í fullri breidd í stað borðsins — engar einingar til hliðar og engin KPI-spjöld. Vinstra megin
 *   listi blaðanna (bíða efst, svöruð dauf neðst); hægra megin skannmyndin í fullri breidd (smellur opnar frumritið),
 *   spurningin, „Svona las ég blaðið" og „Kerfið segir" hlið við hlið, tillögðu línurnar á móti tækjatölu kerfisins og
 *   svartakkarnir (sömu og 368v/w) í límdri stiku neðst. Eftir svar opnast næsta blað sem bíður (ekki ef vistun mistókst).
 *   Gögn: málin bera merkin ham:vinnublod og sara:<id> → sara_yfirferd (blad, kerfi, spurning, linur, kerfi_linur,
 *   mynd_url/myndir); án sara-raðar er lýsingin lesin (SVONA LAS ÉG BLAÐIÐ / KERFIÐ SEGIR) og mynd málsins notuð.
 *   Mál með beint merki á vinnusvæðis-ham eiga heima ÞAR: iHam dregur þau ekki inn í aðra hami þótt þau bíði samþykkis
 *   (30 blöð fylltu annars Mitt borð í hverjum ham). Í öðrum hömum vísar ein lína á haminn: „N bíða yfirferðar".
 *   Fylgiskjöl sem eru myndir fá forsýn í Völdu máli (áður aðeins hlekkur); eldri Drive-viðhengi ekki (kalla á fall).
 *
 * LEIÐRÉTTA TÖLUR (368z · Agnar 13.09.2026: „geturðu sett inn vinnufeature þegar ég er að fara yfir vinnublöðin og þarf
 *   að breyta … duft, léttvatn, brunaslöngur, reykskynjara, co2 5kg og co2 2kg … í einni rönd og passi í mobile view og
 *   apps … síðan bara staðfesta og setja í vinnslu"): eigandi blaðs sem bíður fær H/Y-teljara (+ / tala / −) fyrir
 *   tegundirnar sex og akstur — í einni rönd á breiðum skjá, fjögur í röð á mjórri og þrjú í síma. Hver smellur breytir
 *   sara_yfirferd.linur (tillögunni) og vistast eftir 0,8 s, skilyrt á updated_at og stada='bidur' og lesið til baka.
 *   kerfi_linur fylgir linur sæti fyrir sæti (tafla C ber þær saman), svo línur bætast við og hverfa í báðum í einu.
 *   Ný lína fær verð fyrirtækis (company_pricing), annars verðskrárinnar (vorur), annars fast viðmið. Fyrsta hleðsla
 *   hækkar akstur í 2 (verd.md); akstur lækkar aldrei sjálfkrafa. Brunaslöngur og reykskynjarar fá aðeins Y-dálk
 *   (368z3 · Agnar: „H þarf ekki að vera þar"). Svartakkarnir heita „✓ Staðfesta" og „▶ Setja í vinnslu" í vinnusvæðinu og vista
 *   óvistaðar tölur fyrst — mistakist vistun er ekki svarað. Breytti önnur vél blaðinu á meðan eru nýjustu tölur sýndar.
 *   Röðun (368z2 · „geturðu sorted listann með hvað er nýjast tekið út efst"): innan „Bíða" og „Svarað" raðast blöðin
 *   eftir úttektardegi, nýjast efst — dagsetning blaðsins, annars dagur í blaðnúmeri („30.08-bunki"), annars mánuður.
 *
 * HAMIR ENDURSKIPULAGÐIR (368aa · Agnar 14.09.2026: „næææstum það sama á öllum borðum þegar ég er að skipta verkefnunum
 *   up" · „1/4 af borðinu breytist" · „Kanski hafa bara mitt borð og master í sér ham" · „endurskipulagt hamana svo það sé
 *   ekkert í sama hamnum" · „gert annann Ham á Agnar Sem heitir samþykkir … eitthvað sem er í raun tilbúið"): áður fór
 *   hver kveikt eining í hægri dálkinn í ÖLLUM hömum og samþykkismál á Mitt borð í öllum hömum — aðeins Master breyttist.
 *   Nú á hvert atriði einn stað (MODES):
 *     Samþykkja            vinnusvæði: mál á mínu borði sem bíða svars — „Tilbúið — bara samþykkja", „Þarf svar frá þér"
 *                          (merkið `spurning`) og „Svarað · bíður Claude". Listi vinstra megin, sama spjald og Valið mál
 *                          hægra megin með allri lýsingunni (tillagan og „ef já" standa í samantekt málsins).
 *     Master og mitt borð  Master · Mitt borð · Valið mál — engar einingar og engin samþykkismál. KPI og „Bara mitt borð" hér.
 *     Samskipti            Póstsvörun.
 *     Kröfur               Forgangslisti krafna · Kröfur · Gleymst að rukka? · Bakfærslur · Staðan í afgreiðslu.
 *     Vinnublöð            vinnusvæði, óbreytt.
 *     Skýrslur             Í vinnslu — er það búið? (vinnublöð aðeins samþykkt; blöð sem bíða eru í Vinnublöðum).
 *     Akstur og skipulag   Dagskrá · Aksturslistar · Brunakerfi · Skipulagsborð · Forgangur · Frestir · Ný mál · Starfsmenn.
 *   Einingahamur teiknar einingarnar í fullri breidd (1–3 dálkar); mál opnað úr einingu birtist hægra megin, aðeins í þeim
 *   ham. Einingarnar Vinnublöð (06) og Nýjast eru í engum ham — sama efni og Vinnublaða-hamurinn og Master. Hamahnappurinn
 *   sýnir það sem bíður (Samþykkja: tilbúið + spurningar; Samskipti: ósvaraðir póstar; Kröfur: útistandandi). ⚙ sýnir hvar
 *   hver eining býr. Sérsniðnir hamir (+ Hamur) haga sér eins og áður. Samantekt „DRAFT|{json}" úr eldri tillögum sýnir
 *   skýringuna, ekki JSON-ið.
 *
 * SKRIF — beint á thjonustubeidni, lesið til baka með .select():
 *   Taka    assigned_to = ég, AÐEINS ef málið er enn laust (skilyrt) — tveir fá ekki sama málið.
 *   Setja á assigned_to = hver sem er / Master, skilyrt á eigandann sem var á skjánum („Færa á mig").
 *   Skila   assigned_to = null (231 setur það aftur á Charlize ef það er eldra en 30 daga).
 *   Lokið   status = 'lokad'.     Svarað  svarad_at + status i_vinnslu, eins og 231 gerir.
 *   Breyta  title/notes/due_at/status/important · Eyða deleted_at (með afturköllun).
 *   Tillaga summary = ein lína frá /api/tv-summary (Haiku) með sögu fyrirtækis og pósti; „Afturkalla" setur fyrri aftur.
 *   Hamur   tags += ham:<id> (skilyrt á updated_at). Hver hamur sýnir borðið með sínum málum: beint merki, eða flokkur/merki
 *           hamsins, og Samskipti tekur líka pósta. Þjónusta = ekki beint tengt öðrum ham. Sérsniðnir hamir:
 *           AppSettings thjonustubord5.hamir (Agnar 11.09.2026: „tengt málefni við ham.. ekki allt bara við þjónustu").
 *   Nýtt    á mig (sjálfgefið), Master eða annan; fyrirtæki valið úr tillögum (Companies.list).
 *
 * FLÆÐI (Agnar 11.09.2026: „pirrandi að geta ekki skoðað neitt nema sín 5 mál" · „burt með allar svona
 *   asnalegar hömlur" · „vill geta ýtt á fyrirtækin og skoðað að vild" · „allir eiga að geta sett sitt
 *   nafn á sín verk"): engin mörk á fjölda mála; hvaða opið mál sem er opnast í „Valið mál" (Master,
 *   annarra, leit, einingar); síur Öll opin / borð starfsmanns / fyrirtæki / Líklega búin; „Bara mitt
 *   borð"; fyrirtækið alltaf smellanlegt (#company/<id>, Ctrl-smellur = nýr flipi); leit í haus.
 *
 * 19.09.2026: hamurinn „<nafn> · mitt vinnuborð" (MITT_HAM) er persónulegt borð án Master og mála — einingar per
 *   starfsmann í by_staff.<nafn>.mitt = { first, breidd }. Sérsniðinn hamur með `eigandi` sést aðeins hjá honum.
 *   Krassblaðið (eining 23, ræma, kassi á Skipulagsborði) var fjarlægt; gögnin í skipulagsbord…krass standa óhreyfð.
 *
 * LESIÐ OG VISTAÐ ANNARS STAÐAR (engin ný tafla):
 *   Vinnuborð hvers og eins  AppSettings thjonustubord5.by_staff.<nafn> = { mode, mods, links }
 *                            mode/mods sem smá-plástrar; links byggt á NÝJASTA lista við vistun
 *   Dagskrá                  vikudagskra.by_staff.<nafn>.jobs (303); skráð og breytt í glugga 303
 *   Skipulagsborð            skipulagsbord.by_staff.<nafn>.cards + .krass (sömu gögn og 305) — skrifað
 *                            beint hér: texti, litur, röð, mynd, eyða; drög lifa þar til þjónninn tekur við
 *   Saga fyrirtækis          fyrirtaeki_virkni (pg_cron 05:30 UTC + „↻ Uppfæra", sql/2026-09-11_fyrirtaeki_virkni.sql)
 *   Vinnublöð                sara_yfirferd.stada (364)
 *   Kröfur                   solur reikningur, ógreitt, ekki void (sama og listinn í 166); DRAFT í Payday telst EKKI sent
 *   Forgangslisti krafna     369 KrofuVinnugluggi (eining 22) — framvinda mála í krofu_verkferli. (368aa: eining í Kröfum.) FYLGDI MASTER
 *                            (Agnar 11.09.2026): efst í Master-dálkinum í Þjónustu og Kröfum (FORG_HAMIR); „Bara mitt
 *                            borð" felur hann með Master; víkur þegar Master er síaður á starfsmann/fyrirtæki.
 *   Póstur í völdu máli      email_digest eftir channel_ref 'email:<id>' (sama og 231; sýnin
 *                            v_samskipti_postur sleppir 8 af 18 opnum póstmálum)
 * ============================================================================================== */
(() => {
  if (window.__thjonustubord368) return;
  window.__thjonustubord368 = true;

  const VIEW_ID = 'view-bord', NAV_KEY = 'bord', CFG_KEY = 'thjonustubord5';
  const PAGE = 15, POLL_MS = 60000;     // engin mörk á fjölda mála á borði (Agnar 11.09.2026)
  const AI_WORKER = 'Charlize';                                        // sama nafn og í 231
  const SENTINELS = { '': 1, Allir: 1, allir: 1, nema_agnar: 1, nema_ai: 1 };
  const LAUS_SIA = 'assigned_to.is.null,assigned_to.in.("",Allir,allir,nema_agnar,nema_ai,' + AI_WORKER + ')';

  const sb = () => (window.DB && DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const VIKUDAGUR = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'];
  const DAG = ['SUN', 'MÁN', 'ÞRI', 'MIÐ', 'FIM', 'FÖS', 'LAU'];
  // Tegundir á dagskrá (303, eftir NAFNI) og á skipulagsborði (305, eftir SÆTI) eru ekki sami listinn,
  // svo hvor er lesinn eftir sinni heimild, með sínum litum.
  const VD_TEG = [['Árskoðun', '#1d4ed8'], ['Brunakerfiskoðun', '#c3271c'], ['Fund', '#7c3aed'], ['Uppsetning', '#d97706'], ['Annað', '#16a34a']];
  const SB_TEG = [['Árskoðun', '#c3271c'], ['Hleðsla', '#b8770e'], ['Uppsetning', '#2c6e9e'], ['Verkstæði', '#5b6470'], ['Annað', '#8a8f98']];
  const vdLitur = t => (VD_TEG.find(x => x[0] === t) || [0, '#8f8776'])[1];
  const MAL_TEG = { tilbod: 'Tilboð', email: 'Póstur', skyrsla: 'Skýrsla', heimsokn: 'Heimsókn', hringja: 'Hringja', samningur: 'Samningur', skjalabeidni: 'Skjöl', verkdagbok: 'Verkdagbók', annad: 'Annað', skodun_tilbod: 'Skoðun & tilboð', nyr_samningur: 'Nýr samningur', uttekt_eftirfylgni: 'Úttekt / eftirfylgni' };
  // Síður í kerfinu sem hægt er að festa með einum smelli. Gáttirnar eru sér síður á sama vef.
  const TILLOGUR = [
    ['Gátt-admin', '/gatt-admin/'], ['Þjónustugáttin', '/gatt/'],
    ['Kröfu yfirlit', '#krofu-yfirlit'], ['Pósthólf', '#thjonustuver-postar'], ['Reikninga-póstur', '#reikninga-postur'],
    ['Aksturslisti', '#aksturslisti']
  ];

  const MODS = {
    dagskra:   { n: '01', t: 'Dagskrá', d: 'Vikan í einni sýn. Plús skráir verk á daginn.' },
    skipulag:  { n: '05', t: 'Skipulagsborð', d: 'Spjöldin þín af skipulagsborðinu.' },
    vinnublod: { n: '06', t: 'Vinnublöð', d: 'Yfirferð vinnublaða: samþykkja, merkja klárað, sjá skýrslu og reikning.' },
    postsvor:  { n: '07', t: 'Póstsvörun', d: 'Póstmál sem bíða svars.' },
    akstur:    { n: '08', t: 'Aksturslistar', d: 'Listar 1–3 fyrir bílstjóra: færa á milli, prenta með samantekt, leið í korti.' },
    krofur:    { n: '09', t: 'Kröfur', d: 'Útistandandi kröfur: yfir gjalddaga, ósendar og fjárhæðir.' },
    // Forgangslisti og vinnugluggi krafna búa í 369 (KrofuVinnugluggi) — hér er aðeins einingin.
    krofumal:  { n: '22', t: 'Forgangslisti krafna', d: 'Allt sem þarf að gera til að ná inn peningum, stærsta upphæð fyrst. Smellur opnar vinnuglugga með þrepum.' },
    // Úr gamla borðinu (231) — kveikt og slökkt í ⚙ Mitt vinnuborð (Agnar 11.09.2026).
    frestir:   { n: '10', t: 'Frestir', d: 'Opin mál með frest — liðnir fyrst.' },
    nyjast:    { n: '11', t: 'Nýjast', d: 'Nýjustu opnu málin, sama hver á þau.' },
    saga:      { n: '12', t: 'Saga fyrirtækis', d: 'Síðustu reikningar, greiðslur og skýrslur í völdu máli.' },
    breyta:    { n: '13', t: 'Breyta máli', d: 'Titill, lýsing, frestur, staða og áríðandi í völdu máli.' },
    forgangur: { n: '14', t: 'Forgangur', d: 'Áríðandi, liðnir frestir og kúnnar sem reka á eftir okkur.' },
    nymal:     { n: '15', t: 'Ný mál — greining', d: 'Mál merkt ný: aldur, útköll og það sem vantar heimilisfang.' },
    brunakerfi: { n: '16', t: 'Brunakerfi — hvert þarf að fara', d: 'Kerfi sem eru komin á tíma, á leiðinni eða í vinnslu.' },
    starfsmenn: { n: '17', t: 'Starfsmenn', d: 'Staðan hjá hverjum og einum: mál, ný, frestir og verk.' },
    ivinnslu:  { n: '18', t: 'Í vinnslu — er það búið?', d: 'Það sem er merkt í vinnslu, borið saman við skýrslur og reikninga.' },
    gleymt:    { n: '19', t: 'Gleymst að rukka?', d: 'Úttekt án reiknings, greitt síðar sem bíður, kort og reiðufé ekki merkt greitt.' },
    bakfaersla: { n: '20', t: 'Bakfærslur og breytingar', d: 'Beiðnir um bakfærslu eða breyttan reikning — mál, póstar og kreditreikningar.' },
    afgreidsla: { n: '21', t: 'Staðan í afgreiðslu', d: 'Kassinn: sala dagsins og vikunnar, opin drög og ógreitt.' },
    // 19.09.2026 (Agnar: „Væri fínt að þetta bara í sér ham á þjónustuborðið"):
    // póstar sem biðja um reikninginn okkar, með kúnnanum fundnum og sendingu
    // á staðnum. Kallar í 240 fyrir sendinguna — hún er ekki afrituð.
    // 19.09.2026: áríðandi málin voru efst á Skipulagsborðinu — nú sér eining svo borðið sé bara spjöldin.
    aridandi:  { n: '25', t: 'Áríðandi', d: 'Mál merkt ★ áríðandi, með 🗓 til að setja þau á dagskrá.' },
    postbeidnir: { n: '24', t: 'Reikningsbeiðnir', d: 'Póstar sem biðja um reikning: hver bað, hvaða kúnni, og senda hann beint héðan.' }
  };
  const I_VOLDU = ['saga', 'breyta'];
  const STODUR = [['nytt', 'Nýtt'], ['i_vinnslu', 'Í vinnslu'], ['bedid', 'Bíður'], ['tilbuid', 'Tilbúið'], ['lokad', 'Lokað']];
  // 368aa (Agnar 14.09.2026): hvert atriði á EINN ham. board = Master · Mitt borð · Valið mál (aðeins thjonusta og
  // sérsniðnir hamir) · rymi = vinnusvæði í fullri breidd · annars einingahamur: einingarnar í `first` og ekkert annað.
  // Röð lyklanna er röð hnappanna. flokkar/merki/tegundir lifa fyrir hamaflögur sérsniðinna hama.
  const SAMT_HAM = 'samthykkja';
  const MITT_HAM = 'mitt';
  const MODES = {
    // 19.09.2026 (Agnar: „allt overcrowded hjá öllum því master borðið er inni allstaðar, enginn getur
    // skipulagt sitt dót. maður á að geta valið Agnar mitt vinnuborð sem er bara hálf tómt"): persónulegt
    // vinnuborð — einingahamur ÁN Master og mála, með einingum sem hver og einn velur sér. Einingarnar
    // lifa per starfsmann (by_staff.<nafn>.mitt), sjá M(). Málin eru í „Master og mitt borð".
    mitt:      { l: 'Mitt vinnuborð', board: false, mitt: true, first: [], filter: 'allt', flokkar: [], merki: [] },
    samthykkja: { l: 'Samþykkja', board: false, rymi: SAMT_HAM, first: [], filter: 'allt', flokkar: [], merki: [] },
    thjonusta: { l: 'Master og mitt borð', board: true, first: [], filter: 'allt', flokkar: [], merki: [] },
    samskipti: { l: 'Samskipti', board: false, first: ['postsvor'], filter: 'allt', flokkar: ['samskipti'], merki: ['senda_tolvupost', 'hringja'] },
    krofur:    { l: 'Kröfur', board: false, first: ['krofumal', 'krofur', 'gleymt', 'bakfaersla', 'afgreidsla'], filter: 'allt', flokkar: ['rukkun'], merki: ['eftir_ad_rukka', 'bokhald'] },
    // 368y: vinnusvæði — mál merkt ham:vinnublod, yfirferð eins blaðs í einu með skannmynd í fullri breidd.
    vinnublod: { l: 'Vinnublöð', board: false, rymi: 'vinnublod', first: [], filter: 'allt', flokkar: [], merki: [] },
    skyrslur:  { l: 'Skýrslur', board: false, first: ['ivinnslu'], filter: 'allt', flokkar: [], merki: ['senda_skyrslur'] },
    akstur:    { l: 'Akstur og skipulag', board: false, first: ['dagskra', 'akstur', 'brunakerfi', 'skipulag', 'aridandi', 'forgangur', 'frestir', 'nymal', 'starfsmenn'], filter: 'allt', flokkar: ['brunakerfi'], merki: ['uppsetning', 'brunakerfi', 'arskodun'], tegundir: ['heimsokn', 'skodun_tilbod'] }
  };
  // Einingar sem taka alla breidd einingahamsins (vika, tafla, langar línur).
  // 18.09.2026: skipulag bættist við — skrifflötur sem nýtist ekki í hálfri breidd
  // (spjöldin kremjast). BREIDAR er nú
  // aðeins SJÁLFGEFIÐ gildi: notandinn ræður breiddinni sjálfur í „Breyta ham".
  const BREIDAR = ['dagskra', 'krofumal', 'akstur', 'starfsmenn', 'skipulag', 'postbeidnir'];
  // Breidd einingar: 1 = þriðjungur · 2 = hálft · 3 = fullt. Sjá .modcell[data-sp].
  const sjalfgefinBreidd = k => (BREIDAR.indexOf(k) >= 0 ? 3 : 1);
  function breiddAf(mode, k) {
    const b = mode && mode.breidd && mode.breidd[k];
    return b === 1 || b === 2 || b === 3 ? b : sjalfgefinBreidd(k);
  }
  // Gömlu flokkarnir (thjonustubeidni.flokkur) og merkin (tags) úr 231 — sama orðaforði, svo hamir fyllast strax.
  const FLOKKAR = { thjonusta: 'Þjónusta', rukkun: 'Rukkun', tilbod: 'Tilboð', samskipti: 'Samskipti', brunakerfi: 'Brunakerfi' };
  const MERKI = { thjonusta: 'Þjónusta', eftir_ad_rukka: 'Eftir að rukka', bokhald: 'Bókhald', senda_skyrslur: 'Senda skýrslur', senda_tolvupost: 'Senda tölvupóst',
    thjonustusamningur: 'Þjónustusamningur', gera_tilbod: 'Gera tilboð', brunakerfi: 'Brunakerfi', hringja: 'Hringja', uppsetning: 'Uppsetning', draft: 'Draft', kvortun: 'Kvörtun' };
  const HAM_MERKI = 'ham:';
  const SAMTHYKKI = 'samthykki';       // bíður samþykkis/staðfestingar eigandans → á borði hans í öllum hömum (368u)
  const serHamir = () => { const l = P(CFG_KEY + '.hamir'); return Array.isArray(l) ? l.filter(h => h && h.id && h.l && !MODES[h.id]) : []; };
  // Einingar persónulega vinnuborðsins — sjálfgefið lítið: vikan og spjöldin manns.
  const MITT_SJALFGEFID = ['dagskra', 'skipulag'];
  function mittHamur() {
    const n = nu(), v = P(CFG_KEY + '.by_staff.' + n + '.mitt');
    const first = (v && Array.isArray(v.first) ? v.first : MITT_SJALFGEFID).filter(k => MODS[k]);
    return Object.assign({}, MODES.mitt, { l: n + ' · mitt vinnuborð', first,
      breidd: (v && v.breidd && typeof v.breidd === 'object') ? v.breidd : {} });
  }
  function M(id) {
    if (id === MITT_HAM) return mittHamur();
    if (MODES[id]) return MODES[id];
    const h = serHamir().find(x => x.id === id);
    // board vantar á hömum sem voru til fyrir 17.09.2026 -> true, so þeir haldast óbreyttir.
    // 18.09.2026: `breidd` kemur með. Hún datt áður á gólfið hér — útlitið vistaðist
    // en birtist aldrei, því lesturinn byggði haminn upp án hennar.
    return h ? { l: String(h.l), board: h.board !== false, filter: 'allt', ser: true, first: (Array.isArray(h.first) ? h.first : []).filter(k => MODS[k]),
      breidd: (h.breidd && typeof h.breidd === 'object') ? h.breidd : {}, eigandi: h.eigandi ? String(h.eigandi) : '',
      flokkar: Array.isArray(h.flokkar) ? h.flokkar : [], merki: Array.isArray(h.merki) ? h.merki : [] } : null;
  }
  // 19.09.2026: hamur með `eigandi` sést aðeins í hamaröð þess starfsmanns — hinir fá ekki röðina sína
  // fulla af hömum annarra. M(id) þekkir haminn áfram, svo mál tengd honum týnast ekki.
  const hamSest = h => !h.eigandi || lagt(h.eigandi) === lagt(nu());
  const hamaListi = () => Object.keys(MODES).concat(serHamir().filter(hamSest).map(h => h.id));
  // 368aa: talan á hamahnappnum er það sem bíður í hamnum — ekki fjöldi mála í flokki (sem var næstum sá sami alls staðar).
  function hamTala(k) {
    const h = M(k), n = nu();
    if (!h) return '';
    if (h.rymi === SAMT_HAM) return S.rows.filter(r => iHam(r, k) && erSamthykki(r)).length;
    if (h.rymi === 'vinnublod') return vbrListi(n).filter(vbrBidur).length;
    if (h.board) return S.rows.filter(r => iHam(r, k) && (isFree(r) || onBoardOf(r, n))).length;
    if (k === 'samskipti') return S.rows.filter(r => isPost(r) && !r.svarad_at).length;
    if (k === 'krofur') return S.counts.krofur == null ? '' : S.counts.krofur;
    return '';
  }
  // [kveikt, sjálfgefið opið] — flest samanbrotið. Forstillt eftir starfsmanni; hver og einn breytir í ⚙.
  const SJALFGEFID = { dagskra: [1, 0], skipulag: [0, 0], vinnublod: [0, 0], postsvor: [0, 0], akstur: [0, 0], krofur: [0, 0], krofumal: [0, 0], frestir: [1, 0], nyjast: [0, 0], saga: [1, 1], breyta: [1, 0], forgangur: [0, 0], nymal: [0, 0], brunakerfi: [0, 0], starfsmenn: [0, 0], ivinnslu: [0, 0], gleymt: [0, 0], bakfaersla: [0, 0], afgreidsla: [0, 0], aridandi: [0, 0] };
  const FYRIR = {
    'Agnar': { skipulag: [1, 1], vinnublod: [1, 0], krofur: [1, 0] },
    'Bjarndís': { vinnublod: [1, 1], postsvor: [1, 0] },
    'Afgreiðsla': { dagskra: [1, 1], akstur: [1, 0] }
  };

  const S = {
    rows: [], names: {}, loaded: false, loading: false, err: '', loadedAt: null,
    view: 'master', filter: 'allt', synd: PAGE, sel: {}, cfgOpen: false, open: {}, post: {},
    counts: { sara: null, krofur: null }, composer: false, busy: {}, linkForm: false, linkEdit: false,
    leit: { q: '', fyr: [], opid: false, idx: -1 }, ny: { q: '', fyr: null, tillogur: [], opid: false, idx: -1 },
    skDrog: {}, undo: null, virkni: {}, virkniBid: false, bmDrog: {}, bmOpid: {}, aiBid: {},
    // 18.09.2026: innsláttur beint á borðinu. ntDrog = texti sem er ekki kominn í
    // gagnagrunninn (lifir af teikningu OG af misheppnaðri vistun), ntStada = það sem
    // reiturinn segir notandanum, ntOpid = opinn reitur á hvítu spjaldi.
    ntDrog: {}, ntStada: {}, ntOpid: {},
    vbrBuin: false,    // 18.09.2026: sýna vinnublöð sem búið er að svara (sótt löt)
    hamDrag: null,     // 18.09.2026: eining sem verið er að draga til í útlitsritlinum
    dnDrog: {}, dnStada: {},   // 18.09.2026: frjáls texti á dag í Dagskránni
    samtSkyOpid: {}, samtSkyDrog: {},   // 368w: opinn skýringarritill á samþykkismáli + óvistuð drög
    falidBid: {},      // Fela-skrif sem bíða eða kláruðust nýlega: { lykill: { falid, row, tok, lokid } }
    skyrBid: {},       // Skýringar-skrif sem bíða eða kláruðust nýlega: { lykill: { skyring, af, at, rod, tok, lokid } }
    skyrOpid: null,    // opinn skýringarritill (einn í einu): { l, e, d, texti, upphaf, vistar, villa }
    // 368x (Agnar 13.09.2026): „Mitt borð" má fella saman — 75 mála listinn fyllti skjáinn. Útlitsval vafrans, ekki staða gagna.
    mittSamanbrotid: (() => { try { return localStorage.getItem('t5_mitt_samanbrotid') === '1'; } catch (_) { return false; } })(),
    synaHluta: {}      // „Sýna" falin atriði / Stólpa-hlutann — val á skjánum, ekki staða gagna
  };

  /* ── starfsmaður ── */
  const nu = () => { try { return (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const folk = () => {
    let l = [];
    try { l = (window.BordStarfsmadur && BordStarfsmadur.list()) || []; } catch (_) {}
    if (!l.length) l = ['Agnar', 'Bjarndís', 'Binni', 'Anni', 'Hákon', 'Afgreiðsla', 'Charlize', 'Allir'];
    return l.filter((x, i) => x && l.indexOf(x) === i);
  };
  const canonW = v => { const s = String(v == null ? '' : v).trim(); return s === 'Sara' ? 'Bjarndís' : s; };
  const normW = v => { const s = canonW(v); return SENTINELS[s] ? '' : s; };
  const lagt = s => String(s || '').toLocaleLowerCase('is');
  const isFree = r => { const w = normW(r.assigned_to); return !w || w === AI_WORKER; };
  // Sýndarborðin: „Charlize" = bunkinn, „Allir" = sameiginleg verk. Önnur nöfn eins og áður.
  const onBoardOf = (r, n) => {
    const skr = lagt(canonW(r.assigned_to)), nn = lagt(n);
    if (nn === 'allir' || nn === lagt(AI_WORKER)) return !!skr && skr === nn;
    const w = normW(r.assigned_to);
    return !!w && w !== AI_WORKER && lagt(w) === nn;
  };

  /* ── stillingar: vinnuborð hvers og eins (samstillt milli véla) ── */
  const P = k => { try { return (window.AppSettings && AppSettings.path) ? AppSettings.path(k) : null; } catch (_) { return null; } };
  const stillingarTilbunar = () => !!(window.AppSettings && AppSettings.path && AppSettings.save && (!AppSettings.isLoaded || AppSettings.isLoaded()));
  const _cfg = {};
  let _vistar = 0;
  function readCfg(n) {
    const v = P(CFG_KEY + '.by_staff.' + n);
    const base = Object.assign({}, SJALFGEFID, FYRIR[n] || {});
    const mods = {};
    Object.keys(SJALFGEFID).forEach(k => {
      const x = v && v.mods && Array.isArray(v.mods[k]) ? v.mods[k] : base[k];
      mods[k] = [x[0] ? 1 : 0, x[1] ? 1 : 0];
    });
    return { mode: v && M(v.mode) ? v.mode : 'thjonusta', mods, baraMitt: !!(v && v.bara_mitt) };
  }
  function cfg() {
    const n = nu();
    if (_cfg[n]) return _cfg[n];
    const c = readCfg(n);
    if (stillingarTilbunar()) _cfg[n] = c;        // sjálfgefin gildi festast ekki á meðan stillingar hlaðast
    return c;
  }
  // Smá-plástur (bara það sem breyttist) — deepMerge í 85 sameinar hlutina, svo ein breyting
  // étur aldrei aðra sem var vistuð á annarri vél.
  async function vistaCfg(hluti, skilabod) {
    const n = nu();
    _vistar++;
    let ok = false;
    try { ok = !!(await AppSettings.save({ [CFG_KEY]: { by_staff: { [n]: hluti } } })); } catch (_) {}
    _vistar--;
    if (!ok) { delete _cfg[n]; toast('Stillingin vistaðist ekki. Reyndu aftur.', true); render(); }
    else if (skilabod) toast(skilabod);
  }
  const isOn = k => !!cfg().mods[k][0];
  const inMode = k => (M(cfg().mode) || MODES.thjonusta).first.indexOf(k) >= 0;
  // Forgangslisti krafna (krofumal) fylgir Master-borðinu (Agnar 11.09.2026) — opið/lokað er haldið sér
  // eftir ham: sjálfgefið opið í Kröfur-ham, samanbrotið annars staðar.
  const openKey = k => nu() + ':' + (inMode(k) || k === 'krofumal' ? cfg().mode + ':' : '') + k;
  function isOpen(k) {
    const key = openKey(k);
    if (!(key in S.open)) S.open[key] = inMode(k) ? true : k === 'krofumal' ? cfg().mode === 'krofur' : !!cfg().mods[k][1];
    return S.open[key];
  }

  /* ── flýtileiðir: festir tenglar hvers og eins, eins og bókamerkjastika ── */
  const linksFor = n => { const l = P(CFG_KEY + '.by_staff.' + n + '.links'); return Array.isArray(l) ? l.filter(x => x && x.id && x.nafn && x.slod) : []; };
  // Aðeins síður í appinu (#…), síður á sama vef (/…) og http(s). „keldan.is" fær https:// framan við.
  function lagaSlod(s) {
    s = String(s || '').trim();
    if (/^#[a-z0-9-]+$/i.test(s)) return s;
    if (/^\/(?!\/)\S*$/.test(s)) return s;
    if (/^https?:\/\/\S+$/i.test(s)) return s;
    if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(s)) return 'https://' + s;
    return '';
  }
  // Listinn er fylki og fylki eru skrifuð heil — því er breytingin reiknuð á NÝJASTA lista
  // stillinganna við vistun, ekki á það sem var teiknað (sama lærdómur og í 303).
  async function vistaLinks(breyta, skilabod) {
    if (!stillingarTilbunar()) { toast('Stillingarnar eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return false; }
    const n = nu();
    const nyr = breyta(linksFor(n).slice());
    _vistar++;
    let ok = false;
    try { ok = !!(await AppSettings.save({ [CFG_KEY]: { by_staff: { [n]: { links: nyr } } } })); } catch (_) {}
    _vistar--;
    if (!ok) toast('Flýtileiðin vistaðist ekki. Reyndu aftur.', true);
    else if (skilabod) toast(skilabod);
    render();
    return ok;
  }

  /* ── gögn ── */
  const SEL = 'id,title,notes,summary,status,type,important,due_at,created_at,updated_at,source,channel_ref,assigned_to,customer_base_id,fyrirtaeki_id,customer_nafn,svarad_at,tags,flokkur,attachment_url';
  let _sig = '', _aftur = false, _dbBid = 0, _dbT = 0;
  // Könnunin á 60 s fresti teiknar AÐEINS ef eitthvað breyttist — annars myndi hún rugla skrun
  // í pósti sem verið er að lesa. Sóttímanum er skipt út beint.
  async function load(hljott) {
    const c = sb();
    if (!c) {
      // DB.sb verður til eftir á við ræsingu (mælt: „Engin tenging" stóð á skjánum þar til næsta
      // könnun). Beðið í allt að 15 s áður en villa er sýnd.
      if (++_dbBid <= 50) {
        if (_dbBid === 1 && !hljott) render();
        clearTimeout(_dbT);
        _dbT = setTimeout(() => load(hljott), 300);
        return;
      }
      _dbBid = 0;
      S.err = 'Engin tenging við gagnagrunn';
      render();
      return;
    }
    _dbBid = 0;
    if (S.loading) { _aftur = true; return; }
    S.loading = true;
    if (!hljott) render();
    let breytt = !hljott;
    try {
      const [r, rs, rk] = await Promise.all([
        c.from('thjonustubeidni').select(SEL).is('deleted_at', null).is('archived_at', null)
          .or('status.is.null,status.neq.lokad').order('created_at', { ascending: false }).limit(800),
        c.from('sara_yfirferd').select('stada'),
        c.from('solur').select('id', { count: 'exact', head: true }).eq('greitt_med', 'reikningur').is('paid_at', null).neq('status', 'void')
      ]);
      if (r.error) throw r.error;
      const rows = r.data || [];
      const sara = rs.error ? null : (rs.data || []).reduce((m, x) => { m[x.stada] = (m[x.stada] || 0) + 1; return m; }, {});
      const krofur = rk.error ? null : rk.count;
      const ids = [...new Set(rows.filter(x => !x.customer_nafn && x.customer_base_id).map(x => x.customer_base_id))].filter(id => !(id in S.names));
      for (let i = 0; i < ids.length; i += 150) {
        const rb = await c.from('customers_base').select('id,nafn').in('id', ids.slice(i, i + 150));
        (rb.data || []).forEach(b => { S.names[b.id] = b.nafn; });
        breytt = true;
      }
      // Saga fyrirtækja (fyrirtaeki_virkni) — aðeins fyrir viðskiptavini sem hafa ekki verið sóttir; morgunkeyrslan
      // og „↻ Uppfæra" sjá um að gögnin séu ný.
      const cbs = [...new Set(rows.map(x => x.customer_base_id).filter(Boolean))].filter(id => !(id in S.virkni));
      for (let i = 0; i < cbs.length; i += 150) {
        const hluti = cbs.slice(i, i + 150);
        const rv = await c.from('fyrirtaeki_virkni').select('customer_base_id,fyrirtaeki_id,sidasta_sala,sidasti_reikningur,sidasta_skyrsla,reiknad_at').in('customer_base_id', hluti);
        if (rv.error) break;
        hluti.forEach(id => { S.virkni[id] = null; });
        (rv.data || []).forEach(x => { S.virkni[x.customer_base_id] = x; });
        breytt = true;
      }
      const sig = JSON.stringify([rows.map(x => [x.id, x.assigned_to, x.status, x.updated_at, x.svarad_at, x.important, x.title, x.summary, JSON.stringify(x.tags || []), x.flokkur]), sara, krofur]);
      if (sig !== _sig || S.err || !S.loaded) breytt = true;
      _sig = sig;
      S.rows = rows;
      S.counts.sara = sara;
      S.counts.krofur = krofur;
      S.err = '';
      S.loaded = true;
      saekjaBunka(rows);
    } catch (e) {
      const msg = (e && e.message) || String(e);
      if (S.err !== msg) breytt = true;
      S.err = msg;
      console.warn('[368-thjonustubord5] load', e);
    }
    S.loadedAt = new Date();
    S.loading = false;
    if (breytt) render(); else stimpla();
    if (_aftur) { _aftur = false; load(true); }
  }
  // Óúthlutuð mál eldri en 30 daga fara í bunka Charlize — áður gert af 231 (claimOldJobs). Aðeins null/tómt (ekki
  // „Allir", sem er nú sameiginlegt borð), skilyrt svo úthlutun annarrar vélar étist ekki, og á 10 mín. fresti í vafra.
  let _bunkiVid = 0;
  async function saekjaBunka(rows) {
    const c = sb();
    if (!c || Date.now() - _bunkiVid < 600000) return;
    _bunkiVid = Date.now();
    const skil = Date.now() - 30 * 864e5;
    const ids = rows.filter(r => !canonW(r.assigned_to) && tStamp(r.created_at) && tStamp(r.created_at) < skil).map(r => r.id);
    if (!ids.length) return;
    let alls = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const r = await c.from('thjonustubeidni').update({ assigned_to: AI_WORKER, updated_at: new Date().toISOString() })
        .in('id', ids.slice(i, i + 100)).or('assigned_to.is.null,assigned_to.eq.').select('id');
      if (r.error) { console.warn('[368] bunki Charlize', r.error.message); break; }
      alls += (r.data || []).length;
    }
    if (alls) load(true);
  }
  function stimpla() {
    const v = document.getElementById(VIEW_ID);
    const el = v && v.shadowRoot && v.shadowRoot.querySelector('.t5-sott');
    if (el && S.loadedAt) el.textContent = ' · sótt kl. ' + klukka(S.loadedAt);
  }

  const tStamp = s => { const t = Date.parse(s); return isNaN(t) ? 0 : t; };
  const isPost = r => r.source === 'email' || /^email:/.test(String(r.channel_ref || ''));
  const postId = r => { const m = /^email:(\d+)/.exec(String(r.channel_ref || '')); return m ? +m[1] : null; };
  const postOf = r => { const id = postId(r); return id == null ? false : S.post[id]; };
  const erSamthykki = r => Array.isArray(r.tags) && r.tags.indexOf(SAMTHYKKI) >= 0;
  // Svar við slíku máli (368v): merkið svar:<svar> + staða. Samþykkt og í vinnslu bíða Claude og halda sér á borðinu.
  const SVOR = {
    samthykkt: { status: 'tilbuid', l: 'Samþykkt', merki: 'Samþykkt · bíður Claude' },
    vinnsla: { status: 'i_vinnslu', l: 'Sett í vinnslu', merki: 'Í vinnslu hjá Claude' },
    hafnad: { status: 'lokad', l: 'Hafnað', merki: 'Hafnað' },
    // 368w: skýring til endurmats — bíður Claude eins og samþykkt mál og mál í vinnslu.
    endurmeta: { status: 'i_vinnslu', l: 'Skýring send til Claude', merki: 'Skýring · Claude endurmetur' }
  };
  const svarMals = r => { const t = (Array.isArray(r.tags) ? r.tags : []).find(x => typeof x === 'string' && x.indexOf('svar:') === 0); return t && SVOR[t.slice(5)] ? t.slice(5) : null; };
  const svarBidur = r => { const s = svarMals(r); return (s === 'samthykkt' || s === 'vinnsla' || s === 'endurmeta') && r.status !== 'lokad'; };
  const samtMerki = r => erSamthykki(r) ? '<span class="tag samt">Bíður samþykkis</span>'
    : svarBidur(r) ? '<span class="tag ok">' + SVOR[svarMals(r)].merki + '</span>' : '';
  const samtRod = r => (erSamthykki(r) ? 2 : svarBidur(r) ? 1 : 0);
  /* 18.09.2026 — UPPHÆÐIN ER Í TEXTANUM, EKKI Í DÁLKI.
   * Mælt: af 77 málum sem biðu samþykkis báru 43 upphæð í titlinum, en röðunin
   * leit aldrei á hana. Efst stóð sameiningarspurning án upphæðar meðan stærsta
   * málið (Eclipse ehf., 1.226.121 kr) lá langt niðri.
   *
   * Hér er STÆRSTA talan sem stendur á undan „kr" lesin úr titli og samantekt.
   * Hún er ÁÆTLUN úr texta — hún er sýnd á röðinni svo röðin sé læsileg, en hún
   * er aldrei lögð saman við neitt og aldrei notuð sem staðreynd um fjárhæð.
   */
  const UPPH_RE = /(\d{1,3}(?:[.\s]\d{3})+|\d{4,})\s*kr/gi;
  function upphaedMals(r) {
    const t = String(r.title || '') + ' ' + String(r.summary || '');
    // Geymt á röðinni: `rodun` kallar á þetta O(n log n) sinnum í hverri teikningu,
    // og svarið breytist ekki nema textinn geri það.
    if (r.__upphStimpill === r.updated_at && r.__upphTexti === t) return r.__upph;
    let mest = 0, m;
    UPPH_RE.lastIndex = 0;
    while ((m = UPPH_RE.exec(t))) { const v = +String(m[1]).replace(/[.\s]/g, ''); if (v > mest) mest = v; }
    try {
      Object.defineProperty(r, '__upph', { value: mest, writable: true, configurable: true, enumerable: false });
      Object.defineProperty(r, '__upphStimpill', { value: r.updated_at, writable: true, configurable: true, enumerable: false });
      Object.defineProperty(r, '__upphTexti', { value: t, writable: true, configurable: true, enumerable: false });
    } catch (_) {}
    return mest;
  }
  // 18.09.2026: upphæðin kom inn á eftir áríðandi-hakinu (Agnar: „mikilvægustu
  // eða auðveldustu fyrst"). Hakið er hans dómur og gengur fyrir; upphæðin er
  // næsta besta mæling á því hvað skiptir máli.
  //
  // 19.09.2026 — NÝJAST FYRST AFTUR, OG ELST FYRST AÐEINS Í SAMÞYKKJA.
  // Sama dag sneri ég síðasta þrepinu hér í „elst fyrst" fyrir Samþykktir.
  // `rodun` stýrir hins vegar NÍU listum (Master, Mitt borð, allar síur,
  // Póstsvörun, Áríðandi á tveimur stöðum), svo ein lína sneri þeim öllum.
  // Agnar: „Djö er þjónustuborðið í rugli" — 57 daga gamall póstur stóð efst í
  // Póstsvörun meðan 461 opinn póstur er til og sá nýjasti frá í gær.
  //
  // Ekki er hægt að hnýta aukaþrepi aftan við `rodun`: hún skilar aldrei 0 þegar
  // dagsetningar eru ólíkar, svo slíkt þrep keyrði aldrei. Sameiginlegi hlutinn
  // er því hér, og listarnir enda hann hvor á sinn veg.
  // 19.09.2026, seinni leiðrétting: UPPHÆÐIN Á LÍKA BARA HEIMA Í SAMÞYKKTUM.
  // Hún var sett í sameiginlega grunninn og raðaði þá öllum listum eftir tölu sem
  // NEFND ER Í TEXTANUM. Í Póstsvörun lenti 53 daga gamall póstur efst af því hann
  // nefnir „krónur 27110" — aldurinn og röðin sögðu þá ekkert. Upphæðin er mæling
  // á því hvað er í húfi ÞEGAR VERIÐ ER AÐ SAMÞYKKJA; hún er ekki almenn röðun.
  const rodunGrunnur = (a, b) => samtRod(b) - samtRod(a)
    || (b.important ? 1 : 0) - (a.important ? 1 : 0)
    || (a.due_at ? tStamp(a.due_at) : Infinity) - (b.due_at ? tStamp(b.due_at) : Infinity);
  // Allir listar nema Samþykkja: nýjast fyrst, eins og verið hefur.
  const rodun = (a, b) => rodunGrunnur(a, b) || tStamp(b.created_at) - tStamp(a.created_at);
  // Samþykkja: áríðandi, svo UPPHÆÐ, svo frestur — og elst fremst meðal jafningja,
  // því þetta er biðröð sem á að tæmast.
  const rodunSamt = (a, b) => samtRod(b) - samtRod(a)
    || (b.important ? 1 : 0) - (a.important ? 1 : 0)
    || upphaedMals(b) - upphaedMals(a)
    || (a.due_at ? tStamp(a.due_at) : Infinity) - (b.due_at ? tStamp(b.due_at) : Infinity)
    || tStamp(a.created_at) - tStamp(b.created_at);
  const tagList = r => (Array.isArray(r.tags) ? r.tags : []).filter(t => typeof t === 'string');
  const skyrirHamir = r => tagList(r).filter(t => t.indexOf(HAM_MERKI) === 0).map(t => t.slice(HAM_MERKI.length)).filter(id => !!M(id));
  // 368aa: hvert mál á einn stað. Merki á vinnusvæðis-ham (ham:vinnublod, 368y) ræður fyrst; bíði málið svars á borði þess
  // sem er við vélina er það í Samþykkja; annars í Master og mitt borð (eða sérsniðnum ham sem það er tengt). Einingahamir
  // sýna engin mál. Hamaflögur sérsniðinna hama nota grunnregluna.
  const rymisHamir = r => skyrirHamir(r).filter(h => !!(M(h) || {}).rymi);
  const bidurSvars = r => erSamthykki(r) || svarBidur(r);
  function iHam(r, id) {
    const h = M(id);
    if (!h) return false;
    const rh = rymisHamir(r);
    if (rh.length) return rh.indexOf(id) >= 0;
    if (h.rymi === SAMT_HAM) return bidurSvars(r) && onBoardOf(r, nu());
    // Vinnusvæði tekur AÐEINS sín merktu mál (mælt 13.09.: 103 í stað 30); einingahamur engin.
    if (h.rymi || !h.board) return false;
    if (bidurSvars(r) && onBoardOf(r, nu())) return false;
    return id === 'thjonusta' || iHamGrunnur(r, id);
  }
  function iHamGrunnur(r, id) {
    const sk = skyrirHamir(r);
    if (sk.indexOf(id) >= 0) return true;
    if (id === 'thjonusta') return !sk.length;
    const h = M(id);
    if (!h) return false;
    if (id === 'samskipti' && isPost(r)) return true;
    if (r.type && (h.tegundir || []).indexOf(r.type) >= 0) return true;
    if (r.flokkur && h.flokkar.indexOf(r.flokkur) >= 0) return true;
    const tags = tagList(r);
    return h.merki.some(t => tags.indexOf(t) >= 0);
  }
  const hamRows = () => { const m = cfg().mode; return S.rows.filter(r => iHam(r, m)); };
  const masterRows = () => hamRows().filter(r => isFree(r) && !onBoardOf(r, nu())).sort(rodun);
  const mineRows = () => hamRows().filter(r => onBoardOf(r, nu())).sort(rodun);
  const ageDays = r => { const t = tStamp(r.created_at); return t ? Math.max(0, Math.floor((Date.now() - t) / 864e5)) : 0; };
  const ageCls = a => (a >= 14 ? 'hot' : a <= 2 ? 'warm' : '');
  const whereOf = r => r.customer_nafn || S.names[r.customer_base_id] || '';
  const tegMals = r => isPost(r) ? 'Póstur' : (MAL_TEG[r.type] || (r.type && String(r.type).length < 24 ? String(r.type) : 'Beiðni'));
  // Eldri tillögur (231) bera „DRAFT|{json}" í samantekt — sýna skýringuna, aldrei JSON-ið (Agnar 14.09.2026: „þetta líka
  // algjörlega ruglingslegt").
  function samantekt(r) {
    const s = String(r.summary || '').trim();
    if (s.indexOf('DRAFT|') !== 0) return s;
    try { const d = JSON.parse(s.slice(6)); return String((d && (d.villa || d.reply)) || '').trim(); } catch (_) { return ''; }
  }
  // 18.09.2026 (Agnar: „show 3-4 lines of text not only the fyrst line").
  // Hér stóð `.find(Boolean)` sem tók FYRSTU ólínuna og henti afganginum: mál sem
  // byrjar á „Sæl(l)," sýndi bara kveðjuna. `linur` tekur nú fjórar fyrstu línurnar
  // sem eitthvað stendur í og CSS klippir við fjórar svo kortin haldi hæð.
  function linur(texti, n) {
    return String(texti || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, n || 4).join('\n');
  }
  function aiLine(r) {
    return linur(samantekt(r) || r.notes || '', 4).slice(0, 600);
  }
  // Síur: allt/post/beidni/hot velja úr Master · 'oll' = öll opin mál · 'p:<nafn>' = borð eins
  // starfsmanns · 'f:<id>' = opin mál eins fyrirtækis.
  const serSia = f => f === 'oll' || /^[pf]:/.test(f);
  const matchFilter = (r, f) => f === 'allt' || serSia(f) || (f === 'buid' ? !!virkniEftir(r) : f === 'hot' ? !!r.important : f === 'post' ? isPost(r) : !isPost(r));
  function feedRows(master) {
    const f = S.filter;
    if (f === 'oll') return S.rows.slice().sort(rodun);
    if (/^p:/.test(f)) return S.rows.filter(r => onBoardOf(r, f.slice(2))).sort(rodun);
    if (/^f:/.test(f)) return S.rows.filter(r => String(r.fyrirtaeki_id) === f.slice(2)).sort(rodun);
    return master.filter(r => matchFilter(r, f));
  }

  /* ── skrif (lesið til baka) ── */
  // sia: true = aðeins ef málið er enn laust · { adur } = aðeins ef eigandinn er enn sá sem var á skjánum.
  async function patchRow(id, patch, sia) {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    let q = c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id);
    if (sia === true) q = q.or(LAUS_SIA);
    else if (sia && 'adur' in sia) q = sia.adur == null ? q.is('assigned_to', null) : q.eq('assigned_to', sia.adur);
    // 18.09.2026: `notes` bættist við svo innsláttarreiturinn geti lesið til baka
    // textann sem lenti í gagnagrunninum í stað þess að fullyrða að hann hafi lent þar.
    const r = await q.select('id,assigned_to,status,svarad_at,notes');
    if (r.error) throw r.error;
    return r.data || [];
  }
  async function act(id, fn) {
    if (S.busy[id]) return;
    S.busy[id] = 1;
    render();
    try { await fn(); } catch (e) { toast('Vistaðist ekki: ' + ((e && e.message) || e), true); }
    delete S.busy[id];
    render();
    await load(true);
  }
  // Engin mörk á fjölda mála (Agnar 11.09.2026: „burt með allar svona asnalegar hömlur").
  function take(id) {
    const n = nu();
    if (folk().indexOf(n) < 0) { toast('Veldu þitt nafn í „Ég er“ fyrst.', true); return; }
    const r = S.rows.find(x => x.id === id);
    if (r && !isFree(r)) return setjaA(id, n);
    return act(id, async () => {
      const rows = await patchRow(id, { assigned_to: n }, true);
      if (!rows.length) { toast('Einhver annar tók þetta mál rétt í þessu.', true); return; }
      if (lagt(canonW(rows[0].assigned_to)) !== lagt(n)) throw new Error('las til baka „' + rows[0].assigned_to + '“');
      S.sel[n] = id;
      if (!cfg().baraMitt) S.view = 'mitt';
      toast('Komið á borðið þitt');
    });
  }
  // Setja mál á hvern sem er — mig, annan starfsmann eða Master (tómt). Skilyrt á eigandann sem var
  // á skjánum, svo breyting á annarri vél á sama augnabliki étist ekki þegjandi.
  function setjaA(id, hver) {
    const r = S.rows.find(x => x.id === id);
    if (!r) return;
    const n = nu(), nyr = canonW(hver) || null;
    if ((canonW(r.assigned_to) || null) === nyr) return;
    return act(id, async () => {
      const rows = await patchRow(id, { assigned_to: nyr }, { adur: r.assigned_to == null ? null : r.assigned_to });
      if (!rows.length) { toast('Málið hafði breyst á annarri vél — sýni nýjustu stöðu.', true); return; }
      if ((canonW(rows[0].assigned_to) || null) !== nyr) throw new Error('las til baka „' + rows[0].assigned_to + '“');
      S.sel[n] = id;
      toast(!nyr ? 'Sett á Master' : lagt(nyr) === lagt(n) ? 'Komið á borðið þitt' : 'Sett á borð ' + nyr);
    });
  }
  const giveBack = id => act(id, async () => {
    const rows = await patchRow(id, { assigned_to: null });
    if (!rows.length || rows[0].assigned_to) throw new Error('málið fannst ekki');
    toast('Skilað á Master');
  });
  const done = id => act(id, async () => {
    const fyrri = (S.rows.find(x => x.id === id) || {}).status || 'nytt';
    const rows = await patchRow(id, { status: 'lokad' });
    if (!rows.length || rows[0].status !== 'lokad') throw new Error('málið fannst ekki');
    toast('Merkt lokið', false, () => act(id, async () => { await patchRow(id, { status: fyrri }); toast('Málið er opið aftur'); }));
  });
  // Svar við máli sem bíður samþykkis (368v). Lesið ferskt, skrifað skilyrt á updated_at (sama og hama-tenging) og lesið
  // til baka; „Afturkalla" skrifar fyrri merki, stöðu og lýsingu aftur, skilyrt á svarið.
  function svaraSamthykki(id, svar, skyring) {
    const s = SVOR[svar], c = sb();
    if (!s || !id) return;
    if (!c) { toast('Engin tenging við gagnagrunn', true); return; }
    const n = nu();
    return act(id, async () => {
      const cur = await c.from('thjonustubeidni').select('id,title,tags,status,notes,updated_at').eq('id', id).limit(1);
      if (cur.error) throw cur.error;
      const r = (cur.data || [])[0];
      if (!r) throw new Error('málið fannst ekki');
      if (!erSamthykki(r)) { toast('Málinu hefur þegar verið svarað — sýni nýjustu stöðu.', true); return; }
      const nuna = new Date();
      const tags = r.tags.filter(t => t !== SAMTHYKKI && !(typeof t === 'string' && t.indexOf('svar:') === 0)).concat(['svar:' + svar]);
      const stimpill = n + ' · ' + String(nuna.getDate()).padStart(2, '0') + '/' + String(nuna.getMonth() + 1).padStart(2, '0') + ' kl. ' + klukka(nuna);
      const lina = skyring ? '— Skýring til endurmats: ' + stimpill + '\n' + skyring : '— ' + s.l + ': ' + stimpill;
      const notes = (r.notes ? String(r.notes).replace(/\s+$/, '') + '\n\n' : '') + lina;
      let q = c.from('thjonustubeidni').update({ tags, status: s.status, notes, updated_at: nuna.toISOString() }).eq('id', id);
      q = r.updated_at ? q.eq('updated_at', r.updated_at) : q.is('updated_at', null);
      const u = await q.select('id,tags,status,updated_at');
      if (u.error) throw u.error;
      const row = (u.data || [])[0];
      if (!row) { toast('Málið breyttist á annarri vél rétt í þessu — sýni nýjustu stöðu.', true); return; }
      if (row.status !== s.status || !(row.tags || []).includes('svar:' + svar)) throw new Error('las til baka „' + row.status + '“');
      const adur = { tags: r.tags, status: r.status, notes: r.notes };
      if (skyring) { delete S.samtSkyDrog[id]; S.samtSkyOpid[id] = false; skyDrogVista(id, null); }
      toast(s.l + ' — ' + (r.title || 'málið'), false, () => act(id, async () => {
        const b = await c.from('thjonustubeidni').update(Object.assign({}, adur, { updated_at: new Date().toISOString() }))
          .eq('id', id).eq('updated_at', row.updated_at).select('id,tags');
        if (b.error) throw b.error;
        if (!(b.data || []).length) { toast('Málið breyttist á annarri vél — svarið var ekki afturkallað.', true); return; }
        toast('Svarið afturkallað');
        if (skyring) { S.samtSkyDrog[id] = skyring; S.samtSkyOpid[id] = true; skyDrogVista(id, skyring); render(); }
      }));
    });
  }
  async function createCase(o) {
    const c = sb();
    if (!c) { toast('Engin tenging við gagnagrunn', true); return false; }
    let nafn = o.cust || null, baseId = null, fid = null;
    try {
      const q = o.fyr && o.fyr.id
        ? c.from('fyrirtaeki').select('id,nafn,customer_base_id').eq('id', o.fyr.id).limit(1)
        : nafn ? c.from('fyrirtaeki').select('id,nafn,customer_base_id').ilike('nafn', nafn.replace(/[%_\\]/g, x => '\\' + x)).is('deleted_at', null).limit(2) : null;
      const rf = q ? await q : null;
      if (rf && rf.data && rf.data.length === 1) { nafn = rf.data[0].nafn; baseId = rf.data[0].customer_base_id || null; fid = rf.data[0].id; }
    } catch (_) {}
    const n = nu(), eigandi = canonW(o.eigandi) || null, nuna = new Date().toISOString();
    const obj = {
      title: o.title, notes: o.lysing || '', type: 'annad', status: 'nytt', priority: 'venjulegur',
      customer_nafn: nafn, customer_base_id: baseId, fyrirtaeki_id: fid, assigned_to: eigandi, tags: o.ham && M(o.ham) && M(o.ham).ser ? [HAM_MERKI + o.ham] : [],
      source: 'beint', important: !!o.aridandi, due_at: /^\d{4}-\d{2}-\d{2}$/.test(o.frestur || '') ? new Date(o.frestur + 'T12:00:00').toISOString() : null,
      created_at: nuna, created_by: n, updated_at: nuna
    };
    const r = await c.from('thjonustubeidni').insert(obj).select('id').single();
    if (r.error || !r.data) { toast('Málið vistaðist ekki: ' + ((r.error && r.error.message) || 'ekkert svar'), true); return false; }
    S.sel[n] = r.data.id;
    toast((!eigandi ? 'Komið á Master borð' : lagt(eigandi) === lagt(n) ? 'Komið á borðið þitt' : 'Komið á borð ' + eigandi) + (fid ? ' · tengt ' + nafn : '') + (o.ham && M(o.ham) && M(o.ham).ser ? ' · ' + M(o.ham).l : ''));
    await load(true);
    return true;
  }

  /* ── póstur í völdu máli ── */
  async function loadPost(r) {
    const id = postId(r);
    if (id == null || (id in S.post)) return;
    S.post[id] = null;
    try {
      const res = await sb().from('email_digest').select('id,message_id,account,sender_name,sender_email,subject,snippet,body_preview,received_at').eq('id', id).maybeSingle();
      S.post[id] = res.error ? false : (res.data || false);
    } catch (_) { S.post[id] = false; }
    render();
  }
  // 17.09.2026: sömu reitir og loadPost sækir — hlutirnir verða eins, svo
  // svarglugginn og valið mál geta notað þá beint án annarrar sóknar.
  let _postBunki = false;
  async function loadPostBunki(rows) {
    if (_postBunki) return;
    const ids = [...new Set(rows.map(postId).filter(id => id != null && !(id in S.post)))];
    if (!ids.length) return;
    _postBunki = true;
    ids.forEach(id => { S.post[id] = null; });   // merkt sótt strax svo endurteikning kalli ekki aftur
    try {
      const res = await sb().from('email_digest').select('id,message_id,account,sender_name,sender_email,subject,snippet,body_preview,received_at').in('id', ids);
      if (!res.error) (res.data || []).forEach(p => { S.post[p.id] = p; });
    } catch (_) { /* engin forskoðun er ekki villa — línan stendur eftir sem áður */ }
    ids.forEach(id => { if (S.post[id] == null) S.post[id] = false; });
    _postBunki = false;
    render();
  }
  function reply(id) {
    const r = S.rows.find(x => x.id === id);
    if (!r) return;
    const p = postOf(r);
    if (p === undefined || p === null) { loadPost(r); toast('Sæki póstinn — reyndu aftur eftir augnablik.', true); return; }
    if (!window.ReikningaPostur || !ReikningaPostur.replyTo) { toast('Svar-glugginn (Reikninga-póstur) er ekki hlaðinn.', true); return; }
    if (!p || !p.sender_email) { toast('Ekkert sendandanetfang fannst á þessu máli.', true); return; }
    const m = {
      message_id: p.message_id, account: p.account || '', sender_name: p.sender_name || r.customer_nafn || '', from: p.sender_email,
      subject: p.subject || r.title || '', body_preview: p.body_preview || '', snippet: p.snippet || r.notes || ''
    };
    // 240 kallar á þetta þegar svarið er SENT — sama merking og á gamla borðinu.
    m._onSent = () => act(r.id, async () => {
      const rows = await patchRow(r.id, { svarad_at: new Date().toISOString(), status: r.status === 'nytt' ? 'i_vinnslu' : r.status });
      if (!rows.length || !rows[0].svarad_at) throw new Error('svarið sendist en merkingin vistaðist ekki');
      toast('Svarið sent · merkt svarað');
    });
    try { ReikningaPostur.replyTo(m); } catch (e) { toast('Svar-glugginn opnaðist ekki: ' + ((e && e.message) || e), true); }
  }

  /* ── einingar úr öðrum hlutum kerfisins (lesið) ── */
  function jobsFor(n) {
    const j = P('vikudagskra.by_staff.' + n + '.jobs');
    if (Array.isArray(j)) return j.filter(Boolean);
    if (n === 'Agnar') { const g = P('vikudagskra.jobs'); if (Array.isArray(g)) return g.filter(Boolean); }
    return [];
  }
  // 2026-09-12 (Verkefnalisti 853efc10): verk sem 303 stofnar úr máli ber mal_id. Leitað á eigin dagskrá fyrst,
  // svo hjá hinum — málið getur verið sett á dagskrá þess sem valdi það, ekki endilega eiganda málsins.
  function jobOfMal(id) {
    if (id == null) return null;
    const me = nu();
    for (const n of [me].concat(folk().filter(x => x !== me))) {
      const j = jobsFor(n).find(x => x && x.mal_id != null && String(x.mal_id) === String(id));
      if (j) return Object.assign({ _n: n }, j);
    }
    return null;
  }
  // 🗓-takkinn: „Á dagskrá" setur málið á dagskrá; sé það komið þangað sýnir hann daginn og hoppar á hann.
  function dagskrarTakki(r) {
    const j = jobOfMal(r.id);
    return j
      ? '<button type="button" class="btn iv sm" data-t5="vd-opna" data-id="' + r.id + '" title="Opna daginn í Dagskrá">🗓 ' + esc(fmtD(j.date)) + (j._n !== nu() ? ' · ' + esc(j._n) : '') + '</button>'
      : '<button type="button" class="btn iv sm" data-t5="vd-add" data-id="' + r.id + '" title="Setja málið á dagskrá">🗓 Á dagskrá</button>';
  }
  function cardsFor(n) {
    const v = P('skipulagsbord.by_staff.' + n);
    if (v && Array.isArray(v.cards)) return v.cards.filter(Boolean);
    if (n === 'Agnar') {
      const g = P('skipulagsbord');
      if (g && Array.isArray(g.cards)) return g.cards.filter(Boolean);
      const g2 = P('skipulagsborg');
      if (g2 && Array.isArray(g2.cards)) return g2.cards.filter(Boolean);
    }
    return [];
  }
  const spjold = n => cardsFor(n).slice().sort((a, b) => (+a.slot || 0) - (+b.slot || 0));
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function week() {
    const jobs = jobsFor(nu()), out = [], d0 = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i), key = ymd(d);
      out.push({
        key, d: DAG[d.getDay()], n: d.getDate(), today: i === 0,
        jobs: jobs.filter(j => String(j.date || '').slice(0, 10) === key)
          .sort((a, b) => (a.allday ? 0 : 1) - (b.allday ? 0 : 1) || String(a.time || '').localeCompare(String(b.time || '')))
      });
    }
    return out;
  }
  function goView(v, anchor) {
    try { if (window.App && App.switchView) App.switchView(v); } catch (_) {}
    if (!anchor) return;
    let k = 0;
    const t = setInterval(() => {
      const el = document.getElementById(anchor);
      if (el || ++k > 20) { clearInterval(t); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    }, 150);
  }
  function openCompany(fid) {
    try {
      if (window.App && App.switchView) App.switchView('companies');
      if (window.Companies && Companies.openDetail) Companies.openDetail(+fid);
    } catch (_) { toast('Fyrirtækjaspjaldið opnaðist ekki.', true); }
  }

  /* ── útlit (inni í skuggarótinni) ── */
  function cssText() {
    return [
      ':host{display:block;--ink:#161513;--ink2:#4a463f;--mute:#6f685c;--on:#f4f1ea;--on2:#c8c1b1;--on3:#8f8776;--rule:#d9d3c6;--rule2:#e6e1d6;--rule3:#cfc8b9;--edge:#c9c2b3;--edge2:#a89f8c;--terra:#b5522a;--green:#2f7a4a;--gink:#8a6a1c;--g5:#c9a54a;--g6:#b8892e;--g8:#8f6a1c;',
      '--gline:linear-gradient(90deg,#7a5a12 0%,#c9a54a 18%,#f5d76e 38%,#fff3b0 47%,#f5d76e 56%,#c9a54a 78%,#7a5a12 100%);',
      '--gface:linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.55) 45%,rgba(255,255,255,0) 52%),repeating-linear-gradient(180deg,rgba(255,255,255,.08) 0 1px,rgba(0,0,0,0) 1px 3px),linear-gradient(180deg,#f3dc95 0%,#d9b25a 14%,#b8892e 46%,#8f6a1c 52%,#a87b1f 74%,#cfa54a 92%,#e8cb7a 100%);',
      '--gside:linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.4) 46%,rgba(255,255,255,0) 54%),repeating-linear-gradient(180deg,rgba(255,255,255,.07) 0 1px,rgba(0,0,0,0) 1px 3px),linear-gradient(180deg,#e8cb7a 0%,#c9a54a 45%,#9c7422 55%,#b8892e 100%);',
      '--gcoin:repeating-conic-gradient(from 0deg,rgba(255,255,255,.09) 0 1.5deg,rgba(0,0,0,0) 1.5deg 4deg),radial-gradient(circle at 32% 28%,#fff3d0 0%,#e8cb7a 16%,#b8892e 46%,#7a5a12 76%,#3e2c06 100%);',
      '--panel:linear-gradient(180deg,#fff 0%,#fbf9f5 100%);--panelsh:inset 0 1px 0 #fff,inset 0 0 0 1px rgba(255,255,255,.6),inset 0 -1px 0 rgba(22,21,19,.06),0 1px 2px rgba(22,21,19,.1),0 6px 10px -6px rgba(22,21,19,.18),0 18px 36px -18px rgba(22,21,19,.4);',
      '--strip:linear-gradient(180deg,#faf8f4,#f1ede4);--stripsh:inset 0 1px 0 #fff,inset 0 -1px 0 rgba(255,255,255,.7);',
      '--key:linear-gradient(180deg,#fff,#f1ede4);--keysh:inset 0 1px 0 #fff,0 1px 2px rgba(22,21,19,.18),0 2px 0 rgba(22,21,19,.06);',
      '--well:linear-gradient(180deg,#f1ede4,#fff 55%);--wellsh:inset 0 2px 4px rgba(22,21,19,.12),inset 0 0 0 1px rgba(255,255,255,.8),0 1px 0 #fff;',
      '--slab:linear-gradient(160deg,#26241f 0%,#151412 40%,#0c0c0b 100%);--slabsh:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px rgba(226,196,111,.12),inset 0 -1px 0 rgba(0,0,0,.9),0 2px 0 #000,0 20px 40px -14px rgba(0,0,0,.85);',
      '--dwell:linear-gradient(180deg,#050505,#121110 60%,#0a0a09);--dwellsh:inset 0 3px 8px rgba(0,0,0,.95),inset 0 -1px 0 rgba(255,255,255,.05),0 1px 0 rgba(255,255,255,.08),0 0 0 1px #2a2823;',
      "--disp:'Playfair Display',Georgia,'Times New Roman',serif;--mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;--body:'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
      '[hidden]{display:none!important}',
      '*{box-sizing:border-box}',
      '.t5{container:t5 / inline-size;color:var(--ink);font-family:var(--body);font-size:13px;line-height:1.45;background:radial-gradient(ellipse at 50% 0%,#faf8f3 0%,#f4f1ea 55%,#ece7dc 100%);padding:16px 22px 40px;min-height:70vh;text-align:left}',
      '.t5 :focus-visible{outline:2px solid var(--g6);outline-offset:2px}',
      'h1,h2,h3,p{margin:0}',
      '.grow{flex:1}',
      '.col{display:flex;flex-direction:column;gap:16px;min-width:0}',
      '.kicker{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:700;letter-spacing:.2em;color:var(--g8);text-transform:uppercase}',
      '.kicker::before{content:"";width:28px;height:2px;background:var(--gline);box-shadow:0 1px 0 #fff}',
      '.h1{font-family:var(--disp);font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1;margin:6px 0 0;color:var(--ink);text-shadow:0 1px 0 #fff,0 2px 2px rgba(22,21,19,.18)}',
      '.lbl{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      '.head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 18px;flex-wrap:wrap}',
      '.meta{margin:8px 0 0;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}',
      '.beta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}',
      '.note{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}',
      '.acts{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap}',
      '.who{display:flex;flex-direction:column;gap:5px;margin:0}',
      '.who select{height:36px;min-width:150px;padding:0 11px;border:1px solid var(--edge);border-radius:4px;background:var(--well);box-shadow:var(--wellsh);font:600 13px var(--body);color:var(--ink)}',
      '.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:4px;font:600 12.5px var(--body);cursor:pointer;white-space:nowrap;transition:filter 120ms}',
      '.btn:hover{filter:brightness(1.04)}.btn:active{filter:brightness(.96)}',
      '.btn.sm{height:30px;padding:0 11px;font-size:12px}.btn.lg{height:42px;padding:0 18px;font-size:13.5px}',
      '.btn.iv{border:1px solid var(--edge);border-bottom-color:var(--edge2);background:var(--key);color:var(--ink);box-shadow:var(--keysh)}',
      '.btn.gold{border:1px solid #5a4410;border-top-color:#f7e6b8;border-bottom-color:#2e2004;border-radius:5px;background:var(--gface);color:var(--ink);font-weight:800;text-shadow:0 1px 0 rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 3px rgba(60,40,0,.45),0 3px 6px rgba(22,21,19,.45),0 0 12px rgba(184,137,46,.35)}',
      '.btn[disabled]{cursor:progress;filter:grayscale(.35) brightness(.95);opacity:.8}',
      '.btn[aria-pressed="true"]{background:var(--gside);font-weight:800}',
      '.seg{display:inline-flex;border:1px solid var(--edge2);border-radius:5px;overflow:hidden;box-shadow:var(--keysh);background:var(--key)}',
      '.seg button{height:30px;padding:0 12px;border:0;border-left:1px solid var(--edge);background:transparent;font:600 12px var(--body);color:var(--ink);cursor:pointer;white-space:nowrap}',
      '.seg button:first-child{border-left:0}',
      '.seg button[aria-pressed="true"]{background:var(--gside);font-weight:800;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(0,0,0,.25)}',
      '.seg.modeseg button{height:36px;padding:0 16px;font-size:13px}',
      '.seg.sm button{height:26px;padding:0 9px;font-size:11.5px}',
      '.seg .c{font-family:var(--mono);font-size:10.5px;margin-left:5px;font-variant-numeric:tabular-nums}',
      // Síurnar í haus Master-borðs voru 17 px breiðari en síminn (mælt á 375 px) — skruna í sínum reit.
      '.phead .seg{max-width:100%;overflow-x:auto}',
      '.modes{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.links{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;padding:8px 12px;border:1px solid var(--rule3);border-radius:5px;background:var(--strip);box-shadow:var(--stripsh),0 1px 2px rgba(22,21,19,.08)}',
      '.lkw{display:inline-flex;align-items:center;gap:3px}',
      '.lk{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px 0 5px;border:1px solid var(--edge);border-bottom-color:var(--edge2);border-radius:15px;background:var(--key);box-shadow:var(--keysh);color:var(--ink);font:600 12.5px var(--body);text-decoration:none;cursor:pointer;white-space:nowrap}',
      '.lk:hover{filter:brightness(1.04)}',
      '.lk-ic{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--gside);color:#3e2c06;font:800 11px/1 var(--body);box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}',
      '.lk-m{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}',
      '.lk-x{width:22px;height:22px;border:1px solid var(--edge);border-radius:50%;background:#fff;color:var(--terra);font:700 11px/1 var(--body);cursor:pointer;padding:0}',
      '.lk-tomt{font-size:12px;color:var(--mute)}',
      '.lk-ham{display:flex;align-items:center;gap:8px;padding:0 16px 10px;font-size:12px;color:var(--ink2)}',
      '.lk-till{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 16px 12px;border-top:1px solid var(--rule2)}',
      '.panel{background:var(--panel);border:1px solid var(--rule3);border-radius:5px;box-shadow:var(--panelsh);min-width:0}',
      '.phead{display:flex;align-items:center;flex-wrap:wrap;gap:10px 12px;padding:11px 16px;background:var(--strip);box-shadow:var(--stripsh);border-bottom:1px solid transparent;border-image:var(--gline) 1;border-image-width:0 0 1px 0;border-radius:5px 5px 0 0}',
      '.mod:not(.open):not(.alltaf) .phead{border-image-width:0;border-radius:5px}',
      '.ptitle{font-family:var(--disp);font-size:20px;font-weight:700;letter-spacing:-.01em;line-height:1.1;text-shadow:0 1px 0 #fff;color:var(--ink)}',
      '.plate{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.14em;padding:2px 7px;border:1px solid #7a5a12;border-radius:2px;color:#3e2c06;text-shadow:0 1px 0 rgba(255,255,255,.45);background:linear-gradient(115deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.6) 48%,rgba(255,255,255,0) 56%),linear-gradient(180deg,#f0d78a,#c9a54a 60%,#a87b1f);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -1px 0 rgba(60,40,0,.4)}',
      '.plate.dark{color:#e2c46f;background:linear-gradient(180deg,#2a2823,#161513);border-color:rgba(201,165,74,.5);text-shadow:none}',
      '.sum{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);min-width:0}',
      '.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
      '.kpi{position:relative;padding:14px 16px 13px;background:linear-gradient(180deg,#fff 0%,#fbf9f5 70%,#f1ede4 100%);border:1px solid var(--rule);border-top:3px solid transparent;border-image:var(--gline) 1;border-image-width:3px 0 0 0;border-radius:4px;box-shadow:var(--panelsh);min-width:0}',
      '.kpi.dark{background:var(--slab);border-color:#000;color:var(--on);box-shadow:var(--slabsh)}',
      '.kpi.dark .lbl{color:var(--on3)}',
      '.kv{font-family:var(--disp);font-size:34px;font-weight:800;letter-spacing:-.02em;line-height:1;margin-top:8px;font-variant-numeric:lining-nums tabular-nums}',
      '.kv small{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--mute);margin-left:3px}',
      '.km{font-size:11.5px;color:var(--mute);margin-top:6px}.kpi.dark .km{color:var(--on2)}',
      '.layout{display:flex;flex-direction:column;gap:16px;min-width:0}',
      '.rail{display:flex;flex-direction:column;gap:14px;min-width:0;container:rail / inline-size}',
      '.main{min-width:0;container:main / inline-size}',
      // 368aa: einingahamur — einingarnar í fullri breidd, einn til þrír dálkar eftir plássi; valið mál efst í mjórri glugga.
      // 18.09.2026 — 12 dálka rist svo notandinn ráði breidd hverrar einingar.
      // Vörpunin heldur nákvæmlega gömlu útliti: 1 → 12·6·4, 2 → 12·6·6, 3 → alltaf fullt.
      '.modgrid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;align-items:start}',
      '.modcell{min-width:0;container:rail / inline-size;grid-column:span 12}',
      '.modgrid>.sel.inline{grid-column:1 / -1}',
      '@container main (min-width: 1100px){.modcell[data-sp="1"],.modcell[data-sp="2"]{grid-column:span 6}}',
      '@container main (min-width: 1900px){.modcell[data-sp="1"]{grid-column:span 4}.modcell[data-sp="2"]{grid-column:span 6}}',
      // Raðhamur: einingarnar fá hald, stærðarhandfang og ✕ á meðan hamur er í breytingu.
      '.modgrid.radar>.modcell{position:relative;outline:1px dashed var(--edge2);outline-offset:3px;border-radius:5px}',
      '.modgrid.radar>.modcell.yfir{outline:2px solid var(--g5);outline-offset:3px}',
      '.mbar{display:flex;align-items:center;gap:6px;padding:4px 6px;background:var(--rule2);border-radius:4px 4px 0 0;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}',
      '.mbar .mgrip{cursor:grab;font-size:13px;letter-spacing:0}.mbar .mgrip:active{cursor:grabbing}',
      '.mbar button{appearance:none;border:1px solid var(--edge);background:#fffdf7;border-radius:3px;font:inherit;line-height:1;padding:3px 6px;cursor:pointer;color:var(--ink2)}',
      '.mbar button:hover{background:var(--g5);color:#161513}.mbar button[disabled]{opacity:.35;cursor:default}',
      '.mbar .mbr{font-weight:600;color:var(--ink)}',
      '.mres{position:absolute;top:0;right:-7px;width:14px;height:100%;cursor:col-resize;background:none;border:0;padding:0}',
      '.mres::after{content:"";position:absolute;top:34%;bottom:34%;left:5px;width:4px;border-radius:2px;background:var(--edge2)}',
      '.mres:hover::after,.mres.virk::after{background:var(--g5)}',
      '.samt-ef{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;overflow-wrap:anywhere;color:var(--ink)}',
      '.samt-kr{display:inline-block;margin:0 0 3px;padding:1px 6px;border-radius:3px;background:var(--rule2);font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.03em;color:var(--gink)}',
      '.board{display:grid;grid-template-columns:minmax(0,1.32fr) minmax(0,1fr);grid-template-rows:auto 1fr;grid-template-areas:"master mine" "master sel";gap:18px;align-items:start}',
      '.colmaster{grid-area:master}.colmine{grid-area:mine}.colsel{grid-area:sel}',
      '.colmine.samanbrotid{align-self:start}.colmine.samanbrotid .phead{border-image-width:0;border-radius:5px}',
      '.phone-seg{display:none}',
      '.psub{padding:9px 16px;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);border-bottom:1px solid var(--rule2);overflow-wrap:anywhere}',
      // Forgangslisti krafna inni í Master-dálkinum (11.09.2026): spjald í spjaldi — enginn tvöfaldur skuggi.
      '.mforg{padding:10px 12px;border-bottom:1px solid var(--rule2)}.mforg>.panel{box-shadow:none}',
      '.age{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums}',
      '.age.warm{color:var(--gink)}.age.hot{color:var(--terra)}',
      '.kick{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);overflow-wrap:anywhere}',
      '.frow{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:start;padding:13px 16px;border-top:1px solid var(--rule2)}',
      '.frow:first-child{border-top:0}',
      '.rt{font-family:var(--disp);font-size:17px;font-weight:700;line-height:1.25;margin:4px 0 3px;overflow-wrap:anywhere;color:var(--ink)}',
      '.ai{max-width:62ch;font-size:12.5px;line-height:1.5;color:var(--ink2)}',
      '.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
      '.tag{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:3px 6px;border-radius:2px;border:1px solid var(--edge);color:var(--ink2);background:var(--well)}',
      '.tag.hot{border-color:rgba(181,82,42,.55);color:var(--terra)}.tag.ok{border-color:rgba(47,122,74,.5);color:var(--green)}',
      '.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 16px;text-align:center;color:var(--mute);font-size:12.5px}',
      '.coin{width:40px;height:40px;border-radius:50%;background:var(--gcoin);opacity:.22;box-shadow:inset 0 2px 1px rgba(255,255,255,.7),inset 0 -3px 5px rgba(0,0,0,.45)}',
      '.pager{display:flex;justify-content:center;padding:10px 16px 14px;border-top:1px solid var(--rule2)}',
      '.slots{display:inline-flex;align-items:center;gap:4px}',
      '.slot{width:11px;height:11px;border-radius:2px;border:1px solid var(--edge2);background:var(--well);box-shadow:var(--wellsh)}',
      '.slot.on{background:linear-gradient(180deg,#3a3732,#161513);border-color:#000}',
      '.slotn{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--ink2);margin-left:4px}.slotn.over{color:var(--terra)}',
      '.mrow{display:grid;grid-template-columns:12px minmax(0,1fr);gap:8px;padding:12px 16px;border-top:1px solid var(--rule2)}',
      '.mrow:first-child{border-top:0}.mrow[aria-current="true"]{background:rgba(241,237,228,.6)}',
      '.pin{visibility:hidden;font-size:9px;color:var(--g6);padding-top:3px}.mrow[aria-current="true"] .pin{visibility:visible}',
      '.mpick{display:block;width:100%;padding:0;margin:0;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      '.fbody{min-width:0}',
      '.fpick{display:block;width:100%;min-width:0;padding:0;margin:0;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      '.fpick .rt,.fpick .ai{display:block}',
      '.fpick .rt,.mt,.lpick b{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
      '.fpick:hover .rt,.mpick:hover .mt{text-decoration:underline;text-decoration-color:var(--g6);text-underline-offset:3px}',
      '.frow[aria-current="true"]{background:rgba(241,237,228,.75);box-shadow:inset 3px 0 0 var(--g6)}',
      '.clink{display:inline;padding:0;margin:0;border:0;background:none;font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--g8);text-decoration:underline;text-decoration-color:rgba(184,137,46,.45);text-underline-offset:2px;cursor:pointer}',
      '.clink:hover{color:var(--ink);text-decoration-color:var(--g6)}',
      '.clink.dk{color:#e8cb7a;text-decoration-color:rgba(232,203,122,.5)}.clink.dk:hover{color:#fff3b0}',
      '.shead{display:flex;align-items:center;gap:10px}',
      '.sx{width:28px;height:28px;flex:none;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on2);font:700 13px/1 var(--body);cursor:pointer;padding:0}',
      '.sfyr{font-size:14px;font-weight:600;color:var(--on)}',
      '.sacts.sm2{align-items:center;padding-top:10px;border-top:1px solid #2a2823}',
      '.setja{display:inline-flex;align-items:center;gap:8px}',
      '.setja select{height:36px;min-width:140px;padding:0 10px;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on);font:600 13px var(--body)}',
      '.pchip{margin:2px 0 0 6px;padding:1px 7px;border:1px solid var(--edge);border-radius:10px;background:var(--key);font:600 10.5px var(--mono);letter-spacing:.06em;color:var(--ink2);cursor:pointer;text-transform:uppercase}',
      '.pchip[aria-pressed="true"]{background:var(--gside);color:var(--ink)}',
      '.board.bara{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);grid-template-rows:auto;grid-template-areas:"mine sel"}',
      '.mt{display:block;font-family:var(--disp);font-size:16px;font-weight:700;line-height:1.25;margin:4px 0 2px;overflow-wrap:anywhere;color:var(--ink)}',
      // 18.09.2026 — hvíta svæðið á kortinu. `.mn` var áður lesspan; nú er hún
      // hnappur sem opnar innsláttarreit. Fjórar línur, punktalína sem birtist við
      // yfirsvif svo það sjáist að hægt sé að skrifa.
      '.mn{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;overflow-wrap:anywhere;width:100%;margin:0 0 8px;padding:5px 7px;text-align:left;appearance:none;-webkit-appearance:none;border:1px dashed transparent;border-radius:4px;background:none;font:12.5px/1.5 var(--body);color:var(--ink2);cursor:text}',
      '.mn.les{border:0;padding:0 0 0 1px;cursor:default;color:var(--mute)}',
      '.mn:not(.les):hover,.mn:not(.les):focus-visible{border-color:var(--edge);background:#fffdf7}',
      '.mn.tom{color:var(--mute);font-style:italic}',
      '.ai{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;overflow-wrap:anywhere}',
      // Innsláttarreiturinn sjálfur — hvítur á korti, svartur í valda málinu.
      '.nt{display:flex;flex-direction:column;gap:3px;margin:0 0 8px}',
      // Dagnóta: reiturinn á að líta út eins og autt blað í dagatalinu, ekki eins og eyðublað.
      '.dnota{display:flex;flex-direction:column;gap:2px;margin-top:4px}',
      '.dnota textarea{width:100%;min-height:34px;padding:5px 6px;border:1px solid transparent;border-radius:3px;background:rgba(255,253,247,.5);font:12px/1.45 var(--body);color:var(--ink);resize:vertical;white-space:pre-wrap}',
      '.dnota textarea:hover{border-color:var(--rule2);background:#fffdf7}',
      '.dnota textarea:focus{outline:2px solid var(--g5);outline-offset:1px;background:#fffdf7}',
      '.dnota textarea::placeholder{color:var(--mute);opacity:.45}',
      '.dnst{font-family:var(--mono);font-size:9.5px;letter-spacing:.05em;color:var(--mute);min-height:11px}',
      '.dnst.ok{color:var(--green)}.dnst.vistar,.dnst.bid{color:var(--gink)}',
      '.nthead{display:flex;align-items:baseline;gap:8px}',
      '.nt textarea{width:100%;padding:8px 10px;border:1px solid var(--edge);border-radius:4px;background:#fffdf7;box-shadow:var(--wellsh);font:13px/1.6 var(--body);color:var(--ink);resize:vertical;white-space:pre-wrap}',
      '.nt textarea:focus{outline:2px solid var(--g5);outline-offset:1px}',
      '.nt textarea::placeholder{color:var(--mute);opacity:.5}',
      '.well.ntwell{padding:10px 12px}.well.ntwell .nt{margin:0}',
      '.nt.dark textarea{border:1px solid #2f2c26;background:#0b0b0a;color:#efe9da;box-shadow:inset 0 2px 6px rgba(0,0,0,.6)}',
      '.nt.dark textarea::placeholder{color:#7b7466;opacity:.8}',
      '.ntst{font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--mute)}',
      '.ntst.villa{color:var(--terra);letter-spacing:0;font-family:var(--body);font-size:11.5px}',
      '.ntst.ok{color:var(--green)}.ntst.vistar,.ntst.bid{color:var(--gink)}',
      '.nt.dark .ntst{color:var(--on3)}.nt.dark .ntst.ok{color:#7fbf95}.nt.dark .ntst.villa{color:#e08b6a}',
      '.mfoot{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:6px}',
      '.sel{background:var(--slab);border:1px solid #000;border-top:3px solid transparent;border-image:var(--gline) 1;border-image-width:3px 0 0 0;border-radius:5px;color:var(--on);box-shadow:var(--slabsh);padding:14px 18px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}',
      '.sel.inline{margin:0 10px 12px}',
      // Á tölvu límist valið mál við skjáinn á meðan skrunað er niður listann.
      '.sel.side{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}',
      '.sel .age{color:var(--on3)}.sel .age.warm{color:#d9b25a}.sel .age.hot{color:#e08a60}',
      '.slabel{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--g5)}',
      '.stitle{font-family:var(--disp);font-size:23px;font-weight:800;line-height:1.15;color:var(--on);overflow-wrap:anywhere}',
      '.smeta{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--on2);overflow-wrap:anywhere}',
      '.aisum{font-size:12.5px;line-height:1.55;color:var(--on2)}.aisum .slabel{margin-right:8px}',
      '.well{border:1px solid #000;border-radius:4px;background:var(--dwell);box-shadow:var(--dwellsh);padding:12px 14px}',
      '.well p{margin:7px 0 0;font-size:13px;line-height:1.6;color:#efe9da;white-space:pre-line;overflow-wrap:anywhere;max-height:260px;overflow:auto}',
      '.sacts{display:flex;gap:8px;flex-wrap:wrap}',
      '.sel .empty{color:var(--on3)}',
      '.tog{min-width:34px;padding:0 9px}',
      '.week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;padding:12px 14px}',
      '.day{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px 9px 9px;border:1px solid var(--rule);border-bottom-color:var(--edge);border-radius:4px;background:var(--key);box-shadow:var(--keysh);color:var(--ink)}',
      '.day.today{background:var(--slab);border-color:#000;color:var(--on)}',
      '.dh{display:flex;align-items:center;gap:4px}',
      '.djobs{display:flex;flex-direction:column;gap:6px;min-width:0}',
      '.dlink{display:flex;align-items:baseline;gap:6px;padding:0;border:0;background:none;font:inherit;color:inherit;cursor:pointer}',
      '.dn{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.14em}.day:not(.today) .dn{color:var(--mute)}',
      '.dd{font-family:var(--disp);font-size:16px;font-weight:800;line-height:1}',
      '.dplus{width:22px;height:22px;flex:none;border:1px solid var(--edge);border-radius:3px;background:var(--key);color:var(--ink);font:700 14px/1 var(--body);cursor:pointer;padding:0}',
      '.today .dplus{background:#2a2823;border-color:#3a3732;color:var(--on)}',
      '.dots{display:flex;gap:4px;flex-wrap:wrap;min-height:8px}',
      '.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}',
      '.dnone{font-size:11px;color:var(--mute)}.today .dnone{color:var(--on3)}',
      '.job{display:grid;gap:1px;width:100%;padding:6px 7px;border-radius:3px;background:rgba(255,255,255,.7);border:1px solid var(--rule2);border-left:3px solid #8f8776;font:11.5px/1.3 var(--body);color:var(--ink2);text-align:left;overflow-wrap:anywhere;cursor:pointer}',
      'span.job{cursor:default}',
      '.job b{font-family:var(--mono);font-size:10.5px;font-weight:600;color:var(--ink)}.job small{font-size:11px;color:var(--mute)}',
      '.today .job{background:rgba(255,255,255,.06);border-color:#2a2823;color:var(--on2)}.today .job b{color:var(--on)}',
      '.legend{display:flex;flex-wrap:wrap;gap:6px 14px;padding:0 16px 12px;font-size:11.5px;color:var(--mute)}.legend span{display:inline-flex;align-items:center;gap:6px}',
      '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:12px 14px}',
      '.pcard{display:flex;flex-direction:column;gap:4px;padding:10px 11px;border:1px solid var(--rule);border-bottom-color:var(--edge);border-radius:4px;background:linear-gradient(180deg,#fff,#fbf9f5);box-shadow:var(--keysh);min-width:0}',
      '.pcard b{font-size:13px;line-height:1.3;overflow-wrap:anywhere}.pcard span{font-size:12px;color:var(--ink2);line-height:1.4;overflow-wrap:anywhere}',
      '.pcard .pt{display:flex;align-items:center;gap:6px;margin-top:4px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}',
      '.lrow{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 16px;border-top:1px solid var(--rule2)}',
      '.lrow:first-child{border-top:0}.lrow b{display:block;font-size:13px;overflow-wrap:anywhere}.lrow .s{display:block;font-size:12px;color:var(--mute)}',
      '.kboxes{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:12px 14px}',
      '.kbox{padding:10px 12px;border-radius:4px;background:var(--well);box-shadow:var(--wellsh);border:1px solid var(--edge)}',
      '.kbox .v{font-family:var(--disp);font-size:24px;font-weight:800;line-height:1.1;margin-top:4px;font-variant-numeric:tabular-nums}',
      '.more{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 16px 12px;font-size:12px;color:var(--mute)}',
      // FELA (11.09.2026): dauft en lyklaborðsnothæft — full sýn og undirstrik við sveimun og fókus.
      '.radg{display:inline-flex;flex-wrap:wrap;gap:4px 12px;align-items:center}.radg.lina{display:flex;margin-top:6px}',
      '@media (max-width:760px),(pointer:coarse){.fela.adg{min-height:36px;padding:8px 4px;font-size:12.5px}.radg{gap:2px 16px}}',
      '.fela.adg{opacity:.85;font-weight:600;padding:3px 0;min-height:24px}.fela.adg:hover{opacity:1;text-decoration:underline}.fela.adg.eyda{color:var(--hot,#b42318)}.fela.adg[disabled]{opacity:.35;cursor:default}',
      '.fela{display:inline;padding:0;margin:0;border:0;background:none;font:500 11px var(--body);letter-spacing:0;text-transform:none;color:var(--mute);opacity:.6;cursor:pointer}',
      '.fela:hover,.fela:focus-visible{opacity:1;text-decoration:underline;text-underline-offset:2px}',
      '.fela.syna{font-size:12px;opacity:1;text-decoration:underline;text-decoration-color:var(--rule3);text-underline-offset:2px}.fela.syna:hover,.fela.syna:focus-visible{color:var(--ink);text-decoration-color:var(--g6)}',
      '.lrow.falid,.akrow.falid,.vbrow.falid{opacity:.55}.lrow.falid:hover,.akrow.falid:hover,.vbrow.falid:hover,.lrow.falid:focus-within,.akrow.falid:focus-within,.vbrow.falid:focus-within{opacity:.9}',
      // SKÝRING (11.09.2026): eigin dauf lína undir efni línunnar og lítill ritill — engir nýir litir (þemað er frosið).
      '.skyr{display:block;margin-top:2px;font-size:12px;line-height:1.45;color:var(--mute);white-space:pre-wrap;overflow-wrap:anywhere}.skyr.villa{color:var(--terra)}',
      '.skyrrit{display:flex;flex-direction:column;gap:6px;margin-top:6px;min-width:0}.lrow:has(.skyrrit){align-items:start}',
      '.skyrrit textarea{display:block;width:100%;min-height:52px;padding:7px 10px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px/1.45 var(--body);color:var(--ink);resize:vertical}',
      '.skyrrit textarea[readonly]{opacity:.7}.skyrtakkar{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px}',
      '.lakt{display:inline-flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:6px 8px}',
      '.sectm{padding:0 14px 6px;font-size:12px;color:var(--mute)}.lrow .s .tag{display:inline-block;padding:1px 5px;margin:1px 0}',
      '.cfgrow{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:10px 16px;border-top:1px solid var(--rule2)}',
      '.cfgt b{display:block;font-family:var(--disp);font-size:15px;font-weight:700}.cfgt span{display:block;font-size:12px;color:var(--mute)}',
      '.lock{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}',
      '.cfgfoot{padding:11px 16px;border-top:1px solid var(--rule);font-size:12px;color:var(--mute)}',
      '.sw{position:relative;width:40px;height:22px;flex:none;border-radius:11px;border:1px solid var(--edge2);background:var(--well);box-shadow:var(--wellsh);cursor:pointer;padding:0}',
      '.sw::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--key);border:1px solid var(--edge);box-shadow:var(--keysh)}',
      '.sw[aria-checked="true"]{background:linear-gradient(180deg,#2a7a45 0%,#174a2a 55%,#144424 100%);border-color:#0a2a15}.sw[aria-checked="true"]::after{left:20px}',
      '.boardstrip{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;width:100%;min-height:50px;padding:9px 16px;border:1px solid var(--rule3);border-radius:5px;background:var(--strip);box-shadow:var(--stripsh),0 1px 2px rgba(22,21,19,.1);font:inherit;color:var(--ink);text-align:left;cursor:pointer}',
      '.boardstrip b{font-family:var(--disp);font-size:16px;font-weight:700}.boardstrip .v{font-family:var(--mono);font-size:11px;color:var(--mute);margin-right:10px}',
      '.composer{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto auto;gap:8px;padding:12px 16px}',
      '.composer input[type="text"]{height:34px;padding:0 10px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:14px var(--body);color:var(--ink);min-width:0}',
      '.leit{position:relative;max-width:640px}',
      '.leit input{width:100%;height:40px;padding:0 14px;border:1px solid var(--edge);border-radius:5px;background:var(--well);box-shadow:var(--wellsh);font:14px var(--body);color:var(--ink)}',
      '.pop{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:60;max-height:min(60vh,520px);overflow:auto;background:#fff;border:1px solid var(--rule3);border-radius:5px;box-shadow:0 18px 40px -12px rgba(22,21,19,.45)}',
      '.plbl{padding:8px 14px 4px;font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      '.pitem{display:flex;align-items:center;gap:10px;width:100%;padding:8px 14px;border:0;border-top:1px solid var(--rule2);background:none;text-align:left;font:inherit;color:var(--ink);cursor:pointer}',
      '.pitem.on,.pitem:hover{background:#f6f2e8}',
      '.pmain{display:flex;flex-direction:column;flex:1;min-width:0;color:inherit;text-decoration:none}',
      '.pitem b{font-size:13.5px;overflow-wrap:anywhere}.pitem span{font-size:12px;color:var(--mute)}.pmal{flex-direction:column;align-items:flex-start;gap:1px}',
      '.pnone{padding:10px 14px;font-size:12.5px;color:var(--mute)}',
      '.composer.ny{grid-template-columns:minmax(0,2fr) minmax(0,1.4fr) auto;align-items:start}',
      '.nyfyr{position:relative;min-width:0}.nyfyr input{width:100%}.valid{display:block;margin-top:3px;font-size:11.5px;font-weight:600;color:var(--green)}',
      '.nylbl{display:flex;flex-direction:column;gap:3px}.nylbl select,.nylbl input{height:34px;padding:0 8px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px var(--body);color:var(--ink)}',
      '.composer textarea{grid-column:1 / 3;min-height:34px;padding:7px 10px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px var(--body);color:var(--ink);resize:vertical}',
      '.nychk{display:flex;align-items:center;gap:6px;font-size:13px}.nybtn{display:flex;gap:8px;grid-column:1 / -1;justify-content:flex-end}',
      '.sannanir{padding:12px 14px;display:grid;gap:10px}',
      '.sn-h{display:flex;align-items:center;gap:10px;font-weight:700;font-size:14px}',
      '.sn-h .btn{margin-left:auto}',
      '.sn-r{border-top:1px solid var(--rule2);padding-top:8px;display:grid;gap:2px}',
      '.sn-t{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.sn-n{font-size:14px}.sn-n b{font-variant-numeric:tabular-nums}',
      '.sn-f{font-size:12px;color:var(--mute)}',
      '.pbx{color:var(--terra);font-weight:700;min-width:34px}',
      '.sn-t .tag{white-space:normal;overflow-wrap:anywhere;max-width:100%}',
      '.tag.ok{background:#e7f3ec;color:#2f7a4a;border-color:#bcd9c7}',
      '.t5toast .undo{margin-left:12px;height:26px;padding:0 10px;border:1px solid #5a4410;border-radius:4px;background:var(--gside);color:#1b1405;font:700 12px var(--body);cursor:pointer}',
      '.skwrap{display:flex;flex-direction:column;gap:12px;padding:12px 14px}',
      // 18.09.2026 (Agnar: „kannski 5 spjöld á breiddina og 2-3 spjöld niður").
      // `minmax(210px,1fr)` gaf EINN dálk í 300 px reininni. Ristin stefnir nú á
      // fimm dálka þegar breiddin leyfir og fellur sjálf niður í færri á mjórra.
      '.skgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr));gap:10px;align-items:start}',
      '@container rail (min-width: 1240px){.skgrid{grid-template-columns:repeat(5,minmax(0,1fr))}}',
      // Þak á textareitinn svo eitt langt spjald teygi ekki alla röðina — raðirnar
      // standast á og 2–3 sjást í einu. Handfangið í horninu stækkar það áfram.
      '.skgrid .skc .skt{max-height:120px}',
      '.skc{display:flex;flex-direction:column;gap:4px;padding:6px 8px 8px;border:1px solid var(--rule);border-top:4px solid var(--rule3);border-radius:4px;background:linear-gradient(180deg,#fff,#fbf9f5);box-shadow:var(--keysh);min-width:0}',
      '.skc.yfir{outline:2px dashed var(--g6);outline-offset:2px}.skh{display:flex;align-items:center;gap:4px}',
      '.skgrip{cursor:grab;color:var(--mute);font-size:15px;padding:0 4px 0 0;user-select:none}',
      '.skdot{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.2);padding:0;cursor:pointer;opacity:.4}.skdot.on{opacity:1;box-shadow:0 0 0 2px #fff,0 0 0 3px var(--ink2)}',
      '.skb{min-width:24px;height:24px;padding:0 6px;border:1px solid var(--edge);border-radius:3px;background:var(--key);font:600 12px/1 var(--body);color:var(--ink2);cursor:pointer}.skb[disabled]{opacity:.35;cursor:default}.skx{color:var(--terra)}',
      '.skn{width:100%;border:0;border-bottom:1px dashed transparent;background:transparent;font:700 14px var(--body);color:var(--ink);padding:3px 2px}.skn:focus{outline:none;border-bottom-color:var(--g6)}',
      '.skt{width:100%;border:0;background:transparent;font:13px/1.45 var(--body);color:var(--ink2);padding:2px;resize:vertical;min-height:38px}.skt:focus{outline:none;background:#fffdf7}',
      '.skm{display:flex;flex-direction:column;align-items:flex-start;gap:4px}.skm img{max-width:100%;max-height:160px;border-radius:3px;border:1px solid var(--rule2)}',
      '.skf{font-size:11.5px;color:var(--mute)}.skstada{font-size:11.5px;color:var(--mute)}',
      '.sknew{min-height:96px;border:1px dashed var(--edge2);border-radius:4px;background:transparent;font:600 13px var(--body);color:var(--mute);cursor:pointer}.sknew:hover{background:#fffdf7;color:var(--ink)}',
      // 17.09.2026 (Agnar: „svolítið chaoslegt"): færri hnappar, meiri andrými,
      // sterkari texti — og leiðbeinandi stafirnir næstum ósýnilegir.
      '.skskil{display:flex;align-items:center;gap:10px;margin-top:2px;font:600 11px/1 var(--body);letter-spacing:.09em;text-transform:uppercase;color:var(--mute)}',
      '.skskil:after{content:"";flex:1;height:1px;background:var(--rule)}',
      '.skc{gap:2px;padding:0 0 10px;border-top:1px solid var(--rule);overflow:hidden}',
      '.skstrip{display:block;width:100%;height:5px;border:0;padding:0;cursor:pointer;opacity:.85}.skstrip:hover{opacity:1}',
      '.skh{padding:3px 6px 0;min-height:20px;cursor:grab}.skh:active{cursor:grabbing}',
      '.skgrip{font-size:13px;padding:0;opacity:.25}.skh:hover .skgrip{opacity:.55}',
      '.skx{min-width:18px;width:18px;height:18px;padding:0;border:0;border-radius:3px;background:transparent;font:400 12px/1 var(--body);color:var(--mute);cursor:pointer;opacity:.3}',
      '.skx:hover{opacity:1;color:var(--terra);background:var(--key)}',
      '.skn{padding:2px 10px;font:700 14.5px var(--body);color:var(--ink)}',
      '.skt{padding:2px 10px 0;font:13px/1.5 var(--body);color:var(--ink)}',
      '.skc .skm,.skc .skf{margin:0 10px}',
      '.skn::placeholder,.skt::placeholder{color:var(--mute);opacity:.14}',
      '.skgrid.yfir{outline:2px dashed var(--g6);outline-offset:4px;border-radius:6px}',
      '.sknew{cursor:grab}.sknew:active{cursor:grabbing}',
      '.saga{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid #2a2823;border-radius:4px;background:#11100e}',
      '.saga.buid{border-color:rgba(74,160,106,.6);box-shadow:inset 3px 0 0 #4aa06a}',
      '.sg-h{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px}.sg-buid{font-size:12px;font-weight:700;color:#8fd3a6}',
      '.sg-r{height:26px;padding:0 10px;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on2);font:600 11.5px var(--body);cursor:pointer}.sg-r[disabled]{opacity:.6;cursor:progress}',
      '.sg-l{display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--on2)}.sg-l b{color:var(--on)}',
      '.sg-l em{font-style:normal;font-weight:700}.sg-l em.ok{color:#8fd3a6}.sg-l em.bid{color:#e8b06a}.sg-m{font-size:11px;color:var(--on3)}',
      '.lpick{display:block;padding:0;margin:0;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}.lpick:hover b{text-decoration:underline;text-decoration-color:var(--g6);text-underline-offset:3px}',
      '.bm-t{align-self:flex-start}.bm{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:1px solid #2a2823;border-radius:4px;background:#11100e}',
      '.bm label{display:flex;flex-direction:column;gap:3px;min-width:0}.bm-r{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-end}',
      '.bm input,.bm textarea,.bm select{padding:6px 9px;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on);font:13px var(--body)}.bm textarea{resize:vertical;min-height:70px}',
      '.bm .bm-c{flex-direction:row;align-items:center;gap:6px;color:var(--on2);font-size:13px}',
      '.hchips{display:flex;align-items:center;flex-wrap:wrap;gap:6px}',
      '.hchip{height:26px;padding:0 10px;border:1px solid #3a3732;border-radius:13px;background:#1c1b18;color:var(--on2);font:600 11.5px var(--body);cursor:pointer}',
      '.hchip.on{background:var(--gside);border-color:#5a4410;color:#1b1405}.hchip.auto{border-style:dashed;border-color:rgba(232,203,122,.6);color:#e8cb7a}',
      '.tag.ham{border-color:rgba(184,137,46,.55);color:var(--g8)}',
      '.tag.samt{border-color:rgba(184,137,46,.9);color:var(--g8);background:rgba(232,203,122,.28)}',
      '.hamform .hf{display:flex;flex-direction:column;gap:12px;padding:12px 16px}.hamform .nylbl{max-width:360px}',
      '.hgrp{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px}.hgrp .lbl{flex-basis:100%}',
      '.hchk{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--ink2)}.hnote{font-size:12px;color:var(--mute)}',
      '.pprev{display:block;font-size:12px;line-height:1.4;color:var(--ink2);margin-top:4px;max-height:2.8em;overflow:hidden;text-overflow:ellipsis}',
      '.hnote2{display:block;width:100%;font-size:11.5px;color:var(--mute);margin-top:4px}',
      '.aklist{display:flex;flex-direction:column}.akrow{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 14px;border-top:1px solid var(--rule2)}',
      '.akrow:first-child{border-top:0}.aknr{font:700 12px var(--mono);color:var(--mute);padding-top:2px}',
      '.akinfo{display:flex;flex-direction:column;gap:2px;min-width:0}.akinfo .s{font-size:12px;color:var(--mute);overflow-wrap:anywhere}.akacts{display:flex;gap:4px}',
      'a.btn{text-decoration:none}',
      '.sect{padding:10px 14px 4px;font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      '.stbl-w{overflow-x:auto;padding:6px 10px}.stbl{width:100%;border-collapse:collapse;font-size:12.5px}',
      '.stbl th{font:600 10px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mute);text-align:left;padding:6px;border-bottom:1px solid var(--rule)}',
      '.stbl td{padding:6px;border-bottom:1px solid var(--rule2);font-variant-numeric:tabular-nums}.stbl td.hot{color:var(--terra);font-weight:700}',
      '.kbox .km{font-size:11px;color:var(--mute);margin-top:2px}',
      '.vbsia{padding:10px 14px 4px}.vbrow{display:flex;flex-direction:column;gap:6px;padding:10px 14px;border-top:1px solid var(--rule2)}',
      '.vbrow.buid{background:rgba(47,122,74,.06);box-shadow:inset 3px 0 0 var(--green)}',
      '.vbhead{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px}.vbhead .clink,.vbhead b{font-weight:700;font-size:14px;text-transform:none;letter-spacing:0}.vbhead .s{font-size:12px;color:var(--mute)}',
      '.vbl{margin:0;padding:8px 12px;list-style:none;border:1px solid var(--rule2);border-radius:4px;background:var(--well);font-size:12.5px}.vbl li{display:flex;gap:8px;justify-content:space-between;padding:2px 0}',
      '.vbtexti{font-size:12.5px;white-space:pre-line;color:var(--ink2)}.vbspurn{font-size:12.5px;color:var(--terra);font-weight:600}',
      '.hreinsun .hrsia{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--rule2)}.hrlist{max-height:60vh;overflow:auto}',
      '.hrrow{display:grid;grid-template-columns:20px 44px minmax(0,1fr);gap:10px;align-items:start;padding:9px 14px;border-top:1px solid var(--rule2)}.hrrow:first-child{border-top:0}',
      '.hrrow input{margin:3px 0 0;width:16px;height:16px;cursor:pointer}.hrinfo{display:flex;flex-direction:column;gap:2px;min-width:0}.hrinfo .s{font-size:12px;color:var(--mute);overflow-wrap:anywhere}',
      '.tfbanner{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin:0 0 6px;padding:8px 12px;border:1px solid var(--g6);border-radius:5px;background:#fff8e6;font-size:13px;font-weight:600;color:var(--ink)}',
      '.tftak{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}',
      '.fskjol{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid #2a2823;border-radius:4px;background:#11100e}',
      '.fsupp{display:inline-flex;align-items:center;cursor:pointer}.fslist{display:flex;flex-direction:column;gap:4px}',
      '.fsrow{display:flex;align-items:center;gap:8px;min-width:0}.fsrow .clink{overflow-wrap:anywhere}',
      '.err{padding:10px 14px;border:1px solid rgba(181,82,42,.45);border-radius:4px;background:#fff7f2;color:var(--terra);font-size:12.5px}',
      '.t5toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99990;max-width:min(92vw,520px);padding:11px 16px;border:1px solid #000;border-radius:5px;background:var(--slab);color:var(--on);font:600 12.5px var(--body);box-shadow:var(--slabsh)}',
      '.t5toast.warn{border-top:3px solid var(--terra)}',
      // 368y: myndaforsýn í fylgiskjölum og vinnusvæði Vinnublaða — sömu litir og tákn og annars staðar (þemað er frosið).
      '.fsmynd{display:block;margin-top:4px;border:1px solid #2a2823;border-radius:3px;background:#000;overflow:hidden;cursor:zoom-in}.fsmynd img{display:block;width:100%;height:auto;max-height:240px;object-fit:contain;background:#fff}',
      '.vbstrip{min-height:44px}',
      '.vbr{display:grid;grid-template-columns:minmax(230px,290px) minmax(0,1fr);gap:18px;align-items:start}',
      '.vbr-list{position:sticky;top:12px;max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden}',
      '.vbr-items{overflow:auto;min-height:0}',
      '.vbr-sect{padding:9px 14px 4px;font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute);border-top:1px solid var(--rule2)}.vbr-sect:first-child{border-top:0}',
      '.vbr-item{display:flex;flex-direction:column;gap:2px;width:100%;padding:9px 14px;border:0;border-top:1px solid var(--rule2);background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      '.vbr-item b{font-size:13px;line-height:1.3;overflow-wrap:anywhere}.vbr-item .s{font-size:11.5px;color:var(--mute);overflow-wrap:anywhere}',
      '.vbr-item:hover b{text-decoration:underline;text-decoration-color:var(--g6);text-underline-offset:3px}',
      '.vbr-item[aria-current="true"]{background:rgba(241,237,228,.85);box-shadow:inset 3px 0 0 var(--g6)}.vbr-item.svarad{opacity:.62}',
      '.vbr-main{display:flex;flex-direction:column;gap:14px;min-width:0}',
      '.vbr-top{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px}',
      '.vbr-titill{font-family:var(--disp);font-size:28px;font-weight:800;line-height:1.1;letter-spacing:-.01em;overflow-wrap:anywhere;color:var(--ink)}',
      '.vbr-meta{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}',
      '.vbr-mynd{margin:0;padding:10px;border:1px solid #000;border-radius:5px;background:var(--slab);box-shadow:var(--slabsh)}',
      '.vbr-mynd a{display:block;cursor:zoom-in}.vbr-mynd img{display:block;width:100%;height:auto;max-height:72vh;object-fit:contain;background:#fff;border-radius:3px}',
      '.vbr-mynd figcaption{margin-top:7px;font:600 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--on3)}',
      '.vbr-engin{padding:22px 16px;border:1px dashed var(--edge2);border-radius:5px;text-align:center;font-size:13px;color:var(--mute)}',
      '.vbr-spurn{padding:12px 16px;border:1px solid rgba(181,82,42,.45);border-left:4px solid var(--terra);border-radius:4px;background:#fff7f2;font-size:14px;line-height:1.55;color:var(--ink);white-space:pre-line;overflow-wrap:anywhere}',
      '.vbr-spurn .lbl{display:block;margin-bottom:4px;color:var(--terra)}',
      '.vbr-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}',
      '.vbr-txt{padding:12px 16px 14px;font-size:13.5px;line-height:1.6;white-space:pre-line;overflow-wrap:anywhere;color:var(--ink)}',
      '.vbr-linur th.ath,.vbr-linur td.ath{text-align:right}.vbr-linur td.munur{color:var(--terra);font-weight:700}',
      '.vbr-svar{position:sticky;bottom:10px;z-index:5;display:flex;flex-direction:column;gap:10px;padding:12px 16px;border:1px solid #000;border-top:3px solid transparent;border-image:var(--gline) 1;border-image-width:3px 0 0 0;border-radius:5px;background:var(--slab);box-shadow:var(--slabsh);color:var(--on)}',
      '.vbr-svar .sacts{align-items:center}.vbr-svar .smeta{color:var(--on2)}',
      // 368z: Leiðrétta tölur — H/Y-teljarar í einni rönd; fjögur í röð á mjórri skjá, þrjú í síma.
      '.vbt-rond{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;padding:12px 14px 6px}',
      '.vbt-kort{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px 6px 7px;border:1px solid var(--rule2);border-radius:4px;background:rgba(241,237,228,.55)}',
      '.vbt-kort.breytt{border-color:var(--g6);box-shadow:inset 0 0 0 1px var(--g6)}',
      '.vbt-nafn{min-height:2.5em;display:flex;align-items:center;justify-content:center;text-align:center;font:700 12px/1.2 var(--body);color:var(--ink);hyphens:auto;overflow-wrap:anywhere}',
      '.vbt-dalkar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.vbt-kort.einn .vbt-dalkar{grid-template-columns:minmax(0,1fr)}',
      '.vbt-dalkur{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.vbt-hy{font:700 10px var(--mono);letter-spacing:.12em;text-align:center;color:var(--mute)}',
      '.vbt-btn{height:36px;min-width:0;padding:0;border:1px solid var(--edge);border-bottom-color:var(--edge2);border-radius:4px;background:var(--key);box-shadow:var(--keysh);color:var(--ink);font:700 18px/1 var(--mono);cursor:pointer;touch-action:manipulation}',
      '.vbt-btn:disabled{opacity:.35;cursor:default}.vbt-btn:focus-visible{outline:2px solid var(--g6);outline-offset:1px}',
      '.vbt-tala{padding:2px 0;text-align:center;font:800 22px/1.15 var(--disp);font-variant-numeric:tabular-nums;color:var(--ink)}.vbt-tala.breytt{color:var(--terra)}',
      '.vbt-kerfi{text-align:center;font:600 10px var(--mono);letter-spacing:.04em;color:var(--mute)}',
      '.vbt-fot{padding:4px 14px 12px;font-size:12.5px;color:var(--mute)}.vbt-fot b{color:var(--ink);font-variant-numeric:tabular-nums}.vbt-fot .villa{color:var(--terra);font-weight:700}',
      '@container t5 (max-width: 1250px){.vbt-rond{grid-template-columns:repeat(4,minmax(0,1fr))}}',
      '@container t5 (max-width: 560px){.vbt-rond{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:10px 8px 4px}.vbt-kort{padding:7px 4px 6px}.vbt-dalkar{gap:4px}.vbt-btn{height:40px}.vbt-nafn{font-size:10.5px}}',
      '@container t5 (max-width: 900px){.vbr{grid-template-columns:minmax(0,1fr)}.vbr-list{position:static;max-height:none}.vbr-items{max-height:260px}.vbr-cols{grid-template-columns:minmax(0,1fr)}.vbr-titill{font-size:22px}}',
      // Breiðir skjáir: einingar hamsins vinstra megin, aðrar hægra megin, borðið í miðjunni.
      '@container t5 (min-width: 1600px){.layout{display:grid;grid-template-columns:minmax(280px,320px) minmax(0,1fr) minmax(300px,360px);gap:18px;align-items:start}' +
        '.layout.nol{grid-template-columns:minmax(0,1fr) minmax(300px,360px)}.layout.nor{grid-template-columns:minmax(280px,320px) minmax(0,1fr)}.layout.nol.nor{grid-template-columns:minmax(0,1fr)}}',
      '@container t5 (min-width: 2600px){.layout{grid-template-columns:minmax(320px,380px) minmax(0,1fr) minmax(340px,420px)}' +
        '.layout.nol{grid-template-columns:minmax(0,1fr) minmax(340px,420px)}.layout.nor{grid-template-columns:minmax(320px,380px) minmax(0,1fr)}.layout.nol.nor{grid-template-columns:minmax(0,1fr)}}',
      '@container t5 (min-width: 1600px){.layout.nol.selh{grid-template-columns:minmax(0,1fr) minmax(380px,560px)}}',
      '@container t5 (max-width: 1599px){.layout.selh .rail.right{order:-1}}',
      '@container t5 (max-width: 760px){.layout.selh .rail.right{display:none}}',
      '@container main (min-width: 1500px){.board{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto;grid-template-areas:"master mine sel"}}',
      // Mjór dálkur (hliðardálkur á breiðum skjá eða sími): vikan sem listi, eitt spjald í röð.
      '@container rail (max-width: 560px){.week{display:flex;flex-direction:column;gap:6px;padding:10px 12px}.day{flex-direction:row;align-items:flex-start;gap:10px}.dh{flex:0 0 100px}.djobs{flex:1}' +
        '.cards{grid-template-columns:minmax(0,1fr)}.lrow{grid-template-columns:44px minmax(0,1fr)}' +
        '.lrow .btn,.lrow .lock,.lrow .tag,.lrow .lakt,.lrow .akacts{grid-column:2;justify-self:start}.lrow .lakt{justify-content:flex-start}}',
      '@container t5 (min-width: 761px){.sel.inline{display:none}}',
      '@container t5 (max-width: 760px){' +
        '.t5{padding:12px 10px 24px}.h1{font-size:30px}' +
        '.acts{width:100%}.who{flex:1 1 100%}.who select{width:100%}.acts .btn{flex:1}' +
        '.modes .lbl{display:none}.seg.modeseg{display:flex;width:100%;overflow-x:auto}.seg.modeseg button{flex:1 0 auto;height:38px;padding:0 12px}' +
        '.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kv{font-size:26px}' +
        '.board{display:flex;flex-direction:column;gap:14px}.board>*{min-width:0;max-width:100%}' +
        '.phone-seg{display:flex;width:100%}.phone-seg button{flex:1;height:40px;font-size:13px}' +
        '.board[data-view="master"] .colmine{display:none}.board[data-view="mitt"] .colmaster{display:none}' +
        '.sel.side{display:none}' +
        '.frow{grid-template-columns:minmax(0,1fr) auto;padding:12px}.frow .age{grid-column:1 / -1}' +
        '.cfgrow{grid-template-columns:30px minmax(0,1fr) auto;padding:10px 12px}.cfgrow .seg{grid-column:2 / -1;justify-self:start}' +
        '.composer,.composer.ny{grid-template-columns:minmax(0,1fr)}.composer textarea{grid-column:auto}.leit{max-width:none}' +
      '}',
      '@media (prefers-reduced-motion: reduce){.btn{transition:none}}'
    ].join('\n');
  }
  // Skuggarótin verður til einu sinni; atburðir hlustaðir á henni (change fer ekki út úr skugga).
  function rot() {
    const v = document.getElementById(VIEW_ID);
    if (!v) return null;
    if (v.shadowRoot) return v.shadowRoot;
    if (!v.attachShadow) return null;
    if (!document.getElementById('t5-fonts')) {
      const l = document.createElement('link');
      l.id = 't5-fonts';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Mono:wght@500;600&display=swap';
      document.head.appendChild(l);
    }
    const r = v.attachShadow({ mode: 'open' });
    const st = document.createElement('style');
    st.textContent = cssText();
    const mount = document.createElement('div');
    mount.className = 't5-mount';
    r.appendChild(st);
    r.appendChild(mount);
    r.addEventListener('click', onClick);
    // 18.09.2026 — stærðarhandfangið í hægri brún einingar. Breiddin er 1/2/3 dálkar
    // af þremur, svo dráttur smellur í þrep: hlutfall bendilsins af breidd ristarinnar.
    r.addEventListener('pointerdown', onBreiddNidur);
    r.addEventListener('change', onChange);
    r.addEventListener('keydown', onKey);
    r.addEventListener('input', onInput);
    r.addEventListener('focusout', e => {
      const el = e.target;
      if (!el || !el.dataset) return;
      if (el.dataset.sk) skola(el.dataset.skid);
      else if (el.dataset.nt) skola('nt:' + el.dataset.id);   // farið úr reitnum = vistað strax
      else if (el.dataset.dn) skola('dn:' + el.dataset.dn);
    });
    ['dragstart', 'dragover', 'drop', 'dragend'].forEach(t => r.addEventListener(t, onDrag));
    r.addEventListener('paste', onPaste);
    document.addEventListener('visibilitychange', () => { if (document.hidden) skolaAllt(); });
    window.addEventListener('pagehide', skolaAllt);
    window.addEventListener('pagehide', skyrVidLokun);      // á eftir skolaAllt: skrif sem útskolunin hóf fara líka með keepalive
    return r;
  }

  /* ── teikning ── */
  const plate = n => '<span class="plate">' + n + '</span>';
  const emptyHtml = t => '<div class="empty"><span class="coin" aria-hidden="true"></span>' + t + '</div>';
  const wellHtml = (label, text) => '<div class="well"><div class="slabel">' + esc(label) + '</div><p>' + esc(text) + '</p></div>';
  const fmtD = iso => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.getDate() + '. ' + MAN[d.getMonth()].slice(0, 3) + '.'; };
  const klukka = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const dis = id => (S.busy[id] ? ' disabled' : '');

  // Fyrirtækið er alltaf smellanlegt. Tengt fyrirtæki fær raunverulega slóð (#company/<id>, 357), svo
  // Ctrl-smellur eða miðjuhnappur opnar það í nýjum flipa; annars er flett upp eftir viðskiptavini.
  function fyrLink(r, cls) {
    const w = whereOf(r);
    if (!w) return '';
    const k = 'clink' + (cls ? ' ' + cls : '');
    return r.fyrirtaeki_id
      ? '<a class="' + k + '" href="#company/' + r.fyrirtaeki_id + '" data-t5="fyr" data-id="' + r.id + '" title="Opna ' + esc(w) + '">' + esc(w) + '</a>'
      : '<button type="button" class="' + k + '" data-t5="fyr" data-id="' + r.id + '" title="Finna ' + esc(w) + '">' + esc(w) + '</button>';
  }
  const eigandaTexti = (r, n) => onBoardOf(r, n) ? 'Á þínu borði'
    : isFree(r) ? (normW(r.assigned_to) === AI_WORKER ? 'Í bunka Charlize' : lagt(canonW(r.assigned_to)) === 'allir' ? 'Á borði Allir' : 'Á Master')
    : 'Hjá ' + normW(r.assigned_to);
  // Sönnun þess að verkið sé líklega búið: reikningur, sala eða skýrsla hjá sama viðskiptavini EFTIR að málið
  // varð til (Engjasel 31: uppsetningarmálið stóð opið þótt reikningurinn hefði verið greiddur 14.08).
  function virkniEftir(r) {
    const v = r && r.customer_base_id ? S.virkni[r.customer_base_id] : null;
    if (!v) return null;
    const upphaf = tStamp(r.created_at), eftir = [];
    const rk = v.sidasti_reikningur, sl = v.sidasta_sala, sk = v.sidasta_skyrsla;
    if (rk && tStamp(rk.dags) > upphaf) eftir.push('reikningur');
    else if (sl && tStamp(sl.dags) > upphaf) eftir.push('sala');
    if (sk && tStamp(sk.dags) > upphaf) eftir.push('skýrsla');
    return eftir.length ? eftir : null;
  }
  const kr = x => Math.round(Number(x) || 0).toLocaleString('is-IS').replace(/,/g, '.') + ' kr.';
  function sagaHtml(r) {
    if (!isOn('saga') || !r.customer_base_id) return '';
    const v = S.virkni[r.customer_base_id], eftir = virkniEftir(r), linur = [];
    if (v === undefined) linur.push('<span class="sg-m">Sæki sögu fyrirtækisins…</span>');
    else if (!v) linur.push('<span class="sg-m">Engin sala né skýrsla skráð hjá þessu fyrirtæki.</span>');
    else {
      const rk = v.sidasti_reikningur, sl = v.sidasta_sala, sk = v.sidasta_skyrsla;
      if (rk) linur.push('<span>🧾 <b>Reikningur ' + esc(rk.num || '') + '</b> · ' + esc(fmtD(rk.dags)) + ' · ' + kr(rk.samtals) + ' · ' +
        (rk.paid_at ? '<em class="ok">greiddur ' + esc(fmtD(rk.paid_at)) + '</em>' : (rk.krafa_sent_at ? 'krafa send ' + esc(fmtD(rk.krafa_sent_at)) + ' · ' : '') + '<em class="bid">ógreiddur</em>') + '</span>');
      if (sl && (!rk || sl.id !== rk.id)) linur.push('<span>🛒 <b>Sala ' + esc(sl.num || '') + '</b> · ' + esc(fmtD(sl.dags)) + ' · ' + kr(sl.samtals) + '</span>');
      if (sk) linur.push('<span>📄 <b>' + (sk.doc_type === 'brunakerfi' ? 'Brunakerfisskýrsla' : 'Úttektarskýrsla') + '</b> · ' + esc(fmtD(sk.dags)) + '</span>');
    }
    return '<div class="saga' + (eftir ? ' buid' : '') + '">' +
      '<div class="sg-h"><span class="slabel">Saga fyrirtækisins</span>' +
        (eftir ? '<span class="sg-buid">✓ Líklega afgreitt — ' + esc(eftir.join(' og ')) + ' eftir að málið varð til</span>' : '') +
        '<span class="grow"></span><button type="button" class="sg-r" data-t5="virkni-uppf"' + (S.virkniBid ? ' disabled' : '') + ' title="Reikna sölur, reikninga og skýrslur upp á nýtt">' + (S.virkniBid ? 'Uppfæri…' : '↻ Uppfæra') + '</button></div>' +
      '<div class="sg-l">' + linur.join('') + '</div>' +
      (v && v.reiknad_at ? '<div class="sg-m">Uppfært ' + esc(fmtD(v.reiknad_at)) + ' kl. ' + klukka(new Date(v.reiknad_at)) + ' · uppfærist sjálfkrafa á hverjum morgni</div>' : '') +
    '</div>';
  }
  // ✨ Tillaga — sami endapunktur og gamla borðið (/api/tv-summary, Haiku): ein stutt lína um næsta skref,
  // vistuð í summary. Nýja borðið sendir sögu fyrirtækisins og póstinn með (dagsetningar fullar svo líkanið geti
  // borið saman „Stofnað" og SAGA), svo „búið og greitt" sjáist. Fyrri samantekt glatast ekki: „Afturkalla".
  async function aiTillaga(id) {
    const r = S.rows.find(x => x.id === id);
    if (!r || S.aiBid[id]) return;
    S.aiBid[id] = true;
    render();
    const fyrri = r.summary || '';
    const dd = s => { const d = new Date(s); return isNaN(d.getTime()) ? '' : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
    try {
      if (isPost(r) && postOf(r) === undefined) await loadPost(r);
      // Borið saman HÉR, ekki af líkaninu (prófað 11.09: nýtt mál með eldri greiddum reikningi fékk „Líklega búið").
      const v = r.customer_base_id ? S.virkni[r.customer_base_id] : null, p = isPost(r) ? postOf(r) : null, eftir = [], eldri = [];
      const upphaf = tStamp(r.created_at), rada = (x, lysing) => (tStamp(x.dags) > upphaf ? eftir : eldri).push(lysing);
      if (v && v.sidasti_reikningur) rada(v.sidasti_reikningur, 'reikningur ' + (v.sidasti_reikningur.num || '') + ' ' + dd(v.sidasti_reikningur.dags) + (v.sidasti_reikningur.paid_at ? ' greiddur ' + dd(v.sidasti_reikningur.paid_at) : ' ógreiddur'));
      if (v && v.sidasta_skyrsla) rada(v.sidasta_skyrsla, (v.sidasta_skyrsla.doc_type === 'brunakerfi' ? 'brunakerfisskýrsla ' : 'úttektarskýrsla ') + dd(v.sidasta_skyrsla.dags));
      const texti = String((p && (p.body_preview || p.snippet)) || r.notes || '').replace(/\s+/g, ' ').trim();
      const notes = ['Stofnað ' + dd(r.created_at), eigandaTexti(r, nu()), r.due_at ? 'frestur ' + dd(r.due_at) : '',
        isPost(r) ? (r.svarad_at ? 'svarað ' + dd(r.svarad_at) : 'ósvarað') : '',
        // Eldri saga er EKKI send: líkanið las hana sem „búið" (prófað 11.09, 6/6 röng). Hún sést í spjaldinu.
        eftir.length ? 'SAGA EFTIR STOFNUN: ' + eftir.join(', ') : '',
        texti ? 'TEXTI: ' + texti : ''].filter(Boolean).join(' · ');
      const res = await fetch('/api/tv-summary', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: [{ id: r.id, customer_nafn: whereOf(r), type: tegMals(r), title: r.title || '', notes }] }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
      const txt = String((data.summaries || {})[String(r.id)] || '').trim();
      if (!txt) { toast('Engin tillaga kom til baka.', true); return; }
      // Borðið veit hvort eitthvað kom eftir stofnun — það ræður, ekki líkanið.
      if (!eftir.length && /l[ií]klega\s+b[uú]i[ðd]/i.test(txt)) {
        toast('Tillagan sagði „Líklega búið" en engin sala eða skýrsla kom eftir að málið varð til — ekki vistað.', true);
        return;
      }
      const rows = await patchRow(id, { summary: txt });
      if (!rows.length) throw new Error('málið fannst ekki');
      r.summary = txt;
      toast('✨ ' + txt, false, fyrri ? () => act(id, async () => { await patchRow(id, { summary: fyrri }); toast('Fyrri samantekt er komin aftur'); }) : null);
    } catch (e) {
      toast('Tillagan kom ekki: ' + ((e && e.message) || e), true);
    } finally {
      delete S.aiBid[id];
      render();
      load(true);
    }
  }
  async function uppfaeraVirkni() {
    const c = sb();
    if (!c || S.virkniBid) return;
    S.virkniBid = true;
    render();
    let skil = null;
    try { const r = await c.rpc('bh_fyrirtaeki_virkni_uppfaera'); if (r.error) throw r.error; skil = r.data; }
    catch (e) { toast('Uppfærslan tókst ekki: ' + ((e && e.message) || e), true); }
    S.virkni = {};
    S.virkniBid = false;
    await load(true);
    if (skil != null) toast(skil === -1 ? 'Sagan var uppfærð fyrir innan við mínútu — sýni nýjustu stöðu.' : 'Saga fyrirtækja uppfærð');
  }

  function feedRow(r, valid) {
    const a = ageDays(r), sam = linur(samantekt(r), 4).slice(0, 600), n = nu(), w = fyrLink(r);
    const tags = samtMerki(r) +
      (r.important ? '<span class="tag hot">Áríðandi</span>' : '') +
      (r.due_at ? '<span class="tag">Frestur ' + esc(fmtD(r.due_at)) + '</span>' : '') +
      (r.status === 'i_vinnslu' ? '<span class="tag">Í vinnslu</span>' : '') +
      (isPost(r) && r.svarad_at ? '<span class="tag ok">Svarað</span>' : '') +
      (virkniEftir(r) ? '<span class="tag ok" title="Reikningur, sala eða skýrsla eftir að málið varð til">Líklega afgreitt</span>' : '') +
      (!isFree(r) ? '<span class="tag">' + esc(eigandaTexti(r, n)) + '</span>' : '') +
      skyrirHamir(r).filter(k => k !== cfg().mode).map(k => '<span class="tag ham">' + esc(M(k).l) + '</span>').join('');
    const hlid = onBoardOf(r, n) ? '<span class="lock">Þitt</span>'
      : '<button type="button" class="btn iv sm" data-t5="take" data-id="' + r.id + '"' + dis(r.id) +
        (isFree(r) ? '>' : ' title="Færa málið af borði ' + esc(normW(r.assigned_to)) + ' á þitt borð">') +
        (S.busy[r.id] ? 'Augnablik…' : isFree(r) ? 'Taka ›' : 'Færa á mig ›') + '</button>';
    return '<article class="frow" aria-current="' + !!valid + '">' +
      '<div class="age ' + ageCls(a) + '" title="' + a + ' dagar síðan málið varð til">' + a + 'D</div>' +
      '<div class="fbody"><div class="kick">' + esc(tegMals(r)) + (w ? ' · ' + w : '') + '</div>' +
        '<button type="button" class="fpick" data-t5="skoda" data-id="' + r.id + '" title="Skoða málið">' +
          '<span class="rt">' + esc(r.title || '(ónefnt mál)') + '</span>' +
          (sam ? '<span class="ai">' + esc(sam) + '</span>' : '') + '</button>' +
        // Master líka: það á ekki að þurfa að opna mál til að skrifa eina setningu.
        ntReitur(r) +
        (tags ? '<div class="tags">' + tags + '</div>' : '') + malAdg(r, 'lina') + '</div>' + hlid +
    '</article>';
  }
  // Svartakkar á máli sem bíður samþykkis (368v).
  // 368z: í Vinnublöðum heita tveir fyrstu „✓ Staðfesta" og „▶ Setja í vinnslu" (orð Agnars) — sömu svör og annars staðar.
  const samtTakkar = (r, staerd, vbr) => {
    const k = (v, cls, texti, titill) => '<button type="button" class="btn ' + cls + staerd + '" data-t5="samt-svar" data-v="' + v + '" data-id="' + r.id + '"' + dis(r.id) + ' title="' + titill + '">' + texti + '</button>';
    return k('samthykkt', 'gold', vbr ? '✓ Staðfesta' : '✓ Samþykkja', 'Samþykkja tillöguna — Claude vinnur málið; lokasending er alltaf þín') +
      k('vinnsla', 'iv', vbr ? '▶ Setja í vinnslu' : '▶ Í vinnslu', 'Setja málið í vinnslu hjá Claude') +
      k('hafnad', 'iv', '✕ Hafna', 'Hafna — málinu er lokað og ekkert gert') +
      '<button type="button" class="btn iv' + staerd + '" data-t5="samt-sky" data-id="' + r.id + '"' + dis(r.id) + ' title="Skrifa skýringu — Claude fer aftur yfir málið og endurmetur tillöguna">💬 Skýring</button>';
  };
  // 368w: óvistuð drög skýringar — val eins vafra, því má localStorage geyma þau þar til þau eru send.
  const SKY_LYKILL = 'bord_samt_skyring_drog';
  function skyDrogVista(id, texti) {
    try {
      const o = JSON.parse(localStorage.getItem(SKY_LYKILL) || '{}');
      if (texti) o[id] = texti; else delete o[id];
      localStorage.setItem(SKY_LYKILL, JSON.stringify(o));
    } catch (_) {}
  }
  function skyDrogLesa(id) {
    try { return JSON.parse(localStorage.getItem(SKY_LYKILL) || '{}')[id] || ''; } catch (_) { return ''; }
  }
  function skyRitillHtml(r) {
    if (!S.samtSkyOpid[r.id]) return '';
    if (S.samtSkyDrog[r.id] == null) S.samtSkyDrog[r.id] = skyDrogLesa(r.id);
    return '<div class="bm samt-sky"><label><span class="slabel">Skýring til Claude — hvað vantar, hvað er rangt eða hvað viltu frekar?</span>' +
      '<textarea data-samtsky="1" data-id="' + r.id + '" rows="4" placeholder="Claude les skýringuna, fer aftur yfir málið og setur endurmetna tillögu á borðið.">' + esc(S.samtSkyDrog[r.id] || '') + '</textarea></label>' +
      '<div class="sacts"><button type="button" class="btn gold" data-t5="samt-sky-senda" data-id="' + r.id + '"' + dis(r.id) + '>Senda til Claude</button>' +
      '<button type="button" class="btn iv" data-t5="samt-sky" data-id="' + r.id + '">Hætta við</button></div></div>';
  }
  function mineRow(r, valid) {
    const a = ageDays(r), w = fyrLink(r), sam = linur(samantekt(r), 4).slice(0, 600);
    return '<div class="mrow" aria-current="' + valid + '">' +
      '<span class="pin" aria-hidden="true">◆</span>' +
      '<div><div class="kick">' + esc(tegMals(r)) + (w ? ' · ' + w : '') + '</div>' +
        '<button type="button" class="mpick" data-t5="select" data-id="' + r.id + '">' +
          '<span class="mt">' + esc(r.title || '(ónefnt mál)') + '</span>' +
        '</button>' +
        // 18.09.2026: samantekt Claude er lestur, en athugasemdin er reitur. Áður var
        // hún inni í `.mpick`-hnappinum — hnappur í hnappi er ógilt og ekki hægt að
        // smella á hana til að skrifa.
        (sam && !valid ? '<span class="mn les">' + esc(sam) + '</span>' : '') +
        (valid ? '' : ntReitur(r)) +
        '<div class="mfoot"><span class="age ' + ageCls(a) + '">' + a + 'D</span>' +
          (r.due_at ? '<span class="lock">Frestur ' + esc(fmtD(r.due_at)) + '</span>' : '') +
          samtMerki(r) +
          (r.important ? '<span class="tag hot">Áríðandi</span>' : '') +
          (isPost(r) ? (r.svarad_at ? '<span class="tag ok">Svarað</span>' : '<span class="tag">Bíður svars</span>') : '') +
          (virkniEftir(r) ? '<span class="tag ok">Líklega afgreitt</span>' : '') +
          '<span class="grow"></span>' +
          (erSamthykki(r) ? samtTakkar(r, ' sm') :
            '<button type="button" class="btn iv sm" data-t5="done" data-id="' + r.id + '"' + dis(r.id) + '>✓ Lokið</button>' +
            '<button type="button" class="btn iv sm" data-t5="giveback" data-id="' + r.id + '"' + dis(r.id) + '>↩ Skila</button>') +
          '<button type="button" class="btn iv sm" data-t5="mal-ari" data-id="' + r.id + '"' + dis(r.id) + ' title="' + (r.important ? 'Taka áríðandi-merkið af' : 'Merkja áríðandi') + '">' + (r.important ? '★' : '☆') + '</button>' +
          '<button type="button" class="btn iv sm" data-t5="mal-eyda" data-id="' + r.id + '"' + dis(r.id) + ' title="Eyða málinu — hægt að afturkalla">🗑</button>' +
        '</div></div></div>';
  }
  // Breyta máli — sömu reitir og „⋯ Meira" á gamla borðinu. Drög lifa í S.bmDrog (valið mál er teiknað
  // tvisvar: hliðarspjald og í línunni í síma) og teikning bíður á meðan skrifað er.
  function breytaHtml(r) {
    if (!isOn('breyta')) return '';
    if (!S.bmOpid[r.id]) return '<button type="button" class="sg-r bm-t" data-t5="bm-opna" data-id="' + r.id + '">✏️ Breyta máli</button>';
    const d = S.bmDrog[r.id] || {}, g = (k, v) => (d[k] != null ? d[k] : v), reitur = (k, x) => ' data-bm="' + k + '" data-id="' + r.id + '"' + (x || '');
    return '<div class="bm">' +
      '<label><span class="slabel">Titill</span><input' + reitur('title') + ' value="' + esc(g('title', r.title || '')) + '"></label>' +
      '<label><span class="slabel">Lýsing og athugasemdir</span><textarea' + reitur('notes') + ' rows="4">' + esc(g('notes', r.notes || '')) + '</textarea></label>' +
      '<div class="bm-r">' +
        '<label><span class="slabel">Frestur</span><input type="date"' + reitur('due') + ' value="' + esc(g('due', r.due_at ? ymd(new Date(r.due_at)) : '')) + '"></label>' +
        '<label><span class="slabel">Staða</span><select' + reitur('status') + '>' +
          STODUR.map(s => '<option value="' + s[0] + '"' + (g('status', r.status || 'nytt') === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select></label>' +
        '<label class="bm-c"><input type="checkbox"' + reitur('important', g('important', !!r.important) ? ' checked' : '') + '> Áríðandi</label></div>' +
      '<div class="sacts"><button type="button" class="btn gold" data-t5="bm-vista" data-id="' + r.id + '"' + dis(r.id) + '>Vista breytingar</button>' +
        '<button type="button" class="btn iv" data-t5="bm-opna" data-id="' + r.id + '">Loka</button><span class="grow"></span>' +
        '<button type="button" class="btn iv" data-t5="bm-eyda" data-id="' + r.id + '"' + dis(r.id) + '>🗑 Eyða máli</button></div>' +
    '</div>';
  }
  function bmSkra(el) {
    const id = Number(el.dataset.id);
    if (id) (S.bmDrog[id] = S.bmDrog[id] || {})[el.dataset.bm] = el.type === 'checkbox' ? el.checked : el.value;
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * INNSLÁTTUR BEINT Á BORÐINU (18.09.2026 — Agnar).
   *
   *   „it takes time to go to breyta máli and put in text in a bar below,
   *    unnecesery complications" · „everything need to be easy to wright
   *    something down."
   *
   * Áður þurfti fjögur skref til að skrifa eina setningu: opna mál → ✏️ Breyta
   * máli → skrifa → Vista breytingar. Nú er textinn sjálfur reiturinn.
   *
   * Vistun fer um `patchRow`, sem les `.error` og kastar. supabase-js kastar
   * ALDREI sjálft við `.update()` — reitur sem segði „Vistað" án þess að lesa
   * svarið væri að ljúga. Hér er auk þess lesinn til baka textinn sem lenti í
   * gagnagrunninum og borinn saman við þann sem var sendur.
   *
   * Mistakist vistun er textinn EKKI hreinsaður: hann lifir í `S.ntDrog`, stendur
   * áfram í reitnum og reiturinn segir frá. Ekkert hverfur.
   */
  const _ntRod = {};
  const ntGildi = r => (S.ntDrog[r.id] != null ? S.ntDrog[r.id] : String(r.notes || ''));
  const ntRadir = texti => Math.min(16, Math.max(4, String(texti).split('\n').length + 1));
  function ntStadaHtml(id) {
    const s = S.ntStada[id] || { t: '', s: '' };
    return '<span class="ntst ' + s.t + '" data-ntst="' + id + '">' + esc(s.s) + '</span>';
  }
  // Staðan er stimpluð beint á stakan reit — ekki teiknað upp á nýtt, því
  // teikning undir fingrunum tekur bendilinn og skrunið.
  function ntStimpla(id) {
    const root = rot();
    if (!root) return;
    const s = S.ntStada[id] || { t: '', s: '' };
    root.querySelectorAll('[data-ntst="' + id + '"]').forEach(el => {
      el.textContent = s.s || '';
      el.className = 'ntst ' + s.t;
    });
  }
  // kort = á hvítu spjaldi · dark = í svarta spjaldinu
  function notaHtml(r, cls, label) {
    const g = ntGildi(r);
    return '<div class="nt' + (cls ? ' ' + cls : '') + '">' +
      '<div class="nthead"><span class="slabel">' + esc(label || 'Lýsing og athugasemdir') + '</span>' +
      '<span class="grow"></span>' + ntStadaHtml(r.id) + '</div>' +
      '<textarea data-nt="notes" data-id="' + r.id + '"' + (cls === 'kort' ? ' data-nt-kort="1"' : '') +
        ' rows="' + ntRadir(g) + '" aria-label="Lýsing og athugasemdir"' +
        ' placeholder="Skrifaðu hér — vistast sjálfkrafa. Ctrl+Enter vistar strax.">' + esc(g) + '</textarea></div>';
  }
  // Hvíta svæðið á korti: fjórar línur sem smellt er á og þá er hægt að skrifa.
  function ntReitur(r) {
    if (S.ntOpid[r.id]) return notaHtml(r, 'kort');
    const g = ntGildi(r), synt = linur(g, 4).slice(0, 600);
    return '<button type="button" class="mn' + (synt ? '' : ' tom') + '" data-t5="nt-opna" data-id="' + r.id +
      '" title="Smelltu og skrifaðu — vistast sjálfkrafa">' +
      (synt ? esc(synt) : '✎ Skrifa athugasemd…') + '</button>';
  }
  function skrifaNota(el) {
    const id = Number(el.dataset.id);
    if (!id) return;
    S.ntDrog[id] = el.value;
    S.ntStada[id] = { t: 'bid', s: 'Óvistað…' };
    ntStimpla(id);
    bida('nt:' + id, () => vistaNota(id));
  }
  // Ein röð á hvert mál: tvær vistanir á sama mál geta ekki farið fram úr hvor annarri.
  function vistaNota(id) {
    const nyr = (_ntRod[id] || Promise.resolve()).catch(() => {}).then(() => ntVistaNu(id));
    _ntRod[id] = nyr.catch(() => {});
    return nyr;
  }
  async function ntVistaNu(id) {
    const texti = S.ntDrog[id];
    if (texti == null) return;
    const r = S.rows.find(x => x.id === id);
    if (r && texti === String(r.notes || '')) {   // ekkert breyttist — engin skrif, engin fullyrðing
      delete S.ntDrog[id];
      S.ntStada[id] = null;
      ntStimpla(id);
      return;
    }
    S.ntStada[id] = { t: 'vistar', s: 'Vista…' };
    ntStimpla(id);
    try {
      const rows = await patchRow(id, { notes: texti });
      if (!rows.length) throw new Error('málið fannst ekki');
      if (String(rows[0].notes || '') !== texti) throw new Error('las annan texta til baka úr gagnagrunninum');
      if (r) r.notes = texti;                     // svo næsta teikning sýni nýja textann
      if (S.ntDrog[id] === texti) delete S.ntDrog[id];   // stafir sem bættust við á meðan bíða áfram
      // Tveir ritlar á sama reit: „Breyta máli" geymir sín eigin drög. Væru þau
      // eldri myndi „Vista breytingar" skrifa yfir textann sem var nýbúið að vista.
      if (S.bmDrog[id] && S.bmDrog[id].notes != null) delete S.bmDrog[id].notes;
      S.ntStada[id] = { t: 'ok', s: 'Vistað kl. ' + klukka(new Date()) };
    } catch (e) {
      // Textinn stendur áfram í S.ntDrog og þar með í reitnum.
      S.ntStada[id] = { t: 'villa', s: '⚠ Vistaðist ekki (' + ((e && e.message) || e) + ') — textinn þinn stendur hér áfram.' };
    }
    ntStimpla(id);
  }
  // 19.09.2026 (Agnar: „henda burtu þessum krass blað feature"): Krassblaðið er farið af
  // borðinu — ræman, einingin (23) og kassinn á Skipulagsborðinu. Textinn sem var skrifaður
  // stendur óhreyfður í skipulagsbord.by_staff.<nafn>.krass; hér er hann hvorki lesinn né skrifaður.
  function selHtml(r, opt) {
    opt = opt || {};                  // { rymi: true } = í Samþykkja: öll lýsingin, enginn ✕
    if (!r) return emptyHtml('Smelltu á hvaða mál sem er til að skoða það — eða taktu næsta af Master.<button type="button" class="btn gold" data-t5="take-next">Taka næsta af Master ›</button>');
    const n = nu(), a = ageDays(r), post = isPost(r), minn = onBoardOf(r, n), laust = isFree(r), eigandi = normW(r.assigned_to);
    let well;
    if (post) {
      const p = postOf(r);
      if (p === undefined) loadPost(r);
      if (p === undefined || p === null) well = wellHtml('Pósturinn', 'Sæki póstinn…');
      else if (p === false) well = wellHtml('Pósturinn', 'Upprunapósturinn fannst ekki. Samantekt málsins stendur hér að ofan.');
      else {
        let txt = String(p.body_preview || p.snippet || '').trim();
        let hver = p.sender_name || p.sender_email || '';
        try {
          if (window.SamskiptiTexti && SamskiptiTexti.eiginTexti) txt = SamskiptiTexti.eiginTexti(txt) || txt;
          if (window.SamskiptiTexti && SamskiptiTexti.hreintNafn) hver = SamskiptiTexti.hreintNafn(p.sender_name, p.sender_email);
        } catch (_) {}
        well = wellHtml(hver + (p.received_at ? ' · ' + fmtD(p.received_at) : ''), txt.slice(0, 1800) || '(enginn texti)');
      }
    } else {
      // 18.09.2026: hér stóð LESTUR („Engin lýsing skráð."). Nú er þetta reiturinn
      // sjálfur — svarta spjaldið er staðurinn sem er opinn þegar mál er valið.
      well = '<div class="well ntwell">' + notaHtml(r, 'dark') + '</div>';
    }
    // Á póstmáli stendur pósturinn sjálfur efst og athugasemdareiturinn fyrir neðan:
    // báðir hlutir eiga heima þar, textinn hans og textinn þeirra.
    if (post) well += '<div class="well ntwell">' + notaHtml(r, 'dark', 'Þín athugasemd') + '</div>';
    const p = post ? postOf(r) : null;
    const getaSvarad = !!(post && p && p.sender_email);
    const b = (cls, t5, txt) => '<button type="button" class="btn ' + cls + '" data-t5="' + t5 + '" data-id="' + r.id + '"' + dis(r.id) + '>' + txt + '</button>';
    const taka = minn ? '' : b('gold lg', 'take', S.busy[r.id] ? 'Augnablik…' : laust ? 'Taka á mitt borð ›' : 'Færa á mitt borð ›');
    const svara = getaSvarad ? b(minn ? 'gold lg' : 'iv', 'reply', '↩ Svara í sama þræði') : '';
    const lokid = minn && !getaSvarad ? b('gold lg', 'done', '✓ Merkja lokið') : b('iv', 'done', '✓ Lokið');
    const skila = minn ? b('iv', 'giveback', '↩ Skila á Master') : '';
    const fyr = whereOf(r) ? b('iv', 'fyr', '🏢 Opna fyrirtæki ›') : '';
    // 18.09.2026 — BEINT Í SKÝRSLU OG REIKNING.
    // Hnappurinn birtist aðeins þegar fyrirtækið stendur sannanlega í
    // `v_gleymt_ad_rukka_uttekt`; annars fyndi vinnuglugginn ekkert og hnappurinn
    // yrði enn einn sem lofar og skilar engu. Listinn er sóttur (5 mín geymsla)
    // aðeins fyrir mál sem bera bæði fyrirtæki og upphæð.
    const rukkaTakki = (() => {
      const fid = r.fyrirtaeki_id || null;
      if (!fid || !upphaedMals(r)) return '';
      const g = gogn('gleymt', saekjaGleymt);
      if (!g || !g.data) return '';   // enn að sækja, eða sókn brást — ekkert lofað
      const a = (g.data.uttekt || []).some(x => +x.fyrirtaeki_id === +fid);
      if (!a) return '';
      return '<button type="button" class="btn gold" data-t5="vinna-gleymt" data-fid="' + fid +
        '" title="Skýrsla + reikningur — reikningurinn endar ÓSENDUR í Kröfuyfirliti, þú ferð yfir og sendir">🧾 Gera skýrslu og reikning ›</button>';
    })();
    const setja = '<label class="setja"><span class="slabel">Setja á</span><select data-t5="assign" data-id="' + r.id + '"' + dis(r.id) + ' aria-label="Setja málið á">' +
      '<option value=""' + (!canonW(r.assigned_to) ? ' selected' : '') + '>Master</option>' +
      folk().map(x => '<option' + (lagt(x) === lagt(canonW(r.assigned_to)) ? ' selected' : '') + '>' + esc(x) + '</option>').join('') +
      (canonW(r.assigned_to) && !folk().some(x => lagt(x) === lagt(canonW(r.assigned_to))) ? '<option selected>' + esc(canonW(r.assigned_to)) + '</option>' : '') +
      '</select></label>';
    const stada = minn ? 'Á þínu borði' : laust ? 'Á Master' : 'Á borði ' + eigandi;
    const meta = [tegMals(r), erSamthykki(r) ? 'Bíður samþykkis' : svarBidur(r) ? SVOR[svarMals(r)].merki : '', stada, r.due_at ? 'Frestur ' + fmtD(r.due_at) : '', r.important ? 'Áríðandi' : '', post ? (r.svarad_at ? 'Svarað ' + fmtD(r.svarad_at) : 'Bíður svars') : ''].filter(Boolean).join(' · ');
    const w = fyrLink(r, 'dk');
    return '<div class="shead"><span class="plate dark">04</span><span class="slabel">' + (minn ? 'Valið mál' : 'Til skoðunar') + '</span><span class="grow"></span>' +
        '<span class="age ' + ageCls(a) + '">' + a + 'D</span>' + (opt.rymi ? '' : '<button type="button" class="sx" data-t5="sel-close" aria-label="Loka málinu">✕</button>') + '</div>' +
      '<h3 class="stitle">' + esc(r.title || '(ónefnt mál)') + '</h3>' +
      (w ? '<div class="sfyr">🏢 ' + w + '</div>' : '') +
      '<div class="smeta">' + esc(meta) + '</div>' +
      (samantekt(r) ? '<div class="aisum"><span class="slabel">Samantekt</span>' + esc(samantekt(r).slice(0, 600)) + '</div>' : '') +
      sagaHtml(r) + skjolHtml(r) + well +
      '<div class="sacts">' + (minn && erSamthykki(r) ? samtTakkar(r, ' lg') + rukkaTakki + fyr : taka + svara + lokid + skila + rukkaTakki + fyr) + b('iv', 'mal-ari', r.important ? '★ Áríðandi af' : '☆ Áríðandi') + b('iv', 'mal-eyda', '🗑 Eyða máli') + '</div>' + (minn && erSamthykki(r) ? skyRitillHtml(r) : '') +
      '<div class="sacts sm2">' + setja + aksturVal(r) + (!r.fyrirtaeki_id ? b('iv', 'tf-leita', '🏢 Tengja fyrirtæki') : '') + b('iv', 'sk-add', '📋 Á skipulagsborð') + (jm => jm ? b('iv', 'vd-opna', '🗓 ' + fmtD(jm.date) + (jm._n !== nu() ? ' · ' + jm._n : '')) : b('iv', 'vd-add', '🗓 Á dagskrá'))(jobOfMal(r.id)) +
        '<button type="button" class="btn iv" data-t5="ai-tillaga" data-id="' + r.id + '"' + (S.aiBid[r.id] ? ' disabled' : '') +
          ' title="Gervigreind les málið, póstinn og sögu fyrirtækisins og leggur til næsta skref">' + (S.aiBid[r.id] ? '… hugsa' : '✨ Tillaga') + '</button></div>' + hamirHtml(r) + breytaHtml(r);
  }

  /* ── 368aa: SAMÞYKKJA — vinnusvæði (hamurinn samthykkja) ── */
  // Agnar 14.09.2026: „gert annann Ham á Agnar Sem heitir samþykkir.... eitthvað sem er í raun tilbúið, sem ég þarf bara að
  // samþykkja". Mál á borði þess sem er við vélina sem bíða svars, í þremur hlutum: tilbúið (samthykki), þarf svar (samthykki
  // + merkið spurning) og svarað (svar:* — bíður Claude). Hægra megin er sama spjald og Valið mál, með allri lýsingunni.
  const SPURNING = 'spurning';
  const samtHluti = r => (!erSamthykki(r) ? 2 : tagList(r).indexOf(SPURNING) >= 0 ? 1 : 0);
  const samtListi = n => S.rows.filter(r => iHam(r, SAMT_HAM)).sort((a, b) => samtHluti(a) - samtHluti(b) || rodunSamt(a, b));
  function samtRymiHtml(n) {
    if (!S.loaded) return emptyHtml('Sæki mál…');
    const listi = samtListi(n);
    if (!listi.length) return emptyHtml('Ekkert bíður svars hjá ' + esc(n) + '. Nýjar tillögur birtast hér um leið og þær eru tilbúnar.');
    let val = listi.find(r => r.id === S.samtVal);
    if (!val) { val = listi.find(erSamthykki) || listi[0]; S.samtVal = val.id; }
    const nr = listi.indexOf(val);
    const hlutar = [['Tilbúið — bara samþykkja', 0], ['Þarf svar frá þér', 1], ['Svarað · bíður Claude', 2]].map(h => [h[0], listi.filter(r => samtHluti(r) === h[1])]);
    const item = r => {
      const ef = aiLine(r), undir = [whereOf(r), ageDays(r) + ' d.', svarBidur(r) ? SVOR[svarMals(r)].merki : ''].filter(Boolean).join(' · ');
      // 18.09.2026: upphæðin sést, svo röðin sé læsileg. „≈" af því hún er lesin
      // úr textanum og getur verið áætlun — hún er vísbending, ekki bókhald.
      const u = upphaedMals(r);
      return '<button type="button" class="vbr-item' + (erSamthykki(r) ? '' : ' svarad') + '" data-t5="samt-velja" data-id="' + r.id + '" aria-current="' + (r.id === val.id) + '">' +
        (u ? '<span class="samt-kr" title="Upphæð lesin úr texta málsins — vísbending, ekki bókhald">≈ ' + esc(kr(u)) + '</span>' : '') +
        '<b>' + esc(r.title || '(ónefnt mál)') + '</b>' + (ef ? '<span class="s samt-ef">' + esc(ef) + '</span>' : '') + '<span class="s">' + esc(undir) + '</span></button>';
    };
    return '<div class="vbr samt">' +
      '<aside class="panel vbr-list" aria-label="Bíður svars">' +
        '<header class="phead">' + plate('✓') + '<h2 class="ptitle">Samþykkja</h2><span class="sum">' + hlutar[0][1].length + ' tilbúin · ' + hlutar[1][1].length + ' spurningar · ' + hlutar[2][1].length + ' hjá Claude</span></header>' +
        '<div class="vbr-items">' + hlutar.map(h => (h[1].length ? '<div class="vbr-sect">' + h[0] + ' · ' + h[1].length + '</div>' + h[1].map(item).join('') : '')).join('') + '</div>' +
      '</aside>' +
      '<div class="vbr-main">' +
        '<div class="vbr-top">' +
          '<button type="button" class="btn iv sm" data-t5="samt-fara" data-v="-1"' + (nr <= 0 ? ' disabled' : '') + '>‹ Fyrra</button>' +
          '<button type="button" class="btn iv sm" data-t5="samt-fara" data-v="1"' + (nr >= listi.length - 1 ? ' disabled' : '') + '>Næsta ›</button>' +
          '<span class="vbr-meta">' + (nr + 1) + ' af ' + listi.length + '</span></div>' +
        '<section class="sel samt-sel" aria-live="polite">' + selHtml(val, { rymi: true }) + '</section>' +
      '</div>' +
    '</div>';
  }
  // Eftir svar opnast næsta mál sem bíður — ekki ef vistun mistókst (málið ber þá enn samthykki).
  function samtEftirSvar(id, bid) {
    if ((M(cfg().mode) || {}).rymi !== SAMT_HAM) return;
    const listi = samtListi(nu()), i = listi.findIndex(r => r.id === id);
    const naesta = listi.slice(i + 1).concat(listi.slice(0, Math.max(0, i))).find(r => r.id !== id && erSamthykki(r));
    Promise.resolve(bid).then(() => {
      const r = S.rows.find(x => x.id === id);
      if (r && erSamthykki(r)) return;
      if (naesta && S.samtVal === id) { S.samtVal = naesta.id; render(); vbrTilBaka(); }
    });
  }

  /* ── 368y: VINNUBLÖÐ — vinnusvæði (hamurinn vinnublod, board:false) ── */
  const VBR_HAM = 'vinnublod';
  const vbrMal = () => S.rows.filter(r => rymisHamir(r).indexOf(VBR_HAM) >= 0);
  /* 18.09.2026 — BÚIN VINNUBLÖÐ.
   * `load()` sækir aldrei lokuð mál (.or(status.is.null,status.neq.lokad)), svo
   * vinnublað sem búið var að svara hvarf alveg. Það var ekki falið — það var
   * aldrei sótt. Hér eru þau sótt LÖT, aðeins þegar beðið er um þau, og geymd í
   * 5 mín eins og aðrar latar einingar; að taka þau með í hverri hleðslu myndi
   * draga hvert lokað mál í kerfinu inn á borðið fyrir alla.
   */
  async function saekjaBuinVbr() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    // MÆLT 18.09.2026: `tags` er JSONB, ekki text[]. Fylkis-formið
    // .contains('tags', ['ham:vinnublod']) fellur á 'invalid input syntax for type json';
    // JSON-strengurinn virkar. Villan birtist á skjánum þegar hún kom, sem var rétt.
    //
    // Athugasemd MÁ EKKI standa inni í keðjunni sjálfri: audit-pagination les
    // keðjuna sem eina heild og sér þá ekki `.limit(60)` hér að neðan.
    const r = await c.from('thjonustubeidni').select(SEL)
      .is('deleted_at', null).is('archived_at', null)
      .eq('status', 'lokad')
      .contains('tags', JSON.stringify(['ham:vinnublod']))
      .order('updated_at', { ascending: false }).limit(60);
    if (r.error) throw r.error;
    return r.data || [];
  }
  // Búin blöð eru aðeins sótt þegar kveikt hefur verið á þeim.
  function buinVbr() {
    if (!S.vbrBuin) return { radir: [], bid: false, villa: '' };
    const g = gogn('vbr:buin', saekjaBuinVbr);
    return { radir: g.data || [], bid: !!g.bid && !g.data, villa: g.villa || '' };
  }
  const vbrBidur = r => erSamthykki(r);
  const saraIdMals = r => { const t = tagList(r).find(x => /^sara:\d+$/.test(x)); return t ? Number(t.slice(5)) : null; };
  const vbrNafn = (r, s) => (s && s.fyrirtaeki) || whereOf(r) || String(r.title || '').replace(/^Vinnublað — staðfesta lestur:\s*/, '') || '(ónefnt)';
  // Röð blaðanna eins og þau voru lesin (sara_yfirferd.rod) — sama röð og bunkinn sjálfur; nafn þegar röð vantar.
  const vbrSaraRod = r => { const s = (S._vbrSara || []).find(x => x.id === saraIdMals(r)); return s && s.rod != null ? Number(s.rod) : 1e9; };
  // 368z2: innan „Bíða" og „Svarað" er nýjast tekið út efst. Úttektardagur = dagsetning blaðsins, annars dagur í blaðnúmeri
  // („30.08-bunki"), annars mánuður — bil („Maí-Júní") og ályktaður mánuður teljast degi á undan föstum mánuði, og mánuður
  // seinna á árinu en núna er frá í fyrra. Óþekktur dagur fer neðst; jafn dagur heldur röð bunkans.
  const MAN_IS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'agust', 'september', 'oktober', 'november', 'desember'];
  const vbrFella = x => String(x || '').toLowerCase().replace(/[áà]/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/[óö]/g, 'o').replace(/ú/g, 'u').replace(/ý/g, 'y').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae');
  function vbrTekidUt(s) {
    if (!s) return -1;
    const nuna = new Date(), manNu = nuna.getMonth() + 1;
    const ar = m => (m > manNu ? nuna.getFullYear() - 1 : nuna.getFullYear());
    const d = String(s.dagsetning || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (d) return Number(d[3]) * 10000 + Number(d[2]) * 100 + Number(d[1]);
    const iso = String(s.dagsetning || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return Number(iso[1]) * 10000 + Number(iso[2]) * 100 + Number(iso[3]);
    const b = String(s.blad_nr || '').match(/(^|\D)(\d{1,2})\.(\d{1,2})(?![.\d])/);
    if (b && Number(b[3]) >= 1 && Number(b[3]) <= 12 && Number(b[2]) >= 1 && Number(b[2]) <= 31) return ar(Number(b[3])) * 10000 + Number(b[3]) * 100 + Number(b[2]);
    const t = vbrFella(s.manudur);
    let m = 0;
    (t.match(/[a-z]+/g) || []).forEach(w => { const i = MAN_IS.indexOf(w) + 1; if (i > m) m = i; });
    if (!m) return -1;
    return ar(m) * 10000 + m * 100 + (/-|alyktad|\?/.test(t) ? 14 : 15);
  }
  const vbrTekidUtMals = r => vbrTekidUt((S._vbrSara || []).find(x => x.id === saraIdMals(r)));
  const vbrRod = (a, b) => (vbrBidur(b) ? 1 : 0) - (vbrBidur(a) ? 1 : 0) || vbrTekidUtMals(b) - vbrTekidUtMals(a) || vbrSaraRod(a) - vbrSaraRod(b) || vbrNafn(a).localeCompare(vbrNafn(b), 'is');
  const bladNr = s => { const b = String((s && s.blad_nr) || '').trim(); return !b ? '' : /^blað/i.test(b) ? b : 'Blað ' + b; };
  // Blöðin á borði þess sem er við vélina; eigi hann ekkert blað sjást öll (til skoðunar — svartakkar aðeins eigandans).
  function vbrListi(n) {
    const allt = vbrMal(), minn = allt.filter(r => onBoardOf(r, n));
    return (minn.length ? minn : allt).slice().sort(vbrRod);
  }
  // Lýsingin ber lesturinn og kerfið í köflum („SVONA LAS ÉG BLAÐIÐ (…)" / „KERFIÐ SEGIR") — notað þegar sara-röð vantar.
  function vbrKaflar(notes) {
    const t = String(notes || ''), i = t.indexOf('SVONA LAS ÉG BLAÐIÐ'), j = t.indexOf('KERFIÐ SEGIR');
    const an = x => x.replace(/^[^\n]*(\n|$)/, '').trim();
    return {
      haus: i >= 0 ? t.slice(i).split('\n')[0].replace('SVONA LAS ÉG BLAÐIÐ', '').replace(/^\s*\(|\)\s*$/g, '').trim() : '',
      blad: i >= 0 ? an(t.slice(i, j > i ? j : t.length)) : '',
      kerfi: j >= 0 ? an(t.slice(j)) : ''
    };
  }
  async function saekjaVbrRadir(ids) {
    const c = sb();
    if (!c || !ids.length) return [];
    const r = await c.from('sara_yfirferd').select('id,fyrirtaeki_id,fyrirtaeki,blad,kerfi,spurning,linur,kerfi_linur,akstur,akstur_verd,skyrslugerd,manudur,dagsetning,blad_nr,mynd_url,myndir,stada,rod,updated_at').in('id', ids);
    if (r.error) throw r.error;
    return r.data || [];
  }
  function vbrMyndir(r, s) {
    const l = [], baeta = (url, nafn) => { if (url && !l.some(x => x.url === String(url))) l.push({ url: String(url), nafn: nafn || '' }); };
    baeta(r.attachment_url, 'Skann');          // mynd málsins fyrst — klippan sem fylgir þessu verki
    if (s) { baeta(s.mynd_url, 'Skann'); (Array.isArray(s.myndir) ? s.myndir : []).forEach(m => { if (m) baeta(m.url, m.nafn || m.name); }); }
    return l;
  }
  function vbrLinurHtml(s) {
    const linur = s && Array.isArray(s.linur) ? s.linur : [];
    if (!linur.length) return '';
    const kerfi = Array.isArray(s.kerfi_linur) ? s.kerfi_linur : [];
    const tala = v => (v == null || v === '' ? '—' : esc(String(v)));
    const kr = v => (v == null || v === '' || isNaN(Number(v)) ? '—' : Number(v).toLocaleString('is-IS') + ' kr');
    return '<section class="panel"><header class="phead">' + plate('C') + '<h3 class="ptitle">Tillaga að línum</h3><span class="sum">blaðið á móti tækjaskrá kerfisins</span></header>' +
      '<div class="stbl-w"><table class="stbl vbr-linur"><thead><tr><th>Lína</th><th class="ath">Blaðið</th><th class="ath">Kerfið</th><th class="ath">Einingaverð</th></tr></thead><tbody>' +
      linur.map((x, i) => {
        const k = kerfi[i] || {}, munur = !!x && k.n != null && x.n != null && Number(k.n) !== Number(x.n);
        return '<tr><td>' + esc((x && x.l) || '') + '</td><td class="ath' + (munur ? ' munur' : '') + '">' + tala(x && x.n) + '</td><td class="ath">' + tala(k.n) + '</td><td class="ath">' + kr(x && x.v) + '</td></tr>';
      }).join('') +
      (s.akstur ? '<tr><td>Akstur</td><td class="ath">' + tala(s.akstur) + '</td><td class="ath">—</td><td class="ath">' + kr(s.akstur_verd) + '</td></tr>' : '') +
      '</tbody></table></div></section>';
  }
  function vbRymiHtml(n) {
    if (!S.loaded) return emptyHtml('Sæki vinnublöð…');
    // sara-raðir búnu blaðanna fylgja með, annars vantar lesturinn á þau.
    const ids = [...new Set(vbrMal().concat(S.vbrBuin ? (G['vbr:buin'] && G['vbr:buin'].data) || [] : [])
      .map(saraIdMals).filter(Boolean))].sort((a, b) => a - b);
    const g = gogn('vbrymi:' + ids.join(','), () => saekjaVbrRadir(ids));
    if (g.data) S._vbrSara = g.data;                     // fyrri gögn standa á meðan ný sókn er í gangi — enginn blossi
    const buin = buinVbr();
    // Búin blöð aftast: þau trufla ekki röðina á því sem bíður.
    const listi = vbrListi(n).concat(buin.radir);
    if (!listi.length) return emptyHtml('Engin vinnublöð bíða yfirferðar. Ný blöð birtast hér þegar þau hafa verið lesin.');
    let val = listi.find(r => r.id === S.vbrVal);
    // Sjálfgefið val bíður eftir sara-röðinni, svo fyrsta blaðið sé fyrsta blaðið í bunkanum en ekki fyrsta nafnið.
    if (!val) { val = listi.find(vbrBidur) || listi[0]; if (S._vbrSara) S.vbrVal = val.id; }
    const sara = new Map((g.data || S._vbrSara || []).map(x => [x.id, x]));
    const s = sara.get(saraIdMals(val)) || null;
    const erBuid = r => r.status === 'lokad';
    const bida = listi.filter(vbrBidur);
    const svorud = listi.filter(r => !vbrBidur(r) && !erBuid(r));
    const buinRod = listi.filter(erBuid);
    const nr = listi.indexOf(val);
    const item = r => {
      const sr = sara.get(saraIdMals(r)) || null;
      const undir = [sr && (sr.dagsetning || sr.manudur), bladNr(sr), vbrBidur(r) ? '' : svarBidur(r) ? SVOR[svarMals(r)].l : 'Svarað'].filter(Boolean).join(' · ');
      return '<button type="button" class="vbr-item' + (vbrBidur(r) ? '' : ' svarad') + '" data-t5="vbr-velja" data-id="' + r.id + '" aria-current="' + (r.id === val.id) + '">' +
        '<b>' + esc(vbrNafn(r, sr)) + '</b>' + (undir ? '<span class="s">' + esc(undir) + '</span>' : '') + '</button>';
    };
    const k = vbrKaflar(val.notes);
    const blad = (s && s.blad) || k.blad, kerfiTexti = (s && s.kerfi) || k.kerfi, spurn = s && s.spurning;
    const myndir = vbrMyndir(val, s), titill = vbrNafn(val, s), fid = val.fyrirtaeki_id || (s && s.fyrirtaeki_id);
    const meta = [s && s.manudur, s && s.dagsetning, bladNr(s) || k.haus, (nr + 1) + ' af ' + listi.length].filter(Boolean).join(' · ');
    const eigin = onBoardOf(val, n);
    const svar = vbrBidur(val)
      ? (eigin ? '<div class="sacts">' + samtTakkar(val, ' lg', true) + '<button type="button" class="btn iv lg" data-t5="mal-eyda" data-id="' + val.id + '"' + dis(val.id) + ' title="Eyða blaðinu af borðinu — hægt að afturkalla">🗑 Eyða</button></div>' + skyRitillHtml(val)
        : '<div class="smeta">Bíður samþykkis hjá ' + esc(normW(val.assigned_to) || 'Master') + ' — aðeins eigandinn svarar</div>')
      : '<div class="smeta">' + esc(svarBidur(val) ? SVOR[svarMals(val)].merki : 'Svarað') + ' · veldu næsta blað í listanum</div>';
    return '<div class="vbr">' +
      '<aside class="panel vbr-list" aria-label="Vinnublöð">' +
        '<header class="phead">' + plate('06') + '<h2 class="ptitle">Vinnublöð</h2><span class="sum">' + bida.length + ' bíða · ' + svorud.length + ' svarað · nýjast efst</span>' +
          '<span class="grow"></span><button type="button" class="btn iv sm tog" data-t5="vbr-buin" aria-pressed="' + !!S.vbrBuin + '"' +
            ' title="Sýna vinnublöð sem búið er að svara — þau eru ekki sótt fyrr en beðið er um þau">' +
            (S.vbrBuin ? '✓ Búin' : 'Sýna búin') + '</button></header>' +
        '<div class="vbr-items">' +
          (bida.length ? '<div class="vbr-sect">Bíða yfirferðar · ' + bida.length + '</div>' + bida.map(item).join('') : '') +
          (svorud.length ? '<div class="vbr-sect">Svarað · ' + svorud.length + '</div>' + svorud.map(item).join('') : '') +
          // 18.09.2026: búin blöð — sótt löt, aðeins þegar kveikt er á þeim.
          (!S.vbrBuin ? ''
            : buin.villa ? '<div class="vbr-sect">Búin</div><p class="err">Náði ekki í búin blöð: ' + esc(buin.villa) + '</p>'
            : buin.bid ? '<div class="vbr-sect">Búin</div><p class="s" style="padding:6px 12px">Sæki búin blöð…</p>'
            : buinRod.length ? '<div class="vbr-sect">Búin · ' + buinRod.length + '</div>' + buinRod.map(item).join('')
            : '<div class="vbr-sect">Búin</div><p class="s" style="padding:6px 12px">Engin búin vinnublöð síðustu 60.</p>') +
        '</div>' +
      '</aside>' +
      '<div class="vbr-main">' +
        '<div class="vbr-top">' +
          '<button type="button" class="btn iv sm" data-t5="vbr-fara" data-v="-1"' + (nr <= 0 ? ' disabled' : '') + '>‹ Fyrra</button>' +
          '<button type="button" class="btn iv sm" data-t5="vbr-fara" data-v="1"' + (nr >= listi.length - 1 ? ' disabled' : '') + '>Næsta ›</button>' +
          '<span class="vbr-meta">' + esc(meta) + '</span><span class="grow"></span>' +
          (fid ? '<a class="btn iv sm" href="#company/' + fid + '" data-t5="fyr-id" data-fid="' + fid + '">🏢 Opna fyrirtæki ›</a>' : '') +
        '</div>' +
        '<h2 class="vbr-titill">' + esc(titill) + '</h2>' +
        (myndir.length
          ? '<figure class="vbr-mynd"><a href="' + esc(myndir[0].url) + '" target="_blank" rel="noopener" title="Opna skannið í fullri stærð">' +
              '<img src="' + esc(myndir[0].url) + '" alt="Skann af vinnublaði — ' + esc(titill) + '"></a><figcaption>Skann · smelltu til að opna í fullri stærð' +
              // Eldri eintök sömu klippu (úr fyrra máli, oft í hærri upplausn) — hlekkur, ekki önnur mynd í fullri breidd.
              myndir.slice(1).map((m, i) => ' · <a class="clink dk" href="' + esc(m.url) + '" target="_blank" rel="noopener">Annað eintak' + (myndir.length > 2 ? ' ' + (i + 1) : '') + ' ›</a>').join('') +
            '</figcaption></figure>'
          : '<div class="vbr-engin">Engin skannmynd fylgir þessu blaði' + (bladNr(s) ? ' — ' + esc(bladNr(s)) : '') + '.</div>') +
        (spurn ? '<div class="vbr-spurn"><span class="lbl">Spurningin til þín</span>' + esc(spurn) + '</div>' : '') +
        '<div class="vbr-cols">' +
          '<section class="panel"><header class="phead">' + plate('A') + '<h3 class="ptitle">Svona las ég blaðið</h3></header><div class="vbr-txt">' + esc(blad || 'Lesturinn fannst ekki í málinu.') + '</div></section>' +
          '<section class="panel"><header class="phead">' + plate('B') + '<h3 class="ptitle">Kerfið segir</h3></header><div class="vbr-txt">' + esc(kerfiTexti || 'Ekkert skráð um kerfið í málinu.') + '</div></section>' +
        '</div>' +
        vbrLinurHtml(vbtSyn(s)) +
        (s && eigin && vbrBidur(val) ? vbtHtml(val, s) : '') +
        (g.villa ? '<p class="err">Náði ekki í gögn vinnublaðsins: ' + esc(g.villa) + '</p>' : '') +
        '<div class="vbr-svar" aria-label="Svar">' + svar + '</div>' +
      '</div>' +
    '</div>';
  }
  /* ── 368z: LEIÐRÉTTA TÖLUR — H/Y-teljarar í Vinnublöðum ── */
  // Tegundirnar sex eins og á blaðinu. m/st þekkja línu tegundarinnar (líka Stólpa-heiti eins og „Hleðsla Duft 6-12 kg."),
  // h/y eru heiti nýrra lína eins og verðskráin (vorur) skrifar þau og hv/yv fast viðmið ef verðskráin næst ekki.
  const VBT = [
    { k: 'duft6', t: 'Duft 6 kg', m: /duft/, st: /(^|\D)6(-12)?\s*kg/, h: 'Duft 6 kg. ABC hleðsla', hv: 6782, y: 'Duft 6 kg. ABC yfirferð', yv: 3387 },
    { k: 'lv6', t: 'Léttvatn', m: /l[ée]ttvatn/, st: /(^|\D)6(-9)?\s*l/, h: 'Léttvatnstækis 6L. hleðsla', hv: 6782, y: 'Léttvatnstæki 6L. yfirferð', yv: 3150 },
    { k: 'slanga', t: 'Brunaslöngur', m: /brunaslang/, st: null, h: null, hv: 0, y: 'Yfirferð Brunaslanga', yv: 4346 },
    { k: 'reyk', t: 'Reykskynjarar', m: /reykskynj/, st: null, h: null, hv: 0, y: 'Yfirferð Reykskynjari', yv: 2346 },
    { k: 'co5', t: 'CO₂ 5 kg', m: /co₂|co2|kols[ýy]r/, st: /(^|\D)5\s*kg/, h: 'CO₂ 5 kg. hleðsla', hv: 6900, y: 'CO₂ 5 kg. yfirferð', yv: 3270 },
    { k: 'co2', t: 'CO₂ 2 kg', m: /co₂|co2|kols[ýy]r/, st: /(^|\D)2\s*kg/, h: 'CO₂ 2 kg. hleðsla', hv: 3400, y: 'CO₂ 2 kg. yfirferð', yv: 3270 }
  ];
  const vbtSvid = l => { const x = String(l || '').toLowerCase(); return /yfirfer/.test(x) ? 'y' : /hle[ðd]sl|(^|\s)hl\./.test(x) ? 'h' : null; };
  const vbtTeg = l => { const x = String(l || '').toLowerCase(); return VBT.find(t => t.m.test(x) && (!t.st || t.st.test(x))) || null; };
  const vbtNrm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ð/g, 'd').replace(/₂/g, '2').replace(/[^a-z0-9]/g, '');
  const vbtKr = v => String(Math.round(Number(v) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
  const vbtSara = sid => (S._vbrSara || []).find(x => x.id === sid) || null;
  const vbtOvistad = malId => { const r = S.rows.find(x => x.id === malId), sid = r && saraIdMals(r), e = sid && S.vbt && S.vbt[sid]; return e && (e.dirty || e.vistar) ? sid : null; };
  // Tafla C sýnir vinnueintakið á meðan breytt er, svo taflan og teljararnir segi það sama.
  const vbtSyn = s => { const e = s && S.vbt && S.vbt[s.id]; return e ? Object.assign({}, s, { linur: e.linur, kerfi_linur: e.kerfi, akstur: e.akstur }) : s; };
  async function saekjaVorurVerd() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const r = await c.from('vorur').select('nafn,verd_an_vsk').eq('virkt', true);
    if (r.error) throw r.error;
    return r.data || [];
  }
  // Verð nýrrar línu: fyrirtækisverð, svo verðskrá, svo fast viðmið — heilar krónur eins og línur Söru.
  function vbtVerd(fid, nafn, vidmid) {
    const lykill = vbtNrm(nafn);
    try {
      const cp = window.AppSettings && typeof window.AppSettings.get === 'function' ? window.AppSettings.get('company_pricing') : null;
      const listi = cp && fid != null ? (cp[fid] || cp[String(fid)]) : null;
      const f = Array.isArray(listi) ? listi.find(p => p && vbtNrm(p.name) === lykill && Number(p.price_ex_vat) > 0) : null;
      if (f) return Math.round(Number(f.price_ex_vat));
    } catch (_) {}
    const vorur = G['vbt-vorur'] && Array.isArray(G['vbt-vorur'].data) ? G['vbt-vorur'].data : [];
    const v = vorur.find(p => vbtNrm(p.nafn) === lykill && Number(p.verd_an_vsk) > 0);
    return v ? Math.round(Number(v.verd_an_vsk)) : vidmid;
  }
  function vbtTolur(e) {
    const o = { akstur: e.akstur };
    VBT.forEach(t => { o[t.k] = { h: 0, y: 0, kerfi: null }; });
    e.linur.forEach((x, i) => {
      const t = vbtTeg(x && x.l), sv = vbtSvid(x && x.l);
      if (!t || !sv || (sv === 'h' && !t.h)) return;
      o[t.k][sv] += Number(x.n) || 0;
      const kn = e.kerfi[i] && e.kerfi[i].n;
      if (kn != null) o[t.k].kerfi = Math.max(o[t.k].kerfi || 0, Number(kn) || 0);
    });
    return o;
  }
  // Vinnueintak tillögunnar, lykill er sara-röðin. Nýrri gögn úr grunninum (önnur vél, Claude) koma í stað óbreytts
  // eintaks; eintak með óvistuðum breytingum stendur þar til það hefur verið vistað.
  function vbtEintak(s) {
    S.vbt = S.vbt || {};
    let e = S.vbt[s.id];
    if (!e || (!e.dirty && !e.vistar && e.updated_at !== s.updated_at)) {
      e = S.vbt[s.id] = {
        linur: (Array.isArray(s.linur) ? s.linur : []).map(x => Object.assign({}, x)),
        kerfi: (Array.isArray(s.kerfi_linur) ? s.kerfi_linur : []).map(x => Object.assign({}, x)),
        akstur: Number(s.akstur) || 0, updated_at: s.updated_at, dirty: false, vistar: false, aftur: false, villa: '', timi: null, t: null, bid: null
      };
      e.upphaf = vbtTolur(e);
    }
    return e;
  }
  function vbtBreyta(s, k, sv, d) {
    const e = vbtEintak(s);
    if (!d) return;
    if (k === 'akstur') e.akstur = Math.max(0, e.akstur + d);
    else {
      const t = VBT.find(x => x.k === k);
      if (!t || (sv !== 'h' && sv !== 'y') || (sv === 'h' && !t.h)) return;
      let i = e.linur.findIndex(x => x && vbtTeg(x.l) === t && vbtSvid(x.l) === sv);
      if (i < 0) {
        if (d < 0) return;
        const nafn = sv === 'h' ? t.h : t.y;
        let j = -1;
        e.linur.forEach((x, n) => { if (x && vbtTeg(x.l) === t) j = n; });      // H og Y sömu tegundar standa saman
        i = j >= 0 ? j + 1 : e.linur.length;
        while (e.kerfi.length < i) e.kerfi.push({ n: null, v: null });
        e.linur.splice(i, 0, { l: nafn, n: 0, v: vbtVerd(s.fyrirtaeki_id, nafn, sv === 'h' ? t.hv : t.yv), vsk: 24 });
        e.kerfi.splice(i, 0, { n: null, v: null });
      }
      const nytt = Math.max(0, (Number(e.linur[i].n) || 0) + d);
      // Lína sem fer í 0 hverfur, nema kerfið eigi tölu á móti henni — þá stendur 0 á móti tölu kerfisins.
      if (nytt === 0 && !(e.kerfi[i] && e.kerfi[i].n != null)) { e.linur.splice(i, 1); if (i < e.kerfi.length) e.kerfi.splice(i, 1); }
      else e.linur[i].n = nytt;
      if (sv === 'h' && d > 0 && e.akstur < 2) e.akstur = 2;                      // verd.md: hleðsla → akstur 2
    }
    e.dirty = true;
    e.villa = '';
    clearTimeout(e.t);
    e.t = setTimeout(() => { vbtVista(s.id); }, 800);
  }
  const vbtSpor = linur => (linur || []).map(x => [x && x.l, Number(x && x.n), Number(x && x.v)].join('|')).join('¦');
  // Vistun: skilyrt á updated_at og stada='bidur', lesin til baka. Breyting sem kemur á meðan vistað er fer strax á eftir.
  function vbtVista(sid) {
    const e = S.vbt && S.vbt[sid], c = sb();
    if (!e) return Promise.resolve(true);
    clearTimeout(e.t);
    if (e.vistar) { e.aftur = true; return e.bid; }
    if (!e.dirty) return Promise.resolve(!e.villa);
    if (!c) { e.villa = 'Engin tenging við gagnagrunn'; render(); return Promise.resolve(false); }
    const linur = e.linur.map(x => Object.assign({}, x)), kerfi = e.kerfi.map(x => Object.assign({}, x)), akstur = e.akstur;
    e.vistar = true;
    e.dirty = false;
    render();
    e.bid = (async () => {
      let ok = false;
      try {
        let q = c.from('sara_yfirferd').update({ linur, kerfi_linur: kerfi, akstur, updated_at: new Date().toISOString() }).eq('id', sid).eq('stada', 'bidur');
        q = e.updated_at ? q.eq('updated_at', e.updated_at) : q.is('updated_at', null);
        const r = await q.select('id,linur,kerfi_linur,akstur,updated_at');
        if (r.error) throw r.error;
        const row = (r.data || [])[0];
        if (!row) {
          // Önnur vél eða Claude breytti blaðinu (eða það var samþykkt) — ekkert skrifað yfir, nýjustu tölur sýndar.
          e.vistar = false;
          delete S.vbt[sid];
          toast('Blaðinu var breytt annars staðar rétt í þessu — sýni nýjustu tölur. Breyttu aftur ef þarf.', true);
          gleyma('vbrymi:');
          render();
          return false;
        }
        if (vbtSpor(row.linur) !== vbtSpor(linur) || Number(row.akstur) !== akstur) throw new Error('las ekki til baka');
        e.updated_at = row.updated_at;
        e.timi = new Date();
        e.villa = '';
        Object.keys(G).forEach(x => {
          const s2 = x.indexOf('vbrymi:') === 0 && G[x] && Array.isArray(G[x].data) ? G[x].data.find(y => y.id === sid) : null;
          if (s2) Object.assign(s2, { linur: row.linur, kerfi_linur: row.kerfi_linur, akstur: row.akstur, updated_at: row.updated_at });
        });
        ok = true;
      } catch (err) {
        e.dirty = true;
        e.villa = 'Vistaðist ekki: ' + ((err && err.message) || err);
        toast(e.villa, true);
      }
      e.vistar = false;
      render();
      if (ok && (e.aftur || e.dirty)) { e.aftur = false; return vbtVista(sid); }
      return ok;
    })();
    return e.bid;
  }
  // Fyrir svar: bíða vistunar sem er í gangi og vista það sem eftir er. false = tölurnar komust ekki í grunninn.
  async function vbtFyrst(sid) {
    const e = S.vbt && S.vbt[sid];
    if (!e) return true;
    clearTimeout(e.t);
    if (e.vistar) await e.bid;
    const e2 = S.vbt && S.vbt[sid];
    if (!e2) return false;                   // önnur vél breytti blaðinu — nýjustu tölur sýndar, ekki svarað
    return e2.dirty ? vbtVista(sid) : !e2.villa;
  }
  // Farið á annað blað: óvistaðar tölur fara strax, ekki eftir 0,8 s.
  function vbtFlytja() {
    Object.keys(S.vbt || {}).forEach(k => { const e = S.vbt[k]; if (e && e.dirty && !e.vistar) vbtVista(Number(k)); });
  }
  function vbtHtml(r, s) {
    gogn('vbt-vorur', saekjaVorurVerd, 3600000);
    const e = vbtEintak(s), o = vbtTolur(e), u = e.upphaf || o;
    const takki = (k, sv, d, texti, merki, af) => '<button type="button" class="vbt-btn" data-t5="vbt" data-id="' + r.id + '" data-k="' + k + '" data-s="' + sv + '" data-v="' + d + '" aria-label="' + esc(merki) + '"' + (af ? ' disabled' : '') + '>' + texti + '</button>';
    const dalkur = (t, sv) => {
      const n = o[t.k][sv], heiti = t.t + ', ' + (sv === 'h' ? 'hleðsla' : 'yfirferð');
      return '<div class="vbt-dalkur"><span class="vbt-hy">' + sv.toUpperCase() + '</span>' +
        takki(t.k, sv, 1, '+', heiti + ': bæta við einu') +
        '<span class="vbt-tala' + (n !== u[t.k][sv] ? ' breytt' : '') + '">' + n + '</span>' +
        takki(t.k, sv, -1, '−', heiti + ': fækka um eitt', n <= 0) + '</div>';
    };
    // 368z3 (Agnar 13.09.2026: „H þarf ekki að vera þar. Bara Y yfirferð á reykskynjurum og brunaslöngum"):
    // tegund án hleðslu fær einn Y-dálk í fullri breidd spjaldsins, eins og aksturinn.
    const kort = VBT.map(t => '<div class="vbt-kort' + (t.h ? '' : ' einn') + (o[t.k].h !== u[t.k].h || o[t.k].y !== u[t.k].y ? ' breytt' : '') + '" role="group" aria-label="' + esc(t.t) + '">' +
        '<div class="vbt-nafn">' + esc(t.t) + '</div><div class="vbt-dalkar">' + (t.h ? dalkur(t, 'h') : '') + dalkur(t, 'y') + '</div>' +
        '<div class="vbt-kerfi">' + (o[t.k].kerfi != null ? 'kerfið ' + o[t.k].kerfi : '&nbsp;') + '</div></div>').join('') +
      '<div class="vbt-kort einn' + (o.akstur !== u.akstur ? ' breytt' : '') + '" role="group" aria-label="Akstur">' +
        '<div class="vbt-nafn">Akstur</div><div class="vbt-dalkar"><div class="vbt-dalkur"><span class="vbt-hy">FERÐIR</span>' +
        takki('akstur', '', 1, '+', 'Akstur: bæta við ferð') +
        '<span class="vbt-tala' + (o.akstur !== u.akstur ? ' breytt' : '') + '">' + o.akstur + '</span>' +
        takki('akstur', '', -1, '−', 'Akstur: fækka um ferð', o.akstur <= 0) + '</div></div>' +
        '<div class="vbt-kerfi">× ' + vbtKr(s.akstur_verd) + '</div></div>';
    const samtals = e.linur.reduce((a, x) => a + (Number(x && x.n) || 0) * (Number(x && x.v) || 0), 0) + o.akstur * (Number(s.akstur_verd) || 0) + (Number(s.skyrslugerd) || 0);
    const stada = e.vistar ? 'Vista…' : e.villa ? '<span class="villa">' + esc(e.villa) + '</span>' : e.dirty ? 'Óvistað' : e.timi ? 'Vistað kl. ' + klukka(e.timi) : 'Breytingar vistast strax';
    return '<section class="panel vbt" lang="is" aria-label="Leiðrétta tölur">' +
      '<header class="phead">' + plate('D') + '<h3 class="ptitle">Leiðrétta tölur</h3><span class="sum">H = hleðsla · Y = yfirferð</span></header>' +
      '<div class="vbt-rond">' + kort + '</div>' +
      '<div class="vbt-fot" aria-live="polite">Samtals án vsk <b>' + vbtKr(samtals) + '</b> · ' + stada + '</div>' +
    '</section>';
  }
  // Í Vinnublöðum opnast næsta blað sem bíður þegar svarið hefur skilað sér — blaðið stendur kyrrt ef vistun mistókst.
  function vbrEftirSvar(id, bid) {
    if ((M(cfg().mode) || {}).rymi !== VBR_HAM) return;
    const listi = vbrListi(nu()), i = listi.findIndex(r => r.id === id);
    const naesta = listi.slice(i + 1).concat(listi.slice(0, Math.max(0, i))).find(r => r.id !== id && vbrBidur(r));
    Promise.resolve(bid).then(() => {
      const r = S.rows.find(x => x.id === id);
      if (r && erSamthykki(r)) return;
      if (naesta && S.vbrVal === id) { S.vbrVal = naesta.id; render(); vbrTilBaka(); }
    });
  }
  function vbrTilBaka() {
    setTimeout(() => { try { const t = rot().querySelector('.vbr-main'); if (t && t.getBoundingClientRect().top < 0) t.scrollIntoView({ block: 'start' }); } catch (_) {} }, 40);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * SANNANIR — endurmæling, ekki fullyrðing (19.09.2026).
   *
   * Agnar: „bara hvort borðið segir satt. Ég hef ekki hugmynd. Sýnir engar
   * sannanir." Borðið sýndi tölur og ekkert til að bera þær saman við.
   *
   * Hver mæling telur upp á nýtt beint úr gagnagrunninum og skilar tölu OG
   * reglunni á íslensku. Talið er með `count: exact, head: true` þar sem því
   * verður við komið — þá telur gagnagrunnurinn sjálfur og 1000-raða þakið
   * skiptir engu máli. Sé sían í vafranum er allur ferillinn sýndur.
   */
  // Lyklar sem eiga sér ekki ham fá nafn sem Agnar þekkir — ekki innri lykil.
  // „vbt-vorur" segir honum ekkert; „Vöruverð (vinnublöð)" gerir það.
  const SANN_NOFN = {
    'vbt-vorur': 'Vöruverð (vinnublöð)', falid: 'Falin atriði', elt: 'Póstar í eftirfylgni',
    bk: 'Brunakerfi', skyrslur: 'Skýrslur', krofur: 'Kröfur', gleymt: 'Gleymt að rukka',
    afgr: 'Afgreiðsla', bakf: 'Bakfærslur', 'tf-post': 'Sendendur pósts',
  };
  const SANNANIR = {
    bord: {
      heiti: 'Mál á borðinu',
      regla: 'úr thjonustubeidni — ekki eytt, ekki í geymslu, staða ekki „lokað"',
      askjanum: () => S.rows.length,
      maela: async (c) => {
        const r = await c.from('thjonustubeidni').select('id', { count: 'exact', head: true })
          .is('deleted_at', null).is('archived_at', null).or('status.is.null,status.neq.lokad');
        if (r.error) throw r.error;
        return r.count;
      },
    },
    krofur: {
      heiti: 'Ógreiddar kröfur',
      regla: 'úr solur — greitt með reikningi, ógreitt, ekki ógilt',
      askjanum: () => S.counts.krofur,
      maela: async (c) => {
        const r = await c.from('solur').select('id', { count: 'exact', head: true })
          .eq('greitt_med', 'reikningur').is('paid_at', null).neq('status', 'void');
        if (r.error) throw r.error;
        return r.count;
      },
    },
    postbeidnir: {
      heiti: 'Reikningsbeiðnir',
      regla: 'úr email_digest — INBOX í eldklar@/bokhald@ síðustu 60 daga',
      // null = einingin hefur ekki verið opnuð. ÓMÆLT ER EKKI SAMA OG RANGT —
      // fyrsta útgáfa skilaði 0 og tækið sagði „stemmir EKKI" um tölu sem var
      // aldrei sýnd. Vörður sem hrópar á tóman skjá er nákvæmlega sú lygi sem
      // hann á að finna hjá öðrum.
      askjanum: () => (G.postbeidnir && G.postbeidnir.data) ? G.postbeidnir.data.length : null,
      maela: async (c) => {
        const fra = new Date(Date.now() - 60 * 864e5).toISOString();
        const r = await c.from('email_digest').select('id', { count: 'exact', head: true })
          .in('account', PB_HOLF).eq('folder', 'INBOX').gte('received_at', fra);
        if (r.error) throw r.error;
        // Sían sjálf er í vafranum, svo ferillinn er sýndur í stað einnar tölu.
        const ferskt = await saekjaPostbeidnir();
        return { tala: ferskt.length, ferill: r.count + ' póstar bárust → ' + ferskt.length + ' ósvaraðar beiðnir' };
      },
    },
  };

  async function sannreyna() {
    const c = sb();
    if (!c) { toast('Engin tenging við gagnagrunn — ekkert var mælt.', true); return; }
    S.sannreyn = { keyrir: true, radir: [], at: null };
    render();
    const radir = [];
    for (const k of Object.keys(SANNANIR)) {
      const s = SANNANIR[k];
      let skjar = null;
      try { skjar = s.askjanum(); } catch (_) {}
      try {
        const m = await s.maela(c);
        const maelt = (m && typeof m === 'object') ? m.tala : m;
        const ferill = (m && typeof m === 'object') ? m.ferill : '';
        radir.push({
          heiti: s.heiti, regla: s.regla, skjar, maelt, ferill,
          stemmir: skjar == null ? null : Number(skjar) === Number(maelt),
        });
      } catch (e) {
        radir.push({ heiti: s.heiti, regla: s.regla, skjar, maelt: null, villa: (e && e.message) || String(e) });
      }
    }

    // ALLAR EININGAR SEM HAFA SÓTT GÖGN — ekki bara þær sem ég mundi eftir.
    // Lyklar með „:" eru uppflettingar á einstakar raðir (skjol:123), ekki tölur
    // á skjánum, og eiga ekkert erindi hingað.
    for (const k of Object.keys(G)) {
      if (k.indexOf(':') >= 0) continue;
      const g = G[k];
      if (!g || !g.saekja || !Array.isArray(g.data)) continue;
      if (SANNANIR[k]) continue;   // þegar mæld að ofan, með eigin reglu
      const skjar = g.data.length;
      try {
        const ny = await g.saekja();
        const maelt = Array.isArray(ny) ? ny.length : null;
        radir.push({
          heiti: (MODS[k] && MODS[k].t) || SANN_NOFN[k] || k,
          regla: 'sama fyrirspurn keyrð aftur beint úr gagnagrunninum',
          skjar, maelt, stemmir: maelt == null ? null : skjar === maelt,
        });
      } catch (e) {
        radir.push({ heiti: (MODS[k] && MODS[k].t) || SANN_NOFN[k] || k, regla: 'sama fyrirspurn keyrð aftur', skjar, maelt: null, villa: (e && e.message) || String(e) });
      }
    }

    S.sannreyn = { keyrir: false, radir, at: new Date() };
    render();
  }

  function sannanirHtml() {
    const s = S.sannreyn;
    if (!s) return '';
    if (s.keyrir) return '<section class="panel sannanir"><div class="sn-h">Mæli allt upp á nýtt…</div></section>';
    const rod = r => {
      const merki = r.villa ? '<span class="tag hot">náði ekki að mæla</span>'
        : r.stemmir === null ? '<span class="tag">ekki opnað</span>'
        : r.stemmir ? '<span class="tag ok">stemmir</span>'
        : '<span class="tag hot">stemmir EKKI</span>';
      return '<div class="sn-r"><div class="sn-t"><b>' + esc(r.heiti) + '</b> ' + merki + '</div>' +
        '<div class="sn-n">' + (r.villa ? esc(r.villa)
          : (r.skjar == null ? 'mælt núna <b>' + r.maelt + '</b> — einingin var ekki opin, svo engin tala var á skjánum til að bera saman við' : 'á skjánum <b>' + r.skjar + '</b> · mælt núna <b>' + r.maelt + '</b>')) + '</div>' +
        (r.ferill ? '<div class="sn-f">' + esc(r.ferill) + '</div>' : '') +
        '<div class="sn-f">' + esc(r.regla) + '</div></div>';
    };
    const misraemi = s.radir.filter(r => r.stemmir === false).length;
    return '<section class="panel sannanir">' +
      '<div class="sn-h">' + (misraemi ? '⚠ ' + misraemi + ' tala stemmir ekki' : '✓ Allar tölur stemma') +
        ' · mælt kl. ' + klukka(s.at) + '<button type="button" class="btn iv sm" data-t5="sann-loka">Loka</button></div>' +
      s.radir.map(rod).join('') +
      '<div class="sn-f">Hver tala er talin upp á nýtt beint úr gagnagrunninum þegar smellt er — þetta er ekki merki sem segist vera rétt.</div>' +
    '</section>';
  }
  function modPanel(k, summary, body, action, alltaf) {
    const m = MODS[k], open = isOpen(k);
    return '<section class="panel mod' + (open ? ' open' : '') + (alltaf ? ' alltaf' : '') + '" aria-label="' + esc(m.t) + '">' +
      '<header class="phead">' + plate(m.n) + '<h2 class="ptitle">' + m.t + '</h2><span class="sum">' + summary + '</span><span class="grow"></span>' +
        ((open || alltaf) && action ? action : '') +
        '<button type="button" class="btn iv sm tog" data-t5="mod-open" data-m="' + k + '" aria-expanded="' + open + '" aria-label="' + (open ? 'Fella saman ' : 'Opna ') + esc(m.t) + '">' + (open ? '▴' : '▾') + '</button>' +
      '</header>' + (open || alltaf ? body : '') + '</section>';
  }
  /* ──────────────────────────────────────────────────────────────────────────
   * DAGNÓTUR — frjáls texti á dag (18.09.2026).
   *
   * Geymt í skipulagsbord.by_staff.<nafn>.dagnotur.<YYYY-MM-DD>, sami staður og
   * Krassblaðið og sama vistun. `AppSettings.save` er `saveVordud`: hún setur
   * misheppnuð skrif í biðröð, varar við sjálf og reynir aftur á 20 sek fresti og
   * við pagehide. Þess vegna stendur „í biðröð" hér — ekki „reyndu aftur".
   */
  const dagNota = (n, key) => String(P('skipulagsbord.by_staff.' + n + '.dagnotur.' + key) || '');
  function dagNotaHtml(d) {
    const n = nu();
    const g = S.dnDrog[d.key] != null ? S.dnDrog[d.key] : dagNota(n, d.key);
    const st = S.dnStada[d.key];
    return '<div class="dnota">' +
      '<textarea data-dn="' + esc(d.key) + '" rows="' + Math.min(10, Math.max(2, g.split('\n').length + 1)) + '"' +
        ' aria-label="Nóta ' + d.d + ' ' + d.n + '." placeholder="Skrifaðu hér…">' + esc(g) + '</textarea>' +
      '<span class="dnst ' + (st ? st.t : '') + '" data-dnst="' + esc(d.key) + '">' + esc(st ? st.s : '') + '</span>' +
    '</div>';
  }
  function dnStimpla(key) {
    const root = rot();
    if (!root) return;
    const st = S.dnStada[key] || { t: '', s: '' };
    root.querySelectorAll('[data-dnst="' + key + '"]').forEach(el => {
      el.textContent = st.s || '';
      el.className = 'dnst ' + st.t;
    });
  }
  function skrifaDagnotu(el) {
    const key = el.dataset.dn;
    if (!key) return;
    S.dnDrog[key] = el.value;
    S.dnStada[key] = { t: 'bid', s: 'Óvistað…' };
    dnStimpla(key);
    bida('dn:' + key, async () => {
      const n = nu(), texti = S.dnDrog[key];
      if (texti == null) return;
      S.dnStada[key] = { t: 'vistar', s: 'Vista…' };
      dnStimpla(key);
      let ok = false;
      try { ok = !!(await AppSettings.save({ skipulagsbord: { by_staff: { [n]: { dagnotur: { [key]: texti } } } } })); } catch (_) {}
      if (ok && S.dnDrog[key] === texti) delete S.dnDrog[key];
      S.dnStada[key] = ok
        ? { t: 'ok', s: 'Vistað kl. ' + klukka(new Date()) }
        : { t: 'bid', s: 'Í biðröð — reynt aftur sjálfkrafa. Textinn stendur hér áfram.' };
      dnStimpla(key);
    });
  }
  function dagskraHtml() {
    const open = isOpen('dagskra'), days = week();
    const total = days.reduce((s, d) => s + d.jobs.length, 0);
    const jobHtml = j => {
      const inni = '<b>' + esc(j.allday ? 'Allan daginn' : (j.time || '')) + '</b>' + esc(j.name || '') + (j.note ? '<small>' + esc(String(j.note).slice(0, 90)) + '</small>' : '');
      return j.id
        ? '<button type="button" class="job" data-t5="job-edit" data-jid="' + esc(j.id) + '" style="border-left-color:' + vdLitur(j.type) + '" title="' + esc(j.type || '') + ' — smelltu til að breyta">' + inni + '</button>'
        : '<span class="job" style="border-left-color:' + vdLitur(j.type) + '">' + inni + '</span>';
    };
    const body = '<div class="week">' + days.map(d =>
      '<div class="day' + (d.today ? ' today' : '') + '">' +
        '<div class="dh"><button type="button" class="dlink" data-t5="mod-open" data-m="dagskra" aria-label="' + d.d + ' ' + d.n + '., ' + d.jobs.length + ' verk">' +
          '<span class="dn">' + d.d + '</span><span class="dd">' + d.n + '</span></button><span class="grow"></span>' +
          '<button type="button" class="dplus" data-t5="job-new" data-date="' + d.key + '" aria-label="Skrá verk ' + d.d + ' ' + d.n + '.">+</button></div>' +
        '<div class="djobs">' + (open
          // 18.09.2026 (Agnar: „open to write, easy edit"): dagurinn er reitur, ekki
          // eyðublað. „Ekkert skráð" var endapunktur — nú er þar hægt að skrifa.
          ? (d.jobs.length ? d.jobs.map(jobHtml).join('') : '') + dagNotaHtml(d)
          : '<span class="dots">' + d.jobs.map(j => '<i class="dot" style="background:' + vdLitur(j.type) + '" title="' + esc((j.time ? j.time + ' ' : '') + (j.name || '')) + '"></i>').join('') + '</span>') +
        '</div>' +
      '</div>').join('') + '</div>' +
      (open ? '<div class="legend">' + VD_TEG.map(t => '<span><i class="dot" style="background:' + t[1] + '"></i>' + t[0] + '</span>').join('') + '</div>' : '');
    const action = '<button type="button" class="btn gold sm" data-t5="job-new" data-date="' + days[0].key + '">+ Skrá verk</button>';
    return modPanel('dagskra', days[0].jobs.length + ' í dag · ' + total + ' næstu 7 daga', body, action, true);
  }
  /* ── einingar sem sækja gögn: latar, geymdar í 5 mín (engin sókn við hverja 60 s könnun) ── */
  const G = {};
  function gogn(lykill, saekja, maxAldur) {
    const g = G[lykill] || (G[lykill] = {});
    // Engin sókn fyrr en tengingin er til: djúptengill (#bord) teiknar borðið á undan DB.sb, og þá geymdist „Engin tenging"
    // í allt að 5 mín. (falin atriði birtust aftur í mínútu). load() teiknar aftur þegar tengingin kemur og sóknin fer af stað.
    // 19.09.2026: fyrirspurnin geymd svo „🔍 Sannreyna" geti keyrt hana aftur.
    // Án hennar var hver eining ósannreynanleg nema hún væri handskrifuð inn í
    // SANNANIR — og það gleymist, eins og allt sem þarf að muna.
    g.saekja = saekja;
    if (!g.bid && (!g.at || Date.now() - g.at > (maxAldur || 300000)) && sb()) {
      g.bid = true;
      Promise.resolve().then(saekja).then(d => { g.data = d; g.villa = ''; }, e => { g.villa = (e && e.message) || String(e); })
        .then(() => { g.bid = false; g.at = Date.now(); render(); });
    }
    return g;
  }
  const gleyma = forskeyti => Object.keys(G).forEach(x => { if (x.indexOf(forskeyti) === 0) delete G[x]; });
  const uppfTakki = forskeyti => '<button type="button" class="btn iv sm tog" data-t5="g-uppf" data-g="' + esc(forskeyti) + '" title="Sækja nýjustu gögn" aria-label="Uppfæra">↻</button>';
  // 368ab (Agnar 14.09.2026: „er hægt að setja einhvern trigger á þjónustuborða punktana"): þegar borðið opnast aftur — úr
  // prófíl, öðrum flipa eða eftir hlé — sækjast opnar einingar aftur ef gögnin eru eldri en 15 s, svo skýrsla eða reikningur
  // sem var að verða til sjáist strax (áður allt að 5 mín.). Aðeins opnar einingar sækja; lokaðar kalla ekki á gogn().
  function ferskaEiningar(eldriEn) {
    const nuna = Date.now();
    Object.keys(G).forEach(k => { const g = G[k]; if (g && g.at && !g.bid && nuna - g.at > (eldriEn || 15000)) g.at = 0; });
  }

  /* ── FELA: dauf „Fela"-lína á hverju atriði sem safnast — samstillt á allar vélar (thjonustubord_falid) ── */
  const FALID_LYKILL = /^[a-z_]+:[a-z_]+:\S+$/;          // sama regla og check-skorðan í töflunni
  const _falidKedja = {};
  async function saekjaFalid() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const byrjun = Date.now();
    // Falin atriði OG atriði með skýringu. Röð sem ber aðeins skýringu hefur falid = false og felur ekkert.
    const r = await c.from('thjonustubord_falid').select('lykill,eining,falid,lysing,falid_af,updated_at,skyring,skyring_af,skyring_at').or('falid.eq.true,skyring.not.is.null');
    if (r.error) throw r.error;
    const kort = {};
    (r.data || []).forEach(x => { kort[x.lykill] = x; });
    // Sókn sem fór af stað áður en smellur vistaðist má hvorki vekja atriðið upp né fela það aftur: skrif sem bíða — eða
    // kláruðust eftir að sóknin hófst — ráða. Skrif sem kláruðust fyrr eru komin í svarið og víkja. Aðeins dálkar skrifsins
    // eru lagðir yfir röðina, svo „Fela" í bið þurrkar ekki skýringu af henni og skýring í bið ekki falid.
    Object.keys(S.falidBid).forEach(k => {
      const b = S.falidBid[k];
      if (b.lokid && b.lokid < byrjun) { delete S.falidBid[k]; return; }
      if (kort[k] || b.falid) kort[k] = Object.assign({}, kort[k] || b.row, { falid: b.falid });
    });
    Object.keys(S.skyrBid).forEach(k => {
      const b = S.skyrBid[k];
      if (b.lokid && b.lokid < byrjun) { delete S.skyrBid[k]; return; }
      if (kort[k] || b.skyring) kort[k] = Object.assign({ lykill: k, eining: b.rod.eining, falid: false, lysing: b.rod.lysing || null }, kort[k], { skyring: b.skyring, skyring_af: b.af, skyring_at: b.at });
    });
    return kort;
  }
  const falidKort = () => gogn('falid', saekjaFalid, 60000).data || {};
  // Röð í kortinu getur borið skýringu eina — falið er AÐEINS falid = true.
  const rodFalin = x => !!x && x.falid === true;
  const erFalid = lykill => { const b = S.falidBid[lykill]; return b ? !!b.falid : rodFalin(falidKort()[lykill]); };
  // Skipt í sýnilegt og falið ÁÐUR en sneitt er (slice), svo næsta atriði færist upp.
  function fela(listi, lykill) {
    const synd = [], falin = [], kort = falidKort();
    (listi || []).forEach(x => { const l = lykill(x), b = S.falidBid[l]; ((b ? b.falid : rodFalin(kort[l])) ? falin : synd).push(x); });
    return { synd, falin };
  }
  const falinSum = n => (n ? ' · ' + n + ' falin' : '');
  // f = { l: lykill, e: eining, d: lýsing (fer í töfluna svo sagan skiljist), falinn: sýnt í „Sýna"-ham }.
  // 20.09.2026 (Agnar: „gera það alveg gagnvirkt — ekki post-it miða á vegg sem ég get ekki notað eða eytt"). MÆLT á
  // lifandi borðinu: mál á Master og í Áríðandi/Frestum/Forgangi/Nýjum málum/Póstsvörun var aðeins hægt að OPNA;
  // „Lokið" var inni í völdu máli og „Eyða" í einingu sem er sjálfgefið slökkt (Breyta máli). Nú ber HVER lína sem
  // er mál sömu þrjár aðgerðir: ✓ Lokið · ★ áríðandi af/á · 🗑 Eyða — allar með „Afturkalla". Eyðing er mjúk
  // (deleted_at), sama og í Breyta máli. Mál sem bíður samþykkis fær ekki ✓ (þar ERU svörin aðgerðin).
  const malAdg = (r, cls) => !r || !r.id ? '' : '<span class="radg' + (cls ? ' ' + cls : '') + '">' +
    (erSamthykki(r) ? '' : '<button type="button" class="fela adg" data-t5="done" data-id="' + r.id + '"' + dis(r.id) + ' title="Merkja málið lokið — hverfur af borðinu, hægt að afturkalla">✓ Lokið</button>') +
    '<button type="button" class="fela adg" data-t5="mal-ari" data-id="' + r.id + '"' + dis(r.id) + ' title="' + (r.important ? 'Taka áríðandi-merkið af' : 'Merkja áríðandi') + '">' + (r.important ? '★ af' : '☆ Áríðandi') + '</button>' +
    '<button type="button" class="fela adg eyda" data-t5="mal-eyda" data-id="' + r.id + '"' + dis(r.id) + ' title="Eyða málinu af öllum borðum — hægt að afturkalla">🗑 Eyða</button></span>';
  const felaTakki = f => (!f || typeof f !== 'object') ? '' : ' · <button type="button" class="fela" data-t5="' + (f.falinn ? 'fela-aftur' : 'fela') + '" data-fl="' + esc(f.l) +
    '" data-fe="' + esc(f.e) + '" data-fd="' + esc(String(f.d || '').slice(0, 200)) + '" title="' + (f.falinn ? 'Sýna aftur í listanum — á öllum vélum' : 'Fela úr listanum — á öllum vélum. Birtist aftur ef það breytist.') + '">' +
    (f.falinn ? 'Sýna aftur' : 'Fela') + '</button>' + skyrTakki(f);
  // „N falin · Sýna" undir hluta með földum atriðum; faldar raðir birtast undir takkanum. Sýna er val á skjánum (S).
  function falinHtml(h, fjoldi, teikna, vefja) {
    if (!fjoldi) return '';
    const syna = !!S.synaHluta[h], rodir = syna ? teikna() : '';
    return '<div class="more">' + fjoldi + ' falin · <button type="button" class="fela syna" data-t5="fela-syna" data-h="' + esc(h) + '" aria-expanded="' + syna + '">' +
      (syna ? 'Fela þau aftur' : 'Sýna') + '</button></div>' + (syna ? (vefja ? '<div class="' + vefja + '">' + rodir + '</div>' : rodir) : '');
  }
  // Teiknað strax; skrifað á þjóninn og lesið til baka. Mistakist það er fyrri staða sett aftur og villan sýnd.
  async function setjaFalid(lykill, eining, lysing, falid) {
    if (!FALID_LYKILL.test(String(lykill || ''))) { toast('Ógildur lykill — ekkert var vistað.', true); return false; }
    const c = sb();
    if (!c) { toast('Engin tenging við gagnagrunn — ekkert var vistað.', true); return false; }
    const fyrri = erFalid(lykill), fyrriRod = falidKort()[lykill] || null, tok = {};
    const row = { lykill, eining: eining || lykill.split(':')[0], falid, lysing: lysing ? String(lysing).slice(0, 200) : null, falid_af: nu() };
    S.falidBid[lykill] = { falid, row, tok };
    render();
    // Skrif á sama lykil fara í röð, svo síðasti smellur ræður líka á þjóninum.
    const verk = (_falidKedja[lykill] || Promise.resolve()).then(async () => {
      const r = await c.from('thjonustubord_falid').upsert(row, { onConflict: 'lykill' }).select('lykill,falid').single();
      if (r.error) throw r.error;
      if (!r.data || r.data.falid !== falid) throw new Error('las ekki til baka');
    });
    _falidKedja[lykill] = verk.catch(() => {});
    const minn = () => !!S.falidBid[lykill] && S.falidBid[lykill].tok === tok;
    try {
      await verk;
    } catch (e) {
      if (minn()) {
        delete S.falidBid[lykill];
        // Fyrri staða aftur — aðeins falid: skýring á röðinni (líka sú sem vistaðist á meðan) lifir.
        const g0 = G.falid, nuna = g0 && g0.data ? g0.data[lykill] : null;
        if (g0 && g0.data && (nuna || fyrri)) g0.data[lykill] = Object.assign({}, fyrriRod || row, nuna, { falid: fyrri });
      }
      render();
      toast((falid ? 'Faldist ekki' : 'Birtist ekki aftur') + ': ' + ((e && e.message) || e), true);
      return false;
    }
    if (minn()) S.falidBid[lykill].lokid = Date.now();
    const g = G.falid;
    // „Sýna aftur" tekur röðina ekki úr kortinu — hún getur borið skýringu; falid = false dugar.
    if (g && g.data && (falid || g.data[lykill])) g.data[lykill] = Object.assign({}, g.data[lykill], row);
    if (falid) toast('Falið úr listanum', false, () => setjaFalid(lykill, eining, lysing, false));
    else toast('Sýnt aftur í listanum');
    return true;
  }

  /* ── SKÝRING: stutt skýring á sama atriði og „Fela" — sami lykill, sama röð í thjonustubord_falid, samstillt ── */
  // Upsert { lykill, eining, skyring, skyring_af }: PostgREST uppfærir aðeins dálka skrifsins, svo skýring snertir aldrei falid
  // (sjálfgefið false — ný röð felur ekkert) og „Fela" aldrei skýringu. Gikkurinn stimplar skyring_at og bætir í söguna.
  const _skyrKedja = {};
  const hreinsaSkyr = t => { const s = String(t == null ? '' : t).trim(); return s || null; };     // '' telst engin skýring
  const skyrBreytt = o => !!o && hreinsaSkyr(o.texti) !== hreinsaSkyr(o.upphaf);
  function skyrOf(l) {
    const b = S.skyrBid[l];
    if (b) return b.skyring ? { skyring: b.skyring, af: b.af, at: b.at, bid: !b.lokid } : null;
    const x = falidKort()[l];
    return x && x.skyring ? { skyring: x.skyring, af: x.skyring_af, at: x.skyring_at } : null;
  }
  const dagsStutt = iso => {
    const d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return '';
    const s = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    return d.getFullYear() === new Date().getFullYear() ? s : s + '/' + d.getFullYear();
  };
  // „Skýring" / „Breyta skýringu" aftan við „Fela" — sama daufa útlit og sömu gögn á takkanum.
  const skyrTakki = f => {
    const s = skyrOf(f.l);
    return ' · <button type="button" class="fela" data-t5="skyr-opna" data-fl="' + esc(f.l) + '" data-fe="' + esc(f.e) + '" data-fd="' + esc(String(f.d || '').slice(0, 200)) +
      '" aria-expanded="' + !!(S.skyrOpid && S.skyrOpid.l === f.l) + '" title="' + (s ? 'Breyta skýringunni' : 'Skrifa stutta skýringu á atriðið') + ' — sést á öllum vélum og felur ekkert">' +
      (s ? 'Breyta skýringu' : 'Skýring') + '</button>';
  };
  // Eigin dauf lína undir efni línunnar, sýnilegrar og falinnar: „📝 texti — Agnar · 11.09." Opinn ritill kemur í hennar stað.
  function skyrLina(f) {
    if (!f || typeof f !== 'object') return '';
    if (S.skyrOpid && S.skyrOpid.l === f.l) return skyrRitill(S.skyrOpid, skyrOf(f.l));
    const s = skyrOf(f.l);
    if (!s) return '';
    const hver = [s.af, s.bid ? 'vistar…' : dagsStutt(s.at)].filter(Boolean).join(' · ');
    return '<span class="skyr">📝 ' + esc(s.skyring) + (hver ? ' — ' + esc(hver) : '') + '</span>';
  }
  function skyrRitill(o, s) {
    const bid = !!o.vistar, t = String(o.texti == null ? '' : o.texti), af = bid ? ' disabled' : '';
    return '<div class="skyrrit">' +
      // Fremsta línubil í <textarea> étur HTML-þáttarinn — eitt aukalegt heldur textanum eins og hann var skrifaður.
      '<textarea data-skyr="1" rows="' + Math.min(6, Math.max(2, t.split('\n').length + 1)) + '" placeholder="Stutt skýring, t.d. „bíður svars frá Eignaumsjón“" aria-label="Skýring á atriðinu"' +
        (bid ? ' readonly' : '') + '>' + (t.charAt(0) === '\n' ? '\n' : '') + esc(t) + '</textarea>' +
      (o.villa ? '<span class="skyr villa" role="alert">⚠ Vistaðist ekki: ' + esc(o.villa) + ' — textinn er enn í reitnum.</span>' : '') +
      '<div class="skyrtakkar">' +
        '<button type="button" class="btn gold sm" data-t5="skyr-vista" title="Ctrl+Enter"' + af + '>' + (bid ? 'Vista…' : 'Vista') + '</button>' +
        '<button type="button" class="btn iv sm" data-t5="skyr-haetta" title="Esc"' + af + '>Hætta við</button>' +
        (s ? '<button type="button" class="fela" data-t5="skyr-eyda"' + af + '>Eyða skýringu</button>' : '') +
      '</div></div>';
  }
  const skyrRot = () => { const v = document.getElementById(VIEW_ID); return v && v.shadowRoot; };
  function skyrFokus() {
    const root = skyrRot(), t = root && root.querySelector('.skyrrit textarea');
    if (!t) return;
    t.focus();
    try { t.setSelectionRange(t.value.length, t.value.length); } catch (_) {}
  }
  function skyrBlur() { const root = skyrRot(), ae = root && root.activeElement; if (ae && ae.dataset && ae.dataset.skyr) ae.blur(); }
  function skyrFokusTakki(l) {
    const root = skyrRot(), b = root && [...root.querySelectorAll('[data-t5="skyr-opna"]')].find(x => x.dataset.fl === l);
    if (b) b.focus({ preventScroll: true });
  }
  // Borðið getur verið falið þegar vistað er við brottför — skilaboð í skuggarót þess sæjust ekki, því showToast síðunnar.
  function skyrToast(msg, warn, afturkalla) {
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) { toast(msg, warn, afturkalla); return; }
    try { if (typeof window.showToast === 'function') { window.showToast(msg); return; } } catch (_) {}
    if (warn) console.warn('[368-thjonustubord5] ' + msg);
  }
  // Sama röð fyrir „Vista", útskolun og keepalive við lokun. lysing aðeins á NÝJA röð: hún lýsir því sem var falið og á
  // ekki að yfirskrifast þegar skýring bætist við.
  function skyrRod(f, skyring) {
    const lykill = String(f.l || ''), til = ((G.falid && G.falid.data) || {})[lykill];
    const rod = { lykill, eining: f.e || lykill.split(':')[0], skyring, skyring_af: nu() };
    if (!til && f.d) rod.lysing = String(f.d).slice(0, 200);
    return rod;
  }
  // Teiknað strax (S.skyrBid) og skrifað á þjóninn, lesið til baka. Mistakist það víkur skýringin í bið og fyrri skýring fer
  // aftur í kortið (sókn sem kláraðist á meðan gæti hafa tekið skýringuna í bið með sér).
  async function skrifaSkyringu(f, skyring) {
    const lykill = String((f && f.l) || '');
    if (!FALID_LYKILL.test(lykill)) return { ok: false, villa: 'ógildur lykill' };
    const c = sb();
    if (!c) return { ok: false, villa: 'engin tenging við gagnagrunn' };
    const til = ((G.falid && G.falid.data) || {})[lykill], tok = {}, rod = skyrRod(f, skyring);
    const fyrri = { skyring: til ? til.skyring || null : null, skyring_af: til ? til.skyring_af || null : null, skyring_at: til ? til.skyring_at || null : null };
    S.skyrBid[lykill] = { skyring, af: rod.skyring_af, at: new Date().toISOString(), rod, tok };
    render();
    // Skrif á sama lykil fara í röð, svo síðasta vistun ræður líka á þjóninum.
    const verk = (_skyrKedja[lykill] || Promise.resolve()).then(async () => {
      const r = await c.from('thjonustubord_falid').upsert(rod, { onConflict: 'lykill' }).select('lykill,skyring,skyring_af,skyring_at').single();
      if (r.error) throw r.error;
      if (!r.data || (r.data.skyring == null ? null : r.data.skyring) !== skyring) throw new Error('las ekki til baka');
      return r.data;
    });
    _skyrKedja[lykill] = verk.catch(() => {});
    const minn = () => !!S.skyrBid[lykill] && S.skyrBid[lykill].tok === tok;
    let d;
    try {
      d = await verk;
    } catch (e) {
      if (minn()) {
        delete S.skyrBid[lykill];
        const g0 = G.falid;
        if (g0 && g0.data && g0.data[lykill]) g0.data[lykill] = Object.assign({}, g0.data[lykill], fyrri);
      }
      render();
      return { ok: false, villa: (e && e.message) || String(e) };
    }
    if (minn()) Object.assign(S.skyrBid[lykill], { lokid: Date.now(), af: d.skyring_af, at: d.skyring_at });
    const g = G.falid;
    if (g && g.data) g.data[lykill] = Object.assign({ lykill, eining: rod.eining, falid: false, lysing: rod.lysing || null }, g.data[lykill], { skyring: d.skyring, skyring_af: d.skyring_af, skyring_at: d.skyring_at });
    render();
    return { ok: true };
  }
  // Ritillinn: S.skyrOpid = { l, e, d, texti, upphaf, vistar, villa } — upphaf er skýringin eins og hún er vistuð.
  function skyrOpna(f, drog) {
    const o = S.skyrOpid;
    if (o && o.vistar) { skyrToast('Augnablik — skýringin er að vistast.'); return; }
    if (o && o.l === f.l) { if (drog && !skyrBreytt(o)) o.texti = drog.texti; render(); skyrFokus(); return; }
    // Annar ritill opinn með óvistuðum texta: hann vistast fyrst og nýi ritillinn opnast aðeins ef það tókst.
    if (o && skyrBreytt(o)) { vistaSkyringu(true).then(ok => { if (ok) skyrOpna(f, drog); }); return; }
    const s = skyrOf(f.l), vistud = s ? s.skyring : '';
    S.skyrOpid = { l: f.l, e: f.e, d: f.d, texti: drog ? drog.texti : vistud, upphaf: vistud, vistar: false, villa: '' };
    render();
    skyrFokus();
  }
  // loka = „Vista"/„Eyða": ritillinn lokast þegar þjónninn hefur staðfest. Annars útskolun sem skilur ritilinn eftir opinn.
  // gildi = null eyðir skýringunni. Bilun: ritillinn stendur opinn með textanum og villan sést — engu er hent.
  async function vistaSkyringu(loka, gildi) {
    const o = S.skyrOpid;
    if (!o || o.vistar) return false;
    const skyring = gildi === undefined ? hreinsaSkyr(o.texti) : gildi, fyrri = skyrOf(o.l);
    if (gildi === undefined && skyring === hreinsaSkyr(o.upphaf)) {            // ekkert breyttist — engin skrif
      if (loka) { skyrBlur(); S.skyrOpid = null; render(); skyrFokusTakki(o.l); }
      return true;
    }
    o.vistar = true;
    o.villa = '';
    if (loka) skyrBlur();
    const r = await skrifaSkyringu(o, skyring);
    o.vistar = false;
    if (!r.ok) {
      o.villa = r.villa;
      o.villaTexti = o.texti;
      render();
      if (loka && S.skyrOpid === o) skyrFokus();
      skyrToast('Skýringin vistaðist ekki: ' + r.villa + ' — textinn er enn í reitnum.', true);
      return false;
    }
    if (S.skyrOpid === o) { if (loka) S.skyrOpid = null; else o.upphaf = skyring || ''; }
    render();
    if (!loka) return true;
    skyrFokusTakki(o.l);
    if (skyring !== null) skyrToast('Skýring vistuð');
    else skyrToast('Skýringu eytt', false, fyrri ? () => skrifaSkyringu(o, fyrri.skyring).then(x => skyrToast(x.ok ? 'Skýringin er komin aftur' : 'Skýringin kom ekki aftur: ' + x.villa, !x.ok)) : null);
    return true;
  }
  function skyrHaetta() {
    const o = S.skyrOpid;
    if (!o || o.vistar) return;
    skyrBlur();
    S.skyrOpid = null;
    render();
    skyrFokusTakki(o.l);
    // Rangt Esc týnir engu: „Afturkalla" opnar ritilinn aftur með því sem var skrifað.
    if (skyrBreytt(o)) skyrToast('Hætt við — skýringin var ekki vistuð', false, () => skyrOpna(o, { texti: o.texti }));
  }
  // Útskolun — flipinn hverfur, starfsmaður skiptir eða farið er af borðinu: óvistaður texti vistast STRAX (enginn tímamælir).
  function skolaSkyringu() { const o = S.skyrOpid; if (o && !o.vistar && skyrBreytt(o)) vistaSkyringu(false); }
  // Ritillinn hvarf úr teikningunni (atriðið fór úr listanum, einingin felld saman, faldar raðir faldar aftur): óvistaður texti
  // vistast strax og ritillinn lokast. Sama bilun er ekki reynd aftur við hverja teikningu — næsta útskolun reynir aftur.
  function skyrEftirTeikningu(root) {
    const o = S.skyrOpid;
    if (!o || o.vistar || root.querySelector('.skyrrit')) return;
    if (!skyrBreytt(o)) { S.skyrOpid = null; return; }
    if (o.villa && o.villaTexti === o.texti) return;
    vistaSkyringu(true);
  }
  // Síðunni lokað eða hún endurhlaðin: fetch supabase-js deyr með síðunni (mælt 09.09.2026, sjá 361), svo skrif sem eru enn á
  // leiðinni og óvistaður texti fara líka beint á PostgREST með keepalive. Sama upsert — tvöföld skrif eru skaðlaus.
  function skyrVidLokun() {
    const url = window.SUPABASE_URL, key = window.SUPABASE_KEY, rodir = {}, o = S.skyrOpid;
    if (!url || !key) return;
    Object.keys(S.skyrBid).forEach(l => { if (!S.skyrBid[l].lokid) rodir[l] = S.skyrBid[l].rod; });
    if (o && !o.vistar && skyrBreytt(o) && FALID_LYKILL.test(String(o.l || ''))) rodir[o.l] = skyrRod(o, hreinsaSkyr(o.texti));
    Object.keys(rodir).forEach(l => {
      try {
        fetch(url + '/rest/v1/thjonustubord_falid?on_conflict=lykill', {
          method: 'POST', keepalive: true,
          headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rodir[l])
        }).catch(() => {});
      } catch (_) {}
    });
  }

  /* ── VINNA: raðir í kröfulistunum opna vinnuglugga kröfunnar (369) eða söluna sjálfa (371) ── */
  const lakt = (...hlutar) => '<span class="lakt">' + hlutar.join('') + '</span>';
  const vinnaSoluTakki = x => '<button type="button" class="btn iv sm" data-t5="vinna-sala" data-sid="' + x.id + '" title="Opna vinnuglugga kröfunnar — þrep, gögn og tenglar">Vinna ›</button>';
  const opnaSoluTakki = x => '<button type="button" class="btn iv sm" data-t5="opna-solu" data-sid="' + x.id + '" data-num="' + esc(x.num || '') + '" title="Opna söluna' + (x.num ? ' ' + esc(x.num) : '') + '">Opna sölu ›</button>';
  function vinnaKrofu(teg, id) {
    const KV = window.KrofuVinnugluggi, fall = KV && (teg === 'gleymt' ? KV.opnaGleymt : KV.opnaSolu);
    if (typeof fall !== 'function') { toast('Vinnugluggi krafna (369) hefur ekki hlaðist — endurhlaðið síðuna.', true); return; }
    try { fall(id); } catch (e) { toast('Vinnuglugginn opnaðist ekki: ' + ((e && e.message) || e), true); }
  }
  function opnaSolu(id, num) {
    if (window.OpnaSolu && typeof OpnaSolu.opna === 'function') {
      try { OpnaSolu.opna(id); return; } catch (e) { console.warn('[368-thjonustubord5] OpnaSolu.opna', e); }
    }
    // Án 371: yfir á Sölu. Borðið felst við skiptin og skilaboð í skuggarót þess sæjust ekki — því showToast síðunnar.
    const texti = 'Leitaðu að ' + (num || 'sölu #' + id) + ' á Sölu.';
    goView('sala');
    try { if (typeof window.showToast === 'function') window.showToast(texti); else toast(texti); } catch (_) {}
  }

  /* ── aksturslistar (267 ArsAkstur: arsskodun_customers[fid].akstur = 1–3) ── */
  function aksturslistar() {
    const a = P('arsskodun_customers') || {}, out = { 1: [], 2: [], 3: [] };
    Object.keys(a).forEach(id => { const v = +((a[id] || {}).akstur) || 0; if (v >= 1 && v <= 3 && +id) out[v].push(+id); });
    return out;
  }
  async function saekjaStopp(ids) {
    const c = sb();
    if (!c || !ids.length) return [];
    const [rf, ru] = await Promise.all([
      c.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,postnumer,simi,farsimi,"tengiliður",tengilidur,plan_note').in('id', ids),
      c.from('v_uttaeki_fid_rollup').select('fyrirtaeki_id,units,slt,bsl,rs').in('fyrirtaeki_id', ids)
    ]);
    if (rf.error) throw rf.error;
    const tae = {};
    (ru.data || []).forEach(x => { tae[x.fyrirtaeki_id] = x; });
    return (rf.data || []).map(f => Object.assign({}, f, { taeki: tae[f.id] || null }))
      .sort((a, b) => String(a.postnumer || '').localeCompare(String(b.postnumer || '')) || String(a.heimilisfang || '').localeCompare(String(b.heimilisfang || ''), 'is'));
  }
  const simiAf = f => [f.simi, f.farsimi].filter(Boolean).join(' / ');
  const mapsSlod = stopp => 'https://www.google.com/maps/dir/' + stopp.filter(f => f.heimilisfang).slice(0, 10)
    .map(f => encodeURIComponent([f.heimilisfang, f.postnumer].filter(Boolean).join(' '))).join('/');
  function aksturVal(r) {
    if (!r.fyrirtaeki_id || !window.ArsAkstur) return '';
    let nu0 = 0;
    try { nu0 = +ArsAkstur.of(r.fyrirtaeki_id) || 0; } catch (_) {}
    return '<label class="setja"><span class="slabel">🚗 Akstur</span><select data-t5="ak-mal" data-fid="' + r.fyrirtaeki_id + '" aria-label="Aksturslisti">' +
      ['Enginn listi', 'Listi 1', 'Listi 2', 'Listi 3'].map((l, v) => '<option value="' + v + '"' + (nu0 === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>';
  }
  async function setjaAkstur(fid, n) {
    if (!window.ArsAkstur || !ArsAkstur.set) { toast('Aksturslistarnir eru ekki hlaðnir.', true); return; }
    let ok = false;
    try { ok = await ArsAkstur.set(fid, n); } catch (_) {}
    toast(ok ? (n ? 'Komið á aksturslista ' + n : 'Tekið af aksturslista') : 'Vistaðist ekki — reyndu aftur.', !ok);
    gleyma('akstur:');
    render();
  }
  // Prentað blað fyrir bílstjórann: samantekt efst (stopp, tæki, opin mál, póstnúmer), svo stoppin í póstnúmeraröð.
  async function prentaAksturslista(n) {
    const ids = aksturslistar()[n] || [];
    if (!ids.length) { toast('Listi ' + n + ' er tómur.', true); return; }
    const w = window.open('', '_blank');                  // strax við smell, svo sprettigluggavörn stöðvi ekki
    if (!w) { toast('Vafrinn lokaði glugganum — leyfðu sprettiglugga fyrir síðuna.', true); return; }
    w.document.write('<p style="font:14px system-ui">Sæki aksturslista…</p>');
    let stopp;
    try { stopp = await saekjaStopp(ids); } catch (e) { w.document.body.textContent = 'Náði ekki í listann: ' + ((e && e.message) || e); return; }
    const d = new Date(), dags = d.getDate() + '. ' + MAN[d.getMonth()] + ' ' + d.getFullYear();
    const sum = stopp.reduce((s, f) => { const t = f.taeki || {}; s.units += t.units || 0; s.slt += t.slt || 0; s.bsl += t.bsl || 0; s.rs += t.rs || 0; return s; }, { units: 0, slt: 0, bsl: 0, rs: 0 });
    const malAf = f => S.rows.filter(r => r.fyrirtaeki_id === f.id);
    const opinMal = stopp.reduce((s, f) => s + malAf(f).length, 0);
    const pnr = stopp.map(f => f.postnumer).filter(Boolean);
    const lina = (f, i) => {
      const t = f.taeki || {}, teng = f['tengiliður'] || f.tengilidur || '';
      const gera = malAf(f).map(r => '• ' + esc(r.title || '') + (samantekt(r) ? ' — ' + esc(samantekt(r).slice(0, 120)) : '')).join('<br>') +
        (f.plan_note ? (malAf(f).length ? '<br>' : '') + '✈ ' + esc(f.plan_note) : '');
      return '<tr><td class="n">' + (i + 1) + '</td><td><b>' + esc(f.nafn || '') + '</b>' + (f.kennitala ? '<br><small>' + esc(f.kennitala) + '</small>' : '') + '</td>' +
        '<td>' + esc(f.heimilisfang || '') + '<br><small>' + esc(f.postnumer || '') + '</small></td>' +
        '<td>' + esc(simiAf(f)) + (teng ? '<br><small>' + esc(teng) + '</small>' : '') + '</td>' +
        '<td class="t">' + (t.units ? t.units + '<br><small>SLT ' + (t.slt || 0) + ' · BSL ' + (t.bsl || 0) + ' · RS ' + (t.rs || 0) + '</small>' : '—') + '</td>' +
        '<td>' + (gera || '<small>—</small>') + '</td><td class="c">☐</td></tr>';
    };
    w.document.open();
    w.document.write('<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Aksturslisti ' + n + ' — ' + dags + '</title><style>' +
      '@page{size:A4 landscape;margin:12mm}body{font:12px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:14px}' +
      'h1{font-size:20px;margin:0 0 4px}.sub{color:#555;margin:0 0 10px}' +
      '.sum{display:flex;gap:22px;flex-wrap:wrap;border:1px solid #bbb;border-radius:6px;padding:8px 12px;margin:0 0 12px}.sum b{font-size:15px}' +
      'table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}' +
      'th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#444;border-bottom:2px solid #111}' +
      'td.n{width:22px;font-weight:700}td.t{white-space:nowrap}td.c{width:24px;font-size:18px;text-align:center}small{color:#555}' +
      '.bil{margin-top:14px;color:#555}@media print{.np{display:none}}</style></head><body>' +
      '<p class="np"><button onclick="print()">🖨 Prenta</button></p>' +
      '<h1>Aksturslisti ' + n + ' · ' + esc(dags) + '</h1><p class="sub">Póstnúmeraröð · Bílstjóri: ______________________</p>' +
      '<div class="sum"><span><b>' + stopp.length + '</b> stopp</span>' +
        '<span><b>' + sum.units + '</b> tæki (SLT ' + sum.slt + ' · BSL ' + sum.bsl + ' · RS ' + sum.rs + ')</span>' +
        '<span><b>' + opinMal + '</b> opin mál á stoppunum</span>' +
        (pnr.length ? '<span>Póstnúmer ' + esc(pnr[0]) + (pnr.length > 1 ? '–' + esc(pnr[pnr.length - 1]) : '') + '</span>' : '') + '</div>' +
      '<table><thead><tr><th>#</th><th>Fyrirtæki</th><th>Heimilisfang</th><th>Sími / tengiliður</th><th>Tæki</th><th>Hvað á að gera</th><th>✓</th></tr></thead><tbody>' +
      stopp.map(lina).join('') + '</tbody></table><p class="bil">Samtals ' + stopp.length + ' stopp.</p></body></html>');
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 400);
  }

  function akTakki(fid) {
    let v = 0;
    try { v = window.ArsAkstur ? (+ArsAkstur.of(fid) || 0) : 0; } catch (_) {}
    return v ? '<span class="tag ok" title="Á aksturslista ' + v + '">🚗 ' + v + '</span>'
      : [1, 2, 3].map(n => '<button type="button" class="skb" data-t5="ak-setja" data-fid="' + fid + '" data-v="' + n + '" title="Setja á aksturslista ' + n + '">🚗' + n + '</button>').join('');
  }
  // Rekur einhver á eftir okkur: ≥2 póstar frá sama sendanda á 14 dögum án svars frá okkur, eða ítrekunarorð á 30 dögum.
  // (Mælt 11.09.2026: merkin eru fá — 1–2 í einu — svo listinn á að vera stuttur og raunverulegur.)
  async function saekjaElt() {
    const c = sb();
    if (!c) return { eltir: [], itrek: [] };
    const r = await c.from('email_digest').select('id,folder,sender_email,sender_name,subject,snippet,to_addresses,received_at')
      .eq('account', 'eldklar@eldklar.is').gte('received_at', new Date(Date.now() - 30 * 864e5).toISOString()).order('received_at', { ascending: false }).limit(800);
    if (r.error) throw r.error;
    const rows = r.data || [], fraOkkur = m => m.folder === 'SENT' || /eldklar/i.test(m.sender_email || '');
    const SJALFVIRKT = /no-?reply|mailer-daemon|notification|bounce/i, REIKN = /sölureikning|reikningur nr|kvittun|pöntun afgreidd|order confirmation|greiðsluse/i;
    const ut = rows.filter(fraOkkur);
    const inn = rows.filter(m => !fraOkkur(m) && !SJALFVIRKT.test(m.sender_email || '') && !REIKN.test(m.subject || ''));
    const svarad = (netfang, eftir) => ut.some(m => String(m.to_addresses || '').toLowerCase().indexOf(netfang) >= 0 && tStamp(m.received_at) > eftir);
    const fjortan = Date.now() - 14 * 864e5, hopar = {};
    inn.filter(m => tStamp(m.received_at) >= fjortan).forEach(m => { const k = String(m.sender_email || '').toLowerCase(); if (k) (hopar[k] = hopar[k] || []).push(m); });
    const eltir = Object.keys(hopar).map(k => ({ netfang: k, mails: hopar[k] })).filter(h => h.mails.length >= 2 && !svarad(h.netfang, tStamp(h.mails[0].received_at)));
    const ORD = /ítrek|itrek|bíð enn|bíðum enn|hef ekki heyrt|höfum ekki heyrt|minni á|enn ekki fengið|hvenær (komið|getið|kemur)/i;
    const itrek = inn.filter(m => ORD.test((m.subject || '') + ' ' + (m.snippet || '')) && !svarad(String(m.sender_email || '').toLowerCase(), tStamp(m.received_at))
      && !eltir.some(h => h.netfang === String(m.sender_email || '').toLowerCase()));
    return { eltir, itrek };
  }
  // Sama regla og Brunakerfi-yfirlitið (272): engin skýrsla í ár, mánuður síðustu skýrslu kominn, ekki nýtt.
  async function saekjaBrunakerfi() {
    const c = sb();
    if (!c) return [];
    const velja = (f, t) => c.from('customer_documents').select('fyrirtaeki_id,year,doc_date,storage_path,drive_file_id').eq('doc_type', 'brunakerfi').not('fyrirtaeki_id', 'is', null).range(f, t);
    const docs = window.DB && DB.fetchAll ? await DB.fetchAll(velja, 1000) : ((await velja(0, 999)).data || []);
    const kort = P('brunakerfi_customers') || {};
    const ids = [...new Set(docs.map(d => d.fyrirtaeki_id).concat(Object.keys(kort).filter(x => !!kort[x]).map(Number)).filter(Boolean))];
    if (!ids.length) return [];
    const rf = await c.from('fyrirtaeki').select('id,nafn,heimilisfang,postnumer,simi,farsimi,"tengiliður"').in('id', ids);
    if (rf.error) throw rf.error;
    const ars = P('arsskodun_customers') || {}, AR = new Date().getFullYear(), MAN_NU = new Date().getMonth() + 1;
    return (rf.data || []).map(f => {
      const skjol = docs.filter(d => d.fyrirtaeki_id === f.id && d.year && (d.storage_path || d.drive_file_id) && !/\.html?(\b|$)/i.test(String(d.storage_path || '')));
      const latest = skjol.reduce((m, d) => Math.max(m, +d.year || 0), 0);
      const nyjast = skjol.filter(d => +d.year === latest && d.doc_date).sort((a, b) => tStamp(b.doc_date) - tStamp(a.doc_date))[0];
      const latestMonth = nyjast ? new Date(nyjast.doc_date).getUTCMonth() + 1 : 0;
      const done = skjol.some(d => +d.year === AR);
      const nytt = !skjol.length || !!(window.NyttBadge && NyttBadge.is && NyttBadge.is(f.id));
      const wip = !done && +((ars[String(f.id)] || {}).field_inspected_year) === AR;
      return Object.assign({}, f, { latest, latestMonth, done, nytt, wip,
        due: !done && !nytt && !wip && latestMonth > 0 && latestMonth <= MAN_NU, upcoming: !done && !nytt && !wip && latestMonth > MAN_NU });
    });
  }

  /* ── Skýrslur: vinnublöð (sara_yfirferd) og það sem er í vinnslu ── */
  async function saekjaSkyrslur() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const AR = new Date().getFullYear();
    const rv = await c.from('sara_yfirferd').select('*').in('stada', ['bidur', 'samthykkt']);
    if (rv.error) throw rv.error;
    const blod = rv.data || [], ars = P('arsskodun_customers') || {};
    const iVinnslu = Object.keys(ars).filter(id => +((ars[id] || {}).field_inspected_year) === AR && +((ars[id] || {}).last_year_inspected) !== AR).map(Number).filter(Boolean);
    const fids = [...new Set(blod.map(b => b.fyrirtaeki_id).filter(Boolean).concat(iVinnslu))];
    const D = { blod, iVinnslu, fyr: [], skjol: [], solur: [], systkin: {}, stadir: {}, AR };
    if (!fids.length) return D;
    const rf = await c.from('fyrirtaeki').select('id,nafn,customer_base_id,deleted_at').in('id', fids);
    if (rf.error) throw rf.error;
    D.fyr = rf.data || [];
    // 368ab (Agnar 14.09.2026: Breiðvangur 9 „er tilbúinn líka, er búinn að gera skýrslu"): sameinaður (eyddur) staður bar enn
    // „í vinnslu" í Ársskoðun og sýndist án skýrslu, því skýrslan er á staðnum sem hann var sameinaður í. Eyddir staðir detta út.
    D.iVinnslu = iVinnslu.filter(id => D.fyr.some(f => f.id === id && !f.deleted_at));
    const bases = [...new Set(D.fyr.map(f => f.customer_base_id).filter(Boolean))];
    const tomt = Promise.resolve({ data: [] });
    const [rd, rs, rsy] = await Promise.all([
      c.from('customer_documents').select('fyrirtaeki_id,doc_type,doc_date,year').in('fyrirtaeki_id', fids).in('doc_type', ['uttektarskyrsla', 'brunakerfi']).eq('year', AR).not('is_duplicate', 'is', true),
      bases.length ? c.from('solur').select('id,num,customer_base_id,customer_id,created_at,samtals,greitt_med,paid_at,is_credit,credit_of,dk_invoice_id').in('customer_base_id', bases).eq('status', 'final').gte('created_at', AR + '-01-01') : tomt,
      bases.length ? c.from('fyrirtaeki').select('id,customer_base_id').in('customer_base_id', bases).is('deleted_at', null) : tomt
    ]);
    D.skjol = rd.data || [];
    // 368ab: bakfærður reikningur telst ekki með — kreditreikningur í appinu eða afturkallaður í Payday (Pizzan R-000778 04.09).
    const allar = rs.data || [], bakfaert = new Set(allar.filter(s => s.is_credit && s.credit_of).map(s => s.credit_of));
    const dk = [...new Set(allar.map(s => s.dk_invoice_id).filter(Boolean))];
    if (dk.length) {
      const rp = await c.from('payday_invoices_slokk').select('payday_id,status').in('payday_id', dk);
      if (rp.error) throw rp.error;
      const afturkallad = new Set((rp.data || []).filter(p => p.status === 'CANCELLED').map(p => p.payday_id));
      allar.forEach(s => { if (s.dk_invoice_id && afturkallad.has(s.dk_invoice_id)) bakfaert.add(s.id); });
    }
    D.solur = allar.filter(s => !s.is_credit && !bakfaert.has(s.id));
    (rsy.data || []).forEach(x => {
      D.systkin[x.customer_base_id] = (D.systkin[x.customer_base_id] || 0) + 1;
      (D.stadir[x.customer_base_id] = D.stadir[x.customer_base_id] || new Set()).add(x.id);
    });
    return D;
  }
  // Dagsetning vinnublaðs: dagsetning (dd.mm.áááá), annars 1. dagur mánaðarins (manudur), annars 0 = óþekkt.
  function blodDags(b, AR) {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(b.dagsetning || '').trim());
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
    const t = String(b.manudur || '').trim().toLowerCase(), i = MAN.findIndex(x => t.indexOf(x) === 0);
    return i >= 0 ? new Date(AR, i, 1).getTime() : 0;
  }
  function sonnun(fid, fra, D) {
    const f = D.fyr.find(x => x.id === fid) || null;
    const sk = D.skjol.filter(d => d.fyrirtaeki_id === fid && (!d.doc_date || tStamp(d.doc_date) >= fra)).sort((a, b) => tStamp(b.doc_date) - tStamp(a.doc_date))[0] || null;
    const systkin = f && f.customer_base_id ? (D.systkin[f.customer_base_id] || 0) : 0, stadir = f && D.stadir ? D.stadir[f.customer_base_id] : null;
    // 368ab: reikningur á SAMA stað (solur.customer_id — 723 af 761 sölum 2026 vísa á stað sama kúnna). Vísi salan á engan
    // lifandi stað kúnnans (enginn, eyddur eða sameinaður) telst hún aðeins ef kúnninn á einn stað: Pizzan á 11 staði og
    // R-000842 (Núpalind) sýndist reikningur Háholts.
    const aStad = s => s.customer_id === fid || (systkin <= 1 && !(s.customer_id && stadir && stadir.has(s.customer_id)));
    const rk = f && f.customer_base_id ? D.solur.filter(s => s.customer_base_id === f.customer_base_id && aStad(s) && tStamp(s.created_at) >= fra).sort((a, b) => tStamp(b.created_at) - tStamp(a.created_at))[0] || null : null;
    return { sk, rk, nafn: f ? f.nafn : '', systkin };
  }
  const vbListi = D => D.blod.map(b => { const fra = blodDags(b, D.AR), x = sonnun(b.fyrirtaeki_id, fra, D); return Object.assign(x, { b, fra, buid: !!(x.sk && x.rk) }); });
  function vbSamtals(b) {
    let ex = 0, vsk = 0;
    (Array.isArray(b.linur) ? b.linur : []).forEach(l => { const e = (+l.n || 0) * (+l.v || 0); ex += e; vsk += e * ((isFinite(+l.vsk) && l.vsk !== '' && l.vsk != null ? +l.vsk : 24) / 100); });
    const auka = (+b.akstur || 0) * (+b.akstur_verd || 0) + (+b.skyrslugerd || 0);
    return Math.round(ex + auka + vsk + auka * 0.24);
  }
  function vbInnihald(b) {
    const linur = Array.isArray(b.linur) ? b.linur : [];
    return (linur.length || +b.akstur || +b.skyrslugerd ? '<ul class="vbl">' +
        linur.map(l => '<li><span>' + esc(l.l || '(lína)') + '</span><span>' + esc(String(l.n || 0)) + ' × ' + kr(l.v) + '</span></li>').join('') +
        (+b.akstur ? '<li><span>Akstur</span><span>' + esc(String(b.akstur)) + ' × ' + kr(b.akstur_verd) + '</span></li>' : '') +
        (+b.skyrslugerd ? '<li><span>Skýrslugerð</span><span>' + kr(b.skyrslugerd) + '</span></li>' : '') + '</ul>' : '') +
      (b.texti ? '<div class="vbtexti">' + esc(b.texti) + '</div>' : '') +
      (b.spurning ? '<div class="vbspurn">❓ ' + esc(b.spurning) + '</div>' : '') +
      (b.athugasemd ? '<div class="vbtexti">📝 ' + esc(b.athugasemd) + '</div>' : '');
  }
  function vbRow(x, f) {
    const b = x.b, samt = b.stada === 'samthykkt', opid = !!(S.vbOpin || {})[b.id], upph = vbSamtals(b), bid = S.busy['vb' + b.id] ? ' disabled' : '';
    const nafn = b.fyrirtaeki_id ? '<a class="clink" href="#company/' + b.fyrirtaeki_id + '" data-t5="fyr-id" data-fid="' + b.fyrirtaeki_id + '">' + esc(b.fyrirtaeki || x.nafn || '(ónefnt)') + '</a>' : '<b>' + esc(b.fyrirtaeki || '(ónefnt)') + '</b>';
    const sonn = (x.sk ? '<span class="tag ok">📄 Skýrsla ' + esc(x.sk.doc_date ? fmtD(x.sk.doc_date) : String(x.sk.year)) + '</span>' : '<span class="tag">Engin skýrsla ' + new Date().getFullYear() + '</span>') +
      (x.rk ? '<span class="tag ok">🧾 ' + esc(x.rk.num || 'Sala') + ' · ' + esc(fmtD(x.rk.created_at)) + (x.rk.paid_at ? ' · greitt' : '') + '</span>' : '<span class="tag">Enginn reikningur</span>') +
      (!x.fra ? '<span class="tag" title="Hvorki dagsetning né mánuður á blaðinu — allt árið borið saman">Dagsetning vantar</span>' : '') +
      (x.systkin > 1 && x.rk ? '<span class="tag hot" title="Fleiri staðir á sama viðskiptavini — reikningurinn gæti átt við annan stað">⚠ ' + x.systkin + ' staðir á kúnna</span>' : '');
    return '<div class="vbrow' + (x.buid ? ' buid' : '') + (f && f.falinn ? ' falid' : '') + '"><div class="vbhead">' +
        '<span class="tag' + (samt ? ' ok' : '') + '">' + (samt ? 'Samþykkt' : 'Bíður') + '</span>' + nafn +
        '<span class="s">' + esc(b.dagsetning || b.manudur || 'Dagsetning vantar') + (b.skodunarmadur ? ' · ' + esc(b.skodunarmadur) : '') + (upph ? ' · ' + kr(upph) : '') + felaTakki(f) + '</span>' +
        '<span class="grow"></span><button type="button" class="btn iv sm tog" data-t5="vb-opna" data-vb="' + b.id + '" aria-expanded="' + opid + '" aria-label="Innihald blaðsins">' + (opid ? '▴' : '▾') + '</button></div>' +
      // Undir hauslínunni, ekki inni í henni: hún brotnar um línur og skýringin ýtti ▾ niður fyrir sig.
      skyrLina(f) + '<div class="tags">' + sonn + '</div>' + (opid ? vbInnihald(b) : '') +
      '<div class="sacts">' +
        '<button type="button" class="btn iv sm" data-t5="vb-stada" data-vb="' + b.id + '" data-v="' + (samt ? 'bidur' : 'samthykkt') + '"' + bid + '>' + (samt ? '↩ Aftur í bið' : '✓ Samþykkja') + '</button>' +
        '<button type="button" class="btn ' + (x.buid ? 'gold' : 'iv') + ' sm" data-t5="vb-stada" data-vb="' + b.id + '" data-v="klarad"' + bid + '>' + (x.buid ? 'Líklega búið — merkja klárað' : 'Merkja klárað') + '</button>' +
      '</div></div>';
  }
  // Sömu skrif og 364 (hak / sleppa / opna-aftur), lesin til baka. Afturkalla skilar fyrri stöðu.
  async function vbStada(id, stada, fyrriStada) {
    const c = sb(), g = G.skyrslur, b = g && g.data ? g.data.blod.find(x => x.id === id) : null;
    if (!c || (!b && !fyrriStada)) return;
    const fyrri = fyrriStada || { stada: b.stada, samthykkt_at: b.samthykkt_at || null, samthykkt_by: b.samthykkt_by || null };
    const patch = stada === 'samthykkt' ? { stada, samthykkt_at: new Date().toISOString(), samthykkt_by: nu() }
      : stada === 'bidur' ? { stada, samthykkt_at: null, samthykkt_by: null } : fyrriStada ? Object.assign({}, fyrriStada) : { stada };
    S.busy['vb' + id] = 1;
    render();
    try {
      const r = await c.from('sara_yfirferd').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id).select('id,stada');
      if (r.error) throw r.error;
      if (!r.data || !r.data.length || r.data[0].stada !== patch.stada) throw new Error('las ekki til baka');
      if (fyrriStada) toast('Fyrri staða vinnublaðsins er komin aftur');
      else toast(stada === 'samthykkt' ? '🟢 ' + (b.fyrirtaeki || 'Vinnublaðið') + ' samþykkt — Sara má klára skýrslu og reikning' : stada === 'bidur' ? '🟡 ' + (b.fyrirtaeki || 'Vinnublaðið') + ' aftur í bið' : '✓ ' + (b.fyrirtaeki || 'Vinnublaðið') + ' merkt klárað',
        false, () => vbStada(id, fyrri.stada, fyrri));
    } catch (e) { toast('Vistaðist ekki: ' + ((e && e.message) || e), true); }
    delete S.busy['vb' + id];
    gleyma('skyrslur');
    render();
    load(true);
  }

  /* ── Kröfur-hamur: gögn ── */
  async function saekjaKrofur() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const [ro, rc] = await Promise.all([
      DB.fetchAll((from, to) => c.from('solur').select('id,num,customer_nafn,customer_base_id,samtals,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit').eq('greitt_med', 'reikningur').is('paid_at', null).neq('status', 'void').order('id').range(from, to)).then(data => ({ data, error: null }), error => ({ data: null, error })),
      DB.fetchAll((from, to) => c.from('solur').select('credit_of').eq('is_credit', true).not('credit_of', 'is', null).order('id').range(from, to)).then(data => ({ data, error: null }), error => ({ data: null, error }))
    ]);
    if (ro.error) throw ro.error;
    // 14.09.2026: kredit-útilokunin er fail-LOUD eins og í 369 — án hennar birtust bakfærðar kröfur sem útistandandi (69 í stað 58).
    if (rc.error) throw rc.error;
    const bakfaert = new Set((rc.data || []).map(x => x.credit_of));
    const krofur = (ro.data || []).filter(s => !s.is_credit && !bakfaert.has(s.id));
    const ids = krofur.map(s => s.dk_invoice_id).filter(Boolean), gjald = {};
    if (ids.length) {
      try {
        // Parað á payday_id = dk_invoice_id, ekki reference: ógildur reikningur og kreditreikningur hans deila reference í Payday.
        const rp = await c.from('payday_invoices_slokk').select('payday_id,due_date,final_due_date,status').in('payday_id', ids);
        (rp.data || []).forEach(p => { gjald[p.payday_id] = p; });
      } catch (_) {}
    }
    // DRAFT í Payday er EKKI sent: kúnninn fékk ekkert og engin krafa er í banka (11.09.2026: 13 sölur, 446.805 kr).
    return krofur.map(s => {
      const p = (s.dk_invoice_id && gjald[s.dk_invoice_id]) || null, drog = !!(p && p.status === 'DRAFT');
      return Object.assign({}, s, { gjald: p, drog, send: !!(s.krafa_sent_at || s.invoiced_at || s.dk_invoice_id) && !drog });
    });
  }
  // Úttektir með skoðunarmánuði, vinnublaði og síðasta Stólpa-reikningi (sql/2026-09-11_gleymt_uttekt_stolpi.sql). Úttektir
  // rukkaðar gegnum Stólpa (fyrri eigendur) eru í sér sýn — teljast greiddar fyrri eigendum, aldrei rukkaðar aftur.
  async function saekjaGleymt() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const fjortan = new Date(Date.now() - 14 * 864e5).toISOString();
    const [ru, rg, rk, rs] = await Promise.all([
      c.from('v_gleymt_ad_rukka_uttekt').select('fyrirtaeki_id,nafn,heimilisfang,postnumer,skyrslur,skyrsla_dags,skodun_dags,skodun_heimild,vinnublad_id,vinnublad_manudur,vinnublad_dags,vinnublad_stada,stolpi_sidast_nr,stolpi_sidast_dags,stolpi_sidast_stada,stolpi_sidast_upphaed').order('skodun_dags', { ascending: true }),
      DB.fetchAll((from, to) => c.from('solur').select('id,num,customer_nafn,customer_base_id,samtals,created_at,starfsmadur').eq('greitt_med', 'greitt_sidar').eq('status', 'drog').is('paid_at', null).lt('created_at', fjortan).order('created_at', { ascending: true }).order('id').range(from, to)).then(data => ({ data, error: null }), error => ({ data: null, error })),
      DB.fetchAll((from, to) => c.from('solur').select('id,num,customer_nafn,customer_base_id,samtals,created_at,greitt_med,starfsmadur').in('greitt_med', ['kort', 'reidufe']).is('paid_at', null).eq('status', 'final').not('is_credit', 'is', true).order('created_at', { ascending: true }).order('id').range(from, to)).then(data => ({ data, error: null }), error => ({ data: null, error })),
      c.from('v_gleymt_uttekt_stolpi').select('fyrirtaeki_id,nafn,heimilisfang,postnumer,skodun_dags,skodun_heimild,stolpi_nr,stolpi_dags,stolpi_stada,stolpi_upphaed').order('skodun_dags', { ascending: true })
    ]);
    if (ru.error) throw ru.error;

    // 19.09.2026 — SAMÞYKKT VINNUBLAÐ ÁN SÖLU. audit-vinnublad-an-solu hefur verið
    // rauður síðan 17.09 með 335.611 kr sem enginn rukkaði, og sagt það í skel sem
    // enginn horfir á. Sama regla og vörðurinn notar: blað með samthykkt_at, ekki
    // „hafnad", og engin sala á sama viðskiptavini frá 30 dögum FYRIR samþykktina
    // (salan er stundum stofnuð á undan).
    let blod = [];
    try {
      const [rb, rf, rsl] = await Promise.all([
        c.from('sara_yfirferd').select('id,fyrirtaeki,fyrirtaeki_id,stada,samthykkt_at,samthykkt_by,linur,akstur,akstur_verd,skyrslugerd')
          .not('samthykkt_at', 'is', null).limit(1000),
        DB.fetchAll((from, to) => c.from('fyrirtaeki').select('id,customer_base_id').order('id').range(from, to)),
        DB.fetchAll((from, to) => c.from('solur').select('id,customer_base_id,created_at').not('customer_base_id', 'is', null)
          .gte('created_at', new Date(Date.now() - 400 * 864e5).toISOString()).order('id').range(from, to)),
      ]);
      if (rb.error) throw rb.error;
      const baseAf = new Map((rf || []).map(f => [f.id, f.customer_base_id]));
      const eftirBase = new Map();
      (rsl || []).forEach(s => { const l = eftirBase.get(s.customer_base_id) || []; l.push(s); eftirBase.set(s.customer_base_id, l); });
      const upphaed = b => {
        const linur = Array.isArray(b.linur) ? b.linur : [];
        return linur.reduce((s, x) => s + (Number(x.n) || 0) * (Number(x.v) || 0), 0)
          + (Number(b.akstur) || 0) * (Number(b.akstur_verd) || 0) + (Number(b.skyrslugerd) || 0);
      };
      blod = (rb.data || []).filter(b => {
        if (b.stada === 'hafnad') return true === false;
        const base = baseAf.get(b.fyrirtaeki_id);
        const mork = Date.parse(b.samthykkt_at) - 30 * 864e5;
        const s = (base == null ? [] : (eftirBase.get(base) || [])).filter(x => Date.parse(x.created_at) >= mork);
        return !s.length;
      }).map(b => Object.assign({}, b, { upphaed: upphaed(b) })).sort((a, b) => b.upphaed - a.upphaed);
    } catch (_) { blod = []; }   // þessi hluti má ekki fella hina þrjá

    return { uttekt: (ru.data || []).slice().sort(rodSkodun), sidar: rg.data || [], kort: rk.data || [], blod: blod,
      stolpi: rs.error ? null : (rs.data || []).slice().sort(rodSkodun), stolpiVilla: rs.error ? (rs.error.message || String(rs.error)) : '' };
  }
  const BAKF_ORD = ['bakfær', 'kreditreikn', 'kredit', 'leiðrétt', 'endurgreið', 'tvírukk', 'breyta reikn', 'rangur reikn', 'afrit af reikn', 'fella niður'];
  async function saekjaBakfaerslur() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const fra60 = new Date(Date.now() - 60 * 864e5).toISOString();
    const or = BAKF_ORD.map(o => 'subject.ilike."%' + o + '%",snippet.ilike."%' + o + '%"').join(',');
    const [rp, rc] = await Promise.all([
      c.from('email_digest').select('id,subject,snippet,sender_name,sender_email,received_at,folder').eq('account', 'eldklar@eldklar.is').gte('received_at', fra60).or(or).order('received_at', { ascending: false }).limit(40),
      c.from('solur').select('id,num,customer_nafn,samtals,created_at,credit_of').eq('is_credit', true).gte('created_at', fra60).order('created_at', { ascending: false })
    ]);
    if (rp.error) throw rp.error;
    return { postar: (rp.data || []).filter(m => m.folder !== 'SENT'), kredit: rc.data || [] };
  }
  async function saekjaAfgreidslu() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const vika = new Date(d0); vika.setDate(vika.getDate() - ((vika.getDay() + 6) % 7));
    const SEL_S = 'id,num,customer_nafn,samtals,created_at,greitt_med,status,paid_at,is_credit';
    const [rv, ro] = await Promise.all([
      c.from('solur').select(SEL_S).eq('starfsmadur', 'Kassi').gte('created_at', vika.toISOString()).neq('status', 'void'),
      DB.fetchAll((from, to) => c.from('solur').select(SEL_S).eq('starfsmadur', 'Kassi').is('paid_at', null).neq('status', 'void').not('is_credit', 'is', true).order('id').range(from, to)).then(data => ({ data, error: null }), error => ({ data: null, error }))
    ]);
    if (rv.error) throw rv.error;
    return { vika: (rv.data || []).filter(s => !s.is_credit), opin: ro.data || [], dagur: d0.getTime() };
  }
  const summa = l => l.reduce((s, x) => s + (+x.samtals || 0), 0);
  const daga = t => Math.max(0, Math.floor((Date.now() - tStamp(t)) / 864e5));
  // 19.09.2026 — KRAFA SEM FER ALDREI. Sala merkt „reikningur" með tóman
  // customer_base_id á engan viðtakanda: krafan verður aldrei send. Hún sat samt
  // í „Ósendar kröfur" og leit eins út og hinar, svo hún beið þess að einhver
  // reyndi og kæmist að því. Merkið segir hvað þarf, ekki bara að eitthvað sé að.
  const otengdMerki = x => (x && x.customer_base_id == null)
    ? '<div class="meta">⚠ enginn kúnni skráður — krafan verður ekki send fyrr en kennitala er tengd</div>' : '';
  const soluLina = (x, merki, f) => '<div class="lrow' + (f && f.falinn ? ' falid' : '') + '"><span class="age">' + esc(x.num || '—') + '</span><div><b>' + esc(x.customer_nafn || '(ónefnt)') + '</b>' +
    '<span class="s">' + kr(x.samtals) + ' · ' + esc(fmtD(x.created_at)) + (x.starfsmadur ? ' · ' + esc(x.starfsmadur) : '') + (x.krafa_note ? ' · ' + esc(String(x.krafa_note).slice(0, 60)) : '') + felaTakki(f) + '</span>' + otengdMerki(x) + skyrLina(f) + '</div>' + (merki || '<span></span>') + '</div>';
  const soluLysing = x => [x.num, x.customer_nafn, kr(x.samtals)].filter(Boolean).join(' · ');
  // Gleymst að rukka? (Agnar 11.09.2026: „hvaða mánuð skýrslan var gerð, er hún á vinnublaði, eða kanski greitt gegnum
  // fyrri eigendur"): vinstra megin dagsetning skýrslu þegar hún er skráð, annars mánuður úr tækjaskrá (uttaeki.last_insp).
  const MAN_STUTT = ['jan.', 'feb.', 'mars', 'apr.', 'maí', 'júní', 'júlí', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];
  const VB_STADA_HEITI = { bidur: 'Bíður', samthykkt: 'Samþykkt', klarad: 'Klárað' };
  const dagsFull = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  function skodunHtml(x) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(x.skodun_dags || ''));
    if (!m) return '<span class="age" title="Skoðunardagur óþekktur">—</span>';
    const skyrsla = x.skodun_heimild === 'skyrsla';
    return '<span class="age" title="' + (skyrsla ? 'Dagsetning skýrslu ' + dagsFull(x.skodun_dags) : 'Skoðunarmánuður úr tækjaskrá') + '">' +
      (skyrsla ? (+m[3]) + '. ' : '') + MAN_STUTT[+m[2] - 1] + '</span>';
  }
  const rodSkodun = (a, b) => (a.skodun_dags ? 0 : 1) - (b.skodun_dags ? 0 : 1) || String(a.skodun_dags || '').localeCompare(String(b.skodun_dags || '')) ||
    String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is');

  /* ── Hreinsa Master ── */
  const HR_FLOKKAR = [['tvitekid', 'Tvítekið'], ['buid', 'Líklega búið'], ['ekkertfyr', 'Vantar fyrirtæki'], ['gamalt', 'Gamalt og óhreyft'], ['opid', 'Enn opið']];
  const titilLykill = t => fold(String(t || '').replace(/^\s*((re|fw|fwd|sv|tr)\s*:\s*)+/i, '')).replace(/[^a-z0-9]+/g, ' ').trim();
  function flokkaMaster() {
    const rows = S.rows.filter(isFree), nyrriTil = {}, nuna = Date.now();
    const merkjaEldri = hopur => {
      if (hopur.length < 2) return;
      const rod = hopur.slice().sort((a, b) => tStamp(b.created_at) - tStamp(a.created_at));
      rod.slice(1).forEach(r => { if (!nyrriTil[r.id]) nyrriTil[r.id] = rod[0]; });
    };
    const hopar = {}, thraedir = {};
    rows.forEach(r => {
      const k = (r.fyrirtaeki_id || r.customer_base_id || fold(whereOf(r)) || '-') + '|' + titilLykill(r.title);
      if (titilLykill(r.title)) (hopar[k] = hopar[k] || []).push(r);
      if (r.channel_ref) (thraedir[r.channel_ref] = thraedir[r.channel_ref] || []).push(r);
    });
    Object.values(hopar).forEach(merkjaEldri);
    Object.values(thraedir).forEach(merkjaEldri);
    return rows.map(r => {
      const hreyft = Math.floor((nuna - tStamp(r.updated_at || r.created_at)) / 864e5), vk = virkniEftir(r);
      if (nyrriTil[r.id]) return { r, fl: 'tvitekid', astaeda: 'Nýrra eintak til: #' + nyrriTil[r.id].id + ' ' + String(nyrriTil[r.id].title || '').slice(0, 50) };
      if (vk) return { r, fl: 'buid', astaeda: 'Eftir að málið varð til: ' + vk.join(' og ') };
      if (!r.fyrirtaeki_id && !r.customer_base_id) return { r, fl: 'ekkertfyr', astaeda: 'Ekki tengt fyrirtæki' };
      if (ageDays(r) > 90 && hreyft > 60) return { r, fl: 'gamalt', astaeda: 'Ekki hreyft í ' + hreyft + ' daga' };
      return { r, fl: 'opid', astaeda: ageDays(r) + ' daga gamalt' };
    });
  }
  function hreinsunHtml() {
    if (!S.hreinsa) return '';
    const listi = flokkaMaster(), sia = S.hrSia || 'tvitekid', val = S.hrVal || (S.hrVal = {});
    const synd = listi.filter(x => x.fl === sia).sort((a, b) => tStamp(a.r.created_at) - tStamp(b.r.created_at));
    if (sia === 'ekkertfyr') gogn('tf-post', saekjaSendendur, 600000);
    const valin = Object.keys(val).filter(id => val[id] && S.rows.some(r => String(r.id) === id)).length;
    const allir = synd.length > 0 && synd.every(x => val[x.r.id]);
    return '<section class="panel hreinsun" aria-label="Hreinsa Master">' +
      '<header class="phead"><span class="plate">🧹</span><h2 class="ptitle">Hreinsa Master</h2><span class="sum">' + listi.length + ' mál á Master · þú velur hverju er lokað</span><span class="grow"></span>' +
        '<button type="button" class="btn iv sm" data-t5="hr-opna">Loka hreinsun</button></header>' +
      '<div class="hrsia"><div class="seg sm" role="group" aria-label="Flokkar">' + HR_FLOKKAR.map(f =>
          '<button type="button" data-t5="hr-sia" data-v="' + f[0] + '" aria-pressed="' + (sia === f[0]) + '">' + f[1] + '<span class="c">' + listi.filter(x => x.fl === f[0]).length + '</span></button>').join('') + '</div>' +
        '<span class="grow"></span>' +
        '<button type="button" class="btn iv sm" data-t5="hr-allir" data-v="' + (allir ? '0' : '1') + '"' + (synd.length ? '' : ' disabled') + '>' + (allir ? 'Afvelja flokkinn' : 'Velja allan flokkinn') + '</button>' +
        '<button type="button" class="btn gold sm" data-t5="hr-loka"' + (valin && !S.hrBid ? '' : ' disabled') + '>' + (S.hrBid ? 'Loka…' : '✓ Loka völdum (' + valin + ')') + '</button></div>' +
      (synd.length ? '<div class="hrlist">' + synd.map(x => '<div class="hrrow">' +
          '<input type="checkbox" data-t5="hr-val" data-id="' + x.r.id + '"' + (val[x.r.id] ? ' checked' : '') + ' aria-label="Velja mál #' + x.r.id + '">' +
          '<span class="age ' + ageCls(ageDays(x.r)) + '">' + ageDays(x.r) + 'D</span><span class="hrinfo">' +
          '<button type="button" class="lpick" data-t5="skoda" data-id="' + x.r.id + '"><b>' + esc(x.r.title || '(ónefnt mál)') + '</b></button>' +
          '<span class="s">' + [fyrLink(x.r), esc(eigandaTexti(x.r, nu())), esc(x.astaeda)].filter(Boolean).join(' · ') + '</span>' + (x.fl === 'ekkertfyr' ? tfTakkar(x.r) : '') + '</span></div>').join('') + '</div>'
        : emptyHtml('Ekkert mál í þessum flokki.')) +
    '</section>';
  }
  async function lokaVoldum() {
    const c = sb();
    const ids = Object.keys(S.hrVal || {}).filter(id => S.hrVal[id]).map(Number).filter(id => S.rows.some(r => r.id === id));
    if (!c || !ids.length || S.hrBid) return;
    if (!window.confirm('Loka ' + ids.length + (ids.length === 1 ? ' máli' : ' málum') + '? Þau hverfa af borðunum en eyðast ekki — „Afturkalla" opnar þau aftur.')) return;
    const fyrri = {};
    ids.forEach(id => { const r = S.rows.find(x => x.id === id); fyrri[id] = (r && r.status) || 'nytt'; });
    S.hrBid = true;
    render();
    try {
      const r = await c.from('thjonustubeidni').update({ status: 'lokad', updated_at: new Date().toISOString() }).in('id', ids).select('id,status');
      if (r.error) throw r.error;
      const lokud = (r.data || []).filter(x => x.status === 'lokad').map(x => x.id);
      S.hrVal = {};
      toast('Lokað: ' + lokud.length + (lokud.length === 1 ? ' mál' : ' mál') + (lokud.length < ids.length ? ' — ' + (ids.length - lokud.length) + ' vistuðust ekki' : ''), lokud.length < ids.length,
        lokud.length ? () => opnaAftur(lokud, fyrri) : null);
    } catch (e) { toast('Lokunin vistaðist ekki: ' + ((e && e.message) || e), true); }
    S.hrBid = false;
    await load(true);
  }
  async function opnaAftur(ids, fyrri) {
    const c = sb();
    if (!c) return;
    const eftirStodu = {};
    ids.forEach(id => { (eftirStodu[fyrri[id]] = eftirStodu[fyrri[id]] || []).push(id); });
    let ok = 0;
    for (const st of Object.keys(eftirStodu)) {
      const r = await c.from('thjonustubeidni').update({ status: st, updated_at: new Date().toISOString() }).in('id', eftirStodu[st]).select('id');
      if (!r.error) ok += (r.data || []).length;
    }
    toast(ok === ids.length ? 'Málin eru opin aftur' : 'Aðeins ' + ok + ' af ' + ids.length + ' opnuðust aftur', ok !== ids.length);
    await load(true);
  }

  /* ── tengja mál við fyrirtæki ── */
  let _fyrFold = null, _fyrFoldLen = -1;
  function fyrirtaekjaFold() {
    const listi = window.Companies && Array.isArray(Companies.list) ? Companies.list : [];
    if (_fyrFold && _fyrFoldLen === listi.length) return _fyrFold;
    _fyrFoldLen = listi.length;
    const hreinsa = s => fold(s).replace(/\b(ehf|hf|sf|slf|husfelagid|husfelag)\b\.?/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    _fyrFold = listi.filter(c => c && c.id && c.nafn && !c.deleted_at && String(c.kennitala || '').replace(/D/g, '') !== '9999999999' && !/^sta.greit/i.test(String(c.nafn).trim()))
      .map(c => ({ c, n: hreinsa(c.nafn), h: fold(c.heimilisfang || '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(), e: String(c.netfang || '').toLowerCase().trim() }));
    return _fyrFold;
  }
  async function saekjaSendendur() {
    const c = sb(), ids = S.rows.filter(r => isPost(r) && !r.fyrirtaeki_id && !r.customer_base_id).map(postId).filter(x => x != null);
    if (!c || !ids.length) return {};
    const r = await c.from('email_digest').select('id,sender_email,sender_name').in('id', ids);
    const m = {};
    (r.data || []).forEach(x => { m[x.id] = x; });
    return m;
  }
  const _tillogur = {};
  function tillogurFyrirtaekis(r) {
    const g = G['tf-post'], p = isPost(r) && g && g.data ? g.data[postId(r)] : null;
    const lykill = (r.updated_at || '') + '|' + fyrirtaekjaFold().length + '|' + !!p;
    if (_tillogur[r.id] && _tillogur[r.id].k === lykill) return _tillogur[r.id].t;
    const netfang = p && p.sender_email ? String(p.sender_email).toLowerCase() : '';
    const texti = ' ' + fold([r.title, r.notes, r.summary, r.customer_nafn, p && p.sender_name].filter(Boolean).join(' ')).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
    const stig = [];
    fyrirtaekjaFold().forEach(x => {
      let s = 0;
      if (netfang && x.e && x.e === netfang) s += 100;
      if (x.n.length >= 6 && texti.indexOf(' ' + x.n + ' ') >= 0) s += 30 + x.n.length;
      if (x.h.length >= 6 && texti.indexOf(' ' + x.h) >= 0) s += 20 + x.h.length;
      if (s) stig.push({ c: x.c, s });
    });
    const t = stig.sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.c);
    _tillogur[r.id] = { k: lykill, t };
    return t;
  }
  function tfTakkar(r) {
    return '<span class="tftak">' + tillogurFyrirtaekis(r).map(c => '<button type="button" class="skb" data-t5="tf-tengja" data-id="' + r.id + '" data-fid="' + c.id + '" title="Tengja við ' + esc(c.nafn) + (c.heimilisfang ? ', ' + esc(c.heimilisfang) : '') + '">🏢 ' + esc(String(c.nafn).slice(0, 40)) + '</button>').join('') +
      '<button type="button" class="skb" data-t5="tf-leita" data-id="' + r.id + '">🔍 Leita að fyrirtæki</button></span>';
  }
  function tfBanner() {
    const r = S.rows.find(x => x.id === S.tengjaVid);
    if (!r) { S.tengjaVid = null; return ''; }
    return '<p class="tfbanner">🏢 Veldu fyrirtæki í leitinni til að tengja við „' + esc(String(r.title || '(ónefnt mál)').slice(0, 70)) + '"' +
      '<button type="button" class="btn iv sm" data-t5="tf-haetta">Hætta við</button></p>';
  }
  function tengjaFyrirtaeki(id, fid) {
    const c = sb(), r = S.rows.find(x => x.id === id);
    if (!c || !r || !fid) return;
    return act(id, async () => {
      const rf = await c.from('fyrirtaeki').select('id,nafn,customer_base_id').eq('id', fid).single();
      if (rf.error || !rf.data) throw new Error('fyrirtækið fannst ekki');
      const fyrri = { fyrirtaeki_id: r.fyrirtaeki_id || null, customer_base_id: r.customer_base_id || null, customer_nafn: r.customer_nafn || null };
      const patch = { fyrirtaeki_id: rf.data.id, customer_base_id: rf.data.customer_base_id || null, customer_nafn: rf.data.nafn };
      const ru = await c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id).select('id,fyrirtaeki_id');
      if (ru.error) throw ru.error;
      if (!ru.data || !ru.data.length || ru.data[0].fyrirtaeki_id !== rf.data.id) throw new Error('las ekki til baka');
      S.tengjaVid = null;
      toast('Tengt við ' + rf.data.nafn, false, () => act(id, async () => {
        const rb = await c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, fyrri)).eq('id', id).select('id');
        toast(rb.error || !(rb.data || []).length ? 'Afturköllun tókst ekki' : 'Tengingin var tekin af', !!rb.error);
      }));
    });
  }

  /* ── fylgiskjöl (thjonustubeidni_files + verkbord-files — sama geymsla og 231/306) ── */
  async function saekjaSkjol(id) {
    const c = sb();
    if (!c) return [];
    // 2026-09-12: eldri viðhengi (thjonustubeidni_attachments úr gamla Þjónustuverinu 182/183 — Drive-afrit af
    // skýrslum og reikningum) sáust hvergi á þessu borði; málið sagði „Engin fylgiskjöl". Lesin með, aðeins til skoðunar.
    const [r, e] = await Promise.all([
      c.from('thjonustubeidni_files').select('*').eq('beidni_id', id).order('created_at'),
      c.from('thjonustubeidni_attachments').select('id,name,url,drive_file_id,size,created_at').eq('beidni_id', id).order('created_at')
    ]);
    if (r.error) throw r.error;
    const drif = f => f.drive_file_id && String(f.drive_file_id).indexOf('sb:') !== 0;
    const eldri = e && !e.error ? (e.data || []).map(f => Object.assign({}, f, {
      _eldra: true,
      url: drif(f) ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(f.drive_file_id) : (f.url || '')
    })) : [];
    return (r.data || []).concat(eldri);
  }
  const staerd = b => !b ? '' : b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  // 368y: myndir fá forsýn undir listanum (Agnar 13.09.2026 merkti hlekkinn „vinnublad-53.jpg" — myndin sjálf sást hvergi).
  const erMynd = f => !!(f && f.url) && (/^image\//.test(String(f.mime_type || '')) || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(String(f.name || f.url || '')));
  function skjolHtml(r) {
    const g = gogn('skjol:' + r.id, () => saekjaSkjol(r.id), 120000), bid = !!(S.skjolBid && S.skjolBid[r.id]), listi = g.data || [];
    return '<div class="fskjol"><div class="sg-h"><span class="slabel">📎 Fylgiskjöl' + (g.data ? ' (' + listi.length + ')' : '') + '</span><span class="grow"></span>' +
        '<label class="sg-r fsupp" data-t5="skjal-velja">' + (bid ? 'Hleð upp…' : '+ Bæta við skjölum') + '<input type="file" multiple data-t5-skjal="' + r.id + '" hidden' + (bid ? ' disabled' : '') + '></label></div>' +
      (g.villa ? '<div class="sg-m">Náði ekki í fylgiskjölin: ' + esc(g.villa) + '</div>'
        : !g.data ? '<div class="sg-m">Sæki fylgiskjöl…</div>'
        : listi.length ? '<div class="fslist">' + listi.map(f => '<div class="fsrow">' +
            '<a class="clink dk" href="' + esc(f.url || '') + '" target="_blank" rel="noopener">' + esc(f.name || 'skjal') + '</a>' +
            '<span class="sg-m">' + esc([staerd(f.size), f.created_at ? fmtD(f.created_at) : ''].filter(Boolean).join(' · ')) + '</span><span class="grow"></span>' +
            (f._eldra
              ? '<span class="sg-m" title="Úr gamla Þjónustuverinu — aðeins til skoðunar">eldra</span></div>'
              : '<button type="button" class="sx" data-t5="skjal-eyda" data-id="' + r.id + '" data-fid="' + f.id + '" aria-label="Eyða ' + esc(f.name || 'skjali') + '">✕</button></div>')).join('') + '</div>' +
          listi.filter(f => !f._eldra && erMynd(f)).map(f => '<a class="fsmynd" href="' + esc(f.url) + '" target="_blank" rel="noopener" title="Opna ' + esc(f.name || 'myndina') + ' í fullri stærð">' +
            '<img src="' + esc(f.url) + '" alt="' + esc(f.name || 'Mynd') + '" loading="lazy"></a>').join('')
        : '<div class="sg-m">Engin fylgiskjöl á þessu máli.</div>') +
    '</div>';
  }
  async function hladaSkjolum(id, files) {
    const c = sb();
    if (!c || !files.length) return;
    S.skjolBid = S.skjolBid || {};
    S.skjolBid[id] = true;
    render();
    let ok = 0;
    for (const file of files) {
      if (file.size > 25 * 1048576) { toast(file.name + ' er of stór (hámark 25 MB).', true); continue; }
      const slod = id + '/' + Date.now() + '-' + String(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      try {
        const up = await c.storage.from('verkbord-files').upload(slod, file, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (up.error) throw up.error;
        const url = ((c.storage.from('verkbord-files').getPublicUrl(slod) || {}).data || {}).publicUrl;
        const ins = await c.from('thjonustubeidni_files').insert({ beidni_id: Number(id), name: file.name, path: slod, url, mime_type: file.type || null, size: file.size || null }).select('id');
        if (ins.error) throw ins.error;
        ok++;
      } catch (e) { toast(file.name + ' vistaðist ekki: ' + ((e && e.message) || e), true); }
    }
    delete S.skjolBid[id];
    gleyma('skjol:' + id);
    if (ok) toast(ok === 1 ? 'Skjalið er komið á málið' : ok + ' skjöl komin á málið');
    render();
  }
  async function eydaSkjali(id, fileId) {
    const c = sb(), g = G['skjol:' + id], f = g && g.data ? g.data.find(x => x.id === fileId && !x._eldra) : null;
    if (!c || !f || !window.confirm('Eyða skjalinu „' + (f.name || '') + '"? Það er ekki hægt að afturkalla.')) return;
    try {
      if (f.path) { const rm = await c.storage.from('verkbord-files').remove([f.path]); if (rm.error) throw rm.error; }
      const del = await c.from('thjonustubeidni_files').delete().eq('id', fileId).select('id');
      if (del.error) throw del.error;
      toast('Skjalinu var eytt');
    } catch (e) { toast('Eyðing tókst ekki: ' + ((e && e.message) || e), true); }
    gleyma('skjol:' + id);
    render();
  }

  // f (valfrjálst) = { l: lykill, e: eining, d: lýsing, falinn } — dauft „Fela · Skýring" aftast í gráu línunni, skýringin undir.
  // 17.09.2026: fjórða viðfangið `forsk` er valfrjáls forskoðun undir línunni.
  // Allir eldri kallstaðir senda það ekki og fá nákvæmlega sömu línu og áður.
  function lrowHtml(r, merki, f, forsk) {
    const a = ageDays(r), w = fyrLink(r);
    return '<div class="lrow' + (f && f.falinn ? ' falid' : '') + '"><span class="age ' + ageCls(a) + '">' + a + 'D</span>' +
      '<div><button type="button" class="lpick" data-t5="skoda" data-id="' + r.id + '" title="Skoða málið"><b>' + esc(r.title || '(ónefnt mál)') + '</b></button>' +
      '<span class="s">' + (w ? w + ' · ' : '') + esc(eigandaTexti(r, nu())) + felaTakki(f) + '</span>' + skyrLina(f) + (forsk || '') + malAdg(r, 'lina') + '</div>' + (merki || '<span></span>') + '</div>';
  }
  // Byrjun skilaboðanna, án tilvitnaðs texta. Sama hugsun og KLIPPA_TXT í 286:
  // það sem stendur NEÐAN við „-----", „Frá:", „On … wrote:" er gamall póstur.
  const KLIPPA = /\n\s*(?:-{3,}\s*(?:original|upprunaleg|forwarded|áframsent)|_{5,}|(?:frá|from|sent|til|to|cc|efni|subject)\s*:|(?:á|on)\b[^\n]{0,80}\b(?:skrifaði|wrote)\s*:)/i;
  function postForskodun(r) {
    const p = postOf(r);
    let s = String((p && (p.snippet || p.body_preview)) || r.notes || '').trim();
    if (!s) return '';
    const m = KLIPPA.exec(s); if (m) s = s.slice(0, m.index).trim();
    s = s.replace(/\s+/g, ' ').trim();
    if (!s) return '';
    return '<span class="pprev" title="Byrjun skilaboðanna — smelltu á titilinn til að sjá allt">' + esc(s.slice(0, 260)) + (s.length > 260 ? '…' : '') + '</span>';
  }
  /* ── Reikningsbeiðnir (eining 24, 19.09.2026) ────────────────────────────
   * Sömu póstar og 240 sýnir, en hér með kúnnanum fundnum (KunnaLeit, 381) og
   * aðgerðunum tveimur sem 240 á. Sendingin er EKKI afrituð — kallað er í
   * ReikningaPostur.sendaReikning, svo hún búi áfram á einum stað.
   */
  const PB_HOLF = ['eldklar@eldklar.is', 'bokhald@eldklar.is'];
  // 20.09.2026 — SKÝRSLUBEIÐNIR LÍKA. Hótel Hjarðarból skrifaði kl. 21:14:
  // „Eruð þið búnir að senda mér staðfestingu á eftirlitinu?" — og sá póstur
  // sást HVERGI. Sían leitaði aðeins að reikning/kröfu/kvittun, svo beiðni um
  // skýrslu datt þegjandi niður og kúnninn beið. Frá sjónarhóli Agnars er þetta
  // sama málið: einhver biður um skjal sem við eigum, og svarið er að finna það
  // og senda í sama þræði. Glugginn sýnir þegar bæði reikninga OG skjöl félagsins.
  //
  // Sagnorðið verður áfram að vera nálægt nafnorðinu, svo venjulegur póstur sem
  // NEFNIR úttekt lendi ekki inni — sama form og reglan sem fyrir var.
  const PB_RE = /(senda|sent|sendið|sendu|fá|fæ|vantar|afrit).{0,22}(reikning|kröfu|kvittun)|reikning.{0,22}(afrit|vantar|sent|sendan)|afrit af reikning|copy of (the )?invoice|send.{0,15}invoice|(senda|sent|sendið|sendu|fá|fæ|vantar|afrit|berast).{0,26}(staðfesting|skýrslu|skýrsla|vottorð|úttektarskýrsl)|(staðfesting|skýrslu|vottorð).{0,26}(vantar|sent|sendan|afrit|ekki borist)|staðfestingu á (eftirlit|úttekt|skoðun)/;
  const pbThrad = s => String(s || '').toLowerCase().replace(/^((re|sv|svar|fw|fwd|áfram)\s*:\s*)+/g, '').replace(/\s+/g, ' ').trim();
  async function saekjaPostbeidnir() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const fra = new Date(Date.now() - 60 * 864e5).toISOString();
    const r = await c.from('email_digest')
      .select('id,message_id,account,thread_id,sender_name,sender_email,subject,snippet,body_preview,received_at')
      .in('account', PB_HOLF).eq('folder', 'INBOX').gte('received_at', fra)
      .order('received_at', { ascending: false }).limit(600);
    if (r.error) throw r.error;
    const allir = r.data || [];
    const beidnir = allir.filter(m => PB_RE.test(((m.subject || '') + ' ' + (m.body_preview || '') + ' ' + (m.snippet || '')).toLowerCase()));
    // Afgreitt/falið er geymt á þjóninum af 240 — lesið þaðan svo listarnir
    // tveir segi það sama. Bregðist lesturinn kastar hann; ekkert er falið í hljóði.
    const ids = beidnir.map(m => m.message_id).filter(Boolean);
    const bud = new Set();
    if (ids.length) {
      const [hd, ac] = await Promise.all([
        c.from('reikninga_postur_hidden').select('message_id').in('message_id', ids),
        c.from('reikninga_postur_activity').select('message_id').in('message_id', ids),
      ]);
      if (hd.error) throw hd.error;
      if (ac.error) throw ac.error;
      (hd.data || []).forEach(x => bud.add(x.message_id));
      (ac.data || []).forEach(x => bud.add(x.message_id));
    }
    // 19.09.2026 — BEIÐNI SEM ER SVARAÐ DETTUR ÚT SJÁLF.
    // Merkið er Gmail-þráðurinn (email_digest.thread_id). Hann er nákvæmur þar sem
    // hitt var ágiskun: netfang umsjónaraðila þjónar mörgum félögum, og efnis-pörun
    // sagði „svarað" út frá efni sem heitir bara „Reikningur". Sami þráður er hins
    // vegar sami þráður. Aðeins raðir MEÐ þræði falla út — eldri póstur ber engan
    // og hegðar sér óbreytt, svo beiðni hverfur aldrei af því gögnin vantar.
    const svarad = new Map();   // thread_id -> nýjasta útsending
    const thraedir = [...new Set(beidnir.map(m => m.thread_id).filter(Boolean))];
    for (let i = 0; i < thraedir.length; i += 100) {
      const s = await c.from('email_digest').select('thread_id,received_at')
        .eq('folder', 'SENT').in('thread_id', thraedir.slice(i, i + 100));
      if (s.error) throw s.error;
      (s.data || []).forEach(x => {
        const fyrri = svarad.get(x.thread_id);
        if (!fyrri || new Date(x.received_at) > new Date(fyrri)) svarad.set(x.thread_id, x.received_at);
      });
    }

    // Einn þráður = ein lína, nýjasti pósturinn fremstur (eins og 240 gerir).
    const sedir = new Set(), ut = [];
    beidnir.forEach(m => {
      if (bud.has(m.message_id)) return;
      // Svarað EFTIR að erindið barst — kom nýr póstur á eftir svarinu stendur hún áfram.
      const svar = m.thread_id ? svarad.get(m.thread_id) : null;
      if (svar && new Date(svar) > new Date(m.received_at)) return;
      const t = pbThrad(m.subject) || (m.message_id || String(m.id));
      if (sedir.has(t)) return;
      sedir.add(t);
      let kunni = null;
      try { if (window.KunnaLeit && KunnaLeit.hladid()) kunni = KunnaLeit.finna(m, allir); } catch (_) {}
      ut.push(Object.assign({}, m, { kunni: kunni }));
    });
    return ut;
  }
  // 19.09.2026 — „x hide, bara ná þessu i bustu sem ég er búinn með" (Agnar).
  // Sami lykill og önnur borð-atriði nota, svo felan samstillist á allar vélar.
  // Lykillinn verður að vera <eining>:<hluti>:<auðkenni> (FALID_LYKILL, sama skorða
  // og í töflunni). Fyrsta tilraun notaði tvo hluta og Message-ID óbreytt — með
  // < > @ innanborðs — svo setjaFalid hafnaði honum og EKKERT var vistað.
  const pbLyk = m => 'postbeidnir:post:' + String(m.message_id || m.id || '').replace(/[<>s]/g, '');
  function pbRodHtml(m, falinn) {
    const aldur = Math.max(0, Math.round((Date.now() - new Date(m.received_at).getTime()) / 864e5));
    const hver = esc(m.sender_name || m.sender_email || '(óþekkt)');
    const texti = String(m.body_preview || m.snippet || '').replace(/\s+/g, ' ').trim().slice(0, 190);
    const k = m.kunni;
    const f = { l: pbLyk(m), e: 'postbeidnir', d: (m.sender_name || m.sender_email || '') + ' — ' + (m.subject || ''), falinn: !!falinn };
    return '<div class="lrow pbr' + (falinn ? ' falid' : '') + '" data-mid="' + esc(m.message_id || '') + '">' +
      '<div class="age ' + ageCls(aldur) + '" title="' + aldur + ' dagar síðan pósturinn barst">' + aldur + 'D</div>' +
      '<div><div class="kick">' + hver + ' · ' + esc(m.sender_email || '') + '</div>' +
        '<b>' + esc(m.subject || '(ekkert efni)') + '</b>' +
        (texti ? '<span class="s">' + esc(texti) + '</span>' : '') +
        // 19.09.2026: nafnið er HLEKKUR inn á fyrirtækið, ekki texti. Merkið
        // „fannst: þráður (kennitala)" er farið — það sagði hvernig VÉLIN fann
        // kúnnann, sem er upplýsing um mig en ekki um verkið hans.
        '<span class="s">' + (k
          ? '<a class="clink" href="#company/' + (k.coId || '') + '" data-t5="fyr-id" data-fid="' + (k.coId || '') + '">🏢 ' + esc(k.nafn) + ' ›</a>'
          : '<span class="tag hot">enginn kúnni fannst</span>') + felaTakki(f) + '</span>' + skyrLina(f) + '</div>' +
      lakt((k ? '<button type="button" class="btn gold sm" data-t5="pb-senda" data-mid="' + esc(m.message_id || '') + '">✉️ Senda reikning</button>' : '') +
        '<button type="button" class="btn iv sm" data-t5="pb-svar" data-mid="' + esc(m.message_id || '') + '">🤖 Svar</button>' +
        // 20.09.2026 — Agnar, með rauðan kross yfir línu: „Leyfðu mér að eyða."
        // „Fela" var til en sem grár tengill inni í undirlínunni; það lítur ekki
        // út eins og aðgerð. ✕ gerir NÁKVÆMLEGA það sama og Fela — pósturinn
        // stendur áfram í pósthólfinu og „Sýna" nær honum aftur.
        '<button type="button" class="btn iv sm pbx" data-t5="fela" data-fl="' + esc(pbLyk(m)) + '" data-fe="postbeidnir" data-fd="' + esc(((m.sender_name || m.sender_email || '') + ' — ' + (m.subject || '')).slice(0, 200)) + '" title="Taka af listanum — pósturinn stendur áfram í pósthólfinu og Sýna nær honum aftur" aria-label="Taka af listanum">✕</button>') +
    '</div>';
  }
  // Aðgerðirnar búa í 240. Hér er aðeins kallað í þær.
  function pbMal(mid) {
    const g = G['postbeidnir'];
    const m = (g && g.data || []).find(x => String(x.message_id) === String(mid));
    if (!m) return null;
    return {
      sender_name: m.sender_name, from: m.sender_email, subject: m.subject,
      body_preview: m.body_preview, snippet: m.snippet, message_id: m.message_id,
      // 19.09.2026 — HÓLFIÐ VERÐUR AÐ FYLGJA MEÐ. 240 svarar úr því hólfi sem tók
      // við póstinum, en las `m.account` sem var aldrei afritað hingað. Sendingin
      // féll því í reikningar@eldklar.is (ótengt hólf) og þaðan í sjálfgefna
      // hólfið — sem er nákvæmlega ranga netfangið sem Agnar kvartaði yfir.
      account: m.account, received_at: m.received_at,
      cust: m.kunni ? { name: m.kunni.nafn, kt: m.kunni.kt, coId: m.kunni.coId } : null,
      sale: null,
    };
  }
  function bottomHtml(k) {
    const n = nu();
    if (k === 'skipulag') {
      // Agnar 11.09.2026: „algjörlega læst og tilgangslaust" · „opna á allt og customizable, geta eytt hlutum
      // og skrifað þar sem maður vill skrifa". Sömu gögn og 305: skipulagsbord.by_staff.<nafn> = { cards, krass }.
      const cards = spjold(n);
      const kort = cards.map((cd, i) => {
        const d = S.skDrog[cd.id] || {}, id = esc(cd.id);
        const nafn = d.name != null ? d.name : (cd.name || ''), texti = d.title != null ? d.title : (cd.title || '');
        const row = cd.verkbord_id != null ? S.rows.find(x => String(x.id) === String(cd.verkbord_id)) : null;
        const t = cd.type != null && SB_TEG[cd.type] ? SB_TEG[cd.type] : null;
        // 17.09.2026: punktaröðin (6 hnappar) og örvarnar tvær fóru — liturinn er nú
        // ein ræma efst sem smellt er á til að skipta, og fært er með því að draga
        // hausinn sjálfan (ekki bara ⠿). Það tók fjóra hnappa af hverju spjaldi.
        return '<div class="skc" data-skid="' + id + '">' +
          '<button type="button" class="skstrip" data-t5="sk-type" data-skid="' + id + '" style="background:' + (t ? t[1] : 'var(--rule3)') + '" title="' + (t ? esc(t[0]) : 'Enginn litur') + ' — smelltu til að skipta um lit" aria-label="Litur spjalds"></button>' +
          '<div class="skh" draggable="true" data-skdrag="' + id + '" title="Dragðu spjaldið til að færa það">' +
            '<span class="skgrip" aria-hidden="true">⠿</span><span class="grow"></span>' +
            '<button type="button" class="skx" data-t5="sk-del" data-skid="' + id + '" aria-label="Eyða spjaldi" title="Eyða spjaldi">✕</button></div>' +
          '<input class="skn" data-sk="name" data-skid="' + id + '" value="' + esc(nafn) + '" placeholder="Fyrirsögn" aria-label="Fyrirsögn">' +
          '<textarea class="skt" data-sk="title" data-skid="' + id + '" rows="' + Math.min(8, Math.max(2, String(texti).split('\n').length + 1)) + '" placeholder="Skrifaðu hvað sem er…" aria-label="Texti">' + esc(texti) + '</textarea>' +
          (cd.mynd ? '<div class="skm"><a href="' + esc(cd.mynd) + '" target="_blank" rel="noopener"><img src="' + esc(cd.mynd) + '" alt="Mynd á spjaldi" loading="lazy"></a>' +
            '<button type="button" class="skb" data-t5="sk-mynd-x" data-skid="' + id + '">Fjarlægja mynd</button></div>' : '') +
          (cd.verkbord_id != null ? '<div class="skf">' + (row ? (row.important ? '<span class="tag hot">★ Áríðandi</span> ' : '') + '<button type="button" class="clink" data-t5="skoda" data-id="' + row.id + '">Opna mál ›</button> · ' + esc(eigandaTexti(row, n)) + ' ' + dagskrarTakki(row) : 'Málið er lokað eða í geymslu') + '</div>' : '') +
        '</div>';
      }).join('');
      // 19.09.2026 (Agnar: „það á bara að vera taflan"): áríðandi-listinn er farinn héðan í sína eigin einingu (25 Áríðandi).
      const body = '<div class="skwrap">' +
        '<div class="skgrid">' + kort + '<button type="button" class="sknew" data-t5="sk-ny" draggable="true" data-skdrag="__ny" title="Smelltu — eða dragðu autt spjald þangað sem þú vilt hafa það">+ Nýtt spjald</button></div>' +
        '<div class="skstada">' + esc(S.skStada || 'Allt vistast sjálfkrafa. Límdu skjáskot beint í spjald.') + '</div></div>';
      return modPanel(k, cards.length + ' spjöld', body, '<button type="button" class="btn gold sm" data-t5="sk-ny">+ Nýtt spjald</button>');
    }
    if (k === 'postbeidnir') {
      // Sami gluggi og 240 notar (2 mán) og SAMA regla, svo talan hér og talan
      // þar segi það sama. Sóknin er löt og geymd í 5 mín eins og aðrar einingar.
      const g = gogn('postbeidnir', saekjaPostbeidnir);
      let body, sum = 'Reikningsbeiðnir';
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Les pósthólfin…');
      else if (g.villa) body = '<p class="err">Náði ekki í póstinn: ' + esc(g.villa) + '</p>';
      else {
        // Faldar beiðnir fara neðst undir „N falin · Sýna" — ekki burt úr gögnunum.
        const { synd, falin } = fela(g.data, pbLyk);
        sum = synd.length + (synd.length === 1 ? ' beiðni' : ' beiðnir') + falinSum(falin.length);
        body = (!synd.length && !falin.length) ? emptyHtml('Engin ósvöruð reikningsbeiðni. Nýjar birtast hér um leið og þær berast.')
          : (synd.length ? '<div class="pbl">' + synd.map(m => pbRodHtml(m, false)).join('') + '</div>'
               : emptyHtml('Allar beiðnir faldar — smelltu á Sýna til að sjá þær.'))
            + falinHtml('postbeidnir', falin.length, () => falin.map(m => pbRodHtml(m, true)).join(''), 'pbl');
      }
      return modPanel(k, sum, body, uppfTakki('postbeidnir'), true);
    }
    if (k === 'aridandi') {
      // 853efc10 (Agnar 27.08: „beðið um þetta ENDALAUST"): áríðandi mál á einum stað svo þau gleymist ekki þegar vikan er
      // skipulögð. 🗓-takkinn setur málið á dagskrá eða hoppar á daginn í Dagskrá (01) sé það komið þangað. Stóð áður efst
      // á Skipulagsborðinu. Á persónulega vinnuborðinu aðeins mál á EIGIN borði — annars fylla mál allra hinna það.
      const ari = S.rows.filter(r => r.important && (cfg().mode !== MITT_HAM || onBoardOf(r, n))).sort(rodun);
      const body = ari.length
        ? ari.slice(0, 12).map(r => lrowHtml(r, dagskrarTakki(r))).join('') +
          (ari.length > 12 ? '<div class="more">+ ' + (ari.length - 12) + ' til viðbótar</div>' : '')
        : emptyHtml('Ekkert mál er merkt áríðandi.');
      return modPanel(k, ari.length + ' áríðandi', body, '');
    }
    if (k === 'frestir') {
      const dagur = ymd(new Date());
      const flokkur = r => { const d = ymd(new Date(r.due_at)); return d < dagur ? 'lidid' : d === dagur ? 'idag' : 'seinna'; };
      // Fresturinn er fingrafar: nýr frestur → atriðið birtist aftur.
      const lyk = r => 'frestir:mal:' + r.id + ':' + ymd(new Date(r.due_at));
      const { synd: rows, falin } = fela(S.rows.filter(r => r.due_at).sort((a, b) => tStamp(a.due_at) - tStamp(b.due_at)), lyk);
      const lidnir = rows.filter(r => flokkur(r) === 'lidid').length, idag = rows.filter(r => flokkur(r) === 'idag').length;
      const rod = (r, falinn) => { const f = flokkur(r); return lrowHtml(r, '<span class="tag' + (f === 'lidid' ? ' hot' : '') + '">' + (f === 'lidid' ? 'Liðinn ' + esc(fmtD(r.due_at)) : f === 'idag' ? 'Í dag' : esc(fmtD(r.due_at))) + '</span>', { l: lyk(r), e: k, d: r.title, falinn }); };
      return modPanel(k, lidnir + ' liðnir · ' + idag + ' í dag · ' + rows.length + ' alls' + falinSum(falin.length),
        (rows.length ? rows.slice(0, 12).map(r => rod(r)).join('') + (rows.length > 12 ? '<div class="more">+ ' + (rows.length - 12) + ' til viðbótar</div>' : '')
          : falin.length ? '' : emptyHtml('Engin opin mál með frest.')) +
        falinHtml('frestir:mal', falin.length, () => falin.map(r => rod(r, true)).join('')));
    }
    if (k === 'nyjast') {
      const lyk = r => 'nyjast:mal:' + r.id;
      const { synd, falin } = fela(S.rows.slice().sort((a, b) => tStamp(b.created_at) - tStamp(a.created_at)), lyk);
      const rod = (r, falinn) => lrowHtml(r, '<span class="tag">' + esc(tegMals(r)) + '</span>', { l: lyk(r), e: k, d: r.title, falinn });
      return modPanel(k, synd.filter(r => ageDays(r) <= 7).length + ' ný síðustu 7 daga' + falinSum(falin.length),
        (synd.length ? synd.slice(0, 10).map(r => rod(r)).join('') : falin.length ? '' : emptyHtml('Engin opin mál.')) +
        falinHtml('nyjast:mal', falin.length, () => falin.map(r => rod(r, true)).join('')));
    }
    if (k === 'forgangur') {
      const g = isOpen(k) ? gogn('elt', saekjaElt, 600000) : null, nuna = Date.now();
      const lidnirAll = S.rows.filter(r => r.due_at && tStamp(r.due_at) < nuna - 12 * 3600e3).sort((a, b) => tStamp(a.due_at) - tStamp(b.due_at));
      const aridandiAll = S.rows.filter(r => r.important && lidnirAll.indexOf(r) < 0).sort(rodun);
      const lidLyk = r => 'forgangur:lidinn:' + r.id + ':' + ymd(new Date(r.due_at)), ariLyk = r => 'forgangur:aridandi:' + r.id;
      const lid = fela(lidnirAll, lidLyk), ari = fela(aridandiAll, ariLyk);
      const eltRow = (m, merki, f) => {
        const r = S.rows.find(x => x.channel_ref === 'email:' + m.id), a = Math.max(0, Math.floor((nuna - tStamp(m.received_at)) / 864e5));
        return '<div class="lrow' + (f.falinn ? ' falid' : '') + '"><span class="age ' + ageCls(a) + '">' + a + 'D</span><div>' +
          (r ? '<button type="button" class="lpick" data-t5="skoda" data-id="' + r.id + '"><b>' + esc(m.subject || '(ekkert efni)') + '</b></button>' : '<b>' + esc(m.subject || '(ekkert efni)') + '</b>') +
          '<span class="s">' + esc(m.sender_name || m.sender_email || '') + ' · ' + (r ? esc(eigandaTexti(r, nu())) : 'ekki á borðinu') + felaTakki(f) + '</span>' + skyrLina(f) + malAdg(r, 'lina') + '</div>' + merki + '</div>';
      };
      const lidRod = (r, falinn) => lrowHtml(r, '<span class="tag hot">' + esc(fmtD(r.due_at)) + '</span>', { l: lidLyk(r), e: k, d: r.title, falinn });
      const ariRod = (r, falinn) => lrowHtml(r, '<span class="tag hot">Áríðandi</span>', { l: ariLyk(r), e: k, d: r.title, falinn });
      let body = '', elt = 0, eltFalin = 0;
      if (g && g.data) {
        const eltLyk = h => 'forgangur:elt:' + h.mails[0].id, itrLyk = m => 'forgangur:itrek:' + m.id;
        const elF = fela(g.data.eltir, eltLyk), itF = fela(g.data.itrek, itrLyk);
        const eRod = (h, falinn) => eltRow(h.mails[0], '<span class="tag hot">' + h.mails.length + ' póstar án svars</span>',
          { l: eltLyk(h), e: k, d: (h.mails[0].sender_name || h.netfang) + ' — ' + (h.mails[0].subject || ''), falinn });
        const iRod = (m, falinn) => eltRow(m, '<span class="tag hot">Ítrekun</span>', { l: itrLyk(m), e: k, d: (m.sender_name || m.sender_email || '') + ' — ' + (m.subject || ''), falinn });
        elt = elF.synd.length + itF.synd.length;
        eltFalin = elF.falin.length + itF.falin.length;
        if (elt || eltFalin) body += '<div class="sect">Rekur á eftir okkur</div>' + elF.synd.map(h => eRod(h)).join('') + itF.synd.map(m => iRod(m)).join('') +
          falinHtml('forgangur:elt', eltFalin, () => elF.falin.map(h => eRod(h, true)).join('') + itF.falin.map(m => iRod(m, true)).join(''));
      } else body += g && g.villa ? '<p class="err">Náði ekki í póstinn: ' + esc(g.villa) + '</p>' : '<div class="more">Les póstinn…</div>';
      if (lid.synd.length || lid.falin.length) body += '<div class="sect">Frestur liðinn (' + lid.synd.length + ')</div>' + lid.synd.slice(0, 8).map(r => lidRod(r)).join('') +
        falinHtml('forgangur:lidinn', lid.falin.length, () => lid.falin.map(r => lidRod(r, true)).join(''));
      if (ari.synd.length || ari.falin.length) body += '<div class="sect">Áríðandi (' + ari.synd.length + ')</div>' + ari.synd.slice(0, 8).map(r => ariRod(r)).join('') +
        falinHtml('forgangur:aridandi', ari.falin.length, () => ari.falin.map(r => ariRod(r, true)).join(''));
      if (g && g.data && !elt && !eltFalin && !lid.synd.length && !lid.falin.length && !ari.synd.length && !ari.falin.length) body = emptyHtml('Enginn rekur á eftir, engir liðnir frestir og ekkert áríðandi.');
      return modPanel(k, elt + ' reka á eftir · ' + lid.synd.length + ' liðnir frestir · ' + ari.synd.length + ' áríðandi' + falinSum(eltFalin + lid.falin.length + ari.falin.length), body,
        uppfTakki('elt') + '<button type="button" class="btn iv sm" data-t5="go" data-view="thjonustuver-postar">Pósthólfið ›</button>');
    }
    if (k === 'nymal') {
      const ny = S.rows.filter(r => !r.status || r.status === 'nytt');
      const utkall = r => ['heimsokn', 'skodun_tilbod'].indexOf(r.type) >= 0 || r.flokkur === 'brunakerfi' || tagList(r).some(t => ['uppsetning', 'arskodun', 'brunakerfi'].indexOf(t) >= 0);
      const utk = ny.filter(utkall).sort(rodun), vantar = ny.filter(r => !r.fyrirtaeki_id && !r.customer_base_id), buin = ny.filter(r => virkniEftir(r));
      const kb = (l, v, m) => '<div class="kbox"><div class="lbl">' + l + '</div><div class="v">' + v + '</div>' + (m ? '<div class="km">' + m + '</div>' : '') + '</div>';
      const uLyk = r => 'nymal:utkall:' + r.id, vLyk = r => 'nymal:vantar:' + r.id, uF = fela(utk, uLyk), vF = fela(vantar, vLyk);
      const uRod = (r, falinn) => lrowHtml(r, r.fyrirtaeki_id ? '<span class="akacts">' + akTakki(r.fyrirtaeki_id) + '</span>' : '<span class="tag">Vantar fyrirtæki</span>', { l: uLyk(r), e: k, d: r.title, falinn });
      const vRod = (r, falinn) => lrowHtml(r, '', { l: vLyk(r), e: k, d: r.title, falinn });
      const body = '<div class="kboxes">' + kb('≤ 7 dagar', ny.filter(r => ageDays(r) <= 7).length) + kb('8–30 dagar', ny.filter(r => ageDays(r) > 7 && ageDays(r) <= 30).length) +
          kb('Eldri en 30', ny.filter(r => ageDays(r) > 30).length, ny.filter(r => normW(r.assigned_to) === AI_WORKER).length + ' í bunka Charlize') + kb('Líklega búin', buin.length) + '</div>' +
        (uF.synd.length || uF.falin.length ? '<div class="sect">Útköll — þarf að fara (' + uF.synd.length + ')</div>' + uF.synd.slice(0, 10).map(r => uRod(r)).join('') +
          falinHtml('nymal:utkall', uF.falin.length, () => uF.falin.map(r => uRod(r, true)).join('')) : '') +
        (vF.synd.length || vF.falin.length ? '<div class="sect">Vantar fyrirtæki og heimilisfang (' + vF.synd.length + ')</div>' + vF.synd.slice(0, 6).map(r => vRod(r)).join('') +
          (vF.synd.length > 6 ? '<div class="more">+ ' + (vF.synd.length - 6) + ' til viðbótar — tengdu fyrirtæki í „Breyta máli" eða með leitinni</div>' : '') +
          falinHtml('nymal:vantar', vF.falin.length, () => vF.falin.map(r => vRod(r, true)).join('')) : '');
      return modPanel(k, ny.length + ' ný · ' + uF.synd.length + ' útköll · ' + vF.synd.length + ' án fyrirtækis' + falinSum(uF.falin.length + vF.falin.length), body);
    }
    if (k === 'brunakerfi') {
      const g = isOpen(k) ? gogn('bk', saekjaBrunakerfi, 600000) : null, AR = new Date().getFullYear();
      let body, falinAlls = 0;
      const synd = { due: 0 };
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Les brunakerfin…');
      else if (g.villa) body = '<p class="err">Náði ekki í brunakerfin: ' + esc(g.villa) + '</p>';
      else {
        const d = g.data, pnr = (a, b) => String(a.postnumer || '').localeCompare(String(b.postnumer || ''));
        const stopp = (x, f) => '<div class="akrow' + (f.falinn ? ' falid' : '') + '"><span class="aknr">' + (x.latestMonth ? esc(MAN[x.latestMonth - 1].slice(0, 3)) : '—') + '</span><div class="akinfo">' +
            '<a class="clink" href="#company/' + x.id + '" data-t5="fyr-id" data-fid="' + x.id + '">' + esc(x.nafn || '(ónefnt)') + '</a>' +
            '<span class="s">' + esc([x.heimilisfang, x.postnumer].filter(Boolean).join(', ') || 'Vantar heimilisfang') + (simiAf(x) ? ' · ' + esc(simiAf(x)) : '') + (x.latest ? ' · síðasta skýrsla ' + x.latest : '') + felaTakki(f) + '</span>' + skyrLina(f) + '</div>' +
          '<div class="akacts">' + akTakki(x.id) + '</div></div>';
        // Hlutinn er í lyklinum: kerfi sem færist t.d. úr „Á næstunni" í „Komið á tíma" birtist aftur.
        const hluti = (heiti, h, listi) => {
          const lyk = x => 'brunakerfi:' + h + ':' + x.id + ':' + AR, F = fela(listi, lyk), rod = (x, falinn) => stopp(x, { l: lyk(x), e: k, d: x.nafn, falinn });
          synd[h] = F.synd.length;
          falinAlls += F.falin.length;
          if (!F.synd.length && !F.falin.length) return '';
          return '<div class="sect">' + heiti + ' (' + F.synd.length + ')</div>' + (F.synd.length ? '<div class="aklist">' + F.synd.map(x => rod(x)).join('') + '</div>' : '') +
            falinHtml('brunakerfi:' + h, F.falin.length, () => F.falin.map(x => rod(x, true)).join(''), 'aklist');
        };
        body = hluti('Komið á tíma — þarf að fara', 'due', d.filter(x => x.due).sort(pnr)) + hluti('Í vinnslu', 'wip', d.filter(x => x.wip)) +
          hluti('Ný — bíða fyrstu skoðunar', 'nytt', d.filter(x => x.nytt && !x.done && !x.wip)) + hluti('Á næstunni', 'upcoming', d.filter(x => x.upcoming).sort((a, b) => a.latestMonth - b.latestMonth));
        if (!body) body = emptyHtml('Ekkert brunakerfi komið á tíma.');
      }
      return modPanel(k, g && g.data ? synd.due + ' komin á tíma · ' + g.data.filter(x => x.done).length + ' búin ' + AR + falinSum(falinAlls) : 'Brunakerfi', body,
        uppfTakki('bk') + '<button type="button" class="btn iv sm" data-t5="go" data-view="brunayfirlit">Brunakerfi ›</button>');
    }
    if (k === 'starfsmenn') {
      const nuna = Date.now(), dagur = ymd(new Date()), upphafDags = new Date(new Date().toDateString()).getTime();
      const lina = x => {
        const mal = S.rows.filter(r => onBoardOf(r, x)), lidnir = mal.filter(r => r.due_at && tStamp(r.due_at) < nuna), jobs = jobsFor(x);
        const vika = jobs.filter(j => { const t = tStamp(j.date); return t >= upphafDags && t < upphafDags + 7 * 864e5; }).length;
        return '<tr><td><button type="button" class="clink" data-t5="filter" data-f="p:' + esc(x) + '" title="Sýna borð ' + esc(x) + '">' + esc(x) + '</button></td>' +
          '<td>' + mal.length + '</td><td>' + mal.filter(r => r.status === 'nytt').length + '</td><td' + (lidnir.length ? ' class="hot"' : '') + '>' + lidnir.length + '</td>' +
          '<td>' + mal.filter(r => r.important).length + '</td><td>' + jobs.filter(j => String(j.date || '').slice(0, 10) === dagur).length + ' / ' + vika + '</td><td>' + cardsFor(x).length + '</td></tr>';
      };
      const body = '<div class="stbl-w"><table class="stbl"><thead><tr><th>Starfsmaður</th><th>Mál</th><th>Ný</th><th>Frestur liðinn</th><th>Áríðandi</th><th>Verk í dag / 7 d.</th><th>Spjöld</th></tr></thead><tbody>' +
        folk().map(lina).join('') + '</tbody></table></div>' +
        '<div class="more">Á Master: ' + S.rows.filter(isFree).length + ' mál · þar af ' + S.rows.filter(r => normW(r.assigned_to) === AI_WORKER).length + ' í bunka Charlize · smelltu á nafn til að sjá borðið</div>';
      return modPanel(k, folk().length + ' starfsmenn · ' + S.rows.filter(r => !isFree(r)).length + ' mál á borðum', body);
    }
    if (k === 'vinnublod') {
      const g = isOpen(k) ? gogn('skyrslur', saekjaSkyrslur) : null, c0 = S.counts.sara, sia = S.vbSia || 'allt';
      let body;
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Sæki vinnublöðin…');
      else if (g.villa) body = '<p class="err">Náði ekki í vinnublöðin: ' + esc(g.villa) + '</p>';
      else {
        const listi = vbListi(g.data), passar = (x, f) => f === 'allt' || (f === 'buid' ? x.buid : x.b.stada === f);
        const synd = listi.filter(x => passar(x, sia)).sort((a, b) => (b.buid - a.buid) || ((b.b.stada === 'samthykkt') - (a.b.stada === 'samthykkt')) || String(a.b.fyrirtaeki || '').localeCompare(String(b.b.fyrirtaeki || ''), 'is'));
        body = '<div class="vbsia"><div class="seg sm" role="group" aria-label="Sía vinnublaða">' + [['allt', 'Öll'], ['bidur', 'Bíða'], ['samthykkt', 'Samþykkt'], ['buid', 'Líklega búin']].map(f =>
            '<button type="button" data-t5="vb-sia" data-v="' + f[0] + '" aria-pressed="' + (sia === f[0]) + '">' + f[1] + '<span class="c">' + listi.filter(x => passar(x, f[0])).length + '</span></button>').join('') + '</div></div>' +
          (synd.length ? synd.map(x => vbRow(x)).join('') : emptyHtml('Ekkert vinnublað í þessari síu.'));
      }
      const sum = g && g.data ? g.data.blod.filter(b => b.stada === 'bidur').length + ' bíða · ' + g.data.blod.filter(b => b.stada === 'samthykkt').length + ' samþykkt · ' + vbListi(g.data).filter(x => x.buid).length + ' líklega búin'
        : c0 ? (c0.bidur || 0) + ' bíða yfirferðar · ' + (c0.samthykkt || 0) + ' samþykkt' : 'vinnublöð';
      return modPanel(k, sum, body, uppfTakki('skyrslur'));
    }
    if (k === 'ivinnslu') {
      const g = isOpen(k) ? gogn('skyrslur', saekjaSkyrslur) : null;
      const mLyk = r => 'ivinnslu:mal:' + r.id, mF = fela(S.rows.filter(r => r.status === 'i_vinnslu').sort(rodun), mLyk);
      const mRod = (r, falinn) => lrowHtml(r, virkniEftir(r) ? '<span class="tag ok">Líklega búið</span>' : '<span class="tag">' + ageDays(r) + ' dagar</span>', { l: mLyk(r), e: k, d: r.title, falinn });
      let body = '<div class="sect">Mál merkt í vinnslu (' + mF.synd.length + ')</div>' +
        (mF.synd.length ? mF.synd.map(r => mRod(r)).join('') : mF.falin.length ? '' : '<div class="more">Ekkert mál er merkt í vinnslu.</div>') +
        falinHtml('ivinnslu:mal', mF.falin.length, () => mF.falin.map(r => mRod(r, true)).join(''));
      if (!g || !g.data) {
        body += g && g.villa ? '<p class="err">' + esc(g.villa) + '</p>' : '<div class="more">Sæki vinnublöð og Ársskoðun…</div>';
        return modPanel(k, mF.synd.length + ' mál í vinnslu' + falinSum(mF.falin.length), body, uppfTakki('skyrslur'));
      }
      // 368aa: blöð sem bíða yfirferðar eiga heima í Vinnublaða-hamnum — hér aðeins SAMÞYKKT blöð með skýrslu og reikningi
      // (Agnar 14.09.2026: „eins og naust marine er búið og margt fleira. ég er orðin alveg ruglaður").
      const D = g.data, bLyk = x => 'ivinnslu:vb:' + x.b.id, bF = fela(vbListi(D).filter(x => x.buid && x.b.stada === 'samthykkt'), bLyk);
      const bRod = (x, falinn) => vbRow(x, { l: bLyk(x), e: k, d: (x.b.fyrirtaeki || x.nafn || '') + ' — vinnublað ' + (x.b.dagsetning || x.b.manudur || ''), falinn });
      body += '<div class="sect">Samþykkt vinnublöð með bæði skýrslu og reikningi — líklega búin (' + bF.synd.length + ')</div>' +
        (bF.synd.length ? bF.synd.map(x => bRod(x)).join('') : bF.falin.length ? '' : '<div class="more">Ekkert samþykkt vinnublað bíður þess að vera merkt klárað.</div>') +
        falinHtml('ivinnslu:vb', bF.falin.length, () => bF.falin.map(x => bRod(x, true)).join(''));
      const aLyk = x => 'ivinnslu:ars:' + x.fid + ':' + D.AR;
      const aF = fela(D.iVinnslu.map(fid => Object.assign({ fid }, sonnun(fid, new Date(D.AR, 0, 1).getTime(), D))).sort((a, b) => (!!(b.sk || b.rk)) - (!!(a.sk || a.rk))), aLyk);
      const arsMed = aF.synd.filter(x => x.sk || x.rk).length;
      const aRod = (x, falinn) => {
        const f = { l: aLyk(x), e: k, d: (x.nafn || '#' + x.fid) + ' — Ársskoðun ' + D.AR, falinn };
        return '<div class="akrow' + (falinn ? ' falid' : '') + '"><span class="aknr">' + (x.sk && x.rk ? '✓' : x.sk || x.rk ? '½' : '·') + '</span><div class="akinfo">' +
          '<a class="clink" href="#company/' + x.fid + '" data-t5="fyr-id" data-fid="' + x.fid + '">' + esc(x.nafn || '#' + x.fid) + '</a>' +
          '<span class="s">' + (x.sk ? '📄 skýrsla ' + D.AR : 'engin skýrsla ' + D.AR) + ' · ' + (x.rk ? '🧾 ' + esc(x.rk.num || 'sala') + ' ' + esc(fmtD(x.rk.created_at)) : 'enginn reikningur ' + D.AR) +
            felaTakki(f) + '</span>' + skyrLina(f) + '</div></div>';
      };
      body += '<div class="sect">Ársskoðun merkt í vinnslu (' + aF.synd.length + ' · ' + arsMed + ' með skýrslu eða reikningi ' + D.AR + ')</div>' +
        (aF.synd.length ? '<div class="aklist">' + aF.synd.slice(0, 12).map(x => aRod(x)).join('') + '</div>' +
          (aF.synd.length > 12 ? '<div class="more">+ ' + (aF.synd.length - 12) + ' til viðbótar — sjá Ársskoðun</div>' : '') : aF.falin.length ? '' : '<div class="more">Ekkert merkt í vinnslu í Ársskoðun.</div>') +
        falinHtml('ivinnslu:ars', aF.falin.length, () => aF.falin.map(x => aRod(x, true)).join(''), 'aklist');
      return modPanel(k, mF.synd.length + ' mál · ' + bF.synd.length + ' vinnublöð líklega búin · ' + aF.synd.length + ' í Ársskoðun' + falinSum(mF.falin.length + bF.falin.length + aF.falin.length), body,
        uppfTakki('skyrslur') + '<button type="button" class="btn iv sm" data-t5="go" data-view="arsskodun">Ársskoðun ›</button>');
    }
    if (k === 'postsvor') {
      const lyk = r => 'postsvor:mal:' + r.id, pF = fela(S.rows.filter(r => isPost(r) && !r.svarad_at).sort(rodun), lyk);
      loadPostBunki(pF.synd.slice(0, 8));
      const rod = (r, falinn) => lrowHtml(r, isFree(r) ? '<button type="button" class="btn iv sm" data-t5="take" data-id="' + r.id + '"' + dis(r.id) + '>Taka ›</button>' : '', { l: lyk(r), e: k, d: r.title, falinn }, postForskodun(r));
      return modPanel(k, pF.synd.length + ' bíða svars' + falinSum(pF.falin.length),
        (pF.synd.length ? pF.synd.slice(0, 8).map(r => rod(r)).join('') + (pF.synd.length > 8 ? '<div class="more">+ ' + (pF.synd.length - 8) + ' til viðbótar</div>' : '')
          : pF.falin.length ? '' : emptyHtml('Enginn póstur bíður svars.')) +
        falinHtml('postsvor:mal', pF.falin.length, () => pF.falin.map(r => rod(r, true)).join('')),
        '<button type="button" class="btn gold sm" data-t5="go" data-view="thjonustuver-postar">Opna pósthólfið ›</button>');
    }
    if (k === 'akstur') {
      const listar = aksturslistar(), valinn = S.akListi || 1, ids = listar[valinn];
      const g = ids.length && isOpen(k) ? gogn('akstur:' + ids.join(','), () => saekjaStopp(ids)) : null;
      let body;
      if (!ids.length) body = emptyHtml('Enginn á lista ' + valinn + '. Opnaðu mál og veldu „🚗 Akstur" — eða settu kerfi á lista úr Brunakerfi.');
      else if (!g || (!g.data && !g.villa)) body = emptyHtml('Sæki stoppin…');
      else if (g.villa) body = '<p class="err">Náði ekki í stoppin: ' + esc(g.villa) + '</p>';
      else body = '<div class="aklist">' + g.data.map((f, i) => {
          const mal = S.rows.filter(r => r.fyrirtaeki_id === f.id), t = f.taeki;
          return '<div class="akrow"><span class="aknr">' + (i + 1) + '</span><div class="akinfo">' +
              '<a class="clink" href="#company/' + f.id + '" data-t5="fyr-id" data-fid="' + f.id + '">' + esc(f.nafn || '(ónefnt)') + '</a>' +
              '<span class="s">' + esc([f.heimilisfang, f.postnumer].filter(Boolean).join(', ') || 'Vantar heimilisfang') + (simiAf(f) ? ' · ' + esc(simiAf(f)) : '') + '</span>' +
              (t && t.units ? '<span class="s">Tæki ' + t.units + ' · SLT ' + (t.slt || 0) + ' · BSL ' + (t.bsl || 0) + ' · RS ' + (t.rs || 0) + '</span>' : '') +
              (mal.length ? '<span class="s">' + mal.map(r => '<button type="button" class="clink" data-t5="skoda" data-id="' + r.id + '">' + esc(String(r.title || '(ónefnt mál)').slice(0, 60)) + '</button>').join(' · ') + '</span>' : '') +
            '</div><div class="akacts">' +
              [1, 2, 3].filter(x => x !== valinn).map(x => '<button type="button" class="skb" data-t5="ak-setja" data-fid="' + f.id + '" data-v="' + x + '" title="Færa á lista ' + x + '">→ ' + x + '</button>').join('') +
              '<button type="button" class="skb skx" data-t5="ak-setja" data-fid="' + f.id + '" data-v="0" title="Taka af lista" aria-label="Taka af lista">✕</button></div></div>';
        }).join('') + '</div>';
      const tabs = '<div class="seg sm" role="group" aria-label="Aksturslisti">' + [1, 2, 3].map(x => '<button type="button" data-t5="ak-listi" data-v="' + x + '" aria-pressed="' + (valinn === x) + '">Listi ' + x + '<span class="c">' + listar[x].length + '</span></button>').join('') + '</div>';
      const action = tabs +
        (ids.length ? '<button type="button" class="btn gold sm" data-t5="ak-prenta" data-v="' + valinn + '">🖨 Prenta fyrir bílstjóra</button>' : '') +
        (g && g.data && g.data.some(f => f.heimilisfang) ? '<a class="btn iv sm" href="' + esc(mapsSlod(g.data)) + '" target="_blank" rel="noopener">🗺 Leið</a>' : '') +
        uppfTakki('akstur:') + '<button type="button" class="btn iv sm" data-t5="go" data-view="aksturslisti">Vaktin ›</button>';
      return modPanel(k, 'Listi 1 · ' + listar[1].length + '  ·  Listi 2 · ' + listar[2].length + '  ·  Listi 3 · ' + listar[3].length, body, action);
    }
    if (k === 'krofumal') {
      // Forgangslisti krafna + vinnugluggi (369). Hér er aðeins spjaldið; 369 festir stíl, smelli og gluggann á rótina.
      const KV = window.KrofuVinnugluggi, opin = isOpen(k);
      if (!KV) return modPanel(k, 'Ekki hlaðið', emptyHtml('Vinnugluggi krafna (369) hefur ekki hlaðist — endurhlaðið síðuna.'), '');
      KV.festa(rot());
      return modPanel(k, KV.samantekt(), opin ? KV.listi() : '', KV.takkar());
    }
    if (k === 'krofur') {
      const g = isOpen(k) ? gogn('krofur', saekjaKrofur) : null, nuna = Date.now();
      let body, sum;
      if (!g || (!g.data && !g.villa)) { body = emptyHtml('Sæki kröfurnar…'); sum = S.counts.krofur == null ? 'Kröfur' : S.counts.krofur + ' í talningu'; }
      else if (g.villa) { body = '<p class="err">Náði ekki í kröfurnar: ' + esc(g.villa) + '</p>'; sum = 'Kröfur'; }
      else {
        const d = g.data;
        // Gjalddaginn sjálfur er ekki liðinn — sama regla og 369 („itreka" þegar due_date < í dag), svo „Vinna ›" finni málið.
        const idagYmd = ymd(new Date());
        const yfir = d.filter(x => !x.drog && x.gjald && x.gjald.due_date && String(x.gjald.due_date).slice(0, 10) < idagYmd).sort((a, b) => tStamp(a.gjald.due_date) - tStamp(b.gjald.due_date));
        const drog = d.filter(x => x.drog), osendar = d.filter(x => !x.send && !x.drog);
        const kb = (l, listi) => '<div class="kbox"><div class="lbl">' + l + '</div><div class="v">' + listi.length + '</div><div class="km">' + kr(summa(listi)) + '</div></div>';
        // Staðreyndaboxin telja ALLT; listarnir fyrir neðan sleppa földu og hver röð fær „Vinna ›" (369).
        const yLyk = x => 'krofur:yfir:solur:' + x.id, oLyk = x => 'krofur:osend:solur:' + x.id, dLyk = x => 'krofur:drog:solur:' + x.id;
        const yF = fela(yfir, yLyk), oF = fela(osendar, oLyk), dF = fela(drog, dLyk);
        const yRod = (x, falinn) => soluLina(x, lakt('<span class="tag hot">' + daga(x.gjald.due_date) + ' d. yfir</span>', vinnaSoluTakki(x)), { l: yLyk(x), e: k, d: soluLysing(x), falinn });
        const oRod = (x, falinn) => soluLina(x, lakt('<span class="tag">' + daga(x.created_at) + ' d.</span>', vinnaSoluTakki(x)), { l: oLyk(x), e: k, d: soluLysing(x), falinn });
        const dRod = (x, falinn) => soluLina(x, lakt('<span class="tag hot">Drög</span>', vinnaSoluTakki(x)), { l: dLyk(x), e: k, d: soluLysing(x), falinn });
        body = '<div class="kboxes">' + kb('Útistandandi', d) + kb('Yfir gjalddaga', yfir) + kb('Ósendar', osendar) + kb('Payday-drög', drog) + '</div>' +
          (yF.synd.length || yF.falin.length ? '<div class="sect">Yfir gjalddaga — elstu fyrst (' + yF.synd.length + ')</div>' + yF.synd.slice(0, 10).map(x => yRod(x)).join('') +
            falinHtml('krofur:yfir', yF.falin.length, () => yF.falin.map(x => yRod(x, true)).join('')) : '') +
          (oF.synd.length || oF.falin.length ? '<div class="sect">Ósendar kröfur (' + oF.synd.length + ')</div>' + oF.synd.slice(0, 8).map(x => oRod(x)).join('') +
            falinHtml('krofur:osend', oF.falin.length, () => oF.falin.map(x => oRod(x, true)).join('')) : '') +
          (dF.synd.length || dF.falin.length ? '<div class="sect">Aðeins drög í Payday — kúnninn hefur ekki fengið reikninginn (' + dF.synd.length + ')</div>' + dF.synd.slice(0, 8).map(x => dRod(x)).join('') +
            falinHtml('krofur:drog', dF.falin.length, () => dF.falin.map(x => dRod(x, true)).join('')) : '');
        sum = d.length + ' útistandandi · ' + kr(summa(d)) + ' · ' + yF.synd.length + ' yfir gjalddaga' + (dF.synd.length ? ' · ' + dF.synd.length + ' aðeins drög' : '') +
          falinSum(yF.falin.length + oF.falin.length + dF.falin.length);
      }
      return modPanel(k, sum, body, uppfTakki('krofur') + '<button type="button" class="btn gold sm" data-t5="go" data-view="krofu-yfirlit">Kröfu yfirlit ›</button>');
    }
    if (k === 'gleymt') {
      const g = isOpen(k) ? gogn('gleymt', saekjaGleymt) : null, AR = new Date().getFullYear();
      let body, sum = 'Gleymst að rukka?';
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Ber saman skýrslur, sölur og drög…');
      else if (g.villa) body = '<p class="err">Náði ekki í samanburðinn: ' + esc(g.villa) + '</p>';
      else {
        const d = g.data;
        const uLyk = x => 'gleymt:uttekt:fyr:' + x.fyrirtaeki_id + ':' + AR, sLyk = x => 'gleymt:sidar:solur:' + x.id, kLyk = x => 'gleymt:kort:solur:' + x.id;
        const bLyk = x => 'gleymt:blad:vb:' + x.id;
        const uF = fela(d.uttekt, uLyk), sF = fela(d.sidar, sLyk), kF = fela(d.kort, kLyk);
        const bF = fela(d.blod || [], bLyk);
        // 19.09.2026 — SAMÞYKKT VINNUBLAÐ ÁN SÖLU. Upphæðin er ÁN vsk eins og á
        // vinnublaðinu sjálfu; með vsk er hún sýnd við hliðina svo talan sem á að
        // rukka sé ekki reiknuð í hausnum á honum.
        const bRod = (x, falinn) => {
          const f = { l: bLyk(x), e: k, d: (x.fyrirtaeki || '#' + x.fyrirtaeki_id) + ' — samþykkt vinnublað án sölu', falinn };
          return '<div class="lrow' + (falinn ? ' falid' : '') + '">' +
            '<span class="age hot">' + kr(x.upphaed) + '</span><div>' +
            (x.fyrirtaeki_id ? '<a class="clink" href="#company/' + x.fyrirtaeki_id + '" data-t5="fyr-id" data-fid="' + x.fyrirtaeki_id + '">' + esc(x.fyrirtaeki || '(ónefnt)') + '</a>'
              : '<b>' + esc(x.fyrirtaeki || '(ónefnt)') + '</b>') +
            '<span class="s">samþykkt ' + esc(dagsFull(x.samthykkt_at)) + (x.samthykkt_by ? ' af ' + esc(x.samthykkt_by) : '') +
              ' · ' + kr(Math.round(x.upphaed * 1.24)) + ' með vsk' + felaTakki(f) + '</span>' + skyrLina(f) + '</div>' +
          lakt(x.fyrirtaeki_id ? '<button type="button" class="btn iv sm" data-t5="fyr-id" data-fid="' + x.fyrirtaeki_id + '" title="Opna félagið til að stofna söluna">Opna félagið ›</button>' : '') + '</div>';
        };
        // Úttekt: skoðun vinstra megin; vinnublað og síðasti Stólpa-reikningur (aðeins verðviðmið) sem flögur í gráu línunni.
        const uRod = (x, falinn) => {
          const f = { l: uLyk(x), e: k, d: (x.nafn || '') + ' — úttekt ' + AR + ' án reiknings', falinn };
          return '<div class="lrow' + (falinn ? ' falid' : '') + '">' + skodunHtml(x) + '<div>' +
            '<a class="clink" href="#company/' + x.fyrirtaeki_id + '" data-t5="fyr-id" data-fid="' + x.fyrirtaeki_id + '">' + esc(x.nafn || '(ónefnt)') + '</a>' +
            '<span class="s">' + esc([x.heimilisfang, x.postnumer && String(x.heimilisfang || '').indexOf(x.postnumer) < 0 ? x.postnumer : ''].filter(Boolean).join(', ') || 'Vantar heimilisfang') +
              (x.skyrslur > 1 ? ' · ' + x.skyrslur + ' skýrslur' : '') +
              (x.vinnublad_id ? ' · <span class="tag" title="Vinnublað í yfirferð">Á vinnublaði ' + esc(x.vinnublad_manudur || x.vinnublad_dags || '') + ' · ' + esc(VB_STADA_HEITI[x.vinnublad_stada] || x.vinnublad_stada || '—') + '</span>' : '') +
              (x.stolpi_sidast_nr ? ' · <span class="tag" title="Síðasti Stólpa-reikningur á kennitölunni (nr. ' + esc(x.stolpi_sidast_nr) + ') — aðeins verðviðmið, aldrei krafa">Síðast rukkað í Stólpa ' +
                esc(dagsFull(x.stolpi_sidast_dags)) + ' · ' + kr(x.stolpi_sidast_upphaed) + '</span>' : '') +
              felaTakki(f) + '</span>' + skyrLina(f) + '</div>' +
          lakt('<button type="button" class="btn iv sm" data-t5="vinna-gleymt" data-fid="' + x.fyrirtaeki_id + '" title="Opna vinnuglugga: rukka gleymda úttekt">Vinna ›</button>') + '</div>';
        };
        const sRod = (x, falinn) => soluLina(x, lakt('<span class="tag">' + daga(x.created_at) + ' d.</span>', vinnaSoluTakki(x)), { l: sLyk(x), e: k, d: soluLysing(x), falinn });
        const kRod = (x, falinn) => soluLina(x, lakt('<span class="tag">' + esc(x.greitt_med === 'kort' ? 'Kort' : 'Reiðufé') + '</span>', vinnaSoluTakki(x)), { l: kLyk(x), e: k, d: soluLysing(x), falinn });
        // Rukkað gegnum Stólpa — teljast greiddar fyrri eigendum (Agnar): samanbrotið, hvorki Vinna né Fela.
        const st = d.stolpi, stSyna = !!S.synaHluta['gleymt:stolpi'];
        const stRod = x => '<div class="lrow">' + skodunHtml(x) + '<div>' +
            '<a class="clink" href="#company/' + x.fyrirtaeki_id + '" data-t5="fyr-id" data-fid="' + x.fyrirtaeki_id + '">' + esc(x.nafn || '(ónefnt)') + '</a>' +
            // Agnar 14.09.2026: skoðun jan.–apr. með skýrslu en engum reikningi telst líka greidd fyrri eigendum (stolpi_nr autt).
            '<span class="s">' + (x.stolpi_nr ? 'Stólpa-reikningur ' + esc(x.stolpi_nr) + ' · ' + esc(dagsFull(x.stolpi_dags)) + ' · ' + kr(x.stolpi_upphaed)
              : 'Skoðun jan.–apr. án reiknings — telst greidd fyrri eigendum') + '</span></div>' +
          '<span class="tag' + (x.stolpi_stada === 'greitt' ? ' ok' : '') + '">' + (x.stolpi_stada === 'greitt' ? 'Greitt' : x.stolpi_stada === 'opid_vid_yfirtoku' ? 'Opið við yfirtöku'
            : x.stolpi_stada === 'fyrri_eigendur_an_reiknings' ? 'Fyrri eigendur' : esc(x.stolpi_stada || '—')) + '</span></div>';
        // Efst: samþykkt vinna sem var aldrei rukkuð. Þetta er peningur sem er
        // þegar unninn og samþykktur — hann á ekki að liggja neðst í lista.
        body = (bF.synd.length || bF.falin.length
          ? '<div class="sect">Samþykkt vinnublöð án sölu (' + bF.synd.length + ' · ' + kr(bF.synd.reduce((s, x) => s + x.upphaed, 0)) + ' án vsk)</div>' +
            (bF.synd.length ? bF.synd.map(x => bRod(x)).join('') : '') +
            falinHtml('gleymt:blad', bF.falin.length, () => bF.falin.map(x => bRod(x, true)).join('')) +
            '<div class="more">„✓ Samþykkja" skrifar aðeins stöðu og býr enga sölu til — samþykktin er leyfi, ekki aðgerð.</div>'
          : '') +
          '<div class="sect">Úttekt ' + AR + ' án reiknings (' + uF.synd.length + ')</div>' +
          (uF.synd.length || uF.falin.length ? '<div class="sectm">Enginn reikningur á stað, kúnna né systurstað — og ekki rukkað gegnum Stólpa. Skoðanir jan.–apr. teljast greiddar fyrri eigendum.</div>' : '') +
          (uF.synd.length ? uF.synd.slice(0, 15).map(x => uRod(x)).join('') + (uF.synd.length > 15 ? '<div class="more">+ ' + (uF.synd.length - 15) + ' til viðbótar</div>' : '')
            : uF.falin.length ? '' : '<div class="more">Engin úttekt án reiknings.</div>') +
          falinHtml('gleymt:uttekt', uF.falin.length, () => uF.falin.map(x => uRod(x, true)).join('')) +
          (st === null ? '<p class="err">Náði ekki í úttektir rukkaðar gegnum Stólpa: ' + esc(d.stolpiVilla) + '</p>'
            : st.length ? '<div class="sect">Fyrri eigendur — Stólpa-reikningur eða skoðun jan.–apr. (' + st.length + ')</div>' +
              '<div class="more">Teljast greiddar fyrri eigendum — aldrei rukka aftur · <button type="button" class="fela syna" data-t5="syna-hluta" data-h="gleymt:stolpi" aria-expanded="' + stSyna + '">' +
                (stSyna ? 'Fela' : 'Sýna') + '</button></div>' + (stSyna ? st.map(x => stRod(x)).join('') : '') : '') +
          '<div class="sect">Greitt síðar — drög eldri en 14 daga (' + sF.synd.length + ' · ' + kr(summa(sF.synd)) + ')</div>' +
          (sF.synd.length ? sF.synd.slice(0, 8).map(x => sRod(x)).join('') : sF.falin.length ? '' : '<div class="more">Engin gömul drög.</div>') +
          falinHtml('gleymt:sidar', sF.falin.length, () => sF.falin.map(x => sRod(x, true)).join('')) +
          '<div class="sect">Kort eða reiðufé — aldrei merkt greitt (' + kF.synd.length + ' · ' + kr(summa(kF.synd)) + ')</div>' +
          (kF.synd.length ? kF.synd.slice(0, 8).map(x => kRod(x)).join('') : kF.falin.length ? '' : '<div class="more">Allt merkt greitt.</div>') +
          falinHtml('gleymt:kort', kF.falin.length, () => kF.falin.map(x => kRod(x, true)).join(''));
        sum = (bF.synd.length ? bF.synd.length + ' vinnublöð órukkuð (' + kr(bF.synd.reduce((s, x) => s + x.upphaed, 0)) + ') · ' : '') +
          uF.synd.length + ' úttektir án reiknings · ' + sF.synd.length + ' greitt síðar · ' + kF.synd.length + ' ómerkt greitt' + falinSum(uF.falin.length + sF.falin.length + kF.falin.length + bF.falin.length);
      }
      return modPanel(k, sum, body, uppfTakki('gleymt') + '<button type="button" class="btn iv sm" data-t5="go" data-view="krofu-yfirlit">Kröfu yfirlit ›</button>');
    }
    if (k === 'bakfaersla') {
      const g = isOpen(k) ? gogn('bakf', saekjaBakfaerslur, 600000) : null;
      const ORD = new RegExp(BAKF_ORD.join('|'), 'i'), mLyk = r => 'bakfaersla:mal:' + r.id;
      const mF = fela(S.rows.filter(r => ORD.test([r.title, r.notes, r.summary].join(' '))), mLyk);
      const mRod = (r, falinn) => lrowHtml(r, '', { l: mLyk(r), e: k, d: r.title, falinn });
      let body = '<div class="sect">Opin mál (' + mF.synd.length + ')</div>' +
        (mF.synd.length ? mF.synd.map(r => mRod(r)).join('') : mF.falin.length ? '' : '<div class="more">Ekkert opið mál nefnir bakfærslu eða breyttan reikning.</div>') +
        falinHtml('bakfaersla:mal', mF.falin.length, () => mF.falin.map(r => mRod(r, true)).join(''));
      let sum = mF.synd.length + ' mál' + falinSum(mF.falin.length);
      if (g && g.data) {
        const d = g.data, pLyk = m => 'bakfaersla:postur:' + m.id, cLyk = x => 'bakfaersla:kredit:solur:' + x.id;
        const pF = fela(d.postar, pLyk), cF = fela(d.kredit, cLyk);
        const pRod = (m, falinn) => {
          const r = S.rows.find(x => x.channel_ref === 'email:' + m.id), f = { l: pLyk(m), e: k, d: (m.sender_name || m.sender_email || '') + ' — ' + (m.subject || ''), falinn };
          return '<div class="lrow' + (falinn ? ' falid' : '') + '"><span class="age">' + esc(fmtD(m.received_at)) + '</span><div>' +
            (r ? '<button type="button" class="lpick" data-t5="skoda" data-id="' + r.id + '"><b>' + esc(m.subject || '(ekkert efni)') + '</b></button>' : '<b>' + esc(m.subject || '(ekkert efni)') + '</b>') +
            '<span class="s">' + esc(m.sender_name || m.sender_email || '') + ' · ' + (r ? esc(eigandaTexti(r, nu())) : 'ekki á borðinu') +
              felaTakki(f) + '</span>' + skyrLina(f) + '</div><span></span></div>';
        };
        const cRod = (x, falinn) => soluLina(x, lakt(opnaSoluTakki(x)), { l: cLyk(x), e: k, d: soluLysing(x), falinn });
        body += '<div class="sect">Póstar síðustu 60 daga (' + pF.synd.length + ')</div>' +
          (pF.synd.length ? pF.synd.slice(0, 10).map(m => pRod(m)).join('') : pF.falin.length ? '' : '<div class="more">Enginn póstur með þessum orðum.</div>') +
          falinHtml('bakfaersla:postur', pF.falin.length, () => pF.falin.map(m => pRod(m, true)).join('')) +
          '<div class="sect">Kreditreikningar gerðir síðustu 60 daga (' + cF.synd.length + ' · ' + kr(summa(cF.synd)) + ')</div>' +
          cF.synd.slice(0, 6).map(x => cRod(x)).join('') +
          falinHtml('bakfaersla:kredit', cF.falin.length, () => cF.falin.map(x => cRod(x, true)).join(''));
        sum = mF.synd.length + ' mál · ' + pF.synd.length + ' póstar · ' + cF.synd.length + ' kreditreikningar' + falinSum(mF.falin.length + pF.falin.length + cF.falin.length);
      } else body += g && g.villa ? '<p class="err">Náði ekki í póstinn: ' + esc(g.villa) + '</p>' : '<div class="more">Les póstinn…</div>';
      return modPanel(k, sum, body, uppfTakki('bakf') + '<button type="button" class="btn iv sm" data-t5="go" data-view="thjonustuver-postar">Pósthólfið ›</button>');
    }
    if (k === 'afgreidsla') {
      const g = isOpen(k) ? gogn('afgr', saekjaAfgreidslu) : null;
      let body, sum = 'Kassinn';
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Sæki stöðuna á kassanum…');
      else if (g.villa) body = '<p class="err">Náði ekki í kassann: ' + esc(g.villa) + '</p>';
      else {
        const d = g.data, idag = d.vika.filter(s => tStamp(s.created_at) >= d.dagur);
        const drog = d.opin.filter(s => s.status === 'drog').sort((a, b) => tStamp(a.created_at) - tStamp(b.created_at));
        const ogreitt = d.opin.filter(s => s.greitt_med === 'reikningur' && s.status !== 'drog');
        const omerkt = d.opin.filter(s => (s.greitt_med === 'kort' || s.greitt_med === 'reidufe') && s.status === 'final');
        const kb = (l, listi) => '<div class="kbox"><div class="lbl">' + l + '</div><div class="v">' + listi.length + '</div><div class="km">' + kr(summa(listi)) + '</div></div>';
        const dLyk = x => 'afgreidsla:drog:solur:' + x.id, dF = fela(drog, dLyk);
        const dRod = (x, falinn) => soluLina(x, lakt('<span class="tag">' + daga(x.created_at) + ' d.</span>', opnaSoluTakki(x)), { l: dLyk(x), e: k, d: soluLysing(x), falinn });
        body = '<div class="kboxes">' + kb('Í dag', idag) + kb('Þessi vika', d.vika) + kb('Opin drög', drog) + kb('Ógreiddir reikningar', ogreitt) + kb('Kort/reiðufé ómerkt', omerkt) + '</div>' +
          (dF.synd.length || dF.falin.length ? '<div class="sect">Elstu opnu drögin</div>' + dF.synd.slice(0, 6).map(x => dRod(x)).join('') +
            falinHtml('afgreidsla:drog', dF.falin.length, () => dF.falin.map(x => dRod(x, true)).join('')) : '');
        sum = idag.length + ' sölur í dag · ' + dF.synd.length + ' opin drög · ' + ogreitt.length + ' ógreiddir reikningar' + falinSum(dF.falin.length);
      }
      return modPanel(k, sum, body, uppfTakki('afgr') + '<button type="button" class="btn iv sm" data-t5="go" data-view="sala">Sala ›</button>');
    }
    return '';
  }

  function kpiHtml(master, mine) {
    const card = (l, v, m, dark, small) => '<div class="kpi' + (dark ? ' dark' : '') + '"><div class="lbl">' + l + '</div><div class="kv">' + v + (small ? '<small>' + small + '</small>' : '') + '</div><div class="km">' + m + '</div></div>';
    const hot = S.rows.filter(r => r.important).length;
    const todayKey = ymd(new Date());
    const newToday = master.filter(r => ymd(new Date(tStamp(r.created_at))) === todayKey).length;
    const lidinn = mine.filter(r => r.due_at && tStamp(r.due_at) < Date.now()).length;
    // 368aa: aðeins í Master og mitt borð (og sérsniðnum hömum) — hinir hamirnir bera sínar tölur í einingunum.
    return card('Á Master', master.length, newToday + ' ný í dag') + card('Mitt borð', mine.length, 'mál á þínu borði') +
      card('Frestur liðinn', lidinn, 'á þínu borði') + card('Áríðandi', hot, 'opin áríðandi mál', true);
  }

  function linksHtml(mode) {
    const all = linksFor(nu());
    const synileg = all.filter(l => !Array.isArray(l.modes) || !l.modes.length || l.modes.indexOf(mode) >= 0);
    const falin = all.length - synileg.length;
    const chips = synileg.map(l => {
      // 18.09.2026 (Agnar: „Dont show this over there"): hér stóð heiti hamsins á
      // flöguna sjálfa — „Sala AFGREIÐSLA / ÚTKÖLL". Flagan sést hvort eð er aðeins
      // í þeim ham (sjá síuna hér að ofan), svo merkið sagði manni hvar maður væri
      // þegar staddur. Talningin „+ N í öðrum hömum" hér að neðan stendur áfram —
      // hún segir eitthvað sem ekki sést.
      const inni = '<span class="lk-ic" aria-hidden="true">' + esc(String(l.nafn).trim().charAt(0).toUpperCase() || '·') + '</span><span>' + esc(l.nafn) + '</span>';
      const tengill = l.slod.charAt(0) === '#'
        ? '<button type="button" class="lk" data-t5="go" data-view="' + esc(l.slod.slice(1)) + '" title="Opna ' + esc(l.nafn) + '">' + inni + '</button>'
        : '<a class="lk" href="' + esc(l.slod) + '" target="_blank" rel="noopener noreferrer" title="' + esc(l.slod) + '">' + inni + '</a>';
      return '<span class="lkw">' + tengill + (S.linkEdit ? '<button type="button" class="lk-x" data-t5="link-del" data-lid="' + esc(l.id) + '" aria-label="Fjarlægja ' + esc(l.nafn) + '">✕</button>' : '') + '</span>';
    }).join('');
    const form = !S.linkForm ? '' :
      '<section class="panel" aria-label="Festa flýtileið"><div class="composer">' +
        '<input type="text" data-k="ln" placeholder="Nafn, t.d. Keldan" aria-label="Nafn flýtileiðar">' +
        '<input type="text" data-k="lu" placeholder="Slóð, t.d. keldan.is" aria-label="Slóð" inputmode="url">' +
        '<button type="button" class="btn gold sm" data-t5="link-save">Festa</button>' +
        '<button type="button" class="btn iv sm" data-t5="link-add">Hætta við</button></div>' +
      '<label class="lk-ham"><input type="checkbox" data-k="lm"> Aðeins í hamnum „' + esc((M(mode) || MODES.thjonusta).l) + '“</label>' +
      '<div class="lk-till"><span class="lbl">Síður í kerfinu</span>' +
        TILLOGUR.filter(t => !all.some(l => l.slod === t[1])).map(t =>
          '<button type="button" class="btn iv sm" data-t5="link-quick" data-nafn="' + esc(t[0]) + '" data-slod="' + esc(t[1]) + '">+ ' + esc(t[0]) + '</button>').join('') +
      '</div></section>';
    return '<section class="links" aria-label="Flýtileiðir"><span class="lbl">Flýtileiðir</span>' +
      (chips || '<span class="lk-tomt">Festu síðurnar sem þú hoppar á milli — Keldan, Drive, Payday, Tímavera …</span>') +
      (falin ? '<span class="lk-m">+ ' + falin + ' í öðrum hömum</span>' : '') +
      '<span class="grow"></span>' +
      '<button type="button" class="btn iv sm" data-t5="link-add" aria-expanded="' + S.linkForm + '">+ Festa tengil</button>' +
      (all.length ? '<button type="button" class="btn iv sm" data-t5="link-edit" aria-pressed="' + S.linkEdit + '">' + (S.linkEdit ? 'Búið' : 'Breyta') + '</button>' : '') +
      '</section>' + form;
  }

  function cfgHtml() {
    const c = cfg();
    const core = [['02', 'Master borð'], ['03', 'Mitt borð'], ['04', 'Valið mál']].map(x =>
      '<div class="cfgrow">' + plate(x[0]) + '<div class="cfgt"><b>' + x[1] + '</b><span>Kjarninn í flæðinu — í hamnum Master og mitt borð.</span></div><span></span><span class="lock">Alltaf</span></div>').join('');
    // 368aa: hver eining á heima í einum ham og birtist þar alltaf — hér sést hvar. Kveikja/slökkva og „opið/samanbrotið"
    // hurfu með hægri dálkinum, sem var eins í öllum hömum.
    const rows = Object.keys(MODES).map(h => MODES[h].first.map(k =>
      '<div class="cfgrow">' + plate(MODS[k].n) + '<div class="cfgt"><b>' + MODS[k].t + '</b><span>' + MODS[k].d + '</span></div><span></span><span class="lock">' + esc(MODES[h].l) + '</span></div>').join('')).join('');
    return '<header class="phead"><span class="plate">⚙</span><h2 class="ptitle">Mitt vinnuborð · ' + esc(nu()) + '</h2><span class="grow"></span>' +
        '<button type="button" class="btn gold sm" data-t5="cfg">Loka ›</button></header>' +
      core + rows +
      I_VOLDU.map(k => '<div class="cfgrow">' + plate(MODS[k].n) + '<div class="cfgt"><b>' + MODS[k].t + '</b><span>' + MODS[k].d + '</span></div><span class="lock">Í völdu máli</span>' +
        '<button type="button" class="sw" role="switch" aria-checked="' + !!c.mods[k][0] + '" data-t5="cfg-on" data-m="' + k + '" aria-label="' + MODS[k].t + '"></button></div>').join('') +
      '<div class="cfgrow"><span class="plate">—</span><div class="cfgt"><b>Spjall</b><span>Slökkt í bili fyrir alla.</span></div><span></span><span class="lock">Slökkt</span></div>' +
      '<div class="cfgfoot">Breytingar vistast strax og fylgja þér á milli tölva og í appið. Hver eining á heima í einum ham — veldu haminn efst til að sjá hana.</div>';
  }

  /* ── leit: fyrirtæki og opin mál ── */
  // Fyrirtækjalistinn er þegar í minni (Companies.list — fyrirtaeki án eyddra, 114 endurnýjar á 60 s).
  // Sé hann ekki kominn er spurt beint í fyrirtaeki.
  const fold = s => String(s || '').toLocaleLowerCase('is').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae');
  let _leitT = 0, _leitNr = 0;
  async function finnaFyrirtaeki(q) {
    const f = fold(q), tolur = q.replace(/\D/g, '');
    let listi = [];
    try { listi = window.Companies && Array.isArray(Companies.list) ? Companies.list : []; } catch (_) {}
    let nidur = [];
    if (listi.length) {
      nidur = listi.filter(x => x && !x.deleted_at && (fold(x.nafn).indexOf(f) >= 0 || fold(x.heimilisfang).indexOf(f) >= 0 ||
        (tolur.length >= 4 && String(x.kennitala || '').replace(/\D/g, '').indexOf(tolur) >= 0)));
    } else if (sb()) {
      const h = q.replace(/[,()"%*\\]/g, ' ').trim();
      try {
        const r = await sb().from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,postnumer').is('deleted_at', null)
          .or('nafn.ilike."%' + h + '%",heimilisfang.ilike."%' + h + '%"' + (tolur.length >= 4 ? ',kennitala.ilike."%' + tolur + '%"' : '')).limit(40);
        nidur = r.data || [];
      } catch (_) {}
    }
    const byrjar = x => (fold(x.nafn).indexOf(f) === 0 ? 0 : 1);
    return nidur.sort((a, b) => byrjar(a) - byrjar(b) || String(a.nafn || '').length - String(b.nafn || '').length).slice(0, 12)
      .map(x => ({ id: x.id, nafn: x.nafn || '', kt: x.kennitala || '', heim: [x.heimilisfang, x.postnumer].filter(Boolean).join(' ') }));
  }
  function leita(k, q) {
    const st = k === 'nc' ? S.ny : S.leit, nr = ++_leitNr;
    st.q = q;
    st.idx = -1;
    if (k === 'nc') st.fyr = null;                         // nýr innsláttur = ekkert fyrirtæki valið
    clearTimeout(_leitT);
    if (String(q || '').trim().length < 2) { if (k === 'nc') st.tillogur = []; else st.fyr = []; st.opid = false; render(); return; }
    _leitT = setTimeout(async () => {
      const nidur = await finnaFyrirtaeki(String(q).trim());
      if (nr !== _leitNr) return;
      if (k === 'nc') S.ny.tillogur = nidur; else S.leit.fyr = nidur;
      st.opid = true;
      render();
    }, 160);
  }
  const malLeit = q => { const f = fold(q); return f.length < 2 ? [] : S.rows.filter(r => fold([r.title, whereOf(r), r.summary].join(' ')).indexOf(f) >= 0).sort(rodun).slice(0, 8); };
  function leitHtml() {
    const L = S.leit, q = String(L.q || '').trim();
    let pop = '';
    if (L.opid && q.length >= 2) {
      const opin = fid => S.rows.filter(r => String(r.fyrirtaeki_id) === String(fid)).length;
      const fyr = L.fyr.map((x, i) => '<div class="pitem' + (L.idx === i ? ' on' : '') + '">' +
          '<a class="pmain" href="#company/' + x.id + '" data-t5="fyr-id" data-fid="' + x.id + '"><b>' + esc(x.nafn) + '</b><span>' + esc([x.heim, x.kt].filter(Boolean).join(' · ')) + '</span></a>' +
          (opin(x.id) ? '<button type="button" class="btn iv sm" data-t5="filter" data-f="f:' + x.id + '">' + opin(x.id) + ' opin mál ›</button>' : '') + '</div>').join('');
      const mal = malLeit(q).map(r => '<button type="button" class="pitem pmal" data-t5="skoda" data-id="' + r.id + '"><b>' + esc(r.title || '(ónefnt mál)') + '</b>' +
          '<span>' + esc([whereOf(r), eigandaTexti(r, nu())].filter(Boolean).join(' · ')) + '</span></button>').join('');
      pop = '<div class="pop"><div class="plbl">Fyrirtæki</div>' + (fyr || '<div class="pnone">Ekkert fyrirtæki fannst.</div>') +
        (mal ? '<div class="plbl">Opin mál</div>' + mal : '') + '</div>';
    }
    return (S.tengjaVid ? tfBanner() : '') + '<div class="leit"><input type="search" data-k="lq" value="' + esc(L.q) + '" placeholder="Leita að fyrirtæki, kennitölu eða máli…" aria-label="Leita að fyrirtæki eða máli" autocomplete="off">' + pop + '</div>';
  }
  function composerHtml() {
    const n = nu(), ppl = folk(), N = S.ny, q = String(N.q || '').trim();
    const pop = !N.opid || q.length < 2 ? '' : '<div class="pop">' + (N.tillogur.length
      ? N.tillogur.map((x, i) => '<button type="button" class="pitem pmal' + (N.idx === i ? ' on' : '') + '" data-t5="ny-fyr" data-i="' + i + '"><b>' + esc(x.nafn) + '</b><span>' + esc([x.heim, x.kt].filter(Boolean).join(' · ')) + '</span></button>').join('')
      : '<div class="pnone">Ekkert fyrirtæki fannst — málið vistast með nafninu eins og það er skrifað.</div>') + '</div>';
    return '<section class="panel" aria-label="Nýtt mál"><div class="composer ny">' +
      '<input type="text" data-k="nt" placeholder="Hvað þarf að gera?" aria-label="Titill máls">' +
      '<div class="nyfyr"><input type="text" data-k="nc" value="' + esc(N.q) + '" placeholder="Fyrirtæki — byrjaðu að skrifa" aria-label="Fyrirtæki" autocomplete="off">' +
        (N.fyr ? '<span class="valid">✓ ' + esc(N.fyr.nafn) + '</span>' : '') + pop + '</div>' +
      '<label class="nylbl"><span class="lbl">Setja á</span><select data-k="ne" aria-label="Setja málið á">' +
        (ppl.indexOf(n) >= 0 ? '<option value="' + esc(n) + '" selected>Mitt borð (' + esc(n) + ')</option>' : '') +
        '<option value="">Master</option>' + ppl.filter(x => x !== n).map(x => '<option value="' + esc(x) + '">' + esc(x) + '</option>').join('') + '</select></label>' +
      // 368aa: innbyggðu hamirnir raða málum sjálfir — val á ham aðeins þegar sérsniðnir hamir eru til.
      (serHamir().length ? '<label class="nylbl"><span class="lbl">Hamur</span><select data-k="nh" aria-label="Hamur">' +
        '<option value="">Enginn sérhamur</option>' + serHamir().map(h => '<option value="' + esc(h.id) + '"' + (h.id === cfg().mode ? ' selected' : '') + '>' + esc(h.l) + '</option>').join('') + '</select></label>' : '') +
      '<textarea data-k="nl" rows="2" placeholder="Lýsing (valfrjálst)" aria-label="Lýsing"></textarea>' +
      '<label class="nylbl"><span class="lbl">Frestur</span><input type="date" data-k="nd" aria-label="Frestur"></label>' +
      '<label class="nychk"><input type="checkbox" data-k="ni"> Áríðandi</label>' +
      '<div class="nybtn"><button type="button" class="btn gold sm" data-t5="composer-save">Vista mál</button>' +
        '<button type="button" class="btn iv sm" data-t5="composer">Hætta við</button></div>' +
    '</div></section>';
  }
  function veljaNyFyr(i) {
    const x = S.ny.tillogur[i], root = rot();
    if (!x) return;
    const f = root && root.querySelector('[data-k="nc"]');
    if (f) f.value = x.nafn;                               // áður en teiknað er — drögin taka gildið með sér
    S.ny.fyr = x; S.ny.q = x.nafn; S.ny.opid = false; S.ny.idx = -1;
    render();
  }

  let _frestad = 0;
  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    const root = rot();
    if (!root) return;
    const mount = root.querySelector('.t5-mount');
    // Opinn fellilisti lokast ef teiknað er undir honum — bíða þar til hann er frá.
    const ae = root.activeElement;
    // Opinn fellilisti lokast og texti í ritun á skipulagsborði eða í skýringu truflast ef teiknað er undir — bíða.
    // Skráarval opið: teikning myndi skipta út <input type="file"> og skrárnar tapast.
    if (S.skjalVal || (ae && (ae.tagName === 'SELECT' || (ae.dataset && (ae.dataset.sk || ae.dataset.bm || ae.dataset.nt || ae.dataset.dn || ae.dataset.skyr || ae.dataset.samtsky))))) { clearTimeout(_frestad); _frestad = setTimeout(render, 1200); return; }
    const n = nu(), c = cfg(), mode = M(c.mode) || MODES.thjonusta;
    const master = masterRows(), mine = mineRows(), baraMitt = !!c.baraMitt;
    // 368y: vinnusvæðis-hamur (rymi) fær alla breiddina — engar einingar til hliðar, engin KPI-spjöld. 368aa: einingahamur
    // (board:false án rymi) teiknar aðeins sínar einingar; mál opnað úr einingu birtist hægra megin.
    const rymi = mode.rymi || '', eininga = !mode.board && !rymi;
    // Hvaða opið mál sem er má skoða — ekki aðeins þau á mínu borði. 0 = lokað viljandi (✕).
    let selId = S.sel[n];
    if (selId !== 0 && !S.rows.some(r => r.id === selId)) selId = S.sel[n] = mine.length ? mine[0].id : null;
    const selRow = selId ? S.rows.find(r => r.id === selId) || null : null;
    const selMinn = !!(selRow && onBoardOf(selRow, n));
    const selEininga = eininga && selRow && S.selFra === c.mode ? selRow : null;
    const visible = feedRows(master);
    const feedFalinn = baraMitt && !serSia(S.filter);      // síað á fyrirtæki/starfsmann/öll sýnir listann líka í „bara mitt"
    const now = new Date();
    const hot = S.rows.filter(r => r.important).length;
    const ppl = folk();

    // „Bara mitt borð" = tómt vinnusvæði (Agnar 11.09.2026: „Þegar bara starfsmannaborð er valið, þá á allt að vera
    // tómt"): engar einingar og engin KPI-spjöld — aðeins borðið manns sjálfs. Einingarnar eru þá heldur ekki teiknaðar,
    // svo latar gagnasóknir þeirra fara ekki af stað. 368aa: enginn hægri dálkur með „öðrum einingum" (hann var eins í
    // öllum hömum); einingar sérsniðins hams fara vinstra megin, einingar einingahams í miðjuna.
    const einingHtml = k => (k === 'dagskra' ? dagskraHtml() : bottomHtml(k));
    // 18.09.2026 — EINING Í MJÓRRI REIN VIÐ HLIÐINA Á AUÐUM SKJÁ.
    // Þegar „Bara mitt borð" er valið er Master falinn og miðjan hefur lítið að
    // sýna, en einingarnar sátu samt í 300 px reininni (sjá .layout á ≥1600px).
    // Skipulagsborðið kramdist í einn mjóan dálk meðan 70% skjásins stóð autt.
    // Í sérsniðnum ham með „Bara mitt borð" fá þær því miðjuna í fullri breidd.
    const einingarIMidju = !!(baraMitt && mode.ser && mode.board && mode.first.length);
    // 18.09.2026 — RAÐHAMUR. Þegar „Breyta ham" stendur opinn á VIRKA hamnum eru
    // einingarnar sjálfar ritillinn: dregnar til, stækkaðar og minnkaðar á staðnum.
    // Þær fara þá alltaf í ristina í miðjunni (í mjórri rein væri ekkert að draga).
    const radar = !!(S.hamForm && S.hamForm.id && S.hamForm.id === c.mode);
    const einingaRod = radar ? (S.hamForm.rod || []) : mode.first;
    function frumaHtml(k, i, rod) {
      const sp = radar ? hfBreidd(k) : breiddAf(mode, k);
      const bar = !radar ? '' : '<div class="mbar">' +
        '<span class="mgrip" aria-hidden="true">⠿</span><span>' + esc(MODS[k] ? MODS[k].t : k) + '</span><span class="grow"></span>' +
        '<button type="button" data-t5="ham-breidd" data-m="' + esc(k) + '" data-v="-1"' + (sp <= 1 ? ' disabled' : '') + ' title="Mjórra">◀</button>' +
        '<span class="mbr">' + ['⅓', '½', '1/1'][sp - 1] + '</span>' +
        '<button type="button" data-t5="ham-breidd" data-m="' + esc(k) + '" data-v="1"' + (sp >= 3 ? ' disabled' : '') + ' title="Breiðara">▶</button>' +
        '<button type="button" data-t5="ham-eining-burt" data-m="' + esc(k) + '" title="Taka einingu úr hamnum">✕</button></div>';
      const res = radar ? '<button type="button" class="mres" data-hres="' + esc(k) + '" aria-label="Draga til að breyta breidd"></button>' : '';
      return '<div class="modcell" data-sp="' + sp + '"' +
        (radar ? ' draggable="true" data-hdrag="' + esc(k) + '"' : '') + '>' + bar + einingHtml(k) + res + '</div>';
    }
    const ristHtml = rod => '<div class="modgrid' + (radar ? ' radar' : '') + '">' + rod.map(frumaHtml).join('') + '</div>';
    const midjuEiningar = (einingarIMidju || radar) && einingaRod.length ? ristHtml(einingaRod) : '';
    // 18.09.2026 — HÉR HVARF DAGSKRÁIN. `baraMitt` núllaði einingar hamsins, svo
    // „Afgreiðsla / Útköll" (board:true, first:[dagskra,skipulag], bara_mitt:true)
    // teiknaði þær aldrei. Reglan „bara mitt borð = allt tómt" (Agnar 11.09) stendur
    // áfram fyrir innbyggðu hamina, en í ham sem hann bjó til sjálfur og hakaði
    // sjálfur við einingarnar í eru hökin nákvæmari fyrirmæli en almenna reglan.
    //
    // Athugið: `bara_mitt` er vistað per STARFSMANN, ekki per ham (sjá cfg-vistun),
    // svo valið fylgir manni inn í alla hami. Það er hluti af því af hverju þetta
    // kom á óvart — hakið hvarf í ham sem maður hafði ekki snert.
    const topHtml = rymi || eininga || (baraMitt && !mode.ser) || einingarIMidju || radar ? '' : mode.first.map(einingHtml).join('');

    const selMarkup = rymi || (eininga && !selEininga) ? '' : selHtml(eininga ? selEininga : selRow);
    const nyleg = master.filter(r => ageDays(r) <= 30).length;
    const bunki = master.filter(r => normW(r.assigned_to) === AI_WORKER).length;
    const fjoldi = f => f === 'oll' ? S.rows.length : master.filter(r => matchFilter(r, f)).length;

    const feed = !S.loaded && (S.loading || _dbBid) ? emptyHtml('Sæki mál…')
      : visible.length
        ? visible.slice(0, S.synd).map(r => feedRow(r, r.id === selId) + (r.id === selId && !selMinn ? '<div class="sel inline">' + selMarkup + '</div>' : '')).join('') +
          (visible.length > S.synd ? '<div class="pager"><button type="button" class="btn iv sm" data-t5="more">Sýna fleiri · ' + (visible.length - S.synd) + ' eftir</button></div>' : '')
        : emptyHtml(master.length ? 'Ekkert í þessari síu.' : (S.loaded ? 'Master borðið er tómt.' : 'Engin mál sótt enn.'));

    const siuHeiti = S.filter === 'oll' ? 'Öll opin mál' : /^p:/.test(S.filter) ? 'Borð · ' + S.filter.slice(2)
      : /^f:/.test(S.filter) ? 'Fyrirtæki · ' + (whereOf(S.rows.find(r => String(r.fyrirtaeki_id) === S.filter.slice(2)) || {}) || 'mál') : c.mode === 'thjonusta' ? 'Master borð' : 'Master · ' + mode.l;
    // Á síma: mál til skoðunar sem er ekki í sýnilega listanum (t.d. opnað úr leit) birtist efst.
    const selUtan = selRow && !selMinn && !visible.slice(0, S.synd).some(r => r.id === selId) ? '<div class="sel inline">' + selMarkup + '</div>' : '';
    // 368x: „Mitt borð" samanbrjótanlegt, eins og einingarnar (modPanel) — haus og talning standa, listinn víkur.
    const mittSb = !!S.mittSamanbrotid;
    const mineHtml = '<section class="panel colmine' + (mittSb ? ' samanbrotid' : '') + '" aria-label="Mitt borð">' +
        '<header class="phead">' + plate('03') + '<h2 class="ptitle">Mitt borð</h2><span class="sum">' + mine.length + ' mál</span>' +
          // 368aa: „+ N í öðrum hömum" farið — samþykkismál eru í Samþykkja, vinnublöð í Vinnublöðum, allt annað er hér.
          '<span class="grow"></span><button type="button" class="btn iv sm" data-t5="take-next">Taka næsta ›</button>' +
          '<button type="button" class="btn iv sm tog" data-t5="mitt-fella" aria-expanded="' + !mittSb + '" aria-label="' + (mittSb ? 'Opna' : 'Fella saman') + ' Mitt borð" title="' + (mittSb ? 'Opna Mitt borð' : 'Fella Mitt borð saman') + '">' + (mittSb ? '▾' : '▴') + '</button></header>' +
        (mittSb ? '' : (feedFalinn ? selUtan : '') +
        (mine.length
          ? mine.map(r => mineRow(r, r.id === selId) + (r.id === selId ? '<div class="sel inline">' + selMarkup + '</div>' : '')).join('')
          : emptyHtml('Borðið þitt er autt. Taktu mál af Master eða skráðu nýtt mál á þig.'))) +
      '</section>';
    const board = rymi === VBR_HAM ? vbRymiHtml(n) : rymi === SAMT_HAM ? samtRymiHtml(n) : mode.board
      ? midjuEiningar + '<div class="board' + (feedFalinn ? ' bara' : '') + '" data-view="' + (feedFalinn ? 'mitt' : S.view) + '">' +
          (feedFalinn ? '' : '<div class="seg phone-seg" role="group" aria-label="Borð">' +
            '<button type="button" data-t5="view" data-v="master" aria-pressed="' + (S.view === 'master') + '">' + esc(siuHeiti) + '<span class="c">' + visible.length + '</span></button>' +
            '<button type="button" data-t5="view" data-v="mitt" aria-pressed="' + (S.view === 'mitt') + '">Mitt borð<span class="c">' + mine.length + '</span></button></div>' +
          '<section class="panel colmaster" aria-label="' + esc(siuHeiti) + '">' +
            '<header class="phead">' + plate('02') + '<h2 class="ptitle">' + esc(siuHeiti) + '</h2><span class="sum">' + visible.length + ' mál</span><span class="grow"></span>' +
              (/^[pf]:/.test(S.filter) ? '<button type="button" class="btn iv sm" data-t5="filter" data-f="allt">✕ Aftur á Master</button>' : '') +
              '<div class="seg" role="group" aria-label="Sía">' + [['allt', 'Allt'], ['post', 'Póstar'], ['beidni', 'Beiðnir'], ['hot', 'Áríðandi'], ['buid', 'Líklega búin'], ['oll', 'Öll opin']].map(f =>
                '<button type="button" data-t5="filter" data-f="' + f[0] + '" aria-pressed="' + (S.filter === f[0]) + '">' + f[1] + '<span class="c">' + fjoldi(f[0]) + '</span></button>').join('') + '</div>' +
              '<button type="button" class="btn iv sm" data-t5="hr-opna" aria-pressed="' + !!S.hreinsa + '" title="Fara yfir Master: tvítekið, líklega búið, vantar fyrirtæki, gamalt">🧹 Hreinsa</button>' +
              '<button type="button" class="btn gold sm" data-t5="take-next">Taka næsta ›</button></header>' +
            '<div class="psub">' + nyleg + ' síðustu 30 daga · ' + bunki + ' í bunka Charlize · Á borðum:' +
              ppl.map(x => '<button type="button" class="pchip" data-t5="filter" data-f="p:' + esc(x) + '" aria-pressed="' + (S.filter === 'p:' + x) + '">' + esc(x) + ' ' + S.rows.filter(r => onBoardOf(r, x)).length + '</button>').join('') + '</div>' +
            // 368aa: Forgangslisti krafna er eining í Kröfum — ekki lengur efst í Master (sami listinn á tveimur stöðum).
            selUtan + feed +
          '</section>') +
          mineHtml +
          '<section class="sel side colsel" aria-live="polite">' + selMarkup + '</section>' +
        '</div>'
      : '<div class="modgrid' + (radar ? ' radar' : '') + '">' + (selEininga ? '<div class="sel inline">' + selMarkup + '</div>' : '') +
          einingaRod.map(frumaHtml).join('') + '</div>' +
          (mode.mitt && !einingaRod.length ? emptyHtml('Vinnuborðið þitt er autt. Smelltu á „✎ Velja einingar" til að setja á það það sem þú vilt hafa hjá þér. Málin eru í hamnum „Master og mitt borð".') : '');

    const haegri = selEininga ? '<section class="sel side" aria-live="polite">' + selMarkup + '</section>' : '';
    const layout = '<div class="layout' + (topHtml ? '' : ' nol') + (haegri ? ' selh' : ' nor') + '">' +
      (topHtml ? '<aside class="rail left" aria-label="Einingar hamsins">' + topHtml + '</aside>' : '') +
      '<div class="main">' + board + '</div>' +
      (haegri ? '<aside class="rail right" aria-label="Valið mál">' + haegri + '</aside>' : '') +
    '</div>';

    const html =
      '<div class="t5"><div class="col">' +
        '<div class="head"><div>' +
          '<div class="kicker">Þjónusta · ' + VIKUDAGUR[now.getDay()] + ' ' + now.getDate() + '. ' + MAN[now.getMonth()] + '</div>' +
          '<h1 class="h1">Þjónustuborð</h1>' +
          '<p class="meta">' + (mode.board ? (c.mode !== 'thjonusta' ? 'Hamur: ' + esc(mode.l) + ' · ' : '') + master.length + ' á Master · ' + mine.length + ' á þínu borði · ' + hot + ' áríðandi' : 'Hamur: ' + esc(mode.l)) +
            '<span class="t5-sott">' + (S.loadedAt ? ' · sótt kl. ' + klukka(S.loadedAt) : '') + '</span></p>' +
          '' +
        '</div><div class="acts">' +
          '<label class="who"><span class="lbl">Ég er</span><select data-t5="who" aria-label="Starfsmaður">' +
            (ppl.indexOf(n) < 0 ? '<option value="" selected disabled>Veldu nafn…</option>' : '') +
            ppl.map(x => '<option' + (x === n ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></label>' +
          '<button type="button" class="btn iv" data-t5="cfg" aria-expanded="' + S.cfgOpen + '">⚙ Mitt vinnuborð</button>' +
          '<button type="button" class="btn iv" data-t5="sannreyna" title="Telja allt upp á nýtt úr gagnagrunninum og bera saman við það sem stendur á skjánum">🔍 Sannreyna</button>' +
          '<button type="button" class="btn iv" data-t5="composer" aria-expanded="' + S.composer + '">+ Nýtt mál</button>' +
        '</div></div>' +
        sannanirHtml() +
        leitHtml() +
        (S.composer ? composerHtml() : '') +
        '<div class="modes"><span class="lbl">Hamur</span><div class="seg modeseg" role="group" aria-label="Hamur">' +
          hamaListi().map(k => { const t = hamTala(k); return '<button type="button" data-t5="mode" data-mode="' + esc(k) + '" aria-pressed="' + (c.mode === k) + '">' + esc(M(k).l) +
            (t === '' ? '' : '<span class="c">' + t + '</span>') + '</button>'; }).join('') +
        '</div><button type="button" class="btn iv sm" data-t5="ham-ny" aria-expanded="' + !!(S.hamForm && !S.hamForm.id) + '">+ Hamur</button>' +
        (mode.ser || mode.mitt ? '<button type="button" class="btn iv sm" data-t5="ham-breyta" data-mode="' + esc(c.mode) + '">' + (mode.mitt ? '✎ Velja einingar' : '✎ Breyta ham') + '</button>' : '') +
        '<span class="grow"></span>' + (mode.board ? '<div class="seg" role="group" aria-label="Borðið">' +
          '<button type="button" data-t5="bara-mitt" data-v="0" aria-pressed="' + !baraMitt + '">Master + mitt borð</button>' +
          '<button type="button" data-t5="bara-mitt" data-v="1" aria-pressed="' + baraMitt + '">Bara mitt borð</button></div>' : '') + '</div>' +
        hamFormHtml() + hreinsunHtml() +
        linksHtml(c.mode) +
        (ppl.indexOf(n) < 0 ? '<p class="err">„' + esc(n) + '“ er ekki starfsmaður á þessu borði' + (n === AI_WORKER ? ' — Charlize er bunkinn á Master' : '') + '. Veldu þitt nafn í „Ég er“.</p>' : '') +
        (S.cfgOpen ? '<section class="panel" aria-label="Mitt vinnuborð">' + cfgHtml() + '</section>' : '') +
        (S.err ? '<p class="err">Náði ekki í málin: ' + esc(S.err) + ' <button type="button" class="btn iv sm" data-t5="reload">Reyna aftur</button></p>' : '') +
        (!baraMitt && G.falid && G.falid.villa ? '<p class="err">Náði ekki í falin atriði' + (G.falid.data ? ' — sýni síðustu stöðu' : ' — allt er sýnt') + ': ' + esc(G.falid.villa) +
          ' <button type="button" class="btn iv sm" data-t5="fela-endurlesa">Reyna aftur</button></p>' : '') +
        // 368aa: KPI-spjöldin eiga við borðið — einingahamir og vinnusvæði bera sínar eigin tölur.
        (mode.board && !baraMitt ? '<div class="kpis">' + kpiHtml(master, mine) + '</div>' : '') +
        layout +
      '</div></div>';

    // Hálfskrifaður texti (nýtt mál, flýtileið) og fókus lifa endurteikningu af.
    const fokus = ae && ae.dataset ? ae.dataset.k : null;
    const bendill = ae && typeof ae.selectionStart === 'number' ? [ae.selectionStart, ae.selectionEnd] : null;
    const drog = {};
    // 18.09.2026: `hm_`-hökin eru undanskilin — þau eru teiknuð úr `S.hamForm.rod`.
    // Væru þau endurheimt úr DOM-inu myndi gamalt hak lifa af ✕ og dregna röð.
    const DROG_SEL = 'input[data-k]:not([data-k^="hm_"]), textarea[data-k], select[data-k]';
    root.querySelectorAll(DROG_SEL).forEach(i => { drog[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; });
    // Skrun innan pósts og vikunnar heldur sér ef sama mál er enn valið.
    const SKRUN = '.well p, .nt textarea, .week, .seg.modeseg, .vbr-items';
    const skrunSel = v.dataset.t5sel === String(selId);
    const skrun = [...root.querySelectorAll(SKRUN)].map(x => [x.scrollTop, x.scrollLeft]);
    mount.innerHTML = html;
    v.dataset.t5sel = String(selId);
    if (skrunSel) root.querySelectorAll(SKRUN).forEach((x, i) => { if (skrun[i]) { x.scrollTop = skrun[i][0]; x.scrollLeft = skrun[i][1]; } });
    root.querySelectorAll(DROG_SEL).forEach(i => {
      const k = i.dataset.k;
      if (k in drog) { if (i.type === 'checkbox') i.checked = drog[k]; else i.value = drog[k]; }
    });
    if (fokus) { const f = root.querySelector('[data-k="' + fokus + '"]'); if (f) { f.focus(); try { if (bendill && f.setSelectionRange) f.setSelectionRange(bendill[0], bendill[1]); } catch (_) {} } }
    skyrEftirTeikningu(root);
  }

  // Eftir smell á mál: tryggja að valið mál sjáist (hliðarspjaldið á tölvu, spjaldið undir línunni í síma).
  function synaVal() {
    const v = document.getElementById(VIEW_ID), root = v && v.shadowRoot;
    if (!root) return;
    const el = [...root.querySelectorAll('.sel.side, .sel.inline')].find(x => x.offsetParent !== null);
    if (!el) return;
    const b = el.getBoundingClientRect();
    if (b.top < 0 || b.top > window.innerHeight - 140) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  // Fyrirtæki máls: beint ef málið er tengt fyrirtæki, annars eftir viðskiptavini (customers_base);
  // annars opnast leitin með nafninu svo hægt sé að velja rétta fyrirtækið.
  async function opnaFyrirtaekiMals(r) {
    if (!r) return;
    if (r.fyrirtaeki_id) { openCompany(r.fyrirtaeki_id); return; }
    const c = sb();
    if (c && r.customer_base_id) {
      try {
        const q = await c.from('fyrirtaeki').select('id').eq('customer_base_id', r.customer_base_id).is('deleted_at', null).limit(2);
        if (q.data && q.data.length === 1) { openCompany(q.data[0].id); return; }
      } catch (_) {}
    }
    const nafn = whereOf(r);
    if (!nafn) { toast('Þetta mál er ekki tengt fyrirtæki.', true); return; }
    S.leit.q = nafn;
    leita('lq', nafn);
    const root = rot(), f = root && root.querySelector('[data-k="lq"]');
    if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  /* ── skipulagsborð: vistun ── */
  // Spjöldin eru skrifuð sem heilt fylki, svo hver breyting er reiknuð á NÝJASTA lista stillinganna og vistanir
  // fara í röð. Texti í ritun lifir í S.skDrog þar til þjónninn hefur tekið við honum og fer með í hverja vistun.
  const nyttSkId = () => 'sb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const naestaSlot = l => l.reduce((m, x) => Math.max(m, Number(x.slot) || 0), -1) + 1;
  // 21.09.2026 (úttekt): „NÝJASTI listi stillinganna" var skyndiminni FLIPANS — sami starfsmaður á tveimur tækjum (tölva +
  // sími, eða tveir flipar á „Afgreiðsla") skrifaði sinn gamla lista yfir spjöld sem hitt tækið hafði bætt við. Nú er grein
  // starfsmannsins lesin FERSK af þjóni rétt fyrir vistun (JSON-slóð, nokkur kB — ekki 1,6 MB blobbinn) og breytingunni
  // beitt á ÞANN lista. null = náðist ekki / greinin ekki til → cardsFor() ræður eins og áður (líka erfðir Agnars).
  async function ferskSpjold(n) {
    try {
      const c = sb(); if (!c) return null;
      const r = await c.from('app_settings').select('k:settings->skipulagsbord->by_staff->' + n + '->cards').eq('id', 1).maybeSingle();
      if (r.error || !r.data || !Array.isArray(r.data.k)) return null;
      return r.data.k.filter(Boolean);
    } catch (_) { return null; }
  }
  let _skRod = Promise.resolve();
  function vistaSpjold(breyta, skilabod) {
    const verk = _skRod.then(async () => {
      if (!stillingarTilbunar()) { toast('Stillingarnar eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return false; }
      const n = nu();
      const grunnlisti = (await ferskSpjold(n)) || cardsFor(n);
      const nyr = breyta(grunnlisti.map(x => Object.assign({}, x, S.skDrog[x.id] || {})));
      _vistar++;
      S.skStada = 'Vista…';
      stimplaSk();
      let ok = false;
      try { ok = !!(await AppSettings.save({ skipulagsbord: { by_staff: { [n]: { cards: nyr } } } })); } catch (_) {}
      _vistar--;
      S.skStada = ok ? 'Vistað kl. ' + klukka(new Date()) : '⚠ Vistaðist ekki — textinn er enn á skjánum og reynt verður aftur.';
      stimplaSk();
      if (!ok) toast('Skipulagsborðið vistaðist ekki. Afritaðu textann ef þú ert að loka.', true);
      else if (skilabod) toast(skilabod);
      return ok;
    });
    _skRod = verk.catch(() => false);
    return verk;
  }
  function stimplaSk() {
    const root = rot();
    if (!root) return;
    root.querySelectorAll('.skstada').forEach(el => { el.textContent = S.skStada || ''; });
  }
  const _skT = {}, _skBid = {};
  function bida(lykill, fn) { clearTimeout(_skT[lykill]); _skBid[lykill] = fn; _skT[lykill] = setTimeout(() => { delete _skBid[lykill]; fn(); }, 700); }
  function skola(lykill) { if (!_skBid[lykill]) return; clearTimeout(_skT[lykill]); const fn = _skBid[lykill]; delete _skBid[lykill]; fn(); }
  const skolaAllt = () => { Object.keys(_skBid).forEach(skola); skolaSkyringu(); };
  function skrifaSk(el) {
    const n = nu(), reitur = el.dataset.sk, id = el.dataset.skid;
    if (!id) return;
    (S.skDrog[id] = S.skDrog[id] || {})[reitur] = el.value;
    bida(id, async () => {
      const drog = Object.assign({}, S.skDrog[id]);
      const ok = await vistaSpjold(l => {
        const cd = l.find(x => x.id === id);
        // Eytt á annarri vél á meðan skrifað var: textinn lifir sem nýtt spjald.
        if (!cd) l.push(Object.assign({ id, slot: naestaSlot(l), verkbord_id: null, name: '', title: '', type: null, minnispunktur: true }, drog));
        return l;
      });
      const nuna = S.skDrog[id];
      if (ok && nuna && Object.keys(drog).every(kk => nuna[kk] === drog[kk])) delete S.skDrog[id];
    });
  }
  function faeraSpjald(l, fraId, tilId) {
    const rod = l.slice().sort((x, y) => (+x.slot || 0) - (+y.slot || 0));
    const i = rod.findIndex(x => x.id === fraId), j = rod.findIndex(x => x.id === tilId);
    if (i < 0 || j < 0) return l;
    const raufar = rod.map(x => +x.slot || 0);
    for (let q = 1; q < raufar.length; q++) if (raufar[q] <= raufar[q - 1]) raufar[q] = raufar[q - 1] + 1;
    rod.splice(j, 0, rod.splice(i, 1)[0]);
    rod.forEach((x, q) => { x.slot = raufar[q]; });
    return l;
  }
  // 17.09.2026: þrennt bættist við. (1) Hausinn allur er dragflöturinn, ekki bara ⠿.
  // (2) Autt svæði í grindinni tekur við falli — spjaldið fer þá aftast, sem áður var
  // ekki hægt nema með örvunum sem Agnar bað um að fjarlægja. (3) „+ Nýtt spjald" má
  // draga: fellur það á spjald verður nýtt autt spjald til á þeim stað.
  const NYTT_DRAG = '__ny';
  function nyttSpjaldHlutur(l) {
    return { id: nyttSkId(), slot: naestaSlot(l), verkbord_id: null, name: '', title: '', type: null, minnispunktur: true };
  }
  function faeraAftast(l, fraId) {
    const cd = l.find(x => x.id === fraId);
    if (cd) cd.slot = naestaSlot(l);
    return l;
  }
  function onBreiddNidur(e) {
    const h = e.target && e.target.closest ? e.target.closest('[data-hres]') : null;
    if (!h || !S.hamForm) return;
    e.preventDefault();
    const k = h.dataset.hres, grid = h.closest('.modgrid');
    if (!grid) return;
    h.classList.add('virk');
    try { h.setPointerCapture(e.pointerId); } catch (_) {}
    const g = grid.getBoundingClientRect();
    const vinstri = h.closest('.modcell').getBoundingClientRect().left;
    let sidast = hfBreidd(k);
    const reikna = x => {
      // Hlutfall af ALLRI ristinni frá vinstri brún einingarinnar → 1, 2 eða 3 þriðjungar.
      const hlutf = (x - vinstri) / Math.max(1, g.width);
      return hlutf < 0.42 ? 1 : hlutf < 0.75 ? 2 : 3;
    };
    const hreyfa = ev => {
      const ny = reikna(ev.clientX);
      if (ny === sidast) return;
      sidast = ny;
      (S.hamForm.breidd = S.hamForm.breidd || {})[k] = ny;
      render();
    };
    const sleppa = () => {
      h.removeEventListener('pointermove', hreyfa);
      h.removeEventListener('pointerup', sleppa);
      h.removeEventListener('pointercancel', sleppa);
      h.classList.remove('virk');
      render();
    };
    h.addEventListener('pointermove', hreyfa);
    h.addEventListener('pointerup', sleppa);
    h.addEventListener('pointercancel', sleppa);
  }
  function onDrag(e) {
    const t = e.target, root = rot();
    // 18.09.2026 — ÚTLITSRITILL: einingar dregnar til á meðan „Breyta ham" er opinn.
    // Sama mynstur og spjöldin á Skipulagsborðinu nota, en röðin lifir í S.hamForm
    // og fer ekki í gagnagrunninn fyrr en ýtt er á „Vista breytingar".
    const hCell = t && t.closest ? t.closest('[data-hdrag]') : null;
    if (e.type === 'dragstart' && hCell) {
      S.hamDrag = hCell.dataset.hdrag;
      try {
        e.dataTransfer.setData('text/plain', S.hamDrag);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(hCell, 24, 16);
      } catch (_) {}
      return;
    }
    if (S.hamDrag && root) {
      if (e.type === 'dragover') {
        if (!hCell) return;
        e.preventDefault();
        root.querySelectorAll('.modcell.yfir').forEach(x => { if (x !== hCell) x.classList.remove('yfir'); });
        hCell.classList.add('yfir');
        return;
      }
      if (e.type === 'drop') {
        e.preventDefault();
        const fra = S.hamDrag;
        S.hamDrag = null;
        hfFaera(fra, hCell ? hCell.dataset.hdrag : null);
        render();
        return;
      }
      if (e.type === 'dragend') {
        S.hamDrag = null;
        root.querySelectorAll('.modcell.yfir').forEach(x => x.classList.remove('yfir'));
        return;
      }
    }
    if (e.type === 'dragstart') {
      const g = t && t.closest ? t.closest('[data-skdrag]') : null;
      if (!g) return;
      S.skDrag = g.dataset.skdrag;
      try {
        e.dataTransfer.setData('text/plain', S.skDrag);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(g.closest('.skc') || g, 16, 16);
      } catch (_) {}
      return;
    }
    if (!S.skDrag || !root) return;
    const kort = t && t.closest ? t.closest('.skc') : null;
    const grind = t && t.closest ? t.closest('.skgrid') : null;
    if (e.type === 'dragover') {
      if (!kort && !grind) return;
      e.preventDefault();
      root.querySelectorAll('.skc.yfir').forEach(x => { if (x !== kort) x.classList.remove('yfir'); });
      root.querySelectorAll('.skgrid.yfir').forEach(x => x.classList.remove('yfir'));
      if (kort) kort.classList.add('yfir'); else grind.classList.add('yfir');
      return;
    }
    if (e.type === 'drop') {
      e.preventDefault();
      const fra = S.skDrag, til = kort && kort.dataset.skid;
      S.skDrag = null;
      if (fra === NYTT_DRAG) {
        S.open[openKey('skipulag')] = true;
        vistaSpjold(l => { const ny = nyttSpjaldHlutur(l); l.push(ny); return til ? faeraSpjald(l, ny.id, til) : l; }).then(render);
        return;
      }
      if (til && til !== fra) vistaSpjold(l => faeraSpjald(l, fra, til)).then(render);
      else if (!til && grind) vistaSpjold(l => faeraAftast(l, fra)).then(render);
      else render();
      return;
    }
    if (e.type === 'dragend') {
      S.skDrag = null;
      root.querySelectorAll('.skc.yfir, .skgrid.yfir').forEach(x => x.classList.remove('yfir'));
    }
  }

  async function onPaste(e) {
    const el = e.target, sid = el && el.dataset ? el.dataset.skid : null;
    if (!sid) return;
    let f = null;
    try { for (const it of (e.clipboardData && e.clipboardData.items) || []) if (it.kind === 'file' && /^image\//.test(it.type || '')) { f = it.getAsFile(); break; } } catch (_) {}
    if (!f) return;                                        // venjuleg líming á texta: ósnert
    e.preventDefault();
    if (f.size > 10 * 1024 * 1024) { toast('Myndin er of stór (hámark 10 MB).', true); return; }
    const c = sb();
    if (!c) { toast('Engin tenging — myndin vistaðist ekki.', true); return; }
    const slod = 'skipulag/' + sid + '-' + Date.now() + '.' + ((((f.type || '').split('/')[1]) || 'png').replace(/[^a-z0-9]/gi, '') || 'png');
    toast('Hleð upp mynd…');
    try {
      const up = await c.storage.from('verkbord-files').upload(slod, f, { contentType: f.type || 'image/png', upsert: false });
      if (up.error) throw up.error;
      const url = ((c.storage.from('verkbord-files').getPublicUrl(slod) || {}).data || {}).publicUrl;
      if (!url) throw new Error('engin slóð');
      await vistaSpjold(l => { const cd = l.find(x => x.id === sid); if (cd) cd.mynd = url; return l; }, 'Myndin er komin á spjaldið');
      render();
    } catch (err) { toast('Myndin vistaðist ekki: ' + ((err && err.message) || err), true); }
  }

  /* ── hamir: stofna, breyta, eyða (samstillt) og tengja mál ── */
  async function vistaHamir(breyta, skilabod) {
    if (!stillingarTilbunar()) { toast('Stillingarnar eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return false; }
    const nyr = breyta(serHamir().map(h => Object.assign({}, h)));
    _vistar++;
    let ok = false;
    try { ok = !!(await AppSettings.save({ [CFG_KEY]: { hamir: nyr } })); } catch (_) {}
    _vistar--;
    if (!ok) toast('Hamurinn vistaðist ekki. Reyndu aftur.', true);
    else if (skilabod) toast(skilabod);
    render();
    return ok;
  }
  // Breidd einingar EINS OG HÚN STENDUR Í RITLINUM (óvistuð).
  function hfBreidd(k) {
    const b = S.hamForm && S.hamForm.breidd ? S.hamForm.breidd[k] : null;
    return b === 1 || b === 2 || b === 3 ? b : sjalfgefinBreidd(k);
  }
  function hfHak(k, a) {
    if (!S.hamForm) return;
    const rod = S.hamForm.rod = (S.hamForm.rod || []).slice();
    const i = rod.indexOf(k);
    if (a && i < 0) rod.push(k);
    if (!a && i >= 0) rod.splice(i, 1);
  }
  // Draga einingu á aðra: sú sem er dregin fer á sæti hinnar.
  function hfFaera(fra, til) {
    if (!S.hamForm || fra === til) return;
    const rod = (S.hamForm.rod || []).slice();
    const i = rod.indexOf(fra);
    if (i < 0) return;
    rod.splice(i, 1);
    const j = til ? rod.indexOf(til) : -1;
    if (j < 0) rod.push(fra); else rod.splice(j, 0, fra);
    S.hamForm.rod = rod;
  }
  function hamFormHtml() {
    const F = S.hamForm;
    if (!F) return '';
    // Varnagli: hamsform sem var opnað áður en ritillinn kom til (eða úr eldri lotu)
    // hefur enga röð. Þá er hún lesin úr hamnum sjálfum í stað þess að teikna autt.
    if (!Array.isArray(F.rod)) {
      const h0 = F.id ? (M(F.id) || {}) : {};
      F.rod = (h0.first || []).slice();
      F.breidd = {};
      F.rod.forEach(k => { F.breidd[k] = breiddAf(h0, k); });
    }
    const h = F.id ? M(F.id) : null;
    const mitt = F.id === MITT_HAM;
    const hak = (pre, k, lbl, on) => '<label class="hchk"><input type="checkbox" data-k="' + pre + k + '"' + (on ? ' checked' : '') + '> ' + esc(lbl) + '</label>';
    // Persónulega vinnuborðið: aðeins einingarnar — ekkert nafn, ekkert borð, engin mál og ekki hægt að eyða.
    if (mitt) return '<section class="panel hamform" aria-label="Einingar á mínu vinnuborði">' +
      '<header class="phead"><span class="plate">✎</span><h2 class="ptitle">' + esc(h.l) + '</h2><span class="grow"></span>' +
        '<button type="button" class="btn iv sm" data-t5="ham-loka">Hætta við</button></header>' +
      '<div class="hf">' +
        '<div class="hgrp"><span class="lbl">Einingar á þínu vinnuborði</span>' +
          Object.keys(MODS).filter(k => I_VOLDU.indexOf(k) < 0).map(k => hak('hm_', k, MODS[k].t, (F.rod || []).indexOf(k) >= 0)).join('') +
          '<span class="hnote2">Aðeins þú sérð þetta val — hver starfsmaður á sitt vinnuborð. Einingarnar hér að neðan má draga til, stækka og minnka.</span></div>' +
        '<div class="nybtn"><span class="grow"></span><button type="button" class="btn gold sm" data-t5="ham-vista">Vista vinnuborðið</button></div>' +
      '</div></section>';
    return '<section class="panel hamform" aria-label="' + (h ? 'Breyta ham' : 'Nýr hamur') + '">' +
      '<header class="phead"><span class="plate">' + (h ? '✎' : '+') + '</span><h2 class="ptitle">' + (h ? 'Breyta ham · ' + esc(h.l) : 'Nýr hamur') + '</h2><span class="grow"></span>' +
        '<button type="button" class="btn iv sm" data-t5="ham-loka">Hætta við</button></header>' +
      '<div class="hf">' +
        '<label class="nylbl"><span class="lbl">Nafn hamsins</span><input type="text" data-k="hn" value="' + esc(h ? h.l : '') + '" placeholder="t.d. Brunakerfi, Tilboð, Uppsetningar" maxlength="30"></label>' +
        '<div class="hgrp"><span class="lbl">Borðið sjálft</span>'
          + hak('', 'hb', 'Master, mitt borð og valið mál fylgja hamnum', h ? h.board !== false : true)
          + '<span class="hnote2">Taktu hakið af til að hafa AÐEINS einingarnar hér að neðan — t.d. bara skipulagsborðið.</span></div>' +
        '<div class="hgrp"><span class="lbl">Hver sér haminn</span>'
          + hak('', 'he', 'Bara ég (' + esc(h && h.eigandi ? h.eigandi : nu()) + ') — hinir sjá hann ekki í hamaröðinni', !!(h && h.eigandi))
          + '</div>' +
        // 18.09.2026: hökin lesa `S.hamForm.rod` — ekki vistaða haminn — svo þau
        // fylgi því sem dregið hefur verið til og því sem tekið var burt með ✕.
        '<div class="hgrp"><span class="lbl">Einingar sem opnast með hamnum</span>' +
          Object.keys(MODS).map(k => hak('hm_', k, MODS[k].t, (F.rod || []).indexOf(k) >= 0)).join('') +
          '<span class="hnote2">' + (F.id === cfg().mode
            ? 'Einingarnar hér að neðan má draga til, stækka og minnka. Útlitið vistast með hamnum.'
            : 'Veldu haminn til að geta dregið einingarnar til og breytt stærð þeirra.') + '</span></div>' +
        '<div class="hgrp"><span class="lbl">Taka sjálfkrafa með mál í flokki</span>' + Object.keys(FLOKKAR).map(k => hak('hf_', k, FLOKKAR[k], h && h.flokkar.indexOf(k) >= 0)).join('') + '</div>' +
        '<div class="hgrp"><span class="lbl">… eða með merki</span>' + Object.keys(MERKI).map(k => hak('hg_', k, MERKI[k], h && h.merki.indexOf(k) >= 0)).join('') + '</div>' +
        '<p class="hnote">Mál tengjast líka beint: opnaðu mál og smelltu á haminn undir „Hamir". Beint tengt mál fer af Þjónustu.</p>' +
        '<div class="nybtn">' + (h ? '<button type="button" class="btn iv sm" data-t5="ham-eyda" data-mode="' + esc(F.id) + '">🗑 Eyða ham</button><span class="grow"></span>' : '') +
          '<button type="button" class="btn gold sm" data-t5="ham-vista">' + (h ? 'Vista breytingar' : 'Stofna ham') + '</button></div>' +
      '</div></section>';
  }
  function hamirHtml(r) {
    const tags = tagList(r), serL = serHamir().map(h => h.id);
    // 368aa: innbyggðu hamirnir raða málum sjálfir — aðeins sérsniðnir hamir (+ Hamur) taka mál sem tengd eru beint.
    if (!serL.length) return '';
    return '<div class="hchips"><span class="slabel">Hamir</span>' + serL.map(k => {
      const h = M(k), beint = tags.indexOf(HAM_MERKI + k) >= 0, inni = iHamGrunnur(r, k);
      const skyring = beint ? 'Tengt beint — smelltu til að aftengja'
        : inni ? (k === 'thjonusta' ? 'Sjálfgefið: ekki tengt öðrum ham — smelltu til að tengja beint' : 'Sjálfkrafa (flokkur, merki eða póstur) — smelltu til að tengja beint')
        : 'Smelltu til að tengja málið við haminn';
      return '<button type="button" class="hchip' + (beint ? ' on' : inni ? ' auto' : '') + '" data-t5="ham-tengja" data-id="' + r.id + '" data-mode="' + esc(k) + '"' + dis(r.id) + ' title="' + esc(skyring) + '">' + esc(h.l) + '</button>';
    }).join('') + '</div>';
  }
  // Tengja/aftengja = merkið ham:<id> í tags. Fylkið lesið nýtt og skrifað skilyrt á updated_at, svo merki sem
  // gamla borðið eða önnur vél setti á sama augnabliki étist ekki.
  function tengjaHam(id, hamId) {
    const c = sb();
    if (!c || !M(hamId)) return;
    return act(id, async () => {
      for (let tilraun = 0; tilraun < 3; tilraun++) {
        const cur = await c.from('thjonustubeidni').select('tags,updated_at').eq('id', id).single();
        if (cur.error) throw cur.error;
        const tags = (Array.isArray(cur.data.tags) ? cur.data.tags : []).filter(t => typeof t === 'string');
        const merki = HAM_MERKI + hamId, var_ = tags.indexOf(merki) >= 0;
        const nyr = var_ ? tags.filter(t => t !== merki) : tags.concat([merki]);
        const r = await c.from('thjonustubeidni').update({ tags: nyr, updated_at: new Date().toISOString() }).eq('id', id).eq('updated_at', cur.data.updated_at).select('id,tags');
        if (r.error) throw r.error;
        if (r.data && r.data.length) {
          const row = S.rows.find(x => x.id === id);
          if (row) row.tags = r.data[0].tags;
          toast((var_ ? 'Tekið úr hamnum ' : 'Tengt við haminn ') + M(hamId).l);
          return;
        }
      }
      throw new Error('málið breyttist á meðan — reyndu aftur');
    });
  }

  /* ── skilaboð ── */
  let _toastT = 0;
  function toast(msg, warn, afturkalla) {
    const host = rot() || document.body;
    let t = host.querySelector('.t5toast');
    if (!t) { t = document.createElement('div'); t.className = 't5toast'; t.setAttribute('role', 'status'); host.appendChild(t); }
    t.textContent = msg;
    S.undo = typeof afturkalla === 'function' ? afturkalla : null;
    if (S.undo) { const b = document.createElement('button'); b.type = 'button'; b.className = 'undo'; b.dataset.t5 = 'undo'; b.textContent = 'Afturkalla'; t.appendChild(b); }
    t.className = 't5toast' + (warn ? ' warn' : '');
    t.hidden = false;
    clearTimeout(_toastT);
    _toastT = setTimeout(() => { t.hidden = true; S.undo = null; }, S.undo ? 7000 : warn ? 4200 : 2600);
  }

  /* ── atburðir (hlustað á skuggarótinni) ── */
  function onClick(e) {
    const v = document.getElementById(VIEW_ID), root = v && v.shadowRoot;
    if (!root || !v.classList.contains('active')) return;
    const el = e.target && e.target.closest ? e.target.closest('[data-t5]') : null;
    // Leitarniðurstöður lokast við smell utan leitarinnar.
    if ((S.leit.opid || S.ny.opid) && !(e.target.closest && e.target.closest('.leit, .nyfyr'))) {
      S.leit.opid = false;
      S.ny.opid = false;
      if (!el) { render(); return; }
    }
    if (!el || el.tagName === 'SELECT') return;
    const a = el.dataset.t5, id = el.dataset.id ? Number(el.dataset.id) : null, m = el.dataset.m;
    const c = cfg();
    const krefstStillinga = () => { if (stillingarTilbunar()) return true; toast('Stillingarnar eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return false; };
    const nyttId = () => 'lk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    switch (a) {
      case 'take': take(id); return;
      case 'take-next': {
        const next = masterRows().filter(r => matchFilter(r, S.filter))[0];
        if (next) take(next.id); else toast('Ekkert á Master í þessari síu.');
        return;
      }
      case 'select': S.sel[nu()] = id; S.selFra = c.mode; if (!c.baraMitt) S.view = 'mitt'; render(); synaVal(); return;
      case 'skoda': {
        S.sel[nu()] = id;
        S.selFra = c.mode;                 // 368aa: einingahamur sýnir málið hægra megin — aðeins í hamnum þar sem það var opnað
        const sr = S.rows.find(x => x.id === id);
        if (sr && !c.baraMitt) S.view = onBoardOf(sr, nu()) ? 'mitt' : 'master';
        S.leit.opid = false;
        render();
        synaVal();
        return;
      }
      case 'sel-close': S.sel[nu()] = 0; render(); return;
      case 'fyr':
      case 'fyr-id':
        // Tengill með Ctrl/Shift/Cmd opnast í nýjum flipa (#company/<id>) — vafrinn sér um það.
        if (el.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey)) return;
        e.preventDefault();
        S.leit.opid = false;
        if (a === 'fyr-id' && S.tengjaVid) tengjaFyrirtaeki(S.tengjaVid, +el.dataset.fid);
        else if (a === 'fyr-id') openCompany(el.dataset.fid); else opnaFyrirtaekiMals(S.rows.find(x => x.id === id));
        return;
      case 'bara-mitt':
        if (!krefstStillinga()) return;
        c.baraMitt = el.dataset.v === '1';
        S.view = c.baraMitt ? 'mitt' : 'master';
        render();
        vistaCfg({ bara_mitt: c.baraMitt }, c.baraMitt ? 'Bara þitt borð — allt annað falið' : 'Master og einingar sýnd aftur');
        return;
      case 'done': done(id); return;
      case 'mal-eyda': {
        const r = S.rows.find(x => x.id === id);
        if (!r) return;
        act(id, async () => {
          const rows = await patchRow(id, { deleted_at: new Date().toISOString() });
          if (!rows.length) throw new Error('málið fannst ekki');
          if (S.sel === id) S.sel = 0;
          toast('Eytt: ' + String(r.title || '(ónefnt mál)').slice(0, 60), false, () => act(id, async () => { await patchRow(id, { deleted_at: null }); toast('Málið er komið aftur'); }));
        });
        return;
      }
      case 'mal-ari': {
        const r = S.rows.find(x => x.id === id);
        if (!r) return;
        const var_ = !!r.important;
        act(id, async () => {
          const rows = await patchRow(id, { important: !var_ });
          if (!rows.length) throw new Error('málið fannst ekki');
          toast(var_ ? 'Áríðandi-merkið tekið af' : 'Merkt áríðandi', false, () => act(id, async () => { await patchRow(id, { important: var_ }); toast('Afturkallað'); }));
        });
        return;
      }
      case 'giveback': giveBack(id); return;
      case 'samt-svar': {
        // 368z: óvistaðar tölur fara fyrst í grunninn — mistakist það er ekki svarað og blaðið stendur kyrrt.
        const sid = vbtOvistad(id), v = el.dataset.v;
        const bid = sid ? vbtFyrst(sid).then(ok => (ok ? svaraSamthykki(id, v) : null)) : svaraSamthykki(id, v);
        vbrEftirSvar(id, bid);
        samtEftirSvar(id, bid);
        return;
      }
      case 'samt-velja': S.samtVal = id; render(); vbrTilBaka(); return;
      case 'samt-fara': {
        const listi = samtListi(nu()), i = listi.findIndex(r => r.id === S.samtVal);
        const j = Math.min(listi.length - 1, Math.max(0, i + Number(el.dataset.v || 0)));
        if (listi[j]) { S.samtVal = listi[j].id; render(); vbrTilBaka(); }
        return;
      }
      case 'vbt': {
        const r = S.rows.find(x => x.id === id), sid = r && saraIdMals(r), s = sid ? vbtSara(sid) : null;
        if (!s) { toast('Tölur blaðsins eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return; }
        vbtBreyta(s, el.dataset.k, el.dataset.s, Number(el.dataset.v) || 0);
        render();
        // Fókusinn fylgir takkanum eftir endurteikningu, svo lyklaborð og skjálesari haldi sínum stað.
        const leit = '[data-t5="vbt"][data-k="' + el.dataset.k + '"][data-s="' + (el.dataset.s || '') + '"][data-v="' + el.dataset.v + '"]';
        setTimeout(() => { try { const b = rot().querySelector(leit); if (b && !b.disabled) b.focus({ preventScroll: true }); } catch (_) {} }, 0);
        return;
      }
      case 'vbr-buin': S.vbrBuin = !S.vbrBuin; render(); return;
      case 'vbr-velja': vbtFlytja(); S.vbrVal = id; render(); vbrTilBaka(); return;
      case 'vbr-fara': {
        const listi = vbrListi(nu()), i = listi.findIndex(r => r.id === S.vbrVal);
        const j = Math.min(listi.length - 1, Math.max(0, i + Number(el.dataset.v || 0)));
        if (listi[j]) { vbtFlytja(); S.vbrVal = listi[j].id; render(); vbrTilBaka(); }
        return;
      }
      case 'samt-sky':
        S.samtSkyOpid[id] = !S.samtSkyOpid[id];
        if (S.samtSkyOpid[id]) { S.sel[nu()] = id; if (!c.baraMitt) S.view = 'mitt'; }
        render();
        if (S.samtSkyOpid[id]) setTimeout(() => { try { const t = rot().querySelector('textarea[data-samtsky][data-id="' + id + '"]'); if (t) t.focus(); } catch (_) {} }, 60);
        return;
      case 'samt-sky-senda': {
        const txt = String(S.samtSkyDrog[id] || '').trim();
        if (!txt) { toast('Skrifaðu skýringuna fyrst — svo fer málið til Claude', true); return; }
        const sidS = vbtOvistad(id);
        const bidS = sidS ? vbtFyrst(sidS).then(ok => (ok ? svaraSamthykki(id, 'endurmeta', txt) : null)) : svaraSamthykki(id, 'endurmeta', txt);
        vbrEftirSvar(id, bidS);
        samtEftirSvar(id, bidS);
        return;
      }
      case 'reply': reply(id); return;
      case 'company': openCompany(el.dataset.fid); return;
      case 'filter': S.filter = el.dataset.f; S.synd = PAGE; S.leit.opid = false; if (!c.baraMitt) S.view = 'master'; render(); return;
      case 'more': S.synd += PAGE; render(); return;
      case 'view': S.view = el.dataset.v; render(); return;
      case 'mode':
        if (!krefstStillinga()) return;
        c.mode = el.dataset.mode;
        S.filter = (M(c.mode) || MODES.thjonusta).filter || 'allt';
        S.synd = PAGE;
        S.view = 'master';
        render();
        vistaCfg({ mode: c.mode });
        return;
      case 'mod-open': S.open[openKey(m)] = !isOpen(m); render(); return;
      case 'mitt-fella':
        S.mittSamanbrotid = !S.mittSamanbrotid;
        try { localStorage.setItem('t5_mitt_samanbrotid', S.mittSamanbrotid ? '1' : '0'); } catch (_) {}
        render();
        return;
      case 'cfg': S.cfgOpen = !S.cfgOpen; render(); return;
      case 'cfg-on':
        if (!krefstStillinga()) return;
        c.mods[m][0] = c.mods[m][0] ? 0 : 1;
        delete S.open[openKey(m)];
        render();
        vistaCfg({ mods: { [m]: c.mods[m].slice() } }, MODS[m].t + (c.mods[m][0] ? ' komið á vinnuborðið' : ' tekið af vinnuborðinu'));
        return;
      case 'composer':
        S.composer = !S.composer;
        if (!S.composer) S.ny = { q: '', fyr: null, tillogur: [], opid: false, idx: -1 };
        render();
        if (S.composer) { const f = root.querySelector('[data-k="nt"]'); if (f) f.focus(); }
        return;
      case 'composer-save': {
        const gildi = kk => { const x = root.querySelector('[data-k="' + kk + '"]'); return x ? (x.type === 'checkbox' ? x.checked : x.value) : ''; };
        const title = String(gildi('nt')).trim();
        if (!title) { toast('Skrifaðu hvað þarf að gera.', true); const t = root.querySelector('[data-k="nt"]'); if (t) t.focus(); return; }
        const cust = String(gildi('nc')).trim();
        el.disabled = true;
        createCase({ title, cust, fyr: S.ny.fyr && S.ny.fyr.nafn === cust ? S.ny.fyr : null, eigandi: String(gildi('ne')),
          lysing: String(gildi('nl')).trim(), frestur: String(gildi('nd')), aridandi: !!gildi('ni'), ham: String(gildi('nh')) }).then(ok => {
          if (!ok) { el.disabled = false; return; }
          root.querySelectorAll('.composer [data-k]').forEach(x => { if (x.type === 'checkbox') x.checked = false; else if (x.tagName !== 'SELECT') x.value = ''; });
          S.composer = false;
          S.ny = { q: '', fyr: null, tillogur: [], opid: false, idx: -1 };
          render();
        });
        return;
      }
      case 'link-add':
        S.linkForm = !S.linkForm;
        render();
        if (S.linkForm) { const f = root.querySelector('[data-k="ln"]'); if (f) f.focus(); }
        return;
      case 'link-edit': S.linkEdit = !S.linkEdit; render(); return;
      case 'link-save': {
        const ln = root.querySelector('[data-k="ln"]'), lu = root.querySelector('[data-k="lu"]'), lm = root.querySelector('[data-k="lm"]');
        const nafn = ln ? ln.value.trim().slice(0, 40) : '', slod = lagaSlod(lu ? lu.value : '');
        if (!nafn) { toast('Gefðu flýtileiðinni nafn.', true); if (ln) ln.focus(); return; }
        if (!slod) { toast('Slóðin þarf að vera vefslóð (t.d. keldan.is), /síða eða #síða í appinu.', true); if (lu) lu.focus(); return; }
        const modes = lm && lm.checked ? [c.mode] : [];
        el.disabled = true;
        vistaLinks(l => l.concat([{ id: nyttId(), nafn, slod, modes }]), 'Fest: ' + nafn).then(ok => {
          if (ok) { S.linkForm = false; render(); } else el.disabled = false;
        });
        return;
      }
      case 'link-quick': {
        const lm = root.querySelector('[data-k="lm"]');
        const modes = lm && lm.checked ? [c.mode] : [];
        vistaLinks(l => l.some(x => x.slod === el.dataset.slod) ? l : l.concat([{ id: nyttId(), nafn: el.dataset.nafn, slod: el.dataset.slod, modes }]), 'Fest: ' + el.dataset.nafn);
        return;
      }
      case 'link-del': vistaLinks(l => l.filter(x => x.id !== el.dataset.lid), 'Flýtileið fjarlægð'); return;
      case 'job-new':
        try { if (window.Vikudagskra && Vikudagskra.open) Vikudagskra.open(el.dataset.date); else toast('Dagskrárglugginn er ekki hlaðinn.', true); }
        catch (_) { toast('Dagskrárglugginn opnaðist ekki.', true); }
        return;
      case 'job-edit': {
        const j = jobsFor(nu()).find(x => String(x.id) === el.dataset.jid);
        if (!j) { toast('Verkið fannst ekki lengur á dagskránni.', true); render(); return; }
        try { Vikudagskra.open(j.date, j); } catch (_) { toast('Dagskrárglugginn opnaðist ekki.', true); }
        return;
      }
      case 'sk-ny': {
        const nid = nyttSkId();
        S.open[openKey('skipulag')] = true;
        vistaSpjold(l => l.concat([{ id: nid, slot: naestaSlot(l), verkbord_id: null, name: '', title: '', type: null, minnispunktur: true }])).then(() => {
          render();
          const f = rot() && rot().querySelector('[data-sk="name"][data-skid="' + nid + '"]');
          if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        });
        return;
      }
      case 'sk-del': {
        const sid = el.dataset.skid, gamalt = cardsFor(nu()).find(x => x.id === sid);
        const afrit = gamalt ? Object.assign({}, gamalt, S.skDrog[sid] || {}) : null;
        clearTimeout(_skT[sid]); delete _skBid[sid]; delete S.skDrog[sid];
        vistaSpjold(l => l.filter(x => x.id !== sid)).then(ok => {
          render();
          if (ok && afrit) toast('Spjaldinu var eytt', false, () => vistaSpjold(l => l.some(x => x.id === afrit.id) ? l : l.concat([afrit]), 'Spjaldið er komið aftur').then(render));
        });
        return;
      }
      case 'sk-type': {
        // Ræman hringar: enginn litur -> fyrsti -> … -> síðasti -> enginn litur.
        const sid = el.dataset.skid;
        vistaSpjold(l => { const cd = l.find(x => x.id === sid); if (cd) { const nyr = cd.type == null ? 0 : cd.type + 1; cd.type = nyr >= SB_TEG.length ? null : nyr; } return l; }).then(render);
        return;
      }
      case 'sk-mynd-x': {
        const sid = el.dataset.skid;
        vistaSpjold(l => { const cd = l.find(x => x.id === sid); if (cd) delete cd.mynd; return l; }, 'Myndin var tekin af spjaldinu').then(render);
        return;
      }
      case 'sk-add': {
        const r = S.rows.find(x => x.id === id);
        if (!r) return;
        if (cardsFor(nu()).some(x => String(x.verkbord_id) === String(r.id))) { toast('Þetta mál er þegar á skipulagsborðinu þínu.'); return; }
        if (!isOn('skipulag') && stillingarTilbunar()) { c.mods.skipulag[0] = 1; vistaCfg({ mods: { skipulag: c.mods.skipulag.slice() } }); }
        vistaSpjold(l => l.concat([{ id: nyttSkId(), slot: naestaSlot(l), verkbord_id: r.id, name: whereOf(r), title: r.title || '', type: null }]), '📋 Komið á skipulagsborðið').then(render);
        return;
      }
      case 'undo': {
        const f = S.undo, t = root.querySelector('.t5toast');
        S.undo = null;
        if (t) t.hidden = true;
        if (f) f();
        return;
      }
      case 'ham-ny':
        S.hamForm = S.hamForm && !S.hamForm.id ? null : { id: null, rod: [], breidd: {} };
        render();
        if (S.hamForm) { const f = root.querySelector('[data-k="hn"]'); if (f) f.focus(); }
        return;
      case 'ham-breyta': {
        // 18.09.2026: röð og breidd eru afrituð úr hamnum svo hægt sé að draga þær
        // til án þess að snerta vistaða haminn fyrr en ýtt er á Vista.
        const h0 = M(el.dataset.mode) || {};
        const br = {};
        (h0.first || []).forEach(k => { br[k] = breiddAf(h0, k); });
        S.hamForm = { id: el.dataset.mode, rod: (h0.first || []).slice(), breidd: br };
        render();
        return;
      }
      case 'ham-loka': S.hamForm = null; render(); return;
      case 'ham-vista': {
        if (S.hamForm && S.hamForm.id === MITT_HAM) {
          if (!krefstStillinga()) return;
          const F = S.hamForm, rod = (F.rod || []).filter(k => MODS[k]), breidd = {};
          rod.forEach(k => { const b = (F.breidd || {})[k]; if (b === 1 || b === 2 || b === 3) breidd[k] = b; });
          S.hamForm = null;
          // `first` er fylki: deepMerge sameinar hluti en skiptir fylkjum út, svo afhakað hverfur. `breidd` er hlutur
          // og gæti haldið gömlum lyklum — þeir eru meinlausir, breiddAf les aðeins einingar sem eru í `first`.
          vistaCfg({ mitt: { first: rod, breidd: breidd } }, 'Vinnuborðið þitt er vistað').then(render);
          render();
          return;
        }
        const nafn = String((root.querySelector('[data-k="hn"]') || {}).value || '').trim().slice(0, 30);
        if (!nafn) { toast('Gefðu hamnum nafn.', true); const f = root.querySelector('[data-k="hn"]'); if (f) f.focus(); return; }
        const F = S.hamForm || {}, hid = F.id || ('h' + Date.now().toString(36));
        if (hamaListi().some(k => k !== hid && lagt(M(k).l) === lagt(nafn))) { toast('Hamur með þessu nafni er þegar til.', true); return; }
        const valin = pre => [...root.querySelectorAll('.hamform input[data-k^="' + pre + '"]')].filter(x => x.checked).map(x => x.dataset.k.slice(pre.length));
        const bordMed = !!((root.querySelector('.hamform input[data-k="hb"]') || {}).checked);
        const baraEg = !!((root.querySelector('.hamform input[data-k="he"]') || {}).checked);
        const fyrri = F.id ? (M(F.id) || {}) : {};
        // 18.09.2026: röðin og breiddirnar koma úr ritlinum. Aðeins breiddir þeirra
        // eininga sem eru í hamnum eru geymdar — annars sæti gamalt rusl eftir.
        const rod = (F.rod || []).slice();
        const breidd = {};
        rod.forEach(k => { const b = (F.breidd || {})[k]; if (b === 1 || b === 2 || b === 3) breidd[k] = b; });
        const gildi = { id: hid, l: nafn, board: bordMed, first: rod, breidd: breidd, flokkar: valin('hf_'), merki: valin('hg_'), eigandi: baraEg ? (fyrri.eigandi || nu()) : '' };
        if (!bordMed && !gildi.first.length) { toast('Veldu að minnsta kosti eina einingu — hamurinn yrði annars auður.', true); return; }
        el.disabled = true;
        vistaHamir(l => { const i = l.findIndex(x => x.id === hid); if (i >= 0) l[i] = gildi; else l.push(gildi); return l; },
          F.id ? 'Hamurinn uppfærður' : 'Hamurinn „' + nafn + '" stofnaður').then(ok => {
          if (!ok) { el.disabled = false; return; }
          S.hamForm = null;
          c.mode = hid; S.filter = 'allt'; S.synd = PAGE; S.view = 'master';
          render();
          vistaCfg({ mode: hid });
        });
        return;
      }
      case 'ham-eyda': {
        const hid = el.dataset.mode, h = M(hid);
        if (!h || !h.ser || !window.confirm('Eyða hamnum „' + h.l + '"? Málin haldast — þau sem voru aðeins í honum birtast aftur undir Þjónustu.')) return;
        vistaHamir(l => l.filter(x => x.id !== hid), 'Hamnum var eytt').then(ok => {
          if (!ok) return;
          S.hamForm = null;
          if (c.mode === hid) { c.mode = 'thjonusta'; S.filter = 'allt'; vistaCfg({ mode: 'thjonusta' }); }
          render();
        });
        return;
      }
      case 'ham-tengja': tengjaHam(id, el.dataset.mode); return;
      case 'g-uppf':
        gleyma(el.dataset.g); if (G.falid) G.falid.at = 0; render();       // ↻ sækir líka falin atriði
        // Kröfur: staða reikninga (drög / send / greitt) sótt í Payday líka — 372 sendir 'payday-spegill' og listinn sækist aftur.
        if (el.dataset.g === 'krofur' && window.PaydaySpegill) {
          toast('Sæki stöðu reikninga úr Payday…');
          PaydaySpegill.uppfaera({ afl: true }).then(r => toast(r.ok ? 'Staða reikninga uppfærð úr Payday — ' + (r.upserted || 0) + ' reikningar' : 'Staða úr Payday uppfærðist ekki: ' + (r.villa || 'óþekkt villa'), !r.ok));
        }
        return;
      case 'fela':
      case 'fela-aftur': {
        const felaTakkar = () => [...root.querySelectorAll('[data-t5="fela"],[data-t5="fela-aftur"]')];
        const i = felaTakkar().indexOf(el), lyklabord = e.detail === 0;
        setjaFalid(el.dataset.fl, el.dataset.fe, el.dataset.fd, a === 'fela');
        // Lyklaborð: fókusinn fer á næsta „Fela" í stað þess að týnast með línunni sem hvarf.
        if (lyklabord && i >= 0) { const naesti = felaTakkar()[i]; if (naesti) naesti.focus(); }
        return;
      }
      case 'fela-syna':
      case 'syna-hluta': {
        const h = el.dataset.h, lyklabord = e.detail === 0;
        S.synaHluta[h] = !S.synaHluta[h];
        render();
        if (lyklabord) { const sami = [...root.querySelectorAll('[data-t5="' + a + '"]')].find(x => x.dataset.h === h); if (sami) sami.focus(); }
        return;
      }
      case 'sannreyna': sannreyna(); return;
      case 'sann-loka': S.sannreyn = null; render(); return;
      case 'fela-endurlesa': if (G.falid) G.falid.at = 0; render(); return;
      case 'skyr-opna': skyrOpna({ l: el.dataset.fl, e: el.dataset.fe, d: el.dataset.fd }); return;
      case 'skyr-vista': vistaSkyringu(true); return;
      case 'skyr-haetta': skyrHaetta(); return;
      case 'skyr-eyda': vistaSkyringu(true, null); return;
      case 'vinna-sala': vinnaKrofu('sala', Number(el.dataset.sid)); return;
      case 'vinna-gleymt': vinnaKrofu('gleymt', Number(el.dataset.fid)); return;
      case 'opna-solu': opnaSolu(Number(el.dataset.sid), el.dataset.num); return;
      case 'skjal-velja': S.skjalVal = true; window.addEventListener('focus', () => setTimeout(() => { S.skjalVal = false; }, 1500), { once: true }); return;
      case 'skjal-eyda': eydaSkjali(+el.dataset.id, +el.dataset.fid); return;
      case 'hr-opna':
        S.hreinsa = !S.hreinsa;
        render();
        if (S.hreinsa) { const p = root.querySelector('.hreinsun'); if (p) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
        return;
      case 'hr-sia': S.hrSia = el.dataset.v; render(); return;
      case 'hr-val': S.hrVal = S.hrVal || {}; S.hrVal[id] = !S.hrVal[id]; render(); return;
      case 'hr-allir': {
        const kveikja = el.dataset.v === '1', sia = S.hrSia || 'tvitekid';
        S.hrVal = S.hrVal || {};
        flokkaMaster().filter(x => x.fl === sia).forEach(x => { S.hrVal[x.r.id] = kveikja; });
        render();
        return;
      }
      case 'hr-loka': lokaVoldum(); return;
      case 'tf-tengja': tengjaFyrirtaeki(id, +el.dataset.fid); return;
      case 'tf-leita': {
        const r = S.rows.find(x => x.id === id);
        if (!r) return;
        S.tengjaVid = id;
        const q = whereOf(r) || String(r.title || '').slice(0, 40), f0 = root.querySelector('[data-k="lq"]');
        if (f0) f0.value = q;                                  // áður en teiknað er — drögin taka gildið með sér
        leita('lq', q);
        const f = root.querySelector('[data-k="lq"]');
        if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        return;
      }
      case 'tf-haetta': S.tengjaVid = null; render(); return;
      case 'vb-sia': S.vbSia = el.dataset.v; render(); return;
      case 'vb-opna': S.vbOpin = S.vbOpin || {}; S.vbOpin[el.dataset.vb] = !S.vbOpin[el.dataset.vb]; render(); return;
      case 'vb-stada': vbStada(+el.dataset.vb, el.dataset.v); return;
      case 'ak-listi': S.akListi = +el.dataset.v || 1; render(); return;
      case 'ak-setja': el.disabled = true; setjaAkstur(+el.dataset.fid, +el.dataset.v); return;
      case 'ak-prenta': prentaAksturslista(+el.dataset.v || 1); return;
      case 'ai-tillaga': aiTillaga(id); return;
      case 'virkni-uppf': uppfaeraVirkni(); return;
      case 'bm-opna': S.bmOpid[id] = !S.bmOpid[id]; render(); return;
      // 18.09.2026: smellt á hvíta svæðið → reitur opnast OG fókus fer í hann með
      // bendilinn aftast. Annars þyrfti tvo smelli til að byrja að skrifa.
      case 'nt-opna': {
        S.ntOpid[id] = true;
        render();
        setTimeout(() => {
          const root = rot();
          if (!root) return;
          const ta = root.querySelector('textarea[data-nt][data-nt-kort][data-id="' + id + '"]') ||
            root.querySelector('textarea[data-nt][data-id="' + id + '"]');
          if (!ta) return;
          ta.focus();
          try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (_) {}
        }, 0);
        return;
      }
      case 'pb-senda': {
        const m = pbMal(el.dataset.mid);
        if (!m) { toast('Fann ekki póstinn — uppfærðu eininguna.', true); return; }
        if (!(window.ReikningaPostur && ReikningaPostur.sendaReikning)) { toast('Reikninga-pósturinn (240) hefur ekki hlaðist — endurhlaðið síðuna.', true); return; }
        ReikningaPostur.sendaReikning(m);
        return;
      }
      case 'pb-svar': {
        const m = pbMal(el.dataset.mid);
        if (!m) { toast('Fann ekki póstinn — uppfærðu eininguna.', true); return; }
        if (!(window.ReikningaPostur && ReikningaPostur.replyTo)) { toast('Reikninga-pósturinn (240) hefur ekki hlaðist — endurhlaðið síðuna.', true); return; }
        ReikningaPostur.replyTo(m);
        return;
      }
      case 'ham-breidd': {
        if (!S.hamForm) return;
        const k = el.dataset.m, ny = Math.max(1, Math.min(3, hfBreidd(k) + (+el.dataset.v || 0)));
        (S.hamForm.breidd = S.hamForm.breidd || {})[k] = ny;
        render();
        return;
      }
      case 'ham-eining-burt': {
        if (!S.hamForm) return;
        const k = el.dataset.m;
        S.hamForm.rod = (S.hamForm.rod || []).filter(x => x !== k);
        render();
        return;
      }
      case 'bm-vista': {
        const r = S.rows.find(x => x.id === id), d = S.bmDrog[id] || {};
        if (!r) return;
        const patch = {};
        if (d.title != null && d.title.trim() && d.title.trim() !== (r.title || '')) patch.title = d.title.trim();
        if (d.notes != null && d.notes !== (r.notes || '')) patch.notes = d.notes;
        if (d.due != null && d.due !== (r.due_at ? ymd(new Date(r.due_at)) : '')) patch.due_at = /^\d{4}-\d{2}-\d{2}$/.test(d.due) ? new Date(d.due + 'T12:00:00').toISOString() : null;
        if (d.important != null && !!d.important !== !!r.important) patch.important = !!d.important;
        if (d.status != null && d.status !== (r.status || 'nytt')) patch.status = d.status;
        if (!Object.keys(patch).length) { toast('Engin breyting til að vista.'); return; }
        act(id, async () => {
          const rows = await patchRow(id, patch);
          if (!rows.length) throw new Error('málið fannst ekki');
          if (patch.status && rows[0].status !== patch.status) throw new Error('las til baka stöðuna „' + rows[0].status + '“');
          delete S.bmDrog[id];
          // Tveir ritlar á sama reit (`notes`): óskoluð drög úr innsláttarreitnum
          // myndu annars skolast út 700 ms síðar og skrifa yfir það sem var nýbúið
          // að vista hér. Sá reitur sem síðast var skrifað í ræður.
          try { clearTimeout(_skT['nt:' + id]); delete _skBid['nt:' + id]; } catch (_) {}
          delete S.ntDrog[id];
          S.ntStada[id] = null;
          S.bmOpid[id] = false;
          toast(patch.status === 'lokad' ? 'Breytingar vistaðar · málið er lokað' : 'Breytingar vistaðar');
        });
        return;
      }
      case 'bm-eyda': {
        const r = S.rows.find(x => x.id === id);
        if (!r || !window.confirm('Eyða málinu „' + (r.title || '(ónefnt mál)') + '“? Það hverfur af öllum borðum.')) return;
        act(id, async () => {
          const rows = await patchRow(id, { deleted_at: new Date().toISOString() });
          if (!rows.length) throw new Error('málið fannst ekki');
          delete S.bmDrog[id];
          S.bmOpid[id] = false;
          toast('Málinu var eytt', false, () => act(id, async () => { await patchRow(id, { deleted_at: null }); toast('Málið er komið aftur'); }));
        });
        return;
      }
      case 'ny-fyr': veljaNyFyr(Number(el.dataset.i)); return;
      case 'vd-opna': {
        // 853efc10: málið er á dagskrá → opna Dagskrá (01) og renna að deginum. Utan 7 daga gluggans (eða sé
        // Dagskrá falin) opnast verkið sjálft. Verk á annarra dagskrá er aðeins nefnt — 303 vistar alltaf á
        // dagskrá þess sem er valinn, svo breyting héðan færi á rangt borð.
        const j = jobOfMal(id);
        if (!j) { toast('Málið er ekki lengur á dagskrá.', true); render(); return; }
        if (j._n !== nu()) { toast('Á dagskrá hjá ' + j._n + ' ' + fmtD(j.date) + ' — veldu ' + j._n + ' í starfsmannavalinu til að sjá daginn.'); return; }
        S.open[openKey('dagskra')] = true;
        render();
        const dplus = root.querySelector('.dplus[data-date="' + String(j.date || '').slice(0, 10) + '"]');
        const dagur = dplus && dplus.closest('.day');
        if (!dagur) { try { Vikudagskra.open(j.date, j); } catch (_) { toast('Dagskrárglugginn opnaðist ekki.', true); } return; }
        try { dagur.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
        const verk = [...dagur.querySelectorAll('[data-jid]')].find(x => x.dataset.jid === String(j.id)) || dagur;
        verk.style.transition = 'box-shadow .25s';
        verk.style.boxShadow = '0 0 0 3px #d4a017';
        setTimeout(() => { try { verk.style.boxShadow = ''; } catch (_) {} }, 2600);
        return;
      }
      case 'vd-add': {
        // Sama samningur og gamla borðið: 303 hlerar st-skra-verk og opnar dagskrárgluggann forútfylltan.
        const r = S.rows.find(x => x.id === id);
        if (!r) return;
        try { window.dispatchEvent(new CustomEvent('st-skra-verk', { detail: { name: whereOf(r) || r.title || '', note: [r.title, aiLine(r)].filter(Boolean).join(' — '), id: r.id } })); }
        catch (_) { toast('Dagskrárglugginn opnaðist ekki.', true); }
        return;
      }
      case 'go': goView(el.dataset.view, el.dataset.anchor); return;
      case 'reload': load(); return;
    }
  }
  function onChange(e) {
    const el = e.target, v = document.getElementById(VIEW_ID);
    if (!v || !el || !el.dataset) return;
    if (el.dataset.t5Skjal) { const files = [...(el.files || [])]; el.value = ''; S.skjalVal = false; hladaSkjolum(+el.dataset.t5Skjal, files); return; }
    if (el.dataset.t5 === 'assign') { el.blur(); setjaA(Number(el.dataset.id), el.value); return; }
    if (el.dataset.bm) { bmSkra(el); return; }
    // 18.09.2026: hök einingalistans stýra `S.hamForm.rod` — röðin er sannleikurinn,
    // ekki DOM-ið, svo dráttur og ✕ og hök segi alltaf það sama.
    if (el.dataset.k && el.dataset.k.indexOf('hm_') === 0 && S.hamForm) {
      hfHak(el.dataset.k.slice(3), !!el.checked);
      render();
      return;
    }
    if (el.dataset.t5 === 'ak-mal') { el.blur(); setjaAkstur(+el.dataset.fid, +el.value); return; }
    if (el.dataset.t5 !== 'who' || !el.value) return;
    el.blur();
    skolaAllt();                                           // texti í ritun vistast á réttan starfsmann
    S.view = 'master';
    S.synd = PAGE;
    try { if (window.BordStarfsmadur && BordStarfsmadur.set) BordStarfsmadur.set(el.value); } catch (_) {}
    render();
  }
  function onInput(e) {
    const el = e.target, k = el && el.dataset ? el.dataset.k : null;
    if (k === 'lq' || k === 'nc') leita(k, el.value);
    else if (el && el.dataset && el.dataset.sk) skrifaSk(el);
    else if (el && el.dataset && el.dataset.bm) bmSkra(el);
    else if (el && el.dataset && el.dataset.nt) skrifaNota(el);
    else if (el && el.dataset && el.dataset.dn) skrifaDagnotu(el);
    else if (el && el.dataset && el.dataset.skyr && S.skyrOpid) S.skyrOpid.texti = el.value;
    else if (el && el.dataset && el.dataset.samtsky) { const sid = Number(el.dataset.id); if (sid) { S.samtSkyDrog[sid] = el.value; skyDrogVista(sid, el.value); } }
  }
  function onKey(e) {
    const v = document.getElementById(VIEW_ID), root = v && v.shadowRoot;
    if (!root || !v.classList.contains('active')) return;
    const k = e.target && e.target.dataset ? e.target.dataset.k : null;
    // 18.09.2026 — innsláttarreiturinn: Ctrl/Cmd+Enter vistar strax (ekki bíða 700 ms),
    // Esc skilar textanum í það sem stendur í gagnagrunninum og lokar reitnum á korti.
    if (e.target && e.target.dataset && e.target.dataset.nt) {
      const nid = Number(e.target.dataset.id);
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); e.stopPropagation();
        skola('nt:' + nid);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        const r = S.rows.find(x => x.id === nid);
        delete S.ntDrog[nid];
        S.ntStada[nid] = null;
        try { clearTimeout(_skT['nt:' + nid]); delete _skBid['nt:' + nid]; } catch (_) {}
        e.target.value = r ? String(r.notes || '') : '';
        S.ntOpid[nid] = false;
        e.target.blur();
        render();
        return;
      }
      return;
    }
    // Skýringarritill: Ctrl/Cmd+Enter vistar, Esc hættir við — og lyklarnir fara ekki lengra (Esc lokar ekki öðru á síðunni).
    if (e.target && e.target.dataset && e.target.dataset.skyr) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); vistaSkyringu(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); skyrHaetta(); }
      return;
    }
    // Örvar og Enter í niðurstöðum (leitin í hausnum og fyrirtæki í nýju máli).
    if ((k === 'lq' || k === 'nc') && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      const st = k === 'lq' ? S.leit : S.ny, listi = k === 'lq' ? S.leit.fyr : S.ny.tillogur;
      if (st.opid && listi.length) {
        if (e.key !== 'Enter') { e.preventDefault(); st.idx = (st.idx + (e.key === 'ArrowDown' ? 1 : -1) + listi.length) % listi.length; render(); return; }
        e.preventDefault();
        const i = st.idx >= 0 ? st.idx : 0;
        if (k === 'nc') veljaNyFyr(i);
        else if (st.idx >= 0 || listi.length === 1) { S.leit.opid = false; if (S.tengjaVid) tengjaFyrirtaeki(S.tengjaVid, listi[i].id); else openCompany(listi[i].id); }
        return;
      }
      if (k === 'lq') { if (e.key === 'Enter') e.preventDefault(); return; }
    }
    if (e.key === 'Enter' && (k === 'nt' || k === 'nc')) { e.preventDefault(); const b = root.querySelector('[data-t5="composer-save"]'); if (b && !b.disabled) b.click(); }
    if (e.key === 'Enter' && k === 'hn') { e.preventDefault(); const b = root.querySelector('[data-t5="ham-vista"]'); if (b && !b.disabled) b.click(); }
    if (e.key === 'Enter' && (k === 'ln' || k === 'lu')) { e.preventDefault(); const b = root.querySelector('[data-t5="link-save"]'); if (b && !b.disabled) b.click(); }
    if (e.key === 'Escape' && S.tengjaVid && !S.leit.opid) { S.tengjaVid = null; render(); return; }
    if (e.key === 'Escape' && (S.leit.opid || S.ny.opid)) { S.leit.opid = false; S.ny.opid = false; render(); return; }
    if (e.key === 'Escape' && (S.composer || S.cfgOpen || S.linkForm)) { S.composer = false; S.cfgOpen = false; S.linkForm = false; render(); }
  }

  /* ── sýnin (sama mynstur og 310) ── */
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return true;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala') || document.querySelector('.view');
    if (!sample || !sample.parentElement) return false;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.style.display = 'none';
    sample.parentElement.appendChild(v);
    return true;
  }
  let _poll = 0;
  function show() {
    if (!ensureView()) return;
    document.querySelectorAll('[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block';
    v.classList.add('active');
    // Hnappurinn „🔧 Þjónustuborð" ber data-view 'verkbord' (231 injectNav). 218 syncNav tekur
    // lýsinguna af eftir hash-leiðsögn, svo hún er sett aftur augnabliki síðar.
    const lysaNav = () => document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'verkbord' || b.dataset.view === NAV_KEY));
    lysaNav();
    setTimeout(() => { const vv = document.getElementById(VIEW_ID); if (vv && vv.classList.contains('active')) lysaNav(); }, 60);
    try { if (location.hash !== '#' + NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    S.filter = (M(cfg().mode) || MODES.thjonusta).filter || 'allt';
    ferskaEiningar();
    render();
    load(S.loaded);
    clearInterval(_poll);
    _poll = setInterval(() => {
      const vv = document.getElementById(VIEW_ID);
      if (!vv || !vv.classList.contains('active')) { clearInterval(_poll); return; }
      if (document.hidden) return;
      // Punktarnir í „Í vinnslu — er það búið?" (skýrsla/reikningur) fylgja líka mínútu-könnuninni, ekki bara 5 mín. geymslu.
      const gs = G.skyrslur;
      if (gs && gs.at && !gs.bid && Date.now() - gs.at > POLL_MS) { gs.at = 0; render(); }
      load(true);
    }, POLL_MS);
  }
  function patchSwitchView() {
    if (!window.App || window.App._t5SwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY || view === 'verkbord' || view === 'verkefni') { show(); return; }
      const mine = document.getElementById(VIEW_ID);
      if (mine && mine.classList.contains('active')) skolaSkyringu();          // farið af borðinu: óvistuð skýring vistast strax
      if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      clearInterval(_poll);
      return orig.apply(this, arguments);
    };
    window.App._t5SwitchPatched = true;
  }
  function openFromHash() {
    if (['bord', 'verkbord', 'verkefni'].indexOf((location.hash || '').replace(/^#/, '')) < 0) return;
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) return;
    if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
  }
  // Hliðarstikuhnappurinn „🔧 Þjónustuborð" — áður í 231 (injectNav), sem er farið. data-view er VILJANDI 'verkbord':
  // röðun (sidebar_order) og faldir hnappar (sidebar_hidden) í 68 eru vistuð eftir data-view á öllum vélum, og
  // 261 navTo smellir á .vnav-btn[data-view=lykill].
  let _hnappTilraunir = 0;
  function festaHnapp() {
    const nav = document.querySelector('nav.view-nav, .view-nav'), tpl = nav && nav.querySelector('.vnav-btn');
    if (!nav || !tpl) { if (++_hnappTilraunir < 60) setTimeout(festaHnapp, 500); return; }
    if (nav.querySelector('[data-view="verkbord"]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', 'verkbord');
    btn.style.cssText += ';position:relative;z-index:5;display:flex;align-items:center';
    btn.innerHTML = '<span style="margin-right:6px">🔧</span>Þjónustuborð';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    nav.insertBefore(btn, nav.firstChild);
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) btn.classList.add('active');
  }
  let _stSig = '';
  const stillingaSig = () => { const n = nu(); try { return JSON.stringify([n, P(CFG_KEY + '.by_staff.' + n), jobsFor(n), cardsFor(n), folk(), P(CFG_KEY + '.hamir')]); } catch (_) { return String(Date.now()); } };
  function boot() {
    patchSwitchView();
    ensureView();
    window.addEventListener('hashchange', openFromHash);
    let rT = 0;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(render, 200); });
    document.addEventListener('visibilitychange', () => {
      const v = document.getElementById(VIEW_ID);
      if (!document.hidden && v && v.classList.contains('active')) { ferskaEiningar(); render(); load(true); }
    });
    // Stillingar breytast þegar HVAÐ SEM ER í appinu vistar — teiknað aðeins ef það snertir þetta borð.
    try {
      if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => {
        const s = stillingaSig();
        if (s === _stSig) return;
        _stSig = s;
        if (!_vistar) Object.keys(_cfg).forEach(k => delete _cfg[k]);
        render();
      });
    } catch (_) {}
    const aSkiptum = () => { S.view = 'master'; S.linkForm = false; S.linkEdit = false; render(); };
    if (window.BordStarfsmadur && BordStarfsmadur.onChange) BordStarfsmadur.onChange(aSkiptum);
    else (window.__bordStarfsmadurAskrift = window.__bordStarfsmadurAskrift || []).push(aSkiptum);
    // 372: staða reikninga uppfærð úr Payday (hvaðan sem er í appinu) → Kröfur sækja aftur; teiknað aðeins ef borðið er opið.
    window.addEventListener('payday-spegill', () => {
      gleyma('krofur');
      const v = document.getElementById(VIEW_ID);
      if (v && v.classList.contains('active')) render();
    });
    festaHnapp();
    openFromHash();
    setTimeout(() => { patchSwitchView(); ensureView(); festaHnapp(); openFromHash(); }, 1600);
    window.Thjonustubord5 = { show, load, render, version: '368z3' };
    console.log('[368-thjonustubord5] installed (#bord)');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
/* === END ÞJÓNUSTUBORÐ 5 === */
