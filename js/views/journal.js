import { S, level, addNote, deleteJournal, badgeCtx } from '../state.js';
import { h, toast, fmtDate, flushBadges } from '../ui.js';
import { go, setTitle } from '../app.js';
import { DOMAINS, levelInfo, rankFor } from '../data/meta.js';
import { CARDS, cardById } from '../data/cards/index.js';
import { BADGES } from '../data/badges.js';
import { domainStats, dayKey, addDays } from '../logic.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

// 十二星球思维雷达图
function radar(stats) {
  const W = 320, C = W / 2, R = 108, n = stats.length;
  const root = svg('svg', { viewBox: `0 0 ${W} ${W}`, class: 'radar', role: 'img', 'aria-label': '思维雷达图' });
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    return [C + Math.cos(a) * r, C + Math.sin(a) * r];
  };
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    root.append(svg('polygon', { points: stats.map((_, i) => pt(i, R * f).join(',')).join(' '), class: 'radar-grid' }));
  });
  stats.forEach((d, i) => {
    const [x, y] = pt(i, R);
    root.append(svg('line', { x1: C, y1: C, x2: x, y2: y, class: 'radar-axis' }));
    const [lx, ly] = pt(i, R + 26);
    const t = svg('text', { x: lx, y: ly + 4, 'text-anchor': 'middle', class: 'radar-label' });
    t.textContent = d.icon;
    root.append(t);
  });
  const vals = stats.map((d, i) => pt(i, R * Math.max(0.04, d.pct)).join(','));
  root.append(svg('polygon', { points: vals.join(' '), class: 'radar-area' }));
  stats.forEach((d, i) => {
    const [x, y] = pt(i, R * Math.max(0.04, d.pct));
    root.append(svg('circle', { cx: x, cy: y, r: 3.5, fill: d.color }));
  });
  return root;
}

// 最近 12 周的学习热力图
function heatmap(days) {
  const weeks = 12;
  const today = dayKey();
  const wd = (new Date().getDay() + 6) % 7; // 周一=0
  const start = addDays(today, -(weeks * 7 - 1) + (6 - wd));
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const k = addDays(start, i);
    const xp = days[k] || 0;
    const lvl = k > today ? -1 : xp === 0 ? 0 : xp < 30 ? 1 : xp < 80 ? 2 : 3;
    cells.push(h('i.hm' + (lvl < 0 ? '.future' : `.l${lvl}`), { title: `${k}：${xp} XP` }));
  }
  return h('div.heatmap', cells);
}

export function renderJournal(root) {
  setTitle('📔 成长档案');
  const s = S();
  const lv = level();
  const stats = domainStats(CARDS, s.cards, DOMAINS, lv);
  const r = rankFor(s.xp);
  const ctx = badgeCtx();
  const activeDays = Object.keys(s.days).length;

  root.append(
    h('div.panel.profile-card',
      h('div.greet-av', s.profile.avatar),
      h('div', h('h3', s.profile.name), h('div.soft.small', `${r.icon} ${r.name} · ${levelInfo(lv).icon} ${levelInfo(lv).name}阶段`),
        h('div.small', `开始于 ${fmtDate(s.profile.created || Date.now())}`))),
    h('div.stat-grid',
      stat('🧠', ctx.learned, '超能力'),
      stat('🛠️', ctx.practiced, '实践'),
      stat('📅', activeDays, '学习天数'),
      stat('🔥', s.streak.best || 0, '最长连续'),
      stat('⭐', s.stars, '星星'),
      stat('✨', s.xp, 'XP')),
    h('div.section-title', '🕸️ 我的思维雷达（本阶段及以下的掌握度）'),
    h('div.panel.center', radar(stats),
      h('div.legend', stats.map((d) => h('span', `${d.icon} ${d.name} ${d.learned}/${d.total}`)))),
    h('div.section-title', '🗓️ 最近 12 周'),
    h('div.panel', heatmap(s.days), h('div.tiny.soft', '颜色越深，那天学得越多')),
    h('div.section-title', `🏅 徽章 ${Object.keys(s.badges).length}/${BADGES.length}`),
    h('div.badges', BADGES.map((b) => h('div.badge' + (s.badges[b.id] ? '.got' : ''), { title: b.desc },
      h('div.badge-icon', s.badges[b.id] ? b.icon : '❔'), h('b', b.name), h('small', b.desc)))),
  );

  // 日记
  const ta = h('textarea.input', { rows: 2, placeholder: '写一条思考日记：今天我用了哪个思维工具？有什么新想法？' });
  root.append(h('div.section-title', '✍️ 思考日记'),
    h('div.panel', ta, h('button.btn.full', {
      onclick: () => {
        const t = ta.value.trim();
        if (!t) return;
        addNote(t); toast('已保存 +5 XP'); flushBadges();
        root.replaceChildren(); renderJournal(root);
      },
    }, '保存日记')));
  if (!s.journal.length) root.append(h('p.soft.center', '还没有记录。完成卡片的"试一试"，或者在思辨时刻写下观点，都会出现在这里。'));
  root.append(h('div.timeline', s.journal.slice(0, 200).map((j) => {
    const c = j.cardId && cardById[j.cardId];
    const head = j.type === 'practice' ? `🛠️ 实践：${c ? c.icon + ' ' + c.name : ''}` : j.type === 'talk' ? `💬 思辨：${j.q || ''}` : '✍️ 日记';
    return h('div.entry',
      h('div.entry-head', h('span', head), h('small.soft', fmtDate(j.ts))),
      j.text ? h('div.entry-text', j.text) : null,
      h('div.entry-actions',
        c ? h('button.link', { onclick: () => go('card/' + c.id) }, '查看卡片') : null,
        h('button.link.danger', { onclick: () => { if (confirm('删除这条记录？')) { deleteJournal(j.ts); root.replaceChildren(); renderJournal(root); } } }, '删除')));
  })));
}

const stat = (i, n, t) => h('div.stat-box', h('div.stat-icon', i), h('b', n), h('small', t));
