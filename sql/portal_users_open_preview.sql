-- portal_users.open_preview — opinn forsýnar-aðgangur per félag.
-- Applied to Supabase (osfdzskyvisifcwyjkuk) 2026-08-23.
--
-- Þegar open_preview = true OG active = true OG ekkert pass_hash er sett, þá
-- opnast þjónustuvefurinn (/gatt/?c=<slug>) með RAUNGÖGNUM félagsins ÁN
-- innskráningar (gatt.js + gatt-status.js lesa þennan fána). Um leið og lykilorð
-- (pass_hash) er sett slokknar á opnu leiðinni sjálfkrafa → krefst innskráningar.
-- Sett per-félag, sjálfgefið false, svo þetta leki aldrei á aðra vefi óvart.

alter table portal_users add column if not exists open_preview boolean not null default false;

comment on column portal_users.open_preview is
  'Ef satt OG ekkert pass_hash OG active: þjónustuvefurinn opnast með raungögnum ÁN innskráningar (opinn forsýnar-aðgangur). Læsist sjálfkrafa um leið og lykilorð (pass_hash) er sett. Sett per-félag, sjálfgefið false.';

-- Pilot: Center Hótel opið þar til Agnar setur lykilorð.
update portal_users set open_preview = true where slug = 'center-hotel';
