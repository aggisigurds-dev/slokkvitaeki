// Brunaáætlun — reitir, sjálfgefnir kaflatextar og smíði prentskjalanna (HTML → prenta / vista sem PDF).
// Textar eru „létt markdown“: auðar línur skilja málsgreinar, „- “ punktar, „1. “ tölusett, „| a | b |“ töflur
// (lína „|---|“ gerir fyrri línuna að haus; „|? “ = röð sem hverfur ef reitirnir í henni eru tómir), „> “ rammi,
// „### “ millifyrirsögn, **feitt**, *skáletrað*, <br> línuskil. {{reitur}} sækir gildi; tómur reitur verður gulur.
(function () {
  'use strict';
  var T = window.BaTakn, esc = T.esc;

  var REITIR = [
    { h: 'Húsið', reitir: [
      ['heiti', 'Heiti staðar (í fyrirsögnum)'], ['heimilisfang', 'Heimilisfang'], ['notkun', 'Notkun (t.d. Gistiheimili, Skrifstofur)'],
      ['notkunarflokkur', 'Notkunarflokkur (1–6)'], ['staerd', 'Stærð og skipulag', 1], ['haedir', 'Hæðir og rými (ein lína á hæð)', 1],
      ['brunahonnun', 'Brunahönnun / samþykktir uppdrættir (notað í setningunni „Áætlunin byggir á …“)', 1], ['brunaholfun', 'Brunahólfun', 1], ['brunavidvorun', 'Brunaviðvörunarkerfi', 1],
      ['slokkvibunadur', 'Handslökkvibúnaður', 1], ['neydarlysing', 'Út- og neyðarlýsing', 1], ['flottaleidir', 'Flóttaleiðir (almennt)', 1],
      ['reykraesing', 'Reykræsing'], ['annad', 'Annar búnaður (valfrjálst)', 1],
    ] },
    { h: 'Ábyrgð og tengiliðir', reitir: [
      ['eigandi', 'Eigandi'], ['eigandi_kt', 'Kennitala eiganda'], ['eigandi_heimili', 'Heimilisfang eiganda'], ['eigandi_pnr', 'Póstnúmer og staður eiganda'],
      ['eigandi_gsm', 'GSM eiganda'], ['eigandi_vinnusimi', 'Vinnusími eiganda'],
      ['rekstur', 'Rekstraraðili / umsjón'], ['rekstur_kt', 'Kennitala rekstraraðila'], ['rekstur_simi', 'Sími rekstraraðila'],
      ['abyrgdarmadur', 'Ábyrgðarmaður fyrirtækis'], ['abyrgdarmadur_simi', 'Sími ábyrgðarmanns'],
      ['eldvarnafulltrui', 'Eldvarnafulltrúi (umsjónarmaður eldvarna)'], ['eldvarnafulltrui_simi', 'Sími eldvarnafulltrúa'],
      ['eldvarnafulltrui_netfang', 'Netfang eldvarnafulltrúa'], ['stadgengill', 'Staðgengill eldvarnafulltrúa'],
      ['vakt_simi', 'Vakt / umsjón – sími allan sólarhringinn'], ['vaktstod', 'Vaktstöð brunaviðvörunarkerfis'],
      ['thjonusta', 'Þjónustuaðili brunavarna'], ['thjonusta_simi', 'Sími þjónustuaðila'], ['rafverktaki', 'Rafverktaki neyðarlýsingar'],
    ] },
    { h: 'Rýming', reitir: [
      ['flottaleidir_haedir', 'Flóttaleiðir hverrar hæðar („1. hæð: …“, ein lína á hæð)', 1], ['sofnunarsvaedi', 'Söfnunarsvæði'],
      ['skjol', 'Skjól í vondu veðri'], ['starfsfolk_nott', 'Þegar ekkert starfsfólk er í húsinu', 1], ['hreyfihamladir', 'Hreyfihamlaðir og þeir sem þurfa aðstoð', 1],
      ['umgengni', 'Umgengnisreglur', 1], ['fyrsta_aefing', 'Fyrsta rýmingaræfing (dags.)'],
    ] },
    { h: 'Útgáfa', reitir: [
      ['shs_mal', 'Mál hjá slökkviliði'], ['utgafa', 'Útgáfa'], ['dags', 'Dagsetning'], ['teiknad_af', 'Unnið af'], ['ryni', 'Rýnt af'],
      ['urbaetur', 'Úrbótalisti („Atriði ; Ábyrgð ; Áætlað ; Staða“, ein lína á atriði)', 1],
    ] },
  ];
  var MERKI = {};
  REITIR.forEach(function (g) { g.reitir.forEach(function (r) { MERKI[r[0]] = r[1]; }); });

  function dagsIS(d) { d = d ? new Date(d) : new Date(); if (isNaN(d)) return ''; return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }
  var MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];

  // Sjálfgefin gildi úr gögnum appsins: fyrirtæki, tækjaskrá og nýjasta brunakerfisskýrsla
  function sjalfgefid(g) {
    var f = g.fyr || {}, d = {};
    d.heiti = f.nafn || ''; d.heimilisfang = f.heimilisfang || '';
    d.eigandi = f.nafn || ''; d.eigandi_kt = f.kennitala || ''; d.eigandi_gsm = f.simi || '';
    d.thjonusta = 'Slökkvitæki ehf.'; d.utgafa = '1'; d.dags = dagsIS(); d.teiknad_af = 'Slökkvitæki ehf.';
    d.reykraesing = 'Um glugga og hurðir (slökkvilið).';
    var tk = (g.taeki || []).filter(function (t) { return !t.status || /active|virk|lagi/i.test(t.status); });
    if (tk.length) {
      var hop = {};
      tk.forEach(function (t) { var k = (t.type || 'Tæki') + (t.size ? ' ' + t.size : ''); hop[k] = (hop[k] || 0) + 1; });
      var sidast = tk.map(function (t) { return t.last_insp; }).filter(Boolean).sort().pop();
      var naest = tk.map(function (t) { return t.next_insp; }).filter(Boolean).sort()[0];
      d.slokkvibunadur = Object.keys(hop).map(function (k) { return hop[k] + ' × ' + k; }).join(', ') + '.' +
        (sidast ? ' Yfirfarin af Slökkvitæki ehf. ' + dagsIS(sidast) + (naest ? ', næst í ' + MAN[new Date(naest).getMonth()] + ' ' + new Date(naest).getFullYear() : '') + '.' : '') +
        ' Hvert tæki merkt með skilti (F001).';
    }
    var s = g.skyrsla && g.skyrsla.data;
    if (s) {
      var b = {}; (s.bunadur || []).forEach(function (x) { b[x.label] = (x.iLagi || 0) + (x.ekki || 0); });
      var bitar = [];
      if (b['Reykskynjarar']) bitar.push(b['Reykskynjarar'] + ' reykskynjarar');
      if (b['Hitaskynjarar']) bitar.push(b['Hitaskynjarar'] + ' hitaskynjarar');
      if (b['Handboðar']) bitar.push(b['Handboðar'] + ' handboðar');
      if (b['Bjöllur / Sírenur']) bitar.push(b['Bjöllur / Sírenur'] + ' bjöllur/sírenur');
      var m = s.meta || {};
      d.brunavidvorun = 'Brunaviðvörunarkerfi' + (s.stod && s.stod.gerd ? ' (' + s.stod.gerd + ')' : '') + (bitar.length ? ': ' + bitar.join(', ') : '') + '.' +
        (m.dags ? ' Skoðað af Slökkvitæki ehf. ' + dagsIS(m.dags) + (m.nr ? ' (skýrsla ' + m.nr + ')' : '') + '.' : '');
      if (s.stod && s.stod.fjargaesla) d.vaktstod = s.stod.fjargaesla.trim();
    }
    d.hreyfihamladir = '- Við innritun eða komu er spurt hvort viðkomandi þurfi aðstoð við rýmingu og merkt við á gestalista.\n' +
      '- Þeim sem þurfa aðstoð er boðið rými á jarðhæð ef kostur er.\n' +
      '- Á efri hæðum bíður sá sem kemst ekki niður stiga í stigahúsi (sér brunahólf) eða í eigin rými með lokaða hurð, og 112 er strax látið vita hvar hann bíður.';
    d.umgengni = 'Reykingar og opinn eldur, svo sem kerti, eru bannaðar í öllu húsinu (723/2017, 13. gr.).';
    d.urbaetur = 'Skilti F001 yfir öll slökkvitæki ; Slökkvitæki ehf. ; ; \nViðbragðs- og rýmingaráætlun samþykkt og undirrituð ; Eigandi / rekstraraðili ; ; \nEldvarnafulltrúi tilnefndur ; Rekstraraðili ; ; \nFyrsta mánaðarlega skoðun og kynning fyrir starfsfólki ; Eldvarnafulltrúi ; ; \nRýmingaræfing ; Rekstraraðili ; ; ';
    return d;
  }

  // ── kaflar ──
  var KAFLAR = {
    ryming: [
      ['hus', '1. Húsið og brunavarnir þess',
        '| Heimilisfang | {{heimilisfang}} |\n| Notkun | {{notkun}}, notkunarflokkur {{notkunarflokkur}} (byggingarreglugerð 112/2012, tafla 9.01) |\n| Stærð og skipulag | {{staerd}} |\n| Hæðir og rými | {{haedir}} |\n| Brunahólfun | {{brunaholfun}} |\n| Brunaviðvörunarkerfi | {{brunavidvorun}} Tengt vaktstöð: {{vaktstod}}. |\n| Handslökkvibúnaður | {{slokkvibunadur}} |\n| Út- og neyðarlýsing | {{neydarlysing}} |\n| Flóttaleiðir | {{flottaleidir}} |\n| Reykræsing | {{reykraesing}} |\n|? Annar búnaður | {{annad}} |'],
      ['hlutverk', '2. Hlutverk og ábyrgð',
        '| Hver | Ábyrgð og verkefni |\n|---|---|\n| **Eigandi**<br>{{eigandi}} | Ber ábyrgð á að brunavarnir hússins séu virkar og reglulega yfirfarnar (723/2017, 3. gr.) og heldur þjónustusamningum um brunavarnakerfi hússins. |\n| **Rekstraraðili / umsjón**<br>{{rekstur}} | Framfylgir áætluninni, kynnir hana starfsfólki og þeim sem dvelja í húsinu, heldur flóttaleiðum greiðfærum og tilkynnir eiganda tafarlaust um galla á brunavörnum (723/2017, 4. og 13. gr.). |\n| **Eldvarnafulltrúi**<br>{{eldvarnafulltrui}} | Annast mánaðarlegt og árlegt eftirlit skv. gátlistum, varðveitir eldvarnamöppuna, skipuleggur æfingar og kynningu og er tengiliður við eldvarnaeftirlit slökkviliðs (723/2017, 11. gr.). |\n| **Starfsfólk á staðnum** | Þekkir áætlunina, flóttaleiðir, staðsetningu slökkvibúnaðar og stjórnstöðvar og bregst við skv. kafla 3. |\n| **Vaktstöð**<br>{{vaktstod}} | Tekur við brunaboði allan sólarhringinn og hringir í tengiliði skv. útkallslista. |\n| **Aðrir í húsinu** | Kynna sér flóttaleiðauppdráttinn og fara strax út þegar viðvörun heyrist. |\n\n> **Þegar ekkert starfsfólk er í húsinu:** {{starfsfolk_nott}}'],
      ['vidbrogd', '3. Viðbrögð starfsfólks þegar brunaviðvörun fer í gang',
        '1. Farðu að stjórnstöð brunaviðvörunarkerfisins og lestu hvaðan boðið kemur.\n2. Kannaðu staðinn ef það er óhætt. Opnaðu ekki hurð sem er heit eða þar sem reykur kemur undan.\n3. **Ef eldur eða reykur sést: hringdu strax í 112.** Segðu: „{{heiti}}, {{heimilisfang}}“, hvað brennur og hvar, og hvort fólk sé enn inni.\n4. Ef eldurinn er lítill og þú ert ekki í hættu, reyndu að slökkva með næsta slökkvitæki. Annars lokaðu hurðinni að rýminu og farðu.\n5. Hvettu alla til að fara út um næsta útgang. Bankaðu á dyr á leiðinni ef það er óhætt. Lyfta er ekki notuð.\n6. Aðstoðaðu þá sem þurfa hjálp (kafli 6).\n7. Taktu gesta- eða starfsmannalista og farðu á söfnunarsvæðið. Berðu fjöldann saman við listann.\n8. Taktu á móti slökkviliði við aðalinngang: hvar eldurinn er, hverra er saknað, lyklar og aðgangskort.\n9. Enginn fer aftur inn fyrr en slökkvilið leyfir. Ekki þagga niður í kerfinu eða endurræsa það nema slökkvilið leyfi.\n\n> **Falsboð:** þegar ljóst er að enginn eldur er, láttu vaktstöð vita strax og skráðu atvikið í dagbók brunaviðvörunarkerfisins (dags., tími, hvaða skynjari, ástæða). Ef sami skynjari gefur ítrekað boð er haft samband við þjónustuaðila.'],
      ['gestir', '4. Viðbrögð þeirra sem dvelja í húsinu',
        'Þessi texti er á flóttaleiðauppdrættinum, á íslensku og ensku.\n\n| Ef þú verður var/vör við eld | Ef brunaviðvörun heyrist | Ef reykur er á ganginum |\n|---|---|---|\n| Kallaðu „ELDUR!“ og láttu aðra vita.<br>Lokaðu hurðinni að rýminu sem brennur.<br>Farðu út um næsta útgang.<br>Hringdu í 112.<br>Farðu á söfnunarsvæðið. | Farðu strax út um næsta útgang.<br>Lokaðu hurðinni á eftir þér.<br>Notaðu ekki lyftuna.<br>Farðu á söfnunarsvæðið og bíddu þar. | Vertu í herberginu, sem er sér brunahólf.<br>Lokaðu hurðinni og þéttu rifur með blautum handklæðum.<br>Hringdu í 112 og gefðu upp herbergisnúmer.<br>Gefðu merki út um glugga. |'],
      ['flotti', '5. Flóttaleiðir og söfnunarsvæði',
        '[[haedalinur:flottaleidir_haedir]]\n| Lyfta | Ekki notuð í eldsvoða. Merkt með skilti við lyftudyr. |\n| Söfnunarsvæði | {{sofnunarsvaedi}}. Merkt með skilti (ISO 7010 E007) og á uppdrætti. |\n|? Skjól | {{skjol}} |\n| Aðkoma slökkviliðs | Aðkoma að aðalinngangi og bílastæði skal vera greiðfær. |'],
      ['hreyfi', '6. Hreyfihamlaðir og þeir sem þurfa aðstoð', '{{hreyfihamladir}}'],
      ['upplysingar', '7. Upplýsingar til þeirra sem dvelja í húsinu',
        '- Flóttaleiðauppdráttur á íslensku og ensku, þar sem stendur „Þú ert hér“.\n- Veggspjald um eldvarnir og þessi áætlun eru í eldvarnamöppunni.\n- Skilti við lyftu: „Notið ekki lyftu í eldsvoða / Do not use the lift in case of fire“.\n- Umgengnisreglur: {{umgengni}}'],
      ['aefingar', '8. Æfingar, þjálfun og kynning',
        '- Rýmingaræfing er haldin a.m.k. einu sinni á ári og skráð á skráningarblað (fylgiskjal). Fyrsta æfing: {{fyrsta_aefing}}.\n- Nýtt og tímabundið starfsfólk, þ.m.t. ræstingarfólk og verktakar, fær kynningu á áætluninni áður en það hefur störf (723/2017, 12. gr.).\n- Starfsfólk fær þjálfun í notkun handslökkvitækja a.m.k. á þriggja ára fresti.'],
      ['endursk', '9. Endurskoðun',
        'Eldvarnafulltrúi yfirfer áætlunina árlega (árlegur gátlisti, liður 6). Hún er einnig yfirfarin þegar breytingar verða á húsnæði, notkun, starfsfólki eða þjónustuaðilum.\n\n[[utgafusaga]]\n[[undirskriftir]]'],
    ],
    eftirlit: [
      ['inng', 'Inngangur',
        '> Þetta skjal lýsir eigin eldvarnaeftirliti {{heiti}}. Það fylgir tíu meginþáttum í leiðbeiningum Eldvarnabandalagsins um eigið eldvarnaeftirlit og byggir á reglugerð um eldvarnir og eldvarnaeftirlit nr. 723/2017 (3., 4., 10., 11., 12., 13. og 26. gr.). Grunnur: {{brunahonnun}}.'],
      ['stefna', '1. Eldvarnastefna og markmið',
        'Eigandi og rekstraraðili skuldbinda sig til að halda eldvörnum hússins virkum með reglubundnu eftirliti og viðhaldi, svo allir sem dvelja í húsinu komist örugglega út ef eldur kemur upp og tjón verði sem minnst. Stefnan er kynnt öllu starfsfólki. Allir starfsmenn bera ábyrgð á að tilkynna frávik sem þeir verða varir við.'],
      ['skipulag', '2. Skipulag eftirlitsins',
        'Eldvarnafulltrúi, {{eldvarnafulltrui}}, annast eftirlitið á vegum {{rekstur}}. {{thjonusta}} annast árlega yfirferð handslökkvibúnaðar og brunaviðvörunarkerfis. Eigandi og rekstraraðili gera með sér samning um eigið eldvarnaeftirlit á eyðublaði slökkviliðs.'],
      ['abyrgd', '3. Ábyrgð eiganda og rekstraraðila',
        '| Eigandi (723/2017, 3. gr.) | Rekstraraðili (723/2017, 4. gr.) |\n|---|---|\n| Brunavarnir í samræmi við notkun hússins.<br>Brunaviðvörunarkerfi, slökkvibúnaður og út- og neyðarlýsing til staðar, með gildum þjónustusamningum.<br>Viðhald kerfa og úrbætur á búnaði. | Starfshættir í samræmi við brunavarnir hússins.<br>Flóttaleiðir greiðfærar og auðrataðar.<br>Daglegt og mánaðarlegt eftirlit, þjálfun og æfingar.<br>Tilkynnir eiganda tafarlaust um skort eða bilun á eldvörnum. |'],
      ['ahaetta', '4. Áhættumat',
        '| Áhætta | Mótvægisaðgerðir |\n|---|---|\n| Fólk sefur eða þekkir ekki húsið | Sjálfvirkt brunaviðvörunarkerfi tengt vaktstöð. Flóttaleiðauppdrættir, útljós og neyðarlýsing. |\n| Matseld og eldunaraðstaða | Leiðbeiningar, hreinsun eldavéla og háfa, eldvarnateppi við eldunaraðstöðu. |\n| Rafmagnstæki og hleðsla | Ástand tækja skoðað reglulega; hleðsla rafhlaupahjóla og rafhjóla ekki í herbergjum eða flóttaleiðum. |\n| Reykingar og opinn eldur | Bannað í öllu húsinu; merkt og kynnt í umgengnisreglum (723/2017, 13. gr.). |\n| Rusl og brennanleg efni | Sorp í sorpgeymslu utandyra, aldrei í flóttaleiðum eða upp við útveggi (723/2017, 17. gr.). |\n| Tæknirými og rafmagnstafla | Ekki notað sem geymsla; slökkvitæki við hendina. |\n| Heit vinna verktaka | Logaleyfi áður en heit vinna hefst; slökkvitæki við hendina; brunaþéttingar lagðar aftur eftir lagnavinnu. |\n| Brunahurðir festar opnar | Bannað. Lokun og pumpur athugaðar mánaðarlega. |'],
      ['bunadur', '5. Búnaðarskrá og þjónustuaðilar',
        '| Kerfi | Lýsing | Þjónustuaðili |\n|---|---|---|\n| Brunaviðvörunarkerfi | {{brunavidvorun}} Tengt vaktstöð: {{vaktstod}}. | {{thjonusta}} |\n| Handslökkvibúnaður | {{slokkvibunadur}} | {{thjonusta}} |\n| Út- og neyðarlýsing | {{neydarlysing}} Árleg 60 mín. endingarprófun (ÍST EN 50172). | {{rafverktaki}} |\n| Brunahurðir | Hurðir í hólfamörkum, með pumpum. | Eldvarnafulltrúi (mánaðarlega) |\n| Merkingar | Skilti yfir slökkvibúnaði, flóttaleiðaskilti og útljós, skilti við lyftu, söfnunarsvæði. | {{thjonusta}} |\n|? Annað | {{annad}} | |'],
      ['fraedsla', '6. Fræðsla og þjálfun',
        '- Allt starfsfólk fær kynningu á eldvörnum hússins og viðbragðs- og rýmingaráætlun áður en það hefur störf (723/2017, 12. gr.).\n- Þjálfun í notkun handslökkvitækja a.m.k. á þriggja ára fresti.\n- Rýmingaræfing árlega, skráð á skráningarblað.'],
      ['ryming', '7. Viðbragðs- og rýmingaráætlun',
        'Sér skjal: *Viðbragðs- og rýmingaráætlun – {{heiti}}*, ásamt rýmingaruppdráttum og flóttaleiðauppdráttum á íslensku og ensku.'],
      ['fulltrui', '8. Eldvarnafulltrúi',
        '| Nafn | {{eldvarnafulltrui}} |\n| Sími / netfang | {{eldvarnafulltrui_simi}} · {{eldvarnafulltrui_netfang}} |\n|? Staðgengill | {{stadgengill}} |\n\nVerkefni (723/2017, 11. gr.):\n- Annast mánaðarlegt og árlegt eftirlit skv. gátlistum og sér um að frávik séu lagfærð.\n- Hefur skýrt umboð frá eiganda og rekstraraðila til nauðsynlegra úrbóta.\n- Sér um að starfsfólk fái kynningu og þjálfun og að æfingar séu haldnar.\n- Varðveitir eldvarnamöppuna.\n- Er tengiliður við eldvarnaeftirlit slökkviliðs og þjónustuaðila og er viðstaddur boðaðar skoðanir.'],
      ['gatlistar', '9. Eftirlit samkvæmt gátlistum',
        '| Tíðni | Hver | Hvað | Skráning |\n|---|---|---|---|\n| Daglega | Starfsfólk | Flóttaleiðir og útgangar greiðfærir. Útgangshurðir opnanlegar innan frá. Stjórnstöð sýnir „í lagi“. Brunahurðir lokaðar. | Frávik tilkynnt eldvarnafulltrúa |\n| Mánaðarlega | Eldvarnafulltrúi | Mánaðarlegur gátlisti (7 liðir) og stutt virkniprófun neyðarlýsingar | Undirritaður gátlisti í eldvarnamöppu |\n| Árlega | Eldvarnafulltrúi og þjónustuaðilar | Árlegur gátlisti (15 liðir). Yfirferð brunaviðvörunarkerfis og slökkvibúnaðar. 60 mín. prófun neyðarlýsingar. Rýmingaræfing. Endurskoðun viðbragðsáætlunar. | Gátlisti og skýrslur þjónustuaðila |\n| Eftir atvik | Eldvarnafulltrúi | Eftir eld, falsboð eða breytingar á húsnæði eða rekstri | Dagbók kerfis |'],
      ['urbaetur', '10. Eftirfylgni, úrbætur og skjalavarsla',
        '- Frávik eru skráð á gátlistann með frávikanúmeri, ábyrgðaraðila, áætlaðri dagsetningu lagfæringar og dagsetningu þegar lagfært er.\n- Galli á búnaði sem er á ábyrgð eiganda er tilkynntur eiganda tafarlaust.\n- **Eldvarnamappa** er geymd á staðnum og rafrænt, aðgengileg eldvarnaeftirliti slökkviliðs (723/2017, 10. gr.). Í henni eru: þetta skjal, viðbragðs- og rýmingaráætlun, samningur um eigið eftirlit, útfylltir gátlistar (geymdir a.m.k. í fjögur ár), skýrslur þjónustuaðila, dagbók brunaviðvörunarkerfis, skráning æfinga og þjálfunar, aðaluppdrættir og brunahönnun.\n\n### Úrbótalisti\n[[tafla:urbaetur:Atriði|Ábyrgð|Áætlað|Staða]]\n[[undirskriftir]]'],
    ],
    gestur: [
      ['skref', 'Leiðbeiningar á flóttaáætlun (íslenska | enska)',
        '| 1. LÁTA VITA | Kallaðu „ELDUR!“ og láttu aðra vita. | 1. ALERT | Shout “FIRE!” and alert others. |\n| 2. HRINGJA Í 112 | Segðu: {{heiti}}, {{heimilisfang}}. | 2. CALL 112 | Say: {{heiti}}, {{heimilisfang}}. |\n| 3. RÝMA | Fylgdu grænu örvunum að næsta útgangi. Lokaðu hurðum. Ekki lyftu. | 3. EVACUATE | Follow the green arrows to the nearest exit. Close doors. No lift. |\n| 4. SÖFNUNARSVÆÐI | Bíddu á söfnunarsvæðinu þar til allir eru taldir. | 4. ASSEMBLY POINT | Wait at the assembly point until everyone is accounted for. |\n| REYKUR Á GANGI? | Vertu í herberginu, lokaðu hurð, þéttu rifur, hringdu í 112. | SMOKE IN CORRIDOR? | Stay in your room, close the door, seal gaps, call 112. |'],
    ],
  };
  var SKJOL = { ryming: 'Viðbragðs- og rýmingaráætlun', eftirlit: 'Eigið eldvarnaeftirlit', gestur: 'Flóttaáætlun' };

  // ── reitir → texti ──
  var VANTAR = '\u0001V:', VEND = '\u0002';
  function gildi(st, k) { var v = st.efni.reitir && st.efni.reitir[k]; if (v == null) v = st.sjalf[k]; return v == null ? '' : String(v).trim(); }
  // Reitur einn á línu heldur línuskilum sínum (getur verið listi); inni í línu verða línuskil að <br>
  function fylla(st, txt) {
    return String(txt || '').split(/\r?\n/).map(function (lina) {
      var einn = /^\s*\{\{\w+\}\}\s*$/.test(lina);
      return lina.replace(/\{\{(\w+)\}\}/g, function (_, k) { var v = gildi(st, k); return v ? (einn ? v : v.replace(/\r?\n/g, '\u0003')) : VANTAR + k + VEND; });
    }).join('\n');
  }
  function kaflar(st, skjal) {
    var yfir = (st.efni.textar && st.efni.textar[skjal]) || {};
    var ut = KAFLAR[skjal].map(function (k) { var y = yfir[k[0]] || {}; return { id: k[0], titill: y.titill != null ? y.titill : k[1], texti: y.texti != null ? y.texti : k[2], breytt: !!(y.titill != null || y.texti != null), sjalf: { titill: k[1], texti: k[2] } }; });
    ((st.efni.aukakaflar && st.efni.aukakaflar[skjal]) || []).forEach(function (a) { ut.push({ id: a.id, titill: a.titill || '', texti: a.texti || '', auka: true }); });
    return ut;
  }

  // ── létt markdown → HTML ──
  function inline(s) {
    s = esc(s).replace(/&lt;br&gt;/g, '<br>').replace(/\u0003/g, '<br>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+?)\*/g, '$1<i>$2</i>');
    return s.replace(/\u0001V:(\w+)\u0002/g, function (_, k) { return '<span class="f">' + esc(MERKI[k] || k) + '</span>'; });
  }
  function md(st, txt) {
    var lines = fylla(st, txt).split(/\r?\n/), o = [], i = 0;
    while (i < lines.length) {
      var l = lines[i];
      if (!l.trim()) { i++; continue; }
      var sp = l.match(/^\[\[(\w+)(?::([^\]]*))?\]\]\s*$/);
      if (sp) { o.push(serstakt(st, sp[1], sp[2] || '')); i++; continue; }
      if (/^###\s/.test(l)) { o.push('<h3>' + inline(l.replace(/^###\s+/, '')) + '</h3>'); i++; continue; }
      if (/^\|/.test(l)) {
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        o.push(tafla(rows)); continue;
      }
      if (/^- /.test(l)) { var li = []; while (i < lines.length && /^- /.test(lines[i])) { li.push('<li>' + inline(lines[i].slice(2)) + '</li>'); i++; } o.push('<ul>' + li.join('') + '</ul>'); continue; }
      if (/^\d+\.\s/.test(l)) { var ol = []; while (i < lines.length && /^\d+\.\s/.test(lines[i])) { ol.push('<li>' + inline(lines[i].replace(/^\d+\.\s+/, '')) + '</li>'); i++; } o.push('<ol>' + ol.join('') + '</ol>'); continue; }
      if (/^>\s?/.test(l)) { var bx = []; while (i < lines.length && /^>\s?/.test(lines[i])) { bx.push(inline(lines[i].replace(/^>\s?/, ''))); i++; } o.push('<div class="box">' + bx.join('<br>') + '</div>'); continue; }
      var p = []; while (i < lines.length && lines[i].trim() && !/^(\||- |\d+\.\s|>|###|\[\[)/.test(lines[i])) { p.push(inline(lines[i])); i++; }
      o.push('<p>' + p.join('<br>') + '</p>');
    }
    return o.join('');
  }
  function tafla(rows) {
    var haus = null, body = [];
    rows.forEach(function (r, ix) {
      if (/^\|\s*-{3}/.test(r)) { if (body.length) haus = body.pop(); return; }
      var valfrj = /^\|\?/.test(r);
      var cells = r.replace(/^\|\??\s?/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); });
      if (valfrj && cells.slice(1).every(function (c) { return !c || /^(\u0001V:\w+\u0002\s*)+$/.test(c); })) return;
      body.push(cells);
    });
    var kd = !haus && body.length && body.every(function (c) { return c.length === 2; });
    var h = '<table>';
    if (haus) h += '<tr>' + haus.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr>';
    body.forEach(function (c) { h += '<tr>' + c.map(function (x, j) { return '<td' + (kd && j === 0 ? ' class="k"' : '') + '>' + inline(x) + '</td>'; }).join('') + '</tr>'; });
    return h + '</table>';
  }
  function serstakt(st, nafn, arg) {
    if (nafn === 'haedalinur') {
      var v = gildi(st, arg);
      if (!v) return '<table><tr><td class="k">Flóttaleiðir</td><td>' + inline(VANTAR + arg + VEND) + '</td></tr></table>';
      return '<table>' + v.split(/\r?\n/).filter(function (x) { return x.trim(); }).map(function (x) { var m = x.match(/^([^:]+):\s*(.*)$/); return '<tr><td class="k">' + inline(m ? m[1] : '') + '</td><td>' + inline(m ? m[2] : x) + '</td></tr>'; }).join('') + '</table>';
    }
    if (nafn === 'tafla') {
      var a = arg.split(':'), k = a[0], dalkar = (a[1] || '').split('|'), vv = gildi(st, k);
      var linur = vv.split(/\r?\n/).filter(function (x) { return x.trim(); });
      var h = '<table><tr><th style="width:5%">Nr.</th>' + dalkar.map(function (d) { return '<th>' + esc(d) + '</th>'; }).join('') + '</tr>';
      linur.forEach(function (x, i) { var c = x.split(';'); h += '<tr><td>' + (i + 1) + '</td>' + dalkar.map(function (_, j) { var t = (c[j] || '').trim(); return '<td>' + (t ? inline(t) : (j > 1 ? '<span class="f">&nbsp;&nbsp;&nbsp;&nbsp;</span>' : '')) + '</td>'; }).join('') + '</tr>'; });
      return h + '</table>';
    }
    if (nafn === 'utgafusaga') return '<table><tr><th>Útgáfa</th><th>Dags.</th><th>Breyting</th><th>Samþykkt</th></tr><tr><td>' + inline(fylla(st, '{{utgafa}}')) + '</td><td>' + inline(fylla(st, '{{dags}}')) + '</td><td>Fyrsta útgáfa</td><td></td></tr><tr><td>&nbsp;</td><td></td><td></td><td></td></tr></table>';
    if (nafn === 'undirskriftir') return '<div class="sig"><div>Eigandi – dags. og undirskrift</div><div>Rekstraraðili – dags. og undirskrift</div><div>Eldvarnafulltrúi – dags. og undirskrift</div></div>';
    return '';
  }

  // ── prentskjölin ──
  var CSS = '@page{size:A4;margin:15mm 15mm 18mm 15mm}@page lard{size:A4 landscape;margin:9mm 10mm 12mm 10mm}' +
    '*{box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;font-size:9.6pt;color:#1d232b;line-height:1.42;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'h1{font-size:21pt;margin:0 0 2pt;color:#1b2a41}h2{font-size:12.2pt;color:#1b2a41;margin:15pt 0 5pt;padding-bottom:3pt;border-bottom:1.6pt solid #c8102e;break-after:avoid}' +
    'h3{font-size:10.4pt;margin:9pt 0 3pt;color:#1b2a41;break-after:avoid}p{margin:0 0 6pt}.undir{font-size:11.5pt;color:#4a5563;margin-bottom:10pt}' +
    '.merki{display:inline-block;background:#c8102e;color:#fff;font-weight:700;font-size:8pt;padding:2pt 7pt;border-radius:3pt;letter-spacing:.6pt}' +
    '.f{background:#fff2a8;border-bottom:1px dashed #b38f00;padding:0 3pt;border-radius:2pt}' +
    'table{width:100%;border-collapse:collapse;margin:4pt 0 8pt}th,td{border:.6pt solid #c9d0d8;padding:3.5pt 5pt;vertical-align:top;text-align:left}th{background:#eef2f6;font-weight:600;color:#1b2a41}tr{break-inside:avoid}' +
    'td.k{width:30%;font-weight:600;background:#f8fafc}ol,ul{margin:2pt 0 7pt 15pt;padding:0}li{margin:0 0 2.5pt}' +
    '.box{border:1pt solid #c9d0d8;border-radius:5pt;padding:7pt 10pt;margin:7pt 0;break-inside:avoid}' +
    '.neyd{display:flex;gap:10pt;align-items:stretch;margin:10pt 0}.neyd .s112{background:#c8102e;color:#fff;border-radius:6pt;padding:8pt 14pt;text-align:center;min-width:120pt}.neyd .s112 b{display:block;font-size:30pt;line-height:1}.neyd table{margin:0}' +
    '.heim{font-size:8.3pt;color:#4a5563}.sig{display:flex;gap:18pt;margin-top:26pt}.sig div{flex:1;border-top:.8pt solid #333;padding-top:3pt;font-size:8.5pt}' +
    '.lard{page:lard}.lard+.lard{break-before:page}.uppdr{display:flex;gap:8pt;height:170mm}.uppdr .mynd{flex:1;border:.8pt solid #c9d0d8;overflow:hidden}' +
    '.skyr{width:62mm;font-size:8.4pt}.skyr h3{margin-top:0}.tak{display:flex;align-items:center;gap:6pt;margin:3.5pt 0}' +
    '.titill{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4pt}.titill h1{font-size:15pt}' +
    '.fot{position:fixed;bottom:-11mm;left:0;right:0;font-size:7.5pt;color:#6b7684;display:flex;justify-content:space-between}' +
    '.brot{break-before:page}@media screen{body{background:#7d848e;padding:14px}.sida{background:#fff;max-width:210mm;margin:0 auto 14px;padding:15mm;box-shadow:0 4px 18px rgba(0,0,0,.35)}.fot{display:none}}';

  function uppl(st) {
    return '<table><tr><td class="k">Heimilisfang</td><td>' + inline(fylla(st, '{{heimilisfang}}')) + '</td></tr>' +
      '<tr><td class="k">Notkun</td><td>' + inline(fylla(st, '{{notkun}}, notkunarflokkur {{notkunarflokkur}}')) + '</td></tr>' +
      '<tr><td class="k">Eigandi</td><td>' + inline(fylla(st, '{{eigandi}}, kt. {{eigandi_kt}}')) + '</td></tr>' +
      '<tr><td class="k">Rekstraraðili / umsjón</td><td>' + inline(fylla(st, '{{rekstur}}')) + '</td></tr>' +
      '<tr><td class="k">Eldvarnafulltrúi</td><td>' + inline(fylla(st, '{{eldvarnafulltrui}}')) + '</td></tr>' +
      (gildi(st, 'shs_mal') ? '<tr><td class="k">Mál hjá slökkviliði</td><td>' + inline(gildi(st, 'shs_mal')) + '</td></tr>' : '') +
      '<tr><td class="k">Útgáfa</td><td>' + inline(fylla(st, '{{utgafa}} · {{dags}}')) + '</td></tr></table>';
  }
  function neyd(st) {
    return '<div class="neyd"><div class="s112"><b>112</b>Neyðarlínan<br>slökkvilið · lögregla · sjúkrabíll</div><table>' +
      '<tr><td class="k">Eldvarnafulltrúi</td><td>' + inline(fylla(st, '{{eldvarnafulltrui}} · {{eldvarnafulltrui_simi}}')) + '</td></tr>' +
      '<tr><td class="k">Vakt / umsjón</td><td>' + inline(fylla(st, '{{vakt_simi}}')) + '</td></tr>' +
      '<tr><td class="k">Vaktstöð brunaviðvörunarkerfis</td><td>' + inline(fylla(st, '{{vaktstod}}')) + '</td></tr>' +
      '<tr><td class="k">Þjónusta brunavarna</td><td>' + inline(fylla(st, '{{thjonusta}} · {{thjonusta_simi}}')) + '</td></tr></table></div>';
  }
  function haus(st, titill, uppkast) {
    return '<!doctype html><html lang="is"><head><meta charset="utf-8"><title>' + esc(titill + ' – ' + gildi(st, 'heiti')) + '</title><style>' + CSS + '</style></head><body>' +
      '<div class="fot"><span>' + esc(gildi(st, 'heiti')) + ' · ' + esc(titill) + ' · útgáfa ' + esc(gildi(st, 'utgafa')) + ', ' + esc(gildi(st, 'dags')) + '</span><span>' + esc(gildi(st, 'teiknad_af')) + '</span></div>' +
      (uppkast ? '<span class="merki">UPPKAST – TIL YFIRFERÐAR</span>' : '');
  }
  function kaflaHtml(st, skjal) {
    return kaflar(st, skjal).map(function (k) { return '<h2>' + inline(fylla(st, k.titill)) + '</h2>' + md(st, k.texti); }).join('');
  }

  // Táknskýring hæðar: aðeins tegundir sem eru á hæðinni
  function skyringar(merki, ham) {
    var til = {}; (merki || []).forEach(function (m) { til[m.t] = 1; });
    return T.ROD.filter(function (t) { return til[t] && t !== 'herb' && t !== 'texti' && (ham !== 'gestur' || T.TEG[t].gestur); })
      .map(function (t) { return '<div class="tak"><span style="width:40pt;display:flex;justify-content:center">' + T.tak(t, t === 'leid' || t === 'ut' ? 16 : 19) + '</span><span>' + esc(T.TEG[t].heiti) + (ham === 'gestur' ? '<br><span style="color:#6b7684">' + esc(T.TEG[t].en) + '</span>' : '') + '</span></div>'; }).join('');
  }

  function skjalRyming(st, uppkast) {
    var h = haus(st, 'Viðbragðs- og rýmingaráætlun', uppkast) +
      '<h1 style="margin-top:8pt">Viðbragðs- og rýmingaráætlun</h1><div class="undir">' + inline(fylla(st, '{{heiti}}, {{heimilisfang}}')) + '</div>' + uppl(st) + neyd(st) +
      '<p class="heim">Áætlunin byggir á ' + inline(fylla(st, '{{brunahonnun}}')) + ', reglugerð um eldvarnir og eldvarnaeftirlit nr. 723/2017 (einkum 5., 12. og 13. gr.) og leiðbeiningum Eldvarnabandalagsins um eigið eldvarnaeftirlit (kafli 7).</p>' +
      kaflaHtml(st, 'ryming');
    st.haedir.forEach(function (hd, i) {
      var e = st.haedarEfni(hd.id);
      if (!st.myndir[hd.id] && !e.merki.length) return;
      h += '<section class="lard"><div class="titill"><h1>Rýmingaruppdráttur ' + (i + 1) + ' – ' + esc(hd.nafn) + '</h1>' + (uppkast ? '<span class="merki">UPPKAST</span>' : '') + '</div>' +
        '<div class="uppdr"><div class="mynd">' + T.uppdrattur(st.rammi(hd.id), st.myndir[hd.id], e.merki, { ham: 'starf' }) + '</div>' +
        '<div class="skyr"><h3>Skýringar</h3>' + skyringar(e.merki, 'starf') +
        '<p class="heim" style="margin-top:8pt">Grunnur: ' + inline(fylla(st, '{{brunahonnun}}')) + '. Unnið af ' + esc(gildi(st, 'teiknad_af')) + ', ' + esc(gildi(st, 'dags')) + '.</p>' +
        '<p class="heim">Lyfta er ekki notuð í eldsvoða. Flóttaleiðir skulu ávallt vera greiðfærar (723/2017, 5. gr.).</p></div></div></section>';
    });
    h += '<section class="brot"><h1 style="font-size:15pt">Skráningarblað rýmingaræfingar</h1><p>' + inline(fylla(st, '{{heiti}}')) + ' · Æfa á viðbragðs- og rýmingaráætlun árlega (723/2017, 12. gr.).</p>' +
      '<table><tr><th style="width:15%">Dags. / tími</th><th style="width:17%">Tegund æfingar</th><th style="width:11%">Fjöldi</th><th style="width:13%">Tími rýmingar</th><th>Hvað gekk vel / hvað þarf að laga</th><th style="width:16%">Ábyrgur</th></tr>' +
      new Array(9).join('<tr><td style="height:34pt"></td><td></td><td></td><td></td><td></td><td></td></tr>') + '</table>' +
      '<h3>Kynning fyrir nýju starfsfólki</h3><table><tr><th style="width:30%">Nafn</th><th style="width:18%">Dags.</th><th>Atriði kynnt</th><th style="width:20%">Undirskrift</th></tr>' +
      new Array(9).join('<tr><td style="height:22pt"></td><td></td><td></td><td></td></tr>') + '</table></section>';
    return h + '</body></html>';
  }

  function skjalEftirlit(st, uppkast) {
    return haus(st, 'Eigið eldvarnaeftirlit', uppkast) +
      '<h1 style="margin-top:8pt">Eigið eldvarnaeftirlit</h1><div class="undir">Skrifleg lýsing og handbók um eldvarnir · ' + inline(fylla(st, '{{heiti}}')) + '</div>' + uppl(st) +
      kaflaHtml(st, 'eftirlit') +
      '<section class="brot"><h1 style="font-size:15pt">Dagbók brunaviðvörunarkerfis og atvikaskrá</h1><p>Skrá skal öll brunaboð, falsboð, bilanir, prófanir og viðhald.</p>' +
      '<table><tr><th style="width:13%">Dags. / tími</th><th style="width:16%">Tegund</th><th style="width:17%">Skynjari / svæði</th><th>Ástæða og viðbrögð</th><th style="width:15%">Skráð af</th></tr>' +
      new Array(17).join('<tr><td style="height:26pt"></td><td></td><td></td><td></td><td></td></tr>') + '</table></section></body></html>';
  }

  // Flóttaáætlun gesta: ein síða á hverja hæð, eða ein á hvert herbergi sem er merkt á hæðina
  function skjalGestir(st, uppkast, adeins) {
    var skref = [];
    var tx = fylla(st, kaflar(st, 'gestur')[0].texti).split(/\r?\n/).filter(function (l) { return /^\|/.test(l) && !/^\|\s*-{3}/.test(l); });
    tx.forEach(function (l) { skref.push(l.replace(/^\|\s?/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); })); });
    var sidur = [];
    st.haedir.forEach(function (hd, i) {
      var e = st.haedarEfni(hd.id);
      if (adeins && adeins !== hd.id) return;
      if (!st.myndir[hd.id] && !e.merki.length) return;
      var herb = e.merki.filter(function (m) { return m.t === 'herb'; });
      if (herb.length) herb.forEach(function (m) { sidur.push([hd, i, e, m]); }); else sidur.push([hd, i, e, null]);
    });
    var e007hd = null, e007m = null;
    st.haedir.forEach(function (hd) { if (!e007hd) { var m = st.haedarEfni(hd.id).merki.filter(function (x) { return x.t === 'e007'; }); if (m.length) { e007hd = hd; e007m = m; } } });
    var h = '<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Flóttaáætlun – ' + esc(gildi(st, 'heiti')) + '</title><style>' + CSS +
      '@page{margin:10mm 11mm 9mm 11mm}@media screen{.gsida{background:#fff;width:188mm;height:277mm;margin:0 auto 14px;padding:0;box-shadow:0 4px 18px rgba(0,0,0,.35)}}</style></head><body>';
    sidur.forEach(function (s, ix) {
      var hd = s[0], e = s[2], m = s[3];
      var nafn = esc(hd.nafn).toUpperCase(), en = (hd.nafn.match(/^(\d+)\./) ? ({ 1: '1ST', 2: '2ND', 3: '3RD' }[hd.nafn.match(/^(\d+)/)[1]] || hd.nafn.match(/^(\d+)/)[1] + 'TH') + ' FLOOR' : '');
      if (/kjall/i.test(hd.nafn)) en = 'BASEMENT';
      h += '<section class="gsida" style="' + (ix ? 'break-before:page;' : '') + 'height:271mm;display:flex;flex-direction:column">' +
        '<div style="display:flex;align-items:stretch;gap:6pt;margin-bottom:5pt"><div style="flex:1;background:#138a36;color:#fff;border-radius:4pt;padding:5pt 10pt;display:flex;justify-content:space-between;align-items:center">' +
        '<div><div style="font-size:21pt;font-weight:800;letter-spacing:.5pt;line-height:1;white-space:nowrap">FLÓTTAÁÆTLUN <span style="font-weight:400;font-size:12pt;opacity:.85;letter-spacing:0">· ESCAPE PLAN</span></div>' +
        '<div style="font-size:10pt;opacity:.9;margin-top:2pt">' + inline(fylla(st, '{{heiti}}')) + (m ? ' · Herbergi / Room ' + esc(m.nr || '') : '') + '</div></div>' +
        '<div style="font-size:19pt;font-weight:800;text-align:right;line-height:1.05;white-space:nowrap">' + nafn + (en ? '<div style="font-size:9pt;font-weight:600;opacity:.85">' + en + '</div>' : '') + '</div></div>' +
        '<div style="background:#c8102e;color:#fff;border-radius:4pt;padding:4pt 12pt;text-align:center;display:flex;flex-direction:column;justify-content:center"><div style="font-size:25pt;font-weight:800;line-height:1">112</div><div style="font-size:7.5pt">Neyðarnúmer<br>Emergency</div></div></div>' +
        '<div style="flex:1;min-height:0;border:.8pt solid #c9d0d8;position:relative">' + (uppkast ? '<span class="merki" style="position:absolute;left:4pt;top:4pt">UPPKAST</span>' : '') + T.uppdrattur(st.rammi(hd.id), st.myndir[hd.id], e.merki, { ham: 'gestur', terHerb: m }) + '</div>' +
        '<div style="display:grid;grid-template-columns:52mm 1fr 44mm;gap:6pt;margin-top:5pt;font-size:7.9pt;line-height:1.25">' +
        '<div style="border:.8pt solid #1d232b"><div style="background:#1d232b;color:#fff;font-weight:700;padding:2pt 5pt;font-size:8pt">SKÝRINGAR · LEGEND</div>' + skyringarGestur(e.merki, m) + '</div>' +
        '<div><table style="margin:0;font-size:7.9pt"><tr><th style="background:#c8102e;color:#fff;border-color:#c8102e">EF ELDUR KEMUR UPP</th><th style="background:#c8102e;color:#fff;border-color:#c8102e">IN CASE OF FIRE</th></tr>' +
        skref.map(function (r) { return '<tr><td style="padding:2.5pt 4pt"><b style="color:#c8102e">' + inline(r[0] || '') + '</b><br>' + inline(r[1] || '') + '</td><td style="padding:2.5pt 4pt"><b style="color:#c8102e">' + inline(r[2] || '') + '</b><br>' + inline(r[3] || '') + '</td></tr>'; }).join('') + '</table></div>' +
        '<div style="display:flex;flex-direction:column;gap:4pt">' +
        (e007hd ? '<div style="border:.8pt solid #1d232b"><div style="background:#1d232b;color:#fff;font-weight:700;padding:2pt 5pt;font-size:8pt">YFIRLITSMYND</div><div style="height:30mm">' +
          T.uppdrattur(st.rammi(e007hd.id), st.myndir[e007hd.id], e007m.map(function (x) { return Object.assign({}, x, { litid: 1 }); }), { ham: 'gestur' }) + '</div></div>' : '') +
        '<table style="margin:0;font-size:7pt"><tr><td style="width:40%;padding:1.5pt 3pt">Teiknað af</td><td style="padding:1.5pt 3pt">' + inline(fylla(st, '{{teiknad_af}}')) + '</td></tr>' +
        '<tr><td style="padding:1.5pt 3pt">Dags.</td><td style="padding:1.5pt 3pt">' + inline(fylla(st, '{{dags}}')) + '</td></tr>' +
        '<tr><td style="padding:1.5pt 3pt">Rýni</td><td style="padding:1.5pt 3pt">' + inline(fylla(st, '{{ryni}}')) + '</td></tr>' +
        '<tr><td style="padding:1.5pt 3pt">Útgáfa</td><td style="padding:1.5pt 3pt">' + inline(fylla(st, '{{utgafa}}')) + '</td></tr>' +
        '<tr><td style="padding:1.5pt 3pt">Grunnur</td><td style="padding:1.5pt 3pt">' + inline(fylla(st, '{{brunahonnun}}')) + '</td></tr></table></div></div></section>';
    });
    if (!sidur.length) h += '<p style="padding:20mm">Engin hæð er með teikningu eða merkingum enn.</p>';
    return h + '</body></html>';
  }
  function skyringarGestur(merki, herb) {
    var til = {}; (merki || []).forEach(function (m) { til[m.t] = 1; });
    if (herb) til.ter = 1;
    return T.ROD.filter(function (t) { return til[t] && T.TEG[t].gestur && t !== 'texti'; }).map(function (t) {
      return '<div style="display:flex;align-items:center;gap:5pt;padding:2.2pt 5pt;border-top:.5pt solid #e1e5ea"><span style="width:44pt;display:flex;justify-content:center">' + T.tak(t, t === 'leid' || t === 'ut' ? 18 : 20) + '</span><span><b>' + esc(T.TEG[t].heiti) + '</b><br><span style="color:#6b7684">' + esc(T.TEG[t].en) + '</span></span></div>';
    }).join('');
  }

  // Reitir sem vantar gildi og eru notaðir í skjölunum
  function vantar(st) {
    var allt = [];
    Object.keys(KAFLAR).forEach(function (s) { kaflar(st, s).forEach(function (k) { allt.push(k.titill, k.texti); }); });
    allt.push('{{heiti}}{{heimilisfang}}{{notkun}}{{notkunarflokkur}}{{eigandi}}{{eigandi_kt}}{{rekstur}}{{eldvarnafulltrui}}{{eldvarnafulltrui_simi}}{{vakt_simi}}{{vaktstod}}{{thjonusta}}{{thjonusta_simi}}{{brunahonnun}}{{utgafa}}{{dags}}{{teiknad_af}}{{ryni}}{{flottaleidir_haedir}}{{urbaetur}}');
    var s = {}, ut = [];
    allt.join('\n').replace(/\{\{(\w+)\}\}/g, function (_, k) { if (!s[k]) { s[k] = 1; if (!gildi(st, k) && !/^(annad|skjol|stadgengill)$/.test(k)) ut.push(k); } });
    return ut;
  }

  window.BaSnid = { REITIR: REITIR, MERKI: MERKI, KAFLAR: KAFLAR, SKJOL: SKJOL, sjalfgefid: sjalfgefid, gildi: gildi, fylla: fylla, md: md, kaflar: kaflar,
    skjalRyming: skjalRyming, skjalEftirlit: skjalEftirlit, skjalGestir: skjalGestir, vantar: vantar, dagsIS: dagsIS, CSS: CSS };
})();
