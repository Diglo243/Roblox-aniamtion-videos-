// Core helpers: seeded random, material / geometry caches, canvas textures.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let a = (typeof seed === 'string' ? hash(seed) : seed) >>> 0;
  const f = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a0, b0) => a0 + (b0 - a0) * f();
  f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
  f.int = (a0, b0) => Math.floor(a0 + (b0 - a0 + 1) * f());
  return f;
}

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => { t = clamp(t, 0, 1); return -(Math.cos(Math.PI * t) - 1) / 2; };
export const easeOutExpo = (t) => { t = clamp(t, 0, 1); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };
export const easeOutBack = (t) => { t = clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// --- materials -------------------------------------------------------------
const matCache = new Map();
export function M(color, o = {}) {
  const key = JSON.stringify([color, o.rough, o.metal, o.emissive, o.ei, o.map && o.map.uuid, o.transparent, o.opacity, o.side, o.basic]);
  let m = matCache.get(key);
  if (m) return m;
  if (o.basic) {
    m = new THREE.MeshBasicMaterial({ color, map: o.map || null, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, fog: o.fog ?? true });
  } else if (new URLSearchParams(location.search).get('mat') === 'lambert') {
    m = new THREE.MeshLambertMaterial({
      color, emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1,
      map: o.map || null, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
    });
  } else {
    m = new THREE.MeshStandardMaterial({
      color, roughness: o.rough ?? 0.62, metalness: o.metal ?? 0,
      emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1,
      map: o.map || null, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
    });
  }
  matCache.set(key, m);
  return m;
}

const geoCache = new Map();
export function boxGeo(w, h, d, round = 0) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${round}`;
  let g = geoCache.get(key);
  if (!g) {
    g = round > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(round, Math.min(w, h, d) / 2 - 0.001)) : new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}

// box with its bottom at y (convenient for building on the ground)
export function box(parent, w, h, d, color, x = 0, y = 0, z = 0, o = {}) {
  const mat = color instanceof THREE.Material ? color : M(color, o);
  const mesh = new THREE.Mesh(boxGeo(w, h, d, o.round || 0), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = o.cast ?? true;
  mesh.receiveShadow = o.receive ?? true;
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.rz) mesh.rotation.z = o.rz;
  parent.add(mesh);
  return mesh;
}
export function cyl(parent, rt, rb, h, color, x = 0, y = 0, z = 0, o = {}) {
  const key = `cyl${rt}|${rb}|${h}|${o.seg || 16}`;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, o.seg || 16); geoCache.set(key, g); }
  const mesh = new THREE.Mesh(g, color instanceof THREE.Material ? color : M(color, o));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = o.cast ?? true; mesh.receiveShadow = true;
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.rz) mesh.rotation.z = o.rz;
  parent.add(mesh);
  return mesh;
}
export function sphere(parent, r, color, x, y, z, o = {}) {
  const key = `sph${r}|${o.seg || 12}`;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.SphereGeometry(r, o.seg || 12, Math.max(6, (o.seg || 12) >> 1)); geoCache.set(key, g); }
  const mesh = new THREE.Mesh(g, color instanceof THREE.Material ? color : M(color, o));
  mesh.position.set(x, y, z); mesh.castShadow = o.cast ?? true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function plane(parent, w, h, mat, x, y, z, o = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  if (o.rx !== undefined) mesh.rotation.x = o.rx;
  if (o.ry !== undefined) mesh.rotation.y = o.ry;
  mesh.receiveShadow = o.receive ?? true;
  mesh.castShadow = false;
  parent.add(mesh); return mesh;
}

// --- canvas textures -------------------------------------------------------
const texCache = new Map();
export function canvasTex(key, w, h, draw, o = {}) {
  let t = texCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  texCache.set(key, t);
  return t;
}
export function repeatTex(base, rx, ry) {
  const t = base.clone(); t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}

export function shade(hex, amt) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, clamp(hsl.l + amt, 0, 1));
  return '#' + c.getHexString();
}

// Common surface textures
export const TEX = {
  wood: () => canvasTex('wood', 256, 256, (g, w, h) => {
    const r = rng('wood');
    for (let i = 0; i < 8; i++) {
      const base = ['#b07a47', '#a86f3d', '#b9834f', '#9f6a3a'][i % 4];
      g.fillStyle = base; g.fillRect(0, i * 32, w, 32);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, i * 32 + 31, w, 2);
      const off = r() * w; g.fillRect(off, i * 32, 2, 32);
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(80,40,10,0.08)'; g.fillRect(r() * w, i * 32 + r() * 30, 40 + r() * 60, 2); }
    }
  }),
  tiles: (a = '#f2f2f2', b = '#d9dde3') => canvasTex('tiles' + a + b, 256, 256, (g, w, h) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 64, y * 64, 64, 64); }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  }),
  grass: () => canvasTex('grass', 256, 256, (g, w, h) => {
    const r = rng('grass'); g.fillStyle = '#5daa45'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,110,30,0.25)' : 'rgba(140,210,90,0.22)'; g.fillRect(r() * w, r() * h, 3, 3); }
  }),
  asphalt: () => canvasTex('asphalt', 256, 256, (g, w, h) => {
    const r = rng('asph'); g.fillStyle = '#44484e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.07)'; g.fillRect(r() * w, r() * h, 2, 2); }
  }),
  brick: (col = '#b5523b') => canvasTex('brick' + col, 256, 256, (g, w, h) => {
    g.fillStyle = shade(col, 0.18); g.fillRect(0, 0, w, h);
    const r = rng('brick' + col);
    for (let y = 0; y < 16; y++) for (let x = -1; x < 8; x++) {
      g.fillStyle = shade(col, (r() - 0.5) * 0.08);
      g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14);
    }
  }),
  siding: (col) => canvasTex('siding' + col, 128, 128, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) { g.fillStyle = 'rgba(0,0,0,0.09)'; g.fillRect(0, y * 16 + 13, w, 3); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, y * 16, w, 2); }
  }),
  plaster: (col) => canvasTex('plaster' + col, 128, 128, (g, w, h) => {
    const r = rng('pl' + col); g.fillStyle = col; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(0,0,0,0.025)'; g.fillRect(r() * w, r() * h, 4, 4); }
  }),
  carpet: (col) => canvasTex('carpet' + col, 128, 128, (g, w, h) => {
    const r = rng('cp' + col); g.fillStyle = col; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'; g.fillRect(r() * w, r() * h, 2, 2); }
  }),
};

export function textTex(text, o = {}) {
  const w = o.w || 1024, h = o.h || 256;
  return canvasTex('txt' + text + JSON.stringify(o), w, h, (g) => {
    g.fillStyle = o.bg || '#ffffff'; g.fillRect(0, 0, w, h);
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18); }
    g.font = `${o.size || 150}px "${o.font || 'Luckiest Guy'}"`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.stroke) { g.lineWidth = 14; g.strokeStyle = o.stroke; g.strokeText(text, w / 2, h / 2 + 8); }
    g.fillStyle = o.color || '#222'; g.fillText(text, w / 2, h / 2 + 8);
  });
}
