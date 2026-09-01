/**
 * AI-INNGANGUR — ein hurð sem afhendir allt sem þarf, og tekur við skýrslu út
 *
 *   GET  /api/ai-context        → reglur · staða · vandamál · hvað hefur VIRKAÐ
 *   POST /api/ai-context        → skila skýrslu: hvað var gert, virkaði það
 *
 * Agnar 2026-08-31: „gerðu td ai accsess inngang með öllum reglum vísun í facts.
 * greiningarskráningu og auto trigger að þurfi uppfærslu á gögnum. ai kemur.
 * fær allt sem hann þarf að athuga. skilar report við útgang, uppfærir
 * viðgerðartæknina sem virkaði eða ný facts í skrána sem auto uppfærist. þá í
 * hvert skipti sem eitthvað er lagað og gefur jákvæða útkomu þá þroast
 * hegðunarmynstrið — algorithim í base kerfis self heal function."
 *
 * ── AF HVERJU ÞETTA GLEYMIST EKKI ─────────────────────────────────────────
 * Vandinn hefur aldrei verið að AI gleymi. Vandinn er að þekkingin bjó í
 * MINNI aðstoðarmanns sem hverfur milli samtala. Hér býr hún í KERFINU og er
 * afhent við inngang. Nýtt spjall, ný lota, annað verkfæri — sama hurð, sama
 * þekking. Enginn þarf að muna neitt, hvorki Agnar né vélin.
 *
 * ── ENGIN UPPSETNING ──────────────────────────────────────────────────────
 * Engin ný tafla, ekkert SQL að keyra, enginn nýr umhverfislykill. Skráningin
 * geymist í app_settings.settings.ai_log — sama blobbi og appið notar þegar
 * fyrir arsskodun_customers og page_editor. Lyklarnir eru lesnir úr
 * js/config.js sem er deploy-að með fallinu. Það VIRKAR frá fyrstu mínútu.
 *
 * ── ÞROSKINN ──────────────────────────────────────────────────────────────
 * Hver skýrsla inn ber `nidurstada: jakvaett | neikvaett`. Aðgerðir sem gefa
 * jákvæða útkomu safna stigum og eru afhentar EFST í `virkar` við næsta
 * inngang. Það sem klikkaði situr í `mistokst` með ástæðunni. Þannig færist
 * mynstrið sem virkar framar af sjálfu sér — engin þjálfun, bara talning.
 */

// import, ekki require: package.json er "type": "module" og fallið notar
// `export default` eins og hin ESM-föllin (tv-summary, postur-triage).
import fs from 'node:fs';
import path from 'node:path';

/* Lyklar úr js/config.js — engin umhverfisstilling. Þessi anon-lykill er
   hvort eð er opinber í útgefna bundlinu; hann bætir engu við sem ekki er
   þegar aðgengilegt úr vafranum. */
function config() {
  const p = path.join(process.cwd(), 'js', 'config.js');
  const src = fs.readFileSync(p, 'utf8');
  const url = (src.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
  const key = (src.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
  if (!url || !key) throw new Error('Fann ekki SUPABASE_URL/KEY í js/config.js');
  return { url, key };
}

async function sb(cfg, q, init) {
  const r = await fetch(`${cfg.url}/rest/v1/${q}`, {
    ...init,
    headers: {
      apikey: cfg.key, Authorization: `Bearer ${cfg.key}`,
      'content-type': 'application/json', ...(init && init.headers),
    },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

async function allar(cfg, q) {
  let out = [], from = 0;
  for (;;) {
    const d = await sb(cfg, `${q}&offset=${from}&limit=1000`);
    if (!Array.isArray(d) || !d.length) break;
    out = out.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return out;
}

/* ── REGLURNAR ────────────────────────────────────────────────────────────
   Harðar reglur sem hver AI þarf að vita ÁÐUR en hann snertir nokkuð. Þetta
   er ekki stílsmekkur — hvert atriði á sér atvik að baki. */
const REGLUR = [
  'Vistun í arsskodun_customers fer ALLTAF eitt fyrirtæki í einu: '
  + 'AppSettings.save({ arsskodun_customers: { [id]: patch } }). Aldrei allan blobinn — '
  + 'tvö tæki sem vista samtímis skrifa annars hvort yfir annað (race-lagfæring 2026-07-15).',

  'Aksturslisti fer um window.ArsAkstur.set(), ekki bein skrif — hann djúpsameinar '
  + 'og heldur talningum og perum í takt.',

  'Skoðunarmánuður kemur úr CanonStadur.monthOf(), aldrei úr nafna-streng.',

  'Keyrðu node tools/audit-all.cjs FYRIR hverja ýtingu. 17 próf. Rautt = ekki ýta.',

  'Deploy er git push til master. ALDREI node deploy.js — það eyðir öllum '
  + 'serverless-föllum þegjandi.',

  'Sérvirkni í þessu appi er ÞRÍSKIPT: inline !important slær allt; stílblað '
  + '!important slær venjulegan inline-stíl; venjulegur inline slær venjulegt stílblað. '
  + 'element.style.x = "..." dugar oft EKKI — notaðu setProperty(x, v, "important").',

  'Símastærðir Ársskoðunar eru CSS-breytur í css/ars-simi-vars.css. Breyttu BREYTUNNI, '
  + 'aldrei negla tölu í pappa.',

  'Villa má ALDREI vera þögguð. `if (error) break` sem skilar tómu fylki lætur síðu '
  + 'sýna núll og líta út fyrir að vera í lagi. Kastaðu.',

  'Staðfestu dálkanöfn áður en þú skrifar fyrirspurn. fyrirtaeki.stadur og '
  + 'fyrirtaeki.postnr eru EKKI til þótt þau hljómi rétt.',

  'Gamalt afrit lítur út eins og villa. Áður en þú lagar „villu" af skjámynd: '
  + 'staðfestu á núverandi kóða að hún sé enn til.',
];

/* ── STÝRISKRÁIN — hvaða sérfræðingur á hvaða tölu ──────────────────────────
 * Agnar 31.08: „þú veist ekkert hvað er í gangi í kerfinu. þessvegna gerist
 * aldrei neitt … það þarf einhvern veginn að gera einhverja stýriskrá sem
 * leiðbeinir ykkur … þú lest skill agent memory facts + activity report.
 * gerir viðgerð og skilar inn niðurstöðum og nýtt fix inn til viðeigandi
 * skills agents."
 *
 * ÁÐUR skrifaði hver viðgerð í EINA flata `ai_log`-blokk sem engin framtíðar-
 * lota las — af því ekkert í kerfinu benti á hana. Á sama tíma eru 12
 * sérfræðingar í .claude/agents/*.md, hver með sitt svið (sjá
 * docs/AGENTASKRA.md, sem er sama hugmynd sem "hvaða agent á þetta mál" en
 * vísar EKKI niðurstöðum til baka). Þetta er brúin.
 *
 * Þessi tafla er MÆLD eign, ekki ágiskun: aðeins mælar sem lýsing sérfræðings
 * í AGENTASKRA.md nefnir berum orðum eru settir hér. Restin lendir í
 * `oflokkad_maelar` í svid_yfirlit — SÝNILEGT autt svæði er réttara en
 * fölsuð eignarhald. (Sama regla og annars staðar í þessari skrá: óathugað
 * á að segjast óathugað.)
 */
const SVID_EIGENDUR = {
  'kunnaskra': {
    heiti: 'Viðskiptavina-líkanið — kennitölur, tengiliðir, grunnskrá',
    skra: '.claude/agents/kunnaskra.md',
    maelar: ['i_thjonustu_an_kennitolu', 'i_thjonustu_ogild_kennitala', 'tvitekin_kennitala',
      'i_thjonustu_an_kunnaskrar', 'skjol_an_kunnaskrar', 'opin_an_kunnaskrar',
      'i_thjonustu_an_heimilisfangs', 'i_thjonustu_an_postnumers',
      'i_thjonustu_an_tengilids', 'i_thjonustu_an_netfangs', 'i_thjonustu_en_merkt_ovirkt'],
  },
  'sala-reikningar': {
    heiti: 'Sala/POS, reikningar, Payday/dkPlus, afslættir',
    skra: '.claude/agents/sala-reikningar.md',
    maelar: ['skodad_en_orukkad', 'rukkad_undir_helmingi_skradra', 'rukkad_yfir_tvofalt_skrad',
      'solur_i_ar_an_lina', 'solur_i_ar_an_upphaedar', 'solur_fastar_i_drogum',
      'kreditreikningar_i_ar', 'tvitekin_solunumer', 'reikningsskjol_an_numers',
      'tvitekin_reikningsnumer', 'thar_af_fyllanleg_ur_reikningi',
      'veidin_rukkud_an_skyrslu', 'veidin_bundle_por', 'veidin_bundle_reikn_vantar',
      'veidin_bundle_skyrsla_vantar'],
  },
  'elon-musk': {
    heiti: 'Ársskoðun — perur, skoðunarmánuður, skýrslu-þekja',
    skra: '.claude/agents/elon-musk.md',
    maelar: ['i_thjonustu_an_taekja', 'thar_af_med_drive_reikning', 'komid_a_tima_enginn_akstur', 'i_thjonustu_an_skodunarmanadar',
      'i_thjonustu_ekki_skodad_i_ar', 'i_thjonustu_ekki_skodad_2_ar',
      'veidin_stadir_med_2026_skyrslu', 'veidin_stadir_med_2025_skyrslu',
      'veidin_engin_skyrsla_25_26', 'veidin_amber_felog', 'veidin_gleymd_felog',
      'veidin_skyrslur_2026', 'veidin_skyrslur_2026_reviewed'],
  },
  'bord-flettur': {
    heiti: 'Verkborð, þjónustuborð, verkbeiðnir, bílstjóri',
    skra: '.claude/agents/bord-flettur.md',
    maelar: ['opin_thjonustumal', 'opin_eldri_en_6_manada', 'opin_an_svarad_at',
      'verkbeidnir_ekki_sottar', 'verkbeidnir_ekki_sottar_30_daga', 'verklidir_an_taekis'],
  },
  'prentun': {
    heiti: 'QR-merki, raðnúmer, miðaprentun',
    skra: '.claude/agents/prentun.md',
    maelar: ['taeki_an_radnumers', 'tvitekid_radnumer'],
  },
};

/* ── STAÐAN ──────────────────────────────────────────────────────────────── */
const heild = e => Object.values(e || {}).reduce((s, v) => s + (+v || 0), 0);
const GJALD = /byrjunargjald|akstur|ferðakostn|sendingar|umsýslu|útkall/i;

async function stada(cfg) {
  const AR = new Date().getFullYear();
  const man = new Date().getMonth() + 1;
  const NU = Date.now();
  const D30 = 30 * 864e5;
  const idag = new Date().toISOString().slice(0, 10);

  /* Hver tafla er sótt EINU SINNI og margir mælar leiddir af sama gagnasafni.
     Þess vegna kosta 50 mælar ekki 50 skannanir. `allar` kastar villu ef eitthvað
     mistekst — hún má ALDREI skila tómu: tómt safn lítur út eins og heilbrigt
     kerfi (mælt 31.08: Staðan sýndi fjögur núll og virtist í lagi, af því að
     hjálparfallið gerði `break` í stað `throw`). */
  const co   = await allar(cfg, 'fyrirtaeki?select=id,nafn,kennitala,simi,farsimi,netfang,heimilisfang,postnumer,er_i_thjonustu,customer_base_id,status&deleted_at=is.null&order=id');
  const sol  = await allar(cfg, 'solur?select=id,num,customer_id,customer_base_id,created_at,linur,is_credit,status,samtals&order=created_at.desc');
  const docs = await allar(cfg, 'customer_documents?select=id,customer_base_id,fyrirtaeki_id,doc_type,year,link_ok,invoice_number,is_duplicate,drive_file_id&order=id');
  const ut   = await allar(cfg, 'uttaeki?select=id,serial,type,location,last_insp,next_insp,fyrirtaeki_id,customer_base_id&order=id');
  const tb   = await allar(cfg, 'thjonustubeidni?select=id,status,created_at,svarad_at,customer_base_id,important&deleted_at=is.null&order=id');
  const vb   = await allar(cfg, 'verkbeidnir?select=id,status,created_at&order=id');
  const vl   = await allar(cfg, 'verklidur?select=id,uttaeki_id&order=id');
  const sam  = await allar(cfg, 'thjonustusamningar?select=id,company_id,status,next_due&order=id');
  const vlisti = await allar(cfg, 'verkefnalisti?select=id,status&order=id');

  const [as] = await sb(cfg, 'app_settings?select=settings&id=eq.1&limit=1');
  const settings = (as && as.settings) || {};
  const ars = settings.arsskodun_customers || {};

  const tomt = v => v == null || String(v).trim() === '';
  const tel  = (arr, f) => arr.reduce((n, x) => n + (f(x) ? 1 : 0), 0);
  /* Tvítekningar: fjöldi RAÐA sem lenda í hópi stærri en einum — ekki fjöldi
     hópa. Tvö fyrirtæki með sömu kennitölu eru tvö vandamál, ekki eitt. */
  const tvitekid = (arr, lykill) => {
    const m = new Map();
    arr.forEach(x => { const k = lykill(x); if (tomt(k)) return; m.set(k, (m.get(k) || 0) + 1); });
    let n = 0; m.forEach(v => { if (v > 1) n += v; });
    return n;
  };
  const ktGild = k => /^\d{10}$/.test(String(k || '').replace(/\D/g, ''));
  const linurAf = s => {
    let L = s.linur;
    if (typeof L === 'string') { try { L = JSON.parse(L); } catch (_) { L = []; } }
    return Array.isArray(L) ? L : [];
  };

  const iThj = co.filter(c => c.er_i_thjonustu);

  /* ── Sölur: hvað var rukkað í ár, og hver var síðasti reikningur ───────── */
  const medSolu = new Set(), rukkad = new Map(), sidasta = new Map();
  const solIAr = [];
  sol.forEach(s => {
    const k = String(s.customer_id);
    if (String(s.created_at).slice(0, 4) === String(AR)) solIAr.push(s);
    if (s.is_credit) return;
    if (!sidasta.has(k)) sidasta.set(k, s);
    if (String(s.created_at).slice(0, 4) !== String(AR)) return;
    medSolu.add(k);
    rukkad.set(k, (rukkad.get(k) || 0) + linurAf(s).filter(l => !GJALD.test(l.desc || ''))
      .reduce((n, l) => n + (+l.qty || 0), 0));
  });

  /* ── Skjöl ────────────────────────────────────────────────────────────── */
  const medReikn = new Set(docs.filter(d => d.doc_type === 'reikningur' && +d.year === AR && d.customer_base_id != null)
    .map(d => String(d.customer_base_id)));
  const medSkyrslu = new Set(docs.filter(d => d.doc_type === 'uttektarskyrsla' && +d.year === AR && d.customer_base_id != null)
    .map(d => String(d.customer_base_id)));
  const reikningar = docs.filter(d => d.doc_type === 'reikningur');

  /* Reikningsskjöl sem eiga LESANLEGT PDF og hanga á fyrirtækinu SJÁLFU.
     Mælt 01.09.2026 við að fylla Húnar ehf (id 1734): magnið var hvergi í
     gagnagrunninum — engin sala, engin uttaeki-röð, aðeins upphæðin 128.621 —
     en PDF-ið á Drive bar línurnar (117 Léttvatn 6L ×4 selt, 133 Yfirferð
     Léttvatn 6-9L ×2). `thar_af_fyllanleg_ur_reikningi` sá það EKKI, því sá
     mælir krefst `solur`-raðar með línum.

     Aðeins fyrirtaeki_id er notað, ekki customer_base_id: systurfélög deila
     kúnnaskrárröð, og reikningur systurfélags segir ekkert um þennan stað.
     Það er sama join-lekan og hefur bitið áður. */
  const drivePerFid = new Map();
  reikningar.forEach(d => {
    if (!d.drive_file_id || d.fyrirtaeki_id == null) return;
    const k = String(d.fyrirtaeki_id);
    drivePerFid.set(k, (drivePerFid.get(k) || 0) + 1);
  });

  /* ── Fjórir listarnir sem Staðan sýnir ────────────────────────────────── */
  const H = { tom: [], enginAkstur: [], orukkad: [], skekkja: [], fyllanleg: [] };
  let anManadar = 0, ekkiSkodadIAr = 0, ekkiSkodad2Ar = 0, ofrukkad = 0;

  co.forEach(c => {
    const a = ars[String(c.id)] || null;
    const taeki = a ? heild(a.equipment) : 0;
    const g = { id: c.id, nafn: c.nafn, kt: c.kennitala };

    if (c.er_i_thjonustu && taeki === 0) {
      H.tom.push(g);
      // Auto-trigger: skráin er tóm EN síðasti reikningur segir magn.
      const s = sidasta.get(String(c.id));
      if (s) {
        const q = linurAf(s).filter(l => !GJALD.test(l.desc || ''))
          .reduce((n, l) => n + (+l.qty || 0), 0);
        if (q > 0) H.fyllanleg.push({ ...g, magn_af_reikningi: q, reikningur: String(s.created_at).slice(0, 10) });
      }
    }
    if (!a || taeki === 0) return;

    const m = +a.inspect_month || 0;
    const sidast = +a.last_year_inspected || 0;
    const skodad = sidast === AR;
    if (c.er_i_thjonustu && !m) anManadar++;
    if (c.er_i_thjonustu && !skodad) ekkiSkodadIAr++;
    if (c.er_i_thjonustu && sidast > 0 && sidast <= AR - 2) ekkiSkodad2Ar++;

    if (m > 0 && m <= man && !skodad && !(+a.akstur)) H.enginAkstur.push({ ...g, manudur: m });
    if (!skodad) return;

    const cb = c.customer_base_id != null ? String(c.customer_base_id) : null;
    if (!medSolu.has(String(c.id)) && !(cb && medReikn.has(cb))) H.orukkad.push({ ...g, taeki });
    const r = rukkad.get(String(c.id)) || 0;
    if (r > 0 && r / taeki < 0.5) H.skekkja.push({ ...g, skrad: taeki, rukkad: r });
    if (r > 0 && r / taeki > 2) ofrukkad++;
  });

  const medSamning = new Set(sam.filter(x => x.status === 'virkur' && x.company_id != null)
    .map(x => String(x.company_id)));

  /* ── MÆLARNIR ─────────────────────────────────────────────────────────────
     Sérhver tala hér er VANDAMÁL: hærra er verra. Sá samningur er forsenda þess
     að viðvörunin viti hvað sé „röng átt". Bætist einhvern tíma við mælikvarði
     þar sem hærra er gott þarf hann skýra merkingu — ekki þögla undantekningu.

     Stöðugildin hér að neðan eru MÆLD úr töflunum 31.08.2026, ekki ágiskuð:
       thjonustubeidni.status  nytt · lokad · klarad · i_vinnslu
       verkbeidnir.status      collected · eytt · ready · received
       verkefnalisti.status    beidni · klarad · i_vinnu · i_yfirferd · sleppt
       thjonustusamningar      virkur · imported_from_drive · template · tilbod
       solur.status            final · drog · void
       fyrirtaeki.status       virkur · óvirkur
       customer_documents      uttektarskyrsla · reikningur · samningur · brunakerfi */
  const tolur = {
    /* Skráin sjálf */
    i_thjonustu_an_taekja:            H.tom.length,
    thar_af_fyllanleg_ur_reikningi:   H.fyllanleg.length,
    thar_af_med_drive_reikning:       H.tom.filter(g => drivePerFid.has(String(g.id))).length,
    i_thjonustu_an_kennitolu:         tel(iThj, c => tomt(c.kennitala)),
    i_thjonustu_ogild_kennitala:      tel(iThj, c => !tomt(c.kennitala) && !ktGild(c.kennitala)),
    tvitekin_kennitala:               tvitekid(co, c => String(c.kennitala || '').replace(/\D/g, '')),
    i_thjonustu_an_heimilisfangs:     tel(iThj, c => tomt(c.heimilisfang)),
    i_thjonustu_an_postnumers:        tel(iThj, c => tomt(c.postnumer)),
    i_thjonustu_an_tengilids:         tel(iThj, c => tomt(c.simi) && tomt(c.farsimi) && tomt(c.netfang)),
    i_thjonustu_an_netfangs:          tel(iThj, c => tomt(c.netfang)),
    i_thjonustu_an_kunnaskrar:        tel(iThj, c => c.customer_base_id == null),
    i_thjonustu_en_merkt_ovirkt:      tel(iThj, c => c.status === '\u00f3virkur'),

    /* Ársskoðun */
    komid_a_tima_enginn_akstur:       H.enginAkstur.length,
    i_thjonustu_an_skodunarmanadar:   anManadar,
    i_thjonustu_ekki_skodad_i_ar:     ekkiSkodadIAr,
    i_thjonustu_ekki_skodad_2_ar:     ekkiSkodad2Ar,

    /* Sala og rukkun */
    skodad_en_orukkad:                H.orukkad.length,
    rukkad_undir_helmingi_skradra:    H.skekkja.length,
    rukkad_yfir_tvofalt_skrad:        ofrukkad,
    solur_i_ar_an_vidskiptavinar:     tel(solIAr, s => s.customer_id == null && s.customer_base_id == null),
    solur_i_ar_an_lina:               tel(solIAr, s => !s.is_credit && linurAf(s).length === 0),
    solur_i_ar_an_upphaedar:          tel(solIAr, s => !s.is_credit && s.status === 'final' && !(+s.samtals)),
    solur_fastar_i_drogum:            tel(sol, s => s.status === 'drog'),
    kreditreikningar_i_ar:            tel(solIAr, s => !!s.is_credit),
    tvitekin_solunumer:               tvitekid(sol.filter(s => s.status !== 'void'), s => s.num),

    /* Skjöl og Drive */
    dauder_drive_tenglar:             tel(docs, d => d.link_ok === false),
    oathugadir_drive_tenglar:         tel(docs, d => d.link_ok === null),
    skjol_an_kunnaskrar:              tel(docs, d => d.customer_base_id == null && d.fyrirtaeki_id == null),
    skjol_merkt_tvitekin:             tel(docs, d => d.is_duplicate === true),
    reikningsskjol_an_numers:         tel(reikningar, d => tomt(d.invoice_number)),
    tvitekin_reikningsnumer:          tvitekid(reikningar, d => d.invoice_number),

    /* Tæki */
    taeki_an_eiganda:                 tel(ut, x => x.fyrirtaeki_id == null && x.customer_base_id == null),
    taeki_an_radnumers:               tel(ut, x => tomt(x.serial)),
    tvitekid_radnumer:                tvitekid(ut, x => x.serial),
    taeki_an_tegundar:                tel(ut, x => tomt(x.type)),
    taeki_an_stadsetningar:           tel(ut, x => tomt(x.location)),
    taeki_an_sidustu_skodunar:        tel(ut, x => tomt(x.last_insp)),
    taeki_an_naestu_skodunar:         tel(ut, x => tomt(x.next_insp)),
    taeki_med_utrunna_skodun:         tel(ut, x => !tomt(x.next_insp) && String(x.next_insp).slice(0, 10) < idag),

    /* Þjónustuborð */
    opin_thjonustumal:                tel(tb, x => x.status === 'nytt'),
    opin_eldri_en_6_manada:           tel(tb, x => x.status === 'nytt' && (NU - new Date(x.created_at)) / D30 >= 6),
    opin_an_svarad_at:                tel(tb, x => x.status === 'nytt' && tomt(x.svarad_at)),
    opin_an_kunnaskrar:               tel(tb, x => x.status === 'nytt' && x.customer_base_id == null),

    /* Verk */
    verkbeidnir_ekki_sottar:          tel(vb, x => x.status === 'ready'),
    verkbeidnir_ekki_sottar_30_daga:  tel(vb, x => x.status === 'ready' && (NU - new Date(x.created_at)) / D30 >= 1),
    verklidir_an_taekis:              tel(vl, x => x.uttaeki_id == null),

    /* Samningar */
    samningar_komnir_a_tima:          tel(sam, x => x.status === 'virkur' && !tomt(x.next_due) && String(x.next_due).slice(0, 10) < idag),
    i_thjonustu_an_samnings:          tel(iThj, c => !medSamning.has(String(c.id))),

    /* Verkefnalisti */
    verkefni_i_beidni:                tel(vlisti, x => x.status === 'beidni'),
    verkefni_i_vinnu:                 tel(vlisti, x => x.status === 'i_vinnu'),
    verkefni_i_yfirferd:              tel(vlisti, x => x.status === 'i_yfirferd'),
  };

  /* ── VEIÐIN Á SÍNAR TÖLUR ────────────────────────────────────────────────
     Brunahólf reiknar þegar skýrslu-/reikninga-þekjuna (`/api/veidin`, með
     grunnlínu frá 2026-07-30). Þær tölur eru EKKI reiknaðar aftur hér.

     Ástæðan er mæld, ekki huglæg: 31.08.2026 reiknaði þessi skrá sjálfstætt
     „skýrsla í ár án reiknings = 46" á meðan Veiðin sagði 149, og „skjöl án
     árs = 213" á meðan Veiðin sagði 1. Tvær skilgreiningar á sömu tölu er
     einmitt ástæðan fyrir því að Agnar fær ólík svör í hvert skipti sem hann
     spyr. Ein tala á að eiga einn eiganda.

     Mælaborðið leggur til það sem Veiðina vantar: SÖGUNA. Veiðin á tvo punkta
     — frosna grunnlínu í kóða og daginn í dag — og enga skráningu á því hvað
     olli hreyfingunni.

     Klikki kallið eru tölurnar FJARVERANDI, ekki núll. Núll lítur út eins og
     leyst vandamál. */
  let veidin_sotti = false;
  try {
    const r = await fetch('https://brunaholf.netlify.app/api/veidin', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const v = await r.json();
      if (v && v.nuna) {
        Object.entries(v.nuna).forEach(([k, n]) => {
          if (typeof n === 'number') tolur['veidin_' + k] = n;
        });
        veidin_sotti = true;
      }
    }
  } catch (_) { /* fjarverandi er rétt svar; núll væri ósatt */ }

  return {
    tolur,
    veidin_sotti,
    listar: H,
    log: settings.ai_log || { faerslur: [], virkar: {}, mistokst: {} },
  };
}

/* ── MÆLINGABÓKIN ─────────────────────────────────────────────────────────
   Agnar 31.08: „svona tölur fæ ég í hvert einasta skipti sem ég minnist á
   þetta. þetta á ekki að geta gerst ítrekað … það þarf að vera listi með
   öllum svona tölum mér aðgengilegur. skráð baseline í dag, línurit, og í
   hvert skipti sem hún hreyfist skráist það í bók. valdurinn af breytingunni."

   Talan var alltaf reiknuð upp á nýtt og hent. Því var hver samtal byrjun á
   núlli. Hér er hún GEYMD: eitt snapshot á dag, mismunur milli daga, og þær
   aðgerðir úr ai_log sem féllu á milli — það er valdurinn.

   ALLAR þessar tölur eru VANDAMÁL: lægra er betra. Þess vegna er hækkun
   „verri" og fær viðvörun. Bæta þarf `betra_er_haerra` við ef einhvern tíma
   kemur mælikvarði þar sem hærra er gott. */
const EITT_SNAPSHOT_A_DAG = true;

function skraSnapshot(log, tolur) {
  const nu = new Date().toISOString();
  const dagur = nu.slice(0, 10);
  log.maelingar = log.maelingar || [];
  const sidasta = log.maelingar[log.maelingar.length - 1];
  // Eitt á dag: annars myndi hver einasti inngangur búa til punkt og línuritið
  // yrði ólæsilegt eftir einn virkan dag.
  if (EITT_SNAPSHOT_A_DAG && sidasta && String(sidasta.dags).slice(0, 10) === dagur) {
    sidasta.tolur = tolur;         // uppfæra daginn í dag
    sidasta.dags = nu;
    return false;
  }
  log.maelingar.push({ dags: nu, tolur });
  log.maelingar = log.maelingar.slice(-400);
  return true;
}

/* ── STEFNA HVERS MÆLIS ────────────────────────────────────────────────────
 * Sjálfgefið er `laegra_betra` — langflestir mælar hér eru vandamálateljarar.
 * Þessi listi er UNDANTEKNINGARNAR, og hann er dómur en ekki mæling: Agnar má
 * leiðrétta hann. Verði mælir rangt flokkaður blikkar viðvörun á framförum
 * (eða þegir yfir afturför), og hvort tveggja eyðileggur traustið á kerfinu.
 *
 *   haerra_betra  fjölgun er framför  (þekja, kláruð pör, netföng)
 *   hlutlaus      stofnstærð eða eðlileg umferð — aldrei viðvörun
 */
const STEFNA = {
  // Þekja: fleiri skýrslur, fleiri pör, fleiri netföng = betra.
  veidin_stadir_med_2026_skyrslu: 'haerra_betra',
  veidin_stadir_med_2025_skyrslu: 'haerra_betra',
  veidin_skyrslur_2026: 'haerra_betra',
  veidin_skyrslur_2026_reviewed: 'haerra_betra',
  veidin_bundle_por: 'haerra_betra',
  veidin_felog_med_netfang: 'haerra_betra',
  veidin_stadir_med_samning: 'haerra_betra',
  veidin_hud_buid_2026: 'haerra_betra',

  // Stofnstærðir: segja hvað er til, ekki hvað er að.
  veidin_stadir_i_thjonustu: 'hlutlaus',
  veidin_felog_i_thjonustu: 'hlutlaus',
  veidin_drive_2026_radir: 'hlutlaus',
  veidin_drive_2026_distinct: 'hlutlaus',

  // Undirmengi af vandamáli sem er GOTT að sé hátt: því fleiri sem má fylla
  // úr síðasta reikningi, því meira af 260-vandanum er leysanlegt strax.
  thar_af_fyllanleg_ur_reikningi: 'hlutlaus',
  // Sama eðli: hátt þýðir „meira er leysanlegt strax", ekki „meira er að".
  thar_af_med_drive_reikning: 'hlutlaus',

  // Kreditreikningar eru eðlilegur hluti reksturs, ekki bilun í sjálfu sér.
  kreditreikningar_i_ar: 'hlutlaus',

  // Verkefnalistinn er vinnuflæði: að verk séu í vinnu er ekki vandamál.
  verkefni_i_vinnu: 'hlutlaus',
  verkefni_i_yfirferd: 'hlutlaus',
};

/* Flutt út svo rökfræðin sé prófanleg án gagnagrunns — Netlify notar aðeins
   default-útflutninginn, svo þetta breytir engu um keyrsluna.
   Próf: tools/audit-stefna.cjs */
export function saga(log) {
  const m = log.maelingar || [];
  if (!m.length) return { punktar: 0, lyklar: [], hreyfing: [], vidvorun: [] };
  const lyklar = Object.keys(m[m.length - 1].tolur || {});
  const nyjast = m[m.length - 1];
  const fyrra = m.length > 1 ? m[m.length - 2] : null;

  const hreyfing = lyklar.map(k => {
    const nu = +(nyjast.tolur || {})[k] || 0;
    const adur = fyrra ? (+(fyrra.tolur || {})[k] || 0) : null;
    const d = adur === null ? null : nu - adur;
    const stefna = STEFNA[k] || 'laegra_betra';
    return {
      maelikvardi: k, nuna: nu, sidast: adur, breyting: d, stefna,
      /* Áttin fer eftir stefnu mælisins, ekki eftir formerki einu saman.
         Upphaflega var þetta skrifað „öll þessi tala er vandamál: hækkun =
         verra". Það var RANGT um 8 mæla úr Veiðinni: fjölgi stöðum með
         2026-skýrslu úr 298 í 305 hefði viðvörunin öskrað þegar hlutir
         löguðust — og viðvörun sem hrópar á framfarir er verri en engin. */
      att: d === null ? 'grunnlína'
        : stefna === 'hlutlaus' ? 'hlutlaus'
        : d === 0 ? 'óbreytt'
        : (stefna === 'haerra_betra' ? (d > 0 ? 'betri' : 'VERRI')
                                     : (d > 0 ? 'VERRI' : 'betri')),
      ferill: m.slice(-30).map(x => +(x.tolur || {})[k] || 0),
      // Dagsetningarnar fylgja með svo línuritið geti sett frystingarmerkin
      // á réttan stað — ekki bara „30 punktar" heldur 30 DAGSETTIR punktar.
      dagar: m.slice(-30).map(x => x.dags),
    };
  });

  // Valdurinn: aðgerðir sem voru skráðar Á MILLI síðustu tveggja punkta.
  const fra = fyrra ? fyrra.dags : null;
  const valdur = (log.faerslur || []).filter(f => !fra || f.dags > fra)
    .map(f => ({ dags: f.dags, adgerd: f.adgerd, verk: f.verk, nidurstada: f.nidurstada, hver: f.hver }));

  return {
    punktar: m.length,
    grunnlina: { dags: m[0].dags, tolur: m[0].tolur },
    nyjast: { dags: nyjast.dags, tolur: nyjast.tolur },
    hreyfing,
    vidvorun: hreyfing.filter(h => h.att === 'VERRI'),
    valdur_sidustu_breytingar: valdur,
  };
}

/* ── HURÐIN ──────────────────────────────────────────────────────────────── */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  let cfg;
  try { cfg = config(); }
  catch (e) { return json(500, { villa: String(e.message) }); }

  /* ── ÚT: skýrsla frá AI sem er að fara ──────────────────────────────── */
  if (req.method === 'POST') {
    let b;
    try { b = await req.json(); } catch (_) { return json(400, { villa: 'BAD_JSON' }); }
    const verk = String(b.verk || '').trim();
    const adgerd = String(b.adgerd || '').trim();
    const nidurstada = b.nidurstada === 'jakvaett' ? 'jakvaett' : 'neikvaett';
    if (!verk || !adgerd) return json(400, { villa: 'verk og adgerd eru skylda' });

    /* SVIÐIÐ: hvaða sérfræðingur á þetta mál. `oflokkad` er gilt svar — betra
       en að giska rangt — en það er sagt hreint út í `svid_advorun` svo
       ábyrgðin á að flokka lendi hjá einhverjum, ekki hverfi þegjandi. */
    const svidInn = String(b.svid || '').trim();
    const svid = SVID_EIGENDUR[svidInn] ? svidInn : 'oflokkad';
    const svidAdvorun = !svidInn
      ? 'Ekkert `svid` gefið upp — færslan lendir í "oflokkad" og enginn sérfræðingur sér hana. Gild svið: ' + Object.keys(SVID_EIGENDUR).join(', ') + '.'
      : (svid === 'oflokkad'
          ? `"${svidInn}" er ekki þekkt svið — sjá gild svið: ` + Object.keys(SVID_EIGENDUR).join(', ') + '.'
          : undefined);

    const [as] = await sb(cfg, 'app_settings?select=settings&id=eq.1&limit=1');
    const settings = (as && as.settings) || {};
    const log = settings.ai_log || { faerslur: [], virkar: {}, mistokst: {} };

    log.faerslur = (log.faerslur || []).concat([{
      dags: new Date().toISOString(),
      verk, adgerd, nidurstada, svid,
      facts: Array.isArray(b.facts) ? b.facts.slice(0, 20) : [],
      nota: String(b.nota || '').slice(0, 600),
      hver: String(b.hver || 'ókunnur').slice(0, 60),
    }]).slice(-400);   // haldið stuttu — blobbið er lesið við hverja ræsingu appsins

    // ÞROSKINN: það sem virkar safnar stigum og fer fremst næst.
    const t = nidurstada === 'jakvaett' ? 'virkar' : 'mistokst';
    log[t] = log[t] || {};
    log[t][adgerd] = (log[t][adgerd] || 0) + 1;

    /* ── FRYSTINGIN: fyrir og eftir hverja viðgerð, dagsett ──────────────
       Agnar 31.08: „línurit sem frystir fyrir og eftir claude viðgerð. með
       dagsetningu / sama villan á ekki geta gerst nema einu sinni."

       FYRIR  = síðasti mælipunktur eins og hann stóð áður en snert var á.
       EFTIR  = tölurnar reiknaðar UPP Á NÝTT hér og nú, eftir viðgerðina.
       Hvorugt er skrifað af þeim sem gerði við — bæði eru mæld.

       VÖRNIN er skilyrðið. Viðgerð án varnar getur endurtekið sig, og þá
       segir bókin það hreint út: `varin: false`. Vörnin á að vera nafn á
       verði í tools/audit-all.cjs — sá vörður fellur rautt ef villan
       reynir að koma aftur. Það er það sem gerir „bara einu sinni" satt;
       texti um að hafa lagað eitthvað gerir það ekki. */
    let frysting = null;
    if (b.vidgerd) {
      const fyrri = (log.maelingar || [])[(log.maelingar || []).length - 1];
      let eftir = null;
      try { eftir = (await stada(cfg)).tolur; } catch (_) {}
      const vorn = String(b.vorn || '').trim();
      frysting = {
        dags: new Date().toISOString(),
        verk, adgerd, svid, hver: String(b.hver || 'ókunnur').slice(0, 60),
        fyrir: fyrri ? fyrri.tolur : null,
        fyrir_dags: fyrri ? fyrri.dags : null,
        eftir,
        vorn: vorn || null,
        varin: !!vorn,
        nota: String(b.nota || '').slice(0, 600),
      };
      log.vidgerdir = (log.vidgerdir || []).concat([frysting]).slice(-200);
      // Viðgerðin er sjálf mælipunktur — annars sæist stökkið hvergi á línuritinu.
      if (eftir) skraSnapshot(log, eftir);
    }

    await sb(cfg, 'app_settings?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify({ settings: { ...settings, ai_log: log } }),
    });

    return json(200, {
      skrad: true,
      adgerd, nidurstada,
      stig_adgerdar: log[t][adgerd],
      faerslur_alls: log.faerslur.length,
      frysting,
      svid,
      svid_advorun: svidAdvorun,
      // Sagt hreint út þegar viðgerð var skráð án varnar.
      advorun: (b.vidgerd && !(b.vorn || '').trim())
        ? 'Viðgerð skráð ÁN varnar — hún getur endurtekið sig. Bættu verði í tools/audit-all.cjs og sendu nafn hans í `vorn`.'
        : undefined,
    });
  }

  /* ── INN: allt sem AI þarf ───────────────────────────────────────────── */
  try {
    /* TVEIR HRAÐAR — og það er við hefði.
       Full mæling les ~35 þús. raðir úr níu töflum og sækir Veiðina (~4 sek).
       Væri hún keyrð við hverja opnun síðunnar yrði mælaborðið hægt OG bókin
       fyllt af punktum sem enginn bað um.

         GET /api/ai-context           → bókin eins og hún stendur. Ein fyrirspurn.
         GET /api/ai-context?maela=1   → mælir upp á nýtt og skráir punkt.

       Mæling er þannig AÐGERÐ, ekki aukaverkun af því að einhver opnaði síðu. */
    const maela = new URL(req.url).searchParams.get('maela') === '1';

    let s, log, nyrPunktur = false;
    if (maela) {
      s = await stada(cfg);
      log = s.log;
      /* Skrá mælinguna ÁÐUR en hún er afhent — það er það sem gerir bókina til.
         Mæling má þó aldrei fella innganginn, því try/catch. */
      try {
        nyrPunktur = skraSnapshot(log, s.tolur);
        const [as2] = await sb(cfg, 'app_settings?select=settings&id=eq.1&limit=1');
        const st2 = (as2 && as2.settings) || {};
        await sb(cfg, 'app_settings?id=eq.1', {
          method: 'PATCH', body: JSON.stringify({ settings: { ...st2, ai_log: log } }),
        });
      } catch (_) {}
    } else {
      const [as1] = await sb(cfg, 'app_settings?select=settings&id=eq.1&limit=1');
      const st1 = (as1 && as1.settings) || {};
      log = st1.ai_log || { faerslur: [], virkar: {}, mistokst: {} };
      const sidasti = (log.maelingar || [])[(log.maelingar || []).length - 1];
      /* Aldrei uppdiktuð núll: hafi ekkert verið mælt eru tölurnar TÓMAR og
         `maelt` er null. Tómt er satt; núll væri lýgi sem lítur út eins og
         leyst vandamál. */
      s = { tolur: sidasti ? sidasti.tolur : {}, listar: null, log, maelt: sidasti ? sidasti.dags : null };
    }
    const S = saga(log);
    const rada = o => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([adgerd, stig]) => ({ adgerd, stig }));

    /* ── SVIÐSYFIRLIT — stýriskráin gerð sýnileg ─────────────────────────
       Fyrir hvert svið: heiti + heimaskrá sérfræðingsins, grunnlína hans
       eigin mæla (kaflaheiti + tala — ekki allur bókin), og síðustu
       færslur/viðgerðir sem voru ROUTAÐAR þangað. `tools/svid-skyrsla.cjs`
       les þetta og skrifar það inn í viðkomandi .claude/agents/*.md skrá —
       það er skrefið sem lokar hringnum sem vantaði: héðan í frá les
       framtíðarlota sem opnar t.d. sala-reikningar STRAX hvað gerðist í
       hennar sviði, í stað þess að þessi bók sé eina heimildin.
       Mælar sem enginn sérfræðingur á enn eru í `oflokkad_maelar` — sýnilegt
       gat, ekki falið eitt. */
    const eignadirMaelar = new Set();
    Object.values(SVID_EIGENDUR).forEach(v => v.maelar.forEach(k => eignadirMaelar.add(k)));
    const svid_yfirlit = Object.entries(SVID_EIGENDUR).map(([key, def]) => ({
      svid: key,
      heiti: def.heiti,
      skra: def.skra,
      grunnlina: Object.fromEntries(def.maelar.map(k => [k, s.tolur[k] ?? null])),
      sidustu_faerslur: (log.faerslur || []).filter(f => f.svid === key).slice(-5).reverse()
        .map(f => ({ dags: f.dags, adgerd: f.adgerd, nidurstada: f.nidurstada })),
      sidustu_vidgerdir: (log.vidgerdir || []).filter(v => v.svid === key).slice(-5).reverse()
        .map(v => ({ dags: v.dags, adgerd: v.adgerd, varin: v.varin, vorn: v.vorn })),
    }));
    const oflokkad_maelar = Object.keys(s.tolur || {}).filter(k => !eignadirMaelar.has(k));
    const oflokkadar_faerslur = (log.faerslur || []).filter(f => !f.svid || f.svid === 'oflokkad').length;

    return json(200, {
      kerfi: {
        nafn: 'Slökkvitæki ehf — innra kerfi',
        sloð: 'https://slokkvitaeki.netlify.app',
        vidmot: 'íslenska',
        eigandi: 'Agnar Sigurðsson',
        gagnagrunnur: 'Supabase (osfdzskyvisifcwyjkuk)',
      },
      reglur: REGLUR,
      heimildir: {
        oryggisnet: 'docs/ORYGGISNET.md — vardar leidir; keyrdu tools/audit-all.cjs fyrir ýtingu',
        stadreyndir: 'docs/STADREYNDIR.md — kúnna-líkanið og vinnureglur',
        honnun: 'docs/DESIGN.md + docs/LITASKRA.md — útlitsreglur og mæld grunnlína',
        serfraedingar: '.claude/agents/*.md — joker (útlit), elon-musk (Ársskoðun), bord-flettur (borð)',
      },
      stada: s.tolur,
      maelt: maela ? new Date().toISOString() : (s.maelt || null),
      // Segir hreint út hvort þetta var mælt núna eða lesið úr bókinni.
      ferskt: maela,
      hvernig_maela_upp_a_nytt: 'GET /api/ai-context?maela=1',
      // BÓKIN: grunnlína, ferill, hreyfing frá síðasta punkti og valdurinn.
      saga: S,
      vidgerdir: (log.vidgerdir || []).slice(-20).reverse(),
      ovardar_vidgerdir: (log.vidgerdir || []).filter(v => !v.varin).map(v => v.adgerd),
      // STÝRISKRÁIN: hvaða sérfræðingur á hvaða tölu, og hvað gerðist á hans sviði.
      svid_yfirlit,
      oflokkad_maelar,
      oflokkadar_faerslur,
      vidvorun: S.vidvorun.length
        ? S.vidvorun.map(v => `${v.maelikvardi}: ${v.sidast} → ${v.nuna} (+${v.breyting}) — FÓR Í RANGA ÁTT`)
        : [],
      nyr_maelipunktur: nyrPunktur,
      vandamal: [
        { id: 'tom_skra', heiti: 'Í þjónustu en engin tæki skráð', fjoldi: (s.listar ? s.listar.tom.length : (s.tolur.i_thjonustu_an_taekja || 0)),
          skyring: 'Ósýnileg í Ársskoðun að eilífu. ORSÖKIN á bak við hin þrjú.' },
        { id: 'fyllanleg', heiti: 'Tóm skrá EN síðasti reikningur segir magn', fjoldi: (s.listar ? s.listar.fyllanleg.length : (s.tolur.thar_af_fyllanleg_ur_reikningi || 0)),
          skyring: 'AUTO-TRIGGER: hér má fylla skrána úr reikningnum. Telja aðeins ný tæki — '
                 + 'ekki gömul draugatæki sem troða sér inn í reikninga.' },
        { id: 'enginn_akstur', heiti: 'Komið á tíma, á engum aksturslista', fjoldi: (s.listar ? s.listar.enginAkstur.length : (s.tolur.komid_a_tima_enginn_akstur || 0)) },
        { id: 'orukkad', heiti: 'Skoðað í ár en hvorki sala né reikningur', fjoldi: (s.listar ? s.listar.orukkad.length : (s.tolur.skodad_en_orukkad || 0)) },
        { id: 'skekkja', heiti: 'Rukkuð tæki undir helmingi skráðra', fjoldi: (s.listar ? s.listar.skekkja.length : (s.tolur.rukkad_undir_helmingi_skradra || 0)) },
      ],
      // Það sem hefur VIRKAÐ áður, efst. Þetta er þroskinn: talning, ekki þjálfun.
      virkar: rada(log.virkar),
      mistokst: rada(log.mistokst),
      sidustu_faerslur: (log.faerslur || []).slice(-12).reverse(),
      // Listarnir (nöfnin á bak við tölurnar) verða aðeins til við mælingu.
      // Á hraðleið eru þeir null — ekki tómt fylki, sem liti út eins og
      // „enginn á listanum".
      listar: s.listar,
      vid_utgang: {
        hvernig: 'POST á sömu slóð',
        vidgerd: 'Bættu `vidgerd:true` + `vorn:"<nafn varðar í tools/audit-all.cjs>"` þegar eitthvað var LAGAÐ — þá frystast tölurnar fyrir og eftir, dagsett.',
        svid: 'Bættu ALLTAF `svid:"<lykill>"` við — sjá `svid_yfirlit` fyrir gild svið (kunnaskra, sala-reikningar, elon-musk, bord-flettur, prentun) eða "oflokkad". '
            + 'Þetta er skrefið sem beinir niðurstöðunni til RÉTTS sérfræðings í stað þess að hún hverfi í eina bók sem enginn les til baka. '
            + 'Keyrðu svo `node tools/svid-skyrsla.cjs` — hann skrifar kaflaheiti + grunnlínutölu inn í viðkomandi .claude/agents/*.md skrá.',
        dæmi: { verk: 'tom_skra', adgerd: 'fylla magn úr síðasta reikningi',
                nidurstada: 'jakvaett', svid: 'sala-reikningar', facts: ['56 af 260 eiga lesanlegt magn'],
                nota: 'hvað var gert og hvað kom út', hver: 'claude-code' },
        regla: 'Skilaðu ALLTAF skýrslu — líka þegar ekkert virkaði. Neikvæð útkoma '
             + 'er jafn verðmæt: hún kemur í veg fyrir að næsti reyni sama hlutinn aftur.',
      },
    });
  } catch (e) {
    return json(500, { villa: String(e.message || e).slice(0, 400) });
  }
};

function json(code, body) {
  return new Response(JSON.stringify(body, null, 1), {
    status: code,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
