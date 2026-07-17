import { formatDisplayDate, formatDisplayDateTime } from './date.js';

describe('formatDisplayDate（YYYY-MM-DD → YYYY/MM/DD）', () => {
  it('ISO 轉 slash、保留前導零', () => {
    expect(formatDisplayDate('2024-03-14')).toBe('2024/03/14');
    expect(formatDisplayDate('2025-01-05')).toBe('2025/01/05');
  });

  it('非法輸入原樣回傳（防禦，與 dayOfMonth 同哲學）', () => {
    expect(formatDisplayDate('abc')).toBe('abc');
    expect(formatDisplayDate('2024-3-4')).toBe('2024-3-4');
    expect(formatDisplayDate('')).toBe('');
  });
});

describe('formatDisplayDateTime（YYYY/MM/DD HH:mm）', () => {
  it('補零', () => {
    expect(formatDisplayDateTime(new Date(2026, 6, 17, 23, 4))).toBe('2026/07/17 23:04');
    expect(formatDisplayDateTime(new Date(2026, 0, 3, 9, 5))).toBe('2026/01/03 09:05');
  });
});
