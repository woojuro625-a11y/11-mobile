/* Star Runner as a hip-hop head, rendered live from the 3D model (three.js + the Star Runner GLB rig):
   a red bandana (do-rag) tied over the helmet with the knot and tails at the back, and a gold chain with a medallion.
   HipHop3D.init(canvas,{px}) -> {draw(o), size, feet}
   o = {bob, squash, lean, yaw, roll, head, headTurn, headTilt, shR:[x,y,z], elR, shL:[x,y,z], elL, hipR, kneeR, hipL, kneeL, tails}   (degrees)
   Joint signs: Shoulder.L +Z raises the left arm sideways, Shoulder.R uses -Z; Shoulder X- = arm forward; Elbow X- = bend forward;
   Hip X- = thigh forward; Knee X+ = shin back; Head X+ = nod down, Y = turn. The helmet is big: hands above the shoulders are hidden. */
(function(root){
function bandanaTex(){const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d');
  g.fillStyle='#A81C26';g.fillRect(0,0,512,256);g.strokeStyle='rgba(255,255,255,.9)';g.fillStyle='rgba(255,255,255,.9)';
  const rnd=i=>{const x=Math.sin(i*91.7+13.3)*43758.5;return x-Math.floor(x)};
  for(let i=0;i<46;i++){const x=rnd(i)*512,y=rnd(i+50)*256,r=7+rnd(i+90)*7,a=rnd(i+130)*6.3;          // paisley-like drops and dots
    g.save();g.translate(x,y);g.rotate(a);g.lineWidth=2.5;g.beginPath();g.ellipse(0,0,r,r*.62,0,0,7);g.stroke();g.beginPath();g.arc(r*.15,0,r*.25,0,7);g.fill();
    g.beginPath();g.moveTo(r,0);g.quadraticCurveTo(r*1.7,-r*.4,r*1.4,-r*1.1);g.stroke();g.restore()}
  for(let i=0;i<120;i++){g.beginPath();g.arc(rnd(i+300)*512,rnd(i+400)*256,2.2,0,7);g.fill()}
  g.strokeStyle='rgba(20,10,10,.35)';g.lineWidth=6;g.strokeRect(0,0,512,256);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
async function init(canvas,{px=300}={}){
  const sr=await StarRunner.create(canvas,{style:'toon',outline:0.016,antialias:true,pixelRatio:1,frameW:2.6,frameH:3.0,feet:.9});
  const INK=new THREE.MeshBasicMaterial({color:0x1F2A44,side:THREE.BackSide});
  const toon=(o)=>new THREE.MeshToonMaterial(o);
  const withInk=(mesh,s=1.04)=>{const h=new THREE.Mesh(mesh.geometry,INK);h.scale.setScalar(s);h.renderOrder=-1;mesh.add(h);return mesh};
  // bandana: a cap over the dome (helmet = ellipsoid about 0.62 around (0,0.49,0) in head space; visor tops out at y 0.84)
  const tex=bandanaTex();const red=toon({map:tex,color:0xffffff});const redPlain=toon({color:0x8E1620});
  const cap=new THREE.Group();cap.position.set(0,.49,.0);cap.rotation.x=-.42;                     // tipped back: front edge above the visor, lower at the back
  const capM=withInk(new THREE.Mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI*.36),red),1.03);capM.scale.set(.655,.64,.63);cap.add(capM);
  const knot=new THREE.Group();knot.position.set(0,.64*Math.cos(Math.PI*.36)-.02,-.63*Math.sin(Math.PI*.36)-.03);cap.add(knot);
  [[-.07,0],[.07,0]].forEach(([x])=>{const k=withInk(new THREE.Mesh(new THREE.SphereGeometry(.085,14,10),redPlain),1.12);k.position.set(x,0,-.02);k.scale.set(1,.8,.7);knot.add(k)});
  const tails=[];[-1,1].forEach(s=>{const piv=new THREE.Group();piv.position.set(.04*s,-.02,-.05);knot.add(piv);
    const tl=withInk(new THREE.Mesh(new THREE.BoxGeometry(.13,.36,.025),red),1.06);tl.position.y=-.18;piv.add(tl);piv.rotation.z=.28*s;piv.rotation.x=.25;tails.push(piv)});
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
    const sw=o.tails||0;tails.forEach((p,i)=>{p.rotation.x=.25+.25*Math.abs(sw);p.rotation.z=(i?1:-1)*.28+.18*sw});                // tails flick with the bounce
    return sr.draw({joints:J,bob:o.bob||0,squash:o.squash||1,lean:o.lean||0,yaw:o.yaw||0,roll:o.roll||0},OP)}
  const r0=draw({});return{draw,size:[r0.w,r0.h],feet:.9}}
root.HipHop3D={init};
})(window);
