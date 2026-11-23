-- 23.11.2026 — NAFN og HEIMILISFANG fyrirtækis færast sjálfkrafa þar sem það er óhætt; kerfið VARAR við því sem þarf mannshönd (LIVE í grunni sama dag;
-- þetta er skráin sem geymir hvað var keyrt). Viðbót við sql/2026-11-23_kt_breyting_faerist.sql.
--
-- Agnar (mál #1744): „Þetta má ekki vera svona flókið fyrir okkur starfsfólkið að breyta svona … þetta á líka við heimilisfang og nafn fyrirtækis ..
-- þá má ekkert fara í rugl við það, settu einhverskonar viðvörun, varnir svo það gerist aldrei“.
--
-- HVAÐ GERIST (kveikjan trg_zz_audkenni_vidvorun, AFTER UPDATE OF nafn, heimilisfang, kennitala á fyrirtaeki, keyrir EFTIR kt-keðjunni):
--   • nafn:        customer_documents.customer_name, thjonustubeidni.customer_nafn, crm_cache.nafn (uttaeki.client færir trg_cascade_rename_fyrirtaeki) og
--                  customers_base.nafn — AÐEINS ef staðurinn er sinn eigin greiðandi (kt greiðanda = kt staðarins), enginn annar staður deilir honum og
--                  greiðandinn ber enn GAMLA nafnið.
--   • heimilisfang: customers_base.heimilisfang undir sömu skilyrðum (greiðandinn ber gamla gildið eða ekkert).
--   • kt:          kt_breyting_faera sér um færsluna (fyrri skrá); þessi kveikja bætir viðvöruninni við sömu kt_breyting_log-röð.
--   • SÖLUR eru aldrei færðar (kt/nafn/heimilisfang í grunni sendir ekki 'sale-edited' → reiknings-PDF og skýrsla yrðu úrelt).
--   • audkenni_afleidingar(id, gamalt…, nýtt…, gamall_base) er LESFALL: skilar 'tharf_adgerd' (ósendur reikningur, sendur ógreiddur reikningur, úttektarskýrsla
--     ársins, deildur/annar greiðandi) og 'gert_sjalfkrafa'. Notað af kveikjunni (viðvörun í kt_breyting_log.vidvorun), af viðmótinu (patch 527) og af agentum
--     til forskoðunar án þess að breyta neinu. Kreditfærðar sölur teljast hvorki ósendar né sendar-ógreiddar.
--   • ALLTAF LEYFA VISTUN: villa í kveikjunni fellir aldrei breytinguna á fyrirtækinu (warning). Rofi: app_kv 'kt_breyting_sjalfvirk'.virkt=false eða
--     `set local app.kt_breyting_af = '1'` (sama rofi og kt-keðjan).
--
-- PRÓFAÐ (allt rúllað til baka með raise exception): #424 nafn + heimilisfang → 8 skjöl, mál #1744, CRM, tæki og greiðandi fengu nýja nafnið, greiðandinn hélt öðru
-- heimilisfangi (bar ekki gamla gildið), salan ÓRÖSKUÐ, viðvörun „1 ósendur reikningur · skýrsla ársins“; #424 kt aftur á gamla → ein log-röð með vidvorun,
-- greiðandi 327, document_pairs færð. Forskoðun: select audkenni_afleidingar(<id>, p_nytt_nafn => '…', p_nytt_heimilisfang => '…');

alter table public.kt_breyting_log
  add column if not exists tegund text not null default 'kt',
  add column if not exists gamalt_heimilisfang text,
  add column if not exists nytt_heimilisfang text,
  add column if not exists vidvorun text,
  add column if not exists kvittad_at timestamptz,
  add column if not exists kvittad_af text;

create or replace function public.audkenni_afleidingar(
  p_id bigint,
  p_gamalt_nafn text default null, p_gamalt_kt text default null, p_gamalt_heimilisfang text default null,
  p_nytt_nafn text default null, p_nytt_kt text default null, p_nytt_heimilisfang text default null,
  p_gamall_base bigint default null)
returns jsonb
language plpgsql stable set search_path to 'public' as $fn$
declare
  f public.fyrirtaeki%rowtype; cb public.customers_base%rowtype;
  onafn text; nnafn text; okt text; nkt text; ohf text; nhf text;
  kt_br boolean; nafn_br boolean; hf_br boolean;
  gbase bigint; adrir int := 0; gr text := 'enginn';
  n_opnar int := 0; n_sendar int := 0; sendar_nr text := ''; n_skyrslur int := 0;
  hvad text[] := '{}'; hv text;
  adgerd jsonb := '[]'::jsonb; sjalfkrafa jsonb := '[]'::jsonb;
begin
  select * into f from public.fyrirtaeki where id = p_id;
  if not found then return jsonb_build_object('villa', 'fyrirtæki finnst ekki'); end if;
  onafn := btrim(coalesce(p_gamalt_nafn, f.nafn, ''));
  nnafn := btrim(coalesce(p_nytt_nafn, f.nafn, ''));
  okt := regexp_replace(coalesce(p_gamalt_kt, f.kennitala, ''), '\D', '', 'g');
  nkt := regexp_replace(coalesce(p_nytt_kt, f.kennitala, ''), '\D', '', 'g');
  ohf := btrim(coalesce(p_gamalt_heimilisfang, f.heimilisfang, ''));
  nhf := btrim(coalesce(p_nytt_heimilisfang, f.heimilisfang, ''));
  kt_br := length(okt) = 10 and length(nkt) = 10 and okt <> nkt;
  nafn_br := onafn <> '' and nnafn <> '' and onafn <> nnafn;
  hf_br := ohf <> '' and nhf <> '' and ohf <> nhf;
  if not (kt_br or nafn_br or hf_br) then
    return jsonb_build_object('breytt', false, 'tharf_adgerd', '[]'::jsonb, 'gert_sjalfkrafa', '[]'::jsonb);
  end if;

  gbase := coalesce(p_gamall_base, f.customer_base_id);
  if gbase is not null then
    select * into cb from public.customers_base where id = gbase;
    if found then
      select count(*) into adrir from public.fyrirtaeki where customer_base_id = gbase and deleted_at is null and id <> p_id;
      if regexp_replace(coalesce(cb.kennitala, ''), '\D', '', 'g') <> okt then gr := 'annar';
      elsif adrir > 0 then gr := 'deildur';
      else gr := 'eigin'; end if;
    end if;
  end if;

  -- ósendar, ekki kreditfærðar sölur sem bera gömlu auðkennin (PDF-ið er þegar teiknað með þeim)
  select count(*) into n_opnar from public.solur s
   where s.customer_id = p_id and coalesce(s.is_credit, false) = false and coalesce(s.hidden, false) = false
     and s.krafa_sent_at is null and s.invoiced_at is null and s.dk_invoice_id is null and s.paid_at is null
     and s.status in ('drog', 'final')
     and not exists (select 1 from public.solur c where c.credit_of = s.id and coalesce(c.is_credit, false))
     and ((kt_br and regexp_replace(coalesce(s.customer_kt, ''), '\D', '', 'g') = okt)
          or (nafn_br and btrim(coalesce(s.customer_nafn, '')) = onafn) or hf_br);
  select count(*), coalesce(string_agg(s.num::text, ', ' order by s.id), '') into n_sendar, sendar_nr from public.solur s
   where s.customer_id = p_id and coalesce(s.is_credit, false) = false
     and (s.krafa_sent_at is not null or s.invoiced_at is not null or s.dk_invoice_id is not null) and s.paid_at is null
     and s.created_at > now() - interval '12 months'
     and not exists (select 1 from public.solur c where c.credit_of = s.id and coalesce(c.is_credit, false))
     and ((kt_br and regexp_replace(coalesce(s.customer_kt, ''), '\D', '', 'g') = okt)
          or (nafn_br and btrim(coalesce(s.customer_nafn, '')) = onafn));
  select count(*) into n_skyrslur from public.customer_documents d
   where d.fyrirtaeki_id = p_id and d.doc_type = 'uttektarskyrsla' and d.year::text = to_char(now(), 'YYYY');

  if kt_br then hvad := hvad || 'kennitölu'::text; end if;
  if nafn_br then hvad := hvad || 'nafn'::text; end if;
  if hf_br then hvad := hvad || 'heimilisfang'::text; end if;
  hv := array_to_string(hvad, ' / ');

  if kt_br and gr = 'annar' then
    adgerd := adgerd || to_jsonb(format('Greiðandinn (customers_base #%s) er ANNAR aðili en staðurinn og færist ekki sjálfkrafa — athugaðu hvort greiðandi á líka að breytast (kunnaskrá).', gbase));
  elsif kt_br and gr = 'deildur' then
    adgerd := adgerd || to_jsonb(format('Greiðandinn (customers_base #%s) deilist með %s öðrum stað/stöðum og er EKKI færður sjálfkrafa — Agnar ákveður hvort nýr greiðandi eigi að koma.', gbase, adrir));
  end if;
  if n_opnar > 0 then
    adgerd := adgerd || to_jsonb(format('%s ber enn gamla %s — notaðu „Leiðrétta“ (ný drög) áður en hann er sendur.',
      case when n_opnar = 1 then '1 ósendur reikningur' else n_opnar || ' ósendir reikningar' end, hv));
  end if;
  if n_sendar > 0 then
    adgerd := adgerd || to_jsonb(format('%s (%s) ber gömlu auðkennin — afturkalla kröfu, bakfæra og gera nýjan (verkferli reikninga, kafli H).',
      case when n_sendar = 1 then '1 sendur, ógreiddur reikningur' else n_sendar || ' sendir, ógreiddir reikningar' end, sendar_nr));
  end if;
  if n_skyrslur > 0 then
    adgerd := adgerd || to_jsonb(format('Úttektarskýrsla ársins ber gamla %s — gerðu nýja skýrslu (SkyrslaSolu.endurnyja) og láttu hana fylgja reikningnum.', hv));
  end if;

  if kt_br and gr = 'eigin' then sjalfkrafa := sjalfkrafa || to_jsonb('Greiðandi færist á nýju kennitöluna; skjöl, pör, tæki, mál og saga fylgja customer id (óbreytt).'::text); end if;
  if nafn_br then sjalfkrafa := sjalfkrafa || to_jsonb('Nafnið færist á skjöl, mál, CRM-spjald, tæki og (ef staðurinn er eigin greiðandi) greiðandann.'::text); end if;
  if hf_br and gr = 'eigin' then sjalfkrafa := sjalfkrafa || to_jsonb('Heimilisfangið færist á greiðandann.'::text); end if;

  return jsonb_build_object('breytt', true, 'kt_breytt', kt_br, 'nafn_breytt', nafn_br, 'heimilisfang_breytt', hf_br,
    'greidandi', gr, 'opnar_solur', n_opnar, 'sendar_ogreiddar_solur', n_sendar, 'sendar_nr', sendar_nr, 'skyrslur_ars', n_skyrslur,
    'tharf_adgerd', adgerd, 'gert_sjalfkrafa', sjalfkrafa);
end
$fn$;

create or replace function public.trg_audkenni_vidvorun() returns trigger
language plpgsql security definer set search_path to 'public' as $fn$
declare
  r jsonb; v text; n int := 0; cb public.customers_base%rowtype; adrir int;
  props jsonb := '{}'::jsonb; kt_br boolean; nafn_br boolean; hf_br boolean; tg text;
begin
  if not public.kt_breyting_virkt() then return new; end if;
  r := public.audkenni_afleidingar(new.id, old.nafn, old.kennitala, old.heimilisfang, new.nafn, new.kennitala, new.heimilisfang, old.customer_base_id);
  if coalesce((r->>'breytt')::boolean, false) is not true then return new; end if;
  kt_br := coalesce((r->>'kt_breytt')::boolean, false);
  nafn_br := coalesce((r->>'nafn_breytt')::boolean, false);
  hf_br := coalesce((r->>'heimilisfang_breytt')::boolean, false);

  if nafn_br then
    update public.customer_documents set customer_name = new.nafn where fyrirtaeki_id = new.id and customer_name = old.nafn;
    get diagnostics n = row_count; props := props || jsonb_build_object('customer_documents_nafn', n);
    update public.thjonustubeidni set customer_nafn = new.nafn where fyrirtaeki_id = new.id and customer_nafn = old.nafn;
    get diagnostics n = row_count; props := props || jsonb_build_object('thjonustubeidni_nafn', n);
    update public.crm_cache set nafn = new.nafn where fyrirtaeki_id = new.id and nafn = old.nafn;
    get diagnostics n = row_count; props := props || jsonb_build_object('crm_cache_nafn', n);
  end if;

  -- greiðandinn: aðeins þegar staðurinn er sinn eigin greiðandi, enginn annar staður deilir honum og greiðandinn ber enn GAMLA gildið
  if (nafn_br or hf_br) and new.customer_base_id is not null then
    select * into cb from public.customers_base where id = new.customer_base_id;
    if found and regexp_replace(coalesce(cb.kennitala, ''), '\D', '', 'g') = regexp_replace(coalesce(new.kennitala, ''), '\D', '', 'g') then
      select count(*) into adrir from public.fyrirtaeki where customer_base_id = new.customer_base_id and deleted_at is null and id <> new.id;
      if adrir = 0 then
        if nafn_br and btrim(coalesce(cb.nafn, '')) = btrim(old.nafn) then
          update public.customers_base set nafn = new.nafn where id = cb.id;
          props := props || jsonb_build_object('greidandi_nafn', 1);
        end if;
        if hf_br and btrim(coalesce(cb.heimilisfang, '')) in ('', btrim(old.heimilisfang)) then
          update public.customers_base set heimilisfang = new.heimilisfang where id = cb.id;
          props := props || jsonb_build_object('greidandi_heimilisfang', 1);
        end if;
      end if;
    end if;
  end if;

  v := nullif(array_to_string(array(select jsonb_array_elements_text(r->'tharf_adgerd')), E'\n'), '');
  n := 0;
  if kt_br then
    update public.kt_breyting_log set vidvorun = v, gamalt_heimilisfang = old.heimilisfang, nytt_heimilisfang = new.heimilisfang,
           talningar = talningar || jsonb_build_object('afleidingar', r) || props
     where id = (select max(id) from public.kt_breyting_log where fyrirtaeki_id = new.id and at = now() and tegund = 'kt');
    get diagnostics n = row_count;
  end if;
  if n = 0 then
    tg := case when kt_br then 'kt' else concat_ws('+', case when nafn_br then 'nafn' end, case when hf_br then 'heimilisfang' end) end;
    insert into public.kt_breyting_log (fyrirtaeki_id, gamalt_kt, nytt_kt, gamalt_nafn, nytt_nafn, gamall_base, nytt_base, talningar, tegund, gamalt_heimilisfang, nytt_heimilisfang, vidvorun)
    values (new.id, old.kennitala, new.kennitala, old.nafn, new.nafn, old.customer_base_id, new.customer_base_id, jsonb_build_object('afleidingar', r) || props, tg, old.heimilisfang, new.heimilisfang, v);
  end if;
  return new;
exception when others then
  -- ALLTAF LEYFA VISTUN: vörnin má aldrei fella breytingu á fyrirtæki.
  raise warning 'trg_audkenni_vidvorun (fyrirtaeki %): %', new.id, sqlerrm;
  return new;
end
$fn$;

drop trigger if exists trg_zz_audkenni_vidvorun on public.fyrirtaeki;
create trigger trg_zz_audkenni_vidvorun after update of nafn, heimilisfang, kennitala on public.fyrirtaeki
for each row when (old.nafn is distinct from new.nafn or old.heimilisfang is distinct from new.heimilisfang or old.kennitala is distinct from new.kennitala)
execute function public.trg_audkenni_vidvorun();

create or replace view public.v_audkenni_vidvaranir with (security_invoker = true) as
select id, at, fyrirtaeki_id, tegund, gamalt_kt, nytt_kt, gamalt_nafn, nytt_nafn, gamalt_heimilisfang, nytt_heimilisfang, vidvorun
from public.kt_breyting_log where vidvorun is not null and kvittad_at is null order by at desc;

create or replace function public.audkenni_kvitta(p_id bigint, p_hver text default null) returns int
language sql security definer set search_path to 'public' as $$
  with u as (update public.kt_breyting_log set kvittad_at = now(), kvittad_af = coalesce(p_hver, current_user) where id = p_id and kvittad_at is null returning 1)
  select count(*)::int from u
$$;
revoke all on function public.audkenni_kvitta(bigint, text) from public, anon, authenticated;
