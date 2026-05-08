/* === VIÐSKIPTAVINATENGILL / CUSTOMER PORTAL v1 === */
/* Generates a shareable read-only URL per customer.
 * Format: /index.html#portal=<base64 company_id>
 * When opened, hides nav and shows just the customer's own invoices and service history.
 *
 * No SQL — uses existing fyrirtaeki + solur + uttaeki tables.
 * Adds "🌐 Senda tengil" button to customer detail panels.
 */
(() => {
  if (window.__portalInstalled) return;
  window.__portalInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtKr(n){if(!n&&n!==0)return'—';const s=Math.round(n).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return r.join('.')+' kr';}
  function fmtDate(d){if(!d)return'';const x=new Date(d);return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear();}

  // ── Detect portal mode ────────────────────────────────────────────────────
  function getPortalId() {
    const m = (location.hash||'').match(/portal=([A-Za-z0-9+/=]+)/);
    if (!m) return null;
    try { return parseInt(atob(m[1])); } catch(e) { return null; }
  }

  async function renderPortal(companyId) {
    document.body.innerHTML = '';
    document.body.style.cssText = 'background:#f8fafc;font-family:inherit;padding:0;margin:0';
    document.body.innerHTML = `
      <style>
        .pt-wrap { max-width:900px; margin:0 auto; padding:24px 16px; }
        .pt-hd { background:#fff; border-radius:12px; padding:24px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .pt-hd h1 { margin:0 0 4px; color:#0f172a; }
        .pt-hd .brand { color:#dc2626; font-weight:600; font-size:13px; }
        .pt-section { background:#fff; border-radius:12px; padding:20px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .pt-section h2 { margin:0 0 14px; font-size:16px; color:#0f172a; border-bottom:2px solid #f1f5f9; padding-bottom:8px; }
        .pt-section table { width:100%; border-collapse:collapse; font-size:13px; }
        .pt-section th, .pt-section td { padding:8px; text-align:left; border-bottom:1px solid #f1f5f9; }
        .pt-section th { background:#f8fafc; font-weight:600; font-size:11px; text-transform:uppercase; color:#64748b; }
        .pt-pill { padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; }
        .pt-paid { background:#dcfce7; color:#166534; }
        .pt-unpaid { background:#fee2e2; color:#991b1b; }
        .pt-empty { padding:30px; text-align:center; color:#94a3b8; }
      </style>
      <div class="pt-wrap">
        <div class="pt-hd">
          <div class="brand">SLÖKKVITÆKI EHF · BRUNAKERFI</div>
          <h1 id="pt-name">Hleður...</h1>
          <div id="pt-info" style="color:#64748b;font-size:13px"></div>
        </div>
        <div class="pt-section">
          <h2>📄 Reikningar</h2>
          <div id="pt-invoices" class="pt-empty">Hleður...</div>
        </div>
        <div class="pt-section">
          <h2>🔥 Slökkvitæki í þjónustu</h2>
          <div id="pt-units" class="pt-empty">Hleður...</div>
        </div>
        <div class="pt-section" style="text-align:center;color:#94a3b8;font-size:12px">
          Þetta er einkanlegur tengill. Hringdu í okkur ef þú þarft aðstoð.
        </div>
      </div>`;

    const SB = getSB(); if (!SB) return;
    const safe = async p => { try { return await p; } catch (e) { return { data:[], error:e }; } };
    // uttaeki has no company_id — must look up by client name. Sequential to know the name first.
    const coRes = await safe(SB.from('fyrirtaeki').select('*').eq('id', companyId).single());
    const coNafn = coRes.data ? coRes.data.nafn : null;
    const [invRes, unitRes] = await Promise.all([
      safe(SB.from('solur').select('*').eq('customer_id', companyId).order('created_at',{ascending:false})),
      coNafn
        ? safe(SB.from('uttaeki').select('*').eq('client', coNafn).order('serial',{ascending:true}))
        : Promise.resolve({ data: [] })
    ]);

    const co = coRes.data;
    if (co) {
      document.getElementById('pt-name').textContent = co.nafn || 'Viðskiptavinur';
      document.getElementById('pt-info').textContent = [co.kennitala, co.heimilisfang, co.netfang].filter(Boolean).join(' · ');
    }

    const invs = invRes.data || [];
    document.getElementById('pt-invoices').innerHTML = invs.length ? `
      <table><thead><tr><th>Nr</th><th>Dags</th><th>Upphæð</th><th>Greiðsla</th></tr></thead>
      <tbody>${invs.map(i=>`<tr>
        <td>${esc(i.num||'#'+i.id)}</td>
        <td>${fmtDate(i.created_at)}</td>
        <td><strong>${fmtKr(i.samtals)}</strong></td>
        <td>${i.paid_at?'<span class="pt-pill pt-paid">✓ Greitt</span>':'<span class="pt-pill pt-unpaid">Ógreitt</span>'}</td>
      </tr>`).join('')}</tbody></table>` : '<div class="pt-empty">Engir reikningar enn</div>';

    const units = unitRes.data || [];
    document.getElementById('pt-units').innerHTML = units.length ? `
      <table><thead><tr><th>Nr</th><th>Tegund</th><th>Síðasta skoðun</th><th>Næsta skoðun</th></tr></thead>
      <tbody>${units.map(u=>`<tr>
        <td>${esc(u.serial||'')}</td>
        <td>${esc(u.type||'')}</td>
        <td>${fmtDate(u.last_insp)}</td>
        <td>${fmtDate(u.next_insp)}</td>
      </tr>`).join('')}</tbody></table>` : '<div class="pt-empty">Engin tæki skráð</div>';
  }

  function makePortalUrl(companyId) {
    const base = location.origin + location.pathname.replace(/[^/]+$/,'');
    return `${base}#portal=${btoa(String(companyId))}`;
  }

  function showShareDialog(companyId, companyNafn) {
    const url = makePortalUrl(companyId);
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:16px';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:22px;max-width:520px;width:100%">
        <h3 style="margin:0 0 12px">🌐 Tengill á viðskiptavinasvæði</h3>
        <p style="font-size:13px;color:#64748b;margin:0 0 12px">Sendu þennan tengil á <strong>${esc(companyNafn||'viðskiptavin')}</strong>. Þeir geta skoðað sína reikninga og þjónustusögu án innskráningar.</p>
        <input id="pt-share-url" value="${esc(url)}" readonly style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:6px;box-sizing:border-box;font-family:monospace;font-size:12px">
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
          <button class="btn btn-outline" onclick="this.closest('[style*=fixed]').remove()">Loka</button>
          <button class="btn btn-primary" onclick="navigator.clipboard.writeText(document.getElementById('pt-share-url').value);this.textContent='✓ Afritað'">📋 Afrita slóð</button>
          <a class="btn btn-outline" href="mailto:?subject=${encodeURIComponent('Þitt viðskiptavinasvæði - Slökkvitæki ehf')}&body=${encodeURIComponent('Hér er tengill á þitt einkasvæði: '+url)}" target="_blank">📧 Senda í pósti</a>
        </div>
      </div>`;
    document.body.appendChild(m);
    setTimeout(() => document.getElementById('pt-share-url')?.select(), 50);
  }

  // ── Inject button into company detail panels ──────────────────────────────
  const obs = new MutationObserver(() => {
    document.querySelectorAll('[data-company-id]:not([data-portal-injected])').forEach(el => {
      const id = el.dataset.companyId;
      const nafn = el.dataset.companyNafn || el.dataset.nafn || '';
      if (!id) return;
      el.dataset.portalInjected = '1';
      const actions = el.querySelector('.row-actions, .co-actions');
      if (!actions) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm';
      btn.title = 'Senda viðskiptavinatengil';
      btn.innerHTML = '🌐';
      btn.onclick = e => { e.stopPropagation(); showShareDialog(id, nafn); };
      actions.appendChild(btn);
    });
  });
  obs.observe(document.body, { childList:true, subtree:true });

  // ── Init: check if we're in portal mode ───────────────────────────────────
  function init() {
    const id = getPortalId();
    if (id) {
      // Wait for SB to be ready
      const tryRender = () => {
        if (getSB()) renderPortal(id);
        else setTimeout(tryRender, 200);
      };
      tryRender();
    }
  }
  init();

  window.CustomerPortal = { showShareDialog, makePortalUrl, renderPortal };
  console.log('[customer-portal] installed');
})();
