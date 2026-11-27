// render the drummer atlas: row-major frames, [hR,hL] listed in FR; 600x660 cells
const {chromium}=require('playwright');const fs=require('fs');const {execSync}=require('child_process');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+__dirname+'/drum.html');await p.evaluate('window.ready');
const LV=[0,.2,.4,.6,.8,1],RD=.6;const FR=[];LV.forEach(h=>FR.push([h,RD]));LV.forEach(h=>FR.push([RD,h]));
let i=0;for(const [r,l] of FR){const d=await p.evaluate(([r,l])=>window.frame(r,l,{px:240}),[r,l]);fs.writeFileSync(`${__dirname}/drum/f${String(i++).padStart(2,'0')}.png`,Buffer.from(d.split(',')[1],'base64'))}
fs.writeFileSync(__dirname+'/drum/frames.json',JSON.stringify(FR));await b.close();
execSync(`ffmpeg -v error -y -i ${__dirname}/drum/f%02d.png -filter_complex "tile=4x3:padding=0:color=0x00000000" -frames:v 1 ${__dirname}/drum/drummer.png`);console.log('frames',FR.length)})();
