# Brunahólf — Master Theme Spec (for Claude Code)

> **How to use this doc.** This is a *result* spec, not a list of edits. Every value here is final and copy-pasteable. To theme a page: keep its data/logic, and re-skin its markup using the tokens and component recipes below. The folder `reference-pages/` contains fully-themed `.dc.html` files — **open the closest one and mirror its structure**. They are the source of truth; this README is the quick reference.
>
> **Golden rule that was missed last time:** apply the theme to the *content area* of every page — wrap data in the **card / table / chip / button** recipes below. A themed banner + sidebar with plain white default-styled content inside is the failure mode. Every list → themed table; every form block → card; every button → one of the 4 button styles; every status word → a chip.

---

## 1. Design tokens (put once, global)

```css
/* fonts */
font-family: 'Space Grotesk', system-ui, sans-serif;   /* body + UI */
font-family: 'Space Mono', monospace;                   /* all numbers, kt, dates, amounts, IDs */

/* page background — black at top (banner floats in it) → grey where content sits */
background: linear-gradient(180deg, #060607 0px, #060607 95px, #aeb4be 360px, #9ba1ad 100%);

/* sidebar */
background: linear-gradient(180deg, #141519, #0c0d10);
border-right: 1px solid #050506;

/* surface card (the workhorse) */
border-radius: 16px;
border: 1px solid rgba(20,24,34,.08);
background: #fff;
box-shadow: 0 10px 28px -16px rgba(25,35,60,.16);

/* inputs / textareas */
height: 42–46px; padding: 0 14px; border-radius: 10–13px;
border: 1px solid rgba(20,24,34,.12); background: #fff (or #f6f8fb inside cards);
color: #141822; outline: none;

/* accent (theme prop — default red) */
--accent:#e23232; --ring:rgba(220,40,34,.55); --glow:rgba(190,20,20,.55);
--btn-grad: linear-gradient(145deg,#120203 0%,#480709 20%,#8a1014 43%,#bc1c1c 53%,#560809 74%,#150203 100%);
/* blue theme:  --btn-grad: linear-gradient(145deg,#03040a,#0c1730 24%,#1d3c80 48%,#264c9e 56%,#0f2042 78%,#03060d) ; --accent:#5b86ff */
/* gold theme:  --btn-grad: linear-gradient(145deg,#0d0802,#291d05 22%,#5c4413 44%,#82661f 54%,#46350f 74%,#100b03) ; --accent:#d9af52 */
```

### Text colors (on white)
`#11141c` heading · `#3a4250` body-strong · `#5b6472` body · `#8a93a5`/`#94a3b8` muted/labels · `#9098a6` faint · `#cbd2dc` empty "—".

### On the dark page band (page titles sit here)
Title = **#fff** 28px/700. Subtitle = `rgba(255,255,255,.6)` 13px (mono for counts).

---

## 2. Button styles — every button is ONE of these four

```html
<!-- A. Metallic black (default secondary / toolbar / nav actions) -->
<button style="height:42px;padding:0 16px;border-radius:11px;border:1px solid #0a0b0d;
  background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);
  color:#fff;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;">Skanna</button>

<!-- B. Accent (primary action — uses theme) -->
<button style="height:42px;padding:0 18px;border-radius:12px;border:1px solid var(--ring);
  background:var(--btn-grad);color:#fff;font-weight:600;
  box-shadow:0 0 16px -4px var(--glow), inset 0 1px 0 rgba(255,255,255,.16);cursor:pointer;">Áfram</button>

<!-- C. Dark-metal green (confirm / búið / klára) -->
<button style="height:46px;padding:0 18px;border-radius:12px;border:1px solid #156e3a;
  background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;font-weight:700;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.25);cursor:pointer;">✓ Búið</button>
<!-- darker variant: linear-gradient(145deg,#093a20,#16613a 30%,#1f7a48 52%,#0d4226 76%,#062815) -->

<!-- D. Light neutral (tertiary inside white cards) -->
<button style="height:42px;padding:0 16px;border-radius:11px;border:1px solid rgba(20,24,34,.14);
  background:#f1f5f9;color:#3a4250;font-weight:500;cursor:pointer;">Vista óklárað</button>
```

---

## 3. Status chips / pills — every status word becomes a filled chip

Pattern: `color` on `bg` with `1px solid border`, `font-size:11–12px; font-weight:600; padding:3px 9px; border-radius:7px;`.

| meaning | color | bg | border |
|---|---|---|---|
| done / búið / skoðað / græn | `#047857` | `#ecfdf5` | `#a7f3d0` |
| in-progress / í vinnslu (blue-metal) | `#2f5fe0` | `#eef3ff` | `#c6d6ff` |
| pending / á dagskrá / bíður | `#b45309` | `#fffbeb` | `#fde68a` |
| overdue / liðin / forgangur | `#be123c` | `#fff1f2` | `#fecdd3` |
| neutral / annað | `#64748b` | `#f1f5f9` | `#e2e8f0` |
| brunakerfi / fire | `#c0241f` | `#fdecec` | `#f3c6c4` |
| samningur (purple) | `#6d28d9` | `#f5f3ff` | `#ddd6fe` |

Toolbar **filter chips**: inactive = `background:linear-gradient(180deg,#fdfdfe,#e3e7ee);border:1px solid rgba(20,24,34,.14);color:#3a4250` · active = **metallic black (style A)**.

---

## 4. Table recipe (USE FOR EVERY LIST — this is the #1 fix)

```html
<div style="border-radius:16px;border:1px solid rgba(20,24,34,.08);background:#fff;
            box-shadow:0 10px 28px -16px rgba(25,35,60,.16);overflow:hidden;">
  <div style="overflow-x:auto;">                          <!-- responsive: never clips -->
    <table style="width:100%;min-width:960px;border-collapse:collapse;">
      <thead style="position:sticky;top:0;z-index:2;">       <!-- header stays on scroll -->
        <tr style="background:#eef1f6;box-shadow:0 1px 0 rgba(20,24,34,.1);">
          <th style="text-align:left;padding:11px 16px;font-size:10px;font-weight:700;
                     letter-spacing:.08em;color:#8a93a5;white-space:nowrap;">FYRIRTÆKI</th>
          <!-- …more th… numeric columns text-align:center/right -->
        </tr>
      </thead>
      <tbody><!-- rows --></tbody>
    </table>
  </div>
</div>
```
Add once to a global `<style>`: `tbody tr{transition:background .12s ease} tbody tr:hover{background:#f3f6fc!important}`.
Row cell basics: name `13.5px/600 #11141c` with a mono `kt.` subline `10.5px #9098a6`; amounts/dates/counts in **Space Mono**; status column uses §3 chips; a left `border-left:3px solid <status>` accent reads well for priority lists.

---

## 5. Other building blocks

**Stat card** (top-of-page KPIs):
```html
<div style="flex:1;border:1px solid rgba(20,24,34,.08);border-radius:14px;background:#fff;
  box-shadow:0 8px 22px -16px rgba(25,35,60,.18);padding:16px 18px;">
  <div style="font-size:10.5px;font-weight:700;letter-spacing:.14em;color:#8a93a5;">FJÖLDI</div>
  <div style="font-family:'Space Mono',monospace;font-size:30px;font-weight:700;color:#11141c;margin-top:4px;">608</div>
  <div style="font-size:11.5px;color:#9098a6;margin-top:3px;">540 í ársskoðun</div>
</div>
```
Tint variants: green `linear-gradient(180deg,#eaf7ef,#fff)` value `#1f9d57`; amber `linear-gradient(180deg,#fff7e6,#fff)` value `#c77a16`. **Hero/revenue** stat = metallic blue `linear-gradient(150deg,#6f97ff 0%,#2f5fe0 34%,#1c3d8c 60%,#0b1838 100%)`, white text, `inset 0 1px 0 rgba(255,255,255,.45)`.

**Company hero** (detail pages): `background:linear-gradient(110deg,#0c1018 0%,#13203f 45%,#274a9e 100%)`, white name, mono kt, info/email chips on `rgba(255,255,255,.1)`.

**Pipeline stepper** (workflow): green filled check-circle for done stages, hollow `2px solid #cbd5e1` for pending, connector line green when complete — see `reference-pages/ThjonustuVerkstaedi-board.dc.html`.

**Product/catalog card**: white card, image well `linear-gradient(180deg,#f1f4f9,#e4e8ef)` holding the glossy metallic icon (see `assets/ic3-*.png`), category chip top-left, name 14/700, mono price + faint "án vsk" line — see `reference-pages/Vorur-og-thjonusta.dc.html`.

**Banner & sidebar**: copy verbatim from any reference page (top of `<main>` = banner; the `<aside>` = grouped sidebar with STJÓRNSTÖÐ / LEIÐSÖGN sections). Banner art lives in `assets/` (`fire-flames.png`, logo). Mark the current route's nav item active (accent `var(--btn-grad)` background).

---

## 6. Per-page status & references

Fully themed reference files in `reference-pages/` (mirror these):

| Route | Reference file | Pattern to copy |
|---|---|---|
| Sala (POS) | `Sala v2.dc.html` | product grid + dark cart |
| Afgreiðsla | `Afgreidsla.dc.html` | kanban columns |
| Verkstæði | `Verkstaedi.dc.html` | device-chip rows |
| Allir Viðskiptavinir | `Allir-Vidskiptavinir.dc.html` | stat cards + filter chips + table |
| Fyrirtæki í Þjónustu | `Fyrirtaeki-i-Thjonustu v2.dc.html` | **search + responsive sticky table + legend** |
| Rekstrarfélög (detail) | `Rekstrarfelag-detail.dc.html` | hero + buildings table |
| Þjónustuverk | `Thjonustuverk.dc.html` | compact inbox rows (left accent) |
| Þjónustuver | `Thjonustuver.dc.html` | stat tiles + inbox table |
| ÞjónustuVerkstæði | `ThjonustuVerkstaedi-board.dc.html` | pipeline board |
| Vertíð | `Vertid.dc.html` | company-card grid |
| Brunakerfisþjónusta | `Brunakerfisthjonusta.dc.html` | notes box + revenue table |
| Vörur og þjónusta | `Vorur-og-thjonusta.dc.html` | catalog grid |
| Bakendi | `Bakendi.dc.html` | tool-runner cards grid |
| Úttekt (detail) | `Uttekt.dc.html` | device list + invoice rail + docs |

**Still to theme** (apply §1–§5 using the closest reference): Útlit, Kerfi, Verkborð, Verkdagbók, Beiðnir, Stjórnstöð/Stjórnborð, Tímavera, Efniskostnaður, Verðsamanburður, Móttaka, Hreyfingarlisti, Kröfu yfirlit, Bókhalds yfirlit, Tilboð, Samningar, Eftirfylgni, Drög.

---

## 7. Checklist per page (so it actually gets "finished")
1. Page bg = §1 gradient; mount banner + sidebar from a reference; mark active nav item.
2. Page title in **white** on the dark band + mono subtitle/counts.
3. Every KPI → **stat card** (§5). Every toolbar button → §2. Every filter → **filter chip** (§3).
4. Every list/grid of data → **table recipe** (§4) *with the overflow wrapper + sticky header* (this is what was missing).
5. Every status word → **chip** (§3). Every number/date/kt/amount → **Space Mono**.
6. Forms/detail blocks → **white cards** (§1); primary submit = accent or green (§2).
7. Empty state = centered muted text in a dashed box; never a bare blank area.
