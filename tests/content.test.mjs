import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../js/data/cards/index.js';
import { DOMAINS, LEVELS, rankFor, suggestLevel } from '../js/data/meta.js';
import { FALLACIES, FALLACY_TYPES, BIASES, BIAS_TYPES, FERMI, CALIBRATION, LATERAL, LOGIC, CREATIVE } from '../js/data/games.js';
import { TALKS } from '../js/data/talks.js';
import { BADGES } from '../js/data/badges.js';

const domainIds = new Set(DOMAINS.map((d) => d.id));

test('cards are well-formed', () => {
  const ids = new Set();
  for (const c of CARDS) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.ok(domainIds.has(c.d), `${c.id}: bad domain ${c.d}`);
    assert.ok(c.lv >= 1 && c.lv <= 6, `${c.id}: bad level`);
    for (const k of ['icon', 'name', 'one', 'story', 'try']) assert.ok(c[k], `${c.id}: missing ${k}`);
    assert.ok(Array.isArray(c.q) && c.q.length >= 1, `${c.id}: needs a quiz`);
    for (const q of c.q) {
      assert.ok(q.o.length >= 2 && q.a >= 0 && q.a < q.o.length, `${c.id}: bad answer index`);
      assert.equal(new Set(q.o).size, q.o.length, `${c.id}: duplicate options`);
    }
    // 标签配对，避免破坏页面结构
    for (const tag of ['b', 'mark']) {
      const open = (c.story.match(new RegExp(`<${tag}>`, 'g')) || []).length + (c.try.match(new RegExp(`<${tag}>`, 'g')) || []).length;
      const close = (c.story.match(new RegExp(`</${tag}>`, 'g')) || []).length + (c.try.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.equal(open, close, `${c.id}: unbalanced <${tag}>`);
    }
  }
});

test('all 50 handbook superpowers are included', () => {
  const src = CARDS.filter((c) => c.src);
  assert.equal(src.length, 50);
  for (const ep of ['ep1', 'ep2', 'ep3', 'ep4', 'ep5']) assert.equal(src.filter((c) => c.src === ep).length, 10, ep);
});

test('content covers every domain and every level', () => {
  assert.ok(CARDS.length >= 120, `only ${CARDS.length} cards`);
  for (const d of DOMAINS) assert.ok(CARDS.filter((c) => c.d === d.id).length >= 6, `domain ${d.id} too thin`);
  for (const L of LEVELS) assert.ok(CARDS.filter((c) => c.lv === L.lv).length >= 8, `level ${L.lv} too thin`);
});

test('game banks are valid', () => {
  for (const f of FALLACIES) assert.ok(FALLACY_TYPES[f.t], f.s);
  for (const b of BIASES) assert.ok(BIAS_TYPES[b.t], b.s);
  for (const f of FERMI) assert.ok(f.a > 0 && f.unit && f.hint, f.q);
  for (const c of CALIBRATION) assert.equal(typeof c.v, 'boolean');
  for (const l of LATERAL) assert.ok(l.q && l.a && Array.isArray(l.h));
  for (const q of LOGIC) assert.ok(q.a >= 0 && q.a < q.o.length, q.q);
  for (const bank of [FALLACIES, BIASES, FERMI, CALIBRATION, LATERAL, LOGIC, CREATIVE, TALKS]) {
    assert.ok(bank.every((x) => x.lv >= 1 && x.lv <= 6));
  }
  // 每个阶段都至少有一个思辨话题
  for (const L of LEVELS) assert.ok(TALKS.some((t) => t.lv === L.lv));
});

test('badges and ranks', () => {
  assert.equal(new Set(BADGES.map((b) => b.id)).size, BADGES.length);
  assert.equal(rankFor(0).index, 0);
  assert.equal(rankFor(150).name, '好奇探险家');
  assert.equal(rankFor(1e9).next, null);
  assert.equal(suggestLevel(null), 1);
  assert.equal(suggestLevel(2016, new Date(2026, 10, 3)), 2);
  assert.equal(suggestLevel(2012, new Date(2026, 10, 3)), 4);
  assert.equal(suggestLevel(2005, new Date(2026, 10, 3)), 6);
});
