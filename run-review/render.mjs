// 사용법:
//   node render.mjs                     → 전체 렌더 (frames 파이프 → out/raw.mp4)
//   node render.mjs --cover             → 커버 이미지 (out/cover.png)
//   node render.mjs --cards             → 피드 캐러셀 카드 (out/cards/*.png)
//   node render.mjs --stills 0.5,3.7    → 지정 시각의 스틸 PNG (out/stills/)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const args = process.argv.slice(2);
const stillsIdx = args.indexOf('--stills');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.error('[pageerror]', e));
await page.goto(`http://127.0.0.1:${port}/index.html?render`);
await page.evaluate(() => window.ready);

const grab = t => page.evaluate(t => { window.draw(t); return document.getElementById('c').toDataURL('image/png'); }, t)
  .then(u => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));

if (args.includes('--brand-variants')) {
  const dir = path.join(OUT, 'brand'); fs.mkdirSync(dir, { recursive: true });
  const names = await page.evaluate(() => window.FEED_CARDS);
  for (const v of ['A', 'B', 'C']) for (const i of [names.length - 1, 2]) {
    const u = await page.evaluate(([v, i]) => { window.BRAND_VARIANT = v; window.drawFeedCard(i); return document.getElementById('c').toDataURL('image/png'); }, [v, i]);
    fs.writeFileSync(path.join(dir, `${v}-${names[i]}.png`), Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
  }
  console.log('로고 시안:', dir);
} else if (args.includes('--cards')) {
  const dir = path.join(OUT, 'cards'); fs.mkdirSync(dir, { recursive: true });
  const names = await page.evaluate(() => window.FEED_CARDS);
  for (let i = 0; i < names.length; i++) {
    const u = await page.evaluate(i => { window.drawFeedCard(i); return document.getElementById('c').toDataURL('image/png'); }, i);
    fs.writeFileSync(path.join(dir, `card-${names[i]}.png`), Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
  }
  const wu = await page.evaluate(() => window.workoutImage());
  fs.writeFileSync(path.join(OUT, 'workout-plan.png'), Buffer.from(wu.slice(wu.indexOf(',') + 1), 'base64'));
  console.log('카드 저장:', dir, '+ out/workout-plan.png');
} else if (args.includes('--cover')) {
  fs.writeFileSync(path.join(OUT, 'cover.png'), await grab(0));
  console.log('커버 저장:', path.join(OUT, 'cover.png'));
} else if (stillsIdx >= 0) {
  const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of args[stillsIdx + 1].split(',').map(Number)) {
    fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.png`), await grab(t));
  }
  console.log('스틸 저장:', dir);
} else {
  const { FPS, DUR } = await page.evaluate(() => ({ FPS: window.FPS, DUR: window.DUR }));
  const N = Math.round(FPS * DUR);
  // 2배 시간 슈퍼샘플링(120fps 렌더 → 프레임 블렌딩)으로 모션 블러
  const SUB = Number(process.env.SUB || 2);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-',
    '-vf', SUB > 1 ? `tmix=frames=${SUB}:weights='${Array(SUB).fill(1).join(' ')}',select='not(mod(n+1\,${SUB}))',setpts=N/${FPS}/TB` : 'null',
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv444p', path.join(OUT, 'raw.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N * SUB; i++) {
    // 각 출력 프레임 f 에 대해 [f - 셔터/2, f] 구간을 샘플 (180° 셔터)
    const f = Math.floor(i / SUB), s = i % SUB;
    const t = Math.max(0, Math.min(DUR - 1e-4, (f + (s - (SUB - 1)) * 0.5 / SUB) / FPS));
    const png = await grab(t);
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) process.stdout.write(`\r프레임 ${i}/${N * SUB}  ${((Date.now() - t0) / 1000).toFixed(0)}초`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`\n완료: ${((Date.now() - t0) / 1000).toFixed(0)}초`);
}
await browser.close();
server.close();
