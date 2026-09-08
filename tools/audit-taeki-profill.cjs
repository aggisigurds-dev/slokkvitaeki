#!/usr/bin/env node
/* Regression net — TÆKI-dálkurinn telur PRÓFÍLINN, staðreyndir eru eftirlit (08.09.2026).
 *
 * Agnar: „Tækjastaðan á forsíðunni verður að telja úr því sem inn á company profile.
 * og company profill verður að stemma við annaðhvort invoice eða úttektarskýrslu …
 * Það verður að setja eitthvað eftirlit með þessu og losna í eitt skiptið fyrir öll."
 *
 * Dæmið: Steypustöðin – Hólabrú (#1727) sýndi 5 SLT / 1 BSL á Fyrirtæki í þjónustu
 * (úr arsskodun_report_facts) meðan fyrirtækjasíðan sagði „Slökkvitæki (0)".
 *
 * Proves (SOURCE, 153-arsskodun.js):
 *   (1) Skýrslu-/reikninga-staðreyndir yfirskrifa ALDREI _ars.equipment / _unit_count —
 *       gamla „_fromReport"-brautin er horfin.
 *   (2) Eftirlitið er til: _misraemi reiknað úr eqGroups(prófíll) vs normFactEq(skýrsla/
 *       reikningur), ⚠-merkið (misraemiMark) teiknað í BÁÐUM reitum, sían 'misraemi' til.
 *   (3) Reikninga-staðreyndir (uttekt_reikningur_facts) sóttar — „annaðhvort invoice eða
 *       úttektarskýrslu".
 *   (4) Borðið teiknar eftir HVERJA hleðslu sem breytir gögnum (repaintIfChanged í lok
 *       _loadAllInner) og bíður eftir Supabase-client í stað þess að skila tómu.
 *   (5) Lifandi tæki EIN OG SÉR setja fyrirtæki ekki „í þjónustu" (153 inService / 157 _hasArs).
 *
 * DATA (lesaðeins, publishable key): fjöldi í-þjónustu staða sem stemma hvorki við skýrslu
 * né reikning — UPPLÝSANDI (gögn, ekki kóði); rautt AÐEINS ef sóknin sjálf bilar.
 */
const fs = require('fs');
const path = require('path');

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }

const ars = fs.readFileSync(path.join(__dirname, '..', 'js/patches/153-arsskodun.js'), 'utf8');
const av  = fs.readFileSync(path.join(__dirname, '..', 'js/patches/157-allir-vidskiptavinir.js'), 'utf8');

// (1) staðreyndir yfirskrifa ekki töluna
if (/_ars\._fromReport\s*=\s*true/.test(ars)) fail('153 setur _fromReport aftur — skýrslu-staðreyndir yfirskrifa TÆKI-töluna.');
if (/_ars\.equipment\s*=\s*eqp\b/.test(ars)) fail('153 skrifar skýrslu-equipment (eqp) í _ars.equipment.');
if (!/if \(units\.length && !manual\.equipment_manual\) \{/.test(ars)) fail('153 afleiðir ekki lengur tækjatölu úr uttaeki (units) — prófíllinn er heimildin.');

// (2) eftirlitið
if (!/_ars\._misraemi\s*=\s*!manual\.equipment_manual && !_factSrc\.some\(f => f\.ok\)/.test(ars)) fail('153 reiknar ekki _misraemi (prófíll vs skýrsla/reikningur).');
if (!/function normFactEq\(/.test(ars)) fail('153 vantar normFactEq — reikninga-lyklar (brunaslanga, reykskynjari, duft, co2) teljast ekki eins og prófíllinn.');
if (!/function misraemiMark\(/.test(ars)) fail('153 vantar misraemiMark.');
if ((ars.match(/\$\{misraemiMark\(ars\)\}/g) || []).length < 2) fail('⚠-merkið er ekki teiknað í báðum reitum (spjald + tafla).');
if (!/state\.status === 'misraemi'/.test(ars)) fail('153 vantar síuna misraemi.');
if (!/v: 'misraemi'/.test(ars)) fail('153 vantar flöguna „⚠ Stemmir ekki".');

// (3) reikninga-staðreyndir
if (!/from\('uttekt_reikningur_facts'\)/.test(ars)) fail('153 sækir ekki uttekt_reikningur_facts — „annaðhvort invoice eða úttektarskýrslu" vantar reikninginn.');

// (4) teikna eftir hleðslu + bíða eftir client
if (!/repaintIfChanged\(\);\s*\n\s*\}/.test(ars)) fail('153 kallar ekki repaintIfChanged() í lok _loadAllInner.');
if (!/for \(let i = 0; !SB && i < 40; i\+\+\)/.test(ars)) fail('153 bíður ekki eftir Supabase-client í _loadAllInner (skilar tómu við ræsingu).');

// (5) lifandi tæki ein og sér = ekki í þjónustu
if (/return hasArs \|\| hasBru \|\| hasUnits;/.test(ars)) fail('153 inService telur tæki ein og sér sem þjónustu aftur.');
if (/\|\| unitCount > 0,/.test(av)) fail('157 _hasArs telur tæki ein og sér sem þjónustu aftur.');

// DATA — upplýsandi
(async () => {
  const h = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  const get = async (q) => {
    const r = await fetch(SUPA + '/rest/v1/' + q, { headers: h });
    if (!r.ok) throw new Error(q.split('?')[0] + ' HTTP ' + r.status);
    return r.json();
  };
  try {
    const co = await get('fyrirtaeki?select=id&er_i_thjonustu=eq.true&deleted_at=is.null&limit=2000');
    const ids = new Set(co.map(c => String(c.id)));
    const groups = (eq) => {
      const g = { slt: 0, bsl: 0, rs: 0 };
      Object.entries(eq || {}).forEach(([k0, v]) => {
        const n = +v || 0; if (!n) return;
        const k = String(k0).toLowerCase();
        if (/brunasl|hose/.test(k)) g.bsl += n;
        else if (/reyksk|smoke/.test(k)) g.rs += n;
        else if (/lettv|léttv|abf|fro|duft|abc|pfc|co2|kols/.test(k)) g.slt += n;
      });
      return g;
    };
    const prof = {};
    for (let from = 0; ; from += 1000) {
      const rows = await get(`uttaeki?select=fyrirtaeki_id,type&status=neq.urelt&fyrirtaeki_id=not.is.null&order=id&offset=${from}&limit=1000`);
      rows.forEach(u => {
        const k = String(u.fyrirtaeki_id); if (!ids.has(k)) return;
        const t = String(u.type || '').toLowerCase();
        const g = prof[k] = prof[k] || { slt: 0, bsl: 0, rs: 0 };
        if (/brunasl|hose/.test(t)) g.bsl++;
        else if (/reyksk|smoke/.test(t)) g.rs++;
        else if (/lettv|léttv|abf|fro|duft|abc|pfc|co2|kols/.test(t)) g.slt++;
      });
      if (rows.length < 1000) break;
    }
    const rep = await get('arsskodun_report_facts?select=fyrirtaeki_id,report_year,equipment&parse_ok=eq.true&order=report_year.desc&limit=2000');
    const inv = await get('uttekt_reikningur_facts?select=fyrirtaeki_id,invoice_year,equipment&order=invoice_date.desc&limit=2000');
    const facts = {};
    rep.forEach(f => { const k = String(f.fyrirtaeki_id); (facts[k] = facts[k] || []).push(groups(f.equipment)); });
    const seenInv = new Set();
    inv.forEach(f => { const k = String(f.fyrirtaeki_id); if (seenInv.has(k)) return; seenInv.add(k); (facts[k] = facts[k] || []).push(groups(f.equipment)); });
    let mis = 0, empty = 0;
    ids.forEach(k => {
      const fs_ = (facts[k] || []).filter(g => g.slt || g.bsl || g.rs);
      if (!fs_.length) return;
      const p = prof[k] || { slt: 0, bsl: 0, rs: 0 };
      const ok = fs_.some(g => g.slt === p.slt && g.bsl === p.bsl && g.rs === p.rs);
      if (!ok) { mis++; if (!p.slt && !p.bsl && !p.rs) empty++; }
    });
    console.log(`GREEN: TÆKI = prófíll (uttaeki á fyrirtaeki_id); staðreyndir eru eftirlit. Gögn núna: ${mis} í þjónustu stemma hvorki við skýrslu né reikning (þar af ${empty} með tóman prófíl) — sjá „⚠ Stemmir ekki" á Fyrirtæki í þjónustu.`);
  } catch (e) {
    fail('gagnasókn brást: ' + (e && e.message));
  }
})();
