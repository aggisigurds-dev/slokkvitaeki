-- Viðbótarúttekt (patch 488, 28.10.2026): viðbótarsala (krafa_note „Viðbótarúttekt við R-…") er sjálfstæð sala með ásetningi,
-- ekki tvítekin úttekt. heilsucheck_keyra() og heilsucheck_solur(k) sleppa henni í „fyrirtaeki_med_fleiri_en_eina_uttekt".
-- Keyrt á lifandi grunn 29.10.2026 (migration heilsucheck_vidbot_uttekt_ekki_tvitok). Afturköllun: fjarlægja
--   `and coalesce(krafa_note,'') not like 'Viðbótarúttekt við %'`  úr báðum föllum.
do $mig$
declare d text; d0 text; skilyrdi text := ' and coalesce(krafa_note,'''') not like ''Viðbótarúttekt við %''';
begin
  select pg_get_functiondef('public.heilsucheck_keyra()'::regprocedure) into d0;
  d := replace(d0, 'and status<>''void'' and customer_id is not null', 'and status<>''void'' and customer_id is not null' || skilyrdi);
  if d = d0 then raise exception 'heilsucheck_keyra: mynstur fannst ekki'; end if;
  execute d;
  select pg_get_functiondef('public.heilsucheck_solur(bigint)'::regprocedure) into d0;
  d := replace(d0, 'where source=''uttekt'' and created_at>=date_trunc(''year'',now()) and customer_id is not null', 'where source=''uttekt'' and created_at>=date_trunc(''year'',now()) and customer_id is not null' || skilyrdi);
  if d = d0 then raise exception 'heilsucheck_solur: mynstur fannst ekki'; end if;
  execute d;
end $mig$;
