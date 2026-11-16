-- 2026-11-16 — Aðalmál gagnvirkt (492d): svör, ákvarðanir og Verkefnalista-færslur á atriðum vikuyfirlitsins fara
-- um SÖMU vél og Afgreiðslan (/api/afgreidsla). Ein röð á hvert atriði, tegund 'adalmal',
-- lykill adalmal:<mál>-<hluti>-<nr> (einkvæmur = ákvörðun stendur). Aðeins viðbót við leyfðar tegundir.
alter table public.afgreidsla drop constraint if exists afgreidsla_tegund_check;
alter table public.afgreidsla add constraint afgreidsla_tegund_check
  check (tegund = any (array['tolvupostur','krafa','simtal','verk','adalmal']));
