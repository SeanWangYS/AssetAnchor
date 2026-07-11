import { buildDailyRates } from './buildDailyRates';

describe('buildDailyRates', () => {
  const rates = buildDailyRates('32.5');

  it('USD_TWD 為來源值、TWD_USD 為倒數（皆 10 位小數 string）', () => {
    expect(rates.USD_TWD).toBe('32.5000000000');
    expect(rates.TWD_USD).toBe('0.0307692308');
  });

  it('USDT 四鍵以 1:1 釘 USD 衍生（enable-crypto-quotes design D3）', () => {
    expect(rates.USDT_TWD).toBe(rates.USD_TWD);
    expect(rates.TWD_USDT).toBe(rates.TWD_USD);
    expect(rates.USDT_USD).toBe('1.0000000000');
    expect(rates.USD_USDT).toBe('1.0000000000');
  });

  it('恰好六鍵（不夾帶其他幣別）', () => {
    expect(Object.keys(rates).sort()).toEqual([
      'TWD_USD',
      'TWD_USDT',
      'USDT_TWD',
      'USDT_USD',
      'USD_TWD',
      'USD_USDT',
    ]);
  });
});
