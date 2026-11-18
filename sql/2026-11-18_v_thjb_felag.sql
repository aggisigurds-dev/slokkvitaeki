-- 2026-11-18 — v_thjb_felag: hvaða félag átti pósthólfið sem opið mál á Þjónustuborðinu barst í.
--
-- TILEFNI (Agnar 18.11.2026): „Geturðu búið til bara sér Ham inn á þjónustuborðinu bara á Agnari sem er bara fyrir
-- verkefnin í Brunahólf". Hamurinn er regluhamur (thjonustubord5.hamir[].regla, 368-thjonustubord5.js reglaTekur) og
-- öruggasta merkið um að mál tilheyri Brunahólfi er pósthólfið sem erindið barst í:
--   thjonustubeidni.channel_ref = 'email:<id>'  →  email_digest.account
-- Agnar samþykkti sýnina sérstaklega 18.11.2026 („Já, stofna sýnina") eftir að lotan lagði ákvörðunina fyrir hann.
--
-- AF HVERJU SÝN SEM LES FRAM HJÁ RLS (ekki security_invoker):
--   Vafrinn notar anon-lykilinn og RLS á email_digest leyfir anon aðeins eldklar@eldklar.is og hluta bokhald@eldklar.is
--   (sql/2026-09-19_bokhald_postholf_synilegt.sql). Borðið getur því ekki lesið `account` fyrir Brunahólfs-póst.
--   Sýnin er í eigu postgres og les viljandi fram hjá þeirri reglu, en skilar AÐEINS tveimur dálkum:
--     id     auðkenni málsins (þegar opið anon í thjonustubeidni, sem er án RLS)
--     felag  'brunaholf' eða 'slokkvitaeki'
--   Ekkert netfang, enginn sendandi, ekkert efni og enginn texti úr pósti.
--
-- HVAÐ OPNAST: einn biti á hvert opið póstmál — hvort Brunahólf átti hólfið. Anon skrifar channel_ref og getur því spurt
--   um hvaða email_digest.id sem er og fengið þann eina bita; ekkert efni lekur. Rýnt af oryggi 18.11.2026: GO.
--   Verður ný security_definer_view-athugasemd hjá advisor — það er ætlunin hér.
--
-- HÓLFIN: brunaholf@brunaholf.is (geymt líka sem Brunaholf@…, því lower()), bokhald@brunaholf.is og brunaholfehf@gmail.com
--   eru Brunahólf. Allt annað — eldklar@, bokhald@eldklar og slokkvitaeki@brunaholf.is — er Slökkvitæki.
--
-- MYNSTRIÐ {1,15}: anon getur skrifað channel_ref; með [0-9]+ felldi ein röð með 20 stafa tölu alla sýnina á
--   „bigint out of range".
--
-- Mál án channel_ref (handskráð, Claude-mál, gátt) koma ekki í sýnina; hamurinn ræður við það (merki, kúnni, titill).
-- AFTURKÖLLUN: drop view public.v_thjb_felag;  — borðið fellur þá á hinar reglurnar, ekkert brotnar.

create or replace view public.v_thjb_felag as
select t.id,
       case when lower(ed.account) in ('brunaholf@brunaholf.is', 'bokhald@brunaholf.is', 'brunaholfehf@gmail.com')
            then 'brunaholf' else 'slokkvitaeki' end as felag
  from public.thjonustubeidni t
  join public.email_digest ed
    on ed.id = case when t.channel_ref ~ '^email:[0-9]{1,15}$' then substr(t.channel_ref, 7)::bigint end
 where t.deleted_at is null
   and t.archived_at is null
   and (t.status is null or t.status <> 'lokad');

revoke all on public.v_thjb_felag from anon, authenticated;
grant select on public.v_thjb_felag to anon, authenticated;

comment on view public.v_thjb_felag is
  'Félagið sem átti pósthólfið sem opið þjónustuborðsmál barst í (brunaholf/slokkvitaeki). Les viljandi fram hjá RLS á email_digest en skilar aðeins id og felag. Notað af regluhömum á Þjónustuborðinu (368). Samþykkt af Agnari 18.11.2026.';
