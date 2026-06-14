import { totalCostIn } from './portfolioTotals.js';
import type { Position } from './deriveHoldings.js';
import type { RateMap } from '../types/exchange-rate.js';

const rates: RateMap = { USD_TWD: '30.0000000000', TWD_USD: '0.0333333333' };

function pos(currency: 'USD' | 'TWD', totalCost: string): Position {
  return {
    market: currency === 'USD' ? 'US' : 'TW',
    symbol: 'X',
    currency,
    quantity: '1.0000000000',
    totalCost,
    averageCost: totalCost,
    txCount: 1,
  };
}

describe('totalCostIn', () => {
  it('sums native costs converted to the display currency (TWD)', () => {
    // TWD 1000 + USD 100×30 = 3000 → 4000
    const r = totalCostIn([pos('TWD', '1000'), pos('USD', '100')], rates, 'TWD');
    expect(r).toBe('4000.0000000000');
  });

  it('returns null when rates are not ready', () => {
    expect(totalCostIn([pos('USD', '100')], null, 'TWD')).toBeNull();
  });

  it('returns zero for empty positions', () => {
    expect(totalCostIn([], rates, 'TWD')).toBe('0.0000000000');
  });

  it('needs no rate when every position is already in the target currency', () => {
    expect(totalCostIn([pos('TWD', '500'), pos('TWD', '250')], {}, 'TWD')).toBe('750.0000000000');
  });
});
