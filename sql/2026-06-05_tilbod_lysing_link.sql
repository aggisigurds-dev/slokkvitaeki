-- 2026-06-05 — Tilboð round 2: lýsing + link_url (applied live to osfdzskyvisifcwyjkuk)
--
-- Companion record. Idempotent. Owner asks (round 2):
--  • per-row status changer (frontend only)
--  • swap the "Gildir til" list column for "Lýsing" (a short headline of what
--    is being asked for) — new `lysing` column
--  • a link to https://brunaholf-tilbod.netlify.app/ above the table, plus the
--    ability to attach other tilboð-form links / a Samningur — new `link_url`
--    column on the tilboð (+ a user-managed link list stored in AppSettings).
-- valid_until stays in the modal (still drives auto-expire) — it's just no
-- longer the list column.
-- ---------------------------------------------------------------------------------

alter table public.tilbod
  add column if not exists lysing   text,
  add column if not exists link_url text;
