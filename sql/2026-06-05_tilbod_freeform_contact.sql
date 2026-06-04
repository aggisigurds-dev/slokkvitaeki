-- 2026-06-05 — Tilboð: free-form contact fields (applied live to osfdzskyvisifcwyjkuk)
--
-- Companion record. Idempotent. Most people asking for a tilboð are NOT yet
-- registered customers, so the modal must accept a plain name + kennitala +
-- email + address + phone with no customer link required.
--
-- `tilbod.company_id` is ALREADY nullable; `company_nafn` + `notes` are already
-- free text. Only the four contact columns were missing — added here. The modal
-- (js/patches/27-tilbod-quote.js) now uses a name typeahead (links to a
-- fyrirtaeki only if the typed name matches, else keeps free text) plus these
-- fields, and the Athugasemd box is a tall resizable <textarea>.
-- ---------------------------------------------------------------------------------

alter table public.tilbod
  add column if not exists kennitala     text,
  add column if not exists netfang       text,
  add column if not exists heimilisfang  text,
  add column if not exists simi          text;
