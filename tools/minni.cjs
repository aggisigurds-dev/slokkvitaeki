#!/usr/bin/env node
/* MINNISSTÝRIBÓKIN — Supabase að baki, GitHub að framan.
 *
 * Agnar 01.09.2026: „geturðu ekki gert supabase-að, github-distributed
 * minnis-stýribók sem allir athuga þegar þeir fara í verkefni."
 *
 * ── HVAÐ VAR ÞEGAR TIL, OG HVAÐ VANTAÐI ───────────────────────────────────
 * Minnið sjálft er til og er heilbrigt: Supabase-taflan `charlize_knowledge`
 * (view `v_charlize_active`) — 282 virkar staðreyndir (2.136 þann 10.11.2026), skrifaðar af
 * claude-code (108), cowork (73), chat (62), natalie (23) og fleirum, síðast
 * 31.08.2026. Það er EKKI vandinn.
 *
 * Vandinn var tvennt:
 *   1. Það var hvergi í git. Ný vél eða ný lota sá ekkert fyrr en hún vissi
 *      að hún ætti að spyrja — og vissi það ekki.
 *   2. Ekkert neyddi neinn til að lesa það. CLAUDE.md regla #1 segir „Lestu
 *      Charlize ÁÐUR en þú byrjar". Í lotunni 31.08 var hún ekki lesin, af
 *      lotu sem hafði CLAUDE.md í samhengi allan tímann. Tilmæli duga ekki.
 *
 * ── LAUSNIN: TVÆR HLIÐAR Á SAMA MINNI ─────────────────────────────────────
 *   SUPABASE  er sannleikurinn. Ritanlegur, samstundis, úr hvaða verkfæri sem
 *             er, án uppsetningar. Þar lifir minnið milli lota.
 *   GITHUB    er dreifingin. `docs/MINNISBOK.md` er GENERUÐ og committuð, svo
 *             hún berst á allar fjórar vélarnar með `git pull` og er læsileg
 *             ÁN nets — sem skiptir máli, því lota sem hefur ekkert net eða
 *             enga lykla les hana samt.
 *
 * Hvorug hliðin ein og sér dugar: Supabase án git er ósýnileg, git án
 * Supabase staðnar. Þess vegna báðar, með einni skipun á milli.
 *
 * ── SKIPANIRNAR ───────────────────────────────────────────────────────────
 *   node tools/minni.cjs                  stýribókin (git-eintakið, samstundis)
 *   node tools/minni.cjs <svid|topic>     bara það svið
 *   node tools/minni.cjs --leit "<orð>"   leitar í ÖLLUM efnum bókarinnar í einu (öll orðin
 *                                         verða að finnast); með --ferskt leitar hún í allri
 *                                         töflunni, líka því sem bókin sleppir
 *   node tools/minni.cjs --ferskt         les BEINT úr Supabase (nýjast)
 *   node tools/minni.cjs --uppfaera       sækir úr Supabase og skrifar
 *                                         docs/MINNISBOK.md (til að committa)
 *   node tools/minni.cjs --skra "<staðreynd>" --topic X [--scope Y] [--detail Z]
 *                                         skrifar NÝJA staðreynd í Supabase
 *
 * ── HVAÐ ÞETTA GERIR ALDREI ───────────────────────────────────────────────
 * Skrifar aldrei yfir staðreynd og eyðir aldrei. Úrelt staðreynd fær
 * `status='superseded'` í töflunni sjálfri — það er Charlize-reglan og hún
 * stendur. Þessi skrá bætir bara við og les.
 *
 * Skrifar aldrei KÚNNAMINNI (scope `kunni`) í git-eintakið (10.11.2026). Repóið er opinbert á GitHub
 * og kúnnaminnið ber nöfn tengiliða, netföng, símanúmer og aðgengi. Það er lesið beint úr töflunni:
 * --ferskt (skjár, ekkert skrifað) eða hubbinn. Mál 1431 á Þjónustuborðinu.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const BOK = path.join(rot, 'docs', 'MINNISBOK.md');

/* ── Lyklar: sama uppspretta og allt annað í repóinu ────────────────────── */
function keys() {
  const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
  const url = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
  const key = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
  if (!url || !key) throw new Error('Fann ekki SUPABASE_URL/KEY í js/config.js');
  return { url, key, h: { apikey: key, Authorization: 'Bearer ' + key, 'content-type': 'application/json' } };
}

/* Kastar við villu. Skilar ALDREI tómu fylki við bilun — tómt minni lítur út
   eins og „ekkert að vita", sem er hættulegasta lygin í þessu kerfi. */
async function sbGet(q) {
  const { url, h } = keys();
  const r = await fetch(`${url}/rest/v1/${q}`, { headers: h });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/* ── Sækja allt sem stýribókin sýnir ─────────────────────────────────────
   10.11.2026, tvö skref sama dag. Fyrst: hausinn sagði „1000 virkar staðreyndir" þegar þær voru 2.113, og var
   látinn segja satt („1000 nýjustu af N"). Svo: glugginn sjálfur var vandinn. PostgREST skilar mest 1000 röðum
   í kalli, 775 af þeim 1000 nýjustu voru kúnnaminni frá 04.11., og allt eldra — 158 efni af 239, þar á meðal
   `oryggisnet`, `hradi` og `rukkun` — var horfið úr bókinni: `node tools/minni.cjs oryggisnet` svaraði „Ekkert
   efni heitir". Nú er flett 1000 í senn með fastri röð og fjöldinn borinn við talningu þjónsins: vanti raðir er
   KASTAÐ, ekki skrifuð hálf bók. (MAELINGAR kafli 22.) */
async function saekja() {
  const { url, h } = keys();
  const sed = new Set();
  const stadr = [];
  let alls = null;                                  // heildin þegar lesturinn HÓFST
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(`${url}/rest/v1/v_charlize_active?select=*&order=created_at.desc,id.desc&limit=1000&offset=${fra}`,
      { headers: Object.assign({}, h, { Prefer: 'count=exact' }) });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const m = String(r.headers.get('content-range') || '').match(/\/(\d+)$/);
    if (m && alls == null) alls = +m[1];
    const sida = await r.json();
    // Bætist staðreynd við á meðan flett er hliðrast síðurnar um eina röð — sama id má ekki teljast tvisvar.
    sida.forEach(x => { if (!sed.has(x.id)) { sed.add(x.id); stadr.push(x); } });
    if (sida.length < 1000) break;
    if (fra >= 100000) throw new Error('v_charlize_active: yfir 100.000 raðir — flettingin stöðvuð');
  }
  if (alls != null && stadr.length < alls) {
    throw new Error(`v_charlize_active: sótti ${stadr.length} raðir en þjónninn taldi ${alls} — bókin væri ófullkomin`);
  }

  // Mælibókin er valfrjáls viðbót — hún má ekki fella minnið ef hún svarar ekki.
  let maelt = null;
  try {
    const r = await fetch('https://slokkvitaeki.netlify.app/api/ai-context', {
      headers: { accept: 'application/json' }, signal: AbortSignal.timeout(9000),
    });
    if (r.ok) maelt = await r.json();
  } catch (_) {}

  return { stadr, maelt, alls, sott: new Date().toISOString() };
}

/* ── Smíða stýribókina sem markdown ────────────────────────────────────── */
function smida({ stadr: allar, maelt, sott }, val) {
  const hamark = (val && val.hamark) || 40;      // staðreyndir á efni í bókinni; --ferskt --leit tekur allt
  // Kúnnaminnið fer ALDREI í skrána sem er committuð (opinbert repó) — aðeins á skjá með --ferskt.
  const medKunni = !!(val && val.kunni);
  const stadr = medKunni ? allar : allar.filter(x => x.scope !== 'kunni');
  const nKunni = allar.length - allar.filter(x => x.scope !== 'kunni').length;
  // Hve mörgum sleppir 40-á-efni þakið? Talið hér svo hausinn geti sagt það.
  const fjoldiEfnis = new Map();
  stadr.forEach(x => { const t = x.topic || '(óflokkað)'; fjoldiEfnis.set(t, (fjoldiEfnis.get(t) || 0) + 1); });
  let slepptHamark = 0;
  fjoldiEfnis.forEach(n => { if (n > hamark) slepptHamark += n - hamark; });

  const L = [];
  const p = s => L.push(s);

  p('# Minnisstýribókin');
  p('');
  p('> **Þessi skrá er GENERUÐ.** Ekki breyta henni handvirkt — hún er skrifuð af');
  p('> `tools/minni.cjs --uppfaera` úr Supabase-töflunni `charlize_knowledge`.');
  p('> Breyting hér tapast við næstu uppfærslu. Til að bæta við staðreynd:');
  p('> `node tools/minni.cjs --skra "..." --topic <efni>`');
  p('');
  p(`Sótt ${sott.slice(0, 16).replace('T', ' ')} · ${allar.length} virkar staðreyndir — ${stadr.length - slepptHamark} prentaðar hér`);
  if (slepptHamark || (!medKunni && nKunni)) {
    const hlutar = [];
    if (slepptHamark) hlutar.push(`${slepptHamark} eldri staðreyndum er sleppt (mest ${hamark} í hverju efni)`);
    if (!medKunni && nKunni) hlutar.push(`kúnnaminnið (${nKunni} færslur) er aldrei skrifað hingað`);
    p('');
    p(`> ⚠ **Bókin er ekki allt minnið:** ${hlutar.join(' og ')}.`);
    p('> Finnist ekkert hér er það ekki sönnun um að ekkert sé skráð — leitaðu í allri töflunni:');
    p('> `node tools/minni.cjs --ferskt --leit "<orð>"` — eða spurðu grunninn beint:');
    p("> `select topic, fact, detail from v_charlize_active where topic = '<efni>' or fact ilike '%<orð>%' order by created_at desc;`");
  }
  p('');
  p('---');
  p('');

  /* 1. Það sem mest liggur á — mælt, ekki metið. */
  p('## 1. Staðan í tölum');
  p('');
  if (!maelt || !maelt.stada || !Object.keys(maelt.stada).length) {
    p('_Mælibókin svaraði ekki þegar þetta var skrifað. Tölurnar eru því EKKI hér —');
    p('ekki núll. Keyrðu `node tools/minni.cjs --uppfaera` aftur, eða sæktu beint:_');
    p('`GET https://slokkvitaeki.netlify.app/api/ai-context`');
  } else {
    const s = maelt.stada;
    p(`Mælt ${String(maelt.maelt || '').slice(0, 16).replace('T', ' ')} · ${Object.keys(s).length} mælar · `
      + 'allar tölur eru VANDAMÁL (hærra = verra).');
    p('');
    if ((maelt.vidvorun || []).length) {
      p('**⚠ Fór í ranga átt síðan síðast:**');
      p('');
      maelt.vidvorun.forEach(v => p(`- ${v}`));
      p('');
    }
    const raða = Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 12);
    p('| Mælir | Tala |');
    p('|---|---:|');
    raða.forEach(([k, v]) => p(`| \`${k}\` | ${v} |`));
    p('');
    p(`_Allir ${Object.keys(s).length} mælarnir: mælaborðið á /#maelabord, eða `);
    p('`GET /api/ai-context`._');
    if ((maelt.ovardar_vidgerdir || []).length) {
      p('');
      p(`**Viðgerðir án varnar — geta endurtekið sig:** ${maelt.ovardar_vidgerdir.join(' · ')}`);
    }
  }
  p('');

  /* 2. Sviðin — hver á hvað. */
  if (maelt && Array.isArray(maelt.svid_yfirlit) && maelt.svid_yfirlit.length) {
    p('## 2. Hvaða sérfræðingur á hvaða tölu');
    p('');
    p('Skilaðu niðurstöðu á RÉTT svið svo hún rati til þess sem á málið:');
    p('`POST /api/ai-context` með `svid:"<lykill>"`.');
    p('');
    p('| Svið | Skrá | Mælar | Síðasta viðgerð |');
    p('|---|---|---:|---|');
    maelt.svid_yfirlit.forEach(v => {
      const sid = (v.sidustu_vidgerdir || [])[0];
      p(`| \`${v.svid}\` | \`${v.skra}\` | ${Object.keys(v.grunnlina || {}).length} | `
        + (sid ? `${String(sid.dags).slice(0, 10)} — ${sid.adgerd}${sid.varin ? ' 🛡' : ' ⚠ óvarið'}` : '—') + ' |');
    });
    if ((maelt.oflokkad_maelar || []).length) {
      p('');
      p(`**${maelt.oflokkad_maelar.length} mælar eiga engan sérfræðing enn** — sýnilegt gat, ekki falið:`);
      p('');
      p('`' + maelt.oflokkad_maelar.join('` · `') + '`');
    }
    p('');
  }

  /* 3. Staðreyndirnar sjálfar, flokkaðar. */
  p('## 3. Staðreyndir — lesa ÁÐUR en breytt er');
  p('');
  p('Ein setning = ein staðreynd. Uppspretta og vissa fylgja hverri.');
  p('');
  if (!medKunni && nKunni) {
    p(`> **Kúnnaminnið (scope \`kunni\`, ${nKunni} færslur) er EKKI í þessari skrá.** Skráin er committuð í repó sem er`);
    p('> opinbert á GitHub, og kúnnaminnið ber nöfn tengiliða, netföng, símanúmer og aðgengi. Lestu það beint úr töflunni:');
    p('> `node tools/minni.cjs --ferskt --leit "<nafn eða kennitala>"` — eða í hubbnum: Jarvis → Minnið → Kúnnaminni.');
    p('');
  }

  const eftirTopic = new Map();
  stadr.forEach(x => {
    const t = x.topic || '(óflokkað)';
    if (!eftirTopic.has(t)) eftirTopic.set(t, []);
    eftirTopic.get(t).push(x);
  });
  const raðaðTopics = [...eftirTopic.entries()].sort((a, b) => b[1].length - a[1].length);

  p('| Efni | Fjöldi |');
  p('|---|---:|');
  raðaðTopics.slice(0, 20).forEach(([t, arr]) => p(`| [${t}](#${slug(t)}) | ${arr.length} |`));
  p('');

  raðaðTopics.forEach(([t, arr]) => {
    p(`### ${t}`);
    p('');
    arr.slice(0, hamark).forEach(x => {
      const merki = x.confidence === 'confirmed' ? '' : ` _(${x.confidence})_`;
      p(`- **${einlina(x.fact)}**${merki}`);
      if (x.detail) p(`  <br>${einlina(x.detail).slice(0, 300)}`);
      p(`  <br><sub>${String(x.created_at).slice(0, 10)} · ${x.scope} · ${x.source || '—'} · ${x.agent || '—'}</sub>`);
    });
    if (arr.length > hamark) p(`- _…og ${arr.length - hamark} til viðbótar í töflunni._`);
    p('');
  });

  p('---');
  p('');
  p('## Hvernig þetta helst lifandi');
  p('');
  p('```bash');
  p('node tools/minni.cjs                 # lesa (git-eintak, samstundis, án nets)');
  p('node tools/minni.cjs --ferskt        # lesa beint úr Supabase');
  p('node tools/minni.cjs --skra "..." --topic solur   # skrifa nýja staðreynd');
  p('node tools/minni.cjs --uppfaera      # endurskrifa þessa skrá og committa');
  p('```');
  p('');
  p('Supabase er sannleikurinn; þessi skrá er dreifingin. Uppfærðu hana áður en');
  p('þú lokar lotu — annars sér næsta vél gamalt eintak.');

  return L.join('\n') + '\n';
}

const einlina = s => String(s == null ? '' : s).replace(/\s*\n\s*/g, ' ').trim();
const slug = t => String(t).toLowerCase().replace(/[^a-z0-9áéíóúýðþæö]+/g, '-').replace(/^-|-$/g, '');

/* ── Stutt yfirlit í skjá (það sem lota sér við upphaf verks) ───────────── */
function yfirlit(md, sia) {
  const linur = md.split('\n');
  if (!sia) {
    // Hausinn + Staðan + Sviðin. Staðreyndirnar eru of langar fyrir skjá;
    // vísað á skrána í staðinn svo lotan viti hvar þær eru.
    const endir = linur.findIndex(l => l.startsWith('## 3. '));
    console.log(linur.slice(0, endir > 0 ? endir : 60).join('\n'));
    const n = (md.match(/^- \*\*/gm) || []).length;
    console.log(`## 3. Staðreyndir — ${n} talsins`);
    console.log('');
    const efni = (md.match(/^### /gm) || []).length;
    console.log(`Þær eru of margar fyrir skjáinn (${efni} efni). Síaðu eða leitaðu:`);
    console.log('  node tools/minni.cjs <efni>            t.d. solur · skjol · villuleit · deploy');
    console.log('  node tools/minni.cjs --leit "<orð>"    leitar í öllum efnum í einu');
    return;
  }
  const s = sia.toLowerCase();
  const i = linur.findIndex(l => l.toLowerCase() === '### ' + s);
  if (i < 0) {
    const til = [...md.matchAll(/^### (.+)$/gm)].map(m => m[1]);
    console.log(`Ekkert efni heitir "${sia}".`);
    console.log('Til: ' + til.join(' · '));
    return;
  }
  let j = i + 1;
  while (j < linur.length && !linur[j].startsWith('### ') && !linur[j].startsWith('---')) j++;
  console.log(linur.slice(i, j).join('\n'));
}

/* ── Leit þvert á efnin (10.11.2026) ──────────────────────────────────────
   Bókin ber yfir 200 efni; lota sem veit ekki hvað efnið HEITIR fann ekkert. Leitin fer yfir hverja staðreynd
   (setninguna og skýringuna) og krefst þess að ÖLL orðin finnist. Hún segir líka hvað hún sá EKKI: bókin
   geymir mest 40 staðreyndir á efni og ekkert kúnnaminni, og leit sem þegir um afganginn væri mælitæki sem lýgur. */
function leita(md, ord, ferskt) {
  const ordin = ord.toLowerCase().split(/\s+/).filter(Boolean);
  const linur = md.split('\n');
  const byrjun = linur.findIndex(l => l.startsWith('## 3. '));
  let efni = '', skodad = 0, sleppt = 0;
  const km = /Kúnnaminnið \(scope `kunni`, (\d+) færslur\) er EKKI/.exec(md);
  const kunni = km ? parseInt(km[1], 10) : 0;
  const hitt = [];
  for (let i = Math.max(byrjun, 0); i < linur.length; i++) {
    const l = linur[i];
    if (l.startsWith('### ')) { efni = l.slice(4); continue; }
    const m = /^- _…og (\d+) til viðbótar/.exec(l);
    if (m) { sleppt += parseInt(m[1], 10); continue; }
    if (!l.startsWith('- **')) continue;
    skodad++;
    let j = i + 1;
    while (j < linur.length && linur[j].startsWith('  <br>')) j++;
    const blokk = linur.slice(i, j);
    const lagt = blokk.join(' ').toLowerCase();
    if (ordin.every(o => lagt.includes(o))) hitt.push({ efni, blokk });
    i = j - 1;
  }
  const SYNA = 25;
  hitt.slice(0, SYNA).forEach(h => {
    console.log(`[${h.efni}]`);
    console.log(h.blokk.join('\n'));
    console.log('');
  });
  console.log(`${hitt.length} staðreyndir með „${ord}" af ${skodad} skoðuðum` +
    (hitt.length > SYNA ? ` — ${SYNA} sýndar, þrengdu leitina` : '') + '.');
  if ((sleppt || kunni) && !ferskt) {
    console.log(`ATH: EKKI skoðað — ${sleppt} eldri staðreyndir (bókin ber 40 á efni)` +
      (kunni ? ` og ${kunni} færslur kúnnaminnis (aldrei í bókinni).` : '.'));
    console.log(`     Leita í allri töflunni:  node tools/minni.cjs --ferskt --leit "${ord}"`);
  }
}

/* ── Keyrsla ───────────────────────────────────────────────────────────── */
(async () => {
  const arg = process.argv.slice(2);
  const flagg = n => { const i = arg.indexOf(n); return i > -1 ? arg[i + 1] : null; };

  if (arg.includes('--skra')) {
    const fact = flagg('--skra');
    const topic = flagg('--topic');
    if (!fact || !topic) {
      console.error('Vantar: --skra "<staðreynd>" --topic <efni>');
      process.exit(1);
    }
    const { url, h } = keys();
    const rad = {
      scope: flagg('--scope') || 'slokkvitaeki',
      topic, fact,
      detail: flagg('--detail') || null,
      source: flagg('--source') || 'claude-code',
      confidence: flagg('--confidence') || 'confirmed',
      agent: 'claude-code',
    };
    const r = await fetch(`${url}/rest/v1/charlize_knowledge`, {
      method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(rad),
    });
    if (!r.ok) { console.error('VILLA', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
    const [ny] = await r.json();
    console.log(`✅ Skráð (id ${ny.id}) í ${rad.topic}: ${fact}`);
    console.log('   Keyrðu `node tools/minni.cjs --uppfaera` til að koma því í git-eintakið.');
    return;
  }

  if (arg.includes('--uppfaera')) {
    const gogn = await saekja();
    const md = smida(gogn);
    fs.mkdirSync(path.dirname(BOK), { recursive: true });
    fs.writeFileSync(BOK, md, 'utf8');
    const n = (md.match(/^- \*\*/gm) || []).length;
    console.log(`✅ docs/MINNISBOK.md skrifuð — ${n} staðreyndir, ${md.length} stafir.`);
    console.log(gogn.maelt ? '   Mælitölur fylgdu með.' : '   ⚠ Mælibókin svaraði EKKI — tölurnar vantar í þetta eintak.');
    console.log('   Committaðu hana svo hinar vélarnar fái hana.');
    return;
  }

  if (arg.includes('--leit')) {
    const ord = (flagg('--leit') || '').trim();
    if (!ord || ord.startsWith('--')) { console.error('Vantar: --leit "<orð>"'); process.exit(1); }
    const ferskt = arg.includes('--ferskt');
    if (!ferskt && !fs.existsSync(BOK)) {
      console.log('docs/MINNISBOK.md er ekki til enn. Keyrðu:  node tools/minni.cjs --uppfaera');
      process.exit(1);
    }
    leita(ferskt ? smida(await saekja(), { hamark: Infinity, kunni: true }) : fs.readFileSync(BOK, 'utf8'), ord, ferskt);
    return;
  }

  if (arg.includes('--ferskt')) {
    const md = smida(await saekja(), { kunni: true });     // skjár, ekkert skrifað — kúnnaminnið með
    yfirlit(md, arg.find(a => !a.startsWith('--')));
    return;
  }

  // Sjálfgefið: git-eintakið. Samstundis, án nets, án lykla.
  if (!fs.existsSync(BOK)) {
    console.log('docs/MINNISBOK.md er ekki til enn.');
    console.log('Keyrðu:  node tools/minni.cjs --uppfaera');
    process.exit(1);
  }
  yfirlit(fs.readFileSync(BOK, 'utf8'), arg.find(a => !a.startsWith('--')));
})().catch(e => {
  // Bilun er sögð hreint út. Þögul bilun sem skilar tómu minni er verri en
  // engin stýribók, því hún lítur út eins og „ekkert að vita".
  console.error('VILLA:', e.message);
  console.error('Minnið var EKKI lesið. Ekki halda áfram og gera ráð fyrir að það sé tómt.');
  process.exit(1);
});
