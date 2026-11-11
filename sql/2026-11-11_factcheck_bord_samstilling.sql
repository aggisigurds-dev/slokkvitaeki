-- 11.11.2026 (mál #1544, Agnar ✓ 08.11): factcheck_akvardanir ↔ Þjónustuborð tengd saman.
--
-- Mælt 08.11.2026: 12 af 13 ósvöruðum factcheck-ákvörðunum áttu tvíbura á borðinu, og svar á öðrum
-- staðnum hreyfði ekki hinn. Tengingin er merkið `factcheck:<id>` á borðmálinu (það var þegar á 11 málum);
-- factcheck-hliðin ber TVÍBURA-línu í `samhengi` (skrifuð 08.11).
--
-- ATH: factcheck_akvardanir.svar má aðeins vera 'ja' | 'nei' | 'bida' (factcheck_akvardanir_svar_check).
-- Hvaðan svarið kom stendur því í `samhengi` (lína aftast), ekki í `svar`.
--
-- Tveir krókar, báðir í varinni blokk (borðið má ALDREI hætta að vista út af samstillingu):
--   1. thjonustubeidni → factcheck: borðmál með `factcheck:N` fær svar:* → factcheck N fær svar
--      (samthykkt→ja · hafnad→nei · vinnsla/endurmeta→bida) og línuna „[dags] Svarað á Þjónustuborð #<id> (svar:…)."
--      „Afturkalla" á borðinu (svar:* fer af) opnar hana aftur — AÐEINS ef síðasta lína samhengis er frá þessu máli.
--      Lokist borðmál ÁN svars (tvítak, forsenda fallin, tóm sýn) fær factcheck 'bida' — nema annað opið borðmál
--      beri sama merki.
--   2. factcheck → thjonustubeidni: fái factcheck N fyrsta svar annars staðar fær opna borðmálið (án svar:*) sama
--      svar og ✓/✕ á borðinu skrifar: samthykki víkur fyrir svar:samthykkt|hafnad, staðan tilbuid|lokad og lína
--      aftast í lýsingu. 'bida' bætir aðeins línu við lýsinguna.
--   Engin lykkja: krókur 1 setur fc.samstilling='1' á meðan hann skrifar og krókur 2 hunsar þá skrift; krókur 2
--   snertir aðeins borðmál sem ber ekkert svar:*, og krókur 1 skrifar aðeins á ósvarað factcheck eða sitt eigið.

create or replace function public.thjb_factcheck_samstilla() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  fc bigint[];
  sv_nu text; sv_adur text;
  merki text;
  dags text := to_char(now() at time zone 'Atlantic/Reykjavik', 'DD.MM.YYYY HH24:MI');
  nyt jsonb; gml jsonb;
begin
  begin
    nyt := case when jsonb_typeof(new.tags) = 'array' then new.tags else '[]'::jsonb end;
    gml := case when jsonb_typeof(old.tags) = 'array' then old.tags else '[]'::jsonb end;
    select array_agg(substring(x from '^factcheck:(\d+)$')::bigint) into fc
      from jsonb_array_elements_text(nyt) x where x ~ '^factcheck:\d+$';
    if fc is null then return null; end if;
    merki := 'Þjónustuborð #' || new.id;
    select substring(x from 6) into sv_nu from jsonb_array_elements_text(nyt) x where x like 'svar:%' limit 1;
    select substring(x from 6) into sv_adur from jsonb_array_elements_text(gml) x where x like 'svar:%' limit 1;
    perform set_config('fc.samstilling', '1', true);

    if sv_nu is not null and sv_nu is distinct from sv_adur then
      -- Svarað (eða svari breytt) á borðinu → factcheck fær svarið; aðeins ósvarað eða síðast svarað af þessu máli.
      update factcheck_akvardanir f
         set svar = case sv_nu when 'samthykkt' then 'ja' when 'hafnad' then 'nei' else 'bida' end,
             svarad_at = now(),
             samhengi = rtrim(coalesce(f.samhengi, '')) || E'\n\n[' || dags || '] Svarað á ' || merki || ' (svar:' || sv_nu || ').'
       where f.id = any(fc)
         and (f.svar is null or rtrim(coalesce(f.samhengi, '')) ~ (' Svarað á ' || merki || ' \(svar:[a-z]+\)\.$'));
    elsif sv_nu is null and sv_adur is not null then
      -- „Afturkalla" eða samthykki sett aftur (endurmat) → spurningin bíður á ný, líka í factcheck.
      update factcheck_akvardanir f
         set svar = null, svarad_at = null,
             samhengi = rtrim(coalesce(f.samhengi, '')) || E'\n\n[' || dags || '] Svar tekið af á ' || merki || ' — bíður aftur.'
       where f.id = any(fc) and f.svar is not null
         and rtrim(coalesce(f.samhengi, '')) ~ (' Svarað á ' || merki || ' \(svar:[a-z]+\)\.$');
    elsif sv_nu is null and new.status = 'lokad' and old.status is distinct from 'lokad' then
      -- Lokað án svars → factcheck lokast ('bida'), nema annað opið borðmál beri sama merki.
      update factcheck_akvardanir f
         set svar = 'bida', svarad_at = now(),
             samhengi = rtrim(coalesce(f.samhengi, '')) || E'\n\n[' || dags || '] ' || merki || ' lokað án svars — þessi lokast með.'
       where f.id = any(fc) and f.svar is null
         and not exists (select 1 from thjonustubeidni t
                          where t.id <> new.id and t.deleted_at is null and t.status is distinct from 'lokad'
                            and t.tags @> jsonb_build_array('factcheck:' || f.id));
    elsif sv_nu is null and old.status = 'lokad' and new.status is distinct from 'lokad' then
      -- Opnað aftur → factcheck opnast ef þetta mál lokaði henni.
      update factcheck_akvardanir f
         set svar = null, svarad_at = null,
             samhengi = rtrim(coalesce(f.samhengi, '')) || E'\n\n[' || dags || '] ' || merki || ' opnað aftur — bíður aftur.'
       where f.id = any(fc) and f.svar = 'bida'
         and rtrim(coalesce(f.samhengi, '')) like '% ' || merki || ' lokað án svars — þessi lokast með.';
    end if;
    perform set_config('fc.samstilling', '', true);
  exception when others then
    perform set_config('fc.samstilling', '', true);
    raise warning 'thjb_factcheck_samstilla (#%): %', new.id, sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists thjb_factcheck_samstilla on public.thjonustubeidni;
create trigger thjb_factcheck_samstilla after update of tags, status on public.thjonustubeidni
  for each row execute function public.thjb_factcheck_samstilla();

create or replace function public.factcheck_bord_samstilla() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sv text; st text; lina text;
  stimpill text := to_char(now() at time zone 'Atlantic/Reykjavik', 'DD/MM "kl." HH24:MI');
begin
  begin
    if coalesce(current_setting('fc.samstilling', true), '') = '1' then return null; end if;   -- kom frá borðinu
    if new.svar is null or old.svar is not null then return null; end if;                       -- aðeins fyrsta svar
    if new.svar = 'bida' then
      update thjonustubeidni t
         set notes = rtrim(coalesce(t.notes, '')) || E'\n\n— factcheck #' || new.id || ' merkt „bíða": ' || stimpill
       where t.deleted_at is null and t.status is distinct from 'lokad' and jsonb_typeof(t.tags) = 'array'
         and t.tags @> jsonb_build_array('factcheck:' || new.id)
         and not exists (select 1 from jsonb_array_elements_text(t.tags) y where y like 'svar:%');
      return null;
    end if;
    sv := case new.svar when 'ja' then 'samthykkt' else 'hafnad' end;
    st := case sv when 'samthykkt' then 'tilbuid' else 'lokad' end;
    lina := '— ' || case sv when 'samthykkt' then 'Samþykkt' else 'Hafnað' end || ' í factcheck #' || new.id || ': ' || stimpill;
    update thjonustubeidni t
       set tags = (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(t.tags) x
                    where not (x = '"samthykki"'::jsonb or (jsonb_typeof(x) = 'string' and (x #>> '{}') like 'svar:%')))
                  || jsonb_build_array('svar:' || sv),
           status = st,
           notes = case when coalesce(t.notes, '') = '' then lina else rtrim(t.notes) || E'\n\n' || lina end,
           updated_at = now()
     where t.deleted_at is null and t.status is distinct from 'lokad'
       and jsonb_typeof(t.tags) = 'array'
       and t.tags @> jsonb_build_array('factcheck:' || new.id)
       and not exists (select 1 from jsonb_array_elements_text(t.tags) y where y like 'svar:%');
  exception when others then
    raise warning 'factcheck_bord_samstilla (#%): %', new.id, sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists factcheck_bord_samstilla on public.factcheck_akvardanir;
create trigger factcheck_bord_samstilla after update of svar on public.factcheck_akvardanir
  for each row execute function public.factcheck_bord_samstilla();

comment on function public.thjb_factcheck_samstilla() is 'Mál #1544 (11.11.2026): svar á borðmáli með factcheck:N skrifar svar (ja/nei/bida) á factcheck_akvardanir N + línu „Svarað á Þjónustuborð #id" í samhengi; Afturkalla opnar aftur.';
comment on function public.factcheck_bord_samstilla() is 'Mál #1544 (11.11.2026): fyrsta svar í factcheck_akvardanir N (ja/nei) skrifar sama svar á opið borðmál með factcheck:N, eins og ✓/✕ á borðinu; bida = lína í lýsingu.';
