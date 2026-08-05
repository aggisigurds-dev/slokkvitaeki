-- ============================================================================
-- AUDIT_VERND — þjöppun sögunnar án þess að nokkuð glatist (2026-08-05)
--
-- Framhald af 2026-08-05_audit_vernd_diff.sql (sem stöðvaði vöxtinn).
-- Hér var GAMLA sagan þjöppuð: 1.486 heil afrit af 1,4 MB stillingablobbi
-- (799 MB) → mismunur milli útgáfa (71 MB). ENGIN RÖÐ VAR FJARLÆGÐ.
--
--   audit_vernd:  846 MB → 90 MB      (20.445 raðir → 20.445 raðir)
--   gagnagrunnur: 1,2 GB → 369 MB
--
-- ── AF HVERJU ÞETTA ER ÖRUGGT ──────────────────────────────────────────────
-- Hver röð geymir nú: (a) þá lykla sem þessi útgáfa átti og næsta breytti, með
-- GÖMLU gildunum, og (b) lista yfir lykla sem VORU EKKI TIL í þessari útgáfu.
-- Þar með má reikna hverja einustu gömlu útgáfu til baka, stafrétt:
--
--     eldri_utgafa = (yngri_utgafa - fjarlaegja) || settings
--
-- SANNPRÓFAÐ ÁÐUR EN NOKKRU VAR BREYTT:
--   • 1.490 af 1.490 útgáfum reiknaðar til baka og bornar saman stafrétt → 0 villur
--   • 12 skrefa keðja aftur á bak gegnum þjöppuðu gögnin → öll skref stafrétt eins
--   • audit_settings_endurgera() prófað á 8 útgáfum → allar stafrétt eins
-- EFTIR þjöppun:
--   • akkerið (nýjasta heila afritið, id 22915) reiknast stafrétt út úr keðjunni
--   • elsta útgáfan (18. júlí) skilar sér með 43 lyklum, þ.m.t. geocode_cache
--
-- ── HVERNIG MAÐUR NOTAR VERNDINA ───────────────────────────────────────────
--   -- stillingarnar eins og þær voru við tiltekna breytingu:
--   select audit_settings_endurgera(22900);
--
--   -- hvað tiltekin breyting yfirskrifaði (og gömlu gildin):
--   select changed_at, old_row->'settings' from audit_vernd where id = 22900;
--
--   -- endurheimta einn lykil sem önnur vél tróð yfir:
--   update app_settings
--      set settings = jsonb_set(settings, '{rekstrarfelog}',
--                               audit_settings_endurgera(22900)->'rekstrarfelog')
--    where id = 1;
--
-- Hjálpartöflurnar `audit_settings_thjappad` (afrit af mismuninum) og
-- `audit_settings_rod` standa eftir sem öryggisafrit — óhætt að henda þeim
-- síðar: drop table audit_settings_thjappad, audit_settings_rod;
-- ============================================================================

-- 1) Reikna mismun milli hverrar útgáfu og þeirrar næstu
create table if not exists public.audit_settings_thjappad (
  id bigint primary key, changed_at timestamptz,
  breytt jsonb not null default '{}', fjarlaegja jsonb not null default '[]',
  sannprofad boolean not null default false
);

insert into public.audit_settings_thjappad (id, changed_at, breytt, fjarlaegja)
with s as (
  select id, changed_at, old_row->'settings' as st,
         lead(old_row->'settings') over (order by id) as nxt
  from audit_vernd where table_name='app_settings' and old_row ? 'settings'
)
select s.id, s.changed_at,
  (select coalesce(jsonb_object_agg(k, s.st->k), '{}'::jsonb)
     from jsonb_object_keys(s.st) k where (s.st->k) is distinct from (s.nxt->k)),
  (select coalesce(jsonb_agg(k), '[]'::jsonb)
     from jsonb_object_keys(s.nxt) k where not (s.st ? k))
from s where s.nxt is not null
on conflict (id) do nothing;

-- 2) SANNPRÓFUN — verður að skila rangar = 0 áður en lengra er haldið
-- with s as (select a.id, a.old_row->'settings' st,
--                   lead(a.old_row->'settings') over (order by a.id) nxt
--            from audit_vernd a where a.table_name='app_settings' and a.old_row ? 'settings')
-- select count(*) filter (where s.st is distinct from
--        ((s.nxt - (select coalesce(array_agg(v),'{}'::text[])
--                     from jsonb_array_elements_text(t.fjarlaegja) v)) || t.breytt)) as rangar
-- from audit_settings_thjappad t join s on s.id = t.id;

-- 3) Skipta út — í skömmtum. Akkerið (nýjasta heila afritið) helst óbreytt.
-- update audit_vernd a
--   set old_row = jsonb_build_object('id', a.old_row->'id', 'audit_form', 'thjappad',
--                                    'settings', t.breytt, 'fjarlaegja', t.fjarlaegja)
--   from audit_settings_thjappad t
--  where t.id = a.id and a.table_name='app_settings'
--    and (a.old_row->>'audit_form') is null and a.id <> 22915
--    and a.id in (select id from audit_vernd where table_name='app_settings'
--                  and (old_row->>'audit_form') is null and id <> 22915 order by id limit 400);

-- 4) Endurheimta plássið
-- vacuum full audit_vernd;
