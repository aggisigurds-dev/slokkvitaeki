/* === AI Á ÞJÓNUSTUBORÐI — leiðir „eftir að gera“ + tillögur með staðfestingu (343)
 *
 * Fasi 2 af „dýpri AI-hjálp“ sem 231 lofaði. Model skrifar ALDREI beint:
 *   1. ÚR GÖGNUM: úttektarskýrsla 2026 vs úttektarreikningur, per fyrirtaeki_id
 *      (aldrei kt-merge — Center Hótel er 11 staðir).
 *   2. PÓSTAR: INBOX flokkað með reglum (afrit, teikningar, nýtt húsfélag,
 *      eftirfylgni). SENT og tvítekinn þráður á opnu máli eru sleppt.
 *   3. MINNISBLAÐ: líma texta → POST /api/verkbord-sync → tillögur.
 *   4. Notandi hakar og ýtir á „Setja á borð“ / „Nota valið“ → Confirm.show
 *      → Verkbord.applyActions.
 *
 * Sending skýrslu er óvituð (ekkert sent_at) — því er EKKI auto-lokað.
 * Plaza/Arnarhvoll „eftir að senda“ kemur inn um minnisblaðið, ekki blob.
 * GreenKey án fyrirtaeki-raðar: sender sem nafn, enginn customer_base_id.
 */
(() => {
  if (window.VerkbordAi) return;

  const YEAR = new Date().getFullYear();
  const FLOKKAR = { tilbod: 'Tilboð', thjonusta: 'Þjónusta', brunakerfi: 'Brunakerfi', rukkun: 'Rukkun', samskipti: 'Samskipti' };
  const TAGS = {
    draft: 'Draft', gera_tilbod: 'Gera tilboð', thjonustusamningur: 'Þjónustusamningur', bokhald: 'Bókhald',
    kvortun: 'Kvörtun', hringja: 'Hringja', brunakerfi: 'Brunakerfi',
    eftir_ad_rukka: 'Eftir að rukka', thjonusta: 'Þjónusta', senda_tolvupost: 'Senda tölvupóst',
    senda_skyrslur: 'Senda skýrslur', uppsetning: 'Uppsetning'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[verkbord-ai]', m); }
  function fold(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function parseTags(raw) {
    let t = raw;
    if (typeof t === 'string') { try { t = JSON.parse(t); } catch (_) { t = []; } }
    return Array.isArray(t) ? t : [];
  }
  function isOpenItem(i) {
    if (!(i && !i._vd && i.status !== 'lokad' && !i.archived_at && !i.deleted_at)) return false;
    if (window.Verkbord && Verkbord.isOldYearReport && Verkbord.isOldYearReport(i)) return false;
    return true;
  }
  function existingBoardHit(items, site, tags) {
    const fn = fold(site && site.nafn);
    if (!fn) return null;
    const want = new Set(Array.isArray(tags) ? tags : []);
    for (let i = 0; i < (items || []).length; i++) {
      const row = items[i];
      if (!isOpenItem(row) || fold(row.customer_nafn) !== fn) continue;
      if (!want.size) return row;
      if (parseTags(row.tags).some(t => want.has(t))) return row;
    }
    return null;
  }
  function deriveUttekt(sites, reports, invoices, year) {
    const rep = new Map();
    (reports || []).forEach(r => {
      const id = Number(r && r.fyrirtaeki_id);
      if (!id) return;
      const dags = r.doc_date || r.created_at || '';
      const prev = rep.get(id);
      if (!prev || String(dags) > String(prev.dags)) rep.set(id, { id: r.id, dags: dags });
    });
    const inv = new Set(); (invoices || []).forEach(s => { const id = Number(s && s.customer_id); if (id) inv.add(id); });
    const out = [];
    (sites || []).forEach(s => {
      if (s && s.er_i_thjonustu === false) return;
      const fid = Number(s && s.id); if (!fid) return;
      const rec = rep.get(fid);
      const hasR = !!rec, hasI = inv.has(fid);
      let kind = 'engin_skyrsla';
      if (hasR && hasI) kind = 'klarad_skjol';
      else if (hasR) kind = 'vantar_reikning';
      else if (hasI) kind = 'vantar_skyrslu';
      if (kind !== 'vantar_reikning' && kind !== 'vantar_skyrslu') return;
      out.push({ kind, fid, nafn: s.nafn, customer_base_id: s.customer_base_id || null, year: year, dags: rec && rec.dags ? rec.dags : null });
    });
    return out;
  }
  function actionFromDerived(d, openItems) {
    const tags = d.kind === 'vantar_reikning' ? ['eftir_ad_rukka'] : ['senda_skyrslur'];
    const ref = 'derived:' + d.kind + ':' + d.year + ':' + d.fid;
    const items = openItems || [];
    if (items.some(i => isOpenItem(i) && String(i.channel_ref || '') === ref)) {
      return { op: 'skip', onBoard: true, kind: d.kind, fid: d.fid, nafn: d.nafn, year: d.year, reason: 'þegar á borði' };
    }
    if (existingBoardHit(items, { nafn: d.nafn }, tags)) {
      return { op: 'skip', onBoard: true, kind: d.kind, fid: d.fid, nafn: d.nafn, year: d.year, reason: 'þegar á borði' };
    }
    return {
      op: 'create',
      title: (d.kind === 'vantar_reikning' ? 'Vantar úttektarreikning ' : 'Vantar úttektarskýrslu ') + d.year + ' — ' + d.nafn,
      type: 'skyrsla',
      tags,
      flokkur: d.kind === 'vantar_reikning' ? 'rukkun' : 'thjonusta',
      customer_nafn: d.nafn,
      customer_base_id: d.customer_base_id || null,
      channel_ref: ref,
      notes: 'Leitt úr gögnum: ' + d.kind + ' ' + d.year + ' á fyrirtaeki_id ' + d.fid + '.',
      reason: d.kind === 'vantar_reikning'
        ? 'Úttektarskýrsla til, enginn úttektarreikningur á þessum stað.'
        : 'Úttektarreikningur til, engin úttektarskýrsla á þessum stað.',
      source: 'derived',
      defaultOn: false,
      kind: d.kind, fid: d.fid, year: d.year, dags: d.dags || null
    };
  }

  const state = {
    open: false,
    tab: 'gogn',
    notes: '',
    sites: [],
    derived: [],
    proposals: [],
    loading: false,
    proposing: false,
    err: '',
    lastApply: '',
    filter: '',
    showN: 25,
    emails: [],
    mailActions: []
  };

  function openItems() {
    const all = (window.VerkbordLiveItems && VerkbordLiveItems()) || [];
    return all.filter(isOpenItem);
  }
  function waitingMail() {
    return openItems().filter(r => {
      if (r.promoted_at || r.svarad_at) return false;
      if (!(r.source === 'email' || /^email:/.test(String(r.channel_ref || '')))) return false;
      if (window.Verkbord && Verkbord.matchesWorker && !Verkbord.matchesWorker(r)) return false;
      return true;
    }).length;
  }

  function injectCSS() {
    if (document.getElementById('vbai-css')) return;
    const s = document.createElement('style');
    s.id = 'vbai-css';
    s.textContent = `
      #vb-ai-slot { margin: 0 0 16px; }
      .vbai-card { border-radius:16px;border:1px solid rgba(20,24,34,.1);
        background:linear-gradient(180deg,#ffffff,#f5f7fb);
        box-shadow:0 16px 38px -20px rgba(15,23,42,.36),inset 0 2px 0 rgba(255,255,255,.95); }
      .vbai-bar { display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px; }
      .vbai-bar .vbai-title { font-size:14px;font-weight:800;color:#141822;letter-spacing:.01em; }
      .vbai-bar .vbai-sub { font-size:12px;color:#5b6472;flex:1;min-width:160px; }
      .vbai-badge { display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:99px;
        background:#be123c;color:#fff;font-size:11px;font-weight:800; }
      .vbai-badge.ok { background:#0f766e; }
      .vbai-btn { font:inherit;font-size:12.5px;font-weight:700;height:34px;padding:0 12px;border-radius:9px;
        cursor:pointer;border:1px solid rgba(20,24,34,.14);background:#fff;color:#1e293b; }
      .vbai-btn.go { background:linear-gradient(180deg,#182f61 0%,#1d3b7e 45%,#2b529f 80%,#4669b7 100%);
        color:#fff;border-color:#0a142a; }
      .vbai-btn:disabled { opacity:.55;cursor:default; }
      .vbai-body { padding:0 16px 16px; }
      .vbai-tabs { display:flex;gap:6px;margin-bottom:12px; }
      .vbai-tab { font:inherit;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;
        border:1px solid rgba(20,24,34,.12);background:#eef1f6;color:#334155; }
      .vbai-tab.on { background:#141822;color:#fff;border-color:#141822; }
      .vbai-row { display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #eef1f6; }
      .vbai-row label { flex:1;min-width:0;cursor:pointer; }
      .vbai-row .k { font-size:13px;font-weight:700;color:#141822; }
      .vbai-row .r { font-size:11.5px;color:#64748b;margin-top:2px; }
      .vbai-skip { opacity:.7; }
      .vbai-ta { width:100%;min-height:110px;box-sizing:border-box;border:1px solid rgba(20,24,34,.14);
        border-radius:9px;padding:10px 12px;font:inherit;font-size:13.5px;background:#eef1f6;color:#141822;resize:vertical; }
      .vbai-err { color:#be123c;font-size:12.5px;font-weight:600;margin:8px 0; }
      .vbai-hint { font-size:11.5px;color:#64748b;margin:0 0 10px;line-height:1.45; }
      @media (max-width:820px) {
        .vbai-bar { padding:10px 12px; }
        .vbai-body { padding:0 12px 12px; }
      }
    `;
    document.head.appendChild(s);
  }

  function derivedActions() {
    const open = openItems();
    return (state.derived || []).map(d => actionFromDerived(d, open));
  }
  function todoCount() {
    return derivedActions().filter(a => a.op === 'create').length;
  }

  function kindLabel(k) {
    if (k === 'vantar_reikning') return 'Rukka';
    if (k === 'vantar_skyrslu') return 'Skýrsla';
    if (k === 'email') return 'Póstur';
    if (k === 'email_thread') return 'Ítrekun';
    return k || '';
  }

  async function loadDerived() {
    const SB = getSB();
    if (!SB) { state.err = 'Engin gagnabankatenging'; return; }
    state.loading = true; state.err = ''; draw();
    try {
      const [fy, docs, sales] = await Promise.all([
        SB.from('fyrirtaeki').select('id,nafn,customer_base_id,er_i_thjonustu,kennitala').is('deleted_at', null).range(0, 2999),
        SB.from('customer_documents').select('id,fyrirtaeki_id,doc_date,created_at').eq('year', YEAR).eq('doc_type', 'uttektarskyrsla')
          .eq('is_duplicate', false).not('fyrirtaeki_id', 'is', null).range(0, 1999),
        SB.from('solur').select('id,customer_id,source,vidskiptategund,status,is_credit,created_at')
          .gte('created_at', YEAR + '-01-01T00:00:00').lt('created_at', (YEAR + 1) + '-01-01T00:00:00').range(0, 1999)
      ]);
      if (fy.error) throw fy.error;
      state.sites = fy.data || [];
      const reports = (docs && !docs.error && docs.data) ? docs.data : [];
      const rawSales = (sales && !sales.error && sales.data) ? sales.data : [];
      const invoices = rawSales.filter(s => {
        if (s.status && String(s.status) !== 'final') return false;
        if (s.is_credit) return false;
        const src = String(s.source || '');
        const vt = String(s.vidskiptategund || '');
        return src === 'uttekt' || vt === 'uttekt';
      });
      state.derived = deriveUttekt(state.sites, reports, invoices, YEAR);
    } catch (e) {
      state.err = 'Náði ekki gögnum: ' + (e.message || e);
    }
    state.loading = false;
    draw();
  }

  async function loadInbox() {
    const SB = getSB();
    if (!SB) { state.err = 'Engin gagnabankatenging'; return; }
    state.loading = true; state.err = ''; draw();
    try {
      if (!state.sites.length) {
        const fy = await SB.from('fyrirtaeki').select('id,nafn,customer_base_id,er_i_thjonustu,kennitala').is('deleted_at', null).range(0, 2999);
        if (fy.error) throw fy.error;
        state.sites = fy.data || [];
      }
      const r = await SB.from('email_digest')
        .select('id,sender_name,sender_email,subject,snippet,body_preview,received_at,folder')
        .eq('account', 'eldklar@eldklar.is')
        .ilike('folder', '%inbox%')
        .order('received_at', { ascending: false }).range(0, 79);
      if (r.error) throw r.error;
      state.emails = (r.data || []).filter(e => !/eldklar@eldklar/i.test(e.sender_email || ''));
      const open = openItems().slice(0, 80).map(it => ({
        id: it.id, title: it.title, type: it.type, tags: parseTags(it.tags),
        status: it.status, customer_nafn: it.customer_nafn, channel_ref: it.channel_ref,
        archived_at: it.archived_at
      }));
      const sites = state.sites.map(s => ({
        id: s.id, nafn: s.nafn, customer_base_id: s.customer_base_id, kennitala: s.kennitala
      }));
      const payload = {
        emails: state.emails.slice(0, 40).map(e => ({
          id: e.id, sender_name: e.sender_name, sender_email: e.sender_email,
          subject: e.subject, snippet: e.body_preview || e.snippet, folder: e.folder,
          received_at: e.received_at
        })),
        items: open,
        sites: sites.slice(0, 2500)
      };
      const res = await fetch('/api/verkbord-sync', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.error)) throw new Error((data && data.error) || ('HTTP ' + res.status));
      state.mailActions = Array.isArray(data.actions) ? data.actions : [];
    } catch (e) {
      state.err = 'Póstlesning: ' + (e.message || e);
      state.mailActions = [];
    }
    state.loading = false;
    draw();
  }

  function sitesForPrompt(notes) {
    const out = [];
    const seen = new Set();
    state.derived.forEach(f => {
      const s = state.sites.find(x => Number(x.id) === Number(f.fid));
      if (s && !seen.has(s.id)) { seen.add(s.id); out.push({ id: s.id, nafn: s.nafn, customer_base_id: s.customer_base_id }); }
    });
    const f = fold(notes);
    if (f.length >= 3) {
      state.sites.forEach(s => {
        if (seen.has(s.id)) return;
        const n = fold(s.nafn);
        if (!n) return;
        const words = n.split(' ').filter(w => w.length >= 4);
        if (n.indexOf(f) !== -1 || f.indexOf(n) !== -1 || words.some(w => f.indexOf(w) !== -1)) {
          seen.add(s.id);
          out.push({ id: s.id, nafn: s.nafn, customer_base_id: s.customer_base_id });
        }
      });
    }
    return out.slice(0, 80);
  }

  async function proposeFromNotes() {
    const notes = (state.notes || '').trim();
    if (!notes) { toast('Límdu fyrst minnisblað eða skrifaðu hvað á að gera'); return; }
    state.proposing = true; state.err = ''; state.proposals = []; draw();
    try {
      const open = openItems().slice(0, 80).map(it => ({
        id: it.id, title: it.title, type: it.type, tags: parseTags(it.tags),
        status: it.status, customer_nafn: it.customer_nafn, channel_ref: it.channel_ref
      }));
      const facts = state.derived.slice(0, 40);
      const r = await fetch('/api/verkbord-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes, items: open, facts, sites: sitesForPrompt(notes) })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || (data && data.error)) throw new Error((data && data.error) || ('HTTP ' + r.status));
      state.proposals = Array.isArray(data.actions) ? data.actions : [];
      if (!state.proposals.length) toast('Engin tillaga — textinn var of óljós eða verkið er þegar á borði');
    } catch (e) {
      state.err = 'Tillaga mistókst: ' + (e.message || e);
    }
    state.proposing = false;
    draw();
  }

  async function confirmApply(list, label) {
    if (!list.length) { toast('Ekkert valið'); return; }
    const nCreate = list.filter(a => a.op === 'create').length;
    const nClose = list.filter(a => a.op === 'close').length;
    const nNotes = list.filter(a => a.op === 'notes').length;
    const bitsMsg = [];
    if (nCreate) bitsMsg.push(nCreate + ' nýtt mál');
    if (nClose) bitsMsg.push(nClose + ' lokun');
    if (nNotes) bitsMsg.push(nNotes + ' nóta á opnu máli');
    const msg = label + '\n\n' +
      (bitsMsg.length ? bitsMsg.join(', ') : list.length + ' aðgerðir') +
      '.\nAI skrifar ekkert án þessa.';
    const ok = (window.Confirm && Confirm.show)
      ? await Confirm.show(msg, { okText: 'Vista á borð', cancelText: 'Hætta við' })
      : false;
    if (!ok) {
      if (!(window.Confirm && Confirm.show)) toast('Staðfestingargluggi vantar — ekkert skrifað');
      return;
    }
    if (!window.Verkbord || !Verkbord.applyActions) { toast('Borðið er ekki tilbúið'); return; }
    const res = await Verkbord.applyActions(list);
    const bits = [];
    if (res.created) bits.push(res.created + ' stofnuð');
    if (res.closed) bits.push(res.closed + ' lokuð');
    if (res.tagged) bits.push(res.tagged + ' merkt');
    if (res.notes) bits.push(res.notes + ' nótur');
    if (res.skipped) bits.push(res.skipped + ' hoppuð');
    state.lastApply = bits.length ? bits.join(', ') : 'ekkert breyttist';
    if (res.errors && res.errors.length) state.err = res.errors[0];
    toast('Borð uppfært: ' + state.lastApply);
    state.proposals = [];
    if (window.Verkbord.reload) await Verkbord.reload();
    if (state.tab === 'postar') await loadInbox();
    else await loadDerived();
  }

  function selectedFrom(root, name) {
    const out = [];
    root.querySelectorAll('input[data-vbai="' + name + '"]:checked').forEach(cb => {
      try { out.push(JSON.parse(cb.getAttribute('data-act'))); } catch (_) {}
    });
    return out;
  }

  function actionRow(a, name, i) {
    const onBoard = a.op === 'skip' || a.onBoard;
    const pickable = a.op === 'create' || a.op === 'notes';
    const checked = !onBoard && pickable && a.defaultOn === true;
    const payload = esc(JSON.stringify(a));
    const who = a.customer_nafn ? esc(a.customer_nafn) : 'óháð stað';
    const tags = (a.tags || a.add_tags || []).map(t => TAGS[t] || t).join(', ');
    const opLab = a.op === 'create' ? 'Nýtt' : a.op === 'close' ? 'Loka' : a.op === 'tag' ? 'Merki' : a.op === 'notes' ? 'Nóta' : 'Á borði';
    return '<div class="vbai-row' + (onBoard ? ' vbai-skip' : '') + '">' +
      (onBoard
        ? '<input type="checkbox" disabled>'
        : '<input type="checkbox" data-vbai="' + name + '" data-act="' + payload + '" data-i="' + i + '"' + (checked ? ' checked' : '') + '>') +
      '<label>' +
        '<div class="k">' + esc(opLab) + ' · ' + esc(a.title || a.nafn || '') + '</div>' +
        '<div class="r">' + who +
          (a.kind ? ' · ' + esc(kindLabel(a.kind)) : '') +
          (tags ? ' · ' + esc(tags) : '') +
          (a.dags ? ' · ' + esc(String(a.dags).slice(0, 10)) : '') +
          (a.reason ? ' — ' + esc(a.reason) : '') +
          (a.flokkur && FLOKKAR[a.flokkur] ? ' · ' + esc(FLOKKAR[a.flokkur]) : '') +
        '</div>' +
      '</label></div>';
  }

  function sortActs(list) {
    return (list || []).slice().sort((a, b) => String(b.dags || '').localeCompare(String(a.dags || '')));
  }
  function filteredCreates(creates) {
    const q = fold(state.filter);
    let list = sortActs(creates);
    if (q) list = list.filter(a => fold((a.customer_nafn || a.nafn || a.title || '')).indexOf(q) !== -1);
    return list;
  }
  function mailWork() {
    return (state.mailActions || []).filter(a => a.op === 'create' || a.op === 'notes');
  }
  function mailListHTML() {
    const work = mailWork();
    const skips = (state.mailActions || []).filter(a => a.op === 'skip' || a.onBoard);
    if (state.loading) return '<p class="vbai-hint">Les pósthólf…</p>';
    if (!state.mailActions.length) {
      return '<p class="vbai-hint">Aðeins INBOX. SENT (skýrslur sem við sendum, t.d. Norðurhella) eru ekki verk.</p>' +
        '<button type="button" class="vbai-btn" data-vbai="reload-mail">Lesa pósta</button>';
    }
    return '<p class="vbai-hint">Flokkað: afrit reiknings, teikningar, nýtt húsfélag, eftirfylgni. ' +
        'Ítrekun á opnu máli verður nóta, ekki nýtt mál. Ekkert nýtt mál er merkt sjálfkrafa.</p>' +
      (work.length
        ? '<div id="vbai-mail-rows">' + work.map((a, i) => actionRow(a, 'mail', i)).join('') + '</div>'
        : '<p class="vbai-hint">Engin ný verk í þessum 40 póstum.</p>') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
        (work.length ? '<button type="button" class="vbai-btn go" data-vbai="apply-mail">Setja valið á borð</button>' : '') +
        '<button type="button" class="vbai-btn" data-vbai="reload-mail">Lesa aftur</button>' +
      '</div>' +
      (skips.length ? '<p class="vbai-hint" style="margin-top:10px">' + skips.length + ' póstum sleppt (SENT, þegar á borði, eða óflokkað).</p>' : '');
  }

  function derListHTML(creates) {
    const list = filteredCreates(creates);
    const shown = list.slice(0, state.showN);
    if (!creates.length) {
      return '<p class="vbai-hint">Ekkert opið vantar-reikning / vantar-skýrslu ' + YEAR + ' (eða það er þegar á borði).</p>' +
        '<button type="button" class="vbai-btn" data-vbai="refresh">Endurlesa gögn</button>';
    }
    return '<input class="vbai-ta" id="vbai-filter" style="min-height:38px;margin-bottom:8px" ' +
        'placeholder="Leita að stað (Plaza, Grandi…)" value="' + esc(state.filter) + '">' +
      '<div id="vbai-rows">' + shown.map((a, i) => actionRow(a, 'der', i)).join('') + '</div>' +
      '<div id="vbai-morewrap">' +
        (list.length > shown.length
          ? '<button type="button" class="vbai-btn" data-vbai="more" style="margin-top:8px">Sýna fleiri (' + (list.length - shown.length) + ' eftir)</button>'
          : '') +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
        '<button type="button" class="vbai-btn go" data-vbai="apply-der">Setja valið á borð</button>' +
        '<button type="button" class="vbai-btn" data-vbai="refresh">Endurlesa gögn</button>' +
      '</div>';
  }

  function bodyHTML() {
    if (!state.open) return '';
    const wait = waitingMail();
    const acts = derivedActions();
    const creates = acts.filter(a => a.op === 'create');
    const skips = acts.filter(a => a.op === 'skip');
    let inner = '';
    if (state.tab === 'gogn') {
      inner =
        '<p class="vbai-hint">Þetta er staðan út frá úttektarskýrslum og úttektarreikningum ' + YEAR +
        ', stað fyrir stað. Center-hótel eru ekki sameinuð. Sending skýrslu er óvituð hér — ' +
        'Plaza/Arnarhvoll „eftir að senda“ fer í Minnisblað. Ekkert er skrifað fyrr en þú staðfestir.</p>' +
        (wait ? '<p class="vbai-hint">Pósthólf: ' + wait + ' ósvaraðir póstar eru þegar á borðinu (Bíður svars).</p>' : '') +
        (state.loading ? '<p class="vbai-hint">Sæki gögn…</p>' : '<div id="vbai-derlist">' + derListHTML(creates) + '</div>') +
        (skips.length ? '<p class="vbai-hint" style="margin-top:10px">' + skips.length + ' staðir þegar á borði (sleppt).</p>' : '');
    } else if (state.tab === 'postar') {
      inner =
        '<p class="vbai-hint">Sömu tegundir og raunverulegir póstar: vantar afrit, teikningar, nýtt húsfélag með kennitölu, eftirlit sem pípar. ' +
        'GreenKey án staðar í grunninum fær sendanda sem nafn, ekki gisk. Kjarrhólmi 14 er ekki sameinað við 18.</p>' +
        mailListHTML();
    } else {
      inner =
        '<p class="vbai-hint">Límdu minnisblað, listann af „senda / rukka / hringja", eða skrifaðu ' +
        't.d. „Plaza og Arnarhvoll eftir að senda skýrslu". AI leggur til mál — þú hakar og vistar.</p>' +
        '<textarea class="vbai-ta" id="vbai-notes" placeholder="Límdu minnisblað hér…">' + esc(state.notes) + '</textarea>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
          '<button type="button" class="vbai-btn go" data-vbai="propose"' + (state.proposing ? ' disabled' : '') + '>' +
            (state.proposing ? 'Hugsa…' : 'Leggja til á borðið') + '</button>' +
        '</div>' +
        (state.proposals.length
          ? '<div style="margin-top:14px">' +
              state.proposals.map((a, i) => actionRow(a, 'ai', i)).join('') +
              '<div style="margin-top:12px"><button type="button" class="vbai-btn go" data-vbai="apply-ai">Nota valið</button></div>' +
            '</div>'
          : '');
    }
    return '<div class="vbai-body">' +
      '<div class="vbai-tabs">' +
        '<button type="button" class="vbai-tab' + (state.tab === 'gogn' ? ' on' : '') + '" data-vbai="tab-gogn">Úr gögnum' +
          (todoCount() ? ' (' + todoCount() + ')' : '') + '</button>' +
        '<button type="button" class="vbai-tab' + (state.tab === 'postar' ? ' on' : '') + '" data-vbai="tab-postar">Póstar' +
          (mailWork().length ? ' (' + mailWork().length + ')' : '') + '</button>' +
        '<button type="button" class="vbai-tab' + (state.tab === 'minni' ? ' on' : '') + '" data-vbai="tab-minni">Minnisblað</button>' +
      '</div>' +
      (state.err ? '<div class="vbai-err">' + esc(state.err) + '</div>' : '') +
      (state.lastApply ? '<p class="vbai-hint">Síðast: ' + esc(state.lastApply) + '</p>' : '') +
      inner +
    '</div>';
  }

  function draw() {
    if (window.Verkbord && Verkbord.showOwnerChrome && !Verkbord.showOwnerChrome()) {
      const slot = document.getElementById('vb-ai-slot');
      if (slot) slot.innerHTML = '';
      return;
    }
    const slot = document.getElementById('vb-ai-slot');
    if (!slot) return;
    injectCSS();
    const n = todoCount();
    const wait = waitingMail();
    const sub = n
      ? (n + ' staðir vantar reikning eða skýrslu ' + YEAR)
      : (state.loading ? 'Sæki stöðu…' : 'Gögn, póstar og minnisblöð → mál á borðið, með staðfestingu');
    slot.innerHTML =
      '<div class="vbai-card">' +
        '<div class="vbai-bar">' +
          '<div class="vbai-title">AI borð</div>' +
          (n ? '<span class="vbai-badge">' + n + '</span>' : '<span class="vbai-badge ok">ok</span>') +
          '<div class="vbai-sub">' + esc(sub) +
            (wait ? ' · ' + wait + ' ósvaraðir póstar' : '') + '</div>' +
          '<button type="button" class="vbai-btn" data-vbai="toggle">' + (state.open ? 'Fela' : 'Sýna') + '</button>' +
        '</div>' +
        bodyHTML() +
      '</div>';
    wire(slot);
  }

  function wire(slot) {
    slot.onclick = async function (e) {
      const t = e.target.closest('[data-vbai]'); if (!t) return;
      const act = t.getAttribute('data-vbai');
      if (act === 'toggle') {
        state.open = !state.open;
        if (state.open && !state.derived.length && !state.loading) loadDerived();
        else draw();
        return;
      }
      if (act === 'tab-gogn') { state.tab = 'gogn'; draw(); return; }
      if (act === 'tab-postar') {
        state.tab = 'postar';
        draw();
        if (!state.mailActions.length && !state.loading) loadInbox();
        return;
      }
      if (act === 'tab-minni') { state.tab = 'minni'; draw(); return; }
      if (act === 'refresh') { loadDerived(); return; }
      if (act === 'reload-mail') { loadInbox(); return; }
      if (act === 'more') { state.showN += 25; draw(); return; }
      if (act === 'propose') {
        const ta = document.getElementById('vbai-notes');
        if (ta) state.notes = ta.value;
        proposeFromNotes();
        return;
      }
      if (act === 'apply-der') {
        confirmApply(selectedFrom(slot, 'der'), 'Setja valin mál úr gögnum á Þjónustuborðið?');
        return;
      }
      if (act === 'apply-mail') {
        confirmApply(selectedFrom(slot, 'mail'), 'Setja valda pósta á Þjónustuborðið?');
        return;
      }
      if (act === 'apply-ai') {
        confirmApply(selectedFrom(slot, 'ai'), 'Nota valdar AI-tillögur og skrifa á Þjónustuborðið?');
        return;
      }
    };
    slot.oninput = function (e) {
      const el = e.target;
      if (!el) return;
      if (el.id === 'vbai-notes') { state.notes = el.value; return; }
      if (el.id === 'vbai-filter') {
        state.filter = el.value;
        state.showN = 25;
        const creates = derivedActions().filter(a => a.op === 'create');
        const list = filteredCreates(creates);
        const shown = list.slice(0, state.showN);
        const rows = document.getElementById('vbai-rows');
        if (rows) rows.innerHTML = shown.map((a, i) => actionRow(a, 'der', i)).join('');
        const more = document.getElementById('vbai-morewrap');
        if (more) {
          more.innerHTML = list.length > shown.length
            ? '<button type="button" class="vbai-btn" data-vbai="more" style="margin-top:8px">Sýna fleiri (' + (list.length - shown.length) + ' eftir)</button>'
            : '';
        }
      }
    };
  }

  function mount() {
    if (window.Verkbord && Verkbord.showOwnerChrome && !Verkbord.showOwnerChrome()) {
      const slot = document.getElementById('vb-ai-slot');
      if (slot) slot.innerHTML = '';
      return;
    }
    const slot = document.getElementById('vb-ai-slot');
    if (!slot) return;
    draw();
    if (state.open && !state.derived.length && !state.loading && getSB()) loadDerived();
  }

  window.VerkbordAi = { mount, open: function () { state.open = true; mount(); if (!state.derived.length) loadDerived(); }, close: function () { state.open = false; draw(); } };
  console.log('[patch-343] VerkbordAi installed');
})();
/* === END VERKBORD AI === */
