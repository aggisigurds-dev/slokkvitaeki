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
  // Default-open shared-secret gate: enforced AÐEINS þegar EDGE_SHARED_KEY er sett.
  const KEY = (process.env.EDGE_SHARED_KEY || '').trim();
  if (KEY) {
    const got = String(req.headers.get('x-eldklar-key') || '').trim();
    if (got !== KEY) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: cors(),
      });
    }
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
  // Resolve Drive attachments server-side → base64. Restricted Drive PDFs can't
  // be fetched by Resend (a plain URL) or by the browser, so we reuse the
  // brunaholf drive-download endpoint, which already holds the Google OAuth
  // token for aggisigurds@gmail.com's Drive. Attachment shapes accepted:
  //   { filename, driveId }   → resolved here to { filename, content(base64) }
  //   { filename, content }   → passed through (already base64)
  //   { filename, path }      → passed through (Resend fetches the URL)
  if (Array.isArray(payload.attachments) && payload.attachments.length) {
    const DRIVE_DL = (process && process.env && process.env.DRIVE_DOWNLOAD_URL) || 'https://brunaholf.netlify.app/api/drive-download';
    const out = [];
    const warnings = [];
    for (const a of payload.attachments) {
      if (a && a.driveId) {
        try {
          const dr = await fetch(DRIVE_DL + '?id=' + encodeURIComponent(a.driveId));
          const dj = await dr.json().catch(() => ({}));
          if (dr.ok && dj && dj.base64) {
            out.push({ filename: a.filename || dj.name || 'skjal', content: dj.base64 });
          } else {
            warnings.push((a.filename || a.driveId) + ': ' + ((dj && dj.error) || ('HTTP ' + dr.status)));
          }
        } catch (e) { warnings.push((a.filename || a.driveId) + ': ' + String((e && e.message) || e)); }
      } else if (a && (a.content || a.path)) {
        out.push(a);
      }
    }
    payload.attachments = out;
    // If the caller asked for attachments but NONE resolved, fail loudly rather
    // than silently sending a doc-less email.
    if (!out.length && warnings.length) {
      return new Response(JSON.stringify({ error: 'ATTACHMENT_FAILED', message: 'Viðhengi náðist ekki: ' + warnings.join('; ') }), {
        status: 502, headers: { 'Content-Type': 'application/json', ...cors() },
      });
    }
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
    'Access-Control-Allow-Headers': 'Content-Type, x-eldklar-key',
  };
}

export const config = { path: '/api/email-send' };
