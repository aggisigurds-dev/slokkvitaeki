# Ársskoðun annarra brunavarnakerfa — hvað á að skoða og hve oft

Rannsakað 10.11.2026 þegar grunnur verðlistanna (`js/patches/502-verdlistar.js`, Vörur og þjónusta) var settur: Sprinklerkerfi,
Neyðarljós, Eldvarnaeftirlit, Reyklosun, Stigleiðsla, Háfakerfi (eldhúsháfar, bætt við 11.11.2026). Hér er það sem reglur og leiðbeiningar HMS segja um **eftirlit og viðhald** hvers
kerfis — tíðni, hver má, og hvað er skoðað — með tenglum. Verð eru EKKI hér og voru ekki sett í listana; Agnar verðleggur.

**Fyrirvari:** staðlarnir sjálfir (ÍST EN 12845, 50172, 12101) eru seldir og voru ekki lesnir. Það sem stendur um innihald þeirra er úr
leiðbeiningum HMS og úr eftirmálum (yfirlitsgreinum). Vitnaðu í HMS-leiðbeininguna, ekki í staðalgrein, nema staðallinn hafi verið lesinn.

---

## Yfirlit

| Kerfi | Krafa um eftirlit | Tíðni | Hver | Heimild |
|---|---|---|---|---|
| **Vatnsúðakerfi (sprinkler)** | „Gerðir skulu þjónustusamningar við viðurkennda aðila um viðhald og eftirlit." Viðhald og eftirlit skv. ÍST EN 12845 | Vikulega og mánaðarlega (notandi); ársfjórðungs-, hálfsárs-, árs-, 3 ára og 10 ára (þjónustuaðili); úðastútar eftir 25 ár | Þjónustuaðili með starfsleyfi HMS fyrir **slökkvikerfi** (ábyrgðarmaður: pípulagningameistari + námskeið HMS) | 112/2012 gr. 9.4.6 · HMS-leiðbeining 9.4.6 (útg. 1.0, 27.8.2025) · 1067/2011 |
| **Neyðarlýsing og útljós** | Rafhlöður álagsprófaðar árlega; prófanir skv. ÍST EN 50172 | Mánaðarleg virkniprófun · árleg prófun á fullum endingartíma (60 mín) · ljósmæling við afhendingu og á 5 ára fresti | Mánaðarprófun: þjálfaður starfsmaður má. Staðfesting til slökkviliðs: **rafvirkjameistari** | 112/2012 gr. 9.4.12 · HMS-leiðbeining 9.4.12 (útg. 1.5) · sjá `neydarlysing.md` |
| **Eigið eldvarnaeftirlit** | Skjalfest brunaöryggi, eldvarnafulltrúi, þjálfun og æfingar, viðbragðsáætlun | Mánaðarlegur gátlisti (7 liðir) ef > 50 manns, annars árlegur (15 liðir); rýmingaræfing árlega; slökkvitækjaþjálfun a.m.k. á 3 ára fresti | Eldvarnafulltrúi **eiganda** framkvæmir; við aðstoðum | 723/2017 10.–13. og 26. gr. · Eldvarnabandalagið (2025) · sjá `eigid-eftirlit.md` |
| **Reyklosun** | Eigendur láta framkvæma eftirlit með búnaði til reyklosunar | „Að minnsta kosti einu sinni á ári"; vélræn reyklosun prófuð viku-, mánaðar- og árlega skv. framleiðanda | „Aðilar með tilskilin réttindi" (ekki nánar skilgreint) | 112/2012 gr. 9.8.4 · HMS-leiðbeining 9.8.4, kaflar 5–6 |
| **Stigleiðsla** | Húseigandi lætur yfirfara allan búnað; þjónustusamningur skal liggja fyrir | Allur búnaður a.m.k. árlega · þurr stigleiðsla yfirfarin, ryð kannað og **þrýstiprófuð á a.m.k. 5 ára fresti** · dælu-, ræsi-, viðvörunar- og stýribúnaður a.m.k. tvisvar á ári | „Til þess bær þjónustuaðili"; þrýstiprófun staðfest af **pípulagningameistara** | 112/2012 gr. 9.8.5 · HMS-leiðbeining 9.8.5 (útg. 1.4, 23.11.2020), kaflar 6–7 |
| **Eldhúsháfar og útsogsrör** | „Háfa og stokka/rör skal hreinsa reglulega, mismunandi eftir notkun" | **Minnst einu sinni á ári**; loftsíur (fitugildrur) daglega ef með þarf; bræðivör slökkvibúnaðar skipt árlega | Hreinsun: „sérfróðir aðilar". Slökkvikerfi í háfi: aðeins aðilar með starfsleyfi HMS fyrir slökkvikerfi í eldhúsháfa | SHS „Útsogsrör, háfar, slökkvikerfi og Ozon-kerfi á veitingastöðum" · 112/2012 gr. 9.6.14 · HMS 6.048 |

---

## 1. Vatnsúðakerfi — HMS-leiðbeining 9.4.6 „Sjálfvirk slökkvikerfi"

Tengill: https://www.byggingarreglugerd.is/leidbeiningar/sjalfvirk-slokkvikerfi (útg. 1.0, 27.8.2025)

- „Gerðir skulu þjónustusamningar við viðurkennda aðila um viðhald og eftirlit." · „Húseigendum er skylt að viðhalda kerfunum."
- Vatnsúðakerfi: „Viðhald og eftirlit með vatnsúðakerfum skal vera í samræmi við ÍST EN 12845" (lágmark; viðbótarkröfur ef hannað er
  eftir öðrum staðli — HMS samþykkir NFPA 13 og NFPA 750, en þá skal fylgja NFPA í heild).
- Þokukerfi: skv. hönnunarstaðli (ÍST EN 14972-1) og DIOM-handbók framleiðanda. Íbúðakerfi: ÍST EN 16925.
- Eldvarnaeftirlit kannar við lokaúttekt og almenna skoðun hvort þjónustusamningar séu til staðar.
- **Samningsform í appinu (11.11.2026):** útfyllanlegur þjónustusamningur um eftirlit með vatnsúðakerfi — „Sprinkler-samningur" á
  Tilboð & samningar og „📜 Þjónustusamningur" í haus verðlistans Sprinklerkerfi (`js/patches/503-sprinkler-samningur.js`). Sjálfgefnar
  skoðanir eftir fyrirmynd Agnars: mánaðarleg skoðun 8× á ári (húseigandi), ársfjórðungsskoðun 4× og ársskoðun 1× (verktaki), akstur í
  hvert skipti, verðtrygging við byggingarvísitölu, gagnkvæmur þriggja mánaða uppsagnarfrestur.
- **Tilvísun í reglur — algeng villa:** eldri samningar vísa í „reglugerð nr 75/2000 frá Mannvirkjastofnun". 75/2000 eru **lög um
  brunavarnir**, ekki reglugerð, og Mannvirkjastofnun heitir nú HMS. Rétt tilvísun: lög 75/2000, byggingarreglugerð 112/2012 (gr. 9.4.6)
  og leiðbeining HMS 9.4.6, sem vísar í ÍST EN 12845 um viðhald og eftirlit.
- Vinni aðili ÁN starfsleyfis stærra verk þarf úttekt aðila með gilt starfsleyfi áður en kerfið er tekið í notkun að nýju.
- **Starfsleyfi:** svið „slökkvikerfi" í 1067/2011. Ábyrgðarmaður þarf að vera pípulagningameistari (eða sambærilegt) með námskeið sem HMS
  viðurkennir og skila gæðahandbók; leyfið gildir í 5 ár. https://island.is/starfsleyfi-fyrir-thjonustuadila-brunavarna/t-hjonustuadilar-sloekkvikerfa
- **ÍST EN 12845, kafli 20 (úr eftirmálum, staðallinn ekki lesinn):** 20.2.2 vikulegt og 20.2.3 mánaðarlegt (notandi: mælar, vatnsborð,
  lokastaða, vatnsklukka, sjálfræsing dælu, rafgeymar) · 20.3.2 ársfjórðungs (úðastútar, lagnir og upphengi, vatnsveita, viðvörun, lokar,
  flæðirofar) · 20.3.3 hálfsárs (þurrlokar, boð til slökkviliðs/vaktstöðvar) · 20.3.4 árs (dæla á fullu álagi, flotlokar, síur) ·
  20.3.5 3 ára (vatnsgeymar, lokar) · 20.3.6 10 ára (geymar hreinsaðir og skoðaðir að innan) · viðauki K: úðastútar prófaðir eftir 25 ár.

## 2. Reyklosun — HMS-leiðbeining 9.8.4

Tengill: https://www.byggingarreglugerd.is/leidbeiningar/reyklosun

- Kafli 5: „Reyklosunarbúnaðurinn skal prófaður í samkvæmt fyrirmælum framleiðenda." · „Vélræn reyklosun skal prófuð, viku-, mánaðar- og
  árlega samkvæmt fyrirmælum framleiðanda." · Hönnun skv. ÍST EN 12101; reyklúgur CE-merktar.
- Kafli 6: eigendur eða forráðamenn „þurfa … að sjá til þess að framkvæmt sé eftirlit með búnaði til reyklosunar", „af aðilum með tilskilin
  réttindi", „að minnsta kosti einu sinni á ári". „Reyklosunarbúnaðurinn skal því hljóta reglulegt viðhald."
- Reyklúga í gluggalausu stigahúsi: opnanleg frá jarðhæð, búnaður á áberandi stað, merkt „Reyklúga".
- Ekki í leiðbeiningunni: hver má gera viku- og mánaðarprófun, skráningarkröfur, varaafl og reykblásarar með nafni.
- Erlend viðmið (BS 7346-8, Smoke Control Association): árleg þjónusta þjálfaðs aðila að lágmarki — lúgur, opnunarbúnaður, stjórnstöð,
  rafhlöður, boð frá brunaviðvörunarkerfi (orsök og afleiðing), blásarar. Aðeins til hliðsjónar.

## 3. Stigleiðsla — HMS-leiðbeining 9.8.5

Tengill: https://www.byggingarreglugerd.is/leidbeiningar/stigleidsla (útg. 1.4, 23.11.2020)

- **Hvenær krafist:** hús yfir 18 m eða fleiri en 6 hæðir, kjallarar ≥ 10 m undir yfirborði, stigahús af gerð 2 og 3. Innra þvermál ≥ 80 mm.
- **Kafli 7 — eftirlit og viðhald:** húseigandi skal „a.m.k. einu sinni á ári láta yfirfara allan búnað stigleiðslunnar" · „Þurra stigleiðslu
  ber að yfirfara, kanna ryðmyndun og þrýstiprófa á að minnsta kosti fimm ára fresti" · dælubúnaður og ræsibúnaður prófaður a.m.k. tvisvar á
  ári (oftar ef framleiðandi segir) · viðvörunar-, stýri- og öryggisbúnaður a.m.k. tvisvar á ári · gallar lagfærðir án tafar ·
  „Afhenda skal viðkomandi slökkviliði afrit af öllum eftirlits-, viðhalds- og prófunargögnum."
- **Kafli 6.1 — þrýstiprófun (eftir uppsetningu/breytingu):** skoluð út, fyllt köldu vatni; „minnst 10 bör (1,0 MPa) en þó alltaf með 25%
  umfram mestan fyrirhugaðan notþrýsting", haldið í **2 klst**, mælt við inntak; öll samskeyti skoðuð. Dælt kerfi: rennslisprófun líka.
- **Kafli 6.2:** pípulagningameistari staðfestir (Viðauki 3, yfirlýsing vegna öryggis-/lokaúttektar); þjónustusamningur skal liggja fyrir.
- **Það sem er skoðað:** inndælingartengi (0,90–1,50 m hæð, skilti með dæluþrýstingi), slöngutengi á hæðum (yfirleitt 75 mm Storz) með
  renniloka og loki með keðju (2 mm gat), einstreymisloki (blaut), tæmingarloki á lægsta stað, þrýstimælar efst og við inntak, frostvörn
  (frostlögur bannaður), rauð skilti RAL 3000 / ISO 7010 F004, „Ræsihnappur stigleiðslu".
- Erlent viðmið til hliðsjónar (BS 9990): sjónskoðun á 6 mánaða fresti, vatnsþrýstipróf árlega. **Íslenska leiðbeiningin ræður: 5 ára fresti.**

## 4. Neyðarlýsing og eigið eldvarnaeftirlit

Fullunnið í `neydarlysing.md` (kafli 2–3) og `eigid-eftirlit.md`. Það sem verðlistarnir byggja á:
- Neyðarlýsing: árleg skoðun með prófun á fullum endingartíma, verð á hvert ljós, mánaðarleg virkniprófun, álagsprófun miðlægs
  rafhlöðukerfis, ljósmæling, staðfesting til slökkviliðs (Fylgiblað 1, rafvirkjameistari).
- Eigið eftirlit: mánaðarlegur og árlegur gátlisti, skriflegt eftirlit sett upp, viðbragðs- og rýmingaráætlun, rýmingar- og
  flóttaleiðauppdrættir, rýmingaræfing, þjálfun á slökkvitæki.

## 4b. Eldhúsháfar og útsogsrör — leiðbeiningar SHS (lesnar 11.11.2026)

Skjal: „Útsogsrör, háfar, slökkvikerfi og Ozon-kerfi á veitingastöðum þar sem steiking matvæla eða sambærileg matseld fer fram —
Leiðbeiningar fyrir veitingastaði, hótel, fyrirtæki og stofnanir" (Slökkvilið höfuðborgarsvæðisins, 10 bls., ódagsett).
Tengill sem svaraði: https://reykjavik.is/sites/default/files/USK/Heilbrigdiseftirlit/fraedsla/hafar-og-lagnir.pdf
(shs.is/upplysingar/hafar-og-lagnir og vefur.shs.is svöruðu ekki 11.11.2026.)

- **Hreinsun:** „Háfa og stokka/rör skal hreinsa reglulega, mismunandi eftir notkun, minnst einu sinni á ári og loftsíur daglega ef að
  með þarf. Hreinsun stokka/röra skal framkvæmd af sérfróðum aðilum." · „Hreinsun á eldhúsháfum er því besta vörn gegn slíkri hættu
  ásamt réttri gerð af háfum og stokkum/rörum."
- **Bræðivör:** „Bræðivör í sjálfvirkum búnaði skal skipta um árlega."
- **Útsogsrör (112/2012 gr. 9.6.14, meginregla 3):** heilsoðnar samsetningar, ganga órofin út, EI 30 B-s1,d0, „þannig gerðar að auðvelt sé að
  hreinsa þær", með eldvarnarbúnaði og fitugildrum. SHS: vökvaþétt, sem sléttust að innan, **gaumlúgur á um 4 m fresti**, lárétt rör með
  minnst 2 % halla að tæmingum, ótengd öðrum loftræsikerfum, skemmstu leið út. Spírórör eru ekki samþykkt innandyra.
  Efni t.d. 1,2 mm ryðfrítt stál 18/8 eða ≥ 1,5 mm galvanhúðað stál.
- **Háfar:** úr málmi (stál 1,09 mm / ryðfrítt 0,94 mm), vökvaþétt samskeyti, ná vel yfir öll eldunartæki; **fitugildrur (síur) í öllum
  háfum** sem leiða fitu í bakka; ljós af viðurkenndri gerð.
- **Ozon-kerfi:** ozon blásið í safnstokk ofan við háf, hvarfast við fitu; aska hreinsuð með M5 síum framan við útsogsblásara;
  búnaðurinn má ekki geta gengið nema blásarinn sé í gangi.
- **Slökkvikerfi í háfi** (112/2012 gr. 9.4.6, 9.6.19, 9.6.23; HMS-leiðbeining 6.048): sjálfvirk OG handvirk virkjun með sjálfstæða virkni;
  handboði í rýmingarleið í 1,0–1,2 m hæð, merktur; virkjun ræsir brunaviðvörunarkerfi hússins og slekkur sjálfvirkt á orkugjöfum (gas eða
  rafmagn) allra tækja undir sama háfi; slökkvitæki í eldflokki F á staðnum. „Aðeins aðilar sem hafa starfsleyfi Mannvirkjastofnunar til
  uppsetningu slökkvikerfa í eldhúsháfa … mega setja upp slökkvikerfin, gera úttektir á þeim og viðhalda þeim."
- **Hvenær slökkvikerfi (viðmið SHS):** flóttaleið um eldunarsvæði; hætta á að starfsfólk lokist inni; opið milli eldhúss og salar fyrir
  fleiri en 50 manns; stóreldhús þar sem eldur ylli miklu tjóni; matvælaframleiðsla með steikingu.
- **Í appinu:** skoðun slökkvikerfisins er „Slökkvikerfis skoðun" (🍳, patch 386) með eigin verðlista („Slökkvikerfis verð", 410).
  Verðlistinn „Háfakerfi" (502) nær yfir HREINSUN og skoðun háfa og röra — ekki slökkvikerfið, svo sama þjónusta eigi ekki tvö verð.
- **Ekki staðfest (lesið úr leitarniðurstöðu, skjalið náðist ekki):** að gagnaskilalisti SHS (15.06.2022) biðji um staðfestingu fagaðila á
  hreinsun háfa og röra innan síðustu 12 mánaða og á þjónustu slökkvikerfis innan 12 mánaða.
- Erlend viðmið til hliðsjónar (ekki íslensk regla): TR19 Grease — mikil notkun (12–16 klst/dag) á 3 mánaða fresti, meðalnotkun (6–12 klst)
  á 6 mánaða fresti; NFPA 96 — bræðivör úr málmblöndu skipt minnst hálfsárslega. **Íslenska leiðbeiningin ræður: minnst árlega.**

## 5. Réttindi — hvað Slökkvitæki ehf þarf til að selja þetta

| Þjónusta | Réttindi |
|---|---|
| Vatnsúðakerfi | Starfsleyfi HMS, svið **slökkvikerfi** (pípulagningameistari sem ábyrgðarmaður) — staðfesta hvort leyfi félagsins nær til þess |
| Stigleiðsla | „Til þess bær þjónustuaðili"; **pípulagningameistari** staðfestir þrýstiprófun |
| Neyðarlýsing | Engin starfsleyfisskylda (ekki svið í 1067/2011); **rafvirkjameistari** undirritar staðfestingu; uppsetning: löggiltur rafverktaki |
| Reyklosun | „Aðilar með tilskilin réttindi" — ekki skilgreint nánar; rafmagnsvinna krefst rafverktaka |
| Eigið eldvarnaeftirlit | Engin; eftirlitið sjálft er á ábyrgð eldvarnafulltrúa eiganda |
| Hreinsun háfa og útsogsröra | „Sérfróðir aðilar" (SHS) — engin starfsleyfisskylda fundin |
| Slökkvikerfi í eldhúsháfi | Starfsleyfi HMS fyrir **slökkvikerfi í eldhúsháfa** (uppsetning, úttekt og viðhald) |

## 6. Óvíst

- **„Hávakerfi" var háfar í eldhúsi** (Agnar 11.11.2026) — sjá kafla 4b. Auðkenni listans er áfram `havakerfi`, heitið „Háfakerfi".
- Hvort starfsleyfi Slökkvitækis ehf nær til sviðsins „slökkvikerfi" (vatnsúðakerfi) — ekki flett upp.
- Nákvæmt innihald ÍST EN 12845 kafla 20 og ÍST EN 12101 um viðhald — staðlarnir ekki lesnir.

## Heimildir

- Byggingarreglugerð 112/2012: https://island.is/reglugerdir/nr/0112-2012
- HMS-leiðbeining 9.4.6 Sjálfvirk slökkvikerfi: https://www.byggingarreglugerd.is/leidbeiningar/sjalfvirk-slokkvikerfi
- HMS-leiðbeining 9.8.4 Reyklosun: https://www.byggingarreglugerd.is/leidbeiningar/reyklosun
- HMS-leiðbeining 9.8.5 Stigleiðsla: https://www.byggingarreglugerd.is/leidbeiningar/stigleidsla
- HMS-leiðbeining 9.4.12 Neyðarlýsing: https://www.byggingarreglugerd.is/leidbeiningar/neydarlysing
- SHS — Útsogsrör, háfar, slökkvikerfi og Ozon-kerfi á veitingastöðum: https://reykjavik.is/sites/default/files/USK/Heilbrigdiseftirlit/fraedsla/hafar-og-lagnir.pdf
- Reglugerð um eldvarnir og eldvarnaeftirlit 723/2017: https://island.is/reglugerdir/nr/0723-2017
- Reglugerð um þjónustuaðila brunavarna 1067/2011: https://island.is/reglugerdir/nr/1067-2011
- Starfsleyfi þjónustuaðila slökkvikerfa: https://island.is/starfsleyfi-fyrir-thjonustuadila-brunavarna/t-hjonustuadilar-sloekkvikerfa
- EN 12845 kafli 20 (eftirmál): https://governmentbusiness.co.uk/node/30958 · https://www.thefpa.co.uk/news/fire-safety-advice-and-guidance/sprinkler-system-maintenance-and-testing-guidance
- BS 9990 stigleiðslur (eftirmál): https://www.bafsa.org.uk/assets/Downloads/BIF21WetDryRiser.pdf
- Reyklosun, viðhald (eftirmál): https://blog.coltinfo.co.uk/your-smoke-control-system-maintenance-responsibilities-the-colt-checklist
