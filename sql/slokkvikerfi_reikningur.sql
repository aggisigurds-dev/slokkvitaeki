-- Slökkvikerfis-reikningur (05.10.2026): tegundin `slokkvikerfi` á sölunni og skjalinu
--
-- Agnar: „Í slökkvikerfis þjónustu getum við ekki útbúið reikninginn, bara skýrsluna — fyrir Varmaland.
-- Láta þetta virka svipað og fyrirtæki í þjónustu ársskoðun … fari svo í kröfuyfirlit með skýrslunni."
--
-- 386 stofnar nú reikning (source='slokkvikerfi'). Tvennt í gagnagrunninum vissi ekki af tegundinni:
--
-- 1) set_vidskiptategund: aðeins 'uttekt'/'brunakerfi' fengu tegund úr source; annað var lesið úr línunum, og
--    slökkvikerfislínur (Skýrslugerð + Akstur) urðu 'uttekt' = slökkvitækjaúttekt. Nú: source 'slokkvikerfi' →
--    vidskiptategund 'slokkvikerfi' (skjalið erfir hana gegnum trg_customer_documents_erfa_tegund).
-- 2) auto_pair_customer_document: reikningur af tegundinni 'slokkvikerfi' gat gripið HVAÐA bíðandi úttektarpar sem
--    var (biðstöðu-greinin hleypti öllu í gegn sem var ekki 'uttekt'/'brunakerfi') og lokað því sem „klárað".
--    Nú parast hann aldrei sjálfkrafa, eins og búðarsala, og er losaður úr úttektarpari fái hann tegundina síðar.
--    Kröfu yfirlit (166) finnur skýrsluna eftir stað + ári + þjónustu — ekkert par þarf til að senda hana með.
--
-- Hver breyting er textaskipti í núverandi falli; finnist textinn ekki stöðvast keyrslan (ekkert breytist hljóðlaust).

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.set_vidskiptategund'::regproc);
  n := replace(d,
    $a$  elsif new.source = 'uttekt' or new.source = 'brunakerfi' then$a$,
    $a$  elsif new.source = 'slokkvikerfi' then
    new.vidskiptategund := 'slokkvikerfi';
  elsif new.source = 'uttekt' or new.source = 'brunakerfi' then$a$);
  if n = d then raise exception 'set_vidskiptategund: textinn fannst ekki — engu breytt'; end if;
  execute n;

  d := pg_get_functiondef('public.auto_pair_customer_document'::regproc);
  n := replace(d,
    $a$  if new.doc_type = 'reikningur' and v_teg = 'bud' then$a$,
    $a$  if new.doc_type = 'reikningur' and v_teg in ('bud','slokkvikerfi') then$a$);
  if n = d then raise exception 'auto_pair: bud-reglan fannst ekki — engu breytt'; end if;
  d := n;
  n := replace(d,
    $a$and v_teg in ('bud','brunakerfi','uttekt') then$a$,
    $a$and v_teg in ('bud','brunakerfi','uttekt','slokkvikerfi') then$a$);
  if n = d then raise exception 'auto_pair: losunar-skilyrðið fannst ekki — engu breytt'; end if;
  d := n;
  n := replace(d,
    $a$(p.service_type = 'uttekt'     and v_teg in ('bud','brunakerfi'))$a$,
    $a$(p.service_type = 'uttekt'     and v_teg in ('bud','brunakerfi','slokkvikerfi'))$a$);
  if n = d then raise exception 'auto_pair: úttektarpar-losunin fannst ekki — engu breytt'; end if;
  execute n;
end $$;
