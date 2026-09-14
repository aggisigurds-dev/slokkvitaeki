'use strict';
/* Athugasemda-hreinsir kóða-varðanna (tools/audit-*.cjs).
 *
 * Vörður sem leitar að mynstri í kóða verður að hunsa athugasemdir — athugasemd
 * sem LÝSIR villunni er ekki villan — en má ALDREI hunsa kóða. Fyrri hreinsirinn
 * (tvö regex, afrituð í fjóra verði) tók `/*` og `//` inni í streng, sniðmáti eða
 * regex-lesgildi sem upphaf athugasemdar. `accept="image/*"` á
 * js/patches/09-verkdagbok-attachments.js:265 tæmdi þannig línur 265–459, og
 * audit-pagination sá aldrei `.limit(2000)` á línu 399. Mælt 14.09.2026 á 369
 * skrám í js/: úttak gamla hreinsisins þýddist ekki í 20 skrám (hann klippti
 * kóða), úttak þessa þýðist í þeim öllum (vm.Script).
 *
 * Báðir hreinsar skipta athugasemd út fyrir bil og halda lengd og línuskilum, svo
 * línunúmer og stafastöður í niðurstöðum varðanna haldast réttar.
 */

// JavaScript: les '…', "…", `…${…}…` (hreiðrað) og regex-lesgildi.
function anAthugasemdaJs(s) {
  const ut = s.split('');
  const n = s.length;
  const tomt = (a, b) => { for (let k = a; k < b; k++) if (s[k] !== '\n' && s[k] !== '\r') ut[k] = ' '; };
  const stafli = [];                  // dýpt slaufusviga þar sem hvert opið ${ … } hófst
  let dypt = 0, i = 0, sidast = '';   // sidast = síðasti marktæki stafur í kóða
  const snidmat = () => {             // les sniðmát þar til ` lokar því eða ${ opnar kóða
    while (i < n) {
      if (s[i] === '\\') { i += 2; continue; }
      if (s[i] === '`') { i++; return; }
      if (s[i] === '$' && s[i + 1] === '{') { stafli.push(dypt); dypt++; i += 2; return; }
      i++;
    }
  };
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') { let e = s.indexOf('\n', i); if (e < 0) e = n; tomt(i, e); i = e; continue; }
    if (c === '/' && d === '*') { let e = s.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; tomt(i, e); i = e; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < n && s[i] !== c && s[i] !== '\n') i += s[i] === '\\' ? 2 : 1;
      i++; sidast = c; continue;
    }
    if (c === '`') { i++; snidmat(); sidast = '`'; continue; }
    if (c === '}' && stafli.length && stafli[stafli.length - 1] === dypt - 1) {
      stafli.pop(); dypt--; i++; snidmat(); sidast = '`'; continue;
    }
    if (c === '{') dypt++;
    else if (c === '}') dypt--;
    if (c === '/') {                  // regex-lesgildi eða deiling? Ræðst af því sem fór á undan.
      const fyrir = ut.slice(Math.max(0, i - 12), i).join('');
      if (!sidast || '(,=:[!&|?{};+-*%<>~^'.includes(sidast) ||
          /(?:^|[^\w$])(?:return|typeof|case|do|else|in|of|new|delete|void|throw|instanceof|yield|await)\s*$/.test(fyrir)) {
        i++;
        let flokkur = false;
        while (i < n && s[i] !== '\n') {
          if (s[i] === '\\') { i += 2; continue; }
          if (s[i] === '[') flokkur = true;
          else if (s[i] === ']') flokkur = false;
          else if (s[i] === '/' && !flokkur) { i++; break; }
          i++;
        }
        while (i < n && /[a-z]/i.test(s[i])) i++;
        sidast = ')';
        continue;
      }
    }
    if (!/\s/.test(c)) sidast = c;
    i++;
  }
  return ut.join('');
}

// CSS: aðeins /* … */ utan strengja. `//` er ekki athugasemd í CSS (url(//cdn…))
// og þar eru engin regex-lesgildi.
function anAthugasemdaCss(s) {
  const ut = s.split('');
  const n = s.length;
  let i = 0;
  while (i < n) {
    const c = s[i];
    if (c === '"' || c === "'") {
      i++;
      while (i < n && s[i] !== c && s[i] !== '\n') i += s[i] === '\\' ? 2 : 1;
      i++; continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      let e = s.indexOf('*/', i + 2); e = e < 0 ? n : e + 2;
      for (let k = i; k < e; k++) if (s[k] !== '\n' && s[k] !== '\r') ut[k] = ' ';
      i = e; continue;
    }
    i++;
  }
  return ut.join('');
}

module.exports = { anAthugasemdaJs, anAthugasemdaCss };
