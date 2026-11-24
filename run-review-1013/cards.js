/* 피드 캐러셀 카드 (영상 다음 슬라이드들) — 1080×1350 정지 이미지
 * scene.js의 데이터/헬퍼를 그대로 사용한다. node render.mjs --cards 로 out/cards/*.png 저장.
 */
const TOTAL_SLIDES = 8; // 1 = 영상, 2~8 = 카드

/* 우주로 달리기 로고: 행성 + 트랙 모양 궤도 + 러너 */
function drawLogo(cx, cy, s, o = {}) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  const rot = rad(-16), rx = 230, ry = 70;
  const orbit = (a0, a1, w, col, alpha) => {
    ctx.save(); ctx.rotate(rot); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0, a1); ctx.stroke(); ctx.restore();
  };
  // 궤도 뒤쪽 (행성 뒤)
  orbit(Math.PI, Math.PI * 2, 16, '#3A2A24', 1);
  orbit(Math.PI, Math.PI * 2, 2, C.trackLine, .5);
  // 행성
  const g = ctx.createRadialGradient(-50, -60, 10, 0, 0, 140);
  g.addColorStop(0, '#F2FF9E'); g.addColorStop(.55, C.lime); g.addColorStop(1, '#6E8A10');
  ctx.save(); ctx.shadowColor = 'rgba(212,255,58,.45)'; ctx.shadowBlur = o.glow == null ? 60 : o.glow;
  ctx.beginPath(); ctx.arc(0, 0, 130, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  // 행성 표면 레인 무늬
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 130, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(11,13,16,.18)'; ctx.lineWidth = 6;
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(0, k * 46, 150, 22, rot, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  // 궤도 앞쪽 (행성 앞) — 트랙 레인
  orbit(0, Math.PI, 16, '#3A2A24', 1);
  orbit(0, Math.PI, 2, C.trackLine, .7);
  // 러너 + 잔상
  ctx.save(); ctx.rotate(rot);
  for (let k = 0; k < 18; k++) {
    const a = Math.PI * .28 + k * .035; ctx.globalAlpha = (1 - k / 18) * .9;
    ctx.fillStyle = C.lime; ctx.beginPath(); ctx.arc(rx * Math.cos(a), ry * Math.sin(a), 9 - k * .4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.shadowColor = C.lime; ctx.shadowBlur = 24; ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(rx * Math.cos(Math.PI * .28), ry * Math.sin(Math.PI * .28), 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

/* '우주로 달리기' 로고타입 — 피드 톤(흰색 + 라임). window.BRAND_VARIANT: 'A' | 'B' | 'C'
 * lines: [['우주로', dx], ['달리기', dx]] (한 줄이면 [['우주로 달리기', 0]]) */
const BRAND_FONT = '"yg-jalnan"';
window.BRAND_VARIANT = 'S';
/* S(심플): 흰색 한 색, 장식 없음 — 서체만 바꿔 쓴다 */
window.BRAND_SIMPLE_FONT = '"Hahmlet"'; window.BRAND_SIMPLE_WEIGHT = 800;
function woojuroText(cx, cy, size, lines = [['우주로', -.3], ['달리기', .3]], lh = .9) {
  const v = window.BRAND_VARIANT, one = lines.length === 1;
  ctx.save(); ctx.translate(cx, cy); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  // 한 줄 표기는 '우주로'(흰색) + '달리기'(라임) 두 조각으로 그린다
  const parts = s => s.includes(' ') ? [[s.split(' ')[0], C.white], [s.split(' ')[1], C.lime]] : [[s, s === '달리기' ? C.lime : C.white]];
  const drawPieces = (s, x, y, fontStr, fx) => {
    ctx.font = fontStr; const ps = parts(s);
    const ws = ps.map(([p]) => ctx.measureText(p).width), sp = ps.length > 1 ? size * .22 : 0;
    let px = x - (ws.reduce((a, c) => a + c, 0) + sp) / 2;
    ps.forEach(([p, col], k) => { fx(p, px + ws[k] / 2, y, col); px += ws[k] + sp; });
  };
  if (v === 'S') {          // 흰색 · 가운데 정렬 · 장식 없음
    const lhS = one ? 0 : 1.0, y0 = -((lines.length - 1) * size * lhS) / 2 + size * .36;
    ctx.font = `${window.BRAND_SIMPLE_WEIGHT || 400} ${size}px ${window.BRAND_SIMPLE_FONT}`; ctx.fillStyle = C.white;
    lines.forEach(([s], i) => ctx.fillText(s, 0, y0 + i * size * lhS));
  } else if (v === 'A') {   // 프리텐다드 블랙 · 기울임 · 속도선
    ctx.transform(1, 0, -.16, 1, 0, 0);
    const lhA = one ? 0 : .98, y0 = -((lines.length - 1) * size * lhA) / 2 + size * .36;
    lines.forEach(([s, dx], i) => {
      const x = dx * size * .6, y = y0 + i * size * lhA;
      drawPieces(s, x, y, `900 ${size}px Pretendard`, (p, px, py, col) => { ctx.fillStyle = col; ctx.letterSpacing = `${-size * .04}px`; ctx.fillText(p, px, py); });
      if (!one && i === 1) {
        ctx.font = `900 ${size}px Pretendard`; const w = ctx.measureText(s).width;
        [[.34, .55], [.2, .38], [.06, .22]].forEach(([fy, len], k) => {
          ctx.fillStyle = C.lime; ctx.globalAlpha = .9 - k * .25;
          ctx.fillRect(x - w / 2 - size * (len + .12), y - size * fy - size * .035, size * len, size * .07);
        });
        ctx.globalAlpha = 1;
      }
    });
  } else if (v === 'B') {   // 잘난체 · 흰 글자 + 짙은 라임 입체
    ctx.transform(1, 0, -.12, 1, 0, 0);
    const y0 = -((lines.length - 1) * size * lh) / 2 + size * .36, depth = Math.max(2, Math.round(size * .06));
    lines.forEach(([s, dx], i) => {
      const x = dx * size, y = y0 + i * size * lh;
      drawPieces(s, x, y, `400 ${size}px ${BRAND_FONT}`, (p, px, py, col) => {
        for (let k = depth; k >= 1; k--) { ctx.fillStyle = col === C.lime ? '#5E7A00' : '#3A4A10'; ctx.fillText(p, px + k, py + k); }
        ctx.fillStyle = col; ctx.fillText(p, px, py);
      });
    });
  } else {                  // C: Black Han Sans 한 줄 + 트랙 곡선
    ctx.transform(1, 0, -.1, 1, 0, 0);
    const s = lines.map(l => l[0]).join(' '), sz = one ? size : size * .62;
    drawPieces(s, 0, sz * .36, `400 ${sz}px "Black Han Sans"`, (p, px, py, col) => { ctx.fillStyle = col; ctx.fillText(p, px, py); });
    if (!one) {
      ctx.font = `400 ${sz}px "Black Han Sans"`; const w = ctx.measureText(s).width;
      ctx.strokeStyle = C.lime; ctx.lineWidth = sz * .06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(0, sz * .62, w * .55, sz * .16, 0, Math.PI * .1, Math.PI * .9); ctx.stroke();
    }
  }
  ctx.restore();
}
function arrow(x, y, ang, size, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-size, -size * .45); ctx.lineTo(-size, size * .45); ctx.closePath(); ctx.fill(); ctx.restore();
}
/* 가민 워크아웃 구성 (FIT의 workout / workout_step에서 가져온 계획) */
const WORKOUT = {
  name: '3k*3 + 2k 롱 인터벌',
  steps: [
    ...REPS.flatMap(r => [{ run: true, dist: SETD, lo: r.lo, hi: r.hi }, { run: false }]),
    { run: true, dist: FINAL.dist, lo: FINAL.lo, hi: FINAL.hi, last: true },
  ],
};
function drawWorkoutPlan(x, y, w) {
  // 제목줄
  rrect(x, y - 30, 40, 40, 10); ctx.fillStyle = C.lime; ctx.fill();
  ctx.save(); ctx.strokeStyle = C.bg; ctx.lineWidth = 4; ctx.lineCap = 'round';
  [[-10, -4], [-10, 6]].forEach(() => {});
  line(x + 11, y - 18, x + 29, y - 18, 1, { color: C.bg, w: 4, cap: 'round' }); line(x + 11, y - 10, x + 29, y - 10, 1, { color: C.bg, w: 4, cap: 'round' }); line(x + 11, y - 2, x + 23, y - 2, 1, { color: C.bg, w: 4, cap: 'round' });
  ctx.restore();
  txt('가민 워크아웃', x + 56, y, { size: 26, weight: 800, alpha: .6 });
  txt(WORKOUT.name, x + 56 + measure('가민 워크아웃', 26, 800) + 14, y + 1, { size: 30, weight: 900 });
  // 스텝 타임라인 (길이 비례, 회복은 실제 평균 거리 비율로)
  const units = WORKOUT.steps.reduce((a, st) => a + (st.run ? st.dist : RECAVG.dist), 0), gap = 4;
  const bw = w - gap * (WORKOUT.steps.length - 1);
  let cx = x; const by = y + 78, bh = 54;
  // 헤더 오른쪽: 빌드업 규칙
  const rule = '목표 범위 세트마다 -5초', rw = measure(rule, 24, 900) + 36;
  rrect(x + w - rw, y - 30, rw, 40, 20); ctx.fillStyle = C.lime; ctx.fill();
  txt(rule, x + w - rw / 2, y - 2, { size: 24, weight: 900, color: C.bg, align: 'center' });
  const runCenters = [];
  let n = 0;
  WORKOUT.steps.forEach((st, i) => {
    const sw = bw * (st.run ? st.dist : RECAVG.dist) / units;
    rrect(cx, by, sw, bh, 10);
    ctx.fillStyle = st.run ? (st.last ? C.lime : ZC[3]) : 'rgba(92,200,255,.55)'; ctx.fill();
    if (st.run) {
      n++; runCenters.push([cx + sw / 2, st.lo]);
      txt(`${st.dist / 1000}km`, cx + sw / 2, by + 36, { size: 24, fam: NUM, weight: 400, color: C.bg, align: 'center' });
      // 목표는 '범위' — 하한·상한을 같은 밝기로 묶어서 표시
      const rng = `${fmtPace(st.lo)}~${fmtPace(st.hi)}`, col = st.last ? C.lime : ZC[3];
      line(cx + 4, by + bh + 8, cx + sw - 4, by + bh + 8, 1, { color: col, w: 2, alpha: .8 });
      line(cx + 4, by + bh + 2, cx + 4, by + bh + 8, 1, { color: col, w: 2, alpha: .8 }); line(cx + sw - 4, by + bh + 2, cx + sw - 4, by + bh + 8, 1, { color: col, w: 2, alpha: .8 });
      if (measure(rng, 18, 700, MONO) <= sw - 4) txt(rng, cx + sw / 2, by + bh + 36, { size: 18, fam: MONO, weight: 700, align: 'center', color: C.white });
      else { txt(`${fmtPace(st.lo)}~`, cx + sw / 2, by + bh + 34, { size: 18, fam: MONO, weight: 700, align: 'center', color: C.white }); txt(fmtPace(st.hi), cx + sw / 2, by + bh + 56, { size: 18, fam: MONO, weight: 700, align: 'center', color: C.white }); }
    }
    cx += sw + gap;
  });
  // 세트 사이 -5초 배지 (목표 하한이 몇 초 빨라졌는지)
  for (let k = 1; k < runCenters.length; k++) {
    const [x1, p1] = runCenters[k - 1], [x2, p2] = runCenters[k], mx = (x1 + x2) / 2, dd = p1 - p2;
    ctx.save(); ctx.strokeStyle = C.lime; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x1 + 20, by - 12); ctx.quadraticCurveTo(mx, by - 44, x2 - 20, by - 12); ctx.stroke(); ctx.restore();
    arrow(x2 - 18, by - 10, Math.atan2(24, 40), 12, C.lime);
    const bt = `-${dd}초`, bwid = measure(bt, 22, 900) + 20;
    rrect(mx - bwid / 2, by - 62, bwid, 30, 15); ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = C.lime; ctx.lineWidth = 2; ctx.stroke();
    txt(bt, mx, by - 40, { size: 22, weight: 900, color: C.lime, align: 'center' });
  }
  // 범례
  const ly = by + bh + 92;
  rrect(x, ly - 18, 22, 22, 5); ctx.fillStyle = ZC[3]; ctx.fill();
  txt('질주 · 목표 페이스 범위', x + 32, ly, { size: 22, weight: 700, alpha: .75 });
  const lx2 = x + 32 + measure('질주 · 목표 페이스 범위', 22, 700) + 30;
  rrect(lx2, ly - 18, 22, 22, 5); ctx.fillStyle = 'rgba(92,200,255,.55)'; ctx.fill();
  txt('회복 · 랩 버튼까지 자유 조깅', lx2 + 32, ly, { size: 22, weight: 700, alpha: .75 });
}
function cardFrame(n, title, sub, accent = C.lime) {
  bgFill(C.bg, .1, 900, 160);
  titleBadge(99, C.white, false);
  txt(`${n} / ${TOTAL_SLIDES}`, W - 72, 104, { size: 24, fam: MONO, weight: 700, align: 'right', alpha: .55 });
  txt(title, 72, 250, { size: 72, weight: 900, color: accent });
  if (sub) txt(sub, 72, 300, { size: 28, weight: 700, alpha: .6 });
  line(72, 1232, W - 72, 1232, 1, { color: C.white, w: 1.5, alpha: .15 });
  pin(84, 1272, 11, C.white);
  txt(`목동교 멀티스포츠존 · ${RUN.date}`, 106, 1283, { size: 24, weight: 700, alpha: .7 });
  woojuroText(W - 72 - 92, 1272, 30, [['우주로 달리기', 0]]);
}
function stat(x, y, v, u, l, o = {}) {
  const size = o.size || 120;
  txt(v, x - 2, y, { size, fam: NUM, weight: 400, color: o.color || C.white });
  if (u) txt(u, x + measure(v, size, 400, NUM) + 8, y, { size: Math.round(size * .27), weight: 900, color: o.uc || C.lime });
  if (l) txt(l, x, y + Math.round(size * .36) + 6, { size: o.ls || 26, weight: 700, alpha: .6 });
}
function panel(x, y, w, h, col = 'rgba(26,31,38,.92)') { rrect(x, y, w, h, 28); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(243,242,236,.1)'; ctx.lineWidth = 2; ctx.stroke(); }

const FEED_CARDS = [
  // 2. 세션 요약
  ['02-session-summary', () => {
    cardFrame(2, '세션 요약', '2026.10.13 화요일 · 기온 20°C');
    // 줄 구성: 거리·시간 / 페이스·칼로리 / 평균 심박·최대 심박
    const cells = [['12.72', 'km', '총 거리'], ['54:36', '', '운동 시간'], [fmtPace(257.4), '', '평균 페이스'], ['771', 'kcal', '소모 칼로리'], ['152', 'bpm', '평균 심박'], ['175', 'bpm', '최대 심박']];
    cells.forEach(([v, u, l], i) => stat(72 + (i % 2) * 480, 420 + Math.floor(i / 2) * 140, v, u, l, { size: 92, uc: u === 'bpm' ? C.coral : C.lime }));
    // 본훈련 패널
    panel(72, 770, W - 144, 210);
    txt('본훈련', 112, 832, { size: 36, weight: 900, color: C.lime });
    txt('3000m × 3 + 2000m', 112 + measure('본훈련', 36, 900) + 18, 830, { size: 24, weight: 700, alpha: .65 });
    [['11.00', 'km', '거리'], ['42:43', '', '시간'], [fmtPace(233.0), '', '평균 페이스'], ['158', 'bpm', '평균 심박']].forEach(([v, u, l], i) =>
      stat(112 + i * 228, 922, v, u, l, { size: 66, ls: 22, uc: i === 3 ? C.coral : C.lime }));
    // 회복구간 패널
    panel(72, 996, W - 144, 210, 'rgba(8,21,33,.95)');
    txt('회복구간', 112, 1058, { size: 36, weight: 900, color: C.sky });
    txt('랩 버튼까지 자유 조깅', 112 + measure('회복구간', 36, 900) + 18, 1056, { size: 24, weight: 700, alpha: .65 });
    [[String(RECAVG.dist), 'm', '평균 거리'], [fmtPace(RECAVG.pace), '', '평균 페이스'], [String(RECAVG.hr), 'bpm', '평균 심박'], [String(PAUSES.length), '회', '급수·휴식']].forEach(([v, u, l], i) =>
      stat(112 + i * 228, 1148, v, u, l, { size: 66, ls: 22, color: i === 0 ? C.sky : C.white, uc: C.sky }));
  }],
  // 3. 세트별 기록
  ['03-sets', () => {
    cardFrame(3, '세트별 기록', '3000m × 3 + 2000m · 4세트 중 3세트 목표 적중');
    panel(56, 330, W - 112, 312, 'rgba(26,31,38,.9)');
    drawWorkoutPlan(84, 386, W - 168);
    const cols = [72, 200, 360, 560, 800];
    ['세트', '거리', '페이스', '목표 범위', '심박 평균/최대'].forEach((h, i) => txt(h, cols[i], 690, { size: 22, weight: 800, alpha: .5 }));
    txt('Z4+Z5', W - 72, 690, { size: 22, weight: 800, alpha: .5, align: 'right' });
    const rows = [...REPS.map((r, i) => ({ n: `${i + 1}세트`, d: `${SETD}m`, p: r.pace, lo: r.lo, hi: r.hi, hr: Math.round(r.hr), mx: REPMAX[i], z: REPZ[i] })),
      { n: '라스트', d: `${FINAL.dist}m`, p: FINAL.pace, lo: FINAL.lo, hi: FINAL.hi, hr: FINAL.hr, mx: FINAL.max, z: FINALZ }];
    rows.forEach((r, i) => {
      const y = 770 + i * 100, last = i === rows.length - 1;
      if (i % 2 === 0) { ctx.save(); ctx.globalAlpha = .5; rrect(56, y - 60, W - 112, 90, 16); ctx.fillStyle = C.bg2; ctx.fill(); ctx.restore(); }
      txt(r.n, cols[0], y, { size: 30, weight: 900, color: last ? C.lime : C.white });
      txt(r.d, cols[1], y, { size: 34, fam: NUM, weight: 400, alpha: .85 });
      txt(fmtPace(r.p), cols[2], y + 4, { size: 50, fam: NUM, weight: 400, color: last ? C.lime : C.white });
      if (hitOf({ pace: r.p, hi: r.hi })) { circle(cols[3] + 16, y - 10, 16, { fill: C.lime }); check(cols[3] + 16, y - 10, 16, 1); }
      else { circle(cols[3] + 16, y - 10, 15, { stroke: ZC[3], w: 3 }); txt(`+${Math.round(r.p) - r.hi}`, cols[3] + 16, y - 2, { size: 18, fam: NUM, weight: 400, color: ZC[3], align: 'center' }); }
      txt(`${fmtPace(r.lo)}~${fmtPace(r.hi)}`, cols[3] + 42, y, { size: 24, fam: MONO, weight: 700, alpha: .8 });
      txt(`${r.hr} / ${r.mx}`, cols[4], y, { size: 34, fam: NUM, weight: 400, color: C.white });
      const tot = r.z.reduce((a, c) => a + c, 0);
      txt(`${Math.round((r.z[3] + r.z[4]) / tot * 100)}%`, W - 72, y, { size: 34, fam: NUM, weight: 400, color: ZC[3], align: 'right' });
    });
    txt(`목표 세트마다 -5초 · ${fmtPace(REPS[0].pace)} → ${fmtPace(REPS[1].pace)} → ${fmtPace(REPS[2].pace)} · 마지막 2000m ${fmtPace(FINAL.pace)}`, 72, 1204, { size: 28, weight: 900, color: C.lime });
  }],
  // 4. 심박 변화 그래프
  ['04-hr-trend', () => {
    cardFrame(4, '심박 변화', '세션 전체 · 존 색상 (최대심박 186 기준)', C.coral);
    const gx = 108, gy = 360, gw = W - 180, gh = 600, T = SESSION_T, X = s => gx + gw * s / T;
    REPWIN.concat([FINALWIN]).forEach(([a, c], i) => {
      ctx.save(); ctx.globalAlpha = .1; ctx.fillStyle = C.white; ctx.fillRect(X(a), gy, X(c) - X(a), gh); ctx.restore();
      txt(i < SETN ? `${i + 1}세트` : '라스트', (X(a) + X(c)) / 2, gy + gh + 38, { size: 22, weight: 800, align: 'center', alpha: .75 });
    });
    hrGraph(gx, gy, gw, gh, 0, T, 1, { lo: 95, hi: 186, band: .13, zoneLabels: true, zoneLeft: true, lw: 4 });
    pauseMarks(X, gy, gh);
    drop(84, 1036, 9, C.sky);
    txt('그래프가 끊긴 곳 = 급수·완전 휴식 (시계 일시정지 · 모두 회복 조깅 중)', 104, 1044, { size: 24, weight: 700, color: C.sky });
    txt('세트별 최대 심박', 72, 1094, { size: 24, weight: 800, alpha: .6 });
    const mxs = [...REPMAX, FINAL.max], cwM = (W - 144 - 18 * (mxs.length - 1)) / mxs.length;
    mxs.forEach((m, i) => { const x = 72 + i * (cwM + 18); rrect(x, 1112, cwM, 70, 16); ctx.strokeStyle = 'rgba(255,90,95,.6)'; ctx.lineWidth = 2; ctx.stroke();
      txt(String(m), x + cwM * .4, 1162, { size: 44, fam: NUM, weight: 400, align: 'center' }); txt(i < SETN ? `${i + 1}세트` : '라스트', x + cwM * .78, 1158, { size: 18, weight: 800, color: C.coral, align: 'center' }); });
  }],
  // 5. 심박존 분석
  ['05-hr-zones', () => {
    cardFrame(5, '심박존 분석', '본훈련 기준 · 존 체류 시간', ZC[3]);
    const cx = 290, cy = 560, R = 170, tot = MAINZ.reduce((a, c) => a + c, 0); let a0 = -Math.PI / 2;
    circle(cx, cy, R, { stroke: C.bg3, w: 60 });
    MAINZ.forEach((v, i) => { const da = Math.PI * 2 * v / tot; circle(cx, cy, R, { stroke: ZC[i], w: 60, a0, a1: a0 + da }); a0 += da; });
    txt('Z4', cx, cy - 60, { size: 38, weight: 900, color: ZC[3], align: 'center' });
    txt(`${MAINZ4}%`, cx, cy + 56, { size: 96, fam: NUM, weight: 400, align: 'center' });
    for (let i = 4; i >= 0; i--) {
      const y = 420 + (4 - i) * 72, x = 540;
      rrect(x, y - 24, 12, 30, 4); ctx.fillStyle = ZC[i]; ctx.fill();
      txt(`Z${i + 1}`, x + 26, y, { size: 30, fam: NUM, weight: 400, color: ZC[i] });
      txt(ZNAME[i], x + 74, y, { size: 22, weight: 700, alpha: .7 });
      txt(fmtDur(MAINZ[i]), W - 160, y, { size: 32, fam: NUM, weight: 400, align: 'right' });
      txt(`${Math.round(MAINZ[i] / tot * 100)}%`, W - 72, y, { size: 26, fam: MONO, weight: 700, color: ZC[i], align: 'right' });
    }
    txt('세트별 존 구성 (위 숫자 = Z4+Z5 비중)', 72, 830, { size: 26, weight: 800, alpha: .6 });
    const all = [...REPZ, FINALZ], nA = all.length, cw = 170, gap = (W - 144 - nA * cw) / (nA - 1), y0 = 1150, hh = 250;
    all.forEach((z, i) => {
      const t_ = z.reduce((a, c) => a + c, 0), x = 72 + i * (cw + gap); let y = y0;
      ctx.save(); rrect(x, y0 - hh, cw, hh, 10); ctx.clip();
      z.forEach((v, j) => { const h = hh * v / t_; ctx.fillStyle = ZC[j]; ctx.fillRect(x, y - h, cw, h + .5); y -= h; }); ctx.restore();
      txt(`${Math.round((z[3] + z[4]) / t_ * 100)}%`, x + cw / 2, y0 - hh - 14, { size: 34, fam: NUM, weight: 400, align: 'center' });
      txt(i < SETN ? `${i + 1}세트` : '라스트', x + cw / 2, y0 + 34, { size: 20, weight: 800, align: 'center', alpha: .7 });
    });
  }],
  // 6. 회복 조깅 & 라스트 스퍼트
  ['06-recovery-last', () => {
    cardFrame(6, '회복 & 라스트', `회복 조깅 ${RECS.length}회 평균 · 마지막 2000m`, C.sky);
    panel(72, 350, W - 144, 400, 'rgba(8,21,33,.95)');
    txt(`회복 조깅 ${RECS.length}회 평균 · 랩 버튼까지 자유 조깅`, 112, 420, { size: 30, weight: 900, color: C.sky });
    stat(112, 560, String(RECAVG.dist), 'm', '평균 회복 거리', { size: 110, color: C.sky, uc: C.sky });
    stat(420, 560, fmtPace(RECAVG.pace), '', '평균 페이스', { size: 110 });
    stat(730, 560, String(RECAVG.hr), 'bpm', '평균 심박', { size: 110, uc: C.sky });
    const cwR = (W - 224 - 18 * (RECS.length - 1)) / RECS.length;
    RECS.forEach((p, i) => { const x = 112 + i * (cwR + 18); rrect(x, 650, cwR, 64, 14); ctx.strokeStyle = 'rgba(92,200,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
      txt(fmtPace(p), x + cwR / 2, 696, { size: 36, fam: NUM, weight: 400, align: 'center' }); });
    panel(72, 790, W - 144, 400);
    txt('라스트 스퍼트', 112, 860, { size: 30, weight: 900, color: C.lime });
    txt('마지막 세트', W - 112, 860, { size: 26, weight: 800, alpha: .6, align: 'right' });
    stat(112, 1030, fmtPace(FINAL.pace), '', '평균 페이스', { size: 170, color: C.lime });
    const mW = measure('m', 44, 900);
    txt('m', W - 112, 1030, { size: 44, weight: 900, color: C.lime, align: 'right' });
    txt(String(FINAL.dist), W - 112 - mW - 6, 1030, { size: 130, fam: NUM, weight: 400, align: 'right' });
    txt(`목표 ${fmtPace(FINAL.lo)}~${fmtPace(FINAL.hi)} 적중 · 평균 심박 ${FINAL.hr} · 최대 ${FINAL.max}`, 112, 1150, { size: 28, weight: 800, alpha: .8 });
  }],
  // 7. 러닝 다이내믹스 & 훈련 효과
  ['07-dynamics', () => {
    cardFrame(7, '러닝 다이내믹스', '세션 평균 · 훈련 효과');
    const cells = [['188', 'spm', '케이던스'], ['1.23', 'm', '보폭'], ['217', 'ms', '지면 접촉 시간'], ['8.3', 'cm', '수직 진폭'], ['7.0', '%', '수직 비율'], ['17.7', 'km/h', '최고 속도']];
    cells.forEach(([v, u, l], i) => stat(72 + (i % 2) * 480, 440 + Math.floor(i / 2) * 170, v, u, l, { size: 110 }));
    panel(72, 880, W - 144, 310);
    txt('훈련 효과', 112, 950, { size: 34, weight: 900, color: C.lime });
    const g = (cx, v, label, col) => {
      const cy = 1090; circle(cx, cy, 80, { stroke: C.bg3, w: 18, a0: rad(135), a1: rad(405) });
      circle(cx, cy, 80, { stroke: col, w: 18, a0: rad(135), a1: rad(135) + rad(270) * v / 5, cap: 'round' });
      txt(v.toFixed(1), cx, cy + 24, { size: 66, fam: NUM, weight: 400, align: 'center' });
      txt(label, cx, cy + 74, { size: 22, weight: 800, color: col, align: 'center' });
    };
    g(220, 4.0, '유산소', C.lime); g(430, 1.3, '무산소', C.sky);
    txt('유산소 능력', 580, 1060, { size: 40, weight: 900, color: C.lime });
    txt('크게 향상', 580, 1112, { size: 40, weight: 900, color: C.lime });
    txt('젖산역치 부근 지속 훈련', 580, 1158, { size: 24, weight: 700, alpha: .6 });
  }],
  // 8. 우주로 달리기 — 채널 홍보 카드
  ['08-woojuro', () => {
    ctx.fillStyle = '#07080B'; ctx.fillRect(0, 0, W, H);
    const gl = ctx.createRadialGradient(540, 600, 0, 540, 600, 640); gl.addColorStop(0, 'rgba(212,255,58,.10)'); gl.addColorStop(1, 'rgba(212,255,58,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const x = rnd(i * 3.1) * W, y = rnd(i * 7.7) * H, r = .5 + rnd(i * 1.9) * 1.4;
      ctx.globalAlpha = .15 + rnd(i * 5.3) * .4; ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    txt(`${TOTAL_SLIDES} / ${TOTAL_SLIDES}`, W - 72, 104, { size: 24, fam: MONO, weight: 700, align: 'right', alpha: .55 });
    woojuroText(540, 560, 200);
    // 유튜브 채널 (아이콘 + 한 줄)
    const yt = '유튜브 채널', ytw = 76 + 18 + measure(yt, 36, 800), yx = 540 - ytw / 2, yy = 900;
    rrect(yx, yy - 27, 76, 54, 14); ctx.fillStyle = '#FF2D2D'; ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.moveTo(yx + 30, yy - 14); ctx.lineTo(yx + 54, yy); ctx.lineTo(yx + 30, yy + 14); ctx.closePath(); ctx.fill();
    txt(yt, yx + 94, yy + 13, { size: 36, weight: 800 });
    // 인스타그램 프로필 행처럼: 그라데이션 링 아바타 + 이름 + 파란 팔로우 버튼
    const px = 110, py = 990, pw = W - 220, ph = 190;
    rrect(px, py, pw, ph, 28); ctx.fillStyle = '#121212'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2; ctx.stroke();
    const ax = px + 104, ay = py + ph / 2;
    const ring = ctx.createLinearGradient(ax - 50, ay + 50, ax + 50, ay - 50);
    ring.addColorStop(0, '#FEDA75'); ring.addColorStop(.35, '#FA7E1E'); ring.addColorStop(.65, '#D62976'); ring.addColorStop(1, '#962FBF');
    circle(ax, ay, 76, { fill: ring }); circle(ax, ay, 70, { fill: '#121212' });
    // 프로필 사진 (얼굴 부분 원형 크롭)
    const img = window.PROFILE_IMG, pr = 66;
    if (img && img.complete && img.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, pr, 0, Math.PI * 2); ctx.clip();
      const CS = 1320, CX = 220, CY = 82; // 실제 인스타그램 프로필 이미지와 같은 구도 (사진 높이 거의 전체)
      ctx.drawImage(img, CX, CY, CS, CS, ax - pr, ay - pr, pr * 2, pr * 2); ctx.restore();
    } else { circle(ax, ay, pr, { fill: '#05070C' }); woojuroText(ax, ay, 24, [['우주로', 0], ['달리기', 0]], .9); }
    txt('woojuro_running', ax + 100, ay - 2, { size: 34, weight: 800 });
    txt('우주로 달리기', ax + 100, ay + 38, { size: 24, weight: 700, alpha: .6 });
    const bw = 190, bh = 68, bx = px + pw - bw - 34, by = ay - bh / 2;
    rrect(bx, by, bw, bh, 14); ctx.fillStyle = '#0095F6'; ctx.fill();
    txt('팔로우', bx + bw / 2, by + 46, { size: 32, weight: 800, color: '#FFFFFF', align: 'center' });
    // 탭 표시
    const tx = bx + bw - 8, ty = by + bh + 6;
    circle(tx, ty, 30, { stroke: C.white, w: 3, alpha: .35 }); circle(tx, ty, 17, { stroke: C.white, w: 3, alpha: .6 }); circle(tx, ty, 8, { fill: C.white });
  }],
];
window.FEED_CARDS = FEED_CARDS.map(c => c[0]);
/* 워크아웃 구성 단독 이미지 (1080×330) */
window.workoutImage = () => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  panel(24, 24, W - 48, 326, 'rgba(26,31,38,1)');
  drawWorkoutPlan(64, 92, W - 128);
  const o = document.createElement('canvas'); o.width = W; o.height = 374; o.getContext('2d').drawImage(cv, 0, 0);
  return o.toDataURL('image/png');
};
window.PROFILE_IMG = new Image(); window.PROFILE_IMG.src = 'assets/profile.jpg';
window.ready = window.ready.then(async () => {
  try { await window.PROFILE_IMG.decode(); } catch (e) { /* 사진이 없으면 로고 아바타로 대체 */ }
  await document.fonts.load('400 100px "Black Han Sans"', '우주로 달리기');
  await document.fonts.load(`${window.BRAND_SIMPLE_WEIGHT || 400} 100px ${window.BRAND_SIMPLE_FONT}`, '우주로 달리기');
  const f = new FontFace('yg-jalnan', 'url(node_modules/@noonnu/yg-jalnan/fonts/yg-jalnan-normal.woff)'); await f.load(); document.fonts.add(f);
  return true;
});
window.drawFeedCard = i => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; FEED_CARDS[i][1](); };
