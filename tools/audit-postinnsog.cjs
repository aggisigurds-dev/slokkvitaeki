#!/usr/bin/env node
'use strict';
/* PÓSTUR SEM KEMST INN Á AÐ SJÁST — og þögn má aldrei líta út eins og vinna.
 *
 * Agnar 19.09.2026, eftir að hafa misst af fyrirspurn um reikning: „Þetta má
 * aldrei gerast."
 *
 * HVAÐ GERÐIST Í RAUN (mælt sama dag, og það er ekki það sem ég hélt fyrst):
 * Innsogið var í fullkomnu lagi. `gmail-ingest-background` hefur keyrt á 2 tíma
 * fresti, 365 keyrslur, og sækir BÆÐI hólfin með account= — það snertir aldrei
 * persónulega pósthólfið. Þögnin þann daginn var laugardagur með engum pósti.
 *
 * Rótin var önnur og verri: pósturinn VAR í grunninum en borðið sá hann ekki.
 * RLS-reglan hleypti bokhald@ ekki í gegn. 138 raðir í grunni, 26 sýnilegar.
 *
 * ÞAÐ ER ÞESS VEGNA SEM ÞESSI VÖRÐUR MÆLIR EKKI „KOM PÓSTUR?".
 * Sú mæling er ómöguleg: lengsta EÐLILEGA þögn á 60 dögum er 65,3 klst og 18,5
 * klst gerist í 5% tilvika. Vörður á tímaþröskuld hefði annaðhvort orgað
 * stanslaust eða aldrei. Hann ber í staðinn saman TVÆR HLIÐAR SÖMU PÍPU, og
 * þannig þarf engan þröskuld:
 *
 *   1. ÁÆTLUNIN SKILAR SÉR  — automation_runs á að fá röð á 2 tíma fresti.
 *      Deyi áætlunin þegir hún; ENGIN röð er merkið, ekki villuskilaboð.
 *   2. GMAIL Á MÓTI GRUNNI  — þurrkeyrsla (dry=1, skrifar ekkert) segir hvað
 *      Gmail hefur. Allt sem hún kortleggur á að vera í email_digest.
 *   3. SÝNILEIKI            — það sem service_role sér á móti því sem LYKILL
 *      APPSINS sér. Hver einasta rödd sem hverfur á leiðinni verður að eiga sér
 *      NAFNGREINDA ástæðu. Hverfi einhver án ástæðu er það nákvæmlega slysið
 *      sem Agnar lýsti, og vörðurinn verður rauður.
 *
 * ENGIN GRUNNLÍNA. Talan er ekki „hve margir eru faldir" heldur „er einhver
 * falinn sem við höfum ekki ákveðið að fela". Að bæta við vélsendanda krefst
 * þess að einhver skrifi hann í listann hér að neðan — það getur ekki gerst í
 * þögn, sem er allur tilgangurinn.
 *
 * Keyrsla:  node tools/audit-postinnsog.cjs
 * Read-only — þurrkeyrslan skrifar ekkert og engin fyrirspurn breytir gögnum.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const APPLYKILL = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const THJONSLYKILL = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const INNSOG = 'https://brunaholf.netlify.app/api/gmail-ingest';

// Speglar JOBS í brunaholf/netlify/functions/gmail-ingest-background.js.
// Bætist hólf þar án þess að bætast hér verður það óvarið — þess vegna er
// listinn líka borinn saman við það sem raunverulega er í grunninum (próf 4).
const HOLF = [
  { netfang: 'eldklar@eldklar.is', mappa: 'INBOX' },
  { netfang: 'bokhald@eldklar.is', mappa: 'INBOX' },
];

const GLUGGI_DAGAR = 14;   // sýnileikagluggi
const INNSOG_DAGAR = 3;    // sami gluggi og áætlunin notar
const MESTA_BIL_KLST = 3;  // áætlunin keyrir á 2 klst; 3 gefur einni keyrslu svigrúm

/* Sendendur sem MEGA hverfa — allir vélpóstar, hver og einn ákveðinn.
 * Þetta er ekki grunnlína heldur ákvörðun: nýr falinn sendandi sem passar ekki
 * hér verður rauður og krefst þess að manneskja taki afstöðu. */
const VELSENDANDI = /^(no-?reply|no_reply|donotreply|reporting|delivery|mailer-daemon|tilkynning|hradleid|nova|stolpi|inkasso|teya)@/i;
const VELLEN = /@(teya\.com|info\.teya\.com|inexchange\.is|nova\.is|google\.com|accounts\.google\.com|konto\.is|stolpi\.is|inkasso\.is|landvelar\.is)$/i;
const OKKAR_EIGIN = /^(eldklar|bokhald|reikningar)@eldklar\.is$/i;
const AGNAR_SJALFUR = /^aggisigurds@gmail\.com$/i;

const raudar = [];
const nota = [];
function raud(m) { raudar.push(m); }

function haus(lykill) { return { apikey: lykill, Authorization: 'Bearer ' + lykill }; }

/* PostgREST skilar mest 1000 röðum. Sækja ALLT, annars er talningin ágiskun
 * byggð á broti — sama gildran og audit-pagination greip 19.09.2026. */
async function saekjaAllt(slod, lykill) {
  const allt = [];
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(URL_ + '/rest/v1/' + slod, {
      headers: Object.assign({ Range: fra + '-' + (fra + 999) }, haus(lykill)),
    });
    if (!r.ok) throw new Error(slod.slice(0, 60) + ' → ' + r.status + ' ' + (await r.text()).slice(0, 120));
    const hluti = await r.json();
    allt.push(...hluti);
    if (hluti.length < 1000) return allt;
  }
}

const fyrir = d => new Date(Date.now() - d * 864e5).toISOString();

(async () => {
  if (!URL_ || !APPLYKILL) { console.log('RED: fann ekki SUPABASE_URL/KEY í js/config.js'); process.exit(1); }

  /* ── 1. Áætlunin skilar sér ────────────────────────────────────────────── */
  if (!THJONSLYKILL) {
    nota.push('Áætlun og sýnileiki ÓMÆLD — SUPABASE_SERVICE_ROLE_KEY vantar.');
  } else {
    // TÓM SVÖR HAFA TVÆR ÓLÍKAR ÁSTÆÐUR og mega aldrei renna saman: annaðhvort
    // keyrði starfið ekki, eða lykillinn nær ekki í töfluna. RLS skilar TÓMUM
    // LISTA en engri villu, svo fyrsta útgáfa þessa varðar hrópaði „ÁÆTLUNIN
    // ÞEGIR" þegar áætlunin var í fullu fjöri og aðeins lestraraðgangurinn
    // brást. Það er nákvæmlega sú tegund ósanninda sem vörðurinn á að banna,
    // svo hann spyr fyrst hvort hann sjái töfluna yfirleitt.
    const einhverKeyrsla = await saekjaAllt(
      'automation_runs?select=started_at&job_name=eq.gmail-ingest&order=started_at.desc&limit=1',
      THJONSLYKILL);
    const keyrslur = !einhverKeyrsla.length ? [] : await saekjaAllt(
      'automation_runs?select=started_at,status,detail&job_name=eq.gmail-ingest' +
      '&started_at=gte.' + fyrir(1) + '&order=started_at.desc', THJONSLYKILL);

    if (!einhverKeyrsla.length) {
      nota.push('Áætlun ÓMÆLD — automation_runs skilar engri röð. Lykillinn nær ' +
                'ekki í töfluna (RLS skilar tómu, ekki villu) eða starfið hefur aldrei keyrt.');
    } else if (!keyrslur.length) {
      raud('ÁÆTLUNIN ÞEGIR — gmail-ingest hefur keyrt áður en engin keyrsla síðasta ' +
           'sólarhring. Dauð áætlun skilar engri villu, aðeins engri röð; þetta er eina merkið sem til er.');
    } else {
      const klst = (Date.now() - new Date(keyrslur[0].started_at)) / 36e5;
      if (klst > MESTA_BIL_KLST) {
        raud('ÁÆTLUNIN Á EFTIR — síðasta keyrsla fyrir ' + klst.toFixed(1) +
             ' klst (á að vera á 2 klst fresti).');
      } else {
        nota.push('Áætlun: ' + keyrslur.length + ' keyrslur síðasta sólarhring, ' +
                  'sú nýjasta fyrir ' + klst.toFixed(1) + ' klst.');
      }
      const villur = keyrslur.filter(k => k.status !== 'ok');
      if (villur.length) raud('ÁÆTLUNIN SKILAÐI VILLU: ' + (villur[0].detail || '').slice(0, 120));
    }
  }

  /* ── 2. Gmail á móti grunni ────────────────────────────────────────────── */
  /* Hér er spurt EINNAR spurningar: komst pósturinn inn? Ekki hvort hann sé
   * sýnilegur — það er próf 3. Fyrsta útgáfa þessa varðar taldi með lykli
   * appsins og varð rauð á bokhald@ vegna þess að tveir Teya-vélpóstar og einn
   * póstur frá Agnari sjálfum eru VILJANDI faldir. Vörður sem ruglar saman
   * „barst ekki" og „á ekki að sjást" sendir mann að leita að engu. */
  for (const h of HOLF) {
    if (!THJONSLYKILL) { nota.push(h.netfang + ': koma pósts ómæld (þjónslykil vantar).'); continue; }
    let g;
    try {
      const r = await fetch(INNSOG + '?account=' + encodeURIComponent(h.netfang) +
                            '&days=' + INNSOG_DAGAR + '&dry=1');
      g = await r.json();
      if (!r.ok || g.error) throw new Error(g.error || ('HTTP ' + r.status));
    } catch (e) {
      raud('NÆ EKKI Í GMAIL fyrir ' + h.netfang + ' — ' + String(e.message || e) +
           '. Innsogsleiðin er lokuð; ekkert nýtt kemst inn.');
      continue;
    }

    const iGrunni = await saekjaAllt(
      'email_digest?select=id&account=eq.' + encodeURIComponent(h.netfang) +
      '&folder=eq.' + h.mappa + '&received_at=gte.' + fyrir(INNSOG_DAGAR), THJONSLYKILL);

    // `mapped` er það sem innsogið ætlar sér að skrifa. Allt sem það kortleggur
    // á að vera komið í grunninn; sé grunnurinn með færra er póstur að tapast
    // á leiðinni inn — sem er annað og alvarlegra en að hann sé síaður frá borðinu.
    if ((g.mapped || 0) > iGrunni.length) {
      raud('PÓSTUR BERST EKKI INN — ' + h.netfang + ': Gmail hefur ' + g.mapped +
           ' pósta síðustu ' + INNSOG_DAGAR + ' daga en grunnurinn geymir ' + iGrunni.length + '.');
    } else {
      nota.push(h.netfang + ': Gmail ' + g.mapped + ' · grunnur ' + iGrunni.length + ' (' + INNSOG_DAGAR + ' dagar).');
    }
  }

  /* ── 3. Sýnileiki: grunnurinn á móti því sem appið sér ─────────────────── */
  if (THJONSLYKILL) {
    for (const h of HOLF) {
      const slod = 'email_digest?select=sender_email,subject,received_at&account=eq.' +
        encodeURIComponent(h.netfang) + '&received_at=gte.' + fyrir(GLUGGI_DAGAR) +
        '&order=received_at.desc';
      const sannleikur = await saekjaAllt(slod, THJONSLYKILL);
      const synilegt = await saekjaAllt(slod, APPLYKILL);

      const synMengi = new Set(synilegt.map(r => r.sender_email + '|' + r.received_at));
      const faldir = sannleikur.filter(r => !synMengi.has(r.sender_email + '|' + r.received_at));

      const oskyrdir = faldir.filter(r => {
        const s = String(r.sender_email || '');
        return !VELSENDANDI.test(s) && !VELLEN.test(s) && !OKKAR_EIGIN.test(s) && !AGNAR_SJALFUR.test(s);
      });

      if (oskyrdir.length) {
        const s = oskyrdir.slice(0, 3)
          .map(r => r.sender_email + ' „' + String(r.subject || '').slice(0, 44) + '"').join(' · ');
        raud('PÓSTUR FRÁ MANNESKJU ER ÓSÝNILEGUR Á BORÐINU — ' + h.netfang + ': ' +
             oskyrdir.length + ' pósta vantar án nokkurrar skráðrar ástæðu. ' + s);
      } else {
        nota.push(h.netfang + ': ' + sannleikur.length + ' í grunni, ' + synilegt.length +
                  ' sýnilegir, ' + faldir.length + ' faldir — allir vélpóstar (' + GLUGGI_DAGAR + ' dagar).');
      }
    }

    /* ── 4. Hólf í grunninum sem enginn vaktar ───────────────────────────── */
    const nyleg = await saekjaAllt(
      'email_digest?select=account&received_at=gte.' + fyrir(GLUGGI_DAGAR), THJONSLYKILL);
    const vaktad = new Set(HOLF.map(h => h.netfang.toLowerCase()));
    const ovaktad = [...new Set(nyleg.map(r => String(r.account || '').toLowerCase()))]
      .filter(a => a && !vaktad.has(a));
    if (ovaktad.length) {
      nota.push('Hólf utan þessa varðar (koma um aðrar leiðir): ' + ovaktad.join(', '));
    }
  }

  /* ── Niðurstaða ────────────────────────────────────────────────────────── */
  nota.forEach(n => console.log('   · ' + n));
  if (raudar.length) {
    raudar.forEach(r => console.log('RED: ' + r));
    process.exit(1);
  }
  console.log('✅ OK — pósturinn kemst inn og sést, og áætlunin er lifandi.');
})().catch(e => { console.log('RED: ' + String(e.message || e)); process.exit(1); });
