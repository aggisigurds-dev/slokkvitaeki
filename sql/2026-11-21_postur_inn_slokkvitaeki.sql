-- 2026-11-21 — bh_postur_inn_a_bord les líka slokkvitaeki@brunaholf.is (nýr póstur frá og með deginum í dag).
--
-- Agnar 21.11.2026 („já endilega"), eftir að í ljós kom að erindi VIP-félaga sem komu á slokkvitaeki@ urðu aldrei
-- að málum: fallið (cron `postur-inn-a-bord`, á 15 mín fresti) las AÐEINS account = 'eldklar@eldklar.is'.
--
-- AF HVERJU EIGIN UPPHAFSTÍMI: margir eldri póstar í slokkvitaeki@ eru þegar unnir á málum sem bera EKKI
-- channel_ref á póstinn (lotur skráðu efnið handvirkt). Fallið les allt frá postur_inn_stilling.fra sem er ekki
-- í postur_inn_log — án eigin upphafstíma hefði það stofnað tvítekin mál fyrir allan póst hólfsins frá september.
-- Því: slokkvitaeki@ aðeins frá 2026-11-21 16:15 UTC. eldklar@ óbreytt.
--
-- Vörn: breytingin er gerð á texta fallsins eins og hann er í grunninum (pg_get_functiondef) og stöðvast ef
-- skiptin verða ekki nákvæmlega tvö (_postur_tengt og aðallykkjan). Keyrist aftur án áhrifa (þegar uppfært → hætt).
do $$
declare
  d text;
  c_fra constant text := 'timestamptz ''2026-11-21 16:15:00+00''';
begin
  d := pg_get_functiondef('public.bh_postur_inn_a_bord'::regproc);
  if position('slokkvitaeki@brunaholf.is' in d) > 0 then
    raise notice 'bh_postur_inn_a_bord les þegar slokkvitaeki@ — ekkert gert';
    return;
  end if;
  d := replace(d, 'where k.account = ''eldklar@eldklar.is''',
    'where (k.account = ''eldklar@eldklar.is'' or (k.account = ''slokkvitaeki@brunaholf.is'' and k.received_at >= ' || c_fra || '))');
  d := replace(d, 'where d.account = ''eldklar@eldklar.is''',
    'where (d.account = ''eldklar@eldklar.is'' or (d.account = ''slokkvitaeki@brunaholf.is'' and d.received_at >= ' || c_fra || '))');
  if (length(d) - length(replace(d, 'slokkvitaeki@brunaholf.is', ''))) / length('slokkvitaeki@brunaholf.is') <> 2 then
    raise exception 'bh_postur_inn_a_bord: bjóst við nákvæmlega 2 skiptum — textinn hefur breyst, ekkert gert';
  end if;
  execute d;
end $$;
