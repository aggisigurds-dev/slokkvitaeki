-- 22.10.2026: Boss-þemað (gull) er sjálfgefið á Þjónustugáttinni (Agnar). Keyrt á lifandi grunn sama dag.
alter table portal_users alter column theme set default 'boss';
update portal_users set theme = 'boss' where theme is distinct from 'boss';
