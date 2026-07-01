# Hliðarstika (sidebar) — handoff fyrir Claude Code

> Þetta er **niðurstöðu-lýsing** (ekki breytingaskref). Öll gildi eru loka-gildi og copy-paste-tilbúin. Til að smíða: haltu valmyndarliðunum/röðinni eins og þeir eru, en endur-skinnaðu hverja röð með reglunum hér að neðan. Fullklárað fyrirmynd er í `Sidebar.dc.html` — opnaðu hana og speglaðu uppbygginguna. Hún er sannleikurinn; þetta skjal er flýti-uppfletting.

## 1. Skel hliðarstikunnar
```css
width: 252px;                 /* fast */
display: flex; flex-direction: column;       /* haus / skrun / fótur */
background: linear-gradient(180deg, #141519, #0b0c0e);
border-right: 1px solid #050506;
box-shadow: 6px 0 28px -16px #000;
color: rgba(255,255,255,.66);
```
Þrjú lög: **haus** (lógó, fast) → **`<nav>` með `flex:1; overflow-y:auto`** (skrunar) → **fótur** (notandi/leit, fast). Þetta er lykilatriði: bara miðjan skrunar.

## 2. Lógó-merkið efst (efst vinstra horn)
```html
<div style="width:40px;height:40px;border-radius:12px;background:#0a0b0d;border:1px solid #060708;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.1), 0 4px 10px -4px #000;
            display:flex;align-items:center;justify-content:center;">
  <!-- logn-loginn (gradient teardrop) -->
  <svg width="22" height="26" viewBox="0 0 36 48"><defs>
    <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd24a"/><stop offset=".4" stop-color="#ff7a1a"/><stop offset="1" stop-color="#e5231f"/>
    </linearGradient></defs>
    <path d="M18 3c1.6 6 8 8 8 17a8 8 0 0 1-16 0c0-2 .6-3.4 1.7-5 .3 3.2 2.4 4.2 3.2 3.2 1.3-1.6-1.6-5 3.1-15.4z" fill="url(#fl)"/>
  </svg>
</div>
```
Tilbúið PNG fylgir líka: `sidebar-logo-badge.png` (málm-merki) og `flame-only.png` (gegnsær logi). Notaðu SVG-ið ef hægt er — það er skarpt í öllum stærðum.

## 3. Venjuleg valmyndarröð
```html
<a href="#" style="display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;
   color:rgba(255,255,255,.66);text-decoration:none;">
  <svg width="16" height="16" .../>            <!-- 16px lína-ikon, stroke=currentColor, stroke-width 1.9 -->
  <span style="flex:1;">Afgreiðsla</span>
  <span style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:#0c0d10;
        background:#8a929e;padding:1px 8px;border-radius:20px;">65</span>  <!-- talnamerki -->
</a>
```
Hover (global CSS): `a:hover{ background:rgba(255,255,255,.06); color:#fff; }`.
"—" merki (tómt): `<span style="color:rgba(255,255,255,.28);">—</span>`.
Undirtexti (Útlit/Kerfi): `<span style="font-size:11px;color:rgba(255,255,255,.3);">Fyrirtæki · yfirferð</span>`.

## 4. Virk röð (active — rauði rammin)
```html
<a href="#" style="display:flex;align-items:center;gap:11px;padding:10px 11px;border-radius:10px;
   color:#fff;text-decoration:none;
   background:linear-gradient(145deg,#120203,#480709 20%,#8a1014 43%,#bc1c1c 53%,#560809 74%,#150203);
   border:1px solid rgba(220,40,34,.55);
   box-shadow:0 0 16px -4px rgba(190,20,20,.55), inset 0 1px 0 rgba(255,255,255,.18);">
  <svg .../><span style="flex:1;font-weight:600;">Allir Viðskiptavinir</span>
</a>
```

## 5. Skiltákn (litlir litir á völdum táknum)
Flest tákn eru hlutlaus (`currentColor`). Lokaval á litum (16px lína-SVG): Sala 💰 `#2fcf63` (grænt), Fyrirtæki í Þjónustu 🏢 `#5b86ff` (blátt, byggingar-tákn), Þjónustuver 🛎 `#e8a662` (mjúkt appelsínugult), Eftirfylgni 📌 `#e23232`, Aðlaga hliðarstiku 🌙 `#d9af52`, Skrár í Storage 📁 `#d9af52`, Google Sheet `#3ec77a`, Google Drive `#5b86ff`. Verkborð og Brunakerfisþjónusta eru hlutlaus (`currentColor`).

## 6. Hluti-skil og fyrirsagnir
- Skilalína: `<div style="height:1px;background:#0b0c0e;margin:10px 6px;"></div>`
- Hluta-fyrirsögn (t.d. TENGLAR): `font-size:10.5px;font-weight:600;letter-spacing:.18em;color:rgba(255,255,255,.3);padding:16px 11px 7px;`
- Ytri tenglar (TENGLAR): bæta `↗` tákni hægra megin: `<svg ...><path d="M7 17 17 7M9 7h8v8"/></svg>` í `rgba(255,255,255,.32)`.

## 7. Fótur (fast neðst)
Röð: grænn "Tengt" punktur → notandi (JS rauður hringur + nafn + bjalla með `99+` rauðu merki) → leitarreitur (`Leita…` + `⌘K` kubbur) → `🌙` + `EN` takkar. Sjá nákvæma markup í `Sidebar.dc.html`.
- Avatar: 34px hringur, `background` = rauði btn-grad, `JS` hvítt.
- Bjöllu-merki: `99+` í `#e23232`, `1.5px solid #141519` ramma, Space Mono 9px.
- Leitarreitur: `background:#1a1c22;border:1px solid #060708;inset 0 1px 2px #000`.

## 8. Litir & letur (sömu og restin af appinu)
- Letur: **Space Grotesk** (UI), **Space Mono** (tölur/merki/⌘K).
- Bakgrunnur stiku: `#141519 → #0b0c0e`. Texti: `rgba(255,255,255,.66)` venjul., `#eef1f4` haus/nafn, `rgba(255,255,255,.3)` deyfður.
- Rauða þemað: accent `#e23232`, ring `rgba(220,40,34,.55)`, glow `rgba(190,20,20,.55)`.

---

## 9. Emojiin sem ég nota í gegnum appið
Ég nota emoji **sparlega** sem hluta-/flokka-merki (aldrei í venjulegum texta). Listinn:

| Emoji | Notkun |
|---|---|
| 🔧 | Þjónustuverk / Verkstæði / ÞjónustuVerkstæði |
| 🚨 | Brunakerfisþjónusta (haus) |
| 🔥 | Brunakerfi / eldur (tög, tákn) |
| 📦 | Vörur og þjónusta |
| 📅 | Vertíð / dagsetning |
| 🛎 | Þjónustuver |
| 🧰 | Skoðun (Úttekt) |
| 📝 | Athugasemdir / nótur |
| 📋 | Upplýsingar / listi |
| 📄 | Skjal / skýrsla / reikningur |
| 📁 | Skjöl & viðhengi / Storage mappa |
| ✉️ | Tölvupóstur |
| 📊 | Bókhald / yfirlit |
| 📞 | Hringja |
| 🏷️ | Tilboð / tilboðsverð |
| 🔗 | Tengja / tengill |
| 🗺 | Kort |
| 🧹 | Tiltekt |
| 📤 | Senda |
| 📂 | Opna í Drive |
| 👥 | Viðskiptavinir |
| 🏢 | Bygging / fyrirtæki |
| ⚠️ | Liðin skoðun / aðvörun |
| 💾 | Óklárað vistað |
| ⏳ | Í vinnslu |
| ✓ / ✅ | Búið / Verkborð |
| ★ | Áríðandi |
| 🌙 | Þema (dökkt/ljóst) |

> Ráð: emoji eru fín sem haus-merki en fyrir hrein tákn í röðum mæli ég með 16px lína-SVG (eins og hér að ofan) — þau eru skarpari og taka lit þemans. Í úttektar-/vöruspjöldum nota ég málm-PNG táknin í `assets/ic3-*.png`.
