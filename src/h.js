// 建模小工具：材质缓存、几何体简写、画布贴图
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const cache = new Map();
export function M(color, o = {}) {
  const key = color + '|' + JSON.stringify(o);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...o }));
  return cache.get(key);
}
export const steel = () => M(0xdfe3e8, { roughness: 0.26, metalness: 0.85 });
export const glass = (color = 0xffffff, opacity = 0.22) => M(color, { transparent: true, opacity, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });

export function add(parent, geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = o.cast !== false;
  m.receiveShadow = o.receive !== false;
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.scale) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
  if (o.order) m.renderOrder = o.order;
  parent.add(m);
  return m;
}

export function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  rbox: (w, h, d, r = 0.03, s = 3) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2, h / 2, d / 2)),
  cyl: (rt, rb, h, seg = 28, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  sph: (r, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h),
  dome: (r, frac = 0.5, w = 24, h = 14) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI * frac),
  cap: (r, l, cs = 6, rs = 14) => new THREE.CapsuleGeometry(r, l, cs, rs),
  cone: (r, h, seg = 24) => new THREE.ConeGeometry(r, h, seg),
  torus: (r, t, arc = Math.PI * 2, rs = 10, ts = 32) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
  circle: (r, s = 24) => new THREE.CircleGeometry(r, s),
  lathe: (pts, seg = 32) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg),
};

export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}

export const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';

// 简单的伪随机，保证每次重建模型时小料的位置稳定
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function hex(c) { return '#' + new THREE.Color(c).getHexString(); }

export function disposeTree(obj) {
  obj.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
}

// —— 程序化贴图 ——
const texCache = {};
const once = (k, f) => texCache[k] || (texCache[k] = f());

// 拉丝金属：横向细纹，用作粗糙度/凹凸贴图
export const brushedTex = () => once('brushed', () => canvasTex(256, 256, (c) => {
  c.fillStyle = '#888'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const v = 110 + Math.random() * 70; c.fillStyle = `rgba(${v},${v},${v},.5)`; c.fillRect(Math.random() * 256, Math.random() * 256, 40 + Math.random() * 160, 1); }
}, { repeat: [1, 1] }));

// 木纹
export const woodTex = (base = '#d8a56c', dark = '#b98250') => once('wood' + base, () => canvasTex(512, 256, (c) => {
  c.fillStyle = base; c.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 70; i++) {
    c.strokeStyle = dark; c.globalAlpha = 0.12 + Math.random() * 0.25; c.lineWidth = 1 + Math.random() * 2.5;
    const y = Math.random() * 256; c.beginPath(); c.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) c.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + (Math.random() - 0.5) * 2);
    c.stroke();
  }
  c.globalAlpha = 0.18; c.strokeStyle = '#7a5230'; c.lineWidth = 2;
  for (let x = 128; x < 512; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
}, { repeat: [1, 1] }));

// 细颗粒噪点（布料、墙面的凹凸）
export const grainTex = () => once('grain', () => canvasTex(128, 128, (c) => {
  const d = c.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 40; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  c.putImageData(d, 0, 0);
}, { repeat: [3, 3] }));

// 编织纹（果篮）
export const weaveTex = () => once('weave', () => canvasTex(128, 128, (c) => {
  c.fillStyle = '#b98852'; c.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    c.fillStyle = (x + y) % 2 ? '#c99a62' : '#9c6f3c'; c.fillRect(x * 16 + 1, y * 16 + 2, 14, 12);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x * 16 + 1, y * 16 + 12, 14, 2);
  }
}, { repeat: [5, 2] }));

const pcache = new Map();
export function P(color, o = {}) {
  const key = color + '|' + JSON.stringify(o);
  if (!pcache.has(key)) pcache.set(key, new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, metalness: 0, ...o }));
  return pcache.get(key);
}
// 带清漆的塑料 / 烤漆
export const gloss = (color, o = {}) => P(color, { roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2, ...o });
// 带拉丝纹的不锈钢
export function brushed(color = 0xdfe3e8) {
  const key = 'brushed|' + color;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.9, roughnessMap: brushedTex(), bumpMap: brushedTex(), bumpScale: 0.3 }));
  return cache.get(key);
}
// 布料
export function cloth(color, o = {}) {
  const key = 'cloth|' + color + JSON.stringify(o);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.92, bumpMap: grainTex(), bumpScale: 0.6, ...o }));
  return cache.get(key);
}
