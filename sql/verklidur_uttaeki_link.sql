-- =============================================================
-- verklidur.uttaeki_id — link workshop line items to field equipment
-- =============================================================
-- 2026-05-10: New "Sækja inn úr fyrirtæki" flow (patch 122) creates a
-- verkbeiðni with verklidur for selected `uttaeki` rows. This column
-- preserves the link so when the work is finished (patch 121 pickup
-- checkout), we can auto-update `uttaeki.next_insp` (+12 months) and
-- `last_insp` for non-broken units. Without this link the 12-month
-- scheduling has to be done manually.
--
-- Run this ONCE in Supabase SQL editor:
--   https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/sql/new
-- Idempotent — safe to re-run.

ALTER TABLE verklidur
  ADD COLUMN IF NOT EXISTS uttaeki_id BIGINT REFERENCES uttaeki(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS verklidur_uttaeki_id_idx ON verklidur(uttaeki_id);
