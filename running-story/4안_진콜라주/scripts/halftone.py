# zine-style halftone print of a photo (4:5 crop, round dots in one ink on tinted paper)
# usage: python3 -I halftone.py <photo.jpg> <out.png> <ink hex> <paper hex> [cell px]
import sys
from PIL import Image, ImageDraw, ImageOps, ImageFilter
src, dst, ink, paper = sys.argv[1:5]; cell = int(sys.argv[5]) if len(sys.argv) > 5 else 9
im = ImageOps.exif_transpose(Image.open(src)).convert('L'); W, H = im.size
ch = int(W * 5 / 4)
if ch <= H: im = im.crop((0, (H - ch) // 2, W, (H - ch) // 2 + ch))
im = ImageOps.autocontrast(im, cutoff=1).resize((900, 1125), Image.LANCZOS)
import math
m = sum(i * c for i, c in enumerate(im.histogram())) / (900 * 1125 * 255)          # night photos: lift the mids to about 50% grey
g = math.log(.5) / math.log(min(.95, max(.05, m))); im = im.point(lambda v: 255 * (v / 255) ** g)
out = Image.new('RGB', (900, 1125), paper); d = ImageDraw.Draw(out)
small = im.resize((900 // cell + 1, 1125 // cell + 1), Image.BOX)
for gy in range(small.height):
    for gx in range(small.width):
        v = 1 - small.getpixel((gx, gy)) / 255; r = cell * .62 * v ** .8
        if r > .5:
            cx = gx * cell + (cell / 2 if gy % 2 else 0); cy = gy * cell
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ink)
out.filter(ImageFilter.SMOOTH).save(dst); print(dst, out.size)
