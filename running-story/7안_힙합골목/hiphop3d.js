/* Star Runner as a hip-hop head, rendered live from the 3D model (three.js + the Star Runner GLB rig):
   a red bandana (do-rag) tied over the helmet with the knot and tails at the back, and a gold chain with a medallion.
   HipHop3D.init(canvas,{px}) -> {draw(o), size, feet}
   o = {bob, squash, lean, yaw, roll, head, headTurn, headTilt, shR:[x,y,z], elR, shL:[x,y,z], elL, hipR, kneeR, hipL, kneeL, tails}   (degrees)
   Joint signs: Shoulder.L +Z raises the left arm sideways, Shoulder.R uses -Z; Shoulder X- = arm forward; Elbow X- = bend forward;
   Hip X- = thigh forward; Knee X+ = shin back; Head X+ = nod down, Y = turn. The helmet is big: hands above the shoulders are hidden. */
(function(root){
function bandanaTex(){const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
  const rnd=i=>{const x=Math.sin(i*91.7+13.3)*43758.5;return x-Math.floor(x)};
  g.fillStyle='#9E1A24';g.fillRect(0,0,1024,512);
  for(let i=0;i<4000;i++){g.fillStyle=rnd(i)>.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.06)';g.fillRect(rnd(i+7)*1024,rnd(i+9)*512,2,2)}   // cotton weave
  const paisley=(x,y,r,a)=>{g.save();g.translate(x,y);g.rotate(a);g.fillStyle='rgba(246,240,230,.92)';g.beginPath();g.moveTo(0,-r);g.bezierCurveTo(r*1.1,-r,r*1.1,r*.8,0,r);g.bezierCurveTo(-r*.6,r*.7,-r*.9,0,-r*1.6,-r*1.1);g.bezierCurveTo(-r*.8,-r*.7,-r*.5,-r,0,-r);g.fill();
    g.fillStyle='#9E1A24';g.beginPath();g.ellipse(r*.15,0,r*.55,r*.62,0,0,7);g.fill();g.fillStyle='#14100E';g.beginPath();g.ellipse(r*.15,0,r*.3,r*.36,0,0,7);g.fill();
    g.fillStyle='rgba(246,240,230,.9)';for(let k=0;k<7;k++){const q=k/7*6.28;g.beginPath();g.arc(r*.15+Math.cos(q)*r*.46,Math.sin(q)*r*.5,r*.07,0,7);g.fill()}g.restore()};
  for(let i=0;i<34;i++)paisley(rnd(i)*1024,30+rnd(i+50)*370,16+rnd(i+90)*10,rnd(i+130)*6.3);
  g.fillStyle='rgba(246,240,230,.85)';for(let i=0;i<260;i++){g.beginPath();g.arc(rnd(i+300)*1024,20+rnd(i+400)*380,2.6,0,7);g.fill()}
  g.fillStyle='#14100E';g.fillRect(0,432,1024,80);g.fillStyle='rgba(246,240,230,.92)';g.fillRect(0,440,1024,6);g.fillRect(0,498,1024,6);   // the printed border at the hem
  for(let x=10;x<1024;x+=34){g.beginPath();g.arc(x,472,7,0,7);g.fill();g.fillStyle='#9E1A24';g.beginPath();g.arc(x,472,3,0,7);g.fill();g.fillStyle='rgba(246,240,230,.92)'}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=THREE.RepeatWrapping;t.repeat.set(2,1);t.anisotropy=4;return t}
// bend a sphere slice into cloth: creases that gather toward the knot at the back, a wavy hem, a little looseness
function clothify(geo,thMax,{fold=.024,wave=.05,loose=.03}={}){const p=geo.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const r=v.length();const th=Math.acos(THREE.MathUtils.clamp(v.y/r,-1,1));let ph=Math.atan2(v.z,-v.x);
    const u=th/thMax,back=Math.max(0,-Math.sin(ph));                                          // back = -z (the face looks to +z)
    const th2=th+Math.pow(u,4)*(wave*Math.sin(ph*5+.7)+.06*back);                                // hem waves, dips at the back
    const rr=1+loose*u*u+fold*back*Math.pow(u,1.5)*Math.sin(ph*16+th*9)+.007*Math.sin(ph*7+th*13);   // creases gathering at the back
    v.set(-Math.cos(ph)*Math.sin(th2),Math.cos(th2),Math.sin(ph)*Math.sin(th2)).multiplyScalar(rr);p.setXYZ(i,v.x,v.y,v.z)}
  geo.computeVertexNormals();return geo}
async function init(canvas,{px=300}={}){
  const sr=await StarRunner.create(canvas,{style:'toon',outline:0.016,antialias:true,pixelRatio:1,frameW:2.6,frameH:3.0,feet:.9});
  const INK=new THREE.MeshBasicMaterial({color:0x1F2A44,side:THREE.BackSide});
  const toon=(o)=>new THREE.MeshToonMaterial(o);
  const withInk=(mesh,s=1.04)=>{const h=new THREE.Mesh(mesh.geometry,INK);h.scale.setScalar(s);h.renderOrder=-1;mesh.add(h);return mesh};
  // bandana tied do-rag style: sits loosely over the dome, front hem above the visor and a little off-level, creases gathering to a knot at the back,
  // the folded point hanging down the back, two knot tails that swing (helmet = ellipsoid ~0.62 around (0,0.49,0) in head space; visor tops out at y 0.84)
  const tex=bandanaTex();const red=toon({map:tex,color:0xffffff,side:THREE.DoubleSide});const redPlain=toon({color:0x8A1620});
  const cap=new THREE.Group();cap.position.set(0,.49,0);cap.rotation.set(-.4,.05,.07);
  const TH=Math.PI*.4;const capM=withInk(new THREE.Mesh(clothify(new THREE.SphereGeometry(1,96,40,0,Math.PI*2,0,TH),TH),red),1.025);capM.scale.set(.632,.618,.602);cap.add(capM);
  const hemPts=[];for(let i=0;i<=96;i++){const ph=i/96*Math.PI*2,back=Math.max(0,-Math.sin(ph));const th=TH+.05*Math.sin(ph*5+.7)+.06*back;const r=1.03;
    hemPts.push(new THREE.Vector3(-Math.cos(ph)*Math.sin(th)*r*.632,Math.cos(th)*r*.618,Math.sin(ph)*Math.sin(th)*r*.602))}
  cap.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hemPts,true),160,.013,8,true),toon({color:0x4A0A10})));   // the folded hem
  // the point of the folded triangle hanging at the back
  const flapG=new THREE.SphereGeometry(1,24,14,Math.PI*1.5-.75,1.5,TH-.04,.52);const fp=flapG.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<fp.count;i++){v.fromBufferAttribute(fp,i);const r=v.length(),th=Math.acos(v.y/r),ph=Math.atan2(v.z,-v.x);const u=(th-(TH-.04))/.52;
    const ph2=-Math.PI/2+(ph+Math.PI/2)*(1-u*.95);const th2=th+.06*Math.sin(u*3);const rr=1.05+.05*u;v.set(-Math.cos(ph2)*Math.sin(th2),Math.cos(th2),Math.sin(ph2)*Math.sin(th2)).multiplyScalar(rr);fp.setXYZ(i,v.x,v.y,v.z)}
  flapG.computeVertexNormals();const flap=withInk(new THREE.Mesh(flapG,red),1.02);flap.scale.set(.632,.618,.602);cap.add(flap);
  // the knot with two tails
  const kth=TH+.09;const knot=new THREE.Group();knot.position.set(0,Math.cos(kth)*.618*1.05,-Math.sin(kth)*.602*1.07);cap.add(knot);
  [[-.06,.02],[.065,-.01]].forEach(([x,y],k)=>{const g=new THREE.SphereGeometry(.075,16,12);const kp=g.attributes.position;for(let i=0;i<kp.count;i++){v.fromBufferAttribute(kp,i);v.multiplyScalar(1+.12*Math.sin(v.x*60+v.y*40+k));kp.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();
    const m=withInk(new THREE.Mesh(g,redPlain),1.1);m.position.set(x,y,-.02);m.scale.set(1.15,.8,.75);knot.add(m)});
  const tails=[];[-1,1].forEach(s=>{const piv=new THREE.Group();piv.position.set(.05*s,-.02,-.05);knot.add(piv);
    const g=new THREE.PlaneGeometry(.13,.34,1,10);const tp=g.attributes.position;for(let i=0;i<tp.count;i++){v.fromBufferAttribute(tp,i);const u=(.17-v.y)/.34;v.x*=1-.45*u;v.z=-.06*u*u+.02*Math.sin(u*5)*s;v.y-=.17;tp.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();
    const tl=withInk(new THREE.Mesh(g,red),1.04);piv.add(tl);piv.rotation.set(.3,0,.32*s);tails.push(piv)});
  sr.nodes.Head.add(cap);
  // gold chain with a round medallion, hanging over the chest (body space: neck ring y 0.76~0.85, chest console y 0.53~0.69 at z 0.33)
  const gold=toon({color:0xE8B530});const pts=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;const fr=Math.max(0,Math.cos(a));
    pts.push(new THREE.Vector3(Math.sin(a)*(.43-.12*fr*fr),.82-.36*Math.pow(fr,2.2),Math.cos(a)*.37+.03*fr))}
  const curve=new THREE.CatmullRomCurve3(pts,true);sr.nodes.Body.add(new THREE.Mesh(new THREE.TubeGeometry(curve,120,.024,8,true),gold));
  const chainInk=new THREE.Mesh(new THREE.TubeGeometry(curve,120,.034,8,true),INK);chainInk.renderOrder=-1;sr.nodes.Body.add(chainInk);
  const med=withInk(new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.03,24),gold),1.12);med.rotation.x=Math.PI/2;med.position.set(0,.4,.41);sr.nodes.Body.add(med);
  const OP={px,azim:.18,elev:.12};
  function draw(o){const J={'Head':[o.head||0,o.headTurn||0,o.headTilt||0]};
    J['Shoulder.R']=o.shR||[0,0,-8];J['Shoulder.L']=o.shL||[0,0,8];J['Elbow.R']=[o.elR||0,0,0];J['Elbow.L']=[o.elL||0,0,0];
    ['hipR','kneeR','hipL','kneeL'].forEach(k=>{if(o[k]){const n={hipR:'Hip.R',kneeR:'Knee.R',hipL:'Hip.L',kneeL:'Knee.L'}[k];J[n]=[o[k],0,0]}});
    const sw=o.tails||0;tails.forEach((p,i)=>{p.rotation.x=.3+.3*Math.abs(sw);p.rotation.z=(i?1:-1)*.32+.22*sw});                // tails flick with the bounce
    return sr.draw({joints:J,bob:o.bob||0,squash:o.squash||1,lean:o.lean||0,yaw:o.yaw||0,roll:o.roll||0},OP)}
  const r0=draw({});return{draw,size:[r0.w,r0.h],feet:.9}}
root.HipHop3D={init};
})(window);
