# Brunakerfi Voltorku (2020): endanleg táknaleit (R / H / HB) án skýringareita + hliðrun milli blaða sem skarast
# (13↔14 = 1. hæð norður/suður, 15↔16 = 2. hæð) svo hvert tæki teljist einu sinni.
import cv2, numpy as np, json
ref = cv2.imread('raf/BN055104-505-0013.jpg', cv2.IMREAD_GRAYSCALE)
SN = {'R': (856, 1484, 884, 1511), 'H': (856, 1440, 884, 1467), 'HB': (856, 1527, 884, 1554)}
TH = {'R': 0.70, 'H': 0.74, 'HB': 0.70}
def nms(p, r=24):
    p = sorted(p, key=lambda q: -q[2]); u = []
    for a in p:
        if all((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 > r * r for b in u): u.append(a)
    return u
fund = {}
for bl in ('13', '14', '15', '16'):
    g = cv2.imread('raf/BN055104-505-00%s.jpg' % bl, cv2.IMREAD_GRAYSCALE); H, W = g.shape
    allt = []
    for k, (x0, y0, x1, y1) in SN.items():
        t0 = ref[y0:y1, x0:x1]
        for rot in (None, cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_90_COUNTERCLOCKWISE):
            t = t0 if rot is None else cv2.rotate(t0, rot)
            res = cv2.matchTemplate(g, t, cv2.TM_CCOEFF_NORMED)
            ys, xs = np.where(res >= TH[k])
            allt += [(int(x + t.shape[1] / 2), int(y + t.shape[0] / 2), float(res[y, x]), k) for y, x in zip(ys, xs)]
    allt = [a for a in nms(allt) if 250 < a[0] < int(W * 0.835) and 200 < a[1] < H - 150]
    # skýringareitur: H, R og HB í lóðréttri röð (sama x ± 15, innan 130 díla) — öll fjarlægð
    skyr = set()
    for a in allt:
        nagr = [b for b in allt if abs(b[0] - a[0]) < 15 and abs(b[1] - a[1]) < 130]
        if len({b[3] for b in nagr}) >= 2: skyr.update(nagr)
    allt = [a for a in allt if a not in skyr]
    fund[bl] = allt
    print(bl, {k: sum(1 for a in allt if a[3] == k) for k in SN}, '· skýringar út:', len(skyr))
def brun(a, f=0.25):
    s = cv2.resize(a, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    e = cv2.Canny(cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(s), 30, 90)
    return cv2.GaussianBlur(e.astype(np.float32), (3, 3), 0)
hlid = {}
for a, b in (('13', '14'), ('15', '16')):
    A = cv2.imread('raf/BN055104-505-00%s.jpg' % a, cv2.IMREAD_GRAYSCALE); B = cv2.imread('raf/BN055104-505-00%s.jpg' % b, cv2.IMREAD_GRAYSCALE)
    eA, eB = brun(A), brun(B)
    h, w = eB.shape
    t = eB[int(h * 0.08):int(h * 0.45), int(w * 0.05):int(w * 0.80)]      # efri hluti suðurblaðsins = neðri hluti norðurblaðsins
    res = cv2.matchTemplate(eA, t, cv2.TM_CCOEFF_NORMED); _, mv, _, (lx, ly) = cv2.minMaxLoc(res)
    dx, dy = (lx - int(w * 0.05)) * 4, (ly - int(h * 0.08)) * 4               # B-díll + (dx, dy) = A-díll
    hlid[b] = {'mot': a, 'dx': dx, 'dy': dy, 'samsvorun': round(float(mv), 3)}
    # tvítekningar: tákn í B sem lendir ≤ 60 dílum frá sama tákni í A
    tvi = [p for p in fund[b] if any(q[3] == p[3] and (q[0] - p[0] - dx) ** 2 + (q[1] - p[1] - dy) ** 2 < 60 ** 2 for q in fund[a])]
    hlid[b]['tvitekin'] = len(tvi)
    print(b, '->', a, hlid[b])
    # athugun: tákn B (blátt) varpað á A, tákn A (rautt)
    v = cv2.cvtColor(A, cv2.COLOR_GRAY2BGR)
    for x, y, s, k in fund[a]: cv2.circle(v, (x, y), 34, (0, 0, 255), 6)
    for x, y, s, k in fund[b]: cv2.circle(v, (x + dx, y + dy), 22, (255, 120, 0), 6)
    cv2.imwrite('par_%s_%s.jpg' % (a, b), cv2.resize(v, None, fx=0.3, fy=0.3))
json.dump({'fund': fund, 'hlid': hlid}, open('brunakerfi_endanlegt.json', 'w'))
