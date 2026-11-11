// 操作台上的所有设备模型。每个设备是一个可点击的“工位”
import * as THREE from 'three';
import { M, P, G, add, group, canvasTex, steel, glass, gloss, brushed, FONT, rng, hex, woodTex, weaveTex } from './h.js';
import { ING } from './data.js';
import { BENCH_Y, RED, textPlate } from './world.js';

const Y = BENCH_Y;
const BACK = 0.08, FRONT = 0.72;

export function buildStations(scene) {
  const list = [];
  const root = group(scene);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const dark = P(0x2a2a2e, { roughness: 0.4, clearcoat: 0.4 }), rubber = M(0x1d1d1f, { roughness: 0.9 });
  const whiteP = gloss(0xffffff), redP = gloss(RED);

  function station(id, label, x, z, o = {}) {
    const g = group(root, x, Y, z);
    g.userData.stationId = id;
    const st = { id, label, group: g, type: o.type || 'ing', ing: o.ing, labelPos: new THREE.Vector3(), key: o.key };
    list.push(st);
    return st;
  }
  function finish(st, w, h, d, labelAt) {
    // 只用于点击的盒子：放在第 1 层，镜头不渲染它
    const m = add(st.group, G.box(w, h, d), hitMat, 0, h / 2, 0, { cast: false, receive: false });
    m.layers.set(1);
    st.labelPos.set(st.group.position.x + labelAt[0], Y + labelAt[1], st.group.position.z + labelAt[2]);
  }
  const labelTex = (text, bg, fg = '#fff') => canvasTex(128, 64, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, 128, 64);
    c.fillStyle = fg; c.font = `700 ${text.length > 2 ? 30 : 38}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 64, 34);
    c.fillStyle = fg; c.globalAlpha = 0.5; c.fillRect(8, 6, 112, 2); c.fillRect(8, 56, 112, 2);
  }, { repeat: [3, 1] });
  const feet = (g, w, d, h = 0.02) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, G.cyl(0.022, 0.026, h, 10), rubber, sx * w, h / 2, sz * d); };

  // —— 冰淇淋机 ——
  const ss = station('softserve', '冰淇淋机（按住）', -2.28, BACK + 0.02, { type: 'softserve' });
  {
    const g = ss.group;
    feet(g, 0.23, 0.23);
    add(g, G.rbox(0.56, 0.11, 0.56, 0.035), whiteP, 0, 0.075, 0);
    add(g, G.rbox(0.56, 0.74, 0.3, 0.035), whiteP, 0, 0.48, -0.13);
    // 侧面散热格栅
    for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) add(g, G.box(0.006, 0.014, 0.2), dark, sx * 0.282, 0.26 + i * 0.035, -0.13, { cast: false });
    // 机头
    add(g, G.rbox(0.6, 0.27, 0.6, 0.05), redP, 0, 0.945, 0);
    add(g, G.rbox(0.52, 0.04, 0.52, 0.02), whiteP, 0, 1.095, 0);
    add(g, G.rbox(0.3, 0.035, 0.3, 0.015), brushed(), 0, 1.13, 0);
    add(g, G.sph(0.03, 12, 8), dark, 0, 1.16, 0);
    add(g, G.box(0.602, 0.012, 0.602), brushed(), 0, 0.812, 0, { cast: false });
    // 三个出料口，中间的是混合口
    for (const nx of [-0.13, 0, 0.13]) {
      add(g, G.cyl(0.042, 0.042, 0.03, 16), brushed(), nx, 0.8, 0.15);
      add(g, G.cyl(0.03, 0.022, 0.07, 16), steel(), nx, 0.765, 0.15);
      add(g, G.cyl(0.024, 0.024, 0.008, 6), dark, nx, 0.728, 0.15);
    }
    // 拉杆（只有中间的会动）
    const mkLever = (x) => {
      const lv = group(g, x, 0.94, 0.3);
      add(lv, G.cyl(0.013, 0.013, 0.2, 8), steel(), 0, 0.06, 0.04, { rot: [0.9, 0, 0] });
      add(lv, G.sph(0.036, 14, 10), P(0x1d1d1f, { roughness: 0.2, clearcoat: 1 }), 0, 0.12, 0.12);
      return lv;
    };
    mkLever(-0.13); mkLever(0.13);
    ss.lever = mkLever(0);
    // 面板：显示屏和按钮
    const lcd = canvasTex(128, 64, (c) => { c.fillStyle = '#0c1a12'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#5dff9a'; c.font = '700 34px monospace'; c.textAlign = 'center'; c.fillText('-5°C', 64, 44); });
    add(g, G.rbox(0.2, 0.09, 0.01, 0.008), dark, -0.14, 0.52, 0.022, { cast: false });
    add(g, G.plane(0.17, 0.07), new THREE.MeshStandardMaterial({ map: lcd, emissive: 0xffffff, emissiveMap: lcd, emissiveIntensity: 0.8 }), -0.14, 0.52, 0.029, { cast: false });
    [0x30d158, 0xff9f0a, 0xff453a].forEach((c, i) => add(g, G.cyl(0.018, 0.018, 0.012, 12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, roughness: 0.3 }), 0.06 + i * 0.06, 0.52, 0.026, { rot: [Math.PI / 2, 0, 0], cast: false }));
    add(g, G.plane(0.5, 0.16), M(0xffffff, { map: textPlate('鲜打冰淇淋', { w: 256, h: 82, size: 44 }) }), 0, 0.955, 0.302, { cast: false });
    // 接水盘
    add(g, G.rbox(0.36, 0.022, 0.26, 0.01), dark, 0, 0.14, 0.13);
    for (let i = -4; i <= 4; i++) add(g, G.box(0.01, 0.012, 0.22), brushed(), i * 0.036, 0.152, 0.13, { cast: false });
    add(g, G.box(0.34, 0.012, 0.01), brushed(), 0, 0.152, 0.02, { cast: false }); add(g, G.box(0.34, 0.012, 0.01), brushed(), 0, 0.152, 0.24, { cast: false });
    // 侧挂的甜筒筒
    add(g, G.cyl(0.05, 0.045, 0.3, 14, true), glass(0xffffff, 0.35), 0.34, 0.5, 0.05, { order: 2 });
    for (let i = 0; i < 4; i++) add(g, G.cone(0.04, 0.13, 12), M(0xe2a55a, { roughness: 0.8 }), 0.34, 0.42 + i * 0.045, 0.05, { rot: [Math.PI, 0, 0], cast: false });
    add(g, G.box(0.06, 0.03, 0.04), steel(), 0.3, 0.6, 0.05);
    ss.spot = new THREE.Vector3(-2.28, Y + 0.16, BACK + 0.17);
    finish(ss, 0.62, 1.16, 0.62, [0, 1.26, 0]);
  }

  // —— 茶桶 ——
  const urns = [['blackTea', -1.62], ['greenTea', -1.22], ['milk', -0.82], ['water', -0.42]];
  for (const [ing, x] of urns) {
    const st = station(ing, ING[ing].name, x, BACK, { ing });
    const g = st.group, col = ING[ing].color, light = ing === 'milk' || ing === 'water' || ing === 'greenTea';
    // 三脚底座
    add(g, G.cyl(0.13, 0.145, 0.03, 24), dark, 0, 0.015, 0);
    add(g, G.cyl(0.11, 0.12, 0.06, 24), dark, 0, 0.06, 0);
    // 桶身
    add(g, G.lathe([[0, 0.09], [0.135, 0.09], [0.147, 0.12], [0.147, 0.46], [0.152, 0.47], [0.152, 0.485], [0.14, 0.49]], 36), brushed(), 0, 0, 0);
    for (const yy of [0.2, 0.39]) add(g, G.torus(0.148, 0.005, Math.PI * 2, 6, 36), steel(), 0, yy, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
    add(g, G.cyl(0.1495, 0.1495, 0.13, 36, true), M(0xffffff, { map: labelTex(ING[ing].name, hex(col), light ? '#1d1d1f' : '#fff'), roughness: 0.55 }), 0, 0.295, 0, { rot: [0, -Math.PI / 3, 0], cast: false });
    // 盖子和提手
    add(g, G.lathe([[0.15, 0.485], [0.15, 0.495], [0.13, 0.515], [0.06, 0.545], [0, 0.55]], 36), brushed(), 0, 0, 0);
    add(g, G.cyl(0.02, 0.026, 0.03, 12), dark, 0, 0.562, 0); add(g, G.sph(0.03, 12, 8), dark, 0, 0.59, 0, { scale: [1, 0.7, 1] });
    for (const sx of [-1, 1]) { add(g, G.torus(0.04, 0.009, Math.PI, 6, 12), dark, sx * 0.155, 0.38, 0, { rot: [0, 0, -sx * Math.PI / 2] }); }
    // 液位管
    add(g, G.cyl(0.011, 0.011, 0.26, 8), glass(0xffffff, 0.4), 0.105, 0.3, 0.108, { order: 2, cast: false });
    add(g, G.cyl(0.007, 0.007, 0.19, 8), M(col, { roughness: 0.15 }), 0.105, 0.265, 0.108, { cast: false });
    for (const yy of [0.17, 0.43]) add(g, G.cyl(0.014, 0.014, 0.014, 8), steel(), 0.105, yy, 0.108);
    // 龙头
    add(g, G.cyl(0.02, 0.02, 0.09, 10), steel(), 0, 0.14, 0.18, { rot: [Math.PI / 2, 0, 0] });
    add(g, G.cyl(0.024, 0.024, 0.04, 10), steel(), 0, 0.14, 0.225);
    add(g, G.cyl(0.013, 0.016, 0.045, 10), steel(), 0, 0.1, 0.225);
    add(g, G.rbox(0.028, 0.075, 0.02, 0.008), gloss(light ? 0x3aa0e8 : RED), 0, 0.2, 0.225, { rot: [-0.25, 0, 0] });
    // 接水小盘
    add(g, G.cyl(0.05, 0.045, 0.014, 16), brushed(), 0, 0.007, 0.225);
    finish(st, 0.36, 0.64, 0.46, [0, 0.7, 0]);
  }

  // —— 酱料泵瓶 ——
  const pumps = [['sugar', 0.18], ['peach', 0.5], ['strawberry', 0.82], ['passion', 1.14], ['brownSugar', 1.46]];
  for (const [ing, x] of pumps) {
    const st = station(ing, ING[ing].name, x, BACK + 0.02, { ing });
    const g = st.group, col = ING[ing].color;
    // 瓶身：先画酱，再套一层透明瓶壁
    add(g, G.lathe([[0, 0.006], [0.078, 0.006], [0.084, 0.02], [0.084, 0.2], [0.06, 0.25], [0, 0.25]], 28), P(col, { roughness: 0.2, clearcoat: 0.6 }), 0, 0, 0);
    add(g, G.lathe([[0.082, 0], [0.09, 0.02], [0.09, 0.22], [0.062, 0.275], [0.05, 0.29], [0.05, 0.31]], 28), glass(0xffffff, 0.22), 0, 0, 0, { order: 2, cast: false });
    add(g, G.cyl(0.0905, 0.0905, 0.1, 28, true), M(0xffffff, { map: labelTex(ING[ing].name.slice(0, 2), '#ffffff', '#1d1d1f'), roughness: 0.6 }), 0, 0.12, 0, { rot: [0, -Math.PI / 3, 0], cast: false });
    add(g, G.cyl(0.0908, 0.0908, 0.016, 28, true), M(col), 0, 0.178, 0, { cast: false });
    // 瓶盖 + 泵头
    add(g, G.cyl(0.056, 0.058, 0.04, 24), whiteP, 0, 0.325, 0);
    for (let i = 0; i < 12; i++) add(g, G.box(0.006, 0.036, 0.004), M(0xdcdce0), Math.cos(i * 0.5236) * 0.058, 0.325, Math.sin(i * 0.5236) * 0.058, { rot: [0, -i * 0.5236 + Math.PI / 2, 0], cast: false });
    const head = group(g, 0, 0.3, 0);
    add(head, G.cyl(0.012, 0.012, 0.13, 8), steel(), 0, 0.085, 0);
    add(head, G.cyl(0.03, 0.022, 0.03, 14), whiteP, 0, 0.155, 0);
    add(head, G.rbox(0.05, 0.02, 0.12, 0.009), whiteP, 0, 0.165, 0.045);
    add(head, G.cyl(0.008, 0.006, 0.04, 6), whiteP, 0, 0.143, 0.097);
    st.head = head;
    finish(st, 0.28, 0.5, 0.3, [0, 0.56, 0]);
  }

  // —— 封口机 ——
  const sealer = station('sealer', '封口机', 1.98, BACK, { type: 'sealer' });
  {
    const g = sealer.group;
    feet(g, 0.17, 0.18);
    add(g, G.rbox(0.44, 0.1, 0.46, 0.03), whiteP, 0, 0.07, 0);
    add(g, G.rbox(0.44, 0.62, 0.14, 0.03), whiteP, 0, 0.42, -0.16);
    // 杯托滑盘
    add(g, G.rbox(0.26, 0.012, 0.28, 0.006), brushed(), 0, 0.126, 0.06);
    add(g, G.cyl(0.118, 0.118, 0.01, 28), dark, 0, 0.134, 0.06);
    add(g, G.torus(0.1, 0.008, Math.PI * 2, 6, 28), brushed(), 0, 0.14, 0.06, { rot: [Math.PI / 2, 0, 0], cast: false });
    for (const sx of [-0.17, 0.17]) add(g, G.cyl(0.016, 0.016, 0.5, 10), steel(), sx, 0.4, 0.0);
    // 压头
    const head = group(g, 0, 0.64, 0);
    add(head, G.rbox(0.46, 0.17, 0.4, 0.035), redP, 0, 0, 0.02);
    add(head, G.cyl(0.13, 0.13, 0.03, 28), brushed(), 0, -0.095, 0.06);
    add(head, G.cyl(0.115, 0.115, 0.012, 28), M(0xffb347, { roughness: 0.4, emissive: 0xff5a1a, emissiveIntensity: 0.35 }), 0, -0.114, 0.06);
    // 面板
    const lcd = canvasTex(96, 48, (c) => { c.fillStyle = '#0c1a12'; c.fillRect(0, 0, 96, 48); c.fillStyle = '#ff9f0a'; c.font = '700 26px monospace'; c.textAlign = 'center'; c.fillText('180°', 48, 34); });
    add(head, G.plane(0.13, 0.065), new THREE.MeshStandardMaterial({ map: lcd, emissive: 0xffffff, emissiveMap: lcd, emissiveIntensity: 0.8 }), -0.12, 0.0, 0.222, { cast: false });
    add(head, G.cyl(0.02, 0.02, 0.012, 12), new THREE.MeshStandardMaterial({ color: 0x30d158, emissive: 0x30d158, emissiveIntensity: 0.6 }), 0.05, 0, 0.222, { rot: [Math.PI / 2, 0, 0], cast: false });
    add(head, G.cyl(0.02, 0.02, 0.012, 12), M(0xf2f2f2), 0.12, 0, 0.222, { rot: [Math.PI / 2, 0, 0], cast: false });
    sealer.head = head;
    // 封口膜卷
    add(g, G.cyl(0.085, 0.085, 0.3, 24), M(0xffffff, { map: textPlate('鲜 · 甜', { w: 256, h: 64, bg: '#ffffff', fg: '#e2231a', size: 36 }), roughness: 0.4 }), 0, 0.82, -0.16, { rot: [0, 0, Math.PI / 2] });
    for (const sx of [-0.17, 0.17]) { add(g, G.cyl(0.03, 0.03, 0.02, 12), dark, sx, 0.82, -0.16, { rot: [0, 0, Math.PI / 2] }); add(g, G.box(0.02, 0.12, 0.04), brushed(), sx, 0.76, -0.16); }
    sealer.spot = new THREE.Vector3(1.98, Y + 0.14, BACK + 0.06);
    finish(sealer, 0.48, 0.92, 0.5, [0, 1.0, 0]);
  }

  // —— 摇摇机 ——
  const shaker = station('shaker', '摇摇机', 2.5, BACK, { type: 'shaker' });
  {
    const g = shaker.group;
    feet(g, 0.12, 0.13);
    add(g, G.rbox(0.32, 0.12, 0.36, 0.035), dark, 0, 0.08, 0);
    add(g, G.rbox(0.1, 0.62, 0.1, 0.025), dark, 0, 0.42, -0.12);
    add(g, G.cyl(0.11, 0.11, 0.012, 24), rubber, 0, 0.146, 0.06);
    // 旋钮 + 指示灯
    add(g, G.cyl(0.028, 0.03, 0.02, 16), brushed(), -0.09, 0.15, -0.1); add(g, G.box(0.004, 0.006, 0.024), M(RED), -0.09, 0.162, -0.1, { cast: false });
    add(g, G.cyl(0.014, 0.014, 0.012, 12), new THREE.MeshStandardMaterial({ color: 0x30d158, emissive: 0x30d158, emissiveIntensity: 0.9 }), 0.1, 0.146, -0.11, { cast: false });
    const arm = group(g, 0, 0.5, -0.1);
    add(arm, G.rbox(0.06, 0.05, 0.2, 0.015), brushed(), 0, 0, 0.08);
    add(arm, G.torus(0.125, 0.014, Math.PI * 2, 8, 28), brushed(), 0, 0, 0.16, { rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 3; i++) add(arm, G.rbox(0.03, 0.045, 0.02, 0.008), rubber, Math.sin(i * 2.094) * 0.112, 0, 0.16 + Math.cos(i * 2.094) * 0.112, { rot: [0, i * 2.094, 0] });
    shaker.arm = arm;
    shaker.spot = new THREE.Vector3(2.5, Y + 0.152, BACK + 0.06);
    finish(shaker, 0.36, 0.78, 0.42, [0, 0.84, 0]);
  }

  // —— 杯子、甜筒 ——
  const cups = station('cup', '拿杯子', -2.42, FRONT, { type: 'cup' });
  {
    const g = cups.group;
    add(g, G.cyl(0.125, 0.13, 0.03, 24), dark, 0, 0.015, 0);
    for (let i = 0; i < 3; i++) add(g, G.cyl(0.006, 0.006, 0.5, 6), steel(), Math.cos(i * 2.094 + 0.5) * 0.122, 0.27, Math.sin(i * 2.094 + 0.5) * 0.122);
    add(g, G.torus(0.122, 0.006, Math.PI * 2, 6, 24), steel(), 0, 0.52, 0, { rot: [Math.PI / 2, 0, 0] });
    const cupM = P(0xffffff, { transparent: true, opacity: 0.42, roughness: 0.08, depthWrite: false });
    for (let i = 0; i < 9; i++) {
      add(g, G.cyl(0.088, 0.112, 0.3, 26, true), cupM, 0, 0.18 + i * 0.026, 0, { order: 2, cast: i === 8 });
      add(g, G.torus(0.089, 0.004, Math.PI * 2, 4, 26), M(0xffffff), 0, 0.33 + i * 0.026, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
    }
    finish(cups, 0.3, 0.6, 0.3, [0, 0.03, 0.3]);
  }
  const cones = station('cone', '拿甜筒', -2.02, FRONT, { type: 'cone' });
  {
    const g = cones.group, waffle = waffleMat();
    add(g, G.cyl(0.1, 0.11, 0.02, 20), dark, 0, 0.01, 0);
    add(g, G.cyl(0.085, 0.09, 0.22, 24, true), brushed(), 0, 0.13, 0);
    add(g, G.torus(0.086, 0.006, Math.PI * 2, 6, 24), steel(), 0, 0.24, 0, { rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 5; i++) { add(g, G.cone(0.075, 0.24, 22, 1, true), waffle, 0, 0.19 + i * 0.04, 0, { rot: [Math.PI, 0, 0] }); add(g, G.cyl(0.08, 0.075, 0.03, 22, true), waffle, 0, 0.325 + i * 0.04, 0, { cast: false }); }
    finish(cones, 0.26, 0.55, 0.28, [0, 0.03, 0.3]);
  }

  // —— 小料盒 ——
  const bins = [['pearl', -1.52], ['coconut', -1.1], ['ice', -0.68]];
  const r = rng(11);
  for (const [ing, x] of bins) {
    const st = station(ing, ING[ing].name, x, FRONT, { ing });
    const g = st.group, col = ING[ing].color;
    // 份数盆：外壳 + 卷边 + 内胆
    add(g, G.rbox(0.36, 0.13, 0.42, 0.035), brushed(), 0, 0.065, 0);
    add(g, G.rbox(0.39, 0.012, 0.45, 0.006), steel(), 0, 0.131, 0);
    add(g, G.box(0.32, 0.004, 0.38), M(ing === 'pearl' ? 0x2a160c : ing === 'ice' ? 0xbfe6fa : 0xe9e6d2, { roughness: 0.15, metalness: ing === 'pearl' ? 0.2 : 0 }), 0, 0.136, 0, { cast: false });
    const n = ing === 'pearl' ? 110 : ing === 'ice' ? 46 : 70;
    const geo = ing === 'pearl' ? G.sph(0.021, 10, 8) : ing === 'ice' ? G.rbox(0.046, 0.046, 0.046, 0.01, 2) : G.rbox(0.03, 0.03, 0.03, 0.006, 1);
    const mat = ing === 'ice' ? P(0xeaf8ff, { transparent: true, opacity: 0.72, roughness: 0.03, clearcoat: 1 }) : ing === 'pearl' ? P(0x1c100a, { roughness: 0.1, clearcoat: 1 }) : P(col, { roughness: 0.2, clearcoat: 0.6, transparent: true, opacity: 0.94 });
    const inst = new THREE.InstancedMesh(geo, mat, n);
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const cx = (r() - 0.5) * 0.27, cz = (r() - 0.5) * 0.33;
      d.position.set(cx, 0.14 + r() * 0.03 + (1 - Math.min(1, Math.hypot(cx / 0.14, cz / 0.17))) * 0.025, cz);
      d.rotation.set(r() * 3, r() * 3, r() * 3);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
    }
    inst.castShadow = true; inst.receiveShadow = true;
    g.add(inst);
    // 半开的透明翻盖
    const lid = group(g, 0, 0.14, -0.21);
    lid.rotation.x = -1.15;
    add(lid, G.rbox(0.37, 0.008, 0.42, 0.004), glass(0xffffff, 0.22), 0, 0, 0.21, { order: 3, cast: false });
    add(lid, G.rbox(0.12, 0.02, 0.02, 0.008), dark, 0, 0.012, 0.4);
    // 勺子
    const scoop = group(g, 0.09, 0.18, 0.08);
    scoop.rotation.set(0.5, 0.4, -0.9);
    add(scoop, G.cyl(0.009, 0.011, 0.2, 8), steel(), 0, 0.1, 0);
    add(scoop, G.dome(0.042, 0.5, 14, 8), steel(), 0, -0.01, 0, { rot: [Math.PI, 0, 0] });
    add(scoop, G.sph(0.014, 8, 6), dark, 0, 0.2, 0);
    // 标签夹
    add(g, G.rbox(0.14, 0.05, 0.008, 0.006), M(0xffffff, { map: textPlate(ING[ing].name, { w: 128, h: 48, bg: '#ffffff', fg: '#1d1d1f', size: 30 }) }), 0, 0.075, 0.214, { cast: false });
    finish(st, 0.4, 0.3, 0.46, [0, 0.03, 0.3]);
  }

  // —— 出品位、暂存位 ——
  const dots = canvasTex(128, 128, (c) => { c.fillStyle = '#2b2b2f'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#3d3d42'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.beginPath(); c.arc(x * 16 + 8, y * 16 + 8, 4, 0, 7); c.fill(); } }, { repeat: [2, 2] });
  const mat = station('mat', '', 0, FRONT + 0.03, { type: 'mat' });
  add(mat.group, G.cyl(0.2, 0.205, 0.014, 36), M(0xffffff, { map: dots, roughness: 0.85, bumpMap: dots, bumpScale: 1.5 }), 0, 0.007, 0);
  add(mat.group, G.torus(0.2, 0.008, Math.PI * 2, 6, 36), rubber, 0, 0.012, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  add(mat.group, G.torus(0.15, 0.005, Math.PI * 2, 6, 36), M(RED), 0, 0.015, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  mat.spot = new THREE.Vector3(0, Y + 0.016, FRONT + 0.03);
  mat.labelPos.set(0, Y + 0.03, FRONT + 0.36);
  const stash = station('stash', '暂存位', 0.5, FRONT + 0.03, { type: 'stash' });
  add(stash.group, G.cyl(0.15, 0.155, 0.014, 28), M(0xaaaaaa, { map: dots, roughness: 0.85 }), 0, 0.007, 0);
  add(stash.group, G.torus(0.12, 0.005, Math.PI * 2, 6, 28), M(0xffffff), 0, 0.015, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
  stash.spot = new THREE.Vector3(0.5, Y + 0.016, FRONT + 0.03);
  finish(stash, 0.3, 0.3, 0.3, [0, 0.03, 0.3]);
  stash.group.visible = false;

  // —— 案板 + 雪克锤 ——
  const board = station('board', '案板（捶！）', 1.02, FRONT, { type: 'board', key: '空格' });
  {
    const g = board.group, wd = M(0xffffff, { map: woodTex('#cf9d63', '#a87840'), roughness: 0.55 });
    add(g, G.rbox(0.42, 0.04, 0.32, 0.016), wd, 0, 0.02, 0);
    add(g, G.box(0.34, 0.002, 0.008), M(0x9a6c3a), 0, 0.041, 0.13, { cast: false }); add(g, G.box(0.34, 0.002, 0.008), M(0x9a6c3a), 0, 0.041, -0.13, { cast: false });
    add(g, G.box(0.008, 0.002, 0.26), M(0x9a6c3a), 0.17, 0.041, 0, { cast: false }); add(g, G.box(0.008, 0.002, 0.26), M(0x9a6c3a), -0.17, 0.041, 0, { cast: false });
    add(g, G.cyl(0.018, 0.018, 0.042, 12), M(0x2a160c), 0.17, 0.02, -0.12, { cast: false });
    // 切开的半个柠檬（装饰）
    const half = group(g, -0.15, 0.04, -0.1);
    add(half, G.dome(0.045, 0.5, 16, 8), M(0xf8dc30, { roughness: 0.55 }), 0, 0, 0, { rot: [Math.PI, 0, 0], scale: [1, 0.9, 1] });
    half.rotation.x = Math.PI; half.position.y = 0.082;
    add(half, G.circle(0.043, 20), M(0xffffff, { map: sliceTex('lemon') }), 0, 0.001, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
    // 雪克锤
    const pivot = group(g, 0.2, 0.06, 0.02);
    add(pivot, G.cyl(0.015, 0.019, 0.3, 12), M(0xffffff, { map: woodTex('#b98852', '#8a6444'), roughness: 0.55 }), 0, 0.15, 0);
    for (const yy of [0.03, 0.06, 0.09]) add(pivot, G.torus(0.019, 0.004, Math.PI * 2, 4, 12), rubber, 0, yy, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
    add(pivot, G.cyl(0.05, 0.05, 0.13, 20), brushed(), 0, 0.31, 0, { rot: [0, 0, Math.PI / 2] });
    for (const sx of [-1, 1]) { add(pivot, G.cyl(0.056, 0.056, 0.02, 20), steel(), sx * 0.066, 0.31, 0, { rot: [0, 0, Math.PI / 2] }); add(pivot, G.cyl(0.05, 0.047, 0.014, 20), rubber, sx * 0.082, 0.31, 0, { rot: [0, 0, Math.PI / 2] }); }
    pivot.rotation.z = -0.5;
    board.mallet = pivot;
    board.malletRest = -0.5;
    const fruit = group(g, -0.03, 0.04, 0);
    board.fruit = fruit;
    board.fruitMeshes = { lemon: fruitMesh('lemon', 1.25), orange: fruitMesh('orange', 1.25) };
    for (const k in board.fruitMeshes) { board.fruitMeshes[k].visible = false; fruit.add(board.fruitMeshes[k]); board.fruitMeshes[k].position.y = 0.06; }
    finish(board, 0.46, 0.4, 0.34, [0, 0.03, 0.3]);
  }
  // —— 水果篮 ——
  const fruits = [['lemon', 1.5, '柠檬'], ['orange', 1.95, '鲜橙']];
  for (const [ing, x, name] of fruits) {
    const st = station(ing, name, x, FRONT, { type: 'fruit', ing });
    const g = st.group;
    const wk = new THREE.MeshStandardMaterial({ map: weaveTex(), bumpMap: weaveTex(), bumpScale: 2, roughness: 0.85, side: THREE.DoubleSide });
    add(g, G.lathe([[0, 0.012], [0.11, 0.012], [0.16, 0.06], [0.185, 0.13], [0.17, 0.13], [0.15, 0.065], [0.1, 0.03], [0, 0.03]], 28), wk, 0, 0, 0);
    add(g, G.torus(0.178, 0.012, Math.PI * 2, 6, 28), M(0x9c6f3c, { roughness: 0.85 }), 0, 0.13, 0, { rot: [Math.PI / 2, 0, 0] });
    add(g, G.torus(0.11, 0.008, Math.PI * 2, 6, 24), M(0x9c6f3c, { roughness: 0.85 }), 0, 0.01, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
    // 垫布
    add(g, G.cyl(0.15, 0.1, 0.05, 20, true), M(0xffffff, { map: gingham(), side: THREE.DoubleSide, roughness: 0.95 }), 0, 0.075, 0, { cast: false });
    const p = [[0, 0.1, 0], [0.09, 0.105, 0.03], [-0.085, 0.105, 0.04], [0.02, 0.105, -0.095], [-0.055, 0.105, -0.07], [0.02, 0.175, 0.0], [-0.03, 0.17, 0.065], [0.065, 0.165, -0.04], [-0.06, 0.16, -0.005]];
    p.forEach(([a, b, c], i) => { const f = fruitMesh(ing, 1); f.position.set(a, b, c); f.rotation.set(i * 1.3, i * 2.1, i * 0.7); g.add(f); });
    finish(st, 0.4, 0.3, 0.4, [0, 0.03, 0.3]);
  }

  // —— 垃圾口 ——
  const trash = station('trash', '倒掉', 2.42, FRONT, { type: 'trash', key: 'X' });
  {
    const g = trash.group;
    add(g, G.torus(0.135, 0.02, Math.PI * 2, 10, 32), brushed(), 0, 0.012, 0, { rot: [Math.PI / 2, 0, 0] });
    add(g, G.cyl(0.125, 0.11, 0.06, 28, true), M(0x1a1a1c, { side: THREE.BackSide, roughness: 0.6 }), 0, -0.02, 0, { cast: false });
    add(g, G.circle(0.11, 28), M(0x050506, { roughness: 1 }), 0, -0.045, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
    add(g, G.rbox(0.16, 0.05, 0.008, 0.006), M(0xffffff, { map: textPlate('厨余', { w: 128, h: 40, bg: '#2a2a2e', fg: '#fff', size: 26 }) }), 0, 0.03, -0.19, { rot: [-0.5, 0, 0], cast: false });
    finish(trash, 0.32, 0.12, 0.32, [0, 0.03, 0.3]);
    trash.pos = new THREE.Vector3(2.42, Y + 0.02, FRONT);
  }

  return { list, byId: Object.fromEntries(list.map((s) => [s.id, s])), root };
}

let _waffle = null, _waffleBump = null;
export function waffleTex() {
  return _waffle || (_waffle = canvasTex(128, 128, (c) => {
    c.fillStyle = '#e6aa5e'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#b97a34'; c.lineWidth = 5;
    for (let i = -128; i < 256; i += 21.33) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 128, 128); c.stroke(); c.beginPath(); c.moveTo(i + 128, 0); c.lineTo(i, 128); c.stroke(); }
    c.strokeStyle = 'rgba(255,225,160,.5)'; c.lineWidth = 1.5;
    for (let i = -128; i < 256; i += 21.33) { c.beginPath(); c.moveTo(i + 4, 0); c.lineTo(i + 132, 128); c.stroke(); }
  }, { repeat: [3, 1] }));
}
export function waffleMat() {
  _waffleBump = _waffleBump || canvasTex(128, 128, (c) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#000'; c.lineWidth = 6;
    for (let i = -128; i < 256; i += 21.33) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 128, 128); c.stroke(); c.beginPath(); c.moveTo(i + 128, 0); c.lineTo(i, 128); c.stroke(); }
  }, { repeat: [3, 1] });
  return M(0xffffff, { map: waffleTex(), bumpMap: _waffleBump, bumpScale: 2.5, roughness: 0.75, side: THREE.DoubleSide });
}

const _slice = {};
export function sliceTex(kind) {
  return _slice[kind] || (_slice[kind] = canvasTex(128, 128, (c) => {
    const [rind, pith, flesh, line] = kind === 'lemon' ? ['#f8dc30', '#fffbe0', '#fbe96a', '#fff9cf'] : ['#f7901f', '#ffe9c4', '#ffab3d', '#ffd9a0'];
    c.fillStyle = rind; c.beginPath(); c.arc(64, 64, 64, 0, 7); c.fill();
    c.fillStyle = pith; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill();
    c.fillStyle = flesh; c.beginPath(); c.arc(64, 64, 50, 0, 7); c.fill();
    c.strokeStyle = line; c.lineWidth = 4;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(i * 0.698) * 52, 64 + Math.sin(i * 0.698) * 52); c.stroke(); }
    c.fillStyle = line; c.beginPath(); c.arc(64, 64, 7, 0, 7); c.fill();
  }));
}

let _gingham = null;
function gingham() {
  return _gingham || (_gingham = canvasTex(64, 64, (c) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64);
    c.fillStyle = 'rgba(226,35,26,.45)'; c.fillRect(0, 0, 32, 64); c.fillRect(0, 0, 64, 32);
  }, { repeat: [8, 1] }));
}

let _peel = null;
function peelBump() {
  return _peel || (_peel = canvasTex(64, 64, (c) => {
    c.fillStyle = '#999'; c.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 260; i++) { c.fillStyle = Math.random() > 0.5 ? '#666' : '#bbb'; c.beginPath(); c.arc(Math.random() * 64, Math.random() * 64, 1.2, 0, 7); c.fill(); }
  }, { repeat: [3, 2] }));
}

export function fruitMesh(kind, s = 1) {
  const g = new THREE.Group();
  if (kind === 'lemon') {
    const m = M(0xf8dc30, { roughness: 0.5, bumpMap: peelBump(), bumpScale: 0.8 });
    add(g, G.sph(0.058, 20, 14), m, 0, 0, 0, { scale: [1.28, 1, 1] });
    add(g, G.sph(0.022, 10, 8), m, 0.07, 0, 0, { scale: [1.3, 0.9, 0.9] });
    add(g, G.sph(0.018, 10, 8), m, -0.072, 0, 0, { scale: [1.2, 0.8, 0.8] });
    add(g, G.cyl(0.005, 0.005, 0.008, 6), M(0x6b8f3a), -0.094, 0, 0, { rot: [0, 0, Math.PI / 2], cast: false });
  } else {
    add(g, G.sph(0.066, 20, 14), M(0xf7901f, { roughness: 0.55, bumpMap: peelBump(), bumpScale: 1 }), 0, 0, 0, { scale: [1, 0.94, 1] });
    add(g, G.cyl(0.007, 0.009, 0.01, 6), M(0x4f7a35), 0, 0.062, 0);
    add(g, G.sph(0.03, 8, 6), M(0x5a9f55, { roughness: 0.8 }), 0.025, 0.066, 0, { scale: [1, 0.12, 0.55], rot: [0, 0.4, 0.2] });
  }
  g.scale.setScalar(s);
  return g;
}
