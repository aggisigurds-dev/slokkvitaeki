/* Geymsla columns - adds SIMI and Geymsla columns, debounced */
(function(){"use strict";
var _cache={}, _lastFetch=0, _pending=false, _debounce=null;

async function loadCache(){
  if(Date.now()-_lastFetch<5000)return _cache;
  if(_pending)return _cache;
  _pending=true;
  try{
    var r=await DB.sb.from("uttaeki").select("serial,phone,shelf").eq("status","i_geymslu");
    if(r.data){
      _cache={};
      r.data.forEach(function(u){if(u.serial)_cache[u.serial]={phone:u.phone,shelf:u.shelf};});
      _lastFetch=Date.now();
    }
  }catch(e){console.warn("[GeymslaCols] load err:",e);}
  _pending=false;
  return _cache;
}

async function decorate(){
  var gv=document.getElementById("view-geymsla");
  if(!gv||gv.style.display==="none")return;
  var table=gv.querySelector("table");
  if(!table||table.dataset._colsAdded==="1")return;
  table.dataset._colsAdded="1";
  var ths=table.querySelectorAll("th");
  if(ths.length<7)return;
  await loadCache();
  // Add SIMI header after col 3 (VIÐSKIPTAVINUR)
  var thSim=document.createElement("th");
  thSim.textContent="Sími";
  thSim.className=ths[3].className;
  thSim.setAttribute("style",ths[3].getAttribute("style")||"");
  ths[3].parentNode.insertBefore(thSim,ths[4]||null);
  // Add Geymsla header after col 6 (STAÐA)
  var thGym=document.createElement("th");
  thGym.textContent="Geymsla";
  thGym.className=ths[6].className;
  thGym.setAttribute("style",ths[6].getAttribute("style")||"");
  ths[6].parentNode.insertBefore(thGym,ths[7]||null);
  // Add data cells to each row
  var trs=table.querySelectorAll("tbody tr");
  trs.forEach(function(tr){
    var cells=tr.querySelectorAll("td");
    if(cells.length<7)return;
    var serial=cells[0]?cells[0].textContent.trim():"";
    var data=_cache[serial]||{};
    var tdSim=document.createElement("td");
    tdSim.textContent=data.phone||"-";
    if(!data.phone)tdSim.style.color="#999";
    cells[3].parentNode.insertBefore(tdSim,cells[4]||null);
    var tdGym=document.createElement("td");
    tdGym.setAttribute("style",cells[6].getAttribute("style")||"");
    if(data.shelf)tdGym.innerHTML='<code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-weight:600;">'+data.shelf+'</code>';
    else{tdGym.textContent="-";tdGym.style.color="#999";}
    cells[6].parentNode.insertBefore(tdGym,cells[7]||null);
  });
}

function scheduleDecorate(){
  clearTimeout(_debounce);
  _debounce=setTimeout(decorate,50);
}

function setupObserver(){
  var gv=document.getElementById("view-geymsla");
  if(!gv)return false;
  new MutationObserver(scheduleDecorate).observe(gv,{childList:true,subtree:true});
  return true;
}

// Wait for view to exist, then setup
var initTimer=setInterval(function(){
  if(setupObserver()){
    clearInterval(initTimer);
    scheduleDecorate();
  }
},500);
window.decorateGeymsla=decorate;
console.log("[GeymslaCols v2] loaded (no shake)");
})();