// Shot renderer: builds one shot from a JSON spec and renders deterministic frames.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { M, box, boxGeo, cyl, sphere, canvasTex, textTex, rng, hash, clamp, lerp, smooth, easeInOut, easeOutExpo, easeOutBack, shade } from './core.js';
import { Avatar, ACTIONS, ACTION_FACE, TALKING_ACTIONS, defaultAppearance } from './characters.js';
import { ENVIRONMENTS as BASE_ENV, setupLighting, car } from './environments.js';
import { TOWN_ENVIRONMENTS } from './env_town.js';
import { FARM_ENVIRONMENTS, looseStraw, haystack } from './env_farm.js';
import { MSG_ENVIRONMENTS, msgProp, updateMsgMovers } from './env_msg.js';
import { SILO_ENVIRONMENTS, siloProp, updateSiloMovers } from './env_silo.js';
const ENVIRONMENTS = { ...BASE_ENV, ...TOWN_ENVIRONMENTS, ...FARM_ENVIRONMENTS, ...MSG_ENVIRONMENTS, ...SILO_ENVIRONMENTS };
const EMOJI_FONT = '"Poppins", "Noto Color Emoji", sans-serif';
function bubbleTex(text) {
  return canvasTex('bubble|' + text, 1024, 256, (g, w, h) => {
    g.font = `700 92px ${EMOJI_FONT}`; const tw = Math.min(w - 60, g.measureText(text).width + 90);
    const x0 = (w - tw) / 2; g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.roundRect(x0 + 6, 46, tw, 170, 60); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(x0, 36, tw, 170, 60); g.fill();
    g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 124);
  });
}
const SHADOW_ONLY = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function shadowOnly(obj) { obj.traverse(o => { if (o.isMesh) { o.material = SHADOW_ONLY; o.castShadow = true; o.receiveShadow = false; } if (o.isSprite) o.visible = false; }); }
function setCast(obj, on) { obj.traverse(o => { if (o.isMesh) o.castShadow = on; }); }

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
// ---- HQ pipeline (image-based light + ambient occlusion + bloom), toggle with ?hq=0
const HQ = Q.get('hq') === '1';
const POST = Q.get('post') === '1';
if (Q.get('tm') === 'aces') renderer.toneMapping = THREE.ACESFilmicToneMapping; else if (Q.get('tm') === 'agx') renderer.toneMapping = THREE.AgXToneMapping;
const PMREM = new THREE.PMREMGenerator(renderer);
const ENV_TEX = PMREM.fromScene(new RoomEnvironment(), 0.04).texture;
let composer = null, gtao = null, bloom = null;
function buildComposer(scene, camera) {
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: +(Q.get('msaa') ?? 4) }));
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  if (Q.get('ao') !== '0') {
    const aoDiv = +(Q.get('aodiv') || 2); gtao = new GTAOPass(scene, camera, W / aoDiv, H / aoDiv);
    gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 1.0;
    gtao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 2.0, scale: 1.2, samples: +(Q.get('aos') || 8), distanceFallOff: 1.0 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: +(Q.get('pds') || 6) });
    composer.addPass(gtao);
  }
  if (Q.get('bloom') !== '0') { bloom = new UnrealBloomPass(new THREE.Vector2(W / 4, H / 4), 0.45, 0.45, 1.0); composer.addPass(bloom); }
  composer.addPass(new OutputPass());
}

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
    case 'paper_f': case 'paper_a': case 'photo': case 'ticket': {
      const lbl = { paper_f: ['F', '#e53935'], paper_a: ['A+', '#2e7d32'], photo: ['', '#333'], ticket: ['LOTO', '#1e3a8a'] }[kind];
      const tx = canvasTex('paper' + kind, 128, 160, (c) => { c.fillStyle = kind === 'photo' ? '#3b2a1c' : (kind === 'ticket' ? '#ffd23f' : '#ffffff'); c.fillRect(0, 0, 128, 160); if (kind === 'photo') { c.fillStyle = '#c7a77a'; c.fillRect(8, 8, 112, 144); c.fillStyle = '#1b120b'; c.fillRect(16, 70, 96, 70); c.fillStyle = '#e03a3a'; c.fillRect(30, 40, 20, 30); c.fillStyle = '#2f5fd0'; c.fillRect(70, 34, 22, 36); } else { c.fillStyle = '#9e9e9e'; for (let y = 70; y < 150; y += 14) c.fillRect(14, y, 100, 5); c.font = '64px "Luckiest Guy"'; c.textAlign = 'center'; c.fillStyle = lbl[1]; c.fillText(lbl[0], 64, 62); } });
      const m = box(g, 1.3, 1.6, 0.06, M('#ffffff', { map: tx }), 0, -0.9, 0.62, { cast: true }); m.rotation.x = -0.25; break; }
    case 'suitcase': box(g, 1.8, 1.4, 0.7, '#8d5a34', 0, -1.9, 0, { round: 0.15 }); box(g, 0.8, 0.25, 0.2, '#3e2723', 0, -1.15, 0); break;
    case 'clipboard': box(g, 1.1, 1.5, 0.08, '#8d6e63', 0, -0.8, 0.6); box(g, 0.9, 1.1, 0.1, '#ffffff', 0, -0.95, 0.62, { cast: false }); break;
    case 'hammer': box(g, 0.18, 1.6, 0.18, '#8d5a34', 0, -1.0, 0.4, { rx: -1.2 }); box(g, 0.9, 0.35, 0.35, '#555', 0, -0.3, 1.3); break;
    case 'pitchfork': box(g, 0.16, 4.2, 0.16, '#8d5a34', 0, -2.6, 0.5); box(g, 1.1, 0.14, 0.14, '#9e9e9e', 0, 1.6, 0.5); for (const dx of [-0.45, 0, 0.45]) box(g, 0.1, 1.0, 0.1, '#bdbdbd', dx, 1.7, 0.5); break;
    case 'blower': box(g, 1.2, 0.9, 1.0, '#ff7043', 0, -0.5, 0.4, { round: 0.2 }); { const t = cyl(g, 0.2, 0.26, 2.4, '#555', 0, -0.4, 1.6, { rx: Math.PI / 2 }); t.position.set(0, -0.4, 1.6); } break;
    case 'vacuum': box(g, 1.0, 1.3, 0.9, '#26c6da', 0, -1.9, 0.2, { round: 0.25 }); cyl(g, 0.1, 0.1, 2.0, '#555', 0, -1.2, 1.0, { rx: 1.0 }); break;
    case 'dynamite': for (let i = 0; i < 3; i++) cyl(g, 0.22, 0.22, 1.1, '#d32f2f', -0.25 + i * 0.25, -0.6, 0.5); box(g, 0.05, 0.4, 0.05, '#222', 0, 0.5, 0.5); sphere(g, 0.12, M('#ffeb3b', { emissive: '#ffc107', ei: 2 }), 0, 0.75, 0.5, { cast: false }); break;
    case 'spoon': box(g, 0.12, 1.3, 0.08, '#cfd8dc', 0, -0.3, 0.55, { metal: 0.7, rough: 0.25 }); sphere(g, 0.28, M('#cfd8dc', { metal: 0.7, rough: 0.25 }), 0, 0.45, 0.55); break;
    case 'coin': cyl(g, 0.4, 0.4, 0.1, M('#ffd54f', { metal: 0.7, rough: 0.25 }), 0, -0.3, 0.6, { rx: Math.PI / 2 }); break;
    case 'toothpick': box(g, 0.08, 1.4, 0.08, M('#ffd54f', { metal: 0.8, rough: 0.2, emissive: '#ffb300', ei: 0.4 }), 0, -0.3, 0.55); break;
    case 'needle': box(g, 0.08, 1.6, 0.08, M('#ffe082', { metal: 0.9, rough: 0.1, emissive: '#ffc107', ei: 1.2 }), 0, 0.2, 0.55); break;
    case 'straw': for (let i = 0; i < 1; i++) box(g, 0.1, 2.2, 0.1, '#f3c75a', 0, 0.3, 0.55, { rz: 0.2 }); break;
    case 'armful': for (let i = 0; i < 26; i++) box(g, 0.1, 0.1, 2.4, ['#f3c75a', '#e0a92e', '#ffd977'][i % 3], -1.3 + (i % 9) * 0.32, -0.2 + Math.floor(i / 9) * 0.25, 1.0 + ((i * 7) % 5) * 0.05, { ry: Math.PI / 2 + ((i * 13) % 7 - 3) * 0.08, cast: false }); break;
    case 'binoculars': for (const x of [-0.35, 0.35]) cyl(g, 0.3, 0.3, 0.9, '#1b1b1b', x, -0.6, 0.6, { rx: Math.PI / 2 }); for (const x of [-0.35, 0.35]) { const l = cyl(g, 0.24, 0.24, 0.05, M('#4fc3f7', { emissive: '#4fc3f7', ei: 0.6 }), x, -0.6, 1.08, { rx: Math.PI / 2 }); } break;
    case 'flashlight': { cyl(g, 0.22, 0.3, 1.4, '#2b2b2b', 0, -0.9, 0.6, { rx: Math.PI / 2 }); const lens = sphere(g, 0.26, M('#fff8d0', { emissive: '#fff8d0', ei: 3 }), 0, -0.9, 1.35, { cast: false }); const sp = new THREE.SpotLight('#fff3c8', 400, 40, 0.45, 0.5, 1.2); sp.position.set(0, -0.9, 1.3); const tg = new THREE.Object3D(); tg.position.set(0, -0.9, 10); g.add(tg); sp.target = tg; g.add(sp); break; }
    case 'clock': box(g, 1.0, 1.0, 0.5, '#c62828', 0, -0.6, 0.6, { round: 0.2 }); box(g, 0.8, 0.8, 0.1, '#ffffff', 0, -0.6, 0.88, { cast: false }); break;
    case 'cane': box(g, 0.16, 2.6, 0.16, '#3e2723', 0, -2.2, 0.35); box(g, 0.7, 0.16, 0.16, '#3e2723', 0.25, 0.35, 0.35); break;
    case 'satchel': box(g, 1.2, 1.1, 0.4, '#6d4c41', 0.2, -1.9, -0.1, { round: 0.1 }); break;
    case 'boot': box(g, 0.9, 1.6, 0.9, '#2e7d32', 0, -1.0, 0.6, { round: 0.15 }); box(g, 0.9, 0.6, 1.6, '#2e7d32', 0, -1.8, 0.95, { round: 0.2 }); box(g, 0.95, 0.15, 1.65, '#1b5e20', 0, -2.1, 0.95); break;
    case 'keys': box(g, 0.5, 0.25, 0.1, '#222', 0, -0.4, 0.5); box(g, 0.12, 0.6, 0.05, '#bdbdbd', 0.2, -0.75, 0.5); break;
    case 'check': {
      const tx = canvasTex('bigcheck', 512, 220, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 512, 220); c.fillStyle = '#3fbf5f'; c.fillRect(0, 0, 512, 40); c.fillStyle = '#222'; c.font = '30px "Fredoka"'; c.fillText('BANQUE DE LA VILLE', 20, 30); c.font = '86px "Luckiest Guy"'; c.fillStyle = '#1b5e20'; c.textAlign = 'center'; c.fillText('1 000 000 €', 256, 150); c.fillStyle = '#9e9e9e'; c.fillRect(30, 180, 452, 4); });
      box(g, 7, 3, 0.15, M('#ffffff', { map: tx }), 0, 0.6, 0.5); break; }
    default: return null;
  }
  return g;
}

function makePet(kind, color) {
  if (kind === 'pixel') return makePet('cat', '#ff8a1f');
  const g = new THREE.Group();
  if (kind === 'ghost') {
    const gm = M('#f4f8ff', { transparent: true, opacity: 0.85, rough: 0.4 });
    box(g, 3.2, 3.6, 2.6, gm, 0, 1.2, 0, { round: 1.1 }); for (const x of [-1.0, 0, 1.0]) box(g, 0.9, 0.9, 2.2, gm, x, 0.6, 0, { round: 0.4 });
    for (const sx of [-0.6, 0.6]) { sphere(g, 0.38, '#1b1b2e', sx, 3.4, 1.25); sphere(g, 0.12, '#ffffff', sx - 0.1, 3.55, 1.55); } box(g, 0.5, 0.35, 0.1, '#ff9ab0', 0, 2.75, 1.3, { round: 0.1 });
    g.userData.ghost = true; return g;
  }
  if (kind === 'frog') {
    const c = color || '#43c84a';
    box(g, 1.8, 1.1, 1.6, c, 0, 0, 0, { round: 0.45 });
    for (const sx of [-0.45, 0.45]) { sphere(g, 0.36, '#ffffff', sx, 1.15, 0.45); sphere(g, 0.18, '#111', sx, 1.18, 0.75); }
    box(g, 1.1, 0.08, 0.1, '#1b5e20', 0, 0.45, 0.82, { cast: false });
    for (const sx of [-0.8, 0.8]) box(g, 0.6, 0.35, 0.9, shade(c, -0.08), sx, 0, -0.2, { round: 0.15 });
    g.userData.frog = true; return g;
  }
  const c = color || (kind === 'cat' ? '#ff9f43' : '#c68642');
  if (kind === 'cat') {
    box(g, 1.46, 0.3, 0.3, '#7b3fe4', 0, 1.65, 2.05, { cast: false }); sphere(g, 0.18, M('#ffd23f', { metal: 0.6, rough: 0.3 }), 0, 1.6, 2.25, { cast: false });
    const dk = shade(c, -0.12);
    for (const zz of [-0.6, 0.0, 0.6]) box(g, 1.44, 0.18, 0.28, dk, 0, 2.35, zz, { cast: false });
    box(g, 1.34, 0.2, 0.3, dk, 0, 2.7, 1.5, { cast: false });
    box(g, 0.8, 0.5, 0.2, '#ffffff', 0, 1.75, 2.16, { cast: false, round: 0.1 });
    box(g, 0.24, 0.16, 0.1, '#ff8fb1', 0, 2.08, 2.26, { cast: false });
    for (const sx of [-0.3, 0.3]) { sphere(g, 0.2, '#ffffff', sx, 2.4, 2.12, { cast: false }); sphere(g, 0.11, '#111', sx, 2.4, 2.28, { cast: false }); }
    for (const sx of [-1, 1]) for (const dy of [-0.06, 0.08]) box(g, 0.6, 0.03, 0.03, '#ffffff', sx * 0.62, 1.95 + dy, 2.2, { cast: false, rz: sx * dy * 2 });
  }
  box(g, 1.4, 1.3, 2.6, c, 0, 1.1, 0, { round: 0.2 });
  box(g, 1.3, 1.3, 1.3, c, 0, 2.1, 1.5, { round: 0.25 });
  if (kind !== 'cat') box(g, 0.5, 0.4, 0.4, '#222', 0, 2.0, 2.2, {});
  for (const x of [-0.4, 0.4]) { if (kind === 'cat') { const e = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4), M(c)); e.position.set(x, 3.05, 1.4); e.rotation.y = Math.PI / 4; e.castShadow = true; g.add(e); } else { box(g, 0.32, 0.7, 0.2, '#5d4037', x, 2.75, 1.4, { rz: x * 0.8 }); sphere(g, 0.1, '#111', x * 0.7, 2.35, 2.17); } }
  for (const [x, z] of [[-0.45, 0.9], [0.45, 0.9], [-0.45, -0.9], [0.45, -0.9]]) box(g, 0.4, 1.1, 0.4, c, x, 0, z);
  const tail = kind === 'cat' ? box(g, 0.28, 2.0, 0.28, c, 0, 1.9, -1.4, { rx: -0.25 }) : box(g, 0.25, 0.25, 1.2, c, 0, 1.7, -1.6, { rx: -0.6 });
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
      default: if (kind.startsWith('txt:')) { const t = kind.slice(4); txt(t, '#ffe14d', Math.min(200, 520 / Math.max(1, t.length))); }
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
    const n = { dust: 160, pizza: 70, fire: 60, steam: 40, straw: 140, coins: 50, rain: 500, confetti: 160, money: 90, snow: 300, tears: 0, hearts: 14, sparkles: 40, stars: 5, smoke: 30 }[kind] ?? 50;
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
      else if (kind === 'dust') m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 3), M('#fff6e0', { basic: true, transparent: true, opacity: 0.8 }));
      else if (kind === 'pizza') { m = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex('emoji_pizza', 128, 128, (c) => { c.font = '100px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🍕', 64, 70); }), transparent: true })); m.scale.set(1.8, 1.8, 1); }
      else if (kind === 'fire') m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), M(r.pick(['#ff4a1a', '#ffb21a', '#ff7a1a']), { basic: true, transparent: true, opacity: 0.9 }));
      else if (kind === 'steam') m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), M('#ffffff', { transparent: true, opacity: 0.5, basic: true }));
      else if (kind === 'straw') m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), M(r.pick(['#ffd977', '#f3c75a', '#e0a92e']), { basic: true }));
      else if (kind === 'coins') m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12), M('#ffd54f', { metal: 0.7, rough: 0.25 }));
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
      if (this.kind === 'dust') { m.position.set(f.x + x * 0.9 + Math.sin(t * 0.3 + ph * 9) * 1.2, f.y - 4 + ((y0 * 0.5 - t * 0.25 * sp) % 11 + 11) % 11, f.z + z * 0.9 + Math.cos(t * 0.25 + ph * 7) * 1.2); continue; }
      if (this.kind === 'fire') { const k = (t * 1.6 * sp + ph) % 1; m.position.set(f.x + x * 0.35, f.y - 3 + k * 12, f.z + z * 0.35); m.scale.setScalar(1.6 * (1 - k) + 0.1); continue; }
      if (this.kind === 'steam') { const k = (t * 0.7 * sp + ph) % 1; m.position.set(f.x + x * 1.1, k * 9, f.z + z * 1.1); m.scale.setScalar(0.5 + k * 2); m.material.opacity = 0.5 * (1 - k); continue; }
      if (this.kind === 'straw') { const k = (t * 0.25 * sp + ph) % 1; m.position.set(f.x + x * 1.2 + Math.sin(t + ph * 9) * 2, 1 + y0 * 0.6 + Math.sin(t * 1.3 + ph * 5) * 1.5, f.z + z * 1.2); m.rotation.set(t * 2 * sp + ph * 6, t * 1.5 + ph * 3, t * sp); continue; }
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
    } else if (kind === 'rays') {
      const r = rng('rays'); const grd = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h * 0.6); grd.addColorStop(0, 'rgba(255,230,120,0.9)'); grd.addColorStop(0.35, 'rgba(255,190,40,0.35)'); grd.addColorStop(1, 'rgba(200,120,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + r.range(-0.05, 0.05); g.fillStyle = 'rgba(255,240,170,0.35)'; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a - 0.04) * 900, h / 2 + Math.sin(a - 0.04) * 900); g.lineTo(w / 2 + Math.cos(a + 0.04) * 900, h / 2 + Math.sin(a + 0.04) * 900); g.fill(); }
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
  const n = spec.actors.filter(a => !a.extra).length;
  const st = info.stage;
  const res = [];
  const pairGap = 2.0;
  spec.actors.forEach((a, i) => {
    let x = st.x, z = st.z, ry = 0;
    if (a.extra) i = 0;
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
  spec = JSON.parse(JSON.stringify(spec)); cast = JSON.parse(JSON.stringify(cast || {}));
  const r = rng('shot|' + (spec.parentId || spec.id) + '|' + (spec.seed ?? 0));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 2000);
  scene.add(camera);
  const tod = spec.time || 'day';
  const night = tod === 'night';
  const envFn = ENVIRONMENTS[spec.env] || ENVIRONMENTS.street;
  const world = new THREE.Group(); scene.add(world);
  const info = envFn(world, rng('env|' + spec.env + '|' + (spec.envSeed ?? 0)), night, spec.envOpts || {});

  // crowds: expand into individual extras with varied looks
  const S_movers = [];
  spec.actors = (spec.actors || []).slice();
  for (const [ci, cr] of (spec.crowd || []).entries()) {
    const cr_r = rng('crowd|' + (spec.parentId || spec.id) + '|' + ci + '|' + (cr.seed ?? 0));
    const [x0, z0, x1, z1] = cr.area || [-12, -6, 12, 6];
    for (let i = 0; i < (cr.n || 10); i++) {
      const id = `crowd${cr.seed ?? ci}_${i}`;
      const a = { id, pos: [cr_r.range(x0, x1), cr_r.range(z0, z1)], action: Array.isArray(cr.action) ? cr_r.pick(cr.action) : (cr.action || 'idle'),
        emotion: Array.isArray(cr.emotion) ? cr_r.pick(cr.emotion) : cr.emotion, facing: (cr.facing ?? 0) + cr_r.range(-(cr.spread ?? 0.5), cr.spread ?? 0.5),
        noShadow: cr.noShadow, shadowFrom: cr.shadowFrom !== undefined ? cr.shadowFrom + cr_r.range(0, cr.shadowJitter ?? 0) : undefined,
        prop: cr.props ? cr_r.pick(cr.props) : undefined, dir: cr.dir, speed: cr.speed, symbol: cr.symbols && cr_r() < 0.5 ? cr_r.pick(cr.symbols) : undefined,
        scale: cr.kids && cr_r() < cr.kids ? 0.72 : undefined, extra: true, shadowOnly: cr.shadowOnly, frozen: cr.frozen,
        head: cr.head ? (Array.isArray(cr.head) ? cr_r.range(cr.head[0], cr.head[1]) : cr.head) : undefined,
        float: cr.float ? (Array.isArray(cr.float) ? cr_r.range(cr.float[0], cr.float[1]) : cr.float) : undefined,
        emotion: Array.isArray(cr.emotion) ? cr_r.pick(cr.emotion) : cr.emotion };
      if (cr.descend) { const f0 = a.float ?? 15, h0 = a.head ?? 4, st0 = cr_r.range(0, 0.55); a.float = [f0, 0]; a.head = [h0, 1]; a.animAt = [st0, st0 + 0.35]; }
      spec.actors.push(a);
      if (!cast[id]) cast[id] = { gender: cr_r() < 0.5 ? 'f' : 'm', role: cr.roles ? cr_r.pick(cr.roles) : (cr.old && cr_r() < cr.old ? 'old' : '') };
    }
  }
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
    if (a.prop) { const pr = makeProp(a.prop); if (pr) { if (a.prop === 'check') { pr.position.set(0, 4.2, 0.3); av.body.add(pr); } else av.hand.add(pr); } }
    if (a.scale) av.inner.scale.setScalar(a.scale);
    // shadow tricks: an invisible double performs the FUTURE action and casts the shadow
    let double = null;
    if (a.shadow) {
      double = new Avatar(a.id + '_shadow', app);
      if (a.scale) double.inner.scale.setScalar(a.scale);
      const sp = a.shadow.prop; if (sp) { const pr = makeProp(sp); if (pr) { if (sp === 'check') { pr.position.set(0, 4.2, 0.3); double.body.add(pr); } else double.hand.add(pr); } }
      shadowOnly(double.root); scene.add(double.root);
      setCast(av.root, false);
    }
    if (a.noShadow) setCast(av.root, false);
    if (a.shadowOnly) shadowOnly(av.root);
    if (action === 'sit_work') {
      const lap = new THREE.Group(); lap.position.set(0, 2.3, 1.9); lap.scale.setScalar(0.8); av.inner.add(lap);
      box(lap, 2.4, 0.15, 1.6, '#cfd8dc', 0, 0, 0); const scr = box(lap, 2.4, 1.6, 0.1, '#263238', 0, 0.1, 0.75, {}); scr.rotation.x = 0.35; scr.position.z = 0.85;
      const glow = box(lap, 2.2, 1.4, 0.05, M('#64b5f6', { emissive: '#64b5f6', ei: 0.9 }), 0, 0.2, 0.83, { cast: false }); glow.rotation.x = 0.35; glow.position.z = 0.79;
    }
    scene.add(av.root);
    const sym = a.symbol && !a.shadowOnly ? makeSprite(a.symbol, 1.7) : null;
    let bubble = null;
    if (a.bubble) { bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex(a.bubble), transparent: true, depthTest: false, fog: false })); bubble.renderOrder = 900; scene.add(bubble); }
    if (a.frozen) { const ice = new THREE.Mesh(boxGeo(3.4, 6.8, 2.6, 0.3), M('#bfefff', { transparent: true, opacity: 0.42, rough: 0.05 })); ice.position.y = 3.3; av.inner.add(ice); }
    if (a.goat === true) av.setGoat(true);
    let cloud = null;
    if (a.weather) { cloud = new THREE.Group(); for (const [x, y, z, r0] of [[0, 0, 0, 1.1], [1.0, -0.1, 0.2, 0.85], [-1.0, -0.1, 0.1, 0.9], [0.3, 0.5, -0.2, 0.8]]) sphere(cloud, r0, '#8f969e', x, y, z, { seg: 10, cast: false }); cloud.userData.rain = []; for (let i = 0; i < 12; i++) { const d = box(cloud, 0.06, 0.5, 0.06, M('#7fc3ff', { basic: true }), -1.2 + (i % 6) * 0.48, -0.6, -0.3 + Math.floor(i / 6) * 0.6, { cast: false }); cloud.userData.rain.push(d); } scene.add(cloud); }
    let glint = null;
    if ((a.glint || app.needle) && !a.shadowOnly && av.head.userData.needle) { glint = makeSprite('star', a.glint ? 1.2 : 0.55); glint.material.depthTest = !a.glint; scene.add(glint); }
    if (sym) scene.add(sym);
    actors.push({ av, spec: a, action, seat, base: av.root.position.clone(), ry: av.root.rotation.y, phase: r() * 6.28, sym, r: rng('act' + a.id + (spec.parentId || spec.id)), double, glint, cloud, bubble, castOn: !(a.noShadow || a.shadow) });
  });
  // pets & extra props in world
  for (const pet of spec.pets || []) { const pg = makePet(pet.kind, pet.color); const st = info.stage; pg.position.set(st.x + (pet.pos?.[0] ?? 3.2), 0, st.z + (pet.pos?.[1] ?? 1.5)); pg.rotation.y = pet.facing ?? -0.5; if (pet.scale) pg.scale.setScalar(pet.scale); if (pet.y) pg.position.y = pet.y; scene.add(pg); actors.push({ pet: pg, petSpec: pet, phase: r() * 6 });
    if (pet.focus) { /* camera can target the pet */ spec._petFocus = pg; } }
  for (const wp of spec.worldProps || []) {
    const st = info.stage;
    if (msgProp(world, wp, st, r, S_movers, {})) continue;
    if (siloProp(world, wp, st, r, S_movers)) continue;
    if (wp.kind === 'car') car(world, st.x + (wp.pos?.[0] ?? 6), st.z + (wp.pos?.[1] ?? -4), wp.facing ?? 0, r, wp.color);
    else if (wp.kind === 'police_car') { const c = car(world, st.x + (wp.pos?.[0] ?? 7), st.z + (wp.pos?.[1] ?? -5), wp.facing ?? 0.3, r, '#ffffff'); box(c, 3, 0.6, 1.2, M('#ff1744', { emissive: '#ff1744', ei: 1.4 }), -0.8, 3.4, -0.6); box(c, 1.4, 0.6, 1.2, M('#2979ff', { emissive: '#2979ff', ei: 1.4 }), 0.8, 3.4, -0.6); }
    else if (wp.kind === 'bus') {
      const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 0), 0, st.z + (wp.pos?.[1] ?? 0)); g.rotation.y = wp.facing ?? 0; world.add(g);
      const col = wp.color || '#f9c80e';
      box(g, 6, 6.5, 22, col, 0, 1, 0, { round: 0.4 }); box(g, 6.1, 1.8, 18, M('#1d2b3a', { rough: 0.1 }), 0, 4.6, -1, { cast: false }); box(g, 5.2, 2.6, 0.2, M('#1d2b3a', { rough: 0.1 }), 0, 4, 11.05, { cast: false });
      for (const [wx, wz] of [[-3, 7], [3, 7], [-3, -7], [3, -7]]) cyl(g, 1.3, 1.3, 0.8, '#111', wx, 1.3, wz, { rz: Math.PI / 2 }).position.y = 1.3;
      for (let k = 0; k < 5; k++) { const hd = box(g, 1.0, 1.0, 1.0, ['#f5cfa9', '#d6995f', '#eab98f', '#a86b3f'][k % 4], 2.2 * (k % 2 ? 1 : -1), 4.3, -7 + k * 3.2, { round: 0.2, cast: false }); }
      g.userData.move = wp.move; g.userData.base = g.position.clone(); (S_movers).push(g);
    }
    else if (wp.kind === 'shadow_mountain') {
      const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 2), 0, st.z + (wp.pos?.[1] ?? 0)); world.add(g);
      const m = new THREE.Mesh(new THREE.ConeGeometry(wp.r || 3.2, wp.h || 5, 6), SHADOW_ONLY); m.position.y = (wp.h || 5) / 2; m.castShadow = true; g.add(m);
      const m2 = new THREE.Mesh(new THREE.ConeGeometry((wp.r || 3.2) * 0.7, (wp.h || 5) * 0.75, 6), SHADOW_ONLY); m2.position.set(0, (wp.h || 5) * 0.37, -2.5); m2.castShadow = true; g.add(m2);
    }
    else if (wp.kind === 'mail_truck') { const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 6), 0, st.z + (wp.pos?.[1] ?? 0)); g.rotation.y = wp.facing ?? 0; world.add(g);
      box(g, 5, 6.5, 11, '#f5f5f5', 0, 1.2, -1, { round: 0.3 }); box(g, 5, 4, 4, '#f5f5f5', 0, 1.2, 6, { round: 0.3 }); box(g, 4.6, 1.8, 0.2, M('#1d2b3a', { rough: 0.1 }), 0, 3.4, 8.05, { cast: false }); box(g, 5.05, 0.9, 11, '#1e5bd8', 0, 4, -1, { cast: false });
      box(g, 0.2, 2.2, 6, M('#ffffff', { map: canvasTex('poste', 512, 200, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 512, 200); c.fillStyle = '#1e5bd8'; c.font = '120px "Luckiest Guy"'; c.textAlign = 'center'; c.fillText('POSTE', 256, 150); }) }), 2.55, 4.6, -1, { cast: false });
      for (const [wx, wz] of [[-2.5, 5.5], [2.5, 5.5], [-2.5, -4.5], [2.5, -4.5]]) cyl(g, 1.1, 1.1, 0.8, '#111', wx, 1.1, wz, { rz: Math.PI / 2 }).position.y = 1.1; }
    else if (wp.kind === 'stage') { const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 0), 0, st.z + (wp.pos?.[1] ?? -3)); world.add(g);
      box(g, 16, 1.6, 9, '#c47a3a'); box(g, 2.4, 3.2, 1.6, '#6d4c41', 0, 1.6, 1.5); cyl(g, 0.6, 0.6, 0.1, M('#ffd23f', { metal: 0.5 }), 0, 3.4, 2.32, { rx: Math.PI / 2 });
      for (const x of [-8.5, 8.5]) box(g, 0.5, 11, 0.5, '#3b3b3b', x, 0, -3);
      box(g, 17, 2.6, 0.3, M('#ffffff', { map: textTex(wp.label || 'MAIRIE', { bg: '#1e3a8a', color: '#ffffff', size: 140, w: 1200, h: 200 }) }), 0, 9.5, -3, { cast: false });
      for (let i = 0; i < 12; i++) box(g, 0.9, 0.9, 0.05, ['#e53935', '#fdd835', '#1e88e5', '#43a047'][i % 4], -7.2 + i * 1.3, 8.4 - Math.sin(i / 11 * Math.PI) * 0.8, -2.8, { cast: false, rz: Math.PI / 4 }); }
    else if (wp.kind === 'big_tree') { const tg = new THREE.Group(); tg.position.set(st.x + (wp.pos?.[0] ?? 0), 0, st.z + (wp.pos?.[1] ?? -4)); world.add(tg); cyl(tg, 2.2, 3.2, 40, '#7a4b2a', 0, 0, 0, { seg: 10 }); for (const [x, y, z, s0] of [[0, 48, -3, 16], [-10, 42, -4, 10], [10, 43, -5, 11]]) box(tg, s0, s0 * 0.8, s0, '#3f9b3a', x, y - s0 * 0.4, z, { round: 2 }); }
    else if (wp.kind === 'party') { const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 0), 0, st.z + (wp.pos?.[1] ?? -8)); world.add(g); for (let k = 0; k < 3; k++) for (let i = 0; i < 16; i++) box(g, 0.8, 0.8, 0.05, ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#ff7a1a', '#7b3fe4'][i % 6], -12 + i * 1.6, 9 - Math.sin(i / 15 * Math.PI) * 1.4, k * 5, { cast: false, rz: Math.PI / 4 }); for (let i = 0; i < 14; i++) sphere(g, 0.25, M(['#ffd23f', '#ff7a1a', '#7b3fe4'][i % 3], { emissive: ['#ffd23f', '#ff7a1a', '#7b3fe4'][i % 3], ei: 1.6 }), -11 + i * 1.7, 7.4 - Math.sin(i / 13 * Math.PI) * 1.2, 2.5, { cast: false }); box(g, 9, 2, 0.3, M('#ffffff', { map: textTex('FÊTE !', { bg: '#7b3fe4', color: '#ffd23f', size: 150, w: 800, h: 220 }) }), 0, 10.5, -1, { cast: false }); }
    else if (wp.kind === 'piano') { const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 0), wp.y ?? 0, st.z + (wp.pos?.[1] ?? 0)); g.rotation.set(wp.rx ?? 0.2, wp.facing ?? 0.4, wp.rz ?? 0.15); world.add(g); box(g, 6, 3.6, 2.4, '#111'); box(g, 6, 0.6, 1.2, '#f5f5f5', 0, 2.2, 1.6); for (let i = 0; i < 10; i++) box(g, 0.25, 0.3, 0.7, '#111', -2.6 + i * 0.6, 2.8, 1.6, { cast: false }); for (const x of [-2.6, 2.6]) box(g, 0.3, 2.2, 0.3, '#111', x, -2.2, 1.6); }
    else if (wp.kind === 'needle_big') { const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 0), wp.y ?? 4, st.z + (wp.pos?.[1] ?? 0)); g.rotation.set(0, 0, wp.rz ?? 0.5); world.add(g); const gm = M('#ffe082', { metal: 0.9, rough: 0.1, emissive: '#ffb300', ei: 1.4 }); const n = cyl(g, 0.12, 0.02, 7, gm, 0, -3.5, 0, { seg: 10 }); const eye = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 8, 16), gm); eye.position.y = 3.7; g.add(eye); g.userData.spin = true; S_movers.push(g); }
    else if (wp.kind === 'straw_single') { const g = new THREE.Group(); g.position.set(st.x + (wp.pos?.[0] ?? 0), wp.y ?? 0.1, st.z + (wp.pos?.[1] ?? 0)); world.add(g); box(g, 0.14, 0.14, 3, '#f3c75a', 0, 0, 0, { ry: 0.6 }); }
    else if (wp.kind === 'haystack') { haystack(world, st.x + (wp.pos?.[0] ?? 0), st.z + (wp.pos?.[1] ?? -20), wp.r || 10, wp.h || 12, r, {}); }
    else if (wp.kind === 'straws') { looseStraw(world, wp.n || 300, [st.x + wp.area[0], st.z + wp.area[1], st.x + wp.area[2], st.z + wp.area[3]], r, { y: wp.y || 0, maxL: 2.4 }); }
    else if (wp.kind === 'limo') { const c = car(world, st.x + (wp.pos?.[0] ?? 6), st.z + (wp.pos?.[1] ?? 0), wp.facing ?? 0, r, '#111111'); c.scale.set(1, 1, 1.5); }
    else if (wp.kind === 'check_board') { const pr = makeProp('check'); pr.scale.setScalar(wp.scale || 1.3); pr.position.set(st.x + (wp.pos?.[0] ?? 0), wp.y ?? 5, st.z + (wp.pos?.[1] ?? -2)); pr.rotation.y = wp.facing ?? 0; world.add(pr); }
    else { const pr = makeProp(wp.kind); if (pr) { pr.scale.setScalar(wp.scale || 2); pr.position.set(st.x + (wp.pos?.[0] ?? 0), wp.y ?? 3, st.z + (wp.pos?.[1] ?? 2)); scene.add(pr); } }
  }

  // camera focus
  const focusIdx = clamp(spec.camera?.focus ?? 0, 0, Math.max(0, spec.actors.length - 1));
  const focusActor = actors[focusIdx]?.av ? actors[focusIdx] : null;
  const fpos = focusActor ? focusActor.base.clone() : new THREE.Vector3(info.stage.x, 0, info.stage.z);
  setupLighting(scene, tod, info.interior, info, fpos);
  if (HQ) {
    scene.environment = ENV_TEX; scene.environmentIntensity = info.envIntensity ?? 0.35;
    // image-based light replaces part of the flat hemisphere fill -> more depth / contrast
    scene.traverse(o => { if (o.isHemisphereLight) o.intensity *= 0.5; });
    renderer.toneMappingExposure = info.exposure ?? 0.92;
    if (POST) buildComposer(scene, camera);
    if (Q.get('exp')) renderer.toneMappingExposure = +Q.get('exp');
    if (Q.get('hemi')) scene.traverse(o => { if (o.isHemisphereLight) o.intensity *= +Q.get('hemi'); });
    if (Q.get('env')) scene.environmentIntensity = +Q.get('env');
  }

  // particles / fx
  const parts = [];
  for (const k of spec.fx || []) if (['rain', 'confetti', 'money', 'snow', 'hearts', 'sparkles', 'stars', 'smoke', 'straw', 'coins', 'pizza', 'fire', 'steam', 'dust'].includes(k)) parts.push(new Particles(k, scene, fpos.clone().setY(4.5), camera, rng(k + (spec.parentId || spec.id))));
  const ov = {
    vignette: addOverlay(camera, spec.fx?.includes('red') ? 'red' : (spec.fx?.includes('dark') ? 'dark' : 'vignette'), 1),
    speed: addOverlay(camera, 'speed', 2),
    rays: addOverlay(camera, 'rays', 0),
    flash: addOverlay(camera, 'white', 3),
    black: addOverlay(camera, 'black', 4),
  };
  const occluders = [];
  world.updateMatrixWorld(true);
  world.traverse(o => {
    if (!o.isMesh || o.geometry.type === 'PlaneGeometry' && o.rotation.x !== 0) return;
    if (o.material && o.material.transparent) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const sc = o.getWorldScale(new THREE.Vector3());
    if (o.geometry.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z) > 45 && !info.interior) return;
    occluders.push(o);
  });
  S = { movers: S_movers, spec, scene, camera, actors, info, focusActor, fpos, parts, ov, r, dur: spec.duration, adur: spec.parentDur || spec.duration, toff: spec.timeOffset || 0, camSeed: hash(spec.parentId || spec.id), occluders, ray: new THREE.Raycaster() };
  // choose one yaw offset for the whole shot that keeps the subject unobstructed
  S.yawFix = 0;
  const cands = (spec.camera?.type === 'path' || spec.camera?.noCollide) ? [0] : [0, 0.45, -0.45, 0.85, -0.85, 1.25, -1.25];
  let best = 0, bestHits = 99;
  for (const c of cands) {
    S.yawFix = c; S.probe = true; let hits = 0;
    for (const u of [0.02, 0.5, 0.98]) { updateActors(u * S.dur + S.toff); scene.updateMatrixWorld(true); if (camPose(u * S.dur).hit) hits++; }
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
  const hsc = focusActor?.hs || 1;
  const headY = (lying ? 1.2 : (3.95 + 0.68 * hsc) * sc + (focusActor?.seat ? (focusActor.seat.y - 2.0) : 0)) + (focusActor ? focusActor.av.root.position.y : 0);
  const chestY = lying ? 1.0 : headY - 1.4 * sc;
  const faceRy = focusActor ? focusActor.av.root.rotation.y : 0;
  const rel = ['closeup', 'xcu', 'crash_zoom', 'medium', 'low', 'high', 'dutch', 'truck', 'orbit'].includes(type);
  const kHead = Math.max(1, (focusActor?.hs || 1) * 0.85);
  const at = (dist, h, a) => { dist *= kHead; if (rel) a += clamp(faceRy, -1.1, 1.1); return new THREE.Vector3(f.x + Math.sin(a) * dist, h, f.z + Math.cos(a) * dist); };
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
      const fy = focusActor ? focusActor.av.root.position.y : 0, hy = (headY - 4.6) * 0.5;
      const d = (lerp(17, 14, e) + spread * 0.8) * kHead; const a = ang0 + lerp(-0.18, 0.18, e) * (cam.dir ?? 1);
      pos = new THREE.Vector3(mid.x + Math.sin(a) * d, 6.5 + fy * 0.8 + hy, mid.z + Math.cos(a) * d); look = new THREE.Vector3(mid.x, 3.4 + hy + (real.length > 1 ? 0 : fy), mid.z); fov = 50; break;
    }
    case 'two_shot': {
      const d = lerp(12.5, 10.5, e) + spread * 0.9; const a = ang0 + lerp(-0.08, 0.08, e) * (cam.dir ?? 1);
      pos = new THREE.Vector3(mid.x + Math.sin(a) * d, 4.6, mid.z + Math.cos(a) * d); look = new THREE.Vector3(mid.x, 3.8 * sc, mid.z); fov = 46; break;
    }
    case 'medium': default: {
      pos = at(lerp(9.5, 7.6, e), lerp(4.6, 4.3, e) + (headY - 4.6) * 0.6, ang0); look = new THREE.Vector3(f.x, chestY + 0.5, f.z); fov = 44; break;
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
    case 'path': {
      const st = info.stage, k = cam.ease === 'linear' ? u : e;
      const P = (a, b) => new THREE.Vector3(st.x + lerp(a[0], b[0], k), lerp(a[1], b[1], k), st.z + lerp(a[2], b[2], k));
      pos = P(cam.from, cam.to || cam.from); look = P(cam.lookFrom || cam.look, cam.lookTo || cam.lookFrom || cam.look); fov = lerp(cam.fov ?? 46, cam.fovTo ?? cam.fov ?? 46, k); roll = cam.roll || 0;
      if (cam.follow && focusActor) { const fp = focusActor.av.root.position; pos.x += fp.x - focusActor.base.x; pos.z += fp.z - focusActor.base.z; look.x += fp.x - focusActor.base.x; look.z += fp.z - focusActor.base.z; }
      break;
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
  if (S.occluders.length && !S.noCollide && type !== 'path' && !cam.noCollide) {
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
    if (A.pet && A.pet.userData.ghost) { A.pet.position.y = (A.petSpec.y ?? 1.5) + Math.sin(t * 2 + A.phase) * 0.4; A.pet.rotation.z = Math.sin(t * 1.3) * 0.08; continue; }
    if (A.pet && A.pet.userData.frog) { const hop = A.petSpec.hop ?? 1; const ph = (t * 1.4 + A.phase) % 1; A.pet.position.y = (A.petSpec.y ?? 0) + Math.max(0, Math.sin(ph * Math.PI * 2)) * 1.6 * hop; continue; }
    if (A.pet) { A.pet.position.y = Math.abs(Math.sin(t * 6 + A.phase)) * 0.15; if (A.pet.userData.tail) A.pet.userData.tail.rotation.y = Math.sin(t * 14) * 0.5; continue; }
    const av = A.av; av.resetPose();
    const act = ACTIONS[A.action] ? A.action : 'idle';
    ACTIONS[act](av, at, { phase: A.phase, seat: A.seat?.y });
    if (A.spec.shadowFrom !== undefined || A.spec.shadowUntil !== undefined) {
      const on = t >= (A.spec.shadowFrom ?? -1) && t < (A.spec.shadowUntil ?? 1e9);
      if (on !== A.castNow) { setCast(av.root, on); A.castNow = on; }
    }
    // locomotion
    const mv = A.spec.move;
    if ((act === 'walk' || act === 'run' || act === 'sneak') && mv !== 'none') {
      const speed = (A.spec.speed ?? 1) * (act === 'run' ? 9 : act === 'walk' ? 3.6 : 2) * (S.info.interior && S.spec.env !== 'hallway' ? 0.35 : 1);
      const dir = A.spec.dir ?? A.ry ?? 0; // heading
      const d = speed * at - speed * S.adur * slow * 0.5;
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
    const lerpSpec = (v, dflt) => { if (v === undefined) return dflt; if (!Array.isArray(v)) return v; const [a, b] = v; const w = A.spec.animAt || [0, 1]; const k = smooth(clamp((t / S.adur - w[0]) / Math.max(0.01, w[1] - w[0]), 0, 1)); return lerp(a, b, A.spec.animEase === 'pop' ? easeOutBack(k) : k); };
    const hs = lerpSpec(A.spec.head, 1); av.neck.scale.setScalar(hs); A.hs = hs;
    const fl = lerpSpec(A.spec.float, 0); if (fl || A.spec.float !== undefined) { av.root.position.y = fl + (fl > 0.5 ? Math.sin(t * 1.3 + A.phase) * 0.4 : 0); }
    if (A.bubble) {
      const bs = A.spec.bubbleAt ?? 0.1, k = clamp((t / S.adur - bs) / 0.12, 0, 1);
      if (A.spec.bubbleType) { const n = Math.max(1, Math.round(A.spec.bubble.length * clamp((t / S.adur - bs) / 0.45, 0, 1))); A.bubble.material.map = bubbleTex(A.spec.bubble.slice(0, n) + (n < A.spec.bubble.length ? '|' : '')); }
      av.headWorld(tmp); const hs0 = (A.hs || 1) * (av.app.scale || 1); const sz = (A.spec.bubbleSize || 2.7) * Math.max(1, hs0 * 0.6);
      const side = A.spec.bubbleSide ?? 0; A.bubble.position.set(tmp.x + side * 1.6 * hs0, tmp.y + 1.9 * hs0 + (A.spec.bubbleDy || 0), tmp.z + 0.5); A.bubble.scale.set(sz * easeOutBack(k), sz * 0.25 * easeOutBack(k), 1); A.bubble.visible = k > 0.01;
    }
    if (A.spec.goatAt !== undefined) av.setGoat(t / S.adur >= A.spec.goatAt);
    if (A.spec.vanishAt !== undefined) { const gone = t / S.adur >= A.spec.vanishAt; av.root.visible = !gone; if (gone && !A.vanFx) { A.vanFx = true; } }
    if (A.cloud) { av.headWorld(tmp); A.cloud.position.set(tmp.x, tmp.y + 0.75 * hs * (av.app.scale || 1) + 1.6 + hs * 0.35, tmp.z); A.cloud.scale.setScalar(Math.max(1, hs * 0.45)); A.cloud.userData.rain.forEach((d, i) => { d.position.y = -((t * 6 + i * 0.37) % 1) * 3; }); }
    if (A.double) {
      const d = A.double; d.resetPose(); const sa = ACTIONS[A.spec.shadow.action] ? A.spec.shadow.action : 'idle';
      ACTIONS[sa](d, at, { phase: A.phase + 1 });
      const off = A.spec.shadow.offset || [0, 0];
      d.root.position.set(av.root.position.x + off[0], A.spec.shadow.lift || 0, av.root.position.z + off[1]); d.root.rotation.y = A.spec.shadow.facing ?? (S.spec.env === 'shadow_wall' ? -Math.PI / 2 : av.root.rotation.y);
    }
    if (A.glint) { av.head.userData.needle.getWorldPosition(tmp); A.glint.position.copy(tmp); const k = 0.6 + 0.4 * Math.abs(Math.sin(t * 3 + A.phase)); const sz = (A.spec.glint ? 1.3 : 0.55) * k; A.glint.scale.set(sz, sz, sz); A.glint.material.rotation = t * 1.5; }
    if (A.sym) { av.headWorld(tmp); const pop = easeOutBack(clamp((t - 0.1) / 0.35, 0, 1)); A.sym.position.set(tmp.x + 1.0, tmp.y + 1.5 + Math.sin(t * 4) * 0.12, tmp.z); A.sym.scale.setScalar(1.7 * pop); }
  }
}

window.renderAt = function renderAt(t) {
  const { spec, camera, scene, parts, ov } = S;
  const ta = t + S.toff;
  updateActors(ta);
  const u = clamp(ta / Math.max(0.01, S.adur), 0, 1);
  for (const g of S.movers) if (g.userData.spin) { g.rotation.y = ta * 1.2; g.position.y += Math.sin(t * 2) * 0.005; }
  for (const g of S.movers) if (g.userData.move) { const [dx, dz] = g.userData.move; g.position.set(g.userData.base.x + dx * (u - 0.5), 0, g.userData.base.z + dz * (u - 0.5)); }
  updateMsgMovers(S.movers, ta, u); updateSiloMovers(S.movers, ta, u);
  if (S.info.update) S.info.update(ta, u, spec);
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
  for (const pa of parts) pa.update(ta);
  // overlays
  ov.vignette.material.opacity = spec.fx?.includes('red') || spec.fx?.includes('dark') ? 0.9 : 0; // soft vignette is added in post (ffmpeg)
  ov.speed.material.opacity = spec.fx?.includes('speed') ? 0.55 + 0.25 * Math.sin(t * 40) : 0;
  ov.rays.material.opacity = spec.fx?.includes('rays') ? 0.75 + 0.15 * Math.sin(t * 3) : 0; ov.rays.rotation.z = t * 0.15; ov.rays.material.blending = THREE.AdditiveBlending;
  ov.flash.material.opacity = spec.fx?.includes('flash') ? Math.max(0, 1 - t / 0.25) : 0;
  const fin = spec.fadeIn ? Math.max(0, 1 - t / spec.fadeIn) : 0;
  const fout = spec.fadeOut ? clamp((t - (S.dur - spec.fadeOut)) / spec.fadeOut, 0, 1) : 0;
  ov.black.material.opacity = Math.max(fin, fout);
  for (const o of Object.values(ov)) o.visible = o.material.opacity > 0.003;
  if (HQ && composer) composer.render(); else renderer.render(scene, camera);
  return true;
};

window.grab = function grab(q = 0.9) { return canvas.toDataURL('image/jpeg', q); };
window.engineReady = true;
