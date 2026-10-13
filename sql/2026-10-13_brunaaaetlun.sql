-- Brunaáætlun (13.10.2026): ein röð á fyrirtæki með öllu sem smiðurinn í /brunaaaetlun/ geymir —
-- reitir, kaflatextar sem hafa verið breyttir, merkingar á uppdrætti hverrar hæðar (í frummyndar-px eins og
-- teikning_bord) og rammi hverrar hæðar. Sama aðgangsstýring og teikning_bord (lesa/stofna/uppfæra, engin eyðing).
-- Vistun biðlarans er skilyrt á updated_at svo tvær vélar skrifi ekki hvor yfir aðra.
create table if not exists public.brunaaaetlun (
  company_id bigint primary key,
  efni jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.brunaaaetlun enable row level security;
drop policy if exists "brunaaaetlun_read" on public.brunaaaetlun;
drop policy if exists "brunaaaetlun_insert" on public.brunaaaetlun;
drop policy if exists "brunaaaetlun_update" on public.brunaaaetlun;
create policy "brunaaaetlun_read"   on public.brunaaaetlun for select using (true);
create policy "brunaaaetlun_insert" on public.brunaaaetlun for insert with check (true);
create policy "brunaaaetlun_update" on public.brunaaaetlun for update using (true) with check (true);
grant select, insert, update on public.brunaaaetlun to anon, authenticated;
