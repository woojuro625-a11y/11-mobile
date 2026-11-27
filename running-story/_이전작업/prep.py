import json,math
S='/tmp/claude-0/-home-user-11-mobile/35c06646-99b6-5b66-9146-35a752a2fbc4/scratchpad'
d=json.load(open(S+'/fit.json'))
r=[x for x in d['records'] if 'position_lat' in x]
k=180/2**31
lat0=sum(x['position_lat']*k for x in r)/len(r)
P=[(x['position_long']*k*math.cos(math.radians(lat0))*111320, -x['position_lat']*k*110540, float(x['distance'])) for x in r]
# downsample every 4 records
P=P[::4]+[P[-1]]
mx=min(p[0] for p in P); my=min(p[1] for p in P)
P=[[round(p[0]-mx,1),round(p[1]-my,1),round(p[2],1)] for p in P]
hr=[x['heart_rate'] for x in d['records'] if x.get('heart_rate')]
# 15s buckets
hrs=[round(sum(hr[i:i+15])/len(hr[i:i+15]),1) for i in range(0,len(hr),15)]
laps=[[l['total_distance'],l['total_timer_time']] for l in d['laps']]
json.dump({'route':P,'hr':hrs,'laps':laps},open(S+'/build/data.json','w'))
print(len(P),len(hrs),laps, min(hr),max(hr))
