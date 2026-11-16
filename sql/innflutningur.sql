-- innflutningur — innfluttar sendingar og kostnaðarverð þeirra (16.11.2026, flipinn Innflutningur í Birgðum).
-- Ein röð á sendingu; vörulínur og kostnaðarliðir í jsonb (sama mynstur og innkaupapantanir.lines).
-- RLS á og engar reglur: aðeins netlify/functions/innflutningur.cjs les og skrifar, með þjónustulyklinum og
-- á bak við starfsmannahliðið. Útreikningurinn: netlify/functions/_innflutningur-reikna.cjs.
--
--   linur      [{ vara_id, heiti, magn, einingaverd }]          einingaverð í erlendri mynt (mynt)
--   kostnadur  [{ heiti, upphaed, tegund }]                     kr; tegund kostnadur | innskattur | ekki; upphaed null = ómælt
--   vorur_isk  það sem var greitt fyrir vörurnar í kr (t.d. bankafærsla); annars línur × gengi
--   faersla    { at, af, linur:[{ vara_id, kostn_fyrir, kostn_eftir, birgdir_fyrir, birgdir_eftir, … }], arekstrar }
--   saga       [{ at, af, adgerd: stofnud | faert | afturkallad, … }]

create table if not exists public.innflutningur (
  id          bigserial primary key,
  tilvisun    text not null default 'Ný sending',
  birgir      text,
  land        text,
  mynt        text not null default 'EUR',
  gengi       numeric,
  vorur_isk   numeric,
  skipting    text not null default 'verd' check (skipting in ('verd', 'fjoldi')),
  dags        date,
  athugasemd  text,
  linur       jsonb not null default '[]'::jsonb,
  kostnadur   jsonb not null default '[]'::jsonb,
  stada       text not null default 'drog' check (stada in ('drog', 'faert')),
  faersla     jsonb,
  saga        jsonb not null default '[]'::jsonb,
  breytt_af   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.innflutningur enable row level security;
revoke all on table public.innflutningur from anon, authenticated;
revoke all on sequence public.innflutningur_id_seq from anon, authenticated;

comment on table public.innflutningur is
  'Innfluttar sendingar (Birgðir → Innflutningur). RLS án reglna: aðeins /api/innflutningur (þjónustulykill, starfsmannahlið).';
