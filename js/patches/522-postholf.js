/* === 522 — PÓSTHÓLFIN: ein lína efst á Þjónustuborðinu (19.11.2026) ==================================================
 *
 * Agnar 19.11.2026: „maður þarf kannski að hafa litla stiku sem sýnir hvenær var lesið úr hverju póstfangi og hvort
 * virki. Og refresh á þeim.“
 *
 * HVAÐ HÚN SÝNIR, eitt hólf í einu: stutt nafn · hvenær lesarinn las það síðast · ljós (í lagi / seinn / þegir).
 * Smellur á hólf opnar eina línu undir með öllu sem mælt var: hlutverk hólfsins, hvaða lesari les það og hve þétt,
 * á hvaða vél, nýjasta póstinn sem kom inn og hve margir komu síðasta sólarhringinn.
 *
 * ENDURLESTUR (↻) stendur AÐEINS á hólfum sem hægt er að lesa héðan — Gmail-hólfunum, sem eru lesin í skýinu.
 * Thunderbird-hólfin les luna-bridge á vélunum hans á 15 mín. fresti; þau fá engan takka, því takki sem gerir ekkert
 * er verri en enginn takki (sama regla og tóma VIP-línan sem var tekin af þennan sama dag).
 *
 * HVERS VEGNA „LESIÐ“ ER MÆLT Á LESARANUM EN EKKI PÓSTINUM: `email_digest.fetched_at` hækkar aðeins þegar NÝTT skeyti
 * er skrifað, svo hólf sem er lesið á kortersfresti en fær engan póst leit út eins og það hefði ekki verið lesið í tvo
 * daga. Þannig stóð „⚠ slokkvitaeki@ ólesið síðan 17.11“ á borðinu þótt lesarinn hefði keyrt 140 sinnum síðan.
 * Þjónninn (/api/postholf) les því keyrslur lesaranna og hvaða hólf þær nefna.
 *
 * ÖRYGGI: línan sækir aðeins stöðu. Endurlestur sogar póst inn í grunninn eins og tímakeyrslan gerir og krefst
 * innskráningar; ekkert er sent og engu eytt.
 * ================================================================================================================== */
(() => {
  if (window.Postholf) return;

  const API = '/api/postholf';
  const FERSKT_MS = 120000;                    // staðan sótt aftur þegar hún er orðin tveggja mínútna gömul
  const S = { gogn: null, villa: null, at: 0, sott: false, bid: null, opid: null, keyrir: null, skilabod: null };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kl = (iso) => { const d = new Date(iso); return isNaN(d) ? '?' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const dagKl = (iso) => { const d = new Date(iso); if (isNaN(d)) return '?'; const idag = new Date(); const samidagur = d.toDateString() === idag.toDateString();
    return (samidagur ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + ' ') + kl(iso); };
  const sidan = (min) => (min == null ? 'aldrei' : min < 1 ? 'rétt í þessu' : min < 60 ? min + ' mín.' : Math.floor(min / 60) + ' klst. ' + (min % 60) + ' mín.');

  function teikna() { try { if (window.Bord368 && Bord368.render) Bord368.render(); } catch (_) {} }
  const rot = () => { try { return (window.Bord368 && Bord368.root) ? Bord368.root() : null; } catch (_) { return null; } };
  // Stílarnir búa í skuggarót borðsins (eins og VIP-vaktin, 513) — annars næðu þeir ekki inn fyrir hana.
  function festa(root) {
    if (!root || root.querySelector('#ph522-css')) return;
    const st = document.createElement('style'); st.id = 'ph522-css'; st.textContent = css(); root.appendChild(st);
  }

  function hlada(thvinga) {
    if (S.bid) return S.bid;
    if (!thvinga && S.gogn && Date.now() - S.at < FERSKT_MS) return null;
    S.bid = fetch(API, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => r.json().catch(() => ({})).then((j) => ({ s: r.status, j })))
      .then(({ s, j }) => {
        S.bid = null; S.sott = true; S.at = Date.now();
        if (s === 200 && j && j.holf) { S.gogn = j; S.villa = null; } else S.villa = (j && j.error) || ('villa ' + s);
        teikna();
      })
      .catch((e) => { S.bid = null; S.sott = true; S.at = Date.now(); S.villa = 'Netvilla: ' + ((e && e.message) || e); teikna(); });
    return S.bid;
  }

  function endurlesa(holf) {
    if (S.keyrir) return;
    S.keyrir = holf; S.skilabod = null; teikna();
    fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holf }) })
      .then((r) => r.json().catch(() => ({})).then((j) => ({ s: r.status, j })))
      .then(({ s, j }) => {
        S.keyrir = null;
        S.skilabod = s === 200 && j.ok ? { ok: true, texti: j.skilabod || 'Lesið' } : { ok: false, texti: (j && j.error) || ('villa ' + s) };
        hlada(true) || teikna();
      })
      .catch((e) => { S.keyrir = null; S.skilabod = { ok: false, texti: 'Netvilla: ' + ((e && e.message) || e) }; teikna(); });
  }

  // Smellur sem 368 sendir hingað (data-t5="ph-*"). Skilar true ef smellurinn var okkar.
  function smellur(el) {
    const a = el && el.getAttribute ? el.getAttribute('data-t5') : '';
    if (a === 'ph-opna') { const h = el.getAttribute('data-h') || ''; S.opid = S.opid === h ? null : h; S.skilabod = null; teikna(); return true; }
    if (a === 'ph-lesa') { endurlesa(el.getAttribute('data-h') || ''); return true; }
    if (a === 'ph-uppf') { S.at = 0; hlada(true); return true; }
    return false;
  }

  function holfHtml(h) {
    const opid = S.opid === h.holf, keyrir = S.keyrir === h.holf;
    const takki = '<button type="button" class="ph-h" data-t5="ph-opna" data-h="' + esc(h.holf) + '" aria-expanded="' + opid + '" title="' + esc(h.hlutverk + ' — ' + h.skyring) + '">' +
      '<span class="ph-ljos" data-s="' + esc(h.stada) + '" aria-hidden="true"></span>' +
      '<span class="ph-n">' + esc(h.stytt) + '</span>' +
      '<span class="ph-t">' + (h.lesid_at ? esc(kl(h.lesid_at)) : '—') + '</span></button>';
    const lesa = h.endurlestur
      ? '<button type="button" class="ph-r" data-t5="ph-lesa" data-h="' + esc(h.holf) + '"' + (keyrir ? ' disabled' : '') +
        ' title="Sækja nýjan póst úr ' + esc(h.stytt) + ' núna — sama lestur og keyrir sjálfkrafa á ' + h.bil_min + ' mín. fresti" aria-label="Endurlesa ' + esc(h.stytt) + '">' + (keyrir ? '…' : '↻') + '</button>'
      : '';
    return '<span class="ph-i' + (opid ? ' _opid' : '') + '">' + takki + lesa + '</span>';
  }

  function smaatridiHtml(h) {
    const r = [
      ['Hlutverk', h.hlutverk],
      ['Lesari', h.lesari + (h.vel ? ' á ' + h.vel : '') + ' · á ' + h.bil_min + ' mín. fresti'],
      ['Síðast lesið', (h.lesid_at ? dagKl(h.lesid_at) + ' (fyrir ' + sidan(h.lesid_min) + ')' : 'engin keyrsla síðustu 36 klst.')],
      ['Nýjasti póstur', h.nyjasti_postur ? dagKl(h.nyjasti_postur) : 'enginn skráður'],
      ['Síðasta sólarhring', h.sidasta_solarhring + (h.sidasta_solarhring === 1 ? ' skeyti' : ' skeyti')],
      ['Staða', h.skyring],
    ];
    return '<div class="ph-nanar"><b>' + esc(h.holf) + '</b>' + r.map((x) => '<span><i>' + esc(x[0]) + '</i> ' + esc(x[1]) + '</span>').join('') +
      (h.endurlestur ? '' : '<span class="ph-aths">Þetta hólf er lesið af luna-bridge á vélunum þínum — það er ekki hægt að kalla á lestur héðan.</span>') + '</div>';
  }

  function html() {
    hlada(false);
    festa(rot());
    if (!S.sott && !S.gogn) return '';                       // fyrsta sókn: engin lína fyrr en svarið kemur
    if (S.villa && !S.gogn) return '<section class="ph" aria-label="Pósthólfin"><b class="ph-k">PÓSTHÓLF</b><span class="ph-villa">' + esc(S.villa) +
      '</span><button type="button" class="ph-r" data-t5="ph-uppf" title="Reyna aftur">↻</button></section>';
    const l = (S.gogn && S.gogn.holf) || [];
    if (!l.length) return '';
    const slaemt = l.filter((h) => h.stada !== 'ok').length;
    const opid = l.find((h) => h.holf === S.opid);
    return '<section class="ph' + (slaemt ? ' _vand' : '') + '" aria-label="Pósthólfin">' +
      '<b class="ph-k" title="Hvenær lesarinn las hvert hólf síðast — ekki hvenær póstur kom síðast">PÓSTHÓLF</b>' +
      l.map(holfHtml).join('') +
      (S.skilabod ? '<span class="ph-sk' + (S.skilabod.ok ? '' : ' _v') + '">' + esc(S.skilabod.texti) + '</span>' : '') +
      (S.villa ? '<span class="ph-villa">' + esc(S.villa) + '</span>' : '') +
      '<span class="ph-grow"></span>' +
      '<button type="button" class="ph-r" data-t5="ph-uppf" title="Sækja stöðuna aftur" aria-label="Uppfæra stöðu pósthólfa">↻</button>' +
      (opid ? smaatridiHtml(opid) : '') +
      '</section>';
  }

  function css() {
    return [
      '.ph{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:10px 0 12px;padding:7px 12px;border:1px solid var(--rule2,#ddd);border-left:4px solid #2f7a4a;border-radius:6px;background:rgba(255,255,255,.7)}',
      '.ph._vand{border-left-color:#c9821f}',
      '.ph .ph-k{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2,#334)}',
      '.ph .ph-grow{flex:1 1 auto}',
      '.ph .ph-i{display:inline-flex;align-items:center;gap:2px}',
      '.ph .ph-h{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:2px 8px;border:1px solid transparent;border-radius:14px;background:transparent;font:inherit;font-size:12.5px;color:var(--ink,#222);cursor:pointer}',
      '.ph .ph-h:hover,.ph .ph-i._opid .ph-h{border-color:var(--rule2,#ddd);background:#fff}',
      '.ph .ph-n{font-weight:600}',
      '.ph .ph-t{font-family:var(--mono,monospace);font-size:11.5px;color:var(--mute,#667)}',
      '.ph .ph-ljos{width:8px;height:8px;border-radius:50%;background:#2f7a4a;flex:none}',
      '.ph .ph-ljos[data-s="seinn"]{background:#c9821f}.ph .ph-ljos[data-s="villa"]{background:#c0392b}',
      '.ph .ph-r{min-width:26px;height:26px;padding:0 6px;border:1px solid var(--rule2,#ddd);border-radius:6px;background:#fff;color:var(--ink,#222);font-size:13px;line-height:1;cursor:pointer}',
      '.ph .ph-r:hover{background:#f3f6fb}.ph .ph-r[disabled]{opacity:.6;cursor:progress}',
      '.ph .ph-sk{font-size:12px;color:#1f6b3c}.ph .ph-sk._v{color:#b5522a}',
      '.ph .ph-villa{font-size:12px;color:#b5522a}',
      '.ph .ph-nanar{flex:1 0 100%;display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px;padding-top:7px;border-top:1px dashed var(--rule2,#ddd);font-size:12.5px;color:var(--ink2,#334)}',
      '.ph .ph-nanar b{flex:1 0 100%;font-family:var(--mono,monospace);font-size:11.5px;color:var(--ink,#222)}',
      '.ph .ph-nanar i{font-style:normal;color:var(--mute,#667)}',
      '.ph .ph-nanar .ph-aths{flex:1 0 100%;color:var(--mute,#667)}',
    ].join('\n');
  }

  window.Postholf = { html, css, smellur, festa, load: () => hlada(true), S, version: '522a' };
  console.log('[522] Pósthólfin — staða og endurlestur');
})();
