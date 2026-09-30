/* 423 — SKJALADROPP (Agnar 30.09.2026)
 *
 * „Geturðu gert annað svæði þarna sem heitir Skjaladropp … að við getum hent inn
 *  skjölum þarna til að opna í hinum tölvunum, síðan bara eyðum við þeim þaðan út
 *  reglulega. Geymt bara í supabase. Smá auka skammtíma geymslusvæði."
 *
 * Fjórar vélar vinna í sömu gögnum. Þetta er millistykkið sem vantaði: henda skrá
 * inn á einni vél, opna hana á hinni, henda henni svo út. EKKERT hér er varanleg
 * skráning — engin tenging við fyrirtæki, enga sögu, engin skjalaskrá. Það er
 * TILGANGURINN: skjöl sem eiga að lifa fara í customer_documents, ekki hingað.
 *
 * GEYMSLAN: Supabase-geymslan `skjaladropp` (opin, 100 MB þak), búin til 30.09.2026
 * með sömu reglum og `verkbord-files` (select/insert/update/delete á bucket_id).
 * Sannreynt með lykli appsins samdægurs: upphal 200 · listun 200 · opnun um
 * opinberu slóðina 200 · eyðing 200. Engin ný tafla — geymslan sjálf ER listinn,
 * svo ekkert getur rekið í sundur milli skráar og skráningar.
 *
 * ALDUR ER SÝNILEGUR, VILJANDI. Svæðið á að tæmast. Hver lína ber aldur sinn og
 * það sem er eldra en vika er merkt; „Hreinsa eldra en 7 daga" tekur þau í einu.
 * Ekkert eyðist sjálfkrafa — það er alltaf einhver sem ýtir.
 */
(() => {
  if (window.__skjaladropp) return;
  window.__skjaladropp = true;

  const GEYMSLA = 'skjaladropp';
  const VIKA_MS = 7 * 864e5;
  const SB = () => (window.DB && window.DB.sb) || null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function staerd(b) {
    b = Number(b) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return Math.round(b / 1024) + ' KB';
    return (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
  }
  function aldur(iso) {
    const t = new Date(iso).getTime();
    if (isNaN(t)) return { txt: '—', ms: 0 };
    const ms = Date.now() - t, m = Math.round(ms / 60000);
    if (m < 1) return { txt: 'rétt í þessu', ms };
    if (m < 60) return { txt: m + ' mín', ms };
    const k = Math.round(m / 60);
    if (k < 24) return { txt: k + (k === 1 ? ' klst' : ' klst'), ms };
    const d = Math.round(k / 24);
    return { txt: d + (d === 1 ? ' dagur' : ' dagar'), ms };
  }

  // Skráarnafn: tímastimpill fremst svo nýjast raðist efst og tvö eins nöfn rekist
  // ekki á.
  //
  // MÆLT 30.09.2026 við fyrstu prófun: Supabase-geymslan HAFNAR íslenskum stöfum í
  // lykli — „Prófunarskjal 30.09.pdf" skilaði `Invalid key`. Lykillinn verður því að
  // vera ASCII. Broddar eru felldir (á→a, ð→d, þ→th, æ→ae, ö→o) eins og í leitinni
  // annars staðar í appinu, og allt annað utan ASCII verður `_`.
  //
  // NAFNIÐ SEM SÉST ER ÞAÐ SEM ER GEYMT — ég fel ekki upprunalega nafnið bak við
  // umritun, því slóðin sem þú afritar ber umritaða nafnið og þau eiga að stemma.
  function hreintNafn(n) {
    return String(n || 'skra')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ð/g, 'd').replace(/Ð/g, 'D')
      .replace(/þ/g, 'th').replace(/Þ/g, 'Th')
      .replace(/æ/g, 'ae').replace(/Æ/g, 'Ae')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/[\\/:*?"<>|#%&{}$!'`+=@]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'skra';
  }
  function lykill(nafn) {
    const d = new Date(), p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}__${hreintNafn(nafn)}`;
  }
  function birtNafn(k) {
    const i = String(k).indexOf('__');
    return i > 0 ? String(k).slice(i + 2) : String(k);
  }

  // ── gögn ────────────────────────────────────────────────────────────────────
  async function sakja() {
    const sb = SB();
    if (!sb) throw new Error('Engin gagnabankatenging');
    const { data, error } = await sb.storage.from(GEYMSLA).list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) throw error;
    return (data || []).filter((x) => x.name && x.name !== '.emptyFolderPlaceholder');
  }
  function slod(nafn) {
    const sb = SB();
    return sb ? sb.storage.from(GEYMSLA).getPublicUrl(nafn).data.publicUrl : '';
  }

  // ── útlit ───────────────────────────────────────────────────────────────────
  function stil() {
    if (document.getElementById('_sdr-stil')) return;
    const s = document.createElement('style');
    s.id = '_sdr-stil';
    s.textContent = [
      '#_sdr-bak{position:fixed;inset:0;z-index:100060;background:rgba(8,10,14,.72);display:flex;align-items:center;justify-content:center;padding:18px}',
      '#_sdr{width:min(720px,100%);max-height:88vh;display:flex;flex-direction:column;background:#151922;color:#e8ecf2;border:1px solid #2b3240;border-radius:14px;box-shadow:0 24px 60px -12px #000;font-family:inherit;overflow:hidden}',
      '#_sdr .hd{display:flex;align-items:center;gap:10px;padding:14px 18px;background:linear-gradient(180deg,#1e2430,#171c26);border-bottom:1px solid #2b3240}',
      '#_sdr .hd b{font-size:15px;letter-spacing:.01em}',
      '#_sdr .hd .undir{font-size:11.5px;color:#93a0b4;margin-left:2px}',
      '#_sdr .hd .x{margin-left:auto;background:none;border:0;color:#93a0b4;font-size:20px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:6px}',
      '#_sdr .hd .x:hover{background:#2b3240;color:#fff}',
      '#_sdr .buk{padding:14px 18px;overflow:auto}',
      '#_sdr .dropp{border:1.5px dashed #3a4354;border-radius:11px;padding:20px;text-align:center;color:#93a0b4;font-size:13px;cursor:pointer;transition:border-color .12s,background .12s}',
      '#_sdr .dropp:hover,#_sdr .dropp.yfir{border-color:#c2410c;background:#1b2130;color:#e8ecf2}',
      '#_sdr .dropp b{display:block;font-size:14px;color:#e8ecf2;margin-bottom:3px}',
      '#_sdr .listi{margin-top:14px;display:flex;flex-direction:column;gap:6px}',
      '#_sdr .rod{display:flex;align-items:center;gap:10px;padding:9px 11px;background:#1b212c;border:1px solid #2b3240;border-radius:9px}',
      '#_sdr .rod.gamalt{border-color:#7c3a12;background:#211a16}',
      '#_sdr .rod .nafn{flex:1;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#_sdr .rod .meta{font-size:11px;color:#93a0b4;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '#_sdr .rod .gamallmerki{font-size:10.5px;color:#f59e0b;border:1px solid #7c3a12;border-radius:5px;padding:1px 5px;white-space:nowrap}',
      '#_sdr button.adg{background:#232c3a;border:1px solid #3a4354;color:#dbe3ee;border-radius:7px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}',
      '#_sdr button.adg:hover{background:#2e3949;border-color:#4b586c}',
      '#_sdr button.adg.raud{color:#fca5a5;border-color:#5b2626}',
      '#_sdr button.adg.raud:hover{background:#3a1d1d;color:#fff}',
      '#_sdr .fotur{display:flex;align-items:center;gap:10px;padding:11px 18px;border-top:1px solid #2b3240;background:#12161e}',
      '#_sdr .fotur .skil{font-size:12px;color:#93a0b4;flex:1;min-width:0}',
      '#_sdr .tomt{padding:26px 10px;text-align:center;color:#8a94a6;font-size:13px}',
    ].join('\n');
    document.head.appendChild(s);
  }

  let _opid = false;

  function opna() {
    if (_opid) return;
    _opid = true;
    stil();

    const bak = document.createElement('div');
    bak.id = '_sdr-bak';
    bak.innerHTML =
      '<div id="_sdr" role="dialog" aria-label="Skjaladropp">' +
        '<div class="hd"><b>Skjaladropp</b>' +
          '<span class="undir">skammtímageymsla — sést á öllum vélunum</span>' +
          '<button type="button" class="x" title="Loka">×</button></div>' +
        '<div class="buk">' +
          '<div class="dropp" id="_sdr-dropp"><b>Dragðu skrá hingað</b>' +
            'eða smelltu til að velja — Ctrl+V límir skjámynd beint inn' +
            '<input type="file" id="_sdr-inn" multiple hidden></div>' +
          '<div class="listi" id="_sdr-listi"><div class="tomt">Sæki…</div></div>' +
        '</div>' +
        '<div class="fotur">' +
          '<span class="skil" id="_sdr-skil"></span>' +
          '<button type="button" class="adg" id="_sdr-endur">Endurnýja</button>' +
          '<button type="button" class="adg raud" id="_sdr-hreinsa">Hreinsa eldra en 7 daga</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bak);

    const listi = bak.querySelector('#_sdr-listi');
    const skil = bak.querySelector('#_sdr-skil');
    const dropp = bak.querySelector('#_sdr-dropp');
    const inn = bak.querySelector('#_sdr-inn');

    function loka() {
      _opid = false;
      document.removeEventListener('keydown', aLykli);
      document.removeEventListener('paste', aLimi);
      try { bak.remove(); } catch (_) {}
    }
    function aLykli(e) { if (e.key === 'Escape') loka(); }
    bak.querySelector('.x').addEventListener('click', loka);
    bak.addEventListener('click', (e) => { if (e.target === bak) loka(); });
    document.addEventListener('keydown', aLykli);

    function segja(t, villa) { skil.textContent = t || ''; skil.style.color = villa ? '#fca5a5' : '#93a0b4'; }

    async function teikna() {
      let skrar;
      try { skrar = await sakja(); }
      catch (e) {
        listi.innerHTML = '<div class="tomt">Náði ekki í listann: ' + esc((e && e.message) || e) + '</div>';
        segja('Listinn er ÓÞEKKTUR — ekki tómur.', true);
        return;
      }
      if (!skrar.length) {
        listi.innerHTML = '<div class="tomt">Ekkert í droppinu. Það er rétta staðan þegar allir eru búnir að ná í sitt.</div>';
        segja('0 skrár');
        return;
      }
      let gomul = 0;
      listi.innerHTML = skrar.map((f) => {
        const a = aldur(f.created_at);
        const g = a.ms > VIKA_MS; if (g) gomul++;
        const st = (f.metadata && f.metadata.size) || 0;
        return '<div class="rod' + (g ? ' gamalt' : '') + '" data-nafn="' + esc(f.name) + '">' +
          '<span class="nafn" title="' + esc(birtNafn(f.name)) + '">' + esc(birtNafn(f.name)) + '</span>' +
          (g ? '<span class="gamallmerki">eldra en vika</span>' : '') +
          '<span class="meta">' + esc(staerd(st)) + ' · ' + esc(a.txt) + '</span>' +
          '<button type="button" class="adg" data-sdr-opna="1">Opna</button>' +
          '<button type="button" class="adg" data-sdr-afrita="1" title="Afrita slóð — hægt að líma í spjall eða póst">Slóð</button>' +
          '<button type="button" class="adg raud" data-sdr-eyda="1">Eyða</button>' +
        '</div>';
      }).join('');
      segja(skrar.length + (skrar.length === 1 ? ' skrá' : ' skrár') + (gomul ? ' · ' + gomul + ' eldri en vika' : ''));
    }

    async function hlada(skrar) {
      const sb = SB();
      if (!sb) { segja('Engin gagnabankatenging', true); return; }
      let ok = 0; const villur = [];
      for (const f of skrar) {
        segja('Hleð upp ' + f.name + '…');
        const { error } = await sb.storage.from(GEYMSLA).upload(lykill(f.name), f, { upsert: false, contentType: f.type || undefined });
        if (error) villur.push(f.name + ': ' + (error.message || error)); else ok++;
      }
      await teikna();
      if (villur.length) segja(ok + ' komust inn · ' + villur.length + ' mistókust — ' + villur[0], true);
      else segja(ok + (ok === 1 ? ' skrá komin inn' : ' skrár komnar inn') + ' — sjást á hinum vélunum strax');
    }

    dropp.addEventListener('click', () => inn.click());
    inn.addEventListener('change', () => { if (inn.files && inn.files.length) hlada([...inn.files]); inn.value = ''; });
    ['dragenter', 'dragover'].forEach((t) => dropp.addEventListener(t, (e) => { e.preventDefault(); dropp.classList.add('yfir'); }));
    ['dragleave', 'drop'].forEach((t) => dropp.addEventListener(t, (e) => { e.preventDefault(); dropp.classList.remove('yfir'); }));
    dropp.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files;
      if (f && f.length) hlada([...f]);
    });
    // Ctrl+V: skjámynd beint inn — algengasta leiðin til að sýna hinum vélunum eitthvað.
    function aLimi(e) {
      const it = e.clipboardData && e.clipboardData.items;
      if (!it) return;
      const skrar = [];
      for (const x of it) if (x.kind === 'file') { const f = x.getAsFile(); if (f) skrar.push(f); }
      if (skrar.length) { e.preventDefault(); hlada(skrar); }
    }
    document.addEventListener('paste', aLimi);

    listi.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const rod = b.closest('.rod'); if (!rod) return;
      const nafn = rod.getAttribute('data-nafn');
      if (b.hasAttribute('data-sdr-opna')) { window.open(slod(nafn), '_blank', 'noopener'); return; }
      if (b.hasAttribute('data-sdr-afrita')) {
        try { await navigator.clipboard.writeText(slod(nafn)); segja('Slóðin afrituð'); }
        catch (_) { segja('Náði ekki að afrita — slóðin opnast í nýjum flipa í staðinn', true); window.open(slod(nafn), '_blank', 'noopener'); }
        return;
      }
      if (b.hasAttribute('data-sdr-eyda')) {
        const sp = 'Eyða „' + birtNafn(nafn) + '" úr droppinu? Það hverfur af ÖLLUM vélunum.';
        const ja = (window.Confirm && Confirm.show) ? await Confirm.show(sp, { danger: true, okText: 'Eyða' }) : confirm(sp);
        if (!ja) return;
        const sb = SB();
        const { error } = await sb.storage.from(GEYMSLA).remove([nafn]);
        if (error) { segja('Eyðing mistókst: ' + (error.message || error), true); return; }
        await teikna();
        segja('Eytt');
      }
    });

    bak.querySelector('#_sdr-endur').addEventListener('click', teikna);
    bak.querySelector('#_sdr-hreinsa').addEventListener('click', async () => {
      let skrar;
      try { skrar = await sakja(); } catch (e) { segja('Náði ekki í listann', true); return; }
      const gomul = skrar.filter((f) => aldur(f.created_at).ms > VIKA_MS);
      if (!gomul.length) { segja('Ekkert er eldra en vika'); return; }
      const sp = 'Eyða ' + gomul.length + (gomul.length === 1 ? ' skrá' : ' skrám') + ' sem eru eldri en vika? Þær hverfa af öllum vélunum.';
      const ja = (window.Confirm && Confirm.show) ? await Confirm.show(sp, { danger: true, okText: 'Eyða ' + gomul.length }) : confirm(sp);
      if (!ja) return;
      const { error } = await SB().storage.from(GEYMSLA).remove(gomul.map((f) => f.name));
      if (error) { segja('Hreinsun mistókst: ' + (error.message || error), true); return; }
      await teikna();
      segja(gomul.length + ' eydd');
    });

    teikna();
  }

  // ── tengill í hliðarstikuna, við hliðina á „Skrár í Storage" ────────────────
  function setja() {
    const hluti = document.querySelector('.qlinks-section');
    if (!hluti || hluti.querySelector('#qlink-skjaladropp')) return;
    const a = document.createElement('a');
    a.className = 'qlinks-btn';
    a.id = 'qlink-skjaladropp';
    a.title = 'Skammtímageymsla — hentu skjali inn hér og opnaðu það á hinum vélunum';
    a.innerHTML = '<span class="ico">📥</span><span>Skjaladropp</span>';
    a.addEventListener('click', (e) => { e.preventDefault(); opna(); });
    // Beint á eftir „Skrár í Storage" svo geymslu-tenglarnir standi saman.
    const storage = hluti.querySelector('#qlink-storage');
    if (storage && storage.nextSibling) hluti.insertBefore(a, storage.nextSibling);
    else hluti.appendChild(a);
  }

  // qlinks-hlutinn verður til þegar 46 keyrir; hann getur komið á eftir okkur.
  // Ódýr púls sem hættir um leið og tengillinn er kominn (sama mynstur og 370).
  function vakta() {
    setja();
    if (document.getElementById('qlink-skjaladropp')) return;
    let n = 0;
    const iv = setInterval(() => { setja(); if (document.getElementById('qlink-skjaladropp') || ++n > 40) clearInterval(iv); }, 500);
  }

  window.Skjaladropp = { opna: opna };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();
})();
