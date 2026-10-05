#!/usr/bin/env node
/**
 * VÖRÐUR: GAMALT TÆKI MÁ EKKI SKRIFA YFIR SÍÐULISTA APPANNA (261) · KLÍPAN VISTAR EKKI SÍÐUSTÆRÐ (333)
 *
 * 05.10.2026, kl. 12:39:57 (audit_vernd): `app_profiles_json` fór á þjóninum úr 1204 stöfum í 608. Brunakerfi, Boss og
 * þrjú notenda-búin öpp duttu út og allir fengu `defaults` — Agnar: „nú fæ ég líka gamla útgáfu með bara 3 síðum".
 * Rótin: einskiptis-flutningurinn í 261 vann á `loadCfg()` strax við hleðslu skrárinnar, þ.e. á SKYNDIMINNI
 * AppSettings (allt að 30 daga gamalt) eða staðbundna afritinu. Vantaði eitt flagg í það afrit taldist það „breytt",
 * skrifið fór í biðröð (DB ekki til enn) og 20 sekúndum síðar var ALLT gamla afritið sent á þjóninn.
 * Endurgert á lifandi síðunni fyrir lagfæringu (E:\pascal-profun\gamalt-afrit.cjs): 608 stafa skrif eftir 28 s.
 *
 * Sama dag: klípa út (333) vistaði síðustærðina — sem er SAMEIGINLEG öllum símum — og fimm síður fóru beint í 30 %
 * gólfið á 25 mínútum (Agnar: „þá er allt svo smátt og langt á milli").
 *
 * Hér er flutningurinn KEYRÐUR eins og hann stendur í skránni, með gerviþjóni, í fjórum tilvikum — og leitað að því
 * að klípan kalli hvergi á vistun. Les aðeins kóðann (ekkert net, engir lyklar).
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const les = p => fs.readFileSync(path.join(rot, p), 'utf8').replace(/\r/g, '');
const s261 = les('js/patches/261-app-profiles.js'), s333 = les('js/patches/333-app-page-zoom.js');
const villur = [];
const krefst = (src, re, skilabod) => { if (!re.test(src)) villur.push(skilabod); };

// ── flutningurinn, tekinn orðrétt úr skránni ─────────────────────────────────
const ENDIR = '    keyra();\n  })();';
const iInsert = s261.indexOf("insertOnce('__brky1'");
const a = iInsert < 0 ? -1 : s261.lastIndexOf('\n  (function () {\n', iInsert);
const b = iInsert < 0 ? -1 : s261.indexOf(ENDIR, iInsert);
let kodi = null;
if (a < 0 || b < 0) villur.push('261: fann ekki flutnings-blokkina (insertOnce … keyra())');
else kodi = s261.slice(a, b + ENDIR.length);

// thjonn: strengur = gildi þjónsins · null = þjónninn á enga stillingu · undefined = lestur bregst
async function keyrsla(stadbundid, thjonn) {
  const vistad = [], timar = [];
  const svar = thjonn === undefined ? { data: null, error: { message: 'tímaút' } } : { data: { cfg: thjonn }, error: null };
  const DB = { sb: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(svar) }) }) }) } };
  const AppSettings = { save: p => { vistad.push(p); return Promise.resolve(true); } };
  const fn = new Function('window', 'DB', 'AppSettings', 'localStorage', 'loadCfg', 'CFG_KEY', 'setTimeout', kodi);
  fn({ DB, AppSettings }, DB, AppSettings, { setItem() {}, getItem() { return null; } }, () => JSON.parse(stadbundid), 'app_profiles_json', f => { timar.push(f); });
  // þrjár umferðir (1 s á milli í raun) með örbið á milli svo loforðin klárist
  for (let i = 0; i < 3; i++) { await new Promise(r => setImmediate(r)); const f = timar.shift(); if (f) f(); }
  await new Promise(r => setImmediate(r));
  return vistad.map(p => { try { return JSON.parse(p.app_profiles_json); } catch (_) { return { ogilt: true }; } });
}

const FLOGG = { __brky1: 1, __brtv1: 1, __tvk1: 1, __vkp1: 1, __rf2: 1, __jv2: 1, __jv2b: 1, __tvks1: 1, __yfd1: 1, __ds1: 1, __efk1: 1, __efk2: 1, __kst1: 1, __kst2: 1, __bksl1: 1, __tp1: 1, __tp1b: 1, __bord1: 1 };
const THJONN = Object.assign({
  fjarmal: ['krofu-yfirlit', 'sala', 'arsskodun', 'br-gerdreikninga', 'br-efniskostnadur', 'kostnadur'],
  brunaholf: ['br-maeting', 'turbopaint', 'br-dagurinn'],
  boss: ['krofu-yfirlit', 'kostnadur', 'bord', 'br-efniskostnadur'],
  brunakerfi: ['krofu-yfirlit', 'sala', 'slokkvikerfi', 'brunaskra', 'turbopaint'],
  xpostur: ['reikninga-postur']
}, FLOGG);
// sími sem var síðast opnaður í ágúst: engin Boss/Brunakerfi-stilling og fjögur flögg vantar
const GAMALT = { fjarmal: ['krofu-yfirlit', 'arsskodun', 'br-gerdreikninga'], verkefni: ['thjonustubord', 'verkbord'], brunaholf: ['br-maeting', 'br-dagurinn'], __brky1: 1, __brtv1: 1, __tvk1: 1, __vkp1: 1, __rf2: 1, __jv2: 1, __jv2b: 1, __tvks1: 1 };

(async () => {
  if (kodi) {
    try {
      // 1 · gamalt afrit í vafranum, þjónninn þegar fluttur → EKKERT skrifað (þetta er bilunin frá 12:39:57)
      let v = await keyrsla(JSON.stringify(GAMALT), JSON.stringify(THJONN));
      if (v.length) villur.push('261 · tilvik 1: gamalt staðbundið afrit var skrifað á þjóninn (' + v.length + ' skrif' + (v[0].brunakerfi ? '' : ', án Brunakerfis') + ') — flutningurinn má aðeins vinna á gildi sem er lesið af þjóninum');
      // 2 · lestur bregst → EKKERT skrifað (aldrei falla aftur á staðbundna afritið)
      v = await keyrsla(JSON.stringify(GAMALT), undefined);
      if (v.length) villur.push('261 · tilvik 2: skrifað þótt lestur af þjóninum hafi brugðist');
      // 3 · þjónninn á enga stillingu → ekkert skrifað (`defaults` sjá um nýju síðurnar)
      v = await keyrsla(JSON.stringify(GAMALT), null);
      if (v.length) villur.push('261 · tilvik 3: skrifað þótt þjónninn eigi enga vistaða stillingu');
      // 4 · þjóninn vantar flagg í raun → skrifað, OFAN Á gildi þjónsins (annað á listanum stendur óhreyft)
      const vantar = JSON.parse(JSON.stringify(THJONN)); delete vantar.__kst2; vantar.boss = ['krofu-yfirlit', 'bord', 'br-efniskostnadur'];
      v = await keyrsla(JSON.stringify(vantar), JSON.stringify(vantar));
      if (v.length !== 1) villur.push('261 · tilvik 4: raunverulegur flutningur (flagg vantar á þjóninum) á að skrifa einu sinni, skrifaði ' + v.length + ' sinnum');
      else {
        const r = v[0];
        if (!r.__kst2 || (r.boss || []).join(',') !== 'krofu-yfirlit,bord,br-efniskostnadur,kostnadur') villur.push('261 · tilvik 4: flutningurinn setti síðuna ekki inn á réttan stað (' + JSON.stringify(r.boss) + ')');
        if (JSON.stringify(r.brunakerfi) !== JSON.stringify(THJONN.brunakerfi) || JSON.stringify(r.xpostur) !== JSON.stringify(THJONN.xpostur)) villur.push('261 · tilvik 4: flutningurinn hreyfði við öðrum öppum en hann átti við');
      }
    } catch (e) { villur.push('261: flutningurinn keyrir ekki sjálfstætt (' + e.message + ') — prófið þarf loadCfg, CFG_KEY, DB, AppSettings, localStorage, setTimeout'); }
  }

  // ── gamla yfirlitið er ekki lengur heimasíða eða sjálfgefin síða nokkurs apps ─
  krefst(s261, /arr = arr\.map\(function \(k\) \{ return k === 'brunayfirlit' \? 'brunaskra' : k; \}\);/, "261: pagesFor verður að vísa 'brunayfirlit' á 'brunaskra' (aðalútgáfan) — annars detta eldri vistanir á gömlu síðuna");
  if (/k: 'brunayfirlit'/.test(s261)) villur.push("261: 'brunayfirlit' (gamla yfirlitið) má ekki vera í PAGES — tekið úr umferð 05.10.2026");
  if (/(home|defaults): [^\n]*'brunayfirlit'/.test(s261)) villur.push("261: ekkert app má hafa 'brunayfirlit' sem heimasíðu eða í defaults — tæki án vistaðs lista lendir þá á gömlu útgáfunni");
  // ── skelin fylgir listanum þegar hann kemur af þjóninum ──────────────────────
  krefst(s261, /if \(skelSidur\(a\)\.join\('\|'\) !== _skelSidur\) buildShell\(\);/, '261: skelin verður að endurbyggjast þegar síðulistinn af þjóninum er annar en sá sem hún var byggð af (skyndiminni)');

  // ── 333: klípan er tímabundin sýn ────────────────────────────────────────────
  const k0 = s333.indexOf('const klLok = e => {'), k1 = k0 < 0 ? -1 : s333.indexOf('\n  };', k0);
  if (k0 < 0 || k1 < 0) villur.push('333: fann ekki klLok (lok klípu)');
  else {
    const lok = s333.slice(k0, k1).replace(/\/\/[^\n]*/g, '');
    if (/setS\s*\(|vista\s*\(|AppSettings/.test(lok)) villur.push('333: lok klípu má ekki vista síðustærðina (setS/vista) — stærðin er sameiginleg öllum símum; klípan er tímabundin sýn');
  }
  krefst(s333, /if \(lifandi && lifandi\.k === k\) \{ lifandi = null; klMerki\(''\); \}\s+\/\/ vistuð stærð tekur við/, '333: sleðinn (setS) verður að fella tímabundnu klípuna — annars sést vistaða stærðin ekki');
  krefst(s333, /if \(lifandi && !kl && lifandi\.k !== vk && lifandi\.k !== \(g \? 'm:' \+ g\.id : ''\)\) \{ lifandi = null; klMerki\(''\); \}/, '333: tímabundna klípan verður að falla þegar farið er af síðunni');
  // sýnin fyllir skjáinn þótt síðan sé minnkuð (230 neglir height:100vh á .view.active)
  krefst(s333, /height:calc\(100vh \/ min\(1, var\(--app-page-zoom, 1\)\)\)!important/, '333: minnkuð sýn (síðustærð < 100 %) verður að fá hæð 100vh / zoom — annars er neðri hluti skjásins auður og listinn klipptur');

  if (villur.length) { console.log('RED  APP-SÍÐULISTI — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
  console.log('APP-SÍÐULISTI GRÆNT — flutningur síðulistans skrifar aðeins ofan á gildi lesið af þjóninum (4 tilvik keyrð); gamla yfirlitið er hvergi heimasíða; klípa út vistar ekki síðustærð.');
  process.exit(0);
})();
