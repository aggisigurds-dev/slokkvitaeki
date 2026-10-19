const MAPIS = 'https://www.map.is';
const H = { 'User-Agent': 'Mozilla/5.0 Slokkvitaeki-Teikning/1.0', Accept: 'text/html' };
for (const slug of ['reykjanesbaer', 'rnb', 'reykjanes', 'reykjanesbar']) {
  try {
    const r = await fetch(MAPIS + '/' + slug + '/', { headers: H, redirect: 'follow', signal: AbortSignal.timeout(12000) });
    const t = await r.text();
    const token = (t.match(/config\.t\s*=\s*"([a-z0-9]{20,})"/) || [])[1];
    const titill = (t.match(/<title>([^<]*)/) || [])[1];
    const svf = (t.match(/svfnr["']?\s*[:=]\s*["']?(\d{4})/) || t.match(/sveitarfelag[^\d]{0,30}(\d{4})/i) || [])[1];
    console.log(slug, r.status, r.url, '| titill:', titill, '| token:', !!token, '| svf í síðu:', svf || '-');
    if (!token) continue;
    const kokur = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''];
    const cookie = kokur.map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
    for (const [land, heiti] of [[212620, 1132465], [212620, 0]]) {
      const q = await fetch(MAPIS + '/webservice/queryTeiknigrunn.php?landnumer=' + land + '&svfnr=2000&heitinumer=' + heiti + '&t=' + token, { headers: { Cookie: cookie, Referer: MAPIS + '/' + slug + '/', 'User-Agent': H['User-Agent'], 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json, text/plain, */*' }, signal: AbortSignal.timeout(15000) });
      const s = (await q.text()).trim();
      let n = '-', hostar = '';
      if (s.startsWith('[')) { const rows = JSON.parse(s); n = rows.length; hostar = [...new Set(rows.map((x) => { try { return new URL(x.online_path).hostname; } catch (_) { return '?'; } }))].join(','); }
      console.log('   queryTeiknigrunn heitinr', heiti, '->', q.status, 'raðir', n, hostar); if (s.startsWith('[')) JSON.parse(s).forEach((x) => console.log('     ', x.dagsetning, x.tegund, x.lysing, x.status, (x.online_path || '').slice(-50)));
    }
  } catch (e) { console.log(slug, 'villa', e.message); }
}
