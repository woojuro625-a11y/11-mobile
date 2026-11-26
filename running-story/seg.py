import sys,glob,os,numpy as np,onnxruntime as ort
from PIL import Image
S=sys.argv[1]; sess=ort.InferenceSession(S+'/models/birefnet.onnx')
mean=np.array([.485,.456,.406]);std=np.array([.229,.224,.225])
for f in sorted(glob.glob(S+'/char/*_raw.png')):
    im=Image.open(f).convert('RGB'); W,H=im.size
    # upscale small cells first for nicer output
    up=4 if W<300 else 2
    big=im.resize((W*up,H*up),Image.LANCZOS)
    x=np.asarray(big.resize((1024,1024),Image.BILINEAR))/255.
    x=((x-mean)/std).transpose(2,0,1)[None].astype(np.float32)
    o=sess.run(None,{'input_image':x})[0][0,0]
    if o.min()<0 or o.max()>1: o=1/(1+np.exp(-o))
    m=Image.fromarray((np.clip(o,0,1)*255).astype(np.uint8)).resize(big.size,Image.LANCZOS)
    big.putalpha(m); bb=big.getbbox()
    out=f.replace('_raw.png','.png'); big.save(out)
    print(os.path.basename(out), big.size, float(o.min()),float(o.max()))
