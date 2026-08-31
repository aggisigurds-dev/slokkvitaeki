/* === TEIKNINGA-LEIT (325) — heimilisfang → landnúmer → teikningar ==========
 *
 * Tvívirkur leitarhnappur (ósk Agnars 28.08). Þú slærð inn HEIMILISFANG
 * („Skútuvogur 4"), hann sækir LANDNÚMERIÐ úr Landeignaskrá HMS og opnar
 * TEIKNINGARNAR í skjalasafni Reykjavíkur með því númeri. Áður þurfti þrjú
 * skref í tveimur flipum: fletta upp í landeignaskrá, afrita L-númerið,
 * líma það í skjalasafnið.
 *
 * HVERS VEGNA SERVER-PROXY:
 * geo.fasteignaskra.is skilar hreinu JSON en sendir ENGIN CORS-haus (staðfest
 * í vafra 28.08 — svarið hefur ekkert access-control-allow-origin, og
 * Content-Type er meira að segja 'application/javascript'). Vafrinn getur því
 * ekki kallað beint. Sama ástæða og `kt-lookup` er til fyrir, og sama lausn:
 * /.netlify/functions/landnr.
 *
 * SKREF 2 ÞARF ENGA ÞJÓNUSTU — landnúmerið fer beint í slóð:
 *   skjalasafn.reykjavik.is/fotoweb/archives/5000-Aðaluppdrættir/?q=<landnr>
 *   geo.fasteignaskra.is/landeignaskra/<landnr>
 *
 * FÆRANLEGUR: allt viðmótið er í `Landnr.el()`, svo hann má setja hvar sem er:
 *   Landnr.mount(einhverElement)   → setur hann inn í það svæði
 *   Landnr.open()                  → fljótandi gluggi hvar sem er
 *   Landnr.search('Skútuvogur 4')  → hrá leit, skilar [{landnr,label}]
 *   Landnr.teikningar(105166)      → opnar teikningarnar beint
 * Sjálfkrafa sest hann á Sölu; TurboPaint-síðan þarf bara Landnr.mount(...).
 * ========================================================================== */
(() => {
  if (window.__landnrInstalled) return;
  window.__landnrInstalled = true;

  const API = '/.netlify/functions/landnr';
  const TEIKN = 'https://skjalasafn.reykjavik.is/fotoweb/archives/5000-A%C3%B0aluppdr%C3%A6ttir/?q=';
  const LANDEIGN = 'https://geo.fasteignaskra.is/landeignaskra/';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function search(term) {
    const t = String(term || '').trim();
    if (t.length < 2) return [];
    const r = await fetch(API + '?leit=' + encodeURIComponent(t));
    if (!r.ok) throw new Error('Leit mistókst (' + r.status + ')');
    const d = await r.json();
    if (d && d.error && (!d.results || !d.results.length)) throw new Error(d.error);
    return (d && d.results) || [];
  }
  function teikningar(landnr) {
    if (!landnr) return;
    try { window.open(TEIKN + encodeURIComponent(landnr), '_blank', 'noopener'); } catch (_) {}
  }
  function landeignaskra(landnr) {
    if (!landnr) return;
    try { window.open(LANDEIGN + encodeURIComponent(landnr), '_blank', 'noopener'); } catch (_) {}
  }

  function css() {
    if (document.getElementById('_lnr-css')) return;
    const s = document.createElement('style'); s.id = '_lnr-css';
    s.textContent = [
      '.lnr-box{border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:11px 12px;font:13px "Space Grotesk",system-ui,sans-serif;max-width:520px}',
      '.lnr-h{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#b58a2b;margin:0 0 8px}',
      '.lnr-row{display:flex;gap:7px;align-items:center}',
      '.lnr-inp{flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:9px;padding:9px 11px;font:inherit;font-size:13px;outline:none}',
      '.lnr-inp:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}',
      '.lnr-go{all:unset;cursor:pointer;background:#0f172a;color:#fff;font-weight:700;font-size:12.5px;padding:9px 14px;border-radius:9px;flex:none}',
      '.lnr-go:hover{filter:brightness(1.15)}',
      '.lnr-res{margin-top:8px;display:flex;flex-direction:column;gap:5px}',
      '.lnr-item{all:unset;cursor:pointer;display:flex;align-items:center;gap:9px;border:1px solid #e2e8f0;border-radius:9px;padding:8px 10px;background:#f8fafc}',
      '.lnr-item:hover{background:#eef2f7;border-color:#cbd5e1}',
      '.lnr-nm{flex:1;min-width:0;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.lnr-l{font-family:ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:700;color:#2563eb;background:#e0edff;border-radius:6px;padding:2px 7px;flex:none}',
      '.lnr-map{all:unset;cursor:pointer;font-size:13px;opacity:.6;flex:none;padding:0 2px}',
      '.lnr-map:hover{opacity:1}',
      '.lnr-msg{margin-top:7px;font-size:12px;color:#64748b}',
      '.lnr-msg.err{color:#b91c1c}',
      '#_lnr-float{position:fixed;z-index:99600;right:16px;bottom:76px;box-shadow:0 18px 46px -18px rgba(15,23,42,.55)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // Eitt viðmót, notað bæði innfellt og fljótandi — svo hegðunin sé sú sama
  // hvar sem hann endar.
  function el(opts) {
    css();
    const o = opts || {};
    const box = document.createElement('div');
    box.className = 'lnr-box';
    box.innerHTML =
      '<div class="lnr-h">📐 Teikningar — heimilisfang' +
        (o.closable ? '<button class="lnr-map" data-lnr-close style="float:right">✕</button>' : '') + '</div>' +
      '<div class="lnr-row">' +
        '<input class="lnr-inp" type="search" placeholder="t.d. Skútuvogur 4" value="' + esc(o.prefill || '') + '">' +
        '<button type="button" class="lnr-go">Leita</button>' +
      '</div>' +
      '<div class="lnr-res"></div><div class="lnr-msg"></div>';

    const inp = box.querySelector('.lnr-inp');
    const res = box.querySelector('.lnr-res');
    const msg = box.querySelector('.lnr-msg');
    const cl = box.querySelector('[data-lnr-close]');
    if (cl) cl.onclick = () => box.remove();

    let seq = 0, t = null;
    function say(txt, isErr) { msg.textContent = txt || ''; msg.className = 'lnr-msg' + (isErr ? ' err' : ''); }
    async function run() {
      const term = inp.value.trim();
      res.innerHTML = '';
      if (term.length < 2) { say('Sláðu inn a.m.k. tvo stafi.'); return; }
      const my = ++seq;
      say('Leita…');
      let rows;
      try { rows = await search(term); } catch (e) { if (my === seq) say(e.message || 'Leit mistókst', true); return; }
      if (my !== seq) return;                       // eldra svar — hunsa
      if (!rows.length) { say('Ekkert fannst fyrir „' + term + '".'); return; }
      say(rows.length === 1 ? '1 eign fannst' : rows.length + ' eignir fundust');
      rows.forEach(r => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'lnr-item';
        b.title = 'Opna aðaluppdrætti fyrir landnúmer ' + r.landnr;
        b.innerHTML = '<span class="lnr-nm">' + esc(r.label) + '</span>' +
                      '<span class="lnr-l">L ' + esc(r.landnr) + '</span>' +
                      '<span class="lnr-map" title="Opna í Landeignaskrá">🗺</span>';
        b.onclick = ev => {
          // 🗺 fer á landeignaskrá, allt annað á teikningarnar.
          if (ev.target && ev.target.classList.contains('lnr-map')) { landeignaskra(r.landnr); return; }
          teikningar(r.landnr);
        };
        res.appendChild(b);
      });
    }
    box.querySelector('.lnr-go').onclick = run;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    // Lifandi leit eins og á vef HMS — en hóflega hömluð svo hvert innslegið
    // stafabil verði ekki að fyrirspurn.
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 420); });
    if (o.prefill) run();
    return box;
  }

  function mount(target, opts) {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return null;
    const box = el(opts);
    host.appendChild(box);
    return box;
  }
  function open(prefill) {
    const old = document.getElementById('_lnr-float'); if (old) old.remove();
    const box = el({ prefill: prefill, closable: true });
    box.id = '_lnr-float';
    document.body.appendChild(box);
    const i = box.querySelector('.lnr-inp'); if (i) i.focus();
    return box;
  }

  // 2026-08-29 (Agnar): „má taka teikningaleitartakkann út af söluborði."
  // Sjálf-ísetningin á Sölu er farin — hún var sett inn 28.08 („setja þá inn á
  // sölu til að byrja með") og átti alltaf að vera bráðabirgðastaður. TÓLIÐ
  // SJÁLFT stendur óbreytt: Landnr.open() opnar það fljótandi hvar sem er og
  // Landnr.mount(el) setur það inn í hvaða svæði sem er — TurboPaint notar það.
  //
  // Í leiðinni fór setInterval(autoMount, 2000) sem keyrði svo lengi sem síðan
  // var opin, bara til að athuga hvort kassinn væri á sínum stað.
  //
  // Hreinsun: sé kassinn til í DOM-inu (t.d. flipi sem var opinn fyrir uppfærslu)
  // er hann tekinn út, svo hann sitji ekki eftir þar til síðan er endurhlaðin.
  function unmountFromSala() {
    document.querySelectorAll('#view-sala .lnr-box').forEach(b => b.remove());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', unmountFromSala);
  else unmountFromSala();

  window.Landnr = { search, teikningar, landeignaskra, el, mount, open };
  console.log('[patch-325] teikninga-leit tilbúin — Landnr.mount(el) / Landnr.open()');
})();
/* === END TEIKNINGA-LEIT === */
