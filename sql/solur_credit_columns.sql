-- Add is_credit / credit_of columns to solur so patch 26-credit-invoice.js
-- and patch 92-credit-by-num.js can:
--   1. Mark credit-notes explicitly (is_credit = true)
--   2. Link a credit-note back to the original sale (credit_of = solur.id)
--
-- Without these columns the credit-invoice flow falls back to encoding the
-- link in athugasemdir text, which works but breaks "already credited"
-- detection (you can credit the same sale twice without warning).
--
-- Run in Supabase SQL Editor (https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/sql).

ALTER TABLE solur
  ADD COLUMN IF NOT EXISTS is_credit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_of bigint REFERENCES solur(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_solur_credit_of ON solur(credit_of) WHERE credit_of IS NOT NULL;

-- Backfill the credit-note created on 2026-05-11 for R-000060
-- (it was inserted without these columns since they didn't exist yet).
UPDATE solur
   SET is_credit = true,
       credit_of = (SELECT id FROM solur WHERE num = 'R-000060' LIMIT 1)
 WHERE num = 'K2605001';
