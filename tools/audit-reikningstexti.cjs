#!/usr/bin/env node
'use strict';
/* INNRI TEXTI MÁ ALDREI STANDA Á REIKNINGI SEM Á EFTIR AÐ FARA
 *
 * Af hverju hann er til (09.10.2026). Agnar sendi skjáskot af reikningi til
 * Bíll.is þar sem þetta stóð sem „Vegna"-lína, efst, í skáletri:
 *
 *   „Drög stofnuð 09.10.2026 (Claude) — mál #1175 (samþykkt „byrja á stærstu"):
 *    heimsókn 21.09.2026 (ferð með 4 hökum), úttektarskýrsla #10024 … ÓSENT —
 *    Agnar fer yfir og sendir"
 *
 * Svar hans: „allllldreiii setja svona texta á reikningana".
 *
 * TVEIR REITIR, OG AÐEINS ANNAR ER INNRI:
 *   · `solur.athugasemdir` — PRENTAST. `vegnaLine()` í 233-uttekt-pdf-autosave
 *     gerir úr honum „Vegna"-línuna á PDF-inu, og `hreinsaNotu()` í
 *     netlify/functions/payday-push.cjs sendir hann í `description` á Payday-
 *     reikninginn. Hann fer því bæði á blaðið OG í heimabanka kúnnans.
 *   · `solur.krafa_note` — innri. 166 segir það sjálft í title-inu á reitnum:
 *     „eigin reitur (ekki athugasemd reikningsins)". Frá 09.10.2026 opnar
 *     ℹ-takki í Kröfu yfirliti skýringarglugga á þennan reit.
 *
 * REGLAN SEM ÞESSI VÖRÐUR ÞVINGAR: sala sem á eftir að fara út má ekki bera
 * rekjanleika-texta í `athugasemdir`. Hann á heima í `krafa_note`.
 *
 * MÆLT þann dag: SEX reikningar báru slíkan texta og einn þeirra (R-001117,
 * Sjúkraþjálfun Selfoss) var ÞEGAR farinn til viðskiptavinar — með kennitölu
 * fyrri eigenda og innra málsnúmeri á blaðinu. Það varð ekki tekið til baka.
 *
 * AF HVERJU VÖRÐUR EN EKKI MINNISPUNKTUR: reglan var ÞEGAR skrifuð í minnið
 * (`feedback_innri_texti_krafa_note`) og hún stöðvaði ekkert. VERKLAG.md segir
 * af hverju: „Tilmæli duga ekki; sjálfvirk keyrsla gerir það."
 *
 * UMFANG: aðeins sölur sem GETA farið út — `greitt_med = 'reikningur'`, ógreidd,
 * ekki void, ekki kreditfærsla, engin send-merki. Kortagreiddar sölur bera
 * sögulegan texta frá fyrri lotum (13 slíkar 09.10.) og fara aldrei í kröfu;
 * vörður sem vælir um þær yrði hunsaður og þá ver hann ekkert.
 *
 * Keyrsla: node tools/audit-reikningstexti.cjs   (þarf Supabase-lykil)
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL = (/SUPABASE_URL\s*=\s*['"]([^'"]+)/.exec(cfg) || [])[1];
const KEY = (/SUPABASE_KEY\s*=\s*['"]([^'"]+)/.exec(cfg) || [])[1];

/* Mynstrin eru ORÐ SEM EIGA HVERGI HEIMA Á REIKNINGI — nafn vélarinnar, innri
 * málsnúmer, vinnublaðs-tilvísanir, vinnustöðu-orð. Þau eru vísvitandi þröng:
 * „Heimsókn 2026-09-21" og „Hleðsla á kolsýrukútum fyrir ms World Navigator"
 * EIGA að standa þarna og mega ekki falla. */
const BANN = [
  [/\bclaude\b/i,                       'nafn vélarinnar'],
  [/\bmál\s*#\s*\d+/i,                  'innra málsnúmer af Þjónustuborðinu'],
  [/\bÓSENT\b/,                         'vinnustöðu-orð'],
  [/\bSARA[- ]lína\b/i,                 'tilvísun í vinnublað'],
  [/\bsamþykkt af Agnari\b/i,           'innri samþykkt'],
  [/\bDrög stofnuð\b/i,                 'vinnustöðu-orð'],
  [/\bAgnar fer yfir\b/i,               'innri verkaskipting'],
  [/\bfyrri eigend/i,                   'innri saga félagsins'],
  [/\bendurútgefinn\s+\d/i,             'innri leiðrétting'],
];

/* `node:https` en EKKI `fetch`. Mælt 09.10.2026 á Node 24 / Windows: vörður sem
 * notar fetch skilar réttu svari og hrynur SVO á leiðinni út —
 * „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" úr libuv — og exit-kóðinn
 * verður 127 þótt niðurstaðan væri GRÆN. audit-all les exit-kóðann og kallar það RAUTT.
 * Undici heldur keep-alive tengingunni opinni; https-beiðni sem lokar sér gerir það ekki. */
function saekja(slod) {
  const https = require('https');
  return new Promise((ok, nei) => {
    const q = https.get(slod, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Connection: 'close' } }, res => {
      let b = '';
      res.setEncoding('utf8');
      res.on('data', d => { b += d; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return nei(new Error('HTTP ' + res.statusCode));
        try { ok(JSON.parse(b)); } catch (e) { nei(e); }
      });
    });
    q.on('error', nei);
    q.setTimeout(20000, () => { q.destroy(new Error('tímamörk (20 s)')); });
  });
}

(async () => {
  if (!URL || !KEY) { console.log('⚠ Enginn Supabase-lykill í js/config.js — sleppt.'); process.exit(0); }
  /* `status` VERÐUR að fylgja með. Fyrsta útgáfan sótti hann ekki, svo
   * `String(s.status||'')` var alltaf tómt og void-sían sprakk aldrei — hann
   * varð rauður á R-000698, ógildri sölu sem fer hvergi. Vörður sem hrópar úlfur
   * á ógilda sölu verður hunsaður, og þá ver hann ekki neitt. */
  const slod = URL + '/rest/v1/solur?select=num,customer_nafn,samtals,status,athugasemdir'
    + '&greitt_med=eq.reikningur&paid_at=is.null&krafa_sent_at=is.null&invoiced_at=is.null'
    + '&dk_invoice_id=is.null&is_credit=is.false&athugasemdir=not.is.null&limit=2000';
  let radir;
  try {
    radir = await saekja(slod);
  } catch (e) {
    // Tómt svar er ekki staðreynd (docs/MAELINGAR.md): sóknarvilla má ALDREI
    // lesast sem „ekkert að" — þá yrði vörðurinn grænn þegar hann sér ekkert.
    console.log('❌ RAUTT: náði ekki í solur (' + (e && e.message) + '). Vörðurinn gat ekki dæmt.');
    process.exit(1);
  }
  const brot = [];
  for (const s of radir) {
    if (String(s.status || '') === 'void') continue;
    const t = String(s.athugasemdir || '');
    if (!t.trim()) continue;
    const hit = BANN.filter(([re]) => re.test(t));
    if (hit.length) {
      brot.push({ num: s.num, nafn: s.customer_nafn, kr: s.samtals,
        hvad: hit.map(([, h]) => h).join(' · '),
        syni: t.replace(/\s+/g, ' ').trim().slice(0, 96) });
    }
  }
  console.log('REIKNINGSTEXTI — `athugasemdir` prentast, `krafa_note` er innri');
  if (!brot.length) {
    console.log('✅ GRÆNT: engin ósend krafa ber innri texta í athugasemdir (' + radir.length + ' skoðaðar).');
    process.exit(0);
  }
  brot.forEach(b => {
    console.log('  ❌ ' + b.num + '  ' + String(b.nafn || '').slice(0, 30).padEnd(30) +
                Number(b.kr || 0).toLocaleString('is-IS').padStart(10) + ' kr  — ' + b.hvad);
    console.log('       „' + b.syni + '"');
  });
  console.log('\nRED: ' + brot.length + ' ósend(ar) krafa/kröfur bera texta sem fer á blaðið og í heimabankann.');
  console.log('Færðu hann í `krafa_note` (ℹ-takkinn í Kröfu yfirliti) og skildu `athugasemdir` eftir tóman');
  console.log('eða með viðskiptavina-texta einum: „Heimsókn <dags>" eða lýsingu á verkinu.');
  process.exit(1);
})();
