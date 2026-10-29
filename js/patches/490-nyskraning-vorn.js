/* Patch 490 — Nýskráning: kennitala sem er til er aldrei tvískráð + skýr leið til að bæta við stað.
 *
 * Krókur 77 (29.10.2026): „Nýtt fyrirtæki" bjó til röð sem er ekki í þjónustu, hún sást ekki í
 * Ársskoðun, og „Nýr í þjónustu" bjó þá til aðra röð á sömu kennitölu og sama nafni. Ekkert stoppaði
 * það — einkvæmi vísirinn (kt, stadur_nr) gildir ekki þegar stadur_nr er tómt.
 *
 * Reglan núna: kennitala sem er til í kerfinu er NOTUÐ. Vilji notandinn nýjan verkstað á sömu
 * kennitölu er það sér, skýr aðgerð („Nýr staður") sem sýnir staðina sem eru til og varar við
 * heimilisfangi sem er þegar skráð. Aldrei hindrun: leitarvilla gefur val (reyna aftur / vista samt).
 *
 *   NyskraningVorn.athuga({kt,nafn,heimilisfang,simi,netfang,tengilidur,mode,sleppa})
 *        → null              ekkert til á þessari kt (eða notandi valdi „vista samt") — kallari vistar eins og áður
 *        → {cancel:true}     notandi hætti við — kallari vistar EKKI og lætur formið standa opið
 *        → {row,hvernig}     'reuse' | 'site' — röðin er þegar vistuð, kallari má EKKI setja inn nýja
 *   NyskraningVorn.nyrStadur({kennitala,felagsnafn,customer_base_id,thjonusta,rows?,heimilisfang?}) → röð | null
 *   Companies.nyrStadur(id)   hnappurinn „＋ Nýr staður" á fyrirtækjaprófílnum
 */
(function () {
  'use strict';
  if (window.NyskraningVorn && window.NyskraningVorn.__v) return;

  const WALKIN = '9999999999';
  const COLS = 'id,nafn,kennitala,heimilisfang,simi,netfang,tengiliður,er_i_thjonustu,stadur_nr,customer_base_id,status';

  const SB = () => (window.DB && window.DB.sb) || null;
  const digits = (s) => String(s == null ? '' : s).replace(/\D/g, '');
  const dash = (d) => (d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d);
  const trim = (s) => String(s == null ? '' : s).trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const norm = (s) => trim(s).toLowerCase().replace(/[.,;]+/g, ' ').replace(/\s+/g, ' ').trim();
  const ktOr = (d) => 'kennitala.eq.' + dash(d) + ',kennitala.eq.' + d;

  function toast(m) {
    try { if (window.Toast && Toast.show) { Toast.show(m); return; } } catch (_) {}
    try { console.log('[490]', m); } catch (_) {}
  }
  function problem(kind, detail) {
    try { if (typeof window.logProblem === 'function') window.logProblem(kind, String(detail || '')); } catch (_) {}
    try { console.warn('[490]', kind, detail); } catch (_) {}
  }

  // Heimilisfang: sama gata + númer. Greining451 þekkir fall/þágufall (Hjallahraun/Hjallahrauni).
  function gata(s) { return norm(String(s || '').split(',')[0]); }
  function sama(a, b) {
    const x = gata(a), y = gata(b);
    if (!x || !y) return false;
    if (x === y) return true;
    try { if (window.Greining451 && typeof Greining451.samaHeimili === 'function') return !!Greining451.samaHeimili(a, b); } catch (_) {}
    return false;
  }
  function grunnNafn(n) { return trim(String(n || '').replace(/\s*[-–—].*$/, '')) || trim(n); }

  // ── Leit ───────────────────────────────────────────────────────────────
  async function finnaKt(kt) {
    const d = digits(kt);
    if (d.length !== 10 || d === WALKIN) return { rows: [] };
    const c = SB();
    if (!c) return { error: 'Engin gagnagrunnstenging' };
    try {
      const r = await c.from('fyrirtaeki').select(COLS).or(ktOr(d)).is('deleted_at', null).order('id', { ascending: true });
      if (r.error) return { error: r.error.message || String(r.error) };
      return { rows: r.data || [] };
    } catch (e) {
      return { error: (e && e.message) || String(e) };
    }
  }

  // ── Útlit ──────────────────────────────────────────────────────────────
  function ensureCss() {
    if (document.getElementById('nv-css')) return;
    const st = document.createElement('style');
    st.id = 'nv-css';
    st.textContent =
      '.nv-bg{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding:28px 12px;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
      '.nv-box{background:#fff;color:#0f172a;border-radius:14px;max-width:540px;width:100%;padding:18px 18px 16px;box-shadow:0 20px 50px rgba(0,0,0,.35);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;box-sizing:border-box}' +
      '.nv-box h3{margin:0 0 4px;font-size:18px;line-height:1.25}' +
      '.nv-sub{margin:0 0 6px;color:#475569;font-size:13px}' +
      '.nv-note{padding:9px 11px;border-radius:9px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:13px;margin:8px 0}' +
      '.nv-note.warn{background:#fff7ed;border-color:#fdba74;color:#7c2d12}' +
      '.nv-row{border:1px solid #e2e8f0;border-radius:10px;padding:10px 11px;margin:8px 0}' +
      '.nv-row.same{border-color:#f59e0b;background:#fffbeb}' +
      '.nv-name{font-weight:700}' +
      '.nv-tag{display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;background:#e2e8f0;color:#334155;margin-left:6px;vertical-align:middle}' +
      '.nv-tag.on{background:#dcfce7;color:#166534}' +
      '.nv-addr{color:#475569;font-size:13px;margin:2px 0 8px}' +
      '.nv-btn{min-height:44px;padding:0 14px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font:inherit;font-weight:700;cursor:pointer}' +
      '.nv-btn.pri{background:#15803d;border-color:#15803d;color:#fff}' +
      '.nv-btn.blue{background:#eff6ff;border-color:#bfdbfe;color:#1e40af}' +
      '.nv-btn.warn{background:#b45309;border-color:#b45309;color:#fff}' +
      '.nv-btn[disabled]{opacity:.55;cursor:default}' +
      '.nv-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}' +
      '.nv-acts .nv-btn{flex:1 1 auto}' +
      '.nv-chk{display:flex;gap:7px;align-items:flex-start;font-size:13px;margin:4px 0 8px;cursor:pointer}' +
      '.nv-chk input{margin-top:3px}' +
      '.nv-box label.f{display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:700;text-transform:uppercase;color:#334155;margin:9px 0 0}' +
      '.nv-box input[type=text],.nv-box input[type=email],.nv-box input[type=tel]{padding:10px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:16px;text-transform:none;font-weight:400;color:#0f172a;background:#fff;width:100%;box-sizing:border-box}' +
      '.nv-err{color:#b91c1c;font-size:13px;margin-top:8px;display:none}' +
      '.nv-small{font-size:12.5px;color:#475569;margin:2px 0}';
    document.head.appendChild(st);
  }

  function opnaGlugga(html, label) {
    ensureCss();
    const bg = document.createElement('div');
    bg.className = 'nv-bg';
    bg.innerHTML = '<div class="nv-box" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + '</div>';
    document.body.appendChild(bg);
    return bg;
  }

  function lokaMed(bg, resolve, gildi, onKey) {
    return function () {
      try { document.removeEventListener('keydown', onKey, true); } catch (_) {}
      try { bg.remove(); } catch (_) {}
      resolve(gildi);
    };
  }

  function tagsHtml(r) {
    return (r.er_i_thjonustu === true ? '<span class="nv-tag on">Í þjónustu</span>' : '<span class="nv-tag">Ekki í þjónustu</span>') +
      (r.stadur_nr != null ? '<span class="nv-tag">nr. ' + esc(r.stadur_nr) + '</span>' : '');
  }

  // ── Gluggi 1: kennitalan er til ──────────────────────────────────────────
  function spyrjaUmKt(o, rows) {
    return new Promise((resolve) => {
      const nafnN = norm(o.nafn);
      const radir = rows.slice().sort((a, b) => ((norm(a.nafn) === nafnN ? 0 : 1) - (norm(b.nafn) === nafnN ? 0 : 1)) || (a.id - b.id));
      const sammaNafn = !!nafnN && radir.some((r) => norm(r.nafn) === nafnN);
      const dKt = dash(digits(o.kt));
      const html =
        '<h3>Kennitalan er þegar í kerfinu</h3>' +
        '<p class="nv-sub">kt. ' + esc(dKt) + '</p>' +
        (sammaNafn
          ? '<div class="nv-note warn"><b>Sama nafn og sama kennitala er þegar skráð</b> — þetta er líklega sami staðurinn. Notaðu það sem er til frekar en að stofna nýtt.</div>'
          : '<div class="nv-note">Notaðu fyrirtækið sem er til, eða bættu við <b>nýjum stað (verkstað)</b> undir sömu kennitölu.</div>') +
        radir.map((r) => {
          const samaR = !!nafnN && norm(r.nafn) === nafnN;
          const munur = !!trim(o.heimilisfang) && !!trim(r.heimilisfang) && !sama(o.heimilisfang, r.heimilisfang);
          const mark = (o.mode === 'thjonusta' && r.er_i_thjonustu !== true) ? 'Nota þetta og setja í þjónustu' : (o.mode === 'thjonusta' ? 'Opna þetta fyrirtæki' : 'Nota þetta fyrirtæki');
          return '<div class="nv-row' + (samaR ? ' same' : '') + '">' +
            '<div><span class="nv-name">' + esc(r.nafn || '(án nafns)') + '</span>' + tagsHtml(r) + '</div>' +
            '<div class="nv-addr">' + (trim(r.heimilisfang) ? esc(r.heimilisfang) : 'Ekkert heimilisfang skráð') + '</div>' +
            (munur ? '<label class="nv-chk"><input type="checkbox" data-adr="' + esc(r.id) + '"' + (samaR ? ' checked' : '') + '> Uppfæra heimilisfang þessa staðar í „' + esc(o.heimilisfang) + '“</label>' : '') +
            '<button type="button" class="nv-btn ' + (samaR ? 'pri' : 'blue') + '" data-nota="' + esc(r.id) + '" style="width:100%">' + esc(mark) + '</button>' +
          '</div>';
        }).join('') +
        '<div class="nv-acts">' +
          '<button type="button" class="nv-btn" data-stadur="1">＋ Bæta við nýjum stað á þessari kennitölu</button>' +
          '<button type="button" class="nv-btn" data-haetta="1">Hætta við</button>' +
        '</div>';
      const bg = opnaGlugga(html, 'Kennitalan er þegar í kerfinu');
      let onKey;
      const klara = (gildi) => lokaMed(bg, resolve, gildi, onKey)();
      onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); klara({ action: 'haetta' }); } };
      document.addEventListener('keydown', onKey, true);
      bg.addEventListener('click', (e) => {
        if (e.target === bg) { klara({ action: 'haetta' }); return; }
        const nota = e.target.closest('[data-nota]');
        if (nota) {
          const id = nota.getAttribute('data-nota');
          const row = rows.find((r) => String(r.id) === String(id));
          const cb = bg.querySelector('input[data-adr="' + id + '"]');
          klara({ action: 'nota', row, uppfaera: !!(cb && cb.checked) });
          return;
        }
        if (e.target.closest('[data-stadur]')) { klara({ action: 'stadur' }); return; }
        if (e.target.closest('[data-haetta]')) { klara({ action: 'haetta' }); }
      });
      const fyrsta = bg.querySelector('[data-nota]');
      if (fyrsta) { try { fyrsta.focus(); } catch (_) {} }
    });
  }

  function spyrjaUmLeitarvillu(villa) {
    return new Promise((resolve) => {
      const html =
        '<h3>Gat ekki athugað kennitöluna</h3>' +
        '<div class="nv-note warn">Ekki tókst að fletta upp hvort kennitalan er þegar skráð. Ef þú vistar núna gæti orðið til tvítekið fyrirtæki.<div class="nv-small">' + esc(villa) + '</div></div>' +
        '<div class="nv-acts">' +
          '<button type="button" class="nv-btn pri" data-aftur="1">Reyna aftur</button>' +
          '<button type="button" class="nv-btn" data-samt="1">Vista samt</button>' +
          '<button type="button" class="nv-btn" data-haetta="1">Hætta við</button>' +
        '</div>';
      const bg = opnaGlugga(html, 'Gat ekki athugað kennitöluna');
      let onKey;
      const klara = (gildi) => lokaMed(bg, resolve, gildi, onKey)();
      onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); klara('haetta'); } };
      document.addEventListener('keydown', onKey, true);
      bg.addEventListener('click', (e) => {
        if (e.target === bg) { klara('haetta'); return; }
        if (e.target.closest('[data-aftur]')) { klara('aftur'); return; }
        if (e.target.closest('[data-samt]')) { klara('samt'); return; }
        if (e.target.closest('[data-haetta]')) { klara('haetta'); }
      });
    });
  }

  // Leit með villuvörn — ein leið fyrir ALLAR skráningarleiðir. Leitarvilla → reyna aftur / vista samt / hætta við.
  // Skilar {rows} | {cancel:true} | {rows:[], sleppt:true} („vista samt": kallari vistar eins og áður).
  async function leitaKt(kt) {
    const d = digits(kt);
    if (d.length !== 10 || d === WALKIN) return { rows: [] };
    let r = await finnaKt(d);
    while (r.error) {
      problem('nyskraning_vorn_leit', r.error);
      const val = await spyrjaUmLeitarvillu(r.error);
      if (val === 'aftur') { r = await finnaKt(d); continue; }
      if (val === 'samt') return { rows: [], sleppt: true };
      return { cancel: true };
    }
    return { rows: r.rows };
  }

  // ── Nota röð sem er til ───────────────────────────────────────────────────
  async function laeraBase(c, row, gamliHeimilisfang, nyttHeimilisfang) {
    // base-heimilisfangið fylgir staðnum aðeins ef það var eins og gamla heimilisfang staðarins (eða tómt).
    try {
      if (!row.customer_base_id) return;
      const b = await c.from('customers_base').select('id,heimilisfang').eq('id', row.customer_base_id).maybeSingle();
      const cur = trim(b && b.data && b.data.heimilisfang);
      if (b && b.data && (!cur || cur === trim(gamliHeimilisfang))) {
        const u = await c.from('customers_base').update({ heimilisfang: nyttHeimilisfang }).eq('id', row.customer_base_id);
        if (u && u.error) problem('nyskraning_vorn_base', u.error.message || u.error);
      }
    } catch (e) { problem('nyskraning_vorn_base', (e && e.message) || e); }
  }

  async function notaTilvist(row, o, opts) {
    const c = SB();
    if (!c) throw new Error('Engin gagnagrunnstenging');
    opts = opts || {};
    const upd = {};
    const fyll = (col, v) => { v = trim(v); if (v && !trim(row[col])) upd[col] = v; };
    fyll('simi', o.simi);
    fyll('netfang', o.netfang);
    fyll('tengiliður', o.tengilidur);
    const nyttHeim = trim(o.heimilisfang);
    if (nyttHeim && (!trim(row.heimilisfang) || (opts.uppfaeraHeimilisfang && !sama(nyttHeim, row.heimilisfang)))) upd.heimilisfang = nyttHeim;
    const settThj = !!opts.settIThjonustu && row.er_i_thjonustu !== true;
    if (settThj) upd.er_i_thjonustu = true;
    if (!Object.keys(upd).length) return row;
    const gamliHeim = trim(row.heimilisfang);
    const r = await c.from('fyrirtaeki').update(upd).eq('id', row.id).select().single();
    if (r.error) throw r.error;
    const nytt = r.data || Object.assign({}, row, upd);
    if (upd.heimilisfang) await laeraBase(c, row, gamliHeim, upd.heimilisfang);
    if (settThj) {
      try {
        const lg = await c.from('override_log').insert({ co_id: +row.id, co_nafn: row.nafn, field: 'er_i_thjonustu', old_value: 'false', new_value: 'true', page: 'nyskraning-vorn' });
        if (lg && lg.error) problem('nyskraning_vorn_log', lg.error.message || lg.error);
      } catch (_) {}
    }
    return nytt;
  }

  // ── Gluggi 2: nýr staður á sömu kennitölu ────────────────────────────────
  async function naestaNr(c, d) {
    // Engin deleted_at sía: einkvæmi vísirinn (kt, stadur_nr) nær líka yfir eyddar raðir.
    const q = await c.from('fyrirtaeki').select('stadur_nr').or(ktOr(d));
    if (q.error) throw q.error;
    const radir = q.data || [];
    let mx = 0;
    radir.forEach((x) => { const n = parseInt(x.stadur_nr, 10); if (Number.isFinite(n) && n > mx) mx = n; });
    // Staðir eru númeraðir frá 1 (24 kennitölur með fleiri en einn stað: 1,2,3…). Fyrsti staðurinn er „nr. 1" þótt hann sé
    // númerslaus (∅) — annars fengi annar staðurinn nr. 1 (∅,1), eins og tvífarinn á Krókur 77. Næsta nr er því aldrei
    // lægra en fjöldi staða + 1.
    return Math.max(mx, radir.length) + 1;
  }

  async function settaInnStad(d, gogn) {
    const c = SB();
    if (!c) throw new Error('Engin gagnagrunnstenging');
    let nr = await naestaNr(c, d);
    for (let i = 0; i < 4; i++) {
      // customer_base_id og kennitala skýrt með (audit-stofnleidir): base kemur úr röðunum á kt, annars tengir trigger fyrirtaeki_autolink_base.
      const r = await c.from('fyrirtaeki').insert(Object.assign({}, gogn, { stadur_nr: nr, kennitala: gogn.kennitala, customer_base_id: gogn.customer_base_id || null })).select().single();
      if (!r.error) return r.data;
      if (String(r.error.code) === '23505' || /duplicate key|unique/i.test(r.error.message || '')) { nr++; continue; }
      throw r.error;
    }
    throw new Error('Gat ekki fundið laust staðarnúmer');
  }

  function opnaProfil(id) {
    try { if (typeof window._openCompanySafe === 'function') { window._openCompanySafe(id); return; } } catch (_) {}
    try { if (window.Companies && Companies.openDetail) Companies.openDetail(id); } catch (_) {}
  }

  async function nyrStadur(ctx) {
    ctx = ctx || {};
    const d = digits(ctx.kennitala);
    if (d.length !== 10 || d === WALKIN) { toast('Fyrirtækið þarf kennitölu til að hægt sé að bæta við stað (Breyta → kennitala)'); return null; }
    let rows = Array.isArray(ctx.rows) ? ctx.rows : null;
    let leitarvilla = '';
    if (!rows) {
      const r = await finnaKt(d);
      rows = r.rows || [];
      if (r.error) leitarvilla = r.error;
    }
    const grunn = grunnNafn(ctx.felagsnafn || (rows[0] && rows[0].nafn) || '');
    const baseId = ctx.customer_base_id || ((rows.find((x) => x && x.customer_base_id) || {}).customer_base_id) || null;
    const stadirHtml = rows.length
      ? '<div class="nv-small"><b>Staðir sem eru þegar skráðir (' + rows.length + '):</b></div>' +
        rows.slice(0, 8).map((r) => '<div class="nv-small">• ' + esc(r.nafn || '') + ' — ' + (trim(r.heimilisfang) ? esc(r.heimilisfang) : 'ekkert heimilisfang') + tagsHtml(r) + '</div>').join('') +
        (rows.length > 8 ? '<div class="nv-small">… og ' + (rows.length - 8) + ' í viðbót</div>' : '')
      : '';
    return new Promise((resolve) => {
      const html =
        '<h3>＋ Nýr staður — ' + esc(grunn || 'fyrirtæki') + '</h3>' +
        '<p class="nv-sub">kt. ' + esc(dash(d)) + ' · sama rekstrarfélag. Staðurinn tengist sama greiðanda sjálfkrafa og fær næsta staðarnúmer.</p>' +
        (leitarvilla ? '<div class="nv-note warn">Gat ekki sótt staðina sem eru til (' + esc(leitarvilla) + ') — athugaðu heimilisfangið vel.</div>' : '') +
        stadirHtml +
        '<label class="f">Heimilisfang staðarins *<input type="text" id="nv-heim" autocomplete="off" placeholder="t.d. Suðurhella 5, 221 Hafnarfjörður"></label>' +
        '<div class="nv-note warn" id="nv-lik" style="display:none"></div>' +
        '<label class="f">Heiti staðar<input type="text" id="nv-nafn" autocomplete="off"></label>' +
        '<div class="nv-small">Heitið er „fyrirtæki - heimilisfang" svo staðirnir þekkist í sundur.</div>' +
        '<label class="f">Tengiliður<input type="text" id="nv-tengilidur" autocomplete="off"></label>' +
        '<label class="f">Sími<input type="tel" id="nv-simi" autocomplete="off"></label>' +
        '<label class="f">Netfang<input type="email" id="nv-netfang" autocomplete="off"></label>' +
        '<label class="nv-chk" style="margin-top:10px"><input type="checkbox" id="nv-thj"' + (ctx.thjonusta ? ' checked' : '') + '> Setja staðinn strax í þjónustu</label>' +
        '<div class="nv-err" id="nv-err"></div>' +
        '<div class="nv-acts">' +
          '<button type="button" class="nv-btn pri" id="nv-vista">Vista nýjan stað</button>' +
          '<button type="button" class="nv-btn" id="nv-haetta">Hætta við</button>' +
        '</div>';
      const bg = opnaGlugga(html, 'Nýr staður');
      const $ = (sel) => bg.querySelector(sel);
      const heim = $('#nv-heim'), nafn = $('#nv-nafn'), lik = $('#nv-lik'), err = $('#nv-err'), vista = $('#nv-vista');
      if (ctx.heimilisfang) heim.value = ctx.heimilisfang;
      if (ctx.tengilidur) $('#nv-tengilidur').value = ctx.tengilidur;
      if (ctx.simi) $('#nv-simi').value = ctx.simi;
      if (ctx.netfang) $('#nv-netfang').value = ctx.netfang;
      let nafnHandvirkt = false;
      let likRaedur = [];
      const stuttHeim = (s) => trim(String(s || '').split(',')[0]);
      const uppfNafn = () => { if (!nafnHandvirkt) nafn.value = stuttHeim(heim.value) ? (grunn + ' - ' + stuttHeim(heim.value)) : grunn; };
      const uppfLik = () => {
        const h = trim(heim.value), n = norm(nafn.value);
        likRaedur = rows.filter((r) => (h && sama(h, r.heimilisfang)) || (n && norm(r.nafn) === n));
        if (likRaedur.length) {
          lik.style.display = 'block';
          lik.innerHTML = '<b>Þessi staður virðist þegar vera til:</b><br>' +
            likRaedur.map((r) => esc(r.nafn || '') + ' — ' + (trim(r.heimilisfang) ? esc(r.heimilisfang) : 'ekkert heimilisfang') + ' <button type="button" class="nv-btn blue" data-opna="' + esc(r.id) + '" style="min-height:34px;margin:4px 0 0 4px">Opna hann</button>').join('<br>');
          vista.textContent = 'Bæta við samt';
          vista.className = 'nv-btn warn';
        } else {
          lik.style.display = 'none';
          lik.innerHTML = '';
          vista.textContent = 'Vista nýjan stað';
          vista.className = 'nv-btn pri';
        }
      };
      uppfNafn(); uppfLik();
      heim.addEventListener('input', () => { uppfNafn(); uppfLik(); });
      nafn.addEventListener('input', () => { nafnHandvirkt = true; uppfLik(); });

      let onKey;
      const klara = (gildi) => lokaMed(bg, resolve, gildi, onKey)();
      onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); klara(null); } };
      document.addEventListener('keydown', onKey, true);
      $('#nv-haetta').addEventListener('click', () => klara(null));
      bg.addEventListener('click', (e) => {
        if (e.target === bg) { klara(null); return; }
        const op = e.target.closest('[data-opna]');
        if (op) { const id = +op.getAttribute('data-opna'); klara(null); opnaProfil(id); }
      });
      let upptekid = false;
      vista.addEventListener('click', async () => {
        if (upptekid) return;
        err.style.display = 'none';
        const h = trim(heim.value), n = trim(nafn.value);
        const nafnAdgreint = !!n && !rows.some((r) => norm(r.nafn) === norm(n));
        if (!h && !nafnAdgreint) {
          err.textContent = 'Skrifaðu heimilisfang eða sérstakt heiti staðar svo hann þekkist frá hinum stöðunum.';
          err.style.display = 'block';
          return;
        }
        if (!n) { err.textContent = 'Heiti staðar vantar.'; err.style.display = 'block'; return; }
        upptekid = true; vista.disabled = true; const fyrr = vista.textContent; vista.textContent = 'Vistar…';
        try {
          const gogn = { nafn: n, kennitala: dash(d), status: 'virkur', er_i_thjonustu: !!$('#nv-thj').checked, heimilisfang: h || null };
          if (baseId) gogn.customer_base_id = baseId;
          const tg = trim($('#nv-tengilidur').value), sm = trim($('#nv-simi').value), nf = trim($('#nv-netfang').value);
          if (tg) gogn['tengiliður'] = tg;
          if (sm) gogn.simi = sm;
          if (nf) gogn.netfang = nf;
          const row = await settaInnStad(d, gogn);
          klara(row);
        } catch (e) {
          problem('nyskraning_vorn_stadur', (e && e.message) || e);
          err.textContent = 'Vistun mistókst: ' + ((e && e.message) || e);
          err.style.display = 'block';
          upptekid = false; vista.disabled = false; vista.textContent = fyrr;
        }
      });
      setTimeout(() => { try { heim.focus(); } catch (_) {} }, 50);
    });
  }

  // ── Aðalfallið ──────────────────────────────────────────────────────────
  async function athuga(o) {
    o = o || {};
    if (o.sleppa) return null;
    const d = digits(o.kt);
    if (d.length !== 10 || d === WALKIN) return null;
    const lk = await leitaKt(d);
    if (lk.cancel) return { cancel: true };
    const r = { rows: lk.rows || [] };
    if (!r.rows.length) return null;
    const val = await spyrjaUmKt(o, r.rows);
    if (val.action === 'haetta') return { cancel: true };
    if (val.action === 'stadur') {
      const row = await nyrStadur({
        rows: r.rows, kennitala: dash(d), felagsnafn: o.nafn || r.rows[0].nafn,
        customer_base_id: (r.rows.find((x) => x && x.customer_base_id) || {}).customer_base_id || null,
        heimilisfang: o.heimilisfang, simi: o.simi, netfang: o.netfang, tengilidur: o.tengilidur,
        thjonusta: o.mode === 'thjonusta'
      });
      return row ? { row, hvernig: 'site' } : { cancel: true };
    }
    try {
      const row = await notaTilvist(val.row, o, { settIThjonustu: o.mode === 'thjonusta', uppfaeraHeimilisfang: val.uppfaera });
      return { row, hvernig: 'reuse' };
    } catch (e) {
      problem('nyskraning_vorn_nota', (e && e.message) || e);
      toast('Villa: ' + ((e && e.message) || e));
      return { cancel: true };
    }
  }

  // ── „Nýtt fyrirtæki" formið (features.js / fixcompanysave.js / 452) ───────────
  function uppfaeraListaOgOpna(row, melding, lokaForm) {
    try {
      if (window.Companies && Array.isArray(Companies.list)) {
        const i = Companies.list.findIndex((x) => x && +x.id === +row.id);
        if (i >= 0) Companies.list[i] = Object.assign({}, Companies.list[i], row); else Companies.list.push(row);
      }
    } catch (_) {}
    if (lokaForm) {
      try {
        if (window.Modal && Modal.close) Modal.close('modal-nyfyrirtaeki');
        else { const m = document.getElementById('modal-nyfyrirtaeki'); if (m) { m.classList.remove('open'); m.style.display = 'none'; } }
      } catch (_) {}
      ['nf-nafn', 'nf-kt', 'nf-simi', 'nf-netfang', 'nf-tengiliður', 'nf-heimilisfang', 'nf-athugasemdir'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
    }
    toast(melding);
    try { if (window.Companies && Companies.render) Companies.render(); } catch (_) {}
    setTimeout(() => { try { if (window.App && App.switchView) App.switchView('companies'); } catch (_) {} }, 200);
    setTimeout(() => opnaProfil(row.id), 500);
  }

  let nyttUpptekid = false;   // eitt „Nýtt fyrirtæki"-flæði í einu (tvísmellur, hnappur í athugasemd + Vista)
  // → true: kennitalan er til og notandinn valdi (nota / nýr staður / hætta við) — kallari vistar EKKI; false: vista eins og áður.
  async function medhondlaNyttForm() {
    const g = (id) => trim((document.getElementById(id) || {}).value);
    let res = null;
    try {
      res = await athuga({ kt: g('nf-kt'), nafn: g('nf-nafn'), heimilisfang: g('nf-heimilisfang'), simi: g('nf-simi'), netfang: g('nf-netfang'), tengilidur: g('nf-tengiliður'), mode: 'nytt' });
    } catch (e) {
      problem('nyskraning_vorn_villa', (e && e.message) || e);
      res = null;
    }
    if (!res) return false;
    Companies._sidastaVornNidurstada = res;
    if (res.cancel) return true;
    uppfaeraListaOgOpna(res.row, res.hvernig === 'site' ? '✓ Nýr staður skráður: ' + res.row.nafn : '✓ Notaði fyrirtækið sem er til: ' + res.row.nafn, true);
    return true;
  }

  function vefjaSubmitNew() {
    if (!window.Companies || typeof Companies.submitNew !== 'function') { setTimeout(vefjaSubmitNew, 300); return; }
    if (Companies.submitNew.__ktVorn) return;
    const inner = Companies.submitNew;
    const w = async function () {
      if (nyttUpptekid) return;
      nyttUpptekid = true;
      try {
        Companies._sidastaVornNidurstada = null;
        if (await medhondlaNyttForm()) return;
        return await inner.apply(this, arguments);
      } finally {
        nyttUpptekid = false;
      }
    };
    w.__ktVorn = true;
    w._inner = inner;
    Companies.submitNew = w;
  }

  // ── Hnappur á fyrirtækjaprófíl ─────────────────────────────────────────────
  function settaProfilFall() {
    if (!window.Companies) { setTimeout(settaProfilFall, 300); return; }
    Companies.nyrStadur = async function (id) {
      const c = (Companies.list || []).find((x) => x && +x.id === +id);
      if (!c) { toast('Fyrirtækið fannst ekki'); return; }
      const row = await nyrStadur({ kennitala: c.kennitala, felagsnafn: c.nafn, customer_base_id: c.customer_base_id, thjonusta: c.er_i_thjonustu === true });
      if (row) uppfaeraListaOgOpna(row, '✓ Nýr staður skráður: ' + row.nafn, false);
    };
  }

  // ── Ársskoðun: „fannst ekki á þessum lista" ─────────────────────────────────
  // Krókur 77: fyrirtæki sem er EKKI í þjónustu sést aldrei í Ársskoðun, svo leitin sagði bara „ekkert fannst" og röðin var
  // stofnuð aftur. Kassinn (hluti af sniðmáti render() svo hann lifir sameiningu DOM) segir hvers vegna fyrirtækið sést ekki —
  // ekki í þjónustu, eða falið af síu — og gefur hnapp: setja í þjónustu / opna / hreinsa síur / skrá nýtt.
  const foldA = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae').replace(/ö/g, 'o');
  const STADA_HEITI = { done: 'Búið', suspect: 'Óvíst', entaeki: 'Engin tæki', misraemi: 'Stemmir ekki', pending: 'Á eftir', aeftir: 'Á eftir áætlun', pending2026: 'Eftir í ár', nytt: 'Nýtt', never: 'Aldrei skoðað', skipped2025: 'Slepptir í fyrra', priority: 'Forgangur', ivinnslu: 'Í vinnslu', akstur: 'Akstur', ovisst: '🕶 Falin' };

  function arsHlustarar() {
    const main = document.getElementById('ars-main');
    if (!main || main._nvHlustar) return;
    main._nvHlustar = true;
    main.addEventListener('click', async (e) => {
      const t = e.target.closest && e.target.closest('[data-nv-thj],[data-nv-opna],[data-nv-hreinsa],[data-nv-nytt]');
      if (!t) return;
      e.preventDefault(); e.stopPropagation();
      const A = window.Arsskodun;
      if (t.hasAttribute('data-nv-opna')) { opnaProfil(+t.getAttribute('data-nv-opna')); return; }
      if (t.hasAttribute('data-nv-hreinsa')) {
        if (!A || !A.state) return;
        A.state.status = 'all'; A.state.months = []; A.state.postnr = null; A.state.hideSkipped = false;
        try { if (A.saveState) A.saveState(); } catch (_) {}
        try { A.render(); } catch (_) {}
        return;
      }
      if (t.hasAttribute('data-nv-nytt')) {
        const q = trim((document.getElementById('_ars-search') || {}).value);
        const d = digits(q);
        if (A && A.openNewCompanyDialog) A.openNewCompanyDialog(d.length === 10 ? { kennitala: dash(d) } : { nafn: q });
        return;
      }
      if (t.hasAttribute('data-nv-thj')) {
        const id = +t.getAttribute('data-nv-thj');
        const co = ((A && A._cache && A._cache.allCompanies) || []).find((x) => x && +x.id === id);
        if (!co) { toast('Fyrirtækið fannst ekki'); return; }
        const msg = 'Setja „' + (co.nafn || '') + '“ í þjónustu?';
        let ok = true;
        try { ok = (window.Confirm && Confirm.show) ? await Confirm.show(msg, { okText: 'Setja í þjónustu', cancelText: 'Hætta við' }) : window.confirm(msg); } catch (_) { ok = window.confirm(msg); }
        if (!ok) return;
        try {
          await notaTilvist(co, {}, { settIThjonustu: true });
        } catch (err) { problem('nyskraning_vorn_ars_thj', (err && err.message) || err); toast('Villa: ' + ((err && err.message) || err)); return; }
        toast('✓ ' + (co.nafn || 'Fyrirtæki') + ' sett í þjónustu');
        try { if (window.Companies) { Companies._loadP = null; Companies._loadHofst = 0; } } catch (_) {}
        try { await A.loadAll(); A.render(); } catch (_) {}
      }
    });
  }

  // Skilar ALLTAF hnút með klasanum nv-ars (falinn þegar ekkert er að segja): sameining DOM í 153 (sAdskota) geymir hnúta
  // sem hafa klasa sem kemur hvergi fyrir í nýja HTML-inu, því þeir gætu verið frá öðrum pöttum. Án staðgengilsins stóð gamli
  // kassinn eftir þegar leitin var tæmd (mælt í prófun 29.10).
  const KASSI_TOMUR = '<div class="nv-ars nv-ars-tom" style="display:none" aria-hidden="true"></div>';

  function arsFelaKassi(ctx) {
    ctx = ctx || {};
    const q = trim(ctx.query);
    if (q.length < 2) return KASSI_TOMUR;
    const all = ctx.all || [];
    if (ctx.loading && !all.length) return KASSI_TOMUR;
    ensureCss();
    arsHlustarar();
    const st = ctx.state || {};
    const qn = foldA(q), qd = digits(q);
    const sjast = new Set((ctx.visible || []).map((c) => +c.id));
    const iBordi = new Map((ctx.cacheList || []).map((c) => [+c.id, c]));
    const passar = (c) => {
      if (!c || c.deleted_at) return false;
      if (foldA([c.nafn, c.kennitala, c.heimilisfang, c.postnumer].join(' ')).includes(qn)) return true;
      return qd.length >= 6 && digits(c.kennitala).includes(qd);
    };
    const faldir = all.filter((c) => passar(c) && !sjast.has(+c.id));
    const kassi = (fyrirsogn, innihald) =>
      '<div class="nv-ars" role="status" style="margin:0 0 12px;padding:12px 14px;border:1px solid #f59e0b;border-left-width:5px;border-radius:10px;background:var(--surface,#fff);color:var(--ink1,#0f172a);font-size:13px;line-height:1.45">' +
        '<div style="font-weight:800;margin-bottom:6px">' + fyrirsogn + '</div>' + innihald + '</div>';
    const takki = (attr, texti, litur) => '<button type="button" ' + attr + ' style="min-height:36px;padding:0 12px;border-radius:8px;border:1px solid ' + (litur ? litur : '#cbd5e1') + ';background:' + (litur ? litur : 'var(--surface2,#f1f5f9)') + ';color:' + (litur ? '#fff' : 'inherit') + ';font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">' + texti + '</button>';
    if (!faldir.length) {
      if (sjast.size) return KASSI_TOMUR;
      const d = digits(q);
      return kassi('Ekkert fyrirtæki í kerfinu passar við „' + esc(q) + '“',
        '<div style="color:var(--ink3,#475569);margin-bottom:8px">Hvorki í þjónustu, utan þjónustu né í Allir viðskiptavinir. Athugaðu stafsetningu' + (d.length === 10 ? '' : ' eða leitaðu á kennitölu') + ' — eða skráðu það.</div>' +
        takki('data-nv-nytt="1"', '＋ Skrá nýtt fyrirtæki í þjónustu', '#15803d'));
    }
    const sidur = ['status', 'months', 'postnr'].filter((k) => k === 'status' ? (st.status && st.status !== 'all') : k === 'months' ? (st.months && st.months.length) : (st.postnr !== null && st.postnr !== undefined));
    const radir = faldir.slice(0, 6).map((c) => {
      const b = iBordi.get(+c.id);
      let astaeda, hnappar;
      if (!b) {
        astaeda = '<b>Ekki í þjónustu</b> — þess vegna sést það ekki á þessum lista.';
        hnappar = takki('data-nv-thj="' + esc(c.id) + '"', 'Setja í þjónustu', '#15803d') + ' ' + takki('data-nv-opna="' + esc(c.id) + '"', 'Opna');
      } else if (st.status === 'ovisst' && !b._ovisst) {
        astaeda = '<b>Falið af síunni</b> „' + esc(STADA_HEITI.ovisst) + '“ sem er valin núna.';
        hnappar = takki('data-nv-hreinsa="1"', 'Hreinsa síur', '#b45309') + ' ' + takki('data-nv-opna="' + esc(c.id) + '"', 'Opna');
      } else if (b._ovisst) {
        astaeda = '<b>Merkt falið (🕶)</b> — sést aðeins á „' + esc(STADA_HEITI.ovisst) + '“ flipanum.';
        hnappar = takki('data-nv-opna="' + esc(c.id) + '"', 'Opna');
      } else {
        const lysing = sidur.map((k) => k === 'status' ? 'staða: ' + esc(STADA_HEITI[st.status] || st.status) : k === 'months' ? 'mánuður' : 'póstnúmer').join(', ');
        astaeda = '<b>Falið af síu</b>' + (lysing ? ' (' + lysing + ')' : '') + '.';
        hnappar = takki('data-nv-hreinsa="1"', 'Hreinsa síur', '#b45309') + ' ' + takki('data-nv-opna="' + esc(c.id) + '"', 'Opna');
      }
      return '<div style="padding:8px 0;border-top:1px solid var(--brd,#e2e8f0)">' +
        '<div><b>' + esc(c.nafn || '(án nafns)') + '</b>' + (trim(c.kennitala) ? ' <span style="color:var(--ink3,#475569)">· kt. ' + esc(c.kennitala) + '</span>' : '') + '</div>' +
        (trim(c.heimilisfang) ? '<div style="color:var(--ink3,#475569);font-size:12.5px">' + esc(c.heimilisfang) + '</div>' : '') +
        '<div style="margin:3px 0 7px">' + astaeda + '</div><div style="display:flex;gap:6px;flex-wrap:wrap">' + hnappar + '</div></div>';
    }).join('');
    const fyrirsogn = sjast.size ? 'Fleiri passa við „' + esc(q) + '“ í kerfinu en eru ekki á þessum lista' : 'Fannst ekki á þessum lista — en fyrirtækið er til í kerfinu';
    const meira = faldir.length > 6 ? '<div style="color:var(--ink3,#475569);padding-top:6px">… og ' + (faldir.length - 6) + ' í viðbót</div>' : '';
    return kassi(fyrirsogn, radir + meira);
  }

  // ── Skráning án viðmóts (rekstrarfélög, patch 175): finna röð eða stofna nýjan stað ─────────────────────────────
  // Sama regla og viðmótsleiðirnar: sama nafn eða sama heimilisfang á kennitölunni → röðin sem er til (sett í þjónustu ef
  // beðið er um), annars NÝR staður með næsta staðarnúmeri. Leitarvilla kastar — aldrei tvíritun á gisk.
  async function finnaEdaStofnaStad(o) {
    o = o || {};
    const d = digits(o.kt);
    if (d.length !== 10 || d === WALKIN) throw new Error('Kennitölu vantar');
    const r = await finnaKt(d);
    if (r.error) throw new Error('Gat ekki flett upp kennitölunni: ' + r.error);
    const nafnN = norm(o.nafn), heim = trim(o.heimilisfang);
    const sam = (nafnN && r.rows.find((x) => norm(x.nafn) === nafnN)) || (heim && r.rows.find((x) => sama(heim, x.heimilisfang))) || null;
    if (sam) {
      const row = (o.thjonusta && sam.er_i_thjonustu !== true) ? await notaTilvist(sam, {}, { settIThjonustu: true }) : sam;
      return { row, hvernig: 'reuse' };
    }
    const baseId = o.baseId || ((r.rows.find((x) => x && x.customer_base_id) || {}).customer_base_id) || null;
    const gogn = { nafn: trim(o.nafn) || ('kt ' + dash(d)), kennitala: dash(d), status: 'virkur', er_i_thjonustu: !!o.thjonusta, heimilisfang: heim || null };
    if (baseId) gogn.customer_base_id = baseId;
    return { row: await settaInnStad(d, gogn), hvernig: 'new' };
  }

  // ── Uppflettigeta (sama í öllum skráningarformum) ────────────────────────────────────────────────────────────────
  async function leitaIKerfi(q) {
    q = trim(q);
    if (q.length < 3) return { rows: [] };
    const c = SB();
    if (!c) return { error: 'Engin gagnagrunnstenging' };
    const d = digits(q);
    try {
      let rr;
      if (d.length === 10 && q.replace(/[\s-]/g, '').length === 10) {
        rr = await c.from('fyrirtaeki').select(COLS).or(ktOr(d)).is('deleted_at', null).order('id', { ascending: true }).limit(12);
      } else {
        const s = q.replace(/[,()*%"\\]/g, ' ').replace(/\s+/g, ' ').trim();
        if (s.length < 3) return { rows: [] };
        rr = await c.from('fyrirtaeki').select(COLS).or('nafn.ilike.*' + s + '*,heimilisfang.ilike.*' + s + '*').is('deleted_at', null).order('id', { ascending: true }).limit(12);
      }
      if (rr.error) return { error: rr.error.message || String(rr.error) };
      return { rows: rr.data || [] };
    } catch (e) { return { error: (e && e.message) || String(e) }; }
  }

  async function leitaRSK(q) {
    q = trim(q);
    const d = digits(q);
    try {
      const url = (d.length === 10 && q.replace(/[\s-]/g, '').length === 10) ? '/api/kt-lookup?kt=' + d : '/api/kt-lookup?nafn=' + encodeURIComponent(q);
      const r = await fetch(url);
      if (!r.ok) return [];
      const j = await r.json();
      if (j && j.nafn) return [j];
      return (j && j.results) || [];
    } catch (_) { return []; }
  }

  // Lifandi athugasemd undir kennitölu-reit: um leið og 10 stafa kennitala sést í kerfinu er sagt frá því — ekki aðeins við vistun.
  function festaKtNote(input, opts) {
    if (!input || input._nvNote) return;
    input._nvNote = true;
    opts = opts || {};
    ensureCss();
    const note = document.createElement('div');
    note.className = 'nv-note-inline';
    // text-transform/font-weight/letter-spacing: reiturinn getur setið inni í <label> með hástöfum (Ársskoðun-glugginn) — erfist annars.
    note.style.cssText = 'display:none;margin-top:5px;padding:7px 9px;border-radius:8px;border:1px solid #f59e0b;background:#fffbeb;color:#7c2d12;font-size:12.5px;font-weight:400;line-height:1.4;text-transform:none;letter-spacing:normal';
    (input.closest('.fg') || input.parentElement || input.parentNode).appendChild(note);
    let t = null, seq = 0;
    const uppfaera = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const my = ++seq;
        const d = digits(input.value);
        if (d.length !== 10 || d === WALKIN || (opts.virkt && !opts.virkt())) { note.style.display = 'none'; return; }
        const r = await finnaKt(d);
        if (my !== seq) return;
        if (r.error || !r.rows.length) { note.style.display = 'none'; return; }
        note.innerHTML = '⚠ <b>Kennitalan er þegar í kerfinu:</b> ' +
          r.rows.slice(0, 3).map((x) => esc(x.nafn || '') + (x.er_i_thjonustu === true ? ' (í þjónustu)' : ' (ekki í þjónustu)')).join(', ') + (r.rows.length > 3 ? ' …' : '') +
          ' <button type="button" class="nv-btn blue" style="min-height:32px;margin-left:6px;padding:0 10px">Nota það sem er til</button>';
        note.style.display = 'block';
        const b = note.querySelector('button');
        if (b) b.onclick = () => { try { if (opts.onSkoda) opts.onSkoda(); } catch (_) {} };
      }, 350);
    };
    input.addEventListener('input', uppfaera);
    input.addEventListener('change', uppfaera);
    uppfaera();
  }

  // „Nýtt fyrirtæki" glugginn hafði enga leit. Leitarbox efst: fyrirtæki sem eru til í kerfinu (Opna) og Fyrirtækjaskrá RSK (Fylla inn).
  let nyttOpid = false;
  function settaNyttFormLeit() {
    const bd = document.querySelector('#modal-nyfyrirtaeki .modal-bd');
    if (!bd) { setTimeout(settaNyttFormLeit, 500); return; }
    if (document.getElementById('nv-leit-wrap')) return;
    ensureCss();
    const wrap = document.createElement('div');
    wrap.className = 'fg';
    wrap.id = 'nv-leit-wrap';
    wrap.innerHTML = '<label class="fl">🔎 Leita að fyrirtæki sem er til (nafn, kennitala eða heimilisfang)</label>' +
      '<input class="fi" id="nv-leit" autocomplete="off" placeholder="Skrifaðu nafn eða kennitölu…"/>' +
      '<div id="nv-leit-res" style="margin-top:6px"></div>';
    bd.insertBefore(wrap, bd.firstChild);
    const inp = wrap.querySelector('#nv-leit'), res = wrap.querySelector('#nv-leit-res');
    let t = null, seq = 0, rskListi = [];
    inp.addEventListener('input', () => {
      clearTimeout(t);
      const q = trim(inp.value);
      if (q.length < 3) { res.innerHTML = ''; return; }
      t = setTimeout(async () => {
        const my = ++seq;
        res.innerHTML = '<div class="nv-small">⏳ Leita…</div>';
        const [k, rsk] = await Promise.all([leitaIKerfi(q), leitaRSK(q)]);
        if (my !== seq) return;
        const iKerfi = k.rows || [];
        const ktIKerfi = new Set(iKerfi.map((x) => digits(x.kennitala)));
        rskListi = (rsk || []).filter((x) => x && x.nafn && !ktIKerfi.has(digits(x.kennitala))).slice(0, 5);
        let h = '';
        if (k.error) h += '<div class="nv-note warn">Gat ekki leitað í kerfinu (' + esc(k.error) + ')</div>';
        if (iKerfi.length) {
          h += '<div class="nv-small"><b>Í kerfinu:</b></div>' + iKerfi.slice(0, 6).map((x) =>
            '<div class="nv-row" style="padding:7px 9px;margin:4px 0"><div><span class="nv-name">' + esc(x.nafn || '') + '</span>' + tagsHtml(x) + '</div>' +
            '<div class="nv-addr" style="margin:1px 0 5px">' + (trim(x.kennitala) ? 'kt. ' + esc(x.kennitala) + ' · ' : '') + (trim(x.heimilisfang) ? esc(x.heimilisfang) : 'ekkert heimilisfang') + '</div>' +
            '<button type="button" class="nv-btn blue" data-nvl-opna="' + esc(x.id) + '" style="min-height:34px">Opna</button></div>').join('');
        }
        if (rskListi.length) {
          h += '<div class="nv-small" style="margin-top:6px"><b>Fyrirtækjaskrá (RSK):</b></div>' + rskListi.map((x, i) =>
            '<div class="nv-row" style="padding:7px 9px;margin:4px 0"><div><span class="nv-name">' + esc(x.nafn) + '</span></div>' +
            '<div class="nv-addr" style="margin:1px 0 5px">' + (trim(x.kennitala) ? 'kt. ' + esc(x.kennitala) : '') + (trim(x.heimilisfang_full || x.heimilisfang) ? ' · ' + esc(x.heimilisfang_full || x.heimilisfang) : '') + '</div>' +
            '<button type="button" class="nv-btn" data-nvl-fylla="' + i + '" style="min-height:34px">Fylla inn</button></div>').join('');
        }
        if (!iKerfi.length && !rskListi.length && !k.error) h = '<div class="nv-small">Ekkert fannst — fylltu út formið að neðan.</div>';
        res.innerHTML = h;
      }, 400);
    });
    res.addEventListener('click', (e) => {
      const op = e.target.closest('[data-nvl-opna]');
      if (op) {
        const id = +op.getAttribute('data-nvl-opna');
        try { if (window.Modal && Modal.close) Modal.close('modal-nyfyrirtaeki'); } catch (_) {}
        opnaProfil(id);
        return;
      }
      const fy = e.target.closest('[data-nvl-fylla]');
      if (fy) {
        const x = rskListi[+fy.getAttribute('data-nvl-fylla')];
        if (!x) return;
        const sett = (id, v) => { const el = document.getElementById(id); if (el && v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
        const kd = digits(x.kennitala);
        sett('nf-nafn', x.nafn); sett('nf-kt', kd.length === 10 ? dash(kd) : x.kennitala); sett('nf-heimilisfang', x.heimilisfang_full || x.heimilisfang);
        res.innerHTML = '<div class="nv-small">✓ Fyllt inn úr Fyrirtækjaskrá — athugaðu og vistaðu.</div>';
      }
    });
    festaKtNote(document.getElementById('nf-kt'), {
      virkt: () => nyttOpid,
      onSkoda: async () => {
        if (nyttUpptekid) return;
        nyttUpptekid = true;
        try { Companies._sidastaVornNidurstada = null; await medhondlaNyttForm(); } finally { nyttUpptekid = false; }
      }
    });
  }

  function vefjaNyttOpnun() {
    if (!window.Companies || typeof Companies.openNew !== 'function') { setTimeout(vefjaNyttOpnun, 300); return; }
    if (Companies.openNew.__nv) return;
    const oN = Companies.openNew;
    Companies.openNew = function () {
      const r = oN.apply(this, arguments);
      try {
        nyttOpid = true;
        settaNyttFormLeit();
        const w = document.getElementById('nv-leit-wrap');
        if (w) { w.style.display = ''; const i = w.querySelector('#nv-leit'); if (i) i.value = ''; const rs = w.querySelector('#nv-leit-res'); if (rs) rs.innerHTML = ''; }
        const n = document.querySelector('#nf-kt'); const nn = n && (n.closest('.fg') || n.parentElement).querySelector('.nv-note-inline'); if (nn) nn.style.display = 'none';
      } catch (_) {}
      return r;
    };
    Companies.openNew.__nv = true;
    if (typeof Companies.openEdit === 'function' && !Companies.openEdit.__nv) {
      const oE = Companies.openEdit;
      Companies.openEdit = function () {
        const r = oE.apply(this, arguments);
        try { nyttOpid = false; settaNyttFormLeit(); const w = document.getElementById('nv-leit-wrap'); if (w) w.style.display = 'none'; const n = document.querySelector('#nf-kt'); const nn = n && (n.closest('.fg') || n.parentElement).querySelector('.nv-note-inline'); if (nn) nn.style.display = 'none'; } catch (_) {}
        return r;
      };
      Companies.openEdit.__nv = true;
    }
  }

  window.NyskraningVorn = { __v: 3, finnaKt, leitaKt, athuga, nyrStadur, notaTilvist, finnaEdaStofnaStad, leitaIKerfi, leitaRSK, festaKtNote, uppfaeraListaOgOpna, arsFelaKassi, _sama: sama };
  vefjaSubmitNew();
  settaProfilFall();
  vefjaNyttOpnun();
})();
