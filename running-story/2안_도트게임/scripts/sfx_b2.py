# 8-bit SFX for 2안 (square / triangle / noise), very low volume
import numpy as np, wave, sys, json
SR=48000; DUR=30.0; N=int(SR*DUR); L=np.zeros(N); R=np.zeros(N); rng=np.random.default_rng(3)
T=json.load(open(sys.argv[2]))
def place(sig,t,g=1.0,pan=0.0):
    i=int(t*SR); n=min(len(sig),N-i)
    if n<=0: return
    l=np.cos((pan+1)*np.pi/4)*1.414; r=np.sin((pan+1)*np.pi/4)*1.414
    L[i:i+n]+=sig[:n]*g*l; R[i:i+n]+=sig[:n]*g*r
def env(n,a=.002,d=None):
    e=np.ones(n); na=max(1,int(a*SR)); e[:na]=np.linspace(0,1,na)
    if d: e*=np.exp(-np.arange(n)/SR/d)
    nr=max(1,int(.005*SR)); e[-nr:]*=np.linspace(1,0,nr); return e
def sq(f,dur,duty=.5,d=None,vol=.5):
    t=np.arange(int(dur*SR))/SR; s=np.where((t*f)%1<duty,1.0,-1.0); return s*env(len(t),d=d)*vol
def tri(f,dur,d=None,vol=.6):
    t=np.arange(int(dur*SR))/SR; s=2*np.abs(2*((t*f)%1)-1)-1; return s*env(len(t),d=d)*vol
def noise(dur,d=.08,vol=.4,step=4):
    n=int(dur*SR); x=np.repeat(rng.uniform(-1,1,n//step+1),step)[:n]; return x*env(n,d=d)*vol
def seq(notes,nd,fn=sq,**k):
    out=np.concatenate([fn(f,nd,**k) if f else np.zeros(int(nd*SR)) for f in notes]); return out
NOTE=lambda m:440*2**((m-69)/12)
blip=lambda f=1320:sq(f,.05,.25,d=.03,vol=.35)
sel=lambda:np.concatenate([sq(1046,.035,.25,vol=.3),sq(1568,.05,.25,d=.04,vol=.3)])
coin=lambda:np.concatenate([sq(988,.05,.5,vol=.35),sq(1319,.16,.5,d=.08,vol=.35)])
openw=lambda:np.concatenate([sq(523,.03,.25,vol=.25),sq(784,.03,.25,vol=.25),sq(1046,.05,.25,d=.04,vol=.25)])
tick=lambda:sq(2093,.012,.125,vol=.12)
def glide(f0,f1,dur,vol=.3):
    t=np.arange(int(dur*SR))/SR; f=np.linspace(f0,f1,len(t)); ph=np.cumsum(f)/SR; return np.where(ph%1<.5,1.,-1.)*env(len(t),d=dur/2)*vol
EV=0
def ev(sig,t,g=1,pan=0):
    global EV; EV+=1; place(sig,t,g,pan)
# opening
ev(seq([NOTE(72),NOTE(76),NOTE(79),NOTE(84)],.06,sq,duty=.25,vol=.28),0.05)
ev(blip(1568),0.6,.8)
ev(glide(1400,300,.35),1.2,.7)
ev(openw(),1.55)
for t0 in (2.6,3.05,3.5): ev(sel(),t0,.8,-.3)
ev(noise(.4,d=.15,vol=.3),4.45)
# stage map
ev(openw(),4.95)
for k in range(9): ev(tick(),5.15+k*.08,1,.2)
for i,t0 in enumerate(T['coin']): ev(coin(),t0,.8,-.6+1.2*i/max(1,len(T['coin'])-1))
ev(seq([NOTE(76),NOTE(79),NOTE(83),NOTE(88),NOTE(91)],.045,sq,duty=.25,vol=.3),T['max'],1,.6)
ev(openw(),8.1); ev(noise(.4,d=.15,vol=.3),9.3)
# status
for t0 in (9.7,9.8,10.5): ev(openw(),t0,.8)
for i in range(7): ev(sel(),10.2+.32*i,.6,.2)
for i in range(8): ev(tick(),10.8+.08*i,1,-.2)
ev(noise(.4,d=.15,vol=.3),14.1)
# zones
ev(openw(),14.5); ev(glide(300,900,.6,.18),15.0); ev(openw(),15.3); ev(glide(200,700,1.1,.14),15.55)
for t0 in (16.0,16.5): ev(np.concatenate([tri(110,.07,d=.05,vol=.7),np.zeros(int(.08*SR)),tri(98,.08,d=.05,vol=.55)]),t0,1)
ev(openw(),16.6)
for k in range(8): ev(tick(),16.8+k*.075,1,.2)
# stage clear
fan=[NOTE(72),NOTE(76),NOTE(79),NOTE(84),None,NOTE(79),NOTE(84),NOTE(88)]
ev(seq(fan,.11,sq,duty=.5,vol=.28)+0,18.0)
ev(seq([NOTE(48),NOTE(52),NOTE(55),NOTE(60),None,NOTE(55),NOTE(60),NOTE(64)],.11,tri,vol=.4),18.0)
for i,t0 in enumerate((18.2,18.45,18.7,18.95,19.2)): ev(noise(.25,d=.06,vol=.35,step=8),t0,.7,-.6+.3*i)
ev(noise(.4,d=.15,vol=.25),19.7)
# result
ev(blip(1046),20.1); 
for i in range(6): ev(blip(1318+i*60),20.4+.07*i,.6)
ev(openw(),20.9)
k=0;t0=21.2
while t0<23.4: ev(tick(),t0,.8,(k%3-1)*.2); k+=1; t0+=.06
print('events',EV)
st=np.stack([L,R],1); st/=np.abs(st).max(); st*=10**(-15.0/20)
fo=int(.3*SR); st[-fo:]*=np.linspace(1,0,fo)[:,None]
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype('<i2').tobytes())
