/* === VISUAL FORM BUILDER v1 ===
 *
 * Sjónrænn smiður fyrir Skjalasniðmát. Notandi raðar saman „blokkum"
 * (logo, fyrirsögn, texti, reitur, undirritun, tafla...) og kerfið
 * býr til HTML-sniðmáti sjálfvirkt. Vistast eins og venjuleg sniðmát í
 * AppSettings.skjalasnidmat (samstillt milli tækja).
 *
 * Blokk-týpur:
 *   🖼 Logo/Mynd      — upload mynd (vistuð sem base64 í sniðmáti)
 *   📰 Fyrirsögn 1    — stór titill
 *   📰 Fyrirsögn 2    — undirtitill
 *   📝 Málsgrein      — frjáls texti með {{reitir}} ef vill
 *   ✏️ Textareitur     — eins-línu input
 *   📄 Stór textareitur — multi-line input
 *   ☑️ Checkbox       — ja/nei valhnappur
 *   ✍️ Undirritun     — signature pad
 *   ⚏ Tafla           — sjálfvirkur uppsetning af reitum í dálkum
 *   ➖ Skiptilína       — láreitt strik
 *   ⏬ Bil             — hvítt rými á milli blokka
 *
 * Notkun:
 *   1. Samningar → Skjalasniðmát → 🛠 Smíða nýtt sniðmát
 *   2. Bætið blokkum með „+ Bæta við blokk"
 *   3. Stillið hverja blokk (texti, label, breidd)
 *   4. Færið til með ↑↓ takkum
 *   5. Forskoðun til hægri (lifandi)
 *   6. Smelltu Vista → birtist í Skjalasniðmát-listanum og nothæft
 */
(() => {
  if (window.__formBuilderInstalled) return;
  window.__formBuilderInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Block templates
  const BLOCK_TYPES = [
    { type: 'logo',     icon: '🖼',  label: 'Logo / mynd',          desc: 'Upload mynd (logo, banner)' },
    { type: 'h1',       icon: '📰',  label: 'Fyrirsögn (stór)',      desc: 'Stór titill' },
    { type: 'h2',       icon: '📋',  label: 'Fyrirsögn (lítil)',     desc: 'Undirtitill / kaflafyrirsögn' },
    { type: 'paragraph',icon: '📝',  label: 'Málsgrein',             desc: 'Frjáls texti með {{reitum}} ef vill' },
    { type: 'field',    icon: '✏️',  label: 'Textareitur (1 lína)',  desc: 'Reitur fyrir notanda að fylla út' },
    { type: 'longfield',icon: '📄',  label: 'Textareitur (margar línur)', desc: 'Multi-line input' },
    { type: 'checkbox', icon: '☑️',  label: 'Checkbox',              desc: 'Ja/nei valhnappur (☐ ☒)' },
    { type: 'signature',icon: '✍️',  label: 'Undirritun',            desc: 'Signature pad — drawable area' },
    { type: 'table',    icon: '⚏',   label: 'Tafla',                 desc: 'Tafla með reitum í dálkum' },
    { type: 'divider',  icon: '➖',   label: 'Skiptilína',            desc: 'Láreitt strik' },
    { type: 'spacer',   icon: '⏬',   label: 'Bil',                   desc: 'Hvítt rými milli blokka' }
  ];

  // ── Generate field key from label ────────────────────────────────────────
  function slugify(s, prefix) {
    let v = String(s || '')
      .toLowerCase()
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/[ý]/g, 'y')
      .replace(/[þ]/g, 'th').replace(/[ð]/g, 'd').replace(/[æ]/g, 'ae').replace(/[ö]/g, 'o')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!v) v = 'reitur';
    if (prefix && !v.startsWith(prefix)) v = prefix + v;
    return v;
  }

  // ── Convert blocks to template HTML ──────────────────────────────────────
  function blocksToHtml(blocks) {
    const inner = blocks.map(b => blockToHtml(b)).join('\n');
    return '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:780px;margin:0 auto;padding:28px 32px;background:#fff;border:2px solid #0f172a">\n' +
      inner +
      '\n</div>';
  }

  function blockToHtml(b) {
    switch (b.type) {
      case 'logo':
        return '<div style="text-align:' + (b.align || 'center') + ';margin:' + (b.marginTop || 4) + 'px 0 ' + (b.marginBottom || 4) + 'px;line-height:0">' +
          '<img src="' + (b.dataUrl || '/img/logo.png') + '" alt="logo" style="max-height:' + (b.maxHeight || 90) + 'px;max-width:100%;display:inline-block">' +
        '</div>';
      case 'h1':
        return '<div style="text-align:' + (b.align || 'center') + ';font-size:' + (b.fontSize || 24) + 'px;font-weight:800;margin:6px 0 8px;letter-spacing:0.3px">' + esc(b.text || 'Titill') + '</div>';
      case 'h2':
        return '<div style="text-align:' + (b.align || 'left') + ';font-size:' + (b.fontSize || 16) + 'px;font-weight:700;margin:6px 0 4px;color:#0f172a">' + esc(b.text || 'Fyrirsögn') + '</div>';
      case 'paragraph':
        // Allow {{placeholder}} inside text — preserve as-is
        return '<div style="font-size:' + (b.fontSize || 14) + 'px;line-height:1.7;margin:8px 0;text-align:' + (b.align || 'left') + ';white-space:pre-wrap">' + (b.text || '') + '</div>';
      case 'field': {
        const key = b.key || slugify(b.label, '');
        return '<div style="margin:10px 0;font-size:14px;line-height:1.6">' +
          (b.label ? '<strong>' + esc(b.label) + ':</strong> ' : '') +
          '{{' + key + '}}' +
        '</div>';
      }
      case 'longfield': {
        const key = b.key || slugify(b.label, '');
        return '<div style="margin:14px 0">' +
          (b.label ? '<div style="font-size:13px;font-weight:700;margin-bottom:5px">' + esc(b.label) + '</div>' : '') +
          '<div style="border:1px solid #cbd5e1;min-height:' + (b.minHeight || 60) + 'px;padding:10px 12px;font-size:13px;border-radius:4px;line-height:1.5;white-space:pre-wrap">{{' + key + '}}</div>' +
        '</div>';
      }
      case 'checkbox': {
        const key = b.key || slugify(b.label, 'chk_');
        return '<div style="margin:6px 0;font-size:14px;line-height:1.7">{{' + key + '}} &nbsp;' + esc(b.label || 'Valmynd') + '</div>';
      }
      case 'signature': {
        const key = b.key || slugify(b.label, 'sig_');
        return '<div style="margin:18px 0">' +
          '<div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">' + esc(b.label || 'Undirritun') + ':</div>' +
          '<div style="height:60px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{' + key + '}}</div>' +
          (b.printName ? '<div style="font-size:13px;margin-top:4px;font-weight:600">' + esc(b.printName) + '</div>' : '') +
        '</div>';
      }
      case 'table': {
        const cols = +b.cols || 2;
        const rows = +b.rows || 3;
        const baseKey = b.key || slugify(b.label || 'tafla', 'tbl_');
        let trs = '';
        for (let r = 0; r < rows; r++) {
          let tds = '';
          for (let c = 0; c < cols; c++) {
            const k = baseKey + '_r' + r + 'c' + c;
            tds += '<td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:13px">{{' + k + '}}</td>';
          }
          trs += '<tr>' + tds + '</tr>';
        }
        return '<div style="margin:14px 0">' +
          (b.label ? '<div style="font-size:13px;font-weight:700;margin-bottom:6px">' + esc(b.label) + '</div>' : '') +
          '<table style="width:100%;border-collapse:collapse"><tbody>' + trs + '</tbody></table>' +
        '</div>';
      }
      case 'divider':
        return '<hr style="border:none;border-top:' + (b.thickness || 1) + 'px ' + (b.style || 'solid') + ' #cbd5e1;margin:' + (b.margin || 18) + 'px 0">';
      case 'spacer':
        return '<div style="height:' + (b.height || 20) + 'px"></div>';
      default:
        return '';
    }
  }

  // ── Builder UI ───────────────────────────────────────────────────────────
  function openBuilder(existing) {
    const isEdit = !!existing;
    let blocks = existing && Array.isArray(existing._blocks) ? JSON.parse(JSON.stringify(existing._blocks)) : [];
    if (!blocks.length) {
      // Default scaffold so user has something to start with
      blocks = [
        { type: 'logo' },
        { type: 'h1', text: 'Titill skjals' },
        { type: 'paragraph', text: 'Hér kemur lýsing eða inngangur að skjalinu...' }
      ];
    }
    let name = existing ? existing.name : '';

    let dlg = document.getElementById('_fb-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_fb-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100100;background:rgba(15,23,42,0.7);display:flex;align-items:stretch;justify-content:center;padding:0';

    dlg.innerHTML =
      '<div style="background:#fff;width:100%;max-width:1400px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.35)">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div style="display:flex;align-items:center;gap:14px">' +
            '<h3 style="margin:0;font-size:17px;font-weight:700">🛠 Sjónrænn formsmiður</h3>' +
            '<input id="_fb-name" type="text" placeholder="Nafn sniðmáts" value="' + esc(name) + '" style="padding:7px 12px;border:1px solid #334155;border-radius:7px;font:inherit;font-size:13px;background:#1e293b;color:#fff;min-width:280px">' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button id="_fb-save" type="button" style="padding:8px 16px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700">✓ Vista sniðmát</button>' +
            '<button id="_fb-x" type="button" style="background:transparent;border:1px solid #475569;color:#cbd5e1;font-size:18px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
          '</div>' +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:240px 1fr 1fr;overflow:hidden;min-height:0">' +
          // Block palette
          '<div style="padding:14px;background:#f1f5f9;border-right:1px solid #e2e8f0;overflow:auto">' +
            '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">+ Bæta við blokk</div>' +
            '<div id="_fb-palette"></div>' +
          '</div>' +
          // Block list (editor)
          '<div style="padding:14px;overflow:auto;background:#fafafa;border-right:1px solid #e2e8f0">' +
            '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Blokkir í sniðmáti</div>' +
            '<div id="_fb-blocks"></div>' +
          '</div>' +
          // Live preview
          '<div style="padding:14px;overflow:auto;background:#e2e8f0">' +
            '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Forskoðun</div>' +
            '<div id="_fb-preview"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.querySelector('#_fb-x').addEventListener('click', () => {
      if (confirm('Loka án vistunar? Allt sem þú hefur breytt verður glatað.')) close();
    });

    // Render palette
    const palette = dlg.querySelector('#_fb-palette');
    palette.innerHTML = BLOCK_TYPES.map(b =>
      '<button class="_fb-add" data-type="' + esc(b.type) + '" type="button" ' +
        'style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 11px;margin-bottom:6px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;color:#0f172a;text-align:left">' +
        '<span style="font-size:18px">' + b.icon + '</span>' +
        '<span style="flex:1"><div style="font-weight:700">' + esc(b.label) + '</div><div style="color:#64748b;font-size:10px;margin-top:1px">' + esc(b.desc) + '</div></span>' +
      '</button>'
    ).join('');
    palette.querySelectorAll('._fb-add').forEach(btn => {
      btn.addEventListener('click', () => {
        addBlock(btn.dataset.type);
      });
    });

    function addBlock(type) {
      const newBlock = { type };
      // Sensible defaults
      if (type === 'h1') newBlock.text = 'Titill';
      else if (type === 'h2') newBlock.text = 'Undirfyrirsögn';
      else if (type === 'paragraph') newBlock.text = 'Skrifaðu hér...';
      else if (type === 'field') newBlock.label = 'Reitur';
      else if (type === 'longfield') { newBlock.label = 'Texti'; newBlock.minHeight = 70; }
      else if (type === 'checkbox') newBlock.label = 'Valmynd';
      else if (type === 'signature') { newBlock.label = 'Undirritun'; newBlock.printName = ''; }
      else if (type === 'table') { newBlock.label = 'Tafla'; newBlock.cols = 2; newBlock.rows = 3; }
      else if (type === 'spacer') newBlock.height = 20;
      blocks.push(newBlock);
      renderBlocks();
      renderPreview();
    }

    function renderBlocks() {
      const list = dlg.querySelector('#_fb-blocks');
      if (!blocks.length) {
        list.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px;background:#fff;border:1px dashed #cbd5e1;border-radius:8px">Engar blokkir enn — bætið við úr palettinu vinstra megin</div>';
        return;
      }
      list.innerHTML = blocks.map((b, i) => renderBlockEditor(b, i)).join('');

      // Wire all the inputs/buttons
      list.querySelectorAll('[data-block-idx]').forEach(card => {
        const idx = +card.dataset.blockIdx;
        // Up/Down/Delete
        card.querySelector('._fb-up')?.addEventListener('click', () => moveBlock(idx, -1));
        card.querySelector('._fb-down')?.addEventListener('click', () => moveBlock(idx, 1));
        card.querySelector('._fb-del')?.addEventListener('click', () => removeBlock(idx));
        // Field updates
        card.querySelectorAll('[data-prop]').forEach(inp => {
          const evt = inp.type === 'checkbox' ? 'change' : 'input';
          inp.addEventListener(evt, () => {
            const v = inp.type === 'checkbox' ? inp.checked : inp.value;
            blocks[idx][inp.dataset.prop] = (inp.type === 'number') ? +v : v;
            renderPreview();
          });
        });
        // Logo file input
        const fileInp = card.querySelector('._fb-logo-file');
        if (fileInp) {
          fileInp.addEventListener('change', e => {
            const file = fileInp.files && fileInp.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              alert('Mynd er stærri en 2 MB. Notaðu minni mynd.');
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              blocks[idx].dataUrl = reader.result;
              renderBlocks();
              renderPreview();
            };
            reader.readAsDataURL(file);
          });
        }
      });
    }

    function renderBlockEditor(b, i) {
      const meta = BLOCK_TYPES.find(x => x.type === b.type) || { icon: '?', label: b.type };
      const head =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#475569">' +
            '<span style="font-size:16px">' + meta.icon + '</span>' + esc(meta.label) +
          '</div>' +
          '<div style="display:flex;gap:3px">' +
            (i > 0 ? '<button class="_fb-up" type="button" title="Færa upp" style="background:#fff;border:1px solid #cbd5e1;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px">↑</button>' : '<span style="width:24px"></span>') +
            (i < blocks.length - 1 ? '<button class="_fb-down" type="button" title="Færa niður" style="background:#fff;border:1px solid #cbd5e1;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px">↓</button>' : '<span style="width:24px"></span>') +
            '<button class="_fb-del" type="button" title="Eyða" style="background:#fff;border:1px solid #fecaca;color:#dc2626;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:12px">✕</button>' +
          '</div>' +
        '</div>';

      let body = '';
      if (b.type === 'logo') {
        body = '<div style="display:flex;gap:8px;align-items:center">' +
          (b.dataUrl ? '<img src="' + b.dataUrl + '" style="max-width:80px;max-height:50px;border:1px solid #cbd5e1;border-radius:4px">' : '<div style="width:80px;height:50px;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#94a3b8">Engin mynd</div>') +
          '<div style="flex:1">' +
            '<input type="file" accept="image/*" class="_fb-logo-file" style="font-size:11px;width:100%">' +
            '<input type="number" data-prop="maxHeight" value="' + (b.maxHeight || 90) + '" placeholder="Hæð (px)" style="width:100%;padding:5px 7px;margin-top:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px">' +
            '<select data-prop="align" style="width:100%;padding:5px 7px;margin-top:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px">' +
              '<option value="left"' + (b.align==='left'?' selected':'') + '>Vinstri</option>' +
              '<option value="center"' + ((!b.align||b.align==='center')?' selected':'') + '>Miðja</option>' +
              '<option value="right"' + (b.align==='right'?' selected':'') + '>Hægri</option>' +
            '</select>' +
          '</div>' +
        '</div>';
      } else if (b.type === 'h1' || b.type === 'h2') {
        body = '<input type="text" data-prop="text" value="' + esc(b.text || '') + '" placeholder="Texti" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:13px;font-weight:600;box-sizing:border-box">' +
          '<select data-prop="align" style="width:100%;padding:5px 7px;margin-top:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px">' +
            '<option value="left"' + (b.align==='left'?' selected':'') + '>Vinstri</option>' +
            '<option value="center"' + ((b.type==='h1'?(!b.align||b.align==='center'):(b.align==='center'))?' selected':'') + '>Miðja</option>' +
            '<option value="right"' + (b.align==='right'?' selected':'') + '>Hægri</option>' +
          '</select>';
      } else if (b.type === 'paragraph') {
        body = '<textarea data-prop="text" rows="3" placeholder="Skrifaðu texta hér... þú getur notað {{reitir}} ef vill" style="width:100%;padding:7px 9px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;line-height:1.5;resize:vertical;box-sizing:border-box">' + esc(b.text || '') + '</textarea>';
      } else if (b.type === 'field' || b.type === 'longfield') {
        body = '<input type="text" data-prop="label" value="' + esc(b.label || '') + '" placeholder="Heiti reits (sýnt í forminu)" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;box-sizing:border-box">' +
          (b.type === 'longfield' ? '<input type="number" data-prop="minHeight" value="' + (b.minHeight || 60) + '" placeholder="Lágm. hæð (px)" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;box-sizing:border-box">' : '');
      } else if (b.type === 'checkbox') {
        body = '<input type="text" data-prop="label" value="' + esc(b.label || '') + '" placeholder="Texti við hliðina á checkbox-inum" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;box-sizing:border-box">';
      } else if (b.type === 'signature') {
        body = '<input type="text" data-prop="label" value="' + esc(b.label || '') + '" placeholder="Heiti undirritunar" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;box-sizing:border-box">' +
          '<input type="text" data-prop="printName" value="' + esc(b.printName || '') + '" placeholder="Nafn sem birtist undir undirrituninni (valkvætt)" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;box-sizing:border-box">';
      } else if (b.type === 'table') {
        body = '<input type="text" data-prop="label" value="' + esc(b.label || '') + '" placeholder="Heiti töflu" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;box-sizing:border-box">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:5px">' +
            '<input type="number" data-prop="rows" min="1" max="20" value="' + (b.rows || 3) + '" style="padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px" title="Línur"> ' +
            '<input type="number" data-prop="cols" min="1" max="6" value="' + (b.cols || 2) + '" style="padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px" title="Dálkar">' +
          '</div>';
      } else if (b.type === 'spacer') {
        body = '<input type="number" data-prop="height" value="' + (b.height || 20) + '" min="4" max="200" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;box-sizing:border-box" placeholder="Hæð (px)">';
      } else if (b.type === 'divider') {
        body = '<select data-prop="style" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;box-sizing:border-box">' +
          '<option value="solid"' + ((!b.style||b.style==='solid')?' selected':'') + '>Heilt strik</option>' +
          '<option value="dashed"' + (b.style==='dashed'?' selected':'') + '>Brot strik</option>' +
          '<option value="dotted"' + (b.style==='dotted'?' selected':'') + '>Punktastrik</option>' +
        '</select>';
      }

      return '<div data-block-idx="' + i + '" style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:8px">' + head + body + '</div>';
    }

    function moveBlock(idx, dir) {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= blocks.length) return;
      const t = blocks[idx];
      blocks[idx] = blocks[newIdx];
      blocks[newIdx] = t;
      renderBlocks();
      renderPreview();
    }
    function removeBlock(idx) {
      blocks.splice(idx, 1);
      renderBlocks();
      renderPreview();
    }

    function renderPreview() {
      dlg.querySelector('#_fb-preview').innerHTML = blocksToHtml(blocks);
    }

    renderBlocks();
    renderPreview();

    // Save
    dlg.querySelector('#_fb-save').addEventListener('click', async () => {
      const newName = dlg.querySelector('#_fb-name').value.trim();
      if (!newName) { alert('Sláðu inn nafn á sniðmáti.'); return; }
      if (!blocks.length) { alert('Bæta þarf við að minnsta kosti einni blokk.'); return; }
      const html = blocksToHtml(blocks);
      const t = {
        id: existing ? existing.id : ('user_fb_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)),
        name: newName,
        type: 'eigid',
        html,
        _blocks: blocks, // store for re-edit later
        created_at: existing ? existing.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (window.AppSettings && window.AppSettings.save) {
        const stored = window.AppSettings.path('skjalasnidmat') || [];
        const list = Array.isArray(stored) ? stored.slice() : [];
        const idx = list.findIndex(x => x.id === t.id);
        if (idx >= 0) list[idx] = t; else list.push(t);
        const ok = await window.AppSettings.save({ skjalasnidmat: list });
        if (ok) {
          if (window.Toast && Toast.show) Toast.show('✓ Sniðmát vistað');
          // Refresh templates section if visible
          if (window.DocTemplates && window.DocTemplates.refresh) window.DocTemplates.refresh();
          close();
        } else {
          alert('Villa við vistun.');
        }
      } else {
        alert('AppSettings ekki tilbúið');
      }
    });
  }

  // ── Inject "🛠 Smíða nýtt sniðmát" button into Skjalasniðmát section ───
  function injectButton() {
    const section = document.querySelector('._dt-section');
    if (!section) return;
    if (section.querySelector('._fb-launch')) return;
    // Find the "+ Bæta við sniðmáti" button and insert before it
    const addBtn = section.querySelector('._dt-add');
    if (!addBtn) return;
    const fbBtn = document.createElement('button');
    fbBtn.className = '_fb-launch btn btn-primary';
    fbBtn.type = 'button';
    fbBtn.style.cssText = 'padding:9px 16px;margin-right:6px;background:#7c3aed;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700';
    fbBtn.innerHTML = '🛠 Smíða nýtt sniðmát';
    fbBtn.addEventListener('click', e => {
      e.stopPropagation();
      openBuilder(null);
    });
    addBtn.parentElement.insertBefore(fbBtn, addBtn);

    // Also: if any user template was built with the form builder (has _blocks),
    // wire its edit button to the form builder instead of the HTML editor.
    const list = (window.AppSettings && window.AppSettings.path('skjalasnidmat')) || [];
    if (Array.isArray(list)) {
      section.querySelectorAll('._dt-edit').forEach(btn => {
        if (btn.dataset._fbWired) return;
        btn.dataset._fbWired = '1';
        const id = btn.dataset.id;
        const t = list.find(x => x.id === id);
        if (t && Array.isArray(t._blocks)) {
          // Replace click handler — open form builder
          btn.addEventListener('click', e => {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            openBuilder(t);
          }, true);
        }
      });
    }
  }

  setInterval(injectButton, 1000);

  window.FormBuilder = { open: openBuilder };

  console.log('[form-builder] installed — 🛠 Smíða nýtt sniðmát button on Skjalasniðmát');
})();
/* === END VISUAL FORM BUILDER v1 === */
