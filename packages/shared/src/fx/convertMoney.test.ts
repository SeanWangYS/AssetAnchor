import { convertMoney } from './convertMoney.js';
import { Money } from '../money/index.js';
import type { RateMap } from '../types/exchange-rate.js';

const rates: RateMap = {
  USD_TWD: '30.0000000000',
  TWD_USD: '0.0333333333',
};

describe('convertMoney', () => {
  it('converts USD → TWD using the USD_TWD rate', () => {
    const r = convertMoney(new Money('100', 'USD'), rates, 'TWD');
    expect(r.currency).toBe('TWD');
    expect(r.toDecimalString()).toBe('3000.0000000000');
  });

  it('converts TWD → USD using the TWD_USD rate', () => {
    const r = convertMoney(new Money('3000', 'TWD'), rates, 'USD');
    expect(r.currency).toBe('USD');
    // 3000 × 0.0333333333 = 99.9999999
    expect(r.toDecimalString()).toBe('99.9999999000');
  });

  it('returns an equal value when source and target currency match', () => {
    const src = new Money('1805', 'USD');
    const r = convertMoney(src, rates, 'USD');
    expect(r.currency).toBe('USD');
    expect(r.equals(src)).toBe(true);
  });

  it('fails loud when the required rate key is missing', () => {
    expect(() => convertMoney(new Money('1', 'USD'), {}, 'TWD')).toThrow(/USD_TWD/);
  });

  it('is deterministic for the same input', () => {
    const a = convertMoney(new Money('100', 'USD'), rates, 'TWD');
    const b = convertMoney(new Money('100', 'USD'), rates, 'TWD');
    expect(a.equals(b)).toBe(true);
  });

  it('outputs a 10-decimal string', () => {
    const r = convertMoney(new Money('1', 'USD'), rates, 'TWD');
    expect(r.toDecimalString()).toMatch(/^\d+\.\d{10}$/);
  });
});
