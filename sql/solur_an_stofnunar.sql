-- Afgreiðsla án stofnunar (10.11.2026)
--
-- Agnar: „Það hefur verið smá flókið að eiga við einstaklingskennitölur, hjá þeim sem maður ætlar sér ekkert að skrá almennilega
-- í kerfið … svo vantar auka + í valmynd, sem segir t.d. „Afgreiðsla án stofnunar"".
--
-- Sala þar sem kennitala er slegin inn en VILJANDI er enginn viðskiptavinur stofnaður (engin röð í customers_base/fyrirtaeki).
-- Reikningurinn er óbreyttur: nafn (eða „Viðskiptavinur") og kennitalan eins og hún var slegin inn.
--
-- Merkið er nauðsynlegt svo vörðurinn audit-solu-id geti greint ÁSETNING frá BILUN: sala með kennitölu en án customer_id/
-- customer_base_id var áður alltaf bilun í auto-stofnun kassans (pos_kunni_otengd). Án merkis yrði hver slík afgreiðsla rauð.
-- Sett EFTIR insert (js/pos.js, checkout) — mistakist það stendur salan og villan fer í registry (ALLTAF LEYFA VISTUN).
--
-- Additive, nullable-laust, sjálfgefið false: engin eldri röð breytist.

alter table public.solur add column if not exists an_stofnunar boolean not null default false;
comment on column public.solur.an_stofnunar is 'true = afgreiðsla án stofnunar: kt slegin inn en enginn viðskiptavinur stofnaður (Sala → + Afgreiðsla án stofnunar). Ekki bilun í tengingu.';
