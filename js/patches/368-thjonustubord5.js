/* === ÞJÓNUSTUBORÐ 5 — Master borð, mitt borð, hamir og einingar (368) =======================
 *
 * Agnar 10.09.2026: „þjónustuborðið er ekki alveg að virka núna, og margt þar sem þarf ekki að vera
 * … væri gott að hafa það smá skipt svo sé ekki jafn yfirþyrmandi, að hver starfsmaður geti haft sitt
 * ennþá og síðan Master borð, að við getum pickað af því smá saman og haft bara fá atriði á okkar
 * borði" · „jafnvel skipta um mode … skýrslumode … kröfumode … akstursskipulags mode … samskiptamode"
 * · Boss-útlitið. Tillagan (artifact „Þjónustuborð Boss v5") samþykkt: „Já flott".
 *
 * FALIN SLÓÐ #bord — ekki í valmynd fyrr en Agnar hefur prófað. Gamla borðið (231) er ÓBREYTT.
 *
 * GÖGN — engin ný tafla, ekkert í localStorage nema það sem 350 geymir þegar (hver situr við vélina):
 *   thjonustubeidni (sama og 231). Master = opið, ekki í geymslu, enginn starfsmaður.
 *     Mitt borð = assigned_to = sá sem er við tölvuna (BordStarfsmadur, 350).
 *     Taka / Skila / Lokið skrifa beint og lesa til baka. Taka tekst AÐEINS ef málið er enn laust
 *     (skilyrt uppfærsla) — tveir sem smella samtímis fá ekki sama málið.
 *   Vinnuborð hvers og eins: AppSettings thjonustubord5.by_staff.<nafn> = { mode, mods }.
 *   Dagskrá (303) og Skipulagsborð (305): sömu AppSettings-lyklar, lesið hér. Skráning fer í 303-gluggann.
 *   Vinnublöð: sara_yfirferd (364). Kröfur: solur reikningur ógreitt (sama og teljarinn í 166).
 *   Póstur í völdu máli: v_samskipti_postur; svarið fer um ReikningaPostur.replyTo (240) í sama þræði.
 * ============================================================================================== */
(() => {
  if (window.__thjonustubord368) return;
  window.__thjonustubord368 = true;

  const VIEW_ID = 'view-bord', NAV_KEY = 'bord', LIMIT = 5, CFG_KEY = 'thjonustubord5';
  const sb = () => (window.DB && DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const DAG = ['SUN', 'MÁN', 'ÞRI', 'MIÐ', 'FIM', 'FÖS', 'LAU'];
  const TEG = ['Árskoðun', 'Brunakerfiskoðun', 'Fund', 'Uppsetning', 'Annað'];
  const tegKlasi = t => { const s = String(t == null ? '' : t); const i = /^\d+$/.test(s) ? +s : TEG.indexOf(s); return ['t-ars', 't-bruni', 't-fund', 't-upps', 't-annad'][i >= 0 ? i : 4]; };
  const tegNafn = t => { const s = String(t == null ? '' : t); return /^\d+$/.test(s) ? (TEG[+s] || 'Annað') : (s || 'Annað'); };

  const MODS = {
    dagskra:   { n: '01', t: 'Dagskrá', d: 'Vikan í einni línu efst. Smellur á dag opnar verkin.' },
    skipulag:  { n: '05', t: 'Skipulagsborð', d: 'Punktar og spjöld sem þú dregur á dagskrá.' },
    vinnublod: { n: '06', t: 'Vinnublöð', d: 'Skýrslulisti Söru: bíða yfirferðar og samþykkt.' },
    postsvor:  { n: '07', t: 'Póstsvörun', d: 'Póstar sem bíða svars.' },
    akstur:    { n: '08', t: 'Akstursskipulag', d: 'Aksturslisti og vakt.' },
    krofur:    { n: '09', t: 'Kröfur', d: 'Ógreiddir reikningar í Kröfu yfirliti.' }
  };
  const BOTTOM = ['skipulag', 'vinnublod', 'postsvor', 'akstur', 'krofur'];
  const MODES = {
    thjonusta: { l: 'Þjónusta', board: true, first: [], filter: 'allt' },
    samskipti: { l: 'Samskipti', board: true, first: ['postsvor'], filter: 'post' },
    skyrslur:  { l: 'Skýrslur', board: false, first: ['vinnublod', 'skipulag'] },
    krofur:    { l: 'Kröfur', board: false, first: ['krofur'] },
    akstur:    { l: 'Akstur', board: false, first: ['akstur', 'dagskra'] }
  };
  /* [kveikt, sjálfgefið opið] — flest samanbrotið. Forstillt eftir starfsmanni; hver og einn breytir í ⚙. */
  const SJALFGEFID = { dagskra: [1, 0], skipulag: [0, 0], vinnublod: [0, 0], postsvor: [0, 0], akstur: [0, 0], krofur: [0, 0] };
  const FYRIR = {
    'Agnar': { skipulag: [1, 1], vinnublod: [1, 0], krofur: [1, 0] },
    'Charlize': { vinnublod: [1, 1], postsvor: [1, 1], krofur: [1, 0] },
    'Bjarndís': { postsvor: [1, 0] },
    'Afgreiðsla': { dagskra: [1, 1], akstur: [1, 0] }
  };

  const S = {
    rows: [], names: {}, loaded: false, loading: false, err: '',
    view: 'master', filter: 'allt', sel: {}, cfgOpen: false, open: {}, post: {},
    counts: { sara: null, krofur: null }, composer: false, busy: {}
  };

  /* ── starfsmaður ── */
  const nu = () => { try { return (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const staffList = () => { try { const l = BordStarfsmadur.list(); if (Array.isArray(l) && l.length) return l; } catch (_) {} return ['Agnar', 'Afgreiðsla', 'Charlize', 'Bjarndís']; };
  const normW = v => { const s = String(v == null ? '' : v).trim(); return /^(allir|—|-|nema_ai|ekkert)?$/i.test(s) ? '' : s; };
  const sameW = (a, b) => normW(a).toLocaleLowerCase('is') === normW(b).toLocaleLowerCase('is') && normW(a) !== '';

  /* ── vinnuborð hvers og eins (samstillt) ── */
  const _cfg = {};
  function readCfg(n) {
    let v = null;
    try { v = window.AppSettings && AppSettings.path ? AppSettings.path(CFG_KEY + '.by_staff.' + n) : null; } catch (_) {}
    const base = Object.assign({}, SJALFGEFID, FYRIR[n] || {});
    const mods = {};
    Object.keys(SJALFGEFID).forEach(k => {
      const x = v && v.mods && Array.isArray(v.mods[k]) ? v.mods[k] : base[k];
      mods[k] = [x[0] ? 1 : 0, x[1] ? 1 : 0];
    });
    return { mode: v && MODES[v.mode] ? v.mode : 'thjonusta', mods };
  }
  const cfg = () => { const n = nu(); return _cfg[n] || (_cfg[n] = readCfg(n)); };
  let _saveT = 0;
  function saveCfgSoon(msg) {
    clearTimeout(_saveT);
    _saveT = setTimeout(async () => {
      const n = nu(), c = cfg();
      let ok = false;
      try { ok = !!(window.AppSettings && AppSettings.save && await AppSettings.save({ [CFG_KEY]: { by_staff: { [n]: { mode: c.mode, mods: c.mods } } } })); } catch (_) {}
      if (!ok) toast('Stillingin vistaðist ekki. Reyndu aftur eftir smástund.', true);
      else if (msg) toast(msg);
    }, 600);
  }
  const isOn = k => !!cfg().mods[k][0];
  const inMode = k => MODES[cfg().mode].first.indexOf(k) >= 0;
  const openKey = k => nu() + ':' + (inMode(k) ? cfg().mode + ':' : '') + k;
  function isOpen(k) {
    const key = openKey(k);
    if (!(key in S.open)) S.open[key] = inMode(k) ? true : !!cfg().mods[k][1];
    return S.open[key];
  }

  /* ── gögn ── */
  const SEL = 'id,title,notes,summary,status,type,flokkur,important,due_at,created_at,updated_at,source,channel_ref,assigned_to,customer_base_id,fyrirtaeki_id,customer_nafn,svarad_at';
  async function load(quiet) {
    const c = sb();
    if (!c || S.loading) return;
    S.loading = true;
    if (!quiet) render();
    try {
      const [r, rs, rk] = await Promise.all([
        c.from('thjonustubeidni').select(SEL).is('deleted_at', null).is('archived_at', null)
          .or('status.is.null,status.neq.lokad').order('created_at', { ascending: false }).limit(600),
        c.from('sara_yfirferd').select('stada'),
        c.from('solur').select('id', { count: 'exact', head: true }).eq('greitt_med', 'reikningur').is('paid_at', null)
      ]);
      if (r.error) throw r.error;
      S.rows = r.data || [];
      S.counts.sara = rs.error ? null : (rs.data || []).reduce((m, x) => { m[x.stada] = (m[x.stada] || 0) + 1; return m; }, {});
      S.counts.krofur = rk.error ? null : rk.count;
      const ids = [...new Set(S.rows.map(x => x.customer_base_id).filter(Boolean))].filter(id => !(id in S.names));
      for (let i = 0; i < ids.length; i += 150) {
        const rb = await c.from('customers_base').select('id,nafn').in('id', ids.slice(i, i + 150));
        (rb.data || []).forEach(b => { S.names[b.id] = b.nafn; });
      }
      S.err = '';
      S.loaded = true;
    } catch (e) {
      S.err = (e && e.message) || String(e);
      console.warn('[368-thjonustubord5] load', e);
    }
    S.loading = false;
    render();
  }

  const isPost = r => r.source === 'email' || /^email:/.test(String(r.channel_ref || ''));
  const prio = (a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) ||
    String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
  const masterRows = () => S.rows.filter(r => !normW(r.assigned_to)).sort(prio);
  const mineRows = () => S.rows.filter(r => sameW(r.assigned_to, nu())).sort(prio);
  const ageDays = r => { const t = Date.parse(r.created_at); return isNaN(t) ? 0 : Math.max(0, Math.floor((Date.now() - t) / 864e5)); };
  const ageCls = a => (a >= 14 ? 'hot' : a <= 2 ? 'warm' : '');
  const whereOf = r => S.names[r.customer_base_id] || r.customer_nafn || '';
  function aiLine(r) {
    const s = String(r.summary || '').trim();
    if (s) return s.slice(0, 200);
    const n = String(r.notes || '').split('\n').map(x => x.trim()).find(Boolean) || '';
    return n.slice(0, 200);
  }
  const matchFilter = (r, f) => f === 'allt' || (f === 'hot' ? !!r.important : f === 'post' ? isPost(r) : !isPost(r));

  /* ── skrif (lesið til baka með .select) ── */
  async function patchRow(id, patch, onlyIfFree) {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    let q = c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id);
    if (onlyIfFree) q = q.or('assigned_to.is.null,assigned_to.eq.');
    const r = await q.select('id');
    if (r.error) throw r.error;
    return (r.data || []).length;
  }
  async function act(id, fn) {
    if (S.busy[id]) return;
    S.busy[id] = 1;
    try { await fn(); } catch (e) { toast('Vistaðist ekki: ' + ((e && e.message) || e), true); }
    delete S.busy[id];
    await load(true);
  }
  function take(id) {
    if (mineRows().length >= LIMIT) { toast('Borðið þitt er fullt. Kláraðu eða skilaðu máli fyrst.', true); S.view = 'mitt'; render(); return; }
    return act(id, async () => {
      const n = await patchRow(id, { assigned_to: nu() }, true);
      if (!n) { toast('Einhver annar tók þetta mál rétt í þessu.', true); return; }
      S.sel[nu()] = id;
      S.view = 'mitt';
      toast('Komið á borðið þitt');
    });
  }
  const giveBack = id => act(id, async () => { await patchRow(id, { assigned_to: null }); toast('Skilað á Master'); });
  const done = id => act(id, async () => { await patchRow(id, { status: 'lokad' }); toast('Merkt lokið'); });
  async function createCase(title, cust) {
    const c = sb();
    if (!c) { toast('Engin tenging við gagnagrunn', true); return false; }
    const r = await c.from('thjonustubeidni').insert({ title, customer_nafn: cust || null, source: 'beint', status: 'nytt', type: 'annad', created_by: nu(), assigned_to: null }).select('id').single();
    if (r.error) { toast('Málið vistaðist ekki: ' + r.error.message, true); return false; }
    toast('Komið á Master borð');
    await load(true);
    return true;
  }

  async function loadPost(r) {
    const m = /^email:(\d+)/.exec(String(r.channel_ref || ''));
    if (!m) return;
    const id = +m[1];
    if (id in S.post) return;
    S.post[id] = null;
    try {
      const res = await sb().from('v_samskipti_postur').select('id,message_id,sender_name,sender_email,subject,body_preview,snippet,received_at').eq('id', id).maybeSingle();
      S.post[id] = res.data || false;
    } catch (_) { S.post[id] = false; }
    render();
  }
  const postOf = r => { const m = /^email:(\d+)/.exec(String(r.channel_ref || '')); return m ? S.post[+m[1]] : undefined; };

  /* ── einingar úr öðrum hlutum kerfisins (lesið) ── */
  function jobsFor(n) {
    let j = null;
    try { j = AppSettings.path('vikudagskra.by_staff.' + n + '.jobs'); } catch (_) {}
    if (!Array.isArray(j) && n === 'Agnar') { try { j = AppSettings.path('vikudagskra.jobs'); } catch (_) {} }
    return Array.isArray(j) ? j.filter(Boolean) : [];
  }
  function cardsFor(n) {
    let v = null;
    try { v = AppSettings.path('skipulagsbord.by_staff.' + n); } catch (_) {}
    return v && Array.isArray(v.cards) ? v.cards.filter(Boolean) : [];
  }
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function week() {
    const jobs = jobsFor(nu()), out = [], d0 = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i), key = ymd(d);
      out.push({ key, d: DAG[d.getDay()], n: d.getDate(), today: i === 0,
        jobs: jobs.filter(j => String(j.date || '').slice(0, 10) === key).sort((a, b) => String(a.time || '').localeCompare(String(b.time || ''))) });
    }
    return out;
  }
  function goView(v, anchor) {
    try { if (window.App && App.switchView) App.switchView(v); } catch (_) {}
    if (anchor) setTimeout(() => { const el = document.getElementById(anchor); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 700);
  }

  /* ── útlit ── */
  function css() {
    if (document.getElementById('t5-css')) return;
    if (!document.getElementById('t5-fonts')) {
      const l = document.createElement('link');
      l.id = 't5-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Mono:wght@500;600&display=swap';
      document.head.appendChild(l);
    }
    const V = '#view-bord ';
    const st = document.createElement('style');
    st.id = 't5-css';
    st.textContent = [
      '#view-bord{--ink:#161513;--ink2:#4a463f;--mute:#6f685c;--faint:#8f8776;--on:#f4f1ea;--on2:#c8c1b1;--on3:#8f8776;--rule:#d9d3c6;--rule2:#e6e1d6;--rule3:#cfc8b9;--edge:#c9c2b3;--edge2:#a89f8c;--terra:#b5522a;--green:#2f7a4a;--gink:#8a6a1c;--g5:#c9a54a;--g6:#b8892e;--g8:#8f6a1c;',
      '--gline:linear-gradient(90deg,#7a5a12 0%,#c9a54a 18%,#f5d76e 38%,#fff3b0 47%,#f5d76e 56%,#c9a54a 78%,#7a5a12 100%);',
      '--gface:linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.55) 45%,rgba(255,255,255,0) 52%),repeating-linear-gradient(180deg,rgba(255,255,255,.08) 0 1px,rgba(0,0,0,0) 1px 3px),linear-gradient(180deg,#f3dc95 0%,#d9b25a 14%,#b8892e 46%,#8f6a1c 52%,#a87b1f 74%,#cfa54a 92%,#e8cb7a 100%);',
      '--gside:linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.4) 46%,rgba(255,255,255,0) 54%),repeating-linear-gradient(180deg,rgba(255,255,255,.07) 0 1px,rgba(0,0,0,0) 1px 3px),linear-gradient(180deg,#e8cb7a 0%,#c9a54a 45%,#9c7422 55%,#b8892e 100%);',
      '--gcoin:repeating-conic-gradient(from 0deg,rgba(255,255,255,.09) 0 1.5deg,rgba(0,0,0,0) 1.5deg 4deg),radial-gradient(circle at 32% 28%,#fff3d0 0%,#e8cb7a 16%,#b8892e 46%,#7a5a12 76%,#3e2c06 100%);',
      '--panel:linear-gradient(180deg,#fff 0%,#fbf9f5 100%);--panelsh:inset 0 1px 0 #fff,inset 0 0 0 1px rgba(255,255,255,.6),inset 0 -1px 0 rgba(22,21,19,.06),0 1px 2px rgba(22,21,19,.1),0 6px 10px -6px rgba(22,21,19,.18),0 18px 36px -18px rgba(22,21,19,.4);',
      '--strip:linear-gradient(180deg,#faf8f4,#f1ede4);--stripsh:inset 0 1px 0 #fff,inset 0 -1px 0 rgba(255,255,255,.7);',
      '--key:linear-gradient(180deg,#fff,#f1ede4);--keysh:inset 0 1px 0 #fff,0 1px 2px rgba(22,21,19,.18),0 2px 0 rgba(22,21,19,.06);',
      '--well:linear-gradient(180deg,#f1ede4,#fff 55%);--wellsh:inset 0 2px 4px rgba(22,21,19,.12),inset 0 0 0 1px rgba(255,255,255,.8),0 1px 0 #fff;',
      '--slab:linear-gradient(160deg,#26241f 0%,#151412 40%,#0c0c0b 100%);--slabsh:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px rgba(226,196,111,.12),inset 0 -1px 0 rgba(0,0,0,.9),0 2px 0 #000,0 20px 40px -14px rgba(0,0,0,.85);',
      '--dwell:linear-gradient(180deg,#050505,#121110 60%,#0a0a09);--dwellsh:inset 0 3px 8px rgba(0,0,0,.95),inset 0 -1px 0 rgba(255,255,255,.05),0 1px 0 rgba(255,255,255,.08),0 0 0 1px #2a2823;',
      "--disp:'Playfair Display',Georgia,'Times New Roman',serif;--mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;--body:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
      V + '.t5{container:t5 / inline-size;color:var(--ink);font-family:var(--body);font-size:13px;line-height:1.45;background:radial-gradient(ellipse at 50% 0%,#faf8f3 0%,#f4f1ea 55%,#ece7dc 100%);padding:20px 22px 40px;min-height:70vh}',
      V + '.t5 *{box-sizing:border-box}',
      V + '.t5 :focus-visible{outline:2px solid var(--g6);outline-offset:2px}',
      V + '.grow{flex:1}',
      V + '.col{display:flex;flex-direction:column;gap:16px;min-width:0}',
      V + '.kicker{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:700;letter-spacing:.2em;color:var(--g8);text-transform:uppercase}',
      V + '.kicker::before{content:"";width:28px;height:2px;background:var(--gline);box-shadow:0 1px 0 #fff}',
      V + '.h1{font-family:var(--disp);font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1;margin:6px 0 0;color:var(--ink);text-shadow:0 1px 0 #fff,0 2px 2px rgba(22,21,19,.18)}',
      V + '.lbl{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      V + '.head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 18px;flex-wrap:wrap}',
      V + '.meta{margin:8px 0 0;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}',
      V + '.beta{display:inline-flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:var(--ink2)}',
      V + '.beta b{font-family:var(--mono);font-size:10px;letter-spacing:.14em;padding:2px 6px;border:1px solid var(--edge);border-radius:2px;background:var(--well)}',
      V + '.acts{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap}',
      V + '.who{display:flex;flex-direction:column;gap:5px}',
      V + '.who select{height:36px;min-width:150px;padding:0 11px;border:1px solid var(--edge);border-radius:4px;background:var(--well);box-shadow:var(--wellsh);font:600 13px var(--body);color:var(--ink)}',
      V + '.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:4px;font:600 12.5px var(--body);cursor:pointer;white-space:nowrap;transition:filter 120ms}',
      V + '.btn:hover{filter:brightness(1.04)}' + V + '.btn:active{filter:brightness(.96)}',
      V + '.btn.sm{height:30px;padding:0 11px;font-size:12px}' + V + '.btn.lg{height:42px;padding:0 18px;font-size:13.5px}',
      V + '.btn.iv{border:1px solid var(--edge);border-bottom-color:var(--edge2);background:var(--key);color:var(--ink);box-shadow:var(--keysh)}',
      V + '.btn.gold{border:1px solid #5a4410;border-top-color:#f7e6b8;border-bottom-color:#2e2004;border-radius:5px;background:var(--gface);color:var(--ink);font-weight:800;text-shadow:0 1px 0 rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 3px rgba(60,40,0,.45),0 3px 6px rgba(22,21,19,.45),0 0 12px rgba(184,137,46,.35)}',
      V + '.btn[disabled]{cursor:progress;filter:grayscale(.3) brightness(.95)}',
      V + '.seg{display:inline-flex;border:1px solid var(--edge2);border-radius:5px;overflow:hidden;box-shadow:var(--keysh);background:var(--key)}',
      V + '.seg button{height:30px;padding:0 12px;border:0;border-left:1px solid var(--edge);background:transparent;font:600 12px var(--body);color:var(--ink);cursor:pointer;white-space:nowrap}',
      V + '.seg button:first-child{border-left:0}',
      V + '.seg button[aria-pressed="true"]{background:var(--gside);font-weight:800;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(0,0,0,.25)}',
      V + '.seg.modeseg button{height:36px;padding:0 16px;font-size:13px}',
      V + '.seg.sm button{height:26px;padding:0 9px;font-size:11.5px}',
      V + '.seg .c{font-family:var(--mono);font-size:10.5px;margin-left:5px}',
      V + '.modes{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      V + '.panel{background:var(--panel);border:1px solid var(--rule3);border-radius:5px;box-shadow:var(--panelsh);min-width:0}',
      V + '.phead{display:flex;align-items:center;flex-wrap:wrap;gap:10px 12px;padding:11px 16px;background:var(--strip);box-shadow:var(--stripsh);border-bottom:1px solid transparent;border-image:var(--gline) 1;border-image-width:0 0 1px 0;border-radius:5px 5px 0 0}',
      V + '.mod:not(.open) .phead{border-image-width:0;border-radius:5px}',
      V + '.ptitle{font-family:var(--disp);font-size:20px;font-weight:700;letter-spacing:-.01em;margin:0;line-height:1.1;text-shadow:0 1px 0 #fff}',
      V + '.plate{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.14em;padding:2px 7px;border:1px solid #7a5a12;border-radius:2px;color:#3e2c06;text-shadow:0 1px 0 rgba(255,255,255,.45);background:linear-gradient(115deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.6) 48%,rgba(255,255,255,0) 56%),linear-gradient(180deg,#f0d78a,#c9a54a 60%,#a87b1f);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -1px 0 rgba(60,40,0,.4)}',
      V + '.plate.dark{color:#e2c46f;background:linear-gradient(180deg,#2a2823,#161513);border-color:rgba(201,165,74,.5);text-shadow:none}',
      V + '.sum{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);min-width:0}',
      V + '.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}',
      V + '.kpi{position:relative;padding:14px 16px 13px;background:linear-gradient(180deg,#fff 0%,#fbf9f5 70%,#f1ede4 100%);border:1px solid var(--rule);border-top:3px solid transparent;border-image:var(--gline) 1;border-image-width:3px 0 0 0;border-radius:4px;box-shadow:var(--panelsh)}',
      V + '.kpi.dark{background:var(--slab);border-color:#000;color:var(--on);box-shadow:var(--slabsh)}',
      V + '.kpi.dark .lbl{color:var(--on3)}',
      V + '.kv{font-family:var(--disp);font-size:34px;font-weight:800;letter-spacing:-.02em;line-height:1;margin-top:8px;font-variant-numeric:lining-nums tabular-nums}',
      V + '.kv small{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--mute);margin-left:3px}',
      V + '.km{font-size:11.5px;color:var(--mute);margin-top:6px}' + V + '.kpi.dark .km{color:var(--on2)}',
      V + '.board{display:grid;grid-template-columns:minmax(0,1.32fr) minmax(0,1fr);gap:18px;align-items:start}',
      V + '.phone-seg{display:none}',
      V + '.psub{padding:9px 16px;font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);border-bottom:1px solid var(--rule2)}',
      V + '.age{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums}',
      V + '.age.warm{color:var(--gink)}' + V + '.age.hot{color:var(--terra)}',
      V + '.kick{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);overflow-wrap:anywhere}',
      V + '.frow{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:12px;align-items:start;padding:13px 16px;border-top:1px solid var(--rule2)}',
      V + '.frow:first-child{border-top:0}',
      V + '.rt{font-family:var(--disp);font-size:17px;font-weight:700;line-height:1.25;margin:4px 0 3px;overflow-wrap:anywhere}',
      V + '.ai{margin:0;max-width:62ch;font-size:12.5px;line-height:1.5;color:var(--ink2)}',
      V + '.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
      V + '.tag{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:3px 6px;border-radius:2px;border:1px solid var(--edge);color:var(--ink2);background:var(--well)}',
      V + '.tag.hot{border-color:rgba(181,82,42,.55);color:var(--terra)}' + V + '.tag.ok{border-color:rgba(47,122,74,.5);color:var(--green)}',
      V + '.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 16px;text-align:center;color:var(--mute);font-size:12.5px}',
      V + '.coin{width:40px;height:40px;border-radius:50%;background:var(--gcoin);opacity:.22;box-shadow:inset 0 2px 1px rgba(255,255,255,.7),inset 0 -3px 5px rgba(0,0,0,.45)}',
      V + '.slots{display:inline-flex;align-items:center;gap:4px}',
      V + '.slot{width:11px;height:11px;border-radius:2px;border:1px solid var(--edge2);background:var(--well);box-shadow:var(--wellsh)}',
      V + '.slot.on{background:linear-gradient(180deg,#3a3732,#161513);border-color:#000}',
      V + '.slotn{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--ink2);margin-left:4px}' + V + '.slotn.over{color:var(--terra)}',
      V + '.mrow{display:grid;grid-template-columns:12px minmax(0,1fr);gap:8px;padding:12px 16px;border-top:1px solid var(--rule2);cursor:pointer}',
      V + '.mrow:first-child{border-top:0}' + V + '.mrow:hover{background:rgba(241,237,228,.55)}',
      V + '.pin{visibility:hidden;font-size:9px;color:var(--g6);padding-top:3px}' + V + '.mrow[aria-selected="true"] .pin{visibility:visible}',
      V + '.mt{font-family:var(--disp);font-size:16px;font-weight:700;line-height:1.25;margin:4px 0 2px;overflow-wrap:anywhere}',
      V + '.mn{margin:0 0 8px;font-size:12.5px;color:var(--ink2)}',
      V + '.mfoot{display:flex;align-items:center;flex-wrap:wrap;gap:8px}',
      V + '.sel{background:var(--slab);border:1px solid #000;border-top:3px solid transparent;border-image:var(--gline) 1;border-image-width:3px 0 0 0;border-radius:5px;color:var(--on);box-shadow:var(--slabsh);padding:14px 18px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}',
      V + '.sel.inline{margin:2px 10px 12px}',
      V + '.sel .age{color:var(--on3)}' + V + '.sel .age.warm{color:#d9b25a}' + V + '.sel .age.hot{color:#e08a60}',
      V + '.slabel{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--g5)}',
      V + '.stitle{font-family:var(--disp);font-size:23px;font-weight:800;line-height:1.15;margin:0;color:var(--on);overflow-wrap:anywhere}',
      V + '.smeta{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--on2);overflow-wrap:anywhere}',
      V + '.well{border:1px solid #000;border-radius:4px;background:var(--dwell);box-shadow:var(--dwellsh);padding:12px 14px}',
      V + '.well p{margin:7px 0 0;font-size:13px;line-height:1.6;color:#efe9da;white-space:pre-line;overflow-wrap:anywhere;max-height:260px;overflow:auto}',
      V + '.sacts{display:flex;gap:8px;flex-wrap:wrap}',
      V + '.sel .empty{color:var(--on3)}',
      V + '.mods{display:flex;flex-direction:column;gap:14px}',
      V + '.week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;padding:12px 14px}',
      V + '.day{display:flex;flex-direction:column;align-items:stretch;gap:5px;min-width:0;padding:8px 9px 9px;text-align:left;border:1px solid var(--rule);border-bottom-color:var(--edge);border-radius:4px;background:var(--key);box-shadow:var(--keysh);color:var(--ink);cursor:pointer;font:inherit}',
      V + '.day.today{background:var(--slab);border-color:#000;color:var(--on)}',
      V + '.dn{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.14em}' + V + '.day:not(.today) .dn{color:var(--mute)}',
      V + '.dd{font-family:var(--disp);font-size:16px;font-weight:800;line-height:1}',
      V + '.dots{display:flex;gap:4px;flex-wrap:wrap;min-height:8px}',
      V + '.dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:#8f8776}',
      V + '.t-ars{background:#2f7a4a}' + V + '.t-bruni{background:#b5522a}' + V + '.t-fund{background:#4a463f}' + V + '.t-upps{background:#8a6a1c}' + V + '.t-annad{background:#8f8776}',
      V + '.job{display:grid;gap:1px;padding:6px 7px;border-radius:3px;background:rgba(255,255,255,.7);border:1px solid var(--rule2);font-size:11.5px;line-height:1.3;color:var(--ink2);overflow-wrap:anywhere}',
      V + '.job b{font-family:var(--mono);font-size:10.5px;font-weight:600;color:var(--ink)}',
      V + '.today .job{background:rgba(255,255,255,.06);border-color:#2a2823;color:var(--on2)}' + V + '.today .job b{color:var(--on)}',
      V + '.legend{display:flex;flex-wrap:wrap;gap:6px 14px;padding:0 16px 12px;font-size:11.5px;color:var(--mute)}' + V + '.legend span{display:inline-flex;align-items:center;gap:6px}',
      V + '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:12px 14px}',
      V + '.pcard{display:flex;flex-direction:column;gap:4px;padding:10px 11px;border:1px solid var(--rule);border-bottom-color:var(--edge);border-radius:4px;background:linear-gradient(180deg,#fff,#fbf9f5);box-shadow:var(--keysh)}',
      V + '.pcard b{font-size:13px;line-height:1.3;overflow-wrap:anywhere}' + V + '.pcard span{font-size:12px;color:var(--ink2);line-height:1.4;overflow-wrap:anywhere}',
      V + '.pt{display:flex;align-items:center;gap:6px;margin-top:4px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}',
      V + '.lrow{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 16px;border-top:1px solid var(--rule2)}',
      V + '.lrow:first-child{border-top:0}' + V + '.lrow b{display:block;font-size:13px;overflow-wrap:anywhere}' + V + '.lrow .s{display:block;font-size:12px;color:var(--mute)}',
      V + '.kboxes{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:12px 14px}',
      V + '.kbox{padding:10px 12px;border-radius:4px;background:var(--well);box-shadow:var(--wellsh);border:1px solid var(--edge)}',
      V + '.kbox .v{font-family:var(--disp);font-size:24px;font-weight:800;line-height:1.1;margin-top:4px}',
      V + '.more{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 16px 12px;font-size:12px;color:var(--mute)}',
      V + '.cfgrow{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:10px 16px;border-top:1px solid var(--rule2)}',
      V + '.cfgrow:first-child{border-top:0}' + V + '.cfgt b{display:block;font-family:var(--disp);font-size:15px;font-weight:700}' + V + '.cfgt span{display:block;font-size:12px;color:var(--mute)}',
      V + '.lock{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}',
      V + '.cfgfoot{padding:11px 16px;border-top:1px solid var(--rule);font-size:12px;color:var(--mute)}',
      V + '.sw{position:relative;width:40px;height:22px;flex:none;border-radius:11px;border:1px solid var(--edge2);background:var(--well);box-shadow:var(--wellsh);cursor:pointer;padding:0}',
      V + '.sw::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--key);border:1px solid var(--edge);box-shadow:var(--keysh)}',
      V + '.sw[aria-checked="true"]{background:linear-gradient(180deg,#2a7a45 0%,#174a2a 55%,#144424 100%);border-color:#0a2a15}' + V + '.sw[aria-checked="true"]::after{left:20px}',
      V + '.boardstrip{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;width:100%;min-height:50px;padding:9px 16px;border:1px solid var(--rule3);border-radius:5px;background:var(--strip);box-shadow:var(--stripsh),0 1px 2px rgba(22,21,19,.1);font:inherit;color:var(--ink);text-align:left;cursor:pointer}',
      V + '.boardstrip b{font-family:var(--disp);font-size:16px;font-weight:700}' + V + '.boardstrip .v{font-family:var(--mono);font-size:11px;color:var(--mute);margin-right:10px}',
      V + '.composer{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto auto;gap:8px;padding:12px 16px;border-bottom:1px solid var(--rule2);background:var(--well)}',
      V + '.composer input{height:34px;padding:0 10px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px var(--body);color:var(--ink);min-width:0}',
      V + '.err{margin:0;padding:10px 14px;border:1px solid rgba(181,82,42,.45);border-radius:4px;background:#fff7f2;color:var(--terra);font-size:12.5px}',
      V + '.t5toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99990;max-width:min(92vw,520px);padding:11px 16px;border:1px solid #000;border-radius:5px;background:var(--slab);color:var(--on);font:600 12.5px var(--body);box-shadow:var(--slabsh)}',
      V + '.t5toast.warn{border-top:3px solid var(--terra)}',
      '@container t5 (max-width: 760px){' +
        V + '.t5{padding:14px 12px 24px}' + V + '.h1{font-size:30px}' +
        V + '.acts{width:100%}' + V + '.who{flex:1 1 100%}' + V + '.who select{width:100%}' + V + '.acts .btn{flex:1}' +
        V + '.modes .lbl{display:none}' + V + '.seg.modeseg{display:flex;width:100%;overflow-x:auto}' + V + '.seg.modeseg button{flex:1 0 auto;height:38px;padding:0 12px}' +
        V + '.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}' + V + '.kv{font-size:26px}' +
        V + '.board{grid-template-columns:minmax(0,1fr);gap:14px}' +
        V + '.phone-seg{display:flex;width:100%}' + V + '.phone-seg button{flex:1;height:40px;font-size:13px}' +
        V + '.board[data-view="master"] .colmine{display:none}' + V + '.board[data-view="mitt"] .colmaster{display:none}' +
        V + '.frow{grid-template-columns:minmax(0,1fr) auto;padding:12px}' + V + '.frow .age{grid-column:1 / -1}' +
        V + '.week{display:flex;overflow-x:auto;padding:10px 12px}' + V + '.day{flex:0 0 96px}' +
        V + '.cfgrow{grid-template-columns:30px minmax(0,1fr) auto;padding:10px 12px}' + V + '.cfgrow .seg{grid-column:2 / -1;justify-self:start}' +
        V + '.composer{grid-template-columns:minmax(0,1fr)}' +
        V + '.lrow{grid-template-columns:40px minmax(0,1fr);padding:10px 12px}' + V + '.lrow .btn{grid-column:2;justify-self:start}' +
      '}',
      '@media (prefers-reduced-motion: reduce){' + V + '.btn{transition:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ── teikning ── */
  const plate = n => '<span class="plate">' + n + '</span>';
  const emptyHtml = t => '<div class="empty"><span class="coin" aria-hidden="true"></span>' + t + '</div>';

  function feedRow(r) {
    const a = ageDays(r), w = whereOf(r), ai = aiLine(r);
    const tags = (r.important ? '<span class="tag hot">Áríðandi</span>' : '') + (r.due_at ? '<span class="tag">Frestur ' + esc(fmtD(r.due_at)) + '</span>' : '');
    return '<article class="frow">' +
      '<div class="age ' + ageCls(a) + '" title="' + a + ' dagar síðan málið varð til">' + a + 'D</div>' +
      '<div><div class="kick">' + (isPost(r) ? 'Póstur' : 'Beiðni') + (w ? ' · ' + esc(w) : '') + '</div>' +
      '<h3 class="rt">' + esc(r.title || '(ónefnt mál)') + '</h3>' +
      (ai ? '<p class="ai">' + esc(ai) + '</p>' : '') +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + '</div>' +
      '<button type="button" class="btn iv sm" data-a="take" data-id="' + r.id + '"' + (S.busy[r.id] ? ' disabled' : '') + '>Taka ›</button>' +
      '</article>';
  }
  function mineRow(r, selected) {
    const a = ageDays(r), w = whereOf(r), ai = aiLine(r);
    return '<div class="mrow" role="button" tabindex="0" data-a="select" data-id="' + r.id + '" aria-selected="' + selected + '">' +
      '<span class="pin" aria-hidden="true">◆</span>' +
      '<div><div class="kick">' + (isPost(r) ? 'Póstur' : 'Beiðni') + (w ? ' · ' + esc(w) : '') + '</div>' +
      '<h3 class="mt">' + esc(r.title || '(ónefnt mál)') + '</h3>' +
      (ai ? '<p class="mn">' + esc(ai) + '</p>' : '') +
      '<div class="mfoot"><span class="age ' + ageCls(a) + '">' + a + 'D</span>' +
      (r.due_at ? '<span class="lock">Frestur ' + esc(fmtD(r.due_at)) + '</span>' : '') +
      (r.important ? '<span class="tag hot">Áríðandi</span>' : '') +
      '<span class="grow"></span>' +
      '<button type="button" class="btn iv sm" data-a="done" data-id="' + r.id + '"' + (S.busy[r.id] ? ' disabled' : '') + '>✓ Lokið</button>' +
      '<button type="button" class="btn iv sm" data-a="giveback" data-id="' + r.id + '"' + (S.busy[r.id] ? ' disabled' : '') + '>↩ Skila</button>' +
      '</div></div></div>';
  }
  function fmtD(iso) { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.getDate() + '. ' + MAN[d.getMonth()].slice(0, 3) + '.'; }

  function selHtml(r) {
    if (!r) return emptyHtml('Veldu mál af borðinu þínu eða taktu næsta af Master.<button type="button" class="btn gold" data-a="take-next">Taka næsta af Master ›</button>');
    const a = ageDays(r), w = whereOf(r), post = isPost(r);
    let body = '';
    if (post) {
      const p = postOf(r);
      if (p === undefined || p === null) {
        loadPost(r);
        body = '<div class="well"><div class="slabel">Pósturinn</div><p>Sæki póstinn…</p></div>';
      } else if (p === false) {
        body = '<div class="well"><div class="slabel">Pósturinn</div><p>Náði ekki í póstinn. Samantekt málsins stendur hér að ofan.</p></div>';
      } else {
        let txt = String(p.body_preview || p.snippet || '').trim();
        try { if (window.SamskiptiTexti && SamskiptiTexti.eiginTexti) txt = SamskiptiTexti.eiginTexti(txt) || txt; } catch (_) {}
        body = '<div class="well"><div class="slabel">' + esc((p.sender_name || p.sender_email || '') + ' · ' + fmtD(p.received_at)) + '</div><p>' + esc(txt.slice(0, 1600) || '(enginn texti)') + '</p></div>';
      }
    } else {
      const notes = String(r.notes || r.summary || '').trim();
      body = '<div class="well"><div class="slabel">Næsta skref</div><p>' + esc(notes.slice(0, 1600) || 'Engin lýsing skráð.') + '</p></div>';
    }
    const p = post ? postOf(r) : null;
    const canReply = post && p && p.sender_email && window.ReikningaPostur && ReikningaPostur.replyTo;
    const acts = (canReply
      ? '<button type="button" class="btn gold lg" data-a="reply" data-id="' + r.id + '">↩ Svara í sama þræði</button><button type="button" class="btn iv" data-a="done" data-id="' + r.id + '">✓ Lokið</button>'
      : '<button type="button" class="btn gold lg" data-a="done" data-id="' + r.id + '">✓ Merkja lokið</button>') +
      '<button type="button" class="btn iv" data-a="giveback" data-id="' + r.id + '">↩ Skila á Master</button>';
    return '<div style="display:flex;align-items:center;gap:10px"><span class="plate dark">04</span><span class="slabel">Valið mál</span><span class="grow"></span><span class="age ' + ageCls(a) + '">' + a + 'D</span></div>' +
      '<h3 class="stitle">' + esc(r.title || '(ónefnt mál)') + '</h3>' +
      '<div class="smeta">' + esc([w, r.due_at ? 'Frestur ' + fmtD(r.due_at) : '', r.important ? 'Áríðandi' : ''].filter(Boolean).join(' · ') || (post ? 'Póstur' : 'Beiðni')) + '</div>' +
      (r.summary && post ? '<div class="smeta" style="text-transform:none;letter-spacing:0;font-family:var(--body);font-size:12.5px">' + esc(r.summary) + '</div>' : '') +
      body + '<div class="sacts">' + acts + '</div>';
  }

  function modPanel(k, summary, body, action) {
    const m = MODS[k], open = isOpen(k);
    return '<section class="panel mod' + (open ? ' open' : '') + '" aria-label="' + esc(m.t) + '">' +
      '<header class="phead">' + plate(m.n) + '<h2 class="ptitle">' + m.t + '</h2><span class="sum">' + summary + '</span><span class="grow"></span>' +
        (open && action ? action : '') +
        '<button type="button" class="btn iv sm" style="min-width:34px;padding:0 9px" data-a="mod-open" data-m="' + k + '" aria-expanded="' + open + '" aria-label="' + (open ? 'Fella saman ' : 'Opna ') + m.t + '">' + (open ? '▴' : '▾') + '</button>' +
      '</header>' + (open ? body : '') + '</section>';
  }
  function dagskraHtml() {
    const open = isOpen('dagskra'), days = week(), today = days[0];
    const total = days.reduce((n, d) => n + d.jobs.length, 0);
    const html = '<div class="week">' + days.map(d =>
      '<button type="button" class="day' + (d.today ? ' today' : '') + '" data-a="mod-open" data-m="dagskra" aria-label="' + d.d + ' ' + d.n + ', ' + d.jobs.length + ' verk">' +
        '<span class="dn">' + d.d + '</span><span class="dd">' + d.n + '</span>' +
        '<span class="dots">' + d.jobs.map(j => '<i class="dot ' + tegKlasi(j.type) + '" title="' + esc(tegNafn(j.type)) + '"></i>').join('') + '</span>' +
        (open ? d.jobs.map(j => '<span class="job"><b>' + esc(j.allday ? 'Allan daginn' : (j.time || '')) + '</b>' + esc(j.name || j.note || '') + '</span>').join('') : '') +
      '</button>').join('') + '</div>' +
      (open ? '<div class="legend">' + TEG.map(t => '<span><i class="dot ' + tegKlasi(t) + '"></i>' + t + '</span>').join('') + '</div>' : '');
    const action = '<button type="button" class="btn gold sm" data-a="job-new" data-date="' + today.key + '">+ Skrá verk</button>';
    return modPanel('dagskra', today.jobs.length + ' í dag · ' + total + ' næstu 7 daga', html, action).replace('</header>' + (open ? html : ''), '</header>' + html);
  }
  function bottomHtml(k) {
    const n = nu();
    if (k === 'skipulag') {
      const cards = cardsFor(n);
      return modPanel(k, cards.length + ' spjöld', cards.length
        ? '<div class="cards">' + cards.slice(0, 12).map(c => '<div class="pcard"><b>' + esc(c.name || c.title || '(spjald)') + '</b>' + (c.title && c.name ? '<span>' + esc(c.title) + '</span>' : '') + '<span class="pt"><i class="dot ' + tegKlasi(c.type) + '"></i>' + esc(tegNafn(c.type)) + '</span></div>').join('') + '</div>' +
          (cards.length > 12 ? '<div class="more">+ ' + (cards.length - 12) + ' spjöld til viðbótar</div>' : '')
        : emptyHtml('Engin spjöld á skipulagsborðinu þínu.'),
        '<button type="button" class="btn gold sm" data-a="go" data-view="verkbord" data-anchor="vb-skipulag">Opna skipulagsborð ›</button>');
    }
    if (k === 'vinnublod') {
      const c = S.counts.sara;
      const sum = c ? (c.bidur || 0) + ' bíða yfirferðar · ' + (c.samthykkt || 0) + ' samþykkt' : 'talning náðist ekki';
      return modPanel(k, sum, c
        ? '<div class="kboxes"><div class="kbox"><div class="lbl">Bíða yfirferðar</div><div class="v">' + (c.bidur || 0) + '</div></div><div class="kbox"><div class="lbl">Samþykkt</div><div class="v">' + (c.samthykkt || 0) + '</div></div><div class="kbox"><div class="lbl">Kláruð</div><div class="v">' + (c.klarad || 0) + '</div></div></div>'
        : '<div class="more">Vinnublöðin eru á gamla borðinu.</div>',
        '<button type="button" class="btn gold sm" data-a="go" data-view="verkbord" data-anchor="vb-sara">Opna vinnublöð ›</button>');
    }
    if (k === 'postsvor') {
      const rows = S.rows.filter(r => isPost(r) && !r.svarad_at).sort(prio);
      return modPanel(k, rows.length + ' bíða svars', rows.length
        ? rows.slice(0, 8).map(r => {
            const a = ageDays(r), free = !normW(r.assigned_to), me = sameW(r.assigned_to, nu());
            return '<div class="lrow"><span class="age ' + ageCls(a) + '">' + a + 'D</span><div><b>' + esc(r.title || '(ónefnt)') + '</b><span class="s">' + esc([whereOf(r), free ? 'á Master' : normW(r.assigned_to)].filter(Boolean).join(' · ')) + '</span></div>' +
              (free ? '<button type="button" class="btn iv sm" data-a="take" data-id="' + r.id + '">Taka ›</button>' : me ? '<button type="button" class="btn iv sm" data-a="select" data-id="' + r.id + '">Opna ›</button>' : '<span class="lock">' + esc(normW(r.assigned_to)) + '</span>') + '</div>';
          }).join('') + (rows.length > 8 ? '<div class="more">+ ' + (rows.length - 8) + ' til viðbótar</div>' : '')
        : emptyHtml('Enginn póstur bíður svars.'),
        '<button type="button" class="btn gold sm" data-a="go" data-view="thjonustuver-postar">Opna Þjónustuver póstar ›</button>');
    }
    if (k === 'akstur') {
      return modPanel(k, 'Aksturslisti og vakt', '<div class="more">Aksturslistinn opnast í sinni eigin síðu.</div>',
        '<button type="button" class="btn gold sm" data-a="go" data-view="aksturslisti">Opna aksturslista ›</button>');
    }
    if (k === 'krofur') {
      const c = S.counts.krofur;
      return modPanel(k, c == null ? 'talning náðist ekki' : c + ' ógreiddir reikningar',
        '<div class="kboxes"><div class="kbox"><div class="lbl">Ógreiddir reikningar</div><div class="v">' + (c == null ? '—' : c) + '</div></div></div>',
        '<button type="button" class="btn gold sm" data-a="go" data-view="krofu-yfirlit">Opna Kröfu yfirlit ›</button>');
    }
    return '';
  }

  function kpiHtml(master, mine) {
    const card = (l, v, m, dark, small) => '<div class="kpi' + (dark ? ' dark' : '') + '"><div class="lbl">' + l + '</div><div class="kv">' + v + (small ? '<small>' + small + '</small>' : '') + '</div><div class="km">' + m + '</div></div>';
    const hot = S.rows.filter(r => r.important).length;
    const waiting = S.rows.filter(r => isPost(r) && r.svarad_at).length;
    const unanswered = S.rows.filter(r => isPost(r) && !r.svarad_at).length;
    const todayKey = ymd(new Date());
    const newToday = master.filter(r => String(r.created_at || '').slice(0, 10) === todayKey).length;
    const days = week(), jobsToday = days[0].jobs.length, jobsWeek = days.reduce((n, d) => n + d.jobs.length, 0);
    const mode = cfg().mode, sara = S.counts.sara;
    if (mode === 'krofur') return card('Ógreiddir reikningar', S.counts.krofur == null ? '—' : S.counts.krofur, 'Kröfu yfirlit') + card('Á Master', master.length, 'opin mál án starfsmanns') + card('Mitt borð', mine.length, 'haltu því stuttu', false, '/ ' + LIMIT) + card('Áríðandi', hot, 'opin áríðandi mál', true);
    if (mode === 'skyrslur') return card('Bíða yfirferðar', sara ? (sara.bidur || 0) : '—', 'vinnublöð Söru') + card('Samþykkt', sara ? (sara.samthykkt || 0) : '—', 'tilbúin í skýrslu og reikning') + card('Skipulagsspjöld', cardsFor(nu()).length, 'á þínu borði') + card('Verk í dag', jobsToday, jobsWeek + ' næstu 7 daga', true);
    if (mode === 'akstur') return card('Verk í dag', jobsToday, 'á dagskránni þinni') + card('Næstu 7 daga', jobsWeek, 'á dagskránni þinni') + card('Mitt borð', mine.length, 'haltu því stuttu', false, '/ ' + LIMIT) + card('Áríðandi', hot, 'opin áríðandi mál', true);
    if (mode === 'samskipti') return card('Bíða svars', unanswered, 'póstmál án svars') + card('Póstar á Master', master.filter(isPost).length, 'taktu næsta') + card('Bíður svars kúnna', waiting, 'svarað, bíður kúnnans') + card('Áríðandi', hot, 'opin áríðandi mál', true);
    return card('Á Master', master.length, newToday + ' ný í dag') + card('Mitt borð', mine.length, 'haltu því stuttu', false, '/ ' + LIMIT) + card('Bíður svars kúnna', waiting, 'svarað, bíður kúnnans') + card('Áríðandi', hot, 'opin áríðandi mál', true);
  }

  function cfgHtml() {
    const c = cfg();
    const core = [['02', 'Master borð'], ['03', 'Mitt borð'], ['04', 'Valið mál']].map(x =>
      '<div class="cfgrow">' + plate(x[0]) + '<div class="cfgt"><b>' + x[1] + '</b><span>Kjarninn í flæðinu.</span></div><span></span><span class="lock">Alltaf</span></div>').join('');
    const rows = ['dagskra'].concat(BOTTOM).map(k => {
      const m = MODS[k], on = !!c.mods[k][0], def = !!c.mods[k][1];
      return '<div class="cfgrow">' + plate(m.n) + '<div class="cfgt"><b>' + m.t + '</b><span>' + m.d + '</span></div>' +
        '<div class="seg sm" role="group" aria-label="Sjálfgefið fyrir ' + m.t + '"><button type="button" data-a="cfg-def" data-m="' + k + '" data-v="1" aria-pressed="' + def + '">Opið</button><button type="button" data-a="cfg-def" data-m="' + k + '" data-v="0" aria-pressed="' + !def + '">Samanbrotið</button></div>' +
        '<button type="button" class="sw" role="switch" aria-checked="' + on + '" data-a="cfg-on" data-m="' + k + '" aria-label="' + m.t + '"></button></div>';
    }).join('');
    return '<header class="phead"><span class="plate">⚙</span><h2 class="ptitle">Mitt vinnuborð · ' + esc(nu()) + '</h2><span class="grow"></span><button type="button" class="btn gold sm" data-a="cfg-close">Loka ›</button></header>' +
      core + rows +
      '<div class="cfgrow"><span class="plate">—</span><div class="cfgt"><b>Spjall</b><span>Slökkt í bili fyrir alla.</span></div><span></span><span class="lock">Slökkt</span></div>' +
      '<div class="cfgfoot">Breytingar vistast strax og fylgja þér á milli tölva og í appið. Hamirnir efst raða borðinu fyrir daginn.</div>';
  }

  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    css();
    const n = nu(), c = cfg(), mode = MODES[c.mode];
    const master = masterRows(), mine = mineRows();
    let selId = S.sel[n];
    if (!mine.some(r => r.id === selId)) selId = S.sel[n] = mine.length ? mine[0].id : null;
    const selRow = mine.find(r => r.id === selId) || null;
    const filter = S.filter;
    const visible = master.filter(r => matchFilter(r, filter));
    const root = v.querySelector('.t5');
    const narrow = root ? root.clientWidth <= 760 : window.innerWidth <= 760;
    const now = new Date();

    const top = mode.first.slice();
    if (isOn('dagskra') && top.indexOf('dagskra') < 0) top.unshift('dagskra');
    const topHtml = top.map(k => (k === 'dagskra' ? dagskraHtml() : bottomHtml(k))).join('');
    const bottom = BOTTOM.filter(k => isOn(k) && top.indexOf(k) < 0).map(bottomHtml).join('');

    let slots = '';
    for (let i = 0; i < LIMIT; i++) slots += '<span class="slot' + (i < mine.length ? ' on' : '') + '"></span>';
    const selMarkup = selHtml(selRow);

    const html =
      '<div class="t5"><div class="col">' +
        '<div class="head"><div>' +
          '<div class="kicker">Þjónusta · ' + MAN[now.getMonth()] + ' ' + now.getFullYear() + '</div>' +
          '<h1 class="h1">Þjónustuborð</h1>' +
          '<p class="meta">' + (c.mode !== 'thjonusta' ? 'Hamur: ' + mode.l + ' · ' : '') + master.length + ' á Master · ' + mine.length + ' á þínu borði · ' + S.rows.filter(r => r.important).length + ' áríðandi</p>' +
          '<div class="beta"><b>PRUFA</b>Nýja borðið. Gamla borðið er óbreytt. <button type="button" class="btn iv sm" data-a="go" data-view="verkbord">Gamla borðið ›</button></div>' +
        '</div><div class="acts">' +
          '<label class="who"><span class="lbl">Ég er</span><select data-a="who" aria-label="Starfsmaður">' + staffList().map(x => '<option' + (x === n ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></label>' +
          '<button type="button" class="btn iv" data-a="cfg" aria-expanded="' + S.cfgOpen + '">⚙ Mitt vinnuborð</button>' +
          '<button type="button" class="btn iv" data-a="composer">+ Nýtt mál</button>' +
        '</div></div>' +
        '<div class="modes"><span class="lbl">Hamur</span><div class="seg modeseg" role="group" aria-label="Hamur">' +
          Object.keys(MODES).map(k => '<button type="button" data-a="mode" data-mode="' + k + '" aria-pressed="' + (c.mode === k) + '">' + MODES[k].l + '</button>').join('') +
        '</div></div>' +
        (S.cfgOpen ? '<section class="panel">' + cfgHtml() + '</section>' : '') +
        (S.err ? '<p class="err">Náði ekki í málin: ' + esc(S.err) + ' <button type="button" class="btn iv sm" data-a="reload">Reyna aftur</button></p>' : '') +
        '<div class="kpis">' + kpiHtml(master, mine) + '</div>' +
        topHtml +
        (mode.board
          ? '<div class="board" data-view="' + S.view + '">' +
              '<div class="seg phone-seg" role="group" aria-label="Borð"><button type="button" data-a="view" data-v="master" aria-pressed="' + (S.view === 'master') + '">Master borð<span class="c">' + master.length + '</span></button><button type="button" data-a="view" data-v="mitt" aria-pressed="' + (S.view === 'mitt') + '">Mitt borð<span class="c">' + mine.length + '</span></button></div>' +
              '<section class="panel colmaster" aria-label="Master borð">' +
                '<header class="phead">' + plate('02') + '<h2 class="ptitle">Master borð</h2><span class="grow"></span>' +
                  '<div class="seg" role="group" aria-label="Sía">' + [['allt', 'Allt'], ['post', 'Póstar'], ['beidni', 'Beiðnir'], ['hot', 'Áríðandi']].map(f => '<button type="button" data-a="filter" data-f="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + f[1] + '</button>').join('') + '</div>' +
                  '<button type="button" class="btn gold sm" data-a="take-next">Taka næsta ›</button></header>' +
                (S.composer ? '<div class="composer"><input type="text" data-k="nt" placeholder="Hvað þarf að gera?" aria-label="Titill máls"><input type="text" data-k="nc" placeholder="Fyrirtæki (valfrjálst)" aria-label="Fyrirtæki"><button type="button" class="btn iv sm" data-a="composer-save">Setja á Master</button><button type="button" class="btn iv sm" data-a="composer">Hætta við</button></div>' : '') +
                '<div class="psub">Á borðum · ' + staffList().map(x => esc(x) + ' ' + S.rows.filter(r => sameW(r.assigned_to, x)).length).join(' · ') + '</div>' +
                (!S.loaded && S.loading ? emptyHtml('Sæki mál…') : visible.length ? visible.slice(0, 60).map(feedRow).join('') + (visible.length > 60 ? '<div class="more">+ ' + (visible.length - 60) + ' mál til viðbótar</div>' : '')
                  : emptyHtml(master.length ? 'Ekkert í þessari síu.' : 'Master borðið er tómt. Öll mál eru komin á borð.')) +
              '</section>' +
              '<div class="col colmine">' +
                '<section class="panel" aria-label="Mitt borð"><header class="phead">' + plate('03') + '<h2 class="ptitle">Mitt borð</h2>' +
                  '<span class="slots" aria-label="' + mine.length + ' af ' + LIMIT + '">' + slots + '<span class="slotn' + (mine.length > LIMIT ? ' over' : '') + '">' + mine.length + '/' + LIMIT + '</span></span><span class="grow"></span>' +
                  (selRow && isPost(selRow) ? '<button type="button" class="btn gold sm" data-a="reply" data-id="' + selRow.id + '">↩ Svara</button>' : '<button type="button" class="btn gold sm" data-a="take-next">Taka næsta ›</button>') +
                '</header>' +
                (mine.length > LIMIT ? '<div class="psub" style="color:var(--terra)">' + mine.length + ' mál á borðinu — skilaðu því sem bíður á Master</div>' : '') +
                (mine.length ? mine.map(r => mineRow(r, r.id === selId) + (narrow && r.id === selId ? '<div class="sel inline">' + selMarkup + '</div>' : '')).join('')
                  : emptyHtml('Borðið þitt er autt.' + (narrow ? '<button type="button" class="btn iv sm" data-a="take-next">Taka næsta af Master ›</button>' : ''))) +
                '</section>' +
                (narrow ? '' : '<section class="sel" aria-live="polite">' + selMarkup + '</section>') +
              '</div>' +
            '</div>'
          : '<button type="button" class="boardstrip" data-a="mode" data-mode="thjonusta">' + plate('02') + '<b>Master borð</b><span class="v">' + master.length + ' mál</span>' + plate('03') + '<b>Mitt borð</b><span class="v">' + mine.length + ' / ' + LIMIT + '</span><span class="grow"></span><span class="v">Aftur í Þjónustu ›</span></button>') +
        '<div class="mods">' + bottom + '</div>' +
      '</div></div>';

    const keepFocus = document.activeElement && v.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    const nt = v.querySelector('[data-k="nt"]'), nc = v.querySelector('[data-k="nc"]');
    const draft = { nt: nt ? nt.value : '', nc: nc ? nc.value : '' };
    v.innerHTML = html;
    if (S.composer) {
      const a = v.querySelector('[data-k="nt"]'), b = v.querySelector('[data-k="nc"]');
      if (a) a.value = draft.nt; if (b) b.value = draft.nc;
      const f = v.querySelector('[data-k="' + (keepFocus || 'nt') + '"]'); if (f) f.focus();
    }
  }

  /* ── skilaboð ── */
  let _toastT = 0;
  function toast(msg, warn) {
    const v = document.getElementById(VIEW_ID) || document.body;
    let t = v.querySelector('.t5toast');
    if (!t) { t = document.createElement('div'); t.className = 't5toast'; t.setAttribute('role', 'status'); v.appendChild(t); }
    t.textContent = msg;
    t.className = 't5toast' + (warn ? ' warn' : '');
    t.hidden = false;
    clearTimeout(_toastT);
    _toastT = setTimeout(() => { t.hidden = true; }, 2800);
  }

  /* ── atburðir ── */
  function onClick(e) {
    const el = e.target.closest('[data-a]');
    const v = document.getElementById(VIEW_ID);
    if (!el || !v || !v.contains(el)) return;
    const a = el.dataset.a, id = el.dataset.id ? Number(el.dataset.id) : null, m = el.dataset.m;
    if (a === 'who' || el.tagName === 'SELECT') return;
    if (a === 'take') { take(id); return; }
    if (a === 'take-next') {
      const next = masterRows().filter(r => matchFilter(r, S.filter))[0];
      if (next) take(next.id); else toast('Ekkert á Master í þessari síu.');
      return;
    }
    if (a === 'select') { S.sel[nu()] = id; S.view = 'mitt'; render(); return; }
    if (a === 'done') { done(id); return; }
    if (a === 'giveback') { giveBack(id); return; }
    if (a === 'reply') {
      const r = S.rows.find(x => x.id === id), p = r && postOf(r);
      if (!p || !p.sender_email) { if (r) loadPost(r); toast('Sæki póstinn fyrst — reyndu aftur eftir augnablik.', true); return; }
      try { ReikningaPostur.replyTo({ sender_name: p.sender_name, from: p.sender_email, subject: p.subject, body_preview: p.body_preview || p.snippet, message_id: p.message_id }); }
      catch (err) { toast('Svar-glugginn opnaðist ekki: ' + ((err && err.message) || err), true); }
      return;
    }
    if (a === 'filter') { S.filter = el.dataset.f; render(); return; }
    if (a === 'view') { S.view = el.dataset.v; render(); return; }
    if (a === 'mode') {
      const c = cfg();
      c.mode = el.dataset.mode;
      S.filter = MODES[c.mode].filter || 'allt';
      S.view = 'master';
      render();
      saveCfgSoon();
      return;
    }
    if (a === 'mod-open') { const o = isOpen(m); S.open[openKey(m)] = !o; render(); return; }
    if (a === 'cfg') { S.cfgOpen = !S.cfgOpen; render(); return; }
    if (a === 'cfg-close') { S.cfgOpen = false; render(); return; }
    if (a === 'cfg-on') {
      const c = cfg(); c.mods[m][0] = c.mods[m][0] ? 0 : 1;
      delete S.open[openKey(m)];
      render();
      saveCfgSoon(MODS[m].t + (c.mods[m][0] ? ' komið á vinnuborðið' : ' tekið af vinnuborðinu'));
      return;
    }
    if (a === 'cfg-def') {
      const c = cfg(); c.mods[m][1] = el.dataset.v === '1' ? 1 : 0;
      delete S.open[openKey(m)];
      render();
      saveCfgSoon();
      return;
    }
    if (a === 'composer') { S.composer = !S.composer; render(); return; }
    if (a === 'composer-save') {
      const t = v.querySelector('[data-k="nt"]'), cu = v.querySelector('[data-k="nc"]');
      const title = t ? t.value.trim() : '';
      if (!title) { toast('Skrifaðu hvað þarf að gera.', true); if (t) t.focus(); return; }
      el.disabled = true;
      createCase(title, cu ? cu.value.trim() : '').then(ok => { if (ok) { S.composer = false; render(); } else el.disabled = false; });
      return;
    }
    if (a === 'job-new') {
      try { if (window.Vikudagskra && Vikudagskra.open) Vikudagskra.open(el.dataset.date); else toast('Dagskrárglugginn er ekki hlaðinn.', true); }
      catch (err) { toast('Dagskrárglugginn opnaðist ekki.', true); }
      return;
    }
    if (a === 'go') { goView(el.dataset.view, el.dataset.anchor); return; }
    if (a === 'reload') { load(); return; }
  }
  function onChange(e) {
    const el = e.target;
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.contains(el) || el.dataset.a !== 'who') return;
    try { if (window.BordStarfsmadur && BordStarfsmadur.set) BordStarfsmadur.set(el.value); } catch (_) {}
    S.view = 'master';
    render();
  }
  function onKey(e) {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.contains(e.target)) return;
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('mrow')) {
      e.preventDefault(); S.sel[nu()] = Number(e.target.dataset.id); render();
    }
    if (e.key === 'Enter' && e.target.dataset && (e.target.dataset.k === 'nt' || e.target.dataset.k === 'nc')) {
      const b = v.querySelector('[data-a="composer-save"]'); if (b) b.click();
    }
  }

  /* ── sýnin (sama mynstur og 310) ── */
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.querySelector('[id^="view-"]');
    const host = sample ? sample.parentNode : document.body;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = (sample && sample.className ? sample.className : 'view').replace(/\bactive\b/g, '').trim();
    v.style.display = 'none';
    host.appendChild(v);
  }
  let _poll = 0;
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block';
    v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.remove('active'));
    try { if (location.hash !== '#' + NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    const c = cfg();
    S.filter = MODES[c.mode].filter || S.filter || 'allt';
    render();
    load(S.loaded);
    clearInterval(_poll);
    _poll = setInterval(() => {
      const vv = document.getElementById(VIEW_ID);
      if (!vv || !vv.classList.contains('active')) { clearInterval(_poll); return; }
      if (!document.hidden) load(true);
    }, 45000);
  }
  function patchSwitchView() {
    if (!window.App || window.App._t5SwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const mine = document.getElementById(VIEW_ID);
      if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      clearInterval(_poll);
      return orig.apply(this, arguments);
    };
    window.App._t5SwitchPatched = true;
  }
  function openFromHash() {
    const slug = (location.hash || '').replace(/^#/, '');
    if (slug === NAV_KEY) { if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); }
  }
  function boot() {
    patchSwitchView();
    ensureView();
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', openFromHash);
    let rT = 0;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(render, 150); });
    document.addEventListener('visibilitychange', () => { const v = document.getElementById(VIEW_ID); if (!document.hidden && v && v.classList.contains('active')) load(true); });
    try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { if (!S.cfgOpen) Object.keys(_cfg).forEach(k => delete _cfg[k]); render(); }); } catch (_) {}
    (window.__bordStarfsmadurAskrift = window.__bordStarfsmadurAskrift || []).push(() => render());
    openFromHash();
    setTimeout(() => { patchSwitchView(); openFromHash(); }, 1600);
    window.Thjonustubord5 = { show, load, render, version: '368a' };
    console.log('[368-thjonustubord5] installed (#bord)');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
/* === END ÞJÓNUSTUBORÐ 5 === */
