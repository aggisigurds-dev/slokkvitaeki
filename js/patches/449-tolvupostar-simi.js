/* === TÖLVUPÓSTAR — SÍMASÍÐA (449) — 09.10.2026 ================================
 *
 * Agnar: „útbúa líka sér öpp-útgáfu og setja í appið Þjónustuborð". Síða `tolvupostar` í öpp-valinu (261), sjálfgefin á
 * Þjónustuborðs-appinu. Sömu gögn, sömu hlutar og sömu aðgerðir og hamurinn á borðinu — allt úr window.Tolvupostar (448);
 * þessi skrá á aðeins símaútlitið (Brunastál, 375 px, eitt spjald á þráð, 48 px takkar). Ekkert hér skrifar sjálft.
 * Mynstur: 446-samthykkja-simi.js (view-<key>, App.switchView-umbúðir, _eftir-tenging, Stodugt.vernda).
 * ========================================================================== */
(() => {
  if (window.__tolvupostar449) return;
  window.__tolvupostar449 = true;

  const VIEW_ID = 'view-tolvupostar', NAV_KEY = 'tolvupostar';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const API = () => window.Tolvupostar || null;
  const opin = new Set();          // opnuð spjöld — lifir milli teikninga, ekki í DOM
  let _poll = 0;

  function css() {
    const V = 'html body #' + VIEW_ID;
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);font-family:' + SANS + ';color:#1f2530;padding-bottom:96px}',
      V + '.active{display:block}',
      V + ' .tp-haus{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#2b2e35 0%,#191b20 100%);border-bottom:1px solid #000;color:#fff}',
      V + ' .tp-haus>div{min-width:0;flex:1 1 auto}' + V + ' .tp-haus .tt{font-family:' + DISP + ';font-weight:800;font-size:20px;line-height:1}',
      V + ' .tp-haus .st{font-family:' + MONO + ';font-size:10.5px;color:#aab2c0;margin-top:4px;letter-spacing:.04em;white-space:normal;line-height:1.4}',
      V + ' .tp-haus .uppf{flex:none;width:40px;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font-size:17px;cursor:pointer}',
      V + ' .tp-rod{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:10px 12px 0;-webkit-overflow-scrolling:touch}' + V + ' .tp-rod::-webkit-scrollbar{display:none}',
      V + ' .tp-rod button{flex:none;height:34px;padding:0 12px;border-radius:8px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 12.5px ' + SANS + ';cursor:pointer;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      V + ' .tp-rod button[aria-pressed="true"]{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#fff;border-color:#000}' + V + ' .tp-rod small{opacity:.7;font-weight:500}',
      V + ' .tp-teljari{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 12px 0}',
      V + ' .tp-teljari button{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 10px;border-radius:9px;border:1px solid rgba(20,24,34,.22);background:linear-gradient(180deg,#fdfdfe,#e6e9ef);color:#1f2530;font:600 12px ' + SANS + ';text-align:left;cursor:pointer}',
      V + ' .tp-teljari button b{font-family:' + DISP + ';font-size:22px;line-height:1;min-width:28px;text-align:center}' + V + ' .tp-teljari button small{display:block;font:500 10.5px ' + MONO + ';color:#5b6577!important;margin-top:2px}',
      V + ' .tp-teljari button._gull{grid-column:1 / -1;background:linear-gradient(180deg,#e8cb7a,#c9a24a);border-color:#8a6218;color:#1c1608}' + V + ' .tp-teljari button._gull small{color:#5c4312!important}',
      V + ' .tp-teljari button._claude{background:linear-gradient(180deg,#1f6b3c,#145229);color:#fff;border-color:#0b3519}' + V + ' .tp-teljari button._claude small{color:#bfe3c9!important}',
      V + ' .tp-hluti{display:flex;align-items:center;gap:8px;margin:14px 12px 6px;font-family:' + MONO + ';font-size:10.5px;letter-spacing:.14em;color:#525b6b;text-transform:uppercase}',
      V + ' .tp-hluti b{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;padding:0 6px;border-radius:5px;background:#1f2530;color:#fff;font-size:11px;letter-spacing:0}' + V + ' .tp-hluti._gull b{background:#c99a3a;color:#1c1608}' + V + ' .tp-hluti._claude b{background:#1f6b3c}' + V + ' .tp-hluti._ok b{background:#6b7280}',
      V + ' .tp-hluti button{margin-left:auto;background:none;border:0;font:600 11px ' + SANS + ';color:#2f6fb3;text-transform:none;letter-spacing:0;cursor:pointer;padding:6px}',
      V + ' .tp-mal{margin:0 12px 10px;border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.16);box-shadow:0 1px 2px rgba(0,0,0,.08);overflow:hidden}' + V + ' .tp-mal._buid{opacity:.72}',
      V + ' .tp-mal .opna{display:block;width:100%;padding:12px 14px;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      V + ' .tp-l1{display:flex;align-items:center;gap:6px;font-family:' + MONO + ';font-size:10.5px;color:#5b6577}' + V + ' .tp-fra{font:700 13px ' + SANS + ';color:#1f2530;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' + V + ' .tp-l1 time{margin-left:auto;white-space:nowrap}',
      V + ' .tp-holf{flex:none;padding:0 5px;border-radius:3px;border:1px solid rgba(20,24,34,.3);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase}' + V + ' .tp-holf._bokhald{border-color:rgba(47,111,179,.5);color:#2f6fb3}',
      V + ' .tp-efni{display:block;font:700 15px/1.3 ' + SANS + ';margin:4px 0 3px;overflow-wrap:anywhere}' + V + ' .tp-snip{display:block;font-size:13px;line-height:1.45;color:#3a4250;overflow-wrap:anywhere}',
      V + ' .tp-merki{display:flex;flex-wrap:wrap;gap:3px 4px;margin-top:6px}' + V + ' .tp-m{font-family:' + MONO + ';font-size:10px;letter-spacing:.03em;padding:2px 6px;border-radius:3px;border:1px solid rgba(20,24,34,.22);color:#3a4250;background:#f4f6f9;white-space:nowrap;max-width:230px;overflow:hidden;text-overflow:ellipsis}',
      V + ' .tp-m._lokid{border-color:rgba(47,122,74,.5);color:#2f7a4a}' + V + ' .tp-m._beidni{border-color:#b8892e;color:#8a6218;background:#f6ebcc}' + V + ' .tp-m._claude{border-color:#145229;color:#fff;background:#1f6b3c}' + V + ' .tp-m._kunni{color:#1f2530;font-weight:700}' + V + ' .tp-m.tp-stj{border:0;background:none;font-size:14px;padding:0 2px;line-height:1}',
      V + ' .tp-inni{padding:0 14px 14px;border-top:1px solid rgba(20,24,34,.1)}',
      V + ' .tp-takkar{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}' + V + ' .tp-takkar button,' + V + ' .tp-takkar a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:6px 10px;border-radius:9px;border:1px solid rgba(20,24,34,.3);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 14px ' + SANS + ';cursor:pointer;text-decoration:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      V + ' .tp-takkar ._gull{background:linear-gradient(180deg,#e8cb7a,#c9a24a);border-color:#8a6218;color:#1c1608}' + V + ' .tp-takkar ._graen{background:linear-gradient(180deg,#2d8a4e,#1f6b3c);border-color:#0b3519;color:#fff}' + V + ' .tp-takkar ._on{background:#1f2530;color:#fff;border-color:#000}' + V + ' .tp-takkar ._breid{grid-column:1 / -1}' + V + ' .tp-takkar button:disabled{opacity:.5}',
      V + ' .tp-ta,' + V + ' .tp-inp{display:block;width:100%;box-sizing:border-box;margin:8px 0 0;padding:10px 12px;border:1px solid rgba(20,24,34,.3);border-radius:9px;background:#fff;color:#1f2530;font:15px/1.5 ' + SANS + '}' + V + ' .tp-ta{min-height:120px;resize:vertical}',
      V + ' .tp-kassi{margin-top:12px;padding:10px 12px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:#f7f8fa}' + V + ' .tp-kassi b{display:block;font:700 10.5px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#525b6b;margin-bottom:4px}' + V + ' .tp-kassi .s{font-size:12px;color:#5b6577}',
      V + ' .tp-uppk{border-left:3px solid #c9a24a;background:#fbf3dd}' + V + ' .tp-nota{white-space:pre-wrap;font-size:13px;line-height:1.5;color:#3a4250;max-height:220px;overflow:auto}',
      V + ' .tp-skeyti{margin-top:10px;padding:10px 12px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#fff}' + V + ' .tp-skeyti._okkar{background:#fbf3dd;border-color:#d9c48a}' + V + ' .tp-skeyti header{display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 8px;font-size:12.5px;margin-bottom:5px}' + V + ' .tp-skeyti header .s{color:#5b6577;font-size:11.5px}' + V + ' .tp-skeyti header time{margin-left:auto;font-family:' + MONO + ';font-size:10.5px;color:#5b6577}',
      V + ' .tp-texti{white-space:pre-wrap;font-size:14px;line-height:1.55;overflow-wrap:anywhere}' + V + ' .tp-vidh{margin-top:6px;font-family:' + MONO + ';font-size:11px;color:#3a4250}',
      V + ' .tp-tomt{margin:30px 20px;text-align:center;font-size:14px;color:#525b6b;line-height:1.6}' + V + ' .tp-villa{margin:12px;padding:12px;border-radius:9px;background:#f9e3e0;color:#7a1f14;font-size:13px}'
    ].join('\n');
  }
  function injectCss() { if (document.getElementById('_tp449-css')) return; const st = document.createElement('style'); st.id = '_tp449-css'; st.textContent = css(); document.head.appendChild(st); }
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    v.innerHTML = '<div id="_tp449-root"></div>';
    v.addEventListener('click', smellur);
    v.addEventListener('input', e => { const el = e.target; if (el && el.dataset && el.dataset.tpIn) { const A = API(); if (A) A.innslattur(el); } });
    document.body.appendChild(v);
    return v;
  }

  const chip = (a, v, on, texti) => '<button type="button" data-tp="' + a + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '">' + texti + '</button>';
  function spjald(t, A) {
    const op = opin.has(t.k), b = !!A.S.busy[t.k], stj = t.tags.indexOf('undirbuid') >= 0;
    let inni = '';
    if (op) {
      const svarOp = A.S.svarOpid === t.k, clOp = A.S.claudeOpid === t.k;
      inni = '<div class="tp-inni"><div class="tp-takkar">' +
        '<button type="button" data-tp="svara" data-v="' + esc(t.k) + '" class="' + (svarOp ? '_on' : '') + '">↩ Svara</button>' +
        '<button type="button" data-tp="claude-opna" data-v="' + esc(t.k) + '" class="' + (clOp ? '_on' : '') + '">🤖 Til Claude</button>' +
        '<button type="button" data-tp="stjarna" data-v="' + esc(t.k) + '" class="' + (stj ? '_gull' : '') + '"' + (b ? ' disabled' : '') + '>' + (stj ? '★ Tilbúið' : '☆ Merkja tilbúið') + '</button>' +
        (t.mal ? '<button type="button" data-tp="bord" data-v="' + esc(t.k) + '">📋 Málið á borðinu</button>' : (t.hluti === 'bidur' ? '<button type="button" data-tp="svarad" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>✓ Merkja svarað</button>' : '<span></span>')) +
        '<a href="' + esc(A.gmailSlod(t)) + '" target="_blank" rel="noopener">Opna í Gmail ↗</a>' +
        '<button type="button" data-tp="' + (t.falid ? 'afhylja' : 'fela') + '" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>' + (t.falid ? 'Sýna aftur' : '✕ Fela') + '</button></div>';
      if (clOp) inni += '<div class="tp-kassi"><b>Til Claude — hvað á að gera?</b><span class="s">Claude vinnur verkið, setur ★ þegar svarið er tilbúið, og þú sendir það héðan.</span>' +
        '<textarea class="tp-ta" data-tp-in="sky" data-v="' + esc(t.k) + '" rows="3" placeholder="T.d. „finna úttektarskýrsluna og semja svar“ — má vera autt">' + esc(A.S.sky[t.k] || '') + '</textarea>' +
        '<div class="tp-takkar"><button type="button" data-tp="claude" data-v="vinnsla" data-k="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>▶ Í vinnslu</button><button type="button" class="_gull" data-tp="claude" data-v="samthykkt" data-k="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>✓ Samþykkt</button></div></div>';
      if (svarOp) inni += '<div class="tp-kassi"><b>↩ Svar · frá ' + esc(t.account) + ' · til ' + esc(t.netfang) + '</b>' +
        '<input class="tp-inp" data-tp-in="efni" data-v="' + esc(t.k) + '" value="' + esc(A.svarEfni(t)) + '" aria-label="Efni">' +
        '<textarea class="tp-ta" data-tp-in="drog" data-v="' + esc(t.k) + '" rows="8" placeholder="Svarið — yfirfarðu áður en þú sendir. ✨ Semja sækir uppkast.">' + esc(A.svarTexti(t)) + '</textarea>' +
        '<input class="tp-inp" data-tp-in="sky" data-v="' + esc(t.k) + '" value="' + esc(A.S.sky[t.k] || '') + '" placeholder="Stýring á uppkastið (valfrjálst)">' +
        '<div class="tp-takkar"><button type="button" data-tp="semja" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>✨ Semja uppkast</button><button type="button" class="_graen" data-tp="senda" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>📤 Senda svar</button></div></div>';
      if (t.mal) {
        const n = A.notaAnUppkasts(t.mal), u = A.uppkastUrNotu(t.mal);
        inni += '<div class="tp-kassi"><b>📋 Mál #' + t.mal.id + ' · ' + esc(t.mal.status || '') + (t.mal.assigned_to ? ' · ' + esc(t.mal.assigned_to) : '') + '</b>' + (n ? '<div class="tp-nota">' + esc(n.slice(0, 1200)) + '</div>' : '') + '</div>';
        if (u) inni += '<div class="tp-kassi tp-uppk"><b>★ Uppkast frá Claude — forfyllt í svarreitinn</b><div class="tp-nota">' + esc(u.slice(0, 400)) + (u.length > 400 ? '…' : '') + '</div></div>';
      }
      inni += t.msgs.slice().reverse().map(x => { const okkar = x.folder === 'SENT'; return '<article class="tp-skeyti' + (okkar ? ' _okkar' : '') + '"><header><b>' + (okkar ? 'Við · ' + esc(A.stuttHolf(x.account)) + '@' : esc(x.sender_name || x.sender_email || '')) + '</b><span class="s">' + esc(okkar ? 'til ' + String(x.to_addresses || '').slice(0, 60) : (x.sender_email || '')) + '</span><time>' + esc(A.dags(x.received_at)) + ' ' + esc(A.kl(x.received_at)) + '</time></header><div class="tp-texti">' + esc(x.body_preview || x.snippet || '(ekkert meginmál sótt — opna í Gmail)') + '</div>' + ((Array.isArray(x.attachment_names) && x.attachment_names.length) ? '<div class="tp-vidh">📎 ' + esc(x.attachment_names.join(' · ')) + '</div>' : '') + '</article>'; }).join('');
      inni += '</div>';
    }
    return '<div class="tp-mal' + (t.hluti === 'buid' ? ' _buid' : '') + '" data-k="' + esc(t.k) + '"><button type="button" class="opna" data-tp="opna" data-v="' + esc(t.k) + '" aria-expanded="' + op + '">' +
      '<span class="tp-l1"><span class="tp-fra">' + esc(t.nafn) + '</span><span class="tp-holf _' + esc(A.stuttHolf(t.account)) + '">' + esc(A.stuttHolf(t.account)) + '</span><time>' + esc(A.dags(t.timi).slice(0, 5)) + ' · ' + A.dagarSidan(t.timi) + ' d.' + (t.fjoldi > 1 ? ' · ' + t.fjoldi + ' skeyti' : '') + '</time></span>' +
      '<span class="tp-efni">' + esc(t.efni) + '</span>' + (op ? '' : '<span class="tp-snip">' + esc(String(t.sidastaInn.snippet || '').slice(0, 140)) + '</span>') +
      '<span class="tp-merki">' + A.merkiHtml(t, op) + '</span></button>' + inni + '</div>';
  }
  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    const root = document.getElementById('_tp449-root');
    const A = API();
    let body = '';
    let st = '';
    if (!A) { body = '<div class="tp-villa">Tölvupóstar (448) eru ekki hlaðnir.</div>'; }
    else {
      const s = A.S.sia, l = A.siad(), n = h => A.hlutaListi(l, h).length;
      st = A.loaded() ? [n('bidur') + ' bíða', n('claude') + ' hjá Claude', n('undirbuid') + ' ★'].join(' · ') : (A.villa() ? '⚠️ ' + A.villa() : 'sæki…');
      if (A.loadedAt()) st += ' · sótt kl. ' + A.kl(A.loadedAt());
      if (A.loading() && A.loaded()) st += ' · sæki…';
      body = '<div class="tp-rod">' + chip('holf', 'baedi', s.holf === 'baedi', 'Bæði') + chip('holf', 'eldklar', s.holf === 'eldklar', 'eldklar@') + chip('holf', 'bokhald', s.holf === 'bokhald', 'bokhald@') + chip('sia', 'osvarad', s.osvarad, 'Ósvarað') + chip('sia', 'beidnir', s.beidnir, '✉ Beiðnir') + chip('sia', 'vidhengi', s.vidhengi, '📎') + '</div>' +
        '<div class="tp-rod">' + chip('rod', 'nyjast', s.rodun === 'nyjast', 'Nýjast') + chip('rod', 'elst', s.rodun === 'elst', 'Elst') + chip('rod', 'mikilv', s.rodun === 'mikilv', 'Mikilvægast') + chip('rod', 'fjoldi', s.rodun === 'fjoldi', 'Flest skeyti') + '</div>' +
        '<div class="tp-rod">' + A.merkjaTalning().slice(0, 10).map(([m, c]) => chip('merki', m, s.merki === m, (m === '★' ? '<span style="color:#d4a017">★</span>' : esc(m)) + ' <small>' + c + '</small>')).join('') + (s.merki ? chip('merki', '', false, '✕ Hreinsa') : '') + '</div>';
      if (!A.loaded()) body += '<div class="tp-tomt">' + (A.villa() ? esc(A.villa()) : 'Sæki póstinn…') + '</div>';
      else {
        body += '<div class="tp-teljari"><button type="button" data-tp="hoppa" data-v="undirbuid" class="_gull"><b>' + n('undirbuid') + '</b><span>★ Tilbúið að svara<small>Claude undirbjó — þú sendir</small></span></button>' +
          '<button type="button" data-tp="hoppa" data-v="claude" class="_claude"><b>' + n('claude') + '</b><span>Hjá Claude<small>í vinnslu · samþykkt</small></span></button>' +
          '<button type="button" data-tp="hoppa" data-v="bidur"><b>' + n('bidur') + '</b><span>Bíður svars<small>enginn svarað</small></span></button></div>';
        if (!l.length) body += '<div class="tp-tomt">Enginn póstur passar við síuna.</div>';
        body += A.HLUTAR.map(h => { const m = A.hlutaListi(l, h[0]); if (!m.length) return ''; const fela = A.erFellt(h[0], s);
          return '<div class="tp-hluti ' + h[2] + '" id="_tp-h-' + h[0] + '"><b>' + m.length + '</b>' + esc(h[1]) + (h[0] in A.FELLT ? '<button type="button" data-tp="syna-lokid" data-v="' + h[0] + '">' + (fela ? 'sýna' : 'fela') + '</button>' : '') + '</div>' + (fela ? '' : m.map(t => spjald(t, A)).join(''));
        }).join('');
        const faldir = A.S.thraedir.filter(t => t.falid).length;
        body += '<div class="tp-hluti">' + (A.S.synaFalid ? '<button type="button" data-tp="syna-falid" data-v="0" style="margin-left:0">‹ aftur í póstinn</button>' : (faldir ? '<button type="button" data-tp="syna-falid" data-v="1" style="margin-left:0">' + faldir + ' faldir · sýna</button>' : '')) + '</div>';
      }
    }
    const html = '<div class="tp-haus"><div><div class="tt">Tölvupóstar</div><div class="st">' + esc(st) + '</div></div><button type="button" class="uppf" data-tp="uppf" title="Sækja nýjan póst">↻</button></div>' + body;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(root) : null;
    if (root._h !== html) { root.innerHTML = html; root._h = html; }
    if (aftur) aftur();
  }
  function smellur(e) {
    const b = e.target && e.target.closest ? e.target.closest('[data-tp]') : null;
    if (!b) return;
    const A = API(); if (!A) return;
    const a = b.dataset.tp, v = b.dataset.v || '', k = b.dataset.k || v;
    const R = () => render();
    switch (a) {
      case 'opna': if (opin.has(v)) opin.delete(v); else opin.add(v); R(); return;
      case 'holf': A.S.sia.holf = v; A.vistaSiu(); R(); return;
      case 'rod': A.S.sia.rodun = v; A.vistaSiu(); R(); return;
      case 'sia': A.S.sia[v] = !A.S.sia[v]; R(); return;
      case 'merki': A.S.sia.merki = v; R(); return;
      case 'syna-lokid': A.FELLT[v] = !A.FELLT[v]; R(); return;
      case 'syna-falid': A.S.synaFalid = v === '1'; R(); return;
      case 'hoppa': { const h = document.getElementById('_tp-h-' + v); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      case 'uppf': A.saekjaNyjan().then(R, R); R(); return;
      case 'svara': A.S.svarOpid = A.S.svarOpid === v ? null : v; A.S.claudeOpid = null; R(); return;
      case 'claude-opna': A.S.claudeOpid = A.S.claudeOpid === v ? null : v; A.S.svarOpid = null; R(); return;
      case 'claude': A.tilClaude(k, v, A.S.sky[k] || '').then(() => { A.S.claudeOpid = null; render(); }); R(); return;
      case 'stjarna': A.stjarna(v); R(); return;
      case 'svarad': A.svarad(v); R(); return;
      case 'fela': A.fela(v, false); R(); return;
      case 'afhylja': A.fela(v, true); R(); return;
      case 'semja': A.semja(v).then(R, R); R(); return;
      case 'senda': A.senda(v).then(R, R); R(); return;
      case 'bord': { const t = A.finna(v); if (t && t.mal && window.Samthykkja && Samthykkja.velja) { Samthykkja.velja(t.mal.id); if (window.App && App.switchView) App.switchView('bord'); } return; }
    }
  }

  function open() {
    injectCss(); ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block'; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    const A = API();
    if (A && !A.loading()) A.load(true);
    clearInterval(_poll);
    _poll = setInterval(() => { const vv = document.getElementById(VIEW_ID); if (!vv || !vv.classList.contains('active') || document.hidden) return; const B = API(); if (B && !B.loading()) B.load(true); }, 120000);
    if (!window.__tp449Vakt) { window.__tp449Vakt = true; document.addEventListener('visibilitychange', () => { if (document.hidden) return; const vv = document.getElementById(VIEW_ID); if (vv && vv.classList.contains('active')) { const B = API(); if (B && !B.loading()) B.load(true); } }); }
  }
  function hide() { try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {} clearInterval(_poll); _poll = 0; }
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._tolvupostarPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      hide();
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._tolvupostarPatched = true;
  }
  function tengja() { const A = API(); if (!A) { setTimeout(tengja, 500); return; } if (A.S._eftir.indexOf(render) < 0) A.S._eftir.push(render); }
  function boot() {
    patchSwitchView(); tengja();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.TolvupostarSimi = { open, render, version: '449' };
  console.log('[449] Tölvupóstar — símasíða');
})();
