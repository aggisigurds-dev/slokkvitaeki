#!/usr/bin/env node
/* VÖRÐUR: vafra-staða (06.09.2026) — „sama villan á ekki að geta gerst nema einu sinni".
 *
 * Rót (Agnar 05.09.2026): „Krafa send"-merkið í Kröfu yfirliti bjó í state.ui.ky_sent_mark
 * (hub_state, sent í heilu lagi) → 4 tölvur í sama rými yfirskrifuðu hver aðra. Reglan sem
 * kom út úr því (CLAUDE.md beggja repóa, „SAMSTILLT MILLI VÉLA"): staða gagna skrifast á
 * þjóninn, aldrei aðeins í localStorage/sessionStorage/state.ui; þau eru fyrir útlit og
 * skyndiminni.
 *
 * Þessi vörður gerir tvennt, á BÁÐUM repóum (systkinamöppur ../slokkvitaeki og ../brunaholf):
 *   1. BANNMYNSTUR — kóðinn sem var lagaður má ekki koma aftur (RAUTT strax).
 *   2. GRUNNLÍNA — fjöldi ólíkra vafra-lykla (localStorage/sessionStorage setItem + state.ui.X =)
 *      má ekki VAXA. Nýr lykill = meðvituð ákvörðun: annaðhvort er hann útlit/skyndiminni og
 *      grunnlínan er hækkuð hér með rökstuðningi í commit, eða gögnin fara á þjóninn.
 *
 * GRÆNT (exit 0) við/undir grunnlínu og engin bannmynstur. RAUTT (exit 1) annars.
 * Keyrist sjálfkrafa í tools/audit-all.cjs. Úttektin sjálf: brunaholf/docs/UTTEKT-VAFRASTADA-20260905.txt
 */
const fs = require('fs');
const path = require('path');

const HER = path.resolve(__dirname, '..');                 // slokkvitaeki
const BH = path.resolve(__dirname, '..', '..', 'brunaholf');
const skip = /node_modules|[\\/]dist[\\/]|[\\/]_attic[\\/]|graphify-out|\.min\.js|[\\/]backup|[\\/]\.git[\\/]|[\\/]\.next[\\/]|[\\/]tools[\\/]|[\\/]docs[\\/]|[\\/]sql[\\/]/;

// ── 1. Bannmynstur — nákvæmar leifar af villunum sem voru lagaðar ─────────────
const BANN = [
  { repo: 'brunaholf', skra: 'index.html', re: /toggleSentMark\(/, hvad: 'Krafa send-merkið aftur í state.ui (toggleSentMark)' },
  { repo: 'brunaholf', skra: 'index.html', re: /state\.ui\.ky_sent_mark\s*=\s*SENTMARK/, hvad: 'Krafa send skrifað í state.ui.ky_sent_mark' },
  { repo: 'brunaholf', skra: 'index.html', re: /^\s*state = server;\s*$/m, hvad: 'hub_state skipt út í HEILU lagi (state = server) í stað sameiningar per lykil' },
  { repo: 'brunaholf', skra: 'index.html', re: /localStorage\.getItem\('email_to'\)\|\|to/, hvad: 'netfang bókara lesið úr localStorage í stað ky_settings' },
  { repo: 'brunaholf', skra: 'netlify/functions/app-state.js', re: /const \{ key, value \} = body;/, hvad: 'app-state POST án patch-greinar (hub_state_merge)' },
  { repo: 'brunaholf', skra: 'index.html', re: /body: JSON\.stringify\(\{ key:'hub_state', value: state \}\)/, hvad: 'syncToServer sendir allt state-objectið skilyrðislaust' },
];

// ── 2. Grunnlína — fjöldi ÓLÍKRA vafra-lykla per repó (mælt 06.09.2026) ────────
//    Hækkaðu aðeins með rökstuðningi í commit-skilaboðum. Lækkun er alltaf í lagi.
const GRUNNLINA = { brunaholf: { ls: 58, ui: 49 }, slokkvitaeki: { ls: 149, ui: 0 } };

function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (skip.test(p)) continue;
    if (e.isDirectory()) walk(p, out); else if (/\.(html|js)$/.test(e.name)) out.push(p);
  }
  return out;
}
function lyklar(dir) {
  const ls = new Set(), ui = new Set();
  for (const f of walk(dir, [])) {
    let s; try { s = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const m of s.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*(?:['"`]([^'"`]+)['"`]|([A-Za-z_$][\w$]*))/g)) ls.add(m[1] || ('<' + m[2] + '>'));
    for (const m of s.matchAll(/state\.ui\.([a-zA-Z_]\w*)\s*(?:=(?!=)|\[[^\]]+\]\s*=(?!=))/g)) ui.add(m[1]);
  }
  return { ls: ls.size, ui: ui.size, lsSet: ls };
}

let raudt = 0; const linur = [];
for (const b of BANN) {
  const root = b.repo === 'brunaholf' ? BH : HER; const f = path.join(root, b.skra);
  if (!fs.existsSync(f)) continue;
  if (b.re.test(fs.readFileSync(f, 'utf8'))) { raudt++; linur.push('❌ BANNMYNSTUR ' + b.repo + '/' + b.skra + ': ' + b.hvad); }
}
const nidurstodur = [];
for (const [nafn, dir] of [['brunaholf', BH], ['slokkvitaeki', HER]]) {
  if (!fs.existsSync(dir)) { linur.push('⚠ ' + nafn + ' ekki til á þessari vél — sleppt'); continue; }
  const k = lyklar(dir); const g = GRUNNLINA[nafn];
  const ok = k.ls <= g.ls && k.ui <= g.ui;
  if (!ok) raudt++;
  nidurstodur.push(`${nafn} ls ${k.ls}/${g.ls} ui ${k.ui}/${g.ui}${ok ? '' : ' ⬆ NÝR VAFRA-LYKILL — er þetta staða gagna? þá á þjóninn'}`);
}
for (const l of linur) console.log(l);
console.log((raudt ? '❌ RAUTT' : '✅ GRÆNT') + ' vafra-staða: ' + nidurstodur.join(' · ') + ' · bannmynstur ' + (raudt ? 'fundust' : '0'));
process.exit(raudt ? 1 : 0);
