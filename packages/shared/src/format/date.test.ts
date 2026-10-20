import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatDisplayTime,
  formatMonthDayTime,
} from './date.js';

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

describe('formatDisplayTime（HH:mm）', () => {
  it('補零', () => {
    expect(formatDisplayTime(new Date(2026, 6, 18, 9, 5))).toBe('09:05');
    expect(formatDisplayTime(new Date(2026, 6, 18, 23, 42))).toBe('23:42');
  });
});

describe('formatMonthDayTime (M/D HH:mm)', () => {
  it('does not pad month/day but pads hour/minute', () => {
    expect(formatMonthDayTime(new Date(2026, 8, 22, 17, 10))).toBe('9/22 17:10');
    expect(formatMonthDayTime(new Date(2026, 9, 3, 9, 5))).toBe('10/3 09:05');
  });

  it('formats midnight and year boundaries', () => {
    expect(formatMonthDayTime(new Date(2026, 11, 31, 0, 0))).toBe('12/31 00:00');
    expect(formatMonthDayTime(new Date(2027, 0, 1, 23, 59))).toBe('1/1 23:59');
  });
});
