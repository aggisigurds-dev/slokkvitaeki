#!/usr/bin/env node
'use strict';
/* TÝNT BAKSKÁSTRIK Í LEITARMYNSTRI — `\d`, `\s`, `\w` sem urðu að `d`, `s`, `w`.
 *
 * Af hverju þessi vörður er til (10.11.2026): 31.10 fannst `/^Viðbótarúttekt við (R-d+)/` í payday-push.cjs
 * og `/^R-0d{5}$/` í 488 — `d` er þá bókstafurinn d, mynstrið passar aldrei og „Viðbót við R-…" fór aldrei á
 * Payday-kröfuna. Enginn tók eftir því: mynstrið þýðist, kastar engu og skilar bara „ekkert fannst".
 * Leit að sama mynstri víðar 10.11 fann þrjá staði til viðbótar, einn þeirra kominn í loftið SAMA DAG:
 *   478 „Vista mynd": `.replace(/s+/g, ' ')` → hvert „s" í skráarnafninu varð að bili
 *        („Teikning Dalshraun 10 Hús" → „Teikning Dal hraun 10 Hú "),
 *   404: `[─-◿]` + `s*` (í stað `\s*`) → bil stóð eftir fremst í takkatexta,
 *        (ATH: mynstrið sjálft má ekki standa hér — `s*` + skástrik lokar þessari athugasemd)
 *   brunaholf ajour-myndayfirlit.cjs: `.replace(/s+/g, '_')` → „s" í möppuheiti varð að „_".
 *
 * HVAÐAN VILLAN KEMUR: bakskástrikið týnist þegar kóði fer í gegnum streng á leiðinni í skrána —
 *   • `sed 's/…/…\s+…/'` (GNU sed sleppir óþekktu `\x` í útskiptitexta),
 *   • JS-strengur eða template (`'\d'` === 'd'), t.d. `node -e` eða kóði sem er límdur inn í streng,
 *   • `new RegExp('\d+')` — í streng verður að skrifa `\\d`.
 * Skrifaðu mynstur með Edit/Write eða úr skrá — og keyrðu þennan vörð.
 *
 * Mælir: hvern regex-literal (`/…/flögg`) og hvern `RegExp('…')`-streng í js/, netlify/functions/, tools/ og
 * *.html hér og í systur-repóinu (Brunahólf, ef það er við hliðina). Grunsamlegt er `d+ d* d{N s+ s* w+ w*`
 * (og hástafir) sem stendur EKKI á eftir bókstaf, og `s*` á eftir bókstaf þar sem ekki-bókstafur fylgir
 * („Teiknings*["). Stafaklasar `[…]` og `\x`-runur eru teknar út áður en leitað er.
 *
 * GRÆNT þegar ekkert finnst utan LEYFT. Nýtt tilvik = RAUTT: lagaðu mynstrið, eða — sé það viljandi —
 * bættu því í LEYFT með ástæðu. Aldrei til að þagga niður.
 *
 * Keyrsla:  node tools/audit-regex-bakstrik.cjs          (--listi sýnir líka það sem er leyft)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LISTI = process.argv.includes('--listi');

// Viljandi eða óútkljáð — skrá (frá rót repós) + mynstrið orðrétt. Línunúmer eru ekki notuð: þau hreyfast.
const LEYFT = [
  { skra: 'tools/audit-skraarnofn-dags.cjs', mynstur: '\\$\\{d+\\}',
    af: 'viljandi: leitar að breytu sem heitir d eða dd í template (`${dd}/${mm}`)' },
  { skra: 'js/patches/153-arsskodun.js', mynstur: 'h(ó|o)w*',
    af: 'óútkljáð: „hæ hó"-prufufærslusían. `\\w*` myndi líka fella „hæ hopp…" — þrengra mynstrið tapar engri ' +
        'raunverulegri nótu. 153 er vörðuð leið; ekki breyta án Agnars og netvarðar.' },
];

function finnaSystur() {
  const frambod = [
    process.env.BRUNAHOLF_ROOT,
    path.join(ROOT, '..', 'brunaholf'),
    path.join(ROOT, '.sister', 'brunaholf'),
  ].filter(Boolean);
  return frambod.find((p) => fs.existsSync(path.join(p, 'netlify', 'functions'))) || null;
}

const SLEPPA = /(^|\/)(node_modules|dist|graphify-out|vendor|backups|_attic|lib|\.git|\.sister|test-results)(\/|$)|\.min\.js$|jspdf|pdf\.worker|leaflet|qrcode/i;
function skrar(rot) {
  const ut = [];
  (function ganga(dir, dypt) {
    let efni;
    try { efni = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of efni) {
      const full = path.join(dir, e.name), rel = path.relative(rot, full).split(path.sep).join('/');
      if (SLEPPA.test(rel)) continue;
      if (e.isDirectory()) { if (dypt < 6) ganga(full, dypt + 1); continue; }
      if (rel === 'tools/audit-regex-bakstrik.cjs') continue;   // dæmin í hausnum hér eru villan sjálf
      if (/\.(js|cjs|mjs|html)$/.test(e.name)) ut.push(rel);
    }
  })(rot, 0);
  return ut;
}

// Regex-literal: `/` sem stendur ekki á eftir gildi (orði, `)` eða `]`), og endar á flöggum + greinarmerki.
const LIT = /(?<![\w)\]])\/(?![\/*\s])((?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^\/\\\n\[])+)\/([gimsuy]{0,6})(?=\s*[.,;)\]}:]|\s*$)/g;
// Ein yfirferð frá vinstri: `\x`-runa fyrst (svo `\[` opni ekki gervi-klasa sem gleypir það sem á eftir kemur), þá `[…]`.
const RUNA_EDA_KLASI = /\\.|\[(?:\\.|[^\]\\])*\]/g;
const GRUNUR = /(?:(?<![A-Za-zÀ-ÿ])[dswDSW][+*]|(?<![A-Za-zÀ-ÿ])[dw]\{\d|(?<=[A-Za-zÀ-ÿ])s\*(?=[^A-Za-zÀ-ÿ]|$))/;
const RX_STRENGUR = /RegExp\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
const STAKT = /(?<!\\)\\[dswbDSWB]/;

function leita(rot, merki) {
  const fundid = [];
  for (const rel of skrar(rot)) {
    let txt;
    try { txt = fs.readFileSync(path.join(rot, rel), 'utf8'); } catch (_) { continue; }
    if (txt.length > 6e6) continue;
    const linur = txt.split('\n');
    for (let i = 0; i < linur.length; i++) {
      const l = linur[i];
      if (l.length > 4000 || l.indexOf('/') < 0) continue;
      let m;
      LIT.lastIndex = 0;
      while ((m = LIT.exec(l))) {
        const beint = m[1].replace(RUNA_EDA_KLASI, (x) => (x[0] === '\\' ? '■' : '□'));
        if (GRUNUR.test(beint)) fundid.push({ repo: merki, skra: rel, lina: i + 1, mynstur: m[1] });
      }
      RX_STRENGUR.lastIndex = 0;
      while ((m = RX_STRENGUR.exec(l))) {
        if (STAKT.test(m[2])) fundid.push({ repo: merki, skra: rel, lina: i + 1, mynstur: 'RegExp-strengur: ' + m[2].slice(0, 70) });
      }
    }
  }
  return fundid;
}

const SYSTIR = finnaSystur();
const allt = leita(ROOT, 'sl').concat(SYSTIR ? leita(SYSTIR, 'bh') : []);
const erLeyft = (f) => LEYFT.find((a) => f.repo === 'sl' && a.skra === f.skra && f.mynstur.indexOf(a.mynstur) > -1);
const leyfd = allt.filter(erLeyft), brot = allt.filter((f) => !erLeyft(f));

if (LISTI) {
  for (const f of leyfd) console.log(`   (leyft) ${f.repo} ${f.skra}:${f.lina}  /${f.mynstur}/  — ${erLeyft(f).af}`);
}
// Leyfi sem ekkert passar lengur við er dautt leyfi — segja frá því, en ekki fella á því.
const daud = LEYFT.filter((a) => !leyfd.some((f) => a.skra === f.skra && f.mynstur.indexOf(a.mynstur) > -1));
for (const a of daud) console.log(`   ⚠ LEYFT-færsla passar ekki lengur við neitt: ${a.skra}  /${a.mynstur}/ — taktu hana út`);

if (brot.length) {
  for (const f of brot) console.log(`   ✗ ${f.repo} ${f.skra}:${f.lina}  /${f.mynstur}/`);
  console.log(`RAUTT regex-bakstrik: ${brot.length} leitarmynstur þar sem \\d / \\s / \\w virðist hafa týnt bakskástrikinu — ` +
    'd, s eða w er þá BÓKSTAFUR og mynstrið passar ekki við það sem til stóð. Lagaðu, eða bættu í LEYFT með ástæðu.');
  process.exit(1);
}
console.log(`✅ GRÆNT regex-bakstrik: ekkert týnt bakskástrik í leitarmynstrum (${leyfd.length} leyfð með ástæðu` +
  (SYSTIR ? ' · Brunahólf lesið með' : ' · ⚠ Brunahólf ekki við hliðina — aðeins þetta repó lesið') + ')');
