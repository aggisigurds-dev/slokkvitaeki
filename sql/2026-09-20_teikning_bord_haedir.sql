-- 2026-09-20: hæðir, skurður og handdregnir veggir á úttektarteikningu (patch 383).
-- Keyrt á framleiðslu 20.09.2026 (migration teikning_bord_haedir).
-- Afturkræft: alter table public.teikning_bord drop column haedir;
-- markers/image_url standa áfram og spegla FYRSTU hæð, svo eldri biðlarar (og 109-borðinn) virka óbreyttir.
alter table public.teikning_bord
  add column if not exists haedir jsonb not null default '[]'::jsonb;
comment on column public.teikning_bord.haedir is
  'Hæðir: [{id,nafn,image_url,markers:[{unitId,x,y}],skurdur:{x,y,w,h}|null,veggir:[[x1,y1,x2,y2]]}] — hnit í punktum FRUMMYNDAR. Tómt = ein hæð í markers/image_url.';
