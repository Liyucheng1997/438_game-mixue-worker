// 核心玩法：营业流程、顾客、调配、评分、经济
import * as THREE from 'three';
import { ING, RECIPES, ARCH, LINES, DANMAKU, BOSS, UPGRADES, DAY_LEN, kpiTarget, hitsNeeded, creamZone, pick, rand, availableRecipes, makeItem, evaluate } from './data.js';
import { DrinkVisual, miniDrink } from './drink.js';
import { Character, LOOKS, randomLook } from './character.js';
import { SLOT_X, COUNTER_Y } from './world.js';
import { money } from './ui.js';

const SAVE_KEY = 'mx438-save-v1';
const newSave = () => ({ day: 1, money: 0, stars: 3.5, ups: {}, total: 0 });
const WAGE = 60;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Game {
  constructor(world, stations, ui, fx, sfx) {
    Object.assign(this, { world, ui, fx, sfx });
    this.S = stations.byId; this.stations = stations.list;
    this.save = this.load();
    this.state = 'title'; this.paused = false;
    this.customers = []; this.slots = [null, null, null];
    this.cup = null; this.stash = null; this.busy = null; this.hold = null; this.boardFruit = null;
    this.hints = true; this.recipesOpen = false; this.seq = 0;
    this.d = this.newDayStats();
    for (const st of this.stations) { st.unlocked = true; st.bump = 0; if (st.type !== 'mat') ui.addLabel(st, (s) => this.press(s.id)); }
    this.peds = [];
    for (let i = 0; i < 5; i++) {
      const ch = new Character(randomLook());
      const dir = i % 2 ? 1 : -1;
      ch.group.position.set(rand(-13, 13), 0, -5.1 - (i % 2) * 0.75 - Math.random() * 0.2);
      ch.group.rotation.y = dir * Math.PI / 2;
      ch.walking = true;
      world.scene.add(ch.group);
      this.peds.push({ ch, dir, speed: rand(1.0, 1.6) });
    }
    this.applyUnlocks();
  }

  // —— 存档 ——
  load() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.day) return { ...newSave(), ...s }; } catch (e) { /* 忽略 */ } return null; }
  persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { /* 忽略 */ } }
  newDayStats() { return { time: 0, revenue: 0, tips: 0, fines: 0, served: 0, perfect: 0, lost: 0, met: new Set(), pending: 0, spawnT: 1.2, combo: 0, closing: false, first: true }; }

  showTitle() {
    this.state = 'title';
    this.ui.showHud(false);
    this.ui.title({
      save: this.load(),
      onNew: () => { this.sfx.init(); this.save = newSave(); this.intro(); },
      onContinue: () => { this.sfx.init(); this.save = this.load() || newSave(); this.intro(); },
    });
  }

  intro() {
    const day = this.save.day, news = [];
    for (const k in RECIPES) if (RECIPES[k].day === day && day > 1) news.push('新品 · ' + RECIPES[k].name);
    for (const k in ARCH) if (ARCH[k].day === day && day > 1) news.push('新顾客 · ' + ARCH[k].name);
    this.clearAll();
    this.applyUnlocks();
    this.world.setTime(0);
    this.ui.showHud(false);
    this.ui.dayIntro({ day, target: kpiTarget(day), news, onGo: () => { this.ui.closeScreen(); this.startDay(); } });
  }

  applyUnlocks() {
    const day = this.save ? this.save.day : 1, ups = this.save ? this.save.ups : {};
    const need = new Set(['cup', 'cone', 'softserve', 'sealer', 'trash', 'sugar', 'ice', 'mat']);
    for (const id of availableRecipes(day)) { const r = RECIPES[id]; Object.keys(r.need).forEach((k) => need.add(k)); if (r.shake) need.add('shaker'); }
    if (need.has('lemon') || need.has('orange')) need.add('board');
    need.delete('iceCream');
    if (ups.stash) need.add('stash');
    for (const st of this.stations) {
      st.unlocked = need.has(st.id);
      st.group.visible = st.unlocked;
      if (st.el) st.el.hidden = !st.unlocked;
    }
  }

  startDay() {
    this.d = this.newDayStats();
    this.state = 'play'; this.paused = false;
    if (this.save.day <= 2) this.hints = true;
    this.ui.showHud(true);
    this.syncButtons();
    this.refreshCup();
    if (this.save.day === 1) this.ui.toast('师傅带教已开启：照着蓝色标签点就行');
  }

  syncButtons() {
    document.getElementById('b-hint').textContent = '师傅带教：' + (this.hints ? '开' : '关');
    document.getElementById('b-sound').textContent = '声音：' + (this.sfx.on ? '开' : '关');
  }

  clearAll() {
    for (const c of this.customers) { this.ui.removeTicket(c); this.world.scene.remove(c.group); }
    this.customers = []; this.slots = [null, null, null];
    for (const c of [this.cup, this.stash]) if (c) this.destroyCup(c, true);
    this.cup = this.stash = null; this.busy = null; this.hold = null;
    this.clearBoard();
    this.ui.gauge(null); this.ui.live(null);
    for (const st of this.stations) this.ui.setNeed(st, 0);
  }

  // —— 每帧 ——
  update(dt) {
    this.fx.update(dt);
    for (const p of this.peds) {
      p.ch.group.position.x += p.dir * p.speed * dt;
      if (p.ch.group.position.x > 15) p.ch.group.position.x = -15;
      if (p.ch.group.position.x < -15) p.ch.group.position.x = 15;
      p.ch.update(dt);
    }
    const k = 1 - Math.exp(-dt * 14);
    for (const c of [this.cup, this.stash]) if (c) c.vis.group.position.lerp(c.target, k);
    for (const st of this.stations) {
      st.bump = Math.max(0, st.bump - dt * 5);
      const s = 1 + (st.hovering ? 0.035 : 0) + Math.sin(st.bump * Math.PI) * 0.07;
      st.group.scale.setScalar(st.group.scale.x + (s - st.group.scale.x) * Math.min(1, dt * 18));
    }
    for (const c of this.customers) for (const ch of c.chars) ch.update(dt);
    if (this.state !== 'play') return;
    this.placeUi();
    if (this.paused) return;

    const d = this.d;
    d.time += dt;
    this.world.setTime(d.time / DAY_LEN);
    if (!d.closing && d.time >= DAY_LEN) { d.closing = true; d.pending = 0; this.ui.toast('打烊时间到！做完店里这几位就下班'); this.sfx.chime(); }
    if (!d.closing) {
      d.spawnT -= dt;
      if (d.spawnT <= 0) {
        if (d.pending < 6) d.pending++;
        else { this.star(-0.05); this.ui.toast('门外排队太长，有人走掉了', 'error'); }
        const base = Math.max(5.2, 13.5 - this.save.day * 1.15);
        d.spawnT = base * rand(0.7, 1.3) * (1.25 - this.save.stars * 0.07);
      }
    }
    const free = this.slots.findIndex((s) => !s);
    if (d.pending > 0 && free >= 0) { d.pending--; this.spawn(this.pickSlot()); }

    for (let i = this.customers.length - 1; i >= 0; i--) this.updateCustomer(this.customers[i], dt);
    this.updateHold(dt);
    this.updateHints();
    this.ui.hud({ day: this.save.day, clock: this.clock(), revenue: d.revenue, target: kpiTarget(this.save.day), money: this.save.money, stars: this.save.stars, queue: d.pending, combo: d.combo, closing: d.closing });
    if (d.closing && this.customers.length === 0) this.endDay();
  }

  clock() {
    const m = Math.min(1, this.d.time / DAY_LEN) * 12 * 60, h = 10 + Math.floor(m / 60), mm = Math.floor(m % 60);
    return String(h).padStart(2, '0') + ':' + String(mm - (mm % 5)).padStart(2, '0');
  }

  pickSlot() {
    const free = [0, 1, 2].filter((i) => !this.slots[i]);
    return free.includes(1) && Math.random() < 0.5 ? 1 : pick(free);
  }

  placeUi() {
    for (const st of this.stations) if (st.el && st.unlocked) this.ui.place(st.el, this.world.project(st.labelPos));
    for (const c of this.customers) if (c.ticket) this.ui.place(c.ticket, this.world.project(c.head), 'bottom');
  }

  // —— 顾客 ——
  spawn(slot) {
    const day = this.save.day, d = this.d;
    let arch = 'normal';
    if (!(day === 1 && d.first)) {
      const pool = Object.keys(ARCH).filter((k) => ARCH[k].day <= day && !(k === 'streamer' && this.customers.some((c) => c.arch === 'streamer')));
      let w = pool.reduce((a, k) => a + ARCH[k].w, 0) * Math.random();
      for (const k of pool) { w -= ARCH[k].w; if (w <= 0) { arch = k; break; } }
    }
    const a = ARCH[arch];
    const recs = availableRecipes(day), cups = recs.filter((r) => r !== 'cone'), custom = cups.filter((r) => RECIPES[r].sugar);
    let items;
    if (day === 1 && d.first) items = [makeItem('lemonade', { sugar: 2, ice: 2 })];
    else if (arch === 'kid') items = [makeItem('cone', { tall: true })];
    else if (arch === 'sweet') { items = [makeItem(pick(custom), { sugar: 2 })]; items[0].need.sugar = 5; }
    else if (arch === 'fitness') items = [makeItem(pick(custom), { sugar: 0, ice: 0 })];
    else if (arch === 'couple') items = [makeItem(pick(cups)), makeItem(pick(recs))];
    else if (arch === 'rider') items = [makeItem(pick(cups)), makeItem(pick(cups)), makeItem(pick(cups))];
    else if (arch === 'manager') items = [makeItem(pick(cups))];
    else { items = [makeItem(pick(recs))]; if (arch === 'normal' && day >= 3 && Math.random() < 0.15) items.push(makeItem(pick(recs))); }
    if (arch === 'riddler') for (const it of items) { it.revealed = false; it.mask = RECIPES[it.id].riddle; }
    if (arch === 'shy') for (const it of items) {
      it.revealed = false;
      const keep = Math.floor(Math.random() * it.name.length);
      it.mask = it.name.split('').map((ch, i) => (i === keep || i === (keep + 2) % it.name.length ? ch : '·')).join('');
    }
    d.first = false;

    const group = new THREE.Group();
    const chars = [];
    const n = arch === 'couple' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const look = arch === 'normal' && Math.random() < 0.18 ? LOOKS.grandpa() : LOOKS[arch](i);
      const ch = new Character(look);
      ch.group.position.x = n === 2 ? (i ? 0.3 : -0.3) : 0;
      ch.walking = true;
      group.add(ch.group); chars.push(ch);
    }
    group.traverse((o) => { o.userData.customer = true; });
    const sx = SLOT_X[slot];
    group.position.set(6.2, 0, -5.3);
    this.world.scene.add(group);
    const maxP = (32 + 13 * items.length) * a.p * (1 + 0.15 * (this.save.ups.speaker || 0)) * Math.max(0.72, 1 - 0.04 * (day - 1)) * (day === 1 ? 1.3 : 1);
    const c = { arch, slot, items, group, chars, state: 'enter', path: [V(2.3, 0, -5.2), V(2.3, 0, -3.4), V(sx, 0, -2.9), V(sx, 0, -1.85)], patience: maxP, maxP, say: '', ticket: null, changed: false, dmT: 1, order: this.seq++, viewers: Math.floor(rand(800, 9000)), head: V(sx, 1.56 * (chars[0].look.scale || 1.1) + 0.32, -1.85) };
    group.userData.c = c;
    this.customers.push(c);
    this.slots[slot] = c;
    d.met.add(arch);
  }

  walk(c, dt) {
    const t = c.path[0];
    if (!t) return true;
    const p = c.group.position, dx = t.x - p.x, dz = t.z - p.z, dist = Math.hypot(dx, dz), step = 2.5 * dt;
    if (dist <= step) { p.x = t.x; p.z = t.z; c.path.shift(); return c.path.length === 0; }
    p.x += (dx / dist) * step; p.z += (dz / dist) * step;
    const target = Math.atan2(dx, dz);
    let diff = target - c.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    c.group.rotation.y += diff * Math.min(1, dt * 10);
    return false;
  }

  updateCustomer(c, dt) {
    if (c.state === 'enter') {
      if (this.walk(c, dt)) {
        c.state = 'wait'; c.group.rotation.y = 0;
        c.chars.forEach((ch) => { ch.walking = false; });
        c.say = pick(ARCH[c.arch].order);
        this.ui.addTicket(c, (x) => this.serve(x), (x) => this.ask(x));
        this.ui.renderTicket(c, this.hints);
        this.sfx.chime();
        if (c.arch === 'streamer') this.ui.live(c.viewers);
      }
    } else if (c.state === 'wait') {
      c.group.rotation.y *= 1 - Math.min(1, dt * 8);
      c.patience -= dt;
      const k = c.patience / c.maxP;
      this.ui.setPatience(c, k);
      const mood = k < 0.25 ? 'angry' : k < 0.5 ? 'impatient' : 'neutral';
      if (mood !== c.mood) { c.mood = mood; c.chars.forEach((ch) => ch.setMood(mood)); }
      if (c.arch === 'changer' && !c.changed && k < 0.72) this.changeOrder(c);
      if (c.arch === 'streamer') {
        c.dmT -= dt;
        if (c.dmT <= 0) { c.dmT = rand(0.9, 2.2); this.ui.danmaku(pick(DANMAKU.idle)); c.viewers += Math.floor(rand(-30, 120)); this.ui.live(c.viewers); }
      }
      if (c.patience <= 0) this.walkout(c);
    } else if (c.state === 'done') {
      c.doneT -= dt;
      if (c.doneT <= 0) this.leave(c);
    } else if (c.state === 'leaving') {
      if (this.walk(c, dt)) { this.world.scene.remove(c.group); this.customers.splice(this.customers.indexOf(c), 1); }
    }
  }

  changeOrder(c) {
    const it = c.items.find((i) => !i.done);
    if (!it) return;
    c.changed = true;
    const others = availableRecipes(this.save.day).filter((r) => r !== it.id);
    const nw = makeItem(pick(others));
    c.items[c.items.indexOf(it)] = nw;
    c.say = pick(LINES.change) + nw.name + '！';
    c.patience = Math.min(c.maxP, c.patience + c.maxP * 0.18);
    this.ui.renderTicket(c, this.hints);
    this.ui.shakeTicket(c);
    this.ui.float('改单了！', 'info', this.world.project(c.head), -40);
    this.sfx.alert();
    c.chars[0].hop();
  }

  ask(c) {
    if (c.state !== 'wait') return;
    for (const it of c.items) it.revealed = true;
    c.patience -= c.maxP * (c.arch === 'shy' ? 0.1 : 0.16);
    c.say = pick(c.arch === 'shy' ? LINES.shyAsk : LINES.riddleAsk);
    this.ui.renderTicket(c, this.hints);
    this.ui.shakeTicket(c);
    this.sfx.pop();
  }

  leave(c) {
    if (c.state === 'leaving') return;
    c.state = 'leaving';
    this.ui.removeTicket(c);
    if (this.slots[c.slot] === c) this.slots[c.slot] = null;
    c.chars.forEach((ch) => { ch.walking = true; });
    const sx = SLOT_X[c.slot];
    c.path = [V(sx, 0, -2.9), V(2.3, 0, -3.4), V(2.3, 0, -5.3), V(-9, 0, -5.5)];
    if (c.arch === 'streamer') this.ui.live(null);
  }

  walkout(c) {
    this.d.lost++; this.d.combo = 0;
    this.star(-0.25 * (c.arch === 'streamer' ? 3 : 1), true);
    c.chars.forEach((ch) => ch.setMood('angry'));
    this.ui.float('气走了', 'bad', this.world.project(c.head), -30);
    this.ui.toast(`${ARCH[c.arch].name}：“${pick(LINES.leave)}”`, 'error');
    if (c.arch === 'streamer') for (let i = 0; i < 6; i++) setTimeout(() => this.ui.danmaku(pick(DANMAKU.bad)), i * 180);
    this.sfx.buzz();
    this.leave(c);
    this.checkFired();
  }

  star(delta, soften = false) {
    if (delta < 0 && soften && this.save.ups.smile) delta *= 0.5;
    this.save.stars = Math.max(0, Math.min(5, this.save.stars + delta));
  }

  checkFired() {
    if (this.save.stars > 0.3 || this.state !== 'play') return;
    this.state = 'over';
    const data = { day: this.save.day, total: this.save.total, money: this.save.money };
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    this.sfx.buzz();
    setTimeout(() => { this.clearAll(); this.ui.showHud(false); this.ui.gameover(data, () => { this.save = newSave(); this.intro(); }); }, 900);
  }

  // —— 出餐 ——
  serve(c) {
    if (this.state !== 'play' || this.paused || !c || c.state !== 'wait' || this.busy) return;
    const cup = this.cup;
    if (!cup) { this.ui.toast('手里没有做好的饮品'); return; }
    const zone = creamZone(this.save.ups);
    let item = null, res = null;
    for (const it of c.items) { if (it.done) continue; const r = evaluate(cup, it, zone); if (!res || r.score > res.score) { res = r; item = it; } }
    if (!item) return;
    if (c.arch === 'fitness' && cup.ing.sugar) { res.score = Math.min(res.score, 25); res.notes.unshift('他一口就尝出糖了'); }
    item.done = true; item.revealed = true;
    this.cup = null;
    cup.gone = true;
    const from = cup.vis.group.position.clone(), to = V(SLOT_X[c.slot], COUNTER_Y + 0.02, -0.82);
    const color = cup.vis.mainColor(cup), ch = c.chars[c.items.filter((i) => i.done).length === 2 && c.chars[1] ? 1 : 0];
    this.fx.tween(0.26, (k) => { cup.vis.group.position.lerpVectors(from, to, k); cup.vis.group.position.y += Math.sin(k * Math.PI) * 0.4; },
      () => this.fx.tween(0.3, () => {}, () => { this.destroyCup(cup, true); ch.holdCup(miniDrink(cup.container, color)); }));
    cup.target = to;
    this.sfx.whoosh();
    this.result(c, item, res);
    this.refreshCup();
  }

  result(c, item, r) {
    const d = this.d, a = ARCH[c.arch], ups = this.save.ups, p = this.world.project(c.head);
    const tier = r.score >= 95 ? 'perfect' : r.score >= 70 ? 'good' : r.score >= 40 ? 'meh' : 'fail';
    const mult = c.arch === 'streamer' ? 3 : 1;
    const paid = tier === 'fail' ? 0 : item.price;
    d.revenue += paid;
    let tip = 0;
    if (tier === 'perfect') {
      d.combo++; d.perfect++;
      if (a.tip > 0) tip = Math.round((1 + Math.random()) * a.tip * (1 + 0.5 * (ups.cat || 0)) * (c.patience / c.maxP > 0.5 ? 1 : 0.5)) + (d.combo >= 3 ? 1 : 0);
    } else d.combo = 0;
    if (tip) { d.tips += tip; this.save.money += tip; this.world.env.coins.forEach((m, i) => { m.visible = i < 2 + d.tips / 2; }); }
    this.star({ perfect: 0.12, good: 0.04, meh: -0.12, fail: -0.35 }[tier] * mult, true);
    const text = { perfect: `完美！+¥${paid}`, good: `还行 +¥${paid}`, meh: `勉强 +¥${paid}`, fail: '翻车！退款' }[tier];
    this.ui.float(text, tier === 'perfect' || tier === 'good' ? 'good' : 'bad', p, -30);
    if (tip) setTimeout(() => { this.ui.float(`小费 +¥${tip}`, 'info', p, -64); this.sfx.coin(); }, 350);
    if (r.notes.length) this.ui.toast(r.notes.slice(0, 3).join('，'), tier === 'fail' || tier === 'meh' ? 'error' : '');
    c.say = c.arch === 'kid' && tier === 'perfect' ? '哇！！好高！！谢谢！' : pick(LINES[tier]);
    const mood = tier === 'perfect' || tier === 'good' ? 'happy' : 'angry';
    c.mood = mood;
    c.chars.forEach((ch) => { ch.setMood(mood); if (tier === 'perfect') ch.hop(); });
    ({ perfect: () => this.sfx.ding(), good: () => this.sfx.ok(), meh: () => this.sfx.buzz(), fail: () => this.sfx.buzz() })[tier]();
    if (c.arch === 'streamer') for (let i = 0; i < 7; i++) setTimeout(() => this.ui.danmaku(pick(tier === 'perfect' || tier === 'good' ? DANMAKU.good : DANMAKU.bad)), i * 160);

    const allDone = c.items.every((i) => i.done);
    if (!allDone) { c.patience = Math.min(c.maxP, c.patience + c.maxP * 0.25); this.ui.renderTicket(c, this.hints); this.checkFired(); return; }
    d.served++; this.save.total++;
    this.ui.renderTicket(c, this.hints);
    c.state = 'done'; c.doneT = 1.0;
    if (c.arch === 'manager') {
      if (tier === 'perfect') { this.save.money += 30; d.tips += 30; this.star(0.4); setTimeout(() => { this.ui.toast('他摘下墨镜：“我是区域经理。标准出品，奖励 ¥30。”', 'success'); this.sfx.fanfare(); }, 500); }
      else { this.fine(20); this.star(-0.3, true); setTimeout(() => this.ui.toast('他摘下墨镜：“我是区域经理。出品不达标，罚款 ¥20。”', 'error'), 500); }
    }
    if (c.arch === 'haggler' && tier !== 'fail') this.haggle(c, item);
    this.checkFired();
  }

  haggle(c, item) {
    this.paused = true;
    const done = (msg, type) => { this.paused = false; this.ui.toast(msg, type); };
    setTimeout(() => this.ui.choice({
      title: '砍价阿姨',
      text: `“${item.price} 块？太贵了吧！抹个零，${item.price - 1} 块行不行？我天天来的呀！”`,
      options: [
        { label: '坚持原价：“阿姨，系统改不了价。”', fn: () => { if (Math.random() < 0.5) { this.star(-0.12, true); done('阿姨嘟囔着走了，顺手给了个三星', 'error'); } else done('阿姨：“行吧行吧，小伙子挺有原则。”'); } },
        { label: '给她抹零（差的 ¥1 你自己垫）', fn: () => { this.save.money -= 1; this.d.fines += 1; this.star(0.1); done('阿姨逢人就夸你会做生意，评分上涨', 'success'); } },
        { label: '转移话题：“阿姨您今天气色真好！”', fn: () => { if (Math.random() < 0.6) { this.save.money += 2; this.d.tips += 2; this.sfx.coin(); done('阿姨心花怒放，原价付款还多给了 ¥2', 'success'); } else { this.star(-0.06, true); done('阿姨：“少来这套。”', 'error'); } } },
      ],
    }), 500);
  }

  fine(n) { this.d.fines += n; this.save.money -= n; }

  // —— 操作台 ——
  press(id) {
    if (this.state !== 'play' || this.paused) return;
    this.sfx.init();
    const st = this.S[id];
    if (!st || !st.unlocked) return;
    st.bump = 1;
    const t = st.type;
    if (t === 'cup' || t === 'cone') this.newCup(t, st);
    else if (t === 'ing') this.addIng(st.ing, st);
    else if (t === 'fruit') this.placeFruit(st);
    else if (t === 'board') this.hit();
    else if (t === 'softserve') this.startCream();
    else if (t === 'sealer') this.seal();
    else if (t === 'shaker') this.shake();
    else if (t === 'trash') this.trash();
    else if (t === 'stash') this.swapStash();
  }

  newCup(type, st) {
    if (this.busy) return;
    if (this.cup) { this.ui.toast('操作台上已经有一杯了，先出餐或倒掉' + (this.save.ups.stash ? '，或放到暂存位' : '')); return; }
    const cup = { container: type, ing: {}, seq: [], sealed: false, shaken: false, creamAmt: 0, vis: new DrinkVisual(), target: this.S.mat.spot };
    cup.vis.set(cup);
    cup.vis.group.position.copy(st.group.position).add(V(0, 0.25, 0));
    this.world.scene.add(cup.vis.group);
    this.cup = cup;
    this.sfx.pop();
    this.refreshCup();
  }

  canAdd(silent) {
    const cup = this.cup, say = (m) => { if (!silent) this.ui.toast(m); return false; };
    if (this.busy) return false;
    if (!cup) return say('先拿一个杯子');
    if (cup.container === 'cone') return say('甜筒里只能打冰淇淋');
    if (cup.sealed) return say('已经封口了，加不进去了');
    if (Object.values(cup.ing).reduce((a, b) => a + b, 0) >= 12) return say('杯子满了，再加就溢出来了');
    return true;
  }

  addIng(k, st, from) {
    if (!this.canAdd()) return;
    const cup = this.cup, d = ING[k];
    cup.ing[k] = (cup.ing[k] || 0) + 1;
    cup.seq.push(k);
    if (d.kind === 'liquid') this.sfx.pour(); else if (d.kind === 'syrup') this.sfx.pump(); else if (d.kind === 'ice') this.sfx.ice(); else this.sfx.plop();
    if (st && st.head) this.fx.tween(0.22, (x) => { st.head.position.y = 0.3 - Math.sin(x * Math.PI) * 0.06; });
    const src = from || st.group.position.clone().add(V(0, d.kind === 'syrup' ? 0.4 : d.kind === 'liquid' ? 0.1 : 0.2, d.kind === 'liquid' ? 0.22 : 0.05));
    this.fx.blobs(src, () => cup.vis.group.position.clone().add(V(0, 0.3, 0)), d.color, d.kind === 'liquid' ? 5 : 3, () => { if (!cup.gone) cup.vis.set(cup); }, d.kind === 'liquid' ? 0.035 : 0.026);
    this.refreshCup();
  }

  placeFruit(st) {
    if (this.boardFruit) { this.ui.toast('案板上已经有水果了，先捶完它'); return; }
    if (!this.canAdd()) return;
    const b = this.S.board;
    this.boardFruit = { kind: st.ing, hits: 0 };
    for (const k in b.fruitMeshes) b.fruitMeshes[k].visible = k === st.ing;
    b.fruit.scale.set(0.2, 0.2, 0.2);
    this.fx.tween(0.18, (k) => b.fruit.scale.setScalar(0.2 + 0.8 * k));
    this.sfx.pop();
  }

  clearBoard() {
    this.boardFruit = null;
    const b = this.S.board;
    for (const k in b.fruitMeshes) b.fruitMeshes[k].visible = false;
    b.fruit.scale.set(1, 1, 1);
  }

  hit() {
    const f = this.boardFruit, b = this.S.board;
    if (!f) { this.ui.toast('先点柠檬或鲜橙，把水果放到案板上'); return; }
    const need = hitsNeeded(this.save.ups);
    this.fx.tween(0.2, (k) => { b.mallet.rotation.z = k < 0.45 ? b.malletRest + (1.25 - b.malletRest) * (k / 0.45) : 1.25 + (b.malletRest - 1.25) * ((k - 0.45) / 0.55); });
    f.hits = Math.min(need, f.hits + 1);
    const sq = f.hits / need;
    b.fruit.scale.set(1 + sq * 0.35, 1 - sq * 0.55, 1 + sq * 0.35);
    const pos = b.group.position.clone().add(V(-0.03, 0.12, 0));
    this.fx.burst(pos, ING[f.kind].color, 9, 1.1);
    this.sfx.smash();
    if (f.hits >= need) {
      if (!this.canAdd()) return;
      const kind = f.kind;
      this.clearBoard();
      this.addIng(kind, null, pos);
    }
  }

  startCream() {
    const cup = this.cup;
    if (this.busy) return;
    if (!cup) { this.ui.toast('先拿一个杯子或甜筒'); return; }
    if (cup.sealed) { this.ui.toast('已经封口了'); return; }
    if (cup.ing.iceCream) { this.ui.toast('已经打过冰淇淋了'); return; }
    this.busy = 'cream';
    this.hold = { amt: 0, started: false, tick: 0 };
    cup.target = this.S.softserve.spot;
  }

  updateHold(dt) {
    const h = this.hold, cup = this.cup;
    if (!h || !cup) return;
    const lever = this.S.softserve.lever;
    if (!h.started) {
      if (cup.vis.group.position.distanceTo(cup.target) > 0.03) return;
      h.started = true; cup.vis.beginCream(0);
    }
    lever.rotation.x += (0.7 - lever.rotation.x) * Math.min(1, dt * 15);
    h.amt += dt / 1.7;
    h.tick -= dt;
    if (h.tick <= 0) { h.tick = 0.08; this.sfx.cream(h.amt); }
    cup.vis.setCream(h.amt);
    const tall = cup.container === 'cone' && this.customers.some((c) => c.state === 'wait' && c.items.some((i) => !i.done && i.tall));
    h.tall = tall;
    this.ui.gauge(this.world.project(V(cup.target.x, cup.target.y + 0.5, cup.target.z)), h.amt, creamZone(this.save.ups), tall);
    if (h.amt >= 1.1) {
      this.sfx.splat();
      this.fx.burst(cup.vis.group.position.clone().add(V(0, 0.5, 0)), 0xfff7e4, 22, 1.5, 0.035);
      this.ui.toast('打过头，冰淇淋塌了！这一份报废', 'error');
      this.fine(1);
      this.endHold();
      this.destroyCup(cup); this.cup = null; this.refreshCup();
    }
  }

  endHold() { this.hold = null; this.busy = null; this.ui.gauge(null); this.S.softserve.lever.rotation.x = 0; }

  releaseHold() {
    const h = this.hold, cup = this.cup;
    if (!h) return;
    this.endHold();
    if (!cup) return;
    cup.target = this.S.mat.spot;
    if (!h.started || h.amt < 0.08) { cup.vis.set(cup); this.ui.toast('要按住冰淇淋机不放，看着量表松手'); return; }
    cup.ing.iceCream = 1; cup.seq.push('iceCream'); cup.creamAmt = h.amt;
    const z = h.tall ? [0.84, 1.1] : creamZone(this.save.ups);
    const p = this.world.project(cup.vis.group.position.clone().add(V(0, 0.75, 0)));
    if (h.amt < z[0]) { this.ui.float(h.tall ? '不够高' : '有点抠门', 'bad', p); this.sfx.pop(); }
    else if (h.amt > z[1]) { this.ui.float('打多了，老板心疼', 'info', p); this.sfx.pop(); }
    else { this.ui.float('漂亮的螺旋', 'good', p); this.sfx.ok(); }
    this.refreshCup();
  }

  seal() {
    const cup = this.cup, st = this.S.sealer;
    if (this.busy) return;
    if (!cup) { this.ui.toast('没有可以封口的杯子'); return; }
    if (cup.container === 'cone') { this.ui.toast('甜筒封什么口……'); return; }
    if (cup.sealed) { this.ui.toast('已经封过口了'); return; }
    this.busy = 'seal';
    cup.target = st.spot;
    this.fx.tween(0.3, () => {}, () => {
      this.sfx.seal();
      this.fx.tween(0.45, (k) => { st.head.position.y = 0.64 - Math.sin(k * Math.PI) * 0.035; }, () => {
        cup.sealed = true;
        if (!cup.gone) cup.vis.set(cup);
        cup.target = this.S.mat.spot;
        this.busy = null;
        this.refreshCup();
      });
    });
  }

  shake() {
    const cup = this.cup, st = this.S.shaker;
    if (this.busy) return;
    if (!cup || cup.container === 'cone') { this.ui.toast('没有可以摇的杯子'); return; }
    if (cup.shaken) { this.ui.toast('已经摇匀了'); return; }
    if (!cup.sealed) {
      this.ui.toast('没封口就摇，洒了一身！这杯报废', 'error');
      this.fx.burst(cup.vis.group.position.clone().add(V(0, 0.3, 0)), cup.vis.mainColor(cup).getHex(), 24, 1.8, 0.03);
      this.sfx.splat(); this.fine(1);
      this.destroyCup(cup); this.cup = null; this.refreshCup();
      return;
    }
    this.busy = 'shake';
    cup.target = st.spot;
    this.fx.tween(0.3, () => {}, () => {
      this.sfx.shake();
      const inner = cup.vis.inner;
      this.fx.tween(0.95, (k) => { inner.rotation.z = Math.sin(k * 40) * 0.24 * (1 - k * 0.3); inner.position.y = Math.abs(Math.sin(k * 40)) * 0.04; st.arm.position.y = 0.5 + Math.abs(Math.sin(k * 40)) * 0.03; }, () => {
        inner.rotation.z = 0; inner.position.y = 0; st.arm.position.y = 0.5;
        cup.shaken = true;
        if (!cup.gone) cup.vis.set(cup);
        cup.target = this.S.mat.spot;
        this.busy = null;
        this.refreshCup();
      });
    });
  }

  trash() {
    const cup = this.cup;
    if (this.state !== 'play' || this.paused || this.busy) return;
    if (!cup) { this.ui.toast('手上没有东西可倒'); return; }
    this.cup = null; cup.gone = true;
    if (cup.seq.length) { this.fine(1); this.ui.float('浪费物料 -¥1', 'bad', this.world.project(cup.vis.group.position.clone().add(V(0, 0.5, 0)))); }
    const from = cup.vis.group.position.clone(), to = this.S.trash.pos;
    cup.target = to;
    this.fx.tween(0.3, (k) => { cup.vis.group.position.lerpVectors(from, to, k); cup.vis.group.position.y += Math.sin(k * Math.PI) * 0.3; cup.vis.group.scale.setScalar(1 - k * 0.7); }, () => this.destroyCup(cup, true));
    this.sfx.plop();
    this.refreshCup();
  }

  swapStash() {
    if (this.busy) return;
    if (!this.cup && !this.stash) { this.ui.toast('暂存位是空的'); return; }
    [this.cup, this.stash] = [this.stash, this.cup];
    if (this.cup) this.cup.target = this.S.mat.spot;
    if (this.stash) this.stash.target = this.S.stash.spot;
    this.sfx.pop();
    this.refreshCup();
  }

  destroyCup(cup) {
    cup.gone = true;
    this.world.scene.remove(cup.vis.group);
    cup.vis.dispose();
  }

  refreshCup() { this.ui.cupInfo(this.cup, this.stash, () => this.trash()); }

  // —— 师傅带教：把下一步该点的设备标蓝 ——
  updateHints() {
    const needs = {};
    let target = null;
    if (this.hints && !this.busy) {
      const cup = this.cup;
      const cands = [];
      for (const c of [...this.customers].sort((a, b) => a.order - b.order)) if (c.state === 'wait') for (const it of c.items) if (!it.done) cands.push([c, it]);
      const fits = (it) => cup.container === it.container && Object.keys(cup.ing).every((k) => cup.ing[k] <= (it.need[k] || 0)) && (!cup.sealed || it.seal) && (!cup.shaken || it.shake);
      let sel = cands[0];
      if (cup && cands.length) sel = cands.find(([, it]) => fits(it)) || null;
      if (sel) {
        const [c, it] = sel;
        if (it.revealed) {
          target = c;
          if (!cup) needs[it.container] = 1;
          else {
            let remaining = 0;
            for (const k in it.need) {
              const dlt = it.need[k] - (cup.ing[k] || 0);
              if (dlt <= 0) continue;
              remaining += dlt;
              if (k === 'iceCream') needs.softserve = 1;
              else if (ING[k].kind === 'fruit') { if (this.boardFruit && this.boardFruit.kind === k) needs.board = 1; else needs[k] = dlt; }
              else needs[k] = dlt;
            }
            if (!remaining) { if (it.seal && !cup.sealed) needs.sealer = 1; else if (it.shake && !cup.shaken) needs.shaker = 1; }
          }
        }
      } else if (cup && cands.length) needs.trash = 1;
    }
    for (const st of this.stations) this.ui.setNeed(st, needs[st.id] || 0);
    for (const c of this.customers) if (c.ticket) c.ticket.classList.toggle('target', c === target);
  }

  toggleHints() { this.hints = !this.hints; this.syncButtons(); for (const c of this.customers) if (c.ticket) this.ui.renderTicket(c, this.hints); }
  toggleRecipes() { this.recipesOpen = !this.recipesOpen; this.ui.recipes(this.save.day, this.recipesOpen); }
  serveSlot(i) { const c = this.slots[i]; if (c) this.serve(c); }

  // —— 打烊 ——
  endDay() {
    const d = this.d, day = this.save.day, target = kpiTarget(day);
    this.state = 'summary';
    const bonus = d.revenue >= target ? 30 : -15;
    this.save.money += WAGE + bonus;
    const net = WAGE + d.tips + bonus - d.fines;
    const boss = pick(d.revenue >= target * 1.3 ? BOSS.great : d.revenue >= target ? BOSS.ok : BOSS.bad);
    const data = { day, served: d.served, perfect: d.perfect, lost: d.lost, revenue: d.revenue, target, wage: WAGE, tips: d.tips, bonus, fines: d.fines, net, stars: this.save.stars, boss, met: [...d.met].filter((k) => k !== 'normal').map((k) => ARCH[k].name) };
    this.save.day++;
    this.persist();
    this.clearAll();
    this.ui.showHud(false);
    if (this.recipesOpen) this.toggleRecipes();
    this.sfx.fanfare();
    this.ui.summary(data, () => this.ui.shop(this.save, (id) => this.buy(id), () => { this.persist(); this.intro(); }));
  }

  buy(id) {
    const u = UPGRADES.find((x) => x.id === id), lv = this.save.ups[id] || 0;
    if (!u || lv >= u.cost.length || this.save.money < u.cost[lv]) return;
    this.save.money -= u.cost[lv];
    this.save.ups[id] = lv + 1;
    this.sfx.coin();
    this.persist();
  }
}

export { money };
