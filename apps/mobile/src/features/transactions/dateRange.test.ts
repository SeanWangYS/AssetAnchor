import { filterByPreset, inRange, isValidCustomRange, presetDisplayLabel } from './dateRangeStore';
import type { TransactionDocument } from '@assetanchor/shared';

/** 最小交易 fixture：只有 transaction_date 參與過濾。 */
function tx(date: string): TransactionDocument {
  return { transaction_date: date } as TransactionDocument;
}

const NOW = new Date(2026, 6, 18); // 2026-07-18（月為 0-based）

describe('isValidCustomRange', () => {
  it('雙欄合法且起 ≤ 訖 → true（起 = 訖 也合法）', () => {
    expect(isValidCustomRange({ start: '2024-09-05', end: '2025-01-15' })).toBe(true);
    expect(isValidCustomRange({ start: '2024-09-05', end: '2024-09-05' })).toBe(true);
  });

  it('缺欄 / 非法日期 / 起 > 訖 → false', () => {
    expect(isValidCustomRange({ start: '', end: '2025-01-15' })).toBe(false);
    expect(isValidCustomRange({ start: '2024-09-05', end: '' })).toBe(false);
    expect(isValidCustomRange({ start: '2024-13-01', end: '2025-01-15' })).toBe(false);
    expect(isValidCustomRange({ start: '2025-01-15', end: '2024-09-05' })).toBe(false);
  });
});

describe('inRange / filterByPreset：custom 區間', () => {
  const range = { start: '2024-09-05', end: '2025-01-15' };

  it('含起訖當日（邊界 inclusive）', () => {
    expect(inRange('2024-09-05', 'custom', NOW, range)).toBe(true);
    expect(inRange('2025-01-15', 'custom', NOW, range)).toBe(true);
    expect(inRange('2024-09-04', 'custom', NOW, range)).toBe(false);
    expect(inRange('2025-01-16', 'custom', NOW, range)).toBe(false);
  });

  it('跨年區間以 ISO 字典序正確比較', () => {
    expect(inRange('2024-12-31', 'custom', NOW, range)).toBe(true);
    expect(inRange('2025-01-01', 'custom', NOW, range)).toBe(true);
  });

  it('filterByPreset 過濾正確筆數', () => {
    const list = [
      tx('2024-03-14'),
      tx('2024-09-05'),
      tx('2024-12-03'),
      tx('2025-01-15'),
      tx('2026-07-17'),
    ];
    expect(filterByPreset(list, 'custom', NOW, range)).toHaveLength(3);
  });

  it('防禦性：區間非法（缺欄/起>訖）視同全部（正常流程由 sheet disable 擋下）', () => {
    const list = [tx('2024-03-14'), tx('2026-07-17')];
    expect(filterByPreset(list, 'custom', NOW, { start: '', end: '' })).toHaveLength(2);
    expect(
      filterByPreset(list, 'custom', NOW, { start: '2025-01-15', end: '2024-09-05' }),
    ).toHaveLength(2);
  });
});

describe('既有 preset 行為不變（回歸鎖）', () => {
  const list = [
    tx('2026-07-01'),
    tx('2026-06-15'),
    tx('2026-05-31'),
    tx('2026-01-02'),
    tx('2025-12-31'),
  ];

  it('month：當年當月', () => {
    expect(filterByPreset(list, 'month', NOW)).toHaveLength(1);
  });

  it('last3m：本月與前兩個月（含 5 月）', () => {
    expect(filterByPreset(list, 'last3m', NOW)).toHaveLength(3);
  });

  it('ytd：今年', () => {
    expect(filterByPreset(list, 'ytd', NOW)).toHaveLength(4);
  });

  it('all：全收', () => {
    expect(filterByPreset(list, 'all', NOW)).toHaveLength(5);
  });
});

describe('presetDisplayLabel', () => {
  it('preset 用固定 label', () => {
    expect(presetDisplayLabel('month', { start: '', end: '' })).toBe('本月');
  });

  it('custom 顯示實際區間 M/D–M/D（去前導零）', () => {
    expect(presetDisplayLabel('custom', { start: '2024-09-05', end: '2025-01-15' })).toBe(
      '9/5–1/15',
    );
  });

  it('custom 但區間非法 → 退回「自訂」label', () => {
    expect(presetDisplayLabel('custom', { start: '', end: '' })).toBe('自訂');
  });
});
