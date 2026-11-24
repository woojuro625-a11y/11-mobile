/* 마지막 카드(우주로 달리기) 5초 반복 모션 영상
 * 이음매 없는 루프: t=0 과 t=LOOP_DUR 화면이 같다 (글자는 둘 다 숨김 상태, 링 회전 1바퀴, 별 반짝임은 정수 주기).
 * 타임라인(초)
 *   0.00~0.75  글자 '우주로 / 달리기' 아래에서 한 글자씩 올라옴
 *   0.90       유튜브 아이콘 맥동
 *   1.60       팔로우 버튼 탭 → '팔로잉'
 *   2.40~3.00  글자 물결(한 글자씩 톡)
 *   3.40       유튜브 아이콘 맥동
 *   4.25~4.88  글자 위로 빠져나감 · 버튼 '팔로우'로 복귀 → 다시 0초로 이어짐
 */
const LOOP_DUR = 5;
window.LOOP_DUR = LOOP_DUR;
const TAU = Math.PI * 2;

function loopBg(t) {
  ctx.fillStyle = '#07080B'; ctx.fillRect(0, 0, W, H);
  const gp = .10 + .025 * Math.sin(TAU * t / LOOP_DUR);
  const gl = ctx.createRadialGradient(540, 600, 0, 540, 600, 640); gl.addColorStop(0, `rgba(212,255,58,${gp})`); gl.addColorStop(1, 'rgba(212,255,58,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  const dx = 6 * Math.sin(TAU * t / LOOP_DUR), dy = 4 * Math.cos(TAU * t / LOOP_DUR);
  for (let i = 0; i < 90; i++) {
    const depth = .4 + rnd(i * 2.7) * .6;
    const x = rnd(i * 3.1) * W + dx * depth, y = rnd(i * 7.7) * H + dy * depth, r = .5 + rnd(i * 1.9) * 1.4;
    const tw = .5 + .5 * Math.sin(TAU * (t / LOOP_DUR) * (1 + (i % 3)) + rnd(i * 4.4) * TAU);   // 정수 주기 반짝임
    ctx.globalAlpha = (.12 + rnd(i * 5.3) * .35) * (.55 + .45 * tw); ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* 로고 글자별 애니메이션 */
function loopLogo(t) {
  const size = 200, cx = 540, cy = 560, lh = 1.0;
  const lines = ['우주로', '달리기'];
  const fontStr = `${window.BRAND_SIMPLE_WEIGHT || 800} ${size}px ${window.BRAND_SIMPLE_FONT}`;
  ctx.save(); ctx.font = fontStr; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const y0 = cy - (size * lh) / 2 + size * .36;
  let idx = 0;
  lines.forEach((s, li) => {
    const chars = [...s], ws = chars.map(c => ctx.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0);
    const by = y0 + li * size * lh;
    // 줄마다 마스크 (글자가 줄 밖으로 나가면 안 보임)
    ctx.save(); ctx.beginPath(); ctx.rect(0, by - size * .92, W, size * 1.12); ctx.clip();
    let x = cx - tot / 2;
    chars.forEach((c, ci) => {
      const i = idx++;
      const inU = E.outX(P(t, .05 + i * .07, .05 + i * .07 + .5));
      const outU = E.inC(P(t, 4.25 + i * .05, 4.25 + i * .05 + .38));   // 마지막 글자도 4.88초에 완전히 퇴장
      const wave = Math.exp(-Math.pow((t - (2.45 + i * .09)) / .07, 2)) * 16;        // 물결 톡
      const fl = Math.sin(TAU * (t / LOOP_DUR) * 2 + i * .7) * 4 * (inU - outU);       // 잔잔한 부유
      const dy = (1 - inU) * size * 1.1 - outU * size * 1.1 - wave + fl;
      ctx.fillStyle = C.white; ctx.fillText(c, x + ws[ci] / 2, by + dy);
      x += ws[ci];
    });
    ctx.restore();
  });
  ctx.restore();
}

window.drawLoop8 = t => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'round';
  t = ((t % LOOP_DUR) + LOOP_DUR) % LOOP_DUR;
  loopBg(t);
  txt(`${TOTAL_SLIDES} / ${TOTAL_SLIDES}`, W - 72, 104, { size: 24, fam: MONO, weight: 700, align: 'right', alpha: .55 });
  loopLogo(t);

  // 유튜브 채널 (박자 맥동)
  const yt = '유튜브 채널', ytw = 76 + 18 + measure(yt, 36, 800), yx = 540 - ytw / 2, yy = 900;
  const yp = 1 + .12 * (Math.exp(-Math.pow((t - .9) / .09, 2)) + Math.exp(-Math.pow((t - 3.4) / .09, 2)));
  ctx.save(); ctx.translate(yx + 38, yy); ctx.scale(yp, yp); ctx.translate(-(yx + 38), -yy);
  rrect(yx, yy - 27, 76, 54, 14); ctx.fillStyle = '#FF2D2D'; ctx.fill();
  ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.moveTo(yx + 30, yy - 14); ctx.lineTo(yx + 54, yy); ctx.lineTo(yx + 30, yy + 14); ctx.closePath(); ctx.fill();
  ctx.restore();
  txt(yt, yx + 94, yy + 13, { size: 36, weight: 800 });

  // 인스타그램 프로필 줄
  const px = 110, py = 990, pw = W - 220, ph = 190;
  rrect(px, py, pw, ph, 28); ctx.fillStyle = '#121212'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2; ctx.stroke();
  const ax = px + 104, ay = py + ph / 2;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(TAU * t / LOOP_DUR);                    // 링 1바퀴 회전
  const ring = ctx.createLinearGradient(-50, 50, 50, -50);
  ring.addColorStop(0, '#FEDA75'); ring.addColorStop(.35, '#FA7E1E'); ring.addColorStop(.65, '#D62976'); ring.addColorStop(1, '#962FBF');
  circle(0, 0, 76, { fill: ring }); ctx.restore();
  circle(ax, ay, 70, { fill: '#121212' });
  const img = window.PROFILE_IMG, pr = 66;
  if (img && img.complete && img.naturalWidth) {
    ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, pr, 0, TAU); ctx.clip();
    const CS = 1320, CX = 220, CY = 82; ctx.drawImage(img, CX, CY, CS, CS, ax - pr, ay - pr, pr * 2, pr * 2); ctx.restore();
  } else { circle(ax, ay, pr, { fill: '#05070C' }); }
  txt('woojuro_running', ax + 100, ay - 2, { size: 34, weight: 800 });
  txt('우주로 달리기', ax + 100, ay + 38, { size: 24, weight: 700, alpha: .6 });

  // 팔로우 버튼: 1.60초 탭 → 팔로잉, 4.5~4.8초에 팔로우로 복귀
  const bw = 190, bh = 68, bx = px + pw - bw - 34, by = ay - bh / 2, tap = 1.6;
  const press = 1 - .06 * Math.exp(-Math.pow((t - tap) / .06, 2));
  const fol = P(t, tap + .04, tap + .16) * (1 - P(t, 4.5, 4.8));                       // 0 팔로우 ~ 1 팔로잉
  ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(press, press); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
  rrect(bx, by, bw, bh, 14); ctx.fillStyle = '#0095F6'; ctx.globalAlpha = 1 - fol; ctx.fill();
  ctx.globalAlpha = fol; ctx.fillStyle = '#363636'; ctx.fill(); ctx.globalAlpha = 1;
  txt('팔로우', bx + bw / 2, by + 46, { size: 32, weight: 800, color: '#FFFFFF', align: 'center', alpha: 1 - fol });
  txt('팔로잉', bx + bw / 2, by + 46, { size: 32, weight: 800, color: '#FFFFFF', align: 'center', alpha: fol });
  ctx.restore();
  // 탭 표시: 손가락 점이 들어와 누르고 물결이 퍼진 뒤 사라짐
  const tx = bx + bw - 30, ty = by + bh - 8;
  const tin = E.outC(P(t, tap - .45, tap - .05)), tout = P(t, tap + .35, tap + .7);
  const ta = tin * (1 - tout);
  if (ta > 0) {
    const ox = (1 - tin) * 60, oy = (1 - tin) * 50;
    circle(tx + ox, ty + oy, 18, { fill: C.white, alpha: .85 * ta });
    circle(tx + ox, ty + oy, 30, { stroke: C.white, w: 3, alpha: .35 * ta });
  }
  const rip = P(t, tap, tap + .55);
  if (rip > 0 && rip < 1) circle(tx, ty, 20 + 70 * E.outC(rip), { stroke: C.white, w: 3, alpha: .6 * (1 - rip) });
};
