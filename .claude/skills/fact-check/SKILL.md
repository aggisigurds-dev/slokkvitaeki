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

## Áður en þú skrifar

Afritaðu töfluna fyrst (`create table backup_… as select * from …`), keyrðu
`node tools/audit-all.cjs`, og segðu hvað var mælt fyrir og eftir.
