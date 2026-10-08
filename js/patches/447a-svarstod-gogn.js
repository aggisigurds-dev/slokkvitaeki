/* === SVAR-STÖÐ — GÖGNIN (447a) — 08.10.2026 ==================================
 * Kortið sem Svar-stöð (447) teiknar. Safnað 08.10.2026 með yfirferð á kóða beggja repóa (slokkvitaeki +
 * brunaholf), Söru-skillinu (references/husmal.md, verd.md), agentunum (sara-coworker, sala-reikningar,
 * rukkari, eldklar-postur, bokari), REIKNINGALOTA.md, STADREYNDIR.md og Charlize-minninu (v_charlize_active).
 * Skrá:lína vísanir eru frá 08.10.2026 — kóðinn hreyfist, svo leitaðu að fallinu ef línan hefur færst.
 * Hlaðin á undan 447 (window.__SVARSTOD_DATA).
 * ========================================================================== */
(() => {
  const D = window.__SVARSTOD_DATA = window.__SVARSTOD_DATA || {};

  /* ── ÚTTEKTARLÝSING ──────────────────────────────────────────────────────── */
  D.uttekt = {
    inngangur: 'Úttektarlýsingin er textinn „Upplýsingar um úttekt" sem prentast undir „Annað:" á úttektarskýrslunni. ' +
      'Hann verður til sjálfkrafa þegar ýtt er á „Staðfesta lista" eða „Búa til texta" á heimsókn, og les SAMA tækjaval og reikningurinn — ' +
      'svo skýrsla og reikningur geta ekki sagt sitt hvað. Húsmálið er talið úr 27 kláruðum skýrslum (Sara).',
    hlutar: [
      {
        heiti: 'Röð setninganna', plata: '6 skref',
        texti: 'Kóðinn raðar alltaf eins. Hver setning kemur aðeins ef hún á við.',
        daemi: [{ heiti: 'Sniðið', t:
          '1. Öll slökkvitæki yfirfarin og vottuð í lagi{ nema eitt sem var dæmt ónýtt}.\n' +
          '   (allt hlaðið: „Öll slökkvitæki yfirfarin, endurhlaðin og vottuð í lagi.")\n' +
          '2. {Fjögur} slökkvitæki endurhlaðin og vottuð í lagi.\n' +
          '3. {Einu nýju slökkvitæki} bætt við.  /  {3} nýjum slökkvitækjum bætt við.\n' +
          '4. Reykskynjarar hljóðprófaðir og skipt um rafhlöður.\n' +
          '5. Skipt um stút á {einni brunaslöngu}.        ← sér lína\n' +
          '6. Brunaslöngur prófaðar á fullum þrýstingi.   ← alltaf síðast' }],
        skrar: ['js/patches/294-uttektartexti.js:143-197 (smida)']
      },
      {
        heiti: 'Dæmi eins og það kemur út', plata: 'Sjálfvirkt',
        daemi: [
          { heiti: '12 tæki, 2 hlaðin, 1 ónýtt, 4 slöngur', t: 'Öll slökkvitæki yfirfarin og vottuð í lagi nema eitt sem var dæmt ónýtt. Tvö slökkvitæki endurhlaðin og vottuð í lagi.\nBrunaslöngur prófaðar á fullum þrýstingi.' },
          { heiti: 'Húsfélag, nýtt tæki, reykskynjarar', t: 'Öll slökkvitæki yfirfarin og vottuð í lagi. Einu nýju slökkvitæki bætt við. Reykskynjarar hljóðprófaðir og skipt um rafhlöður.' }
        ]
      },
      {
        heiti: 'Húsmálið — rétt og rangt', plata: 'Sara',
        listi: [
          '„Öll slökkvitæki yfirfarin" — aldrei „Öll tæki".',
          '„endurhlaðin" (má bæta við „skipt um innihald") — aldrei „fékk hleðslu og fulla áfyllingu".',
          '„stútur / úðastútur" — aldrei „haus".',
          '„rafhlöður" — aldrei „batterí".',
          'Ónýtt skeytist inn í grunnsetninguna, fær aldrei sér setningu.',
          'Afbrigði grunnsetningar: „… í sameign" (húsfélag), „… í öllum stigagöngum" (fjölbýli), „… yfirfarin á staðnum" (ekkert fór á verkstæði).',
          'Íbúðarnúmer þegar blaðið gefur þau: „úr íbúðum 104, 302 …".',
          'Kyn: brunaslanga er kvenkyns (eina/tvær/þrjár), tæki hvorugkyns (eitt/tvö/þrjú).'
        ],
        skrar: ['.claude/skills/sara/references/husmal.md:36-134', '.claude/skills/sara/SKILL.md:121-144']
      },
      {
        heiti: 'Brunaslöngur eru aldrei vottaðar sjálfkrafa', plata: 'Handvirkt',
        texti: 'Kóðinn skrifar aðeins að slöngurnar hafi verið PRÓFAÐAR. Niðurstöðuna — „og vottaðar í lagi" EÐA athugasemd um leka — skrifar maður sjálfur. Ástæðan er Blikkhellu-gildran: ein slanga lak, en sjálfvirki textinn hefði vottað hana.',
        daemi: [{ heiti: 'Maður bætir við', t: 'Brunaslöngur prófaðar á fullum þrýstingi {og vottaðar í lagi}.' }],
        skrar: ['js/patches/294-uttektartexti.js:185-196']
      },
      {
        heiti: '„Annað" og „Athugasemdir" eru ekki það sama', plata: 'Skýrsla',
        listi: [
          '„Annað" = það sem var GERT. Má lýsa staðnum („Slökkvitæki í 51 herbergi …").',
          '„Athugasemdir" = það sem KÚNNINN þarf að bregðast við („Brunaslanga … lekur vatni og þarfnast lagfæringar."). Gallar fara hingað.',
          'Tómt gildi Athugasemda er „Engar athugasemdir".',
          'Undir prentast „Fyrir hönd Slökkvitæki ehf" og nafn skoðunaraðila.'
        ],
        skrar: ['js/patches/168-company-inspection-report.js:177-193, 259 (PDF-útprentun)', '.claude/skills/sara/references/husmal.md:116-134']
      },
      {
        heiti: 'Hvenær textinn verður til — og hvenær ekki', plata: 'Gildra',
        listi: [
          'Textinn skrifast ALDREI yfir reit sem þegar hefur texta. Til að fá nýjan: tæma reitinn fyrst.',
          'Hann uppfærist ekki sjálfur þegar stöðu tækis er breytt eftir á.',
          'Ekki nota „Búa til úttektarskýrslu" né „Merkja skoðun" á borðmáli — þeir skrifa yfir skoðunardagsetningar (Charlize #486, #491).',
          'Orðalaginu er aldrei breytt án þess að Agnar eða Elías staðfesti (sara-coworker).'
        ],
        skrar: ['js/patches/294-uttektartexti.js:36-37', '.claude/skills/sara/references/gildrur.md:84-91']
      },
      {
        heiti: 'Þín regla um úttektarlýsinguna', plata: 'Stýring',
        texti: 'Það sem þú skrifar hér les Sara (og Claude) áður en úttektarlýsing er skrifuð eða yfirfarin. Sjálfvirki textinn í 294 breytist ekki fyrr en þú samþykkir það sérstaklega.',
        regla: 'uttekt'
      }
    ]
  };

  /* ── REGLUR ──────────────────────────────────────────────────────────────── */
  D.reglur = [
    { heiti: 'Úttektarlýsing', reglur: [
      { t: 'Textinn les sama tækjaval og reikningurinn — skýrsla og reikningur segja alltaf það sama.', heim: '294:24-33 · sara-coworker' },
      { t: 'Fast röð: grunnsetning → hleðsla að hluta → ný tæki → reykskynjarar → stútar → slöngur síðast.', heim: 'husmal.md:105-114' },
      { t: 'Brunaslöngur aldrei vottaðar sjálfkrafa — maður skrifar niðurstöðuna.', heim: '294:185-196 · Blikkhella' },
      { t: 'Gallar fara í Athugasemdir, ekki í Annað.', heim: 'husmal.md:116-134' },
      { t: 'Vinnublaðið ræður alltaf yfir því sem kerfið segir.', heim: 'Charlize #489' },
      { t: 'Sara klárar aldrei reikning — hún stoppar á „Vista / í Vinnslu".', heim: 'sara SKILL.md:12-13 · Charlize #487' }
    ] },
    { heiti: 'Reikningur og sala', reglur: [
      { t: 'Línutexti: „Yfirferð · Léttvatnstæki 6L. yfirferð", „Hleðsla · …", „Nýtt · …", „Skýrslugerð".', heim: 'sala-reikningar.md:303-311' },
      { t: 'Ónýtt tæki rukkast sem yfirferð með endingunni „ — yfirfarið en útskurðað ónýtt" (eini staðurinn: ONYTT_SKYRING).', heim: '129:61' },
      { t: 'Duft 9 og 12 kg rukkast sem 6 kg.', heim: 'Charlize #164' },
      { t: 'Afsláttur á línu bakast í einingarverðið og „ · −X% afsl." bætist við lýsinguna — aldrei bæði á línu og í afslætti.', heim: 'bokari.md:58-68' },
      { t: 'Röð afsláttar: tilboðsverð → afsláttarhópur → afslattur_pct.', heim: 'REIKNINGALOTA.md:100-110' },
      { t: 'Afsláttur birgja birtist aldrei á reikningi kúnna.', heim: 'Charlize #410' },
      { t: 'Akstur 2× ef eitthvað fór í hleðslu, annars 1×. Akstur 3.600 kr, skýrslugerð 5.600 kr án vsk.', heim: 'verd.md:3-27 · Charlize #480, #482' },
      { t: 'Reikningur rukkar ekki reykskynjara, en skýrslan telur þá. Rafhlaðan er innifalin í „Yfirferð Reykskynjari".', heim: 'Charlize #438, #504' }
    ] },
    { heiti: '„Vegna"-línan og krafan', reglur: [
      { t: 'solur.athugasemdir prentast sem „Vegna"-texti undir kennitölunni. Innri nótur fara í krafa_note.', heim: 'Charlize #2' },
      { t: 'Hausinn nefnir greiðandann; „Vegna <staður>" nefnir staðinn.', heim: 'Charlize #350, #309' },
      { t: 'Í úttekt ræður reiturinn „Texti á reikning"; annars „Framkvæmd í <mánuður> <ár>", síðast „Vegna heimsóknar DD.MM.YYYY".', heim: '165:131-142' },
      { t: 'Lýsing kröfu í Payday: „Vegna: <staður> – nr. N – <heimilisfang>" + „ · " + hreinsuð nóta. Tilvísun = R-númer.', heim: 'payday-push.cjs:374-417, 488-492' },
      { t: 'Nafn og heimilisfang staðar fara aðeins með ef kt staðarins = kt sölunnar.', heim: 'payday-push.cjs' },
      { t: 'Colas þarf „Beiðni nr: …" í nótunni (allt inntak gilt, t.d. „Deild 15").', heim: '264:1-30 · Charlize #236' },
      { t: 'Krafan berst í banka kúnna á kennitölunni; tölvupósturinn er aðeins tilkynning.', heim: 'Charlize #296' }
    ] },
    { heiti: 'Tölvupóstur', reglur: [
      { t: 'Viðhengi verður að vera til — gmail-send neitar að senda annars („Meðfylgjandi er reikningur" án viðhengis gerðist einu sinni).', heim: 'STADREYNDIR §940 · gmail-send.js:124-131' },
      { t: 'Vinnupóstur er eldklar@eldklar.is; bokhald@ fyrir bókhald. aggisigurds@gmail.com er aldrei notað.', heim: 'Charlize #81, #265' },
      { t: 'Svör fara frá eldklar@ í sama þræði.', heim: 'Charlize #507' },
      { t: 'Viðtakandi: samþykktur tengiliður hússins fyrst. eignaumsjon.is er „enginn póstur" — reiturinn tómur.', heim: 'Charlize #614' },
      { t: 'Þráður er metinn eftir NÝJASTA póstinum.', heim: 'STADREYNDIR §4' },
      { t: 'Aðgangskóðar fara aldrei í nótur.', heim: 'Charlize #52' },
      { t: 'Raunverulegur póstur fer aldrei út án græns ljóss, líka í prófun.', heim: 'STADREYNDIR §15.3' }
    ] },
    { heiti: 'Svör við póstum (gervigreind)', reglur: [
      { t: 'Kurteist, stutt (undir ~120 orð), hlýtt og faglegt, á íslensku. Svara nákvæmlega því sem var spurt.', heim: 'postur-reply.js:52-80' },
      { t: 'Aldrei búa til upphæðir, R-númer eða dagsetningar. Aldrei lofa því sem er ekki vitað.', heim: 'postur-reply.js' },
      { t: 'Skrifstofan les alltaf yfir áður en sent er.', heim: 'sala-reikningar.md:198-203' },
      { t: 'Aldrei raunveruleg gögn sem dæmi í prompti; hitastig 0.', heim: 'Charlize #514' }
    ] },
    { heiti: 'Tilboð', reglur: [
      { t: 'Tilboðið gildir í 30 daga.', heim: '275-sala-tilbod.js:214-232 · tilbod/index.html' },
      { t: 'Húsfélagstilboð: reglugerð 112/2012 og 723/2017, ÍST EN 3; Innifalið / Ekki innifalið; 5 ára verðtafla; samningur bundinn byggingarvísitölu, mest 5% á ári, 2 mánaða uppsögn.', heim: 'brunaholf/public/tilbod/index.html:1040-1137' },
      { t: 'Sent tilboð sem bíður svars verður punktur „bíður svars frá kúnna".', heim: 'eldklar-postur.md:32-33' },
      { t: 'Tilboðsnúmer úthlutast atómískt.', heim: 'Charlize #625' }
    ] }
  ];

  /* ── VERK VIÐ BEIÐNIR ─────────────────────────────────────────────────────── */
  D.beidnir = [
    { tegund: 'Skjalabeiðni', merki: 'skjalabeidni · 233 mál', hver: 'Skrifstofa',
      skref: ['Finna kúnnann: kennitala → einstakt netfang → R-númer.', 'Finna skjalið og athuga að það sé rétt þjónusta (úttekt eða brunakerfi) og réttur staður („vegna").', 'Velja viðtakanda.', 'Senda úr senda-glugganum (254) með staðaltextanum, í sama þræði.', 'Sendur póstur MEÐ viðhengi í SENT er sönnunin — þá má loka.', 'Sé engin skýrsla til verður málið skýrsluverk.'],
      texti: 'Staðaltexti skýrslu / reiknings / samnings', leid: 'Senda skýrslu eða reikning (254)' },
    { tegund: 'Skýrsla / vinnublað', merki: 'skyrsla · ham:vinnublod', hver: 'Sara → Agnar',
      skref: ['Sara les vinnublaðið — blaðið ræður alltaf.', 'Fyllir sara_yfirferd (stada bíður); spurning skráð ef blaðið var ólæsilegt.', 'Agnar hakar við → samþykkt.', 'Staða sett á hvert tæki, listi staðfestur, texti borinn saman við húsmálið.', 'Vistað „í Vinnslu".', 'Agnar ýtir á „Klára heimsókn" — krafan bíður þá ósend í Kröfuyfirliti.'],
      texti: 'Úttektarlýsing + „Vegna"-lína', leid: 'Úttektarlýsing' },
    { tegund: 'Skoðun / tilboð', merki: 'skodun_tilbod · 141 mál', hver: 'Agnar',
      skref: ['Fá upplýsingar um húsið (stigagangar, íbúðir, sameign eða inni).', 'Arnold reiknar hvað þarf.', 'Verð úr vörum / samningsverði.', 'Smíða tilboðið og senda.', 'Skrá punkt „bíður svars frá kúnna".', 'Vettvangsferð fer í Akstur.'],
      texti: 'Tilboðstexti (30 dagar)', leid: 'Tilboð úr Sölu' },
    { tegund: 'Nýr samningur', merki: 'nyr_samningur · 20 mál', hver: 'Agnar',
      skref: ['Athuga með kúnnaskránni áður en nýr kúnni er stofnaður.', 'Samningur sendur með staðaltexta samnings (254).', 'Skilmálar eins og í tilboðssmiðnum.', 'Setja skoðunarmánuð.'],
      texti: 'Staðaltexti samnings', leid: 'Senda skýrslu eða reikning (254)' },
    { tegund: 'Eftirfylgni úttektar', merki: 'uttekt_eftirfylgni · 7 mál', hver: 'Verkstæði',
      skref: ['Sækja inn → verkbeiðni.', 'Tækin rukkast aðeins á verkbeiðninni.', 'Akstur 2×.'],
      texti: 'Reikningslínur verkbeiðni', leid: 'Reikningur úr Sölu' },
    { tegund: 'Rukkun', merki: 'rukkun · eftir_ad_rukka', hver: 'Rukkari',
      skref: ['Skoða forskoðun krafna (rautt/gult) og úttektir án reiknings — og segja niðurstöðuna í stað þess að spyrja.', 'Aldrei rukka tvisvar.', 'Colas þarf beiðninúmer.', 'Sending: tölvupóstur + rafrænt.'],
      texti: 'Lýsing kröfu í Payday', leid: 'Krafa í Payday' },
    { tegund: 'Hringja / spurning / annað', merki: 'hringja · spurning · annad', hver: 'Skrifstofa',
      skref: ['Hringja eða svara með svardrögum (gervigreind) — skrifstofan les yfir.', 'Skrá tengiliðaupplýsingar sem sjást á prófílinn.'],
      texti: 'Svardrög úr pósti', leid: 'Svar við pósti (gervigreind)' }
  ];

  /* ── ÓSAMRÆMI ─────────────────────────────────────────────────────────────── */
  D.osamraemi = [
    { id: 'nafn', heiti: 'Nafn félagsins í pósti', lysing: 'Þrjú nöfn eftir því hvaða takki sendir.',
      daemi: [{ heiti: 'Í notkun í dag', t: '„Brunahólf Slökkvitæki ehf."   (senda-glugginn 254, undirskrift)\n„Brunahólf slökkvitæki ehf"    (sendandi 254:52, tilboð 275)\n„Slökkvitæki ehf"              (svardrög postur-reply, 53, 85)' }] },
    { id: 'kvedja', heiti: 'Kveðja og ávarp', lysing: 'Ávarp og undirskrift eru skrifuð á sex vegu.',
      daemi: [{ heiti: 'Ávarp', t: 'Sæl(l) · Sæl/l · Sæl/sæll · Sæll/sæl · Kæri viðskiptavinur · Góðan daginn' }, { heiti: 'Kveðja', t: 'Kær kveðja · Kveðja · Bestu kveðjur        sími: 565-4080 / 565 4080' }] },
    { id: 'noreply', heiti: 'Skýrslur og reikningar frá noreply@', lysing: 'Sjálfvirkar sendingar skýrslu (176) og reiknings (29) fara frá noreply@eldklar.is — svör kúnna týnast, þótt senda-glugginn (254) segi „svör berast hingað".' },
    { id: 'slongur', heiti: 'Skýrslupóstur nefnir brunaslöngur alltaf', lysing: 'Sjálfvirki skýrslupósturinn (176:140) segir alltaf „vegna yfirferðar á brunaslöngum, slökkvitækjum og öðrum búnaði", líka þar sem engar slöngur eru.' },
    { id: 'banki', heiti: 'Staðgengill sem gæti náð til kúnna', lysing: 'Sjálfvirki reikningspósturinn (53:32-35) inniheldur bókstaflega „— Banki: Bankaupplýsingar koma hér".' },
    { id: 'gjalddagi', heiti: 'Gjalddagi: 14 eða 10 dagar', lysing: '14 dagar í reikningspósti (53) og tilboðssmið (tilbod:1002), en 10 dagar í sama tilboðssmið (tilbod:1137).' },
    { id: 'malfar', heiti: 'Málvillur í texta sem fer út', lysing: 'Þrjár villur sem kúnninn sér.',
      daemi: [{ heiti: 'Rangt → rétt', t: '„reikningur … ógreidd"   → „ógreiddur"      (85:105)\n„Vegna heimsókn"          → „Vegna heimsóknar" (165:141)\n„Framkvæmd í Maí"         → „Framkvæmd í maí"  (mánuðir lágstafir)' }] },
    { id: 'tolur', heiti: 'Tölur í orðum eða tölustöfum', lysing: 'Húsmálið segir „1 = Eitt, annars tölustafur". Kóðinn skrifar orð upp í tíu fyrir hleðslu („Fjögur …") en tölustafi fyrir ný tæki („3 nýjum …").' },
    { id: 'akstur', heiti: 'Akstursverð', lysing: 'Söru-skillið (SKILL.md:87) og Charlize #166 segja „2 × 3.000". verd.md og Charlize #480 segja 3.600 og skýrslugerð 5.600. Eintakið af Söru á claude.ai (31.07) er enn eldra — Cowork gæti verið að lesa gömlu reglurnar.' },
    { id: 'agentar', heiti: 'Tveir agentar með gamalt orðalag', lysing: 'sara-coworker og sala-reikningar segja enn „Öll tæki", „hausskipti" og „á fullum þrýsting og vottaðar í lagi" — húsmálið og kóðinn segja „slökkvitæki", „stút", „þrýstingi" og enga sjálfvirka vottun.' },
    { id: 'ailofar', heiti: 'Svardrög geta lofað skjali sem er ekki til', lysing: 'postur-reply.js:58 segir „staðfestu að við sendum hann" án þess að vita hvort skjalið er til.' },
    { id: 'beidninr', heiti: 'Beiðninúmer: aðeins Colas', lysing: 'Aðeins Colas er í REQUIRE_KTS (264:21). „SKYLDA: beiðnanúmer" Reykjavíkurborgar stendur í customers_base.general_notes, sem enginn kóði les.' }
  ];

  D.leidir = D.leidir || [];
})();
/* === END SVAR-STÖÐ — GÖGNIN === */
