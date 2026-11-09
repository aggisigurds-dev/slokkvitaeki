// combo-yfirlit.cjs — EITT VERKFERLIS-YFIRLIT (07.11.2026)
//
//   GET /api/combo-yfirlit                 → allt, JSON
//   GET /api/combo-yfirlit?flokkur=krofur  → einn flokkur
//   GET /api/combo-yfirlit?skrifa=1        → auk þess: uppfærir EITT mál á Þjónustuborði Agnars
//
// Agnar 07.11.2026: „Kortleggja upplýsingareiti, pósta, kröfuyfirlit og allt setja í api
// verkferlis combo yfirlit inn á Agnar þjónustuborð sem ég get keyrt til að yfirfara."
// Og: „Og verkefnalistana, samþykktir ofl."
//
// ÞRJÁR REGLUR SEM ÞETTA FALL FYLGIR — þær kostuðu allar eitthvað:
//
//  1. ENGIN NÝ TALA. Hver lína hér les SÖMU sýn og vörðurinn/borðið les. Þegar ég bjó til
//     mína eigin útgáfu af „krafa ekki send" sagði hún 9 mál / 662 þús. á meðan borðið sagði
//     23 / 2,49 m.kr. — tvö mælikerfi um sama hlutinn. Blæbrigði eru DÁLKAR í sýninni, aldrei
//     ný sýn. (minni: feedback_maelingin_er_lika_til)
//  2. ÞÖGN ER EKKI NÚLL. Svari Supabase ekki, eða vanti sýnina, þá er `tala: null` og
//     `merki: 'OMAELT'` — aldrei 0. Tómt svar sem lítur út eins og „ekkert að" er það sem
//     lætur mælitækið ljúga. (minni: feedback_tomt_svar_er_ekki_stadreynd)
//  3. ÞAKIÐ ER GRUNNLÍNA, EKKI MARKMIÐ. `thak` er staðan 07.11.2026 eftir hreinsun. Rautt
//     þýðir „ÞETTA HÆKKAÐI", ekki „gamla skuldin stendur". Ekki hækka þak til að þagga.
//
// BÓKAÐ VERK TELST EKKI GLEYMT. Dagnóturnar (app_settings.skipulagsbord.by_staff.<nafn>.dagnotur)
// eru frjáls texti per dagsetning — þær eru EINA heimildin um hvað er bókað, og ekkert mælitæki
// las þær áður. Þess vegna kemur `dagskra` með í hverju svari: vikan sem er að koma, í texta.
// Mælt 07.11.2026: fjórir Heimaleigu-staðir (Midtown 61, Máni 54, Ice Apartments 8,
// Höfuðstöðvar 6 = 129 tæki) stóðu með skoðun frá okt. 2025 og voru bókaðir 10.–11.11.

const P = require('./_portal.cjs');

const nu = () => new Date();
const iso = (d) => d.toISOString().slice(0, 10);

/* ── Lítill lesari sem SKILAR ÞÖGN SEM ÞÖGN ─────────────────────────────────── */
async function sbTelja(leid) {
  try {
    const r = await fetch(`${P.SUPABASE_URL}/rest/v1/${leid}${leid.includes('?') ? '&' : '?'}select=*&limit=1`, {
      method: 'HEAD',
      headers: {
        apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`,
        Prefer: 'count=exact', Range: '0-0',
      },
    });
    if (!r.ok) return { tala: null, villa: 'HTTP ' + r.status };
    const n = parseInt(String(r.headers.get('content-range') || '').split('/')[1], 10);
    return Number.isFinite(n) ? { tala: n } : { tala: null, villa: 'content-range vantar' };
  } catch (e) { return { tala: null, villa: String(e.message || e) }; }
}

async function sbRadir(leid, select, radir) {
  try {
    const q = `${leid}${leid.includes('?') ? '&' : '?'}select=${encodeURIComponent(select)}&limit=${radir}`;
    const r = await fetch(`${P.SUPABASE_URL}/rest/v1/${q}`, {
      headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) { return null; }
}

/* ── FLOKKARNIR ─────────────────────────────────────────────────────────────────
 * thak  = mælt 07.11.2026 (grunnlína eftir hreinsun). tala > thak ⇒ NÝTT.
 * heimild = hvar talan er geymd. Agnar á að geta flett henni upp sjálfur.
 * adgerd  = hvað er gert við hana, í einni setningu.
 * krona   = dálkur sem lagt er saman í peninga (annars enginn peningur).
 */
const FLOKKAR = [
  /* ── KRÖFUYFIRLIT ─────────────────────────────────────────────────────────── */
  { f: 'krofur', k: 'krafa-ekki-send', h: 'Reikningur til — krafa ekki send',
    leid: 'v_krafa_ekki_send', thak: 23, krona: 'samtals',
    select: 'num,customer_nafn,samtals,dags,dagar,kreditfaerdur,gengid_inn',
    heimild: 'sýnin v_krafa_ekki_send (sama skilyrði og patch 489)',
    adgerd: 'Senda kröfuna, eða merkja ⏸ BÍÐA í krafa_note með ástæðu.' },

  { f: 'krofur', k: 'kredit-an-endurgerdar', h: 'Kreditfært og aldrei endurgert',
    // 22 → 27 (08.11.2026): sýnin var LEIÐRÉTT, ekki versnað. Hún útilokaði status='draft'
    // sem er ekki til; raunverulega gildið er 'drog', svo DRAG taldist gild endurgerð og
    // faldi fimm raðir. 8 af 27 bera endurgerð sem VAR greidd — lestu endurgerd_greidd.
    leid: 'v_kredit_an_endurgerdar', thak: 27, krona: 'samtals',
    select: 'num,customer_nafn,samtals,dags,kredit_num,kredit_dags',
    heimild: 'sýnin v_kredit_an_endurgerdar',
    adgerd: 'Endurgera reikninginn, eða loka málinu sem réttmætri bakfærslu.' },

  { f: 'krofur', k: 'verk-an-reiknings', h: 'Skýrsla til — enginn reikningur',
    leid: 'v_verk_an_reiknings', thak: 6,
    select: '*',
    heimild: 'sýnin v_verk_an_reiknings (útilokar skýrslur fyrir yfirtöku 07.05.2026)',
    adgerd: 'Rukka verkið. Yfirtökureikningar voru greiddir fyrri eiganda — þeir eru ALDREI okkar krafa.' },

  /* ÓGILD SALA TELST ALDREI. Fyrsta útgáfan taldi 9 rauðar ábendingar; átta þeirra voru
   * `status=void` með ábendinguna „ógild sala — fer aldrei í kröfu". Sýnin er LEITARTAFLA
   * (patch 166 slær upp í hana per sölu og hefur ÞEGAR tekið void út), ekki listi — gallinn
   * var minn, ekki sýnarinnar. Eftir stóð EITT raunverulegt mál: R-001264 Nesdekk Dekkjalager.
   * Þak 1 er því mælt, ekki valið: þegar það fer í 2 er ný krafa með rauða ábendingu á leiðinni. */
  { f: 'krofur', k: 'forskodun-rautt', h: 'Kröfuforskoðun með rauðri ábendingu',
    leid: 'v_krofu_forskodun?litur=eq.rautt&status=neq.void', thak: 1,
    select: 'num,customer_nafn,samtals,status,rautt',
    heimild: 'sýnin v_krofu_forskodun (dálkurinn rautt), ógildar sölur frátaldar',
    adgerd: 'Lesa ábendinguna áður en krafan fer út — rautt stoppar sendingu.' },

  { f: 'krofur', k: 'gengid-inn-osott', h: 'Gengið-inn sölur ósóttar yfir 30 daga',
    leid: 'v_gengid_inn_osott?order=dagar.desc', thak: 24, krona: 'samtals',
    select: 'num,customer_nafn,samtals,dagar,innan_vaktar',
    heimild: 'sýnin v_gengid_inn_osott (sömu skilyrði og tools/audit-solu-id.cjs)',
    adgerd: 'ÞETTA ER EKKI KRAFA — einstaklingar staðgreiða við afhendingu, svo þetta er '
          + 'áminning um SÍMTAL. Vörðurinn sér aðeins 4 af 23 því hann leitar frá FASTRI '
          + 'dagsetningu 2026-09-01; 19 eldri (183.722 kr, elst 172 dagar) hafa aldrei sést '
          + 'í neinum verði. ÓMÆLT hvort þær voru staðgreiddar og paid_at aldrei sett.' },

  /* ── PÓSTUR ───────────────────────────────────────────────────────────────── */
  /* ÞAKIÐ FÓR ÚR 214 Í 124 (07.11.2026) — ekki af því að einhver svaraði, heldur af því að
   * sýnin taldi reikningana SEM VIÐ SENDUM sem innkominn póst. Þeir fara um Payday og
   * Netbókhald og lenda í INBOX með okkar eigin nafni. Lagfæringin prófar sendanda OG nafn:
   * delivery@payday.is ber sjö nöfn og fimm þeirra eru ÖNNUR félög að senda OKKUR reikning
   * (Seavis, Galaxy, Tímavera, Flutningaþjónusta Rvk) — sá póstur er raunverulegt erindi.
   * Að útiloka sendandann einan hefði falið hann: rétt tala með rangri samsetningu.
   * Af þeim 124 eru ~35 raunveruleg opin erindi; hitt eru lokakveðjur, fjöldapóstur og
   * þræðir eldri en SENT-safnið (sem byrjar 21.11.2023 og gerir eldra svar ÓMÆLANLEGT). */
  { f: 'postur', k: 'postur-osvarad-thjonusta', h: 'Félög í þjónustu með ósvaraðan póst',
    leid: 'v_fyrirtaeki_mail_stada?stada=eq.osvarad&er_i_thjonustu=is.true&order=bid_dagar.desc',
    thak: 124,
    select: 'nafn,netfang,sidasta_efni,bid_dagar',
    heimild: 'sýnin v_fyrirtaeki_mail_stada (stada=osvarad)',
    adgerd: 'Svara, eða merkja handled_at ef þriðji aðili svaraði. ATH: lesa to_addresses — '
          + 'póstur getur verið svaraður af öðrum en okkur.' },

  { f: 'postur', k: 'kunni-postur-osvarad', h: 'Viðskiptamenn með ósvaraðan póst',
    leid: 'v_kunni_postur_stada?osvarad=is.true', thak: 98,
    select: 'customer_base_id,postar,sidasti_inn,punktur',
    heimild: 'sýnin v_kunni_postur_stada (osvarad=true)',
    adgerd: 'Sama og að ofan, en á viðskiptamanni — notað í punktinum á kúnnaspjaldinu.' },

  { f: 'postur', k: 'skeytamidlun-vantar', h: 'Skeytamiðlun vantar á félag',
    // 49 → 46 (08.11.2026): fjögur félög duttu út þegar 'drog' var bætt í útilokunina —
    // þau áttu drög, ekki kröfur. Sjá tools/audit-skeytamidlun-vantar.cjs.
    leid: 'v_skeytamidlun_vantar', thak: 46,
    select: '*',
    heimild: 'sýnin v_skeytamidlun_vantar',
    adgerd: 'Setja netfang/skeytamiðlun á félagið svo krafan og skýrslan komist til skila.' },

  /* ── UPPLÝSINGAREITIR ─────────────────────────────────────────────────────── */
  { f: 'upplysingar', k: 'heimilisfang-vantar', h: 'Heimilisfang vantar',
    leid: 'v_heimilisfang_vantar', thak: 199,
    select: '*',
    heimild: 'sýnin v_heimilisfang_vantar — MÆLIR customers_base.heimilisfang (greiðandann)',
    adgerd: 'VARÚÐ: sýnin mælir ANNAN REIT en kostnaðinn. Kortið og akstursröðin lesa '
          + '`fyrirtaeki.heimilisfang` (js/mapfix.js:299) og falla á NAFNIÐ þegar það vantar '
          + '(js/patches/155-arsskodun-map-embed.js:417). Mælt 07.11.2026: af 199 stöðva '
          + 'aðeins TVÆR raunverulega vinnu — Eskihlíð (12 lifandi tæki, ekkert heimilisfang '
          + 'neins staðar) og Húsfélag Dalshrauni (5 tæki, gata án húsnúmers). 14 eiga gildið '
          + 'annars staðar (uttaeki.location) og eru TENGINGARVERK, ekki upplýsingasöfnun; '
          + '183 skipta engu (88 afgreiðslukúnnar, 78 draugaraðir úr innflutningi).' },

  { f: 'upplysingar', k: 'verkstadur-an-teikninga', h: 'Verkstaður án teikninga',
    leid: 'verkstadur_info?or=(teikningar.is.null,teikningar.eq.[])', thak: 18,
    select: 'worksite_name,heimilisfang,mynd_url',
    heimild: 'tafla verkstadur_info (dálkurinn teikningar)',
    adgerd: 'Sækja aðaluppdrátt (skill arnold) — teikning er forsenda búnaðargreiningar.' },

  { f: 'upplysingar', k: 'taekjatolur-misraemi', h: 'Tækjatalan stangast á (skrá ≠ skýrsla)',
    leid: 'v_taekjatolur_misraemi', thak: 40,
    select: '*',
    heimild: 'sýnin v_taekjatolur_misraemi (útilokar parse_ok=false — misheppnaður PDF-lestur er ÞÖGN, ekki núll)',
    adgerd: 'Bera saman EFTIR TEGUND, aldrei eftir heildarfjölda. Rétt tala með rangri '
          + 'samsetningu lýgur að næsta manni sem fer á staðinn. Mismunur á rekstrarfélagi '
          + 'þýðir oft RANGSTAÐSETT tæki — athuga systkinastaði á sömu kennitölu fyrst.' },

  /* ── SKOÐANIR ─────────────────────────────────────────────────────────────── */
  { f: 'skodanir', k: 'skodun-gleymd', h: 'Skoðun eldri en 12 mánuðir og engin rukkun í ár',
    leid: 'v_skodun_gleymd?order=taeki.desc', thak: 133,
    select: 'nafn,kennitala,taeki,sidasta_skodun',
    heimild: 'sýnin v_skodun_gleymd',
    adgerd: 'Bóka skoðun. ATH: sýnin útilokar félög sem eiga sölu eða Stólpa-reikning á '
          + 'kennitölunni í ár — hjá rekstrarfélagi getur það FALIÐ staði sem í raun bíða. '
          + 'Lestu dagskrána (dagskra hér að neðan) áður en þú kallar stað gleymdan.' },

  /* ── VERKEFNALISTAR ───────────────────────────────────────────────────────── */
  { f: 'verkefni', k: 'verkefnalisti-opin', h: 'Verkefnalisti — opin verk',
    leid: 'verkefnalisti?status=in.(beidni,i_yfirferd)&order=created_at.asc', thak: 97,
    select: 'id,title,status,assigned_agent,created_at',
    heimild: 'tafla verkefnalisti · brunaholf.netlify.app/api/verkefnalisti',
    // Þakið hjaðnar þegar skuld er borguð: 111 → 100 (07.11) → 97 (08.11, þrjú verk lokuð
    // með sönnun: Ægisgata 4 úr þjónustu, Agentanetið birt, pósterindin færð á mál #1541).
    // Flokkarnir eru vaktaðir sér — tools/audit-verkefni-flokkar.cjs gegn CAT_LABELS.
    adgerd: 'Lesa áður en nýtt verk er hafið (regla Agnars 30.07.2026).' },

  /* ── SAMÞYKKTIR ───────────────────────────────────────────────────────────── */
  { f: 'samthykki', k: 'samthykki-agnar', h: 'Samþykkismál sem bíða Agnars',
    leid: 'thjonustubeidni?deleted_at=is.null&status=neq.lokad&tags=cs.%5B%22samthykki%22%5D'
        // 150 → 174 (08.11.2026). 18 af hækkuninni er SÝNILEIKI, ekki ný skuld: þau mál báru
        // samthykki-tagið en engan eiganda, og án assigned_to='Agnar' birtast ✓/✕-takkarnir
        // ekki — þau var ekki hægt að samþykkja úr símanum. Hin 6 eru ný mál úr
        // samningaumferðinni 08.11 (#1549–#1554), þrjú með tilbúnum pósti.
        + '&assigned_to=eq.Agnar&order=created_at.asc', thak: 174,
    select: 'id,title,created_at,tags',
    heimild: 'tafla thjonustubeidni (tags ∋ samthykki, assigned_to=Agnar)',
    adgerd: 'Eitt mál = ein ákvörðun. Mál sem er orðið úrelt á að loka með „— Leiðrétt"-línu, '
          + 'ekki þagga niður.' },

  { f: 'samthykki', k: 'bord-opin', h: 'Þjónustuborð — opin mál alls',
    leid: 'thjonustubeidni?deleted_at=is.null&status=neq.lokad'
        // 425 → 431 (08.11.2026): sex ný samþykkismál úr samningaumferðinni (#1549–#1554).
        + '&tags=not.cs.%5B%22bh%3Acombo-yfirlit%22%5D', thak: 431,
    select: 'id,title,status,assigned_to',
    heimild: 'tafla thjonustubeidni',
    adgerd: 'Á borðið á aðeins það sem við finnum ekki sjálf (regla Agnars 07.11.2026).' },

  /* ── TENGINGAR ────────────────────────────────────────────────────────────────
   * SÖMU fimm síur og tools/audit-tengingar.cjs. Ótengd röð er ósýnileg röð:
   * hún gefur enga villu, hún hverfur bara úr öllum tölum.
   */
  { f: 'tengingar', k: 'taeki-an-vidskiptamanns', h: 'Lifandi tæki án viðskiptamanns',
    leid: 'uttaeki?customer_base_id=is.null&status=neq.urelt', thak: 0,
    select: 'id,nafn,fyrirtaeki_id',
    heimild: 'tafla uttaeki (customer_base_id tómt)',
    adgerd: 'Tengja við customer_base_id fyrirtækisins sem tækið stendur á.' },

  { f: 'tengingar', k: 'solur-an-vidskiptamanns', h: 'Sölur án viðskiptamanns',
    leid: 'solur?customer_base_id=is.null&status=neq.void', thak: 6,
    select: 'id,num,customer_nafn,customer_kt',
    heimild: 'tafla solur (customer_base_id tómt)',
    adgerd: 'Tengja á ÓTVÍRÆÐRI kennitölu. Sé kt á fleiri en einni base (rekstrarfélag) '
          + 'þarf Agnar að velja staðinn.' },

  { f: 'tengingar', k: 'erindi-an-fyrirtaekis', h: 'Opin erindi án fyrirtækis',
    leid: 'thjonustubeidni?deleted_at=is.null&status=neq.lokad&fyrirtaeki_id=is.null'
        + '&customer_base_id=is.null&created_by=not.in.(claude,veidi-vaktin,combo-yfirlit)', thak: 111,
    select: 'id,title,source',
    heimild: 'tafla thjonustubeidni (kerfismál Claude/Veiði-vaktar teljast EKKI)',
    adgerd: 'Tengja um póstinn í channel_ref, kennitölu í texta, eða ótvírætt nafn. '
          + 'Almennt lén sannar ekkert, og netfang sem er á mörgum stöðum sannar ekkert heldur.' },

  { f: 'tengingar', k: 'fyrirtaeki-an-vidskiptamanns', h: 'Lifandi fyrirtæki án viðskiptamanns',
    leid: 'fyrirtaeki?customer_base_id=is.null&deleted_at=is.null', thak: 18,
    select: 'id,nafn,kennitala',
    heimild: 'tafla fyrirtaeki (customer_base_id tómt)',
    adgerd: 'Öll 18 hafa TÓMA kennitölu — þau verða ekki tengd fyrr en hún fæst. Ákvörðun Agnars.' },
];

/* ── Dagskráin: frjáls texti per dagsetning, per starfsmann ──────────────────── */
async function dagskra(dagar) {
  const r = await sbRadir('app_settings?id=eq.1', 'settings', 1);
  const sb = r && r[0] && r[0].settings && r[0].settings.skipulagsbord;
  if (!sb || !sb.by_staff) return { merki: 'OMAELT', skyring: 'app_settings.skipulagsbord.by_staff fannst ekki' };
  const fra = iso(nu()), til = iso(new Date(nu().getTime() + dagar * 864e5));
  const ut = [];
  const check = [];
  Object.keys(sb.by_staff).forEach((nafn) => {
    const s = sb.by_staff[nafn] || {};
    Object.keys(s.dagnotur || {}).forEach((d) => {
      const t = String(s.dagnotur[d] || '').trim();
      if (t && d >= fra && d <= til) ut.push({ dags: d, hver: nafn, texti: t });
    });
    (s.checklisti || []).concat(s.checklisti2 || []).forEach((c) => {
      if (c && c.done !== true && String(c.t || '').trim()) {
        check.push({ hver: nafn, texti: String(c.t).trim(), stjarna: !!(Number(c.star) > 0) });
      }
    });
  });
  ut.sort((a, b) => (a.dags < b.dags ? -1 : a.dags > b.dags ? 1 : 0));
  return {
    merki: 'MAELT',
    heimild: 'app_settings.skipulagsbord.by_staff.<nafn>.dagnotur (frjáls texti, ein lína per dag)',
    naestu_dagar: ut,
    checklistar_opnir: check,
    athugasemd: 'Dagnóturnar eru EINA heimildin um hvað er bókað. Staður sem er á dagskrá er '
              + 'ekki gleymdur, hversu gömul sem síðasta skoðun er.',
  };
}


/* ── SAMSTILLING: hvenær barst hver heimild síðast ─────────────────────────────
 * Agnar 07.11.2026: „Checka á öll sync tengingar." Staðan er lesin af hubbnum
 * (brunaholf /api/data-sources-status) því innflutningurinn gerist þar.
 *
 * ÞETTA ER YTRI HEIMILD OG MÁ EKKI ÞEGJA. Svari hubburinn ekki er `merki: 'OMAELT'` —
 * aldrei „allt í lagi". Heimild sem hættir að berast lítur nákvæmlega eins út og heimild
 * sem hefur ekkert nýtt að segja, og munurinn kostar peninga: Landsbanka-skráin hafði
 * ekki borist í 146 daga þegar þetta var mælt, og sjö opin samþykkismál bíða hennar.
 */
const THAK_DAGAR = { invoices: 3, emails: 3, ajour: 7, timavera: 7, redder: 21, bank: 21 };

async function samstilling() {
  try {
    const r = await fetch('https://brunaholf.netlify.app/api/data-sources-status',
      { headers: { accept: 'application/json' } });
    if (!r.ok) return { merki: 'OMAELT', skyring: 'hubburinn svaraði HTTP ' + r.status };
    const j = await r.json();
    const rodir = Array.isArray(j) ? j : (j.sources || []);
    if (!rodir.length) return { merki: 'OMAELT', skyring: 'engar heimildir í svarinu' };
    const linur = rodir.map((x) => {
      const dagar = Number(x.age_days);
      const thak = THAK_DAGAR[x.key] != null ? THAK_DAGAR[x.key] : 7;
      return {
        lykill: x.key, heiti: x.label || x.key,
        dagar: Number.isFinite(dagar) ? dagar : null,
        thak, radir: x.count,
        sidast: String(x.last_import || '').slice(0, 10),
        merki: Number.isFinite(dagar) ? 'MAELT' : 'OMAELT',
        of_gamalt: Number.isFinite(dagar) ? dagar > thak : null,
      };
    });
    const gamlar = linur.filter((l) => l.of_gamalt);
    return {
      merki: 'MAELT', heimild: 'brunaholf /api/data-sources-status',
      heimildir: linur.length, of_gamlar: gamlar.length,
      elst: gamlar.length ? gamlar.reduce((a, b) => (b.dagar > a.dagar ? b : a)) : null,
      linur,
      athugasemd: 'Heimild sem hættir að berast lítur eins út og heimild sem hefur ekkert nýtt '
                + 'að segja. Dagafjöldinn er eina leiðin til að greina þar á milli.',
    };
  } catch (e) { return { merki: 'OMAELT', skyring: String(e.message || e) }; }
}


/* ── HIRSLURNAR: hvar opið verk liggur, allt á einum stað ──────────────────────
 * Agnar 08.11.2026: „ekki hægt að hafa allt útum allt, vantar skipulag."
 * Tíu geymslur halda opnu verki og enginn skjár sýndi þær saman. Hér eru þær, með
 * hlutverki hverrar — því listi án hlutverks fyllist af öllu.
 *
 * VARÚÐ SEM KOSTAÐI MIG MÆLINGU: `verkbeidnir` virðist 885 ef síað er á stöðuheiti sem maður
 * giskar á. Raunverulegu gildin eru collected/eytt/ready/received, og `collected` ÞÝÐIR AÐ
 * KÚNNINN SÓTTI TÆKIÐ — lokastaða. Opnu beiðnirnar eru 32. Kanónan: tools/audit-verk-stada.cjs.
 */
const HIRSLUR = [
  { k: 'bord', h: 'Þjónustuborðið — bíður ÞÍN', leid: 'thjonustubeidni?deleted_at=is.null&status=neq.lokad' },
  { k: 'samthykki', h: '  þar af samþykki á þig', leid: 'thjonustubeidni?deleted_at=is.null&status=neq.lokad&tags=cs.%5B%22samthykki%22%5D&assigned_to=eq.Agnar' },
  { k: 'verkefni', h: 'Verkefnalistinn — bíður OKKAR', leid: 'verkefnalisti?status=in.(beidni,i_yfirferd)' },
  { k: 'villur_app', h: 'app_problems — vélagögn', leid: 'app_problems?resolved=is.false' },
  { k: 'villur_vef', h: 'villur — vélagögn (hitt kerfið)', leid: 'villur?leyst_at=is.null' },
  { k: 'factcheck', h: 'factcheck — ósvarað (12 af 13 eru tvíburar)', leid: 'factcheck_akvardanir?svar=is.null' },
  { k: 'verkbeidnir', h: 'Verkbeiðnir á verkstæði (ready+received)', leid: 'verkbeidnir?eytt_at=is.null&status=in.(ready,received)' },
  { k: 'sara', h: 'Sara — yfirferð bíður', leid: 'sara_yfirferd?stada=not.in.(lokid,klarad,samthykkt)' },
  { k: 'drog', h: 'Reikningsdrög (Brunahólf)', leid: 'invoice_drafts?status=in.(draft,overdue)' },
];

async function hirslur() {
  const ut = await Promise.all(HIRSLUR.map(async (x) => {
    const t = await sbTelja(x.leid);
    return { lykill: x.k, heiti: x.h, tala: t.tala,
             merki: t.tala == null ? 'OMAELT' : 'MAELT', villa: t.villa };
  }));
  const maelt = ut.filter((x) => x.merki === 'MAELT' && x.lykill !== 'samthykki');
  return {
    merki: ut.some((x) => x.merki === 'OMAELT') ? 'AD HLUTA' : 'MAELT',
    linur: ut,
    opid_alls: maelt.reduce((a, x) => a + x.tala, 0),
    athugasemd: 'Hver hlutur á einn stað. Lendi hann á tveimur er hlekkur á milli og hinn lokast '
              + '— tools/audit-skorun-lista.cjs rauðnar þegar sami hlutur fer aftur á tvo staði.',
  };
}


/* ── VERKEFNALISTINN Á BORÐIÐ ─────────────────────────────────────────────────
 * Agnar 08.11.2026: „máttu setja linka inn á þessa verkefnalista á þjónustuborð Agnars, á meðan
 * þeir eru. Og veldu einhvern einn verkefnalista sem er notaður af öllum sessions svo þetta fari
 * ekki út um allt."
 *
 * EINN LISTI VAR VALINN: `verkefnalisti`. Hann var þegar sameiginlegi listinn — CLAUDE.md segir
 * hverri lotu að lesa hann í upphafi (GET brunaholf.netlify.app/api/verkefnalisti), hann ber
 * `assigned_agent`, `category` og `vefur`, og agentarnir skrifa í hann. Hinir listarnir halda
 * sínu hlutverki (borðið = ákvarðanir Agnars, villuskrár = vélagögn), en NÝTT VERK fer hingað.
 */
const VERKLISTI_VEFUR = 'https://brunaholf.netlify.app/verkefnalisti.html';

async function verkefni(radir) {
  const t = await sbTelja('verkefnalisti?status=in.(beidni,i_yfirferd)');
  if (t.tala == null) return { merki: 'OMAELT', skyring: t.villa || 'svaraði ekki', vefur: VERKLISTI_VEFUR };
  const d = await sbRadir('verkefnalisti?status=in.(beidni,i_yfirferd)&order=created_at.asc',
    'id,title,status,category,assigned_agent,created_at,vefur', Math.max(0, radir) || 8);
  return {
    merki: 'MAELT', opin: t.tala, vefur: VERKLISTI_VEFUR,
    elstu: (d || []).map((v) => ({
      id: String(v.id).slice(0, 8), titill: v.title, flokkur: v.category,
      agent: v.assigned_agent, dags: String(v.created_at || '').slice(0, 10),
      vefur: VERKLISTI_VEFUR + '#' + String(v.id).slice(0, 8),
    })),
    regla: 'EINN LISTI FYRIR ALLAR LOTUR: nýtt verk fer í `verkefnalisti`, ekki í nýja töflu og '
         + 'ekki á Þjónustuborðið. Borðið er fyrir ákvarðanir Agnars; verk sem þarf ekki hans já '
         + 'á heima hér.',
  };
}

/* ── Keyrsla ────────────────────────────────────────────────────────────────── */
async function maela(valinn, radir) {
  const listi = FLOKKAR.filter((x) => !valinn || x.f === valinn);
  const ut = await Promise.all(listi.map(async (x) => {
    const t = await sbTelja(x.leid);
    const lina = {
      flokkur: x.f, lykill: x.k, heiti: x.h,
      tala: t.tala, thak: x.thak,
      merki: t.tala == null ? 'OMAELT' : 'MAELT',
      nytt: t.tala == null ? null : Math.max(0, t.tala - x.thak),
      heimild: x.heimild, adgerd: x.adgerd,
    };
    if (t.villa) lina.villa = t.villa;
    if (t.tala == null) return lina;
    if (t.tala > 0 && radir > 0) {
      // Peningalína sækir ALLAR raðirnar (sýnirnar eru litlar) svo summan sé heildartalan
      // og stangist ekki á við borðið; aðrar sækja aðeins dæmin.
      const hamark = x.krona ? 2000 : radir;
      const d = await sbRadir(x.leid, x.select, hamark);
      if (d) {
        lina.daemi = d.slice(0, radir);
        if (x.krona) {
          lina.peningur = d.reduce((a, r) => a + (Number(r[x.krona]) || 0), 0);
          lina.peningur_af = d.length;
          lina.peningur_allt = d.length >= t.tala;
        }
      } else { lina.daemi_merki = 'OMAELT'; }
    }
    return lina;
  }));
  return ut;
}

/* ── Skrifa EITT mál á borðið ──────────────────────────────────────────────────
 * Málið er fundið á MERKINU, aldrei á titli — titillinn breytist með tölunni.
 * Allt frá fyrsta „══" og niður úr er mannsverk og stendur (sama vörn og Veiði-vaktin:
 * fyrsta útgáfa hennar hefði þurrkað út greiningu sem var skrifuð í málið í höndunum).
 */
const MERKI = 'bh:combo-yfirlit';
const kr = (n) => {
  const v = Math.round(Number(n) || 0);
  return String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
};

function malTexti(svar) {
  const s = svar.samantekt, L = svar.linur;
  const d = new Date(svar.maelt_kl);
  const dags = [d.getDate(), d.getMonth() + 1].map((x) => String(x).padStart(2, '0')).join('.')
    + '.' + d.getFullYear() + ' kl. '
    + [d.getHours(), d.getMinutes()].map((x) => String(x).padStart(2, '0')).join(':');

  const hluti = (f, heiti) => {
    const lin = L.filter((l) => l.flokkur === f);
    if (!lin.length) return '';
    return '\n' + heiti + '\n' + lin.map((l) => {
      if (l.merki === 'OMAELT') return '  ? ' + l.heiti + ': ÓMÆLT' + (l.villa ? ' (' + l.villa + ')' : '');
      const merki = l.nytt > 0 ? '✗' : '✓';
      const pen = l.peningur ? ' · ' + kr(l.peningur) + (l.peningur_allt ? '' : ' (af ' + l.peningur_af + ' röðum)') : '';
      return '  ' + merki + ' ' + l.heiti + ': ' + l.tala + ' (þak ' + l.thak + ')'
        + (l.nytt > 0 ? ' — ' + l.nytt + ' NÝ' : '') + pen;
    }).join('\n') + '\n';
  };

  const dsk = svar.dagskra || {};
  const dagLinur = (dsk.naestu_dagar || []).map((x) => '  ' + x.dags + ' · ' + x.hver + ': '
    + x.texti.replace(/\s*\n\s*/g, ' / ')).join('\n');
  const chk = (dsk.checklistar_opnir || []);

  return 'ÞETTA GERIST\n'
    + '▶ Keyra aftur: /api/combo-yfirlit?skrifa=1 — þá endurreiknast þetta mál og titillinn breytist.\n'
    + '💬 Skýring: segðu hvaða lína á að fara af listanum og hvers vegna.\n\n'
    + 'MÆLT ' + dags + ' — allt hér er lesið úr SÖMU sýnum og verðirnir lesa. Engin ný tala.\n'
    + 'Rautt (✗) þýðir „þetta hækkaði frá grunnlínunni 07.11.2026", EKKI „gamla skuldin stendur".\n'
    + (s.omaelt ? '\n⚠ ' + s.omaelt + ' lína(r) ÓMÆLD: ' + s.omaeldir_lyklar.join(', ')
        + ' — þögn er ekki núll.\n' : '')
    + hluti('krofur', 'KRÖFUYFIRLIT')
    + hluti('postur', 'PÓSTUR')
    + hluti('upplysingar', 'UPPLÝSINGAREITIR')
    + hluti('skodanir', 'SKOÐANIR')
    + hluti('verkefni', 'VERKEFNALISTAR')
    + hluti('samthykki', 'SAMÞYKKTIR')
    + hluti('tengingar', 'TENGINGAR (ótengd röð er ósýnileg röð)')
    + (function () {
        const s2 = svar.samstilling || {};
        if (s2.merki !== 'MAELT') return '\nSAMSTILLING: ÓMÆLD — ' + (s2.skyring || '') + '\n';
        const g = (s2.linur || []).filter((l) => l.of_gamalt);
        if (!g.length) return '\nSAMSTILLING: allar ' + s2.heimildir + ' heimildir ferskar.\n';
        return '\nSAMSTILLING — ' + g.length + ' heimild(ir) hætt(ar) að berast\n'
          + g.map((l) => '  ✗ ' + l.heiti + ': ' + l.dagar + ' dagar (þak ' + l.thak
              + '), síðast ' + l.sidast).join('\n') + '\n';
      })()
    + '\nDAGSKRÁ NÆSTU DAGA — staður á dagskrá er ekki gleymdur\n'
    + (dagLinur || '  (ekkert bókað í dagnótum þessa daga)') + '\n'
    + (chk.length ? '\nOPNIR CHECKLISTAR: ' + chk.length + ' atriði ('
        + chk.filter((c) => c.stjarna).length + ' stjörnumerkt)\n' : '');
}

async function skrifaMal(svar) {
  const leid = 'thjonustubeidni?select=id,notes&deleted_at=is.null&status=neq.lokad&tags=cs.'
    + encodeURIComponent(JSON.stringify([MERKI]));
  const fyrri = await sbRadir(leid, 'id,notes', 1);
  const s = svar.samantekt;
  const titill = 'Verkferlis-yfirlit: ' + s.nytt_fra_grunnlinu + ' nýtt af ' + s.maelt
    + ' mælingum' + (s.omaelt ? ' · ' + s.omaelt + ' ómæld' : '');
  let notes = malTexti(svar);

  const H = { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'content-type': 'application/json' };
  const mal = fyrri && fyrri[0];
  if (mal) {
    const gamalt = String(mal.notes || '');
    const i = gamalt.indexOf('\n══ ');
    if (i > -1) notes += gamalt.slice(i);
    const r = await fetch(`${P.SUPABASE_URL}/rest/v1/thjonustubeidni?id=eq.${mal.id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ title: titill, notes, updated_at: new Date().toISOString() }),
    });
    return { mal_id: mal.id, adgerd: r.ok ? 'uppfaert' : 'villa', http: r.status };
  }
  const r = await fetch(`${P.SUPABASE_URL}/rest/v1/thjonustubeidni`, {
    method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, H),
    body: JSON.stringify({
      title: titill, notes, source: 'claude', type: 'annad', status: 'nytt',
      priority: 'venjulegur', assigned_to: 'Agnar', created_by: 'combo-yfirlit',
      tags: ['yfirlit', MERKI],
    }),
  });
  const t = await r.text();
  const ny = t ? JSON.parse(t) : null;
  return { mal_id: ny && ny[0] && ny[0].id, adgerd: r.ok ? 'stofnad' : 'villa', http: r.status };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'GET only' });
  if (!P.dbReady()) return P.json(503, { error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY vantar' });

  const q = event.queryStringParameters || {};
  const valinn = String(q.flokkur || '').trim() || null;
  const radir = Math.max(0, Math.min(25, q.radir == null ? 5 : parseInt(q.radir, 10) || 0));
  const dagar = Math.max(1, Math.min(60, parseInt(q.dagar, 10) || 10));

  const t0 = Date.now();
  const [linur, dsk, sam, hir, verk] = await Promise.all([maela(valinn, radir), dagskra(dagar), samstilling(), hirslur(), verkefni(radir)]);

  const maelt = linur.filter((l) => l.merki === 'MAELT');
  const omaelt = linur.filter((l) => l.merki === 'OMAELT');
  const nytt = maelt.filter((l) => l.nytt > 0);
  const peningur = maelt.reduce((a, l) => a + (Number(l.peningur) || 0), 0);

  const svar = {
    ok: true,
    maelt_kl: nu().toISOString(),
    ms: Date.now() - t0,
    samantekt: {
      flokkar: linur.length,
      maelt: maelt.length,
      omaelt: omaelt.length,
      omaeldir_lyklar: omaelt.map((l) => l.lykill),
      nytt_fra_grunnlinu: nytt.length,
      nyir_lyklar: nytt.map((l) => l.lykill + ' +' + l.nytt),
      peningur_i_syndum_rodum: peningur,
      peningur_athugasemd: 'Summan er AÐEINS af þeim röðum sem komu með (sjá peningur_allt). '
                         + 'Hún er ekki heildartalan nema peningur_allt sé true.',
    },
    linur,
    hirslur: hir,
    verkefnalisti: verk,
    dagskra: dsk,
    samstilling: sam,
    reglur: [
      'Þak = staðan 07.11.2026. Rautt þýðir „þetta hækkaði", ekki „gamla skuldin stendur".',
      'OMAELT er ekki 0. Tómt svar er ekki staðreynd.',
      'Yfirtökureikningar (opnir við yfirtöku 07.05.2026) voru greiddir fyrri eiganda.',
      'Skoðunarmánuður = mánuður síðustu skoðunar. Hann er aldrei færður.',
      'Staður á dagskrá er ekki gleymdur.',
    ],
  };

  // Skrifa á borðið aðeins þegar beðið er um það — GET án ?skrifa=1 breytir engu.
  if (String(q.skrifa || '') === '1' && !valinn) {
    try { svar.bord = await skrifaMal(svar); }
    catch (e) { svar.bord = { adgerd: 'villa', skyring: String(e.message || e) }; }
  }

  return P.json(200, svar);
};
