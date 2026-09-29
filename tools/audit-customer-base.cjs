#!/usr/bin/env node
/* Öryggisnet — customer_base_id verður að vera rétt (2026-09-29).
 *
 * Agnar: „customer_base_id — það þarf að setja einhvers konar vörn á þetta,
 * þetta er alltaf að gerast" · „baseIdForKt eða þetta".
 *
 * HVERS VEGNA ÞETTA SKIPTIR MÁLI
 *   Pörun skýrslu og reiknings (document_pairs) er lyklað á customer_base_id.
 *   Bendi félag á rangan grunn fer tengingin á rangan stað og „🔗 Tengja"
 *   virðist gera ekkert. Sama gildir um skjöl sem 199 sækir um grunninn:
 *   þau birtast þá á röngum stað eða hvergi.
 *
 *   Rótin er að kennitölu-uppfletting (199 baseIdForKt) gerir `.limit(1)` og
 *   velur af handahófi þegar tvær raðir í customers_base bera sömu kennitölu.
 *   199 notar núna `customer_base_id` félagsins sjálfs og lítur aðeins á
 *   kennitöluna sem varaleið — þessi vörður ver þá reglu í gögnunum.
 *
 * PRÓFAR — RAUTT AÐEINS Á NÝJUM FRÁVIKUM
 *   A  félag Í ÞJÓNUSTU án customer_base_id            (pörun ómöguleg)
 *   B  customer_base_id stangast á við kennitöluna     (bendir á annan grunn)
 *   C  félag í þjónustu með kennitölu sem er hvergi í customers_base
 *   D  kennitala á FLEIRI EN EINN grunn                (baseIdForKt giskar)
 *   E  customer_base_id bendir á grunn sem er ekki til (dauð tenging)
 *
 * Þekktu frávikin frá 29.09.2026 eru í ÞEKKT hér að neðan. Þau eru RAUNVERULEG
 * og bíða ákvörðunar Agnars (sameina grunnraðirnar eða færa félagið); þau eru
 * skráð svo vörðurinn þegi um þau og öskri á það sem BÆTIST VIÐ.
 *
 * Aðeins lestur, publishable-lykill.
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

// fyrirtaeki.id → stutt skýring. Fjarlægðu línu þegar hún er lagfærð.
const THEKKT = {
  257: 'Álfaskeið 78 — tvær grunnraðir (565 án kt, 924 með kt)',
  412: 'KvikkFix — tvær grunnraðir (236 / 1192)',
  512: 'Suðurvangur 19 — bendir á 41 „Suðurvangur 19a", kt segir 1112',
  1101: 'Ask Arkitektar — tvær grunnraðir (56 / 1193)',
  1138: 'Þorsteinn Bergmann — kt 520402-4030 er hvergi í customers_base',
};

function fail(msg) { console.log('RED: ' + msg); process.exit(1); }
const d10 = (s) => String(s == null ? '' : s).replace(/\D/g, '');

async function pageAll(q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/${q}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
    });
    const b = await r.json();
    if (!Array.isArray(b)) throw new Error(JSON.stringify(b).slice(0, 200));
    if (!b.length) break;
    out.push(...b);
    if (b.length < 1000) break;
  }
  return out;
}

(async () => {
  const fel = await pageAll('fyrirtaeki?deleted_at=is.null&select=id,nafn,kennitala,customer_base_id,er_i_thjonustu');
  const base = await pageAll('customers_base?select=id,nafn,kennitala');

  const baseById = new Map(base.map((b) => [b.id, b]));
  const baseByKt = new Map();
  base.forEach((b) => {
    const k = d10(b.kennitala);
    if (!k) return;
    if (!baseByKt.has(k)) baseByKt.set(k, []);
    baseByKt.get(k).push(b);
  });

  const ny = [];      // ný frávik → RAUTT
  const thekkt = [];  // skráð frávik → þögn

  const skra = (f, teg, texti) => {
    (THEKKT[f.id] ? thekkt : ny).push({ id: f.id, nafn: f.nafn, teg, texti });
  };

  for (const f of fel) {
    const kt = d10(f.kennitala);
    const fundnir = kt ? (baseByKt.get(kt) || []) : [];

    if (f.customer_base_id == null) {
      // Aðeins félög Í ÞJÓNUSTU eru krafin — hin geta beðið.
      if (f.er_i_thjonustu) skra(f, 'A', 'í þjónustu en hefur ekkert customer_base_id');
      continue;
    }
    if (!baseById.has(f.customer_base_id)) {
      skra(f, 'E', 'customer_base_id ' + f.customer_base_id + ' er ekki til í customers_base');
      continue;
    }
    if (!kt) continue;
    if (!fundnir.length) {
      if (f.er_i_thjonustu) skra(f, 'C', 'kt ' + f.kennitala + ' finnst hvergi í customers_base');
      continue;
    }
    if (!fundnir.some((b) => b.id === f.customer_base_id)) {
      skra(f, 'B', 'bendir á grunn ' + f.customer_base_id +
        ' en kt ' + f.kennitala + ' segir ' + fundnir.map((b) => b.id).join('/'));
    }
  }

  // D — kennitala á fleiri en einn grunn gerir baseIdForKt að ágiskun.
  const tvitekin = [];
  baseByKt.forEach((arr, kt) => { if (arr.length > 1) tvitekin.push({ kt, ids: arr.map((b) => b.id) }); });

  if (thekkt.length) {
    console.log('   Þekkt og skráð (' + thekkt.length + '):');
    thekkt.forEach((x) => console.log('     · ' + String(x.id).padEnd(5) +
      String(x.nafn || '').slice(0, 28).padEnd(28) + ' — ' + THEKKT[x.id]));
  }

  if (tvitekin.length) {
    console.log('   Kennitölur á fleiri en einum grunni (' + tvitekin.length + '):');
    tvitekin.slice(0, 10).forEach((x) => console.log('     · kt ' + x.kt + ' → grunnar ' + x.ids.join(', ')));
  }

  if (ny.length) {
    console.log('   NÝ frávik:');
    ny.forEach((x) => console.log('     ❗ ' + String(x.id).padEnd(5) +
      String(x.nafn || '').slice(0, 28).padEnd(28) + ' [' + x.teg + '] ' + x.texti));
    fail(ny.length + ' NÝTT frávik á customer_base_id — pörun skýrslu/reiknings fer á rangan grunn. ' +
      'Lagaðu félagið (eða sameinaðu grunnraðirnar) og skráðu í THEKKT ef það bíður ákvörðunar.');
  }

  if (tvitekin.length) {
    fail(tvitekin.length + ' kennitala/kennitölur eiga FLEIRI EN EINN grunn í customers_base — ' +
      'baseIdForKt giskar þá á hvor sé réttur. Sameinaðu raðirnar.');
  }

  console.log('✅ GRÆNT customer_base: ' + fel.length + ' félög · ' + base.length + ' grunnraðir · ' +
    'engin ný frávik (' + thekkt.length + ' þekkt skráð) · engin kennitala á tveimur grunnum.');
})().catch((e) => fail(e.message || String(e)));
