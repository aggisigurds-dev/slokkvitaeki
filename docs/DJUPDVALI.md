# Djúpdvali — svæfð borð

Agnar 13.10.2026: „mörg af síðunum í hliðarstikunni eru og verða ekkert notuð … má skoða að eyða þeim alveg eða setja
í djúpdvala." Hann valdi borðin hér að neðan. Þau voru þegar falin í hliðarstikunni (`sidebar_hidden`), en kóðinn
hlóðst samt í hverri ræsingu, teiknaði borðin í DOM, sótti gögn og vafði `App.switchView`.

**Djúpdvali = script-merkið er kommentað út í `index.html`.** Skrárnar eru óbreyttar í `js/patches/`.
`build-dist.js` sleppir merkjum innan athugasemda (regla frá 05.10.2026, sama form og 145 og `demoseed.js`).
Ekkert var eytt.

| Borð | Skrár | Síðast notað (gögn) | Athugasemd |
|---|---|---|---|
| Verkdagbók | `04-verkdagbok`, `09-verkdagbok-attachments`, `45-verkdagbok-photos` | færsla 04.06.2026, mynd 04.05.2026 | sótti 3 köll við hverja ræsingu |
| Aldursgreining | `23-aging-report` | — | Kerfisskráin (221): „virðist munaðarlaust" |
| Staðan | `345-stadan` | — | |
| Þjónustuverk | `172-thjonustuverk` | — | 221: „skarast við 182 (Þjónustuver)" |
| Beiðnir | `178-beidnir` | — | kallar `Tilbod.openQuote` (varið) |
| Leiðbeiningar | `124-leidbeiningar` | — | vísaði á skrá sem er ekki til (404 í hvert sinn) |
| Móttaka | `179-mottaka-arrival` | (`taeki_events` hefur engan tímastimpil) | gæti verið árstíðabundið |
| Vertíð | `210-vertid-mottaka` | sama | gæti verið árstíðabundið — vekja fyrir vertíð |

Samtals ~360 KB af kóða sem þarf ekki lengur að þátta í hverri ræsingu.

## Hvað var athugað áður en svæft var

- **Alþjóðleg föll þeirra** (`window.Verkdagbok`, `AgingReport`, `Vertid`, `Tilbod` …) eru aðeins notuð annars staðar
  á varinn hátt (`window.X && …`): 16 (Verkdagbok.refresh), 61 (AgingReport.open), 211 (Vertid.reload).
- **`App.switchView`-umbúðir** (345, 172, 178, 179, 210) sjá aðeins um sitt eigið borð — keðjan helst heil án þeirra.
- **Audit-próf** sem nefna 09, 178 og 210 lesa innihald skránna, ekki merkin í `index.html` — óbreytt.

## Vörðurinn: `465-djupdvali.js`

Sé svæft borð opnað (gömul slóð `#verkdagbok`, bókamerki, takkinn „Sjá dagbók" í 61) myndi grunn-`switchView` gera öll
borð óvirk og skilja aðalsvæðið eftir autt. 465 sendir þá á Þjónustuborðið og segir frá því.

## Að vekja borð

1. Taktu `<!-- DJÚPDVALI … -->`-kommentið utan af merki hverrar skráar borðsins í `index.html`.
2. Fjarlægðu lykil borðsins úr `SVEFN` í `js/patches/465-djupdvali.js`.
3. Viljirðu að borðið sjáist í hliðarstikunni: taktu það úr „Aðlaga hliðarstiku" (`sidebar_hidden`).
