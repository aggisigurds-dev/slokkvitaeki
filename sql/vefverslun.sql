-- Vefverslun Brunahólfs (/vefverslun) — prufuhamur og breytingakerfi (12.10.2026).
--
-- Ein röð (id = 1) heldur utan um verslunina:
--   stada  'prufa' meðan verið er að fikta (síðan sýnir drögin + prufuborðann), 'virk' þegar hún er komin í loftið.
--   drog   allt sem breytingahamurinn vistar: þema (litir, letur, rúnun), textar og stílar per lykil, myndir
--          (slóð, fit, rammastærð), hvaða vörur sjást. Vistað sjálfkrafa úr ritlinum.
--   virk   afrit af drögunum þegar ýtt var á „Virkja". Almenningur sér þetta þegar stada = 'virk'.
-- Vörurnar sjálfar, verðin og lagerstaðan eru ALDREI hér — þær koma lifandi úr `vorur` (forsíða söluborðsins).
--
-- Aðeins netlify/functions/vefverslun.cjs les og skrifar (service-lykill). RLS á, engar reglur: anon kemst ekki að.

create table if not exists public.vefverslun (
  id             smallint primary key default 1 check (id = 1),
  stada          text not null default 'prufa' check (stada in ('prufa', 'virk')),
  drog           jsonb not null default '{}'::jsonb,
  virk           jsonb,
  drog_uppfaert  timestamptz not null default now(),
  virkjad        timestamptz,
  utgafa         integer not null default 0
);
alter table public.vefverslun enable row level security;
insert into public.vefverslun (id) values (1) on conflict (id) do nothing;

-- Hver virkjun skilur eftir afrit, svo hægt sé að fara aftur í fyrri útgáfu.
create table if not exists public.vefverslun_saga (
  id          bigserial primary key,
  utgafa      integer not null,
  efni        jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.vefverslun_saga enable row level security;

-- Myndir sem eru settar inn í breytingahamnum. Opinbert bucket (myndirnar birtast á opinberri síðu);
-- aðeins service-lykillinn getur hlaðið upp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vefverslun', 'vefverslun', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
