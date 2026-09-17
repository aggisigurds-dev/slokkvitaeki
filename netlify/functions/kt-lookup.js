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
        const heiti = clean(m[2]);
        results.push({
          kennitala: m[1],
          nafn: heiti,
          heimilisfang_full: clean(m[3]),
          // Skráin skrifar „(Félag afskráð)" aftan við nafnið og skilar engu heimilisfangi.
          afskrad: /afskr[aá]/i.test(heiti),
        });
      }
      // Eitt svar → skatturinn vísar BEINT á fyrirtækjasíðuna og taflan er ekki til
      // („byko" skilaði 0 þótt Byko ehf. sé til). Sú síða ER fyrirtækið og er lesin
      // hér með sömu reglum og kennitölu-greinin að neðan notar.
      if (!results.length) {
        const h1 = html.match(/<h1>\s*([^<(]+?)\s*\((\d{10})\)\s*<\/h1>/);
        if (h1) {
          const a = html.match(/<td>\s*([^<>]+?)\s*<br\s*\/?>\s*(\d{3})\s+([^<>]+?)\s*<\/td>/);
          results.push({
            kennitala: h1[2],
            nafn: h1[1].trim(),
            heimilisfang_full: a ? (a[1].trim() + ', ' + a[2] + ' ' + a[3].trim()) : '',
            afskrad: /Félag afskráð/i.test(html),
          });
        }
      }
      // Virk félög fyrst — afskráð eru sjaldnast það sem leitað er að.
      results.sort((x, y) => (x.afskrad ? 1 : 0) - (y.afskrad ? 1 : 0));
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

    // 2026-09-16 (ósk Agnars: „langar svolítið að geta séð sem flestar upplýsingar inn í
    // þessum banner"). Sama síða ber fleira en við vorum að lesa: stofndag, rekstrarform,
    // forráðamenn og ÍSAT-flokk. Þessu er BÆTT VIÐ — engum reit er breytt og ekkert fjarlægt,
    // svo kennitölu-uppflettingin í POS (19/14) og reikningshausinn haldast óbreytt.
    const stofnadM = html.match(/<h2 class="subtitle">\s*Stofna[^:<]*:\s*([0-9.]+)\s*<\/h2>/);
    const stofnad = stofnadM ? stofnadM[1] : '';
    const formM = html.match(/<td>\s*([A-Z]\d)\s*<br\s*\/?>\s*([^<]+?)\s*<\/td>/);
    const rekstrarform = formM ? formM[2].trim() : '';
    // Listarnir eru „<h3>Fyrirsögn</h3> … <ul><li>…</li></ul>" með óreglulegu bili á milli.
    // Vísitölu-leitin er ónæmari fyrir því en regex yfir alla bygginguna (prófað á 5208150230).
    const listiUndir = (fyrirsogn) => {
      const a = html.indexOf(fyrirsogn);
      if (a < 0) return [];
      const b = html.indexOf('</ul>', a);
      if (b < 0) return [];
      return (html.slice(a, b).match(/<li>[\s\S]*?<\/li>/g) || [])
        .map(s => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 5);
    };
    // Staða félags (ósk Agnars 16.09.2026: „inn á skatturinn þá myndi sjást þarna hvort
    // fyrirtækið sé afskráð eða gjaldþrota"). Skatturinn setur stöðuna sem <p class="highlight">
    // beint undir stofndaginn: „(Úrskurðað gjaldþrota 18.01.2019)", „(Skiptum lokið 11.12.2020)",
    // „(Félag afskráð 17.12.2020)". Virkt félag ber ENGA slíka línu (sannreynt á N1 ehf.).
    const stada = (html.match(/<p class="highlight">[\s\S]*?<\/p>/g) || [])
      .map(s => s.replace(/<[^>]*>/g, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 5);
    const btM = html.match(/<h2 class="subtitle">\s*b\.t\.\s*aðili:\s*([^<]+)<\/h2>/);
    const bt_adili = btM ? btM[1].replace(/\s+/g, ' ').trim() : '';

    const forradamenn = listiUndir('Forráðama');
    const isat = listiUndir('ÍSAT Atvinnugreina');   // full fyrirsögn — „ÍSAT nr." stendur líka í VSK-töflunni

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
      // Viðbót 2026-09-16 — birtist í bannernum á fyrirtækjaprófíl:
      stofnad,
      rekstrarform,
      forradamenn,
      isat,
      stada,        // („Úrskurðað gjaldþrota …", „Félag afskráð …") — tómt fylki = virkt félag
      bt_adili,     // skiptastjóri eða annar b.t. aðili þegar félagið er í slitum
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
