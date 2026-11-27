import re,urllib.request,urllib.parse,os,sys
B=sys.argv[1]
html=open(B+'/story.html',encoding='utf8').read()+open(B+'/data.js',encoding='utf8').read()+'0123456789:%.~'
ko=''.join(sorted(set(c for c in html if ord(c)>0x3000)))
asc=''.join(chr(i) for i in range(32,127))+'·'
txt=asc+ko
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
fams=['Permanent+Marker','Black+Han+Sans','Noto+Sans+KR:wght@500;700;900','East+Sea+Dokdo','Sedgwick+Ave+Display']
url='https://fonts.googleapis.com/css2?'+'&'.join('family='+f for f in fams)+'&text='+urllib.parse.quote(txt)
css=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA})).read().decode()
def dl(m):
    u=m.group(1);fn='fonts/f%d.woff2'%dl.n;dl.n+=1
    open(B+'/'+fn,'wb').write(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':UA})).read())
    return 'url(%s)'%fn
dl.n=0
css=re.sub(r'url\((https://[^)]+)\)',dl,css)
open(B+'/fonts.css','w').write(css)
print(ko, dl.n); print(css[:600])
