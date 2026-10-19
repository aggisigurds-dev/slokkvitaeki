import pymupdf, cv2, numpy as np, json
S = json.load(open('spans.json', encoding='utf-8')); ST = json.load(open('stilling.json')); B = json.load(open('bord_661.json', encoding='utf-8'))
DPI = 60
def hannad(pg):
    ut = []
    for t, col, sz, bb, f in S[str(pg)]:
        if bb[0] > 2000: continue                      # skýringar / stimpill
        if (t in ('L', 'HST') and col == 'ed1f24') or t == 'BRSL':
            ut.append((t, (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2))
    return ut
for nafn, pg, f22, hi in (('h1', 3, 'skjol/2022-10-1139929.pdf', 0), ('h2', 4, 'skjol/2022-10-1139928.pdf', 1)):
    st = ST[nafn]; hd = B['haedir'][hi]; k22 = hd['frum']['b'] / st['b22pt']
    p22 = pymupdf.open(f22)[0]; pix = p22.get_pixmap(dpi=DPI, colorspace=pymupdf.csRGB)
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, 3)[:, :, ::-1].copy()
    # 2025 brúnir í grænu ofan á
    p25 = pymupdf.open('skjol/Sk_tuvogur_4._A_aluppdr_tti.pdf')[pg - 1]
    m = pymupdf.Matrix(DPI / 72 * st['s'], DPI / 72 * st['s'])
    pix25 = p25.get_pixmap(matrix=m, colorspace=pymupdf.csGRAY)
    g = np.frombuffer(pix25.samples, dtype=np.uint8).reshape(pix25.h, pix25.w)
    ox, oy = int(round(st['ox'] * DPI / 72)), int(round(st['oy'] * DPI / 72))
    H, W = a.shape[:2]
    for yy in range(0, g.shape[0]):
        Y = yy + oy
        if 0 <= Y < H:
            row = g[yy]; xs = np.where(row < 128)[0]; X = xs + ox; ok = (X >= 0) & (X < W)
            a[Y, X[ok]] = (0.5 * a[Y, X[ok]] + 0.5 * np.array([0, 200, 0])).astype(np.uint8)
    k = DPI / 72
    for t, x, y in hannad(pg):
        X, Y = (x * st['s'] + st['ox']) * k, (y * st['s'] + st['oy']) * k
        c = (0, 0, 230) if t == 'L' else (230, 120, 0) if t == 'BRSL' else (0, 140, 255)
        cv2.circle(a, (int(X), int(Y)), 16, c, 3); cv2.putText(a, t, (int(X) + 18, int(Y) + 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, c, 2)
    for mk in hd['markers']:
        X, Y = mk['x'] / k22 * k, mk['y'] / k22 * k
        cv2.rectangle(a, (int(X) - 12, int(Y) - 12), (int(X) + 12, int(Y) + 12), (200, 0, 160), 3)
        cv2.putText(a, str(mk['unitId'])[:6], (int(X) - 20, int(Y) - 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 0, 160), 2)
    sk = hd['skurdur']; x0, y0 = int(sk['x'] / k22 * k), int(sk['y'] / k22 * k); x1, y1 = int((sk['x'] + sk['w']) / k22 * k), int((sk['y'] + sk['h']) / k22 * k)
    cv2.imwrite('yfirlogn_%s.png' % nafn, a[max(0, y0):y1, max(0, x0):x1])
    print(nafn, 'hannað', len(hannad(pg)), 'merki Agnars', len(hd['markers']))
