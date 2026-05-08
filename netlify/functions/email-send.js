/**
 * Email send proxy — server-side wrapper around Resend.
 *
 * Why a proxy:
 *   Resend's REST API (api.resend.com/emails) doesn't send CORS headers,
 *   so the browser blocks direct calls.
 *
 * Endpoint:
 *   POST /api/email-send
 *   Body: { from, to: [...], subject, html, apiKey?: string }
 *
 * Auth:
 *   Pass apiKey in the body (client-stored in localStorage, legacy)
 *   OR set RESEND_API_KEY in Netlify env vars (preferred — key stays server-side).
 *   The function prefers the env var if set.
 */
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: cors(),
    });
  }
  let body;
  try {
    body = await req.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: cors(),
    });
  }
  const apiKey = (process && process.env && process.env.RESEND_API_KEY) || body.apiKey || '';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API_KEY_MISSING', message: 'Resend API lykill ekki stilltur' }), {
      status: 400,
      headers: cors(),
    });
  }
  // Don't forward apiKey upstream
  const { apiKey: _stripped, ...payload } = body;
  if (!payload.from || !payload.to || !payload.subject) {
    return new Response(JSON.stringify({ error: 'Missing from/to/subject' }), {
      status: 400,
      headers: cors(),
    });
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { 'Content-Type': 'application/json', ...cors() },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), {
      status: 500,
      headers: cors(),
    });
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const config = { path: '/api/email-send' };
