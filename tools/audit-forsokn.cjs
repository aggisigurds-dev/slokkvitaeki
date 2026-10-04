#!/usr/bin/env node
/**
 * VÖRÐUR: FORSÓKN (441) — köll prófílsins send samtímis við opnun, án þess að gögn geti orðið röng eða gömul.
 *
 * Agnar 03.10.2026: „við þurfum að fara svo mikið fram og til baka inn á prófíla." / 04.10: „Já byrja á nr 1."
 *
 * MÆLT 04.10.2026 (staðbundin bygging, Chrome 1600 px, sömu fimm fyrirtæki með og án, tími frá músarhnappi niður):
 *     Skjöl-spjaldið teiknað     án forsóknar 1.443–2.000 ms     með 677–862 ms   (eitt stærra fyrirtæki 1.644 → 1.333)
 * Ástæðan var ekki hægt net heldur RÖÐ: köllin fóru út í bylgjum í 2,5 s og síðustu níu biðu hvert eftir öðru.
 *
 * Forsóknin er ágiskun á slóðir. Hún er örugg AÐEINS meðan þessar reglur halda — hver þeirra er varin hér:
 *   1. NÁKVÆM SLÓÐ. Svar er aðeins afhent kalli með sömu aðferð, slóð og Range/Prefer/Accept-hausum. Engin sía er
 *      endurútfærð í vafranum (sama regla og 378 og rest-samnyting). Röng ágiskun = eitt ónotað kall, aldrei rangt svar.
 *   2. SKRIF TÆMA. Allt nema GET/HEAD á Supabase og á /api · /.netlify/functions tæmir forsóknina fyrir skrif OG eftir.
 *      Undanskilin eru aðeins skrif sem snerta ekkert sem hér er geymt: app_settings og húsmyndar-uppflettingin.
 *   3. SNERTING TÆMIR. Fyrsti músarhnappur eða lykill eftir opnun tæmir — lestur sem notandi setur af stað (vistun,
 *      „lesa ferskt fyrir vistun") er því alltaf ferskur.
 *   4. STUTT LÍF. Mest 5 s, og 2 s eftir fyrstu notkun.
 *   5. ALDREI app_settings, rpc, AbortSignal né cache:'no-store'; aðeins 2xx-svör eru notuð.
 *   6. Snertiskjár forsækir ekki við pointerdown (hvert skrun byrjar á röð).
 *
 * SOURCE-only, engin net-köll. Fall: exit 1.
 */
const fs = require('fs');
const path = require('path');
const ROT = path.join(__dirname, '..');
const lesa = rel => fs.readFileSync(path.join(ROT, rel), 'utf8');
const villur = [];
let src = '';
try { src = lesa('js/patches/441-forsokn.js').replace(/\r/g, ''); } catch (_) { villur.push('js/patches/441-forsokn.js vantar'); }
const krefst = (re, skilabod) => { if (src && !re.test(src)) villur.push('441: ' + skilabod); };

if (src) {
  const idx = lesa('index.html').replace(/\r/g, '');
  const i431 = idx.indexOf('431-uppferslubord.js'), i378 = idx.indexOf('378-vinnutolva.js'), i441 = idx.indexOf('441-forsokn.js');
  if (i441 < 0) villur.push('index.html: 441-forsokn.js er ekki hlaðinn');
  else if (i441 < i431 || i441 < i378) villur.push('index.html: 441 verður að hlaðast Á EFTIR 378 og 431 — forsóknin á að fara í gegnum skyndiminnið og hliðið, ekki framhjá');

  // 1 · nákvæm slóð + hausar í lyklinum
  krefst(/const lykillAf = \(adferd, slod, r, p, a, ap\) => adferd \+ ' ' \+ slod \+ '\|' \+ r \+ '\|' \+ p \+ '\|' \+ a \+ '\|' \+ ap;/, 'lykillinn verður að vera aðferð + ÖLL slóðin + Range/Prefer/Accept/Accept-Profile');
  krefst(/const f = forsott\.get\(k\);/, 'svar má aðeins finna eftir nákvæmum lykli');
  if (src && /JSON\.parse\(|\.filter\(.*\beq\b/.test(src.split('// ── fetch-lagið')[1] || '')) villur.push('441: fetch-lagið má ekki lesa né sía svör — aðeins afhenda afrit');
  krefst(/sv => \(sv && sv\.ok\) \? sv\.clone\(\) : innra\.apply\(th, rok\)/, 'aðeins 2xx-svör má afhenda (afrit); annars fer kallið á netið');

  // 2 · skrif tæma, fyrir og eftir; ekkert forsótt meðan skrif er á leiðinni
  krefst(/if \(\(okkar \|\| fall\) && !sjalfvirkt && !ohad\) \{\s*taema\(\);\s*skrifIGangi\+\+;/, 'skrif verður að tæma forsóknina ÁÐUR en það fer');
  krefst(/const lok = \(\) => \{ skrifIGangi = Math\.max\(0, skrifIGangi - 1\); taema\(\); \};/, 'skrif verður að tæma AFTUR þegar það klárast');
  krefst(/if \(slokkt \|\| skrifIGangi > 0\) return;/, 'ekkert má forsækja meðan skrif er á leiðinni');
  // undanþágurnar mega ekki víkka
  const m = /const ohad = ([^;]+);/.exec(src);
  if (!m) villur.push('441: ohad-skilgreininguna vantar');
  else {
    const o = m[1];
    const leyfd = o.replace(/slod\.indexOf\('\/rest\/v1\/app_settings'\) > -1/, '').replace(/slod\.indexOf\('\/rest\/v1\/rpc\/app_settings_merge'\) > -1/, '')
      .replace(/\/\\\/\(\?:api\|\\\.netlify\\\/functions\)\\\/husmynd\(\?:\[\?#\]\|\$\)\/\.test\(slod\)/, '').replace(/[\s|]/g, '');
    if (leyfd) villur.push('441: ný undanþága frá „skrif tæma" — aðeins app_settings og /api/husmynd mega sleppa. Fann: ' + leyfd.slice(0, 80));
  }

  // 3 · snerting tæmir
  krefst(/document\.addEventListener\('pointerdown', \(e\) => \{\s*taema\(\);/, 'músarhnappur niður verður að tæma forsóknina (lestur eftir snertingu er ferskur)');
  krefst(/document\.addEventListener\('keydown', taema, true\);/, 'lykill verður að tæma forsóknina');

  // 4 · stutt líf
  const lif = /const LIFIR_MS = (\d+);/.exec(src), eft = /const EFTIR_NOTKUN_MS = (\d+);/.exec(src);
  if (!lif || +lif[1] > 5000) villur.push('441: LIFIR_MS má ekki fara yfir 5000 — forsótt svar er sýnt án þess að spyrja aftur');
  if (!eft || +eft[1] > 2000) villur.push('441: EFTIR_NOTKUN_MS má ekki fara yfir 2000 (sami gluggi og rest-samnyting)');
  krefst(/f\.til = Math\.min\(f\.til, nu \+ EFTIR_NOTKUN_MS\);/, 'líftíminn verður að styttast við fyrstu notkun');

  // 5 · aldrei app_settings / rpc / signal / no-store
  krefst(/slod\.indexOf\('\/rest\/v1\/rpc\/'\) > -1 \|\| slod\.indexOf\('\/rest\/v1\/app_settings'\) > -1 \|\|\s*\(valk && \(valk\.signal \|\| valk\.cache === 'no-store'\)\)/, 'app_settings, rpc, AbortSignal og no-store verða að fara beint — „lesa ferskt fyrir vistun"-varnirnar byggja á því');

  // 6 · snertiskjár
  krefst(/if \(e\.pointerType !== 'mouse' \|\| e\.button !== 0\) return;/, 'aðeins MÚS má forsækja við pointerdown — á snertiskjá byrjar hvert skrun á röð');

  // rofi og sjálfhreinsun
  krefst(/localStorage\.getItem\('forsokn_off'\) === '1'/, 'rofinn forsokn_off er farinn');
  krefst(/if \(s\.miss >= MISS_HAMARK\) fella\(s\);/, 'sjálfhreinsun sniða er farin — ónotuð snið yrðu forsótt að eilífu');
  krefst(/if \(s\.cos\.size >= 2\) \{ s\.stadfest = true;/, 'snið verður að sjást hjá TVEIMUR ólíkum fyrirtækjum áður en það er notað');
}

if (villur.length) { console.log('RED  FORSÓKN — ' + villur.length + ' brot:\n  · ' + villur.join('\n  · ')); process.exit(1); }
console.log('FORSÓKN GRÆNT — nákvæm slóð, skrif og snerting tæma, líf ≤ 5 s, app_settings/rpc aldrei, mús ein forsækir við hnapp niður.');
process.exit(0);
