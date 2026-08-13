-- Combined migration for:
--   1. verklidur.notes  — per-unit athugasemd (so workshop/counter staff
--      can pin a note to each tæki: "þrýstingur lítill", "beygjingur",
--      "viðskiptavinur vill sækja eftir helgi", etc.)
--   2. solur.is_credit + solur.credit_of — so patch 26 (CreditInvoice)
--      and patch 92 (credit-by-num) can:
--        • Mark credit-notes explicitly
--        • Link a credit-note back to the original sale
--        • Detect "already credited" without parsing athugasemdir text
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/sql

-- ── 1. verklidur.notes ────────────────────────────────────────────────────
ALTER TABLE verklidur
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- ── 2. solur.is_credit + credit_of ────────────────────────────────────────
ALTER TABLE solur
  ADD COLUMN IF NOT EXISTS is_credit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_of bigint REFERENCES solur(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_solur_credit_of
  ON solur(credit_of) WHERE credit_of IS NOT NULL;

-- ── 3. Backfill K2605001 (created 2026-05-11 for R-000060) ────────────────
UPDATE solur
   SET is_credit = true,
       credit_of = (SELECT id FROM solur WHERE num = 'R-000060' LIMIT 1)
 WHERE num = 'K2605001';
