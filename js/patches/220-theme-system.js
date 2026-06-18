/* === ÚTLIT & ÞEMA — site-wide theme tokens + control board (220) ============
 *
 * Stage 1 of the theming project: a single source of truth for the site's look.
 *   • Defines design TOKENS as CSS variables on :root (--thm-bg, --thm-brand,
 *     --thm-primary, --thm-ink, --thm-h1/h2/h3, --thm-sumh, --thm-fs …).
 *   • Loads the saved choice on boot (AppSettings 'ui_theme' = synced across the
 *     4 machines, else localStorage 'slokk_theme' per device) and applies it
 *     before paint (no flash).
 *   • A "⚙️ Útlit" sidebar view = the control board (presets · accent · header
 *     colours H1/H2/H3 · fill solid/gradient · font · font-size · density),
 *     live-applies + saves.
 *   • window.Theme API: get(), set(patch), apply(), TOKENS.
 *
 * Stage 2 (later) migrates each page's hardcoded colours to reference these
 * tokens so switching theme re-skins the whole app. This patch is additive and
 * defensive — it never throws and only adds a view + a token layer.
 * =========================================================================== */
(() => {
  if (window.Theme && window.Theme._installed) return;

  const VIEW_ID = 'view-utlit';
  const NAV_KEY = 'utlit';
  const AS_KEY  = 'ui_theme';
  const LS_KEY  = 'slokk_theme';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  const PRESETS = {
    eldur:     { nm:'🔥 Eldur',     desc:'Djúprautt + brennt appelsínugult — á vörumerki.', sw:['#a8322a','#c96a2f','#f7edec','#17120f'],
      t:{ bg:'#f5f4f2',card:'#fff',ink:'#17120f',muted:'#736b66',line:'#ece8e4',brand:'#a8322a',primary:'#c96a2f',h1:'#17120f',h2:'#736b66',h3:'#a59d97' } },
    klassiskt: { nm:'💼 Klassískt', desc:'Navy + faglegur blár — hreint og rólegt.', sw:['#1e3a5f','#2563eb','#eef2f7','#0f172a'],
      t:{ bg:'#f3f5f8',card:'#fff',ink:'#0f172a',muted:'#64748b',line:'#e6eaf0',brand:'#1e3a5f',primary:'#2563eb',h1:'#0f172a',h2:'#334155',h3:'#94a3b8' } },
    hlutlaust: { nm:'🌿 Hlutlaust', desc:'Slate + grænt — lágstemmt.', sw:['#334155','#0f766e','#eef2f1','#0f172a'],
      t:{ bg:'#f5f6f7',card:'#fff',ink:'#0f172a',muted:'#64748b',line:'#e7eaec',brand:'#334155',primary:'#0f766e',h1:'#0f172a',h2:'#334155',h3:'#94a3b8' } },
    dokkt:     { nm:'🌙 Dökkt',     desc:'Dökkur grunnur — gott í bíl/myrkri.', sw:['#0f1115','#f59e0b','#1b1f27','#e5e7eb'],
      t:{ bg:'#0f1115',card:'#1b1f27',ink:'#e5e7eb',muted:'#9aa3af',line:'#2a2f3a',brand:'#f59e0b',primary:'#f59e0b',h1:'#f3f4f6',h2:'#cbd0d8',h3:'#8b93a1' } }
  };
  const ACCENTS = ['#c96a2f','#a8322a','#2563eb','#0f766e','#16a34a','#7c3aed','#334155'];
  const FONTS = {
    system:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
    serif:'Georgia,"Times New Roman",serif',
    wide:'Verdana,Tahoma,Geneva,sans-serif',
    rounded:'"Trebuchet MS","Segoe UI",system-ui,sans-serif'
  };
  const FONT_LABEL = { system:'Kerfi', serif:'Serif', wide:'Breitt', rounded:'Mjúkt' };
  const DEFAULT = { preset:'klassiskt', accent:null, fill:'solid', font:'system', fs:1, density:'venju', h1:null, h2:null, h3:null };

  // ── persistence ──────────────────────────────────────────────────────────
  function load() {
    try { const a = window.AppSettings && AppSettings.path && AppSettings.path(AS_KEY);
      if (a && a.preset) return Object.assign({}, DEFAULT, a); } catch (_) {}
    try { const l = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (l && l.preset) return Object.assign({}, DEFAULT, l); } catch (_) {}
    return Object.assign({}, DEFAULT);
  }
  let S = load();
  async function save(scopeAll) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (_) {}
    if (scopeAll && window.AppSettings && AppSettings.save) {
      try { await AppSettings.save({ [AS_KEY]: S }); } catch (_) {}
    }
  }

  // ── token computation + application ────────────────────────────────────────
  function tokens(s) {
    const t = Object.assign({}, (PRESETS[s.preset] || PRESETS.klassiskt).t);
    const brand = t.brand, primary = s.accent || t.primary;
    return {
      bg:t.bg, card:t.card, ink:t.ink, muted:t.muted, line:t.line,
      brand, primary, h1:s.h1||t.h1, h2:s.h2||t.h2, h3:s.h3||t.h3,
      sumh: s.fill === 'grad' ? ('linear-gradient(135deg,' + brand + ',' + primary + ')') : brand
    };
  }
  function apply(s) {
    s = s || S;
    const t = tokens(s), r = document.documentElement.style;
    r.setProperty('--thm-bg', t.bg);     r.setProperty('--thm-card', t.card);
    r.setProperty('--thm-ink', t.ink);   r.setProperty('--thm-muted', t.muted);
    r.setProperty('--thm-line', t.line); r.setProperty('--thm-brand', t.brand);
    r.setProperty('--thm-primary', t.primary);
    r.setProperty('--thm-h1', t.h1); r.setProperty('--thm-h2', t.h2); r.setProperty('--thm-h3', t.h3);
    r.setProperty('--thm-sumh', t.sumh);
    r.setProperty('--thm-fs', s.fs);
    r.setProperty('--thm-font', FONTS[s.font] || FONTS.system);
    document.documentElement.setAttribute('data-thm-density', s.density);
    document.documentElement.setAttribute('data-thm-preset', s.preset);
  }
  apply(S); // apply ASAP on script load (before most views render)

  // ── control board view ─────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('_thm-styles')) return;
    const css = [
      '#'+VIEW_ID+'{padding:22px 24px 60px}',
      '#'+VIEW_ID+' .thm-wrap{max-width:1040px;margin:0 auto}',
      '#'+VIEW_ID+' h1{font-size:21px;font-weight:800;margin:0 0 2px}',
      '#'+VIEW_ID+' .thm-sub{color:#64748b;font-size:13px;margin:0 0 18px}',
      '#'+VIEW_ID+' .thm-grid{display:grid;grid-template-columns:1fr 400px;gap:18px;align-items:start}',
      '@media(max-width:860px){#'+VIEW_ID+' .thm-grid{grid-template-columns:1fr}}',
      '#'+VIEW_ID+' .thm-card{background:#fff;border:1px solid #e6eaf0;border-radius:14px;box-shadow:0 1px 2px rgba(15,23,42,.05),0 14px 34px -24px rgba(15,23,42,.4);margin-bottom:16px;overflow:hidden}',
      '#'+VIEW_ID+' .thm-card-h{padding:12px 16px;border-bottom:1px solid #e6eaf0;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}',
      '#'+VIEW_ID+' .thm-card-b{padding:16px}',
      '#'+VIEW_ID+' .thm-presets{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '#'+VIEW_ID+' .thm-preset{border:2px solid #e6eaf0;border-radius:12px;padding:12px;cursor:pointer;background:#fff}',
      '#'+VIEW_ID+' .thm-preset.on{border-color:#0f172a;box-shadow:0 0 0 3px rgba(15,23,42,.06)}',
      '#'+VIEW_ID+' .thm-preset .nm{font-weight:800;font-size:13.5px;display:flex;align-items:center;gap:7px}',
      '#'+VIEW_ID+' .thm-preset .sw{display:flex;gap:5px;margin-top:9px}',
      '#'+VIEW_ID+' .thm-preset .sw span{width:26px;height:26px;border-radius:7px;border:1px solid rgba(0,0,0,.08)}',
      '#'+VIEW_ID+' .thm-preset .desc{font-size:11px;color:#64748b;margin-top:7px}',
      '#'+VIEW_ID+' .thm-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:2px 0 8px}',
      '#'+VIEW_ID+' .thm-dots{display:flex;gap:9px;flex-wrap:wrap}',
      '#'+VIEW_ID+' .thm-dot{width:30px;height:30px;border-radius:50%;cursor:pointer;border:2px solid #fff;box-shadow:0 0 0 1px #e6eaf0,0 1px 2px rgba(0,0,0,.1)}',
      '#'+VIEW_ID+' .thm-dot.on{box-shadow:0 0 0 2px #fff,0 0 0 4px #0f172a}',
      '#'+VIEW_ID+' .thm-hc{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#64748b;margin-right:16px}',
      '#'+VIEW_ID+' .thm-hc input{width:40px;height:30px;border:1px solid #e6eaf0;border-radius:7px;padding:0;cursor:pointer;background:#fff}',
      '#'+VIEW_ID+' .thm-seg{display:inline-flex;background:#eef2f7;border-radius:10px;padding:3px;gap:3px;flex-wrap:wrap}',
      '#'+VIEW_ID+' .thm-seg button{border:0;background:transparent;color:#64748b;font:700 12.5px/1 inherit;padding:8px 14px;border-radius:8px;cursor:pointer}',
      '#'+VIEW_ID+' .thm-seg button.on{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,.12)}',
      '#'+VIEW_ID+' .thm-save{background:#0f172a;color:#fff;border:0;border-radius:10px;padding:11px 18px;font-weight:700;font-size:13px;cursor:pointer}',
      // live preview (uses the REAL --thm-* tokens so it mirrors the site)
      '#'+VIEW_ID+' .thm-pv{position:sticky;top:16px;background:var(--thm-bg);border:1px solid #e6eaf0;border-radius:14px;padding:14px;box-shadow:0 1px 2px rgba(15,23,42,.05);font-family:var(--thm-font)}',
      '#'+VIEW_ID+' .pvh1{font-size:calc(17px*var(--thm-fs));font-weight:800;color:var(--thm-h1)}',
      '#'+VIEW_ID+' .pvh2{font-size:calc(13px*var(--thm-fs));font-weight:700;color:var(--thm-h2);margin-top:2px}',
      '#'+VIEW_ID+' .pvh3{font-size:calc(10px*var(--thm-fs));font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--thm-h3);margin-top:3px;margin-bottom:10px}',
      '#'+VIEW_ID+' .pv-head{background:var(--thm-card);border:1px solid var(--thm-line);border-left:4px solid var(--thm-brand);border-radius:12px;padding:12px 14px;margin-bottom:10px}',
      '#'+VIEW_ID+' .pv-head .t{font-weight:800;font-size:calc(15px*var(--thm-fs));color:var(--thm-h1)}',
      '#'+VIEW_ID+' .pv-head .s{font-size:calc(11.5px*var(--thm-fs));color:var(--thm-muted);margin-top:2px}',
      '#'+VIEW_ID+' .pv-row{background:var(--thm-card);border:1px solid var(--thm-line);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;margin-bottom:8px}',
      '#'+VIEW_ID+' .pv-row .nm{flex:1;font-weight:700;font-size:calc(13px*var(--thm-fs));color:var(--thm-ink)}',
      '#'+VIEW_ID+' .pv-pill{display:inline-flex;font-size:calc(10.5px*var(--thm-fs));font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid var(--thm-brand);color:var(--thm-brand);background:var(--thm-card)}',
      '#'+VIEW_ID+' .pv-sum{border-radius:12px;overflow:hidden;border:1px solid var(--thm-line);margin-top:4px}',
      '#'+VIEW_ID+' .pv-sum .h{background:var(--thm-sumh);color:#fff;padding:11px 14px;display:flex;justify-content:space-between;font-weight:800}',
      '#'+VIEW_ID+' .pv-sum .h .big{font-size:calc(18px*var(--thm-fs))}',
      '#'+VIEW_ID+' .pv-sum .b{background:var(--thm-card);padding:10px 14px;display:flex;gap:8px}',
      '#'+VIEW_ID+' .pv-btn{flex:1;text-align:center;font-size:calc(12px*var(--thm-fs));font-weight:700;padding:9px;border-radius:9px;color:#fff}',
      '#'+VIEW_ID+' .pv-btn.b1{background:var(--thm-brand)}#'+VIEW_ID+' .pv-btn.b2{background:var(--thm-primary)}'
    ].join('');
    const st = document.createElement('style'); st.id='_thm-styles'; st.textContent=css; document.head.appendChild(st);
  }

  function viewEl(){ return document.getElementById(VIEW_ID); }
  function ensureView() {
    if (viewEl()) return;
    const v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    const ref = document.getElementById('view-counter') || document.getElementById('view-workshop');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v);
  }

  function render() {
    ensureView(); injectStyles();
    const v = viewEl(); if (!v) return;
    const presetCards = Object.entries(PRESETS).map(([k,p]) =>
      '<div class="thm-preset'+(S.preset===k?' on':'')+'" data-k="'+k+'"><div class="nm">'+p.nm+(S.preset===k?'<span style="margin-left:auto">✓</span>':'')+'</div>'+
      '<div class="sw">'+p.sw.map(c=>'<span style="background:'+c+'"></span>').join('')+'</div><div class="desc">'+esc(p.desc)+'</div></div>').join('');
    const accentDots = ACCENTS.map(c=>'<span class="thm-dot'+(S.accent===c?' on':'')+'" data-c="'+c+'" style="background:'+c+'"></span>').join('');
    const t = tokens(S);
    const seg = (id,opts,cur)=>'<div class="thm-seg" id="'+id+'">'+opts.map(([val,lab])=>'<button data-v="'+val+'"'+(String(cur)===String(val)?' class="on"':'')+'>'+lab+'</button>').join('')+'</div>';

    v.innerHTML =
      '<div class="thm-wrap">'+
        '<h1>⚙️ Útlit &amp; þema</h1>'+
        '<p class="thm-sub">Ein stilling — gildir á öllu vefnum. Vistast samstillt (öll tæki) eða bara hér.</p>'+
        '<div class="thm-grid"><div>'+
          '<div class="thm-card"><div class="thm-card-h">🎨 Þema</div><div class="thm-card-b"><div class="thm-presets" id="thm-presets">'+presetCards+'</div></div></div>'+
          '<div class="thm-card"><div class="thm-card-h">✨ Áherslulitur</div><div class="thm-card-b"><div class="thm-label">Aðallitur (takkar, samtölur, virkt val)</div><div class="thm-dots" id="thm-accents">'+accentDots+'</div></div></div>'+
          '<div class="thm-card"><div class="thm-card-h">🔠 Hausar &amp; letur</div><div class="thm-card-b">'+
            '<div class="thm-label">Hausalitir (H1 / H2 / H3)</div>'+
            '<div style="margin-bottom:16px">'+
              '<label class="thm-hc">H1 <input type="color" id="thm-h1" value="'+t.h1+'"></label>'+
              '<label class="thm-hc">H2 <input type="color" id="thm-h2" value="'+t.h2+'"></label>'+
              '<label class="thm-hc">H3 <input type="color" id="thm-h3" value="'+t.h3+'"></label>'+
            '</div>'+
            '<div class="thm-label">Fylling hausa / samtölu-borða</div>'+seg('thm-fill',[['solid','Fyllt'],['grad','Litaskipti']],S.fill)+
            '<div class="thm-label" style="margin-top:16px">Letur</div>'+seg('thm-font',[['system','Kerfi'],['serif','Serif'],['wide','Breitt'],['rounded','Mjúkt']],S.font)+
            '<div class="thm-label" style="margin-top:16px">Leturstærð</div>'+seg('thm-fs',[['.92','Lítið'],['1','Venjulegt'],['1.12','Stórt'],['1.25','Stærst']],S.fs)+
          '</div></div>'+
          '<div class="thm-card"><div class="thm-card-h">↕ Þéttleiki</div><div class="thm-card-b"><div class="thm-label">Þéttleiki lista</div>'+seg('thm-density',[['thett','Þétt'],['venju','Venjulegt'],['rumt','Rúmt']],S.density)+'</div></div>'+
          '<div class="thm-card"><div class="thm-card-h">💾 Vistun</div><div class="thm-card-b">'+
            '<button class="thm-save" id="thm-save-all">Vista &amp; virkja á öllum tækjum</button> '+
            '<button class="thm-save" id="thm-save-dev" style="background:#fff;color:#0f172a;border:1px solid #cbd5e1">Bara þetta tæki</button>'+
            '<div style="font-size:11.5px;color:#94a3b8;margin-top:10px">Breytingar gilda strax í forskoðun; „Vista" festir valið (samstillt eða per tæki).</div>'+
          '</div></div>'+
        '</div>'+
        '<div><div class="thm-pv">'+
          '<div class="pvh1">Fyrirsögn 1 (H1)</div><div class="pvh2">Fyrirsögn 2 (H2)</div><div class="pvh3">Fyrirsögn 3 (H3)</div>'+
          '<div class="pv-head"><div class="t">Aðalskoðun skeifan</div><div class="s">📍 Grjóthálsi 10 · 📅 Skoðun: Júní</div></div>'+
          '<div class="pv-row"><div class="nm">Duft 6 kg</div><span class="pv-pill">⚠ Á eftir</span></div>'+
          '<div class="pv-sum"><div class="h"><span>Samtals m. vsk</span><span class="big">74.535 kr</span></div>'+
            '<div class="b"><span class="pv-btn b1">📄 Úttektarskýrsla</span><span class="pv-btn b2">🧾 Reikningur</span></div></div>'+
        '</div></div>'+
        '</div>'+
      '</div>';

    // wire
    v.querySelectorAll('.thm-preset').forEach(el=>el.onclick=()=>{ S.preset=el.dataset.k; S.accent=null; S.h1=S.h2=S.h3=null; apply(S); render(); });
    v.querySelectorAll('.thm-dot').forEach(d=>d.onclick=()=>{ S.accent=d.dataset.c; apply(S); render(); });
    const segWire=(id,key,parse)=>{ const el=v.querySelector('#'+id); if(!el) return; el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ S[key]=parse?parse(b.dataset.v):b.dataset.v; apply(S); render(); }); };
    segWire('thm-fill','fill'); segWire('thm-font','font'); segWire('thm-fs','fs',parseFloat); segWire('thm-density','density');
    const hc=(id,key)=>{ const el=v.querySelector('#'+id); if(el) el.oninput=e=>{ S[key]=e.target.value; apply(S); }; };
    hc('thm-h1','h1'); hc('thm-h2','h2'); hc('thm-h3','h3');
    const sa=v.querySelector('#thm-save-all'); if(sa) sa.onclick=async()=>{ await save(true); toast('Vistað — gildir á öllum tækjum'); };
    const sd=v.querySelector('#thm-save-dev'); if(sd) sd.onclick=async()=>{ await save(false); toast('Vistað á þessu tæki'); };
  }
  function toast(m){ try{ if(window.Toast&&Toast.show) return Toast.show(m); }catch(_){} console.log('[útlit]',m); }

  // ── open + nav (mirrors patch 190 lifecycle) ───────────────────────────────
  function openView() {
    document.querySelectorAll('[id^=view-]').forEach(x=>{ x.style.display='none'; x.classList.remove('active'); });
    ensureView(); const v=viewEl(); v.style.display=''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(x=>x.classList.remove('active'));
    const b=document.querySelector('[data-view="'+NAV_KEY+'"]'); if(b) b.classList.add('active');
    render();
  }
  function injectTab() {
    const btns = Array.prototype.slice.call(document.querySelectorAll('.vnav-btn'));
    if (!btns.length) return;
    if (document.querySelector('[data-view="'+NAV_KEY+'"]')) return;
    const anchor = btns[btns.length-1];
    if (!anchor || !anchor.parentElement) return;
    const btn = anchor.cloneNode(true);
    btn.dataset.view = NAV_KEY; btn.classList.remove('active');
    const span = btn.querySelector('span');
    if (span) span.textContent = '⚙️ Útlit'; else btn.textContent = '⚙️ Útlit';
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n=>n.remove());
    btn.removeAttribute('onclick'); btn.onclick = openView;
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    document.querySelectorAll('.vnav-btn').forEach(b=>{ if(b===btn) return; b.addEventListener('click',()=>{ const vv=viewEl(); if(vv){vv.style.display='none';vv.classList.remove('active');} btn.classList.remove('active'); }); });
    console.log('[útlit] tab injected');
  }
  setInterval(injectTab, 1200); setTimeout(injectTab, 600);

  // Re-apply when settings sync in from another device.
  try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { const ns = load(); S = ns; apply(S); if (viewEl() && viewEl().classList.contains('active')) render(); }); } catch (_) {}

  window.Theme = { _installed:true, get:()=>Object.assign({},S), set:(p)=>{ S=Object.assign({},S,p); apply(S); }, apply:()=>apply(S), open:openView, PRESETS, TOKENS:tokens };
  console.log('[patch-220] Útlit & þema (theme system) installed');
})();
/* === END ÚTLIT & ÞEMA === */
