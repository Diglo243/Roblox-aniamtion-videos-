#!/usr/bin/env node
// Renders an Ascend.Mind episode to a silent 1080x1920 30 fps H.264 video.
// usage: node ascend/render.js <episode.json> <out.mp4> [--workers N] [--stills 1,6.5,12] [--fps 30]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const epPath = args[0], out = args[1];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const WORKERS = parseInt(opt('--workers', String(Math.max(1, Math.min(4, require('os').cpus().length)))), 10);
const STILLS = opt('--stills', null);
const FPS = parseInt(opt('--fps', '30'), 10);

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.ttf': 'font/ttf' };
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
const LAUNCH = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] };

async function openPage(browser, url, ep, wi) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error(`[w${wi}] pageerror`, e.message));
  page.on('console', m => { if (m.type() === 'error') console.error(`[w${wi}]`, m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.engineReady === true || window.engineError, null, { timeout: 90000 });
  await page.evaluate((e) => window.setupEpisode(e), ep);
  return page;
}

async function main() {
  const ep = JSON.parse(fs.readFileSync(epPath, 'utf8'));
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/ascend/engine/index.html`;
  const browser = await chromium.launch(LAUNCH);
  const t0 = Date.now();
  if (STILLS) {
    fs.mkdirSync(out, { recursive: true });
    const page = await openPage(browser, url, ep, 0);
    for (const ts of STILLS.split(',').map(Number)) {
      await page.evaluate((t) => window.renderAt(t), ts);
      const d = await page.evaluate(() => window.grab(0.9));
      fs.writeFileSync(path.join(out, `still_${ts.toFixed(2)}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
      console.log(`[still] t=${ts}`);
    }
  } else {
    const total = Math.round(ep.duration * FPS);
    const tmp = out + '.parts'; fs.mkdirSync(tmp, { recursive: true });
    const per = Math.ceil(total / WORKERS);
    let done = 0;
    await Promise.all(Array.from({ length: WORKERS }, async (_, wi) => {
      const a = wi * per, b = Math.min(total, a + per);
      if (a >= b) return;
      const page = await openPage(browser, url, ep, wi);
      const seg = path.join(tmp, `${String(wi).padStart(2, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let i = a; i < b; i++) {
        const d = await page.evaluate((t) => { window.renderAt(t); return window.grab(0.94); }, i / FPS);
        const buf = Buffer.from(d.split(',')[1], 'base64');
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        done++;
        if (done % 30 === 0) console.log(`[render] ${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end();
      await new Promise((r, j) => ff.on('close', c => c === 0 ? r() : j(new Error('ffmpeg failed'))));
      await page.close();
    }));
    const list = fs.readdirSync(tmp).filter(f => f.endsWith('.mp4')).sort().map(f => `file '${path.join(tmp, f)}'`).join('\n');
    fs.writeFileSync(path.join(tmp, 'list.txt'), list);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`[render] done ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close(); srv.close();
}
main().catch(e => { console.error(e); process.exit(1); });
