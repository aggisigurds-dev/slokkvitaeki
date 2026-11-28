/* === 539 — VATNSÚÐAKERFI: ÞJÓNUSTUFLIPI OG VINNUFORM Á FYRIRTÆKJAPRÓFÍLNUM — 28.11.2026 =============================
 *
 * Agnar 28.11.2026 (Fiskislóð 41, Bílabúð Benna): „Mætti sjást allar þjónusturnar þarna … gera vatnsúðakerfið, td ljósblátt
 * … en það er held ég 4 sinnum á ári, mátt reyna setja upp einhvernskonar vinnuform þarna inná nýja þjónustuliðnum."
 * og: „hafa í samræmi, í þjónustu, hvað, hvenær, einingar, og tæki".
 *
 * HVAÐ: kerfi sem er „í þjónustu hjá okkur" í Kerfi og þjónusta (stadur_kerfi: kerfi='vatnsudakerfi', til_stadar='ja',
 * þjónustuaðili 'okkar…') fær eigin flipa á prófílnum (500: TABS 'ud', KAFLAR '#_ud539'). Hér er innihald flipans:
 *   · haus: Vatnsúðakerfi · Úðaslökkvikerfi · Í þjónustu hjá okkur · tíðni (1/2/4/12 á ári — Agnar sagði „held ég 4", svo hún
 *     er breytanleg) · einingar (úðastútar/kerfishlutar, handskráð) · athugasemd kerfisins úr stadur_kerfi
 *   · tímabil ársins (ársfjórðungar þegar tíðni er 4): hvert með skoðunardag, skoðunarmann, gátlista og nótu — Vista per tímabil
 *
 * GÖGN: stadur_kerfi.smaatridi.vinnuform (jsonb, sameinað — aðrir lyklar í smaatridi standa óhreyfðir):
 *   { tidni: 4, einingar: 120|null, skodanir: { "2026-Q4": { dags, madur, atridi: { lykill: 'ok'|'ath'|'' }, nota, vistad, af } } }
 * Engin ný tafla, ekkert skrifað í solur/customer_documents. Lesið beint af töflunni (sama tenging og 449a skrifar með).
 *
 * GÁTLISTINN er DRÖG: ársfjórðungsliðir skv. ÍST EN 12845 kafla 20.3.2 og HMS-leiðbeiningu 9.4.6 (sjá
 * .claude/skills/arnold/references/arsskodun-kerfi.md og terry-crews.md). Agnar lagar orðalag og liði; ekkert hér er tala sem
 * endar á reikningi.
 *
 * SAMTAL VIÐ 500: window.UdaVinnuform.stada(fid) skilar samstundis úr skyndiminni { okkar, tidni, ein, n, sidast, naest, st } —
 * hausinn (ljósblái kassinn), KPI-spjaldið og undirlína flipans lesa það. Þegar gögn hlaðast/vistast er sent 'ud539:uppfaert'.
 * ================================================================================================================ */
(() => {
  if (window.__ud539) return;
  window.__ud539 = true;

  const ID = '_ud539';
  const KERFI = 'vatnsudakerfi';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SERIF = '"Playfair Display",Georgia,serif';
  const BLATT = 'linear-gradient(145deg,#04101c 0%,#0b3350 20%,#176a9e 43%,#2d8ac6 53%,#0b3350 74%,#04101c 100%)';
  const TIDNIR = [[1, 'einu sinni á ári'], [2, 'tvisvar á ári'], [4, 'fjórum sinnum á ári (ársfjórðungslega)'], [12, 'mánaðarlega']];
  const ATRIDI = [
    ['stutar', 'Úðastútar — sýnilegt ástand, ekkert hindrar úðadreifingu'],
    ['lagnir', 'Lagnir og upphengi — ryð, leki, festingar'],
    ['vatnsveita', 'Vatnsveita / vatnsgjafi — þrýstingur og rennsli'],
    ['lokar', 'Lokar — aðallokar opnir, læstir eða vaktaðir'],
    ['vidvorun', 'Viðvörunarbúnaður — vatnsklukka og flæðirofar prófaðir'],
    ['daela', 'Dæla — ræsing, flæði og þrýstingur'],
    ['maelar', 'Þrýstimælar — lesnir og skráðir'],
    ['frost', 'Frostvörn / hitastig í dæluhúsi og lögnum'],
    ['merkingar', 'Merkingar, aðgengi og þjónustubók'],
  ];
  const MAN = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const SB = () => (window.DB && window.DB.sb) || null;
  const toast = (m) => { if (window.Toast && Toast.show) Toast.show(m); };
  const erOkkar = (a) => /^okkar/i.test(String(a || '').trim());
  const dmy = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  const idag = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const notandi = () => { try { return (window.Flokkun && Flokkun.notandi && Flokkun.notandi()) || (window.Auth && Auth.user && Auth.user.name) || 'Slökkvitæki'; } catch (_) { return 'Slökkvitæki'; } };
  const opidFid = () => { const n = parseInt(window._currentCompanyId != null ? window._currentCompanyId : (window.Companies && Companies.currentId), 10); return isFinite(n) && n > 0 ? n : null; };

  /* ── TÍMABIL ─────────────────────────────────────────────────────────────────────────────────────────────── */
  // Skilar tímabilum ársins fyrir tíðnina: { k:'2026-Q4', heiti, stutt, fra:'YYYY-MM-DD', til:'YYYY-MM-DD' }
  function timabil(Y, tidni) {
    const n = [1, 2, 4, 12].includes(+tidni) ? +tidni : 4;
    const out = [];
    for (let i = 0; i < n; i++) {
      const m0 = Math.floor(12 / n) * i, m1 = Math.floor(12 / n) * (i + 1);   // mánuðir [m0, m1)
      const fra = Y + '-' + String(m0 + 1).padStart(2, '0') + '-01';
      const siðasti = new Date(Y, m1, 0).getDate();
      const til = Y + '-' + String(m1).padStart(2, '0') + '-' + String(siðasti).padStart(2, '0');
      const k = n === 1 ? String(Y) : n === 2 ? Y + '-H' + (i + 1) : n === 4 ? Y + '-Q' + (i + 1) : Y + '-M' + String(i + 1).padStart(2, '0');
      const heiti = n === 1 ? 'Ársskoðun ' + Y : n === 2 ? (i + 1) + '. hálfár ' + Y : n === 4 ? (i + 1) + '. ársfjórðungur ' + Y : MAN[i] + ' ' + Y;
      const stutt = n === 1 ? String(Y) : n === 2 ? 'H' + (i + 1) + ' ' + Y : n === 4 ? (i + 1) + '. ársfj. ' + Y : MAN[i] + ' ' + Y;
      out.push({ k, heiti, stutt, fra, til, man: MAN[m0] + (m1 - m0 > 1 ? '–' + MAN[m1 - 1] : '') });
    }
    return out;
  }
  // Staða tímabils: 'skodad' (dags skráður) · 'nuna' (líðandi) · 'lidid' (liðið, óskoðað) · 'framundan'
  function tbStada(tb, sk) {
    if (sk && sk.dags) return 'skodad';
    const n = idag();
    if (n > tb.til) return 'lidid';
    if (n >= tb.fra) return 'nuna';
    return 'framundan';
  }

  /* ── GÖGN ────────────────────────────────────────────────────────────────────────────────────────────────── */
  const _m = new Map();   // fid → { rod, vf, t, bid }
  const vfAf = (rod) => {
    const s = rod && rod.smaatridi && typeof rod.smaatridi === 'object' ? rod.smaatridi : {};
    const v = s.vinnuform && typeof s.vinnuform === 'object' ? s.vinnuform : {};
    return { tidni: [1, 2, 4, 12].includes(+v.tidni) ? +v.tidni : 4, einingar: v.einingar != null && v.einingar !== '' ? +v.einingar : null, skodanir: v.skodanir && typeof v.skodanir === 'object' ? v.skodanir : {} };
  };
  async function lesa(fid, ferskt) {
    const x = _m.get(fid);
    if (x && !ferskt && Date.now() - x.t < 60000) return x;
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('stadur_kerfi').select('fyrirtaeki_id,kerfi,til_stadar,thjonustuadili,athugasemd,smaatridi,uppfaert,skrad_af').eq('fyrirtaeki_id', fid).eq('kerfi', KERFI).maybeSingle();
    if (r.error) throw r.error;
    const g = { rod: r.data || null, vf: vfAf(r.data), t: Date.now() };
    _m.set(fid, g);
    return g;
  }
  const okkar = (g) => !!(g && g.rod && g.rod.til_stadar === 'ja' && erOkkar(g.rod.thjonustuadili));

  // Samstæð staða fyrir 500 (haus, KPI, undirlína) — úr skyndiminni, aldrei beðið
  function stada(fid) {
    const g = _m.get(+fid);
    if (!g) return null;
    if (!okkar(g)) return { okkar: false };
    const Y = new Date().getFullYear(), vf = g.vf;
    const tbs = timabil(Y, vf.tidni);
    const skod = Object.keys(vf.skodanir || {}).map((k) => Object.assign({ k }, vf.skodanir[k])).filter((s) => s && s.dags).sort((a, b) => String(b.dags).localeCompare(String(a.dags)));
    const n = tbs.filter((tb) => vf.skodanir[tb.k] && vf.skodanir[tb.k].dags).length;
    let st = 'g', naest = '';
    for (const tb of tbs) {
      const s = tbStada(tb, vf.skodanir[tb.k]);
      if (s === 'lidid') { st = 'r'; if (!naest) naest = tb.stutt; }
      else if (s === 'nuna') { if (st !== 'r') st = 'y'; if (!naest) naest = tb.stutt; }
      else if (s === 'framundan' && !naest) naest = tb.stutt;
    }
    if (!naest) naest = timabil(Y + 1, vf.tidni)[0].stutt;
    return { okkar: true, tidni: vf.tidni, ein: vf.einingar || 0, n, sidast: skod.length ? dmy(skod[0].dags) : '', naest, st };
  }

  async function vista(fid, breyting) {
    const sb = SB(); if (!sb) throw new Error('Engin gagnabankatenging');
    const g = await lesa(fid, true);
    if (!g || !g.rod) throw new Error('Kerfið er ekki skráð á staðinn (stadur_kerfi)');
    const sma = Object.assign({}, g.rod.smaatridi && typeof g.rod.smaatridi === 'object' ? g.rod.smaatridi : {});
    const vf = vfAf(g.rod);
    if (breyting.tidni != null) vf.tidni = +breyting.tidni;
    if ('einingar' in breyting) vf.einingar = breyting.einingar === '' || breyting.einingar == null ? null : +breyting.einingar;
    if (breyting.skodun) vf.skodanir = Object.assign({}, vf.skodanir, { [breyting.skodun.k]: Object.assign({}, vf.skodanir[breyting.skodun.k] || {}, breyting.skodun.g, { vistad: new Date().toISOString(), af: notandi() }) });
    sma.vinnuform = vf;
    const r = await sb.from('stadur_kerfi').update({ smaatridi: sma, skrad_af: notandi(), uppfaert: new Date().toISOString() }).eq('fyrirtaeki_id', fid).eq('kerfi', KERFI).select('fyrirtaeki_id,kerfi,til_stadar,thjonustuadili,athugasemd,smaatridi,uppfaert,skrad_af');
    if (r.error) throw r.error;
    const rod = (r.data && r.data[0]) || Object.assign({}, g.rod, { smaatridi: sma });
    _m.set(fid, { rod, vf: vfAf(rod), t: Date.now() });
    try { document.dispatchEvent(new CustomEvent('ud539:uppfaert', { detail: { fid } })); } catch (_) {}
    return true;
  }

  /* ── CSS ────────────────────────────────────────────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById(ID + '-css')) return;
    const st = document.createElement('style'); st.id = ID + '-css';
    const R = '#' + ID;
    st.textContent = [
      R + '{background:#fff;border-radius:0 0 14px 14px;color:#11141c;font-family:' + SANS + ';box-shadow:inset 0 1px 0 rgba(20,24,34,.08);overflow:hidden}',
      R + ' .ud-haus{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 18px;color:#fff;background:' + BLATT + '}',
      R + ' .ud-haus h3{margin:0;font:700 20px/1.1 ' + SERIF + ';display:flex;align-items:center;gap:10px}',
      R + ' .ud-haus h3 small{font:500 11px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#cfe8ff}',
      R + ' .ud-pill{font:600 11px ' + MONO + ';letter-spacing:.06em;border-radius:99px;padding:3px 10px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}',
      R + ' .ud-pill.ok{background:rgba(34,192,106,.22);box-shadow:inset 0 0 0 1px rgba(34,192,106,.6)}',
      R + ' .ud-haus .ud-still{margin-left:auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
      R + ' .ud-haus label{display:flex;flex-direction:column;gap:3px;font:600 10px ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#cfe8ff}',
      R + ' .ud-haus select,' + R + ' .ud-haus input{font:600 13px ' + SANS + ';color:#11141c;background:#eaf3fb;border:0;border-radius:7px;padding:6px 9px;min-width:150px}',
      R + ' .ud-haus input{min-width:90px;width:110px}',
      R + ' .ud-ath{padding:8px 18px;font:400 13px/1.45 ' + SANS + ';color:#3a4250;background:#eef3f8;border-bottom:1px solid #dbe3ec}',
      R + ' .ud-ar{display:flex;align-items:center;gap:10px;padding:12px 18px 0}',
      R + ' .ud-ar b{font:700 16px ' + SERIF + '}',
      R + ' .ud-ar button{border:1px solid #c9d3df;background:#fff;border-radius:7px;padding:4px 10px;cursor:pointer;font:600 13px ' + SANS + '}',
      R + ' .ud-ar .ud-samt{margin-left:auto;font:500 11.5px ' + MONO + ';color:#525b6b}',
      R + ' .ud-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;padding:12px 18px 18px}',
      R + ' .ud-tb{border:1px solid #d7dfe8;border-radius:12px;overflow:hidden;background:#fbfcfe;display:flex;flex-direction:column}',
      R + ' .ud-tb .hd{display:flex;align-items:center;gap:8px;padding:9px 12px;background:linear-gradient(180deg,#e8f1fa,#d9e7f4);border-bottom:1px solid #cfdbe8}',
      R + ' .ud-tb .hd b{font:700 14px ' + SANS + '}',
      R + ' .ud-tb .hd small{font:500 11px ' + MONO + ';color:#525b6b}',
      R + ' .ud-tb .hd .st{margin-left:auto;font:700 10.5px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;border-radius:99px;padding:3px 9px;color:#fff;background:#8a93a3}',
      R + ' .ud-tb .hd .st.skodad{background:#16783f}' + R + ' .ud-tb .hd .st.nuna{background:#c48a1f}' + R + ' .ud-tb .hd .st.lidid{background:#a01818}',
      R + ' .ud-tb .bd{padding:10px 12px;display:flex;flex-direction:column;gap:8px}',
      R + ' .ud-tb .rod2{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      R + ' .ud-tb label{display:flex;flex-direction:column;gap:3px;font:600 10px ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#525b6b}',
      R + ' .ud-tb input,' + R + ' .ud-tb textarea{font:500 13px ' + SANS + ';color:#11141c;background:#fff;border:1px solid #c9d3df;border-radius:7px;padding:6px 8px;width:100%;box-sizing:border-box}',
      R + ' .ud-tb textarea{min-height:46px;resize:vertical}',
      R + ' .ud-atr{display:flex;flex-direction:column;gap:4px}',
      R + ' .ud-atr .a{display:flex;align-items:center;gap:8px;font:400 12.5px/1.35 ' + SANS + ';padding:3px 0;border-bottom:1px dashed #e3e9f0}',
      R + ' .ud-atr .a span{flex:1;min-width:0}',
      R + ' .ud-atr .a .tri{display:inline-flex;border:1px solid #c9d3df;border-radius:7px;overflow:hidden;flex:none}',
      R + ' .ud-atr .a .tri button{border:0;background:#fff;cursor:pointer;font:700 11px ' + MONO + ';padding:3px 8px;color:#525b6b}',
      R + ' .ud-atr .a .tri button[aria-pressed="true"][data-v="ok"]{background:#16783f;color:#fff}',
      R + ' .ud-atr .a .tri button[aria-pressed="true"][data-v="ath"]{background:#c48a1f;color:#fff}',
      R + ' .ud-tb .ft{display:flex;align-items:center;gap:10px;padding-top:4px}',
      R + ' .ud-tb .ft .vista{border:0;border-radius:8px;padding:8px 16px;cursor:pointer;color:#fff;font:700 13px ' + SANS + ';background:' + BLATT + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 5px rgba(0,0,0,.25)}',
      R + ' .ud-tb .ft .vista:disabled{opacity:.6;cursor:default}',
      R + ' .ud-tb .ft small{font:500 11px ' + MONO + ';color:#525b6b}',
      R + ' .ud-fot{padding:0 18px 14px;font:400 11.5px/1.45 ' + SANS + ';color:#6b7482}',
      R + ' .ud-villa{padding:14px 18px;color:#8a1c1c;font:500 13px ' + SANS + '}',
      '@media (max-width:640px){' + R + ' .ud-haus .ud-still{margin-left:0}' + R + ' .ud-tb .rod2{grid-template-columns:1fr}}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── TEIKNING ───────────────────────────────────────────────────────────────────────────────────────────── */
  const _ar = new Map();   // fid → ár sem er opið í forminu
  function html(fid, g) {
    const vf = g.vf, rod = g.rod;
    const Y = _ar.get(fid) || new Date().getFullYear();
    const tbs = timabil(Y, vf.tidni);
    const st = stada(fid) || {};
    const n = tbs.filter((tb) => vf.skodanir[tb.k] && vf.skodanir[tb.k].dags).length;
    let h = '<div class="ud-haus"><h3>💦 Vatnsúðakerfi <small>Úðaslökkvikerfi</small></h3>' +
      '<span class="ud-pill ok">✓ Í þjónustu hjá okkur</span>' +
      (st.sidast ? '<span class="ud-pill">síðast ' + esc(st.sidast) + '</span>' : '<span class="ud-pill">engin skoðun skráð enn</span>') +
      (st.naest ? '<span class="ud-pill">næst ' + esc(st.naest) + '</span>' : '') +
      '<div class="ud-still">' +
        '<label>Tíðni<select data-ud="tidni">' + TIDNIR.map((t) => '<option value="' + t[0] + '"' + (t[0] === vf.tidni ? ' selected' : '') + '>' + t[0] + '× — ' + t[1] + '</option>').join('') + '</select></label>' +
        '<label>Einingar<input type="number" min="0" inputmode="numeric" data-ud="einingar" value="' + (vf.einingar != null ? esc(vf.einingar) : '') + '" placeholder="t.d. úðastútar"></label>' +
      '</div></div>';
    if (rod && rod.athugasemd) h += '<div class="ud-ath"><b>Kerfið:</b> ' + esc(rod.athugasemd) + '</div>';
    h += '<div class="ud-ar"><button type="button" data-ud="ar" data-d="-1" aria-label="Fyrra ár">‹</button><b>' + Y + '</b><button type="button" data-ud="ar" data-d="1" aria-label="Næsta ár">›</button>' +
      '<span class="ud-samt">' + n + ' af ' + tbs.length + ' skoðunum skráðar ' + Y + '</span></div>';
    h += '<div class="ud-grid">' + tbs.map((tb) => {
      const sk = vf.skodanir[tb.k] || {};
      const s = tbStada(tb, sk);
      const ST = { skodad: 'Skoðað', nuna: 'Á dagskrá', lidid: 'Liðið — óskoðað', framundan: 'Framundan' }[s];
      return '<div class="ud-tb" data-k="' + esc(tb.k) + '"><div class="hd"><b>' + esc(tb.heiti) + '</b><small>' + esc(tb.man) + '</small><span class="st ' + s + '">' + ST + '</span></div><div class="bd">' +
        '<div class="rod2"><label>Skoðunardagur<input type="date" data-f="dags" value="' + esc(sk.dags || '') + '" min="' + tb.fra + '" max="' + Y + '-12-31"></label>' +
        '<label>Skoðunarmaður<input type="text" data-f="madur" value="' + esc(sk.madur || '') + '" placeholder="nafn" autocomplete="off"></label></div>' +
        '<div class="ud-atr">' + ATRIDI.map((a) => { const v = (sk.atridi || {})[a[0]] || ''; return '<div class="a" data-a="' + a[0] + '"><span>' + esc(a[1]) + '</span><span class="tri">' +
          '<button type="button" data-v="ok" aria-pressed="' + (v === 'ok') + '" title="Í lagi">OK</button><button type="button" data-v="ath" aria-pressed="' + (v === 'ath') + '" title="Athugasemd / úrbót">ATH</button></span></div>'; }).join('') + '</div>' +
        '<label>Nóta<textarea data-f="nota" placeholder="athugasemdir, úrbætur, varahlutir …">' + esc(sk.nota || '') + '</textarea></label>' +
        '<div class="ft"><button type="button" class="vista" data-ud="vista">Vista</button><small>' + (sk.vistad ? 'vistað ' + esc(dmy(sk.vistad)) + (sk.af ? ' · ' + esc(sk.af) : '') : 'óvistað') + '</small></div>' +
        '</div></div>';
    }).join('') + '</div>';
    h += '<div class="ud-fot">Gátlistinn er drög að ársfjórðungsliðum skv. ÍST EN 12845 (20.3.2) og HMS-leiðbeiningu 9.4.6 — Agnar lagar liði og orðalag. ' +
      'Gögnin vistast á kerfið sjálft í Kerfi og þjónusta (stadur_kerfi), ekkert fer á reikning héðan.</div>';
    return h;
  }

  function safna(tbEl) {
    const g = { dags: (tbEl.querySelector('[data-f="dags"]') || {}).value || '', madur: (tbEl.querySelector('[data-f="madur"]') || {}).value || '', nota: (tbEl.querySelector('[data-f="nota"]') || {}).value || '', atridi: {} };
    tbEl.querySelectorAll('.a[data-a]').forEach((a) => { const p = a.querySelector('.tri button[aria-pressed="true"]'); g.atridi[a.dataset.a] = p ? p.dataset.v : ''; });
    return g;
  }

  function tengja(sec) {
    sec.addEventListener('click', async (e) => {
      const fid = +sec.dataset.fid; if (!fid) return;
      const tri = e.target.closest('.tri button');
      if (tri) { const on = tri.getAttribute('aria-pressed') === 'true'; tri.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); if (!on) tri.setAttribute('aria-pressed', 'true'); return; }
      const ar = e.target.closest('[data-ud="ar"]');
      if (ar) { _ar.set(fid, (_ar.get(fid) || new Date().getFullYear()) + (+ar.dataset.d)); teikna(sec, fid); return; }
      const v = e.target.closest('[data-ud="vista"]');
      if (v) {
        const tb = v.closest('.ud-tb'); if (!tb) return;
        const g = safna(tb);
        if (!g.dags && (g.madur || g.nota || Object.values(g.atridi).some(Boolean))) { if (!window.confirm('Enginn skoðunardagur — vista samt sem undirbúning (telst ekki skoðað)?')) return; }
        v.disabled = true; const t0 = v.textContent; v.textContent = 'Vistar…';
        try { await vista(fid, { skodun: { k: tb.dataset.k, g } }); toast('✓ Skoðun vistuð · ' + tb.dataset.k); teikna(sec, fid); }
        catch (err) { v.disabled = false; v.textContent = t0; alert('Vistun mistókst: ' + ((err && err.message) || err)); }
      }
    });
    sec.addEventListener('change', async (e) => {
      const fid = +sec.dataset.fid; if (!fid) return;
      const el = e.target.closest('[data-ud="tidni"],[data-ud="einingar"]'); if (!el) return;
      const br = el.dataset.ud === 'tidni' ? { tidni: +el.value } : { einingar: el.value };
      try { await vista(fid, br); toast(el.dataset.ud === 'tidni' ? '✓ Tíðni vistuð' : '✓ Einingar vistaðar'); teikna(sec, fid); }
      catch (err) { alert('Vistun mistókst: ' + ((err && err.message) || err)); }
    });
  }

  function teikna(sec, fid) {
    const g = _m.get(fid);
    if (!g) { sec.innerHTML = '<div class="ud-ath">Sæki vatnsúðakerfi…</div>'; return; }
    const virkt = document.activeElement && sec.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (virkt) return;   // aldrei teikna yfir reit sem verið er að skrifa í
    const h = html(fid, g);
    if (sec._h !== h) { sec._h = h; sec.innerHTML = h; }
  }

  /* ── FESTING Á PRÓFÍLINN (sama mynstur og 534) ──────────────────────────────────────────────────────────── */
  let _lesid = new Map();
  async function festa() {
    const main = document.getElementById('companies-main');
    if (!main || !main.querySelector(':scope > .co-banner')) return;
    const fid = opidFid(); if (!fid) return;
    let g = _m.get(fid);
    if (!g || Date.now() - g.t > 60000) {
      if (_lesid.get(fid)) return;
      _lesid.set(fid, true);
      try { g = await lesa(fid, true); } catch (e) { console.warn('[539]', e); _m.set(fid, { rod: null, vf: vfAf(null), t: Date.now(), villa: String((e && e.message) || e) }); g = _m.get(fid); }
      finally { _lesid.delete(fid); }
      try { document.dispatchEvent(new CustomEvent('ud539:uppfaert', { detail: { fid, lesid: true } })); } catch (_) {}
    }
    let sec = document.getElementById(ID);
    if (!okkar(g)) { if (sec) sec.remove(); return; }
    css();
    if (!sec || sec.parentNode !== main) {
      if (sec) sec.remove();
      sec = document.createElement('div'); sec.id = ID; sec.setAttribute('data-p2t', 'ud');
      tengja(sec);
      main.appendChild(sec);
    }
    if (sec.dataset.fid !== String(fid)) { sec.dataset.fid = String(fid); sec._h = ''; }
    teikna(sec, fid);
  }

  let _tilraunir = 0;
  function vakta() {
    const main = document.getElementById('companies-main');
    if (!main) { if (++_tilraunir < 60) setTimeout(vakta, 500); return; }
    const MO = window.__NativeMutationObserver || MutationObserver;
    new MO((ms) => {
      for (const m of ms) {
        const breytt = [...m.addedNodes, ...m.removedNodes].some((n) => n.nodeType === 1 && n.id !== ID);
        if (breytt) { festa().catch(() => {}); return; }
      }
    }).observe(main, { childList: true });
    festa().catch(() => {});
  }
  document.addEventListener('ud539:uppfaert', (e) => { if (e && e.detail && e.detail.lesid) return; const fid = e && e.detail && +e.detail.fid; if (fid) { const g = _m.get(fid); if (g) g.t = 0; } festa().catch(() => {}); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta); else vakta();

  window.UdaVinnuform = { stada, festa, lesa: (fid) => lesa(+fid, true), timabil, ATRIDI, version: '539' };
  console.log('[patch-539] vatnsúðakerfi: þjónustuflipi + vinnuform');
})();
/* === END 539 === */
