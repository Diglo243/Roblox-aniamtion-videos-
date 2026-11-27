// « Message » toolkit: city park, office, gamer room, highway, phone close-up env + world props
// (dragon, giant L, ducks, meteor with a face, rising water, extinguishers, bunting, signs, tiny rock...).
import * as THREE from 'three';
import { M, box, cyl, sphere, plane, canvasTex, textTex, repeatTex, rng, shade, clamp, lerp, smooth, easeOutBack } from './core.js';
import { car, tree, ground } from './environments.js';
import { gabled, townHall, TOWN_COLORS } from './env_town.js';
import { suburbHouse } from './env_farm.js';

const GRASS = '#5fd11f';
const grassTex = () => canvasTex('grass_msg', 128, 128, (g, w, h) => { const r = rng('gm'); g.fillStyle = GRASS; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,90,0,0.10)' : 'rgba(255,255,160,0.10)'; g.fillRect(r() * w, r() * h, 2, 5); } });
const paveTex = () => canvasTex('pave_msg', 256, 256, (g, w, h) => { g.fillStyle = '#f2e6cf'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ddcfb2'; g.lineWidth = 4; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } });

export function bunting(p, x0, x1, y, z, n = 14) {
  for (let i = 0; i <= n; i++) { const t = i / n; const x = lerp(x0, x1, t); const yy = y - Math.sin(t * Math.PI) * 1.4; const f = box(p, 0.9, 1.1, 0.05, TOWN_COLORS[i % TOWN_COLORS.length], x, yy - 1.1, z, { cast: false }); f.rotation.z = Math.PI; }
  box(p, Math.abs(x1 - x0), 0.06, 0.06, '#444', (x0 + x1) / 2, y - 0.7, z, { cast: false });
}
function pinkTree(p, x, z, r, s = 1) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g); cyl(g, 0.5, 0.6, 5, '#7a4b2a', 0, 0, 0, { seg: 8 }); sphere(g, 3.2, r.pick(['#ff9ad5', '#ffb3e1', '#f78fc8']), 0, 6.5, 0, { seg: 10 }); sphere(g, 2.2, '#ffc4e8', 1.8, 7.6, 0.6, { seg: 8 }); return g; }
function flowerBed(p, x, z, w, d, r) { box(p, w, 0.6, d, '#7a5230', x, 0, z, { cast: false }); for (let i = 0; i < w * d * 1.4; i++) sphere(p, 0.35, r.pick(['#ff3b6b', '#ffd23f', '#ff8c42', '#c77dff', '#ffffff', '#ff6fae']), x + r.range(-w / 2 + 0.4, w / 2 - 0.4), 0.9, z + r.range(-d / 2 + 0.4, d / 2 - 0.4), { seg: 6, cast: false }); }

function park2(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [{ x: 0, z: -1.2, y: 2.2, ry: 0 }], beds: [], lampPoints: [], sun: [30, 55, 35] };
  ground(p, M('#ffffff', { map: repeatTex(grassTex(), 100, 100) }));
  plane(p, 8, 200, M('#ffffff', { map: repeatTex(paveTex(), 2, 50) }), -7, 0.03, -40, { rx: -Math.PI / 2 });
  // bench
  const b = new THREE.Group(); b.position.set(0, 0, -1.8); p.add(b);
  box(b, 6, 0.4, 1.8, '#a0632f', 0, 2.0, 0); box(b, 6, 1.6, 0.3, '#a0632f', 0, 2.6, -0.9); for (const x of [-2.6, 2.6]) box(b, 0.3, 2, 1.6, '#333', x, 0, 0);
  if (o.sign !== false) {
    const s = new THREE.Group(); s.position.set(o.signX ?? 0, 0, o.signZ ?? -9); p.add(s);
    flowerBed(s, 0, 2.2, 16, 3, r);
    for (const x of [-6, 6]) box(s, 0.4, 5, 0.4, '#5d4037', x, 0, 0);
    box(s, 14, 6, 0.4, M('#ffffff', { map: canvasTex('sign_resp', 1024, 440, (g) => { g.fillStyle = '#1f3fc7'; g.fillRect(0, 0, 1024, 440); g.strokeStyle = '#ffd23f'; g.lineWidth = 22; g.strokeRect(14, 14, 996, 412); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = '150px "Luckiest Guy"'; g.fillText('ÉCRIS', 512, 200); g.fillText('PRUDEMMENT', 512, 360); }) }), 0, 3.2, 0.25);
  }
  for (let i = 0; i < 10; i++) { const x = r.range(-40, 40), z = r.range(-60, 20); if (Math.abs(x) < 9 && z > -14) continue; if (r() < 0.5) pinkTree(p, x, z, r, r.range(0.8, 1.2)); else tree(p, x, z, r, r.range(0.7, 1.1), 'round'); }
  for (let i = 0; i < 6; i++) { cyl(p, 0.18, 0.2, 9, '#2b2b2b', -11, 0, 10 - i * 18, { seg: 8 }); sphere(p, 0.6, '#fff4c2', -11, 9.4, 10 - i * 18); }
  for (let i = 0; i < 4; i++) gabled(p, -40 + i * 26, -70, 0, r, { w: 14, h: r.pick([28, 34, 40]) });
  return info;
}

function office(p, r, night, o = {}) {
  const W = 30, D = 26, H = 15;
  const info = { stage: { x: 0, z: -4 }, interior: true, seats: [{ x: 0, z: -6.5, y: 2.6, ry: 0 }], beds: [], lampPoints: [], bounds: { minX: -W / 2 + 1, maxX: W / 2 - 1, minZ: -D / 2 + 1, maxZ: D / 2 - 1, maxY: H - 0.6 } };
  plane(p, W, D, M('#b71c1c'), 0, 0.01, 0, { rx: -Math.PI / 2 });
  const wall = M('#f6e7c8'); box(p, W, H, 0.6, wall, 0, 0, -D / 2 - 0.3, { cast: false }); box(p, 0.6, H, D, wall, -W / 2 - 0.3, 0, 0, { cast: false }); box(p, 0.6, H, D, wall, W / 2 + 0.3, 0, 0, { cast: false }); box(p, W, H, 0.6, wall, 0, 0, D / 2 + 0.3, { cast: false }); box(p, W, 0.5, D, '#fff8e8', 0, H, 0, { cast: false });
  box(p, 8, 9, 0.3, M('#bfe6ff', { emissive: '#bfe6ff', ei: 0.6 }), 0, 3.5, -D / 2 + 0.1, { cast: false });
  for (const x of [-5.5, 5.5]) box(p, 3, 12, 0.6, '#c62828', x, 1.5, -D / 2 + 0.5);
  box(p, 11, 3.6, 4.5, '#6d4c41', 0, 0, -4); box(p, 11.4, 0.4, 4.9, '#8d6e63', 0, 3.6, -4); box(p, 6, 0.08, 3, '#2e7d32', 0, 4.0, -4, { cast: false });
  box(p, 3.2, 7, 1, '#c62828', 0, 0, -8.5); box(p, 3.2, 1, 3, '#c62828', 0, 2.2, -7.2);
  const ch = new THREE.Group(); ch.position.set(0, H - 3, -2); p.add(ch); const gm = M('#ffd54f', { metal: 0.7, rough: 0.25 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.15, 8, 24), gm); ring.rotation.x = Math.PI / 2; ch.add(ring); cyl(ch, 0.08, 0.08, 3, gm, 0, 0, 0); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; sphere(ch, 0.25, M('#fff6d8', { emissive: '#fff2c0', ei: 1.5 }), Math.cos(a) * 2.2, 0.3, Math.sin(a) * 2.2, { cast: false }); }
  box(p, 1, 0.3, 1.4, '#ffffff', 3.5, 4, -4.5); box(p, 0.8, 1.4, 0.8, '#1e5bd8', 13, 0, -11); box(p, 1.6, 1.0, 0.1, '#1e5bd8', 13, 6.2, -11);
  return info;
}

function gamerRoom(p, r, night, o = {}) {
  const W = 26, D = 24, H = 13;
  const info = { stage: { x: 0, z: -3 }, interior: true, seats: [{ x: 0, z: -4, y: 2.4, ry: Math.PI }], beds: [], lampPoints: [], hemi: 0.9, bounds: { minX: -W / 2 + 1, maxX: W / 2 - 1, minZ: -D / 2 + 1, maxZ: D / 2 - 1, maxY: H - 0.6 },
    extraLights: [{ color: '#b04dff', intensity: 220, pos: [0, 8, -8], dist: 30 }, { color: '#26c6da', intensity: 160, pos: [-6, 6, 0], dist: 25 }] };
  plane(p, W, D, M('#3b2a22'), 0, 0.01, 0, { rx: -Math.PI / 2 });
  const wall = M('#1e2a5a'); box(p, W, H, 0.6, wall, 0, 0, -D / 2 - 0.3, { cast: false }); box(p, 0.6, H, D, wall, -W / 2 - 0.3, 0, 0, { cast: false }); box(p, 0.6, H, D, wall, W / 2 + 0.3, 0, 0, { cast: false }); box(p, W, H, 0.6, wall, 0, 0, D / 2 + 0.3, { cast: false }); box(p, W, 0.5, D, '#e8e8f0', 0, H, 0, { cast: false });
  box(p, W, 0.25, 0.2, M('#ff4fd8', { emissive: '#ff4fd8', ei: 1.5 }), 0, H - 1, -D / 2 + 0.2, { cast: false });
  const hexC = ['#ff4fd8', '#26c6da', '#ffd23f', '#7cff6b', '#b04dff', '#ff7a1a'];
  for (let i = 0; i < 8; i++) { const hx = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 6), M(hexC[i % 6], { emissive: hexC[i % 6], ei: 1.4 })); hx.rotation.x = Math.PI / 2; hx.position.set(5 + (i % 3) * 1.45 + (Math.floor(i / 3) % 2) * 0.7, 6 + Math.floor(i / 3) * 1.25, -D / 2 + 0.1); p.add(hx); }
  box(p, 10, 0.4, 3.5, '#151515', 0, 3.4, -9); for (const x of [-4.6, 4.6]) box(p, 0.4, 3.4, 3.2, '#151515', x, 0, -9);
  for (const x of [-2.6, 2.6]) { box(p, 4.4, 2.8, 0.3, '#111', x, 4.4, -10.2); box(p, 4.0, 2.4, 0.32, M('#2a3cff', { emissive: '#4a5cff', ei: 0.9 }), x, 4.6, -10.18, { cast: false }); }
  const chair = new THREE.Group(); chair.position.set(0, 0, -4.5); p.add(chair); box(chair, 3, 0.6, 3, '#111', 0, 2, 0); box(chair, 3, 5, 0.6, '#c62828', 0, 2.4, 1.3); cyl(chair, 0.2, 0.2, 2, '#333', 0, 0, 0);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(6, 32), M('#262f6b')); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.03, -4); p.add(rug);
  return info;
}

function highway(p, r, night, o = {}) {
  const info = { stage: { x: 0, z: 0 }, interior: false, seats: [], beds: [], lampPoints: [], sun: [30, 60, 30], fogNear: 300, fogFar: 1400, shadowSize: 70 };
  ground(p, M('#ffffff', { map: repeatTex(grassTex(), 150, 150) }));
  plane(p, 26, 1200, M('#55585e'), 0, 0.02, -400, { rx: -Math.PI / 2 });
  for (let z = 100; z > -900; z -= 10) for (const x of [-4.3, 4.3]) box(p, 0.3, 0.05, 4, '#f5f5f5', x, 0.03, z, { cast: false });
  for (const sx of [-1, 1]) box(p, 0.8, 1.4, 1200, '#bdbdbd', sx * 13.5, 0, -400, { cast: false });
  // traffic jam (instanced car bodies + cabins)
  if (o.cars !== false) {
    const n = 360, body = new THREE.InstancedMesh(new THREE.BoxGeometry(3.6, 1.6, 7), new THREE.MeshStandardMaterial({ roughness: 0.5 }), n), cab = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, 1.4, 3.6), new THREE.MeshStandardMaterial({ color: '#1d2b3a', roughness: 0.2 }), n);
    const m4 = new THREE.Matrix4(), c = new THREE.Color(), cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#f06292', '#ffffff'];
    let k = 0; for (let lane = 0; lane < 3; lane++) for (let i = 0; i < n / 3; i++) { const x = -8.6 + lane * 8.6, z = 60 - i * 9 + r.range(-1, 1); m4.makeTranslation(x, 1.5, z); body.setMatrixAt(k, m4); body.setColorAt(k, c.set(r.pick(cols))); m4.makeTranslation(x, 3.0, z - 0.5); cab.setMatrixAt(k, m4); k++; }
    body.castShadow = cab.castShadow = true; p.add(body); p.add(cab);
  }
  for (let i = 0; i < 40; i++) { const sx = r() < 0.5 ? -1 : 1; tree(p, sx * r.range(22, 90), r.range(-600, 80), r, r.range(0.9, 1.5), r.pick(['round', 'pine'])); }
  for (let i = 0; i < 12; i++) gabled(p, r.range(-160, -60), r.range(-700, -300), 0.5, r, { w: 12 });
  return info;
}

function phoneCU(p, r, night, o = {}) {
  // a giant phone held by a hand, typing animation driven by envOpts.text / typeAt
  const info = { stage: { x: 0, z: 0 }, interior: true, background: o.bg || '#3a6ee8', seats: [], beds: [], lampPoints: [], sun: [10, 30, 40], hemi: 1.4, bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50, maxY: 50 } };
  const g = new THREE.Group(); g.position.set(0, 7, 0); g.rotation.x = -0.12; p.add(g);
  box(g, 6.4, 12.4, 0.6, '#151515', 0, -6.2, 0, { round: 0.5 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 11.6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); scr.position.set(0, 0, 0.31); g.add(scr);
  const hand = new THREE.Group(); hand.position.set(1.0, -4.5, 1.4); g.add(hand);
  box(hand, 2.6, 2.6, 2.6, '#e8b98c', 0, -1.3, 0, { round: 0.6 });
  const thumb = box(hand, 1.0, 3.2, 1.0, '#e8b98c', -0.6, 0.6, 0.4, { round: 0.45 }); thumb.rotation.z = 0.5;
  info.phone = { scr, thumb, text: o.text || '', at: o.typeAt || [0.1, 0.8], sent: o.sent, bubbles: o.bubbles };
  info.update = (t, u, spec) => {
    const P = info.phone; const k = clamp((u - P.at[0]) / Math.max(0.01, P.at[1] - P.at[0]), 0, 1);
    const n = Math.round(P.text.length * k); const key = 'phone|' + P.text + '|' + n + '|' + (P.bubbles || '');
    scr.material.map = canvasTex(key, 360, 720, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 360, 720); c.fillStyle = '#f0f0f0'; c.fillRect(0, 0, 360, 70); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(40, 36, 18, 0, 7); c.fill(); c.fillStyle = '#9e9e9e'; c.fillRect(70, 26, 140, 10); c.fillRect(70, 44, 90, 8);
      if (P.bubbles) { c.font = '22px "Poppins"'; for (let i = 0; i < 12; i++) { c.fillStyle = '#e8f5e9'; c.fillRect(20, 90 + i * 52, 300, 40); c.fillStyle = '#1b5e20'; c.fillText(P.bubbles, 34, 117 + i * 52); } return; }
      c.fillStyle = '#e9e9ee'; c.beginPath(); c.roundRect(20, 470, 320, 90, 30); c.fill(); c.fillStyle = '#222'; c.font = '30px "Poppins"';
      const shown = P.text.slice(0, n); const lines = shown.match(/.{1,18}(\s|$)/g) || [shown]; lines.slice(0, 3).forEach((l, i) => c.fillText(l.trim() + (i === lines.length - 1 && k < 1 ? '|' : ''), 38, 505 + i * 34));
      c.fillStyle = '#3a8bff'; c.beginPath(); c.roundRect(240, 600, 100, 50, 25); c.fill(); c.fillStyle = '#fff'; c.font = '24px "Poppins"'; c.fillText('Envoi', 255, 633);
    });
    scr.material.needsUpdate = true;
    thumb.position.y = 0.6 + Math.abs(Math.sin(t * 14)) * 0.5 * (k > 0 && k < 1 ? 1 : 0);
  };
  return info;
}

export const MSG_ENVIRONMENTS = { park2, office, gamer_room: gamerRoom, highway, phone_cu: phoneCU };

// ------------------------------------------------------------------ world props --
function faceTexMeteor(kind) {
  return canvasTex('meteorface' + kind, 512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(256, 230, 40, 256, 256, 260); gr.addColorStop(0, '#ffd23f'); gr.addColorStop(0.6, '#ff8a1f'); gr.addColorStop(1, '#d8400f'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(160,50,10,0.35)'; g.beginPath(); g.arc(60 + (i * 97) % 400, 80 + (i * 131) % 360, 18 + (i % 3) * 10, 0, 7); g.fill(); }
    if (kind === 'none') return;
    g.fillStyle = '#3b1a08'; g.beginPath(); g.ellipse(180, 200, 26, 38, 0, 0, 7); g.ellipse(332, 200, 26, 38, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(172, 186, 9, 0, 7); g.arc(324, 186, 9, 0, 7); g.fill();
    g.lineWidth = 14; g.strokeStyle = '#3b1a08'; g.lineCap = 'round';
    if (kind === 'grin') { g.fillStyle = '#3b1a08'; g.beginPath(); g.moveTo(130, 290); g.quadraticCurveTo(256, 470, 382, 290); g.quadraticCurveTo(256, 340, 130, 290); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(170, 305, 172, 26); g.beginPath(); g.moveTo(140, 150); g.lineTo(220, 170); g.moveTo(372, 150); g.lineTo(292, 170); g.stroke(); }
    else { g.beginPath(); g.arc(256, 260, 110, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
  });
}

export function msgProp(world, wp, st, r, movers, ctx) {
  const P = (dx = 0, dz = 0) => [st.x + (wp.pos?.[0] ?? dx), st.z + (wp.pos?.[1] ?? dz)];
  switch (wp.kind) {
    case 'dragon': {
      const g = new THREE.Group(); const [x, z] = P(4, -3); g.position.set(x, wp.y ?? 0, z); g.rotation.y = wp.facing ?? -0.6; g.scale.setScalar(wp.scale || 1); world.add(g);
      const gr = '#2e9e4f', bl = '#ffd23f';
      box(g, 3, 3, 5, gr, 0, 2, 0, { round: 0.6 }); for (const [lx, lz] of [[-1, 1.6], [1, 1.6], [-1, -1.6], [1, -1.6]]) box(g, 0.9, 2, 0.9, gr, lx, 0, lz);
      for (let i = 0; i < 4; i++) box(g, 1.4 - i * 0.1, 1.4, 1.4, gr, 0, 4.4 + i * 1.2, 2.2 + i * 0.4, { round: 0.4 });
      box(g, 2.2, 1.8, 2.6, gr, 0, 9.2, 4, { round: 0.5 }); box(g, 1.6, 0.7, 1.4, '#3fbf5f', 0, 8.9, 5.6); for (const sx of [-0.55, 0.55]) { sphere(g, 0.32, '#ffffff', sx, 10, 5.1); sphere(g, 0.16, '#111', sx, 10, 5.38); box(g, 0.3, 1, 0.3, bl, sx, 10.7, 3.6, { rx: -0.5 }); }
      for (let i = 0; i < 6; i++) box(g, 0.5, 0.7, 0.5, bl, 0, 3.6 + i * 1.0, 1.6 + i * 0.6, { rx: 0.4 });
      for (const sx of [-1, 1]) { const w = box(g, 0.2, 4, 5, '#8e24aa', sx * 2.8, 3.6, -0.4, { rz: -sx * 0.6 }); }
      box(g, 0.9, 0.9, 4, gr, 0, 1.5, -4, { rx: 0.3 });
      g.userData.bob = true; movers.push(g); return true; }
    case 'big_L': {
      const g = new THREE.Group(); const [x, z] = P(0, 0); g.position.set(x, 0, z); g.rotation.y = wp.facing ?? 0.3; world.add(g);
      const m = M(wp.color || '#ffd23f', { rough: 0.5 }); box(g, 2.6, 12, 2.6, m, -2, 0, 0); box(g, 8, 2.6, 2.6, m, 1.3, 0, 0);
      g.userData.fall = wp.fall ?? [40, 0]; g.userData.fallAt = wp.fallAt ?? [0, 0.35]; g.userData.base = g.position.clone(); movers.push(g); return true; }
    case 'sign': {
      const g = new THREE.Group(); const [x, z] = P(3, 0); g.position.set(x, 0, z); g.rotation.y = wp.facing ?? -0.5; world.add(g);
      box(g, 0.3, 3, 0.3, '#5d4037', 0, 0, 0); box(g, 3.4, 3.4, 0.2, M('#ffffff', { map: canvasTex('signtxt' + wp.text, 340, 340, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 340, 340); c.strokeStyle = '#222'; c.lineWidth = 10; c.strokeRect(6, 6, 328, 328); c.fillStyle = '#e53935'; c.font = '86px "Luckiest Guy"'; c.textAlign = 'center'; c.fillText(wp.text || 'PERDU', 170, 130); c.fillStyle = '#222'; c.font = '150px "Luckiest Guy"'; c.fillText('?', 170, 290); }) }), 0, 2.6, 0.2);
      return true; }
    case 'ducks': {
      const [x0, z0, x1, z1] = wp.area || [-12, -60, 12, 20]; const n = wp.n || 600;
      const geoB = new THREE.BoxGeometry(1.0, 0.8, 1.2), geoH = new THREE.BoxGeometry(0.6, 0.6, 0.6), geoK = new THREE.BoxGeometry(0.35, 0.18, 0.4);
      const mb = new THREE.MeshStandardMaterial({ color: '#ffd600', roughness: 0.5 }), mk = new THREE.MeshStandardMaterial({ color: '#ff7a1a' });
      const B = new THREE.InstancedMesh(geoB, mb, n), Hh = new THREE.InstancedMesh(geoH, mb, n), K = new THREE.InstancedMesh(geoK, mk, n);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3(); const s = wp.size || 1;
      for (let i = 0; i < n; i++) { const x = st.x + r.range(x0, x1), z = st.z + r.range(z0, z1), a = r() * 6.28; e.set(0, a, 0); q.setFromEuler(e); sv.setScalar(s * r.range(0.8, 1.2));
        v.set(x, 0.4 * s + (wp.y || 0), z); m4.compose(v, q, sv); B.setMatrixAt(i, m4);
        v.set(x + Math.sin(a) * 0.45 * s, 1.1 * s + (wp.y || 0), z + Math.cos(a) * 0.45 * s); m4.compose(v, q, sv); Hh.setMatrixAt(i, m4);
        v.set(x + Math.sin(a) * 0.85 * s, 1.0 * s + (wp.y || 0), z + Math.cos(a) * 0.85 * s); m4.compose(v, q, sv); K.setMatrixAt(i, m4); }
      B.castShadow = true; world.add(B); world.add(Hh); world.add(K); return true; }
    case 'meteor': {
      const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 0), wp.y ?? 120, st.z + (wp.pos?.[1] ?? -200)); world.add(g);
      const R = wp.r || 40;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), new THREE.MeshBasicMaterial({ map: faceTexMeteor(wp.face || 'none'), fog: false }));
      ball.rotation.y = -Math.PI / 2; g.add(ball);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 24, 16), new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.35, fog: false, depthWrite: false })); g.add(glow);
      for (let i = 0; i < 10; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(R * 0.35, R * 1.6, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff4a1a' : '#ffb21a', transparent: true, opacity: 0.8, fog: false, depthWrite: false })); const a = (i / 10) * Math.PI * 2; f.position.set(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5 + R * 0.6, -R * 0.4); f.rotation.x = -0.6; g.add(f); }
      g.userData.meteor = { grow: wp.grow, base: g.position.clone(), move: wp.move }; g.lookAt(ctx.camPos || new THREE.Vector3(0, 5, 30)); movers.push(g); return true; }
    case 'water': {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wp.w || 60, wp.d || 60), new THREE.MeshStandardMaterial({ color: '#29b6f6', transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.1 }));
      m.rotation.x = -Math.PI / 2; m.position.set(st.x, 0, st.z); world.add(m); m.userData.level = wp.level || [0, 3]; m.userData.levelAt = wp.levelAt || [0.1, 0.9]; movers.push(m); return true; }
    case 'extinguishers': { for (let i = 0; i < (wp.n || 6); i++) { const [x, z] = P(-6, -9); cyl(world, 0.35, 0.35, 1.6, '#e53935', x + i * 1.0, wp.y ?? 4.5, z, { seg: 10 }); box(world, 0.3, 0.3, 0.3, '#222', x + i * 1.0, (wp.y ?? 4.5) + 1.6, z); } return true; }
    case 'bunting': { const [x, z] = P(0, -6); bunting(world, x - (wp.w || 24) / 2, x + (wp.w || 24) / 2, wp.y ?? 11, z); return true; }
    case 'tiny_rock': { const g = new THREE.Group(); world.add(g); const s0 = sphere(g, 0.5, '#8d8a84', 0, 0, 0, { seg: 8 }); s0.scale.set(1, 0.8, 1); const [x, z] = P(0, 0); g.userData.rock = { x, z, y0: wp.y0 ?? 12, top: wp.top ?? 6.5 }; movers.push(g); return true; }
    case 'egg': { const [x, z] = P(2, 2); const e = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.1, 18), M('#ffffff')); e.position.set(x, 0.06, z); e.scale.z = 0.8; world.add(e); sphere(world, 0.6, '#ffb300', x, 0.1, z, { seg: 10 }).scale.y = 0.4; return true; }
    case 'ice': { const [x, z] = P(0, 0); box(world, wp.w || 3.2, wp.h || 6.6, wp.d || 2.6, M('#bfefff', { transparent: true, opacity: 0.45, rough: 0.05 }), x, 0, z, { cast: false }); return true; }
  }
  return false;
}

export function updateMsgMovers(movers, t, u) {
  for (const g of movers) {
    const d = g.userData;
    if (d.bob) { g.position.y = Math.sin(t * 1.8) * 0.3; }
    if (d.fall) { const k = smooth(clamp((u - d.fallAt[0]) / Math.max(0.01, d.fallAt[1] - d.fallAt[0]), 0, 1)); g.position.y = lerp(d.fall[0], d.fall[1], k * k); }
    if (d.level) { const k = smooth(clamp((u - d.levelAt[0]) / Math.max(0.01, d.levelAt[1] - d.levelAt[0]), 0, 1)); g.position.y = lerp(d.level[0], d.level[1], k) + Math.sin(t * 2) * 0.05; }
    if (d.meteor) { const m = d.meteor; if (m.grow) { const s = lerp(m.grow[0], m.grow[1], smooth(u)); g.scale.setScalar(s); } if (m.move) g.position.set(m.base.x + m.move[0] * u, m.base.y + m.move[1] * u, m.base.z + m.move[2] * u); g.children[0].rotation.z = Math.sin(t * 0.8) * 0.05; }
    if (d.rock) { const R = d.rock; const ph = clamp(u * 1.6, 0, 1.6); let y; if (ph < 0.5) y = lerp(R.y0, R.top, (ph / 0.5) ** 2); else { const k = (ph - 0.5) / 1.1; y = R.top + Math.sin(k * Math.PI) * 2.5 * (1 - k) - k * R.top * (k > 0.9 ? 1 : 0); } g.position.set(R.x + (ph > 0.5 ? (ph - 0.5) * 3 : 0), Math.max(0.4, y), R.z); g.rotation.z = t * 4; }
  }
}
