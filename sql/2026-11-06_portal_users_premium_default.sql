-- Þjónustugátt: útlitið á Brunahólf Premium verður sjálfgefið.
-- Eldri sérvalin þemu haldast; aðeins gamla sjálfgefna „blar“ færist yfir.
alter table public.portal_users
  alter column theme set default 'premium';

update public.portal_users
set theme = 'premium'
where theme = 'blar';
