# -*- coding: utf-8 -*-
# Saumar tvö blöð (A = suðurhluti, B = norðurhluti) af sömu hæð Krókháls 9 saman í eina mynd.
# Bæði eru teiknuð úr sama vigur-PDF í sama kvarða -> aðeins hliðrun (dx, dy), enginn snúningur.
# Hliðrunin er fundin með ORB-einkennum + RANSAC á hliðrun eingöngu. Skrifar <nafn>-sameinad.jpg + yfirlit.
import sys, cv2, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

def lesa(p):
    im = cv2.imread(p, cv2.IMREAD_GRAYSCALE)
    return im

def plan_svaedi(g):
    """Svæði teikningarinnar án titilreits: titilreitur er efst (~fyrstu 9 %) á þessum blöðum."""
    h, w = g.shape
    return g[int(h * 0.10):, :]

def einkenni(g, n=12000):
    orb = cv2.ORB_create(nfeatures=n, scaleFactor=1.2, nlevels=6, edgeThreshold=15, patchSize=31)
    kp, des = orb.detectAndCompute(g, None)
    return kp, des

def hlidrun(gA, gB):
    """Finnur (dx, dy) þannig að punktur p í B lendir á p + (dx, dy) í A-hnitakerfinu."""
    kA, dA = einkenni(gA); kB, dB = einkenni(gB)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    m = bf.match(dB, dA)
    if len(m) < 20: raise SystemExit('of fá pör: %d' % len(m))
    d = np.array([[kA[x.trainIdx].pt[0] - kB[x.queryIdx].pt[0], kA[x.trainIdx].pt[1] - kB[x.queryIdx].pt[1]] for x in m])
    # RANSAC á hreina hliðrun: sú hliðrun sem flest pör styðja innan 3 px
    best, bk = None, 0
    rng = np.random.default_rng(1)
    for i in rng.choice(len(d), size=min(4000, len(d)), replace=False):
        k = np.sum(np.all(np.abs(d - d[i]) < 3, axis=1))
        if k > bk: bk, best = k, d[i]
    inn = d[np.all(np.abs(d - best) < 3, axis=1)]
    return float(np.median(inn[:, 0])), float(np.median(inn[:, 1])), int(bk), len(m)

def sauma(pA, pB, ut):
    A = lesa(pA); B = lesa(pB)
    hA, wA = A.shape; hB, wB = B.shape
    gA = plan_svaedi(A); gB = plan_svaedi(B)
    off = int(hA * 0.10)
    dx, dy, k, n = hlidrun(gA, gB)
    print('%s: hliðrun B->A dx=%.1f dy=%.1f (%d af %d pörum styðja)' % (ut, dx, dy, k, n))
    if k < 60: raise SystemExit('of veikt samræmi')
    # B í A-hnitum: B-plan (y frá off) lendir á (x+dx, y+dy). Sameinaður strigi nær yfir bæði plan-svæðin (án titilreita).
    x0 = min(0, dx); y0 = min(0, dy)
    W = int(np.ceil(max(wA, wB + dx) - x0)); H = int(np.ceil(max(hA - off, hB - off + dy) - y0))
    strigi = np.full((H, W), 255, np.uint8)
    def setja(g, x, y, mask_only=False):
        xi, yi = int(round(x - x0)), int(round(y - y0))
        h, w = g.shape
        svaedi = strigi[yi:yi + h, xi:xi + w]
        np.minimum(svaedi, g, out=svaedi)      # dekkri díllinn ræður -> línur beggja blaða haldast
    # Skörunin: þar sem bæði blöð sýna sama hlut er línan eins; þar sem annað blaðið hefur klippiramma/texta má
    # það ekki smitast yfir — því tökum við AÐEINS þann hluta B sem er fyrir ofan A-planið (dy < 0) og öfugt,
    # og í skörunarbandinu notum við blaðið sem heldur áfram (B efst, A neðst) hálfa leið hvort.
    if dy <= 0:
        efra, nedra, ex, ey, nx, ny = gB, gA, dx, dy, 0.0, 0.0
    else:
        efra, nedra, ex, ey, nx, ny = gA, gB, 0.0, 0.0, dx, dy
    skil = int(round((ey + efra.shape[0] + ny) / 2))        # miðja skörunarbandsins í striga-hnitum (án x0/y0)
    # efra blaðið niður að skilum, neðra blaðið frá skilum
    e_h = max(0, min(efra.shape[0], skil - int(round(ey))))
    setja(efra[:e_h, :], ex, ey)
    n_y0 = max(0, skil - int(round(ny)))
    setja(nedra[n_y0:, :], nx, ny + n_y0)
    Image.fromarray(strigi).save(ut + '-sameinad.jpg', quality=90)
    sm = Image.fromarray(strigi); sm.thumbnail((1400, 1400)); sm.save(ut + '-smaa.jpg', quality=85)
    print('->', ut + '-sameinad.jpg', strigi.shape[::-1], 'skil y=', skil)
    return dx, dy

if __name__ == '__main__':
    for n in sys.argv[1:]:
        sauma('full-%s-A.jpg' % n, 'full-%s-B.jpg' % n, n)
