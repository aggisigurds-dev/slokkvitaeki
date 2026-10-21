# -*- coding: utf-8 -*-
# golf.py <hæð> — skemmtilegra grátt gólf á vistuðu 3D-vinnumyndinni: plan-línur/texti/örvar fjarlægð af gólfinu (inmálun), svo steypugólf með
# mjúkum blettum, fíngerðu korni, sagarskurðum (á 6 m fresti, í réttu sjónarhorni) og skuggum myndarinnar haldið. Veggir, hurðir og gler ósnert.
import json, os, sys
import numpy as np, cv2
sys.stdout.reconfigure(encoding='utf-8')
HER = os.path.dirname(os.path.abspath(__file__))
HAED = int(sys.argv[1]) if len(sys.argv) > 1 else 1
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 7
rng = np.random.default_rng(SEED)
BORD = json.load(open(os.path.join(HER, 'bord661.json'), encoding='utf-8'))
bh = [h for h in BORD if h['nafn'].startswith('%d.' % HAED)][0]; vm = bh['vm']; k = vm['kort']; e = vm['cam']
im = cv2.imread(os.path.join(HER, 'vm%d.jpg' % HAED))                      # BGR
H, W = im.shape[:2]
rgb = im[:, :, ::-1].astype(np.float32)
R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
L = 0.299 * R + 0.587 * G + 0.114 * B
chroma = B - R

def varpa(u, v, y=0.0):
    wx = (u - k['sx']) * k['f'] - k['gw'] / 2; wz = (v - k['sy']) * k['f'] - k['gh'] / 2
    cx = e[0] * wx + e[4] * y + e[8] * wz + e[12]; cy = e[1] * wx + e[5] * y + e[9] * wz + e[13]; cw = e[3] * wx + e[7] * y + e[11] * wz + e[15]
    return ((cx / cw + 1) / 2 * vm['heild'][0] - vm['rammi'][0], (1 - cy / cw) / 2 * vm['heild'][1] - vm['rammi'][1])

# 1) gólfmengi: gólflitur (bláleitt, 150–214) — veggir eru hlutlausir/hvítir, bakgrunnur ≥ 222
floor = ((L > 150) & (L < 214) & (chroma > 4.5) & (chroma < 13)).astype(np.uint8)
floor = cv2.morphologyEx(floor, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
# plan-línur á gólfinu: þunnir dökkir/ljósir drættir (svarthattur/hvíthattur) + litaðar örvar (bleikar) — ekki þykkir veggir (≥ 7 px) né hurðir
k7 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
Lu = np.clip(L, 0, 255).astype(np.uint8)
black = cv2.morphologyEx(Lu, cv2.MORPH_BLACKHAT, k7); white = cv2.morphologyEx(Lu, cv2.MORPH_TOPHAT, k7)
thin = ((black > 6) | (white > 7)).astype(np.uint8)
sat = (np.max(rgb, 2) - np.min(rgb, 2))
pink = ((R - G > 10) & (sat > 16) & (B > G - 6)).astype(np.uint8)                               # bleikar flóttaleiðaörvar á gólfinu
dark = (L < 110).astype(np.uint8)
thick = cv2.dilate(cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))), k7)   # veggjalínur — ekki hreyfa
fl_near = cv2.dilate(floor, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
pink = cv2.dilate(pink, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
linur = ((thin | pink) & fl_near & (thick == 0)).astype(np.uint8)
linur = cv2.dilate(linur, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
linur[thick > 0] = 0
dk = ((L < 184) & (floor > 0)).astype(np.uint8)
nb, lab, st, _ = cv2.connectedComponentsWithStats(dk, connectivity=8)
blettir = np.isin(lab, [i for i in range(1, nb) if st[i, cv2.CC_STAT_AREA] < 900 and max(st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]) < 40]).astype(np.uint8)
blettir = cv2.dilate(blettir, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))); blettir[thick > 0] = 0
linur = np.maximum(linur, blettir)
clean = cv2.inpaint(im, linur * 255, 5, cv2.INPAINT_TELEA)
cl = clean[:, :, ::-1].astype(np.float32)
cL = 0.299 * cl[:, :, 0] + 0.587 * cl[:, :, 1] + 0.114 * cl[:, :, 2]
print('línur fjarlægðar (díl):', int(linur.sum()), ' gólf (díl):', int(floor.sum()))

# 2) skuggar myndarinnar (lágtíðni) → skugga-stuðull; gólfið sjálft endurbyggt
shade = cv2.GaussianBlur(np.clip(cL / 197.0, 0.55, 1.08), (0, 0), 2.2)
def noise(sig, amp):
    n = rng.standard_normal((H, W)).astype(np.float32); n = cv2.GaussianBlur(n, (0, 0), sig); n /= (n.std() + 1e-6); return n * amp
mod = 1 + noise(170, 0.050) + noise(60, 0.036) + noise(16, 0.016) + noise(1.4, 0.009)     # skýjað steypa → fínt korn
# litbrigði (hlýrri/kaldari blettir)
tint = noise(110, 1.6)
# mjúk „pólering": ljósari á ská efst-til-vinstri → neðst (gefur gólfinu dýpt)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
sheen = 1 + 0.035 * np.exp(-(((xx - W * 0.45) / (W * 0.45)) ** 2 + ((yy - H * 0.55) / (H * 0.55)) ** 2) * 1.2)
base = np.array([180.0, 182.5, 187.0], dtype=np.float32)
fd = cv2.distanceTransform((floor > 0).astype(np.uint8), cv2.DIST_L2, 5)
ao = 1 - 0.16 * np.exp(-fd / 15.0)
new = base[None, None, :] * (shade * mod * sheen * ao)[:, :, None]
new[:, :, 0] += tint; new[:, :, 2] -= tint * 0.8

# 3) sagarskurðir: línur í gólfplaninu á 6 m fresti (1 m = veggH/3 heimseiningar), með sömu vörpun og myndin
def proj_w(wx, wz, y=0.0):
    cx = e[0] * wx + e[4] * y + e[8] * wz + e[12]; cy = e[1] * wx + e[5] * y + e[9] * wz + e[13]; cw = e[3] * wx + e[7] * y + e[11] * wz + e[15]
    return ((cx / cw + 1) / 2 * vm['heild'][0] - vm['rammi'][0], (1 - cy / cw) / 2 * vm['heild'][1] - vm['rammi'][1])
M1 = vm['veggH'] / 3.0; S = 6.0 * M1
gw2, gh2 = k['gw'] / 2, k['gh'] / 2
joint = np.zeros((H, W), np.uint8)
n0x, n1x = int(np.floor(-gw2 / S)), int(np.ceil(gw2 / S)); n0z, n1z = int(np.floor(-gh2 / S)), int(np.ceil(gh2 / S))
for i in range(n0x, n1x + 1):
    pts = np.array([proj_w(i * S, -gh2 + (gh2 * 2) * t / 60.0) for t in range(61)], np.float32)
    cv2.polylines(joint, [np.round(pts * 1).astype(np.int32)], False, 255, 1, cv2.LINE_AA)
for j in range(n0z, n1z + 1):
    pts = np.array([proj_w(-gw2 + (gw2 * 2) * t / 60.0, j * S) for t in range(61)], np.float32)
    cv2.polylines(joint, [np.round(pts * 1).astype(np.int32)], False, 255, 1, cv2.LINE_AA)
jf = cv2.GaussianBlur(joint.astype(np.float32) / 255.0, (0, 0), 0.8)
new *= (1 - 0.085 * jf)[:, :, None]
# lítil ljós brún við sagarskurð (skýr dýpt): færð 1 díl niður-til-hægri
jb = np.roll(np.roll(jf, 1, 0), 1, 1); new += (0.05 * 255 * np.clip(jb - jf, 0, 1))[:, :, None]

# 4) gólfmengi (aðeins innan gólfflatar teikningarinnar), mjúkir kantar
quad = np.zeros((H, W), np.uint8)
q = np.array([proj_w(-gw2, -gh2), proj_w(gw2, -gh2), proj_w(gw2, gh2), proj_w(-gw2, gh2)], np.int32)
cv2.fillConvexPoly(quad, q, 1)
alpha = (floor & quad).astype(np.float32); alpha[thick > 0] = 0
alpha = cv2.GaussianBlur(alpha, (0, 0), 0.9)
out = rgb * (1 - alpha[:, :, None]) + np.clip(new, 0, 255) * alpha[:, :, None]
res = np.clip(out, 0, 255).astype(np.uint8)[:, :, ::-1]
cv2.imwrite(os.path.join(HER, 'vm%d_golf.jpg' % HAED), res, [cv2.IMWRITE_JPEG_QUALITY, 96])
cv2.imwrite(os.path.join(HER, 'vm%d_linur.png' % HAED), (linur * 255).astype(np.uint8))
print('vistað vm%d_golf.jpg' % HAED)
