# Tekjuskilgreiningar og mælingar

Markmiðið: tekjur beggja félaga ×2 og hagnaður ×3 frá grunnlínu 15.11.2026, fyrir nóv. 2027.

## Grunnlínan

Býr í `app_kv['radgjafinn_aaetlun'].grunnlina` — tekjur á mánuði hvors félags, skilgreiningin á
bak við hverja tölu og dagsetning mælingar. Morgunráðgjafinn (`_radgjafinn.cjs`) reiknar sömu
tölur daglega (`tekjur()`).

## Slökkvitæki ehf — tekjur

- Tafla: `solur`, `status='final'`
- Reitur: `upphaed_an_vsk`
- Kreditnótur DREGNAR FRÁ (489-borðið sleppir þeim og tvítelur endurgerða reikninga)
- Tímabil: `created_at`-mánuður
- `solur` nær aftur til 04.05.2026; eldra er í `stolpi_reikningar` (fyrri eigandi)

## Brunahólf ehf — tekjur

- Tafla: Payday `invoices` (`source='payday'`, status PAID eða SENT)
- Reitur: `hofudstoll` (án VSK)
- Tímabil: `gjalddagi`-mánuður
- **BRÁÐABIRGÐASKILGREINING** — ekkert borð telur tekjur Brunahólfs og `invoiceDate` er ekki
  vistað (`payday-pull.js`). Agnar þarf að samþykkja.
- 5 % öryggisfé LSH/ÞG kemur ekki fram fyrr en við uppgjör

## Hagnaður

**ÓMÆLANLEGUR Í DAG.** Laun eru hjá bókara og ekki í kerfinu, bankagögn eru mánaða gömul,
kostnaðarverð vantar á flestar vörur og fastur kostnaður er hvergi skráður.

Sagðu „ómælt", aldrei 0, og fyrsta atriði plansins er að gera hagnaðinn mælanlegan.
Launamál sjálf eru ekki fyrir Agnar — aðeins mánaðarleg heildartala frá bókara til að
reikna hagnað.

## Reglur um tölur

1. **Engin ný tala** — lestu sömu sýn og borðin lesa. Ný skilgreining merkt bráðabirgða þar til Agnar samþykkir.
2. **Mælitækið lýgur** (`docs/MAELINGAR.md`): tómt svar er ekki „ekkert að". Ómælt ≠ í lagi, ómælt ≠ 0.
3. **Repóin eru opinber:** engar rekstrartölur (tekjur, hagnaður, skuldir) í skrám — tölurnar búa í gagnagrunninum.
4. **Ný skilgreining** (t.d. tekjur Brunahólfs) er merkt bráðabirgða og er ekki gildi fyrr en Agnar samþykkir.

## Markmiðslistinn

Síðan Markmið (hliðarstikan): 51 markmið í 8 flokkum. Töflurnar `markmid` og `markmid_maelingar`.
Mælingarnar skilgreindar í `markmid_maela(lykill)` (`sql/markmid.sql`) og `YTRA` í
`netlify/functions/markmid.cjs`. `markmid-cron` mælir kl. 06:20 UTC.

Grunnlínan (`upphaf`) breytist aldrei — rangt mælt markmið fær nýja línu, ekki nýja grunnlínu.
