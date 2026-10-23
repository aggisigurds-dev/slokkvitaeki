#!/usr/bin/env node
'use strict';
/* TEIKNINGAR MEGA ALDREI VERA BLOB-SLÓÐ.
 *
 * 23.10.2026. Agnar vistaði teikningu á Steypustöðina Borgarnesi (#623). Slóðin
 * sem fór á þjóninn var:
 *
 *     blob:https://slokkvitaeki.netlify.app/4f306091-8bfc-4aa8-a89d-5d6cca366b12
 *
 * Blob-slóð lifir AÐEINS í þeim vafraflipa sem bjó hana til. Hún var því þegar
 * dauð þegar hún var vistuð: teikningin hefði verið auð við næstu opnun, og hún
 * var auð hjá hinum fjórum vélunum frá fyrstu stundu. Merkin þrjú sem sett voru
 * ofan á hana héngu á engu.
 *
 * ÞETTA ER ÞÖGUL BILUN — borðið lítur rétt út á vélinni sem vistaði, og ekkert
 * sést fyrr en einhver opnar það aftur. Þess vegna þrjú lög:
 *
 *   1. 375 `skrifa` hafnar og segir notandanum af hverju (eina leiðin sem öll
 *      skrif fara um). 383 bar þessa vörn fyrir EN aðeins á TurboPaint-leiðinni;
 *      💾 Vista fór hér um og þar var engin vörn — þannig slapp slóðin í gegn.
 *   2. Gagnagrunnurinn hafnar (trigger `teikning_bord_bannadar_slodir`). Sjö
 *      skrár skrifa í töfluna og sú áttunda myndi ekki vita af reglunni.
 *   3. Þessi vörður, svo hvorugt lagið geti horfið þegjandi.
 *
 * Keyrsla:  node tools/audit-teikning-blob.cjs
 * Read-only. Notar publishable-lykilinn úr js/config.js (RLS).
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const brot = [];
const krefja = (satt, m) => { if (!satt) brot.push(m); };
const lesa = p => fs.readFileSync(path.join(rot, p), 'utf8');

// ── 1. Vafra-lagið: eina skrifleiðin hafnar sjálf ──────────────────────────
const v375 = lesa('js/patches/375-teikning-vistun.js');
krefja(/function blobSlodir\(row\)/.test(v375),
  '375: `blobSlodir` er farin. Þá fer blob-slóð aftur óhindrað á þjóninn um 💾 Vista '
+ '— nákvæmlega leiðin sem brást 23.10.2026.');
krefja(/var blob = blobSlodir\(row\);[\s\S]{0,200}?if \(blob\.length\)/.test(v375),
  '375 `skrifa`: kallar ekki á `blobSlodir` ÁÐUR en upsert fer af stað. Vörn sem er '
+ 'skrifuð en ekki kölluð er engin vörn.');
krefja(/\^\(blob\|data\):/.test(v375),
  '375: mynstrið nær ekki lengur yfir bæði blob: og data:. Báðar deyja utan flipans.');

// 383 bar vörnina fyrir — aðeins á TurboPaint-leiðinni. Hún á að standa þar áfram.
const v383 = lesa('js/patches/383-teikning-hreinsa-3d.js');
krefja(/indexOf\('blob:'\) === 0/.test(v383),
  '383: eldri blob-vörnin á TurboPaint-leiðinni er horfin. Hún er ekki óþörf þótt 375 '
+ 'veri líka — hún stöðvar notandann fyrr, áður en TurboPaint opnast á tómri mynd.');

// ── 2. Gagnagrunns-lagið + raunstaðan ──────────────────────────────────────
(async function () {
  let rodir = null;
  try {
    const r = await fetch(URL_ + '/rest/v1/teikning_bord?select=company_id,image_url,haedir&limit=2000', { headers: H });
    if (!r.ok) throw new Error('teikning_bord -> ' + r.status);
    rodir = await r.json();
  } catch (e) {
    // Tómt svar er ekki staðreynd: náist ekki í töfluna er það SAGT, ekki talið grænt.
    console.log('   (gagnamæling náðist ekki: ' + String((e && e.message) || e).slice(0, 80) + ')');
  }

  if (rodir) {
    const BONNUD = /^(blob|data):/i;
    const slaem = [];
    for (const r of rodir) {
      const hvar = [];
      if (typeof r.image_url === 'string' && BONNUD.test(r.image_url)) hvar.push('image_url');
      if (Array.isArray(r.haedir)) r.haedir.forEach((h, i) => {
        if (h && typeof h.image_url === 'string' && BONNUD.test(h.image_url)) hvar.push('haedir[' + i + ']');
      });
      if (hvar.length) slaem.push('fyrirtæki ' + r.company_id + ' — ' + hvar.join(', '));
    }
    console.log('   ' + rodir.length + ' teikningaborð skoðuð.');
    if (slaem.length) {
      brot.push('LIFANDI BLOB-SLÓÐIR á ' + slaem.length + ' borði/borðum — þær eru dauðar og '
        + 'teikningin birtist auð: ' + slaem.join(' · '));
    }
  }

  if (brot.length) {
    console.log('RED: ' + brot.length + ' brot á blob-verðinum:');
    brot.forEach(b => console.log('   • ' + b));
    process.exit(1);
  }
  console.log('✅ GRÆNT teikning-blob: 375 hafnar blob:/data: á einu skrifleiðinni, '
    + '383 heldur sinni vörn, og ekkert borð ber dauða slóð.');
})();
