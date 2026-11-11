// 渲染器、后期、镜头、灯光，以及店铺和街景的静态模型
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { M, G, add, group, canvasTex, steel, glass, FONT, rng, gloss, brushed, cloth, woodTex, grainTex, P } from './h.js';

export const RED = 0xe2231a;
export const CREAM = 0xfff6e8;
export const WOOD = 0xd8a56c;
export const BENCH_Y = 0.92;
export const COUNTER_Y = 0.95;
export const SLOT_X = [-1.6, 0, 1.6];

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe4ff);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
  const camPos = new THREE.Vector3(0, 3.3, 3.85);
  const camLook = new THREE.Vector3(0, 1.42, -1.0);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  // 灯光
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe6d3bb, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(-4.5, 8.5, 4.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 28 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 5;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffe9d2, 0.75);
  fill.position.set(5, 3, 5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xcfe4ff, 0.5);
  rim.position.set(0, 4, -8);
  scene.add(rim);
  const shopLight = new THREE.PointLight(0xffe2b8, 0, 12, 1.6);
  shopLight.position.set(0, 2.9, -1);
  scene.add(shopLight);

  const env = buildShop(scene);

  // 后期：环境光遮蔽（让物体之间的接缝和角落有自然的暗部）
  let composer = null, gtao = null;
  try {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(dpr);
    composer.addPass(new RenderPass(scene, camera));
    gtao = new GTAOPass(scene, camera, 4, 4);
    gtao.updateGtaoMaterial({ radius: 0.32, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    gtao.blendIntensity = 0.9;
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
  } catch (e) { console.warn('后期不可用，退回普通渲染', e); composer = null; }

  // 昼夜：p 从 0（开门）到 1（打烊）
  const keys = [
    { p: 0, sky: new THREE.Color(0xbfe4ff), sun: new THREE.Color(0xffffff), i: 2.6, hemi: 1.05, lamp: 0 },
    { p: 0.55, sky: new THREE.Color(0xa6d6ff), sun: new THREE.Color(0xfff4e0), i: 2.7, hemi: 1.05, lamp: 0 },
    { p: 0.78, sky: new THREE.Color(0xffb27d), sun: new THREE.Color(0xffb880), i: 1.8, hemi: 0.9, lamp: 0.5 },
    { p: 1, sky: new THREE.Color(0x1d2a4d), sun: new THREE.Color(0x8fa2ff), i: 0.35, hemi: 0.7, lamp: 1 },
  ];
  const tmp = new THREE.Color();
  function setTime(p) {
    p = Math.max(0, Math.min(1, p));
    let a = keys[0], b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) if (p >= keys[i].p && p <= keys[i + 1].p) { a = keys[i]; b = keys[i + 1]; }
    const k = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
    tmp.copy(a.sky).lerp(b.sky, k);
    scene.background.copy(tmp);
    env.sky.material.color.copy(tmp);
    sun.color.copy(a.sun).lerp(b.sun, k);
    sun.intensity = a.i + (b.i - a.i) * k;
    hemi.intensity = a.hemi + (b.hemi - a.hemi) * k;
    const lamp = a.lamp + (b.lamp - a.lamp) * k;
    shopLight.intensity = lamp * 30;
    env.night.forEach((m) => { m.emissiveIntensity = m.userData.base + lamp * m.userData.gain; });
    env.cloudMat.opacity = 0.95 - lamp * 0.6;
  }
  setTime(0);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    const aspect = w / h;
    camera.aspect = aspect;
    const hHalf = Math.tan(THREE.MathUtils.degToRad(25)) * 1.6;
    camera.fov = aspect >= 1.6 ? 50 : Math.min(84, THREE.MathUtils.radToDeg(2 * Math.atan(hHalf / aspect)));
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const v = new THREE.Vector3();
  function project(pos) {
    v.copy(pos).project(camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, ok: v.z < 1 };
  }

  // 街上的车和云
  let clock = 0;
  function tick(dt) {
    clock += dt;
    for (const c of env.cars) {
      c.g.position.x += c.dir * c.speed * dt;
      if (c.g.position.x > 22) c.g.position.x = -22;
      if (c.g.position.x < -22) c.g.position.x = 22;
      c.wheels.forEach((w) => { w.rotation.x += c.speed * dt / 0.24; });
    }
    for (const c of env.clouds) { c.position.x += dt * 0.12; if (c.position.x > 26) c.position.x = -26; }
    env.sign.rotation.z = Math.sin(clock * 1.2) * 0.04;
  }

  const render = () => { if (composer) composer.render(); else renderer.render(scene, camera); };
  return { renderer, scene, camera, camPos, camLook, setTime, project, env, render, tick, composer };
}

function poster(title, price, bg, liquid, sub) {
  return canvasTex(384, 512, (c, w) => {
    c.fillStyle = bg; c.fillRect(0, 0, 384, 512);
    c.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc((i * 97) % w, (i * 151) % 330, 10 + (i % 3) * 8, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, 205, 148, 0, 7); c.fill();
    c.fillStyle = liquid; c.beginPath(); c.moveTo(122, 120); c.lineTo(262, 120); c.lineTo(244, 318); c.quadraticCurveTo(192, 330, 140, 318); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(140, 140, 16, 150);
    c.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 4; i++) c.fillRect(170 + i * 20, 150 + (i % 2) * 26, 16, 16);
    c.fillStyle = 'rgba(0,0,0,.55)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(152 + i * 10, 300 - (i % 3) * 10, 6, 0, 7); c.fill(); }
    c.fillStyle = '#e2231a'; c.fillRect(112, 106, 160, 18);
    c.save(); c.translate(216, 112); c.rotate(0.22); c.fillRect(-7, -92, 14, 96); c.restore();
    c.fillStyle = '#1d1d1f'; c.textAlign = 'center'; c.font = `600 48px ${FONT}`; c.fillText(title, w / 2, 408);
    c.fillStyle = '#6e6e73'; c.font = `500 22px ${FONT}`; c.fillText(sub, w / 2, 440);
    c.fillStyle = '#e2231a'; c.font = `700 56px ${FONT}`; c.fillText('¥' + price, w / 2, 496);
  });
}

export function textPlate(text, { w = 256, h = 96, bg = '#e2231a', fg = '#fff', size = 52 } = {}) {
  return canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = fg; c.font = `700 ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 3);
  });
}

function buildShop(scene) {
  const night = [];
  const glow = (color, base, gain, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: base, roughness: 0.5, ...extra });
    m.userData = { base, gain };
    night.push(m);
    return m;
  };
  const white = gloss(0xffffff), red = gloss(RED), dark = M(0x2a2a2e, { roughness: 0.5 });
  const r = rng(7);
  const hexOf = (c) => '#' + new THREE.Color(c).getHexString();

  // —— 地面：带缝的方砖 ——
  const tile = canvasTex(256, 256, (c) => {
    c.fillStyle = '#f4eee2'; c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#e7dccb'; c.fillRect(0, 0, 128, 128); c.fillRect(128, 128, 128, 128);
    for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(120,100,80,${Math.random() * 0.05})`; c.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
    c.strokeStyle = '#cfc4b2'; c.lineWidth = 3; c.strokeRect(0, 0, 128, 128); c.strokeRect(128, 128, 128, 128); c.strokeRect(128, 0, 128, 128); c.strokeRect(0, 128, 128, 128);
  }, { repeat: [7, 6] });
  const tileBump = canvasTex(256, 256, (c) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeRect(0, 0, 128, 128); c.strokeRect(128, 128, 128, 128); c.strokeRect(128, 0, 128, 128); c.strokeRect(0, 128, 128, 128);
  }, { repeat: [7, 6] });
  add(scene, G.plane(9.4, 8), new THREE.MeshStandardMaterial({ map: tile, bumpMap: tileBump, bumpScale: 0.6, roughness: 0.38, metalness: 0.05 }), 0, 0, -0.2, { rot: [-Math.PI / 2, 0, 0], cast: false });

  // —— 街道 ——
  const pave = canvasTex(256, 256, (c) => {
    c.fillStyle = '#cfcbc3'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#b3aea5'; c.lineWidth = 3;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) c.strokeRect(x * 64 + (y % 2) * 32 - 32, y * 64, 64, 64);
  }, { repeat: [28, 2] });
  const paveM = M(0xffffff, { map: pave, roughness: 0.95 });
  add(scene, G.plane(44, 2.7), paveM, 0, -0.02, -5.5, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(scene, G.box(44, 0.14, 0.22), M(0xb8b4ad), 0, -0.02, -6.92);
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x4b4e55, roughness: 0.95, bumpMap: grainTex(), bumpScale: 0.5 });
  add(scene, G.plane(44, 5.2), asphalt, 0, -0.09, -9.5, { rot: [-Math.PI / 2, 0, 0], cast: false });
  for (let x = -20; x <= 20; x += 3.2) add(scene, G.plane(1.5, 0.14), M(0xf2f2f2), x, -0.08, -9.5, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(scene, G.plane(44, 3.4), paveM, 0, -0.02, -13.6, { rot: [-Math.PI / 2, 0, 0], cast: false });
  add(scene, G.box(44, 0.14, 0.22), M(0xb8b4ad), 0, -0.02, -12.0);

  const sky = add(scene, G.plane(80, 34), new THREE.MeshBasicMaterial({ color: 0xbfe4ff }), 0, 9, -26, { cast: false, receive: false });
  // 云
  const clouds = [];
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 5; j++) add(c, G.sph(0.9 + r() * 0.8, 12, 8), cloudMat, (j - 2) * 1.1, r() * 0.5, r() * 0.4, { cast: false, receive: false, scale: [1.3, 0.75, 0.6] });
    c.position.set(-22 + i * 8.5 + r() * 3, 9.5 + r() * 4, -24);
    scene.add(c); clouds.push(c);
  }

  // —— 对面的商铺和楼 ——
  const cols = [0xf3d9c4, 0xdfe7f1, 0xf6e7b8, 0xe3d2ea, 0xd5ead9, 0xf2cfc6, 0xe7e2da];
  const awn = [0x3aa0e8, 0x6fbf8b, 0xf2a65a, 0xb39ddb, 0xe57373, 0x4db6ac];
  const names = ['便利店', '面包房', '花店', '书店', '理发', '水果', '药房', '快餐'];
  let bx = -19, bi = 0;
  while (bx < 19) {
    const w = 3.0 + r() * 2.2, h = 4.4 + r() * 4.6;
    const nx = Math.max(2, Math.round(w / 0.85)), ny = Math.max(3, Math.round(h / 0.95));
    const win = canvasTex(nx * 48, ny * 48, (c, cw, ch) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny - 1; j++) if (r() > 0.35) { c.fillStyle = r() > 0.5 ? '#ffdc96' : '#fff3d0'; c.fillRect(i * 48 + 11, j * 48 + 10, 26, 28); }
    });
    const day = canvasTex(nx * 48, ny * 48, (c, cw, ch) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny - 1; j++) {
        c.fillStyle = '#eee'; c.fillRect(i * 48 + 8, j * 48 + 7, 32, 34);
        c.fillStyle = '#8fb0cc'; c.fillRect(i * 48 + 11, j * 48 + 10, 26, 28);
        c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(i * 48 + 11, j * 48 + 10, 10, 28);
        c.fillStyle = '#ddd'; c.fillRect(i * 48 + 6, j * 48 + 40, 36, 4);
      }
    });
    const mat = new THREE.MeshStandardMaterial({ color: cols[Math.floor(r() * cols.length)], map: day, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0, roughness: 0.9 });
    mat.userData = { base: 0, gain: 1.3 };
    night.push(mat);
    const b = group(scene, bx + w / 2, 0, -17);
    add(b, G.box(w, h, 3.4), mat, 0, h / 2, 0, { cast: false });
    add(b, G.box(w + 0.16, 0.16, 3.56), M(0xe9e4dc), 0, h + 0.08, 0, { cast: false });
    if (r() > 0.4) { add(b, G.cyl(0.35, 0.35, 0.6, 12), M(0xa8b2bd, { metalness: 0.5, roughness: 0.5 }), w * 0.2, h + 0.55, 0); add(b, G.cone(0.38, 0.2, 12), M(0x8a95a1), w * 0.2, h + 0.95, 0); }
    if (r() > 0.5) add(b, G.box(0.6, 0.35, 0.5), M(0xdadde2), -w * 0.25, h + 0.33, 0.6);
    // 底层店面
    const ac = awn[bi % awn.length];
    add(b, G.box(w - 0.3, 1.5, 0.1), glass(0x9fc2dd, 0.75), 0, 0.95, 1.72, { cast: false });
    add(b, G.box(w, 0.4, 0.12), M(0x4a4d55), 0, 0.2, 1.72, { cast: false });
    const plate = textPlate(names[bi % names.length], { w: 384, h: 96, bg: hexOf(ac), size: 58 });
    add(b, G.box(w - 0.1, 0.5, 0.1), glow(0xffffff, 0.12, 0.9, { map: plate, emissiveMap: plate, emissive: 0xffffff }), 0, 2.15, 1.75, { cast: false });
    const aw = group(b, 0, 1.82, 2.05);
    aw.rotation.x = 0.45;
    const stripes = Math.round(w / 0.45);
    for (let i = 0; i < stripes; i++) add(aw, G.box((w - 0.1) / stripes, 0.04, 0.9), M(i % 2 ? 0xffffff : ac, { roughness: 0.9 }), -w / 2 + 0.05 + (i + 0.5) * ((w - 0.1) / stripes), 0, 0, { cast: false });
    bx += w + 0.12; bi++;
  }

  // 行道树、路灯、长椅、消防栓、单车、花箱
  const leaf = M(0x6fb262, { roughness: 0.95 }), leaf2 = M(0x8fca78, { roughness: 0.95 }), leaf3 = M(0x5a9f55, { roughness: 0.95 }), trunk = M(0x8a6444, { roughness: 0.9 });
  const leaves = [leaf, leaf2, leaf3];
  for (const tx of [-5.4, -0.5, 5.9]) {
    const t = group(scene, tx, 0, -6.45);
    add(t, G.cyl(0.07, 0.11, 1.5, 10), trunk, 0, 0.75, 0);
    add(t, G.cyl(0.03, 0.05, 0.6, 6), trunk, 0.18, 1.45, 0, { rot: [0, 0, -0.7] });
    add(t, G.cyl(0.03, 0.05, 0.6, 6), trunk, -0.16, 1.5, 0.05, { rot: [0, 0, 0.6] });
    const tr = rng(Math.round(tx * 10 + 99));
    for (let i = 0; i < 14; i++) {
      const a = tr() * Math.PI * 2, e = tr() * 0.9, rad = 0.55 * Math.cos(e);
      add(t, G.sph(0.26 + tr() * 0.2, 10, 8), leaves[i % 3], Math.cos(a) * rad, 1.75 + Math.sin(e) * 0.75, Math.sin(a) * rad * 0.9);
    }
    add(t, G.sph(0.5, 12, 10), leaf, 0, 2.0, 0);
    add(t, G.box(1.0, 0.1, 1.0), M(0xa9a59d), 0, 0.03, 0);
    add(t, G.box(0.82, 0.02, 0.82), M(0x6b5340, { roughness: 1 }), 0, 0.085, 0, { cast: false });
  }
  for (const lx of [-2.9, 3.3]) {
    const l = group(scene, lx, 0, -6.6);
    const pm = M(0x33373d, { metalness: 0.6, roughness: 0.45 });
    add(l, G.cyl(0.07, 0.09, 0.3, 12), pm, 0, 0.15, 0);
    add(l, G.cyl(0.032, 0.045, 3.0, 10), pm, 0, 1.6, 0);
    add(l, G.box(0.36, 0.04, 0.04), pm, 0.16, 3.1, 0);
    add(l, G.cyl(0.07, 0.15, 0.1, 14), pm, 0.32, 3.04, 0);
    add(l, G.sph(0.09, 12, 8), glow(0xffe6b0, 0.05, 3.5), 0.32, 2.96, 0, { cast: false });
  }
  { // 长椅
    const b = group(scene, -3.0, 0, -6.3);
    const wd = M(0xffffff, { map: woodTex(), roughness: 0.6 });
    for (let i = 0; i < 3; i++) add(b, G.rbox(1.3, 0.035, 0.11, 0.01), wd, 0, 0.42, -0.14 + i * 0.13);
    for (let i = 0; i < 2; i++) add(b, G.rbox(1.3, 0.11, 0.03, 0.01), wd, 0, 0.6 + i * 0.14, -0.22);
    for (const sx of [-0.55, 0.55]) { add(b, G.box(0.05, 0.42, 0.36), dark, sx, 0.21, 0); add(b, G.box(0.05, 0.42, 0.04), dark, sx, 0.62, -0.24); }
  }
  { // 消防栓
    const h = group(scene, 0.9, 0, -6.55), hm = gloss(0xd8372b);
    add(h, G.cyl(0.09, 0.1, 0.42, 12), hm, 0, 0.21, 0); add(h, G.dome(0.09, 0.5, 12, 8), hm, 0, 0.42, 0);
    add(h, G.cyl(0.04, 0.04, 0.26, 8), hm, 0, 0.3, 0, { rot: [0, 0, Math.PI / 2] }); add(h, G.cyl(0.12, 0.12, 0.03, 12), hm, 0, 0.02, 0);
  }
  { // 共享单车
    const bk = group(scene, -1.7, 0, -4.78), fm = gloss(0xf2c91c), tm = M(0x1d1d1f, { roughness: 0.8 });
    bk.rotation.y = 0.15;
    for (const wx of [-0.45, 0.45]) { add(bk, G.torus(0.27, 0.028, Math.PI * 2, 8, 24), tm, wx, 0.3, 0); add(bk, G.cyl(0.03, 0.03, 0.05, 8), steel(), wx, 0.3, 0, { rot: [Math.PI / 2, 0, 0] }); for (let i = 0; i < 6; i++) add(bk, G.cyl(0.004, 0.004, 0.5, 4), steel(), wx, 0.3, 0, { rot: [0, 0, i * Math.PI / 6], cast: false }); }
    add(bk, G.cyl(0.022, 0.022, 0.62, 8), fm, -0.02, 0.5, 0, { rot: [0, 0, 1.05] });
    add(bk, G.cyl(0.022, 0.022, 0.5, 8), fm, -0.2, 0.52, 0, { rot: [0, 0, -0.3] });
    add(bk, G.cyl(0.02, 0.02, 0.5, 8), fm, 0.38, 0.55, 0, { rot: [0, 0, 0.3] });
    add(bk, G.rbox(0.2, 0.04, 0.1, 0.02), tm, -0.28, 0.79, 0);
    add(bk, G.cyl(0.014, 0.014, 0.46, 8), tm, 0.31, 0.82, 0, { rot: [Math.PI / 2, 0, 0] });
    add(bk, G.rbox(0.24, 0.16, 0.26, 0.02), M(0x55585f), 0.52, 0.7, 0);
  }
  for (const [px, pz] of [[-4.0, -4.62], [4.25, -4.62]]) {
    const p = group(scene, px, 0, pz);
    add(p, G.rbox(1.1, 0.4, 0.36, 0.03), M(0xc9a27a, { map: woodTex(), roughness: 0.7 }), 0, 0.2, 0);
    for (let i = 0; i < 7; i++) add(p, G.sph(0.17 + r() * 0.06, 10, 8), leaves[i % 3], -0.42 + i * 0.14, 0.48 + r() * 0.08, (r() - 0.5) * 0.1);
    for (let i = 0; i < 5; i++) add(p, G.sph(0.035, 8, 6), M([0xff8fa8, 0xffd166, 0xffffff][i % 3]), -0.4 + i * 0.2, 0.66 + r() * 0.04, 0.1);
  }

  // 车
  const cars = [];
  const carCols = [0xf2c91c, 0x3aa0e8, 0xfafafa, 0xe57373, 0x6fbf8b];
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? -1 : 1;
    const g = group(scene, -20 + i * 11 + r() * 4, -0.06, dir > 0 ? -10.6 : -8.4);
    g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const bm = gloss(carCols[i % carCols.length], { clearcoat: 1 }), bus = i === 2;
    const L = bus ? 3.6 : 2.1, Hh = bus ? 1.3 : 0.5;
    add(g, G.rbox(1.0, Hh, L, 0.12, 4), bm, 0, 0.32 + Hh / 2, 0);
    if (!bus) add(g, G.rbox(0.9, 0.42, L * 0.52, 0.14, 4), bm, 0, 1.0, -0.08);
    const gm = P(0x1c2b3a, { roughness: 0.08, metalness: 0.3 });
    if (bus) { for (const sx of [-0.505, 0.505]) add(g, G.box(0.01, 0.5, L * 0.86), gm, sx, 1.25, 0, { cast: false }); add(g, G.box(0.9, 0.55, 0.01), gm, 0, 1.22, L / 2 + 0.002, { cast: false }); }
    else { for (const sx of [-0.452, 0.452]) add(g, G.box(0.01, 0.26, L * 0.44), gm, sx, 1.02, -0.08, { cast: false }); add(g, G.box(0.8, 0.28, 0.01), gm, 0, 1.02, L * 0.26 - 0.075, { rot: [-0.25, 0, 0], cast: false }); }
    const wheels = [];
    for (const sx of [-0.48, 0.48]) for (const sz of [-L * 0.32, L * 0.32]) {
      const w = group(g, sx, 0.3, sz);
      add(w, G.cyl(0.24, 0.24, 0.16, 16), M(0x1d1d1f, { roughness: 0.85 }), 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
      add(w, G.cyl(0.12, 0.12, 0.17, 6), steel(), 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
      wheels.push(w);
    }
    for (const sx of [-0.34, 0.34]) { add(g, G.sph(0.07, 10, 8), glow(0xfff6d8, 0.4, 3), sx, 0.56, L / 2, { scale: [1, 1, 0.3], cast: false }); add(g, G.box(0.16, 0.07, 0.02), glow(0xff3b30, 0.3, 2), sx, 0.6, -L / 2, { cast: false }); }
    cars.push({ g, dir, speed: 3.2 + r() * 2.2, wheels });
  }

  // —— 店面（朝街的玻璃墙，z = -4.2）——
  const wallZ = -4.2;
  const cream = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.92, bumpMap: grainTex(), bumpScale: 0.25 });
  add(scene, G.box(6.3, 0.5, 0.16), red, -1.55, 0.25, wallZ);
  add(scene, G.box(1.7, 0.5, 0.16), red, 3.85, 0.25, wallZ);
  add(scene, G.box(6.3, 0.05, 0.24), white, -1.55, 0.52, wallZ);
  add(scene, G.box(1.7, 0.05, 0.24), white, 3.85, 0.52, wallZ);
  add(scene, G.box(9.4, 0.9, 0.2), red, 0, 3.05, wallZ);
  add(scene, G.box(9.4, 0.08, 0.28), white, 0, 2.58, wallZ);
  for (const px of [-4.6, -2.75, -0.9, 1.55, 3.0, 4.6]) add(scene, G.rbox(0.1, 2.6, 0.14, 0.02), white, px, 1.3, wallZ);
  const pane = glass(0xcfeaff, 0.12);
  add(scene, G.box(6.2, 2.05, 0.03), pane, -1.55, 1.55, wallZ, { cast: false, order: 1 });
  add(scene, G.box(1.6, 2.05, 0.03), pane, 3.8, 1.55, wallZ, { cast: false, order: 1 });
  // 玻璃上的磨砂腰线
  const frost = canvasTex(512, 64, (c) => {
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(0, 0, 512, 64);
    c.fillStyle = '#e2231a'; c.font = `600 30px ${FONT}`; c.textBaseline = 'middle';
    for (let x = 16; x < 512; x += 256) c.fillText('鲜果茶 · 冰淇淋', x, 34);
  });
  const frostM = new THREE.MeshBasicMaterial({ map: frost, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  for (const [x, w] of [[-3.68, 1.75], [-1.83, 1.75], [0.33, 2.35], [3.8, 1.5]]) add(scene, G.plane(w, 0.2), frostM, x, 1.0, wallZ + 0.02, { cast: false, receive: false, order: 2 });
  // 室外的红白雨棚
  for (let i = 0; i < 20; i++) add(scene, G.box(0.47, 0.04, 1.0), M(i % 2 ? 0xffffff : RED, { roughness: 0.9 }), -4.47 + i * 0.47, 2.42, wallZ - 0.55, { rot: [-0.35, 0, 0] });
  // 敞开的玻璃门
  const door = group(scene, 3.0, 0, wallZ);
  door.rotation.y = 1.25;
  add(door, G.box(1.35, 2.5, 0.03), pane, -0.7, 1.27, 0, { cast: false, order: 1 });
  add(door, G.box(1.4, 0.08, 0.06), white, -0.7, 2.52, 0);
  add(door, G.box(1.4, 0.14, 0.06), white, -0.7, 0.07, 0);
  add(door, G.box(0.06, 2.5, 0.06), white, -1.4, 1.27, 0);
  add(door, G.box(0.06, 2.5, 0.06), white, -0.02, 1.27, 0);
  for (const s of [-1, 1]) { add(door, G.cyl(0.016, 0.016, 0.6, 8), steel(), -1.25, 1.2, s * 0.06); add(door, G.cyl(0.012, 0.012, 0.06, 6), steel(), -1.25, 1.45, s * 0.03, { rot: [Math.PI / 2, 0, 0] }); add(door, G.cyl(0.012, 0.012, 0.06, 6), steel(), -1.25, 0.95, s * 0.03, { rot: [Math.PI / 2, 0, 0] }); }
  // “营业中”挂牌
  const sign = group(scene, 2.3, 2.52, wallZ + 0.1);
  add(sign, G.cyl(0.004, 0.004, 0.2, 4), dark, -0.12, -0.1, 0, { rot: [0, 0, 0.3], cast: false });
  add(sign, G.cyl(0.004, 0.004, 0.2, 4), dark, 0.12, -0.1, 0, { rot: [0, 0, -0.3], cast: false });
  add(sign, G.rbox(0.44, 0.2, 0.02, 0.02), M(0xffffff, { map: textPlate('营业中', { w: 256, h: 112, bg: '#ffffff', fg: '#e2231a', size: 60 }) }), 0, -0.3, 0);
  // 门垫
  const matTex = canvasTex(256, 128, (c) => { c.fillStyle = '#9b2a22'; c.fillRect(0, 0, 256, 128); c.strokeStyle = '#f2d9a0'; c.lineWidth = 5; c.strokeRect(10, 10, 236, 108); c.fillStyle = '#f2d9a0'; c.font = `700 44px ${FONT}`; c.textAlign = 'center'; c.fillText('欢迎光临', 128, 80); });
  add(scene, G.rbox(1.3, 0.025, 0.7, 0.01), new THREE.MeshStandardMaterial({ map: matTex, roughness: 1, bumpMap: grainTex(), bumpScale: 1 }), 2.28, 0.012, -3.65, { cast: false });
  // 门头内侧的灯箱字
  const signTex = canvasTex(1024, 128, (c, w, h) => {
    c.fillStyle = '#e2231a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 70px ${FONT}`; c.fillText('欢 迎 光 临 · 甜 蜜 营 业 中', w / 2, h / 2 + 4);
  });
  add(scene, G.rbox(6.6, 0.8, 0.06, 0.03), white, -0.6, 3.02, wallZ + 0.1, { cast: false });
  add(scene, G.plane(6.4, 0.66), glow(0xffffff, 0.25, 0.9, { map: signTex, emissiveMap: signTex, emissive: 0xffffff }), -0.6, 3.02, wallZ + 0.135, { cast: false });

  // 侧墙 + 腰线 + 踢脚 + 海报
  for (const sd of [-1, 1]) {
    add(scene, G.box(0.2, 3.5, 8), cream, sd * 4.7, 1.75, -0.2);
    add(scene, G.box(0.22, 0.16, 8), red, sd * 4.69, 1.05, -0.2, { cast: false });
    add(scene, G.box(0.23, 0.02, 8), white, sd * 4.69, 1.14, -0.2, { cast: false });
    add(scene, G.box(0.22, 0.12, 8), white, sd * 4.69, 0.06, -0.2, { cast: false });
  }
  const posters = [
    ['冰鲜柠檬水', 4, '#fff3b8', '#f8dc30', '捶出来的酸爽', -1, -3.0], ['珍珠奶茶', 6, '#f3dcc6', '#c98d5c', '满满一勺珍珠', -1, -1.55],
    ['新鲜冰淇淋', 2, '#ffe1dc', '#fff5dc', '现打现卖', 1, -1.4], ['蜜桃四季春', 7, '#ffd9cf', '#ff9d85', '喝一口春天', 1, 0.05],
  ];
  const frameM = M(0xffffff, { map: woodTex(), roughness: 0.6 });
  for (const [t, p, bg, lq, sub, sd, z] of posters) {
    const g = group(scene, sd * 4.585, 1.98, z);
    g.rotation.y = -sd * Math.PI / 2;
    add(g, G.rbox(1.06, 1.38, 0.04, 0.02), frameM, 0, 0, -0.012);
    add(g, G.plane(0.94, 1.26), M(0xffffff, { map: poster(t, p, bg, lq, sub), roughness: 0.5 }), 0, 0, 0.012, { cast: false });
  }
  { // 挂钟
    const c = group(scene, -4.585, 2.78, 0.5); c.rotation.y = Math.PI / 2;
    add(c, G.cyl(0.2, 0.2, 0.04, 28), dark, 0, 0, 0, { rot: [Math.PI / 2, 0, 0] });
    const face = canvasTex(128, 128, (x) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.fillStyle = '#1d1d1f'; for (let i = 0; i < 12; i++) { x.save(); x.translate(64, 64); x.rotate(i * Math.PI / 6); x.fillRect(-2, -58, 4, i % 3 ? 7 : 13); x.restore(); } x.save(); x.translate(64, 64); x.rotate(1.0); x.fillRect(-3, -34, 6, 38); x.rotate(1.7); x.fillRect(-2, -48, 4, 52); x.restore(); });
    add(c, G.circle(0.18, 28), M(0xffffff, { map: face }), 0, 0, 0.022, { cast: false });
  }
  // 等位区：小圆桌 + 高脚凳
  {
    const t = group(scene, -3.55, 0, -3.25), wd = M(0xffffff, { map: woodTex(), roughness: 0.45 });
    add(t, G.cyl(0.42, 0.42, 0.04, 28), wd, 0, 0.74, 0); add(t, G.cyl(0.035, 0.035, 0.72, 10), dark, 0, 0.37, 0); add(t, G.cyl(0.24, 0.26, 0.03, 20), dark, 0, 0.015, 0);
    for (const [sx, sz] of [[-0.62, 0.25], [0.6, 0.35]]) {
      const s = group(t, sx, 0, sz);
      add(s, G.cyl(0.17, 0.17, 0.05, 20), gloss(RED), 0, 0.5, 0); add(s, G.cyl(0.02, 0.02, 0.48, 8), steel(), 0, 0.25, 0); add(s, G.cyl(0.15, 0.16, 0.02, 16), steel(), 0, 0.01, 0); add(s, G.torus(0.11, 0.01, Math.PI * 2, 6, 16), steel(), 0, 0.2, 0, { rot: [Math.PI / 2, 0, 0] });
    }
    add(t, G.cyl(0.035, 0.028, 0.1, 10), M(0xffffff), 0.1, 0.81, 0.05); add(t, G.rbox(0.14, 0.02, 0.1, 0.005), M(0xffffff), -0.12, 0.77, -0.05);
  }
  // 绿植
  const plant = (x, z, s = 1) => {
    const p = group(scene, x, 0, z); p.scale.setScalar(s);
    add(p, G.cyl(0.2, 0.15, 0.4, 16), gloss(0xffffff), 0, 0.2, 0); add(p, G.cyl(0.18, 0.18, 0.02, 16), M(0x5d4037, { roughness: 1 }), 0, 0.39, 0);
    const pr = rng(Math.round(Math.abs(x * 13 + z * 7)) + 3);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2, tilt = 0.25 + pr() * 0.55, len = 0.7 + pr() * 0.5;
      const lf = group(p, 0, 0.4, 0); lf.rotation.set(0, a, tilt);
      add(lf, G.cyl(0.008, 0.012, len, 5), leaf3, 0, len / 2, 0);
      add(lf, G.sph(0.16, 10, 8), i % 2 ? leaf : leaf2, 0, len, 0, { scale: [0.75, 1.5, 0.12] });
    }
  };
  plant(-4.15, -2.2); plant(4.2, -0.6, 0.85);
  { // 易拉宝
    const s = group(scene, 4.05, 0, -3.1); s.rotation.y = -0.9;
    const tex = canvasTex(256, 640, (c) => {
      c.fillStyle = '#e2231a'; c.fillRect(0, 0, 256, 640); c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 250, 96, 0, 7); c.fill();
      c.fillStyle = '#f8dc30'; c.beginPath(); c.arc(128, 250, 70, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(128, 250); c.lineTo(128 + Math.cos(i * 0.785) * 70, 250 + Math.sin(i * 0.785) * 70); c.stroke(); }
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = `700 54px ${FONT}`; c.fillText('第二杯', 128, 96); c.fillText('半价', 128, 440); c.font = `500 26px ${FONT}`; c.fillText('（想得美）', 128, 490); c.font = `700 40px ${FONT}`; c.fillText('柠檬水 ¥4', 128, 580);
    });
    add(s, G.box(0.62, 1.55, 0.01), M(0xffffff, { map: tex, roughness: 0.6 }), 0, 0.86, 0);
    add(s, G.box(0.66, 0.06, 0.1), steel(), 0, 0.05, 0); add(s, G.cyl(0.01, 0.01, 1.6, 6), steel(), 0, 0.85, -0.03); add(s, G.box(0.64, 0.03, 0.02), steel(), 0, 1.64, 0);
  }
  { // 垃圾桶
    const t = group(scene, 4.15, 0, -2.0);
    add(t, G.cyl(0.2, 0.17, 0.62, 20), brushed(), 0, 0.31, 0); add(t, G.dome(0.2, 0.5, 20, 8), dark, 0, 0.62, 0, { scale: [1, 0.5, 1] }); add(t, G.box(0.2, 0.08, 0.02), M(0x0c0c0e), 0, 0.66, 0.17, { cast: false });
  }
  // 地上的排队脚印贴
  const foot = canvasTex(128, 128, (c) => { c.clearRect(0, 0, 128, 128); c.fillStyle = 'rgba(226,35,26,.8)'; for (const x of [44, 84]) { c.beginPath(); c.ellipse(x, 70, 13, 26, 0, 0, 7); c.fill(); c.beginPath(); c.arc(x, 30, 9, 0, 7); c.fill(); } });
  const footM = new THREE.MeshBasicMaterial({ map: foot, transparent: true, depthWrite: false });
  for (const sx of SLOT_X) add(scene, G.plane(0.5, 0.5), footM, sx, 0.004, -2.05, { rot: [-Math.PI / 2, 0, 0], cast: false, receive: false });

  // —— 收银台 / 出餐台 ——
  const counter = group(scene, 0, 0, -1.05);
  add(counter, G.rbox(6.5, 0.87, 0.6, 0.03), white, 0, 0.445, 0);
  add(counter, G.box(6.52, 0.14, 0.62), red, 0, 0.68, 0, { cast: false });
  add(counter, G.box(6.52, 0.08, 0.62), dark, 0, 0.04, 0, { cast: false });
  add(counter, G.rbox(6.7, 0.07, 0.78, 0.025), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.4 }), 0, 0.915, 0);
  for (let i = 0; i < 6; i++) { // 朝员工一侧的柜门和把手
    const x = -2.7 + i * 1.08;
    add(counter, G.rbox(1.0, 0.44, 0.02, 0.02), M(0xf3f3f5, { roughness: 0.5 }), x, 0.34, 0.305, { cast: false });
    add(counter, G.rbox(0.22, 0.022, 0.03, 0.01), steel(), x, 0.5, 0.325);
  }
  // 收银机 + 小票打印机 + 扫码牌
  const pos = group(counter, 2.65, COUNTER_Y, 0.02);
  const pm = P(0x2e3036, { roughness: 0.35, clearcoat: 0.5 });
  add(pos, G.rbox(0.36, 0.05, 0.3, 0.02), pm, 0, 0.025, 0);
  add(pos, G.cyl(0.03, 0.045, 0.22, 12), pm, 0, 0.15, -0.04);
  const scr = group(pos, 0, 0.3, 0.02);
  scr.rotation.x = -0.35;
  add(scr, G.rbox(0.46, 0.31, 0.03, 0.015), pm, 0, 0, 0);
  const scrTex = canvasTex(256, 160, (c) => {
    c.fillStyle = '#f5f5f7'; c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#e2231a'; c.fillRect(0, 0, 256, 30);
    c.fillStyle = '#fff'; c.font = `600 18px ${FONT}`; c.fillText('收银系统', 10, 21);
    const cs = ['#fff3b8', '#f3dcc6', '#ffe1dc', '#ffd9cf', '#dfe7f1', '#d5ead9'];
    for (let i = 0; i < 6; i++) { c.fillStyle = cs[i]; c.fillRect(10 + (i % 3) * 56, 40 + Math.floor(i / 3) * 56, 50, 48); }
    c.fillStyle = '#fff'; c.fillRect(182, 36, 68, 118); c.fillStyle = '#1d1d1f'; for (let i = 0; i < 5; i++) c.fillRect(188, 46 + i * 14, 40 + (i % 2) * 14, 4);
    c.fillStyle = '#0071e3'; c.fillRect(188, 128, 56, 20);
  });
  add(scr, G.plane(0.42, 0.27), glow(0xffffff, 0.35, 0.5, { map: scrTex, emissiveMap: scrTex, emissive: 0xffffff }), 0, 0, 0.017, { cast: false });
  add(pos, G.rbox(0.16, 0.12, 0.2, 0.02), pm, -0.34, 0.06, 0.02);
  add(pos, G.box(0.1, 0.1, 0.002), M(0xffffff, { side: THREE.DoubleSide }), -0.34, 0.16, 0.0, { rot: [-0.25, 0, 0] });
  const qr = canvasTex(64, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#1d1d1f'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x * 7 + y * 13 + x * y) % 3 === 0) c.fillRect(8 + x * 6, 8 + y * 6, 6, 6); for (const [x, y] of [[6, 6], [42, 6], [6, 42]]) { c.fillStyle = '#1d1d1f'; c.fillRect(x, y, 16, 16); c.fillStyle = '#fff'; c.fillRect(x + 3, y + 3, 10, 10); c.fillStyle = '#1d1d1f'; c.fillRect(x + 6, y + 6, 4, 4); } });
  const qs = group(counter, 2.1, COUNTER_Y, 0.2);
  add(qs, G.rbox(0.13, 0.17, 0.012, 0.01), P(0x30c15a, { roughness: 0.3, clearcoat: 0.6 }), 0, 0.1, 0, { rot: [-0.2, 0, 0] }); add(qs, G.plane(0.09, 0.09), M(0xffffff, { map: qr }), 0, 0.105, 0.012, { rot: [-0.2, 0, 0], cast: false }); add(qs, G.box(0.1, 0.012, 0.07), M(0xdddddd), 0, 0.006, -0.01);
  // 小费罐
  const jar = group(counter, 0.82, COUNTER_Y, 0.08);
  add(jar, G.lathe([[0.07, 0.0], [0.082, 0.02], [0.086, 0.16], [0.07, 0.2], [0.066, 0.23]], 24), glass(0xffffff, 0.26), 0, 0, 0, { cast: false, order: 2 });
  add(jar, G.cyl(0.07, 0.07, 0.008, 20), glass(0xffffff, 0.3), 0, 0.004, 0, { cast: false });
  add(jar, G.torus(0.067, 0.006, Math.PI * 2, 6, 24), glass(0xffffff, 0.5), 0, 0.23, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  const gold = M(0xf2c14b, { metalness: 0.85, roughness: 0.25 });
  const coins = [];
  for (let i = 0; i < 14; i++) { const c = add(jar, G.cyl(0.026, 0.026, 0.007, 14), gold, (Math.random() - 0.5) * 0.08, 0.014 + i * 0.009, (Math.random() - 0.5) * 0.08, { rot: [Math.random() * 0.5, 0, Math.random() * 0.5] }); c.visible = i < 2; coins.push(c); }
  add(jar, G.plane(0.1, 0.05), M(0xffffff, { map: textPlate('小费罐', { w: 128, h: 64, bg: '#fff', fg: '#1d1d1f', size: 30 }) }), 0, 0.1, 0.09, { cast: false });
  // 吉祥物摆件：甜筒小子（原创）
  const mascot = group(counter, -0.82, COUNTER_Y, 0.05);
  buildMascot(mascot);
  // 吸管筒、纸巾盒、杯盖、呼叫铃
  const straws = group(counter, -2.75, COUNTER_Y, 0.05);
  add(straws, G.cyl(0.075, 0.065, 0.17, 20), brushed(), 0, 0.085, 0);
  for (let i = 0; i < 12; i++) add(straws, G.cyl(0.008, 0.008, 0.3, 6), gloss([RED, 0xffffff, 0x3aa0e8, 0xffd166][i % 4]), (Math.random() - 0.5) * 0.09, 0.2, (Math.random() - 0.5) * 0.09, { rot: [(Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3] });
  const nap = group(counter, -2.3, COUNTER_Y, 0.05);
  add(nap, G.rbox(0.2, 0.12, 0.14, 0.02), gloss(0xffffff), 0, 0.06, 0); add(nap, G.box(0.12, 0.005, 0.03), dark, 0, 0.122, 0, { cast: false });
  add(nap, G.box(0.1, 0.07, 0.002), M(0xffffff, { side: THREE.DoubleSide }), 0, 0.15, 0, { rot: [0.2, 0.3, 0.1] });
  const lids = group(counter, 2.05, COUNTER_Y, -0.12);
  for (let i = 0; i < 9; i++) add(lids, G.cyl(0.07, 0.074, 0.012, 20), glass(0xffffff, 0.5), 0, 0.008 + i * 0.012, 0, { order: 2 });
  const bell = group(counter, 0.3, COUNTER_Y, -0.15);
  add(bell, G.cyl(0.055, 0.06, 0.012, 16), dark, 0, 0.006, 0); add(bell, G.dome(0.05, 0.5, 16, 8), M(0xf2c14b, { metalness: 0.9, roughness: 0.2 }), 0, 0.012, 0); add(bell, G.cyl(0.008, 0.008, 0.02, 6), dark, 0, 0.07, 0);
  SLOT_X.forEach((sx, i) => {
    const s = group(counter, sx + 0.55, COUNTER_Y, 0.2);
    add(s, G.rbox(0.2, 0.1, 0.012, 0.01), M(0xffffff, { map: textPlate((i + 1) + ' 号口', { w: 128, h: 64, bg: '#fff', fg: '#e2231a', size: 34 }) }), 0, 0.07, 0, { rot: [-0.3, 0, 0] });
    add(s, G.rbox(0.2, 0.014, 0.08, 0.005), M(0xdddddd), 0, 0.007, 0);
    add(counter, G.rbox(0.5, 0.008, 0.36, 0.004), M(0x3a3a3e, { roughness: 0.9 }), sx, COUNTER_Y + 0.004, 0.15, { cast: false }); // 出餐垫
  });

  // 吊灯
  for (const lx of [-2.4, -0.8, 0.8, 2.4]) {
    const l = group(scene, lx, 0, -1.05);
    add(l, G.cyl(0.006, 0.006, 1.0, 6), dark, 0, 3.52, 0, { cast: false });
    add(l, G.cyl(0.03, 0.04, 0.06, 12), M(0xf2c14b, { metalness: 0.9, roughness: 0.3 }), 0, 3.03, 0, { cast: false });
    add(l, G.lathe([[0.04, 0.2], [0.07, 0.17], [0.16, 0.05], [0.21, 0], [0.2, 0], [0.15, 0.045], [0.06, 0.16]], 28), gloss(RED, { side: THREE.DoubleSide }), 0, 2.82, 0, { cast: false });
    add(l, G.sph(0.055, 12, 8), glow(0xfff0c8, 0.7, 3.2), 0, 2.86, 0, { cast: false });
  }

  // —— 操作台 ——
  const bench = group(scene, 0, 0, 0.45);
  add(bench, G.rbox(5.6, 0.86, 1.3, 0.03), white, 0, 0.43, 0);
  add(bench, G.box(5.62, 0.1, 1.32), red, 0, 0.7, 0, { cast: false });
  const streak = canvasTex(256, 256, (c) => {
    c.fillStyle = '#6a6a6a'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { const v = 80 + Math.random() * 80; c.fillStyle = `rgba(${v},${v},${v},.45)`; c.fillRect(Math.random() * 256, Math.random() * 256, 60 + Math.random() * 190, 1); }
  }, { repeat: [3, 1] });
  add(bench, G.rbox(5.72, 0.06, 1.4, 0.02), new THREE.MeshStandardMaterial({ color: 0xe9ecf0, roughness: 0.55, metalness: 0.8, roughnessMap: streak }), 0, BENCH_Y - 0.03, 0);
  add(bench, G.rbox(5.72, 0.1, 0.03, 0.01), brushed(), 0, BENCH_Y + 0.03, -0.69); // 后挡水条
  // 台面上的抹布
  const rag = group(bench, 0.5, BENCH_Y, 0.48);
  add(rag, G.rbox(0.2, 0.025, 0.14, 0.012), cloth(0x8ec7f2), 0, 0.012, 0, { rot: [0, 0.3, 0] });
  add(rag, G.rbox(0.19, 0.02, 0.07, 0.01), cloth(0xffffff), 0.005, 0.03, 0.02, { rot: [0, 0.3, 0] });

  return { sky, night, coins, mascot, cars, clouds, cloudMat, sign, rag };
}

function buildMascot(g) {
  // 一个甜筒小人，纯原创造型
  const waffle = M(0xe2a55a, { roughness: 0.8 }), creamM = P(0xfff7e6, { roughness: 0.4, clearcoat: 0.3 });
  add(g, G.cyl(0.08, 0.085, 0.02, 24), gloss(0xe2231a), 0, 0.01, 0);
  add(g, G.cone(0.075, 0.17, 20), waffle, 0, 0.105, 0, { rot: [Math.PI, 0, 0] });
  add(g, G.cyl(0.084, 0.078, 0.028, 20), waffle, 0, 0.195, 0);
  add(g, G.sph(0.088), creamM, 0, 0.265, 0);
  add(g, G.sph(0.068), creamM, 0, 0.35, 0);
  add(g, G.sph(0.045), creamM, 0, 0.412, 0);
  add(g, G.cone(0.022, 0.05, 10), creamM, 0.006, 0.455, 0, { rot: [0, 0, -0.2] });
  const eye = M(0x1d1d1f, { roughness: 0.15 });
  for (const s of [-1, 1]) { add(g, G.sph(0.013, 10, 8), eye, s * 0.03, 0.28, 0.079); add(g, G.sph(0.004, 6, 6), M(0xffffff), s * 0.03 + 0.004, 0.285, 0.09); add(g, G.sph(0.015, 8, 8), M(0xffa6a0), s * 0.054, 0.258, 0.066, { scale: [1, 0.7, 0.5] }); }
  add(g, G.torus(0.016, 0.004, Math.PI, 6, 12), eye, 0, 0.256, 0.084, { rot: [0, 0, Math.PI] });
  add(g, G.cap(0.012, 0.05, 4, 8), waffle, -0.097, 0.2, 0, { rot: [0, 0, -0.9] });
  add(g, G.cap(0.012, 0.05, 4, 8), waffle, 0.097, 0.215, 0, { rot: [0, 0, 1.2] });
  add(g, G.sph(0.016, 8, 6), M(0xe2231a), 0.02, 0.475, 0);
}
