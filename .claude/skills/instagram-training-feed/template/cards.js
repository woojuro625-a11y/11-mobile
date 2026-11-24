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

/* '우주로 달리기' 채널 로고 스타일 텍스트: 굵은 한글 + 노랑→주황 그라데이션 + 검은 외곽선/그림자 + 기울임
 * lines: [['우주로', dx], ['달리기', dx]] 처럼 줄마다 가로 오프셋 */
const BRAND_FONT = '"Black Han Sans"';
function woojuroText(cx, cy, size, lines = [['우주로', -.32], ['달리기', .32]], lh = .98) {
  ctx.save(); ctx.translate(cx, cy); ctx.transform(1, 0, -.14, 1, 0, 0);
  ctx.font = `400 ${size}px ${BRAND_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const n = lines.length, y0 = -((n - 1) * size * lh) / 2 + size * .36;
  lines.forEach(([s, dx], i) => {
    const x = dx * size, y = y0 + i * size * lh;
    ctx.fillStyle = '#000'; ctx.fillText(s, x + size * .05, y + size * .07);               // 그림자
    ctx.strokeStyle = '#111'; ctx.lineWidth = size * .14; ctx.strokeText(s, x, y);           // 외곽선
    const g = ctx.createLinearGradient(0, y - size * .78, 0, y + size * .02);
    g.addColorStop(0, '#FFF34A'); g.addColorStop(.5, '#FFC21A'); g.addColorStop(1, '#FF7A00');
    ctx.fillStyle = g; ctx.fillText(s, x, y);
  });
  ctx.restore();
}
function cardFrame(n, title, sub, accent = C.lime) {
  bgFill(C.bg, .1, 900, 160);
  titleBadge(99, C.white, false);
  txt(`${n} / ${TOTAL_SLIDES}`, W - 72, 104, { size: 24, fam: MONO, weight: 700, align: 'right', alpha: .55 });
  txt(title, 72, 250, { size: 72, weight: 900, color: accent });
  if (sub) txt(sub, 72, 300, { size: 28, weight: 700, alpha: .6 });
  line(72, 1232, W - 72, 1232, 1, { color: C.white, w: 1.5, alpha: .15 });
  pin(84, 1272, 11, C.white);
  txt('목동교 멀티스포츠존 · 2026.11.04', 106, 1283, { size: 24, weight: 700, alpha: .7 });
  woojuroText(W - 72 - 92, 1272, 34, [['우주로 달리기', 0]]);
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
    cardFrame(2, '세션 요약', '2026.11.04 수요일 · 기온 18°C');
    const cells = [['13.12', 'km', '총 거리'], ['57:05', '', '운동 시간'], [fmtPace(261.1), '', '평균 페이스'], ['154', 'bpm', '평균 심박'], ['177', 'bpm', '최대 심박'], ['809', 'kcal', '소모 칼로리']];
    cells.forEach(([v, u, l], i) => stat(72 + (i % 2) * 480, 440 + Math.floor(i / 2) * 170, v, u, l, { size: 110, uc: i === 3 || i === 4 ? C.coral : C.lime }));
    panel(72, 880, W - 144, 310);
    txt('본훈련', 112, 950, { size: 40, weight: 900, color: C.lime });
    txt('2000m × 5 + 마지막 스텝', 112 + measure('본훈련', 40, 900) + 18, 948, { size: 26, weight: 700, alpha: .65 });
    [['10.52', 'km', '거리'], ['40:58', '', '시간'], [fmtPace(233.6), '', '평균 페이스'], ['161', 'bpm', '평균 심박']].forEach(([v, u, l], i) =>
      stat(112 + i * 228, 1080, v, u, l, { size: 70, ls: 22, uc: i === 3 ? C.coral : C.lime }));
  }],
  // 3. 세트별 기록
  ['03-sets', () => {
    cardFrame(3, '세트별 기록', '2000m × 5 + 마지막 스텝 · 모든 세트 목표 페이스 적중');
    const cols = [72, 200, 360, 560, 800];
    ['세트', '거리', '페이스', '목표 범위', '심박 평균/최대'].forEach((h, i) => txt(h, cols[i], 380, { size: 22, weight: 800, alpha: .5 }));
    txt('Z4+Z5', W - 72, 380, { size: 22, weight: 800, alpha: .5, align: 'right' });
    const rows = [...REPS.map((r, i) => ({ n: `${i + 1}세트`, d: '2000m', p: r.pace, lo: r.lo, hi: r.hi, hr: Math.round(r.hr), mx: REPMAX[i], z: REPZ[i] })),
      { n: '라스트', d: '518m', p: FINAL.pace, lo: FINAL.lo, hi: FINAL.hi, hr: FINAL.hr, mx: 172, z: FINALZ }];
    rows.forEach((r, i) => {
      const y = 480 + i * 118, last = i === 5;
      if (i % 2 === 0) { ctx.save(); ctx.globalAlpha = .5; rrect(56, y - 70, W - 112, 106, 18); ctx.fillStyle = C.bg2; ctx.fill(); ctx.restore(); }
      txt(r.n, cols[0], y, { size: 30, weight: 900, color: last ? C.lime : C.white });
      txt(r.d, cols[1], y, { size: 34, fam: NUM, weight: 400, alpha: .85 });
      txt(fmtPace(r.p), cols[2], y + 6, { size: 66, fam: NUM, weight: 400, color: last ? C.lime : C.white });
      circle(cols[3] + 16, y - 10, 16, { fill: C.lime }); check(cols[3] + 16, y - 10, 16, 1);
      txt(`${fmtPace(r.lo)}–${fmtPace(r.hi)}`, cols[3] + 42, y, { size: 24, fam: MONO, weight: 700, alpha: .8 });
      txt(`${r.hr} / ${r.mx}`, cols[4], y, { size: 34, fam: NUM, weight: 400, color: C.white });
      const tot = r.z.reduce((a, c) => a + c, 0);
      txt(`${Math.round((r.z[3] + r.z[4]) / tot * 100)}%`, W - 72, y, { size: 34, fam: NUM, weight: 400, color: ZC[3], align: 'right' });
    });
    txt(`세트마다 3~6초씩 단축 · ${fmtPace(REPS[0].pace)} → ${fmtPace(REPS[4].pace)}, 마지막 ${fmtPace(FINAL.pace)}`, 72, 1180, { size: 30, weight: 900, color: C.lime });
  }],
  // 4. 심박 변화 그래프
  ['04-hr-trend', () => {
    cardFrame(4, '심박 변화', '세션 전체 · 존 색상 (최대심박 186 기준)', C.coral);
    const gx = 72, gy = 360, gw = W - 144, gh = 600, T = 3593, X = s => gx + gw * s / T;
    REPWIN.concat([FINALWIN]).forEach(([a, c], i) => {
      ctx.save(); ctx.globalAlpha = .1; ctx.fillStyle = C.white; ctx.fillRect(X(a), gy, X(c) - X(a), gh); ctx.restore();
      txt(i < 5 ? `${i + 1}세트` : '라스트', (X(a) + X(c)) / 2, gy + gh + 38, { size: 22, weight: 800, align: 'center', alpha: .75 });
    });
    hrGraph(gx, gy, gw, gh, 0, T, 1, { lo: 95, hi: 186, band: .13, zoneLabels: true, lw: 4 });
    pauseMarks(X, gy, gh);
    drop(84, 1036, 9, C.sky);
    txt('그래프가 끊긴 곳 = 급수·완전 휴식 (시계 일시정지, 모두 회복 조깅 중)', 104, 1044, { size: 24, weight: 700, color: C.sky });
    txt('세트별 최대 심박', 72, 1094, { size: 24, weight: 800, alpha: .6 });
    REPMAX.forEach((m, i) => { const x = 72 + i * 190; rrect(x, 1112, 172, 70, 16); ctx.strokeStyle = 'rgba(255,90,95,.6)'; ctx.lineWidth = 2; ctx.stroke();
      txt(String(m), x + 70, 1162, { size: 44, fam: NUM, weight: 400, align: 'center' }); txt(`${i + 1}세트`, x + 132, 1158, { size: 18, weight: 800, color: C.coral, align: 'center' }); });
  }],
  // 5. 심박존 분석
  ['05-hr-zones', () => {
    cardFrame(5, '심박존 분석', '본훈련 기준 · 존 체류 시간', ZC[3]);
    const cx = 290, cy = 560, R = 170, tot = MAINZ.reduce((a, c) => a + c, 0); let a0 = -Math.PI / 2;
    circle(cx, cy, R, { stroke: C.bg3, w: 60 });
    MAINZ.forEach((v, i) => { const da = Math.PI * 2 * v / tot; circle(cx, cy, R, { stroke: ZC[i], w: 60, a0, a1: a0 + da }); a0 += da; });
    txt('Z4', cx, cy - 60, { size: 38, weight: 900, color: ZC[3], align: 'center' });
    txt('64%', cx, cy + 56, { size: 96, fam: NUM, weight: 400, align: 'center' });
    for (let i = 4; i >= 0; i--) {
      const y = 420 + (4 - i) * 72, x = 540;
      rrect(x, y - 24, 12, 30, 4); ctx.fillStyle = ZC[i]; ctx.fill();
      txt(`Z${i + 1}`, x + 26, y, { size: 30, fam: NUM, weight: 400, color: ZC[i] });
      txt(ZNAME[i], x + 74, y, { size: 22, weight: 700, alpha: .7 });
      txt(fmtDur(MAINZ[i]), W - 160, y, { size: 32, fam: NUM, weight: 400, align: 'right' });
      txt(`${Math.round(MAINZ[i] / tot * 100)}%`, W - 72, y, { size: 26, fam: MONO, weight: 700, color: ZC[i], align: 'right' });
    }
    txt('세트별 존 구성 (위 숫자 = Z4+Z5 비중)', 72, 830, { size: 26, weight: 800, alpha: .6 });
    const all = [...REPZ, FINALZ], cw = 120, gap = (W - 144 - 6 * cw) / 5, y0 = 1150, hh = 250;
    all.forEach((z, i) => {
      const t_ = z.reduce((a, c) => a + c, 0), x = 72 + i * (cw + gap); let y = y0;
      ctx.save(); rrect(x, y0 - hh, cw, hh, 10); ctx.clip();
      z.forEach((v, j) => { const h = hh * v / t_; ctx.fillStyle = ZC[j]; ctx.fillRect(x, y - h, cw, h + .5); y -= h; }); ctx.restore();
      txt(`${Math.round((z[3] + z[4]) / t_ * 100)}%`, x + cw / 2, y0 - hh - 14, { size: 34, fam: NUM, weight: 400, align: 'center' });
      txt(i < 5 ? `${i + 1}세트` : '라스트', x + cw / 2, y0 + 34, { size: 20, weight: 800, align: 'center', alpha: .7 });
    });
  }],
  // 6. 회복 조깅 & 라스트 스퍼트
  ['06-recovery-last', () => {
    cardFrame(6, '회복 & 라스트', '회복 조깅 5회 평균 · 마지막 바퀴', C.sky);
    panel(72, 350, W - 144, 400, 'rgba(8,21,33,.95)');
    txt('회복 조깅 5회 평균', 112, 420, { size: 30, weight: 900, color: C.sky });
    stat(112, 560, String(RECAVG.dist), 'm', '평균 회복 거리', { size: 110, color: C.sky, uc: C.sky });
    stat(420, 560, fmtPace(RECAVG.pace), '', '평균 페이스', { size: 110 });
    stat(730, 560, String(RECAVG.hr), 'bpm', '평균 심박', { size: 110, uc: C.sky });
    RECS.forEach((p, i) => { const x = 112 + i * 174; rrect(x, 650, 156, 64, 14); ctx.strokeStyle = 'rgba(92,200,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
      txt(fmtPace(p), x + 78, 696, { size: 36, fam: NUM, weight: 400, align: 'center' }); });
    panel(72, 790, W - 144, 400);
    txt('라스트 스퍼트', 112, 860, { size: 30, weight: 900, color: C.lime });
    txt('마지막 바퀴', W - 112, 860, { size: 26, weight: 800, alpha: .6, align: 'right' });
    stat(112, 1030, fmtPace(FINAL.pace), '', '평균 페이스', { size: 170, color: C.lime });
    const mW = measure('m', 44, 900);
    txt('m', W - 112, 1030, { size: 44, weight: 900, color: C.lime, align: 'right' });
    txt('520', W - 112 - mW - 6, 1030, { size: 130, fam: NUM, weight: 400, align: 'right' });
    txt('약', W - 112 - mW - 12 - measure('520', 130, 400, NUM) - 6, 1030, { size: 40, weight: 900, align: 'right' });
    txt(`목표 ${fmtPace(215)}–${fmtPace(220)}보다 8초 빠르게 · 평균 심박 164`, 112, 1150, { size: 28, weight: 800, alpha: .8 });
  }],
  // 7. 러닝 다이내믹스 & 훈련 효과
  ['07-dynamics', () => {
    cardFrame(7, '러닝 다이내믹스', '세션 평균 · 훈련 효과');
    const cells = [['186', 'spm', '케이던스'], ['1.21', 'm', '보폭'], ['218', 'ms', '지면 접촉 시간'], ['8.3', 'cm', '수직 진폭'], ['7.0', '%', '수직 비율'], ['18.0', 'km/h', '최고 속도']];
    cells.forEach(([v, u, l], i) => stat(72 + (i % 2) * 480, 440 + Math.floor(i / 2) * 170, v, u, l, { size: 110 }));
    panel(72, 880, W - 144, 310);
    txt('훈련 효과', 112, 950, { size: 34, weight: 900, color: C.lime });
    const g = (cx, v, label, col) => {
      const cy = 1090; circle(cx, cy, 80, { stroke: C.bg3, w: 18, a0: rad(135), a1: rad(405) });
      circle(cx, cy, 80, { stroke: col, w: 18, a0: rad(135), a1: rad(135) + rad(270) * v / 5, cap: 'round' });
      txt(v.toFixed(1), cx, cy + 24, { size: 66, fam: NUM, weight: 400, align: 'center' });
      txt(label, cx, cy + 74, { size: 22, weight: 800, color: col, align: 'center' });
    };
    g(220, 4.3, '유산소', C.lime); g(430, 1.2, '무산소', C.sky);
    txt('유산소 능력', 580, 1060, { size: 40, weight: 900, color: C.lime });
    txt('크게 향상', 580, 1112, { size: 40, weight: 900, color: C.lime });
    txt('젖산역치 부근 지속 훈련', 580, 1158, { size: 24, weight: 700, alpha: .6 });
  }],
  // 8. 우주로 달리기 — 채널 홍보 카드
  ['08-woojuro', () => {
    ctx.fillStyle = '#07080B'; ctx.fillRect(0, 0, W, H);
    const gl = ctx.createRadialGradient(540, 600, 0, 540, 600, 640); gl.addColorStop(0, 'rgba(255,170,20,.16)'); gl.addColorStop(1, 'rgba(255,170,20,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const x = rnd(i * 3.1) * W, y = rnd(i * 7.7) * H, r = .5 + rnd(i * 1.9) * 1.4;
      ctx.globalAlpha = .15 + rnd(i * 5.3) * .4; ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    txt(`${TOTAL_SLIDES} / ${TOTAL_SLIDES}`, W - 72, 104, { size: 24, fam: MONO, weight: 700, align: 'right', alpha: .55 });
    woojuroText(540, 560, 220);
    txt('훈련 데이터를 재밌고, 정확하게', 540, 860, { size: 44, weight: 900, align: 'center' });
    txt('분석해서 업로드합니다', 540, 920, { size: 44, weight: 900, align: 'center' });
    // 유튜브 채널 홍보
    const yw = 640, yx = 540 - yw / 2, yy = 990;
    rrect(yx, yy, yw, 110, 28); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; ctx.stroke();
    rrect(yx + 34, yy + 28, 76, 54, 14); ctx.fillStyle = '#FF2D2D'; ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.moveTo(yx + 64, yy + 41); ctx.lineTo(yx + 88, yy + 55); ctx.lineTo(yx + 64, yy + 69); ctx.closePath(); ctx.fill();
    txt('유튜브 채널 운영 중', yx + 136, yy + 48, { size: 24, weight: 700, alpha: .65 });
    txt('레이스 요약 영상도 올려요', yx + 136, yy + 86, { size: 32, weight: 900 });
    // 팔로우 요청
    const fw = measure('팔로우하고 다음 훈련도 같이 봐요', 34, 900) + 80;
    rrect(540 - fw / 2, 1150, fw, 76, 38); ctx.fillStyle = '#FFC21A'; ctx.fill();
    txt('팔로우하고 다음 훈련도 같이 봐요', 540, 1200, { size: 34, weight: 900, color: '#111', align: 'center' });
  }],
];
window.FEED_CARDS = FEED_CARDS.map(c => c[0]);
window.ready = window.ready.then(async () => { await document.fonts.load(`400 100px ${BRAND_FONT}`, '우주로 달리기'); return true; });
window.drawFeedCard = i => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; FEED_CARDS[i][1](); };
