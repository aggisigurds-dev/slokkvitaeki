/**
 * Skýrslu-proxy — þjónar vistuðum brunakerfis-skoðunarskýrslum (HTML) úr
 * Supabase Storage með réttu content-type.
 *
 * Af hverju: Supabase Storage neitar að þjóna HTML inline af public-URL
 * (skilar alltaf `Content-Type: text/plain` + nosniff, vörn gegn phishing) —
 * skýrslan birtist þá sem hrár kóði. Þessi funktion sækir skjalið server-side
 * og skilar því sem `text/html`, svo græni árpunkturinn í Brunakerfi yfirlit
 * (patch 272/273) opnar alvöru skýrslu.
 *
 * Endpoint:  GET /api/skyrsla-proxy?p=brunakerfi-skyrslur/<coId>/<skra>.html
 * Öryggi: paths eru læstir við brunakerfi-skyrslur/-möppuna í samningar-bucket
 * (ekkert opið proxy).
 */
const SUPABASE_URL = 'https://osfdzskyvisifcwyjkuk.supabase.co';

exports.handler = async (event) => {
  const p = (event.queryStringParameters && event.queryStringParameters.p) || '';
  if (!/^brunakerfi-skyrslur\/[\w\-]+\/[\w\-.]+\.html$/.test(p)) {
    return { statusCode: 400, body: 'invalid path' };
  }
  try {
    const r = await fetch(SUPABASE_URL + '/storage/v1/object/public/samningar/' +
      p.split('/').map(encodeURIComponent).join('/'));
    if (!r.ok) return { statusCode: r.status === 404 ? 404 : 502, body: 'skjal fannst ekki (' + r.status + ')' };
    const html = await r.text();
    return {
      statusCode: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
      body: html
    };
  } catch (e) {
    return { statusCode: 502, body: 'villa: ' + (e.message || e) };
  }
};
