import { CARDS, cardById } from './data/cards/index.js';
import { DOMAINS } from './data/meta.js';
import { BADGES } from './data/badges.js';
import { TALKS } from './data/talks.js';
import { dayKey, updateStreak, srsNext, recommendCard, hashStr, brier, bankFor, mulberry32, dueCards } from './logic.js';

const KEY = 'thinkingpowers-v1';
export const GAME_IDS = ['pattern', 'fallacy', 'bias', 'fermi', 'logic', 'lateral', 'creative', 'ev', 'calib'];

function fresh() {
  return {
    v: 1,
    profile: null, // { name, avatar, level, birthYear, created }
    xp: 0,
    stars: 0,
    streak: { count: 0, last: null, best: 0 },
    cards: {}, // id → { learned, practiced, srs: {box, due}, fav }
    journal: [], // { ts, type: 'practice'|'talk'|'note', cardId?, text }
    games: {}, // id → { plays, best, perfect }
    calib: [], // { p, ok }
    daily: null, // { date, picks: {card, game, talk}, steps: {}, chest }
    days: {}, // date → xp
    badges: {}, // id → ts
    stats: { reviewOk: 0, reviewBad: 0, gamesPlayed: 0, talks: 0, dailyDone: 0, levelUps: 0 },
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* 无痕模式等 */ }
  return fresh();
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((f) => f(state));
}
export const S = () => state;
export const onChange = (f) => listeners.add(f);
export const level = () => state.profile?.level || 1;
export const today = () => dayKey();

// ── 档案 ──
export function setProfile(p) {
  const prevLv = state.profile?.level;
  state.profile = { ...(state.profile || { created: Date.now() }), ...p };
  if (prevLv && p.level && p.level > prevLv) state.stats.levelUps++;
  if (state.daily) state.daily.picks.card = null; // 阶段改变后重新推荐
  save();
}

// ── 经验 / 星星 ──
const newBadgeQueue = [];
export function gain(xp, stars = 0) {
  state.xp += xp;
  state.stars += stars;
  const t = today();
  state.days[t] = (state.days[t] || 0) + xp;
  state.streak = updateStreak(state.streak, t);
  checkBadges();
  save();
}
export const takeNewBadges = () => newBadgeQueue.splice(0);

export function badgeCtx() {
  const learnedIds = Object.keys(state.cards).filter((id) => state.cards[id].learned && cardById[id]);
  const domainsLearned = Object.fromEntries(DOMAINS.map((d) => [d.id, 0]));
  learnedIds.forEach((id) => domainsLearned[cardById[id].d]++);
  return {
    learned: learnedIds.length,
    practiced: Object.values(state.cards).filter((c) => c.practiced).length,
    domainsLearned,
    cardsTotal: CARDS.length,
    gamesTried: GAME_IDS.filter((g) => state.games[g]?.plays).length,
    gamesTotal: GAME_IDS.length,
    calibN: state.calib.length,
    calibBrier: brier(state.calib),
  };
}
function checkBadges() {
  const ctx = badgeCtx();
  for (const b of BADGES) {
    if (!state.badges[b.id] && b.check(state, ctx)) {
      state.badges[b.id] = Date.now();
      newBadgeQueue.push(b);
    }
  }
}

// ── 卡片 ──
export const cardProg = (id) => state.cards[id] || {};
export function learnCard(id) {
  const c = (state.cards[id] ||= {});
  if (c.learned) return false;
  c.learned = Date.now();
  c.srs = srsNext(null, true, today());
  markStep('card', id);
  gain(20, 1);
  return true;
}
export function practiceCard(id, text) {
  const c = (state.cards[id] ||= {});
  const first = !c.practiced;
  c.practiced = Date.now();
  state.journal.unshift({ ts: Date.now(), type: 'practice', cardId: id, text });
  gain(first ? 30 : 10, first ? 2 : 0);
}
export function toggleFav(id) {
  const c = (state.cards[id] ||= {});
  c.fav = !c.fav;
  save();
}
export function reviewAnswer(id, correct) {
  const c = (state.cards[id] ||= {});
  c.srs = srsNext(c.srs, correct, today());
  if (correct) state.stats.reviewOk++; else state.stats.reviewBad++;
  gain(correct ? 5 : 1);
}
export const due = () => dueCards(state.cards, today()).filter((id) => cardById[id]);

// ── 游戏 ──
export function recordGame(id, score, extra = {}) {
  const g = (state.games[id] ||= { plays: 0, best: 0, perfect: 0 });
  g.plays++;
  g.best = Math.max(g.best, score);
  if (extra.perfect) g.perfect++;
  g.last = Date.now();
  state.stats.gamesPlayed++;
  markStep('game', id);
  gain(10 + Math.round(score), extra.stars || 0);
}
export function recordCalib(records) {
  state.calib.push(...records);
  if (state.calib.length > 400) state.calib = state.calib.slice(-400);
}

// ── 思辨 / 日记 ──
export function recordTalk(q, text) {
  state.stats.talks++;
  state.journal.unshift({ ts: Date.now(), type: 'talk', text: text || '', q });
  markStep('talk');
  gain(15, 1);
}
export function addNote(text) {
  state.journal.unshift({ ts: Date.now(), type: 'note', text });
  gain(5);
}
export function deleteJournal(ts) {
  state.journal = state.journal.filter((j) => j.ts !== ts);
  save();
}

// ── 每日任务 ──
export function ensureDaily() {
  const t = today();
  if (!state.daily || state.daily.date !== t) {
    state.daily = { date: t, picks: {}, steps: {}, chest: false };
  }
  const d = state.daily;
  const lv = level();
  const seed = hashStr(t + (state.profile?.name || ''));
  if (!d.picks.card || cardProg(d.picks.card).learned && !d.steps.card) {
    const rec = recommendCard(CARDS, state.cards, lv, seed);
    d.picks.card = rec?.id || null;
  }
  if (!d.picks.game) {
    const games = GAME_IDS.filter((g) => gameMinLv[g] <= lv);
    d.picks.game = games[seed % games.length];
  }
  if (d.picks.talk == null) {
    const pool = bankFor(TALKS.map((x, i) => ({ ...x, i })), lv, 99, mulberry32(seed));
    d.picks.talk = pool[0].i;
  }
  return d;
}
export const gameMinLv = { pattern: 1, lateral: 1, creative: 1, logic: 2, fallacy: 2, bias: 2, fermi: 2, ev: 3, calib: 3 };

function markStep(step) {
  const d = state.daily;
  if (!d || d.date !== today()) return;
  d.steps[step] = true;
}
export function markReviewStep() { ensureDaily(); markStep('review'); save(); }
export function openChest() {
  const d = state.daily;
  if (!d || d.chest) return 0;
  d.chest = true;
  state.stats.dailyDone++;
  const bonus = 3 + (hashStr(d.date) % 6);
  gain(30, bonus);
  return bonus;
}

// ── 备份 ──
export function exportData() { return JSON.stringify(state, null, 1); }
export function importData(json) {
  const obj = JSON.parse(json);
  if (!obj || typeof obj !== 'object' || !('cards' in obj)) throw new Error('不是有效的备份文件');
  state = { ...fresh(), ...obj };
  save();
}
export function resetAll() { state = fresh(); save(); }
