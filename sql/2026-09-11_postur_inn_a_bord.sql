-- Sjálfvirkt póst-innsog á Þjónustuborð 2 (Master borð) — beitt 11.09.2026 sem Supabase-migration
-- `postur_inn_a_bord_v1`. Þetta skjal er afrit í repóinu svo sagan og reglurnar séu læsilegar án gagnagrunnsins.
--
-- Agnar 10.09.2026: „integrate ai og tölvupóstasamskipti meira inn á þjónustuborðið"; 11.09: „mátt halda áfram að endurbæta".
-- Aðeins eldklar@eldklar.is INBOX (appið les ekki bokhald@), aðeins póstur sem berst EFTIR virkjun (postur_inn_stilling.fra),
-- og HVER póstur skráður í postur_inn_log með aðgerð og ástæðu.
--
-- Prufukeyrsla (skrifar ekkert):  select * from bh_postur_inn_a_bord(true, now() - interval '45 days');
--   Mælt 11.09.2026 á 45 dögum: ~100 póstar → 19 ný mál (öll raunveruleg erindi), svör sameinuð í mál,
--   0 reikningar/auglýsingar/kvittanir/sjálfvirk svör á borðinu.
-- Virkjað 11.09.2026 kl. 01:46 UTC:
--   update postur_inn_stilling set virkt = true, fra = now(), uppfaert_at = now() where id = 1;
--   select cron.schedule('postur-inn-a-bord', '*/15 * * * *', $$select count(*) from public.bh_postur_inn_a_bord(false)$$);
-- Slökkva:  update postur_inn_stilling set virkt = false where id = 1;
-- Af hverju fór póstur ekki inn?  select * from postur_inn_log order by keyrt_at desc;

create table if not exists public.postur_inn_stilling (
  id smallint primary key default 1 check (id = 1),
  virkt boolean not null default false,
  fra timestamptz,
  uppfaert_at timestamptz not null default now()
);
insert into public.postur_inn_stilling (id, virkt, fra) values (1, false, null) on conflict (id) do nothing;

create table if not exists public.postur_inn_log (
  email_id bigint primary key,
  beidni_id bigint,
  adgerd text not null,
  astaeda text,
  keyrt_at timestamptz not null default now()
);

alter table public.postur_inn_stilling enable row level security;
alter table public.postur_inn_log enable row level security;
revoke all on table public.postur_inn_stilling from anon, authenticated;
revoke all on table public.postur_inn_log from anon, authenticated;

-- Þráðalykill: efnislína án Re:/Sv:/Fw:-forskeyta + lén sendanda (fullt netfang ef almennt póstlén).
create or replace function public.bh_postur_lykill(p_efni text, p_sendandi text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(trim(regexp_replace(regexp_replace(coalesce(p_efni, ''), '^\s*((re|sv|svar|aw|fw|fwd|tr)\s*:\s*)+', '', 'i'), '\s+', ' ', 'g')))
      || '|' ||
      case
        when split_part(lower(trim(coalesce(p_sendandi, ''))), '@', 2) = any (array['gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','msn.com','yahoo.com','icloud.com','me.com','simnet.is','internet.is','visir.is','mi.is','talnet.is','heimsnet.is'])
          then lower(trim(coalesce(p_sendandi, '')))
        else split_part(lower(trim(coalesce(p_sendandi, ''))), '@', 2)
      end
$$;

create or replace function public.bh_postur_inn_a_bord(p_prufa boolean default true, p_fra timestamptz default null)
returns table (email_id bigint, adgerd text, astaeda text, beidni_id bigint, mottekid timestamptz, sendandi text, efni text, kunni text)
language plpgsql
security definer
set search_path = public
as $fn$
#variable_conflict use_column
declare
  st public.postur_inn_stilling%rowtype;
  v_fra timestamptz;
  e record;
  v_len text;
  v_lykill text;
  v_svar boolean;
  v_base bigint;
  v_fid bigint;
  v_nafn text;
  v_mal bigint;
  v_type text;
  v_titill text;
  v_texti text;
  v_adgerd text;
  v_astaeda text;
  v_nyir jsonb := '{}'::jsonb;
  c_free text[] := array['gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','msn.com','yahoo.com','icloud.com','me.com','simnet.is','internet.is','visir.is','mi.is','talnet.is','heimsnet.is'];
  c_sjalfv text[] := array['google.com','engagement.microsoft.com','communication.microsoft.com','microsoft.com','teya.com','alfred.is','booking.com','linkedin.com','facebookmail.com','cloudflare.com','mailchimp.com','sendgrid.net','amazonses.com','unimaze.com','rsk.is','postur.is'];
begin
  select * into st from public.postur_inn_stilling s where s.id = 1;
  if p_prufa then
    v_fra := coalesce(p_fra, st.fra);
  else
    if not coalesce(st.virkt, false) or st.fra is null then
      return;
    end if;
    v_fra := st.fra;
  end if;
  if v_fra is null then
    return;
  end if;

  -- Tengingar úr v_kunni_postur reiknaðar EINU SINNI (sýnin er þung).
  drop table if exists pg_temp._postur_tengt;
  create temp table _postur_tengt on commit drop as
    select k.email_id as eid,
           case when count(distinct k.customer_base_id) = 1 then min(k.customer_base_id) end as base_id
    from public.v_kunni_postur k
    where k.account = 'eldklar@eldklar.is'
      and k.received_at >= v_fra
      and k.customer_base_id is not null
      and not coalesce(k.fra_okkur, false)
    group by k.email_id;

  for e in
    select d.id as did, d.received_at as rec, lower(trim(coalesce(d.sender_email, ''))) as sender, d.sender_name as sname,
           coalesce(d.subject, '') as subj, coalesce(d.body_preview, d.snippet, '') as body,
           coalesce(d.is_question, false) as spurn, coalesce(d.has_attachment, false) as vidh
    from public.email_digest d
    where d.account = 'eldklar@eldklar.is'
      and d.folder <> 'SENT'
      and d.received_at >= v_fra
      and not exists (select 1 from public.postur_inn_log l where l.email_id = d.id)
      and not exists (select 1 from public.thjonustubeidni t where t.channel_ref = 'email:' || d.id)
    order by d.received_at asc, d.id asc
  loop
    v_len := split_part(e.sender, '@', 2);
    v_svar := e.subj ~* '^\s*(re|sv|svar|aw|fw|fwd|tr)\s*:';
    v_adgerd := null; v_astaeda := null; v_mal := null; v_base := null; v_fid := null; v_nafn := null;

    if v_len in ('eldklar.is', 'brunaholf.is') then
      v_adgerd := 'sleppt'; v_astaeda := 'innanhúss (' || v_len || ')';
    elsif e.sender = 'aggisigurds@gmail.com' then
      v_adgerd := 'sleppt'; v_astaeda := 'persónulegt pósthólf';
    elsif e.sender ~* '(no[-_.]?reply|do[-_.]?not[-_.]?reply|postmaster|mailer-daemon|bounce|notification|automated|campaign|newsletter|frettabref)'
       or exists (select 1 from unnest(c_sjalfv) s(len) where v_len = s.len or v_len like '%.' || s.len) then
      v_adgerd := 'sleppt'; v_astaeda := 'sjálfvirkur sendandi';
    elsif e.subj ~* '(í fríi|out of office|sjálfvirkt svar|automatic reply|auto-?reply|fjarverandi|away from)' then
      v_adgerd := 'sleppt'; v_astaeda := 'sjálfvirkt svar';
    elsif not v_svar and e.subj ~* '(sölureikning|söluafhending|reikningsyfirlit|-\s*reikningur|færsla þjónustuaðila|móttekið rafrænt skjal|pöntun afgreidd|kvittun|eindagi|staðfesting á netfangi|security alert|fréttabréf|newsletter|afslátt|tilboðsdag|helgin byrjar|þjónustukönnun|hvernig stöndum|greiðsla frá|600508-?0400|your invoice from|verify your email|undeliverable|delivery status|payment (received|confirmation))' then
      v_adgerd := 'sleppt'; v_astaeda := 'reikningur, kvittun eða tilkynning';
    elsif trim(e.subj) = '' and trim(e.body) = '' and not e.vidh then
      v_adgerd := 'sleppt'; v_astaeda := 'innihaldslaus';
    end if;

    if v_adgerd is null then
      select tg.base_id into v_base from _postur_tengt tg where tg.eid = e.did;
      if v_base is null then
        select case when count(*) = 1 then min(f.id) end,
               case when count(distinct f.customer_base_id) = 1 then min(f.customer_base_id) end
          into v_fid, v_base
        from public.fyrirtaeki f
        where f.deleted_at is null and f.netfang is not null
          and e.sender = any (regexp_split_to_array(lower(f.netfang), '[[:space:],;]+'));
      end if;
      if v_base is null and v_fid is null and v_len <> '' and not (v_len = any (c_free)) then
        select case when count(*) = 1 then min(f.id) end,
               case when count(distinct f.customer_base_id) = 1 then min(f.customer_base_id) end
          into v_fid, v_base
        from public.fyrirtaeki f
        where f.deleted_at is null and f.netfang is not null
          and exists (select 1 from regexp_split_to_table(lower(f.netfang), '[[:space:],;]+') a(adr) where split_part(a.adr, '@', 2) = v_len);
      end if;
      if v_fid is not null then select f.nafn into v_nafn from public.fyrirtaeki f where f.id = v_fid; end if;
      if v_nafn is null and v_base is not null then select b.nafn into v_nafn from public.customers_base b where b.id = v_base; end if;

      if not (v_svar or v_base is not null or v_fid is not null or e.spurn) then
        v_adgerd := 'sleppt'; v_astaeda := 'ótengdur sendandi og hvorki svar né spurning';
      end if;
    end if;

    if v_adgerd is null then
      v_lykill := public.bh_postur_lykill(e.subj, e.sender);
      select t.id into v_mal
      from public.thjonustubeidni t
      join public.email_digest d2 on d2.id = (substring(t.channel_ref from '^email:([0-9]+)$'))::bigint
      where t.channel_ref like 'email:%'
        and t.deleted_at is null and t.archived_at is null and coalesce(t.status, '') <> 'lokad'
        and public.bh_postur_lykill(d2.subject, d2.sender_email) = v_lykill
      order by t.updated_at desc nulls last
      limit 1;

      if v_mal is not null or (p_prufa and v_nyir ? v_lykill) then
        v_adgerd := 'uppfaert';
        v_astaeda := case when v_mal is not null then 'nýr póstur í opnu máli #' || v_mal else 'nýr póstur í sama þræði (prufumál)' end;
        if not p_prufa then
          update public.thjonustubeidni t
             set channel_ref = 'email:' || e.did, svarad_at = null, updated_at = now()
           where t.id = v_mal;
        end if;
      else
        v_adgerd := 'nytt_mal';
        v_astaeda := case when v_base is not null or v_fid is not null then 'tengt: ' || coalesce(v_nafn, '?')
                          when v_svar then 'svar í samtali'
                          else 'spurning' end;
        v_texti := e.subj || ' ' || e.body;
        v_type := case
          when v_texti ~* '(hringja|símtal|simtal|heyra í|hringið|hringdu)' then 'hringja'
          when v_texti ~* '(tilboð|tilbod|verðtilboð|\mverð\M|\mverd\M|kostar|kostnað|bjóð|boðið|\mtæki\M|\mtaeki\M|quotation|\mquote\M)' then 'skodun_tilbod'
          when v_texti ~* '(þjónustusamning|thjonustusamning|nýr samning|nyr samning|gera samning|\msamning)' then 'nyr_samningur'
          when v_texti ~* '(endurfyll|áfyll|afyll|hleðsl|hledsl|refill)' then 'uttekt_eftirfylgni'
          when v_texti ~* '(skýrsl|skyrsl|úttekt|uttekt|skoðun|skodun|reikning|afrit)' then 'skjalabeidni'
          else 'annad' end;
        v_titill := nullif(trim(regexp_replace(regexp_replace(e.subj, '^\s*((re|sv|svar|aw|fw|fwd|tr)\s*:\s*)+', '', 'i'), '\s+', ' ', 'g')), '');
        if v_titill is null then
          v_titill := nullif(trim(substring(e.body from '([^\n]{4,90})')), '');
        end if;
        v_titill := coalesce(v_titill, '📧 Póstur frá ' || coalesce(nullif(trim(e.sname), ''), e.sender));
        if p_prufa then
          v_nyir := v_nyir || jsonb_build_object(v_lykill, e.did);
        else
          insert into public.thjonustubeidni (title, notes, source, type, status, priority, customer_base_id, fyrirtaeki_id, customer_nafn,
                                              channel_ref, created_by, created_at, updated_at, important, tags)
          values (left(v_titill, 200), nullif(left(e.body, 2000), ''), 'email', v_type, 'nytt', 'venjulegur', v_base, v_fid,
                  coalesce(v_nafn, nullif(trim(e.sname), ''), e.sender), 'email:' || e.did, 'postur-sjalfvirkt', e.rec, now(), false, '[]'::jsonb)
          returning id into v_mal;
        end if;
      end if;
    end if;

    if not p_prufa then
      insert into public.postur_inn_log (email_id, beidni_id, adgerd, astaeda)
      values (e.did, v_mal, v_adgerd, v_astaeda)
      on conflict do nothing;
    end if;

    email_id := e.did; adgerd := v_adgerd; astaeda := v_astaeda; beidni_id := v_mal;
    mottekid := e.rec; sendandi := e.sender; efni := left(e.subj, 90); kunni := v_nafn;
    return next;
  end loop;
end;
$fn$;

revoke all on function public.bh_postur_inn_a_bord(boolean, timestamptz) from public;
revoke all on function public.bh_postur_inn_a_bord(boolean, timestamptz) from anon, authenticated;
revoke all on function public.bh_postur_lykill(text, text) from public;
revoke all on function public.bh_postur_lykill(text, text) from anon, authenticated;
