# Afgreiðslan — tilbúin verk sem Agnar ýtir á

## Hvar

`/afgreidsla.html` · fall `netlify/functions/afgreidsla.cjs` · tafla `afgreidsla`.

## Hugmyndin

Agnar: *„forunnið það sem þú getur … svo ég geti í raun bara ýtt á staðfesta eða senda."*

Tony (eða sérfræðingur) setur inn **tilbúin** verk. Agnar ýtir á takka og aðgerðin
gerist strax — engin millistig.

## Tegundir verka

| Tegund | Hvað gerist við takkaýtingu |
|---|---|
| `tolvupostur` | Svar í þræði frá eldklar@/bokhald@ |
| `krafa` | Sala í Payday |
| `simtal` | Handrit + númer |
| `verk` | Fer á Verkefnalistann |

## Reitir í hverju verki

| Reitur | Lýsing |
|---|---|
| `takki` | Nákvæmlega hvað gerist — aldrei bara „Samþykkja" |
| `hvad_gerist` | Hvað Agnar sér gerast á skjánum |
| `af_hverju` | Staðreyndir MEÐ heimild (töflu, línu, dagsetningu) |
| `lykill` | Einkvæmur: `svar:<message_id>`, `krafa:<sale_id>` o.s.frv. |
| `virdi_kr` | Upphæð ef á við |

## Athuganir

Keyra við birtingu OG aftur rétt fyrir framkvæmd:
- Nýjasta skeytið í þræðinum (nýrra svar gæti breytt forsendum)
- Eyður `[…]` í svartextanum (ófullklárað)
- Viðtakandi er réttur (netfang, kt)
- Krafan ósend (ekki tvísenda)

## Hvað fer EKKI inn

- Ekki 100 % rétt → fer ekki inn
- Ágreiningsmál (t.d. Center Hotels á bið)
- Krafa sem vantar skýrslu eða netfang
- Ákvörðun sem Agnar tók (stöður framkvaemt / sleppt / ekki_thess_virdi í `afgreidsla`)
  — aldrei lagt til aftur nema ný staðreynd komi fram

## Skilin við aðra agenta

| Agent | Hvað hann dæmir |
|---|---|
| `kerfisrynir` (Hawking) | Þolir kerfið breytinguna? |
| `kodafraedingur` (Lisbeth) | Er aðferðin rétt? |
| `utlitsserfraedingur` (Miranda) | Er útlitið gott? |
| `joker` | Hannar |
| **Tony** | Er verið að gera RÉTTA hlutinn yfirhöfuð? |

## Þröskuldar

- Engin leiðrétting undir 10.000 kr fer fyrir Agnar.
- Hvort málið kemst á listann ræðst af áhrifum á tekjur/hagnað á móti fyrirhöfn.
