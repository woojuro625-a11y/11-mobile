import sys
from PIL import Image
S=sys.argv[1]
for n in ['front','e19','e25','e26','e28','e30','e49','e01']:
    im=Image.open(f'{S}/char/{n}.png'); a=im.getchannel('A').point(lambda v:255 if v>8 else 0); im=im.crop(a.getbbox())
    h=700 if n=='front' else 560
    if im.height>h: im=im.resize((round(im.width*h/im.height),h),Image.LANCZOS)
    im.save(f'{S}/build2/img/{n}.png',optimize=True); print(n,im.size)
