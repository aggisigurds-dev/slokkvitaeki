-- ============================================================================
-- ÖRUGG STILLINGAVISTUN — ein atómísk aðgerð í stað lesa-sameina-skrifa
-- (verkefnalisti: „Stillingar skrifa heilan gamlan settings-blob → étur vinnu
--  af hinum vélunum" + „Vistunar-úttekt: deepMerge/þöglar vistanir")
--
-- VANDINN
--   js/patches/85-app-settings.js `save()` gerði: lesa ALLAN 1,4 MB blobbinn →
--   sameina í vafranum → skrifa hann allan til baka. Milli lesturs og skrifar
--   er gluggi: vél B les sama grunn og vél A, og sú sem skrifar seinna eyðir
--   breytingu hinnar — þögult, og viðmótið segir ✓. Varúðar-endurlestur (frá
--   2026-07-20) styttir gluggann en lokar honum ekki.
--
-- LAUSNIN
--   Serverinn sameinar sjálfur í EINNI setningu. Aðeins lyklarnir sem sendir
--   eru fara á línuna og aðeins þeir snertast, svo tvær vélar geta vistað ólíka
--   lykla á sömu sekúndu án þess að trufla hvor aðra.
--
-- Sannprófað að `jsonb_deep_merge` hegði sér EINS og deepMerge() í js:
--   systkinalyklar haldast · fylki yfirskrifast · null yfirskrifar · nýir bætast við
-- ============================================================================

create or replace function public.jsonb_deep_merge(a jsonb, b jsonb)
returns jsonb language plpgsql immutable as $$
declare k text; out_j jsonb;
begin
  if a is null then return b; end if;
  if b is null then return a; end if;
  if jsonb_typeof(a) <> 'object' or jsonb_typeof(b) <> 'object' then return b; end if;
  out_j := a;
  for k in select jsonb_object_keys(b) loop
    if (a ? k) and jsonb_typeof(a->k) = 'object' and jsonb_typeof(b->k) = 'object' then
      out_j := jsonb_set(out_j, array[k], public.jsonb_deep_merge(a->k, b->k));
    else
      out_j := jsonb_set(out_j, array[k], b->k, true);
    end if;
  end loop;
  return out_j;
end $$;

-- Skilar aðeins staðfestingu — ekki blobbnum (annars værum við aftur með
-- 1,4 MB á línunni í hverri vistun).
create or replace function public.app_settings_merge(p_patch jsonb)
returns jsonb language plpgsql security definer as $$
declare v_ts timestamptz := now();
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'p_patch verður að vera json-hlutur';
  end if;
  update app_settings
     set settings = public.jsonb_deep_merge(coalesce(settings, '{}'::jsonb), p_patch),
         updated_at = v_ts
   where id = 1;
  if not found then
    insert into app_settings (id, settings, updated_at) values (1, p_patch, v_ts);
  end if;
  return jsonb_build_object('ok', true, 'updated_at', v_ts,
    'lyklar', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p_patch) k));
end $$;

-- Endurheimt á EINUM lykli eins og hann var við tiltekna breytingu.
-- Notað af „🕘 Stillingasaga" (js/patches/300-stillingasaga.js).
-- Endurheimtin er sjálf skráð í vernd → hana má líka taka til baka.
create or replace function public.app_settings_endurheimta(p_id bigint, p_key text)
returns jsonb language plpgsql security definer as $$
declare gamalt jsonb; fannst boolean;
begin
  gamalt := public.audit_settings_endurgera(p_id);
  fannst := (gamalt ? p_key);
  if fannst then
    update app_settings
       set settings = jsonb_set(coalesce(settings,'{}'::jsonb), array[p_key], gamalt->p_key, true),
           updated_at = now()
     where id = 1;
  else
    update app_settings
       set settings = coalesce(settings,'{}'::jsonb) - p_key, updated_at = now()
     where id = 1;
  end if;
  return jsonb_build_object('ok', true, 'lykill', p_key, 'var_til', fannst);
end $$;

grant execute on function public.app_settings_merge(jsonb) to anon, authenticated;
grant execute on function public.app_settings_endurheimta(bigint, text) to anon, authenticated;
grant execute on function public.audit_settings_endurgera(bigint) to anon, authenticated;
