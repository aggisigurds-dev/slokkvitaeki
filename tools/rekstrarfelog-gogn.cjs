#!/usr/bin/env node
/* Dregur saman gögn allra fjölstaða-félaga í eitt JSON fyrir fact-skrána.
 * Keyrsla: node tools/rekstrarfelog-gogn.cjs > tools/rekstrarfelog-gogn.json
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function sb(q) {
  const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: H });
  if (!r.ok) throw new Error(`${q.slice(0, 50)} → ${r.status} ${(await r.text()).slice(0, 150)}`);
  return r.json();
}
async function allar(q) {
  let ut = [], f = 0;
  for (;;) { const d = await sb(`${q}&offset=${f}&limit=1000`); if (!d.length) break; ut = ut.concat(d); if (d.length < 1000) break; f += 1000; }
  return ut;
}
const K = s => String(s || '').replace(/\D/g, '');

(async () => {
  const [co, base, ut, docs, rf] = await Promise.all([
    allar('fyrirtaeki?select=id,nafn,kennitala,stadur_nr,er_i_thjonustu,heimilisfang,customer_base_id&deleted_at=is.null&order=id'),
    allar('customers_base?select=id,nafn,kennitala,rekstrarfelag&order=id'),
    allar('uttaeki?select=fyrirtaeki_id,status,client&order=id'),
    allar('customer_documents?select=fyrirtaeki_id,doc_type,year,is_duplicate&order=id'),
    allar('arsskodun_report_facts?select=fyrirtaeki_id,report_year,total_devices,inspect_month&order=fyrirtaeki_id'),
  ]);

  const T = new Map(), DR = new Map();
  ut.forEach(u => { if (u.fyrirtaeki_id == null || u.status === 'urelt') return;
    T.set(u.fyrirtaeki_id, (T.get(u.fyrirtaeki_id) || 0) + 1); });
  const nafnAf = new Map(co.map(c => [c.id, c.nafn]));
  ut.forEach(u => { if (u.fyrirtaeki_id == null || u.status === 'urelt') return;
    if ((u.client || '') !== nafnAf.get(u.fyrirtaeki_id)) DR.set(u.fyrirtaeki_id, (DR.get(u.fyrirtaeki_id) || 0) + 1); });
  const D = new Map(), DSK = new Map();
  docs.forEach(d => { if (d.fyrirtaeki_id == null) return;
    D.set(d.fyrirtaeki_id, (D.get(d.fyrirtaeki_id) || 0) + 1);
    if (!d.is_duplicate) DSK.set(d.fyrirtaeki_id, (DSK.get(d.fyrirtaeki_id) || 0) + 1); });
  const RF = new Map(rf.map(r => [r.fyrirtaeki_id, r]));
  const bId = new Map(base.map(b => [b.id, b]));

  const perKt = new Map();
  co.forEach(c => { const k = K(c.kennitala); if (!k) return; if (!perKt.has(k)) perKt.set(k, []); perKt.get(k).push(c); });

  const stadur = c => {
    const r = RF.get(c.id);
    return {
      fid: c.id, nafn: c.nafn, heimilisfang: c.heimilisfang || null,
      nr: c.stadur_nr == null ? null : c.stadur_nr,
      ithj: c.er_i_thjonustu === true,
      taeki: T.get(c.id) || 0,
      skjol: D.get(c.id) || 0, skjolHrein: DSK.get(c.id) || 0,
      skyrsluAr: r ? r.report_year : null, skyrslutala: r ? r.total_devices : null,
      man: r && r.inspect_month ? r.inspect_month : null,
      nafnrek: DR.get(c.id) || 0,
      base: c.customer_base_id || null,
    };
  };

  const hopar = [...perKt.entries()].filter(([, s]) => s.length > 1)
    .map(([kt, s]) => {
      const b = s.map(x => bId.get(x.customer_base_id)).find(Boolean);
      const stadir = s.map(stadur).sort((a, b2) => (a.nr == null ? 99 : a.nr) - (b2.nr == null ? 99 : b2.nr));
      return {
        kt, nafn: (b && b.nafn) || s[0].nafn.split(/\s+[-–]\s+/)[0],
        merki: (b && b.rekstrarfelag) || null,
        stadir,
        taeki: stadir.reduce((a, x) => a + x.taeki, 0),
        skjol: stadir.reduce((a, x) => a + x.skjol, 0),
        ithj: stadir.filter(x => x.ithj).length,
        stadfest: stadir.filter(x => x.skyrslutala != null && x.skyrslutala === x.taeki).length,
        anNr: stadir.filter(x => x.nr == null).length,
      };
    }).sort((a, b) => b.stadir.length - a.stadir.length || b.taeki - a.taeki);

  // greiðendur undir merki (t.d. Heimaleiga) sem eru EKKI hluti af fjölstaða-kt
  const merkjaHopar = {};
  base.filter(b => b.rekstrarfelag).forEach(b => {
    const m = b.rekstrarfelag;
    if (!merkjaHopar[m]) merkjaHopar[m] = [];
    const stadir = co.filter(c => c.customer_base_id === b.id).map(stadur);
    merkjaHopar[m].push({ baseId: b.id, nafn: b.nafn, kt: K(b.kennitala), stadir,
      taeki: stadir.reduce((a, x) => a + x.taeki, 0) });
  });

  process.stdout.write(JSON.stringify({
    maelt: new Date().toISOString().slice(0, 10),
    hopar, merkjaHopar,
    heild: { fjolstada: hopar.length, taeki: hopar.reduce((a, x) => a + x.taeki, 0) },
  }, null, 1));
})().catch(e => { console.error('❌ ' + e.message); process.exit(1); });
