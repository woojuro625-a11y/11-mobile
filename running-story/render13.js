const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');
const [,,mode,arg,out]=process.argv;const B=__dirname+'/v13/story.html';
(async()=>{const br=await chromium.launch();const pg=await br.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
pg.on('console',m=>console.log('PAGE',m.text()));pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('file://'+B+'?t=0');await pg.waitForFunction('window.READY===true');
const shot=async t=>{await pg.evaluate(t=>window.render(t),t);return pg.screenshot({type:'png'})};
if(mode==='stills'){for(const t of arg.split(',')){fs.writeFileSync(`${out}/f_${(+t).toFixed(2)}.png`,await shot(+t))}}
else{const fps=+arg;const dur=await pg.evaluate('window.DUR');const N=Math.round(dur*fps);
 const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
 for(let i=0;i<N;i++){const b=await shot(i/fps);if(!ff.stdin.write(b))await new Promise(r=>ff.stdin.once('drain',r));if(i%60==0)console.log('frame',i,'/',N)}
 ff.stdin.end();await new Promise(r=>ff.on('close',r))}
await br.close()})();
