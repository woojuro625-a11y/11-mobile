/* Star Runner as a funk dancer, rendered live from the 3D model (three.js + the Star Runner GLB rig).
   Dancer3D.init(canvas,{px}) -> {draw(o), size}
   o = {bob, squash, lean, yaw, roll, head, headTurn, headTilt,
        shR:[x,y,z], elR, shL:[x,y,z], elL, hipR, kneeR, hipL, kneeL}   (degrees, added on top of the rest pose)
   Wears a 70s striped terry headband.
   Joint signs (model): Shoulder.L +Z raises the left arm sideways, Shoulder.R uses -Z; Shoulder X- = arm forward;
   Elbow X- = bend forward; Hip X- = thigh forward; Knee X+ = shin back; Head X+ = nod down, Y = turn. */
(function(root){
async function init(canvas,{px=300}={}){
  const sr=await StarRunner.create(canvas,{style:'toon',outline:0.016,antialias:true,pixelRatio:1,frameW:2.6,frameH:3.0,feet:.9});
  // 70s terry-cloth headband in the show's stripes, worn snug over the brow like an elastic band (follows the helmet's curve, a little tilted, soft and slightly puffed)
  const hc=document.createElement('canvas');hc.width=512;hc.height=128;const g=hc.getContext('2d');g.fillStyle='#F6E7C8';g.fillRect(0,0,512,128);
  [['#E8642B',28,22],['#F2B33D',54,22],['#5A3420',80,22]].forEach(([c,y,h])=>{g.fillStyle=c;g.fillRect(0,y,512,h)});
  for(let i=0;i<9000;i++){const x=Math.random()*512,y=Math.random()*128;g.fillStyle=Math.random()>.5?'rgba(255,255,255,.18)':'rgba(60,30,10,.12)';g.beginPath();g.arc(x,y,1.3,0,7);g.fill()}   // terry loops
  const tex=new THREE.CanvasTexture(hc);tex.encoding=THREE.sRGBEncoding;tex.wrapS=THREE.RepeatWrapping;tex.repeat.set(3,1);
  // fit the band to the real helmet surface: rays from the helmet centre (in the band's tilted frame) find the shell, the band sits just outside it
  sr.draw({},{px,azim:.18,elev:.12});const head=sr.nodes.Head;const dome=sr.nodes.Helmetporcelaindome;const face=sr.nodes.Helmetflushopaqueface;head.updateWorldMatrix(true,true);
  const rc=new THREE.Raycaster();const Rm=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-.08,0,.07));const CEN=new THREE.Vector3(0,.49,0);
  const NR=9,NS=72,pos=[],uv=[],idx=[];
  for(let i=0;i<NR;i++){const yy=.33+i*.022;const puff=.022+.014*Math.sin(i/(NR-1)*Math.PI);
    for(let k=0;k<=NS;k++){const a=k/NS*Math.PI*2;const oL=CEN.clone().add(new THREE.Vector3(0,yy,0).applyMatrix4(Rm));const dL=new THREE.Vector3(Math.sin(a),0,Math.cos(a)).applyMatrix4(Rm).normalize();
      const outL=oL.clone().add(dL.clone().multiplyScalar(2));const oW=head.localToWorld(outL.clone()),dW=head.localToWorld(oL.clone()).sub(oW).normalize();rc.set(oW,dW);   // from outside, inward
      const hits=rc.intersectObjects([dome,face].filter(Boolean),false);let q;
      if(hits.length){q=head.worldToLocal(hits[0].point.clone()).add(dL.clone().multiplyScalar(puff+.004*Math.sin(a*9)))}else q=oL.clone().add(dL.clone().multiplyScalar(.45+puff));
      pos.push(q.x,q.y,q.z);uv.push(k/NS,1-i/(NR-1))}}
  for(let i=0;i<NR-1;i++)for(let k=0;k<NS;k++){const a=i*(NS+1)+k,b=a+NS+1;idx.push(a,b,a+1,b,b+1,a+1)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
  const hb=new THREE.Mesh(geo,new THREE.MeshToonMaterial({map:tex,side:THREE.DoubleSide}));head.add(hb);
  const rimG=(i)=>{const pts=[];for(let k=0;k<NS;k++){const o=(i*(NS+1)+k)*3;pts.push(new THREE.Vector3(pos[o],pos[o+1],pos[o+2]))}return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),NS*2,.012,6,true)};
  [0,NR-1].forEach(i=>head.add(new THREE.Mesh(rimG(i),new THREE.MeshToonMaterial({color:0xE9D9B8}))));                                    // the rolled terry edges
  const OP={px,azim:.18,elev:.12};
  function draw(o){const J={'Head':[o.head||0,o.headTurn||0,o.headTilt||0]};
    J['Shoulder.R']=o.shR||[0,0,-8];J['Shoulder.L']=o.shL||[0,0,8];J['Elbow.R']=[o.elR||0,0,0];J['Elbow.L']=[o.elL||0,0,0];
    ['hipR','kneeR','hipL','kneeL'].forEach(k=>{if(o[k]){const n={hipR:'Hip.R',kneeR:'Knee.R',hipL:'Hip.L',kneeL:'Knee.L'}[k];J[n]=[o[k],0,0]}});
    return sr.draw({joints:J,bob:o.bob||0,squash:o.squash||1,lean:o.lean||0,yaw:o.yaw||0,roll:o.roll||0},OP)}
  const r0=draw({});return{draw,size:[r0.w,r0.h],feet:.9}}
root.Dancer3D={init};
})(window);
