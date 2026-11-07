'use strict';
/* Sameiginlegur kjarni fyrir sýnaverðina sex (07.11.2026) — LES AÐEINS, skrifar aldrei í gögn.
 * (Heitið byrjar á _ svo audit-all.cjs taki hann ekki sem vörð.)
 *
 * Aðferð = audit-t-s-i.cjs + audit-arsskodun-falskt-graent.cjs: grunntalan er föst efst í hverjum verði
 * (BASELINE_TALA), en SJÁLF grunnlínan er nafngreindur lykla-listi í tools/_grunnlina-syn.json (snjómynd
 * 07.11.2026). Rautt aðeins ef lykill er í sýninni sem var EKKI í snjómyndinni — því talan ein gæti falið nýtt
 * tilvik á bak við eitt sem var leyst. Leyst tilvik detta sjálfkrafa út; listinn getur aldrei vaxið þögult.
 * Endurstilla:  node tools/audit-<nafn>.cjs --skra-grunnlinu   (skrifar aðeins JSON-skrána; engin gögn).
 * Lykill: publishable-lykillinn úr js/config.js (RLS) — sömu leið og hinir verðirnir.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const SKRA = path.join(__dirname, '_grunnlina-syn.json');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

function fail(msg) { console.log('RED: ' + msg); process.exitCode = 1; }
const kr = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';

async function allar(syn) {
  let ut = [];
  for (let f = 0; ; f += 1000) {
    const r = await fetch(URL_ + '/rest/v1/' + syn + '?select=*&offset=' + f + '&limit=1000', { headers: H });
    if (!r.ok) throw new Error(syn + ' -> ' + r.status);
    const d = await r.json();
    if (!Array.isArray(d)) throw new Error(syn + ' skilaði ekki fylki');
    ut = ut.concat(d);
    if (d.length < 1000) break;
  }
  return ut;
}
const lesaSkra = () => { try { return JSON.parse(fs.readFileSync(SKRA, 'utf8')); } catch (e) { return {}; } };

/* v: { syn, merki, baselineTala, baselineUpphaed, baselineDags, lykill(row), upphaed(row)|null, lysing(row), gera } */
async function keyra(v) {
  const rodir = await allar(v.syn);
  const upp = v.upphaed ? rodir.reduce((s, r) => s + (Number(v.upphaed(r)) || 0), 0) : null;
  const lyklar = [...new Set(rodir.map(v.lykill))];

  if (process.argv.includes('--skra-grunnlinu')) {
    const s = lesaSkra();
    s[v.syn] = { dags: new Date().toISOString().slice(0, 10), tala: rodir.length, upphaed: upp, lyklar: lyklar.sort() };
    fs.writeFileSync(SKRA, JSON.stringify(s, null, 1) + '\n');
    console.log('Grunnlína ' + v.syn + ' skráð: ' + rodir.length + ' raðir' + (upp != null ? ', ' + kr(upp) : '')
      + '. Uppfærðu líka BASELINE_* fastana efst í verðinum.');
    return;
  }

  const snjo = lesaSkra()[v.syn];
  if (!snjo) return fail('engin grunnlína fyrir ' + v.syn + ' í tools/_grunnlina-syn.json — keyrðu með --skra-grunnlinu');
  const thekkt = new Set(snjo.lyklar);
  const nytt = rodir.filter(r => !thekkt.has(v.lykill(r)));
  const leyst = snjo.lyklar.length - lyklar.filter(k => thekkt.has(k)).length;
  const nytt$ = v.upphaed ? nytt.reduce((s, r) => s + (Number(v.upphaed(r)) || 0), 0) : null;

  const tala = rodir.length + ' ' + v.merki + (upp != null ? ' = ' + kr(upp) : '')
    + ' (baseline ' + v.baselineTala + (v.baselineUpphaed != null ? ' = ' + kr(v.baselineUpphaed) : '')
    + ' frá ' + v.baselineDags + ')';

  if (nytt.length) {
    console.log(tala);
    console.log('NÝ tilvik (' + nytt.length + (nytt$ != null ? ', ' + kr(nytt$) : '') + '), mest 10:');
    nytt.slice(0, 10).forEach(r => console.log('     ' + v.lysing(r)));
    console.log('HVAÐ Á AÐ GERA: ' + v.gera);
    return fail(nytt.length + ' NÝJAR raðir í ' + v.syn + ' frá ' + v.baselineDags + (nytt$ != null ? ' (' + kr(nytt$) + ')' : '')
      + ' — ' + rodir.length + ' alls, baseline ' + v.baselineTala + '.');
  }
  if (!rodir.length && v.baselineTala > 0) {
    console.log('ATH: sýnin skilaði 0 röðum (baseline ' + v.baselineTala + ') — staðfestu að það sé leyst en ekki tómt RLS-svar.');
  }
  console.log('OK — ' + tala + (leyst > 0 ? '; ' + leyst + ' þekkt leyst síðan' : '') + '; ekkert nýtt í ' + v.syn + '.');
}
module.exports = { keyra, fail, kr };
