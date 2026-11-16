#!/usr/bin/env node
/* audit-adalmal-adgerdir — Aðalmál (492d) gerir það sem takkarnir segja, og AÐEINS um afgreiðsluvélina (16.11.2026).
 *
 * Agnar 16.11.2026: „geturðu líka gert þetta aðalatriða borðið þitt eitthvað interactive, ég get ekki gert rassgat þarna
 * eða látið þig vita svörin eða svarað póstum". Borðið svarar nú spurningum, tekur ákvarðanir (já/nei/seinna), setur á
 * Verkefnalistann og afgreiðir forunnin verk — allt um /api/afgreidsla (netlify/functions/afgreidsla.cjs).
 * Vörðurinn heldur fimm loforðum, með HEGÐUN (fallið keyrt á stubbum, engin net-köll, engir lyklar) þar sem hægt er:
 *   1. Án innskráðs stjórnanda gerir adgerd 'adalmal' EKKERT (svar hliðsins skilað, ekkert kall á grunninn).
 *   2. Lokað aðalmál, eða texti sem stendur ekki í málinu → 409 og engin skrif (svar lendir aldrei á röngu atriði).
 *   3. Já fer til Charlize (topic akvardanir-agnars, confirmed) og röðin í afgreidsla fær tegund 'adalmal' + einkvæman lykil.
 *   4. Prufa póstsendingar sendir gmail-send AÐEINS { prufa, account } með tókanum — engir viðtakendur, ekkert efni.
 *   5. 492 skrifar aldrei sjálft í afgreidsla / charlize_knowledge / verkefnalisti (aðeins um vélina), og lykill
 *      borðsins (adalmal:<mál>-<hluti>-<nr>) er sá sami og þjónsins.
 *   6. „Biddu Claude" (492f): rofinn af → 409 og ekkert skráð; einnota nonce fer ALDREI til vafrans; bakgrunnsvinnan gerir
 *      ekkert með röngu nonce; staðhæfing án gildrar heimildar er hent; svar á sjálfvirkt netfang (noreply) stöðvast í athuga().
 * Keyrir líka í `audit-all --static`.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROT = path.join(__dirname, '..');
const FN = path.join(ROT, 'netlify', 'functions');
const villur = [];

// ── Stubbar: grunnurinn, hliðið og innskráningin. Hvert kall á grunninn er skráð. ──
const KOLL = [];
let MAL = null;   // það sem thjonustubeidni-lestur skilar
const svar = (data, status = 200) => ({ ok: status < 300, status, json: async () => data, text: async () => JSON.stringify(data) });
const P = {
  dbReady: () => true, secHeaders: () => ({}),
  json: (statusCode, body) => ({ statusCode, body: JSON.stringify(body) }),
  sbGet: async (qs) => { KOLL.push(['GET', qs]); if (qs.startsWith('thjonustubeidni')) return svar(MAL ? [MAL] : []); return svar([]); },
  sbPost: async (t, body) => { KOLL.push(['POST', t, body]); if (t === 'charlize_knowledge') return svar([{ id: 9001 }]); if (t === 'verkefnalisti') return svar([{ id: 'vl-1', title: body.title }]);
    return svar([Object.assign({ id: 77, nidurstada: {}, updated_at: '2026-11-16T00:00:00Z' }, body)], 201); },
  sbPatch: async (qs, body) => { KOLL.push(['PATCH', qs, body]); return svar([Object.assign({ id: 77, lykill: 'adalmal:1587-c-0', gogn: {}, nidurstada: {} }, body)]); },
};
let HLID = null;
const setja = (nafn, exp) => { const s = path.join(FN, nafn); require.cache[s] = { id: s, filename: s, loaded: true, exports: exp }; };
setja('_portal.cjs', P);
setja('_radgjafinn-hlid.cjs', { hlid: async () => HLID });
setja('hub-adgangar.cjs', { handler: async () => ({ statusCode: 200, body: JSON.stringify({ gate: true, authed: true, user: { nn: 'AS', rola: 'Admin' } }) }), posturToki: async () => '1.' + 'a'.repeat(64) });
const AF = require(path.join(FN, 'afgreidsla.cjs'));
const kall = async (body) => { const r = await AF.handler({ httpMethod: 'POST', headers: {}, queryStringParameters: {}, body: JSON.stringify(body) }); return { s: r.statusCode, j: JSON.parse(r.body || '{}') }; };
const TEXTI = 'Center Hotels: skrifa tilboðið og samninginn.';
const OPID = { id: 1587, title: 'Vikuyfirlit', notes: 'C · GERA\n• ' + TEXTI + '\n', status: 'nytt', tags: ['adalmal'], deleted_at: null, archived_at: null };
const AKV = { adgerd: 'adalmal', mal_id: 1587, hluti: 'c', nr: 0, texti: TEXTI, gerd: 'akvordun', akvordun: 'ja' };

(async () => {
  // 1. Hliðið
  HLID = { statusCode: 401, body: JSON.stringify({ error: 'Innskráning vantar', need_login: true }) }; KOLL.length = 0; MAL = OPID;
  let r = await kall(AKV);
  if (r.s !== 401 || KOLL.length) villur.push(`1. án innskráningar: vænti 401 og engra kalla á grunninn, fékk ${r.s} og ${KOLL.length} köll`);
  HLID = null;

  // 2. Lokað mál / texti sem stendur ekki í málinu
  MAL = Object.assign({}, OPID, { status: 'lokad' }); KOLL.length = 0;
  r = await kall(AKV);
  if (r.s !== 409 || KOLL.some((k) => k[0] !== 'GET')) villur.push(`2a. lokað aðalmál: vænti 409 án skrifa, fékk ${r.s} (${KOLL.filter((k) => k[0] !== 'GET').length} skrif)`);
  MAL = OPID; KOLL.length = 0;
  r = await kall(Object.assign({}, AKV, { texti: 'Atriði sem er hvergi í yfirlitinu' }));
  if (r.s !== 409 || KOLL.some((k) => k[0] !== 'GET')) villur.push(`2b. texti ekki í málinu: vænti 409 án skrifa, fékk ${r.s}`);
  MAL = Object.assign({}, OPID, { tags: ['vikuyfirlit'] }); KOLL.length = 0;
  r = await kall(AKV);
  if (r.s !== 409) villur.push(`2c. mál án merkisins adalmal: vænti 409, fékk ${r.s}`);

  // 3. Já → Charlize + afgreidsla-röð
  MAL = OPID; KOLL.length = 0;
  r = await kall(AKV);
  const inn = KOLL.find((k) => k[0] === 'POST' && k[1] === 'afgreidsla');
  const ch = KOLL.find((k) => k[0] === 'POST' && k[1] === 'charlize_knowledge');
  if (r.s !== 200) villur.push(`3. Já: vænti 200, fékk ${r.s} ${JSON.stringify(r.j).slice(0, 120)}`);
  if (!inn || inn[2].tegund !== 'adalmal' || inn[2].lykill !== 'adalmal:1587-c-0') villur.push('3. Já: afgreidsla-röð með tegund adalmal og lykli adalmal:1587-c-0 varð ekki til');
  if (!ch || ch[2].topic !== 'akvardanir-agnars' || ch[2].confidence !== 'confirmed' || !/JÁ/.test(ch[2].fact) || !ch[2].fact.includes(TEXTI)) villur.push('3. Já: Charlize-færslan (akvardanir-agnars, confirmed, JÁ + texti atriðisins) varð ekki til');
  if (KOLL.some((k) => k[1] === 'verkefnalisti')) villur.push('3. Já eitt og sér á ekki að stofna verk á Verkefnalistanum');

  // 4. Prufa póstsendingar
  const fetch0 = global.fetch; let sent = null;
  global.fetch = async (url, o) => { sent = { url, o }; return svar({ ok: true, prufa: true, via: 'toki', sent: false }); };
  try {
    const p = await AF._prufaSending({ account: 'eldklar@eldklar.is', to: ['x@y.is'], subject: 'S', texti: 'T' });
    const b = sent && JSON.parse(sent.o.body);
    if (!b || Object.keys(b).sort().join(',') !== 'account,prufa' || b.prufa !== true) villur.push('4. prufa sendir meira en { prufa, account } til gmail-send: ' + (sent && sent.o.body));
    if (!sent || !/^1\.a{64}$/.test(String(sent.o.headers['x-postur-toki'] || ''))) villur.push('4. prufa sendir ekki póst-tókann (x-postur-toki)');
    if (!p.ok) villur.push('4. prufa las ekki svar gmail-send rétt');
  } finally { global.fetch = fetch0; }

  // 5. 492 skrifar aðeins um vélina og notar sama lykil
  const s492 = fs.readFileSync(path.join(ROT, 'js', 'patches', '492-adalmal.js'), 'utf8');
  for (const t of ['afgreidsla', 'charlize_knowledge', 'verkefnalisti']) {
    if (new RegExp("from\\(\\s*['\"]" + t + "['\"]").test(s492)) villur.push(`5. 492 talar beint við töfluna ${t} — aðgerðir eiga að fara um /api/afgreidsla`);
  }
  if (!/const AF = '\/api\/afgreidsla'/.test(s492)) villur.push('5. 492: AF-slóðin er ekki /api/afgreidsla');
  if (!/const amLyk = \(m, h, i\) => EINING \+ ':' \+ m\.id \+ '-' \+ h\.k \+ '-' \+ i;/.test(s492) || AF._amLykill(1587, 'c', 0) !== 'adalmal:1587-c-0') {
    villur.push('5. lykill borðsins (amLyk) og þjónsins (amLykill) eru ekki lengur sá sami — ákvarðanir lentu á röngu atriði');
  }

  // 6. „Biddu Claude"
  MAL = OPID; KOLL.length = 0;
  r = await kall(Object.assign({}, AKV, { gerd: 'claude', fyrirmaeli: 'x' }));
  if (r.s !== 409 || KOLL.some((k) => k[0] !== 'GET')) villur.push(`6a. „Biddu Claude" með rofann af: vænti 409 án skrifa, fékk ${r.s} (${KOLL.filter((k) => k[0] !== 'GET').length} skrif)`);
  const syn = AF._synilegtAdalmal({ lykill: 'adalmal:1587-c-0', gogn: {}, nidurstada: { claude: { stada: 'i_vinnslu', nonce: 'a'.repeat(32), at: new Date().toISOString() } } });
  if (!syn.claude || 'nonce' in syn.claude) villur.push('6b. nonce Claude-beiðnar fer til vafrans — þá gæti hver sem sér svarið ræst bakgrunnsvinnuna');
  const CL = require(path.join(FN, '_adalmal-claude.cjs'));
  const getFyrir = P.sbGet; KOLL.length = 0;
  P.sbGet = async (qs) => { KOLL.push(['GET', qs]); if (qs.startsWith('afgreidsla')) return svar([{ id: 1, gogn: { mal_id: 1587, hluti: 'c', nr: 0, texti: TEXTI }, nidurstada: { claude: { stada: 'i_vinnslu', nonce: 'a'.repeat(32), at: new Date().toISOString() } } }]);
    if (qs.startsWith('thjonustubeidni')) return svar([{ id: 1587, title: 'Vikuyfirlit', status: 'nytt' }]);   // opið mál — svo vinnan kæmist alla leið að Claude án nonce-varnar
    return svar([]); };
  const kallaFyrir = CL.kalla; let kallad = false; CL.kalla = async () => { kallad = true; return { svar: {}, model: 'x' }; };
  try {
    const v = await CL.vinna('adalmal:1587-c-0', 'b'.repeat(32));
    if (v.ok || kallad || KOLL.some((k) => k[0] !== 'GET')) villur.push('6c. bakgrunnsvinnan keyrði (eða skrifaði) með RÖNGU nonce');
  } finally { P.sbGet = getFyrir; CL.kalla = kallaFyrir; }
  const st = await CL.stadfesta({ svar: 's', stadreyndir: [{ texti: 'gild', heimildir: ['B1'] }, { texti: 'uppspuni', heimildir: ['Z9'] }], tillaga: { tegund: 'ekkert' }, omaelt: [] },
    { kort: { B1: { lysing: 'R-364', opna: null } } });
  if (st.stadreyndir.length !== 1 || st.hent !== 1) villur.push('6d. staðhæfing án gildrar heimildar var ekki hent');
  const athS = await AF._athuga({ tegund: 'tolvupostur', gogn: { account: 'eldklar@eldklar.is', to: ['noreply@domain.is'], texti: 'x', svar_vid: {} } });
  if (athS.ok || !athS.athuganir.some((a) => /sjálfvirkt netfang/.test(a.texti) && !a.ok)) villur.push('6e. athuga() stöðvar ekki svar á noreply-netfang');

  if (villur.length) { console.log('✗ audit-adalmal-adgerdir — ' + villur.length + ' brot:\n  ' + villur.join('\n  ')); process.exit(1); }
  console.log('✓ audit-adalmal-adgerdir — hlið, lokað mál, rangur texti, Já→Charlize, prufa {prufa,account}, eina leið 492 og „Biddu Claude" (rofi, nonce, heimildir, noreply) standast');
})().catch((e) => { console.log('✗ audit-adalmal-adgerdir — keyrsla brást: ' + (e && e.stack || e)); process.exit(1); });
