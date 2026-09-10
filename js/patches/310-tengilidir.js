/* === 📇 TENGILIÐIR — netfanga-/tengiliðaskrá úr pósti (2026-08-20) ===
 *
 * Sjálfstæð síða (view `view-tengilidir`, slug `#tengilidir`) sem birtir Charlize
 * tengiliðaskrána (charlize_contacts) — hvert netfang sem sést hefur í eldklar-pósti,
 * tengt fyrirtæki þar sem það er hægt. „Ein tengiliða-heimild, mörg sjónarhorn":
 * hér er heildar-listinn með tengingu + yfirferð; sama gögn og póst-merkin nota.
 *
 * Gögn: brunaholf /api/tengilidir (service-lykill — taflan er RLS-varin, vefurinn
 * kemst ekki beint í hana). GET skilar { contacts, stats }; POST tekur
 * link / unlink / approve / reject. Fyllt af /api/tengilidir-build (eldklar ONLY).
 *
 * ✓ = tengt fyrirtæki (kennitala). Otengt = á eftir að para. Pending = bíður
 * samþykktar. Smellt á fyrirtæki → opnar prófílinn (Companies.openDetail).
 */
(() => {
  if (window.__tengilidirPage) return;
  window.__tengilidirPage = true;

  const API = 'https://brunaholf.netlify.app/api/tengilidir';
  const VIEW_ID = 'view-tengilidir';
  const NAV_KEY = 'tengilidir';
  const NAV_LABEL = '📇 Tengiliðir';
  const ROLE = { bokhald: '💰 Bókhald', husvordur: '🔧 Húsvörður', pantanir: '📦 Pantanir', onnur: '🏢 Skrifstofa' };

  const STATE = { contacts: [], stats: null, filter: 'otengd', search: '', loading: false, loaded: false };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('is-IS'); } catch (_) { return ''; } };
  const coByKt = (kt) => { if (!kt) return null; const L = (window.Companies && Companies.list) || []; return L.find((c) => String(c.kennitala || '').replace('-', '') === String(kt).replace('-', '')) || null; };

  function injectCSS() {
    if (document.getElementById('tgl-css')) return;
    const s = document.createElement('style'); s.id = 'tgl-css';
    s.textContent =
      '.tgl-wrap{max-width:1000px;margin:0 auto;padding:14px 16px 70px}' +
      '.tgl-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px}' +
      '.tgl-title{font-weight:800;font-size:20px;color:var(--ink,#0f172a)}' +
      '.tgl-sub{font-size:12.5px;color:var(--ink3,#64748b);margin-top:2px}' +
      '.tgl-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap}' +
      '.tgl-seg{display:inline-flex;border:1px solid var(--brd,#e2e8f0);border-radius:9px;overflow:hidden}' +
      '.tgl-seg button{border:0;background:var(--surface,#fff);color:var(--ink2,#334155);padding:7px 11px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}' +
      '.tgl-seg button.on{background:#4f46e5;color:#fff}' +
      '.tgl-search{border:1px solid var(--brd,#e2e8f0);border-radius:9px;padding:7px 11px;font:inherit;font-size:13px;min-width:190px;background:var(--surface,#fff);color:var(--ink,#0f172a)}' +
      '.tgl-btn{border:1px solid var(--brd,#e2e8f0);background:var(--surface,#fff);color:var(--ink2,#334155);border-radius:9px;padding:7px 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}' +
      '.tgl-row{display:flex;gap:11px;align-items:flex-start;padding:10px 12px;border:1px solid var(--brd,#e2e8f0);border-radius:11px;background:var(--surface,#fff);margin-bottom:7px}' +
      '.tgl-chk{flex:0 0 auto;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;margin-top:1px}' +
      '.tgl-chk.on{background:#dcfce7;color:#16a34a}.tgl-chk.off{background:#f1f5f9;color:#94a3b8}' +
      '.tgl-mid{flex:1;min-width:0}' +
      '.tgl-addr{font-weight:700;font-size:13.5px;color:var(--ink,#0f172a);word-break:break-all}' +
      '.tgl-meta{font-size:12px;color:var(--ink3,#64748b);margin-top:2px}' +
      '.tgl-co{color:#4f46e5;font-weight:700;text-decoration:none;cursor:pointer}.tgl-co:hover{text-decoration:underline}' +
      '.tgl-otengd{color:#b45309;font-weight:700}' +
      '.tgl-pill{display:inline-block;font-size:10.5px;font-weight:800;border-radius:99px;padding:1px 8px;margin-left:6px}' +
      '.tgl-pill.role{background:#eef2ff;color:#4338ca}.tgl-pill.pend{background:#fef3c7;color:#92400e}.tgl-pill.appr{background:#dcfce7;color:#166534}' +
      '.tgl-acts{display:flex;flex-direction:column;gap:5px;flex:0 0 auto}' +
      '.tgl-a{border:1px solid var(--brd,#e2e8f0);background:var(--surface,#fff);border-radius:8px;padding:5px 9px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}' +
      '.tgl-a.link{background:#eef2ff;border-color:#c7d2fe;color:#4338ca}.tgl-a.ok{background:#dcfce7;border-color:#bbf7d0;color:#166534}.tgl-a.no{color:#b91c1c}' +
      '.tgl-empty{text-align:center;color:var(--ink3,#64748b);padding:34px;font-size:13px}' +
      '.tgl-pick{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.tgl-pick-box{background:var(--surface,#fff);color:var(--ink,#0f172a);border-radius:13px;max-width:460px;width:100%;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
      '.tgl-pick-res{overflow-y:auto;padding:4px}' +
      '.tgl-pick-breitt{max-width:760px}' +
      '.tgl-pick-haus{padding:12px 14px;border-bottom:1px solid var(--brd,#eef2f7)}' +
      '.tgl-pick-skrun{overflow-y:auto;padding:6px 14px 12px;flex:1;min-height:0}' +
      '.tgl-pick-fot{padding:10px 14px;border-top:1px solid var(--brd,#eef2f7);display:flex;justify-content:space-between;gap:8px}' +
      '.tgl-kafli{margin:8px 0 12px}' +
      '.tgl-kafli-h{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--ink3,#64748b);margin:0 0 6px}' +
      '.tgl-till{padding:8px 10px;border:1px solid var(--brd,#e2e8f0);border-radius:9px;margin-bottom:6px;cursor:pointer}' +
      '.tgl-till:hover{background:#eef2ff;border-color:#c7d2fe}' +
      '.tgl-till-h{font-size:13px;color:var(--ink,#0f172a)}' +
      '.tgl-till-r{font-size:11.5px;color:var(--ink3,#64748b);margin-top:2px}' +
      '.tgl-kt{color:var(--ink3,#64748b);font-weight:400;font-size:12px}' +
      '.tgl-advorun{background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:9px;padding:8px 10px;font-size:12.5px;margin-bottom:8px}' +
      '.tgl-post{padding:7px 9px;border-radius:8px;cursor:pointer;border-bottom:1px solid var(--brd,#f1f5f9)}' +
      '.tgl-post:hover{background:#f8fafc}' +
      '.tgl-post-h{font-size:12.5px;color:var(--ink,#0f172a);display:flex;gap:8px;align-items:baseline}' +
      '.tgl-post-h span{flex:0 0 auto;color:var(--ink3,#64748b);font-size:11.5px}' +
      '.tgl-post-s{font-size:12px;color:var(--ink3,#64748b);margin-top:2px}' +
      '.tgl-post-b{white-space:pre-wrap;font-size:12px;color:var(--ink2,#334155);background:#f8fafc;border-radius:7px;padding:8px;margin-top:6px;max-height:260px;overflow-y:auto}' +
      '.tgl-len summary{cursor:pointer;font-size:12px;color:#4338ca;margin:6px 2px}' +
      '.tgl-pick-item{padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--ink,#0f172a);font-weight:600}.tgl-pick-item:hover{background:#eef2ff}';
    document.head.appendChild(s);
  }

  function counts() {
    const c = STATE.contacts;
    return { all: c.length, otengd: c.filter((x) => !x.kennitala).length, pending: c.filter((x) => x.status === 'pending').length, linked: c.filter((x) => x.kennitala).length };
  }
  function filtered() {
    let arr = STATE.contacts.slice();
    if (STATE.filter === 'otengd') arr = arr.filter((x) => !x.kennitala);
    else if (STATE.filter === 'pending') arr = arr.filter((x) => x.status === 'pending');
    else if (STATE.filter === 'linked') arr = arr.filter((x) => x.kennitala);
    const q = STATE.search.trim().toLowerCase();
    if (q) arr = arr.filter((x) => (x.netfang || '').toLowerCase().includes(q) || (x.len || '').toLowerCase().includes(q) || (x.fyrirtaeki || '').toLowerCase().includes(q));
    return arr;
  }

  function rowHtml(x) {
    const linked = !!x.kennitala;
    const co = coByKt(x.kennitala);
    const coHtml = linked
      ? (co ? '<span class="tgl-co" data-open="' + co.id + '">' + esc(co.nafn) + '</span>' : '<b>' + esc(x.fyrirtaeki || x.kennitala) + '</b>')
      : '<span class="tgl-otengd">otengt</span>';
    const role = x.hlutverk && ROLE[x.hlutverk] ? '<span class="tgl-pill role">' + ROLE[x.hlutverk] + '</span>' : '';
    const st = x.status === 'pending' ? '<span class="tgl-pill pend">bíður</span>' : (x.status === 'approved' ? '<span class="tgl-pill appr">✓ samþykkt</span>' : '');
    const acts = [];
    acts.push('<button class="tgl-a link" data-act="link" data-id="' + x.id + '">🔗 ' + (linked ? 'Breyta' : 'Tengja') + '</button>');
    if (x.status === 'pending') acts.push('<button class="tgl-a ok" data-act="approve" data-id="' + x.id + '">✓ Samþykkja</button>');
    acts.push('<button class="tgl-a no" data-act="reject" data-id="' + x.id + '">✕</button>');
    return '<div class="tgl-row">' +
      '<div class="tgl-chk ' + (linked ? 'on' : 'off') + '">' + (linked ? '✓' : '○') + '</div>' +
      '<div class="tgl-mid">' +
        '<div class="tgl-addr">' + esc(x.netfang) + role + st + '</div>' +
        '<div class="tgl-meta">' + coHtml + ' · ' + esc(x.len || '') + ' · ' + (x.faerslur || 0) + ' póstar' + (x.sidast_sest ? ' · síðast ' + fmtDate(x.sidast_sest) : '') + '</div>' +
      '</div>' +
      '<div class="tgl-acts">' + acts.join('') + '</div>' +
    '</div>';
  }

  function render() {
    const host = document.getElementById('tgl-list'); if (!host) return;
    const c = counts();
    const seg = document.getElementById('tgl-seg'); if (seg) seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.f === STATE.filter));
    const sub = document.getElementById('tgl-subline');
    if (sub) sub.textContent = STATE.stats ? (STATE.stats.total + ' tengiliðir · ' + STATE.stats.linked + ' tengdir · ' + STATE.stats.otengd + ' otengt · ' + STATE.stats.domains + ' lén') : '';
    if (STATE.loading) { host.innerHTML = '<div class="tgl-empty">⏳ Sæki tengiliði…</div>'; return; }
    const arr = filtered();
    if (!arr.length) { host.innerHTML = '<div class="tgl-empty">Engir tengiliðir í þessu sjónarhorni.</div>'; return; }
    host.innerHTML = arr.map(rowHtml).join('');
    // 10.09.2026: Companies.openDetail skiptir ekki um sýn — Tengiliða-síðan stóð áfram opin
    // FYRIR AFTAN prófílinn (tvær sýnir sýnilegar, mælt á lifandi vef). Sama mynstur og 114/147.
    host.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => {
      try { if (window.App && App.switchView) App.switchView('companies'); Companies.openDetail(+el.dataset.open); } catch (_) {}
    }));
    host.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); onAct(b.dataset.act, +b.dataset.id); }));
  }

  async function post(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }
  function apply(updated) { if (!updated) return; const i = STATE.contacts.findIndex((x) => x.id === updated.id); if (i >= 0) STATE.contacts[i] = updated; STATE.stats = null; render(); }

  async function onAct(act, id) {
    const x = STATE.contacts.find((c) => c.id === id); if (!x) return;
    if (act === 'link') return openPicker(x);
    if (act === 'approve') { try { const j = await post({ action: 'approve', id }); apply(j.contact); toast('✓ Samþykkt'); } catch (e) { toast('⚠ ' + e.message); } return; }
    if (act === 'reject') {
      if (!confirm('Hafna tengiliðnum „' + x.netfang + '"? (hann hverfur af listanum)')) return;
      try { await post({ action: 'reject', id }); STATE.contacts = STATE.contacts.filter((c) => c.id !== id); STATE.stats = null; render(); toast('Hafnað'); } catch (e) { toast('⚠ ' + e.message); }
    }
  }

  // ── 10.09.2026 — SAMHENGI Í TENGJA-GLUGGANUM ─────────────────────────────────
  // Áður sýndi glugginn aðeins nafn + kt fyrirtækja á sama léni (mest 40, stafrófsröð).
  // Agnar: „very tough to Tengja by myself with no context". Mælt sama dag:
  // bryndis@rekstrarumsjon.is fékk 6 tillögur og aðeins 3 voru hús sem hún skrifaði um;
  // hjá solrun@eignaumsjon.is var rétta húsið í sæti 53 af 73 og sást því aldrei.
  // Nú: póstarnir sjálfir (email_digest, aðeins eldklar-pósthólfið, sem anon-policy leyfir)
  // og tillögur úr því sem STENDUR í þeim: kennitala með gildri vartölu > gata + húsnúmer >
  // sama lén. Hver tillaga ber rökin sín. Ekkert er vistað fyrr en smellt er.
  const POSTHOLF = 'eldklar@eldklar.is';

  // Kennitala: vartala (9. stafur, vogir 3,2,7,6,5,4,3,2) og öld (10. stafur 8/9/0).
  // Símanúmer eins og +3545401305 falla á þessu og verða ekki að „kennitölu".
  function ktGild(d) {
    if (!/^\d{10}$/.test(d)) return false;
    const w = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0; for (let i = 0; i < 8; i++) sum += w[i] * +d[i];
    let v = 11 - (sum % 11); if (v === 11) v = 0; if (v === 10) return false;
    return v === +d[8] && '890'.includes(d[9]);
  }
  const ktSnid = (d) => d.slice(0, 6) + '-' + d.slice(6);
  const aDiakrit = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/[^a-z0-9]/g, '');

  // Gata + húsnúmer. Fyrstu 5 stafir götunnar + númer þola beygingu
  // (Eskivellir/Eskivöllum, Álfaskeið/Álfaskeiði, Þverbrekka/Þverbrekku). Bil á
  // númeri („98-100") gefur lykil fyrir bæði númerin.
  function gotuLyklar(texti) {
    const ut = [];
    const re = /(\p{L}{3,})[ \t]+(\d{1,4}[a-z]?)(?:[ \t]*[-–][ \t]*(\d{1,4}[a-z]?))?(?![\p{L}\d])/gu;
    const t = String(texti || '').toLowerCase();
    let m;
    while ((m = re.exec(t)) !== null) {
      const stofn = m[1].slice(0, 5);
      ut.push({ lykill: stofn + '|' + m[2], texti: m[0] });
      if (m[3]) ut.push({ lykill: stofn + '|' + m[3], texti: m[0], endi: true });
    }
    return ut;
  }

  function husaSkra() {
    const L = (window.Companies && Companies.list) || [];
    const eftirKt = new Map(), eftirGotu = new Map();
    for (const c of L) {
      const k = String(c.kennitala || '').replace(/\D/g, '');
      if (k.length === 10) { if (!eftirKt.has(k)) eftirKt.set(k, []); eftirKt.get(k).push(c); }
      const sed = new Set();
      for (const reitur of [c.nafn, c.heimilisfang]) for (const g of gotuLyklar(reitur)) {
        if (sed.has(g.lykill)) continue;
        sed.add(g.lykill);
        if (!eftirGotu.has(g.lykill)) eftirGotu.set(g.lykill, []);
        eftirGotu.get(g.lykill).push(c);
      }
    }
    return { L, eftirKt, eftirGotu };
  }

  async function saekjaPosta(netfang) {
    const sb = window.DB && DB.sb;
    if (!sb) throw new Error('engin Supabase-tenging');
    const a = String(netfang || '').toLowerCase().trim();
    if (!/^[^\s,()*"]+@[^\s,()*"]+$/.test(a)) throw new Error('ógilt netfang');
    const { data, error } = await sb.from('email_digest')
      .select('id,received_at,folder,sender_email,subject,snippet,body_preview')
      .eq('account', POSTHOLF)
      .or('sender_email.ilike.' + a + ',to_addresses.ilike.*' + a + '*')
      .order('received_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    return data || [];
  }

  // Aðeins það sem viðmælandinn skrifaði sjálfur: skorið við fyrstu undirskrift eða
  // tilvitnun. Mælt 10.09.2026: svör bryndis@ og solrun@ vitna í undirskriftina okkar
  // („-- Með bestu kveðju / Helluhrauni 10 / … eldklar@eldklar.is"), og það gerði
  // Brunahólf Slökkvitæki ehf. og Sleed ehf. (bæði að Helluhrauni 10) að „húsum" sem
  // netfangið skrifaði um. Sama um undirskrift viðmælandans: „Laugavegi 178" í undirskrift
  // dalli@eignarekstur.is gerði Móðurást og SyNord (sama heimilisfang) að „húsum". Því er
  // líka skorið við kveðjulínu.
  const KLIPPA = [
    /\n[ \t]*--[ \t]*\n/,
    /\n[ \t]*-{3,}[ \t]*(original message|upprunaleg)/i,
    /\n[ \t]*(from|frá|sent|sendandi)[ \t]*:/i,
    /skrifaði[^\n]{0,160}:/i,
    /wrote:/i,
    /\n[ \t]*>/,
    /\n[ \t]*(kveðja|kv[.,]|bestu kveðjur|með kveðju|með bestu kveðju|virðingarfyllst|best regards|kind regards|regards)/i,
    /eldklar@eldklar\.is/i,
  ];
  function eiginTexti(t) {
    const s = String(t || '');
    let skurdur = s.length;
    for (const re of KLIPPA) { const m = re.exec(s); if (m && m.index < skurdur) skurdur = m.index; }
    return s.slice(0, skurdur);
  }

  function reiknaTillogur(x, postar, skra) {
    const hus = new Map();
    const fa = (c) => {
      let h = hus.get(c.id);
      if (!h) { h = { c, kt: new Set(), gata: new Set(), gataEfni: new Set(), daemi: new Set(), len: false }; hus.set(c.id, h); }
      return h;
    };
    const utanSkrar = new Map();
    const goturUtan = new Map();
    for (const p of postar) {
      const texti = (p.subject || '') + '\n' + eiginTexti(p.body_preview || p.snippet || '');
      const ktRe = /(?<![\d+])(\d{6})[- ]?(\d{4})(?!\d)/g;
      let m;
      while ((m = ktRe.exec(texti)) !== null) {
        const d = m[1] + m[2];
        if (!ktGild(d)) continue;
        const cs = skra.eftirKt.get(d);
        if (cs) cs.forEach((c) => { const h = fa(c); h.kt.add(p.id); h.daemi.add('kt. ' + ktSnid(d)); });
        else { if (!utanSkrar.has(d)) utanSkrar.set(d, new Set()); utanSkrar.get(d).add(p.id); }
      }
      const efnisLyklar = new Set(gotuLyklar(p.subject).map((g) => g.lykill));
      for (const g of gotuLyklar(texti)) {
        (skra.eftirGotu.get(g.lykill) || []).forEach((c) => {
          const h = fa(c); h.gata.add(p.id); h.daemi.add('„' + g.texti.trim() + '“');
          if (efnisLyklar.has(g.lykill)) h.gataEfni.add(p.id);
        });
      }
      // Hús í EFNISLÍNU sem finnast ekki í skránni — dalli@eignarekstur.is skrifaði t.d. um
      // Hraunbæ 140 í 7 póstum. Aðeins efnislína (lítið suð) og húsnúmer með 1–3 stöfum.
      for (const g of gotuLyklar(p.subject)) {
        if (g.endi || skra.eftirGotu.has(g.lykill) || !/\|\d{1,3}[a-z]?$/.test(g.lykill)) continue;
        if (!goturUtan.has(g.lykill)) goturUtan.set(g.lykill, { texti: g.texti.trim(), postar: new Set() });
        goturUtan.get(g.lykill).postar.add(p.id);
      }
    }
    const lenX = String(x.len || '').toLowerCase();
    if (lenX) for (const c of skra.L) {
      const cl = String(c.len || (c.netfang || '').split('@')[1] || '').toLowerCase();
      if (cl === lenX) fa(c).len = true;
    }
    const stofn = aDiakrit(lenX.split('.')[0]);
    const listi = [...hus.values()].map((h) => Object.assign(h, {
      sjalf: stofn.length >= 4 && aDiakrit(h.c.nafn).includes(stofn),
      stig: h.kt.size * 100 + h.gataEfni.size * 20 + h.gata.size * 10 + (h.len ? 1 : 0),
    })).sort((a, b) => b.stig - a.stig || String(a.c.nafn || '').localeCompare(String(b.c.nafn || ''), 'is'));
    return { listi, utanSkrar, goturUtan };
  }

  function openPicker(x) {
    const wrap = document.createElement('div'); wrap.className = 'tgl-pick';
    wrap.innerHTML = '<div class="tgl-pick-box tgl-pick-breitt">' +
      '<div class="tgl-pick-haus"><div style="font-weight:800;font-size:14px;color:var(--ink,#0f172a)">Tengja ' + esc(x.netfang) + '</div>' +
        '<div class="tgl-sub">' + esc([x.heiti, x.fyrirtaeki ? 'tengt nú: ' + x.fyrirtaeki : ''].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div class="tgl-pick-skrun">' +
        '<div class="tgl-kafli"><div class="tgl-kafli-h">💡 Tillögur úr póstunum</div><div id="tgl-till"><div class="tgl-empty" style="padding:14px">⏳ Les póstana…</div></div></div>' +
        '<div class="tgl-kafli"><div class="tgl-kafli-h" id="tgl-postar-h">📨 Póstar</div><div id="tgl-postar"></div></div>' +
        '<div class="tgl-kafli"><div class="tgl-kafli-h">🔎 Leita að öðru fyrirtæki</div>' +
          '<input class="tgl-search" id="tgl-pick-q" style="width:100%;box-sizing:border-box" placeholder="Nafn eða kennitala…">' +
          '<div class="tgl-pick-res" id="tgl-pick-res"></div></div>' +
      '</div>' +
      '<div class="tgl-pick-fot">' +
        (x.kennitala ? '<button class="tgl-a no" id="tgl-pick-unlink">Aftengja</button>' : '<span></span>') +
        '<button class="tgl-btn" id="tgl-pick-x">Loka</button></div>' +
    '</div>';
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('#tgl-pick-x').addEventListener('click', close);
    const un = wrap.querySelector('#tgl-pick-unlink');
    if (un) un.addEventListener('click', async () => { try { const j = await post({ action: 'unlink', id: x.id }); apply(j.contact); close(); toast('Aftengt'); } catch (e) { toast('⚠ ' + e.message); } });

    const skra = husaSkra();
    let husMedRokum = [];   // hús (ekki umsjónaraðilinn sjálfur) sem póstarnir fjalla um
    let goturUtanNofn = []; // hús í efnislínum sem eru ekki í skránni

    const tengja = async (kt, nm) => {
      if (!kt) { toast('⚠ Fyrirtæki vantar kennitölu'); return; }
      const onnur = husMedRokum.filter((h) => String(h.c.kennitala || '') !== kt).map((h) => h.c.nafn).concat(goturUtanNofn);
      if (husMedRokum.length + goturUtanNofn.length >= 2 && onnur.length) {
        const nofn = onnur.slice(0, 4).join(', ') + (onnur.length > 4 ? ' …' : '');
        if (!confirm('Tengja ' + x.netfang + ' við „' + nm + '“?\n\nNetfangið skrifar líka um ' + onnur.length + ' önnur hús (' + nofn + '). ' +
          'Tengt einu húsi getur það hús fengið póst netfangsins um hin húsin líka.')) return;
      }
      try { const j = await post({ action: 'link', id: x.id, kennitala: kt, fyrirtaeki: nm }); apply(j.contact); close(); toast('🔗 Tengt: ' + nm); } catch (e) { toast('⚠ ' + e.message); }
    };
    const valLina = (c) => '<div class="tgl-pick-item" data-kt="' + esc(c.kennitala || '') + '" data-nm="' + esc(c.nafn || '') + '">' + esc(c.nafn) +
      (c.kennitala ? ' <span class="tgl-kt">' + esc(c.kennitala) + '</span>' : '') + '</div>';
    const virkja = (host) => host.querySelectorAll('[data-kt]').forEach((el) => el.addEventListener('click', () => tengja(el.dataset.kt, el.dataset.nm)));

    const teiknaPosta = (postar) => {
      const h = wrap.querySelector('#tgl-postar-h'), host = wrap.querySelector('#tgl-postar');
      h.textContent = '📨 Póstar (' + postar.length + (postar.length >= 300 ? ', síðustu 300' : '') + ')';
      if (!postar.length) { host.innerHTML = '<div class="tgl-empty" style="padding:12px">Engir póstar frá eða til þessa netfangs í eldklar-pósthólfinu.</div>'; return; }
      let allir = false;
      const draw = () => {
        const syn = allir ? postar : postar.slice(0, 5);
        host.innerHTML = syn.map((p) => {
          const fra = String(p.sender_email || '').toLowerCase() === String(x.netfang || '').toLowerCase();
          return '<div class="tgl-post">' +
            '<div class="tgl-post-h"><span>' + esc(fmtDate(p.received_at)) + ' · ' + (fra ? 'frá' : 'til') + '</span><b>' + esc(p.subject || '(ekkert efni)') + '</b></div>' +
            '<div class="tgl-post-s">' + esc(String(p.snippet || '').slice(0, 220)) + '</div>' +
            '<div class="tgl-post-b" hidden>' + esc(p.body_preview || p.snippet || '') + '</div></div>';
        }).join('') + (postar.length > 5 ? '<button class="tgl-btn" id="tgl-postar-fl" style="margin-top:6px">' + (allir ? 'Sýna færri' : 'Sýna alla ' + postar.length) + '</button>' : '');
        host.querySelectorAll('.tgl-post').forEach((el) => el.addEventListener('click', () => { const b = el.querySelector('.tgl-post-b'); b.hidden = !b.hidden; }));
        const fl = host.querySelector('#tgl-postar-fl');
        if (fl) fl.addEventListener('click', () => { allir = !allir; draw(); });
      };
      draw();
    };

    const teiknaTillogur = (t) => {
      const host = wrap.querySelector('#tgl-till');
      const rok = t.listi.filter((h) => h.kt.size || h.gata.size);
      // Hús TELJAST aðeins með kennitölu eða götu í efnislínu. Gata sem sést bara í meginmáli er
      // oft heimilisfang umsjónaraðilans í undirskrift („Laugavegi 178" hjá dalli@eignarekstur.is
      // gaf Móðurást og SyNord) — hún birtist áfram sem tillaga en hækkar ekki húsafjöldann.
      husMedRokum = rok.filter((h) => !h.sjalf && (h.kt.size || h.gataEfni.size));
      goturUtanNofn = [...t.goturUtan.values()].sort((a, b) => b.postar.size - a.postar.size)
        .map((u) => u.texti.charAt(0).toUpperCase() + u.texti.slice(1));
      const adeinsLen = t.listi.filter((h) => !h.kt.size && !h.gata.size && h.len);
      const fjoldi = (n, eitt, fleiri) => n + ' ' + (n === 1 ? eitt : fleiri);
      let html = '';
      const husFjoldi = husMedRokum.length + goturUtanNofn.length;
      if (husFjoldi >= 2) {
        html += '<div class="tgl-advorun">⚠ Þetta netfang skrifar um <b>' + husFjoldi + ' ólík hús</b> og er líklega umsjónaraðili. ' +
          'Veldu húsið sem pósturinn á við, eða láttu vera að tengja netfangið við eitt hús.</div>';
      }
      html += rok.slice(0, 12).map((h) => {
        const c = h.c;
        const rokT = [h.kt.size ? 'kennitala í ' + fjoldi(h.kt.size, 'pósti', 'póstum') : '', h.gata.size ? 'gata í ' + fjoldi(h.gata.size, 'pósti', 'póstum') : '', h.len ? 'sama lén' : '']
          .filter(Boolean).join(' · ');
        return '<div class="tgl-till" data-kt="' + esc(c.kennitala || '') + '" data-nm="' + esc(c.nafn || '') + '">' +
          '<div class="tgl-till-h"><b>' + esc(c.nafn) + '</b>' + (c.kennitala ? ' <span class="tgl-kt">' + esc(c.kennitala) + '</span>' : '') +
          (c.er_i_thjonustu ? ' <span class="tgl-pill appr">í þjónustu</span>' : ' <span class="tgl-pill">ekki í þjónustu</span>') +
          (h.sjalf ? ' <span class="tgl-pill role">umsjónaraðilinn sjálfur</span>' : '') + '</div>' +
          '<div class="tgl-till-r">' + esc(rokT) + ' — ' + esc([...h.daemi].slice(0, 3).join(', ')) + '</div></div>';
      }).join('');
      if (!rok.length) html += '<div class="tgl-empty" style="padding:12px">Engin kennitala eða gata í póstunum passar við fyrirtæki í skránni.</div>';
      if (t.utanSkrar.size) {
        html += '<div class="tgl-till-r" style="margin:6px 2px">Kennitölur í póstunum sem eru EKKI í skránni: ' +
          esc([...t.utanSkrar.entries()].map(([k, s]) => ktSnid(k) + ' (' + fjoldi(s.size, 'póstur', 'póstar') + ')').join(', ')) + '</div>';
      }
      if (t.goturUtan.size) {
        const utan = [...t.goturUtan.values()].sort((a, b) => b.postar.size - a.postar.size).slice(0, 8);
        html += '<div class="tgl-till-r" style="margin:6px 2px">Hús í efnislínum sem finnast EKKI í skránni: ' +
          esc(utan.map((u) => u.texti.charAt(0).toUpperCase() + u.texti.slice(1) + ' (' + fjoldi(u.postar.size, 'póstur', 'póstar') + ')').join(', ')) + '</div>';
      }
      if (adeinsLen.length) {
        html += '<details class="tgl-len"><summary>Fyrirtæki á sama léni án stoðar í póstunum (' + adeinsLen.length + ')</summary>' +
          adeinsLen.slice(0, 40).map((h) => valLina(h.c)).join('') + '</details>';
      }
      host.innerHTML = html;
      virkja(host);
    };

    saekjaPosta(x.netfang).then((postar) => {
      if (!document.body.contains(wrap)) return;
      teiknaPosta(postar);
      teiknaTillogur(reiknaTillogur(x, postar, skra));
    }).catch((e) => {
      const t = wrap.querySelector('#tgl-till');
      if (t) t.innerHTML = '<div class="tgl-empty" style="color:#b91c1c;padding:12px">Náði ekki að lesa póstana: ' + esc(e.message || e) + '</div>';
    });

    const q = wrap.querySelector('#tgl-pick-q'), res = wrap.querySelector('#tgl-pick-res');
    q.addEventListener('input', () => {
      const term = q.value.trim().toLowerCase();
      if (!term) { res.innerHTML = ''; return; }
      const list = skra.L.filter((c) => (c.nafn || '').toLowerCase().includes(term) || String(c.kennitala || '').replace('-', '').includes(term.replace('-', '')));
      res.innerHTML = list.slice(0, 40).map(valLina).join('') || '<div class="tgl-empty">Ekkert fannst</div>';
      virkja(res);
    });
  }

  function toast(m) { try { if (window.Toast && Toast.show) return Toast.show(m); } catch (_) {} const d = document.createElement('div'); d.textContent = m; d.style.cssText = 'position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:100001;background:#0f172a;color:#fff;padding:9px 15px;border-radius:9px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.3)'; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }

  async function load() {
    STATE.loading = true; render();
    try {
      const r = await fetch(API, { cache: 'no-store' }); const j = await r.json();
      if (j.error) throw new Error(j.error);
      STATE.contacts = j.contacts || []; STATE.stats = j.stats || null; STATE.loaded = true;
    } catch (e) { const h = document.getElementById('tgl-list'); if (h) h.innerHTML = '<div class="tgl-empty" style="color:#b91c1c"><b>Villa við að sækja tengiliði:</b><br>' + esc(e.message || e) + '</div>'; }
    STATE.loading = false; render();
  }

  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala') || document.querySelector('.view');
    if (!sample || !sample.parentElement) return;
    injectCSS();
    const v = document.createElement('div'); v.id = VIEW_ID; v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<div class="tgl-wrap">' +
      '<div class="tgl-head"><div><div class="tgl-title">📇 Tengiliðir</div><div class="tgl-sub" id="tgl-subline"></div></div>' +
        '<div class="tgl-tools">' +
          '<div class="tgl-seg" id="tgl-seg"><button data-f="otengd">Otengt</button><button data-f="pending">Bíður</button><button data-f="linked">Tengt</button><button data-f="all">Allir</button></div>' +
          '<input class="tgl-search" id="tgl-q" type="search" placeholder="Leita (netfang · lén · fyrirtæki)…">' +
          '<button class="tgl-btn" id="tgl-refresh">🔄</button>' +
        '</div></div>' +
      '<div id="tgl-list"><div class="tgl-empty">⏳ Sæki tengiliði…</div></div></div>';
    sample.parentElement.appendChild(v);
    v.querySelector('#tgl-seg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { STATE.filter = b.dataset.f; render(); }));
    const si = v.querySelector('#tgl-q'); si.addEventListener('input', () => { STATE.search = si.value; render(); });
    v.querySelector('#tgl-refresh').addEventListener('click', () => { STATE.loaded = false; load(); });
  }
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach((v) => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === NAV_KEY));
    try { if (location.hash !== '#' + NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    if (!STATE.loaded && !STATE.loading) load();
  }
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 600); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const tpl = nav.querySelector('.vnav-btn'); if (!tpl) { setTimeout(injectNav, 600); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY); btn.innerHTML = NAV_LABEL;
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    nav.appendChild(btn);
  }
  function patchSwitchView() {
    if (!window.App || window.App._tglSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const mine = document.getElementById(VIEW_ID); if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      return orig.apply(this, arguments);
    };
    window.App._tglSwitchPatched = true;
  }
  function openFromHash() { const slug = (location.hash || '').replace(/^#/, ''); if (slug === NAV_KEY) { if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); } }
  function boot() {
    injectNav(); patchSwitchView(); ensureView(); openFromHash();
    window.addEventListener('hashchange', openFromHash);
    setTimeout(() => { injectNav(); patchSwitchView(); }, 1600);
    console.log('[tengilidir] page installed (#tengilidir)');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
