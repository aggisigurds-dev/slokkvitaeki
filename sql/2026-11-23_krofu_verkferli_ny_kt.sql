-- 23.11.2026 — málategundin „Ný kt félags“ (ny_kt) í verkferilsglugganum (369) — LIVE í grunni sama dag.
--
-- Agnar (Óðinn regla 50): afturkalla → bakfæra → kt félagsins færð → ný sala + ný skýrsla → ósend → Agnar sendir.
-- Óháður rýnir (23.11.2026) fann að CHECK-skorðan krofu_verkferli_tegund_check (sql/2026-09-11_krofu_verkferli.sql) leyfði ekki ny_kt, svo
-- „Stofna mál“ hefði stöðvast með villu. Skorðan er víkkuð; engu öðru breytt. Keyra á undan útgáfu 369 með ny_kt.
alter table public.krofu_verkferli drop constraint if exists krofu_verkferli_tegund_check;
alter table public.krofu_verkferli add constraint krofu_verkferli_tegund_check
  check (tegund = any (array['itreka','senda_krofu','payday_drog','krafa_ekki_stofnud','faera_kt','ny_kt','gleymt','greitt_sidar','aud_sala','stadfesta_greidslu','annad']::text[]));
