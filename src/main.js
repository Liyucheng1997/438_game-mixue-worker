import * as THREE from 'three';
import { createWorld } from './world.js';
import { buildStations } from './stations.js';
import { UI } from './ui.js';
import { FX } from './fx.js';
import { Sfx } from './audio.js';
import { Game } from './game.js';

const canvas = document.getElementById('c');
const world = createWorld(canvas);
const stations = buildStations(world.scene);
const ui = new UI();
const fx = new FX(world.scene);
const sfx = new Sfx();
const game = new Game(world, stations, ui, fx, sfx);
window.__game = game; // 方便调试

// —— 鼠标 / 触屏拾取 ——
const ray = new THREE.Raycaster();
ray.layers.enable(1); // 设备的点击盒在第 1 层
const ndc = new THREE.Vector2();
function pick(e) {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, world.camera);
  const targets = [...stations.list.filter((s) => s.unlocked).map((s) => s.group), ...game.customers.filter((c) => c.state === 'wait').map((c) => c.group)];
  const hits = ray.intersectObjects(targets, true);
  for (const h of hits) {
    let o = h.object;
    while (o) {
      if (o.userData.stationId) return { station: game.S[o.userData.stationId] };
      if (o.userData.c) return { customer: o.userData.c };
      o = o.parent;
    }
  }
  return null;
}

let hovered = null;
canvas.addEventListener('pointermove', (e) => {
  if (game.state !== 'play') return;
  const p = pick(e);
  const st = p && p.station && p.station.type !== 'mat' ? p.station : null;
  if (hovered !== st) {
    if (hovered) { hovered.hovering = false; hovered.el && hovered.el.classList.remove('hover'); }
    hovered = st;
    if (st) { st.hovering = true; st.el && st.el.classList.add('hover'); }
  }
  canvas.style.cursor = st || (p && p.customer) ? 'pointer' : 'default';
});
canvas.addEventListener('pointerdown', (e) => {
  sfx.init();
  const p = pick(e);
  if (!p) return;
  if (p.station) game.press(p.station.id);
  else if (p.customer) game.serve(p.customer);
});
window.addEventListener('pointerup', () => game.releaseHold());
window.addEventListener('pointercancel', () => game.releaseHold());
window.addEventListener('blur', () => game.releaseHold());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (game.state !== 'play') return;
  if (e.code === 'Tab') { e.preventDefault(); game.toggleRecipes(); return; }
  if (e.repeat) return;
  if (e.code === 'Space') { e.preventDefault(); game.press('board'); }
  else if (e.code === 'KeyX') game.trash();
  else if (e.code === 'Digit1' || e.code === 'Numpad1') game.serveSlot(0);
  else if (e.code === 'Digit2' || e.code === 'Numpad2') game.serveSlot(1);
  else if (e.code === 'Digit3' || e.code === 'Numpad3') game.serveSlot(2);
});

document.getElementById('b-recipe').onclick = () => game.toggleRecipes();
document.getElementById('b-hint').onclick = () => game.toggleHints();
document.getElementById('b-sound').onclick = () => { sfx.init(); sfx.toggle(); game.syncButtons(); };

// —— 主循环 ——
let last = performance.now();
let idle = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  world.tick(dt);
  if (game.state !== 'play') {
    // 标题和结算时镜头轻轻晃动
    idle += dt;
    world.camera.position.set(world.camPos.x + Math.sin(idle * 0.3) * 0.25, world.camPos.y + Math.sin(idle * 0.23) * 0.06, world.camPos.z);
  } else world.camera.position.lerp(world.camPos, 0.1);
  world.camera.lookAt(world.camLook);
  world.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
game.showTitle();
