import { isFresh, sanitizeQuote } from './quote.js';

describe('sanitizeQuote', () => {
  it('accepts a valid positive price and normalizes to Money string', () => {
    const r = sanitizeQuote({ price: 180.5 }, 'USD');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.price).toBe('180.5000000000');
  });

  it('accepts a string price', () => {
    const r = sanitizeQuote({ price: '1234.5' }, 'TWD');
    expect(r.ok && r.value.price).toBe('1234.5000000000');
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('rejects non-positive / non-finite price %p', (p) => {
    expect(sanitizeQuote({ price: p }, 'USD')).toEqual({ ok: false, reason: 'invalid_price' });
  });

  it('rejects an unparseable price', () => {
    expect(sanitizeQuote({ price: 'abc' }, 'USD')).toEqual({ ok: false, reason: 'invalid_price' });
  });

  it('normalizes optional OHLC / prevClose when present, null when absent', () => {
    const r = sanitizeQuote({ price: 100, open: 99, high: 101, low: 98, prevClose: 97.5 }, 'USD');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.open).toBe('99.0000000000');
      expect(r.value.high).toBe('101.0000000000');
      expect(r.value.low).toBe('98.0000000000');
      expect(r.value.prevClose).toBe('97.5000000000');
    }
    const bare = sanitizeQuote({ price: 100 }, 'USD');
    expect(bare.ok && bare.value.open).toBeNull();
  });

  it('rejects when an optional numeric field is present but non-finite', () => {
    expect(sanitizeQuote({ price: 100, high: NaN }, 'USD')).toEqual({
      ok: false,
      reason: 'invalid_field',
    });
  });
});

describe('isFresh', () => {
  const now = 1_700_000_000_000; // fixed ms
  it('is fresh within the TTL window', () => {
    expect(isFresh(now - 5 * 60_000, now)).toBe(true); // 5 min ago
  });
  it('is stale past the TTL (default 15 min)', () => {
    expect(isFresh(now - 16 * 60_000, now)).toBe(false);
  });
  it('treats exactly TTL as fresh (boundary inclusive)', () => {
    expect(isFresh(now - 15 * 60_000, now)).toBe(true);
  });
  it('treats a future timestamp as not fresh (clock skew / bad data)', () => {
    expect(isFresh(now + 60_000, now)).toBe(false);
  });
  it('honors a custom TTL', () => {
    expect(isFresh(now - 3 * 60_000, now, 2)).toBe(false);
    expect(isFresh(now - 1 * 60_000, now, 2)).toBe(true);
  });
});
