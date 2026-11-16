-- 2026-11-16 — athugasemd Agnars á hvert Afgreiðslu-verk (Agnar: „eða sett athugasemd"). Aðeins viðbót.
alter table public.afgreidsla add column if not exists athugasemd text;
alter table public.afgreidsla add column if not exists athugasemd_af text;
alter table public.afgreidsla add column if not exists athugasemd_at timestamptz;
