#!/usr/bin/env node
/* lotu-hookar.cjs — þunnt tengi fyrir lotu-hookana sem búa í brunaholf/tools (Agentakerfið 2.0).
 *
 *   node tools/lotu-hookar.cjs router   → brunaholf/tools/router.cjs       (UserPromptSubmit)
 *   node tools/lotu-hookar.cjs lok      → brunaholf/tools/lotu-lok.cjs     (Stop)
 *   node tools/lotu-hookar.cjs byrjun   → brunaholf/tools/lotu-byrjun.cjs  (SessionStart)
 *   node tools/lotu-hookar.cjs vordur   → brunaholf/tools/sidu-vordur.cjs  (PreToolUse Read|Edit|Write — síðuvörður, 04.11.2026)
 *   node tools/lotu-hookar.cjs deploy   → brunaholf/tools/deploy-vordur.cjs (PreToolUse Bash — stoppar ekkert, Lisbeth fer yfir deploy eftir á, 05.11.2026)
 *
 * Ein útgáfa af kóðanum (í brunaholf), svo hann sé ekki tvíritaður. brunaholf finnst sem systurmappa
 * eða með BH_REPO. Vanti hann á vélinni gerist EKKERT (exit 0) — hook má aldrei fella lotu. */
'use strict';
const fs = require('fs');
const path = require('path');
const BH = process.env.BH_REPO ? path.resolve(process.env.BH_REPO) : path.resolve(__dirname, '..', '..', 'brunaholf');
const SKRA = { router: 'router.cjs', lok: 'lotu-lok.cjs', byrjun: 'lotu-byrjun.cjs', vordur: 'sidu-vordur.cjs', deploy: 'deploy-vordur.cjs' }[process.argv[2]];
const f = SKRA && path.join(BH, 'tools', SKRA);
if (!f || !fs.existsSync(f)) process.exit(0);
try {
  require(f).keyra(process.argv.slice(3)).catch(() => process.exit(0));
} catch (_) { process.exit(0); }
