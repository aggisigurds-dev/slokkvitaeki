-- 11.11.2026 — bh_postur_inn_a_bord: auglýsingar verða ekki að málum á Þjónustuborðinu.
-- Tilefni: JOE & THE JUICE-tilboð (joe@news.e.joejuice.com) varð að máli #1600 og áður #1347; Booking-herferð að #99.
-- Sendandinn slapp framhjá c_sjalfv-listanum (news.e.joejuice.com) og póstinum fylgdi spurningarmerki.
-- Breyting: lesa email_digest.labels og sleppa pósti sem Gmail flokkar sem PROMOTIONS/SOCIAL, eða sem kemur
-- af fréttabréfa-undirléni (@news.x.y, @email.x.y, @info.x.y …). Ástæða í postur_inn_log: 'auglýsing / fréttabréf'.
-- Sama regla er í 448-tolvupostar.js (AUGL_MERKI / AUGL_SENDANDI). Breytir aðeins tveimur stöðum í lifandi
-- skilgreiningunni og stoppar ef annar þeirra finnst ekki.
do $mig$
declare d text;
begin
  select pg_get_functiondef('public.bh_postur_inn_a_bord(boolean,timestamptz)'::regprocedure) into d;
  if position('auglýsing / fréttabréf' in d) > 0 then
    raise notice 'þegar komið';
    return;
  end if;
  d := replace(d,
    'coalesce(d.has_attachment, false) as vidh',
    'coalesce(d.has_attachment, false) as vidh, coalesce(d.labels, ''{}''::text[]) as lab');
  d := replace(d,
    '    elsif e.sender ~* ''(no[-_.]?reply',
    '    elsif e.lab && array[''CATEGORY_PROMOTIONS'', ''CATEGORY_SOCIAL'']::text[]
       or e.sender ~* ''@(news|newsletter|e|em|email|mailing|marketing|promo|campaign|engage|engagement|info)\.[a-z0-9-]+\.'' then
      v_adgerd := ''sleppt''; v_astaeda := ''auglýsing / fréttabréf'';
    elsif e.sender ~* ''(no[-_.]?reply');
  if position('as lab' in d) = 0 or position('auglýsing / fréttabréf' in d) = 0 then
    raise exception 'bh_postur_inn_a_bord: textinn sem átti að breyta fannst ekki — ekkert breytt';
  end if;
  execute d;
end
$mig$;
