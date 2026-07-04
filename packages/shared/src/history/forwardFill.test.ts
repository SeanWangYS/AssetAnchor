import { forwardFillSeries } from './forwardFill.js';

describe('forwardFillSeries', () => {
  it('已有值的日期原樣保留', () => {
    const out = forwardFillSeries(['2025-01-02', '2025-01-03'], {
      '2025-01-02': '100.0000000000',
      '2025-01-03': '101.0000000000',
    });
    expect(out).toEqual({
      '2025-01-02': '100.0000000000',
      '2025-01-03': '101.0000000000',
    });
  });

  it('缺日補前一個已知收盤（Yahoo FX null bar / 假日）', () => {
    const out = forwardFillSeries(['2025-01-02', '2025-01-03', '2025-01-06'], {
      '2025-01-02': '100.0000000000',
      '2025-01-06': '103.0000000000',
    });
    expect(out['2025-01-03']).toBe('100.0000000000');
    expect(out['2025-01-06']).toBe('103.0000000000');
  });

  it('首個已知值之前的日期不輸出（無可填之值）', () => {
    const out = forwardFillSeries(['2025-01-02', '2025-01-03'], {
      '2025-01-03': '99.0000000000',
    });
    expect(out['2025-01-02']).toBeUndefined();
    expect(out['2025-01-03']).toBe('99.0000000000');
  });

  it('全空輸入回空 map', () => {
    expect(forwardFillSeries([], {})).toEqual({});
    expect(forwardFillSeries(['2025-01-02'], {})).toEqual({});
  });
});
