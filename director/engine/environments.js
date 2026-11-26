// Procedural Roblox-style environments. Every builder returns an info object:
// { stage:{x,z}, interior, bounds?, seats:[], beds:[], lampPoints:[] }
// Convention: actors stand around `stage`, camera is placed on the +z side by default.
import * as THREE from 'three';
import { M, box, cyl, sphere, plane, canvasTex, textTex, TEX, repeatTex, rng, shade } from './core.js';

const PASTELS = ['#f4d35e', '#9ad1d4', '#f6a6b2', '#b8e0a0', '#fff1c1', '#c9b6e4', '#ffd6a5', '#a0c4ff', '#e9edc9', '#ffadad'];
const ROOFS = ['#8d3b2f', '#3d4a5c', '#5b3a29', '#2f5d50', '#7a2e3a', '#444'];

function windowMat(night) { return night ? M('#ffd98a', { emissive: '#ffcf6b', ei: 0.9, rough: 0.3 }) : M('#9fd3ff', { rough: 0.15, metal: 0.2 }); }

function tree(p, x, z, r, s = 1, kind) {
  kind = kind || r.pick(['round', 'round', 'pine', 'tall']);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
  box(g, 1.2, 5, 1.2, '#7a4b2a');
  const leaf = r.pick(['#3f9b3a', '#4caf50', '#2e7d32', '#66bb44', '#358f3a']);
  if (kind === 'pine') { for (let i = 0; i < 3; i++) box(g, 6 - i * 1.7, 2.4, 6 - i * 1.7, shade(leaf, -0.05), 0, 4 + i * 2.1, 0, { round: 0.3 }); }
  else if (kind === 'tall') { box(g, 4.5, 8, 4.5, leaf, 0, 4.5, 0, { round: 0.6 }); }
  else { box(g, 7, 5, 7, leaf, 0, 4.2, 0, { round: 0.8 }); box(g, 4.5, 3, 4.5, shade(leaf, 0.06), 0, 8.6, 0, { round: 0.6 }); }
  return g;
}
function bush(p, x, z, r) { box(p, 2.6, 1.8, 2.6, r.pick(['#3f9b3a', '#4caf50', '#2e7d32']), x, 0, z, { round: 0.6 }); }
function flowers(p, x, z, r) { for (let i = 0; i < 6; i++) box(p, 0.4, 0.4, 0.4, r.pick(['#ff5d8f', '#ffd23f', '#ffffff', '#c77dff', '#ff8c42']), x + r.range(-1.5, 1.5), 0.3, z + r.range(-1.5, 1.5), { cast: false }); }

function lamp(p, x, z, night, info) {
  cyl(p, 0.22, 0.3, 11, '#3b3f45', x, 0, z, { seg: 8 });
  box(p, 2.2, 0.3, 0.6, '#3b3f45', x + (x > 0 ? -0.9 : 0.9), 10.8, z);
  box(p, 1.1, 0.4, 0.9, night ? M('#fff4c2', { emissive: '#ffe9a0', ei: 1.5 }) : M('#f0f0f0'), x + (x > 0 ? -1.7 : 1.7), 10.5, z);
  if (night) info.lampPoints.push([x + (x > 0 ? -1.7 : 1.7), 10, z]);
}

function car(p, x, z, ry, r, color) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  color = color || r.pick(['#e53935', '#1e88e5', '#fdd835', '#ffffff', '#212121', '#43a047', '#fb8c00']);
  box(g, 4.4, 1.8, 9, color, 0, 0.9, 0, { round: 0.35 });
  box(g, 4.0, 1.6, 4.8, color, 0, 2.6, -0.6, { round: 0.3 });
  box(g, 4.05, 1.1, 4.4, M('#1d2b3a', { rough: 0.1, metal: 0.4 }), 0, 2.85, -0.6, { cast: false });
  for (const [wx, wz] of [[-2.1, 2.8], [2.1, 2.8], [-2.1, -2.8], [2.1, -2.8]]) cyl(g, 0.95, 0.95, 0.7, '#1a1a1a', wx, 0.95, wz, { rz: Math.PI / 2, seg: 14 }).position.y = 0.95;
  box(g, 0.9, 0.5, 0.1, M('#fff7c2', { emissive: '#fff2a0', ei: 0.6 }), -1.4, 1.6, 4.52); box(g, 0.9, 0.5, 0.1, M('#fff7c2', { emissive: '#fff2a0', ei: 0.6 }), 1.4, 1.6, 4.52);
  box(g, 0.9, 0.4, 0.1, M('#d32f2f', { emissive: '#ff2b2b', ei: 0.4 }), -1.4, 1.6, -4.52); box(g, 0.9, 0.4, 0.1, M('#d32f2f', { emissive: '#ff2b2b', ei: 0.4 }), 1.4, 1.6, -4.52);
  return g;
}

export function house(p, x, z, ry, r, night, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  const w = o.w || r.pick([16, 18, 20]), d = 14, h = r.pick([9, 10, 18]);
  const col = o.color || r.pick(PASTELS);
  const wallMat = M('#ffffff', { map: repeatTex(TEX.siding(col), w / 8, h / 8) });
  box(g, w, h, d, wallMat, 0, 0, 0);
  box(g, w + 0.4, 0.8, d + 0.4, '#e8e2d6', 0, 0, 0);
  // gable roof
  const roofC = o.roof || r.pick(ROOFS);
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 - 1, 0); shape.lineTo(0, 5.5); shape.lineTo(w / 2 + 1, 0); shape.lineTo(-w / 2 - 1, 0);
  const rg = new THREE.ExtrudeGeometry(shape, { depth: d + 2, bevelEnabled: false });
  const roof = new THREE.Mesh(rg, M(roofC, { rough: 0.8 })); roof.position.set(0, h, -d / 2 - 1); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  box(g, 1.6, 4, 1.6, '#8a6f5c', w / 4, h + 1.5, -2);
  const wm = windowMat(night);
  const floors = h > 12 ? 2 : 1;
  for (let f = 0; f < floors; f++) {
    for (const wx of [-w / 2 + 3.5, w / 2 - 3.5]) {
      box(g, 3.6, 3.6, 0.3, '#ffffff', wx, 2.6 + f * 8.5, d / 2);
      box(g, 3.0, 3.0, 0.4, wm, wx, 2.9 + f * 8.5, d / 2, { cast: false });
      box(g, 0.2, 3.0, 0.45, '#ffffff', wx, 2.9 + f * 8.5, d / 2, { cast: false });
      box(g, 4.2, 0.35, 0.8, '#ffffff', wx, 2.4 + f * 8.5, d / 2 + 0.2);
    }
  }
  box(g, 3.2, 6.4, 0.4, r.pick(['#7a4b2a', '#c62828', '#1e4f8f', '#2e7d32']), 0, 0.8, d / 2);
  sphere(g, 0.18, '#ffd54f', 1.0, 3.9, d / 2 + 0.3);
  box(g, 5, 0.4, 2.2, '#cfcfcf', 0, 0, d / 2 + 1.1);
  box(g, 4.5, 0.35, 0.9, '#bbbbbb', 0, 0.4, d / 2 + 0.6, { cast: false });
  return g;
}

function sky(scene, tod) {
  const top = { day: '#3f9cf5', sunset: '#5a4fb3', night: '#060b24' }[tod];
  const bot = { day: '#cfeaff', sunset: '#ffb37a', night: '#1c2a55' }[tod];
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const cols = []; const pos = geo.attributes.position; const ct = new THREE.Color(top), cb = new THREE.Color(bot);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 900; const k = Math.pow(Math.max(0, y), 0.55); const c = cb.clone().lerp(ct, k); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(m);
  if (tod === 'night') {
    const r = rng('stars'); const sp = []; for (let i = 0; i < 500; i++) { const th = r() * Math.PI * 2, ph = r() * 1.2 + 0.15; sp.push(800 * Math.cos(ph) * Math.cos(th), 800 * Math.sin(ph), 800 * Math.cos(ph) * Math.sin(th)); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(30, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff8dc', fog: false })); moon.position.set(-250, 420, -650); scene.add(moon);
  } else {
    const r = rng('clouds' + tod);
    const cm = M(tod === 'sunset' ? '#ffd9c2' : '#ffffff', { rough: 1, basic: true, fog: false });
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group(); const a = r() * Math.PI * 2, dist = r.range(250, 600);
      g.position.set(Math.cos(a) * dist, r.range(110, 220), Math.sin(a) * dist);
      for (let k = 0; k < 4; k++) box(g, r.range(25, 50), r.range(10, 18), r.range(18, 30), cm, r.range(-25, 25), r.range(-4, 6), r.range(-8, 8), { cast: false, receive: false });
      scene.add(g);
    }
  }
}

export function setupLighting(scene, tod, interior, info, focus) {
  const night = tod === 'night';
  const hemi = new THREE.HemisphereLight(
    { day: '#cfe8ff', sunset: '#ffd0a8', night: '#5d6fb0' }[tod],
    { day: '#8d7a5a', sunset: '#6a4a5a', night: '#1a1a30' }[tod],
    interior ? (night ? 0.9 : 1.4) : { day: 1.35, sunset: 1.0, night: 0.55 }[tod]);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight({ day: '#fff3df', sunset: '#ffae6b', night: '#9fb4ff' }[tod], interior ? (night ? 0.5 : 1.6) : { day: 2.7, sunset: 2.2, night: 0.7 }[tod]);
  const fx = focus?.x || 0, fz = focus?.z || 0;
  const dir = info.sun ? new THREE.Vector3(...info.sun).normalize().multiplyScalar(80) : (tod === 'sunset' ? new THREE.Vector3(-60, 25, -40) : new THREE.Vector3(35, 60, 28));
  const sf = info.shadowFocus || [fx, fz];
  sun.position.set(sf[0] + dir.x, dir.y, sf[1] + dir.z); sun.target.position.set(sf[0], 0, sf[1]);
  if (info.sunIntensity) sun.intensity = info.sunIntensity;
  if (info.hemi) hemi.intensity = info.hemi;
  sun.castShadow = true; sun.shadow.mapSize.set(window.SHADOW_SIZE || 2048, window.SHADOW_SIZE || 2048);
  const ss = info.shadowSize || 38;
  const sc = sun.shadow.camera; sc.left = -ss; sc.right = ss; sc.top = ss; sc.bottom = -ss; sc.near = 1; sc.far = 260;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  if (interior) {
    const pl = new THREE.PointLight(night ? '#ffd9a0' : '#fff6e8', night ? 260 : 160, 60, 1.6); pl.position.set(fx, 10.5, fz + 2); scene.add(pl);
  }
  // a few warm lamp lights at night (nearest to focus)
  if (night && info.lampPoints.length) {
    const pts = info.lampPoints.slice().sort((a, b) => (Math.hypot(a[0] - fx, a[2] - fz) - Math.hypot(b[0] - fx, b[2] - fz))).slice(0, 3);
    for (const p of pts) { const l = new THREE.PointLight('#ffcf7a', 420, 45, 1.7); l.position.set(p[0], p[1] - 0.6, p[2]); scene.add(l); }
  }
  const fogC = interior ? null : { day: '#cfeaff', sunset: '#f6b08a', night: '#18244a' }[tod];
  if (fogC) scene.fog = new THREE.Fog(fogC, info.fogNear || 90, info.fogFar || 520);
  if (info.background) { scene.background = new THREE.Color(info.background); scene.fog = info.fogColor ? new THREE.Fog(info.fogColor, info.fogNear || 30, info.fogFar || 140) : null; }
  else if (!interior) sky(scene, tod);
  else scene.background = new THREE.Color('#222');
  if (info.extraLights) for (const l of info.extraLights) { const pl = new THREE.PointLight(l.color, l.intensity, l.dist || 60, 1.5); pl.position.set(...l.pos); scene.add(pl); }
}

// ------------------------------------------------------------ EXTERIORS ----
function ground(p, mat, size = 1200) { const g = plane(p, size, size, mat, 0, 0, 0, { rx: -Math.PI / 2 }); return g; }

function street(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [] };
  ground(p, M('#ffffff', { map: repeatTex(TEX.grass(), 120, 120) }));
  plane(p, 14, 700, M('#ffffff', { map: repeatTex(TEX.asphalt(), 2, 100) }), 0, 0.02, -200, { rx: -Math.PI / 2 });
  for (let z = 60; z > -500; z -= 9) box(p, 0.4, 0.05, 4, '#f2d24b', 0, 0.03, z, { cast: false });
  for (const sx of [-1, 1]) {
    box(p, 5, 0.35, 700, '#c8c8c8', sx * 9.5, 0, -200, { cast: false });
    box(p, 0.4, 0.4, 700, '#a9a9a9', sx * 7.1, 0, -200, { cast: false });
    for (let z = 70, i = 0; z > -420; z -= 28, i++) {
      house(p, sx * 26, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, r, night);
      if (i % 2 === 0) tree(p, sx * 15, z - 14, r, r.range(0.8, 1.1));
      bush(p, sx * 15.5, z + 6, r);
      if (i % 3 === 1) lamp(p, sx * 12.4, z - 4, night, info);
      if (r() < 0.35) car(p, sx * 4.4, z - 9, r() < 0.5 ? 0 : Math.PI, r);
      // fence segments
      for (let k = -9; k <= 9; k += 2) box(p, 0.3, 1.8, 0.3, '#ffffff', sx * 13.2, 0, z + k, { cast: false });
      box(p, 0.2, 0.3, 19, '#ffffff', sx * 13.2, 1.3, z, { cast: false });
    }
  }
  return info;
}

function city(p, r, night) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [] };
  ground(p, M('#9a9a9a'));
  plane(p, 16, 800, M('#ffffff', { map: repeatTex(TEX.asphalt(), 2, 110) }), 0, 0.02, -250, { rx: -Math.PI / 2 });
  for (let z = 60; z > -500; z -= 9) box(p, 0.4, 0.05, 4, '#f2f2f2', 0, 0.03, z, { cast: false });
  for (let k = -6; k <= 6; k += 2) box(p, 1.2, 0.05, 5, '#f5f5f5', k, 0.03, -30, { cast: false });
  const signs = ['PIZZA', 'MAGASIN', 'BANQUE', 'CAFÉ', 'HÔTEL', 'BURGER', 'MODE', 'JEUX', 'MARKET', 'GLACES'];
  const wm = windowMat(night);
  for (const sx of [-1, 1]) {
    box(p, 7, 0.35, 800, '#cfcfcf', sx * 11.5, 0, -250, { cast: false });
    for (let z = 60, i = 0; z > -460; z -= 24, i++) {
      const g = new THREE.Group(); g.position.set(sx * 26, 0, z); g.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; p.add(g);
      const hgt = r.pick([24, 34, 46, 60]), col = r.pick(['#d7ccc8', '#90a4ae', '#ffcc80', '#b0bec5', '#ef9a9a', '#c5e1a5', '#fff59d']);
      box(g, 22, hgt, 14, M('#ffffff', { map: repeatTex(TEX.plaster(col), 3, hgt / 8) }), 0, 0, 0);
      box(g, 20, 7, 0.4, wm, 0, 0.5, 7, { cast: false });
      box(g, 3, 6, 0.5, '#5d4037', -6, 0.3, 7.1);
      const awn = r.pick(['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa']);
      box(g, 22, 0.6, 3.5, awn, 0, 8, 8.6, { rx: -0.25 });
      box(g, 14, 3, 0.4, M('#ffffff', { map: textTex(signs[(i * 3 + (sx > 0 ? 1 : 0)) % signs.length], { bg: awn, color: '#fff', stroke: '#00000066' }) }), 0, 9.2, 7.3, { cast: false });
      for (let fy = 13; fy < hgt - 3; fy += 7) for (let fx = -8; fx <= 8; fx += 5.3) box(g, 3.2, 4, 0.3, r() < (night ? 0.55 : 1) ? wm : M('#2a3240'), fx, fy, 7, { cast: false });
      if (i % 2 === 0) lamp(p, sx * 14.5, z - 10, night, info);
      if (i % 3 === 0) tree(p, sx * 14.5, z + 3, r, 0.7, 'round');
      if (r() < 0.4) car(p, sx * 4.8, z - 9, r() < 0.5 ? 0 : Math.PI, r);
    }
  }
  // traffic light
  const tl = new THREE.Group(); tl.position.set(9, 0, -24); p.add(tl);
  cyl(tl, 0.25, 0.25, 12, '#333', 0, 0, 0); box(tl, 1.4, 3.8, 1.2, '#222', 0, 12, 0);
  sphere(tl, 0.42, M('#ff3b30', { emissive: '#ff3b30', ei: 1.2 }), 0, 15, 0.65); sphere(tl, 0.42, '#553', 0, 13.8, 0.65); sphere(tl, 0.42, '#353', 0, 12.6, 0.65);
  return info;
}

function houseExt(p, r, night) {
  const info = { stage: { x: 0, z: 6 }, interior: false, seats: [], beds: [], lampPoints: [] };
  ground(p, M('#ffffff', { map: repeatTex(TEX.grass(), 120, 120) }));
  house(p, 0, -6, 0, r, night, { w: 22, color: r.pick(PASTELS) });
  house(p, -34, -10, 0, r, night); house(p, 34, -10, 0, r, night);
  house(p, -64, -8, 0, r, night); house(p, 64, -8, 0, r, night);
  box(p, 5, 0.12, 22, '#cfcfcf', 0, 0, 12, { cast: false });
  plane(p, 400, 14, M('#ffffff', { map: repeatTex(TEX.asphalt(), 40, 2) }), 0, 0.03, 34, { rx: -Math.PI / 2 });
  for (let x = -40; x <= 40; x += 2) if (Math.abs(x) > 3) box(p, 0.3, 2, 0.3, '#ffffff', x, 0, 24, { cast: false });
  box(p, 37, 0.25, 0.2, '#ffffff', -21.5, 1.5, 24, { cast: false }); box(p, 37, 0.25, 0.2, '#ffffff', 21.5, 1.5, 24, { cast: false });
  box(p, 0.4, 3.6, 0.4, '#5d4037', 5, 0, 22); box(p, 1.4, 1.2, 2, '#1e88e5', 5, 3.6, 22);
  tree(p, -15, 4, r, 1.1); tree(p, 16, -2, r, 1.0);
  for (let i = 0; i < 6; i++) bush(p, -10 + i * 4 + (i > 2 ? 4 : 0), 2.5, r);
  flowers(p, -8, 6, r); flowers(p, 9, 6, r);
  car(p, 11, 10, 0, r);
  lamp(p, -9, 26, night, info);
  return info;
}

function schoolExt(p, r, night) {
  const info = { stage: { x: 0, z: 8 }, interior: false, seats: [], beds: [], lampPoints: [] };
  ground(p, M('#ffffff', { map: repeatTex(TEX.grass(), 120, 120) }));
  plane(p, 110, 60, M('#8f9399'), 0, 0.02, 10, { rx: -Math.PI / 2 });
  const g = new THREE.Group(); g.position.set(0, 0, -22); p.add(g);
  const bm = M('#ffffff', { map: repeatTex(TEX.brick('#b5523b'), 10, 4) });
  box(g, 80, 24, 20, bm, 0, 0, 0); box(g, 24, 30, 22, bm, 0, 0, 1);
  box(g, 82, 1.2, 22, '#e0d6c8', 0, 24, 0); box(g, 26, 1.2, 24, '#e0d6c8', 0, 30, 1);
  const wm = windowMat(night);
  for (const fy of [4, 14]) for (let fx = -36; fx <= 36; fx += 6) if (Math.abs(fx) > 13) { box(g, 4, 5, 0.3, '#ffffff', fx, fy - 0.3, 10); box(g, 3.4, 4.4, 0.4, wm, fx, fy, 10, { cast: false }); }
  box(g, 12, 9, 0.5, '#2d5f9a', 0, 0, 12.1); box(g, 11, 8.2, 0.6, M('#9fd3ff', { rough: 0.1 }), 0, 0, 12.1, { cast: false });
  box(g, 20, 4.4, 0.6, M('#ffffff', { map: textTex('ÉCOLE', { bg: '#1f4e8c', color: '#ffffff', size: 170 }) }), 0, 21, 12.2, { cast: false });
  for (const cx of [-8, 8]) cyl(g, 0.8, 0.8, 18, '#f2efe8', cx, 0, 14);
  box(g, 22, 1.2, 6, '#e0d6c8', 0, 18, 14.2);
  for (let s = 0; s < 3; s++) box(g, 18, 0.6, 2, '#cfcfcf', 0, s * 0.6, 17 - s * 1.2, { cast: false });
  cyl(p, 0.2, 0.2, 26, '#ddd', -30, 0, 6); box(p, 6, 3.6, 0.1, '#1e88e5', -27, 21, 6, { cast: false });
  // bus
  const bus = new THREE.Group(); bus.position.set(34, 0, 18); bus.rotation.y = -0.15; p.add(bus);
  box(bus, 6, 6.5, 22, '#f9c80e', 0, 1, 0, { round: 0.4 }); box(bus, 6.1, 1.8, 18, M('#1d2b3a', { rough: 0.1 }), 0, 4.6, -1, { cast: false });
  box(bus, 6.1, 0.4, 22, '#222', 0, 3.3, 0, { cast: false });
  for (const [wx, wz] of [[-3, 7], [3, 7], [-3, -7], [3, -7]]) cyl(bus, 1.3, 1.3, 0.8, '#111', wx, 1.3, wz, { rz: Math.PI / 2 }).position.y = 1.3;
  tree(p, -44, 0, r, 1.1); tree(p, 46, -2, r, 1.2); tree(p, -52, 18, r); tree(p, 52, 30, r);
  for (let x = -40; x <= 40; x += 10) box(p, 0.4, 0.05, 6, '#fff', x, 0.03, 26, { cast: false });
  lamp(p, -16, 22, night, info); lamp(p, 18, 24, night, info);
  return info;
}

function park(p, r, night) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [{ x: -6, z: -4, y: 2.0, ry: 0 }], beds: [], lampPoints: [] };
  ground(p, M('#ffffff', { map: repeatTex(TEX.grass(), 120, 120) }));
  plane(p, 8, 300, M('#d8c39a'), 0, 0.03, -60, { rx: -Math.PI / 2 });
  // bench
  const b = new THREE.Group(); b.position.set(-6, 0, -5); p.add(b);
  box(b, 7, 0.4, 2, '#8d5a34', 0, 1.8, 0); box(b, 7, 2, 0.35, '#8d5a34', 0, 2.3, -1); for (const x of [-3, 3]) box(b, 0.4, 1.8, 1.8, '#333', x, 0, 0);
  // fountain
  const f = new THREE.Group(); f.position.set(12, 0, -16); p.add(f);
  cyl(f, 6, 6.4, 1.6, '#bdbdbd', 0, 0, 0, { seg: 24 }); cyl(f, 5.4, 5.4, 0.2, M('#4fc3f7', { rough: 0.1, metal: 0.1 }), 0, 1.4, 0, { seg: 24 });
  cyl(f, 0.8, 1, 4, '#bdbdbd', 0, 1, 0); cyl(f, 2.2, 1.4, 0.8, '#bdbdbd', 0, 4.6, 0);
  // playground
  const pg = new THREE.Group(); pg.position.set(-18, 0, -26); p.add(pg);
  box(pg, 6, 0.6, 6, '#e53935', 0, 7, 0); for (const [x, z] of [[-2.7, -2.7], [2.7, -2.7], [-2.7, 2.7], [2.7, 2.7]]) box(pg, 0.6, 7, 0.6, '#1e88e5', x, 0, z);
  box(pg, 3, 0.4, 12, '#fdd835', 0, 3.6, 7.5, { rx: 0.62 });
  box(pg, 4, 7.6, 0.6, '#43a047', 4.5, 0, -2, {});
  for (let i = 0; i < 26; i++) { const x = r.range(-80, 80), z = r.range(-160, 30); if (Math.abs(x) < 10 && z > -40) continue; tree(p, x, z, r, r.range(0.8, 1.3)); }
  for (let i = 0; i < 14; i++) { const x = r.range(-40, 40), z = r.range(-60, 20); if (Math.abs(x) > 6) { bush(p, x, z, r); flowers(p, x + 2, z + 2, r); } }
  lamp(p, 5.5, -2, night, info); lamp(p, -5.5, -30, night, info);
  return info;
}

function forest(p, r, night) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [] };
  ground(p, M('#ffffff', { map: repeatTex(TEX.grass(), 120, 120) }));
  plane(p, 7, 400, M('#8b6b45'), 0, 0.03, -100, { rx: -Math.PI / 2 });
  for (let i = 0; i < 90; i++) { const x = r.range(-70, 70), z = r.range(-220, 40); if (Math.abs(x) < 7) continue; tree(p, x, z, r, r.range(0.9, 1.6), r.pick(['pine', 'pine', 'tall', 'round'])); }
  for (let i = 0; i < 20; i++) box(p, r.range(1, 3), r.range(0.8, 2), r.range(1, 3), '#8a8a8a', r.range(-30, 30), 0, r.range(-80, 20), { round: 0.3 });
  return info;
}

function beach(p, r, night) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [] };
  ground(p, M('#f3dea2'));
  plane(p, 1200, 600, M('#2fa6d9', { rough: 0.15, metal: 0.1 }), 0, 0.15, -330, { rx: -Math.PI / 2 });
  for (let i = 0; i < 8; i++) { const x = r.range(-60, 60), z = r.range(-20, 30); const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g); cyl(g, 0.3, 0.3, 9, '#eee', 0, 0, 0); cyl(g, 0.1, 5, 2, r.pick(['#e53935', '#fdd835', '#1e88e5']), 0, 8, 0, { seg: 8 }); }
  for (let i = 0; i < 10; i++) { const g = new THREE.Group(); g.position.set(r.range(-90, 90), 0, r.range(10, 60)); p.add(g); box(g, 1, 14, 1, '#8d6e63', 0, 0, 0, { rz: 0.15 }); for (let k = 0; k < 5; k++) box(g, 7, 0.3, 1.6, '#2e7d32', 2.5 * Math.cos(k * 1.25), 13.6, 2.5 * Math.sin(k * 1.25), { ry: -k * 1.25 }); }
  return info;
}

// ------------------------------------------------------------ INTERIORS ----
function room(p, W, D, H, wallCol, floorMat, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: true, seats: [], beds: [], lampPoints: [], bounds: { minX: -W / 2 + 1.2, maxX: W / 2 - 1.2, minZ: -D / 2 + 1.2, maxZ: D / 2 - 1.2, maxY: H - 0.6 } };
  plane(p, W, D, floorMat, 0, 0.01, 0, { rx: -Math.PI / 2 });
  const wm = M('#ffffff', { map: repeatTex(TEX.plaster(wallCol), W / 10, H / 10) });
  box(p, W, H, 0.6, wm, 0, 0, -D / 2 - 0.3, { cast: false });
  box(p, 0.6, H, D, wm, -W / 2 - 0.3, 0, 0, { cast: false });
  box(p, 0.6, H, D, wm, W / 2 + 0.3, 0, 0, { cast: false });
  box(p, W, H, 0.6, wm, 0, 0, D / 2 + 0.3, { cast: false });
  box(p, W, 0.5, D, o.ceiling || '#f4f1ea', 0, H, 0, { cast: false });
  box(p, W, 0.8, 0.2, '#ffffff', 0, 0, -D / 2 + 0.05, { cast: false });
  box(p, 0.2, 0.8, D, '#ffffff', -W / 2 + 0.05, 0, 0, { cast: false }); box(p, 0.2, 0.8, D, '#ffffff', W / 2 - 0.05, 0, 0, { cast: false });
  return info;
}
function wallWindow(p, x, y, z, w, h, night, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
  box(g, w + 0.8, h + 0.8, 0.3, '#ffffff', 0, -0.4, 0, { cast: false });
  box(g, w, h, 0.35, night ? M('#1a2550', { emissive: '#14204a', ei: 0.6 }) : M('#bfe6ff', { emissive: '#bfe6ff', ei: 0.65 }), 0, 0, 0.02, { cast: false });
  box(g, 0.25, h, 0.4, '#ffffff', 0, 0, 0.02, { cast: false }); box(g, w, 0.25, 0.4, '#ffffff', 0, h / 2 - 0.1, 0.02, { cast: false });
  return g;
}
function frame(p, x, y, z, w, h, r, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
  box(g, w, h, 0.25, '#5d4037', 0, 0, 0, { cast: false });
  const c1 = r.pick(['#ffcc80', '#90caf9', '#a5d6a7', '#f48fb1', '#ce93d8']);
  box(g, w - 0.5, h - 0.5, 0.3, c1, 0, 0.25, 0.02, { cast: false });
  box(g, (w - 0.5) * 0.5, (h - 0.5) * 0.4, 0.32, shade(c1, -0.2), 0.3, 0.6, 0.03, { cast: false });
}
function door(p, x, z, ry, col = '#8d5a34') { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); box(g, 4.4, 8.4, 0.3, '#ffffff', 0, 0, 0, { cast: false }); box(g, 3.8, 8, 0.4, col, 0, 0, 0.05); sphere(g, 0.2, '#ffd54f', 1.4, 4, 0.35); }
function plant(p, x, z) { cyl(p, 0.9, 0.7, 1.6, '#b0603a', x, 0, z); box(p, 2.2, 2.6, 2.2, '#3f9b3a', x, 1.6, z, { round: 0.6 }); }

function livingRoom(p, r, night) {
  const W = 34, D = 30, H = 13;
  const info = room(p, W, D, H, r.pick(['#f3e6d0', '#e8f0e0', '#f6dfd6', '#dfe9f3']), M('#ffffff', { map: repeatTex(TEX.wood(), 6, 6) }), night);
  info.stage = { x: 0, z: 1 };
  box(p, 16, 0.08, 11, M('#ffffff', { map: TEX.carpet(r.pick(['#b74b4b', '#4b6cb7', '#6a994e', '#8d6a9f'])) }), 0, 0.02, -2, { cast: false });
  const sc = r.pick(['#5c6bc0', '#8d6e63', '#26a69a', '#ef5350', '#78909c']);
  const s = new THREE.Group(); s.position.set(0, 0, -11); p.add(s);
  box(s, 13, 2, 4.4, sc, 0, 0, 0, { round: 0.25 }); box(s, 13, 3.6, 1.4, sc, 0, 1.8, -1.8, { round: 0.3 });
  box(s, 1.4, 3.2, 4.4, shade(sc, -0.08), -6.8, 0, 0, { round: 0.3 }); box(s, 1.4, 3.2, 4.4, shade(sc, -0.08), 6.8, 0, 0, { round: 0.3 });
  for (const x of [-3.1, 3.1]) box(s, 5.8, 0.8, 3.6, shade(sc, 0.06), x, 2, 0.3, { round: 0.3 });
  info.seats.push({ x: -3, z: -10.4, y: 2.8, ry: 0 }, { x: 3, z: -10.4, y: 2.8, ry: 0 });
  box(p, 6, 1.6, 3.4, '#6d4c41', 0, 0, -3); box(p, 1.2, 0.5, 0.8, '#ffffff', 1, 1.6, -3);
  wallWindow(p, -8, 7.5, -14.7, 7, 5, night); wallWindow(p, 8, 7.5, -14.7, 7, 5, night);
  frame(p, 0, 9.4, -14.6, 5, 3.6, r);
  // TV wall unit on right
  box(p, 1.2, 3, 10, '#4e342e', 16, 0, 0); box(p, 0.4, 5, 9, '#111', 15.6, 4, 0, { cast: false });
  box(p, 0.45, 4.4, 8.4, night ? M('#4fc3f7', { emissive: '#4fc3f7', ei: 0.8 }) : M('#1c2733', { rough: 0.15 }), 15.5, 4.3, 0, { cast: false });
  box(p, 3, 9, 6, '#795548', -15, 0, -6); for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) box(p, 2.6, 1.6, r.range(0.4, 0.8), r.pick(['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa']), -14.6, 1 + k * 2.1, -8 + j * 1.2, { ry: Math.PI / 2, cast: false });
  door(p, -16.6, 8, Math.PI / 2);
  plant(p, 12, -12); plant(p, -11, -12);
  cyl(p, 0.15, 0.15, 7, '#333', 10, 0, -12); cyl(p, 1.4, 0.8, 1.6, M('#fff4d6', { emissive: '#fff0c0', ei: night ? 1 : 0.2 }), 10, 7, -12);
  return info;
}

function bedroom(p, r, night) {
  const W = 30, D = 28, H = 13;
  const wc = r.pick(['#cfe3f7', '#f7d6e0', '#e3f2d7', '#efe4ff', '#fff2c6']);
  const info = room(p, W, D, H, wc, M('#ffffff', { map: repeatTex(TEX.wood(), 5, 5) }), night);
  info.stage = { x: -2, z: 1 };
  const bed = new THREE.Group(); bed.position.set(7, 0, -8); p.add(bed);
  const bc = r.pick(['#1e88e5', '#e53935', '#8e24aa', '#43a047', '#f06292']);
  box(bed, 7.5, 1.8, 12, '#8d5a34'); box(bed, 7.5, 5, 0.8, '#8d5a34', 0, 0, -6.2);
  box(bed, 7.1, 1.2, 11.4, '#f5f5f5', 0, 1.8, 0); box(bed, 7.2, 0.6, 8, bc, 0, 2.9, 1.6); box(bed, 5, 0.9, 2.2, '#ffffff', 0, 3, -4.4, { round: 0.3 });
  info.beds.push({ x: 7, z: -8.5, y: 3.2, ry: 0 });
  info.seats.push({ x: 7, z: -2, y: 3.0, ry: 0 });
  // desk + computer
  const d = new THREE.Group(); d.position.set(-9, 0, -11); p.add(d);
  box(d, 9, 0.5, 4, '#a1887f', 0, 3.6, 0); for (const x of [-4.2, 4.2]) box(d, 0.5, 3.6, 3.6, '#8d6e63', x, 0, 0);
  box(d, 4.6, 3, 0.3, '#111', 0, 4.6, -1); box(d, 4.2, 2.6, 0.35, night ? M('#4fc3f7', { emissive: '#64b5f6', ei: 1 }) : M('#29b6f6', { emissive: '#29b6f6', ei: 0.4 }), 0, 4.8, -0.95, { cast: false });
  box(d, 3, 0.2, 1.2, '#333', 0, 4.1, 0.8); box(d, 3, 4.6, 3, '#e53935', 0, 0, 4, { round: 0.3 });
  wallWindow(p, 0, 7, -13.7, 6, 5, night);
  const poster = canvasTex('poster' + bc, 256, 340, (g, w, h) => { g.fillStyle = bc; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '64px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('GAME', w / 2, 90); g.fillText('ON!', w / 2, 160); g.fillStyle = '#ffd54f'; g.fillRect(70, 200, 116, 110); g.fillStyle = '#222'; g.fillRect(95, 225, 20, 20); g.fillRect(141, 225, 20, 20); });
  box(p, 3.6, 4.8, 0.1, M('#ffffff', { map: poster }), -9, 8.4, -13.9, { cast: false });
  box(p, 6, 11, 3, '#8d6e63', -13.4, 0, 4, { ry: Math.PI / 2 }); box(p, 0.1, 10, 2.8, '#6d4c41', -11.9, 0.4, 4, { cast: false });
  box(p, 10, 0.08, 7, M('#ffffff', { map: TEX.carpet(r.pick(['#ffd54f', '#4fc3f7', '#ff8a80', '#b39ddb'])) }), -1, 0.02, 0, { cast: false, round: 0 });
  box(p, 2.4, 2.4, 2.4, '#ffb300', 2, 0, 5, { round: 0.2 });
  door(p, 15.1, 6, -Math.PI / 2, '#ffffff');
  return info;
}

function kitchen(p, r, night) {
  const W = 32, D = 28, H = 13;
  const info = room(p, W, D, H, r.pick(['#fff8e1', '#e0f2f1', '#fce4ec']), M('#ffffff', { map: repeatTex(TEX.tiles('#fafafa', '#cfd8dc'), 6, 6) }), night);
  info.stage = { x: 0, z: 2 };
  const cc = r.pick(['#5d8aa8', '#8d6e63', '#ffffff', '#6a994e']);
  box(p, 26, 3.8, 3.6, cc, -2, 0, -12); box(p, 26.4, 0.4, 4, '#eceff1', -2, 3.8, -12);
  for (let x = -13; x <= 10; x += 4.4) { box(p, 4.2, 3.6, 2.4, shade(cc, 0.05), x + 2, 7.6, -12.8); sphere(p, 0.15, '#bbb', x + 2, 3, -10.15); }
  box(p, 5, 0.2, 3, '#9e9e9e', 4, 4.2, -12); box(p, 4.4, 0.1, 2.6, '#222', -6, 4.2, -12);
  box(p, 5, 11, 4.4, '#eceff1', 13.2, 0, -11.6); box(p, 0.3, 5, 0.3, '#9e9e9e', 11, 5.5, -9.3);
  wallWindow(p, 4, 7.6, -13.7, 5, 3.4, night);
  const t = new THREE.Group(); t.position.set(-2, 0, 3); p.add(t);
  box(t, 9, 0.5, 6, '#a1887f', 0, 3.6, 0); for (const [x, z] of [[-4, -2.5], [4, -2.5], [-4, 2.5], [4, 2.5]]) box(t, 0.5, 3.6, 0.5, '#8d6e63', x, 0, z);
  for (const x of [-3, 3]) { box(t, 2.6, 0.4, 2.6, '#6d4c41', x, 2.2, -4.6); box(t, 2.6, 4, 0.4, '#6d4c41', x, 2.2, -5.8); }
  info.seats.push({ x: -5, z: -1.6, y: 2.6, ry: 0 }, { x: 1, z: -1.6, y: 2.6, ry: 0 });
  box(t, 1.6, 0.4, 1.6, '#ffffff', -2, 4.1, 0); box(t, 1.8, 0.4, 1.8, '#ffffff', 2, 4.1, 0.4);
  return info;
}

function classroom(p, r, night) {
  const W = 40, D = 40, H = 14;
  const info = room(p, W, D, H, r.pick(['#f6efd9', '#e3eef7', '#eef6e3']), M('#ffffff', { map: repeatTex(TEX.wood(), 7, 7) }), night);
  info.stage = { x: 0, z: 4 };
  const bb = canvasTex('blackboard', 1024, 400, (g, w, h) => {
    g.fillStyle = '#20533a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffffcc'; g.fillStyle = '#ffffffdd'; g.lineWidth = 4;
    g.font = '64px "Fredoka"'; g.fillText('2 + 2 = 4', 60, 110); g.fillText('Mathématiques', 520, 110); g.font = '48px "Fredoka"'; g.fillText('x² + 3x = 10', 80, 230); g.beginPath(); g.moveTo(560, 200); g.lineTo(900, 330); g.lineTo(560, 330); g.closePath(); g.stroke();
  });
  box(p, 24, 8, 0.4, '#5d4037', 0, 3.6, -19.6, { cast: false }); box(p, 23, 7.2, 0.5, M('#ffffff', { map: bb }), 0, 4, -19.5, { cast: false });
  box(p, 9, 3.6, 4, '#8d6e63', -10, 0, -14); box(p, 9.4, 0.4, 4.4, '#a1887f', -10, 3.6, -14);
  box(p, 1.6, 1.2, 1.2, '#e53935', -8, 4, -14);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    const x = -13.5 + col * 9, z = -6 + row * 7.5; if (Math.abs(x - info.stage.x) < 6 && z > info.stage.z - 4) continue;
    const dg = new THREE.Group(); dg.position.set(x, 0, z); p.add(dg);
    box(dg, 5, 0.35, 3, '#c8a27a', 0, 3.4, 0); box(dg, 0.3, 3.4, 0.3, '#888', -2.2, 0, -1.2); box(dg, 0.3, 3.4, 0.3, '#888', 2.2, 0, -1.2); box(dg, 0.3, 3.4, 0.3, '#888', -2.2, 0, 1.2); box(dg, 0.3, 3.4, 0.3, '#888', 2.2, 0, 1.2);
    box(dg, 2.8, 0.3, 2.6, '#1e88e5', 0, 2.0, 2.8); box(dg, 2.8, 3, 0.3, '#1e88e5', 0, 2.0, 4.1);
    if (r() < 0.6) box(dg, 1.6, 0.25, 1.2, r.pick(['#ffffff', '#fdd835', '#ef5350']), r.range(-1, 1), 3.75, 0, { cast: false });
    info.seats.push({ x, z: z + 2.6, y: 2.3, ry: 0, desk: true });
  }
  for (const z of [-10, 4]) wallWindow(p, -19.7, 7, z, 9, 6, night, Math.PI / 2);
  const clock = canvasTex('clock', 128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#222'; g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 22); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke(); });
  box(p, 2.6, 2.6, 0.2, M('#ffffff', { map: clock }), 14, 11, -19.7, { cast: false });
  for (let i = 0; i < 4; i++) frame(p, 19.6, 8, -12 + i * 7, 4, 3, r, -Math.PI / 2);
  door(p, 19.6, 14, -Math.PI / 2, '#1e88e5');
  return info;
}

function hallway(p, r, night) {
  const W = 16, D = 140, H = 13;
  const info = room(p, W, D, H, '#eef0f2', M('#ffffff', { map: repeatTex(TEX.tiles('#f5f5f5', '#c5cae9'), 4, 35) }), night);
  info.stage = { x: 0, z: 40 };
  info.bounds.maxZ = 68; info.bounds.minX = -5.2; info.bounds.maxX = 5.2;
  const lc = r.pick(['#1e88e5', '#e53935', '#43a047', '#fb8c00']);
  const lt = canvasTex('locker' + lc, 64, 256, (g, w, h) => { g.fillStyle = lc; g.fillRect(0, 0, w, h); g.fillStyle = '#00000044'; for (let y = 20; y < 70; y += 9) g.fillRect(14, y, 36, 4); g.fillRect(46, 120, 6, 24); g.fillStyle = '#00000033'; g.fillRect(0, 0, 3, h); });
  const lm = M('#ffffff', { map: lt, rough: 0.4, metal: 0.25 });
  for (const sx of [-1, 1]) for (let z = -66; z < 66; z += 2.2) {
    if (Math.abs(z % 30) < 3) continue;
    box(p, 1.6, 8.5, 2.1, lm, sx * 7.1, 0, z, { cast: false });
  }
  for (let z = -60; z < 68; z += 12) box(p, 6, 0.2, 3, M('#ffffff', { emissive: '#ffffff', ei: 0.9 }), 0, H - 0.3, z, { cast: false });
  for (const z of [-48, -18, 12, 42]) { door(p, -7.6, z, Math.PI / 2, '#8d6e63'); door(p, 7.6, z + 8, -Math.PI / 2, '#8d6e63'); }
  return info;
}

function store(p, r, night) {
  const W = 56, D = 60, H = 15;
  const info = room(p, W, D, H, '#f5f5f5', M('#ffffff', { map: repeatTex(TEX.tiles('#ffffff', '#e0e0e0'), 10, 10) }), night, { ceiling: '#eeeeee' });
  info.stage = { x: 0, z: 14 };
  const cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#f06292', '#ffffff', '#795548'];
  const prodGeo = new THREE.BoxGeometry(1, 1, 1);
  const prodMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
  const items = [];
  for (let sx = -21; sx <= 21; sx += 10.5) {
    if (Math.abs(sx) < 3) continue;
    box(p, 3, 9, 34, '#b0bec5', sx, 0, -10);
    for (let lvl = 0; lvl < 4; lvl++) for (const side of [-1, 1]) {
      box(p, 3.6, 0.25, 34, '#90a4ae', sx + side * 0.3, 1 + lvl * 2.2, -10, { cast: false });
      for (let z = -26; z < 6.5; z += 1.25) items.push([sx + side * 1.95, 1.25 + lvl * 2.2, z, r.pick(cols), r.range(0.9, 1.6)]);
    }
  }
  const im = new THREE.InstancedMesh(prodGeo, prodMat, items.length);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  items.forEach((it, i) => { m4.makeScale(1.1, it[4], 1.0); m4.setPosition(it[0], it[1] + it[4] / 2, it[2]); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(it[3])); });
  im.castShadow = true; im.receiveShadow = true; p.add(im);
  const ck = new THREE.Group(); ck.position.set(-14, 0, 20); p.add(ck);
  box(ck, 10, 3.8, 3.2, '#37474f'); box(ck, 10.4, 0.3, 3.6, '#eceff1', 0, 3.8, 0); box(ck, 1.8, 1.4, 1.4, '#212121', 2, 4.1, 0); box(ck, 1.4, 1, 0.1, M('#76ff03', { emissive: '#76ff03', ei: 0.6 }), 2, 5.1, -0.5, { cast: false });
  for (let z = -26; z < 26; z += 10) for (let x = -20; x <= 20; x += 13) box(p, 6, 0.2, 2, M('#ffffff', { emissive: '#ffffff', ei: 1 }), x, H - 0.3, z, { cast: false });
  box(p, 22, 3.6, 0.3, M('#ffffff', { map: textTex('SUPER MARCHÉ', { bg: '#e53935', color: '#fff', size: 120, w: 1400 }) }), 0, 10.5, -29.6, { cast: false });
  box(p, 7, 2.8, 0.3, M('#ffffff', { map: textTex('PROMO -50%', { bg: '#fdd835', color: '#c62828', size: 110, w: 900 }) }), 21, 10.5, -29.6, { cast: false });
  return info;
}

function hospital(p, r, night) {
  const W = 30, D = 28, H = 13;
  const info = room(p, W, D, H, '#e6f4f1', M('#ffffff', { map: repeatTex(TEX.tiles('#f1f8f7', '#d4e9e5'), 5, 5) }), night);
  info.stage = { x: -3, z: 2 };
  const bed = new THREE.Group(); bed.position.set(5, 0, -6); p.add(bed);
  box(bed, 7, 2.6, 12, '#cfd8dc'); box(bed, 6.8, 1, 11.6, '#ffffff', 0, 2.6, 0); box(bed, 6.9, 0.5, 7.5, '#80cbc4', 0, 3.5, 2); box(bed, 7.2, 4.6, 0.5, '#90a4ae', 0, 0, -6.1);
  info.beds.push({ x: 5, z: -6.8, y: 3.8, ry: 0 });
  const mon = new THREE.Group(); mon.position.set(11, 0, -10); p.add(mon);
  cyl(mon, 0.2, 0.2, 7, '#90a4ae', 0, 0, 0); box(mon, 3, 2.4, 1, '#263238', 0, 7, 0);
  box(mon, 2.6, 2, 0.1, M('#000', { emissive: '#0b2', ei: 0.6 }), 0, 7.2, 0.52, { cast: false });
  for (let x = -14; x < 0; x += 1.3) box(p, 1.2, 10, 0.2, '#7fb3d5', x, 1.5, -4 + Math.sin(x) * 0.4, { cast: false });
  wallWindow(p, 6, 7.5, -13.7, 6, 4, night);
  box(p, 3, 4, 3, '#b0bec5', -10, 0, -10);
  return info;
}

export const ENVIRONMENTS = {
  street, city, house_ext: houseExt, school_ext: schoolExt, park, forest, beach,
  living_room: livingRoom, bedroom, kitchen, classroom, hallway, store, hospital,
};
export { car, tree, bush, lamp, windowMat, ground };
