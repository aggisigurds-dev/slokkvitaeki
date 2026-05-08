/* === AUDIT LOG / ATHAFNALOG v1 === */
/* Logs INSERT/UPDATE/DELETE on critical tables.
 * Hooks Supabase client query method to write to audit_log table.
 *
 * SQL:
 *   CREATE TABLE IF NOT EXISTS audit_log (
 *     id BIGSERIAL PRIMARY KEY,
 *     ts TIMESTAMPTZ DEFAULT NOW(),
 *     user_email TEXT,
 *     action TEXT,
 *     table_name TEXT,
 *     row_id TEXT,
 *     details JSONB
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);
 */
(() => {
  if (window.__auditInstalled) return;
  window.__auditInstalled = true;

  const TRACKED_TABLES = new Set([
    'solur','verkbeidnir','tilbod','fyrirtaeki','vidskiptavinir',
    'thjonustusamningar','dagbok','contact_log','utgjalda_log',
    'innkaupapantanir','timabok','akstursdagbok','birgdir'
  ]);

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtDate(d){if(!d)return'';const x=new Date(d);return x.getDate()+'.'+(x.getMonth()+1)+'.'+x.getFullYear()+' '+String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0');}

  function getCurrentUser(){
    try {
      return (window.DB && window.DB.user && window.DB.user.email) || localStorage.getItem('cfg_default_tech') || 'unknown';
    } catch(e){ return 'unknown'; }
  }

  // Hook the supabase client. We intercept at the table builder level.
  function hookSB(){
    const SB = getSB();
    if (!SB || SB._auditHooked) return;
    const origFrom = SB.from.bind(SB);
    SB.from = function(table){
      const builder = origFrom(table);
      if (!TRACKED_TABLES.has(table)) return builder;
      // Wrap insert/update/delete
      ['insert','update','delete','upsert'].forEach(op => {
        const orig = builder[op];
        if (!orig) return;
        builder[op] = function(...args){
          const action = op.toUpperCase();
          const payload = (op==='insert'||op==='update'||op==='upsert') ? args[0] : null;
          const result = orig.apply(this, args);
          // Hook .then so we know when query completes
          const origThen = result.then.bind(result);
          result.then = function(onF, onR){
            return origThen(res => {
              try {
                if (!res.error) {
                  // Don't audit audit_log itself!
                  if (table !== 'audit_log') {
                    const rowId = res.data && (res.data[0]?.id || res.data.id) || null;
                    SB.from('audit_log').insert({
                      user_email: getCurrentUser(),
                      action, table_name: table, row_id: rowId ? String(rowId) : null,
                      details: payload ? (Array.isArray(payload)?payload[0]:payload) : null
                    }).then(()=>{}).catch(()=>{});
                  }
                }
              } catch(e){}
              return onF ? onF(res) : res;
            }, onR);
          };
          return result;
        };
      });
      return builder;
    };
    SB._auditHooked = true;
    console.log('[audit] supabase client hooked');
  }

  // Try hooking immediately and retry until SB exists
  function tryHook(){
    if (getSB()) hookSB();
    else setTimeout(tryHook, 500);
  }
  tryHook();

  // ── Viewer ────────────────────────────────────────────────────────────────
  function ensureNav(){
    if (document.querySelector('.vnav-btn[data-view="audit"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="settings"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'audit';
    btn.textContent = '🔍 Athafnalog';
    btn.onclick = () => window.App && window.App.switchView('audit');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView(){
    if (document.getElementById('view-audit')) return;
    const sample = document.getElementById('view-stillingar') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-audit';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="al-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch(){
    if (!window.App || window.App._alPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view==='audit'){
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v=document.getElementById('view-audit');
        if (v){ v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='audit'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._alPatch = true;
  }

  async function load(){
    const main = document.querySelector('#view-audit #al-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður...</div>';
    const SB = getSB(); if (!SB) return;
    const { data, error } = await SB.from('audit_log').select('*').order('ts',{ascending:false}).limit(200);
    if (error) {
      if (/relation .* does not exist/i.test(error.message)) {
        main.innerHTML = '<div style="padding:30px;text-align:center">⚠️ Taflan vantar — keyrðu MIGRATION.sql</div>';
        return;
      }
      main.innerHTML = `<div style="padding:30px;text-align:center;color:#dc2626">${esc(error.message)}</div>`;
      return;
    }
    const colors = { INSERT:'#16a34a', UPDATE:'#3b82f6', DELETE:'#dc2626', UPSERT:'#8b5cf6' };
    main.innerHTML = `
      <div style="max-width:1180px;margin:0 auto">
        <h1 style="margin:0 0 6px;font-size:20px">🔍 Athafnalog</h1>
        <div style="font-size:13px;color:#64748b;margin-bottom:14px">Síðustu 200 breytingar í kerfinu</div>
        ${(data||[]).length ? `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04);font-size:13px">
          <thead><tr style="background:#f8fafc">
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Tími</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Notandi</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Aðgerð</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Tafla</th>
            <th style="padding:10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b">Auðkenni</th>
          </tr></thead>
          <tbody>${(data||[]).map(r=>`<tr style="border-top:1px solid #f1f5f9">
            <td style="padding:8px 10px;font-family:monospace;font-size:11px">${fmtDate(r.ts)}</td>
            <td style="padding:8px 10px">${esc(r.user_email||'—')}</td>
            <td style="padding:8px 10px"><span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:${colors[r.action]||'#94a3b8'}22;color:${colors[r.action]||'#64748b'}">${esc(r.action||'')}</span></td>
            <td style="padding:8px 10px;font-family:monospace;font-size:11px">${esc(r.table_name||'')}</td>
            <td style="padding:8px 10px;font-family:monospace;font-size:11px">${esc(r.row_id||'—')}</td>
          </tr>`).join('')}</tbody>
        </table>` : '<div style="padding:30px;text-align:center;color:#94a3b8">Engar færslur enn — gerðu eitthvað í kerfinu og athugaðu aftur</div>'}
      </div>`;
  }

  function init(){ ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1500);
  setTimeout(init, 3000);

  window.AuditLog = { load };
  console.log('[audit-log] installed');
})();
