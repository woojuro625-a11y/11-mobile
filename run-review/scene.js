/* 러닝 훈련 리뷰 — 인스타그램 피드 4:5 (1080×1350), 60fps
 * 2026.11.04 · 2km×5 + 1km 롱 인터벌 (Garmin FIT 데이터)
 * 곡: Riverside Stride (≈123 BPM). 모든 전환은 beats.json의 실제 비트 타임에 맞춘다.
 * draw(t) 하나로 결정론적 렌더. t < 0.1 구간은 커버 이미지 그대로.
 */
const W = 1080, H = 1350, FPS = 60, DUR = 54.0;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const C = {
  bg: '#0B0D10', bg2: '#12161B', bg3: '#1A1F26', line: '#2A313A',
  lime: '#D4FF3A', limeDim: '#8FAE22', white: '#F3F2EC', mute: '#8A93A0',
  sky: '#5CC8FF', coral: '#FF5A5F', deep: '#081521', track: '#24191A', trackLine: '#E8E2D6',
};
const KR = 'Pretendard', NUM = 'Anton', MONO = '"JetBrains Mono"';

/* ---------------- 데이터 (FIT 분석 결과) ---------------- */
const RUN = {
  date: '2026.11.04', day: '수요일', start: '19:58',
  dist: 13.12, timer: 3425, elapsed: 3593, avgPace: 261.1, avgHr: 154, maxHr: 177,
  kcal: 809, cadence: 186, stride: 1.21, gct: 218, power: 348, np: 364, teAer: 4.3, teAna: 1.2, temp: 18, maxKmh: 18.0,
};
const REPS = [
  { pace: 245.2, hr: 150.5, pw: 370.5, lo: 240, hi: 250 },
  { pace: 239.8, hr: 158.0, pw: 379.5, lo: 235, hi: 245 },
  { pace: 233.8, hr: 161.5, pw: 391.5, lo: 230, hi: 240 },
  { pace: 230.7, hr: 165.5, pw: 396.0, lo: 225, hi: 235 },
  { pace: 225.7, hr: 168.0, pw: 402.5, lo: 220, hi: 230 },
];
const FINAL = { pace: 206.9, dist: 518, lo: 215, hi: 220, hr: 164 };
const RECS = [344.0, 370.9, 374.9, 386.5, 390.1];
let B = [];        // 비트 타임
let SERIES = [];   // [t, speed, hr, dist]

/* ---------------- 유틸 ---------------- */
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const P = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const rad = d => d * Math.PI / 180;
const E = {
  inC: u => u * u * u, outC: u => 1 - Math.pow(1 - u, 3),
  ioC: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  outQ: u => 1 - Math.pow(1 - u, 5),
  ioQ: u => u < .5 ? 16 * Math.pow(u, 5) : 1 - Math.pow(-2 * u + 2, 5) / 2,
  outX: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u), inX: u => u <= 0 ? 0 : Math.pow(2, 10 * u - 10),
  outB: (u, s = 1.9) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
};
function spring(dt, f = 2.4, z = 7) { if (dt <= 0) return 0; return 1 - Math.exp(-z * dt) * Math.cos(2 * Math.PI * f * dt); }
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const pad2 = n => String(n).padStart(2, '0');
function fmtPace(s) { const r = Math.round(s); return `${Math.floor(r / 60)}:${pad2(r % 60)}`; }
const b = i => B[Math.min(i, B.length - 1)];
function lastBeat(t) { let lo = 0, hi = B.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (B[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
function pulse(t, k = 9, from = 0, to = 99) { const i = lastBeat(t); if (i < from || i > to) return 0; return Math.exp(-(t - B[i]) * k); }

/* ---------------- 텍스트 / 도형 ---------------- */
function font(size, weight = 800, fam = KR) { ctx.font = `${weight} ${size}px ${fam}`; }
function txt(s, x, y, o = {}) {
  ctx.save(); font(o.size || 40, o.weight || 800, o.fam || KR);
  ctx.fillStyle = o.color || C.white; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px'; if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || 2; ctx.strokeText(s, x, y); } else ctx.fillText(s, x, y);
  ctx.restore();
}
function measure(s, size, weight = 800, fam = KR, ls = 0) { ctx.save(); font(size, weight, fam); ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
function maskText(s, x, y, o, off) {
  const size = o.size; ctx.save(); font(size, o.weight || 900, o.fam || KR); ctx.letterSpacing = (o.ls || 0) + 'px';
  const w = ctx.measureText(s).width; let x0 = x; if (o.align === 'center') x0 = x - w / 2; else if (o.align === 'right') x0 = x - w;
  const top = o.fam === NUM ? size * .95 : size * 1.02;
  ctx.beginPath(); ctx.rect(x0 - 30, y - top, w + 60, top + size * .32); ctx.clip();
  ctx.fillStyle = o.color || C.white; if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.fillText(s, x0, y + off * size * 1.25); ctx.restore(); return w;
}
function charText(s, x, y, o, fn) {
  ctx.save(); font(o.size, o.weight || 900, o.fam || KR); ctx.letterSpacing = '0px';
  const chars = [...s], ls = o.ls || 0, ws = chars.map(ch => ctx.measureText(ch).width);
  const total = ws.reduce((a, c) => a + c, 0) + ls * (chars.length - 1);
  let cx = x; if (o.align === 'center') cx = x - total / 2; else if (o.align === 'right') cx = x - total;
  if (o.clip) { const top = o.fam === NUM ? o.size * .95 : o.size * 1.02; ctx.beginPath(); ctx.rect(cx - 40, y - top, total + 80, top + o.size * .32); ctx.clip(); }
  chars.forEach((ch, i) => {
    const r = fn(i, chars.length) || {}; const a = r.a == null ? 1 : r.a;
    if (a > .001) {
      ctx.save(); ctx.translate(cx + ws[i] / 2 + (r.dx || 0), y + (r.dy || 0));
      const sc = r.s == null ? 1 : r.s; ctx.scale(sc, sc); ctx.globalAlpha *= a;
      ctx.fillStyle = (o.colorFn && o.colorFn(i)) || o.color || C.white; ctx.textAlign = 'center'; ctx.fillText(ch, 0, 0); ctx.restore();
    }
    cx += ws[i] + ls;
  });
  ctx.restore(); return total;
}
/* 슬롯머신처럼 숫자가 굴러가며 바뀌는 텍스트 */
function rollText(from, to, x, y, o, u) {
  const a = [...from], c = [...to]; const n = Math.max(a.length, c.length);
  while (a.length < n) a.unshift(' '); while (c.length < n) c.unshift(' ');
  ctx.save(); font(o.size, 400, o.fam || NUM); ctx.letterSpacing = '0px';
  const ws = c.map(ch => ctx.measureText(ch === ' ' ? '0' : ch).width * (ch === ' ' ? 0 : 1));
  const total = ws.reduce((p, q) => p + q, 0) + (o.ls || 0) * (n - 1);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const top = o.size * .95;
  ctx.beginPath(); ctx.rect(cx - 40, y - top - 6, total + 80, top + o.size * .2); ctx.clip();
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const ui = E.outX(clamp((u - i * .07) / (1 - (n - 1) * .07 + 1e-6)));
    const same = a[i] === c[i];
    ctx.fillStyle = (o.colorFn && o.colorFn(i)) || o.color || C.white;
    if (same || ui >= 1) ctx.fillText(c[i], cx + ws[i] / 2, y);
    else { ctx.fillText(a[i], cx + ws[i] / 2, y - ui * o.size * 1.15); ctx.fillText(c[i], cx + ws[i] / 2, y + (1 - ui) * o.size * 1.15); }
    cx += ws[i] + (o.ls || 0);
  }
  ctx.restore(); return total;
}
function line(x1, y1, x2, y2, u = 1, o = {}) {
  if (u <= 0) return; ctx.save(); ctx.strokeStyle = o.color || C.white; ctx.lineWidth = o.w || 2; ctx.lineCap = o.cap || 'butt';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha; if (o.dash) { ctx.setLineDash(o.dash); ctx.lineDashOffset = o.dashOff || 0; }
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, u), lerp(y1, y2, u)); ctx.stroke(); ctx.restore();
}
function circle(x, y, r, o = {}) {
  if (r <= 0) return; ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.beginPath(); ctx.arc(x, y, r, o.a0 || 0, o.a1 == null ? Math.PI * 2 : o.a1, o.ccw);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.w || 2; ctx.lineCap = o.cap || 'butt'; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
  ctx.restore();
}
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function pill(x, y, s, o = {}) {
  const size = o.size || 26; const w = measure(s, size, o.weight || 800) + size * 1.3, h = size * 1.75;
  let x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const sc = o.scale == null ? 1 : o.scale; ctx.translate(x0 + w / 2, y); ctx.scale(sc, sc); ctx.translate(-(x0 + w / 2), -y);
  rrect(x0, y - h / 2, w, h, h / 2);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } else { ctx.strokeStyle = o.color || C.white; ctx.lineWidth = 2; ctx.stroke(); }
  txt(s, x0 + w / 2, y + size * .36, { size, weight: o.weight || 800, color: o.text || (o.fill ? C.bg : o.color || C.white), align: 'center' });
  ctx.restore(); return w;
}
function check(x, y, r, u, col = C.bg) {
  if (u <= 0) return; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = r * .22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pts = [[x - r * .42, y + r * .02], [x - r * .1, y + r * .32], [x + r * .45, y - r * .3]];
  const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  const d = u * (l1 + l2); ctx.beginPath(); ctx.moveTo(...pts[0]);
  if (d <= l1) ctx.lineTo(lerp(pts[0][0], pts[1][0], d / l1), lerp(pts[0][1], pts[1][1], d / l1));
  else { ctx.lineTo(...pts[1]); const v = (d - l1) / l2; ctx.lineTo(lerp(pts[1][0], pts[2][0], v), lerp(pts[1][1], pts[2][1], v)); }
  ctx.stroke(); ctx.restore();
}
function heart(x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32); ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(0, 10); ctx.bezierCurveTo(-26, -6, -14, -26, 0, -14); ctx.bezierCurveTo(14, -26, 26, -6, 0, 10); ctx.fill(); ctx.restore();
}

/* ---------------- 400m 트랙 ---------------- */
const TS = 84.39, TR = 36.8, TL = 2 * TS + 2 * Math.PI * TR;
function trackPt(d, r = TR) {
  // 홈 스트레이트(아래) 시작, 반시계 방향 (화면 기준 오른쪽으로 출발)
  const k = r / TR; let s = ((d % TL) + TL) % TL;
  const bend = Math.PI * TR;
  if (s < TS) return [-TS / 2 + s, r];
  s -= TS; if (s < bend) { const a = Math.PI / 2 - s / TR; return [TS / 2 + r * Math.cos(a), r * Math.sin(a)]; }
  s -= bend; if (s < TS) return [TS / 2 - s, -r];
  s -= TS; const a = -Math.PI / 2 - s / TR; return [-TS / 2 + r * Math.cos(a), r * Math.sin(a)];
}
function trackPath(r) { ctx.beginPath(); ctx.moveTo(-TS / 2, r); ctx.lineTo(TS / 2, r); ctx.arc(TS / 2, 0, r, Math.PI / 2, -Math.PI / 2, true); ctx.lineTo(-TS / 2, -r); ctx.arc(-TS / 2, 0, r, -Math.PI / 2, -Math.PI * 1.5, true); ctx.closePath(); }
/* cam: {x,y,s,tilt,rot}; o.draw: 0..1 선 그리기 진행, o.runner: 거리(m) */
function track(cam, o = {}) {
  const a = o.alpha == null ? 1 : o.alpha; if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.translate(cam.x, cam.y); ctx.scale(1, cam.tilt); ctx.rotate(cam.rot || 0); ctx.scale(cam.s, cam.s);
  const lw = 1 / cam.s;
  const dr = o.draw == null ? 1 : o.draw;
  if (o.fill) {
    ctx.save(); ctx.globalAlpha *= dr; trackPath(36.5 + 8 * 1.22); ctx.fillStyle = o.fill; ctx.fill();
    trackPath(36.5); ctx.fillStyle = o.infield || C.bg; ctx.fill(); ctx.restore();
  }
  for (let k = 0; k <= 8; k++) {
    const r = 36.5 + k * 1.22;
    const per = 2 * TS + 2 * Math.PI * r;
    ctx.save(); ctx.strokeStyle = o.color || C.trackLine; ctx.lineWidth = (k === 0 || k === 8 ? 2.2 : 1.2) * lw;
    ctx.globalAlpha *= (k === 0 || k === 8 ? .55 : .28) * (o.lineAlpha == null ? 1 : o.lineAlpha);
    ctx.setLineDash([per * clamp(dr * 1.15 - k * .02), per]); trackPath(r); ctx.stroke(); ctx.restore();
  }
  // 결승선
  if (dr > .9) { ctx.save(); ctx.globalAlpha *= (dr - .9) * 10 * .8; ctx.strokeStyle = C.white; ctx.lineWidth = 2.5 * lw; ctx.beginPath(); ctx.moveTo(TS / 2, 36.5); ctx.lineTo(TS / 2, 36.5 + 8 * 1.22); ctx.stroke(); ctx.restore(); }
  // 러너 + 잔상
  if (o.runner != null) {
    const d = o.runner, trail = o.trail || 60;
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < 24; k++) {
      const d0 = d - trail * (k + 1) / 24, d1 = d - trail * k / 24;
      const p0 = trackPt(d0, 37.4), p1 = trackPt(d1, 37.4);
      ctx.strokeStyle = o.runnerColor || C.lime; ctx.globalAlpha = (1 - k / 24) * .9; ctx.lineWidth = (5 - k * .15) * lw * 1.4;
      ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.stroke();
    }
    const p = trackPt(d, 37.4);
    ctx.globalAlpha = 1; ctx.shadowColor = o.runnerColor || C.lime; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2); ctx.fillStyle = o.runnerColor || C.lime; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------------- 배경 / 공통 ---------------- */
function bgFill(col = C.bg, glow = 0, gx = 540, gy = 500, gc = '212,255,58') {
  ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
  if (glow > 0) { const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 900); g.addColorStop(0, `rgba(${gc},${glow})`); g.addColorStop(1, `rgba(${gc},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
function speedLines(t, alpha, n = 40, col = C.white) {
  if (alpha <= 0) return; ctx.save();
  for (let i = 0; i < n; i++) {
    const y = rnd(i * 3.3) * H, sp = 1800 + rnd(i) * 2600, len = 120 + rnd(i * 7) * 420;
    const x = W + 600 - ((t * sp + rnd(i * 9) * 4000) % (W + 1200));
    ctx.globalAlpha = alpha * (.12 + rnd(i * 5) * .35); ctx.fillStyle = i % 7 === 0 ? C.lime : col;
    ctx.fillRect(x, y, len, i % 7 === 0 ? 3 : 1.5);
  }
  ctx.restore();
}
function sectionLabel(s, num, t0, t, col = C.lime) {
  const u = E.outX(P(t, t0, t0 + .3));
  line(72, 168, 72 + 44 * u, 168, 1, { color: col, w: 4 });
  maskText(num, 130, 178, { size: 24, fam: MONO, weight: 700, color: col }, 1 - u);
  maskText(s, 130 + measure(num, 24, 700, MONO) + 14, 178, { size: 26, weight: 800, color: C.white }, 1 - E.outX(P(t, t0 + .05, t0 + .35)));
}

/* ================= 커버 (피드 썸네일 겸 0~0.1초) ================= */
function drawCover(t = 0, anim = 1) {
  bgFill(C.bg, .16, 900, 260);
  // 배경 트랙 (오른쪽으로 크게 블리드)
  track({ x: 760, y: 980, s: 9.2, tilt: .58, rot: rad(-18) }, { fill: C.track, infield: C.bg, lineAlpha: 1.4, alpha: .6 });
  const g = ctx.createLinearGradient(0, 600, 0, 1350); g.addColorStop(0, 'rgba(11,13,16,0)'); g.addColorStop(.55, 'rgba(11,13,16,.85)'); g.addColorStop(1, 'rgba(11,13,16,1)');
  ctx.fillStyle = g; ctx.fillRect(0, 600, W, 750);
  const g2 = ctx.createLinearGradient(0, 0, 0, 640); g2.addColorStop(0, 'rgba(11,13,16,.95)'); g2.addColorStop(1, 'rgba(11,13,16,.2)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 640);
  const M = 72;
  // 상단 메타
  txt('2026.11.04  수요일  ·  저녁 트랙', M, 118, { size: 26, weight: 700, color: C.white, alpha: .75 });
  pill(W - M, 108, '5/5 목표 적중', { size: 24, fill: C.lime, align: 'right' });
  // 타이틀
  txt('롱 인터벌 빌드업', M, 250, { size: 54, weight: 900, color: C.lime });
  txt('2KM', M - 4, 500, { size: 260, fam: NUM, weight: 400, color: C.white });
  const w2 = measure('2KM', 260, 400, NUM);
  txt('×5', M + w2 + 18, 500, { size: 260, fam: NUM, weight: 400, color: C.lime });
  txt('+1KM', M - 2, 640, { size: 150, fam: NUM, weight: 400, color: 'rgba(0,0,0,0)', stroke: C.white, sw: 3 });
  txt('세트마다 더 빠르게', M + measure('+1KM', 150, 400, NUM) + 26, 622, { size: 40, weight: 800, color: C.white, alpha: .9 });
  // 페이스 빌드업 바 차트
  const cx0 = M, cy0 = 1010, bw = 118, gap = 30;
  const all = [...REPS.map(r => r.pace), FINAL.pace];
  all.forEach((p, i) => {
    const h = (300 - p) * 4.1; const x = cx0 + i * (bw + gap);
    const last = i === all.length - 1;
    ctx.save(); ctx.globalAlpha = last ? 1 : .2 + i * .15;
    rrect(x, cy0 - h, bw, h, 10); ctx.fillStyle = last ? C.lime : C.white; ctx.fill(); ctx.restore();
    txt(fmtPace(p), x + bw / 2, cy0 - h - 16, { size: 40, fam: NUM, weight: 400, color: last ? C.lime : C.white, align: 'center' });
    txt(last ? '라스트' : `${i + 1}세트`, x + bw / 2, cy0 + 40, { size: 22, weight: 700, color: C.white, align: 'center', alpha: .6 });
  });
  txt('/km', cx0 + 6 * (bw + gap) - gap + 4, cy0 - (300 - FINAL.pace) * 4.1 + 24, { size: 22, weight: 700, color: C.lime, alpha: 0 });
  // 하단 스탯
  line(M, 1118, W - M, 1118, 1, { color: C.white, w: 1.5, alpha: .2 });
  const stats = [['13.12', 'km', '거리'], ['57:05', '', '운동 시간'], ['4:21', '/km', '평균 페이스'], ['154', 'bpm', '평균 심박']];
  const cw = (W - 2 * M) / 4;
  stats.forEach(([v, u, l], i) => {
    const x = M + i * cw;
    txt(v, x, 1222, { size: 78, fam: NUM, weight: 400, color: C.white });
    if (u) txt(u, x + measure(v, 78, 400, NUM) + 6, 1222, { size: 22, weight: 800, color: C.lime });
    txt(l, x, 1264, { size: 22, weight: 700, color: C.white, alpha: .55 });
  });
}

/* ================= 장면들 ================= */
// S1: 인트로 (0.1 ~ 마디2 끝)
function sIntro(t) {
  bgFill(C.bg, .06 + .08 * pulse(t, 6, 0, 11));
  // 배경 트랙 서서히 그려짐
  const tr = E.ioC(P(t, .3, b(8)));
  const zoomOut = E.ioQ(P(t, b(8), b(10)));
  track({ x: 540, y: lerp(980, 930, zoomOut), s: lerp(4.6, 5.6, zoomOut), tilt: lerp(.42, .62, zoomOut), rot: rad(lerp(-8, 0, zoomOut)) },
    { fill: t > b(8) ? C.track : null, infield: C.bg, draw: tr, alpha: lerp(.5, 1, zoomOut), runner: t > b(9) ? (t - b(9)) * 260 : null, trail: 120 });
  // 0.1~B0: 날짜 타이핑
  const s0 = '2026.11.04  수요일  19:58';
  const n = Math.floor(clamp((t - .25) / .9) * [...s0].length);
  if (t < b(4)) {
    const a = 1 - P(t, b(4) - .15, b(4));
    txt([...s0].slice(0, n).join(''), 72, 178, { size: 28, fam: MONO, weight: 700, color: C.lime, alpha: a });
    if (Math.floor(t * 4) % 2 === 0 && n < [...s0].length) txt('▍', 72 + measure([...s0].slice(0, n).join(''), 28, 700, MONO), 178, { size: 28, fam: MONO, color: C.lime });
  }
  // 마디0: 오늘의 / 훈련
  if (t >= b(0) && t < b(4) + .3) {
    const out = E.inC(P(t, b(4) - .12, b(4) + .06));
    maskText('오늘의', 72, 520, { size: 120, weight: 900, color: C.white }, (1 - E.outX(P(t, b(0), b(0) + .3))) - out);
    maskText('훈련', 66, 760, { size: 250, weight: 900, color: C.lime }, (1 - E.outX(P(t, b(1), b(1) + .3))) - out);
    const pu = E.outB(P(t, b(2), b(2) + .25)), pu2 = E.outB(P(t, b(3), b(3) + .25));
    if (pu > 0 && out < .5) pill(72, 850, '400m 트랙', { size: 30, color: C.white, scale: pu });
    if (pu2 > 0 && out < .5) pill(72 + measure('400m 트랙', 30, 800) + 39 + 18, 850, '저녁 7시 58분', { size: 30, fill: C.lime, scale: pu2 });
  }
  // 마디1: 2KM ×5 +1KM
  if (t >= b(4) && t < b(8) + .6) {
    const up = E.ioQ(P(t, b(8), b(8) + .5));
    ctx.save(); ctx.translate(72, lerp(0, -230, up)); ctx.scale(lerp(1, .62, up), lerp(1, .62, up)); ctx.translate(-72, 0);
    const s1 = lerp(1.7, 1, E.outX(P(t, b(4), b(4) + .25)));
    ctx.save(); ctx.translate(72, 600); ctx.scale(s1, s1); ctx.globalAlpha = P(t, b(4), b(4) + .05);
    txt('2KM', -4, 0, { size: 300, fam: NUM, weight: 400 }); ctx.restore();
    const w = measure('2KM', 300, 400, NUM);
    const s2 = lerp(1.7, 1, E.outX(P(t, b(5), b(5) + .25)));
    ctx.save(); ctx.translate(72 + w + 20, 600); ctx.scale(s2, s2); ctx.globalAlpha = P(t, b(5), b(5) + .05);
    txt('×5', 0, 0, { size: 300, fam: NUM, weight: 400, color: C.lime }); ctx.restore();
    maskText('+1KM', 70, 790, { size: 180, fam: NUM, weight: 400, color: C.white }, 1 - E.outX(P(t, b(6), b(6) + .3)));
    maskText('롱 인터벌', 72 + measure('+1KM', 180, 400, NUM) + 30, 770, { size: 62, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(7), b(7) + .3)));
    ctx.restore();
  }
  // 마디2: 빌드업 설명
  if (t >= b(9)) {
    const out = E.inC(P(t, b(12) - .15, b(12)));
    maskText('빌드업', 72, 560, { size: 120, weight: 900, color: C.white }, (1 - E.outX(P(t, b(9), b(9) + .3))) - out);
    maskText('세트마다 페이스를 끌어올린다', 72, 640, { size: 44, weight: 700, color: C.white, alpha: .8 }, (1 - E.outX(P(t, b(10), b(10) + .3))) - out);
    // 가속 화살표
    const au = E.outX(P(t, b(11), b(11) + .35));
    for (let k = 0; k < 3; k++) {
      const x = 72 + k * 70 + au * 40;
      ctx.save(); ctx.globalAlpha = au * (1 - out) * (.35 + k * .3); ctx.strokeStyle = C.lime; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x, 690); ctx.lineTo(x + 34, 726); ctx.lineTo(x, 762); ctx.stroke(); ctx.restore();
    }
  }
}

// S2: 요약 스탯 4종 (마디 3~6)
const STATS = [
  { label: '총 거리', val: v => v.toFixed(2), to: 13.12, unit: 'km', sub: '400m 트랙 약 33바퀴' },
  { label: '운동 시간', val: v => { const s = Math.round(v); return `${Math.floor(s / 60)}:${pad2(s % 60)}`; }, to: 3425, unit: '', sub: '총 경과 59:53 · 기온 18°C' },
  { label: '평균 페이스', val: v => fmtPace(v), to: 261.1, from: 420, unit: '/km', sub: '회복 조깅 구간 포함' },
  { label: '평균 심박', val: v => String(Math.round(v)), to: 154, unit: 'bpm', sub: '최대 177 bpm' },
];
function sStats(t) {
  const k = clamp(Math.floor((lastBeat(t) - 12) / 4), 0, 3);
  const t0 = b(12 + k * 4), bt = i => b(12 + k * 4 + i);
  bgFill(C.bg, .05 + .1 * pulse(t, 7));
  // 배경 비주얼
  const bgIn = E.outX(P(t, t0, t0 + .4));
  if (k === 0) {
    track({ x: 540, y: 1030, s: 5.6, tilt: .62, rot: 0 }, { fill: C.track, infield: C.bg, runner: (t - b(9)) * 260, trail: 120 });
    const laps = Math.floor(33 * E.outC(P(t, bt(0), bt(2))));
    txt(`${pad2(laps)} / 33 바퀴`, 540, 1030, { size: 30, fam: MONO, weight: 700, color: C.lime, align: 'center', alpha: bgIn });
  } else if (k === 1) {
    const u = E.outC(P(t, bt(0), bt(3)));
    ctx.save(); ctx.translate(540, 1020);
    circle(0, 0, 200, { stroke: C.line, w: 22 });
    circle(0, 0, 200, { stroke: C.lime, w: 22, a0: -Math.PI / 2, a1: -Math.PI / 2 + Math.PI * 2 * u * (3425 / 3593), cap: 'round' });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; line(Math.cos(a) * 160, Math.sin(a) * 160, Math.cos(a) * (i % 5 ? 150 : 138), Math.sin(a) * (i % 5 ? 150 : 138), 1, { color: C.white, w: i % 5 ? 1.5 : 3, alpha: .5 * bgIn }); }
    ctx.rotate(-Math.PI / 2 + Math.PI * 2 * ((t - bt(0)) * .5 % 1)); line(0, 0, 120, 0, 1, { color: C.white, w: 4, cap: 'round' }); ctx.restore();
    circle(540, 1020, 9, { fill: C.lime });
  } else if (k === 2) {
    speedLines(t, bgIn * .8, 50);
  } else {
    // 심전도
    ctx.save(); ctx.strokeStyle = C.coral; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.globalAlpha = bgIn;
    ctx.shadowColor = C.coral; ctx.shadowBlur = 16; ctx.beginPath();
    const scroll = (t - t0) * 520;
    for (let x = 0; x <= W; x += 4) {
      const ph = ((x + scroll) % 260) / 260; let y = 0;
      if (ph > .40 && ph < .44) y = -(ph - .40) / .04 * 40; else if (ph >= .44 && ph < .48) y = -40 + (ph - .44) / .04 * 200; else if (ph >= .48 && ph < .53) y = 160 - (ph - .48) / .05 * 230; else if (ph >= .53 && ph < .56) y = -70 + (ph - .53) / .03 * 70;
      y *= .9 * (1 + pulse(t, 6) * .3);
      if (x === 0) ctx.moveTo(x, 1030 + y); else ctx.lineTo(x, 1030 + y);
    }
    ctx.stroke(); ctx.restore();
    const hs = 1 + .35 * pulse(t, 8);
    heart(540, 1250, 56 * hs, C.coral);
  }
  // 전경: 숫자
  const s = STATS[k];
  sectionLabel('요약', `0${k + 1}`, t0, t);
  txt(`${k + 1} / 4`, W - 72, 178, { size: 24, fam: MONO, weight: 700, color: C.white, align: 'right', alpha: .5 });
  maskText(s.label, 72, 360, { size: 64, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  const cu = E.outQ(P(t, t0 + .05, bt(2)));
  const v = lerp(s.from || 0, s.to, cu);
  const sl = (1 - E.outX(P(t, t0, t0 + .3)));
  ctx.save(); ctx.translate(sl * 240, 0); ctx.globalAlpha = 1 - sl;
  const vs = s.val(v);
  const sz = vs.length > 4 ? 300 : 340;
  txt(vs, 66, 680, { size: sz, fam: NUM, weight: 400, color: k === 3 ? C.white : C.white });
  if (s.unit) maskText(s.unit, 72 + measure(vs, sz, 400, NUM) + 18, 680, { size: 70, weight: 900, color: k === 3 ? C.coral : C.lime }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
  ctx.restore();
  maskText(s.sub, 72, 770, { size: 40, weight: 700, color: C.white, alpha: .7 }, 1 - E.outX(P(t, bt(2), bt(2) + .3)));
  // 비트마다 강조 라인
  line(72, 810, 72 + (W - 144) * E.outX(P(t, bt(1), bt(3))), 810, 1, { color: k === 3 ? C.coral : C.lime, w: 4 });
  // 다음 스탯으로 푸시 아웃
  const ou = E.inC(P(t, bt(4) - .14, bt(4)));
  if (ou > 0 && k < 3) { ctx.fillStyle = k % 2 ? C.lime : C.white; ctx.fillRect(W - W * ou, 0, W * ou, H); }
}

// S3: 5세트 (마디 7~11) — 메인 하이라이트
function sReps(t) {
  const k = clamp(Math.floor((lastBeat(t) - 28) / 4), 0, 4);
  const t0 = b(28 + k * 4), bt = i => b(28 + k * 4 + i);
  const r = REPS[k];
  bgFill(C.bg, .1 + .14 * pulse(t, 7), 540, 560);
  speedLines(t, .25 + k * .1, 30 + k * 8);
  // 엔트리 플래시 (첫 세트)
  if (k === 0) { const f = 1 - P(t, t0, t0 + .25); if (f > 0) { ctx.fillStyle = `rgba(212,255,58,${f * .9})`; ctx.fillRect(0, 0, W, H); } }
  sectionLabel('인터벌 세트', `0${k + 1}`, t0, t);
  txt('2KM', W - 72, 182, { size: 52, fam: NUM, weight: 400, color: C.lime, align: 'right' });
  // 세트 번호 롤
  const setU = P(t, t0, t0 + .3);
  rollText(k === 0 ? '0' : String(k), String(k + 1), 72, 400, { size: 170, fam: NUM, color: 'rgba(0,0,0,0)' }, 0);
  ctx.save(); font(170, 400, NUM); ctx.lineWidth = 3; ctx.strokeStyle = C.white; ctx.globalAlpha = .9;
  const off = (1 - E.outX(setU)) * 60; ctx.globalAlpha *= 1 - (1 - setU) * .8; ctx.strokeText(String(k + 1), 66 + off, 400); ctx.restore();
  txt('세트', 72 + measure(String(k + 1), 170, 400, NUM) + 16, 396, { size: 48, weight: 900, color: C.white, alpha: setU });
  // 페이스 숫자 (슬롯 롤)
  const prev = k === 0 ? '0:00' : fmtPace(REPS[k - 1].pace);
  const pw = rollText(prev, fmtPace(r.pace), 64, 700, { size: 330, fam: NUM, color: C.white, colorFn: () => C.white }, P(t, t0 + .02, t0 + .42));
  maskText('/km', 72 + pw + 14, 700, { size: 64, weight: 900, color: C.lime }, 1 - E.outX(P(t, t0 + .1, t0 + .35)));
  if (k > 0) {
    const dd = Math.round(REPS[k - 1].pace) - Math.round(r.pace);
    pill(W - 72, 470, `▼ ${dd}초 단축`, { size: 30, fill: C.lime, align: 'right', scale: E.outB(P(t, bt(1), bt(1) + .25)) });
  }
  // 목표 범위 게이지 (3:30 ~ 4:20)
  const gx = 72, gy = 800, gw = W - 144, lo = 210, hi = 260;
  const X = p => gx + gw * (hi - p) / (hi - lo); // 빠를수록 오른쪽
  const gu = E.outX(P(t, bt(0), bt(1)));
  ctx.save(); ctx.globalAlpha = gu;
  rrect(gx, gy - 10, gw, 20, 10); ctx.fillStyle = C.bg3; ctx.fill();
  rrect(X(r.hi), gy - 10, X(r.lo) - X(r.hi), 20, 10); ctx.fillStyle = 'rgba(212,255,58,.35)'; ctx.fill();
  ctx.restore();
  for (let p = 215; p <= 255; p += 10) txt(fmtPace(p), X(p), gy + 52, { size: 22, fam: MONO, weight: 600, color: C.white, align: 'center', alpha: .45 * gu });
  const mk = X(lerp(lo + 45, r.pace, spring(t - bt(1), 2, 6)));
  if (t > bt(1)) {
    circle(mk, gy, 20, { fill: C.lime }); circle(mk, gy, 30 + 30 * P(t, bt(1), bt(1) + .4), { stroke: C.lime, w: 3, alpha: 1 - P(t, bt(1), bt(1) + .4) });
    maskText(`목표 ${fmtPace(r.lo)}–${fmtPace(r.hi)}`, gx, gy - 40, { size: 30, weight: 800, color: C.white, alpha: .8 }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    const cs = E.outB(P(t, bt(1) + .1, bt(1) + .35));
    if (cs > 0) { circle(W - 92, gy - 52, 20 * cs, { fill: C.lime }); check(W - 92, gy - 52, 20 * cs, P(t, bt(1) + .15, bt(1) + .4)); txt('적중', W - 124, gy - 41, { size: 30, weight: 900, color: C.lime, align: 'right', alpha: cs }); }
  }
  // 심박 · 파워 (beat 2)
  const hu = E.outX(P(t, bt(2), bt(2) + .3));
  if (hu > 0) {
    heart(92, 935, 40 * (1 + .25 * pulse(t, 8)), C.coral);
    maskText(String(Math.round(r.hr)), 124, 952, { size: 64, fam: NUM, weight: 400, color: C.white }, 1 - hu);
    maskText('bpm', 124 + measure(String(Math.round(r.hr)), 64, 400, NUM) + 8, 950, { size: 26, weight: 800, color: C.coral }, 1 - hu);
    const px = 420;
    maskText('⚡', px, 948, { size: 40, weight: 900, color: C.lime }, 1 - hu);
    maskText(String(Math.round(r.pw)), px + 52, 952, { size: 64, fam: NUM, weight: 400, color: C.white }, 1 - hu);
    maskText('W', px + 52 + measure(String(Math.round(r.pw)), 64, 400, NUM) + 8, 950, { size: 26, weight: 800, color: C.lime }, 1 - hu);
  }
  // 하단 누적 바 차트
  const cy0 = 1190, bw = 150, gap = 33, x0 = 72;
  for (let i = 0; i <= k; i++) {
    const gi = i === k ? E.outB(P(t, t0, t0 + .35)) : 1;
    const h = (262 - REPS[i].pace) * 6.2 * gi;
    const x = x0 + i * (bw + gap);
    ctx.save(); ctx.globalAlpha = i === k ? 1 : .32; rrect(x, cy0 - h, bw, Math.max(h, 1), 10); ctx.fillStyle = i === k ? C.lime : C.white; ctx.fill(); ctx.restore();
    txt(fmtPace(REPS[i].pace), x + bw / 2, cy0 - h - 14, { size: 34, fam: NUM, weight: 400, color: i === k ? C.lime : C.white, align: 'center', alpha: i === k ? gi : .5 });
  }
  for (let i = 0; i < 5; i++) txt(`${i + 1}세트`, x0 + i * (bw + gap) + bw / 2, cy0 + 36, { size: 22, weight: 700, color: C.white, align: 'center', alpha: i <= k ? .6 : .2 });
  line(x0, cy0 + 1, W - 72, cy0 + 1, 1, { color: C.white, w: 1.5, alpha: .25 });
  // 전환: 다음 세트로 수직 와이프
  const ou = E.inC(P(t, bt(4) - .12, bt(4)));
  if (ou > 0 && k < 4) { ctx.save(); ctx.globalAlpha = .9; ctx.fillStyle = C.lime; ctx.fillRect(0, H * (1 - ou), W, 14); ctx.restore(); }
}

// S4-A: 전체 세션 그래프 (마디 12~13)
function sChart(t) {
  const t0 = b(48);
  bgFill(C.bg, .06 + .08 * pulse(t, 7));
  sectionLabel('전체 세션 흐름', '06', t0, t);
  maskText('페이스 &', 72, 300, { size: 76, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  maskText('심박 그래프', 72, 394, { size: 76, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(49), b(49) + .3)));
  const gx = 72, gy = 500, gw = W - 144, gh = 560;
  const T = 3593;
  const X = s => gx + gw * s / T;
  const Ys = v => gy + gh - gh * clamp((v - 2.2) / (5.0 - 2.2)); // 속도
  const Yh = v => gy + gh - gh * clamp((v - 90) / (190 - 90));
  const du = E.ioC(P(t, b(49), b(55)));
  // 세트 구간 음영 (비트마다 하나씩)
  const repT = []; let acc = 0; // 랩 기반 세트 시작/끝 (초)
  const lapT = [244.3, 246.0, 195.2, 241.2, 238.4, 181.4, 234.4, 233.1, 207.8, 230.3, 231.1, 212.8, 227.5, 223.9, 170.4, 106.1, 1.2];
  const isAct = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1];
  let st = 0; let cur = null;
  lapT.forEach((d, i) => { if (isAct[i]) { if (!cur) cur = [st, 0]; cur[1] = st + d; } else if (cur) { repT.push(cur); cur = null; } st += d; });
  if (cur) repT.push(cur);
  // 일시정지 보정: 타이머 3425 vs 경과 3593 → 비율로 스케일
  const sc = T / st;
  repT.forEach(([a, c], i) => {
    const u = E.outX(P(t, b(50 + i), b(50 + i) + .3)); if (u <= 0) return;
    ctx.save(); ctx.globalAlpha = .13 * u; ctx.fillStyle = C.lime; ctx.fillRect(X(a * sc), gy + gh * (1 - u), X(c * sc) - X(a * sc), gh * u); ctx.restore();
    txt(i < 5 ? `${i + 1}` : 'L', (X(a * sc) + X(c * sc)) / 2, gy + gh + 40, { size: 26, fam: NUM, weight: 400, color: C.lime, align: 'center', alpha: u });
  });
  // 가이드 라인
  for (const [p, l] of [[240, '4:00'], [300, '5:00'], [360, '6:00']]) {
    const y = Ys(1000 / p); line(gx, y, gx + gw, y, 1, { color: C.white, w: 1, alpha: .15, dash: [6, 8] });
    txt(l, gx + gw, y - 8, { size: 20, fam: MONO, weight: 600, color: C.white, align: 'right', alpha: .4 });
  }
  // 라인
  const n = Math.floor(SERIES.length * du);
  if (n > 1) {
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i < n; i++) { const p = SERIES[i]; const x = X(p[0]), y = Yh(p[2]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = C.coral; ctx.lineWidth = 3; ctx.globalAlpha = .85; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < n; i++) { const p = SERIES[i]; const x = X(p[0]), y = Ys(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.globalAlpha = 1; ctx.strokeStyle = C.lime; ctx.lineWidth = 5; ctx.shadowColor = C.lime; ctx.shadowBlur = 14; ctx.stroke();
    ctx.restore();
    const p = SERIES[n - 1]; const hx = X(p[0]);
    line(hx, gy - 10, hx, gy + gh, 1, { color: C.white, w: 1.5, alpha: .5 });
    circle(hx, Ys(p[1]), 9, { fill: C.lime }); circle(hx, Yh(p[2]), 7, { fill: C.coral });
    const km = (p[3] / 1000).toFixed(2);
    txt(`${km} km`, Math.min(hx + 14, gx + gw - 150), gy + 20, { size: 26, fam: MONO, weight: 700, color: C.white });
  }
  // 범례
  const lu = P(t, b(52), b(52) + .2);
  line(72, 1190, 112, 1190, 1, { color: C.lime, w: 5, alpha: lu }); txt('페이스', 124, 1199, { size: 26, weight: 800, alpha: lu });
  line(260, 1190, 300, 1190, 1, { color: C.coral, w: 4, alpha: lu }); txt('심박', 312, 1199, { size: 26, weight: 800, alpha: lu });
  txt('초록 구간 = 2km 세트', W - 72, 1199, { size: 24, weight: 700, color: C.lime, align: 'right', alpha: lu * .8 });
}

// S4-B: 라스트 스퍼트 (마디 14~15)
function sFinal(t) {
  const t0 = b(56);
  const z = E.inX(P(t, b(63) - .05, b(64)));
  bgFill(C.bg, .2 + .2 * pulse(t, 6), 540, 640);
  speedLines(t, 1, 80);
  ctx.save(); ctx.translate(540, 640); ctx.scale(1 + z * 3, 1 + z * 3); ctx.translate(-540, -640);
  sectionLabel('마지막 1km 스텝', '07', t0, t);
  maskText('라스트', 72, 330, { size: 110, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  maskText('스퍼트', 72, 460, { size: 110, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(57), b(57) + .3)));
  // 큰 숫자 + 잔상
  const su = E.outX(P(t, b(58), b(58) + .3));
  if (su > 0) {
    const sc = lerp(1.5, 1, su);
    for (let e = 3; e >= 0; e--) {
      ctx.save(); ctx.translate(72 - e * 34 * (1 - su * .4), 820); ctx.scale(sc, sc);
      txt('3:27', 0, 0, { size: 330, fam: NUM, weight: 400, color: e ? C.lime : C.white, alpha: e ? (.16 / e) * su : su }); ctx.restore();
    }
    maskText('/km', 72 + measure('3:27', 330, 400, NUM) + 14, 820, { size: 64, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(59), b(59) + .3)));
  }
  maskText('목표 3:35보다 8초 더 빠르게', 72, 910, { size: 42, weight: 800, color: C.white }, 1 - E.outX(P(t, b(60), b(60) + .3)));
  const pu = E.outB(P(t, b(61), b(61) + .25));
  if (pu > 0) { pill(72, 1010, '마지막 518m', { size: 32, color: C.white, scale: pu }); pill(72 + measure('마지막 518m', 32, 800) + 42 + 20, 1010, '최고 속도 18.0 km/h', { size: 32, fill: C.lime, scale: E.outB(P(t, b(62), b(62) + .25)) }); }
  ctx.restore();
  if (z > 0) { ctx.fillStyle = `rgba(8,21,33,${z})`; ctx.fillRect(0, 0, W, H); }
}

// S5: 브레이크 — 회복 조깅 (마디 16~17)
function sRecovery(t) {
  const t0 = b(64);
  bgFill(C.deep, .12, 540, 980, '92,200,255');
  // 호흡 원
  const br = (Math.sin((t - t0) * Math.PI * 2 / 3.9 - Math.PI / 2) + 1) / 2;
  for (let i = 0; i < 4; i++) circle(540, 980, 170 + i * 70 + br * 50, { stroke: C.sky, w: 2, alpha: (.4 - i * .09) * P(t, t0, t0 + .6) });
  circle(540, 980, 120 + br * 30, { fill: 'rgba(92,200,255,.12)' });
  txt('숨 고르기', 540, 990, { size: 34, weight: 800, color: C.sky, align: 'center', alpha: P(t, t0 + .2, t0 + .8) });
  sectionLabel('회복 조깅', '08', t0, t, C.sky);
  maskText('쉬는 구간까지', 72, 320, { size: 84, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .45)));
  maskText('계획대로.', 72, 424, { size: 84, weight: 900, color: C.sky }, 1 - E.outX(P(t, b(65), b(65) + .45)));
  RECS.forEach((p, i) => {
    const u = E.outX(P(t, b(66 + i), b(66 + i) + .4)); if (u <= 0) return;
    const x = 72 + i * 190, y = 560;
    ctx.save(); ctx.globalAlpha = u; ctx.translate(0, (1 - u) * 30);
    rrect(x, y - 50, 172, 100, 18); ctx.strokeStyle = 'rgba(92,200,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
    txt(fmtPace(p), x + 86, y + 14, { size: 48, fam: NUM, weight: 400, color: C.white, align: 'center' });
    txt(`회복 ${i + 1}`, x + 86, y + 84, { size: 20, weight: 700, color: C.sky, align: 'center' });
    ctx.restore();
  });
  const au = E.outX(P(t, b(71), b(71) + .4));
  maskText('평균 6:12/km · 평균 심박 138 bpm', 72, 720, { size: 36, weight: 800, color: C.white, alpha: .85 }, 1 - au);
  const ou = P(t, b(72) - .2, b(72)); if (ou > 0) { ctx.fillStyle = `rgba(11,13,16,${ou})`; ctx.fillRect(0, 0, W, H); }
}

// S6: 러닝 다이내믹스 & 훈련 효과 (마디 18~23)
function sDynamics(t) {
  const k = clamp(Math.floor((lastBeat(t) - 72) / 4), 0, 5);
  const t0 = b(72 + k * 4), bt = i => b(72 + k * 4 + i);
  bgFill(C.bg, .1 + .14 * pulse(t, 7), 540, 760);
  const enter = 1 - E.outX(P(t, t0, t0 + .3));
  if (k < 4) sectionLabel(['케이던스', '보폭 · 지면 접촉', '러닝 파워', '훈련 효과'][k], `0${9 + k > 9 ? '' : ''}${9 + k}`.slice(-2), t0, t);
  if (k === 0) {
    maskText('케이던스', 72, 340, { size: 76, weight: 900, color: C.white }, enter);
    const v = Math.round(lerp(150, 186, E.outQ(P(t, t0, bt(2)))));
    txt(String(v), 66, 680, { size: 360, fam: NUM, weight: 400, color: C.white });
    maskText('spm', 72 + measure(String(v), 360, 400, NUM) + 16, 680, { size: 70, weight: 900, color: C.lime }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    maskText('1분에 186걸음 · 1초에 약 3걸음', 72, 770, { size: 40, weight: 700, color: C.white, alpha: .75 }, 1 - E.outX(P(t, bt(2), bt(2) + .3)));
    // 발자국 메트로놈 (186spm)
    const steps = Math.floor((t - t0) * 3.1);
    for (let i = 0; i < 10; i++) {
      const sIdx = steps - i; if (sIdx < 0) continue;
      const x = 900 - i * 86, y = 1080 + (sIdx % 2 ? -40 : 40);
      ctx.save(); ctx.globalAlpha = (1 - i / 10) * .9; ctx.fillStyle = i === 0 ? C.lime : C.white;
      ctx.beginPath(); ctx.ellipse(x, y, 30, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x - 42, y, 13, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  } else if (k === 1) {
    const u1 = E.outQ(P(t, t0, bt(2))), u2 = E.outQ(P(t, bt(1), bt(3)));
    maskText('보폭', 72, 340, { size: 64, weight: 900, color: C.white }, enter);
    txt((1.21 * u1).toFixed(2), 66, 600, { size: 260, fam: NUM, weight: 400 });
    maskText('m', 72 + measure((1.21 * u1).toFixed(2), 260, 400, NUM) + 12, 600, { size: 64, weight: 900, color: C.lime }, enter);
    // 보폭 다이어그램
    const sx = 72, sy = 690, sw = (W - 144) * u1;
    line(sx, sy, sx + sw, sy, 1, { color: C.lime, w: 4 }); line(sx, sy - 16, sx, sy + 16, 1, { color: C.lime, w: 4 }); line(sx + sw, sy - 16, sx + sw, sy + 16, 1, { color: C.lime, w: 4 });
    maskText('지면 접촉 시간', 72, 880, { size: 52, weight: 900, color: C.white }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    txt(String(Math.round(218 * u2)), 66, 1110, { size: 220, fam: NUM, weight: 400, alpha: P(t, bt(1), bt(1) + .1) });
    maskText('ms', 72 + measure(String(Math.round(218 * u2)), 220, 400, NUM) + 12, 1110, { size: 60, weight: 900, color: C.lime }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    maskText('수직 진폭 8.3cm · 수직 비율 7.0%', 72, 1190, { size: 34, weight: 700, color: C.white, alpha: .7 }, 1 - E.outX(P(t, bt(2), bt(2) + .3)));
  } else if (k === 2) {
    maskText('평균 러닝 파워', 72, 340, { size: 64, weight: 900, color: C.white }, enter);
    const v = Math.round(348 * E.outQ(P(t, t0, bt(2))));
    txt(String(v), 66, 680, { size: 360, fam: NUM, weight: 400 });
    maskText('W', 72 + measure(String(v), 360, 400, NUM) + 16, 680, { size: 80, weight: 900, color: C.lime }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    // 세트별 파워 미터
    const all = [...REPS.map(r => r.pw), 422];
    all.forEach((p, i) => {
      const u = E.outX(P(t, t0 + i * .12, t0 + i * .12 + .45));
      const y = 800 + i * 70, w = (W - 300) * (p - 300) / 140 * u;
      rrect(72, y, Math.max(w, 1), 40, 8); ctx.fillStyle = i === 5 ? C.lime : `rgba(243,242,236,${.25 + i * .1})`; ctx.fill();
      txt(i === 5 ? '라스트' : `${i + 1}세트`, 72 + w + 16, y + 30, { size: 24, weight: 800, color: i === 5 ? C.lime : C.white, alpha: u });
      txt(`${Math.round(p)}W`, W - 72, y + 30, { size: 26, fam: NUM, weight: 400, color: C.white, align: 'right', alpha: u * .8 });
    });
  } else if (k === 3) {
    maskText('훈련 효과', 72, 340, { size: 76, weight: 900, color: C.white }, enter);
    const g = (cx, v, max, label, col, u) => {
      const cy = 720;
      circle(cx, cy, 170, { stroke: C.bg3, w: 30, a0: rad(135), a1: rad(405) });
      circle(cx, cy, 170, { stroke: col, w: 30, a0: rad(135), a1: rad(135) + rad(270) * (v / max) * u, cap: 'round' });
      txt((v * u).toFixed(1), cx, cy + 50, { size: 150, fam: NUM, weight: 400, color: C.white, align: 'center' });
      txt(label, cx, cy + 130, { size: 32, weight: 800, color: col, align: 'center' });
    };
    g(300, 4.3, 5, '유산소', C.lime, E.outQ(P(t, t0, bt(2))));
    g(780, 1.2, 5, '무산소', C.sky, E.outQ(P(t, bt(1), bt(3))));
    maskText('유산소 능력 크게 향상', 540, 1030, { size: 50, weight: 900, color: C.lime, align: 'center' }, 1 - E.outX(P(t, bt(2), bt(2) + .3)));
    maskText('젖산역치 부근을 오래 버틴 고효율 세션', 540, 1100, { size: 34, weight: 700, color: C.white, alpha: .7, align: 'center' }, 1 - E.outX(P(t, bt(3), bt(3) + .3)));
  } else if (k === 4) {
    // 5/5 적중
    const fl = 1 - P(t, t0, t0 + .2); if (fl > 0) { ctx.fillStyle = `rgba(212,255,58,${fl})`; ctx.fillRect(0, 0, W, H); }
    sectionLabel('결과', '13', t0, t);
    const sc = lerp(1.6, 1, E.outX(P(t, t0, t0 + .3)));
    ctx.save(); ctx.translate(540, 640); ctx.scale(sc, sc);
    txt('5/5', 0, 0, { size: 440, fam: NUM, weight: 400, color: C.lime, align: 'center' }); ctx.restore();
    maskText('모든 세트 목표 페이스 적중', 540, 760, { size: 56, weight: 900, color: C.white, align: 'center' }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    for (let i = 0; i < 5; i++) {
      const tt = t0 + i * (bt(3) - t0) / 4; const u = E.outB(P(t, tt, tt + .25));
      const x = 540 + (i - 2) * 150, y = 920;
      circle(x, y, 52 * u, { fill: C.lime }); check(x, y, 52 * u, P(t, tt + .05, tt + .3));
      txt(fmtPace(REPS[i].pace), x, y + 104, { size: 36, fam: NUM, weight: 400, color: C.white, align: 'center', alpha: u });
    }
  } else {
    // 칼로리 & 마무리 스탯
    sectionLabel('마무리', '14', t0, t);
    const items = [['809', 'kcal', '소모 칼로리'], ['364', 'W', '노멀라이즈드 파워'], ['177', 'bpm', '최대 심박'], ['18', '°C', '평균 기온']];
    items.forEach(([v, u_, l], i) => {
      const u = E.outX(P(t, b(92 + i), b(92 + i) + .3));
      const x = 72 + (i % 2) * 480, y = 520 + Math.floor(i / 2) * 330;
      maskText(v, x - 4, y, { size: 200, fam: NUM, weight: 400, color: C.white }, 1 - u);
      maskText(u_, x + measure(v, 200, 400, NUM) + 10, y, { size: 48, weight: 900, color: i === 2 ? C.coral : C.lime }, 1 - u);
      maskText(l, x, y + 64, { size: 32, weight: 700, color: C.white, alpha: .65 }, 1 - u);
    });
    const ou = E.inC(P(t, b(96) - .25, b(96))); // 브레이크 직전 와이프
    if (ou > 0) { ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W * ou, H); }
  }
}

// S7: 아웃트로 → 엔드카드(커버 재등장, 루프)
function sOutro(t) {
  const t0 = b(96);
  const endT = b(106); // 52.876 마지막 히트
  if (t < endT) {
    bgFill(C.bg, .1, 540, 900);
    const wl = 1 - E.outX(P(t, t0, t0 + .35)); if (wl > 0) { ctx.fillStyle = C.lime; ctx.fillRect(W * (1 - wl), 0, W * wl, H); }
    // 러너가 한 바퀴 마무리
    const ru = E.ioC(P(t, t0, endT - .2));
    track({ x: 540, y: 960, s: lerp(6.4, 5.6, ru), tilt: lerp(.42, .62, ru), rot: rad(lerp(8, 0, ru)) }, { fill: C.track, infield: C.bg, runner: lerp(0, 400, ru) + 0.01, trail: 200 });
    maskText('어제보다', 72, 380, { size: 110, weight: 900, color: C.white }, 1 - E.outX(P(t, b(97), b(97) + .4)));
    maskText('한 바퀴 더.', 72, 510, { size: 110, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(99), b(99) + .4)));
    maskText('13.12km · 57:05 · 2km×5 + 1km', 72, 600, { size: 36, weight: 700, color: C.white, alpha: .7 }, 1 - E.outX(P(t, b(101), b(101) + .4)));
    const fo = P(t, endT - .12, endT); if (fo > 0) { ctx.fillStyle = `rgba(212,255,58,${fo})`; ctx.fillRect(0, 0, W, H); }
  } else {
    const u = P(t, endT, endT + .5);
    drawCover(t - endT);
    const f = 1 - E.outC(P(t, endT, endT + .3)); if (f > 0) { ctx.fillStyle = `rgba(212,255,58,${f})`; ctx.fillRect(0, 0, W, H); }
  }
}

/* ---------------- 상시 HUD ---------------- */
const SECS = [[0, '인트로'], [7.454, '요약'], [15.279, '5세트'], [25.054, '그래프'], [28.979, '스퍼트'], [32.879, '회복'], [36.78, '다이내믹스'], [48.484, '아웃트로']];
function hud(t, dark = false) {
  if (t < .25 || t >= b(106)) return;
  const a = P(t, .25, .6);
  const col = dark ? C.bg : C.white;
  ctx.save(); ctx.globalAlpha = a;
  txt('러닝 로그', 72, 92, { size: 22, weight: 800, color: col, alpha: .8 });
  txt('2026.11.04', 72 + measure('러닝 로그', 22, 800) + 14, 92, { size: 22, fam: MONO, weight: 600, color: dark ? C.bg : C.lime });
  // 세션 진행 (영상 진행 → 세션 거리로 매핑)
  const km = (13.12 * clamp((t - .1) / (b(106) - .1))).toFixed(2);
  txt(`${km} km`, W - 72, 92, { size: 22, fam: MONO, weight: 700, color: col, align: 'right', alpha: .8 });
  const bx = 72, by = H - 54, bw = W - 144;
  ctx.globalAlpha = a * .25; ctx.fillStyle = col; ctx.fillRect(bx, by, bw, 3);
  ctx.globalAlpha = a; ctx.fillStyle = dark ? C.bg : C.lime; ctx.fillRect(bx, by - 1, bw * clamp(t / b(106)), 5);
  for (const [s] of SECS) { ctx.globalAlpha = a * .5; ctx.fillStyle = col; ctx.fillRect(bx + bw * s / b(106) - 1, by - 7, 2, 17); }
  let si = 0; SECS.forEach((s, i) => { if (t >= s[0]) si = i; });
  maskText(SECS[si][1], bx, by - 18, { size: 20, weight: 800, color: col, alpha: .8 }, 1 - E.outX(P(t, SECS[si][0], SECS[si][0] + .3)));
  ctx.restore();
}

/* ---------------- 메인 ---------------- */
function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'round';
  if (t < 0.1) { drawCover(0); return; }
  // 비트 킥: 화면 미세 펀치
  const pk = t > b(28) && t < b(96) ? pulse(t, 12) * .012 : t > b(0) && t < b(28) ? pulse(t, 12) * .006 : 0;
  ctx.save(); ctx.translate(540, 675); ctx.scale(1 + pk, 1 + pk); ctx.translate(-540, -675);
  let dark = false;
  if (t < b(12)) {
    sIntro(t);
    if (t < .45) { // 커버에서 인트로로: 커버가 줄어들며 슬랫으로 걷힘
      const u = P(t, .1, .45);
      ctx.save(); ctx.beginPath();
      for (let i = 0; i < 6; i++) { const su = E.inC(clamp(u * 1.4 - i * .08)); const sh = H / 6; ctx.rect(0, i * sh + sh * su, W, sh * (1 - su)); }
      ctx.clip(); ctx.translate(540, 675); ctx.scale(1 - u * .06, 1 - u * .06); ctx.translate(-540, -675); drawCover(t); ctx.restore();
    }
  }
  else if (t < b(28)) sStats(t);
  else if (t < b(48)) sReps(t);
  else if (t < b(56)) sChart(t);
  else if (t < b(64)) sFinal(t);
  else if (t < b(72)) sRecovery(t);
  else if (t < b(96)) { sDynamics(t); const k = Math.floor((lastBeat(t) - 72) / 4); dark = (k === 4 && t < b(88) + .2); }
  else sOutro(t);
  ctx.restore();
  hud(t, dark);
  // 비네트
  const g = ctx.createRadialGradient(540, 675, 420, 540, 675, 980); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 끝 페이드 (루프 위해 아주 짧게)
  const fo = P(t, DUR - .1, DUR); if (fo > 0) { ctx.fillStyle = `rgba(11,13,16,${fo * .0})`; ctx.fillRect(0, 0, W, H); }
}

/* ---------------- 부트 ---------------- */
window.ready = (async () => {
  const base = 'node_modules/pretendard/dist/public/static/';
  await Promise.all([[900, 'Black'], [800, 'ExtraBold'], [700, 'Bold'], [600, 'SemiBold']].map(async ([w, n]) => {
    const ff = new FontFace('Pretendard', `url(${base}Pretendard-${n}.otf)`, { weight: String(w) }); await ff.load(); document.fonts.add(ff);
  }));
  const an = new FontFace('Anton', 'url(node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2)', { weight: '400' }); await an.load(); document.fonts.add(an);
  for (const w of [600, 700]) await document.fonts.load(`${w} 20px "JetBrains Mono"`);
  B = await (await fetch('beats.json')).json();
  const d = await (await fetch('run-data.json')).json(); SERIES = d.series;
  await document.fonts.ready; draw(0); return true;
})();
window.draw = draw; window.DUR = DUR; window.FPS = FPS; window.drawCover = drawCover;
if (!/render/.test(location.search)) {
  document.body.classList.add('preview');
  window.ready.then(() => { const t0 = performance.now(); const loop = now => { draw(((now - t0) / 1000) % DUR); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
}
