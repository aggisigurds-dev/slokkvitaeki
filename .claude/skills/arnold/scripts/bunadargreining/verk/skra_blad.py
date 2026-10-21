# -*- coding: utf-8 -*-
# skra_blad.py <ref.jpg> <refBox x,y,w,h> <blad.jpg> <bladBox x,y,w,h> <kmin> <kmax> <úttak.json>
# Skráir BLAÐ greiningarinnar á RAMMA borðsins (ref = mynd borðsins í 6006-ramma): FFT-krosssamsvörun á línumyndum, kvarðaleit í [kmin, kmax].
# Úttak: {fx:{k,c}, fy:{k,c}, skor}  — borð = k·blað + c  (sama snið og bunadargreining.teikningar[].varpa). Skor < 0,25 = ótraust.
import json, sys
import numpy as np
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None
sys.stdout.reconfigure(encoding='utf-8')
REF, RB, BL, BB, KMIN, KMAX, UT = sys.argv[1], [int(float(v)) for v in sys.argv[2].split(',')], sys.argv[3], [int(float(v)) for v in sys.argv[4].split(',')], float(sys.argv[5]), float(sys.argv[6]), sys.argv[7]
def lin(im, thr=60):
    a = 255 - np.asarray(im.convert('L'), dtype=np.float32)
    return (a > thr).astype(np.float32) * 255
def leita(F, ks):
    R = Image.open(REF).convert('L')
    rbox = (RB[0], RB[1], RB[0] + RB[2], RB[1] + RB[3])
    A = lin(R.crop(rbox)); A = np.asarray(Image.fromarray(A.astype(np.uint8)).resize((max(2, int(RB[2] * F)), max(2, int(RB[3] * F))), Image.BILINEAR).filter(ImageFilter.GaussianBlur(max(1, 8 * F))), dtype=np.float32); A = A - A.mean()
    Bc = Image.open(BL).convert('L').crop((BB[0], BB[1], BB[0] + BB[2], BB[1] + BB[3])); Bl = lin(Bc)
    best = None
    for k in ks:       # borð = k·blað
        w, h = int(Bc.width * k * F), int(Bc.height * k * F)
        if w < 20 or h < 20: continue
        b = Image.fromarray(Bl.astype(np.uint8)).resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(max(1, 8 * F)))
        B = np.asarray(b, dtype=np.float32); B = B - B.mean()
        H = max(A.shape[0], B.shape[0]) * 2; W = max(A.shape[1], B.shape[1]) * 2
        cc = np.fft.irfft2(np.fft.rfft2(A, (H, W)) * np.conj(np.fft.rfft2(B, (H, W))), (H, W))
        nrm = np.sqrt((A ** 2).sum() * (B ** 2).sum()) or 1.0
        i = np.unravel_index(np.argmax(cc), cc.shape); v = cc[i] / nrm
        dy, dx = i; dy = dy - H if dy > H // 2 else dy; dx = dx - W if dx > W // 2 else dx
        if best is None or v > best[0]: best = (float(v), float(k), dx, dy)
    return best
# 1) gróf leit (F = 0,25) · 2) fín leit (F = 0,6, ±0,03 umhverfis, skref 0,0012)
b1_ = leita(0.25, np.arange(KMIN, KMAX + 1e-9, 0.004))
F = 0.6
best = leita(F, np.arange(b1_[1] - 0.03, b1_[1] + 0.03 + 1e-9, 0.0012))
v, k, dx, dy = best
# A-pixel (px) = B-pixel (qx) + dx  (í F-dílum);  borð X = RB.x + px/F ;  blað X2 = BB.x + qx/(k·F)
# → borð X = RB.x + (qx + dx)/F = RB.x + dx/F + (X2 − BB.x)·k
ox = RB[0] + dx / F - BB[0] * k
oy = RB[1] + dy / F - BB[1] * k
out = {'fx': {'k': round(k, 6), 'c': round(ox, 2)}, 'fy': {'k': round(k, 6), 'c': round(oy, 2)}, 'skor': round(v, 4)}
json.dump(out, open(UT, 'w', encoding='utf-8'))
print(json.dumps(out))
