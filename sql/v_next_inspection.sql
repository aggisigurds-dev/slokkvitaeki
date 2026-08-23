-- v_next_inspection — virkur skoðunarmánuður per stað.  Applied 2026-08-23.
--
-- SAMA forgangsregla og „📅 <mánuður>"-takkinn í appinu (patch 153-arsskodun.js):
--   handvirkt/blob (app_kv 'arsskodun_customers') > skýrslu-mánuður
--   (arsskodun_report_facts) > skýrsla+reikningur (v_skodunar_manudur).
-- Þjónustuvefurinn (gatt.js) les þennan mánuð svo „Næsta skoðun" stemmi við
-- það sem starfsfólk sér/stillir á Ársskoðun-síðunni. Áður notaði gatt.js
-- aðeins arsskodun_report_facts og missti af reikninga-/handvirkum mánuðum
-- (t.d. Center Arnarhvoll/Laugavegur/Plaza/Þingholt = september úr reikningi).

create or replace view v_next_inspection as
select
  f.id               as site_id,
  f.customer_base_id as base_id,
  coalesce(
    nullif(nullif(((select value from app_kv where key = 'arsskodun_customers') -> f.id::text ->> 'inspect_month'), '')::int, 0),
    af.inspect_month,
    vm.inspect_month
  )::smallint        as inspect_month
from fyrirtaeki f
left join arsskodun_report_facts af on af.fyrirtaeki_id = f.id
left join v_skodunar_manudur    vm on vm.fyrirtaeki_id = f.id
where f.deleted_at is null;
