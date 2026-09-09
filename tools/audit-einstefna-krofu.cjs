#!/usr/bin/env node
/* VÖRÐUR: „→ Í kröfu" er EINSTEFNA og fimmta sýnin má ekki lekast inn í
 * kröfuleiðina (09.09.2026).
 *
 * Nýja sýnin „🔍 Sést hvergi" í `166-krofu-yfirlit.js` fékk hnapp sem setur
 * `greitt_med = 'reikningur'` svo vinna sem ENGIN sýn gat sýnt komist í
 * venjulega kröfuflæðið. Sú umbreyting er EINSTEFNA (Agnar 20.05.2026, sjá
 * minnið „Billing workflow: greitt_sidar vs reikningur"): reikningur-sala getur
 * þegar borið skuldbindingar niður eftir keðjunni — krafa í bunka, reikningsnúmer
 * úthlutað — og má því ALDREI vera flett til baka með einum smelli.
 *
 * Hættan er ekki kóðinn eins og hann er í dag heldur NÆSTA lota: einhver bætir
 * við „afhaka"-takka af góðum hug (nákvæmlega eins og `197-bokhald-yfirferd.js`
 * gerði með `greitt_med_prev`) og einstefnan er þar með horfin þegjandi. Þessi
 * vörður les kóðann og sannar að hún standi.
 *
 * FJÓRAR fullyrðingar, allar á `js/patches/166-krofu-yfirlit.js`:
 *   1. Í ALLRI skránni er NÁKVÆMLEGA EIN skrifleið á `greitt_med` og hún skrifar
 *      strengbókstafinn 'reikningur'. Engin breyta, ekkert `greitt_med_prev`.
 *   2. Orðið `greitt_med_prev` kemur hvergi fyrir — geymsla á fyrra gildi er
 *      eina leiðin til að smíða afturkall, svo hún er bönnuð hér.
 *   3. Harða sían `.eq('greitt_med', 'reikningur')` stendur ÓBREYTT á
 *      kröfu-fyrirspurninni — fimmta sýnin bætti við, umskrifaði ekki.
 *   4. 'sesthvergi'-greinin tekur við ÁÐUR en sú fyrirspurn er smíðuð (línunúmer),
 *      svo hin fjögur sjónarhornin geti ekki lent á röngu gagnasetti.
 *
 * … og EIN mæling á lifandi gögnum:
 *   5. Sían sem sýnin notar má aldrei skila kreditfærslu né MÓÐUR kreditfærslu.
 *      Mælt 09.09.2026: kreditfærslurnar 36 bera allar neikvæða `samtals` og
 *      detta út á `samtals > 0` — væri `credit_of` safnað úr því setti einu
 *      (eins og 166 gerir annars staðar) slyppu ÞRJÁR bakfærðar mæður inn og
 *      litu út eins og ósótt vinna, þ.á m. 20.524 kr félag.
 *
 * 6. (bætt við 09.09.2026, sama dag) ALLT `js/`-tréð: engin skrá má skrifa
 *    `greitt_med` aftur í 'greitt_sidar'. Fyrsta útgáfa varðarins NEFNDI
 *    `197-bokhald-yfirferd.js` sem dæmi um brotið en MÆLDI það ekki — og þar var
 *    það raunverulega, í `saveKrafa()`: að taka hakið af skrifaði
 *    `greitt_med: row.greitt_med_prev || 'greitt_sidar'`. Einn smellur og salan
 *    hvarf úr Kröfu yfirlitinu, án viðvörunar. Það var tekið út sama dag;
 *    hakið kveikir núna en slekkur ekki. Reglan á við allan kóðann, ekki eina skrá.
 *
 * Lesandi, opinber lykill. GRUNNLÍNA = 0 — hvert frávik er raunveruleg afturför.
 */
const fs = require('fs');
const path = require('path');

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const SKRA = path.join(__dirname, '..', 'js', 'patches', '166-krofu-yfirlit.js');
const JS_ROT = path.join(__dirname, '..', 'js');
// Nýtt gildi við STOFNUN sölu er löglegt — drög verða til sem `greitt_sidar`
// (t.d. 122-samningshafar-receive:565, sem fyrsta útgáfa flaggaði ranglega).
// Það sem er BANNAÐ er að SNÚA VIÐ sölu sem er þegar komin í `reikningur`.
// Tvennt ber þess merki og hvorugt á sér löglega mynd:
//   a) `greitt_med_prev` — geymsla á fyrra gildi er til þess EINS gerð að
//      geta farið til baka. Það var vélbúnaðurinn í 197.
//   b) `.update(...)` sem skrifar `greitt_med` í `greitt_sidar` í sömu setningu.
// Blindi bletturinn (viljandi): patch-hlutur smíðaður í einni setningu og
// uppfærður í annarri, án `greitt_med_prev`. Sá sem skrifar slíkt er ekki að
// gera það óvart — og liður 1 grípur hann í 166, þar sem hættan er mest.
function afturfaerslurITrenu() {
  const brot = [];
  (function ganga(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (/node_modules|[\\/]dist[\\/]|\.min\.js/.test(f)) continue;
      if (e.isDirectory()) { ganga(f); continue; }
      if (!f.endsWith('.js')) continue;
      const rel = path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');
      const ls = fs.readFileSync(f, 'utf8').split(/\r?\n/);
      ls.forEach((l, i) => {
        const hreint = l.replace(/\/\/.*$/, '');
        // a) vélbúnaður afturkalls
        if (/greitt_med_prev\s*[:=]|\.greitt_med_prev/.test(hreint)) {
          brot.push(rel + ':' + (i + 1) + '  [greitt_med_prev] ' + l.trim().slice(0, 90));
          return;
        }
        // b) update sem skrifar greitt_sidar í sömu setningu
        if (!/greitt_med\s*:/.test(hreint) || !/greitt_sidar/.test(hreint)) return;
        const gluggi = ls.slice(Math.max(0, i - 4), i + 5).join(' ');
        if (/\.update\s*\(/.test(gluggi)) {
          brot.push(rel + ':' + (i + 1) + '  [update→greitt_sidar] ' + l.trim().slice(0, 84));
        }
      });
    }
  })(JS_ROT);
  return brot;
}

async function sok(p) {
  const r = await fetch(SUPA + '/rest/v1/' + p, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  if (!r.ok) throw new Error(p + ' → ' + r.status + ' ' + (await r.text()).slice(0, 160));
  return r.json();
}
async function allar(p) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    const r = await fetch(SUPA + '/rest/v1/' + p, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Range: f + '-' + (f + 999) },
    });
    if (!r.ok) throw new Error(p + ' → ' + r.status);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

(async () => {
  const fails = [];
  const src = fs.readFileSync(SKRA, 'utf8');
  const linur = src.split(/\r?\n/);

  // ── 1 · ein skrifleið, og hún skrifar 'reikningur' ────────────────────────
  // Aðeins raunverulegar úthlutanir í hlut sem fer í .update()/.insert():
  // `greitt_med: <eitthvað>`. Sleppum `select(...)`-strengjum og athugasemdum.
  // Athugasemdalínur eru blankaðar; hlut-úthlutun verður að standa á eftir `{`
  // eða `,` svo prósa („greitt_med = reikningur" í hjálpartexta) valdi ekki
  // fölsku rauðu — röng viðvörun er verri en engin.
  const skrif = [];
  linur.forEach((l, i) => {
    const hreint = l.replace(/^\s*(\/\/|\*).*$/, '');
    if (/\.select\(/.test(hreint)) return;
    const m = hreint.match(/(?:[{,]|^)\s*greitt_med\s*:\s*([^,}\n]+)/);
    if (!m) return;
    skrif.push({ nr: i + 1, gildi: m[1].trim(), texti: hreint.trim() });
  });
  if (skrif.length !== 1) {
    fails.push(`greitt_med-skrifleiðir í 166: ${skrif.length}, á að vera NÁKVÆMLEGA 1.\n` +
      skrif.map(s => `      lína ${s.nr}: ${s.texti}`).join('\n'));
  } else if (!/^'reikningur'$|^"reikningur"$/.test(skrif[0].gildi)) {
    fails.push(`greitt_med er skrifað sem \`${skrif[0].gildi}\` (lína ${skrif[0].nr}) — má AÐEINS vera strengbókstafurinn 'reikningur'. Breyta þarna = einstefnan er farin.`);
  }

  // ── 2 · ekkert greitt_med_prev ────────────────────────────────────────────
  // Aðeins RAUNVERULEG notkun telur — úthlutun (`greitt_med_prev:` / `=`) eða
  // lestur (`.greitt_med_prev`). Nafnið eitt í athugasemd er ekki afturkall.
  const prev = linur.map((l, i) => ({ l, nr: i + 1 }))
    .filter(x => /greitt_med_prev\s*[:=]|\.greitt_med_prev/.test(x.l));
  if (prev.length) {
    fails.push('`greitt_med_prev` er NOTAÐ í 166 (línur ' + prev.map(x => x.nr).join(', ') +
      ') — geymsla á fyrra greiðslumáta er byrjunin á afturkalli. Einstefnan leyfir það ekki.');
  }

  // ── 3 · harða kröfu-sían stendur ──────────────────────────────────────────
  const siaNr = linur.findIndex(l => /\.eq\(\s*'greitt_med'\s*,\s*'reikningur'\s*\)/.test(l));
  if (siaNr < 0) {
    fails.push("Harða sían `.eq('greitt_med', 'reikningur')` fannst EKKI í kröfu-fyrirspurninni — sýnirnar fjórar hafa verið umskrifaðar, ekki bætt við.");
  }

  // ── 4 · 'sesthvergi' tekið FYRIR fyrirspurnina ────────────────────────────
  const greinNr = linur.findIndex(l => /===\s*'sesthvergi'/.test(l));
  if (greinNr < 0) {
    fails.push("Greinin fyrir 'sesthvergi' fannst ekki í load() — fimmta sýnin á sína eigin leið og verður að taka við sjálf.");
  } else if (siaNr >= 0 && greinNr > siaNr) {
    fails.push(`'sesthvergi'-greinin (lína ${greinNr + 1}) kemur EFTIR kröfu-fyrirspurnina (lína ${siaNr + 1}) — þá lendir hún á röngu gagnasetti.`);
  }

  // ── 6 · ALLT js/-tréð: engin afturfærsla í greitt_sidar ───────────────────
  const afturBrot = afturfaerslurITrenu();
  if (afturBrot.length) {
    fails.push('AFTURFÆRSLA Á greitt_med FANNST (' + afturBrot.length + ') — reglan er einstefna, sjá lið 6 efst:\n' +
      afturBrot.map(b => '      ' + b).join('\n'));
  }

  // ── 5 · lifandi gögn: engin kreditfærsla, engin bakfærð móðir ─────────────
  let lifandi = '';
  try {
    const solur = await allar('solur?select=id,num,customer_nafn,samtals,greitt_med,status,paid_at,krafa_sent_at,invoiced_at,dk_invoice_id,is_credit,credit_of&order=id');
    const kredit = await sok('solur?select=id,credit_of&is_credit=eq.true');
    const modir = new Set(kredit.map(k => k.credit_of).filter(v => v != null).map(String));

    const sian = s =>
      String(s.greitt_med || '') !== 'reikningur' &&
      !s.paid_at && !s.krafa_sent_at && !s.invoiced_at && !s.dk_invoice_id &&
      String(s.status || '') !== 'void' &&
      (parseFloat(s.samtals) || 0) > 0;

    const hrait = solur.filter(sian);                       // án kredit-útilokunar
    const lekaKredit = hrait.filter(s => s.is_credit);
    const lekaModir = hrait.filter(s => modir.has(String(s.id)));
    const hreint = hrait.filter(s => !s.is_credit && !modir.has(String(s.id)));

    if (lekaKredit.length) {
      fails.push('Kreditfærsla kæmist inn í „Sést hvergi": ' +
        lekaKredit.map(s => s.num + ' (id ' + s.id + ')').join(', '));
    }
    // Mæðurnar ERU til í hráa settinu — það er einmitt gildran. Vörðurinn
    // staðfestir að þær séu þekktar og að kóðinn sæki `credit_of` í SÉRfyrirspurn
    // (ekki úr eigin setti, þar sem neikvæðu kreditfærslurnar eru ekki).
    if (!/is_credit['"]?\s*,\s*true|\.eq\(\s*'is_credit'\s*,\s*true\s*\)/.test(src)) {
      fails.push('Kredit-útilokunin í „Sést hvergi" sækir ekki `credit_of` í sérfyrirspurn á `is_credit=true`. ' +
        'Án hennar slyppu ' + lekaModir.length + ' bakfærðar mæður inn og litu út eins og ósótt vinna.');
    }

    const FELAG = /(ehf|hf|slf|sf|ses|ohf|húsfélag|husfelag|samtök|félag|verktakar|stofa)\b/i;
    const felog = hreint.filter(s => FELAG.test(String(s.customer_nafn || '')));
    const kr = n => new Intl.NumberFormat('is-IS').format(Math.round(n));
    const summa = a => a.reduce((x, s) => x + (parseFloat(s.samtals) || 0), 0);
    lifandi = hreint.length + ' sölur / ' + kr(summa(hreint)) + ' kr sjást í sýninni (' +
      felog.length + ' félög / ' + kr(summa(felog)) + ' kr); ' +
      lekaModir.length + ' bakfærðar mæður réttilega útilokaðar';
  } catch (e) {
    fails.push('Náði ekki lifandi mælingu: ' + (e.message || e));
  }

  if (fails.length) {
    console.log('❌ EINSTEFNAN BROTIN (eða fimmta sýnin lekur)\n');
    fails.forEach(f => console.log('  • ' + f));
    console.log('\n  Sjá docs/ORYGGISNET.md og minnið „Billing workflow: greitt_sidar vs reikningur".');
    process.exit(1);
  }
  console.log('✅ GRÆNT einstefna: 166 á EINA greitt_med-skrifleið og hún skrifar \'reikningur\'; ekkert greitt_med_prev; harða sían stendur; \'sesthvergi\' tekið fyrir fyrirspurnina. ' + lifandi + '.');
})().catch(e => { console.error('❌ ' + (e.message || e)); process.exit(1); });
