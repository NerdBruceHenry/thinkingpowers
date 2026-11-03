import { S, setProfile, exportData, importData, resetAll, level, badgeCtx } from '../state.js';
import { h, toast } from '../ui.js';
import { setTitle } from '../app.js';
import { LEVELS, DOMAINS, suggestLevel, levelInfo } from '../data/meta.js';
import { CARDS } from '../data/cards/index.js';
import { domainStats, dayKey, addDays } from '../logic.js';

let unlocked = false;

export function renderParent(root) {
  setTitle('👨‍👩‍👧 家长中心');
  if (!unlocked) {
    const a = 6 + Math.floor(Math.random() * 7), b = 12 + Math.floor(Math.random() * 8);
    const inp = h('input.input', { type: 'number', placeholder: '答案' });
    const check = () => { if (+inp.value === a * b) { unlocked = true; root.replaceChildren(); renderParent(root); } else toast('答案不对哦'); };
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && check());
    root.append(h('div.panel.center', h('div.big-emoji', '🔐'), h('h3', '家长验证'), h('p', `${a} × ${b} = ?`), inp, h('button.btn.full', { onclick: check }, '进入')));
    return;
  }
  const s = S();
  const lv = level();
  const ctx = badgeCtx();

  // 概况
  const last7 = Array.from({ length: 7 }, (_, i) => s.days[addDays(dayKey(), -i)] || 0);
  const weekDays = last7.filter((x) => x > 0).length;
  const stats = domainStats(CARDS, s.cards, DOMAINS, lv).sort((x, y) => x.pct - y.pct);
  const weak = stats.filter((d) => d.total).slice(0, 3);
  root.append(h('div.panel',
    h('h3', '📊 学习概况'),
    h('ul.small',
      h('li', `最近 7 天学习了 ${weekDays} 天，共 ${last7.reduce((x, y) => x + y, 0)} XP`),
      h('li', `已解锁 ${ctx.learned} / ${CARDS.length} 张卡，完成实践 ${ctx.practiced} 次`),
      h('li', `复习答对 ${s.stats.reviewOk} 次 / 答错 ${s.stats.reviewBad} 次；脑力游戏 ${s.stats.gamesPlayed} 局；思辨 ${s.stats.talks} 次`),
      h('li', `建议多关注的星球：${weak.map((d) => `${d.icon}${d.name}`).join('、')}`))));

  // 设置
  const name = h('input.input', { value: s.profile.name, maxlength: 12 });
  const year = h('input.input', { type: 'number', value: s.profile.birthYear || '', placeholder: '出生年份' });
  const sel = h('select.input', LEVELS.map((L) => h('option', { value: L.lv, selected: L.lv === lv }, `${L.icon} ${L.name}（${L.age} · ${L.grade}）`)));
  const sug = h('p.soft.small');
  const upd = () => { const y = +year.value; sug.textContent = y > 1990 ? `按年龄建议：${levelInfo(suggestLevel(y)).icon} ${levelInfo(suggestLevel(y)).name}` : ''; };
  year.addEventListener('input', upd); upd();
  root.append(h('div.panel',
    h('h3', '⚙️ 设置'),
    h('label.small', '名字'), name,
    h('label.small', '出生年份'), year, sug,
    h('label.small', '成长阶段（决定推荐难度；孩子可以提前学习下一阶段的内容）'), sel,
    h('button.btn.full', {
      onclick: () => {
        setProfile({ name: name.value.trim() || s.profile.name, birthYear: +year.value || null, level: +sel.value });
        toast('已保存');
      },
    }, '保存设置')));

  // 家长指南
  root.append(h('div.panel.guide',
    h('h3', '🧭 给家长的使用指南'),
    h('p', '这个工具的设计基于认知科学和思维教育研究，几条核心原则：'),
    h('ol',
      h('li', h('b', '迁移比知道更重要。'), '每张卡都有"试一试"——请陪孩子在真实生活里用出来，并鼓励写实践记录。会背 100 个概念不如用好 10 个。'),
      h('li', h('b', '少给答案，多问为什么。'), '孩子说出观点时，追问"你是怎么知道的？""有没有别的可能？"。思辨时刻没有标准答案。'),
      h('li', h('b', '表扬过程，而不是聪明。'), '说"你换了三种方法，真有耐心"，而不是"你真聪明"（成长型思维）。'),
      h('li', h('b', '间隔重复 + 主动回忆。'), '复习功能按遗忘曲线安排，每天几分钟比周末突击有效得多。'),
      h('li', h('b', '每天 15 分钟，贵在坚持。'), '固定时间（如晚饭后）完成每日任务；连续打卡和宝箱是为了帮助形成习惯。'),
      h('li', h('b', '以身作则。'), '孩子最好的思维老师是会说"我错了""我不确定，我们查查看"的父母。'),
      h('li', h('b', '关于"脑力训练游戏"。'), '研究显示，单纯的记忆/反应类训练游戏很难迁移到真实能力。这里的游戏都对应可迁移的思维策略（估算、识别谬误、校准自信等），玩后请聊一聊"生活里哪里能用"。')),
    h('h4', '🗺️ 内容地图'),
    h('p.small', '12 颗思维星球 × 6 个成长阶段：小学低年级重故事和习惯；中高年级认识偏差、学会决策；初中进入逻辑、科学方法、系统思维、AI 素养；高中学习概率、伦理、多元模型；大学阶段关注人生设计与思维体系。前 50 张卡来自《思维超能力手册》五册，并补充了每张卡的闯关题。')));

  // 备份
  const file = h('input', { type: 'file', accept: 'application/json', style: { display: 'none' } });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try { importData(await f.text()); toast('导入成功'); location.reload(); } catch (e) { toast('导入失败：' + e.message); }
  });
  root.append(h('div.panel',
    h('h3', '💾 数据备份'),
    h('p.soft.small', '所有数据只保存在这台设备的浏览器里（不上传任何服务器）。换设备或清理浏览器前，请先导出备份。'),
    h('div.row',
      h('button.btn.ghost', {
        onclick: () => {
          const blob = new Blob([exportData()], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `思维超能力备份-${s.profile.name}-${dayKey()}.json` });
          document.body.append(a); a.click(); a.remove();
        },
      }, '⬇️ 导出备份'),
      h('button.btn.ghost', { onclick: () => file.click() }, '⬆️ 导入备份')),
    file,
    h('button.btn.danger.full', {
      onclick: () => {
        if (confirm('确定要清空所有学习记录吗？此操作不可恢复！') && confirm('再确认一次：真的清空？')) { resetAll(); location.hash = ''; location.reload(); }
      },
    }, '🗑️ 清空所有数据')));
}
