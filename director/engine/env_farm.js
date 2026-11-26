// Haystack town: giant golden haystack, straw-covered ground, cow's hay shop, cow bank,
// tool shop, dynamite crater, red barn, Christmas corner, golden pond, festival plaza.
import * as THREE from 'three';
import { M, box, cyl, sphere, plane, canvasTex, textTex, repeatTex, rng, shade, clamp } from './core.js';
import { car, tree, ground } from './environments.js';
import { gabled, townHall, TOWN_COLORS } from './env_town.js';

const GOLD = '#e0a92e';
export const hayTex = () => canvasTex('hay', 512, 512, (g, w, h) => {
  const r = rng('hay'); g.fillStyle = '#d99a2b'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = r() * w, y = r() * h, a = r.range(-1.2, 1.2) + (r() < 0.5 ? 0 : Math.PI / 2), l = r.range(12, 40);
    const c = r(); g.strokeStyle = c < 0.33 ? '#f3c75a' : c < 0.66 ? '#c98a22' : '#ffd977'; g.lineWidth = r.range(1.5, 3.5);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
});
const dirtTex = () => canvasTex('hdirt', 256, 256, (g, w, h) => { const r = rng('hd'); g.fillStyle = '#e8cf9a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(160,110,40,0.12)' : 'rgba(255,240,200,0.15)'; g.fillRect(r() * w, r() * h, 3, 3); } });
const limeTex = () => canvasTex('lime2', 128, 128, (g, w, h) => { const r = rng('lime2'); g.fillStyle = '#5fd11f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,80,0,0.08)' : 'rgba(255,255,150,0.08)'; g.fillRect(r() * w, r() * h, 3, 3); } });
const hayMat = () => M('#ffffff', { map: repeatTex(hayTex(), 8, 6), rough: 0.95 });

// scattered loose straws (instanced thin boxes)
export function looseStraw(p, n, area, r, o = {}) {
  const geo = new THREE.BoxGeometry(0.09, 0.09, 1);
  const mat = new THREE.MeshStandardMaterial({ color: '#f0c25a', roughness: 0.8 });
  const im = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
  const [x0, z0, x1, z1] = area;
  for (let i = 0; i < n; i++) {
    e.set(r.range(-0.4, 0.4) + (o.stand ? r.range(-1.3, 1.3) : 0), r() * Math.PI * 2, r.range(-0.3, 0.3));
    q.setFromEuler(e); const L = r.range(o.minL || 0.8, o.maxL || 2.4); s.set(1, 1, L);
    v.set(r.range(x0, x1), (o.y || 0) + r.range(0.02, o.h || 0.15), r.range(z0, z1));
    m4.compose(v, q, s); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(r.pick(['#f3c75a', '#e0a92e', '#ffd977', '#c98a22'])));
  }
  im.castShadow = !!o.cast; im.receiveShadow = true; p.add(im); return im;
}

export function haystack(p, x, z, R, H, r, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  const geo = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  // bumpy profile
  const pos = geo.attributes.position; const br = rng('bump' + R);
  for (let i = 0; i < pos.count; i++) { const k = 1 + (br() - 0.5) * 0.05; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * (1 + (br() - 0.5) * 0.03), pos.getZ(i) * k); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M('#ffffff', { map: repeatTex(hayTex(), Math.max(2, R / 6), Math.max(2, H / 8)), rough: 0.95 }));
  m.scale.set(R, H, R * (o.depth || 1)); m.castShadow = true; m.receiveShadow = true; g.add(m);
  // skirt of loose straw around the base
  if (R > 3) looseStraw(g, Math.min(2500, Math.floor(R * 22)), [-R * 1.15, -R * 1.15, R * 1.15, R * 1.15], r, { maxL: 3, stand: true, h: 0.6 });
  if (o.ladder) { const l = new THREE.Group(); l.position.set(-R * 0.7, 0, R * 0.7); l.rotation.y = -0.8; g.add(l); for (const sx of [-1, 1]) box(l, 0.4, 30, 0.4, '#8d5a34', sx * 1.4, 0, 0, { rx: -0.35 }); for (let i = 0; i < 12; i++) box(l, 3, 0.3, 0.3, '#8d5a34', 0, i * 2.4, -i * 0.86); }
  if (o.climbers) for (let i = 0; i < o.climbers; i++) { const a = br() * Math.PI * 1.2 - 0.6 + Math.PI / 2; const hh = br.range(0.2, 0.9); const rr = Math.sqrt(1 - hh * hh); box(g, 1.2, 2.4, 1.2, br.pick(TOWN_COLORS), Math.cos(a) * rr * R, hh * H, Math.sin(a) * rr * R, { cast: false }); }
  return g;
}

function bale(p, x, z, r, ry = 0) { const b = cyl(p, 2.2, 2.2, 3.2, M('#ffffff', { map: repeatTex(hayTex(), 2, 1) }), x, 2.2, z, { rz: Math.PI / 2, seg: 18 }); b.rotation.y = ry; b.position.y = 2.2; return b; }

function base(p, r, o = {}) {
  ground(p, M('#ffffff', { map: repeatTex(o.grass ? limeTex() : dirtTex(), 100, 100) }));
  if (!o.grass) looseStraw(p, o.straws ?? 1600, [-40, -40, 40, 30], r, { maxL: 2.6 });
}

function smallTown(p, r, night, cx, cz, n, rad) {
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = rad * (0.5 + 0.5 * Math.sqrt(r()));
    const g = gabled(p, cx + Math.cos(a) * d, cz + Math.sin(a) * d * 0.5, -a + Math.PI / 2, r, { night, w: 9, h: r.pick([9, 11, 13]), gable: r.pick(['point', 'point', 'step']) });
  }
}

// --------------------------------------------------------------- scenes --
function hayTown(p, r, night, o = {}) {
  const s = o.hay ?? 1;  // 1 mountain, ~0.45 hill, ~0.15 heap, 0 = gone
  const info = { stage: { x: 0, z: 30 }, interior: false, seats: [], beds: [], lampPoints: [], sun: o.sun || [40, 55, 50], fogNear: 300, fogFar: 1400, shadowSize: 120 };
  base(p, r, { straws: 2500 });
  plane(p, 300, 140, M('#ffffff', { map: repeatTex(limeTex(), 20, 10) }), 0, 0.02, 110, { rx: -Math.PI / 2 });
  if (s > 0.01) haystack(p, 0, -40, 90 * Math.pow(s, 0.7), 150 * s, r, { ladder: s > 0.8, climbers: s > 0.8 ? 14 : 0 });
  smallTown(p, r, night, 0, 100, 34, 70);
  if (o.crowd !== false) {}
  for (let i = 0; i < 10; i++) tree(p, r.range(-120, 120), r.range(80, 160), r, 0.9, 'round');
  return info;
}

function hayBase(p, r, night, o = {}) {
  // at the foot of the haystack: a wall of hay behind the actors
  const info = { stage: { x: 0, z: 10 }, interior: false, seats: [], beds: [], lampPoints: [], sun: o.sun || [30, 60, 45], shadowSize: 40 };
  base(p, r, {});
  haystack(p, 0, o.hayZ ?? -70, 75, 140, r, {});
  for (let i = 0; i < 6; i++) { const bx = r.range(-20, 20); if (o.hayZ && Math.abs(bx) < 9) continue; bale(p, bx, r.range(-8, 4), r, r() * 3); }
  looseStraw(p, 900, [-16, -6, 16, 22], r, { maxL: 3.2, h: 0.4, cast: false });
  if (o.christmas) christmasCorner(p, r, -9, 0);
  if (o.hole) { box(p, 6, 7, 2, '#5a3d12', o.hole[0], 0, o.hole[1], { cast: false }); }
  return info;
}

function hayInside(p, r, night, o = {}) {
  // engulfed in straw: dense straws around and a golden glow
  const info = { stage: { x: 0, z: 0 }, interior: true, seats: [], beds: [], lampPoints: [], background: '#c98a22', fogColor: '#d99a2b', fogNear: 6, fogFar: 40, sun: [20, 60, 20], hemi: 1.3, sunIntensity: 1.6,
    bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30, maxY: 30 } };
  plane(p, 200, 200, hayMat(), 0, 0, 0, { rx: -Math.PI / 2 });
  looseStraw(p, o.sparse ? 900 : 3000, [-14, -14, 14, 14], r, { stand: true, h: 9, maxL: 4, cast: false });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const m = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8), hayMat()); m.position.set(Math.cos(a) * 18, 4, Math.sin(a) * 18); p.add(m); }
  return info;
}

export function stall(p, x, z, ry, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  box(g, 10, 3.6, 3, '#9b6a3c'); box(g, 10.4, 0.4, 3.4, '#7a4f2a', 0, 3.6, 0);
  if (o.counterSign) box(g, 6, 1.4, 0.2, M('#ffffff', { map: textTex(o.counterSign, { bg: '#fff6e0', color: '#c62828', size: 90, w: 900, h: 200, border: '#c62828' }) }), 0, 1.2, 1.62, { cast: false });
  for (const sx of [-4.8, 4.8]) box(g, 0.5, 7.5, 0.5, '#7a4f2a', sx, 0, -1.2);
  for (const sx of [-4.8, 4.8]) box(g, 0.5, 7.5, 0.5, '#7a4f2a', sx, 0, 1.2);
  const stripe = canvasTex('awning' + (o.c1 || '') + (o.c2 || ''), 256, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? (o.c1 || '#f2b705') : (o.c2 || '#ffffff'); c.fillRect(i * 32, 0, 32, 64); } });
  const aw = box(g, 11, 0.4, 4.6, M('#ffffff', { map: stripe }), 0, 7.4, 0.6); aw.rotation.x = 0.18;
  if (o.sign) box(g, 9, 1.8, 0.3, M('#ffffff', { map: textTex(o.sign, { bg: '#fff6e0', color: '#7a4f2a', size: 110, w: 1100, h: 220, border: '#7a4f2a' }) }), 0, 8.6, 1.6, { cast: false, rx: -0.1 });
  if (o.bunting) for (let i = 0; i < 9; i++) { const t = box(g, 0.8, 0.8, 0.05, ['#e53935', '#fdd835', '#1e88e5', '#43a047'][i % 4], -4.4 + i * 1.1, 6.4 - Math.sin(i / 8 * Math.PI) * 0.6, 2.9, { cast: false, rz: Math.PI / 4 }); }
  return g;
}

function hayShop(p, r, night, o = {}) {
  const info = hayBase(p, r, night, { ...o, hayZ: -88 });
  info.stage = { x: 0, z: 10 };
  stall(p, 0, 4, 0, { sign: 'LE FOIN DE LA VACHE', counterSign: '1 BRIN = 1 PIÈCE' });
  for (let i = 0; i < 6; i++) cyl(p, 0.5, 0.5, 0.2, M('#ffd54f', { metal: 0.6, rough: 0.3 }), 2 + i * 0.6, 3.8 + (i % 3) * 0.2, 4.2);
  looseStraw(p, 400, [-4, 2.5, 4, 5.5], r, { y: 3.8, maxL: 1.6 });
  info.cowSpot = [0, 1.6];
  return info;
}

function cowBank(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 10 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 55, 40] };
  base(p, r, { grass: true });
  const g = new THREE.Group(); g.position.set(0, 0, -14); p.add(g);
  box(g, 30, 16, 14, '#fbfaf5'); box(g, 32, 1.4, 16, '#e9e5da', 0, 16, 0);
  for (let i = 0; i < 6; i++) cyl(g, 0.9, 1.0, 13, '#ffffff', -10 + i * 4, 1.6, 8.5, { seg: 14 });
  box(g, 26, 1.6, 4, '#f2efe6', 0, 14.6, 8.6);
  const sh = new THREE.Shape(); sh.moveTo(-13, 0); sh.lineTo(0, 5); sh.lineTo(13, 0); sh.lineTo(-13, 0);
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: false }), M('#fbfaf5')); ped.position.set(0, 16.2, 6.6); ped.castShadow = true; g.add(ped);
  box(g, 18, 2.4, 0.4, M('#ffffff', { map: textTex('BANQUE DE LA VACHE', { bg: '#c62828', color: '#ffd54f', size: 110, w: 1300, h: 180 }) }), 0, 12.2, 10.7, { cast: false });
  box(g, 5, 9, 0.4, '#ffd54f', 0, 1.6, 7.1, { metal: 0.5 });
  for (let s = 0; s < 4; s++) box(g, 20 - s, 0.4, 4 - s * 0.5, '#e9e5da', 0, s * 0.4, 9.5 + s * 0.4, { cast: false });
  plane(p, 5, 30, M('#d32f2f'), 0, 0.05, 6, { rx: -Math.PI / 2 });
  for (const sx of [-4, 4]) for (let k = 0; k < 4; k++) { cyl(p, 0.2, 0.25, 2.4, '#ffd54f', sx, 0, 2 + k * 5, { metal: 0.6 }); }
  const limo = car(p, 9, 6, 0.2, r, '#111111'); limo.scale.set(1, 1, 1.5);
  info.limo = [9, 6];
  for (let i = 0; i < 6; i++) tree(p, r.range(-40, 40), r.range(-30, -20), r, 0.9, 'round');
  return info;
}

function toolShop(p, r, night, o = {}) {
  const info = hayBase(p, r, night, { ...o, hayZ: -88 });
  plane(p, 40, 24, M('#d9d6cf'), 0, 0.04, 8, { rx: -Math.PI / 2 });
  stall(p, 0, 2, 0, { sign: 'OUTILS', c1: '#e53935', c2: '#ffffff', bunting: true });
  // displayed tools
  const T = (x, k) => { const g = new THREE.Group(); g.position.set(x, 3.8, 2.4); p.add(g); if (k === 'fork') { box(g, 0.2, 3.4, 0.2, '#8d5a34', 0, 0, 0); for (const dx of [-0.4, 0, 0.4]) box(g, 0.12, 1.1, 0.12, '#9e9e9e', dx, 3.4, 0); box(g, 1.0, 0.15, 0.15, '#9e9e9e', 0, 3.35, 0); } else if (k === 'blower') { box(g, 1.4, 1.0, 1.0, '#ff7043', 0, 0.2, 0, { round: 0.2 }); cyl(g, 0.2, 0.25, 2.2, '#555', 1.2, 0.6, 0, { rz: Math.PI / 2 }); } else { box(g, 1.0, 1.4, 1.0, '#26c6da', 0, 0, 0, { round: 0.2 }); cyl(g, 0.12, 0.12, 2.4, '#555', 0.3, 1.4, 0); } };
  T(-3, 'fork'); T(0, 'blower'); T(3, 'vac');
  return info;
}

function crater(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 4 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 55, 30] };
  base(p, r, {});
  const ring = new THREE.Mesh(new THREE.TorusGeometry(24, 5, 8, 32), M('#b08850', { rough: 1 })); ring.rotation.x = -Math.PI / 2; ring.scale.z = 0.6; p.add(ring);
  plane(p, 50, 50, M('#8a6a3c'), 0, 0.05, 0, { rx: -Math.PI / 2 });
  // campfire, tent, sign
  for (let i = 0; i < 6; i++) box(p, 0.4, 0.4, 2.4, '#5d4037', 4, 0.2, -2, { ry: i * 0.5 });
  const fire = box(p, 1.2, 1.6, 1.2, M('#ff9800', { emissive: '#ff6d00', ei: 1.6 }), 4, 0.3, -2, { cast: false, round: 0.4 }); info.fire = fire;
  const tent = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 4), M('#ef6c00')); tent.position.set(-6, 2.5, -6); tent.rotation.y = Math.PI / 4; tent.castShadow = true; p.add(tent);
  box(p, 0.3, 3, 0.3, '#5d4037', 8, 0, 2); box(p, 4, 1.6, 0.2, M('#ffffff', { map: textTex('MAISON', { bg: '#fff6e0', color: '#5d4037', size: 120, w: 600, h: 220 }) }), 8, 3, 2.15, { cast: false });
  haystack(p, 0, -120, 80, 120, r, {});
  info.update = (t) => { fire.scale.set(1 + Math.sin(t * 13) * 0.15, 1 + Math.sin(t * 17) * 0.25, 1); };
  return info;
}

function barn(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 8 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 55, 40] };
  base(p, r, { grass: true });
  const g = new THREE.Group(); g.position.set(-6, 0, -12); p.add(g);
  box(g, 22, 14, 16, '#c62828');
  const sh = new THREE.Shape(); sh.moveTo(-12, 0); sh.lineTo(-7, 6); sh.lineTo(7, 6); sh.lineTo(12, 0); sh.lineTo(-12, 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 17, bevelEnabled: false }), M('#3b3b3b')); roof.position.set(0, 14, -8.5); roof.castShadow = true; g.add(roof);
  box(g, 8, 9, 0.4, '#8e1b1b', 0, 0, 8.1); box(g, 0.4, 9, 0.5, '#ffffff', 0, 0, 8.2); box(g, 8, 0.4, 0.5, '#ffffff', 0, 4.4, 8.2);
  for (let i = 0; i < 4; i++) bale(p, -12 + i * 4.5, 2, r, 0);
  gabled(p, 16, -14, 0, r, { w: 11, h: 12, color: '#90caf9', gable: 'point' });
  looseStraw(p, 300, [-14, -2, 10, 14], r, { maxL: 2 });
  box(p, 4, 3, 2, '#8d6e63', 4, 0, 2); box(p, 4.4, 0.3, 2.4, '#a1887f', 4, 3, 2);
  return info;
}

function christmasCorner(p, r, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  cyl(g, 0.5, 0.6, 2, '#6d4c41');
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(4 - i * 0.85, 3.4, 8), M('#2e7d32')); c.position.y = 3 + i * 2.2; c.castShadow = true; g.add(c); }
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), M('#ffd54f', { emissive: '#ffca28', ei: 1.2 })); star.position.y = 12; g.add(star);
  for (let i = 0; i < 16; i++) { const a = i * 2.4, hh = 2.2 + (i % 7) * 1.2, rr = 3.6 - hh * 0.28; sphere(g, 0.32, M(['#e53935', '#fdd835', '#1e88e5', '#ffffff'][i % 4], { emissive: ['#e53935', '#fdd835', '#1e88e5', '#ffffff'][i % 4], ei: 0.5 }), Math.cos(a) * rr, hh, Math.sin(a) * rr, { cast: false }); }
  for (let i = 0; i < 5; i++) { const gb = box(g, 1.4, 1.2, 1.4, ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa'][i], -3 + i * 1.6, 0, 3.6); box(g, 1.44, 1.24, 0.2, '#ffffff', -3 + i * 1.6, 0, 3.6, { cast: false }); }
  const sm = new THREE.Group(); sm.position.set(7, 0, 2); g.add(sm);
  sphere(sm, 2, '#ffffff', 0, 2, 0); sphere(sm, 1.5, '#ffffff', 0, 4.8, 0); sphere(sm, 1.1, '#ffffff', 0, 7, 0); box(sm, 0.3, 0.3, 1, '#ff7043', 0, 7, 1.2); box(sm, 1.8, 0.3, 1.8, '#222', 0, 7.9, 0); box(sm, 1.2, 1.2, 1.2, '#222', 0, 8.2, 0);
  plane(p, 30, 20, M('#ffffff'), x, 0.06, z + 2, { rx: -Math.PI / 2 });
}

function goldPond(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 10 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 55, 40] };
  base(p, r, { grass: true });
  plane(p, 90, 60, M('#d9d6cf'), 0, 0.03, 0, { rx: -Math.PI / 2 });
  cyl(p, 9, 9.4, 1.0, '#f2efe6', 0, 0, 0, { seg: 32 });
  const gold = cyl(p, 8.4, 8.4, 0.2, M('#ffd23f', { metal: 0.3, rough: 0.25, emissive: '#ffb300', ei: 0.9 }), 0, 0.9, 0, { seg: 32, cast: false });
  for (let i = 0; i < 10; i++) { const a = i * 0.63; box(p, 0.6, 0.08, 0.6, M('#fff3b0', { emissive: '#fff3b0', ei: 1.2 }), Math.cos(a) * (2 + i * 0.5), 1.02, Math.sin(a) * (2 + i * 0.5), { cast: false, ry: a }); }
  for (let i = 0; i < 4; i++) gabled(p, -30 + i * 20, -30, 0, r, { w: 11, h: 15 });
  for (let k = 0; k < 2; k++) for (let i = 0; i < 16; i++) box(p, 1, 1, 0.05, ['#e53935', '#fdd835', '#1e88e5', '#43a047'][i % 4], -24 + i * 3.2, 9 - Math.sin(i / 15 * Math.PI) * 1.5, -8 - k * 10, { cast: false, rz: Math.PI / 4 });
  for (let i = 0; i < 6; i++) tree(p, -40 + i * 16, -44, r, 0.9, 'round');
  return info;
}

function festival(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 10 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 55, 40] };
  base(p, r, { grass: true });
  plane(p, 120, 90, M('#d9d6cf'), 0, 0.03, 0, { rx: -Math.PI / 2 });
  townHall(p, 0, -40, 0, { label: 'MAIRIE' });
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) gabled(p, sx * 34, 10 - i * 13, -sx * Math.PI / 2, r, { w: 12 });
  for (let k = 0; k < 3; k++) for (let i = 0; i < 18; i++) box(p, 1, 1, 0.05, ['#e53935', '#fdd835', '#1e88e5', '#43a047'][i % 4], -27 + i * 3.2, 10 - Math.sin(i / 17 * Math.PI) * 2, -10 + k * 9, { cast: false, rz: Math.PI / 4 });
  return info;
}

function studio(p, r, night, o = {}) {
  // brand backdrop: seamless curved cyclorama in the brand colours
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], background: o.bg || '#2a1650', sun: [20, 40, 50], hemi: 1.5, sunIntensity: 2.2, shadowSize: 30 };
  const tex = canvasTex('studio' + (o.c1 || '') + (o.c2 || ''), 64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, o.c1 || '#7b3fe4'); gr.addColorStop(1, o.c2 || '#ff7a1a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 80, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })); wall.position.set(0, 40, 20); p.add(wall);
  plane(p, 200, 200, M(o.floor || '#3a1f6e', { rough: 0.6 }), 0, 0, 0, { rx: -Math.PI / 2 });
  if (o.ring !== false) { const ring = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.2, 48), new THREE.MeshBasicMaterial({ color: '#ffd23f' })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; p.add(ring); }
  return info;
}

function shower(p, r, night, o = {}) {
  const W = 22, D = 20, H = 13;
  const info = { stage: { x: 0, z: -4 }, interior: true, seats: [], beds: [], lampPoints: [], bounds: { minX: -W / 2 + 1, maxX: W / 2 - 1, minZ: -D / 2 + 1, maxZ: D / 2 - 1, maxY: H - 0.6 } };
  const tiles = canvasTex('btiles', 256, 256, (g, w, h) => { g.fillStyle = '#e6f4fb'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b8d7e6'; g.lineWidth = 4; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } });
  plane(p, W, D, M('#ffffff', { map: repeatTex(tiles, 4, 4) }), 0, 0.01, 0, { rx: -Math.PI / 2 });
  const wm = M('#ffffff', { map: repeatTex(tiles, 5, 3) });
  box(p, W, H, 0.6, wm, 0, 0, -D / 2 - 0.3, { cast: false }); box(p, 0.6, H, D, wm, -W / 2 - 0.3, 0, 0, { cast: false }); box(p, 0.6, H, D, wm, W / 2 + 0.3, 0, 0, { cast: false }); box(p, W, H, 0.6, wm, 0, 0, D / 2 + 0.3, { cast: false }); box(p, W, 0.5, D, '#f4f1ea', 0, H, 0, { cast: false });
  // shower cabin (glass) around the stage
  const gl = M('#bfe8ff', { transparent: true, opacity: 0.28, rough: 0.05 });
  box(p, 6.4, 0.5, 6.4, '#ffffff', 0, 0, -6); box(p, 6.4, 9, 0.15, gl, 0, 0.5, -2.85, { cast: false }); box(p, 0.15, 9, 6.4, gl, -3.2, 0.5, -6, { cast: false }); box(p, 0.15, 9, 6.4, gl, 3.2, 0.5, -6, { cast: false }); box(p, 6.6, 0.3, 6.6, '#cfd8dc', 0, 9.5, -6, { metal: 0.5 });
  cyl(p, 0.15, 0.15, 2, '#b0bec5', 0, 9.5, -8.6, { rx: Math.PI / 2 }); cyl(p, 0.8, 0.5, 0.3, '#b0bec5', 0, 8.6, -7.8);
  box(p, 5, 3.4, 2.6, '#ffffff', 7, 0, -8); box(p, 2.4, 4, 0.2, M('#cfe8ff', { metal: 0.6, rough: 0.05 }), 7, 6, -9.6, { cast: false });
  info.stage = { x: 0, z: -6 };
  return info;
}

function windowRoom(p, r, night, o = {}) {
  // bedroom wall with a real opening; the street outside is visible through it
  const info = { stage: { x: 0, z: -16 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 50, 40], shadowSize: 60 };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) }));
  const wc = o.wall || '#cfe3f7'; const z = -6;
  const WW = 40, WH = 16, hx = 10, hy0 = 4, hy1 = 12;
  box(p, (WW - hx) / 2, WH, 0.6, wc, -(hx / 2 + (WW - hx) / 4), 0, z); box(p, (WW - hx) / 2, WH, 0.6, wc, hx / 2 + (WW - hx) / 4, 0, z);
  box(p, hx, hy0, 0.6, wc, 0, 0, z); box(p, hx, WH - hy1, 0.6, wc, 0, hy1, z);
  box(p, hx + 1, 0.5, 1.4, '#ffffff', 0, hy0 - 0.25, z + 0.3); box(p, 0.4, hy1 - hy0, 0.8, '#ffffff', -hx / 2, hy0, z); box(p, 0.4, hy1 - hy0, 0.8, '#ffffff', hx / 2, hy0, z); box(p, hx, 0.4, 0.8, '#ffffff', 0, hy1, z);
  plane(p, 40, 14, M('#ffffff', { map: repeatTex(TEX_wood(), 6, 2) }), 0, 0.02, z + 7, { rx: -Math.PI / 2 });
  box(p, 6, 3.6, 3, '#a1887f', 7, 0, z + 2.5); box(p, 1.2, 1.6, 0.8, '#ffd23f', 6, 3.6, z + 2.5);
  for (let i = 0; i < 5; i++) gabled(p, -40 + i * 20, -60, 0, r, { w: 12, h: r.pick([14, 18]), gable: 'point' });
  for (let i = 0; i < 5; i++) tree(p, -30 + i * 15, -40, r, 0.9, 'round');
  plane(p, 300, 12, M('#55575c'), 0, 0.03, -30, { rx: -Math.PI / 2 });
  return info;
}
function TEX_wood() { return canvasTex('wood2', 256, 256, (g, w, h) => { const r = rng('w2'); for (let i = 0; i < 8; i++) { g.fillStyle = ['#b07a47', '#a86f3d', '#b9834f', '#9f6a3a'][i % 4]; g.fillRect(0, i * 32, w, 32); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, i * 32 + 31, w, 2); g.fillRect(r() * w, i * 32, 2, 32); } }); }

function cloudSky(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 60, 40], fogNear: 200, fogFar: 900, shadowSize: 60 };
  ground(p, M('#ffffff', { map: repeatTex(limeTex(), 100, 100) })).position.y = -60;
  const cm = M('#ffffff', { rough: 1 });
  const Y = o.cloudY ?? 14;
  for (let i = 0; i < 160; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 140; const x = Math.cos(a) * d, z = Math.sin(a) * d - 20; if (Math.hypot(x, z) < (o.hole ?? 0)) continue; const m = new THREE.Mesh(new THREE.SphereGeometry(r.range(5, 11), 12, 8), cm); m.position.set(x, Y + r.range(-1.5, 1.5), z); m.scale.y = 0.55; m.receiveShadow = true; p.add(m); }
  return info;
}

export const FARM_ENVIRONMENTS = { studio, shower, window_room: windowRoom, cloud_sky: cloudSky, hay_town: hayTown, hay_base: hayBase, hay_inside: hayInside, hay_shop: hayShop, cow_bank: cowBank,
  tool_shop: toolShop, crater, barn, gold_pond: goldPond, festival };
