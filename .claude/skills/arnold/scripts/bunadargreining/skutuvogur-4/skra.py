# -*- coding: utf-8 -*-
# Skráir Voltorku-blaðið (bk1) á 2025-blaðið (b1): kvarði + hliðrun með krosssamsvörun á línumyndum (FFT). Báðar eru sömu grunnmyndirnar.
import sys, json
import numpy as np
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None
sys.stdout.reconfigure(encoding='utf-8')
F = 0.25
def lin(n, box):
    im = Image.open(n).convert('L').crop(box)
    a = 255 - np.asarray(im, dtype=np.float32)
    a = (a > 60).astype(np.float32) * 255
    im2 = Image.fromarray(a.astype(np.uint8)).resize((int(im.width * F), int(im.height * F)), Image.BILINEAR).filter(ImageFilter.GaussianBlur(2))
    x = np.asarray(im2, dtype=np.float32); return x - x.mean()
A = lin('b1.jpg', (733, 25, 733 + 2317, 25 + 2758))   # 2025-blað (skurður)
Bfull = Image.open('bk1.jpg').convert('L').crop((126, 100, 126 + 2882, 100 + 3418))
best = None
for s in np.arange(1.15, 1.36, 0.0025):
    w, h = int(Bfull.width * F / s), int(Bfull.height * F / s)
    a = (255 - np.asarray(Bfull, dtype=np.float32)); a = (a > 60).astype(np.float32) * 255
    b = Image.fromarray(a.astype(np.uint8)).resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(2))
    B = np.asarray(b, dtype=np.float32); B = B - B.mean()
    H = max(A.shape[0], B.shape[0]) * 2; W = max(A.shape[1], B.shape[1]) * 2
    fa = np.fft.rfft2(A, (H, W)); fb = np.fft.rfft2(B, (H, W))
    cc = np.fft.irfft2(fa * np.conj(fb), (H, W))
    nrm = np.sqrt((A ** 2).sum() * (B ** 2).sum())
    i = np.unravel_index(np.argmax(cc), cc.shape); v = cc[i] / nrm
    dy, dx = i; dy = dy - H if dy > H // 2 else dy; dx = dx - W if dx > W // 2 else dx
    if best is None or v > best[0]: best = (v, s, dx, dy, w, h)
v, s, dx, dy, w, h = best
print('besta samsvörun', round(float(v), 4), 'kvarði', round(float(s), 4), 'hliðrun (díl í A·4)', dx, dy)
# bk1-hnit (heil mynd) → b1-hnit (heil mynd):  bk1 skurður (126,100): u_bk = 126 + (x_a_skurdur_px)·(s/F)... leiðum út
# A (skurður b1) díll (px,py) ↔ B (skurður bk1, smækkaður um s) díll (qx,qy):  px = qx + dx , py = qy + dy   (í F-smækkuðum dílum)
# b1 heil: X1 = 733 + px/F ; bk1 heil: X2 = 126 + (qx / F) * s   → qx = (X2-126)*F/s
# X1 = 733 + ((X2-126)*F/s + dx)/F = 733 + (X2-126)/s + dx/F
k = 1.0 / s
off_x = 733 - 126 * k + dx / F
off_y = 25 - 100 * k + dy / F
print('b1 = k*bk1 + off:', 'k=%.5f' % k, 'x:', round(off_x, 1), 'y:', round(off_y, 1))
json.dump({'k': k, 'ox': off_x, 'oy': off_y, 'skor': float(v)}, open('skra.json', 'w'))
# prófun: yfirlag bk1 (rauður) á b1
b1 = Image.open('b1.jpg').convert('RGB')
bk = Image.open('bk1.jpg').convert('RGB')
bk2 = bk.resize((int(bk.width * k), int(bk.height * k)))
# sett á b1 með hliðrun
canvas = b1.copy()
mask = Image.fromarray(((255 - np.asarray(bk2.convert('L'))) > 60).astype(np.uint8) * 255)
red = Image.new('RGB', bk2.size, (255, 0, 0))
canvas.paste(red, (int(round(off_x)), int(round(off_y))), mask)
c = canvas.crop((733, 25, 733 + 2317, 25 + 2758)); c.thumbnail((1400, 1400)); c.save('skra_prof.png')
