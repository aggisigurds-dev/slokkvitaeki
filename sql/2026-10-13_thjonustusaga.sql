-- ÞJÓNUSTUSAGA + HLEÐSLUSPÁ (13.10.2026, Agnar: „new service database")
--
-- Ein röð = (staður, ár, tegund, heimild): hve mörg tæki voru YFIRFARIN, HLAÐIN og NÝ.
-- Tegundir eru þær þrjár sem Agnar bað um: léttvatn, duft (2 + 6-12 kg), kolsýra (2 + 5 kg);
-- 'oskilgreint' = skýrslutexti nefnir tölu án tegundar („17 slökkvitæki endurhlaðin").
-- Fyllt af tools/thjonustusaga.cjs --skrifa (afleidd tafla — má tæma og endurreikna hvenær sem er).
--
-- Heimildaröðin (sjá docs/FACT-CHECK-YFIRFERD.md + minni): sala/reikningur > skýrslutexti > skýrsla.
-- Tólið skrifar 'skyrsla'-yfirferð AÐEINS fyrir (staður, ár) án reiknings og 'skyrslutexti'-hleðslu
-- AÐEINS fyrir (staður, ár) þar sem enginn reikningur sýnir hleðslu — svo má leggja saman í viewinu.
--
-- Applied to project osfdzskyvisifcwyjkuk on 2026-10-13 (apply_migration thjonustusaga).

create table if not exists public.thjonustusaga (
  id              bigint generated always as identity primary key,
  fyrirtaeki_id   bigint not null,
  ar              smallint not null,
  tegund          text not null check (tegund in ('lettvatn','duft','co2','oskilgreint')),
  yfirfarin       integer not null default 0,
  hladin          integer not null default 0,
  ny              integer not null default 0,
  heimild         text not null check (heimild in ('sala','reikningur','skyrslutexti','skyrsla')),
  tilvisun        text,                 -- R-000804 / 107397 / doc 1234 — hvaðan talan kemur
  sundurlidun     jsonb,                -- {"duft6":4,"duft2":1} / {"co2_5":2} — fína skiptingin
  texti           text,                 -- setningin úr skýrslunni sem talan var lesin úr
  skrad_at        timestamptz not null default now(),
  unique (fyrirtaeki_id, ar, tegund, heimild)
);
create index if not exists thjonustusaga_fid_ar_idx on public.thjonustusaga (fyrirtaeki_id, ar);
grant all on public.thjonustusaga to anon, authenticated, service_role;
grant usage, select on sequence public.thjonustusaga_id_seq to anon, authenticated, service_role;

-- HLEÐSLUSPÁ: Agnar 13.10.2026 — „hlaða is every 5 years". Tæki sem var hlaðið eða selt nýtt árið Y
-- kemur aftur í hleðslu árið Y+5. Næsta heimsókn = yfirstandandi ár sé skoðun ársins eftir („Eftir 2026"),
-- annars næsta ár. Í hleðslu við heimsóknina = virk tæki − þau sem voru hlaðin/ný innan glugga [V-4, V].
-- elsta_heimild segir hve langt sagan nær: nái hún ekki aftur til V-4 geta tæki hafa verið hlaðin án þess
-- að við sjáum það — þá er talan efri mörk, ekki staðreynd.
create or replace view public.v_hledsluspa as
with ars as (
  select (key)::bigint fid,
         nullif(value->>'last_year_inspected','')::int last_year,
         nullif(value->>'inspect_month','')::int inspect_month,
         nullif(value->>'field_inspected_year','')::int field_year
  from app_settings, jsonb_each(coalesce(settings->'arsskodun_customers','{}'::jsonb))
  where id = 1
),
taeki as (
  select fyrirtaeki_id fid,
         count(*) filter (where type ilike '%léttvatn%' or type ilike '%lettvatn%') lettvatn,
         count(*) filter (where type ilike '%duft%') duft,
         count(*) filter (where type ~* 'co2|co₂|kolsýr') co2
  from uttaeki where status <> 'urelt' and fyrirtaeki_id is not null
  group by fyrirtaeki_id
),
grunnur as (
  select f.id fid, f.nafn, f.kennitala, f.er_i_thjonustu, a.last_year, a.inspect_month,
         coalesce(t.lettvatn,0) lettvatn, coalesce(t.duft,0) duft, coalesce(t.co2,0) co2,
         case when coalesce(a.last_year,0) >= extract(year from now())::int then extract(year from now())::int + 1
              else extract(year from now())::int end naesta_heimsokn,
         case when coalesce(a.last_year,0) >= extract(year from now())::int then 'Búið ' || extract(year from now())::int
              when a.field_year = extract(year from now())::int then 'Í vinnslu ' || extract(year from now())::int
              when coalesce(a.last_year,0) = extract(year from now())::int - 1 then 'Eftir ' || extract(year from now())::int
              when coalesce(a.last_year,0) > 0 then 'Síðast ' || a.last_year
              else 'Aldrei skoðað' end stada
  from fyrirtaeki f
  left join ars a on a.fid = f.id
  left join taeki t on t.fid = f.id
  where f.deleted_at is null
),
saga as (
  select s.fyrirtaeki_id fid, g.naesta_heimsokn v,
         sum(s.hladin + s.ny) filter (where s.tegund='lettvatn' and s.ar between g.naesta_heimsokn-4 and g.naesta_heimsokn) lv_nyleg,
         sum(s.hladin + s.ny) filter (where s.tegund='duft'     and s.ar between g.naesta_heimsokn-4 and g.naesta_heimsokn) duft_nyleg,
         sum(s.hladin + s.ny) filter (where s.tegund='co2'      and s.ar between g.naesta_heimsokn-4 and g.naesta_heimsokn) co2_nyleg,
         sum(s.hladin + s.ny) filter (where s.tegund='oskilgreint' and s.ar between g.naesta_heimsokn-4 and g.naesta_heimsokn) osk_nyleg,
         min(s.ar) elsta_heimild,
         max(s.ar) filter (where s.hladin > 0) sidasta_hledsla,
         max(s.ar) filter (where s.ny > 0) sidasta_nytt,
         string_agg(distinct s.heimild, ',') heimildir
  from thjonustusaga s join grunnur g on g.fid = s.fyrirtaeki_id
  group by s.fyrirtaeki_id, g.naesta_heimsokn
)
select g.fid fyrirtaeki_id, g.nafn, g.kennitala, g.er_i_thjonustu, g.last_year, g.inspect_month, g.stada, g.naesta_heimsokn,
       g.lettvatn + g.duft + g.co2 taeki, g.lettvatn taeki_lettvatn, g.duft taeki_duft, g.co2 taeki_co2,
       coalesce(s.lv_nyleg,0) nyleg_lettvatn, coalesce(s.duft_nyleg,0) nyleg_duft, coalesce(s.co2_nyleg,0) nyleg_co2, coalesce(s.osk_nyleg,0) nyleg_oskilgreint,
       greatest(g.lettvatn - coalesce(s.lv_nyleg,0), 0) til_hledslu_lettvatn,
       greatest(g.duft     - coalesce(s.duft_nyleg,0), 0) til_hledslu_duft,
       greatest(g.co2      - coalesce(s.co2_nyleg,0), 0) til_hledslu_co2,
       greatest(g.lettvatn + g.duft + g.co2 - coalesce(s.lv_nyleg,0) - coalesce(s.duft_nyleg,0) - coalesce(s.co2_nyleg,0) - coalesce(s.osk_nyleg,0), 0) til_hledslu,
       s.elsta_heimild, s.sidasta_hledsla, s.sidasta_nytt, s.heimildir,
       case when s.elsta_heimild is null then 'engin saga — allt óvíst'
            when s.elsta_heimild > g.naesta_heimsokn - 4 then 'saga nær aðeins til ' || s.elsta_heimild || ' — efri mörk'
            else 'saga nær 5 ár aftur' end ath
from grunnur g
left join saga s on s.fid = g.fid;

grant select on public.v_hledsluspa to anon, authenticated, service_role;
