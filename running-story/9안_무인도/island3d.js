/* Star Runner as a castaway, rendered live from the 3D model (three.js + the Star Runner GLB rig): a woven straw sun hat with a faded red band,
   worn a little back on the head (the star antenna pokes out through the crown). Island3D.init(canvas,{px}) -> {draw(o), size, feet}
   o = {bob, squash, lean, yaw, roll, head, headTurn, headTilt, shR:[x,y,z], elR, shL:[x,y,z], elL, hipR, kneeR, hipL, kneeL, azim}   (degrees)
   Joint signs: Shoulder.L +Z raises the left arm sideways, Shoulder.R uses -Z; Shoulder X- = arm forward; Elbow X- = bend forward;
   Hip X- = thigh forward; Knee X+ = shin back; Head X+ = nod down, Y = turn. Arms resting: shR [0,0,28], shL [0,0,-28]. */
(function(root){
function strawTex(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');g.fillStyle='#D9B56E';g.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=16)for(let x=0;x<512;x+=16){const o=((x+y)/16)%2;g.fillStyle=o?'rgba(120,84,30,.28)':'rgba(255,240,190,.28)';g.fillRect(x+1,y+1,14,14);
    g.strokeStyle='rgba(110,75,25,.35)';g.lineWidth=1;g.beginPath();g.moveTo(x,y+(o?4:12));g.lineTo(x+16,y+(o?12:4));g.stroke()}
  for(let i=0;i<3000;i++){g.fillStyle=Math.random()>.5?'rgba(255,245,210,.15)':'rgba(90,60,20,.12)';g.fillRect(Math.random()*512,Math.random()*512,2,1)}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,1);return t}
async function init(canvas,{px=300}={}){
  const sr=await StarRunner.create(canvas,{style:'toon',outline:0.016,antialias:true,pixelRatio:1,frameW:2.8,frameH:3.0,feet:.9});
  const INK=new THREE.MeshBasicMaterial({color:0x1F2A44,side:THREE.BackSide});const ink=(m,s=1.03)=>{const h=new THREE.Mesh(m.geometry,INK);h.scale.setScalar(s);h.renderOrder=-1;m.add(h);return m};
  const straw=new THREE.MeshToonMaterial({map:strawTex(),color:0xffffff,side:THREE.DoubleSide});const band=new THREE.MeshToonMaterial({color:0xB8432F});
  const hat=new THREE.Group();
  // brim: a wide wavy disc, slightly floppy (dips at the front and back)
  const bg=new THREE.RingGeometry(.5,1.05,72,3);const p=bg.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const r=Math.hypot(v.x,v.y),a=Math.atan2(v.y,v.x);const u=(r-.5)/.55;const z=-(.05*u*u)-.04*u*Math.cos(2*a)+.012*Math.sin(a*9)*u;p.setXYZ(i,v.x,v.y,z)}
  bg.computeVertexNormals();const brim=ink(new THREE.Mesh(bg,straw),1.02);brim.rotation.x=-Math.PI/2;hat.add(brim);
  // crown: a rounded cylinder with a soft dent on top
  const pts=[];for(let i=0;i<=12;i++){const u=i/12;pts.push(new THREE.Vector2(.5-.06*u-.12*Math.pow(u,6),.4*u))}pts.push(new THREE.Vector2(0,.43));
  const crown=ink(new THREE.Mesh(new THREE.LatheGeometry(pts,48),straw),1.03);hat.add(crown);
  const rib=new THREE.Mesh(new THREE.CylinderGeometry(.506,.51,.09,48,1,true),band);rib.position.y=.07;hat.add(rib);
  hat.scale.set(.86,.86,.86);hat.position.set(0,.98,-.06);hat.rotation.set(-.16,0,.06);sr.nodes.Head.add(hat);
  const OP={px,azim:.18,elev:.12};
  function draw(o){const J={'Head':[o.head||0,o.headTurn||0,o.headTilt||0]};
    J['Shoulder.R']=o.shR||[0,0,28];J['Shoulder.L']=o.shL||[0,0,-28];J['Elbow.R']=[o.elR??-14,0,0];J['Elbow.L']=[o.elL??-14,0,0];
    ['hipR','kneeR','hipL','kneeL'].forEach(k=>{if(o[k]){const n={hipR:'Hip.R',kneeR:'Knee.R',hipL:'Hip.L',kneeL:'Knee.L'}[k];J[n]=[o[k],0,0]}});
    return sr.draw({joints:J,bob:o.bob||0,squash:o.squash||1,lean:o.lean||0,yaw:o.yaw||0,roll:o.roll||0},{px:OP.px,azim:o.azim??OP.azim,elev:OP.elev})}
  const r0=draw({});return{draw,size:[r0.w,r0.h],feet:.9}}
root.Island3D={init};
})(window);
