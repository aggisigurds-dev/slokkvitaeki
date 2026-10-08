/* === SVAR-STÖÐ (447) — 08.10.2026 ===========================================
 *
 * Agnar: „nýja síðu sem heiti Svar-stöð sem yrði stýristöð hvernig texti yrði gerður, t.d. úttektarlýsing.
 * Senda frá Sala-borði. Senda skýrslur og hið ýmsu mál sem eru send úr kerfinu og svör við póstum að vissu
 * leyti. Hvað verk þarf að gera við ýmsum beiðnum. Sara agent skill veit um úttektarskýrslu-textann t.d.
 * Kannski athuga Charlize skill líka. Fara yfir alla send-takka og athuga hvaða texti er skráður hvar."
 *
 * HVAÐ SÍÐAN ER: kort af ÖLLUM leiðum sem texti fer úr kerfinu (póstur til kúnna, Payday, PDF, drög að
 * póstsvari …). Fyrir hverja leið: hvaðan hún er send (síða · takki), hvert, textinn sjálfur með breytunum,
 * HVAR hann er skráður (skrá:lína eða stillingalykill) og reglurnar sem gilda um hann (Sara, Charlize,
 * sala-reikningar, REIKNINGALOTA). Kortlagt 08.10.2026 með yfirferð á kóða beggja repóa — DATA hér að neðan.
 *
 * STÝRINGIN: „Þín regla" á hverri leið er textareitur sem vistast á ÞJÓNINN (AppSettings.svarstod.reglur[id],
 * sameinað þjónsmegin með app_settings_merge — sama mynstur og 363), aldrei aðeins í vafranum. Claude og
 * agentarnir (Sara, sala-reikningar, rukkari) lesa þennan lykil áður en þeir skrifa texta. Sjálfvirku
 * sendingarnar sjálfar lesa hann EKKI enn — það eru vörðuð svæði (reikningar út 10/233/254, payday-push)
 * og fer um netvörð og samþykki Agnars áður en þeim er breytt. Síðan segir það berum orðum.
 *
 * Útlit: Brunastál C (stálplata · stálspjöld með hnoðuðum málmhaus · reitir · plötur · silfurtakkar) —
 * tákn úr 413. Engin emoji. Stöðugt viðmót: textareitur er aldrei endurteiknaður meðan skrifað er í hann;
 * teikning fer um Stodugt.vernda (388).
 * ========================================================================== */
(() => {
  if (window.__svarstod447) return;
  window.__svarstod447 = true;

  const NAV_KEY = 'svarstod';
  const VIEW_ID = 'view-svarstod';            // view-{NAV_KEY} svo beinirinn (218) finni hana
  const LYKILL = 'svarstod';                  // AppSettings-lykill: { reglur: { <leidId>: { t, af, kl } } }
  const KORTLAGT = '08/10/2026';

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ── GÖGNIN ─────────────────────────────────────────────────────────────────
   * Fyllt út frá yfirferðinni 08.10.2026 (sjá DATA-skrána neðst). */
  const DATA = window.__SVARSTOD_DATA || { leidir: [], uttekt: null, beidnir: [], reglur: [], osamraemi: [] };

  /* ── VISTUN Á ÞJÓN (sama mynstur og 363) ─────────────────────────────────── */
  const _ny = new Map();          // leidId -> texti sem VIÐ skrifuðum síðast, þar til þjónninn skilar sama gildi
  const _bidrod = new Map();
  const _villa = new Set();
  const hver = () => { try { return (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  function reglaAf(id) {
    let sv = null;
    try { const o = window.AppSettings && AppSettings.get ? AppSettings.get(LYKILL) : null; sv = o && o.reglur && o.reglur[id] ? o.reglur[id] : null; } catch (_) {}
    const t = sv && typeof sv.t === 'string' ? sv.t : '';
    if (_ny.has(id)) { if (_ny.get(id) === t) _ny.delete(id); else return { t: _ny.get(id), af: hver(), kl: null, aLeid: true }; }
    return sv ? { t, af: sv.af || '', kl: sv.kl || null } : { t: '', af: '', kl: null };
  }
  function vistaReglu(id, t) {
    _ny.set(id, t);
    const patch = {}; patch[LYKILL] = { reglur: {} };
    patch[LYKILL].reglur[id] = { t, af: hver(), kl: new Date().toISOString() };
    const fyrri = _bidrod.get(id) || Promise.resolve();
    const min = fyrri.catch(() => {}).then(async () => {
      try { return !!(await AppSettings.save(patch)); } catch (e) { console.warn('[447] vistun kastaði', e); return false; }
    });
    _bidrod.set(id, min);
    min.then(() => { if (_bidrod.get(id) === min) _bidrod.delete(id); }, () => {});
    return min;
  }
  async function vista(ta) {
    const id = ta.dataset.ssRegla;
    if (!id) return;
    const t = ta.value;
    if (ta.dataset.saved === t && reglaAf(id).t === t) return;
    if (!window.AppSettings || !AppSettings.save) { merkjaVillu(ta, id, 'Engar stillingar tiltækar — vistaðist EKKI'); return; }
    const stada = ta.closest('.ss-regla') && ta.closest('.ss-regla').querySelector('.ss-vist');
    if (stada) stada.textContent = 'Vista…';
    const ok = await vistaReglu(id, t);
    if (ok) {
      ta.dataset.saved = t; _villa.delete(id); ta.classList.remove('_villa'); ta.title = '';
      if (stada) stada.textContent = 'Vistað ' + klukka(new Date()) + ' · ' + hver();
    } else merkjaVillu(ta, id, 'Vistaðist EKKI — reyndu aftur');
  }
  function merkjaVillu(ta, id, s) {
    _villa.add(id); ta.classList.add('_villa'); ta.title = s;
    const stada = ta.closest('.ss-regla') && ta.closest('.ss-regla').querySelector('.ss-vist');
    if (stada) stada.textContent = s;
    try { if (window.logProblem) window.logProblem('svarstod_save_failed', id); } catch (_) {}
  }
  const klukka = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const dags = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() + ' kl. ' + klukka(d); };

  /* ── ÁSTAND SÍÐUNNAR (í breytum, ekki í DOM-klösum) ─────────────────────── */
  const FLIPAR = [['leidir', 'Sendileiðir'], ['uttekt', 'Úttektarlýsing'], ['beidnir', 'Verk við beiðnir'], ['reglur', 'Reglur'], ['osamraemi', 'Ósamræmi']];
  let flipi = 'leidir', rasSia = 'allt', leit = '';
  const opin = new Set();
  try { const f = localStorage.getItem('svarstod_flipi'); if (f && FLIPAR.some((x) => x[0] === f)) flipi = f; } catch (_) {}

  /* ── CSS ───────────────────────────────────────────────────────────────── */
  function css() {
    const V = 'html body #' + VIEW_ID;
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:' + STAL_IMG + ';font-family:' + SANS + ';color:#1f2530;padding:0 0 80px!important;max-width:none!important;box-sizing:border-box}',
      V + ' *{box-sizing:border-box}',
      V + ' .ss-haus{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:14px;min-height:64px;padding:8px 22px 8px 26px;background:' + METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);color:#fff}',
      V + ' .ss-haus::before,' + V + ' .ss-haus::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      V + ' .ss-haus::before{left:9px}' + V + ' .ss-haus::after{right:9px}',
      V + ' .ss-tt{font-family:' + DISP + ';font-weight:800;font-size:26px;line-height:1;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      V + ' .ss-st{font-family:' + MONO + ';font-size:11px;color:#aab2c0;margin-top:5px;letter-spacing:.04em}',
      V + ' .ss-tala{margin-left:auto;display:flex;align-items:baseline;gap:8px}',
      V + ' .ss-tala b{font-family:' + DISP + ';font-weight:800;font-size:34px;line-height:1;color:#fff;font-variant-numeric:lining-nums}',
      V + ' .ss-tala span{font-family:' + DISP + ';font-weight:700;font-size:15px;color:#cfd5de}',
      V + ' .ss-stika{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:14px 22px 0}',
      V + ' .ss-flipi{height:40px;padding:0 14px;border-radius:9px;font:600 13.5px ' + SANS + ';cursor:pointer;background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530}',
      V + ' .ss-flipi[aria-pressed="true"]{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)}',
      V + ' .ss-flipi small{font-family:' + MONO + ';font-size:11px;margin-left:6px;opacity:.75}',
      V + ' .ss-leit{margin-left:auto;width:260px;max-width:100%;height:40px;padding:0 12px;border-radius:8px;background:#eef1f6;border:1px solid rgba(20,24,34,.14);box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font:13px ' + SANS + ';color:#141822}',
      V + ' .ss-sia{display:flex;flex-wrap:wrap;gap:6px;padding:10px 22px 0}',
      V + ' .ss-plata{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font:700 10.5px ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap}',
      V + ' button.ss-plata{cursor:pointer}',
      V + ' .ss-plata[aria-pressed="true"],' + V + ' .ss-plata._dokk{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#eef1f4}',
      V + ' .ss-plata._radd{color:#8f1d13}',
      V + ' .ss-plata._ok{color:#0b6b3a}',
      V + ' .ss-skyring{margin:12px 22px 0;padding:10px 14px;background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);font-size:13px;line-height:1.5;color:#3a4250}',
      V + ' .ss-skyring b{color:#141822}',
      V + ' .ss-plotu{margin:14px 22px 0;padding:12px 12px 16px;border-radius:14px;border:1px solid #000;background:#cfd5de;background-image:' + STAL_IMG + ';box-shadow:0 10px 30px -10px rgba(10,14,22,.45)}',
      V + ' .ss-grind{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px;align-items:start}',
      V + ' .ss-spjald{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);overflow:hidden;min-width:0;display:flex;flex-direction:column}',
      V + ' .ss-sh{position:relative;background:' + METAL + ';padding:5px 16px 5px 20px;min-height:46px;color:#fff;display:flex;align-items:center;gap:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000;cursor:pointer;width:100%;border-left:0;border-right:0;border-top:0;text-align:left;font:inherit}',
      V + ' .ss-sh::before,' + V + ' .ss-sh::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      V + ' .ss-sh::before{left:7px}' + V + ' .ss-sh::after{right:7px}',
      V + ' .ss-sh .t{font:600 15px ' + SANS + ';color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + ' .ss-sh .ss-plata{margin-left:auto}',
      V + ' .ss-buk{padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px}',
      V + ' .ss-lina{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px;align-items:baseline;font-size:13px;line-height:1.45}',
      V + ' .ss-k{font:700 10.5px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#525b6b}',
      V + ' .ss-v{color:#141822;min-width:0;word-break:break-word}',
      V + ' .ss-v .m{font-family:' + MONO + ';font-size:12px;color:#3a4250}',
      V + ' .ss-texti{margin:0;padding:10px 12px;background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);font:12.5px/1.5 ' + MONO + ';color:#1f2530;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto}',
      V + ' .ss-spjald._opid .ss-texti{max-height:none}',
      V + ' .ss-texti .br{display:inline-block;padding:0 4px;border-radius:3px;background:#eef1f6;border:1px solid rgba(20,24,34,.16);color:#6c0d10;font-weight:700}',
      V + ' .ss-listi{margin:0;padding:0 0 0 18px;font-size:13px;line-height:1.5;color:#1f2530}',
      V + ' .ss-listi li{margin:2px 0}',
      V + ' .ss-heim{font:11px ' + MONO + ';color:#6b7483}',
      V + ' .ss-skrar{display:flex;flex-direction:column;gap:2px;font:12px ' + MONO + ';color:#3a4250}',
      V + ' .ss-regla{border-top:1px dashed rgba(20,24,34,.18);padding-top:10px}',
      V + ' .ss-regla textarea{display:block;width:100%;min-height:64px;padding:10px 12px;border-radius:8px;background:#eef1f6;border:1px solid rgba(20,24,34,.14);box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font:13px/1.45 ' + SANS + ';color:#141822;resize:vertical}',
      V + ' .ss-regla textarea._villa{border-color:#b42318;box-shadow:inset 0 2px 5px rgba(0,0,0,.18),0 0 0 2px rgba(180,35,24,.35)}',
      V + ' .ss-vist{display:block;margin-top:5px;font:11px ' + MONO + ';color:#6b7483;min-height:15px}',
      V + ' .ss-takki{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:9px;font:600 13px ' + SANS + ';cursor:pointer;text-decoration:none;background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530}',
      V + ' .ss-takkar{display:flex;flex-wrap:wrap;gap:6px}',
      V + ' .ss-tafla{width:100%;min-width:0;border-collapse:separate;border-spacing:0;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);overflow:hidden;font-size:13px}',
      V + ' .ss-tafla th{background:' + METAL + ';color:#cfd5de;font:700 10.5px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:9px 8px}',
      V + ' .ss-tafla td{padding:9px 8px;border-top:1px solid rgba(20,24,34,.08);vertical-align:top;line-height:1.45}',
      V + ' .ss-tafla td b{font-weight:700;color:#141822}',
      V + ' .ss-tafla td .u{display:block;font-size:11.5px;color:#6b7483;margin-top:2px}',
      V + ' .ss-tafla ol{margin:0;padding-left:18px}',
      V + ' .ss-tomt{padding:22px;text-align:center;font-size:14px;color:#525b6b}',
      V + ' .ss-falid{display:none!important}',
      '@media (max-width:760px){' +
        V + ' .ss-grind{grid-template-columns:minmax(0,1fr)}' +
        V + ' .ss-haus{padding:8px 16px 8px 20px}' + V + ' .ss-tt{font-size:22px}' + V + ' .ss-tala b{font-size:26px}' +
        V + ' .ss-stika,' + V + ' .ss-sia{padding-left:12px;padding-right:12px}' +
        V + ' .ss-plotu,' + V + ' .ss-skyring{margin-left:10px;margin-right:10px}' +
        V + ' .ss-leit{margin-left:0;width:100%}' +
        V + ' .ss-lina{grid-template-columns:minmax(0,1fr)}' +
        V + ' .ss-tafla,' + V + ' .ss-tafla tbody,' + V + ' .ss-tafla tr,' + V + ' .ss-tafla td{display:block;width:100%}' +
        V + ' .ss-tafla thead{display:none}' +
      '}',
    ].join('\n');
  }
  function injectCss() {
    if (document.getElementById('_ss447-css')) return;
    const st = document.createElement('style'); st.id = '_ss447-css'; st.textContent = css();
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── TEIKNING ──────────────────────────────────────────────────────────── */
  // {breyta} í sniðmáti verður að lítilli plötu svo sjáist hvað fyllist inn.
  const snidmat = (t) => esc(t).replace(/\{([^{}\n]{1,40})\}/g, '<span class="br">{$1}</span>');
  const RASIR = { postur: 'Póstur', payday: 'Payday', pdf: 'PDF / skýrsla', svar: 'Póstsvar', skjar: 'Á skjá / afrit', annad: 'Annað' };
  const STADA = { fast: ['Fast í kóða', ''], stillanlegt: ['Stillanlegt', '_ok'], ai: ['Gervigreind', ''], handvirkt: ['Handskrifað', ''], ovirkt: ['Óvirkt', '_radd'] };

  function leidHtml(L) {
    const r = reglaAf(L.id), op = opin.has(L.id), st = STADA[L.stada] || [L.stada || '', ''];
    const linur = [
      ['Hvaðan', L.hvadan], ['Hvert', L.hvert], ['Sendir', L.sendir], ['Breytur', L.breytur]
    ].filter((x) => x[1]).map((x) => '<div class="ss-lina"><span class="ss-k">' + x[0] + '</span><span class="ss-v">' + esc(x[1]) + '</span></div>').join('');
    const textar = (L.textar || []).map((t) => '<div><div class="ss-k" style="margin-bottom:4px">' + esc(t.heiti || 'Texti') + '</div><pre class="ss-texti">' + snidmat(t.t) + '</pre></div>').join('');
    const skrar = (L.skrar || []).length ? '<div class="ss-lina"><span class="ss-k">Skráður</span><span class="ss-skrar">' + L.skrar.map((s) => '<span>' + esc(s) + '</span>').join('') + '</span></div>' : '';
    const reglur = (L.reglur || []).length ? '<div><div class="ss-k" style="margin-bottom:4px">Reglur sem gilda</div><ul class="ss-listi">' + L.reglur.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '';
    const athuga = (L.athuga || []).length ? '<div><div class="ss-k" style="margin-bottom:4px;color:#8f1d13">Athugið</div><ul class="ss-listi">' + L.athuga.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '';
    const fara = L.fara ? '<div class="ss-takkar"><a class="ss-takki" href="#' + esc(L.fara) + '" data-ss="fara" data-v="' + esc(L.fara) + '">Opna ' + esc(L.faraHeiti || 'síðuna') + '</a></div>' : '';
    const vist = r.t ? (r.aLeid ? 'Vista…' : (r.kl ? 'Vistað ' + dags(r.kl) + (r.af ? ' · ' + r.af : '') : '')) : 'Ekkert skráð enn';
    return '<article class="ss-spjald' + (op ? ' _opid' : '') + '" data-ss-leid="' + esc(L.id) + '" data-ras="' + esc(L.ras || 'annad') + '">' +
      '<button type="button" class="ss-sh" data-ss="opna" data-v="' + esc(L.id) + '" aria-expanded="' + op + '"><span class="t">' + esc(L.heiti) + '</span>' +
        '<span class="ss-plata ' + st[1] + '">' + esc(st[0]) + '</span></button>' +
      '<div class="ss-buk">' + linur + textar + skrar + reglur + athuga + fara +
        '<div class="ss-regla"><div class="ss-k" style="margin-bottom:4px">Þín regla eða orðalag</div>' +
          '<textarea data-ss-regla="' + esc(L.id) + '" data-saved="' + esc(r.t) + '" placeholder="T.d. „alltaf ‚Góðan dag‘, aldrei ‚Sæl/l‘" eða hvernig textinn á að hljóma — Claude og agentarnir lesa þetta áður en þeir skrifa.">' + esc(r.t) + '</textarea>' +
          '<span class="ss-vist">' + esc(vist) + '</span></div>' +
      '</div></article>';
  }

  function passar(L) {
    if (rasSia !== 'allt' && L.ras !== rasSia) return false;
    if (!leit) return true;
    const h = [L.heiti, L.hvadan, L.hvert, L.sendir, (L.textar || []).map((t) => t.t).join(' '), (L.reglur || []).join(' '), (L.skrar || []).join(' ')].join(' ').toLowerCase();
    return leit.toLowerCase().split(/\s+/).filter(Boolean).every((o) => h.indexOf(o) >= 0);
  }

  function flipiLeidir() {
    const talning = {};
    DATA.leidir.forEach((L) => { talning[L.ras] = (talning[L.ras] || 0) + 1; });
    const sia = '<div class="ss-sia" role="group" aria-label="Sía eftir rás">' +
      [['allt', 'Allar', DATA.leidir.length]].concat(Object.keys(RASIR).filter((k) => talning[k]).map((k) => [k, RASIR[k], talning[k]]))
        .map((x) => '<button type="button" class="ss-plata" data-ss="sia" data-v="' + x[0] + '" aria-pressed="' + (rasSia === x[0]) + '">' + esc(x[1]) + ' · ' + x[2] + '</button>').join('') + '</div>';
    const sk = '<div class="ss-skyring"><b>Hvernig þetta virkar.</b> Hvert spjald er ein leið sem texti fer úr kerfinu. ' +
      'Það sýnir hvaðan hann er sendur, textann sjálfan með breytunum (rauðu reitirnir fyllast sjálfkrafa), hvar hann er skráður í kóðanum og hvaða reglur gilda. ' +
      'Í reitinn <b>Þín regla eða orðalag</b> skrifar þú hvernig textinn á að vera — það vistast á þjóninum strax og allar vélar sjá það. ' +
      'Claude og agentarnir (Sara, sala-reikningar, rukkari) lesa það áður en þeir skrifa. Sjálfvirku sendingarnar breytast ekki fyrr en þú samþykkir það sérstaklega.</div>';
    const listi = DATA.leidir.filter(passar);
    return sia + sk + '<div class="ss-plotu">' + (listi.length ? '<div class="ss-grind">' + listi.map(leidHtml).join('') + '</div>' : '<div class="ss-tomt">Engin leið passar við leitina.</div>') + '</div>';
  }

  function flipiUttekt() {
    const U = DATA.uttekt;
    if (!U) return '<div class="ss-plotu"><div class="ss-tomt">Ekkert kortlagt.</div></div>';
    const hluti = (h) => '<article class="ss-spjald"><div class="ss-sh" style="cursor:default"><span class="t">' + esc(h.heiti) + '</span>' + (h.plata ? '<span class="ss-plata">' + esc(h.plata) + '</span>' : '') + '</div><div class="ss-buk">' +
      (h.texti ? '<div style="font-size:13px;line-height:1.5">' + esc(h.texti) + '</div>' : '') +
      (h.daemi ? h.daemi.map((d) => '<div><div class="ss-k" style="margin-bottom:4px">' + esc(d.heiti || 'Dæmi') + '</div><pre class="ss-texti">' + snidmat(d.t) + '</pre></div>').join('') : '') +
      (h.listi ? '<ul class="ss-listi">' + h.listi.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      (h.skrar ? '<div class="ss-lina"><span class="ss-k">Skráður</span><span class="ss-skrar">' + h.skrar.map((s) => '<span>' + esc(s) + '</span>').join('') + '</span></div>' : '') +
      (h.regla ? '<div class="ss-regla"><div class="ss-k" style="margin-bottom:4px">Þín regla eða orðalag</div><textarea data-ss-regla="' + esc(h.regla) + '" data-saved="' + esc(reglaAf(h.regla).t) + '" placeholder="Hvernig á úttektarlýsingin að hljóma? Sara les þetta áður en hún skrifar.">' + esc(reglaAf(h.regla).t) + '</textarea><span class="ss-vist">' + esc(reglaAf(h.regla).t ? (reglaAf(h.regla).kl ? 'Vistað ' + dags(reglaAf(h.regla).kl) : '') : 'Ekkert skráð enn') + '</span></div>' : '') +
      '</div></article>';
    return '<div class="ss-skyring">' + esc(U.inngangur || '') + '</div><div class="ss-plotu"><div class="ss-grind">' + (U.hlutar || []).map(hluti).join('') + '</div></div>';
  }

  function flipiBeidnir() {
    const rows = DATA.beidnir.map((b) => '<tr><td><b>' + esc(b.tegund) + '</b>' + (b.merki ? '<span class="u">' + esc(b.merki) + '</span>' : '') + '</td>' +
      '<td><ol>' + (b.skref || []).map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol></td>' +
      '<td>' + esc(b.texti || '—') + (b.leid ? '<span class="u">Sendileið: ' + esc(b.leid) + '</span>' : '') + '</td>' +
      '<td>' + esc(b.hver || '') + '</td></tr>').join('');
    return '<div class="ss-skyring"><b>Verk við beiðnir.</b> Hvað þarf að gera þegar beiðni af hverri tegund kemur inn á Þjónustuborðið — skrefin, hvaða texti fer út í lokin og hver á verkið. Skrifaðu leiðréttingar í reitinn neðst; þær vistast á þjóninum.</div>' +
      '<div class="ss-plotu"><table class="ss-tafla"><thead><tr><th style="width:18%">Tegund</th><th>Hvað þarf að gera</th><th style="width:24%">Texti sem fer út</th><th style="width:12%">Hver</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="ss-spjald" style="margin-top:12px"><div class="ss-buk"><div class="ss-regla" style="border-top:0;padding-top:0"><div class="ss-k" style="margin-bottom:4px">Leiðréttingar og viðbætur við verkferlin</div>' +
      '<textarea data-ss-regla="beidnir" data-saved="' + esc(reglaAf('beidnir').t) + '" placeholder="T.d. „Tilboðsbeiðni: alltaf hringja innan sólarhrings“">' + esc(reglaAf('beidnir').t) + '</textarea><span class="ss-vist">' + esc(reglaAf('beidnir').t ? (reglaAf('beidnir').kl ? 'Vistað ' + dags(reglaAf('beidnir').kl) : '') : 'Ekkert skráð enn') + '</span></div></div></div></div>';
  }

  function flipiReglur() {
    return '<div class="ss-skyring"><b>Allar reglurnar á einum stað.</b> Safnað úr Söru (úttektarskýrslur), sala-reikningar, Charlize-minninu og REIKNINGALOTA. Heimildin stendur við hverja reglu.</div>' +
      '<div class="ss-plotu"><div class="ss-grind">' + DATA.reglur.map((h) => '<article class="ss-spjald"><div class="ss-sh" style="cursor:default"><span class="t">' + esc(h.heiti) + '</span><span class="ss-plata">' + h.reglur.length + '</span></div><div class="ss-buk"><ul class="ss-listi">' +
        h.reglur.map((x) => '<li>' + esc(x.t) + (x.heim ? ' <span class="ss-heim">— ' + esc(x.heim) + '</span>' : '') + '</li>').join('') + '</ul></div></article>').join('') + '</div></div>';
  }

  function flipiOsamraemi() {
    if (!DATA.osamraemi.length) return '<div class="ss-plotu"><div class="ss-tomt">Ekkert ósamræmi fannst.</div></div>';
    return '<div class="ss-skyring"><b>Þar sem textinn segir sitt hvað.</b> Sami hlutur skrifaður á mismunandi hátt eftir því hvaða takki sendir hann, eða reglur sem stangast á. Hvert atriði þarf ákvörðun — skrifaðu hana í reitinn og ég samræmi.</div>' +
      '<div class="ss-plotu"><div class="ss-grind">' + DATA.osamraemi.map((o) => '<article class="ss-spjald"><div class="ss-sh" style="cursor:default"><span class="t">' + esc(o.heiti) + '</span><span class="ss-plata _radd">Ákvörðun</span></div><div class="ss-buk">' +
        '<div style="font-size:13px;line-height:1.5">' + esc(o.lysing) + '</div>' +
        (o.daemi ? o.daemi.map((d) => '<div><div class="ss-k" style="margin-bottom:4px">' + esc(d.heiti) + '</div><pre class="ss-texti">' + snidmat(d.t) + '</pre></div>').join('') : '') +
        '<div class="ss-regla"><div class="ss-k" style="margin-bottom:4px">Þín ákvörðun</div><textarea data-ss-regla="' + esc('osamraemi.' + o.id) + '" data-saved="' + esc(reglaAf('osamraemi.' + o.id).t) + '" placeholder="Hvor á að gilda?">' + esc(reglaAf('osamraemi.' + o.id).t) + '</textarea><span class="ss-vist">' + esc(reglaAf('osamraemi.' + o.id).t ? 'Vistað' : 'Ekkert skráð enn') + '</span></div>' +
        '</div></article>').join('') + '</div></div>';
  }

  const erAdSkrifa = () => { const a = document.activeElement; return !!(a && a.closest && a.closest('#' + VIEW_ID) && /^(TEXTAREA|INPUT)$/.test(a.tagName)); };
  let _bidur = false;
  function teikna() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    // Reitur sem verið er að skrifa í er aldrei rifinn undan — teiknað þegar fókusinn fer (focusout).
    if (erAdSkrifa()) { _bidur = true; return; }
    _bidur = false;
    const root = v.querySelector('#_ss447-root');
    const tal = { leidir: DATA.leidir.length, uttekt: DATA.uttekt && DATA.uttekt.hlutar ? DATA.uttekt.hlutar.length : 0, beidnir: DATA.beidnir.length, reglur: DATA.reglur.reduce((s, h) => s + h.reglur.length, 0), osamraemi: DATA.osamraemi.length };
    const efni = flipi === 'uttekt' ? flipiUttekt() : flipi === 'beidnir' ? flipiBeidnir() : flipi === 'reglur' ? flipiReglur() : flipi === 'osamraemi' ? flipiOsamraemi() : flipiLeidir();
    const html = '<header class="ss-haus"><div><div class="ss-tt">Svar-stöð</div><div class="ss-st">Hvernig hver texti úr kerfinu verður til · kortlagt ' + KORTLAGT + '</div></div>' +
        '<div class="ss-tala"><b>' + DATA.leidir.length + '</b><span>sendileiðir</span></div></header>' +
      '<div class="ss-stika" role="tablist">' + FLIPAR.map((f) => '<button type="button" class="ss-flipi" role="tab" data-ss="flipi" data-v="' + f[0] + '" aria-pressed="' + (flipi === f[0]) + '">' + f[1] + '<small>' + tal[f[0]] + '</small></button>').join('') +
        (flipi === 'leidir' ? '<input type="search" class="ss-leit" data-ss-leit placeholder="Leita í texta, takka eða skrá" value="' + esc(leit) + '" aria-label="Leita">' : '') + '</div>' +
      efni;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(root) : null;
    if (root._h !== html) { root.innerHTML = html; root._h = html; }
    if (aftur) aftur();
  }

  /* ── ATBURÐIR ──────────────────────────────────────────────────────────── */
  const _tafir = new Map();
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID; v.className = 'view'; v.style.display = 'none';
    v.innerHTML = '<div id="_ss447-root"></div>';
    v.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ss]'); if (!b) return;
      const a = b.dataset.ss, val = b.dataset.v;
      if (a === 'flipi') { flipi = val; try { localStorage.setItem('svarstod_flipi', val); } catch (_) {} teikna(); window.scrollTo(0, 0); return; }
      if (a === 'sia') { rasSia = val; teikna(); return; }
      if (a === 'opna') { if (opin.has(val)) opin.delete(val); else opin.add(val); teikna(); return; }
      if (a === 'fara') { e.preventDefault(); if (window.App && App.switchView) App.switchView(val); else location.hash = '#' + val; }
    });
    v.addEventListener('input', (e) => {
      const ta = e.target.closest('textarea[data-ss-regla]');
      if (ta) {
        const id = ta.dataset.ssRegla;
        clearTimeout(_tafir.get(id));
        _tafir.set(id, setTimeout(() => vista(ta), 900));
        const st = ta.closest('.ss-regla') && ta.closest('.ss-regla').querySelector('.ss-vist');
        if (st) st.textContent = 'Óvistað…';
        return;
      }
      const s = e.target.closest('[data-ss-leit]');
      if (s) { leit = s.value; clearTimeout(_tafir.get('_leit')); _tafir.set('_leit', setTimeout(() => { const pos = s.selectionStart; s.blur(); teikna(); const n = document.querySelector('#' + VIEW_ID + ' [data-ss-leit]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } }, 250)); }
    });
    v.addEventListener('focusout', (e) => {
      const ta = e.target.closest && e.target.closest('textarea[data-ss-regla]');
      if (ta) { clearTimeout(_tafir.get(ta.dataset.ssRegla)); vista(ta); }
      setTimeout(() => { if (_bidur && !erAdSkrifa()) teikna(); }, 0);
    });
    const ankeri = document.querySelector('.view');
    (ankeri && ankeri.parentNode ? ankeri.parentNode : document.body).appendChild(v);
    return v;
  }

  function opna() { injectCss(); ensureView(); teikna(); }
  function navTakki() {
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return true;
    const sib = document.querySelector('[data-view="stjornstod"]') || document.querySelector('[data-view="settings"]') || document.querySelector('[data-view]');
    if (!sib) return false;
    const b = sib.cloneNode(true);
    b.dataset.view = NAV_KEY;
    b.classList.remove('active');
    const sp = b.querySelector('span:not([class*="icon"]):not([class*="badge"])');
    if (sp) sp.textContent = 'Svar-stöð';
    else for (const c of b.childNodes) if (c.nodeType === 3 && c.nodeValue.trim()) { c.nodeValue = ' Svar-stöð'; break; }
    b.querySelectorAll('.count,.badge,[class*="badge"],[class*="count"]').forEach((n) => n.remove());
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); });
    sib.parentNode.insertBefore(b, sib.nextSibling);
    return true;
  }
  function hookSwitch() {
    if (!window.App || !App.switchView) return false;
    if (App.__svarstodPatched) return true;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach((x) => { x.style.display = 'none'; x.classList.remove('active'); });
        const el = ensureView();
        el.style.display = 'block'; el.classList.add('active');
        document.querySelectorAll('.vnav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
        opna();
        try { history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
        return;
      }
      const me = document.getElementById(VIEW_ID);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      const r = orig(k);
      try {
        if (typeof k === 'string' && location.hash.replace('#', '') === NAV_KEY) {
          const slug = (window.UrlRouting && UrlRouting.slugForView) ? UrlRouting.slugForView(k) : k;
          history.replaceState(null, '', '#' + slug);
        }
      } catch (_) {}
      return r;
    };
    App.__svarstodPatched = true;
    return true;
  }
  let _tilraunir = 0;
  function start() {
    // Síðan verður til STRAX, falin, svo djúptengill (#svarstod) og endurhleðsla finni hana (sbr. 419, 28.09.2026).
    if (document.querySelector('.view')) { injectCss(); ensureView(); }
    const ok = navTakki() & hookSwitch();
    if (!ok && ++_tilraunir < 40) { setTimeout(start, 300); return; }
    try {
      if (location.hash.replace('#', '') === NAV_KEY) {
        const el = document.getElementById(VIEW_ID);
        if (!el || !el.classList.contains('active')) App.switchView(NAV_KEY);
      }
    } catch (_) {}
    window.addEventListener('hashchange', () => { if (location.hash.replace('#', '') === NAV_KEY && window.App && App.switchView) App.switchView(NAV_KEY); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.Svarstod = { opna: () => (window.App && App.switchView ? App.switchView(NAV_KEY) : opna()), teikna, regla: (id) => reglaAf(id).t, gogn: DATA, version: '447' };
  console.log('[447] Svar-stöð');
})();
/* === END SVAR-STÖÐ === */
