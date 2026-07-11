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

describe('positionValuation — 報價幣別 vs 成本幣別分離（enable-crypto-quotes D9）', () => {
  const btcTwdLot = pos({
    symbol: 'BTC',
    market: 'CRYPTO',
    currency: 'TWD',
    quantity: '0.1500000000',
    totalCost: '12600.0000000000',
    averageCost: '84000.0000000000',
  });
  const usdQuote: QuoteEntry = {
    price: '64000.0000000000',
    prevClose: null,
    currency: 'USD',
    fetchedAtMs: FRESH,
  };

  it('USD 報價 × TWD lot：以 rates 換算到 lot 幣別再計市值/損益', () => {
    const rates = { USD_TWD: '32.0000000000', TWD_USD: '0.03125' };
    const v = positionValuation(btcTwdLot, usdQuote, NOW, rates);
    expect(v).not.toBeNull();
    // 64000 USD × 32 = 2,048,000 TWD；× 0.15 = 307,200 TWD（非把 USD 當 TWD 的 9,600）
    expect(v!.marketValue.currency).toBe('TWD');
    expect(v!.marketValue.toNumber()).toBeCloseTo(307200, 0);
    expect(v!.unrealized.toNumber()).toBeCloseTo(307200 - 12600, 0);
  });

  it('無 rates → 退 demo FX（USD↔TWD 30.95）仍可估值', () => {
    const v = positionValuation(btcTwdLot, usdQuote, NOW, null);
    expect(v).not.toBeNull();
    expect(v!.marketValue.toNumber()).toBeCloseTo(64000 * 30.95 * 0.15, 0);
  });

  it('同幣別（USD lot × USD 報價）不需 rates、行為不變', () => {
    const usdLot = pos({
      symbol: 'BTC',
      market: 'CRYPTO',
      currency: 'USD',
      quantity: '1.0000000000',
      totalCost: '64000.0000000000',
      averageCost: '64000.0000000000',
    });
    const v = positionValuation(usdLot, usdQuote, NOW);
    expect(v!.marketValue.currency).toBe('USD');
    expect(v!.marketValue.toNumber()).toBe(64000);
  });
});
