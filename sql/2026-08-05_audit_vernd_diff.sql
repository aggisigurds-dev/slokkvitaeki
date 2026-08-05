-- ============================================================================
-- AUDIT_VERND — hætta að afrita 1,4 MB blobb við hverja vistun (2026-08-05)
--
-- MÆLING sem kveikti á þessu:
--   audit_vernd = 846 MB alls / 20.441 raðir.
--   Sundurliðað:  app_settings  1.487 raðir × 551 kB = 799 MB  (94%)
--                 allar hinar  18.954 raðir          =  11 MB
--
-- Ástæðan: triggerinn geymdi `to_jsonb(OLD)` — heila gömlu röðina. Fyrir
-- app_settings er það EINN jsonb-dálkur upp á 1,4 MB, svo hver einasta
-- stillingavistun (geocode-cache, útlitsbreyting, viðhengi …) afritaði allan
-- blobbinn.
--
-- VERNDIN ER ÓBREYTT — hún geymir áfram nákvæmlega það sem var yfirskrifað:
-- fyrir app_settings eru nú geymdir AÐEINS þeir lyklar sem breyttust, með
-- GÖMLU gildunum. Það er einmitt það sem þarf til að sjá og endurheimta vinnu
-- sem önnur vél tróð yfir. Aðrar töflur eru nákvæmlega eins og áður.
--
-- Mælt eftir breytingu: 551 kB → ~100 bæti á röð.
--   • ný lyklaviðbót   → { "lykill": null }          (var ekki til áður)
--   • breytt gildi     → { "lykill": <gamla gildið> }
--   • eyddur lykill    → { "lykill": <gamla gildið> }
-- ============================================================================

create or replace function public.audit_vernd_guard()
returns trigger
language plpgsql
security definer
as $function$
declare
  o jsonb;
  n jsonb;
  payload jsonb;
begin
  o := to_jsonb(OLD);

  if TG_TABLE_NAME = 'app_settings' and TG_OP = 'UPDATE' then
    n := to_jsonb(NEW);
    payload := jsonb_build_object(
      'id', o->'id',
      'audit_form', 'breyttir_lyklar',
      'settings', (
        select coalesce(jsonb_object_agg(k.key, o->'settings'->k.key), '{}'::jsonb)
        from (
          select jsonb_object_keys(
            coalesce(o->'settings', '{}'::jsonb) || coalesce(n->'settings', '{}'::jsonb)
          ) as key
        ) k
        where (o->'settings'->k.key) is distinct from (n->'settings'->k.key)
      )
    );
  else
    payload := o;
  end if;

  insert into audit_vernd (table_name, op, row_id, old_row)
  values (TG_TABLE_NAME, TG_OP, (o->>'id'), payload);

  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end
$function$;

-- ── EFTIR STENDUR (bíður ákvörðunar Agnars) ─────────────────────────────────
-- 799 MB af GÖMLUM heilum app_settings-afritum (1.487 raðir, 2026-07-18→08-05).
-- Þau má þjappa í sama form og að ofan — fyrir hverja röð aðeins þá lykla sem
-- eru frábrugðnir NÆSTU röð á eftir, sem er nákvæmlega sama vernd og héðan í
-- frá. Það losar ~790 MB. EKKI keyrt — Agnar á að velja.
--
-- create table audit_vernd_backup_20260805 as
--   select * from audit_vernd where table_name = 'app_settings';   -- afrit fyrst
