// Ascend.Mind — 2D brand primitives shared by the video engine and the brand kit.
// Every logo / wordmark / label / watermark of the channel is drawn by these functions,
// so the identity stays pixel-identical everywhere.

export let BRAND = null;
export async function loadBrand() {
  if (!BRAND) BRAND = await (await fetch('/ascend/brand.json')).json();
  await Promise.all(['900', '800', '700'].map(w => document.fonts.load(`${w} 40px Poppins`)));
  await document.fonts.load('italic 700 40px Poppins');
  return BRAND;
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// The mark: a capital "A" whose left leg is a staircase, topped by a glowing "mind" dot.
// Drawn in a 100x100 box centred on (cx, cy) scaled to `size` px.
export function markPath(ctx, cx, cy, size) {
  const s = size / 100, X = (v) => cx + (v - 50) * s, Y = (v) => cy + (v - 50) * s;
  const pts = [[10, 92], [10, 78], [22, 78], [22, 64], [34, 64], [34, 50], [46, 50], [46, 36]];
  ctx.beginPath();
  ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
  for (const [x, y] of pts.slice(1)) ctx.lineTo(X(x), Y(y));
  ctx.lineTo(X(56), Y(26));          // peak
  ctx.lineTo(X(90), Y(92));          // right leg
}
export function drawMark(ctx, cx, cy, size, o = {}) {
  const gold = o.color || (BRAND ? BRAND.palette.gold : '#FFC24A');
  const s = size / 100;
  ctx.save();
  ctx.lineJoin = 'miter'; ctx.lineCap = 'square'; ctx.miterLimit = 4;
  if (o.glow !== false) { ctx.shadowColor = hexA(gold, 0.85); ctx.shadowBlur = (o.glow ?? 18) * s * 2.2; }
  if (o.gradient !== false) {
    const g = ctx.createLinearGradient(cx - 50 * s, cy + 50 * s, cx + 50 * s, cy - 50 * s);
    g.addColorStop(0, o.color2 || (BRAND ? BRAND.palette.gold_deep : '#E08A12'));
    g.addColorStop(1, mix(gold, '#ffffff', 0.25));
    ctx.strokeStyle = g;
  } else ctx.strokeStyle = gold;
  ctx.lineWidth = (o.weight ?? 9.5) * s;
  markPath(ctx, cx, cy, size);
  ctx.stroke();
  // crossbar of the A (short, like a landing)
  ctx.beginPath(); ctx.moveTo(cx + 12 * s, cy + 22 * s); ctx.lineTo(cx + 30 * s, cy + 22 * s); ctx.stroke();
  // the mind: glowing dot above the peak
  ctx.shadowColor = hexA(o.dot || '#ffffff', 0.95); ctx.shadowBlur = 22 * s * 1.6;
  ctx.fillStyle = o.dot || '#FFFFFF';
  ctx.beginPath(); ctx.arc(cx + 6 * s, cy - 40 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// "ASCEND.MIND" wordmark, left-aligned at (x, y baseline) — returns width.
export function drawWordmark(ctx, x, y, px, o = {}) {
  ctx.save();
  ctx.font = `900 ${px}px Poppins`;
  ctx.textBaseline = 'alphabetic';
  const sp = px * 0.06;
  const parts = [['ASCEND', o.color || '#F4F1EA'], ['.', BRAND.palette.gold], ['MIND', BRAND.palette.gold]];
  let cx = x;
  const widths = parts.map(([t]) => spacedWidth(ctx, t, sp));
  const total = widths.reduce((a, b) => a + b, 0);
  if (o.align === 'center') cx = x - total / 2;
  if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = px * 0.25; ctx.shadowOffsetY = px * 0.05; }
  parts.forEach(([t, c], i) => {
    ctx.fillStyle = c;
    if (c === BRAND.palette.gold && o.glow !== false) { ctx.shadowColor = hexA(c, 0.6); ctx.shadowBlur = px * 0.35; ctx.shadowOffsetY = 0; }
    spacedText(ctx, t, cx, y, sp);
    cx += widths[i];
  });
  ctx.restore();
  return total;
}

export function spacedWidth(ctx, t, sp) {
  let w = 0; for (const ch of t) w += ctx.measureText(ch).width + sp; return w - sp;
}
export function spacedText(ctx, t, x, y, sp, stroke = false) {
  ctx.textAlign = 'left';
  for (const ch of t) { if (stroke) ctx.strokeText(ch, x, y); else ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + sp; }
}

// Concept label floating above a character (the channel's caption style).
export function drawLabel(ctx, text, cx, cy, px, color, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${px}px Poppins`;
  ctx.textBaseline = 'middle';
  const sp = px * 0.1, w = spacedWidth(ctx, text, sp), x = cx - w / 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(5,6,10,0.9)'; ctx.lineWidth = px * 0.22;
  spacedText(ctx, text, x, cy, sp, true);
  ctx.shadowColor = hexA(color, 0.75); ctx.shadowBlur = px * 0.5;
  ctx.fillStyle = color;
  spacedText(ctx, text, x, cy, sp);
  ctx.shadowBlur = 0;
  // small gold tick under the label — the channel's signature underline
  ctx.fillStyle = hexA(color, 0.9);
  ctx.fillRect(cx - px * 0.35, cy + px * 0.62, px * 0.7, Math.max(2, px * 0.08));
  ctx.restore();
}

// Watermark: mark + handle, bottom centre (same place in every video).
export function drawWatermark(ctx, W, H, o = {}) {
  const y = H * (o.y ?? 0.885), px = Math.round(W * 0.031);
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 0.82;
  ctx.font = `700 ${px}px Poppins`;
  const sp = px * 0.04;
  const tw = spacedWidth(ctx, BRAND.handle, sp);
  const ms = px * 1.5, gap = px * 0.45, total = ms + gap + tw;
  const x0 = W / 2 - total / 2;
  drawMark(ctx, x0 + ms / 2, y, ms, { glow: 10, weight: 11 });
  ctx.fillStyle = '#F4F1EA'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = px * 0.3;
  spacedText(ctx, BRAND.handle, x0 + ms + gap, y + px * 0.05, sp);
  ctx.restore();
}

// Big hook title (top of the video). Words wrapped in *stars* are painted gold.
export function drawTitle(ctx, W, H, text, alpha = 1, o = {}) {
  if (alpha <= 0.01) return;
  const px = o.px || Math.round(W * 0.066);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${px}px Poppins`;
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  const sp = px * 0.04;
  lines.forEach((line, li) => {
    const words = line.split(' ');
    const ws = words.map(w => spacedWidth(ctx, w.replace(/\*/g, ''), sp));
    const space = px * 0.3, total = ws.reduce((a, b) => a + b, 0) + space * (words.length - 1);
    let x = W / 2 - total / 2;
    const y = H * (o.y ?? 0.15) + li * px * 1.15 + (1 - alpha) * -px * 0.3;
    words.forEach((w, i) => {
      const gold = w.includes('*'), t = w.replace(/\*/g, '');
      ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(5,6,10,0.92)'; ctx.lineWidth = px * 0.2;
      spacedText(ctx, t, x, y, sp, true);
      ctx.fillStyle = gold ? BRAND.palette.gold : '#F4F1EA';
      ctx.shadowColor = gold ? hexA(BRAND.palette.gold, 0.7) : 'rgba(0,0,0,0)'; ctx.shadowBlur = gold ? px * 0.45 : 0;
      spacedText(ctx, t, x, y, sp);
      ctx.shadowBlur = 0;
      x += ws[i] + space;
    });
  });
  ctx.restore();
}
