# N8N — sjálfvirknivél Slökkvitækis

n8n er **vélin** þar sem þú býrð til þínar eigin sjálfvirkni (flæði): les CSV, kallar
API, sækir tölvupóst, skrifar í Supabase, keyrir á áætlun. Þú dregur til „nóður" á
myndrænu borði — enginn kóði. Ég set upp vélina og bý til fyrsta flæðið sem sýnishorn;
þú afritar það og býrð til fleiri sjálf(ur).

> **Verkaskipting.** Ég get ekki búið til reikninga, slegið inn lykla né samþykkt OAuth
> — það er þitt. Ég geri allt hitt (hanna/byggja flæði, stilla nóður án leynilykla,
> smíða appa-brúna, skrifa þetta skjal, prófa allt).

---

## 1. Hýsing — veldu A eða B

### A. n8n Cloud (mælt með — engin viðhaldsvinna)
Best fyrir áreiðanleika: alltaf í gangi, uppfærist sjálft, opinn HTTPS-vefslóð sem OAuth
(Gmail/Outlook) og appa-hnappar þurfa, innbyggð innskráning. ~20 €/mán (Starter,
~2.500 keyrslur). Hverfandi kostnaður miðað við Netlify-slysið.

1. Farðu á **n8n.io → Sign up**. Veldu **EU (Frankfurt)** svæði (GDPR — gögnin í ESB).
2. Búðu til vinnusvæði (t.d. `slokkvitaeki`). Kveiktu á 2FA.
3. Sendu mér **grunnslóðina** (t.d. `https://slokkvitaeki.app.n8n.cloud`). Ekki lykilorð.

### B. Sjálfshýsing á litlum VPS (ódýrast, þú átt hana)
Hetzner CX22 (~4–5 €/mán, Falkenstein/Helsinki = ESB) + Docker. Ég skrifa `docker-compose.yml`
+ Caddy fyrir TLS og leiðbeiningarnar; þú keyrir 3 skipanir. Þú sérð um uppfærslur/afrit.

Segðu til ef þú vilt B, þá útbý ég compose-skrána. Sjálfgefið höldum við áfram með **A**.

> Ekki mælt með: Docker á einni af stofuvélunum — ókeypis en þarf Cloudflare-göng fyrir
> OAuth/hnappa og dettur út þegar vélin er slökkt. Aðeins fyrir área­ætluð, staðbundin flæði.

---

## 2. Tengja n8n við kerfið (lyklar fara AÐEINS í lyklageymslu n8n)

Þegar vélin er komin upp, í n8n → **Credentials → New**:

1. **Supabase / Postgres** — `Postgres` nóða.
   - Host `db.osfdzskyvisifcwyjkuk.supabase.co`, port `5432`, database `postgres`, user `postgres`.
   - Lykilorð = **Supabase service-role** (Dashboard → Project Settings → API → `service_role`).
   - ⚠️ Þessi lykill fer **aðeins** hingað inn — aldrei í kóðann, aldrei til mín, aldrei í spjallið.
   - (Eða `Supabase` nóðan með `SUPABASE_URL` + service-role — sama lykill.)
2. **Gmail / Outlook** (seinna, fyrir póstviðhengja-flæðið) — n8n keyrir OAuth sjálft;
   þú smellir „Connect" og samþykkir í eigin vafra. Leysir gömlu Gmail-OAuth-stífluna.
3. **já.is / Teya / Ajour** — bætt við sem lyklum ef/þegar viðkomandi flæði þarf þá.

Öryggi: n8n geymir service-role-lykil → **verður að vera á bak við innskráningu** (Cloud:
sjálfgefið; VPS: kveikja owner-reikning + TLS, aldrei opið án auth).

---

## 3. Fyrsta flæðið — „Teya kortagreiðslur" (sönnun)

Peningaflæði (fókus #1), engin OAuth. CSV móttekið og greint 2026-09-12 (683 línur).

**Raunverulegt CSV-snið (kommu-skil, UTF-8, heiltölu-upphæðir):**
`Tegund greiðslu, Dagsetning, Tími, Heiti samnings, Greiðslumáti, Nafn posa, Auðkenni tækis, Staða, Upphæð`.
Staða = SAMÞYKKT (659) / HAFNAÐ (23) / Í BIÐ (1). Tegund = PAYMENT (682) / REFUND (1).

⚠️ **Mikilvægt:** skýrslan hefur **ekkert færslunúmer, ekkert kortanúmer, enga reikninga-/kt-vísun.**
Því er **ekki hægt að para sjálfvirkt við reikninga.** Það sem flæðið GETUR: (áfangi 1) skráð
kortatekjur með dags/tíma + heildartölur; (áfangi 2, síðar) parað við POS/sölur appsins eftir
**upphæð + tímastimpli** — báðir hafa nákvæman tíma — ekki reikninga.

**Flæðið (nóða fyrir nóðu, ég byggi það):**
1. **Trigger** — Form/„Upload file" fyrst; síðar Gmail-trigger (senda Teya-skýrsluna í hólf sem n8n vaktar) eða `Schedule`.
2. **Extract from File → CSV** — kommu-skil, UTF-8; sleppa haus og auðum línum.
3. **Set/Map** í dálka töflunnar: `tegund, faersludagur, timi, heiti_samnings, greidslumati, nafn_posa, audkenni_taekis, teya_stada, upphaed`; `dedupe_key` = `dags|tími|tæki|tegund|upphæð|staða`; öll línan geymd í `raw`, `skra` = skráarheiti.
4. **Postgres: upsert** í `teya_faerslur` á `dedupe_key` → engin tvítalning við endur-innflutning eða skörun tímabila.
5. **(Áfangi 2, síðar) Pörun (les-eingöngu)** — bera SAMÞYKKT-færslur við POS/sölur appsins eftir upphæð+tíma, setja `matched_sala_id`/`matched_ref`. Aðeins SAMÞYKKT telst peningur; HAFNAÐ/Í BIÐ geymt en ekki talið; REFUND dregst frá. **Engin skrif í varðar reikninga-töflur.**

Taflan er **búin til í Supabase** (staðfest 2026-09-12: 20 dálkar, RLS á, tvær anon-reglur).
Skema-uppspretta: [`sql/teya_faerslur.sql`](../sql/teya_faerslur.sql). Appa-sýn sem les töfluna
kemur með brúnni (kafli 4).

---

## 4. Brú aftur í appið — „hnappar í Slökkvitæki" (upphaflega beiðnin)

Hvert flæði getur haft **Webhook**-trigger. Til að ýta á það úr appinu án þess að
vefslóð/leyndarmál n8n leki í vafrann:

- `netlify/functions/n8n-trigger.js` — þunn milliþjónusta sem POST-ar á n8n-webhookinn með
  `EDGE_SHARED_KEY`-haus (sama mynstur og önnur vörðuð föll).
- `js/patches/NNN-n8n-hnappar.js` — litlir hnappar (skv. `add-feature`-skill) sem kalla á milliþjónustuna.
- Nýjar Netlify-umhverfisbreytur (bæti við þegar vélin er komin): `N8N_BASE_URL`, `N8N_WEBHOOK_SECRET`.

Ég smíða brúna eftir að fyrsta flæðið er komið upp (þá vitum við raunverulegar webhook-slóðir).

---

## 5. Varðstaða (öryggisnetið)

- Skrif AÐEINS í nýjar, einangraðar töflur (`teya_faerslur`, síðar `ajour_import`,
  `email_attachments`). Varðar leiðir (invoice OUT `10/233/254`, kennitala `121/pos.js`,
  `payday-push`) eru **lesnar**, aldrei skrifaðar af n8n. Ekkert rukkað sjálfvirkt.
- `node tools/audit-all.cjs` fyrir hverja ýtingu sem snertir appa-kóða (brúin).
- Birta aðeins gegnum `[deploy]`-git-flæðið. Aldrei `node deploy.js`.

---

## 6. Gátlisti

**Þú:**
- [ ] Velja hýsingu (A n8n Cloud, EU — eða segja „B") og búa til vélina + 2FA
- [ ] Senda mér grunnslóðina
- [ ] Setja Supabase service-role inn í n8n Credentials (ekki til mín)
- [ ] Senda mér sýnishorn af Teya-CSV
- [ ] (Seinna) samþykkja Gmail/Outlook OAuth í n8n

**Ég:**
- [x] `sql/teya_faerslur.sql` (taflan)
- [x] þetta skjal
- [ ] byggja + flytja inn Teya-flæðið (bíður CSV + vélar)
- [ ] appa-sýn sem les `teya_faerslur`
- [ ] brúin (`n8n-trigger.js` + hnappa-patch) þegar webhook-slóðir eru til
- [ ] prófa allt enda-í-enda og segja HVERNIG það var prófað

---

## 7. Backlog (næstu flæði eftir Teya-sönnunina)

- **Ajour CSV** → áætluð HTTP-sókn (nota `ajour-endpoint-capture`-skill) → `ajour_import` → NLSH.
- **Póstviðhengi (Gmail + Outlook)** → triggerar → Supabase Storage/Drive + `email_attachments`
  (tengist doc-sweep). Leysist með n8n-OAuth. („redder importer" — hvað er það? líklega leyst hér.)
- **Heimilisfang → kennitala** → hnappur í appinu (já.is/Keldan) + valfrjáls n8n-hjálp.
- **Teikningar: Kópavogur/Garðabær/Hafnarfjörður** → verk í appinu á `landnr.js` +
  `325-landnr-teikningar.js` (hvert sveitarfélag með eigin kortasjá/byggingarteikningasafn).
- **Hugmyndir:** næturafrit af Supabase; áminningarpóstur á gjaldfallna reikninga; RSK
  heimilisfanga-bakfylling á áætlun; láglager/raðnúmera-viðvaranir.
