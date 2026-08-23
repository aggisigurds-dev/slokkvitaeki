-- Þjónustuvefur — reglan um OPINN aðgang (2026-08-23).
--
-- REGLA (ákveðin af Agnari): félag er OPIÐ þegar það er `active` OG hefur
-- EKKERT `pass_hash` (tómt lykilorð). Þá opnast /gatt/?c=<slug> með raungögnum
-- ÁN innskráningar (sjá gatt.js + gatt-status.js). Um leið og lykilorð er sett
-- (pass_hash) læsist vefurinn sjálfkrafa → krefst innskráningar.
--
-- Þetta á við ALLA vefi án lykilorðs (ekki bundið per-félag). Vilji maður loka
-- vef án þess að setja lykilorð → active = false.
--
-- SÖGULEGT: 2026-08-23 var fyrst prófaður per-félag fáni `open_preview`, en
-- reglan var einfölduð í „tómt lykilorð ⇒ opið". Dálkurinn er því fjarlægður.

alter table portal_users drop column if exists open_preview;
