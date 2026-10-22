// Dregur texta úr skýrslum (PDF) fyrir gáttina og skrifar JSON {docId: texti}. Texta er síðan hlaðið í customer_documents.skyrsla_texti (UPDATE … FROM (VALUES …)).
// Keyrt 22.10.2026 fyrir Center Hótel (58 skjöl). Þarf pdftotext. notkun: node tools/skyrsla-texti.cjs <slug>  (slug = opinn aðgangur)
// Dregur texta úr skýrslum (PDF) fyrir gáttina: Annað / Athugasemdir / Ábendingar.
// notkun: node extract-texti.cjs <slug>   → texti-<slug>.json  {docId: texti}
const fs = require('fs');
const { execFileSync } = require('child_process');
const slug = process.argv[2] || 'center-hotel';
const base = 'https://slokkvitaeki.netlify.app';

const ENGAR = /^(án athugasemda|engar athugasemdir|engar|ekkert|0|-|–|—)\.?$/i;
const SKUR = (t) => t.replace(/\s*Fyrir hönd.*$/is, '').trim();
const hreinsa = (t) => t.replace(/\s+/g, ' ').replace(/ ?([.,;:])(?![\d\s])/g, '$1 ').replace(/\s+/g, ' ').trim();
function draga(txt) {
  const t = txt.replace(/\r/g, '');
  // 1) Slökkvitækjaskýrsla: „Annað:" … „Athugasemdir:" …
  let m = t.match(/Annað:\s*([\s\S]*?)\n\s*Athugasemdir:\s*([\s\S]*?)(?:\n\s*\n\s*Fyrir hönd|\n\s*Fyrir hönd|$)/);
  if (m) {
    const ann = hreinsa(SKUR(m[1]));
    const ath = hreinsa(SKUR(m[2]));
    const engin = !ath || ENGAR.test(ath);
    return [ann, engin ? '' : 'Athugasemdir: ' + ath].filter(Boolean).join(' ') || 'Án athugasemda.';
  }
  // 2) Brunakerfi, nýtt snið: „ATHUGASEMDIR OG ÁBENDINGAR"
  m = t.match(/ATHUGASEMDIR OG ÁBENDINGAR([\s\S]*)/);
  if (m) {
    const blk = m[1].split(/\n\s*\n\s*\S+\s{3,}\d\d\/\d\d\/\d{4}/)[0];
    const items = [];
    blk.split('\n').forEach((l) => { const x = l.match(/^\s*[•\-–]\s*(.+)$/); if (x) items.push(hreinsa(x[1])); });
    if (items.length) return items.join(' · ');
    return 'Engar athugasemdir.';
  }
  // 3) Brunakerfi, gátlistasnið: „Athugasemdir" (heiti á bls. 2) + línur
  const idx = [...t.matchAll(/^\s*Athugasemdir\s*$/gm)];
  if (idx.length) {
    const i = idx[idx.length - 1].index + idx[idx.length - 1][0].length;
    const lines = t.slice(i).split('\n').map((l) => l.trim());
    const out = [];
    for (const l of lines) {
      if (!l) { if (out.length) { if (out.length > 0 && out[out.length - 1] === '') break; out.push(''); } continue; }
      if (/^(Prófun framkvæmd|Prófun framhvæmd|Athugasemdir án)/i.test(l)) break;
      out.push(l);
    }
    const s = hreinsa(out.join(' '));
    return s && !ENGAR.test(s) ? s : 'Án athugasemda.';
  }
  m = t.match(/Athugasemdir:?\s*(án athugasemda|engar athugasemdir)/i);
  if (m) return 'Án athugasemda.';
  // Nýja brunakerfissniðið án athugasemdasíðu = engar ábendingar
  if (/SKOÐUNARSKÝRSLA/.test(t) && /BRUNAVIÐVÖRUNARKERFIS/.test(t)) return 'Án athugasemda.';
  return null;
}

(async () => {
  const g = await (await fetch(base + '/api/gatt?c=' + slug)).json();
  const docs = new Map();
  (g.reports || []).forEach((r) => { if (r.docId) docs.set(r.docId, r); });
  (g.buildings || []).forEach((b) => (b.saga || []).forEach((e) => { if (e.docId && !docs.has(e.docId)) docs.set(e.docId, { docId: e.docId, dags: e.m, tegund: e.t === 'bru' ? 'brunakerfi' : 'uttektarskyrsla', bygging: b.nafn }); }));
  fs.mkdirSync('pdfs2', { recursive: true });
  const out = {}; const log = [];
  for (const [id, r] of docs) {
    try {
      const pdf = 'pdfs2/' + id + '.pdf';
      if (!fs.existsSync(pdf)) {
        const res = await fetch(base + '/api/gatt-doc?doc=' + id + '&c=' + slug);
        const buf = Buffer.from(await res.arrayBuffer());
        if (res.status !== 200 || buf.slice(0, 4).toString() !== '%PDF') { log.push([id, r.bygging, r.dags, 'EKKI PDF ' + res.status]); continue; }
        fs.writeFileSync(pdf, buf);
      }
      let txt = '';
      try { txt = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { log.push([id, r.bygging, r.dags, 'pdftotext villa']); continue; }
      let tx = draga(txt);
      if (tx) { tx = SKUR(tx).replace(/\s+/g, ' ').trim(); if (ENGAR.test(tx)) tx = 'Án athugasemda.'; out[id] = tx.slice(0, 600); } else log.push([id, r.bygging, r.dags, 'enginn texti fannst']);
    } catch (e) { log.push([id, r.bygging, r.dags, 'villa ' + e.message]); }
  }
  fs.writeFileSync('texti-' + slug + '.json', JSON.stringify(out, null, 1));
  console.log('texti:', Object.keys(out).length, 'af', docs.size);
  log.forEach((l) => console.log('  ', l.join(' | ')));
  Object.entries(out).slice(0, 40).forEach(([id, t]) => console.log(id, '→', t.slice(0, 140)));
})();
