-- Afturköllun fyrir 2026-11-06_portal_users_premium_default.sql.
alter table public.portal_users
  alter column theme set default 'boss';

update public.portal_users
set theme = 'blar'
where theme = 'premium';
