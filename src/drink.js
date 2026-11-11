// 饮品模型：透明杯里的分层液体、小料、冰块、水果片、带棱的冰淇淋螺旋，以及甜筒
import * as THREE from 'three';
import { M, P, G, add, rng, disposeTree, canvasTex, FONT, brushed } from './h.js';
import { ING } from './data.js';
import { waffleMat, sliceTex } from './stations.js';
import { RED } from './world.js';

const H = 0.34, RT = 0.12, RB = 0.088, CAP = 5.2;
const rAt = (y) => RB + (RT - RB) * (y / H) - 0.006;
const CREAM_MAX = 1.1; // 塌掉的临界值

// 冰淇淋螺旋：沿螺旋线挤出一个六棱星形截面，像真正的裱花嘴挤出来的
function swirlGeometry(R, Hh, turns, tube, seg = 200, pts = 24) {
  const pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, a = t * turns * Math.PI * 2;
    const rad = R * Math.pow(1 - t, 0.8), sc = tube * (1 - 0.66 * t);
    const cx = Math.cos(a) * rad, cz = Math.sin(a) * rad, cy = t * Hh;
    for (let j = 0; j <= pts; j++) {
      const th = (j / pts) * Math.PI * 2;
      const rr = sc * (0.8 + 0.2 * Math.cos(th * 6 + t * 10));
      const o = Math.cos(th) * rr, u = Math.sin(th) * rr * 0.92;
      pos.push(cx + Math.cos(a) * o, cy + u, cz + Math.sin(a) * o);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < pts; j++) {
    const a = i * (pts + 1) + j, b = a + pts + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, seg, pts, point: (t, v) => { const a = t * turns * Math.PI * 2, rad = R * Math.pow(1 - t, 0.8); return v.set(Math.cos(a) * rad, t * Hh, Math.sin(a) * rad); } };
}

let _logo = null, _film = null, _sleeve = null;
function logoTex() {
  // 杯身印花：原创的小甜筒图案
  return _logo || (_logo = canvasTex(256, 256, (c) => {
    c.clearRect(0, 0, 256, 256);
    c.fillStyle = '#e2231a'; c.beginPath(); c.arc(128, 128, 96, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 128, 82, 0, 7); c.fill();
    c.fillStyle = '#e2231a'; c.beginPath(); c.moveTo(98, 132); c.lineTo(158, 132); c.lineTo(128, 196); c.closePath(); c.fill();
    for (const [x, y, r] of [[128, 112, 30], [128, 86, 22], [128, 66, 13]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(118, 108, 4, 0, 7); c.arc(138, 108, 4, 0, 7); c.fill();
  }));
}
function filmTex() {
  return _film || (_film = canvasTex(256, 256, (c) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#e2231a'; c.lineWidth = 12; c.beginPath(); c.arc(128, 128, 112, 0, 7); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.arc(128, 128, 94, 0, 7); c.stroke();
    c.fillStyle = '#e2231a'; c.font = `700 40px ${FONT}`; c.textAlign = 'center';
    c.fillText('鲜 · 甜', 128, 112); c.font = `500 22px ${FONT}`; c.fillText('今天也要开心鸭', 128, 150);
    for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(128 + Math.cos(i * 0.5236) * 78, 128 + Math.sin(i * 0.5236) * 78, 3, 0, 7); c.fill(); }
  }));
}
function sleeveTex() {
  return _sleeve || (_sleeve = canvasTex(256, 128, (c) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 128);
    c.fillStyle = '#e2231a'; for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 16, 128);
  }, { repeat: [2, 1] }));
}

export class DrinkVisual {
  constructor() {
    this.group = new THREE.Group();
    this.inner = new THREE.Group();
    this.group.add(this.inner);
    this.swirl = null;
    this.topY = 0.02;
    this.topR = RB;
    this.container = 'cup';
  }

  dispose() { disposeTree(this.inner); this.inner.clear(); this.swirl = null; }

  mainColor(s) {
    const c = new THREE.Color(0xffffff); let w = 0; const t = new THREE.Color();
    for (const k in s.ing) { const d = ING[k]; if (d.kind === 'ice' || d.kind === 'topping') continue; const u = d.units * s.ing[k]; t.set(d.color); c.lerp(t, u / (w + u)); w += u; }
    return w ? c : new THREE.Color(0xfff5dc);
  }

  set(s) {
    this.dispose();
    this.container = s.container;
    const g = this.inner;
    if (s.container === 'cone') {
      const wm = waffleMat();
      // 甜筒架
      add(g, G.cyl(0.075, 0.085, 0.012, 24), brushed(), 0, 0.006, 0);
      add(g, G.cyl(0.006, 0.006, 0.1, 6), brushed(), 0, 0.06, -0.05);
      add(g, G.torus(0.05, 0.006, Math.PI * 2, 6, 24), brushed(), 0, 0.11, 0, { rot: [Math.PI / 2, 0, 0] });
      // 蛋筒 + 纸托
      add(g, new THREE.ConeGeometry(0.086, 0.28, 28, 1, true), wm, 0, 0.17, 0, { rot: [Math.PI, 0, 0] });
      add(g, G.cyl(0.094, 0.086, 0.04, 28, true), wm, 0, 0.33, 0);
      add(g, G.torus(0.094, 0.005, Math.PI * 2, 6, 28), M(0xd29448, { roughness: 0.8 }), 0, 0.35, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
      add(g, G.cyl(0.062, 0.03, 0.11, 24, true), M(0xffffff, { map: sleeveTex(), roughness: 0.8, side: THREE.DoubleSide }), 0, 0.125, 0, { cast: false });
      add(g, G.circle(0.09, 24), P(0xfff7e4, { roughness: 0.45 }), 0, 0.343, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
      this.topY = 0.345; this.topR = 0.125;
      if (s.ing.iceCream) this.beginCream(s.creamAmt);
      return;
    }
    // —— 杯体 ——
    const wall = P(0xffffff, { transparent: true, opacity: 0.16, roughness: 0.03, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
    add(g, G.cyl(RT, RB, H, 40, true), wall, 0, H / 2, 0, { cast: false, order: 3 });
    add(g, G.cyl(RB, RB * 0.96, 0.008, 40), P(0xffffff, { transparent: true, opacity: 0.4, roughness: 0.05 }), 0, 0.004, 0, { order: 3 });
    add(g, G.torus(RB * 0.8, 0.004, Math.PI * 2, 4, 32), P(0xffffff, { transparent: true, opacity: 0.5 }), 0, 0.006, 0, { rot: [Math.PI / 2, 0, 0], cast: false, order: 3 });
    add(g, G.torus(RT, 0.006, Math.PI * 2, 8, 40), P(0xffffff, { roughness: 0.1, clearcoat: 1 }), 0, H, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
    // 杯身印花
    const logo = new THREE.Mesh(new THREE.CylinderGeometry(rAt(0.26) + 0.0075, rAt(0.1) + 0.0075, 0.16, 20, 1, true, -0.62, 1.24), new THREE.MeshStandardMaterial({ map: logoTex(), transparent: true, roughness: 0.4, depthWrite: false }));
    logo.position.y = 0.18; logo.renderOrder = 4; g.add(logo);

    // —— 计算分层 ——
    const layers = [];
    let topping = 0;
    for (const k of ['pearl', 'coconut']) topping += (s.ing[k] || 0) * ING[k].units;
    if (topping) layers.push({ color: s.ing.pearl ? 0x3a2416 : 0xe9e6d2, units: topping, kind: 'topping' });
    for (const k of s.seq) {
      const d = ING[k];
      if (d.kind === 'topping') continue;
      if (d.kind === 'iceCream' && !s.sealed) continue;
      const last = layers[layers.length - 1];
      if (d.kind === 'ice' || d.kind === 'fruit') {
        if (last && last.kind !== 'topping') last.units += d.units; else layers.push({ color: null, units: d.units, kind: 'air' });
      } else if (last && last.id === k) last.units += d.units;
      else layers.push({ color: d.color, units: d.units, id: k, kind: 'liquid' });
    }
    if (s.shaken) {
      const mix = new THREE.Color(0xffffff), t = new THREE.Color(); let w = 0, units = 0;
      const rest = layers.filter((l) => l.kind === 'topping');
      for (const l of layers) { if (l.kind === 'topping') continue; units += l.units; if (l.color == null) continue; t.set(l.color); mix.lerp(t, l.units / (w + l.units)); w += l.units; }
      layers.length = 0; layers.push(...rest);
      if (units) { layers.push({ color: mix.getHex(), units: units * 0.9, kind: 'liquid' }); layers.push({ color: mix.clone().lerp(new THREE.Color(0xffffff), 0.6).getHex(), units: units * 0.18, kind: 'foam' }); }
    }
    const total = layers.reduce((a, l) => a + l.units, 0);
    const unitH = (H * 0.93 - 0.01) / Math.max(CAP, total);
    let y = 0.01, toppingTop = 0.01, liquidBottom = 0.01, lastColor = null;
    for (const l of layers) {
      const h = l.units * unitH;
      if (l.color != null && h > 0.001) {
        const m = P(l.color, { roughness: 0.12, transparent: true, opacity: l.kind === 'topping' ? 0.97 : l.kind === 'foam' ? 0.98 : 0.9, clearcoat: 0.4 });
        add(g, G.cyl(rAt(y + h), rAt(y), h, 36), m, 0, y + h / 2, 0, { cast: false, order: 1 });
        lastColor = l.color;
      }
      y += h;
      if (l.kind === 'topping') { toppingTop = y; liquidBottom = y; }
    }
    this.topY = y; this.topR = rAt(y);
    // 液面的亮边
    if (lastColor != null) add(g, G.torus(rAt(y) - 0.003, 0.004, Math.PI * 2, 6, 36), M(new THREE.Color(lastColor).lerp(new THREE.Color(0xffffff), 0.55).getHex(), { roughness: 0.2 }), 0, y, 0, { rot: [Math.PI / 2, 0, 0], cast: false, order: 2 });

    // —— 小料 ——
    const r = rng(42);
    const ring = (n, y0, y1, make) => {
      for (let i = 0; i < n; i++) {
        const yy = y0 + r() * Math.max(0.001, y1 - y0), a = r() * Math.PI * 2;
        const rad = rAt(yy) - 0.004 - (r() < 0.3 ? r() * 0.04 : 0);
        make(Math.cos(a) * rad, yy, Math.sin(a) * rad, a);
      }
    };
    if (s.ing.pearl) {
      const pm = P(0x160c07, { roughness: 0.08, clearcoat: 1 });
      ring(20 * s.ing.pearl, 0.022, Math.max(0.055, toppingTop), (x, yy, z) => add(g, G.sph(0.0155, 10, 8), pm, x, yy, z, { cast: false, order: 2 }));
    }
    if (s.ing.coconut) {
      const cm = P(0xfdfcf2, { roughness: 0.15, transparent: true, opacity: 0.95, clearcoat: 0.8 });
      ring(16 * s.ing.coconut, 0.022, Math.max(0.055, toppingTop), (x, yy, z, a) => add(g, G.rbox(0.026, 0.026, 0.026, 0.006, 1), cm, x, yy, z, { rot: [a, a * 2, a * 3], cast: false, order: 2 }));
    }
    if (s.ing.ice) {
      const im = P(0xf2fbff, { transparent: true, opacity: 0.62, roughness: 0.02, clearcoat: 1 });
      ring(5 * s.ing.ice, Math.max(liquidBottom + 0.02, y - 0.075), y + 0.014, (x, yy, z, a) => add(g, G.rbox(0.044, 0.044, 0.044, 0.01, 2), im, x * 0.82, yy, z * 0.82, { rot: [a, a * 2, a], cast: false, order: 2 }));
    }
    for (const k of ['lemon', 'orange']) {
      if (!s.ing[k]) continue;
      const rind = M(ING[k].color, { roughness: 0.45 }), face = M(0xffffff, { map: sliceTex(k), roughness: 0.35 });
      const y0 = liquidBottom + 0.055, y1 = Math.max(y0 + 0.01, y - 0.055);
      for (let i = 0; i < 3 * s.ing[k]; i++) {
        const yy = y0 + r() * (y1 - y0), a = (i / (3 * s.ing[k])) * Math.PI * 2 + r();
        const piv = new THREE.Group(); piv.rotation.y = -a; g.add(piv);
        const sl = new THREE.Mesh(G.cyl(0.046, 0.046, 0.009, 24), [rind, face, face]);
        sl.position.set(rAt(yy) - 0.003, yy, 0); sl.rotation.set(r() * 6, 0, Math.PI / 2); sl.renderOrder = 2;
        piv.add(sl);
      }
    }

    if (s.ing.iceCream && !s.sealed) this.beginCream(s.creamAmt);

    if (s.sealed) {
      // 封口膜 + 粗吸管
      add(g, G.cyl(RT + 0.005, RT + 0.005, 0.006, 40), M(0xffffff, { map: filmTex(), roughness: 0.25 }), 0, H + 0.004, 0, { order: 4 });
      add(g, G.cyl(RT + 0.006, RT + 0.003, 0.02, 40, true), P(0xffffff, { transparent: true, opacity: 0.7, roughness: 0.2 }), 0, H - 0.006, 0, { cast: false, order: 4 });
      const straw = new THREE.Group(); straw.position.set(0.03, 0.03, -0.01); straw.rotation.set(0.1, 0, -0.14); g.add(straw);
      add(straw, G.cyl(0.014, 0.014, 0.47, 14, true), P(RED, { roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide }), 0, 0.235, 0);
      for (let i = 0; i < 3; i++) add(straw, G.cyl(0.0146, 0.0146, 0.012, 14, true), M(0xffffff), 0, 0.4 - i * 0.03, 0, { cast: false });
    }
  }

  // 冰淇淋：渐进显示的星形螺旋，“越打越高”
  beginCream(amt = 0) {
    const cone = this.container === 'cone';
    const R = Math.min(0.074, this.topR * 0.62), tube = cone ? 0.04 : 0.036;
    const sw = swirlGeometry(R, 0.25, 3.6, tube);
    const mat = P(0xfff8e8, { roughness: 0.42, sheen: 0.5, sheenColor: 0xffffff, clearcoat: 0.15 });
    const y0 = this.topY + tube * 0.55;
    const mesh = add(this.inner, sw.geo, mat, 0, y0, 0);
    const base = add(this.inner, G.sph(tube * 0.92, 14, 10), mat, R, y0, 0, { scale: [1, 0.9, 1] });
    const tip = add(this.inner, G.sph(tube * 0.9, 14, 10), mat, 0, 0, 0);
    const curl = add(this.inner, G.cone(tube * 0.34, tube * 1.1, 10), mat, 0, 0, 0);
    this.swirl = { mesh, tip, base, curl, sw, tube, y0 };
    this.setCream(amt);
  }

  setCream(amt) {
    const s = this.swirl; if (!s) return;
    const p = Math.max(0, Math.min(1, amt / CREAM_MAX));
    s.mesh.geometry.setDrawRange(0, Math.floor(p * s.sw.seg) * s.sw.pts * 6);
    s.sw.point(p, s.tip.position); s.tip.position.y += s.y0;
    const sc = 1 - 0.66 * p;
    s.tip.scale.setScalar(sc);
    s.curl.position.copy(s.tip.position); s.curl.position.y += s.tube * sc * 1.1; s.curl.scale.setScalar(sc * 1.4); s.curl.rotation.z = 0.35;
    s.tip.visible = s.base.visible = s.curl.visible = p > 0.01;
  }
}

// 顾客手里拿的迷你版
export function miniDrink(container, color) {
  const g = new THREE.Group();
  if (container === 'cone') {
    add(g, new THREE.ConeGeometry(0.05, 0.17, 18, 1, true), waffleMat(), 0, 0.02, 0, { rot: [Math.PI, 0, 0] });
    add(g, G.cyl(0.054, 0.05, 0.02, 18), waffleMat(), 0, 0.11, 0);
    const cm = P(0xfff8e8, { roughness: 0.42 });
    for (let i = 0; i < 5; i++) add(g, G.torus(0.036 - i * 0.007, 0.02 - i * 0.002, Math.PI * 2, 8, 16), cm, 0, 0.135 + i * 0.026, 0, { rot: [Math.PI / 2, 0, 0] });
    add(g, G.cone(0.014, 0.05, 10), cm, 0, 0.275, 0);
  } else {
    add(g, G.cyl(0.058, 0.044, 0.17, 20), P(color, { roughness: 0.15, clearcoat: 0.5 }), 0, 0.088, 0);
    add(g, G.cyl(0.064, 0.047, 0.18, 20, true), P(0xffffff, { transparent: true, opacity: 0.22, roughness: 0.03, depthWrite: false }), 0, 0.09, 0, { order: 3, cast: false });
    add(g, G.cyl(0.067, 0.067, 0.008, 20), M(0xffffff, { map: filmTex(), roughness: 0.3 }), 0, 0.184, 0);
    add(g, G.cyl(0.009, 0.009, 0.16, 8), P(RED, { roughness: 0.3 }), 0.012, 0.225, 0, { rot: [0, 0, -0.15] });
    add(g, G.cyl(0.0655, 0.058, 0.07, 20, true), M(0xffffff, { roughness: 0.7 }), 0, 0.105, 0, { cast: false });
    add(g, G.cyl(0.066, 0.064, 0.012, 20, true), M(RED), 0, 0.12, 0, { cast: false });
  }
  return g;
}
