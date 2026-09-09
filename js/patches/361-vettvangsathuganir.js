/* === VETTVANGSATHUGANIR — það sem sést í úttektinni verður að verki ===
 *
 * Agnar 07.09.2026: samstæðan er orðin fjölfagleg (brunaþéttingar + pípari +
 * rafvirki) og vill margfaldast. Mælt sama dag: tæknimaður fer inn í 285
 * byggingar á ári, þar af 304+ húsfélög, með lögbundinn aðgang að hverri hæð.
 * Enginn pípari eða rafvirki á Íslandi hefur þannig aðgang. Ódýrasta sölurásin
 * sem til er er því tæknimaðurinn sem er ÞEGAR á staðnum með spjaldtölvuna.
 *
 * Þessi reitur bætir engu við ferðina nema einu vali og einum smelli:
 *
 *   NEYÐARLÝSING — þriðja lögbundna árlega skoðunin í blokkum (hinar tvær eru
 *   slökkvitæki og brunaviðvörun, sem Slökkvitæki gerir nú þegar). Rafvirkjavinna,
 *   árleg prófunarskylda með dagbók (EN 50172), rafhlöður endast 4-5 ár.
 *   `arnold` fjallar EKKI um hana — sviðið er utan við það sem félagið kann og
 *   selur í dag, og það er einmitt tækifærið. Eftir eina skoðanatörn
 *   (feb-mars, þegar 111 af 285 úttektum ársins fara fram) á félagið
 *   markhópalista yfir allar byggingarnar: hverjar vantar búnað, hverjar eiga
 *   hann óprófaðan.
 *
 *   ÁBENDINGAR — rafmagn / lagnir / brunaþéttingar / eldhúskerfi. Hver haki er
 *   tilboðsbeiðni til dótturfélags.
 *
 * VISTUN: Supabase-taflan `vettvangsathuganir` (fyrirtaeki_id + ár, einkvæmt),
 * EKKI localStorage. Harðkóðaða reglan frá 05.09.2026 gildir: upplýsing sem
 * lýsir stöðu gagna verður að lesast af þjóni svo allar fjórar vélarnar sjái
 * hana — og hér er það beinlínis tilgangurinn, listinn á að nýtast í sölu.
 *
 * Reiturinn hengir sig aftan á #_ctc-notes (patch 129, „Upplýsingar um úttekt")
 * þegar sá kassi er teiknaður. 129 endurteiknar sig, svo hér er fylgst með og
 * hengt aftur á í stað þess að breyta 129 sjálfum.
 */
(() => {
  if (window.__vettvangsathuganirInstalled) return;
  window.__vettvangsathuganirInstalled = true;

  const HOLF = '_va-box';
  const LYSING = [
    ['ekki_skodad',       'Ekki skoðað',        '#e2e8f0', '#475569'],
    ['engin',             'Engin til',          '#fee2e2', '#b91c1c'],
    ['til_i_lagi',        'Til, í lagi',        '#dcfce7', '#15803d'],
    ['til_tharf_vidhald', 'Til, þarf viðhald',  '#fef3c7', '#92400e'],
  ];
  const ABENDINGAR = [
    ['rafmagn',         '⚡ Rafmagn'],
    ['lagnir',          '🔧 Lagnir'],
    ['brunathettingar', '🧱 Brunaþéttingar'],
    ['eldhuskerfi',     '🍳 Eldhúskerfi'],
  ];

  function sb() { return (window.DB && DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function arNu() { return new Date().getFullYear(); }
  // 2026-09-08: las áður `slokk_starfsmadur` — LYKIL SEM ENGINN SETUR. Mælt á
  // lifandi vafra: hvorki sá lykill né AppSettings-lyklarnir tveir voru til, svo
  // `skrad_af` var ALLTAF tómt og engin athugun bar höfund. Appið geymir þetta í
  // `vb_starfsmadur` (patch 231/347) með `starfsmadur` sem eldri varaleið
  // (villuvakt.js). Sama röð og 347 notar, svo einn sannleikur gildi um allt.
  function hverErVid() {
    try {
      let n = localStorage.getItem('vb_starfsmadur');
      if (n && n.trim()) return n.trim();
      if (window.BordStarfsmadur && typeof BordStarfsmadur.get === 'function') {
        n = BordStarfsmadur.get();
        if (n && String(n).trim()) return String(n).trim();
      }
      const p = window.UserAuth && UserAuth.getProfile && UserAuth.getProfile();
      if (p && p.nafn) return p.nafn;
      return localStorage.getItem('starfsmadur') || '';
    } catch (_) { return ''; }
  }

  // Hvaða fyrirtæki er opið? Sama leið og patch 129 notar til að rata á coId.
  function coIdNu() {
    const m = String(location.hash || '').match(/#(?:company|companies)\/(\d+)/);
    if (m) return +m[1];
    const el = document.querySelector('[data-company-id]');
    const v = el && +el.getAttribute('data-company-id');
    return v || null;
  }

  const _stada = new Map();          // coId -> { raw, sott }
  let _vistTimer = null;
  // 2026-09-09 (Agnar: „enginn texti má nokkurntíma tínast"): það sem bíður
  // vistunar geymist hér svo blur / flipa-skipti / lokun geti sópað því inn
  // STRAX í stað þess að treysta á 600 ms tímamælinn einan.
  let _bidur = null;                 // { coId, gogn } sem á eftir að skrifa

  async function saekja(coId) {
    const S = sb(); if (!S) return null;
    const r = await S.from('vettvangsathuganir')
      .select('neydarlysing,abendingar,nota')
      .eq('fyrirtaeki_id', coId).eq('ar', arNu()).maybeSingle();
    return (r && r.data) || { neydarlysing: 'ekki_skodad', abendingar: [], nota: '' };
  }

  // 2026-09-09 (Agnar: „það þarf að fara yfir allar síðurnar … enginn texti má
  // nokkurntíma tínast"): áður gat netvilla hent úr `upsert` beint út í
  // setTimeout-ið → óhöndluð höfnun, ENGIN sýnileg villa og nótan horfin.
  // Nú er skrifið alltaf í try/catch, villan sést (rauð útlína + merki +
  // logProblem) og það sem beið helst í `_bidur` svo næsti blur reyni aftur.
  async function vista(coId, gogn) {
    const merki = document.getElementById('_va-stada');
    const ta = document.getElementById('_va-nota');
    const villa = txt => {
      if (merki) { merki.textContent = txt; merki.style.color = '#b91c1c'; }
      if (ta) { ta.style.outline = '2px solid #dc2626'; ta.title = 'Vettvangsathugun vistaðist EKKI — reyndu aftur'; }
    };
    const S = sb();
    if (!S) { villa('⚠ engin gagnabankatenging'); return false; }
    const rod = Object.assign({
      fyrirtaeki_id: coId, ar: arNu(), skrad_af: hverErVid(), updated_at: new Date().toISOString(),
    }, gogn);
    try {
      const r = await S.from('vettvangsathuganir').upsert(rod, { onConflict: 'fyrirtaeki_id,ar' });
      if (r && r.error) throw r.error;
    } catch (e) {
      console.warn('[361] vistun mistókst', e);
      try { if (window.logProblem) window.logProblem('vettvangsathugun_save_failed', 'co ' + coId + ' · ' + ((e && e.message) || e)); } catch (_) {}
      villa('⚠ vistun mistókst');
      return false;
    }
    _bidur = null;
    if (merki) { merki.textContent = '✓ vistað'; merki.style.color = '#15803d'; }
    if (ta) { ta.style.outline = ''; ta.title = ''; ta.dataset.vistad = (gogn.nota == null ? '' : gogn.nota); }
    return true;
  }

  function vistaSidar(coId, gogn) {
    clearTimeout(_vistTimer);
    _bidur = { coId, gogn };
    const merki = document.getElementById('_va-stada');
    if (merki) { merki.textContent = 'vistar…'; merki.style.color = 'var(--ink3)'; }
    _vistTimer = setTimeout(() => { vista(coId, gogn); }, 600);
  }

  // Sópar því sem bíður inn STRAX — kallað úr blur og við flipa-skipti.
  function vistaStrax() {
    if (!_bidur) return;
    clearTimeout(_vistTimer);
    const b = _bidur;
    try { vista(b.coId, b.gogn); } catch (_) {}
  }

  // 2026-09-09 — MÆLT Á LIFANDI VAFRA ÞENNAN DAG: venjulegt supabase-js fetch
  // DEYR með síðunni (það notar EKKI keepalive, þrátt fyrir athugasemd um
  // annað í patch 147). Prófun: slá inn og endurhlaða innan 600 ms → textinn
  // tapaðist. Þess vegna fer sópunin við lokun beint á PostgREST með
  // `keepalive:true` — sama bragð og `js/villuvakt.js` notar — svo skrifin
  // lifi af að glugganum sé lokað í sömu andrá. Agnar: „enginn texti má
  // nokkurntíma tínast".
  function sopaVidLokun() {
    try {
      const ta = document.getElementById('_va-nota');
      if (ta && ta.dataset.vistad !== ta.value && _bidur) {
        _bidur = { coId: _bidur.coId, gogn: Object.assign({}, _bidur.gogn, { nota: ta.value }) };
      }
      if (!_bidur) return;
      clearTimeout(_vistTimer);
      const url = window.SUPABASE_URL && (window.SUPABASE_URL + '/rest/v1/vettvangsathuganir?on_conflict=fyrirtaeki_id,ar');
      const key = window.SUPABASE_KEY;
      if (!url || !key) { vistaStrax(); return; }
      const rod = Object.assign({
        fyrirtaeki_id: _bidur.coId, ar: arNu(), skrad_af: hverErVid(),
        updated_at: new Date().toISOString(),
      }, _bidur.gogn);
      fetch(url, {
        method: 'POST', keepalive: true,
        headers: {
          apikey: key, Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([rod])
      }).catch(() => {});
      _bidur = null;
    } catch (_) {}
  }

  function teikna(box, coId, gogn) {
    const valin = new Set(gogn.abendingar || []);
    box.innerHTML =
      '<div style="border-top:1px dashed #cbd5e1;margin:12px 0 0;padding-top:11px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
          '<div style="font-size:12px;color:var(--ink2);font-weight:700">🔎 Vettvangsathuganir</div>' +
          '<span style="font-size:11px;color:var(--ink3);font-weight:400">— sést ekki á skýrslu né reikningi; býr til verk fyrir hin félögin</span>' +
          '<span id="_va-stada" style="margin-left:auto;font-size:11px;color:var(--ink3)"></span>' +
        '</div>' +
        '<div style="font-size:11.5px;color:var(--ink2);font-weight:600;margin-bottom:4px">💡 Neyðarlýsing ' +
          '<span style="font-weight:400;color:var(--ink3)">(þriðja lögbundna árlega skoðunin — við gerum hana ekki enn)</span></div>' +
        '<div id="_va-lysing" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px">' +
          LYSING.map(([g, heiti, bg, fg]) => {
            const a = (gogn.neydarlysing || 'ekki_skodad') === g;
            return '<button type="button" data-g="' + g + '" style="font:inherit;font-size:11.5px;font-weight:600;' +
              'padding:5px 11px;border-radius:6px;cursor:pointer;' +
              'background:' + (a ? bg : '#fff') + ';color:' + (a ? fg : '#64748b') + ';' +
              'border:1px solid ' + (a ? fg : '#cbd5e1') + '">' + esc(heiti) + '</button>';
          }).join('') +
        '</div>' +
        '<div style="font-size:11.5px;color:var(--ink2);font-weight:600;margin-bottom:4px">🛠 Ábendingar fyrir önnur svið</div>' +
        '<div id="_va-abend" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">' +
          ABENDINGAR.map(([g, heiti]) => {
            const a = valin.has(g);
            return '<button type="button" data-g="' + g + '" style="font:inherit;font-size:11.5px;font-weight:600;' +
              'padding:5px 11px;border-radius:6px;cursor:pointer;' +
              'background:' + (a ? '#0f172a' : '#fff') + ';color:' + (a ? '#fff' : '#64748b') + ';' +
              'border:1px solid ' + (a ? '#0f172a' : '#cbd5e1') + '">' + esc(heiti) + '</button>';
          }).join('') +
        '</div>' +
        '<textarea id="_va-nota" rows="2" placeholder="Hvað sást? t.d. „Neyðarljós á 2. hæð dautt" · „Gömul tafla í kjallara" · „Óþétt lagnagöt í bílskýli"" ' +
          'style="width:100%;padding:8px 10px;border:1px solid #b4bcc8;border-radius:7px;font:inherit;font-size:13px;' +
          'line-height:1.45;resize:vertical;box-sizing:border-box;background:#fff;color:#0f172a">' + esc(gogn.nota || '') + '</textarea>' +
      '</div>';

    box.querySelectorAll('#_va-lysing button').forEach(b => b.addEventListener('click', () => {
      gogn.neydarlysing = b.dataset.g;
      teikna(box, coId, gogn);
      vistaSidar(coId, { neydarlysing: gogn.neydarlysing, abendingar: gogn.abendingar || [], nota: gogn.nota || '' });
    }));
    box.querySelectorAll('#_va-abend button').forEach(b => b.addEventListener('click', () => {
      const s = new Set(gogn.abendingar || []);
      s.has(b.dataset.g) ? s.delete(b.dataset.g) : s.add(b.dataset.g);
      gogn.abendingar = [...s];
      teikna(box, coId, gogn);
      vistaSidar(coId, { neydarlysing: gogn.neydarlysing || 'ekki_skodad', abendingar: gogn.abendingar, nota: gogn.nota || '' });
    }));
    const ta = box.querySelector('#_va-nota');
    if (ta) {
      // 2026-09-09 (ósk Agnars): EITT vistunarfall sem bæði debounce OG blur
      // nota — sama fyrirmynd og `savePlanNote` í 153-arsskodun.js. Áður var
      // AÐEINS `input` með 600 ms bið: sá sem skrifaði og fór beint af síðunni
      // (eða endurhlóð) innan gluggans tapaði nótunni þegjandi.
      ta.dataset.vistad = (gogn.nota || '');
      const safna = () => ({
        neydarlysing: gogn.neydarlysing || 'ekki_skodad',
        abendingar: gogn.abendingar || [],
        nota: gogn.nota || ''
      });
      ta.addEventListener('input', () => {
        gogn.nota = ta.value;
        ta.style.outline = '';
        vistaSidar(coId, safna());
      });
      ta.addEventListener('blur', () => {
        gogn.nota = ta.value;
        if (ta.dataset.vistad === ta.value) return;   // óbreytt → engin skrif
        _bidur = { coId, gogn: safna() };
        vistaStrax();
      });
    }
  }

  async function haldaVid() {
    const notes = document.getElementById('_ctc-notes');
    if (!notes) return;
    const coId = coIdNu();
    if (!coId) return;
    let box = notes.querySelector('#' + HOLF);
    if (box && +box.dataset.co === coId) return;      // þegar á sínum stað
    if (box) box.remove();
    box = document.createElement('div');
    box.id = HOLF;
    box.dataset.co = String(coId);
    notes.appendChild(box);
    box.innerHTML = '<div style="border-top:1px dashed #cbd5e1;margin:12px 0 0;padding-top:11px;' +
      'font-size:12px;color:var(--ink3)">🔎 Sæki vettvangsathuganir…</div>';
    let gogn;
    try { gogn = await saekja(coId); }
    catch (e) {
      box.innerHTML = '<div style="border-top:1px dashed #cbd5e1;margin:12px 0 0;padding-top:11px;' +
        'font-size:12px;color:#b91c1c">🔎 Náði ekki í vettvangsathuganir: ' + esc((e && e.message) || e) + '</div>';
      return;
    }
    if (!document.body.contains(box)) return;         // notandinn fór annað á meðan
    teikna(box, coId, gogn);
    _stada.set(coId, gogn);
  }

  setInterval(haldaVid, 1200);

  // Öryggisnet (2026-09-09): flipi falinn / síða lokuð / app-skipti í síma →
  // sópa því sem beið inn áður en glugginn hverfur. Þessir atburðir eru þeir
  // einu sem koma áreiðanlega í öllum vöfrum.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sopaVidLokun();
  });
  window.addEventListener('pagehide', sopaVidLokun);
  window.addEventListener('beforeunload', sopaVidLokun);

  window.Vettvangsathuganir = { haldaVid, saekja };
  console.log('[patch-361] Vettvangsathuganir virkar');
})();
