"""Builds tools/portraits/defunes-mask.png, the cut-out mask of the de Funès portrait.

The background of this illustration (white wall on one side, dark street on
the other, black hat and coat) is too busy for build.py's automatic cut-out,
so the mask is made here semi-manually: GrabCut seeded with hand-placed
regions for the hat, then the face band between the outer edges of the two
sidelocks, the white gaps next to the jaw removed, and smooth shoulders.

Usage (needs OpenCV: pip install opencv-python-headless):
    python3 tools/portraits/defunes_mask.py && python3 tools/portraits/build.py
"""
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent

img = cv2.imread(str(HERE / 'defunes.jpg')); H, W = img.shape[:2]
m = np.full((H, W), cv2.GC_BGD, np.uint8)
sil = np.array([(100,24),(400,24),(404,100),(398,150),(372,166),(338,166),(342,180),(340,288),(402,288),(406,342),
                (108,342),(118,296),(136,296),(134,180),(124,166),(98,148)], np.int32)
cv2.fillPoly(m, [sil], cv2.GC_PR_FGD)
cv2.ellipse(m, (245,188), (58,92), 0, 0, 360, cv2.GC_FGD, -1)
cv2.ellipse(m, (248,72), (135,42), 0, 0, 360, cv2.GC_FGD, -1)
cv2.rectangle(m, (146,180), (160,288), cv2.GC_FGD, -1)
cv2.rectangle(m, (308,180), (322,288), cv2.GC_FGD, -1)
cv2.rectangle(m, (160,302), (385,338), cv2.GC_FGD, -1)
cv2.rectangle(m, (100,170), (128,285), cv2.GC_BGD, -1)
cv2.rectangle(m, (346,178), (388,270), cv2.GC_BGD, -1)
bgd = np.zeros((1,65), np.float64); fgd = np.zeros((1,65), np.float64)
cv2.grabCut(img, m, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
gc = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), True, False)  # GrabCut result (good for the hat)
g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(int)
ys, xs = np.mgrid[0:H, 0:W]
mask = np.zeros((H, W), bool)
# 1) hat: GrabCut inside a rounded fur-hat shape (superellipse), with a slightly
#    ragged top edge since the drawing is cut flat at the top
rng = np.random.default_rng(3)
top = 25 + np.convolve(rng.uniform(0, 5, W + 8), np.ones(5) / 5, 'same')[4:W + 4]
sup = (np.abs((xs - 250) / 160.0) ** 3 + np.abs((ys - 98) / 80.0) ** 3) <= 1
hat = gc & sup & (ys >= top[None, :]) & (ys < 170 - ((xs - 250) / 150.0) ** 2 * 18)
mask |= hat
# 2) face band: between the outer edges of the two sidelocks
L = np.full(H, -1); R = np.full(H, -1)
for y in range(160, 300):
    dl = np.nonzero(g[y, 128:180] < 110)[0]
    dr = np.nonzero(g[y, 290:338] < 110)[0]
    if len(dl): L[y] = 128 + dl[0]
    if len(dr): R[y] = 290 + dr[-1]
def smooth(v, lo, hi, take):
    out = v.copy()
    for y in range(lo, hi):
        win = [v[k] for k in range(max(lo, y - 4), min(hi, y + 5)) if v[k] >= 0]
        out[y] = take(win) if win else -1
    return out
L = smooth(L, 160, 300, lambda w: int(np.median(w))); R = smooth(R, 160, 300, lambda w: int(np.median(w)))
for y in range(160, 300):
    if L[y] >= 0 and R[y] >= 0:
        mask[y, L[y]:R[y] + 1] = True
        # white background showing between the curls of the sidelocks
        for x in list(range(L[y], L[y] + 14)) + list(range(R[y] - 13, R[y] + 1)):
            if g[y, x] > 205:
                mask[y, x] = False
# white background between the sidelocks and the jaw (the face narrows towards the chin)
jaw = np.array([(168,160),(174,200),(186,236),(202,262),(226,284),(262,297),(284,288),(295,264),(300,234),(305,200),(310,160)], np.int32)
face = np.zeros((H, W), np.uint8); cv2.fillPoly(face, [jaw], 1)
gap = (((ys >= 168) & (ys <= 282)) | ((ys > 282) & (ys <= 296) & ((xs < 212) | (xs > 294)))) & (face == 0) & (g > 225)
mask &= ~gap
# 3) shoulders: a smooth curve under the chin
cx, cy, rx, ry = 265, 420, 165, 150
sh = (((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2 <= 1) & (ys >= 297) & (ys < 342)
mask |= sh
mask[337:, :] = False
# clean up: open/close and keep the biggest blob
m8 = mask.astype(np.uint8) * 255
m8 = cv2.morphologyEx(m8, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
m8 = cv2.morphologyEx(m8, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(m8)
big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
m8 = np.where(lab == big, 255, 0).astype(np.uint8)
cv2.imwrite(str(HERE / 'defunes-mask.png'), m8)
print('wrote', HERE / 'defunes-mask.png')
