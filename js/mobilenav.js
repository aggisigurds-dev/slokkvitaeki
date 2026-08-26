/* Mobile nav v6 — phone detection ignores Chrome "desktop site" viewport.
 *
 * v4: state-aware, no per-tick style stomp.
 * v5 (2026-08-25): isMobile() used only innerWidth<=900. Samsung S26 + Chrome
 * "desktop site" reports ~980px, so the hamburger stayed hidden and the full
 * desktop sidebar (white labels on grey) was squeezed onto the phone. Now:
 * real phone (screen short side) OR data-viewmode=mobile OR innerWidth<=900.
 * v6 (2026-08-25): v5 hid the sidebar but left `.view { width: calc(100vw -
 * var(--sidebar-w)) }` — a 220px white gutter on the right ("Not the right
 * wide"). Phone-nav now forces full-width content + --sidebar-w:0.
 *
 * v3 wrote the entire inline-style sheet onto `.topbar` every 1500 ms via
 * setInterval. Mid-animation that re-applied the transform + transition
 * on top of the running animation, causing the sidebar to slide in
 * "chaotically" — the user noticed jumpy, jittery motion when opening.
 *
 * v4 keeps the "every-1500ms defense against external code stomping our
 * styles" intent, but the apply functions are now idempotent: they compare
 * the desired state against a cached key + a peek at the actual DOM, and
 * only write when something has actually drifted. During steady state
 * (sidebar open OR closed, no resize) the interval becomes a free no-op
 * and the CSS transition runs cleanly. */
(function(){'use strict';
function isPhoneDevice(){
  try {
    if (typeof window.SlokkIsPhoneDevice === 'function') return window.SlokkIsPhoneDevice();
    var short = Math.min(screen.width||0, screen.height||0);
    if (short > 0 && short <= 500) return true;
    if ((navigator.maxTouchPoints||0) > 1 && short > 0 && short <= 700) return true;
  } catch (e) {}
  return false;
}
// Hamburger on: real phones (even Chrome "desktop site" with innerWidth~980),
// Sími view-mode, or a genuinely narrow viewport. Do NOT use innerWidth alone
// — that was why the S26 showed the full desktop sidebar (white labels on grey).
function isMobile(){
  try {
    if (document.documentElement.getAttribute('data-viewmode') === 'mobile') return true;
  } catch (e) {}
  if (isPhoneDevice()) return true;
  return window.innerWidth<=900;
}

// ── Hamburger button ────────────────────────────────────────────────────
let _btnKey = '';
function ensureBtn(){
  var btn=document.getElementById('_mnav_btn');
  if(!btn){
    btn=document.createElement('button');
    btn.id='_mnav_btn';
    btn.type='button';
    btn.setAttribute('aria-label','Valmynd');
    btn.innerHTML='☰';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(document.body.classList.contains('mobile-nav-open'))closeNav();
      else openNav();
    },false);
    document.body.appendChild(btn);
    _btnKey = ''; // force first paint
  }
  var show=isMobile();
  var open=document.body.classList.contains('mobile-nav-open');
  var key = (show?'M':'D')+'_'+(open?'O':'C');
  // Skip if the previously-applied state matches AND our cssText is still on
  // the element (defends against an outside actor wiping our styles).
  if (_btnKey === key && /position:fixed/.test(btn.style.cssText)) return btn;
  btn.style.cssText='display:'+(show?'flex':'none')+';position:fixed;top:10px;left:'+(open?'270px':'10px')+';width:44px;height:44px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;z-index:9999;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.15);font-size:22px;padding:0;line-height:1;color:#111;transition:left .2s;';
  _btnKey = key;
  return btn;
}

// ── Backdrop ────────────────────────────────────────────────────────────
function ensureBackdrop(){
  var bd=document.getElementById('_mnav_bd');
  if(!bd){
    bd=document.createElement('div');
    bd.id='_mnav_bd';
    bd.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:8998;display:none;-webkit-tap-highlight-color:transparent;';
    bd.addEventListener('click',closeNav,false);
    document.body.appendChild(bd);
  }
  return bd;
}

// ── Topbar / sidebar styles ─────────────────────────────────────────────
let _topbarKey = '';
const MOBILE_STYLE_PROPS = ['position','top','left','bottom','height','width','z-index','overflow-y','transform','transition','box-shadow'];
function applyTopbarStyles(){
  var tb=document.querySelector('.topbar');
  if(!tb)return;
  var mobile = isMobile();

  try {
    document.documentElement.classList.toggle('slokk-phone-nav', mobile);
  } catch (e) {}

  if (!mobile) {
    // Desktop — only reset once when transitioning from mobile.
    if (_topbarKey !== 'D') {
      MOBILE_STYLE_PROPS.forEach(function(p){ tb.style.removeProperty(p); });
      document.querySelectorAll('.view').forEach(function(v){
        v.style.removeProperty('margin-left');
        v.style.removeProperty('padding-top');
        v.style.removeProperty('width');
        v.style.removeProperty('max-width');
      });
      _topbarKey = 'D';
    }
    return;
  }

  var open = document.body.classList.contains('mobile-nav-open');
  var wantKey = open ? 'M_O' : 'M_C';
  // Defense: if some other patch stripped our width property, re-apply.
  var stillApplied = tb.style.getPropertyValue('width') === '260px';
  if (_topbarKey === wantKey && stillApplied) return;

  // (Re)apply. Setting !important on the transform while a CSS transition
  // is already running with the same target value is a no-op — but we only
  // get here when the cached state changed, so we don't fight the
  // animation 1500 times per minute anymore.
  tb.style.setProperty('position','fixed','important');
  tb.style.setProperty('top','0','important');
  tb.style.setProperty('left','0','important');
  tb.style.setProperty('bottom','0','important');
  tb.style.setProperty('height','100vh','important');
  tb.style.setProperty('width','260px','important');
  tb.style.setProperty('z-index','9000','important');
  tb.style.setProperty('overflow-y','auto','important');
  tb.style.setProperty('transform', open ? 'translateX(0)' : 'translateX(-100%)','important');
  tb.style.setProperty('transition','transform .25s ease','important');
  tb.style.setProperty('box-shadow','2px 0 24px rgba(0,0,0,.25)','important');
  document.querySelectorAll('.view').forEach(function(v){
    v.style.setProperty('margin-left','0','important');
    v.style.setProperty('width','100%','important');
    v.style.setProperty('max-width','100%','important');
    // 86px = slim Sími banner (66px at top:8 → bottom 74) + 12px air.
    // 60px sat under the hamburger only and tucked content under the banner
    // (Afgreiðsla overlap on 390px). Inline !important; 314 re-asserts it.
    v.style.setProperty('padding-top','86px','important');
  });
  _topbarKey = wantKey;
}

// ── Open / close ────────────────────────────────────────────────────────
function openNav(){
  document.body.classList.add('mobile-nav-open');
  document.body.style.overflow='hidden';
  ensureBackdrop().style.display='block';
  var b = ensureBtn();
  b.innerHTML='✕';
  applyTopbarStyles();
}
function closeNav(){
  document.body.classList.remove('mobile-nav-open');
  document.body.style.overflow='';
  ensureBackdrop().style.display='none';
  var b = ensureBtn();
  b.innerHTML='☰';
  applyTopbarStyles();
}

// Auto-close when nav-item tapped
document.addEventListener('click',function(e){
  if(!isMobile())return;
  if(!document.body.classList.contains('mobile-nav-open'))return;
  var navBtn=e.target && e.target.closest && e.target.closest('.vnav-btn');
  if(navBtn)setTimeout(closeNav,150);
},false);

document.addEventListener('keydown',function(e){
  if(e.key==='Escape' && document.body.classList.contains('mobile-nav-open'))closeNav();
});

window.addEventListener('resize',function(){
  if(!isMobile() && document.body.classList.contains('mobile-nav-open'))closeNav();
  applyTopbarStyles();
  ensureBtn();
});
document.addEventListener('slokk-viewmode', function(){
  _btnKey = '';
  _topbarKey = '';
  applyTopbarStyles();
  ensureBtn();
});

function init(){
  ensureBackdrop();
  ensureBtn();
  applyTopbarStyles();
}
init();
// Keep the periodic defense for cases where another patch nukes our inline
// styles — but the apply functions are now idempotent so this is free
// 99% of the time. Crucially, the interval no longer re-stomps the active
// CSS transition during the sidebar slide-in.
setInterval(init, 3000);

console.log('[MobileNav v6] loaded — full-width phone nav, isMobile='+isMobile()+' innerWidth='+window.innerWidth);
})();
