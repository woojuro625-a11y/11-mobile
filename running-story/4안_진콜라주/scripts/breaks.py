# detect mid-run stops (water / rest): timer pauses, record gaps, standing still, HR drop-and-recover
import sys,json,fitdecode
fit,out=sys.argv[1],sys.argv[2]
rec=[];ev=[]
with fitdecode.FitReader(fit) as fr:
    for m in fr:
        if not isinstance(m,fitdecode.FitDataMessage): continue
        if m.name=='record': rec.append({f.name:f.value for f in m.fields})
        elif m.name=='event': ev.append({f.name:f.value for f in m.fields})
n=len(rec); T=[(r['timestamp']-rec[0]['timestamp']).total_seconds() for r in rec]
sp=[float(r.get('enhanced_speed') or 0) for r in rec]; hr=[r.get('heart_rate') or 0 for r in rec]
EDGE=60; cand=[]
# record gaps / timer pauses -> zero-width break at that record index
for i in range(1,n):
    g=T[i]-T[i-1]
    if g>10 and EDGE<i<n-EDGE: cand.append([i,i,'pause',g])
# standing still >= 15 s
i=0
while i<n:
    if sp[i]<1.0:
        j=i
        while j+1<n and sp[j+1]<1.0: j+=1
        if j-i+1>=15 and i>EDGE and j<n-EDGE: cand.append([i,j,'still',T[j]-T[i]])
        i=j+1
    else: i+=1
# HR drop >= 20 bpm within 45 s, then recovers >= 10 bpm within 120 s
i=EDGE
while i<n-EDGE:
    w=hr[i:i+46]
    if hr[i] and min(w)<=hr[i]-20:
        k=i+w.index(min(w)); r=hr[k:k+121]
        if max(r)>=hr[k]+10: cand.append([i,k+r.index(max(r)),'hrdrop',T[k]-T[i]]); i=k+60; continue
    i+=1
# merge overlapping
cand.sort(); merged=[]
for c in cand:
    if merged and c[0]<=merged[-1][1]+30: merged[-1][1]=max(merged[-1][1],c[1]); merged[-1][3]=max(merged[-1][3],c[3]); merged[-1][2]+='+'+c[2]
    else: merged.append(c)
res=[{'s':c[0],'e':c[1],'kind':c[2],'dur':round(c[3])} for c in merged]
open(out,'a').write('\nDATA.breaks='+json.dumps(res)+';DATA.nRec='+str(n)+';\n')
print('breaks:',res,'records:',n)
