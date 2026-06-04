-- 2026-06-05 — Steypustöðin: Þorlákshöfn is another name for Helguvík (owner-confirmed)
-- (applied live to Supabase osfdzskyvisifcwyjkuk)
--
-- Companion record. Idempotent. Follows 2026-06-05_steypustodin_backfill.sql.
--
-- Owner: "Þorlákshöfn is another name for Helguvík". Both batches are TMP-####
-- placeholder serials (from the árskoðun bulk seed), distinct serials, already
-- linked to customers_base 720. Owner chose to KEEP all units and fold the
-- label into one site → relabel the 29 Þorlákshöfn rows to Helguvík.
-- Result (live): Helguvík 29 → 58, Þorlákshöfn → 0.
--
-- Also confirmed: Íshella and Hólabrú are NOT serviced — neither appears in
-- customers_base nor uttaeki, so there is nothing to clean up for them.
-- ---------------------------------------------------------------------------------

update public.uttaeki
set client = 'Steypustöðin Helguvík'
where client = 'Steypustöðin Þorlákshöfn';
