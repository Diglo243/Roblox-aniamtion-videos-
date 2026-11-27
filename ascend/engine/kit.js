// Ascend.Mind brand kit: renders every channel template (logo, avatar, banner, cards, cover, guide)
// with the SAME characters and 2D primitives as the videos. Driven by ascend/kit.js (node).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Mind } from './mind.js';
import { loadBrand, BRAND, drawMark, drawWordmark, drawLabel, drawWatermark, drawTitle, hexA, mix, spacedText, spacedWidth } from './brandlib.js';

const POSES = {
  stand: { hipA: 0.04, hipB: -0.04, kneeA: -0.06, kneeB: -0.06, ankleA: 0.02, ankleB: 0.1, shA: 0.05, shB: 0.05, shAbdA: 0.12, shAbdB: 0.12, elA: 0.2, elB: 0.2 },
  hero: { hipA: 0.05, hipB: -0.05, hipAbdA: 0.12, hipAbdB: 0.12, kneeA: -0.05, kneeB: -0.05, shA: -0.25, shB: -0.25, shAbdA: 0.55, shAbdB: 0.55, elA: 1.9, elB: 1.9, spine: -0.05, neck: -0.1 },
  wave: { hipA: 0.04, hipB: -0.04, shA: 0.1, shB: 2.6, shAbdA: 0.15, shAbdB: 0.5, elA: 0.2, elB: 0.6, neck: -0.08 },
  cheer: { hipA: 0.04, hipB: -0.04, shA: 2.75, shB: 2.75, shAbdA: 0.45, shAbdB: 0.45, elA: 0.25, elB: 0.25, neck: -0.25, spine: -0.08 },
  think: { hipA: 0.04, hipB: -0.04, shA: 0.2, shB: 1.2, shAbdB: 0.1, elA: 0.4, elB: 2.3, neck: 0.15, headYaw: 0.25 },
  tired: { hipA: 0.3, hipB: 0.25, kneeA: -0.5, kneeB: -0.45, ankleA: 0.2, ankleB: 0.2, spine: 0.85, neck: 0.15, shA: 0.75, shB: 0.75, shAbdA: 0.2, shAbdB: 0.2, elA: 0.25, elB: 0.25, yoff: -0.16 },
  sit: { hipA: 1.45, hipB: 1.45, kneeA: -1.45, kneeB: -1.45, ankleA: 0, ankleB: 0, spine: 0.55, neck: 0.55, shA: 0.85, shB: 0.85, elA: 1.15, elB: 1.15, yoff: -0.42 },
};
const PREF = { DISCIPLINE: 'hero', OBSESSION: 'stand', MOTIVATION: 'wave', EGO: 'hero', CONSISTENCY: 'stand', TALENT: 'wave', LAZINESS: 'sit', FEAR: 'tired', PATIENCE: 'think', DOUBT: 'think' };

function makeStudio(w, h, o = {}) {
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: !!o.transparent });
  r.setPixelRatio(1); r.setSize(w, h, false);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  if (!o.transparent) scene.background = new THREE.Color(BRAND.palette.void);
  const cam = new THREE.PerspectiveCamera(o.fov || 30, w / h, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0x5a6688, 0x0a0a12, 0.7));
  const key = new THREE.DirectionalLight(0xffe6c4, 1.4); key.position.set(4, 9, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10;
  key.shadow.normalBias = 0.02; scene.add(key);
  const rim = new THREE.DirectionalLight(0x6f8cff, 1.2); rim.position.set(-6, 5, -8); scene.add(rim);
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const comp = new EffectComposer(r, rt);
  comp.addPass(new RenderPass(scene, cam));
  comp.addPass(new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.55, 0.4, 0.88));
  comp.addPass(new OutputPass());
  return { canvas, r, scene, cam, comp, key };
}

// glowing step platform (a slice of the channel's staircase)
function steps(scene, n, x0, width, o = {}) {
  const P = BRAND.palette, RUN = o.run || 0.9, RISE = o.rise || 0.3, D = o.depth || 3;
  const stone = new THREE.MeshStandardMaterial({ color: 0x5f5d5a, roughness: 0.85 });
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.gold).multiplyScalar(3), toneMapped: false });
  const tops = [];
  for (let i = 0; i < n; i++) {
    const h = (i + 1) * RISE, z = o.z0 !== undefined ? o.z0 - i * RUN : -i * RUN;
    const b = new THREE.Mesh(new THREE.BoxGeometry(width, h, RUN), stone);
    b.position.set(x0, h / 2, z - RUN / 2 + RUN); b.receiveShadow = true; b.castShadow = true; scene.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, 0.045, 0.03), strip);
    s.position.set(x0, h - 0.03, z + RUN + 0.012); scene.add(s);
    tops.push([z + RUN / 2, h]);
  }
  return tops;
}

function floor(scene) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.95 }));
  f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
}

function placeMind(scene, concept, x, y, z, yaw, poseName, t = 0.4) {
  const cfg = BRAND.cast[concept];
  const m = new Mind(concept, cfg, BRAND.palette.gold);
  const p = { ...POSES[poseName || PREF[concept] || 'stand'] };
  m.apply({ x, y: y + 0.93 + (p.yoff || 0), z, yaw, ...p }, t);
  scene.add(m.root);
  return m;
}

function project(st, m, w, h, up = 0.62) {
  const v = m.headWorld(new THREE.Vector3()); v.y += up; v.project(st.cam);
  return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h];
}

function finish(st, w, h, draw) {
  st.comp.render();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.drawImage(st.canvas, 0, 0);
  draw && draw(ctx);
  st.r.dispose(); st.r.forceContextLoss();
  return c.toDataURL('image/png');
}

function vignette(ctx, w, h, a = 0.6) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

function wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

const items = {
  logo_mark() {
    const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
    drawMark(x, 512, 540, 760, { glow: 14 }); return c.toDataURL('image/png');
  },
  logo_full() {
    const c = document.createElement('canvas'); c.width = 2400; c.height = 640; const x = c.getContext('2d');
    drawMark(x, 330, 330, 470, { glow: 12 });
    drawWordmark(x, 640, 400, 210);
    x.font = '700 64px Poppins'; x.fillStyle = hexA('#F4F1EA', 0.75);
    spacedText(x, BRAND.tagline.toUpperCase(), 650, 520, 64 * 0.18);
    return c.toDataURL('image/png');
  },
  watermark() {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 160; const x = c.getContext('2d');
    drawWatermark(x, 1080, 160, { y: 0.5, alpha: 1 }); return c.toDataURL('image/png');
  },
  avatar() {
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S * 0.42, 40, S / 2, S / 2, S * 0.72);
    g.addColorStop(0, '#1d2540'); g.addColorStop(0.55, BRAND.palette.night); g.addColorStop(1, BRAND.palette.void);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // stair silhouette glowing lines
    x.save(); x.globalAlpha = 0.18; x.strokeStyle = BRAND.palette.gold; x.lineWidth = 6;
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, S - i * 70 - 40); x.lineTo(S, S - i * 70 - 40 - 340); x.stroke(); }
    x.restore();
    x.strokeStyle = hexA(BRAND.palette.gold, 0.9); x.lineWidth = 14; x.shadowColor = BRAND.palette.gold; x.shadowBlur = 40;
    x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 34, 0, Math.PI * 2); x.stroke(); x.shadowBlur = 0;
    drawMark(x, S / 2, S / 2 + 20, 560, { glow: 18 });
    return c.toDataURL('image/png');
  },
  banner() {
    const w = 2560, h = 1440, st = makeStudio(w, h, { fov: 24 });
    floor(st.scene);
    const order = ['LAZINESS', 'FEAR', 'DOUBT', 'MOTIVATION', 'TALENT', 'OBSESSION', 'EGO', 'PATIENCE', 'CONSISTENCY', 'DISCIPLINE'];
    // a long staircase rising left → right, one Mind per step
    const RUN = 1.0, RISE = 0.32, stone = new THREE.MeshStandardMaterial({ color: 0x5f5d5a, roughness: 0.85 });
    const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.palette.gold).multiplyScalar(3), toneMapped: false });
    const ms = [];
    order.forEach((c, i) => {
      const hh = (i + 1) * RISE, x0 = (i - 4.5) * RUN;
      const b = new THREE.Mesh(new THREE.BoxGeometry(RUN, hh, 2.4), stone); b.position.set(x0, hh / 2, 0); b.castShadow = b.receiveShadow = true; st.scene.add(b);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 2.3), strip); s.position.set(x0 - RUN / 2 - 0.012, hh - 0.03, 0); st.scene.add(s);
      ms.push(placeMind(st.scene, c, x0, hh, 0.2, -Math.PI / 2 + 0.5, PREF[c], i * 0.7));
    });
    st.cam.position.set(0, 3.2, 19); st.cam.lookAt(0, 2.3, 0);
    return finish(st, w, h, (ctx) => {
      vignette(ctx, w, h, 0.5);
      ms.forEach(m => { const [lx, ly] = project(st, m, w, h, 0.55); drawLabel(ctx, m.name, lx, ly, 22, mix(m.cfg.color, '#ffffff', 0.18)); });
      // safe area (1546x423, centred) holds the wordmark on a dark band
      const g = ctx.createLinearGradient(0, 430, 0, 1010);
      g.addColorStop(0, 'rgba(7,8,13,0)'); g.addColorStop(0.3, 'rgba(7,8,13,0.86)'); g.addColorStop(0.7, 'rgba(7,8,13,0.86)'); g.addColorStop(1, 'rgba(7,8,13,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 430, w, 580);
      drawMark(ctx, w / 2 - 560, 690, 200, { glow: 12 });
      drawWordmark(ctx, w / 2 - 430, 745, 132);
      ctx.font = '700 42px Poppins'; ctx.fillStyle = hexA('#F4F1EA', 0.85);
      spacedText(ctx, 'ONE STEP. EVERY DAY.  ·  NEW SHORT DAILY', w / 2 - 424, 830, 42 * 0.12);
    });
  },
  card(concept) {
    const w = 1080, h = 1920, st = makeStudio(w, h, { fov: 26 });
    floor(st.scene);
    const tops = steps(st.scene, 3, 0, 3.2, { run: 1.1 });
    const m = placeMind(st.scene, concept, 0, tops[1][1], tops[1][0] - 0.1, -Math.PI / 2 + 0.45, PREF[concept], 1.3);
    const spot = new THREE.SpotLight(0xfff0d0, 30, 20, 0.3, 0.6, 1.2); spot.position.set(0, 9, 0.3); spot.target = m.root; st.scene.add(spot);
    st.cam.position.set(0.0, 2.3, 9.2); st.cam.lookAt(0, 1.05, -0.6);
    const cfg = BRAND.cast[concept];
    return finish(st, w, h, (ctx) => {
      vignette(ctx, w, h, 0.65);
      const col = mix(cfg.color, '#ffffff', 0.15);
      const gb = ctx.createLinearGradient(0, 1250, 0, 1500); gb.addColorStop(0, 'rgba(7,8,13,0)'); gb.addColorStop(1, 'rgba(7,8,13,0.93)');
      ctx.fillStyle = gb; ctx.fillRect(0, 1250, w, 250); ctx.fillStyle = 'rgba(7,8,13,0.93)'; ctx.fillRect(0, 1500, w, 420);
      // top: mark + series tag
      drawMark(ctx, 120, 150, 110, { glow: 10 });
      ctx.font = '800 34px Poppins'; ctx.fillStyle = hexA('#F4F1EA', 0.85); ctx.textBaseline = 'middle';
      spacedText(ctx, 'THE MINDS  ·  ' + BRAND.handle.toUpperCase(), 200, 152, 4);
      // name
      ctx.textAlign = 'left';
      const px = concept.length > 9 ? 112 : 132;
      ctx.font = `900 ${px}px Poppins`; const sw = spacedWidth(ctx, concept, px * 0.06);
      ctx.save(); ctx.shadowColor = hexA(cfg.color, 0.8); ctx.shadowBlur = 50; ctx.fillStyle = col; ctx.textBaseline = 'alphabetic';
      spacedText(ctx, concept, (w - sw) / 2, 1520, px * 0.06); ctx.restore();
      ctx.fillStyle = col; ctx.fillRect(w / 2 - 70, 1560, 140, 10);
      ctx.font = '700 46px Poppins'; ctx.fillStyle = '#F4F1EA'; ctx.textAlign = 'center';
      wrap(ctx, cfg.trait, 860).forEach((ln, i) => ctx.fillText(ln, w / 2, 1650 + i * 62));
      // colour chip
      ctx.textAlign = 'left';
      ctx.fillStyle = cfg.color; ctx.beginPath(); ctx.arc(w - 230, 150, 22, 0, 7); ctx.fill();
      ctx.font = '700 30px Poppins'; ctx.fillStyle = hexA('#F4F1EA', 0.8); ctx.fillText(cfg.color.toUpperCase(), w - 195, 152);
    });
  },
  cast_sheet() {
    const w = 3000, h = 1500, st = makeStudio(w, h, { fov: 20 });
    floor(st.scene);
    const names = Object.keys(BRAND.cast);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(17, 0.3, 2.2), new THREE.MeshStandardMaterial({ color: 0x5f5d5a, roughness: 0.85 }));
    plat.position.set(0, 0.15, 0); plat.receiveShadow = true; st.scene.add(plat);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(16.9, 0.045, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.palette.gold).multiplyScalar(3), toneMapped: false }));
    strip.position.set(0, 0.27, 1.11); st.scene.add(strip);
    const ms = names.map((n, i) => placeMind(st.scene, n, (i - 4.5) * 1.6, 0.3, 0, -Math.PI / 2, PREF[n], i));
    st.cam.position.set(0, 2.4, 24.5); st.cam.lookAt(0, 1.25, 0);
    return finish(st, w, h, (ctx) => {
      vignette(ctx, w, h, 0.45);
      ms.forEach(m => {
        const [lx, ly] = project(st, m, w, h, 0.5);
        drawLabel(ctx, m.name, lx, ly, 34, mix(m.cfg.color, '#ffffff', 0.18));
        const by = h * 0.66;
        ctx.font = '700 22px Poppins'; ctx.textAlign = 'center'; ctx.fillStyle = hexA('#F4F1EA', 0.75);
        wrap(ctx, m.cfg.trait, 250).forEach((ln, i) => ctx.fillText(ln, lx, by + 40 + i * 28));
        ctx.textAlign = 'left';
      });
      drawMark(ctx, 150, 140, 120, { glow: 10 });
      drawWordmark(ctx, 240, 172, 86);
      ctx.font = '800 40px Poppins'; ctx.fillStyle = hexA('#F4F1EA', 0.8);
      spacedText(ctx, 'THE MINDS — OFFICIAL CAST', 1000 + 700, 160, 6);
    });
  },
  cover(a = 'OBSESSION', b = 'DISCIPLINE') {
    const w = 1080, h = 1920, st = makeStudio(w, h, { fov: 30 });
    floor(st.scene);
    const tops = steps(st.scene, 6, 0, 3.6, { run: 0.75 });
    const ma = placeMind(st.scene, a, -0.85, tops[2][1], tops[2][0], -Math.PI / 2 + 0.3, 'stand', 0.2);
    const mb = placeMind(st.scene, b, 0.85, tops[2][1], tops[2][0], -Math.PI / 2 - 0.3, 'hero', 0.9);
    st.cam.position.set(0, 2.9, 11.5); st.cam.lookAt(0, 2.9, -1.5);
    return finish(st, w, h, (ctx) => {
      vignette(ctx, w, h, 0.6);
      const ca = mix(BRAND.cast[a].color, '#fff', 0.15), cb = mix(BRAND.cast[b].color, '#fff', 0.15);
      const [ax, ay] = project(st, ma, w, h, 0.55), [bx, by] = project(st, mb, w, h, 0.55);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = '900 150px Poppins'; ctx.save();
      ctx.shadowColor = hexA(BRAND.cast[a].color, 0.8); ctx.shadowBlur = 40; ctx.fillStyle = ca; ctx.fillText(a, w / 2, 330);
      ctx.shadowColor = hexA(BRAND.cast[b].color, 0.8); ctx.fillStyle = cb; ctx.fillText(b, w / 2, 610); ctx.restore();
      ctx.font = '900 90px Poppins'; ctx.fillStyle = BRAND.palette.gold; ctx.shadowColor = BRAND.palette.gold; ctx.shadowBlur = 30;
      ctx.fillText('VS', w / 2, 465); ctx.shadowBlur = 0;
      drawWatermark(ctx, w, h);
    });
  },
  guide() {
    const w = 2400, h = 1600, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = BRAND.palette.void; x.fillRect(0, 0, w, h);
    drawMark(x, 170, 170, 170, { glow: 10 }); drawWordmark(x, 290, 215, 110);
    x.font = '800 40px Poppins'; x.fillStyle = hexA('#F4F1EA', 0.7); spacedText(x, 'BRAND GUIDE  ·  ' + BRAND.handle, 296, 285, 5);
    // palette
    const P = BRAND.palette, keys = Object.keys(P);
    x.font = '900 44px Poppins'; x.fillStyle = '#F4F1EA'; x.fillText('PALETTE', 120, 430);
    keys.forEach((k, i) => {
      const px = 120 + i * 270, py = 470;
      x.fillStyle = P[k]; x.fillRect(px, py, 230, 160); x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 2; x.strokeRect(px, py, 230, 160);
      x.font = '800 30px Poppins'; x.fillStyle = '#F4F1EA'; x.fillText(k.toUpperCase(), px, py + 205);
      x.font = '700 26px Poppins'; x.fillStyle = hexA('#F4F1EA', 0.65); x.fillText(P[k], px, py + 242);
    });
    // cast colours
    x.font = '900 44px Poppins'; x.fillStyle = '#F4F1EA'; x.fillText('THE MINDS — ONE COLOUR EACH, FOREVER', 120, 830);
    Object.entries(BRAND.cast).forEach(([n, cfg], i) => {
      const px = 120 + (i % 5) * 440, py = 880 + Math.floor(i / 5) * 130;
      x.fillStyle = cfg.color; x.beginPath(); x.arc(px + 40, py + 40, 40, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.shadowColor = cfg.eyes; x.shadowBlur = 12;
      x.beginPath(); x.ellipse(px + 30, py + 38, 5, 10, 0, 0, 7); x.ellipse(px + 50, py + 38, 5, 10, 0, 0, 7); x.fill(); x.shadowBlur = 0;
      x.font = '900 32px Poppins'; x.fillStyle = mix(cfg.color, '#ffffff', 0.18); x.fillText(n, px + 100, py + 36);
      x.font = '700 24px Poppins'; x.fillStyle = hexA('#F4F1EA', 0.6); x.fillText(cfg.color, px + 100, py + 70);
    });
    // typography + rules
    x.font = '900 44px Poppins'; x.fillStyle = '#F4F1EA'; x.fillText('TYPOGRAPHY', 120, 1200);
    drawLabel(x, 'DISCIPLINE', 330, 1290, 52, mix(BRAND.cast.DISCIPLINE.color, '#fff', 0.18));
    x.font = '700 28px Poppins'; x.fillStyle = hexA('#F4F1EA', 0.7);
    x.fillText('Labels : Poppins 900, capitales, interlettrage 10 %,', 120, 1390);
    x.fillText('couleur du personnage + soulignement.', 120, 1428);
    drawTitle(x, 1300, h, 'WHO REACHES THE *TOP*?', 1, { y: 1520 / h, px: 56 });
    x.font = '900 44px Poppins'; x.fillStyle = '#F4F1EA'; x.fillText('IN EVERY VIDEO', 1500, 1200);
    x.font = '700 26px Poppins'; x.fillStyle = hexA('#F4F1EA', 0.75);
    ['Escaliers graphite, nez de marche en or, marches numérotées', 'Minds colorés aux yeux lumineux + emblème Λ', 'Logo Λ du sommet qui s\'allume + faisceau', 'Filigrane emblème + @Ascend.Mind en bas', 'Logo sonore : 3 cloches dorées montantes']
      .forEach((ln, i) => { x.fillStyle = P.gold; x.fillRect(1500, 1248 + i * 56, 14, 14); x.fillStyle = hexA('#F4F1EA', 0.8); x.fillText(ln, 1530, 1262 + i * 56); });
    return c.toDataURL('image/png');
  },
};

window.makeItem = async (name, ...args) => items[name](...args);
window.castNames = () => Object.keys(BRAND.cast);
loadBrand().then(() => { window.engineReady = true; });
