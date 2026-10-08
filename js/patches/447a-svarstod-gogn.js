/* === SVAR-STÖÐ — GÖGNIN (447a) — 08.10.2026 ==================================
 * Kortið sem Svar-stöð (447) teiknar. Safnað 08.10.2026 með yfirferð á kóða beggja repóa (slokkvitaeki +
 * brunaholf), Söru-skillinu (references/husmal.md, verd.md), agentunum (sara-coworker, sala-reikningar,
 * rukkari, eldklar-postur, bokari), REIKNINGALOTA.md, STADREYNDIR.md og Charlize-minninu (v_charlize_active).
 * Skrá:lína vísanir eru frá 08.10.2026 — kóðinn hreyfist, svo leitaðu að fallinu ef línan hefur færst.
 * Hlaðin á undan 447 (window.__SVARSTOD_DATA).
 * ========================================================================== */
(() => {
  const D = window.__SVARSTOD_DATA = window.__SVARSTOD_DATA || {};

  /* ── MERKIÐ Í GLUGGANUM (Agnar 08.10.2026: „setja pínulítið nr í sendingarglugga svo maður geti fundið rétta
   * gluggann til að breyta síðar") — hver sendileið á númer SV-01 … SV-27. Gluggi sem sendir texta ber merkið smátt í
   * hausnum; sama númer stendur í kóðanum við gluggann (grep 'SV-07') og á spjaldinu í Svar-stöð. Smellur opnar
   * Svar-stöð á spjaldinu í nýjum flipa. Merkið fer ALDREI í texta eða skjal sem kúnninn fær. */
  window.svKodi = function (k) {
    if (!/^SV-\d{2}$/.test(String(k || ''))) return '';
    return '<span class="sv-kodi" data-sv-kodi="' + k + '" role="link" tabindex="0" title="Svar-stöð ' + k + ' — hér sést hvaðan textinn í þessum glugga kemur. Smelltu til að opna." ' +
      'style="display:inline-block;margin:0 0 0 8px;padding:0 5px;border:1px solid currentColor;border-radius:3px;font:700 9.5px/1.5 \'JetBrains Mono\',ui-monospace,monospace;letter-spacing:.06em;vertical-align:middle;opacity:.7;cursor:pointer;white-space:nowrap;text-transform:none">' + k + '</span>';
  };

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
    /* Raðað eftir alvarleika — það sem getur farið rangt til kúnna fyrst. Hvert atriði sannreynt í kóðanum 08.10.2026. */
    { id: 'bokun-vidtakandi', heiti: 'Senda í bókun getur farið til kúnnans', lysing: 'Í Kröfu yfirliti hubbsins fyllist viðtakandinn með netfangi KÚNNANS ef það er skráð (customer-info → contact_email), þó pósturinn sé Efnislisti/Tímaskýrsla „til skráningar í Payday" — ætlaður bókaranum. Viðtakandinn sést í glugganum áður en sent er.',
      daemi: [{ heiti: 'Hvar', t: 'brunaholf/index.html — act===\'send\': let to=emailTo(); … if(ci.rows[0].contact_email) to=ci.rows[0].contact_email;' }] },
    { id: 'senddoc', heiti: 'Brunakerfisskýrsla og samningur fara út sem „Reikningur"', lysing: 'sendDoc (254) þekkir aðeins „skýrslu" og „annað". Þegar brunakerfisskýrsla eða samningur er sendur af skjalalínu (274) verður titillinn „Senda reikning", efnið „Reikningur {ár} — Brunahólf slökkvitæki ehf" og meginmálið reikningstextinn.',
      daemi: [{ heiti: 'Kóðinn', t: "const isRep = opts.kind === 'skyrsla';\nsubject: (isRep ? 'Úttektarskýrsla' : 'Reikningur') + …\nbodyText: standardText(isRep ? 'skyrsla' : 'reikningur', opts)" }] },
    { id: 'banki', heiti: 'Staðgenglar sem geta náð til kúnna', lysing: 'Tveir textar bera staðgengil í stað bankaupplýsinga.',
      daemi: [{ heiti: 'Hvar', t: '„— Banki: Bankaupplýsingar koma hér"            (53-auto-email-invoice.js:33)\n„[BANKAREIKNINGUR — fylla inn áður en sent er]"  (369-krofu-vinnugluggi.js:849-862)' }] },
    { id: 'saladnum', heiti: 'Sala → Senda reikning: ekkert R-númer', lysing: 'Salan sem „Senda reikning á netfang viðskiptavinar" byggir á hefur ekkert num, svo efnið verður „Reikningur  frá Brunahólf Slökkvitæki ehf" og fyrsta línan „Reikningur ". Ekkert PDF fylgir heldur.' },
    { id: 'thradur', heiti: 'Svar úr Þjónustuveri fer ekki í sama þráð', lysing: 'Reikninga-póstur (240) svarar í sama þræði (inReplyTo). Þjónustuver póstar (309) gera það ekki — kúnninn fær nýjan póst og samhengið týnist.' },
    { id: 'noreply', heiti: 'Skýrslur og reikningar skráð frá noreply@', lysing: 'Úttektarskýrslupósturinn (176) og reikningspósturinn (29) eru stilltir á noreply@eldklar.is. AppMail breytir sendanda í eldklar@, en það er ekki augljóst og sendandinn er geymdur í vafranum.' },
    { id: 'slongur', heiti: 'Skýrslupóstur nefnir brunaslöngur alltaf', lysing: 'Sjálfvirki skýrslupósturinn (176:140) segir alltaf „vegna yfirferðar á brunaslöngum, slökkvitækjum og öðrum búnaði", líka þar sem engar slöngur eru — og það er eini pósturinn sem ekki er hægt að breyta fyrir sendingu.' },
    { id: 'gjalddagi', heiti: 'Gjalddagi: fjórar tölur', lysing: 'Kúnninn getur séð mismunandi frest eftir því hvaða skjal hann les.',
      daemi: [{ heiti: 'Í notkun í dag', t: 'Payday-krafan:        gjalddagi +7, eindagi +3      (payday-push.cjs:365-367)\nReikningurinn (PDF):  „Krafa í banka 10 dagar"      (233:176)\nOpna í pósti:         „Eindagi: 14 daga frá útgáfu"  (53)\nTilboðssmiður (hub):  14 dagar / 10 dagar           (tilbod:1002 / 1137)' }] },
    { id: 'nafn', heiti: 'Nafn félagsins í pósti', lysing: 'Þrjú nöfn eftir því hvaða takki sendir. Agnar ákvað 30.09.2026 að undirskriftin sé „Brunahólf Slökkvitæki ehf." (286) — hinir hafa ekki fylgt.',
      daemi: [{ heiti: 'Í notkun í dag', t: '„Brunahólf Slökkvitæki ehf."   (254 undirskrift, 286, 240, 369)\n„Brunahólf slökkvitæki ehf"    (sendandi 254:52, efni 254:299, tilboð 275)\n„Slökkvitæki ehf"              (svardrög postur-reply, 37, 53, gátt, Svarhjálp, skoðunartengill)' },
              { heiti: 'Endir á efnislínu', t: '— Slökkvitæki ehf               (166, 253, 311, 199, 265, 274)\n— Brunahólf slökkvitæki ehf     (254, 275, 190)\nfrá Brunahólf Slökkvitæki ehf  (29, 240)' }] },
    { id: 'kvedja', heiti: 'Ávarp og kveðja', lysing: 'Ávarp og undirskrift eru skrifuð á marga vegu.',
      daemi: [{ heiti: 'Ávarp', t: 'Sæl(l) · Sæl/l · Sæl/sæll · Sæll/sæl · Góðan dag · Góðan daginn · Kæri viðskiptavinur' }, { heiti: 'Kveðja og sími', t: 'Kær kveðja · Kveðja · Bestu kveðjur · Með kveðju        sími: 565-4080 / 565 4080' }] },
    { id: 'stillingar', heiti: 'Póststillingar sem enginn les', lysing: 'Stillingar → Email (85/86) geymir efni og meginmál reiknings, áminningar og undirskrift í app_settings — en enginn sendandi les þær. Það sem þar er skrifað hefur engin áhrif. Skýringartextinn segir líka enn „staðfest hjá Resend".',
      daemi: [{ heiti: 'Lyklar sem enginn les', t: 'email.reikningur_subject · email.reikningur_body · reminder_subject · reminder_body · signature' }] },
    { id: 'vafri', heiti: 'Textar og sendendur geymdir í vafranum', lysing: 'Þessar stillingar eru aðeins á vélinni sem breytti þeim — brýtur regluna um að staða sé á þjóninum. Fjórar vélar geta sent með fjórum mismunandi textum.',
      daemi: [{ heiti: 'localStorage-lyklar', t: 'email_mode · email_from · report_email_from · slokk_send_from · sms_template · sms_company_phone · cfg_email_subject · cfg_email_intro' }] },
    { id: 'malfar', heiti: 'Málvillur í texta sem fer út', lysing: 'Villur sem kúnninn sér.',
      daemi: [{ heiti: 'Rangt → rétt', t: '„reikningur {nr} ógreidd"  → „ógreiddur"        (85:105, áminning)\n„Vegna heimsókn {dags}"    → „Vegna heimsóknar" (165:141, reikningur)\n„Framkvæmd í Maí"         → „Framkvæmd í maí"  (mánuðir lágstafir)\n„\\n" í hub-mailto        → ný lína            (brunakerfisskoðun)' }] },
    { id: 'tolur', heiti: 'Tölur í orðum eða tölustöfum', lysing: 'Húsmálið segir „1 = Eitt, annars tölustafur". Kóðinn skrifar orð upp í tíu fyrir hleðslu („Fjögur …") en tölustafi fyrir ný tæki („3 nýjum …").' },
    { id: 'akstur', heiti: 'Akstursverð í reglunum', lysing: 'Söru-skillið (SKILL.md:87) og Charlize #166 segja „2 × 3.000". verd.md og Charlize #480 segja 3.600 og skýrslugerð 5.600. Eintakið af Söru á claude.ai (31.07) er enn eldra — Cowork gæti verið að lesa gömlu reglurnar.' },
    { id: 'agentar', heiti: 'Tveir agentar með gamalt orðalag', lysing: 'sara-coworker og sala-reikningar segja enn „Öll tæki", „hausskipti" og „á fullum þrýsting og vottaðar í lagi" — húsmálið og kóðinn segja „slökkvitæki", „stút", „þrýstingi" og enga sjálfvirka vottun.' },
    { id: 'ailofar', heiti: 'Svardrög geta lofað skjali sem er ekki til', lysing: 'postur-reply.js:58 segir „Ef beðið er um reikning/afrit, staðfestu að við sendum hann" án þess að vita hvort skjalið er til.' },
    { id: 'beidninr', heiti: 'Beiðninúmer: aðeins Colas', lysing: 'Aðeins Colas er í REQUIRE_KTS (264:21). „SKYLDA: beiðnanúmer" Reykjavíkurborgar stendur í customers_base.general_notes, sem enginn kóði les.' },
    { id: 'thjonustuver-vara', heiti: 'Þjónustuver: „Svar sent" án sendingar', lysing: 'Vanti AppMail fellur svarið í Þjónustuveri (309:524-525) aftur á /api/email-send, sem er hætt í notkun (Resend). Reikninga-póstur (240) fjarlægði sömu varaleið 19.09. Getur sýnt „Svar sent" og merkt málið svarað þótt pósturinn fari aldrei.' },
    { id: 'tilbod3', heiti: 'Tilboðstextinn skrifaður þrisvar', lysing: 'Tilboðssmiður hubbsins hefur sama texta í forsýn, Word-útgáfu og build_tilbod.js. Breyting á einum stað skilar sér ekki í hina.' }
  ];

  /* ── SENDILEIÐIR ──────────────────────────────────────────────────────────
   * ras: postur | pdf | payday | svar | skjar | annad    stada: fast | stillanlegt | ai | handvirkt
   * Allar póstsendingar appsins fara um AppMail.send (254) → brunaholf /api/gmail-send, frá eldklar@ eða bokhald@. */
  const UNDIRSKRIFT_254 = '\n\nKær kveðja,\nBrunahólf Slökkvitæki ehf.\nkt. 600508-0400\nsími 565-4080';
  D.leidir = [
    /* ── Póstur til kúnna: reikningar ── */
    { id: 'reikningur-kvittun', kodi: 'SV-01', gluggi: 'Sendingarglugginn (254) — hausinn', ras: 'postur', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Senda kvittun eða reikning í tölvupósti',
      hvadan: 'Hreyfingarlisti → Kvittun → „Senda kvittun í tölvupósti" · Sala → Fyrri kaup → „Senda kvittun í tölvupósti"',
      hvert: 'Netfang kúnna, með reikningnum sem PDF', sendir: 'Brunahólf slökkvitæki ehf <eldklar@ eða bokhald@eldklar.is>',
      breytur: '{nafn} {nr}',
      textar: [{ heiti: 'Efni', t: 'Reikningur {nr} — Brunahólf slökkvitæki ehf' },
               { heiti: 'Meginmál (má breyta í glugganum fyrir hverja sendingu)', t: 'Sæl(l) {nafn},\n\nMeðfylgjandi er reikningur {nr} frá Brunahólf Slökkvitæki ehf.\n\nEf spurningar vakna um reikninginn er velkomið að hafa samband.' + UNDIRSKRIFT_254 }],
      skrar: ['js/patches/254-receipt-sender.js:109-133 (standardText)', 'js/patches/254-receipt-sender.js:284-307 (send)', 'js/patches/167-hreyfingarlisti.js:1005 · 253-sala-customer-history.js:788 (takkarnir)'],
      reglur: ['Viðhengið verður að vera til — sendingin stöðvast annars.', 'Reikningurinn sem fylgir er vistaða PDF-ið; annars er hann smíðaður upp á nýtt.'],
      fara: 'hreyfingarlisti', faraHeiti: 'Hreyfingarlista' },
    { id: 'reikningur-krofur', kodi: 'SV-02', gluggi: 'Sendingarglugginn (254) — hausinn', ras: 'postur', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Kröfu yfirlit — Senda reikning',
      hvadan: 'Kröfu yfirlit → „Senda" á kröfu', hvert: 'Netfang kúnna (viðtakandi hússins fyrst), reikningur + skýrsla að vali',
      sendir: 'eldklar@eldklar.is', breytur: '{nafn} {nr}',
      textar: [{ heiti: 'Efni', t: 'Reikningur {nr} — Slökkvitæki ehf' }, { heiti: 'Meginmál', t: 'Sami staðaltexti og „Senda kvittun" (254) — reikningsútgáfan.' }],
      skrar: ['js/patches/166-krofu-yfirlit.js:2077-2101', 'js/patches/166-krofu-yfirlit.js:2638 (emailForSale)'],
      athuga: ['Efnið endar á „— Slökkvitæki ehf" hér en „— Brunahólf slökkvitæki ehf" í kvittuninni.'],
      fara: 'krofu-yfirlit', faraHeiti: 'Kröfu yfirlit' },
    { id: 'reikningur-postur', kodi: 'SV-03', gluggi: '„Senda skjöl" og „Yfirfara áður en sent er" (240)', ras: 'postur', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Reikninga-póstur — svara beiðni um reikning eða skjöl',
      hvadan: 'Reikninga-póstur → „Senda" → Undirbúa sendingu → Yfirfara → „Senda núna" · líka „Senda reikning" á Þjónustuborði',
      hvert: 'Sá sem sendi póstinn, Í SAMA ÞRÆÐI, frá pósthólfinu sem tók á móti', sendir: 'Pósthólfið sem fékk póstinn',
      breytur: '{fornafn} {nr} {upphæð} {félag}',
      textar: [{ heiti: 'Skilaboð (uppkast — má breyta)', t: 'Sæl(l) {fornafn},          ← „Góðan daginn," ef nafnið er netfang\n\nMeðfylgjandi er reikningur {nr} eins og beðið var um.\n\nKveðja,\nBrunahólf Slökkvitæki ehf.' },
               { heiti: 'Utan um skilaboðin (HTML)', t: 'Brunahólf Slökkvitæki ehf / Reikningur {nr}\nSæl/l,\n{skilaboð}\nMeðfylgjandi er reikningur {nr} fyrir {félag}, að upphæð {upphæð}.\nKær kveðja, Brunahólf Slökkvitæki ehf, eldklar@eldklar.is' },
               { heiti: 'Efni', t: 'Re: {upprunalegt efni}     (annars: Reikningur {nr} frá Brunahólf Slökkvitæki ehf)' }],
      skrar: ['js/patches/240-reikninga-postur.js:1497-1507 (uppkast)', 'js/patches/240-reikninga-postur.js:1555-1568 (buildEmailHtml)', 'js/patches/240-reikninga-postur.js:1607-1623'],
      athuga: ['Ávarpið kemur tvisvar: „Sæl(l) {fornafn}," í skilaboðunum og „Sæl/l," í HTML-umgjörðinni.'],
      fara: 'reikninga-postur', faraHeiti: 'Reikninga-póst' },
    { id: 'reikningur-sala', kodi: 'SV-04', gluggi: '„Senda reikning á netfang" (29)', ras: 'postur', stada: 'fast', felag: 'Slökkvitæki',
      heiti: 'Sala — Senda reikning á netfang viðskiptavinar',
      hvadan: 'Sala → Greiðsla → „Senda reikning á netfang viðskiptavinar"', hvert: 'Opnar póstforritið (mailto) — ekkert PDF fylgir',
      sendir: 'Póstforrit vélarinnar', breytur: '{nr} {dags} {kúnni} {línur} {samtals}',
      textar: [{ heiti: 'Efni', t: 'Reikningur {nr} frá Brunahólf Slökkvitæki ehf' },
               { heiti: 'Meginmál', t: 'Reikningur {nr}\nDagsetning: {dags}\nViðskiptavinur: {kúnni}\n\n• {lýsing} × {magn} — {upphæð}\n\nSamtals: {samtals}\n\nKærar þakkir fyrir viðskiptin!\nBrunahólf Slökkvitæki ehf' }],
      skrar: ['js/patches/29-email-invoice.js:103-117, 150, 247'],
      athuga: ['Salan sem takkinn býr til hefur ekkert R-númer — efnið verður „Reikningur  frá …" og fyrsta línan „Reikningur ".', 'Sendingarháttur og sendandi eru geymd í vafranum (email_mode, email_from) — ekki samstillt milli véla.'],
      fara: 'sala', faraHeiti: 'Sölu' },
    { id: 'reikningur-opna-i-posti', kodi: 'SV-05', gluggi: '„Senda reikning í tölvupósti" (53)', ras: 'postur', stada: 'stillanlegt', felag: 'Slökkvitæki',
      heiti: 'Reikningslína — Opna í pósti',
      hvadan: '„📧" á reikningslínu → „Opna í pósti"', hvert: 'Póstforrit vélarinnar (mailto)', sendir: 'Póstforrit vélarinnar',
      breytur: '{nr} {dags} {upphæð} {félag}',
      textar: [{ heiti: 'Efni', t: 'Reikningur frá Slökkvitæki ehf — {nr}' },
               { heiti: 'Meginmál', t: 'Sæll/sæl,\n\nMeðfylgjandi er reikningur.\n\nReikningur: {nr}\nDags: {dags}\nUpphæð: {upphæð}\n\nGreiðsluleiðbeiningar:\n— Banki: Bankaupplýsingar koma hér\n— Kennitala:\n— Eindagi: 14 daga frá útgáfu\n\nBestu kveðjur,\n{félag}' }],
      skrar: ['js/patches/53-auto-email-invoice.js:19-41, 96'],
      athuga: ['„Bankaupplýsingar koma hér" er staðgengill sem getur farið til kúnna.', 'Eindagi 14 dagar — Payday segir 7 + 3.', 'Inngangur og efni geymd í vafranum (cfg_email_*).'] },
    /* ── Póstur til kúnna: skýrslur, samningar, tilboð ── */
    { id: 'skyrsla-uttekt', kodi: 'SV-06', gluggi: '„Senda úttektarskýrslu" (176)', ras: 'postur', stada: 'fast', felag: 'Slökkvitæki',
      heiti: 'Úttektarskýrsla — Senda í tölvupósti',
      hvadan: 'Búa til úttektarskýrslu → „Senda í tölvupósti" (líka úr Bílstjóra og Beiðnum)', hvert: 'Netfang kúnna, skýrslan sem PDF',
      sendir: 'noreply@eldklar.is (AppMail breytir í eldklar@)', breytur: '{félag}',
      textar: [{ heiti: 'Efni', t: 'Úttektarskýrsla — {félag}' },
               { heiti: 'Meginmál — EKKI hægt að breyta', t: 'Sæl/sæll,\n\nMeðfylgjandi er úttektarskýrsla vegna yfirferðar á brunaslöngum, slökkvitækjum og öðrum búnaði hjá {félag}.\n\nSkýrslan er í viðhengi sem PDF-skjal.\n\nKær kveðja,\nBrunahólf Slökkvitæki ehf\nHelluhrauni 10, 220 Hafnarfjörður · Sími 565 4080' }],
      skrar: ['js/patches/176-company-report-email.js:130-160', 'js/patches/168-company-inspection-report.js:381, 604'],
      athuga: ['Nefnir brunaslöngur alltaf, líka þar sem engar eru.', 'Enginn textareitur — eina leiðin sem ekki er hægt að laga fyrir sendingu.', 'Annar staðaltexti en sami hlutur í senda-glugganum (254, „skyrsla").'],
      fara: 'companies', faraHeiti: 'Fyrirtæki' },
    { id: 'skyrsla-par', kodi: 'SV-07', gluggi: 'Sendingarglugginn (254) — hausinn', ras: 'postur', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Skýrsla + reikningur saman',
      hvadan: 'Sala → Fyrri kaup → „Senda" · Pör-bandið „Senda" · Skjöl & viðhengi → ár → „Senda" · Útfyllt skjöl', hvert: 'Netfang kúnna, skýrsla og reikningur',
      sendir: 'eldklar@eldklar.is', breytur: '{nafn} {ár} {staður}',
      textar: [{ heiti: 'Efni', t: '{Úttektarskýrsla|Brunakerfisskýrsla} + reikningur {ár} — Slökkvitæki ehf\n{Úttektarskýrsla|Brunakerfisskýrsla|Reikningur} {ár} — Slökkvitæki ehf      (Skjöl & viðhengi)\nÞjónustusamningur — Slökkvitæki ehf\n{heiti skjals} — {nafn} — Slökkvitæki ehf                             (Útfyllt skjöl)' },
               { heiti: 'Meginmál — skýrsla', t: 'Sæl(l) {nafn},\n\nMeðfylgjandi er úttektarskýrsla fyrir {ár} — {staður}.\n\nSkýrslan sýnir yfirferð slökkvitækja og brunavarna hjá ykkur. Ef eitthvað er óljóst eða þið viljið fá tilboð í úrbætur er velkomið að hafa samband.' + UNDIRSKRIFT_254 },
               { heiti: 'Meginmál — samningur', t: 'Sæl(l) {nafn},\n\nMeðfylgjandi er þjónustusamningur við Brunahólf Slökkvitæki ehf.\n\nEf spurningar vakna er velkomið að hafa samband.' + UNDIRSKRIFT_254 }],
      skrar: ['js/patches/254-receipt-sender.js:109-133', 'js/patches/253-sala-customer-history.js:523, 701', 'js/patches/311-doc-pairs-band.js:199', 'js/patches/199-doc-year-grid.js:1762, 1816', 'js/patches/265-utfyllt-skjol.js:105'] },
    { id: 'brunakerfi', kodi: 'SV-08', gluggi: 'Sendingarglugginn (254) — hausinn', ras: 'postur', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Brunakerfisskýrsla — Senda',
      hvadan: 'Fyrirtæki → Brunakerfi → „Senda" (og „Senda" á skjalalínum)', hvert: 'Netfang kúnna', sendir: 'eldklar@eldklar.is',
      breytur: '{staður} {ár}',
      textar: [{ heiti: 'Efni', t: 'Brunakerfisskýrsla {ár} — Slökkvitæki ehf' },
               { heiti: 'Meginmál', t: 'Sæl(l) {nafn},\n\nMeðfylgjandi er skoðunarskýrsla brunaviðvörunarkerfis fyrir {ár} — {staður}.\n\nSkýrslan sýnir yfirferð brunaviðvörunarkerfisins hjá ykkur. Ef eitthvað er óljóst eða þið viljið fá tilboð í úrbætur er velkomið að hafa samband.' + UNDIRSKRIFT_254 }],
      skrar: ['js/patches/274-brunakerfi-fyrirtaeki.js:291, 784, 1182, 1533', 'js/patches/254-receipt-sender.js:311-327 (sendDoc)'],
      athuga: ['VILLA: skjalalínurnar senda um sendDoc, sem þekkir aðeins „skýrslu" og „annað". Brunakerfisskýrsla og samningur fara því út með titlinum „Senda reikning", efninu „Reikningur {ár} — …" og reikningstextanum.'] },
    { id: 'verkstaedi', kodi: 'SV-09', gluggi: 'Sendingarglugginn (254) — hausinn', ras: 'postur', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Þjónustuverkstæði — Senda skýrslu',
      hvadan: 'Þjónustuverkstæði → „Senda"', hvert: 'Netfang kúnna', sendir: 'eldklar@eldklar.is', breytur: '{ár} {nafn} {staður}',
      textar: [{ heiti: 'Efni', t: 'Úttektarskýrsla {ár} — Brunahólf slökkvitæki ehf' }, { heiti: 'Meginmál', t: 'Staðaltexti skýrslu (254) — sjá „Skýrsla + reikningur saman".' }],
      skrar: ['js/patches/190-thjonustu-verkstaedi.js:829, 863'], fara: 'thjonustu-verkstaedi', faraHeiti: 'Þjónustuverkstæði' },
    { id: 'boka-tima', kodi: 'SV-10', gluggi: 'Sendingarglugginn (254) — hausinn', ras: 'postur', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Samskipti — Nýr póstur (bóka yfirferð)',
      hvadan: 'Fyrirtæki → Samskipti → „Nýr póstur"', hvert: 'Viðtakandi hússins (Vidtakandi)', sendir: 'eldklar@eldklar.is', breytur: '{fornafn tengiliðs}',
      textar: [{ heiti: 'Efni', t: 'Slökkvitækjaþjónusta — hvenær hentar?' },
               { heiti: 'Meginmál', t: 'Góðan dag {fornafn}\n\nÞið eruð með þjónustusamning um slökkvitæki hjá okkur og nú er komið að reglubundinni yfirferð.\n\nHentar einhver tími betur en annar fyrir okkar mann að koma? Við reynum að haga ferðinni eftir því sem hentar ykkur — morgnar, síðdegi eða ákveðnir vikudagar.\n\nLáttu mig vita og ég set ykkur á listann.\n\nKveðja,\nBrunahólf Slökkvitæki ehf.' }],
      skrar: ['js/patches/286-samskipti-panel.js:560-575'],
      reglur: ['Ávarpið er kynhlutlaust („Góðan dag").', 'Undirskriftin er „Brunahólf Slökkvitæki ehf." (Agnar 30.09.2026).'] },
    { id: 'tilbod-sala', kodi: 'SV-11', gluggi: 'Sendingarglugginn (254) — hausinn', ras: 'postur', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Tilboð úr Sölu',
      hvadan: 'Sala → Greiðsla → „Senda tilboð"', hvert: 'Netfang kúnna, tilboðið sem PDF', sendir: 'eldklar@eldklar.is', breytur: '{nafn} {dags}',
      textar: [{ heiti: 'Efni', t: 'Tilboð — Brunahólf slökkvitæki ehf' },
               { heiti: 'Meginmál', t: 'Sæl(l) {nafn},\n\nMeðfylgjandi er tilboð frá Brunahólf slökkvitæki ehf.\n\nTilboðið gildir í 30 daga. Ef spurningar vakna, eða þið viljið staðfesta tilboðið, er velkomið að svara þessum pósti eða hringja í síma 565-4080.\n\nKær kveðja,\nBrunahólf slökkvitæki ehf.\nkt. 600508-0400\nsími 565-4080' },
               { heiti: 'Skráarnafn', t: 'Tilboð - {nafn} - {dags}.pdf' }],
      skrar: ['js/patches/275-sala-tilbod.js:24-25, 214-234, 254'], fara: 'sala', faraHeiti: 'Sölu' },
    { id: 'gatt', kodi: 'SV-12', gluggi: 'Gátt (stjórnun) — „Senda á viðskiptavin"', ras: 'postur', stada: 'fast', felag: 'Slökkvitæki',
      heiti: 'Aðgangur að þjónustuvef kúnna',
      hvadan: 'Gátt (stjórnun) → „Senda á viðskiptavin"', hvert: 'Netfang kúnna', sendir: 'eldklar@eldklar.is (hub) / noreply@slokkvitaeki.is (app)',
      breytur: '{félag} {slóð} {netfang} {lykilorð}',
      textar: [{ heiti: 'Efni', t: 'Aðgangur að þjónustuvef Slökkvitækja ehf.' },
               { heiti: 'Meginmál', t: 'Sæl/l,\n\nHér er aðgangur að þjónustuvef Slökkvitækja ehf. þar sem þú sérð stöðu brunavarna, úttektarskýrslur og reikninga fyrir {félag}.\n\nVefslóð: {slóð}\nNotandanafn: {netfang}\nLykilorð: {lykilorð}\n\nKveðja,\nSlökkvitæki ehf.' }],
      skrar: ['brunaholf/netlify/functions/gatt-admin.js:146-166', 'netlify/functions/gatt-admin.cjs:148-171'] },
    /* ── Brunahólf-hubbið ── */
    { id: 'bh-bokun', kodi: 'SV-13', gluggi: '„Senda í bókun"-glugginn í hubbinu', ras: 'postur', stada: 'handvirkt', felag: 'Brunahólf',
      heiti: 'Kröfu yfirlit (hub) — Senda í bókun',
      hvadan: 'brunaholf.netlify.app → Kröfu yfirlit → „Senda í bókun"', hvert: 'Bókari (bokhald@brunaholf.is) — Efnislisti/Tímaskýrsla sem PDF',
      sendir: 'Brunahólf <eldklar@eldklar.is>', breytur: '{kúnni|verkstaður} {mánuður}',
      textar: [{ heiti: 'Efni', t: 'Efnislisti/Tímaskýrsla — {kúnni} {mánuður}' },
               { heiti: 'Meginmál (má breyta, vistast ekki)', t: 'Sæl(l),\n\nMeðfylgjandi Efnislisti/Tímaskýrsla fyrir {kúnni} ({mánuður}) til skráningar í Payday.\n\nSkjöl:\n• {skjal}\n\nKveðja,\nBrunahólf' }],
      skrar: ['brunaholf/index.html — leita að „til skráningar í Payday"', 'Netfang bókara: app_kv.ky_settings.email_to (Stilla → Netfang bókara)'],
      athuga: ['Viðtakandinn er fylltur með netfangi KÚNNANS ef það er til (customer-info → contact_email), þó textinn sé ætlaður bókaranum. Sést í glugganum áður en sent er.', 'Villuboðin nefna enn RESEND_API_KEY, sem er hætt í notkun.'],
      url: 'https://brunaholf.netlify.app/#krofuyfirlit', faraHeiti: 'Kröfu yfirlit í hubbinu' },
    /* ── PDF og skjöl ── */
    { id: 'pdf-reikningur', kodi: 'SV-14', gluggi: 'Enginn gluggi — merkið fer ALDREI á skjal sem kúnninn fær', ras: 'pdf', stada: 'stillanlegt', felag: 'Slökkvitæki',
      heiti: 'Reikningurinn sjálfur (PDF)',
      hvadan: 'Verður til við hverja sölu og fylgir öllum reikningspóstum', hvert: 'Viðhengi í pósti · Skjöl & viðhengi',
      sendir: '—', breytur: '{línur} {vegna} {greiðsluháttur}',
      textar: [{ heiti: 'Fastir hlutar', t: 'Seljandi: {úr Stillingum → Branding}\nvegna {solur.athugasemdir}\nGreiðsluskilmálar: Krafa í banka 10 dagar   (staðgreitt: „Staðgreitt")\nLínur: {lýsing hverrar línu}\n\nÞessi reikningur er rafrænt ytra frumgagn skv. reglugerð nr. 505/2013.' }],
      skrar: ['js/patches/233-uttekt-pdf-autosave.js:159-202, 442', 'js/patches/86-settings-ui.js:417-427 (Branding í Stillingum)'],
      reglur: ['„Vegna"-línan er textinn sem kúnninn sér; innri nótur fara í krafa_note.', 'Línutexti úttektar: „{Hleðsla|Yfirferð} · {vara}[ · −X% afsl.]", svo Skýrslugerð og Akstur.'],
      athuga: ['„Krafa í banka 10 dagar" — en krafan í Payday fær gjalddaga eftir 7 daga og eindaga 3 dögum síðar.'] },
    { id: 'pdf-uttekt', kodi: 'SV-15', gluggi: 'Enginn gluggi — merkið fer ALDREI á skjal sem kúnninn fær', ras: 'pdf', stada: 'handvirkt', felag: 'Slökkvitæki',
      heiti: 'Úttektarskýrslan (PDF)',
      hvadan: 'Búa til úttektarskýrslu / Klára heimsókn', hvert: 'Kúnni · Drive · Skjöl & viðhengi', sendir: '—',
      breytur: '{mánuður} {ár} {úttektarlýsing} {athugasemdir} {skoðunaraðili}',
      textar: [{ heiti: 'Fastir hlutar', t: 'Tæki voru yfirfarin af Slökkvitæki ehf í {mánuður} {ár}\n…8 flokkar tækja…\nAnnað: {úttektarlýsing}\nAthugasemdir: {athugasemdir — sjálfgefið „Engar athugasemdir"}\nFyrir hönd Slökkvitæki ehf\n{skoðunaraðili}' },
               { heiti: 'Skráarnafn á Drive', t: '{nafn} - {heimilisfang} - {kt} - {ár} - {mánuður} - úttektarskýrsla - #{id}.pdf' }],
      skrar: ['js/patches/168-company-inspection-report.js:64-71, 140, 156, 176-193, 260, 474, 536'],
      reglur: ['Sjá flipann Úttektarlýsing fyrir reglurnar um „Annað".'] },
    { id: 'tilbod-hub', kodi: 'SV-16', gluggi: 'Ekki merkt enn', ras: 'pdf', stada: 'handvirkt', felag: 'Brunahólf',
      heiti: 'Tilboðssmiður húsfélaga (hub)',
      hvadan: 'brunaholf.netlify.app/tilbod → Prenta / Sækja .docx', hvert: 'Prentað eða Word-skjal — sendist ekki úr kerfinu', sendir: '—',
      breytur: '{heimilisfang} {verð} {ár}',
      textar: [{ heiti: 'Inngangur', t: 'Vísað er til erindis húsfélagsins um tilboð í yfirferð á brunavörnum í sameign fasteignarinnar að {heimilisfang} … skv. byggingarreglugerð nr. 112/2012 og reglugerð nr. 723/2017 … ÍST EN 3.' },
               { heiti: 'Skilmálar', t: 'Tilboð gildir í 30 daga frá útgáfudegi.\nSamningur: bundinn vísitölu HMS, mest 5% hækkun á ári, 2 mánaða uppsögn, 10% afsláttur af aukaverkum, minnt á með tölvupósti tveimur vikum áður.' }],
      skrar: ['brunaholf/public/tilbod/index.html:966-1160 (forsýn), ~1440-1610 (docx)', 'brunaholf/public/tilbod/build_tilbod.js:438-628'],
      athuga: ['Textinn er skrifaður þrisvar (forsýn, Word, build_tilbod.js) — breyting þarf á þremur stöðum.', 'Greiðslufrestur 14 dagar í samningshluta en 10 dagar í uppsetningarhluta.', '„Minnt á með tölvupósti tveimur vikum áður" — enginn kóði sendir þá áminningu.', '„Spyrja Luna um þetta tilboð" virkar aldrei (window.luna er ekki til).'],
      url: 'https://brunaholf.netlify.app/tilbod/', faraHeiti: 'tilboðssmiðinn' },
    /* ── Payday ── */
    { id: 'payday-krafa', kodi: 'SV-17', gluggi: 'Enginn sér gluggi (takki í Kröfu yfirliti)', ras: 'payday', stada: 'fast', felag: 'Slökkvitæki',
      heiti: 'Krafa í Payday — Senda kröfu',
      hvadan: 'Kröfu yfirlit → „Senda kröfu" · „Senda valdar í Payday" · „Í Payday sem drög"', hvert: 'Payday → bankakrafa á kennitölu + póstur Payday sjálfs',
      sendir: 'Payday (sitt eigið sniðmát)', breytur: '{staður} {nr} {heimilisfang} {nóta} {R-númer}',
      textar: [{ heiti: 'Lýsing reiknings', t: 'Vegna: {staður} – nr. {nr} – {heimilisfang} · {nóta, hreinsuð}' },
               { heiti: 'Lýsing línu', t: '{lýsing línu}   (annars nafn vöru, annars „Vara")' },
               { heiti: 'Tilvísun og frestir', t: 'Tilvísun: {R-númer}\nGjalddagi: útgáfa + 7 dagar · Eindagi: gjalddagi + 3 dagar' }],
      skrar: ['netlify/functions/payday-push.cjs:360-497 (buildPayload)', 'netlify/functions/payday-push.cjs:401-405 (hreinsaNotu)', 'js/patches/166-krofu-yfirlit.js:1988-2051'],
      reglur: ['VÖRÐUÐ LEIÐ (öryggisnetið) — breyting fer um netvörð.', 'Nafn og heimilisfang staðar fara aðeins með ef kt staðarins = kt sölunnar.', 'hreinsaNotu fjarlægir „Kt:…", „[Sótt…]", „Payday #N PAID", „(leiðrétt…)", „Sótt ✓".', 'Colas: „Beiðni nr: …" verður að vera í nótunni.'],
      fara: 'krofu-yfirlit', faraHeiti: 'Kröfu yfirlit' },
    { id: 'kredit', kodi: 'SV-18', gluggi: '„Kreditreikningur"-glugginn (26)', ras: 'payday', stada: 'fast', felag: 'Slökkvitæki',
      heiti: 'Kreditnóta og leiðréttur reikningur',
      hvadan: '„Kredit" · „Kredit + breyta" · Kröfu yfirlit → „Bakfæra (kreditreikningur)"', hvert: 'Sölur (kreditnóta) · Payday: full kredit á ógreiddum = krafan felld niður',
      sendir: '—', breytur: '{ástæða} {nr}',
      textar: [{ heiti: 'Textar', t: 'Kreditfærsla: {ástæða}\nKreditfærsla á reikning {nr}\nLeiðréttur reikningur (kredit á {nr})' }],
      skrar: ['js/patches/26-credit-invoice.js:210-241, 344, 562'] },
    /* ── Svör við póstum ── */
    { id: 'svar-ai', kodi: 'SV-19', gluggi: '„Aðstoð — yfirlit, svar & skjöl" (240)', ras: 'svar', stada: 'ai', felag: 'Slökkvitæki',
      heiti: 'Svar við pósti — gervigreind (Reikninga-póstur)',
      hvadan: 'Reikninga-póstur → „Svar" → „Semja svar" → „Senda svar" · líka „Semja uppkast" í listanum', hvert: 'Sá sem sendi, í sama þræði',
      sendir: 'Pósthólfið sem tók á móti', breytur: '{nafn} {kt} {12 nýjustu reikningar} {pósturinn} {leiðbeining}',
      textar: [{ heiti: 'Leiðbeiningar til gervigreindarinnar (prompt)', t: 'Þú ert kurteis þjónustufulltrúi hjá Slökkvitæki ehf (eldklar@eldklar.is, kt 600508-0400).\nStutt, hlýlegt svar á íslensku, undir ~120 orð. Svaraðu beint því sem spurt er um.\nEf beðið er um reikning/afrit, staðfestu að við sendum hann.\nEkki búa til upphæðir, númer eða dagsetningar. Ekki lofa því sem er óvíst.\nUndirskrift: Kveðja,\\nSlökkvitæki ehf\\neldklar@eldklar.is\nSnið: EFNI: / YFIRLIT: / BEÐIÐ: / TILVISUN: / ATHUGASEMD: / ---SVAR---' },
               { heiti: 'Flýtileiðbeiningar', t: 'Sendi reikning · Bið um uppl. · Leiðrétti reikning · Staðfesti greiðslu' }],
      skrar: ['netlify/functions/postur-reply.js:52-93', 'js/patches/240-reikninga-postur.js:1804-1962'],
      reglur: ['Skrifstofan les alltaf yfir áður en sent er.', 'Aldrei raunveruleg gögn sem dæmi í prompti; hitastig 0 (Charlize #514).'],
      athuga: ['„staðfestu að við sendum hann" — lofar skjali án þess að vita hvort það er til.', 'Undirskriftin „Slökkvitæki ehf" — aðrir póstar segja „Brunahólf Slökkvitæki ehf.".'],
      fara: 'reikninga-postur', faraHeiti: 'Reikninga-póst' },
    { id: 'svar-thjonustuver', kodi: 'SV-20', gluggi: '„Svara"-glugginn (309)', ras: 'svar', stada: 'ai', felag: 'Slökkvitæki',
      heiti: 'Þjónustuver póstar — Svara',
      hvadan: 'Þjónustuver póstar → „Svara" → „Leiðbeining til AI" → „Semja uppkast" → „Senda svar"', hvert: 'Sá sem sendi',
      sendir: 'emailFrom()', breytur: '{pósturinn} {leiðbeining}',
      textar: [{ heiti: 'Leiðbeiningar', t: 'Sama prompt og Reikninga-póstur (postur-reply.js), en án reikninga og án kennitölu.' }],
      skrar: ['js/patches/309-thjonustuver-postar.js:457-515'],
      athuga: ['Svarið fer EKKI í sama þráð (ekkert inReplyTo) — kúnninn fær nýjan póst í stað svars.'],
      fara: 'thjonustuver-postar', faraHeiti: 'Þjónustuver pósta' },
    { id: 'svar-cowork', kodi: 'SV-21', gluggi: 'postsvorun.html — hausinn', ras: 'svar', stada: 'ai', felag: 'Slökkvitæki',
      heiti: 'Póstsvörun — drög frá Cowork',
      hvadan: 'postsvorun.html — drög sem Cowork/Claude skrifa', hvert: 'Póstforrit (mailto „Re: {efni}") eða afrit',
      sendir: 'Póstforrit vélarinnar', breytur: '{efni} {drög}',
      textar: [{ heiti: 'Hvaðan textinn kemur', t: 'Tafla cowork_postsvor.drog — skrifuð af agentunum, má breyta og vista aftur.' }],
      skrar: ['postsvorun.html:143-171'] },
    { id: 'svar-svarhjalp', kodi: 'SV-22', gluggi: 'Ekki merkt enn', ras: 'svar', stada: 'ai', felag: 'Brunahólf',
      heiti: 'Svarhjálp (hub)',
      hvadan: 'brunaholf.netlify.app/email-helper.html — enginn hlekkur vísar á síðuna', hvert: 'Afrit á klemmuspjald — sendir ekkert',
      sendir: '—', breytur: '{pósturinn} {punktar} {tónn}',
      textar: [{ heiti: 'Reglur í promptinu', t: 'fágað, tilbúið svar sem má senda\ntónn valinn í fellilista\nkveðja í upphafi, „Með kveðju, Slökkvitæki ehf" í lokin\nEkki finna upp verð eða dagsetningar\nNefna viðhengi aðeins ef skjal fannst' }],
      skrar: ['brunaholf/email-helper.html:133-258', 'brunaholf/netlify/functions/luna.js:5-47'],
      athuga: ['Munaðarlaus síða með harðkóðuðum skjalalista frá apríl–maí 2026.'] },
    /* ── Annað: áminningar, SMS, afrit ── */
    { id: 'aminning-skodun', kodi: 'SV-23', gluggi: '„Senda skoðunaráminningar" (37)', ras: 'annad', stada: 'fast', felag: 'Slökkvitæki',
      heiti: 'Skoðunaráminningar (póstur og SMS)',
      hvadan: '„Senda áminningar" → „Senda skoðunaráminningar"', hvert: 'Póstforrit (mailto) eða SMS', sendir: 'Póstforrit / sími',
      breytur: '{nafn} {raðnr} {tegund} {dags} {fjöldi} {sími}',
      textar: [{ heiti: 'Efni', t: 'Áminning — skoðun slökkvitækja hjá {nafn}' },
               { heiti: 'Meginmál', t: 'Góðan dag,\n\nSlökkvitæki ehf hér með áminningu um að eftirfarandi slökkvitæki eru á gjalddaga skoðunar:\n  • {raðnr} — {tegund} — skoðun: {dags}\n\nVinsamlegast hafðu samband …\n\nSlökkvitæki ehf\n{sími}' },
               { heiti: 'SMS', t: 'Slökkvitæki ehf: {fjöldi} tæki hjá {nafn} eru á gjalddaga skoðunar ({dags}). Hafðu samband til að bóka tíma. {sími}' }],
      skrar: ['js/patches/37-bulk-reminders.js:173-180, 330, 345'] },
    { id: 'sms-tilbuid', kodi: 'SV-24', gluggi: 'SMS-stillingar — „Sniðmát skilaboða" (33)', ras: 'annad', stada: 'stillanlegt', felag: 'Slökkvitæki',
      heiti: 'SMS — tæki tilbúið til afhendingar',
      hvadan: 'Afgreiðsla → „Opna SMS"', hvert: 'Sími kúnna (SMS-forrit, eða Twilio sé það stillt)', sendir: 'Sími',
      breytur: '{nafn} {num} {sími}',
      textar: [{ heiti: 'SMS (sjálfgefið — má breyta í stillingum)', t: 'Góðan dag {nafn}! Slökkvitæki ehf hér. Tæki þitt (verk #{num}) er tilbúið til afhendingar. Vinsamlegast sæktu það eins fljótt og auðið er. Sími: {sími}.' }],
      skrar: ['js/patches/33-sms-reminder.js:33-35, 408, 434'],
      athuga: ['Sniðmátið er geymt í vafranum (sms_template) — vél sem breytir því breytir aðeins sínu eintaki.'] },
    { id: 'skoda-tengill', kodi: 'SV-25', gluggi: '„Tengill tilbúinn" (94)', ras: 'annad', stada: 'fast', felag: 'Bæði',
      heiti: 'Tengill á árlega brunakerfisskoðun',
      hvadan: 'Slökkvitæki: „Senda link á kúnna" → „Opna Gmail" · Hub: Skoðanir → „Senda nýjan link" / „Pósta"', hvert: 'Gmail-gluggi eða póstforrit', sendir: 'Póstforrit',
      breytur: '{verkkaupi} {slóð}',
      textar: [{ heiti: 'Efni', t: 'Brunakerfi skoðun — {verkkaupi}' },
               { heiti: 'Meginmál', t: 'Sæll/sæl,\n\nHér er tengill til að fylla út árlega skoðun á brunakerfinu hjá {verkkaupi}:\n\n{slóð}\n\nGildir í 14 daga.\n\nKveðja,\nSlökkvitæki ehf' }],
      skrar: ['js/patches/94-document-templates.js:1118, 1337, 1384-1389', 'brunaholf/index.html — leita að „Gildir í 14 daga"'],
      athuga: ['Í hubbinu er línubilið skrifað „\\\\n" — pósturinn sýnir líklega „\\n" í stað nýrrar línu.'] },
    { id: 'greidsluupplysingar', kodi: 'SV-26', gluggi: 'Við „Afrita texta" í kröfu-vinnuglugganum (369)', ras: 'skjar', stada: 'fast', felag: 'Slökkvitæki',
      heiti: 'Greiðsluupplýsingar — Afrita texta',
      hvadan: 'Kröfu-vinnugluggi → „Afrita texta"', hvert: 'Klemmuspjald — límt í póst', sendir: '—', breytur: '{nr} {dags} {upphæð} {gjalddagi}',
      textar: [{ heiti: 'Texti', t: 'Efni: Greiðsluupplýsingar – reikningur {nr} frá Slökkvitæki ehf.\n… var gefinn út {dags}, en bankakrafa stofnaðist ekki …\nUpphæð: {upphæð} · Gjalddagi: {gjalddagi}\n[BANKAREIKNINGUR — fylla inn áður en sent er]\nSkýring greiðslu: {nr}\nBrunahólf Slökkvitæki ehf.' }],
      skrar: ['js/patches/369-krofu-vinnugluggi.js:849-862, 937, 1243'],
      athuga: ['Bankareikningurinn er staðgengill sem þarf að fylla inn í hvert sinn.'] },
    { id: 'heilsa-hub', kodi: 'SV-27', gluggi: 'Enginn gluggi (sjálfvirkt)', ras: 'annad', stada: 'fast', felag: 'Brunahólf',
      heiti: 'Dagleg heilsa (sjálfvirkt, innanhúss)',
      hvadan: 'Sjálfvirkt kl. 07:10 — aðeins ef eitthvað er að', hvert: 'brunaholf@brunaholf.is', sendir: 'Brunahólf <eldklar@eldklar.is>',
      breytur: '{fjöldi} {ábendingar}',
      textar: [{ heiti: 'Efni', t: 'Brunahólf — dagleg heilsa: {fjöldi} ábending(ar)' }],
      skrar: ['brunaholf/netlify/functions/daily-health.js:29-32, 129-131, 223-243'] }
  ];
})();
/* === END SVAR-STÖÐ — GÖGNIN === */
