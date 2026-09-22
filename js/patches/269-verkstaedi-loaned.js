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
  const DISP = { yfirferd: 'Yfirfarið', hladid: 'Hlaðið', onytt: 'Ónýtt', nytt: 'Keypt nýtt' };   // 22.09: án emoji (Miðakerfi)

  let _shop = [], _loadedAt = 0, _busy = false, _injecting = false;

  async function loadShop(force) {
    if (!(window.DB && DB.sb)) { _shop = []; return; }
    if (!force && Date.now() - _loadedAt < 8000) return;
    try {
      _shop = await DB.fetchAll((from, to) => DB.sb.from('uttaeki').select('id,client,type,size,serial,status,custody_status,service_choice').eq('status', 'loaned').order('id').range(from, to));
      _loadedAt = Date.now();
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

  // ── HTML ── 22.09.2026 (Agnar: „improve a bit the look of tæki coming from
  // samningshafar"): Miðakerfis-útlit — hvert tæki er smá-miði með tegundarrönd,
  // skýrri stöðulínu (Nýkomið · Á verkstæði · Tilbúið · Farið) og þjónustuvalinu
  // sem 2×2 hnappaneti í stað fjögurra staflaðra emoji-raða. Sömu aðgerðir og
  // áður: window.VkLoaned.act / del / close (inline onclick — áreiðanlegt í appinu).
  const SV = (body, sw) => '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2.4) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  const IC = {
    check: SV('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
    bolt: SV('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', 2.2),
    ban: SV('<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>'),
    plus: SV('<path d="M12 5v14M5 12h14"/>'),
    x: SV('<path d="M18 6 6 18M6 6l12 12"/>', 2.6),
    out: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    truck: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 4h14v12H1z"/><path d="M15 9h4l3 3v4h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg>',
  };
  const typeColor = s => {
    try { return typeof window.SlokkTypeColor === 'function' ? window.SlokkTypeColor({ nafn: s }) : null; } catch (_) { return null; }
  };
  const actBtn = (id, act, label, icon, kind) =>
    '<button type="button" class="vkl-act vkl-act--' + kind + '" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.act(\'' + id + '\',\'' + act + '\')">' + icon + '<span>' + label + '</span></button>';
  const STATE = {
    'null':  { cls: 'nytt',    label: () => 'Nýkomið' },
    komid:   { cls: 'komid',   label: () => 'Á verkstæði' },
    tilbuid: { cls: 'tilbuid', label: u => 'Tilbúið' + (DISP[u.service_choice] ? ' · ' + DISP[u.service_choice] : '') },
    farid:   { cls: 'farid',   label: u => 'Farið' + (DISP[u.service_choice] ? ' · ' + DISP[u.service_choice] : '') },
  };
  function sectionHtml() {
    const grp = byClient();
    const tile = (u) => {
      const cs = u.custody_status || 'null';
      const st = STATE[cs] || STATE['null'];
      const typeRaw = String(u.type || 'Tæki').split(/\s+/).slice(0, 2).join(' ');
      const label = typeRaw + (u.size ? ' ' + u.size : '');
      const serialShort = String(u.serial || '').replace(/^.*-/, '').slice(0, 8);
      const col = typeColor(typeRaw + ' ' + (u.size || ''));
      let foot = '';
      if (cs === 'null') foot = '<div class="vkl-foot vkl-foot--one">' + actBtn(u.id, 'komid', 'Komið', IC.check, 'komid') + '</div>';
      else if (cs === 'komid') foot = '<div class="vkl-foot">' +
        actBtn(u.id, 'yfirferd', 'Yfirfarið', IC.check, 'ok') + actBtn(u.id, 'hladid', 'Hlaðið', IC.bolt, 'hlada') +
        actBtn(u.id, 'onytt', 'Ónýtt', IC.ban, 'onytt') + actBtn(u.id, 'nytt', 'Nýtt', IC.plus, 'nyr') + '</div>';
      // „Sótt" LÝKUR lífsferlinum (close → þjónustan skráð á tækið) — sama og áður.
      else if (cs === 'tilbuid') foot = '<div class="vkl-foot vkl-foot--one">' + actBtn(u.id, 'sott', 'Sótt', IC.out, 'sott') + '</div>';
      else if (cs === 'farid') foot = '<div class="vkl-foot vkl-foot--one">' + actBtn(u.id, 'sott', 'Ljúka (sótt)', IC.check, 'sott') + '</div>';
      return '<div class="vkl-tile"' + (col ? ' style="--vkm-type:' + esc(col) + '"' : '') + ' title="' + esc((u.serial || '') + ' — ' + label) + '">' +
          '<button type="button" class="vkl-x" aria-label="Eyða tæki" title="Eyða tæki (ef mistalið úr skýrslu)" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.del(\'' + u.id + '\')">' + IC.x + '</button>' +
          '<div class="vkl-body">' +
            '<div class="vkl-ty">' + esc(label) + '</div>' +
            (serialShort ? '<div class="vkl-ser">' + esc(serialShort) + '</div>' : '') +
            '<div class="vkl-st vkl-st--' + st.cls + '"><i aria-hidden="true"></i>' + esc(st.label(u)) + '</div>' +
          '</div>' +
          foot +
        '</div>';
    };
    const cards = grp.length ? grp.map(g =>
      '<div class="vkl-grp">' +
        '<div class="vkl-grp-h"><span class="vkl-name">' + esc(g.client) + '</span><span class="vkl-meta">' + g.items.length + ' tæki · komið úr þjónustu</span></div>' +
        '<div class="vkl-tiles">' + g.items.map(tile).join('') + '</div>' +
      '</div>').join('')
      : '<div class="vkl-empty">Engin tæki komin úr þjónustu núna.</div>';
    return '<div id="_vk-loaned">' +
      '<div class="vkl-sec">' + IC.truck + '<span class="vkl-sec-lbl">Komið úr þjónustu</span>' +
        (_shop.length ? '<span class="vkl-sec-n">' + _shop.length + ' tæki</span>' : '') +
        '<span class="vkl-rule" aria-hidden="true"></span></div>' +
      cards +
    '</div>';
  }

  // Stílar — Miðakerfi (sömu litir og 389/390); #view-workshop #_vk-loaned í hverri reglu.
  // ATH klasanöfn mega ekki bera „-card" — 230 stílar .view [class*="-card"] með !important.
  if (!document.getElementById('_vkl-css')) {
    const W = '#view-workshop #_vk-loaned ';
    const MONO = '"JetBrains Mono",ui-monospace,monospace';
    const GREEN_METAL = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const css = [
      '#view-workshop #_vk-loaned{margin-bottom:12px}',
      W + '.vkl-sec{display:flex;align-items:center;gap:8px;margin:2px 2px 8px;color:#3a4250}',
      W + '.vkl-sec-lbl{font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250}',
      W + '.vkl-sec-n{padding:1px 7px;border-radius:99px;background:rgba(20,24,34,.09);font-family:' + MONO + ';font-size:10.5px;font-weight:700;color:#2b313c}',
      W + '.vkl-rule{flex:1 1 auto;height:1px;background:rgba(20,24,34,.16)}',
      W + '.vkl-grp{margin-bottom:8px;padding:10px 12px 12px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,34,.07),0 1px 1px rgba(15,20,30,.2),0 6px 12px rgba(15,20,30,.1)}',
      W + '.vkl-grp-h{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;margin-bottom:8px}',
      W + '.vkl-name{font-size:14.5px;font-weight:600;color:#11141c}',
      W + '.vkl-meta{font-size:12px;color:#5b6472}',
      W + '.vkl-tiles{display:flex;flex-wrap:wrap;gap:8px}',
      W + '.vkl-tile{position:relative;width:150px;overflow:hidden;border:1px solid rgba(20,24,34,.13);border-radius:9px;background:#fff;box-shadow:inset 3px 0 0 var(--vkm-type,transparent),0 1px 2px rgba(15,20,30,.1),0 4px 10px -6px rgba(15,20,30,.25)}',
      W + '.vkl-x{position:absolute;top:0;right:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:0 0 0 7px;background:transparent;color:#8a93a3;cursor:pointer}',
      W + '.vkl-x:hover{background:rgba(201,42,42,.12);color:#b42318}',
      W + '.vkl-body{padding:6px 24px 6px 10px}',
      W + '.vkl-ty{font-size:10.5px;font-weight:600;color:#11141c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      W + '.vkl-ser{margin-top:2px;font-family:' + MONO + ';font-size:9.5px;font-weight:500;color:#6b7483}',
      W + '.vkl-st{display:flex;align-items:center;gap:5px;margin-top:4px;font-size:10.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      W + '.vkl-st i{flex:none;width:6px;height:6px;border-radius:50%}',
      W + '.vkl-st--nytt{color:#4a5363}' + W + '.vkl-st--nytt i{background:#8a93a3}',
      W + '.vkl-st--komid{color:#1d4ed8}' + W + '.vkl-st--komid i{background:#2563eb}',
      W + '.vkl-st--tilbuid{color:#0b6b3a}' + W + '.vkl-st--tilbuid i{background:#16783f}',
      W + '.vkl-st--farid{color:#6d28d9}' + W + '.vkl-st--farid i{background:#7c3aed}',
      W + '.vkl-foot{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:0 6px 6px}',
      W + '.vkl-foot--one{grid-template-columns:1fr}',
      W + '.vkl-act{height:26px;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:4px;margin:0;padding:0 4px;border-radius:7px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);color:#3a4250;font:700 10.5px/1 "IBM Plex Sans",system-ui,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}',
      W + '.vkl-act span{overflow:hidden;text-overflow:ellipsis}',
      W + '.vkl-act:hover{border-color:rgba(201,42,42,.45)}',
      W + '.vkl-act--ok{color:#1d4ed8}' + W + '.vkl-act--hlada{color:#0b6b3a}' + W + '.vkl-act--onytt{color:#b42318}' + W + '.vkl-act--nyr{color:#845400}',
      W + '.vkl-act--komid{border-color:#000;background:' + METAL + ';color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}',
      W + '.vkl-act--sott{border-color:rgba(52,168,98,.55);background:' + GREEN_METAL + ';color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 12px -5px rgba(22,140,72,.65)}',
      W + '.vkl-act--komid:hover,' + W + '.vkl-act--sott:hover{filter:brightness(1.2)}',
      W + '.vkl-empty{padding:16px 8px;color:#525b6b;font-size:12px;text-align:center}',
    ].join('\n');
    const st = document.createElement('style');
    st.id = '_vkl-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
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
    const delMsg = 'Eyða þessu tæki? (t.d. ef mistalið úr skýrslu)';
    const delOk = (window.Confirm && Confirm.show) ? await Confirm.show(delMsg) : window.confirm(delMsg);
    if (!delOk) return;
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
