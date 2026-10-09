/* === TÖLVUPÓSTAR (448) — 09.10.2026 ===========================================
 *
 * Agnar: „bæta við í Þjónustuborð ham sem er tölvupóstar með eldklar@eldklar.is og bokhald@eldklar.is, sem ég sjái bara
 * tölvupóstana. Að merkingarnar og labels komi með. Og ég geti svarað þaðan, með líka aðstoð. Stjarna sem lætur þau birtast
 * efst sem þú ert búinn að undirbúa svör og finna skýrslu eða hvað sem er verið að biðja um. Eða samþykkt sem ég get valið:
 * Samþykkt · Í vinnslu — þú þá gerir það sem þarf að gera. Ég kem aftur og get þá svarað póstinum. Útbúa líka sér öpp-útgáfu."
 *
 * HVAÐ ÞETTA ER: hamurinn „Tölvupóstar" á Þjónustuborði 2 (368) — ÞRÆÐIR úr email_digest, hólfin tvö, 60 dagar, með Gmail-
 * merkjunum, kúnnanum (381 KunnaLeit), tengda málinu á borðinu og svarinu beint í þræðinum. Rými (rymi) eins og Samþykkja:
 * listi vinstra megin (dreganlegur í breidd, sömu klasar og 368), valinn þráður hægra megin. Þessi skrá á GÖGNIN, teikninguna
 * og aðgerðirnar; 368 á aðeins ham-færsluna, hamtöluna og dreifinguna (data-t5="tp-*" → Tolvupostar.smellur). Símasíðan er 449.
 *
 * HLUTARNIR (hvar þráður lendir — reiknað, aldrei geymt):
 *   ★ Tilbúið að svara   málið ber merkið `undirbuid` — Claude er búinn að undirbúa (uppkast / skjal / svar) og Agnar svarar.
 *   Hjá Claude           málið ber svar:samthykkt | svar:vinnsla | svar:endurmeta og er ekki lokað — Claude á verkið.
 *   Bíður svars          síðasta skeyti þráðarins er frá þeim, ekkert sent á eftir, engin „svarað"-skráning, ekki 🟢 Lokið.
 *   Svarað · lokið       allt hitt — falið sjálfgefið, „sýna" nær því.
 *
 * SAMNINGURINN VIÐ CLAUDE (lotan sem vinnur úr „Hjá Claude"): málið er thjonustubeidni með channel_ref 'email:<email_digest.id>'
 * (sama og innsogið 11.09 notar). Þegar verkinu er lokið skrifar Claude uppkastið að svarinu í `notes` á eftir línu sem er
 * nákvæmlega `---SVAR---` (sama afmörkun og postur-reply.js) og bætir merkinu `undirbuid` við tags. Þá lyftist þráðurinn í ★
 * og uppkastið er forfyllt í svarreitinn hér. Skjöl sem fundust fara á málið (thjonustubeidni_files) eða eru nefnd í nótunni.
 * Svarið sjálft sendir AÐEINS Agnar — héðan, með 📤. Við sendingu: reikninga_postur_activity (sama „svarað"-skráning og
 * 240/368), svarad_at á málið, `undirbuid` tekið af. Hrátt módelsvar lendir aldrei í reitnum nema lesið (postur-reply 502 á
 * villu — feedback_hratt_modelsvar).
 *
 * Skrifleiðir (allar á þjóninn): thjonustubeidni (insert/patch tags·status·notes·svarad_at), reikninga_postur_activity (insert),
 * reikninga_postur_hidden (upsert/delete, sama tafla og 240 — felur í BÁÐUM). Sending: AppMail.send (254 → brunaholf gmail-send,
 * `from` = hólfið sem tók við póstinum, inReplyTo = message_id). Uppkast: POST /api/postur-reply (SV-19 í Svar-stöð).
 * Útlitsval eins vafra í localStorage `tolvupostar_sia` (hólf · röðun · sía) — leyfilegt skv. CLAUDE.md (sía/röðun).
 * ========================================================================== */
(() => {
  if (window.__tolvupostar448) return;
  window.__tolvupostar448 = true;

  const HOLF = ['eldklar@eldklar.is', 'bokhald@eldklar.is'];
  const DAGAR = 60;
  const BH = 'https://brunaholf.netlify.app';
  const SIA_LYKILL = 'tolvupostar_sia';
  const LOKID = '🟢 Lokið';
  const sb = () => (window.DB && DB.sb) || null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ts = s => { const n = Date.parse(s || ''); return isFinite(n) ? n : 0; };
  const nu = () => { try { return (window.Samthykkja && Samthykkja.nu()) || (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const p2 = n => String(n).padStart(2, '0');
  const dags = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const kl = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const dagarSidan = iso => Math.max(0, Math.floor((Date.now() - ts(iso)) / 864e5));
  const stuttHolf = a => String(a || '').split('@')[0];
  const toast = (m, w) => { try { if (window.Bord368 && Bord368.toast) return Bord368.toast(m, w); } catch (_) {} try { if (window.App && App.toast) return App.toast(m); } catch (_) {} console[w ? 'warn' : 'log']('[448] ' + m); };
  // Það sem lítur út eins og beiðni um skjal — MERKI, ekki sía (21.09: sía sem fellir póst þegjandi er verri en langur listi).
  const BEIDNI_RE = /reikning|sk[ýy]rsl|sta[ðd]festing|[úu]ttekt|tilbo[ðd]|kvittun|yfirlit|vottor[ðd]|senda m[ée]r|geti[ðd] [þt]i[ðd] sent|sendi[ðd] m[ée]r|afrit/i;
  // Gmail-merki sem Gmail setur sjálft — geymd, ekki sýnd (sama regla og 240 merkiEigin).
  const KERFISMERKI = /^(CATEGORY_|IMPORTANT$|STARRED$|UNREAD$|INBOX$|SENT$|DRAFT$|SPAM$|TRASH$|CHAT$)/;
  const STJORNUR = { STARRED: '★', YELLOW_STAR: '★', BLUE_STAR: '★', RED_STAR: '★', GREEN_STAR: '★', ORANGE_STAR: '★', PURPLE_STAR: '★', GREEN_CIRCLE: '●', BLUE_CIRCLE: '●', RED_CIRCLE: '●', ORANGE_CIRCLE: '●', PURPLE_CIRCLE: '●', YELLOW_CIRCLE: '●' };
  const STJ_LITUR = { YELLOW_STAR: '#d4a017', BLUE_STAR: '#2f6fb3', RED_STAR: '#c0392b', GREEN_STAR: '#2f7a4a', ORANGE_STAR: '#d2691e', PURPLE_STAR: '#7b4fa0', GREEN_CIRCLE: '#2f7a4a', BLUE_CIRCLE: '#2f6fb3', RED_CIRCLE: '#c0392b', ORANGE_CIRCLE: '#d2691e', PURPLE_CIRCLE: '#7b4fa0', YELLOW_CIRCLE: '#d4a017', STARRED: '#d4a017' };

  const S = {
    loaded: false, loading: false, loadedAt: null, villa: null, _p: null,
    postar: [], activity: new Set(), hidden: new Set(), mal: new Map(), thraedir: [],
    valinn: null, svarOpid: null, claudeOpid: null, synaLokid: false, synaFalid: false,
    drog: {}, efni: {}, sky: {}, busy: {},
    sia: { holf: 'baedi', rodun: 'nyjast', osvarad: false, beidnir: false, vidhengi: false, merki: '' },
    _eftir: []
  };
  try { const v = JSON.parse(localStorage.getItem(SIA_LYKILL) || '{}'); ['holf', 'rodun'].forEach(k => { if (v[k]) S.sia[k] = v[k]; }); } catch (_) {}
  const vistaSiu = () => { try { localStorage.setItem(SIA_LYKILL, JSON.stringify({ holf: S.sia.holf, rodun: S.sia.rodun })); } catch (_) {} };
  const notify = () => { try { if (window.Bord368 && Bord368.render) Bord368.render(); } catch (_) {} S._eftir.forEach(f => { try { f(); } catch (_) {} }); };

  /* ── GÖGN ─────────────────────────────────────────────────────────── */
  async function load(thvinga) {
    if (S.loading && S._p) return S._p;
    const c = sb();
    if (!c) { S.villa = 'Engin tenging við gagnagrunn'; notify(); return; }
    S.loading = true; S.villa = null; notify();
    const fra = new Date(Date.now() - DAGAR * 864e5).toISOString();
    S._p = (async () => {
      try {
        const [p, a, h, m] = await Promise.all([
          c.from('email_digest').select('id,message_id,account,folder,thread_id,sender_name,sender_email,to_addresses,subject,snippet,body_preview,received_at,labels,has_attachment,attachment_names,is_question')
            .in('account', HOLF).gte('received_at', fra).order('received_at', { ascending: false }).limit(1000),
          c.from('reikninga_postur_activity').select('message_id,kind').limit(1000),
          c.from('reikninga_postur_hidden').select('message_id').limit(1000),
          c.from('thjonustubeidni').select('id,title,status,tags,notes,channel_ref,assigned_to,svarad_at,fyrirtaeki_id,customer_nafn,updated_at,created_by,created_at')
            .like('channel_ref', 'email:%').is('deleted_at', null).order('created_at', { ascending: false }).limit(1000)
        ]);
        if (p.error) throw p.error;
        S.postar = p.data || [];
        S.activity = new Set(((a.data) || []).map(x => x.message_id));
        S.hidden = new Set(((h.data) || []).map(x => x.message_id));
        S.mal = new Map();
        ((m.data) || []).forEach(r => { const id = String(r.channel_ref || '').slice(6); if (id && !S.mal.has(id)) S.mal.set(id, r); });
        try { if (window.KunnaLeit && !KunnaLeit.hladid() && KunnaLeit.hlada) await KunnaLeit.hlada(); } catch (_) {}
        S.thraedir = byggjaThraedi(S.postar);
        S.loaded = true; S.loadedAt = new Date();
      } catch (e) {
        S.villa = (e && e.message) || String(e);
      } finally {
        S.loading = false; S._p = null; notify();
      }
    })();
    return S._p;
  }
  const efniLykill = s => String(s || '').replace(/^\s*((re|sv|fwd?|fw|vs|aw)\s*:\s*)+/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
  function byggjaThraedi(postar) {
    const hopar = new Map();
    postar.forEach(m => {
      const k = m.thread_id || (String(m.sender_email || '').toLowerCase() + '|' + (efniLykill(m.subject) || m.message_id || m.id));
      if (!hopar.has(k)) hopar.set(k, []);
      hopar.get(k).push(m);
    });
    const ut = [];
    hopar.forEach((msgs, k) => {
      msgs.sort((x, y) => ts(x.received_at) - ts(y.received_at));
      const inn = msgs.filter(x => x.folder !== 'SENT');
      if (!inn.length) return;                                   // þráður sem við hófum og enginn svaraði — ekki „póstur til okkar"
      const sidastaInn = inn[inn.length - 1], sidasta = msgs[msgs.length - 1];
      const sentEftir = msgs.some(x => x.folder === 'SENT' && ts(x.received_at) > ts(sidastaInn.received_at));
      const merki = new Set(), stj = new Set();
      msgs.forEach(x => (x.labels || []).forEach(l => { if (STJORNUR[l]) stj.add(l); else if (!KERFISMERKI.test(l)) merki.add(l); }));
      const vidh = []; msgs.forEach(x => (Array.isArray(x.attachment_names) ? x.attachment_names : []).forEach(n => { if (n && vidh.indexOf(n) < 0) vidh.push(n); }));
      let mal = null; for (let i = inn.length - 1; i >= 0 && !mal; i--) mal = S.mal.get(String(inn[i].id)) || null;
      const tags = (mal && Array.isArray(mal.tags) ? mal.tags : []).filter(t => typeof t === 'string');
      const svarTag = tags.find(t => /^svar:(samthykkt|vinnsla|endurmeta)$/.test(t)) || null;
      const lokid = merki.has(LOKID);
      const svarad = sentEftir || S.activity.has(sidastaInn.message_id) || !!(mal && mal.svarad_at && ts(mal.svarad_at) > ts(sidastaInn.received_at));
      const falid = inn.every(x => S.hidden.has(x.message_id));
      let kunni = null;
      try { if (window.KunnaLeit && KunnaLeit.hladid()) kunni = KunnaLeit.finna(sidastaInn, postar); } catch (_) {}
      const texti = (sidastaInn.subject || '') + ' ' + (sidastaInn.snippet || '') + ' ' + (sidastaInn.body_preview || '').slice(0, 600);
      const hluti = tags.indexOf('undirbuid') >= 0 ? 'undirbuid'
        : (svarTag && mal.status !== 'lokad') ? 'claude'
        : (!svarad && !lokid && sidasta.folder !== 'SENT') ? 'bidur' : 'buid';
      ut.push({ k, msgs, inn, sidastaInn, sidasta, merki: [...merki], stjornur: [...stj], vidhengi: vidh, mal, tags, svarTag, lokid, svarad, falid, kunni, hluti,
        beidni: BEIDNI_RE.test(texti), mikilv: stj.size > 0 || msgs.some(x => (x.labels || []).indexOf('IMPORTANT') >= 0) || !!(mal && mal.important),
        account: sidastaInn.account, nafn: sidastaInn.sender_name || sidastaInn.sender_email || '—', netfang: sidastaInn.sender_email || '',
        efni: sidastaInn.subject || '(ekkert efni)', timi: sidastaInn.received_at, fjoldi: msgs.length });
    });
    ut.sort((a, b) => ts(b.timi) - ts(a.timi));
    return ut;
  }
  const HLUTAR = [['undirbuid', '★ Tilbúið að svara — Claude undirbjó', '_gull'], ['claude', 'Hjá Claude', '_claude'], ['bidur', 'Bíður svars', ''], ['buid', 'Svarað · lokið', '_ok']];
  const HLUTA_L = Object.fromEntries(HLUTAR.map(h => [h[0], h[1]]));
  function siad() {
    const s = S.sia;
    let l = S.thraedir.filter(t => S.synaFalid ? t.falid : !t.falid);
    if (s.holf !== 'baedi') l = l.filter(t => stuttHolf(t.account) === s.holf);
    if (s.osvarad) l = l.filter(t => t.hluti !== 'buid');
    if (s.beidnir) l = l.filter(t => t.beidni);
    if (s.vidhengi) l = l.filter(t => t.vidhengi.length);
    if (s.merki) l = l.filter(t => s.merki === '★' ? t.stjornur.length : t.merki.indexOf(s.merki) >= 0);
    if (s.rodun === 'elst') l = l.slice().sort((a, b) => ts(a.timi) - ts(b.timi));
    else if (s.rodun === 'mikilv') l = l.slice().sort((a, b) => ((b.mikilv ? 1 : 0) - (a.mikilv ? 1 : 0)) || ts(b.timi) - ts(a.timi));
    else if (s.rodun === 'fjoldi') l = l.slice().sort((a, b) => (b.fjoldi - a.fjoldi) || ts(b.timi) - ts(a.timi));
    return l;
  }
  const hlutaListi = (l, h) => l.filter(t => t.hluti === h);
  const merkjaTalning = () => { const c = {}; S.thraedir.filter(t => !t.falid).forEach(t => { t.merki.forEach(m => { c[m] = (c[m] || 0) + 1; }); if (t.stjornur.length) c['★'] = (c['★'] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
  const finna = k => S.thraedir.find(t => t.k === k) || null;
  const valinn = () => { const l = siad(); let t = S.valinn && finna(S.valinn); if (!t || l.indexOf(t) < 0) { t = l[0] || null; S.valinn = t ? t.k : null; } return t; };
  // Uppkastið sem Claude skildi eftir í nótu málsins: allt á eftir SÍÐUSTU línunni `---SVAR---`.
  function uppkastUrNotu(mal) {
    const n = String((mal && mal.notes) || '');
    const i = n.lastIndexOf('---SVAR---');
    return i < 0 ? '' : n.slice(i + 10).trim();
  }
  const notaAnUppkasts = mal => { const n = String((mal && mal.notes) || ''); const i = n.lastIndexOf('---SVAR---'); return (i < 0 ? n : n.slice(0, i)).trim(); };
  const svarEfni = t => S.efni[t.k] != null ? S.efni[t.k] : (/^\s*re:/i.test(t.efni) ? t.efni : 'Re: ' + t.efni);
  const svarTexti = t => S.drog[t.k] != null ? S.drog[t.k] : uppkastUrNotu(t.mal);
  const gmailSlod = t => 'https://mail.google.com/mail/u/?authuser=' + encodeURIComponent(t.account) + '#all/' + encodeURIComponent(t.sidastaInn.thread_id || '');
  const textiIHtml = s => '<div style="font:14px/1.55 system-ui,sans-serif;color:#111;white-space:pre-wrap">' + esc(s) + '</div>';

  /* ── SKRIF ─────────────────────────────────────────────────────────── */
  async function adgerd(t, fn) {
    if (S.busy[t.k]) return;
    S.busy[t.k] = 1; notify();
    try { await fn(); } catch (e) { toast('Vistaðist ekki: ' + ((e && e.message) || e), true); }
    delete S.busy[t.k];
    await load(true);
  }
  const stimpill = () => { const d = new Date(); return nu() + ' · ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + ' kl. ' + kl(d); };
  async function nyttMal(t, extra) {
    const c = sb();
    const m = t.sidastaInn;
    const rod = Object.assign({
      title: ('✉ ' + (m.subject || '(ekkert efni)')).slice(0, 140),
      notes: '✉ ' + (m.sender_name || '') + ' <' + (m.sender_email || '') + '> · ' + dags(m.received_at) + ' · ' + stuttHolf(m.account) + '@\n' + String(m.body_preview || m.snippet || '').slice(0, 1500),
      source: 'email', type: 'email', channel_ref: 'email:' + m.id, status: 'nytt', tags: [], created_by: nu(), assigned_to: nu(),
      fyrirtaeki_id: (t.kunni && t.kunni.coId) || null, customer_nafn: (t.kunni && t.kunni.nafn) || null, important: false
    }, extra || {});
    const r = await c.from('thjonustubeidni').insert(rod).select('id').limit(1);
    if (r.error) throw r.error;
    return r.data && r.data[0];
  }
  async function patchMal(mal, patch) {
    const c = sb();
    const r = await c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', mal.id).select('id');
    if (r.error) throw r.error;
    if (!r.data || !r.data.length) throw new Error('Málið fannst ekki (#' + mal.id + ')');
  }
  // ▶ Í vinnslu / ✓ Samþykkt → Claude. Með samthykki-merki fer svarið SÖMU leið og á Samþykkja-borðinu (svaraSamthykki);
  // annars eru merkið og staðan skrifuð hér; vanti málið er það stofnað á póstinn.
  async function tilClaude(t, v, sky) {
    const stada = v === 'samthykkt' ? 'tilbuid' : 'i_vinnslu', l = v === 'samthykkt' ? 'Samþykkt' : 'Sett í vinnslu';
    const nota = '— ' + l + ' (Tölvupóstar): ' + stimpill() + (sky ? '\n' + sky : '');
    if (t.mal && t.tags.indexOf('samthykki') >= 0 && window.Samthykkja && Samthykkja.svara) { await Samthykkja.svara(t.mal.id, v, sky || ''); return; }
    if (t.mal) {
      const tags = t.tags.filter(x => x !== 'samthykki' && !/^svar:/.test(x)).concat(['svar:' + v]);
      await patchMal(t.mal, { tags, status: stada, notes: (String(t.mal.notes || '').trim() + '\n\n' + nota).trim() });
    } else {
      await nyttMal(t, { tags: ['svar:' + v], status: stada, notes: undefined });
      const m = t.sidastaInn;
      const r = await sb().from('thjonustubeidni').select('id,notes').eq('channel_ref', 'email:' + m.id).is('deleted_at', null).order('id', { ascending: false }).limit(1);
      const nytt = r.data && r.data[0];
      if (nytt) await patchMal(nytt, { notes: (String(nytt.notes || '').trim() + '\n\n' + nota).trim() });
    }
    delete S.sky[t.k];
  }
  async function stjarna(t) {
    if (t.mal) {
      const a = t.tags.indexOf('undirbuid') >= 0;
      await patchMal(t.mal, { tags: a ? t.tags.filter(x => x !== 'undirbuid') : t.tags.concat(['undirbuid']) });
    } else {
      await nyttMal(t, { tags: ['undirbuid'] });
    }
  }
  async function merkjaSvarad(t) {
    const c = sb();
    const r = await c.from('reikninga_postur_activity').insert({ message_id: t.sidastaInn.message_id, kind: 'reply' });
    if (r.error) throw r.error;
    if (t.mal) await patchMal(t.mal, { svarad_at: new Date().toISOString(), tags: t.tags.filter(x => x !== 'undirbuid'), status: t.mal.status === 'nytt' ? 'i_vinnslu' : t.mal.status });
  }
  async function fela(t, afhylja) {
    const c = sb();
    const ids = t.inn.map(x => x.message_id).filter(Boolean);
    const r = afhylja ? await c.from('reikninga_postur_hidden').delete().in('message_id', ids)
      : await c.from('reikninga_postur_hidden').upsert(ids.map(id => ({ message_id: id })), { onConflict: 'message_id' });
    if (r.error) throw r.error;
  }
  async function semja(t) {
    const m = t.sidastaInn;
    const res = await fetch('/api/postur-reply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      email: { sender_name: m.sender_name || '', sender_email: m.sender_email || '', subject: m.subject || '', body: m.body_preview || m.snippet || '' },
      customer: t.kunni ? { name: t.kunni.nafn || '', kt: t.kunni.kt || '' } : null, invoices: [], instruction: S.sky[t.k] || '' }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j || !j.body) throw new Error((j && (j.error || j.detail)) || ('Uppkastið kom ekki (' + res.status + ')'));
    S.drog[t.k] = String(j.body); if (j.subject) S.efni[t.k] = String(j.subject);
    if (j.summary) toast('Uppkast: ' + j.summary);
  }
  async function senda(t) {
    const texti = String(svarTexti(t) || '').trim();
    if (!texti) throw new Error('Svarið er tómt');
    if (!t.netfang) throw new Error('Enginn viðtakandi á þræðinum');
    if (!window.AppMail || !AppMail.send) throw new Error('Sendingin (254 AppMail) er ekki hlaðin');
    const r = await AppMail.send({ from: t.account, to: [t.netfang], subject: svarEfni(t), html: textiIHtml(texti), inReplyTo: t.sidastaInn.message_id || undefined });
    const j = r && r.json ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok || (j && j.ok === false)) throw new Error((j && (j.error || j.message)) || 'Pósturinn fór ekki');
    await merkjaSvarad(t);
    delete S.drog[t.k]; delete S.efni[t.k]; S.svarOpid = null;
    toast('Svar sent til ' + t.netfang + (j && j.threaded ? ' · í sama þræði' : ''));
  }
  async function saekjaNyjan() {
    const koll = [];
    HOLF.forEach(a => ['', '&folder=sent'].forEach(f => koll.push(fetch(BH + '/api/gmail-ingest?account=' + encodeURIComponent(a) + '&days=3' + f).then(r => r.json()).catch(() => null))));
    const sv = await Promise.all(koll);
    const nyir = sv.reduce((n, x) => n + ((x && x.nyir) || 0), 0), bilad = sv.some(x => !x || x.ok === false);
    await load(true);
    toast(bilad ? '⚠️ Náði ekki í Gmail að fullu — listinn sýnir það sem þjónninn á' : (nyir ? nyir + ' nýir póstar' : 'Ekkert nýtt'));
  }

  /* ── TEIKNING — TÖLVAN (rými í 368, sömu klasar og Samþykkja) ─────── */
  const chip = (a, v, on, texti, title) => '<button type="button" data-t5="tp-' + a + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + texti + '</button>';
  function merkiHtml(t, allt) {
    const m = [];
    t.stjornur.forEach(s => m.push('<span class="tp-m tp-stj" style="color:' + (STJ_LITUR[s] || '#d4a017') + '">' + STJORNUR[s] + '</span>'));
    (allt ? t.merki : t.merki.slice(0, 3)).forEach(l => m.push('<span class="tp-m' + (l === LOKID ? ' _lokid' : '') + '">' + esc(l) + '</span>'));
    if (!allt && t.merki.length > 3) m.push('<span class="tp-m">+' + (t.merki.length - 3) + '</span>');
    if (t.vidhengi.length) m.push('<span class="tp-m" title="' + esc(t.vidhengi.join(', ')) + '">📎 ' + t.vidhengi.length + '</span>');
    if (t.beidni) m.push('<span class="tp-m _beidni">✉ beiðni</span>');
    if (t.mal) m.push('<span class="tp-m _mal">📋 #' + t.mal.id + ' · ' + esc(t.mal.status || '') + '</span>');
    if (t.svarTag) m.push('<span class="tp-m _claude">' + esc(t.svarTag === 'svar:samthykkt' ? 'Samþykkt · bíður Claude' : t.svarTag === 'svar:vinnsla' ? 'Í vinnslu hjá Claude' : 'Skýring · Claude endurmetur') + '</span>');
    if (t.kunni) m.push('<span class="tp-m _kunni">' + esc(t.kunni.nafn || '') + '</span>');
    return m.join('');
  }
  function rodHtml(t, val) {
    return '<button type="button" class="vbr-item tp-rod' + (t.hluti === 'buid' ? ' svarad' : '') + '" data-t5="tp-velja" data-v="' + esc(t.k) + '" aria-current="' + (val && val.k === t.k) + '">' +
      '<span class="tp-l1"><span class="tp-fra">' + esc(t.nafn) + '</span><span class="tp-holf _' + esc(stuttHolf(t.account)) + '">' + esc(stuttHolf(t.account)) + '</span><time>' + esc(dags(t.timi).slice(0, 5)) + (t.fjoldi > 1 ? ' · ' + t.fjoldi : '') + '</time></span>' +
      '<b>' + esc(t.efni) + '</b><span class="s">' + esc(String(t.sidastaInn.snippet || '').slice(0, 130)) + '</span>' +
      '<span class="tp-merki">' + merkiHtml(t, false) + '</span></button>';
  }
  function skeytiHtml(x) {
    const okkar = x.folder === 'SENT';
    return '<article class="tp-skeyti' + (okkar ? ' _okkar' : '') + '"><header><b>' + (okkar ? 'Við · ' + esc(stuttHolf(x.account)) + '@' : esc(x.sender_name || x.sender_email || '')) + '</b>' +
      (okkar ? '<span class="s">til ' + esc(String(x.to_addresses || '').slice(0, 80)) + '</span>' : '<span class="s">' + esc(x.sender_email || '') + '</span>') +
      '<time>' + esc(dags(x.received_at)) + ' kl. ' + esc(kl(x.received_at)) + '</time></header>' +
      '<div class="tp-texti">' + esc(x.body_preview || x.snippet || '(ekkert meginmál sótt — opna í Gmail)') + '</div>' +
      ((Array.isArray(x.attachment_names) && x.attachment_names.length) ? '<div class="tp-vidh">📎 ' + esc(x.attachment_names.join(' · ')) + '</div>' : '') + '</article>';
  }
  function malHtml(t) {
    if (!t.mal) return '';
    const n = notaAnUppkasts(t.mal), u = uppkastUrNotu(t.mal);
    return '<section class="tp-mal"><header><b>📋 Mál #' + t.mal.id + ' · ' + esc(t.mal.status || '') + (t.mal.assigned_to ? ' · ' + esc(t.mal.assigned_to) : '') + '</b>' +
      '<button type="button" class="btn iv sm" data-t5="tp-bord" data-v="' + esc(t.k) + '">Opna á borðinu ›</button></header>' +
      (n ? '<div class="tp-nota">' + esc(n.slice(0, 1600)) + '</div>' : '') +
      (u ? '<div class="tp-uppk"><b>★ Uppkast frá Claude — forfyllt í svarreitinn</b>' + esc(u.slice(0, 300)) + (u.length > 300 ? '…' : '') + '</div>' : '') + '</section>';
  }
  function svarHtml(t) {
    const opid = S.svarOpid === t.k, b = !!S.busy[t.k];
    if (!opid) return '';
    return '<section class="tp-svar"><header><b>↩ Svar · fer frá ' + esc(t.account) + ' · til ' + esc(t.netfang) + '</b></header>' +
      '<input class="tp-inp" data-tp-in="efni" data-v="' + esc(t.k) + '" value="' + esc(svarEfni(t)) + '" aria-label="Efni">' +
      '<textarea class="tp-ta" data-tp-in="drog" data-v="' + esc(t.k) + '" rows="9" placeholder="Svarið — yfirfarðu áður en þú sendir. ✨ Semja sækir uppkast; skýringin hér að neðan stýrir því.">' + esc(svarTexti(t)) + '</textarea>' +
      '<input class="tp-inp" data-tp-in="sky" data-v="' + esc(t.k) + '" value="' + esc(S.sky[t.k] || '') + '" placeholder="Stýring á uppkastið (valfrjálst): t.d. „segðu að skýrslan fylgi á morgun“">' +
      '<div class="tp-takkar"><button type="button" class="btn iv sm" data-t5="tp-semja" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>✨ Semja uppkast</button>' +
      '<button type="button" class="btn iv sm tp-graen" data-t5="tp-senda" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>📤 Senda svar</button>' +
      '<button type="button" class="btn iv sm" data-t5="tp-haetta" data-v="' + esc(t.k) + '">Hætta við</button></div></section>';
  }
  function claudeHtml(t) {
    if (S.claudeOpid !== t.k) return '';
    const b = !!S.busy[t.k];
    return '<section class="tp-claude"><header><b>Til Claude — hvað á að gera?</b><span class="s">Claude vinnur verkið, setur ★ þegar svarið er tilbúið, og þú sendir það héðan.</span></header>' +
      '<textarea class="tp-ta" data-tp-in="sky" data-v="' + esc(t.k) + '" rows="3" placeholder="T.d. „finna úttektarskýrsluna 2026 og semja svar“ — má vera autt">' + esc(S.sky[t.k] || '') + '</textarea>' +
      '<div class="tp-takkar"><button type="button" class="btn iv sm" data-t5="tp-claude" data-v="vinnsla" data-k="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>▶ Í vinnslu hjá Claude</button>' +
      '<button type="button" class="btn iv sm tp-gull" data-t5="tp-claude" data-v="samthykkt" data-k="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>✓ Samþykkt — Claude klárar</button></div></section>';
  }
  function thradurHtml(t) {
    if (!t) return '<div class="empty"><span class="coin" aria-hidden="true"></span>Veldu þráð til vinstri.</div>';
    const b = !!S.busy[t.k], stj = t.tags.indexOf('undirbuid') >= 0;
    return '<div class="tp-haus"><div class="vbr-meta">' + esc(HLUTA_L[t.hluti]) + ' · ' + esc(stuttHolf(t.account)) + '@ · ' + esc(dags(t.timi)) + ' · ' + dagarSidan(t.timi) + ' d.' + (t.fjoldi > 1 ? ' · ' + t.fjoldi + ' skeyti' : '') + '</div>' +
      '<h1 class="vbr-titill">' + esc(t.efni) + '</h1>' +
      '<div class="tp-undir"><b>' + esc(t.nafn) + '</b> &lt;' + esc(t.netfang) + '&gt;' + (t.kunni ? ' · <button type="button" class="tp-link" data-t5="fyr-id" data-id="' + esc(t.kunni.coId || '') + '">' + esc(t.kunni.nafn || '') + '</button>' : ' · <span class="s">enginn kúnni fannst</span>') + '</div>' +
      '<div class="tp-merki _oll">' + merkiHtml(t, true) + '</div></div>' +
      '<div class="tp-takkar _adal">' +
        '<button type="button" class="btn iv sm' + (S.svarOpid === t.k ? ' _on' : '') + '" data-t5="tp-svara" data-v="' + esc(t.k) + '">↩ Svara</button>' +
        (t.kunni && window.ReikningaPostur && ReikningaPostur.sendaReikning ? '<button type="button" class="btn iv sm" data-t5="tp-skjol" data-v="' + esc(t.k) + '">✉ Senda reikning / skýrslu</button>' : '') +
        '<button type="button" class="btn iv sm' + (S.claudeOpid === t.k ? ' _on' : '') + '" data-t5="tp-claude-opna" data-v="' + esc(t.k) + '">🤖 Til Claude…</button>' +
        '<button type="button" class="btn iv sm' + (stj ? ' tp-gull' : '') + '" data-t5="tp-stjarna" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + ' title="Tilbúið að svara — efst í listanum">' + (stj ? '★ Tilbúið' : '☆ Merkja tilbúið') + '</button>' +
        (t.hluti === 'bidur' ? '<button type="button" class="btn iv sm" data-t5="tp-svarad" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + ' title="Svarað annars staðar (t.d. í Gmail)">✓ Merkja svarað</button>' : '') +
        '<a class="btn iv sm" href="' + esc(gmailSlod(t)) + '" target="_blank" rel="noopener">Opna í Gmail ↗</a>' +
        '<button type="button" class="btn iv sm" data-t5="' + (t.falid ? 'tp-afhylja' : 'tp-fela') + '" data-v="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>' + (t.falid ? 'Sýna aftur' : '✕ Fela') + '</button>' +
      '</div>' + claudeHtml(t) + svarHtml(t) + malHtml(t) +
      '<div class="tp-skeytin">' + t.msgs.slice().reverse().map(skeytiHtml).join('') + '</div>';
  }
  function rymiHtml() {
    tryggjaStil();
    let w = 0; try { const v = Number(localStorage.getItem('thjonustubord_vbr_breidd')); w = v > 0 ? Math.min(760, Math.max(230, v)) : 0; } catch (_) {}
    const s = S.sia, l = siad(), val = valinn();
    const n = h => hlutaListi(l, h).length;
    const hausTala = (S.loaded ? [n('bidur') + ' bíða', n('claude') + ' hjá Claude', n('undirbuid') + ' ★'].join(' · ') : (S.villa ? '⚠️ ' + S.villa : 'sæki…')) + (S.loadedAt ? ' · sótt kl. ' + kl(S.loadedAt) : '');
    const listi = !S.loaded ? '<div class="empty"><span class="coin" aria-hidden="true"></span>' + (S.villa ? esc(S.villa) : 'Sæki póstinn…') + '</div>'
      : !l.length ? '<div class="empty"><span class="coin" aria-hidden="true"></span>Enginn póstur passar við síuna.</div>'
      : HLUTAR.map(h => { const m = hlutaListi(l, h[0]); if (!m.length) return ''; const fela = h[0] === 'buid' && !S.synaLokid && !s.merki;
          return '<div class="vbr-sect" data-h="' + h[0] + '">' + esc(h[1]) + ' · ' + m.length + (fela ? ' <button type="button" class="tp-link" data-t5="tp-syna-lokid" data-v="1">sýna</button>' : h[0] === 'buid' ? ' <button type="button" class="tp-link" data-t5="tp-syna-lokid" data-v="0">fela</button>' : '') + '</div>' + (fela ? '' : m.map(t => rodHtml(t, val)).join(''));
        }).join('');
    return '<div class="vbr samt tp"' + (w ? ' style="--vbr-w:' + w + 'px"' : '') + '>' +
      '<aside class="panel vbr-list" aria-label="Tölvupóstar">' +
        '<header class="phead"><span class="plate">✉</span><h2 class="ptitle">Tölvupóstar</h2><span class="sum">' + esc(hausTala) + '</span>' +
          '<button type="button" class="btn iv sm tp-uppf" data-t5="tp-uppf" title="Sækja nýjan póst úr Gmail"' + (S.loading ? ' disabled' : '') + '>↻</button></header>' +
        '<div class="samt-rod">' + chip('holf', 'baedi', s.holf === 'baedi', 'Bæði hólfin') + chip('holf', 'eldklar', s.holf === 'eldklar', 'eldklar@') + chip('holf', 'bokhald', s.holf === 'bokhald', 'bokhald@') +
          '<span class="tp-skil"></span>' + chip('sia', 'osvarad', s.osvarad, 'Ósvarað', 'Aðeins þræðir sem bíða svars eða eru hjá Claude') + chip('sia', 'beidnir', s.beidnir, '✉ Beiðnir', 'Lítur út eins og beiðni um reikning/skýrslu') + chip('sia', 'vidhengi', s.vidhengi, '📎 Viðhengi') +
          '<span class="tp-skil"></span>' + chip('rod', 'nyjast', s.rodun === 'nyjast', 'Nýjast') + chip('rod', 'elst', s.rodun === 'elst', 'Elst') + chip('rod', 'mikilv', s.rodun === 'mikilv', 'Mikilvægast', 'Stjörnumerkt og IMPORTANT efst') + chip('rod', 'fjoldi', s.rodun === 'fjoldi', 'Flest skeyti') + '</div>' +
        '<div class="samt-rod tp-merkjarod">' + merkjaTalning().slice(0, 12).map(([m, c]) => chip('merki', m, s.merki === m, (m === '★' ? '<span style="color:#d4a017">★</span>' : esc(m)) + ' <small>' + c + '</small>')).join('') + (s.merki ? chip('merki', '', false, '✕ Hreinsa') : '') + '</div>' +
        '<div class="samt-teljari"><button type="button" data-t5="tp-hoppa" data-v="undirbuid" class="_gull"><b>' + n('undirbuid') + '</b><span>★ Tilbúið að svara<small>Claude undirbjó — þú sendir</small></span></button>' +
          '<button type="button" data-t5="tp-hoppa" data-v="claude" class="_claude"><b>' + n('claude') + '</b><span>Hjá Claude<small>í vinnslu eða samþykkt</small></span></button>' +
          '<button type="button" data-t5="tp-hoppa" data-v="bidur"><b>' + n('bidur') + '</b><span>Bíður svars<small>enginn svarað enn</small></span></button></div>' +
        '<div class="vbr-items">' + listi + (S.synaFalid ? '' : '<div class="vbr-sect"><button type="button" class="tp-link" data-t5="tp-syna-falid" data-v="1">' + S.thraedir.filter(t => t.falid).length + ' faldir · sýna</button></div>') + (S.synaFalid ? '<div class="vbr-sect"><button type="button" class="tp-link" data-t5="tp-syna-falid" data-v="0">‹ aftur í póstinn</button></div>' : '') + '</div>' +
        '<div class="vbr-grip" data-vbr-grip title="Draga til að breyta breidd listans"></div>' +
      '</aside>' +
      '<div class="vbr-main"><section class="sel samt-sel tp-sel" aria-live="polite">' + thradurHtml(val) + '</section></div></div>';
  }
  function tryggjaStil() {
    try {
      const root = window.Bord368 && Bord368.root && Bord368.root();
      if (!root || root.getElementById('tp448-css')) return;
      const st = document.createElement('style'); st.id = 'tp448-css';
      st.textContent = [
        '.tp .vbr-items{padding-bottom:12px}.tp .tp-skil{flex:none;width:1px;height:18px;background:var(--rule3);margin:4px 3px}',
        '.tp .tp-l1{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;color:var(--mute)}.tp .tp-fra{font:600 12px var(--body);color:var(--ink);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tp .tp-l1 time{margin-left:auto;white-space:nowrap}',
        '.tp .tp-holf{flex:none;padding:0 5px;border-radius:3px;border:1px solid var(--edge);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase}.tp .tp-holf._bokhald{border-color:rgba(47,111,179,.5);color:#2f6fb3}',
        '.tp .tp-merki{display:flex;flex-wrap:wrap;gap:3px 4px;margin-top:3px}.tp .tp-m{font-family:var(--mono);font-size:9.5px;letter-spacing:.04em;padding:1px 5px;border-radius:2px;border:1px solid var(--edge);color:var(--ink2);background:rgba(255,255,255,.5);white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}',
        '.tp .tp-m._lokid{border-color:rgba(47,122,74,.5);color:#2f7a4a}.tp .tp-m._beidni{border-color:rgba(184,137,46,.9);color:#8a6218;background:rgba(232,203,122,.28)}.tp .tp-m._mal{border-color:var(--edge2)}.tp .tp-m._claude{border-color:#145229;color:#fff;background:#1f6b3c}.tp .tp-m._kunni{color:var(--ink);font-weight:600}.tp .tp-m.tp-stj{border:0;background:none;font-size:13px;padding:0 2px;line-height:1}',
        '.tp .tp-merkjarod{padding-top:4px}.tp .tp-merkjarod small{opacity:.65;font-weight:500}',
        '.tp .tp-haus{display:flex;flex-direction:column;gap:6px}.tp .tp-undir{font-size:13px;color:var(--ink2)}.tp .tp-link{background:none;border:0;padding:0;font:inherit;color:var(--ink);text-decoration:underline;cursor:pointer}.tp .vbr-sect .tp-link{font:inherit;color:var(--mute);text-transform:none;letter-spacing:0;margin-left:6px}',
        '.tp .tp-takkar{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.tp .tp-takkar._adal{padding-bottom:10px;border-bottom:1px solid var(--rule2)}.tp .btn._on{background:#1f2530;color:#fff;border-color:#000}.tp .btn.tp-gull{background:linear-gradient(180deg,#e8cb7a,#c9a24a);color:#1c1608;border-color:#8a6218}.tp .btn.tp-graen{background:linear-gradient(180deg,#2d8a4e,#1f6b3c);color:#fff;border-color:#0b3519}',
        '.tp .tp-svar,.tp .tp-claude,.tp .tp-mal{margin-top:12px;padding:12px 14px;border:1px solid var(--rule3);border-radius:6px;background:rgba(255,255,255,.55)}.tp .tp-svar header,.tp .tp-claude header,.tp .tp-mal header{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-bottom:8px}.tp .tp-mal header b{font-family:var(--mono);font-size:11px;letter-spacing:.06em}.tp .tp-claude header .s,.tp .tp-mal .s{font-size:11.5px;color:var(--mute)}',
        '.tp .tp-inp,.tp .tp-ta{display:block;width:100%;box-sizing:border-box;margin:0 0 8px;padding:8px 10px;border:1px solid var(--edge);border-radius:4px;background:#fff;color:var(--ink);font:13.5px/1.5 var(--body)}.tp .tp-ta{resize:vertical;min-height:80px}',
        '.tp .tp-nota{white-space:pre-wrap;font-size:12.5px;line-height:1.5;color:var(--ink2);max-height:260px;overflow:auto}.tp .tp-uppk{margin-top:8px;padding:8px 10px;border-left:3px solid #c9a24a;background:rgba(232,203,122,.18);white-space:pre-wrap;font-size:12.5px;line-height:1.5}.tp .tp-uppk b{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a6218;margin-bottom:4px}',
        '.tp .tp-skeytin{display:flex;flex-direction:column;gap:10px;margin-top:14px}.tp .tp-skeyti{padding:12px 14px;border:1px solid var(--rule2);border-radius:6px;background:#fff}.tp .tp-skeyti._okkar{background:rgba(232,203,122,.12);border-color:rgba(184,137,46,.4)}.tp .tp-skeyti header{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin-bottom:6px;font-size:12.5px}.tp .tp-skeyti header .s{color:var(--mute);font-size:11.5px}.tp .tp-skeyti header time{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--mute)}',
        '.tp .tp-texti{white-space:pre-wrap;font-size:13.5px;line-height:1.55;color:var(--ink);overflow-wrap:anywhere}.tp .tp-vidh{margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--ink2)}',
        '.tp .tp-uppf{margin-left:auto}.tp .phead .sum{white-space:normal}'
      ].join('\n');
      root.appendChild(st);
    } catch (_) {}
  }

  /* ── SMELLIR OG INNSLÁTTUR ─────────────────────────────────────────── */
  function smellur(el, e) {
    const a = String(el.dataset.t5 || '').slice(3), v = el.dataset.v || '', t = finna(el.dataset.k || v);
    const R = () => notify();
    switch (a) {
      case 'velja': S.valinn = v; S.svarOpid = null; S.claudeOpid = null; R(); return true;
      case 'holf': S.sia.holf = v; vistaSiu(); R(); return true;
      case 'rod': S.sia.rodun = v; vistaSiu(); R(); return true;
      case 'sia': S.sia[v] = !S.sia[v]; R(); return true;
      case 'merki': S.sia.merki = v; R(); return true;
      case 'syna-lokid': S.synaLokid = v === '1'; R(); return true;
      case 'syna-falid': S.synaFalid = v === '1'; S.valinn = null; R(); return true;
      case 'hoppa': { try { const root = (el.getRootNode && el.getRootNode()) || document; const s = root.querySelector('.tp .vbr-sect[data-h="' + v + '"]'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} return true; }
      case 'uppf': saekjaNyjan(); return true;
      case 'svara': if (!t) return true; S.svarOpid = S.svarOpid === t.k ? null : t.k; S.claudeOpid = null; R(); return true;
      case 'haetta': S.svarOpid = null; R(); return true;
      case 'claude-opna': if (!t) return true; S.claudeOpid = S.claudeOpid === t.k ? null : t.k; S.svarOpid = null; R(); return true;
      case 'claude': if (!t) return true; adgerd(t, () => tilClaude(t, v, S.sky[t.k] || '')).then(() => { S.claudeOpid = null; notify(); }); return true;
      case 'stjarna': if (!t) return true; adgerd(t, () => stjarna(t)); return true;
      case 'svarad': if (!t) return true; adgerd(t, () => merkjaSvarad(t)); return true;
      case 'fela': if (!t) return true; adgerd(t, () => fela(t, false)); return true;
      case 'afhylja': if (!t) return true; adgerd(t, () => fela(t, true)); return true;
      case 'semja': if (!t) return true; adgerd(t, () => semja(t)); return true;
      case 'senda': if (!t) return true; adgerd(t, () => senda(t)); return true;
      case 'skjol': { if (!t) return true; const m = t.sidastaInn; try { ReikningaPostur.sendaReikning({ sender_name: m.sender_name, from: m.sender_email, subject: m.subject, body_preview: m.body_preview, snippet: m.snippet, message_id: m.message_id, account: m.account, received_at: m.received_at, cust: t.kunni ? { id: t.kunni.coId, nafn: t.kunni.nafn, kt: t.kunni.kt } : null, sale: null }); } catch (err) { toast('Sendingargluggi opnaðist ekki: ' + err.message, true); } return true; }
      case 'bord': if (!t || !t.mal) return true; try { if (window.Bord368 && Bord368.opnaMal) Bord368.opnaMal(t.mal.id); } catch (_) {} return true;
    }
    return false;
  }
  // Innsláttur lifir í S (ekki í DOM) — teikning má aldrei kippa reitnum undan þeim sem skrifar (CLAUDE.md, Stöðugt viðmót).
  function innslattur(el) {
    const k = el.dataset.v, h = el.dataset.tpIn;
    if (!k || !h) return;
    if (h === 'drog') S.drog[k] = el.value; else if (h === 'efni') S.efni[k] = el.value; else if (h === 'sky') S.sky[k] = el.value;
  }

  window.Tolvupostar = {
    S, HOLF, HLUTAR, HLUTA_L, load, loaded: () => S.loaded, loading: () => S.loading, loadedAt: () => S.loadedAt, villa: () => S.villa,
    siad, hlutaListi, finna, valinn, merkjaTalning, vistaSiu, rymiHtml, smellur, innslattur, saekjaNyjan,
    tilClaude: (k, v, sky) => { const t = finna(k); return t ? adgerd(t, () => tilClaude(t, v, sky)) : Promise.resolve(); },
    stjarna: k => { const t = finna(k); return t ? adgerd(t, () => stjarna(t)) : Promise.resolve(); },
    svarad: k => { const t = finna(k); return t ? adgerd(t, () => merkjaSvarad(t)) : Promise.resolve(); },
    fela: (k, af) => { const t = finna(k); return t ? adgerd(t, () => fela(t, !!af)) : Promise.resolve(); },
    semja: k => { const t = finna(k); return t ? adgerd(t, () => semja(t)) : Promise.resolve(); },
    senda: k => { const t = finna(k); return t ? adgerd(t, () => senda(t)) : Promise.resolve(); },
    svarEfni, svarTexti, uppkastUrNotu, notaAnUppkasts, gmailSlod, merkiHtml, dags, kl, dagarSidan, stuttHolf, esc, STJORNUR, STJ_LITUR, LOKID, version: '2026-10-09'
  };
})();
