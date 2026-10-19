/* === ERINDI — SÍMASÍÐA (449c) — 19.10.2026 ====================================
 *
 * Agnar: „útbúa sér app page í öpp inn á þjónustuver appið fyrir Erindi". Erindi = beiðni frá kúnna (oftast í pósti) sem
 * Claude hefur tekið saman: hvað var beðið um, gögnin sem fundust, hvað vantar og TILBÚINN svartexti. Agnar yfirfer og sendir.
 * Samþykktarstíll eins og 446/449 — eitt spjald á erindi, 48 px takkar, Brunastál.
 *
 * HVAÐ TELST ERINDI (ekkert nýtt borð í gagnagrunni — þetta er sýn á thjonustubeidni):
 *   • mál með merkið `erindi`, eða
 *   • hvaða mál sem er með línuna `---SVAR---` í notes (uppkast Claude, sama snið og Tölvupóstar 448).
 * HLUTAR (í þessari röð):
 *   ★ Svar tilbúið   — uppkast + merkið `undirbuid`, ekki sent        → Agnar yfirfer og sendir
 *   ❓ Vantar frá þér  — merkið `vantar`                                → Agnar svarar því sem vantar (fer til Claude)
 *   🤖 Hjá Claude      — svar:vinnsla | svar:samthykkt | svar:endurmeta → Claude vinnur (gagnvirk lota, ekkert sjálfvirkt)
 *   Önnur opin erindi  — merkið `erindi`, ekkert af ofangreindu
 *   Svarað · lokið     — svarad_at eða status lokad (30 d.), samanbrotið
 *
 * SAMNINGUR VIÐ CLAUDE-LOTUNA (sama og 448): mál með channel_ref `email:<email_digest.id>` fær svarið sent SEM SVAR í þeim þræði
 * (inReplyTo). Uppkastið er allt á eftir SÍÐUSTU línunni `---SVAR---` í notes; hornklofar [svona] eru EYÐUR sem Agnar fyllir —
 * Senda er læst á meðan einhver eyða er eftir (annars fer „[dagsetning]" út til kúnnans). Skrifið eyðu þar sem Claude veit ekki gildið.
 * Vanti gögn sem aðeins Agnar á: bæta `vantar` í tags og skrifa „Vantar: …" línur í notes.
 * Claude sendir ALDREI sjálft.
 *
 * Skrifar aðeins við raunverulegan smell (Vista / Senda / Til Claude / Loka). Óvistuð drög lifa í minni síðunnar, ekki í
 * vafranum — Vista uppkast skrifar þau á þjóninn. Mynstur: 449-tolvupostar-simi.js (view-<key>, App.switchView-umbúðir).
 * ========================================================================== */
(() => {
  if (window.__erindi449c) return;
  window.__erindi449c = true;

  const VIEW_ID = 'view-erindi', NAV_KEY = 'erindi', ROOT_ID = '_er449c-root';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const SVAR = '---SVAR---';
  const EYDA_RE = /\[[^\[\]\n]{1,80}\]/g;
  const HOLF = ['eldklar@eldklar.is', 'bokhald@eldklar.is'];
  const HLUTAR = [
    ['undirbuid', '★ Svar tilbúið — yfirfarðu og sendu', '_gull'],
    ['vantar', '❓ Vantar frá þér', '_vantar'],
    ['claude', '🤖 Hjá Claude', '_claude'],
    ['annad', 'Önnur opin erindi', ''],
    ['buid', 'Svarað · lokið', '_ok']
  ];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ts = s => { const n = Date.parse(s || ''); return isFinite(n) ? n : 0; };
  const p2 = n => String(n).padStart(2, '0');
  const dags = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const kl = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const dagarSidan = iso => Math.max(0, Math.floor((Date.now() - ts(iso)) / 864e5));
  const sb = () => (window.DB && DB.sb) || null;
  const nu = () => { try { return (window.Samthykkja && Samthykkja.nu()) || (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const toast = (m, w) => { try { if (window.Bord368 && Bord368.toast) return Bord368.toast(m, w); } catch (_) {} try { if (window.App && App.toast) return App.toast(m); } catch (_) {} console[w ? 'warn' : 'log']('[449c] ' + m); };
  const stimpill = () => { const d = new Date(); return nu() + ' · ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + ' kl. ' + kl(d); };
  const textiIHtml = s => '<div style="font:14px/1.55 system-ui,sans-serif;color:#111;white-space:pre-wrap">' + esc(s) + '</div>';

  const S = {
    loaded: false, loading: false, loadedAt: null, villa: null, _p: null,
    rows: [], dig: new Map(),
    opin: new Set(), drog: {}, til: {}, cc: {}, efni: {}, fra: {}, sky: {}, busy: {},
    claudeOpid: null, lokaSpurt: null, synaBuid: false, kunni: ''
  };
  let _poll = 0;

  /* ── Mál → erindi ─────────────────────────────────────────────────────── */
  const uppkast = r => { const n = String(r.notes || ''), i = n.lastIndexOf(SVAR); return i < 0 ? '' : n.slice(i + SVAR.length).trim(); };
  const notaAn = r => { const n = String(r.notes || ''), i = n.lastIndexOf(SVAR); return (i < 0 ? n : n.slice(0, i)).trim(); };
  const draft = r => S.drog[r.id] != null ? S.drog[r.id] : uppkast(r);
  const eydur = t => { const m = String(t || '').match(EYDA_RE); return m ? m : []; };
  // body_preview er oft allur þráðurinn með tilvitnunum — sýnum aðeins nýjasta skeytið (fyrir ofan „On … wrote:“ / „… skrifaði …“).
  function nyttSkeyti(t) {
    const s = String(t || '');
    const m = /\n\s*(On .{5,90} wrote:|[^\n]{3,70} skrifaði [^\n]{3,90}:|-{2,}\s*Original|Frá:|From:)/.exec(s);
    const x = (m ? s.slice(0, m.index) : s).trim();
    return { texti: x.length > 900 ? x.slice(0, 900) + '…' : x, stytt: !!m || x.length > 900 };
  }
  const digOf = r => { const m = /^email:(\d+)$/.exec(String(r.channel_ref || '')); return m ? S.dig.get(m[1]) || null : null; };
  const svarTag = r => r.tags.find(t => /^svar:(vinnsla|samthykkt|endurmeta)$/.test(t)) || null;
  const erBuid = r => !!r.svarad_at || r.status === 'lokad';
  function hluti(r) {
    if (erBuid(r)) return 'buid';
    if (r.tags.indexOf('undirbuid') >= 0 && uppkast(r)) return 'undirbuid';
    if (r.tags.indexOf('vantar') >= 0) return 'vantar';
    if (svarTag(r)) return 'claude';
    return 'annad';
  }
  const kunniNafn = r => r.customer_nafn || (String(r.title || '').split(':')[0] || '').replace(/^✉\s*/, '').trim() || 'Ónefnt';
  const hlutaListi = (l, h) => l.filter(r => hluti(r) === h);
  function siad() {
    let l = S.rows.slice();
    if (S.kunni) l = l.filter(r => kunniNafn(r) === S.kunni);
    return l.sort((a, b) => ts(b.updated_at || b.created_at) - ts(a.updated_at || a.created_at));
  }
  function kunnaTalning() {
    const c = {};
    S.rows.filter(r => !erBuid(r)).forEach(r => { const n = kunniNafn(r); c[n] = (c[n] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }

  /* ── Gögn ─────────────────────────────────────────────────────────────── */
  async function load() {
    if (S.loading && S._p) return S._p;
    const c = sb();
    if (!c) { S.villa = 'Engin tenging við gagnagrunn'; render(); return; }
    S.loading = true; S.villa = null; render();
    S._p = (async () => {
      try {
        const cols = 'id,title,status,type,tags,notes,channel_ref,assigned_to,svarad_at,fyrirtaeki_id,customer_nafn,updated_at,created_at';
        const [a, b] = await Promise.all([
          c.from('thjonustubeidni').select(cols).is('deleted_at', null).filter('tags', 'cs', '["erindi"]').order('updated_at', { ascending: false }).limit(300),
          c.from('thjonustubeidni').select(cols).is('deleted_at', null).like('notes', '%' + SVAR + '%').order('updated_at', { ascending: false }).limit(300)
        ]);
        if (a.error) throw a.error;
        if (b.error) throw b.error;
        const m = new Map();
        (a.data || []).concat(b.data || []).forEach(r => m.set(r.id, r));
        const fra30 = Date.now() - 30 * 864e5;
        S.rows = [...m.values()].filter(r => r.status !== 'lokad' || ts(r.updated_at) > fra30).map(r => { r.tags = (Array.isArray(r.tags) ? r.tags : []).filter(t => typeof t === 'string'); return r; });
        const ids = [...new Set(S.rows.map(r => { const x = /^email:(\d+)$/.exec(String(r.channel_ref || '')); return x ? +x[1] : 0; }).filter(Boolean))];
        S.dig = new Map();
        if (ids.length) {
          const d = await c.from('email_digest').select('id,message_id,account,folder,thread_id,sender_name,sender_email,to_addresses,subject,snippet,body_preview,received_at,attachment_names').in('id', ids);
          if (!d.error) (d.data || []).forEach(x => S.dig.set(String(x.id), x));
        }
        S.loaded = true; S.loadedAt = new Date();
      } catch (e) {
        S.villa = (e && e.message) || String(e);
      } finally {
        S.loading = false; S._p = null; render();
      }
    })();
    return S._p;
  }

  /* ── Skrif — aðeins við smell ─────────────────────────────────────────── */
  async function adgerd(r, fn) {
    if (S.busy[r.id]) return;
    S.busy[r.id] = 1; render();
    try { await fn(); } catch (e) { toast('Vistaðist ekki: ' + ((e && e.message) || e), true); }
    delete S.busy[r.id];
    await load();
  }
  // Skilyrt á updated_at og lesið til baka (sama aðferð og svaraSamthykki í 368) — breyting á annarri vél étst ekki.
  async function patchMal(r, patch) {
    const c = sb();
    let q = c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', r.id);
    q = r.updated_at ? q.eq('updated_at', r.updated_at) : q.is('updated_at', null);
    const u = await q.select('id');
    if (u.error) throw u.error;
    if (!u.data || !u.data.length) throw new Error('Málið breyttist á annarri vél rétt í þessu — sótti nýjustu stöðu, reyndu aftur');
  }
  const medUppkasti = (r, texti) => notaAn(r) + '\n' + SVAR + '\n' + texti;

  async function vista(r) {
    const t = String(draft(r)).trim();
    if (!t) throw new Error('Uppkastið er tómt');
    await patchMal(r, { notes: medUppkasti(r, t) });
    delete S.drog[r.id];
    toast('Uppkast vistað');
  }
  async function senda(r) {
    const t = String(draft(r)).trim();
    if (!t) throw new Error('Svarið er tómt');
    const e = eydur(t);
    if (e.length) throw new Error(e.length + ' eyða/eyður ófylltar: ' + e.slice(0, 3).join(' '));
    const d = digOf(r);
    const til = (S.til[r.id] != null ? S.til[r.id] : tilSjalfgefid(d)).split(/[,;\s]+/).filter(x => /@/.test(x));
    if (!til.length) throw new Error('Enginn viðtakandi — skrifaðu netfang í „Til“');
    const cc = String(S.cc[r.id] || '').split(/[,;\s]+/).filter(x => /@/.test(x));
    const fra = S.fra[r.id] || (d && d.account) || HOLF[0];
    const efni = S.efni[r.id] != null ? S.efni[r.id] : efniSjalfgefid(r, d);
    if (!window.AppMail || !AppMail.send) throw new Error('Sendingin (254 AppMail) er ekki hlaðin');
    const x = await AppMail.send({ from: fra, to: til, cc: cc.length ? cc : undefined, subject: efni, html: textiIHtml(t), inReplyTo: (d && d.message_id) || undefined });
    const j = x && x.json ? await x.json().catch(() => ({})) : {};
    if (!x || !x.ok || (j && j.ok === false)) throw new Error((j && (j.error || j.message)) || 'Pósturinn fór ekki');
    // Sent — frá hér að neðan má EKKI kasta villu án þess að segja að pósturinn fór, svo Agnar sendi hann ekki aftur.
    try {
      if (d && d.message_id) await sb().from('reikninga_postur_activity').insert({ message_id: d.message_id, kind: 'reply' });
      const nota = '— Sent (Erindi): ' + stimpill() + ' · til ' + til.join(', ') + (cc.length ? ' · afrit ' + cc.join(', ') : '');
      await patchMal(r, {
        svarad_at: new Date().toISOString(),
        tags: r.tags.filter(x2 => x2 !== 'undirbuid' && x2 !== 'samthykki' && x2 !== 'vantar' && !/^svar:/.test(x2)),
        status: r.status === 'nytt' ? 'i_vinnslu' : r.status,
        notes: (medUppkasti(r, t) + '\n\n' + nota).trim()
      });
    } catch (e2) {
      toast('✅ Pósturinn FÓR til ' + til.join(', ') + ' — en málið uppfærðist ekki (' + ((e2 && e2.message) || e2) + '). Ekki senda aftur; merktu málið svarað á borðinu.', true);
    }
    delete S.drog[r.id]; delete S.efni[r.id]; delete S.til[r.id]; delete S.cc[r.id]; delete S.fra[r.id];
    toast('Svar sent til ' + til.join(', ') + (j && j.threaded ? ' · í sama þræði' : ''));
  }
  async function tilClaude(r, v, sky) {
    const l = v === 'samthykkt' ? 'Samþykkt' : v === 'endurmeta' ? 'Svar frá Agnari' : 'Sett í vinnslu';
    const hreinsa = tags => tags.filter(x => x !== 'undirbuid' && x !== 'vantar');
    if (r.tags.indexOf('samthykki') >= 0 && window.Samthykkja && Samthykkja.svara) {
      if (Samthykkja.loaded && !Samthykkja.loaded() && Samthykkja.load) await Samthykkja.load();
      await Samthykkja.svara(r.id, v, sky || '');
      const f = await sb().from('thjonustubeidni').select('id,tags,updated_at').eq('id', r.id).limit(1);
      const ny = f.data && f.data[0];
      if (ny && (ny.tags || []).some(x => x === 'undirbuid' || x === 'vantar')) await patchMal(ny, { tags: hreinsa(ny.tags) });
    } else {
      const stada = v === 'samthykkt' ? 'tilbuid' : 'i_vinnslu';
      const nota = '— ' + l + ' (Erindi): ' + stimpill() + (sky ? '\n' + sky : '');
      await patchMal(r, { tags: hreinsa(r.tags.filter(x => !/^svar:/.test(x))).concat(['svar:' + v]), status: stada, notes: (String(r.notes || '').trim() + '\n\n' + nota).trim() });
    }
    delete S.sky[r.id];
  }
  async function loka(r) {
    await patchMal(r, { status: 'lokad', tags: r.tags.filter(x => x !== 'undirbuid'), notes: (String(r.notes || '').trim() + '\n\n— Lokað (Erindi): ' + stimpill() + ' · ekkert sent').trim() });
    toast('Erindi lokað — ekkert sent');
  }

  function tilSjalfgefid(d) {
    if (!d) return '';
    if (d.folder === 'SENT') { const m = /[\w.+-]+@[\w.-]+/.exec(String(d.to_addresses || '')); return m ? m[0] : ''; }
    return d.sender_email || '';
  }
  const efniSjalfgefid = (r, d) => { const e = (d && d.subject) || String(r.title || '').replace(/^✉\s*/, ''); return /^\s*re:/i.test(e) ? e : 'Re: ' + e; };

  /* ── Teikning ─────────────────────────────────────────────────────────── */
  function css() {
    const V = 'html body #' + VIEW_ID;
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);font-family:' + SANS + ';color:#1f2530;padding-bottom:96px}',
      V + '.active{display:block}',
      V + ' .er-haus{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#2b2e35 0%,#191b20 100%);border-bottom:1px solid #000;color:#fff}',
      V + ' .er-haus>div{min-width:0;flex:1 1 auto}' + V + ' .er-haus .tt{font-family:' + DISP + ';font-weight:800;font-size:20px;line-height:1}',
      V + ' .er-haus .st{font-family:' + MONO + ';font-size:10.5px;color:#aab2c0;margin-top:4px;letter-spacing:.04em;white-space:normal;line-height:1.4}',
      V + ' .er-haus .uppf{flex:none;width:40px;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font-size:17px;cursor:pointer}',
      V + ' .er-rod{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:10px 12px 0;-webkit-overflow-scrolling:touch}' + V + ' .er-rod::-webkit-scrollbar{display:none}',
      V + ' .er-rod button{flex:none;height:34px;padding:0 12px;border-radius:8px;border:1px solid rgba(20,24,34,.2);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 12.5px ' + SANS + ';cursor:pointer;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      V + ' .er-rod button[aria-pressed="true"]{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#fff;border-color:#000}' + V + ' .er-rod small{opacity:.7;font-weight:500}',
      V + ' .er-teljari{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 12px 0}',
      V + ' .er-teljari button{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 10px;border-radius:9px;border:1px solid rgba(20,24,34,.22);background:linear-gradient(180deg,#fdfdfe,#e6e9ef);color:#1f2530;font:600 12px ' + SANS + ';text-align:left;cursor:pointer}',
      V + ' .er-teljari button b{font-family:' + DISP + ';font-size:22px;line-height:1;min-width:28px;text-align:center}' + V + ' .er-teljari button small{display:block;font:500 10.5px ' + MONO + ';color:#5b6577!important;margin-top:2px}',
      V + ' .er-teljari button._gull{grid-column:1 / -1;background:linear-gradient(180deg,#e8cb7a,#c9a24a);border-color:#8a6218;color:#1c1608}' + V + ' .er-teljari button._gull small{color:#5c4312!important}',
      V + ' .er-teljari button._claude{background:linear-gradient(180deg,#1f6b3c,#145229);color:#fff;border-color:#0b3519}' + V + ' .er-teljari button._claude small{color:#bfe3c9!important}',
      V + ' .er-hluti{display:flex;align-items:center;gap:8px;margin:14px 12px 6px;font-family:' + MONO + ';font-size:10.5px;letter-spacing:.1em;color:#525b6b;text-transform:uppercase}',
      V + ' .er-hluti b{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;padding:0 6px;border-radius:5px;background:#1f2530;color:#fff;font-size:11px;letter-spacing:0}' + V + ' .er-hluti._gull b{background:#c99a3a;color:#1c1608}' + V + ' .er-hluti._claude b{background:#1f6b3c}' + V + ' .er-hluti._vantar b{background:#a8321f}' + V + ' .er-hluti._ok b{background:#6b7280}',
      V + ' .er-hluti button{margin-left:auto;background:none;border:0;font:600 11px ' + SANS + ';color:#2f6fb3;text-transform:none;letter-spacing:0;cursor:pointer;padding:6px}',
      V + ' .er-mal{margin:0 12px 10px;border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.16);box-shadow:0 1px 2px rgba(0,0,0,.08);overflow:hidden}' + V + ' .er-mal._buid{opacity:.72}',
      V + ' .er-mal .opna{display:block;width:100%;padding:12px 14px;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      V + ' .er-l1{display:flex;align-items:center;gap:6px;font-family:' + MONO + ';font-size:10.5px;color:#5b6577}' + V + ' .er-fra{font:700 13px ' + SANS + ';color:#1f2530;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' + V + ' .er-l1 time{margin-left:auto;white-space:nowrap}',
      V + ' .er-efni{display:block;font:700 15px/1.3 ' + SANS + ';margin:4px 0 3px;overflow-wrap:anywhere}' + V + ' .er-snip{display:block;font-size:13px;line-height:1.45;color:#3a4250;overflow-wrap:anywhere}',
      V + ' .er-merki{display:flex;flex-wrap:wrap;gap:3px 4px;margin-top:6px}' + V + ' .er-m{font-family:' + MONO + ';font-size:10px;letter-spacing:.03em;padding:2px 6px;border-radius:3px;border:1px solid rgba(20,24,34,.22);color:#3a4250;background:#f4f6f9;white-space:nowrap}',
      V + ' .er-m._eyda{border-color:#b8892e;color:#8a6218;background:#f6ebcc}' + V + ' .er-m._graen{border-color:#145229;color:#fff;background:#1f6b3c}' + V + ' .er-m._raut{border-color:#a8321f;color:#fff;background:#a8321f}' + V + ' .er-m._ok{border-color:rgba(47,122,74,.5);color:#2f7a4a}',
      V + ' .er-inni{padding:0 14px 14px;border-top:1px solid rgba(20,24,34,.1)}',
      V + ' .er-kassi{margin-top:12px;padding:10px 12px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:#f7f8fa}' + V + ' .er-kassi>b{display:block;font:700 10.5px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#525b6b;margin-bottom:4px}' + V + ' .er-kassi .s{font-size:12px;color:#5b6577}',
      V + ' .er-kassi._erindi{background:#fff;border-left:3px solid #2f6fb3}' + V + ' .er-kassi._svar{background:#fbf3dd;border-color:#d9c48a}',
      V + ' .er-texti{white-space:pre-wrap;font-size:13.5px;line-height:1.55;color:#2a3140;overflow-wrap:anywhere;max-height:260px;overflow:auto}',
      V + ' .er-vidh{margin-top:6px;font-family:' + MONO + ';font-size:11px;color:#3a4250}',
      V + ' .er-ta,' + V + ' .er-inp{display:block;width:100%;box-sizing:border-box;margin:8px 0 0;padding:10px 12px;border:1px solid rgba(20,24,34,.3);border-radius:9px;background:#fff;color:#1f2530;font:15px/1.5 ' + SANS + '}' + V + ' .er-ta{min-height:220px;resize:vertical}' + V + ' .er-inp{padding:8px 12px;font-size:14px}',
      V + ' .er-lbl{display:block;margin-top:8px;font:700 10px ' + MONO + ';letter-spacing:.1em;color:#525b6b;text-transform:uppercase}',
      V + ' .er-eydur{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' + V + ' .er-eydur button{min-height:36px;padding:4px 10px;border-radius:7px;border:1px solid #b8892e;background:#f6ebcc;color:#6b4a0c;font:600 12.5px ' + SANS + ';cursor:pointer}' + V + ' .er-eydur ._ok{font:600 12.5px ' + SANS + ';color:#2f7a4a;padding:6px 2px}',
      V + ' .er-takkar{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}' + V + ' .er-takkar button,' + V + ' .er-takkar a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:6px 10px;border-radius:9px;border:1px solid rgba(20,24,34,.3);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font:700 14px ' + SANS + ';cursor:pointer;text-decoration:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      V + ' .er-takkar ._gull{background:linear-gradient(180deg,#e8cb7a,#c9a24a);border-color:#8a6218;color:#1c1608}' + V + ' .er-takkar ._graen{background:linear-gradient(180deg,#2d8a4e,#1f6b3c);border-color:#0b3519;color:#fff}' + V + ' .er-takkar ._on{background:#1f2530;color:#fff;border-color:#000}' + V + ' .er-takkar ._raut{background:linear-gradient(180deg,#c4452f,#a8321f);border-color:#6e1c10;color:#fff}' + V + ' .er-takkar ._breid{grid-column:1 / -1}' + V + ' .er-takkar button:disabled{opacity:.45;cursor:not-allowed}',
      V + ' .er-tomt{margin:30px 20px;text-align:center;font-size:14px;color:#525b6b;line-height:1.6}' + V + ' .er-villa{margin:12px;padding:12px;border-radius:9px;background:#f9e3e0;color:#7a1f14;font-size:13px}'
    ].join('\n');
  }
  function injectCss() { if (document.getElementById('_er449c-css')) return; const st = document.createElement('style'); st.id = '_er449c-css'; st.textContent = css(); document.head.appendChild(st); }
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    v.innerHTML = '<div id="' + ROOT_ID + '"></div>';
    v.addEventListener('click', smellur);
    v.addEventListener('input', innslattur);
    document.body.appendChild(v);
    return v;
  }

  const chip = (a, v, on, texti) => '<button type="button" data-er="' + a + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '">' + texti + '</button>';
  function merki(r, h) {
    const m = [];
    const e = eydur(draft(r));
    if (h === 'undirbuid' && e.length) m.push('<span class="er-m _eyda">✎ ' + e.length + ' ' + (e.length === 1 ? 'eyða' : 'eyður') + ' til að fylla</span>');
    if (h === 'undirbuid' && !e.length) m.push('<span class="er-m _graen">tilbúið til sendingar</span>');
    if (h === 'vantar') m.push('<span class="er-m _raut">vantar svar frá þér</span>');
    const st = svarTag(r);
    if (st) m.push('<span class="er-m _graen">' + (st === 'svar:vinnsla' ? 'í vinnslu' : st === 'svar:samthykkt' ? 'samþykkt' : 'endurmat') + '</span>');
    if (r.svarad_at) m.push('<span class="er-m _ok">✓ svarað ' + esc(dags(r.svarad_at)) + '</span>');
    else if (r.status === 'lokad') m.push('<span class="er-m _ok">lokað</span>');
    m.push('<span class="er-m">#' + r.id + '</span>');
    return m.join('');
  }
  function fyrstaLina(r) {
    const l = notaAn(r).split('\n').map(x => x.trim()).filter(Boolean);
    const t = l.find(x => /^(Tillaga|Vantar)/i.test(x)) || l[0] || '';
    return t.replace(/^(✓|✕|▶|💬)\s*(Samþykkja|Hafna|Í vinnslu|Skýring):\s*/, '');
  }
  function spjald(r) {
    const h = hluti(r), op = S.opin.has(r.id), b = !!S.busy[r.id], d = digOf(r);
    let inni = '';
    if (op) {
      const e = eydur(draft(r)), t = draft(r);
      inni = '<div class="er-inni">';
      if (d) inni += '<div class="er-kassi _erindi"><b>Erindið · ' + esc(d.sender_name || d.sender_email || '') + ' · ' + esc(dags(d.received_at)) + '</b><div class="er-texti">' + (() => { const x = nyttSkeyti(d.body_preview || d.snippet); return esc(x.texti || '(ekkert meginmál sótt)') + (x.stytt ? '\n\n— fyrri skeyti í þræðinum falin —' : ''); })() + '</div>' +
        ((Array.isArray(d.attachment_names) && d.attachment_names.length) ? '<div class="er-vidh">📎 ' + esc(d.attachment_names.join(' · ')) + '</div>' : '') + '</div>';
      else if (r.channel_ref) inni += '<div class="er-kassi _erindi"><b>Erindið</b><span class="s">Upprunalega skeytið (' + esc(r.channel_ref) + ') fannst ekki í póstsafninu — svarið fer ekki í þráð nema þú sendir það úr Gmail.</span></div>';
      inni += '<div class="er-kassi"><b>Gögn og forsendur</b><div class="er-texti">' + esc(notaAn(r) || '(engin lýsing)') + '</div></div>';
      if (t || h === 'undirbuid' || h === 'annad') {
        inni += '<div class="er-kassi _svar"><b>↩ Svar' + (d ? ' · frá ' + esc(S.fra[r.id] || d.account) : '') + '</b>' +
          '<label class="er-lbl">Til</label><input class="er-inp" data-er-in="til" data-v="' + r.id + '" value="' + esc(S.til[r.id] != null ? S.til[r.id] : tilSjalfgefid(d)) + '" inputmode="email" placeholder="netfang">' +
          '<label class="er-lbl">Afrit (cc) — valfrjálst</label><input class="er-inp" data-er-in="cc" data-v="' + r.id + '" value="' + esc(S.cc[r.id] || '') + '" inputmode="email">' +
          '<label class="er-lbl">Efni</label><input class="er-inp" data-er-in="efni" data-v="' + r.id + '" value="' + esc(S.efni[r.id] != null ? S.efni[r.id] : efniSjalfgefid(r, d)) + '">' +
          '<label class="er-lbl">Texti</label><textarea class="er-ta" id="_er-ta-' + r.id + '" data-er-in="drog" data-v="' + r.id + '" rows="12" placeholder="Svartexti — yfirfarðu áður en þú sendir.">' + esc(t) + '</textarea>' +
          '<div class="er-eydur" id="_er-ey-' + r.id + '">' + eydaHtml(r.id, e) + '</div>' +
          '<div class="er-takkar"><button type="button" data-er="vista" data-v="' + r.id + '"' + (b ? ' disabled' : '') + '>💾 Vista uppkast</button>' +
          '<button type="button" class="_graen" id="_er-sd-' + r.id + '" data-er="senda" data-v="' + r.id + '"' + (b || e.length || !String(t).trim() ? ' disabled' : '') + '>📤 Senda svar</button></div></div>';
      }
      inni += '<div class="er-takkar">' +
        '<button type="button" data-er="claude-opna" data-v="' + r.id + '" class="' + (S.claudeOpid === r.id ? '_on' : '') + '">🤖 ' + (h === 'vantar' ? 'Svara því sem vantar' : 'Til Claude') + '</button>' +
        (r.status === 'lokad' ? '<span></span>' : '<button type="button" data-er="loka" data-v="' + r.id + '" class="' + (S.lokaSpurt === r.id ? '_raut' : '') + '"' + (b ? ' disabled' : '') + '>' + (S.lokaSpurt === r.id ? 'Ýttu aftur til að loka' : '✕ Loka án sendingar') + '</button>') +
        '<button type="button" class="_breid" data-er="bord" data-v="' + r.id + '">📋 Opna málið á borðinu</button></div>';
      if (S.claudeOpid === r.id) inni += '<div class="er-kassi"><b>Til Claude — hvað á að gera?</b><span class="s">' + (h === 'vantar' ? 'Skrifaðu það sem vantaði. ' : '') + 'Claude vinnur verkið, uppfærir svarið og setur ★ aftur þegar það er tilbúið.</span>' +
        '<textarea class="er-ta" style="min-height:90px" data-er-in="sky" data-v="' + r.id + '" rows="3" placeholder="' + (h === 'vantar' ? 'T.d. „Reyklúgur eru á Hótel Plaza og Arnarhvoli“' : 'T.d. „bæta við verði og senda í dag“ — má vera autt') + '">' + esc(S.sky[r.id] || '') + '</textarea>' +
        '<div class="er-takkar"><button type="button" data-er="claude" data-v="' + (h === 'vantar' ? 'endurmeta' : 'vinnsla') + '" data-k="' + r.id + '"' + (b ? ' disabled' : '') + '>' + (h === 'vantar' ? '▶ Senda svar til Claude' : '▶ Í vinnslu') + '</button>' +
        (h === 'vantar' ? '<span></span>' : '<button type="button" class="_gull" data-er="claude" data-v="samthykkt" data-k="' + r.id + '"' + (b ? ' disabled' : '') + '>✓ Samþykkt</button>') + '</div></div>';
      inni += '</div>';
    }
    return '<div class="er-mal' + (h === 'buid' ? ' _buid' : '') + '" data-k="' + r.id + '"><button type="button" class="opna" data-er="opna" data-v="' + r.id + '" aria-expanded="' + op + '">' +
      '<span class="er-l1"><span class="er-fra">' + esc(kunniNafn(r)) + '</span><time>' + esc(dags(r.created_at).slice(0, 5)) + ' · ' + dagarSidan(r.created_at) + ' d.</time></span>' +
      '<span class="er-efni">' + esc(String(r.title || '').replace(/^✉\s*/, '')) + '</span>' + (op ? '' : '<span class="er-snip">' + esc(fyrstaLina(r).slice(0, 170)) + '</span>') +
      '<span class="er-merki">' + merki(r, h) + '</span></button>' + inni + '</div>';
  }
  function eydaHtml(id, e) {
    return e.length ? e.map((x, i) => '<button type="button" data-er="eyda" data-v="' + id + '" data-i="' + i + '">' + esc(x) + '</button>').join('') : '<span class="_ok">✓ Engar eyður — tilbúið til sendingar</span>';
  }
  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    const root = document.getElementById(ROOT_ID);
    const l = siad(), n = h => hlutaListi(l, h).length;
    let st = S.loaded ? [n('undirbuid') + ' tilbúin', n('vantar') + ' vantar', n('claude') + ' hjá Claude'].join(' · ') : (S.villa ? '⚠️ ' + S.villa : 'sæki…');
    if (S.loadedAt) st += ' · sótt kl. ' + kl(S.loadedAt);
    if (S.loading && S.loaded) st += ' · sæki…';
    let body = '';
    if (!S.loaded) body += '<div class="er-tomt">' + (S.villa ? esc(S.villa) : 'Sæki erindin…') + '</div>';
    else {
      const kt = kunnaTalning();
      if (kt.length > 1) body += '<div class="er-rod">' + chip('kunni', '', !S.kunni, 'Öll') + kt.slice(0, 12).map(([nf, c]) => chip('kunni', nf, S.kunni === nf, esc(nf) + ' <small>' + c + '</small>')).join('') + '</div>';
      body += '<div class="er-teljari"><button type="button" data-er="hoppa" data-v="undirbuid" class="_gull"><b>' + n('undirbuid') + '</b><span>★ Svar tilbúið<small>Claude undirbjó — þú yfirferð og sendir</small></span></button>' +
        '<button type="button" data-er="hoppa" data-v="vantar"><b>' + n('vantar') + '</b><span>Vantar frá þér<small>gögn sem aðeins þú átt</small></span></button>' +
        '<button type="button" data-er="hoppa" data-v="claude" class="_claude"><b>' + n('claude') + '</b><span>Hjá Claude<small>í vinnslu · samþykkt</small></span></button></div>';
      if (!l.length) body += '<div class="er-tomt">Engin erindi á listanum.<br>Biddu Claude: „safna erindum úr pósti“ — hann les póstinn, finnur gögnin sem vantar og skrifar svartexta sem birtist hér.</div>';
      body += HLUTAR.map(h => {
        const m = hlutaListi(l, h[0]); if (!m.length) return '';
        const fellt = h[0] === 'buid' && !S.synaBuid;
        return '<div class="er-hluti ' + h[2] + '" id="_er-h-' + h[0] + '"><b>' + m.length + '</b>' + esc(h[1]) + (h[0] === 'buid' ? '<button type="button" data-er="syna-buid" data-v="1">' + (fellt ? 'sýna' : 'fela') + '</button>' : '') + '</div>' + (fellt ? '' : m.map(spjald).join(''));
      }).join('');
    }
    const html = '<div class="er-haus"><div><div class="tt">Erindi</div><div class="st">' + esc(st) + '</div></div><button type="button" class="uppf" data-er="uppf" title="Sækja aftur">↻</button></div>' + body;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(root) : null;
    if (root._h !== html) { root.innerHTML = html; root._h = html; }
    if (aftur) aftur();
  }
  // Skrifað í reit → geymt í minni, EKKI endurteiknað (fókus og bendill haldast); aðeins eyðulínan og Senda uppfærð.
  function innslattur(e) {
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.erIn) return;
    const id = +el.dataset.v, k = el.dataset.erIn;
    if (k === 'drog') {
      S.drog[id] = el.value;
      const ey = document.getElementById('_er-ey-' + id), sd = document.getElementById('_er-sd-' + id), em = eydur(el.value);
      if (ey) ey.innerHTML = eydaHtml(id, em);
      if (sd) sd.disabled = !!S.busy[id] || em.length > 0 || !el.value.trim();
      const root = document.getElementById(ROOT_ID); if (root) root._h = null;   // næsta teikning má ekki halda að DOM sé óbreytt
    } else if (k === 'til') S.til[id] = el.value;
    else if (k === 'cc') S.cc[id] = el.value;
    else if (k === 'efni') S.efni[id] = el.value;
    else if (k === 'sky') S.sky[id] = el.value;
  }
  function smellur(e) {
    const b = e.target && e.target.closest ? e.target.closest('[data-er]') : null;
    if (!b || b.tagName === 'TEXTAREA' || b.tagName === 'INPUT') return;
    const a = b.dataset.er, v = b.dataset.v || '', k = b.dataset.k || v;
    const r = S.rows.find(x => String(x.id) === String(k));
    switch (a) {
      case 'opna': { const id = +v; if (S.opin.has(id)) S.opin.delete(id); else S.opin.add(id); S.lokaSpurt = null; render(); return; }
      case 'kunni': S.kunni = v; render(); return;
      case 'syna-buid': S.synaBuid = !S.synaBuid; render(); return;
      case 'hoppa': { const h = document.getElementById('_er-h-' + v); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      case 'uppf': load(); return;
      case 'eyda': { const ta = document.getElementById('_er-ta-' + v), i = +b.dataset.i; if (!ta) return; const m = []; let x; const re = new RegExp(EYDA_RE.source, 'g'); while ((x = re.exec(ta.value))) m.push([x.index, x.index + x[0].length]); if (m[i]) { ta.focus(); ta.setSelectionRange(m[i][0], m[i][1]); } return; }
      case 'claude-opna': S.claudeOpid = S.claudeOpid === +v ? null : +v; render(); return;
      case 'vista': if (r) adgerd(r, () => vista(r)); return;
      case 'senda': if (r) adgerd(r, () => senda(r)); return;
      case 'claude': if (r) adgerd(r, async () => { await tilClaude(r, v, S.sky[r.id] || ''); S.claudeOpid = null; }); return;
      case 'loka':
        if (!r) return;
        if (S.lokaSpurt !== r.id) { S.lokaSpurt = r.id; render(); return; }
        S.lokaSpurt = null; adgerd(r, () => loka(r)); return;
      case 'bord': if (r && window.Samthykkja && Samthykkja.velja) { Samthykkja.velja(r.id); if (window.App && App.switchView) App.switchView('bord'); } return;
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
    if (!S.loading) load();
    clearInterval(_poll);
    _poll = setInterval(() => { if (!erVirk() || document.hidden || erAdSkrifa()) return; if (!S.loading) load(); }, 120000);
    if (!window.__er449cVakt) { window.__er449cVakt = true; document.addEventListener('visibilitychange', () => { if (document.hidden || !erVirk() || erAdSkrifa()) return; if (!S.loading) load(); }); }
  }
  const erVirk = () => { const vv = document.getElementById(VIEW_ID); return !!(vv && vv.classList.contains('active')); };
  // Endurhleðsla má aldrei kippa reitnum undan þeim sem er að skrifa (STÖÐUGT VIÐMÓT, regla 1).
  const erAdSkrifa = () => { const a = document.activeElement, vv = document.getElementById(VIEW_ID); return !!(a && vv && vv.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName)); };
  function hide() { try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {} clearInterval(_poll); _poll = 0; }
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._erindiPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      hide();
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._erindiPatched = true;
  }
  function boot() {
    patchSwitchView();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.ErindiSimi = { open, render, load, S, hluti, eydur, version: '449c' };
  console.log('[449c] Erindi — símasíða');
})();
