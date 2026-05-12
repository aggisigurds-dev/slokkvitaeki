/* Companies list view — alphabetical row list with search + sort */
(function(){'use strict';
var _cache=null,_cacheTime=0,_pending=false;
var _state={search:'', sortBy:'name', sortDir:'asc'};
async function loadData(){
  if(_cache && Date.now()-_cacheTime<5000) return _cache;
  _cacheTime=Date.now();
  var r=await DB.sb.from('uttaeki').select('client,type,next_insp,status').neq('status','urelt');
  var byClient={};
  if(r&&r.data){
    r.data.forEach(function(u){
      if(!u.client)return;
      if(!byClient[u.client]) byClient[u.client]={ext:0,hose:0,smoke:0,other:0,nextInsp:null};
      var s=byClient[u.client];
      var t=String(u.type||'').toLowerCase();
      if(t.indexOf('slöngu')>=0||t.indexOf('hose')>=0) s.hose++;
      else if(t.indexOf('reyk')>=0||t.indexOf('smoke')>=0) s.smoke++;
      else if(t==='óþekkt'||t==='abc duft'||t==='vatn'||t==='co2'||t==='froðu'||t.indexOf('slökkvi')>=0) s.ext++;
      else s.other++;
      if(u.next_insp && (!s.nextInsp || u.next_insp<s.nextInsp)) s.nextInsp=u.next_insp;
    });
  }
  _cache=byClient;
  return byClient;
}
function fmtDate(d){if(!d)return '—';var dt=new Date(d);return dt.toLocaleDateString('is-IS');}
function daysUntil(d){if(!d)return null;var n=new Date();n.setHours(0,0,0,0);var t=new Date(d);t.setHours(0,0,0,0);return Math.round((t-n)/86400000);}
function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function getSortVal(row,key){var d=row.data;if(key==='name')return row.name.toLowerCase();if(key==='ext')return d.ext;if(key==='hose')return d.hose;if(key==='smoke')return d.smoke;if(key==='total')return d.ext+d.hose+d.smoke+d.other;if(key==='next')return d.nextInsp||'9999-12-31';return row.name.toLowerCase();}
function applySort(rows){var dir=_state.sortDir==='asc'?1:-1;rows.sort(function(a,b){var av=getSortVal(a,_state.sortBy),bv=getSortVal(b,_state.sortBy);if(av<bv)return -1*dir;if(av>bv)return 1*dir;return a.name.localeCompare(b.name,'is');});return rows;}
function applySearch(rows){if(!_state.search)return rows;var q=_state.search.toLowerCase();return rows.filter(function(r){return r.name.toLowerCase().indexOf(q)>=0;});}
/* 2026-05-08: Cache the parsed rows so search keystrokes don't re-walk
   the DOM (`grid.querySelectorAll('.company-card')` + per-card
   querySelector for the name). Was 30-60ms per keystroke at 56 cards;
   would be 200-400ms at 456. Invalidated when grid changes via
   refreshCompaniesList. */
var _allRowsCache=null;
function getCardName(card){var nameEl=card.querySelector('h2,h3,h4,strong,[class*="name"]');return nameEl?nameEl.textContent.trim():card.textContent.trim().split('\n')[0];}
function buildAllRows(){if(_allRowsCache)return _allRowsCache;var v=document.getElementById('view-companies');var grid=v.querySelector('.company-grid');if(!grid)return [];var cards=grid.querySelectorAll('.company-card');var rows=[];Array.prototype.forEach.call(cards,function(card){var name=getCardName(card);var d=_cache && _cache[name] || {ext:0,hose:0,smoke:0,other:0,nextInsp:null};rows.push({name:name,data:d});});_allRowsCache=rows;return rows;}
/* 2026-05-09: Find the live company-card matching `name` at click time
   instead of caching a card reference at decorate time. Was a stale-DOM
   bug: when Companies.render() re-ran (every realtime DB event, debounced
   3s), the cards in the cached `row.card` references became detached and
   row clicks dispatched .click() on detached buttons that did nothing. */
function findLiveCard(name){var v=document.getElementById('view-companies');if(!v)return null;var cards=v.querySelectorAll('.company-card');for(var i=0;i<cards.length;i++){if(getCardName(cards[i])===name)return cards[i];}return null;}
function renderTbody(){var v=document.getElementById('view-companies');var tbody=v.querySelector('._cl_table tbody');var sub=v.querySelector('._cl_subtitle');if(!tbody)return;var rows=buildAllRows();var visible=applySort(applySearch(rows));tbody.innerHTML='';if(sub)sub.textContent='Listi · '+visible.length+' / '+rows.length+' fyrirtæki';
  visible.forEach(function(row){var d=row.data;var total=d.ext+d.hose+d.smoke+d.other;var dl=daysUntil(d.nextInsp);var dueColor=dl===null?'#9ca3af':dl<0?'#dc2626':dl<30?'#f59e0b':'#10b981';var dueText=dl===null?'—':dl<0?(Math.abs(dl)+' dögum framyfir'):(dl+' dögum');var tr=document.createElement('tr');tr.style.cssText='border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background .1s;';tr.onmouseover=function(){this.style.background='#f9fafb';};tr.onmouseout=function(){this.style.background='';};tr.innerHTML='<td style="padding:12px 14px;font-weight:600;color:#111;">'+escHtml(row.name)+'</td><td style="padding:12px 10px;text-align:center;font-weight:600;color:'+(d.ext>0?'#dc2626':'#cbd5e1')+';">'+d.ext+'</td><td style="padding:12px 10px;text-align:center;font-weight:600;color:'+(d.hose>0?'#0ea5e9':'#cbd5e1')+';">'+d.hose+'</td><td style="padding:12px 10px;text-align:center;font-weight:600;color:'+(d.smoke>0?'#f59e0b':'#cbd5e1')+';">'+d.smoke+'</td><td style="padding:12px 10px;text-align:center;font-weight:700;color:#111;">'+total+'</td><td style="padding:12px 14px;"><div style="font-weight:600;color:#111;">'+fmtDate(d.nextInsp)+'</div><div style="font-size:11px;color:'+dueColor+';font-weight:600;">'+dueText+'</div></td><td style="padding:12px 14px;text-align:right;color:#9ca3af;font-size:14px;">›</td>';tr.onclick=function(){
  // 2026-05-11: Skip the brittle "find hidden card → find button → click"
  // dance. Resolve the company id directly from Companies.list by name and
  // call openDetail() ourselves. The old flow silently no-op'd when cards
  // were detached (after realtime sync), forcing the user to refresh.
  if (window.Companies && Companies.list && typeof Companies.openDetail === 'function') {
    var co = Companies.list.find(function(c){return c.nafn === row.name;});
    if (co) { try { Companies.openDetail(co.id); return; } catch(_){} }
  }
  // Fall back to the legacy card-click path if the direct call fails.
  var card=findLiveCard(row.name);
  if(!card){if(window.refreshCompaniesList)window.refreshCompaniesList();return;}
  var btns=card.querySelectorAll('button,a');
  for(var i=0;i<btns.length;i++){if(/Skoða|view/i.test(btns[i].textContent)){btns[i].click();return;}}
  if(btns[0])btns[0].click();
};tbody.appendChild(tr);});}
function setSort(key){if(_state.sortBy===key){_state.sortDir=_state.sortDir==='asc'?'desc':'asc';}else{_state.sortBy=key;_state.sortDir=key==='name'?'asc':'desc';}updateSortIndicators();renderTbody();}
function updateSortIndicators(){var v=document.getElementById('view-companies');if(!v)return;var ths=v.querySelectorAll('._cl_table th[data-sort]');Array.prototype.forEach.call(ths,function(th){var k=th.dataset.sort;var arrow=th.querySelector('._cl_arrow');if(!arrow)return;if(_state.sortBy===k){arrow.textContent=_state.sortDir==='asc'?' ▲':' ▼';arrow.style.color='#2563eb';th.style.color='#2563eb';}else{arrow.textContent=' ⇅';arrow.style.color='#cbd5e1';th.style.color='#6b7280';}});}
async function decorate(){if(_pending)return;_pending=true;try{var v=document.getElementById('view-companies');if(!v)return;var grid=v.querySelector('.company-grid');if(!grid)return;if(grid.dataset._listShown==='1')return;await loadData();grid.style.display='none';var existing=v.querySelector('._cl_wrap');if(existing)existing.remove();var wrap=document.createElement('div');wrap.className='_cl_wrap';
  var toolbar='<div style="display:flex;gap:10px;margin-bottom:10px;align-items:center;flex-wrap:wrap;"><input id="_cl_search" placeholder="🔎 Leita að fyrirtæki..." style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;background:#fff;"><button id="_cl_clear" style="background:#f3f4f6;border:none;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;color:#374151;">Hreinsa</button></div>';
  var sub='<div class="_cl_subtitle" style="font-size:12px;color:#6b7280;margin:0 0 8px 0;"></div>';
  var thStyle='cursor:pointer;text-align:center;padding:12px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.3px;user-select:none;';
  var thLeftStyle='cursor:pointer;text-align:left;padding:12px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:.5px;user-select:none;';
  var table='<table class="_cl_table" style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);"><thead><tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;"><th data-sort="name" style="'+thLeftStyle+'">Fyrirtæki<span class="_cl_arrow"></span></th><th data-sort="ext" style="'+thStyle+'" title="Slökkvitæki">🧯 Slökkvi<span class="_cl_arrow"></span></th><th data-sort="hose" style="'+thStyle+'" title="Slönguskápar">🚒 Slöngur<span class="_cl_arrow"></span></th><th data-sort="smoke" style="'+thStyle+'" title="Reykskynjarar">🚨 Reyk<span class="_cl_arrow"></span></th><th data-sort="total" style="'+thStyle+'">Samtals<span class="_cl_arrow"></span></th><th data-sort="next" style="'+thLeftStyle+'">Næsta skoðun<span class="_cl_arrow"></span></th><th style="text-align:right;padding:12px 14px;"></th></tr></thead><tbody></tbody></table>';
  wrap.innerHTML=toolbar+sub+table;if(!grid.parentNode){return;}grid.parentNode.insertBefore(wrap,grid);grid.dataset._listShown='1';
  document.getElementById('_cl_search').addEventListener('input',function(e){_state.search=e.target.value;renderTbody();});
  document.getElementById('_cl_clear').onclick=function(){var i=document.getElementById('_cl_search');i.value='';_state.search='';renderTbody();i.focus();};
  var ths=wrap.querySelectorAll('th[data-sort]');Array.prototype.forEach.call(ths,function(th){th.onclick=function(){setSort(th.dataset.sort);};});
  updateSortIndicators();renderTbody();}finally{_pending=false;}}
function setupObserver(){var v=document.getElementById('view-companies');if(!v){setTimeout(setupObserver,500);return;}var mo=new MutationObserver(function(muts){var hasGrid=muts.some(function(m){for(var i=0;i<m.addedNodes.length;i++){var n=m.addedNodes[i];if(n.nodeType===1 && (String(n.className||'').indexOf('company-grid')>=0 || (n.querySelector && n.querySelector('.company-grid'))))return true;}return false;});if(hasGrid)setTimeout(decorate,80);});mo.observe(v,{childList:true,subtree:true});setTimeout(decorate,200);}
/* 2026-05-08: Removed setInterval(1500ms) safety net — patch
   99-companies-list-fix.js has its own 5s interval that does the same
   `tryForceRedecorate` work. Two intervals running simultaneously was
   doubling the polling cost on Companies view. */
setupObserver();
window.refreshCompaniesList=function(){_cache=null;_allRowsCache=null;var v=document.getElementById('view-companies');var g=v&&v.querySelector('.company-grid');if(g){g.dataset._listShown='';g.style.display='';var w=v.querySelector('._cl_wrap');if(w)w.remove();}decorate();};
console.log('[CompaniesList] v2 loaded with search+sort');
})();