-- 2026-06-05 — §4 + unified tæki base (applied live to Supabase osfdzskyvisifcwyjkuk)
--
-- Companion record for the migration applied via the Supabase API. Re-runnable
-- (guards included). Spec: Roadmap/Miro "framhald 8" build brief. Owner-confirmed.
--
-- Keystone: `uttaeki` becomes the canonical equipment base linked to
-- `customers_base`, tying §4 (seasonal/drop-off), §5 (QR) and chain-of-custody
-- into one flow. This step is (a) uttaeki+base_id backfill and (b) seasonal_job.
--
-- Backfill result (live): 5.702 tæki → 4.456 linked unambiguously (78%),
-- 1.246 left NULL for manual review (117 of them match a duplicated base-name and
-- are deliberately NOT guessed; the rest have no exact name match). 419 distinct
-- customers linked.
--
-- NOT in this migration (awaits owner): custody_status vocabulary
-- (móttekið→fyllt/lokið→tilbúið→afhent?) and the arrival/QR-print scan flow (c).
-- ---------------------------------------------------------------------------------

-- 1. seasonal_job (§4) — one open job per drop-off customer
create table if not exists public.seasonal_job (
  id               bigint generated always as identity primary key,
  customer_base_id bigint references public.customers_base(id),
  title            text,
  status           text not null default 'open' check (status in ('open','closed')),
  notes            text,
  opened_at        timestamptz not null default now(),
  closed_at        timestamptz
);
comment on table public.seasonal_job is
  'Seasonal/drop-off jobs (§4). One open job per customer accumulates serviced units; billed once per unit at the month-cut.';

-- 2. uttaeki: canonical links (all additive, nullable)
alter table public.uttaeki
  add column if not exists customer_base_id bigint,
  add column if not exists worksite_id      bigint,
  add column if not exists seasonal_job_id  bigint;

comment on column public.uttaeki.customer_base_id is 'FK -> customers_base (payer/owner of the unit). Backfilled from client name-match; null = needs manual review.';
comment on column public.uttaeki.worksite_id     is 'FK -> customer_worksite_map (specific starfsstöð), nullable.';
comment on column public.uttaeki.seasonal_job_id is 'FK -> seasonal_job, nullable; set when a unit is part of an open drop-off job.';

-- 3. Backfill customer_base_id from client, ONLY for unambiguous single-name matches
update public.uttaeki u
set customer_base_id = m.id
from (
  select lower(btrim(nafn)) n, min(id) id
  from public.customers_base
  group by lower(btrim(nafn))
  having count(*) = 1
) m
where u.customer_base_id is null
  and u.client is not null and btrim(u.client) <> ''
  and lower(btrim(u.client)) = m.n;

-- 4. FKs (values set above are valid by construction) — guarded
do $$ begin
  if not exists (select 1 from pg_constraint where conname='uttaeki_customer_base_id_fkey') then
    alter table public.uttaeki add constraint uttaeki_customer_base_id_fkey
      foreign key (customer_base_id) references public.customers_base(id);
  end if;
  if not exists (select 1 from pg_constraint where conname='uttaeki_worksite_id_fkey') then
    alter table public.uttaeki add constraint uttaeki_worksite_id_fkey
      foreign key (worksite_id) references public.customer_worksite_map(id);
  end if;
  if not exists (select 1 from pg_constraint where conname='uttaeki_seasonal_job_id_fkey') then
    alter table public.uttaeki add constraint uttaeki_seasonal_job_id_fkey
      foreign key (seasonal_job_id) references public.seasonal_job(id);
  end if;
end $$;

create index if not exists uttaeki_customer_base_id_idx on public.uttaeki(customer_base_id);
create index if not exists uttaeki_seasonal_job_id_idx  on public.uttaeki(seasonal_job_id);
create index if not exists seasonal_job_customer_idx     on public.seasonal_job(customer_base_id);
