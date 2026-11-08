// gatt-adgangur.cjs — beiðni um aðgang að Þjónustugáttinni, ÁN innskráningar (08.11.2026).
//
//   POST /api/gatt-adgangur { nafn, netfang, fyrirtaeki, kt, simi, skilabod, vefur }
//        → mál á Þjónustuborði (thjonustubeidni, source 'gatt-nyskraning', tags gatt/adgangur, abyrgd okkar).
//
// Nýskráning er BEIÐNI, ekki reikningur: starfsmaður staðfestir að netfangið tilheyri félaginu og stofnar aðganginn á
// gatt-admin (portal_notendur). Fallið stofnar engan notanda, les engin gögn og skilar aldrei neinu úr grunninum —
// svarið er alltaf {ok:true} (engin vísbending um hvort netfang eða félag sé til). `vefur` er veiðireitur fyrir vélmenni.
// Takmörkun: 3 beiðnir per IP á 10 mín. og 20 á klst. samtals.

const P = require('./_portal.cjs');

const ip = {};  // IP-takmörkun innan sama ferlis (Netlify endurnýtir ferlið milli kalla)

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'POST') return P.json(405, { error: 'Aðeins POST' });
  if (!P.envReady()) return P.json(503, { error: 'Ekki uppsett' });
  let b = {};
  try { b = JSON.parse(event.body || '{}'); } catch { return P.json(400, { error: 'Ógilt JSON' }); }

  if (b.vefur) return P.json(200, { ok: true });  // vélmenni fylltu falda reitinn — þegjandi samþykki, ekkert vistað

  const nafn = String(b.nafn || '').trim().slice(0, 80);
  const netfang = String(b.netfang || '').trim().toLowerCase().slice(0, 120);
  const felag = String(b.fyrirtaeki || '').trim().slice(0, 120);
  const simi = String(b.simi || '').trim().slice(0, 30);
  const kt = String(b.kt || '').replace(/\D/g, '');
  const skilabod = String(b.skilabod || '').trim().slice(0, 2000);
  if (!nafn) return P.json(400, { error: 'Skrifaðu nafnið þitt' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(netfang)) return P.json(400, { error: 'Netfangið virðist ekki rétt' });
  if (!felag) return P.json(400, { error: 'Skrifaðu nafn fyrirtækis eða húsfélags' });
  if (kt && kt.length !== 10) return P.json(400, { error: 'Kennitala er 10 tölustafir' });

  const addr = String((event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || '')) || '').split(',')[0].trim() || 'x';
  const nu = Date.now();
  ip[addr] = (ip[addr] || []).filter((t) => nu - t < 600e3);
  if (ip[addr].length >= 3) return P.json(429, { error: 'Of margar beiðnir — reyndu aftur eftir smá stund' });
  const since = new Date(nu - 3600e3).toISOString();
  const cr = await P.sbGet(`thjonustubeidni?source=eq.gatt-nyskraning&created_at=gte.${encodeURIComponent(since)}&select=id`);
  if (cr.ok && (await cr.json()).length >= 20) return P.json(429, { error: 'Of margar beiðnir í bili — hringdu í okkur eða reyndu aftur síðar' });

  // Kennitala sem passar við NÁKVÆMLEGA eitt félag tengir málið við það (aldrei giskað; ekkert fer til baka í svarinu).
  let baseId = null, fid = null;
  if (kt.length === 10) {
    try {
      const br = await P.sbGet(`customers_base?kennitala=in.(${kt},${kt.slice(0, 6)}-${kt.slice(6)})&select=id&limit=2`);
      const bs = br.ok ? await br.json() : [];
      if (bs.length === 1) {
        baseId = bs[0].id;
        const fr = await P.sbGet(`fyrirtaeki?customer_base_id=eq.${baseId}&deleted_at=is.null&select=id&limit=2`);
        const fs = fr.ok ? await fr.json() : [];
        if (fs.length === 1) fid = fs[0].id;
      }
    } catch (_) {}
  }
  const tilbod = !!skilabod;
  const lysing = [
    tilbod ? 'Beiðni um aðgang að Þjónustugáttinni og tilboð' : 'Beiðni um aðgang að Þjónustugáttinni',
    'Nafn: ' + nafn,
    'Netfang: ' + netfang,
    'Fyrirtæki / húsfélag: ' + felag,
    kt ? 'Kennitala: ' + kt.slice(0, 6) + '-' + kt.slice(6) : '',
    simi ? 'Sími: ' + simi : '',
    tilbod ? '\nSkilaboð / tilboðsbeiðni:\n' + skilabod : '',
  ].filter(Boolean).join('\n');
  const mr = await P.sbPost('thjonustubeidni', {
    customer_base_id: baseId, fyrirtaeki_id: fid,
    customer_nafn: felag, title: (tilbod ? 'Tilboð og gáttaraðgangur — ' : 'Beiðni um gáttaraðgang — ') + felag + ' — ' + nafn, summary: lysing,
    notes: lysing + '\nStaðfestu að netfangið tilheyri félaginu, stofnaðu aðgang á gatt-admin og sendu lykilorð. Engin sjálfvirk stofnun.' + (tilbod ? ' Svara þarf tilboðsbeiðninni sérstaklega.' : ''),
    source: 'gatt-nyskraning', type: 'annad', flokkur: 'thjonusta', status: 'nytt', priority: 'venjulegur',
    created_by: 'gatt-nyskraning', tags: tilbod ? ['gatt', 'adgangur', 'nyskraning', 'tilbod'] : ['gatt', 'adgangur', 'nyskraning'], abyrgd: 'okkar',
  });
  if (!mr.ok) return P.json(502, { error: 'Vistun mistókst — reyndu aftur eða sendu okkur póst' });
  ip[addr].push(nu);
  return P.json(200, { ok: true });
};
