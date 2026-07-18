import Decimal from 'decimal.js';

/**
 * 匯率顯示：**固定 2 位、不去尾零**（visual-audit P2-6——修「1 USD = 32」過度捨入）。
 * 走 Decimal half-up（`31.995` → `32.00`），非 float toFixed；非法/非有限輸入回「—」。
 */
export function formatFxRate(rate: string | number): string {
  let d: Decimal;
  try {
    d = new Decimal(rate);
  } catch {
    return '—';
  }
  if (!d.isFinite()) return '—';
  return d.toFixed(2);
}
