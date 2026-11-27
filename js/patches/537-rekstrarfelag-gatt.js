/* === REKSTRARFÉLAG ↔ ÞJÓNUSTUGÁTT (537) — 27.11.2026 ============================================================
 *
 * Agnar 27.11.2026: „gera rekstrarfélagsyfirlitin betri svo þau geti aðeins stjórnað hvernig gáttin þeirra virkar. Að
 * rekstrarfélagsyfirlitin séu í raun nánari útfærslan af gáttinni með öllu sem er innanhúss pælingum og greiningum."
 *
 * Spjaldið „Þjónustugátt" efst í opnu rekstrarfélagskorti (175 kallar RfGatt.fylla þegar kortið opnast):
 *   · hvaða gáttir félagið á (portal_users á kennitölum hópsins), opin eða með lykilorði, síðast opnuð
 *   · erindi í gáttinni: opin / lokið (talið á þjóni, gatt-admin → erindi_talning)
 *   · „Opna sem kúnni" (sama leið og gatt-admin: 2 mín. lykill, skráð í agent_logs) og hlekkur í stillingar gáttar
 *   · rofar: hvað kúnninn sér í gáttinni (portal_users.syn) — vistast á þjón við smell, eins á öllum vélum
 * Innri greiningin (athugasemd félagsins) stendur áfram í reitnum fyrir neðan og sést aldrei í gáttinni.
 *
 * Les og skrifar AÐEINS um /api/gatt-admin (starfsmannahlið). Engin vakt, ekkert tímabil: sótt einu sinni á síðuhleðslu
 * og aftur eftir vistun. Engin skrif nema við smell.
 * ================================================================================================================ */
(() => {
  if (window.RfGatt) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Rofarnir sem skipta kúnnann mestu. Lyklarnir eru úr verkfæraskrá gáttarinnar (_gatt-verkfaeri.cjs); sjálfgefið kveikt.
  const ROFAR = [
    ['erindi', 'Erindi og fyrirspurnir'], ['verkbeidni', 'Verkbeiðnir'], ['baeta_eign', 'Bæta við eign'],
    ['teikningar', 'Teikningar'], ['bunadargreining', 'Búnaðargreining'], ['taeki', 'Tækjaskrá'], ['kerfi', 'Kerfi og skoðanir'],
    ['skjol', 'Skýrslur og reikningar'], ['serkjor', 'Sérkjör og verð'], ['fasteign', 'Greining fasteignar'],
    ['eldvarnabok', 'Eldvarnabók'], ['vinnusvaedi', 'Vinnusvæði'], ['vidhald', 'Viðhald'], ['kostnadur', 'Kostnaður'],
    ['verktakar', 'Verktakar'], ['lyklar', 'Lyklar'], ['orkumaelar', 'Orkumælar'], ['rymi', 'Rými'], ['checklisti', 'Gátlisti'],
  ];
  const SJALFGEFID_AF = { einkunn: 1, vikupostur: 1 };
  let _p = null;
  const saekja = (ferskt) => {
    if (_p && !ferskt) return _p;
    _p = fetch('/api/gatt-admin', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { _villa: r.status })).catch(() => ({ _villa: 0 }));
    return _p;
  };
  const senda = (body) => fetch('/api/gatt-admin', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => r.json().catch(() => ({})).then((j) => ({ ok: r.ok, j })));

  function stilar() {
    if (document.getElementById('rf-gatt-537')) return;
    const P = '#view-rekstrarfelog ';
    const st = document.createElement('style'); st.id = 'rf-gatt-537';
    st.textContent = [
      P + '._rf_gatt{border-bottom:1px solid rgba(20,24,34,.14);padding:12px 14px;background:#f6f4ef}',
      P + '._rf_gatt:empty{display:none}',
      P + '.rfg-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-bottom:8px}',
      P + '.rfg-t{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5b5f6b}',
      P + '.rfg-n{font-weight:700;color:#141822}',
      P + '.rfg-m{font-size:12px;color:#5b5f6b}',
      P + '.rfg-p{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:99px;font-size:11px;font-weight:700;border:1px solid rgba(20,24,34,.2);color:#141822;background:#fff}',
      P + '.rfg-p.vara{background:#b3261e;border-color:#6e100d;color:#fff}',
      P + '.rfg-p.gott{background:#1f7a44;border-color:#14532d;color:#fff}',
      P + '.rfg-k{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}',
      P + '.rfg-b{min-height:34px;padding:0 12px;border-radius:7px;border:1px solid #8d939e;background:linear-gradient(180deg,#f4f5f7,#cfd3da);color:#141822;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}',
      P + '.rfg-b:disabled{opacity:.55;cursor:default}',
      P + '.rfg-r{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:4px 10px;margin-top:6px}',
      P + '.rfg-r label{display:flex;align-items:center;gap:7px;min-height:30px;font-size:12.5px;color:#141822;cursor:pointer}',
      P + '.rfg-r input{width:17px;height:17px;flex:none;accent-color:#141822}',
      P + '.rfg-s{font-size:11.5px;color:#5b5f6b;margin-top:6px;min-height:16px}',
      P + '.rfg-d{margin-top:8px;padding:10px 12px;background:#fff;border:1px solid rgba(20,24,34,.14);border-radius:8px;max-height:420px;overflow:auto}',
      P + '.rfg-u{font-size:12px;font-weight:700;color:#141822;margin:10px 0 2px}',
      P + '.rfg-u:first-child{margin-top:0}',
      P + '.rfg-r2{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}',
      P + '.rfg-g + .rfg-g{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(20,24,34,.2)}',
      // 27.11.2026 (Agnar, símaskjámynd: „þetta er ömurlegt"): 19 hök stóðu alltaf opin á hverri gátt (mælt 1.177 px fyrir tvær
      // gáttir í síma, á undan sjálfum stöðunum). Nú er hver gátt haus + ein stöðulína + tveir takkar; rofarnir og skjölin
      // opnast við smell. Í síma lokað í byrjun, á tölvu opið eins og áður.
      P + '.rfg-r[hidden]{display:none}',
      P + '.rfg-s{min-height:0}', P + '.rfg-s:empty{display:none}',
      P + '.rfg-v{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      P + '.rfg-f b{margin:0 4px}', P + '.rfg-f i{font-style:normal;margin-left:8px;opacity:.7}',
      P + '.rfg-f[aria-expanded="true"]{background:linear-gradient(180deg,#3d4048,#1c1e23);border-color:#000;color:#fff}',
      P + '.rfg-g{container-type:inline-size}',
      '@container (max-width:620px){' + P + '.rfg-r{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}' + P + '.rfg-r2{grid-template-columns:1fr}' + P + '.rfg-k{margin-left:0;flex:1 1 100%}' + P + '.rfg-k .rfg-b{flex:1 1 0;justify-content:center}' + P + '.rfg-f{flex:1 1 0;justify-content:center}}',
    ].join('\n');
    document.head.appendChild(st);
  }
  // rofalistinn: lokaður í byrjun í síma (símahamur / app), opinn á tölvu; smellur ræður eftir það
  const _rofar = {};
  const simi = () => { try { return document.documentElement.getAttribute('data-viewmode') === 'mobile' || document.body.classList.contains('appmode'); } catch (_) { return false; } };
  const rofarOpnir = (id) => (id in _rofar ? _rofar[id] : !simi());
  const dags = (d) => { if (!d) return 'aldrei'; const t = new Date(d); return isNaN(t) ? 'aldrei' : ('0' + t.getDate()).slice(-2) + '.' + ('0' + (t.getMonth() + 1)).slice(-2) + '.' + t.getFullYear(); };

  function teikna(el, d, baseIds) {
    const gattir = (d.access || []).filter((a) => baseIds.indexOf(Number(a.base_id)) >= 0);
    if (d._villa != null) { el.innerHTML = '<div class="rfg-t">Þjónustugátt</div><div class="rfg-m">Náði ekki í gáttarupplýsingar (' + esc(d._villa || 'net') + ').</div>'; return; }
    if (!gattir.length) { el.innerHTML = '<div class="rfg-h"><span class="rfg-t">Þjónustugátt</span><span class="rfg-m">Félagið á enga gátt enn.</span><span class="rfg-k"><a class="rfg-b" href="/gatt-admin/" target="_blank" rel="noopener">Stofna í gáttarstjórn</a></span></div>'; return; }
    const tal = d.erindi_talning || {};
    let opin = 0, lokid = 0; baseIds.forEach((b) => { const t = tal[b]; if (t) { opin += t.opin || 0; lokid += t.lokid || 0; } });
    el.innerHTML = gattir.map((a) => {
      const syn = a.syn || {};
      return '<div class="rfg-g" data-rfg-id="' + esc(a.id) + '">' +
        '<div class="rfg-h"><span class="rfg-t">Þjónustugátt</span><span class="rfg-n">' + esc(a.display_name || a.base_nafn || a.slug) + '</span>' +
          '<span class="rfg-p ' + (a.active ? (a.hasPassword ? 'gott' : 'vara') : '') + '">' + (a.active ? (a.hasPassword ? 'Með lykilorði' : 'Opin án lykilorðs') : 'Óvirk') + '</span>' +
          '<span class="rfg-k"><button type="button" class="rfg-b" data-rfg-opna>Opna sem kúnni</button><a class="rfg-b" href="/gatt-admin/" target="_blank" rel="noopener">Gáttarstjórn</a></span></div>' +
        '<div class="rfg-m">/g/' + esc(a.slug) + ' · síðast opnuð ' + esc(dags(a.last_login)) + ' · erindi: <b>' + opin + '</b> opin · <b>' + lokid + '</b> lokið (öll félög hópsins)</div>' +
        '<div class="rfg-v"><button type="button" class="rfg-b rfg-f" data-rfg-rofar aria-expanded="' + (rofarOpnir(a.id) ? 'true' : 'false') + '">Kúnninn sér<b data-rfg-n></b>af ' + ROFAR.length + '<i>' + (rofarOpnir(a.id) ? '▴' : '▾') + '</i></button>' +
          '<button type="button" class="rfg-b rfg-f" data-rfg-gogn aria-expanded="false">Skjöl og eignir<i>▾</i></button></div>' +
        '<div class="rfg-r" data-rfg-r' + (rofarOpnir(a.id) ? '' : ' hidden') + '>' + ROFAR.map((r) => '<label><input type="checkbox" data-rfg-syn="' + r[0] + '"' + ((typeof syn[r[0]] === 'boolean' ? syn[r[0]] : !SJALFGEFID_AF[r[0]]) ? ' checked' : '') + '>' + esc(r[1]) + '</label>').join('') + '</div>' +
        '<div class="rfg-s" data-rfg-st></div>' +
        '<div class="rfg-d" data-rfg-d hidden></div></div>';
    }).join('');
    el.querySelectorAll('.rfg-g').forEach((g) => {
      const id = g.getAttribute('data-rfg-id'), a = gattir.filter((x) => String(x.id) === id)[0], st = g.querySelector('[data-rfg-st]');
      g.querySelector('[data-rfg-opna]').addEventListener('click', (ev) => {
        const b = ev.currentTarget; b.disabled = true;
        // glugginn opnast strax við smellinn (annars lokar vafrinn honum sem sprettiglugga) og fær slóðina þegar hún berst
        const w = window.open('about:blank', '_blank');
        senda({ action: 'impersonate', id }).then((r) => { b.disabled = false; if (r.ok && r.j && r.j.url) { if (w) w.location = r.j.url; else location.href = r.j.url; } else { if (w) w.close(); st.textContent = 'Tókst ekki að opna: ' + ((r.j && r.j.error) || 'villa'); } });
      });
      // Skjöl og eignir: sótt þegar beðið er um það (listinn getur verið langur); vistun við hvert hak
      const TEG = { uttektarskyrsla: 'Úttektarskýrsla', brunakerfi: 'Brunakerfisskýrsla', reikningur: 'Reikningur', samningur: 'Samningur' };
      const gk = g.querySelector('[data-rfg-gogn]'), gd = g.querySelector('[data-rfg-d]');
      gk.addEventListener('click', () => {
        if (!gd.hidden) { gd.hidden = true; gk.setAttribute('aria-expanded', 'false'); gk.querySelector('i').textContent = '▾'; return; }
        gd.hidden = false; gk.setAttribute('aria-expanded', 'true'); gk.querySelector('i').textContent = '▴';
        if (gd.dataset.sott) return; gd.dataset.sott = '1'; gd.innerHTML = '<div class="rfg-m">Sæki…</div>';
        senda({ action: 'gogn', id }).then((r) => {
          if (!r.ok || !r.j || !r.j.ok) { gd.innerHTML = '<div class="rfg-m">Náði ekki í listann: ' + esc((r.j && r.j.error) || 'villa') + '</div>'; delete gd.dataset.sott; return; }
          const d = r.j, fs = new Set(d.falin_skjol || []), fe = new Set(d.faldar_eignir || []), nafn = {}; (d.eignir || []).forEach((e) => { nafn[e.id] = e.nafn; });
          const skjalLina = (x) => '<label><input type="checkbox" data-rfg-skjal="' + x.id + '"' + (fs.has(x.id) ? '' : ' checked') + '>' +
            esc(TEG[x.tegund] || x.tegund || 'Skjal') + (x.nr ? ' ' + esc(x.nr) : '') + ' · ' + esc(x.man || (x.dags || '').slice(0, 7) || x.ar || '') + (x.upphaed != null ? ' · ' + Math.round(x.upphaed).toLocaleString('is-IS') + ' kr.' : '') + '</label>';
          const hopar = {}; (d.skjol || []).forEach((x) => { const k = x.fid != null && nafn[x.fid] ? x.fid : 0; (hopar[k] = hopar[k] || []).push(x); });
          gd.innerHTML = '<div class="rfg-m" style="margin-bottom:8px">Hakaðu af það sem kúnninn á ekki að sjá. Ekkert eyðist; hakað aftur birtist það á ný.</div><div class="rfg-u">Eignir í gáttinni (' + (d.eignir || []).length + ')</div><div class="rfg-r">' +
            (d.eignir || []).map((e) => '<label><input type="checkbox" data-rfg-eign="' + e.id + '"' + (fe.has(e.id) ? '' : ' checked') + '>' + esc(e.nafn) + (e.er_i_thjonustu === false ? ' <span class="rfg-m">(utan þjónustu)</span>' : '') + '</label>').join('') + '</div>' +
            Object.keys(hopar).sort((a, b) => String(nafn[a] || 'ö').localeCompare(String(nafn[b] || 'ö'), 'is')).map((k) => '<div class="rfg-u">' + esc(nafn[k] || 'Ótengt eign') + ' (' + hopar[k].length + ')</div><div class="rfg-r rfg-r2">' + hopar[k].map(skjalLina).join('') + '</div>').join('') +
            (d.falin_reikningar && d.falin_reikningar.length ? '<div class="rfg-m" style="margin-top:6px">Faldir reikningar eftir númeri (eldri stilling): ' + esc(d.falin_reikningar.join(', ')) + '</div>' : '') +
            '<div class="rfg-s" data-rfg-gst></div>';
          const gst = gd.querySelector('[data-rfg-gst]');
          const vista = (c) => {
            const falin = [...gd.querySelectorAll('[data-rfg-skjal]')].filter((x) => !x.checked).map((x) => +x.getAttribute('data-rfg-skjal'));
            const faldar = [...gd.querySelectorAll('[data-rfg-eign]')].filter((x) => !x.checked).map((x) => +x.getAttribute('data-rfg-eign'));
            gst.textContent = 'Vista…';
            senda({ action: 'gogn-vista', id, falin_skjol: falin, faldar_eignir: faldar }).then((r2) => {
              if (r2.ok && r2.j && r2.j.ok) gst.textContent = 'Vistað — ' + falin.length + ' skjöl og ' + faldar.length + ' eignir falin í gáttinni.';
              else { c.checked = !c.checked; gst.textContent = 'Vistun mistókst: ' + ((r2.j && r2.j.error) || 'villa') + ' — ekkert breyttist.'; }
            });
          };
          gd.querySelectorAll('[data-rfg-skjal],[data-rfg-eign]').forEach((c) => c.addEventListener('change', () => vista(c)));
        });
      });
      // rofarnir: taldir á takkanum, opnast og lokast við smell (staðan munuð á meðan síðan er opin)
      const rk = g.querySelector('[data-rfg-rofar]'), rr = g.querySelector('[data-rfg-r]');
      const telja = () => { rk.querySelector('[data-rfg-n]').textContent = rr.querySelectorAll('[data-rfg-syn]:checked').length; };
      telja();
      rk.addEventListener('click', () => { const o = rr.hidden; rr.hidden = !o; _rofar[id] = o; rk.setAttribute('aria-expanded', o ? 'true' : 'false'); rk.querySelector('i').textContent = o ? '▴' : '▾'; });
      g.querySelectorAll('[data-rfg-syn]').forEach((c) => c.addEventListener('change', telja));
      g.querySelectorAll('[data-rfg-syn]').forEach((c) => c.addEventListener('change', () => {
        const k = c.getAttribute('data-rfg-syn'), nytt = Object.assign({}, a.syn || {}); nytt[k] = c.checked;
        g.querySelectorAll('[data-rfg-syn]').forEach((x) => { x.disabled = true; }); st.textContent = 'Vista…';
        senda({ action: 'save', id, syn: nytt }).then((r) => {
          g.querySelectorAll('[data-rfg-syn]').forEach((x) => { x.disabled = false; });
          if (r.ok && r.j && r.j.row) { a.syn = r.j.row.syn || nytt; st.textContent = 'Vistað — gildir næst þegar kúnninn opnar gáttina.'; }
          else { c.checked = !c.checked; telja(); st.textContent = 'Vistun mistókst: ' + ((r.j && r.j.error) || 'villa') + ' — ekkert breyttist.'; }
        });
      }));
    });
  }

  window.RfGatt = {
    /** el = tómi kassinn í kortinu; baseIds = customer_base_id staða félagsins (lifandi staðir). */
    fylla(el, baseIds) {
      if (!el || el.dataset.fyllt) return; el.dataset.fyllt = '1';
      const ids = (baseIds || []).map(Number).filter((x, i, A) => x && A.indexOf(x) === i);
      if (!ids.length) return;
      stilar();
      el.innerHTML = '<div class="rfg-h"><span class="rfg-t">Þjónustugátt</span><span class="rfg-m">Sæki…</span></div>';
      saekja().then((d) => teikna(el, d || { _villa: 0 }, ids));
    },
  };
})();
