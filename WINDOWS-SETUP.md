# Windows setup — Slökkvitæki + Claude Code

This is the one-time setup. ~15 minutes total.

---

## 1. Install Node.js (5 min)

1. Open https://nodejs.org/en/download
2. Click the **Windows Installer (.msi)** — pick the LTS version (currently 20.x)
3. Run the installer — accept all defaults
4. Open **PowerShell** (press Win, type "PowerShell", Enter)
5. Verify by typing:
   ```powershell
   node --version
   npm --version
   ```
   Both should print version numbers (e.g., `v20.18.0` and `10.8.2`).

If `node` is not recognized, close PowerShell and reopen it (PATH refresh).

---

## 2. Install Claude Code (2 min)

In the same PowerShell window:

```powershell
npm install -g @anthropic-ai/claude-code
```

Verify:
```powershell
claude --version
```

(If npm complains about permissions, right-click PowerShell and pick "Run as administrator", then retry.)

---

## 3. Install Git (3 min — needed for version history)

1. Open https://git-scm.com/download/win
2. Download and run the installer — accept all defaults except:
   - On the "Default editor" page, pick **"Use Notepad"** (simplest) or your preferred editor
3. Verify in PowerShell:
   ```powershell
   git --version
   ```

---

## 4. Download the live Slökkvitæki site (3 min)

1. Open https://app.netlify.com/sites/slokkvitaeki/deploys in your browser
2. The top deploy is the latest — click it
3. Click **"Download deploy as zip"** (right side of the page)
4. Move the ZIP to a folder you'll remember, e.g.:
   ```
   C:\projects\
   ```
5. Right-click the ZIP → **Extract All** → into `C:\projects\slokkvitaeki`
6. You should see folders like `js/`, `css/`, files like `index.html`

---

## 5. Drop the setup pack into the project folder (2 min)

From the Drive backup folder I uploaded these to, download:

- `CLAUDE.md`
- `package.json`
- `deploy.js`
- `.gitignore`

Copy all four into `C:\projects\slokkvitaeki\` (alongside `index.html`).

---

## 6. Initialize Git (1 min)

In PowerShell:

```powershell
cd C:\projects\slokkvitaeki
git init
git add -A
git commit -m "initial import from Netlify deploy 69f5bd79"
```

You now have a local backup with full history. Every future change is `git add` + `git commit`.

---

## 7. Start Claude Code (30 sec)

```powershell
cd C:\projects\slokkvitaeki
claude
```

First time it'll ask you to log in via browser. Do that.

When the prompt appears, your first message should be:

> Read CLAUDE.md and tell me what you think we should do first.

It will read the doc, summarize the situation, and propose splitting `js/patch-master.js` as the first task. Say yes and watch it work — much faster than the browser dance.

---

## 8. Test the new deploy script (1 min)

Before you make any changes, test that the deploy script works on the unchanged code:

```powershell
node deploy.js
```

This should:
- Read all your files
- Hash them
- Detect that nothing changed (or only one or two files)
- Push a deploy that's identical to what's already live

If you see "✅ Deploy ready!" — you're done. The new workflow works.

---

## Common issues

**"npm: command not found"** → Node didn't install correctly, or PowerShell needs restart. Close all PowerShell windows and reopen.

**"claude: command not found"** → npm's global folder isn't on PATH. Run:
```powershell
npm config get prefix
```
Add the printed path to your Windows PATH (Settings → System → About → Advanced system settings → Environment Variables → Path → Edit → New).

**"git: command not found"** → Same as above for Git. Reinstall and pick "Git from the command line and also from 3rd-party software" during install.

**Deploy script says "401 Unauthorized"** → The Netlify token is in `deploy.js` near the top. If it's been rotated, replace it.

---

## Going further (after first session)

- Tell Claude Code: "Set up a private GitHub repo for this and push to it" — then your code is backed up on GitHub too.
- Tell Claude Code: "Run the pending Verkdagbok attachments SQL on Supabase" — it can install `supabase` CLI and run it for you.
