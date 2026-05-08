// deploy.js — Push the entire project folder to Netlify.
//
// Usage:  node deploy.js
//
// Reads NETLIFY_TOKEN and NETLIFY_SITE from environment, falling back to
// the values hardcoded below (only safe because this is a personal repo).
//
// What it does:
//   1. Walks the project folder, skipping node_modules / .git / etc.
//   2. SHA-1 hashes every file (Netlify's content addressing).
//   3. POSTs a deploy spec listing { path: sha1 } for every file.
//   4. PUTs each "required" file (changed since last deploy) one at a time.
//   5. Polls the deploy until state === "ready" and reports the URL.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const TOKEN = process.env.NETLIFY_TOKEN;
const SITE  = process.env.NETLIFY_SITE || 'd22039b2-75f2-4206-b543-7c6176f2d181';
if (!TOKEN) {
  console.error('NETLIFY_TOKEN env var is not set.');
  console.error('PowerShell:  $env:NETLIFY_TOKEN = "nfp_xxxxx"; node deploy.js');
  console.error('CMD:         set NETLIFY_TOKEN=nfp_xxxxx && node deploy.js');
  process.exit(1);
}
const API   = 'https://api.netlify.com/api/v1';
const ROOT  = process.cwd();

const SKIP_DIRS = new Set(['node_modules', '.git', '.netlify', '.vscode', '.idea', 'tmp', 'scratch', '.claude']);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini', '.gitignore', '.env', '.env.local', 'package.json', 'package-lock.json', 'deploy.js', 'verify.js']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full);
    if (SKIP_DIRS.has(name)) continue;
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (
      !SKIP_FILES.has(name) &&
      !/\.md$/i.test(name) &&
      !name.startsWith('_') &&     // local scratch / source assets (e.g. _customer-import-data.json, _logo2.jpg) — may contain PII
      !/\.sql$/i.test(name)        // schema migrations, run via Supabase SQL Editor — never serve publicly
    ) yield rel;
  }
}

function sha1(buf) {
  return createHash('sha1').update(buf).digest('hex');
}

async function main() {
  console.log(`Reading files from ${ROOT}...`);
  const manifest = {};
  const buffers  = {};
  for (const rel of walk(ROOT)) {
    const buf = readFileSync(join(ROOT, rel));
    const path = '/' + rel.split(sep).join('/');
    manifest[path] = sha1(buf);
    buffers[path]  = buf;
  }
  console.log(`  ${Object.keys(manifest).length} files`);

  console.log('Creating deploy...');
  const r = await fetch(`${API}/sites/${SITE}/deploys`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: manifest, async: false })
  });
  if (!r.ok) { console.error(await r.text()); process.exit(1); }
  const deploy = await r.json();
  console.log(`  deploy id: ${deploy.id}`);
  console.log(`  required uploads: ${(deploy.required || []).length}`);

  for (const sha of (deploy.required || [])) {
    const path = Object.keys(manifest).find(p => manifest[p] === sha);
    if (!path) continue;
    process.stdout.write(`  uploading ${path} ... `);
    const u = await fetch(`${API}/deploys/${deploy.id}/files${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/octet-stream' },
      body: buffers[path]
    });
    console.log(u.ok ? 'OK' : `FAIL (${u.status})`);
    if (!u.ok) process.exit(1);
  }

  // Poll until ready
  for (let i = 0; i < 30; i++) {
    await new Promise(res => setTimeout(res, 1000));
    const c = await fetch(`${API}/deploys/${deploy.id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const dc = await c.json();
    if (dc.state === 'ready') {
      console.log(`\n✅ Deploy ready!`);
      console.log(`   URL:   ${dc.ssl_url}`);
      console.log(`   Admin: ${dc.admin_url}`);
      return;
    }
    if (dc.state === 'error') {
      console.error('\n❌ Deploy errored:', dc.error_message);
      process.exit(1);
    }
  }
  console.warn('Timed out waiting for deploy to become ready.');
}

main().catch(err => { console.error(err); process.exit(1); });
