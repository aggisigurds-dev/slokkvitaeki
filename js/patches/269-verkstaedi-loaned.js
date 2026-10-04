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
    // 29.09.2026 (422, Agnar: „aðeins í verkbeiðninni"): hvaða tæki eiga opna verkbeiðni (122 Sækja inn)?
    try { if (window.VerkTenging && _shop.length) await VerkTenging.ensure(_shop.map(u => u.id)); } catch (_) {}
  }
  // Tæki í opinni verkbeiðni er unnið í Verkröðinni (Tilbúið / Ónýtt → Sótt ✓ = reikningur). Hér er það aðeins
  // sýnt — takkarnir hér skrifuðu beint á tækið án reiknings, og tækið var þá rakið á tveimur stöðum.
  const iVerki = (u) => {
    try { const s = window.VerkTenging && VerkTenging.stada(u.id); return (s && !s.stadfest) ? s : null; } catch (_) { return null; }
  };
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
      const vs = iVerki(u);
      if (vs) {
        const lbl = vs.kind === 'tilbuid' ? 'Tilbúið' + (vs.svcLabel ? ' · ' + vs.svcLabel : '') : vs.kind === 'onytt' ? 'Ónýtt' : 'Á verkstæði';
        const cls = vs.kind === 'tilbuid' ? 'tilbuid' : vs.kind === 'onytt' ? 'onytt' : 'komid';
        return '<div class="vkl-tile vkl-tile--verk"' + (col ? ' style="--vkm-type:' + esc(col) + '"' : '') + ' title="' + esc((u.serial || '') + ' — unnið í verkbeiðni ' + vs.num) + '">' +
            '<div class="vkl-body">' +
              '<div class="vkl-ty">' + esc(label) + '</div>' +
              (serialShort ? '<div class="vkl-ser">' + esc(serialShort) + '</div>' : '') +
              '<div class="vkl-st vkl-st--' + cls + '"><i aria-hidden="true"></i>' + esc(lbl) + '</div>' +
            '</div>' +
            '<div class="vkl-foot vkl-foot--one"><span class="vkl-iverki">í verki ' + esc(vs.num) + '</span></div>' +
          '</div>';
      }
      let foot = '';
      // 04.10.2026 (Agnar: „þarf samt að geta hakað í Hlaðið, Ónýtt og bætt við varahlut" · „hafðu þetta liðugt"):
      // þjónustutakkarnir birtast STRAX á nýkomnu tæki (áður fyrst „Komið"), Tilbúið fær „Breyta" ef rangt var valið,
      // og „+ Varahlutur" fer sem aukalína í lokaútreikning fyrirtækisins (129) — rukkast í lokin eins og venjulega.
      const thjon = actBtn(u.id, 'yfirferd', 'Yfirfarið', IC.check, 'ok') + actBtn(u.id, 'hladid', 'Hlaðið', IC.bolt, 'hlada') +
        actBtn(u.id, 'onytt', 'Ónýtt', IC.ban, 'onytt') + actBtn(u.id, 'nytt', 'Nýtt', IC.plus, 'nyr');
      const hluti = '<button type="button" class="vkl-hluti" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.hluti(\'' + u.id + '\')">' + IC.plus + '<span>Varahlutur</span></button>';
      if (cs === 'null' || cs === 'komid') foot = '<div class="vkl-foot">' + thjon + '</div>' + '<div class="vkl-foot vkl-foot--one">' + hluti + '</div>';
      // „Sótt" LÝKUR lífsferlinum (close → þjónustan skráð á tækið) — sama og áður.
      else if (cs === 'tilbuid') foot = '<div class="vkl-foot">' + actBtn(u.id, 'sott', 'Sótt', IC.out, 'sott') + actBtn(u.id, 'komid', 'Breyta', IC.check, 'breyta') + '</div>' +
        '<div class="vkl-foot vkl-foot--one">' + hluti + '</div>';
      else if (cs === 'farid') foot = '<div class="vkl-foot vkl-foot--one">' + actBtn(u.id, 'sott', 'Ljúka (sótt)', IC.check, 'sott') + '</div>';
      return '<div class="vkl-tile"' + (col ? ' style="--vkm-type:' + esc(col) + '"' : '') + ' title="' + esc((u.serial || '') + ' — ' + label) + '">' +
          '<button type="button" class="vkl-x" aria-label="Eyða tæki" title="Eyða tæki (ef mistalið úr skýrslu)" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.del(\'' + u.id + '\')">' + IC.x + '</button>' +
          '<div class="vkl-body">' +
            '<div class="vkl-ty">' + esc(label) + '</div>' +
            (serialShort ? '<div class="vkl-ser">' + esc(serialShort) + '</div>' : '') +
            '<div class="vkl-st vkl-st--' + st.cls + '"><i aria-hidden="true"></i>' + esc(st.label(u)) + '</div>' +
            (() => { const h = hlutir(u); return h.length ? '<div class="vkl-hl" title="' + esc(h.map(x => x.name).join('\n')) + '">' + h.length + (h.length === 1 ? ' varahlutur' : ' varahlutir') + '</div>' : ''; })() +
          '</div>' +
          foot +
        '</div>';
    };
    const meta = (items) => {
      const nums = [...new Set(items.map(u => { const s = iVerki(u); return s ? s.num : ''; }))];
      return (nums.length === 1 && nums[0]) ? 'í verki ' + nums[0] + ' — unnið í Verkröðinni' : 'komið úr þjónustu';
    };
    // 04.10.2026 (Agnar: „bara fyrir okkur að sjá hvað séu mörg af þeim tilbúin svo við getum látið bílstjórann sækja
    // þau og skilað þeim"): tilbúin = custody 'tilbuid' (þessi lífsferill) eða tilbúið í verkbeiðni (422).
    const erTilbuid = (u) => { const v = iVerki(u); return v ? v.kind === 'tilbuid' : u.custody_status === 'tilbuid'; };
    const tilbN = (items) => items.filter(erTilbuid).length;
    const cards = grp.length ? grp.map(g =>
      '<div class="vkl-grp" data-client="' + esc(g.client) + '">' +
        '<div class="vkl-grp-h"><span class="vkl-name">' + esc(g.client) + '</span><span class="vkl-meta">' + g.items.length + ' tæki' +
          (tilbN(g.items) ? ' · <b class="vkl-tilb">' + tilbN(g.items) + ' tilbúin</b>' : '') + ' · ' + esc(meta(g.items)) + '</span>' +
          '<button type="button" class="vkl-prenta" title="Prenta QR-miða fyrir öll tæki fyrirtækisins á verkstæðinu (Brother, sama og í Sölu)" onclick="event.stopPropagation();window.VkLoaned&&VkLoaned.prenta(this.closest(\'.vkl-grp\').dataset.client)">Prenta miða</button>' +
          '</div>' +
        '<div class="vkl-tiles">' + g.items.map(tile).join('') + '</div>' +
      '</div>').join('')
      : '<div class="vkl-empty">Engin tæki komin úr þjónustu núna.</div>';
    return '<div id="_vk-loaned">' +
      '<div class="vkl-sec">' + IC.truck + '<span class="vkl-sec-lbl">Komið úr þjónustu</span>' +
        (_shop.length ? '<span class="vkl-sec-n">' + _shop.length + ' tæki</span>' : '') +
        (tilbN(_shop) ? '<span class="vkl-sec-n vkl-sec-n--tilb">' + tilbN(_shop) + ' tilbúin</span>' : '') +
        '<span class="vkl-rule" aria-hidden="true"></span>' +
        // „+ Merkja tæki" (122 merkja-hamur): velja fyrirtæki og tæki — bara merki, enginn reikningur
        '<button type="button" class="vkl-merkja" title="Velja fyrirtæki og tæki sem eru á verkstæði — bara merki, enginn reikningur" onclick="event.stopPropagation();window.SamningshafarReceive&&SamningshafarReceive.open(true)">+ Merkja tæki</button>' +
      '</div>' +
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
      W + '.vkl-sec{flex-wrap:wrap!important;row-gap:6px!important}',
      W + '.vkl-sec .vkl-rule{min-width:12px}',
      W + '.vkl-sec-n--tilb{color:#0b6b3a!important;font-weight:800!important}',
      W + '.vkl-tilb{color:#0b6b3a;font-weight:800}',
      W + '.vkl-merkja{flex:none;height:28px;min-height:0;padding:0 10px;border-radius:7px;border:1px solid rgba(20,24,34,.18);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.14);color:#1f2530;font:600 12px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;white-space:nowrap;margin-left:auto}',
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
      W + '.vkl-act--breyta{color:#3a4250}',
      W + '.vkl-hluti{height:26px;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:4px;margin:0;padding:0 6px;border-radius:7px;border:1px dashed rgba(20,24,34,.32);background:transparent;color:#3a4250;font:600 11.5px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer}',
      W + '.vkl-hluti:hover{border-style:solid;background:rgba(20,24,34,.05)}',
      W + '.vkl-hl{margin-top:3px;font:700 10.5px ' + MONO + ';color:#845400}',
      W + '.vkl-grp-h{flex-wrap:wrap}',
      W + '.vkl-prenta{margin-left:auto;height:26px;padding:0 10px;border-radius:7px;border:1px solid rgba(20,24,34,.18);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.14);color:#1f2530;font:600 11.5px "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;white-space:nowrap}',
      W + '.vkl-act--sott{border-color:rgba(52,168,98,.55);background:' + GREEN_METAL + ';color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 12px -5px rgba(22,140,72,.65)}',
      W + '.vkl-act--komid:hover,' + W + '.vkl-act--sott:hover{filter:brightness(1.2)}',
      W + '.vkl-empty{padding:16px 8px;color:#525b6b;font-size:12px;text-align:center}',
      // 422: tæki í opinni verkbeiðni — plata í stað takka
      W + '.vkl-st--onytt{color:#b42318}' + W + '.vkl-st--onytt i{background:#c92a2a}',
      W + '.vkl-iverki{height:26px;display:flex;align-items:center;justify-content:center;border-radius:7px;border:1px solid rgba(20,24,34,.12);background:#eef1f6;box-shadow:inset 0 2px 4px rgba(0,0,0,.08);font-family:' + MONO + ';font-size:10px;font-weight:700;color:#3a4250;letter-spacing:.02em}',
    ].join('\n');
    const st = document.createElement('style');
    st.id = '_vkl-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  // Aðgerðir — inline onclick kallar þessar (áreiðanlegt í þessu appi).
  // ── Varahlutur → aukalína í lokaútreikningi fyrirtækisins (129: slokk_trip_<coId>.extras; 227 speglar á þjóninn) ──
  function coFor(client) {
    const nafn = String(client || '').trim(); if (!nafn) return null;
    const L = (window.Companies && Companies.list) || [];
    const kt = nafn.replace(/\D/g, '');
    const c = L.find(x => String(x.nafn || '').trim() === nafn) || (kt.length === 10 ? L.find(x => String(x.kennitala || '').replace(/\D/g, '') === kt) : null);
    return c ? c.id : null;
  }
  function lesaFerd(coId) { try { return JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}') || {}; } catch (_) { return {}; } }
  function hlutir(u) {
    const coId = coFor(u.client); if (!coId) return [];
    const st = lesaFerd(coId);
    return (Array.isArray(st.extras) ? st.extras : []).filter(x => x && String(x.uttaeki_id) === String(u.id));
  }
  function hluti(id) {
    const u = _shop.find(x => String(x.id) === String(id)); if (!u) return;
    const coId = coFor(u.client);
    const toast = m => { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} };
    if (!coId) { toast('Fyrirtækið „' + (u.client || '') + '" fannst ekki — skráðu varahlutinn á fyrirtækjasíðunni'); return; }
    if (!window.VorurPicker || typeof VorurPicker.open !== 'function') { toast('Vörulistinn er ekki tiltækur'); return; }
    VorurPicker.open(prod => {
      if (!prod) return;
      const st = lesaFerd(coId);
      if (!Array.isArray(st.extras)) st.extras = [];
      st.extras.push({
        name: (prod.nafn || 'Varahlutur') + (u.serial ? ' · ' + u.serial : ''),
        qty: 1,
        unit_price_ex_vat: Number(prod.verd_an_vsk) || 0,
        vsk_pct: Number(prod.vsk_prosenta) || 24,
        vorur_id: prod.id || null,
        uttaeki_id: u.id,
        fra: 'verkstaedi'
      });
      try { localStorage.setItem('slokk_trip_' + coId, JSON.stringify(st)); } catch (_) {}
      toast('Varahlutur skráður á ' + (u.client || 'fyrirtækið') + ' — rukkast í lokin');
      inject(true);
    }, { favorites: true });
  }

  // QR-miðar fyrir öll tæki fyrirtækis á verkstæðinu — sama kerfi og Sala (Print.showJob → QrLabelCustomer, Brother).
  function prenta(client) {
    const items = _shop.filter(u => (u.client || '— óþekkt —') === client);
    if (!items.length) return;
    if (!(window.Print && typeof Print.showJob === 'function')) { alert('Miðaprentunin er ekki hlaðin.'); return; }
    const L = (window.Companies && Companies.list) || [];
    const c = L.find(x => String(x.nafn || '').trim() === String(client || '').trim());
    Print.showJob({ customer: client, phone: (c && c.simi) || '', units: items.map(u => ({ serial: u.serial || '', type: u.type || '', size: u.size || '' })) });
  }

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

  let _vtAskrift = null;
  async function inject(force) {
    // 422 hleðst á eftir þessum pappa — áskrift tekin við fyrstu teikningu: Tilbúið/Ónýtt í Verkröðinni
    // (eða Sótt ✓) breytir flísunum hér strax.
    if (!_vtAskrift && window.VerkTenging && VerkTenging.onChange) {
      _vtAskrift = VerkTenging.onChange(() => {
        const vw = document.getElementById('view-workshop');
        if (vw && vw.style.display !== 'none') inject(true);
      });
    }
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
      if (!vw || vw.style.display === 'none' || !vw.classList.contains('active')) return;
      const body = vw.querySelector('.bw-sh-body');
      if (body && !body.querySelector('#_vk-loaned')) { clearTimeout(t); t = setTimeout(() => inject(false), 120); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('view-shown', e => { if (e && e.detail && e.detail.name === 'workshop') setTimeout(() => inject(true), 200); });
    // Öryggis-tikk: sprauta strax + reglulega ef verkstæðis-súlan er sýnileg og
    // sektíónin vantar (MutationObserver missir af þegar DOM breytist ekki).
    const tick = () => {
      const vw = document.getElementById('view-workshop');
      // 01.10.2026: ekki sækja lánuð tæki á meðan verkstæðið er ekki opið.
      // Prófíllinn má ekki kveikja á síðuflettingu yfir uttaeki.
      if (!vw || vw.style.display === 'none' || !vw.classList.contains('active')) return;
      const body = vw.querySelector('.bw-sh-body');
      if (body && !body.querySelector('#_vk-loaned')) inject(false);
    };
    tick(); setInterval(tick, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();

  window.VkLoaned = { inject: () => inject(true), act: act, del: del, close: close, hluti: hluti, prenta: prenta };
  console.log('[verkstaedi-loaned] v7 installed (+ rólegur stíll eins og VERK-súlan)');
})();
/* === END VERKSTÆÐI: KOMIÐ ÚR ÞJÓNUSTU === */
