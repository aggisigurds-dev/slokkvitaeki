// VidbotaUpp: "Viðbóta upplýsingar" textbox below the floor plan on company detail page
(function(){
  'use strict';
  var STORAGE_PREFIX = '_slokk_vbu_';
  var currentCoId = null;
  var saveTimer = null;

  function hookCompanies(){
    if(!window.Companies || !window.Companies.openDetail) return false;
    var orig = window.Companies.openDetail;
    if(orig._vbuHooked) return true;
    window.Companies.openDetail = function(id){
      currentCoId = id;
      return orig.apply(this, arguments);
    };
    window.Companies.openDetail._vbuHooked = true;
    return true;
  }

  function readLocal(coId){
    try { return localStorage.getItem(STORAGE_PREFIX + coId) || ''; } catch(e){ return ''; }
  }
  function writeLocal(coId, val){
    try { localStorage.setItem(STORAGE_PREFIX + coId, val); } catch(e){}
  }

  async function loadValue(coId){
    // Start with local copy (instant)
    var local = readLocal(coId);
    // Try Supabase in background - if column exists, prefer its value
    try {
      var r = await DB.sb.from('fyrirtaeki').select('vidbota_upplysingar').eq('id', coId).single();
      if(!r.error && r.data && r.data.vidbota_upplysingar !== null && r.data.vidbota_upplysingar !== undefined){
        // Supabase value takes priority (multi-device sync)
        var supaVal = r.data.vidbota_upplysingar || '';
        if(supaVal !== local){
          writeLocal(coId, supaVal);
          var ta = document.querySelector('.vbu-textarea[data-co-id="' + coId + '"]');
          if(ta && ta === document.activeElement) return; // user is typing, don't overwrite
          if(ta) ta.value = supaVal;
        }
      }
    } catch(e){ /* column doesn't exist - localStorage only */ }
    return local;
  }

  async function saveValue(coId, val){
    writeLocal(coId, val);
    // Try Supabase sync in background
    try {
      var r = await DB.sb.from('fyrirtaeki').update({ vidbota_upplysingar: val }).eq('id', coId);
      // Silent fail if column doesn't exist
      return !r.error;
    } catch(e){ return false; }
  }

  function injectSection(coId){
    // Find the co-fp-section (floor plan section) to anchor below
    var fpSection = document.getElementById('co-fp-section');
    if(!fpSection) return false;
    // Skip if already injected
    if(document.getElementById('vbu-section')) return true;

    var section = document.createElement('div');
    section.id = 'vbu-section';
    section.setAttribute('data-co-id', String(coId));
    section.style.cssText = 'margin:16px 0;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;font-family:system-ui,sans-serif';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center';
    var titleText = document.createElement('span');
    titleText.textContent = 'Viðbóta upplýsingar';
    var statusText = document.createElement('span');
    statusText.className = 'vbu-status';
    statusText.style.cssText = 'font-weight:500;color:#94a3b8;text-transform:none;letter-spacing:normal;font-size:11px';
    statusText.textContent = '';
    title.appendChild(titleText);
    title.appendChild(statusText);

    var ta = document.createElement('textarea');
    ta.className = 'vbu-textarea';
    ta.setAttribute('data-co-id', String(coId));
    ta.placeholder = 'Skrifaðu upplýsingar hér...';
    ta.style.cssText = 'width:100%;min-height:100px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-size:14px;line-height:1.5;resize:vertical;box-sizing:border-box;background:#f8fafc';
    ta.value = readLocal(coId); // instant load

    var debounceMs = 600;
    function scheduleSave(){
      if(saveTimer) clearTimeout(saveTimer);
      statusText.textContent = '…';
      statusText.style.color = '#94a3b8';
      saveTimer = setTimeout(function(){
        saveValue(coId, ta.value).then(function(ok){
          statusText.textContent = ok ? '✓ vistað' : '✓ vistað á þessu tæki';
          statusText.style.color = '#16a34a';
          setTimeout(function(){ if(statusText.textContent.indexOf('vistað')>=0) statusText.textContent=''; }, 1800);
        });
      }, debounceMs);
    }
    ta.addEventListener('input', scheduleSave);
    ta.addEventListener('blur', function(){
      // Save immediately on blur
      if(saveTimer){ clearTimeout(saveTimer); saveTimer = null; }
      saveValue(coId, ta.value).then(function(ok){
        statusText.textContent = ok ? '✓ vistað' : '✓ vistað á þessu tæki';
        statusText.style.color = '#16a34a';
        setTimeout(function(){ if(statusText.textContent.indexOf('vistað')>=0) statusText.textContent=''; }, 1500);
      });
    });

    section.appendChild(title);
    section.appendChild(ta);

    // Insert AFTER the floor plan section
    fpSection.parentNode.insertBefore(section, fpSection.nextSibling);

    // Refresh value from Supabase if available
    loadValue(coId);
    return true;
  }

  function watch(){
    setInterval(function(){
      var view = document.getElementById('view-companies');
      if(!view || !view.classList.contains('active')) return;
      if(!currentCoId) return;
      var existing = document.getElementById('vbu-section');
      if(existing && existing.getAttribute('data-co-id') === String(currentCoId)) return;
      // Remove stale section from previous company
      if(existing) existing.parentNode.removeChild(existing);
      injectSection(currentCoId);
    }, 600);
  }

  function init(){
    var hookIv = setInterval(function(){
      if(hookCompanies()) clearInterval(hookIv);
    }, 200);
    watch();
    console.log('[VidbotaUpp v1] Ready');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();