/* === VERÐ SAMKEPPNISAÐILA (505) — 11.11.2026 ===
   Agnar: „bæta við flipa inn í allar þjónustutegundirnar Verð Samkeppnisaðila … þurfum að fara greina markaðinn betur,
   verð við misjöfn tilefni, stærðir, dags, frá hverjum."

   HVAÐ:  skrá yfir verð sem við höfum séð hjá öðrum — hver bauð, hvað, hvenær, við hvaða tilefni og fyrir hvaða stærð —
          með samanburði við okkar verð og uppreikningi á verðlag dagsins.
   HVAR:  „📊 Verð samkeppnisaðila" í haus ALLRA verðglugga: verðlistarnir í 502 (Sprinklerkerfi, Neyðarljós, …) og
          þjónustugluggarnir í 410 (Slökkvitæki, Brunakerfi, Slökkvikerfi). Líka á Tilboð & samningar. Glugginn opnast síaður
          á þá þjónustu sem smellt var úr; „Allar þjónustur" sýnir allt.
   GÖGN:  taflan `samkeppnisverd` (sql/samkeppnisverd.sql) — ein röð per verð. Eyðing er mjúk (`eytt`).
   VERÐ:  geymd ÁN vsk. Sé verð gefið upp með vsk er það umreiknað við skráningu og upprunatalan sögð í athugasemd.
   UPPREIKNAÐ: gamalt verð er fært á verðlag dagsins með vísitölu byggingarkostnaðar (Hagstofa, grunnur 2021 = 100) — sama
          viðmið og vísitölubundnir þjónustusamningar nota. Notað er síðasta BIRTA gildi á verðdeginum. Náist ekki í vísitöluna
          er dálkurinn auður; hér er aldrei giskað á tölu.
   SAMANBURÐUR: sé línan tengd lið í okkar verðlista (502) sést okkar verð og munurinn. Flokkarnir í 410 eiga ekki verðlista
          á því formi enn — þar er samanburðardálkurinn auður.
   API:   window.Samkeppnisverd = { opna(thjonusta?), radir() }
*/
(() => {
  if (window.Samkeppnisverd) return;

  const P = 'sk5', TAFLA = 'samkeppnisverd', VSK = 0.24;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const sb = () => (window.DB && DB.sb) || null;
  // Talnasnið reiknað sjálft — toLocaleString('is-IS') getur fallið í en-US.
  const grp = n => { const v = Math.round(Number(n) || 0), s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (v < 0 ? '−' : '') + s; };
  const kr = n => n == null ? '—' : grp(n) + ' kr';
  const pn = v => { const s = String(v == null ? '' : v).replace(/kr\.?/ig, '').replace(/[.\s]/g, '').replace(',', '.'); if (s === '') return null; const n = parseFloat(s); return isFinite(n) ? n : null; };
  const dags = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; };
  const idag = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae');
  const MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];

  const KJARNI = [{ id: 'slokkvitaeki', nafn: 'Slökkvitæki', takn: '🧯' }, { id: 'brunakerfi', nafn: 'Brunaviðvörunarkerfi', takn: '🚨' }, { id: 'slokkvikerfi', nafn: 'Slökkvikerfi í eldhúsi', takn: '🍳' }];
  const TILEFNI = ['Þjónustusamningur', 'Tilboð', 'Útboð', 'Verðskrá á vef', 'Reikningur', 'Munnlegt', 'Annað'];
  const EININGAR = ['skoðun', 'klst', 'ferð', 'stk', 'tæki', 'kerfi', 'm²', 'mán.', 'ár'];

  // ───────────────────────────── ástand ─────────────────────────────
  let _radir = [];            // allar óeyddar raðir
  let _thj = '';              // sía: þjónusta ('' = allar)
  let _leit = '';
  let _rodun = { d: 'dags', upp: false };
  let _form = null;           // { ...röð } í ritli, eða null
  let _vis = null;            // { gildi: { '2022M08': 108.3, … }, nyjast: '2026M10' } eða null

  function thjonustur() {
    const ut = KJARNI.slice(), sed = {}; ut.forEach(t => { sed[t.id] = 1; });
    try { ((window.Verdlistar && Verdlistar.listi) ? Verdlistar.listi() : []).forEach(l => { if (!sed[l.id]) { sed[l.id] = 1; ut.push({ id: l.id, nafn: l.nafn, takn: l.takn || '' }); } }); } catch (_) {}
    _radir.forEach(r => { if (r.thjonusta && !sed[r.thjonusta]) { sed[r.thjonusta] = 1; ut.push({ id: r.thjonusta, nafn: r.thjonusta, takn: '' }); } });
    return ut;
  }
  const thjNafn = id => { const t = thjonustur().filter(x => x.id === id)[0]; return t ? ((t.takn ? t.takn + ' ' : '') + t.nafn) : id; };
  // Okkar liðir til samanburðar — aðeins verðlistar í 502 eiga þá á þessu formi.
  function okkarLidir(thj) {
    try { return ((window.Verdlistar && Verdlistar.lidir) ? Verdlistar.lidir(thj) : []) || []; } catch (_) { return []; }
  }

  // ───────────────────────────── gögn ─────────────────────────────
  async function hlada() {
    const s = sb(); if (!s) return false;
    const r = await s.from(TAFLA).select('*').eq('eytt', false).order('dags', { ascending: false, nullsFirst: false }).limit(3000);
    if (r.error) { toast('Náði ekki í verð samkeppnisaðila'); return false; }
    _radir = r.data || []; return true;
  }
  // Vísitala byggingarkostnaðar, allir mánuðir (Hagstofa, VIS13000). Enginn Content-Type-haus: þá er þetta einföld beiðni án
  // forskoðunar (sjá 503). Lesaðeins; null ef ekki næst.
  const HAGSTOFA = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/visitolur/2_byggingarvisitala/byggingarvisitala/VIS13000.px';
  async function saekjaVisitolu() {
    if (_vis) return _vis;
    try {
      const r = await fetch(HAGSTOFA, { method: 'POST', body: JSON.stringify({ query: [{ code: 'Liður', selection: { filter: 'item', values: ['BCI'] } }, { code: 'Mánuður', selection: { filter: 'all', values: ['*'] } }], response: { format: 'json' } }) });
      if (!r.ok) return null;
      const j = JSON.parse((await r.text()).replace(/^﻿/, '')), g = {}; let ny = '';
      (j.data || []).forEach(d => {
        const k = (d.key || []).filter(x => /^\d{4}M\d{2}$/.test(x))[0], v = parseFloat(d.values && d.values[0]);
        if (k && isFinite(v) && v > 50 && v < 1000) { g[k] = v; if (k > ny) ny = k; }
      });
      if (!ny) return null;
      _vis = { gildi: g, nyjast: ny }; return _vis;
    } catch (_) { return null; }
  }
  const manTexti = k => { const m = /^(\d{4})M(\d{2})$/.exec(k || ''); return m ? MAN[+m[2] - 1] + ' ' + m[1] : ''; };
  // Síðasta birta gildi á verðdegi: gildi mánaðarins birtist um 23. — fyrir þann dag gildir mánuðurinn á undan.
  function visFyrir(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); if (!m || !_vis) return null;
    let y = +m[1], mo = +m[2]; if (+m[3] < 23) mo--;
    for (let i = 0; i < 4; i++) {
      if (mo < 1) { mo = 12; y--; }
      const k = y + 'M' + String(mo).padStart(2, '0');
      if (_vis.gildi[k] != null) return { k: k, g: _vis.gildi[k] };
      if (k < '2021M12') return null;   // eldra en grunnurinn nær
      mo--;
    }
    return null;
  }
  // { verd, skyring } eða null — null ef vísitalan næst ekki, verðið vantar eða grunnmánuður = nýjasti.
  function uppreiknad(r) {
    if (r.verd == null || !_vis) return null;
    const b = visFyrir(r.dags), n = _vis.gildi[_vis.nyjast]; if (!b || !n || b.k === _vis.nyjast) return null;
    return { verd: Number(r.verd) * n / b.g, skyring: 'Byggingarvísitala ' + String(b.g).replace('.', ',') + ' (' + manTexti(b.k) + ') → ' + String(n).replace('.', ',') + ' (' + manTexti(_vis.nyjast) + ')' };
  }
  function okkar(r) {
    if (!r.okkar_lidur) return null;
    const x = okkarLidir(r.thjonusta).filter(y => y.id === r.okkar_lidur)[0];
    return (x && x.verd_an_vsk != null) ? { verd: Number(x.verd_an_vsk), nafn: x.nafn } : (x ? { verd: null, nafn: x.nafn } : null);
  }

  // ───────────────────────────── stíll ─────────────────────────────
  function stilar() {
    if (document.getElementById(P + '-stil')) return;
    const B = '#' + P + '-bak ', MONO = '"JetBrains Mono",ui-monospace,monospace';
    const hn = 'all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 13px;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit';
    const inn = 'display:block;width:100%;margin:3px 0 0;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;font-weight:400;color:#0f172a;background:#fff;box-sizing:border-box;min-height:0;height:auto';
    const css = [
      '#' + P + '-bak{position:fixed;inset:0;z-index:12500;background:rgba(8,10,14,.62);display:flex;align-items:flex-start;justify-content:center;padding:26px 12px;overflow:auto;font-family:"IBM Plex Sans",system-ui,-apple-system,sans-serif}',
      B + '.' + P + '-g{background:#f4f6f9;border-radius:12px;max-width:1240px;width:100%;margin:auto;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden;color:#0f172a}',
      B + '.' + P + '-h{display:flex;align-items:center;gap:12px;padding:14px 20px;background:linear-gradient(145deg,#15171c,#30333b);color:#fff;border-bottom:3px solid #d3ab4e}',
      B + '.' + P + '-h h2{margin:0;font-size:17px;font-weight:800;color:#fff;-webkit-text-fill-color:#fff}',
      B + '.' + P + '-h p{margin:2px 0 0;font-size:12px;color:#c9d0da;-webkit-text-fill-color:#c9d0da;font-weight:400}',
      B + '.' + P + '-x{' + hn + ';width:34px;padding:0;background:rgba(255,255,255,.16);color:#fff;font-size:18px;margin-left:auto}',
      B + '.' + P + '-v{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;padding:12px 20px;background:#fff;border-bottom:1px solid #e2e8f0}',
      B + '.' + P + '-v select,' + B + '.' + P + '-v input[type=search]{height:34px;padding:0 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;color:#0f172a;background:#fff;box-sizing:border-box;min-height:0;margin:0}',
      B + '.' + P + '-v input[type=search]{width:220px;max-width:100%}',
      B + '.' + P + '-fl{font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#475569;background:#eef1f6;border-radius:5px;padding:5px 8px;white-space:nowrap}',
      B + '.' + P + '-sp{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}',
      B + '.' + P + '-t{' + hn + ';border:1px solid #cbd5e1;background:#fff;color:#0f172a}',
      B + '.' + P + '-t.a{border:0;background:linear-gradient(180deg,#b91c1c,#7f1d1d);color:#fff}',
      B + '.' + P + '-t.e{color:#b42318;border-color:#fecaca}',
      B + '.' + P + '-t:disabled{opacity:.45;cursor:default}',
      B + '.' + P + '-e{padding:14px 20px 20px}',
      // ritill
      B + '.' + P + '-f{background:#fff;border-radius:10px;box-shadow:inset 0 0 0 1px #d3ab4e,0 2px 8px rgba(10,14,22,.12);padding:14px 16px;margin:0 0 14px}',
      B + '.' + P + '-f h3{margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1f2530}',
      B + '.' + P + '-fg{display:grid;gap:10px;grid-template-columns:repeat(4,minmax(0,1fr))}',
      B + '.' + P + '-fg .b2{grid-column:span 2}',
      B + '.' + P + '-fg .b4{grid-column:1 / -1}',
      B + '.' + P + '-f label{display:block;font-size:11px;font-weight:700;color:#64748b;min-width:0;margin:0}',
      B + '.' + P + '-f label input,' + B + '.' + P + '-f label select{' + inn + '}',
      B + '.' + P + '-vv{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:6px}',
      B + '.' + P + '-fb{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}',
      B + '.' + P + '-fb .sp{margin-left:auto}',
      B + '.' + P + '-hak + .sp{display:none}',
      B + '.' + P + '-hak{display:flex!important;align-items:flex-start;gap:6px;font-size:12px!important;font-weight:600!important;color:#334155!important;cursor:pointer;white-space:normal!important;min-width:0;flex:1 1 220px;line-height:1.35}',
      // sértækara en „.f label input" (sem teygir reiti í 100 %) — annars verður gátreiturinn jafnbreiður forminu
      B + '.' + P + '-f label.' + P + '-hak input{display:inline-block;width:15px;height:15px;margin:1px 0 0;padding:0;border:0;flex:none}',
      B + '.' + P + '-hint{font-size:11.5px;color:#64748b;margin:8px 0 0;line-height:1.45}',
      // tafla
      B + 'table{width:100%;border-collapse:separate;border-spacing:0 6px}',
      B + 'th{text-align:left;font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#475569;padding:2px 10px;white-space:nowrap;cursor:pointer;user-select:none}',
      B + 'th.h{text-align:right}',
      B + 'th.on{color:#0f172a}',
      B + 'td{background:#fff;padding:9px 10px;font-size:13px;vertical-align:top;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}',
      B + 'td:first-child{border-left:1px solid #e2e8f0;border-radius:8px 0 0 8px;white-space:nowrap;font-variant-numeric:tabular-nums;color:#334155}',
      B + 'td:last-child{border-right:1px solid #e2e8f0;border-radius:0 8px 8px 0;white-space:nowrap;text-align:right}',
      B + 'td.h{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
      B + 'td b{font-weight:700;color:#0f172a}',
      B + 'td small{display:block;margin-top:2px;font-size:11.5px;color:#64748b;line-height:1.4;white-space:normal}',
      B + '.' + P + '-vd{font-size:14px;font-weight:800;color:#0f172a}',
      B + '.' + P + '-m{display:inline-block;margin-top:3px;padding:1px 6px;border-radius:4px;font-family:' + MONO + ';font-size:10.5px;font-weight:700}',
      B + '.' + P + '-m.u{background:#dbeafe;color:#1e40af}',
      B + '.' + P + '-m.y{background:#fef3c7;color:#92400e}',
      B + '.' + P + '-m.j{background:#e2e8f0;color:#334155}',
      B + '.' + P + '-ak{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:13px;color:#334155;margin-left:4px}',
      B + '.' + P + '-ak.e{color:#b42318;border-color:#fecaca}',
      B + '.' + P + '-tom{padding:28px;text-align:center;font-size:13px;color:#64748b;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px #e2e8f0}',
      B + '.' + P + '-nota{font-size:11.5px;color:#64748b;margin:10px 2px 0;line-height:1.5}',
      '@media (max-width:900px){',
      '#' + P + '-bak{padding:10px 8px}',
      B + '.' + P + '-fg{grid-template-columns:repeat(2,minmax(0,1fr))}',
      B + '.' + P + '-fg .b2{grid-column:1 / -1}',
      B + '.' + P + '-sp{margin-left:0;flex:1 1 100%}',
      B + '.' + P + '-sp .' + P + '-t{flex:1 1 auto;height:40px}',
      B + '.' + P + '-v select,' + B + '.' + P + '-v input[type=search]{flex:1 1 100%;width:100%;height:40px}',
      B + 'table,' + B + 'tbody,' + B + 'tr,' + B + 'td{display:block}',
      B + 'thead{display:none}',
      B + 'table{border-spacing:0}',
      B + 'tr{background:#fff;border:1px solid #e2e8f0;border-radius:9px;margin:0 0 8px;padding:8px 10px}',
      B + 'td,' + B + 'td:first-child,' + B + 'td:last-child{border:0;border-radius:0;padding:3px 0;background:transparent;text-align:left;white-space:normal}',
      B + 'td.h{text-align:left}',
      B + 'td[data-l]::before{content:attr(data-l) ": ";font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em}',
      B + 'td:last-child{text-align:right;padding-top:6px}',
      '}',
      '@media (max-width:520px){' + B + '.' + P + '-fg{grid-template-columns:minmax(0,1fr)}}'
    ].join('\n');
    const st = document.createElement('style'); st.id = P + '-stil'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  // ───────────────────────────── teikning ─────────────────────────────
  const bak = () => document.getElementById(P + '-bak');
  function syndar() {
    const q = norm(_leit);
    const ut = _radir.filter(r => (!_thj || r.thjonusta === _thj) && (!q || norm([r.adili, r.lidur, r.tilefni, r.staerd, r.stadur, r.ath].join(' ')).indexOf(q) >= 0));
    const d = _rodun.d, s = _rodun.upp ? 1 : -1;
    const gildi = r => d === 'verd' ? (r.verd == null ? -1 : Number(r.verd)) : d === 'dags' ? String(r.dags || '') : norm(r[d]);
    return ut.sort((a, b) => { const x = gildi(a), y = gildi(b); return x < y ? -s : x > y ? s : String(b.dags || '').localeCompare(String(a.dags || '')); });
  }

  function teikna() {
    const b = bak(); if (!b) return;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(b) : null;
    const T = thjonustur(), S = syndar();
    const adilar = {}; S.forEach(r => { if (r.adili) adilar[r.adili] = 1; });
    const nyjast = S.map(r => r.dags || '').sort().pop();
    b.querySelector('.' + P + '-v').innerHTML =
      '<select data-k="thj" aria-label="Þjónusta"><option value="">Allar þjónustur</option>' + T.map(t => '<option value="' + esc(t.id) + '"' + (t.id === _thj ? ' selected' : '') + '>' + esc((t.takn ? t.takn + ' ' : '') + t.nafn) + '</option>').join('') + '</select>' +
      '<input type="search" data-k="leit" placeholder="Leita — aðili, liður, staður…" value="' + esc(_leit) + '" aria-label="Leita">' +
      '<span class="' + P + '-fl">' + S.length + ' ' + (S.length === 1 ? 'verð' : 'verð') + '</span>' +
      '<span class="' + P + '-fl">' + Object.keys(adilar).length + ' ' + (Object.keys(adilar).length === 1 ? 'aðili' : 'aðilar') + '</span>' +
      (nyjast ? '<span class="' + P + '-fl">nýjast ' + dags(nyjast) + '</span>' : '') +
      '<span class="' + P + '-sp"><button type="button" class="' + P + '-t" data-a="csv" title="Sækja listann sem CSV (Excel)">CSV</button>' +
      '<button type="button" class="' + P + '-t a" data-a="nytt">＋ Skrá verð</button></span>';

    const dalkur = (k, t, h) => '<th data-r="' + k + '" class="' + (h ? 'h ' : '') + (_rodun.d === k ? 'on' : '') + '">' + t + (_rodun.d === k ? (_rodun.upp ? ' ▲' : ' ▼') : '') + '</th>';
    let h = _form ? formHtml() : '';
    if (!S.length) {
      h += '<div class="' + P + '-tom">' + (_radir.length ? 'Ekkert verð passar við síuna.' : 'Ekkert verð skráð enn.') + (_thj ? ' Smelltu á „＋ Skrá verð" til að skrá fyrsta verðið fyrir ' + esc(thjNafn(_thj)) + '.' : '') + '</div>';
    } else {
      h += '<table><thead><tr>' + dalkur('dags', 'Dags') + dalkur('adili', 'Frá hverjum') + dalkur('lidur', 'Liður') + dalkur('verd', 'Verð án vsk', true) +
        '<th class="h" title="Verðið fært á verðlag dagsins með vísitölu byggingarkostnaðar (Hagstofa)">Á verðlagi í dag</th><th class="h">Okkar verð</th><th></th></tr></thead><tbody>' +
        S.map(r => {
          const u = uppreiknad(r), o = okkar(r);
          let mun = '';
          if (o && o.verd != null && r.verd != null) {
            const vid = u ? u.verd : Number(r.verd), p = Math.round((o.verd - vid) / vid * 100);
            mun = '<span class="' + P + '-m ' + (p < 0 ? 'u' : p > 0 ? 'y' : 'j') + '" title="Okkar verð borið saman við ' + (u ? 'uppreiknað verð' : 'verðið eins og það var skráð') + '">' +
              (p === 0 ? 'jafnt' : (p < 0 ? grp(-p) + ' % undir' : grp(p) + ' % yfir')) + '</span>';
          }
          return '<tr data-id="' + esc(r.id) + '">' +
            '<td data-l="Dags">' + (dags(r.dags) || '—') + '</td>' +
            '<td data-l="Frá"><b>' + esc(r.adili || 'Óþekktur aðili') + '</b><small>' + esc([_thj ? '' : thjNafn(r.thjonusta), r.tilefni, r.stadur].filter(Boolean).join(' · ')) + '</small></td>' +
            '<td data-l="Liður">' + esc(r.lidur || '—') + '<small>' + esc([r.staerd, r.ath].filter(Boolean).join(' · ')) + '</small></td>' +
            '<td class="h" data-l="Verð án vsk"><span class="' + P + '-vd">' + kr(r.verd) + '</span>' + (r.eining ? '<small>á ' + esc(r.eining) + '</small>' : '') + '</td>' +
            '<td class="h" data-l="Á verðlagi í dag"' + (u ? ' title="' + esc(u.skyring) + '"' : '') + '>' + (u ? kr(u.verd) + '<small>' + esc(u.skyring.replace('Byggingarvísitala ', 'vísit. ')) + '</small>' : '—') + '</td>' +
            '<td class="h" data-l="Okkar verð">' + (o ? (o.verd != null ? kr(o.verd) : 'ekkert verð') + '<small>' + esc(o.nafn) + '</small>' + mun : '—') + '</td>' +
            '<td><button type="button" class="' + P + '-ak" data-a="breyta" title="Breyta" aria-label="Breyta">✎</button><button type="button" class="' + P + '-ak e" data-a="eyda" title="Eyða" aria-label="Eyða">✕</button></td></tr>';
        }).join('') + '</tbody></table>';
    }
    h += '<p class="' + P + '-nota">Verð eru án vsk. „Á verðlagi í dag" notar vísitölu byggingarkostnaðar frá Hagstofu' +
      (_vis ? ' (nýjasta gildi: ' + String(_vis.gildi[_vis.nyjast]).replace('.', ',') + ', ' + manTexti(_vis.nyjast) + ')' : ' — náðist ekki í hana núna, dálkurinn er auður') +
      '. „Okkar verð" birtist þegar línan er tengd lið í okkar verðlista.</p>';
    b.querySelector('.' + P + '-e').innerHTML = h;
    if (aftur) aftur();
  }

  function formHtml() {
    const f = _form, T = thjonustur(), ok = okkarLidir(f.thjonusta);
    const adilar = Object.keys(_radir.reduce((m, r) => { if (r.adili) m[r.adili] = 1; return m; }, {})).sort((a, b) => a.localeCompare(b, 'is'));
    const lidir = Object.keys(ok.map(x => x.nafn).concat(_radir.filter(r => r.thjonusta === f.thjonusta).map(r => r.lidur)).reduce((m, x) => { if (x) m[x] = 1; return m; }, {}));
    const dl = (id, a) => '<datalist id="' + id + '">' + a.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>';
    const inn = (merki, k, gildi, o) => '<label class="' + ((o && o.kl) || '') + '">' + merki + '<input data-f="' + k + '" type="' + ((o && o.type) || 'text') + '" value="' + esc(gildi == null ? '' : gildi) + '" placeholder="' + esc((o && o.ph) || '') + '"' + ((o && o.list) ? ' list="' + o.list + '"' : '') + ((o && o.im) ? ' inputmode="' + o.im + '"' : '') + ' autocomplete="off"></label>';
    return '<div class="' + P + '-f"><h3>' + (f.id ? 'Breyta verði' : 'Skrá verð samkeppnisaðila') + '</h3><div class="' + P + '-fg">' +
      '<label>Þjónusta<select data-f="thjonusta">' + T.map(t => '<option value="' + esc(t.id) + '"' + (t.id === f.thjonusta ? ' selected' : '') + '>' + esc((t.takn ? t.takn + ' ' : '') + t.nafn) + '</option>').join('') + '</select></label>' +
      inn('Frá hverjum', 'adili', f.adili, { ph: 'Samkeppnisaðili', list: P + '-dl-ad' }) +
      inn('Dagsetning verðs', 'dags', f.dags, { type: 'date' }) +
      inn('Tilefni', 'tilefni', f.tilefni, { ph: 'Tilboð, samningur, útboð…', list: P + '-dl-ti' }) +
      inn('Liður — hvað er verðlagt', 'lidur', f.lidur, { ph: 'T.d. Ársskoðun vatnsúðakerfis', list: P + '-dl-li', kl: 'b2' }) +
      '<label>Verð<span class="' + P + '-vv"><input data-f="verd" type="text" inputmode="numeric" value="' + esc(f.verd == null ? '' : grp(f.verd)) + '" placeholder="kr" autocomplete="off">' +
        '<select data-f="mvsk" aria-label="Með eða án vsk"><option value="0">án vsk</option><option value="1"' + (f.mvsk ? ' selected' : '') + '>með vsk</option></select></span></label>' +
      inn('Eining', 'eining', f.eining, { ph: 'skoðun, klst, ferð…', list: P + '-dl-ei' }) +
      inn('Stærð verks eða kerfis', 'staerd', f.staerd, { ph: 'T.d. 120 úðastútar · 40 tæki · 2.500 m²', kl: 'b2' }) +
      inn('Staður / fyrir hvern', 'stadur', f.stadur, { ph: 'Valfrjálst', kl: 'b2' }) +
      inn('Athugasemd / heimild', 'ath', f.ath, { ph: 'Hvaðan talan kemur, hvað er innifalið…', kl: 'b2' }) +
      '<label class="b2">Bera saman við okkar lið<select data-f="okkar_lidur"><option value="">— enginn —</option>' +
        ok.map(x => '<option value="' + esc(x.id) + '"' + (x.id === f.okkar_lidur ? ' selected' : '') + '>' + esc(x.nafn + (x.verd_an_vsk != null ? ' — ' + grp(x.verd_an_vsk) + ' kr' : ' — ekkert verð')) + '</option>').join('') + '</select></label>' +
      '</div>' + dl(P + '-dl-ad', adilar) + dl(P + '-dl-ti', TILEFNI) + dl(P + '-dl-li', lidir) + dl(P + '-dl-ei', EININGAR) +
      (ok.length ? '' : '<p class="' + P + '-hint">Þessi þjónusta á ekki verðlista sem hægt er að bera saman við enn — verðið er skráð og samanburðurinn bætist við síðar.</p>') +
      '<div class="' + P + '-fb">' +
        (f.id ? '<button type="button" class="' + P + '-t e" data-a="eyda-f">Eyða</button>' : '<label class="' + P + '-hak"><input type="checkbox" data-f="halda"' + (f.halda ? ' checked' : '') + '> Halda aðila, dagsetningu og tilefni fyrir næstu línu</label>') +
        '<span class="sp"></span><button type="button" class="' + P + '-t" data-a="haetta">Hætta við</button><button type="button" class="' + P + '-t a" data-a="vista">💾 Vista</button>' +
      '</div></div>';
  }
  function lesaForm() {
    const b = bak(), g = k => { const e = b.querySelector('[data-f="' + k + '"]'); return e ? (e.type === 'checkbox' ? e.checked : String(e.value || '').trim()) : ''; };
    return Object.assign({}, _form, { thjonusta: g('thjonusta') || _form.thjonusta, adili: g('adili'), dags: g('dags'), tilefni: g('tilefni'), lidur: g('lidur'), verd: pn(g('verd')), mvsk: g('mvsk') === '1',
      eining: g('eining'), staerd: g('staerd'), stadur: g('stadur'), ath: g('ath'), okkar_lidur: g('okkar_lidur') || null, halda: g('halda') === true });
  }
  function nyttForm(fra) {
    return { id: null, thjonusta: (fra && fra.thjonusta) || _thj || thjonustur()[0].id, adili: (fra && fra.adili) || '', dags: (fra && fra.dags) || idag(), tilefni: (fra && fra.tilefni) || '',
      lidur: '', verd: null, mvsk: false, eining: '', staerd: '', stadur: (fra && fra.stadur) || '', ath: '', okkar_lidur: null, halda: fra ? !!fra.halda : true };
  }

  // ───────────────────────────── aðgerðir ─────────────────────────────
  let _vistar = false;
  async function vista() {
    if (_vistar || !_form) return; _vistar = true;
    try {
      const f = lesaForm(), s = sb(); if (!s) { toast('Ekki samband við gagnagrunn'); return; }
      let verd = f.verd, ath = f.ath;
      if (verd != null && f.mvsk) {   // geymt án vsk; upprunatalan fylgir í athugasemd
        ath = (ath ? ath + ' ' : '') + '(Gefið upp með vsk: ' + grp(verd) + ' kr.)'; verd = Math.round(verd / (1 + VSK));
      }
      const rod = { thjonusta: f.thjonusta, adili: f.adili, lidur: f.lidur, verd: verd, eining: f.eining, dags: f.dags || null, tilefni: f.tilefni, staerd: f.staerd, stadur: f.stadur, ath: ath,
        okkar_lidur: f.okkar_lidur, updated_at: new Date().toISOString() };
      let r;
      if (f.id) r = await s.from(TAFLA).update(rod).eq('id', f.id).select();
      else r = await s.from(TAFLA).insert(rod).select();
      if (r && r.error) { toast('Vistun tókst ekki — reyndu aftur'); return; }
      const ny = Object.assign({ id: f.id || ('br-' + Date.now()), eytt: false }, rod, (r && r.data && r.data[0]) || {});
      const i = _radir.findIndex(x => x.id === ny.id); if (i >= 0) _radir[i] = ny; else _radir.unshift(ny);
      toast(f.adili ? '✓ Verð vistað' : '✓ Vistað — án aðila; bættu við frá hverjum verðið er');
      _form = (!f.id && f.halda) ? nyttForm(f) : null;
      teikna();
      if (_form) { const e = bak().querySelector('[data-f="lidur"]'); if (e) e.focus(); }
    } finally { _vistar = false; }
  }
  async function eyda(id) {
    const r0 = _radir.filter(x => x.id === id)[0]; if (!r0) return;
    if (!confirm('Eyða verðinu „' + (r0.lidur || '—') + '" frá ' + (r0.adili || 'óþekktum aðila') + '?')) return;
    const s = sb(); if (!s) return;
    const r = await s.from(TAFLA).update({ eytt: true, updated_at: new Date().toISOString() }).eq('id', id);   // mjúk eyðing
    if (r && r.error) { toast('Eyðing tókst ekki'); return; }
    _radir = _radir.filter(x => x.id !== id); if (_form && _form.id === id) _form = null;
    toast('Verði eytt'); teikna();
  }
  function csv() {
    const S = syndar(), q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const l = [['Þjónusta', 'Dags', 'Frá hverjum', 'Liður', 'Verð án vsk', 'Eining', 'Á verðlagi í dag', 'Okkar verð', 'Tilefni', 'Stærð', 'Staður', 'Athugasemd'].map(q).join(';')];
    S.forEach(r => { const u = uppreiknad(r), o = okkar(r);
      l.push([(thjonustur().filter(x => x.id === r.thjonusta)[0] || { nafn: r.thjonusta }).nafn, dags(r.dags), r.adili, r.lidur, r.verd == null ? '' : Math.round(r.verd), r.eining, u ? Math.round(u.verd) : '', (o && o.verd != null) ? Math.round(o.verd) : '', r.tilefni, r.staerd, r.stadur, r.ath].map(q).join(';')); });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + l.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'verd-samkeppnisadila' + (_thj ? '-' + _thj : '') + '-' + idag() + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // Óvistuð breyting í ritlinum? (borið saman við það sem ritillinn var opnaður með)
  const formBreytt = () => {
    if (!_form || !bak() || !bak().querySelector('[data-f="lidur"]')) return false;
    const f = lesaForm(), t = v => (v == null ? '' : String(v));
    return ['thjonusta', 'adili', 'dags', 'tilefni', 'lidur', 'eining', 'staerd', 'stadur', 'ath', 'okkar_lidur'].some(k => t(f[k]) !== t(_form[k])) ||
      t(f.verd == null ? '' : Math.round(f.verd)) !== t(_form.verd == null ? '' : Math.round(_form.verd));
  };
  function loka(spyrja) {
    const b = bak(); if (!b) return true;
    if (spyrja && formBreytt() && !confirm('Loka án þess að vista verðið sem þú ert að skrá?')) return false;
    b.remove(); document.removeEventListener('keydown', escLoka, true); _form = null;
    return true;
  }
  function escLoka(e) { if (e.key !== 'Escape' || !bak()) return; e.stopPropagation(); loka(true); }

  async function opna(thj) {
    stilar(); loka(false);
    _thj = thj || ''; _leit = ''; _form = null;
    const b = document.createElement('div'); b.id = P + '-bak';
    b.innerHTML = '<div class="' + P + '-g" role="dialog" aria-modal="true" aria-label="Verð samkeppnisaðila">' +
      '<div class="' + P + '-h"><div style="min-width:0"><h2>📊 Verð samkeppnisaðila</h2><p>Markaðsverð eftir þjónustu — frá hverjum, hvenær, við hvaða tilefni og fyrir hvaða stærð.</p></div>' +
        '<button type="button" class="' + P + '-x" data-a="loka" aria-label="Loka">×</button></div>' +
      '<div class="' + P + '-v"></div><div class="' + P + '-e"><div class="' + P + '-tom">Sæki…</div></div></div>';
    document.body.appendChild(b);
    b.addEventListener('click', e => {
      if (e.target === b) { loka(true); return; }
      const th = e.target.closest('th[data-r]');
      if (th) { const k = th.dataset.r; _rodun = { d: k, upp: _rodun.d === k ? !_rodun.upp : (k !== 'dags' && k !== 'verd') }; if (_form) _form = lesaForm(); teikna(); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const tr = a.closest('tr'), id = tr && tr.dataset.id;
      switch (a.dataset.a) {
        case 'loka': loka(true); break;
        case 'nytt': _form = nyttForm(); teikna(); { const el = b.querySelector('[data-f="adili"]'); if (el) el.focus(); } break;
        case 'haetta': _form = null; teikna(); break;
        case 'vista': vista(); break;
        case 'csv': csv(); break;
        case 'breyta': { const r = _radir.filter(x => x.id === id)[0]; if (r) { _form = Object.assign({ mvsk: false, halda: false }, r); teikna(); b.querySelector('.' + P + '-f').scrollIntoView({ block: 'nearest' }); } break; }
        case 'eyda': eyda(id); break;
        case 'eyda-f': eyda(_form && _form.id); break;
      }
    });
    b.addEventListener('change', e => {
      const t = e.target; if (!t || !t.dataset) return;
      if (t.dataset.k === 'thj') { _thj = t.value; if (_form && !_form.id) { _form = lesaForm(); _form.thjonusta = _thj || _form.thjonusta; _form.okkar_lidur = null; } teikna(); return; }
      if (t.dataset.f === 'thjonusta') { _form = lesaForm(); _form.okkar_lidur = null; teikna(); return; }   // okkar liðir fylgja þjónustunni
      if (t.dataset.f === 'lidur') {   // heiti sem er til í okkar lista tengist sjálft
        const x = okkarLidir(lesaForm().thjonusta).filter(y => norm(y.nafn) === norm(t.value))[0], sel = b.querySelector('[data-f="okkar_lidur"]');
        if (x && sel && !sel.value) sel.value = x.id;
      }
    });
    b.addEventListener('input', e => {
      const t = e.target; if (!t || !t.dataset || t.dataset.k !== 'leit') return;
      _leit = t.value; if (_form) _form = lesaForm(); teikna();
      const n = b.querySelector('[data-k="leit"]'); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (_) {} }
    });
    b.addEventListener('blur', e => { const t = e.target; if (t && t.dataset && t.dataset.f === 'verd') { const n = pn(t.value); t.value = n == null ? '' : grp(n); } }, true);
    document.addEventListener('keydown', escLoka, true);
    try { if (window.AppSettings && AppSettings.load) await AppSettings.load(); } catch (_) {}   // verðlistar (okkar verð) ferskir
    await Promise.all([hlada(), saekjaVisitolu()]);
    if (bak()) teikna();
  }

  // ───────────────────────────── tengingar ─────────────────────────────
  let _tengt = {}, _tilr = 0;
  function tengja() {
    const o = { texti: '📊 Verð samkeppnisaðila', titill: 'Verð samkeppnisaðila fyrir þessa þjónustu — frá hverjum, hvenær, tilefni og stærð; borið saman við okkar verð', smellur: id => opna(id) };
    const V = window.Verdlistar, H = window.ThjonustuTengingar, T = window.TilbodHub;
    if (!_tengt.v && V && V.hausTakki) { _tengt.v = 1; V.hausTakki('*', o); }
    if (!_tengt.h && H && H.hausTakki) { _tengt.h = 1; H.hausTakki(o); }
    if (!_tengt.t && T && T.tol) { _tengt.t = 1; T.tol({ texti: 'Verð samkeppnisaðila', titill: 'Markaðsverð eftir þjónustu — skrá og bera saman', smellur: () => opna() }); }
    if ((!_tengt.v || !_tengt.h || !_tengt.t) && _tilr++ < 40) setTimeout(tengja, 300);
  }
  tengja();

  window.Samkeppnisverd = { opna: opna, radir: () => _radir.slice() };
})();
