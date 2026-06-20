/* === 230-brunastal-theme.js — „🔥 Brunastál" dark-metallic POS theme =========
 *
 * High-fidelity recreation of the uploaded “Dark Metallic POS Theme” handoff,
 * wired into the app's own Útlit theme system (patch 220) as a preset called
 * `brunastal`. It is OPT-IN: nothing changes until a user picks 🔥 Brunastál in
 * ⚙️ Útlit. Everything keys off `html[data-thm-preset="brunastal"]`, so the whole
 * effect appears/disappears with the preset and is fully reversible (delete this
 * file + its <script> + the preset entry in 220).
 *
 * The look (per the design spec):
 *   • a thick brushed-STEEL banner across the top of the content area with the
 *     real Brunahólf mark, live fire (img/theme/fire-flames.png) + ember underglow,
 *     a live LED CLOCK + date on the right (Space Mono);
 *   • a near-black metallic SIDEBAR with an accent-gradient active item;
 *   • a brushed steel-grey page BACKDROP, WHITE product/document cards;
 *   • metallic-black / accent CONTROLS, brushed tiles, glossy status pills;
 *   • Space Grotesk (UI) · Sora (wordmark) · Space Mono (numbers) fonts;
 *   • a switchable accent — red (default) · blue · gold — via the banner swatches.
 *
 * ROBUSTNESS: the banner is a SINGLE position:fixed element parented to <body>,
 * so it is never destroyed by a view's innerHTML re-render (pos.js owns
 * #view-sala). It shows on EVERY page and REPLACES each page's own banner (the
 * POS .pos-banner is hidden). Standard block pages get one deterministic scroller
 * beneath it; the bespoke flex pages (map / kanban / workshop) keep their native
 * flex+scroll and are simply inset below it (border-box shrinks their panes).
 * =========================================================================== */
(() => {
  if (window.__brunastal) return; window.__brunastal = true;

  const PRESET = 'brunastal';
  const ACC_LS = 'brunastal_accent';
  // Nice page titles for the banner (fallback: active nav label, then brand).
  const VIEW_TITLES = {
    sala:'Sala', counter:'Afgreiðsla', workshop:'Verkstæði', field:'Leiðsögn',
    companies:'Fyrirtæki', income:'Tekjur', settings:'Stillingar', lanstaeki:'Lánstæki',
    geymsla:'Geymsla', vorur:'Vörur', utlit:'Útlit', rekstrarfelog:'Rekstrarfélög',
    brunakerfi:'Brunakerfi', tilbodhub:'Tilboð'
  };
  const WK = ['Sun','Mán','Þri','Mið','Fim','Fös','Lau'];
  const MO = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];

  // ── fonts ──────────────────────────────────────────────────────────────────
  function fonts() {
    if (document.getElementById('bstal-fonts')) return;
    const pre1 = document.createElement('link'); pre1.rel='preconnect'; pre1.href='https://fonts.googleapis.com';
    const pre2 = document.createElement('link'); pre2.rel='preconnect'; pre2.href='https://fonts.gstatic.com'; pre2.crossOrigin='';
    const l = document.createElement('link'); l.id='bstal-fonts'; l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
    document.head.appendChild(pre1); document.head.appendChild(pre2); document.head.appendChild(l);
  }

  // ── the metallic stylesheet (all scoped to the preset) ──────────────────────
  const P = 'html[data-thm-preset="'+PRESET+'"] ';
  const ON = 'html[data-bstal-banner="on"][data-thm-preset="'+PRESET+'"] ';
  const METAL_BLACK = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const PLATE_IMG   = 'linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px)';

  function styles() {
    if (document.getElementById('bstal-css')) return;
    const css = [
      /* ── accent variable sets (red default · blue · gold) ───────────────── */
      P+'{'
        +'--bstal-accent:#c92a2a; --bstal-accent2:#f0584c; --bstal-ring:rgba(190,32,28,.55); --bstal-glow:rgba(160,16,16,.55);'
        +'--bstal-grad:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);'
        +'--bstal-plate:#eef1f6; --bstal-plate-img:'+PLATE_IMG+';'
      +'}',
      'html[data-thm-preset="'+PRESET+'"][data-bstal-accent="blue"]{'
        +'--bstal-accent:#5b86ff; --bstal-accent2:#82a4ff; --bstal-ring:rgba(110,155,255,.55); --bstal-glow:rgba(64,113,240,.5);'
        +'--bstal-grad:linear-gradient(145deg,#03040a 0%,#0c1730 24%,#1d3c80 48%,#264c9e 56%,#0f2042 78%,#03060d 100%);}',
      'html[data-thm-preset="'+PRESET+'"][data-bstal-accent="gold"]{'
        +'--bstal-accent:#d9af52; --bstal-accent2:#e6c578; --bstal-ring:rgba(200,160,80,.55); --bstal-glow:rgba(200,160,80,.46);'
        +'--bstal-grad:linear-gradient(145deg,#120c03 0%,#332507 22%,#6f5318 44%,#9a7a2c 54%,#5a4314 74%,#181004 100%);}',

      /* ── fonts ──────────────────────────────────────────────────────────── */
      P+'body, '+P+'.view, '+P+'.topbar, '+P+'.vnav-btn, '+P+'#bstal-banner{font-family:"Space Grotesk",system-ui,-apple-system,sans-serif}',

      /* ── page backdrop: UNIFORM brushed steel-grey (no dark zone around the
       *    content/products — the fixed banner supplies the black at the top). */
      P+'.view{background:linear-gradient(180deg,#aab0ba 0%,#9aa0ab 220px,#949aa6 100%)!important}',
      /* the POS draws its own colourful banner — hide it; the steel one replaces it. */
      P+'.pos-banner{display:none!important}',

      /* ── SIDEBAR → near-black brushed metal ─────────────────────────────── */
      P+'.topbar{background:linear-gradient(180deg,#141519,#0c0d10)!important;border-right:1px solid #050506!important;box-shadow:6px 0 24px -14px #000}',
      P+'.brand{border-bottom:1px solid #060708!important}',
      P+'.brand-logo{background:#0a0b0d!important;border:1px solid #060708;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
      P+'.brand-name{color:#eef1f4!important}',
      P+'.nav-section-label{color:rgba(255,255,255,.3)!important}',
      P+'.vnav-btn{color:rgba(255,255,255,.62)!important;border-radius:9px}',
      P+'.vnav-btn:hover{background:rgba(255,255,255,.06)!important;color:#fff!important}',
      P+'.vnav-btn.active{background:var(--bstal-grad)!important;color:#fff!important;border:1px solid var(--bstal-ring);box-shadow:0 0 16px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.18)}',
      P+'.vnav-btn.active svg{color:#fff!important;opacity:1}',
      P+'.vnav-btn.active::before{background:var(--bstal-accent2)!important;box-shadow:0 0 8px var(--bstal-accent2);top:35%;bottom:35%;width:6px;border-radius:50%;left:6px}',
      P+'#alert-badge{background:#8a929e!important;color:#0c0d10!important}',

      /* ── scroll model: standard block pages → one deterministic scroller below
       *    the banner. box-sizing:border-box (app default) makes the inner
       *    .main-panel fit exactly beneath the banner with no clipping. */
      ON+'.view.active:not(#view-field):not(#view-counter):not(#view-workshop){height:100vh!important;overflow-y:auto!important;padding-top:118px!important}',
      ON+'.view.active:not(#view-field):not(#view-counter):not(#view-workshop)>.main-panel{height:100%!important;overflow-y:auto!important;max-width:none}',
      /* bespoke FLEX pages (map / kanban / workshop) → keep native flex+scroll,
       * just inset below the banner (border-box shrinks the inner panes to fit). */
      ON+'#view-field.active,'+ON+'#view-counter.active,'+ON+'#view-workshop.active{padding-top:110px!important}',

      /* ── WHITE cards (kept light) with the spec's soft shadow ───────────── */
      P+'.view .tcard,'+P+'.view .card,'+P+'.view [class*="-card"]{background:#fff!important;border:1px solid rgba(20,24,34,.08)!important;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)!important}',
      P+'.view h1{color:#11141c!important}',

      /* ── BUTTONS: only real .btn-style buttons get the metal finish, so tiny
       *    icon/utility <button>s are NOT turned into black blobs. ─────────── */
      P+'.view .btn:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-brand),'
        +P+'.view .btn-outline,'+P+'.view .btn-secondary,'+P+'.view a.btn:not(.btn-primary),'+P+'.view a[download]{'
        +'background:'+METAL_BLACK+'!important;border:1px solid #0a0b0d!important;color:#fff!important;'
        +'box-shadow:inset 0 1px 0 rgba(255,255,255,.1)!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
      P+'.view .btn-primary,'+P+'.view .btn-brand,'+P+'.view [style*="background:var(--brand)"],'+P+'.view [style*="background: var(--brand)"]{'
        +'background:var(--bstal-grad)!important;border:1px solid var(--bstal-ring)!important;color:#fff!important;'
        +'box-shadow:0 0 16px -4px var(--bstal-glow),inset 0 1px 0 rgba(255,255,255,.16)!important;text-shadow:0 1px 1px rgba(0,0,0,.4)}',
      P+'.view .btn:hover,'+P+'.view a[download]:hover{filter:brightness(1.2)}',
      P+'.view .btn:active{filter:brightness(.95);box-shadow:inset 0 2px 5px rgba(0,0,0,.55)!important}',

      /* ── brushed metal tiles (product/service flís) ─────────────────────── */
      P+'.view .pos-tile,'+P+'.view .tile,'+P+'.view .grid-tile{'
        +'background-color:var(--bstal-plate)!important;background-image:var(--bstal-plate-img)!important;'
        +'border:1px solid rgba(20,24,34,.09)!important;box-shadow:0 4px 12px -6px rgba(25,35,60,.12)!important;border-radius:13px}',
      P+'.view .pos-tile:hover,'+P+'.view .tile:hover,'+P+'.view .grid-tile:hover{'
        +'border-color:var(--bstal-ring)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 16px 34px -16px var(--bstal-glow)!important;transform:translateY(-3px)}',

      /* ── inputs: recessed light field ───────────────────────────────────── */
      P+'.view input:not([type=checkbox]):not([type=radio]):not([type=color]),'+P+'.view textarea,'+P+'.view select{'
        +'background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;color:#141822!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)}',

      /* ── STATUS pills: default = readable brushed silver (DARK text, never
       *    white-on-light); status sub-classes = glossy colour + white text. ─ */
      P+'.view .badge,'+P+'.view .pill,'+P+'.view .chip,'+P+'.view .tag{'
        +'background:linear-gradient(180deg,#fdfdfe,#e3e7ee)!important;color:#11141c!important;border:1px solid rgba(20,24,34,.12)!important;'
        +'box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12)!important}',
      P+'.view .badge-success,'+P+'.view .pill-green,'+P+'.view .status-done,'+P+'.view [class*="-tilbuin"],'+P+'.view [class*="-buid"]{background:linear-gradient(150deg,#1f9d57,#0a4a26)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)!important}',
      P+'.view .badge-info,'+P+'.view .pill-blue,'+P+'.view .status-progress,'+P+'.view [class*="-vinnslu"]{background:linear-gradient(150deg,#4f74dc,#16306f)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)!important}',
      P+'.view .badge-warning,'+P+'.view .pill-amber,'+P+'.view .status-pending,'+P+'.view [class*="-bidur"]{background:linear-gradient(150deg,#e0a93e,#9a6a14)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)!important}',
      P+'.view .badge-danger,'+P+'.view .pill-red,'+P+'.view .status-overdue,'+P+'.view [class*="-utrunnin"],'+P+'.view [class*="-haett"]{background:linear-gradient(150deg,#e25555,#a01818)!important;color:#fff!important;border:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)!important}',

      /* ── numbers in Space Mono where the app marks them ─────────────────── */
      P+'.view .kr,'+P+'.view .price,'+P+'.view .amount,'+P+'.view .total,'+P+'.view .mono{font-family:"Space Mono",monospace}',

      /* ═══ THE STEEL BANNER ═══════════════════════════════════════════════ */
      '#bstal-banner{position:fixed;top:0;left:var(--sidebar-w,220px);right:0;height:104px;z-index:40;'
        +'padding:7px;border-radius:0 0 16px 16px;'
        +'background:linear-gradient(180deg,#26282d 0%,#121316 42%,#070708 100%);'
        +'box-shadow:inset 0 2px 0 rgba(255,255,255,.14),inset 0 -4px 8px rgba(0,0,0,.85),0 22px 40px -18px #000;'
        +'display:none}',
      'html[data-bstal-banner="on"] #bstal-banner{display:block}',
      '#bstal-banner .bb-face{position:relative;height:100%;border-radius:11px;overflow:hidden;'
        +'background:linear-gradient(180deg,#0c0d0f,#060607);box-shadow:inset 0 2px 8px rgba(0,0,0,.95),inset 0 -1px 0 rgba(255,255,255,.04);'
        +'display:flex;align-items:center;gap:18px;padding:0 22px}',
      '#bstal-banner .bb-bolt{position:absolute;width:12px;height:12px;border-radius:50%;z-index:6;'
        +'background:radial-gradient(circle at 35% 30%,#9aa1ab,#26282d 70%);box-shadow:inset 0 1px 1px rgba(255,255,255,.6),0 1px 2px #000}',
      '#bstal-banner .bb-flames{position:absolute;left:0;right:0;bottom:-2px;height:78px;z-index:1;pointer-events:none;'
        +'background:url("/img/theme/fire-flames.png") repeat-x bottom left;background-size:auto 100%;'
        +'-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 32%);mask-image:linear-gradient(180deg,transparent 0%,#000 32%)}',
      '#bstal-banner .bb-logo{position:relative;z-index:5;padding:6px 30px 6px 6px;margin-top:-4px}',
      '#bstal-banner .bb-logo::before{content:"";position:absolute;inset:-10px -30px -10px -20px;z-index:-1;'
        +'background:radial-gradient(closest-side at 36% 50%,rgba(0,0,0,.74),transparent 80%)}',
      '#bstal-banner .bb-logo img{display:block;height:44px;width:auto;filter:drop-shadow(0 2px 6px rgba(0,0,0,.7))}',
      '#bstal-banner .bb-word{font-family:"Sora",sans-serif;font-weight:700;font-size:17px;letter-spacing:.14em;color:#fff;'
        +'margin-top:6px;white-space:nowrap;text-shadow:0 2px 6px rgba(0,0,0,.85)}',
      '#bstal-banner .bb-word b{font-weight:500;color:rgba(255,255,255,.7)}',
      /* right cluster: page label · live LED clock · date (the clock back in its place) */
      '#bstal-banner .bb-right{position:relative;z-index:5;margin-left:auto;text-align:right;white-space:nowrap}',
      '#bstal-banner .bb-eyebrow{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.55)}',
      '#bstal-banner .bb-clock{font-family:"Space Mono",monospace;font-size:25px;font-weight:700;color:#fff;line-height:1.1;font-variant-numeric:tabular-nums;text-shadow:0 2px 8px rgba(0,0,0,.7)}',
      '#bstal-banner .bb-date{font-size:11px;color:rgba(255,255,255,.6);margin-top:1px}',
      '#bstal-banner .bb-sw{position:relative;z-index:5;display:flex;gap:6px;margin-left:18px}',
      '#bstal-banner .bb-sw button{width:26px;height:20px;border-radius:6px;cursor:pointer;padding:0;border:2px solid rgba(255,255,255,.18);opacity:.5;transition:opacity .15s,border-color .15s}',
      '#bstal-banner .bb-sw button.on{opacity:1;border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.18)}',
      '#bstal-banner .bb-sw button.red{background:linear-gradient(145deg,#0d0102,#6c0d10 50%,#971515 60%,#100102)}',
      '#bstal-banner .bb-sw button.blue{background:linear-gradient(145deg,#03040a,#1d3c80 52%,#264c9e 60%,#03060d)}',
      '#bstal-banner .bb-sw button.gold{background:linear-gradient(145deg,#0d0802,#5c4413 52%,#82661f 60%,#100b03)}',
      /* ember underglow bleeding below the banner */
      '#bstal-ember{position:fixed;top:104px;left:calc(var(--sidebar-w,220px) + 8%);right:8%;height:60px;z-index:39;pointer-events:none;'
        +'background:radial-gradient(62% 100% at 50% 0%,rgba(255,110,30,.32),rgba(255,80,20,.08) 55%,transparent 76%);filter:blur(13px);display:none}',
      'html[data-bstal-banner="on"] #bstal-ember{display:block}',

      /* mobile: full-width banner, slimmer + smaller insets */
      '@media(max-width:760px){#bstal-banner{left:0;height:84px}#bstal-banner .bb-logo img{height:34px}#bstal-banner .bb-word{font-size:13px}#bstal-banner .bb-clock{font-size:20px}#bstal-ember{left:0;right:0;top:84px}'
        +ON+'.view.active:not(#view-field):not(#view-counter):not(#view-workshop){padding-top:96px!important}'
        +ON+'#view-field.active,'+ON+'#view-counter.active,'+ON+'#view-workshop.active{padding-top:90px!important}}'
    ].join('\n');
    const st = document.createElement('style'); st.id='bstal-css'; st.textContent = css;
    (document.head||document.documentElement).appendChild(st);
  }

  // ── the banner element ──────────────────────────────────────────────────────
  function buildBanner() {
    if (document.getElementById('bstal-banner')) return;
    const acc = localStorage.getItem(ACC_LS) || 'red';
    document.documentElement.setAttribute('data-bstal-accent', acc);
    const b = document.createElement('div');
    b.id = 'bstal-banner';
    b.innerHTML =
      '<div class="bb-bolt" style="top:9px;left:9px"></div><div class="bb-bolt" style="top:9px;right:9px"></div>'+
      '<div class="bb-bolt" style="bottom:9px;left:9px"></div><div class="bb-bolt" style="bottom:9px;right:9px"></div>'+
      '<div class="bb-face">'+
        '<div class="bb-flames"></div>'+
        '<div class="bb-logo">'+
          '<img src="/img/theme/brunaholf-mark.png" alt="Brunahólf">'+
          '<div class="bb-word">SLÖKKVITÆKI <b>EHF.</b></div>'+
        '</div>'+
        '<div class="bb-right">'+
          '<div class="bb-eyebrow" id="bstal-title">Slökkvitæki</div>'+
          '<div class="bb-clock" id="bstal-clock">--:--:--</div>'+
          '<div class="bb-date" id="bstal-date">—</div>'+
        '</div>'+
        '<div class="bb-sw" id="bstal-sw">'+
          '<button class="red'+(acc==='red'?' on':'')+'" data-acc="red" title="Rautt"></button>'+
          '<button class="blue'+(acc==='blue'?' on':'')+'" data-acc="blue" title="Blátt"></button>'+
          '<button class="gold'+(acc==='gold'?' on':'')+'" data-acc="gold" title="Gyllt"></button>'+
        '</div>'+
      '</div>';
    const ember = document.createElement('div'); ember.id = 'bstal-ember';
    document.body.appendChild(b); document.body.appendChild(ember);
    b.querySelector('#bstal-sw').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-acc]'); if (!btn) return;
      document.documentElement.setAttribute('data-bstal-accent', btn.dataset.acc);
      try { localStorage.setItem(ACC_LS, btn.dataset.acc); } catch (_) {}
      b.querySelectorAll('#bstal-sw button').forEach(x => x.classList.toggle('on', x === btn));
    });
  }

  // ── live clock ──────────────────────────────────────────────────────────────
  let clockTimer = null;
  function tickClock() {
    const c = document.getElementById('bstal-clock'); if (!c) return;
    const n = new Date();
    const p = (x) => String(x).padStart(2, '0');
    c.textContent = p(n.getHours())+':'+p(n.getMinutes())+':'+p(n.getSeconds());
    const d = document.getElementById('bstal-date');
    if (d) d.textContent = WK[n.getDay()]+' '+n.getDate()+'. '+MO[n.getMonth()];
  }

  // ── show/hide + live page title ─────────────────────────────────────────────
  let lastTitle = '';
  function refresh() {
    const on = document.documentElement.getAttribute('data-thm-preset') === PRESET;
    if (!on) { document.documentElement.removeAttribute('data-bstal-banner'); lastTitle=''; return; }
    fonts(); styles(); buildBanner();
    document.documentElement.setAttribute('data-bstal-banner', 'on');
    if (!clockTimer) { tickClock(); clockTimer = setInterval(tickClock, 1000); }
    // live page title: nice map → active nav label → brand title
    const active = document.querySelector('.view.active');
    const id = active ? (active.id || '').replace(/^view-/, '') : '';
    let title = VIEW_TITLES[id];
    if (!title) {
      const navSpan = document.querySelector('.vnav-btn.active span');
      title = navSpan && navSpan.textContent ? navSpan.textContent.trim() : '';
      title = title.replace(/^[^\p{L}\p{N}]+/u, '').trim();
    }
    title = title || 'Slökkvitæki';
    if (title === lastTitle) return; lastTitle = title;
    const tEl = document.getElementById('bstal-title'); if (tEl) tEl.textContent = title;
  }

  // ── hooks: theme attr changes + every view switch ───────────────────────────
  try {
    new MutationObserver(refresh).observe(document.documentElement, { attributes:true, attributeFilter:['data-thm-preset'] });
  } catch (_) {}
  (function wrap(){
    if (!window.App || typeof App.switchView !== 'function') { return void setTimeout(wrap, 120); }
    if (App.switchView.__bstal) return;
    const orig = App.switchView.bind(App);
    App.switchView = function(){ const r = orig.apply(this, arguments); try{ refresh(); }catch(_){ } return r; };
    App.switchView.__bstal = true;
  })();
  setInterval(refresh, 700);  // safety net for patch-views that bypass switchView
  if (document.readyState !== 'loading') refresh();
  else document.addEventListener('DOMContentLoaded', refresh);

  console.log('[patch-230] 🔥 Brunastál metallic theme ready (pick it in ⚙️ Útlit)');
})();
/* === END BRUNASTÁL THEME === */
