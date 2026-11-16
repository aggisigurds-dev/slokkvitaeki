-- 2026-11-16 — Verkefnavaktin: ný afgreidsla-tegund 'sameina'.
-- Þegar vaktin (luna-bridge/verkefna-vaktin.js) hefur unnið verk af Verkefnalistanum, prófað það og ýtt
-- GREININNI (vakt/<id>, ÁN [deploy]), fer verkið í `i_yfirferd` og ein röð verður til í `afgreidsla` með
-- tegund 'sameina'. Takkinn „Sameina og birta" á Þjónustuborðinu (eining 30) skrifar þá beiðni í
-- automation_triggers (workflow 'verkefna-sameina') sem watcher á vélinni keyrir: rebase á nýjasta
-- master/main, prófin aftur, sameina, ýta með [deploy], staðfesta með build.json, verkið -> klarad.
--
-- Aðeins VIÐBÓT við leyfðar tegundir — afturkræft (gömul gögn eru óbreytt) og má keyra á undan yfirferð.
alter table public.afgreidsla drop constraint if exists afgreidsla_tegund_check;
alter table public.afgreidsla add constraint afgreidsla_tegund_check
  check (tegund = any (array['tolvupostur','krafa','simtal','verk','adalmal','sameina']));
