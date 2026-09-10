#!/usr/bin/env node
/* Afrit af verkefnalisti-töflunni áður en verkefnastjórnar-hreinsunin hefst.
 * Read-only á Supabase; skrifar eina JSON-skrá í backups/.
 * Keyrsla:  node tools/_afrit-verkefnalisti.cjs
 */
const fs = require('fs');
const path = require('path');

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

(async () => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/verkefnalisti?select=*&order=id.asc`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` }
    });
    if (!r.ok) { console.error('Villa', r.status, await r.text()); process.exit(1); }
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    rows.push(...b);
    if (b.length < 1000) break;
  }

  const dir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, 'verkefnalisti-fyrir-hreinsun-20260910.json');
  fs.writeFileSync(out, JSON.stringify(rows, null, 1), 'utf8');

  const eftirStodu = {};
  for (const r of rows) eftirStodu[r.status] = (eftirStodu[r.status] || 0) + 1;
  console.log(`✅ Afrit vistað: ${out}`);
  console.log(`   ${rows.length} raðir alls —`, JSON.stringify(eftirStodu));
})();
