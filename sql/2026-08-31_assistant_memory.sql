-- ═══════════════════════════════════════════════════════════════════════════
-- AÐSTOÐARMAÐUR — samtöl og langtímaminni (Fasi 1)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Agnar 2026-08-31: talandi aðstoðarmaður inni í slokkvitaeki.netlify.app sem
-- skilur íslensku, svarar á ensku, man samtalið og man hluti milli samtala.
--
-- Þrjár töflur:
--   assistant_conversations  eitt samtal
--   assistant_messages       hver lína í samtalinu
--   assistant_memory         staðreyndir sem eiga að lifa AF samtalinu
--
-- ── ÖRYGGI: RLS ER KVEIKT OG ENGIN ANON-STEFNA ────────────────────────────
-- Þetta er MEÐVITAÐ frávik frá því sem tíðkast í þessum gagnagrunni (þar er
-- RLS víða opið — sjá `oryggi`-sérfræðinginn). Minnið mun óhjákvæmilega geyma
-- kúnnaupplýsingar: nöfn, kennitölur, athugasemdir um staði og fólk.
--
--   • netlify/functions/assistant.js notar SUPABASE_SERVICE_ROLE_KEY, sem
--     fer FRAMHJÁ RLS. Fallið virkar því óhindrað.
--   • anon-lykillinn sem liggur í js/config.js og er OPINBER í útgefna
--     bundlinu fær EKKERT. Enginn getur lesið samtölin þín úr vafranum.
--
-- Bættu ALDREI við anon-stefnu á þessar töflur „til að einfalda". Ef vafrinn
-- þarf að lesa samtal á hann að fara gegnum fallið.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Samtöl ────────────────────────────────────────────────────────────────
create table if not exists public.assistant_conversations (
  id          uuid primary key default gen_random_uuid(),
  titill      text,                       -- fyrsta spurningin, stytt — fyrir lista
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb
);

-- ── Skilaboð ──────────────────────────────────────────────────────────────
create table if not exists public.assistant_messages (
  id          bigserial primary key,
  conversation_id uuid not null
    references public.assistant_conversations(id) on delete cascade,
  role        text not null check (role in ('user','assistant','tool')),
  content     text not null,
  -- Hvaða hæfileiki var keyrður og hvað hann skilaði. Geymt svo hægt sé að
  -- rekja RANGT svar til baka í fyrirspurnina sem olli því.
  tool_name   text,
  tool_input  jsonb,
  tool_result jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists assistant_messages_conv_idx
  on public.assistant_messages (conversation_id, id);

-- ── Langtímaminni ─────────────────────────────────────────────────────────
-- Ein staðreynd á línu. `subject_*` bindur hana við fyrirtæki/tæki/stað þegar
-- það á við; almennar staðreyndir (vinnureglur, orðalag) hafa subject_type
-- 'general'. Uppfletting er á (subject_type, subject_id) eða frítextaleit.
create table if not exists public.assistant_memory (
  id           bigserial primary key,
  subject_type text not null default 'general'
               check (subject_type in ('general','fyrirtaeki','stadur','taeki','verk')),
  subject_id   text,                      -- t.d. fyrirtaeki.id sem texti
  fact         text not null,             -- staðreyndin sjálf, á mannamáli
  -- Hvaðan hún kom. „Agnar sagði þetta 31.08" er annað en „AI ályktaði þetta".
  source       text not null default 'agnar'
               check (source in ('agnar','assistant','kerfi')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Mjúk eyðing: staðreynd sem reyndist röng á að hverfa úr samhengi en
  -- ekki úr sögunni. Aðstoðarmaðurinn les aðeins þar sem active = true.
  active       boolean not null default true
);
create index if not exists assistant_memory_subject_idx
  on public.assistant_memory (subject_type, subject_id) where active;
create index if not exists assistant_memory_fact_idx
  on public.assistant_memory using gin (to_tsvector('simple', fact)) where active;

-- ── RLS: kveikt, engar stefnur → aðeins service_role kemst að ─────────────
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages      enable row level security;
alter table public.assistant_memory        enable row level security;

-- updated_at helst rétt án þess að fallið þurfi að muna það
create or replace function public.assistant_touch() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists assistant_conv_touch on public.assistant_conversations;
create trigger assistant_conv_touch before update on public.assistant_conversations
  for each row execute function public.assistant_touch();

drop trigger if exists assistant_mem_touch on public.assistant_memory;
create trigger assistant_mem_touch before update on public.assistant_memory
  for each row execute function public.assistant_touch();
