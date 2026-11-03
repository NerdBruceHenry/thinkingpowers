// 纯逻辑：不依赖 DOM / localStorage，便于测试

// ── 日期 ──
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}
export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// ── 连续打卡 ──
export function updateStreak(streak, today) {
  const s = streak || { count: 0, last: null, best: 0 };
  if (s.last === today) return s;
  const gap = s.last ? daysBetween(s.last, today) : null;
  const count = gap === 1 ? s.count + 1 : 1;
  return { count, last: today, best: Math.max(s.best || 0, count) };
}

// ── 间隔重复（遗忘曲线）──
export const SRS_STEPS = [1, 2, 4, 7, 15, 30, 60, 120];
export function srsNext(srs, correct, today) {
  const box = srs ? srs.box : -1;
  const nb = correct ? Math.min(box + 1, SRS_STEPS.length - 1) : 0;
  return { box: nb, due: addDays(today, SRS_STEPS[nb]) };
}
export function dueCards(progress, today) {
  return Object.entries(progress)
    .filter(([, p]) => p.learned && p.srs && p.srs.due <= today)
    .sort((a, b) => (a[1].srs.due < b[1].srs.due ? -1 : 1))
    .map(([id]) => id);
}

// ── 可见性：当前阶段 +1 以内可以学习 ──
export const canOpen = (card, level) => card.lv <= level + 1;

// ── 推荐下一张卡：先低阶段，再挑学得最少的星球 ──
export function recommendCard(cards, progress, level, seed = 0) {
  const open = cards.filter((c) => c.lv <= level && !progress[c.id]?.learned);
  const pool = open.length ? open : cards.filter((c) => canOpen(c, level) && !progress[c.id]?.learned);
  if (!pool.length) return null;
  const minLv = Math.min(...pool.map((c) => c.lv));
  const tier = pool.filter((c) => c.lv === minLv);
  const learnedPer = {};
  for (const c of cards) if (progress[c.id]?.learned) learnedPer[c.d] = (learnedPer[c.d] || 0) + 1;
  const minCount = Math.min(...tier.map((c) => learnedPer[c.d] || 0));
  const best = tier.filter((c) => (learnedPer[c.d] || 0) === minCount);
  return best[Math.abs(seed) % best.length];
}

// ── 星球掌握度（用于雷达图）──
export function domainStats(cards, progress, domains, level) {
  return domains.map((d) => {
    const mine = cards.filter((c) => c.d === d.id && c.lv <= Math.max(level, 1));
    const learned = mine.filter((c) => progress[c.id]?.learned).length;
    const all = cards.filter((c) => c.d === d.id);
    const allLearned = all.filter((c) => progress[c.id]?.learned).length;
    return { ...d, learned, total: mine.length, pct: mine.length ? learned / mine.length : 0, allLearned, allTotal: all.length };
  });
}

// ── 随机数 ──
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pickFor = (items, key) => items[hashStr(key) % items.length];

// 按阶段筛选题库：本阶段及以下，优先接近本阶段
export function bankFor(bank, level, n, rng = Math.random) {
  const ok = bank.filter((x) => x.lv <= Math.max(level, 1));
  const pool = ok.length ? ok : bank.filter((x) => x.lv === Math.min(...bank.map((b) => b.lv)));
  const near = pool.filter((x) => x.lv >= level - 1);
  const far = pool.filter((x) => x.lv < level - 1);
  return [...shuffle(near, rng), ...shuffle(far, rng)].slice(0, n);
}

// ── 费米估算评分：看数量级误差 ──
export function fermiScore(guess, answer) {
  if (!(guess > 0) || !(answer > 0)) return { stars: 0, factor: Infinity };
  const factor = Math.max(guess / answer, answer / guess);
  const stars = factor <= 2 ? 3 : factor <= 4 ? 2 : factor <= 10 ? 1 : 0;
  return { stars, factor };
}
export function formatBig(n) {
  if (!isFinite(n)) return '—';
  const units = [[1e12, '万亿'], [1e8, '亿'], [1e4, '万']];
  for (const [v, u] of units) if (Math.abs(n) >= v) return `${+(n / v).toPrecision(3)}${u}`;
  return String(+n.toPrecision(4));
}

// ── 自信校准：Brier 分数（越低越好）──
export function brier(records) {
  if (!records.length) return null;
  return records.reduce((s, r) => s + (r.p - (r.ok ? 1 : 0)) ** 2, 0) / records.length;
}
export function calibrationBuckets(records) {
  const buckets = [0.5, 0.6, 0.7, 0.8, 0.9, 1].map((p) => ({ p, n: 0, ok: 0 }));
  for (const r of records) {
    const b = buckets.reduce((best, x) => (Math.abs(x.p - r.p) < Math.abs(best.p - r.p) ? x : best));
    b.n++; if (r.ok) b.ok++;
  }
  return buckets.map((b) => ({ ...b, rate: b.n ? b.ok / b.n : null }));
}

// ── 规律破译：数列生成 ──
export function genPattern(level, rng = Math.random) {
  const R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const types = ['add', 'sub', 'add2'];
  if (level >= 2) types.push('mul', 'alt', 'square');
  if (level >= 3) types.push('fib', 'growdiff', 'mulAdd');
  if (level >= 4) types.push('cube', 'interleave', 'tri');
  const type = types[Math.floor(rng() * types.length)];
  let seq = [];
  let rule = '';
  const len = 5;
  switch (type) {
    case 'add': { const s = R(1, 20), d = R(2, level >= 3 ? 15 : 9); for (let i = 0; i <= len; i++) seq.push(s + d * i); rule = `每次加 ${d}`; break; }
    case 'sub': { const d = R(2, 9), s = d * (len + 1) + R(1, 30); for (let i = 0; i <= len; i++) seq.push(s - d * i); rule = `每次减 ${d}`; break; }
    case 'add2': { const s = R(1, 10), d = R(2, 6); for (let i = 0; i <= len; i++) seq.push(s + d * i * 2); rule = `每次加 ${d * 2}`; break; }
    case 'mul': { const s = R(1, 4), m = R(2, 3); for (let i = 0; i <= len; i++) seq.push(s * m ** i); rule = `每次乘 ${m}`; break; }
    case 'alt': { const s = R(5, 20), a = R(3, 9), b = R(1, a - 1); let v = s; for (let i = 0; i <= len; i++) { seq.push(v); v += i % 2 === 0 ? a : -b; } rule = `交替 +${a}、−${b}`; break; }
    case 'square': { const s = R(1, 5); for (let i = 0; i <= len; i++) seq.push((s + i) ** 2); rule = '连续的平方数'; break; }
    case 'fib': { let a = R(1, 4), b = R(a, 6); for (let i = 0; i <= len; i++) { seq.push(a); [a, b] = [b, a + b]; } rule = '每个数 = 前两个数之和'; break; }
    case 'growdiff': { let v = R(1, 10), d = R(1, 3); for (let i = 0; i <= len; i++) { seq.push(v); v += d; d += 1; } rule = '差每次多 1'; break; }
    case 'mulAdd': { let v = R(1, 3); const m = 2, a = R(1, 3); for (let i = 0; i <= len; i++) { seq.push(v); v = v * m + a; } rule = `乘 ${m} 再加 ${a}`; break; }
    case 'cube': { const s = R(1, 3); for (let i = 0; i <= len; i++) seq.push((s + i) ** 3); rule = '连续的立方数'; break; }
    case 'interleave': { const a = R(1, 5), b = R(20, 40), da = R(2, 5), db = R(1, 4); for (let i = 0; i <= len; i++) seq.push(i % 2 === 0 ? a + da * (i / 2) : b - db * ((i - 1) / 2)); rule = `两列交织：一列 +${da}，一列 −${db}`; break; }
    case 'tri': { const s = R(1, 4); for (let i = 0; i <= len; i++) { const n = s + i; seq.push((n * (n + 1)) / 2); } rule = '三角形数（差每次多 1）'; break; }
  }
  const answer = seq[len];
  const shown = seq.slice(0, len);
  const opts = new Set([answer]);
  const deltas = [1, -1, 2, -2, 3, -3, 5, -5, 10, -10];
  let k = 0;
  while (opts.size < 4 && k < 50) {
    const d = deltas[Math.floor(rng() * deltas.length)] * (k > 20 ? 3 : 1);
    if (answer + d >= 0) opts.add(answer + d);
    k++;
  }
  let extra = 1;
  while (opts.size < 4) opts.add(answer + 100 * extra++);
  return { shown, answer, options: shuffle([...opts], rng), rule, type };
}

// ── 期望值决策：生成两个选项 ──
export function genEV(level, rng = Math.random) {
  const R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const probs = level >= 5 ? [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90] : [10, 20, 25, 50, 75, 80, 90];
  const make = (sure) => {
    if (sure) { const v = R(2, 12) * 10; return { p: 100, win: v, lose: 0, ev: v }; }
    const p = probs[Math.floor(rng() * probs.length)];
    const win = R(3, 30) * 10;
    const lose = level >= 4 && rng() < 0.4 ? -R(1, 5) * 10 : 0;
    return { p, win, lose, ev: (p / 100) * win + (1 - p / 100) * lose };
  };
  let A, B, tries = 0;
  do {
    A = make(rng() < 0.5);
    B = make(false);
    tries++;
  } while (Math.abs(A.ev - B.ev) < 5 && tries < 50);
  return { A, B, best: A.ev >= B.ev ? 'A' : 'B' };
}

// ── 每日任务完成度 ──
export function dailyDone(daily) {
  if (!daily) return 0;
  return ['card', 'review', 'game', 'talk'].filter((k) => daily.steps?.[k]).length;
}
