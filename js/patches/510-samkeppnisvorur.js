/* === SAMKEPPNISAÐILAR – VÖRUR (510, 16.11.2026) — flipi í Birgðum ================================================================
 *
 * Agnar 16.11.2026: „annan flipa þarna sem heitir samkeppnisaðilar-Vörur, fara yfir vörurnar okkar, og fara yfir helstu samkeppnisaðila
 * á íslandi og setja inn hvað þeirra söluverð er, og líka á svipuðum vörum, viljum líka vita hvar við getum keypt vörur ef við verðum
 * alveg tómir … helst með myndum og link á síðuna hjá þeim" + „reyna bara finna allt sem við hefðum áhuga á að kaupa líka, kaupa ódýrara
 * en það sem við erum með núna" + „kíkja yfir reikningana hjá okkur frá þessum aðilum, á hvaða verðum við höfum verið að kaupa".
 *
 * Fjórir undirflipar:
 *   1. Ódýrara innkaup  — markaðsverð án VSK sem er LÆGRA en kostnaðarverðið sem við borgum í dag (vorur.kostnadarverd), og vörur utan skrár.
 *   2. Verðsamanburður  — söluverðið okkar á móti verði samkeppnisaðila (m. VSK).
 *   3. Hvar kaupa       — birgjar innanlands og erlendis ef við verðum tómir (B2B, sendir til Íslands, sýnishorn af verði).
 *   4. Okkar innkaup    — verðin sem við höfum borgað á birgjareikningum (afsláttur birgja, nettó á stykki).
 *
 * Gögn: /js/data/samkeppnisvorur.json (opinberar heimildir, hver lína ber slóð + dagsetningu — ómælt er „—", aldrei 0) og
 * `vorur` úr gagnagrunni (okkar verð). Aðeins LESTUR: flipinn breytir engu verði og skrifar ekkert.
 * Verðbreyting hjá okkur er ákvörðun Agnars (sala-reikningar á verðlistana).
 * ================================================================================================================================ */
(() => {
  if (window.Samkeppni) return;

  const GOGN = '/js/data/samkeppnisvorur.json';
  const INNKAUP_API = '/api/samkeppni-innkaup';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slod = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
  const thus = (n) => { const s = String(Math.abs(Math.round(n))); return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  const kr = (n) => (n == null || !Number.isFinite(Number(n)) ? '—' : thus(Number(n)) + ' kr');
  const pct = (x) => (x == null || !Number.isFinite(x) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1).replace('.', ',') + ' %');
  const dags = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : '—'; };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/æ/g, 'ae').replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/ö/g, 'o');

  const TEGUNDIR = { samkeppnisadili: 'Samkeppnisaðili', byggingavoruverslun: 'Byggingavöruverslun', heildsali: 'Heildsali', skiltagerd: 'Skiltagerð', framleidandi: 'Framleiðandi', vefverslun: 'Vefverslun', innflytjandi: 'Innflytjandi', annad: 'Annað' };
  const tegundHeiti = (t) => TEGUNDIR[t] || (t ? String(t) : '');

  // ── Ástand ───────────────────────────────────────────────────────────────────────────────────────────────────────
  let _g = null;           // gögnin úr JSON
  let _okkar = null;       // { [id]: vara }
  let _villa = null;
  let _innkaupVilla = null;
  let _loadP = null;
  let _rot = null;
  let _flipi = 'odyrara';
  let _q = '', _flokkur = '', _seljandi = '', _land = '';
  const _sort = {};

  async function hlada() {
    if (_loadP) return _loadP;
    _loadP = (async () => {
      try {
        const r = await fetch(GOGN + '?v=' + Date.now(), { credentials: 'same-origin' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        _g = await r.json();
      } catch (e) { _villa = 'Náði ekki í samkeppnisgögnin: ' + (e && e.message ? e.message : e); }
      // Innkaupaverðin koma úr starfsmannafalli (ekki úr JSON-skrá): repóið er opið og kostnaðarverð/afslættir eru ekki fyrir alla.
      try {
        const r = await fetch(INNKAUP_API, { credentials: 'same-origin' });
        if (r.status === 401) _innkaupVilla = 'Innskráning starfsmanns vantar til að sjá innkaupaverð.';
        else if (!r.ok) _innkaupVilla = 'Náði ekki í innkaupaverð (' + r.status + ').';
        else { const d = await r.json(); if (_g) _g.innkaup = d.innkaup || null; if (!d.innkaup) _innkaupVilla = 'Innkaupaverð hafa ekki verið skráð enn.'; }
      } catch (e) { _innkaupVilla = 'Náði ekki í innkaupaverð: ' + (e && e.message ? e.message : e); }
      try {
        const sb = window.DB && window.DB.sb;
        if (sb) {
          const { data, error } = await sb.from('vorur').select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,kostnadarverd,listaverd,birgi,virkt').limit(2000);
          if (error) throw error;
          _okkar = {};
          (data || []).forEach((v) => { _okkar[v.id] = v; });
        }
      } catch (_) { /* samanburður við okkar verð fellur þá niður, gögnin sjást samt */ }
    })();
    return _loadP;
  }

  // ── Útreikningar ─────────────────────────────────────────────────────────────────────────────────────────────────
  const okkarSala = (v) => (v && v.verd_an_vsk != null ? Number(v.verd_an_vsk) * (1 + (v.vsk_prosenta == null ? 24 : Number(v.vsk_prosenta)) / 100) : null);
  const okkarKostn = (v) => (v && v.kostnadarverd != null && Number(v.kostnadarverd) > 0 ? Number(v.kostnadarverd) : null);
  const perStk = (r) => {
    if (r.verd_per_stk_an_vsk != null && Number.isFinite(Number(r.verd_per_stk_an_vsk))) return Number(r.verd_per_stk_an_vsk);
    if (r.verd_isk_m_vsk == null || !Number.isFinite(Number(r.verd_isk_m_vsk))) return null;
    return Number(r.verd_isk_m_vsk) / (Number(r.eining_fjoldi) > 1 ? Number(r.eining_fjoldi) : 1) / 1.24;
  };
  const perStkMVsk = (r) => { const n = perStk(r); return n == null ? null : n * 1.24; };
  const markadur = () => (_g && Array.isArray(_g.vorur) ? _g.vorur.filter((r) => perStk(r) != null) : []);
  const medal = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  // ── CSS ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  function stilar() {
    if (document.getElementById('_samk-css')) return;
    const s = document.createElement('style');
    s.id = '_samk-css';
    s.textContent = `
      .samk-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
      .samk-sub{display:inline-flex;gap:4px;background:var(--bg2);border:1px solid var(--brd);border-radius:10px;padding:3px;flex-wrap:wrap}
      .samk-sub button{border:0;background:transparent;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink2);padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap}
      .samk-sub button:hover{background:var(--bg1)}
      .samk-sub button.on{background:#0f172a;color:#fff}
      .samk-in,.samk-sel{padding:8px 10px;border:1px solid var(--brd);border-radius:8px;font:inherit;font-size:13px;background:var(--bg1);color:var(--ink1)}
      .samk-in{flex:1;min-width:200px}
      .samk-note{font-size:12.5px;color:var(--ink3);margin:0 0 12px;line-height:1.5}
      .samk-tafla{width:100%;border-collapse:collapse;font-size:13px;background:var(--bg1);border:1px solid var(--brd);border-radius:10px;overflow:hidden}
      .samk-tafla th{background:#0f172a;color:#fff;text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase;padding:9px 10px;white-space:nowrap}
      .samk-tafla th.srt{cursor:pointer;user-select:none}
      .samk-tafla th.srt:hover{background:#1e293b}
      .samk-tafla td{padding:8px 10px;border-top:1px solid var(--brd);vertical-align:middle}
      .samk-tafla tr:hover td{background:var(--bg2)}
      .samk-tafla .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
      .samk-mynd{width:44px;height:44px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid var(--brd);display:block}
      .samk-mynd-t{width:44px;height:44px;border-radius:6px;background:var(--bg2);border:1px solid var(--brd)}
      .samk-nafn{font-weight:600;color:var(--ink1)}
      .samk-sm{font-size:11.5px;color:var(--ink3)}
      .samk-gott{color:#15803d;font-weight:700}
      .samk-slaemt{color:#b91c1c;font-weight:700}
      .samk-pill{display:inline-block;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:99px;background:var(--bg2);color:var(--ink2);border:1px solid var(--brd);white-space:nowrap}
      .samk-pill.gr{background:#dcfce7;color:#166534;border-color:#86efac}
      .samk-pill.gu{background:#fef3c7;color:#92400e;border-color:#fcd34d}
      .samk-tengill{color:#1d4ed8;text-decoration:none;font-weight:600;white-space:nowrap}
      .samk-tengill:hover{text-decoration:underline}
      .samk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:12px}
      .samk-kort{background:var(--bg1);border:1px solid var(--brd);border-radius:12px;padding:14px;min-width:0}
      .samk-kort h4{margin:0 0 4px;font-size:14.5px;color:var(--ink1)}
      .samk-kort .l{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
      .samk-kort ul{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:6px}
      .samk-kort li{display:flex;gap:8px;align-items:center;font-size:12.5px}
      .samk-h{font-size:14px;font-weight:700;margin:18px 0 8px;color:var(--ink1)}
      .samk-tomt{padding:28px;text-align:center;color:var(--ink3);background:var(--bg2);border-radius:10px;font-size:13px}
      .samk-afsl{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
      @media(max-width:900px){.samk-tafla{display:block;overflow-x:auto;white-space:nowrap}}
    `;
    document.head.appendChild(s);
  }

  // ── Smáhlutir í birtingu ─────────────────────────────────────────────────────────────────────────────────────────
  const mynd = (u, alt) => (slod(u) ? `<img class="samk-mynd" loading="lazy" referrerpolicy="no-referrer" src="${esc(slod(u))}" alt="${esc(alt)}" onerror="this.style.visibility='hidden'">` : '<div class="samk-mynd-t"></div>');
  const tengill = (u, texti) => (slod(u) ? `<a class="samk-tengill" href="${esc(slod(u))}" target="_blank" rel="noopener noreferrer">${esc(texti || 'Opna')} ↗</a>` : '<span class="samk-sm">án tengils</span>');

  function rada(id, rows, cols) {
    const s = _sort[id];
    if (!s) return rows;
    const c = cols.find((x) => x.k === s.k);
    if (!c || !c.v) return rows;
    return [...rows].sort((a, b) => {
      const x = c.v(a), y = c.v(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'string' ? x.localeCompare(y, 'is') : x - y) * s.d;
    });
  }
  function tafla(id, cols, rows) {
    if (!rows.length) return '<div class="samk-tomt">Ekkert fannst með þessum síum.</div>';
    const s = _sort[id];
    const haus = cols.map((c) => `<th class="${c.v ? 'srt' : ''}${c.r ? ' r' : ''}"${c.v ? ` onclick="window.Samkeppni._rada('${id}','${c.k}')"` : ''}>${esc(c.t)}${s && s.k === c.k ? (s.d > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
    const lik = rada(id, rows, cols).map((r) => `<tr>${cols.map((c) => `<td class="${c.r ? 'r' : ''}">${c.h(r)}</td>`).join('')}</tr>`).join('');
    return `<table class="samk-tafla"><thead><tr>${haus}</tr></thead><tbody>${lik}</tbody></table>`;
  }

  function passar(r) {
    if (_flokkur && (r.flokkur || '') !== _flokkur) return false;
    if (_seljandi && (r.seljandi || '') !== _seljandi) return false;
    if (_q) {
      const hey = norm([r.nafn, r.lysing, r.staerd, r.seljandi, r.flokkur, r.athugasemd, r.vara, r.vorur].join(' '));
      if (!_q.split(/\s+/).every((t) => hey.includes(norm(t)))) return false;
    }
    return true;
  }

  // ── 1. Ódýrara innkaup ───────────────────────────────────────────────────────────────────────────────────────────
  function odyrara() {
    const m = markadur().filter(passar);
    const samanb = m.map((r) => {
      const v = r.okkar_id != null && _okkar ? _okkar[r.okkar_id] : null;
      const k = okkarKostn(v);
      const n = perStk(r);
      return { r, v, k, n, sparnadur: k != null && n != null ? k - n : null };
    });
    const odyrari = samanb.filter((x) => x.sparnadur != null && x.sparnadur > 0.5).sort((a, b) => (b.sparnadur / b.k) - (a.sparnadur / a.k));
    const utan = samanb.filter((x) => x.r.okkar_id == null).sort((a, b) => String(a.r.flokkur).localeCompare(String(b.r.flokkur), 'is') || a.n - b.n);
    const dyrara = samanb.filter((x) => x.k != null && x.sparnadur != null && x.sparnadur <= 0.5);
    const vantar = samanb.filter((x) => x.r.okkar_id != null && x.k == null).length;

    const cols = [
      { k: 'mynd', t: '', h: (x) => mynd(x.r.mynd_url, x.r.nafn) },
      { k: 'vara', t: 'Vara hjá seljanda', v: (x) => x.r.nafn, h: (x) => `<div class="samk-nafn">${esc(x.r.nafn)}</div><div class="samk-sm">${esc([x.r.staerd, x.r.flokkur].filter(Boolean).join(' · '))}${x.r.eining_fjoldi > 1 ? ` · verð fyrir ${esc(x.r.eining_fjoldi)} stk` : ''}</div>` },
      { k: 'okkar', t: 'Okkar vara', v: (x) => (x.v ? x.v.nafn : null), h: (x) => (x.v ? esc(x.v.nafn) : '<span class="samk-sm">—</span>') },
      { k: 'selj', t: 'Seljandi', v: (x) => x.r.seljandi, h: (x) => `${esc(x.r.seljandi)}<div class="samk-sm">${esc(tegundHeiti(x.r.tegund_seljanda))}</div>` },
      { k: 'kostn', t: 'Við kaupum á', r: 1, v: (x) => x.k, h: (x) => kr(x.k) },
      { k: 'net', t: 'Þeirra án VSK', r: 1, v: (x) => x.n, h: (x) => kr(x.n) },
      { k: 'spar', t: 'Sparnaður', r: 1, v: (x) => x.sparnadur, h: (x) => `<span class="samk-gott">${kr(x.sparnadur)}</span><div class="samk-sm">${pct(-(x.sparnadur / x.k) * 100)}</div>` },
      { k: 'dags', t: 'Sótt', v: (x) => x.r.dags || _g.sott, h: (x) => esc(dags(x.r.dags || _g.sott)) },
      { k: 'url', t: 'Síða', h: (x) => tengill(x.r.url, 'Opna') }
    ];
    const colsUtan = [
      { k: 'mynd', t: '', h: (x) => mynd(x.r.mynd_url, x.r.nafn) },
      { k: 'vara', t: 'Vara', v: (x) => x.r.nafn, h: (x) => `<div class="samk-nafn">${esc(x.r.nafn)}</div><div class="samk-sm">${esc([x.r.staerd, x.r.flokkur].filter(Boolean).join(' · '))}</div>` },
      { k: 'selj', t: 'Seljandi', v: (x) => x.r.seljandi, h: (x) => `${esc(x.r.seljandi)}<div class="samk-sm">${esc(tegundHeiti(x.r.tegund_seljanda))}</div>` },
      { k: 'm', t: 'Verð m. VSK', r: 1, v: (x) => perStkMVsk(x.r), h: (x) => kr(perStkMVsk(x.r)) },
      { k: 'net', t: 'Án VSK', r: 1, v: (x) => x.n, h: (x) => kr(x.n) },
      { k: 'ath', t: 'Athugasemd', h: (x) => `<span class="samk-sm">${esc(x.r.athugasemd || '')}</span>` },
      { k: 'url', t: 'Síða', h: (x) => tengill(x.r.url, 'Opna') }
    ];
    return `
      <p class="samk-note">Hér sjást aðeins vörur þar sem <b>verð án VSK</b> hjá seljanda er lægra en <b>kostnaðarverðið sem við borgum í dag</b> (kostnaðarverð í Birgðum, eftir afslátt birgja). Verð úr verslunum er deilt með 1,24. Hafðu í huga: verð í vefverslun er smásöluverð og flutningur, magnskilmálar og tollar bætast við hjá erlendum birgjum — staðfestu verðið hjá seljanda áður en pantað er.
      ${vantar ? `<br><b>${vantar}</b> vörur eiga pörun við okkar vöru en vantar kostnaðarverð hjá okkur, svo þær komast ekki í samanburðinn.` : ''}</p>
      <div class="samk-h">Ódýrara en við kaupum á í dag (${odyrari.length})</div>
      ${odyrari.length ? tafla('odyrara', cols, odyrari) : `<div class="samk-tomt">Ekkert fannst ódýrara en núverandi kostnaðarverð með þessum síum.${dyrara.length ? ` Næst kemst þetta: ${dyrara.length} pöruð verð eru jafn há eða hærri en við borgum nú.` : ''}</div>`}
      <div class="samk-h">Vörur utan skrár okkar — gætu verið áhugaverðar (${utan.length})</div>
      <p class="samk-note">Vörur sem við seljum ekki enn eða hafa ekki pörun við vöru í Vörum og þjónustu. Röðun: flokkur, svo lægsta verð fyrst.</p>
      ${tafla('utan', colsUtan, utan)}`;
  }

  // ── 2. Verðsamanburður (sala) ────────────────────────────────────────────────────────────────────────────────────
  function samanburdur() {
    const m = markadur().filter(passar).filter((r) => r.okkar_id != null && _okkar && _okkar[r.okkar_id]);
    const hopar = {};
    m.forEach((r) => { (hopar[r.okkar_id] = hopar[r.okkar_id] || []).push(r); });
    const rows = Object.keys(hopar).map((id) => {
      const v = _okkar[id];
      const l = hopar[id];
      const verd = l.map(perStkMVsk).filter((x) => x != null);
      const lagst = l.reduce((a, b) => (perStkMVsk(b) < perStkMVsk(a) ? b : a), l[0]);
      const ok = okkarSala(v);
      const med = medal(verd);
      return { v, l, ok, lagst, lagstVerd: perStkMVsk(lagst), med, munur: ok != null && med != null ? ((ok - med) / med) * 100 : null };
    });
    const cols = [
      { k: 'vara', t: 'Okkar vara', v: (x) => x.v.nafn, h: (x) => `<div class="samk-nafn">${esc(x.v.nafn)}</div><div class="samk-sm">${esc(x.v.flokkur || '')}</div>` },
      { k: 'ok', t: 'Okkar verð m. VSK', r: 1, v: (x) => x.ok, h: (x) => kr(x.ok) },
      { k: 'lag', t: 'Lægst hjá', r: 1, v: (x) => x.lagstVerd, h: (x) => `${kr(x.lagstVerd)}<div class="samk-sm">${esc(x.lagst.seljandi)}</div>` },
      { k: 'med', t: 'Miðgildi', r: 1, v: (x) => x.med, h: (x) => kr(x.med) },
      { k: 'mun', t: 'Við vs miðgildi', r: 1, v: (x) => x.munur, h: (x) => `<span class="${x.munur > 3 ? 'samk-slaemt' : x.munur < -3 ? 'samk-gott' : ''}">${pct(x.munur)}</span>` },
      { k: 'fj', t: 'Verð', r: 1, v: (x) => x.l.length, h: (x) => `${x.l.length}` },
      { k: 'tilb', t: 'Hjá', h: (x) => x.l.slice().sort((a, b) => perStkMVsk(a) - perStkMVsk(b)).slice(0, 5).map((r) => `<div>${slod(r.url) ? tengill(r.url, r.seljandi) : esc(r.seljandi)} <span class="samk-sm">${kr(perStkMVsk(r))}</span></div>`).join('') }
    ];
    return `<p class="samk-note">Söluverðið okkar (m. VSK, úr Vörum og þjónustu) á móti verði samkeppnisaðila. Neikvæð prósenta = við erum ódýrari en miðgildið. Aðeins vörur með nákvæma pörun (sama tegund og stærð) eru taldar — annað er „ómælt".</p>${tafla('samanb', cols, rows)}`;
  }

  // ── 3. Hvar kaupa ────────────────────────────────────────────────────────────────────────────────────────────────
  function birgjar() {
    let l = _g && Array.isArray(_g.birgjar) ? _g.birgjar : [];
    if (_land === 'is') l = l.filter((b) => b.land === 'Ísland');
    else if (_land === 'erl') l = l.filter((b) => b.land !== 'Ísland');
    if (_q) l = l.filter((b) => { const hey = norm([b.nafn, b.land, b.tegund, b.vorur, b.athugasemd].join(' ')); return _q.split(/\s+/).every((t) => hey.includes(norm(t))); });
    if (!l.length) return '<div class="samk-tomt">Engir birgjar með þessum síum.</div>';
    const kort = (b) => {
      const sy = (b.synishorn || []).filter((s) => s && s.vara).slice(0, 4).map((s) => `<li>${mynd(s.mynd_url, s.vara)}<span>${slod(s.url) ? tengill(s.url, s.vara) : esc(s.vara)}<br><span class="samk-sm">${s.verd_erl != null ? esc(s.verd_erl) + ' ' + esc(s.mynt || '') + (s.vsk ? ' · ' + esc(s.vsk) + ' VSK' : '') : 'verð ekki birt'}</span></span></li>`).join('');
      return `<div class="samk-kort">
        <h4>${esc(b.nafn)}</h4>
        <div class="samk-sm">${esc(b.land || '')} · ${esc(tegundHeiti(b.tegund))}</div>
        <div class="l">
          ${b.nuverandi_birgir ? '<span class="samk-pill gr">Núverandi birgir</span>' : ''}
          ${b.b2b ? `<span class="samk-pill">${esc(b.b2b)}</span>` : ''}
          ${b.sendir_til_islands ? `<span class="samk-pill ${b.sendir_til_islands === 'já' ? 'gr' : 'gu'}">Sendir til Íslands: ${esc(b.sendir_til_islands)}</span>` : ''}
        </div>
        <div style="font-size:13px;color:var(--ink2)">${esc(b.vorur || '')}</div>
        ${b.magn_lagmark ? `<div class="samk-sm" style="margin-top:4px">Lágmarkspöntun: ${esc(b.magn_lagmark)}</div>` : ''}
        ${b.ath_fluttning ? `<div class="samk-sm" style="margin-top:4px">Flutningur/tollar: ${esc(b.ath_fluttning)}</div>` : ''}
        ${b.athugasemd ? `<div class="samk-sm" style="margin-top:4px">${esc(b.athugasemd)}</div>` : ''}
        <div style="margin-top:8px">${tengill(b.vefur, 'Heimasíða')}</div>
        ${sy ? `<ul>${sy}</ul>` : ''}
      </div>`;
    };
    const is = l.filter((b) => b.land === 'Ísland'), erl = l.filter((b) => b.land !== 'Ísland');
    return `<p class="samk-note">Hvar við getum keypt ef við verðum tómir. Aðeins opinberar upplýsingar af vefsíðum birgja — engin samskipti hafa átt sér stað. „Sendir til Íslands" er skráð eftir því sem birgirinn birtir sjálfur; óvíst þýðir að það þarf að spyrja.</p>
      ${is.length ? `<div class="samk-h">Innanlands (${is.length})</div><div class="samk-grid">${is.map(kort).join('')}</div>` : ''}
      ${erl.length ? `<div class="samk-h">Erlendis (${erl.length})</div><div class="samk-grid">${erl.map(kort).join('')}</div>` : ''}`;
  }

  // ── 4. Okkar innkaup (birgjareikningar) ──────────────────────────────────────────────────────────────────────────
  function innkaup() {
    const ik = _g && _g.innkaup && Array.isArray(_g.innkaup.linur) ? _g.innkaup.linur : [];
    const ekkiLesid = _g && _g.innkaup && Array.isArray(_g.innkaup.ekki_lesid) ? _g.innkaup.ekki_lesid : [];
    if (!ik.length) return `<div class="samk-tomt">${esc(_innkaupVilla || 'Innkaupalínur hafa ekki verið lesnar inn enn.')}</div>`;
    const l = ik.filter((r) => passar({ nafn: r.lysing, seljandi: r.seljandi, athugasemd: r.vorunr, flokkur: '' }) && (!_seljandi || r.seljandi === _seljandi));
    // Afsláttaryfirlit per birgi (reiknað af línunum, ekki af samantekt)
    const yfir = {};
    l.forEach((r) => { const k = r.seljandi; yfir[k] = yfir[k] || {}; const a = r.afslattur_pct == null ? 'óþekktur' : Number(r.afslattur_pct); yfir[k][a] = (yfir[k][a] || 0) + 1; });
    const afslChips = Object.keys(yfir).map((s) => `<div class="samk-kort" style="padding:10px 12px"><b>${esc(s)}</b><div class="l">${Object.keys(yfir[s]).sort((a, b) => yfir[s][b] - yfir[s][a]).map((a) => `<span class="samk-pill ${Number(a) > 0 ? 'gr' : ''}">${a === 'óþekktur' ? 'afsláttur óþekktur' : Number(a) > 0 ? esc(String(a).replace('.', ',')) + ' % afsláttur' : 'enginn afsláttur'} · ${yfir[s][a]} ${yfir[s][a] === 1 ? 'lína' : 'línur'}</span>`).join('')}</div></div>`).join('');
    // Ein röð per vara og birgi: nýjasta verð + saga
    const hopar = {};
    l.forEach((r) => { const k = r.seljandi + '|' + (r.vorunr || r.lysing); (hopar[k] = hopar[k] || []).push(r); });
    const rows = Object.values(hopar).map((a) => {
      a.sort((x, y) => String(y.dags).localeCompare(String(x.dags)));
      const n = a[0];
      const nets = a.map((x) => Number(x.netto_eining_an_vsk)).filter((x) => Number.isFinite(x));
      const mark = n.okkar_id != null ? markadur().filter((r) => r.okkar_id === n.okkar_id).map((r) => ({ r, n: perStk(r) })).sort((x, y) => x.n - y.n)[0] : null;
      return { n, a, lagst: nets.length ? Math.min(...nets) : null, haest: nets.length ? Math.max(...nets) : null, mark };
    });
    const cols = [
      { k: 'selj', t: 'Birgir', v: (x) => x.n.seljandi, h: (x) => esc(x.n.seljandi) },
      { k: 'vara', t: 'Vara', v: (x) => x.n.lysing, h: (x) => `<div class="samk-nafn">${esc(x.n.lysing)}</div><div class="samk-sm">${esc(x.n.vorunr || '')}</div>` },
      { k: 'dags', t: 'Síðast keypt', v: (x) => x.n.dags, h: (x) => `${esc(dags(x.n.dags))}<div class="samk-sm">${esc(x.n.reikningur || '')}</div>` },
      { k: 'lista', t: 'Listaverð án VSK', r: 1, v: (x) => (x.n.lista_an_vsk == null ? null : Number(x.n.lista_an_vsk)), h: (x) => kr(x.n.lista_an_vsk) },
      { k: 'afsl', t: 'Afsláttur', r: 1, v: (x) => (x.n.afslattur_pct == null ? 0 : Number(x.n.afslattur_pct)), h: (x) => (Number(x.n.afslattur_pct) > 0 ? `${esc(String(x.n.afslattur_pct).replace('.', ','))} %` : '—') },
      { k: 'net', t: 'Við borguðum án VSK', r: 1, v: (x) => (x.n.netto_eining_an_vsk == null ? null : Number(x.n.netto_eining_an_vsk)), h: (x) => `<b>${kr(x.n.netto_eining_an_vsk)}</b>` },
      { k: 'fj', t: 'Kaup', r: 1, v: (x) => x.a.length, h: (x) => `${x.a.length}${x.lagst != null && x.haest != null && Math.round(x.lagst) !== Math.round(x.haest) ? `<div class="samk-sm">${thus(x.lagst)}–${thus(x.haest)}</div>` : ''}` },
      { k: 'mark', t: 'Lægst á markaði (án VSK)', r: 1, v: (x) => (x.mark ? x.mark.n : null), h: (x) => (x.mark ? `<span class="${x.n.netto_eining_an_vsk != null && x.mark.n < x.n.netto_eining_an_vsk ? 'samk-gott' : ''}">${kr(x.mark.n)}</span><div class="samk-sm">${esc(x.mark.r.seljandi)}</div>` : '<span class="samk-sm">—</span>') },
      { k: 'pdf', t: 'Reikningur', h: (x) => (x.n.drive_id ? tengill('https://drive.google.com/file/d/' + encodeURIComponent(x.n.drive_id) + '/view', 'PDF') : '') }
    ];
    return `<p class="samk-note">Verðin sem við höfum borgað birgjum, lesin af reikningum í Drive. Afslátturinn er sá sem stendur á hverri reikningslínu — hann er ekki alltaf sá sami (Oger gefur t.d. mest 35 % en lægri afslátt á sumum vörum). „Lægst á markaði" er lægsta verð án VSK sem fannst hjá öðrum seljanda fyrir sömu vöru.</p>
      <div class="samk-afsl">${afslChips}</div>${tafla('innkaup', cols, rows)}
      ${ekkiLesid.length ? `<div class="samk-h">Vantar enn</div><ul class="samk-note" style="padding-left:18px">${ekkiLesid.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
  }

  // ── Skel og teikning ─────────────────────────────────────────────────────────────────────────────────────────────
  const FLIPAR = [['odyrara', 'Ódýrara innkaup'], ['samanb', 'Verðsamanburður'], ['birgjar', 'Hvar kaupa'], ['innkaup', 'Okkar innkaup']];

  function valmyndir() {
    const m = _g && Array.isArray(_g.vorur) ? _g.vorur : [];
    const flokkar = [...new Set(m.map((r) => r.flokkur).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'is'));
    const ik = _g && _g.innkaup && Array.isArray(_g.innkaup.linur) ? _g.innkaup.linur : [];
    const selj = [...new Set((_flipi === 'innkaup' ? ik : m).map((r) => r.seljandi).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'is'));
    const sel = (id, v, fyrst, lista, fall) => `<select class="samk-sel" id="${id}" onchange="window.Samkeppni.${fall}(this.value)"><option value="">${fyrst}</option>${lista.map((x) => `<option value="${esc(x)}"${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    if (_flipi === 'birgjar') return `<select class="samk-sel" onchange="window.Samkeppni._land(this.value)"><option value="">Öll lönd</option><option value="is"${_land === 'is' ? ' selected' : ''}>Innanlands</option><option value="erl"${_land === 'erl' ? ' selected' : ''}>Erlendis</option></select>`;
    return (_flipi === 'innkaup' ? '' : sel('samk-flokkur', _flokkur, 'Allir flokkar', flokkar, '_flokk')) + sel('samk-selj', _seljandi, 'Allir seljendur', selj, '_selj');
  }

  function efni() {
    if (_villa) return `<div class="samk-tomt">${esc(_villa)}</div>`;
    if (!_g) return '<div class="loading-state">Hleður samkeppnisgögn…</div>';
    try {
      if (_flipi === 'samanb') return samanburdur();
      if (_flipi === 'birgjar') return birgjar();
      if (_flipi === 'innkaup') return innkaup();
      return odyrara();
    } catch (e) { return `<div class="samk-tomt">Villa í birtingu: ${esc(e && e.message ? e.message : e)}</div>`; }
  }

  function uppfaera() {
    if (!_rot) return;
    const e = _rot.querySelector('#samk-efni');
    if (e) e.innerHTML = efni();
    const v = _rot.querySelector('#samk-val');
    if (v) v.innerHTML = valmyndir();
    _rot.querySelectorAll('.samk-sub button').forEach((b) => b.classList.toggle('on', b.dataset.f === _flipi));
    const st = _rot.querySelector('#samk-stada');
    if (st && _g) {
      const n = (_g.vorur || []).length, s = new Set((_g.vorur || []).map((r) => r.seljandi)).size;
      st.textContent = `Verð sótt ${dags(_g.sott)} af opinberum vefsíðum · ${n} vörur frá ${s} seljendum · ${(_g.birgjar || []).length} birgjar`;
    }
  }

  function teikna(rot) {
    if (!rot) return;
    stilar();
    _rot = rot;
    if (rot.dataset.samk !== '1') {
      rot.dataset.samk = '1';
      rot.innerHTML = `<div class="samk-bar">
          <div class="samk-sub">${FLIPAR.map(([k, l]) => `<button type="button" data-f="${k}" onclick="window.Samkeppni._flipi('${k}')">${esc(l)}</button>`).join('')}</div>
          <input class="samk-in" id="samk-leit" type="text" placeholder="Leita að vöru, seljanda eða flokki…" value="${esc(_q)}" oninput="window.Samkeppni._leit(this.value)">
          <span id="samk-val" style="display:contents"></span>
        </div>
        <div class="samk-sm" id="samk-stada" style="margin:-4px 0 10px"></div>
        <div id="samk-efni"></div>`;
    }
    uppfaera();
    hlada().then(uppfaera);
  }

  window.Samkeppni = {
    teikna,
    fjoldi: () => (_g && Array.isArray(_g.vorur) ? _g.vorur.length : null),
    _flipi(k) { _flipi = k; _seljandi = ''; _flokkur = ''; uppfaera(); },
    _leit(v) { _q = String(v || '').trim(); uppfaera(); },
    _flokk(v) { _flokkur = v; uppfaera(); },
    _selj(v) { _seljandi = v; uppfaera(); },
    _land(v) { _land = v; uppfaera(); },
    _rada(id, k) { const s = _sort[id]; _sort[id] = s && s.k === k ? { k, d: -s.d } : { k, d: 1 }; uppfaera(); }
  };
})();
