/* === STILLINGASAGA (300, 2026-08-05) =======================================
 *
 * „Vernd" á stillingunum var til — en aðeins í gagnagrunninum. Til að sjá hvað
 * hafði verið yfirskrifað þurfti SQL. Hér er hún gerð aðgengileg í appinu:
 *
 *   Stillingar → 🕘 Stillingasaga
 *     • síðustu breytingar: hvenær, hvaða lyklar, hvað stóð þar áður
 *     • „Taka til baka" á hverjum lykli — setur hann aftur eins og hann var
 *     • endurheimtin er sjálf skráð, svo hana má líka taka til baka
 *
 * Bakgrunnur: hver stillingavistun skrifaði áður ALLAN 1,4 MB blobbinn. Tvær
 * tölvur sem vistuðu á sömu sekúndum → sú síðari át vinnu hinnar, þögult.
 * Serverinn sameinar núna sjálfur (`app_settings_merge`), svo það gerist ekki
 * lengur — og þessi gluggi sýnir söguna ef eitthvað fer samt úrskeiðis.
 *
 * SQL: sql/2026-08-05_app_settings_atomisk_vistun.sql
 * ========================================================================== */
(() => {
  if (window.__stillingasagaInstalled) return;
  window.__stillingasagaInstalled = true;

  const SB = () => (window.DB && DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, sz) => (window.UIIcons ? UIIcons.svg(n, { size: sz || 14 }) : '');
  const toast = m => { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} };

  const LYKLA_NOFN = {
    geocode_cache: 'Kortahnit', rekstrarfelog: 'Rekstrarfélög', branding: 'Útlit og merki',
    company_pricing: 'Tilboðsverð', company_attachments: 'Viðhengi fyrirtækja',
    arsskodun_customers: 'Ársskoðun — fyrirtæki', brunakerfi_customers: 'Brunakerfi — fyrirtæki',
    page_editor_v1_json: 'Stílstjóri', sidebar_order: 'Röð hliðarstiku', sidebar_hidden: 'Faldar síður',
    afslattarflokkar_vorur: 'Flokkun vara í afsláttarhópa', skjalasnidmat: 'Skjalasniðmát',
    uttekt_files: 'Úttektarskjöl', inspection_trips: 'Skoðunarferðir', thjonustuverk: 'Þjónustuverk',
    starfsmenn: 'Starfsmenn', almennt: 'Almennar stillingar', sala: 'Sala'
  };
  const lykilNafn = k => LYKLA_NOFN[k] || k;

  function lysing(v) {
    if (v === null || v === undefined) return 'var ekki til';
    if (Array.isArray(v)) return v.length + ' færslur';
    if (typeof v === 'object') { const n = Object.keys(v).length; return n + ' lyklar'; }
    const s = String(v);
    return s.length > 40 ? '„' + s.slice(0, 39) + '…"' : '„' + s + '"';
  }
  function dags(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short' }) + ' ' +
             d.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });
    } catch (_) { return String(ts || ''); }
  }

  let _raðir = [];

  async function sækja() {
    const sb = SB();
    if (!sb) return [];
    const r = await sb.from('audit_vernd')
      .select('id,changed_at,old_row')
      .eq('table_name', 'app_settings')
      .order('id', { ascending: false })
      .limit(40);
    if (r.error) { console.warn('[stillingasaga]', r.error.message); return []; }
    return (r.data || []).map(x => {
      const st = (x.old_row && x.old_row.settings) || {};
      const form = x.old_row && x.old_row.audit_form;
      return {
        id: x.id, tími: x.changed_at,
        heilt: !form,                       // gamalt heilt afrit (fyrir 5. ágú 2026)
        lyklar: Object.keys(st).map(k => ({ k, gamalt: st[k] }))
      };
    });
  }

  function röðHTML(r) {
    if (r.heilt) {
      return '<div style="padding:9px 12px;border-top:1px solid var(--brd);display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:11.5px;color:var(--ink3);min-width:96px">' + esc(dags(r.tími)) + '</span>' +
        '<span style="font-size:11.5px;color:var(--ink3);font-style:italic">heilt afrit af öllum stillingum (eldra snið)</span>' +
        '<button class="_ss-allt" data-id="' + r.id + '" type="button" style="margin-left:auto;padding:4px 10px;border:1px solid var(--brd);background:var(--surface2);color:var(--ink2);border-radius:7px;font-size:11px;cursor:pointer">Skoða</button>' +
      '</div>';
    }
    if (!r.lyklar.length) return '';
    return '<div style="padding:9px 12px;border-top:1px solid var(--brd)">' +
      '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:5px">' +
        '<span style="font-size:11.5px;color:var(--ink3);min-width:96px">' + esc(dags(r.tími)) + '</span>' +
        '<span style="font-size:11px;color:var(--ink4)">' + r.lyklar.length + (r.lyklar.length === 1 ? ' lykill breyttist' : ' lyklar breyttust') + '</span>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;padding-left:106px">' +
        r.lyklar.map(l =>
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<span style="font-size:12px;font-weight:600;color:var(--ink1)">' + esc(lykilNafn(l.k)) + '</span>' +
            '<span style="font-size:11px;color:var(--ink3)">áður: ' + esc(lysing(l.gamalt)) + '</span>' +
            '<button class="_ss-back" data-id="' + r.id + '" data-key="' + esc(l.k) + '" type="button" ' +
              'style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border:1px solid var(--brd);background:var(--surface);color:var(--brand);border-radius:7px;font-size:11px;font-weight:700;cursor:pointer">' +
              ic('refill', 11) + 'Taka til baka</button>' +
          '</div>').join('') +
      '</div>' +
    '</div>';
  }

  // Innihaldið sjálft — notað bæði á Stillingar-síðunni og í Stillingar-glugganum.
  function sagaInnihald() {
    const raðir = _raðir.map(röðHTML).join('');
    return '<div style="border:1px solid var(--brd);border-radius:10px;overflow:hidden;background:var(--surface)">' +
        '<div style="padding:8px 12px;background:var(--surface2);font-size:11px;color:var(--ink3)">' +
          'Hver vistun skráir hvaða lyklar breyttust og hvað stóð þar áður. „Taka til baka" setur einn lykil aftur eins og hann var — og sú aðgerð er sjálf skráð, svo hana má líka taka til baka.' +
        '</div>' +
        (raðir || '<div style="padding:18px;text-align:center;color:var(--ink4);font-size:12.5px;font-style:italic">Engin saga skráð enn.</div>') +
      '</div>';
  }

  function teikna(sec) {
    const opið = sec.dataset.open === '1';
    const haus =
      '<button class="_ss-toggle" type="button" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;cursor:pointer">' +
        '<span style="font-size:13px;transition:transform .15s;transform:rotate(' + (opið ? '90' : '0') + 'deg);color:var(--ink3)">▸</span>' +
        '<span style="display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--ink1)">' + ic('layers', 15) + 'Stillingasaga</span>' +
        '<span style="margin-left:auto;font-size:10.5px;color:var(--ink3)">hvað breyttist — og hvernig má taka það til baka</span>' +
      '</button>';
    if (!opið) { sec.innerHTML = haus; return; }
    sec.innerHTML = haus + '<div style="margin-top:9px">' + sagaInnihald() + '</div>';
  }

  async function setja() {
    const main = document.getElementById('settings-main');
    if (!main || main.querySelector('._ss-section')) return;

    const sec = document.createElement('div');
    sec.className = '_ss-section';
    sec.dataset.open = '0';
    sec.style.cssText = 'margin:14px 0;padding:11px 14px;border:1px solid var(--brd);border-radius:12px;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.04)';
    teikna(sec);
    main.appendChild(sec);

    sec.addEventListener('click', async e => {
      if (e.target.closest('._ss-toggle')) {
        sec.dataset.open = sec.dataset.open === '1' ? '0' : '1';
        if (sec.dataset.open === '1' && !_raðir.length) {
          sec.innerHTML += '<div style="padding:12px;font-size:12px;color:var(--ink3)">Sæki söguna…</div>';
          _raðir = await sækja();
        }
        teikna(sec);
      }
    });
  }

  // Endurteikna hvar sem sagan er sýnileg (síðan og/eða Stillingar-glugginn).
  function endurteiknaAllt() {
    const sec = document.querySelector('#settings-main ._ss-section');
    if (sec && sec.dataset.open === '1') teikna(sec);
    const mb = document.querySelector('._ss-modal-body');
    if (mb) mb.innerHTML = sagaInnihald();
  }

  // Einn sameiginlegur atburðavörður fyrir báða staðina.
  function tengjaAtburdi() {
    document.addEventListener('click', async e => {
      const skoða = e.target.closest('._ss-allt');
      if (skoða) {
        const sb = SB();
        const r = await sb.rpc('audit_settings_endurgera', { p_id: +skoða.dataset.id });
        if (r.error) { alert('Náði ekki í útgáfuna: ' + r.error.message); return; }
        const lyklar = Object.keys(r.data || {});
        alert('Stillingarnar á þessum tíma innihéldu ' + lyklar.length + ' lykla:\n\n' +
              lyklar.map(lykilNafn).join(', '));
        return;
      }

      const back = e.target.closest('._ss-back');
      if (back) {
        const id = +back.dataset.id, key = back.dataset.key;
        if (!confirm('Setja „' + lykilNafn(key) + '" aftur eins og hann var ' + dags(
              (_raðir.find(x => x.id === id) || {}).tími) + '?\n\nÞessi aðgerð er sjálf skráð og má taka til baka.')) return;
        back.disabled = true; back.textContent = 'Bíð…';
        try {
          const sb = SB();
          const r = await sb.rpc('app_settings_endurheimta', { p_id: id, p_key: key });
          if (r.error) throw r.error;
          toast('Tekið til baka: ' + lykilNafn(key));
          if (window.AppSettings && AppSettings.load) await AppSettings.load();
          _raðir = await sækja();
          endurteiknaAllt();
        } catch (err) {
          alert('Villa: ' + (err.message || err));
          back.disabled = false;
        }
      }
    });
  }

  // ── Eigin kafli í stillingasíðunni (patch 86 v2) ──────────────────────────
  function tengjaModal() {
    const skra = () => {
      if (!window.SettingsUI || typeof SettingsUI.registerSection !== 'function') return false;
      return SettingsUI.registerSection({
        id: 'saga',
        nafn: 'Saga stillinga',
        lysing: 'Hvað breyttist, hvenær — og hvernig má taka einstaka breytingu til baka.',
        render: async (body) => {
          body.innerHTML = '<div style="padding:8px 0;color:var(--ink3,#94a3b8);font-size:12.5px">Sæki söguna…</div>';
          _raðir = await sækja();
          body.innerHTML = '<div class="_ss-modal-body">' + sagaInnihald() + '</div>';
        }
      });
    };
    if (skra()) return;
    const t = setInterval(() => { if (skra()) clearInterval(t); }, 800);
  }

  function tengja() {
    const main = document.getElementById('settings-main');
    if (!main) { setTimeout(tengja, 900); return; }
    const view = document.getElementById('view-settings');
    let t = 0;
    new MutationObserver(() => {
      if (view && !view.classList.contains('active')) return;
      clearTimeout(t);
      t = setTimeout(setja, 320);
    }).observe(main, { childList: true, subtree: true });

    // Stillingasíðan endurteiknar `#settings-main` með innerHTML þegar hún er
    // opnuð — það þurrkar kortið út. MutationObserver-inn einn dugði ekki:
    // patch 252 keyrir alla observera gegnum requestAnimationFrame, sem Chrome
    // frystir í földum flipa, svo endurteikningin gat runnið í gegn án þess að
    // við tækjum eftir. Létt vakt (aðeins DOM-uppfletting þegar síðan er opin)
    // setur kortið aftur upp — kostar ekkert mælanlegt.
    setInterval(() => {
      const v = document.getElementById('view-settings');
      if (!v || !v.classList.contains('active')) return;
      const m = document.getElementById('settings-main');
      if (m && !m.querySelector('._ss-section')) setja();
    }, 1200);

    setTimeout(setja, 1500);
  }
  tengja();
  tengjaAtburdi();
  tengjaModal();

  window.Stillingasaga = { opna: setja, saekja: sækja };
  console.log('[patch-300] Stillingasaga — sjá og taka til baka yfirskrifaðar stillingar');
})();
/* === END STILLINGASAGA === */
