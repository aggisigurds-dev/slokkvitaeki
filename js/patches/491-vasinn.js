/* === VASINN — APP-SÍÐA (491) — 01.11.2026 ====================================================
 *
 * Agnar: „búa til page í öpp sem heiti Vasinn. Sem maður getur tekið screenshot af einhverju og paste þangað inn
 * auðveldlega, tekið mynd af einhverju, uploadað file, hljóðskilaboð, geta sett skýringu ef maður vill … síðan geti
 * ég beðið þig að kíkja í vasann og lesa úr því."
 *
 * Vasinn er einfalt hólf: hver hlutur er ein röð í `vasinn` (Supabase) og skráin (ef einhver) í fötunni `vasinn`.
 *   • 📋 Líma     — Ctrl+V / „Líma" hvar sem er á síðunni: mynd úr klemmuspjaldi (skjáskot) eða texti
 *   • 📷 Mynd     — myndavél símans (capture=environment) eða mynd úr safni
 *   • 📎 Skrá     — hvaða skrá sem er (PDF, Excel, …), allt að 50 MB
 *   • 🎙 Tala     — MediaRecorder tekur HLJÓÐIÐ upp (minnið), SpeechRecognition skrifar afrit jafnóðum (þægindin,
 *                  má vera ófullkomið — sama tvennd og brunaholf/radd.html)
 *   • ✎ Texti    — bara skýring, engin skrá
 * Skýringin er valfrjáls og má bæta við/breyta eftir á. Claude les vasann með `tools/vasinn.cjs` (skill `vasinn`):
 * sækir ólesna hluti, stimplar lesid_at/svar. Hlutir með ✓ eru lesnir; „Fjarlægja" setur deleted_at (ekkert eytt).
 *
 * Mynstur: 449c-erindi-simi.js (view-<key>, App.switchView-umbúðir, Brunastál). Skrifar aðeins við raunverulegan smell.
 * Skráð í Öpp (261 PAGES: 'vasinn') og fer sjálfkrafa á Þjónustuborðs-appið eins og Erindi.
 * 03.11.2026 (Agnar: „sér page fyrir Vasinn, svo það sjáist á sidebanner og hvað er í honum"): hnappur „Vasinn" í
 * hliðarstikunni (sama gerð og Reglur 449 — button.vnav-btn + svg[data-sb-svg] + span) með .sb-badge sem telur ÓLESNA
 * hluti (lesid_at null). Sætið er þekkt í 68 (á eftir Reglum, fyrir framan Öpp svo hann lendi ekki í „Sjá meira") og
 * hópurinn Kerfi í 391. Teljarinn er HEAD-talning úr vasinn við ræsingu, eftir hverja breytingu og á 5 mín í sýn.
 * ============================================================================================ */
(() => {
  if (window.__vasinn491) return;
  window.__vasinn491 = true;

  const VIEW_ID = 'view-vasinn', NAV_KEY = 'vasinn', ROOT_ID = '_vasi-root', BUCKET = 'vasinn', TAFLA = 'vasinn';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const MAX = 50 * 1024 * 1024;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const p2 = n => String(n).padStart(2, '0');
  const dags = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const kl = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const staerd = n => !n ? '' : n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  const sb = () => (window.DB && DB.sb) || null;
  const nu = () => { try { return (window.Samthykkja && Samthykkja.nu()) || (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const taeki = () => { const ua = navigator.userAgent || ''; return /Android/i.test(ua) ? 'sími (Android)' : /iPhone|iPad/i.test(ua) ? 'sími (iOS)' : 'tölva'; };
  const toast = (m, w) => { try { if (window.Bord368 && Bord368.toast) return Bord368.toast(m, w); } catch (_) {} try { if (window.Toast && Toast.show) return Toast.show(m); } catch (_) {} try { if (window.App && App.toast) return App.toast(m); } catch (_) {} console[w ? 'warn' : 'log']('[491] ' + m); };
  const slodFyrir = p => { try { const r = sb().storage.from(BUCKET).getPublicUrl(p); return r && r.data && r.data.publicUrl || ''; } catch (_) { return ''; } };
  // 03.11.2026 (Agnar: „Það vantar niðurhals hnappa"): ⬇ á hverjum hlut með skrá. download-eigindið eitt dugir ekki milli
  // léna (Storage er annað lén) — Supabase gefur Content-Disposition: attachment með ?download=<nafn>.
  const slodNidur = (p, nafn) => { const u = slodFyrir(p); return u ? u + (u.indexOf('?') < 0 ? '?' : '&') + 'download=' + encodeURIComponent(nafn || p.split('/').pop() || 'vasinn') : ''; };

  const IK_VASI = '<path d="M5 4h14v12a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z"/><path d="M5 8h14"/><path d="M9 13h6"/>';
  let _olesid = -1, _teljari = 0;
  function merki(n) {
    _olesid = n;
    const b = document.querySelector('.vnav-btn[data-view="' + NAV_KEY + '"]'); if (!b) return;
    let m = b.querySelector('.sb-badge');
    if (!m) { m = document.createElement('span'); m.className = 'sb-badge'; b.appendChild(m); }
    const t = n > 0 ? String(n) : '';
    if (m.textContent !== t) m.textContent = t;
    if (m.classList.contains('zero') !== !(n > 0)) m.classList.toggle('zero', !(n > 0));
    const tt = n > 0 ? 'Vasinn — ' + (n === 1 ? '1 ólesinn hlutur' : n + ' ólesnir hlutir') : 'Vasinn — ekkert ólesið';
    if (b.getAttribute('title') !== tt) b.setAttribute('title', tt);
  }
  let _teljaBid = 0;
  async function telja() {
    // Mælt 03.11: við ræsingu er biðlarinn (DB.sb) oft ekki tilbúinn þegar hnappurinn kemur — reynt aftur í allt að 30 s.
    const c = sb(); if (!c) { if (_teljaBid++ < 15) setTimeout(telja, 2000); return; }
    _teljaBid = 0;
    try {
      const { count, error } = await c.from(TAFLA).select('id', { count: 'exact', head: true }).is('deleted_at', null).is('lesid_at', null);
      if (!error && typeof count === 'number') merki(count);
    } catch (_) {}
  }
  function navTakki() {
    if (document.querySelector('.view-nav [data-view="' + NAV_KEY + '"]')) return true;
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav || !nav.querySelector('.vnav-btn[data-view]')) return false;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'vnav-btn'; b.dataset.view = NAV_KEY; b.setAttribute('title', 'Vasinn');
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" data-sb-svg="1" data-sb-key="Vasinn" aria-hidden="true">' + IK_VASI + '</svg><span>Vasinn</span>';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); });
    nav.appendChild(b);   // 68 þekkir „Vasinn" og setur hann á eftir Reglum / fyrir framan Öpp
    if (_olesid >= 0) merki(_olesid); else telja();
    return true;
  }
  function vaktaTeljara() {
    clearInterval(_teljari);
    _teljari = setInterval(() => { if (document.hidden || erVirk()) return; telja(); }, 300000);
  }

  const S = { loaded: false, loading: false, villa: null, rows: [], synaLesid: false, drog: '', bidur: [], sending: false, rec: null, upptaka: false, sek: 0, afrit: '', bidAfrit: '', opin: new Set(), skyr: {}, busy: {}, eyda: null };

  /* ── gögn ─────────────────────────────────────────────────────────────── */
  async function load() {
    const c = sb(); if (!c) { S.villa = 'Biðlarinn er ekki tilbúinn'; render(); return; }
    if (S.loading) return; S.loading = true; render();
    try {
      const { data, error } = await c.from(TAFLA).select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      S.rows = data || []; S.loaded = true; S.villa = null;
      merki(S.rows.filter(r => !r.lesid_at).length);
    } catch (e) { S.villa = (e && e.message) || String(e); }
    S.loading = false; render();
  }
  async function setja(tegund, file, skyring, afrit) {
    const c = sb(); if (!c) throw new Error('Biðlarinn er ekki tilbúinn');
    let storage_path = null, file_name = null, mime = null, size = null;
    if (file) {
      if (file.size > MAX) throw new Error('Skráin er of stór (' + staerd(file.size) + ') — hámark 50 MB');
      const d = new Date(), ext = (file.name && /\.[a-z0-9]{1,6}$/i.test(file.name)) ? file.name.match(/\.[a-z0-9]{1,6}$/i)[0].toLowerCase() : (file.type === 'image/png' ? '.png' : file.type === 'image/jpeg' ? '.jpg' : file.type && file.type.startsWith('audio/') ? '.webm' : '');
      storage_path = d.getFullYear() + '/' + p2(d.getMonth() + 1) + '/' + d.getTime().toString(36) + Math.random().toString(36).slice(2, 7) + ext;
      const r = await c.storage.from(BUCKET).upload(storage_path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (r.error) throw r.error;
      file_name = file.name || (tegund + ext); mime = file.type || null; size = file.size;
    }
    const { data, error } = await c.from(TAFLA).insert({ tegund, skyring: (skyring || '').trim() || null, afrit: (afrit || '').trim() || null, file_name, mime, size, storage_path, hofundur: nu(), taeki: taeki() }).select().single();
    if (error) throw error;
    S.rows.unshift(data); merki(S.rows.filter(r => !r.lesid_at).length); return data;
  }
  async function uppfaera(id, patch) {
    const c = sb(); const { error } = await c.from(TAFLA).update(patch).eq('id', id);
    if (error) throw error;
    const r = S.rows.find(x => x.id === id); if (r) Object.assign(r, patch);
    if (patch && ('deleted_at' in patch || 'lesid_at' in patch)) merki(S.rows.filter(x => !x.lesid_at && !x.deleted_at).length);
  }

  /* ── innsending (sameiginleg fyrir líma / mynd / skrá / hljóð / texta) ──────── */
  async function senda(tegund, file, afrit) {
    if (S.sending) return;
    S.sending = true; render();
    try {
      const r = await setja(tegund, file, S.drog, afrit);
      S.drog = ''; S.afrit = ''; S.bidAfrit = ''; S.bidur = [];
      toast('✓ Í vasann: ' + (r.file_name || r.tegund));
    } catch (e) { toast('Tókst ekki: ' + ((e && e.message) || e), true); }
    S.sending = false; render();
  }
  function skrarInn(files) {
    const l = Array.from(files || []).filter(f => f && f.size > 0);
    if (!l.length) return;
    S.bidur = S.bidur.concat(l.map(f => ({ file: f, url: f.type && f.type.startsWith('image/') ? URL.createObjectURL(f) : '' })));
    render();
  }
  async function sendaBid() {
    if (!S.bidur.length) { if (S.drog.trim()) return senda('texti', null); toast('Ekkert að senda — límdu, taktu mynd eða skrifaðu', true); return; }
    if (S.sending) return;
    S.sending = true; render();
    let n = 0;
    try {
      for (const b of S.bidur.slice()) {
        const teg = b.file.type && b.file.type.startsWith('image/') ? 'mynd' : b.file.type && b.file.type.startsWith('audio/') ? 'hljod' : 'skra';
        await setja(teg, b.file, S.drog, null);
        if (b.url) URL.revokeObjectURL(b.url);
        S.bidur = S.bidur.filter(x => x !== b); n++;
      }
      S.drog = '';
      toast('✓ ' + n + (n === 1 ? ' hlutur' : ' hlutir') + ' í vasann');
    } catch (e) { toast('Tókst ekki: ' + ((e && e.message) || e) + (n ? ' — ' + n + ' komust inn' : ''), true); }
    S.sending = false; render();
  }
  function paste(e) {
    const v = document.getElementById(VIEW_ID); if (!v || !v.classList.contains('active')) return;
    const cd = e.clipboardData; if (!cd) return;
    const files = Array.from(cd.files || []);
    if (files.length) { e.preventDefault(); skrarInn(files.map((f, i) => f.name ? f : new File([f], 'skjaskot-' + Date.now() + (i ? '-' + i : '') + (f.type === 'image/png' ? '.png' : '.jpg'), { type: f.type }))); toast('📋 Límt — bættu við skýringu og ýttu á Setja í vasann'); return; }
    const a = document.activeElement;
    if (a && a.id === '_vasi-ta') return;   // venjulegt líma í textareitinn
    const t = cd.getData('text/plain');
    if (t && t.trim()) { e.preventDefault(); S.drog = (S.drog ? S.drog + '\n' : '') + t.trim(); render(); }
  }
  async function limaUrKlemmu() {
    // Android/Chrome: navigator.clipboard.read() gefur myndina úr skjáskotinu án þess að þurfa Ctrl+V
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) throw new Error('Þetta tæki styður ekki Líma-takkann — notaðu Ctrl+V eða haltu inni í reitnum');
      const items = await navigator.clipboard.read();
      const files = [];
      let texti = '';
      for (const it of items) {
        const img = it.types.find(t => t.startsWith('image/'));
        if (img) { const b = await it.getType(img); files.push(new File([b], 'skjaskot-' + Date.now() + (img === 'image/png' ? '.png' : '.jpg'), { type: img })); continue; }
        if (it.types.includes('text/plain')) { texti += await (await it.getType('text/plain')).text(); }
      }
      if (files.length) { skrarInn(files); toast('📋 Límt — bættu við skýringu og ýttu á Setja í vasann'); }
      else if (texti.trim()) { S.drog = (S.drog ? S.drog + '\n' : '') + texti.trim(); render(); }
      else toast('Ekkert á klemmuspjaldinu', true);
    } catch (e) { toast((e && e.message) || 'Náði ekki í klemmuspjaldið', true); }
  }

  /* ── hljóðupptaka ────────────────────────────────────────────────────────── */
  let _chunks = [], _sr = null, _tikk = 0, _t0 = 0, _straumur = null;
  async function byrjaUpptoku() {
    try {
      _straumur = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { toast('Kemst ekki í hljóðnemann: ' + ((e && e.message) || e), true); return; }
    _chunks = [];
    const mt = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    S.rec = new MediaRecorder(_straumur, mt ? { mimeType: mt } : undefined);
    S.rec.ondataavailable = e => { if (e.data && e.data.size) _chunks.push(e.data); };
    S.rec.start(500);
    S.upptaka = true; S.afrit = ''; S.bidAfrit = ''; S.sek = 0; _t0 = Date.now();
    _tikk = setInterval(() => { S.sek = Math.floor((Date.now() - _t0) / 1000); const k = document.getElementById('_vasi-klukka'); if (k) k.textContent = p2(Math.floor(S.sek / 60)) + ':' + p2(S.sek % 60); }, 500);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      _sr = new SR(); _sr.lang = 'is-IS'; _sr.continuous = true; _sr.interimResults = true;
      _sr.onresult = e => {
        let bid = '';
        for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) S.afrit += r[0].transcript.trim() + ' '; else bid += r[0].transcript; }
        S.bidAfrit = bid;
        const a = document.getElementById('_vasi-afrit'); if (a) a.textContent = (S.afrit + bid).trim() || '…';
      };
      _sr.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('[491] talgreining', e.error); };
      _sr.onend = () => { if (S.rec && S.rec.state === 'recording') { try { _sr.start(); } catch (_) {} } };
      try { _sr.start(); } catch (_) {}
    }
    render();
  }
  function stoppaUpptoku() {
    return new Promise(res => {
      if (_sr) { try { _sr.onend = null; _sr.stop(); } catch (_) {} _sr = null; }
      clearInterval(_tikk); _tikk = 0;
      const rec = S.rec; S.rec = null; S.upptaka = false;
      if (!rec || rec.state === 'inactive') { res(null); return; }
      rec.onstop = () => {
        try { _straumur && _straumur.getTracks().forEach(t => t.stop()); } catch (_) {}
        const mime = rec.mimeType || 'audio/webm';
        const ext = /mp4/.test(mime) ? '.m4a' : /ogg/.test(mime) ? '.ogg' : '.webm';
        res(new File([new Blob(_chunks, { type: mime })], 'hljod-' + Date.now() + ext, { type: mime }));
      };
      rec.stop();
    });
  }
  async function talaSmellur() {
    if (S.upptaka) {
      const f = await stoppaUpptoku();
      if (!f || !f.size) { toast('Engin upptaka', true); render(); return; }
      const afrit = (S.afrit + S.bidAfrit).trim();
      S.bidur.push({ file: f, url: '', afrit });
      render();
      toast('🎙 ' + p2(Math.floor(S.sek / 60)) + ':' + p2(S.sek % 60) + ' — bættu við skýringu og ýttu á Setja í vasann');
    } else byrjaUpptoku();
  }

  /* ── útlit (Brunastál, sama grind og Erindi) ───────────────────────────────── */
  function css() {
    const V = 'html body #' + VIEW_ID;
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);font-family:' + SANS + ';color:#1f2530;padding-bottom:96px}',
      V + '.active{display:block}',
      V + ' .va-haus{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#2b2e35 0%,#191b20 100%);border-bottom:1px solid #000;color:#fff}',
      V + ' .va-haus>div{min-width:0;flex:1 1 auto}' + V + ' .va-haus .tt{font-family:' + DISP + ';font-weight:800;font-size:20px;line-height:1}',
      V + ' .va-haus .st{font-family:' + MONO + ';font-size:10.5px;color:#aab2c0;margin-top:4px;letter-spacing:.04em;line-height:1.4}',
      V + ' .va-haus .uppf{flex:none;width:40px;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font-size:17px;cursor:pointer}',
      V + ' .va-inn{margin:12px;padding:12px;border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.16);box-shadow:0 1px 2px rgba(0,0,0,.08)}',
      V + ' .va-takkar{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}',
      V + ' .va-takkar button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:58px;padding:4px 2px;border-radius:9px;border:1px solid rgba(20,24,34,.25);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 11px ' + SANS + ';cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      V + ' .va-takkar button span{font-size:20px;line-height:1}' + V + ' .va-takkar button._on{background:linear-gradient(180deg,#c4452f,#a8321f);border-color:#6e1c10;color:#fff;animation:_vaPuls 1.2s ease-in-out infinite}',
      '@keyframes _vaPuls{0%,100%{box-shadow:0 0 0 0 rgba(196,69,47,.5)}50%{box-shadow:0 0 0 8px rgba(196,69,47,0)}}',
      V + ' .va-upptaka{margin-top:10px;padding:10px 12px;border-radius:9px;background:#fbeeee;border:1px solid #d9a39a;font-size:13px}' + V + ' .va-upptaka b{font-family:' + MONO + ';font-size:15px;color:#a8321f}' + V + ' .va-upptaka .afrit{margin-top:6px;color:#3a4250;line-height:1.45;min-height:18px}',
      V + ' .va-bid{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' + V + ' .va-bid>div{position:relative;display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:9px;border:1px solid rgba(20,24,34,.2);background:#f4f6f9;font-size:12px;max-width:100%}',
      V + ' .va-bid img{width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid rgba(20,24,34,.2)}' + V + ' .va-bid .nafn{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}' + V + ' .va-bid small{display:block;font-family:' + MONO + ';color:#5b6577}',
      V + ' .va-bid button{width:28px;height:28px;border-radius:7px;border:1px solid rgba(20,24,34,.25);background:#fff;cursor:pointer;font-size:14px}',
      V + ' .va-ta{display:block;width:100%;box-sizing:border-box;margin:10px 0 0;padding:10px 12px;border:1px solid rgba(20,24,34,.3);border-radius:9px;background:#fff;color:#1f2530;font:15px/1.5 ' + SANS + ';min-height:72px;resize:vertical}',
      V + ' .va-senda{display:flex;gap:8px;margin-top:10px}' + V + ' .va-senda button{flex:1;min-height:48px;border-radius:9px;border:1px solid #0b3519;background:linear-gradient(180deg,#2d8a4e,#1f6b3c);color:#fff;font:700 15px ' + SANS + ';cursor:pointer}' + V + ' .va-senda button:disabled{opacity:.45;cursor:not-allowed}',
      V + ' .va-hint{margin-top:8px;font:11px ' + MONO + ';color:#5b6577;line-height:1.5}',
      V + ' .va-hluti{display:flex;align-items:center;gap:8px;margin:14px 12px 6px;font-family:' + MONO + ';font-size:10.5px;letter-spacing:.1em;color:#525b6b;text-transform:uppercase}',
      V + ' .va-hluti b{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;padding:0 6px;border-radius:5px;background:#1f2530;color:#fff;font-size:11px;letter-spacing:0}' + V + ' .va-hluti._ok b{background:#6b7280}',
      V + ' .va-hluti button{margin-left:auto;background:none;border:0;font:600 11px ' + SANS + ';color:#2f6fb3;text-transform:none;letter-spacing:0;cursor:pointer;padding:6px}',
      V + ' .va-hl{margin:0 12px 10px;border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.16);box-shadow:0 1px 2px rgba(0,0,0,.08);overflow:hidden}' + V + ' .va-hl._lesid{opacity:.75}',
      V + ' .va-hl{display:flex;flex-wrap:wrap;align-items:stretch}' + V + ' .va-hl .opna{display:flex;gap:10px;align-items:center;flex:1 1 0;min-width:0;padding:10px 12px;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      V + ' .va-hl .va-dl{flex:none;display:inline-flex;align-items:center;justify-content:center;width:44px;margin:10px 10px 10px 0;border-radius:9px;border:1px solid rgba(20,24,34,.3);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;text-decoration:none;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.14)}' + V + ' .va-hl .va-dl:active{background:#dfe3ea}' + V + ' .va-inni{flex:0 0 100%;width:100%}',
      V + ' .va-hl .tn{flex:none;width:56px;height:56px;border-radius:8px;border:1px solid rgba(20,24,34,.2);background:#f4f6f9;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden}' + V + ' .va-hl .tn img{width:100%;height:100%;object-fit:cover}',
      V + ' .va-hl .mi{min-width:0;flex:1}' + V + ' .va-hl .l1{display:flex;gap:6px;font-family:' + MONO + ';font-size:10.5px;color:#5b6577}' + V + ' .va-hl .l1 time{margin-left:auto;white-space:nowrap}',
      V + ' .va-hl .sk{display:block;font:600 14px/1.35 ' + SANS + ';margin-top:3px;overflow-wrap:anywhere}' + V + ' .va-hl .sk._tomt{font-weight:400;color:#8a93a3;font-style:italic}',
      V + ' .va-m{display:inline-block;font-family:' + MONO + ';font-size:10px;padding:1px 6px;border-radius:3px;border:1px solid rgba(20,24,34,.22);color:#3a4250;background:#f4f6f9;margin-top:4px;margin-right:4px}' + V + ' .va-m._ok{border-color:rgba(47,122,74,.5);color:#2f7a4a}' + V + ' .va-m._ny{border-color:#b8892e;color:#8a6218;background:#f6ebcc}',
      V + ' .va-inni{padding:0 12px 12px;border-top:1px solid rgba(20,24,34,.1)}' + V + ' .va-inni img{display:block;max-width:100%;max-height:70vh;margin-top:10px;border-radius:8px;border:1px solid rgba(20,24,34,.2)}' + V + ' .va-inni audio{display:block;width:100%;margin-top:10px}',
      V + ' .va-kassi{margin-top:10px;padding:10px 12px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:#f7f8fa}' + V + ' .va-kassi>b{display:block;font:700 10.5px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#525b6b;margin-bottom:4px}' + V + ' .va-kassi._svar{background:#eef7f0;border-color:#9fd1b0}' + V + ' .va-texti{white-space:pre-wrap;font-size:13.5px;line-height:1.55;overflow-wrap:anywhere}',
      V + ' .va-inni .va-ta{min-height:56px;font-size:14px}',
      V + ' .va-t2{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;margin-top:10px}' + V + ' .va-t2 button,' + V + ' .va-t2 a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:4px 8px;border-radius:9px;border:1px solid rgba(20,24,34,.3);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 13px ' + SANS + ';cursor:pointer;text-decoration:none}' + V + ' .va-t2 ._raut{background:linear-gradient(180deg,#c4452f,#a8321f);border-color:#6e1c10;color:#fff}' + V + ' .va-t2 button:disabled{opacity:.45}',
      V + ' .va-tomt{margin:30px 20px;text-align:center;font-size:14px;color:#525b6b;line-height:1.6}' + V + ' .va-villa{margin:12px;padding:12px;border-radius:9px;background:#f9e3e0;color:#7a1f14;font-size:13px}',
      '@media (min-width:900px){' + V + ' #' + ROOT_ID + '{max-width:860px;margin:0 auto}}'
    ].join('\n');
  }
  function injectCss() { if (document.getElementById('_vasi-css')) return; const st = document.createElement('style'); st.id = '_vasi-css'; st.textContent = css(); document.head.appendChild(st); }
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    v.innerHTML = '<div id="' + ROOT_ID + '"></div><input type="file" id="_vasi-f-mynd" accept="image/*" capture="environment" multiple hidden><input type="file" id="_vasi-f-safn" accept="image/*" multiple hidden><input type="file" id="_vasi-f-skra" multiple hidden>';
    v.addEventListener('click', smellur);
    v.addEventListener('input', innslattur);
    v.addEventListener('change', e => { const t = e.target; if (t && t.type === 'file') { skrarInn(t.files); t.value = ''; } });
    v.addEventListener('dragover', e => { e.preventDefault(); });
    v.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { skrarInn(e.dataTransfer.files); toast('Bættu við skýringu og ýttu á Setja í vasann'); } });
    document.body.appendChild(v);
    return v;
  }
  const tegTakn = r => r.tegund === 'mynd' ? '🖼' : r.tegund === 'hljod' ? '🎙' : r.tegund === 'texti' ? '✎' : /pdf/i.test(r.mime || '') ? '📄' : '📎';
  function hlutur(r) {
    const op = S.opin.has(r.id), url = r.storage_path ? slodFyrir(r.storage_path) : '', dl = r.storage_path ? slodNidur(r.storage_path, r.file_name) : '';
    const tn = r.tegund === 'mynd' && url ? '<img src="' + esc(url) + '" alt="" loading="lazy">' : tegTakn(r);
    const sk = r.skyring ? '<span class="sk">' + esc(r.skyring) + '</span>' : (r.afrit ? '<span class="sk">' + esc(r.afrit.slice(0, 140)) + '</span>' : '<span class="sk _tomt">engin skýring</span>');
    const merki = (r.lesid_at ? '<span class="va-m _ok">✓ Claude las ' + esc(dags(r.lesid_at)) + '</span>' : '<span class="va-m _ny">ólesið</span>') + (r.file_name ? '<span class="va-m">' + esc(r.file_name) + (r.size ? ' · ' + staerd(r.size) : '') + '</span>' : '') + (r.afrit && r.tegund === 'hljod' ? '<span class="va-m">afrit</span>' : '');
    let inni = '';
    if (op) {
      inni = '<div class="va-inni">';
      if (r.tegund === 'mynd' && url) inni += '<a href="' + esc(url) + '" target="_blank" rel="noopener"><img src="' + esc(url) + '" alt=""></a>';
      else if (r.tegund === 'hljod' && url) inni += '<audio controls preload="none" src="' + esc(url) + '"></audio>';
      if (r.afrit) inni += '<div class="va-kassi"><b>Afrit (sjálfvirk talgreining)</b><div class="va-texti">' + esc(r.afrit) + '</div></div>';
      if (r.svar) inni += '<div class="va-kassi _svar"><b>Claude · ' + esc(dags(r.lesid_at)) + ' ' + esc(kl(r.lesid_at)) + '</b><div class="va-texti">' + esc(r.svar) + '</div></div>';
      inni += '<textarea class="va-ta" data-va-in="skyr" data-v="' + r.id + '" placeholder="Skýring — hvað er þetta, hvað á Claude að gera við það?">' + esc(S.skyr[r.id] != null ? S.skyr[r.id] : (r.skyring || '')) + '</textarea>';
      inni += '<div class="va-t2"><button type="button" data-va="vista" data-v="' + r.id + '"' + (S.busy[r.id] ? ' disabled' : '') + '>💾 Vista</button>' +
        (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">↗ Opna</a>' : '<span></span>') +
        (dl ? '<a href="' + esc(dl) + '" download="' + esc(r.file_name || '') + '">⬇ Sækja</a>' : '') +
        '<button type="button" class="' + (S.eyda === r.id ? '_raut' : '') + '" data-va="eyda" data-v="' + r.id + '"' + (S.busy[r.id] ? ' disabled' : '') + '>' + (S.eyda === r.id ? 'Ýttu aftur' : '✕ Fjarlægja') + '</button></div>';
      inni += '<div class="va-hint">' + esc(r.hofundur || '') + ' · ' + esc(r.taeki || '') + ' · #' + r.id + '</div></div>';
    }
    return '<div class="va-hl' + (r.lesid_at ? ' _lesid' : '') + '" data-k="' + r.id + '"><button type="button" class="opna" data-va="opna" data-v="' + r.id + '" aria-expanded="' + op + '">' +
      '<span class="tn">' + tn + '</span><span class="mi"><span class="l1"><span>' + esc(r.tegund) + '</span><time>' + esc(dags(r.created_at)) + ' ' + esc(kl(r.created_at)) + '</time></span>' + sk + '<span>' + merki + '</span></span></button>' +
      (dl ? '<a class="va-dl" href="' + esc(dl) + '" download="' + esc(r.file_name || '') + '" title="Sækja ' + esc(r.file_name || 'skrána') + '" aria-label="Sækja"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg></a>' : '') + inni + '</div>';
  }
  function html() {
    const olesid = S.rows.filter(r => !r.lesid_at), lesid = S.rows.filter(r => r.lesid_at);
    let st = S.loaded ? (olesid.length + ' ólesið · ' + lesid.length + ' lesið') : (S.villa ? '⚠️ ' + S.villa : 'sæki…');
    let h = '<div class="va-haus"><div><div class="tt">👝 Vasinn</div><div class="st">' + esc(st) + '</div></div><button type="button" class="uppf" data-va="uppf" title="Sækja aftur">↻</button></div>';
    h += '<div class="va-inn">' +
      '<div class="va-takkar">' +
        '<button type="button" data-va="lima"><span>📋</span>Líma</button>' +
        '<button type="button" data-va="mynd"><span>📷</span>Mynd</button>' +
        '<button type="button" data-va="safn"><span>🖼</span>Safn</button>' +
        '<button type="button" data-va="skra"><span>📎</span>Skrá</button>' +
        '<button type="button" data-va="tala" class="' + (S.upptaka ? '_on' : '') + '"><span>' + (S.upptaka ? '⏹' : '🎙') + '</span>' + (S.upptaka ? 'Stopp' : 'Tala') + '</button>' +
      '</div>';
    if (S.upptaka) h += '<div class="va-upptaka">● Tek upp <b id="_vasi-klukka">' + p2(Math.floor(S.sek / 60)) + ':' + p2(S.sek % 60) + '</b> — ýttu á Stopp þegar þú ert búinn<div class="afrit" id="_vasi-afrit">' + esc((S.afrit + S.bidAfrit).trim() || '…') + '</div></div>';
    if (S.bidur.length) h += '<div class="va-bid">' + S.bidur.map((b, i) => '<div>' + (b.url ? '<img src="' + esc(b.url) + '" alt="">' : '<span style="font-size:22px">' + (b.file.type.startsWith('audio/') ? '🎙' : '📎') + '</span>') + '<div><span class="nafn">' + esc(b.file.name) + '</span><small>' + staerd(b.file.size) + (b.afrit ? ' · afrit' : '') + '</small></div><button type="button" data-va="bid-ut" data-v="' + i + '" title="Taka úr">✕</button></div>').join('') + '</div>';
    h += '<textarea class="va-ta" id="_vasi-ta" data-va-in="drog" placeholder="Skýring (valfrjáls) — t.d. „reikningur frá Byko, setja í kostnað“ · Ctrl+V límir skjáskot beint hér">' + esc(S.drog) + '</textarea>';
    h += '<div class="va-senda"><button type="button" data-va="senda"' + (S.sending || S.upptaka || (!S.bidur.length && !S.drog.trim()) ? ' disabled' : '') + '>' + (S.sending ? 'Sendi…' : '👝 Setja í vasann') + '</button></div>';
    h += '<div class="va-hint">Líma = skjáskot úr klemmuspjaldi · Mynd = myndavélin · Safn = mynd úr safni · Skrá = hvað sem er (≤ 50 MB) · Tala = hljóðskilaboð með sjálfvirku afriti. Biddu svo Claude: „kíktu í vasann".</div></div>';
    if (S.villa) h += '<div class="va-villa">' + esc(S.villa) + '</div>';
    if (S.loaded) {
      h += '<div class="va-hluti"><b>' + olesid.length + '</b> Í vasanum · ólesið</div>';
      h += olesid.length ? olesid.map(hlutur).join('') : '<div class="va-tomt">Vasinn er tómur. Límdu skjáskot, taktu mynd eða talaðu.</div>';
      if (lesid.length) {
        h += '<div class="va-hluti _ok"><b>' + lesid.length + '</b> Claude hefur lesið <button type="button" data-va="syna-lesid">' + (S.synaLesid ? 'fela' : 'sýna') + '</button></div>';
        if (S.synaLesid) h += lesid.map(hlutur).join('');
      }
    } else if (!S.villa) h += '<div class="va-tomt">Sæki vasann…</div>';
    return h;
  }
  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    const root = document.getElementById(ROOT_ID); if (!root) return;
    const nytt = html();
    if (root._h === nytt) return;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(root) : null;
    root.innerHTML = nytt; root._h = nytt;
    if (aftur) aftur();
  }

  /* ── smellir og innsláttur ───────────────────────────────────────────────── */
  function innslattur(e) {
    const t = e.target; if (!t || !t.getAttribute) return;
    const k = t.getAttribute('data-va-in'); if (!k) return;
    if (k === 'drog') { S.drog = t.value; const b = document.querySelector('#' + VIEW_ID + ' [data-va="senda"]'); if (b) b.disabled = S.sending || S.upptaka || (!S.bidur.length && !S.drog.trim()); }
    else if (k === 'skyr') S.skyr[+t.getAttribute('data-v')] = t.value;
  }
  async function smellur(e) {
    const el = e.target && e.target.closest && e.target.closest('[data-va]'); if (!el) return;
    const a = el.getAttribute('data-va'), v = el.getAttribute('data-v'), id = +v;
    if (a === 'uppf') return load();
    if (a === 'lima') return limaUrKlemmu();
    if (a === 'mynd') return document.getElementById('_vasi-f-mynd').click();
    if (a === 'safn') return document.getElementById('_vasi-f-safn').click();
    if (a === 'skra') return document.getElementById('_vasi-f-skra').click();
    if (a === 'tala') return talaSmellur();
    if (a === 'senda') {
      // hljóð í biðröð ber afritið með sér
      if (S.bidur.length === 1 && S.bidur[0].afrit && !S.sending) { const b = S.bidur[0]; S.sending = true; render(); try { await setja('hljod', b.file, S.drog, b.afrit); S.bidur = []; S.drog = ''; toast('✓ Hljóðskilaboð í vasann'); } catch (err) { toast('Tókst ekki: ' + ((err && err.message) || err), true); } S.sending = false; render(); return; }
      return sendaBid();
    }
    if (a === 'bid-ut') { const b = S.bidur[id]; if (b && b.url) URL.revokeObjectURL(b.url); S.bidur.splice(id, 1); render(); return; }
    if (a === 'syna-lesid') { S.synaLesid = !S.synaLesid; render(); return; }
    if (a === 'opna') { if (S.opin.has(id)) S.opin.delete(id); else S.opin.add(id); S.eyda = null; render(); return; }
    if (a === 'vista') {
      S.busy[id] = true; render();
      try { await uppfaera(id, { skyring: (S.skyr[id] || '').trim() || null }); delete S.skyr[id]; toast('✓ Vistað'); } catch (err) { toast('Tókst ekki: ' + ((err && err.message) || err), true); }
      delete S.busy[id]; render(); return;
    }
    if (a === 'eyda') {
      if (S.eyda !== id) { S.eyda = id; render(); return; }
      S.busy[id] = true; render();
      try { await uppfaera(id, { deleted_at: new Date().toISOString() }); S.rows = S.rows.filter(r => r.id !== id); S.opin.delete(id); toast('Fjarlægt úr vasanum'); } catch (err) { toast('Tókst ekki: ' + ((err && err.message) || err), true); }
      S.eyda = null; delete S.busy[id]; render(); return;
    }
  }

  /* ── sýn / leiðsögn (sama og 449c) ──────────────────────────────────────── */
  let _poll = 0;
  function open() {
    injectCss(); ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block'; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    if (!S.loaded && !S.loading) load();
    clearInterval(_poll);
    _poll = setInterval(() => { if (!erVirk() || document.hidden || erAdSkrifa() || S.upptaka || S.bidur.length) return; if (!S.loading) load(); }, 120000);
    if (!window.__vasinnPaste) { window.__vasinnPaste = true; document.addEventListener('paste', paste); }
  }
  const erVirk = () => { const vv = document.getElementById(VIEW_ID); return !!(vv && vv.classList.contains('active')); };
  const erAdSkrifa = () => { const a = document.activeElement, vv = document.getElementById(VIEW_ID); return !!(a && vv && vv.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName)); };
  function hide() { try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {} clearInterval(_poll); _poll = 0; }
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._vasinnPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      hide();
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._vasinnPatched = true;
  }
  function boot() {
    patchSwitchView();
    (function nt(n) { if (navTakki()) return; if (n < 40) setTimeout(() => nt(n + 1), 300); })(0);
    vaktaTeljara();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.Vasinn = { open, render, load, S, setja, telja, version: '491c' };
  console.log('[491] Vasinn — app-síða');
})();
