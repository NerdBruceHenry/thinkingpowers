import { S, level, recordGame } from '../state.js';
import { h, burst, flushBadges, modal } from '../ui.js';
import { go, setTitle } from '../app.js';
import { GAMES, gameById } from '../games/index.js';
import { levelInfo } from '../data/meta.js';

export function renderGames(root) {
  setTitle('🎡 脑力游乐场');
  const s = S();
  const lv = level();
  root.append(h('p.soft.small.pad', '每个游戏都对应一种真实的思维能力。难度会随你的成长阶段自动调整。'));
  root.append(h('div.game-grid', GAMES.map((g) => {
    const rec = s.games[g.id];
    const locked = g.minLv > lv + 1;
    return h('button.game-card' + (locked ? '.locked' : ''), { onclick: () => locked ? modal(h('div.center', h('div.big-emoji', '🔒'), h('p', `${levelInfo(g.minLv).name}阶段解锁`))) : go('game/' + g.id) },
      h('div.game-icon', locked ? '🔒' : g.icon),
      h('b', g.name),
      h('small', g.desc),
      h('div.tiny.soft', `训练：${g.skill}`),
      rec ? h('div.tiny', `玩过 ${rec.plays} 次 · 最佳 ${rec.best}`) : h('div.tiny.new', 'NEW'));
  })));
}

export function renderGame(root, id) {
  const g = gameById[id];
  if (!g) return go('games');
  setTitle(`${g.icon} ${g.name}`);
  const area = h('div.game-area');
  root.append(area);
  g.run(area, ({ score, max, perfect }) => {
    const ratio = max ? score / max : 0;
    const stars = ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : ratio > 0.2 ? 1 : 0;
    recordGame(id, score, { perfect, stars });
    area.replaceChildren(h('div.panel.center',
      h('div.big-emoji', stars === 3 ? '🏆' : stars === 2 ? '🎉' : stars === 1 ? '👍' : '💪'),
      h('h2', `${score} / ${max}`),
      h('div.stars-row', '⭐'.repeat(stars) + '☆'.repeat(3 - stars)),
      h('p.soft', stars === 3 ? '太厉害了！' : stars >= 1 ? '不错！再来一局会更好。' : '错误是最好的老师——看看解析，再试一次！'),
      h('p.small', `+${10 + Math.round(score)} XP${stars ? ` · ⭐ × ${stars}` : ''}`),
      h('div.row', h('button.btn.ghost', { onclick: () => { area.remove(); renderGame(root, id); } }, '再来一局'),
        h('button.btn', { onclick: () => go('home') }, '回首页'))));
    if (stars >= 2) burst();
    flushBadges();
  }, level());
}
