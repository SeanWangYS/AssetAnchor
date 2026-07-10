import { positionValuation } from './index';
import type { QuoteEntry } from '../quotes';
import type { Position } from '@assetanchor/shared';

const NOW = 1_700_000_000_000;
const FRESH = NOW - 60_000; // 1min ago
const STALE = NOW - 20 * 60_000; // 20min ago (>15min TTL)

function pos(p: Partial<Position> & Pick<Position, 'symbol'>): Position {
  return {
    market: 'TW',
    currency: 'TWD',
    quantity: '10.0000000000',
    totalCost: '1000.0000000000',
    averageCost: '100.0000000000',
    txCount: 1,
    realizedPnl: '0.0000000000',
    ...p,
  };
}
function quote(price: string, fetchedAtMs: number): QuoteEntry {
  return { price, prevClose: null, currency: 'TWD', fetchedAtMs };
}

describe('positionValuation', () => {
  it('有報價：市值/成本/未實現/報酬% 正確（原幣別）', () => {
    const v = positionValuation(pos({ symbol: 'A' }), quote('150', FRESH), NOW);
    expect(v).not.toBeNull();
    expect(v!.marketValue.toNumber()).toBe(1500); // 150 × 10
    expect(v!.cost.toNumber()).toBe(1000);
    expect(v!.unrealized.toNumber()).toBe(500);
    expect(v!.returnPct).toBeCloseTo(50, 6); // (150−100)/100
    expect(v!.stale).toBe(false);
  });

  it('無報價 → null（呼叫端降級「更新中…」）', () => {
    expect(positionValuation(pos({ symbol: 'A' }), undefined, NOW)).toBeNull();
  });

  it('過期報價 → stale=true，仍回市值（最後已知值）', () => {
    const v = positionValuation(pos({ symbol: 'A' }), quote('150', STALE), NOW);
    expect(v!.stale).toBe(true);
    expect(v!.marketValue.toNumber()).toBe(1500);
  });

  it('負報酬：現價低於均價', () => {
    const v = positionValuation(pos({ symbol: 'A' }), quote('80', FRESH), NOW);
    expect(v!.unrealized.toNumber()).toBe(-200); // 800 − 1000
    expect(v!.returnPct).toBeCloseTo(-20, 6);
  });

  it('均價為 0（防禦）→ returnPct 0，不除以零', () => {
    const v = positionValuation(
      pos({ symbol: 'A', averageCost: '0.0000000000', totalCost: '0.0000000000' }),
      quote('150', FRESH),
      NOW,
    );
    expect(v!.returnPct).toBe(0);
  });
});
