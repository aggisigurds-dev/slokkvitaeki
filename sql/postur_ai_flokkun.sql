-- postur_ai_flokkun — AI-flokkun (triage) suggestions for Þjónustuver email-mál.
-- Applied live 2026-08-19 (additive, reversible). Documented here for the repo.
--
-- Non-destructive by design: the AI writes suggestions here, never onto real
-- cases. Accepting a suggestion (patch 308) writes flokkur/tags/summary/important
-- onto thjonustubeidni via the normal client update path.
--
-- Access mirrors thjonustubeidni exactly (RLS OFF, full grants to the app roles)
-- so the client can read/write it with the publishable key like every other table.
-- NOTE: like the ~19 other RLS-disabled tables, this is intentionally open to the
-- anon key; if/when RLS is designed per-table this should be included in that pass.

create table if not exists public.postur_ai_flokkun (
  beidni_id     bigint primary key,                       -- thjonustubeidni.id (mál)
  flokkur       text,                                     -- suggested: tilbod|thjonusta|brunakerfi|rukkun|samskipti
  tags          jsonb not null default '[]'::jsonb,       -- suggested tag keys (subset of the 11-tag vocab)
  important     boolean not null default false,           -- suggested Áríðandi
  summary       text,                                     -- one-line Icelandic summary
  urgency       text,                                     -- advisory: lagur|venjulegur|har
  action        text,                                     -- suggested next action (one line)
  customer_hint text,                                     -- AI-guessed company name (advisory; NOT written to customer_base_id)
  reason        text,                                     -- short why (reserved)
  model         text,                                     -- model id used
  status        text not null default 'tillaga',          -- tillaga|samthykkt|hafnad
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    text
);

grant select, insert, update, delete on public.postur_ai_flokkun to anon, authenticated, service_role;
