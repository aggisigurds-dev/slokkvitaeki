# Rukkunarkeðjan — ferilskýring, rótargreining og varnir (2026-08-13)

Rannsókn á rukkunarkeðjunni frá Sölu í banka eftir að Vélrás var tvírukkuð,
Center Hotels fékk ekki rafræn skjöl og kúnni fékk sendan reikning annars
fyrirtækis. Allar tölur mældar í gagnagrunni 13.08.2026 (mælingar Agnars,
staðfestar sjálfstætt).

---

## 1 · Ferillinn enda á milli (hvaða skrá/fall gerir hvað)

```
KASSI (js/pos.js)
  checkout: pmCode==='greitt_sidar' → status='drog', annars 'final'  [pos.js:1151]
  kort/pening → paid_at strax; reikningur/greitt_sidar ógreitt
  R-númer: patch 07 (sala-checkout-dialog) FOR-ÚTHLUTAR gegnum
    rpc next_reikningur_num() [07:337] svo kvittun sýni sama númer og DB.
    Trigger set_reikningur_num á solur: virðir forsett ^R-\d+$, annars nextval.
      ← RÓT tvínotaðra númera: forsett númer framar sekvensnum (bakfyllingar,
        kredit-pör) voru „virt“ án árekstrarskoðunar; sekvensinn náði þeim
        síðar og úthlutaði SÖMU númerum aftur. Lagað: sjálfgræðandi trigger.

DRÖG → FINAL
  patch 142 (sale-editor) „✅ Klára sölu“ → status='final'  [142:725]
  patch 121 (pickup-checkout) klárar greitt_sidar-drög við Sótt ✓
  NÚ EINNIG: kröfusending lyftir status í 'final' (payday-push writeback)

KRAFA Í BANKA — EIN LEIÐ: netlify/functions/payday-push.js
  Kallarar (allir í patch 166 krofu-yfirlit): stök sending [166:~959],
  afturköllun [~1084], bunkasending [~1254 sendSelectedQueue].
  payday-push: fetchSale → GÁTTIR (sjá kafla 3) → buildPayload →
    findOrCreateCustomer → createInvoice (status SENT, createClaim:true) →
    markSaleInvoiced: invoiced_at + krafa_sent_at + dk_invoice_id + status='final'
  Afhending [payday-push ~139-152]: body.delivery > fyrirtaeki.payday_delivery
    > (skýrsla fest → email) > sjálfgefið: rafrænt ef alvöru kt, annars email.
    payday_delivery ER lesið — en var NULL hjá 691/692 → sjálfgefna leiðin
    (rafrænt án afrits) keyrði alltaf. Center Hotels: alvöru kt → rafrænt →
    sendEmail=false → skjalið barst aldrei í pósti heldur.

GREIÐSLA
  payday-sync-paid.js: sækir (paid_at null, dk_invoice_id sett) — ÁN status-síu
  — spyr Payday, stimplar paid_at. ← Þess vegna fengu void-sölur greiðslu:
  void í appinu (patch 193 „eyða“ / 197 „ógilda“) setti BARA status='void'
  án þess að fella bankakröfuna; krafan lifði, kúnninn greiddi, sync stimplaði.
  payday-sync-cron.js: keyrir sync kl. 10 og 15 + NÚ rukkun_eftirlit()-póstinn.

VIÐHENGI
  payday-push findReportPdf: aðeins source='uttekt' (hart hlið), flett upp á
    customer_id + ár — kúnna-afmarkað ✓
  brunaholf drive-multitool existingDocId [~574]: reikningur var flett upp á
    invoice_number EINU ("R-nr er einkvæmur" — RANGT) ← RÓT rangs PDF.
    Lagað: krossað á customer_base_id, og ágiskunar-regla lesarans fjarlægð.
  Patch 199/253/190 uppflettingar eru base/fyrirtæki-afmarkaðar ✓
```

## 2 · Rótargreining — villurnar, AF HVERJU

**0 · Rangt PDF á rangan kúnna (R-114922/24/25/26).**
Lesarinn í drive-multitool hafði reglu sem greip HVAÐA 1-byrjandi sextölustaf
sem er í grennd við orðið „reikningur“ í OCR-texta — án nr.-akkeris. Stakur
tölustafur úr dagsetningu/síma varð „reikningsnúmer“ og fjögur ólík félög
enduðu með sama númerið. Uppflettingar á invoice_number einu (existingDocId)
gátu síðan parað skjal annars félags. **Lagað:** ágiskunar-reglan fjarlægð
(NULL frekar en giska), uppflettingin krossar á customer_base_id, daglegt
eftirlit flaggar árekstra.

**1 · Tvínotuð sölunúmer (5 númer, m.a. R-000598–600).**
Númeragjöfin sjálf er atómísk (reikningur_seq). Gatið: raðir settar inn með
FORSETTUM númerum framar sekvensnum — 22.07 fengu bakfærðar maí-sölur
(source='claude-krofuyfirferd') númer 598–600 utan sekvenssins; sekvensinn
gekk síðan sjálfur inn í þau númer og gaf þau nýjum POS-sölum sama dag.
Triggerinn „virti“ forsett númer án árekstrarskoðunar. **Lagað:** triggerinn
er sjálfgræðandi — forsett númer sem er til → nextval í staðinn (aldrei
hafnað, ALLTAF LEYFA VISTUN); forsett númer framar sekvens → setval-uppfærsla.
UNIQUE-vísir bíður hreinsunar (kafli 5).

**2 · Rafræn afhending (Center Hotels).**
payday_delivery ER lesið í payday-push — en stillingin var aldrei fyllt
(NULL 691/692). Sjálfgefna leiðin valdi „rafrænt“ fyrir alvöru kt og slökkti
þá á tölvupósti. Rafræni reikningurinn fór „út í tómið“ hjá kúnnum sem fylgjast
ekki með rafrænum skjölum, ekkert afrit í pósti. **Lagað:** afhendingargátt —
engin stilling OG ekkert netfang → 422-biðstaða (yfirskrifanleg). Backfill á
payday_delivery er ákvörðun Agnars (kafli 5, líklega 'both').

**3 · Tvírukkun (Vélrás R-000259/276 o.fl.).**
Salan var slegin inn TVISVAR (t.d. úttekt skráð af Elíasi, svo aftur á kassa
viku síðar — tvær leiðir inn sem vita ekki hvor af annarri). Eina „vörnin“ var
patch 197 (bokhald-yfirferd) sem FLAGGAR tvítök eftir á til handvirkrar
yfirferðar — greip Véltindar/Steypustöðina af því einhver yfirfór listann, en
ekkert stöðvaði sendinguna sjálfa. **Lagað:** tvítakagátt í payday-push (eina
sendingarhliðið): sama kt + sömu línur byte-eins + sama upphæð þegar komin í
kröfu → 409, yfirskrifanleg með force_duplicate. Eftirlitið flaggar byte-eins
pör daglega (fann strax Glym ehf. ×3: R-000590/593/617).

**4 · status laug (drög/void greidd).**
Kröfusending og greiðsla lyftu ekki status — 6 greiddar sölur stóðu sem
'drog' (264.302 kr) og 4 'void' fengu greiðslu (222.924 kr) af því void felldi
ekki bankakröfuna. Tekjuskýrslur sem sía á status='final' undirtelja; rétta
tekju-sían er paid_at IS NOT NULL. **Lagað:** payday-push writeback setur
status='final'; void-aðgerðir (193+197) fella nú Payday-kröfuna fyrst og
neita að void-a greidda sölu (kredit í staðinn).

**5 · Bunkinn sprengdi.** 7 kröfur á sömu kt á 78 sek (bakslags-hreinsun).
**Lagað (fyrsta skref):** bunkasendingin hópar valið á kennitölu og krefst
sérstakrar staðfestingar þegar sami kúnni fengi >1 kröfu í keyrslu, með
ábendingu um Sameina-flæðið. Full sameining-í-eina-kröfu er hönnunarákvörðun
(hvaða sala ber dk_invoice_id?) — tillaga í kafla 5.

**6 · Rukkað án kennitölu (15).** Ekkert skilyrti customer_base_id.
**Lagað:** base_id-gátt í payday-push (422, yfirskrifanleg force_no_base).

## 3 · Gáttirnar í payday-push (allar sendingar fara hér um)

| # | Gátt | Svar | Yfirskrift |
|---|---|---|---|
| 1 | status='void' | 409 | engin — void rukkast aldrei |
| 2 | vantar customer_base_id | 422 | force_no_base:true |
| 3 | byte-eins tvíburi þegar í kröfu (sama kt+línur+upphæð) | 409 + twin | force_duplicate:true |
| 4 | engin afhendingarleið (engin stilling, ekkert netfang) | 422 | force_delivery:true |

Writeback: `invoiced_at + krafa_sent_at + dk_invoice_id + status='final'`.
Vistun sölu er ALDREI stöðvuð — gáttirnar gilda aðeins um sendingu kröfu.

## 4 · Skorður og eftirlit (komið í gagnagrunninn 13.08)

- `solur_krafa_krefst_final` CHECK (krafa_sent_at IS NULL OR status='final')
  NOT VALID — **6 núverandi brot** (5 drog + 1 void, öll greidd)
- `solur_krafa_krefst_kt` CHECK (krafa_sent_at IS NULL OR customer_base_id IS
  NOT NULL) NOT VALID — **15 núverandi brot**
- `set_reikningur_num()` — sjálfgræðandi (sjá kafla 2.1)
- `rukkun_eftirlit()` — 8 gátlistar; payday-sync-cron keyrir daglega kl. 10/15
  og sendir póst á Agnar við frávik. Núverandi frávik = þekktu málin + Glymur ×3.
- Eftir hreinsun: `ALTER TABLE solur VALIDATE CONSTRAINT …` ×2 og
  `CREATE UNIQUE INDEX CONCURRENTLY solur_num_uniq ON solur(num);`
- dk_invoice_id: 208 raðir / 208 einstök gildi — hreint, ekki snert.

## 5 · Hreinsunar-SQL — TILLÖGUR, ÓKEYRT (ákvörðun Agnars)

```sql
-- 5a · Vélrás-endurgreiðslan: kredit á R-000276 (53.824 kr).
-- ATH: kreditið þarf LÍKA í Payday/dk (dk-id 365a2769-3cda-4ca8-9488-2938c280feeb)
-- — SQL-ið hér skráir aðeins bókhaldshliðina okkar.
INSERT INTO solur (num, customer_nafn, customer_kt, customer_base_id, linur,
  upphaed_an_vsk, vsk_upphaed, samtals, greitt_med, status, is_credit, credit_of,
  athugasemdir)
SELECT 'R-' || LPAD(nextval('reikningur_seq')::text, 6, '0'),
  customer_nafn, customer_kt, customer_base_id, linur,
  -upphaed_an_vsk, -vsk_upphaed, -samtals, greitt_med, 'final', true, id,
  'Kreditfærsla: tvírukkun á móti R-000259 (rannsókn 13.08.2026)'
FROM solur WHERE num='R-000276' AND NOT coalesce(is_credit,false);

-- 5b · customer_documents númeraárekstrar (VIRK rangt-PDF hætta):
-- mislesnu númerin fá NULL (skjölin sjálf standa óbreytt og áfram kúnna-tengd).
UPDATE customer_documents SET invoice_number = NULL,
  notes = coalesce(notes,'') || ' [invoice_number hreinsað 13.08.2026 — mislesið, sjá RUKKUNARKEDJAN]'
WHERE invoice_number IN ('R-114922','R-114924','R-114925','R-114926');

-- 5c · Tvínotuðu sölunúmerin fimm: seinni/óæðri röðin fær nýtt númer
-- (drog/kredit víkur, greidda final-röðin heldur númerinu sem kúnninn sá).
UPDATE solur SET num = 'R-' || LPAD(nextval('reikningur_seq')::text, 6, '0')
WHERE id IN (574, 646, 647, 648, 575);
-- 574=Jón(drog,527) · 646=Steypustöðin(kredit,598) · 647=Hjortur(drog,599)
-- 648=Gudnar(drog,600) · 575=Ferðafélag seinni(528) — SKOÐA 575 sérstaklega:
-- báðar greiddar; kúnninn sá bæði númerin. Kannski frekar 573 sem víkur.

-- 5d · Sex greiddar utan final → lyfta í 'final' (paid_at er sannleikurinn):
UPDATE solur SET status='final'
WHERE paid_at IS NOT NULL AND status='drog'
  AND num IN ('R-000391','R-000034','R-000109','R-000164','R-000057');
-- Void-greiddu fjórar (R-000060/061/176/473): ÁKVÖRÐUN per röð — var verkið
-- raunverulegt (→ final) eða á að endurgreiða (→ kredit)? Ekki fjöldakeyrsla.

-- 5e · payday_delivery backfill (tillagan: 'both' þar sem netfang er til,
-- 'electronic' annars — Agnar velur sjálfgefið):
UPDATE fyrirtaeki SET payday_delivery =
  CASE WHEN coalesce(netfang,'') <> '' THEN 'both' ELSE 'electronic' END
WHERE coalesce(er_i_thjonustu,false) AND payday_delivery IS NULL;

-- 5f · Byte-eins pörin til dóms (mat úr rannsókn):
--   Strandasel R-000397/418 (1 dagur, sami starfsm.)  → líklegt tvítak → kredit
--   Stóragerði R-000351/417 (7 dagar, Elías→Kassi)    → líklegt tvítak → kredit
--   Teitur R-000523/524 (sami dagur, Kassi→Kassi)      → líklegt tvítak → kredit
--   Ferðafélag R-000017/528 (2 mán)                    → líklega tvö verk → halda
--   Glymur R-000590/593/617 (NÝFUNDIÐ, 186 kr ×3)      → skoða
-- Kredit-SQL eins og 5a, per númer sem Agnar staðfestir.

-- 5g · Netfang á 208 félög án netfangs: ekki hægt að skálda — listi til
-- handvirkrar söfnunar: SELECT id, nafn, kennitala, simi FROM fyrirtaeki
-- WHERE coalesce(er_i_thjonustu,false) AND coalesce(netfang,'')='';

-- 5h · Eftir 5c+5d: VALIDATE + UNIQUE
-- ALTER TABLE solur VALIDATE CONSTRAINT solur_krafa_krefst_final;  -- eftir 5d + void-ákvarðanir
-- CREATE UNIQUE INDEX CONCURRENTLY solur_num_uniq ON solur(num);   -- eftir 5c
```

## 6 · Frávik frá lýsingu verkbeiðninnar

- „Tveir númeragjafar án læsingar“ — næstum: gjafinn er EINN og atómískur;
  gatið var forsett númer FRAMHJÁ honum + engin árekstrarskoðun í triggernum.
- payday_delivery er lesið (ekki dautt reit) — en af því það var alls staðar
  NULL keyrði sjálfgefna leiðin alltaf, svo áhrifin voru eins og dautt reit.
- Byte-eins parið Ferðafélag R-000017/528 lítur út eins og tvö raunveruleg
  verk (2 mánuðir á milli) — samhljóða mati Agnars.
- Nýfundið í eftirliti: Glymur ehf. þrefalt byte-eins par (R-000590/593/617).
