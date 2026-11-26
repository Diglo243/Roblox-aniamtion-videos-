#!/usr/bin/env node
// Renders every shot of a storyboard into H.264 segments using headless Chromium (WebGL/SwiftShader).
// usage: node director/render.js <storyboard.json> <outDir> [--workers N] [--only id,id] [--stills]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const sbPath = args[0], outDir = args[1];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const WORKERS = parseInt(opt('--workers', String(Math.max(1, Math.min(4, require('os').cpus().length)))), 10);
const ONLY = opt('--only', null);
const STILLS = args.includes('--stills');
const FPS = 30;

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { resp.writeHead(404); return resp.end(); }
      resp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function main() {
  const sb = JSON.parse(fs.readFileSync(sbPath, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  const crypto = require('crypto');
  const eh = crypto.createHash('sha1');
  for (const f of fs.readdirSync(path.join(__dirname, 'engine')).sort()) eh.update(fs.readFileSync(path.join(__dirname, 'engine', f)));
  const ENGINE = eh.digest('hex').slice(0, 12);
  const key = (s) => JSON.stringify({ engine: ENGINE, cast: sb.cast, shot: s });
  let shots = sb.shots;
  if (ONLY) { const s = new Set(ONLY.split(',')); shots = shots.filter(x => s.has(String(x.id))); }
  // skip shots already rendered with identical spec (cache)
  const todo = shots.filter(s => {
    const f = path.join(outDir, `${s.id}.mp4`), h = path.join(outDir, `${s.id}.json`);
    if (STILLS) return true;
    return !(fs.existsSync(f) && fs.existsSync(h) && fs.readFileSync(h, 'utf8') === key(s));
  });
  console.log(`[render] ${todo.length}/${shots.length} shots to render with ${WORKERS} workers`);
  if (!todo.length) return;
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/director/engine/index.html`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const queue = todo.slice().sort((a, b) => b.frames - a.frames);
  let done = 0; const t0 = Date.now();
  async function worker(wi) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    page.on('pageerror', e => console.error(`[w${wi}] pageerror`, e.message));
    page.on('console', m => { if (m.type() === 'error') console.error(`[w${wi}]`, m.text()); });
    await page.goto(url);
    await page.waitForFunction(() => window.engineReady === true, null, { timeout: 60000 });
    while (queue.length) {
      const shot = queue.shift();
      await page.evaluate(([s, c]) => window.setupShot(s, c), [shot, sb.cast]);
      if (STILLS) {
        for (const [k, tt] of [['a', 0.15], ['b', shot.duration * 0.6]]) {
          await page.evaluate((t) => window.renderAt(t), tt);
          const d = await page.evaluate(() => window.grab(0.85));
          fs.writeFileSync(path.join(outDir, `${shot.id}_${k}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
        }
      } else {
        const out = path.join(outDir, `${shot.id}.mp4`);
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
        for (let i = 0; i < shot.frames; i++) {
          const d = await page.evaluate((t) => { window.renderAt(t); return window.grab(0.93); }, i / FPS);
          const buf = Buffer.from(d.split(',')[1], 'base64');
          if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        }
        ff.stdin.end();
        await new Promise((r, j) => ff.on('close', c => c === 0 ? r() : j(new Error('ffmpeg failed ' + shot.id))));
        fs.writeFileSync(path.join(outDir, `${shot.id}.json`), key(shot));
      }
      done++;
      const el = (Date.now() - t0) / 1000;
      console.log(`[render] ${done}/${todo.length} shot ${shot.id} (${shot.env}/${shot.camera?.type}) ${shot.frames}f  elapsed ${el.toFixed(0)}s`);
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: Math.min(WORKERS, todo.length) }, (_, i) => worker(i)));
  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
