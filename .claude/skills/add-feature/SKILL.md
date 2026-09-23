---
name: add-feature
description: >
  How to add a feature to the Slökkvitæki app — the js/patches/NNN-name.js
  convention and the <script> tag in index.html, the self-contained IIFE pattern
  (getSB / esc / toast), how DB access works (window.DB.sb, publishable key,
  RLS-open tables), when to add a server-side Netlify function (AI/secret work),
  and how to verify the bundle before pushing. Use when adding any new view, board,
  button, or behavior to the app, or a new /api endpoint.
  Kveikjuorð: nýr flipi, nýtt borð, nýtt API, patch, add-feature.
---

# Add a feature — Slökkvitæki app

No framework, no bundler-at-author-time. A feature is a **new patch file plus a
script tag**; `build-dist.js` bundles them at deploy.

## Client feature = one new patch
1. New file `js/patches/NNN-name.js` — next free number (currently 308+; check
   `ls js/patches | grep -oE '^[0-9]+' | sort -n | tail`).
2. Wrap it as a **guarded IIFE** and expose a small API:
   ```js
   (() => {
     if (window.MyThing) return;
     const esc = (s) => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
     const getSB = () => (window.DB && window.DB.sb) || null;   // Supabase client
     // …CSS via an id-guarded <style>, modal via backdrop+panel divs on body…
     window.MyThing = { open };
   })();
   ```
   Good self-contained references: `js/patches/306-snoggskodun.js` (read-only modal),
   `js/patches/308-postur-ai-triage.js` (reads + writes + calls an /api function).
3. Add the tag in `index.html`, next to the others, cache-busted:
   ```html
   <script defer src="/js/patches/NNN-name.js?v=YYYYMMDDx"></script>
   ```
4. Deploy via `git push` → CI (see the **deploy** skill). Never edit the big
   bundles by hand.

## Teiknaðu þannig að viðmótið hoppi ekki (regla frá 23.09.2026)

Teiknir pappinn þinn lista með `rot.innerHTML = …` þá hverfur allt sem hékk í gamla trénu: skrunstaðan (líka lárétta
skrunið á síma), fókusinn í reitnum sem verið er að skrifa í og textavalið. Notandinn lendir aftur á topp listans eftir
hvern smell. Notaðu hjálparann `js/patches/388-stodugt-vidmot.js`:

```js
const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(rot) : null;
rot.innerHTML = …;
if (aftur) aftur();   // strax á eftir, í SAMA tifi
```

- **Bíddu með endurteikningu meðan notandinn skrifar** — teiknaðu við `focusout` í staðinn (`erAdSkrifa()` í 153).
- **Geymdu ekki ástand í DOM-inu einu** (hvaða kort eru opin o.þ.h.) — það tapast við hverja teikningu (`_opin` í 175).
- **Uppfærðu hnútinn sem breyttist** þegar gögn lenda, í stað þess að rífa hann út og byggja aftur. Hnútur sem hverfur
  og birtist aftur ER blikkið sem sést (`endurbyggjaArsreiti()` í 187). Mörg svör sem lenda á víxl → ein samandregin
  endurbygging.
- **Samtíma hleðslur eiga að deila einni sókn** (`_loadP`-mynstrið í 153 `loadAll()`), annars yfirskrifar síðasta svarið hin.

Sönnun á að teiknunarbreyting breyti engum rökum: taktu fingrafar af reitunum (klasar + texti), rífðu þá svo handvirkt
út í vafranum, láttu gömlu leiðina byggja þá upp á nýtt og berðu saman. Fingrafar milli tveggja SÍÐUHLEÐSLNA er
ómarktækt — hleðslararnir lenda á mismunandi tíma.

## Data access
- `window.DB.sb` is the Supabase client (publishable key from `js/config.js`).
- Many app tables (incl. `thjonustubeidni`) have **RLS disabled**, so the client can
  read/write them directly. New tables should mirror that access if the client needs
  them (RLS off + grants to anon/authenticated) — otherwise the client gets nothing.
- Additive schema changes (new nullable columns, new tables) are safe without a
  backup; destructive ones need a backup + Agnar's go-ahead.

## Server feature = a Netlify function (only when you need a secret)
AI calls, third-party API keys, anything that must stay off the client → a function
in `netlify/functions/`. v2 style, ESM:
```js
export default async (req) => { /* … */ };
export const config = { path: '/api/my-endpoint' };
```
- Model of record for an AI endpoint: `netlify/functions/tv-summary.js` /
  `postur-reply.js` / `postur-triage.js` — Haiku (`claude-haiku-4-5-20251001`),
  `ANTHROPIC_API_KEY`, the default-open `EDGE_SHARED_KEY` gate, `cors()`/`j()` helpers.
- `/api/*` calls auto-get the `x-eldklar-key` header from `js/patches/290-api-key-header.js`,
  so a new endpoint gets auth for free.

## Verify before you push
```bash
node --check js/patches/NNN-name.js        # syntax
node build-dist.js                          # bundles; must succeed
grep -rl "MyThing" dist/                    # confirm it bundled
```
Grep gotcha: esbuild writes broddstafir as `\uXXXX` in the bundle — unicode-escape
your Icelandic needle (`python3 -c "print('Sækja'.encode('unicode_escape').decode())"`)
or grep the source instead.
