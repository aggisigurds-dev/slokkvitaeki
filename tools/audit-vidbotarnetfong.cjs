#!/usr/bin/env node
/* Viðbótarnetföng félags tengjast Samskiptum (16.10.2026).
 *
 * Agnar bað um að geta sett inn fleiri netföng á félag svo póstsagan tengist Samskiptum. Þrír vírar:
 *   1. v_kunni_netfong les samþykkta tengiliði (charlize_contacts) með kennitölu félagsins
 *      (sql/2026-10-16_v_kunni_netfong_vidbotarnetfong.sql) — án þess eru netföngin skráð en
 *      tengja ENGAN póst, og ekkert segir frá því.
 *   2. 473 setur „+N"-plötuna á Netfang-línu borðans og 462 kallar hana í sama tifi og borðinn.
 *   3. 286 sækir Samskipti ferskt eftir breytingu (SamskiptiPanel.endurnyja).
 *
 * Gagnaleggurinn mælir vír 1 á lifandi gögnum: netföng úr v_charlize_contacts_active sem eru EKKI
 * aðalnetföng neins félags verða að finnast í v_kunni_netfong. Mælt 16.10.2026: 246 slík.
 * 0 = viewið hefur verið endurskrifað án tengiliðanna (RAUTT). Tómt svar úr RLS er líka RAUTT,
 * ekki grænt (MAELINGAR.md kafli 4).
 */
const fs = require('fs');
const path = require('path');
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const rot = path.join(__dirname, '..');
function rautt(m) { console.log('RED: ' + m); process.exit(1); }

// ── kóða-leggurinn ──
const idx = fs.readFileSync(path.join(rot, 'index.html'), 'utf8');
const i473 = idx.indexOf('/js/patches/473-aukanetfong.js'), i462 = idx.indexOf('/js/patches/462-stodug-opnun.js');
if (i473 < 0) rautt('index.html hleður ekki 473-aukanetfong.js — viðbótarnetföngin sjást hvergi á prófílnum.');
if (i462 >= 0 && i473 > i462) rautt('473 hleðst á eftir 462 — platan teiknast þá ekki í sama tifi og borðinn (regla 5).');
const s462 = fs.readFileSync(path.join(rot, 'js/patches/462-stodug-opnun.js'), 'utf8');
if (!/\['473', function \(\) \{ if \(window\.Aukanetfong\) Aukanetfong\.setja\(\); \}\]/.test(s462))
  rautt('462 SKREF kallar ekki Aukanetfong.setja — platan kemur á eigin tifi og ýtir línunni til.');
const s286 = fs.readFileSync(path.join(rot, 'js/patches/286-samskipti-panel.js'), 'utf8');
if (!/function endurnyja\(fid\)/.test(s286) || !/\{ forbua, endurnyja \}/.test(s286))
  rautt('286 flytur ekki út SamskiptiPanel.endurnyja — Samskipti sýna gömlu söguna í 60 s eftir að netfang er tengt.');
const s473 = fs.readFileSync(path.join(rot, 'js/patches/473-aukanetfong.js'), 'utf8');
if (!/ktTolur\(x\.kennitala\) === k/.test(s473))
  rautt('473 síar ekki svar /api/tengilidir á kennitölu félagsins — eldra fall skilar ÖLLUM tengiliðum og platan teldi 453.');

// ── gagnaleggurinn ──
async function allt(slod) {
  const ut = [];
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(SUPA + '/rest/v1/' + slod, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Range: fra + '-' + (fra + 999) } });
    if (!r.ok) throw new Error(slod.split('?')[0] + ' HTTP ' + r.status);
    const b = await r.json(); ut.push(...b);
    if (b.length < 1000) break;
  }
  return ut;
}
(async () => {
  const [kont, vkn, fyr, cb] = await Promise.all([
    allt('v_charlize_contacts_active?select=netfang,kennitala&kennitala=not.is.null'),
    allt('v_kunni_netfong?select=lykill,via'),
    allt('fyrirtaeki?select=netfang&netfang=not.is.null'),
    allt('customers_base?select=netfang,contact_email'),
  ]);
  if (!kont.length || !vkn.length) rautt('tóm svör (tengiliðir ' + kont.length + ', v_kunni_netfong ' + vkn.length + ') — RLS eða lykill? Vörðurinn getur ekki dæmt.');
  const n = s => String(s || '').trim().toLowerCase();
  const adal = new Set([...fyr.map(r => n(r.netfang)), ...cb.map(r => n(r.netfang)), ...cb.map(r => n(r.contact_email))].filter(Boolean));
  const ivkn = new Set(vkn.filter(r => r.via === 'addr').map(r => n(r.lykill)));
  const vidbot = [...new Set(kont.map(r => n(r.netfang)).filter(a => a && !adal.has(a)))];
  const tengd = vidbot.filter(a => ivkn.has(a));
  if (!tengd.length) rautt(vidbot.length + ' samþykkt viðbótarnetföng og EKKERT þeirra í v_kunni_netfong — viewið les ekki charlize_contacts lengur (sjá sql/2026-10-16_…).');
  console.log('✅ GRÆNT viðbótarnetföng: ' + tengd.length + ' af ' + vidbot.length + ' samþykktum viðbótarnetföngum tengja póst í Samskiptum' +
    ' (hin eru sameiginleg, á léni umsjónaraðila eða tengd fleiri félögum) · 473 í sama tifi og borðinn.');
})().catch(e => rautt('vörðurinn hrundi — ' + (e && e.message || e)));
