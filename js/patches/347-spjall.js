/* === SPJALL — innra liðsspjall á Þjónustuborðinu (347) ====================
 *
 * Agnar 01.09.2026:
 *   „Jafnvel setja spjallborð sem getur líka tekið við skjölum drag drop og
 *    download hinum megin frá."
 *   „setja kanski í svipuðu útlitið og skipulagsborðið svart með grænum stöfum
 *    sem síðan verða neon grænir og blikka þegar það eru ólesið spjall þar …
 *    og það sé líka grænt neon á hliðar þjónustuborði."
 *   „Þjónustuborðið er bara okkar starfsmannana á milli."
 *   „erum að vinna í nokkrum tölvum og stundum henda okkar á milli."
 *
 * ── HVAÐ ÞETTA ER EKKI ────────────────────────────────────────────────────
 * `portal_messages` er ANNAÐ kerfi: viðskiptavinur↔starfsfólk á Gáttinni,
 * RLS-læst á service-role. Þetta hér er starfsfólk↔starfsfólk innanhúss og
 * snertir þá töflu ekki.
 *
 * ── HVAR GÖGNIN LIGGJA ────────────────────────────────────────────────────
 * Taflan `spjall` (búin til 01.09.2026). Skilaboð getur borið EITT viðhengi
 * beint — `file_name/file_path/file_url/mime_type/file_size` — í stað þess að
 * bæta við þriðju skjalatöflunni ofan á `thjonustubeidni_files` og
 * `verkdagbok_attachments`. Skrár fara í sama storage-bucket og fylgiskjöl
 * málanna: `verkbord-files`, undir `spjall/`.
 *
 * `spjall_lesid` geymir hver hefur lesið hvað. Á TÖFLU en ekki í localStorage,
 * því Agnar vinnur á fjórum vélum: ólesið-merkið á að fylgja manninum, ekki
 * vélinni. Það var nákvæmlega gildran fyrr sama dag — starfsmannasían bjó í
 * localStorage og faldi hans eigin mál á einni tölvu.
 *
 * ── SAMSTILLING ───────────────────────────────────────────────────────────
 * `spjall` er í RT_TABLES (js/db.js), svo skilaboð frá annarri tölvu birtast
 * án endurhleðslu — sama og Þjónustuborðið sjálft fékk sama dag.
 * ========================================================================== */
(() => {
  if (window.__spjall347) return;
  window.__spjall347 = true;

  const BUCKET = 'verkbord-files';
  const OPIN_KEY = '_spjall_opid';
  const MAX_MB = 25;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const SB = () => (window.DB && DB.sb) || null;

  function hver() {
    try {
      // 2026-09-02: starfsmaðurinn sem er valinn á Þjónustuborðinu (#350) er
      // höfundurinn. `Verkbord.currentUser` var aldrei til, svo ÖLL skilaboð
      // báru „Slökkvitæki" — og lesið-merkingin (spjall_lesid er lyklað á
      // höfund) var þá sameiginleg fyrir alla, svo glóðin slokknaði fyrir
      // alla um leið og einn las.
      let n = null;
      try { n = localStorage.getItem('vb_starfsmadur'); } catch (_) {}
      if (n && n.trim()) return n.trim();
      if (window.BordStarfsmadur && typeof BordStarfsmadur.get === 'function') return BordStarfsmadur.get();
      if (window.Verkbord && typeof Verkbord.currentUser === 'function') return Verkbord.currentUser();
      const p = window.UserAuth && UserAuth.getProfile && UserAuth.getProfile();
      if (p && p.nafn) return p.nafn;
      const u = window.UserAuth && UserAuth.getUser && UserAuth.getUser();
      if (u && u.email) return u.email.split('@')[0];
    } catch (_) {}
    return 'Slökkvitæki';
  }

  let _skilabod = [];
  let _lesidAt = null;      // síðasti lestur ÞESSA notanda, úr töflu
  let _opid = false;
  let _saekir = false;

  try { _opid = localStorage.getItem(OPIN_KEY) === '1'; } catch (_) {}

  /* ── Gögn ──────────────────────────────────────────────────────────────── */
  async function saekja() {
    const sb = SB(); if (!sb || _saekir) return;
    _saekir = true;
    try {
      const r = await sb.from('spjall').select('*').is('deleted_at', null)
        .order('created_at', { ascending: true }).limit(300);
      // Villa má ekki skila tómu — tómt spjall lítur út eins og „ekkert sagt".
      if (r.error) throw r.error;
      _skilabod = r.data || [];
      const l = await sb.from('spjall_lesid').select('last_read_at').eq('author', hver()).maybeSingle();
      if (!l.error && l.data) _lesidAt = l.data.last_read_at;
    } catch (e) {
      console.warn('[spjall] sækja:', e.message || e);
      _skilabod = null;   // null = VILLA, ekki „engin skilaboð"
    } finally {
      _saekir = false;
    }
  }

  function olesin() {
    if (!Array.isArray(_skilabod)) return 0;
    const eg = hver();
    const mork = _lesidAt ? Date.parse(_lesidAt) : 0;
    // Eigin skilaboð teljast aldrei ólesin.
    return _skilabod.filter(m => m.author !== eg && Date.parse(m.created_at) > mork).length;
  }

  async function merkjaLesid() {
    const sb = SB(); if (!sb || !Array.isArray(_skilabod) || !_skilabod.length) return;
    const nu = new Date().toISOString();
    try {
      await sb.from('spjall_lesid').upsert({ author: hver(), last_read_at: nu, updated_at: nu },
        { onConflict: 'author' });
      _lesidAt = nu;
    } catch (e) { console.warn('[spjall] merkja lesid:', e.message || e); }
  }

  async function senda(texti, skra) {
    const sb = SB(); if (!sb) return;
    const t = String(texti || '').trim();
    if (!t && !skra) return;

    let vidhengi = {};
    if (skra) {
      if (skra.size > MAX_MB * 1048576) { toast('Skráin er stærri en ' + MAX_MB + ' MB'); return; }
      const oruggt = skra.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const slod = 'spjall/' + Date.now() + '-' + oruggt;
      toast('Hleð upp ' + skra.name + '…');
      const up = await sb.storage.from(BUCKET).upload(slod, skra, {
        contentType: skra.type || 'application/octet-stream', upsert: false,
      });
      if (up.error) { toast('Villa við upphleðslu: ' + (up.error.message || up.error)); return; }
      const { data: u } = sb.storage.from(BUCKET).getPublicUrl(slod);
      vidhengi = {
        file_name: skra.name, file_path: slod,
        file_url: u ? u.publicUrl : null,
        mime_type: skra.type || null, file_size: skra.size || null,
      };
    }

    const r = await sb.from('spjall').insert(Object.assign({
      body: t || null, author: hver(),
    }, vidhengi));
    if (r.error) { toast('Villa: ' + (r.error.message || r.error)); return; }
    await saekja();
    await merkjaLesid();
    teikna();
  }

  function toast(s) {
    try { if (window.Toast && Toast.show) return Toast.show(s); } catch (_) {}
    console.log('[spjall]', s);
  }

  /* ── Útlit ─────────────────────────────────────────────────────────────── */
  // Sami grænglitrandi texti og SKIPULAGSBORD (patch 305) svo þetta líti út
  // eins og hluti af sama borði, ekki aðskotahlutur.
  const GRAENN_TEXTI =
    'font-size:11px;font-weight:800;letter-spacing:1.4px;'
    + 'background:linear-gradient(180deg,#96c2a4,#4a8563 45%,#1e4631);'
    + '-webkit-background-clip:text;background-clip:text;color:transparent';
  // Ólesið → neon og blikk. Gradient víkur fyrir gegnheilum lit, annars sæist
  // glóðin ekki (background-clip:text étur text-shadow).
  const NEON_TEXTI =
    'font-size:11px;font-weight:800;letter-spacing:1.4px;color:#4ade80;'
    + 'text-shadow:0 0 6px #22c55e,0 0 14px #16a34a';

  function stilar() {
    if (document.getElementById('_spjall-css')) return;
    const s = document.createElement('style');
    s.id = '_spjall-css';
    s.textContent = [
      '@keyframes spjallBlikk{0%,49%{opacity:1}50%,100%{opacity:.35}}',
      '._spjall-blikk{animation:spjallBlikk 1.1s steps(1) infinite}',
      // Hreyfing slökkt hjá notanda → engin blikk, en neon-liturinn stendur.
      '@media (prefers-reduced-motion:reduce){._spjall-blikk{animation:none}}',
      '#_spjall-wrap{margin-bottom:16px}',
      '#_spjall-log{max-height:320px;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:9px;background:#0c0d10}',
      '._sp-m{max-width:82%;padding:7px 11px;border-radius:10px;font-size:12.5px;line-height:1.45;'
        + 'white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #23262c;background:#16181c;color:#d8dce2}',
      '._sp-m.eg{align-self:flex-end;background:#14321f;border-color:#2b5c3a;color:#dcf5e5}',
      '._sp-hd{font-size:10.5px;color:#7d858f;margin-bottom:3px;font-weight:700}',
      '._sp-skra{display:inline-flex;align-items:center;gap:7px;margin-top:5px;padding:5px 9px;border-radius:8px;'
        + 'background:#0f1115;border:1px solid #2b3038;color:#8fd0a8;text-decoration:none;font-size:11.5px;font-weight:700}',
      '._sp-skra:hover{border-color:#4ade80;color:#4ade80}',
      '._sp-hd{display:flex;align-items:center;gap:8px}',
      '._sp-x{margin-left:auto;border:0;background:transparent;color:#6b7280;font-size:12px;line-height:1;cursor:pointer;padding:0 2px;opacity:.55;font:inherit}',
      '._sp-m:hover ._sp-x{opacity:1}._sp-x:hover{color:#ef4444}',
      '#_spjall-drop{border-top:1px solid #23262c;padding:10px 12px;background:#0f1115;display:flex;gap:8px;align-items:flex-end}',
      '#_spjall-drop.yfir{background:#14321f;box-shadow:inset 0 0 0 2px #4ade80}',
      '#_spjall-txt{flex:1;min-height:40px;max-height:120px;resize:none;padding:10px 12px;border-radius:9px;'
        + 'border:1px solid #2b3038;background:#0c0d10;color:#e8e6e2;font:inherit;font-size:13px;outline:none}',
      '#_spjall-senda{flex:0 0 auto;min-height:40px;padding:0 15px;border-radius:9px;border:1px solid #2b5c3a;'
        + 'background:#1e4631;color:#dcf5e5;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}',
      '#_spjall-fest{flex:0 0 auto;min-height:40px;padding:0 12px;border-radius:9px;border:1px solid #2b3038;'
        + 'background:#16181c;color:#9aa3ad;font:inherit;font-size:15px;cursor:pointer}',
      '#_spjall-tomt{padding:22px;text-align:center;color:#6d757f;font-size:12.5px}',
      '#_spjall-villa{padding:14px;color:#f0c3bd;font-size:12.5px;background:#1d1113;border-top:1px solid #7d2b26}',
    ].join('');
    document.head.appendChild(s);
  }

  function hausHtml() {
    const n = olesin();
    const villa = !Array.isArray(_skilabod);
    const merki = villa
      ? '<span style="font-size:12px;color:#ff8a82">— náði ekki sambandi</span>'
      : '<span style="font-size:12px;color:#9aa0aa">'
        + _skilabod.length + ' skilaboð'
        + (n ? ' · <b style="color:#4ade80">' + n + ' ólesin</b>' : '')
        + '</span>';
    return '<div data-sp="toggle" style="display:flex;align-items:center;justify-content:space-between;'
      + 'gap:12px;background:linear-gradient(180deg,#2e3037,#17181c 55%,#0c0d10);padding:7px 12px;cursor:pointer">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<span class="' + (n ? '_spjall-blikk' : '') + '" style="' + (n ? NEON_TEXTI : GRAENN_TEXTI) + '">SPJALL</span>'
      + merki + '</div>'
      + '<span style="font-size:12px;color:#9aa0aa;font-weight:700">' + (_opid ? '▲ Fela' : '▼ Víkka') + '</span>'
      + '</div>';
  }

  function skilabodHtml() {
    if (!Array.isArray(_skilabod)) {
      return '<div id="_spjall-villa">Náði ekki í spjallið. Ekkert er sýnt — '
        + 'tómt spjall liti út eins og að ekkert hefði verið sagt.</div>';
    }
    if (!_skilabod.length) return '<div id="_spjall-tomt">Ekkert sagt enn. Skrifaðu eða dragðu skrá hingað.</div>';
    const eg = hver();
    const mork = _lesidAt ? Date.parse(_lesidAt) : 0;
    return '<div id="_spjall-log">' + _skilabod.map(m => {
      const mitt = m.author === eg;
      const nytt = !mitt && Date.parse(m.created_at) > mork;
      const t = new Date(m.created_at);
      const klst = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      const dags = t.toISOString().slice(0, 10);
      return '<div class="_sp-m' + (mitt ? ' eg' : '') + '"' + (nytt ? ' style="box-shadow:0 0 0 1px #4ade80"' : '') + '>'
        + '<div class="_sp-hd">' + esc(m.author) + ' · ' + dags + ' ' + klst + (nytt ? ' · NÝTT' : '')
        // 2026-09-02 (Agnar: „leyfðu að eyða spjallpunktum, þá fyrir öllum").
        // Mjúk-eyðing: deleted_at er sett, saekja() síar hana út, og realtime
        // (UPDATE á spjall) lætur hinar tölvurnar fella hana líka. Röðin er
        // aldrei eydd úr grunninum.
        + '<button type="button" class="_sp-x" data-sp-eyda="' + esc(m.id) + '" title="Eyða — hverfur hjá öllum">✕</button>'
        + '</div>'
        + (m.body ? esc(m.body) : '')
        + (m.file_url
            ? '<a class="_sp-skra" href="' + esc(m.file_url) + '" target="_blank" rel="noopener" download>'
              + '📎 ' + esc(m.file_name || 'skrá')
              + (m.file_size ? ' <span style="opacity:.7;font-weight:600">' + stardStr(m.file_size) + '</span>' : '')
              + '</a>'
            : '')
        + '</div>';
    }).join('') + '</div>';
  }

  function stardStr(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function innslattHtml() {
    return '<div id="_spjall-drop">'
      + '<button id="_spjall-fest" type="button" title="Hengja skrá við">📎'
      + '<input type="file" style="display:none"></button>'
      + '<textarea id="_spjall-txt" rows="1" placeholder="Skrifaðu — eða dragðu skrá hingað…"></textarea>'
      + '<button id="_spjall-senda" type="button">Senda</button></div>';
  }

  function teikna() {
    stilar();
    const w = document.getElementById('_spjall-wrap');
    if (!w) return;
    // 2026-09-02: VARÐVEITA ÞAÐ SEM ER VERIÐ AÐ SKRIFA. Þetta fall er kallað
    // við hverja lifandi uppfærslu (SpjallRefresh úr db.js) — líka bergmálið af
    // eigin sendingu ~5 sek. síðar — og `innerHTML =` þurrkaði þá textareað
    // með hálfskrifuðum texta. Mælt í gegnum viðmótið: texti sem beið sendingar
    // hvarf. Frá notandanum séð: „spjallið vistast ekki".
    const gamalt = w.querySelector('#_spjall-txt');
    const drog = gamalt ? gamalt.value : '';
    const hafdiFokus = !!gamalt && document.activeElement === gamalt;
    const caret = gamalt ? [gamalt.selectionStart, gamalt.selectionEnd] : null;
    const logG = document.getElementById('_spjall-log');
    const varNedst = !logG || (logG.scrollHeight - logG.scrollTop - logG.clientHeight) < 40;
    w.innerHTML = '<div style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);overflow:hidden">'
      + hausHtml()
      + (_opid ? skilabodHtml() + innslattHtml() : '')
      + '</div>';
    tengja(w);
    hlidarNeon();
    const nytt = w.querySelector('#_spjall-txt');
    if (nytt && drog) {
      nytt.value = drog;
      nytt.style.height = 'auto'; nytt.style.height = Math.min(nytt.scrollHeight, 120) + 'px';
      if (hafdiFokus) { try { nytt.focus(); if (caret) nytt.setSelectionRange(caret[0], caret[1]); } catch (_) {} }
    }
    const log = document.getElementById('_spjall-log');
    // Skruna aðeins neðst ef notandinn var þegar neðst — annars hoppar
    // sagan undan honum þegar hann er að lesa eldri skilaboð.
    if (log && varNedst) log.scrollTop = log.scrollHeight;
  }

  function tengja(w) {
    const h = w.querySelector('[data-sp="toggle"]');
    if (h) h.addEventListener('click', async () => {
      _opid = !_opid;
      try { localStorage.setItem(OPIN_KEY, _opid ? '1' : '0'); } catch (_) {}
      if (_opid) await merkjaLesid();
      teikna();
    });
    if (!_opid) return;

    // Eyða skilaboði — fyrir alla. Eitt staðfestingarspurning; röðin er
    // mjúk-eydd og má endurheimta úr grunninum ef á þarf að halda.
    w.querySelectorAll('[data-sp-eyda]').forEach(b => b.addEventListener('click', async ev => {
      ev.preventDefault(); ev.stopPropagation();
      const id = b.getAttribute('data-sp-eyda');
      if (!window.confirm('Eyða þessum skilaboðum? Þau hverfa hjá öllum.')) return;
      const sb = SB(); if (!sb) { toast('Engin gagnagrunnstenging'); return; }
      const r = await sb.from('spjall').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (r.error) { toast('Tókst ekki að eyða: ' + (r.error.message || r.error)); return; }
      await saekja();
      teikna();
    }));

    const txt = w.querySelector('#_spjall-txt');
    const send = w.querySelector('#_spjall-senda');
    const fest = w.querySelector('#_spjall-fest');
    const inn = fest && fest.querySelector('input[type=file]');
    const drop = w.querySelector('#_spjall-drop');

    const sendaNu = async () => {
      const t = txt ? txt.value : '';
      if (!t.trim()) return;
      if (txt) { txt.value = ''; txt.style.height = 'auto'; }
      await senda(t, null);
    };
    if (send) send.addEventListener('click', sendaNu);
    if (txt) {
      txt.addEventListener('input', () => { txt.style.height = 'auto'; txt.style.height = Math.min(txt.scrollHeight, 120) + 'px'; });
      // Enter sendir á tölvu; á síma er Enter línuskil (Senda-takkinn er þar).
      txt.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches) { e.preventDefault(); sendaNu(); }
      });
    }
    if (fest && inn) {
      fest.addEventListener('click', e => { if (e.target !== inn) inn.click(); });
      inn.addEventListener('change', async ev => {
        const f = ev.target.files && ev.target.files[0];
        ev.target.value = '';
        if (f) await senda(txt ? txt.value : '', f);
        if (txt) txt.value = '';
      });
    }
    if (drop) {
      ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => {
        e.preventDefault(); e.stopPropagation(); drop.classList.add('yfir');
      }));
      ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => {
        e.preventDefault(); e.stopPropagation();
        if (t === 'dragleave' && drop.contains(e.relatedTarget)) return;
        drop.classList.remove('yfir');
      }));
      drop.addEventListener('drop', async e => {
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f) return;
        await senda(txt ? txt.value : '', f);
        if (txt) txt.value = '';
      });
    }
  }

  /* Neon á hliðarstikuna. Merkið sjálft er tala Þjónustuborðsins (patch 231);
     hér er AÐEINS bætt við glóð þegar ólesið spjall bíður, og hún tekin af
     aftur. Talan sjálf er ósnert — hún á sitt eigið hlutverk. */
  function hlidarNeon() {
    const n = olesin();
    const nav = document.querySelector('[data-view="verkbord"]');
    if (!nav) return;
    if (n) {
      nav.style.setProperty('box-shadow', '0 0 10px -1px #22c55e, inset 0 0 0 1px #4ade80', 'important');
      nav.classList.add('_spjall-blikk');
      nav.title = n + ' ólesin skilaboð á Þjónustuborði';
    } else {
      nav.style.removeProperty('box-shadow');
      nav.classList.remove('_spjall-blikk');
      if (nav.title && /ólesin skilaboð/.test(nav.title)) nav.title = '';
    }
  }

  /* ── Innsetning í Þjónustuborðið ───────────────────────────────────────── */
  function festa() {
    const v = document.getElementById('view-verkbord');
    if (!v || !v.classList.contains('active')) return false;
    if (document.getElementById('_spjall-wrap')) return true;
    // Fer beint fyrir ofan síu-/leitarspjaldið, þar sem Agnar merkti.
    const ctrl = document.getElementById('vb-controls') || v.querySelector('.vb-scroll');
    const hylki = ctrl ? (ctrl.closest('div[style*="border-radius"]') || ctrl.parentNode) : null;
    const w = document.createElement('div');
    w.id = '_spjall-wrap';
    if (hylki && hylki.parentNode) hylki.parentNode.insertBefore(w, hylki);
    else v.insertBefore(w, v.firstChild);
    return true;
  }

  async function vakta() {
    if (!festa()) { hlidarNeon(); return; }
    if (!Array.isArray(_skilabod) && !_saekir) await saekja();
    teikna();
  }

  // Lifandi: `spjall` er í RT_TABLES svo db.js kveikir hér við breytingu.
  window.SpjallRefresh = async function () {
    await saekja();
    const v = document.getElementById('view-verkbord');
    if (v && v.classList.contains('active')) {
      if (_opid) await merkjaLesid();
      teikna();
    } else {
      hlidarNeon();   // glóðin á að sjást þótt borðið sé lokað
    }
  };

  new MutationObserver(() => { clearTimeout(window.__spT); window.__spT = setTimeout(vakta, 350); })
    .observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // Fyrsta hleðsla: sækja strax svo glóðin sjáist áður en borðið er opnað.
  (async () => { await saekja(); hlidarNeon(); vakta(); })();

  window.Spjall = { saekja, senda, teikna, olesin, version: 'v1' };
  console.log('[patch-347] spjall ready');
})();
/* === END SPJALL === */
