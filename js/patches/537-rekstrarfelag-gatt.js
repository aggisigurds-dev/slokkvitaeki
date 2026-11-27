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
      P + '.rfg-g + .rfg-g{margin-top:12px;padding-top:12px;border-top:1px dashed rgba(20,24,34,.2)}',
    ].join('\n');
    document.head.appendChild(st);
  }
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
          '<span class="rfg-m">/g/' + esc(a.slug) + ' · síðast opnuð ' + esc(dags(a.last_login)) + '</span>' +
          '<span class="rfg-k"><button type="button" class="rfg-b" data-rfg-opna>Opna sem kúnni</button><a class="rfg-b" href="/gatt-admin/" target="_blank" rel="noopener">Gáttarstjórn</a></span></div>' +
        '<div class="rfg-m">Erindi í gátt: <b>' + opin + '</b> opin · <b>' + lokid + '</b> lokið (öll félög hópsins)</div>' +
        '<div class="rfg-t" style="margin-top:10px">Það sem kúnninn sér</div>' +
        '<div class="rfg-r">' + ROFAR.map((r) => '<label><input type="checkbox" data-rfg-syn="' + r[0] + '"' + ((typeof syn[r[0]] === 'boolean' ? syn[r[0]] : !SJALFGEFID_AF[r[0]]) ? ' checked' : '') + '>' + esc(r[1]) + '</label>').join('') + '</div>' +
        '<div class="rfg-s" data-rfg-st></div></div>';
    }).join('');
    el.querySelectorAll('.rfg-g').forEach((g) => {
      const id = g.getAttribute('data-rfg-id'), a = gattir.filter((x) => String(x.id) === id)[0], st = g.querySelector('[data-rfg-st]');
      g.querySelector('[data-rfg-opna]').addEventListener('click', (ev) => {
        const b = ev.currentTarget; b.disabled = true;
        // glugginn opnast strax við smellinn (annars lokar vafrinn honum sem sprettiglugga) og fær slóðina þegar hún berst
        const w = window.open('about:blank', '_blank');
        senda({ action: 'impersonate', id }).then((r) => { b.disabled = false; if (r.ok && r.j && r.j.url) { if (w) w.location = r.j.url; else location.href = r.j.url; } else { if (w) w.close(); st.textContent = 'Tókst ekki að opna: ' + ((r.j && r.j.error) || 'villa'); } });
      });
      g.querySelectorAll('[data-rfg-syn]').forEach((c) => c.addEventListener('change', () => {
        const k = c.getAttribute('data-rfg-syn'), nytt = Object.assign({}, a.syn || {}); nytt[k] = c.checked;
        g.querySelectorAll('[data-rfg-syn]').forEach((x) => { x.disabled = true; }); st.textContent = 'Vista…';
        senda({ action: 'save', id, syn: nytt }).then((r) => {
          g.querySelectorAll('[data-rfg-syn]').forEach((x) => { x.disabled = false; });
          if (r.ok && r.j && r.j.row) { a.syn = r.j.row.syn || nytt; st.textContent = 'Vistað — gildir næst þegar kúnninn opnar gáttina.'; }
          else { c.checked = !c.checked; st.textContent = 'Vistun mistókst: ' + ((r.j && r.j.error) || 'villa') + ' — ekkert breyttist.'; }
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
