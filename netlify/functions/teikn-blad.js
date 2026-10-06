// teikn-blad — BLAÐSTÆRÐ teikningar í mm (06.10.2026, 383: raunhæð veggja í 3D).
//
// 3D-líkanið þarf að vita hve margir dílar frummyndarinnar eru í metra. Skjalasafnið gefur ekki upp kvarðann, en
// grunnmyndir aðaluppdrátta eru í 1:100 og blaðstærðin fæst hér:
//   • skannað (.tif/.jpg .info): FotoWeb gefur upp pixelwidth/pixelheight og upplausn (dpi) → mm.
//   • PDF (.pdf.info, eða beint PDF frá Kópavogi/Hafnarfirði/Garðabæ/Seltjarnarnesi): MediaBox fyrstu síðu (pt) → mm.
// Skilar { b_mm, h_mm, heimild } eða { villa } — biðlarinn notar þá gömlu forsenduna. Ekkert er vistað.

const LEYFDIR = new Set(['skjalasafn.reykjavik.is']);
const BEINIR = new Set(['gagnasja.kopavogur.is', 'teikningar.hafnarfjordur.is', 'teikningar.gardabaer.is', 'luks.seltjarnarnes.is']);
const HAMARK = 40 * 1024 * 1024;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const svara = (status, obj, geyma) => new Response(JSON.stringify(obj), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': geyma ? 'public, max-age=604800' : 'no-store' },
});
const bida = (ms) => new Promise((r) => setTimeout(r, ms));

async function saekjaMedThaki(slod, ms, valkostir) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(slod, Object.assign({}, valkostir, { signal: ac.signal })); }
  finally { clearTimeout(t); }
}

// MediaBox fyrstu síðu: fyrst í hreinum texta, annars í þjöppuðum hlutastraumum (PDF 1.5+ ObjStm).
// Fyrsta GILDA MediaBox: Hafnarfjörður (Norðurhella 17) setur [0 0 0 0] á síðutréð á undan réttri stærð síðunnar.
function fyrstaGilda(texti) {
  const re = /\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/g;
  let m;
  while ((m = re.exec(texti))) {
    const b = Math.abs(+m[3] - +m[1]), h = Math.abs(+m[4] - +m[2]);
    if (b > 50 && h > 50) return { b_mm: b * 25.4 / 72, h_mm: h * 25.4 / 72 };
  }
  return null;
}
async function mediaBox(bytes) {
  const latin = Buffer.from(bytes).toString('latin1');
  let bl = fyrstaGilda(latin);
  if (!bl) {
    const { inflateSync } = await import('node:zlib');
    const strm = /stream\r?\n/g;
    let s, n = 0;
    while (!bl && (s = strm.exec(latin)) && n++ < 400) {
      const enda = latin.indexOf('endstream', s.index);
      if (enda < 0) break;
      try { bl = fyrstaGilda(inflateSync(Buffer.from(bytes.subarray(s.index + s[0].length, enda))).toString('latin1')); } catch (_) {}
    }
  }
  return bl;
}

async function pdfBlad(r) {
  const lengd = Number(r.headers.get('content-length') || 0);
  if (lengd > HAMARK) return null;
  return mediaBox(new Uint8Array(await r.arrayBuffer()));
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const raw = new URL(req.url).searchParams.get('url') || '';
  let target;
  try { target = new URL(raw); } catch { return svara(400, { villa: 'Ógild slóð' }); }
  if (target.protocol !== 'https:') return svara(403, { villa: 'Hýsillinn er ekki leyfður' });

  try {
    if (BEINIR.has(target.hostname)) {
      if (!/\.pdf$/i.test(target.pathname)) return svara(415, { villa: 'Ekki PDF' });
      const r = await saekjaMedThaki(target.href, 9000, { redirect: 'follow' });
      if (r.status !== 200) return svara(502, { villa: 'Teikningasafnið svaraði ' + r.status });
      const bl = await pdfBlad(r);
      return bl ? svara(200, { ...bl, heimild: 'pdf' }, true) : svara(422, { villa: 'Engin MediaBox' });
    }
    if (!LEYFDIR.has(target.hostname) || !/\.info$/i.test(target.pathname)) return svara(403, { villa: 'Hýsillinn er ekki leyfður' });
    const base = target.protocol + '//' + target.host;

    // Skönnun: FotoWeb segir dílafjölda og upplausn.
    if (!/\.pdf\.info$/i.test(target.pathname)) {
      const r = await saekjaMedThaki(target.href, 8000, { headers: { accept: 'application/vnd.fotoware.asset+json' } });
      if (r.status !== 200) return svara(502, { villa: 'Skjalasafnið svaraði ' + r.status });
      const a = ((await r.json()) || {}).attributes || {}, im = a.imageattributes || {};
      const dpi = Number(im.resolution) || 0, pb = Number(im.pixelwidth) || 0, ph = Number(im.pixelheight) || 0;
      if (dpi < 50 || !pb || !ph) return svara(422, { villa: 'Engin upplausn í skjalasafninu' });
      return svara(200, { b_mm: pb / dpi * 25.4, h_mm: ph / dpi * 25.4, heimild: 'fotoweb', dpi }, true);
    }

    // PDF í skjalasafninu: frumritið um rendition-flæðið (sama og teikn-pdf), MediaBox lesið hér.
    const bidja = await fetch(base + '/fotoweb/services/renditions', {
      method: 'POST',
      headers: { 'content-type': 'application/vnd.fotoware.rendition-request+json', accept: 'application/vnd.fotoware.rendition-response+json' },
      body: JSON.stringify({ href: target.pathname + '/__renditions/ORIGINAL' }),
      signal: AbortSignal.timeout(8000),
    });
    if (bidja.status !== 202 && bidja.status !== 200) return svara(502, { villa: 'Skjalasafnið hafnaði beiðninni (' + bidja.status + ')' });
    let stadur = bidja.headers.get('location');
    if (!stadur) { const b = await bidja.json().catch(() => null); stadur = b && b.href; }
    if (!stadur) return svara(502, { villa: 'Engin slóð á skjalið' });
    const slod = stadur.startsWith('http') ? stadur : base + stadur;
    for (let i = 0; i < 9; i++) {
      if (i) await bida(800);
      const r = await saekjaMedThaki(slod, 8000, { redirect: 'follow' });
      if (r.status === 200) {
        if (/text\/html|json/i.test(r.headers.get('content-type') || '')) continue;
        const bl = await pdfBlad(r);
        return bl ? svara(200, { ...bl, heimild: 'pdf' }, true) : svara(422, { villa: 'Engin MediaBox' });
      }
      if (r.status >= 400 && r.status !== 404) return svara(502, { villa: 'Skjalasafnið svaraði ' + r.status });
    }
    return svara(504, { villa: 'Skjalið var ekki tilbúið í tæka tíð' });
  } catch (_) {
    return svara(502, { villa: 'Náði ekki í blaðstærð' });
  }
};
