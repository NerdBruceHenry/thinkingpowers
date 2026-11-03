import { S, level, cardProg, learnCard, practiceCard, toggleFav } from '../state.js';
import { h, quiz, burst, flushBadges, toast, progressBar } from '../ui.js';
import { go, setTitle } from '../app.js';
import { DOMAINS, domainById, LEVELS, levelInfo } from '../data/meta.js';
import { CARDS, cardById } from '../data/cards/index.js';
import { domainStats, canOpen } from '../logic.js';

const SRC = { ep1: '第一册', ep2: '第二册', ep3: '第三册', ep4: '第四册', ep5: '第五册' };

export function renderUniverse(root) {
  setTitle('🪐 思维宇宙');
  const s = S();
  const lv = level();
  const stats = domainStats(CARDS, s.cards, DOMAINS, lv);
  const learned = CARDS.filter((c) => s.cards[c.id]?.learned).length;

  root.append(
    h('div.panel.center',
      h('div.big-num', `${learned}`, h('small', ` / ${CARDS.length}`)),
      h('div.soft', '已解锁的思维超能力'),
      progressBar(learned / CARDS.length)),
    h('div.section-title', '🪐 按星球探索'),
    h('div.planets', stats.map((d) => h('button.planet', { style: { '--c': d.color, '--l': d.light }, onclick: () => go('domain/' + d.id) },
      h('div.planet-orb', d.icon),
      h('b', d.name),
      h('small', `${d.allLearned}/${d.allTotal}`),
      h('div.mini-bar', h('i', { style: { width: `${(d.allLearned / d.allTotal) * 100}%` } }))))),
    h('div.section-title', '🛤️ 按成长阶段'),
    h('div.road', LEVELS.map((L) => {
      const cs = CARDS.filter((c) => c.lv === L.lv);
      const n = cs.filter((c) => s.cards[c.id]?.learned).length;
      const locked = L.lv > lv + 1;
      return h('button.road-step' + (L.lv === lv ? '.cur' : '') + (locked ? '.locked' : ''), { onclick: () => go('level/' + L.lv) },
        h('span.road-icon', locked ? '🔒' : L.icon),
        h('span.road-main', h('b', `${L.name} · ${L.grade}`), h('small', L.desc)),
        h('span.pill', `${n}/${cs.length}`));
    })),
  );
}

function cardRow(c) {
  const p = cardProg(c.id);
  const d = domainById[c.d];
  const open = canOpen(c, level());
  return h('button.card-row' + (p.learned ? '.done' : '') + (open ? '' : '.locked'), {
    style: { '--c': d.color, '--l': d.light },
    onclick: () => open ? go('card/' + c.id) : toast(`🔒 ${levelInfo(c.lv).name}阶段（${levelInfo(c.lv).grade}）解锁，先把眼前的超能力练好～`),
  },
  h('span.card-icon', open ? c.icon : '🔒'),
  h('span.card-txt', h('b', c.name), h('small', open ? c.one : `${levelInfo(c.lv).icon} ${levelInfo(c.lv).name}阶段解锁`)),
  p.learned ? h('span.badge-done', p.practiced ? '🛠️✓' : '✓') : h('span.lv-tag', levelInfo(c.lv).icon));
}

export function renderDomain(root, id) {
  const d = domainById[id];
  if (!d) return go('universe');
  setTitle(`${d.icon} ${d.name}`);
  const cs = CARDS.filter((c) => c.d === id);
  const n = cs.filter((c) => cardProg(c.id).learned).length;
  root.append(h('div.domain-hero', { style: { '--c': d.color, '--l': d.light } },
    h('div.domain-orb', d.icon), h('h2', d.name), h('p', d.desc), progressBar(n / cs.length, d.color), h('small', `已解锁 ${n} / ${cs.length}`)));
  for (const L of LEVELS) {
    const group = cs.filter((c) => c.lv === L.lv);
    if (!group.length) continue;
    root.append(h('div.section-title', `${L.icon} ${L.name} · ${L.grade}`), ...group.map(cardRow));
  }
}

export function renderLevel(root, lvStr) {
  const L = levelInfo(+lvStr);
  setTitle(`${L.icon} ${L.name}阶段`);
  root.append(h('div.panel', h('h3', `${L.icon} ${L.name} · ${L.age} · ${L.grade}`), h('p.soft', L.desc)));
  for (const d of DOMAINS) {
    const group = CARDS.filter((c) => c.lv === L.lv && c.d === d.id);
    if (!group.length) continue;
    root.append(h('div.section-title', `${d.icon} ${d.name}`), ...group.map(cardRow));
  }
}

export function renderCard(root, id) {
  const c = cardById[id];
  if (!c) return go('universe');
  const d = domainById[c.d];
  const L = levelInfo(c.lv);
  setTitle(`${d.icon} ${d.name}`);
  if (!canOpen(c, level())) {
    root.append(h('div.panel.center', h('div.big-emoji', '🔒'), h('h3', c.name), h('p.soft', `这是${L.name}阶段（${L.grade}）的超能力，现在还没解锁哦。`)));
    return;
  }
  const draw = () => {
    root.replaceChildren();
    const p = cardProg(id);
    const wrap = h('div.card-page', { style: { '--c': d.color, '--l': d.light } });
    wrap.append(h('div.card-head',
      h('div.card-big-icon', c.icon),
      h('div',
        h('h2', c.name),
        h('div.card-one', c.one),
        h('div.tags', h('span.tag', `${L.icon} ${L.name}`), h('span.tag', `${d.icon} ${d.name}`), c.src ? h('span.tag', `📕 ${SRC[c.src]}`) : null)),
      h('button.fav' + (p.fav ? '.on' : ''), { onclick: () => { toggleFav(id); draw(); }, title: '收藏' }, p.fav ? '💛' : '🤍')));

    wrap.append(h('div.block-label', '📖 故事时间'), h('div.story', { html: c.story }));
    if (c.vs) {
      wrap.append(h('div.vs-grid', c.vs.map(([bad, good]) => [
        h('div.vs-bad', h('small', '❌ 旧想法'), bad), h('div.vs-good', h('small', '✅ 新想法'), good)])));
    }

    // 闯关：答对题目解锁
    wrap.append(h('div.block-label', '🧩 闯关挑战'));
    if (p.learned) {
      wrap.append(h('div.unlocked', '✅ 已解锁这个超能力'));
      c.q.forEach((q) => wrap.append(quiz(q)));
    } else {
      let okCount = 0, answered = 0;
      const unlockBtn = h('button.btn.full.disabled', '答对挑战题来解锁 ⭐');
      c.q.forEach((q) => wrap.append(quiz(q, (ok) => {
        answered++; if (ok) okCount++;
        if (answered === c.q.length) {
          unlockBtn.classList.remove('disabled');
          unlockBtn.textContent = okCount === c.q.length ? '⭐ 我学会这个超能力啦！' : '⭐ 理解了，解锁这个超能力！';
          unlockBtn.onclick = () => {
            if (learnCard(id)) {
              burst();
              toast('解锁成功！+20 XP ⭐');
              flushBadges();
            }
            draw();
          };
        }
      })));
      wrap.append(unlockBtn);
    }

    // 试一试 + 实践记录
    wrap.append(h('div.block-label', '⚡ 试一试（在真实生活里用出来）'), h('div.try', { html: c.try }));
    const ta = h('textarea.input', { rows: 3, placeholder: '做完之后写下来：你做了什么？发生了什么？有什么发现？' });
    wrap.append(h('div.practice',
      p.practiced ? h('div.unlocked', `🛠️ 已完成实践（${new Date(p.practiced).toLocaleDateString()}），可以再记录一次`) : h('p.soft.small', '知道 ≠ 会用。真正用一次，写下记录，才算掌握！首次实践 +30 XP ⭐⭐'),
      ta,
      h('button.btn.ghost.full', {
        onclick: () => {
          const t = ta.value.trim();
          if (t.length < 4) { toast('多写几个字吧，记录你的发现～'); return; }
          practiceCard(id, t);
          burst(['🛠️', '⭐', '✨']);
          toast('实践记录已保存到成长档案 📔');
          flushBadges();
          draw();
        },
      }, '📝 保存实践记录')));

    // 相关卡片
    const related = CARDS.filter((x) => x.d === c.d && x.id !== c.id && canOpen(x, level())).slice(0, 4);
    if (related.length) {
      wrap.append(h('div.block-label', '🔗 同一星球的其他超能力'),
        h('div.chips', related.map((x) => h('button.chip', { onclick: () => go('card/' + x.id) }, `${x.icon} ${x.name}${cardProg(x.id).learned ? ' ✓' : ''}`))));
    }
    root.append(wrap);
  };
  draw();
}
