/* Demo products auto-seed - runs once when vorur table is empty */
(function(){'use strict';
function svgToDataUrl(svg){return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));}
function makeIcon(emoji,bg){var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="'+bg+'"/><text x="100" y="130" font-size="110" text-anchor="middle">'+emoji+'</text></svg>';return svgToDataUrl(s);}
function showToast(msg,kind){var t=document.createElement('div');var bg=kind==='ok'?'#10b981':'#374151';t.style.cssText='position:fixed;top:70px;left:50%;transform:translateX(-50%);background:'+bg+';color:#fff;padding:14px 22px;border-radius:10px;z-index:99999;font-weight:600;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.3);';t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.style.transition='opacity .4s';t.style.opacity='0';setTimeout(function(){t.remove();},500);},3500);}
async function seedIfEmpty(){
  if(!window.DB || !DB.sb){setTimeout(seedIfEmpty,500);return;}
  // Only seed once per browser
  if(localStorage.getItem('_vrSeeded'))return;
  var r = await DB.sb.from('vorur').select('id',{count:'exact',head:true});
  if(r.error){console.warn('[DemoSeed] table check failed:',r.error.message);localStorage.setItem('_vrSeeded','table-missing');return;}
  if(r.count && r.count>0){localStorage.setItem('_vrSeeded','already-has-data');return;}
  // Empty - seed!
  var products = [
    {nafn:'Slökkvitæki 6kg ABC Duft',lysing:'Fjölnota duftslökkvitæki – hentar fyrir flesta eldsvoða (A, B, C flokkar)',verd_an_vsk:14900,birgdir:12,mynd:makeIcon('🧯','#dc2626'),virkt:true,vsk_prosenta:24,flokkur:'Slökkvitæki'},
    {nafn:'Slökkvitæki 2kg CO₂',lysing:'Koltvísýringsslökkvitæki – hentugt fyrir rafmagn og rafeindatæki',verd_an_vsk:18500,birgdir:8,mynd:makeIcon('🧯','#1e40af'),virkt:true,vsk_prosenta:24,flokkur:'Slökkvitæki'},
    {nafn:'Reykskynjari',lysing:'10 ára rafhlaða, ljósmyndatækni, CE vottað',verd_an_vsk:4990,birgdir:25,mynd:makeIcon('🚨','#f59e0b'),virkt:true,vsk_prosenta:24,flokkur:'Viðvörunarkerfi'},
    {nafn:'Eldvarnateppi 1,2m x 1,2m',lysing:'Glertrefjateppi í vegghengdu hylki, fyrir eldhús eða bílskúr',verd_an_vsk:3490,birgdir:18,mynd:makeIcon('🔥','#ea580c'),virkt:true,vsk_prosenta:24,flokkur:'Eldvarnir'},
    {nafn:'Veggfesting fyrir slökkvitæki',lysing:'Stálfesting fyrir 6kg slökkvitæki, með skrúfum',verd_an_vsk:1290,birgdir:40,mynd:makeIcon('🔧','#6b7280'),virkt:true,vsk_prosenta:24,flokkur:'Fylgihlutir'}
  ];
  var ins = await DB.sb.from('vorur').insert(products).select();
  if(ins.error){console.warn('[DemoSeed] insert failed:',ins.error.message);return;}
  localStorage.setItem('_vrSeeded','seeded-'+Date.now());
  console.log('[DemoSeed] seeded '+(ins.data||[]).length+' demo products');
  showToast('✓ '+products.length+' sýnishornsvörur vistaðar','ok');
}
setTimeout(seedIfEmpty,2000);
})();