# Cut the memo text block out of a Garmin Connect capture and join the parts above and below
# (the memo is shown in full at the end of the video, so the capture does not need it)
# usage: python3 -I cut_memo.py <capture.png> <out.png> <y_from> <y_to>
#   y_from: just below the activity title row   y_to: just above the big distance number
#   for the 11/26 capture (1080x1873): 850 1240  -> 1080x1483
import sys
from PIL import Image
src, dst, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGB'); w, h = im.size
out = Image.new('RGB', (w, h - (b - a))); out.paste(im.crop((0, 0, w, a)), (0, 0)); out.paste(im.crop((0, b, w, h)), (0, a))
out.save(dst); print(out.size, '-> set CAP.h in story.html to', out.size[1])
