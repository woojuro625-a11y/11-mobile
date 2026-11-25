/* 러닝 훈련 리뷰 — 인스타그램 피드 4:5 (1080×1350), 60fps
 * 2026.10.13 · 3km×3 + 2km 롱 인터벌 (Garmin FIT 데이터)
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
  date: '2026.10.13', day: '화요일',
  dist: 12.72, timer: 3276, elapsed: 3327, avgPace: 257.4, avgHr: 152, maxHr: 175,
  kcal: 771, cadence: 188, stride: 1.23, gct: 217, teAer: 4.0, teAna: 1.3, temp: 20, maxKmh: 17.7,
};
// 본훈련 3000m × 3 (목표 범위 lo~hi 초/km) + 마지막 2000m
const SETD = 3000, SETN = 3;
const REPS = [
  { pace: 241.4, hr: 148.9, lo: 235, hi: 240 },
  { pace: 234.7, hr: 158.0, lo: 230, hi: 235 },
  { pace: 230.0, hr: 162.3, lo: 225, hi: 230 },
];
const FINAL = { pace: 222.1, dist: 2000, lo: 220, hi: 225, hr: 166, max: 175 };
const hitOf = r => r.pace <= r.hi + .5;              // 목표 범위 안(또는 더 빠름)이면 적중
const RECS = [385.1, 407.8, 454.0];
const RECAVG = { dist: 567, pace: 416.4, hr: 131 };  // 회복 조깅 3회 평균 (마지막 24m 랩은 제외)
const RECTOT = { km: '1.70', time: '11:48' };
// 회복 구간별 (세트 바로 뒤에 이어서 보여준다) — 거리 m · 타이머 시간(초) · 평균 심박 · 시계열 창 · 급수·휴식(초)
const RECSETS = [
  { dist: 550, time: 211.8, pace: 385.1, hr: 129, win: [725, 948], pause: 12 },
  { dist: 563, time: 229.4, pace: 407.8, hr: 132, win: [1653, 1900], pause: 19 },
  { dist: 587, time: 266.5, pace: 454.0, hr: 133, win: [2592, 2877], pause: 20 },
];
// 영상 타임라인 (비트 인덱스): 세트 12박 → 회복 6박 반복, 마지막 2000m 10박
const r10 = v => Math.round(v / 10) * 10; // 회복 거리 표기: 1의 자리 반올림 + '약'
const SEQ = { set: [16, 34, 52], rec: [28, 46, 64], last: 70, chart: 80, donut: 88, zones: 92, outro: 96 };
// 시계 일시정지 구간 = 급수·완전 휴식 [시작 경과초, 길이초]
const PAUSES = [[781, 12], [1718, 19], [2675, 20]];
// 심박존 (최대심박 186 기준, 워치 설정값) · 존별 체류 시간(초) [Z1..Z5]
const ZB = [117, 131, 144, 158, 172, 186];
const ZC = ['#7C8A9C', '#5CC8FF', '#3DDC84', '#FFB020', '#FF5A5F'];
const REPZ = [[42, 78, 507, 97, 0], [10, 16, 181, 498, 0], [4, 15, 85, 587, 0]];
const FINALZ = [0, 11, 45, 317, 72];
const MAINZ = [56, 120, 818, 1499, 72];
const MAINZ4 = 58; // 본훈련 Z4 %
const REPMAX = [160, 164, 170];
const REPWIN = [[0, 725], [948, 1653], [1900, 2592]];
const FINALWIN = [2877, 3323];
const SESSION_T = 3327;
const HRREC = []; // 세트 후 심박 회복 장면은 쓰지 않음
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
  txt('2026.10.13 화요일', M + 36, 158, { size: 24, weight: 700, color: C.white, alpha: .55 });
  pill(W - M, 108, '3/4 목표 적중', { size: 24, fill: C.lime, align: 'right' });
  txt('롱 인터벌 빌드업', M, 270, { size: 54, weight: 900, color: C.lime });
  txt('3KM', M - 4, 515, { size: 250, fam: NUM, weight: 400, color: C.white });
  const w2 = measure('3KM', 250, 400, NUM);
  txt('×3', M + w2 + 18, 515, { size: 250, fam: NUM, weight: 400, color: C.lime });
  txt('+2KM', M - 2, 650, { size: 140, fam: NUM, weight: 400, color: 'rgba(0,0,0,0)', stroke: C.white, sw: 3 });
  txt('세트마다 더 빠르게', M + measure('+2KM', 140, 400, NUM) + 26, 632, { size: 40, weight: 800, color: C.white, alpha: .9 });
  const cx0 = M, cy0 = 1010, gap = 40, bw = (W - 2 * M - 3 * gap) / 4;
  const all = [...REPS.map(r => r.pace), FINAL.pace];
  all.forEach((p, i) => {
    const h = (300 - p) * 4.0; const x = cx0 + i * (bw + gap); const last = i === all.length - 1;
    ctx.save(); ctx.globalAlpha = last ? 1 : .2 + i * .15; rrect(x, cy0 - h, bw, h, 10); ctx.fillStyle = last ? C.lime : C.white; ctx.fill(); ctx.restore();
    txt(fmtPace(p), x + bw / 2, cy0 - h - 16, { size: 40, fam: NUM, weight: 400, color: last ? C.lime : C.white, align: 'center' });
    txt(last ? '라스트 2000m' : `${i + 1}세트 3000m`, x + bw / 2, cy0 + 40, { size: 22, weight: 700, color: C.white, align: 'center', alpha: .6 });
  });
  line(M, 1118, W - M, 1118, 1, { color: C.white, w: 1.5, alpha: .2 });
  const stats = [['11.00', 'km', '본훈련 거리'], [fmtPace(233.0), '', '본훈련 평균'], ['158', 'bpm', '본훈련 심박'], [String(MAINZ4), '%', 'Z4 역치 비중']];
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
    if (o.zoneLabels) { const lx = o.zoneLeft ? x - 8 : x + w - 6; txt(`Z${i + 1}`, lx, Y(c) + 24, { size: 20, fam: MONO, weight: 700, color: ZC[i], align: 'right', alpha: .8 }); }
  }
  const pts = SERIES.filter(p => p[0] >= t0s && p[0] <= t1s);
  const n = Math.floor(pts.length * u); if (n < 2) return null;
  const X = s => x + w * (s - t0s) / (t1s - t0s);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = o.lw || 4;
  if (o.glow) { ctx.shadowColor = 'rgba(255,255,255,.35)'; ctx.shadowBlur = 10; }
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], c = pts[i]; if (c[0] - a[0] > 8) continue;
    ctx.strokeStyle = ZC[zoneOf(c[2])]; ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[2])); ctx.lineTo(X(c[0]), Y(c[2])); ctx.stroke();
  }
  ctx.restore();
  const last = pts[n - 1]; return [X(last[0]), Y(last[2]), last];
}
/* 물방울 아이콘 */
function drop(x, y, r, col) {
  ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - r * 1.5);
  ctx.bezierCurveTo(x + r * .2, y - r * .9, x + r, y - r * .3, x + r, y + r * .15); ctx.arc(x, y + r * .15, r, 0, Math.PI); ctx.bezierCurveTo(x - r, y - r * .3, x - r * .2, y - r * .9, x, y - r * 1.5);
  ctx.fill(); ctx.restore();
}
/* 그래프 위 급수·휴식 표시: X(경과초) 함수, 그래프 영역, 표시할 최대 경과초 */
function pauseMarks(X, gy, gh, upTo = 1e9, a = 1) {
  let px = -1e9, lv = 0;
  PAUSES.forEach(([s0, d]) => {
    if (s0 > upTo) return;
    const x = X(s0 + d / 2);
    lv = x - px < 60 ? lv + 1 : 0; px = x; const oy = lv * 56; // 가까운 마커는 아래로 엇갈리게
    line(x, gy + 66 + oy, x, gy + gh, 1, { color: C.sky, w: 2, alpha: .55 * a, dash: [5, 6] });
    ctx.save(); ctx.globalAlpha *= a; drop(x, gy + 22 + oy, 10, C.sky); ctx.restore();
    txt(`${d}초`, x, gy + 58 + oy, { size: 18, fam: MONO, weight: 700, color: C.sky, align: 'center', alpha: a });
  });
}
function zoneOf(hr) { for (let i = 4; i >= 0; i--) if (hr >= ZB[i]) return i; return 0; }
const fmtDur = s => { s = Math.round(s); return `${Math.floor(s / 60)}:${pad2(s % 60)}`; };

/* ================= 장면들 ================= */
// S1: 인트로 — 훈련 이름을 길게 보여준다 (0.1s ~ b8)
/* 훈련 이름 그룹: 기준점 (72, 600). up=0 원래 크기, up=1 상단 배지 크기/위치 */
function titleGroup(t, up) {
  const sc = lerp(1, .135, up);
  ctx.save(); ctx.globalAlpha *= 1 - P(up, .7, 1);
  const drift = 1 + .025 * E.ioC(P(t, b(4), b(8))) * (1 - up);
  ctx.translate(72, lerp(600, 108, up)); ctx.scale(sc * drift, sc * drift); ctx.translate(-72, -600);
  const s1 = lerp(1.7, 1, E.outX(P(t, b(1), b(1) + .25)));
  ctx.save(); ctx.translate(72, 600); ctx.scale(s1, s1); ctx.globalAlpha *= P(t, b(1), b(1) + .05);
  txt('3KM', -4, 0, { size: 300, fam: NUM, weight: 400 }); ctx.restore();
  const w = measure('3KM', 300, 400, NUM);
  const s2 = lerp(1.7, 1, E.outX(P(t, b(2), b(2) + .25)));
  ctx.save(); ctx.translate(72 + w + 20, 600); ctx.scale(s2, s2); ctx.globalAlpha *= P(t, b(2), b(2) + .05);
  txt('×3', 0, 0, { size: 300, fam: NUM, weight: 400, color: C.lime }); ctx.restore();
  maskText('+2KM', 70, 790, { size: 180, fam: NUM, weight: 400, color: C.white }, 1 - E.outX(P(t, b(3), b(3) + .3)));
  const iw = measure('+2KM', 180, 400, NUM) + 30;
  maskText('롱 인터벌', 72 + iw, 718, { size: 62, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(4), b(4) + .3)));
  maskText('빌드업', 72 + iw, 790, { size: 62, weight: 900, color: C.white }, 1 - E.outX(P(t, b(4) + .12, b(4) + .42)));
  ctx.restore();
}
function sIntro(t) {
  bgFill(C.bg, .06 + .1 * pulse(t, 6, 0, 8));
  const tr = E.ioC(P(t, .3, b(6)));
  track({ x: 540, y: 1110, s: 4.8, tilt: .45 }, { fill: t > b(4) ? C.track : null, infield: C.bg, draw: tr, alpha: .9, runner: t > b(4) ? (t - b(4)) * 220 : null, trail: 120 });
  // 날짜 · 장소
  const s0 = '2026.10.13  화요일';
  const n = Math.floor(clamp((t - .2) / .6) * [...s0].length);
  txt([...s0].slice(0, n).join(''), 72, 178, { size: 28, fam: MONO, weight: 700, color: C.lime });
  if (Math.floor(t * 4) % 2 === 0 && n < [...s0].length) txt('▍', 72 + measure([...s0].slice(0, n).join(''), 28, 700, MONO), 178, { size: 28, fam: MONO, color: C.lime });
  const lu = E.outX(P(t, .8, 1.1));
  if (lu > 0) { ctx.save(); ctx.globalAlpha = lu; pin(84, 222, 12, C.white); ctx.restore(); maskText('목동교 멀티스포츠존', 106, 234, { size: 32, weight: 800 }, 1 - lu); }
  maskText('오늘의 훈련', 72, 318, { size: 46, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(0), b(0) + .3)));
  titleGroup(t, 0);
  maskText('3000m × 3 + 2000m · 세트마다 목표 -5초', 72, 880, { size: 36, weight: 700, color: C.white, alpha: .8 }, 1 - E.outX(P(t, b(5), b(5) + .3)));
  const au = E.outX(P(t, b(6), b(6) + .35));
  for (let k = 0; k < 3; k++) {
    const x = 72 + k * 56 + au * 30;
    ctx.save(); ctx.globalAlpha = au * (.35 + k * .3); ctx.strokeStyle = C.lime; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, 922); ctx.lineTo(x + 26, 948); ctx.lineTo(x, 974); ctx.stroke(); ctx.restore();
  }
  const ou = E.inC(P(t, b(8) - .12, b(8)));
  if (ou > 0) { ctx.fillStyle = `rgba(11,13,16,${ou * .6})`; ctx.fillRect(0, 0, W, H); }
}

// S2: 세션 요약 + 본훈련 요약 (한 장, b8 ~ b16)
function sSummary(t) {
  const t0 = b(8);
  bgFill(C.bg, .06 + .06 * pulse(t, 7));
  const cu = E.outX(P(t, t0 + .1, t0 + .45));
  const cx = 72, cy = 200, cw = W - 144, ch = 1000;
  ctx.save(); ctx.translate(0, (1 - cu) * 140); ctx.globalAlpha = cu;
  rrect(cx, cy, cw, ch, 36); ctx.fillStyle = 'rgba(26,31,38,.94)'; ctx.fill(); ctx.strokeStyle = 'rgba(243,242,236,.12)'; ctx.lineWidth = 2; ctx.stroke();
  // 장소 · 날짜
  pin(cx + 52, cy + 62, 13, C.lime);
  txt('목동교 멀티스포츠존', cx + 78, cy + 74, { size: 32, weight: 800 });
  txt('2026.10.13 화요일 · 기온 20°C', cx + 78, cy + 112, { size: 24, weight: 700, alpha: .55 });
  // 세션 전체 (작게)
  txt('세션 전체', cx + 44, cy + 190, { size: 24, weight: 800, color: C.white, alpha: .6 });
  const ses = [['12.72', 'km'], ['54:36', ''], [fmtPace(257.4), ''], ['152', 'bpm']];
  ses.forEach(([v, u], i) => {
    const ui = E.outX(P(t, b(9) + i * .06, b(9) + .3 + i * .06)); const x = cx + 44 + i * 232, y = cy + 262;
    maskText(v, x, y, { size: 62, fam: NUM, weight: 400 }, 1 - ui);
    if (u) maskText(u, x + measure(v, 62, 400, NUM) + 6, y, { size: 22, weight: 900, color: i === 3 ? C.coral : C.lime }, 1 - ui);
  });
  line(cx + 40, cy + 310, cx + cw - 40, cy + 310, 1, { color: C.white, w: 1.5, alpha: .12 });
  // 본훈련 (한 줄 4개)
  txt('본훈련', cx + 44, cy + 376, { size: 38, weight: 900, color: C.lime });
  txt('3000m × 3 + 2000m', cx + 44 + measure('본훈련', 38, 900) + 18, cy + 374, { size: 24, weight: 700, alpha: .65 });
  const row4 = (items, y, t1, opt = {}) => items.forEach(([v, u, l, pre], i) => {
    const ui = E.outX(P(t, t1 + i * .07, t1 + .3 + i * .07)); let x = cx + 44 + i * 222; const lx = x;
    if (pre) { maskText(pre, x, y, { size: 30, weight: 900, color: opt.first && i === 0 ? opt.first : C.white }, 1 - ui); x += measure(pre, 30, 900) + 6; }
    maskText(v, x - 2, y, { size: 72, fam: NUM, weight: 400, color: opt.first && i === 0 ? opt.first : C.white }, 1 - ui);
    if (u) maskText(u, x + measure(v, 72, 400, NUM) + 6, y, { size: 24, weight: 900, color: opt.uc ? opt.uc(i) : C.lime }, 1 - ui);
    maskText(l, lx, y + 36, { size: 22, weight: 700, alpha: .55 }, 1 - ui);
  });
  row4([['11.00', 'km', '거리'], ['42:43', '', '시간'], [fmtPace(233.0), '', '평균 페이스'], ['158', 'bpm', '평균 심박']], cy + 476, b(10), { uc: i => i === 3 ? C.coral : C.lime });
  // 본훈련 심박존
  const zu = E.ioC(P(t, b(11), b(12)));
  txt('본훈련 심박존', cx + 44, cy + 566, { size: 22, weight: 800, alpha: .7 * P(t, b(11), b(11) + .2) });
  zoneBar(cx + 44, cy + 584, cw - 88, 30, MAINZ, zu, { labels: true, la: P(t, b(12) - .1, b(12) + .2) });
  maskText(`Z4 역치 구간에서 ${fmtDur(MAINZ[3])} (${MAINZ4}%)`, cx + 44, cy + 692, { size: 26, weight: 800, color: ZC[3] }, 1 - E.outX(P(t, b(12) + .1, b(12) + .4)));
  line(cx + 40, cy + 730, cx + cw - 40, cy + 730, 1, { color: C.white, w: 1.5, alpha: .12 });
  // 회복구간
  const ru = P(t, b(13), b(13) + .2);
  txt('회복구간', cx + 44, cy + 800, { size: 38, weight: 900, color: C.sky, alpha: ru });
  txt('랩 버튼까지 자유 조깅', cx + 44 + measure('회복구간', 38, 900) + 18, cy + 798, { size: 24, weight: 700, alpha: .65 * ru });
  row4([[String(r10(RECAVG.dist)), 'm', '평균 거리', '약'], [fmtPace(RECAVG.pace), '', '평균 페이스'], [String(RECAVG.hr), 'bpm', '평균 심박'], [String(PAUSES.length), '회', '급수·휴식']], cy + 900, b(13) + .1, { first: C.sky, uc: () => C.sky });
  ctx.restore();
  sectionLabel('세션 요약', '01', t0, t);
  const ou = E.inC(P(t, b(16) - .14, b(16)));
  if (ou > 0) { ctx.fillStyle = C.lime; ctx.fillRect(0, H * (1 - ou), W, H * ou); }
}

// S3: 3000m × 3 — 페이스 · 거리 · 심박존 · 심박 추이 (세트당 12박)
function sReps(t, k) {
  const base = SEQ.set[k];
  const t0 = b(base), bt = i => b(base + i);
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
  txt(String(SETD), -mw - 8, 0, { size: 130, fam: NUM, weight: 400, color: C.lime, align: 'right' });
  ctx.restore();
  if (k > 0) { const dd = Math.round(REPS[k - 1].pace) - Math.round(r.pace); pill(W - 72, 390, `▼ ${dd}초 단축`, { size: 26, fill: C.white, align: 'right', scale: E.outB(P(t, bt(1), bt(1) + .25)) }); }
  const prev = k === 0 ? `0'00"` : fmtPace(REPS[k - 1].pace);
  rollText(prev, fmtPace(r.pace), 64, 590, { size: 260, fam: NUM, color: C.white }, P(t, t0 + .02, t0 + .42));
  // 거리 진행 바 0 → 2000m
  const mx = 72, my = 660, mww = W - 144;
  const du = E.ioC(P(t, t0 + .1, bt(11)));
  const m = Math.round(SETD * du);
  ctx.save(); rrect(mx, my - 7, mww, 14, 7); ctx.fillStyle = C.bg3; ctx.fill();
  rrect(mx, my - 7, Math.max(14, mww * du), 14, 7); ctx.fillStyle = C.lime; ctx.fill(); ctx.restore();
  const NQ = SETD / 500;
  for (let q = 0; q <= NQ; q++) {
    const x = mx + mww * q / NQ; const on = du >= q / NQ - .001, big = q % 2 === 0;
    line(x, my + 12, x, my + (big ? 24 : 18), 1, { color: C.white, w: 2, alpha: on ? .8 : .3 });
    if (big) txt(`${q * 500}m`, x, my + 50, { size: 20, fam: MONO, weight: 700, color: on ? C.white : C.mute, align: q === 0 ? 'left' : q === NQ ? 'right' : 'center', alpha: on ? .85 : .5 });
  }
  circle(mx + mww * du, my, 13, { fill: C.white }); circle(mx + mww * du, my, 6, { fill: C.lime });
  const done = E.outB(P(t, bt(11), bt(11) + .25));
  if (done > 0) pill(W - 72, my - 46, `${SETD}m 완주`, { size: 26, fill: C.lime, align: 'right', scale: done });
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
    if (cs > 0 && hitOf(r)) { circle(W - 90, gy - 42, 18 * cs, { fill: C.lime }); check(W - 90, gy - 42, 18 * cs, P(t, bt(1) + .15, bt(1) + .4)); txt('적중', W - 118, gy - 32, { size: 28, weight: 900, color: C.lime, align: 'right', alpha: cs }); }
    else if (cs > 0) txt(`목표보다 ${Math.round(r.pace) - r.hi}초 느림`, W - 72, gy - 32, { size: 28, weight: 900, color: ZC[3], align: 'right', alpha: cs });
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
  txt(`${SETD}m 동안의 심박 변화`, 72, gyy - 10, { size: 22, weight: 800, alpha: .7 });
  const head = hrGraph(72, gyy, W - 144, ghh, REPWIN[k][0], REPWIN[k][1], E.ioC(P(t, bt(2), bt(11) + .1)), { lo: 110, hi: 186, band: .12, zoneLabels: true, lw: 5, glow: true });
  if (head) { circle(head[0], head[1], 8, { fill: ZC[zoneOf(head[2][2])] }); txt(`${Math.round(head[2][2])}`, Math.min(head[0] + 14, W - 120), head[1] - 12, { size: 26, fam: NUM, weight: 400 }); }
  ctx.restore();
  // 세트 페이스 칩
  for (let i = 0; i < SETN + 1; i++) {
    const cwid = (W - 144 - 18 * SETN) / (SETN + 1), x = 72 + i * (cwid + 18), on = i === k, dn = i < k;
    ctx.save(); ctx.globalAlpha = on ? 1 : dn ? .55 : .2; rrect(x, 1205, cwid, 50, 25);
    if (on) { ctx.fillStyle = C.lime; ctx.fill(); } else { ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.stroke(); }
    txt(i <= k ? fmtPace(REPS[i].pace) : i < SETN ? `${i + 1}세트` : '라스트 2000m', x + cwid / 2, 1241, { size: i <= k ? 32 : 22, fam: i <= k ? NUM : KR, weight: i <= k ? 400 : 700, color: on ? C.bg : C.white, align: 'center' });
    ctx.restore();
  }
  const ou = E.inC(P(t, bt(12) - .12, bt(12)));
  if (ou > 0) { ctx.save(); ctx.globalAlpha = .9; ctx.fillStyle = C.lime; ctx.fillRect(0, H * (1 - ou), W, 14); ctx.restore(); }
}

// 세트 뒤 회복 (6박): 거리·시간·페이스·평균 심박 · 급수·휴식 · 회복 심박 그래프 · 다음 세트 목표
function sRecSet(t, k) {
  const r = RECSETS[k], t0 = b(SEQ.rec[k]), bt = i => b(SEQ.rec[k] + i);
  bgFill(C.deep, .1 + .08 * pulse(t, 5), 540, 820, '92,200,255');
  const wl = 1 - E.outX(P(t, t0, t0 + .3)); if (wl > 0) { ctx.fillStyle = C.sky; ctx.globalAlpha = .9; ctx.fillRect(0, H * (1 - wl), W, H * wl); ctx.globalAlpha = 1; }
  sectionLabel(`${k + 1}세트 후 회복`, `0${k + 1}`, t0, t, C.sky);
  maskText(`회복 ${k + 1}`, 72, 330, { size: 120, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  maskText('랩 버튼까지 자유 조깅', 72, 400, { size: 32, weight: 800, color: C.sky }, 1 - E.outX(P(t, t0 + .1, t0 + .4)));
  // 오른쪽 큰 거리
  const du = E.outX(P(t, t0 + .1, t0 + .4));
  ctx.save(); ctx.globalAlpha = du; ctx.translate(W - 72, 330);
  const mW = measure('m', 50, 900); txt('m', 0, 0, { size: 50, weight: 900, color: C.sky, align: 'right' });
  const dS = String(r10(r.dist)); txt(dS, -mW - 8, 0, { size: 150, fam: NUM, weight: 400, color: C.sky, align: 'right' });
  txt('약', -mW - 8 - measure(dS, 150, 400, NUM) - 12, 0, { size: 46, weight: 900, color: C.white, align: 'right' }); ctx.restore();
  // 수치 한 줄
  const items = [[fmtDur(r.time), '', '회복 시간'], [fmtPace(r.pace), '', '평균 페이스'], [String(r.hr), 'bpm', '평균 심박']];
  items.forEach(([v, u, l], i) => {
    const ui = E.outX(P(t, bt(1) + i * .08, bt(1) + .35 + i * .08)), x = 72 + i * 330, y = 560;
    maskText(v, x - 2, y, { size: 100, fam: NUM, weight: 400 }, 1 - ui);
    if (u) maskText(u, x + measure(v, 100, 400, NUM) + 8, y, { size: 30, weight: 900, color: C.sky }, 1 - ui);
    maskText(l, x, y + 42, { size: 24, weight: 700, alpha: .6 }, 1 - ui);
  });
  // 급수·휴식
  const pu = E.outX(P(t, bt(2), bt(2) + .3));
  ctx.save(); ctx.globalAlpha = pu; drop(86, 672, 11, C.sky); ctx.restore();
  maskText(`급수 휴식 ${r.pause}초 혹은 시계 멈추고 완전휴식`, 110, 684, { size: 30, weight: 800, color: C.white }, 1 - pu);
  // 세트 끝 ~ 다음 세트 시작 심박 (회복 구간 음영)
  const a0 = r.win[0] - 90, a1 = r.win[1] + 40, gx = 72, gy = 760, gw = W - 144, gh = 330;
  const X = s => gx + gw * (s - a0) / (a1 - a0);
  const ga = P(t, bt(2), bt(2) + .2);
  if (ga > 0) {
    ctx.save(); ctx.globalAlpha = ga;
    txt('세트 끝 → 회복 → 다음 세트 심박 변화', gx, gy - 14, { size: 22, weight: 800, alpha: .7 });
    ctx.save(); ctx.globalAlpha *= .14; ctx.fillStyle = C.sky; ctx.fillRect(X(r.win[0]), gy, X(r.win[1]) - X(r.win[0]), gh); ctx.restore();
    txt('회복', (X(r.win[0]) + X(r.win[1])) / 2, gy + gh + 34, { size: 22, weight: 800, color: C.sky, align: 'center' });
    txt(`${k + 1}세트`, gx + 6, gy + gh + 34, { size: 22, weight: 800, alpha: .7 });
    txt(k < SETN - 1 ? `${k + 2}세트` : '라스트', gx + gw - 6, gy + gh + 34, { size: 22, weight: 800, alpha: .7, align: 'right' });
    const hd = hrGraph(gx, gy, gw, gh, a0, a1, E.ioC(P(t, bt(2), bt(5))), { lo: 100, hi: 186, band: .1, zoneLabels: true, lw: 5, glow: true });
    PAUSES.filter(([s0]) => s0 >= a0 && s0 <= a1).forEach(([s0, d]) => {
      if (!hd || hd[2][0] < s0) return; const x = X(s0 + d / 2);
      line(x, gy + 40, x, gy + gh, 1, { color: C.sky, w: 2, alpha: .6, dash: [5, 6] }); drop(x, gy + 18, 10, C.sky);
    });
    if (hd) { circle(hd[0], hd[1], 8, { fill: ZC[zoneOf(hd[2][2])] }); txt(`${Math.round(hd[2][2])}`, Math.min(hd[0] + 14, W - 110), hd[1] - 12, { size: 26, fam: NUM, weight: 400 }); }
    ctx.restore();
  }
  // 다음 세트 목표
  const nx = k < SETN - 1 ? REPS[k + 1] : FINAL, nl = k < SETN - 1 ? `${k + 2}세트 목표` : '마지막 2000m 목표';
  const nu = E.outB(P(t, bt(4), bt(4) + .25));
  if (nu > 0) { const s1 = `${nl} ${fmtPace(nx.lo)}~${fmtPace(nx.hi)}`; pill(72, 1205, `다음 · ${s1}`, { size: 30, fill: C.lime, scale: nu }); }
  const ou = E.inC(P(t, bt(6) - .12, bt(6)));
  if (ou > 0) { ctx.save(); ctx.globalAlpha = .9; ctx.fillStyle = C.lime; ctx.fillRect(0, H * (1 - ou), W, 14); ctx.restore(); }
}

// 분석 ①: 세션 전체 심박 변화 추이 (1마디, base 비트부터)
function sChart(t, base, len = 8) {
  const t0 = b(base), bt = i => b(base + i), q = len / 4;
  bgFill(C.bg, .06 + .08 * pulse(t, 7));
  sectionLabel('심박 변화 추이', '05', t0, t);
  maskText('세션 전체', 72, 300, { size: 76, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  maskText('심박 그래프', 72, 394, { size: 76, weight: 900, color: C.coral }, 1 - E.outX(P(t, t0 + .15, t0 + .45)));
  const gx = 72, gy = 480, gw = W - 144, gh = 600, T = SESSION_T;
  const X = s => gx + gw * s / T;
  REPWIN.concat([FINALWIN]).forEach(([a, c], i) => {
    const u = E.outX(P(t, t0 + .2 + i * .25, t0 + .5 + i * .25)); if (u <= 0) return;
    ctx.save(); ctx.globalAlpha = .1 * u; ctx.fillStyle = C.white; ctx.fillRect(X(a), gy, X(c) - X(a), gh); ctx.restore();
    txt(i < SETN ? `${i + 1}세트` : '라스트', (X(a) + X(c)) / 2, gy + gh + 40, { size: 22, weight: 800, color: C.white, align: 'center', alpha: u * .8 });
  });
  const head = hrGraph(gx, gy, gw, gh, 0, T, E.ioC(P(t, t0 + .1, bt(Math.round(3 * q)))), { lo: 95, hi: 186, band: .13, zoneLabels: true, lw: 4 });
  if (head) {
    pauseMarks(X, gy, gh, head[2][0]);
    line(head[0], gy, head[0], gy + gh, 1, { color: C.white, w: 1.5, alpha: .4 });
    circle(head[0], head[1], 9, { fill: ZC[zoneOf(head[2][2])] });
    txt(`${Math.round(head[2][2])} bpm`, Math.min(head[0] + 14, gx + gw - 150), head[1] - 16, { size: 28, fam: NUM, weight: 400 });
  }
  maskText('세트마다 최대 심박 160 → 164 → 170 → 175', 72, 1200, { size: 30, weight: 800, color: C.white }, 1 - E.outX(P(t, bt(Math.round(2 * q)), bt(Math.round(2 * q)) + .3)));
  const lg = E.outX(P(t, bt(Math.round(3 * q)), bt(Math.round(3 * q)) + .3));
  ctx.save(); ctx.globalAlpha = lg; drop(84, 1236, 9, C.sky); ctx.restore();
  maskText('그래프가 끊긴 곳 = 급수·완전 휴식 (시계 일시정지)', 104, 1244, { size: 26, weight: 700, color: C.sky }, 1 - lg);
}

// S4-B: 라스트 — 마지막 2000m (b52 ~ b64)
function sFinal(t) {
  const t0 = b(70);
  const z = E.inX(P(t, b(79) - .05, b(80)));
  bgFill(C.bg, .06 + .06 * pulse(t, 6), 540, 640);
  speedLines(t, .8, 70);
  ctx.save(); ctx.translate(540, 640); ctx.scale(1 + z * 3, 1 + z * 3); ctx.translate(-540, -640);
  sectionLabel('마지막 세트', '04', t0, t);
  maskText('라스트', 72, 330, { size: 110, weight: 900, color: C.white }, 1 - E.outX(P(t, t0, t0 + .3)));
  maskText('스퍼트', 72, 460, { size: 110, weight: 900, color: C.lime }, 1 - E.outX(P(t, b(71), b(71) + .3)));
  // 오른쪽: 마지막 세트 거리
  const du = E.outX(P(t, b(71), b(71) + .3));
  if (du > 0) {
    const ds = lerp(1.5, 1, du);
    ctx.save(); ctx.translate(W - 72, 460); ctx.scale(ds, ds); ctx.globalAlpha *= P(t, b(71), b(71) + .08);
    const mW = measure('m', 60, 900);
    txt('m', 0, 0, { size: 60, weight: 900, color: C.lime, align: 'right' });
    txt(String(FINAL.dist), -mW - 8, 0, { size: 200, fam: NUM, weight: 400, color: C.lime, align: 'right' });
    ctx.restore();
    maskText('마지막 세트', W - 72, 250, { size: 32, weight: 800, color: C.white, align: 'right', alpha: .75 }, 1 - du);
  }
  const su = E.outX(P(t, b(72), b(72) + .3));
  if (su > 0) {
    const sc = lerp(1.5, 1, su); const s = fmtPace(FINAL.pace);
    for (let e = 3; e >= 0; e--) {
      ctx.save(); ctx.translate(72 - e * 34 * (1 - su * .4), 820); ctx.scale(sc, sc);
      txt(s, 0, 0, { size: 320, fam: NUM, weight: 400, color: e ? '#6B7480' : C.white, alpha: e ? (.13 / e) * su : su }); ctx.restore();
    }
  }
  maskText('목표 범위 적중 · 가장 빠른 세트', 72, 910, { size: 42, weight: 800, color: C.white }, 1 - E.outX(P(t, b(73), b(73) + .3)));
  const pu = E.outB(P(t, b(74), b(74) + .25));
  const tg = `목표 ${fmtPace(FINAL.lo)}~${fmtPace(FINAL.hi)}`;
  if (pu > 0) { pill(72, 1000, tg, { size: 30, color: C.white, scale: pu }); pill(72 + measure(tg, 30, 800) + 39 + 20, 1000, `평균 심박 ${FINAL.hr} · 최대 ${FINAL.max}`, { size: 30, fill: C.lime, scale: E.outB(P(t, b(75), b(75) + .25)) }); }
  // 마지막 2000m 심박 변화
  const ga = P(t, b(76), b(76) + .2);
  if (ga > 0) {
    ctx.save(); ctx.globalAlpha = ga;
    txt('2000m 동안의 심박 변화', 72, 1078, { size: 22, weight: 800, alpha: .7 });
    const hd = hrGraph(72, 1090, W - 144, 140, FINALWIN[0], FINALWIN[1], E.ioC(P(t, b(76), b(79))), { lo: 110, hi: 186, band: .12, zoneLabels: true, lw: 5, glow: true });
    if (hd) circle(hd[0], hd[1], 8, { fill: ZC[zoneOf(hd[2][2])] });
    ctx.restore();
  }
  ctx.restore();
  if (z > 0) { ctx.fillStyle = `rgba(8,21,33,${z})`; ctx.fillRect(0, 0, W, H); }
}

// S5: 회복 조깅
function sRecovery(t) {
  const t0 = b(64);
  bgFill(C.deep, .1 + .08 * pulse(t, 5), 540, 900, '92,200,255');
  const inU = E.outX(P(t, t0, t0 + .35)), off = 1 - inU;
  sectionLabel('회복구간', '03', t0, t, C.sky);
  maskText('회복구간', 72, 400, { size: 110, weight: 900, color: C.white }, off);
  // 제목 옆 정보: 회복 목표 유지 · 총 거리/시간 · 급수·휴식
  const rx = 560;
  ctx.save(); ctx.globalAlpha = inU;
  txt('랩 버튼까지 자유 조깅', rx, 272, { size: 30, weight: 900, color: C.sky });
  txt('총 거리', rx, 318, { size: 22, weight: 700, alpha: .6 }); txt(RECTOT.km, rx, 380, { size: 48, fam: NUM, weight: 400 });
  txt('km', rx + measure(RECTOT.km, 48, 400, NUM) + 6, 380, { size: 22, weight: 900, color: C.sky });
  txt('총 시간', rx + 190, 318, { size: 22, weight: 700, alpha: .6 }); txt(RECTOT.time, rx + 190, 380, { size: 48, fam: NUM, weight: 400 });
  drop(rx + 12, 424, 9, C.sky);
  txt(`급수·휴식 ${PAUSES.length}회 · ${fmtDur(PAUSES.reduce((a, p) => a + p[1], 0))}`, rx + 32, 434, { size: 26, weight: 800, alpha: .85 });
  ctx.restore();
  // 평균값 (한 번에)
  maskText(`회복 조깅 ${RECS.length}회 평균`, 72, 540, { size: 30, weight: 800, color: C.sky }, off);
  const avg = [[String(r10(RECAVG.dist)), 'm', '평균 회복 거리(약)'], [fmtPace(RECAVG.pace), '', '평균 페이스'], [String(RECAVG.hr), 'bpm', '평균 심박']];
  avg.forEach(([v, u, l], i) => {
    const x = 72 + i * 320, y = 680;
    const bump = 1 + .03 * pulse(t, 8, 64, 71);
    ctx.save(); ctx.translate(x, y); ctx.scale(bump, bump); ctx.translate(-x, -y);
    maskText(v, x - 2, y, { size: 120, fam: NUM, weight: 400, color: i === 0 ? C.sky : C.white }, off);
    if (u) maskText(u, x + measure(v, 120, 400, NUM) + 6, y, { size: 32, weight: 900, color: C.sky }, off);
    ctx.restore();
    maskText(l, x, y + 46, { size: 26, weight: 700, alpha: .65 }, off);
  });
  // 구간별 칩 (한 번에 표시, 비트마다 하나씩 하이라이트)
  maskText('구간별 회복 페이스', 72, 850, { size: 26, weight: 800, alpha: .7 }, off);
  const lb = lastBeat(t), hi = lb >= 65 ? (lb - 65) % RECS.length : -1;
  RECS.forEach((p, i) => {
    const cwid = (W - 144 - 18 * (RECS.length - 1)) / RECS.length, x = 72 + i * (cwid + 18), y = 950, on = i === hi;
    const g = on ? Math.exp(-(t - B[lb]) * 3) : 0;
    ctx.save(); ctx.globalAlpha = inU; ctx.translate(0, off * 40);
    rrect(x, y - 52, cwid, 104, 18);
    ctx.fillStyle = `rgba(92,200,255,${.08 + .3 * g})`; ctx.fill();
    ctx.strokeStyle = on ? C.sky : 'rgba(92,200,255,.45)'; ctx.lineWidth = on ? 3 : 2; ctx.stroke();
    txt(fmtPace(p), x + cwid / 2, y + 18, { size: 52, fam: NUM, weight: 400, color: C.white, align: 'center' });
    txt(`회복 ${i + 1}`, x + cwid / 2, y + 88, { size: 22, weight: 700, color: C.sky, align: 'center' });
    ctx.restore();
  });
  // 비트에 맞춰 숨쉬는 바
  const bw = (W - 144) * (.35 + .65 * pulse(t, 4, 64, 71));
  ctx.save(); ctx.globalAlpha = .5 * inU; rrect(540 - bw / 2, 1120, bw, 6, 3); ctx.fillStyle = C.sky; ctx.fill(); ctx.restore();
  txt('다음 세트를 위한 준비', 540, 1180, { size: 26, weight: 700, color: C.sky, align: 'center', alpha: .7 * inU });
  const ou = P(t, b(72) - .2, b(72)); if (ou > 0) { ctx.fillStyle = `rgba(11,13,16,${ou})`; ctx.fillRect(0, 0, W, H); }
}

// S6: 분석 (마디 18~23): 존 분석 2마디 · 다이내믹스 · 심박 회복 · 5/5 · 훈련 효과
const ZNAME = ['워밍업', '쉬움', '유산소', '역치', '최대'];
function sAnalysis(t) {
  if (t < b(SEQ.donut)) return sChart(t, SEQ.chart, SEQ.donut - SEQ.chart);
  // 도넛(4박) → 세트별 심박존(4박) · 목표 적중 결과와 러닝 다이내믹스는 카드에서만
  const k = t < b(SEQ.zones) ? 0 : 1, base = k === 0 ? SEQ.donut : SEQ.zones, sk = k === 0 ? 1 : 2;
  const t0 = b(base), bt = i => b(base + i);
  bgFill(C.bg, .1 + .12 * pulse(t, 7), 540, 760);
  const enter = 1 - E.outX(P(t, t0, t0 + .3));
  const labels = ['심박존 분석', '세트별 심박존', '러닝 다이내믹스', '심박 회복', '결과', '훈련 효과'];
  sectionLabel(labels[k], pad2(5 + sk), t0, t);
  if (k === 0) {
    maskText('본훈련', 72, 300, { size: 64, weight: 900, color: C.white }, enter);
    maskText('심박존 분석', 72, 384, { size: 76, weight: 900, color: ZC[3] }, 1 - E.outX(P(t, t0 + .1, t0 + .4)));
    // 도넛
    const cx = 330, cy = 760, R = 210, du = E.ioC(P(t, t0 + .1, bt(2)));
    const tot = MAINZ.reduce((a, c) => a + c, 0); let a0 = -Math.PI / 2;
    circle(cx, cy, R, { stroke: C.bg3, w: 70 });
    MAINZ.forEach((v, i) => { const da = Math.PI * 2 * v / tot * du; if (da > 0) circle(cx, cy, R, { stroke: ZC[i], w: 70, a0, a1: a0 + da }); a0 += Math.PI * 2 * v / tot * du; });
    txt('Z4', cx, cy - 78, { size: 44, weight: 900, color: ZC[3], align: 'center', alpha: du });
    txt(`${Math.round(MAINZ4 * du)}%`, cx, cy + 66, { size: 110, fam: NUM, weight: 400, align: 'center', alpha: du });
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
    const all = [...REPZ, FINALZ], nA = all.length; const cw = 170, gap = (W - 144 - nA * cw) / (nA - 1), y0 = 1080, hh = 520;
    all.forEach((z, i) => {
      const u = E.outC(P(t, t0 + i * .16, t0 + i * .16 + .45)); const tot = z.reduce((a, c) => a + c, 0);
      const x = 72 + i * (cw + gap); let y = y0;
      ctx.save(); rrect(x, y0 - hh, cw, hh, 12); ctx.clip(); ctx.fillStyle = C.bg3; ctx.fillRect(x, y0 - hh, cw, hh);
      z.forEach((v, j) => { const h = hh * v / tot * u; ctx.fillStyle = ZC[j]; ctx.fillRect(x, y - h, cw, h + .5); y -= h; });
      ctx.restore();
      const hiPct = Math.round((z[3] + z[4]) / tot * 100);
      txt(`${Math.round(hiPct * u)}%`, x + cw / 2, y0 - hh - 18, { size: 40, fam: NUM, weight: 400, align: 'center', alpha: u });
      txt(i < SETN ? `${i + 1}세트` : '라스트', x + cw / 2, y0 + 40, { size: 22, weight: 800, align: 'center', alpha: .7 });
    });
    maskText('% = Z4 + Z5 비중', 72, 1180, { size: 28, weight: 700, color: C.white, alpha: .6 }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    const ouz = E.inC(P(t, b(SEQ.outro) - .25, b(SEQ.outro)));
    if (ouz > 0) { ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W * ouz, H); }
    // 두 번째 마디: 세트를 하나씩 짚으며 존 구성 설명
    if (t >= bt(2)) {
      const span = (bt(4) - bt(2)) / nA, hi = clamp(Math.floor((t - bt(2)) / span), 0, nA - 1), z = all[hi], tot = z.reduce((a, c) => a + c, 0);
      const x = 72 + hi * (cw + gap);
      ctx.save(); rrect(x - 6, y0 - hh - 6, cw + 12, hh + 12, 16); ctx.strokeStyle = C.lime; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      const parts = z.map((v, j) => [j, Math.round(v / tot * 100)]).filter(([, p]) => p >= 5).sort((a, c) => c[1] - a[1]);
      const head = hi < SETN ? `${hi + 1}세트 ${fmtPace(REPS[hi].pace)}` : `라스트 ${fmtPace(FINAL.pace)}`;
      txt(head, 72, 1232, { size: 30, weight: 900, color: C.lime });
      let px = 72 + measure(head, 30, 900) + 22;
      parts.forEach(([j, p]) => { const sTxt = `Z${j + 1} ${p}%`; txt(sTxt, px, 1232, { size: 28, fam: MONO, weight: 700, color: ZC[j] }); px += measure(sTxt, 28, 700, MONO) + 20; });
    }
  } else if (k === 2) {
    maskText('러닝 다이내믹스', 72, 340, { size: 76, weight: 900, color: C.white }, enter);
    const rows = [['188', 'spm', '케이던스', 150], ['1.23', 'm', '보폭', 0], ['217', 'ms', '지면 접촉 시간', 150]];
    rows.forEach(([v, u_, l, from], i) => {
      const u = E.outX(P(t, t0 + i * .25, t0 + i * .25 + .3)); const y = 560 + i * 210;
      const cnt = E.outQ(P(t, t0 + i * .25, t0 + i * .25 + .6));
      const vv = v.includes('.') ? (parseFloat(v) * cnt).toFixed(2) : String(Math.round(lerp(from, parseFloat(v), cnt)));
      maskText(vv, 66, y, { size: 200, fam: NUM, weight: 400 }, 1 - u);
      maskText(u_, 72 + measure(vv, 200, 400, NUM) + 12, y, { size: 52, weight: 900, color: C.lime }, 1 - u);
      maskText(l, 640, y - 20, { size: 34, weight: 800, alpha: .7 }, 1 - u);
    });
    const te = E.outX(P(t, bt(2), bt(2) + .3));
    maskText('훈련 효과', 72, 1190, { size: 30, weight: 800, alpha: .7 }, 1 - te);
    maskText('유산소 4.0', 230, 1190, { size: 30, weight: 900, color: C.lime }, 1 - te);
    maskText('무산소 1.3', 400, 1190, { size: 30, weight: 900, color: C.sky }, 1 - te);
    const ou2 = E.inC(P(t, b(96) - .25, b(96)));
    if (ou2 > 0) { ctx.fillStyle = C.lime; ctx.fillRect(0, 0, W * ou2, H); }
    const steps = Math.floor((t - t0) * 3.1);
    for (let i = 0; i < 6; i++) { const sIdx = steps - i; if (sIdx < 0) continue; const x = 980 - i * 60, y = 1180 + (sIdx % 2 ? -18 : 18);
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
    const allS = [...REPS, FINAL], nHit = allS.filter(hitOf).length;
    ctx.save(); ctx.translate(540, 640); ctx.scale(sc, sc); txt(`${nHit}/${allS.length}`, 0, 0, { size: 440, fam: NUM, weight: 400, color: C.lime, align: 'center' }); ctx.restore();
    maskText(`${allS.length}세트 중 ${nHit}세트 목표 페이스 적중`, 540, 760, { size: 56, weight: 900, color: C.white, align: 'center' }, 1 - E.outX(P(t, bt(1), bt(1) + .3)));
    allS.forEach((r, i) => {
      const tt = t0 + i * (bt(3) - t0) / allS.length; const u = E.outB(P(t, tt, tt + .25));
      const x = 540 + (i - (allS.length - 1) / 2) * 190, y = 920;
      if (hitOf(r)) { circle(x, y, 52 * u, { fill: C.lime }); check(x, y, 52 * u, P(t, tt + .05, tt + .3)); }
      else { circle(x, y, 52 * u, { stroke: ZC[3], w: 5 }); txt(`+${Math.round(r.pace) - r.hi}초`, x, y + 12, { size: 34, fam: NUM, weight: 400, color: ZC[3], align: 'center', alpha: u }); }
      txt(fmtPace(r.pace), x, y + 104, { size: 38, fam: NUM, weight: 400, color: C.white, align: 'center', alpha: u });
    });
    txt('1세트는 목표 상한보다 1초 느렸지만 이후 세트는 모두 범위 안', 540, 1150, { size: 26, weight: 700, align: 'center', alpha: .6 * P(t, bt(3), bt(3) + .3) });
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
    track({ x: 540, y: 1150, s: 4.2, tilt: .45 }, { fill: C.track, infield: C.bg, runner: lerp(0, 400, E.ioC(P(t, t0, endT))), trail: 160, alpha: .45 });
    sectionLabel('정리', '08', t0, t);
    maskText('이 훈련은', 72, 280, { size: 64, weight: 900, color: C.white }, 1 - E.outX(P(t, b(96) + .2, b(96) + .5)));
    // 핵심: 빌드업 롱 인터벌
    const hu = E.outX(P(t, b(97), b(97) + .3));
    if (hu > 0) {
      const hs = lerp(1.35, 1, hu), hw = measure('빌드업 롱 인터벌', 108, 900);
      ctx.save(); ctx.translate(72, 410); ctx.scale(hs, hs); ctx.globalAlpha *= P(t, b(97), b(97) + .06);
      rrect(-14, -96, (hw + 28) * E.outX(P(t, b(97), b(97) + .22)), 124, 16); ctx.fillStyle = C.lime; ctx.fill();
      txt('빌드업 롱 인터벌', 0, 0, { size: 108, weight: 900, color: C.bg });
      ctx.restore();
      line(72, 470, 72 + 60 * hu, 470, 1, { color: C.lime, w: 4 });
      maskText(`3000m를 반복할수록 더 빠르게 — ${fmtPace(REPS[0].pace)} → ${fmtPace(REPS[2].pace)}`, 150, 482, { size: 30, weight: 800, color: C.lime }, 1 - E.outX(P(t, b(97) + .3, b(97) + .6)));
    }
    const pts = [
      ['목적', '젖산역치(LT) 향상과', '레이스 페이스 지속력 강화'],
      ['방식', '3000m × 3 + 2000m 빌드업 · 세트마다 목표 -5초', '사이사이 약 570m 회복 조깅'],
      ['결과', `${fmtPace(REPS[0].pace)} → ${fmtPace(REPS[2].pace)} · 마지막 2000m ${fmtPace(FINAL.pace)}`, `본훈련 ${MAINZ4}%를 역치(Z4)에서 소화`],
    ];
    pts.forEach(([h, l1, l2], i) => {
      const tb = b(98 + i * 2); const u = E.outX(P(t, tb, tb + .35));
      const y = 580 + i * 170;
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
  txt('3KM', x, y, { size: 40, fam: NUM, weight: 400, color: col }); x += measure('3KM', 40, 400, NUM) + 4;
  txt('×3', x, y, { size: 40, fam: NUM, weight: 400, color: dark ? C.bg : C.lime }); x += measure('×3', 40, 400, NUM) + 10;
  txt('+2KM', x, y, { size: 40, fam: NUM, weight: 400, color: col }); x += measure('+2KM', 40, 400, NUM) + 14;
  txt('롱 인터벌', x, y - 4, { size: 24, weight: 800, color: dark ? C.bg : C.lime });
  ctx.restore();
}
const SECS = [[0, '훈련 소개'], [5.503, '요약'], [9.427, '1세트'], [15.279, '회복 1'], [18.228, '2세트'], [24.079, '회복 2'], [27.028, '3세트'], [32.879, '회복 3'], [35.805, '마지막 2000m'], [40.681, '심박 분석'], [48.483, '정리']];
function hud(t, dark = false) {
  if (t < .25 || t >= b(105)) return;
  const a = P(t, .25, .6);
  const col = dark ? C.bg : C.white;
  ctx.save(); ctx.globalAlpha = a;
  titleBadge(t, col, dark);
  // 세션 진행 (영상 진행 → 세션 거리로 매핑)
  const km = (RUN.dist * clamp((t - .1) / (b(105) - .1))).toFixed(2);
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
  const pk = t > b(16) && t < b(96) ? pulse(t, 12) * .012 : t > b(0) && t < b(16) ? pulse(t, 12) * .006 : 0;
  ctx.save(); ctx.translate(540, 675); ctx.scale(1 + pk, 1 + pk); ctx.translate(-540, -675);
  let dark = false;
  if (t < b(8)) {
    sIntro(t);
    if (t < .45) { // 커버에서 인트로로: 커버가 줄어들며 슬랫으로 걷힘
      const u = P(t, .1, .45);
      ctx.save(); ctx.beginPath();
      for (let i = 0; i < 6; i++) { const su = E.inC(clamp(u * 1.4 - i * .08)); const sh = H / 6; ctx.rect(0, i * sh + sh * su, W, sh * (1 - su)); }
      ctx.clip(); ctx.translate(540, 675); ctx.scale(1 - u * .06, 1 - u * .06); ctx.translate(-540, -675); drawCover(t); ctx.restore();
    }
  }
  else if (t < b(16)) { sSummary(t); if (t < b(8) + .6) titleGroup(t, E.ioQ(P(t, b(8), b(8) + .5))); }
  else if (t < b(SEQ.last)) {
    const lb = lastBeat(t); let k = 0; while (k < SETN - 1 && lb >= SEQ.set[k + 1]) k++;
    if (lb >= SEQ.rec[k]) sRecSet(t, k); else sReps(t, k);
  }
  else if (t < b(SEQ.chart)) sFinal(t);
  else if (t < b(SEQ.outro)) sAnalysis(t);
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
