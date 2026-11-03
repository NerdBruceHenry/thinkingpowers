import { h, quiz, toast } from '../ui.js';
import { genPattern, genEV, bankFor, shuffle, fermiScore, formatBig, brier, calibrationBuckets } from '../logic.js';
import { FALLACIES, FALLACY_TYPES, BIASES, BIAS_TYPES, FERMI, CALIBRATION, LATERAL, LOGIC, CREATIVE } from '../data/games.js';
import { recordCalib, S } from '../state.js';

// 通用：逐题问答
function runQuiz(root, items, finish, { title, after } = {}) {
  let i = 0, ok = 0;
  const next = () => {
    root.replaceChildren();
    if (i >= items.length) return finish({ score: ok, max: items.length, perfect: ok === items.length });
    const it = items[i];
    root.append(
      h('div.game-top', h('span', title || ''), h('span.pill', `${i + 1} / ${items.length}`), h('span.pill', `✅ ${ok}`)),
      it.pre || null,
      quiz(it, (good) => {
        if (good) ok++;
        if (after) root.append(after(it, good));
        root.append(h('button.btn.full', { onclick: () => { i++; next(); } }, i + 1 < items.length ? '下一题 →' : '看结果 🏁'));
      }));
  };
  next();
}

const toOpts = (correctKey, types, rng = Math.random) => {
  const others = shuffle(Object.keys(types).filter((k) => k !== correctKey), rng).slice(0, 3);
  const keys = shuffle([correctKey, ...others], rng);
  return { keys, a: keys.indexOf(correctKey) };
};

export const GAMES = [
  {
    id: 'pattern', icon: '🔢', name: '规律破译', minLv: 1, desc: '找出数列的规律，填出下一个数', skill: '找规律与抽象',
    run(root, finish, lv) {
      const items = Array.from({ length: 8 }, () => {
        const p = genPattern(lv);
        return { q: `${p.shown.join(' ,  ')} ,  ？`, o: p.options.map(String), a: p.options.indexOf(p.answer), e: `规律：${p.rule}` };
      });
      runQuiz(root, items, finish, { title: '🔢 下一个数是？' });
    },
  },
  {
    id: 'lateral', icon: '💡', name: '水平思考', minLv: 1, desc: '跳出常规的脑筋急转弯和思维谜题', skill: '跳出思维定式',
    run(root, finish, lv) {
      const items = bankFor(LATERAL, lv, 3);
      let i = 0, solved = 0;
      const next = () => {
        root.replaceChildren();
        if (i >= items.length) return finish({ score: solved, max: items.length, perfect: solved === items.length });
        const it = items[i];
        let shownHints = 0;
        const hintBox = h('div');
        const ansBox = h('div');
        const hintBtn = h('button.btn.ghost', {
          onclick: () => {
            if (shownHints >= it.h.length) { toast('没有更多提示啦'); return; }
            hintBox.append(h('div.hint', `💡 提示 ${shownHints + 1}：${it.h[shownHints]}`));
            shownHints++;
          },
        }, '要个提示');
        const reveal = h('button.btn', {
          onclick: () => {
            reveal.remove(); hintBtn.remove();
            ansBox.append(h('div.answer', '🔓 ', it.a),
              h('p.soft.small', '你想到了吗？诚实地选择：'),
              h('div.row', h('button.btn.ghost', { onclick: () => { i++; next(); } }, '没想到 😅'),
                h('button.btn', { onclick: () => { solved++; i++; next(); } }, '想到了！😎')));
          },
        }, '我想好了，看答案');
        root.append(h('div.game-top', h('span', '💡 水平思考'), h('span.pill', `${i + 1} / ${items.length}`)),
          h('div.riddle', it.q), h('p.soft.small', '先自己想，或者和家人讨论。可以用"五个为什么"和"换个角度"！'),
          hintBox, h('div.row', hintBtn, reveal), ansBox);
      };
      next();
    },
  },
  {
    id: 'creative', icon: '🌪️', name: '创意风暴', minLv: 1, desc: '90 秒内想出尽可能多的点子', skill: '发散思维',
    run(root, finish, lv) {
      const prompt = bankFor(CREATIVE, lv, 1)[0];
      const ideas = [];
      let left = 90, timer = null;
      const list = h('ol.idea-list');
      const clock = h('span.pill.big', '⏱ 90');
      const input = h('input.input', { placeholder: '输入一个点子，按回车', disabled: true });
      const add = () => {
        const v = input.value.trim();
        if (!v) return;
        ideas.push(v); list.append(h('li', v)); input.value = '';
        counter.textContent = `💡 ${ideas.length}`;
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
      const counter = h('span.pill', '💡 0');
      const end = () => {
        clearInterval(timer);
        input.disabled = true;
        root.append(h('div.panel', h('h3', `时间到！你想出了 ${ideas.length} 个点子`),
          h('p.soft.small', '研究发现：越往后的点子越有原创性。看看你的清单，最后几个是不是更有意思？'),
          h('button.btn.full', { onclick: () => finish({ score: Math.min(ideas.length, 30), max: 30, perfect: ideas.length >= 15 }) }, '完成 🏁')));
      };
      const startBtn = h('button.btn.full', {
        onclick: () => {
          startBtn.remove(); input.disabled = false; input.focus();
          timer = setInterval(() => {
            if (!root.isConnected) { clearInterval(timer); return; } // 离开页面时停止
            left--; clock.textContent = `⏱ ${left}`; if (left <= 0) end();
          }, 1000);
        },
      }, '▶ 开始计时');
      root.append(h('div.game-top', h('span', '🌪️ 创意风暴'), clock, counter),
        h('div.riddle', prompt.p),
        h('p.soft.small', '规则：数量第一、不要评判、越怪越好！可以用"组合""反转""换用途"来想。'),
        startBtn, h('div.row', input, h('button.btn', { onclick: add }, '+')), list);
    },
  },
  {
    id: 'logic', icon: '🧩', name: '逻辑推理', minLv: 2, desc: '真话假话、排序推理、条件判断', skill: '演绎推理',
    run(root, finish, lv) {
      runQuiz(root, bankFor(LOGIC, lv, 5), finish, { title: '🧩 推理挑战' });
    },
  },
  {
    id: 'fallacy', icon: '🕵️', name: '谬误侦探', minLv: 2, desc: '这句话哪里不对劲？找出逻辑谬误', skill: '逻辑谬误识别',
    run(root, finish, lv) {
      const items = bankFor(FALLACIES, lv, 6).map((f) => {
        const { keys, a } = toOpts(f.t, FALLACY_TYPES);
        return { q: `「${f.s}」\n这句话犯了什么错误？`, o: keys.map((k) => FALLACY_TYPES[k].name), a, e: `${FALLACY_TYPES[f.t].name}：${FALLACY_TYPES[f.t].tip}` };
      });
      runQuiz(root, items, finish, { title: '🕵️ 谬误侦探' });
    },
  },
  {
    id: 'bias', icon: '📡', name: '偏差雷达', minLv: 2, desc: '识别大脑的小把戏：这是哪种偏差？', skill: '认知偏差',
    run(root, finish, lv) {
      const items = bankFor(BIASES, lv, 6).map((b) => {
        const { keys, a } = toOpts(b.t, BIAS_TYPES);
        return { q: `「${b.s}」\n这是哪种思维偏差/效应？`, o: keys.map((k) => BIAS_TYPES[k]), a, e: `答案：${BIAS_TYPES[b.t]}` };
      });
      runQuiz(root, items, finish, { title: '📡 偏差雷达' });
    },
  },
  {
    id: 'fermi', icon: '🧮', name: '费米估算', minLv: 2, desc: '不查资料，拆解问题估一估', skill: '费米估算',
    run(root, finish, lv) {
      const items = bankFor(FERMI, lv, 5);
      let i = 0, total = 0;
      const next = () => {
        root.replaceChildren();
        if (i >= items.length) return finish({ score: total, max: items.length * 3, perfect: total === items.length * 3 });
        const it = items[i];
        const num = h('input.input', { type: 'number', step: 'any', min: 0, placeholder: '你的估计' });
        const unit = h('select.input.unit', h('option', { value: 1 }, '个'), h('option', { value: 1e4 }, '万'), h('option', { value: 1e8 }, '亿'), h('option', { value: 1e12 }, '万亿'));
        const res = h('div');
        const submit = h('button.btn.full', {
          onclick: () => {
            const g = parseFloat(num.value) * +unit.value;
            if (!(g > 0)) { toast('输入一个大于 0 的数'); return; }
            submit.remove();
            const { stars, factor } = fermiScore(g, it.a);
            total += stars;
            res.append(h('div.feedback.' + (stars ? 'ok' : 'bad'),
              h('div', `你的估计：${formatBig(g)} ${it.unit}　参考答案：约 ${formatBig(it.a)} ${it.unit}`),
              h('div', stars ? `${'⭐'.repeat(stars)} 相差 ${factor.toFixed(1)} 倍以内` : `相差 ${factor > 1000 ? '超过 1000' : factor.toFixed(0)} 倍，再练练拆解！`),
              h('div.small', `思路：${it.hint}`)),
            h('button.btn.full', { onclick: () => { i++; next(); } }, i + 1 < items.length ? '下一题 →' : '看结果 🏁'));
          },
        }, '提交估计');
        root.append(h('div.game-top', h('span', '🧮 费米估算'), h('span.pill', `${i + 1} / ${items.length}`), h('span.pill', `⭐ ${total}`)),
          h('div.riddle', it.q),
          h('p.soft.small', `单位：${it.unit}。不用精确！在 2 倍以内 ⭐⭐⭐，4 倍以内 ⭐⭐，10 倍以内 ⭐。先把问题拆成几个能估的小数相乘。`),
          h('div.row', num, unit), submit, res);
      };
      next();
    },
  },
  {
    id: 'ev', icon: '🎰', name: '期望值决策', minLv: 3, desc: '两个选项哪个长期更划算？', skill: '期望值',
    run(root, finish, lv) {
      let i = 0, ok = 0;
      const N = 8;
      const desc = (o) => o.p === 100 ? `100% 得到 ${o.win} 金币` : `${o.p}% 得到 ${o.win} 金币，否则${o.lose < 0 ? `失去 ${-o.lose} 金币` : '什么也没有'}`;
      const next = () => {
        root.replaceChildren();
        if (i >= N) return finish({ score: ok, max: N, perfect: ok === N });
        const g = genEV(lv);
        const fb = h('div');
        const pick = (k) => {
          btns.forEach((b) => (b.disabled = true));
          const good = k === g.best;
          if (good) ok++;
          fb.append(h('div.feedback.' + (good ? 'ok' : 'bad'),
            h('div', good ? '✅ 选对了！' : '🤔 另一个长期更划算'),
            h('div.small', `A 的期望值 = ${g.A.ev.toFixed(1)}　B 的期望值 = ${g.B.ev.toFixed(1)}`),
            h('div.small.soft', '期望值 = 概率 × 收益 + (1 − 概率) × 损失。注意：只玩一次时，也要考虑能不能承受最坏结果。')),
          h('button.btn.full', { onclick: () => { i++; next(); } }, i + 1 < N ? '下一题 →' : '看结果 🏁'));
        };
        const btns = [h('button.ev-opt', { onclick: () => pick('A') }, h('b', 'A'), desc(g.A)), h('button.ev-opt', { onclick: () => pick('B') }, h('b', 'B'), desc(g.B))];
        root.append(h('div.game-top', h('span', '🎰 如果能玩 1000 次，选哪个？'), h('span.pill', `${i + 1} / ${N}`), h('span.pill', `✅ ${ok}`)), ...btns, fb);
      };
      next();
    },
  },
  {
    id: 'calib', icon: '🎯', name: '自信校准', minLv: 3, desc: '判断真假，并说出你有多确定', skill: '元认知 · 概率思维',
    run(root, finish, lv) {
      const items = bankFor(CALIBRATION, lv, 10);
      const recs = [];
      let i = 0;
      const next = () => {
        root.replaceChildren();
        if (i >= items.length) {
          recordCalib(recs);
          const b = brier(recs);
          const all = S().calib;
          const buckets = calibrationBuckets(all).filter((x) => x.n);
          const correct = recs.filter((r) => r.ok).length;
          root.append(h('div.panel',
            h('h3', `答对 ${correct} / ${recs.length}`),
            h('p', `本局 Brier 分数：${b.toFixed(3)}（0 最好，0.25 相当于瞎猜）`),
            h('p.soft.small', '校准得好的人：说"90%确定"的题，大约 90% 都答对；说"60%确定"的题，大约 60% 答对。'),
            h('table.calib', h('tr', h('th', '你说的把握'), h('th', '题数'), h('th', '实际正确率')),
              buckets.map((x) => h('tr', h('td', `${Math.round(x.p * 100)}%`), h('td', x.n), h('td', `${Math.round(x.rate * 100)}%`, x.rate < x.p - 0.15 ? ' 😬过度自信' : x.rate > x.p + 0.15 ? ' 🙈太谦虚' : ' 👍'))))),
          h('button.btn.full', { onclick: () => finish({ score: Math.max(0, Math.round((0.25 - b) * 40)), max: 10, perfect: b < 0.1 }) }, '完成 🏁'));
          return;
        }
        const it = items[i];
        let ans = null;
        const conf = h('input', { type: 'range', min: 50, max: 100, step: 10, value: 70 });
        const confLbl = h('b', '70%');
        conf.addEventListener('input', () => (confLbl.textContent = conf.value + '%'));
        const tBtn = h('button.opt', { onclick: () => { ans = true; tBtn.classList.add('sel'); fBtn.classList.remove('sel'); } }, '✔ 真');
        const fBtn = h('button.opt', { onclick: () => { ans = false; fBtn.classList.add('sel'); tBtn.classList.remove('sel'); } }, '✘ 假');
        const fb = h('div');
        const go = h('button.btn.full', {
          onclick: () => {
            if (ans === null) { toast('先选真或假'); return; }
            go.remove();
            const ok = ans === it.v;
            recs.push({ p: +conf.value / 100, ok });
            fb.append(h('div.feedback.' + (ok ? 'ok' : 'bad'), ok ? '✅ 答对了' : '❌ 答错了', `　正确答案：${it.v ? '真' : '假'}`),
              h('button.btn.full', { onclick: () => { i++; next(); } }, '下一题 →'));
          },
        }, '确定');
        root.append(h('div.game-top', h('span', '🎯 自信校准'), h('span.pill', `${i + 1} / ${items.length}`)),
          h('div.riddle', it.s), h('div.opts.two', tBtn, fBtn),
          h('div.conf', '我有多确定：', confLbl, conf, h('div.tiny.soft', '50% = 完全靠猜　100% = 绝对确定')), go, fb);
      };
      next();
    },
  },
];

export const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g]));
