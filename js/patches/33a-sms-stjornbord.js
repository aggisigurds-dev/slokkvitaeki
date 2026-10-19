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
 *   Sjálfvirkt — kveikja/slökkva á daglegri sjálfvirkri áminningu um tilbúin tæki og velja HVE OFT hún
 *              sendist (fyrsta skilaboð eftir N daga, endurtekning á N daga fresti, hámark, aldurstakmark).
 *              Stillingarnar vistast á ÞJÓNI (`stillingar.sms.sjalfvirkt`) og tímasett fall
 *              (sms-sjalfvirkt-cron, kl. 10:00) les þær. SJÁLFGEFIÐ SLÖKKT. Forskoðun sýnir hverjir fengju
 *              skilaboð núna (GET /api/sms-sjalfvirkt — sendir ekkert).
 *
 * Opnað úr Afgreiðslu-panelnum (Stjórnborð-takki) og úr Stillingar › SMS Áminningar.
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
      .ss-rofi { display: flex; align-items: center; gap: 14px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 14px; }
      .ss-rofi.on { background: #f0fdf4; border-color: #86efac; }
      .ss-switch { position: relative; width: 52px; height: 28px; flex: 0 0 auto; border: none; border-radius: 999px; background: #cbd5e1; cursor: pointer; padding: 0; transition: background .15s; }
      .ss-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
      .ss-switch[aria-checked="true"] { background: #16a34a; }
      .ss-switch[aria-checked="true"]::after { transform: translateX(24px); }
      .ss-setning { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
      .ss-setning:last-of-type { border-bottom: none; }
      .ss-tala { width: 64px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 14px; text-align: center; }
      .ss-dalur { font-size: 12px; color: #64748b; flex-basis: 100%; margin-top: -4px; }
      .ss-dæmi { background: #f8fafc; border-radius: 8px; padding: 10px 12px; margin: 12px 0; font-size: 13px; color: #334155; }
      details.ss-undir { margin-top: 8px; }
      details.ss-undir summary { cursor: pointer; font-weight: 600; color: #475569; }
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
      <div class="ss-note" style="margin-top:14px">Sjálfvirkar áminningar um tilbúin tæki eru stilltar í flipanum „Sjálfvirkt“. Þær nota textana „Tæki tilbúið til afhendingar“ og „Áminning: tæki enn ósótt“.</div>`;
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

  // ── Sjálfvirkt ────────────────────────────────────────────────────────────
  // Sjálfgildin eru afrit af SJALFGILDI_STILLINGAR í netlify/functions/_sms-sjalfvirkt.cjs.
  const SJ_SJALFGILT = { virkt: false, fyrstaEftirDogum: 2, endurtakaDaga: 7, hamarksEndurtekningar: 3, ekkiEldraEnDagar: 30 };
  const TIDNI = [[0, 'Aldrei (aðeins eitt skilaboð)'], [1, 'Daglega'], [3, 'Á 3 daga fresti'], [7, 'Vikulega'], [14, 'Á 2 vikna fresti']];
  let forskodun = null, forskodunVilla = '';

  function lesaSjStillingar() {
    let o = {};
    try { const v = window.AppSettings && AppSettings.path && AppSettings.path('stillingar.sms.sjalfvirkt'); if (v && typeof v === 'object') o = v; } catch (_) {}
    const n = (k) => { const x = parseInt(o[k], 10); return Number.isFinite(x) ? x : SJ_SJALFGILT[k]; };
    return { virkt: o.virkt === true, fyrstaEftirDogum: n('fyrstaEftirDogum'), endurtakaDaga: n('endurtakaDaga'),
      hamarksEndurtekningar: n('hamarksEndurtekningar'), ekkiEldraEnDagar: n('ekkiEldraEnDagar') };
  }

  async function saekjaForskodun() {
    forskodun = null; forskodunVilla = '';
    try {
      const r = await fetch('/api/sms-sjalfvirkt');
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) forskodunVilla = j.error || ('HTTP ' + r.status); else forskodun = j;
    } catch (e) { forskodunVilla = String((e && e.message) || e); }
    if (flipi === 'sjalfvirkt' && document.getElementById('ss-forskodun')) {
      document.getElementById('ss-forskodun').innerHTML = teiknaForskodun();
    }
  }

  function teiknaForskodun() {
    if (forskodunVilla) return `<div class="ss-warn">Gat ekki reiknað forskoðun: ${esc(forskodunVilla)}</div>`;
    if (!forskodun) return '<div class="ss-note">Reikna hverjir fá skilaboð…</div>';
    const a = forskodun.aaetlad || [], s = forskodun.sleppt || [];
    const lina = (v) => `<tr><td>${esc(v.nafn || '—')}<div class="ss-note">${esc(v.til)}</div></td><td>${esc(v.hvers)}</td><td>${v.dagarFraMottoku == null ? '' : esc(v.dagarFraMottoku) + ' d'}</td></tr>`;
    const sleppt = s.slice(0, 40).map(v => `<tr><td>${esc(v.nafn || '—')}</td><td colspan="2" class="ss-note">${esc(v.astaeda)}</td></tr>`).join('');
    return `
      <div style="font-weight:700;margin-bottom:6px">Forskoðun: ${a.length ? a.length + ' fengju skilaboð í næstu keyrslu' : 'enginn fengi skilaboð í næstu keyrslu'}</div>
      <div class="ss-note" style="margin-bottom:8px">Þetta sendir ekkert — þetta sýnir aðeins hvað myndi gerast kl. 10:00 með stillingunum hér að ofan${a.length > (forskodun.hamarkPerKeyrslu || 10) ? '. Mest ' + forskodun.hamarkPerKeyrslu + ' fara í hverri keyrslu, hin daginn eftir' : ''}.</div>
      ${a.length ? `<table class="ss-tbl"><thead><tr><th>Viðtakandi</th><th>Skilaboð</th><th>Komið inn</th></tr></thead><tbody>${a.map(lina).join('')}</tbody></table>` : ''}
      ${s.length ? `<details class="ss-undir"><summary>Sleppt (${s.length}) — og hvers vegna</summary><table class="ss-tbl"><tbody>${sleppt}</tbody></table></details>` : ''}`;
  }

  function daemi(st) {
    const fyrsta = st.fyrstaEftirDogum === 0 ? 'sama dag og tækið kemur inn' : st.fyrstaEftirDogum + ' dögum eftir að tækið kemur inn';
    let t = 'Tæki er skráð tilbúið og kemur inn á degi 0 → fyrsta SMS ' + fyrsta + ' (kl. 10:00).';
    if (st.endurtakaDaga > 0 && st.hamarksEndurtekningar > 0) {
      t += ' Ef tækið er enn ósótt er minnt á á ' + (st.endurtakaDaga === 1 ? 'hverjum degi' : st.endurtakaDaga + ' daga fresti') + ', mest ' + st.hamarksEndurtekningar + ' sinnum.';
    } else t += ' Engar áminningar eftir það.';
    t += ' Tæki sem komu inn fyrir meira en ' + st.ekkiEldraEnDagar + ' dögum síðan fá ekkert.';
    return t;
  }

  function teiknaSjalfvirkt() {
    const st = lesaSjStillingar();
    const virkt = !!(stada && stada.stillt);
    const tidniVal = TIDNI.some(x => x[0] === st.endurtakaDaga) ? '' : `<option value="${st.endurtakaDaga}" selected>Á ${st.endurtakaDaga} daga fresti</option>`;
    return `
      ${virkt ? '' : '<div class="ss-warn">Twilio er ekki stillt á þjóni, svo ekkert verður sent þótt kveikt sé á þessu. Í Netlify vantar TWILIO_SID, TWILIO_TOKEN og TWILIO_FROM.</div>'}
      <div class="ss-rofi ${st.virkt ? 'on' : ''}" id="ss-rofi">
        <button type="button" class="ss-switch" id="ss-rofi-takki" role="switch" aria-checked="${st.virkt}" aria-label="Sjálfvirkar áminningar"></button>
        <div><div style="font-weight:700;font-size:15px">Sjálfvirkar áminningar um tilbúin tæki: ${st.virkt ? 'KVEIKT' : 'slökkt'}</div>
          <div class="ss-note">Kerfið sendir SMS á viðskiptavini þegar tæki bíður afhendingar, einu sinni á dag kl. 10:00. Slökkt þar til þú kveikir.</div></div>
      </div>
      <div class="ss-card">
        <div class="ss-setning">Senda fyrsta skilaboð
          <input class="ss-tala" id="ss-fyrsta" type="number" min="0" max="60" value="${st.fyrstaEftirDogum}">
          dögum eftir að tækið kemur inn
          <div class="ss-dalur">0 = sama dag. Miðað við daginn sem tækið var skráð inn.</div></div>
        <div class="ss-setning">Minna á ef tækið er enn ósótt:
          <select class="ss-sel" id="ss-tidni" style="width:auto">${TIDNI.map(([d, t]) => `<option value="${d}" ${d === st.endurtakaDaga ? 'selected' : ''}>${t}</option>`).join('')}${tidniVal}</select></div>
        <div class="ss-setning">Mest
          <input class="ss-tala" id="ss-hamark" type="number" min="0" max="10" value="${st.hamarksEndurtekningar}">
          áminningar á hvert tæki
          <div class="ss-dalur">Eftir það hættir kerfið að senda á það tæki.</div></div>
        <div class="ss-setning">Sleppa tækjum sem komu inn fyrir meira en
          <input class="ss-tala" id="ss-aldur" type="number" min="1" max="365" value="${st.ekkiEldraEnDagar}">
          dögum
          <div class="ss-dalur">Verndar gömul verk fyrir skilaboðaflóði þegar kveikt er á.</div></div>
        <div class="ss-dæmi" id="ss-daemi">${esc(daemi(st))}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="ss-btn" id="ss-sj-vista">Vista stillingar</button>
          <span class="ss-note" id="ss-sj-skilabod"></span>
        </div>
      </div>
      <div class="ss-note" style="margin-bottom:10px">Öryggi: hvert tæki fær aldrei tvö SMS innan 20 klst, mest 10 SMS fara í hverri keyrslu, og sent handvirkt SMS telst með. Allt sem sent er sést í flipanum „Saga“.</div>
      <div id="ss-forskodun">${teiknaForskodun()}</div>`;
  }

  async function vistaSjalfvirkt(patch) {
    const AS = window.AppSettings;
    if (!AS || !AS.save) throw new Error('AppSettings ekki tilbúið');
    const ok = await AS.save({ stillingar: { sms: { sjalfvirkt: patch } } });
    if (ok !== true) throw new Error('Vistun náði ekki á þjóninn (reyndu aftur)');
  }

  function bindaSjalfvirkt() {
    const g = (id) => document.getElementById(id);
    const lesaReiti = () => ({
      fyrstaEftirDogum: Math.min(60, Math.max(0, parseInt(g('ss-fyrsta').value, 10) || 0)),
      endurtakaDaga: parseInt(g('ss-tidni').value, 10) || 0,
      hamarksEndurtekningar: Math.min(10, Math.max(0, parseInt(g('ss-hamark').value, 10) || 0)),
      ekkiEldraEnDagar: Math.min(365, Math.max(1, parseInt(g('ss-aldur').value, 10) || 30))
    });
    const uppfaeraDaemi = () => { g('ss-daemi').textContent = daemi({ ...lesaSjStillingar(), ...lesaReiti() }); };
    ['ss-fyrsta', 'ss-tidni', 'ss-hamark', 'ss-aldur'].forEach(id => g(id).addEventListener('input', uppfaeraDaemi));

    g('ss-sj-vista').addEventListener('click', async () => {
      const b = g('ss-sj-vista'), m = g('ss-sj-skilabod');
      b.disabled = true; m.textContent = ''; m.style.color = '';
      try { await vistaSjalfvirkt(lesaReiti()); m.textContent = 'Vistað'; m.style.color = '#166534'; saekjaForskodun(); }
      catch (e) { m.textContent = 'Vistun mistókst: ' + (e.message || e); m.style.color = '#991b1b'; }
      b.disabled = false;
    });

    g('ss-rofi-takki').addEventListener('click', async () => {
      const nu = lesaSjStillingar();
      const kveikja = !nu.virkt;
      if (kveikja) {
        // Vista reitina fyrst svo forskoðunin og staðfestingin sýni NÚVERANDI val.
        try { await vistaSjalfvirkt(lesaReiti()); await saekjaForskodun(); } catch (e) { R().toast('Vistun mistókst: ' + (e.message || e)); return; }
        const a = (forskodun && forskodun.aaetlad) || [];
        const texti = 'Kveikja á sjálfvirkum SMS-áminningum?\n\n' +
          (a.length
            ? 'Með þessum stillingum fengju ' + Math.min(a.length, forskodun.hamarkPerKeyrslu || 10) + ' viðskiptavinir skilaboð í næstu keyrslu (kl. 10:00): ' + a.slice(0, 5).map(v => v.nafn || v.til).join(', ') + (a.length > 5 ? ' o.fl.' : '') + '.'
            : 'Enginn fengi skilaboð í næstu keyrslu með þessum stillingum.') +
          '\n\nHægt að slökkva hvenær sem er.';
        if (!(await R().jaNei(texti, 'Kveikja'))) return;
      }
      try { await vistaSjalfvirkt({ virkt: kveikja }); R().toast(kveikja ? '✓ Sjálfvirkar áminningar kveiktar' : 'Sjálfvirkar áminningar slökktar'); teikna(); saekjaForskodun(); }
      catch (e) { R().toast('Vistun mistókst: ' + (e.message || e)); }
    });
  }

  function teiknaSogu() {
    if (saga == null) return '<div class="ss-note">Sæki sögu…</div>';
    const rodir = saga.map(r => {
      const d = new Date(r.created_at);
      const tm = isNaN(d) ? '' : R().dagsTimi(r.created_at);
      const ok = r.status === 'sent', bid = r.status === 'pending';
      return `<tr>
        <td style="white-space:nowrap">${esc(tm)}</td>
        <td>${esc(r.nafn || '')}<div class="ss-note">${esc(r.til)}</div></td>
        <td>${esc(heitiTegundar(r.tegund))}${r.uppruni ? `<div class="ss-note">${esc(r.uppruni)}</div>` : ''}</td>
        <td title="${esc(r.texti)}">${esc(String(r.texti).length > 80 ? String(r.texti).slice(0, 80) + '…' : r.texti)}</td>
        <td class="${ok ? 'ss-st-ok' : bid ? '' : 'ss-st-bad'}">${ok ? 'Sent' : bid ? 'Óvíst (sent eða í gangi)' : 'Mistókst'}${!ok && r.villa ? `<div class="ss-note" style="font-weight:400">${esc(r.villa)}</div>` : ''}</td>
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
    const flipar = [['senda', 'Senda'], ['sjalfvirkt', 'Sjálfvirkt'], ['tegundir', 'Tegundir skilaboða'], ['saga', 'Saga']];
    wrap.querySelector('#sms-stjorn').innerHTML = `
      <div class="ss-hd">
        <h3>SMS-stjórnborð</h3>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="ss-pill ${stada ? (virkt ? 'ok' : 'nei') : ''}">${stada ? ('Twilio á þjóni: ' + (virkt ? 'já' : 'nei')) : 'Athuga Twilio…'}</span>
          <button class="ss-x" id="ss-loka" aria-label="Loka">×</button>
        </div>
      </div>
      <div class="ss-tabs">${flipar.map(([k, t]) => `<button class="ss-tab ${flipi === k ? 'on' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
      <div class="ss-body" id="ss-body">${flipi === 'senda' ? teiknaSenda() : flipi === 'sjalfvirkt' ? teiknaSjalfvirkt() : flipi === 'tegundir' ? teiknaTegundir() : teiknaSogu()}</div>`;
    wrap.querySelector('#ss-loka').onclick = lokaBord;
    wrap.querySelectorAll('.ss-tab').forEach(b => b.addEventListener('click', async () => {
      flipi = b.getAttribute('data-f');
      if (flipi === 'saga') { saga = null; teikna(); await saekjaSogu(); teikna(); return; }
      if (flipi === 'sjalfvirkt') { teikna(); saekjaForskodun(); return; }
      teikna();
    }));
    if (flipi === 'senda') bindaSenda();
    else if (flipi === 'sjalfvirkt') bindaSjalfvirkt();
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
    if (flipi === 'sjalfvirkt') saekjaForskodun();
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
