/* === AÐALMÁL — SÉR BORÐ FYRIR ÞAÐ SEM SKIPTIR MESTU (492) — 02.11.2026 ==========================
 *
 * Agnar 02.11.2026, nýkominn úr viku fríi: „taktu saman kannski 10 mikilvægustu atriðin sem er búið að gerast,
 * fundir/deadlines næstu daga, og hvað það er sem mikilvægast á eftir að gera … á einhvern áberandi stað". Fyrst fór
 * það sem mál #1376 efst á Þjónustuborði, en: „Svoo rosalega mikið af atriðum þarna inni … Gera kannski bara sér
 * borð/glugga fyrir þessi aðalmál."
 *
 * HVAÐ ÞETTA ER: ein róleg síða með þrjá hluta — Fundir og frestir · Það sem skiptir mestu · Hvað gerðist (samanbrotið
 * á síma) — og ekkert annað. ENGIN NÝ TAFLA: textinn er Þjónustuborðsmál með merkinu `adalmal` í thjonustubeidni.tags,
 * skrifað af Claude. Sniðið í notes: línur sem byrja á „A · ", „B · ", „C · " eru hlutar; „• " og „1. " línur eru
 * atriði; lína sem byrjar á „Spurningar" er spurningar til Agnars, aðskildar með „ · ".
 *   → Ný vika = Claude skrifar nýtt mál með sama merki (SQL). Síðan les sig sjálf; ekkert deploy.
 * ✓ á atriði = klárað. Geymt í thjonustubord_falid undir lyklinum adalmal:atridi:<mál>-<hluti>-<nr> — sama tafla og Fela á
 * borðinu (368/489), samstillt á allar vélar, aldrei eytt. Kláruð atriði fara neðst, strikuð, „N klárað · sýna".
 * „Á borðið" opnar málið á Þjónustuborðinu (Bord368.opnaMal) þar sem má svara, fela og breyta textanum.
 *
 * 492b (10.11.2026): viðbót aftan við yfirlitið sem byrjar á þankastriki („— Athugasemd 03.11.2026 (Claude): …",
 * „— Endurmælt …", „— Leiðrétt og lokað …") fer í eigin hluta „Leiðrétt eftir endurmælingu", nýjasti kaflinn efst. Áður
 * rann hún inn í Spurningar (mælt á #1376: 10 af 13 „spurningum" voru endurmælingar, borðið taldi 39 atriði í stað 29).
 * Borðið les aðeins OPIN mál; sé ekkert opið segir það hvaða yfirliti var lokað síðast og hvers vegna (lokid_at,
 * lokid_lysing) svo tómt borð lesist ekki sem bilun. Yfirlit sem er 7 daga eða eldra fær aldursmerki.
 *
 * 492c (11.11.2026): fyrirsögnin „SPURNINGAR TIL ÞÍN" án tvípunkts er aðeins haus. Áður varð hún sjálf að fyrstu
 * „spurningunni" með eigin ✓ (mælt á #1587: 6 spurningar í stað 5, 27 atriði í stað 26). Með tvípunkti gildir áfram
 * gamla sniðið: spurningar á sömu línu, aðskildar með „ · ".
 *
 * Mynstur: 491-vasinn.js (view-<key>, App.switchView-umbúðir, Brunastál). Skrifar aðeins við raunverulegan smell.
 * Skráð í Öpp (261 PAGES: 'adalmal') og sett á Boss- og Þjónustuborðs-appið á eftir Þjónustuborðinu (__adm1/__adm2).
 * ============================================================================================ */
(() => {
  if (window.__adalmal492) return;
  window.__adalmal492 = true;

  const VIEW_ID = 'view-adalmal', NAV_KEY = 'adalmal', ROOT_ID = '_adm-root', MERKI = 'adalmal', EINING = 'adalmal';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const p2 = n => String(n).padStart(2, '0');
  const dags = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const kl = iso => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const sb = () => (window.DB && DB.sb) || null;
  const nu = () => { try { return (window.Samthykkja && Samthykkja.nu()) || (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const mjor = () => window.innerWidth <= 760;
  const toast = (m, w) => { try { if (window.Bord368 && Bord368.toast) return Bord368.toast(m, w); } catch (_) {} try { if (window.Toast && Toast.show) return Toast.show(m); } catch (_) {} try { if (window.App && App.toast) return App.toast(m); } catch (_) {} console[w ? 'warn' : 'log']('[492] ' + m); };

  // Hlutarnir: lykill í notes → heiti, röð á síðunni og hvort hann er opinn á síma. B (hvað gerðist) er samanbrotinn
  // á síma af því þar eru flestu atriðin og þau eru söguleg; A og C eru það sem þarf að GERA.
  const HLUTAR = {
    a:  { heiti: 'Fundir og frestir næstu daga', rod: 1, opinn: true,  takn: '🗓' },
    c:  { heiti: 'Það sem skiptir mestu að gera',  rod: 2, opinn: true,  takn: '➤' },
    // Leiðréttingar sem bætt var aftan við yfirlitið eftir að það var skrifað (endurmæling í grunni, lokun).
    ath: { heiti: 'Leiðrétt eftir endurmælingu',   rod: 2.5, opinn: false, takn: '↻' },
    b:  { heiti: 'Hvað gerðist',                   rod: 3, opinn: false, takn: '◦' },
    sp: { heiti: 'Spurningar til þín',             rod: 4, opinn: true,  takn: '?' }
  };

  const S = { loaded: false, loading: false, villa: null, mal: [], sidast: null, falid: {}, bid: {}, opin: {}, synaKlarad: {}, busy: {} };

  /* ── gögn ─────────────────────────────────────────────────────────────── */
  async function load() {
    const c = sb(); if (!c) { S.villa = 'Biðlarinn er ekki tilbúinn'; render(); return; }
    if (S.loading) return; S.loading = true; render();
    try {
      const [m, f, s] = await Promise.all([
        c.from('thjonustubeidni').select('id,title,summary,notes,status,due_at,created_at,updated_at,created_by,tags')
          .is('deleted_at', null).is('archived_at', null).or('status.is.null,status.neq.lokad')
          // tags er jsonb — strengur fer óbreyttur í cs.["adalmal"]; fylki yrði {adalmal} (Postgres-fylki) og grunnurinn
          // svarar „invalid input syntax for type json".
          .contains('tags', JSON.stringify([MERKI])).order('created_at', { ascending: false }).limit(5),
        c.from('thjonustubord_falid').select('lykill,falid').like('lykill', EINING + ':%').limit(1000),
        // Síðasta LOKAÐA yfirlit — aðeins til að skýra tómt borð (hvenær og hvers vegna því var lokað).
        c.from('thjonustubeidni').select('id,title,lokid_at,lokid_af,lokid_lysing').is('deleted_at', null).eq('status', 'lokad')
          .contains('tags', JSON.stringify([MERKI])).order('lokid_at', { ascending: false, nullsFirst: false }).limit(1)
      ]);
      if (m.error) throw m.error;
      if (f.error) throw f.error;
      S.sidast = (!s.error && s.data && s.data[0]) || null;      // skýring, ekki gögn borðsins — villa hér stoppar ekkert
      S.mal = m.data || [];
      const kort = {};
      (f.data || []).forEach(r => { kort[r.lykill] = !!r.falid; });
      S.falid = kort;
      S.loaded = true; S.villa = null;
    } catch (e) { S.villa = (e && e.message) || String(e); }
    S.loading = false; render();
  }
  const erKlarad = l => (l in S.bid ? S.bid[l] : !!S.falid[l]);
  async function klara(l, lysing, gildi) {
    const c = sb(); if (!c) { toast('Biðlarinn er ekki tilbúinn', true); return; }
    S.bid[l] = gildi; render();
    try {
      const row = { lykill: l, eining: EINING, falid: gildi, lysing: String(lysing || '').slice(0, 200), falid_af: nu() };
      const r = await c.from('thjonustubord_falid').upsert(row, { onConflict: 'lykill' }).select('lykill,falid').single();
      if (r.error) throw r.error;
      S.falid[l] = !!(r.data && r.data.falid);
    } catch (e) { toast('Tókst ekki að vista: ' + ((e && e.message) || e), true); }
    delete S.bid[l]; render();
  }

  /* ── textinn í málinu → hlutar og atriði ───────────────────────────────── */
  // „FUNDIR OG FRESTIR NÆSTU DAGA" → „Fundir og frestir næstu daga" (hástafir í notes eru bara áhersla).
  const fegra = s => { s = String(s || '').trim(); return s && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s; };
  function greina(m) {
    const hl = {}, ordh = [];
    let h = null;
    const nyr = (k, heiti) => { if (!hl[k]) { hl[k] = { k, heiti, atridi: [], haus: {} }; ordh.push(k); } h = hl[k]; };
    String(m.notes || '').split(/\r?\n/).forEach(raw => {
      const l = raw.trim(); if (!l) return;
      let mm = l.match(/^([A-F])\s*[·•–-]\s*(.+)$/);
      if (mm) { const k = mm[1].toLowerCase(); nyr(k, (HLUTAR[k] && HLUTAR[k].heiti) || fegra(mm[2])); return; }
      if (/^spurningar/i.test(l)) {
        nyr('sp', HLUTAR.sp.heiti);
        // Fyrirsögn án tvípunkts („SPURNINGAR TIL ÞÍN") er aðeins haus; spurningarnar koma þá sem númeraðar línur á eftir.
        // Fyrir 492c varð fyrirsögnin sjálf að fyrstu „spurningunni" (mælt á #1587 11.11.2026: 6 í stað 5).
        const tv = l.indexOf(':');
        if (tv >= 0) l.slice(tv + 1).split(/\s·\s/).forEach(x => { x = x.trim(); if (x) h.atridi.push(x); });
        return;
      }
      // Viðbót aftan við yfirlitið (endurmæling, leiðrétting, lokun) byrjar á þankastriki: „— Athugasemd 03.11.2026 (Claude): …".
      // Hún fær eigin hluta og punktalínurnar á eftir fylgja henni. Án þessa rann hún inn í síðasta hluta (Spurningar).
      mm = l.match(/^—\s*(\S.*)$/);
      if (mm) { nyr('ath', HLUTAR.ath.heiti); h.haus[h.atridi.length] = true; h.atridi.push(mm[1].trim()); return; }
      mm = l.match(/^(?:•|-|–|\d{1,2}[.)])\s*(.+)$/);
      if (mm) { if (!h) nyr('x', 'Annað'); h.atridi.push(mm[1].trim()); return; }
      if (h && h.atridi.length) h.atridi[h.atridi.length - 1] += ' ' + l;      // framhaldslína
      else if (h) h.atridi.push(l);
      // inngangslínur (dagsetning, heimildir) eru ekki sýndar — hausinn ber dagsetninguna
    });
    return ordh.map(k => hl[k]).sort((x, y) => ((HLUTAR[x.k] || {}).rod || 9) - ((HLUTAR[y.k] || {}).rod || 9));
  }
  // Nýjasta dagsetningin í kaflahausum leiðréttinga („Endurmælt 07.11.2026 …") — updated_at málsins hreyfist ekki við viðbót.
  function sidastLeidrett(hlutar) {
    const a = hlutar.find(h => h.k === 'ath'); if (!a) return '';
    let best = 0, txt = '';
    a.atridi.forEach((t, i) => {
      if (!a.haus[i]) return;
      const d = String(t).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (!d) return;
      const n = +d[3] * 10000 + +d[2] * 100 + +d[1];
      if (n > best) { best = n; txt = p2(+d[1]) + '.' + p2(+d[2]) + '.' + d[3]; }
    });
    return txt;
  }
  // Leiðréttingar: kaflarnir í öfugri röð (nýjasti efst), línur innan kafla halda sinni röð. Lykill ✓ fylgir upphaflegu númeri.
  function nyjastEfst(radir) {
    const kaflar = [];
    radir.forEach(r => { if (r.haus || !kaflar.length) kaflar.push([]); kaflar[kaflar.length - 1].push(r); });
    return kaflar.reverse().reduce((a, k) => a.concat(k), []);
  }
  // Taflan skorðar lykilinn við ^[a-z_]+:[a-z_]+:[^\s]+$ (eining:undireining:afgangur) — talan má því ekki vera í 2. sæti.
  const lykill = (m, h, i) => EINING + ':atridi:' + m.id + '-' + h.k + '-' + i;
  const erOpinn = (m, h) => { const k = m.id + ':' + h.k; if (k in S.opin) return S.opin[k]; const d = HLUTAR[h.k]; return mjor() ? !!(d && d.opinn) : true; };

  /* ── útlit (Brunastál, sama grind og Vasinn) ────────────────────────────── */
  function css() {
    const V = 'html body #' + VIEW_ID;
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);font-family:' + SANS + ';color:#1f2530;padding-bottom:96px}',
      V + '.active{display:block}',
      V + ' .ad-haus{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#2b2e35 0%,#191b20 100%);border-bottom:1px solid #000;color:#fff}',
      V + ' .ad-haus>div{min-width:0;flex:1 1 auto}' + V + ' .ad-haus .tt{font-family:' + DISP + ';font-weight:800;font-size:20px;line-height:1}',
      V + ' .ad-haus .st{font-family:' + MONO + ';font-size:10.5px;color:#aab2c0;margin-top:4px;letter-spacing:.04em;line-height:1.4}',
      V + ' .ad-haus button{flex:none;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;cursor:pointer;font:700 12px ' + SANS + ';padding:0 10px}' + V + ' .ad-haus .uppf{width:40px;padding:0;font-size:17px}',
      V + ' .ad-mal{margin:12px}' + V + ' .ad-mal+.ad-mal{margin-top:26px;padding-top:14px;border-top:1px dashed rgba(20,24,34,.3)}',
      V + ' .ad-titill{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 2px 10px}' + V + ' .ad-titill b{font-family:' + DISP + ';font-size:17px;line-height:1.25}' + V + ' .ad-titill small{font-family:' + MONO + ';font-size:10.5px;color:#525b6b;letter-spacing:.04em}',
      V + ' .ad-grid{display:grid;grid-template-columns:1fr;gap:10px}',
      V + ' .ad-hl{border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.16);box-shadow:0 1px 2px rgba(0,0,0,.08);overflow:hidden}',
      V + ' .ad-hl._a{border-top:4px solid #c4452f}' + V + ' .ad-hl._c{border-top:4px solid #1f6b3c}' + V + ' .ad-hl._b{border-top:4px solid #5b6577}' + V + ' .ad-hl._sp{border-top:4px solid #b8892e}' + V + ' .ad-hl._ath{border-top:4px solid #2f6fb3}',
      V + ' .ad-hl .haus{display:flex;align-items:center;gap:8px;width:100%;padding:11px 12px;border:0;background:none;text-align:left;cursor:pointer;color:#1f2530;font:700 13px ' + SANS + '}',
      V + ' .ad-hl .haus .tk{flex:none;width:24px;height:24px;border-radius:6px;background:#1f2530;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px}',
      V + ' .ad-hl .haus .n{margin-left:auto;font-family:' + MONO + ';font-size:10.5px;color:#525b6b;letter-spacing:.06em;white-space:nowrap}' + V + ' .ad-hl .haus .pil{font-size:11px;color:#525b6b}',
      V + ' .ad-hl ol{list-style:none;margin:0;padding:0 6px 8px}',
      V + ' .ad-at{display:flex;gap:10px;align-items:flex-start;padding:9px 6px;border-top:1px solid rgba(20,24,34,.08);font-size:15px;line-height:1.5;overflow-wrap:anywhere}',
      V + ' .ad-hl._b .ad-at,' + V + ' .ad-hl._ath .ad-at{font-size:13.5px}' + V + ' .ad-at._haus{border-top:2px solid rgba(20,24,34,.26);background:rgba(47,111,179,.07)}' + V + ' .ad-at._kl{opacity:.5}' + V + ' .ad-at._kl .tx{text-decoration:line-through}',
      V + ' .ad-at .nr{flex:none;min-width:22px;padding-top:2px;font-family:' + MONO + ';font-size:12px;color:#525b6b;text-align:right}',
      V + ' .ad-at .tx{flex:1;min-width:0}' + V + ' .ad-at .tx b{font-weight:700}',
      V + ' .ad-at button{flex:none;width:34px;height:34px;border-radius:9px;border:1px solid rgba(20,24,34,.3);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#1f2530;font-size:15px;cursor:pointer}' + V + ' .ad-at button._on{background:linear-gradient(180deg,#2d8a4e,#1f6b3c);border-color:#0b3519;color:#fff}' + V + ' .ad-at button:disabled{opacity:.45}',
      V + ' .ad-klarad{display:flex;align-items:center;gap:8px;padding:8px 12px 10px;font:11px ' + MONO + ';color:#525b6b;letter-spacing:.06em;text-transform:uppercase;border-top:1px solid rgba(20,24,34,.08)}' + V + ' .ad-klarad button{margin-left:auto;background:none;border:0;font:600 11px ' + SANS + ';color:#2f6fb3;text-transform:none;letter-spacing:0;cursor:pointer;padding:4px 6px}',
      V + ' .ad-titill small._gamalt{color:#a3301e;font-weight:700}',
      V + ' .ad-sidast{margin:14px auto;max-width:520px;padding:10px 12px;border-radius:9px;background:#fff;border:1px solid rgba(20,24,34,.16);text-align:left;font-size:13px;line-height:1.5;color:#1f2530}' + V + ' .ad-sidast span{display:block;margin-top:4px;color:#525b6b}',
      V + ' .ad-tomt{margin:30px 20px;text-align:center;font-size:14px;color:#525b6b;line-height:1.6}' + V + ' .ad-villa{margin:12px;padding:12px;border-radius:9px;background:#f9e3e0;color:#7a1f14;font-size:13px}',
      V + ' .ad-hint{margin:0 12px;font:11px ' + MONO + ';color:#5b6577;line-height:1.5}',
      '@media (min-width:900px){' + V + ' #' + ROOT_ID + '{max-width:980px;margin:0 auto}' + V + ' .ad-grid{grid-template-columns:1fr 1fr}' + V + ' .ad-hl._b,' + V + ' .ad-hl._sp,' + V + ' .ad-hl._ath{grid-column:1/-1}}'
    ].join('\n');
  }
  function injectCss() { if (document.getElementById('_adm-css')) return; const st = document.createElement('style'); st.id = '_adm-css'; st.textContent = css(); document.head.appendChild(st); }
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    v.innerHTML = '<div id="' + ROOT_ID + '"></div>';
    v.addEventListener('click', smellur);
    document.body.appendChild(v);
    return v;
  }
  // Fyrsta setningin feitletruð svo augað grípi hvað atriðið ER áður en það les hvers vegna.
  function atridiHtml(t) {
    const m = String(t).match(/^(.{8,90}?[.:—–])\s(.+)$/);
    return m ? '<b>' + esc(m[1]) + '</b> ' + esc(m[2]) : esc(t);
  }
  function hlutiHtml(m, h) {
    const d = HLUTAR[h.k] || { takn: '•' }, opinn = erOpinn(m, h), id = m.id + ':' + h.k;
    let radir = h.atridi.map((t, i) => ({ t, i, l: lykill(m, h, i), haus: !!(h.haus && h.haus[i]) }));
    if (h.k === 'ath') radir = nyjastEfst(radir);
    const opin = radir.filter(r => !erKlarad(r.l)), klarad = radir.filter(r => erKlarad(r.l));
    const rod = r => '<li class="ad-at' + (erKlarad(r.l) ? ' _kl' : '') + (r.haus ? ' _haus' : '') + '"><span class="nr">' + (h.k === 'c' || h.k === 'b' ? (r.i + 1) + '.' : '') + '</span><span class="tx">' + atridiHtml(r.t) + '</span>' +
      '<button type="button" class="' + (erKlarad(r.l) ? '_on' : '') + '" data-adm="klara" data-l="' + esc(r.l) + '"' + (r.l in S.bid ? ' disabled' : '') + ' title="' + (erKlarad(r.l) ? 'Taka klárað-merkið af' : 'Merkja klárað') + '">' + (erKlarad(r.l) ? '✓' : '○') + '</button></li>';
    let x = '<section class="ad-hl _' + esc(h.k) + '"><button type="button" class="haus" data-adm="opna" data-id="' + esc(id) + '" aria-expanded="' + opinn + '"><span class="tk">' + d.takn + '</span>' + esc(h.heiti) +
      '<span class="n">' + opin.length + (klarad.length ? ' · ' + klarad.length + ' ✓' : '') + '</span><span class="pil">' + (opinn ? '▾' : '▸') + '</span></button>';
    if (opinn) {
      x += '<ol>' + (opin.length ? opin.map(rod).join('') : '<li class="ad-at" style="color:#525b6b;font-style:italic">Allt klárað.</li>') + '</ol>';
      if (klarad.length) {
        x += '<div class="ad-klarad">' + klarad.length + ' klárað<button type="button" data-adm="syna" data-id="' + esc(id) + '">' + (S.synaKlarad[id] ? 'fela' : 'sýna') + '</button></div>';
        if (S.synaKlarad[id]) x += '<ol>' + klarad.map(rod).join('') + '</ol>';
      }
    }
    return x + '</section>';
  }
  function malHtml(m) {
    const hlutar = greina(m);
    const leidr = sidastLeidrett(hlutar), aldur = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 864e5);
    let x = '<div class="ad-mal"><div class="ad-titill"><b>' + esc(String(m.title || '').replace(/^📌\s*/, '')) + '</b><small>#' + m.id + ' · ' + esc(dags(m.updated_at || m.created_at)) + ' ' + esc(kl(m.updated_at || m.created_at)) + (m.due_at ? ' · frestur ' + esc(dags(m.due_at)) : '') + (leidr ? ' · leiðrétt ' + esc(leidr) : '') + '</small>' +
      (aldur >= 7 ? '<small class="_gamalt">' + aldur + ' daga gamalt · biddu Claude um nýtt yfirlit</small>' : '') + '</div>';
    x += hlutar.length ? '<div class="ad-grid">' + hlutar.map(h => hlutiHtml(m, h)).join('') + '</div>'
      : '<div class="ad-hl"><div class="ad-at" style="white-space:pre-wrap">' + esc(m.notes || m.summary || '') + '</div></div>';
    return x + '</div>';
  }
  // Tómt borð: segja hvaða yfirliti var lokað síðast og hvers vegna, svo tómt lesist ekki sem bilun.
  function sidastHtml() {
    const s = S.sidast; if (!s) return '';
    return '<div class="ad-sidast"><b>Síðasta yfirlit</b> (#' + esc(s.id) + ') var lokað' + (s.lokid_at ? ' ' + esc(dags(s.lokid_at)) : '') + (s.lokid_af ? ' af ' + esc(s.lokid_af) : '') + '.' +
      (s.lokid_lysing ? '<span>' + esc(String(s.lokid_lysing).slice(0, 300)) + '</span>' : '') + '</div>';
  }
  function html() {
    const n = S.mal.length;
    let fjoldi = 0, leidr = 0;      // leiðréttingar teljast sér (kaflar), ekki sem atriði yfirlitsins
    S.mal.forEach(m => { greina(m).forEach(h => { if (h.k === 'ath') leidr += Object.keys(h.haus).length; else fjoldi += h.atridi.length; }); });
    let st = 'sæki…';
    if (S.loaded) st = n ? n + ' yfirlit · ' + fjoldi + ' atriði' + (leidr ? ' · ' + leidr + (leidr === 1 ? ' leiðrétting' : ' leiðréttingar') : '') : 'engin aðalmál skráð';
    else if (S.villa) st = '⚠️ ' + S.villa;
    let h = '<div class="ad-haus"><div><div class="tt">📌 Aðalmál</div><div class="st">' + esc(st) + '</div></div>' +
      (n ? '<button type="button" data-adm="bord" data-id="' + S.mal[0].id + '" title="Opna málið á Þjónustuborðinu">Á borðið</button>' : '') +
      '<button type="button" class="uppf" data-adm="uppf" title="Sækja aftur">↻</button></div>';
    if (S.villa) h += '<div class="ad-villa">' + esc(S.villa) + '</div>';
    if (S.loaded) {
      h += n ? S.mal.map(malHtml).join('') : '<div class="ad-tomt">Engin aðalmál skráð.' + sidastHtml() + (S.sidast ? '' : '<br>') + 'Biddu Claude: „settu vikuyfirlit á Aðalmál".</div>';
      h += '<div class="ad-hint">○ = merkja klárað (geymt fyrir allar vélar) · textinn er mál á Þjónustuborðinu með merkinu „adalmal" — Claude skrifar nýtt fyrir nýja viku.</div>';
    } else if (!S.villa) h += '<div class="ad-tomt">Sæki aðalmálin…</div>';
    return h;
  }
  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    const root = document.getElementById(ROOT_ID); if (!root) return;
    const nytt = html();
    if (root._h === nytt) return;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(root) : null;
    root.innerHTML = nytt; root._h = nytt;
    if (aftur) aftur();
  }

  /* ── smellir ─────────────────────────────────────────────────────────────── */
  function smellur(e) {
    const el = e.target && e.target.closest && e.target.closest('[data-adm]'); if (!el) return;
    const a = el.getAttribute('data-adm'), id = el.getAttribute('data-id');
    if (a === 'uppf') return load();
    if (a === 'opna') { S.opin[id] = !erOpinnId(id); render(); return; }
    if (a === 'syna') { S.synaKlarad[id] = !S.synaKlarad[id]; render(); return; }
    if (a === 'klara') {
      const l = el.getAttribute('data-l'); if (!l || l in S.bid) return;
      const tx = el.parentNode && el.parentNode.querySelector('.tx');
      return klara(l, tx ? tx.textContent : '', !erKlarad(l));
    }
    if (a === 'bord') {
      const mid = +id;
      try { if (window.App && App.switchView) App.switchView('bord'); } catch (_) {}
      setTimeout(() => { try { if (window.Bord368 && Bord368.opnaMal) Bord368.opnaMal(mid); } catch (_) {} }, 400);
    }
  }
  const erOpinnId = id => { if (id in S.opin) return S.opin[id]; const k = String(id).split(':')[1]; const d = HLUTAR[k]; return mjor() ? !!(d && d.opinn) : true; };

  /* ── sýn / leiðsögn (sama og 491) ───────────────────────────────────────── */
  let _poll = 0;
  function open() {
    injectCss(); ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block'; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    if (!S.loaded && !S.loading) load();
    clearInterval(_poll);
    _poll = setInterval(() => { if (!erVirk() || document.hidden) return; if (!S.loading) load(); }, 120000);
  }
  const erVirk = () => { const vv = document.getElementById(VIEW_ID); return !!(vv && vv.classList.contains('active')); };
  function hide() { try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {} clearInterval(_poll); _poll = 0; }
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._adalmalPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      hide();
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._adalmalPatched = true;
  }
  function boot() {
    patchSwitchView();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.Adalmal = { open, render, load, greina, S, version: '492c' };
  console.log('[492b] Aðalmál — sér borð');
})();
