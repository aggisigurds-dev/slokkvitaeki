// Full Supabase data backup. Exports every table to timestamped JSON
// files inside `backups/YYYY-MM-DD_HHMMSS/`. Safe to run anytime — pure
// read-only against the live DB, no writes.
//
// Usage:
//   node backup-supabase.mjs
//
// To restore a single table from a backup (manual, careful):
//   POST the JSON rows back to /rest/v1/<table> with Prefer:resolution=ignore-duplicates
import fs from 'fs';
import path from 'path';

const URL = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const TABLES = [
  'fyrirtaeki',
  'vidskiptavinir',
  'solur',
  'sala_transactions',
  'verkbeidnir',
  'uttaeki',
  'lanstaeki',
  'vorur',
  'verkdagbok',
  'app_settings',
  'thjonustusamningar',
  'birgdir'
];

function ts() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) +
         '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}

const stamp = ts();
const outDir = path.join('backups', stamp);
fs.mkdirSync(outDir, { recursive: true });
console.log(`Backing up to: ${outDir}\n`);

// PostgREST defaults to 1000 rows/page. We paginate using Prefer:count=exact
// to know the total, then loop Range headers.
async function fetchAll(table) {
  const url = `${URL}/rest/v1/${table}?select=*`;
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const r = await fetch(url, {
      headers: Object.assign({}, H, {
        Range: `${from}-${from + PAGE - 1}`,
        'Range-Unit': 'items',
        Prefer: 'count=exact'
      })
    });
    if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
    const rows = await r.json();
    all.push(...rows);
    const contentRange = r.headers.get('content-range') || '';
    // Format: "0-999/12345"
    const m = contentRange.match(/\/(\d+)/);
    const total = m ? parseInt(m[1], 10) : all.length;
    if (all.length >= total || rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

const summary = {
  taken_at: new Date().toISOString(),
  supabase_project: 'osfdzskyvisifcwyjkuk',
  tables: {}
};

for (const table of TABLES) {
  process.stdout.write(`  ${table.padEnd(22)}  `);
  try {
    const rows = await fetchAll(table);
    const file = path.join(outDir, table + '.json');
    fs.writeFileSync(file, JSON.stringify(rows, null, 2));
    const sizeKB = Math.round(fs.statSync(file).size / 1024);
    summary.tables[table] = { count: rows.length, file: table + '.json', size_kb: sizeKB };
    console.log(`${String(rows.length).padStart(6)} rows  ${String(sizeKB).padStart(6)} KB  ✓`);
  } catch (e) {
    summary.tables[table] = { error: e.message };
    console.log(`✗ ${e.message.slice(0, 80)}`);
  }
}

// Write summary
fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify(summary, null, 2));

// Also dump a flat "restore-helper" README
const readme = `# Backup ${stamp}

Restored from Supabase project \`osfdzskyvisifcwyjkuk\` on ${summary.taken_at}.

## Files

${Object.entries(summary.tables).map(([t, s]) => s.error ? `- **${t}** — ERROR: ${s.error}` : `- **${t}.json** — ${s.count.toLocaleString()} rows, ${s.size_kb.toLocaleString()} KB`).join('\n')}

## Restoring

Each \`*.json\` is an array of rows exactly as returned by Supabase REST.
To restore a single row, POST it to the table:

    curl -X POST 'https://osfdzskyvisifcwyjkuk.supabase.co/rest/v1/TABLE' \\
      -H 'apikey: \${KEY}' -H 'Authorization: Bearer \${KEY}' \\
      -H 'Content-Type: application/json' \\
      -d @row.json

For full-table restore use Supabase Studio's SQL Editor with a careful
\`INSERT ... ON CONFLICT DO NOTHING\` from the JSON. Don't blindly bulk-restore
without checking foreign keys and triggers.

## Quick row count check

\`\`\`bash
for f in *.json; do echo "$(basename $f .json): $(jq length $f) rows"; done
\`\`\`
`;
fs.writeFileSync(path.join(outDir, 'README.md'), readme);

const totalSize = Object.values(summary.tables).reduce((s, x) => s + (x.size_kb || 0), 0);
const totalRows = Object.values(summary.tables).reduce((s, x) => s + (x.count || 0), 0);
console.log(`\n✅ Backup complete: ${totalRows.toLocaleString()} rows across ${Object.keys(summary.tables).length} tables, ${Math.round(totalSize/1024 * 10)/10} MB`);
console.log(`📂 ${outDir}`);
