/* === KERFI · skráaborð yfir skjái (221) ===================================
 *
 * "Control board" over the app's views. Step 2 of the de-sprawl project.
 *
 * SAFE BY DESIGN — it does NOT delete or rewire anything:
 *   • Scans the LIVE app at runtime — every `div[id^="view-"]` container and
 *     every `.vnav-btn[data-view]` nav entry — so the table shows the TRUE
 *     connection state (reachable from nav? orphaned? nav points at a missing
 *     view?). This is the "carefully check all the connections first".
 *   • "Opna" jumps by clicking the real nav button (uses the app's own routing
 *     — live, no parallel navigation).
 *   • "Fela / Sýna" toggles a REVERSIBLE feature flag (AppSettings 'kerfi_hidden'
 *     synced, else localStorage) that only hides a nav button via CSS. Re-show
 *     anytime. Nothing is removed.
 *   • A static AUDIT map adds advisory classification (Virkt / Sérhæft / Eldra /
 *     Skoða) from the 2026-06 audit — purely informational.
 *
 * Next capability (planned): per-view "Einfalt ↔ Ítarlegt" version flag so a
 * table can render a light or a heavy variant. Stubbed here, not wired yet.
 * =========================================================================== */
(() => {
  if (window.KerfiRegistry && window.KerfiRegistry._installed) return;

  const VIEW_ID = 'view-kerfi';
  const NAV_KEY = 'kerfi';
  const AS_KEY  = 'kerfi_hidden';      // array of view-keys hidden from nav
  const LS_KEY  = 'slokk_kerfi_hidden';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Advisory classification from the audit (key = view id without 'view-').
  // cls: ok=canonical, special=specialised, legacy=superseded, check=orphan/verify
  const AUDIT = {
    companies:{cls:'ok',note:'Fyrirtækjalisti'},
    'allir-vidsk':{cls:'ok',note:'Allir viðskiptavinir (master)'},
    'vidsk-detail':{cls:'ok',note:'Sameinað viðskiptavina-spjald'},
    counter:{cls:'ok',note:'Afgreiðsla'}, workshop:{cls:'ok',note:'Verkstæði'},
    field:{cls:'ok',note:'Þjónustutæki (kort)'}, income:{cls:'ok',note:'Tekjur'},
    settings:{cls:'ok',note:'Stillingar'}, lanstaeki:{cls:'ok',note:'Lánstæki'},
    geymsla:{cls:'ok',note:'Geymsla'}, utlit:{cls:'ok',note:'Útlit & þema'},
    arsskodun:{cls:'special',note:'Ársskoðun (sérhæft)'}, leidsogn:{cls:'special',note:'Leiðsögn (sérhæft)'},
    bilstjori:{cls:'special',note:'Bílstjóri (læst, sérhæft)'}, brunakerfi:{cls:'special',note:'Brunakerfi áskriftir'},
    'thjonustu-verkstaedi':{cls:'ok',note:'ÞjónustuVerkstæði'},
    'bokhalds-yfirlit':{cls:'ok',note:'Bókhalds yfirlit'},
    'bokhald-yfirferd':{cls:'check',note:'Bókhald yfirferð — skoða samruna'},
    'fyrirtaeki-yfirferd':{cls:'check',note:'Fyrirtæki yfirferð — skoða samruna'},
    verkdagbok:{cls:'ok',note:'Verkdagbók'}, 'til-rukkun':{cls:'ok',note:'Til rukkunar'},
    thjonustuverk:{cls:'check',note:'Þjónustuverk (172) — skarast við 182'},
    thjonustuver:{cls:'check',note:'Þjónustuver (182) — skarast við 172'},
    mottaka:{cls:'ok',note:'Móttaka'}, beidnir:{cls:'ok',note:'Beiðnir'},
    'krofu-yfirlit':{cls:'ok',note:'Kröfu yfirlit'}, hreyfingarlisti:{cls:'ok',note:'Hreyfingarlisti'},
    tilbod:{cls:'ok',note:'Tilboð'}, tilbodhub:{cls:'ok',note:'Tilboð hub'},
    vertid:{cls:'ok',note:'Vertíð / móttaka'},
    vidskiptavinir:{cls:'legacy',note:'GAMALL viðskiptavina-flipi — leyst af #157'},
    'insp-forecast':{cls:'check',note:'Spá — virðist munaðarlaust'},
    'vsk-report':{cls:'check',note:'VSK skýrsla — virðist munaðarlaust'},
    'aging-report':{cls:'check',note:'Aldursgreining — virðist munaðarlaust'},
    'customer-ledger':{cls:'check',note:'Viðskiptamannabók — virðist munaðarlaust'}
  };
  const CLS_META = {
    ok:      {label:'Virkt',     bg:'#f0fdf4',bd:'#bbf7d0',col:'#15803d'},
    special: {label:'Sérhæft',   bg:'#eff6ff',bd:'#bfdbfe',col:'#1d4ed8'},
    legacy:  {label:'Eldra',     bg:'#fffbeb',bd:'#fde68a',col:'#a16207'},
    check:   {label:'Skoða',     bg:'#fef2f2',bd:'#fecaca',col:'#b91c1c'},
    unknown: {label:'Óflokkað',  bg:'#f1f5f9',bd:'#cbd5e1',col:'#475569'}
  };

  // ── hidden-views flag (reversible) ──────────────────────────────────────────
  function loadHidden() {
    try { const a = window.AppSettings && AppSettings.path && AppSettings.path(AS_KEY); if (Array.isArray(a)) return a.slice(); } catch (_) {}
    try { const l = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (Array.isArray(l)) return l; } catch (_) {}
    return [];
  }
  let HIDDEN = loadHidden();
  async function saveHidden(scopeAll) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(HIDDEN)); } catch (_) {}
    if (scopeAll && window.AppSettings && AppSettings.save) { try { await AppSettings.save({ [AS_KEY]: HIDDEN }); } catch (_) {} }
  }
  function applyHidden() {
    let st = document.getElementById('_kerfi-hide'); if (!st) { st = document.createElement('style'); st.id='_kerfi-hide'; document.head.appendChild(st); }
    st.textContent = HIDDEN.map(k => '.vnav-btn[data-view="'+k+'"]{display:none !important}').join('');
  }
  applyHidden();

  // ── live scan ───────────────────────────────────────────────────────────────
  function scan() {
    const views = {};
    document.querySelectorAll('[id^="view-"]').forEach(el => { const k = el.id.replace(/^view-/, ''); if (k) views[k] = (views[k]||{}); views[k].hasView = true; });
    document.querySelectorAll('.vnav-btn[data-view]').forEach(b => {
      const k = b.getAttribute('data-view'); if (!k) return; views[k] = (views[k]||{}); views[k].hasNav = true;
      views[k].label = (b.querySelector('span') ? b.querySelector('span').textContent : b.textContent || '').trim();
    });
    return Object.keys(views).sort().map(k => ({
      key:k, hasView:!!views[k].hasView, hasNav:!!views[k].hasNav,
      label: views[k].label || (AUDIT[k] && AUDIT[k].note) || k,
      cls: (AUDIT[k] && AUDIT[k].cls) || 'unknown', note: (AUDIT[k] && AUDIT[k].note) || '',
      hidden: HIDDEN.indexOf(k) >= 0
    }));
  }

  // ── styles ───────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('_kerfi-styles')) return;
    const css = [
      '#'+VIEW_ID+'{padding:22px 24px 60px}',
      '#'+VIEW_ID+' .kf-wrap{max-width:980px;margin:0 auto}',
      '#'+VIEW_ID+' h1{font-size:21px;font-weight:800;margin:0 0 2px}',
      '#'+VIEW_ID+' .kf-sub{color:#64748b;font-size:13px;margin:0 0 16px}',
      '#'+VIEW_ID+' .kf-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}',
      '#'+VIEW_ID+' .kf-chip{background:#fff;border:1px solid #e6eaf0;border-radius:99px;padding:7px 13px;font-size:12.5px;font-weight:600;color:#475569}',
      '#'+VIEW_ID+' .kf-chip b{color:#0f172a}',
      '#'+VIEW_ID+' .kf-panel{background:#fff;border:1px solid #e6eaf0;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,.05),0 14px 34px -24px rgba(15,23,42,.4)}',
      '#'+VIEW_ID+' table{width:100%;border-collapse:collapse;font-size:13px}',
      '#'+VIEW_ID+' th{background:#f8fafc;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:left;padding:10px 14px;border-bottom:1px solid #e6eaf0}',
      '#'+VIEW_ID+' td{padding:9px 14px;border-top:1px solid #f1f5f9;vertical-align:middle}',
      '#'+VIEW_ID+' tr.hid td{opacity:.5}',
      '#'+VIEW_ID+' .kf-key{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#94a3b8}',
      '#'+VIEW_ID+' .kf-name{font-weight:700;color:#0f172a}',
      '#'+VIEW_ID+' .pill{display:inline-flex;align-items:center;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid;white-space:nowrap}',
      '#'+VIEW_ID+' .conn{font-size:11px;font-weight:700}',
      '#'+VIEW_ID+' .conn.ok{color:#15803d}.conn.warn{color:#b91c1c}',
      '#'+VIEW_ID+' .kf-btn{font:inherit;font-size:11.5px;font-weight:700;border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:8px;padding:6px 11px;cursor:pointer;margin-left:4px}',
      '#'+VIEW_ID+' .kf-btn.open{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}',
      '#'+VIEW_ID+' .kf-btn[disabled]{opacity:.4;cursor:default}',
      '#'+VIEW_ID+' .kf-note{font-size:11px;color:#94a3b8;margin-top:2px}'
    ].join('');
    const st = document.createElement('style'); st.id='_kerfi-styles'; st.textContent=css; document.head.appendChild(st);
  }

  function viewEl(){ return document.getElementById(VIEW_ID); }
  function ensureView(){ if (viewEl()) return; const v=document.createElement('div'); v.id=VIEW_ID; v.className='view';
    const ref=document.getElementById('view-settings')||document.getElementById('view-counter');
    if (ref&&ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v); }

  function render() {
    ensureView(); injectStyles();
    const v = viewEl(); if (!v) return;
    const rows = scan();
    const nView = rows.length, nNav = rows.filter(r=>r.hasNav).length, nOrphan = rows.filter(r=>r.hasView&&!r.hasNav).length, nBroken = rows.filter(r=>!r.hasView&&r.hasNav).length;
    const trs = rows.map(r => {
      const m = CLS_META[r.cls] || CLS_META.unknown;
      const conn = r.hasView && r.hasNav ? '<span class="conn ok">✓ tengt</span>'
        : (r.hasView && !r.hasNav ? '<span class="conn warn">⚠ ekki í valmynd</span>'
        : '<span class="conn warn">⚠ valmynd án skjás</span>');
      const openBtn = r.hasNav ? '<button class="kf-btn open" data-open="'+esc(r.key)+'">Opna</button>'
        : '<button class="kf-btn" disabled title="Ekki í valmynd">Opna</button>';
      const hideBtn = r.hasNav ? '<button class="kf-btn" data-hide="'+esc(r.key)+'">'+(r.hidden?'Sýna':'Fela')+'</button>' : '';
      return '<tr class="'+(r.hidden?'hid':'')+'">'+
        '<td><div class="kf-name">'+esc(r.label)+'</div><div class="kf-key">view-'+esc(r.key)+'</div>'+(r.note?'<div class="kf-note">'+esc(r.note)+'</div>':'')+'</td>'+
        '<td><span class="pill" style="background:'+m.bg+';border-color:'+m.bd+';color:'+m.col+'">'+m.label+'</span></td>'+
        '<td>'+conn+(r.hidden?' · <span style="color:#94a3b8;font-size:11px">falið</span>':'')+'</td>'+
        '<td style="text-align:right;white-space:nowrap">'+openBtn+hideBtn+'</td></tr>';
    }).join('');

    v.innerHTML =
      '<div class="kf-wrap">'+
        '<h1>⚙️ Kerfi · skjáir</h1>'+
        '<p class="kf-sub">Lifandi yfirlit yfir alla skjái appsins — beint úr DOM (réttar tengingar). Opna = fer á skjáinn um raunverulega valmynd. Fela = afturkræft (fjarlægir bara úr valmynd).</p>'+
        '<div class="kf-stats">'+
          '<span class="kf-chip"><b>'+nView+'</b> skjáir</span>'+
          '<span class="kf-chip"><b>'+nNav+'</b> í valmynd</span>'+
          '<span class="kf-chip" title="Skjár til en ekki í valmynd">⚠ <b>'+nOrphan+'</b> munaðarlausir</span>'+
          (nBroken?'<span class="kf-chip" title="Valmyndarhnappur án skjás">⚠ <b>'+nBroken+'</b> brotnir</span>':'')+
          '<span class="kf-chip"><b>'+HIDDEN.length+'</b> falin</span>'+
        '</div>'+
        '<div class="kf-panel"><table>'+
          '<thead><tr><th>Skjár</th><th>Flokkun</th><th>Tenging</th><th style="text-align:right">Aðgerðir</th></tr></thead>'+
          '<tbody>'+trs+'</tbody></table></div>'+
        '<p class="kf-sub" style="margin-top:12px">Næst (planað): „Einfalt ↔ Ítarlegt" útgáfa per skjá — léttar töflur vs. núverandi ítarlegar.</p>'+
      '</div>';

    v.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ const nav=document.querySelector('.vnav-btn[data-view="'+b.dataset.open+'"]'); if(nav) nav.click(); });
    v.querySelectorAll('[data-hide]').forEach(b=>b.onclick=async()=>{ const k=b.dataset.hide; const i=HIDDEN.indexOf(k); if(i>=0) HIDDEN.splice(i,1); else HIDDEN.push(k); applyHidden(); await saveHidden(true); render(); });
  }

  // ── open + nav (mirrors patch 220/190) ───────────────────────────────────────
  function openView(){ document.querySelectorAll('[id^=view-]').forEach(x=>{x.style.display='none';x.classList.remove('active');});
    ensureView(); const v=viewEl(); v.style.display=''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(x=>x.classList.remove('active'));
    const b=document.querySelector('[data-view="'+NAV_KEY+'"]'); if(b) b.classList.add('active'); render(); }
  function injectTab(){
    const btns=Array.prototype.slice.call(document.querySelectorAll('.vnav-btn')); if(!btns.length) return;
    if(document.querySelector('[data-view="'+NAV_KEY+'"]')) return;
    const anchor=btns[btns.length-1]; if(!anchor||!anchor.parentElement) return;
    const btn=anchor.cloneNode(true); btn.dataset.view=NAV_KEY; btn.classList.remove('active');
    const span=btn.querySelector('span'); if(span) span.textContent='⚙️ Kerfi'; else btn.textContent='⚙️ Kerfi';
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n=>n.remove());
    btn.removeAttribute('onclick'); btn.onclick=openView;
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    document.querySelectorAll('.vnav-btn').forEach(b=>{ if(b===btn) return; b.addEventListener('click',()=>{ const vv=viewEl(); if(vv){vv.style.display='none';vv.classList.remove('active');} btn.classList.remove('active'); }); });
    console.log('[kerfi] tab injected');
  }
  setInterval(injectTab,1200); setTimeout(injectTab,800); setTimeout(applyHidden,1500);
  try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(()=>{ HIDDEN=loadHidden(); applyHidden(); if(viewEl()&&viewEl().classList.contains('active')) render(); }); } catch (_) {}

  window.KerfiRegistry = { _installed:true, open:openView, scan, hidden:()=>HIDDEN.slice() };
  console.log('[patch-221] Kerfi · skjáaskrá installed');
})();
/* === END KERFI REGISTRY === */
