// 轻量特效：补间、飞行的小料团、飞溅粒子
import * as THREE from 'three';
import { M } from './h.js';

const blobGeo = new THREE.SphereGeometry(1, 10, 8);
blobGeo.userData.shared = true;

export class FX {
  constructor(scene) { this.scene = scene; this.items = []; this.parts = []; }

  tween(dur, fn, done, delay = 0) { this.items.push({ t: -delay, dur, fn, done }); }

  // 从 from 抛物线飞到 to 的 n 个小球，全部落地后回调
  blobs(from, to, color, n, done, size = 0.03) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(blobGeo, M(color, { roughness: 0.3 }));
      m.scale.setScalar(size * (0.8 + Math.random() * 0.4));
      m.visible = false;
      this.scene.add(m);
      const off = new THREE.Vector3((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05);
      const target = typeof to === 'function' ? to : () => to;
      this.tween(0.3, (k) => {
        m.visible = true;
        const tp = target();
        m.position.lerpVectors(from, tp, k).add(off);
        m.position.y += Math.sin(k * Math.PI) * 0.32;
      }, () => { this.scene.remove(m); if (i === n - 1 && done) done(); }, i * 0.045);
    }
  }

  burst(pos, color, n = 12, power = 1.6, size = 0.022) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(blobGeo, M(color, { roughness: 0.3 }));
      m.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      m.position.copy(pos);
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2, sp = power * (0.4 + Math.random() * 0.8);
      this.parts.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, 1.2 + Math.random() * 1.8 * power, Math.sin(a) * sp), life: 0.55 + Math.random() * 0.3 });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.t < 0) continue;
      const k = Math.min(1, it.t / it.dur);
      it.fn(k);
      if (k >= 1) { this.items.splice(i, 1); if (it.done) it.done(); }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.v.y -= 9 * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.life <= 0) { this.scene.remove(p.m); this.parts.splice(i, 1); }
    }
  }
}
