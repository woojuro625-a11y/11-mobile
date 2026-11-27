/* =====================================================================
   Star Runner (스타 러너) — the channel's official 3D mascot (GLB from the
   2026-11-26 revision: StarRunner.glb, character.json, HANDOFF_KO.md).
   Needs: three147.min.js + GLTFLoader.js (UMD) + starrunner_glb.js (GLB as base64).

   Model facts (glTF): +Y up, front +Z, soles at Y=0, height ≈ 2.1 units.
   +X is the CHARACTER'S LEFT (screen-right when it faces the camera).
   Rigid-part rig: Runner > Body > Head / Backpack / Shoulder.L > Elbow.L > Wrist.L /
   Hip.L > Knee.L > Ankle.L (and .R). Clips: Run 0.8s, Wave 1.6s, Point 1.8s,
   Cheer 1.2s, Jump 1.2s (all loopable).

   const sr = await StarRunner.create(canvas, {style:'toon'|'flat'})
   sr.draw({clip:'Run', t, clip2, t2, mix, yaw, bob, squash, lean, joints:{'Shoulder.L':[x,y,z]...}}, {px, azim, elev})
   joints = extra local Euler rotations in degrees (XYZ) multiplied on top of the clip pose.
   ===================================================================== */
(function (root) {
  const D = Math.PI / 180;
  let MODEL = null;

  function b64ToBuf(b64) {
    const bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  function loadModel() {
    if (MODEL) return Promise.resolve(MODEL);
    return new Promise((res, rej) => {
      new THREE.GLTFLoader().parse(b64ToBuf(root.STAR_RUNNER_GLB), '', g => { MODEL = g; res(g); }, rej);
    });
  }

  function ramp() {
    const tex = new THREE.DataTexture(new Uint8Array([155, 212, 255]), 3, 1, THREE.RedFormat);
    tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true; return tex;
  }
  function outlineMat(thick, color) {
    return new THREE.ShaderMaterial({
      uniforms: { thick: { value: thick }, col: { value: new THREE.Color(color) } },
      vertexShader: 'uniform float thick; void main(){ vec3 p = position + normal * thick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }',
      fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col,1.0); }',
      side: THREE.BackSide,
    });
  }

  async function create(canvas, cfg = {}) {
    const g = await loadModel();
    const style = cfg.style || 'toon';
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: cfg.antialias !== false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    renderer.setPixelRatio(cfg.pixelRatio || window.devicePixelRatio || 1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, style === 'flat' ? 0.75 : 0.5));
    const key = new THREE.DirectionalLight(0xffffff, style === 'flat' ? 0.45 : 0.75); key.position.set(-3, 5, 6); scene.add(key);
    const rig = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(g.scene) : g.scene.clone(true);
    scene.add(rig);
    const grad = ramp();
    const INK = cfg.ink ?? 0x1F2A44;
    const meshes = []; rig.traverse(o => { if (o.isMesh) meshes.push(o); });
    meshes.forEach(o => {
      const src = o.material, c = src.color ? src.color.clone() : new THREE.Color(1, 1, 1);
      o.material = style === 'flat' ? new THREE.MeshLambertMaterial({ color: c }) : new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
      if (cfg.outline !== false && !o.userData.noOutline) {
        const hull = new THREE.Mesh(o.geometry, outlineMat(cfg.outline ?? 0.016, INK));
        hull.renderOrder = -1; o.add(hull);
      }
    });
    const KEY = n => String(n).replace(/[^A-Za-z0-9]/g, '');      // 'Shoulder.L' -> 'ShoulderL' (GLTFLoader sanitises names)
    const nodes = {}; rig.traverse(o => { if (o.name) nodes[KEY(o.name)] = o; });
    const rest = {}; for (const k in nodes) rest[k] = { p: nodes[k].position.clone(), q: nodes[k].quaternion.clone(), s: nodes[k].scale.clone() };
    const clips = {}; for (const c of g.animations) clips[c.name] = c;
    const runner = nodes.Runner || rig;
    const yawG = new THREE.Group(); scene.add(yawG); yawG.add(rig);

    // sample a clip at time t -> {node: {p,q,s}}
    function sample(name, t) {
      const clip = clips[name]; const out = {};
      if (!clip) return out;
      const tt = ((t % clip.duration) + clip.duration) % clip.duration;
      for (const tr of clip.tracks) {
        const [nodeName, prop] = tr.name.split('.').length > 2 ? [tr.name.slice(0, tr.name.lastIndexOf('.')), tr.name.slice(tr.name.lastIndexOf('.') + 1)] : tr.name.split('.');
        const v = tr.createInterpolant().evaluate(tt);
        const o = (out[KEY(nodeName)] = out[KEY(nodeName)] || {});
        if (prop === 'quaternion') o.q = new THREE.Quaternion(v[0], v[1], v[2], v[3]);
        else if (prop === 'position') o.p = new THREE.Vector3(v[0], v[1], v[2]);
        else if (prop === 'scale') o.s = new THREE.Vector3(v[0], v[1], v[2]);
      }
      return out;
    }
    function applyPose(st) {
      for (const k in nodes) { nodes[k].position.copy(rest[k].p); nodes[k].quaternion.copy(rest[k].q); nodes[k].scale.copy(rest[k].s); }
      const A = st.clip ? sample(st.clip, st.t || 0) : {};
      const B = st.clip2 ? sample(st.clip2, st.t2 || 0) : null;
      const k = st.mix ?? 0, w = st.weight ?? 1;
      for (const name of new Set([...Object.keys(A), ...(B ? Object.keys(B) : [])])) {
        const n = nodes[KEY(name)]; if (!n) continue; const r = rest[KEY(name)];
        const a = A[name] || {}, b = (B && B[name]) || {};
        const pa = a.p || r.p, pb = b.p || r.p, qa = a.q || r.q, qb = b.q || r.q;
        const p = B ? pa.clone().lerp(pb, k) : pa.clone(), q = B ? qa.clone().slerp(qb, k) : qa.clone();
        n.position.copy(r.p.clone().lerp(p, w)); n.quaternion.copy(r.q.clone().slerp(q, w));
      }
      if (st.joints) for (const name in st.joints) {
        const n = nodes[KEY(name)]; if (!n) continue; const e = st.joints[name];
        n.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((e[0] || 0) * D, (e[1] || 0) * D, (e[2] || 0) * D, 'XYZ')));
      }
      if (st.offsets) for (const name in st.offsets) { const n = nodes[KEY(name)]; if (n) n.position.add(new THREE.Vector3(...st.offsets[name])); }
      yawG.rotation.set((st.lean || 0) * D, (st.yaw || 0) * D, (st.roll || 0) * D);
      yawG.position.y = st.bob || 0;
      const sq = st.squash ?? 1; yawG.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
    }

    const FOV = cfg.fov || 18, cam = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);
    const FW = cfg.frameW || 3.4, FH = cfg.frameH || 3.6, FEET = cfg.feet || 0.86;   // frame in world units
    let lastW = 0, lastH = 0;
    function draw(st, opts = {}) {
      const px = opts.px || 80;
      const w = Math.max(8, Math.round(FW * px)), h = Math.max(8, Math.round(FH * px));
      if (w !== lastW || h !== lastH) { renderer.setSize(w, h, false); if (canvas.style) { canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; } lastW = w; lastH = h; cam.aspect = w / h; }
      applyPose(st);
      const elev = opts.elev ?? 0.08, azim = opts.azim || 0, ty = opts.targetY ?? FH * (FEET - 0.5);
      const dist = FH / (2 * Math.tan(FOV / 2 * D));
      cam.position.set(Math.sin(azim) * dist * Math.cos(elev), ty + Math.sin(elev) * dist, Math.cos(azim) * dist * Math.cos(elev));
      cam.lookAt(0, ty, 0); cam.updateProjectionMatrix();
      renderer.render(scene, cam);
      return { w, h, feetX: w / 2, feetY: h * FEET };
    }
    function worldOf(name) { const v = new THREE.Vector3(); nodes[KEY(name)].getWorldPosition(v); return v; }
    return { draw, applyPose, sample, nodes, clips, worldOf, renderer, durations: Object.fromEntries(Object.entries(clips).map(([k, c]) => [k, c.duration])) };
  }
  /* ---- motion adapter (same call style as the older Char3D.motions) ----
     Clips come from the GLB (Run is contralateral: left foot forward = right hand forward, verified).
     Joint convention (local XYZ degrees): +X of the model = character's LEFT.
       Shoulder.L +Z raises the left arm sideways (Shoulder.R uses -Z) · Shoulder X- = arm forward
       Elbow X- = bend forward · Hip X- = thigh forward · Knee X+ = shin back · Head X+ = nod down, Y = turn */
  const TAU = Math.PI * 2;
  const motions = {
    idle(t, yaw = 0) { const b = Math.sin(TAU * t / 2.4);
      return { yaw, bob: 0.008 * (1 + b), squash: 1 - 0.01 * b,
        joints: { 'Head': [0, 0, 2 * Math.sin(TAU * t / 2.4 + 0.6)], 'Shoulder.L': [0, 0, 6 + 2 * b], 'Shoulder.R': [0, 0, -(6 + 2 * b)] } }; },
    run(t, yaw = 75) { return { clip: 'Run', t, yaw }; },
    cheer(t, yaw = 0) { return { clip: 'Cheer', t, yaw }; },
    wave(t, yaw = 0) { return { clip: 'Wave', t, yaw }; },
    point(t, yaw = 0) { return { clip: 'Point', t, yaw }; },
    air(p, yaw = 75) { return { clip: 'Jump', t: 0.35 + 0.45 * Math.min(1, Math.max(0, p)), yaw }; },
  };
  function mix(a, b, k) {
    const L = (x, y) => (x ?? 0) + ((y ?? 0) - (x ?? 0)) * k;
    const o = { yaw: L(a.yaw, b.yaw), bob: L(a.bob, b.bob), lean: L(a.lean, b.lean), roll: L(a.roll, b.roll),
      squash: (a.squash ?? 1) + ((b.squash ?? 1) - (a.squash ?? 1)) * k, joints: {} };
    if (a.clip && b.clip) Object.assign(o, { clip: a.clip, t: a.t, clip2: b.clip, t2: b.t, mix: k });
    else if (a.clip) Object.assign(o, { clip: a.clip, t: a.t, weight: 1 - k });
    else if (b.clip) Object.assign(o, { clip: b.clip, t: b.t, weight: k });
    for (const key of new Set([...Object.keys(a.joints || {}), ...Object.keys(b.joints || {})])) {
      const x = (a.joints || {})[key] || [0, 0, 0], y = (b.joints || {})[key] || [0, 0, 0];
      o.joints[key] = x.map((v, i) => v + ((y[i] ?? 0) - v) * k);
    }
    return o;
  }
  root.StarRunner = { create, load: loadModel, motions, mix };
})(typeof window !== 'undefined' ? window : globalThis);
