import classic1 from './classic1.js';
import classic2 from './classic2.js';
import expand1 from './expand1.js';
import expand2 from './expand2.js';
import expand3 from './expand3.js';

export const CARDS = [...classic1, ...classic2, ...expand1, ...expand2, ...expand3]
  .sort((a, b) => a.lv - b.lv);

export const cardById = Object.fromEntries(CARDS.map((c) => [c.id, c]));
