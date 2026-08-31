#!/usr/bin/env python3
"""
Charlize — tengja netföng við fyrirtæki.

Les póst (Thunderbird mbox eða mappa af .eml), dregur út sendendur og viðtakendur,
og reynir að para þá við fyrirtækjalista. Skilar SQL fyrir charlize_contacts,
allt með status='pending'.

Skrifar EKKERT sjálfvirkt í grunninn.

Notkun:
    python mail_contacts.py --mbox "C:\\Users\\Notandi\\AppData\\Roaming\\Thunderbird\\Profiles\\euqr38aw.default-release\\ImapMail\\imap.gmail-2.com\\INBOX" \\
                            --felog fyrirtaeki.csv --out tengilidir.sql

    --felog  CSV eða XLSX með dálkunum: kennitala, nafn   (netfang valfrjálst)
    --mbox   mbox-skrá; má gefa oftar en einu sinni (INBOX og Sent)
    --eml    mappa með .eml skrám (valkostur við --mbox)

Ábending: keyrðu bæði INBOX og Sent. Sendi pósturinn segir hverjum ÞIÐ skrifið,
sem er oft réttari tengiliður en sá sem sendi síðast.
"""

import argparse, csv, mailbox, os, re, sys, unicodedata
from collections import defaultdict
from email.utils import parseaddr, parsedate_to_datetime

# Kerfispóstur og markaðspóstur — aldrei tengiliður
JUNK = re.compile(r"(?i)^(no-?reply|noreply|donotreply|notifications?|mailer-daemon|"
                  r"postmaster|bounce|info@news|marketing|newsletter|support@)")
JUNK_DOMAINS = {
    "github.com", "google.com", "accounts.google.com", "gmail.com", "hotmail.com",
    "outlook.com", "facebookmail.com", "redditmail.com", "linkedin.com",
    "temuemail.com", "shein.com", "alibaba.com", "bland.is", "a4.is",
    "payday.is", "barki.is", "veldix.is", "stolpi.is", "teya.com",
}
# Eigin lén — þetta erum við, ekki kúnni
OWN = {"eldklar.is", "brunaholf.is", "slokkvitaeki.is"}

ROLES = [
    (re.compile(r"(?i)^(bokhald|bókhald|reikning|accounts?|invoice|fjarmal)"), "bokhald"),
    (re.compile(r"(?i)^(husvordur|húsvörður|umsjon|umsjón|rekstur|vidhald|viðhald)"), "husvordur"),
    (re.compile(r"(?i)^(pantanir|innkaup|orders?|sala)"), "pantanir"),
    (re.compile(r"(?i)^(skrifstofa|office|info|afgreidsla|afgreiðsla)"), "onnur"),
]


def role_of(addr):
    local = addr.split("@", 1)[0]
    for rx, r in ROLES:
        if rx.match(local):
            return r
    return None


SUFFIX = re.compile(r"(?i)\b(ehf|hf|slf|sf|ses|svf|husfelag|húsfélagið|húsfélag|"
                    r"the|og|&|-|\.|,)\b")


def fold(s):
    """Lágstafir án broddstafa, til samanburðar."""
    s = unicodedata.normalize("NFKD", (s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "", s)


def tokens(name):
    base = SUFFIX.sub(" ", (name or "").lower())
    return {fold(t) for t in re.split(r"[\s\-_,./]+", base) if len(fold(t)) >= 4}


def load_felog(path):
    rows = []
    if path.lower().endswith((".xlsx", ".xls")):
        import pandas as pd
        df = pd.read_excel(path)
        cols = {fold(c): c for c in df.columns}
        kt_c = next((cols[k] for k in cols if "kennital" in k or k == "kt"), None)
        nf_c = next((cols[k] for k in cols if "fyrirtaeki" in k or "nafn" in k or "heiti" in k), None)
        if not kt_c or not nf_c:
            sys.exit(f"Fann ekki kennitölu-/nafndálk í {path}. Dálkar: {list(df.columns)}")
        for _, r in df.iterrows():
            rows.append((str(r[kt_c]).strip(), str(r[nf_c]).strip()))
    else:
        with open(path, encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                low = {fold(k): v for k, v in r.items()}
                kt = next((low[k] for k in low if "kennital" in k or k == "kt"), "")
                nm = next((low[k] for k in low if "nafn" in k or "fyrirtaeki" in k or "heiti" in k), "")
                if nm:
                    rows.append((kt.strip(), nm.strip()))
    return [(kt, nm) for kt, nm in rows if nm and nm.lower() != "nan"]


def iter_messages(mboxes, emldirs):
    for p in mboxes:
        try:
            for m in mailbox.mbox(p):
                yield m
        except Exception as e:
            print(f"  ! næ ekki í {p}: {e}", file=sys.stderr)
    for d in emldirs:
        for root, _, files in os.walk(d):
            for fn in files:
                if fn.lower().endswith(".eml"):
                    try:
                        import email
                        with open(os.path.join(root, fn), "rb") as f:
                            yield email.message_from_binary_file(f)
                    except Exception:
                        pass


def q(s):
    return "null" if s in (None, "") else "'" + str(s).replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mbox", action="append", default=[])
    ap.add_argument("--eml", action="append", default=[])
    ap.add_argument("--felog", required=True)
    ap.add_argument("--out", default="tengilidir.sql")
    ap.add_argument("--min-postar", type=int, default=1,
                    help="slepptu netföngum sem sjást sjaldnar en þetta")
    a = ap.parse_args()

    if not a.mbox and not a.eml:
        sys.exit("Gefðu --mbox eða --eml.")

    felog = load_felog(a.felog)
    by_token = defaultdict(list)          # orð -> [(kt, nafn)]
    for kt, nm in felog:
        for t in tokens(nm):
            by_token[t].append((kt, nm))
    print(f"{len(felog)} félög lesin úr {a.felog}")

    seen = {}                             # netfang -> dict
    for msg in iter_messages(a.mbox, a.eml):
        try:
            date = parsedate_to_datetime(msg.get("Date")).date().isoformat()
        except Exception:
            date = None
        for hdr, attin in (("From", "inn"), ("To", "ut")):
            raw = msg.get(hdr) or ""
            for part in raw.split(","):
                heiti, addr = parseaddr(part)
                addr = addr.strip().lower()
                if "@" not in addr:
                    continue
                len_ = addr.split("@", 1)[1]
                if len_ in OWN or len_ in JUNK_DOMAINS or JUNK.match(addr):
                    continue
                if any(len_.endswith("." + d) or len_ == d for d in JUNK_DOMAINS):
                    continue
                e = seen.setdefault(addr, {"len": len_, "heiti": heiti.strip() or None,
                                           "n": 0, "fyrst": date, "sidast": date,
                                           "attin": set()})
                e["n"] += 1
                e["attin"].add(attin)
                if date:
                    e["fyrst"] = min(x for x in (e["fyrst"], date) if x)
                    e["sidast"] = max(x for x in (e["sidast"], date) if x)

    # Pörun: lén-orð á móti orðum í heiti félags
    matched, unmatched = [], []
    for addr, e in sorted(seen.items(), key=lambda kv: -kv[1]["n"]):
        if e["n"] < a.min_postar:
            continue
        stem = fold(e["len"].rsplit(".", 2)[0])
        hits = []
        for t, felg in by_token.items():
            if len(t) >= 4 and (t in stem or stem in t) and len(felg) == 1:
                hits.append(felg[0])
        hits = list({h for h in hits})
        if len(hits) == 1:
            matched.append((addr, e, hits[0], "likely"))
        else:
            unmatched.append((addr, e, hits))

    with open(a.out, "w", encoding="utf-8") as f:
        f.write("-- Charlize tengiliðir — allt status='pending', ekkert samþykkt\n")
        f.write(f"-- {len(matched)} pöruð, {len(unmatched)} ópöruð, af {len(seen)} netföngum\n\n")
        for addr, e, (kt, nm), conf in matched:
            f.write("insert into charlize_contacts (kennitala, fyrirtaeki, netfang, len, heiti, hlutverk, "
                    "attin, faerslur, fyrst_sest, sidast_sest, source, confidence) values ("
                    f"{q(kt)}, {q(nm)}, {q(addr)}, {q(e['len'])}, {q(e['heiti'])}, {q(role_of(addr))}, "
                    f"{q('baedi' if len(e['attin'])>1 else list(e['attin'])[0])}, {e['n']}, "
                    f"{q(e['fyrst'])}, {q(e['sidast'])}, 'postur', {q(conf)}) "
                    "on conflict (netfang, kennitala) do update set "
                    "faerslur=excluded.faerslur, sidast_sest=excluded.sidast_sest;\n")

        f.write("\n-- Ópöruð netföng — tengdu handvirkt (kennitala er null)\n")
        for addr, e, hits in unmatched:
            note = ("fleiri en eitt félag passar: " + "; ".join(n for _, n in hits)) if hits else "ekkert félag passaði"
            f.write("insert into charlize_contacts (netfang, len, heiti, attin, faerslur, "
                    "fyrst_sest, sidast_sest, source, confidence) values ("
                    f"{q(addr)}, {q(e['len'])}, {q(e['heiti'])}, "
                    f"{q('baedi' if len(e['attin'])>1 else list(e['attin'])[0])}, {e['n']}, "
                    f"{q(e['fyrst'])}, {q(e['sidast'])}, {q('postur — ' + note)}, 'unverified') "
                    "on conflict (netfang, kennitala) do nothing;\n")

        f.write("\n-- Yfirferð: select * from v_charlize_contacts_pending;\n")
        f.write("-- Ópöruð eftir léni: select * from v_charlize_contacts_otengd;\n")
        f.write("-- Samþykkja: update charlize_contacts set status='approved', confidence='confirmed' where id in (...);\n")

    print(f"{len(seen)} netföng -> {a.out}   ({len(matched)} pöruð, {len(unmatched)} ópöruð)")
    print("Lén-pörun er ágiskun. Yfirfarðu áður en þú samþykkir.")


if __name__ == "__main__":
    sys.exit(main())
