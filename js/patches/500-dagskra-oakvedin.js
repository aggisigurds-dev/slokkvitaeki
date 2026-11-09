/* === DAGSKRÁ · ÓÁKVEÐIN VERK VIKUNNAR v1 (09.11.2026) ===
 *
 * Neðst í Dagskrár-einingu Þjónustuborðs (368 `dagskraHtml`, undir skýringarlínunni): kaflinn
 * „Þarf að gera í vikunni — Ekki ákveðið hvenær". Fjórir textareitir í 2×2 grind fyrir frjálsan texta.
 *
 * GÖGN (regla Agnars: allt sem er skrifað vistast á þjóni, aldrei bara í tækinu):
 *   skipulagsbord.by_staff.<eigandi>.oakvedin.{r1,r2,r3,r4} = texti
 * <eigandi> er SAMI og fyrir dagnóturnar (368 `dagskraSyn()`): „Allir" = sameiginlegur listi (sjálfgefið),
 * annars listi þess starfsmanns sem valinn er í Dagskrár-valmyndinni. Fjórir fastir reitir á eiganda.
 * Hlutur (ekki fylki) svo deepMerge í AppSettings.save sameinar PER REIT — vistun eins reits getur ekki
 * étið reit sem annar maður breytti á annarri vél.
 *
 * VISTUN: AppSettings.save (= saveVordud: misheppnað skrif fer í biðröð, viðvörun og endurtekning).
 * Hér að auki: debounce 700 ms, strax við focusout/pagehide/visibilitychange, og endurtekning á 15 s fresti
 * á meðan drögin eru óvistuð. Textinn hverfur ALDREI: drögin (`drog`) standa þar til þjónninn staðfestir
 * AÐ AKKÚRAT ÞESSI texti hafi vistast, og teikning les drögin á undan þjóninum.
 *
 * Fókus og texti lifa endurteikningu: 368 `render()` bíður meðan reitur með data-ov er í fókus.
 *
 * API (368 kallar, allt varið með `window.ThbOakvedin &&`): html(eig) · css() · input(el) · focusout(el) ·
 * skola() · virkt(el) · rot (sett af 368).
 */
(() => {
  if (window.ThbOakvedin) return;

  const REITIR = ['r1', 'r2', 'r3', 'r4'];
  const drog = {};     // 'eig|r1' -> texti sem hefur ekki enn verið staðfestur af þjóni
  const stada = {};    // 'eig|r1' -> { t: 'bid'|'vistar'|'ok', s: texti }
  const tm = {}, retry = {};

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = k => { try { return (window.AppSettings && AppSettings.path) ? AppSettings.path(k) : null; } catch (_) { return null; } };
  const slod = (eig, r) => 'skipulagsbord.by_staff.' + eig + '.oakvedin.' + r;
  const lesa = (eig, r) => { const v = P(slod(eig, r)); return typeof v === 'string' ? v : ''; };
  const klukka = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const toast = (m, bad) => { try { if (window.Toast && Toast.show) Toast.show(m, bad ? 'error' : undefined); } catch (_) {} };

  function stimpla(key) {
    const root = API.rot && API.rot();
    if (!root) return;
    const st = stada[key] || { t: '', s: '' };
    root.querySelectorAll('[data-ovst="' + key + '"]').forEach(el => { el.textContent = st.s || ''; el.className = 'ovst ' + st.t; });
  }

  async function vista(key) {
    const bil = key.indexOf('|'), eig = key.slice(0, bil), r = key.slice(bil + 1);
    const texti = drog[key];
    if (texti == null) return;
    stada[key] = { t: 'vistar', s: 'Vista…' };
    stimpla(key);
    let ok = false;
    try { ok = !!(await AppSettings.save({ skipulagsbord: { by_staff: { [eig]: { oakvedin: { [r]: texti } } } } })); } catch (_) {}
    if (ok && drog[key] === texti) delete drog[key];
    if (ok) {
      stada[key] = { t: 'ok', s: 'Vistað kl. ' + klukka(new Date()) };
      clearTimeout(retry[key]);
    } else {
      stada[key] = { t: 'bid', s: 'Í biðröð — reynt aftur sjálfkrafa. Textinn stendur hér áfram.' };
      toast('Óákveðin verk vistuðust ekki — í biðröð, reynt aftur sjálfkrafa', true);
      clearTimeout(retry[key]);
      retry[key] = setTimeout(() => { if (drog[key] != null) vista(key); }, 15000);
    }
    stimpla(key);
  }

  function skolaLykil(key) {
    if (tm[key] == null) return;
    clearTimeout(tm[key]); delete tm[key];
    vista(key);
  }

  const API = {
    rot: null,
    // Er reitur í ritun? 368 render() bíður þá (annars missir sá sem skrifar fókusinn og lyklaborðið á síma).
    virkt: el => !!(el && el.dataset && el.dataset.ov),
    input(el) {
      const key = el.dataset.ov;
      if (!key) return;
      drog[key] = el.value;
      stada[key] = { t: 'bid', s: 'Óvistað…' };
      stimpla(key);
      clearTimeout(tm[key]);
      tm[key] = setTimeout(() => { delete tm[key]; vista(key); }, 700);
    },
    focusout(el) { if (el && el.dataset && el.dataset.ov) skolaLykil(el.dataset.ov); },
    skola() {
      Object.keys(tm).forEach(skolaLykil);
      // Óvistuð drög sem bíða endurtekningar fara líka núna (pagehide / app-skipti).
      Object.keys(drog).forEach(k => { if (tm[k] == null && stada[k] && stada[k].t === 'bid') vista(k); });
    },
    html(eig) {
      eig = eig || 'Allir';
      const reitur = (r, i) => {
        const key = eig + '|' + r;
        const g = drog[key] != null ? drog[key] : lesa(eig, r);
        const st = stada[key];
        return '<div class="ovbox">' +
          '<textarea data-ov="' + esc(key) + '" rows="5" aria-label="Óákveðið verk vikunnar ' + (i + 1) + '" placeholder="Skrifaðu hér…">' + esc(g) + '</textarea>' +
          '<span class="ovst ' + (st ? st.t : '') + '" data-ovst="' + esc(key) + '">' + esc(st ? st.s : '') + '</span></div>';
      };
      return '<div class="ov">' +
        '<div class="ovh"><h3>Þarf að gera í vikunni</h3><span>Ekki ákveðið hvenær</span></div>' +
        '<div class="ovgrid">' + REITIR.map(reitur).join('') + '</div></div>';
    },
    css() {
      return [
        '.ov{padding:2px 16px 14px}',
        '.ovh{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:8px 0 6px;border-top:1px solid var(--edge)}',
        '.ovh h3{margin:0;font:700 12px/1.2 var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--ink)}',
        '.ovh span{font-size:11.5px;color:var(--mute)}',
        '.ovgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
        '.ovbox{display:flex;flex-direction:column;gap:2px;min-width:0}',
        '.ovbox textarea{width:100%;min-height:96px;padding:7px 8px;border:1px solid var(--rule2);border-radius:4px;background:rgba(255,253,247,.6);font:12.5px/1.45 var(--body);color:var(--ink);resize:vertical;white-space:pre-wrap;box-sizing:border-box}',
        '.ovbox textarea:hover{background:#fffdf7}',
        '.ovbox textarea:focus{outline:2px solid var(--g5);outline-offset:1px;background:#fffdf7}',
        '.ovbox textarea::placeholder{color:var(--mute);opacity:.45}',
        '.ovst{font-family:var(--mono);font-size:9.5px;letter-spacing:.05em;color:var(--mute);min-height:11px}',
        '.ovst.ok{color:var(--green)}.ovst.vistar,.ovst.bid{color:var(--gink)}',
        '@media (max-width:420px){.ovgrid{grid-template-columns:minmax(0,1fr)}}'
      ].join('\n');
    }
  };
  window.ThbOakvedin = API;

  document.addEventListener('visibilitychange', () => { if (document.hidden) API.skola(); });
  window.addEventListener('pagehide', () => API.skola());
})();
