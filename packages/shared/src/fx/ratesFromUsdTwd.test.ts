import { ratesFromUsdTwd } from './ratesFromUsdTwd.js';

describe('ratesFromUsdTwd', () => {
  it('builds the six-key rate map with USDT pegged 1:1 to USD', () => {
    const r = ratesFromUsdTwd('32');
    expect(Object.keys(r).sort()).toEqual(
      ['TWD_USD', 'TWD_USDT', 'USDT_TWD', 'USDT_USD', 'USD_TWD', 'USD_USDT'].sort(),
    );
    expect(r.USD_TWD).toBe('32.0000000000');
    expect(r.USDT_TWD).toBe('32.0000000000');
    expect(r.TWD_USD).toBe('0.0312500000');
    expect(r.TWD_USDT).toBe('0.0312500000');
    expect(r.USDT_USD).toBe('1.0000000000');
    expect(r.USD_USDT).toBe('1.0000000000');
  });

  it('keeps 10-decimal canonical strings', () => {
    expect(ratesFromUsdTwd('32.595').TWD_USD).toBe('0.0306795521');
  });
});
