-- 16.11.2026 — v_kredit_an_endurgerdar: endurgerð á NÝRRI kennitölu hjá sama kúnna telst endurgerð.
--
-- Bilunin: sýnin taldi kreditfærðan reikning „endurgerðan" aðeins ef nýrri reikningur bar SÖMU kennitölu.
-- Þegar tilgangur kreditfærslunnar var einmitt að skipta um kennitölu (tveir reikningar 16.11.2026) birtust
-- þeir ranglega sem „kredit án endurgerðar" á Vinnusamantekt og í ráðgjafanum (2 raðir, 91.968 kr.).
--
-- Lagfæringin: NOT EXISTS-skilyrðið tekur nú líka nýrri reikning á sama customer_base_id (sami kúnni).
-- Mælt fyrir og eftir: 29 raðir → 27; aðeins þessar tvær hurfu.
-- Keyrt sem migration „kredit_an_endurgerdar_endurgerd_a_sama_kunna". Fyrri skilgreining er geymd í
-- app_kv['v_kredit_an_endurgerdar_afrit_20261116'].skilgreining (afturköllun: create or replace view … as <hún>).

do $$
declare
  skilgr text := pg_get_viewdef('public.v_kredit_an_endurgerdar'::regclass, true);
  gamalt text := 'regexp_replace(COALESCE(n.customer_kt, ''''::text), ''\D''::text, ''''::text, ''g''::text) = regexp_replace(COALESCE(s.customer_kt, ''''::text), ''\D''::text, ''''::text, ''g''::text) AND n.created_at > k.created_at';
  nytt text := '(regexp_replace(COALESCE(n.customer_kt, ''''::text), ''\D''::text, ''''::text, ''g''::text) = regexp_replace(COALESCE(s.customer_kt, ''''::text), ''\D''::text, ''''::text, ''g''::text) OR (s.customer_base_id IS NOT NULL AND n.customer_base_id = s.customer_base_id)) AND n.created_at > k.created_at';
  fj int;
begin
  fj := (length(skilgr) - length(replace(skilgr, gamalt, ''))) / length(gamalt);
  if fj <> 1 then raise exception 'Bjóst við nákvæmlega einu tilviki af skilyrðinu, fann %', fj; end if;
  insert into app_kv (key, value) values ('v_kredit_an_endurgerdar_afrit_20261116', jsonb_build_object('skilgreining', skilgr, 'tekid', now()))
    on conflict (key) do nothing;
  execute 'create or replace view public.v_kredit_an_endurgerdar as ' || replace(skilgr, gamalt, nytt);
end $$;
