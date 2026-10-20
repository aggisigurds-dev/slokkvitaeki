# -*- coding: utf-8 -*-
# Síðumúli 1 — aðaluppdráttur 2020-12-08 (skönnun 3008×2146): ÚT-kassar og „!“ með sniðmátsþáttun, merkt yfirlag til sannreynslu
import cv2, numpy as np, json, sys
im = cv2.imread('adal403.jpg'); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
# bláleitur bakgrunnur → jafna: normalisera og þröskulda
g2 = cv2.createCLAHE(2.0, (8, 8)).apply(g)
def tpl(cx, cy, w, h):
    return g2[int(cy - h / 2):int(cy + h / 2), int(cx - w / 2):int(cx + w / 2)].copy()
# sniðmát (upprunadílar úr h1_crop: x = 180 + cx/2, y = 260 + cy/2)
T = {
    'UT': tpl(180 + 1318 / 2, 260 + 300 / 2, 24, 30),     # ÚT-kassi (ör upp) við Andyri — aðeins kassinn
    'UT2': tpl(180 + 1040 / 2, 260 + 390 / 2, 24, 22),    # ÚT-kassi (ör →)
    'UF': tpl(180 + 1355 / 2, 260 + 225 / 2, 20, 30),     # „!“
}
for k, t in T.items(): cv2.imwrite('tpl_%s.png' % k, t)
out = {}
for k, t in T.items():
    r = cv2.matchTemplate(g2, t, cv2.TM_CCOEFF_NORMED)
    thr = 0.62 if k != 'UF' else 0.6
    ys, xs = np.where(r >= thr)
    pts = sorted(zip(r[ys, xs], xs, ys), reverse=True); keep = []
    for sc, x, y in pts:
        cx, cy = x + t.shape[1] / 2, y + t.shape[0] / 2
        if all((cx - a) ** 2 + (cy - b) ** 2 > 22 ** 2 for a, b, _ in keep): keep.append((cx, cy, sc))
    out[k] = keep
    print(k, len(keep), [(round(a), round(b), round(s, 2)) for a, b, s in keep][:40])
ov = im.copy()
for k, v in out.items():
    c = (0, 160, 0) if k.startswith('UT') else (180, 0, 160)
    for a, b, s in v: cv2.circle(ov, (int(a), int(b)), 22, c, 3)
cv2.imwrite('tokn_yfirlag.png', ov)
json.dump({k: [(float(a), float(b), float(s)) for a, b, s in v] for k, v in out.items()}, open('tokn.json', 'w'))
