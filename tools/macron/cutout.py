import sys, numpy as np
from collections import deque
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32)
H, W, _ = a.shape
ys, xs = np.mgrid[0:H, 0:W]
# background samples: left/right/top borders above the shoulders
samp = np.zeros((H, W), bool)
samp[:420, :6] = True; samp[:420, -6:] = True; samp[:4, :] = True
# exclude non-grey pixels from samples (hair touching the border)
sat = a.max(2) - a.min(2)
samp &= sat < 18
X = np.stack([np.ones(H*W), xs.ravel()/W, ys.ravel()/H, (xs.ravel()/W)**2, (ys.ravel()/H)**2, (xs.ravel()*ys.ravel())/(W*H)], 1)
m = samp.ravel()
pred = np.zeros_like(a)
for c in range(3):
    coef, *_ = np.linalg.lstsq(X[m], a[..., c].ravel()[m], rcond=None)
    pred[..., c] = (X @ coef).reshape(H, W)
diff = np.sqrt(((a - pred) ** 2).sum(2))
bglike = sat <= (int(sys.argv[3]) if len(sys.argv) > 3 else 8)
# flood fill from borders through bg-like pixels
bg = np.zeros((H, W), bool)
q = deque()
for y in range(H):
    for x in (0, W - 1):
        if bglike[y, x]: bg[y, x] = True; q.append((y, x))
for x in range(W):
    if bglike[0, x]: bg[0, x] = True; q.append((0, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < H and 0 <= nx < W and not bg[ny, nx] and bglike[ny, nx]:
            bg[ny, nx] = True; q.append((ny, nx))
fg = ~bg
cx, cy, rx, ry = 189, 700, 260, 290
shoulders = ((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2 <= 1
fg = (fg & (ys < 440)) | (shoulders & (ys >= 425))
fg[380:, :32] = False  # artist's signature (credited in the game and README instead)
# keep the largest connected foreground component
lab = np.zeros((H, W), np.int32); cur = 0; sizes = {}
for y0 in range(H):
    for x0 in range(W):
        if fg[y0, x0] and not lab[y0, x0]:
            cur += 1; lab[y0, x0] = cur; q.append((y0, x0)); n = 0
            while q:
                y, x = q.popleft(); n += 1
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    ny, nx = y+dy, x+dx
                    if 0 <= ny < H and 0 <= nx < W and fg[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = cur; q.append((ny, nx))
            sizes[cur] = n
big = max(sizes, key=sizes.get)
fg = lab == big
mask = Image.fromarray((fg * 255).astype(np.uint8))
mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # remove specks
mask = mask.filter(ImageFilter.GaussianBlur(0.9))
np.save(out + '.npy', np.asarray(mask))
rgba = im.copy(); rgba.putalpha(mask)
rgba.save(out)
# preview on green
prev = Image.new('RGB', (W*2+10, H), (95, 181, 68))
prev.paste(im, (0, 0)); prev.paste(rgba, (W+10, 0), rgba)
prev.save(out.replace('.png', '-preview.png'))
print('done', W, H, 'fg ratio', fg.mean())
