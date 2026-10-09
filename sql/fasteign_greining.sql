-- fasteign_greining — „Greining fasteignar" (451): lesin opinber skjöl og skyndiminni uppflettinga, lyklað á
-- skjalaslóð / landnúmer svo það sem einu sinni er lesið nýtist strax næst (líka þegar staðurinn verður viðskiptavinur
-- og Teikning opnast þar — 374 lyklar teikningar á sama landnúmer).
--
-- Tvær tegundir raða í EINNI töflu (Agnar 09.10.2026: ekki fleiri töflur en þarf):
--   tegund 'skjal'  lykill 'skjal:<.info-slóð eða PDF-slóð>'  — OCR-/textalagslestur skráningartöflu eða
--                   byggingarlýsingar (sama snið og lesid.js í bygging-uppl-frumgerðinni). Skrifað AÐEINS af
--                   brúartölvunni (luna-bridge bygging-ocr.js, service-lykill) — vafrinn má ekki falsa lestur.
--   tegund 'eign'   lykill 'eign:<landnr>' eða 'eign:<landnr>:<heitinr>' — skyndiminni síðunnar (skjalalisti,
--                   eignin, teikningafjöldi). Vafrinn má skrifa þessar raðir (anon) — þær eru endurreiknanlegar.
-- Regla Agnars um sjálfsótt gögn: þetta er allt 🏛 sjálfsótt og skrifast ALDREI í fyrirtaeki eða aðrar okkar töflur.
--
-- Beitt á Supabase 2026-10-09 gegnum MCP-migration `create_fasteign_greining`.

create table if not exists public.fasteign_greining (
  lykill       text primary key,
  tegund       text not null check (tegund in ('skjal', 'eign')),
  landnr       bigint,
  heitinr      bigint,
  heimilisfang text,
  gogn         jsonb not null default '{}'::jsonb,
  uppruni      text,
  lesid_at     timestamptz,
  updated_at   timestamptz not null default now()
);

create index if not exists fasteign_greining_landnr_idx on public.fasteign_greining (landnr);

alter table public.fasteign_greining enable row level security;

drop policy if exists "fasteign_greining_read"   on public.fasteign_greining;
drop policy if exists "fasteign_greining_insert" on public.fasteign_greining;
drop policy if exists "fasteign_greining_update" on public.fasteign_greining;

create policy "fasteign_greining_read"   on public.fasteign_greining for select using (true);
-- vafrinn: aðeins skyndiminnisraðir ('eign'); lestur skjala kemur eingöngu frá brúnni (service-lykill fer framhjá RLS)
create policy "fasteign_greining_insert" on public.fasteign_greining for insert with check (tegund = 'eign');
create policy "fasteign_greining_update" on public.fasteign_greining for update using (tegund = 'eign') with check (tegund = 'eign');

create or replace function public.fasteign_greining_snert() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists fasteign_greining_snert on public.fasteign_greining;
create trigger fasteign_greining_snert before update on public.fasteign_greining
  for each row execute function public.fasteign_greining_snert();
