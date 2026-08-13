/* === VÖRUMYNDIR / PRODUCT IMAGES v1 === */
/* Adds image_url + description to products, displayed in product picker.
 * Images stored in Supabase Storage 'vorur' bucket.
 *
 * SQL:
 *   ALTER TABLE vorur ADD COLUMN IF NOT EXISTS image_url TEXT;
 *   ALTER TABLE vorur ADD COLUMN IF NOT EXISTS description TEXT;
 *   INSERT INTO storage.buckets (id, name, public) VALUES ('vorur','vorur',true) ON CONFLICT DO NOTHING;
 *   (storage policies - similar to verkdagbok bucket)
 *
 * MutationObserver watches for product list rows (.product-row[data-vara-id])
 * and injects thumbnail + edit button.
 */
(() => {
  if (window.__productImagesInstalled) return;
  window.__productImagesInstalled = true;

  const BUCKET = 'vorur';

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  if (!document.getElementById('pi-style')) {
    const s = document.createElement('style');
    s.id='pi-style';
    s.textContent = `
      .pi-thumb { width:36px; height:36px; border-radius:6px; object-fit:cover; background:#f1f5f9; display:inline-block; vertical-align:middle; }
      .pi-thumb-empty { width:36px; height:36px; border-radius:6px; background:#f1f5f9; display:inline-flex; align-items:center; justify-content:center; font-size:18px; color:#cbd5e1; vertical-align:middle; }
      .pi-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.5); padding:16px; }
      .pi-modal { background:#fff; border-radius:14px; padding:22px; max-width:480px; width:100%; }
      .pi-preview { width:120px; height:120px; border-radius:8px; object-fit:cover; background:#f1f5f9; }
    `;
    document.head.appendChild(s);
  }

  async function uploadImage(file, varaId) {
    const SB = getSB();
    if (!SB) throw new Error('No DB');
    const ts = Date.now();
    const safe = (file.name||'image').replace(/[^a-zA-Z0-9._-]/g,'_');
    const path = `vara_${varaId}/${ts}_${safe}`;
    const up = await SB.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert:false });
    if (up.error) throw up.error;
    const { data: pub } = SB.storage.from(BUCKET).getPublicUrl(path);
    return pub.publicUrl;
  }

  function showEditDialog(vara) {
    document.getElementById('pi-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'pi-modal'; m.className = 'pi-modal-wrap';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div class="pi-modal">
        <h3 style="margin:0 0 12px">🏷 ${esc(vara.nafn || 'Vara')}</h3>
        <div style="display:flex;gap:14px;margin-bottom:12px;align-items:flex-start">
          <div>
            ${vara.mynd ? `<img class="pi-preview" src="${esc(vara.mynd)}" id="pi-img-preview">` : `<div class="pi-preview" id="pi-img-preview" style="display:flex;align-items:center;justify-content:center;font-size:36px;color:#cbd5e1">📦</div>`}
          </div>
          <div style="flex:1">
            <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Mynd</label>
            <input type="file" accept="image/*" id="pi-file" style="display:block;margin:4px 0">
            <div style="font-size:11px;color:#94a3b8">JPG/PNG · hámark 5MB</div>
          </div>
        </div>
        <label style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Lýsing</label>
        <textarea id="pi-desc" rows="3" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box;margin-bottom:12px">${esc(vara.lysing||vara.description||'')}</textarea>
        <label style="display:flex;gap:9px;align-items:flex-start;margin-bottom:12px;cursor:pointer;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:9px 11px">
          <input type="checkbox" id="pi-wb" ${vara.krefst_verkbeidni ? 'checked' : ''} style="margin-top:2px;width:15px;height:15px;flex-shrink:0">
          <span style="min-width:0">
            <span style="font-size:13px;font-weight:600;color:#0f172a">🔧 Fer á verkstæði — stofnar verkbeiðni</span><br>
            <span style="font-size:11px;color:#94a3b8;line-height:1.4">Hakaðu við ef tækið kemur inn til okkar — hleðsla, yfirferð, þrif. Ómerkt = bein sala yfir borðið.</span>
          </span>
        </label>
        <div id="pi-status" style="font-size:12px;color:#64748b;margin-bottom:8px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-outline" onclick="document.getElementById('pi-modal').remove()">Loka</button>
          <button class="btn btn-primary" onclick="ProductImages._save(${vara.id})">Vista</button>
        </div>
      </div>`;
    document.body.appendChild(m);
  }

  async function _save(varaId) {
    const SB = getSB();
    const file = document.getElementById('pi-file').files[0];
    const desc = document.getElementById('pi-desc').value.trim();
    const status = document.getElementById('pi-status');
    const update = { lysing: desc, krefst_verkbeidni: !!(document.getElementById('pi-wb')||{}).checked };
    if (file) {
      if (file.size > 5*1024*1024) { alert('Mynd er of stór (>5MB)'); return; }
      status.textContent = '⏳ Hleð upp mynd...';
      try { update.mynd = await uploadImage(file, varaId); }
      catch (e) { status.textContent = '⚠️ Upload villa: '+e.message; return; }
    }
    const { error } = await SB.from('vorur').update(update).eq('id', varaId);
    if (error) { status.textContent = '⚠️ '+error.message; return; }
    document.getElementById('pi-modal').remove();
  }

  // Inject thumbnails + edit button into product rows
  const obs = new MutationObserver(() => {
    document.querySelectorAll('[data-vara-id]:not([data-pi-injected])').forEach(row => {
      const id = row.dataset.varaId;
      if (!id) return;
      row.dataset.piInjected = '1';
      const actions = row.querySelector('.row-actions, .product-actions');
      if (actions && !actions.querySelector('.pi-edit-btn')) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost btn-sm pi-edit-btn';
        btn.title = 'Mynd og lýsing';
        btn.innerHTML = '🏷';
        btn.onclick = async e => {
          e.stopPropagation();
          const SB = getSB(); if (!SB) return;
          const { data } = await SB.from('vorur').select('*').eq('id', id).single();
          if (data) showEditDialog(data);
        };
        actions.appendChild(btn);
      }
    });
  });
  obs.observe(document.body, { childList:true, subtree:true });

  window.ProductImages = { showEditDialog, _save, uploadImage };
  console.log('[product-images] installed');
})();
