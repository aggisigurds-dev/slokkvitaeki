#!/usr/bin/env node
'use strict';
/* HVER TAFINN VISTARI, EKKI HVER SKRÁ — útskolun á að ná til ALLRA bið-tímamæla.
 *
 * Af hverju hann er til (05.10.2026). Agnar: „Auk hvort allt vistist í textabox."
 *
 * `audit-vistun-utskolun.cjs` spyr: TEFUR þessi skrá skrif á þjón, og hefur hún
 * EINHVERJA útskolun? Sú spurning var rétt 09.09 og hún fann níu skrár. En hún er
 * á SKRÁ, og papp 274 sýndi hvað það kostar:
 *
 *   · nótan (`saveNote`, 1.200 ms) var skoluð á `pagehide` frá 22.08  ✓
 *   · verðlínurnar (`vistaSidar`, 900 ms)      — EKKI skolaðar
 *   · blaðið (`vistaBladSidar`, 900 ms)        — EKKI skolaðar
 *
 * Skráin var því GRÆN hjá gamla verðinum — hún hafði `pagehide` — meðan tveir af
 * þrem tofnum vistörum gátu tapað vinnu. Mælt: verðreitirnir vistuðu á `input`
 * með 900 ms töf, og `change` gerði aðeins endursnið, svo papp 365 (sem sendir
 * blur/change/focusout á reitinn í fókus við lokun) hafði ekkert til að kveikja.
 * Slá inn verð og loka glugganum innan 900 ms = breytingin farin, þegjandi.
 *
 * Gamli vörðurinn var of ÞRÖNGUR 09.09 (ein skrá í öðru repói sást ekki).
 * Þessi er of-grófleikinn: réttur mælikvarði er HVER TÍMAMÆLIR, ekki hver skrá.
 *
 * REGLAN: tímamælir sem tefur skrif á þjón verður að vera hreinsaður
 * (`clearTimeout`) inni í útskolunarleið — meðhöndlara á `pagehide`,
 * `visibilitychange`, `blur`, `focusout` eða `change`. Sé hann aðeins hreinsaður
 * í sínu eigin debounce-falli eða á vistunartakka er bið hans óvarin.
 *
 * Keyrsla: node tools/audit-vistun-timarar.cjs
 * Les aðeins kóða — engin gagnatenging.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const MOPPUR = ['js', 'js/patches'];
const ER_SAFN = f => /\.min\.js$|jspdf|leaflet|jsqr|qrcode|supabase|chart|pdf-lib/i.test(f);

const skrar = [];
MOPPUR.forEach(m => {
  let f = []; try { f = fs.readdirSync(path.join(ROT, m)); } catch (_) { return; }
  f.forEach(n => {
    const p = path.join(ROT, m, n);
    try { if (fs.statSync(p).isFile() && /\.js$/.test(n) && !ER_SAFN(n)) skrar.push(m + '/' + n); } catch (_) {}
  });
});

/* Líkami frá fyrsta '{' á eða eftir `frá`, með svigatalningu.
 *
 * `leita` er hámarksfjarlægð fram að slaufusviganum. Án hennar mislas fallið
 * `setTimeout(() => leita(x), 180)` — örvarfall ÁN slaufusviga — og skilaði næsta
 * `{` sem það fann, oft líkama allt annars falls langt fyrir neðan. Þannig fékk
 * leitar-tímamælir í 147 á sig skrif sem var hvergi nærri honum. (05.10.2026)
 */
function likami(s, fra, leita) {
  const i = s.indexOf('{', fra);
  if (i < 0) return '';
  if (leita != null && i - fra > leita) return '';
  let d = 0;
  for (let j = i; j < s.length && j < i + 20000; j++) {
    if (s[j] === '{') d++;
    else if (s[j] === '}') { d--; if (!d) return s.slice(i, j + 1); }
  }
  return s.slice(i, i + 20000);
}
// Líkami nefnds falls.
function fallLikami(s, nafn) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + nafn + '\\s*\\(|\\b' + nafn +
                        '\\s*=\\s*(?:async\\s*)?(?:function\\s*\\(|\\()');
  const m = re.exec(s);
  return m ? likami(s, m.index) : '';
}

/* Hvað er SKRIF? Fyrsta útgáfan taldi hvert `fetch('/api/…')` sem skrif og flaggaði þá
 * tvær LEITIR: `/api/kt-lookup` í 153 og fyrirtækjaleitina í 147. GET sem skilar gögnum
 * tapar engu þótt hann fari aldrei af stað — notandinn slær bara aftur. Þess vegna þarf
 * /api/-kall að bera skrif-aðferð til að telja. (05.10.2026) */
const SKRIF = new RegExp([
  "\\.from\\s*\\(['\"][a-z_]+['\"]\\)\\s*\\.\\s*(?:upsert|insert|update|delete)",
  'AppSettings\\.(?:save|saveVidLokun)',
  "method\\s*:\\s*['\"](?:POST|PATCH|PUT|DELETE)['\"]",
  'rpc\\s*\\(',
].join('|'));
const FLUSH_EV = /addEventListener\s*\(\s*['"](pagehide|visibilitychange|blur|focusout|change)['"]\s*,\s*/g;

const villur = [];
let timarar = 0, skradar = 0;

skrar.forEach(rel => {
  let s = ''; try { s = fs.readFileSync(path.join(ROT, rel), 'utf8'); } catch (_) { return; }
  if (!SKRIF.test(s)) return;
  skradar++;

  // ── Allur texti sem útskolun getur keyrt: líkamar flush-meðhöndlara,
  //    plús líkamar nefndra falla sem þeir kalla á (eitt stig).
  /* `skolunBitar` er LISTI, ekki einn strengur — og það er kjarninn.
   *
   * Fyrsta útgáfan leitaði `clearTimeout(tvar)` í samanlögðum texta allra
   * útskolunarleiða og varð þá blind: debounce-fallið sjálft (`vistaSidar`)
   * hreinsar tímamælinn líka — það er fyrsta línan í hverju debounce — og af því
   * það er kallað úr `change`-hlustara taldist tímamælirinn skolaður. En debounce
   * ENDURVOPNAR hann; það er andstæðan við útskolun. Þess vegna er krafan núna:
   * einhver EINN líkami á útskolunarleið verður að hreinsa tímamælinn OG EKKI
   * setja hann aftur. (05.10.2026)
   */
  const skolunBitar = [];
  const bitaBaeta = (txt) => { if (txt) skolunBitar.push(txt); };
  let m;
  FLUSH_EV.lastIndex = 0;
  while ((m = FLUSH_EV.exec(s))) {
    const eftir = s.slice(m.index + m[0].length, m.index + m[0].length + 60);
    const nefnt = /^\s*([A-Za-z_$][\w$]*)\s*\)/.exec(eftir);
    if (nefnt) {
      // `pagehide, skolaAllt` — og EITT STIG NIÐUR: skolaAllt() kallar oftast á
      // undirvistarana (flushNote, vistaX) og hreinsar tímamælana ÞAR. Án þessa
      // flaggaði vörðurinn 274 þótt pagehide → skolaBkcVidLokun → flushNote
      // hreinsaði `_noteT`. (05.10.2026)
      const b0 = fallLikami(s, nefnt[1]);
      bitaBaeta(b0);
      (b0.match(/\b([a-zA-Z_$][\w$]*)\s*\(/g) || []).forEach(k => {
        const n = k.replace(/\s*\($/, '');
        if (n.length > 3 && !/^(if|for|while|return|function|catch|setTimeout|clearTimeout|parseInt|JSON|Object)$/.test(n)) {
          bitaBaeta(fallLikami(s, n));
        }
      });
    } else {
      const b = likami(s, m.index + m[0].length - 1);
      bitaBaeta(b);
      // kallar meðhöndlarinn á nefnd föll? taktu þau með
      (b.match(/\b([a-zA-Z_$][\w$]*)\s*\(/g) || []).forEach(k => {
        const n = k.replace(/\s*\($/, '');
        if (n.length > 3 && !/^(if|for|while|return|function|catch|setTimeout|clearTimeout|parseInt|JSON)$/.test(n)) {
          bitaBaeta(fallLikami(s, n));
        }
      });
    }
  }
  // `onblur=`/`onchange=` í html-strengjum telst líka leið (365 sendir þau).
  const hefurInnlinuBlur = /\bon(?:blur|focusout|change)\s*=/.test(s);

  // ── Finndu tímamæla sem tefja SKRIF ──────────────────────────────────────
  const re = /([A-Za-z_$][\w$.]*)\s*=\s*setTimeout\s*\(/g;
  let t;
  while ((t = re.exec(s))) {
    const tvar = t[1];
    if (/^(window|self)\./.test(tvar)) continue;
    // Slaufusviginn verður að vera STRAX á eftir — annars er þetta örvarfall án hans.
    const b = likami(s, t.index + t[0].length - 1, 24);
    let efni = b;
    if (!b) {
      // setTimeout(nafn, 900)  eða  setTimeout(() => eitthvad(x), 900)
      const haus = s.slice(t.index, t.index + 240);
      const n = /setTimeout\s*\(\s*([A-Za-z_$][\w$]*)\s*,/.exec(haus);
      if (n) efni = fallLikami(s, n[1]);
      else {
        const orv = /setTimeout\s*\(\s*\([^)]*\)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(/.exec(haus);
        efni = orv ? fallLikami(s, orv[1]) : '';
      }
    } else {
      // Aðeins föll sem HEITA eins og vistun. Fyrsta útgáfan dró inn líkama ALLRA
      // kallaðra falla og flaggaði þá leitar-tímamæla (`_leitT`, `_qT`, geocode) sem
      // tefja LESTUR en kalla á `teikna()` sem einhvers staðar skrifar. Vörður sem
      // gelgir að ósekju verður þaggaður — sama lexía og í audit-vistun-utskolun.
      const VISTUNARNAFN = /save|sync|vista|persist|skrif|flush|upsert|skola|commit/i;
      (b.match(/\b([a-zA-Z_$][\w$]*)\s*\(/g) || []).forEach(k => {
        const n = k.replace(/\s*\($/, '');
        if (n.length > 3 && VISTUNARNAFN.test(n)) efni += fallLikami(s, n);
      });
    }
    if (!SKRIF.test(efni)) continue;                       // tefur ekki SKRIF — sleppum

    /* HVAR ER LÍNAN DREGIN: tapist dálkabreidd, þysjun eða opin/lokuð spjöld er
     * handtakið endurtakanlegt — notandinn dregur aftur. INNSLEGINN TEXTI er það
     * ekki; hann er farinn. Agnar spurði um textaboxin, og það er sama greinarmun
     * og „enginn texti má nokkurntíma tínast" gerir. Þess vegna er krafan aðeins
     * gerð á tímamæla sem bera INNSLÁTT: kveiktir frá `input`/`keyup`/`paste`
     * (eða innlínu `oninput`). 319-column-drag og 333-app-page-zoom tefja skrif en
     * bera bendil-handtök, ekki texta — þeir eru ekki gagnatap.
     */
    const fallSemSetur = (() => {
      // nafn fallsins sem tímamælirinn er settur í (debounce-fallið)
      const fyrir = s.slice(Math.max(0, t.index - 4000), t.index);
      const m2 = [...fyrir.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
      return m2.length ? m2[m2.length - 1][1] : null;
    })();
    let fraInnslaetti = /\bon(?:input|keyup|paste)\s*=/.test(s);
    if (!fraInnslaetti) {
      const ire = /addEventListener\s*\(\s*['"](input|keyup|paste)['"]\s*,/g;
      let im;
      while ((im = ire.exec(s))) {
        const b2 = likami(s, im.index + im[0].length - 1) ||
                   s.slice(im.index, im.index + 400);
        if (b2.indexOf(tvar) > -1 || (fallSemSetur && b2.indexOf(fallSemSetur) > -1)) { fraInnslaetti = true; break; }
      }
    }
    if (!fraInnslaetti) continue;

    timarar++;
    // Hreinsar einhver biti tímamælinn ÁN þess að setja hann aftur? Það er útskolun.
    const endurvopnar = new RegExp(tvar.replace(/[.$]/g, '\\$&') + '\\s*=\\s*setTimeout');
    const hreinsadIskolun = skolunBitar.some(b =>
      (b.indexOf('clearTimeout(' + tvar + ')') > -1 || b.indexOf('clearTimeout( ' + tvar + ' )') > -1) &&
      !endurvopnar.test(b));
    // `hefurInnlinuBlur` er VILJANDI ekki undanþága hér: eitt `onblur=` á ótengdum reiti
    // annars staðar í skránni má ekki hvítþvo tímamæli sem engin blur-leið snertir. Það var
    // einmitt skrár-stigs blindan sem þessi vörður er til að leysa. Hann er aðeins notaður
    // til að greina innslátt (oninput) hér fyrir ofan.
    if (!hreinsadIskolun) {
      const lina = s.slice(0, t.index).split('\n').length;
      villur.push(rel + ':' + lina + '  tímamælirinn `' + tvar + '` tefur skrif á þjón en er ekki hreinsaður ' +
                  'í neinni útskolunarleið (pagehide/visibilitychange/blur/focusout/change). ' +
                  'Loki notandinn, skipti um app eða læsi símanum á meðan hann bíður fer skrifið aldrei af stað.');
    }
  }
});

console.log('TAFIN VISTUN — ' + timarar + ' bið-tímamælar sem skrifa á þjón, í ' + skradar + ' skrám');
if (!villur.length) {
  console.log('✅ GRÆNT: hver einasti þeirra er hreinsaður í útskolunarleið.');
  process.exit(0);
}
villur.forEach(v => console.log('  ❌ ' + v));
console.log('\nRED: ' + villur.length + ' óvarinn bið-tímamælir. „Enginn texti má nokkurntíma tínast."');
process.exit(1);
