# sameina-blod — sauma klofin grunnmyndablöð í eina hæð

Leiðbeiningarnar og hvenær þetta á við: `../../references/sameina-blod.md`.

```
# 1) sækja blöðin í fullri upplausn (6006 px) í vinnumöppu:
#    full-<hæð>-A.jpg (neðri/syðri hlutinn)  full-<hæð>-B.jpg (efri hlutinn)
python sauma.py 1h mg kj              # -> <hæð>-sameinad.jpg + <hæð>-smaa.jpg ; prentar dx, dy, fjölda para
python ljuka.py 1h=krokhals-9-1-haed-2023 mg=krokhals-9-2-haed-2023 kj=krokhals-9-kjallari-2023
#                                      -> lokaa/<útnafn>.jpg (6000 px langhlið) ; prentar top, m, k og vörpunarformúluna
```

Þarf: Python 3 með `opencv-python` (cv2), `numpy`, `Pillow` — allt til á vélinni (prófað 09.11.2026, cv2 5.0).
Skoðaðu `<hæð>-smaa.jpg` og nærmynd af saumnum áður en myndin fer í geymslu. Skrifar aldrei í gagnagrunn — upphleðslan
og hæðarfærslan eru handvirk skref í leiðbeiningunum (afrit fyrst, `updated_at`-skilyrði í PATCH).
