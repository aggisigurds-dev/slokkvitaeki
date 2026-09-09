#!/usr/bin/env python3
"""
lesa_skyrslur.py — les „Annað:" og „Athugasemdir:" úr frágengnum úttektarskýrslum
og telur orðalag, svo húsmálið sé staðreynt en ekki ágiskað.

Notkun:
    python lesa_skyrslur.py <mappa>              # sýnir textana
    python lesa_skyrslur.py <mappa> --talning    # telur orðalagsmunstur
    python lesa_skyrslur.py <mappa> --ar 2026    # sía á ár í skráarnafni

Skýrslurnar liggja hjá Agnari í:
    Downloads\\Allt - Úttektarskýrslur\\Buið að breyta\\

Þarf að staga skrárnar inn fyrst (device_stage_files) — Chrome-tólin lesa ekki file://.
Krefst pdfplumber (pip install pdfplumber --break-system-packages).
"""

import argparse
import glob
import os
import re
import sys

try:
    import pdfplumber
except ImportError:
    sys.exit("Vantar pdfplumber:  pip install pdfplumber --break-system-packages")


# Orðalagsmunstur sem skipta máli. Sjá references/husmal.md.
MUNSTUR = [
    ("slökkvitæki yfirfarin",      r"sl[öo]kk?vit[æa]ki yfirfarin"),
    ("„tæki yfirfarin\" án slökkvi", r"(?<!slökkvi)(?<!slökvi)\bt[æa]ki yfirfarin"),
    ("endurhlaðin / endurhlaðið",  r"endurhla[ðd]"),
    ("hlaðin (ekki endur-)",       r"(?<!endur)hla[ðd]i"),
    ("skipt um innihald",          r"skipt um innihald"),
    ("full áfylling",              r"áfylling"),
    ("fullum þrýstingi",           r"fullum þrýstingi"),
    ("fullum þrýsting (án i)",     r"fullum þrýsting\b"),
    ("úðastútur / stútur",         r"[úu]?[ðd]?astútur|\bstút"),
    ("haus",                       r"\bhaus"),
    ("rafhlöður",                  r"rafhl[öo]"),
    ("batterí",                    r"batter"),
    ("hljóðprófaðir",              r"hljóðprófa"),
    ("bætt við",                   r"b[æa]tt við"),
    ("dæmt ónýtt",                 r"d[æa]m[dt]\w* ónýt"),
    ("í sameign",                  r"í sameign"),
    ("stigagangar",                r"stigag"),
]


def lesa(pdf_path):
    """Skilar (annad, athugasemdir) eða (None, None) ef reitirnir finnast ekki."""
    with pdfplumber.open(pdf_path) as pdf:
        txt = "\n".join((p.extract_text() or "") for p in pdf.pages)
    m = re.search(r"Annað:\s*(.*?)\s*Athugasemdir:\s*(.*?)\s*Fyrir hönd", txt, re.S)
    if not m:
        return None, None
    einlina = lambda s: " ".join(l.strip() for l in s.strip().splitlines() if l.strip())
    return einlina(m.group(1)), einlina(m.group(2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mappa")
    ap.add_argument("--talning", action="store_true", help="telja orðalagsmunstur")
    ap.add_argument("--ar", help="sía á ár í skráarnafni, t.d. 2026")
    args = ap.parse_args()

    munstur = os.path.join(args.mappa, "*.pdf")
    skrar = sorted(glob.glob(munstur))
    if args.ar:
        skrar = [f for f in skrar if args.ar in os.path.basename(f)]
    if not skrar:
        sys.exit(f"Engar PDF-skrár fundust í {args.mappa}")

    textar, ekki_lesnar = [], []
    for f in skrar:
        try:
            annad, ath = lesa(f)
        except Exception as e:
            ekki_lesnar.append((os.path.basename(f), str(e)))
            continue
        if annad is None:
            ekki_lesnar.append((os.path.basename(f), "fann ekki Annað/Athugasemdir"))
            continue
        textar.append((os.path.basename(f), annad, ath))
        if not args.talning:
            print("—", os.path.basename(f)[:70])
            print("   ANNAÐ:", annad)
            if ath and ath not in ("Engar athugasemdir", "án athugasemda", "0"):
                print("   ATH:  ", ath)

    if args.talning:
        blob = " ||| ".join(a for _, a, _ in textar)
        print(f"Skýrslur lesnar: {len(textar)}\n")
        breidd = max(len(n) for n, _ in MUNSTUR)
        for nafn, pat in MUNSTUR:
            n = len(re.findall(pat, blob, re.I))
            merki = "  ← kemur aldrei fyrir" if n == 0 else ""
            print(f"  {nafn.ljust(breidd)}  {str(n).rjust(3)}{merki}")

        print("\nGrunnsetningar:")
        upphaf = {}
        for _, a, _ in textar:
            lykill = " ".join(a.split()[:4])
            upphaf[lykill] = upphaf.get(lykill, 0) + 1
        for k, v in sorted(upphaf.items(), key=lambda x: -x[1])[:8]:
            print(f"  {str(v).rjust(3)}  {k}…")

    if ekki_lesnar:
        print(f"\nEkki lesnar ({len(ekki_lesnar)}):")
        for nafn, skyring in ekki_lesnar[:10]:
            print(f"  {nafn[:60]} — {skyring}")


if __name__ == "__main__":
    main()
