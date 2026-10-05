-- 2026-10-05 (Agnar: „geturðu sett þetta upp þannig að skýrslurnar haldast við reikningana úr sínu kerfi")
--
-- RÓT: set_vidskiptategund() varpaði source='brunakerfi' í vidskiptategund='uttekt'. Þá var brunakerfisreikningur
-- flokkaður sem slökkvitækjaúttekt alls staðar sem tegundin ræður: auto_pair_customer_document paraði reikningsskjalið
-- við slökkvitækjaskýrsluna, 199 setti hann í slökkvitækja-reitinn og sendi hann með slökkvitækjaskýrslunni, og
-- 187/153 töldu hann sem úttekt ársins. Skráð sem óleyst rót í MINNISBOK 05.10 (R-001009 lagað handvirkt, R-001076
-- bar ranga tegund). Nú fær hver sala tegund síns kerfis: slokkvikerfi → slokkvikerfi, brunakerfi → brunakerfi,
-- uttekt → uttekt. Aðrar greinar óbreyttar.

create or replace function public.set_vidskiptategund()
 returns trigger
 language plpgsql
as $function$
declare
  v_teg text;
  v_num text;
begin
  -- 20.09.2026: skýr breyting á tegundinni í UPDATE er ákvörðun, ekki ágiskun.
  if tg_op = 'UPDATE' and new.vidskiptategund is distinct from old.vidskiptategund then
    return new;
  end if;

  if new.is_credit is true and new.customer_base_id is not null then
    select s.vidskiptategund, s.num into v_teg, v_num
    from solur s
    where s.customer_base_id = new.customer_base_id
      and s.id is distinct from new.id
      and coalesce(s.is_credit, false) = false
      and round(s.samtals::numeric) = -round(new.samtals::numeric)
      and s.created_at <= coalesce(new.created_at, now())
    order by s.created_at desc
    limit 1;
    if v_num is not null and new.kredit_a is null then
      new.kredit_a := v_num;
    end if;
    if v_teg is not null then
      new.vidskiptategund := v_teg;
      return new;
    end if;
  end if;
  if lower(coalesce(new.greitt_med,'')) in ('kort','reidufe','pening','reiðufé') then
    new.vidskiptategund := 'bud';
  elsif new.source = 'slokkvikerfi' then
    new.vidskiptategund := 'slokkvikerfi';
  elsif new.source = 'brunakerfi' then
    new.vidskiptategund := 'brunakerfi';     -- 2026-10-05: var 'uttekt'
  elsif new.source = 'uttekt' then
    new.vidskiptategund := 'uttekt';
  else
    new.vidskiptategund := vidskiptategund_ur_linum(new.linur);
  end if;
  return new;
exception when others then
  return new;
end $function$;

-- Gögnin: brunakerfissölur sem þegar bera 'uttekt' (8 raðir 05.10), og reikningsskjöl þeirra (9183 R-000651,
-- 9503 R-000743 — 10038 R-001009 var lagað fyrr sama dag). Skýr UPDATE á tegund = ákvörðun (triggerinn virðir hana);
-- á customer_documents losar auto_pair (UPDATE-greinin) reikninginn úr 'uttekt'-pari ef hann er í slíku.
update solur set vidskiptategund = 'brunakerfi'
 where source = 'brunakerfi' and vidskiptategund is distinct from 'brunakerfi';

update customer_documents cd set vidskiptategund = 'brunakerfi'
  from solur s
 where s.source = 'brunakerfi' and cd.doc_type = 'reikningur'
   and cd.invoice_number = s.num
   and cd.vidskiptategund is distinct from 'brunakerfi';
