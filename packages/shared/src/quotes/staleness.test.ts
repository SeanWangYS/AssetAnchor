import { classifyQuoteStaleness, QUOTE_STALE_HARD_MS, QUOTE_STALE_SOFT_MS } from './staleness.js';

const NOW = Date.UTC(2026, 9, 21, 14, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('classifyQuoteStaleness', () => {
  it('exposes the 1h / 24h thresholds', () => {
    expect(QUOTE_STALE_SOFT_MS).toBe(HOUR);
    expect(QUOTE_STALE_HARD_MS).toBe(DAY);
  });

  it('is fresh when every quote is at most 1h old', () => {
    const r = classifyQuoteStaleness([NOW - 5 * MIN, NOW - 59 * MIN], NOW);
    expect(r.level).toBe('fresh');
    expect(r.oldestMs).toBe(NOW - 59 * MIN);
    expect(r.hardCount).toBe(0);
    expect(r.total).toBe(2);
  });

  it('lets the oldest quote decide the level', () => {
    const oldest = NOW - 3 * HOUR;
    const r = classifyQuoteStaleness(
      [NOW - 5 * MIN, NOW - 5 * MIN, oldest, NOW - 5 * MIN, NOW - 5 * MIN, NOW - 5 * MIN],
      NOW,
    );
    expect(r.level).toBe('soft');
    expect(r.oldestMs).toBe(oldest);
    expect(r.ageDays).toBe(0);
  });

  it('is hard beyond 24h and floors the age in days', () => {
    const stuck = NOW - (29 * DAY + 5 * HOUR);
    const r = classifyQuoteStaleness(
      Array.from({ length: 7 }, () => stuck),
      NOW,
    );
    expect(r).toEqual({ level: 'hard', oldestMs: stuck, ageDays: 29, hardCount: 7, total: 7 });
  });

  it('counts only the quotes past the hard threshold', () => {
    const r = classifyQuoteStaleness(
      [NOW - 5 * DAY, NOW - 2 * MIN, NOW - 2 * MIN, NOW - 30 * HOUR],
      NOW,
    );
    expect(r.level).toBe('hard');
    expect(r.hardCount).toBe(2);
    expect(r.total).toBe(4);
    expect(r.ageDays).toBe(5);
  });

  it('treats the thresholds as inclusive upper bounds', () => {
    expect(classifyQuoteStaleness([NOW - HOUR], NOW).level).toBe('fresh');
    expect(classifyQuoteStaleness([NOW - HOUR - 1], NOW).level).toBe('soft');
    expect(classifyQuoteStaleness([NOW - DAY], NOW).level).toBe('soft');
    expect(classifyQuoteStaleness([NOW - DAY - 1], NOW).level).toBe('hard');
  });

  it('returns fresh for an empty set', () => {
    expect(classifyQuoteStaleness([], NOW)).toEqual({
      level: 'fresh',
      oldestMs: null,
      ageDays: 0,
      hardCount: 0,
      total: 0,
    });
  });

  it('clamps future timestamps to zero age', () => {
    const r = classifyQuoteStaleness([NOW + 10 * DAY], NOW);
    expect(r.level).toBe('fresh');
    expect(r.ageDays).toBe(0);
    expect(r.hardCount).toBe(0);
  });
});
