-- =============================================================
-- solur.status — drög vs. final
-- =============================================================
-- Phase B (2026-05-09): Sölur með „Greitt síðar" eru ekki kláraðar fyrr en
-- viðskiptavinur SÆKIR. Þangað til hafa þær status='drog' og er falið frá
-- Tekjum / Bókhaldi. Þegar Sótt ✓ er smellt setur patch 121 þær á 'final'
-- og uppfærir línurnar miðað við hvað var raunverulega afhent.
--
-- Run this ONCE in Supabase SQL editor:
--   https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/sql/new
-- Paste the whole file and click Run.
-- Idempotent — safe to re-run.

ALTER TABLE solur
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'final'
  CHECK (status IN ('drog', 'final'));

CREATE INDEX IF NOT EXISTS solur_status_idx ON solur(status);

-- Backfill: existing rows are all considered final (they're already in
-- accounting). Any new row from POS with greitt_sidar will set status='drog'
-- explicitly (see js/pos.js).
UPDATE solur SET status = 'final' WHERE status IS NULL;
