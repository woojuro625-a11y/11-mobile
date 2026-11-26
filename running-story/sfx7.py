import numpy as np, wave, sys
from scipy.signal import butter, sosfilt
SR=48000; DUR=30.0; N=int(SR*DUR)
L=np.zeros(N); Rch=np.zeros(N)
rng=np.random.default_rng(7)

def place(sig, t, gain=1.0, pan=0.0):
    i=int(t*SR); s=sig*gain; n=min(len(s), N-i)
    if n<=0: return
    l=np.cos((pan+1)*np.pi/4); r=np.sin((pan+1)*np.pi/4)
    L[i:i+n]+=s[:n]*l*1.414; Rch[i:i+n]+=s[:n]*r*1.414

def tt(d): return np.arange(int(d*SR))/SR
def bp(x, lo, hi, o=2): return sosfilt(butter(o,[lo,hi],btype='band',fs=SR,output='sos'),x)
def lp(x, f, o=2): return sosfilt(butter(o,f,btype='low',fs=SR,output='sos'),x)
def hp(x, f, o=2): return sosfilt(butter(o,f,btype='high',fs=SR,output='sos'),x)
def fade(x, a=0.003, r=0.01):
    n=len(x); na=max(1,int(a*SR)); nr=max(1,int(r*SR))
    e=np.ones(n); e[:na]=np.linspace(0,1,na); e[-nr:]*=np.linspace(1,0,nr); return x*e

def tick(f=3200, d=0.025):
    t=tt(d); s=np.sin(2*np.pi*f*t)*np.exp(-t*260)+bp(rng.standard_normal(len(t)),2000,7000)*np.exp(-t*400)*.4
    return fade(s,.0005,.005)*.35
def pop(f0=900, f1=320, d=0.12):
    t=tt(d); f=f1+(f0-f1)*np.exp(-t*45); ph=2*np.pi*np.cumsum(f)/SR
    return fade(np.sin(ph)*np.exp(-t*38),.001,.02)*.8
def thud(f0=160, f1=55, d=0.25, click=.4):
    t=tt(d); f=f1+(f0-f1)*np.exp(-t*30); ph=2*np.pi*np.cumsum(f)/SR
    s=np.sin(ph)*np.exp(-t*18)+lp(rng.standard_normal(len(t)),1800)*np.exp(-t*90)*click
    return fade(s,.001,.03)
def bounce(g=1.0):
    t=tt(.22); f=240+260*np.exp(-t*60); ph=2*np.pi*np.cumsum(f)/SR
    s=np.sin(ph)*np.exp(-t*22)*.8+thud(120,60,.22,.3)*.7
    return fade(s,.001,.03)*g
def whoosh(d=0.6, lo=300, hi=3500, peak=.55, up=True):
    n=int(d*SR); x=rng.standard_normal(n); t=np.arange(n)/n
    out=np.zeros(n); seg=1024
    for k in range(0,n,seg):
        c=t[min(k+seg//2,n-1)]; fc=lo*(hi/lo)**(c if up else 1-c)
        out[k:k+seg]=bp(x[max(0,k-2048):k+seg],fc*.6,min(fc*1.6,SR/2-100))[-len(out[k:k+seg]):]
    env=np.where(t<peak, (t/peak)**2, ((1-t)/(1-peak))**1.5)
    return fade(out*env*1.6,.005,.02)
def scribble(d=0.5, seed=0):
    r=np.random.default_rng(seed); n=int(d*SR); x=bp(r.standard_normal(n),1500,6500,2)
    t=np.arange(n)/SR; strokes=0.55+0.45*np.sin(2*np.pi*(9+r.random()*4)*t+r.random()*6)**2
    grit=1+0.6*(r.random(n)>0.985)
    env=np.minimum(1,t/0.03)*np.minimum(1,(d-t)/0.06)
    return x*strokes*grit*env*.22
def chime(f=1318.5, d=1.4):
    t=tt(d); s=sum(a*np.sin(2*np.pi*f*m*t)*np.exp(-t*k) for a,m,k in [(1,1,3.2),(.45,2.0,5),(.25,3.01,7),(.5,1.5,4)])
    return fade(s*.35,.002,.1)
def boom(d=1.6):
    t=tt(d); f=40+70*np.exp(-t*6); ph=2*np.pi*np.cumsum(f)/SR
    s=np.sin(ph)*np.exp(-t*2.6)+lp(rng.standard_normal(len(t)),700)*np.exp(-t*9)*.6
    return fade(s,.002,.2)
def riser(d=1.0):
    w=whoosh(d,200,6000,.97,True); t=np.arange(len(w))/len(w)
    tone=np.sin(2*np.pi*np.cumsum(180+600*t**2)/SR)*t**3*.15
    return w*.8+tone
def sparkle(d=.7):
    out=np.zeros(int(d*SR))
    for i in range(10):
        s=tick(2500+rng.random()*4000,.04)*(1-i/10); k=int(rng.random()*d*.8*SR); out[k:k+len(s)]+=s[:len(out)-k]
    return out
def heartbeat():
    a=thud(90,45,.22,.1); b=thud(80,42,.25,.08)*.7
    out=np.zeros(int(.5*SR)); out[:len(a)]+=a; k=int(.16*SR); out[k:k+len(b)]+=b; return lp(out,300)
def draw_tex(d):
    return scribble(d,99)*.45

def eio3(x): return 4*x**3 if x<.5 else 1-(-2*x+2)**3/2

# ---------------- timeline
def mclick():
    a=hp(rng.standard_normal(int(.006*SR)),2500)*np.exp(-np.arange(int(.006*SR))/SR*900)
    out=np.zeros(int(.12*SR)); out[:len(a)]+=a*.9; k=int(.075*SR); out[k:k+len(a)]+=a*.55
    t=np.arange(len(out))/SR; out+=np.sin(2*np.pi*1800*t)*np.exp(-t*300)*.15
    return out*.8
EV=[]
def ev(sig,t,g=1.0,pan=0.0): EV.append(t); place(sig,t,g,pan)
ev(whoosh(.5,500,3000,.4),0.0,.3)          # 1 capture slides in
ev(scribble(.5,3),0.85,.6)                 # 2 pencil circling starts
ev(chime(1318.5),6.2,.6)                   # 3 lap finished
ev(scribble(.6,5),8.5,.7)                  # 4 key phrase
ev(whoosh(.6,300,2600,.6),9.7,.35)         # 5 ink -> black & white
ev(mclick(),11.6,.8,.5)                    # 6 tab click
ev(heartbeat(),14.3,1.1)                   # 7 heartbeat
ev(heartbeat(),14.8,1.0)                   # 8 heartbeat
ev(mclick(),15.5,.8,.7)                    # 9 night toggle
ev(thud(170,50,.4,.8),18.0,.75)            # 10 number box
ev(thud(200,70,.3,.7),20.55,.6)            # 11 title
ev(chime(1046.5,2.0),21.3,.5)              # 12 ending sparkle
print('events',len(EV))
L=hp(L,35); Rch=hp(Rch,35)
m=max(np.abs(L).max(),np.abs(Rch).max()); L=L/m; Rch=Rch/m
fo=int(.4*SR); L[-fo:]*=np.linspace(1,0,fo); Rch[-fo:]*=np.linspace(1,0,fo)
st=np.stack([L,Rch],1)*0.98
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype('<i2').tobytes())
