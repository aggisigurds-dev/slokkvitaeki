/* === STILLINGAR: ÞETTA TÆKI · KERFISHEILSA · PRUFUFÍDUSAR (301, 2026-08-05) ==
 *
 * Þrír kaflar sem venjulegir bakendar hafa en vantaði hér (ósk Agnars):
 *
 *  1) ÞETTA TÆKI — stillingar sem eiga heima í ÞESSARI tölvu, ekki hjá öllum.
 *     Þær voru þegar til, faldar í localStorage (þema, km-taxti, verðlista-val,
 *     útlits-val …) — ósýnilegar, óstillanlegar og ekki hægt að núllstilla.
 *     Með fjórar tölvur í rekstri skiptir máli að sjá hvað er stillt HÉR.
 *
 *  2) KERFISHEILSA — svarar gagnagrunnurinn, hvaða útgáfa keyrir, hvenær var
 *     síðast sótt úr Tímaveru/Payday/pósti, og svara þjónusturnar (api/*)?
 *     Áður þurfti að opna dev-tools eða giska.
 *
 *  3) PRUFUFÍDUSAR — beta-rofarnir sem lágu í localStorage án þess að sjást.
 *
 * Kaflarnir skrá sig gegnum SettingsUI.registerSection() (patch 86 v2).
 * ========================================================================== */
(() => {
  if (window.__stillingarKerfiInstalled) return;
  window.__stillingarKerfiInstalled = true;

  const SB = () => (window.DB && DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, sz) => (window.UIIcons ? UIIcons.svg(n, { size: sz || 14 }) : '');
  const toast = m => { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} };

  const stilltur = 'padding:9px 12px;border:1px solid var(--brd);border-radius:9px;background:var(--surface)';

  // ── 1) ÞETTA TÆKI ─────────────────────────────────────────────────────────
  // Þekktir lyklar með mannamáls-nafni. Allt annað í localStorage birtist
  // neðar sem „annað" svo ekkert felist.
  const TAEKJA_LYKLAR = [
    ['cfg_theme',              'Þema', 'Ljóst eða dökkt útlit í þessari tölvu.'],
    ['cfg_km_rate',            'Km-taxti', 'Akstursgjald sem þessi tölva reiknar með.'],
    ['brunakerfi_verdlisti',   'Verðlisti brunakerfa', 'Hvaða verðlisti er valinn hér.'],
    ['pos_vorulisti_beta',     'Sala: listaútlit', 'Listi í stað flísa á vörusvæði Sölu.'],
    ['vp_listi_beta',          'Vörutíningur: listaútlit', 'Leitar-listi í stað tíglaveggjar.'],
    ['_rf_svc_view',           'Rekstrarfélög: sýn', 'Hvaða yfirlit opnast sjálfgefið.'],
    ['_tv_view',               'Þjónustutæki: sýn', 'Sjálfgefin sýn á tækjalistanum.'],
    ['_vb_flokk',              'Verkbók: flokkun', 'Hvernig verkbókin er flokkuð hér.'],
    ['_vr_last_tech',          'Síðasti tæknimaður', 'Hver var síðast valinn í þessari tölvu.'],
    ['vp_recent_v1',           'Nýlega valdar vörur', 'Listinn „Mest notað“ í vörutíningnum.'],
    ['sidebar_collapsed',      'Hliðarstika samanbrotin', 'Hvort stikan er þrengd hér.']
  ];

  function lesa(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function stutt(v) {
    if (v == null) return null;
    const s = String(v);
    if (s === '1' || s === 'true') return 'kveikt';
    if (s === '0' || s === 'false') return 'slökkt';
    return s.length > 46 ? s.slice(0, 45) + '…' : s;
  }

  function taekiHTML() {
    const þekkt = TAEKJA_LYKLAR.map(([k, nafn, lysing]) => ({ k, nafn, lysing, v: lesa(k) }))
      .filter(x => x.v != null);
    let annad = [];
    try {
      const þekktir = TAEKJA_LYKLAR.map(x => x[0]);
      annad = Object.keys(localStorage).filter(k => þekktir.indexOf(k) < 0).sort();
    } catch (_) {}

    return '<p style="margin:0 0 12px;font-size:12.5px;color:var(--ink3);line-height:1.55">' +
        'Þetta eru stillingar sem eiga aðeins við <b>þessa tölvu</b> — þær fylgja ekki með á hin tækin og enginn annar sér þær. ' +
        'Þær voru áður faldar í vafranum; hér sérðu þær og getur núllstillt.' +
      '</p>' +
      (þekkt.length
        ? '<div style="display:flex;flex-direction:column;gap:7px">' + þekkt.map(x =>
            '<div style="' + stilltur + ';display:flex;align-items:center;gap:12px">' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:13px;font-weight:700;color:var(--ink1)">' + esc(x.nafn) + '</div>' +
                '<div style="font-size:11px;color:var(--ink3);margin-top:1px">' + esc(x.lysing) + '</div>' +
              '</div>' +
              '<code style="font-size:11.5px;color:var(--ink2);background:var(--surface2);border:1px solid var(--brd);border-radius:6px;padding:3px 8px;white-space:nowrap">' + esc(stutt(x.v)) + '</code>' +
              '<button class="_sk-hreinsa" data-k="' + esc(x.k) + '" type="button" style="padding:5px 10px;border:1px solid var(--brd);background:var(--surface2);color:var(--ink2);border-radius:7px;font-size:11.5px;cursor:pointer">Núllstilla</button>' +
            '</div>').join('') + '</div>'
        : '<div style="' + stilltur + ';color:var(--ink4);font-style:italic;font-size:12.5px">Engin tækja-stilling skráð í þessari tölvu.</div>') +
      (annad.length
        ? '<details style="margin-top:14px"><summary style="cursor:pointer;font-size:12px;color:var(--ink3)">Annað sem vafrinn geymir (' + annad.length + ')</summary>' +
            '<div style="margin-top:8px;font-size:11px;color:var(--ink3);line-height:1.7;word-break:break-all">' + annad.map(esc).join(' · ') + '</div>' +
          '</details>'
        : '') +
      '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--brd)">' +
        '<button class="_sk-hreinsa-allt" type="button" style="padding:8px 14px;border:1px solid #fecaca;background:var(--surface);color:#dc2626;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer">Núllstilla allar stillingar þessa tækis</button>' +
        '<div style="margin-top:6px;font-size:11px;color:var(--ink3)">Snertir hvorki gögn né stillingar hinna tækjanna — aðeins það sem þessi vafri man.</div>' +
      '</div>';
  }

  // ── 2) KERFISHEILSA ───────────────────────────────────────────────────────
  function pilla(ok, texti) {
    const litur = ok === null ? '#94a3b8' : (ok ? '#166534' : '#dc2626');
    const bak   = ok === null ? 'var(--surface2)' : (ok ? '#dcfce7' : '#fef2f2');
    const rammi = ok === null ? 'var(--brd)' : (ok ? '#86efac' : '#fecaca');
    return '<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:99px;background:' + bak +
      ';border:1px solid ' + rammi + ';color:' + litur + ';font-size:11.5px;font-weight:700">' + esc(texti) + '</span>';
  }
  function lina(nafn, gildi, lysing) {
    return '<div style="' + stilltur + ';display:flex;align-items:center;gap:12px">' +
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--ink1)">' + esc(nafn) + '</div>' +
      (lysing ? '<div style="font-size:11px;color:var(--ink3);margin-top:1px">' + esc(lysing) + '</div>' : '') + '</div>' +
      '<div style="text-align:right">' + gildi + '</div></div>';
  }
  function fyrir(ts) {
    if (!ts) return 'aldrei';
    const d = new Date(ts), min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'rétt í þessu';
    if (min < 60) return min + ' mín síðan';
    if (min < 1440) return Math.round(min / 60) + ' klst síðan';
    return Math.round(min / 1440) + ' dagar síðan';
  }

  async function heilsaHTML(body) {
    body.innerHTML = '<div style="padding:6px 0;color:var(--ink3);font-size:12.5px">Athuga kerfið…</div>';
    const sb = SB();
    const t0 = performance.now();
    let dbOk = false, dbMs = 0, sidast = null;
    try {
      const r = await sb.from('app_settings').select('updated_at').eq('id', 1).maybeSingle();
      dbOk = !r.error; dbMs = Math.round(performance.now() - t0);
      sidast = r.data && r.data.updated_at;
    } catch (_) {}

    async function nyjast(tafla, dalkur) {
      try {
        const r = await sb.from(tafla).select(dalkur).order(dalkur, { ascending: false }).limit(1);
        return (r.data && r.data[0] && r.data[0][dalkur]) || null;
      } catch (_) { return null; }
    }
    const [timavera, bankinn, postur] = await Promise.all([
      nyjast('timavera_entries', 'created_at'),
      nyjast('bank_transactions', 'created_at'),
      nyjast('email_digest', 'created_at')
    ]);

    async function fall(nafn) {
      try {
        const r = await fetch('/api/' + nafn, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        return r.status < 500;                       // 400 = fallið svarar, bara vantar inntak
      } catch (_) { return false; }
    }
    const [ktOk, ocrOk] = await Promise.all([fall('kt-lookup'), fall('ocr-scan')]);

    const bygging = (document.querySelector('[data-build], #build-stamp') || {}).textContent || '';

    body.innerHTML =
      '<p style="margin:0 0 12px;font-size:12.5px;color:var(--ink3);line-height:1.55">' +
        'Fljótleg athugun á því hvort kerfið sé í lagi — svarar gagnagrunnurinn, hvenær bárust gögn síðast og svara þjónusturnar.' +
      '</p>' +
      '<div style="display:flex;flex-direction:column;gap:7px">' +
        lina('Gagnagrunnur', pilla(dbOk, dbOk ? 'svarar · ' + dbMs + ' ms' : 'svarar ekki'), 'Supabase-tengingin sem allt appið byggir á.') +
        lina('Stillingar síðast vistaðar', pilla(null, fyrir(sidast)), sidast ? new Date(sidast).toLocaleString('is-IS') : '') +
        lina('Tímavera', pilla(timavera ? true : null, fyrir(timavera)), 'Nýjasta færsla sem barst úr Tímaveru.') +
        lina('Bankafærslur', pilla(bankinn ? (Date.now() - new Date(bankinn).getTime() < 7 * 864e5) : null, fyrir(bankinn)), 'Nýjasta bankafærsla — eldri en vika þýðir að innsogið liggur niðri.') +
        lina('Póstsafn', pilla(postur ? true : null, fyrir(postur)), 'Nýjasti póstur sem kerfið las inn.') +
        lina('Kennitöluuppfletting', pilla(ktOk, ktOk ? 'svarar' : 'svarar ekki'), '/api/kt-lookup') +
        lina('Skönnun (OCR)', pilla(ocrOk, ocrOk ? 'svarar' : 'svarar ekki'), '/api/ocr-scan') +
        (bygging ? lina('Útgáfa', pilla(null, bygging.trim().slice(0, 40)), 'Hvaða bygging keyrir í þessum vafra.') : '') +
      '</div>' +
      '<button class="_sk-endurath" type="button" style="margin-top:14px;padding:8px 14px;border:1px solid var(--brd);background:var(--surface2);color:var(--ink1);border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px">' +
        ic('refill', 13) + 'Athuga aftur</button>';
  }

  // ── 3) PRUFUFÍDUSAR ───────────────────────────────────────────────────────
  const BETA = [
    ['pos_vorulisti_beta', 'Sala: listi í stað flísa', 'Leitar-listi með fellilistum eftir vöruflokki á vörusvæði Sölu.'],
    ['vp_listi_beta',      'Vörutíningur: listaútlit', 'Leitin fremst og flokkar samanbrotnir í „Velja vöru / þjónustu“.']
  ];
  function betaHTML() {
    return '<p style="margin:0 0 12px;font-size:12.5px;color:var(--ink3);line-height:1.55">' +
        'Nýir fídusar sem eru í prófun. Þeir eru <b>slökktir sjálfgefið</b> og gilda aðeins í þessari tölvu — þú getur slökkt aftur hvenær sem er.' +
      '</p>' +
      '<div style="display:flex;flex-direction:column;gap:7px">' + BETA.map(([k, nafn, lysing]) => {
        const a = lesa(k) === '1';
        return '<div style="' + stilltur + ';display:flex;align-items:center;gap:12px">' +
          '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--ink1)">' + esc(nafn) + '</div>' +
          '<div style="font-size:11px;color:var(--ink3);margin-top:1px">' + esc(lysing) + '</div></div>' +
          '<button class="_sk-beta" data-k="' + esc(k) + '" type="button" style="padding:6px 13px;border:1px solid ' +
            (a ? 'var(--brand)' : 'var(--brd)') + ';background:' + (a ? 'var(--brand)' : 'var(--surface2)') +
            ';color:' + (a ? '#fff' : 'var(--ink2)') + ';border-radius:99px;font-size:11.5px;font-weight:700;cursor:pointer">' +
            (a ? 'Kveikt' : 'Slökkt') + '</button>' +
        '</div>';
      }).join('') + '</div>';
  }

  // ── Atburðir ──────────────────────────────────────────────────────────────
  document.addEventListener('click', async e => {
    const hreinsa = e.target.closest('._sk-hreinsa');
    if (hreinsa) {
      try { localStorage.removeItem(hreinsa.dataset.k); } catch (_) {}
      toast('Núllstillt: ' + hreinsa.dataset.k);
      opnaAftur('taeki');
      return;
    }
    if (e.target.closest('._sk-hreinsa-allt')) {
      if (!confirm('Núllstilla ALLAR stillingar þessarar tölvu?\n\nGögn og stillingar hinna tækjanna eru ósnert. Síðan hleðst upp á nýtt.')) return;
      try { localStorage.clear(); } catch (_) {}
      location.reload();
      return;
    }
    const beta = e.target.closest('._sk-beta');
    if (beta) {
      const k = beta.dataset.k;
      const a = lesa(k) === '1';
      try { localStorage.setItem(k, a ? '0' : '1'); } catch (_) {}
      toast(a ? 'Slökkt á prufufídus' : 'Kveikt á prufufídus — endurhlaða til að sjá breytinguna');
      opnaAftur('beta');
      return;
    }
    if (e.target.closest('._sk-endurath')) {
      const body = document.getElementById('su-body');
      if (body) heilsaHTML(body);
    }
  });

  function opnaAftur(id) {
    const body = document.getElementById('su-body');
    if (!body) return;
    if (id === 'taeki') body.innerHTML = taekiHTML();
    if (id === 'beta') body.innerHTML = betaHTML();
  }

  // ── Skráning ──────────────────────────────────────────────────────────────
  function skra() {
    if (!window.SettingsUI || typeof SettingsUI.registerSection !== 'function') return false;
    SettingsUI.registerSection({
      id: 'taeki', hopur: 'Þetta tæki', nafn: 'Stillingar þessa tækis',
      lysing: 'Það sem gildir aðeins í þessari tölvu — þema, taxtar og valin sýn.',
      ord: 'localStorage þema tæki vafri km taxti',
      render: body => { body.innerHTML = taekiHTML(); }
    });
    SettingsUI.registerSection({
      id: 'beta', hopur: 'Þetta tæki', nafn: 'Prufufídusar',
      lysing: 'Nýir fídusar í prófun — slökktir sjálfgefið, gilda aðeins hér.',
      ord: 'beta prufa nýtt tilraun',
      render: body => { body.innerHTML = betaHTML(); }
    });
    SettingsUI.registerSection({
      id: 'heilsa', hopur: 'Kerfi', nafn: 'Kerfisheilsa',
      lysing: 'Svarar gagnagrunnurinn, hvenær bárust gögn síðast og svara þjónusturnar?',
      ord: 'status heilsa tenging villur api sync',
      render: body => heilsaHTML(body)
    });
    return true;
  }
  if (!skra()) { const t = setInterval(() => { if (skra()) clearInterval(t); }, 800); }

  console.log('[patch-301] Stillingar: Þetta tæki · Prufufídusar · Kerfisheilsa');
})();
/* === END STILLINGAR KERFI === */
