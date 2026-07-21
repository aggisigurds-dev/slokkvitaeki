/* === BRUNAKERFI SKOÐUNARSKÝRSLA — eyðublað + A4 skýrsla (2026-07-21) ===
 *
 * Byggt eftir Claude-hönnun Agnars („Brunakerfi Úttekt" artifact, skjámyndir
 * 2026-07-21). Opnast INNAN úr Brunakerfi yfirlit (patch 272): „📋 Skýrsla"
 * hnappur á hverri fyrirtækjaröð → full-síðu eyðublað:
 *   • Upplýsingahaus (viðskiptavinur/kt/aðsetur/umbeðið af/tengiliður/úttekt nr./
 *     dags./staður/skoðunarmaður)
 *   • Búnaðaryfirlit — teljarar (í lagi / ekki í lagi / vantar) × 7 búnaðartegundir
 *   • Athugasemdir — búnaður + númer + svæði + athugasemd + lýsing, listi
 *   • Aðalstöð — rása/slaufu, checklisti í lagi/ekki í lagi, fjargæsla
 *   • Hljóðstyrksmælingar (dB + ✓/✗) · Rafhlöðumælingar · Ábendingar
 *   • „Skýrsla" = A4 prentútgáfa (haus+fótur endurtaka sig á síðum við prentun)
 *
 * Gögn: NÝ tafla `brunakerfi_skyrslur` (id uuid, fyrirtaeki_id, year, uttekt_nr,
 * status draft|final, data jsonb, doc_id). „✅ Ljúka & vista" hleður skýrslunni
 * upp sem sjálfstæðu HTML-skjali í `samningar` bucket + skrifar
 * `customer_documents` röð (doc_type='brunakerfi') → græni árpunkturinn í 272
 * kviknar og Skjöl-talan hækkar. Drög má opna aftur og halda áfram.
 *
 * Public: window.BrunakerfiSkyrsla = { openFlow, openForm }
 */
(() => {
  if (window.__bkSkyrslaInstalled) return;
  window.__bkSkyrslaInstalled = true;

  const BUCKET = 'samningar', FOLDER = 'brunakerfi-skyrslur';
  const SITE = 'https://slokkvitaeki.netlify.app';
  const LOGO = SITE + '/img/slokkvitaeki-brunaholf-logo.png';
  const FOOT_CO = 'Slökkvitæki ehf. · Helluhrauni 10, 220 Hafnarfjörður · kt. 600508-0400 · Sími 565 4080';
  const FOOT_1 = 'Afrit af skoðunarskýrslunni verður sent eldvarnaeftirliti slökkviliðs ef kallað er eftir því.';
  const FOOT_2 = 'Skoðað er samkvæmt nýjustu leiðbeiningum um sjálfvirka brunaviðvörun útg. af HMS 6.038.';

  const EQUIP = [
    ['stjornstod', 'Stjórnstöð'], ['bodbunadur', 'Boðbúnaður'], ['reykskynjarar', 'Reykskynjarar'],
    ['hitaskynjarar', 'Hitaskynjarar'], ['handbodar', 'Handboðar'], ['bjollur', 'Bjöllur / Sírenur'],
    ['rafhlodur', 'Rafhlöður']];
  // röð eins og í hönnuninni: algengasti búnaðurinn fyrst
  const ATH_BUNADUR = ['Reykskynjarar', 'Hitaskynjarar', 'Handboðar', 'Bjöllur / Sírenur', 'Stjórnstöð',
    'Boðbúnaður', 'Rafhlöður', 'Hljóðstyrksmælingar', 'Yfirlitsmynd', 'Annað'];
  const ATH_TYPES = ['Vantar', 'Er ekki til staðar', 'Laus frá lofti', 'Of nálægt loftræstingu', 'Virkar ekki',
    'Díóða virkar ekki', 'Skemmdur / óhreinn', 'Rangt staðsettur', 'Hulinn', 'Vantar á yfirlitsmynd',
    'Hljóðstyrksmæling', 'Annað'];
  const STOD = [
    ['spenna24', 'Spenna: 24V'], ['spenna230', 'Spenna: 230V'], ['stada_rasa', 'Staða rása í stöð'],
    ['stada_bjollu', 'Staða bjöllurása/slaufu'], ['brunabod', 'Brunaboð frá öllum rásum'],
    ['lampaprofun', 'Lampaprófun'], ['innri_vaela', 'Innri væla í stöð']];
  const HLJOD = [
    ['mesti_1m', 'Mesti hljóðst. 1M frá hljóðgjöfum'], ['mesti_umhverfi', 'Mesti umhverfishávaði'],
    ['bjalla_umhverfi', 'Hljóðst. bjöllu með umhverfishávaða'], ['minnsti_bjalla', 'Minnsti hljóðst. bjöllu í húsi'],
    ['svefnherbergi', 'Hljóðst. í svefnherbergi']];
  const RAFHL = [
    ['staerd', 'Stærð rafhlaðna', 't.d. 2x12 Volt'], ['astimplud', 'Ástimpluð rýmd rafhlaðna', 't.d. 7 Ah'],
    ['maeld', 'Mæld rýmd rafhlaðna', 't.d. 100 % — 7.0 Ah'], ['argerd', 'Árgerð rafhlaðna', 't.d. 2026'],
    ['spenna_eftir', 'Spenna eftir prófun', 't.d. 27 Volt'], ['i1', 'Straumdráttur í rafmagnsleysi (i₁)', 'mA'],
    ['i2', 'Straumdráttur í útkalli (i₂)', 'mA'], ['lagm_ending', 'Lágmarks ending', 't.d. 12 klst'],
    ['aetlud_ending', 'Áætluð ending', 'reiknast úr rýmd/i₁'], ['lagm_rymd', 'Lágmarks rýmd rafhlaðna', 't.d. 5.19 Ah']];

  let S = null;          // núverandi skýrsla í vinnslu
  let _dirty = false;
  let _reports = null;   // cache: fyrirtaeki_id → [skýrslur] fyrir hnappa-badge
  let _repAt = 0;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : null; }
  function fmtKt(kt) { const d = String(kt || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : (kt || ''); }
  function fmtDags(iso) { if (!iso) return ''; const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : String(iso); }
  function toast(msg, bad) {
    let t = document.getElementById('_bks-toast');
    if (!t) { t = document.createElement('div'); t.id = '_bks-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:12000;padding:11px 20px;border-radius:99px;font-weight:800;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .3s;opacity:1;background:' + (bad ? '#b91c1c' : '#14532d') + ';color:#fff';
    clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = '0'; }, 2600);
  }

  // ── tóm skýrsla ─────────────────────────────────────────────────────────────
  function blank(co, nr) {
    const today = new Date().toISOString().slice(0, 10);
    const bun = {}; EQUIP.forEach(e => bun[e[0]] = { ok: 0, bad: 0, missing: 0 });
    const checks = {}; STOD.forEach(c => checks[c[0]] = null);
    return {
      info: {
        vidskiptavinur: co.nafn || '', kennitala: fmtKt(co.kennitala), adsetur: co.heimilisfang || '',
        umbedid_af: '', tengilidur: co['tengiliður'] || co.tengilidur || '', uttekt_nr: nr || '',
        dags: today, stadur: 'Hafnarfjörður',
        skodunarmadur: (function () { try { return localStorage.getItem('bs_employee') || ''; } catch (_) { return ''; } })()
      },
      bunadur: bun,
      aths: [],
      adalstod: { kerfisgerd: 'rasa', fjoldi: '', tegund: '', checks, fjargaesla: 'Öryggismiðstöðin', teiknud_af: '' },
      hljod: HLJOD.map(h => ({ key: h[0], db: '', status: null })),
      rafhl: {},
      abendingar: []
    };
  }

  // ── samtölur ────────────────────────────────────────────────────────────────
  function totals(d) {
    let taeki = 0, fravik = 0;
    EQUIP.forEach(e => { const b = d.bunadur[e[0]] || {}; taeki += (b.ok || 0) + (b.bad || 0); fravik += (b.bad || 0) + (b.missing || 0); });
    return { taeki, fravik, aths: (d.aths || []).length };
  }
  function aetludEnding(d) {
    const ah = num(d.rafhl.maeld) != null ? (String(d.rafhl.maeld).match(/(\d+[.,]?\d*)\s*ah/i) ? num(String(d.rafhl.maeld).match(/(\d+[.,]?\d*)\s*ah/i)[1]) : num(d.rafhl.maeld)) : num(d.rafhl.astimplud);
    const i1 = num(d.rafhl.i1);
    if (!ah || !i1) return '';
    return (Math.round(ah * 1000 / i1 * 100) / 100) + ' klst';
  }

  // ── yfirbygging (overlay) ───────────────────────────────────────────────────
  function ensureOverlay() {
    let ov = document.getElementById('_bks-overlay'); if (ov) return ov;
    ov = document.createElement('div'); ov.id = '_bks-overlay';
    ov.innerHTML = '<style>' +
      '#_bks-overlay{position:fixed;inset:0;z-index:9500;background:#eef1f5;overflow-y:auto;display:none;font-family:inherit;-webkit-overflow-scrolling:touch}' +
      '#_bks-overlay *{box-sizing:border-box}' +
      '#_bks-overlay ._bks-top{position:sticky;top:0;z-index:30;background:#0b0e13;color:#fff;display:flex;align-items:center;gap:10px;padding:10px 16px;flex-wrap:wrap;box-shadow:0 4px 14px rgba(0,0,0,.35)}' +
      '#_bks-overlay ._bks-logo{background:#fff;border-radius:8px;padding:4px 8px;display:flex;align-items:center}' +
      '#_bks-overlay ._bks-logo img{height:26px;display:block}' +
      '#_bks-overlay ._bks-ttl{font-size:15.5px;font-weight:800;line-height:1.15}' +
      '#_bks-overlay ._bks-sub{font-size:11px;color:#94a3b8;font-weight:600}' +
      '#_bks-overlay ._bks-tbtns{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}' +
      '#_bks-overlay ._bks-hb{padding:8px 14px;border-radius:9px;border:1px solid #2b3545;background:#151b26;color:#e5e9f0;font:inherit;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap;min-height:38px}' +
      '#_bks-overlay ._bks-hb._on{background:#2563eb;border-color:#2563eb;color:#fff}' +
      '#_bks-overlay ._bks-hb._grn{background:#15803d;border-color:#15803d;color:#fff}' +
      '#_bks-overlay ._bks-hb._save{background:#0e7490;border-color:#0e7490;color:#fff}' +
      '#_bks-overlay ._bks-wrap{max-width:1380px;margin:0 auto;padding:16px 16px 60px}' +
      '#_bks-overlay ._bks-card{background:#fff;border:1px solid #dbe1ea;border-radius:12px;margin-bottom:16px;overflow:hidden;box-shadow:0 2px 10px -6px rgba(15,23,42,.25)}' +
      '#_bks-overlay ._bks-ch{background:#0b0e13;color:#fff;font-size:12.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:9px 14px;display:flex;align-items:center;justify-content:space-between}' +
      '#_bks-overlay ._bks-ch small{color:#8b95a6;font-weight:700;letter-spacing:0;text-transform:none}' +
      '#_bks-overlay ._bks-body{padding:14px}' +
      '#_bks-overlay ._bks-info{background:linear-gradient(165deg,#16233c,#0d1526);border:1px solid #24344f;border-radius:14px;padding:16px;margin-bottom:16px;display:grid;grid-template-columns:repeat(6,1fr);gap:12px}' +
      '#_bks-overlay ._bks-f{display:flex;flex-direction:column;gap:4px}' +
      '#_bks-overlay ._bks-f label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#7d8aa3}' +
      '#_bks-overlay ._bks-f input{background:#1d2942;border:1px solid #33415e;border-radius:9px;color:#f1f5f9;padding:9px 11px;font:inherit;font-size:14px;min-height:40px}' +
      '#_bks-overlay ._bks-f input::placeholder{color:#5c6b87}' +
      '#_bks-overlay ._bks-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}' +
      '#_bks-overlay table._bks-cnt{width:100%;border-collapse:collapse}' +
      '#_bks-overlay ._bks-cnt th{font-size:10.5px;font-weight:800;letter-spacing:.05em;color:#64748b;text-transform:uppercase;text-align:center;padding:6px 4px;border-bottom:1px solid #e8ecf1}' +
      '#_bks-overlay ._bks-cnt th:first-child{text-align:left}' +
      '#_bks-overlay ._bks-cnt td{padding:7px 4px;border-bottom:1px solid #f1f5f9;text-align:center}' +
      '#_bks-overlay ._bks-cnt td:first-child{text-align:left;font-weight:700;color:#0f172a;font-size:13.5px;white-space:nowrap}' +
      '#_bks-overlay ._bks-step{display:inline-flex;align-items:center;gap:6px}' +
      '#_bks-overlay ._bks-step button{width:30px;height:30px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:16px;font-weight:800;cursor:pointer;line-height:1}' +
      '#_bks-overlay ._bks-step b{min-width:26px;text-align:center;font-size:14.5px}' +
      '#_bks-overlay ._bks-step._ok b{color:#15803d}#_bks-overlay ._bks-step._bad b{color:#b91c1c}#_bks-overlay ._bks-step._mis b{color:#b45309}' +
      '#_bks-overlay ._bks-sam{display:inline-block;min-width:34px;padding:4px 8px;border-radius:99px;background:#0b0e13;color:#fff;font-weight:800;font-size:13px}' +
      '#_bks-overlay ._bks-arow{display:grid;grid-template-columns:150px 90px 80px 170px;gap:8px;margin-bottom:8px}' +
      '#_bks-overlay ._bks-arow2{display:flex;gap:8px}' +
      '#_bks-overlay select._bks-in,#_bks-overlay input._bks-in{border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#0f172a;padding:8px 10px;font:inherit;font-size:14px;min-height:40px;width:100%}' +
      '#_bks-overlay ._bks-lbl{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#64748b;margin-bottom:3px}' +
      '#_bks-overlay ._bks-add{padding:9px 16px;border-radius:9px;border:0;background:#2563eb;color:#fff;font:inherit;font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap;min-height:40px}' +
      '#_bks-overlay ._bks-ath{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #edf0f4;border-radius:9px;margin-top:8px;background:#fbfcfe}' +
      '#_bks-overlay ._bks-tag{padding:2px 9px;border-radius:6px;font-size:11px;font-weight:800;white-space:nowrap}' +
      '#_bks-overlay ._bks-del{margin-left:auto;width:28px;height:28px;border-radius:8px;border:1px solid #fecaca;background:#fff;color:#dc2626;font-weight:800;cursor:pointer;flex:none}' +
      '#_bks-overlay ._bks-chk{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9}' +
      '#_bks-overlay ._bks-chk span{font-size:13.5px;color:#0f172a;font-weight:600}' +
      '#_bks-overlay ._bks-okbtn,#_bks-overlay ._bks-badbtn{padding:7px 13px;border-radius:8px;font:inherit;font-size:12.5px;font-weight:800;cursor:pointer;border:1px solid #cbd5e1;background:#fff;color:#64748b;white-space:nowrap;min-height:36px}' +
      '#_bks-overlay ._bks-okbtn._on{background:#15803d;border-color:#15803d;color:#fff}' +
      '#_bks-overlay ._bks-badbtn._on{background:#b91c1c;border-color:#b91c1c;color:#fff}' +
      '#_bks-overlay ._bks-seg{display:inline-flex;border:1px solid #cbd5e1;border-radius:9px;overflow:hidden}' +
      '#_bks-overlay ._bks-seg button{padding:8px 16px;border:0;background:#fff;color:#334155;font:inherit;font-size:13px;font-weight:800;cursor:pointer}' +
      '#_bks-overlay ._bks-seg button._on{background:#0b0e13;color:#fff}' +
      '#_bks-overlay ._bks-abrow{display:flex;gap:8px;align-items:flex-start;margin-top:8px}' +
      '#_bks-overlay ._bks-note{background:#eef2f7;border-bottom:1px solid #dbe1ea;color:#475569;font-size:12.5px;padding:9px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
      '#_bks-overlay ._bks-backbtn{padding:7px 13px;border-radius:9px;border:1px solid #0b0e13;background:#0b0e13;color:#fff;font:inherit;font-size:12.5px;font-weight:800;cursor:pointer}' +
      // A4 skýrsla á skjá
      '#_bks-overlay ._bks-sheetwrap{padding:18px 8px 60px;display:none}' +
      '#_bks-overlay ._bks-sheet{background:#fff;max-width:820px;margin:0 auto;box-shadow:0 10px 34px -12px rgba(15,23,42,.45);padding:34px 40px;color:#111}' +
      '@media (max-width:1000px){#_bks-overlay ._bks-info{grid-template-columns:1fr 1fr}#_bks-overlay ._bks-grid{grid-template-columns:1fr}#_bks-overlay ._bks-arow{grid-template-columns:1fr 1fr}#_bks-overlay ._bks-sheet{padding:20px 14px}}' +
      // prentun: aðeins skýrslublaðið
      '@media print{body>*{display:none!important}body>#_bks-overlay{display:block!important;position:static;background:#fff;overflow:visible}' +
      '#_bks-overlay ._bks-top,#_bks-overlay ._bks-wrap,#_bks-overlay ._bks-note{display:none!important}' +
      '#_bks-overlay ._bks-sheetwrap{display:block!important;padding:0}' +
      '#_bks-overlay ._bks-sheet{box-shadow:none;max-width:none;padding:0;margin:0}}' +
      '</style>' +
      // skýrslu-CSS (R_CSS) þarf LÍKA á skjá — ekki bara í vistaða HTML-skjalinu
      '<style>' + R_CSS + '</style>' +
      '<div class="_bks-top"></div>' +
      '<div class="_bks-note" style="display:none"><button type="button" class="_bks-backbtn">← Til baka í vinnusvæði</button><span>Skýrslan skiptist sjálfkrafa á A4 síður við prentun — haus og fótur endurtaka sig á hverri síðu.</span></div>' +
      '<div class="_bks-wrap"></div>' +
      '<div class="_bks-sheetwrap"><div class="_bks-sheet"></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('._bks-backbtn').addEventListener('click', () => setMode('work'));
    // EINN delegated smellur á hausinn (renderTop skiptir bara um innerHTML —
    // listener hér má ekki tvöfaldast við endur-opnun).
    ov.querySelector('._bks-top').addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'close') return closeOverlay();
      if (act === 'work') return setMode('work');
      if (act === 'report') return setMode('report');
      if (act === 'print') { setMode('report'); setTimeout(() => window.print(), 120); return; }
      if (act === 'save') { try { await saveDraft(); toast('Drög vistuð ✓'); } catch (err) { toast('Villa við vistun: ' + (err.message || err), true); } return; }
      if (act === 'final') { await finalize(b); return; }
    });
    return ov;
  }

  function setMode(m) {
    const ov = ensureOverlay();
    const work = m !== 'report';
    ov.querySelector('._bks-wrap').style.display = work ? 'block' : 'none';
    ov.querySelector('._bks-note').style.display = work ? 'none' : 'flex';
    ov.querySelector('._bks-sheetwrap').style.display = work ? 'none' : 'block';
    const bW = ov.querySelector('[data-act="work"]'), bR = ov.querySelector('[data-act="report"]');
    if (bW) bW.classList.toggle('_on', work);
    if (bR) bR.classList.toggle('_on', !work);
    if (!work) ov.querySelector('._bks-sheet').innerHTML = reportInner();
    ov.scrollTop = 0;
  }

  // ── haus ────────────────────────────────────────────────────────────────────
  function renderTop() {
    const ov = ensureOverlay();
    const t = totals(S.data);
    ov.querySelector('._bks-top').innerHTML =
      '<div class="_bks-logo"><img src="/img/slokkvitaeki-brunaholf-logo.png" alt="" onerror="this.parentNode.style.display=\'none\'"></div>' +
      '<div><div class="_bks-ttl">Brunakerfi — Skoðunarskýrsla</div>' +
      '<div class="_bks-sub" id="_bks-stats">' + t.taeki + ' tæki · ' + t.fravik + ' frávik · ' + t.aths + ' athugasemdir</div></div>' +
      '<div class="_bks-tbtns">' +
        '<button type="button" class="_bks-hb" data-act="close">← Til baka</button>' +
        '<button type="button" class="_bks-hb _on" data-act="work">Vinnusvæði</button>' +
        '<button type="button" class="_bks-hb" data-act="report">Skýrsla</button>' +
        '<button type="button" class="_bks-hb _save" data-act="save">💾 Vista drög</button>' +
        '<button type="button" class="_bks-hb _grn" data-act="final">✅ Ljúka &amp; vista</button>' +
        '<button type="button" class="_bks-hb _grn" data-act="print">🖨 Prenta / Vista PDF</button>' +
      '</div>';
  }
  function updStats() {
    const el = document.getElementById('_bks-stats'); if (!el) return;
    const t = totals(S.data);
    el.textContent = t.taeki + ' tæki · ' + t.fravik + ' frávik · ' + t.aths + ' athugasemdir';
  }

  // ── vinnusvæði ──────────────────────────────────────────────────────────────
  function infoField(k, label, ph, type) {
    return '<div class="_bks-f"><label>' + esc(label) + '</label><input data-i="' + k + '" type="' + (type || 'text') + '" value="' + esc(S.data.info[k] || '') + '" placeholder="' + esc(ph || '') + '"></div>';
  }
  function renderWork() {
    const ov = ensureOverlay(), w = ov.querySelector('._bks-wrap');
    const d = S.data;
    w.innerHTML =
      // upplýsingar
      '<div class="_bks-info">' +
        '<div style="grid-column:span 3">' + infoField('vidskiptavinur', 'Viðskiptavinur') + '</div>' +
        '<div style="grid-column:span 1">' + infoField('kennitala', 'Kennitala', '000000-0000') + '</div>' +
        '<div style="grid-column:span 2">' + infoField('adsetur', 'Aðsetur') + '</div>' +
        '<div style="grid-column:span 2">' + infoField('umbedid_af', 'Umbeðið af') + '</div>' +
        '<div style="grid-column:span 2">' + infoField('tengilidur', 'Tengiliður á verkstað') + '</div>' +
        '<div style="grid-column:span 1">' + infoField('uttekt_nr', 'Úttekt nr.') + '</div>' +
        '<div style="grid-column:span 1">' + infoField('dags', 'Dags. skoðunar', '', 'date') + '</div>' +
        '<div style="grid-column:span 3">' + infoField('stadur', 'Staður') + '</div>' +
        '<div style="grid-column:span 3">' + infoField('skodunarmadur', 'Skoðunarmaður') + '</div>' +
      '</div>' +
      '<div class="_bks-grid">' +
        '<div>' +
          // búnaðaryfirlit
          '<div class="_bks-card"><div class="_bks-ch">Búnaðaryfirlit<small id="_bks-eqsum"></small></div><div class="_bks-body">' +
            '<table class="_bks-cnt"><thead><tr><th>Búnaður</th><th>Í lagi</th><th>Ekki í lagi</th><th>Vantar</th><th>Samtals</th></tr></thead><tbody>' +
            EQUIP.map(e => {
              const b = d.bunadur[e[0]];
              const step = (f, cls) => '<span class="_bks-step ' + cls + '">' +
                '<button type="button" data-eq="' + e[0] + '" data-f="' + f + '" data-d="-1">−</button>' +
                '<b data-v="' + e[0] + ':' + f + '">' + b[f] + '</b>' +
                '<button type="button" data-eq="' + e[0] + '" data-f="' + f + '" data-d="1">+</button></span>';
              return '<tr><td>' + esc(e[1]) + '</td><td>' + step('ok', '_ok') + '</td><td>' + step('bad', '_bad') + '</td><td>' + step('missing', '_mis') + '</td>' +
                '<td><span class="_bks-sam" data-sam="' + e[0] + '">' + (b.ok + b.bad) + '</span></td></tr>';
            }).join('') + '</tbody></table></div></div>' +
          // athugasemdir
          '<div class="_bks-card"><div class="_bks-ch">Athugasemdir<small id="_bks-athsum"></small></div><div class="_bks-body">' +
            '<div class="_bks-arow">' +
              '<div><div class="_bks-lbl">Búnaður</div><select class="_bks-in" id="_bks-a-bun">' + ATH_BUNADUR.map(x => '<option>' + esc(x) + '</option>').join('') + '</select></div>' +
              '<div><div class="_bks-lbl">Númer</div><input class="_bks-in" id="_bks-a-num" placeholder="t.d. 1.55"></div>' +
              '<div><div class="_bks-lbl">Svæði</div><input class="_bks-in" id="_bks-a-sv" placeholder="t.d. 6"></div>' +
              '<div><div class="_bks-lbl">Athugasemd</div><select class="_bks-in" id="_bks-a-ath">' + ATH_TYPES.map(x => '<option>' + esc(x) + '</option>').join('') + '</select></div>' +
            '</div>' +
            '<div class="_bks-lbl">Lýsing</div>' +
            '<div class="_bks-arow2"><input class="_bks-in" id="_bks-a-lys" placeholder="t.d. Engin vöktun í ruslageymslu í kjallara á svæði 6">' +
            '<button type="button" class="_bks-add" id="_bks-a-add">+ Bæta við</button></div>' +
            '<div id="_bks-athlist"></div>' +
          '</div></div>' +
        '</div>' +
        '<div>' +
          // aðalstöð
          '<div class="_bks-card"><div class="_bks-ch">Aðalstöð</div><div class="_bks-body">' +
            '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;align-items:flex-end">' +
              '<div><div class="_bks-lbl">Kerfisgerð</div><span class="_bks-seg">' +
                '<button type="button" data-kg="rasa" class="' + (d.adalstod.kerfisgerd === 'rasa' ? '_on' : '') + '">Rása</button>' +
                '<button type="button" data-kg="slaufa" class="' + (d.adalstod.kerfisgerd === 'slaufa' ? '_on' : '') + '">Slaufu</button></span></div>' +
              '<div style="width:110px"><div class="_bks-lbl">Fjöldi rása/slaufa</div><input class="_bks-in" data-st="fjoldi" value="' + esc(d.adalstod.fjoldi) + '"></div>' +
              '<div style="flex:1;min-width:160px"><div class="_bks-lbl">Tegund búnaðar</div><input class="_bks-in" data-st="tegund" value="' + esc(d.adalstod.tegund) + '" placeholder="t.d. Junior"></div>' +
            '</div>' +
            STOD.map(c => {
              const v = d.adalstod.checks[c[0]];
              return '<div class="_bks-chk"><span>' + esc(c[1]) + '</span><span style="display:flex;gap:6px">' +
                '<button type="button" class="_bks-okbtn' + (v === true ? ' _on' : '') + '" data-ck="' + c[0] + '" data-val="1">✓ Í lagi</button>' +
                '<button type="button" class="_bks-badbtn' + (v === false ? ' _on' : '') + '" data-ck="' + c[0] + '" data-val="0">✗ Ekki í lagi</button></span></div>';
            }).join('') +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">' +
              '<div><div class="_bks-lbl">Heiti fjargæsluaðila</div><input class="_bks-in" data-st="fjargaesla" value="' + esc(d.adalstod.fjargaesla) + '"></div>' +
              '<div><div class="_bks-lbl">Yfirlitsmynd teiknuð af</div><input class="_bks-in" data-st="teiknud_af" value="' + esc(d.adalstod.teiknud_af) + '"></div>' +
            '</div>' +
          '</div></div>' +
          // hljóðstyrksmælingar
          '<div class="_bks-card"><div class="_bks-ch">Hljóðstyrksmælingar</div><div class="_bks-body">' +
            HLJOD.map((h, i) => {
              const r = d.hljod[i] || { db: '', status: null };
              return '<div class="_bks-chk"><span>' + esc(h[1]) + '</span><span style="display:flex;gap:6px;align-items:center">' +
                '<input class="_bks-in" data-hl="' + i + '" value="' + esc(r.db) + '" placeholder="dB" inputmode="decimal" style="width:76px;text-align:center">' +
                '<button type="button" class="_bks-okbtn' + (r.status === true ? ' _on' : '') + '" data-hlok="' + i + '" style="padding:7px 11px">✓</button>' +
                '<button type="button" class="_bks-badbtn' + (r.status === false ? ' _on' : '') + '" data-hlbad="' + i + '" style="padding:7px 11px">✗</button></span></div>';
            }).join('') +
          '</div></div>' +
          // rafhlöðumælingar
          '<div class="_bks-card"><div class="_bks-ch">Rafhlöðumælingar</div><div class="_bks-body">' +
            RAFHL.map(r => '<div class="_bks-chk"><span>' + esc(r[1]) + '</span>' +
              '<input class="_bks-in" data-rf="' + r[0] + '" value="' + esc(d.rafhl[r[0]] || '') + '" placeholder="' + esc(r[2]) + '" style="width:170px;text-align:right"></div>').join('') +
          '</div></div>' +
          // ábendingar
          '<div class="_bks-card"><div class="_bks-ch">Ábendingar</div><div class="_bks-body">' +
            '<div class="_bks-arow2"><input class="_bks-in" id="_bks-ab-in" placeholder="t.d. Mælt er með að skipta út gömlum reykskynjurum">' +
            '<button type="button" class="_bks-add" id="_bks-ab-add">+ Bæta við</button></div>' +
            '<div id="_bks-ablist"></div>' +
          '</div></div>' +
        '</div>' +
      '</div>';
    wireWork(w);
    renderAthList(); renderAbList(); updEqSum();
  }

  function updEqSum() {
    const t = totals(S.data);
    const el = document.getElementById('_bks-eqsum'); if (el) el.textContent = t.taeki + ' tæki samtals';
    updStats();
  }
  function renderAthList() {
    const el = document.getElementById('_bks-athlist'); if (!el) return;
    const sum = document.getElementById('_bks-athsum'); if (sum) sum.textContent = S.data.aths.length + ' skráðar';
    el.innerHTML = S.data.aths.map((a, i) =>
      '<div class="_bks-ath">' +
        '<span class="_bks-tag" style="background:#0b0e13;color:#fff">' + esc(a.bunadur) + '</span>' +
        '<span class="_bks-tag" style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca">' + esc(a.athugasemd) + '</span>' +
        (a.numer ? '<span style="font-size:11.5px;color:#64748b;font-weight:700;white-space:nowrap">nr. ' + esc(a.numer) + '</span>' : '') +
        (a.svaedi ? '<span style="font-size:11.5px;color:#64748b;font-weight:700;white-space:nowrap">svæði ' + esc(a.svaedi) + '</span>' : '') +
        '<span style="font-size:13px;color:#0f172a;line-height:1.35">' + esc(a.lysing || '') + '</span>' +
        '<button type="button" class="_bks-del" data-adel="' + i + '">✕</button>' +
      '</div>').join('') || '<div style="margin-top:10px;font-size:12.5px;color:#94a3b8;font-style:italic">Engar athugasemdir skráðar enn.</div>';
    el.querySelectorAll('[data-adel]').forEach(b => b.addEventListener('click', () => {
      S.data.aths.splice(+b.dataset.adel, 1); _dirty = true; renderAthList(); updStats();
    }));
  }
  function renderAbList() {
    const el = document.getElementById('_bks-ablist'); if (!el) return;
    el.innerHTML = S.data.abendingar.map((a, i) =>
      '<div class="_bks-ath"><span style="color:#ea580c;font-weight:800">•</span>' +
      '<span style="font-size:13px;color:#0f172a;line-height:1.35">' + esc(a) + '</span>' +
      '<button type="button" class="_bks-del" data-bdel="' + i + '">✕</button></div>').join('') ||
      '<div style="margin-top:10px;font-size:12.5px;color:#94a3b8;font-style:italic">Engar ábendingar.</div>';
    el.querySelectorAll('[data-bdel]').forEach(b => b.addEventListener('click', () => {
      S.data.abendingar.splice(+b.dataset.bdel, 1); _dirty = true; renderAbList();
    }));
  }

  function wireWork(w) {
    // upplýsingareitir
    w.querySelectorAll('[data-i]').forEach(inp => inp.addEventListener('input', () => { S.data.info[inp.dataset.i] = inp.value; _dirty = true; }));
    // teljarar
    w.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => {
      const eq = b.dataset.eq, f = b.dataset.f, dd = +b.dataset.d;
      const o = S.data.bunadur[eq]; o[f] = Math.max(0, (o[f] || 0) + dd); _dirty = true;
      const v = w.querySelector('[data-v="' + eq + ':' + f + '"]'); if (v) v.textContent = o[f];
      const s = w.querySelector('[data-sam="' + eq + '"]'); if (s) s.textContent = (o.ok || 0) + (o.bad || 0);
      updEqSum();
    }));
    // athugasemd bæta við
    const add = w.querySelector('#_bks-a-add');
    if (add) add.addEventListener('click', () => {
      const bun = w.querySelector('#_bks-a-bun').value, ath = w.querySelector('#_bks-a-ath').value;
      const numI = w.querySelector('#_bks-a-num'), svI = w.querySelector('#_bks-a-sv'), lysI = w.querySelector('#_bks-a-lys');
      S.data.aths.push({ bunadur: bun, athugasemd: ath, numer: numI.value.trim(), svaedi: svI.value.trim(), lysing: lysI.value.trim() });
      numI.value = ''; svI.value = ''; lysI.value = ''; _dirty = true;
      renderAthList(); updStats(); lysI.focus();
    });
    const lys = w.querySelector('#_bks-a-lys');
    if (lys) lys.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add.click(); } });
    // aðalstöð
    w.querySelectorAll('[data-kg]').forEach(b => b.addEventListener('click', () => {
      S.data.adalstod.kerfisgerd = b.dataset.kg; _dirty = true;
      w.querySelectorAll('[data-kg]').forEach(x => x.classList.toggle('_on', x === b));
    }));
    w.querySelectorAll('[data-st]').forEach(inp => inp.addEventListener('input', () => { S.data.adalstod[inp.dataset.st] = inp.value; _dirty = true; }));
    w.querySelectorAll('[data-ck]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.ck, val = b.dataset.val === '1';
      const cur = S.data.adalstod.checks[k];
      S.data.adalstod.checks[k] = (cur === val) ? null : val; _dirty = true;
      const row = b.closest('._bks-chk');
      row.querySelector('._bks-okbtn').classList.toggle('_on', S.data.adalstod.checks[k] === true);
      row.querySelector('._bks-badbtn').classList.toggle('_on', S.data.adalstod.checks[k] === false);
    }));
    // hljóð
    w.querySelectorAll('[data-hl]').forEach(inp => inp.addEventListener('input', () => { S.data.hljod[+inp.dataset.hl].db = inp.value; _dirty = true; }));
    const hlSet = (i, val, row) => {
      const cur = S.data.hljod[i].status;
      S.data.hljod[i].status = (cur === val) ? null : val; _dirty = true;
      row.querySelector('._bks-okbtn').classList.toggle('_on', S.data.hljod[i].status === true);
      row.querySelector('._bks-badbtn').classList.toggle('_on', S.data.hljod[i].status === false);
    };
    w.querySelectorAll('[data-hlok]').forEach(b => b.addEventListener('click', () => hlSet(+b.dataset.hlok, true, b.closest('._bks-chk'))));
    w.querySelectorAll('[data-hlbad]').forEach(b => b.addEventListener('click', () => hlSet(+b.dataset.hlbad, false, b.closest('._bks-chk'))));
    // rafhlöður
    w.querySelectorAll('[data-rf]').forEach(inp => inp.addEventListener('input', () => {
      S.data.rafhl[inp.dataset.rf] = inp.value; _dirty = true;
      if (inp.dataset.rf === 'i1' || inp.dataset.rf === 'maeld' || inp.dataset.rf === 'astimplud') {
        const ae = w.querySelector('[data-rf="aetlud_ending"]');
        if (ae && !ae.value.trim()) ae.placeholder = aetludEnding(S.data) || 'reiknast úr rýmd/i₁';
      }
    }));
    // ábendingar
    const abAdd = w.querySelector('#_bks-ab-add'), abIn = w.querySelector('#_bks-ab-in');
    if (abAdd) abAdd.addEventListener('click', () => {
      const v = abIn.value.trim(); if (!v) return;
      S.data.abendingar.push(v); abIn.value = ''; _dirty = true; renderAbList(); abIn.focus();
    });
    if (abIn) abIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); abAdd.click(); } });
  }

  // ── A4 skýrsla ──────────────────────────────────────────────────────────────
  const R_CSS =
    '._bksr{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:11.5px;line-height:1.45}' +
    '._bksr table{width:100%;border-collapse:collapse}' +
    '._bksr ._rt td,._bksr ._rt th{border:1px solid #999;padding:4px 7px;font-size:11px;vertical-align:top}' +
    '._bksr ._rt th{background:#111;color:#fff;font-weight:700;text-align:left;font-size:10px;letter-spacing:.04em;text-transform:uppercase}' +
    '._bksr ._rt._lt th{background:#f1f1f1;color:#111;border-color:#999}' +
    '._bksr h3{font-size:12.5px;font-weight:800;letter-spacing:.03em;margin:18px 0 6px;text-transform:uppercase}' +
    '._bksr h4{font-size:11.5px;font-weight:800;margin:12px 0 4px}' +
    '._bksr ._sec{break-inside:avoid;page-break-inside:avoid}' +
    '._bksr ._num{text-align:center}' +
    '._bksr ._grn{color:#15803d}._bksr ._red{color:#b91c1c}._bksr ._amb{color:#b45309}' +
    '._bksr ._hd{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px}' +
    '._bksr ._hd img{height:44px}' +
    '._bksr ._hd ._t1{font-size:10px;font-weight:700;text-align:right}' +
    '._bksr ._hd ._t2{font-size:17px;font-weight:900;letter-spacing:.02em;text-align:right;color:#7f1d1d}' +
    '._bksr ._hd ._t3{font-size:11px;font-weight:800;letter-spacing:.05em;text-align:right;color:#c2410c}' +
    '._bksr ._ft{border-top:1px solid #bbb;padding-top:6px;font-size:9px;color:#444;text-align:center}' +
    '._bksr ._ft b{font-size:9.5px;color:#111}' +
    '._bksr ._sig{display:flex;gap:26px;margin-top:26px;break-inside:avoid}' +
    '._bksr ._sig>div{flex:1;text-align:center}' +
    '._bksr ._sig ._ln{border-bottom:1px solid #111;padding-bottom:3px;font-weight:700;min-height:18px}' +
    '._bksr ._sig ._lb{font-size:9px;color:#555;margin-top:3px}' +
    '@page{size:A4;margin:12mm}';

  function xmark(v, want) { return v === want ? '<span style="font-weight:800">x</span>' : ''; }

  function reportInner() {
    const d = S.data, inf = d.info;
    const t = totals(d);
    const kerfis = d.adalstod.kerfisgerd === 'slaufa' ? 'Slaufu' : 'Rása';
    const infoRow = (l, v) => v ? '<tr><td style="border:0;padding:1.5px 0;width:150px;color:#333">' + esc(l) + ':</td><td style="border:0;padding:1.5px 0;font-weight:700">' + esc(v) + '</td></tr>' : '';
    // athugasemdir flokkaðar eftir búnaði
    const groups = [];
    ATH_BUNADUR.forEach(b => {
      const list = d.aths.filter(a => a.bunadur === b);
      if (list.length) groups.push([b, list]);
    });
    const athTable = (b, list) => {
      if (b === 'Hljóðstyrksmælingar') {
        return '<table class="_rt _lt"><thead><tr><th style="width:170px">Tegund mælingar</th><th style="width:80px">Hljóðst. (dB)</th><th>Lýsing</th></tr></thead><tbody>' +
          list.map(a => '<tr><td>' + esc(a.athugasemd) + '</td><td class="_num">' + esc(a.numer || a.svaedi || '') + '</td><td>' + esc(a.lysing) + '</td></tr>').join('') + '</tbody></table>';
      }
      return '<table class="_rt _lt"><thead><tr><th style="width:70px">Númer</th><th style="width:55px">Svæði</th><th style="width:150px">Athugasemd</th><th>Lýsing</th></tr></thead><tbody>' +
        list.map(a => '<tr><td class="_num">' + esc(a.numer) + '</td><td class="_num">' + esc(a.svaedi) + '</td><td><b>' + esc(a.athugasemd) + '</b></td><td>' + esc(a.lysing) + '</td></tr>').join('') + '</tbody></table>';
    };
    const hlLbl = {}; HLJOD.forEach(h => hlLbl[h[0]] = h[1]);
    const aeVal = d.rafhl.aetlud_ending || aetludEnding(d);
    const rfVal = k => k === 'aetlud_ending' ? (d.rafhl[k] || aeVal || '—') : (d.rafhl[k] || '—');

    // haus + fótur í thead/tfoot svo þeir endurtaki sig á hverri prentsíðu
    return '<div class="_bksr"><table><thead><tr><td style="padding:0 0 6px">' +
      '<div class="_hd">' +
        '<img src="' + LOGO + '" alt="Slökkvitæki ehf" onerror="this.style.display=\'none\'">' +
        '<div><div class="_t1">ÚTTEKT NR. <b>' + esc(inf.uttekt_nr || '—') + '</b></div>' +
        '<div class="_t2">SKOÐUNARSKÝRSLA</div><div class="_t3">BRUNAVIÐVÖRUNARKERFIS</div></div>' +
      '</div></td></tr></thead>' +
      '<tfoot><tr><td style="padding:8px 0 0"><div class="_ft">' + esc(FOOT_1) + '<br>' + esc(FOOT_2) + '<br><b>' + esc(FOOT_CO) + '</b></div></td></tr></tfoot>' +
      '<tbody><tr><td style="padding:0">' +

      '<div class="_sec"><table style="margin:6px 0 4px"><tbody>' +
        infoRow('Viðskiptavinur', inf.vidskiptavinur) + infoRow('Kennitala', inf.kennitala) +
        infoRow('Umbeðið af', inf.umbedid_af) + infoRow('Tengiliður á verkstað', inf.tengilidur) +
        infoRow('Aðsetur', inf.adsetur) + infoRow('Dags. skoðunar', fmtDags(inf.dags)) +
      '</tbody></table></div>' +

      // búnaðartafla
      '<div class="_sec"><table class="_rt"><thead><tr><th>Búnaður</th><th class="_num" style="width:70px;text-align:center">Samtals</th><th class="_num" style="width:70px;text-align:center">Í lagi</th><th class="_num" style="width:80px;text-align:center">Ekki í lagi</th><th class="_num" style="width:70px;text-align:center">Vantar</th></tr></thead><tbody>' +
        EQUIP.map(e => {
          const b = d.bunadur[e[0]];
          return '<tr><td style="font-weight:700">' + esc(e[1]) + '</td><td class="_num" style="font-weight:700">' + (b.ok + b.bad) + '</td>' +
            '<td class="_num ' + (b.ok ? '_grn' : '') + '">' + b.ok + '</td><td class="_num ' + (b.bad ? '_red' : '') + '" style="font-weight:' + (b.bad ? '800' : '400') + '">' + b.bad + '</td>' +
            '<td class="_num ' + (b.missing ? '_amb' : '') + '" style="font-weight:' + (b.missing ? '800' : '400') + '">' + b.missing + '</td></tr>';
        }).join('') + '</tbody></table></div>' +

      '<div style="display:flex;gap:18px;align-items:flex-start;margin-top:14px">' +
        '<div style="flex:1.1">' +
          '<div class="_sec"><h3 style="margin-top:0">Hljóðstyrksmælingar</h3>' +
          '<table class="_rt _lt"><thead><tr><th>Mæling</th><th style="width:62px">Hljóðst. (dB)</th><th style="width:44px">Í lagi</th><th style="width:56px">Ekki í lagi</th></tr></thead><tbody>' +
          d.hljod.map(r => '<tr><td>' + esc(hlLbl[r.key] || r.key) + '</td><td class="_num">' + (r.db ? esc(r.db) : '—') + '</td>' +
            '<td class="_num">' + xmark(r.status, true) + '</td><td class="_num" style="color:#b91c1c">' + xmark(r.status, false) + '</td></tr>').join('') +
          '</tbody></table></div>' +
          '<div class="_sec"><h3>Rafhlöðumælingar</h3><table class="_rt _lt"><tbody>' +
          RAFHL.map(r => '<tr><td>' + esc(r[1]) + '</td><td style="width:140px;text-align:right;font-weight:700">' + esc(rfVal(r[0])) + '</td></tr>').join('') +
          '</tbody></table></div>' +
        '</div>' +
        '<div style="flex:1">' +
          '<div class="_sec"><h3 style="margin-top:0">Aðalstöð: ' + esc(kerfis) + '</h3>' +
          '<table class="_rt _lt"><tbody>' +
            '<tr><td style="font-weight:700">Fjöldi rása/slaufa</td><td class="_num" style="width:120px;font-weight:700">' + esc(d.adalstod.fjoldi || '—') + '</td></tr>' +
          '</tbody></table>' +
          '<table class="_rt _lt" style="margin-top:-1px"><thead><tr><th></th><th style="width:44px">Í lagi</th><th style="width:56px">Ekki í lagi</th></tr></thead><tbody>' +
          STOD.map(c => '<tr><td>' + esc(c[1]) + '</td><td class="_num">' + xmark(d.adalstod.checks[c[0]], true) + '</td>' +
            '<td class="_num" style="color:#b91c1c">' + xmark(d.adalstod.checks[c[0]], false) + '</td></tr>').join('') +
          '</tbody></table>' +
          '<table class="_rt _lt" style="margin-top:8px"><tbody>' +
            '<tr><td>Heiti fjargæsluaðila</td><td style="font-weight:700">' + esc(d.adalstod.fjargaesla || '—') + '</td></tr>' +
            '<tr><td>Tegund búnaðar</td><td style="font-weight:700">' + esc(d.adalstod.tegund || '—') + '</td></tr>' +
            '<tr><td>Yfirlitsmynd teiknuð af</td><td style="font-weight:700">' + esc(d.adalstod.teiknud_af || '—') + '</td></tr>' +
          '</tbody></table></div>' +
        '</div>' +
      '</div>' +

      (groups.length ? '<h3 style="margin-top:20px">Athugasemdir og ábendingar</h3>' +
        groups.map(g => '<div class="_sec"><h4>' + esc(g[0]) + '</h4>' + athTable(g[0], g[1]) + '</div>').join('') : '') +

      (d.abendingar.length ? '<div class="_sec"><h4>Ábendingar</h4>' +
        d.abendingar.map(a => '<div style="margin:3px 0"><span style="color:#ea580c;font-weight:800">•</span> ' + esc(a) + '</div>').join('') + '</div>' : '') +

      '<div class="_sig">' +
        '<div><div class="_ln">' + esc(inf.stadur || '') + '</div><div class="_lb">Staður</div></div>' +
        '<div><div class="_ln">' + esc(fmtDags(inf.dags)) + '</div><div class="_lb">Dags.</div></div>' +
        '<div><div class="_ln">' + esc(inf.skodunarmadur || '') + '</div><div class="_lb">F.h. Slökkvitæki ehf.</div></div>' +
      '</div>' +

      '</td></tr></tbody></table></div>';
  }

  function reportStandaloneHtml() {
    const inf = S.data.info;
    return '<!doctype html><html lang="is"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Skoðunarskýrsla brunaviðvörunarkerfis — ' + esc(inf.vidskiptavinur || '') + ' — ' + esc(fmtDags(inf.dags)) + '</title>' +
      '<style>body{margin:0;background:#e8eaee;padding:24px 8px}@media print{body{background:#fff;padding:0}}' +
      '._page{background:#fff;max-width:820px;margin:0 auto;padding:34px 40px;box-shadow:0 8px 30px rgba(0,0,0,.18)}' +
      '@media print{._page{box-shadow:none;max-width:none;padding:0}}' + R_CSS + '</style></head><body>' +
      '<div class="_page">' + reportInner() + '</div></body></html>';
  }

  // ── vistun ──────────────────────────────────────────────────────────────────
  function yearOf() { const m = String(S.data.info.dags || '').match(/^(\d{4})/); return m ? +m[1] : new Date().getFullYear(); }

  async function saveDraft() {
    const sb = SB(); if (!sb) throw new Error('engin gagnabankatenging');
    const rec = {
      fyrirtaeki_id: S.co.id, year: yearOf(), uttekt_nr: S.data.info.uttekt_nr || null,
      status: S.status || 'draft', data: S.data, updated_at: new Date().toISOString()
    };
    if (S.id) {
      const r = await sb.from('brunakerfi_skyrslur').update(rec).eq('id', S.id);
      if (r.error) throw r.error;
    } else {
      const r = await sb.from('brunakerfi_skyrslur').insert(rec).select('id').single();
      if (r.error) throw r.error;
      S.id = r.data.id;
    }
    _dirty = false; _reports = null;
  }

  async function finalize(btn) {
    const sb = SB(); if (!sb) return toast('Engin gagnabankatenging', true);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Vista…'; }
    try {
      S.status = 'final';
      await saveDraft();
      const html = reportStandaloneHtml();
      const safe = String(S.data.info.uttekt_nr || 'skyrsla').replace(/[^\w\-]+/g, '_');
      const path = FOLDER + '/' + S.co.id + '/' + yearOf() + '_' + safe + '_' + Date.now() + '.html';
      const up = await sb.storage.from(BUCKET).upload(path, new Blob([html], { type: 'text/html' }), { contentType: 'text/html; charset=utf-8', upsert: true });
      if (up.error) throw up.error;
      const doc = {
        doc_type: 'brunakerfi', fyrirtaeki_id: S.co.id, year: yearOf(),
        storage_path: BUCKET + '/' + path, doc_date: S.data.info.dags || null,
        customer_name: S.co.nafn || null, source: 'app', found_by: 'skyrsla-form',
        notes: 'Skoðunarskýrsla ' + (S.data.info.uttekt_nr || '')
      };
      if (S.docId) {
        const r = await sb.from('customer_documents').update(doc).eq('id', S.docId);
        if (r.error) throw r.error;
      } else {
        const r = await sb.from('customer_documents').insert(doc).select('id').single();
        if (r.error) throw r.error;
        S.docId = r.data.id;
        await sb.from('brunakerfi_skyrslur').update({ doc_id: S.docId }).eq('id', S.id);
      }
      toast('Skýrslan er vistuð — græni punkturinn kviknar í yfirlitinu ✓');
      setMode('report');
      try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
    } catch (e) {
      console.warn('[bks] finalize', e);
      S.status = 'draft';
      toast('Villa við vistun: ' + (e.message || e), true);
    }
    if (btn) { btn.disabled = false; btn.textContent = '✅ Ljúka & vista'; }
  }

  async function closeOverlay() {
    if (_dirty) { try { await saveDraft(); toast('Drög vistuð sjálfkrafa ✓'); } catch (e) { console.warn('[bks] autosave', e); } }
    const ov = document.getElementById('_bks-overlay'); if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
    try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
  }

  // ── opnun ───────────────────────────────────────────────────────────────────
  async function nextNr() {
    try {
      const sb = SB();
      const r = await sb.from('brunakerfi_skyrslur').select('id', { count: 'exact', head: true });
      const n = 1 + (r.count || 0);
      return String(new Date().getFullYear()).slice(-2) + '-' + String(n).padStart(4, '0');
    } catch (_) { return String(new Date().getFullYear()).slice(-2) + '-' + String(Date.now()).slice(-4); }
  }

  async function fetchCo(coId) {
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,simi,farsimi,netfang,"tengiliður"').eq('id', coId).single();
    return (r && r.data) || null;
  }

  function openForm(co, existing) {
    // gölluð/tóm drög (data án info) → meðhöndla sem nýja skýrslu
    const okData = existing && existing.data && existing.data.info;
    S = {
      id: existing ? existing.id : null,
      docId: existing ? (existing.doc_id || null) : null,
      co,
      status: existing ? existing.status : 'draft',
      data: okData ? existing.data : null
    };
    _dirty = false;
    const ov = ensureOverlay();
    ov.style.display = 'block';
    document.body.style.overflow = 'hidden';
    const go = () => { renderTop(); renderWork(); setMode('work'); };
    if (S.data) { go(); }
    else {
      nextNr().then(nr => { S.data = blank(co, nr); go(); });
    }
  }

  async function openFlow(coId) {
    const sb = SB(); if (!sb) return;
    let co = null, reports = [];
    try {
      const [c, r] = await Promise.all([
        fetchCo(coId),
        sb.from('brunakerfi_skyrslur').select('id,year,uttekt_nr,status,doc_id,data,updated_at').eq('fyrirtaeki_id', coId).order('updated_at', { ascending: false })
      ]);
      co = c; reports = (r && r.data) || [];
    } catch (e) { console.warn('[bks] openFlow', e); }
    if (!co) { toast('Fann ekki fyrirtækið', true); return; }
    if (!reports.length) { openForm(co, null); return; }
    picker(co, reports);
  }

  function picker(co, reports) {
    let p = document.getElementById('_bks-picker'); if (p) p.remove();
    p = document.createElement('div'); p.id = '_bks-picker';
    p.style.cssText = 'position:fixed;inset:0;z-index:9400;background:rgba(8,12,20,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    const st = s => s === 'final'
      ? '<span style="padding:2px 9px;border-radius:99px;background:#DBEEE3;color:#0F5E3F;font-size:10.5px;font-weight:800">LOKIÐ</span>'
      : '<span style="padding:2px 9px;border-radius:99px;background:#FBEAC6;color:#8A5C04;font-size:10.5px;font-weight:800">DRÖG</span>';
    p.innerHTML =
      '<div style="background:#fff;border-radius:14px;max-width:520px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">' +
        '<div style="background:#0b0e13;color:#fff;padding:13px 16px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-weight:800;font-size:14.5px">' + esc(co.nafn) + '</div>' +
          '<div style="font-size:11px;color:#94a3b8">Skoðunarskýrslur brunakerfis</div></div>' +
          '<button type="button" id="_bks-p-x" style="background:none;border:0;color:#94a3b8;font-size:20px;cursor:pointer;padding:4px 8px">✕</button></div>' +
        '<div style="padding:14px 16px">' +
          reports.map(r =>
            '<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid #f1f5f9">' +
              st(r.status) +
              '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px;color:#0f172a">Úttekt ' + esc(r.uttekt_nr || '—') + ' · ' + esc(r.year || '') + '</div>' +
              '<div style="font-size:11px;color:#94a3b8">breytt ' + esc(String(r.updated_at || '').slice(0, 10)) + '</div></div>' +
              '<button type="button" data-open="' + r.id + '" style="padding:7px 14px;border-radius:9px;border:0;background:#2563eb;color:#fff;font:inherit;font-size:12.5px;font-weight:800;cursor:pointer">Opna</button>' +
              (r.status !== 'final' ? '<button type="button" data-del="' + r.id + '" style="width:32px;height:32px;border-radius:9px;border:1px solid #fecaca;background:#fff;color:#dc2626;font-weight:800;cursor:pointer">🗑</button>' : '') +
            '</div>').join('') +
          '<button type="button" id="_bks-p-new" style="margin-top:14px;width:100%;padding:12px;border-radius:10px;border:0;background:#15803d;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer">＋ Ný skoðunarskýrsla</button>' +
        '</div></div>';
    document.body.appendChild(p);
    const close = () => p.remove();
    p.addEventListener('click', e => { if (e.target === p) close(); });
    p.querySelector('#_bks-p-x').addEventListener('click', close);
    p.querySelector('#_bks-p-new').addEventListener('click', () => { close(); openForm(co, null); });
    p.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      const r = reports.find(x => x.id === b.dataset.open); close(); openForm(co, r);
    }));
    p.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eyða þessum drögum?')) return;
      try { await SB().from('brunakerfi_skyrslur').delete().eq('id', b.dataset.del); } catch (_) {}
      _reports = null; close(); openFlow(co.id);
    }));
  }

  // ── „📋 Skýrsla" hnappur á raðir yfirlitsins (272) ──────────────────────────
  async function loadReportIndex() {
    if (_reports && Date.now() - _repAt < 60000) return _reports;
    try {
      const sb = SB(); if (!sb) return {};
      const r = await sb.from('brunakerfi_skyrslur').select('fyrirtaeki_id,status');
      const m = {};
      ((r && r.data) || []).forEach(x => {
        const o = m[x.fyrirtaeki_id] || (m[x.fyrirtaeki_id] = { draft: 0, final: 0 });
        o[x.status === 'final' ? 'final' : 'draft']++;
      });
      _reports = m; _repAt = Date.now();
    } catch (_) { _reports = _reports || {}; }
    return _reports;
  }

  function decorate() {
    const root = document.getElementById('_bky-root'); if (!root) return;
    const rows = root.querySelectorAll('tr._bky-row');
    if (!rows.length) return;
    loadReportIndex().then(idx => {
      rows.forEach(tr => {
        const id = tr.dataset.id;
        const info = idx[id] || {};
        let b = tr.querySelector('._bks-btn');
        if (!b) {
          b = document.createElement('button');
          b.type = 'button'; b.className = '_bks-btn';
          b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openFlow(+id); });
          const cell = tr.querySelector('td');
          const nameDiv = cell && cell.firstElementChild;
          (nameDiv || cell || tr).appendChild(b);
        }
        // uppfæra merkið líka á hnöppum sem eru þegar til (fyrsta umferð getur
        // hlaupið á undan index-fetch-inu) — bara skrifa ef breytt, annars
        // endar MutationObserver-inn í hringekju.
        const want = info.draft ? '📝 Drög' : '📋 Skýrsla';
        if (b.textContent !== want) {
          b.textContent = want;
          b.title = 'Skoðunarskýrsla brunakerfis' + (info.draft ? ' — drög í vinnslu' : '');
          b.style.cssText = 'margin-left:8px;padding:2px 10px;border-radius:99px;border:1px solid ' +
            (info.draft ? 'rgba(217,146,6,.55);background:#FBEAC6;color:#8A5C04' : 'rgba(37,99,235,.4);background:#EAF1FE;color:#1d4ed8') +
            ';font-size:10.5px;font-weight:800;cursor:pointer;vertical-align:middle;font-family:inherit';
        }
      });
      // Grænu ár-hlekkirnir á okkar skýrslur: Supabase þjónar HTML af public-URL
      // sem text/plain (vörn) → beina í /api/skyrsla-proxy sem skilar text/html.
      root.querySelectorAll('a[href*="/samningar/brunakerfi-skyrslur/"]').forEach(a => {
        const part = (a.getAttribute('href') || '').split('/samningar/')[1];
        if (!part) return;
        try { a.href = '/api/skyrsla-proxy?p=' + encodeURIComponent(decodeURIComponent(part)); } catch (_) {}
      });
    });
  }

  function watch() {
    const v = document.getElementById('view-brunakerfi-yfirlit');
    if (!v) { setTimeout(watch, 900); return; }
    if (v.__bksWatched) return;
    v.__bksWatched = true;
    new MutationObserver(() => decorate()).observe(v, { childList: true, subtree: true });
    decorate();
  }
  function boot() { watch(); setTimeout(watch, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.BrunakerfiSkyrsla = { openFlow, openForm };
  console.log('[patch-273] Brunakerfi skoðunarskýrsla installed');
})();
/* === END BRUNAKERFI SKOÐUNARSKÝRSLA === */
