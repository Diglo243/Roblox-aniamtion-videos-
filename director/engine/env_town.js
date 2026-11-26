// Stylised colourful town (cobblestones, tall gabled houses, town hall), shadow walls,
// green hills, cave, cross-section of the town above the void, collapse, construction.
import * as THREE from 'three';
import { M, box, cyl, sphere, plane, canvasTex, textTex, repeatTex, rng, shade, clamp, smooth } from './core.js';
import { car, tree, ground } from './environments.js';

export const TOWN_COLORS = ['#2f5fd0', '#e8459a', '#e03a3a', '#18b5a5', '#8a4fd8', '#f2a42c', '#3fbf5f', '#5ab4f0', '#ff7a59', '#c43fae', '#f7d23e', '#4a6cf7'];
const LIME = '#57d11a';

const cobbleTex = () => canvasTex('cobble', 256, 256, (g, w, h) => {
  const r = rng('cobble'); g.fillStyle = '#9c9a95'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 8; y++) for (let x = -1; x < 9; x++) {
    const off = (y % 2) * 16; const c = 200 + Math.floor(r() * 26);
    g.fillStyle = `rgb(${c},${c - 3},${c - 10})`; g.fillRect(x * 32 + off + 2, y * 32 + 2, 28, 28);
  }
});
const paveTex = () => canvasTex('pave', 256, 256, (g, w, h) => {
  g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b8b4aa'; g.lineWidth = 3;
  const r = rng('pave');
  for (let y = 0; y < 4; y++) { g.beginPath(); g.moveTo(0, y * 64); g.lineTo(w, y * 64 + r.range(-6, 6)); g.stroke(); for (let x = 0; x < 3; x++) { const xx = r.range(20, 240); g.beginPath(); g.moveTo(xx, y * 64); g.lineTo(xx + r.range(-10, 10), y * 64 + 64); g.stroke(); } }
});
const limeTex = () => canvasTex('lime', 128, 128, (g, w, h) => { const r = rng('lime'); g.fillStyle = LIME; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,80,0,0.08)' : 'rgba(255,255,150,0.08)'; g.fillRect(r() * w, r() * h, 3, 3); } });

// ---------------------------------------------------------- buildings ----
export function gabled(p, x, z, ry, r, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  const w = o.w || r.pick([9, 10, 11]), d = o.d || 12, h = o.h || r.pick([15, 18, 21, 24]);
  const col = o.color || r.pick(TOWN_COLORS);
  box(g, w, h, d, col, 0, 0, 0, { rough: 0.7 });
  // stepped / pointed gable on the front
  const style = o.gable || r.pick(['step', 'point', 'bell', 'step']);
  const tc = shade(col, 0.08);
  if (style === 'step') { for (let i = 0; i < 4; i++) box(g, w - i * 2.3, 1.6, 1.0, tc, 0, h + i * 1.6, d / 2 - 0.5); box(g, w - 1, 5, d - 1.2, shade(col, -0.25), 0, h, -0.6, {}); }
  else if (style === 'point') {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(0, 6); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }), M(shade(col, -0.22))); m.position.set(0, h, -d / 2); m.castShadow = true; m.receiveShadow = true; g.add(m);
    box(g, w + 0.4, 0.5, 0.6, '#ffffff', 0, h - 0.2, d / 2);
  } else { box(g, w - 2, 3, 1, tc, 0, h, d / 2 - 0.5, { round: 0.8 }); box(g, w - 4.5, 2.2, 1, tc, 0, h + 2.6, d / 2 - 0.5, { round: 0.8 }); box(g, w - 1, 4, d - 1.2, shade(col, -0.25), 0, h, -0.6); }
  // windows grid
  const wm = o.night ? M('#ffd98a', { emissive: '#ffcf6b', ei: 0.8 }) : M('#cfe9ff', { rough: 0.2, emissive: '#9fd0ff', ei: 0.15 });
  const cols = w >= 10 ? 3 : 2;
  for (let fy = 7; fy < h - 2; fy += 4.6) for (let c = 0; c < cols; c++) {
    const wx = (c - (cols - 1) / 2) * (w / cols);
    box(g, 2.2, 3.0, 0.3, '#ffffff', wx, fy - 0.2, d / 2, { cast: false });
    box(g, 1.7, 2.5, 0.35, wm, wx, fy, d / 2 + 0.02, { cast: false });
  }
  // ground floor: door + shop window
  box(g, 2.6, 5, 0.4, r.pick(['#ffffff', '#5d4037', '#1e3a8a']), -w / 2 + 2.2, 0, d / 2);
  box(g, w - 5.5, 3.4, 0.35, wm, 1.4, 1.2, d / 2 + 0.02, { cast: false });
  box(g, w - 5, 0.4, 0.6, '#ffffff', 1.4, 4.7, d / 2 + 0.1);
  if (o.sign) box(g, w - 2, 1.4, 0.3, M('#ffffff', { map: textTex(o.sign, { bg: '#ffffff', color: shade(col, -0.2), size: 120, w: 800, h: 160 }) }), 0, 5.4, d / 2 + 0.2, { cast: false });
  box(g, w + 0.3, 0.6, d + 0.3, '#ffffff', 0, h - 0.6, 0, { cast: false });
  return g;
}

export function townHall(p, x, z, ry = 0, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  box(g, 40, 18, 18, '#f3f1ea'); box(g, 42, 1.4, 20, '#e2ded2', 0, 18, 0);
  for (let s = 0; s < 4; s++) box(g, 24 - s, 0.7, 6 - s * 1.2, '#dcd8cc', 0, s * 0.7, 11 + s * 0.6, { cast: false });
  for (let i = 0; i < 6; i++) cyl(g, 0.9, 1.0, 14, '#ffffff', -10 + i * 4, 2.8, 12.5, { seg: 14 });
  box(g, 26, 1.6, 4.5, '#efebe0', 0, 16.6, 12.5);
  const sh = new THREE.Shape(); sh.moveTo(-13, 0); sh.lineTo(0, 5); sh.lineTo(13, 0); sh.lineTo(-13, 0);
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 4.5, bevelEnabled: false }), M('#f6f4ee')); ped.position.set(0, 18.2, 10.3); ped.castShadow = true; g.add(ped);
  box(g, 14, 2, 0.3, M('#ffffff', { map: textTex(o.label || 'MAIRIE', { bg: '#f6f4ee', color: '#7a6a4a', size: 150, w: 900, h: 140 }) }), 0, 14.2, 9.2, { cast: false });
  box(g, 5, 9, 0.4, '#6d4c41', 0, 2.8, 9.1);
  // clock tower
  box(g, 9, 12, 9, '#f3f1ea', 0, 19.4, 0); box(g, 10, 1, 10, '#e2ded2', 0, 31.4, 0);
  const clock = canvasTex('clockface', 128, 128, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.lineWidth = 7; c.strokeStyle = '#c9a227'; c.stroke(); c.strokeStyle = '#222'; c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 24); c.moveTo(64, 64); c.lineTo(94, 70); c.stroke(); });
  box(g, 6, 6, 0.3, M('#ffffff', { map: clock }), 0, 23.5, 4.6, { cast: false });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 7, 4), M('#2f5fd0')); roof.position.set(0, 35.9, 0); roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  for (const fx of [-15, 15]) for (const fy of [4, 11]) { box(g, 4, 4.4, 0.3, '#ffffff', fx, fy, 9.05, { cast: false }); box(g, 3.2, 3.6, 0.35, M('#cfe9ff', { emissive: '#9fd0ff', ei: 0.15 }), fx, fy + 0.4, 9.1, { cast: false }); }
  return g;
}

function planter(p, x, z, r) { box(p, 4, 1.6, 4, '#e7e2d6', x, 0, z); tree(p, x, z, r, 0.8, 'round'); }
function ballBush(p, x, z, r, s = 1) { sphere(p, 1.4 * s, r.pick(['#46c21b', '#3fb51a', '#5bd12a']), x, 1.0 * s, z, { seg: 10 }); }
function colorBall(p, x, z, r) { sphere(p, 0.42, r.pick(['#ff3b6b', '#ffd23f', '#b26bff', '#ff8c42', '#ffffff']), x, 0.45, z, { seg: 8 }); }

export function kiosk(p, x, z, ry = 0, label = 'LOTO') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  box(g, 7, 4, 4, '#c62828'); box(g, 7.2, 0.4, 4.2, '#ffffff', 0, 4, 0); box(g, 0.5, 4, 0.5, '#ffffff', -3.3, 4.4, 1.8); box(g, 0.5, 4, 0.5, '#ffffff', 3.3, 4.4, 1.8);
  box(g, 8, 0.8, 5.2, '#1e3a8a', 0, 8.4, 0.3);
  box(g, 7, 1.8, 0.3, M('#ffffff', { map: textTex(label, { bg: '#1e3a8a', color: '#ffd23f', size: 150, w: 800, h: 200 }) }), 0, 9.2, 2.95, { cast: false });
  box(g, 5, 0.3, 1.2, '#ffffff', 0, 3.6, 2.4);
  return g;
}

// ------------------------------------------------------------- scenes ----
function townPlaza(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 6 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 48, 34] };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) }));
  plane(p, 150, 150, M('#ffffff', { map: repeatTex(cobbleTex(), 30, 30) }), 0, 0.02, -10, { rx: -Math.PI / 2 });
  townHall(p, 0, -48, 0, { label: o.hallLabel || 'MAIRIE' });
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) gabled(p, sx * (30 + (i % 2) * 0.5), 20 - i * 11.5, -sx * Math.PI / 2, r, { night, w: 11 });
    for (let i = 0; i < 4; i++) gabled(p, sx * (27 + i * 11), -52, 0, r, { night, w: 11 });
  }
  for (let i = 0; i < 8; i++) gabled(p, -38 + i * 11, 58, Math.PI, r, { night, w: 11 });
  planter(p, -14, -18, r); planter(p, 14, -18, r); planter(p, -14, 14, r); planter(p, 14, 14, r);
  // central round fountain / bandstand
  cyl(p, 6, 6.4, 1.2, '#e7e2d6', 0, 0, -20, { seg: 24 }); cyl(p, 5.3, 5.3, 0.2, M('#58c2f0', { rough: 0.1 }), 0, 1.0, -20, { seg: 24 }); cyl(p, 0.6, 0.8, 4, '#e7e2d6', 0, 1, -20);
  plane(p, 3, 150, M('#f2c84b'), 0, 0.03, -10, { rx: -Math.PI / 2 });
  for (const [lx, lz] of [[-9, 0], [9, 0], [-9, -30], [9, -30]]) { cyl(p, 0.2, 0.25, 9, '#2b2b2b', lx, 0, lz, { seg: 8 }); sphere(p, 0.7, M('#fff4c2', { emissive: '#ffe9a0', ei: night ? 1.5 : 0.2 }), lx, 9.4, lz); if (night) info.lampPoints.push([lx, 9.4, lz]); }
  if (o.kiosk) kiosk(p, ...(o.kiosk.pos || [10, -6]), o.kiosk.ry ?? -0.4);
  return info;
}

function shadowWall(p, r, night, o = {}) {
  // long white wall on the left (x = -7) receiving the actors' shadows; sun from the right, low.
  const info = { stage: { x: -2.4, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], sun: o.sun || [1, 0.5, 0.42], shadowSize: 22, shadowFocus: [-5, -2] };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) }));
  plane(p, 22, 300, M('#ffffff', { map: repeatTex(paveTex(), 4, 50) }), 4, 0.02, -60, { rx: -Math.PI / 2 });
  const wc = o.wallColor || '#f4f1ea';
  box(p, 2, 16, 300, wc, -8, 0, -60, { rough: 0.9 });
  box(p, 2.6, 1.0, 300, o.trim || r.pick(['#ff7a1a', '#a64fd8', '#2f9be8', '#ff4f8b']), -8, 16, -60);
  plane(p, 3.2, 300, M(LIME), -5.4, 0.04, -60, { rx: -Math.PI / 2 });
  for (let z = 30; z > -150; z -= r.range(5, 11)) { ballBush(p, -5.6, z, r, r.range(0.7, 1.1)); if (r() < 0.7) colorBall(p, -4.6 + r.range(-0.6, 0.6), z + r.range(-2, 2), r); }
  // town roofs peeking over the wall & across the street
  for (let z = 20; z > -160; z -= 12) gabled(p, -20, z, Math.PI / 2, r, { night, w: 11, h: r.pick([22, 26, 30]) });
  return info;
}

function townStreet(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 50, 20] };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) }));
  plane(p, 16, 600, M('#55575c'), 0, 0.02, -150, { rx: -Math.PI / 2 });
  for (let z = 60; z > -400; z -= 10) box(p, 0.5, 0.05, 4.5, '#ffffff', 0, 0.03, z, { cast: false });
  for (const sx of [-1, 1]) {
    plane(p, 7, 600, M('#ffffff', { map: repeatTex(paveTex(), 1, 80) }), sx * 11.5, 0.15, -150, { rx: -Math.PI / 2 });
    box(p, 0.5, 0.35, 600, '#bdbdbd', sx * 8.1, 0, -150, { cast: false });
    for (let z = 50, i = 0; z > -330; z -= 11, i++) gabled(p, sx * 21, z, -sx * Math.PI / 2, r, { night, w: 11, sign: i % 4 === 1 ? r.pick(['BOULANGERIE', 'CAFÉ', 'FLEURS', 'LIBRAIRIE']) : null });
    for (let z = 40; z > -330; z -= 22) { tree(p, sx * 13.5, z, r, 0.65, 'round'); cyl(p, 0.18, 0.22, 9, '#2b2b2b', sx * 9.3, 0, z - 11, { seg: 8 }); sphere(p, 0.6, M('#fff4c2', { emissive: '#ffe9a0', ei: 0.3 }), sx * 9.3, 9.3, z - 11); }
  }
  townHall(p, 0, -340, 0);
  return info;
}

function bigHill(p, x, z, sx, sy, sz, col = LIME) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), M(col, { rough: 0.95 }));
  m.scale.set(sx, sy, sz); m.position.set(x, 0, z); m.receiveShadow = true; m.castShadow = false; p.add(m); return m;
}

export function miniTown(p, r, night, o = {}) {
  // compact cluster of colourful houses used as "the town" seen from the hills / cross-section
  const g = new THREE.Group(); p.add(g); g.position.set(...(o.pos || [0, 0, 0]));
  const houses = [];
  const n = o.n || 46;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (o.radius || 34);
    const hx = Math.cos(a) * d, hz = Math.sin(a) * d * 0.6;
    const hg = gabled(g, hx, hz, r.pick([0, Math.PI / 2, -Math.PI / 2, Math.PI]), r, { night, w: r.pick([9, 10, 11]), h: r.pick([12, 15, 18, 21]) });
    hg.userData.base = hg.position.clone(); hg.userData.delay = r() * 0.5; hg.userData.tilt = r.range(-0.5, 0.5);
    houses.push(hg);
  }
  if (o.hall !== false) { const th = townHall(g, 0, -4, 0); th.scale.setScalar(0.7); th.userData.base = th.position.clone(); th.userData.delay = 0.3; th.userData.tilt = 0.2; houses.push(th); }
  g.userData.houses = houses;
  return g;
}

function hills(p, r, night, o = {}) {
  // the actors stand on a flat mountain-top plateau (y = 0); the valley with the town is 30 units below.
  const V = -80;
  const info = { stage: { x: 0, z: 8 }, interior: false, seats: [], beds: [], lampPoints: [], sun: o.sun || [30, 50, 30], fogNear: 260, fogFar: 1200, shadowSize: 60 };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) })).position.y = V;
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(52, 150, -V, 32), M(LIME, { rough: 0.95 })); plat.position.set(0, V / 2, 46); plat.receiveShadow = true; p.add(plat);
  
  for (let i = 0; i < 14; i++) bigHill(p, r.range(-500, 500), r.range(-700, -320), r.range(70, 150), r.range(20, 60), r.range(40, 90), r.pick([LIME, '#4cc214', '#63d82a'])).position.y = V;
  const mtn = new THREE.Mesh(new THREE.ConeGeometry(120, 170, 7), M('#8d8a84', { rough: 1 })); mtn.position.set(-300, V + 85, -620); p.add(mtn);
  const snow = new THREE.Mesh(new THREE.ConeGeometry(40, 56, 7), M('#ffffff')); snow.position.set(-300, V + 142, -620); p.add(snow);
  plane(p, 6, 60, M('#c9a46a'), 6, 0.05, 36, { rx: -Math.PI / 2 });
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r.range(16, 44); const x = Math.cos(a) * d, z = 46 + Math.sin(a) * d; if (Math.abs(x) > 14 || z > 40) tree(p, x, z, r, r.range(0.7, 1.1), 'round'); }
  for (let i = 0; i < 12; i++) sphere(p, r.range(0.6, 1.6), '#b9b2a4', r.range(-30, 30), 0.2, r.range(4, 60), { seg: 6 });
  if (o.town) {
    const tg = new THREE.Group(); tg.position.set(...(o.townPos || [0, V, -150])); p.add(tg);
    plane(tg, 130, 90, M('#ffffff', { map: repeatTex(cobbleTex(), 20, 14) }), 0, 0.3, 0, { rx: -Math.PI / 2 });
    const town = miniTown(tg, rng('minitown'), night, { radius: 50 });
    info.town = town; info.townGroup = tg;
    if (o.cracks) {
      for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2 + r() * 0.2; const R = r.range(62, 70); box(tg, r.range(5, 10), 0.1, 1.4, '#141414', Math.cos(a) * R, 0.35, Math.sin(a) * R * 0.72, { cast: false, ry: -a + r.range(-0.4, 0.4) }); }
    }
    const hole = box(tg, 128, 0.5, 88, '#1b120b', 0, 0.1, 0, { cast: false }); hole.visible = !!o.hole; info.hole = hole;
    const dust = []; const dr = rng('dust');
    for (let i = 0; i < 36; i++) { const d = sphere(tg, 1, M('#d9d4cc', { rough: 1 }), dr.range(-55, 55), dr.range(2, 10), dr.range(-35, 35), { seg: 8, cast: false }); d.userData.ph = dr(); d.visible = false; dust.push(d); }
    info.dust = dust;
  }
  if (o.cracksNear) {
    for (let i = 0; i < 14; i++) box(p, r.range(3, 10), 0.06, r.range(0.5, 1.4), '#111', r.range(-14, 14), 0.06, r.range(-30, -4), { cast: false, ry: r.range(-0.6, 0.6) });
  }
  info.update = (t, u, spec) => {
    const s = spec.envOpts?.sink; if (!s || !info.town) return;
    const k = clamp((u - (s.start ?? 0)) / ((s.end ?? 1) - (s.start ?? 0)), 0, 1);
    const amount = (s.from ?? 0) + ((s.to ?? 1) - (s.from ?? 0)) * k;
    if (info.hole) info.hole.visible = amount > 0.15 || !!spec.envOpts?.hole;
    if (info.dust) info.dust.forEach(d => { const a = clamp(amount * 1.4 - d.userData.ph * 0.3, 0, 1); const v = Math.sin(a * Math.PI); d.visible = v > 0.02; d.scale.setScalar(2 + v * 9 * (0.6 + d.userData.ph)); d.position.y = 4 + a * 14; });
    for (const h of info.town.userData.houses) {
      const kk = clamp((amount - h.userData.delay * 0.5) / 0.6, 0, 1);
      h.position.y = h.userData.base.y - kk * kk * 40 + Math.sin(t * 40 + h.userData.delay * 10) * 0.25 * (kk > 0 && kk < 1 ? 1 : 0);
      h.rotation.z = h.userData.tilt * kk; h.rotation.x = h.userData.tilt * 0.6 * kk;
    }
  };
  return info;
}

function caveEntrance(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 6 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [25, 45, 30] };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) }));
  const rock = (x, y, z, sx, sy, sz, col = '#a39a8c') => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), M(col, { rough: 1 })); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  rock(0, 16, -18, 26, 20, 16); rock(-20, 8, -14, 14, 12, 12); rock(20, 8, -14, 14, 12, 12);
  rock(0, 15.5, -4, 20, 5, 10, '#b3aa9b');
  rock(-8, 5, -2, 3.6, 8, 4); rock(8, 5, -2, 3.6, 8, 4);
  box(p, 11, 12, 2, '#0b0b0d', 0, 0, -6.2, { cast: false });
  for (let i = 0; i < 12; i++) rock(r.range(-26, 26), 0.6, r.range(-6, 14), r.range(0.8, 2.4), r.range(0.8, 2), r.range(0.8, 2.4), '#b9b0a1');
  for (let i = 0; i < 14; i++) sphere(p, 0.35, r.pick(['#ffe14d', '#c77dff', '#ff6b9a']), r.range(-14, 14), 0.35, r.range(2, 24), { seg: 6 });
  plane(p, 5, 60, M('#d7b98a'), 9, 0.05, 20, { rx: -Math.PI / 2 });
  return info;
}

function stalactite(p, x, y, z, h, rad, col, down = true) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), M(col, { rough: 1 }));
  m.position.set(x, down ? y - h / 2 : y + h / 2, z); if (down) m.rotation.x = Math.PI; m.castShadow = true; p.add(m); return m;
}

function cave(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: true, seats: [], beds: [], lampPoints: [], background: '#1a120c', fogColor: '#6b4f33', fogNear: 30, fogFar: 260, sun: [10, 60, 20], sunIntensity: 1.2, hemi: 1.1, shadowSize: 60,
    extraLights: [{ color: '#ffd9a0', intensity: 900, pos: [0, 30, -40], dist: 160 }, { color: '#ffb36b', intensity: 400, pos: [10, 8, 10], dist: 50 }],
    bounds: { minX: -200, maxX: 200, minZ: -300, maxZ: 200, maxY: 120 } };
  const sand = '#d8bf96', rockc = '#c7a77a';
  plane(p, 800, 800, M(sand, { rough: 1 }), 0, 0, 0, { rx: -Math.PI / 2 });
  plane(p, 800, 800, M('#3b2a1c', { side: THREE.DoubleSide }), 0, 90, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 90; i++) { const x = r.range(-150, 150), z = r.range(-260, 40); stalactite(p, x, 90, z, r.range(14, 50), r.range(2, 6), rockc); }
  for (let i = 0; i < 40; i++) { const x = r.range(-120, 120), z = r.range(-220, 0); if (Math.abs(x) < 8 && z > -30) continue; stalactite(p, x, 0, z, r.range(6, 28), r.range(2, 5), rockc, false); }
  for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), M('#b8996c')); m.scale.setScalar(r.range(0.8, 3)); m.position.set(r.range(-40, 40), 0.5, r.range(-80, 20)); m.castShadow = true; p.add(m); }
  // glowing crystals / dust motes
  for (let i = 0; i < 18; i++) box(p, 0.5, 1.6, 0.5, M('#ffe9b0', { emissive: '#ffd27a', ei: 1.2 }), r.range(-30, 30), 0, r.range(-60, 10), { cast: false, ry: r() * 3 });
  return info;
}

function crossSection(p, r, night, o = {}) {
  // cut-away diorama: town on a thin rock slab above a huge dark void.
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [20, 60, 40], fogNear: 300, fogFar: 1400, shadowSize: 80 };
  const W = 84, D = 60, slabY = 0, voidH = 64;
  const dirt = M('#b8732e', { rough: 1 }), dirt2 = M('#9b5d24', { rough: 1 }), dark = M('#1b120b', { rough: 1 });
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) })).position.y = -0.2;
  // remove the ground in front so the section is visible: big front block below ground is drawn by the section boxes
  const sec = new THREE.Group(); sec.position.set(0, 0, 0); p.add(sec);
  box(sec, W, voidH + 14, 4, dirt, 0, -voidH - 14, -D / 2 - 2);            // back wall of the void
  box(sec, 6, voidH + 14, D, dirt, -W / 2 - 3, -voidH - 14, 0);             // left wall
  box(sec, 6, voidH + 14, D, dirt, W / 2 + 3, -voidH - 14, 0);              // right wall
  box(sec, W + 12, 10, D, dirt2, 0, -voidH - 24, 0);                        // floor
  box(sec, W - 2, 2, D - 2, M('#2a1a10'), 0, -voidH - 3, 0, { cast: false });  // dark floor of the void
  box(sec, W, voidH, 1, M('#24170d'), 0, -voidH - 3, -D / 2 + 0.6, { cast: false }); // dark back of the void
  // front face edges (thick frame like a diorama)
  box(sec, W + 12, 3, 2, dirt2, 0, -voidH - 15, D / 2);
  const slab = new THREE.Group(); sec.add(slab);
  box(slab, W, 3, D, '#a67c52', 0, -3, 0); box(slab, W, 0.6, D, '#c9c4b8', 0, 0, 0, { cast: false });
  const sparks = []; for (let i = 0; i < 70; i++) { const s = box(sec, 0.25, 0.25, 0.25, M('#fff6d0', { emissive: '#fff2c0', ei: 1.5 }), r.range(-W / 2 + 4, W / 2 - 4), r.range(-voidH, -5), r.range(-D / 2 + 3, D / 2 - 6), { cast: false }); sparks.push(s); }
  for (let i = 0; i < 40; i++) stalactite(sec, r.range(-W / 2 + 4, W / 2 - 4), -3, r.range(-D / 2 + 4, D / 2 - 4), r.range(3, 9), r.range(0.6, 1.4), '#8a5a2b');
  for (let i = 0; i < 14; i++) stalactite(sec, r.range(-W / 2 + 6, W / 2 - 6), -voidH - 2, r.range(-D / 2 + 6, D / 2 - 6), r.range(5, 16), r.range(1.2, 2.6), '#7a4b22', false);
  const town = miniTown(slab, rng('minitown'), night, { radius: 34, n: 30 });
  // crack lines on the front edge of the slab
  const cracks = []; for (let i = 0; i < 8; i++) { const c = box(sec, 0.35, 3.2, 0.3, '#120a05', -W / 2 + 10 + i * (W - 20) / 7 + r.range(-4, 4), -3.1, D / 2 + 0.05, { cast: false, rz: r.range(-0.5, 0.5) }); c.visible = false; cracks.push(c); }
  // falling pebbles
  const pebbles = []; for (let i = 0; i < 26; i++) { const pb = box(sec, 0.7, 0.7, 0.7, '#7a4b22', r.range(-W / 2 + 6, W / 2 - 6), -4, r.range(-D / 2 + 6, D / 2 - 6), { cast: false }); pb.userData.ph = r(); pebbles.push(pb); }
  info.stage = { x: 0, z: 0 };
  info.update = (t, u, spec) => {
    const crack = spec.envOpts?.crack ?? 0.5;
    cracks.forEach((c, i) => { c.visible = i / cracks.length < crack + u * 0.3; });
    pebbles.forEach(pb => { const k = (t * 0.6 + pb.userData.ph) % 1; pb.position.y = -4 - k * (voidH - 6); });
    sparks.forEach((s, i) => { s.scale.setScalar(0.6 + 0.5 * Math.sin(t * 3 + i)); });
    const sh = spec.envOpts?.quake ? Math.sin(t * 45) * 0.15 : 0; slab.position.x = sh;
    const s = spec.envOpts?.sink; if (s) { const kk = clamp((u - (s.start ?? 0)) / ((s.end ?? 1) - (s.start ?? 0)), 0, 1); slab.position.y = -kk * kk * voidH; }
  };
  return info;
}

function construction(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 4 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 50, 26] };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) }));
  plane(p, 120, 90, M('#c99b5f'), 0, 0.03, -20, { rx: -Math.PI / 2 });
  const Y = '#f2b705';
  const crane = (x, z, h, arm, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); for (let y = 0; y < h; y += 4) { box(g, 1.6, 4, 0.3, Y, 0, y, 0.8, { cast: true }); box(g, 1.6, 4, 0.3, Y, 0, y, -0.8); box(g, 0.3, 4, 1.6, Y, 0.8, y, 0); box(g, 0.3, 4, 1.6, Y, -0.8, y, 0); } box(g, arm, 1.2, 1.2, Y, arm / 2 - 6, h, 0); box(g, 3, 3, 3, '#333', -5, h - 3, 0); cyl(g, 0.06, 0.06, h * 0.6, '#222', arm - 9, h * 0.4, 0); box(g, 2.5, 0.8, 2.5, '#c62828', arm - 9, h * 0.4 - 0.8, 0); return g; };
  crane(-26, -34, 40, 34, 0.4); crane(30, -40, 46, 38, 2.6);
  // houses under construction: frames + half walls
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); g.position.set(-36 + i * 18, 0, -24 + (i % 2) * 6); p.add(g);
    const prog = [0.3, 0.6, 1, 0.45, 0.8][i]; const col = TOWN_COLORS[(i * 3) % TOWN_COLORS.length];
    for (const [fx, fz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) box(g, 0.6, 14, 0.6, '#d9a066', fx, 0, fz);
    box(g, 11, 0.5, 11, '#d9a066', 0, 7, 0); box(g, 11, 0.5, 11, '#d9a066', 0, 14, 0);
    box(g, 10.4, 14 * prog, 10.4, col, 0, 0, 0);
    box(g, 0.4, 14, 11, '#9e9e9e', 5.8, 0, 0, { cast: false, rz: 0 });
  }
  for (let i = 0; i < 8; i++) { const g = new THREE.Group(); g.position.set(r.range(-30, 30), 0, r.range(-6, 16)); p.add(g); for (let k = 0; k < 6; k++) box(g, 1.6, 0.8, 0.8, '#b5523b', (k % 3) * 1.7 - 1.7, Math.floor(k / 3) * 0.8, 0); }
  for (let i = 0; i < 6; i++) { box(p, 0.4, 1.4, 0.4, '#ff6d00', r.range(-24, 24), 0, r.range(4, 18)); }
  return info;
}

function schoolNew(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 12 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 50, 34] };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) }));
  plane(p, 140, 60, M('#ffffff', { map: repeatTex(paveTex(), 14, 6) }), 0, 0.03, 12, { rx: -Math.PI / 2 });
  const g = new THREE.Group(); g.position.set(0, 0, -20); p.add(g);
  const big = o.big ? 1.25 : 1;
  box(g, 90 * big, 30 * big, 20, '#f6f6f4');
  for (let fy = 4; fy < 30 * big - 3; fy += 7) for (let fx = -40 * big; fx <= 40 * big; fx += 7) { if (Math.abs(fx) < 6 && fy < 10) continue; box(g, 4.4, 4.6, 0.3, '#5b7fd8', fx, fy, 10, { cast: false }); box(g, 3.8, 4.0, 0.35, M('#cfe9ff', { emissive: '#9fd0ff', ei: 0.15 }), fx, fy + 0.3, 10.05, { cast: false }); }
  box(g, 9, 9, 0.5, '#2f5fd0', 0, 0, 10.1); box(g, 92 * big, 1.2, 21, '#e6e6e2', 0, 30 * big, 0);
  box(g, 28, 3, 0.4, M('#ffffff', { map: textTex(o.label || 'ÉCOLE', { bg: '#ffffff', color: '#2f5fd0', size: 170, w: 1000, h: 170 }) }), 0, 30 * big - 4.5, 10.2, { cast: false });
  const roofPeak = new THREE.Mesh(new THREE.ConeGeometry(4, 4, 4), M('#e03a3a')); roofPeak.position.set(0, 30 * big + 3.2, 0); roofPeak.rotation.y = Math.PI / 4; g.add(roofPeak);
  if (o.ribbon) { box(p, 30, 0.6, 0.3, '#e03a3a', 0, 4.2, 4); for (const x of [-15, 15]) box(p, 0.6, 6, 0.6, '#f2b705', x, 0, 4); }
  for (let i = 0; i < 6; i++) tree(p, -60 + i * 24, 30 + (i % 2) * 6, r, 0.8, 'round');
  return info;
}

export const TOWN_ENVIRONMENTS = {
  town_plaza: townPlaza, shadow_wall: shadowWall, town_street: townStreet, hills,
  cave_entrance: caveEntrance, cave, cross_section: crossSection, construction, school_new: schoolNew,
};
