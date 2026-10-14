#!/usr/bin/env node
/* GREINING Í HÓP — „Greining fasteignar" (451) fyrir heilan hóp staða án þess að opna hvern og einn (14.10.2026)
 *
 * Agnar 14.10.2026: „taka öll fyrirtækin í brunakerfi og Heimaleigu og láta lesa ýtarlega greiningu og setja
 * byggingarblöðin í OCR lestur og fyllt inn".
 *
 * Gerir nákvæmlega það sem síðan gerir, fyrir hvern stað í hópnum:
 *   1. bygging-uppl (Netlify-fallið, les aðeins) → eign (landnr/heitinr), skjölin í skjalasafninu, tölur sem þegar eru lesnar
 *   2. --skrifa: skyndiminnisröð í fasteign_greining (tegund 'eign', lykill 'eign:<landnr>[:<heitinr>]') — SAMA snið og
 *      451 vistaSkyndi (gogn = { bygg, teikn, adr, saott, utgafa }); teikn-samantekt sem þegar er í röðinni er haldið.
 *      Aldrei þegar eignin er óviss (oviss) — þá er staðurinn talinn upp til að velja matshluta handvirkt í 451.
 *   3. --ocr: beiðni í automation_triggers (workflow 'bygging-ocr', status 'bida') með allt að 6 ólesnum skjölum, nema
 *      beiðni fyrir sama landnúmer bíði/sé í vinnslu. Brúin (luna-bridge bygging-ocr.js á skrifstofutölvunni) les þau
 *      með RapidOCR og skrifar lesturinn í fasteign_greining (tegund 'skjal') — næsta bygging-uppl-svar ber tölurnar.
 * Skrifar ALDREI í fyrirtaeki, uttaeki, teikning_bord né aðrar töflur okkar (sama regla og 451 / audit-greining.cjs).
 *
 *   node tools/greina-hop.cjs                       þurrkeyrsla: brunakerfi + Heimaleiga, prentar yfirlit
 *   node tools/greina-hop.cjs --skrifa --ocr        skrifar eign-raðir og setur OCR-beiðnir
 *   node tools/greina-hop.cjs --fid 205,1483        aðeins þessir staðir
 *   node tools/greina-hop.cjs --hopur heimaleiga    aðeins annar hópurinn (brunakerfi | heimaleiga)
 *   --json <skrá>   skrifar niðurstöðuna líka sem JSON
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const U = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const K = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const SITE = process.env.SLOKK_SITE || 'https://slokkvitaeki.netlify.app';
const args = process.argv.slice(2);
const SKRIFA = args.includes('--skrifa'), OCR = args.includes('--ocr');
const FIDS = args.includes('--fid') ? args[args.indexOf('--fid') + 1].split(',').map(Number) : null;
const HOPUR = args.includes('--hopur') ? args[args.indexOf('--hopur') + 1] : null;
const JSON_UT = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

const get = async (q) => { const r = await fetch(U + '/rest/v1/' + q, { headers: H }); if (!r.ok) throw new Error(q.slice(0, 80) + ' → ' + r.status + ' ' + (await r.text()).slice(0, 200)); return r.json(); };
const bid = ms => new Promise(r => setTimeout(r, ms));
const getAll = async (q) => { const out = []; for (let off = 0; ; off += 1000) { const b = await get(q + '&limit=1000&offset=' + off); out.push(...b); if (b.length < 1000) break; } return out; };   // PostgREST skilar mest 1000 röðum — fyrirtaeki eru 1.234 (14.10)
// heimilisföng eins og Staðfangaskrá HMS skrifar þau (fyrirtaeki.heimilisfang er handslegið)
const LEIDRETT = { 'Vegamótastígur 9, 101 Reykjavik': 'Vegamótastígur 9, 101 Reykjavík', '17 júnítorg 1-7, 101 Reykjavík': '17. júnítorg 1, 101 Reykjavík' };
// „Laugavegur 18, 101 Reykjavík (3.–6. hæð)" → „Laugavegur 18, 101 Reykjavík"; „Flatahraun 5a, 220 Hafnarfirði" óbreytt (fallið skilur það)
const hreinsa = a => { const h = String(a || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim(); return LEIDRETT[h] || h; };
const lykillEignar = e => e && e.landnr ? 'eign:' + e.landnr + (e.svf && e.heitinr ? ':' + e.heitinr : '') : null;

async function byggingUppl(adr) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 60000);
  try {
    const r = await fetch(SITE + '/.netlify/functions/bygging-uppl?heimilisfang=' + encodeURIComponent(adr), { signal: ctl.signal });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (_) { return { error: 'ógilt svar ' + r.status + ': ' + txt.slice(0, 80) }; }
    return j;
  } catch (e) { return { error: String(e.message || e) }; } finally { clearTimeout(t); }
}

(async () => {
  const st = await get('app_settings?id=eq.1&select=b:settings->brunakerfi_customers');
  const brunakerfiIds = Object.keys((st[0] && st[0].b) || {}).map(Number);
  const allir = await getAll('fyrirtaeki?deleted_at=is.null&select=id,nafn,heimilisfang,postnumer,kennitala,er_i_thjonustu&order=id');
  let stadir = allir.filter(f => brunakerfiIds.includes(f.id) || /^heimaleiga/i.test(f.nafn || '')).map(f => Object.assign({ hopur: brunakerfiIds.includes(f.id) ? 'brunakerfi' : 'heimaleiga' }, f));
  if (FIDS) stadir = stadir.filter(f => FIDS.includes(f.id));
  if (HOPUR) stadir = stadir.filter(f => f.hopur === HOPUR);
  // sama heimilisfang hjá fleiri en einum stað → ein uppfletting, allir taldir
  const eftirAdr = new Map();
  stadir.forEach(f => { const a = hreinsa(f.heimilisfang); if (!a || !/\d/.test(a)) { f.sleppt = 'ekkert götunúmer í heimilisfangi'; return; } (eftirAdr.get(a) || eftirAdr.set(a, []).get(a)).push(f); });
  console.log('GREINING Í HÓP — ' + stadir.length + ' staðir (' + stadir.filter(s => s.hopur === 'brunakerfi').length + ' brunakerfi · ' + stadir.filter(s => s.hopur === 'heimaleiga').length + ' Heimaleiga), ' + eftirAdr.size + ' heimilisföng' + (SKRIFA ? ' · SKRIFAR eign-raðir' : '') + (OCR ? ' · SETUR OCR-BEIÐNIR' : '') + (!SKRIFA && !OCR ? ' · ÞURRKEYRSLA' : ''));
  stadir.filter(s => s.sleppt).forEach(s => console.log('  SLEPPT ' + s.id + ' ' + s.nafn + ' — ' + s.sleppt + ' („' + s.heimilisfang + '")'));

  // beiðnir sem þegar bíða / eru í vinnslu (per landnúmer)
  const bida = await get('automation_triggers?workflow=eq.bygging-ocr&status=in.(bida,pending,running)&select=id,status,gogn');
  const bidaLandnr = new Map(); bida.forEach(t => { const l = t.gogn && t.gogn.landnr; if (l) bidaLandnr.set(String(l), t); });

  const ut = [];
  for (const [adr, felog] of eftirAdr) {
    const heiti = felog.map(f => f.nafn).join(' / ');
    const j = await byggingUppl(adr);
    const lina = { adr, felog: felog.map(f => ({ id: f.id, nafn: f.nafn, hopur: f.hopur })) };
    if (!j || (j.error && !j.eign)) { lina.stada = 'fannst ekki'; lina.villa = j && j.error; ut.push(lina); console.log('  ✗ ' + adr.padEnd(44) + ' ' + heiti.slice(0, 40).padEnd(40) + ' fannst ekki: ' + (j && j.error)); await bid(800); continue; }
    const e = j.eign || {}; lina.landnr = e.landnr; lina.heitinr = e.heitinr; lina.safn = e.safn; lina.oviss = !!(j.oviss || e.oviss);
    lina.m2 = j.m2; lina.haedir = j.haedir && j.haedir.listi ? j.haedir.listi.length : null; lina.eignir = j.eignir; lina.byggingarar = j.byggingarar;
    lina.skjol = (j.heimildir || []).length; lina.olesin = (j.olesin || []).length; lina.lesin = (j.heimildir || []).filter(h => h.lesin).length;
    lina.brunavarnir = !!(j.brunavarnir && Object.keys(j.brunavarnir).length);
    // 2. eign-röð
    if (lina.oviss) lina.stada = 'óviss eign — velja matshluta í 451';
    else if (SKRIFA) {
      const lyk = lykillEignar(e);
      if (!lyk) lina.stada = 'ekkert landnúmer';
      else {
        const fyrri = await get('fasteign_greining?lykill=eq.' + encodeURIComponent(lyk) + '&select=gogn');
        const teikn = fyrri[0] && fyrri[0].gogn && fyrri[0].gogn.teikn ? fyrri[0].gogn.teikn : null;
        const gogn = { bygg: j, teikn, adr, saott: new Date().toISOString(), utgafa: 1 };
        const r = await fetch(U + '/rest/v1/fasteign_greining?on_conflict=lykill', { method: 'POST', headers: Object.assign({ Prefer: 'resolution=merge-duplicates,return=minimal' }, H), body: JSON.stringify({ lykill: lyk, tegund: 'eign', landnr: e.landnr, heitinr: e.svf ? e.heitinr : null, heimilisfang: e.label || adr, gogn, uppruni: 'greining-hop-20261014' }) });
        lina.stada = r.ok ? 'eign-röð skrifuð' : 'eign-röð brást ' + r.status + ' ' + (await r.text()).slice(0, 120);
      }
    } else lina.stada = 'eign fundin';
    // 3. OCR-beiðni
    if (lina.olesin && !lina.oviss) {
      const fyrir = bidaLandnr.get(String(e.landnr));
      if (fyrir) lina.ocr = 'beiðni ' + fyrir.id + ' þegar ' + fyrir.status;
      else if (OCR) {
        const skjol = (j.olesin || []).slice(0, 6).map(s => ({ slod: s.slod, tegund: s.tegund, dags: s.dags || null, lysing: s.lysing || '' }));
        const r = await fetch(U + '/rest/v1/automation_triggers', { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, H), body: JSON.stringify({ workflow: 'bygging-ocr', status: 'bida', requested_by: 'greining-hop', gogn: { landnr: e.landnr, heitinr: e.heitinr || null, svf: e.svf || null, heimilisfang: e.label ? e.label + (e.postnr ? ', ' + e.postnr : '') : adr, skjol } }) });
        const d = r.ok ? await r.json() : null;
        lina.ocr = d && d[0] ? 'beiðni ' + d[0].id + ' (' + skjol.length + ' skjöl)' : 'beiðni brást ' + r.status;
        if (d && d[0]) bidaLandnr.set(String(e.landnr), { id: d[0].id, status: 'bida' });
      } else lina.ocr = lina.olesin + ' ólesin' + (lina.olesin > 6 ? ' (6 í einu)' : '');
    } else if (!lina.olesin) lina.ocr = lina.skjol ? 'allt lesið' : 'engin skjöl';
    ut.push(lina);
    console.log('  ' + (lina.oviss ? '?' : '✓') + ' ' + adr.padEnd(44).slice(0, 44) + ' ' + heiti.slice(0, 40).padEnd(40) + ' L' + String(e.landnr || '').padEnd(7) + ' ' + String(e.safn || '').slice(0, 22).padEnd(22) + ' m² ' + String(j.m2 == null ? '—' : j.m2).padStart(8) + '  skjöl ' + String(lina.skjol).padStart(2) + ' (lesin ' + lina.lesin + ')  ' + lina.stada + ' · ' + (lina.ocr || ''));
    await bid(800);
  }
  const n = k => ut.filter(x => x.stada && x.stada.startsWith(k)).length;
  console.log('\nSAMANTEKT: ' + ut.length + ' heimilisföng · eign fundin ' + ut.filter(x => x.landnr && !x.oviss).length + ' · óviss ' + ut.filter(x => x.oviss).length + ' · fannst ekki ' + n('fannst') + ' · með lesnar tölur (m²) ' + ut.filter(x => x.m2 != null).length + ' · með ólesin skjöl ' + ut.filter(x => x.olesin).length + ' · OCR-beiðnir settar ' + ut.filter(x => /^beiðni \d+ \(/.test(x.ocr || '')).length);
  if (JSON_UT) { fs.writeFileSync(JSON_UT, JSON.stringify(ut, null, 1)); console.log('JSON → ' + JSON_UT); }
})().catch(e => { console.error('VILLA:', e.message); process.exit(1); });
