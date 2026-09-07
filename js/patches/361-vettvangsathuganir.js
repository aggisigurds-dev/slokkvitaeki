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
  function hverErVid() {
    try {
      return (window.AppSettings && AppSettings.get && (AppSettings.get('starfsmadur') || AppSettings.get('hver_er_vid')))
        || localStorage.getItem('slokk_starfsmadur') || '';
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

  async function saekja(coId) {
    const S = sb(); if (!S) return null;
    const r = await S.from('vettvangsathuganir')
      .select('neydarlysing,abendingar,nota')
      .eq('fyrirtaeki_id', coId).eq('ar', arNu()).maybeSingle();
    return (r && r.data) || { neydarlysing: 'ekki_skodad', abendingar: [], nota: '' };
  }

  async function vista(coId, gogn) {
    const S = sb(); if (!S) return;
    const rod = Object.assign({
      fyrirtaeki_id: coId, ar: arNu(), skrad_af: hverErVid(), updated_at: new Date().toISOString(),
    }, gogn);
    const r = await S.from('vettvangsathuganir').upsert(rod, { onConflict: 'fyrirtaeki_id,ar' });
    const merki = document.getElementById('_va-stada');
    if (merki) {
      merki.textContent = r && r.error ? '⚠ vistun mistókst' : '✓ vistað';
      merki.style.color = r && r.error ? '#b91c1c' : '#15803d';
      if (r && r.error) console.warn('[361] vistun mistókst', r.error);
    }
  }

  function vistaSidar(coId, gogn) {
    clearTimeout(_vistTimer);
    const merki = document.getElementById('_va-stada');
    if (merki) { merki.textContent = 'vistar…'; merki.style.color = 'var(--ink3)'; }
    _vistTimer = setTimeout(() => vista(coId, gogn), 600);
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
    if (ta) ta.addEventListener('input', () => {
      gogn.nota = ta.value;
      vistaSidar(coId, { neydarlysing: gogn.neydarlysing || 'ekki_skodad', abendingar: gogn.abendingar || [], nota: gogn.nota });
    });
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
  window.Vettvangsathuganir = { haldaVid, saekja };
  console.log('[patch-361] Vettvangsathuganir virkar');
})();
