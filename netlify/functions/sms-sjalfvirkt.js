/**
 * Forskoðun á sjálfvirkum SMS-áminningum (19.10.2026).
 *
 *   GET /api/sms-sjalfvirkt → { stillingar, aaetlad: [...], sleppt: [...], ... }
 *
 * GET er ALLTAF þurr: reiknar hverjir fengju skilaboð núna skv. stillingum og skrifar/sendir ekkert
 * (sbr. audit-payday-get). Raunveruleg sending er eingöngu í tímasettu fallinu sms-sjalfvirkt-cron.cjs.
 * Sama default-open EDGE_SHARED_KEY-gátt og email-send / sms-send.
 */
import K from './_sms-sjalfvirkt.cjs';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key',
  };
}
function svar(o, status) {
  return new Response(JSON.stringify(o), { status: status || 200, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors() });
  if (req.method !== 'GET') return svar({ error: 'GET only — forskoðun, sendir ekkert' }, 405);
  const KEY = (process.env.EDGE_SHARED_KEY || '').trim();
  if (KEY && String(req.headers.get('x-eldklar-key') || '').trim() !== KEY) return svar({ error: 'unauthorized' }, 401);
  try {
    const u = await K.keyra({ commit: false });
    return svar({
      stillingar: u.stillingar,
      aaetlad: u.aaetlad.map(v => ({ id: v.id, num: v.num, nafn: v.nafn, til: v.til, tegund: v.tegund, hvers: v.hvers, dagarFraMottoku: v.dagarFraMottoku })),
      sleppt: u.sleppt,
      hamarkPerKeyrslu: u.hamarkPerKeyrslu,
      athugad: u.athugad,
      twilioStillt: !!((process.env.TWILIO_SID || '').trim() && (process.env.TWILIO_TOKEN || '').trim() && (process.env.TWILIO_FROM || '').trim()),
    });
  } catch (e) {
    return svar({ error: String((e && e.message) || e) }, 500);
  }
};

export const config = { path: '/api/sms-sjalfvirkt', includedFiles: ['netlify/functions/_sms-sjalfvirkt.cjs'] };
