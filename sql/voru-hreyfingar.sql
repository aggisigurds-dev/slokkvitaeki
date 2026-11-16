-- vorur_hreyfingar — hreyfingalisti hverrar vöru (16.11.2026, Agnar: „hafðu hverja vöru með history glugga, sem sýnir
-- magn og á hvaða verði, og útreikninga, vísun í þennan útreikning, hvenær bætt við … hálfgerðan hreyfingarlista").
--
-- Ein röð per vöru per atburð. Innflutt sending („Færa í birgðir" í Birgðir → Innflutningur) skrifar eina röð á hverja
-- vöru sendingarinnar — líka þegar kaupverð vörunnar stendur óbreytt, svo sagan sýni hvað sendingin kostaði.
-- Afturköllun eyðir engu: röðin fær afturkallad_at.
-- RLS á og engar reglur: aðeins netlify/functions/innflutningur.cjs les og skrifar (þjónustulykill, starfsmannahlið).
-- Glugginn: js/patches/509-voru-hreyfingar.js (GET /api/innflutningur?vara=<id>).
--
--   tegund         innflutningur | innkaup | talning | leidretting | eldra
--   einingaverd    verð frá birgja á stykki í `mynt`; gengi = það sem greiðslan gaf
--   vorur_kr       vöruverð á stykki í kr · alag_kr = flutningur og gjöld á stykki · kostnadarverd = summan
--   kostn_fyrir/_eftir, birgdir_fyrir/_eftir   það sem stóð á vörunni fyrir og eftir (eins ef ekkert breyttist)
--   utreikningur   { birgir, land, erl_alls, vorur_isk_alls, kostnadur_alls, heild, skipting, hlutur,
--                    lidir:[{ heiti, upphaed, tegund }], omaeldir:[], kaupverd: nytt|medal|obreytt, baeta }

create table if not exists public.vorur_hreyfingar (
  id               bigserial primary key,
  vara_id          bigint not null,
  dags             date,
  tegund           text not null check (tegund in ('innflutningur', 'innkaup', 'talning', 'leidretting', 'eldra')),
  magn             numeric,
  einingaverd      numeric,
  mynt             text,
  gengi            numeric,
  vorur_kr         numeric,
  alag_kr          numeric,
  kostnadarverd    numeric,
  kostn_fyrir      numeric,
  kostn_eftir      numeric,
  birgdir_fyrir    numeric,
  birgdir_eftir    numeric,
  tilvisun         text,
  innflutningur_id bigint,
  utreikningur     jsonb,
  athugasemd       text,
  skrad_af         text,
  afturkallad_at   timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists vorur_hreyfingar_vara_idx on public.vorur_hreyfingar (vara_id, created_at desc);

alter table public.vorur_hreyfingar enable row level security;
revoke all on table public.vorur_hreyfingar from anon, authenticated;
revoke all on sequence public.vorur_hreyfingar_id_seq from anon, authenticated;

comment on table public.vorur_hreyfingar is
  'Hreyfingalisti vöru: innkaup, kostnaðarverð og talningar. RLS án reglna: aðeins /api/innflutningur (þjónustulykill, starfsmannahlið).';

-- Sala vörunnar eftir mánuðum. Sömu föll og v_vorur_selt (dálkurinn „Selt" í Birgðum), svo tölurnar stemma þar við.
-- an_vsk er einingaverð × magn á línunum, fyrir afslátt reikningsins; kreditlínur (neikvætt magn) dragast frá.
create or replace function public.vara_solusaga(p_vara bigint)
returns table (manudur text, magn numeric, an_vsk numeric)
language sql stable
as $$
  select to_char(date_trunc('month', s.created_at), 'YYYY-MM') as manudur,
         sum(x.q) as magn,
         sum(x.q * coalesce((l.value->>'unit_price_ex_vat')::numeric, 0)) as an_vsk
  from solur s
    cross join lateral jsonb_array_elements(coalesce(s.linur, '[]'::jsonb)) l(value)
    cross join lateral (select solulina_vara(l.value) as vara_id, solulina_magn(l.value) as q) x
  where s.status = 'final' and x.vara_id = p_vara
  group by 1
  order by 1 desc
$$;

revoke all on function public.vara_solusaga(bigint) from anon, authenticated;
