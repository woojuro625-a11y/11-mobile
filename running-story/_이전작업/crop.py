import sys
from PIL import Image
I,S=sys.argv[1],sys.argv[2]
a=Image.open(I+'/1.webp').convert('RGB')
a.crop((49,186,672,808)).save(S+'/char/front_raw.png')
a.crop((689,186,1311,808)).save(S+'/char/side_raw.png')
b=Image.open(I+'/2.webp').convert('RGB')
xs=[29,224,419,614,809,1004,1199,1394,1589,1784]; ys=[99,320,541,762,983]
for r,y in enumerate(ys):
    for c,x in enumerate(xs):
        b.crop((x,y,x+187,y+187)).save(S+f'/char/e{r*10+c+1:02d}_raw.png')
