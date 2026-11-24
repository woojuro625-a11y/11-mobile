/* 파이프피터의 바이블 — 15초 모션 그래픽 쇼릴
 * 프레임 단위로 결정론적인(deterministic) 렌더: draw(t) 하나로 모든 장면을 그린다.
 * 120 BPM 그리드(0.5초 = 1박)에 맞춰 컷과 액센트를 배치.
 */
const W = 1920, H = 1080, FPS = 60, DUR = 15;
const mainCanvas = document.getElementById('c');
const mainCtx = mainCanvas.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const bufCtx = buf.getContext('2d');
let ctx = mainCtx;

const C = {
  ink: '#0A0E13', ink2: '#121922', ink3: '#1B2430',
  steel: '#2A3745', steel2: '#4A5D71', steel3: '#9DB0C4',
  cyan: '#7FD1FF', orange: '#FF5A1F', orange2: '#FF9A4D', spark: '#FFD9A0',
  paper: '#EFE9DC', navy: '#0D2742',
};
const KR = 'Pretendard', MONO = '"JetBrains Mono"';

/* ---------- 수학 / 이징 ---------- */
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const P = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const rad = d => d * Math.PI / 180;
const E = {
  lin: u => u,
  inC: u => u * u * u,
  outC: u => 1 - Math.pow(1 - u, 3),
  ioC: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  outQ: u => 1 - Math.pow(1 - u, 5),
  ioQ: u => u < .5 ? 16 * Math.pow(u, 5) : 1 - Math.pow(-2 * u + 2, 5) / 2,
  outX: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u),
  inX: u => u <= 0 ? 0 : Math.pow(2, 10 * u - 10),
  ioX: u => u <= 0 ? 0 : u >= 1 ? 1 : u < .5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2,
  outB: (u, s = 1.9) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
};
function spring(dt, f = 2.6, z = 7) { if (dt <= 0) return 0; return 1 - Math.exp(-z * dt) * Math.cos(2 * Math.PI * f * dt); }
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ---------- 텍스트 ---------- */
function font(size, weight = 800, fam = KR) { ctx.font = `${weight} ${size}px ${fam}`; }
function txt(s, x, y, o = {}) {
  ctx.save();
  font(o.size || 40, o.weight || 800, o.fam || KR);
  ctx.fillStyle = o.color || C.paper; ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic'; ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.fillText(s, x, y); ctx.restore();
}
function measure(s, size, weight = 800, fam = KR, ls = 0) {
  ctx.save(); font(size, weight, fam); ctx.letterSpacing = ls + 'px';
  const w = ctx.measureText(s).width; ctx.restore(); return w;
}
/* 마스크 안에서 한 줄을 밀어 올리는 리빌. off: 1=아래 숨김, 0=제자리, -1=위로 퇴장 */
function maskText(s, x, y, o, off) {
  const size = o.size;
  ctx.save(); font(size, o.weight || 900, o.fam || KR); ctx.letterSpacing = (o.ls || 0) + 'px';
  const w = ctx.measureText(s).width;
  let x0 = x; if (o.align === 'center') x0 = x - w / 2; else if (o.align === 'right') x0 = x - w;
  ctx.beginPath(); ctx.rect(x0 - 30, y - size * 1.02, w + 60, size * 1.34); ctx.clip();
  ctx.fillStyle = o.color || C.paper; ctx.textAlign = 'left';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.fillText(s, x0, y + off * size * 1.2); ctx.restore(); return w;
}
/* 글자별 스태거: fn(i, u) -> {dx,dy,s,a,rot} */
function charText(s, x, y, o, fn) {
  ctx.save(); font(o.size, o.weight || 900, o.fam || KR); ctx.letterSpacing = '0px';
  const chars = [...s], ls = o.ls || 0;
  const ws = chars.map(ch => ctx.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + ls * (chars.length - 1);
  let cx = x; if (o.align === 'center') cx = x - total / 2; else if (o.align === 'right') cx = x - total;
  if (o.clip) { ctx.beginPath(); ctx.rect(cx - 40, y - o.size * 1.02, total + 80, o.size * 1.34); ctx.clip(); }
  const pos = [];
  chars.forEach((ch, i) => {
    const r = fn(i, chars.length) || {};
    const a = r.a == null ? 1 : r.a;
    pos.push(cx);
    if (a > 0.001) {
      ctx.save();
      ctx.translate(cx + ws[i] / 2 + (r.dx || 0), y + (r.dy || 0));
      if (r.rot) ctx.rotate(r.rot);
      const sc = r.s == null ? 1 : r.s; ctx.scale(sc, sc);
      ctx.globalAlpha *= a; ctx.fillStyle = (o.colorFn && o.colorFn(i)) || o.color || C.paper;
      ctx.textAlign = 'center'; ctx.fillText(ch, 0, 0); ctx.restore();
    }
    cx += ws[i] + ls;
  });
  ctx.restore(); return { total, pos, ws };
}

/* ---------- 도형 ---------- */
function line(x1, y1, x2, y2, u = 1, o = {}) {
  if (u <= 0) return;
  ctx.save(); ctx.strokeStyle = o.color || C.paper; ctx.lineWidth = o.w || 2;
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.dash) { ctx.setLineDash(o.dash); ctx.lineDashOffset = o.dashOff || 0; }
  ctx.lineCap = o.cap || 'butt';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, u), lerp(y1, y2, u)); ctx.stroke(); ctx.restore();
}
function circle(x, y, r, o = {}) {
  if (r <= 0) return;
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.beginPath(); ctx.arc(x, y, r, o.a0 || 0, o.a1 == null ? Math.PI * 2 : o.a1, o.ccw);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.w || 2; if (o.dash) { ctx.setLineDash(o.dash); ctx.lineDashOffset = o.dashOff || 0; } ctx.lineCap = o.cap || 'butt'; ctx.stroke(); }
  ctx.restore();
}
function arrow(x, y, ang, size, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-size, -size * .38); ctx.lineTo(-size, size * .38); ctx.closePath(); ctx.fill(); ctx.restore();
}
function polyStroke(sp, w, col, alpha = 1, dash = null, dashOff = 0) {
  if (sp.length < 2) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOff; }
  ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]);
  ctx.stroke(); ctx.restore();
}
function grid(alpha, step = 60, ox = 0, oy = 0, col = C.cyan) {
  if (alpha <= 0) return;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha *= alpha;
  ctx.beginPath();
  for (let x = ((ox % step) + step) % step; x < W; x += step) { ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, H); }
  for (let y = ((oy % step) + step) % step; y < H; y += step) { ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(W, Math.round(y) + .5); }
  ctx.stroke();
  ctx.globalAlpha *= 1.8; ctx.beginPath();
  const S = step * 5;
  for (let x = ((ox % S) + S) % S; x < W; x += S) { ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, H); }
  for (let y = ((oy % S) + S) % S; y < H; y += S) { ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(W, Math.round(y) + .5); }
  ctx.stroke(); ctx.restore();
}
function hatchClip(angle, spacing, col, w, alpha, cx, cy, R) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.translate(cx, cy); ctx.rotate(angle); ctx.beginPath();
  for (let x = -R; x <= R; x += spacing) { ctx.moveTo(x, -R); ctx.lineTo(x, R); }
  ctx.stroke(); ctx.restore();
}
function ringPath(cx, cy, R, r) { ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); }

/* ---------- 3D ---------- */
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  lerp: (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)],
};
function makeProj(cam) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  return p => {
    const x = p[0] - cam.tg[0], y = p[1] - cam.tg[1], z = p[2] - cam.tg[2];
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    const y1 = y * cp - z1 * sp;
    return [cam.cx + x1 * cam.zoom, cam.cy - y1 * cam.zoom, z1];
  };
}
function partial3(pts, d) {
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = v3.len(v3.sub(pts[i], pts[i - 1]));
    if (acc + l >= d) { out.push(v3.lerp(pts[i - 1], pts[i], (d - acc) / l)); return out; }
    out.push(pts[i]); acc += l;
  }
  return out;
}
function disc3(center, axis, r, proj, n = 40) {
  const a = v3.norm(axis); const ref = Math.abs(a[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
  const u = v3.norm(v3.cross(a, ref)), v = v3.cross(a, u); const pts = [];
  for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2; pts.push(proj(v3.add(center, v3.add(v3.mul(u, r * Math.cos(t)), v3.mul(v, r * Math.sin(t)))))); }
  return pts;
}
function fillPoly(sp, fill, stroke, w = 2, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]);
  for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke(); }
  ctx.restore();
}

/* ---------- 배관 경로 정의 ---------- */
const ROUTE = [[-820, 0, 0], [-300, 0, 0], [-100, 200, 0], [380, 200, 0], [380, 200, -320], [380, -160, -320], [760, -160, -320]];
const CUM = [0]; for (let i = 1; i < ROUTE.length; i++) CUM.push(CUM[i - 1] + v3.len(v3.sub(ROUTE[i], ROUTE[i - 1])));
const L = CUM[CUM.length - 1];
const PIPE_W = 34;
const drawnAt = t => L * E.ioC(P(t, 3.12, 5.05));
function timeAtLen(s) { let a = 3.12, b = 5.05; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (drawnAt(m) < s) a = m; else b = m; } return b; }
const FITTINGS = [
  { kind: 'flange', p: [-620, 0, 0], axis: [1, 0, 0], s: 200 },
  { kind: 'valve', p: [140, 200, 0], axis: [1, 0, 0], s: CUM[2] + 240 },
  { kind: 'flange', p: [380, 200, -160], axis: [0, 0, 1], s: CUM[3] + 160 },
  { kind: 'cap', p: ROUTE[6], axis: [1, 0, 0], s: L - 1 },
];
FITTINGS.forEach(f => f.t = timeAtLen(f.s));
const CALLOUTS = [
  { p: [-200, 100, 0], s: (CUM[1] + CUM[2]) / 2, label: '45° 오프셋', n: '01', d: [-70, -150] },
  { p: [140, 200, 0], s: CUM[2] + 240, label: '게이트 밸브', n: '02', d: [40, -190] },
  { p: [380, 200, 0], s: CUM[3], label: '90° 엘보', n: '03', d: [-240, 100] },
  { p: [380, 200, -160], s: CUM[3] + 160, label: '플랜지 이음', n: '04', d: [70, -120] },
  { p: [760, -160, -320], s: L - 1, label: '용접 캡', n: '05', d: [60, -90] },
];
CALLOUTS.forEach(c => c.t = timeAtLen(c.s));

function camAt(t) {
  const u = E.ioC(P(t, 3.0, 5.4));
  let c = { yaw: lerp(rad(64), rad(38), u), pitch: lerp(rad(16), rad(30), u), zoom: lerp(0.8, 0.94, u), cx: lerp(990, 960, u), cy: lerp(505, 480, u), tg: [-20, 40, -150] };
  const f = E.ioQ(P(t, 5.3, 6.15));
  if (f > 0) c = { yaw: lerp(c.yaw, 0, f), pitch: lerp(c.pitch, 0, f), zoom: lerp(c.zoom, 1.5, f), cx: lerp(c.cx, 1240, f), cy: lerp(c.cy, 560, f), tg: v3.lerp(c.tg, [-200, 100, 0], f) };
  return c;
}

/* ---------- 카메라 흔들림 & 플래시 ---------- */
const IMPACTS = [[0.5, 6], [1.5, 10], [3.0, 8], [8.5, 14], [9.0, 6], [9.5, 6], [10.0, 6], [10.5, 6], [11.0, 18], [14.75, 8]];
function shake(t) {
  let x = 0, y = 0;
  for (const [ti, amp] of IMPACTS) {
    const d = t - ti; if (d < 0 || d > .4) continue;
    const k = amp * Math.exp(-d * 14);
    x += k * Math.sin(d * 95 + ti * 3); y += k * Math.cos(d * 77 + ti * 7);
  }
  return [x, y];
}

/* =================== 장면 1: 단면 (0 – 1.5) =================== */
function scene1(t) {
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  const cx = 960, cy = 540;
  const zo = lerp(1, 3.6, E.inX(P(t, 1.32, 1.5)));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(zo, zo); ctx.rotate(-E.inC(P(t, 1.3, 1.5)) * .25); ctx.translate(-cx, -cy);

  grid(.05 * P(t, .3, .9), 60, cx, cy);

  // 중심선(자 눈금이 달린 수평선 / 수직선)
  const hl = 990 * E.outX(P(t, .3, .78));
  const dashOn = t > .8;
  line(cx, cy, cx + hl, cy, 1, { color: C.orange, w: 2, dash: dashOn ? [44, 10, 6, 10] : null, dashOff: -t * 120 });
  line(cx, cy, cx - hl, cy, 1, { color: C.orange, w: 2, dash: dashOn ? [44, 10, 6, 10] : null, dashOff: -t * 120 });
  const vl = 560 * E.outX(P(t, .4, .85));
  line(cx, cy, cx, cy - vl, 1, { color: C.cyan, w: 1.5, alpha: .7, dash: dashOn ? [44, 10, 6, 10] : null, dashOff: t * 120 });
  line(cx, cy, cx, cy + vl, 1, { color: C.cyan, w: 1.5, alpha: .7, dash: dashOn ? [44, 10, 6, 10] : null, dashOff: t * 120 });
  // 눈금
  ctx.save(); ctx.strokeStyle = C.paper; ctx.lineWidth = 1.5;
  for (let k = 1; k <= 24; k++) {
    const d = k * 40; if (d > hl) break;
    const a = clamp((hl - d) / 120) * (1 - P(t, .9, 1.2) * .6);
    const big = k % 5 === 0; ctx.globalAlpha = a * (big ? .9 : .45);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * d, cy + 10); ctx.lineTo(cx + s * d, cy + 10 + (big ? 18 : 8)); ctx.stroke(); }
    if (big) for (const s of [-1, 1]) txt(String(k * 10), cx + s * d, cy + 56, { size: 18, fam: MONO, weight: 500, align: 'center', alpha: a * .8 });
  }
  ctx.restore();

  // 파이프 단면 링
  const ru = P(t, .62, .98);
  const R = 230 * E.outB(ru), r = R * .855;
  if (R > 0) {
    for (let k = 0; k < 3; k++) { // 리플
      const u = P(t, .62 + k * .1, 1.32 + k * .1);
      if (u > 0 && u < 1) circle(cx, cy, 230 + E.outC(u) * 560, { stroke: k === 1 ? C.orange : C.cyan, w: 1.5, alpha: (1 - u) * .55 });
    }
    ctx.save(); ringPath(cx, cy, R, r);
    const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R); g.addColorStop(0, C.steel2); g.addColorStop(1, C.ink3);
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    hatchClip(rad(45) + t * .4, 13, C.orange, 2, .85, cx, cy, R + 4);
    ctx.restore();
    circle(cx, cy, R, { stroke: C.paper, w: 2.5 }); circle(cx, cy, r, { stroke: C.paper, w: 2 });
    circle(cx, cy, r * .97, { stroke: C.cyan, w: 1, alpha: .35, dash: [4, 8], dashOff: t * 40 });
    circle(cx, cy, 6 * E.outB(P(t, .05, .3)) + R * 0, { fill: C.orange });
  } else circle(cx, cy, 7 * E.outB(P(t, .05, .3)), { fill: C.orange });

  // 치수: 지름
  const du = E.outX(P(t, .92, 1.15));
  if (du > 0) {
    const a = rad(-32), ex = Math.cos(a) * R, ey = Math.sin(a) * R;
    line(cx - ex, cy - ey, cx + ex, cy + ey, du, { color: C.paper, w: 1.5 });
    if (du > .95) { arrow(cx + ex, cy + ey, a, 16, C.paper); arrow(cx - ex, cy - ey, a + Math.PI, 16, C.paper); }
    const lx = cx + ex + 40, ly = cy + ey - 40;
    line(cx + ex, cy + ey, lx, ly, E.outX(P(t, 1.0, 1.12)), { color: C.paper, w: 1.5 });
    line(lx, ly, lx + 190, ly, E.outX(P(t, 1.05, 1.2)), { color: C.paper, w: 1.5 });
    const val = (114.3 * E.outC(P(t, 1.02, 1.3))).toFixed(1);
    maskText('Ø ' + val, lx + 4, ly - 12, { size: 34, fam: MONO, weight: 700, color: C.paper }, 1 - E.outX(P(t, 1.02, 1.18)));
    // 두께
    const tx = cx - (R + r) / 2 * Math.cos(rad(25)), ty = cy + (R + r) / 2 * Math.sin(rad(25));
    line(tx, ty, tx - 150, ty + 80, E.outX(P(t, 1.06, 1.2)), { color: C.cyan, w: 1.5 });
    circle(tx, ty, 5 * E.outB(P(t, 1.04, 1.14)), { fill: C.cyan });
    maskText('두께 6.02', tx - 330, ty + 92, { size: 30, weight: 700, color: C.cyan }, 1 - E.outX(P(t, 1.1, 1.26)));
    maskText('SCH 40 · 4인치', cx + 24, cy + R + 64, { size: 26, fam: MONO, weight: 600, align: 'left', color: C.paper, alpha: .7 }, 1 - E.outX(P(t, 1.12, 1.3)));
  }
  ctx.restore();
}

/* =================== 장면 2: 키네틱 타이포 (1.5 – 3.0) =================== */
function scene2(t) {
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  const cx = 960, cy = 540;
  grid(.05, 60, cx - (t - 1.5) * 40, cy);
  // 배경 링 (장면1에서 이어짐)
  const zs = lerp(3.6, 2.6, E.outC(P(t, 1.5, 3)));
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.25 - (t - 1.5) * .15); ctx.scale(zs, zs);
  circle(0, 0, 230, { stroke: C.paper, w: 1 / zs * 2, alpha: .14 });
  circle(0, 0, 197, { stroke: C.orange, w: 1 / zs * 2, alpha: .2, dash: [30, 12], dashOff: t * 30 });
  ctx.restore();

  const base = 600, size = 168;
  const squash = P(t, 2.86, 3.0);
  // 스텝 인디케이터
  const step = t < 2.0 ? 0 : t < 2.5 ? 1 : 2;
  const st = [1.5, 2.0, 2.5][step];
  if (squash < .5) {
    maskText('— 0' + (step + 1) + ' / 03', cx, 390, { size: 26, fam: MONO, weight: 600, align: 'center', color: C.orange }, 1 - E.outX(P(t, st, st + .15)));
  }

  // 1줄: 모든 배관은
  if (t < 2.2) {
    charText('모든 배관은', cx, base, { size, align: 'center', clip: true }, (i, n) => {
      const ui = E.outX(P(t, 1.5 + i * .035, 1.5 + i * .035 + .3));
      const uo = E.inC(P(t, 2.0 + i * .02, 2.0 + i * .02 + .14));
      return { dy: (1 - ui) * size * 1.15 - uo * size * 1.2 };
    });
  }
  // 2줄: 하나의 기준에서 (기준 = 오렌지 박스)
  if (t >= 2.0 && t < 2.7) {
    const s = '하나의 기준에서';
    const tw = measure(s, size, 900), x0 = cx - tw / 2;
    const pre = measure('하나의 ', size, 900), kw = measure('기준', size, 900);
    const bu = E.outX(P(t, 2.15, 2.35)), bo = E.inC(P(t, 2.5, 2.62));
    if (bu > 0) {
      ctx.save(); ctx.fillStyle = C.orange;
      const bx = x0 + pre - 16, bw = (kw + 32);
      ctx.fillRect(bx + bw * bo, base - size * .86, bw * (bu - bo), size * 1.08); ctx.restore();
    }
    const fn = (i) => {
      const ui = E.outX(P(t, 2.0 + i * .03, 2.0 + i * .03 + .28));
      const uo = E.inC(P(t, 2.5 + i * .02, 2.5 + i * .02 + .14));
      return { dy: (1 - ui) * size * 1.15 - uo * size * 1.2 };
    };
    charText(s, cx, base, { size, align: 'center', clip: true, colorFn: i => (i === 4 || i === 5) && bu > .5 && bo < .5 ? C.ink : C.paper }, fn);
  }
  // 3줄: 시작된다.
  if (t >= 2.5) {
    const s = '시작된다.';
    const zu = E.outX(P(t, 2.5, 2.78));
    const sc = lerp(3.4, 1, zu);
    const sx = lerp(1, 1.9, E.inX(squash)), sy = lerp(1, .012, E.inX(squash));
    ctx.save(); ctx.translate(cx, base - size * .35); ctx.scale(sc * sx, sc * sy); ctx.translate(-cx, -(base - size * .35));
    ctx.globalAlpha = P(t, 2.5, 2.56);
    const col = squash > .4 ? C.orange : C.paper;
    txt(s, cx, base, { size, weight: 900, align: 'center', color: col });
    ctx.restore();
    const tw = measure(s, size, 900);
    const uu = E.outX(P(t, 2.62, 2.85)) * (1 - squash);
    if (uu > 0) line(cx - tw / 2, base + 36, cx - tw / 2 + tw * uu, base + 36, 1, { color: C.orange, w: 8 });
  }
}

/* =================== 장면 3/4: 아이소메트릭 → 정면 공식 (3.0 – 8.5) =================== */
function drawPipeRoute(t, proj, cam, dim) {
  const drawn = drawnAt(t);
  const w = PIPE_W * cam.zoom;
  // 바닥 그리드 (3D)
  const ga = .5 * Math.sin(cam.pitch) / Math.sin(rad(30)) * P(t, 3.0, 3.5) * (1 - dim);
  if (ga > .01) {
    ctx.save(); ctx.fillStyle = C.cyan;
    for (let x = -900; x <= 900; x += 100) for (let z = -700; z <= 500; z += 100) {
      const s = proj([x, -260, z]); ctx.globalAlpha = ga * .55 * clamp(1 - Math.hypot(x, z + 100) / 1100);
      ctx.fillRect(s[0] - 4, s[1] - .75, 8, 1.5); ctx.fillRect(s[0] - .75, s[1] - 4, 1.5, 8);
    }
    ctx.restore();
  }
  // 고스트 블루프린트 경로
  const gl = L * E.outC(P(t, 3.0, 4.1));
  const ghost = partial3(ROUTE, gl).map(proj);
  polyStroke(ghost, 1.5, C.cyan, .6 * (1 - dim * .6), [10, 8], -t * 60);
  ROUTE.forEach((p, i) => { if (CUM[i] <= gl) { const s = proj(p); circle(s[0], s[1], 5, { stroke: C.cyan, w: 1.5, alpha: .7 * (1 - dim) }); } });

  // 치수선 (첫 직관부)
  const du = E.outX(P(t, 3.9, 4.3)) * (1 - dim);
  if (du > 0) {
    const a = proj([-820, -70, 0]), b = proj([-300, -70, 0]);
    line(a[0], a[1], b[0], b[1], du, { color: C.paper, w: 1.2, alpha: .7 });
    for (const q of [a, b]) line(q[0], q[1] - 10, q[0], q[1] + 10, 1, { color: C.paper, w: 1.2, alpha: .7 * du });
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
    txt(String(Math.round(520 * E.outC(P(t, 3.9, 4.4)))), 0, -12, { size: 22, fam: MONO, weight: 600, align: 'center', alpha: .85 * du });
    ctx.restore();
  }

  if (drawn <= 0) return;
  const part = partial3(ROUTE, drawn);
  const sp = part.map(proj);
  const alpha = 1 - dim * .72;
  ctx.save(); ctx.globalAlpha *= alpha;
  polyStroke(sp, w + 5, C.ink, 1);
  polyStroke(sp, w, C.steel, 1);
  polyStroke(sp, w * .6, C.steel2, 1);
  // 세그먼트별 하이라이트 (빛: 좌상단)
  for (let i = 1; i < sp.length; i++) {
    const a = sp[i - 1], b = sp[i]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1) continue;
    let nx = -dy / l, ny = dx / l; if (nx * -.45 + ny * -1 < 0) { nx = -nx; ny = -ny; }
    line(a[0] + nx * w * .26, a[1] + ny * w * .26, b[0] + nx * w * .26, b[1] + ny * w * .26, 1, { color: C.steel3, w: w * .12, alpha: .8 });
  }
  // 유체 흐름 (중심 대시)
  const fa = P(t, 4.0, 4.4);
  if (fa > 0) polyStroke(sp, Math.max(2, w * .16), C.orange, fa * .95, [w * .7, w * 1.1], -(t - 4) * 260);
  ctx.restore();

  // 피팅
  for (const f of FITTINGS) {
    const u = P(t, f.t, f.t + .3); if (u <= 0) continue;
    const k = E.outB(u);
    ctx.save(); ctx.globalAlpha *= alpha;
    if (f.kind === 'flange') {
      const a = v3.norm(f.axis);
      for (const off of [-7, 7]) {
        const d = disc3(v3.add(f.p, v3.mul(a, off)), a, 42 * k, proj);
        fillPoly(d, off < 0 ? C.steel2 : C.steel, C.steel3, 1.5);
      }
      const front = v3.add(f.p, v3.mul(a, 7));
      disc3(front, a, 31 * k, proj, 6).forEach(q => circle(q[0], q[1], 2.8 * cam.zoom, { fill: C.ink }));
    } else if (f.kind === 'valve') {
      const c = proj(f.p);
      const g = ctx.createRadialGradient(c[0] - 10, c[1] - 12, 2, c[0], c[1], 44 * cam.zoom * k);
      g.addColorStop(0, C.steel3); g.addColorStop(1, C.steel);
      circle(c[0], c[1], 40 * cam.zoom * k, { fill: g, stroke: C.ink, w: 2 });
      const top = proj(v3.add(f.p, [0, 105 * k, 0]));
      line(c[0], c[1], top[0], top[1], 1, { color: C.steel3, w: 7 * cam.zoom });
      const wheel = disc3(v3.add(f.p, [0, 105 * k, 0]), [0, 1, 0], 52 * k, proj);
      fillPoly(wheel, null, C.orange, 5 * cam.zoom);
      for (let s = 0; s < 4; s++) { const q = wheel[s * 10]; line(top[0], top[1], q[0], q[1], 1, { color: C.orange, w: 2.5 * cam.zoom }); }
    } else if (f.kind === 'cap') {
      const d = disc3(f.p, f.axis, 19 * k, proj);
      fillPoly(d, C.steel3, C.ink, 2);
    }
    ctx.restore();
  }

  // 드로우 헤드 + 용접 불꽃
  if (t > 3.12 && t < 5.15) {
    const head = proj(part[part.length - 1]);
    const ha = 1 - P(t, 5.0, 5.15);
    ctx.save(); ctx.globalAlpha = ha;
    ctx.shadowColor = C.orange; ctx.shadowBlur = 30;
    circle(head[0], head[1], w * .55, { fill: C.orange2 });
    circle(head[0], head[1], w * .3, { fill: '#FFF3DD' });
    ctx.restore();
    const now = Math.floor(t * 120);
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < 46; k++) {
      const id = now - k; const tb = id / 120; const age = t - tb;
      if (tb < 3.15 || tb > 5.0) continue;
      const life = .25 + rnd(id) * .35; if (age > life) continue;
      const hb = proj(partial3(ROUTE, drawnAt(tb)).pop());
      const ang = rnd(id * 3.1) * Math.PI * 2, sp0 = 250 + rnd(id * 7.7) * 650;
      const vx = Math.cos(ang) * sp0, vy = Math.sin(ang) * sp0 - 300;
      const x = hb[0] + vx * age, y = hb[1] + vy * age + 1400 * age * age;
      const vyNow = vy + 2800 * age;
      const tl = .022;
      ctx.globalAlpha = (1 - age / life) * ha;
      ctx.strokeStyle = rnd(id * 1.3) > .5 ? C.spark : C.orange2; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * tl, y - vyNow * tl); ctx.stroke();
    }
    ctx.restore();
  }

  // 콜아웃
  const ca = 1 - P(t, 5.25, 5.45);
  if (ca > 0) for (const c of CALLOUTS) {
    const lt = t - c.t; if (lt <= 0) continue;
    const s = proj(c.p);
    ctx.save(); ctx.globalAlpha *= ca;
    circle(s[0], s[1], 9 * E.outB(P(lt, 0, .2)), { stroke: C.orange, w: 2.5 });
    circle(s[0], s[1], 3.5 * E.outB(P(lt, 0, .2)), { fill: C.orange });
    const x1 = s[0] + c.d[0], y1 = s[1] + c.d[1];
    line(s[0], s[1], x1, y1, E.outX(P(lt, .05, .2)), { color: C.paper, w: 1.5 });
    const lw = measure(c.label, 28, 700) + 70;
    line(x1, y1, x1 + lw, y1, E.outX(P(lt, .12, .32)), { color: C.paper, w: 1.5 });
    maskText(c.n, x1 + 4, y1 - 12, { size: 18, fam: MONO, weight: 700, color: C.orange }, 1 - E.outX(P(lt, .16, .34)));
    maskText(c.label, x1 + 40, y1 - 12, { size: 28, weight: 700, color: C.paper }, 1 - E.outX(P(lt, .18, .38)));
    ctx.restore();
  }
}

function scene34(t) {
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  const cam = camAt(t);
  const proj = makeProj(cam);
  const dim = E.outC(P(t, 6.0, 6.4));
  grid(.045 * (1 - P(t, 3, 3.6)) + .05 * P(t, 5.6, 6.2), 60, 1240 + 50 * 1.5, 560 - 100 * 1.5 + 75 * 0);
  // 장면 2에서 넘어온 납작해진 선
  const lu = P(t, 3.0, 3.22);
  if (lu < 1) { const hw = lerp(650, 0, E.inC(lu)); line(960 - hw, 540, 960 + hw, 540, 1, { color: C.orange, w: 3 * (1 - lu) + 1 }); }

  drawPipeRoute(t, proj, cam, dim);

  if (t < 6.0) return;
  // ---- 장면 4: 오프셋 공식 ----
  const A = proj(ROUTE[1]), B = proj(ROUTE[2]), Cc = [B[0], A[1]];
  const w = PIPE_W * cam.zoom;
  // 오프셋 구간 강조
  const hp = E.outC(P(t, 6.0, 6.3));
  ctx.save();
  polyStroke([proj([-340, 0, 0]), A, B, proj([-60, 200, 0])], w + 12, C.orange, hp);
  polyStroke([proj([-340, 0, 0]), A, B, proj([-60, 200, 0])], w, C.steel, hp);
  polyStroke([proj([-340, 0, 0]), A, B, proj([-60, 200, 0])], w * .6, C.steel2, hp);
  ctx.restore();
  // 삼각형 다리
  const ru = E.outX(P(t, 6.08, 6.4)), su = E.outX(P(t, 6.2, 6.5));
  line(A[0], A[1] + 0, Cc[0], Cc[1], ru, { color: C.cyan, w: 2.5, dash: [14, 8], dashOff: -t * 40 });
  line(Cc[0], Cc[1], B[0], B[1], su, { color: C.cyan, w: 2.5, dash: [14, 8], dashOff: -t * 40 });
  const ra = P(t, 6.45, 6.6);
  if (ra > 0) { ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.strokeRect(Cc[0] - 26, Cc[1] - 26, 26, 26); ctx.restore(); }
  // 각도 호
  const au = E.outC(P(t, 6.6, 7.0));
  if (au > 0) {
    circle(A[0], A[1], 110, { stroke: C.orange, w: 3, a0: 0, a1: -rad(45) * au, ccw: true });
    const am = -rad(22.5);
    maskText(Math.round(45 * au) + '°', A[0] + Math.cos(am) * 150, A[1] + Math.sin(am) * 150 + 14, { size: 34, fam: MONO, weight: 800, color: C.orange }, 1 - E.outX(P(t, 6.6, 6.8)));
  }
  // 라벨 + 카운터
  const c1 = E.outC(P(t, 7.0, 7.6)), c2 = E.outC(P(t, 7.1, 7.8));
  maskText('런', (A[0] + Cc[0]) / 2 - 20, A[1] + 70, { size: 40, weight: 900, color: C.cyan }, 1 - E.outX(P(t, 6.3, 6.5)));
  maskText((300 * c1).toFixed(0) + ' mm', (A[0] + Cc[0]) / 2 + 30, A[1] + 68, { size: 26, fam: MONO, weight: 600, color: C.paper, alpha: .85 }, 1 - E.outX(P(t, 6.95, 7.1)));
  maskText('셋', Cc[0] + 34, (Cc[1] + B[1]) / 2 + 14, { size: 40, weight: 900, color: C.cyan }, 1 - E.outX(P(t, 6.4, 6.6)));
  maskText((300 * c1).toFixed(0) + ' mm', Cc[0] + 34, (Cc[1] + B[1]) / 2 + 54, { size: 26, fam: MONO, weight: 600, color: C.paper, alpha: .85 }, 1 - E.outX(P(t, 6.95, 7.1)));
  ctx.save();
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  ctx.translate(mx - 100, my - 100); ctx.rotate(-rad(45));
  maskText('트래블', 0, 0, { size: 40, weight: 900, color: C.orange, align: 'center' }, 1 - E.outX(P(t, 6.5, 6.7)));
  maskText((424.2 * c2).toFixed(1) + ' mm', 0, 40, { size: 26, fam: MONO, weight: 600, color: C.paper, align: 'center', alpha: .85 }, 1 - E.outX(P(t, 7.05, 7.2)));
  ctx.restore();

  // 공식 타이포
  const ex = 150;
  const tagU = E.outX(P(t, 6.4, 6.6));
  line(ex, 286, ex + 60 * tagU, 286, 1, { color: C.orange, w: 3 });
  maskText('오프셋 공식', ex + 76, 296, { size: 28, weight: 700, color: C.orange }, 1 - tagU);
  const sz = 124;
  charText('트래블 =', ex, 440, { size: sz, weight: 900, clip: true }, i => ({ dy: (1 - E.outX(P(t, 6.5 + i * .03, 6.8 + i * .03))) * sz * 1.15 }));
  const line2 = '셋 × 1.414';
  const r2 = charText(line2, ex, 590, { size: sz, weight: 900, clip: true, colorFn: i => i >= 4 ? C.orange : C.paper },
    i => ({ dy: (1 - E.outX(P(t, 6.7 + i * .03, 7.0 + i * .03))) * sz * 1.15 }));
  maskText('상수 1.414 = √2  ·  45° 오프셋에서 셋 1에 대한 트래블 길이', ex, 660, { size: 26, weight: 500, color: C.paper, alpha: .65 }, 1 - E.outX(P(t, 7.1, 7.35)));
  // 소수점 위치 (다음 장면으로의 매치컷 대상)
  scene34.dot = [r2.pos[5] + r2.ws[5] / 2, 590 - sz * .075, sz * .072];
  circle(scene34.dot[0], scene34.dot[1], scene34.dot[2] * clamp(P(t, 7.0, 7.1) * 1.0), { fill: C.orange });
}

/* =================== 장면 5: 챕터 몽타주 (8.5 – 11.0) =================== */
const CARDS = [
  { bg: C.orange, fg: C.ink, ac: C.paper, title: '용접 기호', sub: '필릿 · 그루브 · 현장 용접 표기' },
  { bg: C.ink, fg: C.paper, ac: C.orange, title: '피팅 테이크아웃', sub: '롱 래디어스 엘보 = 1.5D' },
  { bg: C.paper, fg: C.ink, ac: C.orange, title: '관경 · 스케줄', sub: '호칭경과 관 두께의 모든 조합' },
  { bg: C.navy, fg: C.paper, ac: C.orange, title: '볼트 체결 순서', sub: '대각선 교차 체결 패턴' },
  { bg: C.ink2, fg: C.paper, ac: C.orange, title: '압력 시험', sub: '시험압력 = 설계압력 × 1.5' },
];
function card(i, lt) {
  const c = CARDS[i];
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  // 배경 미세 그리드 / 장식
  grid(.06, 60, -lt * 120, 0, c.fg);
  const ex = 150;
  const nu = E.outX(P(lt, 0, .28));
  ctx.save(); font(260, 900); ctx.letterSpacing = '-6px'; ctx.strokeStyle = c.fg; ctx.lineWidth = 2.5; ctx.globalAlpha = .9;
  ctx.strokeText('0' + (i + 1), ex - 8 + (1 - nu) * -140, 400); ctx.restore();
  maskText('챕터 0' + (i + 1) + ' / 05', ex, 170, { size: 24, fam: MONO, weight: 700, color: c.fg, alpha: .8 }, 1 - E.outX(P(lt, .02, .2)));
  maskText(c.title, ex, 560, { size: 116, weight: 900, color: c.fg }, 1 - E.outX(P(lt, .04, .26)));
  const ru = E.outX(P(lt, .1, .36));
  line(ex, 610, ex + 640 * ru, 610, 1, { color: c.ac === C.paper ? c.fg : c.ac, w: 4 });
  maskText(c.sub, ex, 668, { size: 34, weight: 600, color: c.fg, alpha: .78 }, 1 - E.outX(P(lt, .12, .32)));
  // 미니 애니메이션
  ctx.save();
  const cx = 1390, cy = 520;
  [cardWeld, cardElbow, cardSched, cardBolts, cardGauge][i](lt, cx, cy, c);
  ctx.restore();
}
function cardWeld(lt, cx, cy, c) {
  const fg = c.fg;
  // 조인트 (T형 판)
  const pu = E.outX(P(lt, 0, .2));
  ctx.save(); ctx.globalAlpha = pu; ctx.fillStyle = fg;
  ctx.fillRect(cx - 420, cy + 210, 240 * pu, 26); ctx.fillRect(cx - 312, cy + 210 - 150 * pu, 26, 150 * pu); ctx.restore();
  const rx0 = cx - 160, rx1 = cx + 260;
  line(rx0, cy, rx1, cy, E.outX(P(lt, .04, .22)), { color: fg, w: 5 });
  const au = E.outX(P(lt, .08, .24));
  line(rx0, cy, cx - 280, cy + 200, au, { color: fg, w: 5 });
  if (au > .9) arrow(cx - 280, cy + 200, Math.atan2(200, -120), 30, fg);
  // 필릿 삼각형
  const fu = E.outB(P(lt, .16, .34));
  ctx.save(); ctx.translate(cx + 10, cy); ctx.scale(fu, fu); ctx.fillStyle = fg;
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 96); ctx.lineTo(92, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  maskText('6', cx - 52, cy + 72, { size: 56, fam: MONO, weight: 800, color: fg }, 1 - E.outX(P(lt, .22, .36)));
  // 현장 용접 깃발
  const gu = E.outX(P(lt, .22, .38));
  line(rx0, cy, rx0, cy - 110, gu, { color: fg, w: 5 });
  if (gu > .5) { ctx.save(); ctx.fillStyle = c.ac; ctx.beginPath(); ctx.moveTo(rx0 + 2, cy - 110); ctx.lineTo(rx0 + 2 + 70 * E.outB(P(lt, .28, .42)), cy - 88); ctx.lineTo(rx0 + 2, cy - 66); ctx.closePath(); ctx.fill(); ctx.restore(); }
  // 꼬리
  const tu = E.outX(P(lt, .26, .4));
  line(rx1, cy, rx1 + 50, cy - 50, tu, { color: fg, w: 5 }); line(rx1, cy, rx1 + 50, cy + 50, tu, { color: fg, w: 5 });
  maskText('기준선', rx0 + 140, cy - 24, { size: 26, weight: 700, color: fg, alpha: .8 }, 1 - E.outX(P(lt, .2, .36)));
}
function cardElbow(lt, cx, cy, c) {
  const D = 150, R = 1.5 * D;
  const ox = cx - 230, oy = cy + 170;
  const rot = lerp(-.5, 0, spring(lt, 1.6, 8));
  ctx.translate(ox, oy); ctx.rotate(rot); ctx.translate(-ox, -oy);
  const au = E.outX(P(lt, .0, .3));
  const a0 = -Math.PI / 2, a1 = a0 + Math.PI / 2 * au;
  ctx.save(); ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.arc(ox, oy, R, a0, a1); ctx.strokeStyle = C.steel; ctx.lineWidth = D; ctx.stroke();
  ctx.beginPath(); ctx.arc(ox, oy, R - D * .18, a0, a1); ctx.strokeStyle = C.steel2; ctx.lineWidth = D * .5; ctx.stroke();
  ctx.beginPath(); ctx.arc(ox, oy, R - D * .38, a0, a1); ctx.strokeStyle = C.steel3; ctx.lineWidth = 5; ctx.globalAlpha = .6; ctx.stroke();
  ctx.restore();
  // 외곽선
  circle(ox, oy, R + D / 2, { stroke: c.fg, w: 2.5, a0, a1 }); circle(ox, oy, R - D / 2, { stroke: c.fg, w: 2.5, a0, a1 });
  circle(ox, oy, R, { stroke: c.ac, w: 2.5, a0, a1, dash: [22, 8, 5, 8], dashOff: lt * 80 });
  // 면
  line(ox, oy - R - D / 2, ox, oy - R + D / 2, 1, { color: c.fg, w: 3 });
  const ea = a1; line(ox + Math.cos(ea) * (R - D / 2), oy + Math.sin(ea) * (R - D / 2), ox + Math.cos(ea) * (R + D / 2), oy + Math.sin(ea) * (R + D / 2), 1, { color: c.fg, w: 3 });
  // 치수: 중심 → 면
  const du = E.outX(P(lt, .2, .36));
  line(ox, oy, ox, oy - R, du, { color: c.ac, w: 2 }); line(ox, oy, ox + R, oy, du, { color: c.ac, w: 2 });
  circle(ox, oy, 7 * E.outB(P(lt, .18, .3)), { fill: c.ac });
  if (du > .95) { arrow(ox + R, oy, 0, 20, c.ac); arrow(ox, oy - R, -Math.PI / 2, 20, c.ac); }
  maskText('1.5D', ox + R / 2 - 40, oy + 54, { size: 44, fam: MONO, weight: 800, color: c.ac }, 1 - E.outX(P(lt, .24, .38)));
  const cnt = (152.4 * E.outC(P(lt, .22, .45))).toFixed(1);
  maskText(cnt + ' mm', ox + R + 110, oy - R + 20, { size: 34, fam: MONO, weight: 700, color: c.fg }, 1 - E.outX(P(lt, .26, .4)));
  maskText('4인치 · 90°', ox + R + 110, oy - R + 64, { size: 26, weight: 600, color: c.fg, alpha: .7 }, 1 - E.outX(P(lt, .3, .44)));
}
function cardSched(lt, cx, cy, c) {
  const R = 210 * E.outB(P(lt, 0, .24));
  const scheds = [10, 40, 80, 160], inner = [190, 172, 152, 118];
  const idx = clamp(Math.floor((lt - .1) / .09), 0, 3);
  const st = .1 + idx * .09;
  const prev = idx > 0 ? inner[idx - 1] : 200;
  const r = lerp(prev, inner[idx], spring(lt - st, 3, 9)) * (R / 210);
  ctx.save(); ringPath(cx, cy, R, Math.max(0, r)); ctx.fillStyle = c.fg; ctx.fill(); ctx.clip();
  hatchClip(rad(45), 16, C.orange, 3, 1, cx, cy, R + 4); ctx.restore();
  circle(cx, cy, R, { stroke: c.fg, w: 3 }); circle(cx, cy, r, { stroke: c.fg, w: 3 });
  const cl = E.outX(P(lt, .05, .3));
  line(cx - 300 * cl, cy, cx + 300 * cl, cy, 1, { color: c.fg, w: 1.5, dash: [30, 8, 5, 8], alpha: .7 });
  line(cx, cy - 300 * cl, cx, cy + 300 * cl, 1, { color: c.fg, w: 1.5, dash: [30, 8, 5, 8], alpha: .7 });
  for (let k = 0; k < 4; k++) {
    const on = k === idx;
    const x = cx - 270 + k * 180;
    txt('SCH ' + scheds[k], x, cy + 330, { size: 30, fam: MONO, weight: on ? 800 : 500, color: on ? C.orange : c.fg, align: 'center', alpha: (on ? 1 : .4) * E.outX(P(lt, .05 + k * .03, .2 + k * .03)) });
  }
  const bx = cx - 270 + idx * 180;
  line(bx - 60, cy + 348, bx + 60, cy + 348, 1, { color: C.orange, w: 4, alpha: P(lt, .1, .15) });
}
function cardBolts(lt, cx, cy, c) {
  const rot = lerp(-1.2, 0, spring(lt, 1.4, 7)) + lt * .35;
  const k = E.outB(P(lt, 0, .24));
  ctx.translate(cx, cy); ctx.scale(k, k);
  circle(0, 0, 300, { stroke: C.cyan, w: 1, alpha: .35, dash: [6, 10], dashOff: lt * 50 });
  ctx.save(); ctx.rotate(rot);
  circle(0, 0, 240, { fill: '#133556', stroke: c.fg, w: 3 });
  circle(0, 0, 150, { stroke: C.cyan, w: 2, alpha: .6 });
  circle(0, 0, 96, { fill: C.navy, stroke: c.fg, w: 3 });
  const order = [0, 4, 2, 6, 1, 5, 3, 7];
  const pos = i => { const a = -Math.PI / 2 + i * Math.PI / 4 + Math.PI / 8; return [Math.cos(a) * 192, Math.sin(a) * 192]; };
  for (let i = 0; i < 8; i++) { const p = pos(i); circle(p[0], p[1], 20, { fill: C.navy, stroke: c.fg, w: 3 }); }
  const prog = P(lt, .08, .46) * 7;
  ctx.save(); ctx.strokeStyle = C.orange; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
  const p0 = pos(order[0]); ctx.moveTo(p0[0], p0[1]);
  for (let s = 1; s <= 7; s++) {
    const u = clamp(prog - (s - 1)); if (u <= 0) break;
    const a = pos(order[s - 1]), b = pos(order[s]); ctx.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u));
  }
  ctx.stroke(); ctx.restore();
  for (let s = 0; s < 8; s++) {
    const u = E.outB(P(prog, s - .3, s + .4)); if (u <= 0) continue;
    const p = pos(order[s]);
    circle(p[0], p[1], 12 * u, { fill: C.orange });
    const q = [p[0] * 1.32, p[1] * 1.32];
    ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(-rot); ctx.scale(u, u);
    txt(String(s + 1), 0, 11, { size: 32, fam: MONO, weight: 800, color: c.fg, align: 'center' }); ctx.restore();
  }
  ctx.restore();
}
function cardGauge(lt, cx, cy, c) {
  const R = 240, a0 = rad(150), sweep = rad(240);
  const k = E.outB(P(lt, 0, .22));
  ctx.translate(cx, cy + 20); ctx.scale(k, k);
  circle(0, 0, R + 26, { fill: C.ink3, stroke: c.fg, w: 3 });
  const au = E.outX(P(lt, .02, .3));
  circle(0, 0, R - 10, { stroke: c.fg, w: 3, a0, a1: a0 + sweep * au, alpha: .9 });
  circle(0, 0, R - 10, { stroke: C.orange, w: 14, a0: a0 + sweep * .7, a1: a0 + sweep * Math.max(.7, au), alpha: .9 });
  for (let i = 0; i <= 50; i++) {
    const u = i / 50; if (u > au) break;
    const a = a0 + sweep * u, big = i % 5 === 0;
    const r1 = R - 24, r2 = r1 - (big ? 30 : 14);
    line(Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2, 1, { color: c.fg, w: big ? 4 : 2, alpha: big ? 1 : .55 });
  }
  // 설계 / 시험 마크
  const mark = (u, s, col) => { const a = a0 + sweep * u; txt(s, Math.cos(a) * (R - 92), Math.sin(a) * (R - 92) + 10, { size: 26, weight: 800, color: col, align: 'center', alpha: P(lt, .2, .3) }); };
  mark(.5, '설계', c.fg); mark(.75, '시험', C.orange);
  // 바늘 (스프링 오버슈트)
  const v = .75 * spring(lt - .12, 1.8, 6);
  const na = a0 + sweep * v;
  ctx.save(); ctx.rotate(na); ctx.fillStyle = C.orange;
  ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(R - 40, -2); ctx.lineTo(R - 40, 2); ctx.lineTo(-30, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  circle(0, 0, 20, { fill: c.fg }); circle(0, 0, 8, { fill: C.orange });
  txt((v * 2).toFixed(2) + '×', 0, 150, { size: 58, fam: MONO, weight: 800, color: c.fg, align: 'center', alpha: P(lt, .1, .2) });
}
function scene5(t) {
  const lt0 = t - 8.5; const k = clamp(Math.floor(lt0 / .5), 0, 4); const lt = lt0 - k * .5;
  const TD = .16; const u = P(lt, 0, TD);
  if (k > 0 && u < 1) card(k - 1, lt + .5);
  ctx.save();
  if (k > 0 && u < 1) {
    ctx.beginPath();
    const e = E.outX(u);
    if (k === 1) { ctx.rect(W * (1 - e), 0, W, H); }
    else if (k === 2) { ctx.arc(1390, 520, 2300 * E.outC(u), 0, Math.PI * 2); }
    else if (k === 3) { const x = lerp(-H * .6, W + 40, e); ctx.moveTo(-10, -10); ctx.lineTo(x + H * .6, -10); ctx.lineTo(x, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); }
    else { const n = 9; for (let s = 0; s < n; s++) { const su = E.outX(P(lt, s * .008, TD * .7 + s * .008)); const bh = H / n; ctx.rect(0, s * bh + bh / 2 * (1 - su), W, bh * su + 1); } }
    ctx.clip();
  }
  // 진입 시 미세 슬라이드
  const sl = (1 - E.outX(P(lt, 0, .25))) * 60;
  ctx.translate(sl * (k % 2 ? -1 : 1), 0);
  card(k, lt);
  ctx.restore();
  // 전환 엣지 라인
  if (k === 1 && u > 0 && u < 1) line(W * (1 - E.outX(u)), 0, W * (1 - E.outX(u)), H, 1, { color: C.paper, w: 6 });
  if (k === 3 && u > 0 && u < 1) { const x = lerp(-H * .6, W + 40, E.outX(u)); line(x + H * .6, 0, x, H, 1, { color: C.orange, w: 8 }); }
  if (k === 2 && u > 0 && u < 1) circle(1390, 520, 2300 * E.outC(u), { stroke: C.orange, w: 10 });
}

/* =================== 장면 6/7: 표지 & 엔딩 (11.0 – 15.0) =================== */
const BW = 520, BH = 720;
const BOOK_LINES = [
  [-BW / 2, -BH / 2, BW / 2, -BH / 2, C.paper], [BW / 2, -BH / 2, BW / 2, BH / 2, C.cyan], [BW / 2, BH / 2, -BW / 2, BH / 2, C.paper], [-BW / 2, BH / 2, -BW / 2, -BH / 2, C.orange],
  [-BW / 2 + 44, -BH / 2, -BW / 2 + 44, BH / 2, C.orange], [-BW / 2 + 90, -BH / 2 + 70, BW / 2 - 46, -BH / 2 + 70, C.cyan],
  [-BW / 2 + 90, BH / 2 - 70, BW / 2 - 46, BH / 2 - 70, C.cyan], [-BW / 2 + 90, 50, BW / 2 - 46, 50, C.orange],
  [-BW / 2 + 90, -BH / 2 + 300, BW / 2 - 46, -BH / 2 + 300, C.paper], [ -BW/2+90+ (BW-136)/2, -BH/2 + 70, -BW/2+90+(BW-136)/2, -BH/2+300, C.paper],
];
function bookCover(t, lt) {
  // lt: 11.0 기준 로컬 시간
  const fill = E.outC(P(lt, .42, .62));
  const lineA = 1 - P(lt, .6, .9) * .7;
  // 페이지 블록 & 뒷표지 (두께감)
  if (fill > 0) {
    ctx.save(); ctx.globalAlpha = fill;
    ctx.fillStyle = '#05080B'; ctx.fillRect(-BW / 2 + 30, -BH / 2 + 26, BW, BH);
    ctx.fillStyle = '#D9D1C0'; ctx.fillRect(-BW / 2 + 16, -BH / 2 + 12, BW, BH);
    ctx.strokeStyle = '#B8AE98'; ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(BW / 2 + 3 + k * 2.2, -BH / 2 + 8 + k * 2); ctx.lineTo(BW / 2 + 3 + k * 2.2, BH / 2 + 8 + k * 2); ctx.stroke(); }
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 40;
    const g = ctx.createLinearGradient(0, -BH / 2, 0, BH / 2); g.addColorStop(0, '#1A2330'); g.addColorStop(1, '#0E141C');
    ctx.fillStyle = g; ctx.fillRect(-BW / 2, -BH / 2, BW, BH);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.orange; ctx.fillRect(-BW / 2, -BH / 2, 44, BH);
    ctx.restore();
  }
  // 날아와 맞춰지는 선들
  BOOK_LINES.forEach((l, i) => {
    const u = E.outX(P(lt, i * .028, .42 + i * .028)); if (u <= 0) return;
    const ang = rnd(i * 9.1) * Math.PI * 2, dist = 1500 * (1 - u);
    const ox = Math.cos(ang) * dist, oy = Math.sin(ang) * dist, rr = (1 - u) * (rnd(i * 4.3) - .5) * 3;
    const mx = (l[0] + l[2]) / 2, my = (l[1] + l[3]) / 2;
    ctx.save(); ctx.translate(mx + ox, my + oy); ctx.rotate(rr);
    line(l[0] - mx, l[1] - my, l[2] - mx, l[3] - my, 1, { color: l[4], w: 3, alpha: lineA });
    ctx.restore();
  });
  if (fill <= 0) return;
  // 플랜지 엠블럼
  const ecx = -BW / 2 + 90 + (BW - 136) / 2, ecy = -BH / 2 + 185;
  ctx.save(); ctx.globalAlpha = fill; ctx.translate(ecx, ecy); ctx.rotate(t * .25);
  circle(0, 0, 96, { stroke: C.paper, w: 2.5, alpha: .9 }); circle(0, 0, 44, { stroke: C.orange, w: 3 });
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; circle(Math.cos(a) * 72, Math.sin(a) * 72, 9, { stroke: C.paper, w: 2, alpha: .9 }); }
  line(-120, 0, 120, 0, 1, { color: C.cyan, w: 1, dash: [16, 5, 3, 5], alpha: .6 }); line(0, -120, 0, 120, 1, { color: C.cyan, w: 1, dash: [16, 5, 3, 5], alpha: .6 });
  ctx.restore();
  // 표지 텍스트
  const tx = -BW / 2 + 90;
  maskText('현장 배관 실무 대전', tx, -BH / 2 + 50, { size: 20, weight: 700, color: C.paper, alpha: .7 * fill, ls: 2 }, 1 - E.outX(P(lt, .55, .75)));
  maskText('파이프피터의', tx, 124, { size: 56, weight: 800, color: C.paper }, 1 - E.outX(P(lt, .58, .82)));
  charText('바이블', tx - 4, 262, { size: 140, weight: 900, clip: true, ls: -4 }, i => ({ dy: (1 - E.outX(P(lt, .64 + i * .05, .92 + i * .05))) * 170 }));
  circle(tx + measure('바이블', 140, 900, KR, 0) - 2, 252, 13 * E.outB(P(lt, .85, 1.0)), { fill: C.orange });
  maskText('개정 증보판', tx, BH / 2 - 36, { size: 22, weight: 700, color: C.paper, alpha: .75 }, 1 - E.outX(P(lt, .7, .9)));
  maskText('2026', BW / 2 - 46, BH / 2 - 36, { size: 22, fam: MONO, weight: 700, color: C.orange, align: 'right' }, 1 - E.outX(P(lt, .72, .92)));
  // 라이트 스윕
  const su = P(lt, 1.15, 1.75);
  if (su > 0 && su < 1) {
    ctx.save(); ctx.beginPath(); ctx.rect(-BW / 2, -BH / 2, BW, BH); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const x = lerp(-BW * 1.2, BW * 1.2, E.ioC(su));
    const g = ctx.createLinearGradient(x - 160, 0, x + 160, 0);
    g.addColorStop(0, 'rgba(255,240,220,0)'); g.addColorStop(.5, 'rgba(255,240,220,.22)'); g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.translate(0, 0); ctx.transform(1, 0, -.45, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(-BW * 2, -BH, BW * 4, BH * 2);
    ctx.restore();
  }
}
function scene67(t) {
  const lt = t - 11.0;
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  // 배경: 글로우 + 거대 볼트 서클 + 먼지
  const g = ctx.createRadialGradient(960, 520, 0, 960, 520, 900);
  g.addColorStop(0, `rgba(255,90,31,${.22 * P(lt, .2, .8)})`); g.addColorStop(1, 'rgba(255,90,31,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(960, 540); ctx.rotate(-lt * .08);
  const bs = lerp(.7, 1.05, E.outC(P(lt, 0, 1.2)));
  ctx.scale(bs, bs);
  circle(0, 0, 820, { stroke: C.paper, w: 1.5, alpha: .07 }); circle(0, 0, 640, { stroke: C.cyan, w: 1, alpha: .1, dash: [4, 14] });
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; circle(Math.cos(a) * 730, Math.sin(a) * 730, 30, { stroke: C.paper, w: 1.5, alpha: .08 }); }
  ctx.restore();
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const z = .3 + rnd(i * 2.2) * .7; const x = (rnd(i) * W + lt * 40 * z) % W, y = (rnd(i * 5.5) * H - lt * 25 * z + H) % H;
    ctx.globalAlpha = .25 * z * P(lt, 0, .5); ctx.fillStyle = C.paper; ctx.fillRect(x, y, 2 * z + .5, 2 * z + .5);
  }
  ctx.restore();

  // 책 배치 (엔딩에서 왼쪽으로)
  const mv = E.ioQ(P(t, 13.5, 14.0));
  const bx = lerp(960, 610, mv), by = 540, bsc = lerp(lerp(.92, 1.0, E.outC(P(lt, .3, 2.5))), .86, mv);
  ctx.save(); ctx.translate(bx, by); ctx.scale(bsc, bsc); ctx.rotate(rad(-3) + spring(lt - .4, 1.2, 6) * 0 + (1 - E.outC(P(lt, .3, 1.2))) * rad(-6));
  bookCover(t, lt);
  ctx.restore();

  // 콜아웃
  const ca = 1 - P(t, 13.45, 13.6);
  if (ca > 0) {
    const items = [
      { from: [960 - 250, 380], to: [430, 300], label: '핵심 공식', side: -1, t0: 1.45 },
      { from: [960 + 240, 300], to: [1460, 400], label: '치수 도표', side: 1, t0: 1.6 },
      { from: [960 + 250, 640], to: [1470, 720], label: '현장 노하우', side: 1, t0: 1.75 },
    ];
    ctx.save(); ctx.globalAlpha = ca;
    for (const it of items) {
      const u = E.outX(P(lt, it.t0, it.t0 + .3)); if (u <= 0) continue;
      circle(it.from[0], it.from[1], 8 * E.outB(P(lt, it.t0, it.t0 + .2)), { fill: C.orange });
      line(it.from[0], it.from[1], it.to[0], it.to[1], u, { color: C.paper, w: 1.5, alpha: .8 });
      const lw = measure(it.label, 34, 800) + 20;
      const ex = it.to[0] + it.side * lw;
      line(it.to[0], it.to[1], ex, it.to[1], E.outX(P(lt, it.t0 + .15, it.t0 + .4)), { color: C.paper, w: 1.5, alpha: .8 });
      maskText(it.label, it.side > 0 ? it.to[0] + 10 : ex + 10, it.to[1] - 14, { size: 34, weight: 800, color: C.paper }, 1 - E.outX(P(lt, it.t0 + .2, it.t0 + .42)));
    }
    ctx.restore();
  }

  // 엔딩 태그라인
  if (t >= 13.6) {
    const tx = 1010;
    line(tx, 330, tx + 70 * E.outX(P(t, 13.6, 13.8)), 330, 1, { color: C.orange, w: 3 });
    maskText('파이프피터의 바이블', tx + 86, 340, { size: 28, weight: 700, color: C.orange }, 1 - E.outX(P(t, 13.62, 13.82)));
    charText('현장의 모든 답,', tx, 480, { size: 108, weight: 900, clip: true }, i => ({ dy: (1 - E.outX(P(t, 13.66 + i * .025, 13.96 + i * .025))) * 130 }));
    charText('한 권에.', tx, 612, { size: 108, weight: 900, clip: true, colorFn: i => i < 3 ? C.orange : C.paper }, i => ({ dy: (1 - E.outX(P(t, 13.86 + i * .03, 14.16 + i * .03))) * 130 }));
    maskText('배관 실무의 기준을 한 권으로 정리한 현장 레퍼런스', tx, 690, { size: 28, weight: 500, color: C.paper, alpha: .65 }, 1 - E.outX(P(t, 14.0, 14.22)));
  }
}

/* =================== HUD =================== */
const SCENES = [[0, '단면'], [1.5, '타이포그래피'], [3.0, '아이소메트릭'], [6.0, '오프셋 공식'], [8.5, '챕터 몽타주'], [11.0, '표지 리빌'], [13.5, '엔딩']];
function hud(t) {
  const a = P(t, .35, .7) * (1 - P(t, 14.4, 14.55));
  if (a <= 0) return;
  const dark = (t >= 8.43 && t < 9.0) || (t >= 9.5 && t < 10.0);
  const col = dark ? C.ink : C.paper;
  ctx.save(); ctx.globalAlpha = a;
  const m = 44, s = 26;
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = a * .55;
  ctx.beginPath();
  ctx.moveTo(m, m + s); ctx.lineTo(m, m); ctx.lineTo(m + s, m);
  ctx.moveTo(W - m - s, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + s);
  ctx.moveTo(m, H - m - s); ctx.lineTo(m, H - m); ctx.lineTo(m + s, H - m);
  ctx.moveTo(W - m - s, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - s);
  ctx.stroke();
  ctx.globalAlpha = a;
  txt('모션 디자인 쇼릴', m + 40, m + 26, { size: 18, weight: 700, color: col, alpha: .85 });
  txt('2026', m + 40 + measure('모션 디자인 쇼릴', 18, 700) + 14, m + 26, { size: 18, fam: MONO, weight: 600, color: C.orange });
  const f = Math.floor(t * FPS + 1e-6); const ss = Math.floor(f / FPS), ff = f % FPS;
  txt(`00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, W - m - 40, m + 26, { size: 18, fam: MONO, weight: 600, color: col, align: 'right', alpha: .85 });
  circle(W - m - 40 - measure('00:00:00:00', 18, 600, MONO) - 16, m + 20, 5, { fill: C.orange, alpha: (Math.floor(t * 2) % 2 ? .35 : 1) });
  // 장면 라벨
  let si = 0; for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) si = i;
  const st = SCENES[si][0];
  const lab = `장면 0${si + 1}  ·  ${SCENES[si][1]}`;
  maskText(lab, m + 40, H - m - 12, { size: 18, weight: 700, color: col, alpha: .85 }, 1 - E.outX(P(t, st, st + .25)));
  // 진행 바
  const bw = 240, bx = W - m - 40 - bw, by = H - m - 18;
  ctx.globalAlpha = a * .3; ctx.fillStyle = col; ctx.fillRect(bx, by, bw, 2);
  ctx.globalAlpha = a; ctx.fillStyle = C.orange; ctx.fillRect(bx, by - 1, bw * (t / DUR), 4);
  for (const [ss2] of SCENES) { ctx.fillStyle = col; ctx.globalAlpha = a * .6; ctx.fillRect(bx + bw * ss2 / DUR - 1, by - 6, 2, 14); }
  ctx.restore();
}

/* =================== 메인 =================== */
function world(t) {
  const [sx, sy] = shake(t);
  ctx.save(); ctx.translate(sx, sy);
  if (t < 1.5) scene1(t);
  else if (t < 3.0) scene2(t);
  else if (t < 8.5) {
    if (t >= 8.0) {
      scene34(8.0); // 정지 프레임에 대한 줌 인 (값 계산용)
      const d = scene34.dot; const u = P(t, 8.0, 8.5);
      const s = Math.exp(Math.log(300) * u * u);
      ctx.fillStyle = C.ink; ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.save(); ctx.translate(d[0], d[1]); ctx.scale(s, s); ctx.translate(-d[0], -d[1]);
      scene34(t); ctx.restore();
      const cov = P(t, 8.42, 8.5); if (cov > 0) { ctx.globalAlpha = cov; ctx.fillStyle = C.orange; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.globalAlpha = 1; }
    } else scene34(t);
  }
  else if (t < 11.0) scene5(t);
  else scene67(t);
  ctx.restore();
  // 임팩트 플래시
  for (const [ti, amp] of IMPACTS) {
    const d = t - ti; if (d < 0 || d > .25) continue;
    ctx.save(); ctx.globalAlpha = Math.exp(-d * 20) * amp / 60; ctx.fillStyle = '#FFF4E6'; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}

function draw(t) {
  ctx = mainCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.lineJoin = 'round';
  if (t < 14.45) { world(t); hud(t); return; }
  // ---- 엔딩: CRT 오프 → 선 → 점 → 암전 ----
  ctx = bufCtx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineJoin = 'round';
  world(t); hud(t);
  ctx = mainCtx;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const u1 = P(t, 14.45, 14.72), u2 = P(t, 14.72, 14.9), u3 = P(t, 14.9, 14.97);
  const sy = lerp(1, .006, E.inX(u1)), sx = lerp(1, 0, E.inX(u2));
  if (u1 < 1) {
    ctx.save(); ctx.translate(960, 540); ctx.scale(lerp(1, 1.06, u1), sy); ctx.translate(-960, -540); ctx.drawImage(buf, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = E.inC(u1); ctx.fillStyle = C.orange; ctx.fillRect(0, 540 - H * sy / 2, W, H * sy); ctx.restore();
  } else if (u2 < 1) {
    const hw = 1020 * sx;
    ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 30; ctx.fillStyle = C.orange; ctx.fillRect(960 - hw, 537, hw * 2, 6); ctx.restore();
    circle(960, 540, lerp(3, 9, E.outC(u2)), { fill: C.orange });
  } else if (u3 < 1) {
    ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 30; circle(960, 540, 9 * (1 - E.inC(u3)), { fill: C.orange }); ctx.restore();
  }
}

/* =================== 부트 =================== */
const FONT_FILES = [[900, 'Black'], [800, 'ExtraBold'], [700, 'Bold'], [600, 'SemiBold'], [500, 'Medium']];
window.ready = (async () => {
  const base = 'node_modules/pretendard/dist/public/static/';
  await Promise.all(FONT_FILES.map(async ([w, n]) => {
    const ff = new FontFace('Pretendard', `url(${base}Pretendard-${n}.otf)`, { weight: String(w) });
    await ff.load(); document.fonts.add(ff);
  }));
  for (const w of [500, 600, 700, 800]) await document.fonts.load(`${w} 20px "JetBrains Mono"`);
  await document.fonts.ready;
  draw(0);
  return true;
})();
window.draw = draw;
window.DUR = DUR; window.FPS = FPS;

// 일반 브라우저에서 열면 실시간 미리보기 (스페이스: 일시정지, ←/→: 탐색)
if (!/render/.test(location.search)) {
  document.body.classList.add('preview');
  window.ready.then(() => {
    let t0 = performance.now(), paused = false, tp = 0;
    addEventListener('keydown', e => {
      if (e.code === 'Space') { paused = !paused; t0 = performance.now() - tp * 1000; }
      if (e.code === 'ArrowRight') { tp = Math.min(DUR - .001, tp + .5); t0 = performance.now() - tp * 1000; }
      if (e.code === 'ArrowLeft') { tp = Math.max(0, tp - .5); t0 = performance.now() - tp * 1000; }
    });
    const loop = now => { if (!paused) tp = ((now - t0) / 1000) % DUR; draw(tp); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
}
