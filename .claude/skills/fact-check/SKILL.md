---
name: fact-check
description: >
  Fact-check á tækjatölum og þjónustustöðu Slökkvitækis — ber saman fjórar
  heimildir (þjónustusamninga, úttektarreikninga, úttektarskýrslur og
  tækjaskrána) og segir hver víkur. Notaðu þegar spurt er „stemmir þetta",
  „hver er í þjónustu", „hvað á þessi kúnni mörg tæki", „af hverju er
  kostnaður 0 kr", „hverjir eru komnir fram yfir skoðun", eða þegar á að
  hreinsa þjónustulistann. Kveikjuorð: fact check, tríó, stemmir, úttekt vs
  reikningur, óskoðaður, fram yfir, þjónustulisti, tækjatala.
---

# Fact-check — fjórar heimildir, ein regla

Full vinnulýsing með tölum og sögu: **`docs/FACT-CHECK-YFIRFERD.md`**. Lestu
hana áður en þú breytir nokkru. Þetta skjal er stutta útgáfan.

## Heimildaröðin (Agnar 07.09.2026)

> „Tæknimaður hefur alltaf rétt fyrir sér. Þið hafið endalaust verið að fikta í
> tækjaskránni og ekkert að marka hana. Hún bara fylgir skýrslunni eða invoice."

1. **Skýrslan** — sannleikurinn.
2. **Reikningurinn** — næstbest.
3. **Tækjaskráin (`uttaeki`)** — afleidd. Stemmi hún ekki, er hún röng.

**Tækin eru TALA til að rukka eftir, ekki eignaskrá.** Raðnúmerin eru sjálfgerð
og merkingarlaus — ekki eyða tíma í þau og ekki biðja Agnar að úrskurða um þau.

## Byrjaðu alltaf hér

```bash
node tools/trio.cjs                # prófíll vs skýrsla vs reikningur
node tools/trio.cjs --listi        # hvert félag sem víkur
node tools/trio.cjs --fid 443      # eitt félag
```

## Reglurnar sem greina á milli

- **Úttekt eða búð:** reikningur sem ber **„Akstur" EÐA „Skýrslugerð og vottun"**
  er útkall. Hvorugt → búðarsala, og hún á ekki heima í samanburðinum.
- **Talning:** yfirferð + hleðsla + sala **lögð saman** (mælt: 61% á móti
  40/39/48% fyrir hinar reglurnar).
- **Reykskynjarar** eru taldir í skýrslu en **aldrei rukkaðir** → dragðu þá frá
  skýrslunni (61% → 71%).
- **CO₂ 100 gr. og gjaldalínur** eru ekki tæki.
- **Paraðu við hæsta reikning ársins**, ekki summu allra (71% → 73%).
- **Skýrsla sem les 0** er gloppa, ekki mæling — slepptu henni (73% → 75%).
- **Fjölstaða-kúnna má aldrei para á kennitölu.**

> **LEIÐRÉTT 08.11.2026 — „reykskynjarar eru aldrei rukkaðir" ER RANGT.** Mælt í
> `reikningslinur`: **143 reikningar rukka reykskynjara-YFIRFERÐ, 925 stykki, á 1.350–2.346 kr
> stykkið** (auk 63 lína af nýsölu, 247 stk). Reglan hér að ofan lýsir eldri Stólpa-reikningum;
> B-sniðs reikningar 2026 bera línuna „Yfirferð Reykskynjari 9V rafhl. Innif." og hún er
> raunveruleg rukkun.
>
> Afleiðing sem var mæld: reikningalesarinn sleppir þeirri línu og telur aðeins nýsöluna, svo
> **sex staðir sýndu falskt „tæki stemma ekki"** (251, 252, 290, 302, 309, 351) — sjá mál #1445.
>
> **Hvað á að gera í staðinn:** ekki draga reykskynjara frá sjálfkrafa. Mældu per reikning hvort
> yfirferðarlína er til fyrir þá; sé hún það telst hún með, sé hún það ekki telst hún ekki.
> Pörunarrökin í tólunum (`para-rekstrarfelag.cjs`, `bera-saman-reikninga.cjs`) voru EKKI breytt —
> þau bera enn „reykskynjarar aldrei", og það er þekkt skekkja sem bíður ákvörðunar, ekki villa
> sem má laga þegjandi því hún hreyfir pörun hjá öllum félögum.


## ⛔ Tvær geymslur fyrir sömu skýrslu — athugaðu ALLTAF báðar

- `app_settings.arsskodun_customers` — saga per ár, fyllt af multitool í
  brunahólf (`/api/skyrsla-bunadur`).
- `arsskodun_report_facts` — **ein röð per félag** (lykill = `fyrirtaeki_id`
  einn). Geymir nýjustu skýrsluna. Tríóið les ÞESSA.

Þær fara úr takt. 08.09.2026 áttu 62 félög nýrri skýrslu í fyrri geymslunni, og
**59 félög mældust „fram yfir skoðun" þótt þau hefðu verið skoðuð í ár.** Sú
tala rataði inn í markaðsgreiningu áður en hún fannst.

**Berðu geymslurnar saman ÁÐUR en „óskoðaður" listi er notaður í nokkuð.**

## Gildrur

- **`uttaeki` tengist á TVO vegu:** `fyrirtaeki_id` OG `client` (nafn). Teldu
  báðar leiðir — annars sýnist félag með tæki eiga núll. `audit-fk-join.cjs`
  ver þetta og fer rautt ef brotið er.
- **`fyrirtaeki.created_at` er innflutningsdagur**, ekki skráningardagur. Notaðu
  fyrstu raunverulegu virkni (`solur.created_at`, `customer_documents.doc_date`,
  `arsskodun_report_facts.report_year`).
- **Skráarheiti á Drive ljúga um dagsetningu.** Reikningsnúmerið inni í PDF-inu
  lýgur ekki.
- **Bréfhaus skýrslu ber kt Slökkvitækis sjálfs** (600508-0400) — fyrsta
  kt-hittið er alltaf rangt.
- **Ný og endurvakin félög:** saga sem vantar er EKKI sönnun um brottfall.
  Taktu aldrei félag úr þjónustu á þeirri forsendu einni.
- **Sagan geymir stundum skýrslur ALLRA staða hópsins** (kt-leki úr batch-lestri):
  Grjótháls bar 4 færslur fyrir 2026 og 7 fyrir 2025, allar frá systurstöðum.
  Mælt 06.10.2026: **119 félag+ár með fleiri en eina sögufærslu** (111 félög, mest
  15) og **138 facts-raðir með heimildarskjal af öðru ári** en `report_year` (17 af
  öðru félagi). „Skýrsla stangast á við reikning" þýðir oftar að geymslan sé röng
  en reikningurinn — **lestu PDF-ið** (`lesa` í para-rekstrarfelag) áður en þú dæmir.
- **Rekstrarfélög (margir staðir á kt):** reikningur ↔ skýrsla ↔ tækjaskrá eftir
  tölum per tegund, `reikningslestur.vegna` sker úr, einn reikningur ein skýrsla,
  tvíræð aldrei pöruð sjálfkrafa → skill **`rekstrarfelog-parun`**.

## Áður en þú skrifar

Afritaðu töfluna fyrst (`create table backup_… as select * from …`), keyrðu
`node tools/audit-all.cjs`, og segðu hvað var mælt fyrir og eftir.

## Þrjár heimildir sem „enginn reikningur" gleymir (08.–09.10.2026)

1. **Stólpa-reikningar á kennitölu** búa í `stolpi_reikningar` (kt10, tegund='reikningur') —
   ekki aðeins sem R-10xxxx-skjöl í `customer_documents`. 21 félög áttu reikning þar sem
   aldrei kom sem skjal (nafnamunur: „Bárugrandi 1,húsfélag" ≠ „Húsfélagið Bárugranda 1").
   Stólpi hætti 07.05.2026; heimsókn eftir maí á sölu í `solur` eða ekkert.
2. **Kreditfærslur**: sala með `credit_of` á sig er bakfærð og telst hvorki rukkun né
   ósent; Payday CREDIT/CANCELLED er aldrei greiðsla (`paid_date` á kreditinu villir).
3. **Búðarsala** (`vidskiptategund='bud'`, R-000531 JDÓ) getur verið úttektin sjálf.
Auk þess: 139 `uttaeki`-raðir bera status „Í lagi" og teljast ekki með í Ársskoðun
(`status='active'` er eina sían) — tækjatala úr `uttaeki` getur því verið of lág.

## Uppgjör 02.11.2026 — eftir október-yfirferðina og Samþykkja-endurmælinguna

- **Agnar 02.11: „Vill ekki lengur fá hálfar gisk false facts."** Hver fullyrðing ber heimild (tafla/R-númer/skjal/póstur) og mælidag, annars er hún skrifuð **ÓMÆLT** með ástæðu. Orðin „líklega/virðist/ætti að vera" fara ekki á borðið. Línur frá lesagentum eru „(ósannreynt af mér)" þar til ég hef endurkeyrt mælinguna (minni `feedback_engar_halfar_giskanir`).
- **Tafla ↔ tækjaskrá sannar lítið** (skýrslan er gerð úr tækjaskránni, `source=app`). Októberlistinn: 56 af 56 skýrslum (PDF lesin) stemma við tækjaskrá OG reikningslínur — raunverulegu gallarnir voru í skjölunum sjálfum: tafla „Í lagi: Já" á tæki sem textinn dæmir ónýtt/lekt (Vatnskarðsnámur, Brynja Hátún 10, Bíll.is), rangur mánuður í texta („September 2026" í október/júní), vantandi undirskrift, brengluð setning (`docs/OKTOBER-LISTI-FACTCHECK-20261101.md`). Berðu skýrslu við reikninginn, ekki skrána við sjálfa sig.
- **„Ósvarað" fullyrt aðeins eftir að `to_addresses` allra pósta þráðarins eru lesin** — starfsmaður/undirverktaki svarar oft úr eigin netfangi (#1358 Benni; #1349 „pöntunarstaðfesting" var 200.000 kr gjafakort). `has_attachment` er ekki sönnun um að viðhengi vanti (minni `feedback_osvarad_thridji_adili`).
- **„Bakfærð en gild í appinu" (11 sölur mældar 01.11) — aðeins 2 raunveruleg** (R-000407, R-000778). Hinar: endurútgefnar (R-000017, R-000357, R-000339), greiddar með korti (R-000505, R-000709) eða Agnar búinn að ákveða í `krafa_note` (R-000418). Lestu `krafa_note`, `greitt_med`, endurútgáfur og `credit_of` áður en sala er flögguð.
- **Húsfélag (sameign) og fyrirtækin í sama húsi eru ólíkir viðskiptavinir** — sama heimilisfang/tækjafjöldi er aldrei sönnun um tvítak (minni `feedback_sameign_vs_fyrirtaeki_i_husi`).
- **Skoðunarmánuður:** aldrei færður „til hagræðis". Skoðað í ár → á mánuð skoðunarinnar (eftir já); óskoðað → aðeins fram í næsta mánuð, aldrei afturábak. Opnun skýrslu í 168 skrifar mánuðinn sjálf (sjá `rekstrarfelog-parun` regla 12). Afrit í `backup_<dags>_*` fyrst.
- **Mælikvarðar sem þú getur endurkeyrt:** dauðir hlekkir = `v_factcheck_2026.daudir` (189→12 26.10, 12 mælt 02.11; stefna Agnars 0; 2022–23 raðir aldrei eytt — leita í Drive á innihaldi, ekki nafni); `link_ok=false` án skráar og án `is_duplicate` = 25; ótengd skjöl (`fyrirtaeki_id is null`, ekki dup) = 120; virk tæki án fyrirtækis = 0 (en dálkurinn er enn nullable).
- **Samþykkja-borðið (368/446) hefur nú Heimildir-blokk** (deploy 01.11, 53ca616c): les R-/Payday-/Stólpa-númer úr texta og sýnir stöðu úr grunninum + rauð merki (ÓGILD, BAKFÆRÐ, „App og Payday stangast á", „Engin heimild tengd"). Nýtt mál þarf því: R-númer orðrétt, `fyrirtaeki_id`, „mælt dd.mm.áááá". Mæld staða 01.11: af 71 máli voru 30 án „Byggt á".

## Úrskurðir Agnars sem gilda (uppgjör lota 16.10.2026)
- 07.09.2026: „ef uttektarskyrsla eda invoice stemma ekki þá er annahvort ekki a rettum stad" — frávik = mislagt skjal á systkinastað/annarri kt, ekki mæliskekkja. 14 hópar „sami staður, margar kt" (Armar/Armar Vinnulyftur, Hagvagnar hf/þjónusta, Hringdu/SAFÍR, BJB, Glitur/Rafha, Skipholt 50d); pósthólf umsjónarfélags (Þangbakki) er FALSKUR hópur.
- 08.09.2026 blár punktur (reikningur til, engin skýrsla): skrá tækjafjölda úr reikningnum (`tools/uttekt-graen-af-reikningi.cjs`) og merkja klarad — BÚA ALDREI TIL skýrslu („má ekki þykjast"); tækjatala er tala, ekki saga (generera EINU sinni).
- Skoðunarsaga liggur á þremur lögum (customer_documents, arsskodun_report_facts, Ársskoðunar-blob) auk uttaeki; PDF-hausinn ræður, ekki skráarnafn (Charlize #850). uttaeki.status „Í lagi"/ok (171 raðir) teljast ekki í Ársskoðun (#849).
