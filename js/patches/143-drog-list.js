/* === DRÖG LIST v1 ===
   Surfaces all open draft sales (status='drog') so the user can see them at
   a glance and click into the Sale Editor to continue them. Drafts are
   sales that have been started (drop-off, partial pickup, etc.) but not
   yet finalized — invisible in Bókhald but very much "in progress".

   Adds:
     1. A sidebar entry "📝 Drög (N)" below Sala, with live count
     2. A modal listing all draft sales when clicked, with customer / num /
        total / created date / "✏️ Breyta" + "✅ Klára" actions per row
     3. Auto-refreshes on the `sale-edited` event the editor dispatches

   Depends on patch 142 (sale-editor).  */
(() => {
  if (window.__drogListInstalled) return;
  window.__drogListInstalled = true;

  // 2026-08-07 (ósk Agnars „I don't like this popup pages, just a normal page"):
  // Drög var áður fljótandi modal (position:fixed;inset:0). Núna er þetta VENJULEG
  // view eins og önnur borð — hliðarstiku-hnappurinn (data-view) skiptir yfir í
  // heil-síðu í #view-svæðinu, með hash-slóð (#drog), URL-routing (218) og
  // bakk-takka (276/277). Fyrirmyndin er patch 231/268.
  const VIEW_ID = 'view-drog';
  const NAV_KEY = 'drog';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  function daysSince(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  // 2026-06-24: show WHERE each draft's work currently sits. Verkbeiðnir nums are
  // "<saleNum>-V<n>"; their status maps to a column:
  //   received/inprogress → Verkstæði · ready → Afgreiðsla ·
  //   collected → already picked up (just finalize) · none → bara drög.
  const LOC = {
    verkstaedi: { label:'Verkstæði',   emoji:'🔧', color:'#92400e', bg:'#fef3c7', bd:'#fde68a' },
    afgreidsla: { label:'Afgreiðsla',  emoji:'📦', color:'#166534', bg:'#dcfce7', bd:'#bbf7d0' },
    sott:       { label:'Sótt · klára', emoji:'✅', color:'#1e40af', bg:'#dbeafe', bd:'#bfdbfe' },
    drog:       { label:'Bara drög',   emoji:'📝', color:'#475569', bg:'#f1f5f9', bd:'#e2e8f0' },
    // 2026-08-19 (ósk Agnars): drög sem eiga afturkallaða/eydda verkbeiðni fá
    // eigin merki svo þau líti ekki eins út og glæný drög á listanum.
    afturkallad:{ label:'Verkbeiðni afturkölluð', emoji:'🚫', color:'#9f1239', bg:'#ffe4e6', bd:'#fecdd3' },
    verkeytt:   { label:'Verkbeiðni eytt',        emoji:'❌', color:'#7f1d1d', bg:'#fee2e2', bd:'#fecaca' },
  };
  function locFor(statuses) {
    if (!statuses || !statuses.size) return LOC.drog;
    if (statuses.has('received') || statuses.has('inprogress') || statuses.has('in_progress')) return LOC.verkstaedi;
    if (statuses.has('ready')) return LOC.afgreidsla;
    if (statuses.has('collected')) return LOC.sott;
    // Dautt verk kemur Á EFTIR lifandi stöðunum að ofan: drag með einhverja
    // lifandi verkbeiðni heldur sinni stöðu, en þegar ALLAR verkbeiðnir eru
    // afturkallaðar/eyddar birtist rauða merkið (og drög sem aldrei fengu
    // verkbeiðni falla áfram á „Bara drög").
    if (statuses.has('cancelled')) return LOC.afturkallad;
    if (statuses.has('eytt'))      return LOC.verkeytt;
    return LOC.drog;
  }
  // 05.10.2026 (Brunastál C, Agnar: „mátt byggja … ekkert breytist nema útlitið"): staðsetningin er silfurplata
  // með stroke-tákni í stað litaðrar pillu með emoji. Sama LOC-hlutur, sama label (leitin les label — matchesQ).
  function _ik(d, w, sw) {
    return '<svg width="' + (w || 14) + '" height="' + (w || 14) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  const LOC_IK = {
    verkstaedi: _ik('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
    afgreidsla: _ik('<path d="M3 9h18"/><path d="M5 9v11h14V9"/><path d="M4 9l2-5h12l2 5"/><path d="M10 20v-6h4v6"/>'),
    sott:       _ik('<path d="m5 12 5 5 9-10"/>', 14, 3),
    drog:       _ik('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    afturkallad:_ik('<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'),
    verkeytt:   _ik('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>', 14, 2.4)
  };
  const LOC_LIT = { sott: 'graent', afturkallad: 'rautt', verkeytt: 'rautt' };
  function locKey(loc) { return Object.keys(LOC).find(k => LOC[k] === loc) || 'drog'; }
  function locBadge(loc) {
    loc = loc || LOC.drog;
    const k = locKey(loc);
    return '<span class="dr2-stad' + (LOC_LIT[k] ? ' ' + LOC_LIT[k] : '') + '">' + LOC_IK[k] + esc(loc.label) + '</span>';
  }
  async function attachLocations(SB) {
    try {
      const data = await DB.fetchAll((from, to) => SB.from('verkbeidnir').select('num,status').order('id').range(from, to));
      const map = {};
      (data || []).forEach(v => {
        const parent = String(v.num || '').replace(/-V\d+$/, '');
        if (!parent) return;
        (map[parent] = map[parent] || new Set()).add(v.status);
      });
      _items.forEach(s => { s._loc = locFor(map[s.num]); });
    } catch (e) { console.warn('[drog-list] locations:', e); _items.forEach(s => { s._loc = LOC.drog; }); }
  }

  let _count = 0;
  let _items = [];
  // 2026-05-21: persisted sort mode.
  const DROG_SORT_KEY = '_drog_sort_v1';
  function loadSort() {
    try { return localStorage.getItem(DROG_SORT_KEY) || 'updated_desc'; } catch (_) { return 'updated_desc'; }
  }
  function saveSort(v) { try { localStorage.setItem(DROG_SORT_KEY, v); } catch (_) {} }
  let _sortMode = loadSort();
  let _showDeleted = false;   // 2026-06-24: reveal soft-deleted (hidden) drög

  async function loadDrog() {
    const SB = getSB();
    if (!SB) return;
    try {
      // audit-pagination:ok — drög, .limit(100) í næsta skrefi
      let q = SB.from('solur')
        .select('id,num,customer_nafn,samtals,greitt_med,created_at,updated_at,athugasemdir,hidden,customer_id,customer_base_id,customer_kt')
        .eq('status', 'drog');
      if (!_showDeleted) q = q.neq('hidden', true);   // soft-deleted drög hidden by default
      const { data, error } = await q.order('updated_at', { ascending: false }).limit(100);
      if (error) { console.warn('[drog-list] load error:', error); return; }
      _items = data || [];
      _count = _items.filter(s => !s.hidden).length;   // badge = active (non-deleted) drög
      await attachLocations(SB);
      updateBadge();
      // Lifandi endurnýjun (30s/sale-edited) uppfærir listann þegar viewið er opið.
      const vv = document.getElementById(VIEW_ID);
      if (vv && vv.classList.contains('active') && document.getElementById('_drog-body')) renderList();
    } catch (e) {
      console.warn('[drog-list] load exception:', e);
    }
  }

  // ── Sidebar entry ─────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('._drog-nav-btn')) { updateBadge(); return; }
    // Place right after the Sala nav button
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const salaBtn = allBtns.find(b => /\bsala\b/i.test(b.textContent || ''));
    if (!salaBtn) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = salaBtn.className.replace(/\bactive\b/g, '').trim() + ' _drog-nav-btn';
    btn.setAttribute('data-drog-nav', '1');
    btn.setAttribute('data-view', NAV_KEY);   // venjuleg view — App.switchView þekkir hana
    btn.innerHTML = '<span style="margin-right:6px">📝</span>Drög <span class="_drog-badge" style="display:none;margin-left:6px;background:#f59e0b;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px">0</span>';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    salaBtn.parentNode.insertBefore(btn, salaBtn.nextSibling);
    updateBadge();
  }

  function updateBadge() {
    const badge = document.querySelector('._drog-badge');
    if (!badge) return;
    badge.textContent = String(_count);
    badge.style.display = _count > 0 ? 'inline-block' : 'none';
  }

  // ── Brunastál C stílblaðið (05.10.2026) ─────────────────────────────────────
  // Takkar/reitir bera falska id-keðju + !important gegn appham-uppblæstri (261 / simi-compact).
  function injectCss() {
    if (document.getElementById('dr2-css')) return;
    if (!document.getElementById('dr2-font')) {
      const l = document.createElement('link');
      l.id = 'dr2-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      (document.head || document.documentElement).appendChild(l);
    }
    const V = '#view-drog ';
    const K = ':not(#_d143a):not(#_d143b):not(#_d143c):not(#_d143d)';
    const SANS = '"IBM Plex Sans",system-ui,sans-serif', MONO = '"JetBrains Mono",ui-monospace,monospace', DISP = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const STAL = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    const MALM = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
    const SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
    const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
    const TAKKI = 'margin:0!important;min-height:0!important;min-width:0!important;box-sizing:border-box!important;cursor:pointer;';
    const st = document.createElement('style');
    st.id = 'dr2-css';
    st.textContent = [
      V + '.dr2{padding:10px 16px 40px;font-family:' + SANS + ';color:#141822;container-type:inline-size;container-name:dr2}',
      V + '.dr2 *{box-sizing:border-box}',
      V + '.dr2 svg{flex:none}',
      V + '.dr2 button:focus-visible,' + V + '.dr2 input:focus-visible,' + V + '.dr2 select:focus-visible{outline:2px solid #c92a2a!important;outline-offset:2px}',
      V + '.dr2-skel{border-radius:14px;border:1px solid rgba(0,0,0,.55);background:#fff;overflow:hidden;box-shadow:0 18px 40px -16px rgba(0,0,0,.6)}',
      V + '.dr2-haus{position:relative;display:flex;flex-wrap:wrap;align-items:flex-end;gap:14px 22px;padding:20px 24px 20px 32px;background:' + METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
      V + '.dr2-hnod{position:absolute;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      V + '.dr2-hnod.a{top:9px;left:9px}' + V + '.dr2-hnod.b{top:9px;right:9px}' + V + '.dr2-hnod.c{bottom:9px;left:9px}' + V + '.dr2-hnod.d{bottom:9px;right:9px}',
      V + '.dr2-titill{flex:1 1 360px;min-width:0;display:flex;flex-direction:column;gap:8px}',
      V + '.dr2-tl{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 18px}',
      V + '.dr2-tl h2' + K + '{margin:0!important;font:800 32px/1.1 ' + DISP + '!important;letter-spacing:-.01em!important;color:#f4f6f8!important;text-shadow:none!important}',
      V + '.dr2-fj{display:inline-flex;align-items:baseline;gap:9px}',
      V + '.dr2-fj b' + K + '{font:800 38px/1 ' + DISP + '!important;font-variant-numeric:lining-nums;color:#f4f6f8!important}',
      V + '.dr2-fj span' + K + '{font:700 16px ' + DISP + '!important;color:#d9dee6!important}',
      V + '.dr2-undir' + K + '{margin:0!important;font:400 13px/1.45 ' + SANS + '!important;color:#c3cad5!important}',
      V + '.dr2-tol{display:flex;flex-wrap:wrap;align-items:center;gap:10px}',
      V + '.dr2-reitur{display:flex;align-items:center;gap:8px;height:40px;margin:0;padding:0 12px;border-radius:9px;border:1px solid #000;background:#eef1f6;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);color:#5b6472;min-width:220px;flex:1 1 260px;cursor:text}',
      V + '.dr2-reitur input' + K + '{flex:1 1 auto!important;min-width:0!important;width:100%!important;max-width:none!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;outline:none!important;font:13.5px/1.2 ' + SANS + '!important;color:#141822!important}',
      V + '.dr2-reitur input::placeholder{color:#6b7483!important;opacity:1}',
      V + '.dr2-val{position:relative;display:inline-flex;align-items:center;color:#3a4250}',
      V + '.dr2-val svg{position:absolute;pointer-events:none;z-index:1}' + V + '.dr2-val svg:first-child{left:12px}' + V + '.dr2-val svg:last-child{right:12px}',
      V + '.dr2-val select' + K + '{' + TAKKI + 'height:40px!important;width:auto!important;padding:0 34px!important;border-radius:9px!important;border:1px solid rgba(20,24,34,.25)!important;background:' + SILVER + '!important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.3)!important;font:600 13.5px/1 ' + SANS + '!important;color:#11141c!important;-webkit-appearance:none!important;appearance:none!important}',
      V + '.dr2-rofi{display:inline-flex;align-items:center;gap:10px;height:40px;margin:0;padding:0 12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#d5dbe6;font:600 13px ' + SANS + ';cursor:pointer;white-space:nowrap}',
      V + '.dr2-rofi input' + K + '{-webkit-appearance:none!important;appearance:none!important;position:relative;flex:none;width:36px!important;height:20px!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:99px!important;background:#0b0c0f!important;box-shadow:inset 0 2px 4px rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.08)!important;cursor:pointer}',
      V + '.dr2-rofi input::before{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:linear-gradient(180deg,#fdfdfe 0%,#c9ced8 100%);box-shadow:0 1px 2px rgba(0,0,0,.6);transition:transform .12s ease-out}',
      V + '.dr2-rofi input:checked' + K + '{background:#16783f!important}',
      V + '.dr2-rofi input:checked::before{transform:translateX(16px)}',
      // síuræman
      V + '.dr2-sia{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 20px;background:#f4f6f9;border-bottom:1px solid #dfe3ea}',
      V + '.dr2-sia:empty{display:none}',
      V + '.dr2-sia-m{margin-right:4px;font:700 10.5px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250}',
      V + '.dr2-sia button' + K + '{' + TAKKI + 'height:38px!important;width:auto!important;display:inline-flex!important;align-items:center;gap:7px;padding:0 12px!important;border-radius:9px!important;border:1px solid rgba(20,24,34,.18)!important;background:' + SILVER + '!important;color:#1f2530!important;font:600 13px/1 ' + SANS + '!important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.14)!important;white-space:nowrap}',
      V + '.dr2-sia button.is-on' + K + '{background:' + MALM + '!important;border-color:#000!important;color:#eef1f4!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.35)!important}',
      V + '.dr2-sia button b' + K + '{padding:1px 7px!important;border-radius:99px!important;background:rgba(20,24,34,.1)!important;color:#2b313c!important;font:700 11px/1.3 ' + MONO + '!important}',
      V + '.dr2-sia button.is-on b' + K + '{background:rgba(255,255,255,.14)!important;color:#eef1f4!important}',
      // stálplatan + biðtímakaflar
      V + '.dr2-plata{display:flex;flex-direction:column;gap:8px;padding:10px 20px 26px;min-height:160px;background-color:#e2e6ec;background-image:' + STAL + '}',
      V + '.dr2-kafli{display:flex;align-items:center;gap:10px;margin:12px 2px 2px;font:700 10.5px/1.2 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase}',
      V + '.dr2-kafli i{width:8px;height:8px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.2)}',
      V + '.dr2-kafli b{padding:1px 7px;border-radius:99px;background:rgba(20,24,34,.09);font:700 10.5px/1.3 ' + MONO + ';letter-spacing:0;color:#2b313c}',
      V + '.dr2-kafli em{flex:1;height:1px;background:rgba(20,24,34,.14)}',
      V + '.b-dag{color:#0b6b3a}' + V + '.b-dag i{background:#16783f}',
      V + '.b-vika{color:#3a4250}' + V + '.b-vika i{background:#8a93a3}',
      V + '.b-tvaer{color:#845400}' + V + '.b-tvaer i{background:#e0a93e}',
      V + '.b-lengi{color:#b42318}' + V + '.b-lengi i{background:#c92a2a}',
      // miðinn
      V + '.dr2-t{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;border-radius:12px;background:#fff;filter:drop-shadow(0 1px 1px rgba(10,14,22,.18)) drop-shadow(0 4px 10px rgba(10,14,22,.1))}',
      V + '.dr2-t.eytt{opacity:.6}',
      V + '.dr2-t.is-open{z-index:3}',
      V + '.dr2-opna' + K + '{' + TAKKI + 'position:relative;display:grid!important;grid-template-columns:136px minmax(0,1fr) 150px;align-items:stretch;width:100%!important;height:auto!important;min-height:76px!important;padding:0!important;border:0!important;border-radius:12px 0 0 12px!important;background:transparent!important;box-shadow:none!important;overflow:hidden;text-align:left;font:inherit!important;color:inherit!important}',
      V + '.dr2-opna:focus-visible' + K + '{outline:none!important;box-shadow:inset 0 0 0 2px #c92a2a!important}',
      V + '.dr2-opna:hover .dr2-nafn{text-decoration:underline;text-decoration-color:#c3cad5;text-underline-offset:3px}',
      V + '.dr2-stub{display:flex;flex-direction:column;justify-content:center;gap:7px;padding:12px 0 12px 16px;background:#f4f6f9;border-right:1.5px dashed #c3cad5}',
      V + '.dr2-hak{position:absolute;left:129px;width:14px;height:14px;border-radius:50%;background:#e2e6ec}' + V + '.dr2-hak.t{top:-7px}' + V + '.dr2-hak.b{bottom:-7px}',
      V + '.dr2-num{font:700 14px/1.2 ' + MONO + ';letter-spacing:-.02em;color:#11141c;white-space:nowrap}',
      V + '.dr2-num i{font-style:normal;color:#a1a9b6}',
      V + '.dr2-aldur{display:inline-flex;align-items:center;gap:6px;font:700 11px/1.2 ' + MONO + ';white-space:nowrap}',
      V + '.dr2-aldur i{width:7px;height:7px;border-radius:50%}',
      V + '.dr2-aldur.b-vika{color:#4a5363}',
      V + '.dr2-buk{display:flex;flex-direction:column;justify-content:center;gap:8px;min-width:0;padding:12px 8px 12px 20px}',
      V + '.dr2-l1{display:flex;align-items:center;gap:9px;min-width:0}',
      V + '.dr2-nafn{min-width:0;font-size:15px;font-weight:600;line-height:1.25;color:#11141c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      V + '.dr2-vant{flex:none;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:5px;border:1px solid rgba(180,35,24,.28);background:#fdf1ef;font-size:11.5px;font-weight:600;color:#b42318;white-space:nowrap}',
      V + '.dr2-eyttm{flex:none;font:700 10px/1 ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#b42318}',
      V + '.dr2-l2{display:flex;flex-wrap:wrap;align-items:center;gap:6px 9px;font-size:12.5px;color:#5b6472}',
      V + '.dr2-stad{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:5px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);font-size:12px;font-weight:600;color:#2b313c;white-space:nowrap}',
      V + '.dr2-stad.rautt{color:#b42318}' + V + '.dr2-stad.graent{color:#0b6b3a}',
      V + '.dr2-pk{color:#a1a9b6}',
      V + '.dr2-dag{font:400 12px ' + MONO + ';color:#3a4250}',
      V + '.dr2-upph{display:flex;align-items:center;justify-content:flex-end;padding:0 18px 0 8px;font:700 16px/1.2 ' + MONO + ';letter-spacing:-.01em;color:#11141c;white-space:nowrap}',
      V + '.dr2-upph small{margin-left:5px;font-size:12px;font-weight:500;color:#5b6472}',
      V + '.dr2-adg{position:relative;display:flex;align-items:center;gap:8px;padding:0 14px 0 4px}',
      V + '.dr2-klara' + K + '{' + TAKKI + 'flex:none;height:44px!important;width:auto!important;display:inline-flex!important;align-items:center;justify-content:center;gap:7px;padding:0 16px 0 14px!important;border-radius:10px!important;border:1px solid rgba(52,168,98,.55)!important;background:' + SAEKJA + '!important;color:#fff!important;font:700 14px/1 ' + SANS + '!important;letter-spacing:.01em;text-shadow:0 1px 1px rgba(0,0,0,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3)!important;white-space:nowrap}',
      V + '.dr2-ib' + K + ',' + V + '.dr2-silfur' + K + '{' + TAKKI + 'flex:none;height:44px!important;display:inline-flex!important;align-items:center;justify-content:center;gap:7px;border-radius:10px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;color:#3a4250!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;font:600 13.5px/1 ' + SANS + '!important;white-space:nowrap}',
      V + '.dr2-ib' + K + '{width:44px!important;padding:0!important}',
      V + '.dr2-silfur' + K + '{width:auto!important;padding:0 14px!important;color:#1f2530!important}',
      V + '.dr2-ib[aria-expanded="true"]' + K + '{background:' + MALM + '!important;border-color:#000!important;color:#fff!important}',
      V + '.dr2-klara:hover,' + V + '.dr2-ib:hover,' + V + '.dr2-silfur:hover,' + V + '.dr2-sia button:hover{filter:brightness(1.08)}',
      V + '.dr2-tomt{margin-top:12px;padding:36px 20px;border-radius:12px;background:rgba(255,255,255,.6);text-align:center;font-size:13.5px;color:#3a4250}',
      // þröngt (S26 skjáborðshamur ~980 px — því container query, ekki @media)
      '@container dr2 (max-width:760px){' +
        V + '.dr2-t{grid-template-columns:minmax(0,1fr)}' +
        V + '.dr2-opna' + K + '{grid-template-columns:104px minmax(0,1fr)!important;border-radius:12px 12px 0 0!important}' +
        V + '.dr2-stub{grid-row:span 2}' +
        V + '.dr2-upph{justify-content:flex-start;padding:0 0 12px 20px}' +
        V + '.dr2-hak{display:none}' +
        V + '.dr2-adg{justify-content:flex-end;padding:10px 12px 12px;border-top:1px solid #edf0f4}' +
        V + '.dr2-haus{padding:16px 16px 16px 20px}' +
        V + '.dr2-reitur{flex:1 1 100%}}',
      // ⋯-valmyndin — í <body>
      '.dr2-pop{position:fixed;z-index:7900;width:240px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;padding:6px;background:#fff;border:1px solid rgba(20,24,34,.12);border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);font-family:' + SANS + ';color:#1f2530;text-align:left}',
      'body.appmode .dr2-pop,html[data-viewmode="mobile"] .dr2-pop{zoom:var(--app-krom-zoom,1)}',
      '.dr2-pop-h{display:flex;align-items:center;gap:8px;padding:6px 8px 8px;font:700 10.5px/1 ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#3a4250}',
      '.dr2-pop-h span{margin-left:auto;letter-spacing:0;text-transform:none;font-weight:500;color:#6b7483}',
      '.dr2-pop button.dr2-mi' + K + '{' + TAKKI + 'width:100%!important;height:40px!important;display:flex!important;align-items:center;gap:10px;padding:0 10px!important;border:0!important;border-radius:8px!important;background:transparent!important;box-shadow:none!important;color:#1f2530!important;font:500 13.5px/1 ' + SANS + '!important;text-align:left;white-space:nowrap}',
      '.dr2-pop button.dr2-mi:hover' + K + ',.dr2-pop button.dr2-mi:focus-visible' + K + '{background:#f1f4f8!important;outline:none}',
      '.dr2-pop .dr2-mi svg{color:#5b6472}',
      '.dr2-pop button.dr2-mi.haetta' + K + '{color:#b42318!important;font-weight:600!important}',
      '.dr2-pop .dr2-mi.haetta svg{color:#b42318}',
      '.dr2-pop-sk{height:1px;margin:4px 6px;background:#eceff3}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
  }

  // ── View (venjuleg heil-síða, ekki modal) ─────────────────────────────────
  // Búið til dýnamískt eins og verkborð (231) / aksturslisti (268): eigin
  // #view-drog í view-svæðinu, hausinn (titill + „Sýna eydd" + röðun) færður úr
  // gamla modal-hausnum, ENGIN ✕ (bakk-takkinn/hliðarstikan sér um að fara burt).
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = 'view';
    injectCss();
    // 05.10.2026 (Brunastál C): málmhaus með hnoðum, Playfair-talning, síuræma eftir staðsetningu og miðar á
    // stálplötu. Auðkennin #_drog-q, #_drog-sort, #_drog-showdel og #_drog-body eru ÞAU SÖMU — 371 (opna sölu)
    // skrifar í #_drog-q og hlustararnir hér að neðan eru óbreyttir.
    v.innerHTML =
      '<div class="dr2">' +
        '<section class="dr2-skel" aria-label="Drög">' +
          '<header class="dr2-haus">' +
            '<span class="dr2-hnod a" aria-hidden="true"></span><span class="dr2-hnod b" aria-hidden="true"></span><span class="dr2-hnod c" aria-hidden="true"></span><span class="dr2-hnod d" aria-hidden="true"></span>' +
            '<div class="dr2-titill">' +
              '<div class="dr2-tl"><h2>Drög</h2><span class="dr2-fj"><b id="_drog-fj">' + (_count || 0) + '</b><span>drög bíða klárunar</span></span></div>' +
              '<p class="dr2-undir">Sölur sem hafa ekki verið kláraðar — birtast ekki í Bókhaldi fyrr en kláruð er</p>' +
            '</div>' +
            '<div class="dr2-tol">' +
              '<label class="dr2-reitur">' + _ik('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 16) +
                '<input id="_drog-q" type="search" autocomplete="off" placeholder="Leita \u2014 n\u00famer, vi\u00f0skiptavinur\u2026" aria-label="Leita \u00ed dr\u00f6gum"></label>' +
              '<span class="dr2-val">' + _ik('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 15) +
                '<select id="_drog-sort" title="Raða" aria-label="Röðun">' +
                  '<option value="updated_desc">Nýlega breytt fyrst</option>' +
                  '<option value="created_desc">Nýjast stofnað</option>' +
                  '<option value="created_asc">Elst stofnað</option>' +
                  '<option value="amount_desc">Hæsta upphæð</option>' +
                  '<option value="amount_asc">Lægsta upphæð</option>' +
                '</select>' + _ik('<path d="m6 9 6 6 6-6"/>', 14, 2.5) + '</span>' +
              '<label class="dr2-rofi"><input type="checkbox" id="_drog-showdel"> Sýna eydd</label>' +
            '</div>' +
          '</header>' +
          '<div class="dr2-sia" id="_drog-sia" role="group" aria-label="Sía eftir staðsetningu"></div>' +
          '<div id="_drog-body" class="dr2-plata"></div>' +
        '</section>' +
      '</div>';
    (sample && sample.parentElement ? sample.parentElement : document.body).appendChild(v);
    // Haus-stýringar vírðar einu sinni (viewið lifir áfram á milli heimsókna).
    const sortSel = v.querySelector('#_drog-sort');
    if (sortSel) {
      sortSel.value = _sortMode;
      sortSel.addEventListener('change', e => { _sortMode = e.target.value; saveSort(_sortMode); renderList(); });
    }
    const qBox = v.querySelector('#_drog-q');
    if (qBox) {
      var _qT = null;
      qBox.addEventListener('input', function () {
        clearTimeout(_qT);
        _qT = setTimeout(function () {
          _q = String(qBox.value || '').trim().toLowerCase();
          renderList();
        }, 140);
      });
      // Esc hreinsar — sama venja og annars staðar í appinu.
      qBox.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { qBox.value = ''; _q = ''; renderList(); }
      });
    }
    const showDel = v.querySelector('#_drog-showdel');
    if (showDel) {
      showDel.checked = _showDeleted;
      showDel.addEventListener('change', async e => { _showDeleted = e.target.checked; await loadDrog(); renderList(); });
    }
    return v;
  }

  // Sýna viewið: fela önnur, virkja þetta, spegla #drog í slóðina (277 gerir
  // það svo að alvöru bakk-færslu), sækja fersk gögn.
  function show() {
    ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    renderList();
    loadDrog().then(renderList).catch(() => {});
  }

  // Vefja App.switchView: okkar view → show(); annað → fela okkar view (fellur á
  // .active-regluna hvort eð er, en 268-mynstrið gerir þetta skýrt).
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._drogSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      try { const el = document.getElementById(VIEW_ID); if (el) { el.style.display = 'none'; el.classList.remove('active'); } } catch (_) {}
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._drogSwitchPatched = true;
  }

  // 2026-08-29 (Agnar): sía listann á leitarstreng. Tóm leit = allt eins og áður.
  var _q = '';
  function matchesQ(d) {
    if (!_q) return true;
    // 2026-09-10: _loc er LOC-hlutur ({label,emoji,…}), ekki strengur. String(hlutur)
    // gaf "[object Object]" — svo staðsetningarleitin sem commit 3b19e28 lofaði virkaði
    // aldrei, og leitarstrengurinn „object“ skilaði ÖLLUM röðum. Leitum í merkinu sjálfu.
    return [d.num, d.customer_nafn, d.greitt_med, d._loc && d._loc.label,
            (d.customer_id == null && d.customer_base_id == null && /reikning|sidar|síðar/i.test(String(d.greitt_med || ''))) ? 'enginn kúnni vantar kennitölu' : '']
      .map(function (x) { return String(x == null ? '' : x).toLowerCase(); })
      .join(' ').indexOf(_q) > -1;
  }
  // ── Aðgerðirnar — ÓBREYTTAR, aðeins færðar í nefnd föll svo miðinn, Klára og ⋯-valmyndin kalli á sama kóðann.
  function opna(id) { if (window.SaleEditor) window.SaleEditor.openById(id); }
  async function eyda(id) {
    const drogMsg = 'Eyða þessum drögum?\n\nÞau hverfa af listanum en hægt er að endurheimta (haka í „Sýna eydd").';
    const drogOk = (window.Confirm && Confirm.show) ? await Confirm.show(drogMsg) : window.confirm(drogMsg);
    if (!drogOk) return;
    const SB = getSB(); if (!SB) return;
    try { await SB.from('solur').update({ hidden: true, hidden_at: new Date().toISOString() }).eq('id', id); }
    catch (e) { alert('Tókst ekki að eyða: ' + (e.message || e)); return; }
    if (window.Toast && Toast.show) Toast.show('Drögum eytt');
    await loadDrog(); renderList();
  }
  async function endurheimta(id) {
    const SB = getSB(); if (!SB) return;
    try { await SB.from('solur').update({ hidden: false, hidden_at: null }).eq('id', id); }
    catch (e) { alert('Tókst ekki að endurheimta: ' + (e.message || e)); return; }
    if (window.Toast && Toast.show) Toast.show('Drög endurheimt');
    await loadDrog(); renderList();
  }

  // ── Biðtími í fjórum flokkum (Miðakerfið): Í dag · 1–7 · 8–14 · 15+ dagar ─────
  const ALDUR = [
    { k: 'dag',   heiti: 'Í dag',      max: 0 },
    { k: 'vika',  heiti: '1–7 dagar',  max: 7 },
    { k: 'tvaer', heiti: '8–14 dagar', max: 14 },
    { k: 'lengi', heiti: '15+ dagar',  max: Infinity }
  ];
  function aldurFl(d) { return ALDUR.find(a => d <= a.max) || ALDUR[ALDUR.length - 1]; }
  function dagarTxt(d) { return d <= 0 ? 'Í dag' : d + ((d % 10 === 1 && d % 100 !== 11) ? ' dagur' : ' dagar'); }
  function greidslaTxt(m) {
    const t = { reikningur: 'Reikningur', greitt_sidar: 'Greitt síðar', kort: 'Kort', pening: 'Reiðufé', reidufe: 'Reiðufé', peningar: 'Reiðufé' }[String(m || '')];
    return esc(t || m || '—');
  }
  function numHtml(num) {
    const m = String(num || '').match(/^(R-0*)(\d.*)$/);
    return '<span class="dr2-num">' + (m ? '<i>' + esc(m[1]) + '</i>' + esc(m[2]) : esc(num || '—')) + '</span>';
  }

  // Síuræman: staðsetning með raunverulegum fjölda (aðeins flokkar sem eiga drög). Valið lifir í minni, ekki í DOM.
  let _locSia = 'allt';
  function teiknaSiu() {
    const el = document.getElementById('_drog-sia'); if (!el) return;
    if (!_items.length) { el.innerHTML = ''; return; }
    const n = {};
    _items.forEach(s => { const k = locKey(s._loc); n[k] = (n[k] || 0) + 1; });
    if (_locSia !== 'allt' && !n[_locSia]) _locSia = 'allt';
    const takki = (k, label, fj, ik) => '<button type="button" data-loc="' + k + '" class="' + (_locSia === k ? 'is-on' : '') + '" aria-pressed="' + (_locSia === k) + '">' + (ik || '') + esc(label) + '<b>' + fj + '</b></button>';
    el.innerHTML = '<span class="dr2-sia-m">Staðsetning</span>' + takki('allt', 'Allt', _items.length) +
      ['drog', 'verkstaedi', 'afgreidsla', 'sott', 'afturkallad', 'verkeytt'].filter(k => n[k]).map(k => takki(k, LOC[k].label, n[k], LOC_IK[k])).join('');
    el.querySelectorAll('button[data-loc]').forEach(b => b.addEventListener('click', () => { _locSia = b.dataset.loc; renderList(); }));
  }

  // Einn miði: rifflipi (R-númer + biðtími) · götun · meginmál · upphæð · Klára + ⋯. Allur miðinn opnar drögin.
  function midi(s) {
    const age = daysSince(s.created_at);
    const fl = aldurFl(age);
    // 23.09.2026 — KRAFA ÁN VIÐTAKANDA SÝNIR SIG HÉR.
    // Kassinn varar við þessu þegar salan er vistuð (js/pos.js:1434, 19.09.2026), en það er Toast sem hverfur:
    // ÞRJÁR slíkar sölur bættust við eftir að viðvörunin kom. Mælt 23.09.2026: 5 af 40 drögum áttu engan kúnna.
    // Þetta stöðvar ekkert og felur ekkert; það gerir muninn sýnilegan þar sem drögin eru afgreidd.
    const rukkaSidar = /reikning|sidar|síðar/i.test(String(s.greitt_med || ''));
    const enginnKunni = s.customer_id == null && s.customer_base_id == null;
    const vantarKunna = rukkaSidar && enginnKunni && !s.hidden;
    const kunnaMerki = vantarKunna
      ? '<span class="dr2-vant" title="Engin kennitala og enginn viðskiptavinur á sölunni — krafan verður ekki send. Opnaðu söluna og tengdu kaupandann.">' +
        _ik('<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17v.5"/>', 12, 2.4) + 'Enginn viðskiptavinur</span>'
      : '';
    const adg = s.hidden
      ? '<button data-act="restore" type="button" class="dr2-silfur">' + _ik('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', 16) + 'Endurheimta</button>'
      : '<button data-act="finalize" type="button" class="dr2-klara" aria-label="Klára ' + esc(s.num || '') + '">' + _ik('<path d="m5 12 5 5 9-10"/>', 16, 3) + 'Klára</button>' +
        '<button type="button" class="dr2-ib dr2-meira" title="Fleiri aðgerðir" aria-haspopup="menu" aria-expanded="false" aria-label="Aðgerðir fyrir ' + esc(s.num || '') + '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg></button>';
    return '<div class="dr2-t' + (s.hidden ? ' eytt' : '') + '" data-id="' + s.id + '" data-vantar-kunna="' + (vantarKunna ? '1' : '') + '">' +
      '<button type="button" class="dr2-opna" data-act="edit" aria-label="Opna drögin ' + esc(s.num || '') + ' — ' + esc(s.customer_nafn || '') + '">' +
        '<span class="dr2-stub">' + numHtml(s.num) + '<span class="dr2-aldur b-' + fl.k + '"><i aria-hidden="true"></i>' + esc(dagarTxt(age)) + '</span></span>' +
        '<span class="dr2-hak t" aria-hidden="true"></span><span class="dr2-hak b" aria-hidden="true"></span>' +
        '<span class="dr2-buk">' +
          '<span class="dr2-l1"><span class="dr2-nafn">' + esc(s.customer_nafn || '—') + '</span>' + (s.hidden ? '<span class="dr2-eyttm">Eytt</span>' : '') + kunnaMerki + '</span>' +
          '<span class="dr2-l2">' + locBadge(s._loc) + '<span class="dr2-pk" aria-hidden="true">·</span><span>' + greidslaTxt(s.greitt_med) + '</span>' +
            '<span class="dr2-pk" aria-hidden="true">·</span><span>Stofnað <span class="dr2-dag">' + esc(fmtDate(s.created_at)) + '</span></span></span>' +
        '</span>' +
        '<span class="dr2-upph">' + esc(fmtKr(s.samtals).replace(/ kr$/, '')) + '<small>kr</small></span>' +
      '</button>' +
      '<div class="dr2-adg">' + adg + '</div>' +
    '</div>';
  }

  function renderList() {
    const body = document.getElementById('_drog-body');
    if (!body) return;
    lokaVal(false);
    const fj = document.getElementById('_drog-fj'); if (fj) fj.textContent = String(_count);
    teiknaSiu();
    if (!_items.length) {
      body.innerHTML = '<div class="dr2-tomt">Engin drög í gangi</div>';
      return;
    }
    // 2026-05-21: client-side sort so the dropdown takes effect without a
    // round-trip. Pulled the items in updated_desc order, but the user can
    // re-sort here.
    const sorted = _items.slice().sort((a, b) => {
      switch (_sortMode) {
        case 'created_desc': return (b.created_at || '').localeCompare(a.created_at || '');
        case 'created_asc':  return (a.created_at || '').localeCompare(b.created_at || '');
        case 'amount_desc':  return (+b.samtals || 0) - (+a.samtals || 0);
        case 'amount_asc':   return (+a.samtals || 0) - (+b.samtals || 0);
        default: /* updated_desc */
          return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '');
      }
    });
    const synileg = sorted.filter(matchesQ).filter(s => _locSia === 'allt' || locKey(s._loc) === _locSia);
    if (!synileg.length) {
      body.innerHTML = '<div class="dr2-tomt">' + (_q ? 'Ekkert fannst fyrir \u201e' + esc(_q) + '\u201c' : 'Engin drög hér') + '</div>';
      return;
    }
    // Biðtímakaflar (Miðakerfið) fyrir dagsetningarröðun; upphæðarröðun er einn samfelldur listi.
    let html;
    if (_sortMode === 'amount_desc' || _sortMode === 'amount_asc') html = synileg.map(midi).join('');
    else {
      const hopar = ALDUR.map(a => ({ a: a, list: synileg.filter(s => aldurFl(daysSince(s.created_at)).k === a.k) })).filter(h => h.list.length);
      if (_sortMode === 'created_asc') hopar.reverse();
      html = hopar.map(h => '<div class="dr2-kafli b-' + h.a.k + '"><i aria-hidden="true"></i>' + h.a.heiti + '<b>' + h.list.length + '</b><em aria-hidden="true"></em></div>' + h.list.map(midi).join('')).join('');
    }
    // STÖÐUGT VIÐMÓT (CLAUDE.md 23.09.2026): skrun + fókus haldast yfir endurteikningu.
    const _aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(body) : null;
    body.innerHTML = html;
    if (_aftur) _aftur();

    body.querySelectorAll('.dr2-t').forEach(t => {
      const id = t.dataset.id;
      const on = (act, fn) => { const b = t.querySelector('button[data-act="' + act + '"]'); if (b) b.addEventListener('click', fn); };
      on('edit', () => opna(id));
      on('finalize', () => opna(id));
      on('restore', () => endurheimta(id));
      const m = t.querySelector('.dr2-meira');
      if (m) m.addEventListener('click', e => { e.stopPropagation(); opnaVal(m, id); });
    });
  }

  // ── ⋯-valmyndin: Breyta drögum · Eyða drögum (sömu föll og áður). Fer í <body> svo ekkert klippi hana. ──
  let _pop = null;
  function _utan(e) { if (_pop && !_pop.el.contains(e.target) && !_pop.btn.contains(e.target)) lokaVal(false); }
  function _skrun(e) { if (_pop && !(e.target instanceof Node && _pop.el.contains(e.target))) lokaVal(false); }
  function _lokaS() { lokaVal(false); }
  function _lyklar(e) {
    if (!_pop) return;
    const items = Array.from(_pop.el.querySelectorAll('.dr2-mi'));
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); lokaVal(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    else if (e.key === 'Tab') lokaVal(false);
  }
  function lokaVal(skila) {
    if (!_pop) return;
    const p = _pop; _pop = null;
    p.el.remove();
    document.removeEventListener('mousedown', _utan, true);
    document.removeEventListener('touchstart', _utan, true);
    window.removeEventListener('scroll', _skrun, true);
    window.removeEventListener('resize', _lokaS);
    p.btn.setAttribute('aria-expanded', 'false');
    const t = p.btn.closest('.dr2-t'); if (t) t.classList.remove('is-open');
    if (skila && document.contains(p.btn)) { try { p.btn.focus(); } catch (_) {} }
  }
  function opnaVal(btn, id) {
    if (_pop && _pop.btn === btn) { lokaVal(true); return; }
    lokaVal(false);
    const s = _items.find(x => String(x.id) === String(id));
    const el = document.createElement('div');
    el.className = 'dr2-pop';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', 'Aðgerðir fyrir ' + ((s && s.num) || ''));
    el.innerHTML = '<div class="dr2-pop-h">Aðgerðir<span>' + esc((s && s.num) || '') + '</span></div>' +
      '<button type="button" role="menuitem" class="dr2-mi" data-mi="edit">' + _ik('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', 16) + '<span>Breyta drögum</span></button>' +
      '<div class="dr2-pop-sk" role="separator"></div>' +
      '<button type="button" role="menuitem" class="dr2-mi haetta" data-mi="delete" title="Eyða drögum (hægt að endurheimta)">' + _ik('<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>', 16) + '<span>Eyða drögum</span></button>';
    el.querySelectorAll('.dr2-mi').forEach(b => b.addEventListener('click', () => {
      const mi = b.dataset.mi;
      lokaVal(false);
      if (mi === 'edit') opna(id); else if (mi === 'delete') eyda(id);
    }));
    el.addEventListener('keydown', _lyklar);
    document.body.appendChild(el);
    // Undir ⋯, hægri brúnir saman; upp fyrir ef ekki er rúm. Krómzoom í appham → deilt út.
    const z = parseFloat(getComputedStyle(el).zoom) || 1;
    const r = btn.getBoundingClientRect(), pr = el.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.right - pr.width), window.innerWidth - pr.width - 8);
    let top = r.bottom + 6;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 6);
    el.style.left = (left / z) + 'px';
    el.style.top = (top / z) + 'px';
    _pop = { el: el, btn: btn };
    btn.setAttribute('aria-expanded', 'true');
    const t = btn.closest('.dr2-t'); if (t) t.classList.add('is-open');
    document.addEventListener('mousedown', _utan, true);
    document.addEventListener('touchstart', _utan, true);
    window.addEventListener('scroll', _skrun, true);
    window.addEventListener('resize', _lokaS);
    const first = el.querySelector('.dr2-mi'); if (first) { try { first.focus({ preventScroll: true }); } catch (_) {} }
  }

  // ── Refresh hooks ─────────────────────────────────────────────────────────
  document.addEventListener('sale-edited', loadDrog);
  // 01.10.2026: enginn 30 s púls. Drög hlaðast við opnun og þegar sala er vistuð.

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    ensureView();               // #view-drog til strax svo patch 218 leysi #drog
    injectSidebar();
    setTimeout(injectSidebar, 1000);
    patchSwitchView();
    setTimeout(patchSwitchView, 1500);
    setTimeout(loadDrog, 600);
    // deep-link á fyrstu hleðslu + hashchange (samhliða patch 218-routing)
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) show(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Public API (open opnar nú viewið; ytri kallar — pos.js pos-drog, patch 78
  // Workshop.openDrog — halda áfram að virka).
  window.DrogList = {
    open: show,
    refresh: loadDrog,
    count: () => _count
  };
  console.log('[patch-143] drog-list installed — sidebar view + badge (#drog)');
})();
/* === END DRÖG LIST === */
