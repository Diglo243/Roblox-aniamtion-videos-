// Shot renderer: builds one shot from a JSON spec and renders deterministic frames.
import * as THREE from 'three';
import { M, box, cyl, sphere, canvasTex, rng, hash, clamp, lerp, smooth, easeInOut, easeOutExpo, easeOutBack } from './core.js';
import { Avatar, ACTIONS, ACTION_FACE, TALKING_ACTIONS, defaultAppearance } from './characters.js';
import { ENVIRONMENTS, setupLighting, car } from './environments.js';

const W = 1080, H = 1920;
const canvas = document.getElementById('c');
const Q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.get('aa') !== '0', preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = Q.get('soft') === '0' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
window.SHADOW_SIZE = +(Q.get('sm') || 2048);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

let S = null; // current shot state

// ----------------------------------------------------------------- props ---
function makeProp(kind) {
  const g = new THREE.Group();
  switch (kind) {
    case 'phone': box(g, 0.5, 0.95, 0.12, '#111', 0, -0.45, 0.2); box(g, 0.42, 0.8, 0.02, M('#4fc3f7', { emissive: '#4fc3f7', ei: 0.7 }), 0, -0.38, 0.27, { cast: false }); break;
    case 'money': for (let i = 0; i < 4; i++) box(g, 1.0, 0.12, 0.55, '#4caf50', 0, -0.3 + i * 0.13, 0.5); box(g, 1.02, 0.5, 0.15, '#2e7d32', 0, -0.3, 0.5, { cast: false }); break;
    case 'cake': cyl(g, 0.75, 0.75, 0.6, '#f8bbd0', 0, -0.3, 0.8); cyl(g, 0.78, 0.78, 0.12, '#ffffff', 0, 0.28, 0.8); cyl(g, 0.05, 0.05, 0.4, '#ffeb3b', 0, 0.4, 0.8); break;
    case 'gift': box(g, 1.1, 1.0, 1.1, '#e53935', 0, -0.6, 0.8); box(g, 1.14, 1.04, 0.2, '#fdd835', 0, -0.62, 0.8, { cast: false }); box(g, 0.2, 1.04, 1.14, '#fdd835', 0, -0.62, 0.8, { cast: false }); break;
    case 'book': box(g, 0.9, 1.1, 0.25, '#1e88e5', 0, -0.6, 0.35); break;
    case 'bag': box(g, 1.3, 1.6, 0.6, '#8e24aa', 0, -1.6, 0.2); break;
    case 'ball': sphere(g, 0.55, '#ff7043', 0, -0.4, 0.6); break;
    case 'pizza': box(g, 1.4, 0.12, 1.4, '#ffca28', 0, -0.2, 0.7); box(g, 1.2, 0.05, 1.2, '#e53935', 0, -0.12, 0.7, { cast: false }); break;
    case 'letter': box(g, 0.9, 0.6, 0.05, '#ffffff', 0, -0.4, 0.4); break;
    case 'trophy': cyl(g, 0.45, 0.2, 0.7, M('#ffd54f', { metal: 0.6, rough: 0.3 }), 0, -0.2, 0.6); cyl(g, 0.25, 0.3, 0.3, M('#ffd54f', { metal: 0.6, rough: 0.3 }), 0, -0.5, 0.6); break;
    case 'sword': box(g, 0.2, 2.8, 0.1, M('#cfd8dc', { metal: 0.7, rough: 0.25 }), 0, -0.3, 0.4, { rx: -1.4 }); break;
    case 'key': box(g, 0.2, 0.6, 0.05, '#ffd54f', 0, -0.3, 0.3); break;
    default: return null;
  }
  return g;
}

function makePet(kind, color) {
  const g = new THREE.Group();
  const c = color || (kind === 'cat' ? '#ff9f43' : '#c68642');
  box(g, 1.4, 1.3, 2.6, c, 0, 1.1, 0, { round: 0.2 });
  box(g, 1.3, 1.3, 1.3, c, 0, 2.1, 1.5, { round: 0.25 });
  box(g, 0.5, 0.4, 0.4, '#222', 0, 2.0, 2.2, {});
  for (const x of [-0.4, 0.4]) { box(g, 0.32, kind === 'cat' ? 0.55 : 0.7, 0.2, kind === 'cat' ? c : '#5d4037', x, 2.75, 1.4, { rz: kind === 'cat' ? 0 : x * 0.8 }); sphere(g, 0.1, '#111', x * 0.7, 2.35, 2.17); }
  for (const [x, z] of [[-0.45, 0.9], [0.45, 0.9], [-0.45, -0.9], [0.45, -0.9]]) box(g, 0.4, 1.1, 0.4, c, x, 0, z);
  const tail = box(g, 0.25, 0.25, 1.2, c, 0, 1.7, -1.6, { rx: -0.6 });
  g.userData.tail = tail;
  return g;
}

// --------------------------------------------------------------- symbols ---
function symbolTex(kind) {
  return canvasTex('sym|' + kind, 256, 256, (g, w, h) => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const txt = (s, col, size = 200) => { g.font = `${size}px "Luckiest Guy"`; g.lineWidth = 22; g.strokeStyle = '#111'; g.strokeText(s, 128, 140); g.fillStyle = col; g.fillText(s, 128, 140); };
    switch (kind) {
      case '!': txt('!', '#ff3b30'); break;
      case '?': txt('?', '#ffd60a'); break;
      case '!?': txt('!?', '#ff9500', 170); break;
      case 'zzz': txt('Zz', '#9fd3ff', 150); break;
      case '$': txt('$', '#34c759'); break;
      case 'heart': g.fillStyle = '#ff2d55'; g.strokeStyle = '#111'; g.lineWidth = 14; g.beginPath(); g.moveTo(128, 220); g.bezierCurveTo(-20, 120, 60, 10, 128, 80); g.bezierCurveTo(196, 10, 276, 120, 128, 220); g.fill(); g.stroke(); break;
      case 'anger': g.strokeStyle = '#ff1f1f'; g.lineWidth = 26; g.lineCap = 'round';
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(128 + sx * 70, 128 + sy * 70, 46, sx < 0 ? (sy < 0 ? 0 : 1.5 * Math.PI) : (sy < 0 ? 0.5 * Math.PI : Math.PI), sx < 0 ? (sy < 0 ? 0.5 * Math.PI : 2 * Math.PI) : (sy < 0 ? Math.PI : 1.5 * Math.PI)); g.stroke(); } break;
      case 'sweat': g.fillStyle = '#5ac8fa'; g.strokeStyle = '#0a3d62'; g.lineWidth = 10; g.beginPath(); g.moveTo(128, 30); g.quadraticCurveTo(220, 170, 128, 220); g.quadraticCurveTo(36, 170, 128, 30); g.fill(); g.stroke(); break;
      case 'idea': g.fillStyle = '#ffe14d'; g.strokeStyle = '#111'; g.lineWidth = 12; g.beginPath(); g.arc(128, 110, 70, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#bbb'; g.fillRect(98, 175, 60, 40); g.strokeRect(98, 175, 60, 40); break;
      case 'star': g.fillStyle = '#ffd60a'; g.strokeStyle = '#111'; g.lineWidth = 10; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 45 : 105, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a)); } g.closePath(); g.fill(); g.stroke(); break;
      case 'skull': g.fillStyle = '#eee'; g.strokeStyle = '#111'; g.lineWidth = 10; g.beginPath(); g.arc(128, 110, 80, 0, 7); g.fill(); g.stroke(); g.fillRect(88, 170, 80, 50); g.fillStyle = '#111'; g.beginPath(); g.arc(98, 110, 22, 0, 7); g.arc(158, 110, 22, 0, 7); g.fill(); break;
      case 'note': txt('♪', '#af52de', 200); break;
    }
  });
}
function makeSprite(kind, size = 1.6) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: symbolTex(kind), transparent: true, depthTest: true, fog: false }));
  sp.scale.set(size, size, size);
  return sp;
}

// ------------------------------------------------------------- particles ---
class Particles {
  constructor(kind, scene, focus, camera, r) {
    this.kind = kind; this.items = []; this.r = r; this.focus = focus; this.camera = camera;
    const n = { rain: 500, confetti: 160, money: 90, snow: 300, tears: 0, hearts: 14, sparkles: 40, stars: 5, smoke: 30 }[kind] ?? 50;
    this.group = new THREE.Group(); scene.add(this.group);
    if (kind === 'rain') {
      const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 6); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: 0.55 }));
      this.group.add(this.lines); this.n = n; this.seed = Array.from({ length: n }, () => [r.range(-25, 25), r.range(0, 30), r.range(-25, 25)]);
      return;
    }
    for (let i = 0; i < n; i++) {
      let m;
      if (kind === 'confetti') m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.6), M(r.pick(['#ff3b30', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ff2d55']), { side: THREE.DoubleSide, basic: true }));
      else if (kind === 'money') m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), M('#4caf50', { side: THREE.DoubleSide, map: moneyTex() }));
      else if (kind === 'snow') m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), M('#ffffff', { basic: true }));
      else if (kind === 'hearts') m = makeSprite('heart', 0.9);
      else if (kind === 'sparkles' || kind === 'stars') m = makeSprite('star', kind === 'stars' ? 0.7 : 0.45);
      else if (kind === 'smoke') m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), M('#9e9e9e', { transparent: true, opacity: 0.6 }));
      else m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), M('#fff'));
      m.userData.s = [r.range(-14, 14), r.range(0, 22), r.range(-10, 10), r(), r.range(0.6, 1.4)];
      this.group.add(m); this.items.push(m);
    }
  }
  update(t) {
    const f = this.focus, r = this.r;
    if (this.kind === 'rain') {
      const pos = this.lines.geometry.attributes.position; const cp = this.camera.position;
      for (let i = 0; i < this.n; i++) { const s = this.seed[i]; const y = 30 - ((s[1] + t * 38) % 30); const x = cp.x + s[0], z = cp.z - 10 + s[2]; pos.setXYZ(i * 2, x, y, z); pos.setXYZ(i * 2 + 1, x + 0.1, y - 1.4, z); }
      pos.needsUpdate = true; return;
    }
    for (const m of this.items) {
      const [x, y0, z, ph, sp] = m.userData.s;
      if (this.kind === 'hearts') { const k = (t * 0.5 * sp + ph) % 1; m.position.set(f.x + x * 0.3, 2 + k * 9, f.z + z * 0.2); m.material.opacity = 1 - k; m.material.transparent = true; continue; }
      if (this.kind === 'stars') { const a = t * 4 + ph * 6.28; m.position.set(f.x + Math.cos(a) * 1.3, f.y + 0.9, f.z + Math.sin(a) * 1.3); continue; }
      if (this.kind === 'sparkles') { const k = (t * sp + ph) % 1; m.position.set(f.x + x * 0.35, f.y - 2 + y0 * 0.3, f.z + z * 0.3); m.scale.setScalar(Math.sin(k * Math.PI) * 0.7 + 0.01); continue; }
      if (this.kind === 'smoke') { const k = (t * 0.6 * sp + ph) % 1; m.position.set(f.x + x * 0.4, k * 10, f.z + z * 0.4); m.scale.setScalar(0.5 + k * 3); m.material.opacity = 0.6 * (1 - k); continue; }
      const speed = this.kind === 'snow' ? 2 : 5;
      const y = 24 - ((y0 + t * speed * sp) % 24);
      m.position.set(f.x + x + Math.sin(t * 2 + ph * 6) * 0.8, y, f.z + z);
      m.rotation.set(t * 3 * sp + ph * 6, t * 2 + ph, t * 4 * sp);
    }
  }
}
function moneyTex() { return canvasTex('bill', 128, 64, (g) => { g.fillStyle = '#7bc96f'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#2e7d32'; g.lineWidth = 6; g.strokeRect(4, 4, 120, 56); g.fillStyle = '#2e7d32'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 64, 34); }); }

// --------------------------------------------------------------- overlay ---
function overlayTex(kind) {
  return canvasTex('ov|' + kind, 512, 910, (g, w, h) => {
    if (kind === 'vignette' || kind === 'red' || kind === 'dark') {
      const grd = g.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, h * 0.62);
      const col = kind === 'red' ? '200,0,0' : '0,0,0';
      grd.addColorStop(0, `rgba(${col},0)`); grd.addColorStop(1, `rgba(${col},${kind === 'vignette' ? 0.55 : 0.85})`);
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    } else if (kind === 'speed') {
      const r = rng('speed'); g.strokeStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, r0 = r.range(230, 330), r1 = r.range(560, 800); g.lineWidth = r.range(2, 7); g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * r0 * 0.6, h / 2 + Math.sin(a) * r0); g.lineTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1 * 1.4); g.stroke(); }
    } else if (kind === 'white') { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    else if (kind === 'black') { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
  });
}
function addOverlay(camera, kind, z) {
  const d = 1.0, hh = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 1.05, ww = hh * camera.aspect * 1.05;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), new THREE.MeshBasicMaterial({ map: overlayTex(kind), transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
  m.position.z = -d; m.renderOrder = 1000 + z; m.userData.baseFov = camera.fov; camera.add(m); return m;
}

// ----------------------------------------------------------------- setup ---
function placeActors(spec, info) {
  const n = spec.actors.length;
  const st = info.stage;
  const res = [];
  const pairGap = 2.0;
  spec.actors.forEach((a, i) => {
    let x = st.x, z = st.z, ry = 0;
    if (n === 2 && spec.close) { x = st.x + (i === 0 ? -1.35 : 1.35); ry = i === 0 ? 1.25 : -1.25; }
    else if (n === 2) { x = st.x + (i === 0 ? -pairGap : pairGap); ry = i === 0 ? 0.75 : -0.75; }
    else if (n >= 3) { const span = Math.min(3.2, 10 / n); x = st.x + (i - (n - 1) / 2) * span; z = st.z - Math.abs(i - (n - 1) / 2) * 0.8; ry = -(i - (n - 1) / 2) * 0.25; }
    if (a.pos) { x = st.x + a.pos[0]; z = st.z + a.pos[1]; }
    if (a.facing !== undefined) ry = a.facing;
    res.push({ x, z, ry });
  });
  return res;
}

window.setupShot = async function setupShot(spec, cast) {
  await document.fonts.ready;
  const r = rng('shot|' + spec.id + '|' + (spec.seed ?? 0));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 2000);
  scene.add(camera);
  const tod = spec.time || 'day';
  const night = tod === 'night';
  const envFn = ENVIRONMENTS[spec.env] || ENVIRONMENTS.street;
  const world = new THREE.Group(); scene.add(world);
  const info = envFn(world, rng('env|' + spec.env + '|' + (spec.envSeed ?? 0)), night);

  // actors
  const actors = [];
  const places = placeActors(spec, info);
  const seats = info.seats.slice(), beds = info.beds.slice();
  spec.actors.forEach((a, i) => {
    const c = cast?.[a.id] || {};
    const app = c.appearance || defaultAppearance(a.id, c.gender, c.role);
    const av = new Avatar(a.id, app);
    const pl = places[i];
    av.root.position.set(pl.x, 0, pl.z); av.root.rotation.y = pl.ry;
    let action = a.action || 'idle';
    let seat = null;
    if (action.startsWith('sit') || action === 'drive') {
      if (seats.length) {
        seats.sort((s1, s2) => Math.hypot(s1.x - pl.x, s1.z - pl.z) - Math.hypot(s2.x - pl.x, s2.z - pl.z));
        seat = seats.shift(); av.root.position.set(seat.x, 0, seat.z); av.root.rotation.y = seat.ry;
      } else { seat = { y: 2.0 }; box(world, 3, 2.0, 3, '#6d4c41', pl.x, 0, pl.z - 0.4); }
    }
    if ((action === 'sleep' || action === 'lie') && beds.length) {
      const b = beds.shift(); av.root.position.set(b.x, b.y - 0.55, b.z + 1.5); av.root.rotation.y = b.ry;
    }
    if (a.prop) { const pr = makeProp(a.prop); if (pr) av.hand.add(pr); }
    if (action === 'sit_work') {
      const lap = new THREE.Group(); lap.position.set(0, 2.3, 1.9); lap.scale.setScalar(0.8); av.inner.add(lap);
      box(lap, 2.4, 0.15, 1.6, '#cfd8dc', 0, 0, 0); const scr = box(lap, 2.4, 1.6, 0.1, '#263238', 0, 0.1, 0.75, {}); scr.rotation.x = 0.35; scr.position.z = 0.85;
      const glow = box(lap, 2.2, 1.4, 0.05, M('#64b5f6', { emissive: '#64b5f6', ei: 0.9 }), 0, 0.2, 0.83, { cast: false }); glow.rotation.x = 0.35; glow.position.z = 0.79;
    }
    scene.add(av.root);
    const sym = a.symbol ? makeSprite(a.symbol, 1.7) : null;
    if (sym) scene.add(sym);
    actors.push({ av, spec: a, action, seat, base: av.root.position.clone(), ry: av.root.rotation.y, phase: r() * 6.28, sym, r: rng('act' + a.id + spec.id) });
  });
  // pets & extra props in world
  for (const pet of spec.pets || []) { const pg = makePet(pet.kind, pet.color); const st = info.stage; pg.position.set(st.x + (pet.pos?.[0] ?? 3.2), 0, st.z + (pet.pos?.[1] ?? 1.5)); pg.rotation.y = pet.facing ?? -0.5; scene.add(pg); actors.push({ pet: pg, phase: r() * 6 }); }
  for (const wp of spec.worldProps || []) {
    const st = info.stage;
    if (wp.kind === 'car') car(world, st.x + (wp.pos?.[0] ?? 6), st.z + (wp.pos?.[1] ?? -4), wp.facing ?? 0, r, wp.color);
    else if (wp.kind === 'police_car') { const c = car(world, st.x + (wp.pos?.[0] ?? 7), st.z + (wp.pos?.[1] ?? -5), wp.facing ?? 0.3, r, '#ffffff'); box(c, 3, 0.6, 1.2, M('#ff1744', { emissive: '#ff1744', ei: 1.4 }), -0.8, 3.4, -0.6); box(c, 1.4, 0.6, 1.2, M('#2979ff', { emissive: '#2979ff', ei: 1.4 }), 0.8, 3.4, -0.6); }
    else { const pr = makeProp(wp.kind); if (pr) { pr.scale.setScalar(wp.scale || 2); pr.position.set(st.x + (wp.pos?.[0] ?? 0), wp.y ?? 3, st.z + (wp.pos?.[1] ?? 2)); scene.add(pr); } }
  }

  // camera focus
  const focusIdx = clamp(spec.camera?.focus ?? 0, 0, Math.max(0, spec.actors.length - 1));
  const focusActor = actors[focusIdx]?.av ? actors[focusIdx] : null;
  const fpos = focusActor ? focusActor.base.clone() : new THREE.Vector3(info.stage.x, 0, info.stage.z);
  setupLighting(scene, tod, info.interior, info, fpos);

  // particles / fx
  const parts = [];
  for (const k of spec.fx || []) if (['rain', 'confetti', 'money', 'snow', 'hearts', 'sparkles', 'stars', 'smoke'].includes(k)) parts.push(new Particles(k, scene, fpos.clone().setY(4.5), camera, rng(k + spec.id)));
  const ov = {
    vignette: addOverlay(camera, spec.fx?.includes('red') ? 'red' : (spec.fx?.includes('dark') ? 'dark' : 'vignette'), 1),
    speed: addOverlay(camera, 'speed', 2),
    flash: addOverlay(camera, 'white', 3),
    black: addOverlay(camera, 'black', 4),
  };
  const occluders = [];
  world.updateMatrixWorld(true);
  world.traverse(o => {
    if (!o.isMesh || o.geometry.type === 'PlaneGeometry' && o.rotation.x !== 0) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const sc = o.getWorldScale(new THREE.Vector3());
    if (o.geometry.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z) > 45 && !info.interior) return;
    occluders.push(o);
  });
  S = { spec, scene, camera, actors, info, focusActor, fpos, parts, ov, r, dur: spec.duration, camSeed: hash(spec.id), occluders, ray: new THREE.Raycaster() };
  // choose one yaw offset for the whole shot that keeps the subject unobstructed
  S.yawFix = 0;
  const cands = [0, 0.45, -0.45, 0.85, -0.85, 1.25, -1.25];
  let best = 0, bestHits = 99;
  for (const c of cands) {
    S.yawFix = c; S.probe = true; let hits = 0;
    for (const u of [0.02, 0.5, 0.98]) { updateActors(u * S.dur); scene.updateMatrixWorld(true); if (camPose(u * S.dur).hit) hits++; }
    S.probe = false;
    if (hits < bestHits) { bestHits = hits; best = c; }
    if (hits === 0) break;
  }
  S.yawFix = best;
  renderer.shadowMap.needsUpdate = true;
  return { ok: true, interior: info.interior, yawFix: best };
};

// ---------------------------------------------------------------- camera ---
function camPose(t) {
  const { spec, focusActor, actors, info } = S;
  const cam = spec.camera || {};
  let type = cam.type || 'medium';
  if (type === 'ots' && actors.filter(a => a.av).length < 2) type = 'closeup';
  if (type === 'two_shot' && actors.filter(a => a.av).length < 2) type = 'medium';
  const u = clamp(t / Math.max(0.01, S.dur), 0, 1);
  const e = easeInOut(u);
  const ang0 = THREE.MathUtils.degToRad(cam.angle ?? 0);
  const sc = focusActor ? (focusActor.av.app.scale || 1) : 1;
  let f;
  if (focusActor) { f = focusActor.av.root.position.clone(); } else f = new THREE.Vector3(info.stage.x, 0, info.stage.z);
  const lying = focusActor && ['sleep', 'lie', 'fall'].includes(focusActor.action);
  const headY = (lying ? 1.2 : 4.6 * sc + (focusActor?.seat ? (focusActor.seat.y - 2.0) : 0));
  const chestY = lying ? 1.0 : headY - 1.4 * sc;
  const faceRy = focusActor ? focusActor.av.root.rotation.y : 0;
  const rel = ['closeup', 'xcu', 'crash_zoom', 'medium', 'low', 'high', 'dutch', 'truck', 'orbit'].includes(type);
  const at = (dist, h, a) => { if (rel) a += clamp(faceRy, -1.1, 1.1); return new THREE.Vector3(f.x + Math.sin(a) * dist, h, f.z + Math.cos(a) * dist); };
  let pos, look, fov = 46, roll = 0;
  // multi-actor midpoint
  let mid = f.clone();
  const real = actors.filter(a => a.av);
  if (real.length > 1) { mid = new THREE.Vector3(); real.forEach(a => mid.add(a.av.root.position)); mid.multiplyScalar(1 / real.length); }
  const spread = real.length > 1 ? Math.max(...real.map(a => a.av.root.position.distanceTo(mid))) : 0;
  switch (type) {
    case 'establish': {
      const c = info.interior ? mid : new THREE.Vector3(info.stage.x, 0, info.stage.z);
      const d0 = info.interior ? 17 : 44, d1 = info.interior ? 13 : 30;
      pos = new THREE.Vector3(c.x + Math.sin(ang0) * lerp(d0, d1, e), lerp(info.interior ? 10 : 22, info.interior ? 7 : 11, e), c.z + Math.cos(ang0) * lerp(d0, d1, e));
      look = new THREE.Vector3(c.x, info.interior ? 3 : 5, c.z - (info.interior ? 4 : 10)); fov = 56; break;
    }
    case 'wide': {
      const d = lerp(17, 14, e) + spread * 0.8; const a = ang0 + lerp(-0.18, 0.18, e) * (cam.dir ?? 1);
      pos = new THREE.Vector3(mid.x + Math.sin(a) * d, 6.5, mid.z + Math.cos(a) * d); look = new THREE.Vector3(mid.x, 3.4, mid.z); fov = 50; break;
    }
    case 'two_shot': {
      const d = lerp(12.5, 10.5, e) + spread * 0.9; const a = ang0 + lerp(-0.08, 0.08, e) * (cam.dir ?? 1);
      pos = new THREE.Vector3(mid.x + Math.sin(a) * d, 4.6, mid.z + Math.cos(a) * d); look = new THREE.Vector3(mid.x, 3.8 * sc, mid.z); fov = 46; break;
    }
    case 'medium': default: {
      pos = at(lerp(9.5, 7.6, e), lerp(4.6, 4.3, e), ang0); look = new THREE.Vector3(f.x, chestY + 0.5, f.z); fov = 44; break;
    }
    case 'closeup': {
      pos = at(lerp(5.2, 4.2, e), headY + 0.15, ang0 + lerp(-0.06, 0.06, e) * (cam.dir ?? 1)); look = new THREE.Vector3(f.x, headY - 0.25, f.z); fov = 40; break;
    }
    case 'xcu': {
      pos = at(lerp(3.4, 2.7, easeOutExpo(u * 1.4)), headY, ang0); look = new THREE.Vector3(f.x, headY, f.z); fov = 36; break;
    }
    case 'crash_zoom': {
      const k = easeOutExpo(clamp(u * 2.2, 0, 1));
      pos = at(lerp(12, 3.4, k), lerp(4.8, headY, k), ang0); look = new THREE.Vector3(f.x, lerp(chestY, headY, k), f.z); fov = lerp(50, 38, k); break;
    }
    case 'low': {
      pos = at(lerp(7.5, 6.2, e), lerp(0.7, 1.0, e), ang0 + lerp(-0.12, 0.12, e) * (cam.dir ?? 1)); look = new THREE.Vector3(f.x, headY + 0.2, f.z); fov = 52; break;
    }
    case 'high': {
      pos = at(lerp(9.0, 7.5, e), lerp(info.interior ? 10 : 11.5, info.interior ? 9 : 9.5, e), ang0); look = new THREE.Vector3(f.x, 2.4, f.z); fov = 48; break;
    }
    case 'top': {
      pos = new THREE.Vector3(f.x + 0.01, lerp(info.interior ? 11.8 : 26, info.interior ? 10.5 : 19, e), f.z + 0.5); look = new THREE.Vector3(f.x, 0, f.z); fov = 52; roll = lerp(0, 0.3, e); break;
    }
    case 'orbit': {
      const a = ang0 + lerp(-0.6, 0.6, e) * (cam.dir ?? 1);
      pos = at(8.5, 4.4, a); look = new THREE.Vector3(f.x, chestY + 0.3, f.z); fov = 46; break;
    }
    case 'truck': {
      const dir = cam.dir ?? 1; const off = lerp(-3, 3, e) * dir;
      const base = at(9, 4.4, ang0); const right = new THREE.Vector3(Math.cos(ang0), 0, -Math.sin(ang0));
      pos = base.clone().addScaledVector(right, off); look = new THREE.Vector3(f.x, chestY + 0.4, f.z).addScaledVector(right, off * 0.6); fov = 44; break;
    }
    case 'dutch': {
      pos = at(lerp(7.5, 6.0, e), headY - 0.3, ang0); look = new THREE.Vector3(f.x, chestY + 0.7, f.z); fov = 44; roll = 0.2 * (cam.dir ?? 1); break;
    }
    case 'follow': {
      const fa = focusActor; const heading = fa ? fa.av.root.rotation.y : 0;
      const a = heading + (cam.side ?? 0.9);
      pos = at(9, 4.8, a); look = new THREE.Vector3(f.x, chestY + 0.4, f.z); fov = 46; break;
    }
    case 'ots': {
      const other = real.find(a => a !== focusActor) || focusActor;
      const A = other.av.root.position, B = f;
      const dir = new THREE.Vector3().subVectors(A, B).setY(0).normalize();
      const right = new THREE.Vector3(dir.z, 0, -dir.x); if (right.z < 0) right.multiplyScalar(-1);
      pos = A.clone().addScaledVector(dir, lerp(4.8, 4.1, e)).addScaledVector(right, 3.3).setY(6.0);
      look = new THREE.Vector3(B.x, headY - 0.5, B.z); fov = 44; break;
    }
    case 'pov_down': {
      pos = new THREE.Vector3(f.x, headY + 0.5, f.z + 2.5); look = new THREE.Vector3(f.x, 0.5, f.z - 3); fov = 55; break;
    }
  }
  // keep inside rooms
  if (info.interior && info.bounds) {
    const b = info.bounds; pos.x = clamp(pos.x, b.minX, b.maxX); pos.z = clamp(pos.z, b.minZ, b.maxZ); pos.y = clamp(pos.y, 0.5, b.maxY);
  }
  if (S.yawFix) {
    const v = new THREE.Vector3().subVectors(pos, look); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), S.yawFix); pos = look.clone().add(v);
  }
  // game-style camera collision: never let walls / furniture hide the subject
  if (S.occluders.length && !S.noCollide) {
    const dir = new THREE.Vector3().subVectors(pos, look); const dist = dir.length(); dir.normalize();
    S.ray.set(look, dir); S.ray.far = dist; S.ray.near = 0.6;
    let occ = S.occluders;
    if (!['ots', 'two_shot', 'wide', 'establish'].includes(type)) {
      if (!S.actorOcc) { S.actorOcc = []; for (const a of actors) if (a.av && a !== focusActor) a.av.root.traverse(o => { if (o.isMesh) S.actorOcc.push(o); }); }
      occ = occ.concat(S.actorOcc);
    }
    const hit = S.ray.intersectObjects(occ, false)[0];
    if (S.probe) return { hit: !!(hit && hit.distance < dist - 0.2) };
    if (hit && hit.distance < dist - 0.2) pos = look.clone().addScaledVector(dir, Math.max(1.6, hit.distance - 0.5));
  }
  return { pos, look, fov, roll };
}

function noise(t, seed) { return Math.sin(t * 1.3 + seed) * 0.5 + Math.sin(t * 2.7 + seed * 1.7) * 0.3 + Math.sin(t * 5.1 + seed * 0.3) * 0.2; }

// ---------------------------------------------------------------- render ---
const tmp = new THREE.Vector3();
function updateActors(t) {
  const { spec, actors } = S;
  const slow = spec.fx?.includes('slowmo') ? 0.35 : 1;
  const at = t * slow;
  for (const A of actors) {
    if (A.pet) { A.pet.position.y = Math.abs(Math.sin(t * 6 + A.phase)) * 0.15; if (A.pet.userData.tail) A.pet.userData.tail.rotation.y = Math.sin(t * 14) * 0.5; continue; }
    const av = A.av; av.resetPose();
    const act = ACTIONS[A.action] ? A.action : 'idle';
    ACTIONS[act](av, at, { phase: A.phase, seat: A.seat?.y });
    // locomotion
    const mv = A.spec.move;
    if ((act === 'walk' || act === 'run' || act === 'sneak') && mv !== 'none') {
      const speed = (act === 'run' ? 9 : act === 'walk' ? 3.6 : 2) * (S.info.interior && S.spec.env !== 'hallway' ? 0.35 : 1);
      const dir = A.spec.dir ?? A.ry ?? 0; // heading
      const d = speed * at - speed * S.dur * slow * 0.5;
      av.root.position.set(A.base.x + Math.sin(dir) * d, 0, A.base.z + Math.cos(dir) * d);
      av.root.rotation.y = dir;
    } else if (A.spec.lookAt !== undefined) {
      const o = actors[A.spec.lookAt]; if (o?.av && o !== A) av.root.rotation.y = clamp(Math.atan2(o.av.root.position.x - av.root.position.x, o.av.root.position.z - av.root.position.z) * 0.5 + A.ry * 0.5, -1.05, 1.05);
    }
    // face
    const expr = A.spec.emotion || ACTION_FACE[act] || 'neutral';
    const talking = A.spec.talk ?? TALKING_ACTIONS.has(act);
    let open = 0;
    if (talking) { const v = Math.sin(t * 17 + A.phase) * 0.5 + Math.sin(t * 9.3 + A.phase * 2) * 0.5; open = clamp(v * 0.8 + 0.25, 0, 1); }
    if (expr === 'shocked' || expr === 'scream') open = 0.6;
    const blink = ((t + A.phase) % 3.7) < 0.12;
    av.setFace(expr, open, blink);
    if (A.sym) { av.headWorld(tmp); const pop = easeOutBack(clamp((t - 0.1) / 0.35, 0, 1)); A.sym.position.set(tmp.x + 1.0, tmp.y + 1.5 + Math.sin(t * 4) * 0.12, tmp.z); A.sym.scale.setScalar(1.7 * pop); }
  }
}

window.renderAt = function renderAt(t) {
  const { spec, camera, scene, parts, ov } = S;
  updateActors(t);
  scene.updateMatrixWorld(true);
  // camera
  const p = camPose(t);
  const sd = S.camSeed % 100;
  const shakeAmt = (spec.fx?.includes('shake') ? 0.35 * Math.max(0.15, 1 - t / 0.9) : 0) + (spec.camera?.handheld ?? 0.05);
  const hx = noise(t * (spec.fx?.includes('shake') ? 9 : 1), sd) * shakeAmt, hy = noise(t * (spec.fx?.includes('shake') ? 11 : 1.2), sd + 3) * shakeAmt;
  camera.position.copy(p.pos).add(new THREE.Vector3(hx, hy, 0));
  camera.up.set(0, 1, 0);
  camera.lookAt(p.look.clone().add(new THREE.Vector3(hx * 0.5, hy * 0.5, 0)));
  camera.rotateZ(p.roll);
  let fov = p.fov;
  if (spec.fx?.includes('punch')) fov *= 1 - 0.14 * Math.exp(-Math.pow((t - 0.05) / 0.25, 2));
  camera.fov = fov; camera.updateProjectionMatrix();
  for (const o of Object.values(ov)) { const k = Math.tan(THREE.MathUtils.degToRad(fov) / 2) / Math.tan(THREE.MathUtils.degToRad(o.userData.baseFov) / 2); o.scale.set(k * 1.25, k * 1.25, 1); }
  // particles
  for (const pa of parts) pa.update(t);
  // overlays
  ov.vignette.material.opacity = spec.fx?.includes('red') || spec.fx?.includes('dark') ? 0.9 : 0; // soft vignette is added in post (ffmpeg)
  ov.speed.material.opacity = spec.fx?.includes('speed') ? 0.55 + 0.25 * Math.sin(t * 40) : 0;
  ov.flash.material.opacity = spec.fx?.includes('flash') ? Math.max(0, 1 - t / 0.25) : 0;
  const fin = spec.fadeIn ? Math.max(0, 1 - t / spec.fadeIn) : 0;
  const fout = spec.fadeOut ? clamp((t - (S.dur - spec.fadeOut)) / spec.fadeOut, 0, 1) : 0;
  ov.black.material.opacity = Math.max(fin, fout);
  for (const o of Object.values(ov)) o.visible = o.material.opacity > 0.003;
  renderer.render(scene, camera);
  return true;
};

window.grab = function grab(q = 0.9) { return canvas.toDataURL('image/jpeg', q); };
window.engineReady = true;
