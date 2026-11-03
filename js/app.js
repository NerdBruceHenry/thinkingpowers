import { S, onChange, level } from './state.js';
import { h } from './ui.js';
import { rankFor, levelInfo } from './data/meta.js';
import { renderHome, renderOnboarding } from './views/home.js';
import { renderUniverse, renderDomain, renderCard, renderLevel } from './views/universe.js';
import { renderGames, renderGame } from './views/games.js';
import { renderReview } from './views/review.js';
import { renderTalk } from './views/talk.js';
import { renderJournal } from './views/journal.js';
import { renderParent } from './views/parent.js';

const main = document.getElementById('main');
const titleEl = document.getElementById('title');
const backBtn = document.getElementById('back');
const statsEl = document.getElementById('stats');

export function go(path) { location.hash = '#/' + path; }

const routes = {
  '': renderHome,
  home: renderHome,
  universe: renderUniverse,
  domain: renderDomain,
  level: renderLevel,
  card: renderCard,
  games: renderGames,
  game: renderGame,
  review: renderReview,
  talk: renderTalk,
  journal: renderJournal,
  parent: renderParent,
};

export function setTitle(t, back = true) {
  titleEl.textContent = t;
  backBtn.hidden = !back;
}

function renderStats() {
  const s = S();
  if (!s.profile) { statsEl.innerHTML = ''; return; }
  const r = rankFor(s.xp);
  statsEl.replaceChildren(
    h('span.stat', { title: '连续天数' }, '🔥', s.streak.count || 0),
    h('span.stat', { title: '星星' }, '⭐', s.stars),
    h('span.stat', { title: `${r.name} · 阶段 ${levelInfo(level()).name}` }, r.icon),
  );
}

function route() {
  const s = S();
  const [name, ...args] = location.hash.replace(/^#\/?/, '').split('/');
  main.replaceChildren();
  window.scrollTo(0, 0);
  if (!s.profile) {
    setTitle('思维超能力', false);
    renderOnboarding(main);
    return;
  }
  const fn = routes[name] || renderHome;
  fn(main, ...args.map(decodeURIComponent));
  renderStats();
}

backBtn.addEventListener('click', () => {
  if (history.length > 1) history.back(); else go('home');
});
window.addEventListener('hashchange', route);
onChange(renderStats);
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
