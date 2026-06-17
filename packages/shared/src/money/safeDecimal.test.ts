import { describe, expect, it } from '@jest/globals';
import { toSafeDecimalString } from './safeDecimal.js';

describe('toSafeDecimalString（僅缺值 fail-soft；損毀交給 Money fail-loud）', () => {
  it('缺值（undefined / null）→ fallback 0', () => {
    expect(toSafeDecimalString(undefined)).toBe('0');
    expect(toSafeDecimalString(null)).toBe('0');
  });

  it('合法十進位字串原樣回（不重格式化、保精度）', () => {
    expect(toSafeDecimalString('123.45')).toBe('123.45');
    expect(toSafeDecimalString('0.0000000000')).toBe('0.0000000000');
    expect(toSafeDecimalString('-5.5')).toBe('-5.5');
  });

  it('present-but-invalid 原樣通過（不在此歸零，交由 Money 擲錯）', () => {
    // 這些值「存在」→ 視為 corruption，不該被靜默歸零；本函式原樣回，由 Money.fromDecimalString fail-loud。
    expect(toSafeDecimalString('Infinity')).toBe('Infinity');
    expect(toSafeDecimalString('NaN')).toBe('NaN');
    expect(toSafeDecimalString('abc')).toBe('abc');
    expect(toSafeDecimalString('')).toBe('');
  });

  it('可自訂 fallback（僅作用於缺值）', () => {
    expect(toSafeDecimalString(undefined, '0.0000000000')).toBe('0.0000000000');
    expect(toSafeDecimalString('5', '0.0000000000')).toBe('5');
  });
});
