// 界面层：顶栏、设备标签、顾客小票、飘字、弹幕、各类面板
import { ING, RECIPES, SUGAR, ICE, UPGRADES, ARCH, describeNeed, availableRecipes } from './data.js';
import { hex } from './h.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const money = (n) => (n < 0 ? '-¥' : '¥') + (Math.abs(n) % 1 ? Math.abs(n).toFixed(1) : Math.abs(n));

export class UI {
  constructor() {
    this.labels = $('labels'); this.tickets = $('tickets'); this.floats = $('floats'); this.dm = $('danmaku');
    this.screen = $('screen'); this.hudEl = $('hud'); this.liveEl = null; this.dmRow = 0;
  }

  showHud(on) { this.hudEl.hidden = !on; this.labels.style.display = on ? '' : 'none'; this.tickets.style.display = on ? '' : 'none'; }

  place(e, p, anchor = 'center') {
    if (!p.ok) { e.style.visibility = 'hidden'; return; }
    e.style.visibility = '';
    let x = p.x, y = p.y;
    if (anchor === 'bottom') {
      // 小票不要顶出屏幕，也不要压住顶栏
      const w = e.offsetWidth / 2 + 8;
      y = Math.max(y, e.offsetHeight + 64);
      x = Math.max(w, Math.min(window.innerWidth - w, x));
    }
    e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${anchor === 'bottom' ? '-100%' : '-50%'})`;
  }

  // —— 设备标签 ——
  addLabel(st, onDown) {
    const b = el('button', 'slabel');
    b.innerHTML = `<span>${st.label}</span>` + (st.key ? `<span class="n" style="background:var(--fill);color:var(--text-3)">${st.key}</span>` : '');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onDown(st); });
    this.labels.appendChild(b);
    st.el = b; st.needN = 0;
    return b;
  }

  setNeed(st, n) {
    if (!st.el || st.needN === n) return;
    st.needN = n;
    st.el.classList.toggle('need', n > 0);
    let badge = st.el.querySelector('.cnt');
    if (n > 1) { if (!badge) { badge = el('span', 'n cnt'); st.el.appendChild(badge); } badge.textContent = '×' + n; }
    else if (badge) badge.remove();
  }

  // —— 顶栏 ——
  hud(s) {
    $('h-day').textContent = `第 ${s.day} 天` + (s.closing ? ' · 打烊中' : '');
    $('h-clock').textContent = s.clock;
    $('h-rev').textContent = money(s.revenue);
    $('h-target').textContent = ' / ' + money(s.target);
    const kb = $('h-kpibar'); kb.style.width = Math.min(100, (s.revenue / s.target) * 100) + '%'; kb.className = s.revenue >= s.target ? 'ok' : '';
    $('h-money').textContent = money(s.money);
    $('h-stars').textContent = s.stars.toFixed(1) + ' / 5';
    const sb = $('h-starbar'); sb.style.width = (s.stars / 5) * 100 + '%'; sb.className = s.stars < 1.5 ? 'bad' : s.stars < 2.8 ? 'warn' : 'ok';
    $('h-queue').textContent = s.queue + ' 人';
    const c = $('h-combo');
    c.classList.toggle('on', s.combo >= 2);
    if (s.combo >= 2) c.textContent = `连续完美 ×${s.combo}`;
  }

  cupInfo(cup, stash, onTrash) {
    const box = $('cupinfo');
    const chips = (c) => {
      if (!c) return '';
      let h = '';
      for (const k in c.ing) h += `<span class="tag"><i style="background:${hex(ING[k].color)}"></i>${ING[k].name}${c.ing[k] > 1 ? ' ×' + c.ing[k] : ''}</span>`;
      if (c.sealed) h += '<span class="tag on">已封口</span>';
      if (c.shaken) h += '<span class="tag on">已摇匀</span>';
      return h || '<span class="hint">空的</span>';
    };
    if (!cup) { box.innerHTML = `<span class="t">操作台</span><span class="hint">空着 —— 先拿一个杯子或甜筒</span>` + (stash ? `<span class="tag">暂存位有 1 杯</span>` : ''); return; }
    box.innerHTML = `<span class="t">${cup.container === 'cone' ? '甜筒' : '这一杯'}</span>${chips(cup)}` + (stash ? `<span class="tag">暂存位有 1 杯</span>` : '') + `<button class="btn btn-sm" id="b-trash">倒掉</button>`;
    $('b-trash').onclick = onTrash;
  }

  // —— 小票 ——
  addTicket(cust, onServe, onAsk) {
    const t = el('div', 'ticket');
    t.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.target.closest('.ask')) onAsk(cust); else onServe(cust);
    });
    this.tickets.appendChild(t);
    cust.ticket = t;
    return t;
  }

  renderTicket(cust, hints) {
    const t = cust.ticket; if (!t) return;
    const a = ARCH[cust.arch];
    let h = `<div class="who"><span>${cust.disguise || a.name}</span><span class="key">${cust.slot + 1}</span></div>`;
    if (cust.say) h += `<div class="say">“${cust.say}”</div>`;
    for (const it of cust.items) {
      const name = it.revealed ? it.name : it.mask;
      h += `<div class="item${it.done ? ' done' : ''}"><div class="name">${name}<span>¥${it.price}</span></div>`;
      const opts = [];
      if (it.tall) opts.push('要打得高高的');
      if (it.sugar != null) opts.push(it.need.sugar > 2 ? `糖浆 ×${it.need.sugar}` : SUGAR[it.sugar]);
      if (it.ice != null) opts.push(ICE[it.ice]);
      if (opts.length) h += `<div class="opts">${opts.map((o) => `<span class="tag">${o}</span>`).join('')}</div>`;
      if (hints && it.revealed && !it.done) {
        const extra = [];
        if (it.need.sugar) extra.push('糖浆' + (it.need.sugar > 1 ? '×' + it.need.sugar : ''));
        if (it.need.ice) extra.push('冰块' + (it.need.ice > 1 ? '×' + it.need.ice : ''));
        h += `<div class="rec">${describeNeed(it)}${extra.length ? ' · ' + extra.join(' · ') : ''}</div>`;
      }
      h += '</div>';
    }
    if (cust.items.some((i) => !i.revealed)) h += `<button class="btn btn-sm ask">追问一下（会更没耐心）</button>`;
    h += `<div class="bar"><i></i></div>`;
    t.innerHTML = h;
    cust.barEl = t.querySelector('.bar i');
  }

  setPatience(cust, k) {
    if (!cust.barEl) return;
    cust.barEl.style.width = Math.max(0, k * 100) + '%';
    const cls = k < 0.25 ? 'bad' : k < 0.5 ? 'warn' : 'ok';
    if (cust.barEl.className !== cls) cust.barEl.className = cls;
  }

  shakeTicket(cust) { const t = cust.ticket; if (!t) return; t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); }
  removeTicket(cust) { if (cust.ticket) { cust.ticket.remove(); cust.ticket = null; cust.barEl = null; } }

  // —— 提示 ——
  toast(text, type = '') {
    const host = $('toasts');
    const t = el('div', 'toast' + (type ? ' toast-' + type : ''), text);
    host.appendChild(t);
    while (host.children.length > 3) host.firstChild.remove();
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 2200);
  }

  float(text, cls, p, dy = 0) {
    if (!p.ok) return;
    const f = el('div', 'float ' + cls, text);
    f.style.left = p.x + 'px'; f.style.top = p.y + dy + 'px';
    this.floats.appendChild(f);
    setTimeout(() => f.remove(), 1650);
  }

  danmaku(text) {
    const d = el('div', 'dm', text);
    this.dmRow = (this.dmRow + 1 + Math.floor(Math.random() * 2)) % 6;
    d.style.top = 130 + this.dmRow * 30 + 'px';
    this.dm.appendChild(d);
    setTimeout(() => d.remove(), 7200);
  }

  live(n) {
    if (n == null) { if (this.liveEl) { this.liveEl.remove(); this.liveEl = null; } return; }
    if (!this.liveEl) { this.liveEl = el('div', 'live'); this.dm.appendChild(this.liveEl); }
    this.liveEl.textContent = `直播中 · ${n} 人在看`;
  }

  gauge(p, amt, zone, tall) {
    const g = $('gauge');
    if (!p) { g.hidden = true; return; }
    g.hidden = false;
    g.style.transform = `translate(${p.x + 70}px, ${p.y - 60}px) translate(-50%, -100%)`;
    const max = 1.1, hgt = 142;
    const z = tall ? [0.84, 1.06] : zone;
    const zn = $('g-zone');
    zn.style.bottom = 4 + (z[0] / max) * hgt + 'px'; zn.style.height = ((z[1] - z[0]) / max) * hgt + 'px';
    const f = $('g-fill');
    f.style.height = Math.min(1, amt / max) * hgt + 'px';
    f.className = 'fill' + (amt > 1.0 ? ' over' : amt >= z[0] && amt <= z[1] ? ' ok' : '');
  }

  recipes(day, show) {
    const box = $('recipes');
    box.hidden = !show;
    if (!show) return;
    let h = '<h3>配方表</h3>';
    for (const id of availableRecipes(day)) {
      const r = RECIPES[id];
      const it = { need: r.need, container: r.container, seal: r.seal, shake: r.shake };
      h += `<div class="r"><b>${r.name}</b><span>¥${r.price}</span><p>${r.container === 'cone' ? '甜筒 · ' : ''}${describeNeed(it)}${r.sugar ? ' · 按单加糖' : ''}${r.ice ? ' · 按单加冰' : ''}</p></div>`;
    }
    h += `<div class="tip">糖：半糖 1 泵，全糖 2 泵。冰：少冰 1 勺，正常冰 2 勺。<br>冰淇淋：按住冰淇淋机，在绿色区间松手。<br>先封口再摇，不然会洒一身。</div>`;
    box.innerHTML = h;
  }

  // —— 面板 ——
  closeScreen() { this.screen.innerHTML = ''; }

  panel(html, cls = '') {
    this.screen.innerHTML = `<div class="modal-overlay"><div class="modal panel ${cls}">${html}</div></div>`;
    return this.screen.querySelector('.panel');
  }

  title({ save, onNew, onContinue }) {
    const p = this.panel(`
      <h1>蜜雪冰城打工模拟器</h1>
      <p class="sub">今天也是为老板赚钱的一天。捶柠檬、打甜筒、摇奶昔，顺便伺候好每一位奇葩顾客。</p>
      <div class="how">
        <div><b>看小票</b>顾客头顶的小票写着要什么、几分糖、加不加冰。</div>
        <div><b>点设备</b>拿杯子 → 依次点原料 → 封口 → 点小票出餐。</div>
        <div><b>捶水果</b>点柠檬或鲜橙放上案板，再连点案板（或按空格）。</div>
        <div><b>打冰淇淋</b>按住冰淇淋机，在绿色区间松手；打过头会塌。</div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="t-new">${save ? '从第 1 天重新入职' : '开始上班'}</button>
        ${save ? `<button class="btn" id="t-cont">继续存档（第 ${save.day} 天）</button>` : ''}
      </div>
      <p class="fine">快捷键：1 / 2 / 3 给对应窗口出餐，空格捶水果，X 倒掉，Tab 配方表。<br>非官方同人小游戏，与品牌方无关；角色、吉祥物与音乐均为原创。</p>`);
    p.querySelector('#t-new').onclick = onNew;
    if (save) p.querySelector('#t-cont').onclick = onContinue;
  }

  dayIntro({ day, target, news, onGo }) {
    const p = this.panel(`
      <h2>第 ${day} 天</h2>
      <p class="sub">今日营业额目标 ${money(target)}。达标有奖金，不达标扣全勤。</p>
      ${news.length ? `<div class="quote"><b>今日新增</b><div class="newbox">${news.map((n) => `<span class="tag on">${n}</span>`).join('')}</div></div>` : ''}
      <div class="actions"><button class="btn btn-primary" id="d-go">开门营业</button></div>`);
    p.querySelector('#d-go').onclick = onGo;
  }

  summary(d, onNext) {
    const row = (k, v, cls = '') => `<div class="row"><span>${k}</span><b class="${cls}">${v}</b></div>`;
    const p = this.panel(`
      <h2>第 ${d.day} 天 · 打烊</h2>
      <p class="sub">接待 ${d.served} 位顾客，完美出品 ${d.perfect} 杯，气走 ${d.lost} 位。</p>
      <div class="rows">
        ${row('今日营业额（老板的）', `${money(d.revenue)} / ${money(d.target)}`, d.revenue >= d.target ? 'pos' : 'neg')}
        ${row('底薪', money(d.wage))}
        ${row('小费', money(d.tips), 'pos')}
        ${row(d.revenue >= d.target ? '达标奖金' : '未达标，扣全勤', money(d.bonus), d.bonus >= 0 ? 'pos' : 'neg')}
        ${d.fines ? row('罚款 / 物料浪费', money(-d.fines), 'neg') : ''}
        ${row('今日到手', money(d.net), d.net >= 0 ? 'pos' : 'neg')}
        ${row('店铺评分', d.stars.toFixed(1) + ' / 5')}
      </div>
      <div class="quote"><b>店长：</b>${d.boss}</div>
      ${d.met.length ? `<div class="quote"><b>今日奇葩图鉴</b><div class="newbox">${d.met.map((n) => `<span class="tag">${n}</span>`).join('')}</div></div>` : ''}
      <div class="actions"><button class="btn btn-primary" id="s-next">去员工小卖部</button></div>`);
    p.querySelector('#s-next').onclick = onNext;
  }

  shop(save, onBuy, onNext) {
    const render = () => {
      let h = `<h2>员工小卖部</h2><p class="sub">自掏腰包升级装备。你现在有 <b>${money(save.money)}</b>。</p><div class="ups">`;
      for (const u of UPGRADES) {
        const lv = save.ups[u.id] || 0, max = lv >= u.cost.length, cost = u.cost[lv];
        h += `<div class="up"><div class="info"><b>${u.name}</b><span class="lv">${lv} / ${u.cost.length}</span><p>${u.desc}</p></div>
          <button class="btn ${!max && save.money >= cost ? 'btn-primary' : ''}" data-id="${u.id}" ${max || save.money < cost ? 'disabled' : ''}>${max ? '已满级' : money(cost)}</button></div>`;
      }
      h += `</div><div class="actions"><button class="btn btn-primary" id="p-next">下班，明天继续</button></div>`;
      const p = this.panel(h);
      p.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { onBuy(b.dataset.id); render(); }));
      p.querySelector('#p-next').className = 'btn' + (UPGRADES.some((u) => (save.ups[u.id] || 0) < u.cost.length && save.money >= u.cost[save.ups[u.id] || 0]) ? '' : ' btn-primary');
      p.querySelector('#p-next').onclick = onNext;
    };
    render();
  }

  gameover(d, onRestart) {
    const p = this.panel(`
      <h2>你被开除了</h2>
      <p class="sub">店铺评分跌到了谷底，店长连夜把你的工牌收走了。</p>
      <div class="rows">
        <div class="row"><span>坚持了</span><b>${d.day} 天</b></div>
        <div class="row"><span>累计接待</span><b>${d.total} 位顾客</b></div>
        <div class="row"><span>攒下的钱</span><b>${money(d.money)}</b></div>
      </div>
      <div class="quote"><b>店长：</b>门口那套玩偶服你带走吧，就当离职纪念。</div>
      <div class="actions"><button class="btn btn-primary" id="g-re">重新入职</button></div>`);
    p.querySelector('#g-re').onclick = onRestart;
  }

  choice({ title, text, options }) {
    const p = this.panel(`<h2>${title}</h2><p class="sub">${text}</p><div class="actions">${options.map((o, i) => `<button class="btn" data-i="${i}">${o.label}</button>`).join('')}</div>`, 'choice');
    p.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { this.closeScreen(); options[+b.dataset.i].fn(); }));
  }
}

export { money };
