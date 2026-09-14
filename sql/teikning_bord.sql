-- teikning_bord — staðsetningar slökkvitækja á gólfplani, per fyrirtæki.
--
-- Fært af localStorage (per vafra) yfir á þjón svo merkingar berist milli allra
-- 4 vélanna (SAMSTILLT MILLI VÉLA-reglan í CLAUDE.md). Notað af
-- js/patches/375-teikning-vistun.js (skreytir FloorPlan.save/.load í js/scanner.js).
--
-- Beitt á Supabase 2026-09-14 gegnum MCP-migration `create_teikning_bord`.
-- Anon-opið eins og turbopaint_boards (appið skrifar með anon-lykli).

create table if not exists public.teikning_bord (
  company_id bigint primary key,                    -- fyrirtaeki.id
  markers    jsonb not null default '[]'::jsonb,    -- [{unitId, x, y}] í NATIVE-pixlum myndarinnar
  image_url  text,                                  -- proxy-slóð (skjalasafn) eða data-URL (handvirk upphleðsla)
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.teikning_bord enable row level security;

drop policy if exists "teikning_bord_read"   on public.teikning_bord;
drop policy if exists "teikning_bord_insert" on public.teikning_bord;
drop policy if exists "teikning_bord_update" on public.teikning_bord;

create policy "teikning_bord_read"   on public.teikning_bord for select using (true);
create policy "teikning_bord_insert" on public.teikning_bord for insert with check (true);
create policy "teikning_bord_update" on public.teikning_bord for update using (true) with check (true);
