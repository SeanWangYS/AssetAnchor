import { Money } from '../money/index.js';
import { convertMoney } from '../fx/convertMoney.js';
import type { RateMap } from '../types/exchange-rate.js';
import type { Currency } from '../enums/currencies.js';
import type { TransactionDocument } from '../types/transaction.js';
import { forwardFillSeries } from './forwardFill.js';

export interface PortfolioSeriesPoint {
  date: string;
  /** 顯示幣別的組合證券市值（不含現金，proposal Non-goals）。 */
  value: Money;
}

export interface PortfolioSeriesInput {
  /** 使用者全部交易（BUY/SELL 之外的類型忽略）；順序不拘，內部依時序排序。 */
  transactions: readonly TransactionDocument[];
  /** `${market}_${symbol}` → (`YYYY-MM-DD` → close string)，已合併年度分塊。 */
  closesBySymbol: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** FX_USDTWD 日線（1 USD = N TWD），同 price_history 格式。 */
  fxUsdTwdCloses: Readonly<Record<string, string>>;
  displayCurrency: Currency;
  /** 切片範圍（含端點）；省略或 null 為無界。 */
  from?: string | null;
  to?: string | null;
}

/** 同 deriveHoldings 的時序排序：transaction_date 字典序、同日保留輸入順序。 */
function chronological(transactions: readonly TransactionDocument[]): TransactionDocument[] {
  return transactions
    .map((tx, i) => [tx, i] as const)
    .sort((a, b) =>
      a[0].transaction_date === b[0].transaction_date
        ? a[1] - b[1]
        : a[0].transaction_date.localeCompare(b[0].transaction_date),
    )
    .map(([tx]) => tx);
}

/**
 * 交易流 × 日線價 × FX 序列 → 組合證券市值時間序列（ADR-0010 / trend-charts spec）。
 *
 * 日期軸＝各 symbol 序列日期的聯集；每日持股量由交易流單趟時序掃描重建；
 * 市值 = Σ 持股(d) × close(d, forward-fill 後) × fx(d)。全程 Money。
 * 剔除規則（不畫假值）：持有中的 symbol 於當日無可填收盤、或需換匯但無可填 FX
 * → 該日期整點剔除。超賣（孤兒 SELL）不 throw——本函式屬顯示層重建，
 * 量 ≤ 0 視為無貢獻（持倉真值的 fail-loud 仍歸 deriveHoldings）。
 */
export function buildPortfolioSeries(input: PortfolioSeriesInput): PortfolioSeriesPoint[] {
  const { closesBySymbol, displayCurrency } = input;

  // 日期軸：所有 symbol 序列日期聯集（FX 只做換算來源，不張軸）。
  const axisSet = new Set<string>();
  for (const closes of Object.values(closesBySymbol)) {
    for (const date of Object.keys(closes)) axisSet.add(date);
  }
  const axis = [...axisSet].sort();
  if (axis.length === 0) return [];

  const filledBySymbol = new Map<string, Record<string, string>>();
  for (const [key, closes] of Object.entries(closesBySymbol)) {
    filledBySymbol.set(key, forwardFillSeries(axis, closes));
  }
  const fxFilled = forwardFillSeries(axis, input.fxUsdTwdCloses);

  // 交易單趟掃描的游標與持股狀態（qty 以 Money 累計、currency 記各 symbol 原幣別）。
  const txs = chronological(input.transactions).filter(
    (t) => t.transaction_type === 'BUY' || t.transaction_type === 'SELL',
  );
  let cursor = 0;
  const qty = new Map<string, Money>();
  const currencyOf = new Map<string, Currency>();

  const points: PortfolioSeriesPoint[] = [];
  for (const date of axis) {
    while (cursor < txs.length) {
      const t = txs[cursor];
      if (t === undefined || t.transaction_date > date) break;
      const key = `${t.market}_${t.symbol}`;
      currencyOf.set(key, t.currency);
      const held = qty.get(key) ?? new Money('0', t.currency);
      const delta = new Money(t.quantity, t.currency);
      qty.set(key, t.transaction_type === 'BUY' ? held.add(delta) : held.subtract(delta));
      cursor += 1;
    }

    if (input.from != null && date < input.from) continue;
    if (input.to != null && date > input.to) continue;

    let total = new Money('0', displayCurrency);
    let dropDate = false;
    let rates: RateMap | null = null;

    for (const [key, held] of qty) {
      if (held.isZero() || held.isNegative()) continue; // 全數賣出 / 孤兒 SELL：無貢獻
      const currency = currencyOf.get(key);
      const close = filledBySymbol.get(key)?.[date];
      if (currency === undefined || close === undefined) {
        dropDate = true; // 持有中卻無可填收盤 → 整日剔除，不畫假值
        break;
      }
      let value = new Money(close, currency).multiply(held.toDecimalString());
      if (currency !== displayCurrency) {
        const fx = fxFilled[date];
        if (fx === undefined) {
          dropDate = true;
          break;
        }
        rates ??= {
          USD_TWD: new Money(fx, 'TWD').toDecimalString(),
          TWD_USD: new Money('1', 'USD').divide(fx).toDecimalString(),
        };
        value = convertMoney(value, rates, displayCurrency);
      }
      total = total.add(value);
    }

    if (!dropDate) points.push({ date, value: total });
  }
  return points;
}
