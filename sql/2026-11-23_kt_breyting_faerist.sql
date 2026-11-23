-- 23.11.2026 — KT-BREYTING FYRIRTÆKIS FÆRIST SJÁLFKRAFA MEÐ customer id (LIVE í grunni sama dag; þetta er skráin sem geymir hvað var keyrt)
--
-- Agnar (mál #1744, Stigahlíð 10 → Stigahlíð 6-12): „setja automatic skref ef maður þarf að breyta kennitölu fyrirtækis, að allt færist
-- sjálfkrafa með customer id sem virkar“ og „láta gömlu reikningana fylgja nýju kennitölunni og láta allt fylgjast að“.
--
-- HVAÐ GERIST: breytist fyrirtaeki.kennitala (10 stafa kt) …
--   1) trg_zz_kt_breyting_base (BEFORE) finnur/stofnar greiðandann (customers_base) fyrir nýju kt og setur fyrirtaeki.customer_base_id —
--      AÐEINS ef staðurinn var sinn eigin greiðandi (kt greiðandans = gamla kt staðarins) OG enginn annar staður deilir greiðandanum
--      OG sá sem breytir hefur ekki sjálfur breytt customer_base_id. Annars er greiðandinn látinn í friði (rekstrarfélög, deildur greiðandi).
--   2) trg_kt_breyting_faerist (AFTER) kallar á kt_breyting_faera(): færir customer_base_id (gamli → nýi) á raðir með fyrirtaeki_id = staðurinn
--      í uttaeki, customer_documents (+ heiti), document_pairs (nema lykill base/ár/tegund/staður rekist á), umsjonarpostur_tengsl,
--      fyrirtaeki_virkni, krofu_verkferli, thjonustubeidni (+ heiti), crm_cache (heiti), uttekt_skyrsla_lines (aðeins ef enginn annar staður
--      deilir gamla greiðandanum). customer_id (fyrirtaeki.id) breytist ALDREI.
--   3) SÖLUR eru aldrei færðar hér (aðeins taldar): kt-breyting í grunni sendir ekki 'sale-edited', svo reiknings-PDF og skýrsla yrðu úrelt
--      (16.11.2026). Sendar sölur og saga um gömlu kt (Stólpi, Payday-spegill, reikningslestur) breytast ALDREI.
--   4) Allt skráð í kt_breyting_log. Rofi: app_kv 'kt_breyting_sjalfvirk'.virkt=false, eða `set local app.kt_breyting_af = '1'`.
--   5) ALLTAF LEYFA VISTUN: villa í keðjunni fellir aldrei breytinguna á fyrirtækinu (warning).
--
-- PRÓFAÐ (allt rúllað til baka með raise exception): þurrkeyrsla á #424; rauntilraun sýndi árekstur document_pairs_base_year_type_site_uniq
-- (lagað með 'pör fyrst, aðeins laus lykill'); deildur greiðandi (staður 1278, base 149 með 2 stöðum) → greiðandi óhreyfður; #424 kt til baka án base →
-- kveikjan fann greiðandann sjálf (327) og færði allt. Keyrt fyrir #424: sjá kt_breyting_log.
-- Þurrkeyrsla fyrir hvaða stað sem er: select kt_breyting_faera(<id>, <gamall base>, '<gamalt nafn>', '<gamalt kt>', true);

create table if not exists public.kt_breyting_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  fyrirtaeki_id bigint not null,
  gamalt_kt text, nytt_kt text,
  gamalt_nafn text, nytt_nafn text,
  gamall_base bigint, nytt_base bigint,
  talningar jsonb not null default '{}'::jsonb,
  hver text default current_user
);
alter table public.kt_breyting_log enable row level security;

insert into public.app_kv (key, value) values ('kt_breyting_sjalfvirk', '{"virkt": true, "athugasemd": "Rofi: virkt=false slekkur á sjálfvirku kt-breytingarkeðjunni (kt_breyting_faera + kveikjurnar). Einnig: set local app.kt_breyting_af = ''1''."}'::jsonb)
on conflict (key) do nothing;

create or replace function public.kt_breyting_virkt() returns boolean
language sql stable as $$
  select coalesce((select (value->>'virkt')::boolean from public.app_kv where key = 'kt_breyting_sjalfvirk'), true)
     and coalesce(current_setting('app.kt_breyting_af', true), '') <> '1'
$$;

create or replace function public.kt_breyting_faera(p_id bigint, p_gamall_base bigint, p_gamalt_nafn text, p_gamalt_kt text, p_dry boolean default false)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  f public.fyrirtaeki%rowtype;
  nb bigint; nn text; nk text; okt text;
  adrir_stadir int := 0;
  r jsonb := '{}'::jsonb; n int; t record;
begin
  select * into f from public.fyrirtaeki where id = p_id;
  if not found then return jsonb_build_object('villa', 'fyrirtæki finnst ekki'); end if;
  nb := f.customer_base_id; nn := f.nafn; nk := f.kennitala; okt := regexp_replace(coalesce(p_gamalt_kt, ''), '\D', '', 'g');

  select count(*) into adrir_stadir from public.fyrirtaeki where customer_base_id = p_gamall_base and deleted_at is null and id <> p_id;
  r := jsonb_build_object('adrir_stadir_a_gamla_base', adrir_stadir);

  if nb is null or p_gamall_base is null or nb = p_gamall_base then
    r := r || jsonb_build_object('athugasemd', 'greiðandi (customer_base_id) óbreyttur — engu fært');
  else
    -- 1) document_pairs FYRST, og aðeins pör þar sem lykillinn (base, ár, tegund, staður) er laus hjá nýja greiðandanum
    --    (document_pairs_base_year_type_site_uniq). Árekstur = parið sem fyrir er hjá nýja greiðandanum ræður; hitt stendur eftir (saga).
    --    customer_documents-uppfærslan á eftir vekur auto_pair_customer_document, sem finnur þá pörin hjá nýja greiðandanum.
    if p_dry then
      select count(*) into n from public.document_pairs p where p.fyrirtaeki_id = p_id and p.customer_base_id = p_gamall_base
        and not exists (select 1 from public.document_pairs q where q.customer_base_id = nb and q.year is not distinct from p.year
                          and q.service_type is not distinct from p.service_type and coalesce(q.fyrirtaeki_id, 0) = coalesce(p.fyrirtaeki_id, 0));
    else
      update public.document_pairs p set customer_base_id = nb where p.fyrirtaeki_id = p_id and p.customer_base_id = p_gamall_base
        and not exists (select 1 from public.document_pairs q where q.customer_base_id = nb and q.year is not distinct from p.year
                          and q.service_type is not distinct from p.service_type and coalesce(q.fyrirtaeki_id, 0) = coalesce(p.fyrirtaeki_id, 0));
      get diagnostics n = row_count;
    end if;
    r := r || jsonb_build_object('document_pairs_faerd', n);
    select count(*) into n from public.document_pairs where fyrirtaeki_id = p_id and customer_base_id = p_gamall_base;
    r := r || jsonb_build_object('document_pairs_eftir_hja_gamla_greidanda', n);

    -- 2) aðrar töflur með fyrirtaeki_id (customer_documents síðast: hún vekur sjálfvirka pörun)
    for t in select * from (values ('uttaeki','fyrirtaeki_id'),('umsjonarpostur_tengsl','fyrirtaeki_id'),('fyrirtaeki_virkni','fyrirtaeki_id'),
                                   ('krofu_verkferli','fyrirtaeki_id'),('thjonustubeidni','fyrirtaeki_id'),('customer_documents','fyrirtaeki_id')) v(tbl, col)
    loop
      if p_dry then
        execute format('select count(*) from public.%I where %I = $1 and customer_base_id = $2', t.tbl, t.col) into n using p_id, p_gamall_base;
      else
        execute format('update public.%I set customer_base_id = $3 where %I = $1 and customer_base_id = $2', t.tbl, t.col) using p_id, p_gamall_base, nb;
        get diagnostics n = row_count;
      end if;
      r := r || jsonb_build_object(t.tbl, n);
    end loop;
    -- 3) tafla sem er aðeins lykluð á greiðanda: aðeins þegar enginn annar staður deilir gamla greiðandanum
    if adrir_stadir = 0 then
      if p_dry then select count(*) into n from public.uttekt_skyrsla_lines where customer_base_id = p_gamall_base;
      else update public.uttekt_skyrsla_lines set customer_base_id = nb where customer_base_id = p_gamall_base; get diagnostics n = row_count; end if;
      r := r || jsonb_build_object('uttekt_skyrsla_lines', n);
    else
      r := r || jsonb_build_object('uttekt_skyrsla_lines', 'sleppt: gamli greiðandinn er á fleiri stöðum');
    end if;
  end if;

  if p_gamalt_nafn is distinct from nn and p_gamalt_nafn is not null then
    if p_dry then
      select count(*) into n from public.customer_documents where fyrirtaeki_id = p_id and customer_name = p_gamalt_nafn;
      r := r || jsonb_build_object('customer_documents_nafn', n);
      select count(*) into n from public.thjonustubeidni where fyrirtaeki_id = p_id and customer_nafn = p_gamalt_nafn;
      r := r || jsonb_build_object('thjonustubeidni_nafn', n);
      select count(*) into n from public.crm_cache where fyrirtaeki_id = p_id and nafn = p_gamalt_nafn;
      r := r || jsonb_build_object('crm_cache_nafn', n);
    else
      update public.customer_documents set customer_name = nn where fyrirtaeki_id = p_id and customer_name = p_gamalt_nafn;
      get diagnostics n = row_count; r := r || jsonb_build_object('customer_documents_nafn', n);
      update public.thjonustubeidni set customer_nafn = nn where fyrirtaeki_id = p_id and customer_nafn = p_gamalt_nafn;
      get diagnostics n = row_count; r := r || jsonb_build_object('thjonustubeidni_nafn', n);
      update public.crm_cache set nafn = nn where fyrirtaeki_id = p_id and nafn = p_gamalt_nafn;
      get diagnostics n = row_count; r := r || jsonb_build_object('crm_cache_nafn', n);
    end if;
  end if;

  -- Sölur: ALDREI breytt hér (kt-breyting í grunni sendir ekki 'sale-edited' → reiknings-PDF og skýrsla yrðu úrelt, 16.11.2026). Aðeins talið.
  r := r || (select jsonb_build_object('solur_alls', count(*),
         'solur_opnar_a_gamla_kt', count(*) filter (where coalesce(is_credit, false) = false and krafa_sent_at is null and invoiced_at is null and dk_invoice_id is null and paid_at is null
                                                   and status in ('drog','final') and regexp_replace(coalesce(customer_kt, ''), '\D', '', 'g') = okt),
         'solur_sendar_osnertar', count(*) filter (where krafa_sent_at is not null or invoiced_at is not null or dk_invoice_id is not null))
       from public.solur where customer_id = p_id);

  if not p_dry then
    if p_gamall_base is not null and nb is not null and p_gamall_base <> nb then
      update public.customers_base set general_notes = coalesce(general_notes || E'\n', '') || 'Kt færð (fyrirtæki #' || p_id || ') á ' || coalesce(nk, '?') || ' — ' || to_char(now(), 'DD.MM.YYYY') || '; gamli greiðandinn stendur óbreyttur (saga).'
       where id = p_gamall_base and coalesce(general_notes, '') not like '%Kt færð (fyrirtæki #' || p_id || ') á ' || coalesce(nk, '?') || '%';
    end if;
    insert into public.kt_breyting_log (fyrirtaeki_id, gamalt_kt, nytt_kt, gamalt_nafn, nytt_nafn, gamall_base, nytt_base, talningar)
    values (p_id, p_gamalt_kt, nk, p_gamalt_nafn, nn, p_gamall_base, nb, r);
  end if;
  return r;
end
$function$;

create or replace function public.fyrirtaeki_kt_base_relink() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare ktd text; bid bigint; ob public.customers_base%rowtype; ob_kt text; adrir int;
begin
  if not public.kt_breyting_virkt() then return new; end if;
  if new.kennitala is not distinct from old.kennitala then return new; end if;
  ktd := regexp_replace(coalesce(new.kennitala, ''), '\D', '', 'g');
  if length(ktd) <> 10 then return new; end if;
  if new.customer_base_id is distinct from old.customer_base_id then return new; end if;   -- sá sem breytir valdi greiðandann sjálfur
  if old.customer_base_id is null then return new; end if;
  select * into ob from public.customers_base where id = old.customer_base_id;
  ob_kt := regexp_replace(coalesce(ob.kennitala, ''), '\D', '', 'g');
  -- AÐEINS þegar staðurinn var sinn eigin greiðandi (kt greiðandans = gamla kt staðarins) og enginn annar staður deilir greiðandanum.
  if ob_kt <> regexp_replace(coalesce(old.kennitala, ''), '\D', '', 'g') then return new; end if;
  select count(*) into adrir from public.fyrirtaeki where customer_base_id = old.customer_base_id and deleted_at is null and id <> old.id;
  if adrir > 0 then return new; end if;
  select id into bid from public.customers_base where regexp_replace(coalesce(kennitala, ''), '\D', '', 'g') = ktd order by id limit 1;
  if bid is null then
    insert into public.customers_base (nafn, kennitala, netfang, heimilisfang, greidsluskilmali, rekstrarfelag, general_notes)
    values (coalesce(nullif(btrim(new.nafn), ''), 'kt ' || new.kennitala), new.kennitala, ob.netfang, coalesce(nullif(btrim(new.heimilisfang), ''), ob.heimilisfang),
            ob.greidsluskilmali, ob.rekstrarfelag,
            'Stofnað sjálfkrafa við kt-breytingu á fyrirtæki #' || new.id || ' (' || coalesce(old.kennitala, '?') || ' → ' || new.kennitala || ') ' || to_char(now(), 'DD.MM.YYYY'))
    returning id into bid;
  end if;
  new.customer_base_id := bid;
  return new;
exception when others then
  -- ALLTAF LEYFA VISTUN: greiðandafærslan má aldrei fella breytingu á fyrirtæki.
  raise warning 'fyrirtaeki_kt_base_relink (fyrirtaeki %): %', new.id, sqlerrm;
  return new;
end
$function$;

create or replace function public.trg_kt_breyting_faerist() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.kt_breyting_virkt() then return new; end if;
  if length(regexp_replace(coalesce(new.kennitala, ''), '\D', '', 'g')) <> 10 then return new; end if;
  perform public.kt_breyting_faera(new.id, old.customer_base_id, old.nafn, old.kennitala);
  return new;
exception when others then
  -- ALLTAF LEYFA VISTUN: keðjan má aldrei fella breytingu á fyrirtæki.
  raise warning 'kt_breyting_faerist (fyrirtaeki %): %', new.id, sqlerrm;
  return new;
end
$function$;

drop trigger if exists trg_zz_kt_breyting_base on public.fyrirtaeki;
create trigger trg_zz_kt_breyting_base before update of kennitala on public.fyrirtaeki
  for each row when (old.kennitala is distinct from new.kennitala) execute function public.fyrirtaeki_kt_base_relink();
drop trigger if exists trg_kt_breyting_faerist on public.fyrirtaeki;
create trigger trg_kt_breyting_faerist after update of kennitala on public.fyrirtaeki
  for each row when (old.kennitala is distinct from new.kennitala) execute function public.trg_kt_breyting_faerist();

-- Keyrt handvirkt fyrir #424 (kt breytt áður en kveikjurnar voru til): select kt_breyting_faera(424, 327, 'Húsfélagið Stigahlíð 10', '520391-1859');
