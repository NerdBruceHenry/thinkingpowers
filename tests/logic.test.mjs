import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, daysBetween, updateStreak, srsNext, SRS_STEPS, dueCards, recommendCard, canOpen,
  fermiScore, brier, calibrationBuckets, genPattern, genEV, mulberry32, bankFor, formatBig,
} from '../js/logic.js';

test('dates', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysBetween('2026-03-01', '2026-03-31'), 30);
});

test('streak', () => {
  let s = updateStreak(null, '2026-11-01');
  assert.equal(s.count, 1);
  s = updateStreak(s, '2026-11-01');
  assert.equal(s.count, 1);
  s = updateStreak(s, '2026-11-02');
  assert.equal(s.count, 2);
  s = updateStreak(s, '2026-11-05');
  assert.equal(s.count, 1);
  assert.equal(s.best, 2);
});

test('srs follows the forgetting-curve steps and resets on mistakes', () => {
  let srs = srsNext(null, true, '2026-11-01');
  assert.deepEqual(srs, { box: 0, due: '2026-11-02' });
  srs = srsNext(srs, true, '2026-11-02');
  assert.equal(srs.box, 1);
  assert.equal(srs.due, addDays('2026-11-02', SRS_STEPS[1]));
  srs = srsNext(srs, false, '2026-11-04');
  assert.equal(srs.box, 0);
  let top = { box: SRS_STEPS.length - 1, due: 'x' };
  assert.equal(srsNext(top, true, '2026-11-01').box, SRS_STEPS.length - 1);
  const prog = { a: { learned: 1, srs: { due: '2026-11-01' } }, b: { learned: 1, srs: { due: '2026-12-01' } }, c: { learned: 0 } };
  assert.deepEqual(dueCards(prog, '2026-11-03'), ['a']);
});

test('recommendation prefers lowest level and least-learned domain', () => {
  const cards = [
    { id: 'x1', d: 'a', lv: 1 }, { id: 'x2', d: 'a', lv: 1 }, { id: 'y1', d: 'b', lv: 1 }, { id: 'z', d: 'c', lv: 3 },
  ];
  const r = recommendCard(cards, { x1: { learned: 1 } }, 2, 0);
  assert.equal(r.id, 'y1');
  const all = recommendCard(cards, { x1: { learned: 1 }, x2: { learned: 1 }, y1: { learned: 1 } }, 2, 0);
  assert.equal(all.id, 'z'); // next level allowed when current is finished
  assert.equal(recommendCard(cards, { x1: { learned: 1 }, x2: { learned: 1 }, y1: { learned: 1 }, z: { learned: 1 } }, 2), null);
  assert.ok(canOpen({ lv: 3 }, 2));
  assert.ok(!canOpen({ lv: 4 }, 2));
});

test('fermi scoring by order of magnitude', () => {
  assert.equal(fermiScore(100, 100).stars, 3);
  assert.equal(fermiScore(190, 100).stars, 3);
  assert.equal(fermiScore(30, 100).stars, 2);
  assert.equal(fermiScore(1000, 100).stars, 1);
  assert.equal(fermiScore(5000, 100).stars, 0);
  assert.equal(fermiScore(0, 100).stars, 0);
  assert.equal(formatBig(150000000), '1.5亿');
  assert.equal(formatBig(36000), '3.6万');
});

test('brier score and calibration buckets', () => {
  assert.equal(brier([]), null);
  assert.equal(brier([{ p: 1, ok: true }]), 0);
  assert.equal(brier([{ p: 0.5, ok: false }]), 0.25);
  const b = calibrationBuckets([{ p: 0.9, ok: true }, { p: 0.9, ok: false }, { p: 0.6, ok: true }]);
  assert.equal(b.find((x) => x.p === 0.9).rate, 0.5);
  assert.equal(b.find((x) => x.p === 0.6).n, 1);
});

test('pattern generator: answer is among 4 distinct options for all levels', () => {
  for (let lv = 1; lv <= 6; lv++) {
    const rng = mulberry32(lv * 99);
    for (let i = 0; i < 400; i++) {
      const p = genPattern(lv, rng);
      assert.equal(p.shown.length, 5);
      assert.equal(new Set(p.options).size, 4, JSON.stringify(p));
      assert.ok(p.options.includes(p.answer));
      assert.ok(p.shown.every(Number.isFinite));
    }
  }
});

test('EV generator: best option has the higher expected value', () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 500; i++) {
    const g = genEV(1 + (i % 6), rng);
    const best = g.best === 'A' ? g.A : g.B;
    const other = g.best === 'A' ? g.B : g.A;
    assert.ok(best.ev >= other.ev);
  }
});

test('bankFor respects level', () => {
  const bank = [{ lv: 1 }, { lv: 2 }, { lv: 3 }, { lv: 5 }];
  const got = bankFor(bank, 2, 10, mulberry32(1));
  assert.ok(got.every((x) => x.lv <= 2));
  assert.equal(bankFor([{ lv: 3 }], 1, 5).length, 1); // falls back to the easiest items
});
