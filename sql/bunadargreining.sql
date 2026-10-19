-- bunadargreining — „Búnaðargreining" staðar (js/patches/474-bunadargreining.js).
--
-- Agnar 19.10.2026 (Álfhella 9): „Þetta er í raun alveg nýr feature — Búnaðargreining" og „vista þessar niðurstöður á
-- Álfhellu 9, svo þetta sé fast og þurfi ekki að leita aftur".
--
-- Búnaður lesinn af samþykktum aðaluppdráttum (SLT / S / BS / BRSL …) + brunavarnatexti hönnuðar, vistað FAST á
-- fyrirtækinu. Ein virk röð á fyrirtæki; „Greina aftur" setur fjarlaegt_at á þá gömlu (saga helst). RLS leyfir enga
-- eyðingu (vistun má aldrei glatast). Aðferðin: .claude/skills/arnold/references/bunadargreining.md.
--
-- Beitt á Supabase 2026-10-19 gegnum MCP-migration `create_bunadargreining`.

create table if not exists public.bunadargreining (
  id            bigint generated always as identity primary key,
  company_id    bigint not null,
  landnr        bigint,
  heimilisfang  text,
  stada         text   not null default 'tillaga',   -- tillaga | yfirfarin
  tki           jsonb  not null default '[]'::jsonb, -- [{audkenni, bunadur, tegund, stadur, mhl, haed, haed_id, x, y, unitId, heimild, upplysingar?}]
  texti         jsonb  not null default '[]'::jsonb, -- [{mhl, titill, heimild, kaflar:[{fyrirsogn, texti, lykill}]}]
  heimildir     jsonb  not null default '[]'::jsonb, -- [{titill, dags, slod, gildir, athugasemd}]
  athugasemdir  jsonb  not null default '[]'::jsonb, -- [texti]
  samantekt     jsonb  not null default '{}'::jsonb, -- {slokkvitaeki, slongur, mhl:[{mhl, m2, haedir}]}
  skyrsla       jsonb,                               -- {id, name, path} í company_attachments (111)
  af            text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  fjarlaegt_at  timestamptz,
  fjarlaegt_af  text
);
create unique index if not exists bunadargreining_ein_virk on public.bunadargreining (company_id) where fjarlaegt_at is null;
create index if not exists bunadargreining_landnr_idx on public.bunadargreining (landnr) where fjarlaegt_at is null;

alter table public.bunadargreining enable row level security;
drop policy if exists "bunadargreining_read"   on public.bunadargreining;
drop policy if exists "bunadargreining_insert" on public.bunadargreining;
drop policy if exists "bunadargreining_update" on public.bunadargreining;
create policy "bunadargreining_read"   on public.bunadargreining for select using (true);
create policy "bunadargreining_insert" on public.bunadargreining for insert with check (company_id > 0 and fjarlaegt_at is null);
create policy "bunadargreining_update" on public.bunadargreining for update using (true) with check (company_id > 0);
