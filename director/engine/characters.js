// Blocky (R6-style) avatars: rig, faces, hair, procedural animation library.
import * as THREE from 'three';
import { M, box, boxGeo, canvasTex, rng, clamp, lerp, smooth, easeOutBack } from './core.js';

// ---------------------------------------------------------------- faces ----
function drawEye(g, x, y, kind, s = 1) {
  g.save(); g.translate(x, y);
  switch (kind) {
    case 'closed':
      g.strokeStyle = '#1b1b1b'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.arc(0, -4, 16 * s, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); break;
    case 'happy':
      g.strokeStyle = '#1b1b1b'; g.lineWidth = 10; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 10, 16 * s, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); break;
    case 'wide':
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, 25 * s, 29 * s, 0, 0, 7); g.fill();
      g.lineWidth = 5; g.strokeStyle = '#1b1b1b'; g.stroke();
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.ellipse(0, 2, 9 * s, 11 * s, 0, 0, 7); g.fill(); break;
    case 'heart':
      g.fillStyle = '#e8304a'; g.beginPath();
      g.moveTo(0, 14); g.bezierCurveTo(-30, -6, -14, -30, 0, -14); g.bezierCurveTo(14, -30, 30, -6, 0, 14); g.fill(); break;
    case 'half':
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.ellipse(0, 4, 13 * s, 12 * s, 0, 0, Math.PI); g.fill();
      g.fillRect(-17, 0, 34, 6); break;
    case 'socket':
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.ellipse(0, 4, 22 * s, 26 * s, 0, 0, 7); g.fill(); break;
    case 'dollar':
      g.fillStyle = '#18a84a'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 2); break;
    default: // classic oval eye with highlight
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.ellipse(0, 0, 13 * s, 21 * s, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-4 * s, -8 * s, 4.5 * s, 6 * s, 0, 0, 7); g.fill();
  }
  g.restore();
}
function brows(g, kind) {
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 9; g.lineCap = 'round';
  const L = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  if (kind === 'angry') { L(62, 62, 108, 82); L(194, 62, 148, 82); }
  else if (kind === 'sad') { L(64, 80, 106, 64); L(192, 80, 150, 64); }
  else if (kind === 'up') { L(66, 52, 106, 48); L(150, 48, 190, 52); }
  else if (kind === 'skeptic') { L(66, 66, 106, 66); L(150, 52, 190, 60); }
}
function mouth(g, kind, open) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const cx = 128, cy = 178;
  if (open > 0.05 && !['O', 'scream', 'grin', 'laugh'].includes(kind)) {
    const hh = 6 + open * 26;
    g.fillStyle = '#5a1418'; g.beginPath();
    if (kind === 'sad' || kind === 'angry') g.ellipse(cx, cy + 6, 26, hh * 0.8, 0, 0, 7);
    else { g.moveTo(cx - 34, cy - 6); g.quadraticCurveTo(cx, cy - 2, cx + 34, cy - 6); g.quadraticCurveTo(cx, cy + hh * 1.6, cx - 34, cy - 6); }
    g.fill();
    g.fillStyle = '#e0626b'; g.beginPath(); g.ellipse(cx, cy + hh * 0.55, 14, Math.max(2, hh * 0.35), 0, 0, 7); g.fill();
    return;
  }
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 9;
  switch (kind) {
    case 'smile': g.beginPath(); g.arc(cx, cy - 30, 36, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); break;
    case 'sad': g.beginPath(); g.arc(cx, cy + 30, 30, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); break;
    case 'angry': g.beginPath(); g.moveTo(cx - 30, cy + 6); g.lineTo(cx - 10, cy); g.lineTo(cx + 10, cy); g.lineTo(cx + 30, cy + 6); g.stroke(); break;
    case 'flat': g.beginPath(); g.moveTo(cx - 22, cy); g.lineTo(cx + 22, cy); g.stroke(); break;
    case 'smirk': g.beginPath(); g.moveTo(cx - 24, cy + 4); g.quadraticCurveTo(cx + 10, cy + 10, cx + 32, cy - 10); g.stroke(); break;
    case 'wavy': g.beginPath(); g.moveTo(cx - 32, cy); for (let i = 0; i <= 8; i++) g.lineTo(cx - 32 + i * 8, cy + (i % 2 ? 7 : -5)); g.stroke(); break;
    case 'teeth': g.fillStyle = '#1b1b1b'; g.fillRect(cx - 40, cy - 8, 80, 28); g.fillStyle = '#f4f1ea'; for (let i = 0; i < 6; i++) g.fillRect(cx - 37 + i * 13, cy - 6, 10, 24); g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx - 10, cy - 22); g.lineTo(cx + 10, cy - 22); g.closePath(); g.fillStyle = '#1b1b1b'; g.fill(); break;
    case 'O': g.fillStyle = '#3a0d10'; g.beginPath(); g.ellipse(cx, cy + 4, 16 + open * 4, 22 + open * 8, 0, 0, 7); g.fill(); break;
    case 'scream': g.fillStyle = '#3a0d10'; g.beginPath(); g.ellipse(cx, cy + 6, 26, 30, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(cx - 18, cy - 22, 36, 9); break;
    case 'grin': case 'laugh':
      g.fillStyle = '#3a0d10'; g.beginPath(); g.moveTo(cx - 40, cy - 12); g.quadraticCurveTo(cx, cy - 6, cx + 40, cy - 12);
      g.quadraticCurveTo(cx, cy + 34 + open * 10, cx - 40, cy - 12); g.fill();
      g.fillStyle = '#fff'; g.fillRect(cx - 32, cy - 12, 64, 10);
      if (kind === 'laugh') { g.fillStyle = '#e0626b'; g.beginPath(); g.ellipse(cx, cy + 16, 16, 7, 0, 0, 7); g.fill(); }
      break;
    default: g.beginPath(); g.arc(cx, cy - 22, 26, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
  }
}

const FACE_DEF = {
  neutral: { eye: 'oval', brow: null, mouth: 'default' },
  happy: { eye: 'oval', brow: 'up', mouth: 'smile' },
  joy: { eye: 'happy', brow: 'up', mouth: 'laugh' },
  sad: { eye: 'oval', brow: 'sad', mouth: 'sad' },
  cry: { eye: 'closed', brow: 'sad', mouth: 'sad', tears: true },
  angry: { eye: 'oval', brow: 'angry', mouth: 'angry', blush: '#ff3b3b' },
  shocked: { eye: 'wide', brow: 'up', mouth: 'O' },
  scared: { eye: 'wide', brow: 'sad', mouth: 'wavy', sweat: true },
  smug: { eye: 'half', brow: 'skeptic', mouth: 'smirk' },
  evil: { eye: 'half', brow: 'angry', mouth: 'grin' },
  love: { eye: 'heart', brow: 'up', mouth: 'smile', blush: '#ff7aa8' },
  sleep: { eye: 'closed', brow: null, mouth: 'flat' },
  think: { eye: 'oval', brow: 'skeptic', mouth: 'flat' },
  scream: { eye: 'wide', brow: 'angry', mouth: 'scream' },
  greedy: { eye: 'dollar', brow: 'up', mouth: 'grin' },
  tired: { eye: 'half', brow: 'sad', mouth: 'flat' },
  skull: { eye: 'socket', brow: null, mouth: 'teeth' },
};
export const EXPRESSIONS = Object.keys(FACE_DEF);

function faceTexture(expr, open, blink) {
  const q = Math.round(open * 3) / 3;
  return canvasTex(`face|${expr}|${q}|${blink}`, 256, 256, (g) => {
    const d = FACE_DEF[expr] || FACE_DEF.neutral;
    if (d.blush) { g.fillStyle = d.blush + '55'; g.beginPath(); g.ellipse(58, 150, 24, 13, 0, 0, 7); g.ellipse(198, 150, 24, 13, 0, 0, 7); g.fill(); }
    const ek = blink && !['closed', 'happy', 'heart', 'dollar'].includes(d.eye) ? 'closed' : d.eye;
    drawEye(g, 86, 112, ek); drawEye(g, 170, 112, ek);
    if (d.brow) brows(g, d.brow);
    mouth(g, d.mouth, q);
    if (d.tears) { g.fillStyle = '#4fb4ff'; g.fillRect(74, 122, 14, 110); g.fillRect(166, 122, 14, 110); }
    if (d.sweat) { g.fillStyle = '#7fd0ff'; g.beginPath(); g.moveTo(222, 40); g.quadraticCurveTo(240, 76, 222, 84); g.quadraticCurveTo(204, 76, 222, 40); g.fill(); }
  });
}

// ----------------------------------------------------------- appearance ----
const SKINS = ['#f5cfa9', '#eab98f', '#d6995f', '#a86b3f', '#7a4a2a', '#f7d9b9', '#ffcc00'];
const HAIRC = ['#2b1b10', '#4a2c17', '#7a4a20', '#d8a54a', '#111111', '#b33a1a', '#e7d7b0', '#6b3fa0', '#ff6fae'];
const SHIRTS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1', '#f06292', '#ffffff', '#212121', '#3949ab', '#6d4c41'];
const PANTS = ['#1f3a68', '#2b2b2b', '#4e4e4e', '#3f51b5', '#5d4037', '#283593', '#c2185b', '#455a64'];

export function defaultAppearance(id, gender = 'm', role = '') {
  const r = rng('app|' + id);
  const fem = gender === 'f';
  const a = {
    gender,
    skin: r.pick(SKINS.slice(0, 6)),
    shirt: r.pick(SHIRTS), pants: r.pick(PANTS), shoes: r.pick(['#1b1b1b', '#ffffff', '#6d4c41', '#c62828']),
    hair: { style: fem ? r.pick(['long', 'ponytail', 'bob', 'long', 'buns']) : r.pick(['short', 'spiky', 'side', 'short', 'cap', 'fade']), color: r.pick(HAIRC.slice(0, 7)) },
    shirtDesign: r.pick(['none', 'stripe', 'logo', 'none', 'jacket', 'heart', 'star']),
    sleeves: r.pick(['short', 'short', 'long']),
    accessory: r() < 0.15 ? 'glasses' : 'none',
    scale: 1,
  };
  if (role === 'mother' || role === 'teacher_f') { a.hair.style = r.pick(['long', 'bun', 'bob']); a.shirtDesign = 'none'; a.sleeves = 'long'; }
  if (role === 'father') { a.hair.style = r.pick(['short', 'side', 'bald']); a.shirtDesign = r.pick(['none', 'jacket']); }
  if (role === 'teacher' || role === 'teacher_f') { a.accessory = 'glasses'; a.shirt = r.pick(['#5d7b9a', '#8d6e63', '#7b1fa2', '#2e7d32']); a.sleeves = 'long'; }
  if (role === 'police') { a.shirt = '#1a237e'; a.pants = '#0d1442'; a.hair.style = 'policecap'; a.shirtDesign = 'badge'; a.sleeves = 'long'; }
  if (role === 'doctor') { a.shirt = '#f5f5f5'; a.pants = '#4dd0e1'; a.shirtDesign = 'coat'; a.sleeves = 'long'; }
  if (role === 'old') { a.hair.color = '#d9d9d9'; a.hair.style = fem ? 'bun' : 'bald'; a.accessory = 'glasses'; a.sleeves = 'long'; }
  if (role === 'baby' || role === 'child') a.scale = 0.72;
  if (role === 'bully') { a.shirt = '#212121'; a.shirtDesign = 'skull'; a.hair.style = 'spiky'; a.pants = '#2b2b2b'; }
  if (role === 'rich') { a.shirt = '#111'; a.shirtDesign = 'suit'; a.sleeves = 'long'; a.pants = '#111'; a.hair.style = 'side'; a.hair.color = '#d8a54a'; }
  if (role === 'noob') { a.skin = '#ffcc00'; a.shirt = '#1e88e5'; a.pants = '#43a047'; a.hair.style = 'bald'; a.shirtDesign = 'none'; a.sleeves = 'none'; }
  return a;
}

function shirtTex(a) {
  if (!a.shirtDesign || a.shirtDesign === 'none') return null;
  return canvasTex('shirt|' + a.shirtDesign + a.shirt, 256, 256, (g, w, h) => {
    g.fillStyle = a.shirt; g.fillRect(0, 0, w, h);
    const dark = '#00000040', light = '#ffffffcc';
    switch (a.shirtDesign) {
      case 'stripe': g.fillStyle = light; g.fillRect(0, 96, w, 40); break;
      case 'ribs': g.fillStyle = '#1b1b1b'; g.fillRect(122, 20, 12, 200); for (let i = 0; i < 5; i++) { g.fillRect(40, 40 + i * 34, 76, 9); g.fillRect(140, 40 + i * 34, 76, 9); } break;
      case 'pajama': g.fillStyle = '#ffffffaa'; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(20 + (i % 6) * 44, 30 + Math.floor(i / 6) * 80, 8, 0, 7); g.fill(); } break;
      case 'plaid': g.fillStyle = '#00000040'; for (let i = 0; i < 8; i++) { g.fillRect(i * 32, 0, 10, h); g.fillRect(0, i * 32, w, 10); } break;
      case 'suspenders': g.fillStyle = a.trim || '#c62828'; g.fillRect(60, 0, 22, h); g.fillRect(174, 0, 22, h); break;
      case 'sash': g.fillStyle = '#c62828'; g.save(); g.translate(128, 128); g.rotate(-0.7); g.fillRect(-200, -22, 400, 44); g.fillStyle = '#ffd54f'; g.fillRect(-200, -26, 400, 6); g.restore(); g.fillStyle = '#ffd54f'; g.beginPath(); g.arc(150, 110, 16, 0, 7); g.fill(); break;
      case 'spots': g.fillStyle = '#1b1b1b'; for (const [x, y, rr] of [[60, 60, 34], [190, 90, 28], [110, 180, 40], [210, 210, 22], [30, 200, 20]]) { g.beginPath(); g.ellipse(x, y, rr, rr * 0.75, 0.4, 0, 7); g.fill(); } break;
      case 'trim': g.fillStyle = a.trim || '#ff7a1a'; g.fillRect(0, 0, w, 22); g.fillRect(108, 0, 40, h); g.fillStyle = '#ffffff'; g.fillRect(118, 30, 20, 226); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(128, 110, 14, 0, 7); g.fill(); g.fillStyle = '#00000030'; g.fillRect(30, 140, 50, 40); g.fillRect(176, 140, 50, 40); break;
      case 'hoodie': g.fillStyle = '#00000022'; g.fillRect(60, 150, 136, 70); g.fillStyle = '#ffffffaa'; g.fillRect(100, 0, 6, 70); g.fillRect(150, 0, 6, 70); break;
      case 'dress': g.fillStyle = '#ffffff55'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(30 + (i % 4) * 66, 40 + Math.floor(i / 4) * 80, 10, 0, 7); g.fill(); } break;
      case 'logo': g.fillStyle = light; g.beginPath(); g.arc(128, 110, 52, 0, 7); g.fill(); g.fillStyle = a.shirt; g.font = 'bold 70px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('R', 128, 114); break;
      case 'heart': g.fillStyle = '#ff4d6d'; g.beginPath(); g.moveTo(128, 160); g.bezierCurveTo(40, 90, 90, 30, 128, 80); g.bezierCurveTo(166, 30, 216, 90, 128, 160); g.fill(); break;
      case 'bolt': g.fillStyle = a.trim || '#ffd23f'; g.strokeStyle = '#1b1b1b'; g.lineWidth = 8; g.beginPath(); g.moveTo(146, 30); g.lineTo(84, 136); g.lineTo(126, 136); g.lineTo(104, 226); g.lineTo(176, 108); g.lineTo(134, 108); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#00000025'; g.fillRect(70, 200, 116, 56); break;
      case 'leather': g.fillStyle = '#00000030'; g.fillRect(0, 0, 60, h); g.fillRect(196, 0, 60, h); g.fillStyle = '#d9d9d9'; g.fillRect(124, 0, 8, h); g.fillStyle = a.trim || '#e53935'; g.fillRect(132, 0, 64, 70); break;
      case 'cardigan': g.fillStyle = '#ffffff'; g.fillRect(110, 0, 36, h); g.fillStyle = a.trim || '#ffd23f'; for (let y = 40; y < h; y += 50) { g.beginPath(); g.arc(128, y, 9, 0, 7); g.fill(); } break;
      case 'star': g.fillStyle = '#ffe14d'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 26 : 62, an = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(128 + r * Math.cos(an), 116 + r * Math.sin(an)); } g.fill(); break;
      case 'jacket': g.fillStyle = dark; g.fillRect(0, 0, 70, h); g.fillRect(186, 0, 70, h); g.fillStyle = '#ffffff55'; g.fillRect(124, 0, 8, h); break;
      case 'coat': g.fillStyle = '#d9d9d9'; g.fillRect(122, 0, 12, h); g.fillStyle = '#4dd0e1'; g.fillRect(100, 0, 56, 60); g.fillStyle = '#e53935'; g.fillRect(170, 60, 40, 10); g.fillRect(185, 45, 10, 40); break;
      case 'badge': g.fillStyle = '#ffd54f'; g.beginPath(); g.moveTo(180, 50); g.lineTo(210, 60); g.lineTo(205, 100); g.lineTo(180, 115); g.lineTo(155, 100); g.lineTo(150, 60); g.fill(); g.fillStyle = '#0d1442'; g.fillRect(0, 200, w, 56); break;
      case 'skull': g.fillStyle = '#eee'; g.beginPath(); g.arc(128, 100, 44, 0, 7); g.fill(); g.fillRect(100, 120, 56, 36); g.fillStyle = '#111'; g.beginPath(); g.arc(110, 100, 12, 0, 7); g.arc(146, 100, 12, 0, 7); g.fill(); break;
      case 'suit': g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(90, 0); g.lineTo(128, 120); g.lineTo(166, 0); g.fill(); g.fillStyle = '#c62828'; g.beginPath(); g.moveTo(118, 10); g.lineTo(138, 10); g.lineTo(134, 110); g.lineTo(128, 125); g.lineTo(122, 110); g.fill(); break;
    }
  });
}

function addHair(head, a) {
  const c = a.hair.color, s = a.hair.style;
  const hm = M(c, { rough: 0.8 });
  const H = (w, h, d, x, y, z, o = {}) => { const m = new THREE.Mesh(boxGeo(w, h, d, o.round ?? 0.08), o.mat || hm); m.position.set(x, y, z); m.castShadow = true; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; head.add(m); return m; };
  // head is 1.25 cube centred at 0 (local)
  switch (s) {
    case 'bald': break;
    case 'curly': H(1.4, 0.4, 1.4, 0, 0.62, 0); for (let i = 0; i < 9; i++) H(0.62, 0.5, 0.62, -0.45 + (i % 3) * 0.45, 0.9 + Math.floor(i / 3) * 0.28 - (i % 2) * 0.05, -0.45 + Math.floor(i / 3) * 0.42, { round: 0.22 }); H(1.4, 0.7, 0.35, 0, 0.3, -0.55); H(0.2, 0.55, 1.0, 0.66, 0.35, -0.1); H(0.2, 0.55, 1.0, -0.66, 0.35, -0.1); break;
    case 'sunhat': { H(1.38, 0.4, 1.38, 0, 0.6, 0); H(1.46, 1.6, 0.4, 0, -0.2, -0.56); const hm2 = M(a.hatColor || '#e9c46a', { rough: 0.9 }); H(2.6, 0.12, 2.6, 0, 0.82, 0, { mat: hm2, round: 0.05 }); H(1.4, 0.6, 1.4, 0, 1.1, 0, { mat: hm2 }); H(1.42, 0.16, 1.42, 0, 0.92, 0, { mat: M('#e76f51') }); break; }
    case 'cap_green': H(1.42, 0.42, 1.42, 0, 0.66, 0, { mat: M(a.hatColor || '#2e9e4f') }); H(1.2, 0.1, 0.7, 0, 0.47, 0.9, { mat: M(a.hatColor || '#2e9e4f') }); H(1.36, 0.4, 0.3, 0, 0.3, -0.56); break;
    case 'short': H(1.36, 0.36, 1.36, 0, 0.62, -0.02); H(1.36, 0.5, 0.3, 0, 0.3, -0.56); H(0.18, 0.5, 1.1, 0.64, 0.33, -0.1); H(0.18, 0.5, 1.1, -0.64, 0.33, -0.1); H(1.0, 0.18, 0.2, 0.1, 0.48, 0.6); break;
    case 'fade': H(1.32, 0.3, 1.32, 0, 0.6, 0); break;
    case 'side': H(1.38, 0.4, 1.38, 0, 0.64, 0); H(1.38, 0.5, 0.3, 0, 0.3, -0.56); H(0.9, 0.3, 0.3, 0.25, 0.5, 0.6, { rz: -0.25 }); H(0.18, 0.4, 1.1, 0.64, 0.33, -0.1); H(0.18, 0.4, 1.1, -0.64, 0.33, -0.1); break;
    case 'spiky': H(1.36, 0.3, 1.36, 0, 0.6, 0); for (let i = 0; i < 5; i++) H(0.36, 0.55, 0.36, -0.48 + i * 0.24, 0.85 + (i % 2) * 0.1, (i % 2 ? -0.2 : 0.2), { rz: (i - 2) * 0.22 }); H(1.36, 0.5, 0.3, 0, 0.3, -0.56); break;
    case 'cap': H(1.4, 0.42, 1.4, 0, 0.66, 0, { mat: M(a.shirt === '#ffffff' ? '#e53935' : a.shirt, { rough: 0.6 }) }); H(1.2, 0.1, 0.7, 0, 0.47, 0.9, { mat: M(a.shirt === '#ffffff' ? '#e53935' : a.shirt) }); break;
    case 'policecap': H(1.44, 0.4, 1.44, 0, 0.7, 0, { mat: M('#0d1442') }); H(1.3, 0.1, 0.6, 0, 0.5, 0.85, { mat: M('#111') }); H(0.3, 0.3, 0.05, 0, 0.72, 0.73, { mat: M('#ffd54f', { metal: 0.4 }) }); break;
    case 'long': H(1.42, 0.4, 1.42, 0, 0.64, 0); H(1.46, 1.9, 0.4, 0, -0.25, -0.56); H(0.24, 1.6, 1.0, 0.7, -0.1, -0.1); H(0.24, 1.6, 1.0, -0.7, -0.1, -0.1); H(1.0, 0.24, 0.2, -0.12, 0.5, 0.62, { rz: 0.12 }); break;
    case 'bob': H(1.42, 0.4, 1.42, 0, 0.64, 0); H(1.46, 1.1, 0.4, 0, 0.1, -0.56); H(0.24, 1.0, 1.1, 0.7, 0.12, -0.05); H(0.24, 1.0, 1.1, -0.7, 0.12, -0.05); H(1.2, 0.26, 0.2, 0, 0.5, 0.62); break;
    case 'ponytail': H(1.4, 0.4, 1.4, 0, 0.64, 0); H(1.4, 0.7, 0.3, 0, 0.3, -0.56); H(0.45, 1.6, 0.45, 0, -0.1, -0.95, { rx: 0.25 }); H(0.2, 0.7, 1.1, 0.68, 0.3, -0.05); H(0.2, 0.7, 1.1, -0.68, 0.3, -0.05); break;
    case 'bun': H(1.38, 0.36, 1.38, 0, 0.62, 0); H(1.38, 0.7, 0.3, 0, 0.3, -0.56); H(0.6, 0.55, 0.6, 0, 0.95, -0.35); break;
    case 'buns': H(1.4, 0.4, 1.4, 0, 0.64, 0); H(0.55, 0.55, 0.55, 0.55, 0.95, -0.1); H(0.55, 0.55, 0.55, -0.55, 0.95, -0.1); H(1.4, 0.9, 0.3, 0, 0.2, -0.56); break;
  }
  if (a.beard) { const bm = M(a.hair.color, { rough: 0.9 }); H(1.34, 0.34, 0.3, 0, -0.6, 0.56, { mat: bm }); H(0.3, 0.9, 1.0, 0.6, -0.1, 0.1, { mat: bm }); H(0.3, 0.9, 1.0, -0.6, -0.1, 0.1, { mat: bm }); H(0.9, 0.4, 0.3, 0, -0.8, 0.5, { mat: bm }); }
  if (a.goggles) { H(1.42, 0.18, 1.42, 0, 0.42, 0, { mat: M('#5d4037') }); for (const x of [-0.3, 0.3]) H(0.42, 0.36, 0.2, x, 0.45, 0.66, { mat: M('#80deea', { rough: 0.1, metal: 0.3 }) }); }
  if (a.topHat) { H(2.0, 0.12, 2.0, 0, 0.66, 0, { mat: M('#141414'), round: 0.04 }); H(1.25, 1.6, 1.25, 0, 1.5, 0, { mat: M('#141414') }); H(1.27, 0.25, 1.27, 0, 0.85, 0, { mat: M('#c62828') }); }
  if (a.hat === 'fedora') { H(2.0, 0.12, 2.0, 0, 0.66, 0, { mat: M('#6d4c41'), round: 0.04 }); H(1.35, 0.6, 1.35, 0, 0.95, 0, { mat: M('#6d4c41') }); H(1.37, 0.18, 1.37, 0, 0.75, 0, { mat: M('#3e2723') }); }
  if (a.needle) {
    const nm = M('#ffd54f', { metal: 0.9, rough: 0.15, emissive: '#ffb300', ei: 0.8 });
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), nm); n.position.set(0.15, 0.98, -0.32); n.rotation.z = 1.1; n.rotation.x = 0.3; head.add(n);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), nm); tip.position.set(-0.52, 1.3, -0.22); head.add(tip); head.userData.needle = tip;
  }
  if (a.pacifier) { H(0.5, 0.36, 0.12, 0, -0.32, 0.66, { mat: M('#ff8fb1'), round: 0.1 }); H(0.2, 0.2, 0.2, 0, -0.32, 0.76, { mat: M('#ffd23f'), round: 0.08 }); }
  if (a.bow) { const bm = M(a.bow); H(0.5, 0.36, 0.2, -0.32, 0.9, 0.2, { mat: bm, rz: 0.4 }); H(0.5, 0.36, 0.2, 0.32, 0.9, 0.2, { mat: bm, rz: -0.4 }); H(0.2, 0.2, 0.22, 0, 0.9, 0.2, { mat: bm }); }
  if (a.mustache) { H(0.9, 0.2, 0.12, 0, -0.18, 0.66, { mat: M(a.hair.color || '#3e2723'), round: 0.08 }); }
  if (a.headset) { H(1.42, 0.14, 0.3, 0, 0.66, 0, { mat: M('#222') }); for (const sx of [-0.7, 0.7]) H(0.2, 0.5, 0.5, sx, 0.1, 0, { mat: M('#26c6da') }); }
  if (a.cow) {
    const wm = M('#f4f1ea'), pm = M('#f4a6b8'), hm2 = M('#e9d8a6');
    H(1.1, 0.55, 0.4, 0, -0.36, 0.66, { mat: pm, round: 0.15 }); for (const x of [-0.22, 0.22]) H(0.14, 0.14, 0.05, x, -0.33, 0.87, { mat: M('#7a3b4a') });
    for (const sx of [-1, 1]) { H(0.18, 0.5, 0.18, sx * 0.48, 0.82, 0, { mat: hm2, rz: -sx * 0.4 }); H(0.5, 0.26, 0.2, sx * 0.85, 0.35, 0, { mat: wm, rz: sx * 0.3 }); }
    H(0.5, 0.3, 0.06, 0.3, 0.5, 0.64, { mat: M('#1b1b1b') });
  }
  if (a.accessory === 'glasses' || a.accessory === 'sunglasses') {
    const gm = M(a.accessory === 'sunglasses' ? '#111' : '#222', { rough: 0.3 });
    const lens = a.accessory === 'sunglasses' ? M('#111', { rough: 0.1, metal: 0.3 }) : M('#cfe8ff', { transparent: true, opacity: 0.35, rough: 0.1 });
    for (const x of [-0.27, 0.27]) {
      if (a.accessory === 'sunglasses') { const fr = new THREE.Mesh(boxGeo(0.42, 0.34, 0.04, 0), gm); fr.position.set(x, 0.1, 0.65); head.add(fr); }
      else for (const [w, h, dx, dy] of [[0.44, 0.05, 0, 0.16], [0.44, 0.05, 0, -0.14], [0.05, 0.34, -0.2, 0.01], [0.05, 0.34, 0.2, 0.01]]) { const rim = new THREE.Mesh(boxGeo(w, h, 0.04, 0), gm); rim.position.set(x + dx, 0.1 + dy, 0.655); head.add(rim); }
      if (a.accessory === 'sunglasses') { const ln = new THREE.Mesh(boxGeo(0.34, 0.26, 0.05, 0), lens); ln.position.set(x, 0.1, 0.665); head.add(ln); }
    }
    const br = new THREE.Mesh(boxGeo(0.14, 0.05, 0.04, 0), gm); br.position.set(0, 0.16, 0.65); head.add(br);
  }
}

// --------------------------------------------------------------- avatar ----
export class Avatar {
  constructor(id, app) {
    this.id = id; this.app = app;
    const a = app;
    const root = this.root = new THREE.Group();
    const inner = this.inner = new THREE.Group(); root.add(inner);
    inner.scale.setScalar(a.scale || 1);
    const R = 0.1;
    const skin = M(a.skin, { rough: 0.55 });
    const shirtMap = shirtTex(a);
    const shirtFront = shirtMap ? M('#ffffff', { map: shirtMap, rough: 0.7 }) : M(a.shirt, { rough: 0.7 });
    const shirt = M(a.shirt, { rough: 0.7 });
    const pants = M(a.pants, { rough: 0.75 });
    const shoes = M(a.shoes, { rough: 0.6 });

    // legs
    this.legs = [];
    for (const sx of [-0.5, 0.5]) {
      const p = new THREE.Group(); p.position.set(sx, 2, 0); inner.add(p);
      const leg = new THREE.Mesh(boxGeo(0.98, 1.7, 0.98, R), pants); leg.position.y = -0.85; leg.castShadow = true; p.add(leg);
      const sh = new THREE.Mesh(boxGeo(1.0, 0.34, 1.08, R), shoes); sh.position.set(0, -1.83, 0.04); sh.castShadow = true; p.add(sh);
      this.legs.push(p);
    }
    if (a.dress) { const sk = new THREE.Mesh(boxGeo(2.3, 1.3, 1.35, 0.15), shirt); sk.position.set(0, 1.45, 0); sk.castShadow = true; inner.add(sk); }
    // body (everything above hips)
    const body = this.body = new THREE.Group(); body.position.y = 2; inner.add(body);
    const torsoMats = [shirt, shirt, shirt, shirt, shirtFront, shirt];
    const torso = new THREE.Mesh(boxGeo(2, 2, 1, R), torsoMats); torso.position.y = 1; torso.castShadow = true; torso.receiveShadow = true; body.add(torso);
    // arms
    this.arms = [];
    for (const sx of [-1.5, 1.5]) {
      const p = new THREE.Group(); p.position.set(sx, 1.9, 0); body.add(p);
      const sl = a.sleeves === 'long' ? 1.9 : a.sleeves === 'none' ? 0 : 0.8;
      if (sl > 0) { const s = new THREE.Mesh(boxGeo(1.0, sl, 1.0, R), shirt); s.position.y = 0.05 - sl / 2; s.castShadow = true; p.add(s); }
      const skl = 2 - sl; if (skl > 0.05) { const h = new THREE.Mesh(boxGeo(0.96, skl, 0.96, R), skin); h.position.y = 0.05 - sl - skl / 2; h.castShadow = true; p.add(h); }
      const hand = new THREE.Group(); hand.position.y = -1.85; p.add(hand); p.userData.hand = hand;
      this.arms.push(p);
    }
    // head
    const neck = this.neck = new THREE.Group(); neck.position.y = 2.0; body.add(neck);
    const head = this.head = new THREE.Group(); head.position.y = 0.68; neck.add(head);
    const hm = new THREE.Mesh(boxGeo(1.25, 1.25, 1.25, 0.22), skin); hm.castShadow = true; head.add(hm);
    this.faceMat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.7, map: faceTexture('neutral', 0, false), polygonOffset: true, polygonOffsetFactor: -2 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.12), this.faceMat); face.position.z = 0.627; head.add(face);
    addHair(head, a);
    // goat transformation (hidden until av.setGoat(true))
    const goat = this.goatHead = new THREE.Group(); goat.visible = false; neck.add(goat); goat.position.y = 0.72;
    { const gw = M('#f4f1ea', { rough: 0.8 }), gh = M('#c9a46a'), gd = M('#1b1b1b'), gp = M('#f4a6b8');
      const G = (w, h, d, x, y, z, m, o = {}) => { const mm = new THREE.Mesh(boxGeo(w, h, d, o.round ?? 0.12), m); mm.position.set(x, y, z); if (o.rx) mm.rotation.x = o.rx; if (o.rz) mm.rotation.z = o.rz; mm.castShadow = true; goat.add(mm); return mm; };
      G(1.2, 1.2, 1.3, 0, 0, 0, gw); G(0.9, 0.8, 0.9, 0, -0.25, 0.85, gw); G(0.6, 0.25, 0.1, 0, -0.2, 1.31, gp);
      for (const sx of [-1, 1]) { G(0.26, 0.26, 0.06, sx * 0.34, 0.34, 0.68, gd); G(0.36, 0.36, 0.05, sx * 0.34, 0.36, 0.66, M('#ffffff')); G(0.62, 0.22, 0.3, sx * 0.8, 0.15, 0, gw, { rz: sx * 0.5 }); G(0.22, 0.7, 0.22, sx * 0.32, 0.75, -0.15, gh, { rx: -0.5, rz: -sx * 0.35 }); }
      G(0.3, 0.55, 0.3, 0, -0.85, 0.85, M('#d9d4c8')); }
    this.expr = 'neutral'; this.talk = false; this.prop = null; this.fx = [];
    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }
  get hand() { return this.arms[1].userData.hand; }
  get handL() { return this.arms[0].userData.hand; }
  headWorld(v = new THREE.Vector3()) { return this.head.getWorldPosition(v); }

  setGoat(on) { this.goatHead.visible = on; this.head.visible = !on; }
  setFace(expr, open, blink) {
    this.faceMat.map = faceTexture(expr, open, blink);
  }
  resetPose() {
    this.inner.position.set(0, 0, 0); this.inner.rotation.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0); this.body.position.set(0, 2, 0);
    this.neck.rotation.set(0, 0, 0);
    for (const l of this.legs) l.rotation.set(0, 0, 0);
    for (const a of this.arms) a.rotation.set(0, 0, 0);
  }
}

// ------------------------------------------------------------ animation ----
// Each action sets pose for local time t (s). Returns suggested expression.
const S = Math.sin, C = Math.cos;
export const ACTIONS = {
  idle(av, t, p) {
    const b = S(t * 2.2 + p.phase) * 0.04;
    av.arms[0].rotation.z = -0.06 - b; av.arms[1].rotation.z = 0.06 + b;
    av.neck.rotation.y = S(t * 0.7 + p.phase) * 0.12; av.neck.rotation.x = S(t * 1.1) * 0.03;
    av.body.position.y = 2 + Math.abs(S(t * 1.1)) * 0.02;
  },
  talk(av, t, p) {
    ACTIONS.idle(av, t, p);
    const g = S(t * 3.1 + p.phase);
    av.arms[1].rotation.x = -0.5 - 0.35 * Math.max(0, g); av.arms[1].rotation.z = 0.25 + 0.15 * S(t * 2.3);
    av.arms[0].rotation.x = -0.15 * Math.max(0, -g);
    av.neck.rotation.x = S(t * 4.2) * 0.07; av.neck.rotation.y = S(t * 1.3 + p.phase) * 0.18;
    av.body.rotation.y = S(t * 1.6) * 0.06;
  },
  walk(av, t, p) {
    const w = t * 2 * Math.PI * 1.7, s = S(w);
    av.legs[0].rotation.x = s * 0.65; av.legs[1].rotation.x = -s * 0.65;
    av.arms[0].rotation.x = -s * 0.6; av.arms[1].rotation.x = s * 0.6;
    av.arms[0].rotation.z = -0.05; av.arms[1].rotation.z = 0.05;
    av.inner.position.y = Math.abs(C(w)) * 0.12;
    av.neck.rotation.y = S(t * 0.8) * 0.1;
  },
  run(av, t, p) {
    const w = t * 2 * Math.PI * 2.6, s = S(w);
    av.legs[0].rotation.x = s * 1.05; av.legs[1].rotation.x = -s * 1.05;
    av.arms[0].rotation.x = -s * 1.1; av.arms[1].rotation.x = s * 1.1;
    av.inner.rotation.x = 0.18; av.inner.position.y = Math.abs(C(w)) * 0.3;
  },
  cry(av, t, p) {
    av.arms[1].rotation.x = -2.35 + S(t * 6) * 0.12; av.arms[1].rotation.z = 0.95;
    av.arms[0].rotation.x = 0.05; av.arms[0].rotation.z = -0.08;
    av.neck.rotation.x = 0.22 + S(t * 9) * 0.04;
    av.body.rotation.x = 0.12; av.body.rotation.z = S(t * 14) * 0.025;
    av.body.position.y = 2 - 0.05 + S(t * 7) * 0.03;
  },
  sad(av, t, p) {
    av.neck.rotation.x = 0.42; av.body.rotation.x = 0.1;
    av.arms[0].rotation.z = -0.02; av.arms[1].rotation.z = 0.02;
    av.arms[0].rotation.x = 0.05 * S(t); av.neck.rotation.y = S(t * 0.5) * 0.08;
  },
  shocked(av, t, p) {
    const k = easeOutBack(t / 0.35);
    av.arms[0].rotation.z = -2.4 * k; av.arms[1].rotation.z = 2.4 * k;
    av.arms[0].rotation.x = -0.3 * k; av.arms[1].rotation.x = -0.3 * k;
    av.inner.position.y = Math.max(0, S(clamp(t / 0.45, 0, 1) * Math.PI)) * 1.1;
    av.body.rotation.x = -0.15 * k; av.neck.rotation.x = -0.12 * k;
    av.body.rotation.z = S(t * 30) * 0.02 * (t > 0.4 ? 1 : 0);
  },
  angry(av, t, p) {
    const sh = S(t * 26) * 0.03;
    av.arms[0].rotation.z = -0.35; av.arms[1].rotation.z = 0.35;
    av.arms[0].rotation.x = -0.25 + S(t * 6) * 0.15; av.arms[1].rotation.x = -0.25 - S(t * 6) * 0.15;
    av.body.rotation.x = 0.12; av.body.rotation.z = sh; av.neck.rotation.x = 0.12;
    av.inner.position.y = Math.max(0, S(t * 7)) * 0.18; // stomping
  },
  scared(av, t, p) {
    const tr = S(t * 38) * 0.03;
    av.arms[0].rotation.x = -1.8; av.arms[1].rotation.x = -1.8; av.arms[0].rotation.z = 0.55; av.arms[1].rotation.z = -0.55;
    av.body.rotation.x = -0.12; av.body.rotation.z = tr; av.inner.position.x = tr;
    av.neck.rotation.y = S(t * 3.2) * 0.35;
  },
  jump(av, t, p) {
    const ph = (t * 1.6) % 1, hgt = S(ph * Math.PI);
    av.inner.position.y = hgt * 3.2;
    av.arms[0].rotation.z = -2.7 * hgt; av.arms[1].rotation.z = 2.7 * hgt;
    av.legs[0].rotation.x = -0.4 * hgt; av.legs[1].rotation.x = 0.3 * hgt;
  },
  celebrate(av, t, p) {
    const ph = (t * 2.2) % 1, hgt = S(ph * Math.PI);
    av.inner.position.y = hgt * 1.6;
    av.arms[0].rotation.z = -2.6 - 0.3 * S(t * 12); av.arms[1].rotation.z = 2.6 + 0.3 * S(t * 12 + 1);
    av.neck.rotation.x = -0.15;
  },
  dance(av, t, p) {
    const w = t * 2 * Math.PI * 2;
    av.arms[0].rotation.z = -1.4 - 1.0 * S(w); av.arms[1].rotation.z = 1.4 - 1.0 * S(w);
    av.body.rotation.y = S(w / 2) * 0.35; av.inner.position.y = Math.abs(S(w)) * 0.35;
    av.legs[0].rotation.z = Math.max(0, S(w)) * 0.3; av.legs[1].rotation.z = -Math.max(0, -S(w)) * 0.3;
    av.neck.rotation.z = S(w) * 0.15;
  },
  wave(av, t, p) {
    ACTIONS.idle(av, t, p);
    av.arms[1].rotation.z = 2.6 + S(t * 9) * 0.35; av.arms[1].rotation.x = -0.1;
  },
  point(av, t, p) {
    ACTIONS.idle(av, t, p);
    const k = smooth(t / 0.3);
    av.arms[1].rotation.x = -1.6 * k; av.arms[1].rotation.z = 0.15 * k + S(t * 5) * 0.03;
    av.body.rotation.x = -0.05; av.neck.rotation.x = -0.05;
  },
  think(av, t, p) {
    av.arms[1].rotation.x = -2.3; av.arms[1].rotation.z = 0.75;
    av.arms[0].rotation.x = -0.9; av.arms[0].rotation.z = -0.65;
    av.neck.rotation.z = 0.12 + S(t * 1.2) * 0.05; av.neck.rotation.x = -0.12; av.neck.rotation.y = S(t * 0.8) * 0.15;
  },
  phone(av, t, p) {
    ACTIONS.idle(av, t, p);
    av.arms[1].rotation.x = -2.65; av.arms[1].rotation.z = 0.95;
    av.neck.rotation.z = 0.12;
  },
  text(av, t, p) {
    av.arms[1].rotation.x = -1.3; av.arms[1].rotation.z = 0.55; av.arms[0].rotation.x = -1.3; av.arms[0].rotation.z = -0.55;
    av.neck.rotation.x = 0.42; av.arms[1].rotation.y = S(t * 9) * 0.04;
  },
  hug(av, t, p) {
    const k = smooth(t / 0.5);
    av.arms[0].rotation.x = -1.45 * k; av.arms[1].rotation.x = -1.45 * k;
    av.arms[0].rotation.z = 0.5 * k; av.arms[1].rotation.z = -0.5 * k;
    av.body.rotation.x = 0.08 * k;
  },
  punch(av, t, p) {
    const ph = (t * 3) % 1, side = Math.floor(t * 3) % 2;
    const ext = S(Math.min(1, ph * 2) * Math.PI);
    av.arms[side].rotation.x = -1.6 * ext; av.arms[1 - side].rotation.x = -0.9;
    av.body.rotation.y = (side ? -0.3 : 0.3) * ext; av.body.rotation.x = 0.1;
    av.legs[0].rotation.x = 0.3; av.legs[1].rotation.x = -0.3;
  },
  push(av, t, p) {
    const k = smooth(t / 0.25);
    av.arms[0].rotation.x = -1.55 * k; av.arms[1].rotation.x = -1.55 * k; av.inner.rotation.x = 0.2 * k;
    av.legs[0].rotation.x = 0.4 * k; av.legs[1].rotation.x = -0.4 * k;
  },
  fall(av, t, p) {
    const k = smooth(t / 0.55);
    av.inner.rotation.x = -Math.PI / 2 * k; av.inner.position.y = 0.55 * k; av.inner.position.z = -1.5 * k;
    av.arms[0].rotation.z = -1.2 * k; av.arms[1].rotation.z = 1.2 * k;
    av.legs[0].rotation.z = -0.2 * k; av.legs[1].rotation.z = 0.2 * k;
  },
  lie(av, t, p) {
    av.inner.rotation.x = -Math.PI / 2; av.inner.position.y = 0.55; av.inner.position.z = -1.5;
    av.arms[0].rotation.z = -0.1; av.arms[1].rotation.z = 0.1;
    av.body.position.y = 2 + S(t * 1.5) * 0.02;
  },
  sleep(av, t, p) { ACTIONS.lie(av, t, p); },
  sit(av, t, p) {
    av.legs[0].rotation.x = -1.57; av.legs[1].rotation.x = -1.57;
    av.arms[0].rotation.x = -0.55; av.arms[1].rotation.x = -0.55 + S(t * 2) * 0.05;
    av.neck.rotation.y = S(t * 0.6 + p.phase) * 0.15;
    av.inner.position.y = (p.seat ?? 2.0) - 2.0;
  },
  sit_work(av, t, p) {
    ACTIONS.sit(av, t, p);
    av.arms[0].rotation.x = -1.0 + S(t * 11) * 0.06; av.arms[1].rotation.x = -1.0 + S(t * 11 + 1.5) * 0.06;
    av.arms[0].rotation.z = 0.2; av.arms[1].rotation.z = -0.2;
    av.neck.rotation.x = 0.38; av.neck.rotation.y = S(t * 0.7) * 0.06;
  },
  sit_sad(av, t, p) { ACTIONS.sit(av, t, p); av.neck.rotation.x = 0.45; av.body.rotation.x = 0.15; },
  sit_talk(av, t, p) { ACTIONS.sit(av, t, p); av.arms[1].rotation.x = -0.9 - 0.3 * Math.max(0, S(t * 3)); av.neck.rotation.x = S(t * 4) * 0.06; },
  eat(av, t, p) {
    ACTIONS.idle(av, t, p);
    const ph = (S(t * 3) + 1) / 2; av.arms[1].rotation.x = -1.0 - 1.4 * ph; av.arms[1].rotation.z = 0.5 * ph;
  },
  laugh(av, t, p) {
    av.body.position.y = 2 + Math.abs(S(t * 11)) * 0.12; av.neck.rotation.x = -0.25 + S(t * 11) * 0.05;
    av.arms[0].rotation.x = -0.6; av.arms[1].rotation.x = -0.6; av.arms[0].rotation.z = 0.4; av.arms[1].rotation.z = -0.4;
    av.body.rotation.x = -0.08;
  },
  look_around(av, t, p) {
    ACTIONS.idle(av, t, p);
    av.neck.rotation.y = S(t * 2.2) * 0.75; av.body.rotation.y = S(t * 2.2 - 0.4) * 0.2;
  },
  kneel(av, t, p) {
    av.inner.position.y = -0.9; av.legs[0].rotation.x = -1.4; av.legs[1].rotation.x = 0.2;
    av.arms[0].rotation.x = -1.2; av.arms[1].rotation.x = -1.2; av.arms[0].rotation.z = 0.4; av.arms[1].rotation.z = -0.4;
    av.neck.rotation.x = -0.25;
  },
  sneak(av, t, p) {
    const w = t * 2 * Math.PI * 1.1, s = S(w);
    av.legs[0].rotation.x = s * 0.5; av.legs[1].rotation.x = -s * 0.5;
    av.arms[0].rotation.x = -1.0; av.arms[1].rotation.x = -1.0; av.inner.rotation.x = 0.3; av.inner.position.y = -0.3;
    av.neck.rotation.y = S(t * 1.5) * 0.4;
  },
  dig(av, t, p) {
    const ph = (t * 1.8) % 1, k = Math.sin(ph * Math.PI * 2);
    av.body.rotation.x = 0.55 + 0.15 * k; av.arms[0].rotation.x = -1.2 - 0.6 * k; av.arms[1].rotation.x = -1.2 - 0.6 * k; av.neck.rotation.x = -0.2;
    av.legs[0].rotation.x = 0.2; av.legs[1].rotation.x = -0.2;
  },
  hold_up(av, t, p) { av.arms[1].rotation.z = 2.9; av.arms[1].rotation.x = -0.2; av.arms[0].rotation.z = -0.3; av.neck.rotation.x = -0.3; av.body.position.y = 2 + Math.sin(t * 2) * 0.03; },
  carry_armful(av, t, p) { ACTIONS.walk(av, t, p); av.arms[0].rotation.x = -1.4; av.arms[1].rotation.x = -1.4; av.arms[0].rotation.z = 0.15; av.arms[1].rotation.z = -0.15; },
  point_cam(av, t, p) { ACTIONS.idle(av, t, p); av.arms[1].rotation.x = -1.5; av.arms[1].rotation.z = 0.35 + Math.sin(t * 6) * 0.05; av.arms[1].rotation.y = 0.3; },
  look_down(av, t, p) { ACTIONS.idle(av, t, p); av.neck.rotation.x = 0.55; av.neck.rotation.y = 0.1; },
  build(av, t, p) {
    const ph = (t * 2.2) % 1; av.arms[1].rotation.x = -2.4 + Math.min(1, ph * 3) * 1.6; av.arms[0].rotation.x = -0.9; av.body.rotation.x = 0.15; av.neck.rotation.x = 0.25;
  },
  carry(av, t, p) { ACTIONS.walk(av, t, p); av.arms[0].rotation.x = -1.2; av.arms[1].rotation.x = -1.2; av.arms[0].rotation.z = 0.3; av.arms[1].rotation.z = -0.3; },
  give(av, t, p) {
    ACTIONS.idle(av, t, p); const k = smooth(t / 0.4);
    av.arms[1].rotation.x = -1.35 * k; av.arms[0].rotation.x = -1.35 * k; av.arms[0].rotation.z = 0.25 * k; av.arms[1].rotation.z = -0.25 * k;
  },
  drive(av, t, p) {
    ACTIONS.sit(av, t, p); av.arms[0].rotation.x = -1.3; av.arms[1].rotation.x = -1.3 + S(t * 2) * 0.1;
  },
};

export const ACTION_FACE = {
  idle: 'neutral', talk: 'neutral', walk: 'neutral', run: 'neutral', cry: 'cry', sad: 'sad', shocked: 'shocked',
  angry: 'angry', scared: 'scared', jump: 'joy', celebrate: 'joy', dance: 'joy', wave: 'happy', point: 'neutral',
  think: 'think', phone: 'neutral', text: 'neutral', hug: 'happy', punch: 'angry', push: 'angry', fall: 'shocked', lie: 'tired',
  sleep: 'sleep', sit: 'neutral', sit_work: 'think', sit_sad: 'sad', sit_talk: 'neutral', eat: 'happy', laugh: 'joy', look_around: 'scared',
  dig: 'neutral', hold_up: 'neutral', carry_armful: 'happy', point_cam: 'happy', look_down: 'neutral', build: 'happy', carry: 'neutral', kneel: 'sad', sneak: 'smug', give: 'happy', drive: 'neutral',
};
export const TALKING_ACTIONS = new Set(['talk', 'sit_talk', 'phone', 'laugh', 'scream']);
