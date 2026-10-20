-- bunadargreining_verk — biðröð „verkhringrásar Arnolds“ (Búnaðargreining gerð af kerfinu sjálfu).
--
-- Agnar 21.10.2026: „reyna gera kerfinu kleift að geta gert þetta sjálft, með einhvernskonar verkhringrás".
-- Turbo-takkinn í Búnaðargreiningu (474) setur röð hér (status 'bida'); sá sem vinnur verkið (Arnold-vaktin, tímasett verk, eða
-- bridge-vélin) tekur næstu með `bgr_verk.cjs naest` (bida → i_vinnslu, atómískt) og skrifar framvindu í `framvinda` á hverju
-- stigi svo takkinn í appinu sýni hvar verkið er. Aðferðin: .claude/skills/arnold/references/verkhringras.md.
--
-- Eyðing er ekki leyfð (engin DELETE-regla); misheppnað verk fær status 'villa' + skilabod, afturkallað 'afturkallad'.

create table if not exists public.bunadargreining_verk (
  id           bigint generated always as identity primary key,
  company_id   bigint not null,
  status       text   not null default 'bida' check (status in ('bida', 'i_vinnslu', 'lokid', 'villa', 'afturkallad')),
  stig         text   not null default 'bida',          -- bida | undirbuningur | lestur | sannreyning | vistun | skyrsla | lokid
  beidandi     text,                                    -- hver bað (turbo-takki · Agnar · agent)
  skilabod     text,                                    -- síðasta skilaboð / villa
  framvinda    jsonb  not null default '[]'::jsonb,     -- [{at, stig, texti}]
  nidurstada   jsonb,                                   -- {greining_id, tki, haedir, pdf:[nöfn]}
  vinnumappa   text,
  vel          text,                                    -- hver tók verkið (tölvuheiti / session)
  created_at   timestamptz not null default now(),
  tekid_at     timestamptz,
  updated_at   timestamptz not null default now(),
  lokid_at     timestamptz
);
create index if not exists bunadargreining_verk_bida_idx on public.bunadargreining_verk (status, created_at);
create index if not exists bunadargreining_verk_company_idx on public.bunadargreining_verk (company_id, created_at desc);
-- aðeins eitt opið verk á félag (bida | i_vinnslu) — takkinn tvíýtist ekki
create unique index if not exists bunadargreining_verk_eitt_opid on public.bunadargreining_verk (company_id) where status in ('bida', 'i_vinnslu');

alter table public.bunadargreining_verk enable row level security;
drop policy if exists "bunadargreining_verk_read"   on public.bunadargreining_verk;
drop policy if exists "bunadargreining_verk_insert" on public.bunadargreining_verk;
drop policy if exists "bunadargreining_verk_update" on public.bunadargreining_verk;
create policy "bunadargreining_verk_read"   on public.bunadargreining_verk for select using (true);
create policy "bunadargreining_verk_insert" on public.bunadargreining_verk for insert with check (company_id > 0 and status = 'bida');
create policy "bunadargreining_verk_update" on public.bunadargreining_verk for update using (true) with check (company_id > 0);
