#!/usr/bin/env node
// Generates the Ascend.Mind brand kit into assets/ascend/ (re-run after editing ascend/brand.json).
// usage: node ascend/kit.js [item ...]   items: logo_mark logo_full watermark avatar banner cast_sheet cover guide cards
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'ascend');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((req, resp) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { resp.writeHead(404); return resp.end(); }
  resp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(resp);
});
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  page.on('pageerror', e => console.error('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error(m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/ascend/engine/kit.html`);
  await page.waitForFunction(() => window.engineReady === true, null, { timeout: 60000 });
  fs.mkdirSync(path.join(OUT, 'cards'), { recursive: true });
  const want = process.argv.slice(2);
  const all = ['logo_mark', 'logo_full', 'watermark', 'avatar', 'banner', 'cast_sheet', 'cover', 'guide', 'cards'];
  for (const it of (want.length ? want : all)) {
    if (it === 'cards') {
      for (const n of await page.evaluate(() => window.castNames())) {
        const d = await page.evaluate((n) => window.makeItem('card', n), n);
        fs.writeFileSync(path.join(OUT, 'cards', n.toLowerCase() + '.png'), Buffer.from(d.split(',')[1], 'base64'));
        console.log('[kit] card', n);
      }
      continue;
    }
    const d = await page.evaluate((n) => window.makeItem(n), it);
    fs.writeFileSync(path.join(OUT, it + '.png'), Buffer.from(d.split(',')[1], 'base64'));
    console.log('[kit]', it);
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
