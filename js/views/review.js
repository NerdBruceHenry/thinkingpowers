import { S, due, reviewAnswer, markReviewStep } from '../state.js';
import { h, quiz, burst, flushBadges } from '../ui.js';
import { go, setTitle } from '../app.js';
import { cardById } from '../data/cards/index.js';
import { domainById } from '../data/meta.js';
import { SRS_STEPS } from '../logic.js';

export function renderReview(root) {
  setTitle('🔁 记忆复习');
  const ids = due().slice(0, 12);
  const learned = Object.entries(S().cards).filter(([id, c]) => c.learned && cardById[id]);
  if (!ids.length) {
    root.append(h('div.panel.center',
      h('div.big-emoji', learned.length ? '🎉' : '📭'),
      h('h3', learned.length ? '今天没有需要复习的卡片！' : '还没有学过的卡片'),
      h('p.soft', learned.length ? `你已掌握 ${learned.length} 张卡。复习间隔会按 ${SRS_STEPS.join('→')} 天逐渐变长（遗忘曲线）。` : '去思维宇宙学一张新超能力吧！'),
      h('button.btn', { onclick: () => go(learned.length ? 'home' : 'universe') }, learned.length ? '回首页' : '去学习')));
    if (learned.length) markReviewStep();
    return;
  }
  let i = 0, ok = 0;
  const next = () => {
    root.replaceChildren();
    if (i >= ids.length) {
      markReviewStep();
      burst(['🔁', '⭐', '🧠']);
      root.append(h('div.panel.center', h('div.big-emoji', '🧠'), h('h2', `复习完成！${ok} / ${ids.length}`),
        h('p.soft', '答对的卡下次会隔更久再出现；答错的明天再见。这就是"在快要忘记时复习"。'),
        h('button.btn', { onclick: () => go('home') }, '回首页')));
      flushBadges();
      return;
    }
    const c = cardById[ids[i]];
    const d = domainById[c.d];
    const q = c.q[Math.floor(Math.random() * c.q.length)];
    root.append(
      h('div.game-top', h('span', '🔁 复习'), h('span.pill', `${i + 1} / ${ids.length}`)),
      h('div.review-card', { style: { '--c': d.color, '--l': d.light } },
        h('div.card-big-icon', c.icon), h('div', h('b', c.name), h('div.soft.small', '先回忆：这个超能力讲的是什么？举个例子？'))),
      h('details.peek', h('summary', '想不起来？偷看一眼'), h('p', c.one)),
      quiz(q, (good) => {
        if (good) ok++;
        reviewAnswer(c.id, good);
        root.append(h('button.btn.full', { onclick: () => { i++; next(); } }, i + 1 < ids.length ? '下一张 →' : '完成 🏁'));
      }));
  };
  next();
}
