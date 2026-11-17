#!/usr/bin/env node
/* BEGIN-TO-END SAFETY TEST — run before every push.
 *
 * Runs every tools/audit-*.cjs and reports whether the safety net still holds.
 * Each audit is GREEN at/below its known BASELINE of already-existing bad rows,
 * and RED if the count grew — meaning a guard leaked or new bad data appeared.
 *
 * GREEN (exit 0) → safe to push.  RED (exit 1) → a guarantee broke; fix first.
 *
 * This is Agnar's "run begin-to-end test if it will hold." See docs/ORYGGISNET.md.
 * A new invariant? Drop a tools/audit-<name>.cjs next to the others — it is picked
 * up here automatically.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// --static: aðeins verðir sem lesa kóðann og þurfa hvorki net né lykla. Notað í
// pre-push-hooknum svo ýting stöðvist ekki þótt netið sé niðri eða hægt — CI
// keyrir allt settið á eftir. Greint á fetch( í skránni, ekki á handlista, svo
// nýr vörður flokkist sjálfkrafa rétt.
const adeinsStatic = process.argv.includes('--static');

const dir = __dirname;
let audits = fs.readdirSync(dir)
  .filter(f => /^audit-.*\.cjs$/.test(f) && f !== 'audit-all.cjs')
  .sort();

const alls = audits.length;
// Gagnavörður = les lifandi gögn. Greint á þremur merkjum, ekki aðeins fetch( —
// 17.11.2026: sjö gagnaverðir láku inn í kóða-netið af því þeir ná í gögn um
// `node:https` (reikningstexti) eða sameiginlegan hjálpara (`_grunnlina-syn.cjs`:
// krafa-ekki-send, kredit-an-endurgerdar, skeytamidlun-vantar, skodun-gleymd,
// taekjatolur-misraemi, verk-an-reiknings). Gagnadrift felldi þá ýtingu kóða sem
// snerti ekkert af því. Þeir keyra áfram í fullu settinu (CI-gagnaþrepið).
//   1. fetch(  ·  2. require('https'/'http'/'node:https'/'node:http')
//   3. require('./_hjalpari.cjs') sem sjálfur er gagnavörður (endurkvæmt).
// Gervislóðir (`https://x.supabase.co`) í textastreng gera vörð EKKI að gagnaverði.
const NET_MERKI = /fetch\s*\(|require\(\s*['"](?:node:)?https?['"]\s*\)/;
const _netMinni = new Map();
function notarNet(f, leid = new Set()) {
  if (_netMinni.has(f)) return _netMinni.get(f);
  if (leid.has(f)) return false;                       // hringtilvísun — ekki net af þeim sökum
  leid.add(f);
  let txt = '';
  try { txt = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (_) { return false; }
  let svar = NET_MERKI.test(txt);
  if (!svar) {
    const re = /require\(\s*['"]\.\/(_[^'"]+?)(?:\.cjs)?['"]\s*\)/g;
    let m;
    while (!svar && (m = re.exec(txt))) svar = notarNet(m[1] + '.cjs', leid);
  }
  _netMinni.set(f, svar);
  return svar;
}
// 17.11.2026 — flokkun falls. Áður réð SÍÐASTA lína: margir verðir prenta RED-línuna og svo ráðleggingu („Ekki hækka
// grunnlínuna …"), og aðrir prenta aðeins lista og hætta með exit 1 — 7 af 19 gagnarauðum skráðust því sem „villa" í
// oryggisnet_keyrslur og úrskurðurinn faldist. Nú: tímaút og hrun (stack trace) eru „villa"; annað fall er úrskurður
// („rautt"), og fyrsta RED/RAUTT-línan er skilaboðin ef hún er til.
function flokka(e, out) {
  const linur = String(out || '').split('\n').filter(Boolean);
  const timaut = !!e && (e.code === 'ETIMEDOUT' || /ETIMEDOUT/.test(String(e.message || '')));
  const hrun = /^\s+at .+:\d+(:\d+)?\)?\s*$/m.test(String(out || '')) && /\b\w*Error\b/.test(String(out || ''));
  const raudLina = linur.find((l) => /^\s*(❌\s*)?RED\b|\bRED:|❌ RAUTT|^\s*RAUTT/.test(l));
  const stada = timaut || hrun ? 'villa' : 'rautt';
  const skilabod = (stada === 'rautt' && raudLina) || linur.slice(-1)[0] || (e && e.message) || 'error';
  return { stada, skilabod };
}
module.exports = { notarNet, flokka };
if (require.main !== module) return;

if (adeinsStatic) {
  audits = audits.filter(f => !notarNet(f));
}

if (!audits.length) { console.log('No audits found.'); process.exit(0); }

// --skra: skrifa niðurstöðu hvers varðar í `oryggisnet_keyrslur` svo Jarvis-síðan
// (brunaholf/jarvis.html) sjái stöðuna og SÖGUNA. Það sem vantaði 09.09.2026 var
// ekki staðan — hún fékkst með því að keyra — heldur hvenær vörður varð rauður og
// hvað olli því. Skrifin mega aldrei fella keyrsluna: vörður sem virkar en nær
// ekki að skrá sig er samt vörður.
const skra = process.argv.includes('--skra');
const uppruni = (process.argv.find(a => a.startsWith('--uppruni=')) || '').split('=')[1] || 'handvirkt';

console.log(`🔌 Öryggisnet — begin-to-end test (${audits.length}` +
  (adeinsStatic ? ` af ${alls} — aðeins kóða-verðir` : ' audits') + ')\n');
let failed = 0;
const nidurstodur = [];
// 18.09.2026 — CI-bilanir voru ólæsilegar utan frá: logg-endapunkturinn krefst
// admin-réttinda (403), svo eina sem sást var „Process completed with exit code 1".
// `annotations` er hins vegar opið á opinberu repói, svo hver rauð niðurstaða er
// skrifuð þangað. Aðeins í CI; staðbundin keyrsla er óbreytt.
const iCI = !!process.env.GITHUB_ACTIONS;
const einLina = s => String(s).replace(/\r?\n/g, ' ').replace(/%/g, '%25').slice(0, 800);
const merkja = (teg, titill, texti) => {
  if (!iCI) return;
  console.log('::' + teg + ' title=' + einLina(titill).replace(/[,:]/g, ' ') + '::' + einLina(texti));
};
// 17.11.2026 — TÍMAÚT ER EKKI ÚRSKURÐUR. Undir álagi (margar lotur á sömu vél) féllu 8 af 77 kóða-vörðum á 60 s
// tímaúti (spawnSync ETIMEDOUT) án þess að nokkuð væri að kóðanum, og stöðvuðu ýtingu. Sjálfheilun: vörður sem tímist
// út fær EITT endurkall með 3× fresti. Standist hann þá er hann grænn, merktur „eftir tímaút“; tímist hann aftur út
// er það skráð sem villa (ekki rautt) svo flökt og raunveruleg bilun aðgreinist í sögunni.
const FRESTUR = +process.env.AUDIT_FRESTUR_MS || 60000;   // umhverfisbreytan aðeins fyrir test/audit-all-static.test.cjs
const keyraVord = (a, ms) => execFileSync('node', [path.join(dir, a)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: ms });
const erTimaut = (e) => !!e && (e.code === 'ETIMEDOUT' || /ETIMEDOUT/.test(String(e.message || '')));
for (const a of audits) {
  process.stdout.write('  ' + a.padEnd(30) + ' ');
  const t0 = Date.now();
  try {
    let out, endurkall = false;
    try { out = keyraVord(a, FRESTUR); } catch (e1) { if (!erTimaut(e1)) throw e1; endurkall = true; out = keyraVord(a, FRESTUR * 3); }
    const last = (out.trim().split('\n').filter(Boolean).pop() || 'ok') + (endurkall ? ' (eftir tímaút — endurkallað)' : '');
    console.log('✅  ' + last.slice(0, 90));
    nidurstodur.push({ audit: a, stada: 'graent', skilabod: last.slice(0, 400), ms: Date.now() - t0 });
  } catch (e) {
    failed++;
    const out = String((e.stdout || '') + (e.stderr || '')).trim();
    const { stada, skilabod: last } = flokka(e, out);
    console.log('❌  ' + last.slice(0, 90));
    merkja('error', a, last);
    nidurstodur.push({
      audit: a,
      stada,
      skilabod: last.slice(0, 400), ms: Date.now() - t0
    });
  }
}
console.log(`\n${failed ? '❌ ' + failed + ' of ' + audits.length + ' RED — a guarantee broke. Fix before pushing (see docs/ORYGGISNET.md).'
                       : '✅ All ' + audits.length + ' green — the net holds.'}`);
merkja(failed ? 'error' : 'notice', 'Öryggisnet',
  (failed ? failed + ' af ' + audits.length + ' RAUÐIR: ' : 'Allir ' + audits.length + ' grænir. ') +
  nidurstodur.filter(x => x.stada !== 'graent').map(x => x.audit + ' -> ' + x.skilabod.slice(0, 120)).join(' | '));

if (skra) {
  (async () => {
    try {
      const cfg = fs.readFileSync(path.join(dir, '..', 'js/config.js'), 'utf8');
      const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
      const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                  (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
      const keyrslaId = (require('crypto').randomUUID)();
      const sha = (process.env.GITHUB_SHA || '').slice(0, 7) || null;
      const vel = process.env.RUNNER_NAME || require('os').hostname();
      const r = await fetch(URL_ + '/rest/v1/oryggisnet_keyrslur', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(nidurstodur.map(n => ({
          ...n, keyrsla_id: keyrslaId, uppruni, commit_sha: sha, vel
        })))
      });
      console.log(r.ok ? `📝 Skráð í oryggisnet_keyrslur (${nidurstodur.length} raðir, uppruni: ${uppruni})`
                       : `⚠️  Náði ekki að skrá keyrsluna (${r.status}) — vörðurinn gildir samt.`);
    } catch (e) {
      console.log('⚠️  Náði ekki að skrá keyrsluna: ' + e.message + ' — vörðurinn gildir samt.');
    } finally {
      process.exit(failed ? 1 : 0);
    }
  })();
} else {
  process.exit(failed ? 1 : 0);
}
