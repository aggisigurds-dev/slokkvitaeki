-- 2026-09-11 — Stólpa-bók fyrri eigenda í Supabase + Stólpa-staða á reikningsskjölum.
-- Heimild: viðskiptamannabók úr Stólpa sem Agnar sendi 11.09.2026 („reikningar_hreyfingar_frá_2023.xlsx",
-- blað Stimplanir_260518174141 — útflutt 18.05.2026, færslur 2016-01-01..2026-05-07, 15.578 raðir).
-- Regla Agnars 11.09.2026: reikningur sendur úr Stólpa telst greiddur fyrri eigendum
-- („einhverjir reikningar voru millifærðir beint á gömlu eigendurnar"). Aldrei rukka þá né stofna kröfu í Payday.
--
-- Beitt sem tvær migrations (stolpi_bok_toflur, stolpi_bok_loka) + bakfylling hér neðst.
-- Innflutningur: scratchpad-skrift (stolpi_samsvorun.py → stolpi_innflutningur.cjs) með opinbera lyklinum
-- gegnum tímabundnar anon-INSERT-reglur sem stolpi_bok_loka felldi eftir að fjöldi og summur voru sannreynd:
--   stolpi_hreyfingar 15.578 · debet 154.758.648 · kredit 140.686.996
--   stolpi_reikningar 5.095 (5.000 reikningar + 95 kredit) · upphæð 146.150.043 · opið við yfirtöku 14.377.820
-- Samsvörun per kennitölu: kreditreikningur ↔ reikningur eftir upphæð → „Greiddur reikningur: N" beint →
-- „Greiðsla á kröfu: K" eftir höfuðstól (greiðsla − innheimtukostnaður 295) → tveggja reikninga samtala → FIFO.
-- Staða: greitt 4.460 · opid_vid_yfirtoku 445 · kreditfaert 95 · kreditreikningur 95.

-- ── migration stolpi_bok_toflur ─────────────────────────────────────────────
create table if not exists public.stolpi_hreyfingar (
  id integer primary key,
  nafn text,
  kt text,
  kt10 text generated always as (regexp_replace(coalesce(kt, ''), '[^0-9]', '', 'g')) stored,
  dags date,
  eindagi date,
  texti text,
  tilvisun text,
  stadsetning text,
  runa integer,
  debet numeric not null default 0,
  kredit numeric not null default 0,
  upphaed numeric not null default 0,
  byrjunarstada numeric,
  lokastada numeric,
  tegund text not null check (tegund in ('reikningur','kredit','greiddur_reikningur','greidd_krafa','innheimtukostnadur','drattarvextir','greiddir_vextir','opnunarlina','annad')),
  reikn_nr text,
  krafa_nr text,
  heimild text not null default 'Stólpi · Stimplanir_260518174141 (útflutt 18.05.2026)',
  created_at timestamptz not null default now()
);
create index if not exists stolpi_hreyfingar_kt10_dags_idx on public.stolpi_hreyfingar (kt10, dags);
create index if not exists stolpi_hreyfingar_reikn_nr_idx on public.stolpi_hreyfingar (reikn_nr) where reikn_nr is not null;
alter table public.stolpi_hreyfingar enable row level security;

create table if not exists public.stolpi_reikningar (
  reikn_nr text primary key,
  tegund text not null check (tegund in ('reikningur','kredit')),
  kt text,
  kt10 text generated always as (regexp_replace(coalesce(kt, ''), '[^0-9]', '', 'g')) stored,
  nafn text,
  dags date,
  eindagi date,
  upphaed numeric not null,
  stada text not null check (stada in ('greitt','kreditfaert','opid_vid_yfirtoku','kreditreikningur')),
  greitt_dags date,
  krafa_nr text,
  greitt_upphaed numeric,
  opid_upphaed numeric not null default 0,
  kredit_tengsl text,
  samsvorun text,
  skyring text not null,
  heimild text not null default 'Stólpi · Stimplanir_260518174141 (útflutt 18.05.2026)',
  created_at timestamptz not null default now()
);
create index if not exists stolpi_reikningar_kt10_idx on public.stolpi_reikningar (kt10);
alter table public.stolpi_reikningar enable row level security;
-- (tímabundnar reglur stolpi_*_innflutningur_tmp „for insert to anon" — felldar í stolpi_bok_loka)

-- ── migration stolpi_bok_loka ───────────────────────────────────────────────
-- (sannreynir fjölda + summur og kastar villu ef ekki stemmir; fellir svo tímabundnu reglurnar)
drop policy if exists stolpi_hreyfingar_innflutningur_tmp on public.stolpi_hreyfingar;
drop policy if exists stolpi_reikningar_innflutningur_tmp on public.stolpi_reikningar;
alter table public.customer_documents
  add column if not exists stolpi_stada text,
  add column if not exists stolpi_skyring text;

-- ── bakfylling (keyrð 11.09.2026 — 1.064 skjöl: greitt 828 · opið 165 · kreditfært 47 · kreditreikningur 24) ──
with d as (
  select cd.id, regexp_replace(cd.invoice_number, '^[A-Za-z]+-?', '') nr, cd.amount, cb.kennitala
  from customer_documents cd left join customers_base cb on cb.id = cd.customer_base_id
  where cd.doc_type = 'reikningur' and cd.invoice_number ~ '^[RS]-?1[0-9]{5}$'
), m as (
  select d.id, s.stada, s.skyring from d join stolpi_reikningar s on s.reikn_nr = d.nr
  where s.kt10 = regexp_replace(coalesce(d.kennitala,''),'[^0-9]','','g')
     or d.amount is null
     or abs(abs(d.amount) - abs(s.upphaed)) <= 2
)
update customer_documents c set stolpi_stada = m.stada, stolpi_skyring = m.skyring
from m where c.id = m.id and (c.stolpi_stada is distinct from m.stada or c.stolpi_skyring is distinct from m.skyring);

-- ── bankayfirlit 0528-26-006005 (01.01–01.06.2026) — keyrt 11.09.2026 ─────────────────────────────
-- Agnar sendi „2026.xlsx" = bankayfirlit reiknings 0528-26-006005 (134 innborganir). 96 kröfugreiðslur
-- (kröfur 1045xx–1046xx, apríl–júní 2026) sem Stólpa-bókin sá ekki. 89 samsvara opnum Stólpa-reikningum
-- (nafn + upphæð): greiðsla = round(0,8 × reikningur m. VSK) + 295 kr (62 upp á krónu, 25 + dráttarvextir,
-- 2 á 100% + vextir). Kröfurnar frá apríl–maí voru því 80% af reikningi — óútskýrt (spyrja Agnar/fyrri eigendur).
-- Niðurstaða: 89 reikningar → greitt, 69 reikningsskjöl uppfærð; opið við yfirtöku 445 → 356 (8.875.284 kr).
with v(nr, d, k, a, pct, vx) as (values
('108068','2026-04-10','104578',7628,80,false),
('108058','2026-04-13','104573',60166,80,true),
('108001','2026-04-13','104541',463834,80,false),
('108133','2026-04-13','104615',74385,80,false),
('108098','2026-04-13','104589',26669,80,false),
('108117','2026-04-13','104606',16667,80,false),
('108096','2026-04-14','104587',137014,80,false),
('108028','2026-04-15','104556',58217,80,true),
('108106','2026-04-15','104596',6945,80,false),
('108102','2026-04-15','104592',39493,80,false),
('108094','2026-04-15','104585',84245,80,false),
('108107','2026-04-16','104597',44038,80,false),
('108109','2026-04-17','104599',29239,80,false),
('108125','2026-04-17','104612',5820,80,false),
('108138','2026-04-17','104619',83551,80,false),
('108095','2026-04-17','104586',28533,80,false),
('108111','2026-04-17','104601',45845,80,false),
('108110','2026-04-17','104600',7181,80,false),
('108120','2026-04-17','104608',49175,80,false),
('108093','2026-04-17','104584',143894,80,false),
('108118','2026-04-17','104621',747418,80,false),
('108134','2026-04-17','104616',155501,80,false),
('108103','2026-04-17','104593',13661,80,false),
('108101','2026-04-17','104591',18423,80,false),
('108100','2026-04-20','104590',58845,80,true),
('108136','2026-04-20','104618',6975,80,true),
('108169','2026-04-20','104627',12322,80,false),
('108105','2026-04-20','104595',12855,80,true),
('108115','2026-04-20','104604',24921,80,true),
('108112','2026-04-20','104602',15994,80,true),
('108158','2026-04-20','104624',17783,80,false),
('108131','2026-04-20','104614',6945,80,false),
('108121','2026-04-20','104609',16667,80,false),
('108135','2026-04-20','104617',23363,80,false),
('108124','2026-04-21','104611',276082,80,true),
('107729','2026-04-21','104364',60788,100,true),
('108092','2026-04-21','104583',20786,80,true),
('108114','2026-04-24','104603',14589,80,true),
('108155','2026-04-24','104623',11415,80,false),
('108183','2026-04-27','104629',13750,80,false),
('108180','2026-04-27','104628',7023,80,false),
('108164','2026-04-27','104626',13750,80,false),
('108151','2026-04-27','104622',20249,80,false),
('108184','2026-04-28','104630',47901,80,true),
('108162','2026-04-28','104625',17994,80,true),
('108108','2026-05-04','104598',39586,80,false),
('108119','2026-05-04','104607',19969,80,true),
('107947','2026-05-06','104502',18933,100,true),
('108290','2026-05-12','104683',14207,80,false),
('108239','2026-05-13','104649',20195,80,false),
('108236','2026-05-13','104646',6945,80,false),
('108275','2026-05-15','104670',16667,80,false),
('108097','2026-05-15','104588',41787,80,true),
('108242','2026-05-20','104652',49205,80,false),
('108274','2026-05-20','104669',35313,80,false),
('108285','2026-05-20','104678',31805,80,false),
('108280','2026-05-21','104674',3420,80,false),
('108227','2026-05-22','104641',14342,80,false),
('108259','2026-05-22','104661',82881,80,false),
('108258','2026-05-22','104660',18143,80,false),
('108245','2026-05-22','104654',22535,80,false),
('108218','2026-05-22','104634',14342,80,false),
('108294','2026-05-22','104686',8191,80,false),
('108224','2026-05-22','104639',16786,80,false),
('108250','2026-05-22','104657',39055,80,false),
('108231','2026-05-22','104645',76406,80,false),
('108298','2026-05-22','104687',11334,80,false),
('108288','2026-05-22','104681',33677,80,false),
('108219','2026-05-22','104635',24809,80,false),
('108287','2026-05-22','104680',21576,80,false),
('108252','2026-05-22','104659',29561,80,false),
('108208','2026-05-22','104633',8191,80,false),
('108241','2026-05-22','104651',16786,80,false),
('108293','2026-05-22','104685',7023,80,false),
('108286','2026-05-22','104679',23155,80,false),
('108238','2026-05-22','104648',6945,80,false),
('108226','2026-05-22','104640',65871,80,false),
('108228','2026-05-22','104642',22284,80,false),
('108284','2026-05-26','104677',27344,80,true),
('108279','2026-05-26','104673',46047,80,true),
('108243','2026-05-26','104653',38882,80,true),
('108220','2026-05-26','104636',14423,80,true),
('108251','2026-05-26','104658',60248,80,true),
('108237','2026-05-26','104647',6978,80,true),
('108222','2026-05-26','104637',38976,80,true),
('108289','2026-05-27','104682',279776,80,true),
('108271','2026-05-29','104667',64561,80,true),
('108266','2026-05-29','104663',156262,80,true),
('108223','2026-06-01','104638',25002,80,true)
), u as (
  update stolpi_reikningar s set
    stada = 'greitt', greitt_dags = v.d::date, krafa_nr = v.k, greitt_upphaed = v.a, opid_upphaed = 0,
    samsvorun = 'banki_0528:' || v.pct || '%' || case when v.vx then '+vextir' else '' end,
    skyring = 'Stólpi · greitt ' || to_char(v.d::date, 'DD.MM.YYYY') || ' inn á 0528-26-006005 · krafa ' || v.k
              || case when v.pct = 80 then ' · krafan 80% af reikningi' else '' end,
    heimild = s.heimild || ' + bankayfirlit 0528-26-006005 (01.01–01.06.2026)'
  from v where s.reikn_nr = v.nr and s.stada = 'opid_vid_yfirtoku'
  returning s.reikn_nr, s.skyring
), c as (
  update customer_documents cd set stolpi_stada = 'greitt', stolpi_skyring = u.skyring
  from u where regexp_replace(cd.invoice_number, '^[A-Za-z]+-?', '') = u.reikn_nr and cd.stolpi_stada is not null
  returning cd.id
)
select (select count(*) from u) reikningar_uppfaerdir, (select count(*) from c) skjol_uppfaerd;
