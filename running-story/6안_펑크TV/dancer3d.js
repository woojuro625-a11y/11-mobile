/* Star Runner as a funk dancer, rendered live from the 3D model (three.js + the Star Runner GLB rig).
   Dancer3D.init(canvas,{px}) -> {draw(o), size}
   o = {bob, squash, lean, yaw, roll, head, headTurn, headTilt,
        shR:[x,y,z], elR, shL:[x,y,z], elL, hipR, kneeR, hipL, kneeL}   (degrees, added on top of the rest pose)
   Joint signs (model): Shoulder.L +Z raises the left arm sideways, Shoulder.R uses -Z; Shoulder X- = arm forward;
   Elbow X- = bend forward; Hip X- = thigh forward; Knee X+ = shin back; Head X+ = nod down, Y = turn. */
(function(root){
async function init(canvas,{px=300}={}){
  const sr=await StarRunner.create(canvas,{style:'toon',outline:0.016,antialias:true,pixelRatio:1,frameW:2.6,frameH:3.0,feet:.9});
  const OP={px,azim:.18,elev:.12};
  function draw(o){const J={'Head':[o.head||0,o.headTurn||0,o.headTilt||0]};
    J['Shoulder.R']=o.shR||[0,0,-8];J['Shoulder.L']=o.shL||[0,0,8];J['Elbow.R']=[o.elR||0,0,0];J['Elbow.L']=[o.elL||0,0,0];
    ['hipR','kneeR','hipL','kneeL'].forEach(k=>{if(o[k]){const n={hipR:'Hip.R',kneeR:'Knee.R',hipL:'Hip.L',kneeL:'Knee.L'}[k];J[n]=[o[k],0,0]}});
    return sr.draw({joints:J,bob:o.bob||0,squash:o.squash||1,lean:o.lean||0,yaw:o.yaw||0,roll:o.roll||0},OP)}
  const r0=draw({});return{draw,size:[r0.w,r0.h],feet:.9}}
root.Dancer3D={init};
})(window);
