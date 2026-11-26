# FIT -> data.js for the running story (route, HR buckets, laps, Garmin zones, session summary)
import sys,json,math,fitdecode
fit,out=sys.argv[1],sys.argv[2]
rec=[];laps=[];sess={};tiz=None;act={}
with fitdecode.FitReader(fit) as fr:
    for m in fr:
        if not isinstance(m,fitdecode.FitDataMessage):continue
        d={x.name:x.value for x in m.fields if x.value is not None and 'unknown' not in x.name}
        if m.name=='record':rec.append(d)
        elif m.name=='lap':laps.append(d)
        elif m.name=='session':sess=d
        elif m.name=='activity':act=d
        elif m.name=='time_in_zone' and d.get('reference_mesg')=='session':tiz=d
t0=rec[0]['timestamp']
rows=[dict(t=(r['timestamp']-t0).total_seconds(),d=float(r.get('distance') or 0),hr=r.get('heart_rate'),sp=float(r.get('enhanced_speed') or 0),lat=r.get('position_lat'),lon=r.get('position_long')) for r in rec]
for i,r in enumerate(rows):
    w=rows[max(0,i-15):i+16]; r['ss']=sum(q['sp'] for q in w)/len(w)
k=180/2**31; g=[r for r in rows if r['lat'] is not None]
route=[]
if g:
    lat0=sum(r['lat']*k for r in g)/len(g)
    P=[[r['lon']*k*math.cos(math.radians(lat0))*111320,-r['lat']*k*110540,r['d'],r['t'],r['hr'],round(1000/r['ss']) if r['ss']>.5 else 0] for r in (g[::4]+[g[-1]])]
    mx=min(p[0] for p in P);my=min(p[1] for p in P)
    route=[[round(p[0]-mx,1),round(p[1]-my,1),round(p[2],1),round(p[3]),p[4],p[5]] for p in P]
hr=[r['hr'] for r in rows if r['hr']]
hrs=[round(sum(hr[i:i+10])/len(hr[i:i+10]),1) for i in range(0,len(hr),10)]
zones=list(tiz['hr_zone_high_boundary'][:5]) if tiz else [117,131,144,158,172]
zsec=[round(x) for x in tiz['time_in_hr_zone'][:6]] if tiz else None
if zsec is None:
    zsec=[0]*6
    for h in hr: zsec[sum(1 for b in zones if h>=b)]+=1
L=[[l['total_distance'],l['total_timer_time']] for l in laps if l.get('total_distance',0)>=100]   # drop tiny tail laps
lt=act.get('local_timestamp') or sess.get('start_time')
wd='월화수목금토일'[lt.weekday()];h=lt.hour;ap='오전' if h<12 else '오후';h12=h%12 or 12
info=dict(dist=sess.get('total_distance'),time=sess.get('total_timer_time'),avgHR=sess.get('avg_heart_rate'),maxHR=sess.get('max_heart_rate'),kcal=sess.get('total_calories'),
  cad=(sess.get('avg_running_cadence') or 0)*2,date=f"{lt.month}월 {lt.day}일 {ap} {h12}시 {lt.minute}분",dateLong=f"{lt.month}월 {lt.day}일 {wd}요일 {ap} {h12}시 {lt.minute}분")
D={'route':route,'hr':hrs,'laps':L,'zoneSec':zsec,'zones':zones,'session':info}
open(out,'w').write('const DATA='+json.dumps(D,ensure_ascii=False)+';\n')
print(json.dumps(info,ensure_ascii=False),'laps',len(L),'zones',zones,zsec,'hr buckets',len(hrs),'records',len(rows))
