// 游戏数据：原料、配方、顾客类型、升级、台词

export const ING = {
  blackTea: { name: '红茶', color: 0x9a4a1c, kind: 'liquid', units: 1 },
  greenTea: { name: '绿茶', color: 0xd3cf62, kind: 'liquid', units: 1 },
  milk: { name: '牛奶', color: 0xfbf4e4, kind: 'liquid', units: 1 },
  water: { name: '冰水', color: 0xc4e6f6, kind: 'liquid', units: 1 },
  sugar: { name: '糖浆', color: 0xf0cf7a, kind: 'syrup', units: 0.3 },
  peach: { name: '蜜桃酱', color: 0xff9d85, kind: 'syrup', units: 0.5 },
  strawberry: { name: '草莓酱', color: 0xe9415f, kind: 'syrup', units: 0.5 },
  passion: { name: '百香果酱', color: 0xf4a81c, kind: 'syrup', units: 0.5 },
  brownSugar: { name: '黑糖', color: 0x4d2710, kind: 'syrup', units: 0.4 },
  pearl: { name: '珍珠', color: 0x2b1a12, kind: 'topping', units: 0.7 },
  coconut: { name: '椰果', color: 0xf3f1e2, kind: 'topping', units: 0.7 },
  ice: { name: '冰块', color: 0xd9f2ff, kind: 'ice', units: 0.45 },
  lemon: { name: '暴打柠檬', color: 0xf8dc30, kind: 'fruit', units: 0.5 },
  orange: { name: '棒打鲜橙', color: 0xf7901f, kind: 'fruit', units: 0.5 },
  iceCream: { name: '冰淇淋', color: 0xfff5dc, kind: 'iceCream', units: 1.2 },
};

export const SUGAR = ['无糖', '半糖', '全糖'];
export const ICE = ['去冰', '少冰', '正常冰'];

export const RECIPES = {
  lemonade: { name: '冰鲜柠檬水', price: 4, day: 1, container: 'cup', need: { lemon: 1, water: 2 }, sugar: true, ice: true, seal: true, riddle: '黄色的、酸酸的、挨过打的那个' },
  cone: { name: '新鲜冰淇淋', price: 2, day: 1, container: 'cone', need: { iceCream: 1 }, riddle: '能举着走、慢了会哭的那个' },
  pearlMilkTea: { name: '珍珠奶茶', price: 6, day: 1, container: 'cup', need: { blackTea: 1, milk: 1, pearl: 1 }, sugar: true, ice: true, seal: true, riddle: '里面有黑色小球球的那个' },
  iceCreamTea: { name: '冰淇淋红茶', price: 5, day: 2, container: 'cup', need: { blackTea: 2, iceCream: 1 }, sugar: true, ice: true, seal: false, riddle: '红色的水，顶个白帽子' },
  coconutMilkTea: { name: '椰果奶茶', price: 6, day: 2, container: 'cup', need: { blackTea: 1, milk: 1, coconut: 1 }, sugar: true, ice: true, seal: true, riddle: '奶茶，但是里面是小方块' },
  peachTea: { name: '蜜桃四季春', price: 7, day: 3, container: 'cup', need: { greenTea: 2, peach: 1 }, sugar: true, ice: true, seal: true, riddle: '粉粉的、喝着像春天' },
  orangeTea: { name: '棒打鲜橙', price: 6, day: 3, container: 'cup', need: { orange: 1, greenTea: 2 }, sugar: true, ice: true, seal: true, riddle: '橙色的、也挨过打的那个' },
  strawShake: { name: '草莓摇摇奶昔', price: 6, day: 4, container: 'cup', need: { milk: 1, iceCream: 1, strawberry: 1 }, seal: true, shake: true, riddle: '粉色的、要使劲晃的那个' },
  sundae: { name: '黑糖珍珠圣代', price: 6, day: 4, container: 'cup', need: { iceCream: 1, pearl: 1, brownSugar: 1 }, seal: false, riddle: '用勺子挖着吃的、黑白配' },
  passion: { name: '满杯百香果', price: 7, day: 5, container: 'cup', need: { passion: 1, greenTea: 2, coconut: 1 }, sugar: true, ice: true, seal: true, riddle: '满满一杯、全是籽的那个' },
};

// 顾客类型。p: 耐心倍率；tip: 小费倍率；w: 出现权重；day: 最早出现的天数
export const ARCH = {
  normal: {
    name: '普通顾客', day: 1, w: 10, p: 1, tip: 1, desc: '点单、等待、拿走，人间清醒。',
    order: ['你好，来一杯这个。', '老样子，谢谢。', '麻烦快一点点哈。', '就这个吧。', '听说你们家便宜又好喝。'],
  },
  rush: {
    name: '急急国王', day: 1, w: 3, p: 0.5, tip: 3, desc: '耐心只有别人的一半，但小费给得多。',
    order: ['快快快！地铁还有三分钟！', '我赶时间！做快点！', '十秒钟能好吗？九秒？', '急急急急急！'],
  },
  kid: {
    name: '小学生', day: 1, w: 3, p: 1.1, tip: 0, desc: '只买甜筒，而且要打得最高的。',
    order: ['阿姨/叔叔！我要最高最高的冰淇淋！', '我攒了一个星期零花钱！要打高高的！', '要比我同桌那个还高！'],
  },
  riddler: {
    name: '谜语人', day: 2, w: 3, p: 1.1, tip: 1.5, desc: '从不说饮品名字，全靠你猜。',
    order: ['我要那个……', '就那个嘛，你懂的。', '名字我忘了，但我会形容。'],
  },
  sweet: {
    name: '甜度狂魔', day: 2, w: 2, p: 1, tip: 1.5, desc: '全糖之后再加三泵糖。',
    order: ['全糖！再加三泵！生活已经够苦了。', '糖给我往死里加。', '甜到我牙疼为止。'],
  },
  changer: {
    name: '改单王', day: 3, w: 3, p: 1.25, tip: 1, desc: '做到一半必定改主意。',
    order: ['嗯……先来这个吧。', '就这个……应该吧。', '我想想……那就这个。'],
  },
  fitness: {
    name: '健身教练', day: 3, w: 2, p: 1, tip: 2, desc: '无糖去冰，多一滴糖都尝得出来。',
    order: ['无糖，去冰。多一滴糖我都尝得出来。', '今天练腿，不能有糖。', '我体脂 8%，你看着办。'],
  },
  couple: {
    name: '热恋情侣', day: 3, w: 2, p: 1.5, tip: 1.5, desc: '一次要两杯，还要你夸他们般配。',
    order: ['两杯～宝宝你喝哪个？', '我们要两杯，一人一杯。', '亲爱的想喝的我都要。'],
  },
  streamer: {
    name: '探店主播', day: 4, w: 2, p: 1, tip: 2, desc: '全程直播，评分影响是普通顾客的三倍。',
    order: ['家人们！今天探店！看看这家手艺行不行！', '直播间的宝子们看好了，现场点单！', '老铁们，四块钱的柠檬水到底值不值！'],
  },
  haggler: {
    name: '砍价阿姨', day: 4, w: 2, p: 1.2, tip: 0, desc: '拿到手之后才开始讲价。',
    order: ['小伙子，来一杯。待会儿再说价钱。', '我是老顾客了哦。', '你们这儿办卡不？先来一杯。'],
  },
  shy: {
    name: '社恐青年', day: 5, w: 2, p: 1.1, tip: 2, desc: '声音小到听不清，追问会让他更紧张。',
    order: ['那、那个……', '（小声）……要一杯……', '……（指了指菜单又缩回去）'],
  },
  rider: {
    name: '外卖骑手', day: 5, w: 2, p: 2.1, tip: 1, desc: '一单三杯，超时他也要被扣钱。',
    order: ['尾号 438 的外卖，三杯！', '兄弟快点，我要超时了！', '三杯的那单，出好了没？'],
  },
  manager: {
    name: '神秘墨镜男', day: 5, w: 1, p: 1, tip: 0, desc: '其实是微服私访的区域经理，只认标准出品。',
    order: ['按标准流程做一杯。', '我就看看，你正常做。', '……（默默掏出一个小本本）'],
  },
};

export const LINES = {
  perfect: ['就是这个味！', '好喝，下次还来！', '手艺可以啊！', '完美，给你点赞。', '比我自己做的强多了。'],
  good: ['还行吧。', '凑合能喝。', '嗯……差不多。', '可以，没毛病。'],
  meh: ['这味道有点怪……', '你是不是做错了？', '算了算了，不跟你计较。', '下次认真点。'],
  fail: ['这是什么东西？！退钱！', '我要投诉你！', '你是新来的吧？', '差评！必须差评！'],
  leave: ['等不了了，走了！', '什么效率啊！', '不买了不买了。', '隔壁那家都出三杯了。'],
  change: ['等等！我换成', '啊不对，我其实想喝', '算了算了，改成'],
  shyAsk: ['啊……对不起……', '（声音更小了）', '……当我没说'],
  riddleAsk: ['这都猜不到？行吧我直说。', '唉，你们年轻人。', '我说得还不够明白吗？'],
};

export const DANMAKU = {
  idle: ['主播今天喝啥', '这家我也去过', '店员好紧张哈哈哈', '四块钱还要啥自行车', '前排围观', '店员手速可以啊', '别抖了店员', '点个关注不迷路', '打工人打工魂', '这冰淇淋机我也想要'],
  good: ['666666', '店员有东西的', '这杯看着就好喝', '加鸡腿！', '已下单同款', '打工人天花板'],
  bad: ['翻车了哈哈哈哈', '退钱！', '这也能做错？', '节目效果拉满', '店员：我不干了', '避雷避雷'],
};

export const BOSS = {
  great: ['不错，今天没有白给你发工资。', '可以，再接再厉，年底给你评优秀员工（没有奖金）。', '看来柠檬没白捶。'],
  ok: ['还行吧，明天手脚再麻利点。', '营业额刚够，别骄傲。', '凑合。记得把地拖了再走。'],
  bad: ['营业额没达标，今天的全勤奖没了。', '你知道隔壁店一天卖多少杯吗？', '再这样下去，我只能让你去门口穿玩偶服了。'],
};

export const UPGRADES = [
  { id: 'speaker', name: '店内小音箱', desc: '循环播放洗脑神曲，顾客耐心 +15%／级。', cost: [60, 120, 200] },
  { id: 'nozzle', name: '防抖冰淇淋手柄', desc: '冰淇淋的完美区间变宽。', cost: [80, 160] },
  { id: 'cat', name: '招财猫', desc: '放在收银台上，小费 +50%／级。', cost: [70, 150] },
  { id: 'mallet', name: '加重雪克锤', desc: '捶水果只需 2 下（原本 3 下）。', cost: [60] },
  { id: 'stash', name: '暂存杯架', desc: '多一个杯位，可以两杯同时开工。', cost: [90] },
  { id: 'smile', name: '营业式微笑培训', desc: '出品翻车时，评分少扣一半。', cost: [120] },
];

export const DAY_LEN = 150; // 每天营业秒数
export const kpiTarget = (day) => Math.round(34 + 13 * (day - 1));
export const hitsNeeded = (ups) => (ups.mallet ? 2 : 3);
export const creamZone = (ups) => [[0.58, 0.86], [0.52, 0.9], [0.46, 0.94]][ups.nozzle || 0];

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const rand = (a, b) => a + Math.random() * (b - a);

export function availableRecipes(day) {
  return Object.keys(RECIPES).filter((k) => RECIPES[k].day <= day);
}

export function makeItem(id, o = {}) {
  const r = RECIPES[id];
  const need = { ...r.need };
  let sugar = null, ice = null;
  if (r.sugar) { sugar = o.sugar ?? pick([2, 2, 2, 1, 1, 0]); if (sugar > 0) need.sugar = sugar; }
  if (r.ice) { ice = o.ice ?? pick([2, 2, 2, 1, 0]); if (ice > 0) need.ice = ice; }
  return { id, name: r.name, price: r.price, need, sugar, ice, seal: !!r.seal, shake: !!r.shake, container: r.container, tall: !!o.tall, done: false, revealed: true };
}

// 评分：把手里的杯子和订单比对
export function evaluate(cup, item, zone) {
  if (!cup) return { score: 0, notes: ['空手'] };
  if (cup.container !== item.container) return { score: 0, notes: [item.container === 'cone' ? '人家要的是甜筒' : '人家要的是杯装'] };
  let score = 100;
  const notes = [];
  const keys = new Set([...Object.keys(item.need), ...Object.keys(cup.ing)]);
  for (const k of keys) {
    const req = item.need[k] || 0, act = cup.ing[k] || 0;
    if (req === act) continue;
    const n = ING[k].name;
    if (req === 0) { score -= 15; notes.push('多加了' + n); }
    else if (act === 0) { score -= k === 'sugar' || k === 'ice' ? 12 : 25; notes.push('没加' + n); }
    else { score -= Math.min(20, 8 * Math.abs(req - act)); notes.push(n + (act > req ? '多了' : '少了')); }
  }
  if (item.container === 'cup') {
    if (item.seal && !cup.sealed) { score -= 15; notes.push('没封口'); }
    if (!item.seal && cup.sealed) { score -= 8; notes.push('不该封口'); }
    if (item.shake && !cup.shaken) { score -= 15; notes.push('没摇匀'); }
  }
  if (item.need.iceCream && cup.ing.iceCream) {
    const a = cup.creamAmt;
    if (item.tall) { if (a < 0.84) { score -= 20; notes.push('冰淇淋不够高'); } }
    else if (a < zone[0]) { score -= 12; notes.push('冰淇淋太少'); }
    else if (a > zone[1]) { score -= 5; notes.push('冰淇淋打多了'); }
  }
  return { score: Math.max(0, score), notes };
}

export function describeNeed(item) {
  const parts = [];
  for (const k in item.need) { if (k !== 'sugar' && k !== 'ice') parts.push(ING[k].name + (item.need[k] > 1 ? '×' + item.need[k] : '')); }
  if (item.container === 'cup') { if (item.seal) parts.push('封口'); if (item.shake) parts.push('摇匀'); }
  return parts.join(' · ');
}
