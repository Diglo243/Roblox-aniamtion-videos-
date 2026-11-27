// "Minds" — the recurring characters of Ascend.Mind.
// Signature: matte body in the concept's colour, ink outline, glowing eyes, gold Λ emblem on the chest.
// The model faces +x, up is +y. All joint angles are in radians.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const L_THIGH = 0.42, L_SHIN = 0.42, ANKLE_H = 0.09;
const OUTLINE = 0.022;
const inkMat = new THREE.MeshBasicMaterial({ color: 0x07070b, side: THREE.BackSide });

function capsule(r, len, mat, outline = true) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  if (outline) {
    const o = new THREE.Mesh(m.geometry, inkMat);
    o.scale.set((r + OUTLINE) / r, (len / 2 + r + OUTLINE) / (len / 2 + r), (r + OUTLINE) / r);
    g.add(o);
  }
  return g;
}
function sphere(r, mat, outline = true) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  if (outline) { const o = new THREE.Mesh(m.geometry, inkMat); o.scale.setScalar((r + OUTLINE) / r); g.add(o); }
  return g;
}

function emblemTexture(gold) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.strokeStyle = gold; x.lineWidth = 16; x.lineJoin = 'miter'; x.lineCap = 'square';
  x.beginPath(); x.moveTo(18, 108); x.lineTo(18, 90); x.lineTo(36, 90); x.lineTo(36, 72); x.lineTo(54, 72); x.lineTo(54, 54);
  x.lineTo(66, 30); x.lineTo(110, 108); x.stroke();
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(66, 12, 10, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let EMBLEM = null;

export class Mind {
  constructor(name, cfg, gold = '#FFC24A') {
    this.name = name; this.cfg = cfg;
    const stick = this.stick = cfg.style === 'stick';
    // stick style: white body, the concept colour lives in the ninja headband only
    this.base = new THREE.Color(stick ? (cfg.body || '#F2EFE8') : cfg.color);
    this.mat = new THREE.MeshStandardMaterial({ color: this.base.clone(), roughness: stick ? 0.6 : 0.48, metalness: 0.0 });
    this.mat.emissive = this.base.clone().multiplyScalar(stick ? 0.06 : 0.10);
    const eye = new THREE.Color(cfg.eyes || '#ffffff');
    this.eyeMat = new THREE.MeshBasicMaterial({ color: eye.clone().multiplyScalar(2.6), toneMapped: false });
    this.root = new THREE.Group(); this.root.rotation.order = 'YXZ';
    const P = this.parts = {};
    const D = stick
      ? { hipZ: 0.06, thighR: 0.042, shinR: 0.04, torsoR: 0.05, shZ: 0.05, shY: 0.53, armR: 0.036, handR: 0.055, headR: 0.25 }
      : { hipZ: 0.115, thighR: 0.088, shinR: 0.08, torsoR: 0.2, shZ: 0.285, shY: 0.5, armR: 0.072, handR: 0.088, headR: 0.27 };

    // legs (hip joints at the root origin)
    for (const [side, z] of [['A', D.hipZ], ['B', -D.hipZ]]) {
      const hip = new THREE.Group(); hip.position.set(0, 0, z); this.root.add(hip);
      const thigh = capsule(D.thighR, L_THIGH - 2 * D.thighR, this.mat); thigh.position.y = -L_THIGH / 2; hip.add(thigh);
      const knee = new THREE.Group(); knee.position.y = -L_THIGH; hip.add(knee);
      const shin = capsule(D.shinR, L_SHIN - 2 * D.shinR, this.mat); shin.position.y = -L_SHIN / 2; knee.add(shin);
      const ankle = new THREE.Group(); ankle.position.y = -L_SHIN; knee.add(ankle);
      const footG = new THREE.Group(); footG.position.set(stick ? 0.04 : 0.06, stick ? -0.03 : -0.04, 0); ankle.add(footG);
      const fm = new THREE.Mesh(stick ? new RoundedBoxGeometry(0.17, 0.06, 0.08, 3, 0.028) : new RoundedBoxGeometry(0.26, 0.1, 0.14, 3, 0.045), this.mat); fm.castShadow = true;
      const fo = new THREE.Mesh(fm.geometry, inkMat); fo.scale.set(1.2, 1.6, 1.5);
      footG.add(fm, fo);
      P['hip' + side] = hip; P['knee' + side] = knee; P['ankle' + side] = ankle;
    }
    // torso
    const spine = new THREE.Group(); spine.position.y = 0.02; this.root.add(spine); P.spine = spine;
    if (stick) {
      const torso = capsule(D.torsoR, 0.6 - 2 * D.torsoR, this.mat); torso.position.y = 0.3; spine.add(torso);
      const hipBar = capsule(0.04, 0.06, this.mat); hipBar.rotation.x = Math.PI / 2; hipBar.position.y = -0.02; spine.add(hipBar);
    } else {
      const torso = capsule(0.2, 0.26, this.mat); torso.position.y = 0.31; torso.scale.set(0.86, 1, 1.12); spine.add(torso);
      if (!EMBLEM) EMBLEM = emblemTexture(gold);
      const em = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15),
        new THREE.MeshBasicMaterial({ map: EMBLEM, transparent: true, toneMapped: false, color: new THREE.Color(1.8, 1.8, 1.8) }));
      em.position.set(0.178, 0.36, 0); em.rotation.y = Math.PI / 2; spine.add(em); this.emblem = em;
    }
    // neck + head
    const neck = new THREE.Group(); neck.position.y = 0.6; spine.add(neck); P.neck = neck;
    neck.rotation.order = 'YXZ';
    const head = sphere(D.headR, this.mat); head.position.y = stick ? 0.25 : 0.24; head.scale.set(0.96, 1.02, 1); neck.add(head); P.head = head;
    if (stick) this.buildNinjaBand(head, D.headR);
    else {
      for (const z of [0.088, -0.088]) {
        const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.05, 4, 10), this.eyeMat);
        e.position.set(0.248, 0.03, z); e.scale.set(0.55, 1, 1); head.add(e);
      }
      this.eyes = head.children.slice(2);
    }
    // arms
    for (const [side, z] of [['A', D.shZ], ['B', -D.shZ]]) {
      const sh = new THREE.Group(); sh.position.set(0, D.shY, z); spine.add(sh);
      const up = capsule(D.armR, 0.31 - 2 * D.armR, this.mat); up.position.y = -0.155; sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.31; sh.add(el);
      const fa = capsule(D.armR * 0.95, 0.28 - 2 * D.armR, this.mat); fa.position.y = -0.14; el.add(fa);
      const hand = sphere(D.handR, this.mat); hand.position.y = -0.29; el.add(hand);
      P['sh' + side] = sh; P['el' + side] = el; P['hand' + side] = hand;
    }
    if (!stick) this.buildAccessory(cfg.accessory, gold);
    this.buildWounds();
    this.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  }

  // Ninja-turtle headband: a coloured band over the eyes with two eye holes, knot and two flowing tails.
  buildNinjaBand(head, R) {
    const col = new THREE.Color(this.cfg.color);
    const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, emissive: col.clone().multiplyScalar(0.18), side: THREE.DoubleSide });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.13, 40, 1, true), m);
    band.position.y = 0.03; band.castShadow = true; head.add(band);
    const bo = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.15, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x07070b, side: THREE.BackSide }));
    bo.position.y = 0.03; head.add(bo);
    // eyes in the mask: white glowing ovals with dark pupils
    this.eyes = [];
    const white = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6), toneMapped: false });
    const pupil = new THREE.MeshBasicMaterial({ color: 0x0a0a10 });
    for (const z of [0.075, -0.075]) {
      const g = new THREE.Group(); g.position.set(Math.sqrt((R + 0.016) ** 2 - z * z), 0.035, z); g.rotation.y = Math.atan2(-z, Math.sqrt(R * R - z * z));
      const e = new THREE.Mesh(new THREE.CircleGeometry(0.036, 20), white); e.scale.set(1, 1.25, 1); e.rotation.y = Math.PI / 2; g.add(e);
      const pp = new THREE.Mesh(new THREE.CircleGeometry(0.016, 14), pupil); pp.position.set(0.002, -0.002, 0); pp.rotation.y = Math.PI / 2; g.add(pp);
      head.add(g); this.eyes.push(g);
    }
    // knot + tails at the back
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), m); knot.position.set(-R - 0.02, 0.03, 0); head.add(knot);
    this.tails = [];
    for (const [z, ang] of [[0.03, 0.25], [-0.03, -0.25]]) {
      const geo = new THREE.PlaneGeometry(0.075, 0.42, 1, 10); geo.translate(0, -0.21, 0);
      const t = new THREE.Mesh(geo, m); t.castShadow = true;
      t.position.set(-R - 0.03, 0.03, z); t.rotation.set(ang, 0, 0);
      head.add(t); this.tails.push({ mesh: t, base: geo.attributes.position.array.slice(), ang });
    }
  }

  buildAccessory(kind, gold) {
    const P = this.parts;
    if (kind === 'headband') {
      const m = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.035, 8, 32), m);
      band.rotation.x = Math.PI / 2; band.position.y = 0.11; P.head.add(band);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), m);
      tail.position.set(-0.27, 0.04, 0.05); tail.rotation.z = -0.5; P.head.add(tail);
      this.tail = tail;
    } else if (kind === 'crown') {
      const m = new THREE.MeshStandardMaterial({ color: gold, metalness: 0.9, roughness: 0.25, emissive: new THREE.Color(gold).multiplyScalar(0.25) });
      const g = new THREE.Group(); g.position.y = 0.25; g.rotation.z = -0.18; P.head.add(g);
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.07, 20, 1, true), m));
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 6), m);
        const a = i / 6 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.155, 0.075, Math.sin(a) * 0.155); g.add(sp);
      }
    } else if (kind === 'cape') {
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(this.cfg.color).multiplyScalar(0.55), roughness: 0.7, side: THREE.DoubleSide });
      const geo = new THREE.PlaneGeometry(0.5, 0.62, 6, 8);
      geo.translate(0, -0.31, 0);
      const cape = new THREE.Mesh(geo, m); cape.castShadow = true;
      cape.position.set(-0.19, 0.56, 0); cape.rotation.y = Math.PI / 2; P.spine.add(cape);
      this.cape = cape; this.capeBase = geo.attributes.position.array.slice();
    } else if (kind === 'star') {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 30, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
      x.fill();
      const t = new THREE.CanvasTexture(c);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: new THREE.Color(this.cfg.color).multiplyScalar(2.2), toneMapped: false }));
      s.scale.setScalar(0.17); s.position.set(0.0, 0.46, 0.0); P.head.add(s); this.star = s;
    }
  }

  buildWounds() {
    // red "cracks" that appear as the character burns out (damage 0..1)
    const m = new THREE.MeshStandardMaterial({ color: 0xc0101e, emissive: 0xff1a2e, emissiveIntensity: 0.55, roughness: 0.4 });
    const spots = [['spine', 0.15, 0.25, 0.08], ['kneeA', 0.07, -0.18, 0.0], ['hipB', 0.08, -0.25, 0.0], ['spine', 0.1, 0.45, -0.12],
      ['elA', 0.06, -0.12, 0.0], ['kneeB', 0.07, -0.3, 0.0], ['head', 0.2, 0.12, 0.12], ['shB', 0.07, -0.15, 0.0],
      ['spine', -0.12, 0.2, 0.1], ['hipA', 0.07, -0.12, 0.03], ['elB', 0.06, -0.1, 0.0], ['spine', 0.16, 0.08, -0.06]];
    const k = this.stick ? 0.32 : 1;
    this.wounds = spots.map(([part, x, y, z], i) => {
      if (this.stick && part !== 'head') { x *= k; z *= k; }
      const w = new THREE.Mesh(new THREE.SphereGeometry((0.055 + (i % 3) * 0.012) * (this.stick ? 0.75 : 1), 10, 8), m);
      w.scale.set(0.55, 1.25, 1); w.position.set(x, y, z); w.visible = false;
      this.parts[part].add(w); return w;
    });
  }

  setDamage(d) {
    this.wounds.forEach((w, i) => { w.visible = d > (i + 0.5) / this.wounds.length * 0.95; });
    const c = this.base.clone().lerp(new THREE.Color('#5a0b14'), d * 0.35);
    this.mat.color.copy(c);
  }

  setEyes(glow) { this.eyeMat.color.set(this.cfg.eyes || '#ffffff').multiplyScalar(0.6 + 2.0 * glow); }

  apply(p, t = 0) {
    const R = this.root, P = this.parts;
    R.position.set(p.x, p.y, p.z);
    R.rotation.set(p.roll || 0, p.yaw || 0, -(p.pitch || 0));
    P.spine.rotation.set(p.spineRoll || 0, p.twist || 0, -(p.spine || 0));
    P.neck.rotation.set(0, p.headYaw || 0, -(p.neck || 0));
    for (const s of ['A', 'B']) {
      const sg = s === 'A' ? -1 : 1;
      P['hip' + s].rotation.set(sg * (p['hipAbd' + s] || 0), 0, p['hip' + s] || 0);
      P['knee' + s].rotation.set(0, 0, p['knee' + s] || 0);
      P['ankle' + s].rotation.set(0, 0, p['ankle' + s] || 0);
      P['sh' + s].rotation.set(sg * (p['shAbd' + s] ?? 0.08), 0, p['sh' + s] || 0);
      P['el' + s].rotation.set(0, 0, p['el' + s] || 0);
    }
    if (this.cape) {
      const a = this.cape.geometry.attributes.position, b = this.capeBase, sp = Math.min(1, Math.abs(p.speed || 0) / 2.5);
      for (let i = 0; i < a.count; i++) {
        const yy = -b[i * 3 + 1];
        a.array[i * 3 + 2] = b[i * 3 + 2] + yy * yy * (0.25 + 0.9 * sp) + Math.sin(t * 9 + yy * 7 + b[i * 3] * 4) * 0.035 * yy * (0.4 + sp);
      }
      a.needsUpdate = true; this.cape.geometry.computeVertexNormals();
    }
    if (this.tail) this.tail.rotation.z = -0.5 - 0.25 * Math.sin(t * 10);
    if (this.tails) {
      const sp = Math.min(1, Math.abs(p.speed || 0) / 2);
      this.tails.forEach((tl, k) => {
        tl.mesh.rotation.z = -(0.35 + 0.9 * sp) + 0.12 * Math.sin(t * 6 + k * 1.3);  // streams back when running
        const a = tl.mesh.geometry.attributes.position, b = tl.base;
        for (let i = 0; i < a.count; i++) { const yy = -b[i * 3 + 1]; a.array[i * 3 + 2] = b[i * 3 + 2] + Math.sin(t * (7 + 6 * sp) + yy * 9 + k) * 0.03 * yy * (1 + 2 * sp); }
        a.needsUpdate = true;
      });
    }
    if (this.star) this.star.position.y = 0.46 + Math.sin(t * 3) * 0.03;
    // blink
    const bl = (t * 0.37 + this.name.length * 0.13) % 1;
    const open = bl < 0.03 ? 0.12 : 1;
    for (const e of this.eyes) e.scale.y = open;
  }

  headWorld(v = new THREE.Vector3()) { return this.parts.head.getWorldPosition(v); }
}

// Two-bone IK in the sagittal plane. Hip (hx,hy) → ankle target (fx,fy). Knee points forward (+x).
export function legIK(hx, hy, fx, fy) {
  const dx = fx - hx, dy = fy - hy;
  let d = Math.hypot(dx, dy);
  const a = Math.atan2(dx, -dy);
  const max = L_THIGH + L_SHIN - 1e-4;
  if (d >= max) return { hip: a, knee: 0 };
  d = Math.max(d, 0.12);
  const alpha = Math.acos(Math.min(1, (L_THIGH * L_THIGH + d * d - L_SHIN * L_SHIN) / (2 * L_THIGH * d)));
  const beta = Math.acos(Math.max(-1, Math.min(1, (L_THIGH * L_THIGH + L_SHIN * L_SHIN - d * d) / (2 * L_THIGH * L_SHIN))));
  return { hip: a + alpha, knee: -(Math.PI - beta) };
}
