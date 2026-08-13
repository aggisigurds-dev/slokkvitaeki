/* === BRUNAKERFI DOC IMPORT (Skills Registry v2) ===
 *
 * A "skill" knows how to read one kind of document and extract structured
 * fields out of it (labels + values), like a saved template for the
 * parser. This patch ships ONE built-in skill — "Brunaviðvörunarkerfi
 * skýrsla" — that reads old Viðtökupróf / Árleg prófun PDFs and turns
 * them into Brunakerfisþjónusta company entries.
 *
 * Adding another skill later is just adding another entry to the SKILLS
 * array (or saving one to AppSettings.brunakerfi_skills). When the user
 * drops a PDF, the dispatcher runs each skill's `match_required` phrases
 * against the extracted text and picks the highest-scoring skill — so
 * skills can coexist and route by document content automatically.
 *
 * UI: drop-zone next to "+ Bæta við fyrirtæki" + a "📚" button that opens
 * a skills-list modal showing what kinds of documents are recognized.
 */
(() => {
  if (window.__brunaSkillInstalled) return;
  window.__brunaSkillInstalled = true;

  const USER_SKILLS_KEY = 'brunakerfi_skills';

  // ── Built-in skills ────────────────────────────────────────────────────
  // Each skill has:
  //   id, name, description, icon
  //   target          : where the imported record lands ('brunakerfi' = the
  //                     brunakerfi_customers + fyrirtaeki tables)
  //   match_required  : phrases that MUST appear in the PDF for this skill
  //                     to claim the document
  //   match_score_terms: optional phrases that boost the score (used to
  //                     disambiguate when multiple skills' required-phrases
  //                     all match)
  //   fields          : ordered list of label→value extractors
  //   stop_phrases    : phrases that terminate a field value early (so
  //                     values don't leak into other sections)
  const SKILLS = [
    {
      id: 'brunavidvorunarkerfi_skyrsla',
      name: 'Brunaviðvörunarkerfi skýrsla',
      description: 'Viðtökupróf / Árleg prófun á brunaviðvörunarkerfi — les fyrirtæki, kt, símí, tengilið og næstu skoðun úr skjalinu.',
      icon: '🚨',
      target: 'brunakerfi',
      sample: 'Skill Brunaviðvörurnarkerfi.pdf',
      match_required: ['Brunaviðvörunarkerfi'],
      match_score_terms: ['Viðtökupróf', 'Árleg prófun', 'Verkkaupi', 'Tengiliður', 'Næsta skoðun kerfis'],
      fields: [
        { key: 'verkkaupi',     icelandic: 'Verkkaupi',    labels: ['Verkkaupi'] },
        { key: 'dags',          icelandic: 'Dags.',        labels: ['Dags'] },
        { key: 'kennitala',     icelandic: 'Kennitala',    labels: ['Kennitala', 'Kt.', 'Kt'] },
        { key: 'simi',          icelandic: 'Sími',         labels: ['Sími'] },
        { key: 'tengilidur',    icelandic: 'Tengiliður',   labels: ['Tengiliður'] },
        { key: 'heimilisfang',  icelandic: 'Heimilisfang', labels: ['Heimilisf.', 'Heimilisfang', 'Heimilisf'] },
        { key: 'postnr',        icelandic: 'Póstnr.',      labels: ['Póstnr.', 'Póstnúmer', 'Póstnr'] },
        { key: 'tegund_kerfis', icelandic: 'Tegund',       labels: ['Tegund'] },
        { key: 'naesta_skodun', icelandic: 'Næsta skoðun', labels: ['Næsta skoðun kerfis', 'Næsta skoðun'] }
      ],
      stop_phrases: [
        'Verktaki:', 'Verktaki ',
        'Prófun framhvæmd af',
        'Profun framkvæmd af',
        'Athugasemdir á bls',
        'Athugasemdir',
        'Heiti Í lagi',
        'Prófun á stjórnstöð',
        'Undirstöðvar',
        'Boðsendir'
      ]
    }
  ];

  function getUserSkills() {
    const v = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(USER_SKILLS_KEY)) || [];
    return Array.isArray(v) ? v : [];
  }
  function getAllSkills() { return SKILLS.concat(getUserSkills()); }
  function getSkillById(id) { return getAllSkills().find(s => s.id === id) || null; }

  // Run each skill's match_required against text, return the best-scoring
  // skill (or null if no skill claims the document).
  function detectSkill(text) {
    let best = null, bestScore = -1;
    for (const s of getAllSkills()) {
      const req = s.match_required || [];
      if (!req.every(p => text.includes(p))) continue;
      let score = req.length * 10;
      score += (s.match_score_terms || []).filter(p => text.includes(p)).length;
      if (score > bestScore) { best = s; bestScore = score; }
    }
    return best;
  }

  // Helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getSB() { return (window.DB && window.DB.sb) || null; }

  // ── Icelandic month-name → number (1-12) ───────────────────────────────
  const MONTH_MAP = {
    'janúar': 1, 'januar': 1, 'jan': 1, 'janúary': 1,
    'febrúar': 2, 'februar': 2, 'feb': 2,
    'mars': 3, 'mar': 3,
    'apríl': 4, 'april': 4, 'apr': 4,
    'maí': 5, 'mai': 5, 'may': 5,
    'júní': 6, 'juni': 6, 'jun': 6,
    'júlí': 7, 'juli': 7, 'jul': 7,
    'ágúst': 8, 'agust': 8, 'aug': 8,
    'september': 9, 'sept': 9, 'sep': 9,
    'október': 10, 'oktober': 10, 'okt': 10, 'oct': 10,
    'nóvember': 11, 'november': 11, 'nov': 11,
    'desember': 12, 'december': 12, 'des': 12, 'dec': 12
  };
  function parseIcelandicMonth(text) {
    if (!text) return null;
    const t = String(text).toLowerCase();
    for (const name in MONTH_MAP) {
      if (t.indexOf(name) >= 0) return MONTH_MAP[name];
    }
    // Try numeric format like "09.2025" or "9/2025"
    const m = t.match(/(\d{1,2})[\/\.\-](\d{4})/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 12) return n;
    }
    return null;
  }
  function parseYearFromText(text) {
    if (!text) return null;
    const m = String(text).match(/\b(20\d{2})\b/);
    return m ? parseInt(m[1], 10) : null;
  }

  // ── PDF.js loader (reuses patch-98's pattern) ──────────────────────────
  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(true);
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      s.onload = () => {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        } catch (_) {}
        resolve(true);
      };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  // ── Read a PDF File object → text string ───────────────────────────────
  // PDF.js exposes each text run with .transform (matrix, x = [4], y = [5])
  // and .width. Naively joining with spaces produced "Miðgar ður" because
  // single glyphs like "ð" often arrive as separate runs even within a
  // word. We instead compute the expected end-x of the previous run and
  // only insert a space when there's actual horizontal gap to the next.
  async function extractTextFromPDF(file) {
    const ok = await ensurePdfJs();
    if (!ok) throw new Error('PDF.js gat ekki hlaðið');
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let allText = '';
    const maxPages = Math.min(pdf.numPages, 3); // first 3 pages are plenty
    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      allText += joinPdfItems(content.items) + '\n';
    }
    return allText;
  }

  function joinPdfItems(items) {
    let out = '';
    let prevX = null, prevY = null, prevEndX = null;
    for (const it of items) {
      const s = String(it.str || '');
      if (!s.length) {
        // Empty item — usually just a position marker. If it has EOL, add a newline.
        if (it.hasEOL) { out += '\n'; prevX = prevY = prevEndX = null; }
        continue;
      }
      const tr = it.transform || [1,0,0,1,0,0];
      const x = tr[4], y = tr[5];
      const w = (it.width != null) ? it.width : 0;
      if (prevX === null) {
        out += s;
      } else if (Math.abs(y - prevY) > 2) {
        // Different line — newline separator
        out += '\n' + s;
      } else {
        // Same line. Gap = how far the new run starts past where the prev ended.
        const gap = x - prevEndX;
        // Threshold: roughly half a character width. PDF glyph widths vary so
        // we use 1.5 as a conservative heuristic — bigger than zero, smaller
        // than a normal space which is usually ~3 units.
        if (gap > 1.5) out += ' ' + s;
        else out += s;
      }
      prevX = x;
      prevY = y;
      prevEndX = x + w;
      if (it.hasEOL) { out += '\n'; prevX = prevY = prevEndX = null; }
    }
    return out;
  }

  // ── Field parser ───────────────────────────────────────────────────────
  function findFirstStop(slice, stopPhrases) {
    let best = -1;
    for (const ph of (stopPhrases || [])) {
      const i = slice.indexOf(ph);
      if (i >= 0 && (best < 0 || i < best)) best = i;
    }
    return best;
  }

  function extractFields(text, skill) {
    const fields = (skill && skill.fields) || [];
    const stopPhrases = (skill && skill.stop_phrases) || [];
    // Collapse whitespace so multi-line labels match
    const flat = String(text || '').replace(/\s+/g, ' ').trim();
    const positions = [];
    for (const f of fields) {
      for (const lbl of f.labels) {
        const idx = flat.indexOf(lbl);
        if (idx >= 0) {
          positions.push({ key: f.key, label: lbl, start: idx, end: idx + lbl.length });
          break;
        }
      }
    }
    positions.sort((a, b) => a.start - b.start);
    const result = {};
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const nextStart = i + 1 < positions.length ? positions[i+1].start : Math.min(flat.length, p.end + 200);
      let value = flat.slice(p.end, nextStart);
      // Trim at the first boundary phrase if present — this stops field
      // values from leaking into other sections.
      const stopAt = findFirstStop(value, stopPhrases);
      if (stopAt >= 0) value = value.slice(0, stopAt);
      // Strip leading separators and trailing whitespace; cap at 120 chars
      value = value.replace(/^[\s:.,-]+/, '').trim().slice(0, 120);
      result[p.key] = value;
    }
    return result;
  }

  // ── Post-process extracted fields into the shape we need ───────────────
  function normalizeKt(s) {
    if (!s) return '';
    return String(s).replace(/[^0-9]/g, '').slice(0, 10);
  }
  function combineAddress(heim, postnr) {
    const h = (heim || '').trim();
    const p = (postnr || '').trim();
    if (h && p) return h + ', ' + p;
    return h || p;
  }

  // ── Inject the UI: drop-zone next to "+ Bæta við fyrirtæki" ────────────
  function injectDropZone() {
    const addBtn = document.querySelector('._bk-add');
    if (!addBtn) return false;
    if (document.getElementById('_bk-skill-drop')) return true;

    const wrap = document.createElement('div');
    wrap.id = '_bk-skill-drop-wrap';
    wrap.style.cssText = 'display:inline-flex;align-items:stretch;gap:6px;vertical-align:middle';
    wrap.innerHTML = `
      <button id="_bk-skill-drop" type="button" title="Dragðu eldri brunakerfis-skýrslu (PDF) hingað eða smelltu til að velja"
        style="display:flex;align-items:center;gap:7px;padding:9px 13px;background:#fff;color:#0f172a;border:1.5px dashed #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;transition:all .15s">
        <span style="font-size:15px">📄</span> Skjal · les fyrirtæki
      </button>
      <button id="_bk-skill-list" type="button" title="Sjá hvers konar skjöl skill safnið þekkir"
        style="display:flex;align-items:center;gap:5px;padding:9px 11px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">
        <span style="font-size:14px">📚</span> Skills
      </button>
      <input id="_bk-skill-file" type="file" accept="application/pdf,.pdf" hidden multiple>
    `;
    // Insert before the existing add-button
    addBtn.parentNode.insertBefore(wrap, addBtn);

    const dropBtn = wrap.querySelector('#_bk-skill-drop');
    const listBtn = wrap.querySelector('#_bk-skill-list');
    const fileInp = wrap.querySelector('#_bk-skill-file');

    listBtn.addEventListener('click', openSkillsModal);
    dropBtn.addEventListener('click', () => fileInp.click());
    fileInp.addEventListener('change', e => {
      const files = Array.from(e.target.files || []);
      fileInp.value = '';
      processFiles(files);
    });

    // Drag-and-drop handlers (button as drop target)
    ['dragover','dragenter'].forEach(ev => {
      dropBtn.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        dropBtn.style.borderColor = '#2563eb';
        dropBtn.style.background = '#dbeafe';
      });
    });
    ['dragleave','dragend'].forEach(ev => {
      dropBtn.addEventListener(ev, () => {
        dropBtn.style.borderColor = '#cbd5e1';
        dropBtn.style.background = '#fff';
      });
    });
    dropBtn.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      dropBtn.style.borderColor = '#cbd5e1';
      dropBtn.style.background = '#fff';
      const files = Array.from(e.dataTransfer && e.dataTransfer.files || []);
      processFiles(files);
    });

    return true;
  }

  // ── Chain-kennitala tracking ───────────────────────────────────────────
  // Some kennitölur (hotel chains, holding companies, multi-site businesses)
  // intentionally have many fyrirtaeki rows — one per site. We track those
  // kennitölur so we don't pester the user with the collision dialog for
  // every new site within a known chain.
  //
  // A kt is considered a chain when EITHER:
  //   (a) Auto-detected: the DB already has 2+ rows with that kt under
  //       different names — clear chain pattern, future additions skip
  //       the popup automatically.
  //   (b) Marked: the user ticked "Þessi kennitala er keðja" in the
  //       collision dialog. Stored in AppSettings.brunakerfi_chain_kts.
  const CHAIN_KEY = 'brunakerfi_chain_kts';
  function getChainKts() {
    const v = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(CHAIN_KEY)) || [];
    return Array.isArray(v) ? v : [];
  }
  function isMarkedChain(ktClean) {
    if (!ktClean) return false;
    return getChainKts().indexOf(ktClean) >= 0;
  }
  async function markAsChain(ktClean) {
    if (!ktClean || !window.AppSettings || !window.AppSettings.save) return false;
    const list = getChainKts();
    if (list.indexOf(ktClean) >= 0) return true;
    list.push(ktClean);
    return await window.AppSettings.save({ [CHAIN_KEY]: list });
  }
  function isAutoDetectedChain(matches) {
    if (!matches || matches.length < 2) return false;
    const names = new Set(matches.map(m => normalizeName(m.nafn)));
    // 2+ rows with DIFFERENT names → it's a chain (not just accidental dupes)
    return names.size >= 2;
  }
  function isChainKt(ktClean, matches) {
    return isMarkedChain(ktClean) || isAutoDetectedChain(matches);
  }

  // ── Kt-collision dialog (shared) ───────────────────────────────────────
  // When the user is about to create a new fyrirtaeki with a kennitala
  // that already exists in our system, this dialog explains the situation
  // and lets them decide:
  //   • Use one of the existing rows (link it into brunakerfi instead of
  //     creating a duplicate)
  //   • Create a NEW row with the same kt but a different name (intentional
  //     for hotel chains, holding companies, multi-site businesses)
  //   • Cancel
  //
  // Includes a checkbox to mark the kt as a chain so the dialog never
  // appears again for that kennitala.
  //
  // Exposed on window so patch 147's create-company dialog can reuse it.
  function normalizeName(n) {
    return String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function showKtCollisionDialog(candidates, newName, ktClean) {
    return new Promise(resolve => {
      const ktDisplay = ktClean.length === 10 ? ktClean.slice(0,6) + '-' + ktClean.slice(6) : ktClean;
      document.getElementById('_bk-kt-coll-dlg')?.remove();
      const dlg = document.createElement('div');
      dlg.id = '_bk-kt-coll-dlg';
      dlg.style.cssText = 'position:fixed;inset:0;z-index:100090;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
      dlg.innerHTML = `
        <div style="background:#fff;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(580px,calc(100vw - 24px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden">
          <div style="padding:14px 20px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
            <div>
              <div style="font-size:11px;color:#fef3c7;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">⚠️ Hugsanleg afritun</div>
              <div style="font-size:15px;font-weight:700;margin-top:2px">Kt. ${esc(ktDisplay)} er þegar skráð á ${candidates.length} fyrirtæki</div>
            </div>
            <button id="_bkc-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:30px;height:30px;border-radius:5px;cursor:pointer;font-size:14px">✕</button>
          </div>

          <div style="padding:14px 20px;background:#fffbeb;border-bottom:1px solid #fde68a;font-size:12.5px;color:#78350f;line-height:1.5">
            Þú ert að skrá <strong>„${esc(newName)}"</strong> með kennitölu sem þegar er til. Ef þetta er <strong>sama fyrirtækið</strong>, veldu það úr listanum hér að neðan. Ef þetta er <strong>nýr staður innan keðju</strong> (t.d. hótel-keðja með marga staði á einni kt), smelltu „Stofna nýtt fyrirtæki".
          </div>

          <div style="flex:1;overflow-y:auto;padding:12px 18px">
            <div style="font-size:10.5px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:4px 0 8px">Núverandi fyrirtæki með þessari kt:</div>
            <div style="display:flex;flex-direction:column;gap:7px">
              ${candidates.map((c, i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
                  <div style="min-width:0;flex:1">
                    <div style="font-size:13.5px;font-weight:700;color:#0f172a">${esc(c.nafn || '—')}</div>
                    ${c.heimilisfang ? `<div style="font-size:11px;color:#64748b;margin-top:1px">📍 ${esc(c.heimilisfang)}</div>` : ''}
                    ${c.simi ? `<div style="font-size:11px;color:#64748b">📞 ${esc(c.simi)}</div>` : ''}
                  </div>
                  <button class="_bkc-pick" data-i="${i}" type="button" style="padding:7px 12px;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700;white-space:nowrap;flex-shrink:0">Nota þetta</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="padding:10px 18px;background:#fff;border-top:1px solid #e2e8f0">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:#475569">
              <input id="_bkc-chain" type="checkbox" style="width:16px;height:16px;cursor:pointer">
              <span>🔗 <strong>Þessi kennitala er keðja</strong> — ekki spyrja aftur fyrir kt. ${esc(ktDisplay)}</span>
            </label>
          </div>

          <div style="padding:12px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;flex-shrink:0">
            <button id="_bkc-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12.5px;color:#475569">Hætta við</button>
            <button id="_bkc-new" type="button" style="padding:8px 16px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700">+ Stofna nýtt fyrirtæki með sömu kt</button>
          </div>
        </div>`;
      document.body.appendChild(dlg);

      function close(decision) { dlg.remove(); resolve(decision); }
      dlg.querySelector('#_bkc-x').addEventListener('click', () => close({ action: 'cancel' }));
      dlg.querySelector('#_bkc-cancel').addEventListener('click', () => close({ action: 'cancel' }));
      dlg.querySelector('#_bkc-new').addEventListener('click', async () => {
        const remember = !!dlg.querySelector('#_bkc-chain').checked;
        if (remember) await markAsChain(ktClean);
        close({ action: 'create_new', chain_remembered: remember });
      });
      dlg.querySelectorAll('._bkc-pick').forEach(b => {
        b.addEventListener('click', () => {
          const i = +b.dataset.i;
          close({ action: 'use_existing', coId: candidates[i].id, candidate: candidates[i] });
        });
      });
    });
  }

  // ── Skills-list modal — what kinds of documents the system can read ────
  function openSkillsModal() {
    document.getElementById('_bk-skills-modal')?.remove();
    const all = getAllSkills();
    const userIds = new Set(getUserSkills().map(s => s.id));
    const modal = document.createElement('div');
    modal.id = '_bk-skills-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:100085;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(640px,calc(100vw - 24px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 20px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <div>
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">📚 Skill safn</div>
            <div style="font-size:15px;font-weight:700;margin-top:2px">Skjöl sem kerfið þekkir</div>
          </div>
          <button id="_bksm-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:30px;height:30px;border-radius:5px;cursor:pointer;font-size:14px">✕</button>
        </div>

        <div style="padding:12px 20px;font-size:12px;color:#475569;background:#f8fafc;border-bottom:1px solid #e2e8f0">
          Þegar skjal er dragið inn í <strong>📄 Skjal · les fyrirtæki</strong>, finnur kerfið sjálfkrafa hvaða skill á við og notar hennar reglur til að lesa upplýsingarnar.
        </div>

        <div style="flex:1;overflow-y:auto;padding:14px 20px;display:flex;flex-direction:column;gap:10px">
          ${all.length === 0 ? '<div style="padding:20px;text-align:center;color:#94a3b8">Engar skills skráðar.</div>' : ''}
          ${all.map(s => `
            <div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;background:#fff">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
                <div style="min-width:0;flex:1">
                  <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">
                    <span style="font-size:18px">${esc(s.icon || '📄')}</span>
                    <span style="font-size:14px;font-weight:700;color:#0f172a">${esc(s.name)}</span>
                    ${userIds.has(s.id) ? '<span style="font-size:9px;font-weight:700;color:#16a34a;background:#dcfce7;padding:2px 7px;border-radius:99px">notandi</span>' : '<span style="font-size:9px;font-weight:700;color:#1e40af;background:#dbeafe;padding:2px 7px;border-radius:99px">innbyggt</span>'}
                  </div>
                  <div style="font-size:12px;color:#475569;margin-bottom:8px">${esc(s.description || '')}</div>
                  <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:11px;color:#64748b">
                    <div style="font-weight:600">Lykilorð í skjali:</div>
                    <div>${(s.match_required || []).concat(s.match_score_terms || []).map(p => '<code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;margin-right:3px;font-size:10.5px">' + esc(p) + '</code>').join('') || '<em>—</em>'}</div>
                    <div style="font-weight:600">Reitir sem lesnir eru:</div>
                    <div>${(s.fields || []).map(f => '<code style="background:#eff6ff;color:#1e40af;padding:1px 5px;border-radius:3px;margin-right:3px;font-size:10.5px">' + esc(f.icelandic) + '</code>').join('')}</div>
                    ${s.sample ? `<div style="font-weight:600">Sýnishorn:</div><div><em>${esc(s.sample)}</em></div>` : ''}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="padding:11px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:11px;color:#64748b;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0">
          <div>💡 Þú getur látið mig bæta við fleiri skills síðar (t.d. þjónustusamninga, tilboð, brunaskoðanir…)</div>
          <button id="_bksm-close" type="button" style="padding:7px 14px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12px;color:#475569">Loka</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    function close() { modal.remove(); }
    modal.querySelector('#_bksm-x').addEventListener('click', close);
    modal.querySelector('#_bksm-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  // ── Process one or more files: parse + show confirm dialog ─────────────
  async function processFiles(files) {
    const pdfs = files.filter(f => /pdf/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (!pdfs.length) {
      alert('Aðeins PDF skjöl eru studd í augnablikinu. Sleppi ' + files.length + ' skrá(m).');
      return;
    }
    // Visual feedback
    const btn = document.getElementById('_bk-skill-drop');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<span style="font-size:15px">⏳</span> Les ' + pdfs.length + ' skrá' + (pdfs.length === 1 ? '' : 'r') + '…';

    // Process sequentially so the user reviews one at a time
    for (const file of pdfs) {
      try {
        const text = await extractTextFromPDF(file);
        const skill = detectSkill(text);
        if (!skill) {
          const names = getAllSkills().map(s => '• ' + s.icon + ' ' + s.name).join('\n');
          alert('Engin skill þekkir „' + file.name + '". Þekktar skills:\n\n' + (names || '(engar)') + '\n\nSmelltu „📚 Skills" til að sjá skill safnið og bæta við nýjum.');
          continue;
        }
        const parsed = extractFields(text, skill);
        await showConfirmDialog(parsed, file.name, text, skill);
      } catch (e) {
        alert('Gat ekki lesið "' + file.name + '": ' + (e.message || e));
      }
    }

    if (btn) btn.innerHTML = oldHtml;
  }

  // ── Confirmation dialog ────────────────────────────────────────────────
  async function showConfirmDialog(parsed, sourceName, rawText, skill) {
    return new Promise(resolve => {
      const nextMonth = parseIcelandicMonth(parsed.naesta_skodun);
      const nextYear = parseYearFromText(parsed.naesta_skodun);
      const ktClean = normalizeKt(parsed.kennitala);
      const ktDisplay = ktClean.length === 10 ? ktClean.slice(0,6) + '-' + ktClean.slice(6) : ktClean;
      const addr = combineAddress(parsed.heimilisfang, parsed.postnr);
      const skillIcon = (skill && skill.icon) || '📄';
      const skillName = (skill && skill.name) || 'Innlestur úr skjali';

      document.getElementById('_bk-skill-dlg')?.remove();
      const dlg = document.createElement('div');
      dlg.id = '_bk-skill-dlg';
      dlg.style.cssText = 'position:fixed;inset:0;z-index:100080;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
      dlg.innerHTML = `
        <div style="background:#fff;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden">
          <div style="padding:13px 18px;background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
            <div>
              <div style="font-size:11px;color:#bfdbfe;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">${esc(skillIcon)} ${esc(skillName)}</div>
              <div style="font-size:15px;font-weight:700;margin-top:2px">${esc(sourceName)}</div>
            </div>
            <button id="_bks-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:30px;height:30px;border-radius:5px;cursor:pointer;font-size:14px">✕</button>
          </div>
          <div style="padding:14px 18px;background:#eff6ff;border-bottom:1px solid #bfdbfe;font-size:12px;color:#1e40af">
            <strong>Yfirfarðu reitina</strong> sem voru lesnir úr skjalinu og leiðréttu ef þarf. Smelltu <strong>"Stofna fyrirtæki"</strong> til að bæta þeim í Brunakerfisþjónustu.
          </div>
          <div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:11px">

            <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center">
              <label style="font-size:11px;font-weight:700;color:#64748b">Verkkaupi *</label>
              <input id="_bks-nafn" type="text" value="${esc(parsed.verkkaupi || '')}" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;width:100%;box-sizing:border-box">

              <label style="font-size:11px;font-weight:700;color:#64748b">Kennitala</label>
              <input id="_bks-kt" type="text" inputmode="numeric" value="${esc(ktDisplay)}" placeholder="000000-0000" maxlength="11" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;width:100%;box-sizing:border-box;font-family:monospace">

              <label style="font-size:11px;font-weight:700;color:#64748b">Sími</label>
              <input id="_bks-simi" type="tel" value="${esc(parsed.simi || '')}" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;width:100%;box-sizing:border-box">

              <label style="font-size:11px;font-weight:700;color:#64748b">Tengiliður</label>
              <input id="_bks-tengl" type="text" value="${esc(parsed.tengilidur || '')}" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;width:100%;box-sizing:border-box">

              <label style="font-size:11px;font-weight:700;color:#64748b">Heimilisfang</label>
              <input id="_bks-addr" type="text" value="${esc(addr)}" placeholder="Götu 1, 101 Reykjavík" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;width:100%;box-sizing:border-box">

              <label style="font-size:11px;font-weight:700;color:#64748b">Tegund</label>
              <input id="_bks-tegund" type="text" value="${esc(parsed.tegund_kerfis || '')}" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;width:100%;box-sizing:border-box">

              <label style="font-size:11px;font-weight:700;color:#64748b">Næsta skoðun</label>
              <select id="_bks-month" style="padding:8px 11px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;width:100%;box-sizing:border-box;background:#fff">
                <option value="0">— ekki tilgreint —</option>
                ${['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember']
                  .map((n,i)=>`<option value="${i+1}" ${nextMonth === i+1 ? 'selected' : ''}>${esc(n)}</option>`).join('')}
              </select>
            </div>

            <details style="border:1px solid #e2e8f0;border-radius:7px;padding:0 10px;background:#f8fafc">
              <summary style="cursor:pointer;padding:9px 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em">🔍 Hrátt textaúrtak (til prófunar)</summary>
              <pre style="font-size:10.5px;color:#475569;padding:6px 0 10px;margin:0;white-space:pre-wrap;max-height:180px;overflow-y:auto;font-family:Consolas,Menlo,monospace">${esc((rawText || '').slice(0, 800))}${(rawText||'').length > 800 ? '…' : ''}</pre>
            </details>

            <div id="_bks-err" style="display:none;font-size:12px;color:#dc2626;font-weight:600;padding:7px 11px;background:#fee2e2;border-radius:6px"></div>
          </div>
          <div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0">
            <button id="_bks-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>
            <button id="_bks-save" type="button" style="padding:8px 18px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">+ Stofna fyrirtæki</button>
          </div>
        </div>`;
      document.body.appendChild(dlg);

      function close() { dlg.remove(); resolve(); }
      dlg.querySelector('#_bks-x').addEventListener('click', close);
      dlg.querySelector('#_bks-cancel').addEventListener('click', close);
      dlg.addEventListener('click', e => { if (e.target === dlg) close(); });

      const errEl = dlg.querySelector('#_bks-err');
      function showErr(m) { errEl.textContent = m; errEl.style.display = ''; }

      // Auto-format kt
      const ktInp = dlg.querySelector('#_bks-kt');
      ktInp.addEventListener('input', () => {
        const raw = ktInp.value.replace(/[^0-9]/g, '').slice(0, 10);
        ktInp.value = raw.length > 6 ? raw.slice(0,6) + '-' + raw.slice(6) : raw;
      });

      dlg.querySelector('#_bks-save').addEventListener('click', async () => {
        const nafn = dlg.querySelector('#_bks-nafn').value.trim();
        const ktCleanFinal = ktInp.value.replace(/[^0-9]/g, '');
        const simi = dlg.querySelector('#_bks-simi').value.trim();
        const tengl = dlg.querySelector('#_bks-tengl').value.trim();
        const addrFinal = dlg.querySelector('#_bks-addr').value.trim();
        const tegund = dlg.querySelector('#_bks-tegund').value.trim();
        const monthFinal = parseInt(dlg.querySelector('#_bks-month').value, 10) || 0;

        if (!nafn) { showErr('Nafn fyrirtækis vantar'); return; }
        if (ktCleanFinal && ktCleanFinal.length !== 10) { showErr('Kennitala verður að vera 10 tölustafir (eða tóm)'); return; }

        const SB = getSB();
        if (!SB) { showErr('Engin gagnabankatenging'); return; }

        // Kt-collision: an existing fyrirtaeki has this kt. That's expected
        // for hotel chains / holding companies with multiple sites on one
        // kennitala — so we now ALLOW creating a new row with the same kt
        // when the name differs, and pop a disambiguation dialog so the
        // user explicitly confirms the intent.
        let coId = null;
        if (ktCleanFinal) {
          try {
            const r = await SB.from('fyrirtaeki').select('id,nafn,heimilisfang,simi').eq('kennitala', ktCleanFinal);
            const matches = (r && r.data) || [];
            const normNew = normalizeName(nafn);
            const exactHit = matches.find(m => normalizeName(m.nafn) === normNew);
            if (exactHit) {
              // Same kt + same name → reuse the existing row (no popup)
              coId = exactHit.id;
            } else if (matches.length > 0) {
              // Known chain kt? Skip the popup — different name + chain
              // kennitala = new site within the chain, just create it.
              if (isChainKt(ktCleanFinal, matches)) {
                // coId stays null → falls through to insert below
              } else {
                const decision = await showKtCollisionDialog(matches, nafn, ktCleanFinal);
                if (decision.action === 'cancel') return;
                if (decision.action === 'use_existing') coId = decision.coId;
                // 'create_new' → coId stays null, falls through to insert
              }
            }
          } catch (_) {}
        }

        // Create new fyrirtaeki if not collision
        if (!coId) {
          const rec = {
            nafn,
            kennitala: ktCleanFinal || null,
            simi: simi || null,
            heimilisfang: addrFinal || null,
            'tengiliður': tengl || null,
            athugasemdir: (tegund ? 'Tegund brunakerfis: ' + tegund + '\n' : '') + 'Innlestur úr skjali: ' + sourceName
          };
          try {
            const r = await SB.from('fyrirtaeki').insert(rec).select('id').single();
            if (r.error) { showErr('Vista mistókst: ' + r.error.message); return; }
            coId = r.data.id;
            try { if (window.Companies && Companies.load) Companies.load(); } catch (_) {}
          } catch (e) {
            showErr('Villa: ' + (e.message || String(e))); return;
          }
        }

        // Add to brunakerfi_customers map
        const bkEntry = {
          unit_count: 0,
          inspect_month: monthFinal,
          last_inspected: null,
          notes: tegund ? 'Tegund: ' + tegund : ''
        };
        if (window.AppSettings && window.AppSettings.path && window.AppSettings.save) {
          const cur = window.AppSettings.path('brunakerfi_customers') || {};
          cur[String(coId)] = Object.assign({}, cur[String(coId)] || {}, bkEntry, { co_id: coId });
          await window.AppSettings.save({ brunakerfi_customers: cur });
        }

        if (window.Toast && Toast.show) Toast.show('✓ ' + nafn + ' bætt við brunakerfi');
        close();
        try { if (window.Brunakerfi && Brunakerfi.show) Brunakerfi.show(); } catch (_) {}
      });
    });
  }

  // ── Boot: inject the drop-zone whenever the brunakerfi view renders ────
  function tryInject() {
    if (!document.querySelector('._bk-add')) return;
    injectDropZone();
  }
  // Initial attempt + observe for re-renders (Brunakerfi.show() wipes its
  // entire main on each load, so our zone needs to be re-injected each time).
  tryInject();
  const mo = new MutationObserver(() => tryInject());
  mo.observe(document.body, { childList: true, subtree: true });

  // Public API
  window.BrunakerfiDocImport = {
    processFiles,
    extractFields,
    extractTextFromPDF,
    detectSkill,
    getSkills: getAllSkills,
    getSkillById,
    openSkillsModal,
    showKtCollisionDialog,    // shared with patch 147's create dialog
    normalizeName,
    isChainKt,
    markAsChain,
    getChainKts,
    SKILLS // built-ins
  };
  console.log('[patch-151] brunakerfi doc-import skill registry installed — ' + SKILLS.length + ' built-in skill(s)');
})();
/* === END BRUNAKERFI DOC IMPORT === */
