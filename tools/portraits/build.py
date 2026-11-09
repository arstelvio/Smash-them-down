"""Builds the picture-based characters (img/<name>.webp and img/<name>-hit.webp).

Each portrait is cut out from its plain background, framed in the game's
400 x 480 character frame (same layout as the 200 x 240 SVG characters:
head at the top, chin around 75 %, shoulders going down into the hole),
and a "knocked out" version is made with cartoon X eyes and a bump.

Usage (Python 3 with Pillow and NumPy):  python3 tools/portraits/build.py
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / 'img'
FRAME_W, FRAME_H = 400, 480
INK = (46, 28, 16, 255)

PORTRAITS = {
    # Caricature by DonkeyHotey (2018), Creative Commons.
    'macron': {
        'source': 'macron.jpg',
        'background': 'grey',  # neutral grey studio background
        'sat_max': 8,
        # Below the chin, keep a rounded shoulder shape instead of the frame edge.
        'shoulders': {'cx': 189, 'cy': 700, 'rx': 260, 'ry': 290, 'from_y': 425, 'color_until_y': 440},
        'erase': [(0, 380, 32, 529)],  # artist's signature (credited in the game instead)
        'scale': 0.84,
        'offset': ((FRAME_W - 378 * 0.84) / 2, 2),
        'eyes': [(147, 234), (224, 232)],
        'eye_r': 15,
        'eye_skin': (214, 160, 124),
        'bump': (205, 62),
    },
    'obama': {
        'source': 'obama.jpg',
        'background': 'white',
        'lum_min': 226,
        'sat_max': 30,
        'scale': 1.42,
        'offset': (200 - 297 * 1.42, 6 - 10 * 1.42),
        'eyes': [(300, 123), (362, 119)],
        'eye_r': 17,
        'eye_skin': (128, 84, 58),
        'bump': (282, 34),
    },
}


def flood_background(bglike, seeds):
    h, w = bglike.shape
    bg = np.zeros((h, w), bool)
    q = deque()
    for y, x in seeds:
        if bglike[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and bglike[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return bg


def largest_component(fg):
    h, w = fg.shape
    lab = np.zeros((h, w), np.int32)
    best, best_n, cur = 0, 0, 0
    for y0, x0 in zip(*np.nonzero(fg)):
        if lab[y0, x0]:
            continue
        cur += 1
        lab[y0, x0] = cur
        q = deque([(y0, x0)])
        n = 0
        while q:
            y, x = q.popleft()
            n += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur
                    q.append((ny, nx))
        if n > best_n:
            best, best_n = cur, n
    return lab == best


def cut_out(cfg):
    im = Image.open(HERE / cfg['source']).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    h, w, _ = a.shape
    sat = a.max(2) - a.min(2)
    if cfg['background'] == 'grey':
        bglike = sat <= cfg['sat_max']
        seeds = [(y, x) for y in range(min(h, 420)) for x in (0, w - 1)] + [(0, x) for x in range(w)]
    else:
        bglike = (a.min(2) >= cfg['lum_min']) & (sat <= cfg['sat_max'])
        seeds = ([(y, x) for y in range(h) for x in (0, w - 1)]
                 + [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)])
    fg = ~flood_background(bglike, seeds)
    ys, xs = np.mgrid[0:h, 0:w]
    sh = cfg.get('shoulders')
    if sh:
        inside = ((xs - sh['cx']) / sh['rx']) ** 2 + ((ys - sh['cy']) / sh['ry']) ** 2 <= 1
        fg = (fg & (ys < sh['color_until_y'])) | (inside & (ys >= sh['from_y']))
    for x0, y0, x1, y1 in cfg.get('erase', []):
        fg[y0:y1, x0:x1] = False
    fg = largest_component(fg)
    mask = Image.fromarray((fg * 255).astype(np.uint8))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    if cfg['background'] == 'white':
        mask = mask.filter(ImageFilter.MinFilter(3))  # trim the light fringe left by the white background
    mask = mask.filter(ImageFilter.GaussianBlur(0.9))
    rgba = im.convert('RGBA')
    rgba.putalpha(mask)
    return rgba


def frame(cut, cfg):
    s = cfg['scale']
    ox, oy = cfg['offset']
    big = cut.resize((round(cut.width * s), round(cut.height * s)), Image.LANCZOS)
    out = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    dx, dy = round(ox), round(oy)
    out.alpha_composite(big, (max(0, dx), max(0, dy)), (max(0, -dx), max(0, -dy)))
    return out


def knocked_out(img, cfg):
    """Adds X eyes and a bump, drawn 4x larger then scaled down (anti-aliasing)."""
    S = 4
    s = cfg['scale']
    ox, oy = cfg['offset']
    to_frame = lambda x, y: ((x * s + ox) * S, (y * s + oy) * S)

    # skin-coloured patches over the eyes, softly blurred
    patches = Image.new('RGBA', (FRAME_W * S, FRAME_H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(patches)
    r = cfg['eye_r'] * S
    for ex, ey in cfg['eyes']:
        cx, cy = to_frame(ex, ey)
        d.ellipse((cx - r * 1.25, cy - r * 0.9 + S, cx + r * 1.25, cy + r * 0.9 + S), fill=cfg['eye_skin'] + (255,))
    patches = patches.filter(ImageFilter.GaussianBlur(2.2 * S))

    ink = Image.new('RGBA', (FRAME_W * S, FRAME_H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(ink)

    def stroke(p0, p1, width, color):
        d.line([p0, p1], fill=color, width=round(width))
        for px, py in (p0, p1):
            d.ellipse((px - width / 2, py - width / 2, px + width / 2, py + width / 2), fill=color)

    for ex, ey in cfg['eyes']:
        cx, cy = to_frame(ex, ey)
        a1 = ((cx - r, cy - r * 0.85), (cx + r, cy + r * 0.85))
        a2 = ((cx + r, cy - r * 0.85), (cx - r, cy + r * 0.85))
        for width, color in ((11 * S, (255, 255, 255, 255)), (6.5 * S, INK)):
            stroke(*a1, width, color)
            stroke(*a2, width, color)

    bx, by = to_frame(*cfg['bump'])
    rx, ry = 25 * S, 21 * S
    d.ellipse((bx - rx, by - ry, bx + rx, by + ry), fill=INK)
    inner = 3.5 * S
    steps = 12
    for i in range(steps):  # radial gradient, dark red outside -> light inside
        t = i / (steps - 1)
        col = tuple(round(c0 + (c1 - c0) * t) for c0, c1 in zip((228, 72, 60), (255, 154, 138))) + (255,)
        k = 1 - 0.75 * t
        cx, cy = bx - 6 * S * t, by - 5 * S * t
        d.ellipse((cx - (rx - inner) * k, cy - (ry - inner) * k, cx + (rx - inner) * k, cy + (ry - inner) * k), fill=col)
    d.ellipse((bx - 16 * S, by - 12 * S, bx, by - 2 * S), fill=(255, 210, 200, 255))

    over = Image.alpha_composite(patches, ink).resize((FRAME_W, FRAME_H), Image.LANCZOS)
    return Image.alpha_composite(img, over)


def main():
    OUT.mkdir(exist_ok=True)
    for name, cfg in PORTRAITS.items():
        idle = frame(cut_out(cfg), cfg)
        hit = knocked_out(idle, cfg)
        idle.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6)
        hit.save(OUT / f'{name}-hit.webp', 'WEBP', quality=88, method=6)
        print('wrote', f'img/{name}.webp', f'img/{name}-hit.webp')


if __name__ == '__main__':
    main()
