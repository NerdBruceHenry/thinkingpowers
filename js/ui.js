import { takeNewBadges } from './state.js';

// 简洁的 DOM 构建器：h('div.cls#id', {attrs}, children...)
export function h(tag, attrs, ...kids) {
  const [t, ...rest] = tag.split(/(?=[.#])/);
  const el = document.createElement(t || 'div');
  for (const r of rest) {
    if (r[0] === '.') el.classList.add(r.slice(1));
    else el.id = r.slice(1);
  }
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    kids.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      // CSS 自定义属性（--c）必须用 setProperty
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
      }
    }
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (k) => {
    if (k == null || k === false) return;
    if (Array.isArray(k)) k.forEach(add);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  };
  kids.forEach(add);
  return el;
}

export function toast(msg, ms = 2200) {
  const t = h('div.toast', msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

export function burst(emojis = ['⭐', '✨', '🌟', '💫']) {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const e = h('span.burst', emojis[i % emojis.length]);
    const ang = (Math.PI * 2 * i) / n;
    const dist = 90 + Math.random() * 90;
    e.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    e.style.setProperty('--dy', `${Math.sin(ang) * dist - 40}px`);
    document.body.append(e);
    setTimeout(() => e.remove(), 1100);
  }
}

export function modal(content, { onClose } = {}) {
  const close = () => { wrap.remove(); onClose?.(); };
  const wrap = h('div.modal-wrap', { onclick: (e) => { if (e.target === wrap) close(); } },
    h('div.modal', content, h('button.btn.ghost.full', { onclick: close, style: { marginTop: '14px' } }, '好的')));
  document.body.append(wrap);
  return close;
}

// 处理新获得的徽章
export function flushBadges() {
  const list = takeNewBadges();
  list.forEach((b, i) => setTimeout(() => {
    burst(['🏅', '⭐', '🎉']);
    modal(h('div.center',
      h('div.big-emoji', b.icon),
      h('h2', '获得新徽章！'),
      h('h3', b.name),
      h('p.soft', b.desc)));
  }, 400 + i * 300));
}

// 单选题组件
export function quiz(q, onAnswer) {
  let done = false;
  const fb = h('div.feedback');
  const opts = q.o.map((o, i) => h('button.opt', {
    onclick: () => {
      if (done) return;
      done = true;
      const ok = i === q.a;
      opts.forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add('right'); });
      if (!ok) opts[i].classList.add('wrong');
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '✅ 答对了！' : '🤔 再想想～正确答案已标出。') + (q.e ? `<br><span>${q.e}</span>` : '');
      onAnswer?.(ok, i);
    },
  }, o));
  return h('div.quiz', h('div.quiz-q', q.q), h('div.opts', opts), fb);
}

export function progressBar(pct, color) {
  return h('div.pbar', h('div.pfill', { style: { width: `${Math.round(pct * 100)}%`, background: color || '' } }));
}

export const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
