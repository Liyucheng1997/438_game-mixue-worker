// Q 版顾客角色：程序化建模 + 走路、待机、不耐烦、开心跳、眨眼等动画
import * as THREE from 'three';
import { M, P, G, add, group, cloth, gloss, canvasTex } from './h.js';
import { pick, rand } from './data.js';

const SKINS = [0xffdcc2, 0xf9d2b4, 0xf0c29c, 0xd9a47c, 0xffe3cf];
const HAIRS = [0x1f1a17, 0x2e2420, 0x4a3324, 0x6b4a2e, 0x8a5a2b, 0x15171c];
const TOPS = [0x5b8def, 0xf2a65a, 0x6fbf8b, 0xe57373, 0xb39ddb, 0xffd166, 0x4db6ac, 0xf48fb1, 0x90a4ae, 0xfafafa, 0x37474f];
const BOTTOMS = [0x37474f, 0x455a64, 0x5d4037, 0x1e3a5f, 0x6d6d72, 0x2f2f33, 0x3f5f8a];
const IRIS = [0x4a2f1c, 0x3a2414, 0x5a3a22, 0x2f3f52, 0x3d4a2e];
const SHOES = [0xffffff, 0x2a2a2e, 0xe2231a, 0x3aa0e8, 0xf2f2f2];

export function randomLook(o = {}) {
  return {
    skin: pick(SKINS), hairColor: pick(HAIRS), top: pick(TOPS), bottom: pick(BOTTOMS), iris: pick(IRIS), shoe: pick(SHOES),
    hair: pick(['short', 'short', 'bob', 'long', 'bun', 'pony', 'spiky', 'flat', 'buns', 'side']),
    outfit: pick(['tee', 'tee', 'shirt', 'hoodie', 'jacket', 'stripe', 'dress', 'overall']),
    acc: Math.random() < 0.22 ? ['glasses'] : [], scale: rand(1.16, 1.26), ...o,
  };
}

export const LOOKS = {
  normal: () => randomLook(Math.random() < 0.25 ? { acc: [pick(['cap', 'glasses', 'scarf', 'beanie'])] } : {}),
  rush: () => randomLook({ top: 0xfafafa, bottom: 0x2f2f33, shoe: 0x2a2a2e, hair: pick(['short', 'side', 'bun']), outfit: 'suit', acc: ['briefcase', 'watch'] }),
  kid: () => randomLook({ scale: 0.84, top: 0xfafafa, bottom: 0x1e3a5f, hair: pick(['short', 'buns', 'pony']), outfit: 'shirt', acc: ['backpack', 'neckerchief'], blush: true, shoe: 0xffffff }),
  riddler: () => randomLook({ top: 0x5e4b8b, bottom: 0x2f2f33, hair: 'long', hairColor: 0x15171c, outfit: 'jacket', acc: ['tophat', 'monocle'] }),
  sweet: () => randomLook({ top: 0xf8a8c4, bottom: 0xfafafa, hair: 'buns', hairColor: 0xe39ab4, outfit: 'dress', acc: ['bow', 'lollipop'], blush: true, shoe: 0xff8fb1 }),
  changer: () => randomLook({ top: 0xffd166, hair: pick(['bob', 'pony']), outfit: 'hoodie', acc: ['glasses', 'question'] }),
  fitness: () => randomLook({ skin: 0xd9a47c, top: 0x1d1d1f, bottom: 0x455a64, hair: 'flat', outfit: 'tank', acc: ['headband', 'muscle', 'towel'], scale: 1.34, shoe: 0xe2231a }),
  couple: (i) => randomLook(i ? { top: 0xf48fb1, hair: pick(['long', 'bob', 'pony']), outfit: 'dress', scale: 1.14, acc: ['heart'] } : { top: 0x5b8def, hair: pick(['short', 'spiky', 'side']), outfit: 'jacket', scale: 1.24, acc: [] }),
  streamer: () => randomLook({ top: 0xff5f8f, bottom: 0x2f2f33, hair: 'long', hairColor: 0xb7e3f5, outfit: 'jacket', acc: ['ringlight', 'earphones'], iris: 0x7a4fd0 }),
  haggler: () => randomLook({ top: 0xb0457a, bottom: 0x5d4037, hair: 'perm', hairColor: 0x4a3324, outfit: 'floral', acc: ['tote', 'pearls'], scale: 1.14 }),
  shy: () => randomLook({ top: 0x6d6d72, bottom: 0x2f2f33, hair: 'bob', hairColor: 0x1f1a17, outfit: 'hoodie', acc: ['hood', 'mask'] }),
  rider: () => randomLook({ top: 0xffc21a, bottom: 0x2f2f33, hair: 'flat', outfit: 'vest', acc: ['helmet', 'box'], shoe: 0x2a2a2e }),
  manager: () => randomLook({ top: 0x2b2f3a, bottom: 0x1d1d1f, hair: 'side', hairColor: 0x15171c, outfit: 'suit', acc: ['sunglasses', 'notebook', 'watch'], scale: 1.28, shoe: 0x2a2a2e }),
  grandpa: () => randomLook({ top: 0x90a4ae, bottom: 0x5d4037, hair: 'bald', hairColor: 0xd8d8d8, outfit: 'vestknit', acc: ['glasses', 'mustache'], scale: 1.12, shoe: 0x5d4037 }),
};

const HR = 0.3; // 头半径
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
let floralTex = null;

export class Character {
  constructor(look) {
    this.look = look;
    this.seed = Math.random() * 10;
    this.t = 0; this.phase = 0; this.walking = false; this.mood = 'neutral';
    this.hopT = 0; this.blinkT = rand(1, 4); this.armPose = [null, null];
    const g = (this.group = new THREE.Group());
    g.scale.setScalar(look.scale || 1.2);
    const skin = P(look.skin, { roughness: 0.55, sheen: 0.4, sheenColor: 0xffb8a0 });
    const top = cloth(look.top), bottom = cloth(look.bottom);
    const hair = P(look.hairColor, { roughness: 0.5, sheen: 0.6, sheenRoughness: 0.4 });
    const acc = new Set(look.acc || []);
    const outfit = look.outfit || 'tee';
    const skirt = outfit === 'dress' || outfit === 'floral';
    const shortSleeve = ['tee', 'stripe', 'tank', 'dress', 'overall', 'floral'].includes(outfit);
    this.m = { skin, top, bottom, hair };

    // —— 腿和鞋 ——
    const legM = skirt ? skin : bottom, shoeM = gloss(look.shoe ?? 0x2a2a2e), sole = M(shade(look.shoe ?? 0x2a2a2e, 0.55) || 0x999999, { roughness: 0.8 });
    this.legs = [-1, 1].map((sd) => {
      const p = group(g, sd * 0.1, 0.44, 0);
      add(p, G.cap(0.07, 0.22), legM, 0, -0.17, 0);
      if (skirt) add(p, G.cyl(0.072, 0.068, 0.1, 14), M(0xffffff, { roughness: 0.9 }), 0, -0.3, 0); // 袜子
      else add(p, G.cyl(0.078, 0.078, 0.03, 14), bottom, 0, -0.32, 0); // 裤脚
      add(p, G.rbox(0.15, 0.035, 0.26, 0.016), M(0xf5f5f5, { roughness: 0.7 }), 0, -0.422, 0.04);
      add(p, G.sph(0.08, 16, 12), shoeM, 0, -0.375, 0.03, { scale: [0.95, 0.72, 1.5] });
      add(p, G.sph(0.06, 12, 10), M(0xf5f5f5, { roughness: 0.6 }), 0, -0.385, 0.125, { scale: [1, 0.6, 0.7] });
      add(p, G.box(0.05, 0.006, 0.07), M(0xffffff), 0, -0.322, 0.04, { rot: [0.35, 0, 0], cast: false });
      add(p, G.box(0.151, 0.012, 0.261), sole, 0, -0.438, 0.04, { cast: false });
      return p;
    });

    // —— 躯干 ——
    const body = (this.body = group(g, 0, 0.42, 0));
    const torsoM = outfit === 'stripe' ? stripeMat(look.top) : outfit === 'floral' ? floralMat(look.top) : top;
    add(body, G.lathe([[0, 0], [0.17, 0], [0.225, 0.05], [0.245, 0.16], [0.243, 0.28], [0.215, 0.42], [0.16, 0.51], [0.105, 0.55], [0, 0.56]], 28), torsoM, 0, 0, 0);
    if (skirt) add(body, G.lathe([[0.2, 0.0], [0.325, -0.11], [0.33, -0.1], [0.3, 0.02], [0.23, 0.14]], 28), torsoM, 0, 0, 0);
    else add(body, G.cyl(0.228, 0.19, 0.09, 24), bottom, 0, 0.035, 0); // 裤腰
    if (!skirt && outfit !== 'tank') add(body, G.torus(0.229, 0.012, Math.PI * 2, 6, 24), M(shade(look.bottom, 0.6)), 0, 0.085, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
    add(body, G.cyl(0.082, 0.098, 0.08, 16), skin, 0, 0.57, 0); // 脖子
    this.buildOutfit(outfit, body, look);

    // —— 手臂：上臂 + 可弯的前臂 + 手 ——
    this.arms = [-1, 1].map((sd) => {
      const p = group(body, sd * 0.215, 0.47, 0);
      add(p, G.sph(0.07, 12, 10), torsoM, sd * 0.012, 0, 0);
      add(p, G.cap(0.056, 0.12), outfit === 'tank' ? skin : torsoM, sd * 0.03, -0.09, 0, { rot: [0, 0, sd * 0.18] });
      const fore = group(p, sd * 0.055, -0.18, 0);
      fore.rotation.x = -0.28;
      const fm = shortSleeve ? skin : torsoM;
      add(fore, G.cap(0.05, 0.1), fm, sd * 0.006, -0.08, 0);
      if (!shortSleeve) add(fore, G.cyl(0.056, 0.056, 0.03, 12), M(shade(look.top, 0.8)), sd * 0.006, -0.135, 0, { cast: false });
      const hand = group(fore, sd * 0.008, -0.185, 0);
      add(hand, G.sph(0.058, 14, 10), skin, 0, 0, 0, { scale: [0.82, 1, 1] });
      add(hand, G.cap(0.018, 0.03, 4, 8), skin, -sd * 0.03, 0.0, 0.035, { rot: [0.7, 0, -sd * 0.5] }); // 拇指
      add(hand, G.rbox(0.05, 0.05, 0.085, 0.022, 2), skin, sd * 0.004, -0.045, 0.0, { rot: [0, 0, 0] }); // 四指
      p.userData = { fore, hand };
      return p;
    });

    // —— 头 ——
    const head = (this.head = group(body, 0, 0.86, 0));
    add(head, G.sph(HR, 32, 24), skin, 0, 0, 0, { scale: [1, 0.94, 0.96] });
    add(head, G.sph(0.22, 20, 14), skin, 0, -0.1, 0.03, { scale: [1.12, 0.8, 1] }); // 脸颊和下巴的肉感
    for (const sd of [-1, 1]) { add(head, G.sph(0.062, 12, 10), skin, sd * 0.292, -0.02, 0, { scale: [0.6, 1, 0.9] }); add(head, G.sph(0.034, 10, 8), M(shade(look.skin, 0.86)), sd * 0.305, -0.022, 0.008, { scale: [0.5, 1, 0.8], cast: false }); }
    add(head, G.sph(0.022, 10, 8), P(shade(look.skin, 0.93), { roughness: 0.5 }), 0, -0.052, 0.292, { scale: [1, 0.8, 0.8], cast: false }); // 鼻子
    // 眼睛：眼白 + 虹膜 + 瞳孔 + 两点高光 + 上眼线
    const eyeW = M(0xffffff, { roughness: 0.15 }), irisM = P(look.iris ?? 0x4a2f1c, { roughness: 0.1, clearcoat: 1 }), pupil = M(0x0c0c0e, { roughness: 0.1 }), lash = M(0x1d1d1f, { roughness: 0.4 });
    const hi = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.eyes = [-1, 1].map((sd) => {
      const e = group(head, sd * 0.114, -0.002, 0.258);
      e.rotation.y = sd * 0.2;
      add(e, G.sph(0.055, 18, 14), eyeW, 0, 0, 0, { scale: [0.95, 1.18, 0.42], cast: false });
      add(e, G.sph(0.043, 16, 12), irisM, sd * -0.004, -0.004, 0.012, { scale: [1, 1.2, 0.4], cast: false });
      add(e, G.sph(0.026, 12, 10), pupil, sd * -0.004, -0.004, 0.022, { scale: [1, 1.25, 0.3], cast: false });
      add(e, G.sph(0.013, 8, 6), hi, 0.014, 0.022, 0.03, { cast: false, receive: false });
      add(e, G.sph(0.006, 6, 6), hi, -0.012, -0.022, 0.03, { cast: false, receive: false });
      add(e, G.torus(0.054, 0.008, Math.PI * 0.86, 6, 16), lash, 0, 0.006, 0.014, { rot: [0, 0, Math.PI * 0.07], scale: [1, 1.15, 0.6], cast: false });
      return e;
    });
    this.brows = [-1, 1].map((sd) => add(head, G.cap(0.011, 0.07, 4, 8), M(shade(look.hairColor, 0.85)), sd * 0.114, 0.1, 0.268, { rot: [0, 0, Math.PI / 2], cast: false }));
    const blush = M(0xff8f8f, { transparent: true, opacity: look.blush ? 0.7 : 0.38, roughness: 1, depthWrite: false });
    for (const sd of [-1, 1]) add(head, G.sph(0.05, 12, 8), blush, sd * 0.19, -0.082, 0.214, { scale: [1, 0.62, 0.3], cast: false });
    // 嘴：几种口型切换
    const mouthM = M(0x8a332e, { roughness: 0.5 }), inside = M(0x5a1c1c, { roughness: 0.6 });
    const mg = group(head, 0, -0.125, 0.272);
    const grin = new THREE.Group(); mg.add(grin);
    add(grin, new THREE.CircleGeometry(0.052, 20, Math.PI, Math.PI), inside, 0, 0.022, 0.012, { cast: false });
    add(grin, G.box(0.08, 0.012, 0.004), M(0xffffff), 0, 0.016, 0.014, { cast: false });
    add(grin, new THREE.CircleGeometry(0.026, 14, Math.PI, Math.PI), M(0xff8f8f), 0, -0.012, 0.014, { scale: [1, 0.7, 1], cast: false });
    const open = new THREE.Group(); mg.add(open);
    add(open, G.sph(0.04, 14, 10), inside, 0, 0, -0.012, { scale: [1, 1.15, 0.45], cast: false });
    add(open, G.box(0.05, 0.012, 0.004), M(0xffffff), 0, 0.03, 0.006, { cast: false });
    this.mouths = {
      smile: add(mg, G.torus(0.042, 0.01, Math.PI, 6, 14), mouthM, 0, 0.025, 0.008, { rot: [0, 0, Math.PI], cast: false }),
      frown: add(mg, G.torus(0.04, 0.01, Math.PI, 6, 14), mouthM, 0, -0.03, 0.008, { cast: false }),
      flat: add(mg, G.cap(0.008, 0.05, 4, 8), mouthM, 0, 0, 0.012, { rot: [0, 0, Math.PI / 2], cast: false }),
      grin, open,
    };

    this.buildHair(head, look.hair, hair, acc);
    this.buildAcc(acc, { head, body, skin, hair });
    this.setMood('neutral');
  }

  buildOutfit(outfit, body, look) {
    const dk = M(shade(look.top, 0.72), { roughness: 0.9 }), white = M(0xffffff, { roughness: 0.8 }), btn = M(0xf2f2f2, { roughness: 0.3 });
    const collar = (mat, open = 0.5) => { for (const sd of [-1, 1]) add(body, G.rbox(0.1, 0.02, 0.07, 0.008, 2), mat, sd * 0.062, 0.535, 0.1, { rot: [0.75, sd * -0.55, sd * open] }); };
    if (outfit === 'tee' || outfit === 'stripe') {
      add(body, G.torus(0.1, 0.014, Math.PI * 2, 6, 20), dk, 0, 0.548, 0.005, { rot: [Math.PI / 2 - 0.12, 0, 0], cast: false });
      if (outfit === 'tee' && Math.random() < 0.7) add(body, G.sph(0.07, 14, 10), M(pick([0xffffff, 0xffd166, 0x1d1d1f, 0xe2231a])), 0, 0.32, 0.2, { scale: [1, 1, 0.22], cast: false });
    } else if (outfit === 'shirt') {
      collar(white);
      add(body, G.box(0.03, 0.4, 0.01), white, 0, 0.3, 0.236, { rot: [-0.06, 0, 0], cast: false });
      for (let i = 0; i < 4; i++) add(body, G.cyl(0.012, 0.012, 0.008, 8), btn, 0, 0.16 + i * 0.09, 0.245 - i * 0.006, { rot: [Math.PI / 2, 0, 0], cast: false });
      add(body, G.rbox(0.08, 0.07, 0.01, 0.006, 1), dk, 0.11, 0.36, 0.212, { rot: [-0.1, 0.35, 0], cast: false });
    } else if (outfit === 'hoodie') {
      add(body, G.sph(0.19, 14, 10), cloth(look.top), 0, 0.56, -0.13, { scale: [1.1, 0.7, 0.75] });
      add(body, G.torus(0.115, 0.03, Math.PI * 2, 8, 20), cloth(look.top), 0, 0.555, 0.01, { rot: [Math.PI / 2 - 0.2, 0, 0] });
      add(body, G.rbox(0.24, 0.12, 0.02, 0.03, 2), dk, 0, 0.17, 0.238, { rot: [-0.02, 0, 0], cast: false });
      for (const sd of [-1, 1]) { add(body, G.cyl(0.006, 0.006, 0.16, 5), white, sd * 0.045, 0.45, 0.2, { rot: [0.25, 0, sd * 0.06], cast: false }); add(body, G.sph(0.012, 6, 6), white, sd * 0.05, 0.37, 0.222, { cast: false }); }
    } else if (outfit === 'jacket' || outfit === 'suit') {
      const inner = outfit === 'suit' ? white : M(pick([0xffffff, 0xffd166, 0x1d1d1f, 0xbfe3ff]), { roughness: 0.8 });
      add(body, G.sph(0.2, 16, 12), inner, 0, 0.3, 0.068, { scale: [0.52, 1.2, 0.9], cast: false });
      for (const sd of [-1, 1]) add(body, G.rbox(0.07, 0.3, 0.014, 0.008, 2), dk, sd * 0.085, 0.37, 0.21, { rot: [-0.12, sd * 0.42, sd * -0.2], cast: false });
      if (outfit === 'suit') {
        add(body, G.box(0.045, 0.24, 0.012), M(0xb3261e), 0, 0.34, 0.246, { rot: [-0.12, 0, 0], cast: false });
        add(body, G.rbox(0.06, 0.05, 0.03, 0.01, 1), M(0xb3261e), 0, 0.485, 0.195, { cast: false });
        collar(white, 0.3);
        add(body, G.cyl(0.013, 0.013, 0.008, 8), btn, 0.02, 0.14, 0.245, { rot: [Math.PI / 2, 0, 0], cast: false });
      } else {
        add(body, G.box(0.008, 0.3, 0.008), M(0xcccccc, { metalness: 0.7, roughness: 0.3 }), 0.035, 0.2, 0.242, { cast: false });
        collar(dk, 0.4);
      }
    } else if (outfit === 'dress' || outfit === 'floral') {
      add(body, G.torus(0.105, 0.016, Math.PI * 2, 6, 20), white, 0, 0.546, 0.005, { rot: [Math.PI / 2 - 0.12, 0, 0], cast: false });
      add(body, G.torus(0.232, 0.014, Math.PI * 2, 6, 24), dk, 0, 0.17, 0, { rot: [Math.PI / 2, 0, 0], cast: false });
      if (outfit === 'dress') { add(body, G.sph(0.03, 8, 6), dk, -0.03, 0.17, 0.235, { scale: [1.3, 0.8, 0.5], cast: false }); add(body, G.sph(0.03, 8, 6), dk, 0.03, 0.17, 0.235, { scale: [1.3, 0.8, 0.5], cast: false }); }
    } else if (outfit === 'overall') {
      const denim = cloth(0x3f5f8a);
      add(body, G.rbox(0.24, 0.22, 0.02, 0.02, 2), denim, 0, 0.3, 0.228, { rot: [-0.08, 0, 0], cast: false });
      for (const sd of [-1, 1]) { add(body, G.box(0.035, 0.26, 0.012), denim, sd * 0.09, 0.47, 0.19, { rot: [-0.45, 0, sd * 0.1], cast: false }); add(body, G.cyl(0.014, 0.014, 0.008, 8), M(0xf2c14b, { metalness: 0.8, roughness: 0.3 }), sd * 0.09, 0.39, 0.236, { rot: [Math.PI / 2, 0, 0], cast: false }); }
      add(body, G.rbox(0.1, 0.07, 0.008, 0.01, 1), M(0x35507a), 0, 0.3, 0.242, { cast: false });
    } else if (outfit === 'tank') {
      add(body, G.torus(0.11, 0.012, Math.PI * 2, 6, 20), M(0xe2231a), 0, 0.535, 0.01, { rot: [Math.PI / 2 - 0.2, 0, 0], cast: false });
      add(body, G.rbox(0.16, 0.05, 0.01, 0.01, 1), M(0xe2231a), 0, 0.33, 0.236, { cast: false });
    } else if (outfit === 'vest') {
      for (const yy of [0.2, 0.36]) add(body, G.torus(0.246, 0.014, Math.PI * 2, 6, 28), M(0xe8eef2, { emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.3 }), 0, yy, 0, { rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1], cast: false });
      add(body, G.box(0.008, 0.36, 0.008), M(0x2a2a2e), 0, 0.3, 0.243, { cast: false });
      collar(dk, 0.4);
    } else if (outfit === 'vestknit') {
      add(body, G.sph(0.2, 16, 12), white, 0, 0.36, 0.062, { scale: [0.5, 1, 0.9], cast: false });
      collar(white, 0.3);
      for (let i = 0; i < 3; i++) add(body, G.cyl(0.012, 0.012, 0.008, 8), M(0x5d4037), 0.03, 0.14 + i * 0.08, 0.243, { rot: [Math.PI / 2, 0, 0], cast: false });
    }
  }

  buildHair(head, style, hair, acc) {
    if (acc.has('helmet') || acc.has('hood') || acc.has('beanie')) style = 'flat';
    const lobe = (x, y, z, sx, sy, sz, rot) => add(head, G.sph(0.1, 14, 10), hair, x, y, z, { scale: [sx, sy, sz], rot });
    if (style === 'bald') {
      lobe(-0.26, 0.0, -0.08, 0.9, 1.1, 1.2); lobe(0.26, 0.0, -0.08, 0.9, 1.1, 1.2);
      lobe(0, -0.03, -0.22, 2.3, 1.3, 0.9);
      return;
    }
    // 发壳：稍微后倾，露出额头
    add(head, G.dome(0.316, 0.52, 28, 16), hair, 0, 0.0, -0.005, { rot: [-0.36, 0, 0], scale: [1.01, 0.97, 0.99] });
    if (style === 'flat') return;
    // 后脑
    add(head, G.sph(0.305, 20, 16), hair, 0, 0.0, -0.065, { scale: [1.03, 0.93, 0.95] });
    // 刘海：一排发片
    const bangs = (n, len, part = 0) => {
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n - 0.5, a = u * 2.3, skew = part ? (u - part) * 1.6 : u * 0.9;
        lobe(Math.sin(a) * 0.255, 0.21 - Math.abs(u) * 0.09, Math.cos(a) * 0.238, 0.95, len * (1 - Math.abs(u) * 0.25), 0.34, [0.34, a, -skew]);
      }
    };
    const sides = (len) => { for (const sd of [-1, 1]) lobe(sd * 0.285, -0.05 - len * 0.04, 0.03, 0.42, 1.2 + len, 0.75, [0, 0, sd * 0.06]); };
    if (style === 'short') { bangs(9, 0.95); sides(0); }
    if (style === 'side') { bangs(9, 1.05, 0.3); sides(0.1); lobe(-0.12, 0.27, 0.1, 1.5, 0.5, 1.0, [0, 0, 0.35]); }
    if (style === 'spiky') { bangs(5, 0.8); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; add(head, G.cone(0.075, 0.2, 8), hair, Math.cos(a) * 0.15, 0.29, Math.sin(a) * 0.13 - 0.03, { rot: [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55] }); } add(head, G.cone(0.08, 0.2, 8), hair, 0, 0.34, -0.02); }
    if (style === 'bun') { bangs(9, 1.0); sides(0.1); lobe(0, 0.36, -0.07, 1.2, 1.1, 1.2); add(head, G.torus(0.065, 0.014, Math.PI * 2, 6, 14), M(0xe2231a), 0, 0.29, -0.06, { rot: [Math.PI / 2, 0, 0] }); }
    if (style === 'buns') { bangs(10, 1.0); sides(0.15); for (const sd of [-1, 1]) { lobe(sd * 0.22, 0.29, -0.03, 1.15, 1.1, 1.15); add(head, G.torus(0.06, 0.013, Math.PI * 2, 6, 14), M(0xffd166), sd * 0.19, 0.24, -0.02, { rot: [Math.PI / 2, 0, sd * 0.5] }); } }
    if (style === 'pony') { bangs(9, 1.0); sides(0.2); lobe(0, 0.13, -0.32, 0.7, 0.7, 0.7); add(head, G.torus(0.05, 0.014, Math.PI * 2, 6, 14), M(0x3aa0e8), 0, 0.1, -0.33, { rot: [0.4, 0, 0] }); lobe(0, -0.1, -0.39, 0.85, 2.4, 0.85, [0.32, 0, 0]); lobe(0, -0.3, -0.43, 0.55, 1.2, 0.55, [0.2, 0, 0]); }
    if (style === 'bob' || style === 'long' || style === 'perm') {
      add(head, G.sph(0.312, 20, 16), hair, 0, -0.05, -0.07, { scale: [1.08, 1.04, 1] });
      bangs(11, 1.15); sides(0.5);
    }
    if (style === 'long') { add(head, G.sph(0.27, 16, 14), hair, 0, -0.32, -0.15, { scale: [1.08, 1.55, 0.6] }); for (const sd of [-1, 1]) lobe(sd * 0.27, -0.33, 0.02, 0.5, 2.2, 0.7, [0, 0, sd * -0.05]); }
    if (style === 'perm') for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; lobe(Math.cos(a) * 0.26, 0.1 + (i % 2) * 0.13, Math.sin(a) * 0.24 - 0.05, 1.15, 1.15, 1.15); if (i % 3 === 0) lobe(Math.cos(a) * 0.12, 0.32, Math.sin(a) * 0.12 - 0.04, 1.1, 0.9, 1.1); }
  }

  buildAcc(acc, { head, body, skin }) {
    const look = this.look;
    const dark = P(0x1d1d1f, { roughness: 0.25, clearcoat: 0.6 });
    const R = this.arms[1], L = this.arms[0];
    const RH = R.userData.hand, LH = L.userData.hand;
    if (acc.has('glasses')) {
      for (const sd of [-1, 1]) { add(head, G.torus(0.066, 0.007, Math.PI * 2, 6, 24), dark, sd * 0.114, 0, 0.292, { rot: [0, sd * 0.18, 0], cast: false }); add(head, G.circle(0.062, 20), M(0xffffff, { transparent: true, opacity: 0.14, roughness: 0.05 }), sd * 0.114, 0, 0.292, { rot: [0, sd * 0.18, 0], cast: false }); add(head, G.cyl(0.005, 0.005, 0.22, 5), dark, sd * 0.232, 0.01, 0.19, { rot: [Math.PI / 2, 0, sd * 0.2], cast: false }); }
      add(head, G.cap(0.006, 0.04, 3, 6), dark, 0, 0.012, 0.3, { rot: [0, 0, Math.PI / 2], cast: false });
    }
    if (acc.has('monocle')) { add(head, G.torus(0.068, 0.008, Math.PI * 2, 6, 24), M(0xf2c14b, { metalness: 0.9, roughness: 0.25 }), 0.114, 0, 0.295, { cast: false }); add(head, G.cyl(0.003, 0.003, 0.3, 4), M(0xf2c14b, { metalness: 0.9, roughness: 0.25 }), 0.2, -0.14, 0.25, { rot: [0, 0, 0.2], cast: false }); }
    if (acc.has('sunglasses')) {
      const lens = P(0x0c0c0e, { roughness: 0.04, metalness: 0.6, clearcoat: 1 });
      for (const sd of [-1, 1]) { add(head, G.rbox(0.14, 0.09, 0.03, 0.03, 3), lens, sd * 0.114, 0.004, 0.285, { rot: [0, sd * 0.18, 0], cast: false }); add(head, G.cyl(0.006, 0.006, 0.22, 5), dark, sd * 0.235, 0.02, 0.19, { rot: [Math.PI / 2, 0, sd * 0.2], cast: false }); }
      add(head, G.box(0.06, 0.014, 0.014), dark, 0, 0.03, 0.296, { cast: false });
    }
    if (acc.has('mustache')) for (const sd of [-1, 1]) add(head, G.sph(0.04, 10, 8), M(look.hairColor), sd * 0.038, -0.088, 0.288, { scale: [1.3, 0.45, 0.5], rot: [0, 0, sd * -0.25], cast: false });
    if (acc.has('mask')) { add(head, G.sph(0.21, 18, 12), M(0xf2f6fa, { roughness: 0.9 }), 0, -0.1, 0.115, { scale: [1.04, 0.62, 0.92], cast: false }); for (const sd of [-1, 1]) add(head, G.cyl(0.004, 0.004, 0.2, 4), M(0xffffff), sd * 0.24, -0.07, 0.1, { rot: [Math.PI / 2 - 0.2, 0, 0], cast: false }); this.mouthHidden = true; }
    if (acc.has('hood')) {
      const hm = cloth(look.top);
      add(head, G.dome(0.35, 0.64, 24, 14), hm, 0, 0.0, -0.035, { rot: [-0.5, 0, 0] });
      add(head, G.torus(0.3, 0.035, Math.PI * 1.25, 8, 24), hm, 0, 0.03, 0.14, { rot: [0.0, 0, Math.PI * 0.875 - Math.PI], scale: [1, 1.05, 1] });
    }
    if (acc.has('cap')) {
      const cm = cloth(pick([0xe2231a, 0x3aa0e8, 0x2f2f33, 0xffffff]));
      add(head, G.dome(0.328, 0.46, 24, 12), cm, 0, 0.03, 0, { rot: [-0.15, 0, 0] });
      add(head, G.cyl(0.18, 0.18, 0.018, 24, false), cm, 0, 0.135, 0.27, { scale: [1, 1, 0.85], rot: [0.2, 0, 0] });
      add(head, G.sph(0.022, 8, 6), cm, 0, 0.355, -0.05);
    }
    if (acc.has('beanie')) {
      const bm = cloth(pick([0xe2231a, 0x4db6ac, 0xffd166, 0x6d6d72]));
      add(head, G.dome(0.33, 0.5, 24, 12), bm, 0, 0.04, -0.01, { rot: [-0.2, 0, 0] });
      add(head, G.torus(0.31, 0.04, Math.PI * 2, 8, 28), bm, 0, 0.1, -0.02, { rot: [Math.PI / 2 - 0.2, 0, 0] });
      add(head, G.sph(0.06, 10, 8), M(0xffffff, { roughness: 1 }), 0, 0.37, -0.09);
    }
    if (acc.has('tophat')) {
      const tm = cloth(0x2a2140);
      add(head, G.cyl(0.31, 0.31, 0.022, 28), tm, 0, 0.25, -0.02, { rot: [-0.08, 0, 0] });
      add(head, G.cyl(0.19, 0.205, 0.28, 28), tm, 0, 0.39, -0.03, { rot: [-0.08, 0, 0] });
      add(head, G.cyl(0.208, 0.208, 0.05, 28), M(0x39d98a), 0, 0.3, -0.025, { rot: [-0.08, 0, 0] });
      const q = M(0xffffff); add(head, G.torus(0.035, 0.01, Math.PI * 1.3, 6, 12), q, 0, 0.44, 0.17, { rot: [0, 0, -0.5], cast: false }); add(head, G.sph(0.012, 6, 6), q, 0, 0.375, 0.185, { cast: false });
    }
    if (acc.has('helmet')) {
      const hm = gloss(0xffc21a, { clearcoat: 1 });
      add(head, G.dome(0.348, 0.56, 28, 14), hm, 0, 0.02, -0.01, { rot: [-0.12, 0, 0] });
      add(head, G.cyl(0.21, 0.21, 0.02, 24), hm, 0, 0.1, 0.24, { scale: [1, 1, 0.65], rot: [0.25, 0, 0] });
      add(head, G.box(0.12, 0.05, 0.01), M(0x1d1d1f), 0, 0.2, 0.3, { rot: [-0.5, 0, 0], cast: false });
      for (const sd of [-1, 1]) add(head, G.box(0.026, 0.3, 0.012), dark, sd * 0.285, -0.12, 0.06, { rot: [0, 0, sd * -0.12], cast: false });
      add(head, G.rbox(0.07, 0.03, 0.03, 0.01), dark, 0, -0.27, 0.16, { cast: false });
    }
    if (acc.has('headband')) add(head, G.torus(0.302, 0.028, Math.PI * 2, 8, 32), cloth(0xe2231a), 0, 0.14, -0.01, { rot: [Math.PI / 2 + 0.12, 0, 0], scale: [1, 0.98, 0.6] });
    if (acc.has('bow')) { const bm = cloth(0xe2231a); for (const sd of [-1, 1]) add(head, G.sph(0.075, 12, 8), bm, sd * 0.075, 0.31, 0.08, { scale: [1, 0.72, 0.45], rot: [0, 0, sd * 0.3] }); add(head, G.sph(0.03, 8, 6), bm, 0, 0.3, 0.1); }
    if (acc.has('earphones')) { const em = gloss(0xffffff); add(head, G.torus(0.315, 0.02, Math.PI, 8, 24), em, 0, 0.02, 0); for (const sd of [-1, 1]) { add(head, G.cyl(0.085, 0.085, 0.05, 20), em, sd * 0.315, -0.02, 0, { rot: [0, 0, Math.PI / 2] }); add(head, G.cyl(0.07, 0.07, 0.03, 20), M(0xff5f8f, { roughness: 0.8 }), sd * 0.29, -0.02, 0, { rot: [0, 0, Math.PI / 2] }); } }
    if (acc.has('scarf')) { const sm = cloth(pick([0xe2231a, 0x3aa0e8, 0xffd166])); add(body, G.torus(0.125, 0.055, Math.PI * 2, 10, 20), sm, 0, 0.56, 0, { rot: [Math.PI / 2, 0, 0] }); add(body, G.rbox(0.09, 0.24, 0.03, 0.02, 2), sm, 0.09, 0.42, 0.2, { rot: [-0.15, 0, -0.1] }); }
    if (acc.has('neckerchief')) { add(body, G.torus(0.112, 0.028, Math.PI * 2, 6, 16), cloth(0xe2231a), 0, 0.55, 0, { rot: [Math.PI / 2, 0, 0] }); add(body, G.cone(0.055, 0.13, 4), cloth(0xe2231a), 0, 0.455, 0.175, { rot: [Math.PI + 0.15, 0.785, 0], cast: false }); }
    if (acc.has('pearls')) for (let i = 0; i < 11; i++) { const a = -0.3 + (i / 10) * (Math.PI + 0.6); add(body, G.sph(0.016, 8, 6), P(0xfffaf0, { roughness: 0.15, clearcoat: 1 }), Math.cos(a) * 0.125, 0.52 - Math.sin(a) * 0.05, 0.02 + Math.sin(a) * 0.15, { cast: false }); }
    if (acc.has('backpack')) {
      const bp = cloth(0x3aa0e8);
      add(body, G.rbox(0.36, 0.38, 0.18, 0.06), bp, 0, 0.3, -0.27);
      add(body, G.rbox(0.24, 0.16, 0.06, 0.03), cloth(0xffd166), 0, 0.22, -0.37);
      for (const sd of [-1, 1]) add(body, G.torus(0.15, 0.022, Math.PI, 6, 14), bp, sd * 0.13, 0.36, 0.02, { rot: [0, Math.PI / 2, 0], scale: [1.35, 1.05, 1] });
      add(body, G.sph(0.03, 8, 6), M(0xe2231a), 0.16, 0.14, -0.3);
    }
    if (acc.has('box')) {
      const bm = cloth(0xffc21a);
      add(body, G.rbox(0.5, 0.46, 0.36, 0.04), bm, 0, 0.36, -0.37);
      add(body, G.rbox(0.52, 0.06, 0.38, 0.02), M(0x2a2a2e), 0, 0.58, -0.37);
      add(body, G.box(0.3, 0.2, 0.006), M(0x1d1d1f), 0, 0.36, -0.553, { cast: false });
      for (const sd of [-1, 1]) add(body, G.torus(0.16, 0.022, Math.PI, 6, 14), M(0x2a2a2e), sd * 0.14, 0.36, 0.0, { rot: [0, Math.PI / 2, 0], scale: [1.5, 1.1, 1] });
    }
    if (acc.has('muscle')) for (const sd of [-1, 1]) { this.arms[sd < 0 ? 0 : 1].scale.set(1.4, 1.02, 1.4); add(body, G.sph(0.09, 12, 10), skin, sd * 0.1, 0.4, 0.17, { scale: [1.1, 0.8, 0.5], cast: false }); }
    if (acc.has('towel')) { const tw = cloth(0xffffff); add(body, G.torus(0.13, 0.04, Math.PI, 8, 16), tw, 0, 0.56, -0.01, { rot: [Math.PI / 2, 0, Math.PI] }); for (const sd of [-1, 1]) add(body, G.rbox(0.08, 0.2, 0.03, 0.02, 2), tw, sd * 0.125, 0.45, 0.14, { rot: [-0.25, 0, 0] }); }
    if (acc.has('heart')) { const hm = M(0xff4f7b, { emissive: 0xff4f7b, emissiveIntensity: 0.5 }); const h = group(head, 0.2, 0.46, 0.05); add(h, G.sph(0.035, 10, 8), hm, -0.022, 0.012, 0); add(h, G.sph(0.035, 10, 8), hm, 0.022, 0.012, 0); add(h, G.cone(0.05, 0.07, 4), hm, 0, -0.035, 0, { rot: [Math.PI, 0.785, 0], scale: [1, 1, 0.6] }); this.float = h; }
    if (acc.has('question')) { const q = M(0x0071e3, { emissive: 0x0071e3, emissiveIntensity: 0.5 }); const h = group(head, 0, 0.52, 0); add(h, G.torus(0.045, 0.014, Math.PI * 1.3, 6, 14), q, 0, 0.04, 0, { rot: [0, 0, -0.5] }); add(h, G.cap(0.014, 0.02, 3, 6), q, 0.012, -0.02, 0); add(h, G.sph(0.017, 8, 6), q, 0.012, -0.07, 0); this.float = h; }
    if (acc.has('watch')) { add(L.userData.fore, G.cyl(0.054, 0.054, 0.022, 12), dark, -0.006, -0.125, 0, { cast: false }); add(L.userData.fore, G.cyl(0.024, 0.024, 0.01, 12), M(0xf2c14b, { metalness: 0.9, roughness: 0.2 }), -0.062, -0.125, 0, { rot: [0, 0, Math.PI / 2], cast: false }); }
    // 手持物
    if (acc.has('ringlight')) {
      const h = group(RH, 0, -0.02, 0.02);
      h.rotation.x = 1.15;
      add(h, G.cyl(0.012, 0.012, 0.34, 6), dark, 0, 0.14, 0);
      const ring = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2.2 });
      add(h, G.torus(0.12, 0.018, Math.PI * 2, 8, 32), ring, 0, 0.36, 0, { cast: false });
      add(h, G.rbox(0.075, 0.14, 0.012, 0.01), dark, 0, 0.36, 0);
      add(h, G.plane(0.062, 0.12), new THREE.MeshStandardMaterial({ color: 0x8fd0ff, emissive: 0x8fd0ff, emissiveIntensity: 0.6 }), 0, 0.36, -0.0065, { rot: [0, Math.PI, 0], cast: false });
      this.armPose[1] = -1.05;
    }
    if (acc.has('lollipop')) { const h = group(RH, 0, -0.03, 0.03); h.rotation.x = 1.0; add(h, G.cyl(0.006, 0.006, 0.16, 5), M(0xffffff), 0, 0.08, 0); add(h, G.cyl(0.05, 0.05, 0.016, 20), M(0xff6fa0, { map: swirlTex(), roughness: 0.25 }), 0, 0.2, 0, { rot: [Math.PI / 2, 0, 0] }); this.armPose[1] = -1.0; }
    if (acc.has('briefcase')) { add(LH, G.rbox(0.07, 0.2, 0.3, 0.02), P(0x4a3324, { roughness: 0.45, clearcoat: 0.3 }), 0, -0.18, 0); add(LH, G.torus(0.04, 0.008, Math.PI, 6, 10), dark, 0, -0.075, 0, { rot: [0, Math.PI / 2, 0] }); for (const sz of [-0.09, 0.09]) add(LH, G.box(0.075, 0.03, 0.02), M(0xf2c14b, { metalness: 0.8, roughness: 0.3 }), 0, -0.1, sz, { cast: false }); }
    if (acc.has('tote')) { const tm = cloth(0x6fbf8b); add(LH, G.rbox(0.09, 0.26, 0.28, 0.035), tm, 0, -0.22, 0); add(LH, G.torus(0.07, 0.01, Math.PI, 6, 12), tm, 0, -0.08, 0, { rot: [0, Math.PI / 2, 0] }); add(LH, G.cyl(0.018, 0.018, 0.22, 8), M(0x79b86a), 0, -0.07, 0.06, { rot: [0.3, 0, 0] }); add(LH, G.sph(0.03, 8, 6), M(0xf7901f), 0, -0.1, -0.05); }
    if (acc.has('notebook')) { add(LH, G.rbox(0.025, 0.18, 0.13, 0.006), dark, -0.01, -0.03, 0.06, { rot: [0.9, 0, 0] }); add(LH, G.box(0.027, 0.17, 0.004), M(0xffffff), -0.01, -0.03, 0.06, { rot: [0.9, 0, 0], cast: false }); this.armPose[0] = -0.85; }
  }

  setMood(m) {
    this.mood = m;
    const mouth = { happy: 'grin', neutral: 'flat', impatient: 'frown', angry: 'open', smile: 'smile' }[m] || 'flat';
    for (const k in this.mouths) this.mouths[k].visible = !this.mouthHidden && k === mouth;
    const tilt = { angry: 0.5, impatient: 0.26, happy: -0.2 }[m] || 0;
    this.brows[0].rotation.z = Math.PI / 2 - tilt; this.brows[1].rotation.z = Math.PI / 2 + tilt;
    const by = 0.1 + (m === 'happy' ? 0.022 : m === 'angry' ? -0.016 : 0);
    this.brows[0].position.y = this.brows[1].position.y = by;
  }

  hop() { this.hopT = 0.55; }

  holdCup(mesh) {
    if (this.held) return;
    const i = this.armPose[1] != null ? 0 : 1;
    const hand = this.arms[i].userData.hand;
    mesh.position.set(0, -0.02, 0.07);
    mesh.rotation.x = Math.PI / 2 - 0.1;
    mesh.scale.setScalar(1.15 / (this.look.scale || 1.2));
    hand.add(mesh);
    this.held = true;
    this.armPose[i] = -1.15;
  }

  update(dt) {
    this.t += dt;
    const t = this.t + this.seed;
    let bob = 0, legA = 0, armA = 0, lean = 0;
    if (this.walking) {
      this.phase += dt * 9.5;
      legA = Math.sin(this.phase) * 0.75; armA = Math.sin(this.phase) * 0.55;
      bob = Math.abs(Math.sin(this.phase)) * 0.035;
    } else {
      bob = Math.sin(t * 2.1) * 0.008;
      if (this.mood === 'impatient') this.legs[0].rotation.x = -Math.max(0, Math.sin(t * 11)) * 0.3;
      if (this.mood === 'angry') lean = Math.sin(t * 34) * 0.025;
    }
    let hop = 0, cheer = 0;
    if (this.hopT > 0) { this.hopT -= dt; const k = 1 - Math.max(0, this.hopT) / 0.55; hop = Math.sin(k * Math.PI) * 0.2; cheer = Math.sin(k * Math.PI); }
    if (this.walking || this.mood !== 'impatient') this.legs[0].rotation.x = legA;
    this.legs[1].rotation.x = -legA;
    this.body.position.y = 0.42 + bob;
    this.body.scale.y = 1 + Math.sin(t * 2.1) * 0.006;
    this.group.position.y = hop * (this.look.scale || 1.2);
    this.body.rotation.z = lean;
    this.body.rotation.y = this.walking ? Math.sin(this.phase) * 0.08 : 0;
    this.arms.forEach((a, i) => {
      const sd = i ? 1 : -1, pose = this.armPose[i], fore = a.userData.fore;
      a.rotation.x = pose != null ? pose * 0.55 + Math.sin(t * 2) * 0.03 : -sd * armA + Math.sin(t * 1.7 + i) * 0.03;
      a.rotation.z = pose != null ? 0 : sd * (0.05 + cheer * 2.3);
      fore.rotation.x = pose != null ? pose * 0.9 : -0.28 - Math.max(0, -sd * armA) * 0.6 - cheer * 0.3;
    });
    this.head.rotation.y = this.walking ? 0 : Math.sin(t * 0.55) * 0.14;
    this.head.rotation.z = Math.sin(t * 0.8) * 0.03 + lean;
    this.head.rotation.x = this.mood === 'happy' ? -0.08 : this.mood === 'angry' ? 0.06 : 0;
    if (this.float) { this.float.position.y += Math.sin(t * 3) * 0.0006; this.float.rotation.y = Math.sin(t * 2) * 0.5; }
    // 眨眼
    this.blinkT -= dt;
    const sy = this.blinkT < 0.1 ? 0.1 : this.mood === 'happy' ? 0.62 : this.mood === 'angry' ? 0.8 : 1;
    this.eyes[0].scale.y = this.eyes[1].scale.y = sy;
    if (this.blinkT < 0) this.blinkT = rand(1.8, 4.5);
  }
}

const stripeCache = {};
function stripeMat(color) {
  if (!stripeCache[color]) {
    const hexc = '#' + new THREE.Color(color).getHexString();
    const tex = canvasTex(64, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.fillStyle = hexc; for (let y = 0; y < 64; y += 16) c.fillRect(0, y, 64, 8); }, { repeat: [1, 3] });
    stripeCache[color] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  }
  return stripeCache[color];
}
function floralMat(color) {
  if (!floralTex) {
    const hexc = '#' + new THREE.Color(color).getHexString();
    floralTex = new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(128, 128, (c) => {
      c.fillStyle = hexc; c.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 14; i++) { const x = (i * 53) % 128, y = (i * 89) % 128; c.fillStyle = ['#ffd166', '#fff', '#ff9db8'][i % 3]; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * 7, y + Math.sin(p * 1.257) * 7, 5, 0, 7); c.fill(); } c.fillStyle = '#e2231a'; c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill(); }
    }, { repeat: [3, 2] }) });
  }
  return floralTex;
}
let _swirl = null;
function swirlTex() {
  return _swirl || (_swirl = canvasTex(64, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#ff4f8a'; c.lineWidth = 5; c.beginPath(); for (let a = 0; a < 20; a += 0.1) c.lineTo(32 + Math.cos(a) * a * 1.6, 32 + Math.sin(a) * a * 1.6); c.stroke(); }));
}
