/* Star Runner riding a motorcycle, rendered live from the 3D model (three.js + the Star Runner GLB rig).
   Bike goggles over the visor, a small night-black motorcycle with a teal tank built from primitives, seated riding pose.
   Rider3D.init(canvas,{px}) -> {draw(o), size, feet}
   o = {bob, lean(+ forward / - wheelie), yaw, roll(lean into a curve), head, headTurn, headTilt, shR, elR, shL, elL, tuck(0..1), spin(wheel angle, rad), azim, elev}
   Rig facts: hips y 0.35, knees 0.24, ankles 0.11; shoulders y 0.76 at x +-0.40; helmet = ellipsoid ~0.62 around head-local (0,0.49,0), visor front z 0.59.
   Joint signs: Shoulder X- = arm forward, Elbow X- = bend, Hip X- = thigh forward, Knee X+ = shin back, Head X+ = nod down. */
(function(root){
async function init(canvas,{px=300}={}){
  const sr=await StarRunner.create(canvas,{style:'toon',outline:0.016,antialias:true,pixelRatio:1,frameW:3.2,frameH:3.0,feet:.86});
  const INK=new THREE.MeshBasicMaterial({color:0x1F2A44,side:THREE.BackSide});
  const T=c=>new THREE.MeshToonMaterial({color:c});
  const ink=(m,s=1.06)=>{const h=new THREE.Mesh(m.geometry,INK);h.scale.setScalar(s);h.renderOrder=-1;m.add(h);return m};
  const M=(geo,mat,[x,y,z]=[0,0,0],[rx,ry,rz]=[0,0,0],s=1.06)=>{const m=ink(new THREE.Mesh(geo,mat),s);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);return m};
  // goggles: strap around the helmet, two round amber lenses over the upper visor
  const head=sr.nodes.Head;const gog=new THREE.Group();head.add(gog);
  const strap=new THREE.Mesh(new THREE.TorusGeometry(.6,.035,8,48),T(0x2A2C33));strap.rotation.x=Math.PI/2;strap.position.y=.66;strap.scale.set(1.03,.98,1);gog.add(strap);
  [-1,1].forEach(s=>{const rim=M(new THREE.CylinderGeometry(.155,.155,.07,28),T(0x3A3D45),[.2*s,.64,.6],[Math.PI/2,0,0],1.08);gog.add(rim);
    const lens=new THREE.Mesh(new THREE.CylinderGeometry(.122,.122,.02,28),new THREE.MeshToonMaterial({color:0xF5A623,emissive:0x5A3000}));lens.rotation.x=Math.PI/2;lens.position.set(.2*s,.64,.64);gog.add(lens);
    const glint=new THREE.Mesh(new THREE.CircleGeometry(.035,12),new THREE.MeshBasicMaterial({color:0xFFF4D6}));glint.position.set(.2*s-.05,.69,.652);gog.add(glint)});
  gog.add(M(new THREE.BoxGeometry(.1,.05,.05),T(0x3A3D45),[0,.64,.6]));
  // the motorcycle (faces +z like the rider), attached to the rider's group so it leans, rolls and bounces with him
  let yawG=sr.nodes.Runner;while(yawG.parent&&yawG.parent.type!=='Scene')yawG=yawG.parent;
  const bike=new THREE.Group();bike.scale.setScalar(1.18);yawG.add(bike);const BLACK=T(0x1B1D22),CHROME=T(0xC9CED6),TEAL=T(0x2EC4A9),TIRE=T(0x111214),RED=new THREE.MeshBasicMaterial({color:0xFF3B30}),LIGHT=new THREE.MeshBasicMaterial({color:0xFFF1C9});
  const wheels=[];[[.66,.2],[-.56,.21]].forEach(([z,r])=>{const w=new THREE.Group();w.position.set(0,r,z);bike.add(w);
    w.add(M(new THREE.TorusGeometry(r*.78,r*.24,12,32),TIRE,[0,0,0],[0,Math.PI/2,0]));w.add(M(new THREE.CylinderGeometry(r*.55,r*.55,.05,20),CHROME,[0,0,0],[0,0,Math.PI/2],1.04));
    for(let i=0;i<5;i++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.06,r*1.0,.03),BLACK);sp.rotation.x=i/5*Math.PI;w.add(sp)}wheels.push(w)});
  bike.add(M(new THREE.BoxGeometry(.16,.12,.7),BLACK,[0,.3,0],[.08,0,0]));                                   // frame
  const tank=M(new THREE.SphereGeometry(.2,20,14),TEAL,[0,.43,.26]);tank.scale.set(.85,.62,1.25);bike.add(tank);                // tank
  bike.add(M(new THREE.BoxGeometry(.24,.06,.46),BLACK,[0,.29,-.2]));                                          // seat
  bike.add(M(new THREE.BoxGeometry(.2,.05,.32),TEAL,[0,.33,-.5],[-.25,0,0]));                                  // rear fender
  bike.add(M(new THREE.BoxGeometry(.12,.05,.03),RED,[0,.34,-.67]));                                            // tail light
  [-1,1].forEach(s=>bike.add(M(new THREE.CylinderGeometry(.022,.022,.62,10),CHROME,[.09*s,.44,.5],[-.45,0,0])));   // fork
  bike.add(M(new THREE.CylinderGeometry(.022,.022,.9,10),CHROME,[0,.72,.36],[0,0,Math.PI/2]));                 // handlebar
  [-1,1].forEach(s=>bike.add(M(new THREE.CylinderGeometry(.034,.034,.12,10),BLACK,[.42*s,.72,.36],[0,0,Math.PI/2])));
  bike.add(M(new THREE.CylinderGeometry(.11,.09,.1,20),BLACK,[0,.6,.56],[Math.PI/2,0,0]));                      // headlight
  const hl=new THREE.Mesh(new THREE.CircleGeometry(.085,20),LIGHT);hl.position.set(0,.6,.615);bike.add(hl);
  bike.add(M(new THREE.CylinderGeometry(.045,.055,.5,12),CHROME,[.17,.2,-.32],[Math.PI/2-.12,0,0]));          // exhaust
  [-1,1].forEach(s=>bike.add(M(new THREE.BoxGeometry(.1,.025,.05),CHROME,[.16*s,.12,.12])));                   // foot pegs
  const OP={px,azim:.25,elev:.1};
  function draw(o){const tk=o.tuck||0;const J={'Head':[(o.head||0)+10*tk,o.headTurn||0,o.headTilt||0]};bike.visible=!o.stand;
    if(!o.stand){J['Hip.R']=[-88,0,-6];J['Hip.L']=[-88,0,6];J['Knee.R']=[92,0,0];J['Knee.L']=[92,0,0]}                       // seated, feet on the pegs (o.stand: standing, no bike)
    J['Shoulder.R']=o.shR||(o.stand?[0,0,-10]:[-78-8*tk,0,-12]);J['Shoulder.L']=o.shL||(o.stand?[0,0,10]:[-78-8*tk,0,12]);J['Elbow.R']=[o.elR??(o.stand?-20:-12),0,0];J['Elbow.L']=[o.elL??(o.stand?-20:-12),0,0];
    wheels.forEach(w=>w.rotation.x=o.spin||0);
    return sr.draw({joints:J,bob:(o.bob||0)+(o.stand?0:.04),squash:1,lean:(o.lean||0)+12*tk,yaw:o.yaw||0,roll:o.roll||0},{px:OP.px,azim:o.azim??OP.azim,elev:o.elev??OP.elev})}
  const r0=draw({});return{draw,size:[r0.w,r0.h],feet:.86}}
root.Rider3D={init};
})(window);
