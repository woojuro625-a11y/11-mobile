import json,math,sys
S=sys.argv[1]
d=json.load(open(S+'/fit.json'))
recs=d['records']
from datetime import datetime
t0=datetime.fromisoformat(recs[0]['timestamp'])
rows=[]
for x in recs:
    t=(datetime.fromisoformat(x['timestamp'])-t0).total_seconds()
    rows.append(dict(t=t,d=float(x.get('distance') or 0),hr=x.get('heart_rate'),sp=float(x.get('enhanced_speed') or 0),lat=x.get('position_lat'),lon=x.get('position_long')))
# smoothed speed 30s window
for i,r in enumerate(rows):
    w=rows[max(0,i-15):i+16]; r['ss']=sum(q['sp'] for q in w)/len(w)
k=180/2**31
g=[r for r in rows if r['lat'] is not None]
lat0=sum(r['lat']*k for r in g)/len(g)
P=[]
for r in g[::4]+[g[-1]]:
    P.append([r['lon']*k*math.cos(math.radians(lat0))*111320, -r['lat']*k*110540, r['d'], r['t'], r['hr'], round(1000/r['ss']) if r['ss']>0.5 else 0])
mx=min(p[0] for p in P); my=min(p[1] for p in P)
P=[[round(p[0]-mx,1),round(p[1]-my,1),round(p[2],1),round(p[3]),p[4],p[5]] for p in P]
hr=[r['hr'] for r in rows if r['hr']]
hrs=[round(sum(hr[i:i+10])/len(hr[i:i+10]),1) for i in range(0,len(hr),10)]
Z=[117,131,144,158,172]
cnt=[0]*6
for h in hr:
    z=sum(1 for b in Z if h>=b); cnt[z]+=1
laps=[[l['total_distance'],l['total_timer_time']] for l in d['laps']]
out={'route':P,'hr':hrs,'laps':laps,'zoneSec':cnt,'zones':Z}
json.dump(out,open(S+'/build2/data.json','w'))
print(len(P),len(hrs),'zone secs (below,Z1..Z5):',cnt,[round(c/len(hr)*100,1) for c in cnt])
