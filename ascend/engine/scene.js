// Ascend.Mind — staircase arena, choreography (poses from an episode JSON), camera and overlay.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Mind, legIK, ANKLE_H } from './mind.js';
import { BRAND, drawMark, drawLabel, drawWatermark, drawTitle, mix } from './brandlib.js';

export const RUN = 0.55, RISE = 0.3, LANE_W = 1.5, LANE_GAP = 0.12;
const SLOPE = Math.atan2(RISE, RUN);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// monotone cubic interpolation of [[t, v], ...]
export function pchip(keys) {
  const n = keys.length;
  if (n === 1) return () => keys[0][1];
  const x = keys.map(k => k[0]), y = keys.map(k => k[1]), h = [], d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) { h[i] = x[i + 1] - x[i]; d[i] = (y[i + 1] - y[i]) / h[i]; }
  m[0] = d[0] * 0.5; m[n - 1] = d[n - 2] * 0.5;
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  return (t) => {
    if (t <= x[0]) return y[0];
    if (t >= x[n - 1]) return y[n - 1];
    let i = 0; while (t > x[i + 1]) i++;
    const s = (t - x[i]) / h[i], s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h[i] * m[i + 1];
  };
}

function noiseTex(base, var_, size = 512, seed = 7, opts = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size / 9; i++) {
    const v = (r() - 0.5) * var_;
    x.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    x.fillRect(r() * size, r() * size, 1 + r() * 2.5, 1 + r() * 2.5);
  }
  for (let i = 0; i < (opts.blotches ?? 40); i++) {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
    const a = (r() - 0.5) * 0.12;
    g.addColorStop(0, a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.save(); x.translate(r() * size, r() * size); const s = 20 + r() * 90; x.scale(s, s); x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}

// world-space UVs so the stone texture never stretches on tall blocks
function worldUV(geo, ox, oy, oz, scale) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ox, y = p.getY(i) + oy, z = p.getZ(i) + oz;
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    if (nx > 0.5) uv.setXY(i, z * scale, y * scale);
    else if (ny > 0.5) uv.setXY(i, x * scale, z * scale);
    else uv.setXY(i, x * scale, y * scale);
  }
  uv.needsUpdate = true;
}

export class Arena {
  constructor(canvas, W = 1080, H = 1920) {
    this.W = W; this.H = H;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
    r.setPixelRatio(1); r.setSize(W, H, false);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.overlay = document.createElement('canvas'); this.overlay.width = W; this.overlay.height = H;
    this.octx = this.overlay.getContext('2d');
  }

  // ---------------------------------------------------------------- episode
  setup(ep) {
    this.ep = ep;
    const P = BRAND.palette, N = this.N = ep.steps || 20;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(P.void);
    scene.fog = new THREE.Fog(P.void, ep.fogNear ?? 30, ep.fogFar ?? 70);
    const cam = this.camera = new THREE.PerspectiveCamera(ep.camera?.fov || 36, this.W / this.H, 0.1, 120);
    this.composer.passes.length = 0;
    this.composer.addPass(new RenderPass(scene, cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.W / 2, this.H / 2), 0.75, 0.55, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // lights
    scene.add(new THREE.HemisphereLight(0x5a6688, 0x0a0a12, 0.55));
    const key = this.key = new THREE.DirectionalLight(0xffe6c4, 2.1);
    key.position.set(-6, 14, 9); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 50;
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
    key.target.position.set(N * RUN * 0.5, N * RISE * 0.4, 0); scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x6f8cff, 0.9); rim.position.set(14, 8, -10); scene.add(rim);

    // floor + backdrop
    const floorTex = noiseTex('#161b2b', 0.18, 512, 3); floorTex.repeat.set(10, 10);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const cur = document.createElement('canvas'); cur.width = 1024; cur.height = 64;
    const cx = cur.getContext('2d');
    for (let i = 0; i < 1024; i++) { const v = 0.5 + 0.5 * Math.sin(i / 1024 * Math.PI * 2 * 26) * 0.8 + 0.2 * Math.sin(i * 0.37); cx.fillStyle = `rgb(${12 + v * 18 | 0},${12 + v * 17 | 0},${16 + v * 20 | 0})`; cx.fillRect(i, 0, 1, 64); }
    const curT = new THREE.CanvasTexture(cur); curT.colorSpace = THREE.SRGBColorSpace; curT.wrapS = THREE.RepeatWrapping; curT.repeat.set(3, 1);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 40, 64, 1, true, Math.PI * 0.55, Math.PI * 1.1),
      new THREE.MeshStandardMaterial({ map: curT, side: THREE.BackSide, roughness: 1 }));
    back.position.set(N * RUN * 0.5 - 6, 20, 2); scene.add(back);

    // stairs
    const lanes = this.lanes = (ep.lanes || []).map((l, j) => ({ ...l, idx: j }));
    const nL = lanes.length;
    const stone = noiseTex(P.stone_light, 0.22, 512, 11); stone.repeat.set(1, 1);
    const stoneMat = new THREE.MeshStandardMaterial({ map: stone, color: 0xd8d3cb, roughness: 0.85 });
    // riser material: stone lit from the LED strip under each nose (gradient emissive)
    const g = document.createElement('canvas'); g.width = 8; g.height = 128; const gx = g.getContext('2d');
    const gr = gx.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, '#7a6a50'); gr.addColorStop(1, '#000');
    gx.fillStyle = gr; gx.fillRect(0, 0, 8, 128);
    const gT = new THREE.CanvasTexture(g);
    const riserMat = new THREE.MeshStandardMaterial({ map: stone, color: 0xd8d3cb, roughness: 0.8, emissive: new THREE.Color(P.gold), emissiveMap: gT, emissiveIntensity: 0.95 });
    const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.gold).multiplyScalar(4.0), toneMapped: false });
    this.laneZ = (j) => (j - (nL - 1) / 2) * (LANE_W + LANE_GAP);
    const SUMMIT = this.SUMMIT = ep.summitLen || 2.4;
    for (let j = 0; j < nL; j++) {
      const z = this.laneZ(j);
      for (let i = 1; i <= N + 1; i++) {
        const len = i === N + 1 ? SUMMIT + 3 : RUN, h = i * RISE, x0 = (i - 1) * RUN;
        const geo = new THREE.BoxGeometry(len, h, LANE_W);
        worldUV(geo, x0 + len / 2, h / 2, z, 0.45);
        const b = new THREE.Mesh(geo, stoneMat); b.position.set(x0 + len / 2, h / 2, z);
        b.castShadow = true; b.receiveShadow = true; scene.add(b);
        // riser face (front, facing -x) with glow gradient + LED strip
        const rg = new THREE.PlaneGeometry(LANE_W - 0.02, RISE);
        worldUV(rg, 0, 0, 0, 0.45);
        const rm = new THREE.Mesh(rg, riserMat); rm.rotation.y = -Math.PI / 2;
        rm.position.set(x0 - 0.002, h - RISE / 2, z); rm.receiveShadow = true; scene.add(rm);
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, LANE_W - 0.08), strip);
        s.position.set(x0 - 0.012, h - 0.03, z); scene.add(s);
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, LANE_W), stoneMat);
        nose.position.set(x0 - 0.02, h - 0.0175 + 0.001, z); nose.castShadow = true; scene.add(nose);
        if (j === nL - 1 && i <= N) this.addNumber(i, x0, h, z + LANE_W / 2);
      }
    }
    // summit emblem on the summit riser of every lane + spotlight
    this.summitMarks = [];
    const mc = document.createElement('canvas'); mc.width = mc.height = 256;
    drawMark(mc.getContext('2d'), 128, 128, 200, { glow: 0, gradient: false, color: '#ffffff', dot: '#ffffff' });
    const mT = new THREE.CanvasTexture(mc);
    for (let j = 0; j < nL; j++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9),
        new THREE.MeshBasicMaterial({ map: mT, transparent: true, toneMapped: false, color: new THREE.Color(P.gold).multiplyScalar(0.25), depthWrite: false }));
      m.rotation.y = -Math.PI / 2; m.position.set(N * RUN - 0.01, (N + 1) * RISE - RISE - 0.0, this.laneZ(j));
      // put the emblem on the tall summit face below the top riser
      m.position.y = (N + 1) * RISE - 0.55; m.position.x = N * RUN - 0.012;
      scene.add(m); this.summitMarks.push(m);
    }
    const spotX = N * RUN + SUMMIT * 0.45, spotY = (N + 1) * RISE;
    this.spot = new THREE.SpotLight(0xfff0d0, 0, 30, 0.32, 0.6, 1.2);
    this.spot.position.set(spotX, spotY + 11, 0); this.spot.target.position.set(spotX, spotY, 0);
    scene.add(this.spot, this.spot.target);
    const beamC = document.createElement('canvas'); beamC.width = 64; beamC.height = 256; const bx = beamC.getContext('2d');
    const bg = bx.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, 'rgba(255,240,210,0.0)'); bg.addColorStop(0.25, 'rgba(255,240,210,0.55)'); bg.addColorStop(1, 'rgba(255,240,210,0.08)');
    bx.fillStyle = bg; bx.fillRect(0, 0, 64, 256);
    const hg = bx.createLinearGradient(0, 0, 64, 0); // soft edges
    const beamT = new THREE.CanvasTexture(beamC);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 2.1, 11, 40, 1, true),
      new THREE.MeshBasicMaterial({ map: beamT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.beam.position.set(spotX, spotY + 5.5, 0); scene.add(this.beam);

    // dust motes drifting in the light
    const r = rng(5), n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = -3 + r() * (N * RUN + 8); pos[i * 3 + 1] = r() * 9; pos[i * 3 + 2] = -4 + r() * 8; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustBase = pos.slice();
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe2a8, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
    scene.add(this.dust);

    // characters
    for (const l of lanes) {
      const cfg = BRAND.cast[l.concept] || { color: l.color || '#ffffff', eyes: '#ffffff' };
      l.cfg = cfg;
      l.mind = new Mind(l.concept, { ...cfg, accessory: l.accessory ?? cfg.accessory }, P.gold);
      scene.add(l.mind.root);
      l.S = pchip(l.keys || [[0, 0]]);
      l.D = l.damage ? pchip(l.damage) : () => 0;
      l.F = l.fatigue ? pchip(l.fatigue) : () => 0;
      l.acts = (l.acts || []).map(a => ({ t: a[0], kind: a[1], o: a[2] || {} })).sort((a, b) => a.t - b.t);
      l.z = this.laneZ(l.idx);
      l.labelColor = mix(cfg.color, '#ffffff', 0.18);
      this.buildMarks(l);
    }
    // spectators
    this.crowd = [];
    if (ep.crowd) {
      const rc = rng(9), cfg = { color: ep.crowd.color || '#8E94A3', eyes: '#ffffff' };
      for (let i = 0; i < ep.crowd.n; i++) {
        const m = new Mind('crowd' + i, cfg, P.gold);
        m.cx = -1.2 - rc() * 2.5; m.cz = this.laneZ(nL - 1) + 0.6 + rc() * 2.2; m.ph = rc() * 6;
        scene.add(m.root); this.crowd.push(m);
      }
    }
    this.focusCache = new Map();
    this.buildFx();
  }

  addNumber(i, x0, h, z) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.font = '800 40px Poppins'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(String(i), 32, 34);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, color: new THREE.Color(BRAND.palette.gold).multiplyScalar(1.1), toneMapped: false, depthWrite: false }));
    m.rotation.y = -Math.PI / 2; m.position.set(x0 - 0.004, h - RISE * 0.62, z - 0.16);
    this.scene.add(m);
  }

  // red marks left on the steps by a burning-out character
  buildMarks(l) {
    l.marks = [];
    if (!l.damage) return;
    const r = rng(l.idx * 31 + 7);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a0a14, emissive: 0xc0101e, emissiveIntensity: 0.12, roughness: 0.35, transparent: true, opacity: 0.92, depthWrite: false });
    for (let i = 1; i <= this.N + 1; i++) {
      // time at which the character reaches step i
      let tc = null;
      for (let t = 0; t <= this.ep.duration; t += 1 / 30) if (l.S(t) >= i) { tc = t; break; }
      if (tc === null) continue;
      const d = l.D(tc);
      if (d < 0.25) continue;
      const cnt = 1 + Math.floor(d * 3 * r());
      for (let k = 0; k < cnt; k++) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.05 + r() * 0.07 * d, 14), mat);
        m.rotation.x = -Math.PI / 2; m.scale.set(1, 0.6 + r() * 0.8, 1);
        m.position.set((i - 1) * RUN + 0.08 + r() * (RUN - 0.16), i * RISE + 0.003, l.z + (r() - 0.5) * 0.7);
        m.visible = false; this.scene.add(m);
        l.marks.push({ m, t: tc + 0.15 });
      }
    }
  }


  // ---------------------------------------------------------------- effects
  // ep.fx: [{t, type: 'puff'|'burst'|'shake'|'pop', lane: 'EGO', text, size, amp}]
  // plus automatic ones: dust + shake on collapse / lie, sparkles at the summit.
  buildFx() {
    const ep = this.ep, fx = (ep.fx || []).map(f => ({ ...f }));
    if (ep.autoFx !== false) {
      for (const l of this.lanes) for (const a of l.acts) {
        if (a.kind === 'collapse' || a.kind === 'lie') { fx.push({ t: a.t, type: 'puff', lane: l.concept, size: a.kind === 'lie' ? 1.3 : 1 }); fx.push({ t: a.t, type: 'shake', amp: a.kind === 'lie' ? 0.14 : 0.08 }); }
        if (a.kind === 'fall') fx.push({ t: a.t + 0.05, type: 'puff', lane: l.concept, size: 0.7 });
      }
      fx.push({ t: (ep.summitAt ?? ep.duration - 3) + 0.1, type: 'burst' });
    }
    this.fx = fx;
    const mk = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); };
    const dustT = mk(x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(230,220,205,0.9)'); g.addColorStop(1, 'rgba(230,220,205,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    const sparkT = mk(x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,230,160,0.8)'); g.addColorStop(1, 'rgba(255,200,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    this.particles = [];
    let seed = 1;
    for (const f of fx) {
      const r = rng(seed++ * 977);
      if (f.type === 'puff') {
        const l = this.lanes.find(q => q.concept === f.lane) || this.lanes[0];
        const p = this.laneAt(l, f.t), sz = f.size || 1;
        for (let i = 0; i < 14; i++) {
          const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustT, transparent: true, depthWrite: false, opacity: 0 }));
          const a = r() * Math.PI * 2, sp = (0.5 + r() * 0.9) * sz;
          m.userData = { t0: f.t, life: 0.9 + r() * 0.5, o: [p.x + (r() - 0.5) * 0.4, this.noseY(p.x) + 0.1, l.z + (r() - 0.5) * 0.5], v: [Math.cos(a) * sp, 0.25 + r() * 0.5 * sz, Math.sin(a) * sp], s0: 0.25 * sz, s1: (0.7 + r() * 0.5) * sz, op: 0.55 };
          m.visible = false; this.scene.add(m); this.particles.push(m);
        }
      } else if (f.type === 'burst') {
        const cx = this.N * RUN + this.SUMMIT * 0.45, cy = (this.N + 1) * RISE + 0.6;
        for (let i = 0; i < 40; i++) {
          const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(BRAND.palette.gold).multiplyScalar(2.2), toneMapped: false, opacity: 0 }));
          const a = r() * Math.PI * 2, el = r() * 1.2, sp = 1.5 + r() * 2.5;
          m.userData = { t0: f.t + r() * 0.15, life: 1.0 + r() * 0.8, o: [cx, cy, (r() - 0.5) * 1.5], v: [Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp + 1.2, Math.sin(a) * Math.cos(el) * sp], g: -3.5, s0: 0.12, s1: 0.04, op: 1 };
          m.visible = false; this.scene.add(m); this.particles.push(m);
        }
      }
    }
  }

  updateFx(t) {
    for (const m of this.particles) {
      const u = m.userData, a = (t - u.t0) / u.life;
      if (a < 0 || a > 1) { m.visible = false; continue; }
      m.visible = true;
      const dt = t - u.t0, k = 1 - Math.exp(-dt * 3);
      m.position.set(u.o[0] + u.v[0] * (u.g ? dt : k / 3), u.o[1] + u.v[1] * (u.g ? dt : k / 3) + (u.g ? 0.5 * u.g * dt * dt : 0), u.o[2] + u.v[2] * (u.g ? dt : k / 3));
      m.scale.setScalar(lerp(u.s0, u.s1, Math.sqrt(a)));
      m.material.opacity = u.op * (1 - a) * Math.min(1, a * 8);
    }
  }

  shakeAt(t) {
    let x = 0, y = 0;
    for (const f of this.fx) if (f.type === 'shake' && t >= f.t && t < f.t + 0.5) {
      const e = 1 - (t - f.t) / 0.5, A = (f.amp || 0.1) * e * e;
      x += Math.sin((t - f.t) * 70) * A; y += Math.cos((t - f.t) * 55) * A;
    }
    return [x, y];
  }

  drawPops(ctx, t) {
    const v = new THREE.Vector3();
    for (const f of this.fx) {
      if (f.type !== 'pop' || t < f.t || t > f.t + (f.dur || 1.1)) continue;
      const l = this.lanes.find(q => q.concept === f.lane) || this.lanes[0];
      l.mind.headWorld(v); v.y += 1.05; v.project(this.camera);
      const dt = t - f.t, d = f.dur || 1.1;
      const sc = dt < 0.25 ? (() => { const q = dt / 0.25, c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2); })() : 1;
      const a = 1 - smooth((dt - (d - 0.25)) / 0.25);
      const x = clamp((v.x + 1) / 2 * this.W, 140, this.W - 140), y = clamp((1 - v.y) / 2 * this.H - dt * 18, this.H * 0.1, this.H * 0.8);
      const px = f.size || 54;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(f.rot ?? -0.08); ctx.scale(sc, sc);
      ctx.font = `900 ${px}px Poppins`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(5,6,10,0.95)'; ctx.lineWidth = px * 0.24; ctx.strokeText(f.text, 0, 0);
      const col = f.color || (l.labelColor || '#fff');
      ctx.shadowColor = col; ctx.shadowBlur = px * 0.4; ctx.fillStyle = col; ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- choreography
  ground(s) { return clamp(s, 0, this.N + 1) * RISE; }                    // top of step under index s
  stepPt(i) { return [(i - 0.5) * RUN, clamp(i, 0, this.N + 1) * RISE]; }
  slopeAt(s) { return (s > 0.5 && s < this.N + 0.5) ? SLOPE : 0; }
  noseY(x) { return clamp(x / RUN + 1, 0, this.N + 1) * RISE; }

  pose(l, kind, t, o, tAct) {
    const s = l.S(t), v = (l.S(t + 0.04) - l.S(t - 0.04)) / 0.08;
    const fat = l.F(t), dmg = l.D(t);
    const p = { x: 0, y: 0, z: l.z, yaw: 0, pitch: 0, roll: 0, speed: v };
    const climb = (still = false) => {
      const sp = still ? 0 : Math.min(1, Math.abs(v) / 1.6);
      const k = Math.floor(s + 1e-6), f = still ? 0 : s - k;
      const kk = still ? Math.round(s) : k;
      const stanceSide = (((kk % 2) + 2) % 2) === 0 ? 'A' : 'B', swingSide = stanceSide === 'A' ? 'B' : 'A';
      const st = this.stepPt(kk), from = this.stepPt(kk - 1), to = this.stepPt(kk + 1);
      const fe = smooth(f);
      const sw = still ? from : [lerp(from[0], to[0], fe), lerp(from[1], to[1], smooth(Math.min(1, f * 1.6))) + Math.sin(Math.PI * f) * 0.17];
      const sc = still ? kk : s;
      p.x = (sc - 0.75) * RUN;
      const gy = this.ground(sc - 0.55);
      p.y = gy + 0.86 - fat * 0.08 - (still ? 0 : 0.035 * Math.sin(Math.PI * f) * sp) + (still ? Math.sin(t * 2.2) * 0.008 : 0);
      const feet = { [stanceSide]: st, [swingSide]: sw };
      for (const side of ['A', 'B']) {
        const ik = legIK(p.x, p.y, feet[side][0] + 0.02, feet[side][1] + ANKLE_H);
        p['hip' + side] = ik.hip; p['knee' + side] = ik.knee; p['ankle' + side] = -(ik.hip + ik.knee);
      }
      p.spine = 0.1 + 0.22 * sp + fat * 0.5 + dmg * 0.18;
      p.neck = -p.spine * 0.55 + fat * 0.55;
      for (const side of ['A', 'B']) {
        const rel = clamp((feet[side][0] - p.x) / 0.6, -1, 1);
        p['sh' + side] = -rel * (0.25 + 0.6 * sp) * (1 - fat * 0.6) + fat * 0.15;
        p['el' + side] = 0.3 + 0.6 * sp;
      }
      return p;
    };
    switch (kind) {
      case 'climb': return climb(Math.abs(v) < 0.05);
      case 'stand': { climb(true); p.spine = 0.04 + fat * 0.4; p.neck = fat * 0.4; p.shA = p.shB = 0.05; p.elA = p.elB = 0.15; return p; }
      case 'look_back': {
        climb(true); p.spine = 0.0; p.neck = -0.05;
        const w = smooth((t - tAct) / 0.5);
        p.headYaw = (o.dir ?? 1) * 1.9 * w; p.twist = (o.dir ?? 1) * 0.45 * w; p.shA = -0.1; p.shB = 0.2; return p;
      }
      case 'kneel': {  // hands on knees, exhausted
        climb(true); p.y -= 0.16; for (const side of ['A', 'B']) {
          const f = side === 'A' ? this.stepPt(Math.round(s)) : this.stepPt(Math.round(s) - 1);
          const ik = legIK(p.x, p.y, f[0] + 0.02, f[1] + ANKLE_H); p['hip' + side] = ik.hip; p['knee' + side] = ik.knee; p['ankle' + side] = -(ik.hip + ik.knee);
        }
        p.spine = 0.85; p.neck = 0.1 + 0.08 * Math.sin(t * 5); p.y += 0.012 * Math.sin(t * 5);
        p.shA = p.shB = 0.75; p.elA = p.elB = 0.25; p.shAbdA = p.shAbdB = 0.2; return p;
      }
      case 'sit': {    // gives up: turns around and sits on the step, head down
        const k = Math.round(s);
        p.yaw = Math.PI; p.x = (k - 1) * RUN + 0.2; p.y = this.ground(k) + 0.13;
        const tgt = this.stepPt(k - 1);
        const lx = -(tgt[0] - 0.02 - p.x);   // local forward = -x world
        for (const side of ['A', 'B']) {
          const ik = legIK(0, 0, lx, tgt[1] + ANKLE_H - p.y); p['hip' + side] = ik.hip; p['knee' + side] = ik.knee; p['ankle' + side] = -(ik.hip + ik.knee);
          p['hipAbd' + side] = 0.12;
        }
        p.spine = 0.6 + 0.02 * Math.sin(t * 1.6); p.neck = 0.6; p.shA = p.shB = 0.85; p.elA = p.elB = 1.15; p.shAbdA = p.shAbdB = 0.12;
        return p;
      }
      case 'collapse': case 'crawl': {
        const gam = Math.PI / 2 - SLOPE * (this.slopeAt(s) > 0 ? 1 : 0) + (kind === 'collapse' ? 0.06 : 0);
        p.x = (s - 0.6) * RUN; p.y = this.noseY(p.x) + 0.24; p.pitch = gam;
        const ph = kind === 'crawl' ? s * Math.PI : 0, a = kind === 'crawl' ? 1 : 0;
        p.spine = 0.0; p.neck = -0.55 + (o.lift ?? 0) - (kind === 'collapse' ? -0.25 * smooth((t - tAct) / 1.2) : 0);
        p.shA = 2.55 + 0.45 * Math.sin(ph) * a; p.shB = 2.55 - 0.45 * Math.sin(ph) * a; p.elA = 0.35 + 0.3 * a * Math.max(0, Math.cos(ph)); p.elB = 0.35 + 0.3 * a * Math.max(0, -Math.cos(ph));
        p.shAbdA = p.shAbdB = 0.25;
        p.hipA = -0.25 + 0.3 * Math.sin(ph + 1.5) * a; p.hipB = -0.25 - 0.3 * Math.sin(ph + 1.5) * a; p.kneeA = -0.5; p.kneeB = -0.7; p.ankleA = p.ankleB = 0.6;
        if (kind === 'collapse') { const e = Math.max(0, 1 - (t - tAct) / 0.5); p.y += 0.05 * Math.sin((t - tAct) * 20) * e; }
        return p;
      }
      case 'fall': {
        const dt = t - tAct;
        p.x = (s - 0.6) * RUN; p.y = this.noseY(p.x) + 0.42 + Math.abs(Math.sin(dt * 7)) * 0.32;
        p.pitch = -dt * (o.spin ?? 7.5); p.roll = 0.3 * Math.sin(dt * 5);
        p.shA = 2.2 + 0.9 * Math.sin(dt * 13); p.shB = 1.6 + 0.9 * Math.sin(dt * 11 + 1); p.shAbdA = p.shAbdB = 0.9; p.elA = p.elB = 0.6;
        p.hipA = 0.9 * Math.sin(dt * 12); p.hipB = 0.9 * Math.sin(dt * 12 + 2); p.kneeA = p.kneeB = -0.8; p.spine = 0.3;
        return p;
      }
      case 'lie': {
        const sl = this.slopeAt(s);
        p.x = (s - 0.6) * RUN; p.y = (sl ? this.noseY(p.x) : this.ground(s)) + 0.2; p.pitch = -(Math.PI / 2 + sl);
        p.shA = 0.4; p.shB = 2.6; p.shAbdA = p.shAbdB = 0.45; p.elA = 0.3; p.elB = 0.2;
        p.hipA = 0.15; p.hipB = -0.1; p.hipAbdA = p.hipAbdB = 0.18; p.kneeA = -0.4; p.kneeB = -0.1; p.neck = 0.15;
        return p;
      }
      case 'celebrate': {
        climb(true);
        const dt = t - tAct, j = Math.max(0, Math.sin(dt * Math.PI * 1.7)) * 0.16 * (o.jump ?? 1);
        p.y += j; p.spine = -0.08; p.neck = -0.25;
        p.shA = p.shB = 2.75; p.shAbdA = p.shAbdB = 0.45 + 0.1 * Math.sin(dt * 10); p.elA = p.elB = 0.25;
        return p;
      }
    }
    return climb();
  }

  laneAt(l, t) {
    const acts = l.acts;
    let c = -1; for (let i = 0; i < acts.length; i++) if (acts[i].t <= t) c = i;
    const cur = c >= 0 ? acts[c] : { t: -1e9, kind: 'climb', o: {} };
    let p = this.pose(l, cur.kind, t, cur.o, cur.t);
    const bd = cur.o.blend ?? 0.35;
    if (c >= 0 && t - cur.t < bd) {
      const prev = c > 0 ? acts[c - 1] : { t: -1e9, kind: 'climb', o: {} };
      const q = this.pose(l, prev.kind, t, prev.o, prev.t), w = smooth((t - cur.t) / bd);
      const out = {};
      for (const k of new Set([...Object.keys(p), ...Object.keys(q)])) {
        let a = q[k] ?? 0, b = p[k] ?? 0;
        if (k === 'pitch' || k === 'yaw' || k === 'roll') { while (a - b > Math.PI) a -= 2 * Math.PI; while (b - a > Math.PI) a += 2 * Math.PI; }
        out[k] = lerp(a, b, w);
      }
      p = out;
    }
    return p;
  }

  focusAt(t) {
    const key = Math.round(t * 30);
    if (this.focusCache.has(key)) return this.focusCache.get(key);
    const ep = this.ep, fw = ep.camera?.focusWeights;
    let sx = 0, sy = 0, sw = 0;
    for (const l of this.lanes) {
      const s = l.S(t), w = fw?.[l.concept] ?? 1;
      sx += (s - 0.5) * RUN * w; sy += this.ground(s) * w; sw += w;
    }
    const f = [sx / sw, sy / sw + 1.0];
    this.focusCache.set(key, f); return f;
  }

  updateCamera(t) {
    const c = this.ep.camera || {}, dur = this.ep.duration;
    let fx = 0, fy = 0, n = 0;
    for (let k = -12; k <= 12; k++) { const tt = clamp(t + k * 0.08, 0, dur); const f = this.focusAt(tt); fx += f[0]; fy += f[1]; n++; }
    fx /= n; fy /= n;
    const D = c.dist ? pchip(c.dist) : (tt) => lerp(17, 23, tt / dur);
    const dist = D(t);
    const dir = new THREE.Vector3(...(c.dir || [-0.52, 0.4, 0.75])).normalize();
    const tgt = new THREE.Vector3(fx + (c.offset?.[0] || 0), fy + (c.offset?.[1] || 0), (c.offset?.[2] || 0));
    const hand = 0.05;
    this.camera.position.copy(tgt).addScaledVector(dir, dist).add(new THREE.Vector3(Math.sin(t * 0.7) * hand, Math.sin(t * 0.9 + 1) * hand, Math.cos(t * 0.6) * hand));
    this.camera.lookAt(tgt);
    const [sx, sy] = this.shakeAt(t);
    if (sx || sy) { this.camera.translateX(sx); this.camera.translateY(sy); }
  }

  renderAt(t) {
    const ep = this.ep;
    for (const l of this.lanes) {
      const p = this.laneAt(l, t);
      l.mind.apply(p, t);
      l.mind.setDamage(l.D(t));
      for (const mk of l.marks) mk.m.visible = t >= mk.t;
    }
    for (const m of this.crowd) {
      const cheer = Math.sin(t * 6 + m.ph) > -0.2;
      const p = { x: m.cx, y: 0.86 + Math.max(0, Math.sin(t * 7 + m.ph)) * 0.08, z: m.cz, yaw: 0.35, hipA: 0.05, hipB: -0.05, kneeA: -0.05, kneeB: -0.05,
        shA: cheer ? 2.7 : 0.2, shB: cheer ? 2.6 : 0.1, shAbdA: 0.4, shAbdB: 0.4, elA: 0.3, elB: 0.3, neck: -0.2 };
      m.apply(p, t + m.ph);
    }
    // summit: logo lights up + spotlight when the winner arrives
    const ts = ep.summitAt ?? ep.duration - 3;
    const lit = smooth((t - ts) / 0.6);
    const flash = Math.max(0, 1 - Math.abs(t - ts - 0.15) / 0.35);
    for (const m of this.summitMarks) m.material.color.set(BRAND.palette.gold).multiplyScalar(0.22 + 2.6 * lit + 2.5 * flash);
    this.spot.intensity = 110 * lit; this.beam.material.opacity = 0.2 * lit;
    this.bloom.strength = 0.7 + 0.5 * flash;
    // dust drift
    const a = this.dust.geometry.attributes.position, b = this.dustBase;
    for (let i = 0; i < a.count; i++) {
      a.array[i * 3] = b[i * 3] + Math.sin(t * 0.3 + i) * 0.3;
      a.array[i * 3 + 1] = (b[i * 3 + 1] + t * 0.12 + Math.sin(t * 0.5 + i * 1.7) * 0.1) % 9;
    }
    a.needsUpdate = true;
    this.updateFx(t);
    this.updateCamera(t);
    this.composer.render();
    this.drawOverlay(t);
  }

  drawOverlay(t) {
    const ctx = this.octx, W = this.W, H = this.H, ep = this.ep;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.renderer.domElement, 0, 0);
    // soft vignette (brand look)
    const vg = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.25, W / 2, H * 0.52, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const v = new THREE.Vector3();
    const labelPx = ep.labelPx || 36;
    // labels: avoid overlaps by pushing apart vertically
    const items = [];
    for (const l of this.lanes) {
      if (l.label === false) continue;
      l.mind.headWorld(v); v.y += 0.55; v.project(this.camera);
      const fade = l.labelFrom !== undefined ? smooth((t - l.labelFrom) / 0.3) : 1;
      items.push({ x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, l, a: fade });
    }
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) {
      for (let j = 0; j < i; j++) {
        const A = items[j], B = items[i];
        ctx.font = `900 ${labelPx}px Poppins`;
        const wA = ctx.measureText(A.l.concept).width * 1.15, wB = ctx.measureText(B.l.concept).width * 1.15;
        if (Math.abs(A.x - B.x) < (wA + wB) / 2 && Math.abs(A.y - B.y) < labelPx * 1.25) B.y = A.y + labelPx * 1.25;
      }
    }
    ctx.font = `900 ${labelPx}px Poppins`;
    for (const it of items) {
      const hw = ctx.measureText(it.l.concept).width * 0.6 + 24;
      it.x = clamp(it.x, hw, W - hw); it.y = clamp(it.y, H * 0.08, H * 0.82);
      drawLabel(ctx, it.l.concept, it.x, it.y, labelPx, it.l.labelColor, it.a);
    }
    if (ep.title) {
      const t0 = ep.title.from ?? 0, t1 = ep.title.to ?? 2.6;
      const a = Math.min(smooth((t - t0) / 0.25), 1 - smooth((t - t1) / 0.35));
      drawTitle(ctx, W, H, ep.title.text, a, { y: ep.title.y ?? 0.16 });
    }
    if (ep.outro) {
      const a = smooth((t - ep.outro.from) / 0.4);
      drawTitle(ctx, W, H, ep.outro.text, a, { y: ep.outro.y ?? 0.16, px: Math.round(W * 0.058) });
    }
    this.drawPops(ctx, t);
    if (ep.watermark !== false) drawWatermark(ctx, W, H);
  }
}
