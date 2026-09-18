---
name: heidarlegt-vidmot
description: >
  Hvernig á að byggja viðmót sem lýgur ekki — takkar sem segjast hafa gert
  eitthvað, listar sem raða vitlaust, og reitir sem sýnast vista. Þrjár reglur:
  lesa svarið áður en sagt er „vistað", ekki sýna takka sem getur ekkert gert, og
  raða eftir því sem hægt er að GERA en ekki eftir stærstu tölunni. Notaðu þegar
  á að bæta við vistun, stöðuskilaboðum, hnappi á mál, eða röðun á lista — og
  þegar Agnar segir „takkinn gerir ekki það sem hann segist gera", „ekkert
  gerðist", „af hverju er þetta efst", eða „hvað er staðan".
  Kveikjuorð: lygandi takki, vistun segir OK, röðun, forgangur, hvað er efst,
  hnappur sem gerir ekkert, heiðarlegt viðmót.
---

# Heiðarlegt viðmót

Skrifað 18.09.2026 eftir dag þar sem allar þrjár reglurnar brotnuðu í sama appi.

Setningin sem allt snýst um, frá Agnari:

> „takkinn gerir ekki það sem hann segist gera. Þetta hefur verið gegnumgangandi
> rugl frá upphafi."

---

## 1. Lestu svarið áður en þú segir „vistað"

**supabase-js kastar ALDREI** við `.update()`, `.insert()`, `.upsert()`,
`.delete()` eða `.select()`. Villan kemur í `.error`. `try/catch` utan um þau
gerir ekki neitt — `catch` keyrir aldrei og kóðinn heldur áfram og segir „✓".

```js
// RANGT — segir alltaf ✓
try { await sb.from('t').update(p).eq('id', id); toast('Vistað'); } catch (_) {}

// RÉTT — les villuna OG les gildið til baka
const r = await sb.from('t').update(p).eq('id', id).select('id,notes');
if (r.error) throw r.error;
if (!r.data.length) throw new Error('röðin fannst ekki');
if (String(r.data[0].notes || '') !== texti) throw new Error('las annan texta til baka');
```

**Þrennt í viðbót:**

- **Lestu til baka það sem þú skrifaðir.** `.select()` eftir `update` skilar
  röðinni eins og hún LENTI. Berðu saman við það sem þú sendir. Þá er „vistað"
  mæling en ekki fullyrðing.
- **Mistakist vistun: EKKI hreinsa textann.** Hann lifir í drögum, stendur áfram
  í reitnum og reiturinn segir af hverju. Notandinn má aldrei tapa innslætti.
- **`window.AppSettings.save` er undantekning.** Hún er `saveVordud`: setur
  misheppnuð skrif í biðröð, varar sjálf við og reynir aftur á 20 sek fresti og
  við `pagehide`. Skrifaðu **„í biðröð — reynt aftur sjálfkrafa"**, ALDREI
  „reyndu aftur" — notandinn á ekki að gera neitt.

**Prófaðu lygina, ekki bara sannleikann.** Þvingaðu skrifið í villu og lestu það
sem sést:

```js
const raun = window.fetch;
window.fetch = (u, o) => (o && o.method === 'PATCH' && /taflan/.test(String(u)))
  ? Promise.resolve(new Response(JSON.stringify({ message: 'permission denied', code: '42501' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }))
  : raun.apply(this, arguments);
```

Smelltu svo á takkann og lestu skjáinn. Sé þar „✓" er takkinn að ljúga.
`tools/smoke/lygaprof.js` gerir þetta sjálfvirkt.

---

## 2. Ekki sýna takka sem getur ekkert gert

Takki sem birtist alltaf en segir „ekkert að gera" í 9 skipti af 10 er sami
flokkur og takki sem lýgur. Hann kostar notandann smell og traust.

**Reglan:** teiknaðu takkann aðeins þegar þú hefur MÆLT að hann geri eitthvað.

```js
// 368: „Gera skýrslu og reikning" birtist aðeins þegar fyrirtækið stendur
// sannanlega í v_gleymt_ad_rukka_uttekt — annars fyndi vinnuglugginn ekkert.
const g = gogn('gleymt', saekjaGleymt);
if (!g || !g.data) return '';                    // enn að sækja — ekkert lofað
if (!g.data.uttekt.some(x => +x.fyrirtaeki_id === +fid)) return '';
```

Athugaðu sérstaklega: **á meðan gögnin eru að sækjast skal ekkert lofa.** Tómur
strengur er réttara svar en takki sem gæti reynst tómur.

---

## 3. Raðaðu eftir því sem hægt er að GERA

Stærsta talan er ekki það sem skiptir mestu máli. Dæmi, mælt 18.09.2026 í
forgangslista krafna:

```
Ítreka ógreidda kröfu ····· 15 ··· 1.498.199 kr.   <- efst, allar 1-11 daga gamlar
Senda kröfu sem fór aldrei · 4 ······ 51.393 kr.   <- fimmta
```

Ítrekunin var efst af því talan var stærst — en reikningurinn ER sendur og krafan
ER í banka. Það eina sem hægt er að gera er að hringja, og eftir tvo daga er það
ekki vinna heldur ónæði. Á meðan lágu fjórir reikningar sem enginn hafði beðið um.

**Tveggja þrepa röðun:**

1. **Hópur = dómur um hvað er hægt að GERA.** Í peningum:
   (1) við höfum ekki beðið um hann · (2) við höfum beðið, þeirra er að greiða ·
   (3) líklega greitt, á eftir að stemma.
2. **Innan hóps = mæling.** Upphæð, aldur, frestur.

Dómurinn gengur fyrir; mælingin raðar innan hans. Og sé þröskuldur settur
(„ítrekun yngri en 14 daga er ekki vinna") skal talan standa ein og sér í kóðanum
með athugasemd um að hún sé **ÁKVÖRÐUN, ekki mæling** — svo hún sjáist og megi
breyta.

**Upphæðin er oft ekki í dálki.** Í Samþykktum stóð hún inni í titlinum
(„… 873.646 kr — XML hafnað"), svo röðunin sá hana aldrei. Lestu hana úr texta ef
þarf — en merktu hana þá „≈", sýndu hana á röðinni og leggðu hana ALDREI saman
við neitt.

---

## 4. Textinn má ekki vísa á stað sem notandinn finnur ekki

Níu mál á Þjónustuborðinu lofuðu að reikningsdrög færu „í Drög-stöðina".
Drög-stöðin er síða í ÖÐRU appi (📱 Öpp → The Big Boss → 🛒 Drög-stöð) og ekkert
af málunum fór þangað nokkurn tíma. Agnar: *„hvað ertu að tala um að setja í drög
stöðuna. hvar fynn ég það"*.

Áður en þú skrifar hvað gerist: **farðu þangað sjálfur.** Sé staðurinn ekki í
vinstri valstikunni eða á sama skjá, nefndu leiðina alla — eða veldu aðra leið.

Og **ekki biðja notandann um upplýsingar sem kerfið á þegar.** Textinn sagði „þú
athugar fyrst hvort reikningurinn hafi farið annars staðar" meðan
`v_uttekt_an_reiknings_grunnur` var þegar búin að bera saman skjöl, sölur,
systurstað á sömu kennitölu og Stólpa. Segðu niðurstöðuna. Spurðu aðeins um það
sem kerfið sér raunverulega ekki.

---

## 5. Þegar notandinn segir „ekkert gerðist" — mældu, ekki afsakaðu

Þrjú dæmi frá 18.09.2026, öll leyst með einni fyrirspurn:

| Kvörtun | Mælingin | Rótin |
|---|---|---|
| „Dagskrá wont show up í Ham Afgreiðsla/útköll" | Hakið RÉTT sett í `app_settings`; einingin til | `baraMitt` núllaði `topHtml` — einingarnar urðu aldrei til, voru ekki faldar með CSS |
| „hvað er búið að breyta hérna" | `updated_at` = nákvæmlega þegar hann setti málið í vinnslu | Ekkert hafði gerst síðan; verkið sofnaði |
| „útlitið vistast ekki" | Skrifin í lagi í geymslunni | `M(id)` byggði haminn upp á nýtt og tók ekki `breidd` með — lesturinn þagði |

**Mynstrið:** þegar eitthvað „virkar ekki" er jafn líklegt að LESTURINN sé bilaður
og SKRIFIÐ. Mældu bæði. `updated_at` segir hvort nokkuð gerðist yfirleitt.

---

## Vinnulag

- **Prófaðu í gegnum viðmótið**, ekki með API-kalli. Raunverulegur smellur, lesið
  það sem sést (`feedback_profa_i_gegnum_vidmotid`).
- **Hreinsaðu eftir þig.** Skrifir þú prófunartexta í raunveruleg gögn skaltu
  skila þeim í fyrra horf og segja frá því.
- **Vörður fyrir hvern flokk.** `tools/audit-oskodud-skrif.cjs` finnur óskoðuð
  skrif, `tools/smoke/lygaprof.js` finnur takka sem ljúga. Rauður vörður er
  niðurstaða, ekki óþægindi — aldrei hækka grunnlínu til að fá grænt.
- **Línuskil eru EITT gildi per skrá.** Blandist CRLF og LF saman hætta akkeri
  sem spanna fleiri en eina línu að finnast, þegjandi. Athugaðu áður en þú
  skiptir út fjöllínu-texta (`feedback_bash_tool_windows`).
