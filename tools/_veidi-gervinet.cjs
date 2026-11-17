// Gervinet fyrir prófun Veiði-vaktarinnar (test/veidi-vaktin-urskurdur.test.cjs). Hlaðið með
// `node --require tools/_veidi-gervinet.cjs tools/veidi-vaktin.cjs --thurr`. Kemur í stað globalThis.fetch ÁÐUR en
// vaktin keyrir: svarar úr sviðsmynd í umhverfisbreytunni VEIDI_GERVI og hafnar ÖLLU sem fer ekki á gervislóðina,
// svo prófið getur aldrei náð í raunverulegan grunn. Skrif (POST/PATCH) eru prentuð sem „GERVI-SKRIF …".
'use strict';
const GERVI = 'https://gervi.supabase.co';
const sv = JSON.parse(process.env.VEIDI_GERVI || '{}');

function svar(status, gogn) {
  const t = gogn == null ? '' : JSON.stringify(gogn);
  return { ok: status >= 200 && status < 300, status, text: async () => t, json: async () => JSON.parse(t || 'null') };
}

globalThis.fetch = async (slod, valk) => {
  slod = String(slod);
  if (!slod.startsWith(GERVI + '/rest/v1/')) throw new Error('gervinet: bannað kall út fyrir gervislóð: ' + slod.slice(0, 80));
  const u = new URL(slod);
  const tafla = u.pathname.replace('/rest/v1/', '');
  const adferd = ((valk && valk.method) || 'GET').toUpperCase();
  if (adferd !== 'GET') { console.log('GERVI-SKRIF ' + adferd + ' ' + tafla + ' ' + String((valk && valk.body) || '').slice(0, 300)); return svar(201, null); }
  if (tafla === 'thjonustubeidni') {
    const id = (u.searchParams.get('id') || '').replace('eq.', '');
    if (id) return svar(200, Object.values(sv.opin || {}).flat().filter(m => String(m.id) === id));
    const merki = JSON.parse((u.searchParams.get('tags') || 'cs.[]').replace(/^cs\./, ''))[0];
    const lokad = u.searchParams.get('status') === 'eq.lokad';
    return svar(200, ((lokad ? sv.lokud : sv.opin) || {})[merki] || []);
  }
  return svar(200, (sv.syn || {})[tafla] || []);
};
