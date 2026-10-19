/* === SMS STJÓRNBORÐ v1 (19.10.2026) === */
/* Eitt borð fyrir SMS-skilaboð: senda handvirkt, tegundir skilaboða (sniðmát) og saga.
 *
 *   Senda    — veldu tegund, nafn og númer; textinn fyllist úr sniðmátinu og má breyta honum.
 *              Sent gegnum /api/sms-send (Twilio-auðkenni í Netlify env). Staðfest áður en sent er.
 *   Tegundir — breyta texta/heiti, bæta við eigin tegund. Geymt á ÞJÓNI (AppSettings
 *              'stillingar.sms.tegundir' + 'stillingar.sms.snid') — eins á öllum vélum.
 *   Saga     — síðustu 100 sendingar úr töflunni sms_saga (þjónninn skráir hverja tilraun, líka
 *              misheppnaðar). Lesið beint úr Supabase.
 *
 * Opnað úr Afgreiðslu-panelnum (Stjórnborð-takki) og úr Stillingar › SMS Áminningar.
 * Sjálfvirk sending (t.d. eftir viku, vikulega) er EKKI virk — sést sem óvirkur reitur með skýringu.
 * Verður sér skref með þjónsstýrðri keyrslu og vörn gegn tvísendingu.
 * Notar window.SmsReminder (33-sms-reminder.js) fyrir sendingu, tegundir og tvítékk.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__smsStjornInstalled) return;
  window.__smsStjornInstalled = true;

  const R = () => window.SmsReminder || null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('sms-stjorn-style')) {
    const s = document.createElement('style');
    s.id = 'sms-stjorn-style';
    s.textContent = `
      #sms-stjorn-wrap { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 100000;
        display: flex; align-items: center; justify-content: center; padding: 16px; }
      #sms-stjorn { background: #fff; border-radius: 12px; width: min(860px, 100%); max-height: 90vh;
        display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.35); font-size: 13px; color: #1e293b; }
      .ss-hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; }
      .ss-hd h3 { margin: 0; font-size: 16px; }
      .ss-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; }
      .ss-pill.ok { background: #dcfce7; color: #166534; }
      .ss-pill.nei { background: #fee2e2; color: #991b1b; }
      .ss-x { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; line-height: 1; }
      .ss-tabs { display: flex; gap: 4px; padding: 8px 18px 0; border-bottom: 1px solid #e2e8f0; }
      .ss-tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 12px; cursor: pointer;
        font: inherit; font-weight: 600; color: #64748b; }
      .ss-tab.on { color: #92400e; border-bottom-color: #92400e; }
      .ss-body { padding: 16px 18px; overflow: auto; }
      .ss-row { display: grid; gap: 4px; margin-bottom: 12px; }
      .ss-row label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .03em; }
      .ss-in, .ss-ta, .ss-sel { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; }
      .ss-ta { min-height: 92px; resize: vertical; }
      .ss-btn { padding: 8px 16px; background: #92400e; color: #fff; border: none; border-radius: 7px; cursor: pointer; font: inherit; font-weight: 600; }
      .ss-btn:disabled { opacity: .45; cursor: not-allowed; }
      .ss-btn.gra { background: #e2e8f0; color: #334155; }
      .ss-btn.haetta { background: #fff; color: #991b1b; border: 1px solid #fca5a5; }
      .ss-note { font-size: 12px; color: #64748b; }
      .ss-warn { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 9px 12px; color: #92400e; margin-bottom: 12px; }
      .ss-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
      .ss-tbl { width: 100%; border-collapse: collapse; }
      .ss-tbl th { text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
      .ss-tbl td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      .ss-st-ok { color: #166534; font-weight: 600; }
      .ss-st-bad { color: #991b1b; font-weight: 600; }
      .ss-off { opacity: .55; }
      .ss-lbl-sm { font-size: 12px; color: #475569; }
    `;
    document.head.appendChild(s);
  }

  // ── Staða ─────────────────────────────────────────────────────────────────
  let flipi = 'senda';
  let saga = null, sagaVilla = '';
  let stada = null;

  function lokaBord() { const w = document.getElementById('sms-stjorn-wrap'); if (w) w.remove(); }

  async function saekjaSogu() {
    sagaVilla = '';
    try {
      const sb = R() && R().getSB();
      if (!sb) { sagaVilla = 'Gagnagrunnur ekki tilbúinn'; saga = []; return; }
      const r = await sb.from('sms_saga')
        .select('id,created_at,tegund,til,nafn,texti,job_id,status,villa,uppruni')
        .order('created_at', { ascending: false }).limit(100);
      if (r.error) { sagaVilla = r.error.message; saga = []; return; }
      saga = r.data || [];
    } catch (e) { sagaVilla = String((e && e.message) || e); saga = []; }
  }

  function heitiTegundar(id) {
    const t = (R() ? R().getTegundir() : []).find(x => x.id === id);
    return t ? t.heiti : (id || '');
  }

  // ── Flipar ────────────────────────────────────────────────────────────────
  function teiknaSenda() {
    const tegundir = R().getTegundir();
    const virkt = !!(stada && stada.stillt);
    return `
      ${virkt ? '' : '<div class="ss-warn">Twilio er ekki stillt á þjóni. Í Netlify vantar TWILIO_SID, TWILIO_TOKEN og TWILIO_FROM — þar til þau eru komin er ekki hægt að senda héðan.</div>'}
      <div class="ss-row"><label>Tegund skilaboða</label>
        <select id="ss-teg" class="ss-sel">${tegundir.map(t => `<option value="${esc(t.id)}">${esc(t.heiti)}</option>`).join('')}</select></div>
      <div class="ss-row"><label>Nafn viðtakanda</label><input id="ss-nafn" class="ss-in" placeholder="t.d. Jón Jónsson"></div>
      <div class="ss-row"><label>Símanúmer</label><input id="ss-til" class="ss-in" type="tel" placeholder="+354 5xx xxxx"></div>
      <div class="ss-row"><label>Texti <span class="ss-note" style="text-transform:none;font-weight:400">· {nafn} fyllist úr nafni hér að ofan; hægt að breyta frjálst</span></label>
        <textarea id="ss-texti" class="ss-ta"></textarea>
        <div class="ss-note" id="ss-teljari"></div></div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="ss-btn" id="ss-senda" ${virkt ? '' : 'disabled'}>Senda</button>
        <span class="ss-note" id="ss-skilabod"></span>
      </div>`;
  }

  function bindaSenda() {
    const teg = document.getElementById('ss-teg'), nafn = document.getElementById('ss-nafn'),
      til = document.getElementById('ss-til'), texti = document.getElementById('ss-texti'),
      tel = document.getElementById('ss-teljari'), msg = document.getElementById('ss-skilabod'),
      btn = document.getElementById('ss-senda');
    let handBreytt = false;
    const fylla = () => {
      if (handBreytt) return;
      const t = R().getTegundir().find(x => x.id === teg.value);
      texti.value = t ? R().fyllaSnid(t.texti, { customer: nafn.value.trim() || '' }) : '';
      uppfaera();
    };
    const uppfaera = () => { const n = texti.value.length; tel.textContent = n + ' stafir' + (n > 160 ? ' · fleiri en ein SMS-eining' : ''); };
    teg.addEventListener('change', () => { handBreytt = false; fylla(); });
    nafn.addEventListener('input', fylla);
    texti.addEventListener('input', () => { handBreytt = true; uppfaera(); });
    fylla();
    btn.addEventListener('click', async () => {
      msg.textContent = ''; msg.style.color = '';
      const nr = R().normalizePhone(til.value);
      if (!/^\+\d{7,15}$/.test(nr)) { msg.textContent = 'Ógilt símanúmer'; msg.style.color = '#991b1b'; return; }
      if (!texti.value.trim()) { msg.textContent = 'Textinn er tómur'; msg.style.color = '#991b1b'; return; }
      const ok = await R().jaNei('Senda SMS á ' + (nafn.value.trim() || nr) + ' (' + nr + ')?\n\n' + texti.value.trim(), 'Senda');
      if (!ok) return;
      btn.disabled = true; btn.textContent = 'Sendi…';
      try {
        await R().sendaSms({ to: nr, body: texti.value.trim(), tegund: teg.value, nafn: nafn.value.trim(), uppruni: 'stjornbord' });
        msg.textContent = 'Sent til ' + nr; msg.style.color = '#166534';
        R().toast('✓ SMS sent á ' + (nafn.value.trim() || nr));
      } catch (e) {
        msg.textContent = 'Mistókst: ' + (e.message || e); msg.style.color = '#991b1b';
      }
      btn.disabled = !(stada && stada.stillt); btn.textContent = 'Senda';
    });
  }

  function teiknaTegundir() {
    const tegundir = R().getTegundir();
    const spjold = tegundir.map(t => `
      <div class="ss-card" data-id="${esc(t.id)}">
        <div class="ss-row"><label>Heiti${t.id === 'tilbuid' ? ' (fast)' : ''}</label>
          <input class="ss-in ss-t-heiti" value="${esc(t.heiti)}" ${t.id === 'tilbuid' ? 'disabled' : ''}></div>
        <div class="ss-row"><label>Texti <span class="ss-note" style="text-transform:none;font-weight:400">· breytur: {nafn} {num} {phone}</span></label>
          <textarea class="ss-ta ss-t-texti">${esc(t.texti)}</textarea></div>
        <div style="display:flex;gap:8px">
          <button class="ss-btn ss-t-vista">Vista</button>
          ${t.innbyggd ? '' : '<button class="ss-btn haetta ss-t-eyda">Eyða</button>'}
        </div>
      </div>`).join('');
    return `
      <div class="ss-note" style="margin-bottom:12px">Breytingar vistast á þjóninum og gilda á öllum tölvum. „Tæki tilbúið til afhendingar“ er textinn sem fer úr Afgreiðslu-borðinu.</div>
      ${spjold}
      <button class="ss-btn gra" id="ss-ny">+ Ný tegund</button>
      <div class="ss-card ss-off" style="margin-top:16px">
        <div style="font-weight:700;margin-bottom:6px">Sjálfvirk sending <span class="ss-pill nei">ekki virk ennþá</span></div>
        <div class="ss-lbl-sm" style="margin-bottom:8px">Hér kemur að hægt verði að láta tegund sendast sjálfkrafa, t.d. viku eftir að tæki er tilbúið og svo á vikufresti þar til það er sótt. Ekkert hér sendir neitt núna.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <label class="ss-lbl-sm">Senda eftir <input class="ss-in" style="width:70px;display:inline-block" value="7" disabled> dögum</label>
          <label class="ss-lbl-sm">Endurtaka á <input class="ss-in" style="width:70px;display:inline-block" value="7" disabled> daga fresti</label>
        </div>
      </div>`;
  }

  async function vistaTegund(id, heiti, texti) {
    const AS = window.AppSettings;
    if (!AS || !AS.save) throw new Error('AppSettings ekki tilbúið');
    let patch;
    if (id === 'tilbuid') patch = { stillingar: { sms: { snid: texti } } };
    else patch = { stillingar: { sms: { tegundir: { [id]: { heiti, texti, eytt: false } } } } };
    const ok = await AS.save(patch);
    if (ok !== true) throw new Error('Vistun náði ekki á þjóninn (reyndu aftur)');
  }

  function bindaTegundir() {
    const rot = document.getElementById('ss-body');
    rot.querySelectorAll('.ss-card[data-id]').forEach(kort => {
      const id = kort.getAttribute('data-id');
      const vista = kort.querySelector('.ss-t-vista'), eyda = kort.querySelector('.ss-t-eyda');
      vista.addEventListener('click', async () => {
        const heiti = kort.querySelector('.ss-t-heiti').value.trim() || 'Ónefnd tegund';
        const texti = kort.querySelector('.ss-t-texti').value;
        vista.disabled = true; vista.textContent = 'Vista…';
        try { await vistaTegund(id, heiti, texti); R().toast('✓ Tegund vistuð'); }
        catch (e) { R().toast('Vistun mistókst: ' + (e.message || e)); }
        vista.disabled = false; vista.textContent = 'Vista';
      });
      if (eyda) eyda.addEventListener('click', async () => {
        if (!(await R().jaNei('Eyða tegundinni „' + heitiTegundar(id) + '“?', 'Eyða'))) return;
        try {
          const ok = await window.AppSettings.save({ stillingar: { sms: { tegundir: { [id]: { eytt: true } } } } });
          if (ok !== true) throw new Error('Vistun náði ekki á þjóninn');
          teikna();
        } catch (e) { R().toast('Mistókst: ' + (e.message || e)); }
      });
    });
    const ny = document.getElementById('ss-ny');
    if (ny) ny.addEventListener('click', async () => {
      const id = 'x' + Date.now().toString(36);
      try { await vistaTegund(id, 'Ný tegund', 'Góðan dag {nafn}! Slökkvitæki ehf hér. '); teikna(); }
      catch (e) { R().toast('Mistókst: ' + (e.message || e)); }
    });
  }

  function teiknaSogu() {
    if (saga == null) return '<div class="ss-note">Sæki sögu…</div>';
    const rodir = saga.map(r => {
      const d = new Date(r.created_at);
      const tm = isNaN(d) ? '' : R().dagsTimi(r.created_at);
      const ok = r.status === 'sent';
      return `<tr>
        <td style="white-space:nowrap">${esc(tm)}</td>
        <td>${esc(r.nafn || '')}<div class="ss-note">${esc(r.til)}</div></td>
        <td>${esc(heitiTegundar(r.tegund))}${r.uppruni ? `<div class="ss-note">${esc(r.uppruni)}</div>` : ''}</td>
        <td title="${esc(r.texti)}">${esc(String(r.texti).length > 80 ? String(r.texti).slice(0, 80) + '…' : r.texti)}</td>
        <td class="${ok ? 'ss-st-ok' : 'ss-st-bad'}">${ok ? 'Sent' : 'Mistókst'}${!ok && r.villa ? `<div class="ss-note" style="font-weight:400">${esc(r.villa)}</div>` : ''}</td>
      </tr>`;
    }).join('');
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="ss-note">Síðustu ${saga.length} sendingar. Hver tilraun er skráð á þjóninum, líka þær sem mistókust.</div>
        <button class="ss-btn gra" id="ss-endurhlada">Endurhlaða</button>
      </div>
      ${sagaVilla ? `<div class="ss-warn">Gat ekki lesið söguna: ${esc(sagaVilla)}</div>` : ''}
      ${saga.length ? `<table class="ss-tbl"><thead><tr><th>Tími</th><th>Viðtakandi</th><th>Tegund</th><th>Texti</th><th>Staða</th></tr></thead><tbody>${rodir}</tbody></table>`
        : (sagaVilla ? '' : '<div class="ss-note">Engin SMS hafa verið send gegnum kerfið ennþá.</div>')}`;
  }

  // ── Rammi ─────────────────────────────────────────────────────────────────
  function teikna() {
    if (!R()) return;
    const wrap = document.getElementById('sms-stjorn-wrap');
    if (!wrap) return;
    const virkt = !!(stada && stada.stillt);
    const flipar = [['senda', 'Senda'], ['tegundir', 'Tegundir skilaboða'], ['saga', 'Saga']];
    wrap.querySelector('#sms-stjorn').innerHTML = `
      <div class="ss-hd">
        <h3>SMS-stjórnborð</h3>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="ss-pill ${stada ? (virkt ? 'ok' : 'nei') : ''}">${stada ? ('Twilio á þjóni: ' + (virkt ? 'já' : 'nei')) : 'Athuga Twilio…'}</span>
          <button class="ss-x" id="ss-loka" aria-label="Loka">×</button>
        </div>
      </div>
      <div class="ss-tabs">${flipar.map(([k, t]) => `<button class="ss-tab ${flipi === k ? 'on' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
      <div class="ss-body" id="ss-body">${flipi === 'senda' ? teiknaSenda() : flipi === 'tegundir' ? teiknaTegundir() : teiknaSogu()}</div>`;
    wrap.querySelector('#ss-loka').onclick = lokaBord;
    wrap.querySelectorAll('.ss-tab').forEach(b => b.addEventListener('click', async () => {
      flipi = b.getAttribute('data-f');
      if (flipi === 'saga') { saga = null; teikna(); await saekjaSogu(); teikna(); return; }
      teikna();
    }));
    if (flipi === 'senda') bindaSenda();
    else if (flipi === 'tegundir') bindaTegundir();
    else { const e = document.getElementById('ss-endurhlada'); if (e) e.onclick = async () => { saga = null; teikna(); await saekjaSogu(); teikna(); }; }
  }

  async function opna(valinn) {
    if (!R()) { alert('SMS-kerfið hefur ekki hlaðist — endurhlaðið síðuna.'); return; }
    lokaBord();
    flipi = valinn || 'senda';
    const wrap = document.createElement('div');
    wrap.id = 'sms-stjorn-wrap';
    wrap.innerHTML = '<div id="sms-stjorn" role="dialog" aria-modal="true" aria-label="SMS-stjórnborð"></div>';
    wrap.addEventListener('mousedown', e => { if (e.target === wrap) lokaBord(); });
    document.body.appendChild(wrap);
    document.addEventListener('keydown', function esk(e) {
      if (!document.getElementById('sms-stjorn-wrap')) { document.removeEventListener('keydown', esk); return; }
      if (e.key === 'Escape') { lokaBord(); document.removeEventListener('keydown', esk); }
    });
    teikna();
    R().stadaCached(true).then(s => { stada = s; teikna(); });
    if (flipi === 'saga') { await saekjaSogu(); teikna(); }
  }

  // Ný sending (úr stjórnborði eða Afgreiðslu) → saga endurhleðst næst þegar flipinn er opnaður.
  document.addEventListener('sms:sent', () => { saga = null; });

  // Hnappur í Stillingar › SMS Áminningar
  function bætaVidStillingar() {
    const sec = document.getElementById('sms-settings-sec');
    if (!sec || sec.querySelector('#sms-stjorn-opna')) return;
    const b = document.createElement('button');
    b.id = 'sms-stjorn-opna'; b.type = 'button'; b.className = 'btn btn-sm';
    b.style.cssText = 'margin-bottom:12px;width:fit-content';
    b.textContent = 'Opna SMS-stjórnborð (senda, tegundir, saga)';
    b.onclick = () => opna('senda');
    const hd = sec.firstElementChild;
    hd ? hd.after(b) : sec.prepend(b);
  }
  document.addEventListener('view-shown', e => {
    if (e.detail === 'settings') setTimeout(bætaVidStillingar, 400);
  });

  window.SmsStjorn = { opna, lokaBord };
  console.log('[sms-stjornbord] installed');
})();
/* === END SMS STJÓRNBORÐ === */
