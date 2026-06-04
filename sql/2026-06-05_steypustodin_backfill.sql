-- 2026-06-05 — §4 worksite-aware backfill, pass 2: Steypustöðin sites
-- (applied live to Supabase osfdzskyvisifcwyjkuk)
--
-- Companion record. Re-runnable / idempotent (guarded on customer_base_id null).
-- Follows 2026-06-05_unify_taeki_base_seasonal.sql (pass 1).
--
-- Pass 1 left 1.246 uttaeki rows unlinked because they're labelled by SITE, not
-- by the parent company name. Steypustöðin is the cleanest such cluster: four
-- site labels, 29 tæki each (116 total), all owned by one payer —
-- customers_base id 720 "Steypustöðin". (NB: base 379 "Steypustöðin
-- Vatnskarðsnámur" is a DIFFERENT payer and is deliberately NOT touched here.)
--
-- Þorlákshöfn vs Helguvík: both roll up to base 720 regardless of whether
-- Þorlákshöfn is a distinct physical site — the site-level split only matters
-- for worksite_id granularity (no customer_worksite_map rows exist for these
-- yet, so worksite_id stays null; split later if needed).
--
-- Center Hótel cluster (149 units) intentionally left for a later pass — no
-- single parent base exists yet (per-hotel vs one chain payer is undecided).
-- ---------------------------------------------------------------------------------

update public.uttaeki
set customer_base_id = 720
where customer_base_id is null
  and client in (
    'Steypustöðin Borgarnes',
    'Steypustöðin Þorlákshöfn',
    'Steypustöðin Hringhella',
    'Steypustöðin Helguvík'
  );
-- Result (live): 116 rows linked (29 each × 4 sites). Unlinked now ~1.130.
