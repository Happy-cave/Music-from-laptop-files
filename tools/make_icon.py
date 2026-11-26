"""Draws the Snowtune icon: a white music note with a small snowflake on a red rounded square.
Writes web/icon-512.png, web/icon-192.png and snowtune.ico. Needs Pillow."""
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
N = 1024                      # draw big, scale down for smooth edges
RED, DARK, WHITE = (179, 38, 47), (140, 24, 32), (255, 255, 255)

img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# background: rounded square, soft top-to-bottom red gradient
grad = Image.new("RGBA", (N, N))
gd = ImageDraw.Draw(grad)
for y in range(N):
    t = y / N
    gd.line((0, y, N, y), fill=tuple(round(RED[i] + (DARK[i] - RED[i]) * t) for i in range(3)) + (255,))
mask = Image.new("L", (N, N), 0)
ImageDraw.Draw(mask).rounded_rectangle((40, 40, N - 40, N - 40), radius=210, fill=255)
img.paste(grad, (0, 0), mask)
d = ImageDraw.Draw(img)

# beamed pair of notes
stem_w = 46
lx, rx = 440, 740             # stem x positions (right edge of each stem)
top_l, top_r = 300, 250
d.polygon([(lx - stem_w, top_l), (rx, top_r - 0), (rx, top_r + 95), (lx - stem_w, top_l + 95)], fill=WHITE)  # beam
d.rectangle((lx - stem_w, top_l, lx, 690), fill=WHITE)
d.rectangle((rx - stem_w, top_r, rx, 640), fill=WHITE)
for cx, cy in ((lx - 90, 700), (rx - 90, 650)):
    head = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(head).ellipse((cx - 105, cy - 72, cx + 105, cy + 72), fill=WHITE)
    head = head.rotate(22, center=(cx, cy), resample=Image.BICUBIC)
    img = Image.alpha_composite(img, head)
d = ImageDraw.Draw(img)

# small snowflake, bottom right
sx, sy, r, w = 805, 815, 88, 22
for k in range(6):
    a = math.radians(90 + k * 60)
    ex, ey = sx + r * math.cos(a), sy - r * math.sin(a)
    d.line((sx, sy, ex, ey), fill=WHITE, width=w)
    for side in (-1, 1):  # little V branches
        b = a + side * math.radians(40)
        mx, my = sx + r * 0.55 * math.cos(a), sy - r * 0.55 * math.sin(a)
        d.line((mx, my, mx + 38 * math.cos(b), my - 38 * math.sin(b)), fill=WHITE, width=w - 6)
d.ellipse((sx - 18, sy - 18, sx + 18, sy + 18), fill=WHITE)

img.resize((512, 512), Image.LANCZOS).save(ROOT / "web" / "icon-512.png")
img.resize((192, 192), Image.LANCZOS).save(ROOT / "web" / "icon-192.png")
img.resize((256, 256), Image.LANCZOS).save(
    ROOT / "snowtune.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icons written")
