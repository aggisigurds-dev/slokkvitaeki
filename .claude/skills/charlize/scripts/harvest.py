#!/usr/bin/env python3
"""
Charlize harvest — skannar möppu af artifacts og býr til SQL fyrir
charlize_artifacts (skráin) og charlize_inbox (kandídatar til yfirferðar).

Skrifar EKKERT í charlize_knowledge. Ekkert fer inn án samþykkis.

Notkun:
    python harvest.py "C:\\projects\\brunaholf" --system brunaholf
    python harvest.py ~/cowork-workspace --system cowork --out uppskera.sql
    python harvest.py . --system annad --max-files 200

Keyrðu EINA möppu í einu og yfirfarðu áður en næsta er tekin.
"""

import argparse, hashlib, os, re, sys
from datetime import datetime, timezone

SKIP_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", ".venv",
             "venv", ".next", "coverage", ".cache", "graphify-out"}

KINDS = {".js": "js", ".mjs": "js", ".ts": "js", ".gs": "gs", ".py": "py",
         ".html": "html", ".htm": "html", ".sql": "sql", ".md": "md",
         ".json": "json", ".sh": "sh", ".ps1": "ps1", ".css": "css"}

# Lykla-mynstur. Skrá sem inniheldur eitthvað af þessu fer aldrei óskoðuð í biðstofuna.
SECRETS = [
    (re.compile(r"nfp_[A-Za-z0-9]{20,}"), "Netlify PAT"),
    (re.compile(r"sk-[A-Za-z0-9_\-]{20,}"), "API key"),
    (re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}"), "JWT"),
    (re.compile(r"AIza[A-Za-z0-9_\-]{30,}"), "Google API key"),
    (re.compile(r"(?i)(password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]\s*['\"][^'\"]{6,}"), "credential"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "private key"),
]

# Athugasemdir sem gefa til kynna raunverulegan lærdóm, ekki bara kóða.
FLAGS = re.compile(
    r"(?i)\b(MIKILVÆGT|MIKILVAEGT|ATH|ATHUGA|VARÚÐ|VARUD|WARNING|CAUTION|GOTCHA|"
    r"HACK|FIXME|NOTE|BEWARE|virkar ekki|ekki nota|ekki eyða|ekki breyta|"
    r"do not|don't use|deprecated|úrelt|urelt|workaround|kom í ljós|lærdómur)\b"
)

# Föst ID sem eru þess virði að skrá (Drive-möppur, Sheets, Supabase, Netlify site).
IDS = re.compile(r"['\"]([A-Za-z0-9_\-]{20,60})['\"]")
ID_HINT = re.compile(r"(?i)(folder|sheet|spreadsheet|site|project|doc|drive|table|_id\b)")

# Nöfn sem lykta af úreltri afritun.
STALE = re.compile(r"(?i)(gamalt|gamalt|old|backup|bak|copy|afrit|_v\d|\bv\d\b|tmp|temp|test|prufa|draft|drög)")

COMMENT = re.compile(r"^\s*(//|#|--|/\*|\*|<!--)\s?")


def sha1(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def q(s):
    """SQL-strengur eða NULL."""
    if s is None or s == "":
        return "null"
    return "'" + str(s).replace("'", "''") + "'"


def purpose_of(lines):
    """Fyrsta merkingarbæra athugasemdin eða titill efst í skrá."""
    for ln in lines[:25]:
        t = ln.strip()
        if not t:
            continue
        if t.startswith(("#!", "'use strict", "import ", "const ", "let ", "var ")):
            continue
        m = re.match(r"^\s*#\s+(.+)", t)          # markdown h1
        if m:
            return m.group(1)[:200]
        m = re.match(r"^<title>(.+?)</title>", t, re.I)
        if m:
            return m.group(1)[:200]
        if COMMENT.match(t):
            body = COMMENT.sub("", t).strip(" *-/<!>")
            if len(body) > 12:
                return body[:200]
    return None


def scan_file(path, root, system):
    ext = os.path.splitext(path)[1].lower()
    kind = KINDS.get(ext)
    if not kind:
        return None
    try:
        st = os.stat(path)
        if st.st_size > 2_000_000:
            return None
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
    except OSError:
        return None

    lines = text.splitlines()
    rel = os.path.relpath(path, root)

    found_secrets = sorted({label for rx, label in SECRETS if rx.search(text)})

    art = {
        "path": path, "filename": os.path.basename(path), "kind": kind,
        "system": system, "hash": sha1(path), "bytes": st.st_size,
        "modified": datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat(timespec="seconds"),
        "purpose": purpose_of(lines),
        "status": "unknown",
        "notes": None,
    }
    if STALE.search(art["filename"]):
        art["status"] = "unknown"
        art["notes"] = "nafn bendir til afrits/úreltrar útgáfu — staðfesta"
    if found_secrets:
        art["notes"] = ((art["notes"] + "; ") if art["notes"] else "") + \
                       "INNIHELDUR LEYNDARMÁL (" + ", ".join(found_secrets) + ") — hreinsa"

    facts = []
    if not found_secrets:                      # engir kandídatar úr skrá með lykla
        prose = kind in ("md", "html")
        seen = set()
        for i, ln in enumerate(lines, 1):
            t = ln.strip()
            if len(t) < 15 or len(t) > 400:
                continue
            if prose:
                # Í markdown/html er textinn sjálfur efnið — fyrirsagnir eru ekki staðreyndir.
                if t.startswith("#") or t.startswith("|") or not FLAGS.search(t):
                    continue
                body = re.sub(r"^[-*>\s]+", "", t).strip(" *_`")
            elif FLAGS.search(t) and COMMENT.match(t):
                body = COMMENT.sub("", t).strip(" */<!->")
            else:
                if ID_HINT.search(t):
                    m = IDS.search(t)
                    if m and not any(c in m.group(1) for c in "/ "):
                        key = m.group(1)
                        if key not in seen:
                            seen.add(key)
                            facts.append((i, t[:300], "id"))
                continue
            if len(body) > 14 and body.lower() not in seen:
                seen.add(body.lower())
                facts.append((i, body[:400], "athugasemd"))
    return art, facts, rel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--system", default="annad",
                    help="slokkvitaeki | brunaholf | luna-bridge | cowork | annad")
    ap.add_argument("--out", default="uppskera.sql")
    ap.add_argument("--max-files", type=int, default=400)
    ap.add_argument("--max-facts-per-file", type=int, default=8)
    a = ap.parse_args()

    root = os.path.abspath(a.root)
    arts, all_facts, skipped = [], [], 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            if len(arts) >= a.max_files:
                skipped += 1
                continue
            res = scan_file(os.path.join(dirpath, fn), root, a.system)
            if not res:
                continue
            art, facts, rel = res
            arts.append(art)
            for line_no, body, why in facts[:a.max_facts_per_file]:
                all_facts.append((art, line_no, body, why))

    with open(a.out, "w", encoding="utf-8") as f:
        f.write(f"-- Charlize uppskera {datetime.now():%Y-%m-%d %H:%M}\n")
        f.write(f"-- rót: {root}\n-- kerfi: {a.system}\n")
        f.write(f"-- {len(arts)} skrár, {len(all_facts)} kandídatar"
                f"{f', {skipped} sleppt (max-files)' if skipped else ''}\n\n")

        f.write("-- ── Artifact-skrá ──\n")
        for x in arts:
            f.write(
                "insert into charlize_artifacts "
                "(path, filename, content_hash, kind, system, purpose, status, bytes, modified_at, notes) values ("
                f"{q(x['path'])}, {q(x['filename'])}, {q(x['hash'])}, {q(x['kind'])}, {q(x['system'])}, "
                f"{q(x['purpose'])}, {q(x['status'])}, {x['bytes']}, {q(x['modified'])}, {q(x['notes'])}) "
                "on conflict (path) do update set content_hash=excluded.content_hash, "
                "purpose=coalesce(charlize_artifacts.purpose, excluded.purpose), "
                "bytes=excluded.bytes, modified_at=excluded.modified_at, last_seen=now();\n")

        f.write("\n-- ── Kandídatar (biðstofa — ekkert samþykkt) ──\n")
        for art, line_no, body, why in all_facts:
            f.write(
                "insert into charlize_inbox (scope, topic, fact, detail, source_path, source_line, "
                "content_hash, confidence, agent) values ("
                f"{q(art['system'] if art['system'] in ('slokkvitaeki','brunaholf') else 'kerfi')}, "
                f"{q(why)}, {q(body)}, {q('úr ' + art['filename'])}, {q(art['path'])}, {line_no}, "
                f"{q(art['hash'])}, 'unverified', 'cowork');\n")

        f.write("\n-- Yfirferð:  select * from v_charlize_inbox_pending;\n")
        f.write("-- Samþykkja: select charlize_approve(id) from v_charlize_inbox_pending where id in (...);\n")
        f.write("-- Hafna:     update charlize_inbox set status='rejected' where id in (...);\n")

    secret_files = [x["path"] for x in arts if x["notes"] and "LEYNDARM" in x["notes"]]
    print(f"{len(arts)} skrár -> {a.out}   ({len(all_facts)} kandídatar)")
    if secret_files:
        print("\n⚠ Skrár með leyndarmál — engir kandídatar teknir úr þeim, hreinsa handvirkt:")
        for p in secret_files[:20]:
            print("   ", p)
    if skipped:
        print(f"\n{skipped} skrám sleppt vegna --max-files. Keyrðu undirmöppu sér.")


if __name__ == "__main__":
    sys.exit(main())
