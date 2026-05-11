/* === EMAIL OG ATHUGASEMDA-SNIÐMÁT / TEMPLATES v1 === */
/* Stores templates in localStorage. Two kinds:
 *   - 'email': subject + body
 *   - 'note': just text (snippets for verkdagbok / contact_log)
 */
(() => {
  if (window.__templatesInstalled) return;
  window.__templatesInstalled = true;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  // Default templates seeded if none exist
  const DEFAULTS = [
    { id:'def1', kind:'email', name:'Áminning um ógreitt', subject:'Áminning — reikningur frá Slökkvitæki ehf', body:'Sæll/sæl,\n\nVið viljum minna á reikning sem virðist enn ógreiddur. Vinsamlegast farið yfir og greiðið eða hafið samband ef einhver vandamál.\n\nBestu kveðjur,\nSlökkvitæki ehf' },
    { id:'def2', kind:'email', name:'Tilboðs-eftirfylgni', subject:'Höfum við átt samband?', body:'Sæll/sæl,\n\nVið sendum þér tilboð fyrir nokkru og vildum bara fylgja eftir til að athuga hvort þú hefur einhverjar spurningar.\n\nMeð kveðju,\nSlökkvitæki ehf' },
    { id:'def3', kind:'email', name:'Þjónustudagur staðfestur', subject:'Staðfesting á þjónustu', body:'Sæll/sæl,\n\nÞetta er staðfesting á þjónustudegi. Tæknimaður okkar mun mæta á tilskildum tíma.\n\nKveðja,\nSlökkvitæki ehf' },
    { id:'def4', kind:'note', name:'Tækin í lagi', body:'Tækin í lagi, næsta skoðun eftir ár.' },
    { id:'def5', kind:'note', name:'Þrýstingur lágur', body:'Þrýstingur lágur — endurfylling þarf.' },
    { id:'def6', kind:'note', name:'Sigli rofnað', body:'Sigli rofnað — þarf nýtt sigli og skráningu.' },
    { id:'def7', kind:'note', name:'Geymsluvandamál', body:'Tækið ekki á réttum stað — fært í rétta hilluna.' }
  ];

  function getAll(){
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem('templates')||'[]'); } catch(e){}
    return stored.length ? stored : DEFAULTS;
  }
  function saveAll(list){ localStorage.setItem('templates', JSON.stringify(list)); }

  function pick(kind, onPick){
    const list = getAll().filter(t => t.kind === kind);
    const m = document.createElement('div');
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:520px;width:100%;max-height:80vh;overflow:auto">
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
          <strong>${kind==='email'?'📧 Velja email-sniðmát':'📝 Velja athugasemda-sniðmát'}</strong>
          <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;font-size:18px;cursor:pointer">✕</button>
        </div>
        <div style="padding:8px">
          ${list.map(t => `
            <div style="padding:12px;border-radius:8px;cursor:pointer;border:1px solid #e2e8f0;margin-bottom:6px" data-tid="${t.id}">
              <div style="font-weight:600;font-size:13px">${esc(t.name)}</div>
              ${t.subject?`<div style="font-size:12px;color:#64748b;margin-top:2px">${esc(t.subject)}</div>`:''}
              <div style="font-size:12px;color:#475569;margin-top:4px;white-space:pre-wrap">${esc((t.body||'').slice(0,120))}${(t.body||'').length>120?'...':''}</div>
            </div>`).join('')}
        </div>
        <div style="padding:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between">
          <button class="btn btn-outline" onclick="Templates._manage('${kind}')">⚙️ Sjá öll / búa til</button>
          <button class="btn btn-outline" onclick="this.closest('div[style*=fixed]').remove()">Loka</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.querySelectorAll('[data-tid]').forEach(el => el.onclick = () => {
      const t = list.find(x => x.id === el.dataset.tid);
      m.remove();
      if (t && onPick) onPick(t);
    });
  }

  function _manage(kind){
    document.querySelector('div[style*=fixed]')?.remove();
    const list = getAll();
    const m = document.createElement('div');
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:680px;width:100%;max-height:88vh;overflow:auto">
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
          <strong>📝 Sniðmát</strong>
          <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;font-size:18px;cursor:pointer">✕</button>
        </div>
        <div style="padding:14px">
          ${list.map(t => `
            <div style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="font-size:13px">${t.kind==='email'?'📧':'📝'} ${esc(t.name)}</strong>
                <button onclick="Templates._del('${t.id}')" style="background:none;border:none;color:#dc2626;cursor:pointer">🗑</button>
              </div>
              ${t.subject?`<div style="font-size:11px;color:#64748b;margin-top:4px">Subject: ${esc(t.subject)}</div>`:''}
              <div style="font-size:11px;color:#475569;margin-top:4px;white-space:pre-wrap;font-family:monospace">${esc((t.body||'').slice(0,200))}</div>
            </div>`).join('')}
          <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="Templates._add()">+ Nýtt sniðmát</button>
        </div>
      </div>`;
    document.body.appendChild(m);
  }

  function _add(){
    const kind = prompt('Tegund? "email" eða "note":', 'note');
    if (!kind || !['email','note'].includes(kind)) return;
    const name = prompt('Nafn:'); if (!name) return;
    const subject = kind==='email' ? (prompt('Subject:')||'') : '';
    const body = prompt('Texti / body:'); if (!body) return;
    const list = getAll();
    list.push({ id:'usr'+Date.now(), kind, name, subject, body });
    saveAll(list);
    _manage(kind);
  }

  async function _del(id){
    if (!await Confirm.show('Eyða sniðmáti?')) return;
    const list = getAll().filter(t => t.id !== id);
    saveAll(list);
    _manage();
  }

  // Inject 📝 button into textareas (for note templates)
  const obs = new MutationObserver(() => {
    document.querySelectorAll('textarea:not([data-tpl-injected])').forEach(t => {
      if (t.id === 'sm-content' || t.closest('.sm-modal')) return; // skip settings
      t.dataset.tplInjected = '1';
      const wrap = t.parentElement;
      if (!wrap) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = 'Velja sniðmát';
      btn.innerHTML = '📝';
      btn.style.cssText = 'position:absolute;right:4px;top:4px;background:rgba(255,255,255,.95);border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:12px;z-index:5';
      btn.onclick = e => { e.preventDefault(); e.stopPropagation();
        pick('note', tpl => { t.value = (t.value ? t.value + '\n' : '') + tpl.body; t.dispatchEvent(new Event('input', { bubbles:true })); });
      };
      if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      wrap.appendChild(btn);
    });
  });
  obs.observe(document.body, { childList:true, subtree:true });

  window.Templates = { pick, getAll, saveAll, _manage, _add, _del };
  console.log('[templates] installed');
})();
