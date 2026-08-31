/* === AÐSTOÐARMAÐUR — spjallpanell (344, Fasi 1) ============================
 *
 * Agnar 2026-08-31: „conversational assistant … understands Icelandic, replies
 * in English, remembers the conversation, basic long-term memory, a few real
 * skills."
 *
 * Viðmótið eitt. Öll rökin, lyklarnir og gagnalesturinn eru miðlaramegin í
 * netlify/functions/assistant.js — þessi pappi veit ekkert um Anthropic og
 * sendir ekkert nema textann sem þú skrifar.
 *
 * ── AF HVERJU EKKI FLJÓTANDI TAKKI Á SÖLU ─────────────────────────────────
 * Agnar bað um „floating button or side panel". Fljótandi er valið — EN hann
 * er FALINN á Sölu. Sama morgun bað hann um að fimm fljótandi takkar færu af
 * söluborðinu því þeir lögðust ofan á vöruflísarnar (patch 327,
 * tools/audit-sala-simi.cjs). Að bæta sjötta við daginn eftir væri að taka
 * aftur það sem var nýbúið að laga.
 *
 * ── SAMTALIÐ ──────────────────────────────────────────────────────────────
 * conversation_id lifir í localStorage svo samtalið haldist milli heimsókna.
 * Sagan sjálf er geymd Í GAGNAGRUNNI og lesin þaðan miðlaramegin — þessi
 * pappi sendir hana ekki, einmitt svo ekki sé hægt að falsa hana.
 * ========================================================================== */
(() => {
  if (window.__adstodarmadur344) return;
  window.__adstodarmadur344 = true;

  const LS_CONV = 'adstod_conversation_v1';
  const API = '/api/assistant';

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const convId = () => { try { return localStorage.getItem(LS_CONV) || null; } catch (_) { return null; } };
  const setConv = v => { try { v ? localStorage.setItem(LS_CONV, v) : localStorage.removeItem(LS_CONV); } catch (_) {} };

  /* ── Stílar ────────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById('_ad-css')) return;
    const s = document.createElement('style');
    s.id = '_ad-css';
    s.textContent = [
      /* Takkinn — falinn á Sölu, sjá haus. :has() eltir sýnaskiptin sjálfkrafa. */
      '#_ad-fab{position:fixed;right:14px;bottom:78px;z-index:2147481000;width:52px;height:52px;border-radius:50%;',
        'border:1px solid #10161f;background:linear-gradient(180deg,#2f5a86,#17324f);color:#eaf1f9;',
        'font-size:22px;line-height:1;cursor:pointer;box-shadow:0 10px 24px -10px rgba(0,0,0,.6);',
        'display:flex;align-items:center;justify-content:center;padding:0}',
      'html:has(#view-sala.active) #_ad-fab{display:none!important}',

      '#_ad-panel{position:fixed;inset:auto 0 0 0;z-index:2147481200;height:min(72vh,620px);',
        'background:#16181c;color:#e8e6e2;display:flex;flex-direction:column;',
        'font:14px/1.45 "IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif;',
        'box-shadow:0 -14px 40px -18px rgba(0,0,0,.85)}',
      '@media (min-width:900px){#_ad-panel{inset:auto 18px 18px auto;width:420px;border-radius:12px;overflow:hidden}}',

      '#_ad-hd{display:flex;align-items:center;gap:9px;padding:11px 13px;border-bottom:1px solid #2a2d33;flex:none}',
      '#_ad-hd b{font-size:13.5px;font-weight:600}',
      '#_ad-hd small{color:#8b939f;font-size:11.5px}',
      '#_ad-nytt,#_ad-x{margin-left:auto;min-width:40px;min-height:40px;border:0;background:none;color:#9aa3b0;font-size:16px;cursor:pointer}',
      '#_ad-nytt{margin-left:auto;font-size:13px}',
      '#_ad-x{margin-left:0;font-size:19px}',

      '#_ad-log{flex:1 1 auto;overflow-y:auto;padding:12px 13px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}',
      '._ad-m{max-width:88%;padding:9px 11px;border-radius:10px;white-space:pre-wrap;overflow-wrap:anywhere}',
      '._ad-m.u{align-self:flex-end;background:#2f5a86;color:#fff;border-bottom-right-radius:3px}',
      '._ad-m.a{align-self:flex-start;background:#22252b;border:1px solid #2f333a;border-bottom-left-radius:3px}',
      '._ad-m.e{align-self:stretch;background:#3a1f22;border:1px solid #5e2b30;color:#f0c9cc;font-size:12.5px}',
      /* Hvaða hæfileikar voru keyrðir — svo svar sé rekjanlegt í fyrirspurn. */
      '._ad-tools{align-self:flex-start;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#7f8894;padding:0 2px}',
      '._ad-mem{align-self:flex-start;font-size:11.5px;color:#8fd0a8;padding:0 2px}',

      '#_ad-ft{flex:none;display:flex;gap:8px;padding:10px 12px;border-top:1px solid #2a2d33;align-items:flex-end}',
      '#_ad-in{flex:1;min-height:44px;max-height:120px;resize:none;padding:11px 12px;border-radius:9px;',
        'border:1px solid #3a3f47;background:#0e1013;color:#e8e6e2;font:inherit;font-size:16px;outline:none}',
      '#_ad-send{flex:0 0 auto;min-height:44px;padding:0 16px;border-radius:9px;border:1px solid #2f5a86;',
        'background:#2f5a86;color:#fff;font-weight:600;font-size:13.5px;cursor:pointer}',
      '#_ad-send[disabled]{opacity:.5;cursor:default}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ── Skilaboð í loggið ─────────────────────────────────────────────────── */
  function baeta(cls, txt) {
    const log = document.getElementById('_ad-log');
    if (!log) return null;
    const d = document.createElement('div');
    d.className = '_ad-m ' + cls;
    d.textContent = txt;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function baetaLina(cls, txt) {
    const log = document.getElementById('_ad-log');
    if (!log) return;
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = txt;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  /* ── Sending ───────────────────────────────────────────────────────────── */
  let sendir = false;
  async function senda() {
    if (sendir) return;
    const inn = document.getElementById('_ad-in');
    const takki = document.getElementById('_ad-send');
    const txt = (inn.value || '').trim();
    if (!txt) return;

    sendir = true;
    takki.disabled = true;
    inn.value = '';
    inn.style.height = 'auto';
    baeta('u', txt);
    const bid = baeta('a', '…');

    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: txt, conversation_id: convId() }),
      });
      const d = await r.json().catch(() => ({}));
      bid.remove();

      if (!r.ok || d.error) {
        // Sagt hreint út hvað brást — ekki „eitthvað fór úrskeiðis".
        const skyring = d.error === 'ANTHROPIC_API_KEY_MISSING'
          ? 'ANTHROPIC_API_KEY er ekki sett í Netlify-umhverfinu.'
          : d.error === 'SUPABASE_ENV_MISSING'
            ? 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY vantar í Netlify-umhverfið.'
            : (d.detail || d.error || ('HTTP ' + r.status));
        baeta('e', 'Aðstoðarmaðurinn svaraði ekki: ' + skyring);
        return;
      }

      if (d.conversation_id) setConv(d.conversation_id);
      if (Array.isArray(d.actions) && d.actions.length) {
        baetaLina('_ad-tools', '⚙ ' + d.actions.map(a => a.tool + (a.ok ? '' : ' ✗')).join(' · '));
      }
      baeta('a', d.reply || '(tómt svar)');
      if (Array.isArray(d.memory_updates) && d.memory_updates.length) {
        d.memory_updates.forEach(m => baetaLina('_ad-mem', '🧠 munað: ' + m));
      }
    } catch (e) {
      bid.remove();
      baeta('e', 'Náði ekki sambandi: ' + String(e.message || e));
    } finally {
      sendir = false;
      takki.disabled = false;
      inn.focus();
    }
  }

  /* ── Panell ────────────────────────────────────────────────────────────── */
  function opna() {
    css();
    if (document.getElementById('_ad-panel')) return;
    const p = document.createElement('div');
    p.id = '_ad-panel';
    p.innerHTML =
      '<div id="_ad-hd"><b>Aðstoðarmaður</b>'
      + '<small>skilur íslensku · svarar á ensku</small>'
      + '<button id="_ad-nytt" type="button" title="Byrja nýtt samtal">Nýtt</button>'
      + '<button id="_ad-x" type="button" title="Loka">✕</button></div>'
      + '<div id="_ad-log"></div>'
      + '<div id="_ad-ft">'
      + '<textarea id="_ad-in" rows="1" placeholder="Spurðu á íslensku…"></textarea>'
      + '<button id="_ad-send" type="button">Senda</button></div>';
    document.body.appendChild(p);

    if (!convId()) {
      baetaLina('_ad-tools', 'Nýtt samtal. Prófaðu: „hvað er staðan á Skútuvogi 4" eða „hvaða verkefni eru opin".');
    } else {
      baetaLina('_ad-tools', 'Heldur áfram fyrra samtali. „Nýtt" byrjar upp á nýtt.');
    }

    p.querySelector('#_ad-x').addEventListener('click', loka);
    p.querySelector('#_ad-nytt').addEventListener('click', () => {
      setConv(null);
      document.getElementById('_ad-log').innerHTML = '';
      baetaLina('_ad-tools', 'Nýtt samtal.');
    });
    p.querySelector('#_ad-send').addEventListener('click', senda);
    const inn = p.querySelector('#_ad-in');
    inn.addEventListener('input', () => {
      inn.style.height = 'auto';
      inn.style.height = Math.min(inn.scrollHeight, 120) + 'px';
    });
    // Enter sendir á tölvu; á síma er Enter línuskil (Senda-takkinn er þar).
    inn.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches) {
        e.preventDefault(); senda();
      }
    });
    setTimeout(() => inn.focus(), 60);
  }

  function loka() {
    const p = document.getElementById('_ad-panel');
    if (p) p.remove();
  }

  /* ── Takkinn ───────────────────────────────────────────────────────────── */
  function fab() {
    css();
    if (document.getElementById('_ad-fab')) return;
    const b = document.createElement('button');
    b.id = '_ad-fab'; b.type = 'button';
    b.textContent = '💬';
    b.title = 'Aðstoðarmaður — spyrðu á íslensku';
    b.addEventListener('click', () => {
      document.getElementById('_ad-panel') ? loka() : opna();
    });
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fab);
  else fab();

  window.Adstodarmadur = { opna, loka, version: 'v1' };
  console.log('[patch-344] adstodarmadur ready');
})();
/* === END AÐSTOÐARMAÐUR === */
