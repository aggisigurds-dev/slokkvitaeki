# Orðabók — hugtak → gögn

Hvað orðin þýða þegar Agnar notar þau, og hvar þau lenda í grunninum.

| Orð | Merking | Í gögnum |
|---|---|---|
| Úttekt / árskoðun | árleg skoðun tækja hjá fyrirtæki | `uttaeki` + úttektarskýrsla (PDF) |
| Vinnublað | handskrifað blað úr heimsókninni — **heimildin** | pappír → `sara` skráir |
| Innsláttarlisti | samandregið yfirlit blaðanna | `innslattarlisti.html` |
| Úttektarskýrsla | PDF-skýrslan sem fer á kúnna | Drive MASTER-mappa |
| Yfirferð / hleðsla (h/y) | skoðað vs. endurhlaðið tæki | staða per tæki |
| Ónýtt | tæki tekið úr umferð | staða ⊘ |
| Sala | POS-færsla | `solur`, `sala_transactions` |
| Krafa / kröfuyfirlit | ógreiddir reikningar og staða þeirra | `solur` + Payday |
| Bakfæra | ógilda reikning/sölu | `status='void'`, ekki delete |
| Drög | reikningur ekki gefinn út | staða í Payday/appi |
| Verkbeiðni | pöntun/verk frá kúnna | `verkbeidnir` |
| Þjónustuborð | dagbók heimsókna | `verkdagbok` |
| Geymsla | hillukerfi G1–G40 | `uttaeki.location` |
| Lánstæki | tæki lánuð út á meðan | `lanstaeki` |
| Rekstrarfélag | keðja/móðurfélag margra staða | `customers_base.rekstrarfelag` |
| Verkkaupi | greiðandi verks (Brunahólfsmegin) | Verkkaupar-mælaborð |
| Efnisreikningur | reikningur fyrir efni (Redder) | `invoices`, source Redder |
| Uppgjör | daglegt kortauppgjör frá Teya | póstur → `teya.js` |
| Brunahólf | fyrirtækið — brunahólfun/brunavarnir | `customers_base`, `fyrirtaeki` |
| Slökkvitæki ehf | fyrirtækið — tæki, þjónusta, sala | `uttaeki`, `solur` |
| Fléttu upp | uppflettiskjár í appinu | framendi |
| Bókhaldsyfirlit | fjárhagsyfirlit í appinu | framendi |
| Kennitala (kt) | íslenskt fyrirtækja-/einstaklingsnúmer | `kennitala`, `kt` |
| Akstur | aksturgjald á reikningi | vörulína, sjá `sara/references/verd.md` |

## Orðalag í skýrslutexta

Húsmálið er skjalfest í **`sara`-skillinu** (`references/husmal.md`), talið úr 27 frágengnum
skýrslum. Charlize endurtekur það ekki — vísar á það. Fjórar algengustu villurnar:

„öll **tæki**" → „öll **slökkvitæki**" · „fékk hleðslu og fulla áfyllingu" → „**endurhlaðin**" ·
„nýjan **haus** á brunaslöngu" → „skipt um **stút**" · „skipt um **batterí**" → „skipt um
**rafhlöður**".
