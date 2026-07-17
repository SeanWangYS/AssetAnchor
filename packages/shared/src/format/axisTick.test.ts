import { formatAxisTick } from './axisTick.js';

describe('formatAxisTick（TWD 萬/億）', () => {
  it('未達萬層顯示整數', () => {
    expect(formatAxisTick(0, 'TWD')).toBe('0');
    expect(formatAxisTick(9999, 'TWD')).toBe('9999');
  });

  it('萬層', () => {
    expect(formatAxisTick(10000, 'TWD')).toBe('1萬');
    expect(formatAxisTick(5000000, 'TWD')).toBe('500萬');
    expect(formatAxisTick(5250000, 'TWD')).toBe('525萬');
    expect(formatAxisTick(5255000, 'TWD')).toBe('525.5萬');
    // toFixed float 語意（525.55 → "525.5"）——pin 實作行為（設計稽核必改 3）
    expect(formatAxisTick(5255500, 'TWD')).toBe('525.5萬');
  });

  it('億層與先捨後升層（不出「10000萬」）', () => {
    expect(formatAxisTick(100000000, 'TWD')).toBe('1億');
    expect(formatAxisTick(250000000, 'TWD')).toBe('2.5億');
    expect(formatAxisTick(99999999, 'TWD')).toBe('1億');
  });

  it('負值以絕對值判層、符號掛回（稽核必改 2）', () => {
    expect(formatAxisTick(-120000, 'TWD')).toBe('-12萬');
    expect(formatAxisTick(-500, 'TWD')).toBe('-500');
  });

  it('整數層捨入到門檻也升層', () => {
    expect(formatAxisTick(9999.6, 'TWD')).toBe('1萬');
  });
});

describe('formatAxisTick（USD K/M）', () => {
  it('未達 K 層顯示整數', () => {
    expect(formatAxisTick(999, 'USD')).toBe('999');
  });

  it('K 層', () => {
    expect(formatAxisTick(1000, 'USD')).toBe('1K');
    expect(formatAxisTick(2500, 'USD')).toBe('2.5K');
  });

  it('M 層與升層', () => {
    expect(formatAxisTick(1000000, 'USD')).toBe('1M');
    expect(formatAxisTick(999999, 'USD')).toBe('1M');
    expect(formatAxisTick(5200000, 'USD')).toBe('5.2M');
  });

  it('USDT 走 K/M（非 TWD 皆同）', () => {
    expect(formatAxisTick(1500, 'USDT')).toBe('1.5K');
  });
});
