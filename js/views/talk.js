import { level, ensureDaily, recordTalk } from '../state.js';
import { h, burst, flushBadges, toast } from '../ui.js';
import { go, setTitle } from '../app.js';
import { TALKS, TALK_TIPS } from '../data/talks.js';
import { levelInfo } from '../data/meta.js';

export function renderTalk(root, which) {
  setTitle('💬 思辨时刻');
  const lv = level();
  let idx;
  if (which === 'today') idx = ensureDaily().picks.talk;
  else if (which != null && which !== '' && TALKS[+which]) idx = +which;
  else idx = ensureDaily().picks.talk;
  const t = TALKS[idx];
  const ta = h('textarea.input', { rows: 4, placeholder: '我的观点是……因为……（家人的观点也可以记下来）' });
  const tip = TALK_TIPS[Math.floor(Math.random() * TALK_TIPS.length)];

  root.append(
    h('div.talk-card',
      h('div.tag', `${levelInfo(t.lv).icon} ${levelInfo(t.lv).name}`),
      h('div.talk-q', t.q)),
    h('div.panel',
      h('h4', '🍽️ 怎么聊'),
      h('ol.small',
        h('li', '每个人先说自己的观点和理由（"我觉得……因为……"）'),
        h('li', '听别人说，用"你的意思是……对吗？"确认理解'),
        h('li', '找一找：有没有人改变了想法？为什么？')),
      h('div.hint', '🎯 今日小技巧：', tip),
      h('p.soft.small', '这些问题没有标准答案。家长请多问"为什么"，少给结论。'),
      ta,
      h('button.btn.full', {
        onclick: () => {
          recordTalk(t.q, ta.value.trim());
          burst(['💬', '⭐', '🦉']);
          toast('思辨记录已保存 +15 XP');
          flushBadges();
          go('home');
        },
      }, '✅ 我们聊过了')),
    h('div.section-title', '📚 更多话题'),
  );
  const list = TALKS.map((x, i) => ({ ...x, i })).filter((x) => x.lv <= lv + 1);
  root.append(h('div.talk-list', list.reverse().map((x) => h('button.talk-item' + (x.i === idx ? '.on' : ''), { onclick: () => go('talk/' + x.i) },
    h('span', levelInfo(x.lv).icon), h('span', x.q)))));
}
