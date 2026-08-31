/**
 * AÐSTOÐARMAÐUR — samtals-API (Fasi 1)
 *
 *   POST /api/assistant
 *   Body: { message, conversation_id?, history? }
 *   Svar: { reply, conversation_id, actions[], memory_updates[] }
 *
 * Agnar 2026-08-31: „conversational assistant … understands Icelandic, replies
 * in English, remembers the conversation, basic long-term memory, a few real
 * skills."
 *
 * ── AF HVERJU MIÐLARAMEGIN ────────────────────────────────────────────────
 * ANTHROPIC_API_KEY og SUPABASE_SERVICE_ROLE_KEY fara ALDREI í vafrann. Sama
 * mynstur og postur-triage / postur-reply / tv-summary nota nú þegar.
 *
 * ── MINNIÐ ER LESIÐ ÚR GAGNAGRUNNI, EKKI ÚR BEIÐNINNI ─────────────────────
 * `history` í beiðninni er aðeins vísbending. Sagan sem er SEND Í LÍKANIÐ er
 * lesin úr assistant_messages. Annars gæti hver sem er sent falsaða sögu og
 * látið aðstoðarmanninn „muna" hluti sem aldrei gerðust.
 *
 * ── HÆFILEIKAR (tools) ────────────────────────────────────────────────────
 *   finna_fyrirtaeki    leit á nafni eða kennitölu
 *   stada_fyrirtaekis   þjónusta, tæki, ársskoðun, athugasemdir
 *   reikningastada      sölur/reikningar kúnna
 *   opin_verkefni       Verkefnalisti brunahólfs
 *   muna                skrifa staðreynd í langtímaminni
 *
 * Öll gagnalestur fer um Supabase REST með service-role. Töflurnar eru búnar
 * til í sql/2026-08-31_assistant_memory.sql — KEYRÐU HANA FYRST.
 */

const AI_URL = 'https://api.anthropic.com/v1/messages';
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_KEY = process.env.ANTHROPIC_API_KEY;

/* Sonnet frekar en Haiku hér — VILJANDI, og öfugt við tv-summary/postur-triage.
   Þau flokka texta í einu skoti; þetta þarf að VELJA RÉTTAN HÆFILEIKA út frá
   íslenskri spurningu og keyra hann með réttum viðföngum. Rangt tólaval er
   dýrara en munurinn á módelunum. Stillanlegt með ASSISTANT_MODEL. */
const MODEL = process.env.ASSISTANT_MODEL || 'claude-sonnet-5';
const MAX_TOOL_LOOPS = 5;      // varnagli gegn endalausri lykkju
const HISTORY_LIMIT = 24;      // hversu langt aftur samtalið er sent

/* ── Supabase REST ──────────────────────────────────────────────────────── */
async function sb(path, init) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'content-type': 'application/json',
      ...(init && init.headers),
    },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`supabase ${r.status}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

/* ── Hæfileikarnir ─────────────────────────────────────────────────────── */
const TOOLS = [
  {
    name: 'finna_fyrirtaeki',
    description:
      'Find a customer company by name (partial, case-insensitive) or by kennitala. '
      + 'Use this FIRST whenever the user names a company — you need the id for the other tools. '
      + 'Icelandic names may be written without accents; try the plain form too.',
    input_schema: {
      type: 'object',
      properties: {
        leit: { type: 'string', description: 'Company name fragment or kennitala' },
      },
      required: ['leit'],
    },
  },
  {
    name: 'stada_fyrirtaekis',
    description:
      'Full service picture for ONE company: contact details, whether it is in service, '
      + 'equipment counts, inspection month, last inspection, and free-text notes. '
      + 'Needs the id from finna_fyrirtaeki.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'integer', description: 'fyrirtaeki.id' } },
      required: ['id'],
    },
  },
  {
    name: 'reikningastada',
    description:
      'Recent sales/invoices for one company — date, amount, payment method, dk invoice id. '
      + 'Use for questions about billing, what was sold, or whether something was paid.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'fyrirtaeki.id' },
        fjoldi: { type: 'integer', description: 'How many to return (default 10, max 40)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'opin_verkefni',
    description:
      'Open items on the Verkefnalisti task board (status beidni or i_vinnu). '
      + 'Use when asked what is outstanding, what is being worked on, or what needs review.',
    input_schema: {
      type: 'object',
      properties: {
        stada: { type: 'string', description: 'Optional filter: beidni | i_vinnu | i_yfirferd' },
      },
    },
  },
  {
    name: 'muna',
    description:
      'Store a fact in long-term memory so it survives this conversation. '
      + 'Use ONLY when the user explicitly asks you to remember something, or states a '
      + 'durable preference or business rule. Never store passwords or card numbers.',
    input_schema: {
      type: 'object',
      properties: {
        stadreynd: { type: 'string', description: 'The fact, in plain language' },
        um_hvad: {
          type: 'string',
          description: "What it is about: 'general' | 'fyrirtaeki' | 'stadur' | 'taeki' | 'verk'",
        },
        um_id: { type: 'string', description: 'Optional id it attaches to, e.g. fyrirtaeki.id' },
      },
      required: ['stadreynd'],
    },
  },
];

async function keyraTool(name, input) {
  if (name === 'finna_fyrirtaeki') {
    const q = String(input.leit || '').trim();
    if (!q) return { villa: 'tóm leit' };
    const kt = q.replace(/\D/g, '');
    // Kennitala er 10 stafir — leitum á henni beint, annars á nafni.
    const filt = kt.length === 10
      ? `kennitala=eq.${kt}`
      : `nafn=ilike.*${encodeURIComponent(q)}*`;
    const rows = await sb(
      `fyrirtaeki?${filt}&select=id,nafn,kennitala,simi,farsimi,netfang,heimilisfang,stadur,er_i_thjonustu&limit=12`
    );
    return { fjoldi: rows.length, fyrirtaeki: rows };
  }

  if (name === 'stada_fyrirtaekis') {
    const id = +input.id;
    if (!id) return { villa: 'vantar id' };
    const [co] = await sb(`fyrirtaeki?id=eq.${id}&select=*&limit=1`);
    if (!co) return { villa: 'fyrirtæki fannst ekki' };
    // Ársskoðunargögnin liggja í app_settings-blobbinu, ekki eigin töflu.
    let ars = null;
    try {
      const [rows] = await sb(`app_settings?id=eq.1&select=settings&limit=1`);
      const blob = rows && rows.settings && rows.settings.arsskodun_customers;
      if (blob) ars = blob[String(id)] || null;
    } catch (_) {}
    let taeki = [];
    try {
      taeki = await sb(`uttaeki?fyrirtaeki_id=eq.${id}&select=tegund,stada&limit=200`);
    } catch (_) {}
    const minni = await sb(
      `assistant_memory?subject_type=eq.fyrirtaeki&subject_id=eq.${id}&active=is.true&select=fact,source,created_at&limit=20`
    ).catch(() => []);
    return {
      fyrirtaeki: {
        id: co.id, nafn: co.nafn, kennitala: co.kennitala,
        simi: co.simi || co.farsimi, netfang: co.netfang,
        heimilisfang: co.heimilisfang, stadur: co.stadur,
        i_thjonustu: co.er_i_thjonustu, athugasemdir: co.athugasemdir,
        ferdanota: co.plan_note,
      },
      arsskodun: ars && {
        skodunarmanudur: ars.inspect_month,
        sidast_skodad_ar: ars.last_year_inspected,
        sidasta_skodun: ars.last_skodun,
        aaetlad_arsvirdi: ars.estimated_yearly,
        aksturslisti: ars.akstur,
        taekjafjoldi: ars.equipment,
      },
      skrad_taeki: taeki.length,
      minnispunktar: minni,
    };
  }

  if (name === 'reikningastada') {
    const id = +input.id;
    if (!id) return { villa: 'vantar id' };
    const n = Math.min(Math.max(+input.fjoldi || 10, 1), 40);
    const rows = await sb(
      `solur?customer_id=eq.${id}&select=id,created_at,greitt_med,dk_invoice_id,is_credit,athugasemdir&order=created_at.desc&limit=${n}`
    );
    return { fjoldi: rows.length, solur: rows };
  }

  if (name === 'opin_verkefni') {
    // Verkefnalistinn býr í brunahólfi, ekki í þessum gagnagrunni.
    const r = await fetch('https://brunaholf.netlify.app/api/verkefnalisti');
    if (!r.ok) return { villa: `verkefnalisti svaraði ${r.status}` };
    const d = await r.json();
    const alt = Array.isArray(d) ? d : (d.items || d.verkefni || []);
    const vil = input.stada
      ? alt.filter(x => String(x.status || x.stada) === input.stada)
      : alt.filter(x => ['beidni', 'i_vinnu'].includes(String(x.status || x.stada)));
    return { fjoldi: vil.length, verkefni: vil.slice(0, 25) };
  }

  if (name === 'muna') {
    const fact = String(input.stadreynd || '').trim();
    if (!fact) return { villa: 'tóm staðreynd' };
    const row = await sb('assistant_memory', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([{
        fact,
        subject_type: input.um_hvad || 'general',
        subject_id: input.um_id ? String(input.um_id) : null,
        source: 'agnar',
      }]),
    });
    return { vistad: true, id: row && row[0] && row[0].id, stadreynd: fact };
  }

  return { villa: 'óþekktur hæfileiki: ' + name };
}

/* ── Kerfisleiðbeining ──────────────────────────────────────────────────── */
function systemPrompt(minni) {
  const m = minni.length
    ? '\n\nLong-term memory (facts Agnar has told you before):\n'
      + minni.map(x => `- ${x.fact}`).join('\n')
    : '';
  return (
    'You are the internal assistant for Slökkvitæki ehf, an Icelandic fire-extinguisher '
    + 'inspection and service company. You are talking to Agnar, the owner.\n\n'
    + 'LANGUAGE: Agnar writes in Icelandic (sometimes mixed with English). You UNDERSTAND '
    + 'Icelandic fully. You ALWAYS REPLY IN ENGLISH. Keep Icelandic proper nouns, company '
    + 'names, kennitölur and place names exactly as they are — never translate them.\n\n'
    + 'STYLE: short and direct. He is usually on a phone, often in a vehicle. Lead with the '
    + 'answer. Use a compact list when there is more than one item. No preamble.\n\n'
    + 'TOOLS: when a question is about real data — a customer, equipment, invoices, open '
    + 'tasks — call a tool. Do NOT guess. If a tool returns nothing, say so plainly rather '
    + 'than inventing a plausible answer. When he names a company, call finna_fyrirtaeki '
    + 'first to get the id.\n\n'
    + 'NUMBERS: currency is Icelandic króna, formatted like 24.877 kr (period as thousands '
    + 'separator). Dates as dd.mm.yyyy.\n\n'
    + 'HONESTY: if you are not sure, say what you checked and what you did not. Never state '
    + 'a figure you did not get from a tool.'
    + m
  );
}

/* ── Aðalfallið ────────────────────────────────────────────────────────── */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  if (!AI_KEY) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY_MISSING' }), { status: 500 });
  if (!SB_URL || !SB_KEY) {
    return new Response(JSON.stringify({ error: 'SUPABASE_ENV_MISSING' }), { status: 500 });
  }

  let body;
  try { body = await req.json(); }
  catch (_) { return new Response(JSON.stringify({ error: 'BAD_JSON' }), { status: 400 }); }

  const message = String(body.message || '').trim();
  if (!message) return new Response(JSON.stringify({ error: 'EMPTY_MESSAGE' }), { status: 400 });

  const actions = [];
  const memoryUpdates = [];

  try {
    // 1 · samtal — sækja eða stofna
    let convId = body.conversation_id || null;
    if (convId) {
      const [c] = await sb(`assistant_conversations?id=eq.${convId}&select=id&limit=1`);
      if (!c) convId = null;
    }
    if (!convId) {
      const [c] = await sb('assistant_conversations', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([{ titill: message.slice(0, 80) }]),
      });
      convId = c.id;
    }

    // 2 · sagan ÚR GAGNAGRUNNI — ekki úr beiðninni
    const fyrri = await sb(
      `assistant_messages?conversation_id=eq.${convId}&role=in.(user,assistant)`
      + `&select=role,content&order=id.desc&limit=${HISTORY_LIMIT}`
    );
    const messages = fyrri.reverse().map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: message });

    // 3 · langtímaminni (almennt) inn í kerfisleiðbeininguna
    const minni = await sb(
      "assistant_memory?subject_type=eq.general&active=is.true&select=fact&order=updated_at.desc&limit=40"
    ).catch(() => []);

    await sb('assistant_messages', {
      method: 'POST',
      body: JSON.stringify([{ conversation_id: convId, role: 'user', content: message }]),
    });

    // 4 · lykkja: líkan → tól → líkan, þar til það hættir að biðja um tól
    let reply = '';
    for (let lykkja = 0; lykkja < MAX_TOOL_LOOPS; lykkja++) {
      const r = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          system: systemPrompt(minni),
          tools: TOOLS,
          messages,
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: 'AI_ERROR', detail: t.slice(0, 400) }), { status: 502 });
      }
      const d = await r.json();
      messages.push({ role: 'assistant', content: d.content });

      const toolUses = (d.content || []).filter(b => b.type === 'tool_use');
      if (!toolUses.length) {
        reply = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        break;
      }

      const results = [];
      for (const tu of toolUses) {
        let out;
        try { out = await keyraTool(tu.name, tu.input || {}); }
        catch (e) { out = { villa: String(e.message || e).slice(0, 300) }; }
        actions.push({ tool: tu.name, input: tu.input, ok: !out.villa });
        if (tu.name === 'muna' && out.vistad) memoryUpdates.push(out.stadreynd);
        // Hvert tólakall skráð svo rangt svar sé rekjanlegt aftur í fyrirspurnina.
        await sb('assistant_messages', {
          method: 'POST',
          body: JSON.stringify([{
            conversation_id: convId, role: 'tool', content: tu.name,
            tool_name: tu.name, tool_input: tu.input || {}, tool_result: out,
          }]),
        }).catch(() => {});
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out).slice(0, 12000) });
      }
      messages.push({ role: 'user', content: results });
    }

    if (!reply) reply = 'I ran out of tool steps before reaching an answer. Try narrowing the question.';

    await sb('assistant_messages', {
      method: 'POST',
      body: JSON.stringify([{ conversation_id: convId, role: 'assistant', content: reply }]),
    });
    await sb(`assistant_conversations?id=eq.${convId}`, {
      method: 'PATCH', body: JSON.stringify({ updated_at: new Date().toISOString() }),
    }).catch(() => {});

    return new Response(
      JSON.stringify({ reply, conversation_id: convId, actions, memory_updates: memoryUpdates }),
      { headers: { 'content-type': 'application/json; charset=utf-8' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'ASSISTANT_FAILED', detail: String(e.message || e).slice(0, 400) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};
