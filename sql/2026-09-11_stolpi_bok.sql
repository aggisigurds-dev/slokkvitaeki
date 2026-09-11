-- 2026-09-11 — Stólpa-bók fyrri eigenda í Supabase + Stólpa-staða á reikningsskjölum.
-- Heimild: viðskiptamannabók úr Stólpa sem Agnar sendi 11.09.2026 („reikningar_hreyfingar_frá_2023.xlsx",
-- blað Stimplanir_260518174141 — útflutt 18.05.2026, færslur 2016-01-01..2026-05-07, 15.578 raðir).
-- Regla Agnars 11.09.2026: reikningur sendur úr Stólpa telst greiddur fyrri eigendum
-- („einhverjir reikningar voru millifærðir beint á gömlu eigendurnar"). Aldrei rukka þá né stofna kröfu í Payday.
--
-- Beitt sem tvær migrations (stolpi_bok_toflur, stolpi_bok_loka) + bakfylling hér neðst.
-- Innflutningur: scratchpad-skrift (stolpi_samsvorun.py → stolpi_innflutningur.cjs) með opinbera lyklinum
-- gegnum tímabundnar anon-INSERT-reglur sem stolpi_bok_loka felldi eftir að fjöldi og summur voru sannreynd:
--   stolpi_hreyfingar 15.578 · debet 154.758.648 · kredit 140.686.996
--   stolpi_reikningar 5.095 (5.000 reikningar + 95 kredit) · upphæð 146.150.043 · opið við yfirtöku 14.377.820
-- Samsvörun per kennitölu: kreditreikningur ↔ reikningur eftir upphæð → „Greiddur reikningur: N" beint →
-- „Greiðsla á kröfu: K" eftir höfuðstól (greiðsla − innheimtukostnaður 295) → tveggja reikninga samtala → FIFO.
-- Staða: greitt 4.460 · opid_vid_yfirtoku 445 · kreditfaert 95 · kreditreikningur 95.

-- ── migration stolpi_bok_toflur ─────────────────────────────────────────────
create table if not exists public.stolpi_hreyfingar (
  id integer primary key,
  nafn text,
  kt text,
  kt10 text generated always as (regexp_replace(coalesce(kt, ''), '[^0-9]', '', 'g')) stored,
  dags date,
  eindagi date,
  texti text,
  tilvisun text,
  stadsetning text,
  runa integer,
  debet numeric not null default 0,
  kredit numeric not null default 0,
  upphaed numeric not null default 0,
  byrjunarstada numeric,
  lokastada numeric,
  tegund text not null check (tegund in ('reikningur','kredit','greiddur_reikningur','greidd_krafa','innheimtukostnadur','drattarvextir','greiddir_vextir','opnunarlina','annad')),
  reikn_nr text,
  krafa_nr text,
  heimild text not null default 'Stólpi · Stimplanir_260518174141 (útflutt 18.05.2026)',
  created_at timestamptz not null default now()
);
create index if not exists stolpi_hreyfingar_kt10_dags_idx on public.stolpi_hreyfingar (kt10, dags);
create index if not exists stolpi_hreyfingar_reikn_nr_idx on public.stolpi_hreyfingar (reikn_nr) where reikn_nr is not null;
alter table public.stolpi_hreyfingar enable row level security;

create table if not exists public.stolpi_reikningar (
  reikn_nr text primary key,
  tegund text not null check (tegund in ('reikningur','kredit')),
  kt text,
  kt10 text generated always as (regexp_replace(coalesce(kt, ''), '[^0-9]', '', 'g')) stored,
  nafn text,
  dags date,
  eindagi date,
  upphaed numeric not null,
  stada text not null check (stada in ('greitt','kreditfaert','opid_vid_yfirtoku','kreditreikningur')),
  greitt_dags date,
  krafa_nr text,
  greitt_upphaed numeric,
  opid_upphaed numeric not null default 0,
  kredit_tengsl text,
  samsvorun text,
  skyring text not null,
  heimild text not null default 'Stólpi · Stimplanir_260518174141 (útflutt 18.05.2026)',
  created_at timestamptz not null default now()
);
create index if not exists stolpi_reikningar_kt10_idx on public.stolpi_reikningar (kt10);
alter table public.stolpi_reikningar enable row level security;
-- (tímabundnar reglur stolpi_*_innflutningur_tmp „for insert to anon" — felldar í stolpi_bok_loka)

-- ── migration stolpi_bok_loka ───────────────────────────────────────────────
-- (sannreynir fjölda + summur og kastar villu ef ekki stemmir; fellir svo tímabundnu reglurnar)
drop policy if exists stolpi_hreyfingar_innflutningur_tmp on public.stolpi_hreyfingar;
drop policy if exists stolpi_reikningar_innflutningur_tmp on public.stolpi_reikningar;
alter table public.customer_documents
  add column if not exists stolpi_stada text,
  add column if not exists stolpi_skyring text;

-- ── bakfylling (keyrð 11.09.2026 — 1.064 skjöl: greitt 828 · opið 165 · kreditfært 47 · kreditreikningur 24) ──
with d as (
  select cd.id, regexp_replace(cd.invoice_number, '^[A-Za-z]+-?', '') nr, cd.amount, cb.kennitala
  from customer_documents cd left join customers_base cb on cb.id = cd.customer_base_id
  where cd.doc_type = 'reikningur' and cd.invoice_number ~ '^[RS]-?1[0-9]{5}$'
), m as (
  select d.id, s.stada, s.skyring from d join stolpi_reikningar s on s.reikn_nr = d.nr
  where s.kt10 = regexp_replace(coalesce(d.kennitala,''),'[^0-9]','','g')
     or d.amount is null
     or abs(abs(d.amount) - abs(s.upphaed)) <= 2
)
update customer_documents c set stolpi_stada = m.stada, stolpi_skyring = m.skyring
from m where c.id = m.id and (c.stolpi_stada is distinct from m.stada or c.stolpi_skyring is distinct from m.skyring);
