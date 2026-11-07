#!/usr/bin/env node
'use strict';
/* VEIÐI-VAKTIN — hlekkurinn sem lokar keðjunni (Agnar 07.11.2026: „mátt reyna láta allt vinna
 * saman sem heild").
 *
 * Fyrir þennan dag var keðjan slitin í miðjunni:
 *     mæling (handvirk leit)  →  ???  →  mál á borðinu  →  agent vinnur
 * Mælingin var gerð í spjalli, málið skrifað í höndunum, og næsta lota byrjaði á núlli og fann
 * sama hlutinn upp á nýtt. Nú er hún heil:
 *     SÝN í gagnagrunni  →  ÞESSI VAKT  →  EITT mál á borðinu  →  agent  →  sýnin tæmist  →  málið lokast
 *
 * REGLUR SEM VAKTIN FER EFTIR (allar mældar 07.11.2026):
 *  1. EITT MÁL Á SÝN, aldrei eitt á hverja röð. Agnar: „ég vil helst ekkert fá á þjónustuborðið
 *     mitt nema eitthvað sem er bráðnauðsynlegt að þið getið ekki fundið svarið." 15 ólokin loforð
 *     urðu að EINU máli (#1522), ekki 15 kortum.
 *  2. UPPFÆRT Í STAÐ ÞESS AÐ TVÍTAKA. Málið er fundið á merkinu `veidi:<sýn>`; finnist það er
 *     `notes` endurskrifað með nýjustu tölum, ekki nýtt mál stofnað.
 *  3. TÆMIST SÝNIN LOKAST MÁLIÐ SJÁLFT, með skýringu. Listi sem lokast ekki sjálfur verður aftur
 *     að haug sem enginn les.
 *  4. AÐEINS AÐGERÐAHÆFAR RAÐIR. v_krafa_ekki_send telur 23 (sama og Vinnusamantektin, patch 489)
 *     en 14 bera kreditnótu og ein er staðgreiðsla; vaktin notar v_krafa_ekki_send_adgerd.
 *  5. ENGIN YTRI SKREF. Vaktin sendir engan póst, engan reikning og hreyfir enga peninga. Hún
 *     skrifar í `thjonustubeidni` og ekkert annað.
 *  6. HVERT MÁL Á EIGANDA, OG KEFLIÐ FELLUR ALDREI (Agnar 07.11.2026: „það á í raun alltaf
 *     allavega vera 1 agent tengdur sem síðan kallar á næsta ef fer út fyrir hans svið").
 *     Hver sýn ber `agent` (sá sem á verkið) og `kefli` (sá sem tekur við fari það út fyrir
 *     hans svið). Hvort tveggja stendur EFST í málinu og eigandinn er líka merki `agent:<nafn>`
 *     svo beiningin finni hann. Mál án eiganda er mál sem enginn tekur upp.
 *
 * Keyrsla:  node tools/veidi-vaktin.cjs            (mælir og uppfærir borðið)
 *           node tools/veidi-vaktin.cjs --thurr    (mælir og prentar, skrifar EKKERT)
 */
const fs = require('fs');
const path = require('path');

// Lykill: sama leið og önnur skrif-tól hússins (luna-bridge/.env), aldrei í kóða.
const ENV = ['C:/Users/Slokkvitaeki/luna-bridge/.env', path.join(__dirname, '..', '..', 'luna-bridge', '.env')]
  .find((p) => fs.existsSync(p));
if (ENV) {
  for (const l of fs.readFileSync(ENV, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(l);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.log('RED: vantar SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const THURR = process.argv.includes('--thurr');

const kr = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr.';

/* Sýnirnar sem vaktin fylgist með. `titill` er spurningin sem Agnar á að svara — ekki lýsing á
 * gagnasafni. `lina` smíðar eina línu á röð; `upphaed` er valkvætt. `thak` heldur málinu læsilegu. */
const VAKTAD = [
  { syn: 'v_krafa_ekki_send_adgerd', agent: 'rukkari', kefli: 'bokari', merki: 'veidi:krafa-ekki-send',
    titill: (n, s) => n + ' ósendar kröfur bíða — ' + s + ' — má senda?',
    inngangur: 'Reikningurinn er til og krafan fór aldrei út. Sama mæling og Vinnusamantektin notar (kortið „Ósendar kröfur"), en aðeins þær sem raunverulega má senda: kreditfærðar og staðgreiðslur eru ekki taldar.',
    adgerd: 'ég undirbý kröfurnar og legg þær fyrir þig tilbúnar; ekkert fer út fyrr en þú staðfestir',
    upphaed: (r) => r.samtals,
    lina: (r) => r.num + ' · ' + (r.customer_nafn || '—') + ' · ' + kr(r.samtals) + ' · ' + r.dagar + ' dagar' + (r.krafa_note ? ' · „' + String(r.krafa_note).slice(0, 60) + '"' : ''),
    thak: 25 },
  { syn: 'v_kredit_an_endurgerdar', agent: 'sala-reikningar', kefli: 'rukkari', merki: 'veidi:kredit-an-endurgerdar',
    titill: (n, s) => n + ' reikningar felldir niður og aldrei endurgerðir — ' + s,
    inngangur: 'Sala var kreditfærð og engin ný sala kom á sömu kennitölu eftir það. VARÚÐ: kredit getur verið ÁKVÖRÐUN en ekki yfirsjón — R-000716 Þangbakki (190.987 kr.) var felldur af því að verkið var ALDREI UNNIÐ. Lestu krafa_note og málið áður en nokkuð er rukkað.',
    adgerd: 'ég fer yfir hvern og skil á milli ákvörðunar og yfirsjónar, og legg fyrir þig þá sem á að endurgera',
    upphaed: (r) => r.samtals,
    lina: (r) => r.num + ' · ' + (r.customer_nafn || '—') + ' · ' + kr(r.samtals) + ' · kreditfært ' + r.kredit_dags + ' (' + r.kredit_num + ')',
    thak: 25 },
  { syn: 'v_verk_an_reiknings', agent: 'sala-reikningar', kefli: 'sara-organizer', merki: 'veidi:verk-an-reiknings',
    titill: (n) => n + ' staðir eiga úttektarskýrslu en engan reikning',
    inngangur: 'Skýrsla er skráð en hvorki sala né Stólpa-reikningur finnst á kennitölunni það ár. Leitað er á KENNITÖLU svo rekstrarfélag með einn reikning fyrir marga staði falli ekki ranglega inn — en systurstaður á annarri kt gæti samt hafa verið rukkaður.',
    adgerd: 'ég mæli hvern og legg fram lista með áætlaðri fjárhæð byggðri á síðasta reikningi staðarins',
    lina: (r) => (r.nafn || '—') + ' · ' + r.ar + '/' + (r.manudur || '?') + ' · ' + (r.taeki || '?') + ' tæki',
    thak: 30 },
  { syn: 'v_skodun_gleymd', agent: 'elon-musk', kefli: 'kunnaskra', merki: 'veidi:skodun-gleymd',
    titill: (n) => n + ' staðir bíða skoðunar sem átti að vera komin',
    inngangur: 'Lifandi tæki, síðasta skoðun eldri en 11 mánaða, og ENGIN hreyfing á árinu. Miðað við 11 mánuði en ekki 12 svo skoðun sem á að vera í nóv/des teljist ekki í vanskilum í nóvember. ATH: félag sem er merkt í þjónustu en er í raun farið blæs töluna upp — sjá athugasemdir á prófílunum.',
    adgerd: 'ég raða þeim eftir mánuði og tækjafjölda og set á skoðunarlistann',
    upphaed: (r) => r.sidasti_reikningur,
    lina: (r) => (r.nafn || '—') + ' · ' + (r.taeki || 0) + ' tæki · síðast ' + String(r.sidasta_skodun || '').slice(0, 7) + (r.sidasti_reikningur ? ' · í fyrra ' + kr(r.sidasti_reikningur) : '') + (r.er_i_thjonustu === false ? ' · MERKT ÚR ÞJÓNUSTU' : ''),
    thak: 30 },
  { syn: 'v_taekjatolur_misraemi', agent: 'elon-musk', kefli: 'natalie', merki: 'veidi:taekjatolur',
    titill: (n) => n + ' staðir segja tvær ólíkar tækjatölur',
    inngangur: 'Nýjasta úttektarskýrsla á móti lifandi tækjaskrá. ÁRSSKOÐUN RÆÐUR — tækjaskráin víkur. Mismunur > 0 þýðir of mörg tæki í skrá (oft frá öðrum stað); tækjaskrá 0 þýðir að staður með tugi tækja sýnir ekkert í kerfinu.',
    adgerd: 'ég samræmi tækjaskrána við Ársskoðun þar sem munurinn er skýr og skrái hvert skref',
    lina: (r) => (r.nafn || '—') + ' · skýrsla ' + r.skyrsla_taeki + ' · skrá ' + r.taekjaskra_lifandi + ' · munur ' + (r.mismunur > 0 ? '+' : '') + r.mismunur,
    thak: 30 },
  { syn: 'v_skeytamidlun_vantar', agent: 'bokari', kefli: 'tengingar', merki: 'veidi:skeytamidlun',
    titill: (n) => n + ' félög með ógreidda reikninga og tóma skeytamiðlun',
    inngangur: 'Stórir kúnnar taka ekki við reikningi nema hann berist með skeytamiðlun — annars fer hann aldrei í samþykkt og situr fastur ógreiddur. Center Hotels er dæmið: payday_delivery var tómt á öllum tólf stöðunum. Þetta er AFHENDINGARVANDI, ekki vanskil.',
    adgerd: 'ég set skeytamiðlun á þau félög sem taka við henni og lista hin',
    lina: (r) => (r.nafn || '—') + ' · ' + r.ogreiddir + ' ógreiddir reikningar',
    thak: 30 },
];

async function sok(slod, valk) {
  const r = await fetch(URL_ + '/rest/v1/' + slod, Object.assign({ headers: H }, valk || {}));
  const t = await r.text();
  if (!r.ok) throw new Error(slod.split('?')[0] + ' -> ' + r.status + ' ' + t.slice(0, 160));
  // POST/PATCH án `Prefer: return=representation` skila TÓMUM bol með stöðu 201/204.
  // r.json() á tómum bol kastar „Unexpected end of JSON input" — það kostaði eina keyrslu 07.11.2026.
  return t ? JSON.parse(t) : null;
}

function notur(v, rodir, summa) {
  const synd = rodir.slice(0, v.thak);
  return 'EIGANDI: ' + v.agent + ' — fari málið út fyrir hans svið réttir hann það á ' + v.kefli + '. Keflið fellur aldrei á jörðina.\n\n'
    + 'ÞETTA GERIST\n'
    + '✓ Samþykkja: ' + v.adgerd + '.\n'
    + '✕ Hafna: óbreytt.\n'
    + '💬 Skýring: segðu hvað á að sleppa og hvers vegna.\n\n'
    + 'MÆLT ' + new Date().toISOString().slice(0, 10).split('-').reverse().join('.')
    + ' — endurreiknast sjálft úr sýninni `' + v.syn + '`. Þetta mál uppfærist af sjálfu sér og LOKAST þegar listinn tæmist; þú þarft ekki að loka því.\n\n'
    + v.inngangur + '\n\n'
    + (summa != null ? 'SAMTALS: ' + kr(summa) + ' á ' + rodir.length + ' röðum.\n\n' : '')
    + synd.map((r) => '• ' + v.lina(r)).join('\n')
    + (rodir.length > synd.length ? '\n… og ' + (rodir.length - synd.length) + ' til viðbótar í sýninni.' : '');
}

(async () => {
  let stofnad = 0, uppfaert = 0, lokad = 0, ohreyft = 0;
  for (const v of VAKTAD) {
    const rodir = await sok(v.syn + '?select=*&limit=2000');
    const summa = v.upphaed ? rodir.reduce((a, r) => a + (Number(v.upphaed(r)) || 0), 0) : null;
    // Málið er fundið á merkinu, aldrei á titli — titillinn breytist með tölunni.
    const opin = await sok('thjonustubeidni?select=id,status,title&deleted_at=is.null&status=neq.lokad&tags=cs.'
      + encodeURIComponent(JSON.stringify([v.merki])));
    const mal = opin[0];

    if (!rodir.length) {
      if (mal) {
        console.log((THURR ? '[þurrt] ' : '') + 'LOKA #' + mal.id + ' — ' + v.syn + ' er tóm');
        if (!THURR) await sok('thjonustubeidni?id=eq.' + mal.id, { method: 'PATCH', body: JSON.stringify({
          status: 'lokad', lokid_at: new Date().toISOString(), lokid_af: 'veidi-vaktin',
          lokid_lysing: 'Lokað sjálfkrafa ' + new Date().toISOString().slice(0, 10) + ': sýnin ' + v.syn + ' er tóm — ekkert bíður lengur.' }) });
        lokad++;
      } else ohreyft++;
      continue;
    }

    const titill = v.titill(rodir.length, summa != null ? kr(summa) : '');
    const body = { title: titill, notes: notur(v, rodir, summa), updated_at: new Date().toISOString() };
    if (mal) {
      console.log((THURR ? '[þurrt] ' : '') + 'UPPFÆRI #' + mal.id + ' — ' + rodir.length + ' raðir' + (summa ? ', ' + kr(summa) : ''));
      if (!THURR) await sok('thjonustubeidni?id=eq.' + mal.id, { method: 'PATCH', body: JSON.stringify(body) });
      uppfaert++;
    } else {
      console.log((THURR ? '[þurrt] ' : '') + 'STOFNA — ' + titill);
      if (!THURR) await sok('thjonustubeidni', { method: 'POST', body: JSON.stringify(Object.assign({
        source: 'claude', type: 'annad', status: 'nytt', priority: 'venjulegur',
        assigned_to: 'Agnar', created_by: 'veidi-vaktin',
        tags: ['samthykki', 'spurning', v.merki, 'agent:' + v.agent] }, body)) });
      stofnad++;
    }
  }
  console.log((THURR ? '[ÞURR KEYRSLA] ' : '') + 'Veiði-vaktin: ' + stofnad + ' stofnuð · ' + uppfaert + ' uppfærð · ' + lokad + ' lokuð · ' + ohreyft + ' tóm og ekkert mál.');
})().catch((e) => { console.log('RED: veidi-vaktin sprakk: ' + e.message); process.exitCode = 1; });
