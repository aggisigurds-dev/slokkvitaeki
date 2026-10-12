/* verkfaeri.js — EIN skrá yfir öll verkfæri Þjónustugáttarinnar (12.10.2026, Agnar: „geta virkjað eða óvirkjað hin ýmsu tól").
 *
 * Hlaðið í gatt/index.html OG gatt-admin/index.html. Þjónninn (netlify/functions/_gatt-verkfaeri.cjs) ber sömu skrá —
 * vörðurinn tools/audit-gatt-verkfaeri.cjs fellur rautt ef lyklarnir stangast á.
 *
 *   k          lykill í portal_users.syn (okkar rofi, gatt-admin) og portal_users.stillingar.verkfaeri (kúnninn felur)
 *   hopur      'grunnur' (eignasíðan) · 'stadall' (staðalbúnaður) · 'vidbot' (viðbótartól)
 *   sjalfgefid kveikt þegar ekkert er valið
 *   tilbuid    false = væntanlegt, rofinn er grár og tólið birtist hvergi
 *   fela       true = kúnninn má fela það sjálfur í „Stilla vinnusvæði"
 */
window.GATT_VERKFAERI = [
  // ── Eignasíðan ──
  { k: 'teikningar', heiti: 'Teikningar', lysing: 'Forskoðun hverrar hæðar með merkjum', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  { k: 'threed', heiti: '3D-mynd', lysing: 'Vistuð 3D-mynd hæðar', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  { k: 'nidurhal', heiti: 'Niðurhal teikninga', lysing: 'Kúnni getur sótt teikningu og 3D', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  { k: 'greining', heiti: 'Greining teikninga', lysing: 'Samantekt tækja, merkja og eldveggja af teikningum', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  { k: 'taeki', heiti: 'Tækjaskrá', lysing: 'Tegund, staðsetning, skoðunardagar', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  { k: 'skjol', heiti: 'Skýrslur og reikningar', lysing: 'Skjöl eignarinnar', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  { k: 'kerfi', heiti: 'Kerfi og kröfur', lysing: 'Kerfi hverrar eignar: skylt, til staðar, okkar', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  { k: 'fasteign', heiti: 'Greining fasteignar', lysing: 'Eignin, byggingarupplýsingar, brunavarnir úr byggingarlýsingu, kröfur, skjalasafn — kúnni velur hvað sést', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  { k: 'saga', heiti: 'Saga eignar', lysing: 'Tímalína: skoðanir, verk, skírteini, eldvarnabók', hopur: 'grunnur', sjalfgefid: true, tilbuid: true },
  // ── Staðalbúnaður ──
  { k: 'erindi', heiti: 'Erindi með stöðu', lysing: 'Móttekið → í vinnslu → lokið, með myndum', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'verkbeidni', heiti: 'Verkbeiðnir', lysing: 'Kúnni sendir verkbeiðni → Þjónustuborð; flipinn Verkbeiðnir', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'punktar', heiti: 'Verkbeiðnapunktar', lysing: 'Verkbeiðni sem punktur á teikningu með mynd; grænn þegar lagað', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'qr', heiti: 'QR-merki eignar', lysing: 'Leigutaki skannar og tilkynnir með mynd án innskráningar', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'eldvarnabok', heiti: 'Eldvarnabók', lysing: 'Mánaðarlegt eigið eftirlit, undirritað í gáttinni', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'vinnusvaedi', heiti: 'Mitt vinnusvæði', lysing: 'Flipinn sjálfur — einingarnar hér fyrir neðan eru hver með sinn rofa', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'checklisti', heiti: 'Checklisti', lysing: 'Frjáls atriði kúnnans með stjörnu og hökum', hopur: 'stadall', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'verkefni', heiti: 'Verkefni', lysing: 'Mín verkefni og verkbeiðnir til okkar sem gátlisti', hopur: 'stadall', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'dagatal', heiti: 'Dagatal', lysing: 'Skoðanir, viðhald, skírteini, frestir og erindi á mánaðardagatali', hopur: 'stadall', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'vidhald', heiti: 'Viðhaldsáætlun og skírteini', lysing: 'Tíðni per kerfi, næsta dagsetning, áminning, skírteini með gildistíma', hopur: 'stadall', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'kort', heiti: 'Kort og leit í Landeignaskrá', lysing: 'Allar eignir á korti; leit og „Bæta við eign"', hopur: 'stadall', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'baeta_eign', heiti: 'Bæta við eign', lysing: 'Kúnni bætir eign við úr Landeignaskrá HMS (utan þjónustu)', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'csv', heiti: 'Niðurhal (CSV, prenta)', lysing: 'Eignasafn, heimilisföng, erindi og verkefni í Excel', hopur: 'stadall', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'skjol_hlekkir', heiti: 'Skjöl og hlekkir', lysing: 'Borð kúnnans fyrir eigin skjöl og hlekki', hopur: 'stadall', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'leit', heiti: 'Leit yfir allt', lysing: 'Einn leitarreitur: eignir, verk, skjöl, checklisti', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'einkunn', heiti: 'Ánægjukönnun eftir verk', lysing: 'Ein spurning þegar verki lýkur, stjörnur 1–5', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'skyrsla', heiti: 'Eignarskýrsla og safnskýrsla (PDF)', lysing: 'Ein síða per eign eða allt safnið; skjalfesting 10. gr. fyrir eldvarnareftirlit', hopur: 'stadall', sjalfgefid: true, tilbuid: true },
  { k: 'vikupostur', heiti: 'Vikuleg samantekt í pósti', lysing: 'Mánudagsmorgun: á eftir, næstu skoðanir, opin verk, skírteini sem renna út', hopur: 'stadall', sjalfgefid: false, tilbuid: true },
  // ── Viðbótartól (12.10.2026: verktakar, kostnaður, rými, lyklar, orkumælar tilbúin; api + snjallkerfi væntanleg) ──
  { k: 'verktakar', heiti: 'Verktakaskrá með SLA', lysing: 'Fag, tengiliður, viðbragðstími, samningur og tryggingaskírteini með gildistíma — áminning í dagatali og vikupósti', hopur: 'vidbot', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'kostnadur', heiti: 'Kostnaðaryfirlit per eign', lysing: 'Reikningar okkar + eigin kostnaðarfærslur per eign per ár, áætlun næsta árs, CSV', hopur: 'vidbot', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'rymi', heiti: 'Rými og leigutakar', lysing: 'Rými per eign og hæð: leigutaki, tengiliður, stærð, leigusamningur til', hopur: 'vidbot', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'lyklar', heiti: 'Lyklar og aðgangur', lysing: 'Lyklaskrá per eign: merking, tegund, fjöldi, hver hefur, geymslustaður (engir hurðakóðar)', hopur: 'vidbot', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'orkumaelar', heiti: 'Orkumælar', lysing: 'Mælar per eign, álestur með mynd af mæli, notkun milli álestra, CSV fyrir ESG', hopur: 'vidbot', sjalfgefid: true, tilbuid: true, fela: true },
  { k: 'api', heiti: 'Útflutnings-API', lysing: 'Lesaðgangur með lykli fyrir eigin kerfi og Power BI', hopur: 'vidbot', sjalfgefid: false, tilbuid: false },
  { k: 'snjallkerfi', heiti: 'Snjallkerfi', lysing: 'Skynjari → sjálfvirk verkbeiðni með punkti á teikningu', hopur: 'vidbot', sjalfgefid: false, tilbuid: false },
];
