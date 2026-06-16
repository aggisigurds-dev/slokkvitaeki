// build-dist.js — assemble the public publish folder (./dist) for Netlify.
//
// The GitHub Action deploys ./dist (this output) together with the functions in
// netlify/functions via the Netlify CLI. We copy only publishable files here so
// secrets never ship: CLAUDE.md (Netlify token + Supabase info), *.sql schema,
// _* PII/source assets, CI config and the function *source* all stay OUT of the
// public bundle — mirroring the old deploy.js exclusion rules.
import { readdirSync, statSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'dist');

// Directories never published.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.github', '.netlify', '.vscode', '.idea',
  'tmp', 'scratch', '.claude', 'backups', 'dist', 'netlify',
]);
// Exact filenames never published.
const SKIP_FILES = new Set([
  '.DS_Store', 'Thumbs.db', 'desktop.ini', '.gitignore', '.env', '.env.local',
  'package.json', 'package-lock.json', 'deploy.js', 'build-dist.js', 'verify.js',
  'backup-supabase.mjs', 'netlify.toml',
]);

function publishable(name) {
  if (SKIP_FILES.has(name)) return false;
  if (/\.md$/i.test(name)) return false;   // CLAUDE.md (secrets!), BACKLOG.md, *.md notes
  if (name.startsWith('_')) return false;  // local PII / source assets
  if (/^tmp_/.test(name)) return false;    // migration scratch
  if (/\.sql$/i.test(name)) return false;  // schema migrations
  return true;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { yield* walk(full); continue; }
    if (!publishable(name)) continue;
    yield relative(ROOT, full);
  }
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
let n = 0;
for (const rel of walk(ROOT)) {
  const dst = join(OUT, rel);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(ROOT, rel), dst);
  n++;
}
console.log(`build-dist: copied ${n} files into dist/  (functions ship separately from netlify/functions)`);
