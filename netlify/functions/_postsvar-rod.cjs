// _postsvar-rod.cjs — póstsvar Claude → röð í afgreidsla (tegund 'tolvupostur', stada 'tilbuid'). 17.11.2026.
//
// Sameiginlegt „Biddu Claude“ (afgreidsla.cjs claude_samthykkja, 492f) og Merkja og keyra (_merkja.cjs, eftir mat Óðins).
// Sér skrá svo _merkja.cjs þurfi ekki afgreidsla.cjs (hringtenging → sama fallabúnt, audit-fall-mengi).
// HÉR ER EKKERT SENT. Röðin er drög sem Agnar sendir sjálfur í Afgreiðslu; athuga() í afgreidsla.cjs keyrir þegar verkið
// er sýnt (GET merkir það 'urelt' ef það stenst ekki) og AFTUR rétt áður en sent er — óháð því hver bjó röðina til.
'use strict';

const P = require('./_portal.cjs');
const CL = require('./_adalmal-claude.cjs');

const POSTHOLF = /^(eldklar|bokhald)@eldklar\.is$/i;
const kyrrt = (m) => Object.assign(new Error(m), { kodi: 409 });
async function sbJson(r) { if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 160)}`); return r.json(); }

// t = tillaga Claude { tegund:'tolvupostur', texti, post:{ digest_id } }. Skilar nýju röðinni; kastar kyrrt(…) ef pósturinn
// sendist ekki héðan, er frá okkur / sjálfvirkum sendanda, eða svar við honum er þegar til (ákvörðun stendur).
async function bua(t, afh, createdBy) {
  const e = (await P.sbGet(`email_digest?select=id,account,folder,sender_name,sender_email,subject,received_at,thread_id,message_id,body_preview&id=eq.${Number(t && t.post && t.post.digest_id)}&limit=1`).then(sbJson))[0];
  if (!e || !POSTHOLF.test(String(e.account || '')) || !e.message_id || !e.thread_id) throw kyrrt('Pósturinn sem svarið á við fannst ekki eða sendist ekki héðan');
  if (/sent/i.test(String(e.folder || '')) || CL.erSjalfvirkt(e.sender_email)) throw kyrrt('Þessum pósti er ekki svarað (frá okkur sjálfum eða sjálfvirkum sendanda)');
  const efni = /^re:/i.test(String(e.subject || '')) ? String(e.subject) : 'RE: ' + String(e.subject || '');
  const pg = { account: String(e.account).toLowerCase(), to: [String(e.sender_email || '').toLowerCase()], subject: efni, texti: t.texti, mal_id: null,
    svar_vid: { digest_id: e.id, thread_id: e.thread_id, message_id: e.message_id, received_at: e.received_at, fra: e.sender_name || e.sender_email, efni: e.subject || '', texti: String(e.body_preview || '').slice(0, 1500) } };
  const nafn = String(e.sender_name || e.sender_email || '').split(/[<·]/)[0].trim();
  const ny = await P.sbPost('afgreidsla', { lykill: 'svar:' + e.message_id, tegund: 'tolvupostur', titill: ('Svara ' + nafn + ': ' + (e.subject || '')).slice(0, 200),
    takki: ('Senda svar til ' + nafn).slice(0, 80), hvad_gerist: 'Svar fer frá ' + pg.account + ' til ' + pg.to[0] + ', í sama þræði („' + efni + '“). Ekkert annað breytist.',
    af_hverju: afh || [], gogn: pg, virdi_kr: null, forgangur: 15, created_by: createdBy || 'claude' });
  if (ny.status === 409) throw kyrrt('Svar við þessum pósti er þegar í Afgreiðslu (eða var afgreitt) — ákvörðun stendur');
  return (await sbJson(ny))[0];
}

module.exports = { bua, POSTHOLF };
