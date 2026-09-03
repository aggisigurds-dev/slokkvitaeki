-- Vörður gegn endurvakningu eyddra vara (Agnar 03.09.2026).
-- ÞEGAR KEYRT á osfdzskyvisifcwyjkuk — geymt hér svo skemað sé rekjanlegt í repo-inu.
--
-- Saga: sáningarpatcharnir (66-pricelist-seed, 80-aux-products) settu eyddar vörur
-- inn aftur. Rótin var kapphlaup við hleðslu — þeir lásu legsteinalistann úr
-- AppSettings, sem hleðst asynkrónt og skilar tómum lista þangað til — og hún var
-- löguð í PR #845. EN sú vörn býr í vafranum og getur ekki stöðvað vafra sem keyrir
-- GAMLA kóðann: localStorage-merkið `_auxProductsSeededV1` er bundið við LÉN, svo
-- deploy-preview-slóðir og cache-aðir vafrar keyra sáninguna upp á nýtt — og skrifa
-- í þennan sama grunn. Mælt fimm sinnum: 24.08, 02.09, og 03.09 kl. 17:11, 22:21
-- og 22:36 (það síðasta EFTIR að kóðalagfæringin fór í loftið).
--
-- Þess vegna á reglan heima hér: hún gildir um alla skrifara, öll lén, allar útgáfur.
--
-- Hegðun: BEFORE INSERT skilar NULL fyrir vöru sem ber nafn á
-- app_settings.settings->'sala'->'deleted_product_names'. Röðin fellur HLJÓÐLEGA en
-- er skráð í vorur_hafnad_log. Undantekning hefði fellt HEILA lotu-innsetningu
-- sáningarinnar og þar með líka löglegar nýjar vörur.
-- Sannreynt við uppsetningu: lota með 2 eyddum + 1 löglegri → eyddu stöðvaðar og
-- skráðar, löglega komst inn, lotan féll ekki.
--
-- Vilji maður fá vöru aftur: taktu nafnið AF deleted_product_names. Handvirk
-- skráning í appinu gerir það sjálfkrafa (js/vorur.js).

create table if not exists vorur_hafnad_log (
  id          bigserial primary key,
  nafn        text not null,
  reynt_at    timestamptz not null default now(),
  db_role     text not null default current_user
);
comment on table vorur_hafnad_log is
  'Innsetningar á vorur sem vörðurinn hafnaði því nafnið er á deleted_product_names. Tóm tafla = enginn gamall vafri að reyna að endurvekja eyddar vörur.';

create or replace function vorur_hafna_eyddum()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  er_eytt boolean;
begin
  select exists (
    select 1
    from app_settings s,
         lateral jsonb_array_elements_text(
           coalesce(s.settings->'sala'->'deleted_product_names', '[]'::jsonb)
         ) x
    where s.id = 1
      and lower(btrim(x)) = lower(btrim(new.nafn))
  ) into er_eytt;

  if er_eytt then
    insert into vorur_hafnad_log (nafn) values (new.nafn);
    return null;              -- fell þessa röð, hinar í lotunni fá að fara inn
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vorur_hafna_eyddum on vorur;
create trigger trg_vorur_hafna_eyddum
  before insert on vorur
  for each row
  execute function vorur_hafna_eyddum();
