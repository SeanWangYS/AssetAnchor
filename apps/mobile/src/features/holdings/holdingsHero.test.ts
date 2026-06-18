import { computeHoldingsHero, type HeroPosition, type QuoteResolver } from './holdingsHero';
import type { QuoteEntry } from '../../services/quotes';

// 固定時鐘：fresh = now-1min；stale = now-20min（TTL 15min）
const NOW = 1_700_000_000_000;
const FRESH = NOW - 60_000;
const STALE = NOW - 20 * 60_000;

function pos(p: Partial<HeroPosition> & Pick<HeroPosition, 'symbol'>): HeroPosition {
  return {
    market: 'TW',
    currency: 'TWD',
    quantity: '0',
    totalCost: '0.0000000000',
    ...p,
  };
}

function quote(price: string, prevClose: string | null, fetchedAtMs: number): QuoteEntry {
  return { price, prevClose, currency: 'TWD', fetchedAtMs };
}

/** 由 (market_symbol) → QuoteEntry 建 resolver。 */
function resolver(map: Record<string, QuoteEntry>): QuoteResolver {
  return (market, symbol) => map[`${market}_${symbol}`];
}

describe('computeHoldingsHero', () => {
  it('全部新鮮、同幣別：彙總真值 + 今日損益', () => {
    const positions = [
      pos({ symbol: 'A', quantity: '10', totalCost: '1000.0000000000' }),
      pos({ symbol: 'B', quantity: '5', totalCost: '500.0000000000' }),
    ];
    const quotes = resolver({
      TW_A: quote('150', '140', FRESH), // mv 1500, today +10*10=+100
      TW_B: quote('80', '100', FRESH), //  mv  400, today -20*5=-100
    });
    const hero = computeHoldingsHero(positions, quotes, {}, 'TWD', NOW);
    expect(hero).not.toBeNull();
    expect(hero!.value).toBe(1900);
    expect(hero!.cost).toBe(1500);
    expect(hero!.unrealized).toBe(400);
    expect(hero!.returnPct).toBeCloseTo(26.6667, 3);
    expect(hero!.includedCount).toBe(2);
    expect(hero!.pendingCount).toBe(0);
    expect(hero!.anyStale).toBe(false);
    expect(hero!.todayKnown).toBe(true);
    expect(hero!.today).toBe(0); // +100 -100
  });

  it('部分缺報價：只加總有報價者、pendingCount 計數、今日損益不計', () => {
    const positions = [
      pos({ symbol: 'A', quantity: '10', totalCost: '1000.0000000000' }),
      pos({ symbol: 'B', quantity: '5', totalCost: '500.0000000000' }),
    ];
    const quotes = resolver({ TW_A: quote('150', '140', FRESH) }); // B 缺報價
    const hero = computeHoldingsHero(positions, quotes, {}, 'TWD', NOW);
    expect(hero).not.toBeNull();
    expect(hero!.value).toBe(1500);
    expect(hero!.includedCount).toBe(1);
    expect(hero!.pendingCount).toBe(1);
    expect(hero!.today).toBeNull();
    expect(hero!.todayKnown).toBe(false);
  });

  it('過期報價：仍納入市值但標 anyStale，今日損益不以過期價計算', () => {
    const positions = [pos({ symbol: 'A', quantity: '10', totalCost: '1000.0000000000' })];
    const quotes = resolver({ TW_A: quote('150', '140', STALE) });
    const hero = computeHoldingsHero(positions, quotes, {}, 'TWD', NOW);
    expect(hero).not.toBeNull();
    expect(hero!.value).toBe(1500); // 過期值仍顯示
    expect(hero!.anyStale).toBe(true);
    expect(hero!.includedCount).toBe(1);
    expect(hero!.pendingCount).toBe(0);
    expect(hero!.today).toBeNull(); // 不用過期價算今日
    expect(hero!.todayKnown).toBe(false);
  });

  it('完全無任何報價：回 null（畫面顯示載入中）', () => {
    const positions = [pos({ symbol: 'A', quantity: '10', totalCost: '1000.0000000000' })];
    expect(computeHoldingsHero(positions, resolver({}), {}, 'TWD', NOW)).toBeNull();
  });

  it('空持倉：回 null', () => {
    expect(computeHoldingsHero([], resolver({}), {}, 'TWD', NOW)).toBeNull();
  });

  it('匯率未就緒（rates=null）：回 null', () => {
    const positions = [pos({ symbol: 'A', quantity: '10', totalCost: '1000.0000000000' })];
    const quotes = resolver({ TW_A: quote('150', '140', FRESH) });
    expect(computeHoldingsHero(positions, quotes, null, 'TWD', NOW)).toBeNull();
  });

  it('跨幣別：USD 持倉以 demo 匯率換算成 TWD 顯示', () => {
    const positions = [
      pos({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '2',
        totalCost: '100.0000000000',
      }),
    ];
    const quotes = resolver({
      US_AAPL: { price: '100', prevClose: '100', currency: 'USD', fetchedAtMs: FRESH },
    });
    const hero = computeHoldingsHero(positions, quotes, {}, 'TWD', NOW);
    expect(hero).not.toBeNull();
    expect(hero!.value).toBeCloseTo(6190, 2); // 100*2 USD * 30.95
    expect(hero!.cost).toBeCloseTo(3095, 2); // 100 USD * 30.95
  });
});
