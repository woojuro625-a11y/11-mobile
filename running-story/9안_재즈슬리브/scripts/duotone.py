# duotone photo strips for 9안: python3 -I duotone.py <photo> <out.png> <dark> <mid> <light> [w h]
import sys
from PIL import Image,ImageOps
import numpy as np
src,dst,c0,c1,c2=sys.argv[1:6];w,h=(int(sys.argv[6]),int(sys.argv[7])) if len(sys.argv)>7 else (330,640)
im=ImageOps.fit(ImageOps.exif_transpose(Image.open(src)).convert('RGB'),(w,h),Image.LANCZOS)
a=np.asarray(im).astype(np.float32)/255;l=np.clip(((a*[.3,.59,.11]).sum(2)-.08)/.84,0,1)
C=[np.array([int(c[i:i+2],16) for i in (1,3,5)],np.float32) for c in (c0,c1,c2)]
lo=l<.55;u=np.where(lo,l/.55,(l-.55)/.45)[...,None]
out=np.where(lo[...,None],C[0]+(C[1]-C[0])*u,C[1]+(C[2]-C[1])*u)
Image.fromarray(out.clip(0,255).astype(np.uint8)).save(dst);print(dst,w,h)
