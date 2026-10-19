# Stillir 2025-blaðið (vigur) við 2022-blaðið (skönnun) sem Teikningin notar: kvarði + hliðrun, matchTemplate á brúnum.
import pymupdf, cv2, numpy as np, json, sys
DPI = 30
def mynd(f, i=0, clip=None):
    p = pymupdf.open(f)[i]
    pix = p.get_pixmap(dpi=DPI, clip=clip, colorspace=pymupdf.csGRAY)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w).copy(), p.rect
def brunir(a):
    e = cv2.Canny(cv2.GaussianBlur(a, (3, 3), 0), 40, 120)
    return cv2.GaussianBlur(e.astype(np.float32), (5, 5), 0)
ut = {}
for nafn, (f25, i25, f22) in {'h1': ('skjol/Sk_tuvogur_4._A_aluppdr_tti.pdf', 2, 'skjol/2022-10-1139929.pdf'), 'h2': ('skjol/Sk_tuvogur_4._A_aluppdr_tti.pdf', 3, 'skjol/2022-10-1139928.pdf')}.items():
    r25 = pymupdf.open(f25)[i25].rect
    klipp = pymupdf.Rect(60, 40, r25.width * 0.83, r25.height * 0.97)   # grunnmyndin án skýringa/stimpils
    a25, _ = mynd(f25, i25, klipp)
    a22, r22 = mynd(f22)
    e22 = brunir(a22)
    best = None
    for s in np.arange(0.90, 1.101, 0.005):
        t = cv2.resize(brunir(a25), None, fx=s, fy=s)
        if t.shape[0] >= e22.shape[0] or t.shape[1] >= e22.shape[1]: continue
        res = cv2.matchTemplate(e22, t, cv2.TM_CCOEFF_NORMED)
        _, mv, _, ml = cv2.minMaxLoc(res)
        if not best or mv > best[0]: best = (mv, s, ml)
    mv, s, (ox, oy) = best
    # 2025 pt → 2022 pt: x22 = (x25 - klipp.x0) * s + ox*72/DPI
    ut[nafn] = {'s': float(s), 'ox': ox * 72 / DPI - klipp.x0 * s, 'oy': oy * 72 / DPI - klipp.y0 * s, 'samsvorun': round(float(mv), 3), 'b22pt': r22.width, 'h22pt': r22.height}
    print(nafn, ut[nafn])
json.dump(ut, open('stilling.json', 'w'))
