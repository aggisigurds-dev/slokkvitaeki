/**
 * Kennitala lookup — server-side proxy.
 *
 * The browser can't hit Iceland's company-lookup endpoints directly because
 * none of them set CORS headers. So we fetch them from this Netlify function
 * and return JSON to the client. Free, no API key needed for company kts.
 *
 * Endpoint:
 *   GET /.netlify/functions/kt-lookup?kt=5301693759
 *   →  { nafn, heimilisfang, stadur, postnumer, source }
 *      404 if not found
 *
 * Source: Skatturinn (RSK) Fyrirtækjaskrá public registry.
 */
export default async (req) => {
  const url = new URL(req.url);
  const kt = (url.searchParams.get('kt') || '').replace(/[^0-9]/g, '');
  const nafn = (url.searchParams.get('nafn') || '').trim();

  // Name-search mode (2026-07-14): ?nafn=<query> → RSK fyrirtækjaskrá name
  // search, returns { results: [{ kennitala, nafn, heimilisfang_full }] }.
  // Result rows on the RSK page: <tr class="active"> with
  //   <td><a href=".../kennitala/NNNNNNNNNN">NNNNNNNNNN</a></td>
  //   <td>Nafn <em> </em></td> <td>Heimilisfang, 109 Reykjavík</td>
  if (!kt && nafn.length >= 2) {
    try {
      const target = `https://www.skatturinn.is/fyrirtaekjaskra/leit?nafn=${encodeURIComponent(nafn)}`;
      const r = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Slokkvitaeki/1.0; +https://slokkvitaeki.netlify.app)',
          'Accept': 'text/html',
        },
      });
      if (!r.ok) {
        return new Response(JSON.stringify({ error: `RSK ${r.status}` }), { status: 502, headers: cors() });
      }
      const html = await r.text();
      const results = [];
      const rowRe = /<tr[^>]*>\s*(?:<td[^>]*>\s*)?<td><a href="[^"]*kennitala\/(\d{10})">\d{10}<\/a><\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g;
      let m;
      while ((m = rowRe.exec(html)) && results.length < 15) {
        const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        results.push({ kennitala: m[1], nafn: clean(m[2]), heimilisfang_full: clean(m[3]) });
      }
      return new Response(JSON.stringify({ query: nafn, results, source: 'skatturinn' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'public, max-age=3600' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 500, headers: cors() });
    }
  }

  if (kt.length !== 10) {
    return new Response(JSON.stringify({ error: 'Invalid kennitala' }), {
      status: 400,
      headers: cors(),
    });
  }
  try {
    const target = `https://www.skatturinn.is/fyrirtaekjaskra/leit/kennitala/${kt}`;
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Slokkvitaeki/1.0; +https://slokkvitaeki.netlify.app)',
        'Accept': 'text/html',
      },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `RSK ${r.status}` }), {
        status: 404,
        headers: cors(),
      });
    }
    const html = await r.text();

    // Title line: "<h1>Ferðafélag Íslands (5301693759)</h1>"
    const nameMatch = html.match(/<h1>\s*([^<(]+?)\s*\((\d{10})\)\s*<\/h1>/);
    const nafn = nameMatch ? nameMatch[1].trim() : '';

    // Find the first "Póstfang" or "Lögheimili" table cell address.
    // Format: "<td>Mörkinni 6 <br /> 108 Reykjavík</td>"
    let heimilisfang = '', postnumer = '', stadur = '';
    const addrMatch = html.match(/<td>\s*([^<>]+?)\s*<br\s*\/?>\s*(\d{3})\s+([^<>]+?)\s*<\/td>/);
    if (addrMatch) {
      heimilisfang = addrMatch[1].trim();
      postnumer    = addrMatch[2].trim();
      stadur       = addrMatch[3].trim();
    }

    if (!nafn) {
      return new Response(JSON.stringify({ error: 'not-found', kt }), {
        status: 404,
        headers: cors(),
      });
    }

    return new Response(JSON.stringify({
      kennitala: kt,
      nafn,
      heimilisfang,
      postnumer,
      stadur,
      // Combined address suitable for the bill-to block on receipts:
      heimilisfang_full: [heimilisfang, postnumer && stadur ? `${postnumer} ${stadur}` : (postnumer || stadur)]
        .filter(Boolean).join(', '),
      source: 'skatturinn',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors(), 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e && e.message || e) }), {
      status: 500,
      headers: cors(),
    });
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const config = { path: '/api/kt-lookup' };
