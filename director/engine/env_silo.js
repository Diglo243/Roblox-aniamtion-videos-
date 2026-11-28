// « Escaliers » toolkit: underground silo town (giant cylindrical atrium with 144 floors, spiral
// red-carpet staircase, balconies, doors, string lights), dining hall with the grey dead world behind
// the window, cozy grandma room, vault corridor (DO NOT OPEN), the green outside with a sun on a cable
// and stairs in the sky, an island, a city rooftop and the small attic under somebody's floor.
import * as THREE from 'three';
import { M, box, cyl, sphere, plane, canvasTex, textTex, repeatTex, rng, shade, clamp, lerp, smooth } from './core.js';
import { tree, ground } from './environments.js';

export const SILO = { Rw: 30, Rin: 21, FH: 9, Rs: 17.5, Ws: 6, LEVELS: 14 };
const TRIM = ['#c62828', '#1e5bd8', '#f2b705'];

const wallTex = () => canvasTex('silo_wall', 1024, 256, (g, w, h) => {
  g.fillStyle = '#e9d3a6'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c62828'; g.fillRect(0, h - 26, w, 12); g.fillStyle = '#1e5bd8'; g.fillRect(0, h - 14, w, 14); g.fillStyle = '#e8d2a8'; g.fillRect(0, 0, w, 18);
  const cols = ['#c62828', '#1e5bd8', '#2e9e4f', '#f2b705', '#7b3fe4', '#ff7a1a'];
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 170;
    g.fillStyle = '#ffffff'; g.fillRect(x - 6, 70, 72, 162); g.fillStyle = cols[i % 6]; g.fillRect(x, 76, 60, 156); g.fillStyle = '#ffd54f'; g.fillRect(x + 46, 150, 8, 8);
    g.fillStyle = '#ffffff'; g.fillRect(x + 82, 92, 66, 60); g.fillStyle = '#ffd98a'; g.fillRect(x + 86, 96, 58, 52); g.fillStyle = '#ffffff'; g.fillRect(x + 113, 96, 4, 52);
    g.fillStyle = '#6d4c41'; g.fillRect(x + 80, 160, 70, 14); g.fillStyle = '#3f9b3a'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + 88 + k * 14, 158, 9, 0, 7); g.fill(); }
  }
});
const wallEmis = () => canvasTex('silo_wall_e', 1024, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { const x = 30 + i * 170; g.fillStyle = '#c8a050'; g.fillRect(x + 86, 96, 58, 52); } });
const tileTex = () => canvasTex('silo_tile', 256, 256, (g, w, h) => { g.fillStyle = '#e6d2ae'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8c8a8'; g.lineWidth = 4; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } });
const edgeTex = () => canvasTex('silo_edge', 256, 64, (g, w, h) => { g.fillStyle = '#efe3cc'; g.fillRect(0, 0, w, h); g.fillStyle = '#c62828'; g.fillRect(0, 10, w, 14); g.fillStyle = '#1e5bd8'; g.fillRect(0, 28, w, 14); g.fillStyle = '#f2b705'; g.fillRect(0, 46, w, 8); });

function instanced(geo, mat, list, p) { const im = new THREE.InstancedMesh(geo, mat, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3(); list.forEach((it, i) => { e.set(it[3] || 0, it[4] || 0, it[5] || 0); q.setFromEuler(e); v.set(it[0], it[1], it[2]); if (it[6]) s.setScalar(it[6]); else s.set(1, 1, 1); m4.compose(v, q, s); im.setMatrixAt(i, m4); if (it[7]) im.setColorAt(i, new THREE.Color(it[7])); }); p.add(im); return im; }

export function stairAt(theta, level = 0) { const { Rs, FH } = SILO; return [Rs * Math.cos(theta), FH * (level + theta / (Math.PI * 2)), Rs * Math.sin(theta)]; }

function silo(p, r, night, o = {}) {
  const { Rw, Rin, FH, Rs, Ws } = SILO; const L = o.levels ?? SILO.LEVELS;
  const lo = o.lo ?? -L, hi = o.hi ?? L;
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], background: o.dark ? '#120c08' : '#2a1a10', fogColor: o.dark ? '#120c08' : '#4a3220', fogNear: 60, fogFar: o.dark ? 120 : 230,
    sun: [0.3, 1, 0.2], sunCast: false, sunIntensity: o.dark ? 0.3 : 0.9, hemi: o.dark ? 0.6 : 1.25,
    extraLights: o.dark ? [{ color: '#ffd59a', intensity: 160, pos: [0, 6, 22], dist: 30 }] : [{ color: '#ffe2b8', intensity: 260, pos: [0, 6, 0], dist: 70 }, { color: '#ffe2b8', intensity: 160, pos: [0, 30, 0], dist: 70 }, { color: '#ffe2b8', intensity: 160, pos: [0, -25, 0], dist: 70 }] };
  const H = (hi - lo + 1) * FH;
  const wm = new THREE.MeshStandardMaterial({ map: repeatTex(wallTex(), 9, hi - lo + 1), emissive: new THREE.Color('#ffffff'), emissiveMap: repeatTex(wallEmis(), 9, hi - lo + 1), emissiveIntensity: o.dark ? 0.5 : 0.8, side: THREE.BackSide, roughness: 0.8 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(Rw, Rw, H, 72, 1, true), wm); wall.position.y = lo * FH + H / 2 - 0.3; p.add(wall);
  const fm = M('#ffffff', { map: repeatTex(tileTex(), 10, 10) }), em = M('#ffffff', { map: repeatTex(edgeTex(), 40, 1) });
  const ringGeo = new THREE.RingGeometry(Rin, Rw, 72, 1), edgeGeo = new THREE.CylinderGeometry(Rin, Rin, 1.2, 72, 1, true);
  const railM = M('#2bb39a', { rough: 0.4 }), posts = [], lights = [], plants = [];
  for (let i = lo; i <= hi; i++) {
    const y = i * FH;
    const ring = new THREE.Mesh(ringGeo, fm); ring.rotation.x = -Math.PI / 2; ring.position.y = y; ring.receiveShadow = true; p.add(ring);
    const under = new THREE.Mesh(ringGeo, M('#d8c6a6', { side: THREE.BackSide })); under.rotation.x = -Math.PI / 2; under.position.y = y - 1.2; p.add(under);
    const edge = new THREE.Mesh(edgeGeo, em); edge.position.y = y - 0.6; p.add(edge);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(Rin + 0.3, 0.12, 6, 96), railM); rail.rotation.x = Math.PI / 2; rail.position.y = y + 2.0; p.add(rail);
    for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2; posts.push([Math.cos(a) * (Rin + 0.3), y + 1.0, Math.sin(a) * (Rin + 0.3)]); }
    for (let k = 0; k < 90; k++) { const a = k / 90 * Math.PI * 2; const sag = Math.abs(Math.sin(k / 90 * Math.PI * 12)) * 0.6; lights.push([Math.cos(a) * (Rin + 0.5), y + FH - 1.4 - sag, Math.sin(a) * (Rin + 0.5), 0, 0, 0, 0, ['#ffe9a0', '#ffd23f', '#ff9a5a', '#fff4d0'][k % 4]]); }
    for (let k = 0; k < 12; k++) { const a = (k + 0.5) / 12 * Math.PI * 2; plants.push([Math.cos(a) * (Rw - 1.4), y + 0.6, Math.sin(a) * (Rw - 1.4), 0, -a, 0]); }
  }
  instanced(new THREE.BoxGeometry(0.14, 2.0, 0.14), railM, posts, p);
  const lm = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }); instanced(new THREE.SphereGeometry(0.16, 6, 4), lm, lights, p);
  instanced(new THREE.BoxGeometry(1.2, 1.2, 3.2), M('#3f9b3a', { round: 0 }), plants, p);
  // spiral staircase (red carpet) in the open centre
  const steps = [], carpet = [], sposts = [];
  const perTurn = 54;
  for (let i = lo * perTurn; i <= hi * perTurn; i++) {
    const th = i / perTurn * Math.PI * 2, y = FH * i / perTurn;
    steps.push([Rs * Math.cos(th), y - 0.25, Rs * Math.sin(th), 0, -th, 0]);
    carpet.push([Rs * Math.cos(th), y + 0.02, Rs * Math.sin(th), 0, -th, 0]);
    if (i % 3 === 0) for (const rr of [Rs - Ws / 2, Rs + Ws / 2]) sposts.push([rr * Math.cos(th), y + 0.9, rr * Math.sin(th)]);
  }
  instanced(new THREE.BoxGeometry(Ws, 0.5, 2.3), M('#e8d8b8'), steps, p).receiveShadow = true;
  instanced(new THREE.BoxGeometry(Ws * 0.55, 0.06, 2.3), M('#c62828', { rough: 0.9 }), carpet, p);
  instanced(new THREE.BoxGeometry(0.12, 1.8, 0.12), railM, sposts, p);
  // central cable + hanging lamps
  for (let i = lo; i <= hi; i += 2) { const lp = sphere(p, 1.0, M('#fff4d0', { emissive: '#ffe0a0', ei: 1.5 }), 0, i * FH + 6, 0, { cast: false }); }
  // bunting across some levels
  for (let i = lo; i <= hi; i += 3) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; box(p, 0.7, 0.9, 0.05, TRIM[k % 3], Math.cos(a) * (Rin + 0.6), i * FH + FH - 2.6, Math.sin(a) * (Rin + 0.6), { cast: false, ry: -a + Math.PI / 2, rz: Math.PI }); }
  if (o.top) {  // the last floor: a ceiling of rock + a hatch
    const cap = new THREE.Mesh(new THREE.CircleGeometry(Rw, 48), M('#4a3a2a', { side: THREE.DoubleSide })); cap.rotation.x = Math.PI / 2; cap.position.y = (hi + 1) * FH - 0.3; p.add(cap);
  }
  return info;
}

// ---- dining hall with the grey dead world behind the window ----
function deadWorld(p, r, z0) {
  plane(p, 900, 600, M('#8f8f8f', { rough: 1 }), 0, -0.5, z0 - 300, { rx: -Math.PI / 2 });
  for (let i = 0; i < 60; i++) { const x = r.range(-200, 200), z = z0 - r.range(30, 300), hgt = r.range(10, 70); const b = box(p, r.range(8, 22), hgt, r.range(8, 18), r.pick(['#7a7a7a', '#8a8a8a', '#6e6e6e', '#959595']), x, -0.5, z, { cast: false }); if (r() < 0.4) b.rotation.z = r.range(-0.15, 0.15); }
  for (let i = 0; i < 30; i++) box(p, r.range(1, 3), r.range(0.5, 2), r.range(1, 3), '#777', r.range(-60, 60), -0.5, z0 - r.range(5, 40), { cast: false });
  const cl = new THREE.Group(); cl.position.set(14, 24, z0 - 110); p.add(cl); for (const [x, y, z, rr] of [[0, 0, 0, 9], [10, -2, 2, 7], [-9, -1, 1, 7], [3, 5, -2, 6]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(rr, 12, 8), M('#b9b9b9', { rough: 1 })); m.position.set(x, y, z); m.scale.y = 0.6; cl.add(m); }
}

function hall(p, r, night, o = {}) {
  const W = 50, D = 34, H = 15;
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], background: '#9b9b9b', fogColor: '#a8a8a8', fogNear: 60, fogFar: 340, sunCast: false, sun: [0, 1, 1], sunIntensity: 0.8, hemi: 1.6,
    extraLights: [{ color: '#ffd59a', intensity: 700, pos: [0, 12, 4], dist: 60 }] };
  plane(p, W, D, M('#ffffff', { map: repeatTex(tileTex(), 8, 6) }), 0, 0.01, 0, { rx: -Math.PI / 2 });
  const wm = M('#f1e2c4'); box(p, 0.6, H, D, wm, -W / 2 - 0.3, 0, 0, { cast: false }); box(p, 0.6, H, D, wm, W / 2 + 0.3, 0, 0, { cast: false }); box(p, W, H, 0.6, wm, 0, 0, D / 2 + 0.3, { cast: false }); box(p, W, 0.5, D, '#efe3cc', 0, H, 0, { cast: false });
  // window wall (frames only) at z = -D/2
  box(p, W, 1.6, 0.6, '#c62828', 0, 0, -D / 2); box(p, W, 1.4, 0.6, '#1e5bd8', 0, H - 1.4, -D / 2);
  for (let x = -W / 2; x <= W / 2; x += 6.25) box(p, 0.4, H, 0.5, '#5d5d5d', x, 0, -D / 2, { cast: false });
  box(p, W, 0.3, 0.4, '#5d5d5d', 0, 7.5, -D / 2, { cast: false });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: '#d8dde0', transparent: true, opacity: 0.12 })); glass.position.set(0, H / 2, -D / 2); p.add(glass);
  deadWorld(p, r, -D / 2 - 4);
  // long tables + benches
  for (const x of [-15, -5, 5, 15]) { box(p, 4, 0.4, 22, '#c98a4a', x, 3.2, 0); box(p, 0.4, 3.2, 0.4, '#6d4c41', x, 0, -9); box(p, 0.4, 3.2, 0.4, '#6d4c41', x, 0, 9); for (const sx of [-3, 3]) box(p, 1.4, 2, 22, '#a0632f', x + sx, 0, 0); for (let k = 0; k < 6; k++) box(p, 1, 0.3, 1, r.pick(['#ffffff', '#ffd54f', '#ef5350']), x + r.range(-1, 1), 3.6, -8 + k * 3.2, { cast: false }); }
  plane(p, 4, D, M('#c62828'), 0, 0.03, 0, { rx: -Math.PI / 2 }); plane(p, 1.4, D, M('#f2b705'), 0, 0.04, 0, { rx: -Math.PI / 2 });
  for (let k = 0; k < 3; k++) for (let i = 0; i < 18; i++) box(p, 0.9, 1.1, 0.05, TRIM[i % 3], -W / 2 + 2 + i * 2.8, H - 2.5 - Math.sin(i / 17 * Math.PI) * 1.2, -10 + k * 9, { cast: false, rz: Math.PI });
  box(p, 3.4, 5, 0.2, M('#ffffff', { map: canvasTex('banner_cozy', 256, 380, (g) => { g.fillStyle = '#7b3fe4'; g.fillRect(0, 0, 256, 380); g.fillStyle = '#fff'; g.font = '62px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('RESTE', 128, 150); g.fillText('AU', 128, 220); g.fillText('CHAUD', 128, 290); }) }), -14, 8, -D / 2 + 1, { cast: false });
  for (const x of [-12, 0, 12]) { cyl(p, 0.05, 0.05, 3, '#333', x, H - 3, 2); const sh = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1, 16, 1, true), M('#c98a4a', { side: THREE.DoubleSide })); sh.position.set(x, H - 3.4, 2); p.add(sh); sphere(p, 0.5, M('#fff4d0', { emissive: '#ffe0a0', ei: 1.5 }), x, H - 3.8, 2, { cast: false }); }
  return info;
}

function classroom2(p, r, night, o = {}) {
  const W = 34, D = 32, H = 14;
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], background: '#9b9b9b', fogColor: '#a8a8a8', fogNear: 60, fogFar: 300, sunCast: false, sun: [0, 1, 1], sunIntensity: 0.8, hemi: 1.7,
    extraLights: [{ color: '#fff0d0', intensity: 600, pos: [0, 12, 0], dist: 50 }] };
  plane(p, W, D, M('#ffffff', { map: repeatTex(tileTex(), 6, 6) }), 0, 0.01, 0, { rx: -Math.PI / 2 });
  const wm = M('#f6ecd8'); box(p, W, H, 0.6, wm, 0, 0, -D / 2 - 0.3, { cast: false }); box(p, W, H, 0.6, wm, 0, 0, D / 2 + 0.3, { cast: false }); box(p, 0.6, H, D, wm, W / 2 + 0.3, 0, 0, { cast: false }); box(p, W, 0.5, D, '#efe3cc', 0, H, 0, { cast: false });
  // window wall (left) onto the grey world
  for (let z = -D / 2; z <= D / 2; z += 6.4) box(p, 0.5, H, 0.4, '#5d5d5d', -W / 2, 0, z, { cast: false });
  box(p, 0.6, 1.4, D, '#c62828', -W / 2, 0, 0); deadWorld(p, r, -10); // (rotated world behind the left wall: approximated by the far ruins)
  // blackboard with rule #1
  const bb = canvasTex('rule1', 1024, 512, (g) => { g.fillStyle = '#1f4f36'; g.fillRect(0, 0, 1024, 512); g.strokeStyle = '#a0632f'; g.lineWidth = 26; g.strokeRect(13, 13, 998, 486); g.fillStyle = '#ffffff'; g.font = '64px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('RÈGLE N°1 :', 300, 120); g.font = '44px "Poppins"'; g.fillText('NE JAMAIS SORTIR', 300, 190);
    g.font = '200px "Noto Color Emoji"'; g.fillText('☠️', 300, 420); g.fillStyle = '#ffffff'; g.font = '260px "Luckiest Guy"'; g.fillText('10', 760, 330); g.font = '70px "Luckiest Guy"'; g.fillText('SECONDES', 760, 430); });
  box(p, 16, 8, 0.3, M('#ffffff', { map: bb }), 0, 3.4, -D / 2 + 0.2, { cast: false });
  const abc = canvasTex('abc', 1024, 96, (g) => { const c = ['#c62828', '#1e5bd8', '#2e9e4f', '#f2b705', '#7b3fe4', '#ff7a1a']; 'ABCDEFGHIJKL'.split('').forEach((ch, i) => { g.fillStyle = c[i % 6]; g.fillRect(i * 85, 0, 80, 96); g.fillStyle = '#fff'; g.font = '64px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText(ch, i * 85 + 40, 72); }); });
  box(p, 24, 1.8, 0.2, M('#ffffff', { map: abc }), 0, 12, -D / 2 + 0.2, { cast: false });
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) { const x = -10 + col * 7, z = 0 + row * 6; if (Math.abs(x) < 2.5 && z > 2) continue; box(p, 4, 0.3, 2.6, '#f2b705', x, 3.2, z); for (const [dx, dz] of [[-1.8, -1.1], [1.8, -1.1], [-1.8, 1.1], [1.8, 1.1]]) box(p, 0.25, 3.2, 0.25, '#444', x + dx, 0, z + dz); box(p, 2.4, 0.3, 2.2, '#1e5bd8', x, 2, z + 2.4); }
  for (let i = 0; i < 3; i++) { const lp = sphere(p, 0.7, M('#fff4d0', { emissive: '#ffe0a0', ei: 1.4 }), -6 + i * 6, H - 1.2, 0, { cast: false }); }
  return info;
}

function cozyRoom(p, r, night, o = {}) {
  const W = 28, D = 24, H = 13;
  const info = { stage: { x: 0, z: 0 }, interior: true, seats: [{ x: 0, z: -1, y: 2.4, ry: 0 }], beds: [], lampPoints: [], hemi: 1.5, sunCast: false,
    bounds: { minX: -W / 2 + 1, maxX: W / 2 - 1, minZ: -D / 2 + 1, maxZ: D / 2 - 1, maxY: H - 0.6 }, extraLights: [{ color: '#ffcf8a', intensity: 500, pos: [0, 9, 3], dist: 40 }] };
  plane(p, W, D, M('#ffffff', { map: repeatTex(canvasTex('woodfl', 128, 128, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#b07a47', '#a86f3d', '#b9834f'][i % 3]; g.fillRect(0, i * 16, 128, 16); } }), 6, 6) }), 0, 0.01, 0, { rx: -Math.PI / 2 });
  const wm = M('#c62828'); box(p, W, H, 0.6, M('#f1e2c4'), 0, 0, -D / 2 - 0.3, { cast: false }); box(p, 0.6, H, D, M('#f1e2c4'), -W / 2 - 0.3, 0, 0, { cast: false }); box(p, 0.6, H, D, M('#f1e2c4'), W / 2 + 0.3, 0, 0, { cast: false }); box(p, W, H, 0.6, M('#f1e2c4'), 0, 0, D / 2 + 0.3, { cast: false });
  box(p, W, 1.2, 0.4, wm, 0, 3.6, -D / 2 + 0.2, { cast: false });
  for (let x = -W / 2; x <= W / 2; x += 5) box(p, 0.8, 0.8, D, '#8d5a34', x, H - 0.8, 0, { cast: false });
  box(p, W, 0.5, D, '#d9b88a', 0, H, 0, { cast: false });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), M('#1e5bd8')); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.03, 0); p.add(rug);
  const rug2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), M('#f2b705')); rug2.rotation.x = -Math.PI / 2; rug2.position.set(0, 0.04, 0); p.add(rug2);
  // rocking chair
  const ch = new THREE.Group(); ch.position.set(0, 0, -1); p.add(ch); box(ch, 3.4, 0.5, 3, '#8d5a34', 0, 2, 0); box(ch, 3.4, 5, 0.4, '#8d5a34', 0, 2.3, -1.4); for (const sx of [-1.6, 1.6]) { const rk = new THREE.Mesh(new THREE.TorusGeometry(3, 0.15, 6, 20, 1.2), M('#6d4c41')); rk.rotation.y = Math.PI / 2; rk.rotation.z = -0.6 - Math.PI / 2; rk.position.set(sx, 3.1, 0); ch.add(rk); box(ch, 0.3, 2, 0.3, '#6d4c41', sx, 0.2, 1.2); box(ch, 0.3, 2, 0.3, '#6d4c41', sx, 0.2, -1.2); }
  // lamp, plant, sign 100
  cyl(p, 0.15, 0.15, 6, '#333', 6, 0, -6); const shd = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.6, 16, 1, true), M('#ff9ab0', { side: THREE.DoubleSide, emissive: '#ff9ab0', ei: 0.4 })); shd.position.set(6, 6.6, -6); p.add(shd);
  box(p, 2, 2.4, 2, '#c62828', -7, 0, -8); box(p, 2.4, 2.4, 2.4, '#3f9b3a', -7, 2.4, -8, { round: 0.6 });
  if (o.sign) box(p, 4.4, 2.4, 0.3, M('#ffffff', { map: canvasTex('floorsign' + o.sign, 256, 140, (g) => { g.fillStyle = '#f2b705'; g.fillRect(0, 0, 256, 140); g.strokeStyle = '#1b1b1b'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 130); g.fillStyle = '#1b1b1b'; g.font = '24px "Poppins"'; g.textAlign = 'center'; g.fillText('ÉTAGE', 128, 38); g.font = '86px "Luckiest Guy"'; g.fillText(o.sign, 128, 122); }) }), 0, 9, -D / 2 + 0.4, { cast: false });
  for (let k = 0; k < 40; k++) { const t = k / 39; sphere(p, 0.14, M(['#ffe9a0', '#ffd23f', '#ff9a5a'][k % 3], { basic: true }), -W / 2 + 1 + t * (W - 2), H - 1.6 - Math.sin(t * Math.PI * 3) ** 2 * 1.2, -D / 2 + 1, { cast: false }); }
  return info;
}

function vault(p, r, night, o = {}) {
  const W = 14, D = 40, H = 11;
  const info = { stage: { x: 0, z: 0 }, interior: true, seats: [], beds: [], lampPoints: [], hemi: o.dark ? 0.55 : 0.9, sunCast: false, sunIntensity: 0.3, background: '#101420',
    bounds: { minX: -W / 2 + 0.8, maxX: W / 2 - 0.8, minZ: -D / 2 + 3, maxZ: D / 2 - 1, maxY: H - 0.6 }, extraLights: [{ color: '#dfe9ff', intensity: o.dark ? 60 : 200, pos: [0, H - 1, 0], dist: 30 }] };
  const dz = -D / 2;
  plane(p, W, D, M('#9aa3ad'), 0, 0.01, 0, { rx: -Math.PI / 2 });
  plane(p, 4, D, M('#2c5a8a'), 0, 0.02, 0, { rx: -Math.PI / 2 }); for (const sx of [-2.2, 2.2]) plane(p, 0.4, D, M('#f2b705'), sx, 0.03, 0, { rx: -Math.PI / 2 });
  const tile = M('#f4f4f2'); box(p, 0.6, H, D, tile, -W / 2 - 0.3, 0, 0, { cast: false }); box(p, 0.6, H, D, tile, W / 2 + 0.3, 0, 0, { cast: false });
  box(p, 0.7, 2.4, D, '#2a8a8a', -W / 2 - 0.2, 0, 0, { cast: false }); box(p, 0.7, 2.4, D, '#2a8a8a', W / 2 + 0.2, 0, 0, { cast: false });
  box(p, W, 0.5, D, '#1c2238', 0, H, 0, { cast: false }); for (let z = -15; z < 18; z += 8) box(p, 3, 0.2, 1, M('#ffffff', { emissive: '#ffffff', ei: o.dark ? 0.2 : 1 }), 0, H - 0.3, z, { cast: false });
  box(p, 0.5, 0.5, D, '#c62828', -W / 2 + 0.4, H - 2, 0, { cast: false }); box(p, 0.4, 0.4, D, '#1e5bd8', W / 2 - 0.4, H - 1.4, 0, { cast: false });
  // end wall with hazard frame + vault door
  const hz = canvasTex('hazard', 256, 256, (g) => { g.fillStyle = '#f2b705'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#1b1b1b'; for (let i = -8; i < 8; i++) { g.save(); g.translate(i * 48, 0); g.rotate(-0.6); g.fillRect(0, -50, 24, 400); g.restore(); } });
  box(p, W, H, 0.6, M('#e9e9e9'), 0, 0, dz - 0.3, { cast: false });
  box(p, 9.6, 9.0, 0.3, M('#ffffff', { map: repeatTex(hz, 2, 2) }), 0, 0, dz + 0.1, { cast: false });
  const hole = new THREE.Mesh(new THREE.CircleGeometry(3.8, 40), new THREE.MeshBasicMaterial({ color: o.light ? '#ffffff' : '#0a0a0a' })); hole.position.set(0, 4.4, dz + 0.3); p.add(hole);
  const dg = new THREE.Group(); dg.position.set(-3.6, 4.4, dz + 0.6); p.add(dg);
  const dm = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 1.0, 40), M('#8a9099', { metal: 0.6, rough: 0.35 })); dm.rotation.x = Math.PI / 2; dm.position.x = 3.6; dg.add(dm);
  for (let i = 0; i < 3; i++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(3.0 - i * 0.9, 0.12, 6, 32), M('#5d636b', { metal: 0.6 })); rr.position.set(3.6, 0, 0.55); dg.add(rr); }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.16, 8, 24), M('#c62828')); wheel.position.set(3.6, 0, 0.8); dg.add(wheel); for (let k = 0; k < 4; k++) { const sp = box(dg, 2.4, 0.18, 0.18, '#c62828', 3.6, -0.09, 0.8, { cast: false }); sp.rotation.z = k * Math.PI / 4; }
  info.door = dg; info.doorWheel = wheel;
  const sign = canvasTex('donotopen', 1024, 300, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1024, 300); g.strokeStyle = '#c62828'; g.lineWidth = 18; g.strokeRect(9, 9, 1006, 282); g.fillStyle = '#c62828'; g.font = '110px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText('NE JAMAIS OUVRIR.', 512, 140); g.fillStyle = '#1b1b1b'; g.font = '70px "Luckiest Guy"'; g.fillText('ON EST SÉRIEUX.', 512, 240); });
  box(p, 9.6, 2.8, 0.2, M('#ffffff', { map: sign }), 0, 9.0, dz + 0.5, { cast: false }); sphere(p, 0.35, M('#ffb300', { emissive: '#ffb300', ei: 2 }), 0, 10.6, dz + 0.6, { cast: false });
  box(p, 3, 4, 0.1, M('#ffffff', { map: canvasTex('poster_out', 200, 260, (g) => { g.fillStyle = '#bfe6ff'; g.fillRect(0, 0, 200, 260); g.fillStyle = '#5fd11f'; g.fillRect(0, 160, 200, 100); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(150, 60, 26, 0, 7); g.fill(); g.fillStyle = '#1b1b1b'; g.font = '22px "Luckiest Guy"'; g.textAlign = 'center'; g.fillText("L'EXTÉRIEUR", 100, 240); }) }), -W / 2 + 0.4, 4.5, dz + 6, { cast: false, ry: Math.PI / 2 });
  if (o.sprout) { const s = new THREE.Group(); s.position.set(0.4, 0.05, dz + 1.0); p.add(s); box(s, 0.12, 1.0, 0.12, '#3fbf2a', 0, 0, 0); box(s, 0.6, 0.12, 0.35, '#4cd12f', 0.25, 0.8, 0, { rz: 0.4 }); box(s, 0.6, 0.12, 0.35, '#4cd12f', -0.25, 0.6, 0, { rz: -0.4 }); }
  const glow = new THREE.PointLight('#ffffff', 0, 40, 1.4); glow.position.set(0, 4.4, dz + 2); p.add(glow);
  info.update = (t, u, spec) => {
    const op = spec.envOpts?.open; if (!op) return; const k = smooth(clamp((u - op[0]) / Math.max(0.01, op[1] - op[0]), 0, 1));
    dg.rotation.y = k * 1.5; wheel.rotation.z = k * 6; hole.material.color.set(k > 0.02 ? '#ffffff' : '#0a0a0a'); glow.intensity = k * 900;
  };
  return info;
}

function grassField(p, r, area, n, y = 0) {
  const geo = new THREE.BoxGeometry(0.12, 1, 0.12); const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 }); const im = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) { e.set(r.range(-0.4, 0.4), r() * 6, r.range(-0.4, 0.4)); q.setFromEuler(e); const h = r.range(0.6, 1.6); s.set(1, h, 1); v.set(r.range(area[0], area[2]), y + h / 2, r.range(area[1], area[3])); m4.compose(v, q, s); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(r.pick(['#4cc21b', '#5fd11f', '#3fae18', '#7ae03a']))); }
  p.add(im);
  const fl = []; for (let i = 0; i < n / 12; i++) fl.push([r.range(area[0], area[2]), y + r.range(0.6, 1.4), r.range(area[1], area[3]), 0, 0, 0, 0, r.pick(['#ffd23f', '#ff6fae', '#ffffff', '#c77dff', '#ff7a1a', '#4fc3f7'])]);
  instanced(new THREE.SphereGeometry(0.22, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.6 }), fl, p);
}

export function skyRig(p, r, o = {}) {
  // the sun hanging on a cable + spiral stairs in the sky (the "ceiling" of this floor)
  const g = new THREE.Group(); p.add(g); const [sx, sy, sz] = o.sun || [20, 96, -120];
  sphere(g, 9, M('#fff6c8', { emissive: '#fff2b0', ei: 2.2 }), sx, sy, sz, { cast: false, seg: 24 });
  const shade0 = new THREE.Mesh(new THREE.ConeGeometry(11, 6, 24, 1, true), M('#d9dde3', { side: THREE.DoubleSide, metal: 0.4, rough: 0.3 })); shade0.position.set(sx, sy + 6, sz); g.add(shade0);
  cyl(g, 0.4, 0.4, 400, '#3b3b3b', sx, sy + 8, sz, { cast: false });
  const [hx, hy0, hz] = o.helix || [-40, 55, -160]; const R = o.helixR || 26, turns = 3, steps = [];
  for (let i = 0; i < turns * 70; i++) { const th = i / 70 * Math.PI * 2; steps.push([hx + R * Math.cos(th), hy0 + i * 0.55, hz + R * Math.sin(th), 0, -th, 0]); }
  instanced(new THREE.BoxGeometry(5, 0.5, 2.0), M('#b0875a'), steps, g);
  const rails = []; for (let i = 0; i < turns * 70; i += 2) { const th = i / 70 * Math.PI * 2; for (const rr of [R - 2.4, R + 2.4]) rails.push([hx + rr * Math.cos(th), hy0 + i * 0.55 + 1.0, hz + rr * Math.sin(th)]); }
  instanced(new THREE.BoxGeometry(0.2, 2.0, 0.2), M('#6d4c41'), rails, g);
  return g;
}

function outside(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [20, 70, -40], fogNear: 300, fogFar: 1100, shadowSize: 50, hemi: 1.5 };
  ground(p, M('#5fd11f'));
  grassField(p, r, [-30, -6, 30, 40], 6500);
  // stone wall with the silo door
  const st = canvasTex('stone', 256, 256, (g) => { g.fillStyle = '#d8d2c4'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#b8b0a0'; g.lineWidth = 4; for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) g.strokeRect(x * 64 + (y % 2) * 32, y * 32, 64, 32); });
  box(p, 60, 14, 3, M('#ffffff', { map: repeatTex(st, 10, 3) }), 0, 0, -6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.6, 10, 32), M('#b8b0a0')); ring.position.set(0, 4.6, -4.4); p.add(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(4.0, 32), M('#3a3a3a')); hole.position.set(0, 4.6, -4.45); p.add(hole);
  const dg = new THREE.Group(); dg.position.set(-4, 4.6, -4.2); dg.rotation.y = -1.3; p.add(dg); const dm = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.9, 32), M('#8a9099', { metal: 0.5 })); dm.rotation.x = Math.PI / 2; dm.position.x = 3.8; dg.add(dm); const wh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.16, 8, 24), M('#c62828')); wh.position.set(3.8, 0, 0.6); dg.add(wh);
  box(p, 6, 1.6, 0.2, M('#ffffff', { map: textTex('SILO 1', { bg: '#d8d2c4', color: '#5d5d5d', size: 120, w: 512, h: 140 }) }), 0, 10.2, -4.4, { cast: false });
  for (let i = 0; i < 6; i++) { box(p, 0.3, r.range(3, 8), 0.3, '#3fae18', -26 + i * 9, 2, -4.3, { cast: false }); }
  // pink trees, rainbow, pond, clouds
  const pink = (x, z, s) => { cyl(p, 0.6, 0.8, 5 * s, '#7a4b2a', x, 0, z, { seg: 8 }); sphere(p, 3.6 * s, r.pick(['#ffb3d9', '#ff9ad5', '#ffc4e8']), x, 6 * s, z, { seg: 10 }); };
  for (let i = 0; i < 12; i++) pink(r.range(-80, 80), r.range(-120, -20), r.range(0.9, 1.6));
  for (let i = 0; i < 10; i++) tree(p, r.range(-90, 90), r.range(-140, -30), r, r.range(1, 1.6), 'round');
  const rb = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de']; rb.forEach((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(70 - i * 2.2, 1.1, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75, fog: false })); t.position.set(-30, 0, -180); p.add(t); });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(6, 24), M('#4fc3f7', { rough: 0.1 })); pond.rotation.x = -Math.PI / 2; pond.position.set(-14, 0.05, 14); p.add(pond);
  if (o.rig) skyRig(p, r, {});
  return info;
}

function island(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 60, 20], fogNear: 300, fogFar: 1200, shadowSize: 50 };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), M('#1fa3e0', { rough: 0.1, metal: 0.1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.5; p.add(sea);
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(16, 20, 3, 24), M('#f2dca0')); sand.position.set(0, -1, -10); p.add(sand);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(9, 1), M('#d8c08a', { rough: 1 })); rock.position.set(0, 4, -16); rock.scale.y = 1.2; p.add(rock);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.5, 8, 28), M('#1b1b1b')); ring.position.set(0, 3.6, -7.6); p.add(ring); const hz = new THREE.Mesh(new THREE.CircleGeometry(3, 28), M('#5d636b', { metal: 0.5 })); hz.position.set(0, 3.6, -7.7); p.add(hz);
  box(p, 4, 1, 0.2, M('#ffffff', { map: textTex('PORTE 2', { bg: '#ffffff', color: '#1b1b1b', size: 110, w: 512, h: 140 }) }), 0, 7.4, -7.5, { cast: false });
  for (let i = 0; i < 8; i++) box(p, 2.4, 0.3, 1.4, '#a0632f', 0, 0, -2 + i * 1.6);
  const boat = new THREE.Group(); boat.position.set(4, -0.3, 10); boat.rotation.y = 0.4; p.add(boat); box(boat, 3, 1.2, 7, '#c62828', 0, 0, 0, { round: 0.4 }); box(boat, 2.4, 0.3, 6, '#f5f5f5', 0, 1, 0);
  for (let i = 0; i < 6; i++) { const g = new THREE.Group(); g.position.set(r.range(-14, 14), 0, r.range(-18, -2)); p.add(g); box(g, 0.8, 10, 0.8, '#8d6e63', 0, 0, 0, { rz: 0.12 }); for (let k = 0; k < 5; k++) box(g, 6, 0.3, 1.4, '#2e9e4f', 2.4 * Math.cos(k * 1.25), 9.8, 2.4 * Math.sin(k * 1.25), { ry: -k * 1.25 }); }
  skyRig(p, r, { sun: [60, 80, -200], helix: [-20, 20, -60], helixR: 22 });
  return info;
}

function rooftop(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [-60, 25, -40], fogNear: 200, fogFar: 900, shadowSize: 40 };
  plane(p, 40, 40, M('#ffffff', { map: repeatTex(canvasTex('terrace', 128, 128, (g) => { g.fillStyle = '#e8a85a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#c98a4a'; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128); }), 10, 10) }), 0, 0, 0, { rx: -Math.PI / 2 });
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = r.range(40, 200); box(p, r.range(8, 20), r.range(10, 70), r.range(8, 20), r.pick(['#6a4a7a', '#8a5a8a', '#5a4a6a', '#a06a7a']), Math.cos(a) * d, -40, Math.sin(a) * d - 40, { cast: false }); }
  for (let k = 0; k < 2; k++) for (let i = 0; i < 14; i++) box(p, 0.8, 1, 0.05, TRIM[i % 3], -13 + i * 2, 7 - Math.sin(i / 13 * Math.PI) * 1, -6 + k * 8, { cast: false, rz: Math.PI });
  for (let i = 0; i < 14; i++) sphere(p, 0.2, M('#fff4d0', { basic: true }), -13 + i * 2, 6 - Math.sin(i / 13 * Math.PI) * 1, 0, { cast: false });
  box(p, 4, 7, 0.4, '#8d5a34', 0, 0, -12); box(p, 40, 1.2, 0.5, '#c98a4a', 0, 0, -14);
  skyRig(p, r, { sun: [-120, 40, -220], helix: [10, 30, -90], helixR: 24 });
  return info;
}

function attic(p, r, night, o = {}) {
  const W = 12, D = 12, H = 7.5;
  const info = { stage: { x: 0, z: 0 }, interior: true, seats: [], beds: [], lampPoints: [], hemi: 0.6, sunCast: false, sunIntensity: 0.2, background: '#1a1530',
    bounds: { minX: -W / 2 + 0.6, maxX: W / 2 - 0.6, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.6, maxY: H - 0.3 }, extraLights: [{ color: '#ffd59a', intensity: 120, pos: [0, H - 0.6, 0], dist: 16 }, { color: '#8a7aff', intensity: 60, pos: [3, 2, 3], dist: 14 }] };
  plane(p, W, D, M('#4a3a5a'), 0, 0.01, 0, { rx: -Math.PI / 2 });
  const wm = M('#3a3150'); box(p, W, H, 0.6, wm, 0, 0, -D / 2 - 0.3, { cast: false }); box(p, 0.6, H, D, wm, -W / 2 - 0.3, 0, 0, { cast: false }); box(p, 0.6, H, D, wm, W / 2 + 0.3, 0, 0, { cast: false }); box(p, W, H, 0.6, wm, 0, 0, D / 2 + 0.3, { cast: false });
  box(p, W, 0.5, D, M('#6d4c41'), 0, H, 0, { cast: false });
  box(p, 3.4, 0.2, 3.4, '#a0632f', 0, H - 0.15, 0, { cast: false }); for (const sx of [-1.75, 1.75]) box(p, 0.15, 0.1, 3.6, M('#ffd98a', { emissive: '#ffd98a', ei: 2 }), sx, H - 0.25, 0, { cast: false });
  box(p, 0.5, 0.5, 0.3, '#888', 1.2, H - 0.5, 0, { cast: false });
  box(p, 3, 1.6, 2, '#8d5a34', -3.5, 0, -3.5); box(p, 1.6, 2.6, 1.6, '#c62828', 3.6, 0, -3.8); cyl(p, 0.4, 0.5, 1.2, M('#ffd98a', { emissive: '#ffb84a', ei: 1.5 }), -3.8, 0, 3.6);
  for (let i = 0; i < 8; i++) box(p, r.range(0.6, 1.4), 0.4, 0.4, r.pick(['#8e24aa', '#1e5bd8', '#f2b705']), r.range(-5, 5), H - 1.4, -D / 2 + 0.5, { cast: false });
  return info;
}

export const SILO_ENVIRONMENTS = { silo, hall: hall, classroom2, cozy_room: cozyRoom, vault, outside, island, rooftop, attic };

// ------------------------------------------------------------------ world props ----
export function siloProp(world, wp, st, r, movers) {
  const P = () => [st.x + (wp.pos?.[0] ?? 0), wp.y ?? 0, st.z + (wp.pos?.[1] ?? 0)];
  switch (wp.kind) {
    case 'floor_sign': {
      const [x, y, z] = P(); const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = wp.facing ?? 0; world.add(g);
      box(g, 0.5, 8, 0.5, '#1b1b1b', -3, 0, 0); box(g, 0.5, 8, 0.5, '#1b1b1b', 3, 0, 0); box(g, 6.5, 0.5, 0.5, '#1b1b1b', 0, 8, 0);
      box(g, 3.6, 2.2, 0.3, M('#ffffff', { map: canvasTex('fs' + wp.text, 256, 160, (c) => { c.fillStyle = '#f2b705'; c.fillRect(0, 0, 256, 160); c.strokeStyle = '#1b1b1b'; c.lineWidth = 10; c.strokeRect(5, 5, 246, 150); c.fillStyle = '#1b1b1b'; c.font = '110px "Luckiest Guy"'; c.textAlign = 'center'; c.fillText(wp.text, 128, 130); }) }), 0, 8.5, 0);
      for (const sx of [-4.2, 4.2]) { box(g, 1.6, 1.4, 1.6, '#8d5a34', sx, 0, 0.6); box(g, 1.8, 1.8, 1.8, '#3f9b3a', sx, 1.4, 0.6, { round: 0.5 }); }
      return true; }
    case 'elevator': {
      const [x, y, z] = P(); const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = wp.facing ?? 0; world.add(g);
      box(g, 8, 9, 0.6, '#c62828'); box(g, 6.6, 7.6, 0.7, '#8d6e63', 0, 0, 0.05);
      for (let i = 0; i < 4; i++) box(g, 7.2, 0.7, 0.3, '#a0632f', 0, 1.2 + i * 1.7, 0.5, { rz: (i % 2 ? 0.12 : -0.12) });
      box(g, 5.4, 1.6, 0.2, M('#ffffff', { map: canvasTex('elev', 512, 150, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 150); c.strokeStyle = '#1e5bd8'; c.lineWidth = 8; c.strokeRect(4, 4, 504, 142); c.fillStyle = '#1e5bd8'; c.font = '52px "Luckiest Guy"'; c.textAlign = 'center'; c.fillText('ASCENSEUR :', 256, 66); c.fillText('BIENTÔT', 256, 126); }) }), 0, 3.4, 0.7);
      const ck = canvasTex('elevclock', 128, 128, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#8d5a34'; c.stroke(); c.strokeStyle = '#222'; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 24); c.moveTo(64, 64); c.lineTo(94, 74); c.stroke(); });
      box(g, 1.6, 1.6, 0.2, M('#ffffff', { map: ck }), 0, 7.6, 0.6, { cast: false });
      for (let i = 0; i < 3; i++) box(g, 0.2, 3, 0.2, '#c9a227', -5 + i * 0.4, 0, 2, { cast: false }); box(g, 3, 0.2, 0.2, '#c62828', -4.6, 2.6, 2, { cast: false });
      return true; }
    case 'couch': { const [x, y, z] = P(); const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = wp.facing ?? 0; world.add(g); box(g, 6, 1.8, 2.6, '#c62828', 0, 0, 0, { round: 0.3 }); box(g, 6, 2.2, 0.8, '#b71c1c', 0, 1.4, -0.9, { round: 0.3 }); for (const sx of [-2.9, 2.9]) box(g, 0.6, 2.4, 2.6, '#b71c1c', sx, 0, 0, { round: 0.2 }); return true; }
    case 'butterfly': {
      const [x, y, z] = P(); const g = new THREE.Group(); g.position.set(x, y, z); world.add(g);
      const wmat = M('#55d12f', { emissive: '#3fae18', ei: 0.4, side: THREE.DoubleSide }); const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), wmat), wr = wl.clone(); wl.position.x = -0.4; wr.position.x = 0.4; const pl = new THREE.Group(), pr = new THREE.Group(); pl.add(wl); pr.add(wr); g.add(pl); g.add(pr); box(g, 0.12, 0.12, 0.7, '#1b5e20', 0, -0.06, 0, { cast: false });
      g.userData.bf = { pl, pr, base: g.position.clone(), fall: wp.fall, s: wp.scale || 1 }; g.scale.setScalar(wp.scale || 1); movers.push(g); return true; }
    case 'board': { const [x, y, z] = P(); return true; }
    case 'dust': return true;
  }
  return false;
}
export function updateSiloMovers(movers, t, u) {
  for (const g of movers) { const b = g.userData.bf; if (!b) continue; const fl = Math.sin(t * 22) * 0.9; b.pl.rotation.y = fl; b.pr.rotation.y = -fl;
    if (b.fall) { const k = smooth(clamp(u / 0.8, 0, 1)); g.position.set(b.base.x + Math.sin(t * 2) * 0.6 * (1 - k), lerp(b.fall[0], b.fall[1], k), b.base.z); } else g.position.y = b.base.y + Math.sin(t * 3) * 0.15; }
}
