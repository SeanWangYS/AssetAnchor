import Decimal from 'decimal.js';
import { Money } from '../money/index.js';
import type { Currency } from '../enums/currencies.js';

/**
 * 顯示格式政策——單一規則表實作點（visual-audit P2-2 / P3-8；spec: currency-display）。
 * 全 app 的幣別前綴 / 小數位 / 千分位規則只能在此定義；mobile feature 層僅得
 * thin-adapter 委派（禁止重複實作格式規則）。
 *
 * 精度紀律（ADR-0005）：輸入為 Money canonical 10 位小數 string；捨入走
 * `Money.toDisplayString`（decimal.js ROUND_HALF_UP），千分位以字串 regex 分組
 * ——全程不經 native float。
 */

/** 幣別顯示前綴：NT$ / US$；其餘幣別用代碼（如 USDT），與數字間由呼叫端補「恆一空格」。 */
export function currencyPrefix(currency: Currency): string {
  if (currency === 'TWD') return 'NT$';
  if (currency === 'USD') return 'US$';
  return currency;
}

/** 彙總金額（市值/成本/損益/現金）小數位：TWD 0 位；USD/USDT 與其他幣別 2 位。 */
export function amountDisplayDecimals(currency: Currency): number {
  return currency === 'TWD' ? 0 : 2;
}

/** 對「-1234.56」形狀的定點字串做千分位分組（保留負號與小數部）。 */
function groupFixed(fixed: string): string {
  const [intPart = '0', frac] = fixed.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${sign}${grouped}.${frac}` : `${sign}${grouped}`;
}

/** 彙總金額裸數字（千分位、依幣別小數位、保留負號；不含前綴）。 */
export function formatAmount(value: string, currency: Currency): string {
  const fixed = Money.fromDecimalString(value, currency).toDisplayString(
    amountDisplayDecimals(currency),
  );
  return groupFixed(fixed);
}

/** 帶前綴彙總金額：「NT$ 300,450」「US$ 1,666.95」（前綴後恆一空格，P3-8）。 */
export function formatMoney(value: string, currency: Currency): string {
  return `${currencyPrefix(currency)} ${formatAmount(value, currency)}`;
}

/**
 * 單價/均價：**一律 2 位小數**（P2-2——不因幣別或整數值省略，修 TWD 均價取整掉精度
 * 與同幣別忽 0 忽 2），含前綴與千分位。
 */
export function formatPrice(value: string, currency: Currency): string {
  const fixed = Money.fromDecimalString(value, currency).toDisplayString(2);
  return `${currencyPrefix(currency)} ${groupFixed(fixed)}`;
}

/**
 * 股數：至多 4 位小數、去尾零、千分位。股數非金錢、與幣別無關，故走 Decimal
 * 而非 Money；非法輸入原樣回傳（防禦，與 dayOfMonth 同哲學）。
 */
export function formatQuantity(value: string): string {
  let d: Decimal;
  try {
    d = new Decimal(value);
  } catch {
    return value;
  }
  if (!d.isFinite()) return value;
  const trimmed = d.toFixed(4).replace(/\.?0+$/, '');
  return groupFixed(trimmed);
}

/** 損益方向（單一定義點）：0 → flat（零值中性，P2-4）。 */
export function signOf(value: number): 'up' | 'down' | 'flat' {
  if (value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}
