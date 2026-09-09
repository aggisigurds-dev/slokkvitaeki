#!/usr/bin/env node
/* Öryggisnet — TEXTI MÁ ALDREI TÝNAST (Agnar, 09.09.2026):
 *   „það þarf að fara yfir allar síðurnar, page, undirflokka.
 *    enginn texti má nokkurntíma tínast"
 *
 * Tveir raunverulegir gallar sama dag týndu texta sem notandinn hafði slegið
 * inn. Hvorugur gaf villu; báðir litu út fyrir að virka. Þessi vörður er til
 * svo hvorugur geti laumast inn aftur.
 *
 * ── A. ÓSKILGREINT `SB` Í VISTUNARKALLI ───────────────────────────────────
 * `js/patches/175-rekstrarfelog.js` kallaði `SB.from('fyrirtaeki').update(...)`
 * í scope-i þar sem `SB` var hvergi lýst — einu `SB`-lýsingarnar í skránni voru
 * viðfangsnöfn og breytur inni í SYSTKINAFÖLLUM. Skráin er í strict-ham, svo
 * hvert kall kastaði ReferenceError sem lenti beint í `catch { console.warn }`.
 * Ferðanótan á rekstrarfélögum fór ALDREI í gagnagrunninn — og enginn sá það,
 * því textinn stóð á skjánum þar til síðan var endurteiknuð.
 *
 * ── B. MJÓ FYRIRSPURN SKRIFAR YFIR BREIÐAN LISTA ──────────────────────────
 * `js/patches/114-unified-pos-search.js` sótti 10 súlur úr `fyrirtaeki` og gerði
 * `Companies.list = fy`. `Companies.load()` sækir `select('*')` — 32 súlur.
 * Eftir harða endurhleðslu vann forsóknin kapphlaupið, svo `c.banner_note` var
 * `undefined` þegar spjaldið teiknaðist og athugasemdin birtist TÓM þótt hún
 * stæði óhreyfð í grunninum. Sama gilti um plan_note, review_note, ovisst o.fl.
 * Ekkert eyddist — það SÁST bara ekki, sem er jafn dýrt.
 *
 * Báðar prófanir eru STATÍSKAR (enginn gagnagrunnur, ekkert net) og keyra á
 * sekúndubroti. GRUNNLÍNA = 0 í báðum: hvert nýtt tilvik er raunveruleg
 * afturför og á að lagast áður en ýtt er.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const MOPPUR = ['js', 'js/patches'];

function jsSkrar() {
  const ut = [];
  for (const m of MOPPUR) {
    const d = path.join(ROT, m);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.js')) continue;
      const p = path.join(d, f);
      if (fs.statSync(p).isFile()) ut.push(path.join(m, f).replace(/\\/g, '/'));
    }
  }
  return ut;
}

// Fjarlægir strengi, sniðmát, regex-líkindi og athugasemdir svo svigatalning og
// leit að nöfnum lendi ekki í texta. Gróft en nógu nákvæmt fyrir þessar skrár —
// og villur í átt að ÖRYGGI: strengur sem hverfur getur ekki búið til falskt hak.
function hreinsa(linur) {
  const ut = [];
  let iBlokk = false;
  for (let l of linur) {
    if (iBlokk) { const e = l.indexOf('*/'); if (e < 0) { ut.push(''); continue; } l = l.slice(e + 2); iBlokk = false; }
    let b = l.indexOf('/*');
    while (b >= 0) {
      const e = l.indexOf('*/', b + 2);
      if (e < 0) { l = l.slice(0, b); iBlokk = true; break; }
      l = l.slice(0, b) + l.slice(e + 2); b = l.indexOf('/*');
    }
    l = l.replace(/\\./g, '')
         .replace(/'(?:[^'\\]|\\.)*'/g, "''")
         .replace(/"(?:[^"\\]|\\.)*"/g, '""')
         .replace(/`(?:[^`\\]|\\.)*`/g, '``');
    const c = l.indexOf('//');
    if (c >= 0) l = l.slice(0, c);
    ut.push(l);
  }
  return ut;
}

// ── A ─────────────────────────────────────────────────────────────────────
// Fyrir hvert `<nafn>.from(` finnum við hvort `<nafn>` sé í gildi þar.
//
// MIKILVÆGT: `var` LYFTIST í fall-svið, ekki blokk. Fyrsta útgáfa varðarins
// taldi það blokk-bundið og flaggaði því 199-doc-year-grid ranglega: þar er
// `var sb=SB()` inni í `try{}` ofar í SAMA falli og gildir því áfram. Þess vegna
// er haldið utan um STAFLA af fall-sviðum: `var` festist við innsta FALLIÐ,
// `let`/`const` við blokkina. Uppfletting lítur á allan staflann.
// 175-gallinn sleppur ekki í gegn: þar voru lýsingarnar í SYSTKINA-föllum, sem
// eru löngu farin af staflanum þegar kallið kemur.
const NOFN = ['SB', 'sb'];

function oskilgreindKoll(skra) {
  const hrar = fs.readFileSync(path.join(ROT, skra), 'utf8').split(/\r?\n/);
  const l = hreinsa(hrar);
  const gloss = new Set();                       // window.SB = ... → hnattrænt
  l.forEach(t => { const m = t.match(/window\.(SB|sb)\s*=/); if (m) gloss.add(m[1]); });

  const virk = [];                               // { nafn, dypt }  — let/const/viðföng
  const follStafli = [{ dypt: 0, vars: new Set() }];   // innsta fall síðast
  let dypt = 0;
  const brot = [];
  for (let i = 0; i < l.length; i++) {
    const t = l[i];

    // Ný fall-svið: hver `function` eða `=>` á línunni opnar eitt.
    const nyFoll = (t.match(/function\b|=>/g) || []).length;
    for (let k = 0; k < nyFoll; k++) follStafli.push({ dypt: dypt + 1, vars: new Set() });

    for (const n of NOFN) {
      if (new RegExp('\\bvar\\s+' + n + '\\b').test(t)) {
        follStafli[follStafli.length - 1].vars.add(n);   // lyftist í fallið
      }
      if (new RegExp('\\b(?:let|const)\\s+' + n + '\\b').test(t)) virk.push({ nafn: n, dypt });
      // viðfang falls eða ör-falls: (SB, ...) / (sb) =>
      const vidf = new RegExp('(?:function[^(]*|=>\\s*|\\()\\s*\\([^)]*\\b' + n + '\\b[^)]*\\)');
      if (vidf.test(t) || new RegExp('function[^(]*\\([^)]*\\b' + n + '\\b').test(t)) {
        virk.push({ nafn: n, dypt });
        follStafli[follStafli.length - 1].vars.add(n);
      }
      if (new RegExp('catch\\s*\\(\\s*' + n + '\\s*\\)').test(t)) virk.push({ nafn: n, dypt });
    }

    // Notkun: <nafn>.from(  — það er vistunar/lestrarkall á Supabase.
    for (const n of NOFN) {
      if (!new RegExp('(?:^|[^\\w.$])' + n + '\\s*\\.\\s*from\\s*\\(').test(t)) continue;
      if (gloss.has(n)) continue;
      const iGildi = virk.some(v => v.nafn === n) || follStafli.some(f => f.vars.has(n));
      if (!iGildi) brot.push({ lina: i + 1, texti: hrar[i].trim().slice(0, 96) });
    }

    for (const ch of t) {
      if (ch === '{') dypt++;
      else if (ch === '}') {
        dypt--;
        for (let k = virk.length - 1; k >= 0; k--) if (dypt < virk[k].dypt) virk.splice(k, 1);
        while (follStafli.length > 1 && dypt < follStafli[follStafli.length - 1].dypt) follStafli.pop();
      }
    }
  }
  return brot;
}

// ── B ─────────────────────────────────────────────────────────────────────
// Skrá sem BÆÐI sækir fyrirtaeki/vidskiptavinir með TALDAR súlur OG skrifar
// beint í sameiginlega listann er grunsamleg. Sameining (Object.assign) telst
// lækning: þá geta breiðu súlurnar ekki horfið.
const LISTAR = [
  { eign: /\bCompanies\.list\s*=/, tafla: 'fyrirtaeki' },
  { eign: /\bVidskiptavinir\.list\s*=/, tafla: 'vidskiptavinir' },
];

function mjottYfirBreitt(skra) {
  const texti = fs.readFileSync(path.join(ROT, skra), 'utf8');
  const brot = [];
  for (const { eign, tafla } of LISTAR) {
    if (!eign.test(texti)) continue;
    // Úthreinsun: `.filter(` skilar mjórri RÖÐ, ekki mjórri SÚLU — það er eyðing.
    const eignir = texti.split(/\r?\n/)
      .map((l, i) => ({ l, i }))
      .filter(x => eign.test(x.l) && !/\.filter\s*\(/.test(x.l));
    if (!eignir.length) continue;
    const rx = new RegExp("from\\(\\s*['\"]" + tafla + "['\"]\\s*\\)\\s*[\\s\\S]{0,40}?\\.select\\(\\s*['\"]([^'\"]*)['\"]", 'g');
    let m;
    while ((m = rx.exec(texti))) {
      const sulur = m[1].trim();
      if (sulur === '*') continue;                       // breitt — í lagi
      if (/Object\.assign/.test(texti)) continue;        // sameinar — í lagi
      // Staks-röð uppfletting getur ekki mjókkað listann — hún fyllir hann aldrei.
      // (Fyrsta útgáfa flaggaði þremur slíkum í 00-legacy ranglega.)
      const hali = texti.slice(m.index, m.index + 260);
      if (/\.(?:eq|maybeSingle|single|limit|gte|lte|gt|lt|in|or|ilike|like|neq)\s*\(/.test(hali) && !/\.order\s*\(|fetchAll/.test(hali)) continue;
      brot.push({
        lina: texti.slice(0, m.index).split(/\r?\n/).length,
        tafla,
        sulur: sulur.split(',').length,
        texti: sulur.slice(0, 70),
      });
    }
  }
  return brot;
}

// ── Keyrsla ───────────────────────────────────────────────────────────────
const skrar = jsSkrar();
const aBrot = [];
const bBrot = [];
for (const s of skrar) {
  try {
    oskilgreindKoll(s).forEach(x => aBrot.push({ skra: s, ...x }));
    mjottYfirBreitt(s).forEach(x => bBrot.push({ skra: s, ...x }));
  } catch (e) {
    console.error('Gat ekki lesið ' + s + ': ' + e.message);
  }
}

if (aBrot.length) {
  console.log('\nA. ÓSKILGREINT SB/sb Í .from()-KALLI — kastar ReferenceError í strict-ham:');
  aBrot.forEach(b => console.log('   ' + b.skra + ':' + b.lina + '  ' + b.texti));
}
if (bBrot.length) {
  console.log('\nB. MJÓ FYRIRSPURN SKRIFAR YFIR SAMEIGINLEGAN LISTA — súlur hverfa úr minni:');
  bBrot.forEach(b => console.log('   ' + b.skra + ':' + b.lina + '  ' + b.tafla + ' með aðeins ' + b.sulur + ' súlur: ' + b.texti));
}

const alls = aBrot.length + bBrot.length;
if (alls) {
  console.log('\n❌ TEXTATAP MÖGULEGT — ' + alls + ' tilvik (grunnlína 0). Sjá skýringar efst í tools/audit-textatap.cjs.');
  process.exit(1);
}
console.log('✅ GRÆNT textatap: ' + skrar.length + ' skrár — ekkert óskilgreint SB í .from(), enginn mjór listi yfir breiðan.');
