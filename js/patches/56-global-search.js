/* === ALHEIMSLEIT v2 — finnur OG opnar (Ctrl/Cmd+K) ===
 *
 * Agnar 20.11.2026: „Eg bara veit ekkert hvert allt fer eda hvar er, eg finn ekkert."
 * Mælt sama dag á lifandi vef: 63 hnappar í hliðarstikunni, 12 hamir á Þjónustuborðinu
 * og sex stakar síður. Leitin (v1) var til og fann hlutina — en gerði tvennt rangt:
 *
 *   1. SMELLUR OPNAÐI EKKI HLUTINN. openResult kallaði aðeins App.switchView(view),
 *      svo „Hótel Varmaland" skilaði þér á LISTANN með 1.377 félögum. Þú fannst
 *      niðurstöðuna og týndir henni aftur í sama smelli.
 *   2. HÚN LEITAÐI EKKI AÐ ÞVÍ SEM TÝNIST. Aðeins fyrirtæki, sölur, verkbeiðnir,
 *      tæki og tilboð — engin mál af borðinu, engin skjöl, og ENGAR SÍÐUR. Spurningin
 *      „hvar er Kröfu yfirlitið" átti sér hvergi svar.
 *
 * v2 lagar hvort tveggja:
 *   • Hver niðurstaða opnast á sínum stað um djúptengi 235 (#company/<id>, #sale/<num>,
 *     #unit/<serial>, #verkbeidni/<num>), _openCompanySafe (mapfix) eða Bord368.opnaMal.
 *   • Síður eru lesnar LIFANDI úr viðmótinu: .vnav-btn úr hliðarstikunni, hamirnir úr
 *     skugga-rót borðsins ([data-t5="mode"]) og stöku síðurnar hér fyrir neðan. Nýr
 *     hnappur í stikunni ratar sjálfkrafa í leitina — enginn listi til að halda við.
 *   • Tómur reitur sýnir ALLAR síður strax. Leitin er þá kortið yfir kerfið.
 *   • Íslensk stafsetning er fyrirgefin á síðunum: „thjonustubord", „krofu", „bokhald"
 *     hitta. Agnar skrifar oftast án broddstafa úr símanum.
 *   • Á síma (<901px) er fastur leitarhnappur neðst til hægri. Hliðarstikustíllinn (391)
 *     á aðeins við frá 901px, svo þar var hnappurinn 26 px og ósýnilegur í reynd.
 *
 * Opnunarleiðir eru allar til fyrir: þetta býr enga nýja til og breytir engri síðu.
 */
(() => {
  if (window.__globalSearchInstalled) return;
  window.__globalSearchInstalled = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getSB = () => window.DB && window.DB.sb;

  // Broddstafir og sérstafir burt svo „thjonustubord" hitti „Þjónustuborð".
  const norm = s => String(s == null ? '' : s).toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i').replace(/[óò]/g, 'o')
    .replace(/[úù]/g, 'u').replace(/[ýỳ]/g, 'y').replace(/ð/g, 'd').replace(/þ/g, 'th')
    .replace(/æ/g, 'ae').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, ' ').trim();

  // ── stakar síður (ekki hnappur í stikunni) ────────────────────────────────
  const STAKAR = [
    { l: 'Afgreiðsla — tilbúin verk', u: '/afgreidsla.html', o: 'samthykkt verk takki' },
    { l: 'Kúnnaskrá', u: '/kunnaskra.html', o: 'vidskiptavinir leit kennitala' },
    { l: 'Póstsvörun', u: '/postsvorun.html', o: 'tolvupostur svar' },
    { l: 'Hreyfingaryfirlit', u: '/hreyfingaryfirlit.html', o: 'bokhald faerslur' },
    { l: 'Uppgjörslisti', u: '/uppgjorslisti.html', o: 'uppgjor' },
    { l: 'Brunahólf — stjórnborð', u: 'https://brunaholf.netlify.app/', o: 'hub bh jarvis' },
    { l: 'Brunahólf — Kerfis-kort', u: 'https://brunaholf.netlify.app/kerfiskort.html', o: 'gagnaskra tengingar skjol stadir' }
  ];

  // ── síðurnar, lesnar lifandi úr viðmótinu ─────────────────────────────────
  function sidur() {
    const ut = [];
    // 1) hliðarstikan
    document.querySelectorAll('.vnav-btn').forEach(b => {
      const t = (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/\s*\d+$/, '');
      if (!t || t.length > 40) return;
      ut.push({ type: 'sida', icon: '→', title: t, meta: 'Hliðarstika', key: norm(t), opna: () => b.click() });
    });
    // 2) hamir Þjónustuborðsins (skugga-rót 368)
    try {
      const rot = window.Bord368 && window.Bord368.root && window.Bord368.root();
      if (rot) rot.querySelectorAll('[data-t5="mode"]').forEach(b => {
        const k = b.dataset.mode;
        const t = (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/\s*\d+$/, '');
        if (!k || !t) return;
        ut.push({
          type: 'sida', icon: '→', title: t, meta: 'Hamur á Þjónustuborðinu', key: norm(t + ' ' + k),
          opna: () => { if (!(window.Bord368 && window.Bord368.opnaHam && window.Bord368.opnaHam(k))) b.click(); }
        });
      });
    } catch (_) {}
    // 3) stakar síður
    STAKAR.forEach(s => ut.push({
      type: 'sida', icon: '→', title: s.l, meta: /^https?:/.test(s.u) ? 'Annar vefur' : 'Sér síða',
      key: norm(s.l + ' ' + s.o), opna: () => { location.href = s.u; }
    }));
    // sama heiti tvisvar (stikan + hamur) — fyrra eintakið stendur
    const sed = new Set();
    return ut.filter(r => { const k = r.type + '|' + r.key; if (sed.has(k)) return false; sed.add(k); return true; });
  }

  let SIDUR = [];
  let results = [];
  let selectedIdx = 0;
  let gildi = '';
  let keyrsla = 0;

  if (!document.getElementById('gs-style')) {
    const s = document.createElement('style');
    s.id = 'gs-style';
    s.textContent = `
      .gs-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:none;align-items:flex-start;justify-content:center;padding:80px 16px 16px}
      .gs-overlay.show{display:flex}
      .gs-modal{background:#fff;border-radius:12px;width:600px;max-width:100%;box-shadow:0 24px 64px rgba(0,0,0,.3);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 96px)}
      .gs-input{width:100%;padding:18px 20px;border:none;font-size:17px;outline:none;border-bottom:1px solid #e2e8f0;box-sizing:border-box;color:#0f172a;background:#fff}
      .gs-results{overflow:auto;flex:1 1 auto;-webkit-overflow-scrolling:touch}
      .gs-group{padding:8px 0;border-top:1px solid #f1f5f9}
      .gs-group:first-child{border-top:none}
      .gs-group-hd{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:6px 20px}
      .gs-item{padding:11px 20px;cursor:pointer;font-size:13.5px;color:#0f172a;line-height:1.35}
      .gs-item:hover,.gs-item.selected{background:#eff6ff;color:#1d4ed8}
      .gs-item .meta{font-size:11px;color:#94a3b8;margin-top:2px}
      .gs-empty{padding:40px 20px;text-align:center;color:#94a3b8;font-size:13px}
      .gs-hint{padding:8px 20px;font-size:11px;color:#94a3b8;background:#f8fafc;display:flex;justify-content:space-between;gap:10px;flex:0 0 auto}
      .gs-hint kbd{background:#e2e8f0;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:10px}
      @media (max-width:900px){
        .gs-overlay{padding-top:24px}
        .gs-hint{display:none}
        #gs-fab{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9998;width:52px;height:52px;border-radius:50%;
          border:1px solid rgba(0,0,0,.25);background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#fff;
          display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.35);cursor:pointer;padding:0}
        .gs-overlay.show ~ #gs-fab,body.gs-opin #gs-fab{display:none}
      }
      @media (min-width:901px){#gs-fab{display:none}}
    `;
    document.head.appendChild(s);
  }

  function ensureModal() {
    if (document.getElementById('gs-modal')) return;
    const m = document.createElement('div');
    m.id = 'gs-modal';
    m.className = 'gs-overlay';
    m.innerHTML = `<div class="gs-modal">
      <input class="gs-input" id="gs-input" placeholder="Leita eða fara á…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
      <div class="gs-results" id="gs-results"></div>
      <div class="gs-hint"><span><kbd>↑</kbd> <kbd>↓</kbd> Velja · <kbd>Enter</kbd> Opna · <kbd>Esc</kbd> Loka</span><span>Ctrl+K</span></div>
    </div>`;
    m.onclick = e => { if (e.target === m) close(); };
    document.body.appendChild(m);
    const inp = document.getElementById('gs-input');
    let to = null;
    inp.addEventListener('input', () => {
      gildi = inp.value;
      synaStrax();                                  // síðurnar svara á sama augnabliki
      clearTimeout(to);
      to = setTimeout(() => leitaGogn(gildi), 220); // gögnin koma á eftir
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, results.length - 1); renderResults(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); renderResults(); }
      else if (e.key === 'Enter') { e.preventDefault(); openResult(results[selectedIdx]); }
    });
  }

  function open() {
    ensureModal();
    SIDUR = sidur();
    gildi = '';
    document.getElementById('gs-modal').classList.add('show');
    document.body.classList.add('gs-opin');
    const inp = document.getElementById('gs-input');
    inp.value = '';
    synaStrax();
    setTimeout(() => inp.focus(), 50);
  }
  function close() {
    const m = document.getElementById('gs-modal');
    if (m) { m.classList.remove('show'); document.getElementById('gs-input').value = ''; }
    document.body.classList.remove('gs-opin');
    results = []; selectedIdx = 0; gildi = '';
  }

  // ── síðurnar: svara áður en nokkuð er sótt ────────────────────────────────
  function sidurFyrir(q, listi) {
    const L = listi || SIDUR;
    const n = norm(q);
    if (!n) return L.slice();
    const ord = n.split(' ').filter(Boolean);
    return L
      .map(r => {
        if (!ord.every(o => r.key.indexOf(o) > -1)) return null;
        // nákvæmt upphaf fremst, svo „sala" skili Sölu en ekki „Söluyfirliti" fyrst
        return { r, v: r.key === n ? 0 : r.key.indexOf(n) === 0 ? 1 : 2 };
      })
      .filter(Boolean)
      .sort((a, b) => a.v - b.v || a.r.title.length - b.r.title.length)
      .map(x => x.r);
  }

  function synaStrax() {
    results = sidurFyrir(gildi);
    selectedIdx = 0;
    renderResults(gildi.trim().length >= 2 ? 'Leita í gögnunum…' : '');
  }

  // ── gögnin ────────────────────────────────────────────────────────────────
  async function leitaGogn(q) {
    if (!q || q.trim().length < 2) return;
    const SB = getSB();
    if (!SB) { renderResults(''); return; }
    const minn = ++keyrsla;
    const safe = async p => { try { return await p; } catch (e) { return { data: [] }; } };
    const like = q.trim().replace(/[%,()]/g, ' ');
    const [co, mal, inv, doc, job, dev, qt] = await Promise.all([
      safe(SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').or(`nafn.ilike.%${like}%,kennitala.ilike.%${like}%,heimilisfang.ilike.%${like}%`).limit(6)),
      safe(SB.from('thjonustubeidni').select('id,title,customer_nafn,status,assigned_to').is('deleted_at', null).is('archived_at', null)
        .or(`title.ilike.%${like}%,summary.ilike.%${like}%,customer_nafn.ilike.%${like}%`).limit(6)),
      safe(SB.from('solur').select('id,num,customer_nafn,samtals').or(`num.ilike.%${like}%,customer_nafn.ilike.%${like}%`).limit(6)),
      safe(SB.from('customer_documents').select('id,file_name,customer_name,year,fyrirtaeki_id,storage_path').or(`file_name.ilike.%${like}%,customer_name.ilike.%${like}%`).limit(6)),
      safe(SB.from('verkbeidnir').select('id,num,customer,status').or(`num.ilike.%${like}%,customer.ilike.%${like}%`).limit(5)),
      safe(SB.from('uttaeki').select('id,serial,client,type').or(`serial.ilike.%${like}%,client.ilike.%${like}%`).limit(5)),
      safe(SB.from('tilbod').select('id,num,company_nafn,samtals').or(`num.ilike.%${like}%,company_nafn.ilike.%${like}%`).limit(4))
    ]);
    if (minn !== keyrsla) return;              // nýrri innsláttur kom á meðan
    const kr = n => (n == null ? '' : Math.round(n).toLocaleString('is-IS') + ' kr');
    const r = sidurFyrir(gildi);
    (co.data || []).forEach(x => r.push({ type: 'co', icon: '🏢', title: x.nafn, meta: x.kennitala || x.heimilisfang || '', opna: () => opnaFyrirtaeki(x.id) }));
    (mal.data || []).forEach(x => r.push({ type: 'mal', icon: '📋', title: x.title || '#' + x.id, meta: [x.customer_nafn, x.assigned_to, x.status].filter(Boolean).join(' · '), opna: () => opnaMal(x.id) }));
    (inv.data || []).forEach(x => r.push({ type: 'inv', icon: '📄', title: (x.num || '#' + x.id) + ' — ' + (x.customer_nafn || ''), meta: kr(x.samtals), opna: () => opnaSolu(x) }));
    (doc.data || []).forEach(x => r.push({ type: 'doc', icon: '📁', title: x.file_name || 'Skjal #' + x.id, meta: [x.customer_name, x.year].filter(Boolean).join(' · '), opna: () => opnaSkjal(x) }));
    (job.data || []).forEach(x => r.push({ type: 'job', icon: '🔧', title: (x.num || '#' + x.id) + ' — ' + (x.customer || ''), meta: x.status || '', opna: () => opnaVerkbeidni(x) }));
    (dev.data || []).forEach(x => r.push({ type: 'dev', icon: '🔥', title: (x.serial || '#' + x.id) + ' — ' + (x.type || ''), meta: x.client || '', opna: () => opnaTaeki(x) }));
    (qt.data || []).forEach(x => r.push({ type: 'qt', icon: '📝', title: (x.num || '#' + x.id) + ' — ' + (x.company_nafn || ''), meta: kr(x.samtals), opna: () => { sv('tilbod'); } }));
    results = r;
    if (selectedIdx >= results.length) selectedIdx = 0;
    renderResults('');
  }

  // ── opnunarleiðir (allar til fyrir) ───────────────────────────────────────
  const sv = v => { if (window.App && typeof App.switchView === 'function') App.switchView(v); };
  const hash = h => { try { location.hash = h; } catch (_) {} };

  function opnaFyrirtaeki(id) {
    if (typeof window._openCompanySafe === 'function') window._openCompanySafe(id);
    else hash('#company/' + id);
  }
  function opnaMal(id) {
    // Borðið verður að vera uppsett áður en málið er valið (368 opnaMal teiknar sjálft).
    const b = document.querySelector('.vnav-btn[data-view="verkbord"]');
    if (b) b.click(); else sv('bord');
    const reyna = (n) => {
      if (window.Bord368 && typeof Bord368.opnaMal === 'function') { Bord368.opnaMal(id); return; }
      if (n < 20) setTimeout(() => reyna(n + 1), 150);
    };
    reyna(0);
  }
  function opnaSolu(x) { if (x.num) hash('#sale/' + x.num); else sv('income'); }
  function opnaVerkbeidni(x) { if (x.num) hash('#verkbeidni/' + x.num); else sv('workshop'); }
  function opnaTaeki(x) { if (x.serial) hash('#unit/' + x.serial); else sv('field'); }
  function opnaSkjal(x) {
    if (x.fyrirtaeki_id) { opnaFyrirtaeki(x.fyrirtaeki_id); return; }
    sv('companies');
  }

  // ── teikning ──────────────────────────────────────────────────────────────
  const HOPAR = { sida: 'Síður og hamir', co: '🏢 Viðskiptavinir', mal: '📋 Mál á borðinu', inv: '📄 Reikningar', doc: '📁 Skjöl', job: '🔧 Verk', dev: '🔥 Þjónustutæki', qt: '📝 Tilboð' };

  function renderResults(fotur) {
    const root = document.getElementById('gs-results');
    if (!root) return;
    if (!results.length) {
      root.innerHTML = '<div class="gs-empty">' + (fotur ? esc(fotur) : 'Engar niðurstöður') + '</div>';
      return;
    }
    let html = '';
    let prev = null;
    results.forEach((r, i) => {
      if (r.type !== prev) {
        if (prev) html += '</div>';
        html += '<div class="gs-group"><div class="gs-group-hd">' + esc(HOPAR[r.type] || r.type) + '</div>';
        prev = r.type;
      }
      html += '<div class="gs-item' + (i === selectedIdx ? ' selected' : '') + '" data-idx="' + i + '">' +
        '<div>' + esc(r.icon) + ' ' + esc(r.title) + '</div>' +
        (r.meta ? '<div class="meta">' + esc(r.meta) + '</div>' : '') + '</div>';
    });
    if (prev) html += '</div>';
    if (fotur) html += '<div class="gs-empty">' + esc(fotur) + '</div>';
    root.innerHTML = html;
    root.querySelectorAll('.gs-item').forEach(el => { el.onclick = () => openResult(results[parseInt(el.dataset.idx, 10)]); });
    const s = root.querySelector('.gs-item.selected');
    if (s) s.scrollIntoView({ block: 'nearest' });
  }

  function openResult(r) {
    if (!r) return;
    close();
    try { r.opna(); } catch (e) { console.warn('[leit] opnun brást', e); }
  }

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
  });

  // ── hnappar: stikan (391 klæðir hann) og fastur hnappur á síma ────────────
  const LUPA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  function ensureBtn() {
    if (!document.getElementById('gs-trigger')) {
      const topbar = document.querySelector('.topbar') || document.querySelector('header');
      if (topbar) {
        const btn = document.createElement('button');
        btn.id = 'gs-trigger';
        btn.type = 'button';
        btn.title = 'Leita eða fara á… (Ctrl+K)';
        btn.style.cssText = 'background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:6px 12px;color:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;margin:0 6px';
        btn.innerHTML = LUPA + '<span>Leita eða fara á…</span>';
        btn.onclick = open;
        topbar.appendChild(btn);
      }
    }
    if (!document.getElementById('gs-fab') && document.body) {
      const fab = document.createElement('button');
      fab.id = 'gs-fab';
      fab.type = 'button';
      fab.setAttribute('aria-label', 'Leita eða fara á…');
      fab.innerHTML = LUPA;
      fab.onclick = open;
      document.body.appendChild(fab);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(ensureBtn, 1200));
  else setTimeout(ensureBtn, 1200);
  setTimeout(ensureBtn, 3000);

  // sidurFyrir og _opna eru flutt út svo prófið (test/leit-opnar.test.cjs) mæli ÞESSAR
  // föllin sjálf — ekki eftirlíkingu af þeim. Opnunarleiðirnar eru kjarni v2.
  window.GlobalSearch = {
    open, close, leita: leitaGogn, sidur, sidurFyrir, _norm: norm,
    _opna: { fyrirtaeki: opnaFyrirtaeki, mal: opnaMal, sala: opnaSolu, verkbeidni: opnaVerkbeidni, taeki: opnaTaeki, skjal: opnaSkjal }
  };
  console.log('[global-search] v2 installed');
})();
