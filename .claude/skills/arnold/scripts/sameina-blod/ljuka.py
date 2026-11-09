# -*- coding: utf-8 -*-
# Lýkur sameinuðu blöðunum (sjá references/sameina-blod.md): sker titilreitsleif ofan af, sker að ramma blaðsins,
# minnkar í 6000 px langhlið (sama og 435 geymir) og vistar JPEG í lokaa/.
# Notkun: python ljuka.py 1h=krokhals-9-1-haed-2023 kj=krokhals-9-kjallari-2023 …   (les <hæð>-sameinad.jpg úr sauma.py)
# Prentar top, skurð og kvarðann k — þær tölur þarf til að færa merki/veggjalínur hlutanna yfir (skref 6 í leiðbeiningunum).
import os, sys, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
UT = 'lokaa'; os.makedirs(UT, exist_ok=True)
LANGHLID = int(os.environ.get('LANGHLID', '6000'))
for arg in sys.argv[1:]:
    n, ut = arg.split('=', 1)
    im = Image.open('%s-sameinad.jpg' % n).convert('L')
    a = np.asarray(im)
    H, W = a.shape
    dokk = (a < 200).mean(axis=1)
    # Titilreitsleifin er þétt band efst (>8 % dökkt í röð) í efstu 6 % — skerum rétt neðan við síðustu slíka röð
    thett = [y for y in range(0, int(H * 0.06)) if dokk[y] > 0.08]
    top = (thett[-1] + 12) if thett else 0
    # Rammi blaðsins: ysta lóðrétta/lárétta línan — skerum 1,2 % innan við jaðarinn til að losna við rammalínuna sjálfa
    b = a[top:, :]
    col = (b < 200).mean(axis=0); row = (b < 200).mean(axis=1)
    xs = np.where(col > 0.001)[0]; ys = np.where(row > 0.001)[0]
    x0, x1 = xs[0], xs[-1]; y0, y1 = ys[0], ys[-1]
    m = int(0.012 * W)
    cut = im.crop((x0 + m, top + y0 + m, x1 - m, top + y1 - m))
    k = LANGHLID / max(cut.size)
    if k < 1: cut = cut.resize((round(cut.size[0] * k), round(cut.size[1] * k)), Image.LANCZOS)
    else: k = 1.0
    slod = os.path.join(UT, ut + '.jpg')
    cut.save(slod, quality=88, optimize=True)
    print('%s: top=%d m=%d skurður=(%d,%d)-(%d,%d) k=%.6f -> %s %s %.1f MB' % (ut, top, m, x0 + m, top + y0 + m, x1 - m, top + y1 - m, k, cut.size, slod, os.path.getsize(slod) / 1e6))
    print('   vörpun A-blaðs: x\' = (x - %d)·k,  y\' = (y - off + round(-dy) - %d - %d)·k   (off og dy úr sauma.py)' % (x0 + m, top, m))
