import { S, setProfile, ensureDaily, save, level, due, openChest, markReviewStep } from '../state.js';
import { h, burst, flushBadges, toast, progressBar, modal } from '../ui.js';
import { go, setTitle } from '../app.js';
import { LEVELS, levelInfo, rankFor, suggestLevel } from '../data/meta.js';
import { cardById } from '../data/cards/index.js';
import { TALKS } from '../data/talks.js';
import { GAMES } from '../games/index.js';
import { dailyDone } from '../logic.js';

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐰', '🐨', '🦉', '🐬', '🦄', '🐲', '🐧', '🐸', '🚀', '🌟'];

export function renderOnboarding(root) {
  let avatar = '🦊';
  let lv = 1;
  const name = h('input.input', { placeholder: '你的名字或昵称', maxlength: 12 });
  const year = h('input.input', { type: 'number', placeholder: '出生年份（如 2016，可不填）', min: 1990, max: 2030 });
  const avWrap = h('div.avatars');
  const drawAv = () => avWrap.replaceChildren(...AVATARS.map((a) => h('button.av' + (a === avatar ? '.on' : ''), { onclick: () => { avatar = a; drawAv(); } }, a)));
  drawAv();
  const lvWrap = h('div.levels');
  const drawLv = () => lvWrap.replaceChildren(...LEVELS.map((L) => h('button.lv-pick' + (L.lv === lv ? '.on' : ''), { onclick: () => { lv = L.lv; drawLv(); } },
    h('span.lv-icon', L.icon), h('b', L.name), h('small', `${L.age} · ${L.grade}`))));
  drawLv();
  year.addEventListener('input', () => { const y = +year.value; if (y > 1990 && y < 2030) { lv = suggestLevel(y); drawLv(); } });

  root.append(
    h('div.hero',
      h('div.hero-emoji', '🧠'),
      h('h1.brush', '思维超能力'),
      h('p', '一套陪你从小学一直到大学的思维训练工具', h('br'), '12 颗思维星球 · 130+ 个超能力 · 9 种脑力游戏')),
    h('div.panel',
      h('h3', '👋 先认识一下你'),
      name,
      h('h4', '选一个头像'), avWrap,
      year,
      h('h4', '你现在在哪个成长阶段？'), lvWrap,
      h('p.soft.small', '阶段决定推荐的内容难度，以后可以在"家长中心"随时调整。'),
      h('button.btn.full', {
        onclick: () => {
          if (!name.value.trim()) { toast('写个名字吧～'); name.focus(); return; }
          setProfile({ name: name.value.trim(), avatar, level: lv, birthYear: +year.value || null });
          go('home');
          location.reload();
        },
      }, '开始我的思维之旅 🚀')),
  );
}

export function renderHome(root) {
  const s = S();
  setTitle('思维超能力', false);
  const d = ensureDaily();
  save();
  const r = rankFor(s.xp);
  const L = levelInfo(level());
  const dueN = due().length;

  // 问候卡
  root.append(h('div.greet',
    h('div.greet-av', s.profile.avatar),
    h('div.greet-main',
      h('div.greet-hi', `${greeting()}，${s.profile.name}！`),
      h('div.greet-rank', `${r.icon} ${r.name} · ${L.icon} ${L.name}阶段`),
      progressBar(r.pct),
      h('div.tiny.soft', r.next ? `${s.xp} / ${r.next.xp} XP → ${r.next.icon} ${r.next.name}` : `${s.xp} XP · 最高称号！`))));

  // 每日任务
  const n = dailyDone(d);
  const card = d.picks.card && cardById[d.picks.card];
  const game = GAMES.find((g) => g.id === d.picks.game);
  const talk = TALKS[d.picks.talk];
  const steps = [
    { k: 'card', icon: '📖', t: '新超能力', sub: card ? `${card.icon} ${card.name}` : '已全部学完，去复习吧！', go: () => card ? go('card/' + card.id) : go('universe') },
    {
      k: 'review', icon: '🔁', t: '记忆复习', sub: dueN ? `${dueN} 张卡等你复习` : (Object.keys(s.cards).length ? '今天没有到期的卡 👍' : '学了第一张卡后开始'),
      go: () => {
        if (dueN) go('review');
        else if (Object.values(s.cards).some((c) => c.learned)) { markReviewStep(); toast('今天的复习已清空 ✓'); renderHomeRefresh(); }
        else toast('先去学一张新超能力吧～');
      },
    },
    { k: 'game', icon: '🎮', t: '脑力游戏', sub: game ? `${game.icon} ${game.name}` : '', go: () => go('game/' + d.picks.game) },
    { k: 'talk', icon: '💬', t: '思辨时刻', sub: talk ? talk.q.slice(0, 22) + '…' : '', go: () => go('talk/today') },
  ];
  const chestReady = n === 4 && !d.chest;
  root.append(h('div.panel.daily',
    h('div.row-between', h('h3', '⚔️ 今日任务'), h('span.pill', `${n}/4`)),
    h('p.soft.small', '每天约 15 分钟：学一个、复习、玩一局、聊一聊'),
    ...steps.map((st) => h('button.step' + (d.steps[st.k] ? '.done' : ''), { onclick: st.go },
      h('span.step-icon', d.steps[st.k] ? '✅' : st.icon),
      h('span.step-main', h('b', st.t), h('small', st.sub)),
      h('span.chev', '›'))),
    d.chest ? h('div.chest-done', '🎁 今日宝箱已领取，明天见！')
      : h('button.btn.full' + (chestReady ? '.glow' : '.disabled'), {
        onclick: () => {
          if (!chestReady) { toast('完成 4 个任务就能打开宝箱～'); return; }
          const bonus = openChest();
          burst(['🎁', '⭐', '💎', '🎉']);
          modal(h('div.center', h('div.big-emoji', '🎁'), h('h2', '宝箱打开啦！'), h('p', `获得 ⭐ × ${bonus} 和 30 XP`), h('p.soft', '坚持就是最强的超能力（还记得复利效应吗？）')));
          flushBadges();
          root.replaceChildren(); renderHome(root);
        },
      }, chestReady ? '🎁 打开今日宝箱' : '🔒 完成全部任务开宝箱')));

  // 主入口
  const tiles = [
    ['universe', '🪐', '思维宇宙', '12 颗星球 · 全部超能力'],
    ['games', '🎡', '脑力游乐场', '9 种思维游戏'],
    ['review', '🔁', '记忆复习', dueN ? `${dueN} 张待复习` : '按遗忘曲线安排'],
    ['talk', '💬', '思辨时刻', '全家一起聊'],
    ['journal', '📔', '成长档案', '雷达图 · 徽章 · 日记'],
    ['parent', '👨‍👩‍👧', '家长中心', '设置 · 指南 · 备份'],
  ];
  root.append(h('div.tiles', tiles.map(([p, i, t, sub]) => h('button.tile', { onclick: () => go(p) }, h('span.tile-icon', i), h('b', t), h('small', sub)))));

  // 收藏
  const favs = Object.entries(s.cards).filter(([id, c]) => c.fav && cardById[id]).map(([id]) => cardById[id]);
  if (favs.length) {
    root.append(h('div.section-title', '💛 我收藏的超能力'),
      h('div.chips', favs.map((c) => h('button.chip', { onclick: () => go('card/' + c.id) }, `${c.icon} ${c.name}`))));
  }
  flushBadges();

  function renderHomeRefresh() { root.replaceChildren(); renderHome(root); }
}

function greeting() {
  const hr = new Date().getHours();
  if (hr < 6) return '夜深了';
  if (hr < 11) return '早上好';
  if (hr < 14) return '中午好';
  if (hr < 18) return '下午好';
  return '晚上好';
}
