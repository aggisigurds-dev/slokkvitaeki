# Bugbot — Slökkvitæki

Read [docs/ORYGGISNET.md](../docs/ORYGGISNET.md) before reviewing changes to deploy, functions, POS, payday, kennitala, or readiness.

On PRs that touch those areas, expect `node tools/audit-all.cjs` to have been run. A green audit is part of "safe to merge."

Never treat as fine a PR that touches invoice OUT (`10` / `233` / `254`), kennitala (`121` / `pos.js`), `payday-push.js`, or readiness (`153` / `187`) without a `netvordur` review.

Do not nag about Icelandic copy, always-allow-save drafts (Vista must not block on validation), or Verkefnalisti process.

UI language is Icelandic. Money is ISK integers.
