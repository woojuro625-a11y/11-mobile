import numpy as np, wave, sys
from scipy.signal import butter, sosfilt
SR=48000; DUR=28.0; N=int(SR*DUR)
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
# Scene 1
place(whoosh(.45,800,4000,.4),0.05,.25)
for k in range(13): place(tick(3000+rng.random()*600),0.15+k*0.065,.55,-.2)
place(whoosh(.55,2500,500,.7,False),0.38,.25)
for t0,g in zip([.95,1.5,1.9,2.18],[1,.7,.5,.32]): place(bounce(g),t0,1.0)
place(scribble(.45,1),2.25,1,.3); place(scribble(.3,2),2.42,.7,.3)
for i in range(9): place(thud(260,120,.12,.6),2.45+i*.05+.33,.45,(i-4)/6)
place(whoosh(.3,1200,5000,.5),2.98,.45)
place(scribble(.55,3),3.05,.9)
place(whoosh(.5,600,3000,.5),3.85,.4)
place(whoosh(.6,400,2500,.5),3.98,.35)
# Scene 2
for k in range(10): place(tick(3100+rng.random()*500),4.3+k*.065,.5,.2)
place(scribble(.75,4)*.6,4.35,.7)
place(pop(1100,500),4.75,.6)
place(scribble(.4,5),5.0,1,-.4); place(scribble(.3,6),5.15,.7,-.4)
place(draw_tex(3.5),4.95,.5)
ts=np.arange(4.95,8.45,0.1)
for t0 in ts:
    p=(t0-4.95)/3.5; sp=max(.15,np.sin(np.pi*p)); place(tick(4200,.015),t0,.45*sp)
def t_at(dk,total=5564.25):
    lo,hi=0,1
    for _ in range(30):
        m=(lo+hi)/2
        if eio3(m)*total<dk: lo=m
        else: hi=m
    return 4.95+3.5*lo
for i,dk in enumerate([1000,2000,3000,4000,5000]): place(pop(700+i*90,300+i*40),t_at(dk),.75)
place(chime(1318.5),8.45,.8); place(chime(1975.5,1.0),8.52,.35)
place(scribble(.5,7),8.45,.9); place(scribble(.45,8),8.6,.9)
place(riser(.95),8.65,.7)
# Scene 3
place(boom(),9.6,.6); place(sparkle(),9.62,.8)
place(whoosh(.35,800,7000,.6),10.1,.7)
for i in range(4): place(whoosh(.5,300,2500,.8),10.25+i*.08,.35,(i-1.5)/2)
place(thud(180,50,.4,.8),11.02,.95)
place(pop(1200,600),10.95,.6,.5)
place(scribble(.5,9),11.3,.9); place(whoosh(.3,1500,5000,.5),11.55,.35)
place(whoosh(.5,300,1500,.5),12.0,.35)
# slot ticks decelerating
for i in range(4):
    t0=12.3+i*.09; d=.65; k=0
    while True:
        dt=0.02+0.13*(k/22)**2
        if k>0 and sum(0.02+0.13*(j/22)**2 for j in range(k))>d: break
        tk=t0+sum(0.02+0.13*(j/22)**2 for j in range(k)); place(tick(3600-i*200,.012),tk,.28,(i-1.5)/3); k+=1
    place(thud(300,150,.1,.9),t0+d,.4,(i-1.5)/3)
place(whoosh(.55,4000,500,.3,False),12.92,.6,.6)
place(thud(170,50,.4,.8),13.45,.9)
place(pop(1000,450),13.38,.55,.4)
place(whoosh(.8,200,4000,.15),13.93,.65); place(thud(100,40,.4,.4),13.95,.5)
# Scene 4
for k in range(9): place(tick(3000+rng.random()*600),14.8+k*.055,.45,-.3)
place(whoosh(.45,1000,4000,.5),14.85,.3)
place(whoosh(.35,2000,6000,.5),15.3,.25)
place(draw_tex(1.5),15.45,.35)
notes=[523.25,587.33,659.25,783.99,880.0,1046.5]
for i in range(6): place(pop(notes[i]*1.6,notes[i]),15.7+.25*i,.65,-.5+i*.2)
place(scribble(.35,10),16.9,.9); place(scribble(.35,11),17.1,.9); place(scribble(.3,12),17.15,.5)
place(whoosh(.5,600,3500,.5),17.5,.45)
for k in range(8): place(tick(3000+rng.random()*600),17.8+k*.05,.45,-.3)
place(draw_tex(1.45),18.15,.4)
for k in range(14): place(tick(3800,.012),19.0+k*.05*(1+k/14),.3)
place(whoosh(.35,2000,6000,.5),19.4,.25)
place(scribble(.4,13),19.65,.9); place(scribble(.3,14),19.85,.5)
for t0 in [19.85,20.35]: place(heartbeat(),t0,1.1)
# block wipe
for i in range(8): place(whoosh(.28,800,5000,.4),20.9+i*.03,.18,(-1 if i%2 else 1)*.6)
place(whoosh(.6,300,3000,.5),21.05,.5)
# Scene 6
place(whoosh(.7,500,3000,.6),21.55,.45,.6)
place(bounce(1.0),22.25,.9)
for i in range(2): place(thud(220,90,.18,.7),22.6+i*.14,.5)
place(whoosh(.35,1500,6000,.5),23.05,.35)
place(whoosh(.5,1500,4000,.5),23.2,.2)
for i in range(6):
    place(pop(820+i*60,380+i*30,.1),23.4+i*.12,.6,(-.4 if i%2==0 else .4))
    for k in range(5): place(tick(4200,.01),23.4+i*.12+k*.1,.15)
place(scribble(.6,15),24.6,.95); place(scribble(.3,16),25.0,.6)
place(draw_tex(1.3),24.9,.35)
place(chime(1046.5,2.2),25.85,.6); place(chime(1567.98,2.0),25.93,.35); place(chime(2093.0,1.8),26.02,.2)

# ---------------- master: gentle bus HP, normalize to 70% peak
L=hp(L,35); Rch=hp(Rch,35)
m=max(np.abs(L).max(),np.abs(Rch).max())
L=L/m*0.70; Rch=Rch/m*0.70
fo=int(.4*SR); L[-fo:]*=np.linspace(1,0,fo); Rch[-fo:]*=np.linspace(1,0,fo)
st=np.stack([L,Rch],1)
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype('<i2').tobytes())
print('peak dBFS',20*np.log10(np.abs(st).max()), 'rms dBFS',20*np.log10(np.sqrt((st**2).mean())))
