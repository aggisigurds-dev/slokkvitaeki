-- Ein röð per verkefnalista/skýrslu í claude.ai-artifacts (Agnar 29.10.2026: "fá fjölda mála þar").
-- Tölurnar eru lesnar úr artifactinu á skrad_at og uppfærast EKKI sjálfar (artifacts eru kyrrstæð) — því fylgir dags + skrad_at.
-- Skrifað af Claude (SQL); vefurinn les aðeins. Vinnusamantekt (patch 489) telur úr þessari töflu.
-- Keyrt á live 29.10.2026 sem migration `artifact_listar`. Kemur í stað artifact_verkefni (tóm, stofnuð sama dag).
drop table if exists public.artifact_verkefni;
create table if not exists public.artifact_listar (
  url text primary key,
  titill text not null,
  tegund text not null default 'verkefnalisti' check (tegund in ('verkefnalisti','skyrsla','annad')),
  dags date,
  lifandi boolean not null default false,
  fjoldi_alls integer,
  fjoldi_opin integer,
  fjoldi_claude integer,
  fjoldi_agnar integer,
  atridi jsonb not null default '[]'::jsonb,
  athugasemd text,
  skrad_af text not null default 'claude-code',
  skrad_at timestamptz not null default now()
);
alter table public.artifact_listar enable row level security;
drop policy if exists artifact_listar_lesa on public.artifact_listar;
create policy artifact_listar_lesa on public.artifact_listar for select to anon, authenticated using (true);
comment on table public.artifact_listar is 'Fjöldi mála í verkefnalista-artifacts (claude.ai), lesið af Claude á skrad_at. Vefurinn les; sjá patch 489 (Vinnusamantekt).';
