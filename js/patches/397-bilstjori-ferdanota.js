/* === FERÐANÓTAN Í BÍLSTJÓRANUM (397) — 22.09.2026 ===
 *
 * Agnar (tvö skjáskot, bæði merkt með rauðu): „Can you make textbox in the app
 * that conects to textbox in fyrirtæki i arsskodun. And saves and syncs between
 * tæki" — reiturinn „hann fó…" í FERÐANÓTA-dálki Ársskoðunar á líka að vera
 * á stoppinu í Bílstjóra-appinu.
 *
 * ÞAÐ ER SAMA NÓTAN, ekki afrit: báðir reitir skrifa í `fyrirtaeki.plan_note`
 * — dálkinn sem 153 notar (lína ~2579). Þess vegna sést nótan á öllum tækjum
 * um leið og hún er vistuð, og ekkert nýtt geymslupláss verður til sem gæti
 * rekið í sundur við Ársskoðunina.
 *
 * VARÚÐ SEM ER INNBYGGÐ (feedback_ferdanota_spurningar: „aldrei yfirskrifa
 * hans nótu"): áður en skrifað er, les hjúpurinn gildið EINS OG ÞAÐ ER Á
 * ÞJÓNINUM. Hafi einhver annar skrifað í reitinn á meðan (og hann er ekki
 * tómur) er EKKI skrifað yfir — notandinn fær að sjá báða textana og velur.
 * Þannig getur nóta frá Agnari aldrei horfið undir nótu úr bílnum.
 *
 * Samstilling: nóturnar eru sóttar fyrir stoppin sem eru á skjánum (ein
 * fyrirspurn), aftur þegar appið kemur úr bakgrunni og á 90 sek fresti meðan
 * það er í forgrunni. Enginn reitur sem er í ritun er yfirskrifaður.
 *
 * 219 er ekki snert: reiturinn er settur inn í kortin sem þegar eru teiknuð,
 * og smellir í honum eru stöðvaðir svo kortið sjálft opnist ekki undir.
 */
(() => {
  if (window.__bsFerdanota397) return;
  window.__bsFerdanota397 = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const MAX = 140;                     // sama þak og 153 setur á reitinn

  const notur = new Map();             // co_id → nótan eins og hún kom af þjóninum
  let sidastSott = 0;

  function sb() {
    try { return (window.DB && DB.sb) || null; } catch (_) { return null; }
  }

  function css() {
    return [
      'html body #view-bilstjori ._bsnota{display:flex;align-items:stretch;gap:0;margin-top:9px;width:100%}',
      'html body #view-bilstjori ._bsnota i{flex:none;width:3px;border-radius:1px;background:linear-gradient(180deg,#d3ab4e,#8a6410)}',
      'html body #view-bilstjori ._bsnota input{flex:1;min-width:0;height:44px;padding:0 11px;border:1px solid rgba(20,24,34,.18);border-left:0;border-radius:0 3px 3px 0;background:#fff;color:#1f2530;font:500 14px ' + SANS + ';outline:none}',
      'html body #view-bilstjori ._bsnota input::placeholder{color:#a7aeb9;font-family:' + MONO + ';font-size:12.5px}',
      'html body #view-bilstjori ._bsnota input:focus{border-color:#b8912f;box-shadow:0 0 0 2px rgba(211,171,78,.25)}',
      'html body #view-bilstjori ._bsnota input[data-vistad="1"]{background:#fffdf5}',
      'html body #view-bilstjori ._bsnota._er-tom input{background:#fbfbfc}',
      'html body #view-bilstjori ._bsnota b{flex:none;display:none;align-items:center;padding:0 8px;border:1px solid rgba(20,24,34,.18);border-left:0;border-radius:0 3px 3px 0;background:#f4f6f9;font:700 11px ' + MONO + ';color:#6b7483}',
      'html body #view-bilstjori ._bsnota._vistar b{display:flex}',
    ].join('\n');
  }

  function injectCss() {
    if (document.getElementById('_bsnota-css')) return;
    const st = document.createElement('style');
    st.id = '_bsnota-css';
    st.textContent = css();
    (document.head || document.documentElement).appendChild(st);
  }

  // ── Sækja nóturnar fyrir stoppin sem eru á skjánum ───────────────────────
  async function saekja(ids) {
    const s = sb();
    if (!s || !ids.length) return;
    try {
      const r = await s.from('fyrirtaeki').select('id,plan_note').in('id', ids);
      if (r.error) throw r.error;
      (r.data || []).forEach(row => notur.set(String(row.id), row.plan_note || ''));
      sidastSott = Date.now();
      mala();
    } catch (e) {
      console.warn('[397] sækja nótur', e);
    }
  }

  // ── Vistun með árekstrarvörn ─────────────────────────────────────────────
  async function vista(id, nytt, inp) {
    const s = sb();
    if (!s) return;
    const wrap = inp.closest('._bsnota');
    const merki = wrap ? wrap.querySelector('b') : null;
    const adur = notur.has(String(id)) ? notur.get(String(id)) : '';
    if (nytt === adur) return;
    if (wrap) wrap.classList.add('_vistar');
    if (merki) merki.textContent = '…';
    try {
      // 1) Hvað stendur á þjóninum NÚNA?
      const les = await s.from('fyrirtaeki').select('plan_note').eq('id', id).single();
      if (les.error) throw les.error;
      const aThjoni = (les.data && les.data.plan_note) || '';
      if (aThjoni !== adur && aThjoni.trim()) {
        // Einhver annar skrifaði á meðan — nótan hans fær að standa nema
        // notandinn segi annað. Ekkert er skrifað fyrr en hann velur.
        const svar = window.confirm(
          'Nótan breyttist í öðru tæki á meðan.\n\n' +
          'Á þjóninum stendur:\n„' + aThjoni + '"\n\n' +
          'Þú skrifaðir:\n„' + nytt + '"\n\n' +
          'Í lagi = skrifa þitt yfir. Hætta við = halda því sem stendur á þjóninum.'
        );
        if (!svar) {
          notur.set(String(id), aThjoni);
          inp.value = aThjoni;
          if (wrap) wrap.classList.remove('_vistar');
          return;
        }
      }
      // 2) Skrifa — sama leið og 153 notar.
      const r = await s.from('fyrirtaeki').update({ plan_note: nytt }).eq('id', id);
      if (r.error) throw r.error;
      notur.set(String(id), nytt);
      inp.dataset.vistad = nytt ? '1' : '';
      if (merki) merki.textContent = '✓';
      setTimeout(() => { if (wrap) wrap.classList.remove('_vistar'); }, 900);
    } catch (e) {
      console.warn('[397] vista nótu', e);
      if (merki) merki.textContent = '⚠';
      try { if (window.logProblem) window.logProblem('plan_note_save_failed', 'bilstjori co ' + id); } catch (_) {}
      alert('Nótan vistaðist EKKI. Reyndu aftur eða skrifaðu hana í Ársskoðun.');
    }
  }

  // ── Setja reitinn í kortin ───────────────────────────────────────────────
  function mala() {
    const list = document.querySelector('#view-bilstjori #_bs-list, #view-bilstjori ._bs-list');
    if (!list) return;
    const vantar = [];
    list.querySelectorAll('.stop[data-co-id]').forEach(card => {
      const id = card.getAttribute('data-co-id');
      if (!id) return;
      let wrap = card.querySelector('._bsnota');
      if (!wrap) {
        const body = card.querySelector('.stop__body > div:last-child') || card.querySelector('.stop__body');
        if (!body) return;
        wrap = document.createElement('label');
        wrap.className = '_bsnota';
        wrap.innerHTML = '<i></i>';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.maxLength = MAX;
        inp.placeholder = 'Ferðanóta — sama og í Ársskoðun';
        inp.setAttribute('data-bsnota-id', id);
        const merki = document.createElement('b');
        merki.textContent = '✓';
        wrap.appendChild(inp);
        wrap.appendChild(merki);
        // Kortið sjálft er role="button" — smellur í reitnum má ekki opna það.
        ['click', 'pointerdown', 'mousedown', 'keydown', 'keyup'].forEach(ev =>
          wrap.addEventListener(ev, e => e.stopPropagation()));
        inp.addEventListener('change', () => vista(id, inp.value.trim(), inp));
        inp.addEventListener('blur', () => vista(id, inp.value.trim(), inp));
        body.appendChild(wrap);
      }
      const inp = wrap.querySelector('input');
      if (notur.has(String(id))) {
        const gildi = notur.get(String(id));
        // Reitur sem er í ritun er ALDREI yfirskrifaður af samstillingu.
        if (document.activeElement !== inp && inp.value !== gildi) inp.value = gildi;
        inp.dataset.vistad = gildi ? '1' : '';
        wrap.classList.toggle('_er-tom', !gildi);
      } else {
        vantar.push(id);
      }
    });
    if (vantar.length) saekja(vantar.slice(0, 200));
  }

  let t = null;
  function schedule() { clearTimeout(t); t = setTimeout(mala, 220); }

  function start() {
    injectCss();
    const v = document.getElementById('view-bilstjori');
    if (!v) { setTimeout(start, 1200); return; }
    schedule();
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.target && m.target.closest && m.target.closest('._bsnota')) continue;
        if (m.addedNodes && m.addedNodes.length) { schedule(); return; }
      }
    }).observe(v, { childList: true, subtree: true });

    // Samstilling: þegar appið kemur úr bakgrunni og á 90 sek fresti í forgrunni.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { notur.clear(); schedule(); }
    });
    setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - sidastSott < 80000) return;
      const ids = Array.from(document.querySelectorAll('#view-bilstjori .stop[data-co-id]'))
        .map(c => c.getAttribute('data-co-id')).filter(Boolean).slice(0, 200);
      if (ids.length) saekja(ids);
    }, 90000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1200));
  else setTimeout(start, 1200);

  window.BsFerdanota = { mala, notur };
  console.log('[397] Ferðanótan í Bílstjóranum');
})();
/* === END FERÐANÓTAN Í BÍLSTJÓRANUM === */
