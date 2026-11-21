-- =====================================================================
-- PRÓF Á KRANVÖRNINNI — keyrt á RAUNGRUNNINUM 21.11.2026, 17 mælingar,
-- allar grænar, og prufuraðirnar hreinsaðar í sama kalli.
-- =====================================================================
-- Keyrsla: allt í EINU kalli (Supabase execute_sql eða psql -f). Blokkin
-- hreinsar eftir sig; fari eitthvað úrskeiðis rúllar allt kallið til baka.
-- Raðirnar heita PRUFAKV… og engin kúnnagögn eru í þessari skrá (repóið
-- er opinbert).
-- =====================================================================
create table if not exists public.kranvorn_prufa (nr int, prof text, vaent text, raun text, ok boolean);
do $$
declare v_mal bigint; v_nytt bigint; v_vid bigint; v_txt text; v_n int; v_notes text;
        v_tags jsonb; v_imp boolean; v_ok boolean; v_ids bigint[]; v_fyrir int; v_eftir int;
begin
  delete from kranvorn_prufa;

  -- 0) Maður stofnar mál: fer ALLTAF inn.
  insert into thjonustubeidni(title, source, created_by, status, notes)
  values ('PRUFAKV erindi A', 'beint', 'Agnar', 'nytt', 'prufa') returning id into v_mal;
  insert into kranvorn_prufa values (0, 'maður stofnar mál', 'röð verður til', coalesce(v_mal::text,'NULL'), v_mal is not null);

  -- 1) (a1) Vél með sama channel_ref -> nóta á málið sem er til, ekkert nýtt mál.
  update thjonustubeidni set channel_ref = 'email:999999901' where id = v_mal;
  v_nytt := null;
  insert into thjonustubeidni(title, source, created_by, channel_ref, notes)
  values ('PRUFAKV annar titill sami þráður', 'email', 'postur-sjalfvirkt', 'email:999999901', 'nýr póstur í þráðinn') returning id into v_nytt;
  select notes into v_notes from thjonustubeidni where id = v_mal;
  insert into kranvorn_prufa values (1, 'sami channel_ref', 'hamlað + nóta',
    coalesce(v_nytt::text,'(ekkert nýtt mál)') || ' nóta=' || (v_notes ilike '%kranvörn (channel_ref)%')::text,
    v_nytt is null and v_notes ilike '%kranvörn (channel_ref)%' and v_notes ilike '%nýr póstur í þráðinn%');

  -- 2) (a2) Sami ai:lykill -> hamlað, líka þótt titillinn sé allur annar.
  update thjonustubeidni set tags = coalesce(tags,'[]'::jsonb) || '["ai:lykill:prufa0001"]'::jsonb where id = v_mal;
  v_nytt := null;
  insert into thjonustubeidni(title, source, created_by, tags)
  values ('PRUFAKV alveg óskyldur titill', 'ai', 'ai-uppfaerslur', '["ai:lykill:prufa0001"]'::jsonb) returning id into v_nytt;
  insert into kranvorn_prufa values (2, 'sami ai:lykill', 'hamlað', coalesce(v_nytt::text,'(ekkert nýtt mál)'), v_nytt is null);

  -- 3) (a3) Sama erindi, „AI-tillaga:"-forskeytið strokið.
  v_nytt := null;
  insert into thjonustubeidni(title, source, created_by)
  values ('AI-tillaga: PRUFAKV erindi A!', 'ai', 'ai-uppfaerslur') returning id into v_nytt;
  insert into kranvorn_prufa values (3, 'sama erindi, forskeyti strokið', 'hamlað', coalesce(v_nytt::text,'(ekkert nýtt mál)'), v_nytt is null);

  -- 4) (d) Þriðja mælingin á sama máli -> fyrir Agnar.
  select tags, important into v_tags, v_imp from thjonustubeidni where id = v_mal;
  insert into kranvorn_prufa values (4, 'þrjár mælingar -> fyrir Agnar', 'maelt:3 + fyrir-agnar + important',
    v_tags::text || ' important=' || coalesce(v_imp::text,'null'),
    v_tags @> '["kranvorn:maelt:3"]'::jsonb and v_tags @> '["kranvorn:fyrir-agnar"]'::jsonb and coalesce(v_imp,false));

  -- 5) (c) Vaktarping án peninga/kt/kúnna -> heilsuspjald; sama ping tvisvar hækkar n.
  v_nytt := null;
  insert into thjonustubeidni(title, source, created_by, notes)
  values ('PRUFAKV heilsuping', 'claude', 'naeturvakt-sjalfprof', 'allt grænt, 81/81 verðir') returning id into v_nytt;
  insert into thjonustubeidni(title, source, created_by, notes)
  values ('PRUFAKV heilsuping', 'claude', 'naeturvakt-sjalfprof', 'allt grænt, 81/81 verðir');
  select n into v_n from heilsuspjald where titill = 'PRUFAKV heilsuping';
  insert into kranvorn_prufa values (5, 'vakt: ping -> heilsuspjald', 'hamlað, n=2',
    coalesce(v_nytt::text,'(ekkert mál)') || ' n=' || coalesce(v_n::text,'NULL'), v_nytt is null and v_n = 2);

  -- 6) (c) Vaktarping sem SNERTIR peninga -> verður mál.
  v_vid := null;
  insert into thjonustubeidni(title, source, created_by, notes)
  values ('PRUFAKV vakt fann ógreiddan reikning', 'claude', 'naeturvakt-sjalfprof', 'krafa í vanskilum') returning id into v_vid;
  insert into kranvorn_prufa values (6, 'vakt: peningar -> mál', 'röð verður til', coalesce(v_vid::text,'NULL'), v_vid is not null);

  -- 7) Nýtt, ótengt vélmál -> fer inn eins og áður.
  v_nytt := null;
  insert into thjonustubeidni(title, source, created_by)
  values ('PRUFAKV glænýtt ótengt erindi', 'claude', 'claude') returning id into v_nytt;
  insert into kranvorn_prufa values (7, 'nýtt erindi frá lotu', 'röð verður til', coalesce(v_nytt::text,'NULL'), v_nytt is not null);

  -- 8) (b) Hugmynd frá lotu -> engin röð, en textinn geymdur í kranvorn_log.
  select count(*) into v_fyrir from verkefnalisti;
  v_txt := null;
  insert into verkefnalisti(title, description, status, category, assigned_agent)
  values ('PRUFAKV hugmynd frá lotu', 'væri gaman að bæta við flipa', 'beidni', 'utlit', 'claude-code') returning id::text into v_txt;
  select count(*) into v_eftir from verkefnalisti;
  select count(*) into v_n from kranvorn_log where tafla='verkefnalisti' and titill='PRUFAKV hugmynd frá lotu'
    and gogn->>'description' = 'væri gaman að bæta við flipa';
  insert into kranvorn_prufa values (8, 'verkefnalisti: hugmynd', 'engin röð + texti í log',
    'röð=' || coalesce(v_txt,'(engin)') || ' fjölgun=' || (v_eftir-v_fyrir) || ' log=' || v_n,
    v_txt is null and v_eftir = v_fyrir and v_n = 1);

  -- 9) (b) Skráð villa -> fer inn.
  v_txt := null;
  insert into verkefnalisti(title, description, status, category, assigned_agent)
  values ('PRUFAKV skráð villa', 'kastar villu við vistun', 'beidni', 'villa', 'claude-code') returning id::text into v_txt;
  insert into kranvorn_prufa values (9, 'verkefnalisti: villa', 'röð verður til', coalesce(left(v_txt,8),'NULL'), v_txt is not null);

  -- 10) (b) Afgreiðslan ([AGNAR]) -> fer inn.
  v_txt := null;
  insert into verkefnalisti(title, description, status, category, assigned_agent)
  values ('PRUFAKV svar Agnars', '[AGNAR] Agnar ýtti á takkann í Afgreiðslu', 'beidni', 'allt', 'claude-code') returning id::text into v_txt;
  insert into kranvorn_prufa values (10, 'verkefnalisti: [AGNAR]', 'röð verður til', coalesce(left(v_txt,8),'NULL'), v_txt is not null);

  -- 11) Annállinn: hver stöðvun skráð (channel_ref, ai_lykill, sama_erindi, 2 ping, þak).
  insert into kranvorn_prufa
  select 11, 'kranvorn_log skráði hverja stöðvun', '6', count(*)::text, count(*) = 6
    from kranvorn_log where titill ilike '%PRUFAKV%' and at > now() - interval '5 minutes';

  -- 12–15) (e) Aldursmörk.
  v_nytt := null;
  insert into thjonustubeidni(title, source, created_by, created_at)
  values ('PRUFAKV gamalt vélerindi', 'email', 'postur-sjalfvirkt', now() - interval '60 days') returning id into v_nytt;
  insert into kranvorn_prufa values (12, 'aldursmörk: 60 daga vélmál', 'hamlað', coalesce(v_nytt::text,'(hamlað)'), v_nytt is null);
  v_nytt := null;
  insert into thjonustubeidni(title, source, created_by, created_at)
  values ('PRUFAKV nýlegt vélerindi', 'email', 'postur-sjalfvirkt', now() - interval '3 days') returning id into v_nytt;
  insert into kranvorn_prufa values (13, 'aldursmörk: 3 daga vélmál', 'fer inn', coalesce(v_nytt::text,'NULL'), v_nytt is not null);
  v_nytt := null;
  insert into thjonustubeidni(title, source, created_by, created_at)
  values ('PRUFAKV gamalt erindi frá manni', 'beint', 'Agnar', now() - interval '60 days') returning id into v_nytt;
  insert into kranvorn_prufa values (14, 'aldursmörk: 60 daga frá manni', 'fer inn', coalesce(v_nytt::text,'NULL'), v_nytt is not null);

  -- 15) HREINSUN.
  select array_agg(id) into v_ids from thjonustubeidni where title ilike '%PRUFAKV%';
  delete from thjb_endurmat_bidrod where id = any(v_ids);
  delete from thjonustubeidni where id = any(v_ids);
  delete from verkefnalisti where title ilike 'PRUFAKV%';
  delete from heilsuspjald where titill ilike 'PRUFAKV%';
  delete from kranvorn_log where titill ilike '%PRUFAKV%';
  insert into kranvorn_prufa
  select 15, 'hreinsun prufuraða', '0 eftir',
         (select count(*) from thjonustubeidni where title ilike '%PRUFAKV%')::text || ' mál / ' ||
         (select count(*) from verkefnalisti where title ilike 'PRUFAKV%')::text || ' verk / ' ||
         (select count(*) from kranvorn_log where titill ilike '%PRUFAKV%')::text || ' log',
         (select count(*) from thjonustubeidni where title ilike '%PRUFAKV%') = 0
         and (select count(*) from verkefnalisti where title ilike 'PRUFAKV%') = 0
         and (select count(*) from kranvorn_log where titill ilike '%PRUFAKV%') = 0;
end $$;
select nr, prof, vaent, raun, ok from public.kranvorn_prufa order by nr;
drop table public.kranvorn_prufa;
