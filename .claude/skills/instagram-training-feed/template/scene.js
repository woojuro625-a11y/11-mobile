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
// 심박존 (최대심박 186 기준, Garmin 설정값) · 존별 체류 시간(초) [Z1..Z5]
const ZB = [117, 131, 144, 158, 172, 186];
const ZC = ['#7C8A9C', '#5CC8FF', '#3DDC84', '#FFB020', '#FF5A5F'];
const REPZ = [[27, 17, 384, 62, 0], [3, 23, 100, 353, 0], [0, 14, 57, 397, 0], [0, 6, 34, 421, 1], [0, 12, 24, 276, 140]];
const FINALZ = [0, 6, 13, 74, 13];
const MAINZ = [30, 79, 613, 1583, 154];
const REPMAX = [160, 164, 168, 172, 177];
const REPWIN = [[0, 491], [686, 1166], [1370, 1839], [2055, 2518], [2769, 3222]];
const FINALWIN = [3486, 3593];
const HRREC = [[160, 135], [164, 141], [166, 144], [171, 147]];
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
function fmtPace(s) { const r = Math.round(s); return `${Math.floor(r / 60)}'${pad2(r % 60)}"`; }
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
function drawCover(t = 0) {
  bgFill(C.bg, .16, 900, 260);
  track({ x: 760, y: 980, s: 9.2, tilt: .58, rot: rad(-18) }, { fill: C.track, infield: C.bg, lineAlpha: 1.4, alpha: .6 });
  const g = ctx.createLinearGradient(0, 600, 0, 1350); g.addColorStop(0, 'rgba(11,13,16,0)'); g.addColorStop(.55, 'rgba(11,13,16,.85)'); g.addColorStop(1, 'rgba(11,13,16,1)');
  ctx.fillStyle = g; ctx.fillRect(0, 600, W, 750);
  const g2 = ctx.createLinearGradient(0, 0, 0, 640); g2.addColorStop(0, 'rgba(11,13,16,.95)'); g2.addColorStop(1, 'rgba(11,13,16,.2)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 640);
  const M = 72;
  pin(M + 12, 106, 13, C.lime);
  txt('목동교 멀티스포츠존', M + 36, 118, { size: 30, weight: 800, color: C.white });
  txt('2026.11.04 수요일', M + 36, 158, { size: 24, weight: 700, color: C.white, alpha: .55 });
  pill(W - M, 108, '5/5 목표 적중', { size: 24, fill: C.lime, align: 'right' });
  txt('롱 인터벌 빌드업', M, 270, { size: 54, weight: 900, color: C.lime });
  txt('2KM', M - 4, 515, { size: 250, fam: NUM, weight: 400, color: C.white });
  const w2 = measure('2KM', 250, 400, NUM);
  txt('×5', M + w2 + 18, 515, { size: 250, fam: NUM, weight: 400, color: C.lime });
  txt('+1KM', M - 2, 650, { size: 140, fam: NUM, weight: 400, color: 'rgba(0,0,0,0)', stroke: C.white, sw: 3 });
  txt('세트마다 더 빠르게', M + measure('+1KM', 140, 400, NUM) + 26, 632, { size: 40, weight: 800, color: C.white, alpha: .9 });
  const cx0 = M, cy0 = 1010, bw = 118, gap = 30;
  const all = [...REPS.map(r => r.pace), FINAL.pace];
  all.forEach((p, i) => {
    const h = (300 - p) * 4.0; const x = cx0 + i * (bw + gap); const last = i === all.length - 1;
    ctx.save(); ctx.globalAlpha = last ? 1 : .2 + i * .15; rrect(x, cy0 - h, bw, h, 10); ctx.fillStyle = last ? C.lime : C.white; ctx.fill(); ctx.restore();
    txt(fmtPace(p), x + bw / 2, cy0 - h - 16, { size: 40, fam: NUM, weight: 400, color: last ? C.lime : C.white, align: 'center' });
    txt(last ? '라스트' : `${i + 1}세트`, x + bw / 2, cy0 + 40, { size: 22, weight: 700, color: C.white, align: 'center', alpha: .6 });
  });
  line(M, 1118, W - M, 1118, 1, { color: C.white, w: 1.5, alpha: .2 });
  const stats = [['10.52', 'km', '본훈련 거리'], [fmtPace(233.6), '', '본훈련 평균'], ['161', 'bpm', '본훈련 심박'], ['64', '%', 'Z4 역치 비중']];
  const cw = (W - 2 * M) / 4;
  stats.forEach(([v, u, l], i) => {
    const x = M + i * cw;
    txt(v, x, 1222, { size: 78, fam: NUM, weight: 400, color: C.white });
    if (u) txt(u, x + measure(v, 78, 400, NUM) + 6, 1222, { size: 24, weight: 800, color: i === 3 ? ZC[3] : C.lime });
    txt(l, x, 1264, { size: 22, weight: 700, color: C.white, alpha: .55 });
  });
}
function pin(x, y, r, col) {
  ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y - r * .3, r, Math.PI * .85, Math.PI * .15); ctx.lineTo(x, y + r * 1.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, y - r * .3, r * .42, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
/* 심박존 누적 막대 */
function zoneBar(x, y, w, h, z, u, o = {}) {
  const tot = z.reduce((a, c) => a + c, 0); let cx = x;
  ctx.save(); rrect(x, y, w, h, h / 2); ctx.clip();
  ctx.fillStyle = C.bg3; ctx.fillRect(x, y, w, h);
  z.forEach((v, i) => { const ww = w * v / tot * u; ctx.fillStyle = ZC[i]; ctx.fillRect(cx, y, ww + .5, h); cx += ww; });
  ctx.restore();
  if (o.labels) {
    let lx = x;
    z.forEach((v, i) => {
      const ww = w * v / tot; const pct = Math.round(v / tot * 100);
      if (pct >= 8) txt(`Z${i + 1} ${pct}%`, lx + ww / 2, y + h + 34, { size: 24, fam: MONO, weight: 700, color: ZC[i], align: 'center', alpha: o.la == null ? 1 : o.la });
      lx += ww;
    });
  }
}
/* 심박 그래프 (존 밴드 배경 + 존 색상 라인) */
function hrGraph(x, y, w, h, t0s, t1s, u, o = {}) {
  const lo = o.lo || 100, hi = o.hi || 186;
  const Y = v => y + h - h * clamp((v - lo) / (hi - lo));
  for (let i = 0; i < 5; i++) {
    const a = Math.max(ZB[i], lo), c = Math.min(ZB[i + 1], hi); if (c <= a) continue;
    ctx.save(); ctx.globalAlpha = (o.band == null ? .1 : o.band); ctx.fillStyle = ZC[i]; ctx.fillRect(x, Y(c), w, Y(a) - Y(c)); ctx.restore();
    if (o.zoneLabels) txt(`Z${i + 1}`, x + w - 6, Y(c) + 24, { size: 20, fam: MONO, weight: 700, color: ZC[i], align: 'right', alpha: .8 });
  }
  const pts = SERIES.filter(p => p[0] >= t0s && p[0] <= t1s);
  const n = Math.floor(pts.length * u); if (n < 2) return null;
  const X = s => x + w * (s - t0s) / (t1s - t0s);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = o.lw || 4;
  if (o.glow) { ctx.shadowColor = 'rgba(255,255,255,.35)'; ctx.shadowBlur = 10; }
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], c = pts[i]; if (c[0] - a[0] > 30) continue;
    ctx.strokeStyle = ZC[zoneOf(c[2])]; ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[2])); ctx.lineTo(X(c[0]), Y(c[2])); ctx.stroke();
  }
  ctx.restore();
  const last = pts[n - 1]; return [X(last[0]), Y(last[2]), last];
}
function zoneOf(hr) { for (let i = 4; i >= 0; i--) if (hr >= ZB[i]) return i; return 0; }
const fmtDur = s => { s = Math.round(s); return `${Math.floor(s / 60)}:${pad2(s % 60)}`; };

/* ================= 장면들 ================= */
// S1: 인트로
function sIntro(t) {
  bgFill(C.bg, .06 + .08 * pulse(t, 6, 0, 11));
  const tr = E.ioC(P(t, .3, b(8)));
  const zoomOut = E.ioQ(P(t, b(8), b(10)));
  track({ x: 540, y: lerp(980, 930, zoomOut), s: lerp(4.6, 5.6, zoomOut), tilt: lerp(.42, .62, zoomOut), rot: rad(lerp(-8, 0, zoomOut)) },
    { fill: t > b(8) ? C.track : null, infield: C.bg, draw: tr, alpha: lerp(.5, 1, zoomOut), runner: t > b(9) ? (t - b(9)) * 260 : null, trail: 120 });
  const s0 = '2026.11.04  수요일';
  const n = Math.floor(clamp((t - .25) / .7) * [...s0].length);
  if (t < b(4)) {
    const a = 1 - P(t, b(4) - .15, b(4));
    txt([...s0].slice(0, n).join(''), 72, 178, { size: 28, fam: MONO, weight: 700, color: C.lime, alpha: a });
    if (Math.floor(t * 4) % 2 === 0 && n < [...s0].length) txt('▍', 72 + measure([...s0].slice(0, n).join(''), 28, 700, MONO), 178, { size: 28, fam: MONO, color: C.lime });
  }
  if (t >= b(0) && t < b(4) + .3) {
    const out = E.inC(P(t, b(4) - .12, b(4) + .06));
    maskText('오늘의', 72, 520, { size: 120, weight: 900, color: C.white }, (1 - E.outX(P(t, b(0), b(0) + .3))) - out);
    maskText('훈련', 66, 760, { size: 250, weight: 900, color: C.lime }, (1 - E.outX(P(t, b(1), b(1) + .3))) - out);
    const pu = E.outB(P(t, b(2), b(2) + .25));
    if (pu > 0 && out < .5) {
      ctx.save(); ctx.translate(72, 850); ctx.scale(pu, pu); ctx.translate(-72, -850);
      const w = measure('목동교 멀티스포츠존', 32, 800) + 92;
      rrect(72, 820, w, 60, 30); ctx.fillStyle = C.lime; ctx.fill(); pin(106, 852, 12, C.bg);
      txt('목동교 멀티스포츠존', 130, 862, { size: 32, weight: 800, color: C.bg }); ctx.restore();
    }
    const pu2 = E.outX(P(t, b(3), b(3) + .3));
    if (pu2 > 0 && out < .5) maskText('트랙 인터벌 세션', 72, 950, { size: 36, weight: 700, color: C.white, alpha: .75 }, 1 - pu2);
  }
  if (t >= b(4) && t < b(8) + .6) {
    const up = E.ioQ(P(t, b(8), b(8) + .5));
    const sc = lerp(1, .135, up);
    ctx.save(); ctx.globalAlpha = 1 - P(up, .7, 1); ctx.translate(72, lerp(600, 108, up)); ctx.scale(sc, sc); ctx.translate(-72, -600);
    const s1 = lerp(1.7, 1, E.outX(P(t, b(4), b(4) + .25)));
    ctx.save(); ctx.translate(72, 600); ctx.scale(s1, s1); ctx.globalAlpha *= P(t, b(4), b(4) + .05);
    txt('2KM', -4, 0, { size: 300, fam: NUM, weight: 400 }); ctx.restore();
    const w = measure('2KM', 300, 400, NUM);
    const s2 = lerp(1.7, 1, E.outX(P(t, b(5), b(5) + .25)));
    ctx.save(); ctx.translate(72 + w + 20, 600); ctx.scale(s2, s2); ctx.globalAlpha *= P(t, b(5), b(5) + .05);
    txt('×5', 0, 0, { size: 300, fam: NUM, weight: 400, color: C.lime }); ctx.restore();
    maskText('+1KM', 70, 790, { size: 180, fam: NUM, weight: 400, color: C.white }, 1 - E.outX(P(t, b(6), b(6) + .3)));
    maskText('롱 인터벌', 72 + measure('+1KM', 180, 400, NUM) + 30, 770, { size: 62, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(7), b(7) + .3)));
    ctx.restore();
  }
  if (t >= b(9)) {
    const out = E.inC(P(t, b(12) - .15, b(12)));
    maskText('빌드업', 72, 560, { size: 120, weight: 900, color: C.white }, (1 - E.outX(P(t, b(9), b(9) + .3))) - out);
    maskText('세트마다 페이스를 끌어올린다', 72, 640, { size: 44, weight: 700, color: C.white, alpha: .8 }, (1 - E.outX(P(t, b(10), b(10) + .3))) - out);
    const au = E.outX(P(t, b(11), b(11) + .35));
    for (let k = 0; k < 3; k++) {
      const x = 72 + k * 70 + au * 40;
      ctx.save(); ctx.globalAlpha = au * (1 - out) * (.35 + k * .3); ctx.strokeStyle = C.lime; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x, 690); ctx.lineTo(x + 34, 726); ctx.lineTo(x, 762); ctx.stroke(); ctx.restore();
    }
  }
}

// S2a: 세션 요약 카드 (한 장에 전부) b12~b20
function sSummary(t) {
  const t0 = b(12);
  bgFill(C.bg, .06 + .06 * pulse(t, 7));
  track({ x: 540, y: 1030, s: 5.6, tilt: .62 }, { fill: C.track, infield: C.bg, runner: (t - b(9)) * 260, trail: 120, alpha: .35 });
  const cu = E.outX(P(t, t0, t0 + .35));
  const cx = 72, cy = 240, cw = W - 144, ch = 820;
  ctx.save(); ctx.translate(0, (1 - cu) * 120); ctx.globalAlpha = cu;
  rrect(cx, cy, cw, ch, 36); ctx.fillStyle = 'rgba(26,31,38,.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(243,242,236,.12)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  sectionLabel('세션 요약', '01', t0, t);
  if (cu > .05) {
    ctx.save(); ctx.translate(0, (1 - cu) * 120);
    pin(cx + 52, cy + 66, 13, C.lime);
    txt('목동교 멀티스포츠존', cx + 78, cy + 78, { size: 32, weight: 800 });
    txt('2026.11.04 수요일 · 기온 18°C', cx + 78, cy + 118, { size: 24, weight: 700, alpha: .55 });
    line(cx + 40, cy + 156, cx + cw - 40, cy + 156, 1, { color: C.white, w: 1.5, alpha: .12 });
    const items = [['13.12', 'km', '총 거리'], ['57:05', '', '운동 시간'], [fmtPace(261.1), '', '평균 페이스'], ['154', 'bpm', '평균 심박'], ['177', 'bpm', '최대 심박'], ['809', 'kcal', '소모 칼로리']];
    items.forEach(([v, u, l], i) => {
      const bi = Math.floor(i / 2); const ui = E.outX(P(t, b(12 + bi) + (i % 2) * .08, b(12 + bi) + (i % 2) * .08 + .3));
      const x = cx + 44 + (i % 2) * (cw / 2), y = cy + 320 + Math.floor(i / 2) * 190;
      maskText(v, x, y, { size: 130, fam: NUM, weight: 400, color: C.white }, 1 - ui);
      if (u) maskText(u, x + measure(v, 130, 400, NUM) + 10, y, { size: 34, weight: 900, color: i >= 3 && i <= 4 ? C.coral : C.lime }, 1 - ui);
      maskText(l, x, y + 46, { size: 26, weight: 700, color: C.white, alpha: .55 }, 1 - ui);
    });
    ctx.restore();
  }
  // 다음 장면으로 와이프
  const ou = E.inC(P(t, b(16) - .14, b(16)));
  if (ou > 0) { ctx.fillStyle = C.lime; ctx.fillRect(0, H * (1 - ou), W, H * ou); }
}

// S2b: 본훈련 개요 b20~b28
function sMain(t) {
  const t0 = b(16);
  bgFill(C.bg, .1 + .12 * pulse(t, 7), 540, 700);
  const wl = 1 - E.outX(P(t, t0, t0 + .3)); if (wl > 0) { ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W, H * wl); }
  sectionLabel('본훈련', '02', t0, t);
  maskText('본훈련', 72, 340, { size: 120, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  maskText('2000m × 5 + 마지막 스텝', 72, 420, { size: 44, weight: 800, color: C.lime }, 1 - E.outX(P(t, t0 + .1, t0 + .4)));
  const items = [['10.52', 'km', '거리'], ['40:58', '', '시간'], [fmtPace(233.6), '', '평균 페이스'], ['161', 'bpm', '평균 심박']];
  items.forEach(([v, u, l], i) => {
    const ui = E.outX(P(t, b(16) + .15 + i * .08, b(16) + .45 + i * .08));
    const x = 72 + (i % 2) * 480, y = 600 + Math.floor(i / 2) * 170;
    maskText(v, x - 2, y, { size: 120, fam: NUM, weight: 400 }, 1 - ui);
    if (u) maskText(u, x + measure(v, 120, 400, NUM) + 8, y, { size: 32, weight: 900, color: i === 3 ? C.coral : C.lime }, 1 - ui);
    maskText(l, x, y + 42, { size: 26, weight: 700, alpha: .55 }, 1 - ui);
  });
  // 심박존 분포
  const zu = E.ioC(P(t, b(17), b(18)));
  maskText('본훈련 심박존 분포', 72, 1000, { size: 32, weight: 800 }, 1 - E.outX(P(t, b(17), b(17) + .3)));
  zoneBar(72, 1030, W - 144, 46, MAINZ, zu, { labels: true, la: P(t, b(18) - .2, b(18) + .1) });
  maskText(`Z4 역치 구간에서 ${fmtDur(MAINZ[3])} (64%)`, 72, 1175, { size: 34, weight: 800, color: ZC[3] }, 1 - E.outX(P(t, b(18) + .3, b(18) + .6)));
}

// S3: 5세트 — 페이스 · 거리 · 심박존 · 심박 추이
function sReps(t) {
  const k = clamp(Math.floor((lastBeat(t) - 28) / 6), 0, 4);
  const t0 = b(28 + k * 6), bt = i => b(28 + k * 6 + i);
  const r = REPS[k];
  bgFill(C.bg, .1 + .14 * pulse(t, 7), 540, 560);
  speedLines(t, .2 + k * .08, 24 + k * 6);
  if (k === 0) { const f = 1 - P(t, t0, t0 + .25); if (f > 0) { ctx.fillStyle = `rgba(212,255,58,${f * .9})`; ctx.fillRect(0, 0, W, H); } }
  sectionLabel('본훈련 세트', `0${k + 1}`, t0, t);
  // 세트 번호 + 2000m 강조
  const setU = P(t, t0, t0 + .3);
  ctx.save(); font(130, 400, NUM); ctx.lineWidth = 3; ctx.strokeStyle = C.white; ctx.globalAlpha = 1 - (1 - setU) * .8;
  ctx.strokeText(String(k + 1), 66 + (1 - E.outX(setU)) * 60, 330); ctx.restore();
  txt('세트', 72 + measure(String(k + 1), 130, 400, NUM) + 14, 326, { size: 44, weight: 900, color: C.white, alpha: setU });
  const ds = lerp(1.6, 1, E.outX(P(t, t0 + .05, t0 + .35)));
  ctx.save(); ctx.translate(W - 72, 330); ctx.scale(ds, ds); ctx.globalAlpha = P(t, t0 + .05, t0 + .12);
  const mw = measure('m', 50, 900);
  txt('m', 0, 0, { size: 50, weight: 900, color: C.lime, align: 'right' });
  txt('2000', -mw - 8, 0, { size: 130, fam: NUM, weight: 400, color: C.lime, align: 'right' });
  ctx.restore();
  if (k > 0) { const dd = Math.round(REPS[k - 1].pace) - Math.round(r.pace); pill(W - 72, 390, `▼ ${dd}초 단축`, { size: 26, fill: C.white, align: 'right', scale: E.outB(P(t, bt(1), bt(1) + .25)) }); }
  const prev = k === 0 ? `0'00"` : fmtPace(REPS[k - 1].pace);
  rollText(prev, fmtPace(r.pace), 64, 590, { size: 260, fam: NUM, color: C.white }, P(t, t0 + .02, t0 + .42));
  // 거리 진행 바 0 → 2000m
  const mx = 72, my = 660, mww = W - 144;
  const du = E.ioC(P(t, t0 + .1, bt(5)));
  const m = Math.round(2000 * du);
  ctx.save(); rrect(mx, my - 7, mww, 14, 7); ctx.fillStyle = C.bg3; ctx.fill();
  rrect(mx, my - 7, Math.max(14, mww * du), 14, 7); ctx.fillStyle = C.lime; ctx.fill(); ctx.restore();
  for (let q = 0; q <= 4; q++) {
    const x = mx + mww * q / 4; const on = du >= q / 4 - .001;
    line(x, my + 12, x, my + 24, 1, { color: C.white, w: 2, alpha: on ? .8 : .3 });
    txt(`${q * 500}m`, x, my + 50, { size: 20, fam: MONO, weight: 700, color: on ? C.white : C.mute, align: q === 0 ? 'left' : q === 4 ? 'right' : 'center', alpha: on ? .85 : .5 });
  }
  circle(mx + mww * du, my, 13, { fill: C.white }); circle(mx + mww * du, my, 6, { fill: C.lime });
  const done = E.outB(P(t, bt(5), bt(5) + .25));
  if (done > 0) pill(W - 72, my - 46, '2000m 완주', { size: 26, fill: C.lime, align: 'right', scale: done });
  else txt(`${m}m`, W - 72, my - 30, { size: 34, fam: NUM, weight: 400, color: C.lime, align: 'right' });
  // 목표 범위 게이지
  const gx = 72, gy = 790, gw = W - 144, lo = 210, hi = 260;
  const X = p => gx + gw * (hi - p) / (hi - lo);
  const gu = E.outX(P(t, bt(1), bt(1) + .4));
  ctx.save(); ctx.globalAlpha = gu; rrect(gx, gy - 9, gw, 18, 9); ctx.fillStyle = C.bg3; ctx.fill();
  rrect(X(r.hi), gy - 9, X(r.lo) - X(r.hi), 18, 9); ctx.fillStyle = 'rgba(212,255,58,.35)'; ctx.fill(); ctx.restore();
  for (let p = 215; p <= 255; p += 10) txt(fmtPace(p), X(p), gy + 42, { size: 20, fam: MONO, weight: 600, color: C.white, align: 'center', alpha: .4 * gu });
  if (t > bt(1)) {
    const mk = X(lerp(lo + 45, r.pace, spring(t - bt(1), 2, 6)));
    circle(mk, gy, 17, { fill: C.lime }); circle(mk, gy, 26 + 26 * P(t, bt(1), bt(1) + .4), { stroke: C.lime, w: 3, alpha: 1 - P(t, bt(1), bt(1) + .4) });
    maskText(`목표 ${fmtPace(r.lo)}–${fmtPace(r.hi)}`, gx, gy - 32, { size: 28, weight: 800, color: C.white, alpha: .8 }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    const cs = E.outB(P(t, bt(1) + .1, bt(1) + .35));
    if (cs > 0) { circle(W - 90, gy - 42, 18 * cs, { fill: C.lime }); check(W - 90, gy - 42, 18 * cs, P(t, bt(1) + .15, bt(1) + .4)); txt('적중', W - 118, gy - 32, { size: 28, weight: 900, color: C.lime, align: 'right', alpha: cs }); }
  }
  // 심박 + 존 분포
  const hu = E.outX(P(t, bt(2), bt(2) + .3));
  heart(92, 895, 38 * (1 + .25 * pulse(t, 8)), C.coral);
  maskText(String(Math.round(r.hr)), 124, 913, { size: 60, fam: NUM, weight: 400 }, 1 - hu);
  maskText(`bpm 평균 · 최대 ${REPMAX[k]}`, 124 + measure(String(Math.round(r.hr)), 60, 400, NUM) + 10, 909, { size: 26, weight: 800, color: C.coral }, 1 - hu);
  zoneBar(72, 935, W - 144, 26, REPZ[k], E.ioC(P(t, bt(2), bt(3))), { labels: true, la: P(t, bt(3) - .1, bt(3) + .15) });
  // 세트 심박 추이 (2000m 동안)
  const gyy = 1035, ghh = 150;
  ctx.save(); ctx.globalAlpha = P(t, bt(2), bt(2) + .2);
  txt('2000m 동안의 심박 변화', 72, gyy - 10, { size: 22, weight: 800, alpha: .7 });
  const head = hrGraph(72, gyy, W - 144, ghh, REPWIN[k][0], REPWIN[k][1], E.ioC(P(t, bt(2), bt(5) + .1)), { lo: 110, hi: 186, band: .12, zoneLabels: true, lw: 5, glow: true });
  if (head) { circle(head[0], head[1], 8, { fill: ZC[zoneOf(head[2][2])] }); txt(`${Math.round(head[2][2])}`, Math.min(head[0] + 14, W - 120), head[1] - 12, { size: 26, fam: NUM, weight: 400 }); }
  ctx.restore();
  // 세트 페이스 칩
  for (let i = 0; i < 5; i++) {
    const x = 72 + i * 190, on = i === k, dn = i < k;
    ctx.save(); ctx.globalAlpha = on ? 1 : dn ? .55 : .2; rrect(x, 1205, 172, 50, 25);
    if (on) { ctx.fillStyle = C.lime; ctx.fill(); } else { ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.stroke(); }
    txt(i <= k ? fmtPace(REPS[i].pace) : `${i + 1}세트`, x + 86, 1241, { size: i <= k ? 32 : 22, fam: i <= k ? NUM : KR, weight: i <= k ? 400 : 700, color: on ? C.bg : C.white, align: 'center' });
    ctx.restore();
  }
  const ou = E.inC(P(t, bt(6) - .12, bt(6)));
  if (ou > 0 && k < 4) { ctx.save(); ctx.globalAlpha = .9; ctx.fillStyle = C.lime; ctx.fillRect(0, H * (1 - ou), W, 14); ctx.restore(); }
}

// S4-A: 전체 심박 변화 추이 (b48~b56)
function sChart(t) {
  const t0 = b(20);
  bgFill(C.bg, .06 + .08 * pulse(t, 7));
  sectionLabel('심박 변화 추이', '03', t0, t);
  maskText('세션 전체', 72, 300, { size: 76, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  maskText('심박 그래프', 72, 394, { size: 76, weight: 900, color: C.coral }, 1 - E.outX(P(t, b(21), b(21) + .3)));
  const gx = 72, gy = 480, gw = W - 144, gh = 600, T = 3593;
  const X = s => gx + gw * s / T;
  REPWIN.concat([FINALWIN]).forEach(([a, c], i) => {
    const u = E.outX(P(t, b(22 + i), b(22 + i) + .3)); if (u <= 0) return;
    ctx.save(); ctx.globalAlpha = .1 * u; ctx.fillStyle = C.white; ctx.fillRect(X(a), gy, X(c) - X(a), gh); ctx.restore();
    txt(i < 5 ? `${i + 1}세트` : '라스트', (X(a) + X(c)) / 2, gy + gh + 40, { size: 22, weight: 800, color: C.white, align: 'center', alpha: u * .8 });
  });
  const head = hrGraph(gx, gy, gw, gh, 0, T, E.ioC(P(t, b(21), b(27))), { lo: 95, hi: 186, band: .13, zoneLabels: true, lw: 4 });
  if (head) {
    line(head[0], gy, head[0], gy + gh, 1, { color: C.white, w: 1.5, alpha: .4 });
    circle(head[0], head[1], 9, { fill: ZC[zoneOf(head[2][2])] });
    txt(`${Math.round(head[2][2])} bpm`, Math.min(head[0] + 14, gx + gw - 150), head[1] - 16, { size: 28, fam: NUM, weight: 400 });
  }
  const lu = P(t, b(25), b(25) + .3);
  maskText('세트마다 최대 심박 160 → 164 → 168 → 172 → 177', 72, 1200, { size: 30, weight: 800, color: C.white }, 1 - lu);
  maskText('회복 조깅에서 매번 130대로 내려왔다', 72, 1244, { size: 26, weight: 700, color: C.white, alpha: .6 }, 1 - E.outX(P(t, b(26), b(26) + .3)));
}

// S4-B: 라스트 스퍼트
function sFinal(t) {
  const t0 = b(58);
  const z = E.inX(P(t, b(63) - .05, b(64)));
  bgFill(C.bg, .2 + .2 * pulse(t, 6), 540, 640);
  speedLines(t, 1, 80);
  ctx.save(); ctx.translate(540, 640); ctx.scale(1 + z * 3, 1 + z * 3); ctx.translate(-540, -640);
  sectionLabel('마지막 스텝', '04', t0, t);
  maskText('라스트', 72, 330, { size: 110, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  maskText('스퍼트', 72, 460, { size: 110, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(58) + .22, b(58) + .5)));
  const su = E.outX(P(t, b(59), b(59) + .3));
  if (su > 0) {
    const sc = lerp(1.5, 1, su); const s = fmtPace(FINAL.pace);
    for (let e = 3; e >= 0; e--) {
      ctx.save(); ctx.translate(72 - e * 34 * (1 - su * .4), 820); ctx.scale(sc, sc);
      txt(s, 0, 0, { size: 320, fam: NUM, weight: 400, color: e ? C.lime : C.white, alpha: e ? (.16 / e) * su : su }); ctx.restore();
    }
  }
  maskText(`목표 ${fmtPace(215)}보다 8초 더 빠르게`, 72, 910, { size: 42, weight: 800, color: C.white }, 1 - E.outX(P(t, b(60), b(60) + .3)));
  const pu = E.outB(P(t, b(61), b(61) + .25));
  if (pu > 0) { pill(72, 1010, '마지막 518m', { size: 32, color: C.white, scale: pu }); pill(72 + measure('마지막 518m', 32, 800) + 42 + 20, 1010, '평균 심박 164 bpm', { size: 32, fill: C.lime, scale: E.outB(P(t, b(62), b(62) + .25)) }); }
  ctx.restore();
  if (z > 0) { ctx.fillStyle = `rgba(8,21,33,${z})`; ctx.fillRect(0, 0, W, H); }
}

// S5: 회복 조깅
function sRecovery(t) {
  const t0 = b(64);
  bgFill(C.deep, .12, 540, 980, '92,200,255');
  const br = (Math.sin((t - t0) * Math.PI * 2 / 3.9 - Math.PI / 2) + 1) / 2;
  for (let i = 0; i < 4; i++) circle(540, 980, 170 + i * 70 + br * 50, { stroke: C.sky, w: 2, alpha: (.4 - i * .09) * P(t, t0, t0 + .6) });
  circle(540, 980, 120 + br * 30, { fill: 'rgba(92,200,255,.12)' });
  txt('숨 고르기', 540, 990, { size: 34, weight: 800, color: C.sky, align: 'center', alpha: P(t, t0 + .2, t0 + .8) });
  sectionLabel('회복 조깅', '05', t0, t, C.sky);
  maskText('쉬는 구간까지', 72, 320, { size: 84, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .45)));
  maskText('계획대로.', 72, 424, { size: 84, weight: 900, color: C.sky }, 1 - E.outX(P(t, b(65), b(65) + .45)));
  RECS.forEach((p, i) => {
    const u = E.outX(P(t, b(66 + i), b(66 + i) + .4)); if (u <= 0) return;
    const x = 72 + i * 190, y = 560;
    ctx.save(); ctx.globalAlpha = u; ctx.translate(0, (1 - u) * 30);
    rrect(x, y - 50, 172, 100, 18); ctx.strokeStyle = 'rgba(92,200,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
    txt(fmtPace(p), x + 86, y + 16, { size: 50, fam: NUM, weight: 400, color: C.white, align: 'center' });
    txt(`회복 ${i + 1}`, x + 86, y + 84, { size: 20, weight: 700, color: C.sky, align: 'center' });
    ctx.restore();
  });
  maskText(`평균 ${fmtPace(372.4)} · 평균 심박 138 bpm`, 72, 720, { size: 36, weight: 800, color: C.white, alpha: .85 }, 1 - E.outX(P(t, b(71), b(71) + .4)));
  const ou = P(t, b(72) - .2, b(72)); if (ou > 0) { ctx.fillStyle = `rgba(11,13,16,${ou})`; ctx.fillRect(0, 0, W, H); }
}

// S6: 분석 (마디 18~23): 존 분석 2마디 · 다이내믹스 · 심박 회복 · 5/5 · 훈련 효과
const ZNAME = ['워밍업', '쉬움', '유산소', '역치', '최대'];
function sAnalysis(t) {
  const k = clamp(Math.floor((lastBeat(t) - 72) / 4), 0, 5);
  const t0 = b(72 + k * 4), bt = i => b(72 + k * 4 + i);
  bgFill(C.bg, .1 + .12 * pulse(t, 7), 540, 760);
  const enter = 1 - E.outX(P(t, t0, t0 + .3));
  const labels = ['심박존 분석', '세트별 심박존', '러닝 다이내믹스', '심박 회복', '결과', '훈련 효과'];
  sectionLabel(labels[k], `0${6 + k}`.slice(-2), t0, t);
  if (k === 0) {
    maskText('본훈련', 72, 300, { size: 64, weight: 900, color: C.white }, enter);
    maskText('심박존 분석', 72, 384, { size: 76, weight: 900, color: ZC[3] }, 1 - E.outX(P(t, t0 + .1, t0 + .4)));
    // 도넛
    const cx = 330, cy = 760, R = 210, du = E.ioC(P(t, t0 + .1, bt(2)));
    const tot = MAINZ.reduce((a, c) => a + c, 0); let a0 = -Math.PI / 2;
    circle(cx, cy, R, { stroke: C.bg3, w: 70 });
    MAINZ.forEach((v, i) => { const da = Math.PI * 2 * v / tot * du; if (da > 0) circle(cx, cy, R, { stroke: ZC[i], w: 70, a0, a1: a0 + da }); a0 += Math.PI * 2 * v / tot * du; });
    txt('Z4', cx, cy - 78, { size: 44, weight: 900, color: ZC[3], align: 'center', alpha: du });
    txt(`${Math.round(64 * du)}%`, cx, cy + 66, { size: 110, fam: NUM, weight: 400, align: 'center', alpha: du });
    // 범례
    for (let i = 4; i >= 0; i--) {
      const row = 4 - i, u = E.outX(P(t, t0 + .2 + row * .12, t0 + .5 + row * .12));
      const y = 600 + row * 84, x = 600;
      ctx.save(); ctx.globalAlpha = u; ctx.translate((1 - u) * 40, 0);
      rrect(x, y - 24, 14, 32, 4); ctx.fillStyle = ZC[i]; ctx.fill();
      txt(`Z${i + 1}`, x + 30, y, { size: 30, fam: NUM, weight: 400, color: ZC[i] });
      txt(ZNAME[i], x + 78, y, { size: 24, weight: 700, alpha: .7 });
      txt(fmtDur(MAINZ[i]), W - 72, y, { size: 34, fam: NUM, weight: 400, align: 'right' });
      ctx.restore();
    }
    maskText('대부분을 역치(Z4)에서 버틴 세션', 72, 1100, { size: 40, weight: 900, color: C.white }, 1 - E.outX(P(t, bt(2), bt(2) + .3)));
    maskText(`Z4 ${fmtDur(MAINZ[3])} · Z3 ${fmtDur(MAINZ[2])} · Z5 ${fmtDur(MAINZ[4])}`, 72, 1156, { size: 30, weight: 700, color: C.white, alpha: .65 }, 1 - E.outX(P(t, bt(3), bt(3) + .3)));
  } else if (k === 1) {
    maskText('세트가 갈수록', 72, 300, { size: 64, weight: 900, color: C.white }, enter);
    maskText('고강도 비중 상승', 72, 384, { size: 76, weight: 900, color: ZC[4] }, 1 - E.outX(P(t, t0 + .1, t0 + .4)));
    const all = [...REPZ, FINALZ]; const cw = 120, gap = (W - 144 - 6 * cw) / 5, y0 = 1080, hh = 520;
    all.forEach((z, i) => {
      const u = E.outC(P(t, t0 + i * .16, t0 + i * .16 + .45)); const tot = z.reduce((a, c) => a + c, 0);
      const x = 72 + i * (cw + gap); let y = y0;
      ctx.save(); rrect(x, y0 - hh, cw, hh, 12); ctx.clip(); ctx.fillStyle = C.bg3; ctx.fillRect(x, y0 - hh, cw, hh);
      z.forEach((v, j) => { const h = hh * v / tot * u; ctx.fillStyle = ZC[j]; ctx.fillRect(x, y - h, cw, h + .5); y -= h; });
      ctx.restore();
      const hiPct = Math.round((z[3] + z[4]) / tot * 100);
      txt(`${Math.round(hiPct * u)}%`, x + cw / 2, y0 - hh - 18, { size: 40, fam: NUM, weight: 400, align: 'center', alpha: u });
      txt(i < 5 ? `${i + 1}세트` : '라스트', x + cw / 2, y0 + 40, { size: 22, weight: 800, align: 'center', alpha: .7 });
    });
    maskText('% = Z4 + Z5 비중', 72, 1180, { size: 28, weight: 700, color: C.white, alpha: .6 }, 1 - E.outX(P(t, bt(2), bt(2) + .3)));
  } else if (k === 2) {
    maskText('러닝 다이내믹스', 72, 340, { size: 76, weight: 900, color: C.white }, enter);
    const rows = [['186', 'spm', '케이던스', 150], ['1.21', 'm', '보폭', 0], ['218', 'ms', '지면 접촉 시간', 150]];
    rows.forEach(([v, u_, l, from], i) => {
      const u = E.outX(P(t, b(80 + i), b(80 + i) + .3)); const y = 590 + i * 230;
      const cnt = E.outQ(P(t, b(80 + i), b(80 + i) + .6));
      const vv = v.includes('.') ? (parseFloat(v) * cnt).toFixed(2) : String(Math.round(lerp(from, parseFloat(v), cnt)));
      maskText(vv, 66, y, { size: 200, fam: NUM, weight: 400 }, 1 - u);
      maskText(u_, 72 + measure(vv, 200, 400, NUM) + 12, y, { size: 52, weight: 900, color: C.lime }, 1 - u);
      maskText(l, 640, y - 20, { size: 34, weight: 800, alpha: .7 }, 1 - u);
    });
    const steps = Math.floor((t - t0) * 3.1);
    for (let i = 0; i < 6; i++) { const sIdx = steps - i; if (sIdx < 0) continue; const x = 960 - i * 60, y = 1220 + (sIdx % 2 ? -18 : 18);
      ctx.save(); ctx.globalAlpha = (1 - i / 6) * .9; ctx.fillStyle = i === 0 ? C.lime : C.white; ctx.beginPath(); ctx.ellipse(x, y, 20, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  } else if (k === 3) {
    maskText('세트 후 1분', 72, 300, { size: 64, weight: 900, color: C.white }, enter);
    maskText('심박 회복', 72, 384, { size: 76, weight: 900, color: C.sky }, 1 - E.outX(P(t, t0 + .1, t0 + .4)));
    HRREC.forEach(([a, c], i) => {
      const u = E.outX(P(t, t0 + .15 + i * .2, t0 + .5 + i * .2)); const y = 540 + i * 150;
      const x0 = 72, w = W - 144;
      ctx.save(); ctx.globalAlpha = u;
      txt(`${i + 1}세트`, x0, y, { size: 28, weight: 800, alpha: .7 });
      const X = v => x0 + 170 + (w - 400) * (v - 110) / 70;
      line(X(c), y - 10, X(lerp(c, a, 1 - u * 0) ), y - 10, 1, { color: C.line, w: 10, cap: 'round' });
      line(X(a), y - 10, X(lerp(a, c, u)), y - 10, 1, { color: C.sky, w: 10, cap: 'round' });
      circle(X(a), y - 10, 9, { fill: C.coral }); circle(X(lerp(a, c, u)), y - 10, 9, { fill: C.sky });
      txt(`${a}→${c}`, X(a) + 20, y - 34, { size: 26, fam: NUM, weight: 400, alpha: .8 });
      txt(`-${a - c}`, W - 72, y, { size: 64, fam: NUM, weight: 400, color: C.sky, align: 'right' });
      ctx.restore();
    });
    maskText('평균 -24 bpm', 72, 1150, { size: 56, weight: 900, color: C.sky }, 1 - E.outX(P(t, bt(3), bt(3) + .3)));
    txt('5세트는 회복 중 일시정지가 있어 제외', 72, 1200, { size: 24, weight: 700, alpha: .45 * P(t, bt(3), bt(3) + .3) });
  } else if (k === 4) {
    const fl = 1 - P(t, t0, t0 + .2); if (fl > 0) { ctx.fillStyle = `rgba(212,255,58,${fl})`; ctx.fillRect(0, 0, W, H); }
    const sc = lerp(1.6, 1, E.outX(P(t, t0, t0 + .3)));
    ctx.save(); ctx.translate(540, 640); ctx.scale(sc, sc); txt('5/5', 0, 0, { size: 440, fam: NUM, weight: 400, color: C.lime, align: 'center' }); ctx.restore();
    maskText('모든 세트 목표 페이스 적중', 540, 760, { size: 56, weight: 900, color: C.white, align: 'center' }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    for (let i = 0; i < 5; i++) {
      const tt = t0 + i * (bt(3) - t0) / 4; const u = E.outB(P(t, tt, tt + .25));
      const x = 540 + (i - 2) * 160, y = 920;
      circle(x, y, 52 * u, { fill: C.lime }); check(x, y, 52 * u, P(t, tt + .05, tt + .3));
      txt(fmtPace(REPS[i].pace), x, y + 104, { size: 38, fam: NUM, weight: 400, color: C.white, align: 'center', alpha: u });
    }
  } else {
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
    const ou = E.inC(P(t, b(96) - .25, b(96)));
    if (ou > 0) { ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W * ou, H); }
  }
}

// S7: 훈련 요약 → 엔드카드(커버 재등장, 루프)
function sOutro(t) {
  const t0 = b(96), endT = b(105);
  if (t < endT) {
    bgFill(C.bg, .1, 540, 900);
    const wl = 1 - E.outX(P(t, t0, t0 + .35)); if (wl > 0) { ctx.fillStyle = C.lime; ctx.fillRect(W * (1 - wl), 0, W * wl, H); }
    track({ x: 540, y: 1120, s: 4.6, tilt: .5 }, { fill: C.track, infield: C.bg, runner: lerp(0, 400, E.ioC(P(t, t0, endT))), trail: 160, alpha: .45 });
    sectionLabel('정리', '12', t0, t);
    maskText('이 훈련은', 72, 320, { size: 96, weight: 900, color: C.white }, 1 - E.outX(P(t, b(97), b(97) + .35)));
    const pts = [
      ['목적', '젖산역치(LT) 향상과', '레이스 페이스 지속력 강화'],
      ['방식', '2000m × 5를 세트마다 3~6초씩 빠르게,', '사이사이 회복 조깅'],
      ['결과', `${fmtPace(REPS[0].pace)} → ${fmtPace(REPS[4].pace)}, 마지막 ${fmtPace(FINAL.pace)}까지 가속`, '본훈련 64%를 역치(Z4)에서 소화'],
    ];
    pts.forEach(([h, l1, l2], i) => {
      const tb = b(98 + i * 2); const u = E.outX(P(t, tb, tb + .35));
      const y = 470 + i * 190;
      ctx.save(); ctx.globalAlpha = u; ctx.translate((1 - u) * 50, 0);
      txt(`0${i + 1}`, 72, y, { size: 26, fam: MONO, weight: 700, color: C.lime });
      txt(h, 130, y, { size: 30, weight: 900, color: C.lime });
      txt(l1, 72, y + 56, { size: 38, weight: 800 });
      txt(l2, 72, y + 104, { size: 38, weight: 800, alpha: .75 });
      ctx.restore();
    });
    const fo = P(t, endT - .12, endT); if (fo > 0) { ctx.fillStyle = `rgba(212,255,58,${fo})`; ctx.fillRect(0, 0, W, H); }
  } else {
    drawCover(t - endT);
    const f = 1 - E.outC(P(t, endT, endT + .3)); if (f > 0) { ctx.fillStyle = `rgba(212,255,58,${f})`; ctx.fillRect(0, 0, W, H); }
  }
}

/* ---------------- 상시 HUD ---------------- */
/* 훈련 이름: 인트로에서 줄어들어 이 자리로 이동한 뒤 끝까지 유지 */
function titleBadge(t, col, dark) {
  const a = P(t, b(8) + .3, b(8) + .5); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; let x = 72; const y = 108;
  txt('2KM', x, y, { size: 40, fam: NUM, weight: 400, color: col }); x += measure('2KM', 40, 400, NUM) + 4;
  txt('×5', x, y, { size: 40, fam: NUM, weight: 400, color: dark ? C.bg : C.lime }); x += measure('×5', 40, 400, NUM) + 10;
  txt('+1KM', x, y, { size: 40, fam: NUM, weight: 400, color: col }); x += measure('+1KM', 40, 400, NUM) + 14;
  txt('롱 인터벌', x, y - 4, { size: 24, weight: 800, color: dark ? C.bg : C.lime });
  ctx.restore();
}
const SECS = [[0, '인트로'], [7.454, '세션 요약'], [9.427, '본훈련'], [11.378, '심박 추이'], [15.279, '세트'], [29.954, '스퍼트'], [32.879, '회복'], [36.78, '분석'], [48.484, '정리']];
function hud(t, dark = false) {
  if (t < .25 || t >= b(105)) return;
  const a = P(t, .25, .6);
  const col = dark ? C.bg : C.white;
  ctx.save(); ctx.globalAlpha = a;
  titleBadge(t, col, dark);
  // 세션 진행 (영상 진행 → 세션 거리로 매핑)
  const km = (13.12 * clamp((t - .1) / (b(105) - .1))).toFixed(2);
  txt(`${km} km`, W - 72, 104, { size: 22, fam: MONO, weight: 700, color: col, align: 'right', alpha: .8 });
  const bx = 72, by = H - 54, bw = W - 144;
  ctx.globalAlpha = a * .25; ctx.fillStyle = col; ctx.fillRect(bx, by, bw, 3);
  ctx.globalAlpha = a; ctx.fillStyle = dark ? C.bg : C.lime; ctx.fillRect(bx, by - 1, bw * clamp(t / b(105)), 5);
  for (const [s] of SECS) { ctx.globalAlpha = a * .5; ctx.fillStyle = col; ctx.fillRect(bx + bw * s / b(105) - 1, by - 7, 2, 17); }
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
  else if (t < b(16)) sSummary(t);
  else if (t < b(20)) sMain(t);
  else if (t < b(28)) sChart(t);
  else if (t < b(58)) sReps(t);
  else if (t < b(64)) sFinal(t);
  else if (t < b(72)) sRecovery(t);
  else if (t < b(96)) { sAnalysis(t); const k = Math.floor((lastBeat(t) - 72) / 4); dark = (k === 4 && t < b(88) + .2); }
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
