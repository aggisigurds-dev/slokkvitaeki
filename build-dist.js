// build-dist.js — assemble the public publish folder (./dist) for Netlify.
//
// The GitHub Action deploys ./dist (this output) together with the functions in
// netlify/functions via the Netlify CLI. We copy only publishable files here so
// secrets never ship: CLAUDE.md (Netlify token + Supabase info), *.sql schema,
// _* PII/source assets, CI config and the function *source* all stay OUT of the
// public bundle — mirroring the old deploy.js exclusion rules.
import { readdirSync, statSync, mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

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
  '.mcp.json',                             // MCP-uppsetning fyrir Claude Code — innri stilling
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

bundleIndexHtml();
stampBuild();

// ── Byggingar-stimpill (2026-07-30) ────────────────────────────────────────
// „Virkar hjá þér en ekki hjá mér" kostaði heilan dag: framleiðslan flakkaði
// milli tveggja deploy-leiða (lagað í #524) og enginn gat séð HVAÐA útgáfu
// vafrinn var með. Nú ber hver bygging sýnilegt auðkenni:
//   window.BUILD = { commit, time }  →  líka í <meta name="build">
// Patch 292 birtir það í Stillingum + `BUILD` í console. Þannig er hægt að
// bera saman á 5 sekúndum hvort tvö tæki keyri sama kóða.
function stampBuild() {
  const indexPath = join(OUT, 'index.html');
  let commit = '';
  try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) {}
  // Netlify-byggingar hafa ekki alltaf .git → falla á umhverfisbreytu CI-anna.
  if (!commit) commit = (process.env.COMMIT_REF || process.env.GITHUB_SHA || '').slice(0, 7);
  const time = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const stamp = '<meta name="build" content="' + commit + ' · ' + time + '">' +
    '<script>window.BUILD={commit:"' + commit + '",time:"' + time + '"};' +
    'try{console.log("[BUILD] "+window.BUILD.commit+" · "+window.BUILD.time);}catch(e){}</script>';
  let html = readFileSync(indexPath, 'utf8');
  if (html.includes('name="build"')) return;
  html = html.replace('</head>', stamp + '</head>');
  writeFileSync(indexPath, html);
  // Sama auðkenni í örsmárri skrá sem útgáfu-vaktin (patch 293) sækir reglulega
  // án þess að hlaða alla index.html. Þetta er eina leiðin fyrir OPINN flipa að
  // vita að nýrri kóði sé kominn — annars situr notandinn með gamla útgáfu og
  // heldur að lagfæring hafi ekki skilað sér („ennþá tómt", 30.07).
  writeFileSync(join(OUT, 'build.json'), JSON.stringify({ commit, time }) + '\n');
  console.log('build-dist: stimplað ' + (commit || '(engin commit-vísun)') + ' · ' + time);
}

// ── Bundle same-origin scripts in dist/index.html ──────────────────────────
// PERF (2026-06-20): the app declares ~256 separate <script src> tags — each a
// render-blocking request the browser must fetch, parse and run before the app
// is ready. We concatenate every run of CONSECUTIVE same-origin scripts into one
// minified bundle and point a single <script> at it. Inline <script> blocks and
// cross-origin/CDN scripts (supabase, jsQR) stay exactly where they are, so the
// global execution ORDER is byte-for-byte identical to before — only the
// packaging changes. The SOURCE repo (index.html + js/*) is left untouched; this
// only rewrites the PUBLISHED dist/ copy, so adding a feature is still "drop a
// js/patches/NN-*.js file + a <script> tag" exactly as today.
//
// Safety: if a referenced file is missing we leave that run unbundled; if esbuild
// isn't reachable we ship the (unminified) concatenation. Either way the build
// still produces a working dist/. The original per-file js/* are also still
// copied into dist/ (just no longer referenced), so any dynamic path use keeps
// working.
function bundleIndexHtml() {
  const indexPath = join(OUT, 'index.html');
  if (!existsSync(indexPath)) return;
  const html = readFileSync(indexPath, 'utf8');

  // Split the document into an ordered list of html-gaps and <script> tags.
  const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const parts = [];
  let last = 0, m;
  while ((m = tagRe.exec(html))) {
    if (m.index > last) parts.push({ t: 'html', s: html.slice(last, m.index) });
    const attrs = m[1] || '', body = m[2] || '';
    const srcM = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const src = srcM ? srcM[1] : null;
    const local = src && !/^https?:\/\//i.test(src) && !/^\/\//.test(src);
    // `defer` scripts ARE bundleable (2026-07-15) — the ~234 /js/patches/*.js are
    // all `defer`, so excluding them left them as individual requests (250 res,
    // ~3s load). We bundle defer scripts into their OWN defer bundle (separate
    // from non-defer runs) so execution order + timing stay identical.
    const isDefer = /\bdefer\b/i.test(attrs);
    const special = /\basync\b/i.test(attrs) || /type\s*=\s*["']module["']/i.test(attrs);
    const bundleable = !!(src && local && !special && body.trim() === '');
    parts.push({ t: 'script', raw: m[0], src, bundleable, defer: isDefer });
    last = tagRe.lastIndex;
  }
  if (last < html.length) parts.push({ t: 'html', s: html.slice(last) });

  const out = [];
  let run = [];
  let seq = 0;
  let bundledScripts = 0;

  function flush() {
    if (run.length >= 2) {
      let code = '';
      let ok = true;
      for (const s of run) {
        const rel = s.src.replace(/^\//, '').split('?')[0];
        try {
          code += '\n/* ' + rel + ' */\n' + readFileSync(join(OUT, rel), 'utf8') + '\n;\n';
        } catch (e) {
          console.warn('[bundle] missing ' + rel + ' — leaving this run unbundled');
          ok = false; break;
        }
      }
      if (!ok) { run.forEach(r => out.push(r.raw)); run = []; return; }
      const hash = createHash('md5').update(code).digest('hex').slice(0, 10);
      const fname = 'js/_bundle-' + (seq++) + '.' + hash + '.js';
      const fpath = join(OUT, fname);
      writeFileSync(fpath, code);
      try {
        execSync('npx --yes esbuild "' + fpath + '" --minify --legal-comments=none --allow-overwrite "--outfile=' + fpath + '"', { stdio: ['ignore', 'ignore', 'ignore'] });
      } catch (e) {
        console.warn('[bundle] esbuild unavailable — shipping ' + fname + ' unminified');
      }
      bundledScripts += run.length;
      out.push('<script' + (run[0] && run[0].defer ? ' defer' : '') + ' src="/' + fname + '"></script>');
    } else if (run.length === 1) {
      out.push(run[0].raw);
    }
    run = [];
  }

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.t === 'script' && p.bundleable) {
      // A run must be homogeneous in defer-ness (defer executes after parse,
      // non-defer inline) so a defer↔non-defer boundary flushes first.
      if (run.length && run[0].defer !== p.defer) flush();
      run.push(p);
      continue;
    }
    // Whitespace — or HTML comments, e.g. "hibernated" markers left where a
    // disabled patch's <script> used to be — between two bundleable scripts can
    // be absorbed into the bundle without breaking the run (so hibernating a
    // patch doesn't fragment the bundle into many small files).
    if (p.t === 'html' && p.s.replace(/<!--[\s\S]*?-->/g, '').trim() === '' && run.length) {
      const next = parts[i + 1];
      if (next && next.t === 'script' && next.bundleable && next.defer === run[0].defer) continue;
    }
    flush();
    out.push(p.t === 'html' ? p.s : p.raw);
  }
  flush();

  writeFileSync(indexPath, out.join(''));
  console.log('build-dist: bundled ' + bundledScripts + ' scripts into ' + seq + ' minified file(s)');
}
