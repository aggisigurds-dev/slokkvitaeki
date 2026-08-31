-- Charlize — tengiliðir og netföng
-- Keyra EFTIR setup.sql og setup-kunnar.sql. Öruggt að keyra aftur.

create table if not exists charlize_contacts (
  id            bigserial primary key,
  kennitala     text,                       -- fyrirtækið; null þegar ekki tekist að tengja
  fyrirtaeki    text,                       -- heiti eins og það stóð þegar tengt var
  netfang       text,                       -- fullt netfang, lágstafað
  len           text,                       -- lénið eitt og sér (gara.is)
  tegund        text not null default 'netfang' check (tegund in ('netfang','len')),
  hlutverk      text,                       -- rekstur | bokhald | husvordur | pantanir | onnur
  heiti         text,                       -- valfrjálst: hlutverk er betra en nafn, sjá kunnaminni.md
  attin         text check (attin in ('inn','ut','baedi')),
  faerslur      int  default 0,             -- hversu oft sést í póstinum
  fyrst_sest    date,
  sidast_sest   date,
  source        text,
  confidence    text not null default 'unverified'
                  check (confidence in ('confirmed','likely','unverified')),
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected','superseded')),
  created_at    timestamptz not null default now(),
  unique (netfang, kennitala)
);

create index if not exists charlize_contacts_kt_idx  on charlize_contacts (kennitala);
create index if not exists charlize_contacts_len_idx on charlize_contacts (len);

-- ÖRYGGI: þessi tafla geymir netföng viðskiptavina. RLS er slökkt á 66 töflum í
-- verkefninu og anon-lykillinn les allt. Kveiktu á RLS hér — vefurinn þarf ekki
-- þessa töflu, aðeins agentar sem keyra með service-lykli.
alter table charlize_contacts enable row level security;
-- Staðfestu á eftir að appið virki áfram; ef eitthvað brotnar:
--   alter table charlize_contacts disable row level security;

create or replace view v_charlize_contacts_active as
  select kennitala, fyrirtaeki, netfang, len, hlutverk, attin,
         faerslur, sidast_sest, confidence
  from charlize_contacts
  where status = 'approved'
  order by kennitala, faerslur desc;

create or replace view v_charlize_contacts_pending as
  select id, kennitala, fyrirtaeki, netfang, len, faerslur,
         fyrst_sest, sidast_sest, confidence, source
  from charlize_contacts
  where status = 'pending'
  order by kennitala nulls last, faerslur desc;

-- Netföng sem tókst ekki að tengja við félag — handvirkur listi
create or replace view v_charlize_contacts_otengd as
  select len, count(*) as netfong, sum(faerslur) as postar,
         max(sidast_sest) as sidast
  from charlize_contacts
  where kennitala is null and status <> 'rejected'
  group by len
  order by postar desc;


-- ── Yfirlit per fyrirtæki ─────────────────────────────────────────────────────
-- Ein textablokk sem má lesa fyrir heimsókn eða áður en pósti er svarað.
create or replace function charlize_yfirlit(kt text)
returns text as $$
declare
  nafn      text;
  tengil    text;
  minni     text;
  n_faerslu int;
begin
  select max(coalesce(fyrirtaeki, kennitala)) into nafn
  from charlize_contacts where kennitala = kt;

  if nafn is null then
    select max(fact) into nafn from charlize_knowledge
    where scope = 'kunni' and kennitala = kt limit 1;
  end if;

  select string_agg(
           coalesce(hlutverk,'?') || ': ' || netfang ||
           coalesce(' (' || faerslur || ' póstar)',''), E'\n  ')
    into tengil
  from v_charlize_contacts_active where kennitala = kt;

  select count(*), string_agg('[' || topic || '] ' || fact, E'\n  ' order by topic, created_at)
    into n_faerslu, minni
  from v_charlize_kunni where kennitala = kt;

  return
    'FYRIRTÆKI  ' || coalesce(nafn, '(óþekkt)') || '  (' || kt || ')' || E'\n' ||
    E'\nTENGILIÐIR\n  ' || coalesce(tengil, '(engir skráðir)') ||
    E'\n\nMINNI (' || coalesce(n_faerslu,0) || E' færslur)\n  ' ||
    coalesce(minni, '(ekkert skráð enn — skrifaðu fyrstu færsluna eftir næstu heimsókn)');
end $$ language plpgsql;

-- Notkun:  select charlize_yfirlit('420993-2269');


-- ── Fyrirspurnir ──────────────────────────────────────────────────────────────

-- Hver sendi þennan póst? (matcha á léni þegar netfangið er nýtt)
--   select kennitala, fyrirtaeki, hlutverk from v_charlize_contacts_active
--   where netfang = lower('<sendandi>') or len = lower('<lén>');

-- Samþykkja lotu
--   update charlize_contacts set status='approved', confidence='confirmed'
--   where id in (...);

-- Félög sem eiga engan skráðan tengilið
--   select distinct k.kennitala from charlize_knowledge k
--   where k.scope='kunni'
--     and not exists (select 1 from v_charlize_contacts_active c
--                     where c.kennitala = k.kennitala);
