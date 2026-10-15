-- fasteign_teikningasafn — „Teikningasafn" fasteignarinnar í Greiningu fasteignar (451).
--
-- Agnar 15.10.2026 (Asparfell 2-12): „geturðu heimilað að ég geti vistað í teikningasafn fasteignarinnar. og síðan
-- líka heimilað að ég geti vistað á ákveðið svæði byggingar. asparfell 12 1 hæð td" — og: „fínt að geta búið til bara
-- smá safn með hinum og þessum teikningum … bara svona auka safn ótengt til að byrja með".
--
-- Uppflettiblöð (aðaluppdrættir, lagnir, raflagnir, sérteikningar) lykluð á LANDNÚMER, hvert með frjálsu svæðisheiti
-- („Asparfell 12 · 1. hæð", „Allt húsið"). ÓTENGT hæðum Teikningar (teikning_bord), 3D og TurboPaint — ekkert þar breytist.
-- Ekkert harðeytt (vistun má aldrei glatast): „Fjarlægja" setur fjarlaegt_at; RLS leyfir enga eyðingu.
--
-- Beitt á Supabase 2026-10-15 gegnum MCP-migration `create_fasteign_teikningasafn`.

create table if not exists public.fasteign_teikningasafn (
  id            bigint generated always as identity primary key,
  landnr        bigint not null,
  svaedi        text   not null default '',          -- frjálst: „Asparfell 12 · 1. hæð"; '' = óflokkað
  slod          text   not null,                     -- frumslóð blaðsins (.info í skjalasafni / PDF hjá sveitarfélagi)
  titill        text,
  undir         text,                                -- undirlína flísarinnar (dags · lýsing)
  mynd          text,                                -- smámynd skjalasafnsins ef til (annars teiknuð úr PDF)
  tegund        text,
  dags          text,
  athugasemd    text,
  heimilisfang  text,
  vistad_af     text,
  created_at    timestamptz not null default now(),
  fjarlaegt_at  timestamptz,
  fjarlaegt_af  text
);

create index if not exists fasteign_teikningasafn_landnr_idx on public.fasteign_teikningasafn (landnr) where fjarlaegt_at is null;
-- sama blað aðeins einu sinni á sama svæði (meðan það er í safninu)
create unique index if not exists fasteign_teikningasafn_einu_sinni on public.fasteign_teikningasafn (landnr, svaedi, slod) where fjarlaegt_at is null;

alter table public.fasteign_teikningasafn enable row level security;

drop policy if exists "fasteign_teikningasafn_read"   on public.fasteign_teikningasafn;
drop policy if exists "fasteign_teikningasafn_insert" on public.fasteign_teikningasafn;
drop policy if exists "fasteign_teikningasafn_update" on public.fasteign_teikningasafn;

create policy "fasteign_teikningasafn_read"   on public.fasteign_teikningasafn for select using (true);
create policy "fasteign_teikningasafn_insert" on public.fasteign_teikningasafn for insert with check (landnr > 0 and length(slod) > 0 and fjarlaegt_at is null);
-- uppfærsla: svæði/athugasemd og fjarlæging; ENGIN delete-regla (ekkert harðeytt úr vafranum)
create policy "fasteign_teikningasafn_update" on public.fasteign_teikningasafn for update using (true) with check (landnr > 0 and length(slod) > 0);
