#!/usr/bin/env node
/**
 * drive-til-storage.cjs — afritar skjöl sem eru AÐEINS í Google Drive (customer_documents.drive_file_id
 * án storage_path) inn í Supabase Storage og skráir storage_path á röðina. Drive-auðkennið stendur áfram.
 *
 * 23.10.2026 (Agnar: „Drive afritið er oft glitchy … hefði helst viljað fá afrit af öllu sem er bara í Drive
 * inn á Supabase og síðan slökkva á sýnileikanum á Drive-afritinu").
 *
 * Leiðin: hub-fallið brunaholf.netlify.app/api/skjal?id=<drive> streymir skjalinu með þjónustureikningi og
 * skilar ETag = md5 skjalsins í Drive. Við sannreynum md5 á því sem kom, hlöðum upp í
 * samningar/drive-afrit/<doc_type>/<fyrirtaeki_id|base-<id>|laus>/<docId>_<heiti>.<ext>, lesum það til baka
 * af opinberu slóðinni (stærð verður að stemma) og skrifum þá fyrst storage_path. Dauður Drive-hlekkur
 * (404/403 frá hub) fær link_ok=false + link_status, ekkert annað snert.
 *
 *   node tools/drive-til-storage.cjs --dry            # telja og sýna fyrstu 10, skrifa ekkert
 *   node tools/drive-til-storage.cjs --limit 3        # afrita 3 (próf)
 *   node tools/drive-til-storage.cjs                  # allt; endurkeyranlegt (sleppir röðum með storage_path)
 *   node tools/drive-til-storage.cjs --ids 1219,2497  # aðeins þessar raðir
 *
 * Skýrsla: tools/_drive-til-storage.log (ein lína per skjal) + tools/_drive-til-storage-villur.json.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = __dirname;
const cfg = fs.readFileSync(path.join(dir, '..', 'js/config.js'), 'utf8');
const URL_ = process.env.SUPABASE_URL || (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const HUB = 'https://brunaholf.netlify.app/api/skjal?id=';
const BUCKET = 'samningar', ROOT = 'drive-afrit';
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d; };
const DRY = flag('--dry'), LIMIT = parseInt(val('--limit', '0'), 10) || 0, IDS = (val('--ids', '') || '').split(',').filter(Boolean).map(Number);
const PAR = parseInt(val('--par', '4'), 10) || 4;
const LOG = path.join(dir, '_drive-til-storage.log'), ERR = path.join(dir, '_drive-til-storage-villur.json');
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const log = (s) => { const l = new Date().toISOString().slice(11, 19) + ' ' + s; console.log(l); try { fs.appendFileSync(LOG, l + '\n'); } catch (_) {} };

async function sbGet(q) { const r = await fetch(URL_ + '/rest/v1/' + q, { headers: H }); if (!r.ok) throw new Error('sbGet ' + r.status + ' ' + q.slice(0, 80)); return r.json(); }
async function sbPatch(id, body) {
  if (DRY) return true;
  const r = await fetch(URL_ + '/rest/v1/customer_documents?id=eq.' + id, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('patch ' + r.status + ' ' + (await r.text()).slice(0, 120));
  const j = await r.json(); if (!Array.isArray(j) || j.length !== 1) throw new Error('patch skilaði ' + JSON.stringify(j).slice(0, 80));
  return true;
}
// Allar raðir sem vantar storage_path — í síðum (1000-raða þakið, sjá project_1000_rada_thak).
async function allRows() {
  if (IDS.length) return sbGet(`customer_documents?id=in.(${IDS.join(',')})&select=id,doc_type,year,fyrirtaeki_id,customer_base_id,drive_file_id,storage_path,file_name,is_duplicate`);
  const out = []; let from = 0;
  for (;;) {
    const page = await sbGet(`customer_documents?drive_file_id=not.is.null&drive_file_id=not.like.sb:*&storage_path=is.null&or=(is_duplicate.is.null,is_duplicate.eq.false)&select=id,doc_type,year,fyrirtaeki_id,customer_base_id,drive_file_id,storage_path,file_name&order=id.asc&offset=${from}&limit=1000`);
    out.push(...page); if (page.length < 1000) break; from += 1000;
  }
  return out;
}
// Lykillinn í Storage er ASCII (öruggast í slóðum); upprunalega heitið stendur í file_name/Drive.
const TR = { 'þ': 'th', 'Þ': 'Th', 'ð': 'd', 'Ð': 'D', 'æ': 'ae', 'Æ': 'Ae', 'ö': 'o', 'Ö': 'O', 'ø': 'o', 'ß': 'ss' };
const safe = (s) => String(s || '').replace(/[þÞðÐæÆöÖøß]/g, (c) => TR[c]).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'skjal';
function objPath(d, name, ext) {
  const hvar = d.fyrirtaeki_id != null ? String(d.fyrirtaeki_id) : (d.customer_base_id != null ? 'base-' + d.customer_base_id : 'laus');
  const base = safe((name || d.file_name || '').replace(/\.[A-Za-z0-9]{2,5}$/, ''));
  return `${ROOT}/${d.doc_type || 'annad'}/${hvar}/${d.id}_${base}.${ext}`;
}
const extOf = (ct, name) => {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(String(name || '')); if (m) return m[1].toLowerCase();
  return /pdf/.test(ct) ? 'pdf' : /jpeg|jpg/.test(ct) ? 'jpg' : /png/.test(ct) ? 'png' : /gif/.test(ct) ? 'gif' : 'bin';
};
const villur = [];
let ok = 0, dead = 0, bilun = 0, sleppt = 0;

async function einn(d) {
  try {
    // 1) sækja úr Drive gegnum hubinn (2 tilraunir)
    let r, bytes, etag, ct, nafn;
    for (let t = 0; t < 2; t++) {
      r = await fetch(HUB + encodeURIComponent(d.drive_file_id));
      if (r.status === 404 || r.status === 403 || r.status === 410) break;
      if (!r.ok) { await new Promise((z) => setTimeout(z, 1500)); continue; }
      bytes = Buffer.from(await r.arrayBuffer()); etag = (r.headers.get('etag') || '').replace(/^W\//, '').replace(/"/g, ''); ct = r.headers.get('content-type') || 'application/pdf';
      const cd = r.headers.get('content-disposition') || ''; const fm = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(cd); nafn = fm ? decodeURIComponent(fm[1]) : '';
      break;
    }
    if (!bytes) {
      if (r && (r.status === 404 || r.status === 403 || r.status === 410)) {
        dead++; log(`DAUÐUR ${d.id} drive=${d.drive_file_id} hub=${r.status}`);
        villur.push({ id: d.id, drive: d.drive_file_id, status: r.status, doc_type: d.doc_type, fid: d.fyrirtaeki_id });
        await sbPatch(d.id, { link_ok: false, link_status: String(r.status), link_checked_at: new Date().toISOString() });
        return;
      }
      throw new Error('hub ' + (r ? r.status : '?'));
    }
    if (bytes.length < 100) throw new Error('tómt svar (' + bytes.length + ' B)');
    const md5 = crypto.createHash('md5').update(bytes).digest('hex');
    if (etag && /^[0-9a-f]{32}$/.test(etag) && etag !== md5) throw new Error('md5 stemmir ekki við Drive (' + etag.slice(0, 8) + ' ≠ ' + md5.slice(0, 8) + ')');
    if (/pdf/.test(ct) && bytes.slice(0, 5).toString() !== '%PDF-') throw new Error('ekki PDF-haus þó content-type segi pdf');
    const ext = extOf(ct, nafn || d.file_name);
    const op = objPath(d, nafn, ext);
    if (DRY) { ok++; log(`DRY ${d.id} ${bytes.length}B ${ct} → ${BUCKET}/${op}`); return; }
    // 2) hlaða upp
    const u = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${op.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { ...H, 'Content-Type': ct, 'x-upsert': 'true' }, body: bytes });
    if (!u.ok) throw new Error('upload ' + u.status + ' ' + (await u.text()).slice(0, 100));
    // 3) lesa til baka — stærðin verður að stemma
    const chk = await fetch(`${URL_}/storage/v1/object/public/${BUCKET}/${op.split('/').map(encodeURIComponent).join('/')}`, { method: 'HEAD' });
    const len = Number(chk.headers.get('content-length') || 0);
    if (!chk.ok || len !== bytes.length) throw new Error(`lestur til baka ${chk.status} ${len}B ≠ ${bytes.length}B`);
    // 4) skrá á röðina (Drive-auðkennið stendur áfram)
    await sbPatch(d.id, { storage_path: BUCKET + '/' + op, link_ok: true, link_status: '200', link_checked_at: new Date().toISOString() });
    ok++; log(`OK ${d.id} ${bytes.length}B ${op}`);
  } catch (e) {
    bilun++; log(`BILUN ${d.id} drive=${d.drive_file_id} ${e.message}`);
    villur.push({ id: d.id, drive: d.drive_file_id, villa: e.message, doc_type: d.doc_type, fid: d.fyrirtaeki_id });
  }
}

(async () => {
  if (!URL_ || !KEY) throw new Error('vantar SUPABASE_URL/KEY');
  let rows = await allRows();
  rows = rows.filter((d) => !d.storage_path && d.drive_file_id && !/^sb:/.test(d.drive_file_id) && !d.is_duplicate);
  if (LIMIT) rows = rows.slice(0, LIMIT);
  log(`${DRY ? 'DRY ' : ''}byrja: ${rows.length} skjöl aðeins í Drive`);
  if (DRY && !LIMIT) rows = rows.slice(0, 10);
  let i = 0;
  const worker = async () => { for (;;) { const d = rows[i++]; if (!d) return; await einn(d); } };
  await Promise.all(Array.from({ length: Math.min(PAR, rows.length) }, worker));
  try { fs.writeFileSync(ERR, JSON.stringify(villur, null, 1)); } catch (_) {}
  log(`búið: ok=${ok} dauðir=${dead} bilanir=${bilun} sleppt=${sleppt} (villur í ${path.basename(ERR)})`);
})().catch((e) => { log('HRUN ' + e.message); process.exit(1); });
