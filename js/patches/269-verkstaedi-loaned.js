/* === VERKSTÆÐI: KOMIÐ ÚR ÞJÓNUSTU (á verkstæði tæki) v1 ===
 *
 * Ósk Agnars (2026-07-14): tækin sem bílstjóri hakar „🔵 Á verkstæði"
 * (uttaeki.status='loaned') birtast á Aksturslista-síðunni — láta þau líka
 * birtast á VERKSTÆÐI-síðunni (view-workshop) efst í Samningshafar-súlunni
 * (.bw-sh-body), með sama verkstæðis-lífsferli (custody_status):
 *   null (Nýkomið) → komid → tilbuid (+service_choice hladid/onytt/nytt) → farid.
 *
 * Sjálfstætt: bætir AÐEINS við einni sektíon efst í .bw-sh-body — snertir ekki
 * verkbeiðna-rökfræði patch 78/122. Endur-teiknar þegar Workshop.render() hreinsar
 * (MutationObserver á #view-workshop). Skrifar beint í uttaeki (sama og patch 268).
 */
(() => {
  if (window.__vkLoanedInstalled) return;
  window.__vkLoanedInstalled = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CUSTODY = {
    'null':  { label: 'Nýkomið', col: '#64748b' },
    komid:   { label: 'Komið á verkstæði', col: '#2563eb' },
    tilbuid: { label: 'Tilbúið', col: '#059669' },
    farid:   { label: 'Farið af verkstæði', col: '#7c3aed' },
  };
  const DISP = { yfirferd: '✅ Yfirfarið', hladid: '🔋 Hlaðið', onytt: '❌ Ónýtt', nytt: '🆕 Keypt nýtt' };

  let _shop = [], _loadedAt = 0, _busy = false, _injecting = false;

  async function loadShop(force) {
    if (!(window.DB && DB.sb)) { _shop = []; return; }
    if (!force && Date.now() - _loadedAt < 8000) return;
    try {
      const r = await DB.sb.from('uttaeki').select('id,client,type,size,serial,status,custody_status,service_choice').eq('status', 'loaned').limit(2000);
      _shop = r.data || []; _loadedAt = Date.now();
    } catch (_) {}
  }
  async function saveCustody(id, patch) {
    if (!(window.DB && DB.sb)) return false;
    try { const r = await DB.sb.from('uttaeki').update(patch).eq('id', id); return !(r && r.error); } catch (_) { return false; }
  }
  async function deleteUnit(id) {
    if (!(window.DB && DB.sb)) return false;
    try { const r = await DB.sb.from('uttaeki').delete().eq('id', id); return !(r && r.error); } catch (_) { return false; }
  }
  function byClient() {
    const m = {};
    _shop.forEach(u => { const k = u.client || '— óþekkt —'; (m[k] = m[k] || []).push(u); });
    return Object.keys(m).sort((a, b) => m[b].length - m[a].length || a.localeCompare(b, 'is')).map(k => ({ client: k, items: m[k] }));
  }

  // ── HTML ── notar SÖMU .bw-row spjaldform og VERK-súlan vinstra megin
  // (patch 78) svo útlitið passi. Smellir fara gegnum inline onclick →
  // window.VkLoaned.act/del (sama áreiðanlega mynstur og Counter.* í appinu;
  // umsjónar-hlustun var étin af annarri capture-hlustun á lifandi síðunni).
  function sectionHtml() {
    const grp = byClient();
    // Rólegur stíll (2026-07-30, Verkefnalisti 710f64e0): hnappar/chippar hér
    // fylgja SAMA dempaða útlitinu og VERK-súlan vinstra megin (.bw-chk.no í
    // patch 78) — hvítur/ljós grunnur, þunnt #e2e8f0 skil, liturinn aðeins sem
    // dauf vísbending í TEXTANUM (ekki sterk fylling). Virkni óbreytt.
    const stBtn = (id, act, label, col) =>
      '<button type="button" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.act(\'' + id + '\',\'' + act + '\')" ' +
        'style="border:1px solid #e2e8f0;background:#fff;color:' + col + ';border-radius:7px;padding:5px 10px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer">' + label + '</button>';
    // lítið Eyða-merki (🗑) — fjarlægir tækið ef mistalið úr skýrslu
    const delBtn = (id) =>
      '<button type="button" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.del(\'' + id + '\')" title="Eyða tæki" ' +
        'style="border:0;background:transparent;color:#b91c1c;border-radius:5px;padding:2px 4px;font-size:13px;line-height:1;cursor:pointer;opacity:.55">🗑</button>';
    // Tæki birtast sem SÖMU .bw-tile flísar og VERK-súlan vinstra megin (patch 78)
    // — sama flísaform (tegund + raðnúmer), en umsjónar-aðgerðirnar (Komið →
    // Hlaðið/Ónýtt/Nýtt → Farið) sitja sem fullbreiðir hnappar neðst í flísinni.
    // — sama form og .bw-chk.no vinstra megin: hvítur grunnur, #e2e8f0 skil,
    // litur aðeins í texta (dauf stöðuvísbending í stað sterkrar fyllingar).
    const footBtn = (id, act, label, col) =>
      '<button type="button" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.act(\'' + id + '\',\'' + act + '\')" ' +
        'style="display:block;width:100%;border:0;border-top:1px solid #e2e8f0;background:#fff;color:' + col + ';padding:4px 2px;font:inherit;font-size:10px;font-weight:700;cursor:pointer;line-height:1.3">' + label + '</button>';
    const chip = (txt, bg, fg, bd) =>
      '<div style="padding:4px 3px;background:' + bg + ';color:' + fg + ';font-size:9.5px;font-weight:700;text-align:center;line-height:1.25' + (bd ? ';border-top:1px solid ' + bd : '') + '">' + txt + '</div>';
    const tile = (u) => {
      const cs = u.custody_status || 'null';
      const typeRaw = String(u.type || 'Tæki').split(/\s+/).slice(0, 2).join(' ');
      const label = typeRaw + (u.size ? ' ' + u.size : '');
      const serialShort = String(u.serial || '').replace(/^.*-/, '').slice(0, 8);
      let foot = '';
      if (cs === 'null') foot = footBtn(u.id, 'komid', '✅ Komið', '#2563eb');
      else if (cs === 'komid') foot = footBtn(u.id, 'yfirferd', '✅ Yfirfarið', '#2563eb') + footBtn(u.id, 'hladid', '🔋 Hlaðið', '#16a34a') + footBtn(u.id, 'onytt', '❌ Ónýtt', '#dc2626') + footBtn(u.id, 'nytt', '🆕 Nýtt', '#d97706');
      else if (cs === 'tilbuid') foot = chip('Tilbúið til útkeyrslu', '#dcfce7', '#166534') + chip(DISP[u.service_choice] || 'Tilbúið', '#f0fdf4', '#166534', '#e2e8f0') + footBtn(u.id, 'sott', '🚚 Sótt', '#7c3aed');
      // Eldri raðir sem sátu í 'farid' (áður „Bíður skila") — leyfa að ljúka þeim
      // svo þjónustan skráist á tækið og það fari af borðinu.
      else if (cs === 'farid') foot = chip(DISP[u.service_choice] || 'Sótt', '#f0fdf4', '#166534', '#e2e8f0') + footBtn(u.id, 'sott', '✅ Ljúka (sótt)', '#7c3aed');
      return '<div class="bw-tile" title="' + esc((u.serial || '') + ' — ' + label) + '">' +
          '<button class="bw-tile-x" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.del(\'' + u.id + '\')" title="Eyða tæki (ef mistalið úr skýrslu)">✕</button>' +
          '<div class="bw-tile-body">' +
            '<div class="bw-tile-ty">' + esc(label) + '</div>' +
            (serialShort ? '<div class="bw-tile-ser">' + esc(serialShort) + '</div>' : '') +
          '</div>' +
          foot +
        '</div>';
    };
    // eitt .bw-row spjald per fyrirtæki (sama chrome og VERK vinstra megin) með
    // .bw-tiles flísaröð innan í — nákvæmlega eins og VERK-súlan.
    // sama .bw-row chrome og vinstra megin — engin sér-litun á vinstri rönd
    const cards = grp.length ? grp.map(g =>
      '<div class="bw-row">' +
        '<div class="bw-cinfo" style="width:auto;flex:1 1 100%">' +
          '<div class="bw-cname">' + esc(g.client) + '</div>' +
          '<div class="bw-cmeta">' + g.items.length + ' tæki · komið úr þjónustu</div>' +
        '</div>' +
        '<div class="bw-tiles" style="margin-top:8px">' + g.items.map(tile).join('') + '</div>' +
      '</div>').join('')
      : '<div style="padding:16px 8px;color:#94a3b8;font-size:12px;text-align:center">Engin tæki komin úr þjónustu núna.</div>';
    return '<div id="_vk-loaned" style="margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin:0 2px 8px">' +
        '<span style="font-size:12px;font-weight:700;letter-spacing:.06em;color:#3a4250">🚚 KOMIÐ ÚR ÞJÓNUSTU</span>' +
        // teljarinn dempaður eins og .bw-shd-n/.bw-cnum (mono, grár) — ekki blár
        (_shop.length ? '<span style="margin-left:auto;font-family:\'Space Mono\',monospace;font-size:12px;color:#9098a6">' + _shop.length + ' tæki</span>' : '') +
      '</div>' + cards +
    '</div>';
  }

  // Aðgerðir — inline onclick kallar þessar (áreiðanlegt í þessu appi).
  async function act(id, a) {
    if (a === 'sott') return close(id);   // lokun með þjónustu-skráningu (Fasi 2)
    const P = { komid: { custody_status: 'komid' }, yfirferd: { custody_status: 'tilbuid', service_choice: 'yfirferd' },
      hladid: { custody_status: 'tilbuid', service_choice: 'hladid' },
      onytt: { custody_status: 'tilbuid', service_choice: 'onytt' }, nytt: { custody_status: 'tilbuid', service_choice: 'nytt' } }[a];
    if (!P) return;
    const local = _shop.find(u => String(u.id) === String(id)); if (local) Object.assign(local, P);
    _loadedAt = Date.now(); await inject(false);   // sýna nýja stöðu strax
    await saveCustody(id, P);
    await loadShop(true); inject(true);
  }

  // ── „🚚 Sótt" = LJÚKA lífsferli: skrá framkvæmda þjónustu á tækið (Fasi 2) ──
  // Þjónustuvalið (service_choice) ræður útkomunni á uttaeki — svo skýrslan/öll
  // borðin (Bílstjóri, Leiðsögn, Aksturslisti, útrunnin-listar) sýni hvað var gert:
  //   • ónýtt            → status='onytt' (dettur úr virkum búnaði)
  //   • yfirferð/hleðsla/nýtt → status='ok' + last_insp=í dag, next_insp=+12 mán
  //     (yfirfarið & í gildi — sama og Bílstjóri 219 gerir á „🟢 Yfirfarið")
  // custody_status/service_choice hreinsast svo tækið fer af verkstæðis-borðinu.
  async function close(id) {
    const u = _shop.find(x => String(x.id) === String(id));
    const sc = u && u.service_choice;
    const today = new Date().toISOString().slice(0, 10);
    const nextY = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); })();
    const patch = (sc === 'onytt')
      ? { status: 'onytt', custody_status: null, service_choice: null }
      : { status: 'ok', last_insp: today, next_insp: nextY, custody_status: null, service_choice: null };
    _shop = _shop.filter(x => String(x.id) !== String(id));   // hverfa strax af borðinu
    _loadedAt = Date.now(); await inject(false);
    const ok = await saveCustody(id, patch);
    try { if (ok && window.Toast && Toast.show) Toast.show('✓ Tilbúið sótt' + (sc ? ' · ' + (DISP[sc] || sc) + ' skráð' : '')); } catch (_) {}
    await loadShop(true); inject(true);
  }
  async function del(id) {
    if (!window.confirm('Eyða þessu tæki? (t.d. ef mistalið úr skýrslu)')) return;
    _shop = _shop.filter(u => String(u.id) !== String(id));
    _loadedAt = Date.now(); await inject(false);   // hverfa strax
    await deleteUnit(id);
    await loadShop(true); inject(true);
  }

  async function inject(force) {
    const bodies = document.querySelectorAll('#view-workshop .bw-sh-body');
    if (!bodies.length) return;
    if (_busy) return; _busy = true;
    try {
      await loadShop(force);
      _injecting = true;
      bodies.forEach(body => {
        const old = body.querySelector('#_vk-loaned');
        if (old) old.remove();
        body.insertAdjacentHTML('afterbegin', sectionHtml());
      });
      setTimeout(() => { _injecting = false; }, 30);
    } finally { _busy = false; }
  }

  // fylgjast með view-workshop: þegar Workshop.render() endurbyggir → sprauta aftur
  function watch() {
    let t = null;
    const obs = new MutationObserver(() => {
      if (_injecting) return;
      const vw = document.getElementById('view-workshop');
      if (!vw || vw.style.display === 'none') return;
      const body = vw.querySelector('.bw-sh-body');
      if (body && !body.querySelector('#_vk-loaned')) { clearTimeout(t); t = setTimeout(() => inject(false), 120); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('view-shown', e => { if (e && e.detail && e.detail.name === 'workshop') setTimeout(() => inject(true), 200); });
    // Öryggis-tikk: sprauta strax + reglulega ef verkstæðis-súlan er sýnileg og
    // sektíónin vantar (MutationObserver missir af þegar DOM breytist ekki).
    const tick = () => {
      const vw = document.getElementById('view-workshop');
      if (!vw || vw.style.display === 'none') return;
      const body = vw.querySelector('.bw-sh-body');
      if (body && !body.querySelector('#_vk-loaned')) inject(false);
    };
    tick(); setInterval(tick, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();

  window.VkLoaned = { inject: () => inject(true), act: act, del: del, close: close };
  console.log('[verkstaedi-loaned] v7 installed (+ rólegur stíll eins og VERK-súlan)');
})();
/* === END VERKSTÆÐI: KOMIÐ ÚR ÞJÓNUSTU === */
