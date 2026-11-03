// 成长阶段：从小学一年级陪伴到大学
export const LEVELS = [
  { lv: 1, icon: '🌱', name: '萌芽', age: '6–8 岁', grade: '小学一二年级', desc: '用故事和游戏认识"思考"这件事' },
  { lv: 2, icon: '🌿', name: '抽枝', age: '9–10 岁', grade: '小学三四年级', desc: '掌握学习、表达、情绪的基本工具' },
  { lv: 3, icon: '🌳', name: '成林', age: '11–12 岁', grade: '小学五六年级', desc: '认识大脑的偏差，学会做决定' },
  { lv: 4, icon: '🚀', name: '启航', age: '13–15 岁', grade: '初中', desc: '逻辑、科学、系统——独立思考成形' },
  { lv: 5, icon: '🔭', name: '远望', age: '16–18 岁', grade: '高中', desc: '概率、伦理、模型——像学者一样思考' },
  { lv: 6, icon: '🌌', name: '星辰', age: '18 岁+', grade: '大学及以后', desc: '设计人生，建立自己的思维体系' },
];

// 十二颗思维星球
export const DOMAINS = [
  { id: 'mind', icon: '🌱', name: '心智基石', color: '#7C3AED', light: '#EDE9FE', desc: '相信能力可以成长，看见自己的思考' },
  { id: 'learn', icon: '📚', name: '超级学习力', color: '#0D9488', light: '#CCFBF1', desc: '学得快、记得牢的科学方法' },
  { id: 'solve', icon: '🛠️', name: '问题解决', color: '#EA580C', light: '#FFEDD5', desc: '拆解、追问、倒推，难题变简单' },
  { id: 'logic', icon: '🧐', name: '逻辑与批判', color: '#BE185D', light: '#FCE7F3', desc: '不被忽悠，分清好论证和坏论证' },
  { id: 'science', icon: '🔬', name: '科学与概率', color: '#1D4ED8', light: '#DBEAFE', desc: '用证据和数字看清真相' },
  { id: 'decide', icon: '⚖️', name: '决策与经济', color: '#B45309', light: '#FEF3C7', desc: '每个选择都有代价，学会算清楚' },
  { id: 'system', icon: '🌐', name: '系统思维', color: '#047857', light: '#D1FAE5', desc: '拉远镜头，看见整张网' },
  { id: 'create', icon: '💡', name: '创造力', color: '#CA8A04', light: '#FEF9C3', desc: '想出别人想不到的点子' },
  { id: 'heart', icon: '💗', name: '情绪与社交', color: '#E11D48', light: '#FFE4E6', desc: '管好心情，交好朋友' },
  { id: 'self', icon: '🧭', name: '自我管理', color: '#4338CA', light: '#E0E7FF', desc: '习惯、时间、目标，做自己的队长' },
  { id: 'compute', icon: '🤖', name: '计算与AI', color: '#0369A1', light: '#E0F2FE', desc: '像程序员一样思考，聪明地使用 AI' },
  { id: 'wisdom', icon: '🦉', name: '哲思与智慧', color: '#57534E', light: '#F5F5F4', desc: '思考对错、意义与人生' },
];

export const domainById = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
export const levelInfo = (lv) => LEVELS[Math.min(Math.max(lv, 1), 6) - 1];

// 经验值称号
export const RANKS = [
  { xp: 0, name: '思维小种子', icon: '🌰' },
  { xp: 100, name: '好奇探险家', icon: '🧭' },
  { xp: 300, name: '问题猎人', icon: '🏹' },
  { xp: 700, name: '逻辑侦探', icon: '🕵️' },
  { xp: 1300, name: '科学小队长', icon: '🔬' },
  { xp: 2200, name: '策略大师', icon: '♟️' },
  { xp: 3500, name: '系统建筑师', icon: '🏛️' },
  { xp: 5200, name: '智慧学者', icon: '🎓' },
  { xp: 7500, name: '思想家', icon: '🦉' },
  { xp: 10500, name: '思维宗师', icon: '🌌' },
];

export function rankFor(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i];
  const next = RANKS[i + 1] || null;
  const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { ...cur, index: i, next, pct };
}

// 由出生年份推荐阶段（按 9 月入学粗略估算）
export function suggestLevel(birthYear, now = new Date()) {
  if (!birthYear) return 1;
  const age = now.getFullYear() - birthYear - (now.getMonth() < 8 ? 1 : 0);
  if (age <= 8) return 1;
  if (age <= 10) return 2;
  if (age <= 12) return 3;
  if (age <= 15) return 4;
  if (age <= 18) return 5;
  return 6;
}
