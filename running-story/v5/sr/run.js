const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:800,height:800}});p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>console.log('LOG',m.text()));
await p.goto('file://'+__dirname+'/run.html');
for(let f=0;f<48;f++){const d=await p.evaluate(([t])=>window.frame('Run',t,0.75),[f/60]);fs.writeFileSync(`${__dirname}/run/r${String(f).padStart(2,'0')}.png`,Buffer.from(d.split(',')[1],'base64'))}
await b.close()})();
