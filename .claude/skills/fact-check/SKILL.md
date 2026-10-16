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

## Úrskurðir Agnars sem gilda (uppgjör lota 16.10.2026)
- 07.09.2026: „ef uttektarskyrsla eda invoice stemma ekki þá er annahvort ekki a rettum stad" — frávik = mislagt skjal á systkinastað/annarri kt, ekki mæliskekkja. 14 hópar „sami staður, margar kt" (Armar/Armar Vinnulyftur, Hagvagnar hf/þjónusta, Hringdu/SAFÍR, BJB, Glitur/Rafha, Skipholt 50d); pósthólf umsjónarfélags (Þangbakki) er FALSKUR hópur.
- 08.09.2026 blár punktur (reikningur til, engin skýrsla): skrá tækjafjölda úr reikningnum (`tools/uttekt-graen-af-reikningi.cjs`) og merkja klarad — BÚA ALDREI TIL skýrslu („má ekki þykjast"); tækjatala er tala, ekki saga (generera EINU sinni).
- Skoðunarsaga liggur á þremur lögum (customer_documents, arsskodun_report_facts, Ársskoðunar-blob) auk uttaeki; PDF-hausinn ræður, ekki skráarnafn (Charlize #850). uttaeki.status „Í lagi"/ok (171 raðir) teljast ekki í Ársskoðun (#849).
