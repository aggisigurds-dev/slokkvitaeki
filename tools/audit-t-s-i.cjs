#!/usr/bin/env node
'use strict';
/* T = S = I — tækin á prófílnum eiga að vera jöfn úttektarskýrslunni og reikningnum.
 *
 * Regla Agnars, orðrétt 09.09.2026:
 *   "Aðal regla með það og fullkomið fact check að Tækin inn á prófíl er jafnt
 *    úttektarskýrslu og jafnt við invoice. T=S=I. Það sé líka grunnurinn sem
 *    restin af síðunni á að líta til."
 *
 * Af hverju vörðurinn er til: hann sagði "tækjalistinn hefur oft verið að detta út
 * úr fyrirtækjaprófílunum en samt sýna tölu á ársskoðunarsíðunni". Mæling staðfesti
 * það strax:
 *
 *   454 félög með skýrslutölu
 *   301 stemma  (T = S)
 *    43 PRÓFÍLL TÓMUR en skýrslan sýnir tölu   <- nákvæmlega kvörtunin
 *   110 báðar til en ósammála
 *   ---
 *   153 brot af 454.   T alls 3.813   S alls 4.456   =  643 tækja munur
 *
 * audit-taeki-profill.cjs er GRÆNN yfir þessu — hann staðfestir aðeins að prófíllinn
 * lesi uttaeki, hann ber aldrei saman við skýrsluna. T=S=I var hvergi þvingað.
 *
 * HVAÐ ER HVAÐ
 *   T  uttaeki á fyrirtaeki_id (status <> urelt)     — prófíllinn, raunverulegu tækin
 *   S  app_settings.arsskodun_customers[fid].equipment — talið upp úr úttektarskýrslu
 *   I  úttektarreikningur ársins                      — það sem var rukkað
 *
 * AÐFERÐ VIÐ GÖMLU SKULDINA
 * Grunnlína sem ein tala myndi fela 153 félög á bak við eitt númer, og það er
 * nákvæmlega þöggunin sem þessi verkfærakista á að lækna. Í staðinn er gamla
 * skuldin skrifuð sem NAFNGREINDUR listi í tools/_t-s-i-grunnlina.json:
 *   • nýtt misræmi  -> RAUTT strax
 *   • þekkt misræmi -> talið upp, fellir ekki, og listinn á að styttast
 * Þegar félag er lagað fellur það sjálfkrafa út. Listinn getur aldrei vaxið þögult.
 *
 * Keyrsla:  node tools/audit-t-s-i.cjs
 *           node tools/audit-t-s-i.cjs --skra-grunnlinu   (endurskrifar snjómyndina)
 * Read-only á gögnin. Notar publishable-lykilinn úr js/config.js (RLS).
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const GRUNNLINA_SKRA = path.join(__dirname, '_t-s-i-grunnlina.json');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

async function sb(slod) {
  const r = await fetch(URL_ + '/rest/v1/' + slod, { headers: H });
  if (!r.ok) throw new Error(slod.slice(0, 70) + ' -> ' + r.status);
  return r.json();
}

(async () => {
  const skraGrunnlinu = process.argv.includes('--skra-grunnlinu');

  // ---- S: skýrslutalan úr app_settings ------------------------------------
  const stillingar = await sb('app_settings?select=settings&limit=1');
  const ars = (stillingar[0] && stillingar[0].settings && stillingar[0].settings.arsskodun_customers) || {};

  const S = new Map();
  for (const [fid, gogn] of Object.entries(ars)) {
    const bunadur = gogn && gogn.equipment;
    if (!bunadur || typeof bunadur !== 'object') continue;
    const summa = Object.values(bunadur).reduce((a, b) => a + (Number(b) || 0), 0);
    S.set(String(fid), { summa, skyrsla: (gogn._skyrsla || '').slice(0, 60) });
  }

  // ---- T: raunveruleg tæki á prófílnum ------------------------------------
  const T = new Map();
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(URL_ + '/rest/v1/uttaeki?select=fyrirtaeki_id,status', {
      headers: { ...H, Range: `${fra}-${fra + 999}` }
    });
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    for (const t of b) {
      if (t.status === 'urelt' || t.fyrirtaeki_id == null) continue;
      const k = String(t.fyrirtaeki_id);
      T.set(k, (T.get(k) || 0) + 1);
    }
    if (b.length < 1000) break;
  }

  // ---- Bera saman ---------------------------------------------------------
  const misraemi = [];
  for (const [fid, s] of S) {
    const t = T.get(fid) || 0;
    if (t !== s.summa) misraemi.push({ fid, T: t, S: s.summa, skyrsla: s.skyrsla });
  }
  misraemi.sort((a, b) => Math.abs(b.T - b.S) - Math.abs(a.T - a.S));

  if (skraGrunnlinu) {
    fs.writeFileSync(GRUNNLINA_SKRA, JSON.stringify({
      skrad: new Date().toISOString().slice(0, 10),
      skyring: 'Þekkt T<>S misræmi. Listinn á AÐEINS að styttast. Nýtt fid hér inn = RAUTT.',
      felog: misraemi.map(m => m.fid).sort()
    }, null, 1), 'utf8');
    console.log(`📌 Grunnlína skráð: ${misraemi.length} félög í ${path.basename(GRUNNLINA_SKRA)}`);
    return;
  }

  let thekkt = [];
  try { thekkt = JSON.parse(fs.readFileSync(GRUNNLINA_SKRA, 'utf8')).felog || []; }
  catch { fail('Grunnlínuskrá vantar. Keyrðu: node tools/audit-t-s-i.cjs --skra-grunnlinu'); }
  const thekktSet = new Set(thekkt.map(String));

  const nytt = misraemi.filter(m => !thekktSet.has(m.fid));
  const lagad = thekkt.filter(f => !misraemi.some(m => m.fid === String(f)));

  if (nytt.length) {
    nytt.slice(0, 10).forEach(m =>
      console.log(`   fyrirtaeki ${m.fid}: prófíll ${m.T} tæki, skýrsla ${m.S}` +
        (m.skyrsla ? `  (${m.skyrsla})` : '')));
    fail(`${nytt.length} NÝTT brot á T=S — félög sem stemmdu áður gera það ekki lengur. ` +
      `Þekkt frá fyrri mælingu: ${misraemi.length - nytt.length}.`);
  }

  const tomirProfilar = misraemi.filter(m => m.T === 0 && m.S > 0).length;
  console.log(`✅ GRÆNT T=S: ekkert nýtt misræmi. Þekkt eftir: ${misraemi.length} félög` +
    (tomirProfilar ? ` (${tomirProfilar} með tóman prófíl en tölu á Ársskoðun)` : '') +
    (lagad.length ? ` · ${lagad.length} lagað síðan grunnlínan var skráð 👏` : ''));
})().catch(e => fail(e.message));
