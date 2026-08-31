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

/* ── STAÐAN ──────────────────────────────────────────────────────────────── */
const heild = e => Object.values(e || {}).reduce((s, v) => s + (+v || 0), 0);
const GJALD = /byrjunargjald|akstur|ferðakostn|sendingar|umsýslu|útkall/i;

async function stada(cfg) {
  const AR = new Date().getFullYear();
  const man = new Date().getMonth() + 1;

  const co = await allar(cfg, 'fyrirtaeki?select=id,nafn,kennitala,er_i_thjonustu,customer_base_id&deleted_at=is.null&order=id');
  const [as] = await sb(cfg, 'app_settings?select=settings&id=eq.1&limit=1');
  const settings = (as && as.settings) || {};
  const ars = settings.arsskodun_customers || {};

  const sol = await allar(cfg, 'solur?select=customer_id,created_at,linur,is_credit&order=created_at.desc');
  const medSolu = new Set(), rukkad = new Map(), sidasta = new Map();
  sol.forEach(s => {
    if (s.is_credit) return;
    const k = String(s.customer_id);
    if (!sidasta.has(k)) sidasta.set(k, s);
    if (String(s.created_at).slice(0, 4) !== String(AR)) return;
    medSolu.add(k);
    let L = s.linur;
    if (typeof L === 'string') { try { L = JSON.parse(L); } catch (_) { L = []; } }
    if (!Array.isArray(L)) return;
    rukkad.set(k, (rukkad.get(k) || 0) + L.filter(l => !GJALD.test(l.desc || ''))
      .reduce((n, l) => n + (+l.qty || 0), 0));
  });

  const docs = await allar(cfg, 'customer_documents?select=customer_base_id,doc_type,year,link_ok&order=id');
  const medReikn = new Set(docs.filter(d => d.doc_type === 'reikningur' && +d.year === AR && d.customer_base_id != null)
    .map(d => String(d.customer_base_id)));

  const H = { tom: [], enginAkstur: [], orukkad: [], skekkja: [], fyllanleg: [] };
  co.forEach(c => {
    const a = ars[String(c.id)] || null;
    const taeki = a ? heild(a.equipment) : 0;
    const g = { id: c.id, nafn: c.nafn, kt: c.kennitala };
    if (c.er_i_thjonustu && taeki === 0) {
      H.tom.push(g);
      // Auto-trigger: skráin er tóm EN síðasti reikningur segir magn.
      const s = sidasta.get(String(c.id));
      if (s) {
        let L = s.linur;
        if (typeof L === 'string') { try { L = JSON.parse(L); } catch (_) { L = []; } }
        const q = Array.isArray(L) ? L.filter(l => !GJALD.test(l.desc || ''))
          .reduce((n, l) => n + (+l.qty || 0), 0) : 0;
        if (q > 0) H.fyllanleg.push({ ...g, magn_af_reikningi: q, reikningur: String(s.created_at).slice(0, 10) });
      }
    }
    if (!a || taeki === 0) return;
    const m = +a.inspect_month || 0;
    const skodad = +a.last_year_inspected === AR;
    if (m > 0 && m <= man && !skodad && !(+a.akstur)) H.enginAkstur.push({ ...g, manudur: m });
    if (!skodad) return;
    const cb = c.customer_base_id != null ? String(c.customer_base_id) : null;
    if (!medSolu.has(String(c.id)) && !(cb && medReikn.has(cb))) H.orukkad.push({ ...g, taeki });
    const r = rukkad.get(String(c.id)) || 0;
    if (r > 0 && r / taeki < 0.5) H.skekkja.push({ ...g, skrad: taeki, rukkad: r });
  });

  return {
    tolur: {
      i_thjonustu_an_taekja: H.tom.length,
      thar_af_fyllanleg_ur_reikningi: H.fyllanleg.length,
      komid_a_tima_enginn_akstur: H.enginAkstur.length,
      skodad_en_orukkad: H.orukkad.length,
      rukkad_undir_helmingi_skradra: H.skekkja.length,
      dauder_drive_tenglar: docs.filter(d => d.link_ok === false).length,
      oathugadir_drive_tenglar: docs.filter(d => d.link_ok === null).length,
    },
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

function saga(log) {
  const m = log.maelingar || [];
  if (!m.length) return { punktar: 0, lyklar: [], hreyfing: [], vidvorun: [] };
  const lyklar = Object.keys(m[m.length - 1].tolur || {});
  const nyjast = m[m.length - 1];
  const fyrra = m.length > 1 ? m[m.length - 2] : null;

  const hreyfing = lyklar.map(k => {
    const nu = +(nyjast.tolur || {})[k] || 0;
    const adur = fyrra ? (+(fyrra.tolur || {})[k] || 0) : null;
    const d = adur === null ? null : nu - adur;
    return {
      maelikvardi: k, nuna: nu, sidast: adur, breyting: d,
      // Öll þessi tala er vandamál: hækkun = verra.
      att: d === null ? 'grunnlína' : d > 0 ? 'VERRI' : d < 0 ? 'betri' : 'óbreytt',
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

    const [as] = await sb(cfg, 'app_settings?select=settings&id=eq.1&limit=1');
    const settings = (as && as.settings) || {};
    const log = settings.ai_log || { faerslur: [], virkar: {}, mistokst: {} };

    log.faerslur = (log.faerslur || []).concat([{
      dags: new Date().toISOString(),
      verk, adgerd, nidurstada,
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
        verk, adgerd, hver: String(b.hver || 'ókunnur').slice(0, 60),
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
      // Sagt hreint út þegar viðgerð var skráð án varnar.
      advorun: (b.vidgerd && !(b.vorn || '').trim())
        ? 'Viðgerð skráð ÁN varnar — hún getur endurtekið sig. Bættu verði í tools/audit-all.cjs og sendu nafn hans í `vorn`.'
        : undefined,
    });
  }

  /* ── INN: allt sem AI þarf ───────────────────────────────────────────── */
  try {
    const s = await stada(cfg);
    const log = s.log;

    /* Skrá mælinguna ÁÐUR en hún er afhent. Þetta er það sem gerir bókina til:
       hver inngangur skilur eftir sig punkt, svo talan sé aldrei „reiknuð og
       hent" eins og hún hefur alltaf verið. */
    let nyrPunktur = false;
    try {
      nyrPunktur = skraSnapshot(log, s.tolur);
      const [as2] = await sb(cfg, 'app_settings?select=settings&id=eq.1&limit=1');
      const st2 = (as2 && as2.settings) || {};
      await sb(cfg, 'app_settings?id=eq.1', {
        method: 'PATCH', body: JSON.stringify({ settings: { ...st2, ai_log: log } }),
      });
    } catch (_) { /* mæling má aldrei fella innganginn */ }
    const S = saga(log);
    const rada = o => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([adgerd, stig]) => ({ adgerd, stig }));

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
      // BÓKIN: grunnlína, ferill, hreyfing frá síðasta punkti og valdurinn.
      saga: S,
      vidgerdir: (log.vidgerdir || []).slice(-20).reverse(),
      ovardar_vidgerdir: (log.vidgerdir || []).filter(v => !v.varin).map(v => v.adgerd),
      vidvorun: S.vidvorun.length
        ? S.vidvorun.map(v => `${v.maelikvardi}: ${v.sidast} → ${v.nuna} (+${v.breyting}) — FÓR Í RANGA ÁTT`)
        : [],
      nyr_maelipunktur: nyrPunktur,
      vandamal: [
        { id: 'tom_skra', heiti: 'Í þjónustu en engin tæki skráð', fjoldi: s.listar.tom.length,
          skyring: 'Ósýnileg í Ársskoðun að eilífu. ORSÖKIN á bak við hin þrjú.' },
        { id: 'fyllanleg', heiti: 'Tóm skrá EN síðasti reikningur segir magn', fjoldi: s.listar.fyllanleg.length,
          skyring: 'AUTO-TRIGGER: hér má fylla skrána úr reikningnum. Telja aðeins ný tæki — '
                 + 'ekki gömul draugatæki sem troða sér inn í reikninga.' },
        { id: 'enginn_akstur', heiti: 'Komið á tíma, á engum aksturslista', fjoldi: s.listar.enginAkstur.length },
        { id: 'orukkad', heiti: 'Skoðað í ár en hvorki sala né reikningur', fjoldi: s.listar.orukkad.length },
        { id: 'skekkja', heiti: 'Rukkuð tæki undir helmingi skráðra', fjoldi: s.listar.skekkja.length },
      ],
      // Það sem hefur VIRKAÐ áður, efst. Þetta er þroskinn: talning, ekki þjálfun.
      virkar: rada(log.virkar),
      mistokst: rada(log.mistokst),
      sidustu_faerslur: (log.faerslur || []).slice(-12).reverse(),
      listar: s.listar,
      vid_utgang: {
        hvernig: 'POST á sömu slóð',
        vidgerd: 'Bættu `vidgerd:true` + `vorn:"<nafn varðar í tools/audit-all.cjs>"` þegar eitthvað var LAGAÐ — þá frystast tölurnar fyrir og eftir, dagsett.',
        dæmi: { verk: 'tom_skra', adgerd: 'fylla magn úr síðasta reikningi',
                nidurstada: 'jakvaett', facts: ['56 af 260 eiga lesanlegt magn'],
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
