#!/usr/bin/env node
'use strict';
/* DAUÐAR SÍUR — fyrirspurn sem síar á dálk sem er ekki til.
 *
 * HVERS VEGNA ÞESSI VÖRÐUR ER TIL
 *
 * 10.09.2026 fannst þetta í Aðstoðarmiðstöðinni (js/patches/239):
 *
 *     .or('status.eq.loaned,custody_status.eq.workshop')
 *     .lt('loaned_at', cutoff)
 *     .is('deleted_at', null)
 *
 * Af þessu var ÞRENNT rangt: `loaned_at` er ekki til á `uttaeki` (hann er á
 * `lanstaeki`), `deleted_at` er ekki til á `uttaeki`, og `custody_status`
 * hefur aldrei haft gildið 'workshop'. PostgREST svaraði 400 «column
 * uttaeki.loaned_at does not exist» í HVERT einasta sinn, `catch` gleypti
 * villuna og kaflinn „🔧 Tæki á verkstæði" skilaði tómu.
 *
 * ENGINN TÓK EFTIR ÞVÍ Í MEIRA EN TVO MÁNUÐI — af því að þögult tómt lítur
 * nákvæmlega eins út og „ekkert að". Það er sjúkdómurinn. Vörðurinn er
 * mótefnið: hann les RAUNVERULEGA dálkaskrá úr Supabase og fellur ef kóðinn
 * síar, raðar eða velur dálk sem er ekki til.
 *
 * Sama kvöld fundust 30 systkini af sama mynstri. Nokkur dæmi:
 *   • 239:217   .is('deleted_at', null) á uttaeki — „🧯 útrunnin tæki" ALLTAF tómt
 *   • 58:55     skodunar_saga.uttaeki_id / .dagsetning — tækjasagan tóm frá degi 1
 *   • 101:438   verkbeidnir.linur — verklínurnar búa í `verklidur`
 *   • 104:186   verkbeidnir.units — „bæta tæki við verkbeiðni" gat ALDREI vistað
 *   • 110:53    fyrirtaeki.heimilisFang (stór F) — heil hreinsun skilaði engu
 *   • 231:1216  solur.invoice_number — Reikningur-flagan fann aldrei sölu
 *
 * ⚠️ .select('a,b,c') MEÐ ÓGILDUM DÁLKI SKILAR VILLU, EKKI BARA TÓMUM DÁLKI.
 * Einn aukastafur í select-lista fellir ALLA fyrirspurnina. Þess vegna er
 * .select() skoðað hér til jafns við .eq()/.lt()/.order().
 *
 * HVAÐ ER SKOÐAÐ
 *   .eq .neq .gt .gte .lt .lte .like .ilike .is .in .contains .not .filter
 *   .order .select .or          (aðeins fastir strengir — breytur eru sleppt)
 *
 * HVAÐ ER *EKKI* SKOÐAÐ — og af hverju vörðurinn má ekki flagga því
 *   • .storage.from('samningar') er GEYMSLUFATA, ekki tafla. Sleppt.
 *   • Breytu-dálkar (.eq(dalkur, x)) — ekki hægt að meta án keyrslu.
 *   • Athugasemdir eru STRIPPAÐAR fyrst. Annars flaggar vörðurinn sínar eigin
 *     skýringar — hausarnir hér að ofan telja upp einmitt þá dálka sem eru
 *     ekki til.
 *
 * ⚠️ ENGIN TÖLULEG GRUNNLÍNA. Grunnlína sem er hækkuð til að fá grænt þaggar
 * jafn mörg raunveruleg tilvik og hún afhjúpar (sbr. audit-pagination-hausinn).
 * Í staðinn er UNDANÞÁGULISTI þar sem hver færsla ber ástæðu og er endurmetin
 * þegar taflan verður til. Undanþága án ástæðu er ekki undanþága.
 *
 * Keyrsla:  node tools/audit-daudar-siur.cjs
 * ÞARF NET (les skemað úr REST) — þess vegna er hann EKKI í `--static`
 * keyrslunni; audit-all.cjs greinir það sjálfkrafa á `fetch(` hér í skránni.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const SKODA = ['js', 'netlify/functions', 'gatt', 'gatt-admin'];
const SLEPPA_SLOD = /node_modules|[\\/]dist[\\/]|[\\/]backups[\\/]|graphify-out|_attic|\.min\.js$/;

const SB_URL = process.env.SUPABASE_URL || 'https://osfdzskyvisifcwyjkuk.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY || 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const HAUS = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Accept: 'application/json' };

/* UNDANÞÁGUR — hver færsla ber ÁSTÆÐU og dagsetningu mælingar.
 * Þetta eru staðir þar sem kóðinn VEIT að hluturinn er ekki til og segir
 * notandanum frá því. Það er ekki þöggun; það er meðvituð, sýnileg skerðing.
 * Þegar taflan/dálkurinn verður til á að taka færsluna út héðan. */
const UNDANTHAGA = [
  ['contact_log', null,
   'Taflan var aldrei búin til. 24-contact-log.js:112-113 athugar villuna ' +
   'sérstaklega og sýnir „ekki tengt" í stað þess að þykjast tómt. Mælt 10.09.2026: PGRST205.'],
  ['dagbok', null,
   'Taflan er ekki til (PostgREST stingur upp á `verkdagbok`, sem er allt annað). ' +
   '52-tech-route.js:99 birtir nú villuna á skjánum í stað „🌴 engar færslur — frí?". ' +
   'Dagskrártaflan þarf að verða til áður en skjárinn getur virkað. Mælt 10.09.2026.'],
  ['fyrirtaeki', 'vidbota_upplysingar',
   'js/vbu.js:32 sækir dálkinn viljandi „ef hann skyldi vera til" og fellur annars ' +
   'á localStorage (catch á línu 43). ATH: það þýðir að þessi minnispunktar ' +
   'SAMSTILLAST EKKI milli véla — brot á SAMSTILLT-reglunni í CLAUDE.md. ' +
   'Lagast með dálki í fyrirtaeki; bíður ákvörðunar Agnars. Mælt 10.09.2026.'],
];
function undanthegid(tafla, dalkur) {
  return UNDANTHAGA.some(([t, d]) => t === tafla && (d === null || d === dalkur));
}

/* ── strippa athugasemdir og halda línunúmerum ────────────────────────────── */
function strippa(src) {
  let ut = '', i = 0;
  const n = src.length;
  let st = 0; // 0 kóði · 1 // · 2 /* */ · 3 '..' · 4 ".." · 5 `..`
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (st === 0) {
      if (c === '/' && d === '/') { st = 1; ut += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { st = 2; ut += '  '; i += 2; continue; }
      if (c === "'") st = 3; else if (c === '"') st = 4; else if (c === '`') st = 5;
      ut += c; i++; continue;
    }
    if (st === 1) { if (c === '\n') { st = 0; ut += c; } else ut += ' '; i++; continue; }
    if (st === 2) { if (c === '*' && d === '/') { st = 0; ut += '  '; i += 2; } else { ut += (c === '\n' ? '\n' : ' '); i++; } continue; }
    ut += c;
    if (c === '\\') { ut += (src[i + 1] || ''); i += 2; continue; }
    if ((st === 3 && c === "'") || (st === 4 && c === '"') || (st === 5 && c === '`')) st = 0;
    i++;
  }
  return ut;
}

function skrar(rot, undir) {
  const ut = [];
  for (const u of undir) {
    const p = path.join(rot, u);
    if (!fs.existsSync(p)) continue;
    (function ganga(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (SLEPPA_SLOD.test(f)) continue;
        if (e.isDirectory()) ganga(f);
        else if (/\.(js|cjs|mjs)$/.test(e.name)) ut.push(f);
      }
    })(p);
  }
  return ut;
}
const slod = f => path.relative(ROT, f).replace(/\\/g, '/');

/* ── lesa dálkanotkun úr keðjunni .from('tafla').…() ──────────────────────── */
const SIUR = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
              'contains', 'containedBy', 'overlaps', 'order', 'not', 'filter', 'select', 'or'];

function fyrstiStrengur(args) {
  const m = /^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/.exec(args);
  return m ? m[2] : null;
}
function dalkarUr(meth, args) {
  const s = fyrstiStrengur(args);
  if (s == null) return [];                      // breyta / samsettur strengur → sleppa
  if (s.includes('${')) return [];               // template með innsetningu → sleppa
  if (meth === 'select') {
    let ut = '', djupt = 0;
    for (const ch of s) {                        // fella innfelldar auðlindir  tafla(...)
      if (ch === '(') { djupt++; continue; }
      if (ch === ')') { djupt--; continue; }
      if (djupt === 0) ut += ch;
    }
    return ut.split(',').map(x => x.trim())
      .map(x => x.includes(':') ? x.split(':').pop().trim() : x)   // alias:dalkur
      .map(x => x.replace(/->>?.*$/, '').replace(/::.*$/, '').trim())
      .filter(x => x && x !== '*' && x !== 'count' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(x));
  }
  if (meth === 'or') {
    return s.split(',').map(p => p.trim().split('.')[0])
      .filter(x => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(x) && !['and', 'or', 'not'].includes(x));
  }
  if (meth === 'order') {
    return s.split(',').map(x => x.trim()).filter(x => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(x));
  }
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) ? [s] : [];
}

function lesaNotkun() {
  const notkun = [];   // { f, lina, tafla, meth, dalkur }
  for (const f of skrar(ROT, SKODA)) {
    const src = strippa(fs.readFileSync(f, 'utf8'));
    // `.storage.from(` er geymslufata, ekki tafla — sleppt.
    const re = /(?<!storage\s*)\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const fyrir = src.slice(Math.max(0, m.index - 40), m.index);
      if (/\.storage\s*$/.test(fyrir)) continue;
      const tafla = m[1];
      let i = m.index + m[0].length;
      const endir = Math.min(src.length, i + 3000);
      while (i < endir) {
        const mm = /^[\s\r\n]*\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/.exec(src.slice(i, endir));
        if (!mm) break;
        const meth = mm[1];
        let j = i + mm[0].length, djupt = 1, q = null, args = '';
        while (j < src.length && djupt > 0) {
          const c = src[j];
          if (q) { if (c === '\\') { args += c + (src[j + 1] || ''); j += 2; continue; } if (c === q) q = null; args += c; j++; continue; }
          if (c === "'" || c === '"' || c === '`') { q = c; args += c; j++; continue; }
          if (c === '(' || c === '[' || c === '{') djupt++;
          if (c === ')' || c === ']' || c === '}') { djupt--; if (djupt === 0) break; }
          args += c; j++;
        }
        if (SIUR.includes(meth)) {
          const lina = src.slice(0, i).split('\n').length;
          for (const dalkur of dalkarUr(meth, args)) notkun.push({ f, lina, tafla, meth, dalkur });
        }
        i = j + 1;
      }
    }
  }
  return notkun;
}

/* ── sækja raunverulega dálkaskrá ─────────────────────────────────────────── */
async function saekjaSkema(toflur, notkunEftirToflu) {
  const skema = {};
  for (const t of toflur) {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}?select=*&limit=1`, { headers: HAUS });
      if (!r.ok) {
        const txt = await r.text();
        skema[t] = { dalkar: null, ekkiTil: /PGRST205/.test(txt), villa: r.status + ' ' + txt.slice(0, 120) };
        continue;
      }
      const d = await r.json();
      if (Array.isArray(d) && d.length) { skema[t] = { dalkar: Object.keys(d[0]) }; continue; }
      // TÓM TAFLA: engin röð til að lesa lykla úr. Þá er hver dálkur sem kóðinn
      // notar prófaður stakur — PostgREST svarar 42703 ef hann er ekki til,
      // óháð því hvort taflan hafi raðir.
      const stakir = {};
      for (const c of notkunEftirToflu[t] || []) {
        const rr = await fetch(`${SB_URL}/rest/v1/${t}?select=${encodeURIComponent(c)}&limit=1`, { headers: HAUS });
        stakir[c] = rr.ok;
        if (!rr.ok) await rr.text();
      }
      skema[t] = { dalkar: null, stakir };
    } catch (e) {
      skema[t] = { dalkar: null, netvilla: (e && e.message) || String(e) };
    }
  }
  return skema;
}

(async () => {
  const notkun = lesaNotkun();
  const eftirToflu = {};
  for (const n of notkun) (eftirToflu[n.tafla] = eftirToflu[n.tafla] || new Set()).add(n.dalkur);
  for (const t in eftirToflu) eftirToflu[t] = [...eftirToflu[t]];
  const toflur = Object.keys(eftirToflu).sort();

  let skema;
  try {
    skema = await saekjaSkema(toflur, eftirToflu);
  } catch (e) {
    console.log('GRÁTT: náði ekki í skemað (' + ((e && e.message) || e) + '). ' +
      'Þessi vörður þarf net — hann er viljandi utan --static keyrslunnar.');
    process.exit(0);
  }

  const netFall = toflur.filter(t => skema[t] && skema[t].netvilla);
  if (netFall.length === toflur.length && toflur.length) {
    console.log('GRÁTT: engin tafla svaraði (' + skema[toflur[0]].netvilla + '). Sleppi — vörðurinn þarf net.');
    process.exit(0);
  }

  const brot = [];
  const oviss = [];
  for (const n of notkun) {
    const s = skema[n.tafla];
    if (!s || s.netvilla) { oviss.push(n.tafla + ' (náðist ekki)'); continue; }
    if (s.ekkiTil) {
      if (!undanthegid(n.tafla, n.dalkur)) brot.push({ ...n, hvad: 'TAFLAN ER EKKI TIL' });
      continue;
    }
    if (s.villa) { oviss.push(n.tafla + ' → ' + s.villa); continue; }
    if (s.dalkar) {
      if (!s.dalkar.includes(n.dalkur) && !undanthegid(n.tafla, n.dalkur)) {
        brot.push({ ...n, hvad: 'dálkurinn er ekki til (taflan hefur ' + s.dalkar.length + ' dálka)' });
      }
      continue;
    }
    if (s.stakir && s.stakir[n.dalkur] === false && !undanthegid(n.tafla, n.dalkur)) {
      brot.push({ ...n, hvad: 'dálkurinn er ekki til (tóm tafla — prófaður stakur)' });
    }
  }

  if (oviss.length) {
    console.log('   (óvíst, sleppt: ' + [...new Set(oviss)].slice(0, 5).join(' · ') + ')');
  }

  if (brot.length) {
    const eftirDalki = new Map();
    for (const b of brot) {
      const k = b.tafla + '.' + b.dalkur;
      if (!eftirDalki.has(k)) eftirDalki.set(k, []);
      eftirDalki.get(k).push(b);
    }
    for (const [k, listi] of [...eftirDalki].sort()) {
      console.log('   ' + k + '  — ' + listi[0].hvad);
      for (const b of listi.slice(0, 6)) console.log('      ' + slod(b.f) + ':' + b.lina + '  .' + b.meth + '()');
    }
    console.log('RED: ' + brot.length + ' vísun' + (brot.length === 1 ? '' : 'ir') + ' í ' +
      eftirDalki.size + ' dálk' + (eftirDalki.size === 1 ? '' : 'a') + ' sem eru EKKI TIL. ' +
      'PostgREST svarar 400 «column … does not exist» — og af því að flestar þessar ' +
      'fyrirspurnir eru í try/catch skilar kaflinn TÓMU í staðinn fyrir að segja frá. ' +
      'Tómur listi lítur eins út og „ekkert að". Lagaðu dálkinn; ef upplýsingarnar eru ' +
      'ekki til í skemanu skaltu fjarlægja fyrirspurnina og segja það hreint út — ' +
      'aldrei skálda dálk. Er hluturinn viljandi ekki til? Þá fer hann í ' +
      'UNDANTHAGA hér að ofan MEÐ ÁSTÆÐU.');
    process.exit(1);
  }

  console.log('✅ GRÆNT dauðar síur: ' + notkun.length + ' dálkvísanir í ' + toflur.length +
    ' töflum — allar til (' + UNDANTHAGA.length + ' skráðar undanþágur með ástæðu)');
})();
