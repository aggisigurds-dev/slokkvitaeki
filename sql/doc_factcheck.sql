-- doc_factcheck — per-skjal factcheck staða (skýrslu/reikningur) í fyrirtækjaprófíl.
-- Applied to Supabase (osfdzskyvisifcwyjkuk) 2026-08-23.
--
-- 3-stiga hringrás (patch 199-doc-year-grid.js, dfcToggle): smellur á checkmark
-- við hvert skjal fer 0→1→2→0:
--   0 = grátt (sjálfgefið, ekki yfirfarið)
--   1 = blátt  (Claude factcheck)
--   2 = grænt  (staðfest af Agnari)
-- Skrifað BEINT úr vafra (eins og year_factcheck) — RLS slökkt til samræmis.
-- Keyed á customer_documents.id.

create table if not exists doc_factcheck (
  doc_id     bigint primary key,
  status     smallint not null default 0,
  updated_at timestamptz not null default now()
);
