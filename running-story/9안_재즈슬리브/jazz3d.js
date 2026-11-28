/* Star Runner as a jazz cat, rendered live from the 3D model (three.js + the Star Runner GLB rig): a black wool beret worn tilted to one side
   (the star antenna pokes through it). Jazz3D.init(canvas,{px}) -> {draw(o), size, feet}
   o = {bob, squash, lean, yaw, roll, head, headTurn, headTilt, shR:[x,y,z], elR, shL:[x,y,z], elL, hipR, kneeR, hipL, kneeL, azim}   (degrees)
   Joint signs: Shoulder.L +Z raises the left arm sideways, Shoulder.R uses -Z; Shoulder X- = arm forward; Elbow X- = bend forward;
   Hip X- = thigh forward; Knee X+ = shin back; Head X+ = nod down, Y = turn. Arms resting: shR [0,0,28], shL [0,0,-28]. */
(function(root){
async function init(canvas,{px=300}={}){
  const sr=await StarRunner.create(canvas,{style:'toon',outline:0.016,antialias:true,pixelRatio:1,frameW:2.6,frameH:3.0,feet:.9});
  const INK=new THREE.MeshBasicMaterial({color:0x1F2A44,side:THREE.BackSide});
  // wool texture: soft felt speckle
  const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');g.fillStyle='#1B1B1F';g.fillRect(0,0,256,256);
  for(let i=0;i<6000;i++){g.fillStyle=Math.random()>.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.25)';g.fillRect(Math.random()*256,Math.random()*256,1.5,1.5)}
  const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;
  const mat=new THREE.MeshToonMaterial({map:tex,color:0xffffff});
  // the beret: a soft flattened dome, wider than the head at the crown, its edge puffed and slightly wavy, tilted to the right; sits on the helmet top (helmet ellipsoid ~ (0,.49,0) r .615/.594/.576 in head space)
  const geo=new THREE.SphereGeometry(1,64,24,0,Math.PI*2,0,Math.PI*.62);const p=geo.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const th=Math.acos(THREE.MathUtils.clamp(v.y,-1,1)),ph=Math.atan2(v.z,v.x);const u=th/(Math.PI*.62);
    const r=1+.06*Math.sin(ph*5)*u*u+.08*Math.pow(u,6);v.multiplyScalar(r);v.y=v.y*.42+.0;p.setXYZ(i,v.x,v.y,v.z)}
  geo.computeVertexNormals();
  const beret=new THREE.Mesh(geo,mat);beret.scale.set(.57,.58,.56);
  const hull=new THREE.Mesh(geo,INK);hull.scale.setScalar(1.035);hull.renderOrder=-1;beret.add(hull);
  const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.09,10),mat);stalk.position.set(0,.46,0);beret.add(stalk);
  const grp=new THREE.Group();grp.add(beret);grp.position.set(.08,.93,-.03);grp.rotation.set(-.1,0,-.3);sr.nodes.Head.add(grp);
  const OP={px,azim:.18,elev:.12};
  function draw(o){const J={'Head':[o.head||0,o.headTurn||0,o.headTilt||0]};
    J['Shoulder.R']=o.shR||[0,0,28];J['Shoulder.L']=o.shL||[0,0,-28];J['Elbow.R']=[o.elR??-14,0,0];J['Elbow.L']=[o.elL??-14,0,0];
    ['hipR','kneeR','hipL','kneeL'].forEach(k=>{if(o[k]){const n={hipR:'Hip.R',kneeR:'Knee.R',hipL:'Hip.L',kneeL:'Knee.L'}[k];J[n]=[o[k],0,0]}});
    return sr.draw({joints:J,bob:o.bob||0,squash:o.squash||1,lean:o.lean||0,yaw:o.yaw||0,roll:o.roll||0},{px:OP.px,azim:o.azim??OP.azim,elev:OP.elev})}
  const r0=draw({});return{draw,size:[r0.w,r0.h],feet:.9}}
root.Jazz3D={init};
})(window);
