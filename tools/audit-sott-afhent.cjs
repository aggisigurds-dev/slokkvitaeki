#!/usr/bin/env node
'use strict';
/* SÓTT TEKUR TÆKIÐ AF AFGREIÐSLUBORÐINU.
 *
 * Af hverju (11.09.2026, Verkefnalisti e8caa730): Agnar — „ef sótt og gengið frá að það fari ekki
 * af afgreiðsluborðinu, eins og það sé ennþá eftir að sækja tækin." Móttaka (179) og vertíðarlokun
 * (210) skrifa custody_status + picked_up_at síðan 10.09, en afhending í Sölu („Sótt ✓", patch 121)
 * snerti hvorugan reitinn. 121 merkir nú tækið afhent þegar verkliður þess er afhentur.
 *
 * Mælir: tæki sem standa á borðinu (custody_status móttekið / á verkstæði / tilbúið) en eiga verklið
 * með stöðuna 'done' í verkbeiðni sem er sótt ('collected'). Slíkt tæki var afhent en borðið segir að
 * það bíði. Grunnlína mæld 11.09.2026 kl. ~22:40: 0 (9 tengd tæki á borðinu, öll 'broken' eða í
 * eyddri verkbeiðni). Hækkaðu aldrei grunnlínuna til að fá grænt.
 *
 * Keyrsla:  node tools/audit-sott-afhent.cjs          (--listi sýnir tækin)
 */
const fs = require('fs');
const path = require('path');

const GRUNNLINA = 0;
const A_BORDI = ['móttekið', 'á verkstæði', 'tilbúið'];

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const LISTI = process.argv.includes('--listi');

async function allar(q) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${from}&limit=1000`, { headers: H });
    // Kastar. Tómt svar liti út eins og „ekkert á borðinu", sem er hættulegasta svarið.
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const d = await r.json();
    if (!d.length) break;
    out = out.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return out;
}
const inn = arr => encodeURIComponent('in.(' + arr.map(v => '"' + String(v).replace(/"/g, '') + '"').join(',') + ')');

(async () => {
  const aBordi = await allar('uttaeki?select=id,serial,custody_status&custody_status=' + inn(A_BORDI) + '&order=id');
  const ids = aBordi.map(u => u.id);
  const lidir = [];
  for (let i = 0; i < ids.length; i += 150) {
    lidir.push(...await allar('verklidur?select=id,job_id,uttaeki_id,status&status=eq.done&uttaeki_id=' + inn(ids.slice(i, i + 150)) + '&order=id'));
  }
  const jobIds = [...new Set(lidir.map(l => l.job_id).filter(v => v != null))];
  const sott = new Set();
  for (let i = 0; i < jobIds.length; i += 150) {
    (await allar('verkbeidnir?select=id,status&status=eq.collected&id=' + inn(jobIds.slice(i, i + 150)) + '&order=id'))
      .forEach(j => sott.add(String(j.id)));
  }
  const brot = lidir.filter(l => sott.has(String(l.job_id)));

  if (LISTI) {
    brot.forEach(l => {
      const u = aBordi.find(x => x.id === l.uttaeki_id) || {};
      console.log('   tæki ' + l.uttaeki_id + ' ' + (u.serial || '') + ' (' + (u.custody_status || '') + ') · verkbeiðni ' + l.job_id);
    });
  }
  if (brot.length > GRUNNLINA) {
    console.log('RED: ' + brot.length + ' tæki afhent í Sótt en standa enn á afgreiðsluborðinu (grunnlína ' + GRUNNLINA +
      '). Sjá uttaeki-uppfærsluna í js/patches/121-pickup-checkout.js og `--listi`.');
    process.exit(1);
  }
  console.log('✅ GRÆNT sótt-afhent: ' + brot.length + '/' + GRUNNLINA + ' · ' + aBordi.length + ' tæki á borðinu, ' +
    lidir.length + ' þeirra með afhentan verklið');
})().catch(e => { console.log('RED: gat ekki lesið — ' + e.message); process.exit(1); });
