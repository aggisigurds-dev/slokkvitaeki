#!/usr/bin/env node
/* === HERMIR-ÁBENDINGAR — það sem Agnar benti á í herminum ========================================================
 *
 * Agnar 28.11.2026: „… og get bent claude á hvar þarf að laga". Í tækjarammanum (Öpp → Hermir, eða 📱 í Stílstjóra)
 * er takkinn „Benda Claude á": hann smellir á hlut, skrifar hvað er að og vistar. Ábendingarnar eru í
 * app_settings.settings.hermir_abendingar (pappi 539). Þetta tól les þær og lokar þeim.
 *
 *   export HERMIR_KAKA='<kaka úr: select kaka from innri.lotu_koku(10, 1);>'   # aldrei í skrá, aldrei uid 1
 *   node tools/hermir-abendingar.cjs                       opnar ábendingar
 *   node tools/hermir-abendingar.cjs --allar               líka lagaðar og fjarlægðar
 *   node tools/hermir-abendingar.cjs --json                hrátt
 *   node tools/hermir-abendingar.cjs --lokid <id> "<hvað var gert og hvernig það var prófað>"
 *   node tools/hermir-abendingar.cjs --opna <id>           opna aftur (ranglega lokað)
 *
 * Hver ábending ber: athugasemd Agnars, heiti hlutarins, DOM-slóð (grep-aðu klasann eða id-ið í js/patches),
 * textann í hlutnum, síðu, sýn, app, tæki og síðustærð. Endurgerðu í Símaherminum (tools/simahermir.cjs) í SAMA tæki
 * áður en þú lagar, og lokaðu ábendingunni aðeins þegar lagfæringin er birt og mæld. Textinn sem fer í --lokid birtist
 * Agnari í spjaldinu undir „Lagað".
 * ============================================================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const LYK = 'hermir_abendingar';
// app_settings er lokað anon-lyklinum (mælt 28.11.2026: 401 „permission denied for table app_settings"). Appið les það
// með stuttu starfsmannatákni (sb_jwt) sem /api/hub-adgangar afhendir innskráðri lotu. Tólið gerir eins: lotukakan
// (uid 10, aldrei uid 1) kemur úr umhverfisbreytunni HERMIR_KAKA, sömu og símahermirinn notar. Hún er aldrei skrifuð í skrá.
async function tenging() {
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
  const url = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
  const key = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
  if (!url || !key) throw new Error('Fann ekki SUPABASE_URL/KEY í js/config.js');
  const kaka = process.env.HERMIR_KAKA;
  if (!kaka) {
    throw new Error('Vantar HERMIR_KAKA (lotukaka uid 10: select kaka from innri.lotu_koku(10, 1);).\n' +
      'Án hennar: lestu beint með Supabase-tólinu:\n' +
      "  select m.value from app_settings, jsonb_each(settings->'" + LYK + "') m where id = 1 and coalesce(m.value->>'stada','opin') = 'opin';");
  }
  const r = await fetch('https://slokkvitaeki.netlify.app/api/hub-adgangar', { headers: { cookie: 'hub_user=' + kaka } });
  const s = r.ok ? await r.json() : null;
  if (!s || !s.sb_jwt) throw new Error('Fékk ekkert starfsmannatákn úr /api/hub-adgangar (' + r.status + '). Er kakan runnin út?');
  return { url, h: { apikey: key, Authorization: 'Bearer ' + s.sb_jwt, 'content-type': 'application/json' } };
}
async function saekja(t) {
  const r = await fetch(t.url + '/rest/v1/app_settings?id=eq.1&select=abendingar:settings->' + LYK, { headers: t.h });
  if (!r.ok) throw new Error('Lestur brást: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const rad = await r.json();
  if (!Array.isArray(rad) || !rad.length) throw new Error('app_settings skilaði engri röð (ÓMÆLT, ekki „engar ábendingar")');
  const o = rad[0].abendingar;
  return (o && typeof o === 'object') ? o : {};
}
async function sameina(t, id, breyting) {
  const p = {}; p[LYK] = {}; p[LYK][id] = breyting;
  const r = await fetch(t.url + '/rest/v1/rpc/app_settings_merge', { method: 'POST', headers: t.h, body: JSON.stringify({ p_patch: p }) });
  if (!r.ok) throw new Error('Skrif brást: ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
const dags = iso => {
  const d = new Date(iso); if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' kl. ' + p(d.getHours()) + ':' + p(d.getMinutes());
};

(async () => {
  const a = process.argv.slice(2);
  const t = await tenging();
  const allar = await saekja(t);

  const iL = a.indexOf('--lokid'), iO = a.indexOf('--opna');
  if (iL >= 0 || iO >= 0) {
    const id = a[(iL >= 0 ? iL : iO) + 1];
    if (!id || !allar[id]) { console.error('Engin ábending með auðkennið „' + id + '". Til: ' + (Object.keys(allar).join(', ') || 'engin')); process.exit(2); }
    if (iL >= 0) {
      const svar = String(a[iL + 2] || '').trim();
      if (!svar) { console.error('Vantar texta: hvað var gert og hvernig það var prófað.'); process.exit(2); }
      await sameina(t, id, { stada: 'lokid', lokid_ts: new Date().toISOString(), svar });
    } else {
      await sameina(t, id, { stada: 'opin' });
    }
    const eftir = (await saekja(t))[id] || {};
    console.log('Lesið til baka: ' + id + ' → staða ' + (eftir.stada || 'opin') + (eftir.svar ? ' · ' + eftir.svar : ''));
    return;
  }

  let l = Object.keys(allar).map(k => allar[k]).filter(m => m && m.id);
  if (a.indexOf('--allar') < 0) l = l.filter(m => (m.stada || 'opin') === 'opin');
  l.sort((x, y) => String(x.ts || '').localeCompare(String(y.ts || '')));
  if (a.indexOf('--json') >= 0) { console.log(JSON.stringify(l, null, 2)); return; }
  console.log('Hermir-ábendingar: ' + l.length + (a.indexOf('--allar') >= 0 ? ' alls' : (l.length === 1 ? ' opin' : ' opnar')) + ' (lesið ' + dags(new Date().toISOString()) + ')');
  l.forEach((m, i) => {
    console.log('');
    console.log((i + 1) + '. [' + m.id + '] ' + (m.nota || '(engin athugasemd)') + ((m.stada || 'opin') !== 'opin' ? '   — ' + m.stada + (m.svar ? ': ' + m.svar : '') : ''));
    console.log('   Hlutur: ' + m.heiti + (m.texti ? ' „' + m.texti + '"' : '') + (m.kassi ? ' · ' + m.kassi + ' px' : ''));
    console.log('   Slóð í DOM: ' + m.slod);
    console.log('   Síða: ' + [m.sida, m.syn ? 'sýn ' + m.syn : '', m.app ? 'app ' + m.app : ''].filter(Boolean).join(' · '));
    console.log('   Tæki: ' + [m.taeki, m.zoom ? 'síðustærð ' + m.zoom : ''].filter(Boolean).join(' · '));
    console.log('   Skráð: ' + dags(m.ts));
  });
  if (!l.length) console.log('Ekkert að vinna úr.');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
