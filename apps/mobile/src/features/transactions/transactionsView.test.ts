import type { TransactionDocument } from '@assetanchor/shared';
import { dayOfMonth, groupByMonth } from './transactionsView';

/** 最小 fixture：groupByMonth 只讀 transaction_date（其餘欄位不參與分組）。 */
function tx(date: string): TransactionDocument {
  return { transaction_date: date } as TransactionDocument;
}

describe('groupByMonth（visual-audit P3-1：標題恆帶年）', () => {
  it('當年分組也帶西元年', () => {
    const year = new Date().getFullYear();
    const groups = groupByMonth([tx(`${year}-07-18`)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe(`七月 · ${year}`);
  });

  it('同月不同年可區分（不再出現兩個「七月」）', () => {
    const groups = groupByMonth([tx('2026-07-18'), tx('2024-07-01')]);
    expect(groups.map((g) => g.label)).toEqual(['七月 · 2026', '七月 · 2024']);
  });

  it('同月連續交易合為一組、保留輸入順序', () => {
    const groups = groupByMonth([tx('2025-05-09'), tx('2025-05-01'), tx('2025-03-20')]);
    expect(groups.map((g) => g.key)).toEqual(['2025-05', '2025-03']);
    expect(groups[0]?.items).toHaveLength(2);
  });

  it('空輸入回空陣列', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe('dayOfMonth', () => {
  it('去前導零', () => {
    expect(dayOfMonth('2025-05-09')).toBe('9');
    expect(dayOfMonth('2025-05-18')).toBe('18');
  });
});
