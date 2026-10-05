-- Listaverð birgja á vöru (05.10.2026)
--
-- Agnar: „kaupverð, listaverð og söluverð. Listaverð er það sama og söluverð á flestu í brunakerfi."
-- Kostnaður-reikningarnir sýna hvort tveggja: einingarverð = listaverð birgjans (án VSK), línuupphæð / magn = það sem
-- greitt var eftir afslátt = kaupverð (vorur.kostnadarverd). Söluverð er áfram vorur.verd_an_vsk.

alter table public.vorur add column if not exists listaverd numeric;
comment on column public.vorur.listaverd is 'Listaverð birgja án VSK (einingarverð á innkaupareikningi, fyrir afslátt). Kaupverð = kostnadarverd, söluverð = verd_an_vsk.';
