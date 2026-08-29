/* === BACKUP / EXPORT EVERYTHING v1 === */
/* One-click download of entire database as JSON. No SQL needed.
 * Adds "💾 Afrita allt" button to Stillingar/Settings.
 */
(() => {
  if (window.__backupInstalled) return;
  window.__backupInstalled = true;

  function getSB() { return window.DB && window.DB.sb; }

  // Tables backed up. Wrapped in safe() in backup() so missing tables don't break the whole job.
  // Keep the list comprehensive — some tables only exist if their feature has been enabled.
  const TABLES = [
    'fyrirtaeki','vidskiptavinir','solur','sala_transactions','verkbeidnir','verklidur',
    'verkdagbok','verkdagbok_attachments','tilbod','tilbod_attachments','contact_log',
    'uttaeki','lanstaeki','thjonustusamningar','vorur','user_profiles',
    'birgdir','innkaupapantanir','timabok','utgjalda_log','akstursdagbok','afyllingar'
  ];

  async function backup() {
    const SB = getSB();
    if (!SB) { alert('Engin tenging við gagnagrunn'); return; }
    const btn = document.getElementById('backup-btn');
    if (btn) btn.disabled = true, btn.textContent = '⏳ Hleður niður...';
    const dump = { _meta: { version:1, exported_at:new Date().toISOString(), tables:[] }, data:{} };
    for (const t of TABLES) {
      try {
        const { data, error } = await SB.from(t).select('*');
        if (error) {
          console.warn('[backup] skip', t, error.message);
          continue;
        }
        dump.data[t] = data || [];
        dump._meta.tables.push({ name:t, rows:(data||[]).length });
      } catch (e) {
        console.warn('[backup] err', t, e);
      }
    }
    const totalRows = dump._meta.tables.reduce((s,t)=>s+t.rows,0);
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `slokkvitaeki-afrit-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    if (btn) btn.disabled = false, btn.innerHTML = '💾 Afrita allt';
    alert(`✅ Afrit klárt!\n${dump._meta.tables.length} töflur · ${totalRows} færslur alls`);
  }

  // Inject into Stillingar via Settings modal observer
  const obs = new MutationObserver(() => {
    const modal = document.getElementById('sm-settings-modal');
    if (!modal || modal.dataset.backupAdded) return;
    const footer = modal.querySelector('.sm-footer, .modal-footer, [style*="justify-content:flex-end"]');
    const btnArea = footer || modal.querySelector('.sm-modal') || modal;
    if (!btnArea) return;
    modal.dataset.backupAdded = '1';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0';
    wrap.innerHTML = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:6px">Afritun</div>
      <button id="backup-btn" class="btn btn-outline" style="width:100%">💾 Afrita allt sem JSON</button>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px">Niðurhal á öllum gögnum þínum.</div>`;
    (modal.querySelector('.sm-modal') || modal).appendChild(wrap);
    var backupBtn = document.getElementById('backup-btn');
    if (backupBtn) backupBtn.onclick = backup;
  });
  obs.observe(document.body, { childList:true, subtree:true });

  window.Backup = { backup };
  console.log('[backup] installed');
})();
