/* Star Runner on a marching snare, rendered live (three.js + the Star Runner GLB rig).
   Drummer3D.init(canvas,{px}) -> {draw(o), hitPx}
   o = {hR, hL, head, bob, squash, lean, yaw}
     hR / hL : stick height per hand  0 = tip on the head, .6 = ready, 1 = raised beside the helmet, 1.6 = both arms overhead
     head    : nod in degrees (+ = down), bob: body lift in model units (feet off the floor when > 0), squash: 1 = normal
   The drum and its stand stay put; only the character moves. */
(function(root){
const D=Math.PI/180;let sr,scene,stickR,stickL,drum;const P={dz:.58,dy:.56};
function ramp(){const t=new THREE.DataTexture(new Uint8Array([150,210,255]),3,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t}
let G;const INK=0x1F2A44;
function outl(th){return new THREE.ShaderMaterial({uniforms:{thick:{value:th},col:{value:new THREE.Color(INK)}},vertexShader:'uniform float thick;void main(){vec3 p=position+normal*thick;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'uniform vec3 col;void main(){gl_FragColor=vec4(col,1.0);}',side:THREE.BackSide})}
function mesh(geo,col,th,par){const m=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:new THREE.Color(col),gradientMap:G}));if(th){const h=new THREE.Mesh(geo,outl(th));h.renderOrder=-1;m.add(h)}par.add(m);return m}
function cyl(a,b,r,col,par){const d=new THREE.Vector3().subVectors(b,a);const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),8),col,.006,par);m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());return m}
function buildDrum(){const g=new THREE.Group();scene.add(g);g.position.set(0,P.dy,P.dz);const R=.42,Hs=.17;
  const shell=mesh(new THREE.CylinderGeometry(R,R,Hs,48,1,true),0x8E0B1F,.012,g);shell.material.side=THREE.DoubleSide;
  const head=mesh(new THREE.CylinderGeometry(R*.985,R*.985,.004,48),0xF3F1EA,0,g);head.position.y=Hs/2+.004;
  const bot=mesh(new THREE.CylinderGeometry(R*.985,R*.985,.004,48),0xDDD8CC,0,g);bot.position.y=-Hs/2-.004;
  [Hs/2+.012,-Hs/2-.012].forEach(y=>{const hoop=mesh(new THREE.TorusGeometry(R+.006,.016,10,64),0xD9DCE2,.008,g);hoop.rotation.x=Math.PI/2;hoop.position.y=y});
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.31;const lug=mesh(new THREE.BoxGeometry(.03,.07,.035),0xD9DCE2,.006,g);lug.position.set(Math.cos(a)*(R+.018),0,Math.sin(a)*(R+.018));lug.rotation.y=-a;
    const rod=mesh(new THREE.CylinderGeometry(.006,.006,Hs+.03,6),0xBFC3CA,0,g);rod.position.set(Math.cos(a)*(R+.012),0,Math.sin(a)*(R+.012))}
  const DY=P.dy;cyl(new THREE.Vector3(0,-Hs/2,0),new THREE.Vector3(0,-DY+.28,0),.016,0x3A3D44,g);
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2+Math.PI/2;cyl(new THREE.Vector3(0,-DY+.3,0),new THREE.Vector3(Math.cos(a)*.34,-DY,Math.sin(a)*.34),.011,0x3A3D44,g)}
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2+Math.PI/6;cyl(new THREE.Vector3(0,-Hs/2-.04,0),new THREE.Vector3(Math.cos(a)*R*.85,-Hs/2-.02,Math.sin(a)*R*.85),.009,0x3A3D44,g)}
  return g}
function buildStick(){const s=new THREE.Group();scene.add(s);const L=.62;
  const body=mesh(new THREE.CylinderGeometry(.015,.02,L,10),0xD9B27A,.007,s);body.position.y=-L/2;
  const tip=mesh(new THREE.SphereGeometry(.024,10,8),0xF1E3C4,.006,s);tip.position.y=-L-.005;tip.scale.set(1,1.4,1);return s}
const lerp=(a,b,k)=>a+(b-a)*k;
function arm(h){   // joint angles for a stick height
  if(h<=1)return{sh:lerp(-40,-62,h),el:lerp(-25,-60,h),sp:lerp(12,30,h)};
  const k=Math.min(1,(h-1)/.6);return{sh:lerp(-62,-160,k),el:lerp(-60,-15,k),sp:lerp(30,16,k)}}
async function init(canvas,{px=300}={}){G=ramp();
  sr=await StarRunner.create(canvas,{style:'toon',outline:0.016,antialias:true,pixelRatio:1,frameW:2.5,frameH:3.1,feet:.88});
  let o=sr.nodes.Runner;while(o.parent)o=o.parent;scene=o;drum=buildDrum();stickR=buildStick();stickL=buildStick();
  const OP={px,azim:.32,elev:.42};const headY=P.dy+.17/2+.01;
  function draw(o){const a=arm(o.hR),b=arm(o.hL);
    const J={'Shoulder.R':[a.sh,0,-a.sp],'Elbow.R':[a.el,0,0],'Shoulder.L':[b.sh,0,b.sp],'Elbow.L':[b.el,0,0],'Head':[o.head||0,(o.headTurn||0),o.headTilt||0]};
    if(o.hipR)J['Hip.R']=[o.hipR,0,0];if(o.kneeR)J['Knee.R']=[o.kneeR,0,0];if(o.hipL)J['Hip.L']=[o.hipL,0,0];if(o.kneeL)J['Knee.L']=[o.kneeL,0,0];
    const ST={joints:J,bob:o.bob||0,squash:o.squash||1,lean:o.lean||0,yaw:o.yaw||0,roll:o.roll||0};
    sr.applyPose(ST);
    // stick aim: on the head (h=0) -> raised (1) -> overhead (1.6); cross 0..1 brings the overhead tips together (stick click); tw = windmill twirl angle
    [[stickR,'WristR',o.hR,-.09,o.twR],[stickL,'WristL',o.hL,.09,o.twL]].forEach(([st,w,h,x,tw])=>{const wp=new THREE.Vector3();sr.nodes[w].getWorldPosition(wp);st.position.copy(wp);
      if(tw!=null){st.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(Math.sin(tw)*Math.sign(x),Math.cos(tw),.3).normalize());return}
      const cr=o.cross||0;const hit=new THREE.Vector3(x,headY,P.dz+.04);const up=new THREE.Vector3(x*5.5,headY+.62,P.dz+.12);const over=new THREE.Vector3(x*4*(1-2.2*cr),headY+2.6,P.dz-.05);
      const tgt=h<=1?hit.clone().lerp(up,h):up.clone().lerp(over,Math.min(1,(h-1)/.6));st.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),tgt.sub(wp).normalize())});
    const r=sr.draw(ST,OP);return r}
  // where the sticks land, in canvas pixels (camera is fixed)
  const r0=draw({hR:.6,hL:.6});const v=new THREE.Vector3(0,headY,P.dz+.04).project(sr.cam);
  const hitPx=[(v.x+1)/2*r0.w,(1-v.y)/2*r0.h];
  return{draw,canvas,hitPx,size:[r0.w,r0.h]}}
root.Drummer3D={init};
})(window);
