-- 2026-06-12 — Kröfu yfirlit: „Krafa send" hak per sölu.
-- krafa_sent_at = hvenær krafan var stofnuð/send í heimabankanum.
-- Aðgreint frá paid_at (greitt). Viðbót, nullable — engin gögn snert.
-- Applied to project osfdzskyvisifcwyjkuk on 2026-06-12 via MCP migration
-- `solur_krafa_sent_at`.
alter table public.solur add column if not exists krafa_sent_at timestamptz;
