-- =============================================================
-- geocode_cache — shared address → coords cache across all PCs.
-- =============================================================
-- Run this ONCE in Supabase SQL editor:
--   https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/sql/new
-- Paste the whole file and click Run. Idempotent — safe to re-run.
--
-- Why this exists: each browser has its own _slokk_gc localStorage
-- cache, so opening the map on a fresh PC re-geocodes all 295
-- ársskoðun customers from scratch (~7 min wait). With this table,
-- the first PC to geocode an address writes it here, and every
-- other PC/phone reads from here for free.
--
-- Used by netlify/functions/geocode.js. The function:
--   1. Checks this table for the requested address
--   2. Returns cached value if hit (source: 'cache')
--   3. Otherwise calls Nominatim, returns result, AND writes back here

CREATE TABLE IF NOT EXISTS geocode_cache (
  query        TEXT PRIMARY KEY,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  display_name TEXT,
  source       TEXT NOT NULL DEFAULT 'nominatim',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-tenant app — anon read+write is fine. Same pattern as app_settings.
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS geocode_cache_anon_read   ON geocode_cache;
DROP POLICY IF EXISTS geocode_cache_anon_write  ON geocode_cache;
DROP POLICY IF EXISTS geocode_cache_anon_update ON geocode_cache;

CREATE POLICY geocode_cache_anon_read   ON geocode_cache FOR SELECT TO anon USING (true);
CREATE POLICY geocode_cache_anon_write  ON geocode_cache FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY geocode_cache_anon_update ON geocode_cache FOR UPDATE TO anon USING (true) WITH CHECK (true);
