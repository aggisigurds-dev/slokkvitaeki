# Reglurnar sem bíta

Hver lína hér kostaði tíma einu sinni. Lestu áður en þú skrifar í `solur`, deployar, eða
snertir Payday/Teya/sync.

## Reikningar og sölur (Slökkvitæki)

**`solur.athugasemdir` PRENTAST BEINT Á REIKNINGINN** — birtist sem „vegna"-texti undir
kennitölu. Innri vinnslunótur og status eiga heima í `krafa_note`. Aldrei status í
athugasemdir.

**Til að sala birtist í kröfuyfirliti þarf fjóra reiti:** `greitt_med='reikningur'`,
`customer_base_id`, `upphaed_an_vsk` OG `vsk_upphaed` — ekki bara samtals. POS-leiðin setur
þetta sjálfkrafa, **bein SQL-innsetning gerir það ekki.** Þetta er algengasta ástæðan fyrir
„salan er til en sést hvergi".

**Aldrei `delete` á sölu.** Tvítektir eru bakfærðar: `status='void'` + falin. Sölunúmer hafa
endurnýtst — það er þekkt villa, ekki merki um að þú hafir gert eitthvað rangt.

**Afrit fyrir hverja eyðileggjandi aðgerð**, tafla með dagsetningarforskeyti:
`backup_YYYYMMDD_<hvað>`. Þetta hefur bjargað málum oftar en einu sinni.

## Sync og mælaborð

**Ekki byggja nýja útgáfu af module sem er þegar til.** Bein fyrirmæli frá Agnari: *„I don't
need to build so many differents of the same module. Use the one that works and use that
everywhere."* Tímavera-sync í Kröfuyfirliti með `timavera_meta` (ein lína, upsert per import:
`last_import`, `source_file`, `row_count`) er mynstrið sem virkar — endurnýttu það fyrir
Payday, Redder, Ajour. Ekki búa til `sync_meta` eða aðra afbrigði.

**„Sync virkar ekki" er oftast framendavilla.** Payday-sync 25. júlí keyrði rétt (352 raðir
inn á réttum tíma) en mælaborðið sýndi harðkóðaða dagsetningu og endurspurði ekki eftir sync.
Staðfestu alltaf í gagnagrunninum áður en þú ferð að laga sync-inn sjálfan.

Sama gildir víðar: rekstrarfélög og úttektarskýrslur „birtast rangt" í appinu — gögnin eru
rétt og heil, framendinn (index.html frá 22. maí) les bara ekki grunninn live.

## Gögn sem má ekki treysta

- **Tækjafjöldi (`uttaeki`) Brunahólfsmegin er auto-generaður placeholder.** Ekki raun-gögn.
- **Tækjalisti í árskoðun hefur verið rangur árum saman** — vinnublaðið ræður (sjá `sara`).
- **Úttektarskýrslur eru sóttar live úr Drive við hvert load**, ekki vistaðar í Supabase eins
  og reikningar. Þess vegna komu tvítektir upp aftur og aftur; `content_hash` í
  `skjalaheiti_log` er áreiðanlegi lykillinn.
- **221 virk fyrirtæki eru ótengd `customers_base`**, og 17+ nafna-part-dups með
  kt-stafavíxli. Búðu ekki til nýjan kúnna án þess að leita fyrst á kennitölu OG nafnbroti.

## Payday og Teya

Payday er API-tengt **Slökkvitæki** (`payday_invoices_slokk`; `reference` geymir innra
sölunúmer `R-xxx`, sem gefur nákvæma vörpun Payday-númer ↔ sala). Brunahólfsmegin er aðeins
eldri feed (`invoices`) án Payday-númera — engin `payday_invoices` tafla til fyrir það org.
Pull-hlið aðeins; push (útgáfa draga) var sleppt.

Teya: daglegt uppgjör kemur **frá `reporting@teya.com`** („Uppgjörsskýrslan þín frá Teya", með
viðhengi) í bokhald@eldklar.is, label „Teya uppgjör". Aðrir Teya-sendendur (noreply@, info@,
hjalp@) eru markaðspóstur eða kvittanir, og „Reikningur frá Teya" er Teya að rukka — **ekki
uppgjör.** Matcha á sendanda, ekki möppu.

## Póstflæði (eldklar)

Tvö label sem Agnar skilgreindi: **📘 Bókhald óafgreitt** = vantar bara skjal sent
(reikningur/skýrsla) → hópsvar. **🔴 Óafgreitt** = þarf mann á staðinn eða ákvörðun → eitt og
eitt. Reikningar eiga að síast beint úr innhólfi (barki.is / payday.is / veldix / stolpi →
🧾 Reikningar/Kvittanir, skip inbox) og þurfa ekkert svar.

Raunverulegi svarabunkinn er **20–30 póstar**, ekki hundruð. Hrá póststraumur og unninn
verklisti eiga að vera aðskildir — „flytja yfir" flytur póst inn á listann.

## Deploy og kóði

- Bundla áður en deployað er ef hægt er: 250 skrár per load er mælt vandamál, ekki tilfinning.
- `node --check <skrá>` áður en skrá er send upp. Ódýrt, grípur allt.
- Sæktu lifandi skrár beint í stað þess að bíða eftir að Agnar límí inn:
  `curl -s -L --max-time 30 https://slokkvitaeki.netlify.app/js/patches/<skrá>.js`
- **Base64-kóðað JavaScript í spjalli hefur læst heilli lotu.** Sendu kóða sem kóða.
- `.claude/settings.json` er gitignorað í slokkvitaeki og brunaholf (local-only), en trackað í
  luna-bridge. Það er ósamræmi, ekki villa til að laga.

## Þrjár uppsprettur falskra flagga

Þegar tala lítur illa út, athugaðu þessar þrjár áður en þú trúir henni:

1. **Sameiginleg kennitala.** Rekstrarfélög deila kt — Aðalskoðun er fjórir staðir á
   540994-2269. Uppfletting á kt lætur eina skýrslu duga öllum stöðunum. **Staðfestu á
   heimilisfangi** þegar kt á fleiri en einn stað. Í 297 félaga lista voru 34 línur kt-tvítök.
2. **Nafna-mátun í tækjatalningu.** `uttaeki.client` er mátað við heiti félagsins; örlítið önnur
   stafsetning gerir félagið „tækjalaust" þótt tækin séu til. Appið notar sömu aðferð, svo
   villan birtist eins báðum megin.
3. **🧾-merkin í appinu.** Þau eru ekki áreiðanleg. Byggðu á skráarheitum í Drive og röðum í
   `customer_documents`.

## Skjala-gloppan — flokkaðu áður en þú ályktar

„Félag án úttektarskýrslu" þýðir næstum aldrei að skoðun hafi gleymst. Fjórir flokkar:

| Flokkur | Hvað það þýðir |
|---|---|
| aðeins í Supabase, ekki í Drive | skjalið er til og opnanlegt — vantar afrit í möppuna |
| draugaröð | röð í skjalaskrá en engin skrá að baki |
| drive_file_id út fyrir möppuna | fært eða dauður hlekkur |
| ekkert skjal neins staðar | **eina flokkurinn sem er raunveruleg vöntun** |

Mæling 7.8.2026: 236 af 297 í lagi; af hinum 61 voru 38 · 8 · 7 · 8 í þessari röð.

Nafnaskipan skýrslu: `Fyrirtæki - Heimilisfang - kennitala - ár - mánuður - #nr.pdf`.
Ártals-lesarinn missir af skrám með undirstriks-nöfnum (auto-nafn við upphleðslu, 31 tilvik),
nöfnum án ártals (16) og nöfnum sem hafa verið klippt af (9).

## Þegar eitthvað passar ekki

Ekki giska á reikningslínur, ekki búa til tækjaflokk sem er ekki til hjá fyrirtækinu, ekki
stofna tækjalista upp á von og óvon. Þetta eru ákvarðanir Agnars — ein setning per tilviki,
ekki listi yfir allt sem gæti verið að.
